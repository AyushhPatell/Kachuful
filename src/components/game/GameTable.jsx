import { motion, AnimatePresence } from 'framer-motion'
import PlayingCard from './PlayingCard.jsx'

export default function GameTable({ cardsOnTable, players, className = '' }) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-emerald-900 via-emerald-950 to-zinc-950 p-4 shadow-inner sm:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_65%)]" />
      <h2 className="relative mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
        Table
      </h2>
      <div className="relative flex min-h-32 flex-wrap items-center justify-center gap-4 sm:min-h-40">
        <AnimatePresence mode="popLayout">
          {(cardsOnTable ?? []).map((play) => (
            <motion.div
              key={`${play.userId}-${play.card.id}`}
              initial={{ scale: 0.6, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="text-center"
            >
              <PlayingCard card={play.card} small />
              <p className="mt-1 max-w-20 truncate text-xs text-emerald-100/70">
                {players.find((p) => p.id === play.userId)?.name ?? 'Player'}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        {!cardsOnTable?.length ? (
          <p className="text-sm text-emerald-100/50">Cards will appear here when played</p>
        ) : null}
      </div>
    </section>
  )
}
