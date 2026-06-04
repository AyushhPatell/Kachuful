import PlayingCard from './PlayingCard.jsx'

/** Opponent hand: fanned mini backs so multiple cards are visible, plus total count. */
export default function CardStackBadge({ count, receiving = false }) {
  if (count <= 0) return null

  const layers = Math.min(count, 4)
  const fanWidth = 28 + (layers - 1) * 12

  return (
    <div
      className={`relative mt-1 flex items-end justify-center ${receiving ? 'scale-105 transition-transform' : ''}`}
      style={{ width: fanWidth, height: 52 }}
    >
      {Array.from({ length: layers }, (_, i) => {
        const offset = i - (layers - 1) / 2
        return (
          <div
            key={i}
            className="absolute bottom-0"
            style={{
              left: 8 + i * 10,
              zIndex: i,
              transform: `rotate(${offset * 5}deg)`,
            }}
          >
            <PlayingCard faceDown small />
          </div>
        )
      })}
      <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-amber-950 shadow">
        {count}
      </span>
    </div>
  )
}
