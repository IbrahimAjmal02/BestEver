import type { ExternalSearchResult } from './types.js'
import { search as searchAnime } from './myanimelist.js'
import { searchMovies, searchPeople } from './tmdb.js'
// import { search as searchMusic } from './musicbrainz.js' // deferred, see seed.ts
import { search as searchGames } from './rawg.js'

export const providers: Record<string, (query: string) => Promise<ExternalSearchResult[]>> = {
    anime: searchAnime,
    movies: searchMovies,
    actors: searchPeople,
    // 'musical-artist': searchMusic, // deferred for now — see seed.ts
    'video-games': searchGames,
}