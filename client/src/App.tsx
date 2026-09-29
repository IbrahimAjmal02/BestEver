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
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'checking' | 'still-unverified'>('idle')
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // A page reload restores whatever was last cached — if that snapshot
      // says unverified, double-check with Firebase's servers rather than
      // trusting the stale cache. If they actually verified (e.g. clicked
      // the email link in another tab, then came back and refreshed), force
      // a fresh ID token too so voting doesn't 403 on the old stale claim.
      if (currentUser && !currentUser.emailVerified) {
        await currentUser.reload()
        if (currentUser.emailVerified) {
          await currentUser.getIdToken(true)
        }
        setUser(Object.assign(Object.create(Object.getPrototypeOf(currentUser)), currentUser))
        return
      }
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  function handleSignOut() {
    signOut(auth)
  }

  async function handleResendVerification() {
    if (!auth.currentUser) return
    setResendStatus('sending')
    try {
      await sendEmailVerification(auth.currentUser)
      setResendStatus('sent')
    } catch (err) {
      console.error('Resend verification failed:', err)
      setResendStatus('error')
    }
  }

  async function handleRefreshVerification() {
    if (!auth.currentUser) return
    setRefreshStatus('checking')
    await auth.currentUser.reload()
    // reload() only updates the local emailVerified flag — the actual ID
    // token used for API calls has email_verified baked in at issuance and
    // doesn't change on its own. Without forcing a refresh here, the banner
    // would correctly disappear while voting still 403s on a stale token.
    await auth.currentUser.getIdToken(true)
    // reload() mutates auth.currentUser in place rather than replacing
    // it, so passing it straight to setUser is a same-reference no-op —
    // React bails out of the re-render even though emailVerified changed.
    // Copy onto a new object with the same prototype so getIdToken() and
    // friends still work, but the reference itself changes.
    const refreshedUser = Object.assign(Object.create(Object.getPrototypeOf(auth.currentUser)), auth.currentUser)
    setUser(refreshedUser)
    setRefreshStatus(refreshedUser.emailVerified ? 'idle' : 'still-unverified')
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
          <div className="flex flex-col items-end gap-2">
            <span className="whitespace-nowrap text-sm text-gray-500">{user.email}</span>
            <div className="flex items-center gap-3">
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
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-center justify-between">
            <span>Please verify your email address.</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendStatus === 'sending'}
                className="font-medium underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendStatus === 'sending' ? 'Sending...' : 'Resend email'}
              </button>
              <button
                type="button"
                onClick={handleRefreshVerification}
                disabled={refreshStatus === 'checking'}
                className="font-medium underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshStatus === 'checking' ? 'Checking...' : "I've verified, refresh"}
              </button>
            </div>
          </div>
          {resendStatus === 'sent' && <p className="mt-1 text-green-700">Verification email sent — check your inbox.</p>}
          {resendStatus === 'error' && <p className="mt-1 text-red-700">Couldn't send the email — please wait a bit and try again.</p>}
          {refreshStatus === 'still-unverified' && (
            <p className="mt-1">Still not verified — click the link in your email first, then try again.</p>
          )}
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
