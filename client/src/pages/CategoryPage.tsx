import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { sendEmailVerification, type User } from 'firebase/auth'
import {
  getLeaderboard,
  getMyVote,
  createItem,
  searchItems,
  getTotalVotes,
  type Item,
  type VoteWithItem,
} from '../api/categories'
import { castVote, changeVote, removeVote } from '../api/votes'
import type { ExternalSearchResult } from '../api/search'
import SearchBox from '../components/SearchBox'
import Modal from '../components/Modal'

interface CategoryPageProps {
  user: User | null
  isEmailVerified: boolean
  onRequireSignIn: () => void
}

export default function CategoryPage({ user, isEmailVerified, onRequireSignIn }: CategoryPageProps) {
  const { slug } = useParams<{ slug: string }>()
  const [leaderboard, setLeaderboard] = useState<Item[]>([])
  const [myVote, setMyVote] = useState<VoteWithItem | null>(null)
  // const [customName, setCustomName] = useState('') // custom-entry fallback commented out for now, see below
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [dbQuery, setDbQuery] = useState('')
  const [dbResults, setDbResults] = useState<Item[]>([])
  const [dbHasSearched, setDbHasSearched] = useState(false)
  const [totalVotes, setTotalVotes] = useState(0)
  // Shown as a popup right at the point someone tries to vote, rather than
  // relying only on the passive banner at the top of the page — much more
  // likely to actually be seen in the moment it matters.
  const [gatePopup, setGatePopup] = useState<'signin' | 'verify' | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // Shared by every vote entry point — returns false (and opens the
  // relevant popup) if this attempt shouldn't proceed.
  function canVote() {
    if (!user) {
      setGatePopup('signin')
      return false
    }
    if (!isEmailVerified) {
      setGatePopup('verify')
      return false
    }
    return true
  }

  async function handleResendFromPopup() {
    if (!user) return
    setResendStatus('sending')
    try {
      await sendEmailVerification(user)
      setResendStatus('sent')
    } catch (err) {
      console.error('Resend verification failed:', err)
      setResendStatus('error')
    }
  }

  const refresh = useCallback(async () => {
    if (!slug) return

    getLeaderboard(slug).then(setLeaderboard)
    getTotalVotes(slug).then(setTotalVotes)

    if (user) {
      const idToken = await user.getIdToken()
      getMyVote(slug, idToken).then(setMyVote)
    } else {
      setMyVote(null)
    }

    // Keep the "find an existing vote" results (voteCount, "Your vote" badge)
    // in sync too, not just the leaderboard — otherwise voting from there
    // leaves it showing a stale count until you re-search manually.
    if (dbHasSearched) {
      searchItems(slug, dbQuery).then(setDbResults)
    }
  }, [slug, user, dbHasSearched, dbQuery])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Casts a first vote or moves an existing one, depending on whether
  // myVote is already set — shared by every way of voting on this page.
  async function submitVote(itemId: string, idToken: string) {
    if (myVote) {
      await changeVote(itemId, idToken)
    } else {
      await castVote(itemId, idToken)
    }
  }

  // Used by both "pick a search result" and "add a custom entry" — find or
  // create the Item first, since neither of those already has one.
  async function voteFor(data: { externalId?: string; name: string; imageUrl?: string }) {
    if (!slug) return
    if (!canVote() || !user) return

    setIsSubmitting(true)
    setActionError(null)

    try {
      const idToken = await user.getIdToken()
      const item = await createItem(slug, data, idToken)
      await submitVote(item.id, idToken)
      await refresh()
    } catch (err) {
      console.error('Vote failed:', err)
      setActionError(err instanceof Error ? err.message : 'Something went wrong casting your vote.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Used by the leaderboard's own vote button — the Item already exists,
  // so this skips straight to casting/changing the vote.
  async function handleVoteForItem(itemId: string) {
    if (!canVote() || !user) return

    setIsSubmitting(true)
    setActionError(null)

    try {
      const idToken = await user.getIdToken()
      await submitVote(itemId, idToken)
      await refresh()
    } catch (err) {
      console.error('Vote failed:', err)
      setActionError(err instanceof Error ? err.message : 'Something went wrong casting your vote.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSelectResult(result: ExternalSearchResult) {
    voteFor({ externalId: result.externalId, name: result.name, imageUrl: result.imageUrl })
  }

  // Searches Items already in OUR db (not the external API) — finds things
  // that already have votes but fell outside the leaderboard's top-25.
  async function handleDbSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!slug) return

    try {
      const found = await searchItems(slug, dbQuery)
      setDbResults(found)
    } catch (err) {
      console.error('Database search failed:', err)
      setDbResults([])
    } finally {
      setDbHasSearched(true)
    }
  }

  // Custom-entry fallback (voting for something not found by search) is
  // commented out for now — see the matching JSX below.
  // async function handleCustomEntrySubmit(e: React.FormEvent<HTMLFormElement>) {
  //   e.preventDefault()
  //   if (!customName.trim()) return
  //
  //   await voteFor({ name: customName.trim() })
  //   setCustomName('')
  // }

  async function handleRemoveVote() {
    if (!user || !myVote) return

    setIsSubmitting(true)
    setActionError(null)

    try {
      const idToken = await user.getIdToken()
      await removeVote(myVote.categoryId, idToken)
      await refresh()
    } catch (err) {
      console.error('Removing vote failed:', err)
      setActionError(err instanceof Error ? err.message : 'Something went wrong removing your vote.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Shared by both the leaderboard rows and the database-search results below.
  function renderVoteCount(item: Item) {
    const pct = totalVotes > 0 ? Math.round((item.voteCount / totalVotes) * 100) : 0

    return (
      <span className="text-sm text-gray-500">
        {item.voteCount}/{totalVotes} votes ({pct}%)
      </span>
    )
  }

  // Shared by both the leaderboard rows and the database-search results below.
  function renderVoteAction(item: Item) {
    if (myVote?.itemId === item.id) {
      return <span className="text-sm font-medium text-gray-500">✓ Your vote</span>
    }

    return (
      <button
        type="button"
        onClick={() => handleVoteForItem(item.id)}
        disabled={isSubmitting}
        className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
      >
        {myVote ? 'Change vote' : 'Vote'}
      </button>
    )
  }

  if (!slug) return null

  return (
    <div className="mt-8">
      {myVote ? (
        <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-3">
            {myVote.item.imageUrl && (
              <div className="relative">
                {leaderboard[0]?.id === myVote.item.id && (
                  <img
                    src="/crown.png"
                    alt="1st place"
                    className="absolute -top-5 left-1/2 z-10 h-5 w-auto -translate-x-1/2"
                  />
                )}
                <img src={myVote.item.imageUrl} alt={myVote.item.name} className="h-10 w-10 object-cover" />
              </div>
            )}
            <span className="text-gray-900">
              You voted for <span className="font-medium">{myVote.item.name}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemoveVote}
            disabled={isSubmitting}
            className="text-sm font-medium text-red-600 underline disabled:cursor-not-allowed disabled:text-gray-400"
          >
            Remove vote
          </button>
        </div>
      ) : (
        !user && <p className="text-sm text-gray-500">Sign in to cast a vote in this category.</p>
      )}

      {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}

      <SearchBox categorySlug={slug} onSelect={handleSelectResult} />

      {/* Custom-entry fallback ("Can't find it? Add it by name...") commented
          out for now — search + leaderboard voting only, see handleCustomEntrySubmit above.
      <form onSubmit={handleCustomEntrySubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Can't find it? Add it by name..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
        >
          Add & vote
        </button>
      </form>
      */}

      <h2 className="mt-8 text-lg font-semibold text-gray-900">Wondering how many votes a movie has?</h2>
      <p className="mt-1 text-sm text-gray-500">
        Search what's already been voted on here — including things that fell off the top 25 below.
      </p>
      <form onSubmit={handleDbSearch} className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={dbQuery}
            onChange={(e) => setDbQuery(e.target.value)}
            placeholder="Search existing votes..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 pr-9 text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
          />
          {dbQuery && (
            <button
              type="button"
              onClick={() => {
                setDbQuery('')
                setDbResults([])
                setDbHasSearched(false)
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
        >
          Search
        </button>
      </form>

      {dbHasSearched && (
        <ul className="mt-3 max-h-80 divide-y divide-gray-200 overflow-y-auto rounded-lg border border-gray-200">
          {dbResults.length === 0 && (
            <li className="px-4 py-3 text-gray-500">No existing votes found for that.</li>
          )}

          {dbResults.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.name} className="h-10 w-10 object-cover" />
              )}
              <span className="flex-1 text-gray-900">{item.name}</span>
              {renderVoteCount(item)}
              {renderVoteAction(item)}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Leaderboard</h2>
        <span className="text-sm text-gray-500">
          {totalVotes} total vote{totalVotes === 1 ? '' : 's'} cast
        </span>
      </div>
      <ol className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200">
        {leaderboard.length === 0 && (
          <li className="px-4 py-3 text-gray-500">No votes yet — be the first!</li>
        )}

        {leaderboard.map((item, index) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <span className="w-6 text-sm text-gray-400">{index + 1}</span>
            {item.imageUrl && (
              <div className="relative">
                {index === 0 && (
                  <img
                    src="/crown.png"
                    alt="1st place"
                    className="absolute -top-5 left-1/2 z-10 h-5 w-auto -translate-x-1/2"
                  />
                )}
                <img src={item.imageUrl} alt={item.name} className="h-10 w-10 object-cover" />
              </div>
            )}
            <span className="flex-1 text-gray-900">{item.name}</span>
            {renderVoteCount(item)}
            {renderVoteAction(item)}
          </li>
        ))}
      </ol>

      <Modal
        isOpen={gatePopup !== null}
        onClose={() => {
          setGatePopup(null)
          setResendStatus('idle')
        }}
      >
        <div className="relative w-80 rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setGatePopup(null)
              setResendStatus('idle')
            }}
            aria-label="Close"
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>

          {gatePopup === 'signin' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900">Sign in to vote</h2>
              <p className="mt-2 text-sm text-gray-600">You need an account to cast a vote in this category.</p>
              <button
                type="button"
                onClick={() => {
                  setGatePopup(null)
                  onRequireSignIn()
                }}
                className="mt-4 w-full rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
              >
                Sign in
              </button>
            </>
          )}

          {gatePopup === 'verify' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900">Verify your email to vote</h2>
              <p className="mt-2 text-sm text-gray-600">
                Check your inbox for the verification link, then come back and try again.
              </p>
              <button
                type="button"
                onClick={handleResendFromPopup}
                disabled={resendStatus === 'sending'}
                className="mt-4 w-full rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {resendStatus === 'sending' ? 'Sending...' : 'Resend verification email'}
              </button>
              {resendStatus === 'sent' && <p className="mt-2 text-sm text-green-700">Verification email sent — check your inbox.</p>}
              {resendStatus === 'error' && (
                <p className="mt-2 text-sm text-red-700">Couldn't send the email — please wait a bit and try again.</p>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
