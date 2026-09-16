# BestEver — Project Brief for Claude Code

## What this project is

BestEver is a website where people create an account and get **exactly one
vote per category** (e.g. "Best Movie Ever," "Best Video Game Ever"). They can
vote for anything within that category — searched from an external API, or
typed in as a custom entry if it's not found. Each category has a live
leaderboard showing the top 25–50 most-voted items. The whole thing is free
to use.

Planned categories at launch: **movies, video games, anime, music, places,
actors** — more may be added later.

## Who's building this and why

This is a **personal learning project**, not a client deliverable. The
person building it is newer to fullstack development and specifically wants
practice with:

- Writing a real backend server from scratch (routes, middleware, auth) —
  not a framework abstraction over it
- Designing and querying a relational database (Postgres via Prisma)
- Eventually: Dockerizing both services and deploying with Kubernetes

**Implication for how to help:** prefer explaining *why*, not just handing
over finished code. Default to walking through changes conceptually before
writing them, especially for anything backend-related — that's the muscle
they're trying to build. It's fine to write code directly (this is Claude
Code, not a chat walkthrough), but keep explanations attached to non-trivial
changes, and prefer patterns a working backend engineer would actually use
over "cleverest" solutions.

## Why this architecture (please don't suggest switching back)

An earlier version of this plan used Next.js as a single fullstack app. It
was deliberately **replaced** with a separate Express API + separate React
frontend, specifically because Next.js's serverless-function model doesn't
map well to the person's stated goal of Docker/Kubernetes practice. A plain
Express server (`app.listen()`, containerizable, horizontally scalable
behind a load balancer) is the intentional choice here. Don't suggest
reverting to Next.js, tRPC, or another integrated fullstack framework unless
explicitly asked.

## Architecture

Monorepo, two independent projects that will eventually be two independent
Docker containers:

```
besteveer/
  server/     Express + TypeScript + Prisma + Postgres — the REST API
  client/     React + Vite + TypeScript + Tailwind CSS — the SPA frontend
```

They talk over HTTP; `client` calls `server` via `fetch`. In dev they run on
different ports (server: 4000, client: 5173 via Vite). CORS on the server is
configured with an explicit origin allowlist (not `cors()` wide open) —
important detail, don't loosen it without discussion.

### server/

- **Express** — plain, not NestJS (deliberate — learning raw Express first)
- **Prisma** — ORM/schema layer, talks to Postgres
- **Postgres**, hosted on AWS RDS (PostgreSQL engine, free tier) —
  connection string in `server/.env` as `DATABASE_URL`, never committed.
  Chosen deliberately over a dev-focused host (Neon/Supabase) for real AWS
  console/networking experience — RDS is not publicly accessible by default,
  so the instance's security group must have an inbound rule allowing the
  developer's IP on port 5432
- **tsx** for dev (runs TS directly with watch mode)
- Auth: **outsourced to Firebase Authentication**, not self-built —
  deliberate reversal of the original "write auth from scratch" learning
  goal, traded for practicality/security (password reset, breach detection,
  rate-limiting, etc. are hard to get right solo and are handled for free by
  Firebase). `client/` uses the Firebase JS SDK for signup/login/logout UI
  flows; Firebase issues an ID token (a JWT) after login. `server/` never
  sees a password or issues its own tokens — it only **verifies** Firebase's
  ID token on protected routes, via the Firebase Admin SDK, in a
  `requireAuth` middleware (`server/src/middleware/`). Sent from the client
  as `Authorization: Bearer <token>`.
  **Schema implication:** the `User` model's `passwordHash` field is no
  longer needed (Firebase owns credentials) — replace it with a
  `firebaseUid` column (unique) to link a `User` row to its Firebase
  identity. This is a pending schema change, not yet migrated.
- A `/health` endpoint exists intentionally — this is a Kubernetes
  readiness/liveness-probe convention, keep it working as the project grows.

### client/

- **Vite + React + TypeScript**, Tailwind CSS for styling
- Plain SPA, no server-side rendering
- Will eventually get a `vite.config.ts` dev proxy to the Express API to
  avoid CORS friction locally (not yet set up)

## Data model (Prisma schema — implemented conceptually, may not be pushed yet)

Four models: `User`, `Category`, `Item`, `Vote`.

The core rule of the whole product — **one vote per user per category** — is
enforced at the database level via:

```prisma
model Vote {
  ...
  userId     String
  categoryId String
  itemId     String
  @@unique([userId, categoryId])
}
```

This means even a buggy API route can't create a duplicate vote; Postgres
itself rejects it.

`Item.voteCount` is a **denormalized counter**, incremented/decremented
whenever a vote is cast, changed, or removed (inside a transaction), rather
than counting `Vote` rows on every read. This is a deliberate real-world
tradeoff (more complex writes, much faster reads) — explain this tradeoff if
touching vote logic, don't "simplify" it back to a COUNT query.

`Item` also has `externalId` + a unique constraint on `[categoryId,
externalId]`, so the same external API result (e.g. the same TMDB movie)
searched twice doesn't create duplicate rows and split the vote count.

## External item search (per category)

Each category can optionally be backed by an external search API; if a
person's search doesn't find their item, they can always add it as a custom
entry instead. Planned mapping:

| Category     | Source                          | API key needed? |
|--------------|----------------------------------|------------------|
| Movies       | TMDB                            | Yes |
| Actors       | TMDB (person search)            | Yes |
| Video games  | RAWG                            | Yes |
| Anime        | Jikan (MyAnimeList, unofficial) | No |
| Music        | MusicBrainz                     | No (needs User-Agent header) |
| Places       | OpenStreetMap Nominatim         | No (needs User-Agent header, rate-limited) |

A flaky external API should never break voting — always fail soft to
"no external results, custom entry still works."

## Status as of this file being written

Actively being built step-by-step with guidance from Claude (chat), which is
why progress may be ahead of or behind what's committed — **check the actual
repo state, don't assume this file is fully current.** Roughly:

- [x] Architecture decided (Express + React, not Next.js)
- [x] `server/` scaffolded: Express, TypeScript, cors, dotenv, basic
      `/health` route
- [x] `client/` scaffolded: Vite + React + TypeScript + Tailwind, boilerplate
      cleared
- [x] Prisma installed and schema pushed to AWS RDS Postgres; `User`,
      `Category`, `Item`, `Vote` models migrated; six launch categories
      seeded via `prisma/seed.ts`
- [x] `GET /categories` and `GET /categories/:slug/leaderboard` routes
      (`server/src/routes/categories.ts`) — read-only, working end to end
      with the frontend
- [x] Firebase project set up (Email/Password + Google providers enabled),
      `User.passwordHash` → `User.firebaseUid` schema migration done
- [x] Client Firebase SDK wired up (`client/src/lib/firebase.ts`)
- [x] Server Firebase Admin SDK + `requireAuth` middleware
      (`server/src/lib/firebaseAdmin.ts`, `server/src/middleware/requireAuth.ts`)
      — verifies a Firebase ID token, attaches `req.firebaseUid`
- [x] Signup UI (`client/src/components/SignupForm.tsx`) in a modal
      (`client/src/components/Modal.tsx`), triggered from a "Sign up / Sign
      in" button — calls Firebase directly, not yet tested end-to-end with a
      real account
- [ ] Sign-in flow — only signup exists so far, no login form for returning
      users yet
- [ ] Backend "sync" route — nothing yet creates the `User` row in Postgres
      after a Firebase signup; `SignupForm` currently only logs the ID token
      to the console instead of sending it anywhere
- [ ] External item search integration — per-category provider modules
      (TMDB, RAWG, Jikan, MusicBrainz, Nominatim, see table above) behind a
      `GET /categories/:slug/search?q=` route; each provider must fail soft
      (return `[]`, never throw) per the "flaky API shouldn't break voting"
      rule
- [ ] Item creation — `POST /categories/:slug/items`, find-or-create against
      the `[categoryId, externalId]` unique constraint (handles both a
      selected external search result and a custom typed entry)
- [ ] Voting API routes — `POST /vote` (cast), `PUT /vote` (change an
      existing vote — one per category, re-voting moves it rather than
      failing), `DELETE /vote/:categoryId` (remove), `GET
      /categories/:slug/my-vote` (so the UI can show "you voted for X").
      Casting/changing a vote must be a Prisma **transaction** that also
      increments/decrements the target `Item.voteCount` — see the
      denormalized-counter note above, don't drop this into a plain COUNT
- [ ] Profile page — a page showing the logged-in user's own votes across
      every category. Needs a new backend route (not yet planned in detail)
      to fetch a user's votes joined with their item/category info, e.g.
      `GET /me/votes`, protected by `requireAuth`
- [ ] Frontend: category/voting page (search UI + custom-entry fallback +
      cast-vote UI, per category)
- [ ] Frontend: leaderboard UI page (consumes the existing
      `GET /categories/:slug/leaderboard` route)
- [ ] Frontend: profile page (consumes the new `GET /me/votes` route above)
- [ ] Docker (both services)
- [ ] Kubernetes manifests
- [ ] Deployment

## Working conventions

- Don't commit `node_modules/`, `.env`, or `dist/` — `.gitignore` should
  already cover this.
- Keep `server` and `client` fully independent (no shared imports, no
  monorepo tooling like Turborepo/Nx unless explicitly requested) — the
  point is two services that could be deployed and scaled separately.
- Prefer small, explainable commits over large ones while this is a learning
  project.
- When adding a new Express route, follow the existing middleware-order
  pattern (cors → json parsing → auth check where relevant → handler), and
  explain where a new piece slots into that chain.
