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
  return SAR_INFO[sar].suit
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

/** Highest card wins; trump (sar suit) beats non-trump. */
export function evaluateTrickWinner(cardsOnTable, sar) {
  if (!cardsOnTable.length) return null

  const trumpSuit = getSarSuit(sar)
  const ledSuit = cardsOnTable[0].card.suit
  const trumpPlays = cardsOnTable.filter((p) => p.card.suit === trumpSuit)

  const pool = trumpPlays.length
    ? trumpPlays
    : cardsOnTable.filter((p) => p.card.suit === ledSuit)

  return pool.reduce((best, current) => {
    const bestVal = RANK_VALUES[best.card.rank]
    const currentVal = RANK_VALUES[current.card.rank]
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
