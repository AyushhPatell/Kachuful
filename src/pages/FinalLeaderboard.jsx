import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import PlayerAvatar from '../components/game/PlayerAvatar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  fetchSessionRounds,
  initiateRematch,
  requestJoinSession,
  subscribeToPlayers,
  subscribeToSession,
} from '../firebase/sessions.js'
import { computePlayerTitles, getCardsPerRound, rankPlayers } from '../lib/gameLogic.js'
import { shareResult } from '../lib/shareCard.js'
import { playSound } from '../lib/sounds.js'

export default function FinalLeaderboard() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { userId, displayName } = useAuth()
  const [players, setPlayers] = useState([])
  const [session, setSession] = useState(null)
  const [rounds, setRounds] = useState([])
  const [rematchBusy, setRematchBusy] = useState(false)
  const [shareState, setShareState] = useState('idle') // idle | busy | downloaded

  useEffect(() => {
    const unsubSession = subscribeToSession(code, setSession)
    const unsubPlayers = subscribeToPlayers(code, setPlayers)
    return () => { unsubSession(); unsubPlayers() }
  }, [code])

  useEffect(() => {
    fetchSessionRounds(code).then(setRounds).catch(() => {})
  }, [code])

  async function handlePlayAgain() {
    setRematchBusy(true)
    try {
      const newCode = await initiateRematch(code, displayName)
      navigate(`/lobby/${newCode}`)
    } catch (err) {
      console.error(err)
      setRematchBusy(false)
    }
  }

  async function handleJoinRematch() {
    setRematchBusy(true)
    try {
      await requestJoinSession(session.rematchCode, displayName)
      navigate(`/lobby/${session.rematchCode}`)
    } catch (err) {
      console.error(err)
      setRematchBusy(false)
    }
  }

  const ranked = rankPlayers(players.filter(p => p.status !== 'spectator'))
  const winner = ranked[0]
  const isWinner = winner?.id === userId
  // Only the original host may start the rematch — createSession makes the
  // creator the owner, so if anyone else clicked first they'd hijack ownership.
  const isOwner = session?.ownerId === userId

  // Earned epithets (Sharpshooter, Daredevil, …) + gold/silver/bronze frames.
  const titles = computePlayerTitles(ranked, rounds)
  const rankRing = (rank) =>
    rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b87333' : null

  async function handleShare() {
    setShareState('busy')
    try {
      const result = await shareResult({
        players: ranked.map((p) => ({
          name: p.name,
          score: p.sessionScore ?? 0,
          rank: p.rank,
          isMe: p.id === userId,
          title: titles[p.id] ?? null,
        })),
        totalRounds: rounds.length || session?.currentRound || 0,
        dateLabel: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      })
      setShareState(result === 'downloaded' ? 'downloaded' : 'idle')
    } catch (err) {
      console.error(err)
      setShareState('idle')
    }
  }

  useEffect(() => {
    if (!ranked.length) return
    playSound('roundEnd')
    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#fbbf24', '#f59e0b', '#10b981', '#ffffff', '#34d399', '#60a5fa'],
      })
    }, 300)
  }, [ranked.length > 0])

  // Check if any tie exists (same sessionScore, same roundsFailed)
  const hasTies = ranked.some((p, i) => i > 0 && p.rank === ranked[i - 1].rank)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col items-center gap-5 px-4 pb-10 pt-10 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-[11px] uppercase tracking-[0.25em] text-amber-500/65">Game Over</p>
        <h1
          className="mt-1 text-3xl font-bold text-amber-300 sm:text-4xl"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Final Standings
        </h1>
        {isWinner && (
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="mt-2 text-sm text-emerald-400"
          >
            🏆 You won!
          </motion.p>
        )}
      </motion.div>

      {/* Podium — top 3 */}
      {ranked.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex w-full items-end justify-center gap-3"
        >
          <PodiumSlot player={ranked[1]} rank={2} delay={0.25} userId={userId} />
          <PodiumSlot player={ranked[0]} rank={1} delay={0.1} userId={userId} />
          <PodiumSlot player={ranked[2]} rank={3} delay={0.35} userId={userId} />
        </motion.div>
      )}

      {/* Full rankings */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full overflow-hidden rounded-2xl"
        style={{
          background: 'rgba(24,28,23,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="border-b border-white/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">All Players</p>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-1.5">
          <span className="w-5" />
          <span className="flex-1" />
          <span className="w-14 text-right text-[10px] text-zinc-600">Score</span>
          <span className="w-14 text-right text-[10px] text-zinc-600">Failed</span>
        </div>

        {ranked.map((player, i) => {
          const isMe = player.id === userId
          const isTied = ranked.some((p, j) => j !== i && p.rank === player.rank)

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.06 }}
              className={`flex items-center gap-3 px-4 py-3 ${
                i < ranked.length - 1 ? 'border-b border-white/5' : ''
              } ${isMe ? 'bg-amber-500/8' : ''}`}
            >
              <span
                className="w-5 text-center text-sm font-bold"
                style={{ color: player.rank === 1 ? '#fbbf24' : player.rank === 2 ? '#94a3b8' : player.rank === 3 ? '#b87333' : '#555' }}
              >
                {player.rank}
              </span>
              <PlayerAvatar name={player.name} photoURL={player.photoURL} size="sm" ringColor={rankRing(player.rank)} />
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm font-medium ${isMe ? 'text-amber-200' : 'text-zinc-200'}`}>
                  {player.name}
                  {isMe && <span className="ml-1 text-[10px] text-zinc-500">(you)</span>}
                  {isTied && (
                    <span className="ml-1.5 rounded bg-zinc-800 px-1 py-0.5 text-[9px] text-zinc-500">
                      tie
                    </span>
                  )}
                </div>
                {titles[player.id] && (
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-1.5 py-0.5 text-[9px] font-medium text-amber-200/90">
                    <span>{titles[player.id].emoji}</span>
                    <span>{titles[player.id].label}</span>
                  </span>
                )}
              </div>
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.06, type: 'spring' }}
                className={`w-14 text-right text-sm font-bold ${player.rank === 1 ? 'text-amber-300' : 'text-zinc-300'}`}
              >
                {player.sessionScore ?? 0}
              </motion.span>
              <span className="w-14 text-right text-xs text-zinc-600">
                {player.roundsFailed ?? 0} ✗
              </span>
            </motion.div>
          )
        })}
        {!ranked.length && (
          <p className="px-4 py-6 text-center text-sm text-zinc-600">Loading results…</p>
        )}
      </motion.div>

      {/* Round-by-round breakdown — lets players verify how every score was reached */}
      {rounds.length > 0 && ranked.length > 0 && (
        <RoundBreakdown
          rounds={rounds}
          players={ranked}
          userId={userId}
          maxRound={session?.maxRound ?? 8}
        />
      )}

      {/* Tie-break note */}
      {hasTies && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-[11px] text-zinc-600"
        >
          Ties broken by fewer failed rounds (✗)
        </motion.p>
      )}

      {/* Session code */}
      <p className="text-xs text-zinc-600">
        Session: <span className="font-mono text-zinc-500">{code}</span>
      </p>

      {session?.rematchCode && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-xs text-emerald-400"
        >
          A rematch lobby is ready — jump back in!
        </motion.p>
      )}

      {/* Share result */}
      {ranked.length > 0 && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={shareState === 'busy'}
          onClick={handleShare}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-amber-200 disabled:opacity-50"
          style={{ background: 'rgba(201,150,58,0.12)', border: '1px solid rgba(201,150,58,0.35)' }}
        >
          <span className="text-base">📤</span>
          {shareState === 'busy'
            ? 'Preparing…'
            : shareState === 'downloaded'
            ? 'Saved! Share the image 🎉'
            : 'Share result'}
        </motion.button>
      )}

      {/* CTAs */}
      <div className="flex w-full gap-3">
        <Link to="/" className="flex-1">
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-zinc-200"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Back to Home
          </motion.button>
        </Link>
        {session?.rematchCode ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={rematchBusy}
            onClick={handleJoinRematch}
            className="flex-1 rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #c9963a, #a67828)',
              boxShadow: '0 4px 20px rgba(201,150,58,0.3)',
            }}
          >
            {rematchBusy ? 'One sec…' : 'Join Rematch →'}
          </motion.button>
        ) : isOwner ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={rematchBusy}
            onClick={handlePlayAgain}
            className="flex-1 rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #c9963a, #a67828)',
              boxShadow: '0 4px 20px rgba(201,150,58,0.3)',
            }}
          >
            {rematchBusy ? 'One sec…' : 'Play Again →'}
          </motion.button>
        ) : (
          <div
            className="flex-1 rounded-xl py-3.5 text-center text-sm font-semibold text-zinc-400"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Waiting for host…
          </div>
        )}
      </div>
    </div>
  )
}

function PodiumSlot({ player, rank, delay, userId }) {
  const isMe = player?.id === userId
  const heights = { 1: 'h-20', 2: 'h-14', 3: 'h-10' }
  const colors = {
    1: 'linear-gradient(135deg, #fbbf24, #d97706)',
    2: 'linear-gradient(135deg, #94a3b8, #64748b)',
    3: 'linear-gradient(135deg, #b87333, #8b5a2b)',
  }
  const labels = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 24 }}
      className="flex flex-1 flex-col items-center gap-1.5"
    >
      <PlayerAvatar
        name={player.name}
        photoURL={player.photoURL}
        size={rank === 1 ? 'lg' : 'md'}
        ringColor={rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : '#b87333'}
      />
      <p className={`max-w-[70px] truncate text-center text-[11px] font-semibold ${isMe ? 'text-amber-200' : 'text-zinc-300'}`}>
        {player.name}
      </p>
      <p className="text-xs font-bold text-amber-300">{player.sessionScore ?? 0} pts</p>
      <div
        className={`w-full ${heights[rank]} flex items-center justify-center rounded-t-lg text-lg`}
        style={{ background: colors[rank] }}
      >
        {labels[rank]}
      </div>
    </motion.div>
  )
}

function RoundBreakdown({ rounds, players, userId, maxRound }) {
  // Cumulative total per player — should match each player's final score,
  // which is the whole point: players can audit every round's contribution.
  const totals = {}
  players.forEach((p) => { totals[p.id] = 0 })
  rounds.forEach((r) => {
    players.forEach((p) => { totals[p.id] += r.results[p.id]?.points ?? 0 })
  })

  const cellBg = 'rgba(24,28,23,0.95)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="w-full overflow-hidden rounded-2xl"
      style={{ background: 'rgba(24,28,23,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="border-b border-white/5 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Round-by-round</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">Each cell: points · called/won. Totals match the final scores above.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 px-2 py-2 text-left text-[10px] font-medium text-zinc-500"
                style={{ background: cellBg }}
              >
                Rd
              </th>
              {players.map((p) => {
                const isMe = p.id === userId
                return (
                  <th key={p.id} className="px-1 py-2 align-bottom" style={{ minWidth: 50 }}>
                    <div className="flex flex-col items-center gap-1">
                      <PlayerAvatar name={p.name} photoURL={p.photoURL} size="sm" />
                      <span className={`max-w-[48px] truncate text-[9px] font-medium ${isMe ? 'text-amber-200' : 'text-zinc-400'}`}>
                        {isMe ? 'You' : p.name}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => {
              const cards = getCardsPerRound(r.roundNumber, maxRound)
              return (
                <tr key={r.roundNumber} className="border-t border-white/5">
                  <td
                    className="sticky left-0 z-10 px-2 py-1.5 text-left"
                    style={{ background: cellBg }}
                  >
                    <span className="text-[11px] font-semibold text-zinc-300">R{r.roundNumber}</span>
                    <span className="ml-1 text-[8px] text-zinc-600">{cards}c</span>
                  </td>
                  {players.map((p) => {
                    const res = r.results[p.id]
                    if (!res) {
                      return <td key={p.id} className="px-1 py-1.5 text-[10px] text-zinc-700">–</td>
                    }
                    return (
                      <td key={p.id} className="px-1 py-1.5">
                        <div className={`text-[11px] font-bold leading-tight ${res.points > 0 ? 'text-amber-300' : 'text-zinc-600'}`}>
                          {res.points > 0 ? `+${res.points}` : '0'}
                        </div>
                        <div className="text-[8px] leading-tight text-zinc-500">{res.call}/{res.won}</div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-white/10">
              <td
                className="sticky left-0 z-10 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
                style={{ background: cellBg }}
              >
                Total
              </td>
              {players.map((p) => {
                const isMe = p.id === userId
                return (
                  <td key={p.id} className={`px-1 py-2 text-[13px] font-bold ${isMe ? 'text-amber-200' : 'text-zinc-200'}`}>
                    {totals[p.id]}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </motion.div>
  )
}
