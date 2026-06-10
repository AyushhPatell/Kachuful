<<<<<<< HEAD
import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button.jsx'
=======
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
>>>>>>> 6d43acd (Some Improvements)
import { isMuted, setMuted } from '../../lib/sounds.js'

export default function GameMenu({ sessionCode, onLeave }) {
  const [open, setOpen] = useState(false)
<<<<<<< HEAD
  const [panel, setPanel] = useState(null)
  const [copied, setCopied] = useState(false)
  const [muted, setMutedState] = useState(() => isMuted())
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
        setPanel(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])
=======
  const [muted, setMutedState] = useState(() => isMuted())
>>>>>>> 6d43acd (Some Improvements)

  function handleToggleMute() {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

<<<<<<< HEAD
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(sessionCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div ref={rootRef} className="relative z-30">
      <button
        type="button"
        aria-label="Game menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v)
          setPanel(null)
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-lg text-emerald-100/90 backdrop-blur-sm transition hover:bg-black/55"
      >
        ⋮
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-md">
          {panel === 'code' ? (
            <div className="p-4">
              <button
                type="button"
                className="mb-3 text-xs text-zinc-500 hover:text-zinc-300"
                onClick={() => setPanel(null)}
              >
                ← Back
              </button>
              <p className="text-xs text-zinc-500">Session code</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-amber-200">
                {sessionCode}
              </p>
              <Button className="mt-3 w-full text-sm" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy code'}
              </Button>
            </div>
          ) : panel === 'leave' ? (
            <div className="p-4">
              <button
                type="button"
                className="mb-3 text-xs text-zinc-500 hover:text-zinc-300"
                onClick={() => setPanel(null)}
              >
                ← Back
              </button>
              <p className="text-sm text-zinc-200">Leave this session?</p>
              <p className="mt-2 text-xs text-zinc-500">Your progress stays on the table.</p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" className="flex-1 text-sm" onClick={() => setPanel(null)}>
                  Stay
                </Button>
                <Button className="flex-1 text-sm" onClick={() => onLeave?.()}>
                  Leave
                </Button>
              </div>
            </div>
          ) : (
            <ul className="py-1 text-sm">
              <li>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-zinc-200 hover:bg-white/5"
                  onClick={handleToggleMute}
                >
                  <span className="text-base">{muted ? '🔇' : '🔊'}</span>
                  <span>{muted ? 'Sound off' : 'Sound on'}</span>
                  <span className="ml-auto text-xs text-zinc-500">{muted ? 'Tap to unmute' : 'Tap to mute'}</span>
                </button>
              </li>
              <li className="border-t border-white/5">
                <button
                  type="button"
                  className="flex w-full px-4 py-3 text-left text-zinc-200 hover:bg-white/5"
                  onClick={() => setPanel('code')}
                >
                  Session code
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="flex w-full px-4 py-3 text-left text-red-300 hover:bg-white/5"
                  onClick={() => setPanel('leave')}
                >
                  Leave session
                </button>
              </li>
            </ul>
          )}
        </div>
      ) : null}
=======
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
              {/* Sound toggle */}
              <button
                onClick={() => { handleToggleMute(); setOpen(false) }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/8 transition-colors"
              >
                <span className="text-base">{muted ? '🔇' : '🔊'}</span>
                <span>{muted ? 'Unmute sounds' : 'Mute sounds'}</span>
              </button>

              <div className="mx-3 my-1 h-px bg-white/10" />

              {/* Copy code */}
              <button
                onClick={() => { navigator.clipboard?.writeText(sessionCode); setOpen(false) }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/8 transition-colors"
              >
                <span className="text-base">📋</span>
                <span>Copy room code</span>
              </button>

              {/* Leave */}
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
>>>>>>> 6d43acd (Some Improvements)
    </div>
  )
}
