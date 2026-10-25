/*
 * La mise en scène d'un combat (docs/MOTEUR_V2.md § 4 ; ses règles : docs/MISE_EN_SCENE.md, qui fait foi) :
 * `stage(result)` transforme la chronologie du moteur en moments, faits de cues datées. Fonction pure : ni React, ni
 * horloge, ni son joué. Le lecteur (`useCombat.ts`) ne fait qu'appliquer ces cues à leur instant, avec une seule
 * horloge (vitesse, pause, arrêt).
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
import { DAMAGE_SOURCES, type DamageSource, type DamageTone } from './damage'
import { isRollTrigger, relationOf, rollFace } from './events'
import {
  atCap,
  attackLog,
  coinLog,
  effectBadge,
  eventLog,
  flurryLog,
  relicLog,
  rollLog,
  shiftLog,
  skipLog,
  statusAgeLog,
  statusReactionLog,
  statusTickLog,
  type Badge,
  type LogEntry,
} from './narration'
import { RELICS } from './relics'
import { SCENE_EVENTS, sceneTarget, type SceneEventId } from './scenes'
import { signalTargets, STATES, STATUS_PLACE } from './states'
import { attackSpecials, reactionSpecial, relicSpecial, SPECIAL_SIGNS, type SpecialBadge, type SpecialSign, type SpecialSpec } from './specials'
import { isMechanic, STATUSES, type Polarity, type Status, type StatusId } from './statuses'
import type { sfx } from './sound'
import * as T from './timing'

/* ---------- Ce que l'écran affiche ---------- */

export interface DiceState {
  values: number[]
  /** Nombre de faces, pour colorer le jet maximal */
  faces: number
  rolling: boolean
  owner: Side | null
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
 * chronologie (`parts` pour une relâche de jauges), comme leur source.
 */
export interface Blow {
  key: number
  from: Side
  to: Side
  damage: number
  /** Ce que sont ces dégâts (damage.ts) : la teinte de leur chiffre (M37) */
  source: DamageSource
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
 * dégâts s'il monte avec l'impact d'un coup (`lift`) ; `hit` : ESQUIVE, CRITIQUE et le chiffre d'un coup, dans la teinte
 * de sa source (`tone`, M37), l'or s'il est critique ou lourd.
 */
export type Float =
  | { key: number; kind: 'title'; text: string; subtitle?: string }
  | { key: number; kind: 'badge'; badge: Badge; row: number; lift: boolean }
  | { key: number; kind: 'hit'; damage: number; crit: boolean; dodged: boolean; tone: DamageTone }

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
  /** Efface les labels sous le dé : tous, ou seulement ceux de `labels` (lus, quand d'autres restent à lire : M9) */
  | { channel: 'specialsClear'; labels?: string[] }
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

/** Les étapes provoquées par chaque étape (`cause`), dans l'ordre. */
export function childrenOf(beats: readonly Beat[]): Beat[][] {
  const children: Beat[][] = beats.map(() => [])
  for (const b of beats) if (b.cause !== undefined) children[b.cause].push(b)
  return children
}

/**
 * Face de compétence du coup `i` : la compétence que son dé déclenche (une étape `event` provoquée par le coup, quand
 * elle le modifie ou le remplace ; par son étape `roll`, quand elle s'y greffe). Undefined si le jet ne déclenche rien.
 */
export function skillFaceAt(beats: readonly Beat[], i: number, children = childrenOf(beats)): number | undefined {
  const beat = beats[i]
  if (beat?.type !== 'attack') return undefined
  const attack = beat.attack
  const roll = beat.cause !== undefined && beats[beat.cause].type === 'roll' ? [beat.cause] : []
  for (const from of [i, ...roll])
    for (const next of children[from])
      if (next.type === 'event' && next.event.side === attack.attacker) {
        const face = rollFace(next.event.trigger)
        if (face !== undefined) return face
      }
  return undefined
}

/**
 * Étape qui ne change rien (docs/MISE_EN_SCENE.md, M25) : chacun de ses effets est sans résultat (statut déjà à son
 * plafond, aura reposée telle quelle, pose bloquée par une immunité ou neutralisée par son opposé, purge à vide). Rien
 * ne s'active (ni aura, ni signal, ni label, ni son) : seuls ses textes neutres s'affichent.
 */
const idle = (effects: readonly AppliedEffect[]) =>
  effects.length > 0 &&
  effects.every((e) => atCap(e) || (e.type === 'applyStatus' && e.result.kind !== 'applied') || (e.type === 'cleanse' && e.removed.length === 0))

/**
 * Purges à vide (rien à retirer) : leur texte « Rien à purifier » ne s'affiche que si la purge est le seul effet de
 * l'étape, et une seule fois (M38). Sinon il se lit comme l'échec de ce qui vient d'arriver (le soin de la Larme de
 * givre, la Lumière de la Purification).
 */
function quietPurges(effects: readonly AppliedEffect[]): readonly AppliedEffect[] {
  const empty = (e: AppliedEffect) => e.type === 'cleanse' && e.removed.length === 0
  return effects.every(empty) ? effects.slice(0, 1) : effects.filter((e) => !empty(e))
}

/**
 * Une pose qui ne change rien se joue comme une pose au plafond (M25) : une aura non cumulable reposée telle quelle
 * (Aura de puissance, Aura d'immunité), que le moteur compte posée (`stacks` d'un statut `refresh`), alors que le
 * statut de sa cible est le même avant et après l'étape. Lu dans la chronologie (les états), sans rien recalculer.
 */
function quietReposes(beats: readonly Beat[]): Beat[] {
  return beats.map((beat, i) => {
    const before = beats[i - 1]?.state.statuses
    if (!before) return beat
    const same = (e: AppliedEffect) => {
      if (e.type !== 'applyStatus' || e.result.kind !== 'applied' || e.result.stacks === 0 || e.result.cancelled) return false
      const was = before[e.target].find((s) => s.id === e.status)
      return was !== undefined && JSON.stringify(was) === JSON.stringify(beat.state.statuses[e.target].find((s) => s.id === e.status))
    }
    const quiet = (effects: AppliedEffect[]) =>
      effects.some(same) ? effects.map((e): AppliedEffect => (same(e) && e.type === 'applyStatus' ? { ...e, result: { kind: 'applied', stacks: 0 } } : e)) : effects
    if (beat.type === 'event') {
      const effects = quiet(beat.event.effects)
      return effects === beat.event.effects ? beat : { ...beat, event: { ...beat.event, effects } }
    }
    if (beat.type === 'statusTick' || beat.type === 'statusReaction' || beat.type === 'relic') {
      const effects = quiet(beat.effects)
      return effects === beat.effects ? beat : { ...beat, effects }
    }
    return beat
  })
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
  /**
   * Poses dont les charges se lisent ailleurs, sur le coup ou sur un statut (Pourfendre, Virulence) : leur texte dit le
   * gain, « +10 Poison », le compteur de la zone d'état monte d'autant au même instant (M42)
   */
  counted?: readonly AppliedEffect[]
}

/**
 * Les textes flottants d'un effet à côté du combattant `side` (sans leur clé). Un seul texte par événement : le nom de
 * la compétence sur son lanceur suffit pour le statut qu'elle lui pose ; un bonus d'un autre nom (Œil de faucon pose
 * Critique assuré) devient son sous-titre. Restent des badges : PV, dégâts, malus posés, résistances, et les textes
 * sans effet. Un mécanisme de compétence posé (Pile ou face, Furie des vents) n'a pas de texte : son sceau le montre
 * (M39). `struck` : l'effet tombe avec l'impact d'un coup sur ce combattant (le Poison de l'Aura de décoction et
 * son « −7 ») : ce qui monte part au-dessus du chiffre des dégâts, ce qui tombe en dessous.
 */
export function fxFloats(fx: FxSpec, side: Side, struck = false): DistributiveOmit<Float, 'key'>[] {
  const isSource = fx.source === side
  const mine = fx.effects.filter((e) => e.target === side && !(e.type === 'applyStatus' && isMechanic(e.status)))
  const echoes = isSource && fx.title ? mine.filter((e) => e.type === 'applyStatus' && e.result.kind === 'applied' && !atCap(e)) : []
  const subtitle = [...new Set(echoes.flatMap((e) => (e.type === 'applyStatus' ? [STATUSES[e.status].name] : [])))]
    .filter((name) => name !== fx.title)
    .join(' · ')
  const badges: Badge[] = [
    ...mine
      .filter((e) => !echoes.includes(e))
      .map((e) =>
        e.type === 'applyStatus' && e.result.kind === 'applied' && e.result.stacks > 0 && fx.counted?.includes(e)
          ? { ...effectBadge(e), text: `+${e.result.stacks} ${STATUSES[e.status].name}` }
          : effectBadge(e),
      ),
    ...(fx.notes?.filter((n) => n.target === side) ?? []),
  ]
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

/**
 * Les moments d'un effet (pas d'un coup) auxquels un statut ou une relique répondent : le soin de leur porteur, le renvoi
 * qu'il vient de faire. Ce qu'ils déclenchent part au milieu de la lecture de l'effet (docs/MISE_EN_SCENE.md, M41).
 */
const EFFECT_MOMENTS: Partial<Record<string, true>> = { healed: true, reflected: true }

/**
 * Relique déclenchée par la valeur du dé (une face, le jet maximal : l'Osselet fendu, le Dé creux) : elle part avec le
 * dé posé, avant l'action qu'il décide (docs/MISE_EN_SCENE.md, M40).
 */
function isDieRelic(id: string): boolean {
  const trigger = RELICS.find((r) => r.id === id)?.trigger
  return trigger?.type === 'strike' && isRollTrigger(trigger.on)
}

/** Le point de départ du signal d'une relique : son sceau dans l'en-tête (`data-signal` de RelicRow, RelicSeal.tsx). */
export const relicSignal = (relic: string) => `relic:${relic}`

/* ---------- La mise en scène ---------- */

interface Preview {
  side: Side
  status: StatusId
  /** Tours affichés d'avance ; absent : le statut part d'avance (expiration) */
  turns?: number
  /** L'étape qui réalise ce changement */
  until: number
}

/**
 * Ce qu'un coup entraîne, rangé par instant (docs/MISE_EN_SCENE.md, M14 à M17). À l'impact : ce qu'il produit sans
 * nouveau coup (`rides`), la plaie qui coule (`flow`), les jauges qui rangent le coup (`quiet`, rien à montrer). Au
 * milieu de sa lecture : les réactions (`reactions` : Riposte, Épines, relique, compétence déclenchée par le coup).
 */
interface Consequences {
  rides: Beat[]
  flow?: Extract<Beat, { type: 'statusReaction' }>
  quiet: Beat[]
  reactions: Beat[]
}

/** Une rafale en cours : ses coups, le prochain à jouer, ses dés posés ; `covered` : une Furie a pris leur place (M27). */
interface Volley {
  strikes: number[]
  next: number
  dice: DiceState
  covered: boolean
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
  /**
   * Réaction à un coup de rafale, ou relique du dé d'un coup de rafale : elle ne s'attarde pas, la rafale garde son
   * rythme (M17 bis). Ni lecture après l'effet, ni attente avant ou après ses coups (le dernier se lit comme un coup de
   * rafale) ; son aura s'éteint avec la lecture du coup.
   */
  brisk?: true
  /** Effet d'une relique : ni aura ni titre sur la source ; avec un signal, son sceau et son label partent avec lui */
  relic?: true
  /** Instants des impacts depuis l'apparition (événement de scène) */
  schedule?: readonly number[]
  /** Compétence ou aura d'où part un signal d'activation, s'il pose un état visible */
  signal?: string
  /**
   * Le signal part de l'anneau d'une aura (`signal`) : sans état visible à poser, il file vers la cible de ses dégâts
   * directs (la Sentence), qui tombent à son arrivée (M19 bis)
   */
  ring?: true
  /** Ce que l'effet déclenche et qui part au milieu de sa lecture (ce qu'un soin déclenche, M41) */
  reactions?: readonly Beat[]
  notes?: FxSpec['notes']
  counted?: FxSpec['counted']
}

/**
 * Met en scène un combat résolu : les moments, dans l'ordre, de l'ouverture (initiative) au K.O. Chaque type d'étape
 * a sa mise en scène ci-dessous ; un nouveau type est refusé par TypeScript (`satisfies never`).
 */
export function stage(result: CombatResult, { test = false }: StageOptions = {}): Moment[] {
  const { fighters } = result
  const beats = quietReposes(result.beats)
  const children = childrenOf(beats)
  const ranks: number[] = []
  beats.reduce((n, b, i) => ((ranks[i] = n), n + diceOf(b).length), 0)
  const moments: Moment[] = []

  // Instant courant dans le moment en cours, et ce qui est à l'écran à cet instant
  let moment!: Moment
  let t = 0
  let key = 0
  let heard = new Set<string>()
  /** Les textes flottants posés récemment : combattant, sens (au-dessus ou en dessous), rang, instant (M31) */
  let placed: { side: Side; lift: boolean; row: number; at: number }[] = []
  let hp: Pair<number> = [fighters[0].maxHp, fighters[1].maxHp]
  let dice: DiceState = IDLE_DICE
  /** Les labels sous le dé et l'instant de leur pose dans le moment en cours */
  let labels: { label: string; at: number }[] = []
  /**
   * Labels qu'un nouveau dé a remplacés avant leur temps de lecture (`LABEL_READ`) : ils restent à l'écran jusqu'à leur
   * heure, puis partent seuls (M9). En rafale, le label d'une réaction n'est plus coupé par le coup suivant.
   */
  let leaving: { label: string; due: number }[] = []
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
  /** Étapes dont les statuts sont montrés avant leurs PV (la pièce, qui consomme son statut en partant, M26) */
  const shownEarly = new Set<number>()
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
    // Les labels encore à lire et les rangs des textes récents passent au moment suivant, sur son horloge
    labels = labels.map((l) => ({ ...l, at: l.at - t }))
    leaving = leaving.map((l) => ({ ...l, due: l.due - t }))
    placed = placed.flatMap((p) => (t - p.at < T.FLOAT_ROW ? [{ ...p, at: p.at - t }] : []))
  }
  /** Les labels remplacés dont l'heure est venue partent, chacun à son heure (M9). */
  const release = () => {
    const due = leaving.filter((l) => l.due <= t)
    if (due.length === 0) return
    leaving = leaving.filter((l) => l.due > t)
    for (const at of new Set(due.map((l) => l.due)))
      moment.cues.push({ at: Math.max(0, at), channel: 'specialsClear', labels: due.filter((l) => l.due === at).map((l) => l.label) })
  }
  /** Attend `ms` ; `name` dit d'où vient cette durée (constante de `timing.ts` ou libellé d'une durée calculée). */
  const wait = (ms: number, name: string) => {
    if (ms > 0) moment.spans.push({ at: t, ms, name })
    t += Math.max(0, ms)
    release()
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
  /**
   * Un nouveau dé efface les labels du précédent (M9) ; un label posé depuis moins de `LABEL_READ` reste jusqu'à son
   * heure (le label d'une réaction à un coup de rafale, que le coup suivant coupait avant qu'il ait fini d'apparaître).
   */
  const clearSpecials = () => {
    const young = labels.filter((l) => t - l.at < T.LABEL_READ)
    if (young.length === 0 && leaving.length === 0) emit({ channel: 'specialsClear' })
    else {
      const read = labels.filter((l) => !young.includes(l)).map((l) => l.label)
      if (read.length > 0) emit({ channel: 'specialsClear', labels: read })
      leaving = [...leaving, ...young.map((l) => ({ label: l.label, due: l.at + T.LABEL_READ }))]
    }
    labels = []
  }
  /**
   * Empile un label sous le dé (une seule fois par libellé pour un même jet) et joue le son de son signe. Un label encore
   * à l'écran, remplacé mais pas encore parti, sert au nouveau coup : il reste, son heure de départ est oubliée.
   */
  const addSpecial = (spec: SpecialSpec) => {
    sound(SPECIAL_SIGNS[spec.sign as SpecialSign].cue)
    if (labels.some((l) => l.label === spec.label)) return
    const shown = leaving.some((l) => l.label === spec.label)
    leaving = leaving.filter((l) => l.label !== spec.label)
    labels = [...labels, { label: spec.label, at: t }]
    if (!shown) emit({ channel: 'special', special: spec })
  }
  const setStrike = (next: Strike | null) => {
    strike = next
    emit({ channel: 'strike', strike: next })
    // Le coup de base, d'un type unique : le « coup blanc » (2026-10-24), la teinte d'un coup
    if (next?.landed)
      emit({ channel: 'float', side: other(next.attacker), float: { key: key++, kind: 'hit', damage: next.damage, crit: next.crit, dodged: next.dodged, tone: DAMAGE_SOURCES.strike.tone } })
  }
  const setBlow = (next: Blow | null) => {
    blow = next
    emit({ channel: 'blow', blow: next })
    if (next?.landed)
      emit({ channel: 'float', side: next.to, float: { key: key++, kind: 'hit', damage: next.damage, crit: next.heavy, dodged: false, tone: DAMAGE_SOURCES[next.source].tone } })
  }
  /** Ce combattant encaisse un coup arrivé, à cet instant (les textes qui montent passent au-dessus du chiffre) */
  const struck = (side: Side) =>
    strike && strike.attacker !== side ? strike.landed && !strike.dodged : !!blow && blow.to === side && blow.landed
  const setAura = (source: Side | null) => {
    if (source === null && !aura) return
    aura = source !== null
    emit({ channel: 'aura', fx: source === null ? null : { key: key++, source } })
  }
  /**
   * Les textes flottants d'un effet sur chaque combattant, sans toucher à l'aura. Aucun texte n'en recouvre un autre
   * (M31) : ceux d'un effet prennent, dans leur sens (au-dessus du chiffre ou en dessous), les premiers rangs libres,
   * ceux qu'un texte parti depuis moins de `FLOAT_ROW` tient encore (ce que le coup produit à l'impact, puis le soin
   * d'une relique au milieu de sa lecture). Un titre tient le premier rang au-dessus.
   */
  const emitFloats = (fx: FxSpec) => {
    const recent = placed.filter((p) => t - p.at < T.FLOAT_ROW)
    for (const side of [0, 1] as Side[]) {
      const floats = fxFloats(fx, side, struck(side))
      const sense = (f: (typeof floats)[number]) => f.kind === 'title' || (f.kind === 'badge' && f.lift)
      for (const lift of [true, false]) {
        const mine = floats.filter((f) => sense(f) === lift)
        if (mine.length === 0) continue
        const rowOf = (f: (typeof floats)[number]) => (f.kind === 'badge' ? f.row : 0)
        const span = Math.max(...mine.map(rowOf)) + 1
        const busy = new Set(recent.filter((p) => p.side === side && p.lift === lift).map((p) => p.row))
        let offset = 0
        while (Array.from({ length: span }, (_, r) => offset + r).some((r) => busy.has(r))) offset++
        for (const f of mine) {
          const row = rowOf(f) + offset
          placed.push({ side, lift, row, at: t })
          emit({ channel: 'float', side, float: { key: key++, ...(f.kind === 'badge' ? { ...f, row } : f) } as Float })
        }
      }
    }
  }
  /** Les effets apparaissent : aura sur la source, textes flottants sur chaque combattant */
  const showFx = (fx: FxSpec, relic = false) => {
    setAura(relic ? null : fx.source)
    emitFloats(fx)
  }
  const log = (entry: Omit<LogEntry, 'id'>) => emit({ channel: 'log', entry })
  const pulse = (side: Side, face: number | undefined) => {
    if (face !== undefined) emit({ channel: 'skillPulse', side, face })
  }
  const showHp = (next: Pair<number>) => {
    hp = next
    emit({ channel: 'hp', hp })
  }

  /**
   * Les statuts à l'écran : ceux de l'étape montrée, avec les décomptes et expirations montrés d'avance. Une étape
   * antérieure pas encore jouée (la Riposte, jouée au milieu du coup dont le poison est déjà tombé à l'impact) garde
   * ses changements pour son propre instant : ses statuts restent comme avant elle (docs/MISE_EN_SCENE.md, M3).
   */
  const display = (state: Pair<Status[]>): Pair<Status[]> => {
    let shown = state
    for (let d = shownState - 1; d > settledUpTo; d--) {
      if (settled.has(d) || shownEarly.has(d)) continue
      const before = beats[d - 1]?.state.statuses ?? [[], []]
      const after = beats[d].state.statuses
      shown = shown.map((list, side) => {
        let out = list
        for (const id of new Set([...before[side], ...after[side]].map((s) => s.id))) {
          const was = before[side].find((s) => s.id === id)
          if (JSON.stringify(was) === JSON.stringify(after[side].find((s) => s.id === id))) continue
          const at = out.findIndex((s) => s.id === id)
          if (!was) out = out.filter((s) => s.id !== id)
          else if (at >= 0) out = out.map((s) => (s.id === id ? was : s))
          else out = [...out.slice(0, before[side].indexOf(was)), was, ...out.slice(before[side].indexOf(was))]
        }
        return out
      }) as Pair<Status[]>
    }
    if (previews.length === 0) return shown
    return shown.map((list, side) =>
      list.flatMap((s) => {
        const p = previews.filter((x) => x.side === side && x.status === s.id)
        if (p.some((x) => x.turns === undefined)) return []
        const turns = p.find((x) => x.turns !== undefined)?.turns
        return turns === undefined ? [s] : [{ ...s, turns }]
      }),
    ) as Pair<Status[]>
  }
  /**
   * Montre les statuts de l'étape `id`. Une étape déjà dépassée à l'écran (la Riposte, jouée après le poison que le
   * coup a posé à son impact) ne fait pas revenir l'état en arrière : ses propres changements, retenus par `display`
   * jusque-là, apparaissent à son instant.
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
   * Ce que le coup qui vient de toucher (attaque, ou pièce sur pile) produit sans nouveau coup, sur sa cible ou sur
   * le frappeur : la réaction du frappeur sur `hit` qui pose des statuts sur sa cible (poison de l'Aura de décoction)
   * ou lui rend des PV (Vol de vie), ou la compétence qui modifie le coup s'il touche (Pourfendre : Saignement ;
   * Crescendo, Soliste : ce coup ×N, sans autre effet ; Pile ou face : son mécanisme, muet, M26). Jouées à son impact
   * (`landRide`, docs/MISE_EN_SCENE.md, M14).
   */
  const ridesOf = (hit: Beat): Beat[] => {
    const striker = hit.type === 'attack' ? hit.attack.attacker : hit.type === 'coin' ? hit.side : undefined
    if (striker === undefined) return []
    const quietOrOnTarget = (effects: readonly AppliedEffect[]) =>
      effects.every((e) => e.type === 'applyStatus' && (e.target !== striker || isMechanic(e.status)))
    return children[hit.id].filter((next) => {
      if (next.type === 'event')
        return (
          hit.type === 'attack' &&
          next.event.side === striker &&
          relationOf(fighters[striker].events.find((e) => e.id === next.event.eventId) ?? {}) === 'modify' &&
          quietOrOnTarget(next.event.effects)
        )
      return (
        next.type === 'statusReaction' &&
        next.side === striker &&
        next.trigger === 'hit' &&
        next.effects.length > 0 &&
        next.effects.every((e) => (e.type === 'applyStatus' && e.target !== striker) || (e.type === 'heal' && e.target === striker))
      )
    })
  }
  /** Étapes déjà jouées avec le coup qui les a provoquées : à leur place, il ne reste rien à montrer */
  const absorbed = new Set<number>()
  /**
   * Étapes qui tombent sans attente de plus (`LEAD`) : la compétence d'un jet remplacé ou greffé, un battement après son
   * dé (M10), et les réactions au coup, au milieu de sa lecture (M17)
   */
  const snapped = new Set<number>()
  /** Étapes jouées au rythme d'une rafale : réactions à un coup de rafale, reliques du dé d'un coup de rafale (M17 bis) */
  const brisk = new Set<number>()

  /* ----- Mise en scène de chaque sorte d'étape ----- */

  /**
   * Affiche des effets ; `apply` met à jour PV, statuts et journal au moment de l'apparition. `blows` : les dégâts
   * directs sur l'adversaire de `source` sont joués comme des coups (avec ou sans élan) au lieu d'un simple badge ;
   * ce que l'effet pose sur la cible des coups tombe alors avec leur dernier impact, textes et zone d'état ensemble (M21).
   * Une scène (`schedule`) porte son propre rythme : ses coups tombent sur ses impacts, comptés depuis l'apparition.
   */
  function showEffects(source: Side | null, title: string, effects: readonly AppliedEffect[], apply: () => void, o: ShowOpts = {}) {
    const hits = source !== null && o.blows ? effects.filter((e) => e.type === 'damage' && e.target !== source && e.amount > 0) : []
    const landing = hits.length > 0 ? effects.filter((e) => !hits.includes(e) && e.target === hits[0].target) : []
    if (o.lead !== 0) hold('LEAD')
    // Le signal file vers la zone d'état où un état apparaît ; de l'anneau d'une aura qui n'en pose pas, vers la cible
    // de ses dégâts directs, qui tombent à son arrivée (M19 bis)
    const ringed = o.ring && hits.length > 0 ? { to: [hits[0].target], polarity: 'negative' as const } : undefined
    const aim = o.signal !== undefined && source !== null ? (signalTargets(effects) ?? ringed) : undefined
    // Une relique s'annonce (sceau et label) au départ de son signal, ses effets tombent à son arrivée (M23)
    const early = !!aim && !!o.relic
    const announce = () => {
      o.onShow?.()
      if (o.special) addSpecial(o.special)
    }
    if (aim) {
      emit({ channel: 'signal', signal: { side: source!, from: o.signal!, ...aim } })
      if (early) announce()
      hold('SIGNAL')
    }
    if (!early) o.onShow?.()
    const cue = o.cue !== undefined ? o.cue : cueOf(source, effects)
    if (cue) sound(cue)
    showFx({ source, title, effects: effects.filter((e) => !hits.includes(e) && !landing.includes(e)), notes: o.notes, counted: o.counted }, o.relic)
    if (!early && o.special) addSpecial(o.special)
    // Ce qu'il déclenche (un soin, un renvoi : M41) part au milieu de sa lecture, ou de celle de son dernier coup, et la
    // prolonge ; en rafale, la réaction suivante part sans attendre (M17 bis)
    const later = o.brisk ? [] : (o.reactions?.filter((b) => !absorbed.has(b.id)) ?? [])
    if (hits.length > 0 && source !== null) {
      // Le vol du signal vers la cible des coups tient lieu d'attente avant eux, comme le rythme d'une scène
      if (!o.brisk && !o.schedule && !aim?.to.includes(hits[0].target)) hold('BLOWS_LEAD')
      blows(source, hits, o.blows === 'lunge', o.impact ?? ((_, heavy) => (heavy ? 'crit' : 'hit')), {
        schedule: o.schedule,
        onLand: (last) => {
          if (!last) return
          if (landing.length > 0) emitFloats({ source: null, title: '', effects: landing })
          apply()
        },
        ...(o.brisk ? { lastHold: 'VOLLEY_STRIKE_HOLD' as const } : later.length > 0 ? { lastHold: 'REACTION_LEAD' as const } : {}),
      })
      if (later.length > 0) react(later)
      else if (!o.brisk) hold('BLOWS_HOLD')
    } else {
      apply()
      if (later.length > 0) react(later, 'EFFECT_REACTION_LEAD')
      else if (!o.brisk) hold(o.hold ?? 'READ_HOLD')
    }
    if (!o.brisk) setAura(null)
  }

  /**
   * Coups de compétence : chaque montant (ou chaque jauge d'une relâche) part comme un coup ; les PV tombent coup par
   * coup, depuis ceux à l'écran. Le dernier d'une série est lourd ; `heavy` : le coup est lourd quelle que soit sa force
   * (le coup de pile, M26). `schedule` (événement de scène) : l'instant de chaque impact ; les coups sont alors égaux,
   * aucun n'est lourd. `onLand` : à chaque impact (`last` : le dernier).
   * `lastHold` : la lecture après le dernier coup (sinon `BLOW_LAST_HOLD`). Le coup en cours s'efface au premier élan :
   * la Riposte part pendant que l'attaquant revient en place.
   */
  function blows(
    from: Side,
    hits: readonly AppliedEffect[],
    lunge: boolean,
    impact: (damage: number, heavy: boolean) => SfxName,
    o: { schedule?: readonly number[]; onLand?: (last: boolean) => void; lastHold?: TimingName; heavy?: true } = {},
  ) {
    const parts = hits.flatMap((e) => (e.type === 'damage' ? (e.parts ?? [e.amount]).map((n) => ({ n, to: e.target, source: e.source })) : []))
    if (strike && parts.length > 0) setStrike(null)
    let elapsed = 0
    for (const [k, part] of parts.entries()) {
      const at = o.schedule?.[k]
      const last = k === parts.length - 1
      const heavy = at === undefined && (parts.length > 1 ? last : !!o.heavy || part.n >= HEAVY_BLOW)
      const id = key++
      const wind: TimingName = lunge ? 'BLOW_WIND' : 'BLOW_WIND_REACTION'
      // Au rythme imposé, le chiffre du coup précédent reste à l'écran jusqu'à l'élan de celui-ci
      if (at !== undefined) {
        wait(Math.max(0, at - T[wind] - elapsed), 'rythme de la scène')
        elapsed = Math.max(elapsed, at)
      }
      setBlow({ key: id, from, to: part.to, damage: part.n, source: part.source, heavy, lunge, landed: false })
      hold(wind)
      if (heavy) hold('HEAVY_FREEZE') // arrêt sur image avant le gros coup
      sound(impact(part.n, heavy))
      const next = [...hp] as Pair<number>
      next[part.to] = Math.max(0, next[part.to] - part.n)
      // Le coup qui met K.O. est le dernier montré : on ne frappe pas un combattant à terre
      const end = last || next[part.to] === 0
      showHp(next)
      setBlow({ key: id, from, to: part.to, damage: part.n, source: part.source, heavy, lunge, landed: true })
      o.onLand?.(end)
      if (at === undefined || end) hold(end ? (o.lastHold ?? 'BLOW_LAST_HOLD') : 'BLOW_HOLD')
      if (end) break
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

  /**
   * Ce que le coup produit sans nouveau coup tombe à son impact, avec son label (Vol de vie) ; son son suit le Coup
   * d'un battement (SONS.md § 4.1).
   */
  function landRide(ride: Beat) {
    const side = ride.type === 'event' ? ride.event.side : ride.type === 'statusReaction' ? ride.side : undefined
    const effects = beatEffects(ride)
    showFx({ source: null, title: '', effects, counted: countedOf(ride) })
    if (ride.type === 'statusReaction') {
      const special = reactionSpecial(ride.status, ride.side === ride.owner ? 'attacker' : 'defender', ride.effects)
      if (special) addSpecial(special)
    }
    settle(ride)
    showStatuses(ride.id)
    log(ride.type === 'event' ? eventLog(ride.event, fighters) : statusReactionLog(side!, (ride as Extract<Beat, { type: 'statusReaction' }>).status, [...effects], fighters))
    const cue = cueOf(side ?? null, effects)
    if (cue) sound(cue, undefined, t + T.RIDE_CUE)
  }

  /**
   * Ce qu'un coup entraîne, rangé par instant : voir `Consequences`. Une relique ou un statut déclenchés par ce que le
   * coup produit (l'Encens de l'abbaye, causé par le soin du Vol de vie), par la plaie qui coule ou par une autre
   * réaction (une relique de seuil en chaîne, la Vindicte après la Riposte) sont des réactions au coup, eux aussi (M17) ;
   * les réactions se jouent dans l'ordre du moteur. La plaie qui coule tombe à l'impact (M15), sauf si elle met K.O. son
   * porteur après qu'il a réagi au coup (sa Riposte) : elle garde alors son rang parmi les réactions, pour qu'on ne voie
   * pas un combattant à terre riposter (M43).
   */
  function consequencesOf(hit: Beat): Consequences {
    const rides = ridesOf(hit)
    const wound = hit.type === 'attack' ? flowOf(hit) : undefined
    const answered = (w: Beat) =>
      children[hit.id].some((b) => b.id < w.id && !rides.includes(b) && !absorbed.has(b.id) && !(b.type === 'statusReaction' && b.effects.length === 0))
    const flow = wound && wound.state.hp[wound.side] === 0 && answered(wound) ? undefined : wound
    const quiet: Beat[] = []
    const reactions: Beat[] = []
    for (const next of children[hit.id]) {
      // Déjà jouée avant le coup : une relique du dé (M40)
      if (rides.includes(next) || next === flow || absorbed.has(next.id)) continue
      if (next.type === 'statusReaction' && next.effects.length === 0) quiet.push(next)
      else if (next.type === 'statusReaction' || next.type === 'relic' || (next.type === 'event' && rollFace(next.event.trigger) === undefined))
        reactions.push(next)
    }
    const carriers = [...rides, ...(flow ? [flow] : []), ...reactions]
    for (const from of carriers)
      for (const next of children[from.id])
        if ((next.type === 'relic' || (next.type === 'statusReaction' && next.effects.length > 0)) && !reactions.includes(next)) {
          reactions.push(next)
          carriers.push(next)
        }
    reactions.sort((x, y) => x.id - y.id)
    return { rides, flow, quiet, reactions }
  }

  /**
   * Ce qui répond à un effet (M41) : un soin (la Sentence, l'Encens de l'abbaye), un renvoi (la Vindicte, le Gantelet du
   * talion, après une Riposte ou une Rétribution). Un statut qui réagit, une relique d'un moment du coup.
   */
  function answersEffect(next: Beat): boolean {
    if (next.type === 'statusReaction') return next.effects.length > 0 && !!EFFECT_MOMENTS[next.trigger]
    const trigger = next.type === 'relic' ? RELICS.find((r) => r.id === next.relic)?.trigger : undefined
    return trigger?.type === 'strike' && !!EFFECT_MOMENTS[trigger.on]
  }
  /**
   * Ce que déclenche une étape d'effets (une compétence, un statut qui agit, une relique, une réaction au coup qui soigne
   * ou qui renvoie) : il part au milieu de sa lecture, ou de la lecture de son dernier coup (M41), sauf en rafale, où la
   * réaction suivante part sans attendre
   */
  const answersOf = (beat: Beat) => children[beat.id].filter((next) => answersEffect(next) && !absorbed.has(next.id))
  /**
   * Les poses dont les charges se lisent ailleurs (sur le coup : Pourfendre ; sur un statut : Virulence) : leur texte dit
   * le gain (M42). Lues dans la définition de la compétence, effet par effet.
   */
  function countedOf(beat: Beat): AppliedEffect[] {
    if (beat.type !== 'event') return []
    const def = fighters[beat.event.side].events.find((e) => e.id === beat.event.eventId)
    if (!def || def.effects.length !== beat.event.effects.length) return []
    return beat.event.effects.filter((_, k) => {
      const asked = def.effects[k]
      return asked.type === 'applyStatus' && (asked.fromHit !== undefined || asked.fromStatus !== undefined)
    })
  }

  /** À l'impact : les statuts posés et les PV rendus, les jauges qui comptent le coup, puis la plaie qui coule. */
  function land({ rides, flow, quiet }: Consequences) {
    for (const ride of rides) {
      absorbed.add(ride.id)
      landRide(ride)
    }
    for (const gauge of quiet) {
      absorbed.add(gauge.id)
      settle(gauge)
      showStatuses(gauge.id)
    }
    if (flow) {
      absorbed.add(flow.id)
      bleedOut(flow)
    }
  }

  /**
   * Au milieu de la lecture du coup (`lead`, déjà attendu si absent) : ses réactions, chacune sans `LEAD`. `quick` :
   * coup de rafale, ses réactions ne s'attardent pas (M17 bis).
   */
  function react(reactions: readonly Beat[], lead?: TimingName, quick = false) {
    if (reactions.length === 0) return
    if (lead) hold(lead)
    for (const reaction of reactions) {
      // Déjà jouée : ce qu'un soin a déclenché, parti au milieu de sa lecture (M41)
      if (absorbed.has(reaction.id)) continue
      absorbed.add(reaction.id)
      snapped.add(reaction.id)
      if (quick) brisk.add(reaction.id)
      stageBeat(reaction)
    }
  }

  /**
   * Les reliques que la valeur du dé de ce coup déclenche (M40), et celles qu'elles déclenchent à leur tour (le Trophée
   * du chasseur après les dégâts de l'Osselet fendu), dans l'ordre du moteur. Une relique du dé qui met fin au combat
   * reste après le coup (une réaction), pour que le coup ne frappe pas un adversaire déjà à terre.
   */
  function dieRelicsOf(hit: Beat): Beat[] {
    const found = children[hit.id].filter((b) => b.type === 'relic' && isDieRelic(b.relic) && b.state.hp.every((x) => x > 0))
    for (const from of found) for (const next of children[from.id]) if (next.type === 'relic' && !found.includes(next)) found.push(next)
    return found.sort((x, y) => x.id - y.id)
  }

  /**
   * Les reliques du dé partent avec le dé posé, avant l'action qu'il décide (M40) : son sceau et son label, puis ses
   * effets (signal, ou coups de relique). `quick` : un dé de rafale, elles suivent son rythme (M17 bis). Rend vrai si
   * une relique est partie : l'action suit alors leur lecture, sans second battement.
   */
  function playDieRelics(hit: Beat, quick: boolean): boolean {
    const relics = dieRelicsOf(hit).filter((b) => !absorbed.has(b.id))
    for (const relic of relics) {
      absorbed.add(relic.id)
      snapped.add(relic.id)
      if (quick) brisk.add(relic.id)
      stageBeat(relic)
    }
    return relics.length > 0
  }

  /**
   * Rafales en cours, la plus récente en dernier (Furie des vents, Coup de chance, Duo) : ses coups, le prochain à
   * jouer, ses dés posés. Une Furie posée par un jet d'une rafale (un jet de Coup de chance ou du Duo) s'empile sur elle :
   * ses dés remplacent ceux de la rafale le temps de ses coups (`covered`), puis ceux-ci reviennent, sans nouveau
   * roulement (M27).
   */
  const volleys: Volley[] = []
  /** Les dés de la rafale reviennent à plat, après ceux de la Furie qu'un de ses jets a posée */
  const uncover = (volley: Volley) => {
    if (!volley.covered) return
    volley.covered = false
    setDice(volley.dice)
    hold('VOLLEY_FLAT')
  }

  /**
   * Le coup d'une action : le dé roule, retombe, l'élan part, l'impact tombe. `rolled` : le dé est déjà tombé (étape
   * `roll`, et la compétence greffée qui a suivi, ses reliques du dé aussi) : le coup part de là, sans nouveau jet.
   */
  function stageAttack(beat: Extract<Beat, { type: 'attack' }>, face: number | undefined, grouped: boolean, rolled: boolean) {
    const { attack } = beat
    const { attacker, faces } = attack
    const shown = { ...IDLE_DICE, faces, owner: attacker, critMultiplier: attack.critMultiplier }
    const specials = attackSpecials(attack)

    // Jet greffé : son dé, ses labels et ses reliques du dé sont déjà tombés avec l'étape `roll` ; ils restent
    if (rolled) patchDice({ critMultiplier: attack.critMultiplier })
    else {
      setDice({ ...shown, values: [0], rolling: true })
      sound('diceRoll', T.DICE_ROLL)
      hold('DICE_ROLL')
      sound('diceLand')
      // Ce que la valeur du dé décide s'allume avec lui : la compétence qui remplace le coup (M10) comme celle qui le
      // modifie (Pourfendre, Crescendo : M11 ; elle n'existe que si le coup touche, son effet tombe à l'impact)
      pulse(attacker, face)
      setDice({ ...shown, values: [attack.roll], forced: attack.forced })
      rollSpecials(attack)
    }
    // Les reliques du dé partent avec lui (M40) ; l'action suit leur lecture, sans second battement
    const relicked = !rolled && playDieRelics(beat, false)
    const after = consequencesOf(beat)
    const base = hp

    // Jet remplacé par sa compétence : pas d'élan ; la compétence qui suit prend le relais un battement après le dé
    // posé, comme l'élan d'un coup (docs/MISE_EN_SCENE.md, M10)
    if (attack.replaced) {
      settle(beat, base)
      showStatuses(beat.id)
      log(attackLog(beat.turn, attack, fighters, hp[other(attacker)]))
      if (!relicked) hold(grouped ? 'DICE_READ' : 'FORFEIT_HOLD')
      return
    }

    if (!rolled && !relicked) hold('DICE_READ')
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
    log(attackLog(beat.turn, attack, fighters, hp[other(attacker)]))
    afterImpact(after, after.flow ? 'STRIKE_FLOW_HOLD' : 'STRIKE_HOLD', 'REACTION_LEAD')
  }

  /**
   * Un coup de la rafale : pas de nouveau jet, élan court, impact presque immédiat. Son dé ressort : ce que sa valeur
   * décide s'allume avec lui (la compétence qui remplace ou modifie le coup, M10 et M11 ; ses reliques du dé, M40), sauf
   * pour un jet greffé, dont l'étape `roll` l'a déjà fait (`rolled`).
   */
  function stageVolleyStrike(beat: Extract<Beat, { type: 'attack' }>, index: number | undefined, face: number | undefined, grouped: boolean, rolled: boolean) {
    const { attack } = beat
    const specials = attackSpecials(attack)
    patchDice({ active: index, crit: attack.crit, critForced: attack.critForced, critMultiplier: attack.critMultiplier })
    if (!rolled) {
      if (labels.length > 0) clearSpecials()
      pulse(attack.attacker, face)
      rollSpecials(attack)
      playDieRelics(beat, true)
    }
    for (const s of specials.crit) addSpecial(s)
    const after = consequencesOf(beat)
    const base = hp
    if (attack.replaced) {
      // Le dé de la rafale ressort, son dé de l'en-tête s'allume, et sa compétence suit sans attente
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
    afterImpact(after, after.flow ? 'VOLLEY_FLOW_HOLD' : 'VOLLEY_STRIKE_HOLD', 'VOLLEY_REACTION_LEAD', true)
  }

  /**
   * Après l'impact d'un coup : ce qu'il entraîne (M14 à M17), ses réactions au milieu de sa lecture (`lead`), puis il
   * s'efface au terme de sa lecture (`read`), même quand ses réactions durent plus longtemps : la posture d'attaque et
   * l'étoile d'impact gardent leur durée. Une Riposte l'efface plus tôt, à son élan (`blows`). `volley` : un coup de
   * rafale, dont les réactions ne s'attardent pas ; il finit sa lecture et la rafale garde son rythme (M17 bis).
   */
  function afterImpact(after: Consequences, read: TimingName, lead: TimingName, volley = false) {
    land(after)
    const end = t + T[read]
    if (after.reactions.length > 0) {
      react(after.reactions, lead, volley)
      if (volley && t < end) hold('VOLLEY_REACTION_REST')
    } else hold(read)
    if (strike) {
      strike = null
      emit({ channel: 'strike', strike: null }, Math.min(t, end))
    }
    // L'aura de ce qu'il a produit, de sa plaie, ou de ses réactions de rafale, s'éteint avec sa lecture
    setAura(null)
  }

  /**
   * Rafale : tous les dés roulent ensemble, le second jaillit, ou apparaît dans sa couleur s'il est d'une autre sorte
   * (les dés du statut, après le premier). `flat` : rafale instantanée (Furie des vents), déclenchée par le dé qui vient
   * de tomber : les dés apparaissent d'un coup, à plat.
   */
  function rollVolley(attacks: Attack[], color: string | undefined, flat: boolean): DiceState {
    const { attacker, faces } = attacks[0]
    const shown: DiceState = {
      ...IDLE_DICE,
      faces,
      owner: attacker,
      volley: true,
      dieFaces: attacks.map((a) => a.faces),
      dieColors: attacks.map((_, k) => (k >= 1 ? color : undefined)),
    }
    const landed = { ...shown, values: attacks.map((a) => a.roll), forced: attacks.some((a) => a.forced) }
    if (flat) {
      setDice(landed)
      hold('VOLLEY_FLAT')
      return landed
    }
    setDice({ ...shown, values: attacks.map(() => 0), rolling: true })
    // Un seul dé lancé et un seul dé posé pour toute la rafale : un instant, un son
    sound('diceRoll', T.DICE_ROLL_MANY)
    hold('DICE_ROLL_MANY')
    sound('diceLand')
    setDice(landed)
    hold('DICE_LAND_HOLD')
    return landed
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
        const face = skillFaceAt(beats, beat.id, children)
        // Le jet déclenche une compétence qui remplace le coup : tout tombe ensemble, au moment où le dé s'arrête
        const skill = beat.attack.replaced && face !== undefined ? children[beat.id].find((b) => b.type === 'event' && rollFace(b.event.trigger) === face) : undefined
        if (skill) snapped.add(skill.id)
        // Un jet greffé : son dé est déjà tombé, sa compétence s'est déjà montrée (étape `roll`)
        const rolled = beat.cause !== undefined && beats[beat.cause].type === 'roll'
        // Sa greffe a posé une rafale instantanée qui part juste après ce coup (la Curée) : pas de repos, la rafale suit
        // au rythme de ses coups (M27)
        const burst = rolled && children[beat.cause!].some((g) => g.type === 'event' && children[g.id].some((f) => f.type === 'flurry'))
        const volley = volleys.at(-1)
        if (volley?.strikes.includes(beat.id)) {
          uncover(volley)
          const index = volley.next++
          stageVolleyStrike(beat, index, face, !!skill, rolled)
          const last = volley.next === volley.strikes.length
          if (last) volleys.pop()
          if (!skill) hold(last && volleys.length === 0 && !burst ? 'STRIKE_REST' : 'VOLLEY_GAP')
          break
        }
        stageAttack(beat, face, !!skill, rolled)
        if (!skill) hold(burst ? 'VOLLEY_GAP' : 'STRIKE_REST')
        break
      }
      case 'roll': {
        // Le dé tombe ; le sceau de la compétence greffée s'allume avec lui, et elle suit un battement après, comme l'élan
        // d'un coup (M10). Dans une rafale (Coup de chance, Duo), le dé est déjà sur le plateau : il ne roule pas de
        // nouveau, il ressort
        const grafts = children[beat.id].filter((b) => b.type === 'event')
        for (const g of grafts) snapped.add(g.id)
        // Le coup de base de ce dé : ses labels du jet et ses reliques du dé tombent ici, avec le dé (M8, M40)
        const strikeOf = children[beat.id].find((b): b is Extract<Beat, { type: 'attack' }> => b.type === 'attack')
        const volley = volleys.at(-1)
        const index = volley ? volley.strikes.findIndex((id) => children[beat.id].some((b) => b.id === id)) : -1
        if (volley && index >= 0) {
          uncover(volley)
          patchDice({ active: index })
          if (labels.length > 0) clearSpecials()
        } else {
          const shown = { ...IDLE_DICE, faces: beat.faces, owner: beat.side }
          setDice({ ...shown, values: [0], rolling: true })
          sound('diceRoll', T.DICE_ROLL)
          hold('DICE_ROLL')
          sound('diceLand')
          setDice({ ...shown, values: [beat.roll], forced: beat.forced })
        }
        if (grafts.length > 0) pulse(beat.side, beat.roll)
        if (strikeOf) rollSpecials(strikeOf.attack)
        settle(beat)
        showStatuses(beat.id)
        log(rollLog(beat.turn, beat.side, beat.roll, fighters))
        // Les reliques du dé partent avec lui, avant la compétence greffée, qui suit alors leur lecture sans second
        // battement (M40)
        const relicked = strikeOf !== undefined && playDieRelics(strikeOf, index >= 0)
        if (!relicked) hold('DICE_READ')
        break
      }
      case 'event': {
        const def = fighters[beat.event.side].events.find((e) => e.id === beat.event.eventId)
        // Une compétence à événement de scène (Foudre) le lance d'abord : ses dégâts tombent sur ses impacts, sans élan
        const timing = def?.scene ? SCENE_EVENTS[def.scene] : undefined
        const effects = quietPurges(beat.event.effects)
        // Rien n'a changé (plafond, aura reposée telle quelle, immunité) : rien ne s'active, seuls les textes neutres (M25)
        const still = idle(effects)
        if (def?.scene) emit({ channel: 'scene', scene: { id: def.scene, source: beat.event.side, target: sceneTarget(def.scene, beat.event.side) } })
        const base = hp
        // Aucun nom flottant au-dessus du lanceur : son sceau dans la barre de compétences s'allume déjà
        showEffects(
          still ? null : beat.event.side,
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
            ...(timing && { schedule: timing.impacts, impact: () => timing.sound ?? 'hit' }),
            // Furie instantanée : ses frappes suivent vite (son nom est déjà tombé avec le dé)
            hold: children[beat.id].some((b) => b.type === 'flurry') ? 'FLURRY_CHAIN_HOLD' : undefined,
            signal: beat.event.eventId,
            counted: countedOf(beat),
            reactions: answersOf(beat),
            // Compétence déclenchée par un coup de rafale : la rafale garde son rythme (M17 bis), une scène le sien (M24)
            ...(brisk.has(beat.id) && { brisk: true as const }),
          },
        )
        break
      }
      case 'statusTick': {
        previewCounts(beat)
        // Un statut qui agit sur l'adversaire s'annonce au-dessus de son porteur, sauf une aura (son anneau envoie le
        // signal). Le poison subi n'a que son texte. Un statut dont la pose ne change rien n'annonce rien (M25).
        const outward = beat.effects.some((e) => e.target !== beat.side) && !idle(beat.effects)
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
          {
            ...(harms && { cue: STATUSES[beat.status].tickSound ?? ('rot' as const) }),
            ...(fromRing && { signal: beat.status, ring: true as const }),
            reactions: answersOf(beat),
          },
        )
        break
      }
      case 'statusReaction': {
        // Jauges qui se remplissent (Rétribution) : rien à jouer, le sceau compte le coup rangé dès que l'état est montré
        if (beat.effects.length === 0) {
          settle(beat)
          showStatuses(beat.id)
          break
        }
        // Riposte, Épines, Vol de vie, Saignement : une réaction au coup en cours, vue de l'attaquant (le maître du tour)
        const def = STATUSES[beat.status]
        const reflects = def.reflectsHit !== undefined
        const harms = beat.effects.some((e) => e.type === 'damage' && e.target !== beat.side)
        const wound = beat.effects.reduce((n, e) => n + (e.type === 'damage' && e.target === beat.side ? e.amount : 0), 0)
        // Rien n'a changé (Saignement des Épines résisté par une immunité, plafond) : ni label ni son (M25)
        const still = idle(beat.effects)
        const special = still ? undefined : reactionSpecial(beat.status, beat.side === beat.owner ? 'attacker' : 'defender', beat.effects)
        // Son nom ne flotte plus au-dessus du porteur quand son label le dit déjà sous le dé ; une aura ne flotte pas son
        // nom, son anneau s'allume et envoie le signal (M32) ; un mécanisme de compétence qui agit (l'Embrasement) non plus :
        // le sceau de la compétence qui l'a posé s'allume (M39)
        const ring = STATUS_PLACE[beat.status].place === 'aura'
        const mechanic = isMechanic(beat.status)
        const named = wound === 0 && !still && !special && !ring && !mechanic
        const seal = mechanic
          ? fighters[beat.side].events.map((e) => (e.effects.some((x) => x.type === 'applyStatus' && x.status === beat.status) ? rollFace(e.trigger) : undefined)).find((f) => f !== undefined)
          : undefined
        const base = hp
        showEffects(
          wound > 0 || still ? null : beat.side,
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
            ...(seal !== undefined && { onShow: () => pulse(beat.side, seal) }),
            // Une aura agit depuis son anneau : la lueur part de lui (l'Aura de décoction empoisonne à chaque coup ; la
            // Sentence frappe à chaque soin, M19 bis)
            ...(ring && { signal: beat.status, ring: true }),
            reactions: answersOf(beat),
            // Réaction au coup : elle part au milieu de sa lecture, sans attente de plus (M17)
            ...(snapped.has(beat.id) && { lead: 0 }),
            // Réaction à un coup de rafale : elle ne s'attarde pas, la rafale garde son rythme (M17 bis)
            ...(brisk.has(beat.id) && { brisk: true }),
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
        const def = STATUSES[beat.status]
        const apply = () => {
          settle(beat)
          showStatuses(beat.id)
          log(flurryLog(beat.turn, beat.side, beat.status, beat.strikes, fighters))
        }
        if (chained) apply()
        else showEffects(beat.side, def.name, [], apply)
        // Tous les dés de la rafale roulent ensemble : en combat test, le joueur les choisit d'abord, un par un
        moment.rolls.push({ at: t, upTo: ranks[beat.id] + beat.strikes })
        // Les coups de la rafale : ses coups, et ceux de ses jets greffés, sous leur étape `roll`
        const strikes = children[beat.id]
          .flatMap((b) => (b.type === 'roll' ? children[b.id] : [b]))
          .filter((b): b is Extract<Beat, { type: 'attack' }> => b.type === 'attack')
          .slice(0, beat.strikes)
        if (strikes.length > 0) {
          // Les dés du statut prennent sa couleur, après le premier (le dé de la Furie, le dé de l'action)
          const outer = volleys.at(-1)
          if (outer) outer.covered = true
          const landed = rollVolley(
            strikes.map((b) => b.attack),
            def.look?.dieColor,
            chained,
          )
          volleys.push({ strikes: strikes.map((b) => b.id), next: 0, dice: landed, covered: false })
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
      case 'coin': {
        // La pièce remplace le dé, tournoie, retombe ; pile, la voleuse fond sur sa cible, un seul coup lourd. Ce que décide
        // la pièce part avec elle, comme ce que décide le dé (M40) : les reliques de pile (la Pièce trouée) tombent avec
        // son résultat, avant le coup de pile, qui suit leur lecture
        const onHeads = beat.heads
          ? children[beat.id].filter((b) => {
              const trigger = b.type === 'relic' ? RELICS.find((r) => r.id === b.relic)?.trigger : undefined
              return trigger?.type === 'strike' && trigger.on === 'heads'
            })
          : []
        for (const relic of onHeads) absorbed.add(relic.id)
        const after: Consequences = beat.heads ? consequencesOf(beat) : { rides: [], quiet: [], reactions: [] }
        const shown = { ...IDLE_DICE, owner: beat.side }
        const base = hp
        // Le Dé pipé qui a fait tomber pile reste dans la zone d'état jusqu'à ce que la pièce retombe : sa charge part
        // avec le résultat qu'elle décide, avec son label (M26)
        const loaded = beat.loadedBy
        shownEarly.add(beat.id)
        if (loaded) {
          shownState = Math.max(shownState, beat.id)
          const was = beats[beat.id - 1]?.state.statuses[beat.side] ?? []
          const keep = was.findIndex((s) => s.id === loaded)
          // Sa charge d'avant la pièce, à sa place : remplacée si une charge reste, remise sinon
          const next = display(beats[shownState].state.statuses).map((list, side) => {
            if (side !== beat.side || keep < 0) return list
            const rest = list.filter((s) => s.id !== loaded)
            return [...rest.slice(0, keep), was[keep], ...rest.slice(keep)]
          }) as Pair<Status[]>
          shownStatuses = JSON.stringify(next)
          emit({ channel: 'statuses', statuses: next })
        } else showStatuses(beat.id)
        // Dans une rafale, la pièce prend la place de ses dés le temps de son jet ; ils reviennent ensuite, à plat, pour
        // le coup suivant (M26, M27)
        const outer = volleys.at(-1)
        if (outer) outer.covered = true
        setDice({ ...shown, coin: {} })
        sound('coinToss', T.COIN_SPIN)
        hold('COIN_SPIN')
        sound('coinLand')
        setDice({ ...shown, coin: { heads: beat.heads }, forced: beat.forced })
        // Le résultat tombe d'un bloc : la pièce, le « ding » de la réussite et le texte flottant
        if (beat.heads) sound('coinWin')
        showFx({ source: beat.side, title: beat.heads ? 'Pile !' : 'Face…', effects: [] })
        if (loaded) {
          shownStatuses = ''
          showStatuses(beat.id)
          addSpecial({ label: STATUSES[loaded].name, source: 'skill', sign: 'plus' })
        }
        for (const relic of onHeads) {
          snapped.add(relic.id)
          stageBeat(relic)
        }
        if (onHeads.length === 0) hold('COIN_READ')
        // Pile : son coup lourd (ce coup, à nouveau ; lourd même petit), puis ce qu'il entraîne, comme un coup (M26) ; ses
        // réactions au milieu de sa lecture
        if (beat.heads)
          blows(beat.side, beat.effects, true, () => 'crit', {
            heavy: true,
            onLand: (last) => {
              if (!last) return
              settle(beat, base)
              land(after)
            },
            ...(after.reactions.length > 0 && { lastHold: 'REACTION_LEAD' as const }),
          })
        if (!settled.has(beat.id)) settle(beat, base)
        log(coinLog(beat.turn, beat.side, beat.heads, beat.effects, fighters))
        react(after.reactions)
        hold(beat.heads ? 'COIN_HEADS_HOLD' : 'COIN_TAILS_HOLD')
        setAura(null)
        break
      }
      case 'statusAge': {
        // Le compteur rebondit sur sa nouvelle valeur (ou l'état passe à 0 et quitte la zone d'état), sauf s'il l'a déjà
        // fait avec l'effet du statut
        const shown = [...beat.changes.map((c) => c.status), ...beat.expired].every((id) => previews.some((p) => p.until === beat.id && p.status === id))
        settle(beat)
        showStatuses(beat.id)
        log(statusAgeLog(beat.side, beat.changes, beat.expired, fighters))
        if (!shown) hold('COUNT_HOLD')
        break
      }
      case 'relic': {
        // La relique s'annonce sur son sceau, avec son label sous le dé (+ pour un bonus de son porteur, − pour un contre :
        // `relicSpecial`) ; un statut qu'elle pose part de son sceau en signal et n'apparaît qu'à son arrivée (M19, M23),
        // comme pour une compétence. Une relique dont aucun effet ne change rien n'a ni signal ni label (M25) ; « Rien à
        // purifier » se tait à côté d'un autre effet (M38)
        const effects = quietPurges(beat.effects)
        const still = idle(effects)
        const base = hp
        // Relique élémentaire (0.85.0) : son sceau se brise et la scène part d'abord. Vers l'adversaire, ses coups tombent
        // sur les impacts (comme la Foudre) ; sur le porteur, ses effets tombent au premier impact, puis la scène s'achève
        const sceneId = RELICS.find((r) => r.id === beat.relic)?.scene
        const timing = sceneId ? SCENE_EVENTS[sceneId] : undefined
        const onSelf = timing?.aim === 'self'
        if (sceneId && timing) {
          emit({ channel: 'scene', scene: { id: sceneId, source: beat.side, target: sceneTarget(sceneId, beat.side) } })
          // Sur le porteur, son sceau se brise dès le début ; il se rallume quand l'effet tombe
          if (onSelf) {
            emit({ channel: 'relicPulse', side: beat.side, relics: [beat.relic] })
            wait(timing.impacts[0], 'rythme de la scène')
          }
        }
        showEffects(
          beat.side,
          '',
          effects,
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
            special: still ? undefined : relicSpecial(beat.relic, beat.name, beat.side === beat.owner ? 'attacker' : 'defender', effects),
            ...((timing || snapped.has(beat.id)) && { lead: 0 as const }),
            ...(timing && !onSelf && { schedule: timing.impacts, impact: () => timing.sound ?? 'hit' }),
            // Une relique à scène garde le rythme de sa scène (M24) : pas de signal ; en rafale, ni lecture ni attente de
            // plus que sa scène (M17 bis)
            ...(!timing && !still && { signal: relicSignal(beat.relic) }),
            ...(brisk.has(beat.id) && { brisk: true as const }),
            reactions: answersOf(beat),
          },
        )
        // La scène sur le porteur va jusqu'au bout (la gangue qui éclate, la poussière qui retombe), lecture comprise
        if (timing && onSelf) wait(timing.length - timing.impacts[0] - (brisk.has(beat.id) ? 0 : T.READ_HOLD), 'fin de la scène')
        break
      }
      default:
        // Tout nouveau type d'étape doit avoir sa mise en scène ici
        beat satisfies never
    }
  }

  /**
   * Quand un statut agit, l'usure de la phase qui le concerne (même tour, même camp, même phase) est montrée en même
   * temps que son effet : le « −2 » et le compteur qui passe de 3 à 2 (ou à 0) tombent ensemble. Ces changements
   * d'avance restent appliqués jusqu'à l'étape qui les réalise.
   */
  function previewCounts(tick: Extract<Beat, { type: 'statusTick' }>) {
    for (let j = tick.id + 1; j < beats.length; j++) {
      const next = beats[j]
      if (next.turn !== tick.turn) break
      if (next.type !== 'statusAge' || next.side !== tick.side || next.phase !== tick.phase) continue
      const change = next.changes.find((c) => c.status === tick.status)
      if (change) previews.push({ side: tick.side, status: tick.status, turns: change.to, until: j })
      else if (next.expired.includes(tick.status)) previews.push({ side: tick.side, status: tick.status, until: j })
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
  const initDice = { ...IDLE_DICE, faces: INITIATIVE_DIE }
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
  if (test) setDice({ ...IDLE_DICE, owner: first })
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
      setDice({ ...IDLE_DICE, owner: active })
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
  sound('ko')
  hold('KO_HOLD')
  sound('victory')
  hold('VICTORY_HOLD')
  finish()

  return moments
}
