import { useEffect, useMemo, useState } from 'react'
import SearchBar from './components/SearchBar.jsx'
import RestaurantCard from './components/RestaurantCard.jsx'
import VotingPanel from './components/VotingPanel.jsx'
import SpinWheel from './components/SpinWheel.jsx'
import { sanitizeNote } from './constants.js'
import './App.css'

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '')
const RESULT_LIMIT = 8
const INITIAL_VISIBLE_RESULTS = 4

function normalizeStoredPick(pick) {
  if (!pick || typeof pick !== 'object') return null
  const nameSources = [pick.name, pick.yelp?.name, pick.label]
  const resolvedName = nameSources
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .find((value) => value.length > 0)

  if (!resolvedName) return null

  const votes = Number.isFinite(pick.votes) ? pick.votes : 0
  return {
    ...pick,
    name: resolvedName,
    votes,
    note: sanitizeNote(pick.note),
  }
}

export default function App() {
  const roomId = useMemo(() => {
    if (typeof window === 'undefined') return 'demo'
    const params = new URLSearchParams(window.location.search)
    return params.get('room') || 'demo'
  }, [])

  const storageKey = `dishide:picks:${roomId}`

  const [picks, setPicks] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const cached = window.localStorage.getItem(storageKey)
      if (!cached) return []
      const parsed = JSON.parse(cached)
      if (!Array.isArray(parsed)) return []
      return parsed
        .map((pick) => normalizeStoredPick(pick))
        .filter(Boolean)
    } catch {
      return []
    }
  })
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [spinWinnerId, setSpinWinnerId] = useState(null)
  const [votesLocked, setVotesLocked] = useState(false)
  const [voteAnnouncementVisible, setVoteAnnouncementVisible] = useState(false)
  const [voteConfettiSeed, setVoteConfettiSeed] = useState(0)
  const [showAllResults, setShowAllResults] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(picks))
  }, [storageKey, picks])

  const handleSearch = async ({ term, location }) => {
    try {
      setSearching(true)
      setStatus('Summoning Yelp magic...')
      setError('')
      setShowAllResults(false)

      const params = new URLSearchParams({
        term,
        location,
        limit: String(RESULT_LIMIT),
      })

      const response = await fetch(`${API_BASE}/yelp?${params.toString()}`)
      let payload = null

      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      if (!response.ok) {
        const message =
          (payload && (payload.error || payload.message)) ||
          `Yelp search failed${response.status ? ` (status ${response.status})` : ''}`
        throw new Error(message)
      }

      const results = Array.isArray(payload?.results) ? payload.results : []
      const foundCount = results.length
      setSearchResults(results)
      setStatus(`Feast alert: ${foundCount} ${foundCount === 1 ? 'spot' : 'spots'} ready`)
    } catch (err) {
      setSearchResults([])
      setError(err?.message ?? 'Yelp search failed')
    } finally {
      setSearching(false)
      setTimeout(() => setStatus(''), 1500)
    }
  }

  const handleAddPick = (business, note) => {
    setVotesLocked(false)
    setVoteAnnouncementVisible(false)
    setSpinWinnerId(null)
    setPicks((current) => {
      if (current.some((pick) => pick.yelp?.id === business.id)) {
        setError('That restaurant is already in this room')
        return current
      }

      const safeNote = sanitizeNote(note)

      const next = [
        ...current,
        {
          id: `${business.id}-${Date.now()}`,
          name: business.name,
          note: safeNote,
          votes: 0,
          yelp: business,
        },
      ]

      setStatus(`${business.name} crashed the party in room ${roomId}`)
      return next
    })
  }

  const handleVote = (pickId) => {
    if (votesLocked) return
    setSpinWinnerId(null)
    setPicks((current) =>
      current.map((pick) =>
        pick.id === pickId ? { ...pick, votes: pick.votes + 1 } : pick
      )
    )
  }

  const handleResetPicks = () => {
    if (picks.length === 0) return
    setPicks([])
    setSpinWinnerId(null)
    setVotesLocked(false)
    setVoteAnnouncementVisible(false)
    setVoteConfettiSeed(0)
    setStatus('Pick list cleared. Add fresh contenders!')
    setError('')
  }

  const topVotes = picks.reduce((max, pick) => Math.max(max, pick.votes), 0)
  const leaders = picks.filter((pick) => pick.votes === topVotes && topVotes > 0)
  const hasTie = leaders.length > 1
  const spinResolvedWinner = spinWinnerId
    ? picks.find((pick) => pick.id === spinWinnerId) ?? null
    : null
  const hasUnresolvedTie = hasTie && spinResolvedWinner === null

  const winnerPick = spinResolvedWinner ?? leaders[0] ?? null

  const handleLockVotes = () => {
    if (picks.length === 0) return

    setVotesLocked(true)
    setSpinWinnerId(null)
    setError('')

    const top = picks.reduce((max, pick) => Math.max(max, pick.votes), 0)
    const currentLeaders = picks.filter((pick) => pick.votes === top && top > 0)

    if (currentLeaders.length === 0) {
      setVoteAnnouncementVisible(false)
      setStatus('Votes locked, but no votes were cast yet.')
    } else if (currentLeaders.length === 1) {
      setVoteAnnouncementVisible(true)
      setVoteConfettiSeed((seed) => seed + 1)
      setStatus(`${currentLeaders[0].name} takes the crown!`)
    } else {
      setVoteAnnouncementVisible(false)
      setStatus('Votes locked—time for a tie breaker!')
    }
  }

  const handleSpinResolve = (winnerId) => {
    setSpinWinnerId(winnerId)
    const winner = picks.find((pick) => pick.id === winnerId)
    if (winner) {
      setStatus(`${winner.name} takes the crown!`)
      setVoteAnnouncementVisible(true)
      setVoteConfettiSeed((seed) => seed + 1)
    }
  }

  useEffect(() => {
    if (!votesLocked) {
      setVoteAnnouncementVisible(false)
    }
  }, [votesLocked])

  useEffect(() => {
    if (!voteAnnouncementVisible) return
    const timeout = setTimeout(() => {
      setVoteAnnouncementVisible(false)
    }, 3200)

    return () => {
      clearTimeout(timeout)
    }
  }, [voteAnnouncementVisible])

  const displayedResults = showAllResults
    ? searchResults
    : searchResults.slice(0, INITIAL_VISIBLE_RESULTS)
  const canShowMore = !showAllResults && searchResults.length > INITIAL_VISIBLE_RESULTS
  const showVoteWinnerAnnouncement =
    voteAnnouncementVisible && Boolean(winnerPick) && !hasUnresolvedTie
  const voteWinnerName = winnerPick?.name ?? ''

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Room {roomId}</p>
          <h1>dishide</h1>
          <p className="lede">Hunt tasty spots, drop your hot takes, rally votes, and let the wheel settle the debate.</p>
        </div>
      </header>

      <SearchBar onSearch={handleSearch} loading={searching} />

      {status && <p className="status success">{status}</p>}
      {error && <p className="status error">{error}</p>}

      <section className="results">
        <header>
          <h2>Fresh from Yelp</h2>
          <p>
            {searchResults.length === 0
              ? 'Fire up a search to load the menu of contenders'
              : `${searchResults.length} tasty ${searchResults.length === 1 ? 'find' : 'finds'}`}
          </p>
        </header>

        <div className="card-grid">
          {displayedResults.map((business) => (
            <RestaurantCard
              key={business.id}
              business={business}
              onAddPick={handleAddPick}
              disabled={searching}
              alreadyPicked={picks.some((pick) => pick.yelp?.id === business.id)}
            />
          ))}
        </div>

        {canShowMore && (
          <div className="results__more">
            <button type="button" onClick={() => setShowAllResults(true)}>
              Bring on more spots
            </button>
          </div>
        )}

        {!searching && searchResults.length === 0 && (
          <p className="empty">Try “Joe's Pizza”, “Din Tai Fung”, or “Shake Shack” to get the flavor party started.</p>
        )}
      </section>

      <VotingPanel
        picks={picks}
        onVote={handleVote}
        onReset={handleResetPicks}
        votesLocked={votesLocked}
        onLockVotes={handleLockVotes}
        resultDetails={{
          showWinner: votesLocked && Boolean(winnerPick) && !hasUnresolvedTie,
          winnerPick,
          showCelebration: voteAnnouncementVisible && Boolean(winnerPick) && !hasUnresolvedTie,
          confettiSeed: voteConfettiSeed,
          showTie: votesLocked && hasUnresolvedTie,
          tiePicks: leaders,
          showNoVotes: votesLocked && topVotes === 0,
        }}
      />

      {votesLocked && hasTie && (
        <SpinWheel picks={leaders} onResolve={handleSpinResolve} />
      )}

      {showVoteWinnerAnnouncement && (
        <div className="spin-wheel__announcement-layer">
          <div
            className="spin-wheel__announcement is-celebrating"
            role="status"
            aria-live="assertive"
          >
            <strong>{voteWinnerName}</strong>
            <p>Winner</p>
          </div>
        </div>
      )}
    </div>
  )
}
