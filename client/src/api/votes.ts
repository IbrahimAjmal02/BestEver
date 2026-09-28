import { apiFetch } from './client'
import type { Item } from './categories'

export interface VoteRecord {
  id: string
  createdAt: string
  userId: string
  categoryId: string
  itemId: string
}

interface VoteResponse {
  vote: VoteRecord
  item: Item
}

// Casts a first vote in whatever category `itemId` belongs to. 409s if the
// user already has a vote in that category — use changeVote instead.
export function castVote(itemId: string, idToken: string): Promise<VoteResponse> {
  return apiFetch<VoteResponse>('/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ itemId }),
  })
}

// Moves an existing vote to a different item within the same category.
// 404s if there's no existing vote to change — use castVote for a first vote.
export function changeVote(itemId: string, idToken: string): Promise<VoteResponse> {
  return apiFetch<VoteResponse>('/vote', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ itemId }),
  })
}

// categoryId is the Category's actual id (as stored on the Vote row), not the slug.
export function removeVote(categoryId: string, idToken: string): Promise<VoteResponse> {
  return apiFetch<VoteResponse>(`/vote/${categoryId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  })
}
