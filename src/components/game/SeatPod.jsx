import { motion } from 'framer-motion'
import CardStackBadge from './CardStackBadge.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'
import { ROUND_STATUS } from '../../constants/game.js'

export default function SeatPod({
  player,
  isTurn,
  isTrickWinner,
  showRoundScores,
  roundPts,
  handCount,
  receivingDeal,
  tablePhase,
  roundStatus,
  callingPhase,
}) {
  const showCall =
    roundStatus === ROUND_STATUS.CALLING || roundStatus === ROUND_STATUS.PLAYING

  return (
    <motion.div layout className="flex flex-col items-center" style={{ minWidth: 108 }}>
      <div
        className={`flex w-full flex-col items-center rounded-2xl px-2.5 pt-1.5 pb-1 transition-all ${
          isTrickWinner
            ? 'bg-amber-400/25 ring-2 ring-amber-300/90 shadow-lg shadow-amber-500/20'
            : isTurn && !showRoundScores
              ? 'bg-amber-500/20 ring-2 ring-amber-400/55 shadow-md shadow-amber-500/10'
              : receivingDeal
                ? 'bg-white/10 ring-1 ring-white/30'
                : 'bg-black/20 ring-1 ring-white/10'
        }`}
      >
        <PlayerAvatar name={player.name} photoURL={player.photoURL} size="md" />

        <p className="mt-1 max-w-[104px] truncate text-center text-[11px] font-medium text-emerald-50">
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
          <div className="relative z-20 mt-1 w-full rounded-lg bg-black/45 px-2 py-1 text-center backdrop-blur-sm">
            <p className="text-[10px] leading-snug text-emerald-100/90">
              <span>{player.tricksWon ?? 0} won</span>
              {isTurn && tablePhase === 'playing' ? (
                <span className="font-medium text-amber-300"> · turn</span>
              ) : null}
            </p>
            {showCall ? (
              <p className="text-[10px] font-semibold leading-snug text-amber-100">
                Call:{' '}
                <span className="text-amber-200">
                  {player.call != null ? player.call : '—'}
                </span>
              </p>
            ) : null}
          </div>
        )}
      </div>

      {!showRoundScores && handCount > 0 ? (
        <div className="relative z-0 -mt-1 flex justify-center pt-0.5">
          <CardStackBadge count={handCount} receiving={receivingDeal} />
        </div>
      ) : null}
    </motion.div>
  )
}
