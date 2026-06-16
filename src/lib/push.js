import { arrayUnion, doc, setDoc } from 'firebase/firestore'
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { app, auth, db, isFirebaseConfigured } from '../firebase/config.js'

// Set after generating a "Web Push certificate" key pair in
// Firebase Console → Project Settings → Cloud Messaging → Web configuration.
const VAPID_KEY = (import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '').trim()

// iOS only supports web push for a standalone (Add to Home Screen) app —
// requesting permission from a normal Safari tab silently can't work.
export function isIosNonStandalone() {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent ?? '')
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
  return isIos && !isStandalone
}

export function getPushPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function enablePushNotifications() {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured.')
  if (!VAPID_KEY) throw new Error('Push notifications are not set up yet.')
  // iOS check must come before the Notification API check because Chrome on iOS
  // doesn't expose window.Notification at all, giving the wrong "not supported"
  // error instead of the actionable "add to Home Screen" message.
  if (isIosNonStandalone()) {
    throw new Error('On iOS, add Kachuful to your Home Screen first, then enable notifications from there.')
  }
  if (typeof Notification === 'undefined') throw new Error('Notifications are not supported in this browser.')
  if (!(await isSupported())) {
    throw new Error('Push notifications are not supported in this browser.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const registration = await navigator.serviceWorker.ready
  const messaging = getMessaging(app)
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
  if (!token) throw new Error('Could not get a push token.')

  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Sign in first.')
  await setDoc(doc(db, 'users', userId), { fcmTokens: arrayUnion(token) }, { merge: true })
  return token
}
