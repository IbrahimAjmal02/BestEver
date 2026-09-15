import { apiFetch } from './client'

// Mirrors the `Category` Prisma model (see server/prisma/schema.prisma).
export interface Category {
  id: string
  name: string
  slug: string
}

// Expects a route like `router.get('/categories', ...)` on the server that
// returns `Category[]` as JSON. Doesn't exist yet — this is the shape the
// frontend is ready for as soon as it does.
export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/categories')
}
