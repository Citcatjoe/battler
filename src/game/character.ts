import type { PoseId } from './poses'
import type { CharacterEvent } from './events'
import { forgedEvents, forgeState, type ForgeStep } from './forge'
import { withRelicStats, type Relic } from './relics'
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
  /**
   * Part vide de l'image sous les pieds de la garde (0 par défaut) : une posture qui descend plus bas que les
   * pieds (la queue de la voleuse) laisse du vide sous la garde, qui paraît alors flotter. L'image est
   * redescendue d'autant, partout où elle s'affiche.
   */
  footroom?: number
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
export const figureHeight = (look: Pick<CharacterLook, 'scale' | 'headroom' | 'footroom'>) =>
  look.scale * (1 - (look.headroom ?? 0) - (look.footroom ?? 0))

/** Décalage vers le bas d'une image dont la toile a du vide sous les pieds (`footroom`), en part du conteneur. */
export const footDrop = (look: Pick<CharacterLook, 'scale' | 'footroom'>) => look.scale * (look.footroom ?? 0)

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
  /**
   * Statuts de forme (0.73.0) : posés tant qu'il a cette forme, retirés quand il la quitte. Ce sont les
   * règles de la forme (le d3 de l'homme, le +3 de l'ours) ; ils doivent être `mechanic: 'form'` (validateRoster).
   */
  statuses?: readonly StatusId[]
}

export interface CharacterDef {
  id: string
  name: string
  race: string
  /** Archétype de combat, ex. « Brute » */
  archetype: string
  stats: CharacterStats
  look: CharacterLook
  lore: CharacterLore
  /** Capacités déclenchées en combat */
  events: readonly CharacterEvent[]
  /**
   * Signature (règles v2, docs/PROGRESSION.md § 7.2) : l'id de sa compétence emblème, la seule qu'il garde au départ
   * d'une campagne. Sans signature (le combattant nu, les exceptions de structure), il y part avec son kit entier.
   */
  signature?: string
  /**
   * Répertoire (règles v2, phase 2, docs/PROGRESSION.md § 7) : les compétences gravables d'autres personnages qu'il peut
   * apprendre par la forge, en campagne ; deux fils de synergie, écrits pour lui. Sans effet sur le combat.
   */
  repertoire?: readonly string[]
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
  /**
   * Reliques portées (tournoi, docs/RELIQUES.md), dans l'ordre d'obtention. Leurs stats s'ajoutent à plat à
   * `stats` ; leurs autres effets sont appliqués par le moteur.
   */
  relics?: readonly Relic[]
  /**
   * Forge du dé (campagne, docs/CAMPAGNE.md § 4) : journal d'opérations, rejoué sur `stats` et `events` d'origine.
   * Le dé forgé remplace `damageDie`, les gravures et les rangs s'ajoutent aux compétences, les dorures au coup.
   */
  forge?: readonly ForgeStep[]
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
  /** Stats de combat : celles du personnage (dé forgé compris), plus celles de ses reliques */
  readonly stats: Readonly<CharacterStats>
  /** Stats du personnage seul, dé forgé compris, sans ses reliques */
  readonly baseStats: Readonly<CharacterStats>
  readonly look: Readonly<CharacterLook>
  readonly lore: CharacterLore
  /** Compétences : celles d'origine, plus celles de sa forge (gravées, aiguisées) */
  readonly events: readonly CharacterEvent[]
  readonly immunities: readonly StatusId[]
  readonly forms?: readonly [CharacterForm, CharacterForm]
  readonly twinDice: boolean
  readonly relics: readonly Relic[]
  /** Journal de forge de son dé (vide : dé d'origine) */
  readonly forge: readonly ForgeStep[]
  /** Bonus des faces dorées, par face (forge du dé) : lu par le moteur à chaque coup */
  readonly gilded: Readonly<Record<number, number>>
  readonly #def: CharacterDef

  constructor(def: CharacterDef) {
    this.#def = def
    this.id = def.id
    this.name = def.name
    this.race = def.race
    this.archetype = def.archetype
    this.forge = def.forge ?? []
    const forged = this.forge.length > 0 ? forgeState(def, this.forge) : undefined
    this.baseStats = Object.freeze(forged ? { ...def.stats, damageDie: forged.size } : { ...def.stats })
    this.relics = def.relics ?? []
    this.stats = Object.freeze(withRelicStats(this.baseStats, this.relics))
    this.look = Object.freeze({ ...def.look })
    this.lore = def.lore
    this.events = forged ? forgedEvents(def, forged) : def.events
    this.gilded = Object.freeze(forged ? Object.fromEntries(forged.gilded) : {})
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

  /** Même personnage, avec ces reliques (elles remplacent les précédentes). */
  withRelics(relics: readonly Relic[]) {
    return new Character({ ...this.#def, relics })
  }

  /** Même personnage, avec ce journal de forge (il remplace le précédent). */
  withForge(forge: readonly ForgeStep[]) {
    return new Character({ ...this.#def, forge })
  }

  /** Sa définition, avant forge et reliques : la forge se rejoue dessus (forge.ts). */
  get definition(): CharacterDef {
    return this.#def
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
