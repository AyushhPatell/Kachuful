import assert from 'node:assert/strict'
import { isCallLegal } from '../src/lib/callValidation.js'
import { buildDealSequence, cardsDealtToPlayer } from '../src/lib/dealSequence.js'
import {
  calculateRoundPoints,
  computePlayerTitles,
  evaluateTrickWinner,
  getCardsPerRound,
  getMaxRound,
  getSarForRound,
  resolveSarForRound,
  resolveVote,
  sortHandForDisplay,
} from '../src/lib/gameLogic.js'

assert.equal(getMaxRound(7), 7)
assert.equal(getMaxRound(4), 8)

// Cycle: 1,2,3,4,5,6,7,8,8,7,6,5,4,3,2,1,1,2,... (peak and trough each appear twice)
assert.equal(getCardsPerRound(1, 8), 1)   // going up
assert.equal(getCardsPerRound(8, 8), 8)   // peak (up)
assert.equal(getCardsPerRound(9, 8), 8)   // peak (down) — double peak
assert.equal(getCardsPerRound(10, 8), 7)  // going down
assert.equal(getCardsPerRound(16, 8), 1)  // trough (down)
assert.equal(getCardsPerRound(17, 8), 1)  // trough (up) — double trough, new cycle

assert.equal(getSarForRound(1), 'Ka')
assert.equal(getSarForRound(2), 'Chu')
assert.equal(getSarForRound(5), 'Ka')

assert.equal(calculateRoundPoints(0, 0), 10)
assert.equal(calculateRoundPoints(1, 1), 11)
assert.equal(calculateRoundPoints(4, 4), 40)
assert.equal(calculateRoundPoints(2, 2), 20)
assert.equal(getSarForRound(0), 'Ka')

// Ka = Kadi = spades; harshil plays 7♠ (trump) over ayush's Q♥ (non-trump)
const harshilTrumpWins = [
  { userId: 'ayush', card: { suit: 'hearts', rank: 'Q', id: 'Q-hearts' } },
  { userId: 'harshil', card: { suit: 'spades', rank: '7', id: '7-spades' } },
]
assert.equal(evaluateTrickWinner(harshilTrumpWins, 'Ka').userId, 'harshil')
assert.equal(calculateRoundPoints(3, 2), 0)
assert.equal(calculateRoundPoints(2, 3), 0)

// c plays A♠ (trump) — beats b's K♥ (led suit)
const trick = [
  { userId: 'a', card: { suit: 'hearts', rank: '7', id: '7-hearts' } },
  { userId: 'b', card: { suit: 'hearts', rank: 'K', id: 'K-hearts' } },
  { userId: 'c', card: { suit: 'spades', rank: 'A', id: 'A-spades' } },
]
assert.equal(evaluateTrickWinner(trick, 'Ka').userId, 'c')

// Low trump (2♠) still beats high non-trump (A♦) when Ka (Kadi/spades) is sar
const lowTrumpWins = [
  { userId: 'ayush', card: { suit: 'diamonds', rank: 'A', id: 'A-diamonds' } },
  { userId: 'brij', card: { suit: 'diamonds', rank: '5', id: '5-diamonds' } },
  { userId: 'amazoon', card: { suit: 'spades', rank: '2', id: '2-spades' } },
]
assert.equal(evaluateTrickWinner(lowTrumpWins, 'Ka').userId, 'amazoon')

// Highest trump wins among multiple sar (spades) cards: K♠ beats 10♠ and 7♠
const twoTrumps = [
  { userId: 'a', card: { suit: 'spades', rank: '10', id: '10-spades' } },
  { userId: 'b', card: { suit: 'spades', rank: '7', id: '7-spades' } },
  { userId: 'c', card: { suit: 'spades', rank: 'K', id: 'K-spades' } },
]
assert.equal(evaluateTrickWinner(twoTrumps, 'Ka').userId, 'c')

assert.equal(resolveSarForRound({ currentRound: 1 }, { sar: 'Ka' }), 'Ka')
assert.equal(resolveSarForRound({ currentRound: 1 }, null), 'Ka')

assert.equal(resolveVote({ a: 'next', b: 'end' }), 'next')
assert.equal(resolveVote({ a: 'end', b: 'end', c: 'next' }), 'end')

const twoPlayers = [
  { id: 'a', status: 'active', call: 1 },
  { id: 'b', status: 'active', call: null },
]
assert.equal(isCallLegal(0, 1, twoPlayers, 'b'), false)
assert.equal(isCallLegal(1, 1, twoPlayers, 'b'), true)

const freshRound = [
  { id: 'a', status: 'active', call: null },
  { id: 'b', status: 'active', call: null },
]
assert.equal(isCallLegal(0, 1, freshRound, 'a'), true)
assert.equal(isCallLegal(1, 1, freshRound, 'a'), true)

// Hand sort: grouped by suit (spades, hearts, clubs, diamonds), ascending rank
const messyHand = [
  { suit: 'clubs', rank: 'K', id: 'K-clubs' },
  { suit: 'spades', rank: '3', id: '3-spades' },
  { suit: 'hearts', rank: 'A', id: 'A-hearts' },
  { suit: 'spades', rank: '10', id: '10-spades' },
  { suit: 'diamonds', rank: '2', id: '2-diamonds' },
  { suit: 'clubs', rank: '5', id: '5-clubs' },
]
assert.deepEqual(
  sortHandForDisplay(messyHand).map((c) => c.id),
  ['3-spades', '10-spades', 'A-hearts', '5-clubs', 'K-clubs', '2-diamonds'],
)
assert.deepEqual(sortHandForDisplay([]), [])

// Player titles: alice nails every call (Sharpshooter), bob calls big (Daredevil)
const titlePlayers = [{ id: 'alice' }, { id: 'bob' }, { id: 'carol' }]
const titleRounds = [
  { roundNumber: 1, results: { alice: { call: 1, won: 1, points: 11 }, bob: { call: 3, won: 1, points: 0 }, carol: { call: 0, won: 0, points: 10 } } },
  { roundNumber: 2, results: { alice: { call: 2, won: 2, points: 20 }, bob: { call: 4, won: 2, points: 0 }, carol: { call: 0, won: 1, points: 0 } } },
  { roundNumber: 3, results: { alice: { call: 1, won: 1, points: 11 }, bob: { call: 5, won: 5, points: 50 }, carol: { call: 1, won: 0, points: 0 } } },
]
const computedTitles = computePlayerTitles(titlePlayers, titleRounds)
assert.equal(computedTitles.alice.label, 'Sharpshooter') // 3/3 made
assert.equal(computedTitles.bob.label, 'Daredevil')      // 12 tricks called
assert.equal(computePlayerTitles([], []).alice, undefined)

const dealOrder = buildDealSequence(['a', 'b', 'c'], 2, 1)
assert.deepEqual(dealOrder, ['b', 'c', 'a', 'b', 'c', 'a'])
assert.equal(cardsDealtToPlayer(dealOrder, 3, 'b'), 1)
assert.equal(cardsDealtToPlayer(dealOrder, 6, 'a'), 2)

console.log('All game logic checks passed.')
