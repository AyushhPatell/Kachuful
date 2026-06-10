import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchSessionHistory } from '../firebase/sessions.js'
import PlayerAvatar from '../components/game/PlayerAvatar.jsx'

const HISTORY_LIMIT = 4

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }
const RANK_COLORS = { 1: '#fbbf24', 2: '#94a3b8', 3: '#b87333' }

export default function History() {
  const { userId } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    fetchSessionHistory(userId)
      .then(data => setSessions(data.slice(0, HISTORY_LIMIT)))
      .finally(() => setLoading(false))
  }, [userId])

  if (!userId) {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-zinc-500">Sign in to view your session history.</p>
        <Link to="/" className="text-sm text-amber-400 underline">Back to Menu</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col gap-5 px-4 pb-10 pt-10 sm:px-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-amber-500/65">Your Games</p>
        <h1 className="mt-1 text-2xl font-bold text-amber-300" style={{ fontFamily: 'Cinzel, serif' }}>
          Session History
        </h1>
      </motion.div>

      {loading && (
        <div className="flex justify-center py-10">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="text-sm text-zinc-500"
          >
            Loading…
          </motion.div>
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div
          className="rounded-2xl px-5 py-8 text-center"
          style={{ background: 'rgba(24,28,23,0.85)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-2xl">🃏</p>
          <p className="mt-2 text-sm font-medium text-zinc-400">No completed sessions yet.</p>
          <p className="mt-1 text-xs text-zinc-600">Finish a game and your stats will show up here.</p>
        </div>
      )}

      {!loading && sessions.map((session, si) => (
        <SessionCard key={session.sessionCode} session={session} myId={userId} index={si} />
      ))}

      <Link to="/" className="block text-center text-sm text-zinc-600 transition-colors hover:text-zinc-400">
        ← Back to Menu
      </Link>
    </div>
  )
}

function SessionCard({ session, myId, index }) {
  const [expanded, setExpanded] = useState(false)
  const me = session.players?.find(p => p.id === myId)
  const players = session.players ?? []
  const topThree = players.slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="overflow-hidden rounded-2xl"
      style={{
        background: 'rgba(24,28,23,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Card header */}
      <button
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => setExpanded(x => !x)}
      >
        {/* My rank badge */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
          style={{
            background: me?.rank === 1 ? 'linear-gradient(135deg,#fbbf24,#d97706)' : 'rgba(255,255,255,0.07)',
            border: me?.rank === 1 ? 'none' : '1px solid rgba(255,255,255,0.1)',
            color: me?.rank === 1 ? '#1a0e00' : (RANK_COLORS[me?.rank] ?? '#666'),
            fontWeight: 700,
            fontSize: me?.rank <= 3 ? '1.1rem' : '0.85rem',
          }}
        >
          {me?.rank ? (MEDAL[me.rank] ?? `#${me.rank}`) : '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium text-amber-400/80">{session.sessionCode}</span>
            <span className="text-[10px] text-zinc-600">{session.totalRounds} rounds</span>
          </div>
          <p className="text-[11px] text-zinc-500">{timeAgo(session.endedAt)}</p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-amber-300">{me?.sessionScore ?? 0} pts</p>
          {me?.rank && (
            <p className="text-[10px] text-zinc-600">
              Rank {me.rank} of {players.length}
            </p>
          )}
        </div>

        <span className="ml-1 text-zinc-600 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Podium preview */}
      {!expanded && (
        <div className="flex items-center gap-1.5 border-t border-white/[0.04] px-4 py-2">
          {topThree.map(p => (
            <div key={p.id} className="flex items-center gap-1">
              <span className="text-[10px]">{MEDAL[p.rank] ?? ''}</span>
              <span className={`text-[11px] font-medium ${p.id === myId ? 'text-amber-300' : 'text-zinc-400'}`}>
                {p.name.split(' ')[0]}
              </span>
              <span className="text-[10px] text-zinc-600">{p.sessionScore}</span>
            </div>
          ))}
        </div>
      )}

      {/* Expanded full rankings */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.05]">
              {/* Column headers */}
              <div className="flex items-center gap-2 px-4 py-1.5">
                <span className="w-5" />
                <span className="flex-1 text-[10px] text-zinc-600">Player</span>
                <span className="w-12 text-right text-[10px] text-zinc-600">Score</span>
                <span className="w-10 text-right text-[10px] text-zinc-600">Failed</span>
              </div>
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-4 py-2 ${
                    i < players.length - 1 ? 'border-b border-white/[0.04]' : ''
                  } ${p.id === myId ? 'bg-amber-500/6' : ''}`}
                >
                  <span
                    className="w-5 text-center text-[11px] font-bold"
                    style={{ color: RANK_COLORS[p.rank] ?? '#555' }}
                  >
                    {MEDAL[p.rank] ?? p.rank}
                  </span>
                  <PlayerAvatar name={p.name} photoURL={p.photoURL} size="sm" />
                  <span className={`flex-1 truncate text-sm ${p.id === myId ? 'font-semibold text-amber-200' : 'text-zinc-300'}`}>
                    {p.name}
                    {p.id === myId && <span className="ml-1 text-[9px] text-zinc-500">(you)</span>}
                  </span>
                  <span className={`w-12 text-right text-sm font-bold ${p.rank === 1 ? 'text-amber-300' : 'text-zinc-300'}`}>
                    {p.sessionScore}
                  </span>
                  <span className="w-10 text-right text-xs text-zinc-600">
                    {p.roundsFailed} ✗
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

