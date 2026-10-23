/*
 * Types de dégâts (règles v2, phase 1, docs/PROGRESSION.md § 9) : ce qu'un dégât EST dans l'histoire, à côté de sa
 * mécanique (coup, dégâts directs, statut qui agit), qui reste une règle du moteur. Une simple étiquette pour
 * l'instant : aucune règle ne la lit (l'armure s'applique comme avant). Elle servira d'accroche aux bonus par type
 * (« +2 à tous les DM », par impact) et de couleur aux chiffres de dégâts.
 *
 * Chaque effet de dégâts déclare sa SOURCE (`Effect` : `damage`, `release`) ; le TYPE se déduit de la source. Le coup de
 * base (règles v2, phase 5 bis) porte le type de l'attaque de son personnage (`AttackKind`, `CharacterDef.attackKind`).
 */

/**
 * Les trois types : physique (DP, un coup, une lame, un os), magique (DM), temporaire (DT, un statut qui ronge tour
 * après tour).
 */
export type DamageKind = 'physical' | 'magical' | 'temporal'

export const DAMAGE_KINDS: Record<DamageKind, { short: 'DP' | 'DM' | 'DT'; label: string }> = {
  physical: { short: 'DP', label: 'Dégâts physiques' },
  magical: { short: 'DM', label: 'Dégâts magiques' },
  temporal: { short: 'DT', label: 'Dégâts temporaires' },
}

/** Le type d'une attaque (le coup de base, docs/RESOLUTION.md § 3 bis) : DP ou DM, jamais temporaire. */
export type AttackKind = Exclude<DamageKind, 'temporal'>

export type DamageSource = 'strike' | 'holy' | 'lightning' | 'fire' | 'wind' | 'poison' | 'bleed' | 'burn' | 'rot'

/**
 * Le registre des sources : leur type, et la couleur de leur « −N » quand un statut agit (docs/MISE_EN_SCENE.md, M37 :
 * Poison en vert acide, Brûlure et Pourriture en mauve ; sans couleur, le rouge des coups, Saignement compris).
 */
export const DAMAGE_SOURCES: Record<DamageSource, { kind: DamageKind; name: string; tone?: 'poison' | 'arcane' }> = {
  // Un coup, une lame, un os : Pile ou face, la Riposte et la relâche de la Rétribution aussi (décisions de l'utilisateur)
  strike: { kind: 'physical', name: 'Coup' },
  holy: { kind: 'magical', name: 'Lumière' },
  lightning: { kind: 'magical', name: 'Foudre' },
  fire: { kind: 'magical', name: 'Feu' },
  wind: { kind: 'magical', name: 'Vent' },
  poison: { kind: 'temporal', name: 'Poison', tone: 'poison' },
  bleed: { kind: 'temporal', name: 'Saignement' },
  // Les Feux follets du druide (compétence arcane) : une brûlure magique, en mauve (2026-10-23, utilisateur)
  burn: { kind: 'temporal', name: 'Brûlure', tone: 'arcane' },
  // La couleur de l'Aura de pourriture qui la pose
  rot: { kind: 'temporal', name: 'Pourriture', tone: 'arcane' },
}

export const damageKind = (source: DamageSource): DamageKind => DAMAGE_SOURCES[source].kind
