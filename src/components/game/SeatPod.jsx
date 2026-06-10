import { motion } from 'framer-motion'
import CardStackBadge from './CardStackBadge.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'

export default function SeatPod({
  player,
  isTurn,
  isTrickWinner,
  showRoundScores,
  roundPts,
  handCount,
  receivingDeal,
  tablePhase,
  callingPhase,
  isDealer = false,
  compact = false,
}) {
  const isCalling = callingPhase && isTurn
  const isActive = isTurn && !showRoundScores
  const isSpectator = player.status === 'spectator'
  const isDisconnected = player.status === 'disconnected'

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: compact ? 76 : 94 }}>

      {/* Main pod */}
      <motion.div
        className="relative flex flex-col items-center rounded-xl px-2 pt-2 pb-1.5"
        animate={isActive ? { scale: [1, 1.025, 1] } : { scale: 1 }}
        transition={{ duration: 1.6, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
        style={{
          background: isDisconnected
            ? 'rgba(100,100,100,0.18)'
            : isSpectator
            ? 'rgba(60,80,255,0.1)'
            : isTrickWinner
            ? 'rgba(251,191,36,0.18)'
            : isActive
            ? 'rgba(245,158,11,0.14)'
            : receivingDeal
            ? 'rgba(255,255,255,0.07)'
            : 'rgba(0,0,0,0.42)',
          backdropFilter: 'blur(8px)',
          border: isDisconnected
            ? '1px dashed rgba(255,255,255,0.18)'
            : isSpectator
            ? '1px solid rgba(99,102,241,0.35)'
            : isTrickWinner
            ? '1.5px solid rgba(251,191,36,0.65)'
            : isActive
            ? '1.5px solid rgba(245,158,11,0.55)'
            : '1px solid rgba(255,255,255,0.09)',
          boxShadow: isActive
            ? '0 0 22px rgba(245,158,11,0.32), 0 4px 16px rgba(0,0,0,0.4)'
            : isTrickWinner
            ? '0 0 18px rgba(251,191,36,0.35), 0 4px 14px rgba(0,0,0,0.4)'
            : '0 4px 14px rgba(0,0,0,0.4)',
          opacity: isDisconnected ? 0.55 : 1,
          transition: 'background 0.3s, border 0.3s, box-shadow 0.3s, opacity 0.3s',
        }}
      >
        {/* Disconnected / spectator badge */}
        {(isDisconnected || isSpectator) && (
          <div
            className="absolute -left-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[9px]"
            style={{
              background: isDisconnected ? 'rgba(80,80,80,0.9)' : 'rgba(99,102,241,0.85)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
            }}
            title={isDisconnected ? 'Offline' : 'Spectating'}
          >
            {isDisconnected ? '✕' : '👁'}
          </div>
        )}

        {/* Dealer chip */}
        {isDealer && (
          <div
            className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #d97706)',
              border: '1.5px solid rgba(255,255,255,0.45)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
              color: '#1a0e00',
            }}
          >
            D
          </div>
        )}

        <PlayerAvatar
          name={player.name}
          photoURL={player.photoURL}
          size={compact ? 'sm' : 'md'}
          glow={isActive}
        />

        <p className="mt-1 max-w-[80px] truncate text-center text-[10px] font-semibold leading-tight text-emerald-50">
          {player.name}
        </p>

        {showRoundScores ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-1 text-center leading-tight"
          >
            <p className="text-[9px] text-emerald-200/70">
              {player.call ?? 0} called · {player.tricksWon ?? 0} won
            </p>
            <p
              className={`text-[11px] font-bold ${roundPts > 0 ? 'text-amber-300' : 'text-zinc-500'}`}
            >
              {roundPts > 0 ? `+${roundPts}` : '0'} pts
            </p>
          </motion.div>
        ) : (
          <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1">
            {(player.tricksWon ?? 0) > 0 && (
              <span className="rounded-full bg-amber-500/22 px-1.5 py-0 text-[9px] font-semibold text-amber-200">
                {player.tricksWon}✓
              </span>
            )}
            {player.call != null && (
              <span className="rounded-full bg-white/8 px-1.5 py-0 text-[9px] text-zinc-300">
                /{player.call}
              </span>
            )}
            {isCalling && (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-[9px] font-medium uppercase tracking-wider text-amber-300"
              >
                calling…
              </motion.span>
            )}
          </div>
        )}
      </motion.div>

      {!showRoundScores && handCount > 0 ? (
        <CardStackBadge count={handCount} receiving={receivingDeal} />
      ) : null}
    </div>
  )
}
