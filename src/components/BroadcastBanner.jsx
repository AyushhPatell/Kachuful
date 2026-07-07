import { useEffect, useState } from 'react'
import { subscribeToBroadcast } from '../lib/admin.js'

// Global banner driven by the admin panel (system/broadcast). Mounted app-wide.
// type 'reload' shows a reload button; 'info' is a plain announcement.
export default function BroadcastBanner() {
  const [bc, setBc] = useState(null)
  const [dismissedAt, setDismissedAt] = useState(0)

  useEffect(() => subscribeToBroadcast(setBc), [])

  const isReload = bc?.type === 'reload'
  const message =
    bc?.message?.trim() || (isReload ? 'A new version is available — please reload.' : '')

  if (!bc?.active || !message) return null
  if (bc.at && bc.at === dismissedAt) return null

  return (
    <div
      className="fixed inset-x-0 top-0 z-[80] flex items-center justify-center gap-3 px-4 py-2 text-center"
      style={{
        background: isReload
          ? 'linear-gradient(135deg, #fcd34d, #f59e0b)'
          : 'rgba(20,28,45,0.97)',
        borderBottom: isReload ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(99,102,241,0.4)',
        boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
      }}
    >
      <span className={`text-[13px] font-semibold ${isReload ? 'text-amber-950' : 'text-indigo-100'}`}>
        {isReload ? '⚠️ ' : '📢 '}
        {message}
      </span>
      {isReload && (
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-full px-3 py-1 text-[12px] font-bold text-amber-100"
          style={{ background: 'rgba(0,0,0,0.55)' }}
        >
          ↻ Reload
        </button>
      )}
      <button
        onClick={() => setDismissedAt(bc.at)}
        aria-label="Dismiss"
        className={`shrink-0 rounded-full px-2 py-0.5 text-sm ${isReload ? 'text-amber-950/70' : 'text-indigo-300'}`}
      >
        ✕
      </button>
    </div>
  )
}
