/**
 * Build deal order: dealer first, one card per player per round, repeated.
 * @returns {string[]} player ids in deal order
 */
export function buildDealSequence(turnOrder, cardsPerRound, dealerIndex = 0) {
  if (!turnOrder.length || cardsPerRound <= 0) return []

  const order = [...turnOrder.slice(dealerIndex), ...turnOrder.slice(0, dealerIndex)]
  const sequence = []
  for (let round = 0; round < cardsPerRound; round += 1) {
    for (const playerId of order) {
      sequence.push(playerId)
    }
  }
  return sequence
}

/** How many cards dealt to playerId in first `dealStep` steps. */
export function cardsDealtToPlayer(dealSequence, dealStep, playerId) {
  return dealSequence.slice(0, dealStep).filter((id) => id === playerId).length
}
