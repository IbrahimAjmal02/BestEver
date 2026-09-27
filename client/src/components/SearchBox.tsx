// 1. Imports needed:
//    - { useState } from 'react'
//    - { searchCategory } from '../api/search' — and the ExternalSearchResult
//      type too, for typing your results state
import { useState } from 'react'
import { searchCategory, type ExternalSearchResult } from '../api/search'

// 2. export default function SearchBox() {
//    (fixed a typo here — was "SearcBox", missing the 'h')
export default function SearchBox() {
//    3. Local state, same pattern as SignupForm/SignInForm:
//       - query (string) — what's currently typed in the input
//       - results (ExternalSearchResult[]) — whatever came back from the last search
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<ExternalSearchResult[]>([])
    const [hasSearched, setHasSearched] = useState(false)

//    4. A changeQuery handler — same shape as changeEmail/changePass:
//       (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)
    function changeQuery(e: React.ChangeEvent<HTMLInputElement>) {
        setQuery(e.target.value)
    }

//    5. An async submitFunc(e: React.SubmitEvent<HTMLFormElement>):
//       - e.preventDefault()
//       - call searchCategory('anime', query) — hardcoded to 'anime' for now
//       - store what comes back with setResults(...)
//       - wrap in try/catch (same reasoning as your auth forms — apiFetch
//         can still throw on a genuine network failure, even though the
//         backend route itself fails soft to [] for most cases)
    async function submitFunc(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault()

        try {
            const found = await searchCategory('anime', query)
            setResults(found)
        } catch (err) {
            console.error('Search failed:', err)
            setResults([])
        } finally {
            setHasSearched(true)
        }
    }

//    6. Return JSX:
//       - a <form onSubmit={submitFunc}> with one text <input> (value={query},
//         onChange={changeQuery}) and a submit <button>
//       - below the form, map over `results` into a list — show result.name,
//         and result.imageUrl as an <img> if it exists (optional field,
//         remember — not every result is guaranteed to have one)
    return (
        <div className="mt-8">
            <form onSubmit={submitFunc} className="flex gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={changeQuery}
                    placeholder="Search anime..."
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
                />
                <button
                    type="submit"
                    className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
                >
                    Search
                </button>
            </form>

            <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200">
                {hasSearched && results.length === 0 && (
                    <li className="px-4 py-3 text-gray-500">No results found.</li>
                )}

                {results.map((result) => (
                    <li key={result.externalId} className="flex items-center gap-3 px-4 py-3">
                        {result.imageUrl && (
                            <img src={result.imageUrl} alt={result.name} className="h-12 w-12 rounded object-cover" />
                        )}
                        <span className="text-gray-900">{result.name}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}