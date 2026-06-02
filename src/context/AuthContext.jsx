import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  completeGoogleRedirectSignIn,
  getCurrentDisplayName,
  subscribeToAuth,
} from '../firebase/auth.js'
import { isFirebaseConfigured } from '../firebase/config.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined

    let unsubscribe = () => {}

    completeGoogleRedirectSignIn()
      .catch(() => {})
      .finally(() => {
        unsubscribe = subscribeToAuth((firebaseUser) => {
          setUser(firebaseUser)
          setDisplayName(firebaseUser ? getCurrentDisplayName() : '')
          setAuthReady(true)
        })
      })

    return () => unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      user,
      userId: user?.uid ?? null,
      displayName,
      authReady,
      loading,
      setLoading,
      error,
      setError,
      isFirebaseConfigured,
      isSignedIn: Boolean(user),
    }),
    [user, displayName, authReady, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
