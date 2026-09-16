import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../lib/firebase'

interface SignupFormProps {
    onClose?: () => void
}

export default function SignupForm({ onClose }: SignupFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    function changeEmail(e: React.ChangeEvent<HTMLInputElement>) {
        setEmail(e.target.value)
    }

    function changePass(e: React.ChangeEvent<HTMLInputElement>) {
        setPassword(e.target.value)
    }

    async function submitFunc(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const idToken = await userCredential.user.getIdToken()
            console.log('Signed up:', userCredential.user.uid)
            console.log('ID token:', idToken)
            onClose?.()
        } catch (err) {
            console.error('Signup failed:', err)
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