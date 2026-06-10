import { cardsDealtToPlayer } from './dealSequence.js'

/**
 * Seat geometry. Index 0 = you (bottom). Opponents on ellipse / head-to-head for 2P.
 * ry is intentionally smaller than rx to keep top opponents away from the viewport edge.
 */
export function getSeatPositions(playerCount) {
  const count = Math.max(2, Math.min(playerCount, 7))

  if (count === 2) {
    return [
      { x: 50, y: 92, flyX: 0, flyY: 130,  angle: Math.PI / 2,  isLocal: true  },
      { x: 50, y: 14, flyX: 0, flyY: -115, angle: -Math.PI / 2, isLocal: false },
    ]
  }

  // rx = horizontal radius, ry = vertical radius (kept smaller so top seats don't clip)
  const rx = count <= 3 ? 40 : count <= 5 ? 43 : 45
  const ry = count <= 3 ? 32 : count <= 5 ? 35 : 37
  const startAngle = Math.PI / 2

  return Array.from({ length: count }, (_, i) => {
    const angle = startAngle + (i / count) * 2 * Math.PI
    const x = 50 + rx * Math.cos(angle)
    const y = 50 + ry * Math.sin(angle)
    return {
      x,
      y,
      flyX: Math.cos(angle) * 100,
      flyY: Math.sin(angle) * 88,
      angle,
      isLocal: i === 0,
    }
  })
}

/** Offset played cards from center toward each seat (Hearts-style trick pile). */
export function getTrickCardOffset(seatIndex, playerCount) {
  const pos = getSeatPositions(playerCount)[seatIndex]
  if (!pos) return { x: 0, y: 0 }
  const dist = playerCount === 2 ? 52 : playerCount <= 4 ? 44 : 38
  return {
    x: Math.cos(pos.angle) * dist,
    y: Math.sin(pos.angle) * dist * 0.82,
  }
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
