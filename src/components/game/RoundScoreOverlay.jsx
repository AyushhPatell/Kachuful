<<<<<<< HEAD
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { calculateRoundPoints } from '../../lib/gameLogic.js'
import { playSound } from '../../lib/sounds.js'

export default function RoundScoreOverlay({
  show,
  players,
=======
import { AnimatePresence, motion } from 'framer-motion'
import PlayerAvatar from './PlayerAvatar.jsx'
import { calculateRoundPoints } from '../../lib/gameLogic.js'

function ScoreRow({ player, isMe }) {
  const points = calculateRoundPoints(player.call ?? 0, player.tricksWon ?? 0)
  const made = player.call === player.tricksWon
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${isMe ? 'ring-1 ring-amber-400/40' : ''}`}
      style={{ background: isMe ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)' }}
    >
      <PlayerAvatar name={player.name} photoURL={player.photoURL} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-zinc-100">{player.name}</p>
        <p className="text-xs text-zinc-500">
          Called {player.call ?? '?'} · Won {player.tricksWon ?? 0}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-lg font-bold ${made ? 'text-emerald-400' : 'text-red-400'}`}>
          {made ? `+${points}` : '0'}
        </p>
        <p className="text-[10px] text-zinc-600">pts this round</p>
      </div>
    </motion.div>
  )
}

export default function RoundScoreOverlay({
  show,
  players = [],
>>>>>>> 6d43acd (Some Improvements)
  currentUserId,
  roundNumber,
  isOwner,
  onNextRound,
  busy,
}) {
<<<<<<< HEAD
  const me = players.find(p => p.id === currentUserId)
  const myPts = me ? calculateRoundPoints(me.call ?? 0, me.tricksWon ?? 0) : 0
  const madCall = me != null && (me.tricksWon ?? 0) >= (me.call ?? 0) && me.call != null

  useEffect(() => {
    if (!show) return
    playSound('roundEnd')
    if (madCall && myPts > 0) {
      setTimeout(() => {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#fbbf24', '#f59e0b', '#10b981', '#ffffff', '#34d399'],
        })
      }, 400)
    }
  }, [show])

  const sorted = [...players].sort((a, b) => {
    const pa = calculateRoundPoints(a.call ?? 0, a.tricksWon ?? 0)
    const pb = calculateRoundPoints(b.call ?? 0, b.tricksWon ?? 0)
    return pb - pa
  })
=======
  const sorted = [...players]
    .filter(p => p.status !== 'spectator')
    .sort((a, b) => (b.sessionScore ?? 0) - (a.sessionScore ?? 0))
>>>>>>> 6d43acd (Some Improvements)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
<<<<<<< HEAD
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="absolute inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(7px)' }}
        >
          <motion.div
            initial={{ scale: 0.88, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-sm overflow-hidden rounded-2xl"
            style={{
              background: 'linear-gradient(160deg, #1c201a, #111410)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(201,150,58,0.14), rgba(201,150,58,0.04))',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400/65">
                Round {roundNumber} Results
              </p>
              <p
                className="mt-1 text-xl font-bold text-amber-300"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {madCall ? '✓ Call Made!' : 'Round Over'}
              </p>
            </div>

            {/* Score rows */}
            <div className="divide-y divide-white/[0.05] px-3 py-1">
              {sorted.map((player, i) => {
                const pts = calculateRoundPoints(player.call ?? 0, player.tricksWon ?? 0)
                const made = (player.tricksWon ?? 0) >= (player.call ?? 0) && player.call != null
                const isMe = player.id === currentUserId

                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 + 0.1 }}
                    className={`flex items-center gap-2 py-2.5 ${
                      isMe ? 'mx-[-4px] rounded-lg px-[4px]' : ''
                    }`}
                    style={isMe ? { background: 'rgba(255,255,255,0.04)' } : {}}
                  >
                    <span className="w-4 text-center text-[10px] text-zinc-600">{i + 1}</span>
                    <span
                      className={`flex-1 truncate text-sm font-medium ${
                        isMe ? 'text-amber-200' : 'text-zinc-200'
                      }`}
                    >
                      {player.name}
                      {isMe && (
                        <span className="ml-1 text-[9px] text-zinc-500">(you)</span>
                      )}
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        made ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {player.tricksWon ?? 0}/{player.call ?? '?'}
                    </span>
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.07 + 0.32, type: 'spring', stiffness: 400 }}
                      className={`w-14 text-right text-sm font-bold ${
                        pts > 0 ? 'text-amber-300' : 'text-zinc-600'
                      }`}
                    >
                      {pts > 0 ? `+${pts}` : '0'}
                    </motion.span>
                  </motion.div>
                )
              })}
            </div>

            {/* CTA */}
            <div className="px-4 pb-4 pt-2">
              {isOwner ? (
=======
          key="round-score-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(4,8,4,0.88)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 24 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
            style={{ background: 'rgba(14,18,14,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="border-b border-white/8 px-5 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/70">Round {roundNumber} Results</p>
              <p className="mt-0.5 text-xl font-bold text-amber-300" style={{ fontFamily: 'Cinzel, serif' }}>Score Board</p>
            </div>
            <div className="space-y-2 p-4">
              {sorted.map(p => (
                <ScoreRow key={p.id} player={p} isMe={p.id === currentUserId} />
              ))}
            </div>
            {isOwner && (
              <div className="border-t border-white/8 px-4 pb-4 pt-3">
>>>>>>> 6d43acd (Some Improvements)
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={busy}
                  onClick={onNextRound}
<<<<<<< HEAD
                  className="w-full rounded-xl py-3 text-sm font-bold text-amber-950 disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                    boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
                  }}
                >
                  Next Round →
                </motion.button>
              ) : (
                <p className="rounded-xl bg-white/5 py-3 text-center text-xs text-zinc-400">
                  Waiting for host…
                </p>
              )}
            </div>
=======
                  className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #c9963a, #a67828)', boxShadow: '0 4px 20px rgba(201,150,58,0.3)' }}
                >
                  {busy ? 'Starting…' : 'Next Round →'}
                </motion.button>
              </div>
            )}
            {!isOwner && (
              <p className="pb-5 text-center text-xs text-zinc-600">
                <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                  Waiting for host to continue…
                </motion.span>
              </p>
            )}
>>>>>>> 6d43acd (Some Improvements)
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
