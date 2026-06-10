import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { isMuted, playSound } from '../../lib/sounds.js'

const DEFAULT_SECONDS = 40
const URGENT_THRESHOLD = 10

export default function TurnTimer({ isActive, resetKey, totalSeconds = DEFAULT_SECONDS, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const expiredRef = useRef(false)
  const lastTickRef = useRef(null)

<<<<<<< HEAD
  // Reset and run the countdown
=======
>>>>>>> 6d43acd (Some Improvements)
  useEffect(() => {
    expiredRef.current = false
    lastTickRef.current = null
    setRemaining(totalSeconds)
    if (!isActive) return undefined
<<<<<<< HEAD

    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, resetKey, totalSeconds])

  // Fire onExpire exactly once when hitting 0
=======
    const interval = setInterval(() => {
      setRemaining(prev => prev <= 1 ? 0 : prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isActive, resetKey, totalSeconds])

>>>>>>> 6d43acd (Some Improvements)
  useEffect(() => {
    if (remaining === 0 && isActive && !expiredRef.current) {
      expiredRef.current = true
      onExpire?.()
    }
  }, [remaining, isActive, onExpire])

<<<<<<< HEAD
  // Tick sound every second during last URGENT_THRESHOLD seconds
  useEffect(() => {
    if (!isActive) return
    if (remaining <= 0 || remaining > URGENT_THRESHOLD) return
    if (lastTickRef.current === remaining) return // already ticked this second
=======
  useEffect(() => {
    if (!isActive || remaining <= 0 || remaining > URGENT_THRESHOLD) return
    if (lastTickRef.current === remaining) return
>>>>>>> 6d43acd (Some Improvements)
    lastTickRef.current = remaining
    if (!isMuted()) playSound('tick')
  }, [remaining, isActive])

  const progress = remaining / totalSeconds
  const isUrgent = remaining <= URGENT_THRESHOLD && isActive
  const circumference = 2 * Math.PI * 13
<<<<<<< HEAD

  const trackColor = 'rgba(255,255,255,0.1)'
=======
>>>>>>> 6d43acd (Some Improvements)
  const arcColor = isUrgent ? '#f87171' : '#f59e0b'

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.75 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.2 }}
<<<<<<< HEAD
        >
          {/* Urgent flash ring */}
=======
          className="relative"
        >
>>>>>>> 6d43acd (Some Improvements)
          <AnimatePresence>
            {isUrgent && (
              <motion.div
                key="urgent-ring"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.55, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: '0 0 12px 4px rgba(248,113,113,0.65)' }}
              />
            )}
          </AnimatePresence>
<<<<<<< HEAD

          <svg width="34" height="34" className="relative overflow-visible">
            {/* Track */}
            <circle
              cx="17" cy="17" r="13"
              fill="none"
              stroke={trackColor}
              strokeWidth="2.5"
            />
            {/* Progress arc */}
            <circle
              cx="17" cy="17" r="13"
              fill="none"
              stroke={arcColor}
              strokeWidth="2.5"
              strokeLinecap="round"
=======
          <svg width="34" height="34" className="relative overflow-visible">
            <circle cx="17" cy="17" r="13" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
            <circle
              cx="17" cy="17" r="13" fill="none"
              stroke={arcColor} strokeWidth="2.5" strokeLinecap="round"
>>>>>>> 6d43acd (Some Improvements)
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              transform="rotate(-90 17 17)"
              style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
            />
<<<<<<< HEAD
            {/* Countdown number */}
            <text
              x="17" y="21.5"
              textAnchor="middle"
              fill={arcColor}
              style={{
                fontSize: remaining >= 10 ? 8.5 : 9.5,
                fontWeight: 700,
                fontFamily: 'Inter, sans-serif',
                transition: 'fill 0.3s',
              }}
            >
=======
            <text x="17" y="21.5" textAnchor="middle" fill={arcColor}
              style={{ fontSize: remaining >= 10 ? 8.5 : 9.5, fontWeight: 700, fontFamily: 'Inter, sans-serif', transition: 'fill 0.3s' }}>
>>>>>>> 6d43acd (Some Improvements)
              {remaining}
            </text>
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
