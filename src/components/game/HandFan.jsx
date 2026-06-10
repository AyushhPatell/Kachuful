import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PlayingCard from './PlayingCard.jsx'
import { playSound } from '../../lib/sounds.js'
import { isTrumpCard } from '../../lib/gameLogic.js'

const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window

export default function HandFan({
  cards,
  visibleCount,
  faceDown,
  faceUpAfterDeal,
  playableIds,
  onPlayCard,
  busy,
  dimmed,
  hiddenCardId,
  reducedMotion,
  isMyTurn,
  sar,
}) {
  const [selectedId, setSelectedId] = useState(null)

  // Must be before any early returns (Rules of Hooks)
  const handleCardClick = useCallback((card, canPlay) => {
    if (!canPlay) return
    if (isTouchDevice) {
      if (selectedId === card.id) {
        setSelectedId(null)
        playSound('cardPlay')
        onPlayCard(card)
      } else {
        setSelectedId(card.id)
        playSound('cardSelect')
      }
    } else {
      playSound('cardPlay')
      onPlayCard(card)
    }
  }, [selectedId, onPlayCard])

  const visible = cards.slice(0, visibleCount)
  if (!visible.length) return null

  const count = visible.length
  const center = (count - 1) / 2
  const stepDeg = count === 1 ? 0 : count === 2 ? 12 : count <= 4 ? 9 : count <= 6 ? 7 : 5.5
  const stepPx  = count === 1 ? 0 : count === 2 ? 56 : count <= 3 ? 48 : count <= 5 ? 40 : count <= 7 ? 30 : 24

  return (
    <div
      className={`relative mx-auto flex h-[7.5rem] w-full max-w-xl items-end justify-center pb-1 sm:h-32 ${
        dimmed ? 'opacity-40' : ''
      } ${isMyTurn && !faceDown ? 'drop-shadow-[0_0_28px_rgba(245,158,11,0.3)]' : ''}`}
    >
      {/* "Your turn" label */}
      <AnimatePresence>
        {isMyTurn && !faceDown && (
          <motion.div
            key="your-turn-label"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <span
              className="rounded-full border border-amber-400/40 bg-amber-500/18 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300"
              style={{ backdropFilter: 'blur(6px)' }}
            >
              ✦ Your Turn
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Touch hint: tap again to play */}
      <AnimatePresence>
        {isTouchDevice && selectedId && (
          <motion.div
            key="tap-hint"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <span className="rounded-full bg-black/60 px-3 py-1 text-[9px] text-zinc-300 backdrop-blur-sm">
              Tap again to play
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {visible.map((card, index) => {
        const offset = index - center
        const tx = offset * stepPx
        const rot = offset * stepDeg
        const isHidden = hiddenCardId === card.id
        const canPlay = playableIds.has(card.id) && !faceDown && !busy && isMyTurn
        const showFace = faceUpAfterDeal && !faceDown
        const isSelected = selectedId === card.id

        if (isHidden) return null

        const liftY = isSelected ? -22 : canPlay ? -10 : 0
        const cardScale = isSelected ? 1.08 : canPlay ? 1.03 : 1

        return (
          <motion.div
            key={card.id}
            className="absolute bottom-0 origin-bottom"
            style={{ zIndex: isSelected ? count + 5 : index }}
            // All transforms in animate so framer-motion manages them consistently
            initial={reducedMotion ? false : { opacity: 0, y: 50, scale: 0.85, x: tx, rotate: rot }}
            animate={{ opacity: 1, y: liftY, scale: cardScale, x: tx, rotate: rot }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <PlayingCard
              card={faceDown ? null : card}
              faceDown={faceDown || !showFace}
              onClick={canPlay ? () => handleCardClick(card, canPlay) : undefined}
              selected={isSelected || (canPlay && !isTouchDevice)}
              isTrump={showFace && isTrumpCard(card, sar)}
              hand
            />
          </motion.div>
        )
      })}
    </div>
  )
}
