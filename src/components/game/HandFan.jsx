import { motion } from 'framer-motion'
import PlayingCard from './PlayingCard.jsx'

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
  const maxSpread = Math.min(count, 9)
  const center = (maxSpread - 1) / 2
  const stepDeg = count <= 4 ? 10 : count <= 6 ? 8 : 6
  const stepPx = count <= 4 ? 34 : count <= 6 ? 28 : 22

  return (
    <div
      className={`relative mx-auto flex h-[7.5rem] w-full max-w-lg items-end justify-center pb-1 sm:h-32 ${dimmed ? 'opacity-40' : ''}`}
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
            layoutId={showFace ? `card-${card.id}` : undefined}
            className="absolute bottom-0 origin-bottom"
            style={{ zIndex: index, transform: `translateX(${tx}px) rotate(${rotate}deg)` }}
            initial={reducedMotion ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: canPlay ? -6 : 0 }}
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
