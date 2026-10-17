/**
 * Effets sonores synthétisés avec la Web Audio API (aucun fichier audio).
 * Le contexte audio est créé au premier appel, qui doit suivre un geste
 * de l'utilisateur (clic sur « Combattre ! ») pour être autorisé par le navigateur.
 */

const MUTE_KEY = 'battler:muted'
const VOLUME = 0.6

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let muted = readMuted()

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : VOLUME
    master.connect(ctx.destination)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return { ctx, out: master!, now: ctx.currentTime }
}

export function isMuted() {
  return muted
}

export function setMuted(value: boolean) {
  muted = value
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    /* stockage indisponible : on garde juste l'état en mémoire */
  }
  if (ctx && master) master.gain.setTargetAtTime(value ? 0 : VOLUME, ctx.currentTime, 0.02)
}

/** Enveloppe percussive : attaque très courte puis décroissance exponentielle. */
function envelope(c: AudioContext, t: number, dur: number, peak: number) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  return g
}

interface ToneOpts {
  at?: number
  freq: number
  to?: number
  dur: number
  type?: OscillatorType
  gain?: number
}

function tone({ at = 0, freq, to, dur, type = 'sine', gain = 0.3 }: ToneOpts) {
  const { ctx: c, out, now } = audio()
  const t = now + at
  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = envelope(c, t, dur, gain)
  osc.connect(g).connect(out)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

interface NoiseOpts {
  at?: number
  dur: number
  filter?: BiquadFilterType
  freq: number
  to?: number
  q?: number
  gain?: number
}

function noise({ at = 0, dur, filter = 'lowpass', freq, to, q = 1, gain = 0.3 }: NoiseOpts) {
  const { ctx: c, out, now } = audio()
  const t = now + at
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const f = c.createBiquadFilter()
  f.type = filter
  f.Q.value = q
  f.frequency.setValueAtTime(freq, t)
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = envelope(c, t, dur, gain)
  src.connect(f).connect(g).connect(out)
  src.start(t, Math.random() * 0.5)
  src.stop(t + dur + 0.05)
}

export const sfx = {
  click() {
    tone({ freq: 660, to: 990, dur: 0.08, type: 'triangle', gain: 0.15 })
  },

  /** Cliquetis du dé qui roule pendant `ms` millisecondes. */
  diceRoll(ms: number) {
    for (let t = 0; t < ms / 1000; t += 0.055 + Math.random() * 0.04) {
      noise({ at: t, dur: 0.03, filter: 'highpass', freq: 2200 + Math.random() * 2000, gain: 0.22 })
      tone({ at: t, freq: 900 + Math.random() * 700, dur: 0.025, type: 'triangle', gain: 0.05 })
    }
  },

  /** Le dé s'arrête : petit choc sourd, avec un jingle sur le max et un « bof » sur 1. */
  diceLand(value: number, faces: number) {
    tone({ freq: 190, to: 90, dur: 0.12, gain: 0.45 })
    noise({ dur: 0.07, freq: 900, gain: 0.25 })
    if (value === faces) {
      ;[880, 1320, 1760].forEach((f, i) => tone({ at: 0.06 + i * 0.07, freq: f, dur: 0.25, type: 'triangle', gain: 0.12 }))
    } else if (value === 1) {
      tone({ at: 0.05, freq: 240, to: 150, dur: 0.35, type: 'sawtooth', gain: 0.06 })
    }
  },

  /** Souffle de l'élan vers l'adversaire. */
  whoosh() {
    noise({ dur: 0.32, filter: 'bandpass', freq: 350, to: 2200, q: 1.8, gain: 0.4 })
  },

  /** Impact, plus lourd selon les dégâts ; ajoute un fracas métallique sur 8+ ou critique. */
  impact(damage: number, crit = false) {
    const k = Math.min(damage, 12) / 10
    tone({ freq: 160, to: 38, dur: 0.22 + 0.15 * k, gain: 0.5 + 0.45 * k })
    noise({ dur: 0.1 + 0.08 * k, freq: 1400 + 3000 * k, gain: 0.45 + 0.35 * k })
    if (crit) {
      tone({ freq: 70, to: 30, dur: 0.6, type: 'sawtooth', gain: 0.18 })
      noise({ at: 0.03, dur: 0.5, freq: 3000, to: 300, gain: 0.35 })
    }
    if (damage >= 8 || crit) {
      tone({ freq: 523, dur: 0.45, type: 'square', gain: 0.07 })
      tone({ freq: 787, dur: 0.5, type: 'triangle', gain: 0.09 })
      noise({ at: 0.02, dur: 0.3, filter: 'highpass', freq: 4500, gain: 0.12 })
    }
  },

  /** Annonce d'un coup critique : montée brillante. */
  crit() {
    tone({ freq: 300, to: 1200, dur: 0.3, type: 'sawtooth', gain: 0.08 })
    ;[1047, 1319, 1568].forEach((f, i) => tone({ at: 0.12 + i * 0.05, freq: f, dur: 0.3, type: 'triangle', gain: 0.1 }))
  },

  /** Esquive : coup dans le vide, sifflement aigu et petit saut. */
  dodge() {
    noise({ dur: 0.18, filter: 'bandpass', freq: 3500, to: 1200, q: 3, gain: 0.3 })
    tone({ freq: 500, to: 1100, dur: 0.12, type: 'triangle', gain: 0.1 })
    tone({ at: 0.1, freq: 900, to: 600, dur: 0.1, type: 'triangle', gain: 0.07 })
  },

  /** Déclenchement d'un événement : carillon magique ascendant. */
  event() {
    ;[659, 880, 1175, 1568].forEach((f, i) => {
      tone({ at: i * 0.06, freq: f, dur: 0.5, type: 'sine', gain: 0.12 })
      tone({ at: i * 0.06, freq: f * 2, dur: 0.3, type: 'triangle', gain: 0.03 })
    })
    noise({ dur: 0.6, filter: 'highpass', freq: 6000, gain: 0.05 })
  },

  /** Le perdant s'effondre. */
  ko() {
    tone({ freq: 95, to: 28, dur: 1.3, gain: 0.9 })
    noise({ dur: 0.9, freq: 500, to: 80, gain: 0.5 })
    tone({ at: 0.1, freq: 420, to: 70, dur: 1.1, type: 'sawtooth', gain: 0.08 })
  },

  /** Petite fanfare de victoire. */
  victory() {
    const notes: [number, number, number][] = [
      [523, 0, 0.18],
      [659, 0.16, 0.18],
      [784, 0.32, 0.18],
      [1047, 0.5, 0.7],
    ]
    for (const [f, at, dur] of notes) {
      tone({ at, freq: f, dur, type: 'square', gain: 0.07 })
      tone({ at, freq: f / 2, dur, type: 'triangle', gain: 0.12 })
    }
  },
}
