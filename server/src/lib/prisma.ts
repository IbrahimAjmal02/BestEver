import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

// Appending this here (rather than storing it in .env) keeps DATABASE_URL
// clean for Prisma's own CLI tools (migrate, studio), which error out on
// this flag — it's only needed by the `pg` driver this adapter uses.
const adapter = new PrismaPg({
    connectionString: `${process.env.DATABASE_URL}&uselibpqcompat=true`,
})

export const prisma = new PrismaClient({ adapter })