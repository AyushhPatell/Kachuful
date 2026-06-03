import { motion } from 'framer-motion'
import { SAR_INFO } from '../../constants/game.js'
import { isTrumpCard } from '../../lib/gameLogic.js'
import PlayingCard from './PlayingCard.jsx'

export default function TrickReveal({ reveal, players }) {
  if (!reveal?.cards?.length) return null

  const sar = reveal.sar
  const sarInfo = sar ? SAR_INFO[sar] : null
  const winnerName =
    reveal.winnerName ?? players.find((p) => p.id === reveal.winnerId)?.name ?? 'Winner'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl border border-emerald-700/50 bg-gradient-to-b from-emerald-900 via-emerald-950 to-zinc-950 p-5 shadow-lg sm:p-6"
    >
      <p className="text-center text-xs uppercase tracking-widest text-emerald-200/80">Trick complete</p>
      {sarInfo ? (
        <p className="mt-1 text-center text-xs text-emerald-200/70">
          Sar {sar} ({sarInfo.name} {sarInfo.symbol}) — trump beats other suits
        </p>
      ) : null}
      <p className="mt-2 text-center text-lg font-semibold text-emerald-50">
        {winnerName} wins the trick
      </p>

      <div className="mt-5 flex flex-wrap items-start justify-center gap-4">
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
            <p className="mt-1 max-w-24 truncate text-xs text-emerald-100/80">
              {players.find((p) => p.id === play.userId)?.name ?? 'Player'}
              {trump ? ' · Sar' : ''}
            </p>
          </div>
          )
        })}
      </div>

      {reveal.endsRound ? (
        <p className="mt-5 text-center text-sm text-emerald-100/60">Round summary in a moment…</p>
      ) : (
        <p className="mt-5 text-center text-sm text-emerald-100/60">Next trick starting…</p>
      )}
    </motion.div>
  )
}
