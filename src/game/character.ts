import type { CharacterEvent } from './events'

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
  /** Capacités déclenchées en combat ; une variante hérite de celles de son original */
  events: CharacterEvent[]
}

const chance = (p: number) => Math.random() < p

/** Un personnage jouable : ses caractéristiques de base et ses jets. Immuable. */
export class Character {
  readonly id: string
  readonly name: string
  readonly race: string
  readonly archetype: string
  readonly baseId?: string
  readonly stats: CharacterStats
  readonly look: CharacterLook
  readonly events: CharacterEvent[]

  constructor(def: CharacterDef) {
    this.id = def.id
    this.name = def.name
    this.race = def.race
    this.archetype = def.archetype
    this.baseId = def.baseId
    this.stats = { ...def.stats }
    this.look = { ...def.look }
    this.events = def.events
  }

  get maxHp() {
    return this.stats.maxHp
  }

  rollDamage() {
    return 1 + Math.floor(Math.random() * this.stats.damageDie)
  }

  rollCrit() {
    return chance(this.stats.critChance)
  }

  rollDodge() {
    return chance(this.stats.dodgeChance)
  }

  /** Même personnage (mêmes id et stats) sous un autre nom, ex. « Gorak II » en tournoi. */
  renamed(name: string) {
    const copy = Object.create(Character.prototype) as Character
    return Object.assign(copy, this, { name })
  }

  /** Dégâts réellement subis après l'armure. */
  absorb(damage: number) {
    return Math.max(1, damage - this.stats.armor)
  }
}

/**
 * Décline un personnage : nouvelle identité, nouveau coloris et petits ajustements de stats.
 * Les deltas de `stats` s'ajoutent à ceux de la base.
 */
export function variant(
  base: CharacterDef,
  changes: Pick<CharacterDef, 'id' | 'name' | 'archetype'> & {
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
    baseId: base.id,
    stats,
    look: { ...base.look, tint: changes.tint },
  }
}
