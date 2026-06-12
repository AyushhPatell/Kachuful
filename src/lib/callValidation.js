/**
 * A call is legal iff players can still finish the round without the
 * total tricks called equaling cardsPerRound.
 */
export function isCallLegal(call, cardsPerRound, players, userId) {
  if (call < 0 || call > cardsPerRound) return false

  const others = players.filter((p) => p.id !== userId && p.status !== 'spectator')
  const sumOthers = others
    .filter((p) => p.call !== null && p.call !== undefined)
    .reduce((s, p) => s + p.call, 0)
  const uncalled = others.filter((p) => p.call === null || p.call === undefined).length

  const minTotal = sumOthers + call
  const maxTotal = sumOthers + call + uncalled * cardsPerRound

  // Illegal only when the only possible final total equals cardsPerRound.
  const onlyPossibleTotal =
    minTotal <= cardsPerRound &&
    cardsPerRound <= maxTotal &&
    minTotal === maxTotal

  return !onlyPossibleTotal
}

export function getLegalCalls(cardsPerRound, players, userId) {
  const options = []
  for (let c = 0; c <= cardsPerRound; c += 1) {
    if (isCallLegal(c, cardsPerRound, players, userId)) options.push(c)
  }
  return options
}

export function getCommittedCallsSum(players) {
  return players
    .filter((p) => p.status !== 'spectator' && p.call !== null && p.call !== undefined)
    .reduce((s, p) => s + p.call, 0)
}

// Start from the player AFTER currentCallerId (clockwise). Without this, the
// function always returns turnOrder[0], making Ayush (first joiner) always the
// second caller regardless of who the dealer is.
export function getNextCaller(turnOrder, players, currentCallerId) {
  const n = turnOrder.length
  const startIdx = currentCallerId != null
    ? (turnOrder.indexOf(currentCallerId) + 1) % n
    : 0
  for (let step = 0; step < n; step++) {
    const id = turnOrder[(startIdx + step) % n]
    const player = players.find((p) => p.id === id)
    if (player && player.status !== 'spectator' && (player.call === null || player.call === undefined)) {
      return id
    }
  }
  return null
}
