import PlayingCard from './PlayingCard.jsx'

const LAYER_GAP = 14

/** Opponent hand: each card offset so backs are visibly separate. */
export default function CardStackBadge({ count, receiving = false }) {
  if (count <= 0) return null

  const layers = Math.min(count, 4)

  return (
    <div
      className={`relative mt-1 flex items-end justify-center ${receiving ? 'scale-105 transition-transform' : ''}`}
      style={{
        width: 36 + (layers - 1) * LAYER_GAP,
        height: 52,
      }}
    >
      {Array.from({ length: layers }, (_, i) => (
        <div
          key={i}
          className="absolute bottom-0 shrink-0"
          style={{
            left: i * LAYER_GAP,
            zIndex: i,
          }}
        >
          <PlayingCard faceDown small />
        </div>
      ))}
      <span className="absolute -right-2 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-amber-950 shadow">
        {count}
      </span>
    </div>
  )
}
