import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button.jsx'

export default function GameMenu({ sessionCode }) {
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState(null)
  const [copied, setCopied] = useState(false)
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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(sessionCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  function closeMenu() {
    setOpen(false)
    setPanel(null)
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
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-lg text-emerald-100/90 backdrop-blur-sm transition hover:bg-black/50"
      >
        ⋮
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-xl backdrop-blur-md">
          {panel === 'settings' ? (
            <div className="p-4">
              <button
                type="button"
                className="mb-3 text-xs text-zinc-500 hover:text-zinc-300"
                onClick={() => setPanel(null)}
              >
                ← Back
              </button>
              <h3 className="text-sm font-semibold text-zinc-100">Settings</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Sound, themes, and other options will appear here soon.
              </p>
            </div>
          ) : panel === 'code' ? (
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
              <p className="mt-2 text-[11px] text-zinc-500">
                Share this code so players can rejoin after leaving.
              </p>
              <Button className="mt-3 w-full text-sm" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy code'}
              </Button>
            </div>
          ) : (
            <ul className="py-1 text-sm">
              <li>
                <button
                  type="button"
                  className="flex w-full px-4 py-3 text-left text-zinc-200 hover:bg-white/5"
                  onClick={() => setPanel('code')}
                >
                  Show session code
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="flex w-full px-4 py-3 text-left text-zinc-200 hover:bg-white/5"
                  onClick={() => setPanel('settings')}
                >
                  Settings
                </button>
              </li>
              <li className="border-t border-white/10">
                <button
                  type="button"
                  className="flex w-full px-4 py-2.5 text-left text-xs text-zinc-500 hover:bg-white/5"
                  onClick={closeMenu}
                >
                  Close
                </button>
              </li>
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
