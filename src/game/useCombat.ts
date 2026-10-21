import { useEffect, useRef, useState } from 'react'
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
    case 'specialsClear':
      return { ...view, dice: { ...view.dice, specials: undefined } }
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

/**
 * Met en scène un combat déjà résolu par `simulateCombat` : mêmes jets, même issue, seul le rythme (vitesse, pause)
 * dépend de l'affichage.
 *
 * `test` (combat test) : pas d'initiative animée, et la lecture s'arrête avant chaque dé jusqu'à ce que le joueur le
 * choisisse (`forceNextRoll`, null pour le hasard). C'est le mécanisme du mode triche : chaque choix fait résoudre le
 * combat à nouveau par le moteur, avec la même graine, puis le met en scène à nouveau ; la lecture reprend au même
 * instant du même moment (tout ce qui précède le dé imposé est identique).
 */
export function useCombat(script: CombatResult, onEnd: (result: CombatResult) => void, { test = false } = {}) {
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

    let open = true
    forceRef.current = (value) => {
      if (!open || script.seed === undefined || dieAt(current, committed) === undefined) return
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
          if (cue.channel === 'sound') {
            const play = sfx[cue.cue] as (ms?: number) => void
            play(cue.arg === undefined ? undefined : cue.arg / speedRef.current)
          } else next = applyCue(next, cue, clock - (at - cue.at))
          continue
        }
        if (at < m.duration) break
        at -= m.duration
        mi++
        ci = 0
        ri = 0
        // La fin du combat : plus aucun dé à imposer
        if (mi < moments.length && moments[mi].beats.length === 0) {
          open = false
          forceRef.current = () => {}
        }
      }
      // Les textes flottants finissent leur vie, à l'horloge du combat (la pause les fige)
      if (next.floats.some((list) => list.some((f) => f.until <= clock)))
        next = { ...next, floats: next.floats.map((list) => list.filter((f) => f.until > clock)) as Pair<LiveFloat[]> }
      if (next !== shown) {
        shown = next
        setView(shown)
      }
      if (mi < moments.length) requestAnimationFrame(frame)
      else onEndRef.current({ ...current, mode: 'played', durationMs: performance.now() - startedAt })
    }
    requestAnimationFrame(frame)
    return () => {
      aborted = true
      forceRef.current = () => {}
    }
  }, [script, fighters, test])

  /** Mode triche : impose `value` au prochain dé (null : le laisse au hasard) */
  const forceNextRoll = (value: number | null) => forceRef.current(value)

  return { ...view, speed, setSpeed, paused, setPaused, cheat, forceNextRoll, resolved }
}
