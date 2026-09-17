import { useEffect, useState } from 'react'
import { getCategories, type Category } from './api/categories'
import SignupForm from './components/SignupForm'
import SignInForm from './components/SignInForm'
import Modal from './components/Modal'
import { onAuthStateChanged, sendEmailVerification, signOut, type User } from 'firebase/auth'
import { auth } from './lib/firebase'

function App() {
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null)

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  function handleSignOut() {
    signOut(auth)
  }

  function handleResendVerification() {
    if (auth.currentUser) {
      sendEmailVerification(auth.currentUser)
    }
  }

  async function handleRefreshVerification() {
    if (auth.currentUser) {
      await auth.currentUser.reload()
      setUser(auth.currentUser)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">BestEver</h1>
          <p className="mt-1 text-gray-500">Pick a category, cast your one vote.</p>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAuthMode('signin')}
              className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-900 hover:bg-gray-50"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
            >
              Sign up
            </button>
          </div>
        )}
      </div>

      {user && !user.emailVerified && (
        <div className="mt-4 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>Please verify your email address.</span>
          <div className="flex gap-3">
            <button type="button" onClick={handleResendVerification} className="font-medium underline">
              Resend email
            </button>
            <button type="button" onClick={handleRefreshVerification} className="font-medium underline">
              I've verified, refresh
            </button>
          </div>
        </div>
      )}

      <Modal isOpen={authMode !== null} onClose={() => setAuthMode(null)}>
        {authMode === 'signup' && <SignupForm onClose={() => setAuthMode(null)} />}
        {authMode === 'signin' && <SignInForm onClose={() => setAuthMode(null)} />}
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
