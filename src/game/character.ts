import type { PoseId } from './poses'
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
  /**
   * Hauteur de l'image, en part du conteneur d'un combattant. Réglée pour suivre l'échelle resserrée des
   * personnages (STYLE_BIBLE § 2 : nain 0,86, humain 1, orc 1,08, ogre 1,13 par rapport à un humain) :
   * scale = taille × 0,92 / part de l'image occupée par le personnage. Toutes les images sont affichées
   * à leur largeur naturelle.
   */
  scale: number
  /**
   * Part vide de l'image au-dessus de la tête (0 par défaut) : la toile d'un personnage à postures est
   * plus haute que sa garde (arme levée de l'attaque). La zone d'état et les effets se calent sur la tête.
   */
  headroom?: number
  /**
   * Vide de la toile à gauche et à droite de la garde, en part de sa largeur (image source, avant tout
   * retournement). Une toile à postures large (fente de l'attaque) a beaucoup de vide autour de la garde :
   * l'ancrage `inside` (écran d'affrontement, champion) se cale alors sur la silhouette, pas sur la toile.
   */
  bodyInset?: { left: number; right: number }
  /** Cadrage du portrait : position du visage en % de l'image, et zoom */
  portrait: { x: number; y: number; zoom: number }
  /**
   * Postures (docs/POSTURES.md) : une image par moment du combat, sur la MÊME toile que `image`
   * (mêmes dimensions, même ligne de sol, même échelle), pour qu'en changer ne fasse pas sauter le
   * personnage. Une posture absente retombe sur `image`, la garde.
   */
  poses?: Partial<Record<Exclude<PoseId, 'idle'>, string>>
}

/** Hauteur du personnage (des pieds au sommet de la tête), en part du conteneur d'un combattant. */
export const figureHeight = (look: Pick<CharacterLook, 'scale' | 'headroom'>) => look.scale * (1 - (look.headroom ?? 0))

/** Fiche courte affichée en jeu. La philosophie et les choix de design sont dans docs/PERSONNAGES.md. */
export interface CharacterLore {
  /** Une phrase d'accroche */
  tagline: string
  /** Deux ou trois phrases, pas plus */
  background: string
  strengths: readonly string[]
  weaknesses: readonly string[]
}

/**
 * Une forme d'un personnage qui change de forme (druide) : son nom et son apparence. Les compétences
 * de la forme portent son `id` (`CharacterEvent.form`).
 */
export interface CharacterForm {
  id: string
  name: string
  /** Remplace l'apparence de base (image, cadrage…) tant qu'il a cette forme */
  look?: Partial<CharacterLook>
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
  /**
   * Deux formes (druide) : il commence le combat sous la première, puis en change au début de
   * chacun de ses tours, sauf le premier.
   */
  forms?: readonly [CharacterForm, CharacterForm]
  /**
   * Deux dés par action (la barde) : deux coups, un par dé ; un double déclenche la compétence de sa
   * face (`doubleOne` à `doubleFive`) à la place des deux coups. Voir docs/RESOLUTION.md § 2.
   */
  twinDice?: true
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
  readonly forms?: readonly [CharacterForm, CharacterForm]
  readonly twinDice: boolean
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
    this.forms = def.forms
    this.twinDice = !!def.twinDice
  }

  /** Apparence sous une forme donnée (index dans `forms`) ; l'apparence de base sinon. */
  lookFor(form = 0): Readonly<CharacterLook> {
    const f = this.forms?.[form]
    if (!f?.look) return this.look
    // Une forme qui change d'image ne reprend pas les postures de la forme de base
    const poses = f.look.image ? f.look.poses : (f.look.poses ?? this.look.poses)
    return { ...this.look, ...f.look, tint: this.look.tint, poses }
  }

  get maxHp() {
    return this.stats.maxHp
  }

  /** Même personnage (mêmes id et stats) sous un autre nom, ex. « Gorak II » en tournoi. */
  withName(name: string) {
    return new Character({ ...this.#def, name })
  }

  /** Même personnage avec des stats ou des compétences modifiées : sert aux essais d'équilibrage (analysis.ts). */
  adjusted(changes: { stats?: Partial<CharacterStats>; events?: readonly CharacterEvent[] }) {
    return new Character({
      ...this.#def,
      stats: { ...this.#def.stats, ...changes.stats },
      events: changes.events ?? this.#def.events,
    })
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
