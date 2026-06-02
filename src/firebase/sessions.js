import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './config.js'
import { dealHands } from '../lib/cards.js'
import {
  getCardsPerRound,
  getMaxRound,
  getRoundDirection,
  getSarForRound,
} from '../lib/gameLogic.js'
import { generateSessionCode } from '../lib/sessionCode.js'
import { MAX_PLAYERS, MIN_PLAYERS, ROUND_STATUS, SESSION_STATUS } from '../constants/game.js'

function sessionsRef(code) {
  return doc(db, 'sessions', code)
}

function playersCollection(code) {
  return collection(db, 'sessions', code, 'players')
}

function playerRef(code, userId) {
  return doc(db, 'sessions', code, 'players', userId)
}

function roundRef(code, roundNumber) {
  return doc(db, 'sessions', code, 'rounds', String(roundNumber))
}

async function generateUniqueCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateSessionCode()
    const snapshot = await getDoc(sessionsRef(code))
    if (!snapshot.exists()) return code
  }
  throw new Error('Could not generate a unique session code')
}

async function getActivePlayers(code) {
  const playerDocs = await getDocs(playersCollection(code))
  return playerDocs.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.status !== 'spectator')
    .sort((a, b) => a.joinOrder - b.joinOrder)
}

export async function createSession(displayName) {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')

  const userId = auth.currentUser.uid
  const code = await generateUniqueCode()

  await setDoc(sessionsRef(code), {
    code,
    ownerId: userId,
    status: SESSION_STATUS.LOBBY,
    currentRound: 0,
    currentSar: 'Ka',
    roundDirection: 'up',
    maxRound: 8,
    cardsOnTable: [],
    currentTurn: null,
    joinRequests: [],
    turnOrder: [],
    createdAt: serverTimestamp(),
  })

  await setDoc(playerRef(code, userId), {
    name: displayName,
    status: 'active',
    hand: [],
    call: null,
    tricksWon: 0,
    sessionScore: 0,
    roundsFailed: 0,
    joinedAt: serverTimestamp(),
    joinOrder: 1,
  })

  return code
}

export async function requestJoinSession(code, displayName) {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')

  const userId = auth.currentUser.uid
  const sessionSnap = await getDoc(sessionsRef(code))
  if (!sessionSnap.exists()) throw new Error('Session not found')

  const session = sessionSnap.data()
  if (session.status === SESSION_STATUS.ENDED) {
    throw new Error('This session has already ended')
  }

  const existingPlayer = await getDoc(playerRef(code, userId))
  if (existingPlayer.exists()) {
    return { alreadyJoined: true }
  }

  const playerDocs = await getDocs(playersCollection(code))
  if (playerDocs.size >= MAX_PLAYERS) {
    throw new Error('Session is full (max 7 players)')
  }

  await updateDoc(sessionsRef(code), {
    joinRequests: arrayUnion({
      userId,
      name: displayName,
      requestedAt: Date.now(),
    }),
  })

  return { pending: true }
}

export async function acceptJoinRequest(code, request) {
  const sessionSnap = await getDoc(sessionsRef(code))
  const session = sessionSnap.data()
  const isSpectator = session.status === SESSION_STATUS.ACTIVE

  const playerDocs = await getDocs(playersCollection(code))
  const joinOrder = playerDocs.size + 1

  await setDoc(playerRef(code, request.userId), {
    name: request.name,
    status: isSpectator ? 'spectator' : 'active',
    hand: [],
    call: null,
    tricksWon: 0,
    sessionScore: 0,
    roundsFailed: 0,
    joinedAt: serverTimestamp(),
    joinOrder,
  })

  const filtered = (session.joinRequests ?? []).filter((r) => r.userId !== request.userId)
  await updateDoc(sessionsRef(code), { joinRequests: filtered })
}

export async function rejectJoinRequest(code, userId) {
  const sessionSnap = await getDoc(sessionsRef(code))
  const session = sessionSnap.data()
  const filtered = (session.joinRequests ?? []).filter((r) => r.userId !== userId)
  await updateDoc(sessionsRef(code), { joinRequests: filtered })
}

export async function startGame(code) {
  const activePlayers = await getActivePlayers(code)

  if (activePlayers.length < MIN_PLAYERS) {
    throw new Error(`Need at least ${MIN_PLAYERS} players to start`)
  }

  const maxRound = getMaxRound(activePlayers.length)
  const sessionRound = 1
  const cardsPerRound = getCardsPerRound(sessionRound, maxRound)
  const hands = dealHands(activePlayers.map((p) => p.id), cardsPerRound)
  const turnOrder = activePlayers.map((p) => p.id)

  await updateDoc(sessionsRef(code), {
    status: SESSION_STATUS.ACTIVE,
    currentRound: sessionRound,
    currentSar: getSarForRound(sessionRound),
    roundDirection: getRoundDirection(sessionRound, maxRound),
    maxRound,
    currentTurn: turnOrder[0],
    cardsOnTable: [],
    turnOrder,
  })

  await Promise.all(
    activePlayers.map((player) =>
      updateDoc(playerRef(code, player.id), {
        hand: hands[player.id],
        call: null,
        tricksWon: 0,
        status: 'active',
      }),
    ),
  )

  await setDoc(roundRef(code, sessionRound), {
    sar: getSarForRound(sessionRound),
    roundNumber: sessionRound,
    results: {},
    status: ROUND_STATUS.CALLING,
    votes: {},
  })
}

export async function submitCall(code, roundNumber, userId, call) {
  await updateDoc(playerRef(code, userId), { call })

  const activePlayers = await getActivePlayers(code)
  const allCalled = activePlayers.every((p) => p.call !== null && p.call !== undefined)

  if (allCalled) {
    await updateDoc(roundRef(code, roundNumber), { status: ROUND_STATUS.PLAYING })
  }
}

export function subscribeToSession(code, onChange) {
  if (!isFirebaseConfigured) return () => {}

  return onSnapshot(sessionsRef(code), (snap) => {
    onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

export function subscribeToPlayers(code, onChange) {
  if (!isFirebaseConfigured) return () => {}

  const q = query(playersCollection(code), orderBy('joinOrder'))
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export function subscribeToRound(code, roundNumber, onChange) {
  if (!isFirebaseConfigured) return () => {}

  return onSnapshot(roundRef(code, roundNumber), (snap) => {
    onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

export { sessionsRef, playerRef, roundRef }
