# Cursor Automation draft: Research before UI changes

Create this in **Cursor → Automations → New automation** (Agents Window required).

## Suggested settings

| Field | Value |
|-------|--------|
| **Name** | Kachuful — research before UI |
| **Description** | When a PR touches game UI, produce a research brief instead of rushing implementation. |
| **Trigger** | GitHub — Pull request opened (repo: your Kachuful repo) |
| **Tools** | Comment on PR |
| **Model** | Default cloud agent |

## Instructions (paste into automation prompt)

```
You are reviewing a pull request for the Kachuful card game.

If the PR changes files under src/pages/Game.jsx, src/components/game/, or game UX flow:

1. Read AGENTS.md and .cursor/skills/research-first/SKILL.md in the repo.
2. Do NOT approve large UI rewrites without a research brief in docs/research/.
3. Post a PR comment with:
   - What UX pattern the PR uses
   - Risks (screen swaps, scoring display, animation jank)
   - Whether a research brief exists; if not, request one before merge
4. If changes are small bug fixes only, say so and keep comment short.

Keep the comment under 15 lines. Be constructive.
```

## Optional: scheduled research reminder

| Field | Value |
|-------|--------|
| **Trigger** | Cron — `0 9 * * 1` (Mondays 9:00) |
| **Tools** | Open or update PRs (if you use it for planning) |
| **Prompt** | "Review open Kachuful issues labeled `ui` or `game-flow`. Draft a one-page research brief outline for the top item in docs/research/. Do not implement code." |

## How to create

1. Open **Cursor** → **Automations** (from Agents Window / dashboard).
2. **New automation** → paste trigger, tools, and prompt above.
3. Connect GitHub if using PR trigger.
4. Save and enable.

This file is a draft only — automations are configured in the Cursor UI, not from git.
