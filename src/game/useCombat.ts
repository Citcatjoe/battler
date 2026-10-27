import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import { dieAt, simulateCombat, type CombatResult, type Pair, type Side } from './combat'
import type { Character } from './character'
import type { LogEntry } from './narration'
import { setSoundSpeed, sfx } from './sound'
import {
  IDLE_DICE,
  stage,
  type Blow,
  type Cue,
  type DiceState,
  type EffectFx,
  type Float,
  type Moment,
  type RelicPulse,
  type SceneFx,
  type SkillPulse,
  type SkillSignal,
  type Strike,
} from './staging'
import type { Status } from './statuses'
import { FLOAT_LIFE } from './timing'

/*
 * Le lecteur (docs/MOTEUR_V2.md § 5) : il joue les moments de `stage` avec une seule horloge (vitesse, pause, arrêt)
 * et applique chaque cue à son instant. Il ne contient ni règle ni décision de mise en scène : l'écran est l'état
 * obtenu en appliquant les cues dans l'ordre (`applyCue`, fonction pure), et les sons sont joués tels quels.
 */

/** Déclenchements de chaque relique depuis le début du combat, par camp (charges restantes à l'écran). */
export type RelicUses = Pair<Readonly<Record<string, number>>>

/** Un texte flottant à l'écran, jusqu'à l'instant `until` de l'horloge du combat (ms à ×1). */
export type LiveFloat = Float & { until: number }

/** Ce que l'écran du combat montre à un instant : le résultat des cues appliquées jusque-là. */
export interface View {
  hp: Pair<number>
  statuses: Pair<Status[]>
  /** Forme de chaque combattant (druide) : index dans `Character.forms` */
  forms: Pair<number>
  /** Perte de contrôle de chaque combattant (cue `daze`, M51) : il vacille */
  dazed: Pair<boolean>
  dice: DiceState
  strike: Strike | null
  blow: Blow | null
  aura: EffectFx | null
  floats: Pair<LiveFloat[]>
  scene: SceneFx | null
  log: LogEntry[]
  turn: number
  /** Le combattant dont c'est le tour (null avant l'initiative et après le K.O.) */
  active: Side | null
  winner: Side | null
  pulse: SkillPulse | null
  signal: SkillSignal | null
  relicPulse: RelicPulse | null
  relicUses: RelicUses
  /** Prochaine clé donnée par le lecteur (labels, journal, éclats) */
  seq: number
}

export function initialView(fighters: Pair<Character>): View {
  return {
    hp: [fighters[0].maxHp, fighters[1].maxHp],
    // Statuts de forme (druide, 0.73.0) : présents dès l'entrée en scène
    statuses: [0, 1].map((side) => (fighters[side].forms?.[0].statuses ?? []).map((id) => ({ id, stacks: 1 }))) as Pair<Status[]>,
    forms: [0, 0],
    dazed: [false, false],
    dice: IDLE_DICE,
    strike: null,
    blow: null,
    aura: null,
    floats: [[], []],
    scene: null,
    log: [],
    turn: 0,
    active: null,
    winner: null,
    pulse: null,
    signal: null,
    relicPulse: null,
    relicUses: [{}, {}],
    seq: 0,
  }
}

const withSide = <T>(pair: Pair<T>, side: Side, value: T): Pair<T> => (side === 0 ? [value, pair[1]] : [pair[0], value])

/** L'écran après une cue (les sons ne changent pas l'écran : le lecteur les joue). `now` : instant de la cue. */
export function applyCue(view: View, cue: Cue, now: number): View {
  const seq = view.seq + 1
  switch (cue.channel) {
    case 'dice':
      return { ...view, dice: { ...cue.dice, specials: view.dice.specials } }
    case 'special':
      return { ...view, seq, dice: { ...view.dice, specials: [...(view.dice.specials ?? []), { key: view.seq, ...cue.special }] } }
    case 'specialsClear': {
      // Tous les labels, ou seulement ceux qu'elle nomme (lus, quand un label plus jeune reste à lire : M9)
      const { labels } = cue
      const kept = labels ? view.dice.specials?.filter((b) => !labels.includes(b.label)) : undefined
      return { ...view, dice: { ...view.dice, specials: kept?.length ? kept : undefined } }
    }
    case 'strike':
      return { ...view, strike: cue.strike }
    case 'blow':
      return { ...view, blow: cue.blow }
    case 'float':
      return { ...view, floats: withSide(view.floats, cue.side, [...view.floats[cue.side], { ...cue.float, until: now + FLOAT_LIFE }]) }
    case 'aura':
      return { ...view, aura: cue.fx }
    case 'hp':
      return { ...view, hp: cue.hp }
    case 'statuses':
      return { ...view, statuses: cue.statuses }
    case 'log':
      return { ...view, seq, log: [...view.log, { ...cue.entry, id: view.seq }] }
    case 'skillPulse':
      return { ...view, seq, pulse: { side: cue.side, face: cue.face, key: view.seq } }
    case 'relicPulse':
      return { ...view, seq, relicPulse: { side: cue.side, relics: cue.relics, key: view.seq } }
    case 'relicUse':
      return { ...view, relicUses: withSide(view.relicUses, cue.side, { ...view.relicUses[cue.side], [cue.relic]: cue.uses }) }
    case 'signal':
      return { ...view, seq, signal: { ...cue.signal, key: view.seq } }
    case 'scene':
      return { ...view, seq, scene: { ...cue.scene, key: view.seq } }
    case 'form':
      return { ...view, forms: withSide(view.forms, cue.side, cue.form) }
    case 'daze':
      return { ...view, dazed: withSide(view.dazed, cue.side, cue.on) }
    case 'turn':
      return { ...view, turn: cue.turn, active: cue.active }
    case 'winner':
      return { ...view, winner: cue.side }
    case 'sound':
      return view
    default:
      return cue satisfies never
  }
}

export interface CheatState {
  /** Faux sans graine : le combat ne peut pas être résolu à nouveau */
  available: boolean
  /** Rang du prochain dé (voir `SimulateOptions.forcedRolls`) */
  rank: number
  /** Ce dé : lanceur, faces (2 pour la pièce) ; absent si le combat n'en lance plus */
  next?: { side: Side; faces: number; coin: boolean }
  /** Valeur imposée à ce dé, s'il y en a une */
  forced?: number
  /** Nombre de dés imposés depuis le début du combat */
  count: number
  /** Combat test : la lecture est arrêtée sur ce dé, en attendant le choix du joueur */
  waiting: boolean
}

/** Les textes flottants finissent leur vie à l'horloge du combat (la pause les fige). */
function prune(view: View, clock: number): View {
  if (!view.floats.some((list) => list.some((f) => f.until <= clock))) return view
  return { ...view, floats: view.floats.map((list) => list.filter((f) => f.until > clock)) as Pair<LiveFloat[]> }
}

/* ---------- Magnétoscope (outil de développement, docs/MOTEUR_V2.md § 8) ---------- */

/** Ce que montre le magnétoscope : les moments et la position de lecture. */
export interface VcrSnapshot {
  moments: readonly Moment[]
  /** Moment en cours */
  mi: number
  /** Instant dans ce moment (ms à ×1) */
  at: number
  /** Horloge du combat (ms à ×1) */
  clock: number
}

/** Commandes du magnétoscope : chacune met le combat en pause, puis place la lecture (sans jouer de son). */
export interface VcrControls {
  /** Place la lecture à l'instant `at` du moment `mi` : les cues de cet instant sont appliquées */
  seek: (mi: number, at: number) => void
  /** Jusqu'au prochain instant de cues (au besoin, le début du moment suivant) */
  stepCue: () => void
  nextMoment: () => void
  /** Au début du moment ; s'il y est déjà, au début du précédent */
  prevMoment: () => void
  restartMoment: () => void
}

const IDLE_VCR: VcrControls = { seek: () => {}, stepCue: () => {}, nextMoment: () => {}, prevMoment: () => {}, restartMoment: () => {} }
/** Cadence de publication de la position pendant la lecture (ms) */
const VCR_RATE = 100

/**
 * Les animations de l'arène que le magnétoscope recale : celles du combat, figées par la pause. Les boucles infinies
 * (ambiance), les transitions et le panneau du magnétoscope restent tels quels.
 */
const timedIn = (root: HTMLElement) =>
  root.getAnimations({ subtree: true }).filter((a) => {
    const effect = a.effect as KeyframeEffect | null
    return !(a instanceof CSSTransition) && effect?.getTiming().iterations !== Infinity && !effect?.target?.closest('.vcr')
  })

/** Avance de `ms` (temps réel) les animations du combat. */
function advance(root: HTMLElement, ms: number) {
  if (ms <= 0) return
  for (const a of timedIn(root)) a.currentTime = Number(a.currentTime ?? 0) + ms
}

/**
 * Changer de vitesse change la durée des animations CSS (`--speed`) : leur position (ms) suit, pour garder leur
 * progression. Les animations de script (secousse) ont leur durée fixée au départ : elles ne bougent pas.
 */
function rescale(root: HTMLElement, ratio: number) {
  for (const a of timedIn(root)) if (a instanceof CSSAnimation) a.currentTime = Number(a.currentTime ?? 0) * ratio
}

export interface CombatOptions {
  /** Combat test (voir `useCombat`) */
  test?: boolean
  /** Magnétoscope ouvert (développement, hors combat test) : la racine de l'arène, dont il recale les animations */
  vcr?: RefObject<HTMLElement | null>
}

/**
 * Met en scène un combat déjà résolu par `simulateCombat` : mêmes jets, même issue, seul le rythme (vitesse, pause)
 * dépend de l'affichage.
 *
 * `test` (combat test) : pas d'initiative animée, et la lecture s'arrête avant chaque dé jusqu'à ce que le joueur le
 * choisisse (`forceNextRoll`, null pour le hasard). C'est le mécanisme du mode triche : chaque choix fait résoudre le
 * combat à nouveau par le moteur, avec la même graine, puis le met en scène à nouveau ; la lecture reprend au même
 * instant du même moment (tout ce qui précède le dé imposé est identique).
 *
 * `vcr` (magnétoscope) : la position de lecture est publiée (`vcr.snapshot`) et les commandes `vcr` la déplacent.
 * Sans effet en combat test.
 */
export function useCombat(script: CombatResult, onEnd: (result: CombatResult) => void, { test = false, vcr }: CombatOptions = {}) {
  const { fighters } = script
  const [view, setView] = useState(() => initialView(fighters))
  const [speed, setSpeed] = useState(1)
  const [paused, setPaused] = useState(false)

  const speedRef = useRef(speed)
  const pausedRef = useRef(paused)
  speedRef.current = speed
  pausedRef.current = paused

  // Les sons du combat s'écourtent avec la vitesse ; hors combat, ils jouent en entier
  useEffect(() => {
    setSoundSpeed(speed)
    return () => setSoundSpeed(1)
  }, [speed])

  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const vcrRef = useRef(vcr)
  vcrRef.current = test ? undefined : vcr
  const [snapshot, setSnapshot] = useState<VcrSnapshot | null>(null)
  /** Branchées par la lecture en cours */
  const controls = useRef<VcrControls>(IDLE_VCR)
  const [vcrControls] = useState<VcrControls>(() => ({
    seek: (mi, at) => controls.current.seek(mi, at),
    stepCue: () => controls.current.stepCue(),
    nextMoment: () => controls.current.nextMoment(),
    prevMoment: () => controls.current.prevMoment(),
    restartMoment: () => controls.current.restartMoment(),
  }))
  // Magnétoscope : les animations en cours gardent leur progression quand la vitesse change (ralenti en pause)
  const laidSpeed = useRef(speed)
  useLayoutEffect(() => {
    const root = vcrRef.current?.current
    if (root && speed !== laidSpeed.current) rescale(root, laidSpeed.current / speed)
    laidSpeed.current = speed
  }, [speed])

  const [cheat, setCheat] = useState<CheatState>(() => ({
    available: script.seed !== undefined,
    rank: 0,
    next: dieAt(script, 0),
    count: 0,
    waiting: false,
  }))
  /** Le combat tel qu'il se résout maintenant (différent de `script` dès qu'un dé est imposé) */
  const [resolved, setResolved] = useState(script)
  /** Branché par la lecture en cours : impose (ou retire, avec null) la valeur du prochain dé */
  const forceRef = useRef<(value: number | null) => void>(() => {})

  useEffect(() => {
    let aborted = false
    let current = script
    let moments: Moment[] = stage(current, { test })
    // Position de lecture : moment, prochaine cue, prochain point d'attente, instant dans le moment (ms à ×1)
    let mi = 0
    let ci = 0
    let ri = 0
    let at = 0
    /** Horloge du combat (ms à ×1) : la vie des textes flottants */
    let clock = 0
    let shown = initialView(fighters)
    setView(shown)
    setResolved(script)

    /** Une cue, à l'horloge `start + cue.at` : un changement d'écran, ou un son (joué seulement si `audible`). */
    const run = (view: View, cue: Cue, start: number, audible: boolean): View => {
      if (cue.channel !== 'sound') return applyCue(view, cue, start + cue.at)
      if (audible) (sfx[cue.cue] as (ms?: number) => void)(cue.arg === undefined ? undefined : cue.arg / speedRef.current)
      return view
    }

    /*
     * Mode triche. `committed` : dés déjà lancés à l'écran, intouchables. Imposer le suivant résout le combat à
     * nouveau (`forcedRolls`) ; tout ce qui précède ce dé est identique, donc la lecture continue au même instant.
     */
    const forced: Record<number, number> = {}
    let committed = 0
    /** Combat test : le dé de rang `committed` attend le choix du joueur */
    let waiting = false
    const publishCheat = () =>
      setCheat({
        available: script.seed !== undefined,
        rank: committed,
        next: dieAt(current, committed),
        forced: forced[committed],
        count: Object.keys(forced).length,
        waiting,
      })
    publishCheat()

    /** Magnétoscope : la position, à chaque changement de moment ou de mise en scène, et au plus tous les `VCR_RATE`. */
    let published: { moments: Moment[]; mi: number; at: number; time: number } | null = null
    const publish = (now: number, force: boolean) => {
      if (!vcrRef.current || mi >= moments.length) return
      const same = published?.moments === moments && published.mi === mi
      if (!force && same && (published!.at === at || now - published!.time < VCR_RATE)) return
      published = { moments, mi, at, time: now }
      setSnapshot({ moments, mi, at, clock })
    }

    /** La nouvelle mise en scène remplace l'ancienne : même moment (même étape racine), même instant. */
    const restage = () => {
      const was = moments[mi]
      const next = stage(current, { test })
      let index = was.beats.length === 0 ? mi : next.findIndex((m) => m.beats[0] === was.beats[0])
      if (index < 0) {
        index = next.findIndex((m) => m.beats.length === 0 || m.beats[0] > was.beats[0])
        at = 0
      }
      // En attente sur un point de dés : rien n'est joué à son instant ; sinon, tout ce qui est à l'instant `at` l'est
      const pending = (x: number) => (waiting ? x >= at : x > at)
      moments = next
      mi = index
      const cues = moments[mi].cues.findIndex((c) => pending(c.at))
      ci = cues < 0 ? moments[mi].cues.length : cues
      const rolls = moments[mi].rolls.findIndex((r) => pending(r.at))
      ri = rolls < 0 ? moments[mi].rolls.length : rolls
    }

    forceRef.current = (value) => {
      // Plus aucun dé à imposer une fois la fin du combat (dernier moment, sans étape) à l'écran
      const over = mi >= moments.length || (mi > 0 && moments[mi].beats.length === 0)
      if (over || script.seed === undefined || dieAt(current, committed) === undefined) return
      if (value === null) delete forced[committed]
      else forced[committed] = value
      current = simulateCombat(fighters, { seed: script.seed, forcedRolls: forced })
      setResolved(current)
      restage()
      // Combat test : le choix est fait, ce dé part ; la lecture reprend (ou attend le dé suivant du même jet)
      if (waiting) {
        waiting = false
        committed++
      }
      publishCheat()
    }

    /**
     * Magnétoscope : place la lecture à l'instant `toAt` du moment `toMi`, en pause. L'écran est le résultat de toutes
     * les cues jusque-là (sans les sons). Ce qu'une cue monte à l'écran démarre ses animations CSS à 0 : on rend donc
     * le début du moment précédent (après un écran vidé de l'éphémère, pour que tout reparte de zéro), puis chaque
     * instant de cues jusqu'à la cible, en avançant entre deux les animations de l'arène du temps écoulé.
     */
    const seek = (toMi: number, toAt: number) => {
      if (test || mi >= moments.length) return
      if (!pausedRef.current) {
        pausedRef.current = true
        flushSync(() => setPaused(true))
      }
      mi = Math.max(0, Math.min(moments.length - 1, toMi))
      at = Math.max(0, Math.min(moments[mi].duration, toAt))
      const from = Math.max(0, mi - 1)
      let next = initialView(fighters)
      let start = 0
      for (const m of moments.slice(0, from)) {
        for (const c of m.cues) next = run(next, c, start, false)
        start += m.duration
      }
      // Les éclats d'avant ce point (signal, sceau, relique, scène) ont fini de jouer : ils ne repartent pas
      next = { ...prune(next, start), scene: null, pulse: null, signal: null, relicPulse: null }

      const root = vcrRef.current?.current ?? null
      let rendered = start
      /** Rend `view` à l'horloge `now`, après avoir avancé les animations à l'écran du temps écoulé depuis le rendu précédent */
      const render = (view: View, now: number) => {
        if (!root) return
        advance(root, (now - rendered) / speedRef.current)
        rendered = now
        flushSync(() => setView(view))
      }
      if (root) {
        // Les animations de script (secousse) s'arrêtent ; l'éphémère quitte l'écran, ce qui coupe ses animations CSS
        for (const a of root.getAnimations({ subtree: true })) if (!(a instanceof CSSAnimation || a instanceof CSSTransition)) a.cancel()
        const vacant = { ...next, dice: IDLE_DICE, strike: null, blow: null, aura: null, floats: [[], []] as Pair<LiveFloat[]> }
        flushSync(() => setView(vacant))
        root.getAnimations({ subtree: true }) // recalcul des styles : ce qui vient de partir est bien parti
      }
      render(next, start)
      for (let k = from; k <= mi; k++) {
        const m = moments[k]
        const end = k < mi ? m.duration : at
        let i = 0
        while (i < m.cues.length && m.cues[i].at <= end) {
          const instant = m.cues[i].at
          for (; i < m.cues.length && m.cues[i].at === instant; i++) next = run(next, m.cues[i], start, false)
          next = prune(next, start + instant)
          render(next, start + instant)
        }
        if (k < mi) start += m.duration
      }
      clock = start + at
      next = prune(next, clock)
      render(next, clock)
      if (!root) setView(next)
      shown = next

      const cues = moments[mi].cues.findIndex((c) => c.at > at)
      ci = cues < 0 ? moments[mi].cues.length : cues
      const rolls = moments[mi].rolls.findIndex((r) => r.at > at)
      ri = rolls < 0 ? moments[mi].rolls.length : rolls
      // Mode triche : les dés passés à l'écran sont lancés (on ne revient jamais sur un dé déjà lancé)
      const thrown = Math.max(committed, ...moments.slice(0, mi).flatMap((m) => m.rolls.map((r) => r.upTo)), ...moments[mi].rolls.slice(0, ri).map((r) => r.upTo))
      if (thrown > committed) {
        committed = thrown
        publishCheat()
      }
      publish(performance.now(), true)
    }
    controls.current = {
      seek,
      stepCue: () => {
        const next = moments[mi]?.cues.find((c) => c.at > at)
        if (next) seek(mi, next.at)
        else controls.current.nextMoment()
      },
      nextMoment: () => (mi + 1 < moments.length ? seek(mi + 1, 0) : seek(mi, Infinity)),
      prevMoment: () => seek(at > 0 ? mi : mi - 1, 0),
      restartMoment: () => seek(mi, 0),
    }

    const startedAt = performance.now()
    let last = startedAt
    const frame = (now: number) => {
      if (aborted) return
      const step = pausedRef.current || waiting ? 0 : (now - last) * speedRef.current
      last = now
      at += step
      clock += step
      let next = shown
      while (mi < moments.length) {
        const m = moments[mi]
        const mark = m.rolls[ri]
        const cue = m.cues[ci]
        if (mark && mark.at <= at && (!cue || mark.at <= cue.at)) {
          // Combat test : chaque dé de ce jet attend le choix du joueur avant d'être lancé
          if (test && committed < mark.upTo && dieAt(current, committed) !== undefined) {
            clock -= at - mark.at
            at = mark.at
            if (!waiting) {
              waiting = true
              publishCheat()
            }
            break
          }
          if (mark.upTo > committed) {
            committed = mark.upTo
            publishCheat()
          }
          ri++
          continue
        }
        if (cue && cue.at <= at) {
          ci++
          next = run(next, cue, clock - at, true)
          continue
        }
        if (at < m.duration) break
        at -= m.duration
        mi++
        ci = 0
        ri = 0
      }
      next = prune(next, clock)
      if (next !== shown) {
        shown = next
        setView(shown)
      }
      publish(now, false)
      if (mi < moments.length) requestAnimationFrame(frame)
      else {
        controls.current = IDLE_VCR
        onEndRef.current({ ...current, mode: 'played', durationMs: performance.now() - startedAt })
      }
    }
    requestAnimationFrame(frame)
    return () => {
      aborted = true
      forceRef.current = () => {}
      controls.current = IDLE_VCR
    }
  }, [script, fighters, test])

  /** Mode triche : impose `value` au prochain dé (null : le laisse au hasard) */
  const forceNextRoll = (value: number | null) => forceRef.current(value)

  return { ...view, speed, setSpeed, paused, setPaused, cheat, forceNextRoll, resolved, vcr: { ...vcrControls, snapshot } }
}
