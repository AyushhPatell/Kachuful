import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { deleteField, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config.js'
import { sessionsRef } from '../../firebase/sessions.js'

const EMOJIS = ['👍', '😂', '🔥', '😤', '🎉', '💀']
const REACTION_TTL_MS = 3500

function useReactions(session, seated, currentUserId) {
  const [floaters, setFloaters] = useState([])
  const seenRef = useRef(new Set())

  useEffect(() => {
    const pending = session?.pendingReactions
    if (!pending) return

    Object.entries(pending).forEach(([id, reaction]) => {
      if (seenRef.current.has(id)) return
      seenRef.current.add(id)

      const seatIndex = seated.findIndex(p => p.id === reaction.userId)
      setFloaters(prev => [...prev, { id, ...reaction, seatIndex }])

      setTimeout(() => {
        setFloaters(prev => prev.filter(f => f.id !== id))
        seenRef.current.delete(id)
      }, REACTION_TTL_MS)
    })
  }, [session?.pendingReactions, seated])

  return floaters
}

export function useEmojiReactions(session, seated, currentUserId) {
  return useReactions(session, seated, currentUserId)
}

export async function sendReaction(sessionCode, userId, emoji) {
  const id = `${userId}_${Date.now()}`
  const ref = sessionsRef(sessionCode)

  await updateDoc(ref, {
    [`pendingReactions.${id}`]: { userId, emoji, sentAt: Date.now() },
  })

  // Self-cleanup after TTL
  setTimeout(() => {
    updateDoc(ref, { [`pendingReactions.${id}`]: deleteField() }).catch(() => {})
  }, REACTION_TTL_MS + 500)
}

export function ReactionFloaters({ floaters, seatPositions }) {
  return (
    <AnimatePresence>
      {floaters.map(floater => {
        const pos = seatPositions?.[floater.seatIndex]
        const x = pos ? `${pos.x}%` : '50%'
        const y = pos ? `${pos.y}%` : '50%'

        return (
          <motion.div
            key={floater.id}
            initial={{ opacity: 1, scale: 0.4, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: 1.3, y: -60 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
            className="pointer-events-none absolute z-50 text-6xl"
            style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
          >
            {floater.emoji}
          </motion.div>
        )
      })}
    </AnimatePresence>
  )
}

export function EmojiPicker({ sessionCode, userId, disabled }) {
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)

  async function handlePick(emoji) {
    if (sending || disabled) return
    setSending(true)
    setOpen(false)
    try {
      await sendReaction(sessionCode, userId, emoji)
    } catch {
      // Never block gameplay on reaction errors
    } finally {
      setTimeout(() => setSending(false), 800)
    }
  }

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => setOpen(o => !o)}
        disabled={disabled || sending}
        className="flex h-9 w-9 items-center justify-center rounded-full text-base disabled:opacity-40"
        style={{
          background: open ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.08)',
          border: open ? '1.5px solid rgba(245,158,11,0.5)' : '1px solid rgba(255,255,255,0.14)',
        }}
        aria-label="Send reaction"
      >
        {sending ? '…' : '😊'}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 4 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="absolute bottom-full left-0 mb-2 flex gap-1.5 rounded-2xl p-2"
            style={{
              background: 'rgba(20,24,19,0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {EMOJIS.map(emoji => (
              <motion.button
                key={emoji}
                whileTap={{ scale: 0.8 }}
                whileHover={{ scale: 1.25 }}
                onClick={() => handlePick(emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-colors hover:bg-white/10"
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
