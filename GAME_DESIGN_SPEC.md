# Kachuful — Game Design & UI/UX Specification
### A Complete Overhaul Blueprint for Cursor

> **Scope:** Everything except game logic (game logic is working correctly). This document covers visual design, animations, sound, table layout, card design, player UX, screen flow, and micro-interactions — every detail needed to make Kachuful feel like a real, polished card game.

---

## Table of Contents
1. [Philosophy & References](#philosophy)
2. [Tech Stack Additions](#tech-stack)
3. [Global Design Language](#design-language)
4. [The Game Table](#game-table)
5. [Playing Cards](#playing-cards)
6. [The Player's Hand (HandFan)](#hand-fan)
7. [Seat Pods (Opponent Players)](#seat-pods)
8. [Turn Indicator System](#turn-indicator)
9. [Card Animations](#card-animations)
10. [Sound Design](#sound-design)
11. [The Call Picker](#call-picker)
12. [Round Score Screen](#round-score)
13. [Trick Win Moment](#trick-win)
14. [Dealer Token](#dealer-token)
15. [Main Menu Screen](#main-menu)
16. [Lobby Screen](#lobby)
17. [Final Leaderboard Screen](#leaderboard)
18. [Page Transitions](#page-transitions)
19. [Mobile Optimization](#mobile)
20. [Implementation Priority Order](#priority)

---

## 1. Philosophy & References {#philosophy}

The single goal: **make players forget they are using a web app and feel like they are sitting around a real card table.**

Study these games before implementing anything:
- **Hearthstone** — Every interaction has a sound and visual response. The board IS the UI. The "wooden box" feel is built into everything.
- **Call Break Plus (Android/iOS)** — Closest to Kachuful. Study: dealer chip, trick counter per player, card glow on trump, "calling" phase UI with raised number buttons.
- **VIP Spades (vipspades.com)** — Excellent table layout, clean player pods, smooth card trajectory animations.
- **cardgames.io/spades** — Simple but excellent "card lands on table" feel.

### Core Principles
1. **Every action must have feedback** — sound + visual, no exceptions.
2. **The table is sacred** — the green felt surface is the main character of the game. It should look like a real table.
3. **Cards must feel physical** — they have weight, shadow, and travel through space.
4. **Information hierarchy** — show what matters most, hide what doesn't. Whose turn it is > tricks won > score.
5. **Never block the table** — overlays and sheets should be minimal, used sparingly, never covering the center play area during active gameplay.

---

## 2. Tech Stack Additions {#tech-stack}

Add these packages. Do not remove anything existing.

```bash
npm install howler        # Sound engine — lightweight, works on mobile
npm install canvas-confetti  # Particle effects for wins/trick wins
```

No other dependencies needed. Framer Motion (already installed) handles all animations.

---

## 3. Global Design Language {#design-language}

### Color Palette — Update `src/index.css`

```css
@theme {
  /* Surface colors — darker and richer */
  --color-surface: #0d0f0c;
  --color-surface-raised: #181c17;
  --color-border: #2a2e28;
  --color-muted: #6b7468;
  --color-text: #f0f2ee;

  /* Accent — warm gold, not red */
  --color-accent: #c9963a;
  --color-accent-hover: #e0aa45;
  --color-accent-glow: rgba(201, 150, 58, 0.4);

  /* Game-specific */
  --color-trump: #22c55e;       /* green for trump card highlight */
  --color-trump-glow: rgba(34, 197, 94, 0.45);
  --color-turn: #f59e0b;        /* amber for active turn */
  --color-turn-glow: rgba(245, 158, 11, 0.5);
  --color-win: #fbbf24;         /* trick win gold */

  /* Table felt */
  --color-felt-light: #1f7a4a;
  --color-felt-mid: #166339;
  --color-felt-dark: #0f4d2c;
  --color-felt-edge: #0a3a22;

  /* Card */
  --color-card-bg: #ffffff;
  --color-card-border: rgba(0,0,0,0.18);
  --color-hearts: #dc2626;
  --color-diamonds: #dc2626;
  --color-clubs: #1a1a1a;
  --color-spades: #1a1a1a;
}

body {
  background-color: #080a07;
  /* warm vignette suggesting a lit room */
  background-image:
    radial-gradient(ellipse 90% 60% at 50% -10%, rgba(201,150,58,0.07), transparent),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(255,255,255,0.02), transparent);
}
```

### Typography
- Add Google Font import at top of index.css: `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');`
- Body font: `Inter` (already used)
- Title/display font: `Cinzel` — use ONLY for game title, round numbers, major score displays. This gives a premium card-game feel.
- Add to @theme: `--font-display: 'Cinzel', Georgia, serif;`

---

## 4. The Game Table {#game-table}

### `src/components/game/TableSurface.jsx` — Complete Rewrite

The table needs to feel like a real green baize card table with a wooden frame.

```jsx
export default function TableSurface({ children, className = '' }) {
  return (
    <div
      className={`relative flex h-full min-h-0 flex-col overflow-hidden ${className}`}
      style={{
        /* Wood border — outer ring */
        background: `
          radial-gradient(ellipse 80% 60% at 50% -5%, rgba(255,220,140,0.12), transparent 50%),
          linear-gradient(160deg, #5c3a18 0%, #3d2410 30%, #2a1a0c 60%, #4a2e14 100%)
        `,
        borderRadius: '2rem',
        padding: '10px',
        boxShadow: `
          0 32px 100px rgba(0,0,0,0.85),
          0 0 0 1px rgba(255,200,120,0.2),
          inset 0 2px 0 rgba(255,220,150,0.25),
          inset 0 -3px 10px rgba(0,0,0,0.5)
        `,
      }}
    >
      {/* Wood grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          borderRadius: '2rem',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='wood'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.025' numOctaves='8' seed='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23wood)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Felt surface inner */}
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          borderRadius: '1.5rem',
          background: `
            radial-gradient(ellipse 65% 50% at 50% 38%, rgba(255,255,255,0.07) 0%, transparent 55%),
            radial-gradient(ellipse 100% 85% at 50% 50%,
              #207d4e 0%,
              #186640 28%,
              #105030 55%,
              #0c3d24 80%,
              #091f14 100%
            )
          `,
          boxShadow: `
            inset 0 12px 50px rgba(0,0,0,0.45),
            inset 0 -8px 25px rgba(0,0,0,0.3),
            inset 4px 0 20px rgba(0,0,0,0.2),
            inset -4px 0 20px rgba(0,0,0,0.2)
          `,
        }}
      >
        {/* Felt noise texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Radial vignette at edges */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.45)_100%)]" />

        {/* Subtle overhead light bloom at top */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-30"
          style={{
            background: 'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(255,255,200,0.15), transparent)',
          }}
        />

        {/* Center play zone — decorative diamond */}
        <div
          className="pointer-events-none absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2"
          style={{ width: 140, height: 140 }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute inset-6 rotate-45 rounded-lg"
            style={{
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(0,0,0,0.08)',
            }}
          />
        </div>

        {children}
      </div>
    </div>
  )
}
```

---

## 5. Playing Cards {#playing-cards}

### `src/components/game/PlayingCard.jsx` — Major Redesign

Cards are the most important visual element. They need to look like REAL playing cards.

#### Card Back Design
The card back should look premium — deep navy with a diamond pattern border.

```jsx
function CardBack({ className, small, hand }) {
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        borderRadius: '0.5rem',
        background: '#1a2744',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {/* Inner border frame */}
      <div
        className="absolute inset-[3px] rounded"
        style={{
          border: '1px solid rgba(200,170,100,0.35)',
        }}
      />
      {/* Diamond trellis pattern */}
      <div
        className="absolute inset-[4px] rounded opacity-70"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Cpath d='M5 0L10 5L5 10L0 5Z' fill='none' stroke='rgba(200,170,100,0.3)' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '10px 10px',
        }}
      />
      {/* Center emblem */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize: small ? '1rem' : '1.4rem', color: 'rgba(200,170,100,0.7)' }}>♠</span>
      </div>
    </div>
  )
}
```

#### Card Face Design
Real cards have: rank in top-left + bottom-right, large suit in center, proper suit color.
For face cards (J/Q/K), add initials in a styled center box.

```jsx
// Card size system — standardized
const CARD_SIZES = {
  // small: used on table center (played cards)
  small: {
    container: 'h-[4.5rem] w-[3.1rem] sm:h-[5rem] sm:w-[3.4rem]',
    rank: 'text-[11px] sm:text-[12px]',
    suit: 'text-[18px] sm:text-[20px]',
    padding: 'p-1',
  },
  // hand: used in player's hand at bottom
  hand: {
    container: 'h-[7rem] w-[4.6rem] sm:h-[7.75rem] sm:w-[5.1rem]',
    rank: 'text-[13px] sm:text-[14px]',
    suit: 'text-[26px] sm:text-[28px]',
    padding: 'p-1.5',
  },
  // compact: used for opponent card count stacks
  compact: {
    container: 'h-[4.5rem] w-[2.8rem] sm:h-[5rem] sm:w-[3rem]',
    rank: 'text-[10px]',
    suit: 'text-[14px]',
    padding: 'p-0.5',
  },
}

// Face card center decoration
function FaceCardCenter({ rank, suit, suitSymbol, suitColor }) {
  const label = { J: 'Jck', Q: 'Qn', K: 'Kg', A: 'Ace' }[rank] ?? rank
  return (
    <div className="flex flex-col items-center justify-center gap-0.5">
      <span className={`text-[18px] leading-none ${suitColor}`}>{suitSymbol}</span>
      <span className={`text-[8px] font-bold uppercase tracking-wider ${suitColor} opacity-60`}>{label}</span>
    </div>
  )
}

export default function PlayingCard({
  card,
  faceDown = false,
  small = false,
  compact = false,
  hand = false,
  onClick,
  selected,
  isTrump = false,
  dealDelay = 0,
  layoutId,
  className = '',
}) {
  const sizeKey = compact ? 'compact' : hand ? 'hand' : small ? 'small' : 'hand'
  const sizes = CARD_SIZES[sizeKey]

  const suitSymbol = { clubs: '♣', diamonds: '♦', spades: '♠', hearts: '♥' }
  const suitColor = (card?.suit === 'hearts' || card?.suit === 'diamonds')
    ? 'text-red-600'
    : 'text-neutral-900'

  const isFaceCard = ['J', 'Q', 'K'].includes(card?.rank)

  if (faceDown || !card) {
    return (
      <div className={`relative ${sizes.container} ${className}`}>
        <CardBack className="absolute inset-0" small={small} hand={hand} />
      </div>
    )
  }

  const Wrapper = onClick ? motion.button : motion.div

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      layoutId={layoutId}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: dealDelay, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      whileHover={onClick ? { y: -14, scale: 1.04, transition: { duration: 0.15 } } : undefined}
      whileTap={onClick ? { scale: 0.97, y: -6 } : undefined}
      onClick={onClick}
      className={`
        relative ${sizes.container} select-none
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{
        borderRadius: '0.5rem',
        background: 'linear-gradient(160deg, #ffffff 0%, #f8f8f8 50%, #f2f2f2 100%)',
        border: '1px solid rgba(0,0,0,0.15)',
        boxShadow: selected
          ? '0 0 0 2.5px #f59e0b, 0 0 18px rgba(245,158,11,0.5), 0 8px 24px rgba(0,0,0,0.5)'
          : isTrump
          ? '0 0 0 1.5px rgba(34,197,94,0.8), 0 0 12px rgba(34,197,94,0.4), 0 6px 20px rgba(0,0,0,0.45)'
          : '0 4px 16px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}
    >
      {/* Trump glow indicator */}
      {isTrump && (
        <div
          className="pointer-events-none absolute inset-0 rounded-lg opacity-20"
          style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.4), transparent)' }}
        />
      )}

      <div className={`flex h-full flex-col ${sizes.padding}`}>
        {/* Top-left: rank + suit */}
        <div className={`flex flex-col items-start leading-none ${suitColor}`}>
          <span className={`${sizes.rank} font-bold leading-[1]`}>{card.rank}</span>
          <span className={`${sizes.rank} leading-[1]`}>{suitSymbol[card.suit]}</span>
        </div>

        {/* Center */}
        <div className="flex flex-1 items-center justify-center">
          {isFaceCard ? (
            <FaceCardCenter
              rank={card.rank}
              suit={card.suit}
              suitSymbol={suitSymbol[card.suit]}
              suitColor={suitColor}
            />
          ) : (
            <span className={`${sizes.suit} leading-none ${suitColor}`}>
              {suitSymbol[card.suit]}
            </span>
          )}
        </div>

        {/* Bottom-right: rank + suit (rotated 180°) */}
        <div className={`flex flex-col items-end leading-none rotate-180 ${suitColor}`}>
          <span className={`${sizes.rank} font-bold leading-[1]`}>{card.rank}</span>
          <span className={`${sizes.rank} leading-[1]`}>{suitSymbol[card.suit]}</span>
        </div>
      </div>
    </Wrapper>
  )
}
```

---

## 6. The Player's Hand (HandFan) {#hand-fan}

### `src/components/game/HandFan.jsx` — Major Upgrade

The hand is where the player spends 80% of their focus. It needs to feel alive.

Key changes:
- Cards fan with proper arc (origin at bottom-center)
- Playable cards lift up automatically on your turn (already done, but increase the lift)
- Hover on a card: it lifts + slightly scales neighbors down to "separate" it
- On mobile: tap once to "select" (lift up), tap again to "play" — prevents accidental plays
- Card count badge in corner showing e.g. "7 cards"

```jsx
// Increased parameters for more dramatic fan
const stepDeg = count === 1 ? 0 : count === 2 ? 10 : count <= 4 ? 8 : count <= 6 ? 6 : 4.5
const stepPx = count === 1 ? 0 : count === 2 ? 30 : count <= 4 ? 34 : count <= 6 ? 28 : 22

// Each card's motion.div should use:
style={{
  zIndex: index,
  transformOrigin: 'bottom center',
  transform: `translateX(${tx}px) rotate(${rotate}deg)`,
}}

// PlayingCard gets isTrump prop:
<PlayingCard
  card={faceDown ? null : card}
  faceDown={faceDown || !showFace}
  onClick={canPlay ? () => onPlayCard(card) : undefined}
  selected={canPlay && isMyTurn}   // highlight playable cards on your turn
  isTrump={isTrumpCard(card, sar)} // pass trump status
  hand
/>

// Add a "your turn" indicator bar above hand:
{isMyTurn && !faceDown && tablePhase === 'playing' && (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
  >
    <span className="rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300">
      ✦ Your Turn
    </span>
  </motion.div>
)}
```

**Two-tap play on mobile (important UX):**
```jsx
// In HandFan, add selectedCard state
const [selectedCardId, setSelectedCardId] = useState(null)

function handleCardClick(card) {
  if (!canPlay) return
  if (isMobile) {
    if (selectedCardId === card.id) {
      // Second tap = play
      setSelectedCardId(null)
      onPlayCard(card)
    } else {
      // First tap = select/preview
      setSelectedCardId(card.id)
      playSound('cardSelect')
    }
  } else {
    onPlayCard(card) // Desktop: single click
  }
}

// Detect mobile: const isMobile = 'ontouchstart' in window
```

---

## 7. Seat Pods (Opponent Players) {#seat-pods}

### `src/components/game/SeatPod.jsx` — Redesign

Current state: floating pill with avatar and name. Problem: all seats look identical, hard to tell whose turn it is at a glance.

New design:
- Clear visual hierarchy: avatar is the focal point
- Active turn: bright amber ring + pulsing outer glow (not just scale)
- Trick count: prominent chip counter badge below avatar
- Call display: small badge showing "Call: 3" during playing phase
- Dealer badge: gold "D" chip icon on the dealer's seat

```jsx
export default function SeatPod({
  player,
  isTurn,
  isTrickWinner,
  showRoundScores,
  roundPts,
  handCount,
  receivingDeal,
  tablePhase,
  callingPhase,
  isDealer = false,
  compact = false,
}) {
  return (
    <div className="flex flex-col items-center gap-1" style={{ width: compact ? 80 : 96 }}>

      {/* Main pod */}
      <motion.div
        className="relative flex flex-col items-center rounded-xl px-2 pt-2 pb-1.5"
        animate={{
          scale: isTurn && !showRoundScores ? [1, 1.02, 1] : 1,
        }}
        transition={{ duration: 1.5, repeat: isTurn && !showRoundScores ? Infinity : 0, ease: 'easeInOut' }}
        style={{
          background: isTrickWinner
            ? 'rgba(251,191,36,0.2)'
            : isTurn && !showRoundScores
            ? 'rgba(245,158,11,0.15)'
            : receivingDeal
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
          border: isTrickWinner
            ? '1.5px solid rgba(251,191,36,0.7)'
            : isTurn && !showRoundScores
            ? '1.5px solid rgba(245,158,11,0.6)'
            : '1px solid rgba(255,255,255,0.1)',
          boxShadow: isTurn && !showRoundScores
            ? '0 0 20px rgba(245,158,11,0.35), 0 4px 16px rgba(0,0,0,0.4)'
            : isTrickWinner
            ? '0 0 16px rgba(251,191,36,0.4), 0 4px 16px rgba(0,0,0,0.4)'
            : '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        {/* Dealer chip */}
        {isDealer && (
          <div
            className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #d97706)',
              border: '1.5px solid rgba(255,255,255,0.4)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              color: '#1a1000',
            }}
          >
            D
          </div>
        )}

        {/* Avatar */}
        <PlayerAvatar
          name={player.name}
          photoURL={player.photoURL}
          size={compact ? 'sm' : 'md'}
          glow={isTurn && !showRoundScores}
        />

        {/* Name */}
        <p className="mt-1 max-w-[80px] truncate text-center text-[10px] font-semibold text-emerald-50 leading-tight">
          {player.name}
        </p>

        {/* Status line */}
        {showRoundScores ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-1 text-center leading-tight"
          >
            <p className="text-[9px] text-emerald-200/70">
              {player.call ?? 0} called · {player.tricksWon ?? 0} won
            </p>
            <p className={`text-[11px] font-bold ${roundPts > 0 ? 'text-amber-300' : 'text-zinc-500'}`}>
              {roundPts > 0 ? `+${roundPts}` : '0'} pts
            </p>
          </motion.div>
        ) : (
          <div className="mt-0.5 flex items-center gap-1">
            {/* Tricks won chips */}
            {player.tricksWon > 0 && (
              <span className="rounded-full bg-amber-500/25 px-1.5 py-0 text-[9px] font-semibold text-amber-200">
                {player.tricksWon}✓
              </span>
            )}
            {/* Call badge */}
            {player.call != null && (
              <span className="rounded-full bg-white/10 px-1.5 py-0 text-[9px] text-zinc-300">
                /{player.call}
              </span>
            )}
          </div>
        )}

        {/* "Calling..." label */}
        {callingPhase && isTurn && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="mt-1 text-[9px] font-medium uppercase tracking-wider text-amber-300"
          >
            calling…
          </motion.span>
        )}
      </motion.div>

      {/* Card count */}
      {!showRoundScores && handCount > 0 && (
        <CardStackBadge count={handCount} receiving={receivingDeal} />
      )}
    </div>
  )
}
```

### `PlayerAvatar` with glow prop:
```jsx
// In PlayerAvatar.jsx, add glow support
<div
  className={`rounded-full overflow-hidden ${sizeClass}`}
  style={glow ? {
    boxShadow: '0 0 0 2px rgba(245,158,11,0.9), 0 0 12px rgba(245,158,11,0.5)',
  } : {
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  }}
>
```

---

## 8. Turn Indicator System {#turn-indicator}

### Turn Timer (new feature)

Each turn should have a countdown timer — makes the game feel real and pressured.

```jsx
// New component: src/components/game/TurnTimer.jsx
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const TURN_SECONDS = 30 // configurable

export default function TurnTimer({ isActive, onTimeout, key: resetKey }) {
  const [remaining, setRemaining] = useState(TURN_SECONDS)

  useEffect(() => {
    setRemaining(TURN_SECONDS)
    if (!isActive) return
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onTimeout?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isActive, resetKey])

  if (!isActive) return null

  const progress = remaining / TURN_SECONDS
  const isUrgent = remaining <= 10

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex items-center gap-2"
    >
      {/* Circular progress */}
      <svg width="28" height="28" className={isUrgent ? 'text-red-400' : 'text-amber-400'}>
        <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5"/>
        <circle
          cx="14" cy="14" r="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 11}`}
          strokeDashoffset={`${2 * Math.PI * 11 * (1 - progress)}`}
          transform="rotate(-90 14 14)"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
        <text x="14" y="18" textAnchor="middle" className="fill-current" style={{ fontSize: 9, fontWeight: 700 }}>
          {remaining}
        </text>
      </svg>
    </motion.div>
  )
}
```

Place `TurnTimer` in the HUD (top of GameTable) next to round number when it's the local player's turn.

---

## 9. Card Animations {#card-animations}

### The Dealing Animation — `GameTable.jsx`

The deal animation is the first thing players see each round. It should feel like someone physically dealing cards.

**Current problem:** Cards just appear. There's a `DeckStack` in center and `dealTargetPlayerId` but the animation is basic.

**Fix:** Make each card visually fly from the deck to each player's position with a satisfying arc.

```jsx
// Deal animation improvements in GameTable:

// 1. Dealing phase: show a "shuffling" animation before dealing starts
// Add a shuffle phase before cards go out: the DeckStack should do a
// riffling animation for ~1 second before the first card is dealt.

// 2. Deal speed: DEAL_CARD_MS = 280 (faster than current 420)
const DEAL_CARD_MS = 280

// 3. Card flip during deal: cards fly face-down, then flip face-up
// when fully received. In HandFan, after deal completes,
// each card should animate from rotateY(180) to rotateY(0) with a stagger.
// Already handled by faceUpAfterDeal prop, but add:
animate={{
  rotateY: faceUpAfterDeal ? 0 : 180,
  opacity: 1,
  y: 0,
  scale: 1,
}}
// This requires style={{ perspective: '1000px' }} on the container.
```

### Card Play Animation — the "Thunk"

When a card is played it should travel to the center and land with weight.

```jsx
// flyPlay animation in GameTable:
// Current: basic translate, works but needs refinement.
// Change the animate target:
animate={{
  x: 0,
  y: -15,     // land slightly above center
  opacity: 1,
  scale: 1,
  rotate: 0,  // normalize rotation on landing
}}
transition={{
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1],  // spring-like custom bezier
}}
// On landing (after animation), trigger 'cardPlay' sound.

// Each card on table should have a SLIGHT random rotation
// to make it look like it was tossed, not placed perfectly:
const tableCardRotation = useMemo(() =>
  ((seatIndex * 37 + cardHash) % 14) - 7  // -7 to +7 degrees
, [seatIndex])
```

### Trump Card Special Effect

When a trump card is played, it should be unmistakable.

```jsx
// After a trump card lands on the table:
// 1. A brief green pulse ring expands from the card
// 2. The card gets a green glow border
// 3. Play 'trumpPlayed' sound (more dramatic)

// Add to each played card on table:
{trump && (
  <motion.div
    initial={{ scale: 0.8, opacity: 0.8 }}
    animate={{ scale: 2.5, opacity: 0 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
    className="pointer-events-none absolute inset-0 rounded-lg"
    style={{ border: '2px solid rgba(34,197,94,0.8)' }}
  />
)}
```

---

## 10. Sound Design {#sound-design}

### `src/lib/sounds.js` — New File

This is the single most impactful change. Zero → sound transforms the game feel instantly.

```js
import { Howl } from 'howler'

// All sounds are generated programmatically using Web Audio API
// OR loaded from free CC0 sources
// Use freesound.org or zapsplat.com for free card game sounds

const SOUNDS = {
  // Card dealt to player
  cardDeal: new Howl({
    src: ['/sounds/card-deal.mp3'],
    volume: 0.5,
  }),
  // Card played to table
  cardPlay: new Howl({
    src: ['/sounds/card-play.mp3'],
    volume: 0.65,
  }),
  // Card selected (hover/tap)
  cardSelect: new Howl({
    src: ['/sounds/card-select.mp3'],
    volume: 0.3,
  }),
  // Trump card played
  trumpPlay: new Howl({
    src: ['/sounds/trump-play.mp3'],
    volume: 0.7,
  }),
  // Trick won (collecting chips sound)
  trickWin: new Howl({
    src: ['/sounds/trick-win.mp3'],
    volume: 0.6,
  }),
  // Your turn notification
  yourTurn: new Howl({
    src: ['/sounds/your-turn.mp3'],
    volume: 0.55,
  }),
  // Round end / score reveal
  roundEnd: new Howl({
    src: ['/sounds/round-end.mp3'],
    volume: 0.7,
  }),
  // Shuffle (during deal start)
  shuffle: new Howl({
    src: ['/sounds/shuffle.mp3'],
    volume: 0.5,
  }),
  // Positive (made your call)
  success: new Howl({
    src: ['/sounds/success.mp3'],
    volume: 0.6,
  }),
  // Negative (missed your call)
  fail: new Howl({
    src: ['/sounds/fail.mp3'],
    volume: 0.5,
  }),
}

let muted = false

export function setMuted(val) { muted = val }
export function isMuted() { return muted }

export function playSound(name) {
  if (muted) return
  SOUNDS[name]?.play()
}
```

### Sound File Sources (free, CC0)
Get these from **freesound.org** or **zapsplat.com**:
- `card-deal.mp3` — search "card deal soft" — a soft papery swish
- `card-play.mp3` — search "card place table" — a small thud/tap
- `card-select.mp3` — search "card hover" — very subtle click/tick
- `trump-play.mp3` — search "whoosh impact" — more dramatic than regular play
- `trick-win.mp3` — search "chip collect" or "coins collect" — chips sliding
- `your-turn.mp3` — search "soft chime bell" — gentle notification
- `round-end.mp3` — search "fanfare short" — brief victory sting
- `shuffle.mp3` — search "card shuffle" — riffle sound
- `success.mp3` — search "positive chime" — upward ding
- `fail.mp3` — search "negative buzz" — low thud

### Place sounds in `/public/sounds/`

### Where to trigger sounds:
```
dealStep advances        → playSound('cardDeal')
card placed on table     → isTrump ? playSound('trumpPlay') : playSound('cardPlay')
trickReveal arrives      → playSound('trickWin')
round status → CALLING   → playSound('shuffle')
isMyTurn becomes true    → playSound('yourTurn')
tablePhase → round-scores → playSound('roundEnd')
call submitted           → playSound('cardSelect')
```

### Mute Button
Add a mute toggle in GameMenu (top right). Persist to localStorage.
```jsx
// In GameMenu.jsx, add:
const [muted, setMuted] = useState(() => localStorage.getItem('kachuful-muted') === 'true')
function toggleMute() {
  const next = !muted
  setMuted(next)
  setMutedGlobal(next)  // from sounds.js
  localStorage.setItem('kachuful-muted', next)
}
// Icon: 🔊 / 🔇 button
```

---

## 11. The Call Picker {#call-picker}

### `src/components/game/CallPicker.jsx` — Redesign

The call picker is used at the start of every round. It's a critical moment — the player has to think and decide. It needs to feel weighty.

**Current:** A bottom sheet with a list of number buttons. Functional but plain.

**New design:**
- Stays as a bottom sheet on mobile
- Large tactile number buttons (like a phone keypad, but circular)
- Show each valid call option clearly: 0, 1, 2, 3, 4, 5...
- Show total calls already made by others (so player can strategize)
- Selected number: large animated highlight
- Current player's card count shown as context: "You have 7 cards"
- Confirm button becomes active only when a number is selected

```jsx
export default function CallPicker({ cardsPerRound, players, userId, onSubmit, busy }) {
  const [selected, setSelected] = useState(null)

  // Max valid call is cardsPerRound
  const options = Array.from({ length: cardsPerRound + 1 }, (_, i) => i)

  // Show others' calls
  const otherCalls = players
    .filter(p => p.id !== userId && p.call != null)
    .map(p => ({ name: p.name, call: p.call }))

  const totalCalled = otherCalls.reduce((sum, p) => sum + p.call, 0)

  return (
    <div className="px-4 pb-4 pt-2">
      {/* Header */}
      <div className="mb-3 text-center">
        <p className="text-base font-semibold text-emerald-50" style={{ fontFamily: 'Cinzel, serif' }}>
          How many tricks will you win?
        </p>
        <p className="mt-0.5 text-xs text-zinc-400">
          You have {cardsPerRound} card{cardsPerRound !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Others' calls summary */}
      {otherCalls.length > 0 && (
        <div className="mb-3 flex flex-wrap justify-center gap-2">
          {otherCalls.map(({ name, call }) => (
            <span key={name} className="rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-zinc-300">
              {name}: <span className="font-semibold text-amber-300">{call}</span>
            </span>
          ))}
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-zinc-500">
            Total called: {totalCalled}
          </span>
        </div>
      )}

      {/* Number buttons — circular grid */}
      <div className="flex flex-wrap justify-center gap-2.5 mb-4">
        {options.map(num => (
          <motion.button
            key={num}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              setSelected(num)
              playSound('cardSelect')
            }}
            className="relative flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold transition-all"
            style={{
              background: selected === num
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'rgba(255,255,255,0.08)',
              border: selected === num
                ? '2px solid rgba(251,191,36,0.8)'
                : '1.5px solid rgba(255,255,255,0.12)',
              boxShadow: selected === num
                ? '0 0 16px rgba(245,158,11,0.5), 0 4px 12px rgba(0,0,0,0.4)'
                : '0 2px 8px rgba(0,0,0,0.3)',
              color: selected === num ? '#1a0e00' : '#e0e0e0',
            }}
          >
            {num}
            {/* Show if this makes total = cardsPerRound (banned in some variants) */}
          </motion.button>
        ))}
      </div>

      {/* Confirm button */}
      <motion.button
        disabled={selected === null || busy}
        onClick={() => selected !== null && onSubmit(selected)}
        whileTap={{ scale: 0.97 }}
        className="w-full rounded-xl py-3.5 text-base font-semibold transition-all disabled:opacity-40"
        style={{
          background: selected !== null
            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
            : 'rgba(255,255,255,0.1)',
          color: selected !== null ? '#1a0e00' : '#888',
        }}
      >
        {selected !== null ? `Call ${selected}` : 'Select a number'}
      </motion.button>
    </div>
  )
}
```

---

## 12. Round Score Screen {#round-score}

### Replace the minimal inline score with a full overlay moment

This is the payoff moment after every round. Make it feel rewarding.

```jsx
// New component: src/components/game/RoundScoreOverlay.jsx

import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useEffect } from 'react'

export default function RoundScoreOverlay({
  show,
  players,       // all players with call, tricksWon, roundPoints
  currentUserId,
  roundNumber,
  isOwner,
  onNextRound,
  busy,
}) {
  const me = players.find(p => p.id === currentUserId)
  const myPoints = me ? calculateRoundPoints(me.call, me.tricksWon) : 0
  const madCall = me && me.tricksWon >= me.call

  useEffect(() => {
    if (show && madCall && myPoints > 0) {
      // Confetti burst when you make your call
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#fbbf24', '#f59e0b', '#10b981', '#ffffff'],
      })
    }
  }, [show])

  // Sort players by round points descending
  const sorted = [...players].sort((a, b) => {
    const pa = calculateRoundPoints(a.call, a.tricksWon)
    const pb = calculateRoundPoints(b.call, b.tricksWon)
    return pb - pa
  })

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        >
          <motion.div
            initial={{ scale: 0.88, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-sm overflow-hidden rounded-2xl"
            style={{
              background: 'linear-gradient(160deg, #1a1e18, #111410)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(201,150,58,0.15), rgba(201,150,58,0.05))',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p className="text-xs uppercase tracking-widest text-amber-400/70">Round {roundNumber} Results</p>
              <p
                className="mt-1 text-2xl font-bold text-amber-300"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {madCall ? '✓ Call Made!' : 'Round Over'}
              </p>
            </div>

            {/* Score rows */}
            <div className="divide-y divide-white/5 px-4 py-2">
              {sorted.map((player, i) => {
                const pts = calculateRoundPoints(player.call, player.tricksWon)
                const made = player.tricksWon >= player.call
                const isMe = player.id === currentUserId

                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`flex items-center gap-3 py-3 ${isMe ? 'rounded-lg px-2' : ''}`}
                    style={isMe ? { background: 'rgba(255,255,255,0.05)' } : {}}
                  >
                    {/* Rank */}
                    <span className="w-4 text-center text-xs text-zinc-500">{i + 1}</span>

                    {/* Name */}
                    <span className={`flex-1 text-sm font-medium ${isMe ? 'text-amber-200' : 'text-zinc-200'}`}>
                      {player.name} {isMe && '(you)'}
                    </span>

                    {/* Call result */}
                    <span className={`text-xs ${made ? 'text-emerald-400' : 'text-red-400'}`}>
                      {player.tricksWon}/{player.call}
                    </span>

                    {/* Points */}
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.08 + 0.3, type: 'spring' }}
                      className={`w-14 text-right text-sm font-bold ${pts > 0 ? 'text-amber-300' : 'text-zinc-500'}`}
                    >
                      {pts > 0 ? `+${pts}` : '0'}
                    </motion.span>
                  </motion.div>
                )
              })}
            </div>

            {/* Action */}
            <div className="p-4 pt-2">
              {isOwner ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={busy}
                  onClick={onNextRound}
                  className="w-full rounded-xl py-3.5 text-sm font-semibold text-amber-950 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)' }}
                >
                  Next Round →
                </motion.button>
              ) : (
                <p className="rounded-xl bg-white/5 py-3 text-center text-xs text-zinc-400">
                  Waiting for host…
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**In `Game.jsx`:** Replace the inline round-scores rendering in `GameTable` with this overlay rendered directly in the Game component, on top of everything.

---

## 13. Trick Win Moment {#trick-win}

### Make the trick win feel satisfying

**Current:** Cards fly toward winner, a small text label says "X wins". Passable but not exciting.

**New:**
1. Winner's name label pulses with a big flash
2. A quick particle burst at the winner's seat position (not full confetti, just 8-10 sparks)
3. Cards "collected" sound plays
4. Winner's trick count badge does a quick scale-up animation

```jsx
// In GameTable, when isTrickPhase && trickReveal.winnerName:

// Big winner announcement instead of tiny text:
{isTrickPhase && trickReveal?.winnerName && (
  <motion.div
    initial={{ opacity: 0, scale: 0.7, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    className="absolute left-1/2 top-[44%] z-20 -translate-x-1/2 -translate-y-1/2 mt-20 pointer-events-none"
  >
    <div
      className="rounded-full px-5 py-2 text-sm font-bold text-amber-200 text-center whitespace-nowrap"
      style={{
        background: 'rgba(0,0,0,0.7)',
        border: '1px solid rgba(251,191,36,0.4)',
        boxShadow: '0 0 20px rgba(251,191,36,0.2)',
        backdropFilter: 'blur(6px)',
        fontFamily: 'Cinzel, serif',
      }}
    >
      🏆 {trickReveal.winnerName}
    </div>
  </motion.div>
)}
```

---

## 14. Dealer Token {#dealer-token}

Track which player is the dealer each round and show a "D" chip on their seat.

```jsx
// In Game.jsx: compute dealerPlayerId
const dealerPlayerId = useMemo(() => {
  if (!round || !session?.turnOrder) return null
  const idx = round.dealerIndex ?? 0
  return session.turnOrder[idx] ?? null
}, [round, session?.turnOrder])

// Pass dealerPlayerId down to GameTable → SeatPod
// In SeatPod: isDealer = player.id === dealerPlayerId
```

---

## 15. Main Menu Screen {#main-menu}

### `src/pages/MainMenu.jsx` — Visual Overhaul

First impression matters. The main menu should feel like a real card game, not a generic web form.

```jsx
// Design changes:
// 1. Large Kachuful logo at top — use Cinzel font, with card suit icons
// 2. Background: animated subtle card shapes floating (CSS keyframe)
// 3. Sign-in section: more welcoming
// 4. Session code input: bigger, styled like a casino chip counter

// Logo component:
function KachufulLogo() {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="text-2xl text-red-500">♥</span>
        <span className="text-2xl text-zinc-300">♠</span>
      </div>
      <h1
        className="text-5xl font-bold tracking-wide"
        style={{
          fontFamily: 'Cinzel, serif',
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: 'none',
          filter: 'drop-shadow(0 2px 8px rgba(245,158,11,0.4))',
        }}
      >
        Kachuful
      </h1>
      <p className="mt-1 text-xs uppercase tracking-[0.3em] text-zinc-500">The Calling Card Game</p>
    </div>
  )
}

// Floating card background (CSS animation):
// Add to index.css:
// @keyframes floatCard {
//   0%, 100% { transform: translateY(0px) rotate(var(--r)); opacity: 0.04; }
//   50% { transform: translateY(-20px) rotate(calc(var(--r) + 5deg)); opacity: 0.07; }
// }

// Create 4-5 large suit symbols (♠♥♦♣) as absolutely positioned divs
// with animation-delay staggered, very low opacity (0.04-0.08)
// They gently float behind the content.

// Session code input: style as prominent centered input
// with a larger font, gold border on focus, monospace font
```

---

## 16. Lobby Screen {#lobby}

### `src/pages/Lobby.jsx` — Polish Pass

```jsx
// Key changes:
// 1. Show a card table preview (miniature) in the lobby with seat icons
// 2. Player list shows avatars prominently, not just names
// 3. "Waiting for players" has a pulsing animation
// 4. Session code: displayed BIG and styled, easy to share
//    Add a one-click COPY button next to the code
// 5. "Start Game" button: appears only when minPlayers met,
//    with a satisfying entrance animation
// 6. Game settings summary: "Up to 7 players · Ka-Chu-Fu-L rounds"

// Session code copy button:
function SessionCodeDisplay({ code }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-5 py-3">
      <span className="font-mono text-3xl font-bold tracking-[0.3em] text-amber-300">{code}</span>
      <button onClick={handleCopy} className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  )
}
```

---

## 17. Final Leaderboard Screen {#leaderboard}

### `src/pages/FinalLeaderboard.jsx` — Redesign as a ceremony

This is the END of the whole game. It needs to feel like a genuine win/loss moment.

```jsx
// Design:
// 1. Full-screen overlay with dark background + confetti for the winner
// 2. Podium-style top 3 (1st, 2nd, 3rd on raised platforms)
// 3. Full rankings below for all other players
// 4. Animated score reveal: numbers count up from 0
// 5. "Play Again" and "Back to Menu" CTAs
// 6. Winner gets a crown emoji + gold highlight

// On mount, fire confetti for the winner:
useEffect(() => {
  confetti({
    particleCount: 150,
    spread: 90,
    origin: { y: 0.5 },
    colors: ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'],
  })
  playSound('roundEnd')
}, [])
```

---

## 18. Page Transitions {#page-transitions}

### `src/App.jsx` or router setup — Add view transitions

Wrap all `<Routes>` with a shared layout that provides smooth transitions.

```jsx
// Wrap each page component with:
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ duration: 0.22, ease: 'easeOut' }}
>
  {/* page content */}
</motion.div>

// And wrap Routes with <AnimatePresence mode="wait">
```

---

## 19. Mobile Optimization {#mobile}

The game is primarily played on mobile. These are non-negotiable:

### Touch targets
- All buttons minimum 44×44px
- Cards in hand: minimum 46px wide
- CallPicker buttons: minimum 48×48px circular

### Safe areas
- All bottom content: `padding-bottom: env(safe-area-inset-bottom)` — already partially done, verify all screens
- All top content: `padding-top: env(safe-area-inset-top)`

### Prevent accidental plays (already mentioned in HandFan section)
Two-tap on mobile: first tap selects, second tap plays.

### Scroll lock during game
In Game.jsx: `document.body.style.overflow = 'hidden'` on mount, restore on unmount.

### Portrait orientation
The game is designed portrait-first. On landscape mobile, show a "rotate your device" notice.

```jsx
// In App.jsx:
function RotateNotice() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black lg:hidden landscape:flex portrait:hidden">
      <span className="text-4xl mb-3">📱</span>
      <p className="text-white text-sm">Please rotate to portrait mode</p>
    </div>
  )
}
// Only show during active game, not menu/lobby
```

---

## 20. Implementation Priority Order {#priority}

Do these in this exact order for maximum impact per effort:

### Phase 1 — Foundation (do this first, biggest impact)
1. **Sound system** (`src/lib/sounds.js` + download sounds + trigger on every action) — transforms the game feel immediately
2. **Color palette update** (`src/index.css`) — sets the visual foundation
3. **Playing card redesign** (`PlayingCard.jsx`) — most-looked-at element
4. **TableSurface redesign** (`TableSurface.jsx`) — the environment

### Phase 2 — Interaction Quality
5. **HandFan upgrades** — two-tap mobile, better fan, turn indicator label
6. **SeatPod redesign** — dealer chip, better turn glow, trick counter
7. **Turn timer** (`TurnTimer.jsx`) — adds tension and real-game feel
8. **Trump card effects** — glow + pulse ring

### Phase 3 — Moments
9. **Round Score Overlay** (`RoundScoreOverlay.jsx`) — big payoff moment
10. **Trick win enhancements** — winner announcement, particles
11. **CallPicker redesign** — better UX for the key decision

### Phase 4 — Polish
12. **Main menu redesign** — logo, floating cards background
13. **Lobby polish** — code display, seat preview
14. **Final leaderboard redesign** — confetti, podium
15. **Page transitions** — smooth navigation feel
16. **Dealer token** — authenticity detail
17. **Cinzel font** for key displays

---

## Quick Reference: Files to Change

| File | Change Type |
|------|-------------|
| `src/index.css` | Update colors, add Cinzel font import |
| `src/components/game/TableSurface.jsx` | Full rewrite |
| `src/components/game/PlayingCard.jsx` | Major rewrite — new card design |
| `src/components/game/HandFan.jsx` | Upgrades — two-tap, fan, trump |
| `src/components/game/SeatPod.jsx` | Redesign — dealer chip, turn glow |
| `src/components/game/PlayerAvatar.jsx` | Add glow prop |
| `src/components/game/CallPicker.jsx` | Redesign — circular buttons |
| `src/components/game/GameTable.jsx` | Integrate all new components |
| `src/pages/Game.jsx` | Add RoundScoreOverlay, dealer token, mute |
| `src/pages/MainMenu.jsx` | Visual redesign |
| `src/pages/Lobby.jsx` | Polish — code display, seat preview |
| `src/pages/FinalLeaderboard.jsx` | Full redesign with confetti |
| `src/lib/sounds.js` | **NEW FILE** — sound system |
| `src/components/game/TurnTimer.jsx` | **NEW FILE** — turn countdown |
| `src/components/game/RoundScoreOverlay.jsx` | **NEW FILE** — score screen |
| `public/sounds/` | **NEW FOLDER** — all sound files |

---

*Document version 1.0 — Based on research of Hearthstone, Call Break Plus, VIP Spades, cardgames.io, and card game UX best practices from GDKeys, Game-Ace, and professional card game designers.*
