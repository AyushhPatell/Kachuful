import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout.jsx'
import CallPicker from '../components/game/CallPicker.jsx'
import GameTable from '../components/game/GameTable.jsx'
import PlayingCard, { SarBadge } from '../components/game/PlayingCard.jsx'
import JoinRequestsPanel from '../components/lobby/JoinRequestsPanel.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useJoinRequests } from '../hooks/useJoinRequests.js'
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
import { buildDealSequence, cardsDealtToPlayer } from '../lib/dealSequence.js'
import { getCardsPerRound, getPlayableCards, resolveSarForRound } from '../lib/gameLogic.js'
import { ROUND_STATUS } from '../constants/game.js'

const TRICK_PAUSE_MS = 1200
const COLLECT_MS = 700
const DEAL_CARD_MS = 420

export default function Game() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { userId } = useAuth()
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

  const activePlayerIds = useMemo(
    () =>
      (session?.turnOrder ?? [])
        .map((id) => players.find((p) => p.id === id))
        .filter((p) => p && p.status !== 'spectator')
        .map((p) => p.id),
    [session?.turnOrder, players],
  )

  const dealSequence = useMemo(
    () => buildDealSequence(activePlayerIds, cardsPerRound, round?.dealerIndex ?? 0),
    [activePlayerIds, cardsPerRound, round?.dealerIndex],
  )

  const trickReveal = session?.lastTrickReveal ?? frozenTrickReveal
  const callingPhase = round?.status === ROUND_STATUS.CALLING && tablePhase === 'playing'
  const playingPhase = round?.status === ROUND_STATUS.PLAYING && tablePhase === 'playing'
  const roundComplete = round?.status === ROUND_STATUS.COMPLETE
  const scoresReady = Boolean(round?.results && Object.keys(round.results).length > 0)

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
    if (session?.lastTrickReveal?.at) {
      setFrozenTrickReveal(session.lastTrickReveal)
    }
  }, [session?.lastTrickReveal?.at])

  useEffect(() => {
    const reveal = session?.lastTrickReveal
    if (!reveal?.at) return undefined

    setTablePhase('trick-won')

    const timers = []

    if (reveal.endsRound) {
      timers.push(
        setTimeout(() => {
          acknowledgeTrickReveal(code).catch((err) => setError(err.message))
        }, TRICK_PAUSE_MS),
      )
      timers.push(setTimeout(() => setTablePhase('collect'), TRICK_PAUSE_MS))
      timers.push(
        setTimeout(() => {
          setTablePhase('round-scores')
        }, TRICK_PAUSE_MS + COLLECT_MS),
      )
    } else {
      timers.push(
        setTimeout(() => {
          acknowledgeTrickReveal(code)
            .then(() => {
              setTablePhase('playing')
              setFrozenTrickReveal(null)
            })
            .catch((err) => setError(err.message))
        }, TRICK_PAUSE_MS),
      )
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

    if (dealStep >= dealSequence.length) {
      setTablePhase('playing')
      return undefined
    }

    const timer = setTimeout(() => setDealStep((s) => s + 1), DEAL_CARD_MS)
    return () => clearTimeout(timer)
  }, [tablePhase, dealStep, dealSequence.length])

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
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handlePlayCard(card) {
    if (!isMyTurn || !playingPhase) return
    setBusy(true)
    setError('')
    try {
      await playCard(code, currentUserId, card)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleNextRound() {
    setBusy(true)
    setError('')
    try {
      const result = await advanceToNextRound(code)
      setFrozenTrickReveal(null)
      setDealStep(0)
      setTablePhase('dealing')
      if (result.ended) {
        navigate(`/leaderboard/${code}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const turnMessage = (() => {
    if (tablePhase === 'trick-won') return 'Trick won'
    if (tablePhase === 'collect') return 'Cards returning to deck…'
    if (tablePhase === 'round-scores') return 'Round complete'
    if (tablePhase === 'dealing') return 'Dealing…'
    if (callingPhase && currentTurnPlayer) {
      if (me?.call != null) return 'Waiting for other players to call…'
      if (isMyTurn) return 'Your turn — choose how many tricks you will win'
      return `Waiting for ${currentTurnPlayer.name} to call`
    }
    if (playingPhase && currentTurnPlayer) {
      if (isMyTurn) return 'Your turn — tap a card to play'
      return `${currentTurnPlayer.name}'s turn`
    }
    return null
  })()

  const handDimmed = tablePhase === 'trick-won' || tablePhase === 'collect'
  const handVisible =
    !isSpectator &&
    me?.hand?.length &&
    tablePhase !== 'round-scores' &&
    (tablePhase === 'dealing' || round?.status === ROUND_STATUS.PLAYING || round?.status === ROUND_STATUS.CALLING)

  const sidebarDimmed = tablePhase === 'round-scores'

  return (
    <PageLayout title={`Round ${roundNumber} · ${cardsPerRound} card${cardsPerRound === 1 ? '' : 's'}`}>
      <div className="mx-auto my-auto w-full max-w-5xl space-y-4">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <SarBadge sar={session?.currentSar} />
          {turnMessage ? (
            <p
              className={`rounded-full px-4 py-2 text-center text-sm ${
                isMyTurn && (playingPhase || callingPhase)
                  ? 'bg-accent/20 text-accent'
                  : 'bg-surface-raised text-muted'
              }`}
            >
              {turnMessage}
            </p>
          ) : null}
        </div>

        {isOwner && joinRequests.length > 0 ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-center text-sm text-accent">
              {joinRequests.length} player{joinRequests.length === 1 ? '' : 's'} wants to join — accept or
              reject below.
            </div>
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
          <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-center text-sm text-muted">
            {pendingJoin && !me
              ? 'Watching as guest — ask the host to accept you to play the next round.'
              : 'Spectator mode — you will join as a player from the next round.'}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
          <div className="space-y-4 lg:col-span-8">
            <GameTable
              players={players}
              turnOrder={session?.turnOrder ?? []}
              cardsOnTable={session?.cardsOnTable}
              trickReveal={trickReveal}
              tablePhase={tablePhase}
              round={round}
              roundNumber={roundNumber}
              sar={sar}
              currentTurn={session?.currentTurn}
              currentUserId={currentUserId}
              isOwner={isOwner}
              busy={busy}
              scoresReady={scoresReady}
              onNextRound={handleNextRound}
              onLeave={() => navigate('/')}
              dealStep={dealStep}
              dealTargetPlayerId={dealTargetPlayerId}
            />

            {handVisible ? (
              <section className={handDimmed ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
                <h2 className="mb-3 text-center text-xs uppercase tracking-wider text-muted">
                  Your Hand
                </h2>
                <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 md:flex-wrap md:justify-center md:overflow-visible">
                  {(me?.hand ?? []).slice(0, visibleHandCount).map((card, index) => {
                    const faceDown = tablePhase === 'dealing' && dealStep < dealSequence.length
                    const canPlay =
                      !faceDown &&
                      playingPhase &&
                      tablePhase === 'playing' &&
                      isMyTurn &&
                      playableCards.some((c) => c.id === card.id)
                    return (
                      <PlayingCard
                        key={card.id}
                        card={faceDown ? null : card}
                        faceDown={faceDown}
                        onClick={canPlay && !busy ? () => handlePlayCard(card) : undefined}
                        selected={canPlay}
                        dealDelay={tablePhase === 'dealing' ? 0 : index * 0.04}
                      />
                    )
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <aside
            className={`space-y-4 lg:col-span-4 lg:sticky lg:top-4 ${
              sidebarDimmed ? 'opacity-50 transition-opacity' : 'transition-opacity'
            }`}
          >
            <section className="rounded-xl border border-border bg-surface-raised p-4">
              <h2 className="mb-3 text-xs uppercase tracking-wider text-muted">This round</h2>
              <ul className="space-y-2">
                {(session?.turnOrder ?? [])
                  .map((id) => players.find((p) => p.id === id))
                  .filter((p) => p && p.status !== 'spectator')
                  .map((player) => (
                    <li
                      key={player.id}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                        player.id === session?.currentTurn && tablePhase === 'playing'
                          ? 'bg-accent/15 ring-1 ring-accent/40'
                          : 'bg-surface'
                      }`}
                    >
                      <span className="truncate pr-2">{player.name}</span>
                      <span className="text-right text-xs text-muted">
                        call {player.call ?? '—'} · won {player.tricksWon ?? 0}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>

            {!isSpectator && callingPhase && me?.call == null && isMyTurn ? (
              <CallPicker
                cardsPerRound={cardsPerRound}
                players={players}
                userId={currentUserId}
                onSubmit={handleSubmitCall}
                busy={busy}
              />
            ) : null}

            {!isSpectator && callingPhase && me?.call == null && !isMyTurn ? (
              <div className="rounded-xl border border-border bg-surface-raised p-4 text-center text-sm text-muted">
                {currentTurnPlayer?.name ?? 'Another player'} is choosing their call first.
              </div>
            ) : null}

            {tablePhase !== 'round-scores' ? (
              <Link to="/" className="block text-center text-sm text-muted hover:text-text">
                Leave session
              </Link>
            ) : null}
          </aside>
        </div>

        {listenError ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Join requests may not update live — publish Firestore rules for joinRequests, then reload.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}
      </div>
    </PageLayout>
  )
}
