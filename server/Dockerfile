# --- Stage 1: build ---
# Installs ALL dependencies (including devDependencies like `prisma` and
# `typescript`, needed here but not at runtime), generates the Prisma
# client, then compiles TypeScript to plain JS.
FROM node:25-alpine AS build

WORKDIR /app

# Copying just these two first (before the rest of the source) lets Docker
# cache this layer — as long as dependencies haven't changed, `npm ci`
# won't re-run on every code change, only when package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Schema-driven, not DB-driven — this reads prisma/schema.prisma and writes
# src/generated/prisma/*.ts; no DATABASE_URL or live DB connection needed
# yet. Must run before `tsc`, since that generated code is what tsc compiles.
RUN npx prisma generate

RUN npm run build

# --- Stage 2: production ---
# A fresh, minimal image: only the compiled output + production
# dependencies, none of the devDependencies or TypeScript source used to
# build it. This is the actual image that gets deployed/run.
FROM node:25-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Only dist/ — this already includes dist/generated/prisma, since that was
# just regular TS source under src/ that tsc compiled like everything else.
COPY --from=build /app/dist ./dist

# Documents the intended port; the actual bind still comes from the PORT
# env var at runtime (see src/index.ts), which is passed in when the
# container is run, not hardcoded here.
EXPOSE 4000

CMD ["node", "dist/index.js"]
