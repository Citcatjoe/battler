/**
 * Effets sonores, joués avec la Web Audio API. Les règles (ce que chaque son veut dire, quand il
 * joue, le son d'une nouvelle compétence) sont dans `docs/SONS.md` : ce module en est la mise en
 * œuvre. Un son = un fichier (`src/assets/sounds/<nom>.mp3`) ; tant que son fichier n'est pas
 * chargé, ou s'il manque, une version synthétisée joue à sa place.
 * Le contexte audio est créé au premier appel, qui doit suivre un geste
 * de l'utilisateur (clic sur « Combattre ! ») pour être autorisé par le navigateur.
 */

const MUTE_KEY = 'battler:muted'
/** Musique coupée à part (0.53.0) : les effets restent */
const MUSIC_MUTE_KEY = 'battler:music-muted'
// Volume général (0.36.4 : de 0.6 à 1, « on n'entend rien »), derrière un compresseur qui évite la saturation
const VOLUME = 1

let ctx: AudioContext | null = null
let master: GainNode | null = null
/** Bus de la musique : à part du compresseur des effets (qu'elle ferait pomper), coupé avec eux */
let musicBus: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let muted = readMuted()
let musicMuted = readMuted(MUSIC_MUTE_KEY)
/** Niveau du bus de musique : coupé par le bouton du son, ou par celui de la musique seule */
const musicOn = () => (muted || musicMuted ? 0 : 1)
/** Vitesse du combat (×1, ×2, ×4) : au-delà de ×1, les sons du combat sont écourtés d'autant. */
let speed = 1

/** Les sons du jeu, un fichier chacun (`docs/SONS.md` § 3). `crit-rumble` est la couche du Coup critique. */
export const SOUND_NAMES = [
  'dice-roll', 'dice-land', 'coin-toss', 'coin-land', 'coin-win',
  'hit', 'crit-rumble', 'dodge',
  'aura-gain', 'aura-loss', 'buff', 'debuff', 'dispel', 'stun', 'rot', 'heal',
  'shift', 'ko', 'victory', 'click', 'clash',
] as const
export type SoundName = (typeof SOUND_NAMES)[number]

/**
 * Exception déclarée à « un son = un fichier » (`docs/SONS.md`, règle 2) : les dés ont plusieurs
 * fichiers (`dice-roll-1.mp3`, `dice-roll-2.mp3`…), tirés au hasard à chaque jet, comme un vrai dé
 * qui ne sonne jamais deux fois pareil. Décision de l'utilisateur (0.36.4).
 */
export const VARIED_SOUNDS: readonly SoundName[] = ['dice-roll', 'dice-land']

/*
 * Fichiers traités hors du jeu (silence de tête coupé, durée ramenée à la fenêtre du son à ×1,
 * intensité égalisée) par `scripts/process-sounds.py` ; provenance dans `SOURCES.md`.
 */
export const SAMPLE_URLS: Record<string, string[]> = {}
for (const [path, url] of Object.entries(
  import.meta.glob<string>('../assets/sounds/*.mp3', { eager: true, query: '?url', import: 'default' }),
)) {
  const file = path.split('/').pop()!.replace(/\.mp3$/, '')
  // `dice-roll-2` est la 2e variante de `dice-roll` (sons à variantes seulement)
  const varied = VARIED_SOUNDS.find((n) => new RegExp(`^${n}-\\d+$`).test(file))
  ;(SAMPLE_URLS[varied ?? file] ??= []).push(url)
}
const samples: Partial<Record<string, AudioBuffer[]>> = {}

/** Niveaux d'intensité (`docs/SONS.md` § 3 et § 5) : 1 fort, 2 appuyé, 3 moyen, 4 discret. */
const LEVEL = { 1: 1, 2: 0.85, 3: 0.7, 4: 0.45 } as const
/** Volume de chaque son ; les dés gardent leur place de la 0.36.0 (validée par l'utilisateur) sous le niveau 3. */
const MIX: Record<SoundName, number> = {
  'dice-roll': 0.47,
  'dice-land': 0.64,
  'coin-toss': LEVEL[4],
  'coin-land': LEVEL[2],
  'coin-win': LEVEL[2],
  hit: LEVEL[2],
  'crit-rumble': LEVEL[1],
  dodge: LEVEL[3],
  'aura-gain': LEVEL[2],
  'aura-loss': LEVEL[3],
  buff: LEVEL[3],
  debuff: LEVEL[3],
  dispel: LEVEL[3],
  stun: LEVEL[3],
  rot: LEVEL[4],
  heal: LEVEL[3],
  shift: LEVEL[2],
  ko: LEVEL[1],
  victory: LEVEL[2],
  click: LEVEL[4],
  clash: LEVEL[1],
}
/** Sons hors du rythme du combat : jamais écourtés par la vitesse. */
const UNTIMED = new Set<SoundName>(['click', 'clash', 'ko', 'victory'])

function loadSamples(c: AudioContext) {
  for (const [name, urls] of Object.entries(SAMPLE_URLS))
    for (const url of urls)
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((data) => c.decodeAudioData(data))
        .then((buf) => (samples[name] ??= []).push(buf))
        .catch(() => {
          /* fichier illisible : le son synthétisé reste */
        })
}

function readMuted(key = MUTE_KEY) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : VOLUME
    // Compresseur : les sons qui se chevauchent (coup critique, fin de combat) ne saturent pas
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.knee.value = 8
    comp.ratio.value = 4
    comp.attack.value = 0.003
    comp.release.value = 0.15
    const makeup = ctx.createGain()
    makeup.gain.value = 1.4
    master.connect(comp).connect(makeup).connect(ctx.destination)
    musicBus = ctx.createGain()
    musicBus.gain.value = musicOn()
    musicBus.connect(ctx.destination)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    loadSamples(ctx)
  }
  if (ctx.state !== 'running') void ctx.resume()
  return { ctx, out: master!, now: ctx.currentTime }
}

/*
 * Déverrouillage : le navigateur suspend le contexte audio (créé hors d'un geste, onglet mis en
 * arrière-plan, veille…) et ne le laisse repartir que pendant un geste de l'utilisateur. Chaque
 * clic ou touche, n'importe où, le réveille ; sans cela, les sons joués par le combat (hors geste)
 * restaient muets jusqu'au prochain bouton.
 */
if (typeof window !== 'undefined') {
  const unlock = () => {
    if (ctx && ctx.state !== 'running') void ctx.resume()
  }
  window.addEventListener('pointerdown', unlock, true)
  window.addEventListener('keydown', unlock, true)
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
  if (ctx && musicBus) musicBus.gain.setTargetAtTime(musicOn(), ctx.currentTime, 0.05)
}

export function isMusicMuted() {
  return musicMuted
}

/** Coupe ou rétablit la musique seule (deuxième bouton, 0.53.0), en fondu court ; les effets ne changent pas. */
export function setMusicMuted(value: boolean) {
  musicMuted = value
  try {
    localStorage.setItem(MUSIC_MUTE_KEY, value ? '1' : '0')
  } catch {
    /* stockage indisponible : on garde juste l'état en mémoire */
  }
  if (ctx && musicBus) musicBus.gain.setTargetAtTime(musicOn(), ctx.currentTime, 0.15)
}

/* ---------- Musique de fond des combats (docs/SONS.md § 10) ---------- */

/**
 * Tapis sonore des combats : trois boucles (`src/assets/music/`), une tirée au hasard à chaque combat,
 * quelle que soit l'arène, jouée en boucle sous les effets. Sa sonie a été mesurée (LUFS intégrés,
 * `ffmpeg -af ebur128`) : chaque piste est ramenée à la même sonie, `MUSIC_TARGET`, nettement sous
 * les effets (égalisés vers -12 dB RMS), pour rester un fond.
 */
const MUSIC_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../assets/music/*.mp3', { eager: true, query: '?url', import: 'default' })).map(
    ([path, url]) => [path.split('/').pop()!.replace(/\.mp3$/, ''), url],
  ),
)
export const MUSIC_TRACKS = Object.keys(MUSIC_URLS)
export const MUSIC_LOUDNESS: Record<string, number> = { 'battle-boss': -18.4, 'battle-orchestral': -9.7, 'battle-drums': -8.7 }
/** Sonie visée pour la musique (LUFS) : « pas trop fort », environ 15 dB sous les effets */
const MUSIC_TARGET = -29
const MUSIC_FADE_IN = 2.5
const MUSIC_FADE_OUT = 1.2
/** Sous le KO et la fanfare de victoire, la musique s'efface à cette part de son niveau */
const MUSIC_DUCK = 0.25

const musicBuffers: Partial<Record<string, Promise<AudioBuffer>>> = {}
let current: { source: AudioBufferSourceNode; gain: GainNode; level: number } | null = null
/** Jeton de la lecture demandée : un arrêt pendant le chargement annule la lecture */
let musicTicket = 0

const musicGain = (track: string) => 10 ** ((MUSIC_TARGET - (MUSIC_LOUDNESS[track] ?? -14)) / 20)

function loadMusic(c: AudioContext, track: string) {
  return (musicBuffers[track] ??= fetch(MUSIC_URLS[track])
    .then((r) => r.arrayBuffer())
    .then((data) => c.decodeAudioData(data)))
}

export const music = {
  /** Lance une boucle tirée au hasard (ou `track`), en fondu ; remplace celle en cours. */
  start(track = MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)]) {
    if (!track || !MUSIC_URLS[track]) return
    music.stop()
    const ticket = ++musicTicket
    const { ctx: c } = audio()
    loadMusic(c, track)
      .then((buf) => {
        if (ticket !== musicTicket || !musicBus) return
        const source = c.createBufferSource()
        source.buffer = buf
        source.loop = true
        const gain = c.createGain()
        const level = musicGain(track)
        gain.gain.setValueAtTime(0.0001, c.currentTime)
        gain.gain.linearRampToValueAtTime(level, c.currentTime + MUSIC_FADE_IN)
        source.connect(gain).connect(musicBus)
        source.start()
        current = { source, gain, level }
      })
      .catch(() => {
        /* fichier illisible : le combat se joue sans musique */
      })
  },
  /** Arrête la musique en fondu (fin du combat, retour au menu). */
  stop() {
    musicTicket++
    if (!current || !ctx) return
    const { source, gain } = current
    const t = ctx.currentTime
    gain.gain.cancelScheduledValues(t)
    gain.gain.setValueAtTime(gain.gain.value, t)
    gain.gain.linearRampToValueAtTime(0.0001, t + MUSIC_FADE_OUT)
    source.stop(t + MUSIC_FADE_OUT + 0.05)
    current = null
  },
  /** S'efface sous le KO et la victoire, pour qu'ils ressortent. */
  duck() {
    if (!current || !ctx) return
    const t = ctx.currentTime
    current.gain.gain.cancelScheduledValues(t)
    current.gain.gain.setValueAtTime(current.gain.gain.value, t)
    current.gain.gain.linearRampToValueAtTime(current.level * MUSIC_DUCK, t + 0.3)
  },
}

export function setSoundSpeed(value: number) {
  speed = value
}

/**
 * Joue le fichier du son `name` (une variante tirée au hasard pour les dés), s'il est chargé
 * (sinon `false` : l'appelant joue le son synthétisé). `ms` coupe le son plus tôt, avec un fondu : le dé qui roule s'arrête quand il se
 * pose. Au-delà de ×1, un son du combat est écourté au prorata de la vitesse.
 */
function play(name: SoundName, opts: { at?: number; ms?: number } = {}) {
  const bufs = samples[name]
  if (!bufs?.length) return false
  const buf = bufs[Math.floor(Math.random() * bufs.length)]
  const { ctx: c, out, now } = audio()
  const t = now + (opts.at ?? 0)
  let dur = buf.duration
  if (opts.ms !== undefined) dur = Math.min(dur, opts.ms / 1000)
  if (speed > 1 && !UNTIMED.has(name)) dur = Math.min(dur, Math.max(0.08, buf.duration / speed))
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  const level = MIX[name]
  g.gain.setValueAtTime(level, t)
  if (dur < buf.duration) {
    const fade = Math.min(0.06, dur * 0.3)
    g.gain.setValueAtTime(level, t + dur - fade)
    g.gain.linearRampToValueAtTime(0.0001, t + dur)
  }
  src.connect(g).connect(out)
  src.start(t)
  src.stop(t + dur + 0.02)
  return true
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

/*
 * Un appel = une signification (`docs/SONS.md` § 3). Chaque son essaie son fichier, sinon joue sa
 * version synthétisée. Le Coup critique est le seul son composé : Coup et Grondement ensemble.
 */
export const sfx = {
  /** Clic d'un bouton. */
  click() {
    if (play('click')) return
    tone({ freq: 660, to: 990, dur: 0.08, type: 'triangle', gain: 0.15 })
  },

  /** Dé lancé : il roule pendant `ms` millisecondes. Un seul, même quand plusieurs dés roulent. */
  diceRoll(ms: number) {
    if (play('dice-roll', { ms })) return
    for (let t = 0; t < ms / 1000; t += 0.055 + Math.random() * 0.04) {
      noise({ at: t, dur: 0.03, filter: 'highpass', freq: 2200 + Math.random() * 2000, gain: 0.22 })
      tone({ at: t, freq: 900 + Math.random() * 700, dur: 0.025, type: 'triangle', gain: 0.05 })
    }
  },

  /** Dé posé : le résultat est là. Aucune face n'a de son propre. */
  diceLand() {
    if (play('dice-land')) return
    tone({ freq: 190, to: 90, dur: 0.12, gain: 0.45 })
    noise({ dur: 0.07, freq: 900, gain: 0.25 })
  },

  /** Pièce lancée : elle tournoie pendant `ms` millisecondes, en retrait. */
  coinToss(ms: number) {
    if (play('coin-toss', { ms })) return
    for (let t = 0.05; t < ms / 1000; t += 0.09) tone({ at: t, freq: 1800 + (t * 900) % 600, dur: 0.04, type: 'sine', gain: 0.03 })
  },

  /** Pièce retombe : tintement net, le même sur pile et sur face. */
  coinLand() {
    if (play('coin-land')) return
    ;[2637, 3951].forEach((f, i) => tone({ at: i * 0.015, freq: f, dur: 0.45, type: 'triangle', gain: 0.16 }))
  },

  /** Pile réussie : « ding » clair et net, juste après le résultat, pour qu'on voie que c'est gagné. */
  coinWin() {
    if (play('coin-win')) return
    ;[1318.5, 2637, 3640].forEach((f, i) => tone({ freq: f, dur: 0.8 - i * 0.2, type: 'sine', gain: 0.18 / (i + 1) }))
  },

  /** Coup : des dégâts portés par un coup, quelle qu'en soit la source. */
  hit() {
    if (play('hit')) return
    tone({ freq: 160, to: 38, dur: 0.3, gain: 0.7 })
    noise({ dur: 0.14, freq: 2600, gain: 0.6 })
  },

  /** Coup critique, son composé : le Coup et le Grondement ensemble. */
  crit() {
    sfx.hit()
    if (play('crit-rumble')) return
    tone({ freq: 110, to: 26, dur: 0.9, gain: 0.85 })
    noise({ dur: 0.18, freq: 6000, to: 800, gain: 0.5 })
    noise({ at: 0.05, dur: 0.7, filter: 'bandpass', freq: 900, to: 120, q: 0.8, gain: 0.35 })
  },

  /** Esquive : le coup fend l'air dans le vide. */
  dodge() {
    if (play('dodge')) return
    noise({ dur: 0.18, filter: 'bandpass', freq: 3500, to: 1200, q: 3, gain: 0.3 })
  },

  /** Aura gagnée : souffle qui enfle et accord lumineux. */
  auraGain() {
    if (play('aura-gain')) return
    noise({ dur: 1.1, filter: 'bandpass', freq: 300, to: 1800, q: 0.9, gain: 0.22 })
    ;[523, 659, 784, 1047, 1319].forEach((f, i) => tone({ at: 0.15 + i * 0.07, freq: f, dur: 0.9, type: 'sine', gain: 0.1 }))
  },

  /** Aura perdue : le même souffle, qui retombe et s'éteint. */
  auraLoss() {
    if (play('aura-loss')) return
    noise({ dur: 0.9, filter: 'bandpass', freq: 1800, to: 300, q: 0.9, gain: 0.2 })
    ;[1319, 1047, 784, 659, 523].forEach((f, i) => tone({ at: i * 0.07, freq: f, dur: 0.6, type: 'sine', gain: 0.08 }))
  },

  /** Bonus gagné : petit éclat ascendant. */
  buff() {
    if (play('buff')) return
    ;[659, 880, 1175].forEach((f, i) => tone({ at: i * 0.06, freq: f, dur: 0.4, type: 'sine', gain: 0.11 }))
  },

  /** Malus reçu : accord sombre qui descend. */
  debuff() {
    if (play('debuff')) return
    ;[311, 330].forEach((f) => tone({ freq: f, to: f * 0.6, dur: 0.6, type: 'sawtooth', gain: 0.06 }))
    noise({ dur: 0.45, filter: 'bandpass', freq: 600, to: 200, q: 2, gain: 0.16 })
  },

  /** Dissipation : un bonus ou un malus retiré, souffle bref qui balaie. */
  dispel() {
    if (play('dispel')) return
    noise({ dur: 0.45, filter: 'bandpass', freq: 3000, to: 600, q: 1.5, gain: 0.25 })
  },

  /** Tour perdu : grondement sourd. */
  stun() {
    if (play('stun')) return
    tone({ freq: 70, to: 45, dur: 0.8, type: 'sawtooth', gain: 0.12 })
    noise({ dur: 0.7, filter: 'bandpass', freq: 250, q: 3, gain: 0.25 })
  },

  /** Ronge : un statut inflige ses dégâts (poison, pourriture…). Liquide et discret, sans choc. */
  rot() {
    if (play('rot')) return
    for (let i = 0; i < 5; i++) tone({ at: i * 0.06, freq: 260 + (i % 3) * 60, to: 170, dur: 0.06, type: 'sine', gain: 0.05 })
    noise({ dur: 0.4, filter: 'highpass', freq: 5000, gain: 0.04 })
  },

  /** Soin : des PV regagnés, arpège doux et clair. */
  heal() {
    if (play('heal')) return
    ;[784, 988, 1175, 1568].forEach((f, i) => tone({ at: i * 0.05, freq: f, dur: 0.45, type: 'sine', gain: 0.09 }))
    noise({ dur: 0.4, filter: 'highpass', freq: 7000, gain: 0.04 })
  },

  /** Transformation (druide) : bruissement de feuilles, le même dans les deux sens. */
  shift() {
    if (play('shift')) return
    noise({ dur: 0.9, filter: 'bandpass', freq: 900, to: 3200, q: 0.7, gain: 0.3 })
    for (let i = 0; i < 6; i++) noise({ at: 0.05 + i * 0.08, dur: 0.06, filter: 'highpass', freq: 3500 + i * 300, gain: 0.08 })
  },

  /** Le perdant s'effondre. */
  ko() {
    music.duck()
    if (play('ko')) return
    tone({ freq: 95, to: 28, dur: 1.3, gain: 0.9 })
    noise({ dur: 0.9, freq: 500, to: 80, gain: 0.5 })
  },

  /** Victoire : fanfare. La version synthétisée évite les ondes carrées, trop « 8 bits ». */
  victory() {
    if (play('victory')) return
    const notes: [number, number, number][] = [
      [523, 0, 0.18],
      [659, 0.16, 0.18],
      [784, 0.32, 0.18],
      [1047, 0.5, 0.9],
    ]
    for (const [f, at, dur] of notes) {
      tone({ at, freq: f, dur, type: 'sawtooth', gain: 0.035 })
      tone({ at, freq: f, dur, type: 'triangle', gain: 0.1 })
      tone({ at, freq: f / 2, dur, type: 'sine', gain: 0.1 })
    }
  },

  /** Choc du face-à-face, à l'écran de présentation du duel. */
  clash() {
    if (play('clash')) return
    tone({ freq: 110, to: 30, dur: 0.9, gain: 0.85 })
    noise({ dur: 0.5, freq: 3000, to: 300, gain: 0.4 })
  },
}
