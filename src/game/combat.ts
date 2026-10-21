import type { Character } from './character'
import { DOUBLE_TRIGGERS, rollMatches, ROLL_TRIGGERS, type CharacterEvent, type Condition, type Effect, type Trigger } from './events'
import type { Relic } from './relics'
import { chance, defaultRng, rollDie, seededRng, type Rng } from './rng'
import {
  consumeStatus,
  removeStatuses,
  resolveApplication,
  stacksOf,
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
 *               dé → coup sacrifié (`forfeitsHit`) → esquive → critique → dégâts sortants → dégâts entrants
 *               → armure → boucliers → vol de vie (`drainsHit`)
 *               → fenêtres du coup : bloodied, naturalOne, naturalTwo, naturalMax, puis
 *                 esquivé : missed (actif) → dodge (défenseur) ; touché : hit → crit (actif) → hurt (défenseur)
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
   * Coup brut (0.69.0, coups de la Furie des vents) : le dé ne donne que la valeur du coup. Ni coup
   * sacrifié ni compétence de jet : un 1, un 2 ou un 3 frappe pour sa valeur.
   */
  plain?: true
  crit: boolean
  /** Critique imposé par un statut (ex. « Critique assuré ») */
  critForced: boolean
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
  /** Retenus par les boucliers, par statut */
  shieldAbsorbed: number
  shields: Partial<Record<StatusId, number>>
  /**
   * Bonus de coup des reliques de l'attaquant (Fer à quatre clous), ajoutés à la valeur du coup avant le
   * critique ; seulement sur un coup qui touche
   */
  relicBonus?: { relic: string; name: string; amount: number }[]
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

/** Une étape de la chronologie, avec l'état qui en résulte. */
export type Beat = { turn: number; state: Snapshot } & (
  | { type: 'attack'; attack: Attack }
  | { type: 'event'; event: TriggeredEvent }
  /** Effet de tour d'un statut (ex. poison au début, brûlure à la fin) */
  | { type: 'statusTick'; phase: TurnPhase; side: Side; status: StatusId; effects: AppliedEffect[] }
  /** Durées décomptées (sans expiration) : un tour de moins pour chaque statut listé */
  | { type: 'statusDuration'; phase: TurnPhase; side: Side; changes: DurationChange[] }
  | { type: 'statusExpire'; phase: TurnPhase; side: Side; statuses: StatusId[] }
  /** Réaction d'un statut à un moment du combat (ex. Épines quand le porteur encaisse) */
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
)

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
    shields: {},
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
  const dodgeForced = defenderStatuses.some((s) => STATUSES[s.id].forcesDodge)
  if (dodgeForced || chance(rng, def.dodgeChance)) {
    return { ...base, ...nothing, ...(reshaped && { reshaped }), dodgeForced, dodged: true }
  }
  // Reliques de coup : la valeur du coup qui touche grandit, avant le critique ; un bonus de face (Fer à quatre
  // clous) ne vaut que si le dé de ce coup fait cette face (deux dés : chaque dé se lit seul)
  const relicBonus = attacker.relics.flatMap((r) =>
    r.rollBonus && (r.onFace === undefined || r.onFace === roll) ? [{ relic: r.id, name: r.name, amount: r.rollBonus }] : [],
  )
  const value = (reshaped?.value ?? roll) + relicBonus.reduce((t, b) => t + b.amount, 0)

  // Un coup transformé « sans critique » (Charge) ne tire pas le critique et ne consomme pas un critique assuré
  const critForced = !reshaped?.noCrit && attackerStatuses.some((s) => STATUSES[s.id].forcesCrit)
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
  const shields: Partial<Record<StatusId, number>> = {}
  for (const s of defenderStatuses) {
    if (!STATUSES[s.id].shield || damage <= 1) continue
    const taken = Math.min(s.stacks, damage - 1)
    if (taken > 0) {
      shields[s.id] = taken
      damage -= taken
    }
  }
  // Le plancher a joué si l'armure aurait tout retenu, ou si un bouclier n'a pas pu prendre le dernier point.
  const floored =
    raw - def.armor < 1 ||
    (damage === 1 && defenderStatuses.some((s) => STATUSES[s.id].shield && s.stacks > (shields[s.id] ?? 0)))
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
    shields,
    modifiers,
    floored: damage === 1 && (floored || finalFloor),
    dodged: false,
    crit,
    critForced,
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
  /**
   * Statuts des deux camps à l'ouverture des fenêtres du coup en cours (null hors d'un coup). Un statut
   * posé pendant ce coup ne réagit pas à ce coup, et des charges ajoutées pendant le coup attendent le
   * suivant : la plaie qu'un coup ouvre se voit avant de couler (0.68.1, demande de l'utilisateur).
   */
  let strikeBase: Pair<Status[]> | null = null
  /** Le coup en cours a-t-il touché ? Une compétence `needsTouch` (Pourfendre) ne part que s'il touche. */
  let strikeTouched = false
  /** Fenêtres d'un coup (`hit`, `hurt`…), avec les statuts du moment comme référence (`strikeBase`). */
  const fireStrike = (list: [Side, Trigger][], touched: boolean) => {
    strikeBase = [states[0].statuses, states[1].statuses]
    strikeTouched = touched
    try {
      return fireAll(list)
    } finally {
      strikeBase = null
      strikeTouched = false
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
        return { type: 'damage', target, amount, ...(hits > 1 && { parts: Array.from({ length: hits }, () => each) }) }
      }
      case 'applyStatus': {
        const status: Status = { id: effect.status, stacks: effect.stacks }
        // Une seule valeur (Brûlure, `turnsFromStacks`) : sans durée donnée, il dure autant de tours que de charges
        const turns = effect.turns ?? (STATUSES[effect.status].turnsFromStacks ? effect.stacks : undefined)
        if (turns !== undefined) status.turns = turns
        const { list, outcome } = resolveApplication(state.statuses, status, fighters[target].immunities)
        state.statuses = list
        if (outcome.kind === 'applied') state.fresh.add(effect.status)
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
        return { type: 'damage', target, amount, ...(stored >= effect.min && parts && parts.length > 1 && { parts }) }
      }
      case 'cleanse': {
        // Les statuts de forme (`innate`) ne se purgent pas : ce sont des règles de la forme
        const matching = state.statuses.filter((s) => STATUSES[s.id].polarity === effect.polarity && !STATUSES[s.id].innate).map((s) => s.id)
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
   * Fenêtre de déclenchement pour un camp : réactions de ses statuts (ordre de pose), puis
   * événements de son personnage (ordre de définition), puis ses reliques (ordre d'obtention).
   * Renvoie le perdant s'il y a K.O.
   */
  function fire(side: Side, trigger: Trigger): Side | undefined {
    // Statuts présents à l'ouverture de la fenêtre : une réaction ne réagit pas à elle-même.
    for (const status of [...states[side].statuses]) {
      const react = STATUSES[status.id].reactions?.[trigger]
      if (!react || !states[side].statuses.some((s) => s.id === status.id)) continue
      // Pendant un coup, seules les charges d'avant ses fenêtres réagissent (une plaie neuve attend le coup suivant)
      const base = strikeBase?.[side].find((s) => s.id === status.id)
      if (strikeBase && !base) continue
      const acting = base && base.stacks < status.stacks ? { ...status, stacks: base.stacks } : status
      const effects = applyEffects(side, react(acting))
      const def = STATUSES[status.id]
      if (def.spentOnReaction) states[side].statuses = states[side].statuses.filter((s) => s.id !== status.id)
      // Saignement : la plaie agit avec ses charges d'avant, puis perd une charge dans la même étape
      else if (def.decays) states[side].statuses = consumeStatus(states[side].statuses, status.id, 1)
      beats.push({ type: 'statusReaction', turn, side, status: status.id, trigger, effects, state: snapshot() })
      const down = fallen() ?? checkThresholds()
      if (down !== undefined) return down
    }
    for (const event of fighters[side].events) {
      // Pourfendre : un coup doit toucher pour poser un malus physique (vérifié avant tout tirage)
      if (event.trigger !== trigger || (event.needsTouch && !strikeTouched) || !canFire(side, event)) continue
      states[side].fired[event.id] = (states[side].fired[event.id] ?? 0) + 1
      const effects = applyEffects(side, event.effects)
      beats.push({
        type: 'event',
        turn,
        state: snapshot(),
        event: { side, eventId: event.id, name: event.name, trigger, effects },
      })
      const down = fallen() ?? checkThresholds()
      if (down !== undefined) return down
    }
    // Reliques : un moment du coup, ou le début d'un de ses tours (à partir du tour de la relique)
    for (const relic of fighters[side].relics) {
      const t = relic.trigger
      const due = t?.type === 'strike' ? t.on === trigger : t?.type === 'turn' && trigger === 'turnStart' && states[side].turnsTaken >= t.turn
      if (!due) continue
      const down = fireRelic(side, relic)
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
  function fireRelic(side: Side, relic: Relic): Side | undefined {
    const s = states[side]
    const uses = s.relicUses[relic.id] ?? 0
    if (relic.charges !== undefined && uses >= relic.charges) return undefined
    if (s.turnsTaken < (s.relicReady[relic.id] ?? 0)) return undefined
    if (relic.when && !relic.when.every((c) => conditionMet(side, c))) return undefined
    s.relicUses[relic.id] = uses + 1
    if (relic.cooldown) s.relicReady[relic.id] = s.turnsTaken + relic.cooldown
    const effects = applyEffects(side, relic.effects ?? [])
    beats.push({ type: 'relic', turn, side, relic: relic.id, name: relic.name, effects, uses: uses + 1, state: snapshot() })
    return fallen() ?? checkThresholds()
  }

  /**
   * Seuils de PV, après chaque changement de PV : « bloodied » (la première fois sous la moitié), puis les
   * reliques de seuil, qui partent quand les PV passent sous le leur et se réarment s'ils remontent au-dessus.
   */
  function checkThresholds(): Side | undefined {
    for (const side of SIDES) {
      const s = states[side]
      if (!s.bloodied && s.hp > 0 && s.hp < fighters[side].maxHp / 2) {
        s.bloodied = true
        const down = fire(side, 'bloodied')
        if (down !== undefined) return down
      }
      for (const relic of fighters[side].relics) {
        const t = relic.trigger
        if (t?.type !== 'hpBelow') continue
        // Le seuil lit les PV du porteur, ou ceux de l'adversaire (Trophée du chasseur) ; l'effet reste au porteur
        const watched = t.who === 'opponent' ? other(side) : side
        const hp = states[watched].hp
        if (hp >= fighters[watched].maxHp * t.ratio) s.relicBelow.delete(relic.id)
        else if (hp > 0 && !s.relicBelow.has(relic.id)) {
          s.relicBelow.add(relic.id)
          const down = fireRelic(side, relic)
          if (down !== undefined) return down
        }
      }
    }
    return fallen()
  }

  /** Enchaîne des fenêtres et s'arrête au premier K.O. */
  function fireAll(list: [Side, Trigger][]) {
    for (const [side, trigger] of list) {
      const down = fire(side, trigger)
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
    for (const status of ticking) {
      const def = STATUSES[status.id]
      const tick = phase === 'turnStart' ? def.onTurnStart?.(status) : def.onTurnEnd?.(status)
      // Un statut retiré entre-temps (ex. annulé par son opposé) n'agit plus.
      if (!tick || !states[side].statuses.some((s) => s.id === status.id)) continue
      const effects = applyEffects(side, tick)
      // Un statut qui s'estompe perd sa charge en même temps qu'il agit : l'écran montre les deux ensemble
      if (def.decays) {
        states[side].statuses = consumeStatus(states[side].statuses, status.id, 1)
        if (!states[side].statuses.some((s) => s.id === status.id)) faded.push(status.id)
      }
      beats.push({ type: 'statusTick', turn, phase, side, status: status.id, effects, state: snapshot() })
      const down = fallen() ?? checkThresholds()
      if (down !== undefined) return down
    }
    // Un statut posé pendant ce tour n'est pas décompté à sa fin : « 1 tour » dure jusqu'au prochain.
    const fresh = phase === 'turnEnd' ? states[side].statuses.filter((s) => states[side].fresh.has(s.id)) : []
    const { kept: aged, expired } = tickDurations(
      states[side].statuses.filter((s) => !fresh.includes(s)),
      phase,
    )
    const kept = states[side].statuses.flatMap((s) => (fresh.includes(s) ? [s] : aged.filter((a) => a.id === s.id)))
    // Décompte et expiration sont deux étapes distinctes, pour que l'écran montre chacune à son moment.
    const changes = kept.flatMap((s) => {
      const was = states[side].statuses.find((w) => w.id === s.id)
      return was?.turns !== undefined && s.turns !== undefined && was.turns !== s.turns
        ? [{ status: s.id, from: was.turns, to: s.turns }]
        : []
    })
    states[side].statuses = kept
    if (changes.length) beats.push({ type: 'statusDuration', turn, phase, side, changes, state: snapshot() })
    const gone = [...faded, ...expired]
    if (gone.length) beats.push({ type: 'statusExpire', turn, phase, side, statuses: gone, state: snapshot() })
    return undefined
  }

  /** Une compétence du porteur sacrifie-t-elle ce coup (`forfeitsHit`) ? Même règle que son déclenchement, sans tirage. */
  function forfeits(side: Side, roll: number, faces: number) {
    return fighters[side].events.some(
      (e) =>
        e.forfeitsHit &&
        inForm(side, e) &&
        ROLL_TRIGGERS.includes(e.trigger) &&
        rollMatches(e.trigger, roll, faces) &&
        (e.limit === undefined || (states[side].fired[e.id] ?? 0) < e.limit) &&
        (!e.when || e.when.every((c) => conditionMet(side, c))),
    )
  }

  /**
   * Un coup complet de `attacker`, fenêtres comprises. Renvoie le perdant s'il y a K.O.
   * `preset` : valeur déjà tirée par la paire (personnage à deux dés), sans nouveau dé.
   * `plain` : coup brut (Furie des vents), dont le jet ne déclenche aucune compétence.
   */
  function strikeOnce(attacker: Side, die?: number, preset?: number, merged?: Attack['reshaped'], plain = false): Side | undefined {
    const defender = other(attacker)
    const att = states[attacker]
    const def = states[defender]
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
    if (outcome.critForced) {
      const forcing = att.statuses.find((s) => STATUSES[s.id].forcesCrit)!
      att.statuses = consumeStatus(att.statuses, forcing.id, 1)
    }
    if (outcome.dodgeForced) {
      const forcing = def.statuses.find((s) => STATUSES[s.id].forcesDodge)!
      def.statuses = consumeStatus(def.statuses, forcing.id, 1)
    }
    for (const [id, taken] of Object.entries(outcome.shields) as [StatusId, number][]) {
      def.statuses = consumeStatus(def.statuses, id, taken)
    }
    // Fausse note : le coup du porteur qui touche l'a subie, elle disparaît avec toutes ses charges (`spentOnHit`)
    if (!outcome.dodged && !outcome.forfeited) att.statuses = att.statuses.filter((x) => !STATUSES[x.id].spentOnHit)
    // Vol de vie sur un coup esquivé : la charge est perdue sans soin, au moment même du coup.
    const drain = outcome.forfeited ? undefined : att.statuses.find((s) => STATUSES[s.id].drainsHit)
    if (drain && outcome.dodged) att.statuses = consumeStatus(att.statuses, drain.id, 1)
    const dealt = outcome.damage
    def.hp = Math.max(0, def.hp - dealt)
    beats.push({ type: 'attack', turn, attack: { attacker, ...outcome, dealt, ...(plain && { plain: true as const }) }, state: snapshot() })
    if (def.hp === 0) return defender

    // Jauges (Rétribution) : le coup qui touche range ses dégâts chez le défenseur qui sait les relâcher
    if (!outcome.dodged && !outcome.forfeited && dealt > 0) {
      for (const id of Object.keys(STATUSES) as StatusId[]) {
        const fill = STATUSES[id].fillsOnHurt
        if (!fill || !fighters[defender].events.some((e) => e.effects.some((x) => x.type === 'release' && x.status === id))) continue
        const old = def.statuses.find((s) => s.id === id)
        const slots = [...(old?.slots ?? []), dealt].slice(-fill.slots)
        const gauge: Status = { id, stacks: slots.reduce((t, n) => t + n, 0), slots }
        def.statuses = old ? def.statuses.map((s) => (s.id === id ? gauge : s)) : [...def.statuses, gauge]
      }
      // Le remplissage fait partie du coup : l'étape du coup le montre
      beats[beats.length - 1].state = snapshot()
    }
    // Vol de vie : le coup qui touche rend les PV qu'il vient de retirer (esquivé : voir plus haut ;
    // sacrifié, jet de compétence : aucun coup n'est porté, la charge reste).
    const touched = !outcome.dodged && !outcome.forfeited
    // Luciole : chaque coup qui touche le porteur lui retire une charge (`spentOnHurt`)
    if (touched) for (const s of def.statuses.filter((x) => STATUSES[x.id].spentOnHurt)) def.statuses = consumeStatus(def.statuses, s.id, 1)

    if (drain && touched) {
      att.statuses = consumeStatus(att.statuses, drain.id, 1)
      const effects = applyEffects(attacker, [{ type: 'heal', amount: dealt }])
      beats.push({ type: 'statusReaction', turn, side: attacker, status: drain.id, trigger: 'hit', effects, state: snapshot() })
    }

    // Riposte (après le vol de vie de l'attaquant, comme une réaction au coup encaissé) : le coup qui touche renvoie une part des PV retirés à l'attaquant ; la charge est consommée
    const riposte = !outcome.dodged && !outcome.forfeited ? def.statuses.find((s) => STATUSES[s.id].reflectsHit) : undefined
    if (riposte && def.hp > 0) {
      def.statuses = consumeStatus(def.statuses, riposte.id, 1)
      const effects = applyEffects(defender, [{ type: 'damage', amount: Math.round(dealt * STATUSES[riposte.id].reflectsHit!), target: 'opponent' }])
      beats.push({ type: 'statusReaction', turn, side: defender, status: riposte.id, trigger: 'hurt', effects, state: snapshot() })
      if (fallen() !== undefined) return fallen()
    }

    // Fenêtres du coup
    const down = checkThresholds()
    if (down !== undefined) return down
    const hitTriggers: [Side, Trigger][] = plain
      ? []
      : ROLL_TRIGGERS.filter((t) => rollMatches(t, outcome.roll, outcome.faces)).map((t) => [attacker, t])
    if (outcome.dodged) hitTriggers.push([attacker, 'missed'], [defender, 'dodge'])
    else if (touched) {
      hitTriggers.push([attacker, 'hit'])
      if (outcome.crit) hitTriggers.push([attacker, 'crit'])
      hitTriggers.push([defender, 'hurt'])
    }
    const fell = fireStrike(hitTriggers, touched)
    if (fell !== undefined) return fell
    // Pile ou face (2026-10-21) : la pièce part aussitôt, juste après le coup pendant lequel elle a été posée
    return tossCoin(attacker) ?? tossCoin(defender)
  }

  /**
   * Pile ou face : si `side` détient une pièce, il la lance tout de suite (pile = 1 sur un d2, un rang de dé).
   * Pile, les dégâts directs de la pièce ; s'ils « touchent » (0.42.0), les fenêtres du coup s'ouvrent
   * (l'Aura de décoction empoisonne). Le statut est consommé. Renvoie le perdant s'il y a K.O.
   */
  function tossCoin(side: Side): Side | undefined {
    const coin = states[side].statuses.find((s) => STATUSES[s.id].coinToss)
    if (!coin) return undefined
    states[side].statuses = states[side].statuses.filter((s) => s.id !== coin.id)
    const forced = nextForced()
    const heads = forceRoll(rollDie(rng, 2), 2, forced) === 1
    const toss = STATUSES[coin.id].coinToss!
    const effects = heads ? applyEffects(side, [{ type: 'damage', amount: toss.damage, target: 'opponent' }]) : []
    beats.push({ type: 'coin', turn, side, status: coin.id, heads, effects, ...(forced !== undefined && { forced: true as const }), state: snapshot() })
    const down = fallen() ?? checkThresholds()
    if (down !== undefined || !heads || !toss.headsTouches) return down
    return fireStrike([[side, 'hit'], [other(side), 'hurt']], true)
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
    const trigger = rolls[0] === rolls[1] ? DOUBLE_TRIGGERS[rolls[0]] : undefined
    // Même règle que le déclenchement (forme, limite, conditions), sans tirage : `validateRoster` refuse `chance` ici
    const skill = trigger && fighters[attacker].events.find((e) => e.trigger === trigger && canFire(attacker, e))
    beats.push({
      type: 'pair',
      turn,
      side: attacker,
      rolls,
      faces,
      ...(skill && { double: rolls[0] }),
      ...(draws.some((d) => d.forced) && { forced: [draws[0].forced, draws[1].forced] as [boolean, boolean] }),
      state: snapshot(),
    })
    if (!skill) {
      for (const roll of rolls) {
        const down = strikeOnce(attacker, undefined, roll)
        if (down !== undefined) return down
      }
      return undefined
    }
    const down = fire(attacker, trigger!)
    if (down !== undefined) return down
    // `merged` : un seul coup qui vaut la somme (Soliste : 3 × 5 = 15), comme un coup transformé : le dé
    // affiché reste celui du double, la valeur du coup est la somme
    if (skill.merged && skill.volley) return strikeOnce(attacker, undefined, rolls[0], { event: skill.id, value: skill.volley * rolls[0], noCrit: false })
    for (let k = 0; k < (skill.volley ?? 0); k++) {
      const down = strikeOnce(attacker, undefined, rolls[0])
      if (down !== undefined) return down
    }
    return undefined
  }

  let down = fireAll([
    [0, 'combatStart'],
    [1, 'combatStart'],
  ])
  if (down !== undefined) return end(other(down), 'ko')

  let attacker: Side = roll[0] > roll[1] ? 0 : 1
  for (turn = 1; turn <= MAX_TURNS; turn++) {
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
      beats.push({ type: 'shift', turn, side: attacker, form: att.form, state: snapshot() })
    }
    att.turnsTaken++

    // Phase 1 · Début de tour
    down = statusPhase(attacker, 'turnStart') ?? fire(attacker, 'turnStart')
    if (down !== undefined) return end(other(down), 'ko')

    // Phase 2 · Action : un statut de contrôle fait perdre l'action, sinon on attaque.
    const control = att.statuses.find((s) => STATUSES[s.id].skipsAction)
    if (control) {
      att.statuses = consumeStatus(att.statuses, control.id, 1)
      beats.push({ type: 'skip', turn, side: attacker, status: control.id, state: snapshot() })
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
      if (flurry) {
        const def = STATUSES[flurry.id]
        const extra = def.extraStrikes! * (def.strikeCharges === 'all' ? flurry.stacks : 1)
        for (let k = 0; k < extra; k++) faces.push(def.extraDie ?? own)
        // Charges en réserve (`strikeCharges: 'one'`) : une seule est dépensée, les autres attendent
        att.statuses = def.strikeCharges === 'one' ? consumeStatus(att.statuses, flurry.id, 1) : att.statuses.filter((s) => s.id !== flurry.id)
        beats.push({ type: 'flurry', turn, side: attacker, status: flurry.id, strikes: faces.length, faces, state: snapshot() })
      }
      for (const [k, die] of faces.entries()) {
        down = strikeOnce(attacker, k === 0 ? undefined : die)
        if (down !== undefined) return end(other(down), 'ko')
      }
      // Coups instantanés (Furie des vents) : une charge gagnée pendant le coup de l'action frappe tout de
      // suite. Coups bruts depuis la 0.69.0 : ils ne déclenchent aucune compétence, donc aucune Furie en chaîne.
      const burst = att.statuses.find((s) => STATUSES[s.id].instantStrikes)
      if (burst) {
        const def = STATUSES[burst.id]
        const extra = Array.from({ length: def.extraStrikes ?? 1 }, () => def.extraDie ?? own)
        att.statuses = consumeStatus(att.statuses, burst.id, 1)
        beats.push({ type: 'flurry', turn, side: attacker, status: burst.id, strikes: extra.length, faces: extra, state: snapshot() })
        for (const die of extra) {
          down = strikeOnce(attacker, die, undefined, undefined, true)
          if (down !== undefined) return end(other(down), 'ko')
        }
      }
    }

    // Phase 3 · Fin de tour
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
