/**
 * A call is legal iff no completion of remaining players' calls can make
 * total tricks called equal to cardsPerRound.
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

  return cardsPerRound < minTotal || cardsPerRound > maxTotal
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
