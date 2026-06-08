import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout.jsx'
import Button from '../components/ui/Button.jsx'
import PlayerAvatar from '../components/game/PlayerAvatar.jsx'
import { subscribeToPlayers } from '../firebase/sessions.js'
import { rankPlayers } from '../lib/gameLogic.js'

export default function FinalLeaderboard() {
  const { code } = useParams()
  const [players, setPlayers] = useState([])

  useEffect(() => {
    return subscribeToPlayers(code, setPlayers)
  }, [code])

  const ranked = useMemo(() => rankPlayers(players), [players])

  return (
    <PageLayout title="Final Standings">
      <p className="mb-4 text-center text-sm text-muted">
        Session <span className="font-mono font-semibold text-accent">{code}</span>
      </p>

      <ul className="space-y-2">
        {ranked.map((player) => (
          <li
            key={player.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3"
          >
            <span className="w-6 text-center text-lg font-bold text-muted">{player.rank}</span>
            <PlayerAvatar name={player.name} photoURL={player.photoURL} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-text">{player.name}</p>
              <p className="text-xs text-muted">
                {player.roundsFailed ?? 0} failed rounds
              </p>
            </div>
            <p className="text-lg font-bold text-accent">{player.sessionScore ?? 0}</p>
          </li>
        ))}
      </ul>

      {ranked.length === 0 ? (
        <p className="mt-4 text-center text-sm text-muted">Loading results…</p>
      ) : null}

      <Link to="/" className="mt-6 block">
        <Button className="w-full">Back to Menu</Button>
      </Link>
    </PageLayout>
  )
}
