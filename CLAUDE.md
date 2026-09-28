# BestEver — Project Brief for Claude Code

## What this project is

BestEver is a website where people create an account and get **exactly one
vote per category** (e.g. "Best Movie Ever," "Best Video Game Ever"). They can
vote for anything within that category — searched from an external API, or
typed in as a custom entry if it's not found. Each category has a live
leaderboard showing the top 25–50 most-voted items. The whole thing is free
to use.

Planned categories at launch: **movies, video games, anime,
actors** — more may be added later. (**Places** was in the original plan but
is deferred for now — no Nominatim integration yet; commented out in
`prisma/seed.ts` and removed from the seeded database, not deleted from this
plan permanently. **Musical Artist** is deferred the same way, as of
2026-09-27 — see "External item search" below for why.)

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
| Anime        | MyAnimeList (official API)      | Yes (Client ID, no OAuth needed for search) |
<!-- | Musical Artist | MusicBrainz + Deezer          | No |  -->
<!-- Musical Artist deferred as of 2026-09-27 — MusicBrainz is an open, wiki-style
     catalog (anyone can add an entry) with no popularity data of its own; even
     after layering Deezer on top for images + a popularity signal (see
     musicbrainz.ts, kept but disconnected from registry.ts), a search still
     surfaces a lot of genuinely obscure same-named entries. Checked whether a
     single curated source (Spotify) would solve this cleanly instead — no:
     Spotify's Feb 2026 API changes moved away from the Client Credentials
     flow for metadata endpoints and dropped `popularity`/`followers` from some
     responses, i.e. the exact flow and fields this use case needs, so it's
     currently a worse fit than before, not a fix. -->
<!-- | Places       | OpenStreetMap Nominatim         | No (needs User-Agent header, rate-limited) | -->
<!-- Places deferred for now, see "Planned categories at launch" above -->

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
      `Category`, `Item`, `Vote` models migrated; five launch categories
      seeded via `prisma/seed.ts` (Places deferred, see above)
- [x] `GET /categories` and `GET /categories/:slug/leaderboard` routes
      (`server/src/routes/categories.ts`) — read-only, working end to end
      with the frontend
- [x] Firebase project set up (Email/Password + Google providers enabled),
      `User.passwordHash` → `User.firebaseUid` schema migration done
- [x] Client Firebase SDK wired up (`client/src/lib/firebase.ts`)
- [x] Server Firebase Admin SDK + `requireAuth` middleware
      (`server/src/lib/firebaseAdmin.ts`, `server/src/middleware/requireAuth.ts`)
      — verifies a Firebase ID token, attaches `req.firebaseUid`
- [x] Signup UI (`client/src/components/SignupForm.tsx`) and sign-in UI
      (`client/src/components/SignInForm.tsx`), both in the shared `Modal`,
      toggled via separate "Sign in"/"Sign up" buttons (two side-by-side
      when signed out) or a single "Sign out" button (+ email shown) when
      signed in — driven by an `onAuthStateChanged` listener in `App.tsx`.
      **Verified live end-to-end** with a real throwaway account: signup →
      Firebase account created → UI correctly flips to signed-in state
- [x] Email verification — frontend (`sendEmailVerification` on signup,
      `App.tsx`'s "please verify" banner) **and now backend enforcement**
      (2026-09-28), added once the vote routes existed. `requireAuth`
      already gets `email_verified` for free as a standard claim on the
      decoded Firebase ID token — no extra Admin SDK call needed — so it
      now also attaches `req.firebaseEmailVerified`. New middleware
      `requireVerifiedEmail` (`server/src/middleware/`) checks that flag,
      403s with `{ error: 'Please verify your email address before voting' }`
      if false. **Deliberately kept separate from `requireAuth`**, not
      merged in — `POST /users/sync` runs right after signup, before
      there's been time to click a verification email, so if verification
      gated every authenticated route the very first sync call would fail
      and break signup. Applied only to `POST /vote` and `PUT /vote` (the
      actual cast/change actions) — not `DELETE /vote` (removing your own
      vote has no unfair-advantage risk) and not item creation (harmless on
      its own without a vote attached).
      **`apiFetch` improved alongside this**: it was discarding the
      server's actual `{ error }` message and throwing a bare
      `"POST /vote failed: 403"` — now it parses and surfaces that message,
      so this fix (and every other route's specific error, e.g. the `409`
      "already voted" case) reaches the user instead of a generic
      "Something went wrong" in `CategoryPage.tsx`.
      **Verified live**: a throwaway unverified account got a real `403`
      with the exact message on `POST /vote`; marking it verified via the
      Admin SDK + fetching a fresh ID token (the old token still says
      unverified — verification status is baked into the token at
      issuance) let the same vote succeed with `200`. Also verified through
      the actual browser UI via Playwright — the specific message rendered
      correctly in `CategoryPage`'s error banner, not a generic one.
- [x] Backend sync route — `POST /users/sync` (`server/src/routes/users.ts`),
      protected by `requireAuth`, upserts a `User` row keyed on
      `firebaseUid`. `requireAuth` attaches `req.firebaseEmail` too.
      **Fully wired and verified live**: `client/src/api/users.ts`'s
      `syncUser()` is called from both `SignupForm` and `SignInForm` right
      after getting the ID token — confirmed end-to-end with a real test
      signup that produced an actual `User` row in Postgres (matching
      `firebaseUid`/`email`). The full chain (Firebase signup → sync call →
      Postgres row) now genuinely works, not just each piece in isolation
- [x] External item search — the full pattern (`server/src/external/types.ts`
      shared shape, per-provider modules, `server/src/external/registry.ts`
      mapping category slug → provider, `GET /categories/:slug/search?q=`
      dispatch route in `categories.ts`, a `client/src/api/search.ts`
      caller, and a `SearchBox` component) is built and **verified live**
      for **Anime (Jikan)** — the first and so far only provider.
      **Important gotcha discovered and fixed**: Jikan's infrastructure
      returns a `504` specifically to requests made via Node's global
      `fetch()`, while `undici`'s lower-level `request()` (which `fetch()`
      is itself built on) gets a real response — confirmed by directly
      comparing both against the same URL. Likely Cloudflare-level bot
      detection reacting to something `fetch()` adds automatically.
      `jikan.ts` now uses `undici.request()` instead of `fetch()`; **any
      future provider module that behaves strangely with plain `fetch()`
      should try this same swap before assuming the API itself is broken**.
- [x] **Anime provider swapped from Jikan to the official MyAnimeList API**
      (`jikan.ts` deleted, replaced by `server/src/external/myanimelist.ts`;
      `registry.ts`'s `anime` entry repointed). Reason: Jikan (the unofficial
      proxy above) announced a full shutdown — brownout since 2026-09-01,
      full discontinuation 2026-10-01 — which in hindsight likely explains a
      lot of the `504`/flakiness debugged above, not just a `fetch()` quirk.
      The official API turned out to be simpler than expected: read-only
      search only needs a `Client ID` sent as an `X-MAL-CLIENT-ID` header
      (from `myanimelist.net/apiconfig`) — no OAuth flow, since we never
      touch a user's personal MAL list. Response shape differs from Jikan's
      (`{ data: [{ node: { id, title, main_picture: { medium, large } } }] }`
      vs. Jikan's flatter `{ data: [{ mal_id, title, images }] }`), and the
      `fields=` query param must explicitly list `main_picture` or no image
      comes back at all. Still uses `undici.request()` per the habit above,
      even though this API hasn't shown the same `fetch()` issue.
      **Verified live** through the real `GET /categories/anime/search?q=`
      route across several queries (naruto, attack on titan, one piece,
      demon slayer, cowboy bebop) — all returned real results with working
      image URLs, unlike Jikan which had degraded to reliably working for
      "naruto" only near the end.
      **Popularity re-sorting, done client-side (in `myanimelist.ts` itself),
      not via a query param** — unlike RAWG, MAL's `/v2/anime` search
      endpoint has no ordering parameter at all (confirmed empirically:
      `order_by=popularity` and `sort=bypopularity` both silently no-op —
      ranking/popularity sorting only exists on the separate `/ranking`
      endpoint, which doesn't accept a text query). Same underlying problem
      as RAWG though: searching "love" returned an obscure anime literally
      titled "Love" (378 list users) ahead of a show with 1.5M viewers,
      purely on exact title match. Fixed by requesting the `popularity`
      field (a rank — 1 is most popular) alongside `title`/`main_picture`,
      then sorting our own mapped results by it (ascending, missing values
      sort last) before returning them — the API won't do this for us, so
      it happens in our own code instead of a URL param.
- [x] TMDB Movies provider (`server/src/external/tmdb.ts`, `searchMovies`)
      — registered in `registry.ts` under `movies`, **verified live**
      end-to-end through the real `GET /categories/movies/search?q=` route.
      Uses `undici.request()` from the start (per the Jikan lesson above).
      Note: TMDB's response uses `results` (not `data` like Jikan), and
      `poster_path` is a relative path needing
      `https://image.tmdb.org/t/p/w500` prepended — Jikan's image URLs were
      already complete
- [x] TMDB Actors provider (`server/src/external/tmdb.ts`, `searchPeople`)
      — registered under `actors`, **verified live** through the real route.
      Uses `/search/person`, field `name` (not `title`), image field
      `profile_path` (not `poster_path`) — otherwise identical pattern to
      `searchMovies`
- [x] RAWG (Video games) provider (`server/src/external/rawg.ts`) —
      registered under `video-games`, **verified live** through the real
      route. Key sent as a query param (`?key=`), not a header — RAWG's own
      requirement, no choice in the matter unlike TMDB's header option.
      `background_image` is already a full URL or `null` (like Jikan, not
      like TMDB's relative paths needing a prefix)

**Four of five external search providers are live** (Anime/MyAnimeList,
Movies+Actors/TMDB, Video games/RAWG) — the "External item search
integration" line item is complete at the API level for launch categories.
Musical Artist was built (below) but is **deferred as of 2026-09-27** — see
"External item search" above for why — not deleted, same treatment as Places.
- [~] MusicBrainz (Musical Artist) provider (`server/src/external/musicbrainz.ts`)
      — **deferred, disconnected from `registry.ts` (commented out) and the
      `Category` row deleted from the live DB**, so this file is currently
      unreachable dead code, kept for whenever a better data source exists.
      Was registered under `musical-artist` (category renamed from "Music" to
      "Musical Artist" — the live DB row was updated directly since a slug
      change isn't a schema migration, just data; `seed.ts` and
      `registry.ts`'s key were updated to match), **verified live** through
      the real route before being deferred. **Design decision**: searches
      MusicBrainz's `artist`
      entity (singers/bands), not `recording` (individual songs) — matches
      how Actors is a separate category from Movies rather than folding
      performers into the same vote. `User-Agent: BestEver/1.0
      (ibrahimajmal02@gmail.com)` sent per their usage policy.
      **Artist photos added via Deezer's public search API** (free, no key)
      — MusicBrainz itself is pure metadata (no photos, no popularity data
      by design), so for each MusicBrainz result we do a parallel Deezer
      lookup by name and attach `picture_medium` if found; each lookup
      fails soft on its own so one bad match can't break the batch. Real
      limitation: Deezer is a separate catalog with no shared ID to
      MusicBrainz, so this is name-only matching — obscure/regional artists
      often aren't on Deezer at all (→ no image, fine, same as before), and
      **grabbing Deezer's first search hit was confirmed live to pick the
      wrong same-named artist** (searching "drake" attached a 119-fan
      artist's photo instead of the real Drake's, who has 24M). Fixed by
      picking the Deezer candidate with the highest `nb_fan` instead of
      index 0 — doesn't eliminate the ambiguous-name risk entirely, but
      "most famous person with this name" is a much better guess than
      "whatever Deezer's internal index returned first."
      **Popularity sorting**: MusicBrainz's search has no ordering param at
      all (nothing to sort by — it has no popularity metric, unlike RAWG's
      `added` or MAL's `popularity` rank), and its default order is text-
      match relevance only, so an obscure artist could rank above a famous
      one with the same/similar name. Since we're already fetching Deezer's
      `nb_fan` per result for the image-matching fix above, it doubles as
      the popularity signal MusicBrainz can't provide — results are
      re-sorted by `nb_fan` descending before returning. **Verified live**:
      "drake" now returns the real Drake (correct photo) first; "beatles"
      regression-checked, still correct.
- [x] Item creation — `POST /categories/:slug/items` (in `categories.ts`),
      protected by `requireAuth`. `Item.imageUrl` field added via migration
      first (was missing). Find-or-create (`upsert` on the
      `categoryId_externalId` compound unique key) when `externalId` is
      provided; always a plain `create` (no dedup) for custom entries with
      no `externalId`, since `null` can't be meaningfully matched against
      and free-text can't be reliably deduped anyway. **Verified live**,
      all four cases: external item created, same external item reused
      (not duplicated) on a second call, two custom entries with identical
      names correctly got separate rows, missing auth → `401`, unknown
      category → `404`. One TS gotcha hit and fixed: adding `requireAuth`
      as middleware caused `req.params.slug` to lose its specific string
      inference (fell back to `string | string[]`) — fixed with an
      explicit `as string` assertion, safe since `:slug` is always a
      single path segment, never an array in practice
- [ ] (Future idea, deliberately deferred) Show live vote counts on search
      results, not just the leaderboard — would need the search route to
      cross-reference results against existing `Item` rows for their
      `voteCount` (defaulting to 0), plus a new field on the shared
      `ExternalSearchResult` type. Deferred until voting exists, since every
      result would show 0 right now regardless
- [x] Voting API routes — all four done in `server/src/routes/votes.ts`
      (`POST`/`PUT`/`DELETE`) and `server/src/routes/categories.ts`
      (`GET /:slug/my-vote`, kept there since it's slug-driven like the
      rest of that file). `POST /vote` does a plain `vote.create()` +
      `voteCount` increment in a transaction; the `@@unique([userId,
      categoryId])` constraint (not `itemId`) is what blocks a second vote
      in the same category, surfaced as Prisma error `P2002` → `409`.
      `PUT /vote` looks up the existing `(userId, categoryId)` vote row,
      404s if none exists (use `POST` to cast a first vote), no-ops if the
      same item is resubmitted, otherwise a 3-step transaction: repoint the
      vote's `itemId`, decrement the old item's `voteCount`, increment the
      new item's. `DELETE /vote/:categoryId` (categoryId is the actual
      Category id, not the slug — matches how it's stored on `Vote`) deletes
      the vote row + decrements the item's `voteCount`, also in a
      transaction. **Verified live end-to-end** via a throwaway Firebase
      test account (created directly through Firebase's REST API — no
      frontend needed, since the client SDK is just a wrapper over that same
      REST API) and two custom test items: cast → dup vote correctly `409`s
      → `my-vote` reflects it → `PUT` moves the vote → `my-vote` and
      leaderboard `voteCount`s both update correctly → `DELETE` removes it
      → `my-vote` returns `null` again. Test data and the throwaway Firebase
      account were deleted afterward.
- [ ] Profile page — a page showing the logged-in user's own votes across
      every category. Needs a new backend route (not yet planned in detail)
      to fetch a user's votes joined with their item/category info, e.g.
      `GET /me/votes`, protected by `requireAuth`
- [x] Client-side routing added (`react-router-dom`, `BrowserRouter` in
      `main.tsx`). `App.tsx` is now a layout (header, auth modal) rendering
      `<Routes>`: `/` → `pages/Home.tsx` (the categories list, now `Link`s
      instead of plain `<li>`s), `/categories/:slug` → `pages/CategoryPage.tsx`.
      `user` (the Firebase `User`, needed for `getIdToken()`) is passed down
      as a prop from `App` rather than introduced via Context — simplest
      option for a two-route app, revisit if more pages need it.
- [x] Frontend: category/voting page (`pages/CategoryPage.tsx`) — combines
      search, a custom-entry fallback, and the leaderboard on one page per
      category (a deliberate choice: one page per category rather than
      separate search/leaderboard pages, since a voter naturally wants both
      at once). `SearchBox` was generalized to take `categorySlug` +
      `onSelect` props instead of being hardcoded to `'anime'` — it now just
      surfaces the picked result rather than owning the vote flow itself.
      Selecting a search result or submitting the custom-entry form both
      call a shared `voteFor()`: find-or-create the `Item`
      (`POST /categories/:slug/items`), then `castVote` if the user has no
      existing vote in this category or `changeVote` if they do (checked via
      `GET /:slug/my-vote`) — mirrors the backend distinction between `POST`
      and `PUT /vote`. A "Remove vote" button calls `DELETE /vote/:categoryId`.
      New client API modules: `api/votes.ts` (cast/change/remove), and
      `getLeaderboard`/`getMyVote`/`createItem` added to `api/categories.ts`.
      **Verified live** with a real Playwright browser session against a
      throwaway Firebase account created via the REST API (signed in through
      the actual `SignInForm` UI, not mocked): sign in → click into
      `/categories/movies` → add a custom entry → vote banner and leaderboard
      both update to show it with 1 vote → remove vote → banner disappears.
      **Note**: the leaderboard route has no `voteCount > 0` filter, so after
      removing a vote the item stays visible at 0 votes rather than
      disappearing — confirmed this is the existing `GET /:slug/leaderboard`
      behavior, not a bug introduced here; flagging in case it's worth a
      filter later.
      **Custom-entry form commented out for now** (2026-09-28) — the
      "Can't find it? Add it by name..." input + `handleCustomEntrySubmit`
      + `customName` state are all still in `CategoryPage.tsx`, just
      commented out (not deleted), same treatment as deferred categories.
      Search + leaderboard-button voting are the only ways to vote right
      now; `voteFor()` (the shared find-or-create-then-vote logic) is still
      wired up and used by `handleSelectResult`, so re-enabling this later
      is just uncommenting the state/handler/JSX.
      **"Find an existing vote" — a second, separate search bar** added
      above the leaderboard, searching Items already in OUR db (not the
      external provider) by name. New backend route
      `GET /categories/:slug/items?q=` (`categories.ts`, public, no auth —
      read-only, same as leaderboard/search) does a case-insensitive
      `contains` match on `Item.name` scoped to the category, ordered by
      `voteCount` desc, capped at 25. Exists because the leaderboard itself
      is capped at 25 (`take: 25`), so something with votes could exist in
      the db but not be visible anywhere on the page — this lets someone
      find and vote/change-vote for it directly, reusing a new shared
      `renderVoteAction(item)` helper (factored out of the leaderboard row
      JSX, since both lists need the identical Vote/Change vote/✓ Your vote
      logic). New client fn: `searchItems(slug, query)` in `api/categories.ts`.
      **Deliberately kept as a separate box from the external-API `SearchBox`
      above it**, not merged into one — discussed merging (external results
      annotated with their existing db vote count) and decided against it:
      merging means paying for a db lookup per external result (or per
      keystroke) even for people who only ever use one of the two boxes,
      and still wouldn't surface db-only custom entries (no `externalId` to
      match external results against) without a second query anyway — no
      actual savings, just added complexity for both paths.
      **Real bug found via live verification and fixed**: after voting
      through this box, `refresh()` updated the leaderboard and `myVote`
      but not `dbResults` — the visible search-results panel kept showing
      the stale pre-vote count until manually re-searched. Fixed by having
      `refresh()` also re-run `searchItems()` when `dbHasSearched` is true.
      **Verified live** end-to-end via Playwright with a real signed-in
      throwaway account: searched "in" → found "Inception" (existing db
      item, outside the visible leaderboard at the time) with its real
      vote count → voted for it → banner and the search panel itself both
      updated live, confirming the refresh fix.
- [x] Total-votes-per-category + percentages, shown at the top of
      `CategoryPage.tsx` ("X total votes cast") and as `x/total (pct%)` on
      every leaderboard row and every "find an existing vote" search
      result, via a new shared `renderVoteCount(item)` helper. New route
      `GET /categories/:slug/total-votes` (`categories.ts`, public) returns
      a live `prisma.vote.count({ where: { categoryId } })` — **deliberately
      not a new denormalized `Category` counter column**, unlike
      `Item.voteCount`. The distinction: `Item.voteCount` is read once PER
      ITEM on every render (25+ COUNTs per page load if computed live —
      genuinely expensive, hence denormalized), while a category's total is
      read ONCE per page load regardless of how many items exist — a plain
      `COUNT` is already cheap, so adding a third write to every vote
      transaction for it would be pure complexity with no real payoff at
      this scale. Since `Vote` has `@@unique([userId, categoryId])`, this
      count literally equals "how many people voted here," the correct
      percentage denominator. New client fn: `getTotalVotes(slug)` in
      `api/categories.ts`. **Verified live**: cast a new vote as a fresh
      throwaway voter and confirmed the total incremented correctly and
      every percentage (leaderboard rows, DB-search rows, top summary)
      stayed consistent with each other. One live-testing wrinkle worth
      recording, not a bug: the "before" count jumped by 2 instead of 1
      during verification, because the project owner was concurrently
      voting in their own browser tab during the test — `Vote.count()`
      correctly counted both real voters, confirming the logic rather than
      contradicting it.
- [ ] Frontend: leaderboard UI page — folded into the category/voting page
      above rather than built as its own separate page; leaving this line to
      note the original plan changed, not because a standalone page is still
      needed
- [x] Homepage top-5 preview strips — each category card on `Home.tsx` now
      shows a horizontal row of its top 5 leaderboard items via a new
      `client/src/components/CategoryTopFive.tsx` (self-contained: fetches
      `getLeaderboard(slug)` itself, `.slice(0, 5)`). Bigger images (80×80)
      than the small leaderboard thumbnails on `CategoryPage`, a numbered
      rank badge in the corner, and truncated name subtext underneath.
      Items with no `imageUrl` (custom entries) get a placeholder box with
      the name's first letter instead of a broken image. **Verified live**
      via Playwright + screenshot across Movies/Video Games/Anime/Actors —
      all rendered correctly with real images and correct rank order.
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
