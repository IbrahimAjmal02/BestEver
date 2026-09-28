import { prisma } from '../src/lib/prisma.js'

const categories = [
  { name: 'Movies', slug: 'movies' },
  { name: 'Video Games', slug: 'video-games' },
  { name: 'Anime', slug: 'anime' },
  // { name: 'Musical Artist', slug: 'musical-artist' }, // deferred for now — MusicBrainz's open catalog is too noisy (anyone can add an obscure entry) and there's no clean popularity-sorted source; see CLAUDE.md
  // { name: 'Places', slug: 'places' }, // deferred for now — no Nominatim integration yet
  { name: 'Actors', slug: 'actors' },
]

await prisma.category.createMany({
  data: categories,
  skipDuplicates: true,
})

console.log(`Seeded ${categories.length} categories.`)

await prisma.$disconnect()
