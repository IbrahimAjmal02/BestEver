import { useEffect, useState } from 'react'
import { getCategories, type Category } from './api/categories'
import SignupForm from './components/SignupForm'
import Modal from './components/Modal'

function App() {
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">BestEver</h1>
          <p className="mt-1 text-gray-500">Pick a category, cast your one vote.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAuth(true)}
          className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
        >
          Sign up / Sign in
        </button>
      </div>

      <Modal isOpen={showAuth} onClose={() => setShowAuth(false)}>
        <SignupForm onClose={() => setShowAuth(false)} />
      </Modal>

      <ul className="mt-8 divide-y divide-gray-200 rounded-lg border border-gray-200">
        {loading && <li className="px-4 py-3 text-gray-500">Loading categories…</li>}

        {error && (
          <li className="px-4 py-3 text-red-600">
            Couldn't load categories: {error}
          </li>
        )}

        {!loading && !error && categories.length === 0 && (
          <li className="px-4 py-3 text-gray-500">No categories yet.</li>
        )}

        {categories.map((category) => (
          <li key={category.id} className="px-4 py-3 text-gray-900 hover:bg-gray-50">
            {category.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
