import { motion } from 'framer-motion'
import { SAR_INFO } from '../../constants/game.js'

const suitSymbol = {
  clubs: '♣',
  diamonds: '♦',
  spades: '♠',
  hearts: '♥',
}

function CardBack({ className }) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-amber-900/40 shadow-md ${className}`}
      style={{
        background: `
          repeating-linear-gradient(45deg, #1e3a5f 0px, #1e3a5f 4px, #162d4a 4px, #162d4a 8px),
          linear-gradient(135deg, #234a75 0%, #1a3555 100%)
        `,
      }}
    >
      <div className="flex h-full w-full items-center justify-center border border-amber-700/30 bg-amber-950/20 m-1 rounded">
        <span className="text-lg text-amber-400/80">♠</span>
      </div>
    </div>
  )
}

export default function PlayingCard({
  card,
  faceDown = false,
  small = false,
  compact = false,
  onClick,
  selected,
  dealDelay = 0,
  layoutId,
  className = '',
}) {
  const size = compact
    ? 'h-[4.5rem] w-8 text-[10px] sm:h-[5rem] sm:w-9'
    : small
      ? 'h-16 w-11 text-xs sm:h-[4.5rem] sm:w-12'
      : 'h-24 w-16 text-sm sm:h-28 sm:w-20 sm:text-base'

  const suitColor =
    card?.suit === 'hearts' || card?.suit === 'diamonds' ? 'text-red-600' : 'text-neutral-900'

  if (faceDown || !card) {
    return <CardBack className={`${size} ${className}`} />
  }

  const Wrapper = onClick ? motion.button : motion.div

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      layoutId={layoutId}
      initial={{ opacity: 0, y: 24, rotate: -6 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: dealDelay, duration: 0.35 }}
      whileHover={onClick ? { y: -10 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      onClick={onClick}
      className={`${size} rounded-lg border border-neutral-200/90 bg-gradient-to-b from-white to-neutral-50 shadow-lg ${suitColor} ${
        selected ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-transparent' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex h-full flex-col items-center justify-between p-0.5 sm:p-1">
        <span className="font-bold leading-none">{card.rank}</span>
        <span className="text-base leading-none sm:text-lg">{suitSymbol[card.suit]}</span>
        <span className="rotate-180 font-bold leading-none">{card.rank}</span>
      </div>
    </Wrapper>
  )
}

export function SarBadge({ sar, compact = false }) {
  const info = SAR_INFO[sar]
  if (!info) return null

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-900/40 bg-black/30 px-3 py-1 text-xs backdrop-blur-sm">
        <span className="font-semibold text-amber-200">Sar {sar}</span>
        <span className={`${info.color}`}>{info.symbol}</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-4 py-2 text-sm">
      <span className="font-semibold text-accent">Sar: {sar}</span>
      <span className="text-muted">{info.name}</span>
      <span className={`text-lg ${info.color}`}>{info.symbol}</span>
    </div>
  )
}

export function DeckStack({ className = '' }) {
  return (
    <div className={`relative h-16 w-11 sm:h-20 sm:w-14 ${className}`}>
      <CardBack className="absolute inset-0" />
      <div className="absolute -right-1 -top-1 h-full w-full scale-95 opacity-80">
        <CardBack className="h-full w-full" />
      </div>
      <div className="absolute -right-2 -top-2 h-full w-full scale-90 opacity-60">
        <CardBack className="h-full w-full" />
      </div>
    </div>
  )
}
