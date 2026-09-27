import { request } from 'undici'
import type { ExternalSearchResult } from './types.js'

// Using undici's `request()` instead of the global `fetch()` here —
// deliberately, not a style choice. Jikan's infrastructure returns a 504
// specifically to requests made via `fetch()` (its stricter, spec-compliant
// wrapper), while `undici.request()` (the lower-level client `fetch()` is
// itself built on) gets a real response. Confirmed by directly comparing
// the two against the same URL. Likely a Cloudflare-level bot-detection
// quirk reacting to something `fetch()` adds automatically — not something
// we can fix on our end, so we route around it.

// 1. export async function search(query: string): Promise<ExternalSearchResult[]> {
//

export async function search(query: string): Promise<ExternalSearchResult[]> {
//    2. Wrap EVERYTHING below in a try/catch — this is the fail-soft
//       requirement. If anything throws (network error, bad JSON, etc.),
//       the catch block should return [] instead of letting it propagate.
    try {
//    3. Build the URL and fetch it:
//       https://api.jikan.moe/v4/anime?q=<query, encoded>
//       Remember encodeURIComponent(query) — same URL-encoding concept
//       from way back when we discussed the % in URLs.
        const { statusCode, body } = await request(
            `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}`,
        )

//    4. Check the status code — if the request came back with an error
//       status, return [] here too. Don't try to parse a failed response.
        if (statusCode < 200 || statusCode >= 300) {
            return []
        }

//    5. Parse the body: const json = await body.json()
//       Jikan's real shape: { data: [ { mal_id, title, images: { jpg: { image_url } } }, ... ] }
        const json = await body.json() as any

//    6. Map json.data into your normalized ExternalSearchResult shape:
//       - externalId: String(item.mal_id)   (mal_id is a number, externalId must be a string)
//       - name: item.title
//       - imageUrl: item.images.jpg.image_url
        const results: ExternalSearchResult[] = json.data.map((item: any) => ({
            externalId: String(item.mal_id),
            name: item.title,
            imageUrl: item.images?.jpg?.image_url,
        }))

//    7. Return the mapped array.
        return results
    } catch (error) {
        return []
    }
}
