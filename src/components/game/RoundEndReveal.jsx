import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SAR_INFO } from '../../constants/game.js'
import { calculateRoundPoints, isTrumpCard } from '../../lib/gameLogic.js'
import Button from '../ui/Button.jsx'
import PlayingCard from './PlayingCard.jsx'

function getRoundPoints(player, round) {
  const stored = round?.results?.[player.id]
  if (stored) return stored.points ?? 0
  return calculateRoundPoints(player.call ?? 0, player.tricksWon ?? 0)
}

export default function RoundEndReveal({
  reveal,
  players,
  round,
  roundNumber,
  isOwner,
  busy,
  onNextRound,
  scoresReady,
}) {
  if (!reveal?.cards?.length) return null

  const sar = reveal.sar
  const sarInfo = sar ? SAR_INFO[sar] : null
  const winnerName =
    reveal.winnerName ?? players.find((p) => p.id === reveal.winnerId)?.name ?? 'Winner'

  const activePlayers = players.filter((p) => p.status !== 'spectator')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto w-full max-w-lg space-y-4"
    >
      <section className="rounded-2xl border border-emerald-700/50 bg-gradient-to-b from-emerald-900 via-emerald-950 to-zinc-950 p-5 shadow-lg sm:p-6">
        <p className="text-center text-xs uppercase tracking-widest text-emerald-200/80">
          Round {roundNumber} complete
        </p>
        {sarInfo ? (
          <p className="mt-1 text-center text-xs text-emerald-200/70">
            Sar {sar} ({sarInfo.name} {sarInfo.symbol})
          </p>
        ) : null}
        <p className="mt-2 text-center text-base font-semibold text-emerald-50">
          {winnerName} won the last trick
        </p>

        <div className="mt-5 flex flex-wrap items-start justify-center gap-3">
          {reveal.cards.map((play) => {
            const trump = isTrumpCard(play.card, sar)
            return (
              <div
                key={`${play.userId}-${play.card.id}`}
                className={`text-center ${
                  play.userId === reveal.winnerId
                    ? 'rounded-xl ring-2 ring-amber-400/80'
                    : trump
                      ? 'rounded-xl ring-1 ring-emerald-400/50'
                      : ''
                }`}
              >
                <PlayingCard card={play.card} small />
                <p className="mt-1 max-w-20 truncate text-[10px] text-emerald-100/80">
                  {players.find((p) => p.id === play.userId)?.name ?? 'Player'}
                </p>
              </div>
            )
          })}
        </div>

        <div className="mt-5 border-t border-emerald-800/60 pt-4">
          <p className="mb-2 text-center text-xs uppercase tracking-wider text-emerald-200/60">
            Points this round
          </p>
          {!scoresReady ? (
            <p className="text-center text-sm text-emerald-100/50">Updating scores…</p>
          ) : (
            <ul className="space-y-1.5">
              {activePlayers.map((player) => {
                const pts = getRoundPoints(player, round)
                return (
                  <li
                    key={player.id}
                    className="flex items-center justify-between rounded-lg bg-emerald-950/40 px-3 py-2 text-sm"
                  >
                    <span className="truncate pr-2 text-emerald-50">{player.name}</span>
                    <span className="shrink-0 text-right text-xs">
                      <span className={pts > 0 ? 'font-semibold text-amber-300' : 'text-emerald-200/50'}>
                        {pts > 0 ? `+${pts}` : '0'} pts
                      </span>
                      <span className="ml-2 text-emerald-200/60">· {player.sessionScore ?? 0} total</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        {isOwner ? (
          <Button className="w-full flex-1" disabled={busy || !scoresReady} onClick={onNextRound}>
            Next round
          </Button>
        ) : (
          <p className="flex-1 rounded-xl border border-border bg-surface-raised px-4 py-3 text-center text-sm text-muted">
            Waiting for the host to start the next round…
          </p>
        )}
        <Link
          to="/"
          className="flex min-h-11 w-full flex-1 items-center justify-center rounded-xl border border-border bg-surface-raised px-4 text-sm text-muted hover:text-text sm:w-auto"
        >
          Leave session
        </Link>
      </div>
    </motion.div>
  )
}
