import { apiFetch } from './client'

// Mirrors server/src/external/types.ts's ExternalSearchResult.
export interface ExternalSearchResult {
  externalId: string
  name: string
  imageUrl?: string
}

// Calls GET /categories/:slug/search?q=..., which dispatches to whichever
// external provider is registered for that category (see
// server/src/external/registry.ts). Returns [] for unsupported categories,
// missing queries, or a failed/down external API — never throws.
export function searchCategory(slug: string, query: string): Promise<ExternalSearchResult[]> {
  return apiFetch<ExternalSearchResult[]>(`/categories/${slug}/search?q=${encodeURIComponent(query)}`)
}
