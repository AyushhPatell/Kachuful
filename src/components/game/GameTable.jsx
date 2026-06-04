import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SAR_INFO } from '../../constants/game.js'
import { calculateRoundPoints, isTrumpCard } from '../../lib/gameLogic.js'
import Button from '../ui/Button.jsx'
import PlayingCard from './PlayingCard.jsx'

/** Seat layout: index 0 = bottom (you), rest around the table. */
const SEAT_SLOTS = {
  2: ['bottom', 'top'],
  3: ['bottom', 'top-left', 'top-right'],
  4: ['bottom', 'left', 'top', 'right'],
  5: ['bottom', 'left', 'top-left', 'top-right', 'right'],
  6: ['bottom', 'left', 'top-left', 'top', 'top-right', 'right'],
  7: ['bottom', 'left', 'top-left', 'top', 'top-right', 'right', 'bottom-far'],
}

const SEAT_CLASS = {
  bottom: 'bottom-2 left-1/2 -translate-x-1/2',
  top: 'top-2 left-1/2 -translate-x-1/2',
  left: 'left-2 top-1/2 -translate-y-1/2',
  right: 'right-2 top-1/2 -translate-y-1/2',
  'top-left': 'left-[12%] top-[14%]',
  'top-right': 'right-[12%] top-[14%]',
  'bottom-far': 'bottom-[18%] left-[18%]',
}

/** Fly offsets from table center toward each seat (px). */
const SEAT_FLY = {
  bottom: { x: 0, y: 72 },
  top: { x: 0, y: -72 },
  left: { x: -88, y: 0 },
  right: { x: 88, y: 0 },
  'top-left': { x: -56, y: -48 },
  'top-right': { x: 56, y: -48 },
  'bottom-far': { x: -40, y: 56 },
}

function orderPlayersForTable(players, turnOrder, meId) {
  const seated = turnOrder
    .map((id) => players.find((p) => p.id === id))
    .filter((p) => p && p.status !== 'spectator')

  if (!meId) return seated
  const idx = seated.findIndex((p) => p.id === meId)
  if (idx <= 0) return seated
  return [...seated.slice(idx), ...seated.slice(0, idx)]
}

function getRoundPoints(player, round) {
  const stored = round?.results?.[player.id]
  if (stored) return stored.points ?? 0
  return calculateRoundPoints(player.call ?? 0, player.tricksWon ?? 0)
}

function DeckStack({ className = '' }) {
  return (
    <div className={`relative h-16 w-12 sm:h-20 sm:w-14 ${className}`}>
      <div className="absolute inset-0 rounded-lg border-2 border-emerald-700/80 bg-gradient-to-br from-emerald-800 to-emerald-950 shadow-lg" />
      <div className="absolute -right-1 -top-1 h-full w-full rounded-lg border border-emerald-600/50 bg-emerald-900/90" />
      <div className="absolute -right-2 -top-2 h-full w-full rounded-lg border border-emerald-600/30 bg-emerald-900/70" />
    </div>
  )
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = () => setReduced(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

export default function GameTable({
  players,
  turnOrder = [],
  cardsOnTable,
  trickReveal,
  tablePhase = 'playing',
  round,
  roundNumber,
  sar,
  currentTurn,
  currentUserId,
  isOwner,
  busy,
  scoresReady,
  onNextRound,
  onLeave,
  dealStep = 0,
  dealTargetPlayerId = null,
  className = '',
}) {
  const seated = orderPlayersForTable(players, turnOrder, currentUserId)
  const slots = SEAT_SLOTS[seated.length] ?? SEAT_SLOTS[4]
  const sarInfo = sar ? SAR_INFO[sar] : null
  const reducedMotion = usePrefersReducedMotion()
  const [leaveConfirm, setLeaveConfirm] = useState(false)

  const centerCards = trickReveal?.cards?.length ? trickReveal.cards : (cardsOnTable ?? [])
  const trickWinnerId = trickReveal?.winnerId
  const isTrickPhase = tablePhase === 'trick-won'
  const isCollect = tablePhase === 'collect'
  const showRoundScores = tablePhase === 'round-scores' && scoresReady
  const isDealing = tablePhase === 'dealing'

  const winnerIndex = seated.findIndex((p) => p.id === trickWinnerId)
  const winnerSlot = winnerIndex >= 0 ? slots[winnerIndex] : null
  const winnerFly = winnerSlot ? SEAT_FLY[winnerSlot] : { x: 0, y: -60 }

  const dealTargetIndex = seated.findIndex((p) => p.id === dealTargetPlayerId)
  const dealTargetSlot = dealTargetIndex >= 0 ? slots[dealTargetIndex] : null
  const dealFly = dealTargetSlot ? SEAT_FLY[dealTargetSlot] : { x: 0, y: -60 }

  function cardAnimate(play) {
    if (reducedMotion) {
      if (isCollect) return { opacity: 0, scale: 0.5 }
      return { opacity: 1, x: 0, y: 0, scale: 1 }
    }
    if (isCollect) {
      return { x: 0, y: 0, scale: 0.15, opacity: 0, transition: { duration: 0.55 } }
    }
    if (isTrickPhase) {
      return {
        x: winnerFly.x,
        y: winnerFly.y,
        scale: play.userId === trickWinnerId ? 0.9 : 0.72,
        opacity: play.userId === trickWinnerId ? 1 : 0.45,
        transition: { duration: 0.65, ease: 'easeInOut' },
      }
    }
    return { x: 0, y: 0, scale: 1, opacity: 1 }
  }

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-emerald-900 via-emerald-950 to-zinc-950 shadow-inner ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.07),transparent_65%)]" />

      <div className="relative px-3 pb-3 pt-4 sm:px-4 sm:pb-4">
        <div className="mb-2 flex items-center justify-center gap-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
            Round {roundNumber}
          </p>
          {sarInfo ? (
            <span className="text-xs text-emerald-200/60">
              · Sar {sar} {sarInfo.symbol}
            </span>
          ) : null}
        </div>

        <div className="relative mx-auto min-h-[280px] w-full max-w-xl sm:min-h-[320px]">
          {seated.map((player, index) => {
            const slot = slots[index] ?? 'top'
            const isTurn = currentTurn === player.id
            const isTrickWinner = trickWinnerId === player.id && isTrickPhase
            const roundPts = getRoundPoints(player, round)
            const receivingDeal = isDealing && dealTargetPlayerId === player.id

            return (
              <motion.div
                key={player.id}
                layout
                className={`absolute z-10 max-w-[130px] ${SEAT_CLASS[slot]}`}
              >
                <div
                  className={`rounded-xl px-2 py-1.5 text-center transition ${
                    isTurn && !showRoundScores
                      ? 'bg-amber-500/20 ring-1 ring-amber-400/60'
                      : isTrickWinner
                        ? 'bg-amber-400/30 ring-2 ring-amber-300/90'
                        : receivingDeal
                          ? 'bg-emerald-800/60 ring-1 ring-emerald-400/50'
                          : 'bg-emerald-950/50 ring-1 ring-emerald-800/50'
                  }`}
                >
                  <p className="truncate text-xs font-medium text-emerald-50">{player.name}</p>

                  {showRoundScores ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 space-y-0.5 text-[10px] leading-tight text-emerald-100/90"
                    >
                      <p>Call {player.call ?? 0}</p>
                      <p>Won {player.tricksWon ?? 0}</p>
                      <p className={roundPts > 0 ? 'font-semibold text-amber-300' : 'text-emerald-200/50'}>
                        {roundPts > 0 ? `+${roundPts} pts` : '0 pts'}
                      </p>
                    </motion.div>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-emerald-200/60">
                      {player.tricksWon ?? 0} won
                      {isTurn && tablePhase === 'playing' ? ' · turn' : ''}
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}

          <div className="absolute left-1/2 top-1/2 flex min-h-[140px] w-[90%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center">
            {isDealing ? (
              <div className="relative flex flex-col items-center">
                <DeckStack />
                <AnimatePresence>
                  {dealTargetPlayerId ? (
                    <motion.div
                      key={`deal-${dealStep}`}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={
                        reducedMotion
                          ? { opacity: 0 }
                          : {
                              x: dealFly.x,
                              y: dealFly.y,
                              opacity: 0,
                              scale: 0.6,
                            }
                      }
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                      <PlayingCard faceDown small />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <p className="mt-3 text-xs text-emerald-200/60">
                  Dealing… {dealStep > 0 ? `${dealStep}` : ''}
                </p>
              </div>
            ) : null}

            {!isDealing && (isCollect || centerCards.length > 0) ? (
              <div className="relative flex flex-wrap items-end justify-center gap-2 sm:gap-3">
                {centerCards.map((play) => {
                  const trump = isTrumpCard(play.card, sar ?? trickReveal?.sar)
                  return (
                    <motion.div
                      key={`${play.userId}-${play.card.id}`}
                      layout={!isTrickPhase && !isCollect}
                      initial={reducedMotion ? false : { scale: 0.75, opacity: 0, y: 14 }}
                      animate={cardAnimate(play)}
                      className={`text-center ${
                        play.userId === trickWinnerId && isTrickPhase
                          ? 'rounded-xl ring-2 ring-amber-400/90'
                          : trump
                            ? 'rounded-xl ring-1 ring-emerald-400/40'
                            : ''
                      }`}
                    >
                      <PlayingCard card={play.card} small />
                    </motion.div>
                  )
                })}
                {isCollect ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  >
                    <DeckStack />
                  </motion.div>
                ) : null}
              </div>
            ) : null}

            {!isDealing && !isCollect && centerCards.length === 0 && !showRoundScores ? (
              <p className="text-sm text-emerald-100/35">Play a card</p>
            ) : null}

            {isTrickPhase && trickReveal?.winnerName ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 text-center text-xs font-medium text-amber-200/90"
              >
                {trickReveal.winnerName} wins the trick
              </motion.p>
            ) : null}
          </div>
        </div>

        {showRoundScores ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex flex-col gap-2 border-t border-emerald-800/50 pt-3 sm:flex-row"
          >
            {isOwner ? (
              <Button className="flex-1" disabled={busy} onClick={onNextRound}>
                Next round
              </Button>
            ) : (
              <p className="flex-1 rounded-xl bg-emerald-950/40 px-3 py-2.5 text-center text-xs text-emerald-200/70">
                Waiting for host to start next round…
              </p>
            )}
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setLeaveConfirm(true)}
            >
              Leave session
            </Button>
          </motion.div>
        ) : null}
      </div>

      {leaveConfirm ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface-raised p-5 shadow-xl">
            <p className="text-center text-sm text-text">Leave this session? Your progress stays on the table.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setLeaveConfirm(false)}>
                Stay
              </Button>
              <Button className="flex-1" onClick={() => onLeave?.()}>
                Leave
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export { orderPlayersForTable, SEAT_FLY, SEAT_SLOTS }
