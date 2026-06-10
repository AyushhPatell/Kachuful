/**
 * Kachuful Sound System
 * Generates all sounds programmatically via Web Audio API.
 * No external files required — sounds load instantly.
 */

let ctx = null
let muted = false

function getCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
    } catch {
      return null
    }
  }
<<<<<<< HEAD
  // Resume if suspended (browser autoplay policy)
=======
>>>>>>> 6d43acd (Some Improvements)
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

<<<<<<< HEAD
// ── helpers ───────────────────────────────────────────────────────────────────

function gainNode(ac, volume) {
  const g = ac.createGain()
  g.gain.value = volume
  g.connect(ac.destination)
  return g
}

=======
>>>>>>> 6d43acd (Some Improvements)
function osc(ac, type, freq, startTime, duration, gainVal, fadeOut = true) {
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, startTime)
  g.gain.setValueAtTime(gainVal, startTime)
  if (fadeOut) g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  o.connect(g)
  g.connect(ac.destination)
  o.start(startTime)
  o.stop(startTime + duration + 0.05)
}

function noise(ac, startTime, duration, gainVal) {
  const bufferSize = ac.sampleRate * duration
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
<<<<<<< HEAD

  const source = ac.createBufferSource()
  source.buffer = buffer

=======
  const source = ac.createBufferSource()
  source.buffer = buffer
>>>>>>> 6d43acd (Some Improvements)
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1200
  filter.Q.value = 0.8
<<<<<<< HEAD

  const g = ac.createGain()
  g.gain.setValueAtTime(gainVal, startTime)
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

=======
  const g = ac.createGain()
  g.gain.setValueAtTime(gainVal, startTime)
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
>>>>>>> 6d43acd (Some Improvements)
  source.connect(filter)
  filter.connect(g)
  g.connect(ac.destination)
  source.start(startTime)
  source.stop(startTime + duration + 0.05)
}

<<<<<<< HEAD
// ── sound definitions ─────────────────────────────────────────────────────────

const SOUNDS = {
  /** Soft papery swish — card dealt */
=======
const SOUNDS = {
>>>>>>> 6d43acd (Some Improvements)
  cardDeal() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    noise(ac, t, 0.08, 0.18)
    osc(ac, 'sine', 900, t, 0.06, 0.04)
  },
<<<<<<< HEAD

  /** Small tap/thud — card placed on table */
  cardPlay() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    // Low thud
=======
  cardPlay() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
>>>>>>> 6d43acd (Some Improvements)
    osc(ac, 'sine', 180, t, 0.12, 0.25)
    osc(ac, 'sine', 90, t, 0.18, 0.12)
    noise(ac, t, 0.05, 0.08)
  },
<<<<<<< HEAD

  /** Subtle tick — card selected/hovered */
=======
>>>>>>> 6d43acd (Some Improvements)
  cardSelect() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    osc(ac, 'sine', 1200, t, 0.04, 0.06)
    osc(ac, 'sine', 1800, t + 0.015, 0.035, 0.04)
  },
<<<<<<< HEAD

  /** More dramatic — trump card played */
  trumpPlay() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    // Whoosh + impact
=======
  trumpPlay() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
>>>>>>> 6d43acd (Some Improvements)
    osc(ac, 'sawtooth', 400, t, 0.15, 0.12)
    osc(ac, 'sine', 220, t + 0.05, 0.22, 0.2)
    osc(ac, 'sine', 440, t + 0.05, 0.15, 0.15)
    noise(ac, t, 0.12, 0.1)
  },
<<<<<<< HEAD

  /** Chips collected — trick won */
  trickWin() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    // Three quick ascending tones like coins clinking
=======
  trickWin() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
>>>>>>> 6d43acd (Some Improvements)
    ;[0, 0.06, 0.12].forEach((delay, i) => {
      osc(ac, 'sine', 600 + i * 180, t + delay, 0.18, 0.12)
    })
    noise(ac, t, 0.2, 0.06)
  },
<<<<<<< HEAD

  /** Soft bell — your turn notification */
=======
>>>>>>> 6d43acd (Some Improvements)
  yourTurn() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    osc(ac, 'sine', 880, t, 0.5, 0.18)
    osc(ac, 'sine', 1100, t + 0.04, 0.4, 0.10)
    osc(ac, 'sine', 1320, t + 0.08, 0.3, 0.06)
  },
<<<<<<< HEAD

  /** Short fanfare — round end */
  roundEnd() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    const notes = [523, 659, 784, 1047] // C E G C
=======
  roundEnd() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    const notes = [523, 659, 784, 1047]
>>>>>>> 6d43acd (Some Improvements)
    notes.forEach((freq, i) => {
      osc(ac, 'triangle', freq, t + i * 0.1, 0.35, 0.18)
    })
  },
<<<<<<< HEAD

  /** Riffle — shuffle / dealing starts */
=======
>>>>>>> 6d43acd (Some Improvements)
  shuffle() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    for (let i = 0; i < 8; i++) {
      noise(ac, t + i * 0.04, 0.06, 0.12)
    }
  },
<<<<<<< HEAD

  /** Upward ding — made your call */
=======
>>>>>>> 6d43acd (Some Improvements)
  success() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    osc(ac, 'sine', 660, t, 0.22, 0.2)
    osc(ac, 'sine', 880, t + 0.08, 0.2, 0.16)
    osc(ac, 'sine', 1100, t + 0.16, 0.18, 0.14)
  },
<<<<<<< HEAD

  /** Clock tick — countdown urgency */
=======
>>>>>>> 6d43acd (Some Improvements)
  tick() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    osc(ac, 'sine', 1400, t, 0.03, 0.10)
<<<<<<< HEAD
    osc(ac, 'sine', 900,  t + 0.012, 0.025, 0.04)
  },

  /** Low thud — missed call */
=======
    osc(ac, 'sine', 900, t + 0.012, 0.025, 0.04)
  },
>>>>>>> 6d43acd (Some Improvements)
  fail() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    osc(ac, 'sawtooth', 200, t, 0.3, 0.18)
    osc(ac, 'sine', 140, t + 0.05, 0.3, 0.12)
  },
}

<<<<<<< HEAD
// ── public API ────────────────────────────────────────────────────────────────

export function setMuted(val) {
  muted = val
}

export function isMuted() {
  return muted
}

export function playSound(name) {
  if (muted) return
  try {
    SOUNDS[name]?.()
  } catch {
    // Silently ignore — audio errors must never break gameplay
  }
}

/** Call once on first user interaction to unlock audio context */
export function unlockAudio() {
  getCtx()
}
=======
export function setMuted(val) { muted = val }
export function isMuted() { return muted }

export function playSound(name) {
  if (muted) return
  try { SOUNDS[name]?.() } catch { /* never break gameplay */ }
}

export function unlockAudio() { getCtx() }
>>>>>>> 6d43acd (Some Improvements)
