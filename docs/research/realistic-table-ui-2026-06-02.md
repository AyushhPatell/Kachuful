# Research: Realistic table UI — seats, felt, and physical card feel

**Date:** 2026-06-02  
**Status:** Approved and implemented (2026-06-02).

## Question

How should Kachuful’s game view look and behave so it feels like **sitting at a real card table** — proper player seats, visible card distribution, opponent hands, and polished motion — matching what players expect from established online card games?

This brief builds on the **approved flow** in [`table-ux-2026-06-02.md`](./table-ux-2026-06-02.md) (one continuous table, trick/round animations). It focuses on **visual structure, seat design, and physical realism**, not game rules or server changes.

---

## Current state (gap analysis)

| Area | Today | Why it breaks immersion |
|------|--------|-------------------------|
| **Layout** | Table in left column; hand in a separate block below; sidebar as second column | Feels like a dashboard, not one surface. Real apps merge “you + table + opponents” into one canvas. |
| **Seats** | Small name pills at fixed `%` positions | No avatars, no card stacks, no “person sitting here” — reads as labels, not players. |
| **Opponents** | Text only (“2 won”) | No face-down cards; you can’t see who has how many cards or where cards go when dealt. |
| **Your hand** | Horizontal scroll below the table | Detached from the seat; play doesn’t visually originate from “your chair.” |
| **Table surface** | Flat green gradient rectangle | Missing oval felt, wood rail, center play zone, depth/shadow. |
| **Deal** | One card flies center → offset; hand fills separately | Deal and hand aren’t one motion; hard to track who received what. |
| **Play** | Card appears in center instantly | No arc from hand to trick pile. |
| **Page chrome** | `PageLayout` title + max-width + sidebar list duplicating seats | Wastes vertical space on mobile; redundant “This round” list. |
| **Seat math** | Hard-coded slots per player count | Doesn’t scale smoothly; 5–7 player positions feel cramped or uneven. |

**What already works (keep):** one-table phase machine, trick fly-to-winner, round-end seat badges, host next round, leave confirm, reduced-motion fallback, deal one-by-one timing (~420ms/card).

---

## References

| Product / project | What they do well |
|-------------------|-------------------|
| [Hardwood Spades](https://www.hardwoodgames.com/spades/) | 3D-ish table, cards **move and flip like physical cards**; tablet/touch-first; deck + environment as one scene. |
| [Hearts (shmemcat)](https://github.com/shmemcat/hearts) | Single responsive **game table**; deal/trick animations on same canvas; mobile-optimized hand; theming (deck styles). |
| [Hearts (awang9999)](https://github.com/awang9999/hearts-game) | **Active-player glow**, leading-card highlight, opponent areas with **hidden card fans**; score kept separate from play area. |
| [Bisca Multiplayer](https://github.com/n-alex-goncalves/BiscaMultiplayer) | Framer Motion: cards **spring toward trick winner**; same table throughout. |
| [Spades Card](https://spades-card.com/) | **Clarity-first** layout: readable suits, flexible card size, minimal clutter; rejoin without leaving view. |
| Teen Patti / poker UI patterns | Fixed **zones**: center = play, edges = players, bottom = your actions; **44px+ touch targets**; overlays non-blocking. |
| [PokerGO portrait table spec](https://lackabane.com/poker-go-vertical-mobile-poker-table-ui-ux) | Pixel-perfect **ellipse seating** for 2–9 players; every component positioned relative to table, not page grid. |
| [react-ttrpg-cards](https://github.com/strangeworlder/react-ttrpg-cards) | Cards fly to **DOM target rects** (seat zones); staggered deal patterns; flip after land. |

---

## Patterns to adopt

### 1. One canvas — table owns the whole play surface

- **Game view = table + HUD**, not a 12-column dashboard.
- Your hand is the **bottom edge of the table**, not a sibling section below it.
- Sidebar stats → **compact HUD** (Sar, round, turn toast) or collapsible panel; remove duplicate player list during play.

### 2. Elliptical seat geometry (polar layout)

- Place N seats on an **ellipse** `(cx, cy, rx, ry)` with angle `θᵢ = startAngle + i × (360°/N)`.
- **You always at bottom** (rotate order so local player = 270° / 6 o’clock).
- Each seat is a **pod**: avatar, name, tricks won, call (when relevant), **card stack**.
- Scale `rx/ry` by player count so 7 players don’t overlap.

### 3. Opponent card stacks (face-down)

- Show **mini card backs** at each seat — count = cards in hand (or `cardsPerRound - tricks context` during play).
- Slight fan/offset (2–5 visible backs max, “+3” badge if more) — standard trick-taking convention.
- When opponent plays: one back **flies to center** (or shrinks away) in sync with center trick card appearing.
- When dealing: flying card lands **on that seat’s stack**, not only in your hand below.

### 4. Your hand — fan, not a list

- **Arc fan** at bottom center (overlap + slight rotation), largest touch targets on outer cards.
- Selected/playable cards: lift + accent ring (already partially there).
- On mobile: fan stays in lower 30% of viewport; horizontal scroll fallback only if >8 cards.

### 5. Table art direction — “felt + rail”

- **Outer rail:** dark wood gradient, rounded super-ellipse.
- **Inner felt:** green (classic) or deep teal aligned with current palette; subtle noise texture; vignette.
- **Center play zone:** faint circle or diamond marking where tricks land.
- **Deck pile:** always center-left or center when dealing; 3-card stack with shadow.

### 6. Motion vocabulary (consistent physics)

| Event | Motion | Duration (guide) |
|-------|--------|------------------|
| Deal | Deck → seat stack, face-down | 450ms fly + 80ms stagger (current ~420ms OK) |
| Play | Seat/hand → center trick | 350–450ms arc |
| Trick win | All trick cards → winner stack | 650ms (approved) |
| Round end | Trick → deck pile → seat badges | 700ms collect |
| Flip (deal done) | Your cards face-up together | 300ms stagger 40ms |

Use **`layoutId`** per card where possible so deal → hand → play is one continuous object.

### 7. Turn & state feedback on seats (not banners)

- Active seat: soft pulse ring + “Your turn” only on your pod.
- Leading suit / trump: small icon near center, not a page-level pill.
- Trick winner: gold ring on seat pod (already started) + brief name toast at table edge.

### 8. Responsive modes

| Breakpoint | Layout |
|------------|--------|
| **Mobile portrait** | Full-width table (~60vh); hand fan bottom; call picker as **bottom sheet**; no permanent sidebar |
| **Tablet / desktop** | Table max ~720px wide; optional right HUD (Sar, calls, leave); join requests as dismissible banner |

### 9. Accessibility & performance

- `prefers-reduced-motion`: instant placement, badges only.
- Card contrast WCAG AA on felt.
- Touch targets ≥ 44×44px on playable cards.
- Animate `transform` / `opacity` only — no layout thrashing.

---

## Patterns to avoid

| Anti-pattern | Why |
|--------------|-----|
| Separate “Your Hand” section outside table | Breaks “you are seated at the table” illusion. |
| Full 3D / Three.js for v1 | High cost; 2D + good motion beats bad 3D. |
| Showing opponent card faces | Cheating; breaks game trust. |
| Literal 10-card spread for opponents | Clutter; use stack + count. |
| Reintroducing full-page round summary | Already rejected in flow brief. |
| Session totals at seats | User wants round pts only until leaderboard. |
| Auto-hiding entire UI during animations | Table chrome stays; only dim non-essential HUD. |

---

## Proposed experience (step-by-step)

### Enter game
1. Dark room background; **oval table** fills most of the screen.
2. Seats appear around the rim with avatar + name; empty seats hidden.
3. Sar chip floats on felt near top of table (not page header).

### Deal
1. Deck stack visible at center.
2. Cards deal **clockwise from dealer** — each card visible flying to the receiving seat’s stack.
3. Opponent stacks grow one card at a time; your fan at bottom grows face-down.
4. When deal completes, **your cards flip** face-up; calling UI slides up (bottom sheet on mobile).

### Call & play
1. Active caller’s seat pulses; others dim slightly.
2. You tap call in bottom sheet / compact panel — never leaves table view.
3. On play: card lifts from your fan, arcs to center; opponent backs shrink as their card lands in trick.
4. Trump cards: subtle green edge on card (keep current logic).

### Trick end
1. Four cards in center; winner seat highlights; cards fly to winner’s stack (approved).
2. Winner’s stack gains a **trick pile** indicator (small offset stack or +1 won).

### Round end
1. Last trick → collect to deck → seat badges (Call · Won · +pts).
2. Footer on felt: Next round / Leave (with confirm).

---

## Visual reference (layout sketch)

```
        [P3 stack]
   [P4]               [P2]
        ┌─────────┐
        │  trick  │  ← deck
        │  area   │
        └─────────┘
   [P5]               [P6]

      ╭─ your fan ─╮
      │  🂠 🂠 🂠 🂠  │
      ╰──────────────╯
         (you / P1)
```

---

## Open questions for user

1. **Immersive mode** — Hide `PageLayout` title during game (table-only fullscreen feel) or keep “Round N · X cards” header?
2. **Table style** — Classic **green felt + wood rail**, or **dark modern** (current emerald on charcoal, closer to app brand)?
3. **Avatars** — Colored **initials circles** (fast) vs optional **Google photo** from auth?
4. **Opponent hands** — **Stack + count badge** (recommended) vs showing up to 3 literal card backs always?
5. **Sidebar** — Replace with **bottom sheet + minimal HUD** on mobile, or keep collapsible sidebar on all sizes?
6. **Play animation** — Card **flies from your fan** when you tap (recommended), or instant appear in center (current)?
7. **Sound** — Light deal/play/win sounds in this pass, or defer?
8. **Scope** — Approve **Phase 1–2** first (table + seats + integrated hand), then motion polish, or one larger pass?

---

## Implementation scope (after approval)

### Phase 1 — Table shell & seats (foundation)
- New `TableSurface` component: oval felt, rail, center play zone.
- `SeatPod` component: avatar, name, tricks, stack placeholder.
- Polar seat layout util (`seatLayout.js`) for 2–7 players.
- Integrate **your hand into table bottom** (remove separate hand section).
- Immersive game layout: widen game view beyond `PageLayout` max-width constraint.
- **Files:** `GameTable.jsx`, new `SeatPod.jsx`, `TableSurface.jsx`, `seatLayout.js`, `Game.jsx`, `PageLayout.jsx` or game-specific layout wrapper.

### Phase 2 — Opponent stacks & deal landing
- Face-down mini stacks at each seat; count from `hand.length` (server already sends your hand only — use `cardsPerRound` minus played for opponents, or add public `handCount` on player doc if needed).
- Deal animation targets **seat stack positions** (getBoundingClientRect or computed polar coords).
- Flip animation when deal completes.

### Phase 3 — Play & trick motion polish
- `layoutId` on played cards: fan → center → winner stack.
- Opponent play: stack −1 synced with center card appear.
- Tune easing/spring to match deal timing.

### Phase 4 — Mobile HUD & chrome reduction
- Bottom sheet for CallPicker; floating Sar + turn chip on table.
- Remove duplicate “This round” list during play (info on seats).
- Safe-area padding for notched phones.

### Phase 5 (later, out of scope unless requested)
- Sound (Howler), deck themes, confetti on big round wins, Google avatars, PWA landscape lock.

### Out of scope
- Game rules / scoring changes.
- Firebase schema changes unless `handCount` proves necessary (prefer derived counts first).
- 3D table.
- Final leaderboard redesign.

---

## Success criteria

- [ ] User sees **one table surface**; hand feels attached to their seat.
- [ ] Every opponent has a **visible card stack** that updates on deal/play.
- [ ] Deal reads clearly: deck → seat, clockwise, ~0.4s per card.
- [ ] Play reads as **card leaving hand → center**, not teleport.
- [ ] Mobile portrait: no horizontal scroll for core UI; table + fan fit in one screen.
- [ ] No new full-page routes or layout swaps mid-round (flow brief still holds).
- [ ] Reduced-motion path remains usable.

---

## Recommended direction (summary)

Prioritize **2D table realism** over 3D: elliptical felt, polar seat pods with face-down stacks, and your hand as a fan embedded in the table bottom. Reuse the approved phase machine and timings; upgrade **where cards live on screen** and **how they move between zones** using Framer `layoutId` and seat-targeted deal/play arcs. Slim down page chrome and the duplicate sidebar so the table dominates — especially on mobile.

**Suggested first ship:** Phase 1 + Phase 2 (visual structure + deal landing on seats). Phase 3 play arcs immediately after if time allows.
