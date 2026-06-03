import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
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
  className = '',
}) {
  const seated = orderPlayersForTable(players, turnOrder, currentUserId)
  const slots = SEAT_SLOTS[seated.length] ?? SEAT_SLOTS[4]
  const sarInfo = sar ? SAR_INFO[sar] : null

  const centerCards = trickReveal?.cards?.length ? trickReveal.cards : (cardsOnTable ?? [])
  const trickWinnerId = trickReveal?.winnerId
  const showTrickHighlight = tablePhase === 'trick-won' || (tablePhase === 'round-scores' && trickReveal)
  const showRoundScores = tablePhase === 'round-scores' && scoresReady
  const collecting = tablePhase === 'collect'

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
          {/* Player seats */}
          {seated.map((player, index) => {
            const slot = slots[index] ?? 'top'
            const isTurn = currentTurn === player.id
            const isTrickWinner = trickWinnerId === player.id && showTrickHighlight
            const roundPts = getRoundPoints(player, round)

            return (
              <motion.div
                key={player.id}
                layout
                className={`absolute z-10 max-w-[120px] ${SEAT_CLASS[slot]}`}
              >
                <div
                  className={`rounded-xl px-2 py-1.5 text-center transition ${
                    isTurn
                      ? 'bg-amber-500/20 ring-1 ring-amber-400/60'
                      : isTrickWinner
                        ? 'bg-amber-400/25 ring-2 ring-amber-300/80'
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
                      {isTurn ? ' · turn' : ''}
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}

          {/* Center: deck / trick */}
          <div className="absolute left-1/2 top-1/2 flex min-h-[140px] w-[85%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {collecting ? (
                <motion.div
                  key="deck"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="relative h-16 w-12 rounded-lg border-2 border-emerald-700/80 bg-gradient-to-br from-emerald-800 to-emerald-950 shadow-lg sm:h-20 sm:w-14">
                    <div className="absolute -right-1 -top-1 h-16 w-12 rounded-lg border border-emerald-600/50 bg-emerald-900/90 sm:h-20 sm:w-14" />
                    <div className="absolute -right-2 -top-2 h-16 w-12 rounded-lg border border-emerald-600/30 bg-emerald-900/70 sm:h-20 sm:w-14" />
                  </div>
                  <p className="text-xs text-emerald-200/60">Gathering cards…</p>
                </motion.div>
              ) : centerCards.length ? (
                <motion.div
                  key="trick"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.85, y: -20 }}
                  className="flex flex-wrap items-end justify-center gap-2 sm:gap-3"
                >
                  {centerCards.map((play) => {
                    const trump = isTrumpCard(play.card, sar ?? trickReveal?.sar)
                    return (
                      <motion.div
                        key={`${play.userId}-${play.card.id}`}
                        layout
                        initial={{ scale: 0.7, opacity: 0, y: 16 }}
                        animate={{
                          scale: play.userId === trickWinnerId && showTrickHighlight ? 1.05 : 1,
                          opacity: 1,
                          y: 0,
                        }}
                        className={`text-center ${
                          play.userId === trickWinnerId && showTrickHighlight
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
                </motion.div>
              ) : tablePhase === 'dealing' ? (
                <motion.div key="dealing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <div className="mx-auto mb-2 h-16 w-12 rounded-lg border-2 border-emerald-700/80 bg-gradient-to-br from-emerald-800 to-emerald-950 sm:h-20 sm:w-14" />
                  <p className="text-sm text-emerald-100/60">Dealing cards…</p>
                </motion.div>
              ) : (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-emerald-100/40"
                >
                  {showRoundScores ? 'Round complete' : 'Play a card'}
                </motion.p>
              )}
            </AnimatePresence>

            {showTrickHighlight && trickReveal?.winnerName ? (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
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
            <Link
              to="/"
              className="flex min-h-10 flex-1 items-center justify-center rounded-xl border border-emerald-800/60 bg-emerald-950/30 px-3 text-xs text-emerald-200/70 hover:text-emerald-50"
            >
              Leave session
            </Link>
          </motion.div>
        ) : null}
      </div>
    </section>
  )
}
