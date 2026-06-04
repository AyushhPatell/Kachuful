import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SAR_INFO } from '../../constants/game.js'
import { calculateRoundPoints, isTrumpCard } from '../../lib/gameLogic.js'
import { getSeatHandCount, getSeatPositions, orderPlayersForTable } from '../../lib/seatLayout.js'
import Button from '../ui/Button.jsx'
import CardStackBadge from './CardStackBadge.jsx'
import HandFan from './HandFan.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'
import PlayingCard, { DeckStack, SarBadge } from './PlayingCard.jsx'
import SeatPod from './SeatPod.jsx'
import TableSurface from './TableSurface.jsx'
import GameMenu from './GameMenu.jsx'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = () => setReduced(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

function getRoundPoints(player, round) {
  const stored = round?.results?.[player.id]
  if (stored) return stored.points ?? 0
  return calculateRoundPoints(player.call ?? 0, player.tricksWon ?? 0)
}

export default function GameTable({
  players,
  turnOrder = [],
  cardsOnTable,
  trickReveal,
  tablePhase = 'playing',
  round,
  roundNumber,
  sar,
  cardsPerRound = 0,
  currentTurn,
  currentUserId,
  isOwner,
  busy,
  scoresReady,
  onNextRound,
  onLeave,
  dealStep = 0,
  dealTargetPlayerId = null,
  dealSequence = [],
  me,
  handVisible,
  visibleHandCount,
  playableCards = [],
  onPlayCard,
  flyPlay,
  authPhotoURL,
  sessionCode,
  turnMessage,
  isMyTurn,
  sortedHand = [],
  className = '',
}) {
  const seated = orderPlayersForTable(players, turnOrder, currentUserId)
  const seatPositions = getSeatPositions(seated.length)
  const sarInfo = sar ? SAR_INFO[sar] : null
  const reducedMotion = usePrefersReducedMotion()
  const [leaveConfirm, setLeaveConfirm] = useState(false)

  const centerCards = trickReveal?.cards?.length ? trickReveal.cards : (cardsOnTable ?? [])
  const trickWinnerId = trickReveal?.winnerId
  const isTrickPhase = tablePhase === 'trick-won'
  const isCollect = tablePhase === 'collect'
  const showRoundScores = tablePhase === 'round-scores' && scoresReady
  const isDealing = tablePhase === 'dealing'
  const dealComplete = !isDealing || dealStep >= dealSequence.length
  const faceUpHand = dealComplete && tablePhase !== 'dealing'

  const handCtx = { tablePhase, dealSequence, dealStep, cardsPerRound }

  const winnerIndex = seated.findIndex((p) => p.id === trickWinnerId)
  const winnerFly = winnerIndex >= 0 ? seatPositions[winnerIndex] : { flyX: 0, flyY: -60 }

  const dealTargetIndex = seated.findIndex((p) => p.id === dealTargetPlayerId)
  const dealFly = dealTargetIndex >= 0 ? seatPositions[dealTargetIndex] : { flyX: 0, flyY: -60 }

  const playableIds = new Set(playableCards.map((c) => c.id))
  const hiddenCardId = flyPlay?.fromLocal ? flyPlay.card?.id : null

  function cardAnimate(play) {
    if (reducedMotion) {
      if (isCollect) return { opacity: 0, scale: 0.5 }
      return { opacity: 1, x: 0, y: 0, scale: 1 }
    }
    if (isCollect) {
      return { x: 0, y: 0, scale: 0.15, opacity: 0, transition: { duration: 0.55 } }
    }
    if (isTrickPhase) {
      return {
        x: winnerFly.flyX,
        y: winnerFly.flyY,
        scale: play.userId === trickWinnerId ? 0.9 : 0.72,
        opacity: play.userId === trickWinnerId ? 1 : 0.45,
        transition: { duration: 0.65, ease: 'easeInOut' },
      }
    }
    return { x: 0, y: 0, scale: 1, opacity: 1 }
  }

  const localPlayer = seated[0]
  const localHandCount = localPlayer
    ? getSeatHandCount(localPlayer, currentUserId, handCtx)
    : 0

  return (
    <section className={`relative ${className}`}>
      <TableSurface>
        {/* HUD on felt */}
        <div className="absolute left-0 right-0 top-3 z-20 flex items-start justify-between gap-2 px-3 sm:px-4">
          <div className="rounded-full bg-black/25 px-3 py-1 text-[11px] font-medium text-emerald-100/90 backdrop-blur-sm">
            Round {roundNumber}
            {cardsPerRound ? ` · ${cardsPerRound} card${cardsPerRound === 1 ? '' : 's'}` : ''}
          </div>
          <div className="flex items-center gap-2">
            {sarInfo ? <SarBadge sar={sar} compact /> : null}
            {sessionCode ? <GameMenu sessionCode={sessionCode} /> : null}
          </div>
        </div>

        {/* Seats */}
        <div className="absolute inset-0 z-10">
          {seated.map((player, index) => {
            const pos = seatPositions[index]
            if (!pos || pos.isLocal) return null

            const isTurn = currentTurn === player.id
            const isTrickWinner = trickWinnerId === player.id && isTrickPhase
            const roundPts = getRoundPoints(player, round)
            const handCount = getSeatHandCount(player, currentUserId, handCtx)
            const receivingDeal = isDealing && dealTargetPlayerId === player.id

            return (
              <div
                key={player.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <SeatPod
                  player={player}
                  isTurn={isTurn}
                  isTrickWinner={isTrickWinner}
                  isLocal={false}
                  showRoundScores={showRoundScores}
                  roundPts={roundPts}
                  handCount={handCount}
                  receivingDeal={receivingDeal}
                  tablePhase={tablePhase}
                />
              </div>
            )
          })}
        </div>

        {/* Center: deck / trick */}
        <div className="absolute left-1/2 top-[42%] z-[15] flex min-h-[120px] w-[88%] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center">
          {isDealing ? (
            <div className="relative flex flex-col items-center">
              <DeckStack />
              <AnimatePresence>
                {dealTargetPlayerId ? (
                  <motion.div
                    key={`deal-${dealStep}`}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={
                      reducedMotion
                        ? { opacity: 0 }
                        : { x: dealFly.flyX, y: dealFly.flyY, opacity: 0, scale: 0.55 }
                    }
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  >
                    <PlayingCard faceDown small />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}

          {!isDealing && (isCollect || centerCards.length > 0) ? (
            <div className="relative flex flex-wrap items-end justify-center gap-2 sm:gap-3">
              {centerCards.map((play) => {
                const trump = isTrumpCard(play.card, sar ?? trickReveal?.sar)
                const isFlyingHere = flyPlay?.card?.id === play.card.id
                if (isFlyingHere) return null
                return (
                  <motion.div
                    key={`${play.userId}-${play.card.id}`}
                    layoutId={`card-${play.card.id}`}
                    layout={!isTrickPhase && !isCollect}
                    initial={reducedMotion ? false : { scale: 0.75, opacity: 0, y: 14 }}
                    animate={cardAnimate(play)}
                    className={`text-center ${
                      play.userId === trickWinnerId && isTrickPhase
                        ? 'rounded-xl ring-2 ring-amber-400/90'
                        : trump
                          ? 'rounded-xl ring-1 ring-emerald-300/50'
                          : ''
                    }`}
                  >
                    <PlayingCard card={play.card} small />
                  </motion.div>
                )
              })}
              {isCollect ? (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <DeckStack />
                </motion.div>
              ) : null}
            </div>
          ) : null}

          {!isDealing && !isCollect && centerCards.length === 0 && !showRoundScores && !flyPlay ? (
            turnMessage ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`max-w-[90%] rounded-2xl px-5 py-3 text-center shadow-lg backdrop-blur-sm ${
                  isMyTurn
                    ? 'bg-amber-500/25 ring-1 ring-amber-400/40'
                    : 'bg-black/35 ring-1 ring-white/10'
                }`}
              >
                <p
                  className={`text-sm font-medium leading-snug ${
                    isMyTurn ? 'text-amber-50' : 'text-emerald-100/90'
                  }`}
                >
                  {turnMessage}
                </p>
              </motion.div>
            ) : (
              <p className="text-sm text-emerald-100/30">Play a card</p>
            )
          ) : null}

          {turnMessage && !isDealing && centerCards.length > 0 && !isTrickPhase ? (
            <p className="mt-2 max-w-[90%] text-center text-[11px] text-emerald-100/60">{turnMessage}</p>
          ) : null}

          {isTrickPhase && trickReveal?.winnerName ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-center text-xs font-medium text-amber-200/90"
            >
              {trickReveal.winnerName} wins the trick
            </motion.p>
          ) : null}
        </div>

        {/* Flying play overlay */}
        <AnimatePresence>
          {flyPlay ? (
            <motion.div
              key={flyPlay.key ?? flyPlay.card.id}
              initial={{
                x: flyPlay.fromLocal ? 0 : flyPlay.fromX ?? 0,
                y: flyPlay.fromLocal ? 120 : flyPlay.fromY ?? -80,
                opacity: 1,
                scale: flyPlay.fromLocal ? 1 : 0.85,
              }}
              animate={{ x: 0, y: -40, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: reducedMotion ? 0.05 : 0.42, ease: 'easeOut' }}
              className="pointer-events-none absolute left-1/2 top-[42%] z-30 -translate-x-1/2 -translate-y-1/2"
            >
              <PlayingCard card={flyPlay.card} small layoutId={`card-${flyPlay.card.id}`} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Local player pod + hand fan */}
        {localPlayer && handVisible ? (
          <div className="absolute inset-x-0 bottom-0 z-20 px-2 pb-2 sm:pb-3">
            <div className="mb-1 flex flex-col items-center">
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1 ${
                  currentTurn === localPlayer.id && tablePhase === 'playing'
                    ? 'bg-amber-500/20 ring-1 ring-amber-400/50'
                    : 'bg-black/20'
                }`}
              >
                <PlayerAvatar
                  name={localPlayer.name}
                  photoURL={localPlayer.photoURL ?? authPhotoURL}
                  size="sm"
                />
                <span className="text-[11px] font-medium text-emerald-50">{localPlayer.name}</span>
                <span className="text-[10px] text-emerald-200/60">
                  {localPlayer.tricksWon ?? 0} won
                </span>
                {localHandCount > 0 && !showRoundScores ? (
                  <span className="text-[10px] text-emerald-200/50">· {localHandCount} cards</span>
                ) : null}
              </div>
            </div>

            <HandFan
              cards={sortedHand}
              visibleCount={visibleHandCount}
              faceDown={isDealing && !dealComplete}
              faceUpAfterDeal={faceUpHand}
              playableIds={playableIds}
              onPlayCard={onPlayCard}
              busy={busy}
              dimmed={tablePhase === 'trick-won' || tablePhase === 'collect'}
              hiddenCardId={hiddenCardId}
              reducedMotion={reducedMotion}
            />
          </div>
        ) : null}

        {/* Spectator / round score local badges */}
        {showRoundScores && localPlayer ? (
          <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center">
            <div className="rounded-xl bg-black/40 px-4 py-2 text-center text-xs text-emerald-100 backdrop-blur-sm">
              <p>Call {localPlayer.call ?? 0} · Won {localPlayer.tricksWon ?? 0}</p>
              <p className="font-semibold text-amber-300">
                {getRoundPoints(localPlayer, round) > 0
                  ? `+${getRoundPoints(localPlayer, round)} pts`
                  : '0 pts'}
              </p>
            </div>
          </div>
        ) : null}
      </TableSurface>

      {showRoundScores ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex flex-col gap-2 sm:flex-row"
        >
          {isOwner ? (
            <Button className="flex-1" disabled={busy} onClick={onNextRound}>
              Next round
            </Button>
          ) : (
            <p className="flex-1 rounded-xl bg-surface-raised px-3 py-2.5 text-center text-xs text-muted">
              Waiting for host to start next round…
            </p>
          )}
          <Button variant="secondary" className="flex-1" onClick={() => setLeaveConfirm(true)}>
            Leave session
          </Button>
        </motion.div>
      ) : null}

      {leaveConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface-raised p-5 shadow-xl">
            <p className="text-center text-sm text-text">
              Leave this session? You will be removed from the table for everyone else.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setLeaveConfirm(false)}>
                Stay
              </Button>
              <Button className="flex-1" onClick={() => onLeave?.()}>
                Leave
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export { orderPlayersForTable }
