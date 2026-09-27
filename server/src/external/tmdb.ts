import { request } from 'undici'
import type { ExternalSearchResult } from './types.js'

// Using undici's request() here too, not fetch() — not because TMDB has
// shown the same issue Jikan did, but as a preventive habit now that we
// know fetch() can behave unpredictably against some external APIs (see
// the note in jikan.ts). Cheap to do consistently, expensive to debug later.

// 1. export async function searchMovies(query: string): Promise<ExternalSearchResult[]> {
//
export async function searchMovies(query: string): Promise<ExternalSearchResult[]> {
    try {
//    3. Call TMDB's movie search endpoint:
//       https://api.themoviedb.org/3/search/movie?query=<query, encoded>
//       Pass the Bearer token as a header, not a query param:
//       { headers: { Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}` } }
        const { statusCode, body } = await request(
            `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}`,
            { headers: { Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}` } },
        )

//    4. Check the status code, same pattern as jikan.ts — anything outside
//       200-299 means return [] here, don't try to parse the body.
        if (statusCode < 200 || statusCode >= 300) {
            return []
        }

//    5. Parse the body: const json = await body.json()
//       TMDB's real shape (verified live): { results: [ { id, title, poster_path }, ... ] }
//       Note: it's `results`, not `data` like Jikan — don't copy-paste that part.
        const json = await body.json() as any

//    6. Map json.results into ExternalSearchResult:
//       - externalId: String(item.id)
//       - name: item.title
//       - imageUrl: item.poster_path
//           ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
//           : undefined
//         (poster_path is just a relative path like "/abc.jpg", or null if
//         there's no poster — remember it needs TMDB's image base URL
//         prepended to become an actual usable URL, unlike Jikan which gave
//         full URLs directly)
        const results: ExternalSearchResult[] = json.results.map((item: any) => ({
            externalId: String(item.id),
            name: item.title,
            imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
        }))

//    7. Return the mapped array.
        return results
    } catch (error) {
        return []
    }
}

// Same shape as searchMovies, just a different endpoint and field names —
// TMDB's person search returns `name` directly (not `title`) and
// `profile_path` (not `poster_path`) for the image.
export async function searchPeople(query: string): Promise<ExternalSearchResult[]> {
    try {
        const { statusCode, body } = await request(
            `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(query)}`,
            { headers: { Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}` } },
        )

        if (statusCode < 200 || statusCode >= 300) {
            return []
        }

        const json = await body.json() as any

        const results: ExternalSearchResult[] = json.results.map((item: any) => ({
            externalId: String(item.id),
            name: item.name,
            imageUrl: item.profile_path ? `https://image.tmdb.org/t/p/w500${item.profile_path}` : undefined,
        }))

        return results
    } catch (error) {
        return []
    }
}