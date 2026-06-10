import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { isMuted, setMuted } from '../../lib/sounds.js'

export default function GameMenu({ sessionCode, onLeave }) {
  const [open, setOpen] = useState(false)
  const [muted, setMutedState] = useState(() => isMuted())

  function handleToggleMute() {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 hover:text-white"
        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)' }}
        aria-label="Game menu"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="2.5" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13.5" r="1.5" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="menu"
              initial={{ opacity: 0, scale: 0.9, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -6 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-10 z-50 min-w-[160px] overflow-hidden rounded-xl py-1 shadow-2xl"
              style={{ background: 'rgba(18,22,18,0.97)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}
            >
              <button
                onClick={() => { handleToggleMute(); setOpen(false) }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/8 transition-colors"
              >
                <span className="text-base">{muted ? '🔇' : '🔊'}</span>
                <span>{muted ? 'Unmute sounds' : 'Mute sounds'}</span>
              </button>
              <div className="mx-3 my-1 h-px bg-white/10" />
              <button
                onClick={() => { navigator.clipboard?.writeText(sessionCode); setOpen(false) }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/8 transition-colors"
              >
                <span className="text-base">📋</span>
                <span>Copy room code</span>
              </button>
              <button
                onClick={() => { setOpen(false); onLeave?.() }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-300 hover:bg-white/8 transition-colors"
              >
                <span className="text-base">🚪</span>
                <span>Leave game</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
