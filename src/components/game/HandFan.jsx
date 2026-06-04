import { motion } from 'framer-motion'
import PlayingCard from './PlayingCard.jsx'

/** Gap between cards (px) so each card stays fully visible. */
const GAP_BY_COUNT = {
  1: 0,
  2: 44,
  3: 28,
  4: 20,
  5: 14,
  6: 10,
  7: 8,
}

const ROTATE_BY_COUNT = {
  2: 10,
  3: 8,
  4: 7,
  5: 6,
  6: 5,
  7: 4,
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
  const gap = GAP_BY_COUNT[count] ?? 8
  const rotateStep = ROTATE_BY_COUNT[count] ?? 4
  const center = (count - 1) / 2

  return (
    <div
      className={`flex min-h-[7.5rem] items-end justify-center pb-1 sm:min-h-[8rem] ${dimmed ? 'opacity-40' : ''}`}
      style={{ gap }}
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
            layoutId={showFace ? `card-${card.id}` : undefined}
            className="shrink-0"
            style={{
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
