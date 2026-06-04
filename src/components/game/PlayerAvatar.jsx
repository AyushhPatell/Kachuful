function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const COLORS = [
  'bg-rose-600',
  'bg-amber-600',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-violet-600',
  'bg-orange-600',
  'bg-teal-600',
]

function colorForName(name) {
  let hash = 0
  for (let i = 0; i < (name ?? '').length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function PlayerAvatar({ name, photoURL, size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-8 w-8 text-[10px] ring-2',
    md: 'h-10 w-10 text-xs ring-2',
    lg: 'h-12 w-12 text-sm ring-[3px]',
  }
  const ring = 'ring-amber-900/40'

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt=""
        className={`${sizes[size]} ${ring} shrink-0 rounded-full object-cover shadow-md ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizes[size]} ${ring} flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-md ${colorForName(name)} ${className}`}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
