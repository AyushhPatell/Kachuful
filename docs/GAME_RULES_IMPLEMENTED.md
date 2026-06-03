# Kachuful — rules currently implemented (review draft)

One line per rule. Please correct anything that does not match how you play.

## Session & players

- 6-character session code; host creates, others join with code.
- Host accepts/rejects join requests (up to 7 players in room).
- Minimum **2 active players** to start; max **7** at the table.
- Host can start the game when enough accepted players are in the lobby.
- Late joiners can be accepted as **spectators** until the next round (spec).
- Sar rotation and mountain round cycle use **active (non-spectator)** players only.

## Sar (trump) rotation

- Sar order every round: **Ka → Chu → Fu → L → Ka → …** (not tied to mountain count alone).
- Round 1 = **Ka (Kadi, ♣ clubs)**; round 2 = Chu (Charkat, ♦); round 3 = Fu (Fallai, ♠); round 4 = L (Laal, ♥).
- Current Sar is shown on the game screen during the round.
- Sar for trick winning is taken from session + round document (round index never treated as 0).

## Cards & dealing

- Standard 52-card deck; suits: clubs, diamonds, spades, hearts.
- Cards per player follow the **mountain**: 1, 2, … max, … 2, 1 (max = 8, or 7 if exactly 7 players).
- Dealer rotates each round; deal order starts at dealer, clockwise.
- Each player’s hand is stored on the server; you play from server-validated cards only.

## Calling tricks (before play)

- After deal, **calling phase**: players declare how many tricks they will win this round.
- Calls are **sequential** (one player at a time, not all at once).
- First caller for round 1 is random; order rotates clockwise each new round.
- **Trick-call constraint:** sum of all calls must **not equal** the number of cards dealt this round (e.g. 1-card round: total calls cannot be 1).
- Illegal call buttons are disabled; server rejects illegal calls.

## Playing tricks

- After all calls, **play phase** begins; leader is the dealer for that round.
- Turn order follows `turnOrder` (active players); one card per turn.
- **Follow suit:** if you have the led suit, you must play it; if not, you may play any card (including Sar/trump).
- First card of a trick sets the **led suit**.
- A trick ends when each player still in the trick has played one card.

## Winning a trick (Sar logic)

- If **no** Sar-suit card is played: highest rank of the **led suit** wins.
- If **any** Sar-suit card is played: only Sar-suit cards compete; **highest Sar card** wins (trump beats all non-trump).
- Rank order: 2 low → A high (standard).
- Trick winner leads the next trick (if any cards remain).
- Winner’s `tricksWon` increases by 1 after each trick (after a short trick-reveal pause).

## Scoring (exact call only)

- Points only if tricks won **exactly match** the call; otherwise **0** for that round.
- Called **0**, won **0** → **10** points.
- Called **N** (≥1), won **N** → **N × 10**, plus **+1** when N = 1 (so **11** for 1/1; **40** for 4/4).
- Called N but won fewer or **more** than N → **0** points (no reward for “overtricking”).
- Failed rounds increment `roundsFailed` (used for tie-break).
- Session total = sum of round points.

## Round end & UI

- After the last trick: **round-end screen** (green table) shows last trick cards, trick winner, and compact per-player points (+N this round · session total).
- Screen stays until host taps **Next round** or anyone taps **Leave session**.
- Mid-round tricks: short ~3s trick reveal only, then play continues.
- **Next round**: host-only button starts the next round (mountain cycle); ends session after final round of cycle.
- Voting / end session vote: **not yet implemented** (host advance only for now).

## Not yet implemented (spec / planned)

- Vote next round vs end session (majority).
- Advance to next round automatically after vote.
- 60s disconnect timer, skip, owner transfer, reconnect flows.
- Session history screen and personal stats.
- Final leaderboard page with full tie-break UI.
- Owner-only rules beyond accept/reject and start (some spec items partial).

## Tie-breaking (logic exists, limited UI)

- Higher `sessionScore` ranks higher.
- Tie → fewer `roundsFailed` wins.
- Still tied → shared rank (leaderboard UI basic).
