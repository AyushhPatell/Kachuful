import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout.jsx'
import Button, { GoogleSignInButton } from '../components/ui/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { ensureSignedIn, signInWithGoogle, signOutUser } from '../firebase/auth.js'
import { createSession, requestJoinSession } from '../firebase/sessions.js'
import { isValidSessionCode, normalizeSessionCode } from '../lib/sessionCode.js'

export default function MainMenu() {
  const navigate = useNavigate()
  const {
    user,
    displayName,
    isSignedIn,
    authReady,
    isFirebaseConfigured,
    setLoading,
    setError,
  } = useAuth()
  const [joinCode, setJoinCode] = useState('')
  const [localError, setLocalError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleGoogleSignIn() {
    if (!isFirebaseConfigured) {
      setLocalError('Server config missing. Check your .env file and restart the dev server.')
      return
    }

    setBusy(true)
    setLocalError('')
    setError(null)
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setLocalError(err.message)
    } finally {
      setBusy(false)
      setLoading(false)
    }
  }

  async function handleSignOut() {
    setBusy(true)
    try {
      await signOutUser()
      setJoinCode('')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateSession() {
    setBusy(true)
    setLocalError('')
    try {
      await ensureSignedIn()
      const code = await createSession(displayName)
      navigate(`/lobby/${code}`)
    } catch (err) {
      setLocalError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleJoinSession() {
    const code = normalizeSessionCode(joinCode)
    if (!isValidSessionCode(code)) {
      setLocalError('Enter a valid 6-character session code.')
      return
    }

    setBusy(true)
    setLocalError('')
    try {
      await ensureSignedIn()
      const result = await requestJoinSession(code, displayName)
      if (result.alreadyJoined || result.pending) {
        navigate(`/lobby/${code}`)
      }
    } catch (err) {
      setLocalError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!authReady) {
    return (
      <PageLayout title="Kachuful">
        <div className="py-12 text-center text-sm text-muted">Loading…</div>
      </PageLayout>
    )
  }

  if (!isSignedIn) {
    return (
      <PageLayout title="Kachuful">
        <div className="flex flex-1 flex-col justify-center gap-6">
          <p className="text-center text-sm text-muted">
            Sign in to create or join a game with friends.
          </p>

          <GoogleSignInButton onClick={handleGoogleSignIn} disabled={!isFirebaseConfigured} busy={busy} />

          {localError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {localError}
            </div>
          ) : null}
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Kachuful">
      <section className="rounded-xl border border-border bg-surface-raised p-4">
        <div className="flex items-center gap-3">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="h-11 w-11 rounded-full" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-sm font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Button variant="ghost" className="shrink-0 px-3 py-2 text-xs" onClick={handleSignOut} disabled={busy}>
            Sign out
          </Button>
        </div>
      </section>

      {localError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {localError}
        </div>
      ) : null}

      <Button className="w-full py-3.5" onClick={handleCreateSession} disabled={busy}>
        Create Session
      </Button>

      <section className="rounded-xl border border-border bg-surface-raised p-4">
        <label className="mb-2 block text-sm text-muted" htmlFor="code">
          Join with session code
        </label>
        <input
          id="code"
          value={joinCode}
          onChange={(e) => setJoinCode(normalizeSessionCode(e.target.value))}
          placeholder="K7X2MQ"
          maxLength={6}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-center font-mono text-lg tracking-[0.25em] text-text placeholder:text-muted/50 outline-none focus:border-accent"
        />
        <Button className="mt-3 w-full" variant="secondary" onClick={handleJoinSession} disabled={busy}>
          Join Session
        </Button>
      </section>

      <Button variant="ghost" className="w-full" onClick={() => navigate('/history')}>
        View Session History
      </Button>
    </PageLayout>
  )
}
