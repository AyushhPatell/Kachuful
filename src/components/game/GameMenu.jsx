import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button.jsx'
import { isMuted, setMuted } from '../../lib/sounds.js'

export default function GameMenu({ sessionCode, onLeave }) {
  const [open, setOpen] = useState(false)
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

  function handleToggleMute() {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

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
    </div>
  )
}
