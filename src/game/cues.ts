import type { AppliedEffect, Side } from './combat'
import { isAura, STATUSES } from './statuses'

/** Les sons qu'une compétence peut jouer, d'après ses effets (`docs/SONS.md` § 4.2). */
export type Cue = 'auraGain' | 'auraLoss' | 'debuff' | 'buff' | 'dispel' | 'heal'

/**
 * Le son d'une compétence ou d'un statut qui agit : un seul, le premier qui correspond à ce qu'il
 * a réellement produit. Les dégâts sonnent avec leurs coups ; rien d'autre (effet bloqué) : `null`.
 * La règle ne connaît aucun nom de compétence ni de statut : seulement l'aura, la polarité et le type d'effet.
 */
export function cueOf(source: Side | null, effects: readonly AppliedEffect[]): Cue | null {
  const posed = effects.flatMap((e) => (e.type === 'applyStatus' && e.result.kind === 'applied' ? [e] : []))
  const removed = effects.flatMap((e) => (e.type === 'cleanse' ? e.removed : []))
  if (posed.some((e) => isAura(e.status))) return 'auraGain'
  if (removed.some(isAura)) return 'auraLoss'
  if (posed.some((e) => STATUSES[e.status].polarity === 'negative')) return 'debuff'
  if (posed.some((e) => e.target === source)) return 'buff'
  if (removed.length > 0) return 'dispel'
  if (effects.some((e) => e.type === 'heal' && e.amount > 0)) return 'heal'
  return null
}
