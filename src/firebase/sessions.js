import {
  arrayUnion,
  collection,
  deleteDoc,
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
  rankPlayers,
  resolveSarForRound,
} from '../lib/gameLogic.js'
import { generateSessionCode } from '../lib/sessionCode.js'
import { MAX_PLAYERS, MIN_PLAYERS, ROUND_STATUS, SESSION_STATUS } from '../constants/game.js'

const OFFLINE_THRESHOLD_MS = 90_000 // 90 seconds without a heartbeat = disconnected

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

function joinRequestsCollection(code) {
  return collection(db, 'sessions', code, 'joinRequests')
}

function joinRequestRef(code, userId) {
  return doc(db, 'sessions', code, 'joinRequests', userId)
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
        handCount: cardsPerRound,
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

  const LOBBY_TTL_MS = 30 * 60 * 1000 // 30 minutes

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
    lobbyExpiresAt: Date.now() + LOBBY_TTL_MS,
  })

  await setDoc(playerRef(code, userId), {
    name: displayName,
    photoURL: auth.currentUser.photoURL ?? null,
    status: 'active',
    hand: [],
    handCount: 0,
    call: null,
    tricksWon: 0,
    sessionScore: 0,
    roundsFailed: 0,
    joinedAt: serverTimestamp(),
    joinOrder: 1,
    lastSeenAt: Date.now(),
  })

  return code
}

function mapJoinRequestDoc(userId, data) {
  return {
    userId,
    name: data.name,
    requestedAt: data.requestedAt ?? 0,
  }
}

/** Load all pending join requests (source of truth: subcollection). */
export async function fetchJoinRequests(code) {
  if (!isFirebaseConfigured) return []

  const snap = await getDocs(joinRequestsCollection(code))
  return snap.docs.map((d) => mapJoinRequestDoc(d.id, d.data()))
}

async function writeJoinRequest(code, userId, displayName, requestedAt, photoURL = null) {
  const payload = { name: displayName, requestedAt, userId, photoURL }

  // Primary store — one doc per joiner; collection listener shows every request.
  await setDoc(joinRequestRef(code, userId), payload, { merge: true })

  // Mirror on session doc for older builds + owner ping (non-blocking).
  try {
    await updateDoc(sessionsRef(code), {
      joinEventAt: requestedAt,
      [`joinRequestsByUser.${userId}`]: { name: displayName, requestedAt },
      joinRequests: arrayUnion({ userId, name: displayName, requestedAt }),
    })
  } catch (err) {
    console.warn('Session join metadata update failed:', err)
  }
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

  const requestedAt = Date.now()
  const alreadyPending =
    (await getDoc(joinRequestRef(code, userId))).exists() ||
    Boolean(session.joinRequestsByUser?.[userId]) ||
    (session.joinRequests ?? []).some((r) => r.userId === userId)

  await writeJoinRequest(code, userId, displayName, requestedAt, auth.currentUser.photoURL ?? null)

  return { pending: true, alreadyPending }
}

async function clearJoinRequestFromSession(code, userId) {
  const sessionSnap = await getDoc(sessionsRef(code))
  if (!sessionSnap.exists()) return

  const session = sessionSnap.data()
  const cleanedArray = (session.joinRequests ?? []).filter((r) => r.userId !== userId)

  await updateDoc(sessionsRef(code), {
    joinRequests: cleanedArray,
    [`joinRequestsByUser.${userId}`]: deleteField(),
    joinEventAt: Date.now(),
  })
}

export async function acceptJoinRequest(code, request) {
  await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionsRef(code))
    if (!sessionDoc.exists()) throw new Error('Session not found')
    const session = sessionDoc.data()
    const isSpectator = session.status === SESSION_STATUS.ACTIVE

    // Re-check player count inside the transaction to prevent race conditions
    const playerDocs = await getDocs(playersCollection(code))
    if (playerDocs.size >= MAX_PLAYERS) {
      throw new Error('Session is full (max 7 players)')
    }

    // Check the player doesn't already have a doc
    const existingDoc = await transaction.get(playerRef(code, request.userId))
    if (existingDoc.exists()) return // Already accepted

    const joinOrder = playerDocs.size + 1

    transaction.set(playerRef(code, request.userId), {
      name: request.name,
      photoURL: request.photoURL ?? null,
      status: isSpectator ? 'spectator' : 'active',
      hand: [],
      handCount: 0,
      call: null,
      tricksWon: 0,
      sessionScore: 0,
      roundsFailed: 0,
      joinedAt: serverTimestamp(),
      joinOrder,
      lastSeenAt: Date.now(),
    })
  })

  await deleteDoc(joinRequestRef(code, request.userId))
  await clearJoinRequestFromSession(code, request.userId)
}

export async function rejectJoinRequest(code, userId) {
  try {
    await deleteDoc(joinRequestRef(code, userId))
  } catch {
    // doc may only exist on session map from older clients
  }
  await clearJoinRequestFromSession(code, userId)
}

export function mergeJoinRequestLists(...lists) {
  const byId = new Map()

  for (const list of lists) {
    for (const request of list ?? []) {
      if (!request?.userId || !request?.name) continue
      const requestedAt = request.requestedAt ?? 0
      const existing = byId.get(request.userId)
      if (!existing || requestedAt >= existing.requestedAt) {
        byId.set(request.userId, {
          userId: request.userId,
          name: request.name,
          requestedAt,
        })
      }
    }
  }

  return [...byId.values()].sort((a, b) => a.requestedAt - b.requestedAt)
}

export function parseJoinRequests(session) {
  if (!session) return []

  const fromMap = []
  const map = session.joinRequestsByUser
  if (map && typeof map === 'object') {
    for (const [id, data] of Object.entries(map)) {
      if (data?.name) {
        fromMap.push({
          userId: id,
          name: data.name,
          requestedAt: data.requestedAt ?? 0,
        })
      }
    }
  }

  return mergeJoinRequestLists(fromMap, session.joinRequests ?? [])
}

export function subscribeToJoinRequests(code, onChange, onError) {
  if (!isFirebaseConfigured) return () => {}

  return onSnapshot(
    joinRequestsCollection(code),
    (snap) => {
      onChange(snap.docs.map((d) => mapJoinRequestDoc(d.id, d.data())))
    },
    (error) => {
      console.error('Join requests listener error:', error)
      onError?.(error)
    },
  )
}

export function subscribeToMyJoinRequest(code, userId, onChange) {
  if (!isFirebaseConfigured || !userId) return () => {}

  return onSnapshot(joinRequestRef(code, userId), (snap) => {
    onChange(snap.exists())
  })
}

// ── Session history ───────────────────────────────────────────────────────────

function sessionHistoryRef(userId, sessionCode) {
  return doc(db, 'userHistory', userId, 'sessions', sessionCode)
}

/** Save a summary of the finished session for every player. */
async function saveSessionSummary(code, sessionData, players) {
  if (!isFirebaseConfigured) return
  try {
    const activePlayers = players.filter(p => p.status !== 'spectator')
    const ranked = rankPlayers(activePlayers)
    const summary = {
      sessionCode: code,
      endedAt: Date.now(),
      totalRounds: sessionData.currentRound ?? 0,
      players: ranked.map(p => ({
        id: p.id,
        name: p.name,
        photoURL: p.photoURL ?? null,
        sessionScore: p.sessionScore ?? 0,
        roundsFailed: p.roundsFailed ?? 0,
        rank: p.rank,
      })),
    }
    await Promise.all(
      activePlayers.map(p =>
        setDoc(sessionHistoryRef(p.id, code), { ...summary, myId: p.id }, { merge: true })
      )
    )
  } catch (err) {
    console.warn('Failed to save session summary:', err)
  }
}

export async function fetchSessionHistory(userId) {
  if (!isFirebaseConfigured) return []
  try {
    const q = query(
      collection(db, 'userHistory', userId, 'sessions'),
      orderBy('endedAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => d.data())
  } catch {
    return []
  }
}

/** Returns true if the lobby was expired and marked ended. */
export async function checkAndExpireLobby(code) {
  const snap = await getDoc(sessionsRef(code))
  if (!snap.exists()) return false
  const s = snap.data()
  if (s.status !== SESSION_STATUS.LOBBY) return false
  if (!s.lobbyExpiresAt) return false
  if (Date.now() < s.lobbyExpiresAt) return false
  await updateDoc(sessionsRef(code), { status: SESSION_STATUS.ENDED })
  return true
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
  await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionsRef(code))
    const playerDoc = await transaction.get(playerRef(code, userId))
    if (!sessionDoc.exists() || !playerDoc.exists()) throw new Error('Session not found')

    const liveSession = sessionDoc.data()
    const roundDoc = await transaction.get(roundRef(code, liveSession.currentRound))
    if (liveSession.lastTrickReveal) throw new Error('Wait for the trick result')
    if (liveSession.currentTurn !== userId) throw new Error('Not your turn')

    const sar = resolveSarForRound(
      liveSession,
      roundDoc.exists() ? roundDoc.data() : null,
    )
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
      transaction.update(playerRef(code, userId), { hand: newHand, handCount: newHand.length })
      transaction.update(sessionsRef(code), {
        cardsOnTable,
        currentTurn: nextTurn,
        trickExpectedCount,
      })
      return
    }

    const winner = evaluateTrickWinner(cardsOnTable, sar)
    if (!winner?.userId) throw new Error('Could not resolve trick winner')

    const winnerTricksWon = (playerDataById[winner.userId].tricksWon ?? 0) + 1
    const allEmpty = turnOrder.every((id) => (handsById[id] ?? []).length === 0)
    const winnerName = playerDataById[winner.userId].name ?? 'Player'

    transaction.update(playerRef(code, userId), { hand: newHand, handCount: newHand.length })
    transaction.update(playerRef(code, winner.userId), { tricksWon: winnerTricksWon })

    transaction.update(sessionsRef(code), {
      cardsOnTable: [],
      trickExpectedCount: null,
      lastTrickReveal: {
        cards: cardsOnTable,
        winnerId: winner.userId,
        winnerName,
        sar,
        endsRound: allEmpty,
        at: Date.now(),
      },
      currentTurn: allEmpty ? null : winner.userId,
    })
  })
}

export async function acknowledgeTrickReveal(code) {
  const sessionSnap = await getDoc(sessionsRef(code))
  if (!sessionSnap.exists()) return

  const session = sessionSnap.data()
  const reveal = session.lastTrickReveal
  if (!reveal) return

  const roundNumber = session.currentRound

  await updateDoc(sessionsRef(code), {
    lastTrickReveal: deleteField(),
  })

  if (!reveal.endsRound) return

  const roundSnap = await getDoc(roundRef(code, roundNumber))
  const roundData = roundSnap.data()
  if (roundData?.status === ROUND_STATUS.COMPLETE) return

  await updateDoc(roundRef(code, roundNumber), { status: ROUND_STATUS.COMPLETE })
  await finalizeRoundScores(code, roundNumber)
}

async function finalizeRoundScores(code, roundNumber) {
  const roundSnap = await getDoc(roundRef(code, roundNumber))
  const existingResults = roundSnap.data()?.results ?? {}
  if (Object.keys(existingResults).length > 0) return

  const activePlayers = await getActivePlayers(code)
  const results = {}

  for (const p of activePlayers) {
    const snap = await getDoc(playerRef(code, p.id))
    const data = snap.data() ?? {}
    const call = data.call ?? 0
    const won = data.tricksWon ?? 0
    const points = calculateRoundPoints(call, won)

    results[p.id] = { call, won, points }

    await updateDoc(playerRef(code, p.id), {
      sessionScore: (data.sessionScore ?? 0) + points,
      roundsFailed: (data.roundsFailed ?? 0) + (points === 0 ? 1 : 0),
    })
  }

  await updateDoc(roundRef(code, roundNumber), { results })
}

export async function advanceToNextRound(code) {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')

  const userId = auth.currentUser.uid
  const sessionSnap = await getDoc(sessionsRef(code))
  if (!sessionSnap.exists()) throw new Error('Session not found')

  const session = sessionSnap.data()
  if (session.ownerId !== userId) {
    throw new Error('Only the session owner can start the next round')
  }

  const roundNumber = session.currentRound
  const roundSnap = await getDoc(roundRef(code, roundNumber))
  if (roundSnap.data()?.status !== ROUND_STATUS.COMPLETE) {
    throw new Error('This round is not finished yet')
  }

  // Mark players who haven't sent a heartbeat in 90s as disconnected, exclude from next round
  const allPlayers = await getActivePlayers(code)
  const now = Date.now()
  const playersForRound = []
  for (const p of allPlayers) {
    const isStale = p.lastSeenAt && (now - p.lastSeenAt) > OFFLINE_THRESHOLD_MS
    if (isStale || p.status === 'disconnected') {
      await updateDoc(playerRef(code, p.id), { status: 'disconnected' })
    } else {
      playersForRound.push(p)
    }
  }

  if (playersForRound.length < MIN_PLAYERS) {
    throw new Error('Not enough active players to continue. Wait for players to reconnect.')
  }

  const maxRound = session.maxRound ?? getMaxRound(playersForRound.length)
  const cycleLength = 2 * maxRound - 1

  if (roundNumber >= cycleLength) {
    await updateDoc(sessionsRef(code), { status: SESSION_STATUS.ENDED })
    await saveSessionSummary(code, session, allPlayers)
    return { ended: true }
  }

  await beginRound(code, roundNumber + 1, playersForRound, session.firstDealerIndex ?? 0)
  return { ended: false, nextRound: roundNumber + 1 }
}

export function isAcceptedPlayer(players, userId) {
  return players.some((p) => p.id === userId)
}

export function hasPendingJoinRequest(session, userId) {
  if (!session || !userId) return false
  if (session.joinRequestsByUser?.[userId]) return true
  return (session.joinRequests ?? []).some((r) => r.userId === userId)
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

// ── Vote to end session ───────────────────────────────────────────────────────

/** Host initiates an end-session vote. */
export async function initiateEndVote(code, roundNumber) {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')
  const userId = auth.currentUser?.uid
  const sessionSnap = await getDoc(sessionsRef(code))
  if (sessionSnap.data()?.ownerId !== userId) throw new Error('Only the host can initiate a vote')

  await updateDoc(roundRef(code, roundNumber), {
    endVoteActive: true,
    endVoteInitiatedAt: Date.now(),
    votes: { [userId]: 'end' },
  })
}

/** A player casts their vote: 'end' or 'continue'. */
export async function castVote(code, roundNumber, userId, vote) {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')
  await updateDoc(roundRef(code, roundNumber), {
    [`votes.${userId}`]: vote,
  })
}

/** Host cancels the active end vote (resets it). */
export async function cancelEndVote(code, roundNumber) {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')
  await updateDoc(roundRef(code, roundNumber), {
    endVoteActive: false,
    votes: {},
  })
}

/** End the session immediately (host decision after vote passes). */
export async function endSessionNow(code) {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')
  const userId = auth.currentUser?.uid
  const sessionSnap = await getDoc(sessionsRef(code))
  if (!sessionSnap.exists()) throw new Error('Session not found')
  const session = sessionSnap.data()
  if (session.ownerId !== userId) throw new Error('Only the host can end the session')

  const allPlayerDocs = await getDocs(playersCollection(code))
  const allPlayers = allPlayerDocs.docs.map(d => ({ id: d.id, ...d.data() }))
  await updateDoc(sessionsRef(code), { status: SESSION_STATUS.ENDED })
  await saveSessionSummary(code, session, allPlayers)
}

// ── Presence / disconnect ─────────────────────────────────────────────────────

/** Heartbeat — call every 30 s from the game page. */
export async function pingPresence(code, userId) {
  if (!isFirebaseConfigured || !userId) return
  try {
    await updateDoc(playerRef(code, userId), { lastSeenAt: Date.now() })
  } catch {
    // Player doc may have been removed; ignore silently
  }
}

/** Mark a player as disconnected (called on beforeunload / visibility change). */
export async function markPlayerDisconnected(code, userId) {
  if (!isFirebaseConfigured || !userId) return
  try {
    await updateDoc(playerRef(code, userId), { status: 'disconnected' })
  } catch {
    // Ignore — best effort only
  }
}

/** Reconnect a player: set status back to active and update heartbeat. */
export async function reconnectPlayer(code, userId) {
  if (!isFirebaseConfigured || !userId) return
  try {
    const snap = await getDoc(playerRef(code, userId))
    if (!snap.exists()) return
    await updateDoc(playerRef(code, userId), {
      status: snap.data().status === 'disconnected' ? 'spectator' : snap.data().status,
      lastSeenAt: Date.now(),
    })
  } catch {
    // Ignore
  }
}

/** Host kicks a player from the session. */
export async function kickPlayer(code, targetUserId) {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')
  const userId = auth.currentUser?.uid
  const sessionSnap = await getDoc(sessionsRef(code))
  if (!sessionSnap.exists()) throw new Error('Session not found')
  if (sessionSnap.data().ownerId !== userId) throw new Error('Only the host can kick players')
  await deleteDoc(playerRef(code, targetUserId))
}

/** Returns true if the player's heartbeat is stale (offline). */
export function isPlayerOffline(player) {
  if (!player.lastSeenAt) return false
  return Date.now() - player.lastSeenAt > OFFLINE_THRESHOLD_MS
}

export { sessionsRef, playerRef, roundRef, OFFLINE_THRESHOLD_MS }
