import type { ExternalSearchResult } from './types.js'

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
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}`)

//    4. Check res.ok — if the request came back with an error status
//       (which is EXACTLY what's happening right now, Jikan is down),
//       return [] here too. Don't try to parse a failed response as JSON.
        if (!res.ok) {
            return []
        }

//    5. Parse the body: const json = await res.json()
//       Jikan's real shape: { data: [ { mal_id, title, images: { jpg: { image_url } } }, ... ] }
        const json = await res.json()

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
