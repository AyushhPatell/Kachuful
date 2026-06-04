import { motion } from 'framer-motion'
import CardStackBadge from './CardStackBadge.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'

export default function SeatPod({
  player,
  isTurn,
  isTrickWinner,
  isLocal,
  showRoundScores,
  roundPts,
  handCount,
  receivingDeal,
  tablePhase,
}) {
  return (
    <motion.div
      layout
      className={`flex flex-col items-center ${isLocal ? 'pointer-events-none opacity-0' : ''}`}
      style={{ maxWidth: 110 }}
    >
      <div
        className={`flex flex-col items-center rounded-2xl px-2 py-1.5 transition-all ${
          isTrickWinner
            ? 'bg-amber-400/25 ring-2 ring-amber-300/90 shadow-lg shadow-amber-500/20'
            : isTurn && !showRoundScores
              ? 'bg-amber-500/15 ring-2 ring-amber-400/50'
              : receivingDeal
                ? 'bg-white/10 ring-1 ring-white/30'
                : 'bg-black/20 ring-1 ring-white/10'
        }`}
      >
        <PlayerAvatar name={player.name} photoURL={player.photoURL} size="md" />

        <p className="mt-1 max-w-[96px] truncate text-center text-[11px] font-medium text-emerald-50">
          {player.name}
        </p>

        {showRoundScores ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 space-y-0.5 text-center text-[10px] leading-tight text-emerald-100/90"
          >
            <p>Call {player.call ?? 0}</p>
            <p>Won {player.tricksWon ?? 0}</p>
            <p className={roundPts > 0 ? 'font-semibold text-amber-300' : 'text-emerald-200/50'}>
              {roundPts > 0 ? `+${roundPts} pts` : '0 pts'}
            </p>
          </motion.div>
        ) : (
          <>
            <p className="mt-0.5 text-[10px] text-emerald-200/70">
              {player.tricksWon ?? 0} won
              {isTurn && tablePhase === 'playing' ? ' · turn' : ''}
              {player.call != null && tablePhase === 'playing' ? ` · call ${player.call}` : ''}
            </p>
            {!showRoundScores && handCount > 0 ? (
              <CardStackBadge count={handCount} receiving={receivingDeal} />
            ) : null}
          </>
        )}
      </div>
    </motion.div>
  )
}
