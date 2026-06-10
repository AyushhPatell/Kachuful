import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SAR_INFO } from '../../constants/game.js'
import { calculateRoundPoints, isTrumpCard } from '../../lib/gameLogic.js'
<<<<<<< HEAD
import {
  getSeatHandCount,
  getSeatPositions,
  getTrickCardOffset,
  orderPlayersForTable,
} from '../../lib/seatLayout.js'
=======
import { getSeatHandCount, getSeatPositions, orderPlayersForTable } from '../../lib/seatLayout.js'
>>>>>>> 6d43acd (Some Improvements)
import GameMenu from './GameMenu.jsx'
import HandFan from './HandFan.jsx'
import PlayingCard, { DeckStack, SarBadge } from './PlayingCard.jsx'
import SeatPod from './SeatPod.jsx'
import TableSurface from './TableSurface.jsx'
import TurnTimer from './TurnTimer.jsx'

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
  callingPhase = false,
  dealerPlayerId = null,
  onTimerExpire,
  className = '',
}) {
  const seated = orderPlayersForTable(players, turnOrder, currentUserId)
  const seatPositions = getSeatPositions(seated.length)
  const sarInfo = sar ? SAR_INFO[sar] : null
  const reducedMotion = usePrefersReducedMotion()

  const centerCards = trickReveal?.cards?.length ? trickReveal.cards : (cardsOnTable ?? [])
  const trickWinnerId = trickReveal?.winnerId
  const isTrickPhase = tablePhase === 'trick-won'
  const isCollect = tablePhase === 'collect'
  const isDealing = tablePhase === 'dealing'
  const dealComplete = !isDealing || dealStep >= dealSequence.length
  const faceUpHand = dealComplete && tablePhase !== 'dealing'

  const handCtx = { tablePhase, dealSequence, dealStep, cardsPerRound }

  const winnerIndex = seated.findIndex(p => p.id === trickWinnerId)
  const winnerFly = winnerIndex >= 0 ? seatPositions[winnerIndex] : { flyX: 0, flyY: -60 }

  const dealTargetIndex = seated.findIndex(p => p.id === dealTargetPlayerId)
  const dealFly = dealTargetIndex >= 0 ? seatPositions[dealTargetIndex] : { flyX: 0, flyY: -60 }

  const playableIds = new Set(playableCards.map(c => c.id))
  const hiddenCardId = flyPlay?.fromLocal ? flyPlay.card?.id : null
  const localPlayer = seated[0]
  const localIsTurn = currentTurn === currentUserId

  function cardAnimate(play, seatIndex) {
<<<<<<< HEAD
    const trickOffset = getTrickCardOffset(seatIndex, seated.length)
=======
>>>>>>> 6d43acd (Some Improvements)
    if (reducedMotion) {
      if (isCollect) return { opacity: 0, scale: 0.5, x: trickOffset.x, y: trickOffset.y }
      return { opacity: 1, x: trickOffset.x, y: trickOffset.y, scale: 1 }
    }
<<<<<<< HEAD
    if (isCollect) {
      return { x: 0, y: 0, scale: 0.12, opacity: 0, transition: { duration: 0.5 } }
    }
=======
    if (isCollect) return { x: 0, y: 0, scale: 0.12, opacity: 0, transition: { duration: 0.5 } }
>>>>>>> 6d43acd (Some Improvements)
    if (isTrickPhase) {
      return {
        x: winnerFly.flyX,
        y: winnerFly.flyY,
        scale: play.userId === trickWinnerId ? 0.9 : 0.6,
        opacity: play.userId === trickWinnerId ? 1 : 0.3,
        transition: { duration: 0.6, ease: 'easeInOut' },
      }
    }
    return { x: trickOffset.x, y: trickOffset.y, scale: 1, opacity: 1 }
  }

  function tableCardRotation(seatIndex, cardId) {
    const hash = (seatIndex * 37 + (cardId?.charCodeAt?.(0) ?? 0)) % 14
    return hash - 7
  }

  return (
    <section className={`relative flex h-full min-h-0 flex-col ${className}`}>
      <TableSurface className="flex-1">
        {/* HUD */}
        <div className="absolute left-0 right-0 top-2 z-30 flex items-center justify-between gap-2 px-3 sm:top-3 sm:px-4">
          <div
            className="rounded-full px-3 py-1 text-[11px] font-medium text-emerald-100/90 backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.38)', fontFamily: 'Cinzel, serif' }}
          >
            Round {roundNumber}
            {cardsPerRound ? ` · ${cardsPerRound} card${cardsPerRound === 1 ? '' : 's'}` : ''}
          </div>
          <div className="flex items-center gap-2">
            <TurnTimer
              isActive={localIsTurn && tablePhase === 'playing' && (!callingPhase || me?.call == null)}
              resetKey={`${roundNumber}-${currentTurn}`}
              onExpire={onTimerExpire}
            />
            {sarInfo ? <SarBadge sar={sar} compact /> : null}
            {sessionCode ? <GameMenu sessionCode={sessionCode} onLeave={onLeave} /> : null}
          </div>
        </div>

        {/* Opponent seats */}
        <div className="absolute inset-0 z-10">
          {seated.map((player, index) => {
            const pos = seatPositions[index]
            if (!pos?.isLocal) {
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
                    showRoundScores={false}
                    roundPts={roundPts}
                    handCount={handCount}
                    receivingDeal={receivingDeal}
                    tablePhase={tablePhase}
                    callingPhase={callingPhase}
                    isDealer={dealerPlayerId === player.id}
                    compact={seated.length > 4}
                  />
                </div>
              )
            }
            return null
          })}
        </div>

        {/* Center: deck + trick */}
        <div className="absolute left-1/2 top-[44%] z-[15] flex min-h-[100px] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center px-4">
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
                        : { x: dealFly.flyX, y: dealFly.flyY, opacity: 0, scale: 0.5 }
                    }
                    transition={{ duration: 0.36, ease: 'easeOut' }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  >
                    <PlayingCard faceDown small />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}

          {!isDealing && (isCollect || centerCards.length > 0) ? (
            <div className="relative h-28 w-full sm:h-32">
<<<<<<< HEAD
              {centerCards.map(play => {
                const seatIndex = seated.findIndex(p => p.id === play.userId)
=======
              {centerCards.map((play, idx) => {
                const seatIndex = seated.findIndex((p) => p.id === play.userId)
>>>>>>> 6d43acd (Some Improvements)
                const trump = isTrumpCard(play.card, sar ?? trickReveal?.sar)
                const isFlyingHere = flyPlay?.card?.id === play.card.id
                if (isFlyingHere) return null
                const rot = tableCardRotation(seatIndex, play.card.id)

                return (
                  <motion.div
                    key={`${play.userId}-${play.card.id}`}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    initial={reducedMotion ? false : { scale: 0.55, opacity: 0 }}
                    animate={{
                      ...cardAnimate(play, seatIndex),
                      rotate: isTrickPhase || isCollect ? 0 : rot,
                    }}
                  >
                    <div
                      className={`${
                        play.userId === trickWinnerId && isTrickPhase
                          ? 'rounded-lg ring-2 ring-amber-400/90'
                          : trump
                          ? 'rounded-lg ring-[1.5px] ring-emerald-400/70'
                          : ''
                      }`}
                    >
                      <PlayingCard card={play.card} small isTrump={trump} />
                    </div>
                    {trump && !isTrickPhase && !isCollect && (
                      <motion.div
                        initial={{ scale: 0.85, opacity: 0.9 }}
                        animate={{ scale: 2.4, opacity: 0 }}
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                        className="pointer-events-none absolute inset-0 rounded-lg"
                        style={{ border: '2px solid rgba(34,197,94,0.8)' }}
                      />
                    )}
                  </motion.div>
                )
              })}
              {isCollect ? (
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <DeckStack />
                </motion.div>
              ) : null}
            </div>
          ) : null}

<<<<<<< HEAD
          {/* Trick winner announcement */}
=======
>>>>>>> 6d43acd (Some Improvements)
          <AnimatePresence>
            {isTrickPhase && trickReveal?.winnerName ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.72, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                className="mt-3 pointer-events-none"
              >
                <div
                  className="rounded-full px-5 py-1.5 text-sm font-bold text-amber-200 whitespace-nowrap text-center"
                  style={{
                    background: 'rgba(0,0,0,0.68)',
                    border: '1px solid rgba(251,191,36,0.38)',
                    boxShadow: '0 0 20px rgba(251,191,36,0.18)',
                    backdropFilter: 'blur(6px)',
                    fontFamily: 'Cinzel, serif',
                  }}
                >
                  🏆 {trickReveal.winnerName}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Flying play */}
        <AnimatePresence>
          {flyPlay ? (
            <motion.div
              key={flyPlay.key ?? flyPlay.card.id}
              initial={{
                x: flyPlay.fromLocal ? 0 : flyPlay.fromX ?? 0,
                y: flyPlay.fromLocal ? 160 : flyPlay.fromY ?? -100,
                opacity: 1,
                scale: flyPlay.fromLocal ? 1.05 : 0.9,
              }}
              animate={{ x: 0, y: -20, opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.72 }}
              transition={{ duration: reducedMotion ? 0.05 : 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute left-1/2 top-[44%] z-30 -translate-x-1/2 -translate-y-1/2"
            >
              <PlayingCard card={flyPlay.card} small isTrump={isTrumpCard(flyPlay.card, sar)} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Local player hand */}
        {localPlayer && handVisible ? (
          <div
            className={`absolute inset-x-0 bottom-0 z-20 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] sm:px-2 ${
              localIsTurn && tablePhase === 'playing'
                ? 'before:pointer-events-none before:absolute before:inset-x-4 before:bottom-0 before:top-0 before:rounded-t-3xl before:bg-amber-500/[0.055] before:ring-1 before:ring-amber-400/18'
                : ''
            }`}
          >
            <HandFan
              cards={me?.hand ?? []}
              visibleCount={visibleHandCount}
              faceDown={isDealing && !dealComplete}
              faceUpAfterDeal={faceUpHand}
              playableIds={playableIds}
              onPlayCard={onPlayCard}
              busy={busy}
              dimmed={tablePhase === 'trick-won' || tablePhase === 'collect'}
              hiddenCardId={hiddenCardId}
              reducedMotion={reducedMotion}
              isMyTurn={localIsTurn && tablePhase === 'playing'}
              sar={sar}
            />
          </div>
        ) : null}
      </TableSurface>
    </section>
  )
}

export { orderPlayersForTable }
