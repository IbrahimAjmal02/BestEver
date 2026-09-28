import express from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = express.Router()

// A user's own votes across every category, for the profile page — joined
// with the item and category in one query rather than making the frontend
// stitch separate calls together. Not gated by requireVerifiedEmail: viewing
// your own past votes carries none of the risk that casting one does.
router.get('/votes', requireAuth, async (req, res) => {
    const firebaseUid = req.firebaseUid as string

    const user = await prisma.user.findUnique({ where: { firebaseUid } })

    if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
    }

    const votes = await prisma.vote.findMany({
        where: { userId: user.id },
        include: { item: true, category: true },
        orderBy: { createdAt: 'desc' },
    })

    res.json(votes)
})

export default router
