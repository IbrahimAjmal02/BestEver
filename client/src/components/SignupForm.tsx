import { useState } from 'react'
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { syncUser } from '../api/users';

interface SignupFormProps {
    onClose?: () => void
}

// createUserWithEmailAndPassword only tells us the email is already
// registered — it can't tell us whether that existing account was ever
// verified, since it fails before touching that account at all. So the
// message covers both real possibilities honestly, same reasoning as
// SignInForm's merged invalid-credential message.
function messageForError(code: string | undefined): string {
    switch (code) {
        case 'auth/email-already-in-use':
            return "This email's already registered. If that's you, sign in instead — or if you haven't verified it yet, check your inbox for the link."
        case 'auth/weak-password':
            return 'Password is too weak — use at least 6 characters.'
        case 'auth/invalid-email':
            return "That doesn't look like a valid email address."
        default:
            return 'Something went wrong signing up.'
    }
}

export default function SignupForm({ onClose }: SignupFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null)

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

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            console.log('Signed up:', userCredential.user.uid)

            try {
                const idToken = await userCredential.user.getIdToken()
                await syncUser(idToken)
            } catch (syncErr) {
                // Firebase account already exists by this point — a backend
                // hiccup here isn't a failed signup, and syncUser just runs
                // again next time they sign in anyway.
                console.error('User sync failed (signup still succeeded):', syncErr)
            }

            await sendEmailVerification(userCredential.user)
            onClose?.()
        } catch (err) {
            console.error('Signup failed:', err)
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
            <h2 className="text-lg font-semibold text-gray-900">Sign up</h2>

            {error && <p className="text-sm text-red-600">{error}</p>}

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
                autoComplete="new-password"
                className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
            />
            <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
                {isSubmitting ? 'Signing up...' : 'Sign up'}
            </button>
        </form>
    )

}
