import { useState } from 'react'
import { castVote, cancelEndVote } from '../../firebase/sessions.js'
import { getEndVoteTally } from '../../lib/voting.js'

export default function EndVoteBanner({
  round,
  players,
  currentUserId,
  isOwner,
  roundNumber,
  sessionCode,
  compact = false,
}) {
  const [busy, setBusy] = useState(false)

  const { endCount, continueCount, totalVoters } = getEndVoteTally(round, players)
  const myVote = round?.votes?.[currentUserId] ?? null

  async function vote(choice) {
    setBusy(true)
    try { await castVote(sessionCode, roundNumber, currentUserId, choice) }
    catch (err) { console.error(err) }
    finally { setBusy(false) }
  }

  async function handleCancel() {
    setBusy(true)
    try { await cancelEndVote(sessionCode, roundNumber) }
    catch (err) { console.error(err) }
    finally { setBusy(false) }
  }

  return (
    <div
      className={compact ? 'mx-3 rounded-xl px-3 py-2.5' : 'mx-3 mb-2 rounded-xl px-3 py-2.5'}
      style={{
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.3)',
        backdropFilter: compact ? 'blur(8px)' : undefined,
      }}
    >
      <p className="mb-1 text-center text-[11px] font-semibold text-amber-300">
        {isOwner ? 'Waiting for votes…' : 'Host wants to end the game'}
      </p>
      <p className="mb-2.5 text-center text-[10px] text-zinc-500">
        {endCount} end · {continueCount} continue · {totalVoters - endCount - continueCount} waiting
      </p>

      {!isOwner && !myVote && (
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => vote('end')}
            className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #c9963a, #a67828)' }}
          >
            End Game
          </button>
          <button
            disabled={busy}
            onClick={() => vote('continue')}
            className="flex-1 rounded-xl py-2.5 text-xs font-bold text-zinc-200 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            Continue
          </button>
        </div>
      )}

      {!isOwner && myVote && (
        <p className="text-center text-xs text-zinc-400">
          You voted: <span className={myVote === 'end' ? 'text-amber-300' : 'text-zinc-300'}>{myVote === 'end' ? 'End Game' : 'Continue'}</span>
        </p>
      )}

      {isOwner && (
        <button
          onClick={handleCancel}
          disabled={busy}
          className="w-full text-center text-[11px] text-zinc-600 underline disabled:opacity-40"
        >
          Cancel vote
        </button>
      )}
    </div>
  )
}
