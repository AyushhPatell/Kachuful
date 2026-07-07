import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PlayerAvatar from '../components/game/PlayerAvatar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useIsAdmin } from '../hooks/useIsAdmin.js'
import {
  clearBroadcast,
  deleteSession,
  forceEndSession,
  getSessionDetail,
  grantAdmin,
  kickPlayer,
  listGrantedAdmins,
  listSessions,
  markPlayerOffline,
  nudgeSession,
  recomputeScores,
  resetPlayerName,
  revokeAdmin,
  setBroadcast,
  subscribeToBroadcast,
} from '../lib/admin.js'

function ago(ms) {
  if (!ms) return '—'
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

const STATUS_COLOR = {
  active: '#34d399',
  lobby: '#fbbf24',
  ended: '#71717a',
}

export default function Admin() {
  const { user } = useAuth()
  const isAdmin = useIsAdmin()

  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [admins, setAdmins] = useState([])
  const [grantId, setGrantId] = useState('')
  const [bcMessage, setBcMessage] = useState('')
  const [bcType, setBcType] = useState('info')
  const [liveBroadcast, setLiveBroadcast] = useState(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const refreshSessions = useCallback(async () => {
    setLoading(true)
    try {
      setSessions(await listSessions())
    } catch (err) {
      setStatus(`Couldn't load sessions: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshAdmins = useCallback(async () => {
    try {
      setAdmins(await listGrantedAdmins())
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return undefined
    refreshSessions()
    refreshAdmins()
    return subscribeToBroadcast(setLiveBroadcast)
  }, [isAdmin, refreshSessions, refreshAdmins])

  async function toggleInspect(code) {
    if (expanded === code) {
      setExpanded(null)
      setDetail(null)
      return
    }
    setExpanded(code)
    setDetail(null)
    setDetailLoading(true)
    try {
      setDetail(await getSessionDetail(code))
    } finally {
      setDetailLoading(false)
    }
  }

  async function run(label, fn, { confirm } = {}) {
    if (confirm && !window.confirm(confirm)) return
    setBusy(true)
    setStatus('')
    try {
      await fn()
      setStatus(`✓ ${label}`)
      await refreshSessions()
      if (expanded) setDetail(await getSessionDetail(expanded))
    } catch (err) {
      setStatus(`✗ ${label}: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const stats = useMemo(() => {
    const live = sessions.filter((s) => s.status === 'active' || s.status === 'lobby')
    const playersOnline = sessions.reduce((n, s) => n + s.activeCount, 0)
    const today = sessions.filter((s) => s.createdAt && Date.now() - s.createdAt < 86_400_000).length
    return { live: live.length, playersOnline, today, total: sessions.length }
  }, [sessions])

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-2xl font-bold text-amber-300" style={{ fontFamily: 'Cinzel, serif' }}>
          Admin
        </h1>
        <p className="text-sm text-zinc-400">
          {user ? 'This account is not an admin.' : 'Sign in with an admin account.'}
        </p>
        <p className="text-[11px] text-zinc-600">
          Just granted access? Reload this page. Your user ID:{' '}
          <span className="font-mono text-zinc-400">{user?.uid ?? '—'}</span>
        </p>
        <Link to="/" className="mt-2 rounded-lg bg-white/8 px-4 py-2 text-sm text-zinc-200">
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-300" style={{ fontFamily: 'Cinzel, serif' }}>
            Admin
          </h1>
          <p className="text-[11px] text-zinc-500">{user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshSessions}
            className="rounded-lg bg-white/8 px-3 py-1.5 text-xs font-semibold text-zinc-200"
          >
            ↻ Refresh
          </button>
          <Link to="/" className="rounded-lg bg-white/8 px-3 py-1.5 text-xs font-semibold text-zinc-200">
            Home
          </Link>
        </div>
      </div>

      {status && (
        <div className="mb-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-300">{status}</div>
      )}

      {/* Dashboard */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: 'Live games', value: stats.live },
          { label: 'Players online', value: stats.playersOnline },
          { label: 'Started (24h)', value: stats.today },
          { label: 'Total sessions', value: stats.total },
        ].map((m) => (
          <div key={m.label} className="rounded-xl bg-white/[0.04] px-3 py-2.5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{m.label}</p>
            <p className="mt-0.5 text-2xl font-bold text-amber-200">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Broadcast */}
      <Section title="Broadcast to all players">
        <div className="flex flex-col gap-2">
          <textarea
            value={bcMessage}
            onChange={(e) => setBcMessage(e.target.value)}
            rows={2}
            placeholder="Message shown to everyone (leave empty for a plain reload prompt)…"
            className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bcType}
              onChange={(e) => setBcType(e.target.value)}
              className="rounded-lg bg-black/30 px-2.5 py-1.5 text-xs text-zinc-200"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <option value="info">Info</option>
              <option value="reload">Reload prompt</option>
            </select>
            <button
              disabled={busy}
              onClick={() => run('Broadcast sent', () => setBroadcast({ message: bcMessage, type: bcType }))}
              className="rounded-lg bg-amber-500/85 px-3 py-1.5 text-xs font-bold text-amber-950 disabled:opacity-40"
            >
              Send
            </button>
            <button
              disabled={busy}
              onClick={() => run('Broadcast cleared', () => clearBroadcast())}
              className="rounded-lg bg-white/8 px-3 py-1.5 text-xs font-semibold text-zinc-200 disabled:opacity-40"
            >
              Clear
            </button>
            {liveBroadcast?.active && (
              <span className="text-[11px] text-emerald-400">
                Live: {liveBroadcast.type === 'reload' ? 'reload prompt' : `“${liveBroadcast.message}”`}
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* Sessions */}
      <Section title={`Sessions (${sessions.length})`}>
        {loading ? (
          <p className="py-4 text-center text-sm text-zinc-500">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">No sessions.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s) => {
              const stale =
                s.currentTurnStartedAt && Date.now() - s.currentTurnStartedAt > 90_000 && s.status === 'active'
              return (
                <div key={s.code} className="rounded-xl bg-white/[0.03] p-3" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-sm font-bold text-amber-200">{s.code}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: `${STATUS_COLOR[s.status] ?? '#71717a'}22`, color: STATUS_COLOR[s.status] ?? '#a1a1aa' }}
                    >
                      {s.status}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {s.activeCount}/{s.playerCount} active · R{s.currentRound}
                    </span>
                    {stale && <span className="text-[11px] font-semibold text-red-400">⚠ turn stuck {ago(s.currentTurnStartedAt)}</span>}
                    <span className="ml-auto text-[10px] text-zinc-600">{ago(s.createdAt)}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <ActBtn onClick={() => toggleInspect(s.code)}>{expanded === s.code ? 'Hide' : 'Inspect'}</ActBtn>
                    <ActBtn disabled={busy} onClick={() => run('Nudged', () => nudgeSession(s.code))}>Nudge</ActBtn>
                    <ActBtn disabled={busy} onClick={() => run('Scores recomputed', () => recomputeScores(s.code))}>Recompute</ActBtn>
                    <ActBtn disabled={busy} danger onClick={() => run('Session ended', () => forceEndSession(s.code), { confirm: `End session ${s.code} for everyone?` })}>Force end</ActBtn>
                    <ActBtn disabled={busy} danger onClick={() => run('Session deleted', () => deleteSession(s.code), { confirm: `Permanently delete ${s.code} and all its data?` })}>Delete</ActBtn>
                  </div>

                  {expanded === s.code && (
                    <div className="mt-3 border-t border-white/5 pt-3">
                      {detailLoading || !detail ? (
                        <p className="text-xs text-zinc-500">Loading players…</p>
                      ) : (
                        <>
                          <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">
                            {detail.roundCount} rounds · current turn: {detail.session.currentTurn ?? '—'}
                          </p>
                          <div className="flex flex-col gap-2">
                            {detail.players.map((p) => (
                              <div key={p.id} className="flex flex-wrap items-center gap-2">
                                <PlayerAvatar name={p.name} photoURL={p.photoURL} size="sm" />
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium text-zinc-200">
                                    {p.name}
                                    {p.id === detail.session.ownerId && <span className="ml-1 text-[9px] text-amber-400">host</span>}
                                    {p.kicked && <span className="ml-1 text-[9px] text-red-500">kicked</span>}
                                  </p>
                                  <p className="text-[10px] text-zinc-500">
                                    {p.status} · seen {ago(p.lastSeenAt)} · {p.foreground ? 'foreground' : 'background'} · score {p.sessionScore ?? 0}
                                  </p>
                                </div>
                                <div className="ml-auto flex gap-1">
                                  <MiniBtn disabled={busy} onClick={() => run('Marked offline', () => markPlayerOffline(s.code, p.id))}>Offline</MiniBtn>
                                  <MiniBtn disabled={busy} onClick={() => {
                                    const name = window.prompt('New name', p.name)
                                    if (name != null) run('Name reset', () => resetPlayerName(s.code, p.id, name))
                                  }}>Rename</MiniBtn>
                                  <MiniBtn disabled={busy} danger onClick={() => run('Player kicked', () => kickPlayer(s.code, p.id), { confirm: `Kick ${p.name}?` })}>Kick</MiniBtn>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Admin management */}
      <Section title="Admins">
        <p className="mb-2 text-[11px] text-zinc-500">
          Bootstrap admin (by email) is always active and can't be revoked here. Grant others by their user ID.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            value={grantId}
            onChange={(e) => setGrantId(e.target.value)}
            placeholder="User ID to grant admin"
            className="min-w-0 flex-1 rounded-lg bg-black/30 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <button
            disabled={busy || !grantId.trim()}
            onClick={() => run('Admin granted', async () => { await grantAdmin(grantId); setGrantId('') }).then(refreshAdmins)}
            className="rounded-lg bg-amber-500/85 px-3 py-1.5 text-xs font-bold text-amber-950 disabled:opacity-40"
          >
            Grant
          </button>
        </div>
        {admins.length === 0 ? (
          <p className="text-xs text-zinc-600">No additional admins granted.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {admins.map((a) => (
              <div key={a.uid} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-300">{a.uid}</span>
                <MiniBtn disabled={busy} danger onClick={() => run('Admin revoked', async () => { await revokeAdmin(a.uid) }).then(refreshAdmins)}>Revoke</MiniBtn>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-5 rounded-2xl bg-white/[0.02] p-4" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</h2>
      {children}
    </div>
  )
}

function ActBtn({ children, onClick, disabled, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40 ${
        danger ? 'text-red-300' : 'text-zinc-200'
      }`}
      style={{
        background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)'}`,
      }}
    >
      {children}
    </button>
  )
}

function MiniBtn({ children, onClick, disabled, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold disabled:opacity-40 ${
        danger ? 'text-red-300' : 'text-zinc-300'
      }`}
      style={{ background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)' }}
    >
      {children}
    </button>
  )
}
