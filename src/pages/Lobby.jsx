import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout.jsx'
import JoinRequestsPanel from '../components/lobby/JoinRequestsPanel.jsx'
import Button from '../components/ui/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useJoinRequests } from '../hooks/useJoinRequests.js'
import { useLeaveSession } from '../hooks/useLeaveSession.js'
import {
  acceptJoinRequest,
  hasPendingJoinRequest,
  isAcceptedPlayer,
  rejectJoinRequest,
  startGame,
  subscribeToMyJoinRequest,
  subscribeToPlayers,
  subscribeToSession,
} from '../firebase/sessions.js'
import { MAX_PLAYERS, MIN_PLAYERS } from '../constants/game.js'

export default function Lobby() {
  const { code } = useParams()
  const navigate = useNavigate()
  const leaveSession = useLeaveSession(code)
  const { userId } = useAuth()
  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [newRequestPing, setNewRequestPing] = useState(false)
  const [pendingFromSubcollection, setPendingFromSubcollection] = useState(false)

  const currentUserId = userId
  const isOwner = session?.ownerId === currentUserId
  const { joinRequests, listenError } = useJoinRequests(code, session, isOwner)

  useEffect(() => {
    const unsubSession = subscribeToSession(code, setSession)
    const unsubPlayers = subscribeToPlayers(code, setPlayers)
    return () => {
      unsubSession()
      unsubPlayers()
    }
  }, [code])

  const isPlayer = isAcceptedPlayer(players, currentUserId)
  const pendingJoin =
    hasPendingJoinRequest(session, currentUserId) || pendingFromSubcollection

  useEffect(() => {
    if (!currentUserId || isPlayer) return undefined
    return subscribeToMyJoinRequest(code, currentUserId, setPendingFromSubcollection)
  }, [code, currentUserId, isPlayer])

  useEffect(() => {
    if (session?.status === 'active' && (isPlayer || pendingJoin)) {
      navigate(`/game/${code}`)
    }
    if (session?.status === 'ended' && isPlayer) {
      navigate(`/leaderboard/${code}`)
    }
  }, [session?.status, isPlayer, pendingJoin, code, navigate])

  useEffect(() => {
    if (!isOwner || !session?.joinEventAt) return undefined
    setNewRequestPing(true)
    const timer = setTimeout(() => setNewRequestPing(false), 2500)
    return () => clearTimeout(timer)
  }, [isOwner, session?.joinEventAt, joinRequests.length])

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
  const totalInSession = players.length

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

        {isOwner && joinRequests.length > 0 ? (
          <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-center text-sm text-accent">
            {joinRequests.length} player{joinRequests.length === 1 ? '' : 's'} waiting to join — accept or
            reject below.
          </div>
        ) : null}

        <div className={`grid gap-4 ${isOwner ? 'md:grid-cols-2' : ''}`}>
          <section className="rounded-xl border border-border bg-surface-raised p-4">
            <h2 className="mb-1 text-sm font-medium text-muted">Players in session</h2>
            <p className="mb-3 text-xs text-muted">
              {activeCount} playing · {totalInSession}/{MAX_PLAYERS} in room · need {MIN_PLAYERS} to start
            </p>
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

          {isOwner ? (
            <JoinRequestsPanel
              joinRequests={joinRequests}
              newRequestPing={newRequestPing}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ) : null}
        </div>

        {!isOwner && pendingJoin && session?.status === 'lobby' ? (
          <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
            Waiting for the session owner to accept your request…
          </div>
        ) : null}

        {listenError ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Join requests may not update live. Publish Firestore rules for{' '}
            <code className="text-xs">sessions/&#123;code&#125;/joinRequests</code> in Firebase
            Console, then reload.
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

        <button
          type="button"
          className="block w-full text-center text-sm text-muted hover:text-text"
          onClick={leaveSession}
        >
          Back to menu
        </button>
      </div>
    </PageLayout>
  )
}
