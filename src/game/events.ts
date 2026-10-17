/*
 * Événements : capacités qui se déclenchent à un moment précis du combat.
 * - Un déclencheur (`Trigger`) dit quand : aujourd'hui « 1 au dé de dégâts ».
 * - Des effets (`Effect`) disent quoi : soin immédiat ou bonus durable (`Buff`).
 * - Les bonus vivent dans l'état du combattant et sont consommés par les règles du combat.
 * Ajouter un événement = ajouter une entrée dans le roster ; ajouter un moment de
 * déclenchement = un nouveau `Trigger` et un appel à `triggerEvents` dans le moteur.
 */

export type Trigger = 'naturalOne'

export const TRIGGER_LABEL: Record<Trigger, string> = {
  naturalOne: 'Sur un 1 au dé de dégâts',
}

export type BuffKind = 'guaranteedCrit' | 'bonusArmor'

/** Bonus actif : `amount` = nombre de charges (critique) ou de points (armure). */
export interface Buff {
  kind: BuffKind
  amount: number
}

export const BUFF_INFO: Record<
  BuffKind,
  { icon: string; label: string; describe: (n: number) => string; className: string }
> = {
  guaranteedCrit: {
    icon: '🎯',
    label: 'Critique assuré',
    describe: (n) =>
      n > 1 ? `Les ${n} prochains coups qui touchent sont critiques` : 'Le prochain coup qui touche est critique',
    className: 'border-amber-400/70 bg-amber-500/15 text-amber-200',
  },
  bonusArmor: {
    icon: '🛡️',
    label: 'Armure temporaire',
    describe: (n) => `Absorbe encore ${n} point${n > 1 ? 's' : ''} de dégâts, puis disparaît`,
    className: 'border-cyan-400/70 bg-cyan-500/15 text-cyan-200',
  },
}

export type Effect = { type: 'heal'; amount: number } | { type: 'buff'; kind: BuffKind; amount: number }

export interface CharacterEvent {
  id: string
  name: string
  trigger: Trigger
  effects: Effect[]
}

export function describeEffect(effect: Effect) {
  if (effect.type === 'heal') return `+${effect.amount} PV`
  if (effect.kind === 'guaranteedCrit') return 'prochain coup critique assuré'
  return `+${effect.amount} armure temporaire (s'use en encaissant)`
}

export const describeEvent = (e: CharacterEvent) => e.effects.map(describeEffect).join(', ')

/* ---------- Bonus : lecture et modification (immuables) ---------- */

export const buffAmount = (buffs: Buff[], kind: BuffKind) => buffs.find((b) => b.kind === kind)?.amount ?? 0

/** Ajoute (ou cumule) un bonus. */
export function addBuff(buffs: Buff[], kind: BuffKind, amount: number): Buff[] {
  const existing = buffAmount(buffs, kind)
  return [...buffs.filter((b) => b.kind !== kind), { kind, amount: existing + amount }]
}

/** Retire une partie d'un bonus ; il disparaît à 0. */
export function consumeBuff(buffs: Buff[], kind: BuffKind, amount: number): Buff[] {
  const left = buffAmount(buffs, kind) - amount
  const rest = buffs.filter((b) => b.kind !== kind)
  return left > 0 ? [...rest, { kind, amount: left }] : rest
}
