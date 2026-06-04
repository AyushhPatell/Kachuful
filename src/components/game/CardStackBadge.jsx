import PlayingCard from './PlayingCard.jsx'

export default function CardStackBadge({ count, receiving = false }) {
  if (count <= 0) return null

  return (
    <div
      className={`relative mt-1 flex items-center justify-center ${receiving ? 'scale-105 transition-transform' : ''}`}
    >
      <div className="relative">
        {count > 1 ? (
          <div className="absolute -left-0.5 -top-0.5 scale-90 opacity-60">
            <PlayingCard faceDown small />
          </div>
        ) : null}
        <PlayingCard faceDown small />
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-amber-950 shadow">
          {count}
        </span>
      </div>
    </div>
  )
}
