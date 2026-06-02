import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getFirestore } from 'firebase/firestore'

function env(key) {
  return (import.meta.env[key] ?? '').trim()
}

// Firebase Web config is safe to ship client-side.
// Keep env vars for flexibility, but provide defaults so CI-hosted builds work
// even when GitHub Actions does not inject VITE_* values.
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAKpcFJ7Dg_umclHjc2edp_vJky6HZ4NNA',
  authDomain: 'kachuful-70077.firebaseapp.com',
  projectId: 'kachuful-70077',
  storageBucket: 'kachuful-70077.firebasestorage.app',
  messagingSenderId: '77910224164',
  appId: '1:77910224164:web:3a7d9373a1de0fc3ed17b1',
  databaseURL: 'https://kachuful-70077-default-rtdb.firebaseio.com',
}

const firebaseConfig = {
  apiKey: env('VITE_FIREBASE_API_KEY') || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: env('VITE_FIREBASE_AUTH_DOMAIN') || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: env('VITE_FIREBASE_PROJECT_ID') || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: env('VITE_FIREBASE_STORAGE_BUCKET') || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId:
    env('VITE_FIREBASE_MESSAGING_SENDER_ID') || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: env('VITE_FIREBASE_APP_ID') || DEFAULT_FIREBASE_CONFIG.appId,
  databaseURL: env('VITE_FIREBASE_DATABASE_URL') || DEFAULT_FIREBASE_CONFIG.databaseURL,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
)

let app = null
let auth = null
let db = null
let rtdb = null

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  rtdb = getDatabase(app)
}

export { app, auth, db, rtdb }
