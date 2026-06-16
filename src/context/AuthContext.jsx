import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  completeGoogleRedirectSignIn,
  getCurrentDisplayName,
  subscribeToAuth,
} from '../firebase/auth.js'
import { isFirebaseConfigured } from '../firebase/config.js'

const AuthContext = createContext(null)

// If sign-in bootstrap (redirect-result check + first auth-state callback)
// hasn't resolved by this point, something's hung — show a reload option
// instead of leaving the user stuck on "Loading…" forever. This matters most
// on a home-screen-saved iOS app, which has no URL bar or pull-to-refresh.
const AUTH_WATCHDOG_MS = 8000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured)
  const [authTimedOut, setAuthTimedOut] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined

    let unsubscribe = () => {}
    const watchdog = setTimeout(() => setAuthTimedOut(true), AUTH_WATCHDOG_MS)

    completeGoogleRedirectSignIn()
      .catch(() => {})
      .finally(() => {
        unsubscribe = subscribeToAuth((firebaseUser) => {
          clearTimeout(watchdog)
          setAuthTimedOut(false)
          setUser(firebaseUser)
          setDisplayName(firebaseUser ? getCurrentDisplayName() : '')
          setAuthReady(true)
        })
      })

    return () => {
      clearTimeout(watchdog)
      unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      userId: user?.uid ?? null,
      photoURL: user?.photoURL ?? null,
      displayName,
      authReady,
      authTimedOut,
      loading,
      setLoading,
      error,
      setError,
      isFirebaseConfigured,
      isSignedIn: Boolean(user),
    }),
    [user, displayName, authReady, authTimedOut, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
