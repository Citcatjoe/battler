/*
 * Types de dégâts (règles v2, phase 1, docs/PROGRESSION.md § 9) : ce qu'un dégât EST dans l'histoire, à côté de sa
 * mécanique (coup, dégâts directs, statut qui agit), qui reste une règle du moteur. Une étiquette pour l'instant :
 * aucune règle ne la lit (l'armure s'applique comme avant). Elle servira d'accroche aux bonus par type (« +2 à tous les
 * DM », par impact) ; elle donne déjà leur couleur aux chiffres des dégâts (phase 7, docs/MISE_EN_SCENE.md, M37).
 *
 * Chaque effet de dégâts déclare sa SOURCE (`Effect` : `damage`, `release`) ; le TYPE et la TEINTE se déduisent de la
 * source. Le coup de base (règles v2, phase 5 bis) porte le type de l'attaque de son personnage (`AttackKind`,
 * `CharacterDef.attackKind`), et sa source (`CharacterDef.attackSource`) : un coup physique est un `strike`, un coup
 * magique nomme sa magie (Ysolde : la Lumière ; le druide sous forme humaine : la Foudre).
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
 * La teinte d'un chiffre de dégâts (docs/MISE_EN_SCENE.md, M37) : six au plus, une par source ou par famille de
 * sources, sur le chiffre seulement (docs/PROGRESSION.md § 9.3). Ses classes : `TONE_CLASS` et `HIT_TONE_CLASS`
 * (narration.ts) ; l'or du critique et du coup lourd reste à part.
 */
export type DamageTone = 'damage' | 'poison' | 'arcane' | 'light' | 'storm' | 'air'

/** Le nom de chaque teinte, pour la règle « Types de dégâts » du compendium */
export const DAMAGE_TONES: Record<DamageTone, { label: string }> = {
  damage: { label: 'rouge' },
  light: { label: 'ivoire cerclé d’or' },
  storm: { label: 'cyan' },
  air: { label: 'gris acier' },
  arcane: { label: 'mauve' },
  poison: { label: 'vert acide' },
}

/** Le registre des sources : leur type, leur nom, et la teinte de leur chiffre à l'écran (M37). */
export const DAMAGE_SOURCES: Record<DamageSource, { kind: DamageKind; name: string; tone: DamageTone }> = {
  // Un coup, une lame, un os : Pile ou face, la Riposte et la relâche de la Rétribution aussi (décisions de l'utilisateur)
  strike: { kind: 'physical', name: 'Coup', tone: 'damage' },
  // La lumière d'Ysolde : un blanc cerclé d'or, loin de l'ambre du critique et de l'or pâle d'un bonus gagné
  holy: { kind: 'magical', name: 'Lumière', tone: 'light' },
  // L'éclair : le cyan de l'orage
  lightning: { kind: 'magical', name: 'Foudre', tone: 'storm' },
  // Le feu magique du jeu est mauve depuis les Feux follets (2026-10-23, utilisateur) : la Braise captive le rejoint
  fire: { kind: 'magical', name: 'Feu', tone: 'arcane' },
  // Les lames d'air de la Conque des vents : un gris d'acier
  wind: { kind: 'magical', name: 'Vent', tone: 'air' },
  poison: { kind: 'temporal', name: 'Poison', tone: 'poison' },
  // Le sang reste rouge : la plaie se lit par son label sous le dé et son petit « −N »
  bleed: { kind: 'temporal', name: 'Saignement', tone: 'damage' },
  // Les Feux follets du druide (compétence arcane) : une brûlure magique, en mauve (2026-10-23, utilisateur)
  burn: { kind: 'temporal', name: 'Brûlure', tone: 'arcane' },
  // La couleur de l'Aura de pourriture qui la pose
  rot: { kind: 'temporal', name: 'Pourriture', tone: 'arcane' },
}

export const DAMAGE_SOURCE_IDS = Object.keys(DAMAGE_SOURCES) as DamageSource[]

export const damageKind = (source: DamageSource): DamageKind => DAMAGE_SOURCES[source].kind
