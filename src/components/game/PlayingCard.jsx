import { motion } from 'framer-motion'
import { SAR_INFO } from '../../constants/game.js'

export default function PlayingCard({ card, faceDown = false, small = false, onClick, selected }) {
  const size = small
    ? 'h-16 w-11 text-xs sm:h-18 sm:w-12'
    : 'h-24 w-16 text-sm sm:h-28 sm:w-20 sm:text-base landscape:h-20 landscape:w-14 landscape:text-xs md:h-24 md:w-16 md:text-sm lg:h-28 lg:w-20 lg:text-base'
  const suitColor = SAR_INFO.Ka.suit === card?.suit
    ? (card?.suit === 'hearts' || card?.suit === 'diamonds' ? 'text-red-600' : 'text-neutral-900')
    : (card?.suit === 'hearts' || card?.suit === 'diamonds' ? 'text-red-600' : 'text-neutral-900')

  const suitSymbol = {
    clubs: '♣',
    diamonds: '♦',
    spades: '♠',
    hearts: '♥',
  }

  if (faceDown || !card) {
    return (
      <div
        className={`${size} rounded-lg border-2 border-border bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-md`}
      />
    )
  }

  return (
    <motion.button
      type="button"
      whileHover={onClick ? { y: -8 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      onClick={onClick}
      className={`${size} rounded-lg border border-neutral-200 bg-white shadow-md ${suitColor} ${
        selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex h-full flex-col items-center justify-between p-1">
        <span className="font-bold">{card.rank}</span>
        <span className="text-lg leading-none">{suitSymbol[card.suit]}</span>
        <span className="rotate-180 font-bold">{card.rank}</span>
      </div>
    </motion.button>
  )
}

export function SarBadge({ sar }) {
  const info = SAR_INFO[sar]
  if (!info) return null

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-4 py-2 text-sm">
      <span className="font-semibold text-accent">Sar: {sar}</span>
      <span className="text-muted">{info.name}</span>
      <span className={`text-lg ${info.color}`}>{info.symbol}</span>
    </div>
  )
}
