import { RANKS, SUITS } from '../constants/game.js'

/** @returns {import('./gameLogic.js').Card[]} */
export function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}-${suit}` })
    }
  }
  return deck
}

/** Fisher–Yates shuffle (mutates array). */
export function shuffleDeck(deck) {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/** Deal `cardsPerPlayer` cards to each player in join order. */
export function dealHands(playerIds, cardsPerPlayer) {
  const deck = shuffleDeck(createDeck())
  const needed = playerIds.length * cardsPerPlayer
  if (needed > deck.length) {
    throw new Error(`Cannot deal ${cardsPerPlayer} cards to ${playerIds.length} players`)
  }

  const hands = Object.fromEntries(playerIds.map((id) => [id, []]))
  let index = 0
  for (let round = 0; round < cardsPerPlayer; round += 1) {
    for (const playerId of playerIds) {
      hands[playerId].push(deck[index])
      index += 1
    }
  }
  return hands
}
