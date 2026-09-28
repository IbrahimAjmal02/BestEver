import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { getMyVotes, type MyVote } from '../api/me'

interface ProfilePageProps {
  user: User | null
}

export default function ProfilePage({ user }: ProfilePageProps) {
  const [votes, setVotes] = useState<MyVote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    user
      .getIdToken()
      .then(getMyVotes)
      .then(setVotes)
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return <p className="mt-8 text-sm text-gray-500">Sign in to see your votes.</p>
  }

  if (loading) {
    return <p className="mt-8 text-gray-500">Loading your votes…</p>
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">Your votes</h2>

      {votes.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">You haven't voted in any category yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-200 rounded-lg border border-gray-200">
          {votes.map((vote) => (
            <li key={vote.id} className="flex items-center gap-3 px-4 py-3">
              {vote.item.imageUrl && (
                <img src={vote.item.imageUrl} alt={vote.item.name} className="h-10 w-10 object-cover" />
              )}
              <div className="flex-1">
                <p className="text-gray-900">{vote.item.name}</p>
                <Link to={`/categories/${vote.category.slug}`} className="text-sm text-gray-500 hover:underline">
                  {vote.category.name}
                </Link>
              </div>
              <span className="text-sm text-gray-500">{vote.item.voteCount} votes</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
