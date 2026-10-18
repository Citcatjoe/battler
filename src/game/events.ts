import { lowerFirst, STATUSES, type Polarity, type StatusId } from './statuses'

/*
 * Événements (« compétences » dans l'interface) : capacités propres à un personnage, déclenchées à un moment précis du combat.
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
  | 'naturalTwo'
  | 'naturalThree'
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
  naturalTwo: { label: 'Sur un 2 au dé de dégâts' },
  naturalThree: { label: 'Sur un 3 au dé de dégâts' },
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
  /**
   * Retire des statuts d'une polarité, avec toutes leurs charges : tous, ou seulement les `count`
   * derniers posés (ex. Purification : le dernier bonus de l'adversaire, aura comprise)
   */
  | { type: 'cleanse'; polarity: Polarity; target?: Target; count?: number }
  /**
   * Relâche un statut à jauges (Rétribution) : la somme de ses jauges en dégâts directs à l'adversaire,
   * au moins `min`, puis le statut est vidé. Le porteur ne remplit ses jauges que s'il a cet effet.
   */
  | { type: 'release'; status: StatusId; min: number; target?: Target }

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
  /**
   * Le coup qui déclenche la compétence n'inflige aucun dégât : il n'y a ni esquive, ni critique,
   * ni « touche » (ex. Vol de vie, sur un 2). Réservé aux déclencheurs du dé (naturalOne,
   * naturalTwo, naturalThree, naturalMax), sans `chance` : le moteur doit le savoir dès que le dé est lancé.
   */
  forfeitsHit?: boolean
  /**
   * Le coup qui déclenche la compétence est transformé au lieu d'être sacrifié (druide en ours) :
   * `max` frappe pour la valeur maximale du dé (Charge), `reroll` relance le dé, en secret, et
   * ajoute `bonus` (Coup de griffe). `noCrit` : le coup ne peut pas être critique. C'est un coup
   * normal ensuite (esquive, modificateurs, armure, boucliers). Mêmes réserves que `forfeitsHit`.
   */
  reshapesHit?: { value: 'max' | 'reroll'; bonus?: number; noCrit?: boolean }
  /** Forme requise (personnage à formes, ex. druide) : la compétence n'existe que sous cette forme */
  form?: string
}

/** Déclencheurs liés à la valeur du dé, connus dès le jet. */
export const ROLL_TRIGGERS: readonly Trigger[] = ['naturalOne', 'naturalTwo', 'naturalThree', 'naturalMax']

/** Le déclencheur du dé correspond-il à ce jet ? */
export function rollMatches(trigger: Trigger, roll: number, faces: number) {
  if (trigger === 'naturalOne') return roll === 1
  if (trigger === 'naturalTwo') return roll === 2
  if (trigger === 'naturalThree') return roll === 3
  if (trigger === 'naturalMax') return roll === faces && faces > 1
  return false
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
      return `${def.name}${on ? ` ${on}` : ''} : ${lowerFirst(def.describe(status))}`
    }
    case 'release':
      return `relâche ${STATUSES[effect.status].name} : la somme de ses jauges en dégâts directs (au moins ${effect.min})`
    case 'cleanse': {
      const kind = effect.polarity === 'negative' ? 'malus' : 'bonus'
      if (effect.count === undefined) return `retire les ${kind}${on ? ` ${on}` : ''}`
      const what = effect.count === 1 ? `le dernier ${kind} posé` : `les ${effect.count} derniers ${kind} posés`
      return `retire ${what}${on ? ` ${on}` : ''}, avec toutes ses charges`
    }
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
      return `${whom(c.who)} porte ${def.name}${n}`
    }
    case 'lacksStatus':
      return `${whom(c.who)} ne porte pas ${STATUSES[c.status].name}`
    case 'fromTurn':
      return `à partir du tour ${c.turn}`
  }
}

export function describeEvent(e: CharacterEvent) {
  const odds = e.chance !== undefined && e.chance < 1 ? ` (${Math.round(e.chance * 100)} % de chances)` : ''
  const cap = e.limit !== undefined ? ` · ${e.limit} fois max. par combat` : ''
  const when = e.when?.length ? ` · si ${e.when.map(describeCondition).join(' et ')}` : ''
  const forfeit = e.forfeitsHit ? 'pas de dégâts, mais ' : ''
  const r = e.reshapesHit
  const reshape = r
    ? `${r.value === 'max' ? 'frappe pour la valeur maximale de son dé' : `relance son dé et frappe pour ${r.bonus ?? 0} de plus`}${r.noCrit ? ', jamais critique' : ''}`
    : ''
  return `${forfeit}${[reshape, ...e.effects.map(describeEffect)].filter(Boolean).join(', ')}${odds}${when}${cap}`
}
