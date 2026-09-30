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
  // 'checking': haven't confirmed current status yet against Firebase's
  // servers (just restored from cache, or freshly signed in).
  // 'unverified': confirmed not verified yet.
  // 'verified': confirmed verified, with a token that actually reflects it.
  const [verificationState, setVerificationState] = useState<'checking' | 'unverified' | 'verified'>('verified')
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'checking'>('idle')
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      // Don't trust currentUser.emailVerified here — a restored session can
      // have that profile flag already showing true while the underlying
      // cached ID token (the actual JWT the backend checks) is still the
      // stale pre-verification one; these two don't necessarily update in
      // lockstep on session restoration. The effect below checks the real
      // token's own claim instead of this flag, once the SDK has settled.
      setVerificationState(currentUser ? 'checking' : 'verified')
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (verificationState !== 'checking' || !user) return
    ;(async () => {
      const token = await user.getIdToken()
      const claims = JSON.parse(atob(token.split('.')[1]))
      if (!claims.email_verified) {
        // Token itself says unverified — reload() to check current server
        // state, and if it turns out they actually are verified now, force
        // a real token refresh so the NEXT getIdToken() call (e.g. voting)
        // gets one that actually carries the updated claim.
        await user.reload()
        if (user.emailVerified) {
          await user.getIdToken(true)
        }
      }
      setVerificationState(user.emailVerified ? 'verified' : 'unverified')
    })()
  }, [verificationState, user])

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

  async function handleCheckVerification() {
    if (!auth.currentUser) return
    setRefreshStatus('checking')
    await auth.currentUser.reload()
    if (auth.currentUser.emailVerified) {
      await auth.currentUser.getIdToken(true)
    }
    setVerificationState(auth.currentUser.emailVerified ? 'verified' : 'unverified')
    setRefreshStatus('idle')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {!isHome && (
        <Link to="/" className="mb-4 inline-block text-sm font-medium text-gray-500 hover:text-gray-900">
          ← Back to categories
        </Link>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <img src="/bestever-panther.png" alt="" className="h-20 w-20" />
          <div>
            <img src="/bestever-wordmark.png" alt="BestEver" className="h-10 w-auto" />
            <p className="mt-1 text-gray-500">Universal Polling to find the BestEver.</p>
          </div>
        </Link>

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

      {user && verificationState === 'unverified' && (
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
                onClick={handleCheckVerification}
                disabled={refreshStatus === 'checking'}
                className="font-medium underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshStatus === 'checking' ? 'Checking...' : "I've verified, refresh"}
              </button>
            </div>
          </div>
          {resendStatus === 'sent' && <p className="mt-1 text-green-700">Verification email sent — check your inbox.</p>}
          {resendStatus === 'error' && <p className="mt-1 text-red-700">Couldn't send the email — please wait a bit and try again.</p>}
        </div>
      )}

      <Modal isOpen={authMode !== null} onClose={() => setAuthMode(null)}>
        {authMode === 'signup' && <SignupForm onClose={() => setAuthMode(null)} />}
        {authMode === 'signin' && <SignInForm onClose={() => setAuthMode(null)} />}
      </Modal>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/categories/:slug"
          element={
            <CategoryPage
              user={user}
              isEmailVerified={verificationState === 'verified'}
              onRequireSignIn={() => setAuthMode('signin')}
            />
          }
        />
        <Route path="/profile" element={<ProfilePage user={user} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}

export default App
