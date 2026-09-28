import { request } from 'undici'
import type { ExternalSearchResult } from './types.js'

// Replaces jikan.ts — Jikan (the unofficial MAL proxy) is being shut down
// (brownout since 2026-09-01, full discontinuation 2026-10-01), which also
// explains a lot of the flakiness debugged under the old provider. This
// calls MyAnimeList's own official API directly, skipping that proxy layer
// entirely. Read-only search only needs a Client ID header — no OAuth flow
// needed, since we're never touching a user's personal MAL list.
export async function search(query: string): Promise<ExternalSearchResult[]> {
    try {
        const { statusCode, body } = await request(
            `https://api.myanimelist.net/v2/anime?q=${encodeURIComponent(query)}&fields=id,title,main_picture,popularity`,
            { headers: { 'X-MAL-CLIENT-ID': process.env.MAL_CLIENT_ID as string } },
        )

        if (statusCode < 200 || statusCode >= 300) {
            return []
        }

        // Shape: { data: [ { node: { id, title, main_picture: { medium, large }, popularity } }, ... ] }
        const json = await body.json() as any

        // MAL's search endpoint has no ordering param (only the separate
        // /ranking endpoint does, and it doesn't take a text query) — it
        // ranks by title-match relevance only, so an obscure anime titled
        // exactly "Love" outranks a show with 1.5M viewers when searching
        // "love". Since the API won't sort by popularity for us, we do it
        // ourselves: `popularity` is a RANK (1 = most popular), ascending.
        // Entries with no rank yet sort last, not first.
        const entries = [...json.data].sort(
            (a: any, b: any) => (a.node.popularity ?? Infinity) - (b.node.popularity ?? Infinity),
        )

        const results: ExternalSearchResult[] = entries.map((entry: any) => ({
            externalId: String(entry.node.id),
            name: entry.node.title,
            imageUrl: entry.node.main_picture?.medium,
        }))

        return results
    } catch (error) {
        return []
    }
}
