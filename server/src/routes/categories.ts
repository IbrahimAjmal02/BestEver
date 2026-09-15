import express from 'express'
import { prisma } from '../lib/prisma.js'

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

export default router