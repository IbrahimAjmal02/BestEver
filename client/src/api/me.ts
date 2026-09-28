import { apiFetch } from './client'
import type { Category, Item } from './categories'

// Mirrors GET /me/votes's shape — a Vote row with both its Item and
// Category joined in, since the profile page needs both (what you voted
// for, and which category/page to link back to).
export interface MyVote {
  id: string
  createdAt: string
  userId: string
  categoryId: string
  itemId: string
  item: Item
  category: Category
}

export function getMyVotes(idToken: string): Promise<MyVote[]> {
  return apiFetch<MyVote[]>('/me/votes', {
    headers: { Authorization: `Bearer ${idToken}` },
  })
}
