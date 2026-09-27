import express from 'express'
import { prisma } from '../lib/prisma.js'
import { providers } from '../external/registry.js'

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

export default router