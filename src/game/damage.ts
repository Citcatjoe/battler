/*
 * Sources de dégâts (règles v2, phase 1, docs/PROGRESSION.md § 9) : ce qu'un dégât EST dans l'histoire, à côté de sa
 * mécanique (coup, dégâts directs, statut qui agit), qui reste une règle du moteur. Aucune règle ne la lit : elle donne
 * leur couleur aux chiffres des dégâts (phase 7, docs/MISE_EN_SCENE.md, M37), et sa famille aux accroches (hooks.ts).
 *
 * Chaque effet de dégâts déclare sa SOURCE (`Effect` : `damage`, `release`) ; la FAMILLE et la TEINTE s'en déduisent.
 * Un type unique d'attaque (2026-10-24, retour de l'utilisateur : « l'attaque doit pour le moment être une valeur d'un
 * type unique ») : plus de dégâts physiques ni magiques (DP, DM) ; le coup de base de tout personnage est un coup
 * (`strike`), le « coup blanc ». Restent deux familles : l'instant (un coup, des dégâts directs) et le temporaire (DT,
 * un statut qui ronge tour après tour), qui garde la couleur de son statut.
 *
 * Magique ou physique (2026-10-27, demande de l'utilisateur, docs/POSTURES.md § 7) : chaque source dit aussi si ce qu'elle
 * blesse est un sort (`magical`). Aucune règle ne le lit non plus : un sort offensif fait prendre à son lanceur sa posture
 * d'incantation (`castsSpell`, poses.ts), là où un coup garde l'élan de l'attaque.
 */

/** Les deux familles : un dégât de l'instant (coup, dégâts directs), ou temporaire (DT, un statut qui ronge). */
export type DamageKind = 'instant' | 'temporal'

export type DamageSource = 'strike' | 'holy' | 'lightning' | 'fire' | 'wind' | 'poison' | 'bleed' | 'burn' | 'rot'

/**
 * La teinte d'un chiffre de dégâts (docs/MISE_EN_SCENE.md, M37) : une par source ou par famille de sources, sur le
 * chiffre seulement (docs/PROGRESSION.md § 9.3). Ses classes : `TONE_CLASS` et `HIT_TONE_CLASS` (narration.ts) ; l'or
 * du critique et du coup lourd reste à part.
 */
export type DamageTone = 'hit' | 'damage' | 'poison' | 'arcane' | 'light' | 'storm' | 'air'

/** Le nom de chaque teinte, pour la règle « Couleurs des dégâts » du compendium */
export const DAMAGE_TONES: Record<DamageTone, { label: string }> = {
  hit: { label: 'blanc' },
  damage: { label: 'rouge' },
  light: { label: 'ivoire cerclé d’or' },
  storm: { label: 'cyan' },
  air: { label: 'gris acier' },
  arcane: { label: 'mauve' },
  poison: { label: 'vert acide' },
}

/** Le registre des sources : leur famille, leur nom, la teinte de leur chiffre à l'écran (M37), et sort ou non. */
export const DAMAGE_SOURCES: Record<DamageSource, { kind: DamageKind; name: string; tone: DamageTone; magical: boolean }> = {
  // Le coup blanc (2026-10-24) : le coup de base de tous, et Pile ou face, la Riposte, la relâche de la Rétribution
  strike: { kind: 'instant', name: 'Coup', tone: 'hit', magical: false },
  // La Purification d'Ysolde : un blanc cerclé d'or, loin de l'ambre du critique et de l'or pâle d'un bonus gagné
  holy: { kind: 'instant', name: 'Lumière', tone: 'light', magical: true },
  // La Foudre du druide : le cyan de l'orage
  lightning: { kind: 'instant', name: 'Foudre', tone: 'storm', magical: true },
  // Le feu magique du jeu est mauve depuis les Feux follets (2026-10-23, utilisateur) : la Braise captive le rejoint
  fire: { kind: 'instant', name: 'Feu', tone: 'arcane', magical: true },
  // Les lames d'air de la Conque des vents : un gris d'acier
  wind: { kind: 'instant', name: 'Vent', tone: 'air', magical: true },
  // Le venin des lames et des crocs : une plaie du corps, pas un sort (le Souffle de la tombe, arcane, l'est par sa nature)
  poison: { kind: 'temporal', name: 'Poison', tone: 'poison', magical: false },
  // Le sang reste rouge : la plaie se lit par son label sous le dé et son petit « −N »
  bleed: { kind: 'temporal', name: 'Saignement', tone: 'damage', magical: false },
  // Les Feux follets du druide (compétence arcane) : une brûlure magique, en mauve (2026-10-23, utilisateur)
  burn: { kind: 'temporal', name: 'Brûlure', tone: 'arcane', magical: true },
  // La couleur de l'Aura de pourriture qui la pose
  rot: { kind: 'temporal', name: 'Pourriture', tone: 'arcane', magical: true },
}

export const DAMAGE_SOURCE_IDS = Object.keys(DAMAGE_SOURCES) as DamageSource[]

export const damageKind = (source: DamageSource): DamageKind => DAMAGE_SOURCES[source].kind
