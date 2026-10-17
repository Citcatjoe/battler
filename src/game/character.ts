import type { CharacterEvent } from './events'
import type { StatusId } from './statuses'

export interface CharacterStats {
  maxHp: number
  /** Nombre de faces du dé de dégâts (1 à N) */
  damageDie: number
  /** Dégâts retirés de chaque coup reçu (un coup inflige toujours au moins 1) */
  armor: number
  /** Probabilité d'esquiver une attaque, entre 0 et 1 */
  dodgeChance: number
  /** Probabilité de porter un coup critique, entre 0 et 1 */
  critChance: number
  /** Multiplicateur des dégâts du dé en cas de critique */
  critMultiplier: number
}

export const STAT_KEYS = [
  'maxHp',
  'damageDie',
  'armor',
  'dodgeChance',
  'critChance',
  'critMultiplier',
] as const satisfies readonly (keyof CharacterStats)[]

export interface CharacterLook {
  image: string
  /** Sens dans lequel regarde l'image source */
  facing: 'left' | 'right'
  /** Filtre CSS pour décliner une même image */
  tint?: string
  /** Hauteur relative à l'écran (1 = taille d'un orc) */
  scale: number
  /** Cadrage du portrait : position du visage en % de l'image, et zoom */
  portrait: { x: number; y: number; zoom: number }
}

/** Fiche courte affichée en jeu. La philosophie et les choix de design sont dans docs/PERSONNAGES.md. */
export interface CharacterLore {
  /** Une phrase d'accroche */
  tagline: string
  /** Deux ou trois phrases, pas plus */
  background: string
  strengths: readonly string[]
  weaknesses: readonly string[]
}

export interface CharacterDef {
  id: string
  name: string
  race: string
  /** Archétype de combat, ex. « Brute » */
  archetype: string
  /** Pour une variante de coloris : id du personnage d'origine */
  baseId?: string
  stats: CharacterStats
  look: CharacterLook
  lore: CharacterLore
  /** Capacités déclenchées en combat ; une variante hérite de celles de son original */
  events: readonly CharacterEvent[]
  /** Statuts qui ne peuvent pas lui être posés (ex. un mort-vivant insensible au poison) */
  immunities?: readonly StatusId[]
}

/**
 * Un personnage jouable : identité, caractéristiques de base et événements.
 * Pure donnée, immuable : les jets et les règles vivent dans le moteur (`combat.ts`).
 */
export class Character {
  readonly id: string
  readonly name: string
  readonly race: string
  readonly archetype: string
  readonly baseId?: string
  readonly stats: Readonly<CharacterStats>
  readonly look: Readonly<CharacterLook>
  readonly lore: CharacterLore
  readonly events: readonly CharacterEvent[]
  readonly immunities: readonly StatusId[]
  readonly #def: CharacterDef

  constructor(def: CharacterDef) {
    this.#def = def
    this.id = def.id
    this.name = def.name
    this.race = def.race
    this.archetype = def.archetype
    this.baseId = def.baseId
    this.stats = Object.freeze({ ...def.stats })
    this.look = Object.freeze({ ...def.look })
    this.lore = def.lore
    this.events = def.events
    this.immunities = def.immunities ?? []
  }

  get maxHp() {
    return this.stats.maxHp
  }

  /** Même personnage (mêmes id et stats) sous un autre nom, ex. « Gorak II » en tournoi. */
  withName(name: string) {
    return new Character({ ...this.#def, name })
  }
}

/**
 * Décline un personnage : nouvelle identité, nouveau coloris et petits ajustements de stats.
 * Les deltas de `stats` s'ajoutent à ceux de la base ; les événements sont hérités.
 */
export function variant(
  base: CharacterDef,
  changes: Pick<CharacterDef, 'id' | 'name' | 'archetype' | 'lore'> & {
    tint: string
    stats: Partial<CharacterStats>
  },
): CharacterDef {
  const stats = { ...base.stats }
  for (const [key, delta] of Object.entries(changes.stats) as [keyof CharacterStats, number][]) {
    stats[key] = Math.round((stats[key] + delta) * 100) / 100
  }
  return {
    ...base,
    id: changes.id,
    name: changes.name,
    archetype: changes.archetype,
    lore: changes.lore,
    baseId: base.id,
    stats,
    look: { ...base.look, tint: changes.tint },
  }
}
