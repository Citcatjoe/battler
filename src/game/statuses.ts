import type { CharacterStats } from './character'
import { TRIGGERS, type Effect, type Trigger } from './events'

/*
 * Statuts (« auras ») : effets durables portés par un combattant, positifs ou négatifs.
 * Un statut est entièrement décrit ici, règles ET présentation : le moteur et l'interface
 * ne connaissent aucun statut par son nom. Ajouter un statut = ajouter une entrée à STATUSES.
 *
 * Durée de vie :
 * - `stacks` : charges ou points. Un statut à 0 charge disparaît.
 * - `turns` (facultatif) : nombre de tours du porteur avant expiration, décompté au début
 *   (défaut) ou à la fin de ses tours (`expiresAt`). Sans `turns`, le statut dure jusqu'à
 *   épuisement de ses charges.
 * - Un statut posé pendant un tour n'est pas décompté à la fin de ce même tour : « 1 tour »
 *   posé pendant son action dure jusqu'à la fin de son prochain tour (Vol de vie, Furie des vents).
 * Les règles de résolution (phases, ordre, application, opposition) sont dans docs/RESOLUTION.md.
 */

export type StatusId =
  | 'guaranteedCrit'
  | 'bonusArmor'
  | 'poison'
  | 'regeneration'
  | 'weakened'
  | 'exposed'
  | 'burn'
  | 'vulnerable'
  | 'stunned'
  | 'thorns'
  | 'ward'
  | 'lifesteal'
  | 'windFury'
  | 'evasion'
  | 'poisonAura'
  | 'powerAura'
  | 'intimidationAura'
  | 'precisionAura'
  | 'fear'
  | 'holyAura'
  | 'decoctionAura'
  | 'coinFlip'
  | 'luckyStrike'
  | 'immunityAura'
  | 'riposte'
  | 'retribution'
  | 'waiting'
  | 'barkSkin'
  | 'firefly'
  | 'rotAura'
  | 'rot'

export type Polarity = 'positive' | 'negative'

/** Un statut actif sur un combattant. */
export interface Status {
  id: StatusId
  stacks: number
  /** Débuts de tour restants ; absent = illimité */
  turns?: number
  /** Jauges d'un statut à jauges (`fillsOnHurt`) : dégâts stockés, du plus ancien au plus récent */
  slots?: number[]
}

/** Stats qu'un statut peut modifier pendant le combat (les PV max restent fixes). */
export type CombatStats = Omit<CharacterStats, 'maxHp'>

export interface StatusDef {
  name: string
  polarity: Polarity
  /** Une phrase générique, pour le compendium et la documentation */
  summary: string
  /** Explication au survol, selon l'état courant */
  describe: (s: Status) => string
  /** Valeur courte, avec son unité, pour les textes (survol, compendium) */
  badge: (s: Status) => string
  /**
   * Nombre affiché sur l'icône de l'état, au-dessus du combattant.
   * Défaut (`auto`) : les tours restants si le statut a une durée, sinon ses charges.
   */
  counter?: 'auto' | 'stacks' | 'turns'
  /**
   * Nouvelle application d'un statut déjà présent :
   * - `add` : les charges s'additionnent (la durée garde la plus longue) ;
   * - `refresh` : remplace charges et durée.
   */
  stacking: 'add' | 'refresh'
  /** Plafond de charges (défaut : aucun) : un cumul au-delà est ramené au plafond */
  maxStacks?: number
  /**
   * Apparence du porteur tant que le statut est actif (rappel visuel des effets en cours) :
   * `aura` marque l'aura de personnage (posée sur un 3) : seule elle illumine le modèle (halo, contour,
   * cercle au sol) et se distingue dans la zone d'état ; `opacity` le rend translucide (esquive).
   * `glow` (liseré coloré par statut) n'est plus dessiné depuis la 0.34.0 : gardé pour un usage futur.
   */
  look?: {
    glow?: string
    aura?: string
    opacity?: number
    /** Animation du porteur : `tremble` (il tremble de gauche à droite, ex. Peur) */
    motion?: 'tremble' | 'fireflies'
    /** Couleur du dé supplémentaire qu'il donne (`extraDie`) */
    dieColor?: string
  }

  /* --- Règles. Chaque crochet est facultatif ; le moteur les appelle à un moment fixe. --- */

  /** Modifie les stats effectives du porteur (bornées ensuite par le moteur) */
  modifyStats?: (stats: CombatStats, s: Status) => CombatStats
  /** Modifie les dégâts du porteur avant l'armure (le coup garde au moins 1) */
  modifyOutgoing?: (damage: number, s: Status) => number
  /** Le prochain coup qui touche est critique ; consomme une charge */
  forcesCrit?: boolean
  /** Le prochain coup reçu est esquivé à coup sûr ; consomme une charge par esquive */
  forcesDodge?: boolean
  /**
   * Vol de vie : le prochain coup porté rend au porteur les PV qu'il retire. Une charge est
   * consommée par coup porté, qu'il touche ou qu'il soit esquivé (alors rien n'est rendu).
   * Un jet de compétence (coup sacrifié) n'est pas un coup porté : la charge reste.
   */
  drainsHit?: boolean
  /** Coups supplémentaires à sa prochaine action, chacun résolu indépendamment ; le statut est consommé en entier */
  extraStrikes?: number
  /** Faces du dé des coups supplémentaires (défaut : le dé du porteur), ex. le d6 de Coup de chance */
  extraDie?: number
  /**
   * Pile ou face : à sa prochaine action, le porteur lance une pièce au lieu de son dé. Pile, l'adversaire
   * perd `damage` PV (dégâts directs) ; face, rien. Le statut est consommé en entier.
   */
  coinToss?: { damage: number }
  /**
   * S'estompe : chaque fois qu'il agit (`onTurnStart` ou `onTurnEnd`), le statut perd une charge, et
   * disparaît à 0. Une seule valeur dit à la fois sa force et ce qu'il lui reste (poison 3 : 3, 2, puis
   * 1 PV). Il n'a donc pas de durée en tours.
   */
  decays?: boolean
  /** Bouclier : absorbe jusqu'à `stacks` points après l'armure, sans descendre sous 1 dégât ; s'use d'autant */
  shield?: boolean
  /** Effets appliqués au porteur au début de chacun de ses tours (phase 1) */
  onTurnStart?: (s: Status) => Effect[]
  /** Effets appliqués au porteur à la fin de chacun de ses tours (phase 3) */
  onTurnEnd?: (s: Status) => Effect[]
  /** Moment où la durée (`turns`) est décomptée : début (défaut) ou fin des tours du porteur */
  expiresAt?: 'turnStart' | 'turnEnd'
  /** Modifie les dégâts reçus par le porteur, avant l'armure (le coup garde au moins 1) */
  modifyIncoming?: (damage: number, s: Status) => number
  /** Immunité : aucun statut de cette polarité ne peut être posé sur le porteur (sans consommer de charge) */
  immune?: Polarity
  /** Riposte : le prochain coup qui touche le porteur renvoie cette part des PV retirés (dégâts directs) ; consommé */
  reflectsHit?: number
  /**
   * Jauges : chaque coup qui touche le porteur y range ses PV retirés (`slots` jauges, la plus ancienne
   * cède sa place). Le statut n'est rempli que si le personnage peut le relâcher (effet `release`).
   */
  fillsOnHurt?: { slots: number }
  /** Contrôle : le porteur perd son action ; consomme une charge par tour perdu */
  skipsAction?: boolean
  /**
   * Réactions : effets déclenchés par un moment du combat, du point de vue du porteur
   * (mêmes déclencheurs que les événements ; ex. Épines sur `hurt`). Ils ne déclenchent rien
   * en cascade. Les cibles sont relatives au porteur.
   */
  reactions?: Partial<Record<Trigger, (s: Status) => Effect[]>>
  /** Le statut disparaît après avoir réagi une fois (ex. Épines : seul le prochain coup encaissé est puni) */
  spentOnReaction?: boolean
  /** Le porteur perd une charge chaque fois qu'un coup le touche (ex. Luciole : un coup inesquivable par charge) */
  spentOnHurt?: boolean
  /** Opposition : poser ce statut sur un porteur du statut opposé annule les charges une à une */
  opposes?: StatusId
  /** Garde : bloque la pose de ces statuts sur le porteur ; consomme une charge par blocage */
  wards?: { polarity?: Polarity; statuses?: readonly StatusId[] }
}

// « PV » est une abréviation : invariable
const plural = (n: number, word: string) => `${n} ${word}${n > 1 && word !== 'PV' ? 's' : ''}`
const forTurns = (s: Status) => (s.turns === undefined ? '' : `, encore ${plural(s.turns, 'tour')}`)

/** Charges de poison posées par coup qui touche, par charge d'Aura de décoction. */
export const DECOCTION_POISON = 2

export const STATUSES: Record<StatusId, StatusDef> = {
  guaranteedCrit: {
    name: 'Critique assuré',
    look: { glow: 'rgba(251,191,36,0.85)' },
    polarity: 'positive',
    summary: 'Le prochain coup qui touche est un coup critique.',
    describe: (s) =>
      s.stacks > 1
        ? `Les ${s.stacks} prochains coups qui touchent sont critiques`
        : 'Le prochain coup qui touche est critique',
    badge: (s) => `×${s.stacks}`,
    stacking: 'add',
    forcesCrit: true,
  },
  bonusArmor: {
    name: 'Armure temporaire',
    look: { glow: 'rgba(186,198,214,0.95)' },
    polarity: 'positive',
    summary: "Un bouclier qui absorbe des dégâts après l'armure, puis s'épuise.",
    describe: (s) => `Absorbe encore ${plural(s.stacks, 'point')} de dégâts, puis disparaît`,
    badge: (s) => String(s.stacks),
    stacking: 'add',
    shield: true,
  },

  poison: {
    name: 'Poison',
    look: { glow: 'rgba(74,222,128,0.75)' },
    polarity: 'negative',
    summary:
      "Au début de chaque tour du porteur, lui fait perdre autant de PV que de charges, en ignorant l'armure, puis perd une charge. Une seule valeur : les dégâts du prochain tour, qui baissent de 1 à chaque tour (3, 2, 1). Se cumule.",
    describe: (s) =>
      `Perd ${plural(s.stacks, 'PV')} au début de son prochain tour, puis 1 de moins à chaque tour${s.stacks > 1 ? ` (${(s.stacks * (s.stacks + 1)) / 2} PV en tout)` : ''}`,
    badge: (s) => String(s.stacks),
    // Une seule valeur, comme les autres états : dégâts et durée à la fois (0.36.4, demande de l'utilisateur)
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    onTurnStart: (s) => [{ type: 'damage', amount: s.stacks }],
    opposes: 'regeneration',
  },
  /* Statuts disponibles pour de futures compétences, pas encore attribués à un personnage. */
  regeneration: {
    name: 'Régénération',
    polarity: 'positive',
    summary: 'Rend des PV au début de chaque tour du porteur.',
    describe: (s) => `Regagne ${plural(s.stacks, 'PV')} au début de chacun de ses tours${forTurns(s)}`,
    badge: (s) => `+${s.stacks}`,
    stacking: 'refresh',
    onTurnStart: (s) => [{ type: 'heal', amount: s.stacks }],
    opposes: 'poison',
  },
  weakened: {
    name: 'Affaibli',
    polarity: 'negative',
    summary: 'Les coups du porteur infligent moins de dégâts.',
    describe: (s) => `Ses coups infligent ${s.stacks} de moins avant l'armure${forTurns(s)}`,
    badge: (s) => `−${s.stacks}`,
    stacking: 'refresh',
    modifyOutgoing: (damage, s) => damage - s.stacks,
  },
  exposed: {
    name: 'Brèche',
    polarity: 'negative',
    summary: "L'armure du porteur est réduite.",
    describe: (s) => `Armure réduite de ${s.stacks}${forTurns(s)}`,
    badge: (s) => `−${s.stacks}`,
    stacking: 'add',
    maxStacks: 3,
    modifyStats: (stats, s) => ({ ...stats, armor: stats.armor - s.stacks }),
  },

  /* Statuts qui illustrent chaque mécanique de résolution (docs/RESOLUTION.md), à venir. */
  burn: {
    name: 'Brûlure',
    polarity: 'negative',
    summary: 'Fait perdre des PV à la fin de chaque tour du porteur.',
    describe: (s) => `Perd ${plural(s.stacks, 'PV')} à la fin de chacun de ses tours${forTurns(s)}`,
    badge: (s) => String(s.stacks),
    stacking: 'refresh',
    onTurnEnd: (s) => [{ type: 'damage', amount: s.stacks }],
    expiresAt: 'turnEnd',
  },
  vulnerable: {
    name: 'Vulnérable',
    polarity: 'negative',
    summary: "Le porteur subit plus de dégâts à chaque coup, avant l'armure.",
    describe: (s) => `Chaque coup reçu inflige ${s.stacks} de plus avant l'armure${forTurns(s)}`,
    badge: (s) => `+${s.stacks}`,
    stacking: 'add',
    maxStacks: 3,
    modifyIncoming: (damage, s) => damage + s.stacks,
  },
  stunned: {
    name: 'Étourdi',
    polarity: 'negative',
    summary: 'Le porteur perd sa prochaine action.',
    describe: (s) => (s.stacks > 1 ? `Perd ses ${s.stacks} prochaines actions` : 'Perd sa prochaine action'),
    badge: (s) => `×${s.stacks}`,
    stacking: 'add',
    maxStacks: 1,
    skipsAction: true,
  },
  thorns: {
    name: 'Épines',
    look: { glow: 'rgba(132,204,22,0.85)' },
    polarity: 'positive',
    summary: "Chaque coup encaissé renvoie des dégâts directs à l'attaquant, tant que le statut dure.",
    describe: (s) => `Chaque coup encaissé renvoie ${plural(s.stacks, 'dégât')} à l'attaquant${forTurns(s)}`,
    badge: (s) => String(s.stacks),
    // La valeur d'épines compte plus que la durée (toujours courte) : c'est elle qui s'affiche.
    counter: 'stacks',
    stacking: 'refresh',
    // Pas de `spentOnReaction` : contre une Furie des vents, les deux coups sont punis (voulu, 0.29.0).
    reactions: { hurt: (s) => [{ type: 'damage', amount: s.stacks, target: 'opponent' }] },
  },
  ward: {
    name: 'Garde sacrée',
    polarity: 'positive',
    summary: 'Bloque les prochains malus posés sur le porteur.',
    describe: (s) => (s.stacks > 1 ? `Bloque les ${s.stacks} prochains malus` : 'Bloque le prochain malus'),
    badge: (s) => `×${s.stacks}`,
    stacking: 'add',
    wards: { polarity: 'negative' },
  },
  lifesteal: {
    name: 'Vol de vie',
    look: { glow: 'rgba(225,29,72,0.85)' },
    polarity: 'positive',
    summary: 'Le prochain coup du porteur lui rend autant de PV qu’il en retire ; esquivé, il ne rend rien.',
    describe: () => "Son prochain coup lui rend les PV qu'il retire (perdu si le coup est esquivé)",
    badge: () => '×1',
    stacking: 'refresh',
    maxStacks: 1,
    drainsHit: true,
  },
  windFury: {
    name: 'Furie des vents',
    look: { glow: 'rgba(186,230,253,0.95)' },
    polarity: 'positive',
    summary: 'À sa prochaine action, le porteur frappe deux fois ; chaque coup est résolu à part.',
    describe: (s) => `Frappe deux fois à sa prochaine action, chaque coup résolu à part${forTurns(s)}`,
    badge: () => '×2',
    stacking: 'refresh',
    maxStacks: 1,
    expiresAt: 'turnEnd',
    extraStrikes: 1,
  },
  evasion: {
    name: 'Esquive améliorée',
    look: { glow: 'rgba(165,243,252,0.8)', opacity: 0.45 },
    polarity: 'positive',
    summary: "Le prochain coup reçu est esquivé à coup sûr. Sans durée : elle attend ce coup, même si l'adversaire sacrifie les siens (jet de 1 à 3).",
    describe: (s) => `Esquive à coup sûr le prochain coup reçu${forTurns(s)}`,
    badge: () => '100 %',
    stacking: 'refresh',
    maxStacks: 1,
    forcesDodge: true,
  },

  /* Humains et hommes-lézards (0.30.0). */
  fear: {
    name: 'Peur',
    look: { glow: 'rgba(148,163,184,0.7)', motion: 'tremble' },
    polarity: 'negative',
    summary: 'Le porteur, terrifié, perd sa prochaine action.',
    describe: () => 'Terrifié : perd sa prochaine action',
    badge: () => '×1',
    stacking: 'add',
    maxStacks: 1,
    skipsAction: true,
  },
  coinFlip: {
    name: 'Pile ou face',
    look: { glow: 'rgba(250,204,21,0.85)' },
    polarity: 'positive',
    summary: 'À sa prochaine action, le porteur lance une pièce au lieu de son dé : pile, 15 dégâts directs ; face, rien.',
    describe: () => "À sa prochaine action, lance une pièce au lieu de son dé : pile, l'adversaire perd 15 PV ; face, rien",
    badge: () => '15',
    stacking: 'refresh',
    maxStacks: 1,
    coinToss: { damage: 15 },
  },
  luckyStrike: {
    name: 'Coup de chance',
    look: { glow: 'rgba(52,211,153,0.85)', dieColor: '#34d399' },
    polarity: 'positive',
    summary: 'À sa prochaine action, le porteur lance un d6 en plus de son dé : deux coups, résolus à part.',
    describe: () => 'À sa prochaine action, lance un d6 en plus de son dé : deux coups, résolus à part',
    badge: () => '+d6',
    stacking: 'refresh',
    maxStacks: 1,
    extraStrikes: 1,
    // d6 depuis la 0.36.5 : un d3 tombait toujours sur 1, 2 ou 3 et ne frappait jamais (valeur nette +0,7 à +2,7)
    extraDie: 6,
  },

  /* Paladin (0.31.0). */
  riposte: {
    name: 'Riposte',
    look: { glow: 'rgba(253,230,138,0.9)' },
    polarity: 'positive',
    summary: "Le prochain coup qui touche le porteur lui renvoie la moitié des dégâts. Sans durée : elle attend ce coup, même si l'adversaire sacrifie les siens (jet de 1 à 3).",
    describe: (s) => `Le prochain coup encaissé renvoie la moitié de ses dégâts à l'attaquant${forTurns(s)}`,
    badge: () => '50 %',
    stacking: 'refresh',
    maxStacks: 1,
    reflectsHit: 0.5,
  },
  retribution: {
    name: 'Rétribution',
    polarity: 'positive',
    summary: 'Trois jauges stockent les dégâts des trois derniers coups reçus ; sur un 1, le paladin les relâche d’un coup.',
    describe: (s) => `Jauges : ${(s.slots ?? []).join(' · ') || 'vides'} (${s.stacks} dégâts à relâcher sur un 1)`,
    badge: (s) => String(s.stacks),
    stacking: 'refresh',
    fillsOnHurt: { slots: 3 },
  },

  /* Auras : bonus permanents (sans durée) posés sur un 3 au dé, pour le reste du combat. */
  poisonAura: {
    name: 'Aura de poison',
    look: { aura: 'rgba(74,222,128,0.55)' },
    polarity: 'positive',
    summary: "Au début de chaque tour du porteur, son adversaire perd des PV, avant l'action. Permanente.",
    describe: (s) => `Au début de chacun de ses tours, l'adversaire perd ${plural(s.stacks, 'PV')} (dégâts directs), pour le reste du combat`,
    badge: (s) => String(s.stacks),
    stacking: 'add',
    onTurnStart: (s) => [{ type: 'damage', amount: s.stacks, target: 'opponent' }],
  },
  powerAura: {
    name: 'Aura de puissance',
    look: { aura: 'rgba(251,146,60,0.55)' },
    polarity: 'positive',
    summary: "Chaque coup du porteur inflige 2 dégâts de plus par charge, avant l'armure. Permanente.",
    describe: (s) => `Ses coups infligent ${2 * s.stacks} de plus avant l'armure, pour le reste du combat`,
    badge: (s) => `+${2 * s.stacks}`,
    stacking: 'add',
    modifyOutgoing: (damage, s) => damage + 2 * s.stacks,
  },
  intimidationAura: {
    name: "Aura d'intimidation",
    look: { aura: 'rgba(185,28,28,0.6)' },
    polarity: 'positive',
    summary: "Les coups de l'adversaire du porteur infligent 2 dégâts de moins par charge, avant l'armure. Permanente.",
    describe: (s) => `Les coups de l'adversaire lui infligent ${2 * s.stacks} de moins avant l'armure, pour le reste du combat`,
    badge: (s) => `−${2 * s.stacks}`,
    stacking: 'add',
    modifyIncoming: (damage, s) => damage - 2 * s.stacks,
  },
  precisionAura: {
    name: 'Aura de précision',
    look: { aura: 'rgba(250,204,21,0.5)' },
    polarity: 'positive',
    summary: 'Le multiplicateur de critique du porteur gagne +1 par charge. Permanente.',
    describe: (s) => `Ses critiques gagnent +${s.stacks} au multiplicateur (×2 devient ×${2 + s.stacks}), pour le reste du combat`,
    badge: (s) => `+${s.stacks}`,
    stacking: 'add',
    modifyStats: (stats, s) => ({ ...stats, critMultiplier: stats.critMultiplier + s.stacks }),
  },
  immunityAura: {
    name: "Aura d'immunité",
    look: { aura: 'rgba(253,224,71,0.55)' },
    polarity: 'positive',
    summary: 'Plus aucun malus ne peut être posé sur le porteur, jusqu’à la fin du combat. Permanente, non cumulable.',
    describe: () => 'Aucun malus ne peut plus lui être posé, pour le reste du combat',
    badge: () => '∞',
    stacking: 'refresh',
    maxStacks: 1,
    immune: 'negative',
  },
  holyAura: {
    name: 'Aura de sainteté',
    look: { aura: 'rgba(254,243,199,0.6)' },
    polarity: 'positive',
    summary: 'Le porteur regagne 2 PV par charge à la fin de chacun de ses tours. Permanente.',
    describe: (s) => `Regagne ${plural(2 * s.stacks, 'PV')} à la fin de chacun de ses tours, pour le reste du combat`,
    badge: (s) => `+${2 * s.stacks}`,
    stacking: 'add',
    onTurnEnd: (s) => [{ type: 'heal', amount: 2 * s.stacks }],
  },
  decoctionAura: {
    name: 'Aura de décoction',
    look: { aura: 'rgba(163,230,53,0.5)' },
    polarity: 'positive',
    summary: `Chaque coup qui touche empoisonne la cible : ${DECOCTION_POISON} charges de poison par charge d’aura. Permanente.`,
    describe: (s) => `Chaque coup qui touche pose ${plural(DECOCTION_POISON * s.stacks, 'charge')} de poison ; l'aura dure tout le combat`,
    badge: (s) => `+${DECOCTION_POISON * s.stacks}`,
    stacking: 'add',
    // Poison qui s'estompe (0.36.4) : voir EQUILIBRAGE.md pour la valeur
    reactions: { hit: (s) => [{ type: 'applyStatus', status: 'poison', stacks: DECOCTION_POISON * s.stacks, target: 'opponent' }] },
  },

  /* Ogre (0.35.0) : il n'a aucune compétence, un 1, un 2 ou un 3 le laisse planté là. */
  waiting: {
    name: 'Attente',
    polarity: 'negative',
    summary: "Le porteur n'a rien compris à son propre jet : il ne frappe pas et attend son prochain tour.",
    describe: () => "N'a pas frappé ce tour-ci : il attend son prochain jet",
    badge: () => '…',
    stacking: 'refresh',
    maxStacks: 1,
    // Retombe au début de son tour suivant, juste avant son nouveau jet
    expiresAt: 'turnStart',
  },

  /* Druide (0.35.0). */
  barkSkin: {
    name: 'Écorce épaisse',
    polarity: 'positive',
    summary: "Une écorce qui absorbe des dégâts après l'armure, puis s'effrite. Se cumule.",
    describe: (s) => `Absorbe encore ${plural(s.stacks, 'point')} de dégâts, puis s'effrite`,
    badge: (s) => String(s.stacks),
    stacking: 'add',
    shield: true,
  },
  firefly: {
    name: 'Luciole',
    look: { motion: 'fireflies' },
    polarity: 'negative',
    summary: "Des lucioles trahissent le porteur : il ne peut plus esquiver, et chaque coup reçu lui inflige 2 dégâts de plus, avant l'armure. Chaque coup qui le touche en chasse une (une charge).",
    describe: (s) => `Ne peut plus esquiver et subit +2 dégâts par coup ; ${s.stacks > 1 ? `ses ${s.stacks} prochains coups encaissés` : 'le prochain coup encaissé'} en chassent les lucioles`,
    badge: (s) => String(s.stacks),
    counter: 'stacks',
    stacking: 'add',
    modifyStats: (stats) => ({ ...stats, dodgeChance: 0 }),
    // +2 par coup, quel que soit le nombre de charges : chaque charge est déjà un coup
    modifyIncoming: (damage) => damage + 2,
    spentOnHurt: true,
  },
  rotAura: {
    name: 'Aura de pourriture',
    look: { aura: 'rgba(124,90,140,0.6)' },
    polarity: 'positive',
    summary: 'Chaque coup qui touche infecte la cible : 1 charge de pourriture par charge d’aura, qui ne s’en va plus. Permanente.',
    describe: (s) => `Chaque coup qui touche pose ${plural(s.stacks, 'charge')} de pourriture, pour le reste du combat`,
    badge: (s) => `+${s.stacks}`,
    stacking: 'add',
    reactions: { hit: (s) => [{ type: 'applyStatus', status: 'rot', stacks: s.stacks, target: 'opponent' }] },
  },
  rot: {
    name: 'Pourriture',
    polarity: 'negative',
    summary: "Fait perdre 1 PV par charge au début de chaque tour du porteur, en ignorant l'armure. Ne s'estompe pas : seule une purge l'enlève.",
    describe: (s) => `Perd ${plural(s.stacks, 'PV')} au début de chacun de ses tours, jusqu'à ce qu'on le purifie`,
    badge: (s) => String(s.stacks),
    stacking: 'add',
    onTurnStart: (s) => [{ type: 'damage', amount: s.stacks }],
  },
}

export const STATUS_IDS = Object.keys(STATUSES) as StatusId[]

/** Une aura de personnage (posée sur un 3 au dé), reconnue à sa couleur d'aura (`look.aura`). */
export const isAura = (id: StatusId) => STATUSES[id].look?.aura !== undefined

/** Le nombre à afficher sur l'icône d'un état (voir `StatusDef.counter`), ou null s'il n'y a rien à compter. */
export function statusCounter(s: Status): { value: number; unit: 'stacks' | 'turns' } | null {
  const mode = STATUSES[s.id].counter ?? 'auto'
  if (mode === 'turns' || (mode === 'auto' && s.turns !== undefined))
    return s.turns === undefined ? null : { value: s.turns, unit: 'turns' }
  return { value: s.stacks, unit: 'stacks' }
}

/** Met la première lettre en minuscule, pour insérer une description dans une phrase (garde « PV »). */
export const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

export const POLARITY_STYLE: Record<Polarity, { chip: string; glow: string; label: string }> = {
  positive: {
    chip: 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100',
    glow: 'rgba(52,211,153,0.35)',
    label: 'Bonus',
  },
  negative: {
    chip: 'border-red-400/70 bg-red-500/15 text-red-100',
    glow: 'rgba(248,113,113,0.4)',
    label: 'Malus',
  },
}

/** Règle de durée commune à tous les statuts (affichée une fois, pas sur chaque statut). */
export const STATUS_DURATION_RULE =
  "Un statut dure jusqu'à épuisement de ses charges, ou pendant le nombre de tours du porteur fixé par l'effet qui le pose. La durée est décomptée au début de chacun de ses tours (à la fin pour certains statuts), mais jamais à la fin du tour où le statut a été posé."

/**
 * Règles d'un statut en phrases, déduites de sa définition (crochets, cumul, plafond) :
 * le compendium et la documentation restent fidèles au code sans texte écrit à la main.
 */
export function statusRules(id: StatusId): string[] {
  const def = STATUSES[id]
  const rules: string[] = []
  if (def.forcesDodge) rules.push('Le prochain coup reçu est esquivé à coup sûr, sans tirage ; une charge par esquive.')
  if (def.drainsHit)
    rules.push(
      "Le prochain coup porté rend au porteur les PV réellement retirés ; une charge par coup. Un coup esquivé consomme la charge sans rien rendre ; un jet de compétence (1, 2, 3) la laisse en place.",
    )
  if (def.extraStrikes)
    rules.push(
      `À sa prochaine action, le porteur frappe ${def.extraStrikes + 1} fois${def.extraDie ? ` (le coup en plus avec un d${def.extraDie})` : ''} : dé, esquive, critique et compétences de chaque coup sont résolus à part. Le statut est consommé au début de l'action.`,
    )
  if (def.coinToss)
    rules.push(
      `À sa prochaine action, le porteur lance une pièce au lieu de son dé : pile, ${def.coinToss.damage} dégâts directs à l'adversaire ; face, rien. Le statut est consommé.`,
    )
  if (def.forcesCrit)
    rules.push('Force le critique du prochain coup qui touche ; une charge par coup. Une esquive ne la consomme pas.')
  if (def.shield)
    rules.push("Absorbe autant de points que de charges, après l'armure, sans faire descendre un coup sous 1 dégât.")
  if (def.onTurnStart) rules.push('Agit au début de chaque tour du porteur, avant son attaque.')
  if (def.modifyOutgoing) rules.push("Modifie les dégâts du porteur avant l'armure ; un coup garde au moins 1 dégât.")
  if (def.modifyStats)
    rules.push('Modifie les caractéristiques du porteur, bornées par le moteur (armure ≥ 0, chances entre 0 et 100 %).')
  if (def.onTurnEnd) rules.push('Agit à la fin de chaque tour du porteur, après son action.')
  if (def.decays) rules.push("S'estompe : perd une charge chaque fois qu'il agit, et disparaît à 0.")
  if (def.modifyIncoming) rules.push("Modifie les dégâts reçus par le porteur avant l'armure ; un coup garde au moins 1 dégât.")
  if (def.skipsAction) rules.push('Le porteur perd son action ; une charge par tour perdu.')
  for (const trigger of Object.keys(def.reactions ?? {}) as Trigger[])
    rules.push(
      `Réagit ${lowerFirst(TRIGGERS[trigger].label)}${def.spentOnReaction ? ', une seule fois, puis disparaît' : ''}, sans déclencher d'autre réaction en chaîne.`,
    )
  if (def.immune)
    rules.push(`Aucun ${def.immune === 'negative' ? 'malus' : 'bonus'} ne peut être posé sur le porteur ; l'immunité ne s'use pas.`)
  if (def.reflectsHit)
    rules.push(`Le prochain coup qui touche le porteur lui renvoie ${Math.round(def.reflectsHit * 100)} % des PV retirés, en dégâts directs ; une charge.`)
  if (def.fillsOnHurt)
    rules.push(`Chaque coup qui touche le porteur range ses dégâts dans une des ${def.fillsOnHurt.slots} jauges (la plus ancienne cède sa place) ; relâchées d'un coup par la compétence du porteur.`)
  if (def.wards)
    rules.push(
      `Bloque la pose ${def.wards.polarity === 'negative' ? 'des malus' : def.wards.polarity === 'positive' ? 'des bonus' : 'de certains statuts'} sur le porteur ; une charge par blocage.`,
    )
  if (def.opposes)
    rules.push(`S'oppose à ${STATUSES[def.opposes].name} : leurs charges s'annulent une à une.`)
  if (def.expiresAt === 'turnEnd') rules.push('Sa durée se décompte à la fin des tours du porteur.')
  rules.push(
    def.stacking === 'add'
      ? 'Cumulable : une nouvelle application ajoute ses charges, la durée garde la plus longue.'
      : "Non cumulable : une nouvelle application remplace l'existante (charges et durée).",
  )
  if (def.maxStacks !== undefined) rules.push(`Plafonné à ${def.maxStacks} charges.`)
  return rules
}

/* ---------- Manipulation (immuable) d'une liste de statuts ---------- */

export const findStatus = (list: readonly Status[], id: StatusId) => list.find((s) => s.id === id)

export const stacksOf = (list: readonly Status[], id: StatusId) => findStatus(list, id)?.stacks ?? 0

/** Applique un statut selon sa règle de cumul ; l'ordre d'application est conservé. */
export function applyStatus(list: readonly Status[], added: Status): Status[] {
  if (added.stacks <= 0) return [...list]
  const cap = STATUSES[added.id].maxStacks ?? Infinity
  const existing = findStatus(list, added.id)
  if (!existing) return [...list, { ...added, stacks: Math.min(added.stacks, cap) }]
  const merged: Status =
    STATUSES[added.id].stacking === 'add'
      ? {
          id: added.id,
          stacks: Math.min(existing.stacks + added.stacks, cap),
          turns:
            existing.turns === undefined || added.turns === undefined
              ? undefined
              : Math.max(existing.turns, added.turns),
        }
      : { ...added, stacks: Math.min(added.stacks, cap) }
  if (merged.turns === undefined) delete merged.turns
  return list.map((s) => (s.id === added.id ? merged : s))
}

/** Issue de la pose d'un statut (voir `resolveApplication`). */
export type ApplicationOutcome =
  /** Posé, éventuellement après annulation partielle par l'opposé */
  | { kind: 'applied'; stacks: number; cancelled?: { status: StatusId; stacks: number } }
  /** Entièrement absorbé par le statut opposé */
  | { kind: 'cancelled'; cancelled: { status: StatusId; stacks: number } }
  /** Bloqué : immunité du personnage, ou garde (qui perd une charge) */
  | { kind: 'blocked'; by: 'immunity' | StatusId }

/**
 * Pose un statut en appliquant, dans cet ordre, les règles de résolution :
 * 1. immunité du personnage → bloqué ;
 * 2. garde (`wards`) d'un statut du porteur → bloqué, la garde perd une charge ;
 * 3. opposition (`opposes`) → les charges s'annulent une à une avec le statut opposé ;
 * 4. cumul (`stacking`) et plafond (`maxStacks`) pour ce qui reste.
 */
export function resolveApplication(
  list: readonly Status[],
  added: Status,
  immunities: readonly StatusId[] = [],
): { list: Status[]; outcome: ApplicationOutcome } {
  const def = STATUSES[added.id]
  if (immunities.includes(added.id)) return { list: [...list], outcome: { kind: 'blocked', by: 'immunity' } }
  // Immunité d'un statut (Aura d'immunité) : bloque sans s'user
  const immune = list.find((s) => STATUSES[s.id].immune === def.polarity)
  if (immune) return { list: [...list], outcome: { kind: 'blocked', by: immune.id } }
  const ward = list.find((s) => {
    const w = STATUSES[s.id].wards
    return w && (w.polarity === def.polarity || w.statuses?.includes(added.id))
  })
  if (ward) return { list: consumeStatus(list, ward.id, 1), outcome: { kind: 'blocked', by: ward.id } }

  let current: Status[] = [...list]
  let stacks = added.stacks
  let cancelled: { status: StatusId; stacks: number } | undefined
  const opposite = def.opposes ? findStatus(current, def.opposes) : undefined
  if (opposite) {
    const n = Math.min(stacks, opposite.stacks)
    current = consumeStatus(current, opposite.id, n)
    stacks -= n
    cancelled = { status: opposite.id, stacks: n }
    if (stacks <= 0) return { list: current, outcome: { kind: 'cancelled', cancelled } }
  }
  const before = stacksOf(current, added.id)
  current = applyStatus(current, { ...added, stacks })
  const gained = stacksOf(current, added.id) - (def.stacking === 'add' ? before : 0)
  return { list: current, outcome: { kind: 'applied', stacks: Math.max(gained, 0), ...(cancelled && { cancelled }) } }
}

/** Retire des charges ; le statut disparaît à 0. */
export function consumeStatus(list: readonly Status[], id: StatusId, amount: number): Status[] {
  return list.flatMap((s) => {
    if (s.id !== id) return [s]
    const left = s.stacks - amount
    return left > 0 ? [{ ...s, stacks: left }] : []
  })
}

export const removeStatuses = (list: readonly Status[], polarity: Polarity) =>
  list.filter((s) => STATUSES[s.id].polarity !== polarity)

/** Décompte d'un début de tour : renvoie les statuts restants et ceux qui expirent. */
export function tickDurations(
  list: readonly Status[],
  phase: 'turnStart' | 'turnEnd' = 'turnStart',
): { kept: Status[]; expired: StatusId[] } {
  const kept: Status[] = []
  const expired: StatusId[] = []
  for (const s of list) {
    if (s.turns === undefined || (STATUSES[s.id].expiresAt ?? 'turnStart') !== phase) kept.push(s)
    else if (s.turns > 1) kept.push({ ...s, turns: s.turns - 1 })
    else expired.push(s.id)
  }
  return { kept, expired }
}
