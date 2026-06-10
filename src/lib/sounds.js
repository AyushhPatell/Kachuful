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
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// ── helpers ───────────────────────────────────────────────────────────────────

function gainNode(ac, volume) {
  const g = ac.createGain()
  g.gain.value = volume
  g.connect(ac.destination)
  return g
}

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

  const source = ac.createBufferSource()
  source.buffer = buffer

  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1200
  filter.Q.value = 0.8

  const g = ac.createGain()
  g.gain.setValueAtTime(gainVal, startTime)
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  source.connect(filter)
  filter.connect(g)
  g.connect(ac.destination)
  source.start(startTime)
  source.stop(startTime + duration + 0.05)
}

// ── sound definitions ─────────────────────────────────────────────────────────

const SOUNDS = {
  /** Soft papery swish — card dealt */
  cardDeal() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    noise(ac, t, 0.08, 0.18)
    osc(ac, 'sine', 900, t, 0.06, 0.04)
  },

  /** Small tap/thud — card placed on table */
  cardPlay() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    // Low thud
    osc(ac, 'sine', 180, t, 0.12, 0.25)
    osc(ac, 'sine', 90, t, 0.18, 0.12)
    noise(ac, t, 0.05, 0.08)
  },

  /** Subtle tick — card selected/hovered */
  cardSelect() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    osc(ac, 'sine', 1200, t, 0.04, 0.06)
    osc(ac, 'sine', 1800, t + 0.015, 0.035, 0.04)
  },

  /** More dramatic — trump card played */
  trumpPlay() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    // Whoosh + impact
    osc(ac, 'sawtooth', 400, t, 0.15, 0.12)
    osc(ac, 'sine', 220, t + 0.05, 0.22, 0.2)
    osc(ac, 'sine', 440, t + 0.05, 0.15, 0.15)
    noise(ac, t, 0.12, 0.1)
  },

  /** Chips collected — trick won */
  trickWin() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    // Three quick ascending tones like coins clinking
    ;[0, 0.06, 0.12].forEach((delay, i) => {
      osc(ac, 'sine', 600 + i * 180, t + delay, 0.18, 0.12)
    })
    noise(ac, t, 0.2, 0.06)
  },

  /** Soft bell — your turn notification */
  yourTurn() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    osc(ac, 'sine', 880, t, 0.5, 0.18)
    osc(ac, 'sine', 1100, t + 0.04, 0.4, 0.10)
    osc(ac, 'sine', 1320, t + 0.08, 0.3, 0.06)
  },

  /** Short fanfare — round end */
  roundEnd() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    const notes = [523, 659, 784, 1047] // C E G C
    notes.forEach((freq, i) => {
      osc(ac, 'triangle', freq, t + i * 0.1, 0.35, 0.18)
    })
  },

  /** Riffle — shuffle / dealing starts */
  shuffle() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    for (let i = 0; i < 8; i++) {
      noise(ac, t + i * 0.04, 0.06, 0.12)
    }
  },

  /** Upward ding — made your call */
  success() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    osc(ac, 'sine', 660, t, 0.22, 0.2)
    osc(ac, 'sine', 880, t + 0.08, 0.2, 0.16)
    osc(ac, 'sine', 1100, t + 0.16, 0.18, 0.14)
  },

  /** Clock tick — countdown urgency */
  tick() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    osc(ac, 'sine', 1400, t, 0.03, 0.10)
    osc(ac, 'sine', 900,  t + 0.012, 0.025, 0.04)
  },

  /** Low thud — missed call */
  fail() {
    const ac = getCtx(); if (!ac) return
    const t = ac.currentTime
    osc(ac, 'sawtooth', 200, t, 0.3, 0.18)
    osc(ac, 'sine', 140, t + 0.05, 0.3, 0.12)
  },
}

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
