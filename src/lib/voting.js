/** Tally an in-progress end-session vote. Strict majority of active players required. */
export function getEndVoteTally(round, players) {
  const votes = round?.votes ?? {}
  const activePlayers = (players ?? []).filter((p) => p.status === 'active')
  const endCount = Object.values(votes).filter((v) => v === 'end').length
  const continueCount = Object.values(votes).filter((v) => v === 'continue').length
  const totalVoters = activePlayers.length
  const majority = Math.floor(totalVoters / 2) + 1

  return {
    endCount,
    continueCount,
    totalVoters,
    majority,
    passed: totalVoters > 0 && endCount >= majority,
  }
}
