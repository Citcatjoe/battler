import type { CharacterStats } from './character'
import { triggerText, type Effect, type Trigger } from './events'
import type { RuleId } from './rules'

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
 * - Un statut décompté en fin de tour ne l'est pas à la fin du tour où il a été posé (aucun statut en jeu ne
 *   s'en sert aujourd'hui : règle « Durée » du compendium).
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
  | 'frostAura'
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
  | 'firefly'
  | 'rotAura'
  | 'rot'
  | 'whistling'
  | 'falseNote'
  | 'melodiousAura'
  | 'bleed'
  | 'casting'
  | 'bearMight'
  | 'wildAura'

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
    /** Couleur des dés supplémentaires qu'il donne (Coup de chance) */
    dieColor?: string
  }

  /* --- Règles. Chaque crochet est facultatif ; le moteur les appelle à un moment fixe. --- */

  /** Modifie les stats effectives du porteur (bornées ensuite par le moteur) */
  modifyStats?: (stats: CombatStats, s: Status) => CombatStats
  /** Modifie les dégâts du porteur avant l'armure (le coup garde au moins 1) */
  modifyOutgoing?: (damage: number, s: Status) => number
  /**
   * Modifie les dégâts FINAUX des coups du porteur : après l'armure et les boucliers, au moins 1 (Aura
   * mélodieuse, Fausse note). Contrairement à `modifyOutgoing`, ni l'armure ni l'intimidation ne le rognent.
   */
  modifyFinal?: (damage: number, s: Status) => number
  /** Le prochain coup qui touche est critique ; consomme une charge */
  forcesCrit?: boolean
  /** Le prochain coup reçu est esquivé à coup sûr ; consomme une charge par esquive */
  forcesDodge?: boolean
  /**
   * Vol de vie : réagit dans la fenêtre `hit` du porteur, à chaque coup qui touche (pile de Pile ou face comprise), en
   * lui rendant les PV retirés ; une charge par réaction. Un coup esquivé consomme la charge sans rien rendre.
   * Un jet remplacé (Furie des vents) ne porte pas de coup : la charge reste.
   */
  drainsHit?: boolean
  /** Coups supplémentaires à sa prochaine action (Coup de chance : des jets complets), chacun résolu à part */
  extraStrikes?: number
  /**
   * Charges de coups supplémentaires (0.46.0) : `all`, la prochaine action dépense toutes les charges
   * (`extraStrikes` coups par charge) ; `one`, chaque action en dépense une seule, les autres restent en réserve.
   * Sans ce champ : une seule charge, consommée en entier.
   */
  strikeCharges?: 'all' | 'one'
  /**
   * Coups supplémentaires instantanés (0.50.0, Furie des vents) : une charge gagnée pendant l'action
   * frappe dans cette même action, juste après le jet en cours, au lieu d'attendre l'action suivante.
   * Ce sont des coups de base bruts (0.69.0), chacun avec son dé : leur face ne déclenche aucune compétence, donc aucune
   * Furie en chaîne. Les reliques de face et la dorure, elles, lisent leur dé (2026-10-23).
   */
  instantStrikes?: boolean
  /**
   * Pile ou face (relation « modifie », règles v2) : le porteur lance aussitôt une pièce, juste après le coup qui a posé
   * le statut. Pile, ce coup compte double : l'adversaire perd à nouveau les PV que le coup lui a retirés (DP) ; face,
   * rien. Le statut est consommé. `headsTouches` : pile compte comme un coup qui touche (fenêtres `hit` du porteur et
   * `hurt` de l'adversaire) : tout ce qui réagit à un coup qui touche réagit (Aura de décoction, Épines, Saignement, Vol
   * de vie, Riposte, jauges de Rétribution).
   */
  coinToss?: { headsTouches?: boolean }
  /**
   * S'estompe : chaque fois qu'il agit (`onTurnStart`, `onTurnEnd` ou une réaction), le statut perd une
   * charge, et disparaît à 0. Une seule valeur dit à la fois sa force et ce qu'il lui reste (poison 3 : 3,
   * 2, puis 1 PV ; saignement 2 : 2 puis 1 PV, sur les deux prochains coups reçus). Il n'a donc pas de
   * durée en tours. La réaction agit d'abord, avec ses charges d'avant, puis la charge part.
   */
  decays?: boolean
  /** Bouclier : absorbe jusqu'à `stacks` points après l'armure, sans descendre sous 1 dégât ; s'use d'autant */
  shield?: boolean
  /** Effets appliqués au porteur au début de chacun de ses tours (phase 1) */
  onTurnStart?: (s: Status) => Effect[]
  /** Effets appliqués au porteur à la fin de chacun de ses tours (phase 3) */
  onTurnEnd?: (s: Status) => Effect[]
  /**
   * Son de ses dégâts quand il agit (`statusTick`), au lieu de Ronge : décision de l'utilisateur (2026-10-22,
   * `docs/SONS.md` § 8). Seul le Poison a le sien, le Grésillement.
   */
  tickSound?: 'fizz'
  /** Moment où la durée (`turns`) est décomptée : début (défaut) ou fin des tours du porteur */
  expiresAt?: 'turnStart' | 'turnEnd'
  /**
   * Une seule valeur (0.69.0, Brûlure) : posé sans durée, le statut dure autant de tours que de charges
   * (Brûlure 3 : 3 PV à la fin de ses 3 prochains tours). `validateRoster` refuse une durée en plus.
   */
  turnsFromStacks?: boolean
  /** Modifie les dégâts reçus par le porteur, avant l'armure (le coup garde au moins 1) */
  modifyIncoming?: (damage: number, s: Status) => number
  /** Immunité : aucun statut de cette polarité ne peut être posé sur le porteur (sans consommer de charge) */
  immune?: Polarity
  /**
   * Mécanisme (2026-10-21) : le statut porte une règle du personnage, pas un bonus ni un malus.
   * - `form` : statut de forme (0.73.0, druide), posé par le moteur quand le porteur prend la forme qui le déclare
   *   (`CharacterForm.statuses`) et retiré quand il la quitte ;
   * - `skill` : mécanisme d'une compétence, montré sur son sceau (jauges de Rétribution, Pile ou face, Furie des
   *   vents).
   * Aucune purge ne l'enlève ; aucune immunité, garde ni opposition ne bloque sa pose ; il ne compte ni comme
   * bonus ni comme malus reçu dans les statistiques. Sa place à l'écran en découle (`STATUS_PLACE`, states.ts).
   */
  mechanic?: 'form' | 'skill'
  /**
   * Riposte : réagit dans la fenêtre `hurt` du porteur, à chaque coup qui le touche (pile comprise), en renvoyant
   * cette part des PV retirés (dégâts directs, arrondis) à l'attaquant ; une charge par réaction
   */
  reflectsHit?: number
  /**
   * Jauges : chaque coup qui touche le porteur (pile comprise) y range ses PV retirés, dans sa fenêtre `hurt`
   * (`slots` jauges, la plus ancienne cède sa place). Le statut n'est rempli que si le personnage peut le
   * relâcher (effet `release`) ; encore vide, il se remplit après les autres réactions du porteur.
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
  /**
   * Le statut disparaît, toutes charges comprises, dès qu'un coup DU porteur touche (ex. Fausse note :
   * seul son prochain coup est affaibli). Un coup esquivé ne le consomme pas.
   */
  spentOnHit?: boolean
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

/** PV rendus par Sifflotement à chaque fin de tour, et dégâts retirés par charge de Fausse note (barde). */
export const WHISTLE_HEAL = 2
export const FALSE_NOTE = 5

/** Charges de poison posées par coup qui touche, par charge d'Aura de décoction. */
export const DECOCTION_POISON = 2

/**
 * Druide : ce que l'ours ajoute à chacun de ses coups (Force de l'ours), et par charge d'Aura sauvage.
 * +4 en 0.73.0, +3 en 0.76.0 : la compensation des trois éclairs de la Foudre (6 dégâts au lieu de 5).
 */
export const BEAR_MIGHT = 3
export const WILD_AURA_BONUS = 2

/** Plafond de charges de l'Aura de sainteté (0.42.0). */
const HOLY_CAP = 3

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
    describe: (s) => `Un bouclier de ${plural(s.stacks, 'point')} : absorbe les dégâts après l'armure (le coup garde au moins 1), puis disparaît`,
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
    onTurnStart: (s) => [{ type: 'damage', amount: s.stacks, source: 'poison' }],
    tickSound: 'fizz',
    opposes: 'regeneration',
  },
  /*
   * Saignement (0.68.0) : le pendant du Poison, qui compte les coups au lieu des tours. Chaque coup qui
   * touche le porteur rouvre la plaie ; plusieurs coups dans une action (Furie des vents, deux dés) la
   * vident d'un coup, une esquive ou une action perdue la laissent ouverte. Comme tout statut (règle 9 de
   * RESOLUTION, 2026-10-21), une plaie ouverte pendant un coup ne coule pas sur ce coup, et une plaie grossie y coule
   * de ses charges du début du coup : la plaie de Pourfendre coule dès le coup suivant qui touche le porteur.
   */
  bleed: {
    name: 'Saignement',
    look: { glow: 'rgba(220,38,38,0.85)' },
    polarity: 'negative',
    summary:
      "Chaque coup qui touche le porteur lui fait perdre autant de PV que de charges, en ignorant l'armure, puis perd une charge. Une seule valeur : les PV perdus au prochain coup qui le touche, qui baissent de 1 à chaque coup (2, 1). Une plaie ouverte pendant un coup ne coule pas sur ce coup : elle coule dès le coup suivant qui touche le porteur. Se cumule.",
    describe: (s) =>
      s.stacks > 1
        ? `Les coups qui le touchent lui font perdre ${plural(s.stacks, 'PV')} de plus, puis 1 de moins à chaque coup (${(s.stacks * (s.stacks + 1)) / 2} PV en tout)`
        : 'Le prochain coup qui le touche lui fait perdre 1 PV de plus, puis la plaie se referme',
    badge: (s) => String(s.stacks),
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    reactions: { hurt: (s) => [{ type: 'damage', amount: s.stacks, source: 'bleed' }] },
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

  /* Statuts de résolution (docs/RESOLUTION.md) : la Brûlure est en jeu (Feux follets) ; Vulnérable et Étourdi attendent un porteur. */
  burn: {
    name: 'Brûlure',
    polarity: 'negative',
    summary:
      'Fait perdre autant de PV que sa valeur à la fin de chaque tour du porteur, pendant autant de tours (Brûlure 3 : 3 PV à la fin de ses 3 prochains tours). Son médaillon compte les tours qui restent. Une nouvelle Brûlure remplace l’ancienne.',
    describe: (s) => `Perd ${plural(s.stacks, 'PV')} à la fin de chacun de ses tours${forTurns(s)}`,
    badge: (s) => String(s.stacks),
    // 0.69.0 (demande de l'utilisateur) : une seule valeur, comme le Poison et le Saignement ; la durée
    // suit les dégâts. Avant : deux valeurs posées à part (Feux follets : 3 PV, 3 tours). 2026-10-21 (audit S7) :
    // le médaillon montre les tours restants (3, 2, 1), les PV par tour restent dans l'infobulle.
    counter: 'turns',
    stacking: 'refresh',
    turnsFromStacks: true,
    onTurnEnd: (s) => [{ type: 'damage', amount: s.stacks, source: 'burn' }],
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
    name: 'Épines acérées',
    look: { glow: 'rgba(132,204,22,0.85)' },
    polarity: 'positive',
    summary: "Chaque coup encaissé fait saigner l'attaquant : 1 charge de Saignement par charge d'épines. Permanentes, elles se cumulent.",
    describe: (s) => `Chaque coup encaissé pose ${plural(s.stacks, 'charge')} de Saignement sur l'attaquant, pour le reste du combat`,
    badge: (s) => String(s.stacks),
    // 0.68.0 : les épines font saigner au lieu de renvoyer 1 dégât direct par charge (0.45.0). Le saignement
    // ne coule que quand le nain touche l'attaquant : la punition attend la riposte du porteur.
    counter: 'stacks',
    stacking: 'add',
    // Pas de `spentOnReaction` : contre une Furie des vents, chaque coup ouvre la plaie (voulu, 0.29.0).
    reactions: { hurt: (s) => [{ type: 'applyStatus', status: 'bleed', stacks: s.stacks, target: 'opponent' }] },
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
    summary: 'Chaque charge : le prochain coup du porteur qui touche (pile comprise) lui rend autant de PV qu’il en retire. Un coup esquivé consomme la charge sans rien rendre.',
    describe: (s) =>
      s.stacks > 1
        ? `Ses ${s.stacks} prochains coups lui rendent les PV qu'ils retirent (un coup esquivé use une charge)`
        : "Son prochain coup lui rend les PV qu'il retire (perdu si le coup est esquivé)",
    badge: (s) => `×${s.stacks}`,
    // 0.45.0 : deux charges par Vol de vie (deux coups drainés), au lieu d'une ; le compteur dit
    // combien de coups drainent encore. Avant : +3 à +4 points, et un « 1 » qui n'apprenait rien.
    stacking: 'add',
    maxStacks: 2,
    drainsHit: true,
  },
  windFury: {
    name: 'Furie des vents',
    look: { glow: 'rgba(186,230,253,0.95)' },
    polarity: 'positive',
    summary: 'Le jet qui la déclenche ne porte pas de coup : tout de suite, dans la même action, le porteur frappe deux fois, deux coups de base résolus à part, chacun avec son dé. Ce sont des coups bruts : leur face ne déclenche aucune compétence.',
    describe: () => 'Deux coups de base tout de suite, sans compétence',
    badge: () => '×2',
    // 0.50.0 (demande de l'utilisateur) : instantanée. Le 2 tombe, les deux coups partent dans la même
    // action, au lieu d'attendre la suivante (0.46.0 : en réserve). Le 2 lui-même ne frappe pas (relation « remplace »).
    // 0.69.0 (demande de l'utilisateur) : coups bruts. Avant, un tiers des coups de Furie tombaient sur
    // une compétence (36,5 %), et une Furie sur cinq en relançait une autre (SORTS.md § 15).
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    extraStrikes: 2,
    instantStrikes: true,
  },
  evasion: {
    name: 'Esquive améliorée',
    look: { glow: 'rgba(165,243,252,0.8)', opacity: 0.45 },
    polarity: 'positive',
    summary:
      "Le prochain coup reçu est esquivé à coup sûr, une charge par esquive. Se cumule : chaque charge esquive un coup de plus. Sans durée : elle attend ce coup, même si l'adversaire n'en porte pas (jet remplacé, tour perdu).",
    describe: (s) => (s.stacks > 1 ? `Esquive à coup sûr les ${s.stacks} prochains coups reçus${forTurns(s)}` : `Esquive à coup sûr le prochain coup reçu${forTurns(s)}`),
    badge: () => '100 %',
    // 2026-10-21 (demande de l'utilisateur) : cumulable, une charge par esquive. Avant : plafonnée à 1 (`refresh`).
    counter: 'stacks',
    stacking: 'add',
    forcesDodge: true,
  },

  /* Humains et hommes-lézards (0.30.0). */
  fear: {
    name: 'Peur',
    look: { glow: 'rgba(148,163,184,0.7)', motion: 'tremble' },
    polarity: 'negative',
    summary: 'Le porteur, terrifié, perd sa prochaine action.',
    describe: () => 'Perd sa prochaine action, terrifié',
    badge: () => '×1',
    // 2026-10-21 (audit S9) : non cumulable, plafonnée à 1 ; même comportement qu'un cumul plafonné à 1
    stacking: 'refresh',
    maxStacks: 1,
    skipsAction: true,
  },
  coinFlip: {
    name: 'Pile ou face',
    look: { glow: 'rgba(250,204,21,0.85)' },
    polarity: 'positive',
    summary: 'Le porteur lance aussitôt une pièce, juste après le coup qui l’a posée : pile, ce coup compte double, l’adversaire perd à nouveau les PV qu’il lui a retirés, en dégâts directs qui comptent comme un coup qui touche (tout ce qui réagit à un coup part : Aura de décoction, Épines, Saignement, Riposte, Vol de vie, jauges de Rétribution) ; face, rien.',
    describe: () => "Une pièce lancée aussitôt : pile, ce coup compte double (ses PV, à nouveau, comme un coup qui touche) ; face, rien",
    badge: () => '×2',
    stacking: 'refresh',
    mechanic: 'skill',
    maxStacks: 1,
    // 0.42.0 (audit des compétences, SORTS.md § 10) : pile à 20 au lieu de 15, et pile touche (l'Aura
    // de décoction empoisonne). Face reste vide : la dualité et sa mise en scène sonore sont voulues.
    // Avant : valeur nette de −4 à −5 points, parce que la pièce prend la place d'un jet de dé.
    // 2026-10-21 (demande de l'utilisateur) : la pièce part aussitôt, juste après le jet de 2 qui l'a posée,
    // au lieu de remplacer le dé de l'action suivante.
    // Règles v2, phase 5 bis (décision de l'utilisateur, 2026-10-23) : pile, ce coup ×2, au lieu de 10 dégâts fixes
    coinToss: { headsTouches: true },
  },
  luckyStrike: {
    name: 'Coup de chance',
    look: { glow: 'rgba(52,211,153,0.85)', dieColor: '#34d399' },
    polarity: 'positive',
    summary:
      'À sa prochaine action, le porteur lance un d6 de plus par charge, en plus de son dé : chacun est un jet complet, résolu à part (sa compétence, puis son coup de base). Se cumule.',
    describe: (s) =>
      s.stacks > 1
        ? `À sa prochaine action, lance ${s.stacks} d6 en plus de son dé : autant de jets complets en plus, chacun avec sa compétence et son coup de base`
        : 'À sa prochaine action, lance un d6 en plus de son dé : un jet complet de plus, avec sa compétence et son coup de base',
    badge: (s) => `+${s.stacks}d6`,
    // 0.50.0 (demande de l'utilisateur) : cumulable, un d6 par charge, toutes les charges à la prochaine action
    counter: 'stacks',
    stacking: 'add',
    extraStrikes: 1,
    strikeCharges: 'all',
    // Règles v2, phase 5 bis : le jet qui le pose ne frappe pas (relation « remplace ») ; chaque jet donné est complet
  },

  /* Paladin (0.31.0). */
  riposte: {
    name: 'Riposte',
    look: { glow: 'rgba(253,230,138,0.9)' },
    polarity: 'positive',
    summary:
      "Chaque charge : le prochain coup qui touche le porteur (pile comprise) renvoie à l'attaquant la moitié des PV retirés, arrondie au-dessus, en dégâts directs. Sans durée : elle attend ce coup, même si l'adversaire n'en porte pas (jet remplacé, tour perdu).",
    describe: (s) =>
      s.stacks > 1
        ? `Ses ${s.stacks} prochains coups encaissés renvoient chacun la moitié de leurs dégâts (arrondie au-dessus) à l'attaquant`
        : "Le prochain coup encaissé renvoie la moitié de ses dégâts (arrondie au-dessus) à l'attaquant",
    badge: () => '50 %',
    // 0.50.0 : deux charges par Riposte (deux coups renvoyés), comme le Vol de vie
    counter: 'stacks',
    stacking: 'add',
    maxStacks: 2,
    reflectsHit: 0.5,
  },
  retribution: {
    name: 'Rétribution',
    polarity: 'positive',
    summary:
      'Mécanisme de la compétence Rétribution : trois jauges stockent les dégâts des trois derniers coups qui touchent le paladin (pile comprise ; les dégâts directs ne comptent pas) ; sur un 1, il les relâche d’un coup. Ni bonus ni malus : aucune purge ne les vide.',
    describe: (s) => `Jauges : ${(s.slots ?? []).join(' · ') || 'vides'} (${s.stacks} dégâts à relâcher sur un 1)`,
    badge: (s) => String(s.stacks),
    stacking: 'refresh',
    mechanic: 'skill',
    fillsOnHurt: { slots: 3 },
  },

  /* Auras : bonus permanents (sans durée) posés sur un 3 au dé, pour le reste du combat. */
  frostAura: {
    name: 'Aura glaciale',
    look: { aura: 'rgba(147,197,253,0.6)' },
    polarity: 'positive',
    summary:
      "Au début de chacun de ses tours, le froid de la tombe pose 1 charge de Poison par charge d'aura sur l'adversaire. Le Poison perd une charge à chaque tour : une charge d'aura le fige à sa valeur. Permanente.",
    describe: (s) => `Au début de chacun de ses tours, ${plural(s.stacks, 'charge')} de Poison sur l'adversaire`,
    badge: (s) => `+${s.stacks}`,
    stacking: 'add',
    // 0.69.0 (choix de l'utilisateur, SORTS.md § 15) : elle pose du vrai Poison au lieu de dégâts directs
    // au début du tour adverse (0.45.0). Un seul statut, une seule règle : l'immunité le bloque, la
    // Régénération l'annule, une purge l'enlève, sans crochet propre. Cumulable, sans compensation.
    onTurnStart: (s) => [{ type: 'applyStatus', status: 'poison', stacks: s.stacks, target: 'opponent' }],
  },
  powerAura: {
    name: 'Aura de puissance',
    look: { aura: 'rgba(251,146,60,0.55)' },
    polarity: 'positive',
    summary: "Chaque coup du porteur inflige 2 dégâts de plus par charge, après le critique et avant l'armure. Permanente.",
    describe: (s) => `Ses coups infligent ${2 * s.stacks} de plus, après le critique et avant l'armure, pour le reste du combat`,
    badge: (s) => `+${2 * s.stacks}`,
    stacking: 'add',
    modifyOutgoing: (damage, s) => damage + 2 * s.stacks,
  },
  intimidationAura: {
    name: "Aura d'intimidation",
    look: { aura: 'rgba(185,28,28,0.6)' },
    polarity: 'positive',
    summary: "Les coups de l'adversaire du porteur infligent 2 dégâts de moins par charge, après le critique et avant l'armure. Permanente.",
    describe: (s) => `Les coups de l'adversaire lui infligent ${2 * s.stacks} de moins, après le critique et avant l'armure, pour le reste du combat`,
    badge: (s) => `−${2 * s.stacks}`,
    stacking: 'add',
    modifyIncoming: (damage, s) => damage - 2 * s.stacks,
  },
  precisionAura: {
    name: 'Aura de précision',
    look: { aura: 'rgba(250,204,21,0.5)' },
    polarity: 'positive',
    summary: 'Le multiplicateur de critique du porteur gagne +1 par charge. Permanente.',
    describe: (s) => `Son multiplicateur de critique gagne +${s.stacks}, pour le reste du combat`,
    badge: (s) => `+${s.stacks}`,
    stacking: 'add',
    modifyStats: (stats, s) => ({ ...stats, critMultiplier: stats.critMultiplier + s.stacks }),
  },
  immunityAura: {
    name: "Aura d'immunité",
    look: { aura: 'rgba(253,224,71,0.55)' },
    polarity: 'positive',
    summary:
      'Plus aucun malus ne peut être posé sur le porteur (ceux déjà là et les auras de l’adversaire agissent toujours), et son armure gagne 1, jusqu’à la fin du combat. Permanente, non cumulable.',
    describe: (s) => `Aucun malus ne peut plus être posé sur lui (les auras de l'adversaire agissent toujours), et son armure gagne ${s.stacks}, pour le reste du combat`,
    badge: () => '∞',
    stacking: 'refresh',
    maxStacks: 1,
    immune: 'negative',
    // 0.42.0 : +1 d'armure tant que l'aura est là. Seule, l'immunité coûtait des victoires (−2,7 à
    // −3,9 points) : peu d'adversaires posent des malus, et le 3 sacrifiait alors son coup.
    modifyStats: (stats, s) => ({ ...stats, armor: stats.armor + s.stacks }),
  },
  holyAura: {
    name: 'Aura de sainteté',
    look: { aura: 'rgba(254,243,199,0.6)' },
    polarity: 'positive',
    summary: `Le porteur regagne 2 PV par charge à la fin de chacun de ses tours (${HOLY_CAP} charges au plus). Permanente.`,
    describe: (s) => `Regagne ${plural(2 * s.stacks, 'PV')} à la fin de chacun de ses tours, pour le reste du combat`,
    badge: (s) => `+${2 * s.stacks}`,
    stacking: 'add',
    // 0.42.0 : plafond de charges (`HOLY_CAP`). Sans plafond, les soins s'empilaient et les combats
    // des prêtresses devenaient longs et joués d'avance (+42 points de valeur nette, 16 % de fins serrées).
    maxStacks: HOLY_CAP,
    onTurnEnd: (s) => [{ type: 'heal', amount: 2 * s.stacks }],
  },
  decoctionAura: {
    name: 'Aura de décoction',
    look: { aura: 'rgba(163,230,53,0.5)' },
    polarity: 'positive',
    summary: `Chaque coup qui touche (pile comprise) empoisonne la cible : ${DECOCTION_POISON} charges de Poison par charge d’aura. Permanente.`,
    describe: (s) => `Chaque coup qui touche pose ${plural(DECOCTION_POISON * s.stacks, 'charge')} de Poison, pour le reste du combat`,
    badge: (s) => `+${DECOCTION_POISON * s.stacks}`,
    stacking: 'add',
    // Poison qui s'estompe (0.36.4) : voir EQUILIBRAGE.md pour la valeur
    reactions: { hit: (s) => [{ type: 'applyStatus', status: 'poison', stacks: DECOCTION_POISON * s.stacks, target: 'opponent' }] },
  },

  /* Druide (0.35.0). */
  firefly: {
    name: 'Luciole',
    look: { motion: 'fireflies' },
    polarity: 'negative',
    summary: "Des lucioles trahissent le porteur : il ne peut plus esquiver (une esquive imposée passe quand même), et chaque coup reçu lui inflige 2 dégâts de plus, avant l'armure. Chaque coup qui le touche en chasse une (une charge).",
    // 0.50.0 : texte raccourci (l'audit le trouvait trop long)
    describe: (s) => `Ne peut plus esquiver, chaque coup reçu fait +2 ; ${s.stacks > 1 ? `${s.stacks} coups encaissés` : 'un coup encaissé'} les chassent`,
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
    onTurnStart: (s) => [{ type: 'damage', amount: s.stacks, source: 'rot' }],
  },

  /*
   * Druide (0.73.0, SORTS.md § 18) : un tour sur deux, l'homme lance un sort ; l'autre tour, la bête frappe.
   * Les deux règles de forme sont des mécanismes de forme (`mechanic: 'form'`), visibles dans l'en-tête. Règles v2,
   * phase 5 bis : l'homme frappe aussi, d'un coup de base magique (DM), sur lequel son sort se greffe ; l'ours, d'un coup
   * de base physique (DP).
   */
  casting: {
    name: 'Incantation',
    look: { glow: 'rgba(163,230,53,0.7)' },
    polarity: 'positive',
    summary: 'Sous forme humaine, chaque face du dé du druide lance un sort, qui se greffe sur son coup de base magique (DM).',
    describe: () => 'Chaque jet lance un sort, puis un coup magique',
    badge: () => 'Sort',
    // Une règle, pas une réserve : aucun nombre sur le médaillon (`turns` sans durée n'affiche rien)
    counter: 'turns',
    stacking: 'refresh',
    maxStacks: 1,
    mechanic: 'form',
    // Jusqu'à la 0.104.0, son dé devenait un d3 (trois sorts sur le 1, le 2 et le 3) ; depuis le d6 imprimé, chaque
    // face porte son sort (Foudre sur 1 à 3, Feux follets sur 4 à 6)
  },
  bearMight: {
    name: "Force de l'ours",
    look: { glow: 'rgba(180,83,9,0.7)' },
    polarity: 'positive',
    summary: `Sous forme d'ours, le druide ne lance aucun sort : son coup de base est physique (DP) et fait ${BEAR_MIGHT} de plus, après le critique et avant l'armure.`,
    describe: () => `Chaque coup fait +${BEAR_MIGHT}, après le critique et avant l'armure`,
    badge: () => `+${BEAR_MIGHT}`,
    counter: 'turns',
    stacking: 'refresh',
    maxStacks: 1,
    mechanic: 'form',
    modifyOutgoing: (damage) => damage + BEAR_MIGHT,
  },
  wildAura: {
    name: 'Aura sauvage',
    look: { aura: 'rgba(180,83,9,0.55)' },
    polarity: 'positive',
    summary: `Chaque coup du porteur fait ${WILD_AURA_BONUS} de plus par charge, après le critique et avant l'armure : posée par l'homme, elle sert l'ours, le seul qui frappe. Permanente.`,
    describe: (s) => `Ses coups font +${WILD_AURA_BONUS * s.stacks}, après le critique et avant l'armure, pour le reste du combat`,
    badge: (s) => `+${WILD_AURA_BONUS * s.stacks}`,
    stacking: 'add',
    modifyOutgoing: (damage, s) => damage + WILD_AURA_BONUS * s.stacks,
  },

  /* Barde (0.41.0) : deux dés, des compétences sur les doubles. */
  whistling: {
    name: 'Sifflotement',
    polarity: 'positive',
    summary: `Le porteur regagne ${WHISTLE_HEAL} PV à la fin de chacun de ses tours, puis perd une charge : une charge par tour. Se cumule (les tours s'ajoutent).`,
    describe: (s) => `Regagne ${WHISTLE_HEAL} PV à la fin de chacun de ses tours, encore ${plural(s.stacks, 'tour')} (${WHISTLE_HEAL * s.stacks} PV en tout)`,
    badge: (s) => `+${WHISTLE_HEAL * s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    onTurnEnd: () => [{ type: 'heal', amount: WHISTLE_HEAL }],
  },
  falseNote: {
    name: 'Fausse note',
    polarity: 'negative',
    summary: `Le prochain coup du porteur qui touche fait ${FALSE_NOTE} dégâts de moins par charge, retirés en dernier, après l'armure (au moins 1 dégât). Puis la Fausse note s'oublie. Se cumule.`,
    describe: (s) => `Son prochain coup qui touche fait ${FALSE_NOTE * s.stacks} dégâts de moins (au moins 1), puis la note s'oublie`,
    badge: (s) => `−${FALSE_NOTE * s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    modifyFinal: (damage, s) => damage - FALSE_NOTE * s.stacks,
    spentOnHit: true,
  },
  melodiousAura: {
    name: 'Aura mélodieuse',
    look: { aura: 'rgba(196,181,253,0.55)' },
    polarity: 'positive',
    // 0.45.0 : textes sans le jargon « dégâts finaux » (note de l'utilisateur : description peu claire)
    summary:
      "Chaque coup du porteur qui touche fait 1 dégât de plus par charge. Le bonus s'ajoute en dernier, après l'armure et les boucliers : rien ne le réduit. Permanente, se cumule.",
    describe: (s) => `Chacun de ses coups qui touche fait +${s.stacks}, ajouté après l'armure : rien ne le réduit (se cumule)`,
    badge: (s) => `+${s.stacks}`,
    stacking: 'add',
    modifyFinal: (damage, s) => damage + s.stacks,
  },
}

export const STATUS_IDS = Object.keys(STATUSES) as StatusId[]

/**
 * L'état fait-il perdre des PV à son porteur à chaque tour (Poison, Brûlure, Pourriture) ? Lu dans ses
 * règles (`onTurnStart`, `onTurnEnd`). Son médaillon a alors un bord en pointillés (0.52.1).
 */
export function hurtsEachTurn(id: StatusId): boolean {
  const def = STATUSES[id]
  const probe: Status = { id, stacks: 1 }
  return [def.onTurnStart?.(probe), def.onTurnEnd?.(probe)].some((effects) =>
    (effects ?? []).some((e) => e.type === 'damage' && (e.target === undefined || e.target === 'self')),
  )
}

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
    chip: 'border-good/70 bg-good/15 text-good',
    glow: 'rgba(52,211,153,0.35)',
    label: 'Bonus',
  },
  negative: {
    chip: 'border-bad/70 bg-bad/15 text-bad',
    glow: 'rgba(248,113,113,0.4)',
    label: 'Malus',
  },
}

/** Une phrase de la fiche d'un statut, et la règle commune qu'elle applique (une pastille qui y mène). */
export interface RuleLine {
  text: string
  rule?: RuleId
}

/**
 * Ce que fait un statut, en phrases déduites de sa définition (crochets) : le compendium reste fidèle au code
 * sans texte écrit à la main. Rangées comme sa fiche les montre :
 * - `effect` : ce que le statut fait ;
 * - `consumption` : comment il s'use ou s'éteint ;
 * - `stacking` et `maxStacks` : son cumul, qui renvoie aux règles communes (section « Règles », rules.ts),
 *   écrites une seule fois au lieu d'être répétées sur chaque statut. Absent pour un mécanisme (`mechanic`) :
 *   il ne se pose pas comme un statut ;
 * - `lifetime` : la règle de vie qui le concerne, « Durée » s'il peut avoir une durée, « Auras » pour une aura.
 * L'opposition à un autre statut n'est pas ici : c'est une interaction (catalog.ts, `statusLinks`).
 */
export interface StatusRuleSections {
  effect: RuleLine[]
  consumption: RuleLine[]
  stacking?: 'stacking-add' | 'stacking-refresh'
  maxStacks?: number
  lifetime?: 'duration' | 'auras'
}

export function statusRuleSections(id: StatusId): StatusRuleSections {
  const def = STATUSES[id]
  const effect: RuleLine[] = []
  const consumption: RuleLine[] = []
  const say = (list: RuleLine[], text: string, rule?: RuleId) => list.push(rule ? { text, rule } : { text })
  if (def.forcesDodge) say(effect, 'Le prochain coup reçu est esquivé à coup sûr, sans tirage ; une charge par esquive.', 'dodge')
  if (def.drainsHit)
    say(
      effect,
      'Le prochain coup du porteur qui touche (pile comprise) lui rend les PV réellement retirés ; une charge par coup. Un coup esquivé consomme la charge sans rien rendre ; un jet remplacé (sans coup) la laisse en place.',
    )
  if (def.extraStrikes && def.instantStrikes)
    say(
      effect,
      `Tout de suite, dans la même action, le porteur frappe ${def.extraStrikes} fois : autant de coups de base, chacun avec son dé, esquive et critique résolus à part. Coups bruts : leur face ne déclenche aucune compétence.`,
      'hit-relations',
    )
  else if (def.extraStrikes) {
    say(
      effect,
      `À sa prochaine action, le porteur lance ${def.extraStrikes === 1 ? 'un d6' : `${def.extraStrikes} d6`} de plus${def.strikeCharges ? ' par charge' : ''}, en plus de son dé : autant de jets complets, chacun résolu à part (sa compétence, puis son coup de base, esquive et critique).`,
      'die',
    )
    say(
      consumption,
      def.strikeCharges === 'all'
        ? 'Toutes ses charges partent à cette action.'
        : def.strikeCharges === 'one'
          ? 'Une charge par action ; les autres restent en réserve.'
          : "Consommé en entier au début de l'action.",
    )
  }
  if (def.coinToss)
    say(
      effect,
      `Le porteur lance aussitôt une pièce, juste après le coup qui a posé le statut : pile, ce coup compte double, l'adversaire perd à nouveau les PV qu'il lui a retirés, en dégâts directs${def.coinToss.headsTouches ? ' qui comptent comme un coup qui touche (tout ce qui réagit quand il touche ou quand l’adversaire encaisse un coup part)' : ''} ; face, rien. Le statut est consommé.`,
      'direct-damage',
    )
  if (def.forcesCrit) say(effect, 'Force le critique du prochain coup qui touche ; une charge par coup. Une esquive ne la consomme pas.', 'crit')
  if (def.shield) say(effect, "Absorbe autant de points que de charges, après l'armure, sans faire descendre un coup sous 1 dégât.", 'shields')
  if (def.onTurnStart) say(effect, 'Agit au début de chaque tour du porteur, avant son action.', 'phases')
  if (def.modifyOutgoing) say(effect, "Modifie les dégâts des coups du porteur, après le critique et avant l'armure ; un coup garde au moins 1 dégât.", 'modifiers')
  if (def.modifyFinal)
    say(effect, "Modifie les dégâts finaux des coups du porteur, après l'armure et les boucliers ; un coup garde au moins 1 dégât.", 'final-damage')
  if (def.modifyStats) {
    // Ce que le statut change, lu sur des stats d'essai : chaque stat touchée renvoie à sa règle
    const probe: CombatStats = { attackMin: 5, attackMax: 7, armor: 1, dodgeChance: 0.5, critChance: 0.5, critMultiplier: 2 }
    const changed = def.modifyStats(probe, { id, stacks: 1 })
    const lines: [keyof CombatStats, string, RuleId][] = [
      ['attackMin', "Change l'attaque du porteur.", 'base-hit'],
      ['armor', "Change l'armure du porteur (jamais sous 0).", 'armor'],
      ['dodgeChance', "Change sa chance d'esquive (entre 0 et 100 %).", 'dodge'],
      ['critChance', 'Change sa chance de critique (entre 0 et 100 %).', 'crit'],
      ['critMultiplier', 'Change son multiplicateur de critique.', 'crit'],
    ]
    for (const [key, text, rule] of lines) if (changed[key] !== probe[key]) say(effect, text, rule)
  }
  if (def.onTurnEnd) say(effect, 'Agit à la fin de chaque tour du porteur, après son action.', 'phases')
  if (def.modifyIncoming) say(effect, "Modifie les dégâts des coups reçus par le porteur, après le critique et avant l'armure ; un coup garde au moins 1 dégât.", 'modifiers')
  if (def.skipsAction) say(effect, 'Le porteur perd son action ; une charge par tour perdu.', 'phases')
  for (const [trigger, react] of Object.entries(def.reactions ?? {}) as [Trigger, (s: Status) => Effect[]][]) {
    const hurts = react({ id, stacks: 1 }).some((e) => e.type === 'damage')
    say(
      effect,
      `Réagit ${lowerFirst(triggerText(trigger).label)}${def.spentOnReaction ? ', une seule fois, puis disparaît' : ''} ; sans réaction en chaîne. Posé pendant un coup, il ne réagit pas à ce coup : il agit dès le coup suivant (renforcé pendant un coup, il y réagit avec ses charges du début du coup).`,
      hurts ? 'direct-damage' : undefined,
    )
  }
  if (def.immune)
    say(
      effect,
      `Aucun ${def.immune === 'negative' ? 'malus' : 'bonus'} ne peut être posé sur le porteur ; l'immunité ne s'use pas. Ceux déjà là, et les auras de l'adversaire, agissent toujours.`,
      'application',
    )
  if (def.mechanic === 'form')
    say(consumption, "Règle de forme : présente tant que le porteur a cette forme, retirée quand il en change. Ni bonus ni malus : aucune purge ne l'enlève, rien ne la bloque.", 'forms')
  if (def.mechanic === 'skill')
    say(consumption, "Mécanisme de sa compétence : ni bonus ni malus. Aucune purge ne l'enlève, rien ne le bloque.", 'polarity')
  if (def.reflectsHit)
    say(
      effect,
      `Le prochain coup qui touche le porteur (pile comprise) renvoie à l'attaquant ${Math.round(def.reflectsHit * 100)} % des PV retirés, arrondis au-dessus, en dégâts directs ; une charge par coup.`,
      'direct-damage',
    )
  if (def.fillsOnHurt)
    say(
      effect,
      `Chaque coup qui touche le porteur (pile comprise) range ses dégâts dans une des ${def.fillsOnHurt.slots} jauges, la plus ancienne cédant sa place ; les dégâts directs ne comptent pas. La compétence du porteur les relâche d'un coup.`,
      'direct-damage',
    )
  if (def.wards)
    say(
      effect,
      `Bloque la pose ${def.wards.polarity === 'negative' ? 'des malus' : def.wards.polarity === 'positive' ? 'des bonus' : 'de certains statuts'} sur le porteur ; une charge par blocage.`,
      'application',
    )
  if (def.decays) say(consumption, "S'estompe : perd une charge chaque fois qu'il agit, et disparaît à 0.")
  if (def.spentOnHit) say(consumption, 'Disparaît, toutes charges comprises, dès que le prochain coup du porteur touche ; un coup esquivé ne le consomme pas.')
  if (def.spentOnHurt) say(consumption, 'Perd une charge chaque fois qu’un coup touche le porteur.')
  if (def.turnsFromStacks) say(consumption, 'Une seule valeur : il dure autant de tours que de charges.', 'duration')
  else if (def.expiresAt === 'turnEnd') say(consumption, 'Sa durée se décompte à la fin des tours du porteur.', 'duration')
  else if (def.expiresAt === 'turnStart') say(consumption, 'Sa durée se décompte au début des tours du porteur, avant son action.', 'duration')
  if (isAura(id)) say(consumption, "Aura : sans durée, jusqu'à la fin du combat ; une purification peut la retirer, avec toutes ses charges.", 'auras')
  return {
    effect,
    consumption,
    ...(!def.mechanic && { stacking: def.stacking === 'add' ? ('stacking-add' as const) : ('stacking-refresh' as const), maxStacks: def.maxStacks }),
    lifetime: isAura(id) ? 'auras' : def.turnsFromStacks || def.expiresAt ? 'duration' : undefined,
  }
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
 * 2. immunité d'un statut du porteur (Aura d'immunité) → bloqué, sans rien user ;
 * 3. garde (`wards`) d'un statut du porteur → bloqué, la garde perd une charge ;
 * 4. opposition (`opposes`) → les charges s'annulent une à une avec le statut opposé ;
 * 5. cumul (`stacking`) et plafond (`maxStacks`) pour ce qui reste.
 * Un mécanisme (`mechanic`) n'est ni bonus ni malus : il passe directement au cumul (2026-10-21).
 */
export function resolveApplication(
  list: readonly Status[],
  added: Status,
  immunities: readonly StatusId[] = [],
): { list: Status[]; outcome: ApplicationOutcome } {
  const def = STATUSES[added.id]
  const free = def.mechanic !== undefined
  if (!free && immunities.includes(added.id)) return { list: [...list], outcome: { kind: 'blocked', by: 'immunity' } }
  // Immunité d'un statut (Aura d'immunité) : bloque sans s'user
  const immune = free ? undefined : list.find((s) => STATUSES[s.id].immune === def.polarity)
  if (immune) return { list: [...list], outcome: { kind: 'blocked', by: immune.id } }
  const ward = free
    ? undefined
    : list.find((s) => {
        const w = STATUSES[s.id].wards
        return w && (w.polarity === def.polarity || w.statuses?.includes(added.id))
      })
  if (ward) return { list: consumeStatus(list, ward.id, 1), outcome: { kind: 'blocked', by: ward.id } }

  let current: Status[] = [...list]
  let stacks = added.stacks
  let cancelled: { status: StatusId; stacks: number } | undefined
  const opposite = def.opposes && !free ? findStatus(current, def.opposes) : undefined
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

/** Un mécanisme (`StatusDef.mechanic`) : règle de forme ou de compétence, ni bonus ni malus. */
export const isMechanic = (id: StatusId) => STATUSES[id].mechanic !== undefined

/** Retire les statuts d'une polarité, sauf les mécanismes (`mechanic`), qui ne se purgent pas. */
export const removeStatuses = (list: readonly Status[], polarity: Polarity) =>
  list.filter((s) => STATUSES[s.id].polarity !== polarity || isMechanic(s.id))

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
