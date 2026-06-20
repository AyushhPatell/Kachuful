import { useState } from 'react'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const COLORS = [
  '#be123c',
  '#b45309',
  '#047857',
  '#0369a1',
  '#6d28d9',
  '#c2410c',
  '#0f766e',
]

function colorForName(name) {
  let hash = 0
  for (let i = 0; i < (name ?? '').length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function PlayerAvatar({ name, photoURL, size = 'md', glow = false, ringColor = null, className = '' }) {
  const [imgFailed, setImgFailed] = useState(false)
  const sizes = {
    sm: { box: 'h-8 w-8', text: 'text-[10px]' },
    md: { box: 'h-10 w-10', text: 'text-xs' },
    lg: { box: 'h-12 w-12', text: 'text-sm' },
    xl: { box: 'h-14 w-14', text: 'text-base' },
  }
  const s = sizes[size] ?? sizes.md

  const glowStyle = glow
    ? { boxShadow: '0 0 0 2.5px rgba(245,158,11,0.95), 0 0 14px rgba(245,158,11,0.5)' }
    : ringColor
    ? { boxShadow: `0 0 0 2.5px ${ringColor}, 0 2px 8px rgba(0,0,0,0.45)` }
    : { boxShadow: '0 2px 8px rgba(0,0,0,0.45)' }

  if (photoURL && !imgFailed) {
    return (
      <img
        src={photoURL}
        alt=""
        onError={() => setImgFailed(true)}
        className={`${s.box} shrink-0 rounded-full object-cover transition-shadow duration-300 ${className}`}
        style={glowStyle}
      />
    )
  }

  return (
    <div
      className={`${s.box} ${s.text} flex shrink-0 items-center justify-center rounded-full font-bold text-white transition-shadow duration-300 ${className}`}
      style={{ background: colorForName(name), ...glowStyle }}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
