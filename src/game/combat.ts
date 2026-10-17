import type { Character } from './character'
import type { CharacterEvent, Condition, Effect, Trigger } from './events'
import { chance, defaultRng, rollDie, type Rng } from './rng'
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
 *     Phase 2 · Action : contrôle (`skipsAction` : le tour est perdu), sinon attaque
 *               (dé → esquive → critique → dégâts sortants → dégâts entrants → armure → boucliers)
 *               → fenêtres du coup : bloodied, naturalOne, naturalMax, puis
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
  | { type: 'damage'; target: Side; amount: number }
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
  crit: boolean
  /** Critique imposé par un statut (ex. « Critique assuré ») */
  critForced: boolean
  critMultiplier: number
  /** Dégâts avant l'armure (après critique et modificateurs) */
  raw: number
  /** Dégâts réellement infligés (0 si esquive) */
  damage: number
  /** PV réellement retirés : `damage` plafonné aux PV restants du défenseur (le coup fatal ne compte que ce qu'il fallait pour atteindre 0) */
  dealt: number
  /** Retenus par l'armure (de base, modifiée par les statuts) */
  armorAbsorbed: number
  /** Retenus par les boucliers, par statut */
  shieldAbsorbed: number
  shields: Partial<Record<StatusId, number>>
}

export interface TriggeredEvent {
  /** Porteur de l'événement */
  side: Side
  eventId: string
  name: string
  trigger: Trigger
  effects: AppliedEffect[]
}

/** Une étape de la chronologie, avec l'état qui en résulte. */
export type Beat = { turn: number; state: Snapshot } & (
  | { type: 'attack'; attack: Attack }
  | { type: 'event'; event: TriggeredEvent }
  /** Effet de tour d'un statut (ex. poison au début, brûlure à la fin) */
  | { type: 'statusTick'; phase: TurnPhase; side: Side; status: StatusId; effects: AppliedEffect[] }
  | { type: 'statusExpire'; phase: TurnPhase; side: Side; statuses: StatusId[] }
  /** Réaction d'un statut à un moment du combat (ex. Épines quand le porteur encaisse) */
  | { type: 'statusReaction'; side: Side; status: StatusId; trigger: Trigger; effects: AppliedEffect[] }
  /** Action perdue à cause d'un statut de contrôle (ex. Étourdi) */
  | { type: 'skip'; side: Side; status: StatusId }
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
}

/* ---------- Lecture d'un résultat ---------- */

export const attacksOf = (result: CombatResult) =>
  result.beats.flatMap((b) => (b.type === 'attack' ? [{ turn: b.turn, ...b.attack }] : []))

export const eventsOf = (result: CombatResult) => result.beats.flatMap((b) => (b.type === 'event' ? [b.event] : []))

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
 * au moins 1), enfin les boucliers du défenseur absorbent ce qu'ils peuvent, sans descendre sous 1.
 * L'ordre des tirages (dé, esquive, critique) est fixe : il garantit la reproductibilité.
 */
export function resolveAttack(
  rng: Rng,
  attacker: Character,
  defender: Character,
  attackerStatuses: readonly Status[],
  defenderStatuses: readonly Status[],
): Omit<Attack, 'attacker' | 'dealt'> {
  const att = effectiveStats(attacker, attackerStatuses)
  const def = effectiveStats(defender, defenderStatuses)
  const roll = rollDie(rng, att.damageDie)
  const base = {
    roll,
    faces: att.damageDie,
    critMultiplier: att.critMultiplier,
    shields: {},
  }
  if (chance(rng, def.dodgeChance)) {
    return {
      ...base,
      dodged: true,
      crit: false,
      critForced: false,
      raw: 0,
      damage: 0,
      armorAbsorbed: 0,
      shieldAbsorbed: 0,
    }
  }

  const critForced = attackerStatuses.some((s) => STATUSES[s.id].forcesCrit)
  const crit = critForced || chance(rng, att.critChance)
  let raw = crit ? Math.round(roll * att.critMultiplier) : roll
  // Dégâts sortants (statuts de l'attaquant), puis entrants (statuts du défenseur), dans l'ordre de pose.
  for (const s of attackerStatuses) {
    const modify = STATUSES[s.id].modifyOutgoing
    if (modify) raw = modify(raw, s)
  }
  for (const s of defenderStatuses) {
    const modify = STATUSES[s.id].modifyIncoming
    if (modify) raw = modify(raw, s)
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
  return {
    ...base,
    shields,
    dodged: false,
    crit,
    critForced,
    raw,
    damage,
    armorAbsorbed: raw - afterArmor,
    shieldAbsorbed: afterArmor - damage,
  }
}

/* ---------- Combat complet ---------- */

interface FighterState {
  hp: number
  statuses: Status[]
  /** Déclenchements par id d'événement, pour `limit` */
  fired: Record<string, number>
  bloodied: boolean
}

export interface SimulateOptions {
  rng?: Rng
}

/**
 * Résout un combat complet à partir des stats, statuts et événements des personnages.
 * C'est l'unique moteur : jouer un combat ne fait qu'animer ce résultat.
 */
export function simulateCombat(fighters: Pair<Character>, { rng = defaultRng }: SimulateOptions = {}): CombatResult {
  const initiative: Pair<number>[] = []
  let roll: Pair<number>
  do {
    roll = [rollDie(rng, INITIATIVE_DIE), rollDie(rng, INITIATIVE_DIE)]
    initiative.push(roll)
  } while (roll[0] === roll[1])

  const states: Pair<FighterState> = [
    { hp: fighters[0].maxHp, statuses: [], fired: {}, bloodied: false },
    { hp: fighters[1].maxHp, statuses: [], fired: {}, bloodied: false },
  ]
  const beats: Beat[] = []
  let turn = 0

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
  })

  /** Applique un effet à partir du porteur `owner` ; renvoie ce qui a réellement changé. */
  function applyEffect(owner: Side, effect: Effect): AppliedEffect {
    const target = effect.target === 'opponent' ? other(owner) : owner
    const state = states[target]
    switch (effect.type) {
      case 'heal': {
        const amount = clamp(Math.min(effect.amount, fighters[target].maxHp - state.hp), 0)
        state.hp += amount
        return { type: 'heal', target, amount }
      }
      case 'damage': {
        const amount = clamp(Math.min(effect.amount, state.hp), 0)
        state.hp -= amount
        return { type: 'damage', target, amount }
      }
      case 'applyStatus': {
        const status: Status = { id: effect.status, stacks: effect.stacks }
        if (effect.turns !== undefined) status.turns = effect.turns
        const { list, outcome } = resolveApplication(state.statuses, status, fighters[target].immunities)
        state.statuses = list
        return {
          type: 'applyStatus',
          target,
          status: effect.status,
          stacks: effect.stacks,
          turns: effect.turns,
          result: outcome,
        }
      }
      case 'cleanse': {
        const removed = state.statuses.filter((s) => STATUSES[s.id].polarity === effect.polarity).map((s) => s.id)
        state.statuses = removeStatuses(state.statuses, effect.polarity)
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
   * événements de son personnage (ordre de définition). Renvoie le perdant s'il y a K.O.
   */
  function fire(side: Side, trigger: Trigger): Side | undefined {
    // Statuts présents à l'ouverture de la fenêtre : une réaction ne réagit pas à elle-même.
    for (const status of [...states[side].statuses]) {
      const react = STATUSES[status.id].reactions?.[trigger]
      if (!react || !states[side].statuses.some((s) => s.id === status.id)) continue
      const effects = applyEffects(side, react(status))
      beats.push({ type: 'statusReaction', turn, side, status: status.id, trigger, effects, state: snapshot() })
      const down = fallen() ?? checkBloodied()
      if (down !== undefined) return down
    }
    for (const event of fighters[side].events) {
      if (event.trigger !== trigger || !canFire(side, event)) continue
      states[side].fired[event.id] = (states[side].fired[event.id] ?? 0) + 1
      const effects = applyEffects(side, event.effects)
      beats.push({
        type: 'event',
        turn,
        state: snapshot(),
        event: { side, eventId: event.id, name: event.name, trigger, effects },
      })
      const down = fallen() ?? checkBloodied()
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

  function canFire(side: Side, event: CharacterEvent) {
    if (event.limit !== undefined && (states[side].fired[event.id] ?? 0) >= event.limit) return false
    if (event.when && !event.when.every((c) => conditionMet(side, c))) return false
    // Le tirage n'a lieu que pour les événements aléatoires : les autres ne consomment pas de hasard.
    return event.chance === undefined || chance(rng, event.chance)
  }

  /** « bloodied » : la première fois que les PV passent sous la moitié. */
  function checkBloodied(): Side | undefined {
    for (const side of SIDES) {
      const s = states[side]
      if (s.bloodied || s.hp <= 0 || s.hp >= fighters[side].maxHp / 2) continue
      s.bloodied = true
      const down = fire(side, 'bloodied')
      if (down !== undefined) return down
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
    for (const status of ticking) {
      const def = STATUSES[status.id]
      const tick = phase === 'turnStart' ? def.onTurnStart?.(status) : def.onTurnEnd?.(status)
      // Un statut retiré entre-temps (ex. annulé par son opposé) n'agit plus.
      if (!tick || !states[side].statuses.some((s) => s.id === status.id)) continue
      const effects = applyEffects(side, tick)
      beats.push({ type: 'statusTick', turn, phase, side, status: status.id, effects, state: snapshot() })
      const down = fallen() ?? checkBloodied()
      if (down !== undefined) return down
    }
    const { kept, expired } = tickDurations(states[side].statuses, phase)
    states[side].statuses = kept
    if (expired.length) beats.push({ type: 'statusExpire', turn, phase, side, statuses: expired, state: snapshot() })
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

    // Phase 1 · Début de tour
    down = statusPhase(attacker, 'turnStart') ?? fire(attacker, 'turnStart')
    if (down !== undefined) return end(other(down), 'ko')

    // Phase 2 · Action : un statut de contrôle fait perdre l'action, sinon on attaque.
    const control = att.statuses.find((s) => STATUSES[s.id].skipsAction)
    if (control) {
      att.statuses = consumeStatus(att.statuses, control.id, 1)
      beats.push({ type: 'skip', turn, side: attacker, status: control.id, state: snapshot() })
    } else {
      const outcome = resolveAttack(rng, fighters[attacker], fighters[defender], att.statuses, def.statuses)
      if (outcome.critForced) {
        const forcing = att.statuses.find((s) => STATUSES[s.id].forcesCrit)!
        att.statuses = consumeStatus(att.statuses, forcing.id, 1)
      }
      for (const [id, taken] of Object.entries(outcome.shields) as [StatusId, number][]) {
        def.statuses = consumeStatus(def.statuses, id, taken)
      }
      const dealt = Math.min(outcome.damage, def.hp)
      def.hp -= dealt
      beats.push({ type: 'attack', turn, attack: { attacker, ...outcome, dealt }, state: snapshot() })
      if (def.hp === 0) return end(attacker, 'ko')

      // Fenêtres du coup
      down = checkBloodied()
      if (down !== undefined) return end(other(down), 'ko')
      const hitTriggers: [Side, Trigger][] = []
      if (outcome.roll === 1) hitTriggers.push([attacker, 'naturalOne'])
      if (outcome.roll === outcome.faces && outcome.faces > 1) hitTriggers.push([attacker, 'naturalMax'])
      if (outcome.dodged) hitTriggers.push([attacker, 'missed'], [defender, 'dodge'])
      else {
        hitTriggers.push([attacker, 'hit'])
        if (outcome.crit) hitTriggers.push([attacker, 'crit'])
        hitTriggers.push([defender, 'hurt'])
      }
      down = fireAll(hitTriggers)
      if (down !== undefined) return end(other(down), 'ko')
    }

    // Phase 3 · Fin de tour
    down = statusPhase(attacker, 'turnEnd') ?? fire(attacker, 'turnEnd')
    if (down !== undefined) return end(other(down), 'ko')

    attacker = defender
  }
  turn = MAX_TURNS
  return end(states[0].hp >= states[1].hp ? 0 : 1, 'turnLimit')
}

export const SIDE_STYLE = {
  0: { accent: 'text-sky-300', bar: 'bg-sky-400', ring: 'ring-sky-400/60', hex: '#38bdf8' },
  1: { accent: 'text-rose-300', bar: 'bg-rose-500', ring: 'ring-rose-500/60', hex: '#f43f5e' },
} as const

export const percent = (p: number) => `${Math.round(p * 100)} %`

export const multiplier = (m: number) => `×${m.toLocaleString('fr-FR')}`
