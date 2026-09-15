import { prisma } from '../src/lib/prisma.js'

const categories = [
  { name: 'Movies', slug: 'movies' },
  { name: 'Video Games', slug: 'video-games' },
  { name: 'Anime', slug: 'anime' },
  { name: 'Music', slug: 'music' },
  { name: 'Places', slug: 'places' },
  { name: 'Actors', slug: 'actors' },
]

await prisma.category.createMany({
  data: categories,
  skipDuplicates: true,
})

console.log(`Seeded ${categories.length} categories.`)

await prisma.$disconnect()
