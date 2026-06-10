import PlayingCard from './PlayingCard.jsx'

export default function CardStackBadge({ count, receiving = false }) {
  if (count <= 0) return null

  const visible = Math.min(count, 3)

  return (
    <div
      className={`relative mt-1.5 flex items-end justify-center ${receiving ? 'scale-110 transition-transform duration-200' : ''}`}
    >
      <div className="relative flex items-end">
        {Array.from({ length: visible }, (_, i) => (
          <div
            key={i}
            className="relative"
            style={{
              marginLeft: i === 0 ? 0 : -14,
              zIndex: i,
              transform: `rotate(${(i - 1) * 6}deg)`,
            }}
          >
            <PlayingCard faceDown small />
          </div>
        ))}
        <span className="absolute -right-3 -top-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-950 shadow-md">
          {count}
        </span>
      </div>
    </div>
  )
}
