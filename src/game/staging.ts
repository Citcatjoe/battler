/*
 * La mise en scène d'un combat (docs/MOTEUR_V2.md § 4) : `stage(result)` transforme la chronologie du moteur en
 * moments, faits de cues datées. Fonction pure : ni React, ni horloge, ni son joué. Le lecteur (`useCombat.ts`) ne
 * fait qu'appliquer ces cues à leur instant, avec une seule horloge (vitesse, pause, arrêt).
 *
 * Un moment couvre une étape racine et les étapes qui en découlent (par `cause`, jamais par voisinage) : un coup, le
 * poison qu'il pose, la plaie qui coule, la Riposte et les Épines forment un seul moment, chacun à son instant. Les
 * instants viennent de `timing.ts`. Les PV se calculent de proche en proche à partir des effets (chaque partie d'une
 * série de coups), et retombent sur l'état du moteur (vérifié en développement). Aucune règle n'est recalculée ici.
 */
import {
  beatEffects,
  diceOf,
  INITIATIVE_DIE,
  other,
  type AppliedEffect,
  type Attack,
  type Beat,
  type CombatResult,
  type Pair,
  type Side,
} from './combat'
import type { Character } from './character'
import { cueOf } from './cues'
import { doubleFace, type Trigger } from './events'
import {
  atCap,
  attackLog,
  coinLog,
  effectBadge,
  eventLog,
  flurryLog,
  pairLog,
  relicLog,
  shiftLog,
  skipLog,
  statusDurationLog,
  statusExpireLog,
  statusReactionLog,
  statusTickLog,
  type Badge,
  type LogEntry,
} from './narration'
import { SCENE_EVENTS, type SceneEventId } from './scenes'
import { signalTargets, STATES, STATUS_PLACE } from './states'
import { attackSpecials, reactionSpecial, relicSpecial, SPECIAL_SIGNS, type SpecialBadge, type SpecialSign, type SpecialSpec } from './specials'
import { STATUSES, type Polarity, type Status, type StatusId } from './statuses'
import type { sfx } from './sound'
import * as T from './timing'

/* ---------- Ce que l'écran affiche ---------- */

export interface DiceState {
  values: number[]
  /** Nombre de faces, pour colorer le jet maximal */
  faces: number
  rolling: boolean
  owner: Side | null
  label: string
  crit: boolean
  /** Critique imposé par un statut */
  critForced: boolean
  critMultiplier: number
  /** Rafale (Furie des vents) : plusieurs dés lancés ensemble, un coup par dé */
  volley?: boolean
  /** Pendant une rafale, le dé du coup en cours */
  active?: number
  /** Faces et couleur de chaque dé quand ils diffèrent (le d6 vert de Coup de chance) */
  dieFaces?: number[]
  dieColors?: (string | undefined)[]
  /** Pile ou face : une pièce remplace le dé ; `heads` absent tant qu'elle tournoie */
  coin?: { heads?: boolean }
  /** Un dé affiché a été imposé par l'observateur (mode triche) : marqué une fois retombé */
  forced?: boolean
  /**
   * Zone de surcharge : ses labels, empilés en colonne dans l'ordre où ils s'appliquent (critique, Riposte…), voir
   * specials.ts. Tenus à part par la mise en scène (cues `special`, `specialsClear`) et joints par le lecteur.
   */
  specials?: SpecialBadge[]
}

export const IDLE_DICE: DiceState = {
  values: [],
  faces: 0,
  rolling: false,
  owner: null,
  label: '',
  crit: false,
  critForced: false,
  critMultiplier: 1,
}

/** Un coup en cours : `key` relance les animations CSS. */
export interface Strike extends Attack {
  key: number
  landed: boolean
  /** Coup d'une rafale : élan raccourci */
  fast?: boolean
}

/**
 * Coup de compétence : des dégâts directs portés par une compétence ou un statut (Rétribution, pièce sur pile,
 * Épines, Riposte) joués comme un vrai coup, élan, impact et gros chiffre compris. Les montants viennent de la
 * chronologie (`parts` pour une relâche de jauges).
 */
export interface Blow {
  key: number
  from: Side
  to: Side
  damage: number
  /** Coup lourd (dernier coup d'une relâche, pièce) : chiffre doré, secousse */
  heavy: boolean
  /** Élan du lanceur vers sa cible ; sans élan pour une réaction (Épines) */
  lunge: boolean
  landed: boolean
}

/**
 * Aura d'une compétence ou d'un statut qui agit, sur son lanceur, le temps de l'effet. Une relique n'en a pas : elle
 * s'annonce sur son sceau (`relicPulse`), docs/RELIQUES.md § 1.
 */
export interface EffectFx {
  key: number
  source: Side
}

/**
 * Un texte flottant, à côté de son combattant. Chacun a sa clé et sa durée de vie (`timing.FLOAT_LIFE`) ; aucun n'en
 * écrase un autre. `title` : le nom d'une compétence (violet), avec le statut qu'elle pose en sous-titre ; `badge` :
 * un effet sur sa cible (« −3 », « Poison », « Tour perdu »), au rang `row` de sa colonne, au-dessus du chiffre des
 * dégâts s'il monte avec l'impact d'un coup (`lift`) ; `hit` : ESQUIVE, CRITIQUE et le chiffre d'un coup.
 */
export type Float =
  | { key: number; kind: 'title'; text: string; subtitle?: string }
  | { key: number; kind: 'badge'; badge: Badge; row: number; lift: boolean }
  | { key: number; kind: 'hit'; damage: number; crit: boolean; dodged: boolean }

/** Événement de scène en cours (`scenes.ts`) : `source` lance, `target` reçoit ; `key` relance l'animation. */
export interface SceneFx {
  key: number
  id: SceneEventId
  source: Side
  target: Side
}

/** Le dé de compétence de cette face pulse dans l'en-tête de son camp (SkillDice, SkillBar) ; `key` relance l'éclat. */
export interface SkillPulse {
  side: Side
  face: number
  key: number
}

/**
 * Signal d'activation (0.79.0) : une lueur part du sceau d'une compétence ou de l'anneau d'une aura (`from`, le
 * `data-signal` de SkillBar) et file vers la zone d'état de chaque combattant où son effet apparaît. L'effet ne
 * s'y montre qu'à son arrivée (`timing.SIGNAL`).
 */
export interface SkillSignal {
  key: number
  side: Side
  from: string
  to: Side[]
  polarity: Polarity
}

/** Relique qui agit : son sceau s'illumine dans l'en-tête de son camp (RelicSeals). */
export interface RelicPulse {
  side: Side
  relics: string[]
  key: number
}

/* ---------- Moments et cues ---------- */

export type SfxName = keyof typeof sfx

type DistributiveOmit<U, K extends PropertyKey> = U extends unknown ? Omit<U, K> : never

/** Ce qu'une cue change à l'écran, sans son instant. */
export type CueBody =
  /** Plateau de dés, état complet (sans ses labels de surcharge) */
  | { channel: 'dice'; dice: DiceState }
  | { channel: 'strike'; strike: Strike | null }
  | { channel: 'blow'; blow: Blow | null }
  /** Ajoute un texte flottant à côté de `side` */
  | { channel: 'float'; side: Side; float: Float }
  | { channel: 'aura'; fx: EffectFx | null }
  /** Ajoute un label sous le dé (la clé est donnée par le lecteur) */
  | { channel: 'special'; special: SpecialSpec }
  | { channel: 'specialsClear' }
  /** Un son, déjà dédoublonné (un seul par nom et par instant). `arg` : durée à ×1 (dé qui roule, pièce) */
  | { channel: 'sound'; cue: SfxName; arg?: number }
  | { channel: 'hp'; hp: Pair<number> }
  | { channel: 'statuses'; statuses: Pair<Status[]> }
  | { channel: 'log'; entry: Omit<LogEntry, 'id'> }
  | { channel: 'skillPulse'; side: Side; face: number }
  | { channel: 'relicPulse'; side: Side; relics: string[] }
  | { channel: 'relicUse'; side: Side; relic: string; uses: number }
  | { channel: 'signal'; signal: Omit<SkillSignal, 'key'> }
  | { channel: 'scene'; scene: Omit<SceneFx, 'key'> }
  | { channel: 'form'; side: Side; form: number }
  /** Numéro du tour et camp dont c'est le tour (null : avant l'initiative, après le K.O.) */
  | { channel: 'turn'; turn: number; active: Side | null }
  | { channel: 'winner'; side: Side }

export type Cue = { at: number } & CueBody

/**
 * Un point d'attente du mode combat test : avant les cues de l'instant `at`, les dés jusqu'au rang `upTo` (exclu)
 * doivent être choisis (`forcedRolls`). Hors combat test, le lecteur y note seulement les dés lancés à l'écran.
 */
export interface RollMark {
  at: number
  upTo: number
}

/** Une constante numérique de `timing.ts` (une durée nommée). */
export type TimingName = { [K in keyof typeof T]: (typeof T)[K] extends number ? K : never }[keyof typeof T]

/**
 * Une attente du moment, avec ce qui l'a produite : le nom d'une constante de `timing.ts`, ou un libellé pour une
 * durée calculée. Les attentes d'un moment se suivent sans trou et font sa durée (le magnétoscope les montre).
 */
export interface Span {
  at: number
  ms: number
  name: TimingName | string
}

export interface Moment {
  /** Étapes du moteur couvertes par ce moment, dans l'ordre (vide : ouverture, fin du combat) */
  beats: number[]
  turn: number
  owner: Side
  /** Cues datées depuis le début du moment, triées par `at` */
  cues: Cue[]
  /** Durée totale du moment (le suivant commence à `duration`) */
  duration: number
  rolls: RollMark[]
  /** Les attentes du moment, dans l'ordre : contiguës depuis 0, leur somme vaut `duration` */
  spans: Span[]
}

export interface StageOptions {
  /** Combat test : pas d'initiative animée */
  test?: boolean
}

/* ---------- Lectures de la chronologie ---------- */

/** Face des dés de compétence (en-tête) qui correspond à un déclencheur du dé. */
const NATURAL_FACE: Partial<Record<Trigger, number>> = { naturalOne: 1, naturalTwo: 2, naturalThree: 3 }
export const skillFaceOf = (trigger: Trigger) => NATURAL_FACE[trigger] ?? doubleFace(trigger)

/** Annonce du passage de main, avec l'élision devant une voyelle (« Au tour d'Elaria »). */
export const turnLabel = (name: string) => (/^[aeiouyàâäéèêëîïôöûü]/i.test(name) ? `Au tour d'${name}` : `Au tour de ${name}`)

/** Les étapes provoquées par chaque étape (`cause`), dans l'ordre. */
export function childrenOf(beats: readonly Beat[]): Beat[][] {
  const children: Beat[][] = beats.map(() => [])
  for (const b of beats) if (b.cause !== undefined) children[b.cause].push(b)
  return children
}

/**
 * Face de compétence du coup `i` : la compétence que son dé déclenche (une étape `event` qu'il a provoquée, sur un
 * 1, 2 ou 3), ou le coup transformé (Charge, Coup de griffe). Undefined si le jet ne déclenche rien.
 */
export function skillFaceAt(beats: readonly Beat[], fighters: Pair<Character>, i: number, children = childrenOf(beats)): number | undefined {
  const beat = beats[i]
  if (beat?.type !== 'attack') return undefined
  const attack = beat.attack
  if (attack.reshaped) {
    const trigger = fighters[attack.attacker].events.find((e) => e.id === attack.reshaped!.event)?.trigger
    return trigger && skillFaceOf(trigger)
  }
  for (const next of children[i])
    if (next.type === 'event' && next.event.side === attack.attacker) {
      const face = skillFaceOf(next.event.trigger)
      if (face !== undefined) return face
    }
  return undefined
}

/** Effets tous refusés par le plafond (aura cumulable déjà à son maximum) : rien ne s'active, seul le texte neutre s'affiche. */
const capped = (effects: readonly AppliedEffect[]) => effects.length > 0 && effects.every(atCap)

/**
 * Purges à vide (rien à retirer) d'une compétence : leur texte « Rien à purifier » ne s'affiche que si la compétence
 * n'a rien retiré ni posé d'autre, et une seule fois. Sinon il bruite (l'Aura d'immunité sans malus).
 */
function quietPurges(effects: readonly AppliedEffect[]): AppliedEffect[] {
  const empty = (e: AppliedEffect) => e.type === 'cleanse' && e.removed.length === 0
  const did = effects.some((e) => (e.type === 'cleanse' && e.removed.length > 0) || e.type === 'applyStatus')
  const first = effects.findIndex(empty)
  return effects.filter((e, k) => !empty(e) || (!did && k === first))
}

/** Les PV après des effets, de proche en proche (les PV s'arrêtent à 0 et au maximum, comme dans le moteur). */
function hpAfter(hp: Pair<number>, effects: readonly AppliedEffect[], fighters: Pair<Character>): Pair<number> {
  const next = [...hp] as Pair<number>
  for (const e of effects) {
    if (e.type === 'damage') next[e.target] = Math.max(0, next[e.target] - e.amount)
    if (e.type === 'heal') next[e.target] = Math.min(fighters[e.target].maxHp, next[e.target] + e.amount)
  }
  return next
}

/** Ce qu'une étape d'effets affiche sur un combattant : la source, son titre, ses effets et ses textes sans effet. */
export interface FxSpec {
  source: Side | null
  title: string
  effects: readonly AppliedEffect[]
  /** Textes qui ne viennent d'aucun effet, sur leur cible : « Tour perdu » */
  notes?: readonly (Badge & { target: Side })[]
}

/**
 * Les textes flottants d'un effet à côté du combattant `side` (sans leur clé). Un seul texte par événement : le nom de
 * la compétence sur son lanceur suffit pour le statut qu'elle lui pose ; un bonus d'un autre nom (Œil de faucon pose
 * Critique assuré) devient son sous-titre. Restent des badges : PV, dégâts, malus posés, résistances, et les textes
 * sans effet. `struck` : l'effet tombe avec l'impact d'un coup sur ce combattant (le Poison de l'Aura de décoction et
 * son « −7 ») : ce qui monte part au-dessus du chiffre des dégâts, ce qui tombe en dessous.
 */
export function fxFloats(fx: FxSpec, side: Side, struck = false): DistributiveOmit<Float, 'key'>[] {
  const isSource = fx.source === side
  const mine = fx.effects.filter((e) => e.target === side)
  const echoes = isSource && fx.title ? mine.filter((e) => e.type === 'applyStatus' && e.result.kind === 'applied' && !atCap(e)) : []
  const subtitle = [...new Set(echoes.flatMap((e) => (e.type === 'applyStatus' ? [STATUSES[e.status].name] : [])))]
    .filter((name) => name !== fx.title)
    .join(' · ')
  const badges: Badge[] = [...mine.filter((e) => !echoes.includes(e)).map(effectBadge), ...(fx.notes?.filter((n) => n.target === side) ?? [])]
  const floats: DistributiveOmit<Float, 'key'>[] = []
  if (isSource && fx.title) floats.push({ kind: 'title', text: fx.title, ...(subtitle && { subtitle }) })
  badges.forEach((badge, i) => {
    if (!struck) floats.push({ kind: 'badge', badge: { text: badge.text, tone: badge.tone, rises: badge.rises }, row: i, lift: false })
    else {
      const row = badges.slice(0, i).filter((b) => b.rises === badge.rises).length
      floats.push({ kind: 'badge', badge: { text: badge.text, tone: badge.tone, rises: badge.rises }, row, lift: badge.rises })
    }
  })
  return floats
}

/** Un coup de compétence unique de cette force est un coup lourd (chiffre doré, secousse, son du critique). */
const HEAVY_BLOW = 10

/* ---------- La mise en scène ---------- */

interface Preview {
  side: Side
  status: StatusId
  /** Tours affichés d'avance ; absent : le statut part d'avance (expiration) */
  turns?: number
  /** L'étape qui réalise ce changement */
  until: number
}

interface ShowOpts {
  /** Les dégâts directs sur l'adversaire de la source sont joués comme des coups, avec élan ou en réaction */
  blows?: 'lunge' | 'reaction'
  /** Son imposé (null : aucun), sinon déduit des effets (`cueOf`) */
  cue?: SfxName | null
  /** Son de chaque coup de la série */
  impact?: (damage: number, heavy: boolean) => SfxName
  /** 0 : l'effet tombe avec le dé qui le déclenche, sans attente (sinon `LEAD`) */
  lead?: 0
  /** Label de surcharge posé à l'apparition */
  special?: SpecialSpec
  /** À l'apparition, avec le son et les textes (le sceau d'une relique qui s'illumine) */
  onShow?: () => void
  /** Temps de lecture après l'effet (sinon `READ_HOLD`) */
  hold?: TimingName
  /** Effet d'une relique : ni aura ni titre sur la source */
  relic?: true
  /** Instants des impacts depuis l'apparition (événement de scène) */
  schedule?: readonly number[]
  /** Compétence ou aura d'où part un signal d'activation, s'il pose un état visible */
  signal?: string
  notes?: FxSpec['notes']
}

/**
 * Met en scène un combat résolu : les moments, dans l'ordre, de l'ouverture (initiative) au K.O. Chaque type d'étape
 * a sa mise en scène ci-dessous ; un nouveau type est refusé par TypeScript (`satisfies never`).
 */
export function stage(result: CombatResult, { test = false }: StageOptions = {}): Moment[] {
  const { fighters, beats } = result
  const children = childrenOf(beats)
  const ranks: number[] = []
  beats.reduce((n, b, i) => ((ranks[i] = n), n + diceOf(b).length), 0)
  const moments: Moment[] = []

  // Instant courant dans le moment en cours, et ce qui est à l'écran à cet instant
  let moment!: Moment
  let t = 0
  let key = 0
  let heard = new Set<string>()
  let hp: Pair<number> = [fighters[0].maxHp, fighters[1].maxHp]
  let dice: DiceState = IDLE_DICE
  let labels: string[] = []
  let strike: Strike | null = null
  let blow: Blow | null = null
  let aura = false
  let active: Side | null = null
  let previews: Preview[] = []
  /** Étape dont l'état des statuts est affiché (la plus récente montrée) */
  let shownState = -1
  let shownStatuses = ''
  /** Étapes dont les PV sont appliqués, et la plus longue suite sans trou depuis le début */
  const settled = new Set<number>()
  let settledUpTo = -1

  const begin = (ids: number[], turn: number, owner: Side) => {
    moment = { beats: ids, turn, owner, cues: [], duration: 0, rolls: [], spans: [] }
    moments.push(moment)
    t = 0
    heard = new Set()
  }
  const finish = () => {
    moment.duration = t
    // Tri stable : à instant égal, l'ordre d'émission
    moment.cues.sort((x, y) => x.at - y.at)
  }
  /** Attend `ms` ; `name` dit d'où vient cette durée (constante de `timing.ts` ou libellé d'une durée calculée). */
  const wait = (ms: number, name: string) => {
    if (ms > 0) moment.spans.push({ at: t, ms, name })
    t += ms
  }
  /** Attend la durée nommée `name` de `timing.ts`. */
  const hold = (name: TimingName) => wait(T[name], name)
  const emit = (body: CueBody, at = t) => moment.cues.push({ at, ...body } as Cue)
  /** Jamais deux fois le même son au même instant (SONS.md § 4.4, règles 4 et 5) */
  const sound = (cue: SfxName, arg?: number, at = t) => {
    const id = `${at}:${cue}`
    if (heard.has(id)) return
    heard.add(id)
    emit({ channel: 'sound', cue, ...(arg !== undefined && { arg }) }, at)
  }

  const setDice = (next: DiceState) => {
    dice = next
    emit({ channel: 'dice', dice })
    if (labels.length > 0) clearSpecials()
  }
  const patchDice = (patch: Partial<DiceState>) => {
    dice = { ...dice, ...patch }
    emit({ channel: 'dice', dice })
  }
  const clearSpecials = () => {
    labels = []
    emit({ channel: 'specialsClear' })
  }
  /** Empile un label sous le dé (une seule fois par libellé pour un même jet) et joue le son de son signe. */
  const addSpecial = (spec: SpecialSpec) => {
    sound(SPECIAL_SIGNS[spec.sign as SpecialSign].cue)
    if (labels.includes(spec.label)) return
    labels = [...labels, spec.label]
    emit({ channel: 'special', special: spec })
  }
  const setStrike = (next: Strike | null) => {
    strike = next
    emit({ channel: 'strike', strike: next })
    if (next?.landed) emit({ channel: 'float', side: other(next.attacker), float: { key: key++, kind: 'hit', damage: next.damage, crit: next.crit, dodged: next.dodged } })
  }
  const setBlow = (next: Blow | null) => {
    blow = next
    emit({ channel: 'blow', blow: next })
    if (next?.landed) emit({ channel: 'float', side: next.to, float: { key: key++, kind: 'hit', damage: next.damage, crit: next.heavy, dodged: false } })
  }
  /** Ce combattant encaisse un coup arrivé, à cet instant (les textes qui montent passent au-dessus du chiffre) */
  const struck = (side: Side) =>
    strike && strike.attacker !== side ? strike.landed && !strike.dodged : !!blow && blow.to === side && blow.landed
  const setAura = (source: Side | null) => {
    if (source === null && !aura) return
    aura = source !== null
    emit({ channel: 'aura', fx: source === null ? null : { key: key++, source } })
  }
  /** Les effets apparaissent : aura sur la source, textes flottants sur chaque combattant */
  const showFx = (fx: FxSpec, relic = false) => {
    setAura(relic ? null : fx.source)
    for (const side of [0, 1] as Side[])
      for (const float of fxFloats(fx, side, struck(side))) emit({ channel: 'float', side, float: { key: key++, ...float } as Float })
  }
  const log = (entry: Omit<LogEntry, 'id'>) => emit({ channel: 'log', entry })
  const pulse = (side: Side, face: number | undefined) => {
    if (face !== undefined) emit({ channel: 'skillPulse', side, face })
  }
  const showHp = (next: Pair<number>) => {
    hp = next
    emit({ channel: 'hp', hp })
  }

  /** Les statuts à l'écran : ceux de l'étape montrée, avec les décomptes et expirations montrés d'avance. */
  const display = (state: Pair<Status[]>): Pair<Status[]> =>
    previews.length === 0
      ? state
      : (state.map((list, side) =>
          list.flatMap((s) => {
            const p = previews.filter((x) => x.side === side && x.status === s.id)
            if (p.some((x) => x.turns === undefined)) return []
            const turns = p.find((x) => x.turns !== undefined)?.turns
            return turns === undefined ? [s] : [{ ...s, turns }]
          }),
        ) as Pair<Status[]>)
  /**
   * Montre les statuts de l'étape `id`. Une étape déjà dépassée à l'écran (la Riposte après le poison que le coup a
   * posé à son impact) garde l'état le plus récent : rien ne revient en arrière.
   */
  const showStatuses = (id: number) => {
    shownState = Math.max(shownState, id)
    const next = display(beats[shownState].state.statuses)
    const text = JSON.stringify(next)
    if (text === shownStatuses) return
    shownStatuses = text
    emit({ channel: 'statuses', statuses: next })
  }

  /**
   * Les PV de l'étape `beat` tombent : ceux d'avant (à l'écran) moins ses effets. Quand les étapes appliquées sont
   * exactement toutes celles jusqu'à une étape (aucune montrée d'avance, comme la plaie qui coule à l'impact), les PV
   * doivent valoir son état : une différence est une erreur de la mise en scène.
   */
  const settle = (beat: Beat, base = hp) => {
    const next = hpAfter(base, beatEffects(beat), fighters)
    if (beat.type === 'attack') {
      const defender = other(beat.attack.attacker)
      next[defender] = Math.max(0, next[defender] - beat.attack.damage)
    }
    if (next[0] !== hp[0] || next[1] !== hp[1]) showHp(next)
    settled.add(beat.id)
    while (settled.has(settledUpTo + 1)) settledUpTo++
    const truth = beats[settledUpTo]?.state.hp
    if (truth && settled.size === settledUpTo + 1 && (truth[0] !== hp[0] || truth[1] !== hp[1])) {
      if (import.meta.env.DEV) throw new Error(`mise en scène : PV ${hp} au lieu de ${truth} après l'étape ${settledUpTo}`)
      showHp([...truth] as Pair<number>)
    }
  }

  /* ----- Liens de cause ----- */

  /**
   * La plaie du défenseur qui coule sur ce coup (Saignement) : une réaction provoquée par le coup, sur le défenseur,
   * qui lui fait perdre des PV et a son label. Jouée à l'impact du coup (`bleedOut`).
   */
  const flowOf = (hit: Extract<Beat, { type: 'attack' }>) =>
    children[hit.id].find((next) => {
      if (next.type !== 'statusReaction' || next.side !== other(hit.attack.attacker)) return false
      const wound = next.effects.some((e) => e.type === 'damage' && e.target === next.side && e.amount > 0)
      return wound && reactionSpecial(next.status, 'defender', next.effects) !== undefined
    }) as Extract<Beat, { type: 'statusReaction' }> | undefined
  /**
   * Les statuts posés par le coup qui vient de toucher (attaque, ou pièce sur pile) : la réaction du frappeur sur `hit`
   * qui ne fait que poser des statuts sur sa cible (poison de l'Aura de décoction), ou la compétence qui accompagne le
   * coup s'il touche (Pourfendre : Saignement). Jouées à son impact (`landRide`) : frappe + poison.
   */
  const ridesOf = (hit: Beat): Beat[] => {
    const striker = hit.type === 'attack' ? hit.attack.attacker : hit.type === 'coin' ? hit.side : undefined
    if (striker === undefined) return []
    const onTarget = (effects: readonly AppliedEffect[]) => effects.length > 0 && effects.every((e) => e.type === 'applyStatus' && e.target !== striker)
    return children[hit.id].filter((next) => {
      if (next.type === 'event')
        return (
          hit.type === 'attack' &&
          next.event.side === striker &&
          !!fighters[striker].events.find((e) => e.id === next.event.eventId)?.needsTouch &&
          onTarget(next.event.effects)
        )
      return next.type === 'statusReaction' && next.side === striker && next.trigger === 'hit' && onTarget(next.effects)
    })
  }
  /** Étapes déjà jouées avec le coup qui les a provoquées : à leur place, il ne reste rien à montrer */
  const absorbed = new Set<number>()
  /** Étapes qui tombent avec le dé qui les a déclenchées, sans attente : la compétence d'un coup sacrifié, d'un double */
  const snapped = new Set<number>()

  /* ----- Mise en scène de chaque sorte d'étape ----- */

  /**
   * Affiche des effets ; `apply` met à jour PV, statuts et journal au moment de l'apparition. `blows` : les dégâts
   * directs sur l'adversaire de `source` sont joués comme des coups (avec ou sans élan) au lieu d'un simple badge.
   */
  function showEffects(source: Side | null, title: string, effects: readonly AppliedEffect[], apply: () => void, o: ShowOpts = {}) {
    const hits = source !== null && o.blows ? effects.filter((e) => e.type === 'damage' && e.target !== source && e.amount > 0) : []
    if (o.lead !== 0) hold('LEAD')
    const aim = o.signal !== undefined && source !== null ? signalTargets(effects) : undefined
    if (aim) {
      emit({ channel: 'signal', signal: { side: source!, from: o.signal!, ...aim } })
      hold('SIGNAL')
    }
    o.onShow?.()
    const cue = o.cue !== undefined ? o.cue : cueOf(source, effects)
    if (cue) sound(cue)
    showFx({ source, title, effects: effects.filter((e) => !hits.includes(e)), notes: o.notes }, o.relic)
    if (o.special) addSpecial(o.special)
    if (hits.length > 0 && source !== null) {
      hold('BLOWS_LEAD')
      blows(source, hits, o.blows === 'lunge', o.impact ?? ((_, heavy) => (heavy ? 'crit' : 'hit')), o.schedule?.map((x) => x - T.BLOWS_LEAD))
      apply()
      hold('BLOWS_HOLD')
    } else {
      apply()
      hold(o.hold ?? 'READ_HOLD')
    }
    setAura(null)
  }

  /**
   * Coups de compétence : chaque montant (ou chaque jauge d'une relâche) part comme un coup ; les PV tombent coup par
   * coup, depuis ceux à l'écran. Le dernier d'une série est lourd. `schedule` (événement de scène) : l'instant de
   * chaque impact ; les coups sont alors égaux, aucun n'est lourd. `onLand` : à l'impact (le poison d'un coup de pile).
   */
  function blows(
    from: Side,
    hits: readonly AppliedEffect[],
    lunge: boolean,
    impact: (damage: number, heavy: boolean) => SfxName,
    schedule?: readonly number[],
    onLand?: () => void,
  ) {
    const parts = hits.flatMap((e) => (e.type === 'damage' ? (e.parts ?? [e.amount]).map((n) => ({ n, to: e.target })) : []))
    let elapsed = 0
    for (const [k, part] of parts.entries()) {
      const at = schedule?.[k]
      const heavy = at === undefined && (parts.length > 1 ? k === parts.length - 1 : part.n >= HEAVY_BLOW)
      const id = key++
      const wind: TimingName = lunge ? 'BLOW_WIND' : 'BLOW_WIND_REACTION'
      // Au rythme imposé, le chiffre du coup précédent reste à l'écran jusqu'à l'élan de celui-ci
      if (at !== undefined) {
        wait(Math.max(0, at - T[wind] - elapsed), 'rythme de la scène')
        elapsed = Math.max(elapsed, at)
      }
      setBlow({ key: id, from, to: part.to, damage: part.n, heavy, lunge, landed: false })
      hold(wind)
      if (heavy) hold('HEAVY_FREEZE') // arrêt sur image avant le gros coup
      sound(impact(part.n, heavy))
      const next = [...hp] as Pair<number>
      next[part.to] = Math.max(0, next[part.to] - part.n)
      showHp(next)
      setBlow({ key: id, from, to: part.to, damage: part.n, heavy, lunge, landed: true })
      onLand?.()
      if (at === undefined || k === parts.length - 1) hold(k === parts.length - 1 ? 'BLOW_LAST_HOLD' : 'BLOW_HOLD')
    }
    setBlow(null)
  }

  /** Surcharges au résultat du dé : l'esquive assurée, le bonus d'une relique de coup, dont le sceau s'illumine. */
  const rollSpecials = (attack: Attack) => {
    if (attack.relicBonus?.length && !attack.dodged)
      emit({ channel: 'relicPulse', side: attack.attacker, relics: attack.relicBonus.map((b) => b.relic) })
    for (const s of attackSpecials(attack).roll) addSpecial(s)
  }

  /**
   * La plaie du défenseur coule sur ce coup : son label tombe sous le dé à l'impact, avec son ding, puis ses PV
   * perdus suivent d'un battement, sur la même frappe (son Ronge).
   */
  function bleedOut(flow: Extract<Beat, { type: 'statusReaction' }>) {
    addSpecial(reactionSpecial(flow.status, 'defender', flow.effects)!)
    hold('BLEED_DELAY')
    sound('rot')
    showFx({ source: null, title: '', effects: flow.effects })
    settle(flow)
    showStatuses(flow.id)
    log(statusReactionLog(flow.side, flow.status, flow.effects, fighters))
  }

  /** Le statut posé par ce coup tombe à son impact ; son son suit le Coup d'un battement (SONS.md § 4.1). */
  function landRide(ride: Beat) {
    const side = ride.type === 'event' ? ride.event.side : ride.type === 'statusReaction' ? ride.side : undefined
    const effects = beatEffects(ride)
    showFx({ source: null, title: '', effects })
    settle(ride)
    showStatuses(ride.id)
    log(ride.type === 'event' ? eventLog(ride.event, fighters) : statusReactionLog(side!, (ride as Extract<Beat, { type: 'statusReaction' }>).status, [...effects], fighters))
    const cue = cueOf(side ?? null, effects)
    if (cue) sound(cue, undefined, t + T.RIDE_CUE)
  }

  /** Rafale en cours (Furie des vents, paire) : ses coups, le prochain à jouer ; `pointed` : chaque coup désigne son dé */
  let volley: { strikes: number[]; next: number; pointed: boolean } | null = null

  /** Le coup d'une action : le dé roule, retombe, l'élan part, l'impact tombe. */
  function stageAttack(beat: Extract<Beat, { type: 'attack' }>, face: number | undefined, grouped: boolean) {
    const { attack } = beat
    const { attacker, faces } = attack
    const shown = { ...IDLE_DICE, faces, owner: attacker, label: `${fighters[attacker].name} attaque`, critMultiplier: attack.critMultiplier }
    const specials = attackSpecials(attack)
    const flow = flowOf(beat)
    const rides = ridesOf(beat)
    const base = hp

    setDice({ ...shown, values: [0], rolling: true })
    sound('diceRoll', T.DICE_ROLL)
    hold('DICE_ROLL')
    sound('diceLand')
    // Une compétence qui accompagne le coup (Pourfendre) ne part que s'il touche : son dé s'allume à l'impact
    const onHit = !attack.forfeited && !attack.reshaped
    if (!onHit) pulse(attacker, face)
    setDice({ ...shown, values: [attack.roll], forced: attack.forced })
    rollSpecials(attack)

    // Coup sacrifié par une compétence : pas d'élan, la compétence qui suit prend le relais
    if (attack.forfeited) {
      settle(beat, base)
      showStatuses(beat.id)
      log(attackLog(beat.turn, attack, fighters, hp[other(attacker)]))
      if (!grouped) hold('FORFEIT_HOLD')
      return
    }

    hold('DICE_READ')
    if (attack.crit) {
      patchDice({ crit: true, critForced: attack.critForced })
      for (const s of specials.crit) addSpecial(s)
      hold('CRIT_ANNOUNCE')
    }

    // Élan vers l'adversaire, muet ; l'impact (ou l'esquive) tombe au milieu de l'animation
    const id = key++
    setStrike({ ...attack, key: id, landed: false })
    hold('WIND')
    if (attack.crit && !attack.dodged) hold('CRIT_FREEZE')
    sound(attack.dodged ? 'dodge' : attack.crit ? 'crit' : 'hit')
    settle(beat, base)
    showStatuses(beat.id)
    setStrike({ ...attack, key: id, landed: true })
    for (const s of specials.impact) addSpecial(s)
    if (onHit) pulse(attacker, face)
    log(attackLog(beat.turn, attack, fighters, hp[other(attacker)]))
    for (const ride of rides) {
      absorbed.add(ride.id)
      landRide(ride)
    }
    if (flow) {
      absorbed.add(flow.id)
      bleedOut(flow)
    }
    hold(flow ? 'STRIKE_FLOW_HOLD' : 'STRIKE_HOLD')
    setStrike(null)
    if (flow || rides.length > 0) setAura(null)
  }

  /** Un coup de la rafale : pas de nouveau jet, élan court, impact presque immédiat. */
  function stageVolleyStrike(beat: Extract<Beat, { type: 'attack' }>, index: number | undefined, face: number | undefined, grouped: boolean) {
    const { attack } = beat
    const specials = attackSpecials(attack)
    const flow = flowOf(beat)
    const rides = ridesOf(beat)
    const base = hp
    patchDice({ active: index, crit: attack.crit, critForced: attack.critForced, critMultiplier: attack.critMultiplier })
    if (labels.length > 0) clearSpecials()
    rollSpecials(attack)
    for (const s of specials.crit) addSpecial(s)
    if (attack.forfeited) {
      // Le dé de la rafale ressort, son dé de l'en-tête s'allume, et sa compétence suit sans attente
      pulse(attack.attacker, face)
      settle(beat, base)
      showStatuses(beat.id)
      log(attackLog(beat.turn, attack, fighters, hp[other(attack.attacker)]))
      hold(grouped ? 'VOLLEY_FORFEIT_SNAP' : 'VOLLEY_FORFEIT_HOLD')
      return
    }
    const id = key++
    setStrike({ ...attack, key: id, landed: false, fast: true })
    hold('VOLLEY_WIND')
    if (attack.crit && !attack.dodged) hold('VOLLEY_CRIT_FREEZE')
    sound(attack.dodged ? 'dodge' : attack.crit ? 'crit' : 'hit')
    settle(beat, base)
    showStatuses(beat.id)
    setStrike({ ...attack, key: id, landed: true, fast: true })
    for (const s of specials.impact) addSpecial(s)
    log(attackLog(beat.turn, attack, fighters, hp[other(attack.attacker)]))
    for (const ride of rides) {
      absorbed.add(ride.id)
      landRide(ride)
    }
    if (flow) {
      absorbed.add(flow.id)
      bleedOut(flow)
    }
    hold(flow ? 'VOLLEY_FLOW_HOLD' : 'VOLLEY_STRIKE_HOLD')
    setStrike(null)
    if (flow || rides.length > 0) setAura(null)
  }

  /**
   * Rafale : tous les dés roulent ensemble, le second jaillit, ou apparaît dans sa couleur s'il est d'une autre sorte.
   * `flat` : rafale instantanée (Furie des vents), déclenchée par le dé qui vient de tomber : les dés apparaissent d'un
   * coup, à plat, sans label.
   */
  function rollVolley(attacks: Attack[], color: string | undefined, flat: boolean) {
    const { attacker, faces } = attacks[0]
    const shown: DiceState = {
      ...IDLE_DICE,
      faces,
      owner: attacker,
      label: `${fighters[attacker].name} · ${attacks.length} coups`,
      volley: true,
      dieFaces: attacks.map((a) => a.faces),
      dieColors: attacks.map((_, k) => (k > 0 ? color : undefined)),
    }
    const landed = { ...shown, values: attacks.map((a) => a.roll), forced: attacks.some((a) => a.forced) }
    if (flat) {
      setDice(landed)
      hold('VOLLEY_FLAT')
      return
    }
    setDice({ ...shown, values: attacks.map(() => 0), rolling: true })
    // Un seul dé lancé et un seul dé posé pour toute la rafale : un instant, un son
    sound('diceRoll', T.DICE_ROLL_MANY)
    hold('DICE_ROLL_MANY')
    sound('diceLand')
    setDice(landed)
    hold('DICE_LAND_HOLD')
  }

  /**
   * La mise en scène d'une étape, selon son type. Une étape qui lance des dés commence par un point d'attente du
   * combat test, jusqu'au rang de son dernier dé (`RollMark`).
   */
  function stageBeat(beat: Beat) {
    const dice = diceOf(beat).length
    if (dice > 0) moment.rolls.push({ at: t, upTo: ranks[beat.id] + dice })
    switch (beat.type) {
      case 'attack': {
        const face = skillFaceAt(beats, fighters, beat.id, children)
        // Le jet déclenche une compétence qui remplace le coup : tout tombe ensemble, au moment où le dé s'arrête
        const skill = beat.attack.forfeited && face !== undefined ? children[beat.id].find((b) => b.type === 'event' && skillFaceOf(b.event.trigger) === face) : undefined
        if (skill) snapped.add(skill.id)
        if (volley && volley.strikes.includes(beat.id)) {
          const index = volley.next++
          stageVolleyStrike(beat, volley.pointed ? index : undefined, face, !!skill)
          const last = volley.next === volley.strikes.length
          if (last) volley = null
          if (!skill) hold(last ? 'STRIKE_REST' : 'VOLLEY_GAP')
          break
        }
        stageAttack(beat, face, !!skill)
        if (!skill) hold('STRIKE_REST')
        break
      }
      case 'event': {
        const def = fighters[beat.event.side].events.find((e) => e.id === beat.event.eventId)
        // Un coup transformé (Charge…) a déjà été joué avec le coup : la compétence n'est que notée
        if (def?.reshapesHit) {
          settle(beat)
          showStatuses(beat.id)
          log(eventLog(beat.event, fighters))
          setAura(null)
          break
        }
        // Une compétence à événement de scène (Foudre) le lance d'abord : ses dégâts tombent sur ses impacts, sans élan
        const timing = def?.scene ? SCENE_EVENTS[def.scene] : undefined
        const effects = quietPurges(beat.event.effects)
        // Aura cumulable déjà à son maximum : rien ne s'active, seul le texte neutre « … au maximum » s'affiche
        const idle = capped(effects)
        if (def?.scene) emit({ channel: 'scene', scene: { id: def.scene, source: beat.event.side, target: other(beat.event.side) } })
        const base = hp
        // Aucun nom flottant au-dessus du lanceur : son sceau dans la barre de compétences s'allume déjà
        showEffects(
          idle ? null : beat.event.side,
          '',
          effects,
          () => {
            settle(beat, base)
            showStatuses(beat.id)
            log(eventLog(beat.event, fighters))
          },
          {
            blows: timing ? 'reaction' : 'lunge',
            lead: timing || snapped.has(beat.id) ? 0 : undefined,
            ...(timing && { schedule: timing.impacts, impact: () => 'crit' as const }),
            // Furie instantanée : ses frappes suivent vite (son nom est déjà tombé avec le dé)
            hold: children[beat.id].some((b) => b.type === 'flurry') ? 'FLURRY_CHAIN_HOLD' : undefined,
            signal: beat.event.eventId,
          },
        )
        break
      }
      case 'statusTick': {
        previewCounts(beat)
        // Un statut qui agit sur l'adversaire s'annonce au-dessus de son porteur, sauf une aura (son anneau envoie le
        // signal). Le poison subi n'a que son texte. Un statut posé déjà à son maximum n'annonce rien.
        const outward = beat.effects.some((e) => e.target !== beat.side) && !capped(beat.effects)
        const fromRing = STATUS_PLACE[beat.status].place === 'aura'
        const harms = beat.effects.some((e) => e.type === 'damage')
        const base = hp
        showEffects(
          outward ? beat.side : null,
          outward && !fromRing ? STATUSES[beat.status].name : '',
          beat.effects,
          () => {
            settle(beat, base)
            showStatuses(beat.id)
            log(statusTickLog(beat.side, beat.status, beat.effects, fighters))
          },
          { ...(harms && { cue: 'rot' as const }), ...(fromRing && { signal: beat.status }) },
        )
        break
      }
      case 'statusReaction': {
        // Riposte, Épines, Vol de vie, Saignement : une réaction au coup en cours, vue de l'attaquant (le maître du tour)
        const def = STATUSES[beat.status]
        const reflects = def.reflectsHit !== undefined
        const harms = beat.effects.some((e) => e.type === 'damage' && e.target !== beat.side)
        const wound = beat.effects.reduce((n, e) => n + (e.type === 'damage' && e.target === beat.side ? e.amount : 0), 0)
        const idle = capped(beat.effects)
        const special = idle ? undefined : reactionSpecial(beat.status, beat.side === beat.owner ? 'attacker' : 'defender', beat.effects)
        // Son nom ne flotte plus au-dessus du porteur quand son label le dit déjà sous le dé
        const named = wound === 0 && !idle && !special
        const base = hp
        showEffects(
          wound > 0 || idle ? null : beat.side,
          named ? def.name : '',
          beat.effects,
          () => {
            settle(beat, base)
            showStatuses(beat.id)
            log(statusReactionLog(beat.side, beat.status, beat.effects, fighters))
          },
          {
            // Un renvoi de dégâts n'est qu'un coup, même gros ; le vol de vie, un soin ; la plaie, le Ronge
            ...(harms
              ? { blows: reflects ? 'lunge' : 'reaction', cue: null, impact: () => 'hit' }
              : def.drainsHit
                ? { cue: 'heal' }
                : wound > 0
                  ? { cue: 'rot', lead: 0, hold: 'WOUND_HOLD' }
                  : {}),
            special,
            // L'Aura de décoction empoisonne à chaque coup : la lueur part de son anneau
            ...(STATUS_PLACE[beat.status].place === 'aura' && { signal: beat.status }),
          } as ShowOpts,
        )
        break
      }
      case 'skip':
        // La conséquence, pas la cause : « Tour perdu » sur celui qui perd son action, sans titre ni aura
        showEffects(
          null,
          '',
          [],
          () => {
            settle(beat)
            showStatuses(beat.id)
            log(skipLog(beat.turn, beat.side, beat.status, fighters))
          },
          { cue: 'stun', notes: [{ target: beat.side, text: STATES.lostTurn.name, tone: STATES.lostTurn.polarity, rises: false }] },
        )
        break
      case 'flurry': {
        // Furie instantanée : la compétence qui la pose vient de s'afficher ; la rafale part sans répéter son nom
        const chained = beat.cause !== undefined && beats[beat.cause].type === 'event'
        const apply = () => {
          settle(beat)
          showStatuses(beat.id)
          log(flurryLog(beat.turn, beat.side, beat.status, beat.strikes, fighters))
        }
        if (chained) apply()
        else showEffects(beat.side, STATUSES[beat.status].name, [], apply)
        // Tous les dés de la rafale roulent ensemble : en combat test, le joueur les choisit d'abord, un par un
        moment.rolls.push({ at: t, upTo: ranks[beat.id] + beat.strikes })
        const strikes = children[beat.id]
          .filter((b): b is Extract<Beat, { type: 'attack' }> => b.type === 'attack')
          .slice(0, beat.strikes)
        if (strikes.length > 0) {
          volley = { strikes: strikes.map((b) => b.id), next: 0, pointed: true }
          rollVolley(
            strikes.map((b) => b.attack),
            STATUSES[beat.status].look?.dieColor,
            chained,
          )
        }
        break
      }
      case 'shift': {
        // Le druide change de forme : fondu entre ses deux silhouettes, tourbillon de feuilles (Fighter)
        const form = fighters[beat.side].forms?.[beat.form]
        showEffects(
          beat.side,
          form?.name ?? '',
          [],
          () => {
            settle(beat)
            showStatuses(beat.id)
            emit({ channel: 'form', side: beat.side, form: beat.form })
            log(shiftLog(beat.turn, beat.side, beat.form, fighters))
          },
          { cue: 'shift' },
        )
        break
      }
      case 'pair': {
        // Les deux dés roulent ensemble ; les coups qui suivent (deux, ou ceux d'un double) partent en rafale
        const skill = beat.double !== undefined ? children[beat.id].find((b) => b.type === 'event') : undefined
        const name = skill?.type === 'event' ? skill.event.name : undefined
        const strikes = children[beat.id]
          .filter((b) => b.type === 'attack')
          .map((b) => b.id)
        volley = strikes.length > 0 ? { strikes, next: 0, pointed: beat.double === undefined } : null
        const shown = { ...IDLE_DICE, faces: beat.faces, owner: beat.side, label: `${fighters[beat.side].name} · deux dés`, volley: true }
        setDice({ ...shown, values: [0, 0], rolling: true })
        sound('diceRoll', T.DICE_ROLL_MANY)
        hold('DICE_ROLL_MANY')
        sound('diceLand')
        // Un double, quel qu'il soit : le « ding » de la chance, en même temps que les dés (SONS.md § 4.1)
        if (beat.rolls[0] === beat.rolls[1]) sound('coinWin')
        if (name) pulse(beat.side, beat.double)
        setDice({ ...shown, values: beat.rolls, forced: !!beat.forced, label: name ? `DOUBLE ${beat.rolls[0]} !` : shown.label })
        settle(beat)
        showStatuses(beat.id)
        // Un double qui a sa compétence : elle tombe avec la paire (étape suivante, sans attente)
        if (name) snapped.add(skill!.id)
        else hold('DICE_LAND_HOLD')
        log(pairLog(beat.turn, beat.side, beat.rolls, name, fighters))
        break
      }
      case 'coin': {
        // La pièce remplace le dé, tournoie, retombe ; pile, la voleuse fond sur sa cible, un seul coup lourd
        const rides = beat.heads ? ridesOf(beat) : []
        const shown = { ...IDLE_DICE, owner: beat.side, label: `${fighters[beat.side].name} · Pile ou face` }
        const base = hp
        showStatuses(beat.id)
        setDice({ ...shown, coin: {} })
        sound('coinToss', T.COIN_SPIN)
        hold('COIN_SPIN')
        sound('coinLand')
        setDice({ ...shown, coin: { heads: beat.heads }, label: beat.heads ? 'PILE !' : 'FACE…', forced: beat.forced })
        // Le résultat tombe d'un bloc : la pièce, son libellé, le « ding » de la réussite et le texte flottant
        if (beat.heads) sound('coinWin')
        showFx({ source: beat.side, title: beat.heads ? 'Pile !' : 'Face…', effects: [] })
        hold('COIN_READ')
        if (beat.heads)
          blows(beat.side, beat.effects, true, () => 'crit', undefined, () => {
            for (const ride of rides) {
              absorbed.add(ride.id)
              landRide(ride)
            }
          })
        settle(beat, base)
        log(coinLog(beat.turn, beat.side, beat.heads, beat.effects, fighters))
        hold(beat.heads ? 'COIN_HEADS_HOLD' : 'COIN_TAILS_HOLD')
        setAura(null)
        break
      }
      case 'statusDuration': {
        // Le compteur rebondit sur sa nouvelle valeur, sauf s'il l'a déjà fait avec l'effet du statut
        const shown = beat.changes.every((c) => previews.some((p) => p.until === beat.id && p.status === c.status))
        settle(beat)
        showStatuses(beat.id)
        log(statusDurationLog(beat.side, beat.changes, fighters))
        if (!shown) hold('COUNT_HOLD')
        break
      }
      case 'statusExpire': {
        // L'état passe à 0 sous les yeux du joueur, puis quitte la zone d'état (StatusTray)
        const shown = beat.statuses.every((id) => previews.some((p) => p.until === beat.id && p.status === id))
        settle(beat)
        showStatuses(beat.id)
        log(statusExpireLog(beat.side, beat.statuses, fighters))
        if (!shown) hold('COUNT_HOLD')
        break
      }
      case 'relic': {
        // La relique s'annonce sur son sceau ; ses effets arrivent sur leur cible, son label tombe sous le dé au même
        // instant (+ si son porteur est l'attaquant, − sinon). Un effet refusé par le plafond n'a pas de label
        const idle = capped(beat.effects)
        const base = hp
        showEffects(
          beat.side,
          '',
          beat.effects,
          () => {
            settle(beat, base)
            showStatuses(beat.id)
            log(relicLog(beat, fighters))
            emit({ channel: 'relicUse', side: beat.side, relic: beat.relic, uses: beat.uses })
          },
          {
            blows: 'reaction',
            relic: true,
            onShow: () => emit({ channel: 'relicPulse', side: beat.side, relics: [beat.relic] }),
            special: idle ? undefined : relicSpecial(beat.relic, beat.name, beat.side === beat.owner ? 'attacker' : 'defender'),
          },
        )
        break
      }
      default:
        // Tout nouveau type d'étape doit avoir sa mise en scène ici
        beat satisfies never
    }
  }

  /**
   * Quand un statut agit, le décompte de sa durée ou son expiration (même tour, même camp, même phase) sont montrés en
   * même temps que son effet : le « −2 » et le compteur qui passe de 3 à 2 (ou à 0) tombent ensemble. Ces changements
   * d'avance restent appliqués jusqu'à l'étape qui les réalise.
   */
  function previewCounts(tick: Extract<Beat, { type: 'statusTick' }>) {
    for (let j = tick.id + 1; j < beats.length; j++) {
      const next = beats[j]
      if (next.turn !== tick.turn) break
      if ((next.type !== 'statusDuration' && next.type !== 'statusExpire') || next.side !== tick.side || next.phase !== tick.phase) continue
      if (next.type === 'statusDuration') {
        const change = next.changes.find((c) => c.status === tick.status)
        if (change) previews.push({ side: tick.side, status: tick.status, turns: change.to, until: j })
      } else if (next.statuses.includes(tick.status)) previews.push({ side: tick.side, status: tick.status, until: j })
    }
  }

  /* ----- Ouverture ----- */

  const [a, b] = fighters
  const [lastA, lastB] = result.initiative[result.initiative.length - 1]
  const first: Side = lastA > lastB ? 0 : 1
  begin([], 0, first)
  if (!test) hold('INTRO')
  log({ kind: 'info', text: `${a.name} (${a.maxHp} PV) affronte ${b.name} (${b.maxHp} PV) !` })
  // Initiative : chacun lance un dé, le plus haut commence (relance sur égalité). Combat test : seulement notée
  const initDice = { ...IDLE_DICE, faces: INITIATIVE_DIE, label: 'Initiative' }
  for (const [ia, ib] of result.initiative) {
    if (!test) {
      setDice({ ...initDice, values: [0, 0], rolling: true })
      sound('diceRoll', T.DICE_ROLL_MANY)
      hold('DICE_ROLL_MANY')
      sound('diceLand')
      setDice({ ...initDice, values: [ia, ib] })
    }
    log({ kind: 'initiative', text: `Initiative — ${a.name} : ${ia}, ${b.name} : ${ib}` })
    if (!test) hold('INITIATIVE_READ')
    if (ia === ib) log({ kind: 'info', text: 'Égalité ! On relance.' })
  }
  log({ kind: 'info', text: `${fighters[first].name} frappe en premier.`, side: first })
  if (test) setDice({ ...IDLE_DICE, owner: first, label: turnLabel(fighters[first].name) })
  else hold('FIRST_READ')
  active = first
  emit({ channel: 'turn', turn: 0, active })
  finish()

  /* ----- Les étapes, moment par moment ----- */

  // Un moment : une étape racine, puis celles qui en découlent (leur cause est dans le moment), dans le même tour
  const groups: number[][] = []
  let members = new Set<number>()
  for (const beat of beats) {
    const last = groups[groups.length - 1]
    if (last && beat.cause !== undefined && members.has(beat.cause) && beats[last[0]].turn === beat.turn) {
      last.push(beat.id)
      members.add(beat.id)
    } else {
      groups.push([beat.id])
      members = new Set([beat.id])
    }
  }

  for (const ids of groups) {
    const root = beats[ids[0]]
    begin(ids, root.turn, root.owner)
    // Passage de main : le plateau de dés se vide et annonce le suivant, son camp s'allume, un temps de pause
    if (root.id > 0 && root.turn !== beats[root.id - 1].turn) {
      active = root.owner
      setDice({ ...IDLE_DICE, owner: active, label: turnLabel(fighters[active].name) })
      emit({ channel: 'turn', turn: root.turn, active })
      hold('HANDOVER')
    } else emit({ channel: 'turn', turn: root.turn, active })
    for (const id of ids) {
      // Une étape déjà jouée avec son coup n'a plus rien à montrer à sa place (ses statuts restent à jour)
      if (absorbed.has(id)) showStatuses(id)
      else stageBeat(beats[id])
      previews = previews.filter((p) => p.until !== id)
    }
    finish()
  }

  /* ----- Fin du combat ----- */

  const lastBeat = beats[beats.length - 1]
  const w = result.winner
  begin([], lastBeat?.turn ?? 0, lastBeat?.owner ?? first)
  log({
    kind: 'ko',
    side: w,
    text:
      result.endedBy === 'ko'
        ? `${fighters[other(w)].name} s'effondre ! ${fighters[w].name} remporte le combat.`
        : `Limite de tours atteinte : ${fighters[w].name} l'emporte aux points de vie.`,
  })
  emit({ channel: 'winner', side: w })
  emit({ channel: 'turn', turn: lastBeat?.turn ?? 0, active: null })
  patchDice({ label: 'K.O.' })
  sound('ko')
  hold('KO_HOLD')
  sound('victory')
  hold('VICTORY_HOLD')
  finish()

  return moments
}
