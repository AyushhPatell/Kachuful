import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import PlayerAvatar from '../components/game/PlayerAvatar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useJoinRequests } from '../hooks/useJoinRequests.js'
import {
  acceptJoinRequest,
  checkAndExpireLobby,
  hasPendingJoinRequest,
  isAcceptedPlayer,
  rejectJoinRequest,
  startGame,
  subscribeToMyJoinRequest,
  subscribeToPlayers,
  subscribeToSession,
} from '../firebase/sessions.js'
import { MAX_PLAYERS, MIN_PLAYERS } from '../constants/game.js'
import { unlockAudio } from '../lib/sounds.js'

function SessionCodeDisplay({ code }) {
  const [copied, setCopied] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  async function handleCopy() {
    let success = false
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(code)
        success = true
      } catch {
        // Clipboard API blocked (iOS Safari, etc.)
      }
    }
    if (!success) {
      // Fallback: select the hidden input so user can copy manually
      setShowFallback(true)
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl px-5 py-4"
      style={{
        background: 'rgba(201,150,58,0.1)',
        border: '1px solid rgba(201,150,58,0.25)',
      }}
    >
      <div className="flex items-center justify-center gap-4">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-amber-500/70">Session Code</p>
          <p
            className="font-mono text-4xl font-bold tracking-[0.28em] text-amber-300"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {code}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition-all hover:text-white"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>

      {/* Fallback selectable input for browsers that block clipboard API */}
      {showFallback && (
        <div className="flex flex-col gap-1.5">
          <p className="text-center text-[10px] text-zinc-500">
            Tap and hold to copy the code manually:
          </p>
          <input
            readOnly
            value={code}
            onFocus={e => e.target.select()}
            className="w-full rounded-lg bg-black/40 px-3 py-2 text-center font-mono text-lg font-bold tracking-widest text-amber-300 outline-none"
            style={{ border: '1px solid rgba(201,150,58,0.3)' }}
          />
          <button
            onClick={() => setShowFallback(false)}
            className="text-center text-[10px] text-zinc-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

export default function Lobby() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingFromSubcollection, setPendingFromSubcollection] = useState(false)

  const currentUserId = userId
  const isOwner = session?.ownerId === currentUserId
  const { joinRequests, listenError } = useJoinRequests(code, session, isOwner)

  useEffect(() => {
    const unsubSession = subscribeToSession(code, setSession)
    const unsubPlayers = subscribeToPlayers(code, setPlayers)
    return () => { unsubSession(); unsubPlayers() }
  }, [code])

  // Expire idle lobbies on the client side
  useEffect(() => {
    if (!session || session.status !== 'lobby') return undefined
    const expiresAt = session.lobbyExpiresAt
    if (!expiresAt) return undefined
    const msLeft = expiresAt - Date.now()
    if (msLeft <= 0) {
      checkAndExpireLobby(code).catch(() => {})
      return undefined
    }
    const t = setTimeout(() => checkAndExpireLobby(code).catch(() => {}), msLeft)
    return () => clearTimeout(t)
  }, [code, session?.status, session?.lobbyExpiresAt])

  const isPlayer = isAcceptedPlayer(players, currentUserId)
  const pendingJoin = hasPendingJoinRequest(session, currentUserId) || pendingFromSubcollection

  useEffect(() => {
    if (!currentUserId || isPlayer) return undefined
    return subscribeToMyJoinRequest(code, currentUserId, setPendingFromSubcollection)
  }, [code, currentUserId, isPlayer])

  useEffect(() => {
    if (session?.status === 'active' && (isPlayer || pendingJoin)) navigate(`/game/${code}`)
    if (session?.status === 'ended' && isPlayer) navigate(`/leaderboard/${code}`)
  }, [session?.status, isPlayer, pendingJoin, code, navigate])

  const lobbyExpired = session?.status === 'ended' && !session?.currentRound

  async function handleStart() {
    unlockAudio()
    setBusy(true); setError('')
    try { await startGame(code) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function handleAccept(request) {
    try { await acceptJoinRequest(code, request) }
    catch (err) { setError(err.message) }
  }

  async function handleReject(requestUserId) {
    try { await rejectJoinRequest(code, requestUserId) }
    catch (err) { setError(err.message) }
  }

  const activeCount = players.filter(p => p.status !== 'spectator').length
  const canStart = isOwner && activeCount >= MIN_PLAYERS

  return (
    <div
      className="mx-auto flex min-h-svh w-full max-w-lg flex-col gap-4 px-4 pb-8 pt-10 sm:px-6"
      onClick={unlockAudio}
    >
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-2xl font-bold text-amber-300" style={{ fontFamily: 'Cinzel, serif' }}>
          Game Lobby
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500">Share the code with friends to join</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <SessionCodeDisplay code={code} />
      </motion.div>

      {/* Join requests — full width, above players list */}
      {isOwner && joinRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.25)',
          }}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-400">
            Join requests ({joinRequests.length})
          </p>
          <ul className="space-y-2">
            {joinRequests.map(request => (
              <li key={request.userId} className="flex items-center gap-3">
                <PlayerAvatar name={request.name} size="sm" />
                <span className="flex-1 truncate text-sm font-medium text-zinc-200">{request.name}</span>
                <button
                  onClick={() => handleAccept(request)}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #c9963a, #a67828)' }}
                >
                  Accept
                </button>
                <button
                  onClick={() => handleReject(request.userId)}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                  style={{ background: 'rgba(239,68,68,0.8)' }}
                >
                  Reject
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Players list — full width always */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(24,28,23,0.85)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Players</h2>
          <span className="text-xs text-zinc-500">{activeCount}/{MAX_PLAYERS} · need {MIN_PLAYERS}</span>
        </div>
        <ul className="space-y-2">
          {players.map(player => (
            <motion.li
              key={player.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <PlayerAvatar name={player.name} photoURL={player.photoURL} size="sm" />
              <span className="flex-1 truncate text-sm text-zinc-200">{player.name}</span>
              <span className="text-[10px] text-zinc-600">
                {player.id === session?.ownerId ? '👑 Host' : player.status}
              </span>
            </motion.li>
          ))}
          {!players.length && (
            <li className="py-3 text-center text-sm text-zinc-600">
              <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
                Waiting for players…
              </motion.span>
            </li>
          )}
        </ul>
      </div>

      {lobbyExpired && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
          This lobby has expired. Please start a new session.
        </p>
      )}

      {!isOwner && pendingJoin && session?.status === 'lobby' && (
        <p className="rounded-xl bg-white/5 px-4 py-3 text-center text-sm text-zinc-400">
          Waiting for the host to accept your request…
        </p>
      )}

      {listenError && (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-200">
          Join requests may not update live.
        </p>
      )}
      {error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      {isOwner ? (
        <motion.button
          whileTap={canStart ? { scale: 0.97 } : {}}
          disabled={busy || !canStart}
          onClick={handleStart}
          className="w-full rounded-xl py-4 text-sm font-bold transition-all disabled:opacity-40"
          style={{
            background: canStart ? 'linear-gradient(135deg, #c9963a, #a67828)' : 'rgba(255,255,255,0.06)',
            color: canStart ? '#fff' : '#555',
            boxShadow: canStart ? '0 4px 20px rgba(201,150,58,0.3)' : 'none',
            border: canStart ? 'none' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {activeCount < MIN_PLAYERS
            ? `Need ${MIN_PLAYERS - activeCount} more player${MIN_PLAYERS - activeCount !== 1 ? 's' : ''}`
            : busy ? 'Starting…' : 'Start Game →'}
        </motion.button>
      ) : (
        <p className="text-center text-sm text-zinc-500">
          <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
            Waiting for the host to start the game…
          </motion.span>
        </p>
      )}

      <Link to="/" className="block text-center text-sm text-zinc-600 transition-colors hover:text-zinc-400">
        ← Back to menu
      </Link>
    </div>
  )
}
