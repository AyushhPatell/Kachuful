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
  hasPendingJoinRequest,
  playCard,
  rejectJoinRequest,
  submitCall,
  subscribeToMyJoinRequest,
  subscribeToPlayers,
  subscribeToRound,
  subscribeToSession,
} from '../firebase/sessions.js'
import RoundScoreOverlay from '../components/game/RoundScoreOverlay.jsx'
import { buildDealSequence, cardsDealtToPlayer } from '../lib/dealSequence.js'
import { getCardsPerRound, getPlayableCards, isTrumpCard, resolveSarForRound } from '../lib/gameLogic.js'
import { getLegalCalls } from '../lib/callValidation.js'
import { getSeatPositions, orderPlayersForTable } from '../lib/seatLayout.js'
import { ROUND_STATUS } from '../constants/game.js'
import { playSound, unlockAudio } from '../lib/sounds.js'

const TRICK_PAUSE_MS = 1200
const COLLECT_MS = 700
const DEAL_CARD_MS = 420
const PLAY_FLY_MS = 400

export default function Game() {
  const { code } = useParams()
  const navigate = useNavigate()
  const leaveSession = useLeaveSession()
  const { userId, photoURL: authPhotoURL } = useAuth()
  const currentUserId = userId

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

  const lastTableLenRef = useRef(0)
  const localFlyRef = useRef(false)

  const isOwner = session?.ownerId === currentUserId
  const { joinRequests, listenError } = useJoinRequests(code, session, isOwner)

  const me = players.find((p) => p.id === currentUserId)
  const pendingJoin = hasPendingJoinRequest(session, currentUserId) || pendingFromSubcollection
  const roundNumber = session?.currentRound ?? 0
  const cardsPerRound = session ? getCardsPerRound(roundNumber, session.maxRound) : 0
  const isMyTurn = session?.currentTurn === currentUserId
  const isSpectator = me?.status === 'spectator' || (pendingJoin && !me)
  const currentTurnPlayer = players.find((p) => p.id === session?.currentTurn)
  const sar = resolveSarForRound(session, round)

  const seated = useMemo(
    () => orderPlayersForTable(players, session?.turnOrder ?? [], currentUserId),
    [players, session?.turnOrder, currentUserId],
  )

  const activePlayerIds = useMemo(() => seated.map((p) => p.id), [seated])

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
  const roundComplete = round?.status === ROUND_STATUS.COMPLETE
  const scoresReady = Boolean(round?.results && Object.keys(round.results).length > 0)
  const showRoundScores = tablePhase === 'round-scores'

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

  useEffect(() => { setCallSheetOpen(showCallPicker) }, [showCallPicker])

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

  useEffect(() => {
    if (session?.lastTrickReveal?.at) setFrozenTrickReveal(session.lastTrickReveal)
  }, [session?.lastTrickReveal?.at])

  useEffect(() => {
    const reveal = session?.lastTrickReveal
    if (!reveal?.at) return undefined
    setTablePhase('trick-won')
    const timers = []
    if (reveal.endsRound) {
      timers.push(setTimeout(() => {
        acknowledgeTrickReveal(code).catch((err) => setError(err.message))
      }, TRICK_PAUSE_MS))
      timers.push(setTimeout(() => setTablePhase('collect'), TRICK_PAUSE_MS))
      timers.push(setTimeout(() => setTablePhase('round-scores'), TRICK_PAUSE_MS + COLLECT_MS))
    } else {
      timers.push(setTimeout(() => {
        acknowledgeTrickReveal(code)
          .then(() => { setTablePhase('playing'); setFrozenTrickReveal(null) })
          .catch((err) => setError(err.message))
      }, TRICK_PAUSE_MS))
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

  useEffect(() => {
    if (tablePhase !== 'dealing' || !dealSequence.length) return undefined
    if (dealStep >= dealSequence.length) { setTablePhase('playing'); return undefined }
    const timer = setTimeout(() => setDealStep((s) => s + 1), DEAL_CARD_MS)
    return () => clearTimeout(timer)
  }, [tablePhase, dealStep, dealSequence.length])

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

<<<<<<< HEAD
  // Unlock audio on mount (satisfies browser autoplay policy)
  useEffect(() => { unlockAudio() }, [])

  // Sound: shuffle + deal when a new dealing phase starts
  const prevTablePhaseRef = useRef(null)
  useEffect(() => {
    if (tablePhase === 'dealing' && prevTablePhaseRef.current !== 'dealing') {
      playSound('shuffle')
    }
    prevTablePhaseRef.current = tablePhase
  }, [tablePhase])

  // Sound: card deal tick on each deal step
  const prevDealStepRef = useRef(0)
  useEffect(() => {
    if (tablePhase === 'dealing' && dealStep > prevDealStepRef.current) {
      playSound('cardDeal')
    }
    prevDealStepRef.current = dealStep
  }, [dealStep, tablePhase])

  // Sound: your turn
  const prevIsMyTurnRef = useRef(false)
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current && tablePhase === 'playing') {
      playSound('yourTurn')
    }
    prevIsMyTurnRef.current = isMyTurn
  }, [isMyTurn, tablePhase])

  // Sound: trick won
=======
  // ── sounds ─────────────────────────────────────────────────────────────────
  useEffect(() => { unlockAudio() }, [])

  const prevTablePhaseRef = useRef(null)
  useEffect(() => {
    if (tablePhase === 'dealing' && prevTablePhaseRef.current !== 'dealing') playSound('shuffle')
    prevTablePhaseRef.current = tablePhase
  }, [tablePhase])

  const prevDealStepRef = useRef(0)
  useEffect(() => {
    if (tablePhase === 'dealing' && dealStep > prevDealStepRef.current) playSound('cardDeal')
    prevDealStepRef.current = dealStep
  }, [dealStep, tablePhase])

  const prevIsMyTurnRef = useRef(false)
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current && tablePhase === 'playing') playSound('yourTurn')
    prevIsMyTurnRef.current = isMyTurn
  }, [isMyTurn, tablePhase])

>>>>>>> 6d43acd (Some Improvements)
  const prevTrickRevealRef = useRef(null)
  useEffect(() => {
    if (trickReveal?.at && trickReveal.at !== prevTrickRevealRef.current) {
      prevTrickRevealRef.current = trickReveal.at
      playSound('trickWin')
    }
  }, [trickReveal?.at])

<<<<<<< HEAD
  // Sound: trump played (when a trump card flies in)
  useEffect(() => {
    if (flyPlay?.card && isTrumpCard(flyPlay.card, sar)) {
      playSound('trumpPlay')
    }
  }, [flyPlay?.key])

=======
  useEffect(() => {
    if (flyPlay?.card && isTrumpCard(flyPlay.card, sar)) playSound('trumpPlay')
  }, [flyPlay?.key])

  // ── handlers ───────────────────────────────────────────────────────────────
>>>>>>> 6d43acd (Some Improvements)
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
      const legal = getLegalCalls(cardsPerRound, players, currentUserId)
      if (legal.length > 0) handleSubmitCall(legal[Math.floor(Math.random() * legal.length)])
    }
  }

  function handleTimerExpire() {
    if (!isMyTurn || busy) return
    if (playingPhase && playableCards.length > 0) {
      const card = playableCards[Math.floor(Math.random() * playableCards.length)]
      handlePlayCard(card)
    } else if (callingPhase && me?.call == null) {
      const legal = getLegalCalls(cardsPerRound, players, currentUserId)
      if (legal.length > 0) {
        handleSubmitCall(legal[Math.floor(Math.random() * legal.length)])
      }
    }
  }

  async function handleNextRound() {
    setBusy(true); setError('')
    try {
      const result = await advanceToNextRound(code)
      setFrozenTrickReveal(null); setDealStep(0); setTablePhase('dealing')
      if (result.ended) navigate(`/leaderboard/${code}`)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

<<<<<<< HEAD
  const showRoundScores = tablePhase === 'round-scores'

=======
>>>>>>> 6d43acd (Some Improvements)
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
      players={players}
      userId={currentUserId}
      onSubmit={handleSubmitCall}
      busy={busy}
    />
  ) : null

  return (
<<<<<<< HEAD
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#080a07]">
=======
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#080a07]" onClick={unlockAudio}>
>>>>>>> 6d43acd (Some Improvements)
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
        <p className="z-20 shrink-0 bg-zinc-900/90 px-3 py-1.5 text-center text-xs text-zinc-400">
          {pendingJoin && !me
            ? 'Watching — ask the host to accept you for the next round.'
            : 'Spectator — you will play from the next round.'}
        </p>
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
      />

      <RoundScoreOverlay
        show={showRoundScores}
        players={players}
        currentUserId={currentUserId}
        roundNumber={roundNumber}
        isOwner={isOwner}
        onNextRound={handleNextRound}
        busy={busy}
      />

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

      <BottomSheet
        open={callSheetOpen && showCallPicker}
        onClose={() => setCallSheetOpen(false)}
        title="Call your tricks"
      >
        {callPicker}
      </BottomSheet>

<<<<<<< HEAD
      {/* Reopen call picker button — appears when sheet was dismissed but it's still player's turn */}
=======
      {/* Reopen call picker — mobile only, appears when sheet was dismissed */}
>>>>>>> 6d43acd (Some Improvements)
      {showCallPicker && !callSheetOpen ? (
        <button
          onClick={() => setCallSheetOpen(true)}
          className="absolute bottom-[6rem] left-1/2 z-30 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg lg:hidden"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: '0 4px 20px rgba(245,158,11,0.45)',
          }}
        >
          📋 Make your call
        </button>
      ) : null}

      {!isSpectator && callingPhase && me?.call == null && !isMyTurn ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-[9.5rem] z-30 rounded-full bg-black/50 px-4 py-2 text-center text-xs text-zinc-300 backdrop-blur-sm sm:bottom-36">
          {currentTurnPlayer?.name ?? 'Opponent'} is calling…
        </div>
      ) : null}

<<<<<<< HEAD
=======
      {/* Desktop call panel */}
>>>>>>> 6d43acd (Some Improvements)
      {showCallPicker ? (
        <div className="absolute bottom-4 inset-x-4 z-20 hidden max-w-md lg:mx-auto lg:block lg:left-1/2 lg:-translate-x-1/2">
          {callPicker}
        </div>
      ) : null}
    </div>
  )
}
