/*
 * Coups spéciaux : les badges qui s'empilent sous le dé quand une frappe devient spéciale (critique,
 * critique assuré, Furie des vents, Riposte, Rétribution, coup transformé…). Présentation pure : rien
 * n'est recalculé, le rejoueur lit la chronologie et pose un badge au moment où l'effet a lieu.
 *
 * La couleur d'un badge est celle de la famille de l'effet (docs/FAMILLES.md § 3), déduite de sa mécanique :
 * une compétence ou un statut nouveau qui arme un coup spécial a donc son badge sans rien déclarer.
 * `TONE_OVERRIDE` donne à un personnage sa couleur propre quand elle parle mieux que la famille.
 */
import type { CharacterEvent } from './events'
import { STATUSES, type StatusId } from './statuses'

export type SpecialTone = 'crit' | 'precision' | 'tempo' | 'fortune' | 'retaliation' | 'heal' | 'power' | 'bard'

/** Un badge posé sous le dé ; `key` relance son apparition. */
export interface SpecialBadge {
  key: number
  label: string
  tone: SpecialTone
}

/** Couleurs : fond, texte et tranche (ombre portée sous le badge). Le critique garde son ambre. */
export const TONE_STYLE: Record<SpecialTone, { name: string; bg: string; fg: string; edge: string }> = {
  crit: { name: 'Critique', bg: '#fbbf24', fg: '#1c1917', edge: '#92400e' },
  precision: { name: 'Précision', bg: '#fef3c7', fg: '#1c1917', edge: '#a16207' },
  tempo: { name: 'Tempo', bg: '#7dd3fc', fg: '#0c1a2a', edge: '#075985' },
  fortune: { name: 'Fortune', bg: '#c084fc', fg: '#1e0b2e', edge: '#6b21a8' },
  retaliation: { name: 'Représailles', bg: '#e11d48', fg: '#fff1f2', edge: '#881337' },
  // Vol de vie : violet profond, la cape du mort-vivant (le rouge-rose se confondait avec les dégâts, retour de l'utilisateur)
  heal: { name: 'Drain', bg: '#7c3aed', fg: '#f5f3ff', edge: '#3b0764' },
  power: { name: 'Puissance', bg: '#fb923c', fg: '#1c0f05', edge: '#9a3412' },
  bard: { name: 'Barde', bg: '#ec4899', fg: '#fdf2f8', edge: '#831843' },
}

/** Couleur propre à un personnage, prioritaire sur la famille (par id de compétence ou de statut). */
const TONE_OVERRIDE: Partial<Record<string, SpecialTone>> = {
  crescendo: 'bard',
  soloist: 'bard',
}

/**
 * Famille d'un statut qui arme ou produit un coup spécial, d'après sa mécanique ; undefined s'il n'en
 * produit pas (un bouclier, un poison, une aura ne posent pas de badge).
 */
export function statusSpecialTone(id: StatusId): SpecialTone | undefined {
  const override = TONE_OVERRIDE[id]
  if (override) return override
  const def = STATUSES[id]
  if (def.forcesCrit) return 'precision'
  if (def.coinToss || def.extraDie) return 'fortune'
  if (def.extraStrikes) return 'tempo'
  if (def.reflectsHit || def.fillsOnHurt || def.reactions?.hurt) return 'retaliation'
  if (def.drainsHit) return 'heal'
  return undefined
}

/** Famille d'une compétence qui produit un coup spécial : coup transformé, gros coup d'un double, relâche. */
export function eventSpecialTone(event: CharacterEvent): SpecialTone | undefined {
  const override = TONE_OVERRIDE[event.id]
  if (override) return override
  if (event.effects.some((e) => e.type === 'release')) return 'retaliation'
  if (event.merged) return 'power'
  if (event.reshapesHit) return 'fortune'
  return undefined
}
