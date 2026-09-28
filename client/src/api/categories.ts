import { apiFetch } from './client'

// Mirrors the `Category` Prisma model (see server/prisma/schema.prisma).
export interface Category {
  id: string
  name: string
  slug: string
}

// Mirrors the `Item` Prisma model.
export interface Item {
  id: string
  name: string
  externalId: string | null
  imageUrl: string | null
  voteCount: number
  categoryId: string
}

// Mirrors the `Vote` Prisma model, with the voted-for item attached (the
// server's GET /:slug/my-vote route does `include: { item: true }`).
export interface VoteWithItem {
  id: string
  createdAt: string
  userId: string
  categoryId: string
  itemId: string
  item: Item
}

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/categories')
}

export function getLeaderboard(slug: string): Promise<Item[]> {
  return apiFetch<Item[]>(`/categories/${slug}/leaderboard`)
}

// Total votes cast in this category — computed live server-side (a single
// COUNT), not a stored counter. See the route in categories.ts for why that
// distinction is fine here even though Item.voteCount IS denormalized.
export async function getTotalVotes(slug: string): Promise<number> {
  const { totalVotes } = await apiFetch<{ totalVotes: number }>(`/categories/${slug}/total-votes`)
  return totalVotes
}

// Searches Items already in our own DB for this category by name — finds
// things that exist (and may already have votes) but fell outside the
// leaderboard's top-25 cutoff. Different from searchCategory in search.ts,
// which hits the external provider (TMDB/RAWG/etc) instead.
export function searchItems(slug: string, query: string): Promise<Item[]> {
  return apiFetch<Item[]>(`/categories/${slug}/items?q=${encodeURIComponent(query)}`)
}

// Returns null if the signed-in user hasn't voted in this category yet.
export function getMyVote(slug: string, idToken: string): Promise<VoteWithItem | null> {
  return apiFetch<VoteWithItem | null>(`/categories/${slug}/my-vote`, {
    headers: { Authorization: `Bearer ${idToken}` },
  })
}

// Find-or-create: pass externalId+name(+imageUrl) for a search result, or
// just name for a custom entry (externalId omitted).
export function createItem(
  slug: string,
  data: { externalId?: string; name: string; imageUrl?: string },
  idToken: string,
): Promise<Item> {
  return apiFetch<Item>(`/categories/${slug}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(data),
  })
}
