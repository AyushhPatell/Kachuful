# Kachuful

Online multiplayer web app for **Kachuful**. Players join via a 6-digit session code — no install required.

## Stack

- **Frontend:** React (Vite), React Router, Tailwind CSS, Framer Motion
- **Backend:** Firebase (Auth, Firestore, Realtime Database, Hosting)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Firebase setup

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Google** sign-in under Authentication
3. Create a **Firestore** database
4. Create a **Realtime Database** instance (for live card plays in later phases)
5. Copy `.env.example` to `.env` and fill in your config values from Project Settings → Your apps → Web

```bash
cp .env.example .env
```

### 3. Run locally

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Project structure

```
src/
  constants/game.js      # Sar suits, statuses, limits
  lib/
    cards.js             # Deck, shuffle, deal
    gameLogic.js         # Scoring, sar rotation, trick evaluation
    sessionCode.js       # 6-char code generation
  firebase/              # Auth + Firestore session helpers
  pages/                 # Main Menu, Lobby, Game, History
  components/            # UI + playing cards
```

## Development phases

| Phase | Status |
|-------|--------|
| **Phase 1 — Core Game** | In progress (scaffold, lobby, dealing, calling UI) |
| **Phase 2 — Disconnect handling** | Not started |
| **Phase 3 — Session history** | Not started |
| **Phase 4 — Polish** | Not started |

## What's built so far

- Project scaffold with routing and card-game UI theme
- Core game logic (scoring, sar rotation, mountain round cycle, trick evaluation)
- Session create/join flow with owner approval in lobby
- Real-time lobby via Firestore listeners
- Game start: deal cards, calling phase, table + hand UI

## Responsive behavior

- **Phone portrait (`<768px`)**: single-column flow, swipeable hand row, large touch targets.
- **Phone landscape**: gameplay keeps horizontal hand scrolling to prevent card squeeze.
- **Tablet (`>=768px`)**: game uses two-column layout (table/hand + side standings/call panel).
- **Laptop/Desktop (`>=1024px`)**: wider spacing and stable side panel; hand wraps cleanly.
- **Home-screen mode**: `site.webmanifest` + mobile-web-app meta tags enabled for app-like launch.

## Next up (Phase 1 completion)

- Card play + trick resolution
- Round summary + voting (next round / end session)
- Final leaderboard + tie-breaking
- Firestore security rules

## Scripts

```bash
npm run dev      # local dev server
npm run build    # production build
npm run preview  # preview production build
```

## Auto-deploy with GitHub Actions

This repo includes `.github/workflows/deploy-firebase-hosting.yml`.

- Trigger: push to `main` (or manual run)
- Pipeline: install deps -> run logic tests -> build -> deploy hosting (rules deploy is best-effort)

### One-time setup

1. Create a Firebase service account key:
   - Firebase Console -> Project settings -> Service accounts
   - Click **Generate new private key**
2. In GitHub repo:
   - Settings -> Secrets and variables -> Actions -> New repository secret
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: paste the full JSON key content
3. **Publish Firestore rules once (required for join/play):**
   - Firebase Console -> Firestore -> Rules
   - Paste contents of `firestore.rules` from this repo
   - Click **Publish**
4. Push to `main` and the workflow deploys the web app automatically.

If CI shows a Firestore rules step warning (`403` on `firestore.googleapis.com`), hosting still deploys. Rules can stay manual unless you grant the service account **Firebase Admin** (or Editor) in Google Cloud IAM.
