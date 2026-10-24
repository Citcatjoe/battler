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
  | 'momentum'
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
  /**
   * Intensité (0.110.0) : ce que les rangs d'aiguisage de la compétence qui l'a posé lui ajoutent (axe `power`,
   * `RankAxis`). Ce qu'elle vaut, le statut le dit (`StatusDef.power`) ; absente, aucune.
   */
  power?: number
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
   * le statut. Pile, ce coup ×`multiplier` : l'adversaire perd encore `multiplier` − 1 fois les PV que le coup lui a
   * retirés (DP, en une perte) ; face, rien. Le statut est consommé. `headsTouches` : pile compte comme un coup qui touche
   * de ce montant (fenêtres `hit` du porteur et `hurt` de l'adversaire) : tout ce qui réagit à un coup qui touche réagit
   * (Aura de décoction, Épines, Saignement, Vol de vie, Riposte, jauges de Rétribution).
   */
  coinToss?: { multiplier: number; headsTouches?: boolean }
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
  /**
   * Ce que vaut son intensité (`Status.power`, 0.110.0), en une ligne : « +1 coup par rafale ». Un statut qui la lit la
   * déclare ; une compétence n'a l'axe de rang `power` que sur un tel statut (`validateRoster`).
   */
  power?: (n: number) => string
  /**
   * Une intensité à demi (axe de rang à `per: 0.5`) se paie à chaque action du statut, une fois sur deux (une aura :
   * un tour, ou un coup, sur deux), et non à la pose de la compétence (0.110.0). Une aura vaut presque tout dès sa
   * première pose : un demi-rang payé à la pose ne serait pas un demi.
   */
  powerPaidOnAction?: true
  /**
   * Sa phrase dans le texte d'une compétence greffée qui le pose sur son lanceur (revue 0.110.0) : posé avant le coup
   * du même jet, il agit sur ce coup-ci (Œil de faucon, Vol de vie), là où `describe` dit « le prochain ».
   */
  grafted?: (s: Status) => string
}

/** Les charges qui agissent : les charges, plus l'intensité (une aura aiguisée compte autant de charges de plus, 0.110.0). */
export const charges = (s: Status) => s.stacks + (s.power ?? 0)

/** Une quantité à demi (0.110.0), payée une fois sur deux, dès la première : « 2 puis 1 ». */
const halves = (q: number) => (Number.isInteger(q) ? String(q) : `${Math.ceil(q)} puis ${Math.floor(q)}`)

/** Une quantité à demi sur un badge : « 1,5 ». */
const badgeNumber = (q: number) => String(q).replace('.', ',')

/** Coups de base d'une rafale de Furie des vents, par charge (son intensité en ajoute, 0.110.0). */
const WIND_FURY_STRIKES = 2
/** Coups de la rafale : chaque charge en donne autant, toutes partent ensemble (M1, 0.110.0 ; `burst`, combat.ts). */
const furyStrikes = (s: Status) => (WIND_FURY_STRIKES + (s.power ?? 0)) * s.stacks

/** Un nombre en toutes lettres, en tête de phrase (au-delà, en chiffres). */
const COUNT_WORDS = ['Zéro', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six']

// « PV » est une abréviation : invariable
const plural = (n: number, word: string) => `${n} ${word}${n > 1 && word !== 'PV' ? 's' : ''}`
const forTurns = (s: Status) => (s.turns === undefined ? '' : `, encore ${plural(s.turns, 'tour')}`)

/** PV rendus par Sifflotement à chaque fin de tour, et dégâts retirés par charge de Fausse note (barde). */
export const WHISTLE_HEAL = 2
export const FALSE_NOTE = 5

/**
 * Charges de poison posées par coup qui touche, par charge d'Aura de décoction. 2 jusqu'à la 0.106.1 ; 1 depuis la
 * 0.107.0 (revue des compétences, SORTS.md § 19) : un coup à chaque jet l'avait doublée (+28 points gravée).
 */
export const DECOCTION_POISON = 1

/**
 * Druide : ce que l'ours ajoute à chacun de ses coups (Force de l'ours).
 * +4 en 0.73.0, +3 en 0.76.0 : la compensation des trois éclairs de la Foudre (6 dégâts au lieu de 5).
 */
export const BEAR_MIGHT = 3

/** Aura sauvage (0.107.0) : l'attaque du porteur, minimum et maximum, gagne autant par charge (avant le critique). */
export const WILD_AURA_ATTACK = 1

/** Aura d'intimidation : dégâts retirés à chaque coup de l'adversaire, par charge (2 jusqu'à la 0.106.1). */
export const INTIMIDATION = 1

/** Aura de précision (0.107.0) : par charge, +1 au multiplicateur de critique et ce gain de chance de critique. */
export const PRECISION_CRIT = 0.05

/** Pile ou face : pile, ce coup ×3 (×2 jusqu'à la 0.106.1). */
export const COIN_HEADS = 3

/**
 * Aura de sainteté : plafond de charges (0.42.0) et PV rendus par charge à chaque fin de tour. 3 charges de 2 PV jusqu'à
 * la 0.106.1 ; 2 charges (décision de l'utilisateur) de 1 PV depuis la 0.107.0 : le plafond seul la laissait à +23 points
 * gravée (on atteint rarement la troisième charge), 2 PV par charge en une seule charge la rendait non cumulable.
 */
const HOLY_CAP = 2
const HOLY_HEAL = 1

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
    grafted: (s) => (s.stacks > 1 ? `Ce coup et les ${s.stacks - 1} suivants qui touchent sont critiques` : "Ce coup est critique ; s'il est esquivé, le prochain qui touche"),
    badge: (s) => `×${s.stacks}`,
    stacking: 'add',
    forcesCrit: true,
  },
  bonusArmor: {
    name: 'Armure temporaire',
    look: { glow: 'rgba(186,198,214,0.95)' },
    polarity: 'positive',
    summary: "Un bouclier qui absorbe des dégâts après l'armure, puis s'épuise.",
    describe: (s) => `Bouclier de ${s.stacks} : absorbe les dégâts après l'armure (le coup garde au moins 1), et s'use d'autant`,
    badge: (s) => String(s.stacks),
    stacking: 'add',
    shield: true,
  },

  poison: {
    name: 'Poison',
    look: { glow: 'rgba(74,222,128,0.75)' },
    polarity: 'negative',
    summary: 'Au début de son tour, perd autant de PV que de charges (sans armure), puis perd une charge : Poison 3 = 3 + 2 + 1 PV. Se cumule.',
    describe: (s) =>
      s.stacks > 1 && s.stacks <= 3
        ? `Perd ${Array.from({ length: s.stacks }, (_, k) => s.stacks - k).join(', ').replace(/, (\d+)$/, ' puis $1')} PV au début de ses tours (${(s.stacks * (s.stacks + 1)) / 2} en tout)`
        : `Perd ${plural(s.stacks, 'PV')} au début de son prochain tour${s.stacks > 1 ? `, puis 1 de moins à chaque tour (${(s.stacks * (s.stacks + 1)) / 2} PV en tout)` : ''}`,
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
      'Chaque coup qui le touche lui fait perdre autant de PV que de charges (sans armure), puis une charge part : Saignement 2 = 2 + 1 PV. Ouverte pendant un coup, la plaie coule dès le suivant. Se cumule.',
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
    summary: "Ses coups font 1 de moins par charge, avant l'armure.",
    describe: (s) => `Ses coups infligent ${s.stacks} de moins avant l'armure${forTurns(s)}`,
    badge: (s) => `−${s.stacks}`,
    stacking: 'refresh',
    modifyOutgoing: (damage, s) => damage - s.stacks,
  },
  exposed: {
    name: 'Brèche',
    polarity: 'negative',
    summary: 'Son armure perd 1 par charge (3 au plus).',
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
    summary: 'À la fin de ses N prochains tours, perd N PV (Brûlure 3 : 3 × 3 PV). Une nouvelle Brûlure remplace l’ancienne.',
    describe: (s) =>
      s.turns === undefined
        ? `Perd ${plural(s.stacks, 'PV')} à la fin de chacun de ses tours`
        : `Perd ${plural(s.stacks, 'PV')} à la fin de ${s.turns > 1 ? `ses ${s.turns} prochains tours` : 'son prochain tour'}`,
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
    summary: "Chaque coup reçu fait +1 par charge, avant l'armure (3 au plus).",
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
    describe: (s) => `Chaque coup qui le touche pose ${halves(charges(s))} Saignement sur l'attaquant, pour le reste du combat`,
    badge: (s) => badgeNumber(charges(s)),
    // 0.68.0 : les épines font saigner au lieu de renvoyer 1 dégât direct par charge (0.45.0). Le saignement
    // ne coule que quand le nain touche l'attaquant : la punition attend la riposte du porteur.
    counter: 'stacks',
    stacking: 'add',
    // Pas de `spentOnReaction` : contre une Furie des vents, chaque coup ouvre la plaie (voulu, 0.29.0).
    reactions: { hurt: (s) => [{ type: 'applyStatus', status: 'bleed', stacks: charges(s), target: 'opponent' }] },
    // Aiguisées (0.110.0) : chaque coup encaissé fait saigner d'une charge de plus (une fois, pas par pose) ; à demi, un
    // coup encaissé sur deux
    power: (n) => `+${n} Saignement par coup encaissé`,
    powerPaidOnAction: true,
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
    describe: (s) => {
      const more = s.power ? `, plus ${plural(s.power, 'PV')}` : ''
      return s.stacks > 1
        ? `Ses ${s.stacks} prochains coups lui rendent les PV qu'ils retirent${more} (un coup esquivé use une charge)`
        : `Son prochain coup lui rend les PV qu'il retire${more} (perdu si le coup est esquivé)`
    },
    grafted: (s) => {
      const more = s.power ? `, plus ${plural(s.power, 'PV')}` : ''
      return s.stacks > 1
        ? `Ce coup et les ${s.stacks - 1} suivants lui rendent les PV qu'ils retirent${more} (un coup esquivé use une charge)`
        : `Ce coup lui rend les PV qu'il retire${more} (esquivé, rien)`
    },
    badge: (s) => `×${s.stacks}`,
    // 0.45.0 : deux charges par Vol de vie (deux coups drainés), au lieu d'une ; le compteur dit
    // combien de coups drainent encore. Avant : +3 à +4 points, et un « 1 » qui n'apprenait rien.
    stacking: 'add',
    maxStacks: 2,
    drainsHit: true,
    // Aiguisé (0.110.0) : chaque coup drainé rend des PV en plus ; le plafond de 2 charges ne bouge pas
    power: (n) => `+${plural(n, 'PV')} par coup drainé`,
  },
  windFury: {
    name: 'Furie des vents',
    look: { glow: 'rgba(186,230,253,0.95)' },
    polarity: 'positive',
    summary:
      'Ce jet ne frappe pas : tout de suite, deux coups de base bruts par charge, chacun avec son dé (leur face ne déclenche aucune compétence). Toutes les charges partent ensemble.',
    describe: (s) => `${COUNT_WORDS[furyStrikes(s)] ?? furyStrikes(s)} coups de base bruts tout de suite, chacun son dé (aucune compétence)`,
    badge: (s) => `×${furyStrikes(s)}`,
    // 0.50.0 (demande de l'utilisateur) : instantanée. Le 2 tombe, les deux coups partent dans la même
    // action, au lieu d'attendre la suivante (0.46.0 : en réserve). Le 2 lui-même ne frappe pas (relation « remplace »).
    // 0.69.0 (demande de l'utilisateur) : coups bruts. Avant, un tiers des coups de Furie tombaient sur
    // une compétence (36,5 %), et une Furie sur cinq en relançait une autre (SORTS.md § 15).
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    extraStrikes: WIND_FURY_STRIKES,
    instantStrikes: true,
    // Aiguisée (E1, 0.110.0) : un coup de plus par rafale et par rang (une charge doublait la rafale : +15 points gravée)
    power: (n) => `+${n} coup par rafale`,
  },
  evasion: {
    name: 'Esquive améliorée',
    look: { glow: 'rgba(165,243,252,0.8)', opacity: 0.45 },
    polarity: 'positive',
    summary: 'Esquive à coup sûr le prochain coup reçu, une charge par esquive. Se cumule.',
    describe: (s) => (s.stacks > 1 ? `Esquive à coup sûr les ${s.stacks} prochains coups reçus${forTurns(s)}` : `Esquive à coup sûr le prochain coup reçu${forTurns(s)}`),
    badge: () => '100 %',
    // 2026-10-21 (demande de l'utilisateur) : cumulable, une charge par esquive. Avant : plafonnée à 1 (`refresh`).
    counter: 'stacks',
    stacking: 'add',
    forcesDodge: true,
  },
  // Lot des consommateurs (docs/PROGRESSION.md § 13.3) : posé par l'Encens de l'abbaye, chaque fois que son porteur
  // regagne des PV. Aucun statut ne disait « +N au prochain coup » : la Puissance dure, la Fausse note est un malus.
  momentum: {
    name: 'Ferveur',
    polarity: 'positive',
    summary: "Son prochain coup qui touche fait autant de dégâts de plus que de charges, avant l'armure. Se cumule ; disparaît, toutes charges comprises, dès que ce coup touche.",
    describe: (s) => `Son prochain coup qui touche fait +${s.stacks}, avant l'armure`,
    badge: (s) => `+${s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    modifyOutgoing: (damage, s) => damage + s.stacks,
    spentOnHit: true,
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
    summary: `Le porteur lance aussitôt une pièce, juste après le coup qui l’a posée : pile, ce coup ×${COIN_HEADS}, l’adversaire perd encore ${COIN_HEADS - 1} fois les PV qu’il lui a retirés, en dégâts directs qui comptent comme un coup qui touche (tout ce qui réagit à un coup part : Aura de décoction, Épines, Saignement, Riposte, Vol de vie, jauges de Rétribution) ; face, rien.`,
    describe: (s) => `Une pièce : pile, ce coup ×${COIN_HEADS + (s.power ?? 0)} ; face, rien`,
    badge: (s) => `×${COIN_HEADS + (s.power ?? 0)}`,
    stacking: 'refresh',
    mechanic: 'skill',
    maxStacks: 1,
    // 0.42.0 (audit des compétences, SORTS.md § 10) : pile à 20 au lieu de 15, et pile touche (l'Aura
    // de décoction empoisonne). Face reste vide : la dualité et sa mise en scène sonore sont voulues.
    // Avant : valeur nette de −4 à −5 points, parce que la pièce prend la place d'un jet de dé.
    // 2026-10-21 (demande de l'utilisateur) : la pièce part aussitôt, juste après le jet de 2 qui l'a posée,
    // au lieu de remplacer le dé de l'action suivante.
    // Règles v2, phase 5 bis (décision de l'utilisateur, 2026-10-23) : pile, ce coup ×2, au lieu de 10 dégâts fixes.
    // 0.107.0 (décision de l'utilisateur, SORTS.md § 19) : ×3, un gros coup sur deux (+8 points gravée à ×2).
    coinToss: { multiplier: COIN_HEADS, headsTouches: true },
    // Aiguisée (0.110.0) : pile multiplie davantage
    power: (n) => `pile ×${n} de plus`,
  },
  luckyStrike: {
    name: 'Coup de chance',
    look: { glow: 'rgba(52,211,153,0.85)', dieColor: '#34d399' },
    polarity: 'positive',
    summary: 'À sa prochaine action, un d6 de plus par charge : chacun est un jet complet (sa compétence, puis son coup de base). Se cumule.',
    describe: (s) =>
      s.stacks > 1
        ? `À sa prochaine action, ${s.stacks} jets de plus (chacun son dé, sa compétence, son coup)`
        : 'À sa prochaine action, un jet de plus (son dé, sa compétence, son coup)',
    badge: (s) => `+${s.stacks}d6`,
    // 0.50.0 (demande de l'utilisateur) : cumulable, un d6 par charge, toutes les charges à la prochaine action
    counter: 'stacks',
    stacking: 'add',
    extraStrikes: 1,
    strikeCharges: 'all',
    // 0.107.0 (SORTS.md § 19) : le jet qui le pose se greffe (son coup part) ; remplacer le coup en faisait perdre un
    // pour en gagner un plus tard (+3 points gravé). Chaque jet donné est complet
  },

  /* Paladin (0.31.0). */
  riposte: {
    name: 'Riposte',
    look: { glow: 'rgba(253,230,138,0.9)' },
    polarity: 'positive',
    summary:
      "Chaque charge : le prochain coup qui touche le porteur (pile comprise) renvoie à l'attaquant la moitié des PV retirés, arrondie au-dessus, en dégâts directs. Sans durée : elle attend ce coup, même si l'adversaire n'en porte pas (jet remplacé, tour perdu).",
    describe: (s) => {
      const more = s.power ? `, plus ${s.power}` : ''
      return s.stacks > 1
        ? `Ses ${s.stacks} prochains coups encaissés renvoient chacun la moitié de leurs dégâts (arrondie au-dessus)${more} à l'attaquant`
        : `Le prochain coup encaissé renvoie la moitié de ses dégâts (arrondie au-dessus)${more} à l'attaquant`
    },
    badge: () => '50 %',
    // 0.50.0 : deux charges par Riposte (deux coups renvoyés), comme le Vol de vie
    counter: 'stacks',
    stacking: 'add',
    maxStacks: 2,
    reflectsHit: 0.5,
    // Aiguisée (0.110.0) : chaque coup renvoyé l'est de quelques PV de plus ; le plafond de 2 charges ne bouge pas
    power: (n) => `+${n} à chaque coup renvoyé`,
  },
  retribution: {
    name: 'Rétribution',
    polarity: 'positive',
    summary:
      'Trois jauges gardent les PV retirés par les trois derniers coups qui le touchent (pile comprise ; pas les dégâts directs). Sa compétence en relâche la moitié, arrondie au-dessous, puis les vide. Ni bonus ni malus : aucune purge ne les vide.',
    describe: (s) => `Jauges : ${(s.slots ?? []).join(' · ') || 'vides'} (${s.stacks} PV gardés)`,
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
    describe: (s) => `Au début de chacun de ses tours, ${halves(charges(s))} Poison sur l'adversaire`,
    badge: (s) => `+${badgeNumber(charges(s))}`,
    stacking: 'add',
    // 0.69.0 (choix de l'utilisateur, SORTS.md § 15) : elle pose du vrai Poison au lieu de dégâts directs
    // au début du tour adverse (0.45.0). Un seul statut, une seule règle : l'immunité le bloque, la
    // Régénération l'annule, une purge l'enlève, sans crochet propre. Cumulable, sans compensation.
    onTurnStart: (s) => [{ type: 'applyStatus', status: 'poison', stacks: charges(s), target: 'opponent' }],
    // Aiguisée (0.110.0) : une charge de plus, une fois ; à demi, un tour sur deux
    power: (n) => `+${n} Poison par tour`,
    powerPaidOnAction: true,
  },
  powerAura: {
    name: 'Aura de puissance',
    look: { aura: 'rgba(251,146,60,0.55)' },
    polarity: 'positive',
    summary: "Chaque coup du porteur inflige 2 dégâts de plus, après le critique et avant l'armure. Permanente, non cumulable.",
    describe: (s) => `Ses coups font +${2 * s.stacks + (s.power ?? 0)}, après le critique et avant l'armure`,
    badge: (s) => `+${2 * s.stacks + (s.power ?? 0)}`,
    // 0.107.0 (SORTS.md § 19) : non cumulable, comme l'Aura d'immunité ; +2 par charge cumulable valait +21 points gravée.
    // L'Aura sauvage, elle, cumule +1 à l'attaque (avant le critique)
    stacking: 'refresh',
    maxStacks: 1,
    modifyOutgoing: (damage, s) => damage + 2 * s.stacks + (s.power ?? 0),
    power: (n) => `+${n} à chaque coup`,
  },
  intimidationAura: {
    name: "Aura d'intimidation",
    look: { aura: 'rgba(185,28,28,0.6)' },
    polarity: 'positive',
    summary: `Les coups de l'adversaire font ${INTIMIDATION} de moins par charge, avant l'armure. Permanente.`,
    describe: (s) => `Les coups adverses lui font −${INTIMIDATION * s.stacks}, après le critique et avant l'armure`,
    badge: (s) => `−${INTIMIDATION * s.stacks}`,
    stacking: 'add',
    // 0.107.0 (SORTS.md § 19) : −1 par charge au lieu de −2 ; sur une attaque de 5, −2 retirait 40 % de chaque coup
    modifyIncoming: (damage, s) => damage - INTIMIDATION * s.stacks,
  },
  precisionAura: {
    name: 'Aura de précision',
    look: { aura: 'rgba(250,204,21,0.5)' },
    polarity: 'positive',
    summary: `Par charge, le porteur gagne ${Math.round(PRECISION_CRIT * 100)} % de chance de critique et +1 à son multiplicateur de critique. Permanente.`,
    describe: (s) => `+${Math.round(PRECISION_CRIT * 100 * s.stacks)} % de critique et +${s.stacks} au multiplicateur de critique`,
    badge: (s) => `+${s.stacks}`,
    stacking: 'add',
    // 0.107.0 (SORTS.md § 19) : la chance de critique en plus ; sans elle, un porteur sans critique (Morgrut) n'en tirait rien
    modifyStats: (stats, s) => ({ ...stats, critChance: stats.critChance + PRECISION_CRIT * s.stacks, critMultiplier: stats.critMultiplier + s.stacks }),
  },
  immunityAura: {
    name: "Aura d'immunité",
    look: { aura: 'rgba(253,224,71,0.55)' },
    polarity: 'positive',
    summary: 'Aucun malus ne peut plus lui être posé (les auras adverses agissent toujours) ; armure +1. Permanente, non cumulable.',
    describe: (s) => `Aucun malus ne peut plus lui être posé (les auras adverses agissent toujours) ; armure +${charges(s)}`,
    badge: () => '∞',
    stacking: 'refresh',
    maxStacks: 1,
    immune: 'negative',
    // 0.42.0 : +1 d'armure tant que l'aura est là. Seule, l'immunité coûtait des victoires (−2,7 à
    // −3,9 points) : peu d'adversaires posent des malus, et le 3 sacrifiait alors son coup.
    modifyStats: (stats, s) => ({ ...stats, armor: stats.armor + charges(s) }),
    power: (n) => `+${n} d'armure`,
  },
  holyAura: {
    name: 'Aura de sainteté',
    look: { aura: 'rgba(254,243,199,0.6)' },
    polarity: 'positive',
    summary: `Le porteur regagne ${plural(HOLY_HEAL, 'PV')} par charge à la fin de chacun de ses tours (${HOLY_CAP} charges au plus). Permanente.`,
    describe: (s) => `Regagne ${halves(HOLY_HEAL * charges(s))} PV à la fin de chacun de ses tours`,
    badge: (s) => `+${badgeNumber(HOLY_HEAL * charges(s))}`,
    stacking: 'add',
    // 0.42.0 : plafond de charges (`HOLY_CAP`). Sans plafond, les soins s'empilaient et les combats
    // des prêtresses devenaient longs et joués d'avance (+42 points de valeur nette, 16 % de fins serrées).
    // 0.107.0 (SORTS.md § 19) : 2 charges de 1 PV, au lieu de 3 de 2 (+23 points gravée, +32 dans le kit d'Ysolde)
    maxStacks: HOLY_CAP,
    onTurnEnd: (s) => [{ type: 'heal', amount: HOLY_HEAL * charges(s) }],
    // Aiguisée (0.110.0) : l'intensité passe le plafond de charges, qui ne bouge pas ; à demi, un tour sur deux
    power: (n) => `+${plural(HOLY_HEAL * n, 'PV')} par tour`,
    powerPaidOnAction: true,
  },
  decoctionAura: {
    name: 'Aura de décoction',
    look: { aura: 'rgba(163,230,53,0.5)' },
    polarity: 'positive',
    summary: `Chaque coup qui touche (pile comprise) empoisonne la cible : ${plural(DECOCTION_POISON, 'charge')} de Poison par charge d’aura. Permanente.`,
    describe: (s) => `Chacun de ses coups qui touche (pile comprise) pose ${halves(DECOCTION_POISON * charges(s))} Poison sur l'adversaire`,
    badge: (s) => `+${badgeNumber(DECOCTION_POISON * charges(s))}`,
    stacking: 'add',
    // Poison qui s'estompe (0.36.4) : voir EQUILIBRAGE.md pour la valeur
    reactions: { hit: (s) => [{ type: 'applyStatus', status: 'poison', stacks: DECOCTION_POISON * charges(s), target: 'opponent' }] },
    // Aiguisée (0.110.0) : une charge de plus, une fois ; à demi, un coup qui touche sur deux
    power: (n) => `+${DECOCTION_POISON * n} Poison par coup qui touche`,
    powerPaidOnAction: true,
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
    describe: (s) => `Chaque coup qui touche pose ${s.stacks} Pourriture`,
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
    summary: `Sous forme d'ours, le druide ne lance que ses gravures : son coup de base est physique (DP) et fait ${BEAR_MIGHT} de plus, après le critique et avant l'armure.`,
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
    summary: `L'attaque du porteur gagne ${WILD_AURA_ATTACK} par charge, minimum et maximum : chaque coup vaut plus, avant le critique. Permanente.`,
    describe: (s) => `Son attaque gagne +${WILD_AURA_ATTACK * s.stacks} (minimum et maximum)`,
    badge: (s) => `+${WILD_AURA_ATTACK * s.stacks}`,
    stacking: 'add',
    // 0.107.0 (décision de l'utilisateur, SORTS.md § 19) : elle écrit la feuille (la ligne « Attaque » monte) et compte
    // avant le critique ; elle était un doublon de l'Aura de puissance (+2 par charge après le critique)
    modifyStats: (stats, s) => ({ ...stats, attackMin: stats.attackMin + WILD_AURA_ATTACK * s.stacks, attackMax: stats.attackMax + WILD_AURA_ATTACK * s.stacks }),
  },

  /* Barde (0.41.0) : deux dés ; ses compétences sur les faces depuis la phase 5 ter (doubles avant). */
  whistling: {
    name: 'Sifflotement',
    polarity: 'positive',
    summary: `+${WHISTLE_HEAL} PV à la fin de chacun de ses tours, pendant autant de tours que de charges. Se cumule.`,
    describe: (s) => `Regagne ${WHISTLE_HEAL} PV à la fin de ${s.stacks > 1 ? `ses ${s.stacks} prochains tours` : 'son prochain tour'} (${WHISTLE_HEAL * s.stacks} PV en tout)`,
    badge: (s) => `+${WHISTLE_HEAL * s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    onTurnEnd: () => [{ type: 'heal', amount: WHISTLE_HEAL }],
  },
  falseNote: {
    name: 'Fausse note',
    polarity: 'negative',
    summary: `Son prochain coup qui touche fait ${FALSE_NOTE} de moins par charge, après l'armure (au moins 1) ; puis elle part. Se cumule.`,
    describe: (s) =>
      s.power
        ? `Ses ${1 + s.power} prochains coups qui touchent font chacun −${FALSE_NOTE * s.stacks}, après l'armure (au moins 1)`
        : `Son prochain coup qui touche fait −${FALSE_NOTE * s.stacks}, après l'armure (au moins 1)`,
    badge: (s) => `−${FALSE_NOTE * s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    modifyFinal: (damage, s) => damage - FALSE_NOTE * s.stacks,
    spentOnHit: true,
    // Aiguisée (0.110.0) : elle dure un coup de plus par rang (un coup qui touche use l'intensité avant le statut) ; des
    // charges de plus ne gagnaient presque rien, la première rabat déjà souvent le coup à 1
    power: (n) => `+${n} coup qui touche`,
  },
  melodiousAura: {
    name: 'Aura mélodieuse',
    look: { aura: 'rgba(196,181,253,0.55)' },
    polarity: 'positive',
    // 0.45.0 : textes sans le jargon « dégâts finaux » (note de l'utilisateur : description peu claire)
    summary: "Chacun de ses coups qui touche fait +1 par charge, ajouté après l'armure et les boucliers. Permanente, se cumule.",
    describe: (s) => `Ses coups qui touchent font +${s.stacks}, après l'armure et les boucliers`,
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
      `Juste après le jet qui le pose, dans la même action, le porteur frappe ${def.extraStrikes} fois par charge (toutes ses charges partent ensemble) : autant de coups de base, chacun avec son dé, esquive et critique résolus à part. Coups bruts : leur face ne déclenche aucune compétence.`,
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
      `Le porteur lance aussitôt une pièce, juste après le coup qui a posé le statut : pile, ce coup ×${def.coinToss.multiplier}, l'adversaire perd encore ${def.coinToss.multiplier - 1} fois les PV qu'il lui a retirés, en dégâts directs${def.coinToss.headsTouches ? ' qui comptent comme un coup qui touche (tout ce qui réagit quand il touche ou quand l’adversaire encaisse un coup part)' : ''} ; face, rien. Le statut est consommé.`,
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

/**
 * Applique un statut selon sa règle de cumul ; l'ordre d'application est conservé. L'intensité (`power`) ne se cumule
 * pas : un cumul garde la plus forte, un remplacement prend la sienne.
 */
export function applyStatus(list: readonly Status[], added: Status): Status[] {
  if (added.stacks <= 0) return [...list]
  const cap = STATUSES[added.id].maxStacks ?? Infinity
  const existing = findStatus(list, added.id)
  if (!existing) return [...list, { ...added, stacks: Math.min(added.stacks, cap) }]
  const power = Math.max(existing.power ?? 0, added.power ?? 0)
  const merged: Status =
    STATUSES[added.id].stacking === 'add'
      ? {
          id: added.id,
          stacks: Math.min(existing.stacks + added.stacks, cap),
          turns:
            existing.turns === undefined || added.turns === undefined
              ? undefined
              : Math.max(existing.turns, added.turns),
          ...(power > 0 && { power }),
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
