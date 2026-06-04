import { cardsDealtToPlayer } from './dealSequence.js'

/**
 * Polar seat positions on an ellipse. Index 0 = local player at bottom.
 * Returns percentages (0–100) relative to table play area.
 */
export function getSeatPositions(playerCount) {
  const count = Math.max(2, Math.min(playerCount, 7))
  const rx = count <= 3 ? 38 : count <= 5 ? 42 : 44
  const ry = count <= 3 ? 34 : count <= 5 ? 38 : 40
  const startAngle = Math.PI / 2

  return Array.from({ length: count }, (_, i) => {
    const angle = startAngle + (i / count) * 2 * Math.PI
    const x = 50 + rx * Math.cos(angle)
    const y = 50 + ry * Math.sin(angle)
    return {
      x,
      y,
      flyX: Math.cos(angle) * 95,
      flyY: Math.sin(angle) * 82,
      angle,
      isLocal: i === 0,
    }
  })
}

export function orderPlayersForTable(players, turnOrder, meId) {
  const seated = turnOrder
    .map((id) => players.find((p) => p.id === id))
    .filter((p) => p && p.status !== 'spectator')

  if (!meId) return seated
  const idx = seated.findIndex((p) => p.id === meId)
  if (idx <= 0) return seated
  return [...seated.slice(idx), ...seated.slice(0, idx)]
}

/** Visible hand count for seat stack badge. */
export function getSeatHandCount(player, meId, ctx) {
  const { tablePhase, dealSequence, dealStep, cardsPerRound } = ctx

  if (tablePhase === 'dealing') {
    return cardsDealtToPlayer(dealSequence, dealStep, player.id)
  }

  if (player.handCount != null) return player.handCount

  if (player.id === meId) return player.hand?.length ?? 0

  if (player.hand?.length != null) return player.hand.length

  return cardsPerRound
}
