import { lowerFirst, STATUSES, type Polarity, type StatusId } from './statuses'

/*
 * Événements : capacités propres à un personnage, déclenchées à un moment précis du combat.
 * - Le déclencheur (`Trigger`) dit QUAND, toujours du point de vue du porteur de l'événement.
 * - Les effets (`Effect`) disent QUOI : soin, dégâts, statut à poser, statuts à retirer.
 * - `chance` et `limit` règlent la fréquence.
 * Ajouter un événement à un personnage = une entrée dans son `events` (roster.ts).
 * Ajouter un déclencheur = une entrée dans TRIGGERS et un `fire(...)` au bon moment du moteur.
 * Ajouter un type d'effet = étendre `Effect`, `applyEffect` (combat.ts) et `describeEffect`.
 */

export type Trigger =
  | 'combatStart'
  | 'turnStart'
  | 'turnEnd'
  | 'naturalOne'
  | 'naturalMax'
  | 'hit'
  | 'crit'
  | 'missed'
  | 'dodge'
  | 'hurt'
  | 'bloodied'

/** Libellés affichés. L'ordre d'évaluation sur un même coup est fixé par le moteur (combat.ts, étape 4). */
export const TRIGGERS: Record<Trigger, { label: string }> = {
  combatStart: { label: 'Au début du combat' },
  turnStart: { label: 'Au début de chacun de ses tours' },
  turnEnd: { label: 'À la fin de chacun de ses tours' },
  naturalOne: { label: 'Sur un 1 au dé de dégâts' },
  naturalMax: { label: 'Sur un jet maximal au dé de dégâts' },
  hit: { label: 'Quand il touche' },
  crit: { label: 'Quand il porte un critique' },
  missed: { label: 'Quand son coup est esquivé' },
  dodge: { label: 'Quand il esquive' },
  hurt: { label: 'Quand il encaisse un coup' },
  bloodied: { label: 'La première fois qu’il passe sous la moitié de ses PV' },
}

/** Cible d'un effet, relative au porteur de l'événement. */
export type Target = 'self' | 'opponent'

export type Effect =
  | { type: 'heal'; amount: number; target?: Target }
  /** Dégâts directs : ignorent l'armure, l'esquive et les boucliers */
  | { type: 'damage'; amount: number; target?: Target }
  | { type: 'applyStatus'; status: StatusId; stacks: number; turns?: number; target?: Target }
  /** Retire tous les statuts d'une polarité (ex. purge des malus) */
  | { type: 'cleanse'; polarity: Polarity; target?: Target }

/**
 * Condition à remplir pour qu'un événement se déclenche, évaluée au moment du déclencheur.
 * `who` est relatif au porteur de l'événement. Un événement déclare une liste de conditions :
 * toutes doivent être vraies (ET). Ajouter un type = étendre `Condition`, `conditionMet`
 * (combat.ts) et `describeCondition`.
 */
export type Condition =
  /** PV sous une fraction des PV max (0,5 = sous la moitié) */
  | { type: 'hpBelow'; who: Target; ratio: number }
  /** PV au-dessus (ou égaux) d'une fraction des PV max */
  | { type: 'hpAtLeast'; who: Target; ratio: number }
  /** Porte un statut, avec au moins `stacks` charges (défaut : 1) */
  | { type: 'hasStatus'; who: Target; status: StatusId; stacks?: number }
  | { type: 'lacksStatus'; who: Target; status: StatusId }
  /** À partir du tour n (inclus) */
  | { type: 'fromTurn'; turn: number }

export interface CharacterEvent {
  id: string
  name: string
  trigger: Trigger
  effects: readonly Effect[]
  /** Probabilité de déclenchement quand le déclencheur survient (défaut : 1) */
  chance?: number
  /** Nombre maximal de déclenchements par combat (défaut : illimité) */
  limit?: number
  /** Conditions supplémentaires, toutes requises ; vérifiées avant le tirage de `chance` */
  when?: readonly Condition[]
}

const who = (target: Target | undefined) => (target === 'opponent' ? "à l'adversaire" : '')

export function describeEffect(effect: Effect): string {
  const on = who(effect.target)
  switch (effect.type) {
    case 'heal':
      return effect.target === 'opponent' ? `soigne l'adversaire de ${effect.amount} PV` : `+${effect.amount} PV`
    case 'damage':
      return `${effect.amount} dégâts directs${on ? ` ${on}` : ' à soi-même'}`
    case 'applyStatus': {
      const def = STATUSES[effect.status]
      const status = { id: effect.status, stacks: effect.stacks, turns: effect.turns }
      return `${def.icon} ${def.name}${on ? ` ${on}` : ''} : ${lowerFirst(def.describe(status))}`
    }
    case 'cleanse':
      return `retire les ${effect.polarity === 'negative' ? 'malus' : 'bonus'}${on ? ` ${on}` : ''}`
  }
}

const whom = (who: Target) => (who === 'opponent' ? "l'adversaire" : 'il')
const pct = (ratio: number) => `${Math.round(ratio * 100)} %`

export function describeCondition(c: Condition): string {
  switch (c.type) {
    case 'hpBelow':
      return `${whom(c.who)} est sous ${pct(c.ratio)} de ses PV`
    case 'hpAtLeast':
      return `${whom(c.who)} a au moins ${pct(c.ratio)} de ses PV`
    case 'hasStatus': {
      const def = STATUSES[c.status]
      const n = c.stacks && c.stacks > 1 ? ` (${c.stacks} charges ou plus)` : ''
      return `${whom(c.who)} porte ${def.icon} ${def.name}${n}`
    }
    case 'lacksStatus':
      return `${whom(c.who)} ne porte pas ${STATUSES[c.status].icon} ${STATUSES[c.status].name}`
    case 'fromTurn':
      return `à partir du tour ${c.turn}`
  }
}

export function describeEvent(e: CharacterEvent) {
  const odds = e.chance !== undefined && e.chance < 1 ? ` (${Math.round(e.chance * 100)} % de chances)` : ''
  const cap = e.limit !== undefined ? ` · ${e.limit} fois max. par combat` : ''
  const when = e.when?.length ? ` · si ${e.when.map(describeCondition).join(' et ')}` : ''
  return `${e.effects.map(describeEffect).join(', ')}${odds}${when}${cap}`
}
