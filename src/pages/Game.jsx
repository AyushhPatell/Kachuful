import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BottomSheet from '../components/game/BottomSheet.jsx'
import CallPicker from '../components/game/CallPicker.jsx'
import GameTable from '../components/game/GameTable.jsx'
import RoundScoreOverlay from '../components/game/RoundScoreOverlay.jsx'
import JoinRequestsPanel from '../components/lobby/JoinRequestsPanel.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useJoinRequests } from '../hooks/useJoinRequests.js'
import { useLeaveSession } from '../hooks/useLeaveSession.js'
import {
  acceptJoinRequest,
  acknowledgeTrickReveal,
  advanceToNextRound,
  claimHostRole,
  endSessionNow,
  hasPendingJoinRequest,
  initiateEndVote,
  isPlayerOffline,
  kickPlayer,
  markPlayerDisconnected,
  pingPresence,
  playCard,
  reconnectPlayer,
  recordAutoAction,
  rejectJoinRequest,
  setPlayerForeground,
  submitCall,
  subscribeToMyJoinRequest,
  subscribeToPlayers,
  subscribeToRound,
  subscribeToSession,
} from '../firebase/sessions.js'
import { buildDealSequence, cardsDealtToPlayer } from '../lib/dealSequence.js'
import { getCardsPerRound, getPlayableCards, isTrumpCard, resolveSarForRound } from '../lib/gameLogic.js'
import { getLegalCalls } from '../lib/callValidation.js'
import { hapticTrickWon, hapticYourTurn } from '../lib/haptics.js'
import { getSeatPositions, orderPlayersForTable } from '../lib/seatLayout.js'
import { getEndVoteTally } from '../lib/voting.js'
import { ROUND_STATUS } from '../constants/game.js'
import { playSound, unlockAudio } from '../lib/sounds.js'
import { EmojiPicker, ReactionFloaters, useEmojiReactions } from '../components/game/EmojiReactions.jsx'
import EndVoteBanner from '../components/game/EndVoteBanner.jsx'

const TRICK_PAUSE_MS = 4000
const TRICK_FLY_MS = 600 // must match the fly transition duration in GameTable's cardAnimate
const COLLECT_MS = 700
const PLAY_FLY_MS = 400

export default function Game() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { userId, photoURL: authPhotoURL } = useAuth()
  const currentUserId = userId
  const leaveSession = useLeaveSession(code, currentUserId)

  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])
  const [round, setRound] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [newRequestPing, setNewRequestPing] = useState(false)
  const [pendingFromSubcollection, setPendingFromSubcollection] = useState(false)
  const [tablePhase, setTablePhase] = useState('playing')
  const [frozenTrickReveal, setFrozenTrickReveal] = useState(null)
  const [dealStep, setDealStep] = useState(0)
  const [flyPlay, setFlyPlay] = useState(null)
  const [callSheetOpen, setCallSheetOpen] = useState(false)
  const [desktopCallOpen, setDesktopCallOpen] = useState(true)

  const lastTableLenRef = useRef(0)
  const localFlyRef = useRef(false)
  const prevRoundNumberRef = useRef(0)
  const playersRef = useRef(players)
  const turnOrderRef = useRef(session?.turnOrder ?? [])

  const isOwner = session?.ownerId === currentUserId
  const { joinRequests, listenError } = useJoinRequests(code, session, isOwner)

  const me = players.find((p) => p.id === currentUserId)
  const pendingJoin = hasPendingJoinRequest(session, currentUserId) || pendingFromSubcollection
  const roundNumber = session?.currentRound ?? 0
  const cardsPerRound = session ? getCardsPerRound(roundNumber, session.maxRound) : 0
  // Adaptive deal speed: steps faster at even card counts going up (2→4→6→8),
  // odd counts inherit the nearest even-count speed. On the way back down the
  // reductions mirror at 6, 4, 2 (7 going down stays at 8-card speed).
  const dealCardMs = (() => {
    const dir = session?.roundDirection ?? 'up'
    if (cardsPerRound <= 1) return 600
    if (cardsPerRound >= 8) return 210
    if (dir === 'up') {
      if (cardsPerRound >= 6) return 285
      if (cardsPerRound >= 4) return 390
      return 500 // 2–3 cards
    }
    // going down — 7 stays at peak, reductions at 6, 4, 2
    if (cardsPerRound >= 7) return 210
    if (cardsPerRound >= 5) return 285
    if (cardsPerRound >= 3) return 390
    return 500 // 2 cards going down
  })()
  const isMyTurn = session?.currentTurn === currentUserId
  const isSpectator = me?.status === 'spectator' || (pendingJoin && !me)
  const currentTurnPlayer = players.find((p) => p.id === session?.currentTurn)
  const sar = resolveSarForRound(session, round)

  const seated = useMemo(
    () => orderPlayersForTable(players, session?.turnOrder ?? [], currentUserId),
    [players, session?.turnOrder, currentUserId],
  )

  const reactionFloaters = useEmojiReactions(session, seated, currentUserId)

  const activePlayerIds = useMemo(() => seated.map((p) => p.id), [seated])

  // Only players who are in the current round's deal — avoids stale call data
  // from disconnected players who were excluded from this round but whose
  // Firestore docs still have a call value left over from last round.
  const turnOrderPlayers = useMemo(
    () => (session?.turnOrder ?? []).map((id) => players.find((p) => p.id === id)).filter(Boolean),
    [players, session?.turnOrder],
  )

  const dealSequence = useMemo(
    () => buildDealSequence(activePlayerIds, cardsPerRound, round?.dealerIndex ?? 0),
    [activePlayerIds, cardsPerRound, round?.dealerIndex],
  )

  const dealerPlayerId = useMemo(() => {
    const idx = round?.dealerIndex ?? 0
    return session?.turnOrder?.[idx] ?? null
  }, [round?.dealerIndex, session?.turnOrder])

  const trickReveal = session?.lastTrickReveal ?? frozenTrickReveal
  const callingPhase = round?.status === ROUND_STATUS.CALLING && tablePhase === 'playing'
  const playingPhase = round?.status === ROUND_STATUS.PLAYING && tablePhase === 'playing'
  // Stable primitive deps for the auto-play effect — avoids resetting the
  // 3-second timer on every heartbeat that causes a new `players` reference.
  const currentTurnPlayerId = session?.currentTurn ?? null
  const currentTurnPlayerStatus = useMemo(
    () => players.find((p) => p.id === currentTurnPlayerId)?.status ?? null,
    [players, currentTurnPlayerId],
  )
  const roundComplete = round?.status === ROUND_STATUS.COMPLETE
  const scoresReady = Boolean(round?.results && Object.keys(round.results).length > 0)
  const endVotePassed = round?.endVoteActive === true && getEndVoteTally(round, players).passed
  // Show overlay if in round-scores phase OR if we reloaded mid-round-complete (tablePhase reset to 'playing')
  const showRoundScores =
    tablePhase === 'round-scores' ||
    (roundComplete && scoresReady && tablePhase === 'playing')

  const visibleHandCount = useMemo(() => {
    if (tablePhase === 'dealing') {
      return cardsDealtToPlayer(dealSequence, dealStep, currentUserId)
    }
    return me?.hand?.length ?? 0
  }, [tablePhase, dealSequence, dealStep, currentUserId, me?.hand?.length])

  const dealTargetPlayerId =
    tablePhase === 'dealing' && dealStep > 0 ? dealSequence[dealStep - 1] : null

  const playableCards = useMemo(() => {
    if (!me?.hand || !playingPhase) return []
    return getPlayableCards(me.hand, session?.cardsOnTable ?? [])
  }, [me?.hand, playingPhase, session?.cardsOnTable])

  const showCallPicker = !isSpectator && callingPhase && me?.call == null && isMyTurn

  useEffect(() => {
    if (showCallPicker) {
      setCallSheetOpen(true)
      setDesktopCallOpen(true)
    }
  }, [showCallPicker])

  useEffect(() => {
    const unsubSession = subscribeToSession(code, setSession)
    const unsubPlayers = subscribeToPlayers(code, setPlayers)
    return () => { unsubSession(); unsubPlayers() }
  }, [code])

  useEffect(() => {
    if (!currentUserId || me) return undefined
    return subscribeToMyJoinRequest(code, currentUserId, setPendingFromSubcollection)
  }, [code, currentUserId, me])

  useEffect(() => {
    if (!isOwner || !session?.joinEventAt) return undefined
    setNewRequestPing(true)
    const timer = setTimeout(() => setNewRequestPing(false), 2500)
    return () => clearTimeout(timer)
  }, [isOwner, session?.joinEventAt, joinRequests.length])

  useEffect(() => {
    if (!roundNumber) return undefined
    return subscribeToRound(code, roundNumber, setRound)
  }, [code, roundNumber])

  // Navigate to leaderboard when session ends externally (e.g. vote passed)
  useEffect(() => {
    if (session?.status === 'ended') navigate(`/leaderboard/${code}`)
  }, [session?.status, code, navigate])

  // When an end-session vote reaches majority, the host (and only the host)
  // finalizes it. Works whether the vote was started mid-round or post-round.
  const endingRef = useRef(false)
  useEffect(() => {
    if (!isOwner || !endVotePassed || endingRef.current) return
    endingRef.current = true
    endSessionNow(code)
      .then(() => navigate(`/leaderboard/${code}`))
      .catch(() => { endingRef.current = false })
  }, [isOwner, endVotePassed, code, navigate])

  useEffect(() => {
    if (session?.lastTrickReveal?.at) setFrozenTrickReveal(session.lastTrickReveal)
  }, [session?.lastTrickReveal?.at])

  useEffect(() => {
    const reveal = session?.lastTrickReveal
    if (!reveal?.at) return undefined
    // 'trick-won' = cards stay put on the table so everyone can see what was
    // played; only after the pause do they fly to the winner ('trick-flying').
    setTablePhase('trick-won')
    const timers = []
    const flyAt = TRICK_PAUSE_MS
    const settledAt = TRICK_PAUSE_MS + TRICK_FLY_MS
    timers.push(setTimeout(() => setTablePhase('trick-flying'), flyAt))
    if (reveal.endsRound) {
      timers.push(setTimeout(() => {
        acknowledgeTrickReveal(code).catch((err) => setError(err.message))
      }, settledAt))
      timers.push(setTimeout(() => setTablePhase('collect'), settledAt))
      timers.push(setTimeout(() => setTablePhase('round-scores'), settledAt + COLLECT_MS))
    } else {
      timers.push(setTimeout(() => {
        acknowledgeTrickReveal(code)
          .then(() => { setTablePhase('playing'); setFrozenTrickReveal(null) })
          .catch((err) => setError(err.message))
      }, settledAt))
    }
    return () => timers.forEach(clearTimeout)
  }, [code, session?.lastTrickReveal?.at, session?.lastTrickReveal?.endsRound])

  useEffect(() => {
    if (roundComplete && scoresReady && frozenTrickReveal?.endsRound) {
      setTablePhase('round-scores')
    }
  }, [roundComplete, scoresReady, frozenTrickReveal?.endsRound])

  useEffect(() => {
    if (round?.status !== ROUND_STATUS.CALLING || roundNumber <= 0) return undefined
    setTablePhase('dealing')
    setFrozenTrickReveal(null)
    setDealStep(0)
    return undefined
  }, [round?.status, roundNumber, round?.dealerIndex])

  // When session.currentRound increments (non-host devices), immediately kick off
  // dealing state so there's no blank-table gap while the new round doc loads from Firebase
  useEffect(() => {
    if (!roundNumber) return
    if (prevRoundNumberRef.current && roundNumber > prevRoundNumberRef.current) {
      setFrozenTrickReveal(null)
      setDealStep(0)
      setTablePhase('dealing')
    }
    prevRoundNumberRef.current = roundNumber
  }, [roundNumber])

  useEffect(() => {
    if (tablePhase !== 'dealing' || !dealSequence.length) return undefined
    if (dealStep >= dealSequence.length) { setTablePhase('playing'); return undefined }
    const timer = setTimeout(() => setDealStep((s) => s + 1), dealCardMs)
    return () => clearTimeout(timer)
  }, [tablePhase, dealStep, dealSequence.length, dealCardMs])

  useEffect(() => {
    const table = session?.cardsOnTable ?? []
    if (table.length <= lastTableLenRef.current) {
      lastTableLenRef.current = table.length
      return undefined
    }
    const newPlay = table[table.length - 1]
    lastTableLenRef.current = table.length
    if (newPlay.userId === currentUserId || localFlyRef.current) {
      localFlyRef.current = false
      return undefined
    }
    const seatIndex = seated.findIndex((p) => p.id === newPlay.userId)
    const positions = getSeatPositions(seated.length)
    const pos = seatIndex >= 0 ? positions[seatIndex] : null
    setFlyPlay({
      card: newPlay.card,
      fromLocal: false,
      fromX: pos?.flyX ?? 0,
      fromY: pos?.flyY ?? -80,
      key: `${newPlay.card.id}-${Date.now()}`,
    })
    const timer = setTimeout(() => setFlyPlay(null), PLAY_FLY_MS + 80)
    return () => clearTimeout(timer)
  }, [session?.cardsOnTable, currentUserId, seated])

  useEffect(() => {
    if ((session?.cardsOnTable ?? []).length === 0) lastTableLenRef.current = 0
  }, [session?.cardsOnTable?.length])

  // ── presence heartbeat ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId || !code || !me) return undefined
    // Reconnect if returning to the page after disconnect
    if (me.status === 'disconnected') {
      reconnectPlayer(code, currentUserId).catch(() => {})
    }
    // Send heartbeat immediately, then every 30 s
    pingPresence(code, currentUserId).catch(() => {})
    const interval = setInterval(() => {
      pingPresence(code, currentUserId).catch(() => {})
    }, 30_000)
    return () => clearInterval(interval)
  }, [code, currentUserId, me?.status])

  // Track whether THIS game's screen is actually visible, so the push-
  // notification Cloud Function knows not to alert someone who'd already
  // see their turn happen live in the UI.
  useEffect(() => {
    if (!currentUserId || !code || !me) return undefined
    setPlayerForeground(code, currentUserId, document.visibilityState === 'visible').catch(() => {})
    return () => { setPlayerForeground(code, currentUserId, false).catch(() => {}) }
  }, [code, currentUserId, me?.id])

  useEffect(() => {
    if (!currentUserId || !code || !me) return undefined
    function handleVisibilityChange() {
      const visible = document.visibilityState === 'visible'
      setPlayerForeground(code, currentUserId, visible).catch(() => {})
      if (visible) {
        pingPresence(code, currentUserId).catch(() => {})
      }
    }
    function handleBeforeUnload() {
      markPlayerDisconnected(code, currentUserId).catch(() => {})
      setPlayerForeground(code, currentUserId, false).catch(() => {})
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [code, currentUserId, me])

  // ── sounds ──────────────────────────────────────────────────────────────────
  useEffect(() => { unlockAudio() }, [])

  const prevTablePhaseRef = useRef(null)
  useEffect(() => {
    if (tablePhase === 'dealing' && prevTablePhaseRef.current !== 'dealing') {
      playSound('shuffle')
    }
    prevTablePhaseRef.current = tablePhase
  }, [tablePhase])

  const prevDealStepRef = useRef(0)
  useEffect(() => {
    if (tablePhase === 'dealing' && dealStep > prevDealStepRef.current) {
      playSound('cardDeal')
    }
    prevDealStepRef.current = dealStep
  }, [dealStep, tablePhase])

  const prevIsMyTurnRef = useRef(false)
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current && tablePhase === 'playing') {
      playSound('yourTurn')
      hapticYourTurn()
    }
    prevIsMyTurnRef.current = isMyTurn
  }, [isMyTurn, tablePhase])

  const prevTrickRevealRef = useRef(null)
  useEffect(() => {
    if (trickReveal?.at && trickReveal.at !== prevTrickRevealRef.current) {
      prevTrickRevealRef.current = trickReveal.at
      playSound('trickWin')
      if (trickReveal.winnerId === currentUserId) hapticTrickWon()
    }
  }, [trickReveal?.at, trickReveal?.winnerId, currentUserId])

  useEffect(() => {
    if (flyPlay?.card && isTrumpCard(flyPlay.card, sar)) {
      playSound('trumpPlay')
    }
  }, [flyPlay?.key])

  // ── host auto-play for disconnected players ─────────────────────────────────
  // Keep refs so timer callbacks always see the latest players / turnOrder
  // without needing them as deps (which would reset the 3-second timer on every heartbeat)
  useEffect(() => { playersRef.current = players }, [players])
  useEffect(() => { turnOrderRef.current = session?.turnOrder ?? [] }, [session?.turnOrder])

  // ── host auto-play / auto-call for disconnected players ──────────────────────
  // Playing phase: after 3 s, play a random legal card.
  // Deps use primitive strings so heartbeat-caused `players` reference changes
  // don't reset the timer (the real bug that prevented auto-play from firing).
  useEffect(() => {
    if (!isOwner || !playingPhase) return undefined
    if (!currentTurnPlayerId || currentTurnPlayerId === currentUserId) return undefined
    const turnPlayer = playersRef.current.find((p) => p.id === currentTurnPlayerId)
    if (!turnPlayer) return undefined
    const isGone = currentTurnPlayerStatus === 'disconnected' || isPlayerOffline(turnPlayer)
    if (!isGone) return undefined
    const legalCards = getPlayableCards(turnPlayer.hand ?? [], session?.cardsOnTable ?? [])
    if (legalCards.length === 0) return undefined
    const timer = setTimeout(() => {
      const card = legalCards[Math.floor(Math.random() * legalCards.length)]
      playCard(code, currentTurnPlayerId, card).catch(() => {})
      recordAutoAction(code, currentTurnPlayerId, roundNumber).catch(() => {})
    }, 3000)
    return () => clearTimeout(timer)
  }, [isOwner, playingPhase, currentTurnPlayerId, currentTurnPlayerStatus, code, currentUserId, roundNumber])

  // Calling phase: after 3 s, submit a random legal call.
  useEffect(() => {
    if (!isOwner || !callingPhase) return undefined
    if (!currentTurnPlayerId || currentTurnPlayerId === currentUserId) return undefined
    const turnPlayer = playersRef.current.find((p) => p.id === currentTurnPlayerId)
    if (!turnPlayer) return undefined
    const isGone = currentTurnPlayerStatus === 'disconnected' || isPlayerOffline(turnPlayer)
    if (!isGone) return undefined
    // Only use players in this round's turnOrder — excludes stale call data
    // from players who were dropped from the round but still have a call doc.
    const inRoundPlayers = playersRef.current.filter((p) => turnOrderRef.current.includes(p.id))
    const legalOptions = getLegalCalls(cardsPerRound, inRoundPlayers, currentTurnPlayerId)
    if (legalOptions.length === 0) return undefined
    const timer = setTimeout(() => {
      const call = legalOptions[Math.floor(Math.random() * legalOptions.length)]
      submitCall(code, roundNumber, currentTurnPlayerId, call).catch(() => {})
      recordAutoAction(code, currentTurnPlayerId, roundNumber).catch(() => {})
    }, 3000)
    return () => clearTimeout(timer)
  }, [isOwner, callingPhase, currentTurnPlayerId, currentTurnPlayerStatus, code, roundNumber, cardsPerRound, currentUserId])

  // Polling fallback: if the current turn player closed their tab (no explicit
  // disconnect written to Firestore), detect the stale heartbeat every 15 s and
  // mark them disconnected so the effects above fire.
  useEffect(() => {
    if (!isOwner || !currentTurnPlayerId || currentTurnPlayerId === currentUserId) return undefined
    if (!playingPhase && !callingPhase) return undefined
    const interval = setInterval(() => {
      const p = playersRef.current.find((pl) => pl.id === currentTurnPlayerId)
      if (p && isPlayerOffline(p) && p.status !== 'disconnected') {
        markPlayerDisconnected(code, currentTurnPlayerId).catch(() => {})
      }
    }, 15_000)
    return () => clearInterval(interval)
  }, [isOwner, playingPhase, callingPhase, currentTurnPlayerId, code, currentUserId])

  // ── auto host-election when host tab closes without clicking Leave ───────────
  useEffect(() => {
    if (!session || session.ownerId === currentUserId) return
    const host = players.find((p) => p.id === session.ownerId)
    if (!host || !(host.status === 'disconnected' && isPlayerOffline(host))) return
    const firstActive = [...players]
      .filter((p) => p.status === 'active')
      .sort((a, b) => (a.joinOrder ?? 0) - (b.joinOrder ?? 0))[0]
    if (firstActive?.id !== currentUserId) return
    claimHostRole(code).catch(() => {})
  }, [session?.ownerId, code, currentUserId, players])

  // ── handlers ────────────────────────────────────────────────────────────────
  async function handleAcceptJoin(request) {
    setError('')
    try { await acceptJoinRequest(code, request) }
    catch (err) { setError(err.message) }
  }

  async function handleRejectJoin(requestUserId) {
    setError('')
    try { await rejectJoinRequest(code, requestUserId) }
    catch (err) { setError(err.message) }
  }

  async function handleSubmitCall(call) {
    setBusy(true); setError('')
    try {
      await submitCall(code, roundNumber, currentUserId, call)
      setCallSheetOpen(false)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function handlePlayCard(card) {
    if (!isMyTurn || !playingPhase || busy) return
    localFlyRef.current = true
    setFlyPlay({ card, fromLocal: true, key: `${card.id}-${Date.now()}` })
    setBusy(true); setError('')
    await new Promise((r) => setTimeout(r, PLAY_FLY_MS))
    try { await playCard(code, currentUserId, card) }
    catch (err) { setError(err.message); setFlyPlay(null); localFlyRef.current = false }
    finally { setBusy(false); setTimeout(() => setFlyPlay(null), 120) }
  }

  function handleTimerExpire() {
    if (!isMyTurn || busy) return
    if (playingPhase && playableCards.length > 0) {
      const card = playableCards[Math.floor(Math.random() * playableCards.length)]
      handlePlayCard(card)
    } else if (callingPhase && me?.call == null) {
      const legal = getLegalCalls(cardsPerRound, turnOrderPlayers, currentUserId)
      if (legal.length > 0) {
        handleSubmitCall(legal[Math.floor(Math.random() * legal.length)])
      }
    }
  }

  async function handleInitiateEndVote() {
    setError('')
    try { await initiateEndVote(code, roundNumber) }
    catch (err) { setError(err.message) }
  }

  async function handleKickPlayer(targetUserId) {
    setBusy(true); setError('')
    try { await kickPlayer(code, targetUserId) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function handleNextRound() {
    setBusy(true); setError('')
    try {
      await advanceToNextRound(code)
      setFrozenTrickReveal(null); setDealStep(0); setTablePhase('dealing')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const handVisible =
    !isSpectator &&
    me?.hand?.length &&
    tablePhase !== 'round-scores' &&
    (tablePhase === 'dealing' ||
      round?.status === ROUND_STATUS.PLAYING ||
      round?.status === ROUND_STATUS.CALLING)

  const callPicker = showCallPicker ? (
    <CallPicker
      cardsPerRound={cardsPerRound}
      players={turnOrderPlayers}
      userId={currentUserId}
      onSubmit={handleSubmitCall}
      busy={busy}
    />
  ) : null

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#080a07]" onClick={unlockAudio}>
      {isOwner && joinRequests.length > 0 ? (
        <div className="z-20 shrink-0 border-b border-amber-500/25 bg-amber-950/95 px-3 py-2">
          <JoinRequestsPanel
            joinRequests={joinRequests}
            newRequestPing={newRequestPing}
            onAccept={handleAcceptJoin}
            onReject={handleRejectJoin}
            compact
          />
        </div>
      ) : null}

      {isSpectator ? (
        <div className="z-20 shrink-0 flex items-center justify-center gap-2 bg-indigo-950/80 px-3 py-2 text-center text-xs backdrop-blur-sm"
          style={{ borderBottom: '1px solid rgba(99,102,241,0.3)' }}>
          <span className="text-indigo-300">👁 Spectating</span>
          <span className="text-zinc-500">—</span>
          <span className="text-zinc-400">
            {pendingJoin && !me
              ? 'Waiting for host to accept you. You will join the next round.'
              : 'You will play from the next round.'}
          </span>
        </div>
      ) : null}

      {/* Mid-round end-session vote — the post-round overlay shows its own copy */}
      {round?.endVoteActive && !showRoundScores ? (
        <div className="z-20 shrink-0 pt-2">
          <EndVoteBanner
            round={round}
            players={players}
            currentUserId={currentUserId}
            isOwner={isOwner}
            roundNumber={roundNumber}
            sessionCode={code}
            compact
          />
        </div>
      ) : null}

      <GameTable
        className="min-h-0 flex-1"
        players={players}
        turnOrder={session?.turnOrder ?? []}
        cardsOnTable={session?.cardsOnTable}
        trickReveal={trickReveal}
        tablePhase={tablePhase}
        round={round}
        roundNumber={roundNumber}
        sar={sar}
        cardsPerRound={cardsPerRound}
        currentTurn={session?.currentTurn}
        currentUserId={currentUserId}
        isOwner={isOwner}
        busy={busy}
        scoresReady={scoresReady}
        onNextRound={handleNextRound}
        onLeave={leaveSession}
        dealStep={dealStep}
        dealTargetPlayerId={dealTargetPlayerId}
        dealSequence={dealSequence}
        me={me}
        handVisible={handVisible}
        visibleHandCount={visibleHandCount}
        playableCards={playableCards}
        onPlayCard={handlePlayCard}
        flyPlay={flyPlay}
        authPhotoURL={authPhotoURL}
        sessionCode={code}
        callingPhase={callingPhase}
        dealerPlayerId={dealerPlayerId}
        onTimerExpire={handleTimerExpire}
        currentTurnStartedAt={session?.currentTurnStartedAt ?? null}
        onInitiateEndVote={handleInitiateEndVote}
      />

      <RoundScoreOverlay
        show={showRoundScores}
        players={players}
        currentUserId={currentUserId}
        roundNumber={roundNumber}
        isOwner={isOwner}
        onNextRound={handleNextRound}
        onKickPlayer={handleKickPlayer}
        onLeave={leaveSession}
        sessionCode={code}
        busy={busy}
        round={round}
      />

      {/* Emoji reaction floaters (absolute-positioned over the table) */}
      <ReactionFloaters
        floaters={reactionFloaters}
        seatPositions={getSeatPositions(seated.length)}
      />

      {/* Emoji picker — bottom-left, above hand */}
      {!isSpectator && (
        <div className="absolute bottom-[max(7.5rem,calc(7.5rem+env(safe-area-inset-bottom)))] left-3 z-30 sm:bottom-36">
          <EmojiPicker sessionCode={code} userId={currentUserId} disabled={tablePhase === 'round-scores'} />
        </div>
      )}

      {error ? (
        <p className="pointer-events-none absolute bottom-28 inset-x-4 z-40 rounded-lg bg-red-950/90 px-3 py-2 text-center text-xs text-red-100">
          {error}
        </p>
      ) : null}

      {listenError ? (
        <p className="pointer-events-none absolute bottom-40 inset-x-4 z-40 text-center text-xs text-amber-200">
          Join requests may not update live.
        </p>
      ) : null}

      {/* Mobile: bottom sheet — non-dismissable so cards stay accessible below */}
      <BottomSheet
        open={callSheetOpen && showCallPicker}
        onClose={() => setCallSheetOpen(false)}
        title="Call your tricks"
      >
        {callPicker}
      </BottomSheet>

      {/* Mobile: reopen pill — appears at bottom-right inside hand tray when sheet is dismissed */}
      {showCallPicker && !callSheetOpen ? (
        <button
          onClick={() => setCallSheetOpen(true)}
          className="absolute right-3 z-30 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white lg:hidden"
          style={{
            bottom: 'max(7rem, calc(6.5rem + env(safe-area-inset-bottom)))',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: '0 4px 16px rgba(245,158,11,0.5)',
          }}
        >
          📋 Call
        </button>
      ) : null}

      {/* Mobile: opponent calling notice — centered pill, leaves emoji button uncovered */}
      {!isSpectator && callingPhase && me?.call == null && !isMyTurn ? (
        <div
          className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-5 py-2 text-center text-xs text-zinc-300 backdrop-blur-sm lg:hidden"
          style={{ bottom: 'max(7rem, calc(6.5rem + env(safe-area-inset-bottom)))' }}
        >
          {currentTurnPlayer?.name ?? 'Opponent'} is calling…
        </div>
      ) : null}

      {/* My call/tricks badge — shown during playing phase once I've called */}
      {!isSpectator && me?.call != null && playingPhase ? (
        <div
          className="pointer-events-none absolute right-3 z-30 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium backdrop-blur-sm"
          style={{
            bottom: 'max(7.5rem, calc(7.5rem + env(safe-area-inset-bottom)))',
            background: 'rgba(0,0,0,0.52)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span
            className={`tabular-nums font-bold ${
              (me.tricksWon ?? 0) >= me.call && me.call > 0
                ? 'text-emerald-400'
                : 'text-amber-200'
            }`}
          >
            {me.tricksWon ?? 0}
          </span>
          <span className="text-zinc-600">/</span>
          <span className="tabular-nums text-zinc-400">{me.call}</span>
          <span className="text-zinc-600">tricks</span>
        </div>
      ) : null}

      {/* Desktop: collapsible call panel — bottom-right, doesn't cover hand */}
      {showCallPicker ? (
        <div className="absolute bottom-4 right-4 z-20 hidden w-72 lg:block">
          {desktopCallOpen ? (
            <div
              className="rounded-2xl"
              style={{
                background: 'linear-gradient(160deg, #1c201a, #111410)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.75)',
              }}
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/80">Your Call</span>
                <button
                  onClick={() => setDesktopCallOpen(false)}
                  className="text-xs text-zinc-600 hover:text-zinc-300"
                  title="Minimize"
                >
                  ▼
                </button>
              </div>
              {callPicker}
            </div>
          ) : (
            <button
              onClick={() => setDesktopCallOpen(true)}
              className="ml-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 4px 20px rgba(245,158,11,0.45)',
              }}
            >
              📋 Make your call
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
