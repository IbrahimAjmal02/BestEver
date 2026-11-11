import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import userRouter from './routes/users.js'
import categoriesRouter from './routes/categories.js'
import votesRouter from './routes/votes.js'
import meRouter from './routes/me.js'

const PORT = process.env.PORT ?? 4000

// Explicit allowlist rather than cors() wide open — this is
// an intentional choice, don't loosen it without discussion.
const ALLOWED_ORIGINS = [
  'http://localhost:5173', // Vite dev server
  'https://best-ever.vercel.app', // deployed frontend (Vercel)
  'https://bestever.live', // custom domain
  'https://www.bestever.live', // custom domain (www)
]

const app = express()

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
  }),
)
app.use(express.json())

app.use('/categories', categoriesRouter)

app.use('/users', userRouter)

app.use('/vote', votesRouter)

app.use('/me', meRouter)

// Kubernetes readiness/liveness-probe convention — keep this working as the
// project grows, even once real routes exist.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
