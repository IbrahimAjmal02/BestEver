import express from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireVerifiedEmail } from '../middleware/requireVerifiedEmail.js'

const router = express.Router()

router.post('/', requireAuth, requireVerifiedEmail, async (req, res) => {
    const firebaseUid = req.firebaseUid as string
    const { itemId } = req.body

    const user = await prisma.user.findUnique({ where: { firebaseUid } })

    if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } })

    if (!item) {
        res.status(404).json({ error: 'Item not found' })
        return
    }

    try {
        const [vote, updatedItem] = await prisma.$transaction([
            prisma.vote.create({
                data: { userId: user.id, categoryId: item.categoryId, itemId: item.id },
            }),
            prisma.item.update({
                where: { id: item.id },
                data: { voteCount: { increment: 1 } },
            }),
        ])

        res.json({ vote, item: updatedItem })
    } catch (error: any) {
        if (error.code === 'P2002') {
            res.status(409).json({ error: 'You have already voted in this category' })
            return
        }
        throw error
    }
})

router.put('/', requireAuth, requireVerifiedEmail, async (req, res) => {
    const firebaseUid = req.firebaseUid as string
    const { itemId } = req.body

    const user = await prisma.user.findUnique({ where: { firebaseUid } })

    if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } })

    if (!item) {
        res.status(404).json({ error: 'Item not found' })
        return
    }

    const existingVote = await prisma.vote.findUnique({
        where: { userId_categoryId: { userId: user.id, categoryId: item.categoryId } },
    })

    if (!existingVote) {
        res.status(404).json({ error: 'No existing vote in this category — use POST /vote to cast one' })
        return
    }

    if (existingVote.itemId === item.id) {
        res.json({ vote: existingVote, item })
        return
    }

    const [updatedVote, , updatedItem] = await prisma.$transaction([
        prisma.vote.update({
            where: { userId_categoryId: { userId: user.id, categoryId: item.categoryId } },
            data: { itemId: item.id },
        }),
        prisma.item.update({
            where: { id: existingVote.itemId },
            data: { voteCount: { decrement: 1 } },
        }),
        prisma.item.update({
            where: { id: item.id },
            data: { voteCount: { increment: 1 } },
        }),
    ])

    res.json({ vote: updatedVote, item: updatedItem })
})

router.delete('/:categoryId', requireAuth, async (req, res) => {
    const firebaseUid = req.firebaseUid as string
    const categoryId = req.params.categoryId as string

    const user = await prisma.user.findUnique({ where: { firebaseUid } })

    if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
    }

    const existingVote = await prisma.vote.findUnique({
        where: { userId_categoryId: { userId: user.id, categoryId } },
    })

    if (!existingVote) {
        res.status(404).json({ error: 'No vote found in this category' })
        return
    }

    const [deletedVote, updatedItem] = await prisma.$transaction([
        prisma.vote.delete({
            where: { userId_categoryId: { userId: user.id, categoryId } },
        }),
        prisma.item.update({
            where: { id: existingVote.itemId },
            data: { voteCount: { decrement: 1 } },
        }),
    ])

    res.json({ vote: deletedVote, item: updatedItem })
})

export default router
