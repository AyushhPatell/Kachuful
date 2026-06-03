# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # ⚠️ wipes node_modules, reinstalls, then `vite build`
npm run preview      # serve the dist/ build
npm run lint         # ESLint over the repo
npm run test:logic   # pure-logic test suite (node assert, no Jest)
npm run deploy:rules # `firebase deploy --only firestore:rules` to project kachuful-70077
```

There is **no Jest/Vitest harness**. All automated tests live in `scripts/test-game-logic.mjs` and exercise only the pure modules under `src/lib/`. To add a test, append `assert.equal(...)` lines to that script — it runs in CI before deploy.

Running a single check: there's no test runner filter — edit/comment in the script and run `node scripts/test-game-logic.mjs` directly.

## Architecture

**Kachuful** is a multiplayer trick-taking card game. Players share a 6-char session code; everything else is real-time Firestore state.

### Two-layer game logic

The codebase splits game rules from persistence:

- `src/lib/` — pure functions (no Firebase imports). `cards.js` (deck/shuffle/deal), `gameLogic.js` (sar rotation, trick winner, scoring, turn order), `callValidation.js` (the "calls can't sum to cardsPerRound" rule), `sessionCode.js`. These are the only things `test:logic` covers.
- `src/firebase/sessions.js` — the **only** module that writes to Firestore. It orchestrates the game by calling into `src/lib/` and persisting results via `runTransaction`. Pages subscribe via `subscribeToSession` / `subscribeToPlayers` / `subscribeToRound` and never write directly.

When changing game rules, edit `src/lib/`, add a `test:logic` assertion, and only then wire the new behavior into `sessions.js`.

### Firestore data model

```
sessions/{code}                    # session doc — currentRound, currentSar, currentTurn, turnOrder, cardsOnTable, lastTrickReveal, ...
  players/{userId}                 # hand, call, tricksWon, sessionScore, status (active|disconnected|spectator), joinOrder
  rounds/{roundNumber}             # sar, status (dealing|calling|playing|complete), results
  joinRequests/{userId}            # pending joiners (subcollection — source of truth)
users/{userId}                     # profile, sessionHistory, personalBest
```

`firestore.rules` only checks `request.auth != null` — there are no per-field permissions. Trust comes from the transaction logic in `sessions.js`, not from rules.

### Join request dual-store (important quirk)

Join requests are written to **both** `sessions/{code}/joinRequests/{userId}` (subcollection, primary) **and** mirrored onto `sessions/{code}.joinRequestsByUser` + `joinRequests[]` (legacy fields on the session doc). The `useJoinRequests` hook + `mergeJoinRequestLists` reconcile both sources so older clients still see joiners. If you touch join flow, preserve both writes — and remember that rules for the subcollection must be **manually published** in Firebase Console (the GitHub Action's rules deploy is best-effort and may 403 silently). Symptom of un-published rules: owner only sees the first joiner.

### Trick reveal handshake

After the last card of a trick is played, `playCard` writes `lastTrickReveal = { cards, winnerId, sar, endsRound, at }` on the session doc and pauses the turn. **All clients** then run a `setTimeout(acknowledgeTrickReveal, 3500)` in `Game.jsx`. Whichever client lands the write first clears the field, advances `currentTurn` to the winner, and finalizes scores if it was the last trick. Don't bypass this — both server state and the visual reveal animation depend on the pause.

### Game rhythm

- `maxRound = 7` for 7 players, else `8`. Session runs `2*maxRound - 1` rounds total: cards-per-round goes 1→max→1.
- `sar` (trump) cycles `Ka, Chu, Fu, L` (clubs, diamonds, spades, hearts) round-by-round.
- Call legality: `isCallLegal` enforces that the last caller cannot pick a value that forces `sum(calls) === cardsPerRound`. The picker UI uses `getLegalCalls` to disable illegal buttons.
- Scoring: `call === tricksWon` → `call*10 + 10` (0 calls win 10). Miss → 0 and `roundsFailed++`. Tie-break on final leaderboard is fewer `roundsFailed`.

### React app shell

- `App.jsx` mounts `AuthProvider` (Google sign-in via `firebase/auth`) + `BrowserRouter`. Routes: `/` (MainMenu), `/lobby/:code`, `/game/:code`, `/history`, `/leaderboard/:code`. Unknown paths redirect to `/`.
- Tailwind v4 (`@tailwindcss/vite` plugin — no separate `tailwind.config.js`). Theme tokens like `bg-surface-raised`, `text-muted`, `text-accent` are defined inline in `src/index.css` / `src/App.css`.
- Framer Motion is used for card deal + trick reveal animations.
- React 19 with the new compiler-aware `eslint-plugin-react-hooks` flat config.

## Firebase config

`src/firebase/config.js` reads `VITE_FIREBASE_*` env vars but **falls back to hardcoded values** for the `kachuful-70077` project. This is intentional so CI builds work without injected secrets — Firebase Web config is not a secret. Don't add real secrets here.

The Realtime Database (`rtdb`) is initialized but currently unused; it's reserved for future low-latency card-play sync (see README "Phase 2").

## CI / deploy

`.github/workflows/deploy-firebase-hosting.yml` runs on push to `main`: install → `npm run test:logic` → `npm run build` → deploy hosting → (best-effort) deploy rules. The rules step is allowed to fail (`continue-on-error: true`) because the CI service account often lacks IAM permission; publish rules manually from the Firebase Console or via `npm run deploy:rules` from a logged-in laptop when `firestore.rules` changes.
