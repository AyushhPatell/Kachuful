import { useState } from 'react'
import { motion } from 'framer-motion'
import { getCommittedCallsSum, getLegalCalls } from '../../lib/callValidation.js'
import { playSound } from '../../lib/sounds.js'

export default function CallPicker({
  cardsPerRound,
  players,
  userId,
  onSubmit,
  busy,
}) {
  const [selected, setSelected] = useState(null)

  const legalCalls = getLegalCalls(cardsPerRound, players, userId)
  const committed = getCommittedCallsSum(players)

  // Figure out if this is the last caller (all others have called)
  const otherActivePlayers = players.filter(p => p.id !== userId && p.status !== 'spectator')
  const isLastCaller = otherActivePlayers.every(p => p.call !== null && p.call !== undefined)
  const forbiddenCall = isLastCaller ? cardsPerRound - committed : null

  const otherCalls = players
    .filter(p => p.id !== userId && p.call != null)
    .map(p => ({ name: p.name, call: p.call }))

  function handleSelect(val) {
    setSelected(val)
    playSound('cardSelect')
  }

  function handleSubmit() {
    if (selected === null || busy) return
    playSound('cardPlay')
    onSubmit(selected)
  }

  return (
    <div className="px-4 pb-4 pt-2">
      {/* Header */}
      <div className="mb-3 text-center">
        <p
          className="text-base font-semibold text-emerald-50"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          How many tricks?
        </p>
        <p className="mt-0.5 text-xs text-zinc-400">
          {cardsPerRound} card{cardsPerRound !== 1 ? 's' : ''} this round
          {' · '}
          <span className={committed === cardsPerRound ? 'text-red-400' : 'text-zinc-400'}>
            {committed} called so far
          </span>
        </p>
      </div>

      {/* Others' calls */}
      {otherCalls.length > 0 && (
        <div className="mb-3 flex flex-wrap justify-center gap-1.5">
          {otherCalls.map(({ name, call }) => (
            <span
              key={name}
              className="rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] text-zinc-300"
            >
              {name}:{' '}
              <span className="font-semibold text-amber-300">{call}</span>
            </span>
          ))}
        </div>
      )}

      {/* Number buttons */}
      <div className="mb-3 flex flex-wrap justify-center gap-2.5">
        {Array.from({ length: cardsPerRound + 1 }, (_, i) => i).map(num => {
          const allowed = legalCalls.includes(num)
          const isSelected = selected === num
          const isForbidden = num === forbiddenCall && !allowed

          return (
            <motion.button
              key={num}
              whileTap={allowed ? { scale: 0.9 } : {}}
              disabled={!allowed || busy}
              onClick={() => allowed && handleSelect(num)}
              className="relative flex h-12 w-12 items-center justify-center rounded-full text-base font-bold transition-all disabled:cursor-not-allowed"
              style={{
                background: isSelected
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : allowed
                  ? 'rgba(255,255,255,0.09)'
                  : isForbidden
                  ? 'rgba(239,68,68,0.08)'
                  : 'rgba(255,255,255,0.03)',
                border: isSelected
                  ? '2px solid rgba(251,191,36,0.85)'
                  : allowed
                  ? '1.5px solid rgba(255,255,255,0.14)'
                  : isForbidden
                  ? '1.5px solid rgba(239,68,68,0.3)'
                  : '1px solid rgba(255,255,255,0.05)',
                boxShadow: isSelected
                  ? '0 0 18px rgba(245,158,11,0.5), 0 4px 12px rgba(0,0,0,0.45)'
                  : '0 2px 8px rgba(0,0,0,0.3)',
                color: isSelected ? '#1a0e00' : allowed ? '#e0e0e0' : isForbidden ? '#f87171' : '#444',
                opacity: allowed ? 1 : 0.5,
              }}
            >
              {num}
              {isForbidden && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500/80 text-[7px] text-white">
                  ✕
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Forbidden call explanation */}
      {isLastCaller && forbiddenCall !== null && forbiddenCall >= 0 && forbiddenCall <= cardsPerRound && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-center text-[11px] text-red-400"
          style={{ border: '1px solid rgba(239,68,68,0.18)' }}
        >
          You can't call <strong>{forbiddenCall}</strong> — total tricks called cannot equal the number of cards ({cardsPerRound}).
        </motion.p>
      )}

      {/* Confirm */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={selected === null || busy}
        onClick={handleSubmit}
        className="w-full rounded-xl py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-35"
        style={{
          background:
            selected !== null
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : 'rgba(255,255,255,0.08)',
          color: selected !== null ? '#1a0e00' : '#777',
          boxShadow: selected !== null ? '0 4px 16px rgba(245,158,11,0.35)' : 'none',
        }}
      >
        {selected !== null ? `Call ${selected}` : 'Select a number'}
      </motion.button>
    </div>
  )
}
