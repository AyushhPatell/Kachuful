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

export function getNextCaller(turnOrder, players) {
  return turnOrder.find((id) => {
    const player = players.find((p) => p.id === id)
    return player && (player.call === null || player.call === undefined)
  })
}
