import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { auth, db, isFirebaseConfigured } from './config.js'

const googleProvider = new GoogleAuthProvider()

// signInWithRedirect bounces back to the sign-in page on browsers that
// partition cross-domain storage (Safari/iOS, Chrome 3p-cookie blocking):
// auth happens on firebaseapp.com but the result can't be read back on
// web.app, so getRedirectResult returns null. Popup avoids that entirely.
// Only the iOS home-screen (standalone) app truly needs redirect, because
// popups there can hang silently instead of throwing a catchable error.
function shouldUseRedirect() {
  if (typeof window === 'undefined') return false
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator?.standalone === true
  const isIos = /iPhone|iPad|iPod/i.test(window.navigator?.userAgent ?? '')
  return isStandalone && isIos
}

function resolveDisplayName(user) {
  return user.displayName || user.email?.split('@')[0] || 'Player'
}

async function syncUserProfile(user) {
  const displayName = resolveDisplayName(user)
  const userRef = doc(db, 'users', user.uid)
  const snapshot = await getDoc(userRef)

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      displayName,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      sessionHistory: [],
      personalBest: 0,
      createdAt: serverTimestamp(),
    })
  } else {
    await updateDoc(userRef, {
      displayName,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
    })
  }

  return displayName
}

export async function signInWithGoogle() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Add your keys to .env and restart the dev server.')
  }

  if (shouldUseRedirect()) {
    await signInWithRedirect(auth, googleProvider)
    return null
  }

  try {
    const result = await signInWithPopup(auth, googleProvider)
    await syncUserProfile(result.user)
    return result.user
  } catch (error) {
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, googleProvider)
      return null
    }
    throw error
  }
}

export async function completeGoogleRedirectSignIn() {
  if (!isFirebaseConfigured) return null

  const result = await getRedirectResult(auth)
  if (!result?.user) return null

  await syncUserProfile(result.user)
  return result.user
}

export function subscribeToAuth(callback) {
  if (!isFirebaseConfigured) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, callback)
}

export async function ensureSignedIn() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Add your keys to .env and restart the dev server.')
  }
  if (!auth.currentUser) {
    throw new Error('Please sign in with Google first.')
  }

  await syncUserProfile(auth.currentUser)
  return auth.currentUser
}

export async function signOutUser() {
  if (auth) await signOut(auth)
}

export function getCurrentUserId() {
  return auth?.currentUser?.uid ?? null
}

export function getCurrentDisplayName() {
  const user = auth?.currentUser
  return user ? resolveDisplayName(user) : ''
}
