import assert from 'node:assert/strict'
import { isCallLegal } from '../src/lib/callValidation.js'
import {
  calculateRoundPoints,
  evaluateTrickWinner,
  getCardsPerRound,
  getMaxRound,
  getSarForRound,
  resolveVote,
} from '../src/lib/gameLogic.js'

assert.equal(getMaxRound(7), 7)
assert.equal(getMaxRound(4), 8)

assert.equal(getCardsPerRound(1, 8), 1)
assert.equal(getCardsPerRound(8, 8), 8)
assert.equal(getCardsPerRound(9, 8), 7)
assert.equal(getCardsPerRound(15, 8), 1)
assert.equal(getCardsPerRound(16, 8), 1)

assert.equal(getSarForRound(1), 'Ka')
assert.equal(getSarForRound(2), 'Chu')
assert.equal(getSarForRound(5), 'Ka')

assert.equal(calculateRoundPoints(0, 0), 10)
assert.equal(calculateRoundPoints(1, 1), 20)
assert.equal(calculateRoundPoints(4, 4), 50)
assert.equal(calculateRoundPoints(3, 2), 0)
assert.equal(calculateRoundPoints(2, 3), 0)

const trick = [
  { userId: 'a', card: { suit: 'hearts', rank: '7', id: '7-hearts' } },
  { userId: 'b', card: { suit: 'hearts', rank: 'K', id: 'K-hearts' } },
  { userId: 'c', card: { suit: 'clubs', rank: 'A', id: 'A-clubs' } },
]
assert.equal(evaluateTrickWinner(trick, 'Ka').userId, 'c')

assert.equal(resolveVote({ a: 'next', b: 'end' }), 'next')
assert.equal(resolveVote({ a: 'end', b: 'end', c: 'next' }), 'end')

const twoPlayers = [
  { id: 'a', status: 'active', call: 1 },
  { id: 'b', status: 'active', call: null },
]
assert.equal(isCallLegal(0, 1, twoPlayers, 'b'), false)
assert.equal(isCallLegal(1, 1, twoPlayers, 'b'), true)

console.log('All game logic checks passed.')
