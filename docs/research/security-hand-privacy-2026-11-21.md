# Research / Security remediation: players can read opponents' cards

Date: 2026-11-21 · Severity: **Critical** (active exploit reported in a live game)

## Question

How do we stop players — and anyone else — from reading opponents' hands, given the
app is client-authoritative with fully permissive Firestore rules?

## Findings — how the cards leak (confirmed in code)

There are **two independent leak vectors**. Both are real; both must be closed.

### 1. IAM / project access (the most direct, bypasses ALL rules)
- `Vaibhavpatel162002@gmail.com` has the **Editor** role on the Firebase project
  (Project settings → Users and permissions).
- An Editor (or Owner) can open the **Firestore data viewer in the Firebase console**
  and read every document live — including every `players/{uid}.hand`. The Admin SDK
  and console **bypass Security Rules entirely** (Firebase docs confirm this). No code
  change can stop a project Editor.
- There are also 2 GitHub collaborators (`krishp520`, `zzivaibhav`) and 16 service
  accounts on the project. The repo is **public**.

### 2. Permissive rules + secret state in a readable doc (any player can exploit)
- Each player's cards are stored at `sessions/{code}/players/{uid}.hand`
  (`createSession`, `beginRound` deal at `src/firebase/sessions.js`), and the rules
  (`firestore.rules:11`) allow **any authenticated user to read any player document**.
- The client (`subscribeToPlayers`) loads **all** player docs — including every
  opponent's `hand` — into the browser. The UI only *shows* your own hand, but all
  hands sit in memory and in Firestore, readable via devtools or a 3-line script.
- The host's auto-play even reads opponents' hands directly (`Game.jsx:447`), and the
  host deals the cards, so **whoever is host inherently knows every hand**.
- Because the repo is public and the web Firebase config ships in the bundle, *anyone
  on the internet* who signs in can read/write all game data, not just invited players.

## References

- [21 Duel — Security Architecture](https://21-duel.gitbook.io/21-duel-docs/security-architecture) — server withholds the opponent's hidden-card data from your device until the round is over. The model to copy.
- [Firebase — security rules get-started / admin access](https://firebase.google.com/docs/firestore/security/get-started.md.txt) — server/admin client libraries **bypass** Security Rules (why Vaibhav's Editor role is the #1 issue).
- [Senko (yuchenshi)](https://github.com/yuchenshi/senko) — Firestore game whose moves are validated by Security Rules, with rules tests.
- [Flutter — Firestore multiplayer cookbook](https://docs.flutter.dev/cookbook/games/firestore-multiplayer) — turn-based games fit Firestore; use callable functions for authoritative logic.

## Patterns to adopt

- Keep each hand in an **owner-only** path, separate from public player state.
- Make **dealing and auto-play server-authoritative** (a Cloud Function using the Admin
  SDK) so no client ever holds another player's hand.
- Rules **deny client writes to secret state**; a player only reads their own hand.
- **Least-privilege IAM**: only the owner on the Firebase project; remove unused
  collaborators/service accounts.

## Patterns to avoid

- Field-level read protection — Firestore read rules are per-document, so the hand MUST
  move to its own doc.
- Giving the host read access to all hands to keep client-side auto-play — that just
  lets the host cheat.
- Treating the public web API key as the problem — it is meant to be public; the problem
  is the rules behind it.

## Proposed fix (phased)

**Phase 0 — now, no code (you do this):**
1. Firebase → Users and permissions → remove `Vaibhavpatel162002@gmail.com` (and anyone
   else who shouldn't have DB access).
2. Review the 16 service accounts and the GitHub collaborators; remove what isn't needed.
3. Check the deployed rules in the console (an Editor could have changed them) and skim
   Cloud Audit Logs for unexpected reads/writes.
4. Consider making the GitHub repo **private**.

**Phase 1 — hand privacy (code, needs approval):**
- Move `hand` out of the player doc into `sessions/{code}/hands/{uid}` (public player doc
  keeps `handCount` and the rest).
- A Cloud Function deals each round (shuffles, writes each hand to its private doc) and
  auto-plays for disconnected players. Clients never generate or read others' hands.
- Client subscribes to its **own** hand only; plays via a callable function.
- Rules: `hands/{uid}` readable only by `uid`; no client writes to hands.

**Phase 2 — full least-privilege (code):**
- Validate every move server-side; tighten `sessions`/`players`/`rounds`/`userHistory`
  rules from "any authed user" to participant-scoped, least-privilege.

## Open questions for you

1. OK to make **dealing + auto-play server-side** (new Cloud Functions)? This is required
   for a real fix and slightly changes internal game flow (not the player experience).
2. Do it on a branch + test with the Firebase emulator before deploying? (Recommended.)
3. Make the GitHub repo private?
4. Should I also remove the collaborators' access, or will you handle all IAM yourself?

## Implementation scope (after approval)

- `functions/index.js` — new `dealRound`, `playCard`, `autoPlay` (Admin SDK).
- `src/firebase/sessions.js` — client reads own hand; play via callable.
- `src/pages/Game.jsx` — own-hand subscription; remove client auto-play.
- `firestore.rules` — hands owner-only; deny client writes to secret state.
- Firebase emulator tests.

Out of scope for this pass: broader rules least-privilege (Phase 2), spectator changes.
