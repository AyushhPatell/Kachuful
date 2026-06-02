import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import MainMenu from './pages/MainMenu.jsx'
import Lobby from './pages/Lobby.jsx'
import Game from './pages/Game.jsx'
import History from './pages/History.jsx'
import FinalLeaderboard from './pages/FinalLeaderboard.jsx'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/lobby/:code" element={<Lobby />} />
          <Route path="/game/:code" element={<Game />} />
          <Route path="/history" element={<History />} />
          <Route path="/leaderboard/:code" element={<FinalLeaderboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
