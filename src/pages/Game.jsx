import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout.jsx'
import CallPicker from '../components/game/CallPicker.jsx'
import GameTable from '../components/game/GameTable.jsx'
import PlayingCard, { SarBadge } from '../components/game/PlayingCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  playCard,
  submitCall,
  subscribeToPlayers,
  subscribeToRound,
  subscribeToSession,
} from '../firebase/sessions.js'
import { getCardsPerRound, getPlayableCards } from '../lib/gameLogic.js'
import { ROUND_STATUS } from '../constants/game.js'

export default function Game() {
  const { code } = useParams()
  const { userId } = useAuth()
  const currentUserId = userId

  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])
  const [round, setRound] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dealAnimation, setDealAnimation] = useState(false)

  const me = players.find((p) => p.id === currentUserId)
  const roundNumber = session?.currentRound ?? 0
  const cardsPerRound = session ? getCardsPerRound(roundNumber, session.maxRound) : 0
  const isMyTurn = session?.currentTurn === currentUserId
  const isSpectator = me?.status === 'spectator'
  const currentTurnPlayer = players.find((p) => p.id === session?.currentTurn)

  const callingPhase = round?.status === ROUND_STATUS.CALLING
  const playingPhase = round?.status === ROUND_STATUS.PLAYING
  const roundComplete = round?.status === ROUND_STATUS.COMPLETE

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
    if (!roundNumber) return undefined
    return subscribeToRound(code, roundNumber, setRound)
  }, [code, roundNumber])

  useEffect(() => {
    if (callingPhase && me?.hand?.length) {
      setDealAnimation(true)
      const t = setTimeout(() => setDealAnimation(false), 900)
      return () => clearTimeout(t)
    }
    return undefined
  }, [callingPhase, roundNumber, me?.hand?.length])

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

  const turnMessage = (() => {
    if (roundComplete) return 'Round complete — scores updated'
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

        {isSpectator ? (
          <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-center text-sm text-muted">
            Spectator mode — you will join as a player from the next round.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
          <div className="space-y-4 lg:col-span-8">
            <GameTable cardsOnTable={session?.cardsOnTable} players={players} />

            {!isSpectator && (callingPhase || playingPhase) && me?.hand?.length ? (
              <section>
                <h2 className="mb-3 text-center text-xs uppercase tracking-wider text-muted">
                  Your Hand
                </h2>
                <div
                  className={`-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 md:flex-wrap md:justify-center md:overflow-visible ${
                    dealAnimation ? 'opacity-80' : ''
                  }`}
                >
                  {(me?.hand ?? []).map((card, index) => {
                    const canPlay =
                      playingPhase &&
                      isMyTurn &&
                      playableCards.some((c) => c.id === card.id)
                    return (
                      <PlayingCard
                        key={card.id}
                        card={card}
                        onClick={canPlay && !busy ? () => handlePlayCard(card) : undefined}
                        selected={canPlay}
                        dealDelay={dealAnimation ? index * 0.08 : 0}
                      />
                    )
                  })}
                </div>
              </section>
            ) : null}

            {roundComplete ? (
              <div className="rounded-xl border border-border bg-surface-raised p-4 text-center text-sm text-muted">
                Round finished. Voting and next round flow coming soon.
              </div>
            ) : null}
          </div>

          <aside className="space-y-4 lg:col-span-4 lg:sticky lg:top-4">
            <section className="rounded-xl border border-border bg-surface-raised p-4">
              <h2 className="mb-3 text-xs uppercase tracking-wider text-muted">Standings</h2>
              <ul className="space-y-2">
                {players.map((player) => (
                  <li
                    key={player.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      player.id === session?.currentTurn
                        ? 'bg-accent/15 ring-1 ring-accent/40'
                        : 'bg-surface'
                    }`}
                  >
                    <span className="truncate pr-2">
                      {player.name}
                      {player.id === session?.currentTurn
                        ? callingPhase
                          ? ' • calling'
                          : playingPhase
                            ? ' • turn'
                            : ''
                        : ''}
                    </span>
                    <span className="text-right text-xs text-muted">
                      call {player.call ?? '…'} · won {player.tricksWon ?? 0} · {player.sessionScore}{' '}
                      pts
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

            <Link to="/" className="block text-center text-sm text-muted hover:text-text">
              Leave session
            </Link>
          </aside>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}
      </div>
    </PageLayout>
  )
}
