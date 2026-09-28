import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCategories, type Category } from '../api/categories'
import CategoryTopFive from '../components/CategoryTopFive'

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="mt-8 text-gray-500">Loading categories…</p>
  if (error) return <p className="mt-8 text-red-600">Couldn't load categories: {error}</p>
  if (categories.length === 0) return <p className="mt-8 text-gray-500">No categories yet.</p>

  return (
    <div className="mt-8 flex flex-col gap-6">
      {categories.map((category) => (
        <div key={category.id} className="rounded-lg border border-gray-200 p-4">
          <Link
            to={`/categories/${category.slug}`}
            className="text-lg font-semibold text-gray-900 hover:underline"
          >
            {category.name}
          </Link>

          <div className="mt-3">
            <CategoryTopFive slug={category.slug} />
          </div>
        </div>
      ))}
    </div>
  )
}
