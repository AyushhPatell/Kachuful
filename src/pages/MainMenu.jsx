import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GoogleSignInButton } from '../components/ui/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { ensureSignedIn, signInWithGoogle, signOutUser } from '../firebase/auth.js'
import { createSession, requestJoinSession } from '../firebase/sessions.js'
import { isValidSessionCode, normalizeSessionCode } from '../lib/sessionCode.js'
import { unlockAudio } from '../lib/sounds.js'

const SUITS = [
  { sym: '♠', top: '8%',  left: '5%',  size: '5rem', delay: '0s',    r: '-18deg' },
  { sym: '♥', top: '15%', left: '82%', size: '4rem', delay: '1.2s',  r: '12deg'  },
  { sym: '♦', top: '65%', left: '88%', size: '6rem', delay: '0.6s',  r: '25deg'  },
  { sym: '♣', top: '72%', left: '3%',  size: '5rem', delay: '2s',    r: '-8deg'  },
  { sym: '♠', top: '40%', left: '90%', size: '3rem', delay: '1.8s',  r: '5deg'   },
  { sym: '♥', top: '48%', left: '2%',  size: '3.5rem',delay: '0.9s', r: '-22deg' },
]

export default function MainMenu() {
  const navigate = useNavigate()
  const { user, displayName, isSignedIn, authReady, authTimedOut, isFirebaseConfigured, setLoading, setError } = useAuth()
  const [joinCode, setJoinCode] = useState('')
  const [localError, setLocalError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleGoogleSignIn() {
    if (!isFirebaseConfigured) {
      setLocalError('Server config missing. Check your .env file and restart.')
      return
    }
    unlockAudio()
    setBusy(true); setLocalError(''); setError(null); setLoading(true)
    try { await signInWithGoogle() }
    catch (err) { setLocalError(err.message) }
    finally { setBusy(false); setLoading(false) }
  }

  async function handleSignOut() {
    setBusy(true)
    try { await signOutUser(); setJoinCode('') }
    finally { setBusy(false) }
  }

  async function handleCreateSession() {
    unlockAudio()
    setBusy(true); setLocalError('')
    try {
      await ensureSignedIn()
      const code = await createSession(displayName)
      navigate(`/lobby/${code}`)
    } catch (err) { setLocalError(err.message) }
    finally { setBusy(false) }
  }

  async function handleJoinSession() {
    const code = normalizeSessionCode(joinCode)
    if (!isValidSessionCode(code)) { setLocalError('Enter a valid 6-character session code.'); return }
    unlockAudio()
    setBusy(true); setLocalError('')
    try {
      await ensureSignedIn()
      const result = await requestJoinSession(code, displayName)
      if (result.alreadyJoined || result.pending) navigate(`/lobby/${code}`)
    } catch (err) { setLocalError(err.message) }
    finally { setBusy(false) }
  }

  if (!authReady) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted">Loading…</p>
        {authTimedOut && (
          <>
            <p className="max-w-xs text-xs text-zinc-500">
              This is taking longer than usual. If it doesn't finish in a few seconds, reload.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-200"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
            >
              Reload
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="relative min-h-svh overflow-hidden" onClick={unlockAudio}>
      {/* Floating suit decorations */}
      {SUITS.map((s, i) => (
        <div
          key={i}
          className="suit-float pointer-events-none absolute select-none"
          style={{
            top: s.top, left: s.left, fontSize: s.size,
            animationDelay: s.delay, animationDuration: `${5.5 + i * 0.7}s`,
            '--r': s.r,
            color: s.sym === '♥' || s.sym === '♦' ? '#dc2626' : '#f0f2ee',
          }}
        >
          {s.sym}
        </div>
      ))}

      <div className="relative mx-auto flex min-h-svh w-full max-w-lg flex-col items-center justify-center gap-5 px-5 py-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <div className="mb-2 flex items-center justify-center gap-3">
            <span className="text-2xl text-red-500">♥</span>
            <span className="text-2xl text-zinc-200">♠</span>
            <span className="text-2xl text-red-500">♦</span>
            <span className="text-2xl text-zinc-200">♣</span>
          </div>
          <h1
            className="text-5xl font-bold tracking-wide sm:text-6xl"
            style={{
              fontFamily: 'Cinzel, serif',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 45%, #d97706 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 10px rgba(245,158,11,0.35))',
            }}
          >
            Kachuful
          </h1>
          <p className="mt-1.5 text-[11px] uppercase tracking-[0.3em] text-zinc-600">
            The Calling Card Game
          </p>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="w-full space-y-3"
        >
          {!isSignedIn ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{
                background: 'rgba(24,28,23,0.88)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(14px)',
              }}
            >
              <p className="mb-5 text-sm text-zinc-400">Sign in to create or join a game.</p>
              <GoogleSignInButton onClick={handleGoogleSignIn} disabled={!isFirebaseConfigured} busy={busy} />
              {localError && (
                <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{localError}</p>
              )}
            </div>
          ) : (
            <>
              {/* User info */}
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: 'rgba(24,28,23,0.88)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-10 w-10 rounded-full object-cover shadow-md" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-700/55 text-sm font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">{displayName}</p>
                  <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={busy}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Sign out
                </button>
              </div>

              {localError && (
                <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{localError}</p>
              )}

              {/* Create */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(24,28,23,0.88)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={busy}
                  onClick={handleCreateSession}
                  className="w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #c9963a, #a67828)',
                    boxShadow: '0 4px 20px rgba(201,150,58,0.32)',
                  }}
                >
                  Create Game
                </motion.button>
              </div>

              {/* Join */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(24,28,23,0.88)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                <label className="mb-2 block text-xs text-zinc-500" htmlFor="code">
                  Join with session code
                </label>
                <input
                  id="code"
                  value={joinCode}
                  onChange={e => setJoinCode(normalizeSessionCode(e.target.value))}
                  placeholder="K7X2MQ"
                  maxLength={6}
                  className="w-full rounded-xl bg-white/5 px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.3em] text-amber-200 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-amber-500/50"
                  style={{ border: '1.5px solid rgba(255,255,255,0.08)' }}
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={busy}
                  onClick={handleJoinSession}
                  className="mt-3 w-full rounded-xl py-3 text-sm font-semibold text-zinc-200 disabled:opacity-40"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  Join Session
                </motion.button>
              </div>

              <button
                onClick={() => navigate('/history')}
                className="w-full py-2 text-sm text-zinc-600 transition-colors hover:text-zinc-400"
              >
                View Session History
              </button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
