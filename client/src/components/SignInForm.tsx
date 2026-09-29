import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { syncUser } from '../api/users';

interface SignInFormProps {
    onClose?: () => void
}

// Modern Firebase Auth deliberately merges "wrong password" and "no such
// account" into one generic auth/invalid-credential code, specifically to
// stop attackers probing which emails have accounts (email enumeration
// protection) — so the message below covers both possibilities honestly,
// rather than pretending we can tell them apart.
function messageForError(code: string | undefined): string {
    switch (code) {
        case 'auth/invalid-credential':
            return "Incorrect email or password — or you might not have an account yet. Try again, or sign up instead."
        case 'auth/too-many-requests':
            return 'Too many attempts. Please wait a bit and try again.'
        default:
            return 'Something went wrong signing in.'
    }
}

export default function SignInForm({ onClose }: SignInFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null)
    const [unverifiedNotice, setUnverifiedNotice] = useState(false)

    function changeEmail(e: React.ChangeEvent<HTMLInputElement>) {
        setEmail(e.target.value)
    }

    function changePass(e: React.ChangeEvent<HTMLInputElement>) {
        setPassword(e.target.value)
    }

    async function submitFunc(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)
        setUnverifiedNotice(false)

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            console.log('Signed in:', userCredential.user.uid)

            try {
                const idToken = await userCredential.user.getIdToken()
                await syncUser(idToken)
            } catch (syncErr) {
                // Firebase auth already succeeded by this point — a backend
                // hiccup here isn't a failed sign-in, and syncUser just runs
                // again next time they sign in anyway.
                console.error('User sync failed (sign-in still succeeded):', syncErr)
            }

            if (!userCredential.user.emailVerified) {
                // Sign-in still succeeded — stay open so they actually see
                // this before closing, rather than flashing past it.
                setUnverifiedNotice(true)
                return
            }

            onClose?.()
        } catch (err) {
            console.error('Sign in failed:', err)
            const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : undefined
            setError(messageForError(code))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={submitFunc} className="relative flex w-80 flex-col gap-3 rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>
            )}
            <h2 className="text-lg font-semibold text-gray-900">Sign in</h2>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {unverifiedNotice && (
                <p className="text-sm text-amber-700">
                    Signed in, but your email isn't verified yet — check your inbox for the link we sent.
                </p>
            )}

            <input
                type="email"
                onChange={changeEmail}
                value={email}
                placeholder="Email"
                className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
            />
            <input
                type="password"
                onChange={changePass}
                value={password}
                placeholder="Password"
                autoComplete="current-password"
                className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
            />
            <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
        </form>
    )

}
