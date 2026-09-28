import { request } from 'undici'
import type { ExternalSearchResult } from './types.js'

export async function search(query: string): Promise<ExternalSearchResult[]> {
    try {
        const { statusCode, body } = await request(
            `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(query)}&ordering=-added`,
        )

        if (statusCode < 200 || statusCode >= 300) {
            return []
        }

        const json = await body.json() as any

        const results: ExternalSearchResult[] = json.results.map((item: any) => ({
            externalId: String(item.id),
            name: item.name,
            imageUrl: item.background_image ?? undefined,
        }))

        return results
    } catch (error) {
        return []
    }
}
