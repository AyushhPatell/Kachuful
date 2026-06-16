import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Route-level code splitting: keeps a flaky mobile connection from having to
// pull down the entire app in one shot just to render the sign-in screen.
const MainMenu = lazy(() => import('./pages/MainMenu.jsx'))
const Lobby = lazy(() => import('./pages/Lobby.jsx'))
const Game = lazy(() => import('./pages/Game.jsx'))
const History = lazy(() => import('./pages/History.jsx'))
const FinalLeaderboard = lazy(() => import('./pages/FinalLeaderboard.jsx'))

function RouteFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<MainMenu />} />
              <Route path="/lobby/:code" element={<Lobby />} />
              <Route path="/game/:code" element={<Game />} />
              <Route path="/history" element={<History />} />
              <Route path="/leaderboard/:code" element={<FinalLeaderboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
