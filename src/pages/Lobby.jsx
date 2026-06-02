import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout.jsx'
import Button from '../components/ui/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  acceptJoinRequest,
  rejectJoinRequest,
  startGame,
  subscribeToPlayers,
  subscribeToSession,
} from '../firebase/sessions.js'
import { MIN_PLAYERS } from '../constants/game.js'

export default function Lobby() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const currentUserId = userId
  const isOwner = session?.ownerId === currentUserId

  useEffect(() => {
    const unsubSession = subscribeToSession(code, setSession)
    const unsubPlayers = subscribeToPlayers(code, setPlayers)
    return () => {
      unsubSession()
      unsubPlayers()
    }
  }, [code])

  useEffect(() => {
    if (session?.status === 'active') {
      navigate(`/game/${code}`)
    }
    if (session?.status === 'ended') {
      navigate(`/leaderboard/${code}`)
    }
  }, [session?.status, code, navigate])

  async function handleStart() {
    setBusy(true)
    setError('')
    try {
      await startGame(code)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleAccept(request) {
    try {
      await acceptJoinRequest(code, request)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleReject(requestUserId) {
    try {
      await rejectJoinRequest(code, requestUserId)
    } catch (err) {
      setError(err.message)
    }
  }

  const activeCount = players.filter((p) => p.status !== 'spectator').length
  const joinRequests = session?.joinRequests ?? []
  const showJoinRequests = isOwner && joinRequests.length > 0

  return (
    <PageLayout title="Lobby">
      <div className="mx-auto my-auto w-full max-w-3xl space-y-4">
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-center sm:p-6">
          <p className="text-xs uppercase tracking-widest text-muted">Session code</p>
          <p className="mt-2 break-all font-mono text-3xl font-bold tracking-[0.25em] text-accent sm:text-4xl">
            {code}
          </p>
          <button
            type="button"
            className="mt-3 min-h-11 text-sm text-muted underline-offset-2 hover:text-text hover:underline"
            onClick={() => navigator.clipboard?.writeText(code)}
          >
            Copy code
          </button>
        </div>

        <div className={`grid gap-4 ${showJoinRequests ? 'md:grid-cols-2' : ''}`}>
          <section className="rounded-xl border border-border bg-surface-raised p-4">
            <h2 className="mb-3 text-sm font-medium text-muted">
              Players ({activeCount}/{MIN_PLAYERS}+)
            </h2>
            <ul className="space-y-2">
              {players.map((player) => (
                <li key={player.id} className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
                  <span className="truncate pr-2">{player.name}</span>
                  <span className="text-xs text-muted">
                    {player.id === session?.ownerId ? 'Owner' : player.status}
                  </span>
                </li>
              ))}
              {!players.length ? (
                <li className="rounded-lg bg-surface px-4 py-3 text-sm text-muted">
                  Waiting for players…
                </li>
              ) : null}
            </ul>
          </section>

          {showJoinRequests ? (
            <section className="rounded-xl border border-border bg-surface-raised p-4">
              <h2 className="mb-3 text-sm font-medium text-muted">Join requests</h2>
              <ul className="space-y-2">
                {joinRequests.map((request) => (
                  <li
                    key={request.userId}
                    className="flex flex-col gap-3 rounded-lg bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="truncate">{request.name}</span>
                    <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex">
                      <Button className="min-h-11 px-3 py-2 text-xs" onClick={() => handleAccept(request)}>
                        Accept
                      </Button>
                      <Button
                        variant="danger"
                        className="min-h-11 px-3 py-2 text-xs"
                        onClick={() => handleReject(request.userId)}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {!isOwner && joinRequests.some((r) => r.userId === currentUserId) ? (
          <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
            Waiting for the session owner to accept your request…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {isOwner ? (
          <Button
            className="w-full"
            disabled={busy || activeCount < MIN_PLAYERS}
            onClick={handleStart}
          >
            {activeCount < MIN_PLAYERS
              ? `Need ${MIN_PLAYERS - activeCount} more player(s)`
              : 'Start Game'}
          </Button>
        ) : (
          <p className="text-center text-sm text-muted">Waiting for the owner to start the game…</p>
        )}

        <Link to="/" className="block text-center text-sm text-muted hover:text-text">
          Back to menu
        </Link>
      </div>
    </PageLayout>
  )
}
