import type { ExternalSearchResult } from './types.js'
import { search as searchAnime } from './jikan.js'

export const providers: Record<string, (query: string) => Promise<ExternalSearchResult[]>> = {
    anime: searchAnime,
}