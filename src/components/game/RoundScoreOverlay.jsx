import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateRoundPoints } from '../../lib/gameLogic.js'
import { isPlayerOffline, initiateEndVote, castVote, cancelEndVote, endSessionNow } from '../../firebase/sessions.js'
import { playSound } from '../../lib/sounds.js'
import GameMenu from './GameMenu.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'

export default function RoundScoreOverlay({
  show,
  players,
  currentUserId,
  roundNumber,
  isOwner,
  onNextRound,
  onKickPlayer,
  onLeave,
  sessionCode,
  busy,
  round,
}) {
  const navigate = useNavigate()
  const [endBusy, setEndBusy] = useState(false)
  const [voteBusy, setVoteBusy] = useState(false)
  const [myVote, setMyVote] = useState(null)

  const me = players?.find(p => p.id === currentUserId)
  const myPts = me ? calculateRoundPoints(me.call ?? 0, me.tricksWon ?? 0) : 0
  const madCall = me != null && (me.tricksWon ?? 0) >= (me.call ?? 0) && me.call != null

  const endVoteActive = round?.endVoteActive === true
  const votes = round?.votes ?? {}
  const activePlayers = players?.filter(p => p.status === 'active') ?? []
  const endVoteCount = Object.values(votes).filter(v => v === 'end').length
  const continueVoteCount = Object.values(votes).filter(v => v === 'continue').length
  const totalVoters = activePlayers.length
  const majority = Math.ceil(totalVoters / 2)
  const votePassed = endVoteCount >= majority
  const voteFailed = continueVoteCount > totalVoters - majority

  // Offline players (for host kick UI)
  const offlinePlayers = players?.filter(p =>
    p.id !== currentUserId &&
    (p.status === 'disconnected' || isPlayerOffline(p))
  ) ?? []

  useEffect(() => {
    if (!show) return
    playSound('roundEnd')
  }, [show])

  // Reset local vote state when overlay is re-shown for a new round
  useEffect(() => {
    if (show) setMyVote(null)
  }, [show, roundNumber])

  // When vote passes, host ends session
  useEffect(() => {
    if (votePassed && isOwner && !endBusy) {
      setEndBusy(true)
      endSessionNow(sessionCode)
        .then(() => navigate(`/leaderboard/${sessionCode}`))
        .catch(() => setEndBusy(false))
    }
  }, [votePassed, isOwner])

  const sorted = [...(players ?? [])].sort((a, b) => {
    const pa = calculateRoundPoints(a.call ?? 0, a.tricksWon ?? 0)
    const pb = calculateRoundPoints(b.call ?? 0, b.tricksWon ?? 0)
    return pb - pa
  })

  async function handleInitiateVote() {
    setEndBusy(true)
    try { await initiateEndVote(sessionCode, roundNumber) }
    catch (err) { console.error(err) }
    finally { setEndBusy(false) }
  }

  async function handleCancelVote() {
    setEndBusy(true)
    try { await cancelEndVote(sessionCode, roundNumber) }
    catch (err) { console.error(err) }
    finally { setEndBusy(false) }
  }

  async function handleCastVote(vote) {
    setVoteBusy(true)
    setMyVote(vote)
    try { await castVote(sessionCode, roundNumber, currentUserId, vote) }
    catch (err) { setMyVote(null); console.error(err) }
    finally { setVoteBusy(false) }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-4"
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
              maxHeight: 'calc(100svh - 24px)',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div
              className="relative px-5 py-4 text-center"
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
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <GameMenu sessionCode={sessionCode} onLeave={onLeave} />
              </div>
            </div>

            {/* Score rows */}
            <div className="divide-y divide-white/[0.05] px-3 py-1">
              {sorted.map((player, i) => {
                const pts = calculateRoundPoints(player.call ?? 0, player.tricksWon ?? 0)
                const made = (player.tricksWon ?? 0) >= (player.call ?? 0) && player.call != null
                const isMe = player.id === currentUserId
                const offline = isPlayerOffline(player) || player.status === 'disconnected'

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
                    <PlayerAvatar name={player.name} photoURL={player.photoURL} size="sm" />
                    <span
                      className={`flex-1 truncate text-sm font-medium ${
                        offline ? 'text-zinc-600' : isMe ? 'text-amber-200' : 'text-zinc-200'
                      }`}
                    >
                      {player.name}
                      {isMe && <span className="ml-1 text-[9px] text-zinc-500">(you)</span>}
                      {offline && <span className="ml-1 text-[9px] text-red-500">offline</span>}
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
                      className={`w-12 text-right text-sm font-bold ${
                        pts > 0 ? 'text-amber-300' : 'text-zinc-600'
                      }`}
                    >
                      {pts > 0 ? `+${pts}` : '0'}
                    </motion.span>
                  </motion.div>
                )
              })}
            </div>

            {/* Offline players — host can kick */}
            {isOwner && offlinePlayers.length > 0 && (
              <div
                className="mx-3 mb-2 rounded-xl px-3 py-2.5"
                style={{
                  background: 'rgba(239,68,68,0.07)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                  Offline players
                </p>
                <div className="flex flex-col gap-1.5">
                  {offlinePlayers.map(p => (
                    <div key={p.id} className="flex items-center gap-2">
                      <PlayerAvatar name={p.name} photoURL={p.photoURL} size="sm" />
                      <span className="flex-1 truncate text-xs text-zinc-400">{p.name}</span>
                      <button
                        onClick={() => onKickPlayer?.(p.id)}
                        disabled={busy}
                        className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-40"
                        style={{ background: 'rgba(239,68,68,0.75)' }}
                      >
                        Kick
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vote to end — active state */}
            {endVoteActive && (
              <div
                className="mx-3 mb-2 rounded-xl px-3 py-2.5"
                style={{
                  background: 'rgba(245,158,11,0.07)',
                  border: '1px solid rgba(245,158,11,0.25)',
                }}
              >
                <p className="mb-1 text-center text-[11px] font-semibold text-amber-300">
                  {isOwner ? 'Waiting for votes…' : 'Host wants to end the game'}
                </p>
                <p className="mb-2.5 text-center text-[10px] text-zinc-500">
                  {endVoteCount} end · {continueVoteCount} continue · {totalVoters - endVoteCount - continueVoteCount} waiting
                </p>

                {!isOwner && !myVote && (
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      disabled={voteBusy}
                      onClick={() => handleCastVote('end')}
                      className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, #c9963a, #a67828)' }}
                    >
                      End Game
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      disabled={voteBusy}
                      onClick={() => handleCastVote('continue')}
                      className="flex-1 rounded-xl py-2.5 text-xs font-bold text-zinc-200 disabled:opacity-40"
                      style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)' }}
                    >
                      Continue
                    </motion.button>
                  </div>
                )}

                {!isOwner && myVote && (
                  <p className="text-center text-xs text-zinc-400">
                    You voted: <span className={myVote === 'end' ? 'text-amber-300' : 'text-zinc-300'}>{myVote === 'end' ? 'End Game' : 'Continue'}</span>
                  </p>
                )}

                {isOwner && (
                  <button
                    onClick={handleCancelVote}
                    disabled={endBusy}
                    className="w-full text-center text-[11px] text-zinc-600 underline disabled:opacity-40"
                  >
                    Cancel vote
                  </button>
                )}
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex flex-col gap-2 px-4 pb-4 pt-2">
              {isOwner ? (
                <>
                  {!endVoteActive && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      disabled={busy}
                      onClick={onNextRound}
                      className="w-full rounded-xl py-3 text-sm font-bold text-amber-950 disabled:opacity-40"
                      style={{
                        background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                        boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
                      }}
                    >
                      {busy ? 'Starting…' : 'Next Round →'}
                    </motion.button>
                  )}
                  {!endVoteActive && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      disabled={endBusy}
                      onClick={handleInitiateVote}
                      className="w-full rounded-xl py-2.5 text-sm font-semibold text-zinc-300 disabled:opacity-40"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {endBusy ? 'Ending…' : 'End Session'}
                    </motion.button>
                  )}
                </>
              ) : (
                !endVoteActive && (
                  <p className="rounded-xl bg-white/5 py-3 text-center text-xs text-zinc-400">
                    Waiting for host to start next round…
                  </p>
                )
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
