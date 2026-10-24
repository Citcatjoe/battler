import type { Character } from './character'
import type { DamageSource } from './damage'
import { DIE_FACES, faceTrigger, isRollTrigger, relationOf, rollMatches, type CharacterEvent, type Condition, type Effect, type HitRelation, type Trigger } from './events'
import type { Relic } from './relics'
import { chance, defaultRng, rollDie, seededRng, type Rng } from './rng'
import {
  consumeStatus,
  isMechanic,
  removeStatuses,
  resolveApplication,
  stacksOf,
  STATUS_IDS,
  STATUSES,
  tickDurations,
  type ApplicationOutcome,
  type CombatStats,
  type Polarity,
  type Status,
  type StatusId,
} from './statuses'

/*
 * Moteur de combat : l'unique endroit où les règles s'appliquent et où l'on tire les dés.
 * `simulateCombat` est pur à hasard près (le `rng` est injecté) et produit une chronologie
 * (`beats`) que l'écran de combat se contente de rejouer et que les statistiques lisent.
 *
 * Les règles de résolution sont spécifiées dans docs/RESOLUTION.md ; ce fichier les applique :
 *
 *   Ouverture : initiative (relance sur égalité) → fenêtre « combatStart » (gauche, puis droite)
 *   Chaque tour, pour le joueur actif (l'attaquant) :
 *     Phase 1 · Début de tour : effets `onTurnStart` (bonus, puis malus) → durées « début »
 *               → fenêtre « turnStart »
 *     Phase 2 · Action : contrôle (`skipsAction` : le tour est perdu), sinon un jet, ou plusieurs (deux dés, Coup de
 *               chance), et des coups instantanés (Furie des vents). Un jet : le d6 désigne une face ; sa compétence se
 *               greffe (étape roll, la compétence, puis le coup de base), modifie le coup (il part, elle suit s'il
 *               touche) ou le remplace (jet remplacé, pas de coup). Chaque coup de base, résolu en entier à son tour :
 *               valeur tirée dans l'attaque → esquive → reliques de coup, face dorée → critique → dégâts sortants
 *               → dégâts entrants → armure → boucliers
 *               → fenêtres du coup : bloodied, la face du dé (naturalOne… face:4), naturalMax (coup brut : reliques seules),
 *                 puis esquivé : missed (actif) → dodge (défenseur) ; touché : hit → crit (actif) → hurt (défenseur).
 *                 Vol de vie (`hit`), Riposte et jauges (`hurt`) y réagissent comme toute réaction. Seuls les statuts
 *                 présents au début du coup réagissent dans ses fenêtres (`strikeBase`, règle 9).
 *     Phase 3 · Fin de tour : effets `onTurnEnd` (bonus, puis malus) → durées « fin » → fenêtre « turnEnd »
 *   Dans une fenêtre, pour chaque camp concerné : réactions de ses statuts (ordre de pose), puis
 *   événements de son personnage (ordre de définition). Les effets ainsi produits ne déclenchent
 *   pas d'autres réactions (pas de chaîne), sauf le seuil « bloodied ».
 *   Vérification d'état après chaque effet : un combattant à 0 PV met fin au combat aussitôt.
 */

/** Position à l'écran : 0 = gauche (regarde à droite), 1 = droite. */
export type Side = 0 | 1
export type Pair<T> = [T, T]

/** Moment du tour où un statut agit ou s'use. */
export type TurnPhase = 'turnStart' | 'turnEnd'

export const SIDES: readonly Side[] = [0, 1]
export const other = (side: Side): Side => (side === 0 ? 1 : 0)

export const INITIATIVE_DIE = 10

/** Garde-fou si des stats rendaient le K.O. impossible (ex. 100 % d'esquive). */
export const MAX_TURNS = 1000

/** État des deux combattants à un instant du combat. */
export interface Snapshot {
  hp: Pair<number>
  statuses: Pair<Status[]>
}

/** Effet réellement appliqué (un soin peut être réduit par le plafond de PV, etc.). */
export type AppliedEffect =
  | { type: 'heal'; target: Side; amount: number }
  | {
      type: 'damage'
      target: Side
      amount: number
      /** Ce que sont ces dégâts (damage.ts), d'où leur type ; recopié de l'effet, sans effet sur la règle */
      source: DamageSource
      /** Le détail par coup, dont la somme vaut `amount` (jauges d'une relâche, coups de `hits`) ; l'écran en fait autant de coups */
      parts?: number[]
    }
  /** `stacks` : charges demandées ; `result` : ce qui s'est réellement passé (posé, annulé, bloqué) */
  | { type: 'applyStatus'; target: Side; status: StatusId; stacks: number; turns?: number; result: ApplicationOutcome }
  | { type: 'cleanse'; target: Side; removed: StatusId[] }

export interface Attack {
  attacker: Side
  /** Le dé : la face tombée (« sur un 4 »), qui déclenche sa compétence ; elle ne fait aucun dégât */
  roll: number
  /** Nombre de faces du dé utilisé (le d6) */
  faces: number
  /**
   * Valeur du coup de base, tirée dans l'attaque de l'attaquant (règles v2, phase 5 bis), avant le multiplicateur, les
   * reliques, la dorure et le critique ; 0 pour un jet remplacé
   */
  value: number
  /**
   * Source du coup de base : celle de l'attaque de l'attaquant, sous sa forme du moment (`Character.attackSourceIn`) ;
   * son type (DP ou DM) s'en déduit (`damageKind`). Sans effet sur la règle : l'étiquette et la couleur du chiffre
   */
  source: DamageSource
  /** Crescendo, Soliste (relation « modifie ») : ce coup ×N (`CharacterEvent.hitMultiplier`) */
  multiplier?: number
  dodged: boolean
  /** Esquive imposée par un statut du défenseur (ex. « Esquive améliorée »), sans tirage */
  dodgeForced: boolean
  /** Le statut du défenseur qui a imposé l'esquive (présent si `dodgeForced`) */
  dodgeBy?: StatusId
  /**
   * Jet remplacé par sa compétence (relation `replace` : Furie des vents, Coup de chance) : pas de coup de base, ni
   * esquive ni critique ; seules les fenêtres du dé s'ouvrent
   */
  replaced: boolean
  /** Dé imposé par l'observateur (mode triche, `forcedRolls`) ; absent d'un combat normal */
  forced?: true
  /** Dé déjà tiré par l'étape qui précède (jet greffé) : ce coup ne lance aucun dé */
  preset?: true
  /**
   * Coup brut (0.69.0, coups de la Furie des vents) : sa face ne déclenche aucune compétence. Les reliques de face et la
   * dorure, elles, lisent son dé (2026-10-23).
   */
  plain?: true
  crit: boolean
  /** Critique imposé par un statut (ex. « Critique assuré ») */
  critForced: boolean
  /** Le statut de l'attaquant qui a imposé le critique (présent si `critForced`) */
  critBy?: StatusId
  critMultiplier: number
  /** Dégâts avant l'armure (après critique et modificateurs) */
  raw: number
  /** Dégâts réellement infligés (0 si esquive) */
  damage: number
  /**
   * Dégâts comptés : `damage` en entier, excès du coup fatal compris (overkill, compté depuis la 0.34.0).
   * Les PV, eux, ne descendent pas sous 0 : le défenseur perd `min(dealt, PV restants)`.
   */
  dealt: number
  /** Armure du défenseur au moment du coup (de base, modifiée par les statuts) */
  armor: number
  /** Retenus par l'armure */
  armorAbsorbed: number
  /** Vrai si le plancher d'1 dégât a joué : l'armure ou un bouclier aurait retenu davantage */
  floored: boolean
  /** Modificateurs de dégâts appliqués avant l'armure, dans l'ordre (sortants de l'attaquant, puis entrants du défenseur) */
  modifiers: AttackModifier[]
  /** Retenus par les boucliers, au total */
  shieldAbsorbed: number
  /** Retenus par chaque bouclier, dans l'ordre d'application (ordre de pose des statuts du défenseur) */
  shields: { status: StatusId; absorbed: number }[]
  /**
   * Bonus de coup des reliques de l'attaquant (Fer à quatre clous), ajoutés à la valeur du coup avant le
   * critique ; seulement sur un coup qui touche
   */
  relicBonus?: { relic: string; name: string; amount: number }[]
  /**
   * Face dorée (forge du dé, 0.88.0) : ajouté à la valeur du coup qui touche, avant le critique, quand son dé fait
   * cette face, coup brut compris, comme une relique de face
   */
  gild?: number
}

/** Un statut qui a changé la force d'un coup (ex. Aura de puissance +2, Aura d'intimidation −2). */
export interface AttackModifier {
  status: StatusId
  /** Porté par l'attaquant (sortant) ou par le défenseur (entrant) */
  by: 'attacker' | 'defender'
  delta: number
  /** Modificateur des dégâts finaux (`modifyFinal`), appliqué après l'armure et les boucliers */
  final?: true
}

export interface TriggeredEvent {
  /** Porteur de l'événement */
  side: Side
  eventId: string
  name: string
  trigger: Trigger
  effects: AppliedEffect[]
}

/** Décompte d'une durée : tours restants avant → après. */
export interface DurationChange {
  status: StatusId
  from: number
  to: number
}

/**
 * Moment du tour où une étape a lieu : changement de forme, début de tour, action, fin de tour.
 * Les étapes de l'ouverture (fenêtre « combatStart », tour 0) sont rangées en `turnStart`.
 */
export type BeatPhase = 'shift' | TurnPhase | 'action'

/** Champs communs à toutes les étapes (docs/MOTEUR_V2.md § 3). */
export interface BeatFields {
  /** Rang de l'étape dans `beats`, à partir de 0 */
  id: number
  /** `id` de l'étape qui a provoqué celle-ci ; absent pour une étape racine (jet de l'action, début de phase) */
  cause?: number
  phase: BeatPhase
  /** Celui dont c'est le tour (tour 0, l'ouverture : celui qui ne commence pas, comme l'alternance le veut) */
  owner: Side
  turn: number
  state: Snapshot
}

/** Une étape de la chronologie, avec l'état qui en résulte. */
export type Beat = BeatFields & BeatBody

/** Le contenu propre à chaque type d'étape. */
export type BeatBody =
  | { type: 'attack'; attack: Attack }
  | { type: 'event'; event: TriggeredEvent }
  /** Effet de tour d'un statut (ex. poison au début, brûlure à la fin) */
  | { type: 'statusTick'; phase: TurnPhase; side: Side; status: StatusId; effects: AppliedEffect[] }
  /**
   * Usure de la phase (2026-10-21 : une seule étape au lieu de `statusDuration` et `statusExpire`) : `changes`, les
   * durées décomptées (un tour de moins) ; `expired`, les statuts éteints (charges épuisées ou durée écoulée).
   */
  | { type: 'statusAge'; phase: TurnPhase; side: Side; changes: DurationChange[]; expired: StatusId[] }
  /**
   * Réaction d'un statut à un moment du combat (ex. Épines quand le porteur encaisse, Vol de vie quand il touche).
   * Sans effet pour une jauge qui se remplit (Rétribution) : l'état de l'étape montre les jauges.
   */
  | { type: 'statusReaction'; side: Side; status: StatusId; trigger: Trigger; effects: AppliedEffect[] }
  /** Action perdue à cause d'un statut de contrôle (ex. Étourdi) */
  | { type: 'skip'; side: Side; status: StatusId }
  /** Changement de forme (druide), au tout début de son tour : `form` est l'index de la nouvelle forme */
  | { type: 'shift'; side: Side; form: number }
  /**
   * Une action à plusieurs jets : deux dés (personnage `twinDice`, `status` absent), ou un statut qui donne plusieurs
   * coups (Furie des vents : deux coups bruts ; Coup de chance : des jets de plus), qui est consommé. Les jets d'une
   * barde qui porte Coup de chance : ses deux dés, puis ceux du statut, dans la même rafale.
   */
  | { type: 'flurry'; side: Side; status?: StatusId; strikes: number; faces: number[] }
  /**
   * Un jet dont la face porte une compétence qui se greffe (règles v2, phase 5 bis) : le dé tombe, la compétence suit
   * (étape event), puis le coup de base, au dé déjà tiré (`Attack.preset`). Un jet sans greffe n'a pas cette étape : son
   * coup lance lui-même son dé.
   */
  | { type: 'roll'; side: Side; roll: number; faces: number; forced?: true }
  /**
   * Pile ou face : une pièce lancée juste après le coup qui l'a posée ; pile, ce coup ×3 (les PV qu'il a retirés, encore
   * deux fois, en DP), face, rien. Le statut est consommé
   */
  | { type: 'coin'; side: Side; status: StatusId; heads: boolean; effects: AppliedEffect[]; forced?: true }
  /**
   * Une relique du porteur se déclenche (docs/RELIQUES.md) : sur un moment du coup, au début d'un de ses tours,
   * ou quand ses PV passent sous son seuil. `uses` : ses déclenchements dans ce combat, celui-ci compris.
   */
  | { type: 'relic'; side: Side; relic: string; name: string; effects: AppliedEffect[]; uses: number }

export interface CombatResult {
  fighters: Pair<Character>
  /** Tous les jets d'initiative, relances comprises */
  initiative: Pair<number>[]
  beats: Beat[]
  /** Nombre de tours entamés */
  turns: number
  winner: Side
  /** K.O. ou, cas pathologique, limite de tours atteinte */
  endedBy: 'ko' | 'turnLimit'
  /** Joué à l'écran ou simulé directement */
  mode: 'played' | 'simulated'
  /** Durée du combat à l'écran (0 si simulé) */
  durationMs: number
  /** Graine du hasard, si le combat a été tiré avec une graine : `simulateCombat(fighters, { seed })` le rejoue */
  seed?: number
  /** Dés imposés par l'observateur (mode triche), par rang de dé : voir `SimulateOptions.forcedRolls` */
  forcedRolls?: Readonly<Record<number, number>>
}

/* ---------- Lecture d'un résultat ---------- */

/** Un dé lancé (mode triche) : son lanceur, ses faces (2 pour une pièce). */
export interface RolledDie {
  side: Side
  faces: number
  coin: boolean
}

/**
 * Les dés que lance une étape, dans l'ordre (mode triche, `forcedRolls`) : un pour un coup (sauf un coup dont le jet
 * greffé a déjà tiré le dé), un pour un jet greffé, un pour une pièce.
 */
export function diceOf(beat: Beat): RolledDie[] {
  if (beat.type === 'attack') return beat.attack.preset ? [] : [{ side: beat.attack.attacker, faces: beat.attack.faces, coin: false }]
  if (beat.type === 'roll') return [{ side: beat.side, faces: beat.faces, coin: false }]
  if (beat.type === 'coin') return [{ side: beat.side, faces: 2, coin: true }]
  return []
}

/** Une étape qui lance au moins un dé. */
export const rollsDie = (beat: Beat) => diceOf(beat).length > 0

/** Nombre de dés lancés par les étapes qui précèdent l'étape `index` : le rang de son premier dé. */
export const rankAt = (beats: readonly Beat[], index: number) =>
  beats.slice(0, index).reduce((n, b) => n + diceOf(b).length, 0)

/**
 * Le dé de rang `rank` (mode triche) : son lanceur et son nombre de faces (2 pour une pièce).
 * `undefined` si le combat se termine avant.
 */
export function dieAt(result: CombatResult, rank: number): RolledDie | undefined {
  return result.beats.flatMap(diceOf)[rank]
}

export const attacksOf = (result: CombatResult) =>
  result.beats.flatMap((b) => (b.type === 'attack' ? [{ turn: b.turn, ...b.attack }] : []))

export const eventsOf = (result: CombatResult) => result.beats.flatMap((b) => (b.type === 'event' ? [b.event] : []))

/** Effets appliqués par une étape, quelle que soit leur source (compétence, statut, pièce, relique). */
export function beatEffects(b: Beat): readonly AppliedEffect[] {
  if (b.type === 'event') return b.event.effects
  if (b.type === 'statusTick' || b.type === 'statusReaction' || b.type === 'coin' || b.type === 'relic') return b.effects
  return []
}

/** État final du combat (PV restants, statuts). */
export function finalState(result: CombatResult): Snapshot {
  const last = result.beats[result.beats.length - 1]
  return last ? last.state : { hp: [result.fighters[0].maxHp, result.fighters[1].maxHp], statuses: [[], []] }
}

/* ---------- Stats effectives ---------- */

const clamp = (v: number, min: number, max = Infinity) => Math.min(max, Math.max(min, v))

/** Stats de combat du porteur, une fois appliqués les modificateurs de ses statuts. */
export function effectiveStats(character: Character, statuses: readonly Status[]): CombatStats {
  const { maxHp: _maxHp, ...base } = character.stats
  const modified = statuses.reduce<CombatStats>((s, st) => STATUSES[st.id].modifyStats?.(s, st) ?? s, base)
  const attackMin = Math.round(clamp(modified.attackMin, 0))
  return {
    attackMin,
    attackMax: Math.round(clamp(modified.attackMax, attackMin)),
    armor: clamp(modified.armor, 0),
    dodgeChance: clamp(modified.dodgeChance, 0, 1),
    critChance: clamp(modified.critChance, 0, 1),
    critMultiplier: clamp(modified.critMultiplier, 1),
  }
}

/* ---------- Résolution d'une attaque ---------- */

/**
 * Dé imposé (mode triche) : le tirage a lieu quand même, pour que la suite du hasard reste celle du
 * combat d'origine ; seule sa valeur est remplacée.
 */
function forceRoll(drawn: number, faces: number, forced: number | undefined) {
  return forced === undefined ? drawn : Math.min(faces, Math.max(1, Math.round(forced)))
}

/** Le jet d'un coup, déjà tiré par le moteur : sa face, et ce que sa compétence fait du coup de base. */
export interface StrikeRoll {
  /** La face du dé */
  roll: number
  /** Source du coup de base (l'attaque de l'attaquant, sous sa forme du moment), d'où son type */
  source: DamageSource
  /** Le dé a été lancé par l'étape d'avant (jet greffé) : ce coup n'en lance pas */
  preset?: boolean
  /** Dé imposé par l'observateur (mode triche) */
  forced?: boolean
  /** Jet remplacé par sa compétence (relation `replace`) : pas de coup de base */
  replaced?: boolean
  /** Ce coup ×N (Crescendo, Soliste : une compétence de sa face qui le modifie) */
  multiplier?: number
}

/**
 * Résout un coup de base sans modifier l'état : sa valeur est tirée dans l'attaque, le défenseur tente d'esquiver,
 * puis l'attaquant peut critiquer (forcément s'il porte un statut `forcesCrit`). Les modificateurs de dégâts de
 * l'attaquant s'appliquent, puis l'armure (le coup garde au moins 1), puis les boucliers du défenseur absorbent ce
 * qu'ils peuvent, sans descendre sous 1, enfin les modificateurs de dégâts finaux de l'attaquant (`modifyFinal`),
 * toujours au moins 1. L'ordre des tirages (valeur, esquive, critique) est fixe : il garantit la reproductibilité ; le
 * dé, lui, est tiré avant (`StrikeRoll`).
 */
export function resolveAttack(
  rng: Rng,
  attacker: Character,
  defender: Character,
  attackerStatuses: readonly Status[],
  defenderStatuses: readonly Status[],
  strike: StrikeRoll,
): Omit<Attack, 'attacker' | 'dealt' | 'plain'> {
  const att = effectiveStats(attacker, attackerStatuses)
  const def = effectiveStats(defender, defenderStatuses)
  const { roll } = strike
  const base = {
    roll,
    faces: DIE_FACES,
    source: strike.source,
    ...(strike.multiplier !== undefined && { multiplier: strike.multiplier }),
    ...(strike.forced && { forced: true as const }),
    ...(strike.preset && { preset: true as const }),
    critMultiplier: att.critMultiplier,
    shields: [] as Attack['shields'],
    armor: def.armor,
    floored: false,
    dodgeForced: false,
    replaced: false,
    modifiers: [] as AttackModifier[],
  }
  const nothing = { crit: false, critForced: false, raw: 0, damage: 0, armorAbsorbed: 0, shieldAbsorbed: 0 }
  if (strike.replaced) return { ...base, ...nothing, value: 0, dodged: false, replaced: true }
  // Le coup de base : sa valeur tirée dans l'attaque (aucun tirage pour une attaque fixe), qu'il touche ou soit esquivé
  const drawn = att.attackMax > att.attackMin ? att.attackMin - 1 + rollDie(rng, att.attackMax - att.attackMin + 1) : att.attackMin
  // Esquive imposée : pas de tirage (les combats sans ce statut gardent la même suite de hasard).
  const dodgeBy = defenderStatuses.find((s) => STATUSES[s.id].forcesDodge)?.id
  const dodgeForced = dodgeBy !== undefined
  if (dodgeForced || chance(rng, def.dodgeChance)) {
    return { ...base, ...nothing, value: drawn, dodgeForced, ...(dodgeBy && { dodgeBy }), dodged: true }
  }
  // Reliques de coup : la valeur du coup qui touche grandit, avant le critique ; un bonus de face (Fer à quatre
  // clous) ne vaut que si le dé de ce coup fait cette face (deux dés : chaque dé se lit seul), coup brut compris
  // (2026-10-23 : une relique ou une dorure lit la face du dé, quel que soit le coup)
  const relicBonus = attacker.relics.flatMap((r) =>
    r.rollBonus && (r.onFace === undefined || r.onFace === roll) ? [{ relic: r.id, name: r.name, amount: r.rollBonus }] : [],
  )
  // Face dorée (forge du dé) : même règle qu'une relique de face
  const gild = attacker.gilded[roll] ?? 0
  const value = drawn * (strike.multiplier ?? 1) + relicBonus.reduce((t, b) => t + b.amount, 0) + gild

  const critBy = attackerStatuses.find((s) => STATUSES[s.id].forcesCrit)?.id
  const critForced = critBy !== undefined
  const crit = critForced || chance(rng, att.critChance)
  let raw = crit ? Math.round(value * att.critMultiplier) : value
  // Dégâts sortants (statuts de l'attaquant), puis entrants (statuts du défenseur), dans l'ordre de pose.
  const modifiers: AttackModifier[] = []
  for (const s of attackerStatuses) {
    const modify = STATUSES[s.id].modifyOutgoing
    if (!modify) continue
    const next = modify(raw, s)
    if (next !== raw) modifiers.push({ status: s.id, by: 'attacker', delta: next - raw })
    raw = next
  }
  for (const s of defenderStatuses) {
    const modify = STATUSES[s.id].modifyIncoming
    if (!modify) continue
    const next = modify(raw, s)
    if (next !== raw) modifiers.push({ status: s.id, by: 'defender', delta: next - raw })
    raw = next
  }
  raw = Math.max(1, Math.round(raw))

  const afterArmor = Math.max(1, raw - def.armor)
  let damage = afterArmor
  const shields: Attack['shields'] = []
  for (const s of defenderStatuses) {
    if (!STATUSES[s.id].shield || damage <= 1) continue
    const taken = Math.min(s.stacks, damage - 1)
    if (taken > 0) {
      shields.push({ status: s.id, absorbed: taken })
      damage -= taken
    }
  }
  // Le plancher a joué si l'armure aurait tout retenu, ou si un bouclier n'a pas pu prendre le dernier point.
  const floored =
    raw - def.armor < 1 ||
    (damage === 1 &&
      defenderStatuses.some((s) => STATUSES[s.id].shield && s.stacks > (shields.find((x) => x.status === s.id)?.absorbed ?? 0)))
  // Dégâts finaux (Aura mélodieuse, Fausse note) : après l'armure et les boucliers, au moins 1
  const shielded = damage
  let finalFloor = false
  for (const s of attackerStatuses) {
    const modify = STATUSES[s.id].modifyFinal
    if (!modify) continue
    const wanted = Math.round(modify(damage, s))
    const next = Math.max(1, wanted)
    if (wanted < 1) finalFloor = true
    if (next !== damage) modifiers.push({ status: s.id, by: 'attacker', delta: next - damage, final: true })
    damage = next
  }
  return {
    ...base,
    value: drawn,
    ...(relicBonus.length > 0 && { relicBonus }),
    ...(gild > 0 && { gild }),
    shields,
    modifiers,
    floored: damage === 1 && (floored || finalFloor),
    dodged: false,
    crit,
    critForced,
    ...(critBy && { critBy }),
    raw,
    damage,
    armorAbsorbed: raw - afterArmor,
    shieldAbsorbed: afterArmor - shielded,
  }
}

/* ---------- Combat complet ---------- */

interface FighterState {
  hp: number
  statuses: Status[]
  /** Déclenchements par id d'événement, pour `limit` */
  fired: Record<string, number>
  bloodied: boolean
  /** Statuts posés ou renouvelés pendant le tour en cours : pas de décompte à la fin de ce tour */
  fresh: Set<StatusId>
  /** Forme en cours (index dans `Character.forms`), pour un personnage à formes */
  form: number
  /** Tours joués : le druide ne change pas de forme à son premier tour */
  turnsTaken: number
  /** Reliques : déclenchements dans ce combat (charges) et tour du porteur où elles sont de nouveau prêtes (recharge) */
  relicUses: Record<string, number>
  relicReady: Record<string, number>
  /** Reliques de seuil déjà déclenchées sous leur seuil : elles se réarment quand les PV remontent au-dessus */
  relicBelow: Set<string>
}

export interface SimulateOptions {
  rng?: Rng
  /** Graine du hasard : rend le combat rejouable à l'identique (ignorée si `rng` est fourni) */
  seed?: number
  /**
   * Mode triche : valeurs imposées par rang de dé (0 = premier dé du combat, hors initiative). Chaque
   * coup (étape `attack`) et chaque pièce (étape `coin`) consomme un rang, dans l'ordre des étapes ;
   * pour la pièce, 1 = pile et 2 = face. Avant le premier dé imposé, le combat est identique à l'original.
   */
  forcedRolls?: Readonly<Record<number, number>>
}

/**
 * Résout un combat complet à partir des stats, statuts et événements des personnages.
 * C'est l'unique moteur : jouer un combat ne fait qu'animer ce résultat.
 */
export function simulateCombat(
  fighters: Pair<Character>,
  { seed, rng: injected, forcedRolls }: SimulateOptions = {},
): CombatResult {
  const cheats = forcedRolls && Object.keys(forcedRolls).length > 0 ? forcedRolls : undefined
  /** Rang du prochain dé (mode triche) */
  let dieRank = 0
  const nextForced = () => cheats?.[dieRank++]
  const rng: Rng = injected ?? (seed !== undefined ? seededRng(seed) : defaultRng)
  const initiative: Pair<number>[] = []
  let roll: Pair<number>
  do {
    roll = [rollDie(rng, INITIATIVE_DIE), rollDie(rng, INITIATIVE_DIE)]
    initiative.push(roll)
  } while (roll[0] === roll[1])

  // Statuts de forme (0.73.0, druide) : ceux de la forme du moment, posés et retirés par le moteur seul
  const formStatuses = (f: Character, form: number): Status[] => (f.forms?.[form].statuses ?? []).map((id) => ({ id, stacks: 1 }))
  const states = fighters.map(
    (f): FighterState => ({
      hp: f.maxHp,
      statuses: formStatuses(f, 0),
      fired: {},
      bloodied: false,
      fresh: new Set(),
      form: 0,
      turnsTaken: 0,
      relicUses: {},
      relicReady: {},
      relicBelow: new Set(),
    }),
  ) as Pair<FighterState>
  const beats: Beat[] = []
  let turn = 0
  const first: Side = roll[0] > roll[1] ? 0 : 1
  /** Phase et maître du tour en cours, recopiés dans chaque étape (l'ouverture, tour 0, appartient à celui qui ne commence pas) */
  let phase: BeatPhase = 'turnStart'
  let owner: Side = other(first)
  /**
   * Dernière étape qui a posé chaque statut, par camp : la pièce (Pile ou face) et les coups instantanés (Furie
   * des vents) ont pour cause l'étape qui a posé leur statut. Un effet s'applique juste avant l'émission de
   * l'étape qui le porte, d'où `beats.length`.
   */
  const posedBy: Pair<Partial<Record<StatusId, number>>> = [{}, {}]
  /** Dernier coup émis : cause de repli des coups instantanés dont le statut n'a pas d'auteur connu */
  let lastStrike = -1
  /** Émet une étape avec ses champs communs (rang, cause, phase, maître du tour, état) ; renvoie son rang. */
  const push = (body: BeatBody, cause?: number): number => {
    const id = beats.length
    beats.push({ id, ...(cause !== undefined && { cause }), phase, owner, turn, state: snapshot(), ...body })
    return id
  }
  /**
   * Le coup en cours, pendant ses fenêtres (null hors d'un coup) : a-t-il touché, combien de PV a-t-il retirés, est-ce
   * un coup brut ou un jet remplacé. Les réactions d'un coup qui touche en ont besoin (Vol de vie, Riposte, jauges), et
   * les compétences de la face, qui n'y partent que si elles modifient un coup qui touche ou remplacent le jet.
   */
  let strike: { touched: boolean; dealt: number; plain: boolean; replaced: boolean } | null = null
  /**
   * État de référence du coup en cours (null hors d'un coup) : les statuts des deux camps au début du coup, avant son
   * dé. Règle du jeu (2026-10-21, RESOLUTION règle 9) : un statut posé ou renforcé pendant un coup ne réagit pas à ce
   * coup, il agit dès le coup suivant (le coup suivant d'une même volée compris). Vaut pour toutes les fenêtres du
   * coup : seuils, faces du dé, esquivé ou touché, et celles de la pièce qui tombe sur pile.
   */
  let strikeBase: Pair<Status[]> | null = null
  /** Résout `run` avec `base` pour état de référence du coup. */
  const withinStrike = <T,>(base: Pair<Status[]>, run: () => T): T => {
    strikeBase = base
    try {
      return run()
    } finally {
      strikeBase = null
    }
  }
  /** Fenêtres d'un coup (`hit`, `hurt`…) ; `cause` : le coup (ou la pièce) ; `plain` : coup brut (Furie des vents). */
  const fireStrike = (list: [Side, Trigger][], touched: boolean, dealt: number, cause: number, plain = false, replaced = false) => {
    strike = { touched, dealt, plain, replaced }
    try {
      return fireAll(list, cause)
    } finally {
      strike = null
    }
  }

  const snapshot = (): Snapshot => ({
    hp: [states[0].hp, states[1].hp],
    statuses: [states[0].statuses, states[1].statuses],
  })
  const fallen = () => SIDES.find((s) => states[s].hp <= 0)
  const end = (winner: Side, endedBy: CombatResult['endedBy']): CombatResult => ({
    fighters,
    initiative,
    beats,
    turns: turn,
    winner,
    endedBy,
    mode: 'simulated',
    durationMs: 0,
    ...(seed !== undefined && !injected ? { seed } : {}),
    ...(cheats && { forcedRolls: { ...cheats } }),
  })

  /**
   * Un soin remonte les PV de `side` : les reliques de seuil qui lisent ses PV (les siennes, ou un Trophée adverse)
   * et qu'il repasse se réarment tout de suite, même si une perte les refait passer dessous avant la prochaine
   * vérification (vol de vie puis Riposte, sur le même coup). Rien ne se déclenche ici.
   */
  function rearmThresholds(side: Side) {
    for (const bearer of SIDES)
      for (const relic of fighters[bearer].relics) {
        const t = relic.trigger
        const watched = t?.type === 'hpBelow' && t.who === 'opponent' ? other(bearer) : bearer
        if (t?.type === 'hpBelow' && watched === side && states[side].hp >= fighters[side].maxHp * t.ratio) states[bearer].relicBelow.delete(relic.id)
      }
  }

  /** Applique un effet à partir du porteur `owner` ; renvoie ce qui a réellement changé. */
  function applyEffect(owner: Side, effect: Effect): AppliedEffect {
    const target = effect.target === 'opponent' ? other(owner) : owner
    const state = states[target]
    switch (effect.type) {
      case 'heal': {
        const amount = clamp(Math.min(effect.amount, fighters[target].maxHp - state.hp), 0)
        state.hp += amount
        rearmThresholds(target)
        return { type: 'heal', target, amount }
      }
      case 'damage': {
        // Montant compté en entier (overkill compris) ; les PV s'arrêtent à 0. En `hits` coups : tous comptés
        const each = clamp(effect.amount, 0)
        const hits = effect.hits ?? 1
        const amount = each * hits
        state.hp = Math.max(0, state.hp - amount)
        return { type: 'damage', target, amount, source: effect.source, ...(hits > 1 && { parts: Array.from({ length: hits }, () => each) }) }
      }
      case 'applyStatus': {
        // Pourfendre (`fromHit`) : des charges de plus, la part des PV que le coup de ce jet a retirés, arrondie au-dessus
        const stacks = effect.stacks + (effect.fromHit !== undefined && strike?.touched ? Math.ceil(strike.dealt * effect.fromHit) : 0)
        const status: Status = { id: effect.status, stacks }
        // Une seule valeur (Brûlure, `turnsFromStacks`) : sans durée donnée, il dure autant de tours que de charges
        const turns = effect.turns ?? (STATUSES[effect.status].turnsFromStacks ? stacks : undefined)
        if (turns !== undefined) status.turns = turns
        const { list, outcome } = resolveApplication(state.statuses, status, fighters[target].immunities)
        state.statuses = list
        if (outcome.kind === 'applied') state.fresh.add(effect.status)
        if (outcome.kind === 'applied') posedBy[target][effect.status] = beats.length
        return {
          type: 'applyStatus',
          target,
          status: effect.status,
          stacks,
          turns,
          result: outcome,
        }
      }
      case 'release': {
        // Le porteur de l'effet relâche son statut à jauges sur sa cible
        const holder = states[owner]
        const held = holder.statuses.find((s) => s.id === effect.status)
        const stored = held?.stacks ?? 0
        holder.statuses = holder.statuses.filter((s) => s.id !== effect.status)
        // Compté en entier (overkill compris) ; les PV s'arrêtent à 0. En part (`share`, Rétribution 0.107.0) : arrondie au-dessous
        const amount = clamp(Math.max(effect.min, Math.floor(stored * (effect.share ?? 1))), 0)
        state.hp = Math.max(0, state.hp - amount)
        // Les jauges, une par impact, quand elles partent en entier (pas en part ni sous le minimum)
        const parts = held?.slots?.filter((n) => n > 0)
        return { type: 'damage', target, amount, source: effect.source, ...(amount === stored && parts && parts.length > 1 && { parts }) }
      }
      case 'cleanse': {
        // Les mécanismes (statuts de forme, mécanismes de compétence : `mechanic`) ne se purgent pas
        const matching = state.statuses.filter((s) => STATUSES[s.id].polarity === effect.polarity && !isMechanic(s.id)).map((s) => s.id)
        // `count` : seulement les derniers posés (ordre de la liste), toutes charges comprises
        const removed = effect.count === undefined ? matching : matching.slice(-effect.count)
        // Rien à retirer : l'effet de repli joue à la place (il garde la même cible de référence, le porteur)
        if (removed.length === 0 && effect.orElse) return applyEffect(owner, effect.orElse)
        state.statuses =
          effect.count === undefined ? removeStatuses(state.statuses, effect.polarity) : state.statuses.filter((s) => !removed.includes(s.id))
        return { type: 'cleanse', target, removed }
      }
    }
  }

  /** Applique des effets dans l'ordre et s'arrête au premier K.O. (vérification d'état). */
  function applyEffects(owner: Side, effects: readonly Effect[]) {
    const applied: AppliedEffect[] = []
    for (const effect of effects) {
      applied.push(applyEffect(owner, effect))
      if (fallen() !== undefined) break
    }
    return applied
  }

  /**
   * Ce qu'un statut fait dans une fenêtre : sa réaction déclarée (`reactions`), ou sa réaction à un coup qui touche
   * (Vol de vie sur `hit` : les PV retirés lui reviennent ; Riposte sur `hurt` : une part renvoyée). Undefined : rien.
   */
  function reactionTo(status: Status, trigger: Trigger): Effect[] | undefined {
    const def = STATUSES[status.id]
    const declared = def.reactions?.[trigger]
    if (declared) return declared(status)
    if (!strike?.touched) return undefined
    if (trigger === 'hit' && def.drainsHit) return [{ type: 'heal', amount: strike.dealt }]
    if (trigger === 'hurt' && def.reflectsHit) return [{ type: 'damage', amount: Math.round(strike.dealt * def.reflectsHit), target: 'opponent', source: 'strike' }]
    return undefined
  }

  /**
   * Jauges (Rétribution) : le coup qui touche `side` range ses PV retirés dans le statut à jauges qu'il sait relâcher
   * (la plus ancienne jauge cède sa place). Une réaction sans effet : son étape montre les jauges remplies.
   */
  function fillGauge(side: Side, id: StatusId, dealt: number, cause?: number) {
    const old = states[side].statuses.find((s) => s.id === id)
    const slots = [...(old?.slots ?? []), dealt].slice(-STATUSES[id].fillsOnHurt!.slots)
    const gauge: Status = { id, stacks: slots.reduce((t, n) => t + n, 0), slots }
    states[side].statuses = old ? states[side].statuses.map((s) => (s.id === id ? gauge : s)) : [...states[side].statuses, gauge]
    push({ type: 'statusReaction', side, status: id, trigger: 'hurt', effects: [] }, cause)
  }

  /**
   * Fenêtre de déclenchement pour un camp : réactions de ses statuts (ordre de pose), puis
   * événements de son personnage (ordre de définition), puis ses reliques (ordre d'obtention).
   * Renvoie le perdant s'il y a K.O. `cause` : l'étape qui a ouvert la fenêtre (le coup, la pièce, le jet greffé,
   * l'étape qui a franchi un seuil) ; aucune pour une fenêtre de phase (début ou fin de tour, ouverture).
   */
  function fire(side: Side, trigger: Trigger, cause?: number): Side | undefined {
    // Coup brut (Furie des vents) : ses fenêtres du dé n'éveillent que les reliques (2026-10-23), ni statut ni compétence
    const relicsOnly = !!strike?.plain && isRollTrigger(trigger)
    // Statuts présents à l'ouverture de la fenêtre : un statut posé dans cette fenêtre attend la suivante (pas de
    // chaîne). Jauges (Rétribution) : celles que le porteur sait relâcher ; encore vides, elles passent après ses statuts.
    const gauges =
      trigger === 'hurt' && strike?.touched
        ? STATUS_IDS.filter((id) => STATUSES[id].fillsOnHurt && fighters[side].events.some((e) => e.effects.some((x) => x.type === 'release' && x.status === id)))
        : []
    const order: StatusId[] = [...states[side].statuses.map((s) => s.id), ...gauges.filter((id) => !states[side].statuses.some((s) => s.id === id))]
    for (const id of relicsOnly ? [] : order) {
      const def = STATUSES[id]
      if (gauges.includes(id)) {
        fillGauge(side, id, strike!.dealt, cause)
        continue
      }
      // Le statut tel qu'il est maintenant : retiré entre-temps, il ne réagit plus. Pendant un coup, seul un statut déjà
      // là au début du coup réagit, et avec au plus ses charges de ce moment (les charges ajoutées attendent le coup suivant)
      const now = states[side].statuses.find((s) => s.id === id)
      const was = strikeBase?.[side].find((s) => s.id === id)
      if (strikeBase && !was) continue
      const status = now && was && was.stacks < now.stacks ? { ...now, stacks: was.stacks } : now
      const react = status && reactionTo(status, trigger)
      if (!react) continue
      const effects = applyEffects(side, react)
      if (def.spentOnReaction) states[side].statuses = states[side].statuses.filter((s) => s.id !== id)
      // Saignement, Vol de vie, Riposte : le statut agit avec ses charges, puis en perd une dans la même étape
      else if (def.decays || def.drainsHit || def.reflectsHit) states[side].statuses = consumeStatus(states[side].statuses, id, 1)
      const beat = push({ type: 'statusReaction', side, status: id, trigger, effects }, cause)
      const down = fallen() ?? checkThresholds(beat)
      if (down !== undefined) return down
    }
    for (const event of relicsOnly ? [] : fighters[side].events) {
      if (event.trigger !== trigger) continue
      // Une compétence du dé ne part dans la fenêtre de sa face que si elle modifie un coup qui touche (un coup doit
      // toucher pour poser un malus physique, vérifié avant tout tirage) ou si son jet est remplacé ; greffée, elle est
      // déjà partie au jet (`fireGrafts`)
      if (isRollTrigger(trigger) && !(strike?.replaced || (relationOf(event) === 'modify' && strike?.touched))) continue
      if (!canFire(side, event)) continue
      const down = fireEvent(side, event, trigger, cause)
      if (down !== undefined) return down
    }
    // Reliques : un moment du coup, ou le début d'un de ses tours (à partir du tour de la relique)
    for (const relic of fighters[side].relics) {
      const t = relic.trigger
      const due = t?.type === 'strike' ? t.on === trigger : t?.type === 'turn' && trigger === 'turnStart' && states[side].turnsTaken >= t.turn
      if (!due) continue
      const down = fireRelic(side, relic, cause)
      if (down !== undefined) return down
    }
    return undefined
  }

  /** Une condition d'événement, vue depuis le porteur `side`. */
  function conditionMet(side: Side, c: Condition): boolean {
    if (c.type === 'fromTurn') return turn >= c.turn
    const target = c.who === 'opponent' ? other(side) : side
    const state = states[target]
    switch (c.type) {
      case 'hpBelow':
        return state.hp < fighters[target].maxHp * c.ratio
      case 'hpAtLeast':
        return state.hp >= fighters[target].maxHp * c.ratio
      case 'hasStatus':
        return stacksOf(state.statuses, c.status) >= (c.stacks ?? 1)
      case 'lacksStatus':
        return stacksOf(state.statuses, c.status) === 0
    }
  }

  /** La compétence existe-t-elle sous la forme actuelle du porteur (`form`) ? */
  function inForm(side: Side, event: CharacterEvent) {
    return !event.form || event.form === fighters[side].forms?.[states[side].form].id
  }

  /** Une compétence part : ses effets s'appliquent, son étape est émise. Renvoie le perdant s'il y a K.O. */
  function fireEvent(side: Side, event: CharacterEvent, trigger: Trigger, cause?: number): Side | undefined {
    states[side].fired[event.id] = (states[side].fired[event.id] ?? 0) + 1
    const effects = applyEffects(side, event.effects)
    const id = push({ type: 'event', event: { side, eventId: event.id, name: event.name, trigger, effects } }, cause)
    return fallen() ?? checkThresholds(id)
  }

  /**
   * Au jet (règles v2, phase 5 bis) : les compétences de cette face qui se greffent sur le coup de base, dans l'ordre de
   * définition, avant le coup. Ni statut ni relique : la fenêtre de la face s'ouvre ensuite avec le coup.
   */
  function fireGrafts(side: Side, roll: number, cause: number): Side | undefined {
    for (const event of fighters[side].events) {
      if (!isRollTrigger(event.trigger) || relationOf(event) !== 'graft' || !rollMatches(event.trigger, roll, DIE_FACES)) continue
      if (!canFire(side, event)) continue
      const down = fireEvent(side, event, event.trigger, cause)
      if (down !== undefined) return down
    }
    return undefined
  }

  function canFire(side: Side, event: CharacterEvent) {
    if (!inForm(side, event)) return false
    if (event.limit !== undefined && (states[side].fired[event.id] ?? 0) >= event.limit) return false
    if (event.when && !event.when.every((c) => conditionMet(side, c))) return false
    // Le tirage n'a lieu que pour les événements aléatoires : les autres ne consomment pas de hasard.
    return event.chance === undefined || chance(rng, event.chance)
  }

  /**
   * Relique prête : il lui reste une charge, sa recharge est passée, ses conditions sont remplies. Aucun
   * tirage : une relique n'a pas de chance de déclenchement.
   */
  function fireRelic(side: Side, relic: Relic, cause?: number): Side | undefined {
    const s = states[side]
    const uses = s.relicUses[relic.id] ?? 0
    if (relic.charges !== undefined && uses >= relic.charges) return undefined
    if (s.turnsTaken < (s.relicReady[relic.id] ?? 0)) return undefined
    if (relic.when && !relic.when.every((c) => conditionMet(side, c))) return undefined
    s.relicUses[relic.id] = uses + 1
    if (relic.cooldown) s.relicReady[relic.id] = s.turnsTaken + relic.cooldown
    const effects = applyEffects(side, relic.effects ?? [])
    const id = push({ type: 'relic', side, relic: relic.id, name: relic.name, effects, uses: uses + 1 }, cause)
    return fallen() ?? checkThresholds(id)
  }

  /**
   * Seuils de PV, après chaque changement de PV : « bloodied » (la première fois sous la moitié), puis les
   * reliques de seuil, qui partent quand les PV passent sous le leur et se réarment s'ils remontent au-dessus.
   * `cause` : l'étape dont le changement de PV est vérifié ; elle devient la cause de ce qui se déclenche.
   */
  function checkThresholds(cause: number): Side | undefined {
    // Les passages se lisent sur les PV du changement vérifié (0.85.0) : une relique déclenchée pendant cette même
    // vérification (Larme de givre qui soigne) n'efface pas le passage d'une autre relique (Trophée adverse, même coup)
    const crossed = new Set<string>()
    for (const side of SIDES)
      for (const relic of fighters[side].relics) {
        const t = relic.trigger
        if (t?.type !== 'hpBelow') continue
        const watched = t.who === 'opponent' ? other(side) : side
        const hp = states[watched].hp
        if (hp > 0 && hp < fighters[watched].maxHp * t.ratio && !states[side].relicBelow.has(relic.id)) crossed.add(`${side}:${relic.id}`)
      }
    for (const side of SIDES) {
      const s = states[side]
      if (!s.bloodied && s.hp > 0 && s.hp < fighters[side].maxHp / 2) {
        s.bloodied = true
        const down = fire(side, 'bloodied', cause)
        if (down !== undefined) return down
      }
      for (const relic of fighters[side].relics) {
        const t = relic.trigger
        if (t?.type !== 'hpBelow') continue
        // Le seuil lit les PV du porteur, ou ceux de l'adversaire (Trophée du chasseur) ; l'effet reste au porteur
        const watched = t.who === 'opponent' ? other(side) : side
        const hp = states[watched].hp
        const passed = crossed.has(`${side}:${relic.id}`)
        if (!passed && hp >= fighters[watched].maxHp * t.ratio) s.relicBelow.delete(relic.id)
        else if ((passed || hp > 0) && !s.relicBelow.has(relic.id)) {
          s.relicBelow.add(relic.id)
          const down = fireRelic(side, relic, cause)
          if (down !== undefined) return down
        }
      }
    }
    return fallen()
  }

  /** Enchaîne des fenêtres et s'arrête au premier K.O. */
  function fireAll(list: [Side, Trigger][], cause?: number) {
    for (const [side, trigger] of list) {
      const down = fire(side, trigger, cause)
      if (down !== undefined) return down
    }
    return undefined
  }

  /**
   * Effets de tour des statuts du porteur (`onTurnStart` ou `onTurnEnd`) : bonus d'abord, puis
   * malus, chacun dans l'ordre de pose. Puis décompte des durées qui s'usent à ce moment-là.
   */
  function statusPhase(side: Side, phase: TurnPhase): Side | undefined {
    const order: Polarity[] = ['positive', 'negative']
    const ticking = order.flatMap((p) => states[side].statuses.filter((s) => STATUSES[s.id].polarity === p))
    const faded: StatusId[] = []
    /** Étape d'effet de chaque statut dans cette phase : son décompte et son expiration en découlent */
    const ticks = new Map<StatusId, number>()
    for (const status of ticking) {
      const def = STATUSES[status.id]
      const tick = phase === 'turnStart' ? def.onTurnStart?.(status) : def.onTurnEnd?.(status)
      // Un statut retiré entre-temps (ex. annulé par son opposé) n'agit plus.
      if (!tick || !states[side].statuses.some((s) => s.id === status.id)) continue
      const effects = applyEffects(side, tick)
      // S'estomper est la règle même du statut : il perd une charge chaque fois qu'il agit, dans l'étape de son effet
      if (def.decays) {
        states[side].statuses = consumeStatus(states[side].statuses, status.id, 1)
        if (!states[side].statuses.some((s) => s.id === status.id)) faded.push(status.id)
      }
      const id = push({ type: 'statusTick', phase, side, status: status.id, effects })
      ticks.set(status.id, id)
      const down = fallen() ?? checkThresholds(id)
      if (down !== undefined) return down
    }
    // Un statut posé pendant ce tour n'est pas décompté à sa fin : « 1 tour » dure jusqu'au prochain.
    const fresh = phase === 'turnEnd' ? states[side].statuses.filter((s) => states[side].fresh.has(s.id)) : []
    const { kept: aged, expired } = tickDurations(
      states[side].statuses.filter((s) => !fresh.includes(s)),
      phase,
    )
    const kept = states[side].statuses.flatMap((s) => (fresh.includes(s) ? [s] : aged.filter((a) => a.id === s.id)))
    const changes = kept.flatMap((s) => {
      const was = states[side].statuses.find((w) => w.id === s.id)
      return was?.turns !== undefined && s.turns !== undefined && was.turns !== s.turns
        ? [{ status: s.id, from: was.turns, to: s.turns }]
        : []
    })
    states[side].statuses = kept
    // Une seule étape pour l'usure de la phase : durées décomptées et statuts éteints (épuisés ou expirés). Sa cause :
    // l'effet du premier statut concerné qui a agi dans cette phase (son « −2 » et son compteur vont ensemble)
    const gone = [...faded, ...expired]
    if (changes.length || gone.length)
      push({ type: 'statusAge', phase, side, changes, expired: gone }, [...changes.map((c) => c.status), ...gone].map((s) => ticks.get(s)).find((t) => t !== undefined))
    return undefined
  }

  /**
   * Les compétences de cette face qui ont cette relation au coup et peuvent partir : même règle que leur déclenchement
   * (forme, limite, conditions), sans tirage. `validateRoster` refuse `chance` à une compétence qui remplace le coup ou
   * qui le multiplie : le moteur doit savoir dès le jet si le coup part, et ce qu'il vaut.
   */
  function ready(side: Side, roll: number, relation: HitRelation) {
    return fighters[side].events.filter(
      (e) =>
        relationOf(e) === relation &&
        inForm(side, e) &&
        isRollTrigger(e.trigger) &&
        rollMatches(e.trigger, roll, DIE_FACES) &&
        (e.limit === undefined || (states[side].fired[e.id] ?? 0) < e.limit) &&
        (!e.when || e.when.every((c) => conditionMet(side, c))),
    )
  }

  /**
   * Le coup de base de ce jet, avec son multiplicateur : une compétence de sa face qui le modifie avec `hitMultiplier`
   * (Crescendo, Soliste) en fait « ce coup ×N » ; Crescendo (`buildsUp`) gagne ×1 de plus chaque fois qu'il est parti.
   * Elle part ensuite, comme toute compétence qui modifie, dans la fenêtre de sa face si le coup touche.
   */
  function baseHit(side: Side, jetRoll: StrikeRoll): StrikeRoll {
    const multiplier = ready(side, jetRoll.roll, 'modify').reduce(
      (m, e) => m * (e.hitMultiplier === undefined ? 1 : e.hitMultiplier + (e.buildsUp ? (states[side].fired[e.id] ?? 0) : 0)),
      1,
    )
    return multiplier > 1 ? { ...jetRoll, multiplier } : jetRoll
  }

  /**
   * Le porteur a-t-il, sous sa forme du moment, une compétence de cette face qui se greffe sur le coup et peut partir
   * (limite, conditions : une compétence épuisée laisse sa face nue, 0.107.0) ? Sa chance se tire au déclenchement.
   */
  function grafts(side: Side, roll: number) {
    return ready(side, roll, 'graft').length > 0
  }

  /** Lance le d6 (un rang de dé en mode triche). */
  function drawDie(): { roll: number; forced: boolean } {
    const forced = nextForced()
    return { roll: forceRoll(rollDie(rng, DIE_FACES), DIE_FACES, forced), forced: forced !== undefined }
  }

  /**
   * Un jet complet (règles v2, phase 5 bis, docs/RESOLUTION.md § 2) : un dé, qui désigne une face. Sa compétence
   * remplace le coup (jet remplacé), ou se greffe (étape roll, la compétence, puis le coup de base au dé tiré), ou modifie
   * le coup (elle part dans ses fenêtres s'il touche, ou le multiplie) ; une face nue ne porte que le coup de base.
   * `cause` : la rafale dont le jet fait partie (deux dés, Coup de chance).
   */
  function jet(attacker: Side, cause?: number): Side | undefined {
    const { roll, forced } = drawDie()
    const source = fighters[attacker].attackSourceIn(states[attacker].form)
    if (ready(attacker, roll, 'replace').length > 0) return strikeOnce(attacker, { roll, source, forced, replaced: true }, false, cause)
    if (!grafts(attacker, roll)) return strikeOnce(attacker, baseHit(attacker, { roll, source, forced }), false, cause)
    const rolled = push({ type: 'roll', side: attacker, roll, faces: DIE_FACES, ...(forced && { forced: true as const }) }, cause)
    const down = fireGrafts(attacker, roll, rolled)
    if (down !== undefined) return down
    return strikeOnce(attacker, baseHit(attacker, { roll, source, preset: true }), false, rolled)
  }

  /**
   * Un coup de base de `attacker` (ou un jet remplacé), fenêtres comprises, au jet déjà tiré. Renvoie le perdant s'il y a
   * K.O. `plain` : coup brut (Furie des vents), dont la face ne déclenche aucune compétence (les reliques, si).
   * `cause` : l'étape `roll` ou `flurry` dont ce coup fait partie ; aucune pour le coup simple de l'action.
   */
  function strikeOnce(attacker: Side, jetRoll: StrikeRoll, plain = false, cause?: number): Side | undefined {
    const defender = other(attacker)
    const att = states[attacker]
    const def = states[defender]
    // État de référence du coup : les statuts de ce moment, après une compétence greffée (règle 9)
    const base: Pair<Status[]> = [states[0].statuses, states[1].statuses]
    const outcome = resolveAttack(rng, fighters[attacker], fighters[defender], att.statuses, def.statuses, jetRoll)
    const touched = !outcome.dodged && !outcome.replaced
    if (outcome.critBy) att.statuses = consumeStatus(att.statuses, outcome.critBy, 1)
    if (outcome.dodgeBy) def.statuses = consumeStatus(def.statuses, outcome.dodgeBy, 1)
    for (const { status, absorbed } of outcome.shields) def.statuses = consumeStatus(def.statuses, status, absorbed)
    // Fausse note : le coup du porteur qui touche l'a subie, elle disparaît avec toutes ses charges (`spentOnHit`)
    if (touched) att.statuses = att.statuses.filter((x) => !STATUSES[x.id].spentOnHit)
    // Vol de vie sur un coup esquivé : la charge est perdue sans soin, au moment même du coup (un jet remplacé ne
    // porte pas de coup : la charge reste). Sur un coup qui touche, il réagit dans la fenêtre `hit`.
    const drain = outcome.dodged ? att.statuses.find((s) => STATUSES[s.id].drainsHit) : undefined
    if (drain) att.statuses = consumeStatus(att.statuses, drain.id, 1)
    // Luciole : chaque coup qui touche le porteur lui retire une charge (`spentOnHurt`)
    if (touched) for (const s of def.statuses.filter((x) => STATUSES[x.id].spentOnHurt)) def.statuses = consumeStatus(def.statuses, s.id, 1)
    const dealt = outcome.damage
    def.hp = Math.max(0, def.hp - dealt)
    const hit = push({ type: 'attack', attack: { attacker, ...outcome, dealt, ...(plain && { plain: true as const }) } }, cause)
    lastStrike = hit
    if (def.hp === 0) return defender

    // Fenêtres du coup : seuils, faces du dé (reliques seules pour un coup brut), puis esquivé ou touché. Vol de vie,
    // Riposte et jauges y réagissent comme toute réaction (2026-10-21 : une seule règle pour « un coup qui touche »).
    // Seuls les statuts déjà là au début du coup y réagissent (`strikeBase`).
    const fell = withinStrike(base, () => {
      const down = checkThresholds(hit)
      if (down !== undefined) return down
      const hitTriggers: [Side, Trigger][] = [faceTrigger(outcome.roll), ...(outcome.roll === DIE_FACES ? ['naturalMax' as const] : [])].map((t) => [attacker, t])
      if (outcome.dodged) hitTriggers.push([attacker, 'missed'], [defender, 'dodge'])
      else if (touched) {
        hitTriggers.push([attacker, 'hit'])
        if (outcome.crit) hitTriggers.push([attacker, 'crit'])
        hitTriggers.push([defender, 'hurt'])
      }
      return fireStrike(hitTriggers, touched, dealt, hit, plain, outcome.replaced)
    })
    if (fell !== undefined) return fell
    // Pile ou face : la pièce part aussitôt, juste après le coup qui l'a posée ; pile, ce coup ×N
    return tossCoin(attacker, hit, dealt)
  }

  /**
   * Pile ou face (relation « modifie », règles v2) : si `side` détient une pièce, il la lance tout de suite (pile = 1 sur
   * un d2, un rang de dé). Pile, ce coup ×N (`coinToss.multiplier`) : les PV qu'il a retirés (`dealt`), encore N − 1 fois,
   * en DP et en une perte ; s'ils « touchent » (0.42.0), les fenêtres `hit` et `hurt` s'ouvrent comme pour un coup qui
   * touche de ce montant : tout ce qui réagit à un coup qui touche réagit (Aura de décoction, Épines, Saignement, Vol de
   * vie, Riposte, jauges). Le statut est consommé. Renvoie le perdant s'il y a K.O. La pièce a pour cause l'étape qui l'a
   * posée, à défaut le coup `after`.
   */
  function tossCoin(side: Side, after: number, dealt: number): Side | undefined {
    const coin = states[side].statuses.find((s) => STATUSES[s.id].coinToss)
    if (!coin) return undefined
    // État de référence de la pièce (un coup à part entière, règle 9) : les statuts au moment où elle part
    const base: Pair<Status[]> = [states[0].statuses, states[1].statuses]
    states[side].statuses = states[side].statuses.filter((s) => s.id !== coin.id)
    const forced = nextForced()
    const heads = forceRoll(rollDie(rng, 2), 2, forced) === 1
    const toss = STATUSES[coin.id].coinToss!
    const extra = dealt * (toss.multiplier - 1)
    const effects = heads ? applyEffects(side, [{ type: 'damage', amount: extra, target: 'opponent', source: 'strike' }]) : []
    const id = push(
      { type: 'coin', side, status: coin.id, heads, effects, ...(forced !== undefined && { forced: true as const }) },
      posedBy[side][coin.id] ?? after,
    )
    return withinStrike(base, () => {
      const down = fallen() ?? checkThresholds(id)
      if (down !== undefined || !heads || !toss.headsTouches) return down
      return fireStrike([[side, 'hit'], [other(side), 'hurt']], true, extra, id)
    })
  }

  /**
   * Coups instantanés (Furie des vents) : une charge gagnée pendant l'action frappe tout de suite, en coups de base
   * bruts (0.69.0), chacun avec son dé : ils ne déclenchent aucune compétence, donc aucune Furie en chaîne. Ils ont pour
   * cause l'étape qui a posé la charge (Furie des vents sur un 2), à défaut le dernier coup.
   */
  function burst(attacker: Side): Side | undefined {
    const att = states[attacker]
    const charge = att.statuses.find((s) => STATUSES[s.id].instantStrikes)
    if (!charge) return undefined
    const strikes = STATUSES[charge.id].extraStrikes ?? 1
    att.statuses = consumeStatus(att.statuses, charge.id, 1)
    const burstBeat = push(
      { type: 'flurry', side: attacker, status: charge.id, strikes, faces: Array.from({ length: strikes }, () => DIE_FACES) },
      posedBy[attacker][charge.id] ?? lastStrike,
    )
    for (let k = 0; k < strikes; k++) {
      const { roll, forced } = drawDie()
      const down = strikeOnce(attacker, { roll, source: fighters[attacker].attackSourceIn(att.form), forced }, true, burstBeat)
      if (down !== undefined) return down
    }
    return undefined
  }

  /**
   * L'action : un jet par dé (deux pour un personnage à deux dés), plus ceux d'un statut de coups supplémentaires non
   * instantané (Coup de chance, consommé au début de l'action : un nouveau déclenchement pendant ces jets vaut pour la
   * prochaine action). Chaque jet est complet : son dé, sa face, sa compétence, son coup de base. Plusieurs jets font une
   * rafale (étape flurry), cause de chacun ; sans statut, celle des deux dés de la barde.
   */
  function action(attacker: Side): Side | undefined {
    const att = states[attacker]
    const flurry = att.statuses.find((s) => STATUSES[s.id].extraStrikes && !STATUSES[s.id].instantStrikes)
    const def = flurry && STATUSES[flurry.id]
    const extra = flurry && def ? def.extraStrikes! * (def.strikeCharges === 'all' ? flurry.stacks : 1) : 0
    const jets = fighters[attacker].dice + extra
    if (jets === 1) return jet(attacker)
    // Charges en réserve (`strikeCharges: 'one'`) : une seule est dépensée, les autres attendent
    if (flurry && def) att.statuses = def.strikeCharges === 'one' ? consumeStatus(att.statuses, flurry.id, 1) : att.statuses.filter((s) => s.id !== flurry.id)
    // Tous les jets d'une rafale, celui de l'action compris, ont la rafale pour cause
    const volley = push({ type: 'flurry', side: attacker, ...(flurry && { status: flurry.id }), strikes: jets, faces: Array.from({ length: jets }, () => DIE_FACES) })
    for (let k = 0; k < jets; k++) {
      const down = jet(attacker, volley)
      if (down !== undefined) return down
    }
    return undefined
  }

  let down = fireAll([
    [0, 'combatStart'],
    [1, 'combatStart'],
  ])
  if (down !== undefined) return end(other(down), 'ko')

  let attacker: Side = first
  for (turn = 1; turn <= MAX_TURNS; turn++) {
    owner = attacker
    const defender = other(attacker)
    const att = states[attacker]

    for (const side of SIDES) states[side].fresh.clear()

    // Changement de forme (druide) : au tout début de chacun de ses tours, sauf le premier. Les statuts de
    // l'ancienne forme partent, ceux de la nouvelle arrivent, dans la même étape.
    if (fighters[attacker].forms && att.turnsTaken > 0) {
      const leaving = fighters[attacker].forms?.[att.form].statuses ?? []
      att.form = 1 - att.form
      att.statuses = [...att.statuses.filter((s) => !leaving.includes(s.id)), ...formStatuses(fighters[attacker], att.form)]
      phase = 'shift'
      push({ type: 'shift', side: attacker, form: att.form })
    }
    att.turnsTaken++

    // Phase 1 · Début de tour
    phase = 'turnStart'
    down = statusPhase(attacker, 'turnStart') ?? fire(attacker, 'turnStart')
    if (down !== undefined) return end(other(down), 'ko')

    // Phase 2 · Action : un statut de contrôle fait perdre l'action, sinon ses jets, puis les coups instantanés d'une
    // charge gagnée pendant l'action (Furie des vents)
    phase = 'action'
    const control = att.statuses.find((s) => STATUSES[s.id].skipsAction)
    if (control) {
      att.statuses = consumeStatus(att.statuses, control.id, 1)
      push({ type: 'skip', side: attacker, status: control.id })
    } else {
      down = action(attacker) ?? burst(attacker)
      if (down !== undefined) return end(other(down), 'ko')
    }

    // Phase 3 · Fin de tour
    phase = 'turnEnd'
    down = statusPhase(attacker, 'turnEnd') ?? fire(attacker, 'turnEnd')
    if (down !== undefined) return end(other(down), 'ko')

    attacker = defender
  }
  turn = MAX_TURNS
  return end(states[0].hp >= states[1].hp ? 0 : 1, 'turnLimit')
}

/** Couleurs des camps (tokens --side-a / --side-b du design system). hex reprend la valeur du
 *  token pour les attributs SVG, qui ne lisent pas les variables CSS partout. */
export const SIDE_STYLE = {
  0: { accent: 'text-side-a-hi', bar: 'bg-side-a', track: 'bg-side-a-track', ring: 'ring-side-a/60', hex: '#43B4EE' },
  1: { accent: 'text-side-b-hi', bar: 'bg-side-b', track: 'bg-side-b-track', ring: 'ring-side-b/60', hex: '#EE4A72' },
} as const

export const percent = (p: number) => `${Math.round(p * 100)} %`

export const multiplier = (m: number) => `×${m.toLocaleString('fr-FR')}`
