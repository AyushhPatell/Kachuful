import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase/config.js'
import { computeSessionTotals } from './gameLogic.js'

// Bootstrap admin(s) by verified Google email — always admin, can't be revoked.
// Additional admins are granted at runtime into the `admins/{uid}` collection.
export const ADMIN_EMAILS = ['aspatel11410@gmail.com']

export function isBootstrapAdmin(user) {
  const email = (user?.email ?? '').toLowerCase()
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === email)
}

// Live admin status: bootstrap email OR a doc in `admins/{uid}`.
export function subscribeToAdminStatus(user, cb) {
  if (!isFirebaseConfigured || !user) {
    cb(false)
    return () => {}
  }
  if (isBootstrapAdmin(user)) {
    cb(true)
    return () => {}
  }
  return onSnapshot(
    doc(db, 'admins', user.uid),
    (snap) => cb(snap.exists()),
    () => cb(false),
  )
}

// ── refs ─────────────────────────────────────────────────────────────────────
const sessionsCol = () => collection(db, 'sessions')
const sessionDoc = (code) => doc(db, 'sessions', code)
const playersCol = (code) => collection(db, 'sessions', code, 'players')
const playerDoc = (code, uid) => doc(db, 'sessions', code, 'players', uid)
const roundsCol = (code) => collection(db, 'sessions', code, 'rounds')
const broadcastDoc = () => doc(db, 'system', 'broadcast')

const toMs = (ts) => (typeof ts?.toMillis === 'function' ? ts.toMillis() : typeof ts === 'number' ? ts : null)

// ── dashboard ────────────────────────────────────────────────────────────────
/** All sessions with live player counts, newest first. */
export async function listSessions() {
  if (!isFirebaseConfigured) return []
  const snap = await getDocs(sessionsCol())
  const out = await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data()
      const players = await getDocs(playersCol(d.id))
      const rows = players.docs.map((p) => p.data())
      return {
        code: d.id,
        status: data.status ?? 'unknown',
        ownerId: data.ownerId ?? null,
        currentRound: data.currentRound ?? 0,
        currentTurn: data.currentTurn ?? null,
        currentTurnStartedAt: toMs(data.currentTurnStartedAt),
        createdAt: toMs(data.createdAt),
        rematchCode: data.rematchCode ?? null,
        playerCount: rows.length,
        activeCount: rows.filter((p) => p.status === 'active').length,
        spectatorCount: rows.filter((p) => p.status === 'spectator').length,
      }
    }),
  )
  return out.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}

/** Deep snapshot of one session for the inspector. */
export async function getSessionDetail(code) {
  if (!isFirebaseConfigured) return null
  const [sSnap, pSnap, rSnap] = await Promise.all([
    getDoc(sessionDoc(code)),
    getDocs(playersCol(code)),
    getDocs(roundsCol(code)),
  ])
  if (!sSnap.exists()) return null
  return {
    session: { code, ...sSnap.data() },
    players: pSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.joinOrder ?? 0) - (b.joinOrder ?? 0)),
    roundCount: rSnap.size,
  }
}

// ── live game control ─────────────────────────────────────────────────────────
// These write to world-readable session docs, so field names/values are kept
// neutral — nothing here identifies the actor as an admin to other players.
/** No-op write that forces every connected client's listener to re-fire. */
export async function nudgeSession(code) {
  await updateDoc(sessionDoc(code), { syncPing: Date.now() })
}

/** End a session for everyone — clients navigate to the leaderboard on 'ended'.
 * Looks identical to a normal host end (no admin marker). */
export async function forceEndSession(code) {
  await updateDoc(sessionDoc(code), { status: 'ended' })
}

/** Mark a player offline so the host auto-plays/auto-calls past them (un-stick). */
export async function markPlayerOffline(code, uid) {
  await updateDoc(playerDoc(code, uid), { status: 'disconnected', lastSeenAt: 0 })
}

/** Permanently remove a player from a session. */
export async function kickPlayer(code, uid) {
  await updateDoc(playerDoc(code, uid), {
    status: 'disconnected',
    kicked: true,
    call: null,
    tricksWon: 0,
  })
}

export async function resetPlayerName(code, uid, name) {
  await updateDoc(playerDoc(code, uid), { name: (name ?? 'Player').slice(0, 24) })
}

// ── data & maintenance ────────────────────────────────────────────────────────
/** Delete a session and every one of its subcollections. */
export async function deleteSession(code) {
  const [players, rounds, joinReqs] = await Promise.all([
    getDocs(playersCol(code)),
    getDocs(roundsCol(code)),
    getDocs(collection(db, 'sessions', code, 'joinRequests')),
  ])
  const batch = writeBatch(db)
  players.docs.forEach((d) => batch.delete(d.ref))
  rounds.docs.forEach((d) => batch.delete(d.ref))
  joinReqs.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(sessionDoc(code))
  await batch.commit()
}

/** Recompute every player's sessionScore/roundsFailed from the round results
 * (fixes any drift). Returns the corrected totals. */
export async function recomputeScores(code) {
  const rSnap = await getDocs(roundsCol(code))
  const rounds = rSnap.docs.map((d) => ({
    roundNumber: d.data().roundNumber ?? Number(d.id),
    results: d.data().results ?? {},
  }))
  const { totals, failed } = computeSessionTotals(rounds)
  const pSnap = await getDocs(playersCol(code))
  const batch = writeBatch(db)
  pSnap.docs.forEach((d) => {
    batch.update(d.ref, { sessionScore: totals[d.id] ?? 0, roundsFailed: failed[d.id] ?? 0 })
  })
  await batch.commit()
  return { totals, failed }
}

// ── admin management ──────────────────────────────────────────────────────────
export async function grantAdmin(uid) {
  const clean = (uid ?? '').trim()
  if (!clean) throw new Error('Enter a user ID.')
  await setDoc(doc(db, 'admins', clean), {
    addedAt: serverTimestamp(),
    addedBy: auth.currentUser?.uid ?? null,
  })
}

export async function revokeAdmin(uid) {
  await deleteDoc(doc(db, 'admins', uid))
}

export async function listGrantedAdmins() {
  if (!isFirebaseConfigured) return []
  const snap = await getDocs(collection(db, 'admins'))
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
}

// ── broadcast ─────────────────────────────────────────────────────────────────
/** type: 'reload' (offers a reload button) | 'info' (plain message). */
export async function setBroadcast({ message, type = 'info' }) {
  // No `by` field — the broadcast doc is world-readable, so we never record
  // which account sent it (that would reveal the admin's identity).
  await setDoc(broadcastDoc(), {
    message: (message ?? '').slice(0, 240),
    type,
    active: true,
    at: Date.now(),
  })
}

export async function clearBroadcast() {
  await setDoc(broadcastDoc(), { active: false, at: Date.now() }, { merge: true })
}

export function subscribeToBroadcast(cb) {
  if (!isFirebaseConfigured) {
    cb(null)
    return () => {}
  }
  return onSnapshot(
    broadcastDoc(),
    (snap) => cb(snap.exists() ? snap.data() : null),
    () => cb(null),
  )
}

export async function getBroadcastOnce() {
  if (!isFirebaseConfigured) return null
  const snap = await getDoc(broadcastDoc())
  return snap.exists() ? snap.data() : null
}
