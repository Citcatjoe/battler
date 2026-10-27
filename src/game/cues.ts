import type { AppliedEffect, Side } from './combat'
import { atCap } from './narration'
import { isAura, isMechanic, STATUSES, type Family, type Polarity } from './statuses'

/** Les sons de pose par famille (`docs/SONS.md` § 3, règle 4 étendue le 2026-10-25) */
export type FamilyCue =
  | 'powerUp' | 'powerDown' | 'guardUp' | 'guardDown' | 'precisionUp' | 'precisionDown' | 'evasionUp' | 'evasionDown'
  | 'tempoDown' | 'fortuneUp' | 'fortuneDown' | 'afflictionDown' | 'healingUp' | 'healingDown' | 'retaliationUp' | 'sealDown'

/** Les sons qu'une compétence peut jouer, d'après ses effets (`docs/SONS.md` § 4.2). */
export type Cue = 'auraGain' | 'auraLoss' | 'debuff' | 'buff' | 'dispel' | 'heal' | FamilyCue

/**
 * Le son de la pose d'un statut, par famille et par polarité : une famille, un matériau (`docs/SONS.md` § 3). Un côté
 * sans son à lui reprend le son générique de sa polarité : Bonus gagné pour le Tempo (ses bonus sont des mécanismes,
 * muets) et les Sceaux (la Garde sacrée, inutilisée ; l'Aura d'immunité est une aura), Malus reçu pour les Représailles
 * (aucun malus).
 */
export const FAMILY_CUES: Record<Family, Record<Polarity, Cue>> = {
  power: { positive: 'powerUp', negative: 'powerDown' },
  guard: { positive: 'guardUp', negative: 'guardDown' },
  precision: { positive: 'precisionUp', negative: 'precisionDown' },
  evasion: { positive: 'evasionUp', negative: 'evasionDown' },
  tempo: { positive: 'buff', negative: 'tempoDown' },
  fortune: { positive: 'fortuneUp', negative: 'fortuneDown' },
  affliction: { positive: 'buff', negative: 'afflictionDown' },
  healing: { positive: 'healingUp', negative: 'healingDown' },
  retaliation: { positive: 'retaliationUp', negative: 'debuff' },
  seals: { positive: 'buff', negative: 'sealDown' },
}

/**
 * Le son d'une compétence ou d'un statut qui agit : un seul, le premier qui correspond à ce qu'il
 * a réellement produit. Les dégâts sonnent avec leurs coups ; rien d'autre (effet bloqué, statut déjà à
 * son plafond, mécanisme de compétence posé : son sceau le montre, ce qu'il déclenche a ses sons) : `null`.
 * Un malus ou un bonus posé sonne sa famille (le premier posé, s'il y en a plusieurs). Un bonus volé (`stolenBy` : le Sceau
 * de vol, ou un bonus pris sur l'adversaire, le Larcin) sonne d'abord le vol : la perte, dans la famille du statut qui l'a
 * pris (Sceaux −), qu'il soit un malus posé au volé ou un bonus de son voleur. Un soin
 * empêché (`wanted`, l'Hémorragie, lot 3) sonne le malus de Soin : le soin qui flanche.
 * La règle ne connaît aucun nom de compétence ni de statut : seulement l'aura, la polarité, la famille et le type d'effet.
 */
export function cueOf(source: Side | null, effects: readonly AppliedEffect[]): Cue | null {
  const posed = effects.flatMap((e) =>
    e.type === 'applyStatus' && e.result.kind === 'applied' && !atCap(e) && !isMechanic(e.status) ? [e] : [],
  )
  const removed = effects.flatMap((e) => (e.type === 'cleanse' ? e.removed : []))
  const thief = posed.find((e) => e.stolenBy !== undefined)?.stolenBy
  if (thief) return FAMILY_CUES[STATUSES[thief].family].negative
  if (posed.some((e) => isAura(e.status))) return 'auraGain'
  if (removed.some(isAura)) return 'auraLoss'
  const malus = posed.find((e) => STATUSES[e.status].polarity === 'negative')
  if (malus) return FAMILY_CUES[STATUSES[malus.status].family].negative
  const bonus = posed.find((e) => e.target === source)
  if (bonus) return FAMILY_CUES[STATUSES[bonus.status].family].positive
  if (removed.length > 0) return 'dispel'
  if (effects.some((e) => e.type === 'heal' && e.amount > 0)) return 'heal'
  if (effects.some((e) => e.type === 'heal' && e.amount === 0 && e.wanted !== undefined)) return FAMILY_CUES.healing.negative
  return null
}
