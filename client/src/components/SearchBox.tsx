import { useState } from 'react'
import { searchCategory, type ExternalSearchResult } from '../api/search'

interface SearchBoxProps {
    categorySlug: string
    onSelect: (result: ExternalSearchResult) => void
}

export default function SearchBox({ categorySlug, onSelect }: SearchBoxProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<ExternalSearchResult[]>([])
    const [hasSearched, setHasSearched] = useState(false)

    function changeQuery(e: React.ChangeEvent<HTMLInputElement>) {
        setQuery(e.target.value)
    }

    function clearQuery() {
        setQuery('')
        setResults([])
        setHasSearched(false)
    }

    async function submitFunc(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault()

        try {
            const found = await searchCategory(categorySlug, query)
            setResults(found)
        } catch (err) {
            console.error('Search failed:', err)
            setResults([])
        } finally {
            setHasSearched(true)
        }
    }

    return (
        <div className="mt-8">
            <form onSubmit={submitFunc} className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={query}
                        onChange={changeQuery}
                        placeholder="Search..."
                        className="w-full rounded-md border border-gray-300 px-3 py-2 pr-9 text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={clearQuery}
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    )}
                </div>
                <button
                    type="submit"
                    className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
                >
                    Search
                </button>
            </form>

            {hasSearched && (
                <ul className="mt-4 max-h-80 divide-y divide-gray-200 overflow-y-auto rounded-lg border border-gray-200">
                    {results.length === 0 && (
                        <li className="px-4 py-3 text-gray-500">No results found.</li>
                    )}

                    {results.map((result) => (
                        <li key={result.externalId}>
                            <button
                                type="button"
                                onClick={() => onSelect(result)}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                            >
                                {result.imageUrl && (
                                    <img src={result.imageUrl} alt={result.name} className="h-12 w-12 rounded object-cover" />
                                )}
                                <span className="text-gray-900">{result.name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
