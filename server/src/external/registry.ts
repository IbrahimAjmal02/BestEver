import type { ExternalSearchResult } from './types.js'
import { search as searchAnime } from './jikan.js'
import { searchMovies, searchPeople } from './tmdb.js'
import { search as searchMusic } from './musicbrainz.js'
import { search as searchGames } from './rawg.js'

export const providers: Record<string, (query: string) => Promise<ExternalSearchResult[]>> = {
    anime: searchAnime,
    movies: searchMovies,
    actors: searchPeople,
    music: searchMusic,
    'video-games': searchGames,
}