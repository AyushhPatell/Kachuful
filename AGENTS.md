# Kachuful — Agent instructions

## Default mode: research-first

For features, UI, or game-flow changes:

1. Use skill **`research-first`** (`.cursor/skills/research-first/SKILL.md`).
2. Write brief to `docs/research/<topic>-YYYY-MM-DD.md`.
3. **Stop and ask for approval** before implementing.

## Project context

- **Game**: Kachuful — Gujarati trick-taking card game (online multiplayer).
- **Rules doc**: `docs/GAME_RULES_IMPLEMENTED.md` (user may correct this).
- **Logic tests**: `npm run test:logic` (`scripts/test-game-logic.mjs`).
- **Stack**: React + Vite + Firebase + Tailwind.

## UX principles (non-negotiable unless user overrides)

- One table, one flow — avoid full-page screen changes mid-game.
- Round points at seats; **session totals only at final leaderboard**.
- Trick winner shown on table briefly; no blocking modal between tricks.
- Mobile-first; keep interactions simple.

## When to implement immediately

- User says "implement now", "skip research", or "just fix the bug".
- Clear one-line bug with obvious fix (typo, wrong constant, broken import).

## Commands

```bash
npm run dev          # local dev
npm run test:logic   # game rules unit checks
npm run build        # production build
```
