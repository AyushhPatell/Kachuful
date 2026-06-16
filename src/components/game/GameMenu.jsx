import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { isMuted, setMuted } from '../../lib/sounds.js'

// Sub-views inside the menu panel
const VIEW_MAIN        = 'main'
const VIEW_CODE        = 'code'
const VIEW_CONFIRM     = 'confirm'
const VIEW_END_CONFIRM = 'end-confirm'

export default function GameMenu({ sessionCode, onLeave, isOwner = false, voteActive = false, onInitiateEndVote }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(VIEW_MAIN)
  const [muted, setMutedState] = useState(() => isMuted())
  const [copied, setCopied] = useState(false)
  const [endingBusy, setEndingBusy] = useState(false)

  function handleOpen() {
    setView(VIEW_MAIN)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    // Reset sub-view after fade out
    setTimeout(() => setView(VIEW_MAIN), 200)
  }

  function handleToggleMute() {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

  function handleCopyCode() {
    navigator.clipboard?.writeText(sessionCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleConfirmEndSession() {
    setEndingBusy(true)
    try {
      await onInitiateEndVote?.()
      handleClose()
    } catch {
      // surfaced via the vote banner if it fails to start
    } finally {
      setEndingBusy(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
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
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={handleClose}
            />

            {/* Panel */}
            <motion.div
              key="menu"
              initial={{ opacity: 0, scale: 0.9, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -6 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-xl shadow-2xl"
              style={{
                background: 'rgba(14,18,14,0.97)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <AnimatePresence mode="wait">
                {/* ── MAIN VIEW ── */}
                {view === VIEW_MAIN && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.12 }}
                    className="py-1"
                  >
                    <button
                      onClick={() => { handleToggleMute() }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/8"
                    >
                      <span className="text-base">{muted ? '🔇' : '🔊'}</span>
                      <span>{muted ? 'Unmute sounds' : 'Mute sounds'}</span>
                    </button>

                    <div className="mx-3 my-1 h-px bg-white/10" />

                    <button
                      onClick={() => setView(VIEW_CODE)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/8"
                    >
                      <span className="text-base">🎟️</span>
                      <span>Session code</span>
                      <span className="ml-auto text-zinc-500">›</span>
                    </button>

                    {isOwner && !voteActive && (
                      <>
                        <div className="mx-3 my-1 h-px bg-white/10" />
                        <button
                          onClick={() => setView(VIEW_END_CONFIRM)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-amber-300 transition-colors hover:bg-white/8"
                        >
                          <span className="text-base">🛑</span>
                          <span>End session</span>
                        </button>
                      </>
                    )}

                    <div className="mx-3 my-1 h-px bg-white/10" />

                    <button
                      onClick={() => setView(VIEW_CONFIRM)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-300 transition-colors hover:bg-white/8"
                    >
                      <span className="text-base">🚪</span>
                      <span>Leave game</span>
                    </button>
                  </motion.div>
                )}

                {/* ── SESSION CODE VIEW ── */}
                {view === VIEW_CODE && (
                  <motion.div
                    key="code"
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.12 }}
                    className="p-4"
                  >
                    <button
                      onClick={() => setView(VIEW_MAIN)}
                      className="mb-3 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      ‹ Back
                    </button>
                    <p className="mb-2 text-center text-[10px] uppercase tracking-widest text-zinc-500">
                      Room code
                    </p>
                    <p
                      className="mb-3 text-center font-mono text-3xl font-bold tracking-[0.2em] text-amber-300"
                      style={{ fontFamily: 'Cinzel, serif' }}
                    >
                      {sessionCode}
                    </p>
                    <button
                      onClick={handleCopyCode}
                      className="w-full rounded-lg py-2 text-xs font-semibold transition-colors"
                      style={{
                        background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
                        color: copied ? '#86efac' : '#d4d4d8',
                        border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      {copied ? '✓ Copied!' : 'Copy code'}
                    </button>
                  </motion.div>
                )}

                {/* ── LEAVE CONFIRMATION VIEW ── */}
                {view === VIEW_CONFIRM && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.12 }}
                    className="p-4"
                  >
                    <p className="mb-1 text-center text-sm font-semibold text-zinc-100">Leave game?</p>
                    <p className="mb-4 text-center text-xs text-zinc-500">
                      You can rejoin with the same code.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setView(VIEW_MAIN)}
                        className="flex-1 rounded-lg py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/8"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { handleClose(); onLeave?.() }}
                        className="flex-1 rounded-lg py-2 text-xs font-bold text-white transition-colors"
                        style={{ background: 'rgba(239,68,68,0.8)', border: '1px solid rgba(239,68,68,0.4)' }}
                      >
                        Leave
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── END SESSION CONFIRMATION VIEW ── */}
                {view === VIEW_END_CONFIRM && (
                  <motion.div
                    key="end-confirm"
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.12 }}
                    className="p-4"
                  >
                    <p className="mb-1 text-center text-sm font-semibold text-zinc-100">End session for everyone?</p>
                    <p className="mb-4 text-center text-xs text-zinc-500">
                      This starts a vote. The game ends as soon as a majority of players agree.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setView(VIEW_MAIN)}
                        className="flex-1 rounded-lg py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/8"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmEndSession}
                        disabled={endingBusy}
                        className="flex-1 rounded-lg py-2 text-xs font-bold text-white transition-colors disabled:opacity-40"
                        style={{ background: 'rgba(245,158,11,0.85)', border: '1px solid rgba(245,158,11,0.4)' }}
                      >
                        {endingBusy ? 'Starting…' : 'Start vote'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
