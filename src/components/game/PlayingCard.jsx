import { motion } from 'framer-motion'
import { SAR_INFO } from '../../constants/game.js'

const SUIT_SYMBOL = {
  clubs: '♣',
  diamonds: '♦',
  spades: '♠',
  hearts: '♥',
}

// Premium dark-navy card back with diamond pattern
function CardBack({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        borderRadius: '0.5rem',
        background: 'linear-gradient(145deg, #1e2d52, #152040)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {/* Inner gold border frame */}
      <div
        className="absolute inset-[3px] rounded"
        style={{ border: '1px solid rgba(200,165,90,0.32)' }}
      />
      {/* Diamond trellis */}
      <div
        className="absolute inset-[4px] rounded"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Cpath d='M5 0L10 5L5 10L0 5Z' fill='none' stroke='rgba(200,165,90,0.28)' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '10px 10px',
        }}
      />
      {/* Center spade emblem */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize: '1.1em', color: 'rgba(200,165,90,0.65)', lineHeight: 1 }}>♠</span>
      </div>
    </div>
  )
}

// Card size variants
const SIZES = {
  small: {
    w: 'w-[2.85rem] sm:w-[3.1rem]',
    h: 'h-[4.25rem] sm:h-[4.75rem]',
    rankSize: 'text-[10px] sm:text-[11px]',
    suitSize: 'text-[16px] sm:text-[18px]',
    p: 'p-[3px]',
  },
  hand: {
    w: 'w-[2.95rem] sm:w-[3.35rem]',
    h: 'h-[7rem] sm:h-[7.75rem]',
    rankSize: 'text-[12px] sm:text-[13px]',
    suitSize: 'text-[22px] sm:text-[26px]',
    p: 'p-1 sm:p-1.5',
  },
  compact: {
    w: 'w-[2rem] sm:w-[2.2rem]',
    h: 'h-[3rem] sm:h-[3.4rem]',
    rankSize: 'text-[9px]',
    suitSize: 'text-[11px]',
    p: 'p-[2px]',
  },
  default: {
    w: 'w-[3.5rem] sm:w-[4.5rem]',
    h: 'h-[5rem] sm:h-[6.5rem]',
    rankSize: 'text-[12px] sm:text-[14px]',
    suitSize: 'text-[20px] sm:text-[26px]',
    p: 'p-1',
  },
}

export default function PlayingCard({
  card,
  faceDown = false,
  small = false,
  compact = false,
  hand = false,
  onClick,
  selected,
  isTrump = false,
  dealDelay = 0,
  layoutId,
  className = '',
}) {
  const sizeKey = compact ? 'compact' : hand ? 'hand' : small ? 'small' : 'default'
  const sz = SIZES[sizeKey]

  const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds'
  const suitColor = isRed ? '#dc2626' : '#1a1a1a'
  const sym = SUIT_SYMBOL[card?.suit] ?? ''

  const sizeClass = `${sz.w} ${sz.h}`

  if (faceDown || !card) {
    return <CardBack className={`${sizeClass} ${className}`} />
  }

  const isFace = ['J', 'Q', 'K'].includes(card.rank)
  const Wrapper = onClick ? motion.button : motion.div

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      layoutId={layoutId}
      initial={{ opacity: 0, y: 18, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: dealDelay, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      whileHover={onClick ? { y: -14, scale: 1.04, transition: { duration: 0.14 } } : undefined}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      onClick={onClick}
      className={`relative select-none ${sizeClass} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        borderRadius: '0.5rem',
        background: 'linear-gradient(160deg, #ffffff 0%, #f8f8f6 55%, #f1f1ef 100%)',
        border: '1px solid rgba(0,0,0,0.14)',
        boxShadow: selected
          ? '0 0 0 2.5px #f59e0b, 0 0 18px rgba(245,158,11,0.55), 0 8px 24px rgba(0,0,0,0.55)'
          : isTrump
          ? '0 0 0 2px rgba(34,197,94,0.85), 0 0 14px rgba(34,197,94,0.4), 0 6px 20px rgba(0,0,0,0.5)'
          : '0 4px 16px rgba(0,0,0,0.48), 0 1px 3px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.95)',
      }}
    >
      {/* Trump green tint overlay */}
      {isTrump && (
        <div
          className="pointer-events-none absolute inset-0 rounded-lg opacity-[0.12]"
          style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.5), transparent 60%)' }}
        />
      )}

      <div className={`flex h-full flex-col ${sz.p}`} style={{ color: suitColor }}>
        {/* Top-left corner */}
        <div className="flex flex-col items-start leading-[1]">
          <span className={`${sz.rankSize} font-bold`}>{card.rank}</span>
          <span className={`${sz.rankSize} leading-[1]`}>{sym}</span>
        </div>

        {/* Center */}
        <div className="flex flex-1 items-center justify-center">
          {isFace ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className={`${sz.suitSize} leading-none`}>{sym}</span>
              <span
                className="font-bold uppercase leading-none opacity-50"
                style={{ fontSize: '0.55em', letterSpacing: '0.08em' }}
              >
                {card.rank === 'J' ? 'Jck' : card.rank === 'Q' ? 'Qn' : 'Kg'}
              </span>
            </div>
          ) : (
            <span className={`${sz.suitSize} leading-none`}>{sym}</span>
          )}
        </div>

        {/* Bottom-right corner (rotated) */}
        <div className="flex flex-col items-end rotate-180 leading-[1]">
          <span className={`${sz.rankSize} font-bold`}>{card.rank}</span>
          <span className={`${sz.rankSize} leading-[1]`}>{sym}</span>
        </div>
      </div>
    </Wrapper>
  )
}

export function SarBadge({ sar, compact = false }) {
  const info = SAR_INFO[sar]
  if (!info) return null

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-900/40 bg-black/35 px-3 py-1 text-xs backdrop-blur-sm">
        <span className="font-semibold text-amber-200" style={{ fontFamily: 'Cinzel, serif' }}>
          Sar {sar}
        </span>
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
      {/* Shadow layers */}
      <div className="absolute -right-2 -top-2 h-full w-full scale-90 opacity-50">
        <CardBack className="h-full w-full" />
      </div>
      <div className="absolute -right-1 -top-1 h-full w-full scale-95 opacity-75">
        <CardBack className="h-full w-full" />
      </div>
      <CardBack className="absolute inset-0" />
    </div>
  )
}
