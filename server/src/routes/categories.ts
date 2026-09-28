import express from 'express'
import { prisma } from '../lib/prisma.js'
import { providers } from '../external/registry.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireVerifiedEmail } from '../middleware/requireVerifiedEmail.js'

const router = express.Router()

router.get('/:slug/leaderboard', async (req, res) => {
    const { slug } = req.params

    const items = await prisma.item.findMany({
        where: {category: {slug}},
        orderBy: {voteCount: 'desc'},
        take: 25,
    })
    res.json(items)
})

router.get('/', async (req, res) => {
    const categories = await prisma.category.findMany()
    res.json(categories)
})

router.get('/:slug/search', async (req, res) => {
    const { slug } = req.params
    const { q } = req.query

    const provider = providers[slug]

    if (!provider || typeof q !== 'string') {
        res.json([])
        return
    }

    const results = await provider(q)
    res.json(results)
})

// Searches Item rows already in OUR database for this category — different
// from /:slug/search, which hits the external provider (TMDB/RAWG/etc).
// This exists so someone can find and vote for something that's already
// been voted on but fell outside the leaderboard's top-25 cutoff.
router.get('/:slug/items', async (req, res) => {
    const { slug } = req.params
    const { q } = req.query

    if (typeof q !== 'string' || !q.trim()) {
        res.json([])
        return
    }

    const category = await prisma.category.findUnique({ where: { slug } })

    if (!category) {
        res.json([])
        return
    }

    const items = await prisma.item.findMany({
        where: { categoryId: category.id, name: { contains: q, mode: 'insensitive' } },
        orderBy: { voteCount: 'desc' },
        take: 25,
    })
    res.json(items)
})

// Total votes cast in a category — computed live via COUNT, not a stored
// counter (unlike Item.voteCount). The difference: Item.voteCount is read
// once PER ITEM on every leaderboard/search render (25+ times per page
// load), which is genuinely expensive to recompute live — this is read
// ONCE per page load, so a plain COUNT is already cheap. Since exactly one
// Vote row exists per person per category (the unique constraint), this
// count literally IS "how many people voted here" — the right denominator
// for a percentage.
router.get('/:slug/total-votes', async (req, res) => {
    const { slug } = req.params

    const category = await prisma.category.findUnique({ where: { slug } })

    if (!category) {
        res.json({ totalVotes: 0 })
        return
    }

    const totalVotes = await prisma.vote.count({ where: { categoryId: category.id } })
    res.json({ totalVotes })
})

router.get('/:slug/my-vote', requireAuth, async (req, res) => {
    const slug = req.params.slug as string
    const firebaseUid = req.firebaseUid as string

    const category = await prisma.category.findUnique({ where: { slug } })

    if (!category) {
        res.status(404).json({ error: 'Category not found' })
        return
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid } })

    if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
    }

    const vote = await prisma.vote.findUnique({
        where: { userId_categoryId: { userId: user.id, categoryId: category.id } },
        include: { item: true },
    })

    res.json(vote)
})

router.post('/:slug/items', requireAuth, requireVerifiedEmail, async (req, res) => {
    const slug = req.params.slug as string
    const { externalId, name, imageUrl } = req.body

    const category = await prisma.category.findUnique({ where: { slug } })

    if (!category) {
        res.status(404).json({ error: 'Category not found' })
        return
    }

    if (externalId) {
        const item = await prisma.item.upsert({
            where: { categoryId_externalId: { categoryId: category.id, externalId } },
            update: {},
            create: { categoryId: category.id, externalId, name, imageUrl },
        })
        res.json(item)
        return
    }

    const item = await prisma.item.create({
        data: { categoryId: category.id, name, imageUrl },
    })
    res.json(item)
})

export default router