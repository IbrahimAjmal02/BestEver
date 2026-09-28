import { useEffect, useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import SignupForm from './components/SignupForm'
import SignInForm from './components/SignInForm'
import Modal from './components/Modal'
import { onAuthStateChanged, sendEmailVerification, signOut, type User } from 'firebase/auth'
import { auth } from './lib/firebase'
import Home from './pages/Home'
import CategoryPage from './pages/CategoryPage'
import ProfilePage from './pages/ProfilePage'
import NotFound from './pages/NotFound'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null)
  const location = useLocation()
  const isHome = location.pathname === '/'

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
      {!isHome && (
        <Link to="/" className="mb-4 inline-block text-sm font-medium text-gray-500 hover:text-gray-900">
          ← Back to categories
        </Link>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/bestever-panther.png" alt="" className="h-20 w-20" />
          <div>
            <img src="/bestever-wordmark.png" alt="BestEver" className="h-10 w-auto" />
            <p className="mt-1 text-gray-500">Universal Polling to find the BestEver.</p>
          </div>
        </div>

        {user ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="whitespace-nowrap text-sm text-gray-600">{user.email}</span>
            <Link to="/profile" className="whitespace-nowrap text-sm font-medium text-gray-900 hover:underline">
              Profile
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="whitespace-nowrap rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
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

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/categories/:slug" element={<CategoryPage user={user} />} />
        <Route path="/profile" element={<ProfilePage user={user} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}

export default App
