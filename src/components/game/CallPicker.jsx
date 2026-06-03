import Button from '../ui/Button.jsx'
import { getCommittedCallsSum, getLegalCalls } from '../../lib/callValidation.js'

export default function CallPicker({
  cardsPerRound,
  players,
  userId,
  onSubmit,
  busy,
}) {
  const legalCalls = getLegalCalls(cardsPerRound, players, userId)
  const committed = getCommittedCallsSum(players)

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-4">
      <h2 className="mb-2 text-sm font-semibold text-text">Call your tricks</h2>
      <p className="mb-3 text-sm text-muted">
        Total calls cannot equal {cardsPerRound} for this round. First picks lock options for
        others — updates live.
      </p>
      <p className="mb-4 text-xs text-muted">
        Committed so far: <span className="text-text">{committed}</span> / must not reach{' '}
        {cardsPerRound} exactly
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {Array.from({ length: cardsPerRound + 1 }, (_, c) => c).map((value) => {
          const allowed = legalCalls.includes(value)
          return (
            <Button
              key={value}
              variant={allowed ? 'primary' : 'secondary'}
              className={`min-h-12 ${!allowed ? 'opacity-35' : ''}`}
              disabled={!allowed || busy}
              onClick={() => onSubmit(value)}
            >
              {value}
            </Button>
          )
        })}
      </div>
    </section>
  )
}
