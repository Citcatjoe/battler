import type { Character } from './character'
import { addBuff, buffAmount, consumeBuff, type Buff, type BuffKind, type Trigger } from './events'

/** Position à l'écran : 0 = gauche (regarde à droite), 1 = droite. */
export type Side = 0 | 1

export const other = (side: Side): Side => (side === 0 ? 1 : 0)

export const INITIATIVE_DIE = 10

export const rollDie = (faces: number) => 1 + Math.floor(Math.random() * faces)

export interface AttackOutcome {
  /** Valeur du dé de dégâts */
  roll: number
  crit: boolean
  /** Critique obtenu grâce à un bonus « critique assuré » */
  critFromBuff: boolean
  dodged: boolean
  /** Dégâts réellement infligés (0 si esquive) */
  damage: number
  /** Dégâts retenus par l'armure du défenseur (de base + temporaire) */
  absorbed: number
  /** Part retenue par l'armure temporaire */
  bonusAbsorbed: number
}

/** État d'un combattant à un instant du combat. */
export interface FighterState {
  hp: number
  buffs: Buff[]
}

export interface Snapshot {
  hp: Pair<number>
  buffs: Pair<Buff[]>
}

export type AppliedEffect = { type: 'heal'; amount: number } | { type: 'buff'; kind: BuffKind; amount: number }

export interface TriggeredEvent {
  side: Side
  eventId: string
  name: string
  trigger: Trigger
  /** Effets réellement appliqués (un soin peut être réduit par le plafond de PV) */
  effects: AppliedEffect[]
}

export interface Attack extends AttackOutcome {
  turn: number
  attacker: Side
  /** PV du défenseur après le coup */
  defenderHp: number
  /** État juste après l'impact, puis après les événements */
  afterHit: Snapshot
  after: Snapshot
  events: TriggeredEvent[]
}

/**
 * Le dé fixe la base, le défenseur tente d'esquiver, sinon l'attaquant peut critiquer
 * (forcément s'il a un critique assuré), puis l'armure de base réduit le coup (minimum 1)
 * et l'armure temporaire absorbe ce qu'elle peut, sans descendre sous 1 dégât.
 */
export function resolveAttack(
  attacker: Character,
  defender: Character,
  attackerBuffs: Buff[] = [],
  defenderBuffs: Buff[] = [],
): AttackOutcome {
  const roll = attacker.rollDamage()
  const dodged = defender.rollDodge()
  if (dodged) return { roll, crit: false, critFromBuff: false, dodged, damage: 0, absorbed: 0, bonusAbsorbed: 0 }
  const critFromBuff = buffAmount(attackerBuffs, 'guaranteedCrit') > 0
  const crit = critFromBuff || attacker.rollCrit()
  const raw = crit ? Math.round(roll * attacker.stats.critMultiplier) : roll
  const afterBase = defender.absorb(raw)
  const bonusAbsorbed = Math.min(buffAmount(defenderBuffs, 'bonusArmor'), afterBase - 1)
  const damage = afterBase - bonusAbsorbed
  return { roll, crit, critFromBuff, dodged, damage, absorbed: raw - damage, bonusAbsorbed }
}

/** Applique les événements d'un combattant pour un déclencheur donné. */
function triggerEvents(
  trigger: Trigger,
  side: Side,
  fighters: Pair<Character>,
  states: Pair<FighterState>,
): TriggeredEvent[] {
  const fired: TriggeredEvent[] = []
  for (const event of fighters[side].events.filter((e) => e.trigger === trigger)) {
    const state = states[side]
    const applied: AppliedEffect[] = []
    for (const effect of event.effects) {
      if (effect.type === 'heal') {
        const healed = Math.min(effect.amount, fighters[side].maxHp - state.hp)
        state.hp += healed
        applied.push({ type: 'heal', amount: healed })
      } else {
        state.buffs = addBuff(state.buffs, effect.kind, effect.amount)
        applied.push(effect)
      }
    }
    fired.push({ side, eventId: event.id, name: event.name, trigger, effects: applied })
  }
  return fired
}

export type Pair<T> = [T, T]

export type LogKind = 'info' | 'initiative' | 'attack' | 'crit' | 'dodge' | 'event' | 'ko'

export interface LogEntry {
  id: number
  kind: LogKind
  text: string
  side?: Side
}

export interface CombatResult {
  fighters: Pair<Character>
  attacks: Attack[]
  /** Tous les jets d'initiative, relances comprises */
  initiative: Pair<number>[]
  winner: Side
  /** Joué à l'écran ou simulé directement */
  mode: 'played' | 'simulated'
  /** Durée du combat à l'écran (0 si simulé) */
  durationMs: number
}

/** Garde-fou si des stats rendaient le K.O. impossible (ex. 100 % d'esquive). */
const MAX_TURNS = 1000

const snapshot = (states: Pair<FighterState>): Snapshot => ({
  hp: [states[0].hp, states[1].hp],
  buffs: [states[0].buffs, states[1].buffs],
})

/**
 * Résout un combat complet à partir des stats et des événements des personnages.
 * C'est l'unique moteur : l'écran de combat se contente d'animer ce résultat.
 */
export function simulateCombat(fighters: Pair<Character>): CombatResult {
  const initiative: Pair<number>[] = []
  let roll: Pair<number>
  do {
    roll = [rollDie(INITIATIVE_DIE), rollDie(INITIATIVE_DIE)]
    initiative.push(roll)
  } while (roll[0] === roll[1])

  const states: Pair<FighterState> = [
    { hp: fighters[0].maxHp, buffs: [] },
    { hp: fighters[1].maxHp, buffs: [] },
  ]
  const attacks: Attack[] = []
  let attacker: Side = roll[0] > roll[1] ? 0 : 1

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const defender = other(attacker)
    const att = states[attacker]
    const def = states[defender]
    const outcome = resolveAttack(fighters[attacker], fighters[defender], att.buffs, def.buffs)

    // Les bonus utilisés par ce coup sont consommés.
    if (outcome.critFromBuff) att.buffs = consumeBuff(att.buffs, 'guaranteedCrit', 1)
    if (outcome.bonusAbsorbed) def.buffs = consumeBuff(def.buffs, 'bonusArmor', outcome.bonusAbsorbed)
    def.hp = Math.max(0, def.hp - outcome.damage)
    const afterHit = snapshot(states)

    // Un K.O. clôt le combat : pas d'événement après le coup fatal.
    const events = def.hp > 0 && outcome.roll === 1 ? triggerEvents('naturalOne', attacker, fighters, states) : []

    attacks.push({ ...outcome, turn, attacker, defenderHp: def.hp, afterHit, after: snapshot(states), events })
    if (def.hp === 0) {
      return { fighters, attacks, initiative, winner: attacker, mode: 'simulated', durationMs: 0 }
    }
    attacker = defender
  }
  const winner: Side = states[0].hp >= states[1].hp ? 0 : 1
  return { fighters, attacks, initiative, winner, mode: 'simulated', durationMs: 0 }
}

export const SIDE_STYLE = {
  0: { accent: 'text-sky-300', bar: 'bg-sky-400', ring: 'ring-sky-400/60', hex: '#38bdf8' },
  1: { accent: 'text-rose-300', bar: 'bg-rose-500', ring: 'ring-rose-500/60', hex: '#f43f5e' },
} as const

export interface FighterStats {
  attacks: number
  hits: number
  hitRate: number
  dodges: number
  dodgeAttempts: number
  absorbed: number
  crits: number
  critDamage: number
  totalDamage: number
  averagePerHit: number
  best: number
  worst: number
  maxRolls: number
  minRolls: number
  hpLeft: number
  /** Événements déclenchés par ce combattant */
  events: number
  healed: number
  guaranteedCrits: number
  /** Dégâts retenus par son armure temporaire */
  bonusAbsorbed: number
}

export function computeStats(result: CombatResult): Pair<FighterStats> {
  const forSide = (side: Side): FighterStats => {
    const mine = result.attacks.filter((a) => a.attacker === side)
    const theirs = result.attacks.filter((a) => a.attacker !== side)
    const hits = mine.filter((a) => !a.dodged)
    const crits = hits.filter((a) => a.crit)
    const total = hits.reduce((s, a) => s + a.damage, 0)
    const mineEvents = result.attacks.flatMap((a) => a.events).filter((e) => e.side === side)
    const last = result.attacks[result.attacks.length - 1]
    const dealt = hits.map((a) => a.damage)
    const faces = result.fighters[side].stats.damageDie
    return {
      attacks: mine.length,
      hits: hits.length,
      hitRate: mine.length ? hits.length / mine.length : 0,
      dodges: theirs.filter((a) => a.dodged).length,
      dodgeAttempts: theirs.length,
      absorbed: theirs.reduce((s, a) => s + a.absorbed, 0),
      crits: crits.length,
      critDamage: crits.reduce((s, a) => s + a.damage, 0),
      totalDamage: total,
      averagePerHit: hits.length ? total / hits.length : 0,
      best: dealt.length ? Math.max(...dealt) : 0,
      worst: dealt.length ? Math.min(...dealt) : 0,
      maxRolls: mine.filter((a) => a.roll === faces).length,
      minRolls: mine.filter((a) => a.roll === 1).length,
      hpLeft: last ? last.after.hp[side] : result.fighters[side].maxHp,
      events: mineEvents.length,
      healed: mineEvents.flatMap((e) => e.effects).reduce((s, e) => s + (e.type === 'heal' ? e.amount : 0), 0),
      guaranteedCrits: mine.filter((a) => a.critFromBuff).length,
      bonusAbsorbed: theirs.reduce((s, a) => s + a.bonusAbsorbed, 0),
    }
  }
  return [forSide(0), forSide(1)]
}

export const percent = (p: number) => `${Math.round(p * 100)} %`

export const multiplier = (m: number) => `×${m.toLocaleString('fr-FR')}`
