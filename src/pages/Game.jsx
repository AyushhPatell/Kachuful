import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BottomSheet from '../components/game/BottomSheet.jsx'
import CallPicker from '../components/game/CallPicker.jsx'
import GameTable from '../components/game/GameTable.jsx'
import JoinRequestsPanel from '../components/lobby/JoinRequestsPanel.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useJoinRequests } from '../hooks/useJoinRequests.js'
import { PLAY_FLY_MS, useTablePhase } from '../hooks/useTablePhase.js'
import {
  acceptJoinRequest,
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
import { buildDealSequence, cardsDealtToPlayer } from '../lib/dealSequence.js'
import { getCardsPerRound, getPlayableCards, resolveSarForRound } from '../lib/gameLogic.js'
import { sortHand } from '../lib/sortHand.js'
import { getSeatPositions, orderPlayersForTable } from '../lib/seatLayout.js'
import { ROUND_STATUS } from '../constants/game.js'

export default function Game() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { userId, photoURL: authPhotoURL } = useAuth()
  const currentUserId = userId

  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])
  const [round, setRound] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [newRequestPing, setNewRequestPing] = useState(false)
  const [pendingFromSubcollection, setPendingFromSubcollection] = useState(false)
  const [flyPlay, setFlyPlay] = useState(null)
  const [callSheetOpen, setCallSheetOpen] = useState(false)

  const lastTableLenRef = useRef(0)
  const localFlyRef = useRef(false)

  const isOwner = session?.ownerId === currentUserId
  const { joinRequests, listenError } = useJoinRequests(code, session, isOwner)

  const me = players.find((p) => p.id === currentUserId)
  const pendingJoin =
    hasPendingJoinRequest(session, currentUserId) || pendingFromSubcollection
  const roundNumber = session?.currentRound ?? 0
  const cardsPerRound = session ? getCardsPerRound(roundNumber, session.maxRound) : 0
  const isMyTurn = session?.currentTurn === currentUserId
  const isSpectator = me?.status === 'spectator' || (pendingJoin && !me)
  const currentTurnPlayer = players.find((p) => p.id === session?.currentTurn)
  const sar = resolveSarForRound(session, round)
  const scoresReady = Boolean(round?.results && Object.keys(round.results).length > 0)

  const seated = useMemo(
    () => orderPlayersForTable(players, session?.turnOrder ?? [], currentUserId),
    [players, session?.turnOrder, currentUserId],
  )

  const dealSequence = useMemo(
    () => buildDealSequence(seated.map((p) => p.id), cardsPerRound, round?.dealerIndex ?? 0),
    [seated, cardsPerRound, round?.dealerIndex],
  )

  const {
    tablePhase,
    trickReveal,
    dealStep,
    callingPhase,
    playingPhase,
    resetForNextRound,
  } = useTablePhase({
    code,
    isOwner,
    round,
    roundNumber,
    session,
    dealSequenceLength: dealSequence.length,
    scoresReady,
    onError: setError,
  })

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

  const sortedHand = useMemo(() => {
    const hand = me?.hand ?? []
    if (tablePhase === 'dealing' && dealStep < dealSequence.length) return hand
    return sortHand(hand)
  }, [me?.hand, tablePhase, dealStep, dealSequence.length])

  const showCallPicker = !isSpectator && callingPhase && me?.call == null && isMyTurn

  useEffect(() => {
    setCallSheetOpen(showCallPicker)
  }, [showCallPicker])

  useEffect(() => {
    const unsubSession = subscribeToSession(code, setSession)
    const unsubPlayers = subscribeToPlayers(code, setPlayers)
    return () => {
      unsubSession()
      unsubPlayers()
    }
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
    const pos = seatIndex >= 0 ? getSeatPositions(seated.length)[seatIndex] : null

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

  async function handleAcceptJoin(request) {
    setError('')
    try {
      await acceptJoinRequest(code, request)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRejectJoin(requestUserId) {
    setError('')
    try {
      await rejectJoinRequest(code, requestUserId)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSubmitCall(call) {
    setBusy(true)
    setError('')
    try {
      await submitCall(code, roundNumber, currentUserId, call)
      setCallSheetOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handlePlayCard(card) {
    if (!isMyTurn || !playingPhase || busy) return

    localFlyRef.current = true
    setFlyPlay({ card, fromLocal: true, key: `${card.id}-${Date.now()}` })
    setBusy(true)
    setError('')

    await new Promise((r) => setTimeout(r, PLAY_FLY_MS))

    try {
      await playCard(code, currentUserId, card)
    } catch (err) {
      setError(err.message)
      setFlyPlay(null)
      localFlyRef.current = false
    } finally {
      setBusy(false)
      setTimeout(() => setFlyPlay(null), 120)
    }
  }

  async function handleNextRound() {
    setBusy(true)
    setError('')
    try {
      const result = await advanceToNextRound(code)
      resetForNextRound()
      if (result.ended) navigate(`/leaderboard/${code}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const turnMessage = (() => {
    if (tablePhase === 'trick-won') return 'Trick won'
    if (tablePhase === 'collect') return 'Gathering cards…'
    if (tablePhase === 'round-scores') return 'Round complete'
    if (tablePhase === 'dealing') return 'Dealing…'
    if (callingPhase && currentTurnPlayer) {
      if (me?.call != null) return 'Waiting for other calls…'
      if (isMyTurn) return 'Your turn — call tricks'
      return `${currentTurnPlayer.name} is calling`
    }
    if (playingPhase && currentTurnPlayer) {
      if (isMyTurn) return 'Your turn'
      return `${currentTurnPlayer.name}'s turn`
    }
    return null
  })()

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
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0c0a08]">
      {isOwner && joinRequests.length > 0 ? (
        <div className="z-20 shrink-0 border-b border-amber-500/20 bg-amber-950/90 px-3 py-2">
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
        <p className="z-20 shrink-0 bg-zinc-900/80 px-3 py-1.5 text-center text-xs text-zinc-400">
          Spectator — you will play from the next round.
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
        onLeave={() => navigate('/')}
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
        turnMessage={turnMessage}
        isMyTurn={isMyTurn && (playingPhase || callingPhase)}
        sortedHand={sortedHand}
        callingPhase={callingPhase}
      />

      {error ? (
        <p className="absolute bottom-24 inset-x-4 z-30 rounded-lg bg-red-950/90 px-3 py-2 text-center text-xs text-red-100">
          {error}
        </p>
      ) : null}

      {listenError ? (
        <p className="absolute bottom-36 inset-x-4 z-30 text-center text-xs text-amber-200">
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

      {showCallPicker ? (
        <div className="absolute bottom-4 inset-x-4 z-20 hidden max-w-md lg:mx-auto lg:block lg:left-1/2 lg:-translate-x-1/2">
          {callPicker}
        </div>
      ) : null}
    </div>
  )
}
