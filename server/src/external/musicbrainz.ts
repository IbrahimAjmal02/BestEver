import { request } from 'undici'
import type { ExternalSearchResult } from './types.js'

// MusicBrainz's usage policy requires a descriptive User-Agent identifying
// the app + a contact method — this isn't optional, they'll rate-limit or
// block requests without one. ~1 request/second is their documented limit;
// not an issue for a single search action from one user, worth remembering
// if this ever needs to handle bursts of requests.
const USER_AGENT = 'BestEver/1.0 (ibrahimajmal02@gmail.com)'

// MusicBrainz's core API doesn't return artist photos or popularity data at
// all — it's a metadata database (no play/fan counts by design), not an
// image host or a charts service. Deezer's public search API has both, free,
// no key needed, but it's a separate catalog with no shared ID to
// MusicBrainz — this can only match by searching Deezer for the same name.
//
// Deezer's own search results are NOT sorted by popularity (confirmed live:
// searching "drake" put a 119-fan artist ahead of the real Drake at 24M
// fans) — so grabbing data[0] isn't just "possibly the wrong artist," it
// was verified to actively be the wrong one for an extremely common query.
// Picking the highest fan-count match instead fixes that case. Doesn't fully
// solve ambiguous names in general (still name-only matching, no shared ID),
// but "the most famous person with this name" is a much better guess than
// "whatever Deezer's internal index happened to return first."
async function getDeezerMatch(artistName: string): Promise<{ imageUrl?: string; fans: number } | undefined> {
    try {
        const { statusCode, body } = await request(
            `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}`,
        )

        if (statusCode < 200 || statusCode >= 300) {
            return undefined
        }

        const json = await body.json() as any
        const candidates = json.data as any[] | undefined
        if (!candidates || candidates.length === 0) return undefined

        const best = candidates.reduce((a, b) => ((b.nb_fan ?? 0) > (a.nb_fan ?? 0) ? b : a))
        return { imageUrl: best.picture_medium, fans: best.nb_fan ?? 0 }
    } catch (error) {
        return undefined
    }
}

export async function search(query: string): Promise<ExternalSearchResult[]> {
    try {
        const { statusCode, body } = await request(
            `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(query)}&fmt=json`,
            { headers: { 'User-Agent': USER_AGENT } },
        )

        if (statusCode < 200 || statusCode >= 300) {
            return []
        }

        const json = await body.json() as any

        // One Deezer lookup per MusicBrainz result, in parallel (there can
        // be ~25 of these) — each already fails soft on its own via
        // getDeezerMatch's own try/catch, so a bad lookup for one artist
        // can't take down the rest of the batch.
        const matched = await Promise.all(
            json.artists.map(async (item: any) => {
                const deezer = await getDeezerMatch(item.name)
                return { externalId: item.id, name: item.name, imageUrl: deezer?.imageUrl, fans: deezer?.fans ?? 0 }
            }),
        )

        // MusicBrainz's own order is text-match relevance, not popularity —
        // it has no popularity data to sort by at all. Deezer's fan count,
        // which we're already fetching per artist for images, doubles as
        // the popularity signal MusicBrainz can't provide on its own.
        matched.sort((a, b) => b.fans - a.fans)

        const results: ExternalSearchResult[] = matched.map(({ externalId, name, imageUrl }) => ({
            externalId,
            name,
            imageUrl,
        }))

        return results
    } catch (error) {
        return []
    }
}
