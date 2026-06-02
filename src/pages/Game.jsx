import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout.jsx'
import Button from '../components/ui/Button.jsx'
import PlayingCard, { SarBadge } from '../components/game/PlayingCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  submitCall,
  subscribeToPlayers,
  subscribeToRound,
  subscribeToSession,
} from '../firebase/sessions.js'
import { getCardsPerRound } from '../lib/gameLogic.js'
import { ROUND_STATUS } from '../constants/game.js'

export default function Game() {
  const { code } = useParams()
  const { userId } = useAuth()
  const currentUserId = userId

  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])
  const [round, setRound] = useState(null)
  const [callInput, setCallInput] = useState('')
  const [error, setError] = useState('')

  const me = players.find((p) => p.id === currentUserId)
  const roundNumber = session?.currentRound ?? 0
  const cardsPerRound = session ? getCardsPerRound(roundNumber, session.maxRound) : 0
  const isMyTurn = session?.currentTurn === currentUserId
  const isSpectator = me?.status === 'spectator'

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

  async function handleSubmitCall() {
    const call = Number(callInput)
    if (Number.isNaN(call) || call < 0 || call > cardsPerRound) {
      setError(`Call must be between 0 and ${cardsPerRound}.`)
      return
    }
    setError('')
    try {
      await submitCall(code, roundNumber, currentUserId, call)
      setCallInput('')
    } catch (err) {
      setError(err.message)
    }
  }

  const callingPhase = round?.status === ROUND_STATUS.CALLING
  const playingPhase = round?.status === ROUND_STATUS.PLAYING

  return (
    <PageLayout title={`Round ${roundNumber} · ${cardsPerRound} card${cardsPerRound === 1 ? '' : 's'}`}>
      <div className="flex justify-center">
        <SarBadge sar={session?.currentSar} />
      </div>

      {isSpectator ? (
        <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-center text-sm text-muted">
          Spectator mode — you will join as a player from the next round.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-12 md:items-start">
        <div className="space-y-4 md:col-span-8">
          <section className="rounded-xl border border-border bg-surface-raised p-4">
            <h2 className="mb-3 text-center text-xs uppercase tracking-wider text-muted">Table</h2>
            <div className="flex min-h-28 flex-wrap items-center justify-center gap-3">
              {(session?.cardsOnTable ?? []).map((play) => (
                <div key={`${play.userId}-${play.card.id}`} className="text-center">
                  <PlayingCard card={play.card} small />
                  <p className="mt-1 max-w-16 truncate text-xs text-muted">
                    {players.find((p) => p.id === play.userId)?.name ?? 'Player'}
                  </p>
                </div>
              ))}
              {!session?.cardsOnTable?.length ? (
                <p className="text-sm text-muted">No cards played yet</p>
              ) : null}
            </div>
          </section>

          {!isSpectator && (callingPhase || playingPhase) ? (
            <section>
              <h2 className="mb-3 text-center text-xs uppercase tracking-wider text-muted">Your Hand</h2>
              <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 md:flex-wrap md:justify-center md:overflow-visible landscape:flex-nowrap landscape:justify-start landscape:overflow-x-auto landscape:md:flex-wrap landscape:md:justify-center landscape:md:overflow-visible">
                {(me?.hand ?? []).map((card) => (
                  <PlayingCard
                    key={card.id}
                    card={card}
                    onClick={playingPhase && isMyTurn ? () => {} : undefined}
                  />
                ))}
              </div>
              {playingPhase && isMyTurn ? (
                <p className="mt-3 text-center text-sm text-accent">Your turn — tap a card to play</p>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 md:col-span-4 md:sticky md:top-4">
          <section className="rounded-xl border border-border bg-surface-raised p-4">
            <h2 className="mb-3 text-xs uppercase tracking-wider text-muted">Standings</h2>
            <ul className="space-y-2">
              {players.map((player) => (
                <li
                  key={player.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    player.id === session?.currentTurn ? 'bg-accent/15 ring-1 ring-accent/40' : 'bg-surface'
                  }`}
                >
                  <span className="truncate pr-2">
                    {player.name}
                    {player.id === session?.currentTurn ? ' • turn' : ''}
                  </span>
                  <span className="text-right text-xs text-muted sm:text-sm">
                    call {player.call ?? '—'} · won {player.tricksWon ?? 0} · {player.sessionScore} pts
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {!isSpectator && callingPhase && me?.call == null ? (
            <section className="rounded-xl border border-border bg-surface-raised p-4">
              <h2 className="mb-2 text-sm font-semibold text-text">Call your tricks</h2>
              <p className="mb-4 text-sm text-muted">
                How many tricks will you win this round? Exact match scores; over or under scores 0.
              </p>
              <div className="flex flex-col gap-3">
                <input
                  type="number"
                  min={0}
                  max={cardsPerRound}
                  value={callInput}
                  onChange={(e) => setCallInput(e.target.value)}
                  className="h-12 w-full rounded-lg border border-border bg-surface px-4 py-3 text-text outline-none focus:border-accent"
                />
                <Button className="h-12 w-full" onClick={handleSubmitCall}>
                  Submit
                </Button>
              </div>
            </section>
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
    </PageLayout>
  )
}
