# Research: Full game experience rebuild

**Date:** 2026-06-02  
**Status:** Approved by user — implement now.

## Question

How do live card games (Hearts, Spades, CardzMania, Hardwood, A-Star) deliver a **real table feel**, and what should Kachuful adopt while keeping existing server rules?

## References (patterns that work)

| Product | What to steal |
|---------|----------------|
| **A-Star Spades/Hearts** | Clean board, high-contrast cards, turn glow on seat not page banner, ranked stats separate from play |
| **Hardwood series** | Felt + rail table, cards move/flip physically, calm center play zone |
| **CardzMania** | One page = one table, no route swaps mid-hand, session code always reachable |
| **shmemcat/hearts** | Framer Motion deal/trick on same canvas, mobile hand fan, reduced motion fallback |
| **Teen Patti / trick-taking kits** | Zones: center=trick, edge=players, bottom=hand; 44px touch targets; call on bottom sheet |

## Adopt for Kachuful

1. **Full-viewport table** — game fills screen; no dashboard columns.
2. **Seat-first feedback** — turn = seat ring + subtle center hint (not top toast).
3. **Hand fan** — overlapping cards, sorted by suit/rank after deal.
4. **Trick area** — fixed center; cards fly in/out with transforms (no shared `layoutId` across tricks).
5. **One client finalizes tricks** — host acks `lastTrickReveal` (fixes race bugs).
6. **Spectators promoted** next round in `beginRound`.
7. **Session menu** — code, settings stub, leave (already started).
8. **Calling during deal** — deal is cosmetic; call UI available as soon as round is CALLING.

## Avoid

- Dual sidebars + table + hand as separate pages
- `layoutId` tied to card rank-suit (reused every round)
- Every client calling `acknowledgeTrickReveal`
- Blocking 3s pauses mid-round

## Implementation scope

- Rebuild: `Game.jsx`, `GameTable.jsx`, hand/seat/card components, `useTablePhase.js`
- Fix: `sessions.js` (host ack, spectator promote)
- Keep: `gameLogic.js`, `callValidation.js`, `cards.js`, tests
