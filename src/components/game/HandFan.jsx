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

  const visible = cards.slice(0, visibleCount)
  if (!visible.length) return null

  const count = visible.length
  const center = (count - 1) / 2
  const stepDeg = count === 1 ? 0 : count === 2 ? 11 : count <= 4 ? 9 : count <= 6 ? 7 : 5.5
  const stepPx  = count === 1 ? 0 : count === 2 ? 30 : count <= 4 ? 34 : count <= 6 ? 28 : 22

  const handleCardClick = useCallback((card, canPlay) => {
    if (!canPlay) return
    if (isTouchDevice) {
      if (selectedId === card.id) {
        // Second tap — play
        setSelectedId(null)
        playSound('cardPlay')
        onPlayCard(card)
      } else {
        // First tap — select/preview
        setSelectedId(card.id)
        playSound('cardSelect')
      }
    } else {
      playSound('cardPlay')
      onPlayCard(card)
    }
  }, [selectedId, onPlayCard])

  return (
    <div
      className={`relative mx-auto flex h-[8.5rem] w-full max-w-xl items-end justify-center pb-1 sm:h-36 ${
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

      {/* Touch hint */}
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
        const rotate = offset * stepDeg
        const tx = offset * stepPx
        const isHidden = hiddenCardId === card.id
        const canPlay = playableIds.has(card.id) && !faceDown && !busy
        const showFace = faceUpAfterDeal && !faceDown
        const isSelected = selectedId === card.id

        if (isHidden) return null

        const liftY = isSelected ? -22 : canPlay && isMyTurn ? -12 : 0
        const cardScale = isSelected ? 1.08 : canPlay && isMyTurn ? 1.04 : 1

        return (
          <motion.div
            key={card.id}
            className="absolute bottom-0 origin-bottom"
            style={{
              zIndex: isSelected ? count + 5 : index,
              transform: `translateX(${tx}px) rotate(${rotate}deg)`,
            }}
            initial={reducedMotion ? false : { opacity: 0, y: 55, scale: 0.82 }}
            animate={{ opacity: 1, y: liftY, scale: cardScale }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <PlayingCard
              card={faceDown ? null : card}
              faceDown={faceDown || !showFace}
              onClick={canPlay ? () => handleCardClick(card, canPlay) : undefined}
              selected={isSelected || (canPlay && isMyTurn && !isTouchDevice)}
              isTrump={showFace && isTrumpCard(card, sar)}
              hand
            />
          </motion.div>
        )
      })}
    </div>
  )
}
