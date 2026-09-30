import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCategories, type Category } from '../api/categories'
import CategoryTopFive from '../components/CategoryTopFive'

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="mt-8 text-gray-500">Loading categories…</p>
  if (error) return <p className="mt-8 text-red-600">Couldn't load categories: {error}</p>
  if (categories.length === 0) return <p className="mt-8 text-gray-500">No categories yet.</p>

  // Small, fixed list of categories, all already fetched — filtering
  // locally is simpler and faster than a round trip for this.
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="mt-8">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search categories..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 pr-9 text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {filteredCategories.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">No categories match "{query}".</p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {filteredCategories.map((category) => (
          <Link
            key={category.id}
            to={`/categories/${category.slug}`}
            className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <span className="text-lg font-semibold text-gray-900">{category.name}</span>

            <div className="mt-3">
              <CategoryTopFive slug={category.slug} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
