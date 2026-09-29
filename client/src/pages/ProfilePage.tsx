import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { getMyVotes, type MyVote } from '../api/me'
import { getLeaderboard } from '../api/categories'
import { removeVote } from '../api/votes'

interface ProfilePageProps {
  user: User | null
}

export default function ProfilePage({ user }: ProfilePageProps) {
  const [votes, setVotes] = useState<MyVote[]>([])
  const [topItemIds, setTopItemIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [removingCategoryId, setRemovingCategoryId] = useState<string | null>(null)

  async function loadVotes() {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    const idToken = await user.getIdToken()
    const myVotes = await getMyVotes(idToken)
    setVotes(myVotes)

    // Each vote is in a different category's leaderboard, so figure out
    // which ones are rank #1 in their own category — same crown treatment
    // the leaderboard itself uses — by checking each category individually.
    const leaderboards = await Promise.all(myVotes.map((vote) => getLeaderboard(vote.category.slug)))
    const topIds = new Set<string>()
    leaderboards.forEach((leaderboard, i) => {
      if (leaderboard[0]?.id === myVotes[i].item.id) {
        topIds.add(myVotes[i].item.id)
      }
    })
    setTopItemIds(topIds)
    setLoading(false)
  }

  useEffect(() => {
    loadVotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleRemoveVote(categoryId: string) {
    if (!user) return
    setRemovingCategoryId(categoryId)
    try {
      const idToken = await user.getIdToken()
      await removeVote(categoryId, idToken)
      await loadVotes()
    } catch (err) {
      console.error('Removing vote failed:', err)
    } finally {
      setRemovingCategoryId(null)
    }
  }

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
                <div className="relative">
                  {topItemIds.has(vote.item.id) && (
                    <img
                      src="/crown.png"
                      alt="1st place"
                      className="absolute -top-5 left-1/2 z-10 h-5 w-auto -translate-x-1/2"
                    />
                  )}
                  <img src={vote.item.imageUrl} alt={vote.item.name} className="h-10 w-10 object-cover" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-gray-900">{vote.item.name}</p>
                <Link to={`/categories/${vote.category.slug}`} className="text-sm text-gray-500 hover:underline">
                  {vote.category.name}
                </Link>
              </div>
              <span className="text-sm text-gray-500">{vote.item.voteCount} votes</span>
              <button
                type="button"
                onClick={() => handleRemoveVote(vote.categoryId)}
                disabled={removingCategoryId === vote.categoryId}
                className="text-sm font-medium text-red-600 underline disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Remove vote
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
