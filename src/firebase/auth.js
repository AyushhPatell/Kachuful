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
