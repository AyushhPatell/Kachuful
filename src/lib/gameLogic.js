import { RANK_VALUES, SAR_INFO, SAR_SEQUENCE } from '../constants/game.js'

/**
 * @typedef {{ suit: string, rank: string, id: string }} Card
 * @typedef {{ userId: string, card: Card }} PlayedCard
 */

export function getMaxRound(playerCount) {
  return playerCount === 7 ? 7 : 8
}

/** Cards dealt per player for a given session round (1-indexed). */
export function getCardsPerRound(sessionRoundNumber, maxRound) {
  const cycleLength = 2 * maxRound - 1
  const posInCycle = ((sessionRoundNumber - 1) % cycleLength) + 1
  if (posInCycle <= maxRound) return posInCycle
  return 2 * maxRound - posInCycle
}

export function getRoundDirection(sessionRoundNumber, maxRound) {
  const cycleLength = 2 * maxRound - 1
  const posInCycle = ((sessionRoundNumber - 1) % cycleLength) + 1
  return posInCycle <= maxRound ? 'up' : 'down'
}

/** Sar for session round (1-indexed). */
export function getSarForRound(sessionRoundNumber) {
  return SAR_SEQUENCE[(sessionRoundNumber - 1) % SAR_SEQUENCE.length]
}

export function getSarSuit(sar) {
  return resolveTrumpSuit(sar)
}

/** Trump suit for a sar code (Ka/Chu/Fu/L), or null if unknown. */
export function resolveTrumpSuit(sar) {
  if (!sar || typeof sar !== 'string') return null
  return SAR_INFO[sar]?.suit ?? null
}

/** Prefer session + round fields; fall back to round index. */
export function resolveSarForRound(session, round) {
  const roundNumber = session?.currentRound ?? round?.roundNumber ?? 1
  const fromDoc = session?.currentSar ?? round?.sar
  if (fromDoc && SAR_INFO[fromDoc]) return fromDoc
  return getSarForRound(roundNumber)
}

export function isTrumpCard(card, sar) {
  const trumpSuit = resolveTrumpSuit(sar)
  if (!card?.suit || !trumpSuit) return false
  return card.suit === trumpSuit
}

export function calculateRoundPoints(call, tricksWon) {
  if (call === 0 && tricksWon === 0) return 10
  if (call > 0 && call === tricksWon) return call * 10 + 10
  return 0
}

/**
 * Cards the player is allowed to play.
 * Must follow led suit when possible.
 */
export function getPlayableCards(hand, cardsOnTable) {
  if (!cardsOnTable.length) return hand
  const ledSuit = cardsOnTable[0].card.suit
  const matching = hand.filter((c) => c.suit === ledSuit)
  return matching.length > 0 ? matching : hand
}

/**
 * Highest card of led suit wins unless any Sar (trump) was played;
 * then the highest trump wins (spec §10.3).
 */
export function evaluateTrickWinner(cardsOnTable, sar) {
  if (!cardsOnTable.length) return null

  const trumpSuit = resolveTrumpSuit(sar)
  const ledSuit = cardsOnTable[0]?.card?.suit
  const trumpPlays = trumpSuit
    ? cardsOnTable.filter((p) => p.card?.suit === trumpSuit)
    : []

  const pool =
    trumpPlays.length > 0
      ? trumpPlays
      : cardsOnTable.filter((p) => p.card?.suit === ledSuit)

  if (!pool.length) return cardsOnTable[0]

  return pool.reduce((best, current) => {
    const bestVal = RANK_VALUES[best.card.rank] ?? 0
    const currentVal = RANK_VALUES[current.card.rank] ?? 0
    return currentVal > bestVal ? current : best
  })
}

/** Rank players for final leaderboard; fewer failed rounds wins ties. */
export function rankPlayers(players) {
  const sorted = [...players].sort((a, b) => {
    if (b.sessionScore !== a.sessionScore) return b.sessionScore - a.sessionScore
    return a.roundsFailed - b.roundsFailed
  })

  const ranked = []
  let lastScore = null
  let lastFailed = null
  let rank = 0
  let sameRankCount = 0

  for (const player of sorted) {
    if (
      player.sessionScore !== lastScore ||
      player.roundsFailed !== lastFailed
    ) {
      rank += sameRankCount + 1
      sameRankCount = 0
      lastScore = player.sessionScore
      lastFailed = player.roundsFailed
    } else {
      sameRankCount += 1
    }
    ranked.push({ ...player, rank })
  }
  return ranked
}

/** Majority vote; tie defaults to continuing. */
export function resolveVote(votes) {
  const values = Object.values(votes)
  if (!values.length) return 'next'
  const endCount = values.filter((v) => v === 'end').length
  const nextCount = values.filter((v) => v === 'next').length
  return endCount > nextCount ? 'end' : 'next'
}

/** First player to act / deal for this round (0-based index in turnOrder). */
export function getDealerIndexForRound(roundNumber, firstDealerIndex, playerCount) {
  return (firstDealerIndex + roundNumber - 1) % playerCount
}

export function getNextInTurnOrder(turnOrder, currentUserId) {
  const idx = turnOrder.indexOf(currentUserId)
  if (idx === -1) return turnOrder[0] ?? null
  return turnOrder[(idx + 1) % turnOrder.length]
}

/** Next player in order who still has cards in hand. */
export function getNextPlayerWithCards(turnOrder, currentUserId, handsByPlayerId) {
  const startIdx = turnOrder.indexOf(currentUserId)
  if (startIdx === -1) return null

  for (let step = 1; step <= turnOrder.length; step += 1) {
    const id = turnOrder[(startIdx + step) % turnOrder.length]
    const hand = handsByPlayerId[id] ?? []
    if (hand.length > 0) return id
  }
  return null
}

/** Players still in the current trick (have at least one card). */
export function getPlayersInTrick(turnOrder, handsByPlayerId) {
  return turnOrder.filter((id) => (handsByPlayerId[id] ?? []).length > 0)
}
