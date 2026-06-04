import { RANK_VALUES, SUITS } from '../constants/game.js'

const SUIT_ORDER = Object.fromEntries(SUITS.map((suit, index) => [suit, index]))

/** Sort hand for display: suit (color) then rank low → high. */
export function sortHand(cards = []) {
  return [...cards].sort((a, b) => {
    const suitDiff = (SUIT_ORDER[a.suit] ?? 0) - (SUIT_ORDER[b.suit] ?? 0)
    if (suitDiff !== 0) return suitDiff
    return (RANK_VALUES[a.rank] ?? 0) - (RANK_VALUES[b.rank] ?? 0)
  })
}
