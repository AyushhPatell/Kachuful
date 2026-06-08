import { motion } from 'framer-motion'
import PlayingCard from './PlayingCard.jsx'

/** How much each card overlaps the previous (px) — tighter = more natural fan. */
const OVERLAP_BY_COUNT = {
  1: 0,
  2: 22,
  3: 20,
  4: 18,
  5: 16,
  6: 14,
  7: 12,
}

const ROTATE_BY_COUNT = {
  2: 8,
  3: 7,
  4: 6,
  5: 5,
  6: 4,
  7: 3,
}

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
}) {
  const visible = cards.slice(0, visibleCount)
  if (!visible.length) return null

  const count = visible.length
  const overlap = OVERLAP_BY_COUNT[count] ?? 16
  const rotateStep = ROTATE_BY_COUNT[count] ?? 3
  const center = (count - 1) / 2

  return (
    <div
      className={`flex min-h-[7.5rem] items-end justify-center pb-1 sm:min-h-[8rem] ${dimmed ? 'opacity-40' : ''}`}
    >
      {visible.map((card, index) => {
        const offset = index - center
        const isHidden = hiddenCardId === card.id
        const canPlay = playableIds.has(card.id) && !faceDown && !busy
        const showFace = faceUpAfterDeal && !faceDown

        if (isHidden) return null

        return (
          <motion.div
            key={card.id}
            className="shrink-0"
            style={{
              marginLeft: index === 0 ? 0 : -overlap,
              zIndex: index,
              transform: `rotate(${offset * rotateStep}deg)`,
              transformOrigin: 'bottom center',
            }}
            initial={reducedMotion ? false : { opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: canPlay ? -10 : 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            <PlayingCard
              card={faceDown ? null : card}
              faceDown={faceDown || !showFace}
              onClick={canPlay ? () => onPlayCard(card) : undefined}
              selected={canPlay}
              compact
            />
          </motion.div>
        )
      })}
    </div>
  )
}
