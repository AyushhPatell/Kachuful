import { calculateRoundPoints } from '../../lib/gameLogic.js'

function getRoundResult(player, round) {
  const call = player.call ?? round?.results?.[player.id]?.call ?? 0
  const won = player.tricksWon ?? round?.results?.[player.id]?.won ?? 0
  const points = calculateRoundPoints(call, won)
  return { call, won, points }
}

function scoreExplanation(call, won, points) {
  if (points > 0 && call === 0 && won === 0) {
    return 'Called 0 and won 0 — bonus 10 pts'
  }
  if (points > 0 && call > 0) {
    return `Called ${call} and won exactly ${won} — +${points} pts`
  }
  if (call === 0 && won > 0) {
    return `Called 0 but won ${won} trick${won === 1 ? '' : 's'} — 0 pts`
  }
  if (call > 0 && won !== call) {
    return `Called ${call}, won ${won} — must match call for points`
  }
  return 'No points this round'
}

export default function RoundSummary({ roundNumber, players, round }) {
  const rows = players
    .filter((p) => p.status !== 'spectator')
    .map((player) => {
      const result = getRoundResult(player, round)
      return {
        id: player.id,
        name: player.name,
        call: result.call,
        won: result.won,
        roundPoints: result.points,
        totalPoints: player.sessionScore ?? 0,
        scored: result.points > 0,
        explanation: scoreExplanation(result.call, result.won, result.points),
      }
    })
    .sort((a, b) => {
      if (b.roundPoints !== a.roundPoints) return b.roundPoints - a.roundPoints
      return b.totalPoints - a.totalPoints
    })

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-4 sm:p-6">
      <h2 className="text-center text-lg font-semibold text-text">Round {roundNumber} complete</h2>
      <p className="mt-2 text-center text-sm text-muted">
        Points only when tricks won match your call (0/0 is a special +10).
      </p>

      <ul className="mt-6 space-y-3">
        {rows.map((row, index) => (
          <li
            key={row.id}
            className={`rounded-xl px-4 py-3 ${
              row.scored ? 'bg-emerald-950/50 ring-1 ring-emerald-700/50' : 'bg-surface ring-1 ring-border'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-text">
                  #{index + 1} {row.name}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Called {row.call} · Won {row.won} trick{row.won === 1 ? '' : 's'}
                </p>
                <p className="mt-1 text-xs text-muted/90">{row.explanation}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                  row.scored ? 'bg-emerald-800/60 text-emerald-100' : 'bg-zinc-800 text-muted'
                }`}
              >
                {row.scored ? 'Scored' : 'No score'}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted">This round</span>
              <span className={row.roundPoints > 0 ? 'font-semibold text-emerald-300' : 'text-muted'}>
                +{row.roundPoints} pts
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted">Session total</span>
              <span className="font-semibold text-text">{row.totalPoints} pts</span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-center text-xs text-muted">
        Next round and voting will be added in the next update.
      </p>
    </section>
  )
}
