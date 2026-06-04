import { motion } from 'framer-motion'
import PlayingCard from './PlayingCard.jsx'

function getFanLayout(count) {
  if (count <= 1) return { stepPx: 0, stepDeg: 0, height: '7.5rem' }
  if (count === 2) return { stepPx: 56, stepDeg: 14, height: '8rem' }
  if (count <= 4) return { stepPx: 40, stepDeg: 11, height: '8rem' }
  if (count <= 6) return { stepPx: 32, stepDeg: 8, height: '8.5rem' }
  return { stepPx: 24, stepDeg: 6, height: '9rem' }
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
  const { stepPx, stepDeg, height } = getFanLayout(count)
  const center = (count - 1) / 2
  const fanWidth = count <= 1 ? 72 : Math.ceil((count - 1) * stepPx + 72)

  return (
    <div
      className={`relative mx-auto flex items-end justify-center pb-1 ${dimmed ? 'opacity-40' : ''}`}
      style={{ width: fanWidth, maxWidth: '100%', height }}
    >
      {visible.map((card, index) => {
        const offset = index - center
        const rotate = offset * stepDeg
        const tx = offset * stepPx
        const isHidden = hiddenCardId === card.id
        const canPlay = playableIds.has(card.id) && !faceDown && !busy
        const showFace = faceUpAfterDeal && !faceDown

        if (isHidden) return null

        return (
          <motion.div
            key={card.id}
            layout
            layoutId={showFace ? `card-${card.id}` : undefined}
            className="absolute bottom-0 origin-bottom"
            style={{
              left: '50%',
              marginLeft: -18,
              zIndex: index,
              transform: `translateX(${tx}px) rotate(${rotate}deg)`,
            }}
            initial={reducedMotion ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: canPlay ? -8 : 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
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
