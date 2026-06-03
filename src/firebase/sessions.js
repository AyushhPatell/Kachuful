import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './config.js'
import { dealHands } from '../lib/cards.js'
import { getNextCaller, isCallLegal } from '../lib/callValidation.js'
import {
  calculateRoundPoints,
  evaluateTrickWinner,
  getCardsPerRound,
  getDealerIndexForRound,
  getMaxRound,
  getPlayableCards,
  getPlayersInTrick,
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

function getNextTrickPlayer(turnOrder, handsById, cardsOnTable, afterUserId) {
  const played = new Set(cardsOnTable.map((p) => p.userId))
  const startIdx = turnOrder.indexOf(afterUserId)
  if (startIdx === -1) return null

  for (let step = 1; step <= turnOrder.length; step += 1) {
    const id = turnOrder[(startIdx + step) % turnOrder.length]
    if (played.has(id)) continue
    if ((handsById[id] ?? []).length > 0) return id
  }
  return null
}

async function beginRound(code, sessionRound, activePlayers, firstDealerIndex) {
  const maxRound = getMaxRound(activePlayers.length)
  const cardsPerRound = getCardsPerRound(sessionRound, maxRound)
  const dealerIndex = getDealerIndexForRound(sessionRound, firstDealerIndex, activePlayers.length)
  const turnOrder = activePlayers.map((p) => p.id)
  const hands = dealHands(turnOrder, cardsPerRound, dealerIndex)
  const leaderId = turnOrder[dealerIndex]

  await updateDoc(sessionsRef(code), {
    currentRound: sessionRound,
    currentSar: getSarForRound(sessionRound),
    roundDirection: getRoundDirection(sessionRound, maxRound),
    maxRound,
    currentTurn: leaderId,
    cardsOnTable: [],
    trickExpectedCount: null,
    turnOrder,
    dealerIndex,
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
    turnOrder: [],
    firstDealerIndex: 0,
    joinEventAt: 0,
    joinRequestsByUser: {},
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

  if (session.joinRequestsByUser?.[userId]) {
    return { pending: true }
  }

  const legacyRequest = (session.joinRequests ?? []).find((r) => r.userId === userId)
  if (legacyRequest) {
    return { pending: true }
  }

  await updateDoc(sessionsRef(code), {
    [`joinRequestsByUser.${userId}`]: {
      name: displayName,
      requestedAt: Date.now(),
    },
    joinEventAt: Date.now(),
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

  await updateDoc(sessionsRef(code), {
    [`joinRequestsByUser.${request.userId}`]: deleteField(),
    joinEventAt: Date.now(),
  })
}

export async function rejectJoinRequest(code, userId) {
  await updateDoc(sessionsRef(code), {
    [`joinRequestsByUser.${userId}`]: deleteField(),
    joinEventAt: Date.now(),
  })
}

export function parseJoinRequests(session) {
  if (!session) return []

  const fromMap = session.joinRequestsByUser
  if (fromMap && typeof fromMap === 'object') {
    return Object.entries(fromMap)
      .map(([id, data]) => ({
        userId: id,
        name: data.name,
        requestedAt: data.requestedAt ?? 0,
      }))
      .sort((a, b) => a.requestedAt - b.requestedAt)
  }

  return [...(session.joinRequests ?? [])].sort(
    (a, b) => (a.requestedAt ?? 0) - (b.requestedAt ?? 0),
  )
}

export async function startGame(code) {
  const activePlayers = await getActivePlayers(code)

  if (activePlayers.length < MIN_PLAYERS) {
    throw new Error(`Need at least ${MIN_PLAYERS} players to start`)
  }

  const firstDealerIndex = Math.floor(Math.random() * activePlayers.length)

  await updateDoc(sessionsRef(code), {
    status: SESSION_STATUS.ACTIVE,
    firstDealerIndex,
  })

  await beginRound(code, 1, activePlayers, firstDealerIndex)
}

export async function submitCall(code, roundNumber, userId, call) {
  const sessionSnap = await getDoc(sessionsRef(code))
  const session = sessionSnap.data()
  const cardsPerRound = getCardsPerRound(roundNumber, session.maxRound)
  const turnOrder = session.turnOrder ?? []

  if (session.currentTurn !== userId) {
    throw new Error('Wait for your turn to call tricks.')
  }

  await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionsRef(code))
    const liveSession = sessionDoc.data()
    if (liveSession.currentTurn !== userId) {
      throw new Error('Wait for your turn to call tricks.')
    }

    const players = await Promise.all(
      turnOrder.map(async (id) => {
        const snap = await transaction.get(playerRef(code, id))
        return { id, ...snap.data(), status: snap.data()?.status ?? 'active' }
      }),
    )

    if (!isCallLegal(call, cardsPerRound, players, userId)) {
      throw new Error(
        'That call is not allowed. Total tricks called cannot equal the number of cards in this round.',
      )
    }

    transaction.update(playerRef(code, userId), { call })

    const updatedPlayers = players.map((p) => (p.id === userId ? { ...p, call } : p))
    const nextCaller = getNextCaller(turnOrder, updatedPlayers)

    if (nextCaller) {
      transaction.update(sessionsRef(code), { currentTurn: nextCaller })
    }
  })

  const refreshed = await Promise.all(
    turnOrder.map(async (id) => {
      const snap = await getDoc(playerRef(code, id))
      return { id, ...snap.data() }
    }),
  )

  const allCalled = refreshed.every((p) => p.call !== null && p.call !== undefined)
  if (allCalled) {
    const latest = (await getDoc(sessionsRef(code))).data()
    const dealerIndex =
      latest.dealerIndex ??
      getDealerIndexForRound(roundNumber, latest.firstDealerIndex ?? 0, turnOrder.length)
    const leaderId = latest.turnOrder[dealerIndex]

    await updateDoc(roundRef(code, roundNumber), { status: ROUND_STATUS.PLAYING })
    await updateDoc(sessionsRef(code), {
      currentTurn: leaderId,
      cardsOnTable: [],
      trickExpectedCount: null,
    })
  }
}

export async function playCard(code, userId, card) {
  let roundToFinalize = null

  await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionsRef(code))
    const playerDoc = await transaction.get(playerRef(code, userId))
    if (!sessionDoc.exists() || !playerDoc.exists()) throw new Error('Session not found')

    const liveSession = sessionDoc.data()
    if (liveSession.currentTurn !== userId) throw new Error('Not your turn')

    const sar = liveSession.currentSar
    const hand = playerDoc.data().hand ?? []
    const cardInHand = hand.find((c) => c.id === card.id)
    if (!cardInHand) throw new Error('Card not in your hand')

    const prevTable = liveSession.cardsOnTable ?? []
    const playable = getPlayableCards(hand, prevTable)
    if (!playable.some((c) => c.id === card.id)) {
      throw new Error('You must follow the led suit if you can')
    }

    const turnOrder = liveSession.turnOrder ?? []
    const playerSnaps = await Promise.all(
      turnOrder.map((id) => transaction.get(playerRef(code, id))),
    )
    const playerDataById = Object.fromEntries(
      turnOrder.map((id, i) => [id, playerSnaps[i].data() ?? {}]),
    )
    const handsById = Object.fromEntries(
      turnOrder.map((id) => [id, playerDataById[id].hand ?? []]),
    )

    let trickExpectedCount = liveSession.trickExpectedCount
    if (prevTable.length === 0) {
      trickExpectedCount = getPlayersInTrick(turnOrder, handsById).length
    }

    const newHand = hand.filter((c) => c.id !== card.id)
    handsById[userId] = newHand

    const cardsOnTable = [...prevTable, { userId, card: cardInHand }]

    if (cardsOnTable.length < trickExpectedCount) {
      const nextTurn = getNextTrickPlayer(turnOrder, handsById, cardsOnTable, userId)
      transaction.update(playerRef(code, userId), { hand: newHand })
      transaction.update(sessionsRef(code), {
        cardsOnTable,
        currentTurn: nextTurn,
        trickExpectedCount,
      })
      return
    }

    const winner = evaluateTrickWinner(cardsOnTable, sar)
    const winnerTricksWon = (playerDataById[winner.userId].tricksWon ?? 0) + 1
    const allEmpty = turnOrder.every((id) => (handsById[id] ?? []).length === 0)

    transaction.update(playerRef(code, userId), { hand: newHand })
    transaction.update(playerRef(code, winner.userId), { tricksWon: winnerTricksWon })

    if (allEmpty) {
      roundToFinalize = liveSession.currentRound
      transaction.update(sessionsRef(code), {
        cardsOnTable: [],
        currentTurn: null,
        trickExpectedCount: null,
      })
      transaction.update(roundRef(code, liveSession.currentRound), {
        status: ROUND_STATUS.COMPLETE,
      })
      return
    }

    transaction.update(sessionsRef(code), {
      cardsOnTable: [],
      currentTurn: winner.userId,
      trickExpectedCount: null,
    })
  })

  if (roundToFinalize) {
    await finalizeRoundScores(code, roundToFinalize)
  }
}

async function finalizeRoundScores(code, roundNumber) {
  const activePlayers = await getActivePlayers(code)
  const updates = activePlayers.map(async (p) => {
    const snap = await getDoc(playerRef(code, p.id))
    const data = snap.data()
    const points = calculateRoundPoints(data.call ?? 0, data.tricksWon ?? 0)
    const sessionScore = (data.sessionScore ?? 0) + points
    const roundsFailed = (data.roundsFailed ?? 0) + (points === 0 ? 1 : 0)

    await updateDoc(playerRef(code, p.id), { sessionScore, roundsFailed })

    const roundSnap = await getDoc(roundRef(code, roundNumber))
    const results = roundSnap.data()?.results ?? {}
    results[p.id] = {
      call: data.call,
      won: data.tricksWon,
      points,
    }
    await updateDoc(roundRef(code, roundNumber), { results })
  })

  await Promise.all(updates)
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
