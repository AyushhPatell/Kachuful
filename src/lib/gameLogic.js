import { RANK_VALUES, SAR_INFO, SAR_SEQUENCE } from '../constants/game.js'

/**
 * @typedef {{ suit: string, rank: string, id: string }} Card
 * @typedef {{ userId: string, card: Card }} PlayedCard
 */

export function getMaxRound(playerCount) {
  return playerCount === 7 ? 7 : 8
}

// Display order alternates black/red so the two black suits (spades, clubs)
// are never placed next to each other — easier to tell them apart at a glance.
const SUIT_DISPLAY_ORDER = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 }

/** Sort a hand for display: grouped by suit, ascending rank within each suit.
 * Pure — returns a new array, does not mutate the input. */
export function sortHandForDisplay(cards) {
  return [...(cards ?? [])].sort((a, b) => {
    const suitDiff = (SUIT_DISPLAY_ORDER[a.suit] ?? 9) - (SUIT_DISPLAY_ORDER[b.suit] ?? 9)
    if (suitDiff !== 0) return suitDiff
    return (RANK_VALUES[a.rank] ?? 0) - (RANK_VALUES[b.rank] ?? 0)
  })
}

/** Cards dealt per player for a given session round (1-indexed).
 * Cycle: 1,2,...,8,8,7,...,2,1,1,2,... — peak and trough each appear twice. */
export function getCardsPerRound(sessionRoundNumber, maxRound) {
  const cycleLength = 2 * maxRound
  const posInCycle = ((sessionRoundNumber - 1) % cycleLength) + 1
  if (posInCycle <= maxRound) return posInCycle
  return 2 * maxRound + 1 - posInCycle
}

export function getRoundDirection(sessionRoundNumber, maxRound) {
  const cycleLength = 2 * maxRound
  const posInCycle = ((sessionRoundNumber - 1) % cycleLength) + 1
  return posInCycle <= maxRound ? 'up' : 'down'
}

/** Sar for session round (1-indexed). Round 0 / invalid → treat as round 1. */
export function getSarForRound(sessionRoundNumber) {
  const n = Math.max(1, Math.floor(Number(sessionRoundNumber)) || 1)
  return SAR_SEQUENCE[(n - 1) % SAR_SEQUENCE.length]
}

export function getSarSuit(sar) {
  return resolveTrumpSuit(sar)
}

/** Trump suit for a sar code (Ka/Chu/Fu/L), or null if unknown. */
export function resolveTrumpSuit(sar) {
  if (!sar || typeof sar !== 'string') return null
  return SAR_INFO[sar]?.suit ?? null
}

/** Prefer session + round fields; fall back to round index (never use 0). */
export function resolveSarForRound(session, round) {
  const roundNumber = Math.max(
    1,
    Math.floor(Number(session?.currentRound ?? round?.roundNumber ?? 1)) || 1,
  )
  const fromDoc = session?.currentSar ?? round?.sar
  if (fromDoc && SAR_INFO[fromDoc]) return fromDoc
  return getSarForRound(roundNumber)
}

export function isTrumpCard(card, sar) {
  const trumpSuit = resolveTrumpSuit(sar)
  if (!card?.suit || !trumpSuit) return false
  return card.suit === trumpSuit
}

/**
 * Spec examples: 0/0 → 10; called 1 won 1 → 11; called 4 won 4 → 40.
 * Exact match only; over/under call → 0.
 */
export function calculateRoundPoints(call, tricksWon) {
  if (call !== tricksWon) return 0
  if (call === 0) return 10
  return call * 10 + (call === 1 ? 1 : 0)
}

/**
 * True while a player can still hit their exact call this round; false once
 * it's impossible (already overshot, or not enough tricks left to reach it).
 * Returns null when the player hasn't called. Used for the on-pace glow.
 */
export function isCallStillPossible(call, tricksWon, cardsLeft) {
  if (call == null) return null
  const won = tricksWon ?? 0
  const left = cardsLeft ?? 0
  if (won > call) return false
  if (call - won > left) return false
  return true
}

/**
 * Drama line for the final trick of a round. `inRound` is the players still
 * holding their last card: [{ name, call, tricksWon }]. Returns a short
 * callout string, or null when nobody's call hinges on this trick.
 */
export function getFinalTrickCallout(inRound) {
  const live = (inRound ?? []).filter((p) => p.call != null)
  const needWin = live.filter((p) => p.call - (p.tricksWon ?? 0) === 1)
  const mustAvoid = live.filter((p) => (p.tricksWon ?? 0) === p.call)
  if (needWin.length === 1) return `${needWin[0].name} needs this trick!`
  if (needWin.length >= 2) return 'Last trick decides it!'
  if (mustAvoid.length >= 1) return 'Final trick — hold your nerve!'
  return null
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

  const winner = pool.reduce((best, current) => {
    const bestVal = RANK_VALUES[best.card.rank] ?? 0
    const currentVal = RANK_VALUES[current.card.rank] ?? 0
    return currentVal > bestVal ? current : best
  })

  if (trumpPlays.length > 0 && !trumpPlays.some((p) => p.userId === winner.userId)) {
    return trumpPlays.reduce((best, current) => {
      const bestVal = RANK_VALUES[best.card.rank] ?? 0
      const currentVal = RANK_VALUES[current.card.rank] ?? 0
      return currentVal > bestVal ? current : best
    })
  }

  return winner
}

/**
 * Sum each player's points and count their failed rounds (points === 0, i.e.
 * didn't make their exact call) straight from the per-round results — the
 * authoritative score source. `rounds`: [{ results: { [id]: { points } } }].
 * Returns { totals: { [id]: number }, failed: { [id]: number } }.
 */
export function computeSessionTotals(rounds) {
  const totals = {}
  const failed = {}
  for (const r of rounds ?? []) {
    for (const [id, res] of Object.entries(r.results ?? {})) {
      totals[id] = (totals[id] ?? 0) + (res.points ?? 0)
      failed[id] = (failed[id] ?? 0) + (res.points === 0 ? 1 : 0)
    }
  }
  return { totals, failed }
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

/**
 * Award one fun epithet to each notable player based on how the finished
 * session played out. Pure — takes the players and the round-by-round results
 * ([{ roundNumber, results: { [id]: { call, won, points } } }]). Returns
 * { [playerId]: { label, emoji } }, at most one title per player.
 */
export function computePlayerTitles(players, rounds) {
  const stats = {}
  for (const p of players) {
    stats[p.id] = { participated: 0, made: 0, totalCalled: 0, nils: 0, streak: 0, bestStreak: 0 }
  }

  const ordered = [...(rounds ?? [])].sort((a, b) => a.roundNumber - b.roundNumber)
  for (const r of ordered) {
    for (const p of players) {
      const s = stats[p.id]
      const res = r.results?.[p.id]
      if (!res) { s.streak = 0; continue }
      s.participated += 1
      s.totalCalled += res.call ?? 0
      const made = (res.call ?? 0) === (res.won ?? 0)
      if (made) {
        s.made += 1
        s.streak += 1
        if (s.streak > s.bestStreak) s.bestStreak = s.streak
        if ((res.call ?? 0) === 0) s.nils += 1
      } else {
        s.streak = 0
      }
    }
  }

  const categories = [
    { label: 'Sharpshooter', emoji: '🎯', eligible: (s) => s.participated >= 2 && s.made >= 1, value: (s) => s.made / s.participated },
    { label: 'Daredevil',    emoji: '😈', eligible: (s) => s.totalCalled >= 1,                  value: (s) => s.totalCalled },
    { label: 'Nil Master',   emoji: '🧊', eligible: (s) => s.nils >= 1,                         value: (s) => s.nils },
    { label: 'On Fire',      emoji: '🔥', eligible: (s) => s.bestStreak >= 3,                   value: (s) => s.bestStreak },
    { label: 'Steady Hand',  emoji: '💎', eligible: (s) => s.participated >= 3,                 value: (s) => s.made },
  ]

  const titles = {}
  const taken = new Set()
  for (const cat of categories) {
    let bestId = null
    let bestVal = -Infinity
    for (const p of players) {
      if (taken.has(p.id)) continue
      const s = stats[p.id]
      if (!cat.eligible(s)) continue
      const v = cat.value(s)
      if (v > bestVal) { bestVal = v; bestId = p.id }
    }
    if (bestId != null) {
      titles[bestId] = { label: cat.label, emoji: cat.emoji }
      taken.add(bestId)
    }
  }
  return titles
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
