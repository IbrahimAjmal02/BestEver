import { request } from 'undici'
import type { ExternalSearchResult } from './types.js'

// MusicBrainz's usage policy requires a descriptive User-Agent identifying
// the app + a contact method — this isn't optional, they'll rate-limit or
// block requests without one. ~1 request/second is their documented limit;
// not an issue for a single search action from one user, worth remembering
// if this ever needs to handle bursts of requests.
const USER_AGENT = 'BestEver/1.0 (ibrahimajmal02@gmail.com)'

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

        const results: ExternalSearchResult[] = json.artists.map((item: any) => ({
            externalId: item.id,
            name: item.name,
            imageUrl: undefined,
        }))

        return results
    } catch (error) {
        return []
    }
}
