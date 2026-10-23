import type { Character } from './character'
import type { DamageSource } from './damage'
import { doubleTrigger, faceTrigger, isRollTrigger, rollMatches, type CharacterEvent, type Condition, type Effect, type Trigger } from './events'
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
 *     Phase 2 · Action : contrôle (`skipsAction` : le tour est perdu), sinon un coup, ou plusieurs
 *               (`extraStrikes`, consommé au début de l'action), chacun résolu en entier à son tour :
 *               dé → coup sacrifié (`forfeitsHit`) → esquive → reliques de coup, face dorée → critique → dégâts
 *               sortants → dégâts entrants → armure → boucliers
 *               → fenêtres du coup : bloodied, la face du dé (naturalOne… face:7), naturalMax (coup brut : reliques seules),
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
  /** Valeur du dé de dégâts */
  roll: number
  /** Nombre de faces du dé utilisé */
  faces: number
  dodged: boolean
  /** Esquive imposée par un statut du défenseur (ex. « Esquive améliorée »), sans tirage */
  dodgeForced: boolean
  /** Le statut du défenseur qui a imposé l'esquive (présent si `dodgeForced`) */
  dodgeBy?: StatusId
  /** Coup sacrifié par une compétence (`forfeitsHit`) : aucun dégât, ni esquive ni critique */
  forfeited: boolean
  /** Dé imposé par l'observateur (mode triche, `forcedRolls`) ; absent d'un combat normal */
  forced?: true
  /** Dé déjà tiré par la paire (personnage à deux dés, étape pair) : ce coup ne lance aucun dé */
  preset?: true
  /**
   * Coup transformé par une compétence (`reshapesHit` : Charge, Coup de griffe ; ou le gros coup d'un
   * double `merged` : Crescendo, Soliste) : `value` remplace le jet pour les dégâts ; le jet affiché
   * (`roll`) reste celui qui a déclenché la compétence
   */
  reshaped?: { event: string; value: number; noCrit: boolean }
  /**
   * Coup brut (0.69.0, coups de la Furie des vents) : ni coup sacrifié ni compétence de jet, un 1, un 2 ou un 3
   * frappe pour sa valeur. Les reliques de face et la dorure, elles, lisent son dé (2026-10-23).
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
  /** Un statut donne plusieurs coups à l'action (ex. Furie des vents) ; il est consommé */
  | { type: 'flurry'; side: Side; status: StatusId; strikes: number; faces: number[] }
  /**
   * Deux dés (personnage `twinDice`) : la paire lancée pour l'action. `double` : la face du double qui
   * déclenche une compétence (elle suit, étape event), absent si l'action est faite des deux coups.
   * `forced` : pour chaque dé, imposé ou non (mode triche).
   */
  | { type: 'pair'; side: Side; rolls: [number, number]; faces: number; double?: number; forced?: [boolean, boolean] }
  /** Pile ou face : une pièce lancée juste après le coup qui l'a posée ; pile, des dégâts directs, face, rien. Le statut est consommé */
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
 * Les dés que lance une étape, dans l'ordre (mode triche, `forcedRolls`) : un pour un coup (sauf un
 * coup dont la paire a déjà tiré le dé), un pour une pièce, deux pour une paire.
 */
export function diceOf(beat: Beat): RolledDie[] {
  if (beat.type === 'attack') return beat.attack.preset ? [] : [{ side: beat.attack.attacker, faces: beat.attack.faces, coin: false }]
  if (beat.type === 'coin') return [{ side: beat.side, faces: 2, coin: true }]
  if (beat.type === 'pair') return [0, 1].map(() => ({ side: beat.side, faces: beat.faces, coin: false }))
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
  return {
    damageDie: Math.round(clamp(modified.damageDie, 1)),
    armor: clamp(modified.armor, 0),
    dodgeChance: clamp(modified.dodgeChance, 0, 1),
    critChance: clamp(modified.critChance, 0, 1),
    critMultiplier: clamp(modified.critMultiplier, 1),
  }
}

/* ---------- Résolution d'une attaque ---------- */

/**
 * Résout un coup sans modifier l'état : le dé est lancé, le défenseur tente d'esquiver,
 * puis l'attaquant peut critiquer (forcément s'il porte un statut `forcesCrit`).
 * Les modificateurs de dégâts de l'attaquant s'appliquent, puis l'armure (le coup garde
 * au moins 1), puis les boucliers du défenseur absorbent ce qu'ils peuvent, sans descendre sous 1,
 * enfin les modificateurs de dégâts finaux de l'attaquant (`modifyFinal`), toujours au moins 1.
 * L'ordre des tirages (dé, esquive, critique) est fixe : il garantit la reproductibilité.
 */
/**
 * Dé imposé (mode triche) : le tirage a lieu quand même, pour que la suite du hasard reste celle du
 * combat d'origine ; seule sa valeur est remplacée.
 */
function forceRoll(drawn: number, faces: number, forced: number | undefined) {
  return forced === undefined ? drawn : Math.min(faces, Math.max(1, Math.round(forced)))
}

export function resolveAttack(
  rng: Rng,
  attacker: Character,
  defender: Character,
  attackerStatuses: readonly Status[],
  defenderStatuses: readonly Status[],
  /** Une compétence sacrifie-t-elle ce coup ? Interrogé juste après le dé (voir `forfeitsHit`) */
  forfeits: (roll: number, faces: number) => boolean = () => false,
  /** Dé imposé pour ce coup (ex. le d6 de Coup de chance) ; défaut : le dé du porteur */
  die?: number,
  /** Valeur imposée par l'observateur (mode triche), ramenée entre 1 et le nombre de faces */
  forcedRoll?: number,
  /** Une compétence transforme-t-elle ce coup (`reshapesHit`) ? Interrogé juste après le dé, si le coup n'est pas sacrifié */
  reshape: (roll: number, faces: number) => Attack['reshaped'] = () => undefined,
  /** Valeur déjà tirée par la paire (personnage à deux dés) : aucun dé n'est lancé pour ce coup */
  preset?: number,
): Omit<Attack, 'attacker' | 'dealt'> {
  const att = effectiveStats(attacker, attackerStatuses)
  const def = effectiveStats(defender, defenderStatuses)
  const faces = die ?? att.damageDie
  const roll = preset ?? forceRoll(rollDie(rng, faces), faces, forcedRoll)
  const base = {
    roll,
    faces,
    ...(forcedRoll !== undefined && { forced: true as const }),
    ...(preset !== undefined && { preset: true as const }),
    critMultiplier: att.critMultiplier,
    shields: [] as Attack['shields'],
    armor: def.armor,
    floored: false,
    dodgeForced: false,
    forfeited: false,
    modifiers: [] as AttackModifier[],
  }
  const nothing = { crit: false, critForced: false, raw: 0, damage: 0, armorAbsorbed: 0, shieldAbsorbed: 0 }
  if (forfeits(roll, faces)) return { ...base, ...nothing, dodged: false, forfeited: true }
  const reshaped = reshape(roll, faces)
  // Esquive imposée : pas de tirage (les combats sans ce statut gardent la même suite de hasard).
  const dodgeBy = defenderStatuses.find((s) => STATUSES[s.id].forcesDodge)?.id
  const dodgeForced = dodgeBy !== undefined
  if (dodgeForced || chance(rng, def.dodgeChance)) {
    return { ...base, ...nothing, ...(reshaped && { reshaped }), dodgeForced, ...(dodgeBy && { dodgeBy }), dodged: true }
  }
  // Reliques de coup : la valeur du coup qui touche grandit, avant le critique ; un bonus de face (Fer à quatre
  // clous) ne vaut que si le dé de ce coup fait cette face (deux dés : chaque dé se lit seul), coup brut compris
  // (2026-10-23 : une relique ou une dorure lit la face du dé, quel que soit le coup)
  const relicBonus = attacker.relics.flatMap((r) =>
    r.rollBonus && (r.onFace === undefined || r.onFace === roll) ? [{ relic: r.id, name: r.name, amount: r.rollBonus }] : [],
  )
  // Face dorée (forge du dé) : même règle qu'une relique de face
  const gild = attacker.gilded[roll] ?? 0
  const value = (reshaped?.value ?? roll) + relicBonus.reduce((t, b) => t + b.amount, 0) + gild

  // Un coup transformé « sans critique » (Charge) ne tire pas le critique et ne consomme pas un critique assuré
  const critBy = reshaped?.noCrit ? undefined : attackerStatuses.find((s) => STATUSES[s.id].forcesCrit)?.id
  const critForced = critBy !== undefined
  const crit = reshaped?.noCrit ? false : critForced || chance(rng, att.critChance)
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
    ...(reshaped && { reshaped }),
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
   * Le coup en cours, pendant ses fenêtres (null hors d'un coup) : a-t-il touché, et combien de PV a-t-il retirés.
   * Les réactions d'un coup qui touche en ont besoin (Vol de vie, Riposte, jauges).
   */
  let strike: { touched: boolean; dealt: number; plain: boolean } | null = null
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
  const fireStrike = (list: [Side, Trigger][], touched: boolean, dealt: number, cause: number, plain = false) => {
    strike = { touched, dealt, plain }
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
        const status: Status = { id: effect.status, stacks: effect.stacks }
        // Une seule valeur (Brûlure, `turnsFromStacks`) : sans durée donnée, il dure autant de tours que de charges
        const turns = effect.turns ?? (STATUSES[effect.status].turnsFromStacks ? effect.stacks : undefined)
        if (turns !== undefined) status.turns = turns
        const { list, outcome } = resolveApplication(state.statuses, status, fighters[target].immunities)
        state.statuses = list
        if (outcome.kind === 'applied') state.fresh.add(effect.status)
        if (outcome.kind === 'applied') posedBy[target][effect.status] = beats.length
        return {
          type: 'applyStatus',
          target,
          status: effect.status,
          stacks: effect.stacks,
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
        // Compté en entier (overkill compris) ; les PV s'arrêtent à 0
        const amount = clamp(Math.max(effect.min, stored), 0)
        state.hp = Math.max(0, state.hp - amount)
        const parts = held?.slots?.filter((n) => n > 0)
        return { type: 'damage', target, amount, source: effect.source, ...(stored >= effect.min && parts && parts.length > 1 && { parts }) }
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
   * Renvoie le perdant s'il y a K.O. `cause` : l'étape qui a ouvert la fenêtre (le coup, la pièce, la paire,
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
      // Pourfendre : un coup doit toucher pour poser un malus physique (vérifié avant tout tirage)
      if (event.trigger !== trigger || (event.needsTouch && !strike?.touched) || !canFire(side, event)) continue
      states[side].fired[event.id] = (states[side].fired[event.id] ?? 0) + 1
      const effects = applyEffects(side, event.effects)
      const id = push({ type: 'event', event: { side, eventId: event.id, name: event.name, trigger, effects } }, cause)
      const down = fallen() ?? checkThresholds(id)
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

  /** Une compétence du porteur transforme-t-elle ce coup (`reshapesHit`) ? Coup de griffe relance le dé, en secret. */
  function reshapes(side: Side, roll: number, faces: number): Attack['reshaped'] {
    const e = fighters[side].events.find(
      (x) =>
        x.reshapesHit &&
        inForm(side, x) &&
        rollMatches(x.trigger, roll, faces) &&
        (x.limit === undefined || (states[side].fired[x.id] ?? 0) < x.limit) &&
        (!x.when || x.when.every((c) => conditionMet(side, c))),
    )
    if (!e) return undefined
    const r = e.reshapesHit!
    const value = r.value === 'max' ? faces : rollDie(rng, faces) + (r.bonus ?? 0)
    return { event: e.id, value, noCrit: !!r.noCrit }
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

  /** Une compétence du porteur sacrifie-t-elle ce coup (`forfeitsHit`) ? Même règle que son déclenchement, sans tirage. */
  function forfeits(side: Side, roll: number, faces: number) {
    return fighters[side].events.some(
      (e) =>
        e.forfeitsHit &&
        inForm(side, e) &&
        isRollTrigger(e.trigger) &&
        rollMatches(e.trigger, roll, faces) &&
        (e.limit === undefined || (states[side].fired[e.id] ?? 0) < e.limit) &&
        (!e.when || e.when.every((c) => conditionMet(side, c))),
    )
  }

  /**
   * Un coup complet de `attacker`, fenêtres comprises. Renvoie le perdant s'il y a K.O.
   * `preset` : valeur déjà tirée par la paire (personnage à deux dés), sans nouveau dé.
   * `plain` : coup brut (Furie des vents), dont le jet ne déclenche aucune compétence (les reliques, si).
   * `cause` : l'étape `flurry` ou `pair` dont ce coup fait partie ; aucune pour le coup simple de l'action.
   */
  function strikeOnce(attacker: Side, die?: number, preset?: number, merged?: Attack['reshaped'], plain = false, cause?: number): Side | undefined {
    const defender = other(attacker)
    const att = states[attacker]
    const def = states[defender]
    // État de référence du coup : les statuts de ce moment, avant le dé (règle 9)
    const base: Pair<Status[]> = [states[0].statuses, states[1].statuses]
    const outcome = resolveAttack(
      rng,
      fighters[attacker],
      fighters[defender],
      att.statuses,
      def.statuses,
      (roll, faces) => !plain && forfeits(attacker, roll, faces),
      die,
      preset === undefined ? nextForced() : undefined,
      (roll, faces) => merged ?? (plain ? undefined : reshapes(attacker, roll, faces)),
      preset,
    )
    const touched = !outcome.dodged && !outcome.forfeited
    if (outcome.critBy) att.statuses = consumeStatus(att.statuses, outcome.critBy, 1)
    if (outcome.dodgeBy) def.statuses = consumeStatus(def.statuses, outcome.dodgeBy, 1)
    for (const { status, absorbed } of outcome.shields) def.statuses = consumeStatus(def.statuses, status, absorbed)
    // Fausse note : le coup du porteur qui touche l'a subie, elle disparaît avec toutes ses charges (`spentOnHit`)
    if (touched) att.statuses = att.statuses.filter((x) => !STATUSES[x.id].spentOnHit)
    // Vol de vie sur un coup esquivé : la charge est perdue sans soin, au moment même du coup (un coup sacrifié
    // n'est pas porté : la charge reste). Sur un coup qui touche, il réagit dans la fenêtre `hit`.
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
      const hitTriggers: [Side, Trigger][] = [
        faceTrigger(outcome.roll),
        ...(outcome.roll === outcome.faces && outcome.faces > 1 ? ['naturalMax' as const] : []),
      ].map((t) => [attacker, t])
      if (outcome.dodged) hitTriggers.push([attacker, 'missed'], [defender, 'dodge'])
      else if (touched) {
        hitTriggers.push([attacker, 'hit'])
        if (outcome.crit) hitTriggers.push([attacker, 'crit'])
        hitTriggers.push([defender, 'hurt'])
      }
      return fireStrike(hitTriggers, touched, dealt, hit, plain)
    })
    if (fell !== undefined) return fell
    // Pile ou face (2026-10-21) : la pièce part aussitôt, juste après le coup pendant lequel elle a été posée
    return tossCoin(attacker, hit) ?? tossCoin(defender, hit)
  }

  /**
   * Pile ou face : si `side` détient une pièce, il la lance tout de suite (pile = 1 sur un d2, un rang de dé).
   * Pile, les dégâts directs de la pièce ; s'ils « touchent » (0.42.0), les fenêtres `hit` et `hurt` s'ouvrent comme
   * pour un coup qui touche de ce montant : tout ce qui réagit à un coup qui touche réagit (Aura de décoction, Épines,
   * Saignement, Vol de vie, Riposte, jauges). Le statut est consommé. Renvoie le perdant s'il y a K.O.
   * La pièce a pour cause l'étape qui l'a posée, à défaut le coup `after` qui la fait partir.
   */
  function tossCoin(side: Side, after: number): Side | undefined {
    const coin = states[side].statuses.find((s) => STATUSES[s.id].coinToss)
    if (!coin) return undefined
    // État de référence de la pièce (un coup à part entière, règle 9) : les statuts au moment où elle part
    const base: Pair<Status[]> = [states[0].statuses, states[1].statuses]
    states[side].statuses = states[side].statuses.filter((s) => s.id !== coin.id)
    const forced = nextForced()
    const heads = forceRoll(rollDie(rng, 2), 2, forced) === 1
    const toss = STATUSES[coin.id].coinToss!
    const effects = heads ? applyEffects(side, [{ type: 'damage', amount: toss.damage, target: 'opponent', source: 'strike' }]) : []
    const id = push(
      { type: 'coin', side, status: coin.id, heads, effects, ...(forced !== undefined && { forced: true as const }) },
      posedBy[side][coin.id] ?? after,
    )
    return withinStrike(base, () => {
      const down = fallen() ?? checkThresholds(id)
      if (down !== undefined || !heads || !toss.headsTouches) return down
      return fireStrike([[side, 'hit'], [other(side), 'hurt']], true, toss.damage, id)
    })
  }

  /**
   * Action d'un personnage à deux dés (la barde) : la paire est lancée (deux rangs de dé), puis un double
   * qui a sa compétence la déclenche à la place des coups (et ses `volley` coups de la face du double) ;
   * sinon deux coups, un par dé, avec la valeur tirée. Renvoie le perdant s'il y a K.O.
   */
  function twinAction(attacker: Side): Side | undefined {
    const att = states[attacker]
    const faces = effectiveStats(fighters[attacker], att.statuses).damageDie
    const draws = [0, 1].map(() => {
      const forced = nextForced()
      return { roll: forceRoll(rollDie(rng, faces), faces, forced), forced: forced !== undefined }
    })
    const rolls: [number, number] = [draws[0].roll, draws[1].roll]
    const trigger = rolls[0] === rolls[1] ? doubleTrigger(rolls[0]) : undefined
    // Même règle que le déclenchement (forme, limite, conditions), sans tirage : `validateRoster` refuse `chance` ici
    const skill = trigger && fighters[attacker].events.find((e) => e.trigger === trigger && canFire(attacker, e))
    const pair = push({
      type: 'pair',
      side: attacker,
      rolls,
      faces,
      ...(skill && { double: rolls[0] }),
      ...(draws.some((d) => d.forced) && { forced: [draws[0].forced, draws[1].forced] as [boolean, boolean] }),
    })
    if (!skill) {
      for (const roll of rolls) {
        const down = strikeOnce(attacker, undefined, roll, undefined, false, pair)
        if (down !== undefined) return down
      }
      return undefined
    }
    const down = fire(attacker, trigger!, pair)
    if (down !== undefined) return down
    // `merged` : un seul coup qui vaut la somme (Soliste : 3 × 5 = 15), comme un coup transformé : le dé
    // affiché reste celui du double, la valeur du coup est la somme
    if (skill.merged && skill.volley)
      return strikeOnce(attacker, undefined, rolls[0], { event: skill.id, value: skill.volley * rolls[0], noCrit: false }, false, pair)
    for (let k = 0; k < (skill.volley ?? 0); k++) {
      const down = strikeOnce(attacker, undefined, rolls[0], undefined, false, pair)
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
    const def = states[defender]

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

    // Phase 2 · Action : un statut de contrôle fait perdre l'action, sinon on attaque.
    phase = 'action'
    const control = att.statuses.find((s) => STATUSES[s.id].skipsAction)
    if (control) {
      att.statuses = consumeStatus(att.statuses, control.id, 1)
      push({ type: 'skip', side: attacker, status: control.id })
    } else if (fighters[attacker].twinDice) {
      down = twinAction(attacker)
      if (down !== undefined) return end(other(down), 'ko')
    } else {
      // Coups supplémentaires (Furie des vents, Coup de chance) : le statut est consommé avant le
      // premier coup, si bien qu'un nouveau déclenchement pendant ces coups vaut pour la prochaine action.
      // Les coups instantanés (Furie des vents) partent après le coup de l'action, pas avant (voir plus bas)
      const flurry = att.statuses.find((s) => STATUSES[s.id].extraStrikes && !STATUSES[s.id].instantStrikes)
      const own = effectiveStats(fighters[attacker], att.statuses).damageDie
      const faces = [own]
      let volley: number | undefined
      if (flurry) {
        const def = STATUSES[flurry.id]
        const extra = def.extraStrikes! * (def.strikeCharges === 'all' ? flurry.stacks : 1)
        for (let k = 0; k < extra; k++) faces.push(def.extraDie ?? own)
        // Charges en réserve (`strikeCharges: 'one'`) : une seule est dépensée, les autres attendent
        att.statuses = def.strikeCharges === 'one' ? consumeStatus(att.statuses, flurry.id, 1) : att.statuses.filter((s) => s.id !== flurry.id)
        volley = push({ type: 'flurry', side: attacker, status: flurry.id, strikes: faces.length, faces })
      }
      // Tous les coups d'une rafale, celui de l'action compris, ont la rafale pour cause
      for (const [k, die] of faces.entries()) {
        down = strikeOnce(attacker, k === 0 ? undefined : die, undefined, undefined, false, volley)
        if (down !== undefined) return end(other(down), 'ko')
      }
      // Coups instantanés (Furie des vents) : une charge gagnée pendant le coup de l'action frappe tout de
      // suite. Coups bruts depuis la 0.69.0 : ils ne déclenchent aucune compétence, donc aucune Furie en chaîne.
      const burst = att.statuses.find((s) => STATUSES[s.id].instantStrikes)
      if (burst) {
        const def = STATUSES[burst.id]
        const extra = Array.from({ length: def.extraStrikes ?? 1 }, () => def.extraDie ?? own)
        att.statuses = consumeStatus(att.statuses, burst.id, 1)
        // Ils ont pour cause l'étape qui a posé la charge (Furie des vents sur un 2), à défaut le coup de l'action
        const burstBeat = push(
          { type: 'flurry', side: attacker, status: burst.id, strikes: extra.length, faces: extra },
          posedBy[attacker][burst.id] ?? lastStrike,
        )
        for (const die of extra) {
          down = strikeOnce(attacker, die, undefined, undefined, true, burstBeat)
          if (down !== undefined) return end(other(down), 'ko')
        }
      }
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
