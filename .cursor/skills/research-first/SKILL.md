---
name: research-first
description: >-
  Researches UX patterns, competitor apps, and game rules before implementing
  features. Produces a short spec for user approval. Use when the user asks for
  research-first work, UI/UX changes, game flow, new features, or says
  "research before coding", "research agent", or "don't implement yet".
---

# Research-first workflow

Use this skill when the user wants **research before implementation** — especially UI, game flow, multiplayer UX, or ambiguous features.

## Hard rules

1. **Do not write production code** until the user approves the research brief (unless they explicitly say "skip approval" or "implement now").
2. **Use web search** and read existing project docs (`docs/GAME_RULES_IMPLEMENTED.md`, spec files) before proposing changes.
3. **Compare 2–3 real products** (apps, open-source games, or documented patterns) — not generic advice.
4. **End with a brief the user can approve or edit** — then wait.

## Workflow

```
1. Clarify scope (1–2 questions max if unclear)
2. Research (web + codebase)
3. Write brief → docs/research/<topic>-YYYY-MM-DD.md
4. Present summary in chat + ask for approval
5. Only after approval → implement in small, reviewable steps
```

## Research brief template

Save to `docs/research/<topic>-YYYY-MM-DD.md`:

```markdown
# Research: [topic]

## Question
What we are trying to decide.

## References
- [Product/pattern] — what they do well (1 line each)

## Patterns to adopt
- Bullet list of concrete UX/tech choices

## Patterns to avoid
- What failed in our project or common anti-patterns

## Proposed flow (for user)
Step-by-step user experience in plain language.

## Open questions for user
- Numbered list — user must answer before build

## Implementation scope (after approval)
- Files/areas likely touched
- Out of scope for this pass
```

## Kachuful-specific checks

When researching **game/table UX**:

- Single continuous table (no full-page screen swaps mid-round)
- Trick resolution: inline on table, brief pause, no modal takeover
- Round end: stats at player seats; session totals only at session end
- Deal/play animations on same canvas
- Read `docs/GAME_RULES_IMPLEMENTED.md` for scoring/Sar rules

When researching **multiplayer/lobby**:

- Join request visibility for host
- Spectator vs active player flows

## Chat output format

After writing the file, summarize in chat:

1. **Findings** (3–5 bullets)
2. **Recommendation** (one paragraph)
3. **Link** to the research file path
4. **Ask**: "Approve this direction, or tell me what to change before I implement."

## Subagent option

For broad research, launch an `explore` or `generalPurpose` subagent with:

> Research only. Return findings + recommended UX flow. Do not modify files.

Then merge into the brief yourself.
