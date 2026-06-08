import { useEffect, useState } from 'react'
import { acknowledgeTrickReveal } from '../firebase/sessions.js'
import { ROUND_STATUS } from '../constants/game.js'

export const TRICK_PAUSE_MS = 1200
export const COLLECT_MS = 700
export const DEAL_CARD_MS = 420
export const PLAY_FLY_MS = 400

export function useTablePhase({
  code,
  isOwner,
  round,
  roundNumber,
  session,
  dealSequenceLength,
  scoresReady,
  onError,
}) {
  const [tablePhase, setTablePhase] = useState('playing')
  const [frozenTrickReveal, setFrozenTrickReveal] = useState(null)
  const [dealStep, setDealStep] = useState(0)

  useEffect(() => {
    if (session?.lastTrickReveal?.at) {
      setFrozenTrickReveal(session.lastTrickReveal)
    }
  }, [session?.lastTrickReveal?.at])

  useEffect(() => {
    const reveal = session?.lastTrickReveal
    if (!reveal?.at) return undefined

    setTablePhase('trick-won')
    const timers = []

    if (reveal.endsRound) {
      timers.push(
        setTimeout(() => {
          acknowledgeTrickReveal(code).catch((err) => onError?.(err.message))
        }, TRICK_PAUSE_MS),
      )
      timers.push(setTimeout(() => setTablePhase('collect'), TRICK_PAUSE_MS))
      timers.push(
        setTimeout(() => setTablePhase('round-scores'), TRICK_PAUSE_MS + COLLECT_MS),
      )
    } else {
      timers.push(
        setTimeout(() => {
          acknowledgeTrickReveal(code)
            .then(() => {
              setTablePhase('playing')
              setFrozenTrickReveal(null)
            })
            .catch((err) => onError?.(err.message))
        }, TRICK_PAUSE_MS),
      )
    }

    return () => timers.forEach(clearTimeout)
  }, [code, session?.lastTrickReveal?.at, session?.lastTrickReveal?.endsRound, onError])

  useEffect(() => {
    if (round?.status === ROUND_STATUS.COMPLETE && scoresReady && frozenTrickReveal?.endsRound) {
      setTablePhase('round-scores')
    }
  }, [round?.status, scoresReady, frozenTrickReveal?.endsRound])

  useEffect(() => {
    if (round?.status !== ROUND_STATUS.CALLING || roundNumber <= 0) return undefined
    setTablePhase('dealing')
    setFrozenTrickReveal(null)
    setDealStep(0)
    return undefined
  }, [round?.status, roundNumber, round?.dealerIndex])

  useEffect(() => {
    if (tablePhase !== 'dealing' || !dealSequenceLength) return undefined
    if (dealStep >= dealSequenceLength) {
      setTablePhase('playing')
      return undefined
    }
    const timer = setTimeout(() => setDealStep((s) => s + 1), DEAL_CARD_MS)
    return () => clearTimeout(timer)
  }, [tablePhase, dealStep, dealSequenceLength])

  function resetForNextRound() {
    setFrozenTrickReveal(null)
    setDealStep(0)
    setTablePhase('dealing')
  }

  const trickReveal = session?.lastTrickReveal ?? frozenTrickReveal

  const callingPhase =
    round?.status === ROUND_STATUS.CALLING &&
    !['round-scores', 'trick-won', 'collect'].includes(tablePhase)

  const playingPhase = round?.status === ROUND_STATUS.PLAYING && tablePhase === 'playing'

  return {
    tablePhase,
    trickReveal,
    dealStep,
    callingPhase,
    playingPhase,
    resetForNextRound,
  }
}
