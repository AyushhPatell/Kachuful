import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TURN_SECONDS = 30

export default function TurnTimer({ isActive, resetKey }) {
  const [remaining, setRemaining] = useState(TURN_SECONDS)

  useEffect(() => {
    setRemaining(TURN_SECONDS)
    if (!isActive) return undefined
    const interval = setInterval(() => {
      setRemaining(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [isActive, resetKey])

  const progress = remaining / TURN_SECONDS
  const isUrgent = remaining <= 10
  const circumference = 2 * Math.PI * 11

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.2 }}
        >
          <svg width="30" height="30" className="overflow-visible">
            {/* Track */}
            <circle
              cx="15" cy="15" r="11"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2.5"
            />
            {/* Progress arc */}
            <circle
              cx="15" cy="15" r="11"
              fill="none"
              stroke={isUrgent ? '#f87171' : '#f59e0b'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              transform="rotate(-90 15 15)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
            {/* Number */}
            <text
              x="15" y="19"
              textAnchor="middle"
              fill={isUrgent ? '#f87171' : '#f59e0b'}
              style={{ fontSize: 8, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
            >
              {remaining}
            </text>
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
