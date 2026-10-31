import type { CharacterStats } from './character'
import { DAMAGE_SOURCES, type DamageSource } from './damage'
import { triggerText, type Effect, type Trigger } from './events'
import type { RuleId } from './rules'
import type { SceneEventId } from './scenes'
import { typeset } from './typography'

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
  | 'thornSpike'
  | 'ward'
  | 'lifesteal'
  | 'windFury'
  | 'evasion'
  | 'momentum'
  | 'frostAura'
  | 'powerAura'
  | 'fear'
  | 'holyAura'
  | 'decoctionAura'
  | 'coinFlip'
  // Retour du 2026-10-27 (M10, R2) : les pièces de la Fortune, une par nature d'effet (docs/RELIQUES.md § 17)
  | 'luckyCoin'
  | 'cursedCoin'
  | 'luckyStrike'
  | 'immunity'
  | 'riposte'
  | 'retribution'
  | 'firefly'
  | 'whistling'
  | 'falseNote'
  | 'bleed'
  | 'casting'
  | 'bearMight'
  | 'quarry'
  | 'sentence'
  | 'grudge'
  | 'conflagration'
  | 'loadedDie'
  | 'vendetta'
  | 'duo'
  | 'faithShield'
  | 'openWound'
  // Phase 8, lot 3 (docs/SORTS.md § 29) : les malus de famille manquants
  | 'guardBreak'
  | 'jinx'
  | 'blinded'
  | 'hemorrhage'
  | 'sealTheft'
  // Phase 8, lot 3 (docs/SORTS.md § 28) : les fils minces
  | 'feint'
  | 'stormSky'
  | 'bloodFrenzy'
  | 'bloodFrenzyStrike'
  // Les Maîtrises, vague 2 (retour du 2026-10-27, docs/MAITRISES.md § 4) : les auras nouvelles et le Poing de pierre
  | 'luckyStreak'
  | 'dread'
  | 'rancor'
  | 'ballad'
  | 'stoneFist'
  // Quatrième demande du 2026-10-27 (docs/MAITRISES.md, « Le contenu des maîtrises ») : Fureur, Magie, Ombre, Rempart
  | 'onrush'
  | 'overcharge'
  | 'grip'
  // Retour du 30 octobre : la Focale (D26) et la face scellée du Cachet du greffier (D9), posés par des reliques
  | 'spellFocus'
  | 'sealedFace'
  | 'pilfer'
  | 'shockwave'
  // Quatrième demande du 2026-10-27 (docs/MAITRISES.md, « Le contenu du soin ») : Lumière, Sang, Poison
  | 'tithe'
  | 'votiveFlame'
  | 'leech'
  | 'harvest'
  | 'toadSkin'
  | 'verdigrisCoin'
  // Refonte des auras (tranche 6, 2026-10-28) : trois pièces de la Chance
  | 'shieldCoin'
  | 'volleyCoin'
  | 'volleyStrike'
  | 'hexCoin'
  // Refonte des auras (tranches 2 et 3, 2026-10-28) : la Mire de la Visée, les coups de la Veine, la note de la Ballade,
  // et les trois auras nouvelles (Bastion, Jugement et sa faute, Brasier)
  | 'aim'
  | 'veinStrike'
  | 'balladNote'
  | 'bastion'
  | 'judgement'
  | 'fault'
  | 'brasier'
  // Décisions du 2026-10-30 (D26, profondeur de l'offre, D9) : l'Égide d'orage, la Grâce, la Lame enduite, la Rage montante
  | 'stormAegis'
  | 'grace'
  | 'coatedBlade'
  | 'risingRage'
  // Décision D11 et D19 du 2026-10-30 (PersosB) : les compteurs des auras regroupées (orage, sainteté, décoction,
  // brasier) et le Cuir épais de Morgrut
  | 'stormCloud'
  | 'holyVigil'
  | 'decoctionDose'
  | 'emberHeap'
  | 'thickHide'

export type Polarity = 'positive' | 'negative'

/**
 * La famille d'un statut (docs/FAMILLES.md § 2) : celle de son effet principal ; un convertisseur (« quand il touche,
 * pose X ») est de la famille de ce qu'il produit. Elle choisit le son de sa pose (docs/SONS.md, règle 4, 2026-10-25).
 * Une donnée technique, jamais montrée : le joueur lit la maîtrise d'une compétence (`masteryOfSkill`, masteries.ts).
 */
export type Family = 'power' | 'guard' | 'precision' | 'evasion' | 'tempo' | 'fortune' | 'affliction' | 'healing' | 'retaliation' | 'seals'

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
  /** Sa famille (docs/FAMILLES.md § 2) : le son de sa pose s'en déduit (`cueOf`, docs/SONS.md § 4.2) */
  family: Family
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
    /**
     * Une pièce (`coinToss`) : la teinte de ses deux faces peintes (`coin-pile`, `coin-face`), un filtre CSS ; sans elle,
     * l'or de Pile ou face. Chaque pièce a la sienne, pour qu'on les distingue en l'air (retour du 2026-10-27, R2).
     */
    coin?: string
  }

  /* --- Règles. Chaque crochet est facultatif ; le moteur les appelle à un moment fixe. --- */

  /** Modifie les stats effectives du porteur (bornées ensuite par le moteur) */
  modifyStats?: (stats: CombatStats, s: Status) => CombatStats
  /**
   * Modifie les dégâts du porteur avant l'armure (le coup garde au moins 1). `foe` : les statuts du défenseur au moment du
   * coup (Emprise, quatrième retour du 2026-10-27 : elle compte ses malus)
   */
  modifyOutgoing?: (damage: number, s: Status, foe: readonly Status[]) => number
  /**
   * Modifie les dégâts FINAUX des coups du porteur : après l'armure et les boucliers, au moins 1 (Fausse note).
   * Contrairement à `modifyOutgoing`, ni l'armure ni l'intimidation ne le rognent.
   */
  modifyFinal?: (damage: number, s: Status) => number
  /**
   * Surtension (quatrième retour du 2026-10-27) : chaque impact des dégâts directs que le porteur inflige à l'adversaire (un
   * effet `damage` de ses compétences, de ses statuts, de ses reliques ; une relâche) passe par ce filtre, avant la perte ;
   * `source` dit ce qu'ils sont (la Surtension ne lit que la foudre)
   */
  modifyDirect?: (amount: number, s: Status, source: DamageSource) => number
  /**
   * Le prochain coup du porteur est critique (retour de l'utilisateur du 2026-10-27, B8) : la charge part avec ce coup,
   * qu'il touche ou qu'il soit esquivé ou raté (Aveuglé). Un jet sans coup (remplacé, tombé à vide) la garde.
   */
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
   * Une pièce (Fortune, relation « modifie ») : le porteur la lance aussitôt, juste après le coup qui a posé le statut ;
   * face, rien ; le statut est consommé. Deux natures (retour du 2026-10-27, M10) :
   * - `multiplier` (Pile ou face) : pile, ce coup ×`multiplier` ; l'adversaire perd encore `multiplier` − 1 fois les PV
   *   que le coup lui a retirés (un coup, en une perte). `headsTouches` : pile compte comme un coup qui touche de ce
   *   montant (fenêtres `hit` du porteur et `hurt` de l'adversaire) : tout ce qui réagit à un coup qui touche réagit ;
   * - `heads` (les autres pièces) : pile, ces effets, du point de vue du lanceur (un bonus pour lui, un malus à
   *   l'adversaire) ; son intensité (rangs d'aiguisage) la fait tomber plus souvent sur pile (`COIN_RANK_HEADS` par rang).
   */
  coinToss?: { multiplier: number; headsTouches?: boolean; heads?: never } | { heads: readonly Effect[]; multiplier?: never; headsTouches?: never }
  /**
   * Chance de pile (Dé pipé en aura, Maîtrises, 2026-10-27, M9) : chaque charge ajoute cette chance de faire pile à
   * toutes les pièces du porteur, comme la Pièce lestée (`Relic.headsChance`) ; la somme reste sous `HEADS_CAP` (moteur).
   */
  headsChance?: number
  /**
   * Pile critique (A14, refonte des auras) : une pièce d'effet lancée par un coup critique double son effet de pile.
   * Ce statut, posé par une pièce, ne se double pas : il pose ce qu'il pose (une action perdue reste une action perdue).
   */
  noCritDouble?: true
  /**
   * Poing de pierre (Maîtrises, 2026-10-27, P4) : n'agit que tant que son porteur a une armure temporaire (`shield`) ;
   * il part quand elle est vidée (sa réaction `shieldBroken`) ou brisée (Garde brisée).
   */
  whileShielded?: true
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
  /**
   * Ce que le statut ferait encore perdre à son porteur, relâché d'un coup par l'adversaire (Embrasement, phase 8, second
   * lot ; effet `release` avec `from: 'opponent'`). La Brûlure : ses PV par tour × ses tours restants.
   */
  releases?: (s: Status) => number
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
   * Riposte : réagit dans la fenêtre `hurt` du porteur, à chaque coup qui le touche (pile comprise, pas un renvoi), en
   * renvoyant à l'attaquant un coup sans dé de cette part des PV retirés (arrondie, C1) ; une charge par réaction
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
   * Sa phrase dans le texte d'une compétence greffée qui le pose sur son lanceur (revue 0.110.0) : posé avant le coup
   * du même jet, il agit sur ce coup-ci (Œil de faucon, Vol de vie), là où `describe` dit « le prochain ».
   */
  grafted?: (s: Status) => string
  /**
   * Sa phrase posée sur l'adversaire (passe compendium, 2026-10-25) : le sujet devient l'adversaire (« Le prochain coup
   * de l'adversaire qui touche fait −5 dégâts »). Sans elle : « L'adversaire » suivi de `describe` (« L'adversaire perd
   * 3, 2 puis 1 PV au début de ses tours »), qui commence alors par un verbe.
   */
  onFoe?: (s: Status) => string
  /**
   * Le détail de sa règle (passe compendium, 2026-10-25) : ce que la phrase courte tait (arrondis, moment exact, jargon des
   * coups bruts), une phrase. Le compendium l'affiche sous le texte d'une compétence qui le pose, en ligne « Détail ».
   */
  detail?: (s: Status) => string
  /** Son porteur en un verbe d'état, pour une condition (« l'adversaire saigne », « est empoisonné », « brûle ») */
  bears?: string
  /** Son nom au pluriel, quand il se compte (« +2 coups de chance ») ; sans lui, le nom ne varie pas (« +4 armure temporaire ») */
  plural?: string
  /**
   * Garde brisée (phase 8, lot 3) : le coup qui touche le porteur ne laisse absorber aucune de ses armures temporaires
   * (`shield`) et les brise toutes, sans ouvrir sa fenêtre `shieldBroken` (son armure n'a pas encaissé jusqu'au bout)
   */
  shatters?: true
  /**
   * Malchance (lot 3) : le prochain jet du porteur qui porterait une compétence de sa face (remplacer, se greffer,
   * modifier, prête) tombe à vide : ni compétence, ni coup ; une charge par jet. Un dé imposé (mode triche) ne l'use pas
   */
  jinxesRoll?: true
  /**
   * Face scellée (retour du 30 octobre, D9, Cachet du greffier) : posé, il retient dans son intensité (`power`) la face du
   * dernier jet de son porteur ; un jet de son dé de compétence sur cette face ne lance pas sa compétence, il ne porte
   * que le coup de base (un coup brut). Il dure ses tours ; sans jet passé, il ne se pose pas.
   */
  sealsFace?: true
  /**
   * Aveuglé (lot 3) : un critique du porteur, tiré ou assuré, devient un coup raté ; son intensité ajoute `BLIND_MISS` à
   * la chance de ce tirage. Le raté n'ouvre que la fenêtre `missed` du porteur, pas l'esquive du défenseur
   */
  blinds?: true
  /** Hémorragie (lot 3) : chaque soin que reçoit le porteur passe par ce filtre (montant voulu → montant gardé) */
  modifyHealing?: (amount: number, s: Status) => number
  /**
   * Sceau de vol (lot 3) : le prochain bonus volable que le porteur se pose (`isStealable`) va à l'adversaire, entier
   * (retour du 2026-10-28, A6 : un vrai vol), selon les règles de pose de l'adversaire ; une charge de Sceau par vol
   */
  stealsBonus?: true
  /**
   * Un statut à seuil (refonte des auras : la faute du Jugement, la note de la Ballade) : quand une pose amène ses charges
   * à `at`, il part, toutes charges comprises, et ses effets tombent aussitôt, du point de vue de son porteur, dans
   * l'étape de la pose (la Peur sur l'attaquant à sa 3e faute, le refrain de la Ballade à sa 4e note).
   */
  threshold?: { at: number; effects: (s: Status) => Effect[] }
  /**
   * Le compteur d'une aura (décision D11 du 2026-10-30 : plus de « 1 », une ressource se regroupe) : le statut qu'elle
   * nourrit, tour après tour ou coup après coup, avant un gros effet. Son anneau le montre à la place de son chiffre : sa
   * progression (« 2/3 ») s'il est à seuil (`threshold`), sinon son badge tant qu'il est là. Le moteur ne le lit pas ;
   * l'audit, si (`audit.ts`, les auras regroupées à seuil).
   */
  tally?: StatusId
  /**
   * Son moment d'écran (refonte des auras, docs/REFONTE_AURAS.md § 3.2, MISE_EN_SCENE M60 ; présentation seulement, le
   * moteur ne le lit pas) : l'événement de scène (`scenes.ts`) que joue son étape de tour, lu sur ce qu'elle a fait (ses
   * dégâts en coups, les charges qu'elle a posées) ; aucun : l'étape se joue comme les autres
   */
  scene?: (done: { hits: number; posed: number }) => SceneEventId | undefined
}

/**
 * Un impact de dégâts directs infligé à l'adversaire par le porteur de `statuses`, après leurs filtres `modifyDirect`
 * (Surtension, quatrième retour du 2026-10-27, la foudre seule) ; un impact nul reste nul. Le moteur et l'audit le lisent ici.
 */
export function directDamage(statuses: readonly Status[], amount: number, source: DamageSource): number {
  if (amount <= 0) return amount
  return statuses.reduce((n, s) => STATUSES[s.id].modifyDirect?.(n, s, source) ?? n, amount)
}

/** Coups de base d'une rafale de Furie des vents, par charge (son intensité en ajoute, 0.110.0). */
const WIND_FURY_STRIKES = 2
/** Coups de la rafale : chaque charge en donne autant, toutes partent ensemble (M1, 0.110.0 ; `burst`, combat.ts). */
const furyStrikes = (s: Status) => (WIND_FURY_STRIKES + (s.power ?? 0)) * s.stacks

/**
 * Curée (phase 8, 0.114.0) : coups de base bruts par charge, sa rafale. Son rang ajoute une charge. Trois depuis la revue
 * des compétences (O1, docs/REVUE_COMPETENCES.md) : deux la laissaient à +5,8 chez Gorak construit.
 */
const QUARRY_STRIKES = 3
const quarryStrikes = (s: Status) => QUARRY_STRIKES * s.stacks
/**
 * Duo (refonte des auras, 2026-10-28) : coups de base bruts par charge, juste après le coup du jet ; son rang en ajoute un.
 * Mesure d'ensemble (tranche 8, agent TuningF) : 3 → 1. Gravé chez les autres (200 combats par duel) : 3 coups +29,4,
 * 2 coups +24,7 (rang II +6,8), 1 coup +16,2 (rang II +10,3, l'unité la plus petite : un coup)
 */
const DUO_STRIKES = 1
const duoStrikes = (s: Status) => (DUO_STRIKES + (s.power ?? 0)) * s.stacks

/**
 * Sentence (phase 8, 0.114.0) : PV perdus par l'adversaire à chacun des prochains soins du porteur. Refonte des auras
 * (2026-10-28, docs/REFONTE_AURAS.md § 4) : une compétence à charges (« ses 3 prochains soins »), 3 PV chacun. Gravée
 * (300 par duel) : Ysolde +19,7, Fanchon +14,7 ; rang II Ysolde +7,1 (à 4 PV : Ysolde +23,4, hors bande).
 */
const SENTENCE_LOSS = 3

/*
 * Phase 8, second lot (docs/SORTS.md § 23) : les valeurs mesurées au laboratoire (séries 24 à 26, 400 combats par duel).
 * Embrasement : la Brûlure relâchée ×2 (son rang : ×2 de plus). Passe d'équilibre du 2026-10-31 : ×3 → ×2, gravé chez
 * Thaldrin construit +24,3 → +18,3 points (`npm run ramp`), nu +10,2 → +8,7 ; rang II (×4) +3,9. Vindicte : Ferveur par
 * charge, à chaque renvoi (6 depuis la revue des auras, A2 ; 3 avant).
 */
export const CONFLAGRATION_TIMES = 2
export const VENDETTA_MOMENTUM = 6

/**
 * Revue des auras et des compétences (docs/REVUE_COMPETENCES.md, I1, I3) : Bouclier de foi : armure temporaire à chaque
 * soin reçu (3 depuis la refonte des auras, compétence à charges). Plaie ouverte, refaite avec les Maîtrises (M9,
 * 2026-10-27) : Saignement posé à l'adversaire par charge, à chaque coup qui touche (3 par critique avant : gravée Gorak
 * +6,4 → +13,0, Elaria +12,6 → +14,3, série 71 du laboratoire).
 */
export const FAITH_SHIELD_ARMOR = 3
/** Plaie ouverte (refonte des auras, 2026-10-28, § 3.1) : Saignement par critique et par charge (1 par coup qui touche avant) */
export const OPEN_WOUND_BLEED = 4

/**
 * Les Maîtrises, vague 2 (docs/MAITRISES.md § 4, séries 70 à 73 du laboratoire) : Dé pipé, chance de pile par charge
 * (« +25 % de chances de faire pile ») ; Effroi, critique par charge de plus ; Poing de pierre, dégâts par coup tant que
 * l'armure temporaire tient (à +2, les départs de Brokk passaient 58 %).
 */
export const LOADED_DIE_HEADS = 0.25
/**
 * Dé pipé (2026-10-27, AURAS.md § 3) : la chance penche de son côté partout, du critique et de l'esquive par charge. Passe
 * d'équilibre du 2026-10-31 : 5 → 6 %, le départ de Naraxes au Dé pipé 41,7 → 44,0 % (sous 42 après le critique de Gorak)
 */
export const LOADED_DIE_EDGE = 0.06
export const DREAD_CRIT = 0.05
/** Poing de pierre : +2 depuis la décision D11 (2026-10-30), avec l'armure de la Peau de pierre 6 → 5 (force égale) */
export const STONE_FIST = 2
/**
 * Effroi : la première pose fait peur ; chaque charge de plus, du critique (comme l'Ivresse du sang).
 * Plafonné à 3 charges (D16, retour du 30 octobre) : +10 % au plus par ses poses ; à 8 charges contre le Colosse, le boss
 * perdait une action sur deux (l'Ombre contre des adversaires à 2 fois leurs PV : 57,3 → 54,9 %)
 */
export const DREAD_CAP = 3
const dreadCrit = (s: Status) => DREAD_CRIT * (s.stacks - 1)

/**
 * Phase 8, lot 3 (docs/SORTS.md § 28, séries 60 à 69, 400 combats par duel) : les fils minces. Feinte : esquive par
 * charge (chaque esquive, un critique assuré). Ivresse du sang : coups bruts par critique, et critique par pose de plus.
 */
export const FEINT_DODGE = 0.05
/**
 * Aura d'orage (décision D20 du 2026-10-30) : tous les trois tours, l'orage éclate, trois éclairs de 2 (un ou deux
 * éclairs de 1 par tour avant). Départ de Thaldrin 56,9 → 56,8 % (laboratoire, série 128, 0.131.2). Chaque charge de
 * plus : un éclair de plus.
 */
export const STORM_TURNS = 3
export const STORM_BOLT = 2
export const STORM_BOLTS = 3
export const BLOOD_FRENZY_STRIKES = 2
export const BLOOD_FRENZY_CRIT = 0.05
/** Ivresse du sang : la première pose donne les coups ; chaque charge de plus, du critique. */
const frenzyCrit = (s: Status) => BLOOD_FRENZY_CRIT * (s.stacks - 1)

/**
 * Quatrième demande du 2026-10-27 (docs/MAITRISES.md, « Le contenu des maîtrises », séries 85 à 92 du laboratoire, gravées
 * sur le 3 nu). Élan : critique par charge, et Ferveur par gros coup (Gorak +15,7, Morgrut +7,7 ; la Ferveur seule, +2,6 et
 * +1,6 : les gros coups sont trop rares sans la chance de critique). Surtension : dégâts directs en plus par impact et par
 * charge, la foudre seule (Thaldrin +9,3 ; +2 : +14,1 ; tous ses dégâts directs, la Purification comprise : départ d'Ysolde 35,6 %). Emprise : dégâts par malus de l'adversaire et par charge (Ervald +9,1 ; +2 : +15,1).
 * Larcin : esquive par charge (Ervald +12,6, Aldric +7,6 ; +10 % : +18,1 et +11,7 ; au coup reçu : +21,7, trop). Onde de
 * choc : PV par coup encaissé, ses jauges (3 jauges : Brokk +10,6, Morgrut +9,2 ; 3 PV : +15,4 et +13,6).
 */
export const ONRUSH_CRIT = 0.1
/** Mesure d'ensemble de la refonte des auras (tranche 8, Q12) : +3 → +4, l'Élan de Gorak au départ 40,3 → 42,5 % (+5 : 44,9) */
export const ONRUSH_FERVOR = 4
// Retour du 30 octobre (D11, plus de « 1 » affiché) : +1 → +2 (Pointe de paratonnerre, Chaîne du geôlier ; mesures dans
// docs/RELIQUES.md § 19)
export const OVERCHARGE = 2
export const GRIP = 2
/**
 * Larcin : +5 → +10 % d'esquive par charge (retour du 2026-10-28, A6). Le vrai vol ne prend plus d'aura : le Larcin au
 * départ tombait à 37,9 % (Ervald, 48,6 en 0.127.0) et 46,4 % (Aldric) ; à +10 % : 47,9 et 52,7, gravé Ervald +15,4,
 * Aldric +11,2 (400 par duel)
 */
export const PILFER_DODGE = 0.1
/** Onde de choc : 3 PV par coup encaissé, des trois derniers (D14, retour du 30 octobre ; 2 avant, « faible ») */
export const SHOCKWAVE_PER = 3
export const SHOCKWAVE_SLOTS = 3
/** Épines plantées (D13, retour du 30 octobre) : Saignement par épine quand son coup les enfonce */
export const THORN_BLEED = 2
const thornBleed = (s: Status) => THORN_BLEED * s.stacks
/** Aura de poison (D15, retour du 30 octobre) : Poison posé au début de chacun de ses tours, sans montée */
export const POISON_AURA = 2
/** Emprise : les malus que porte l'adversaire, un par statut (ses charges ne comptent pas), mécanismes exclus */
export const malusCount = (foe: readonly Status[]) => foe.filter((x) => STATUSES[x.id].polarity === 'negative' && !isMechanic(x.id)).length

/**
 * Quatrième demande du 2026-10-27 (docs/MAITRISES.md, « Le contenu du soin », séries 80 à 83 du laboratoire, gravées sur
 * le 3 nu). Dîme : PV que chaque coup de l'adversaire lui coûte et rend au lanceur (2 charges ; 3 × 2 : +19,1, trop).
 * Flamme votive : Brûlure posée à chaque soin (2 charges ; 3 × Brûlure 2 : +11,1, 2 × Brûlure 3 : +14,4). Sangsue : PV
 * rendus par charge de Saignement de l'adversaire, à chaque coup qui touche (×2 : Brokk +21,8, trop). Peau de crapaud :
 * Poison à l'attaquant par coup reçu. Pièce vert-de-gris : Poison sur pile (6 : +12,9 en moyenne ; 5 : +11,4).
 */
export const TITHE_PV = 2
export const VOTIVE_BURN = 3
export const LEECH_HEAL = 1
/** Récolte (retour du 2026-10-30) : PV rendus par charge de Poison de l'adversaire, au coup qui touche */
export const HARVEST_DRAIN = 1
export const TOAD_POISON = 2
export const VERDIGRIS_POISON = 5
/** Égide d'orage (D26, 2026-10-30) : à chaque coup reçu, l'attaquant prend ces éclairs de dégâts directs */
export const STORM_AEGIS_BOLT = 2
export const STORM_AEGIS_BOLTS = 2
/** Grâce (D26) : Ferveur gagnée à chacun de ses prochains soins (4 dans l'étude : Ysolde +20,9, au bord ; 3, au milieu) */
export const GRACE_MOMENTUM = 3
/** Lame enduite (profondeur de l'offre, 2026-10-30) : Poison posé par chacun de ses prochains coups qui touchent */
export const COATED_BLADE_POISON = 2
/** Rage montante (D9) : dégâts de plus à chacun de ses coups, par charge ; une charge par critique reçu */
export const RISING_RAGE = 2
export const RISING_RAGE_CAP = 3
/** Ce que la Rage montante ajoute à chaque coup : 2 par charge, plus son rang (axe `power`) */
export const risingRageBonus = (s: Status) => RISING_RAGE * s.stacks + (s.power ?? 0)
/**
 * Les trois pièces de la refonte des auras (tranche 6, docs/REFONTE_AURAS.md § 5.9) : pile, de l'armure (Pièce de
 * bouclier), des coups bruts tout de suite (Pièce de la rafale), un malus long à l'adversaire (Pièce ensorcelée).
 */
export const SHIELD_COIN_ARMOR = 8
export const VOLLEY_COIN_STRIKES = 2
export const HEX_COIN_WEAKEN = 4
export const HEX_COIN_TURNS = 3

/** Un nombre en toutes lettres, en tête de phrase (au-delà, en chiffres). */
const COUNT_WORDS = ['Zéro', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six']

// « PV » est une abréviation : invariable
const plural = (n: number, word: string) => `${n} ${word}${n > 1 && word !== 'PV' ? 's' : ''}`
const forTurns = (s: Status) => (s.turns === undefined ? '' : `, encore ${plural(s.turns, 'tour')}`)
/** Des dégâts signés, accordés : « +1 dégât », « −2 dégâts ». */
const damageText = (n: number) => `${n < 0 ? '−' : '+'}${plural(Math.abs(n), 'dégât')}`
/** Une perte qui baisse d'un à chaque fois, en toutes valeurs jusqu'à 5 (« 3, 2 puis 1 »), sinon sa première valeur. */
const countdown = (n: number) => (n > 1 && n <= 5 ? Array.from({ length: n }, (_, k) => n - k).join(', ').replace(/, (\d+)$/, ' puis $1') : undefined)
const triangle = (n: number) => (n * (n + 1)) / 2
/** « trois fois », « quatre fois »… ; au-delà, « N fois ». */
const TIMES_WORDS: Record<number, string> = { 2: 'deux fois', 3: 'trois fois', 4: 'quatre fois', 5: 'cinq fois', 6: 'six fois' }
const times = (n: number) => TIMES_WORDS[n] ?? `${n} fois`
/** Le prochain, ou les N prochains : « Son prochain coup reçu », « Ses 2 prochains coups reçus ». */
const next = (n: number, one: string, many: string) => (n > 1 ? many.replace('N', String(n)) : one)

/**
 * PV rendus par Sifflotement à chaque fin de tour, et dégâts retirés par charge de Fausse note (barde). Revue des
 * compétences (P5, P4) : 3 PV au lieu de 2 ; −4 sur deux coups au lieu de −5 sur un.
 */
export const WHISTLE_HEAL = 3
export const FALSE_NOTE = 4

/**
 * Aura de décoction (décision D11 du 2026-10-30) : tous les trois coups qui touchent, Poison 6 (1, 2 puis 3 Poison par
 * coup avant). Départ de Naraxes 52,3 → 53,3 % (laboratoire, série 160, 400 par duel, 0.133.0 ; tous les deux coups,
 * Poison 4 : 57,1 ; Poison 2 par coup : 59,2). Chaque charge de plus : Poison +2.
 */
export const DECOCTION_HITS = 3
export const DECOCTION_POISON = 6

/**
 * Druide : ce que l'ours ajoute à chacun de ses coups (Force de l'ours).
 * +4 en 0.73.0, +3 en 0.76.0 : la compensation des trois éclairs de la Foudre (6 dégâts au lieu de 5).
 */
export const BEAR_MIGHT = 3

/** Aveuglé aiguisé (lot 3) : chaque rang ajoute 10 % de coups ratés, dans le tirage du critique. */
export const BLIND_MISS = 0.1

/** Pile ou face : pile, ce coup ×3 (×2 jusqu'à la 0.106.1). */
export const COIN_HEADS = 3

/**
 * Pièce porte-bonheur (retour du 2026-10-27, R2) : un critique assuré sur pile. Jusqu'à B8 (2026-10-27), 3 critiques
 * assurés (gravée +9,9) ; le critique assuré n'ayant plus qu'une charge, pile pose un critique assuré qui fait aussi
 * ces dégâts en plus (son intensité, comme l'Œil de faucon aiguisé).
 */
export const LUCKY_COIN_POWER = 4

/**
 * Une pièce d'effet aiguisée (2026-10-27) : chaque rang ajoute 1 chance sur 6 de faire pile (3 sur 6, puis 4, puis 5 au
 * plus : `HEADS_CAP` du moteur). Le même nombre que la Pièce lestée, qui en ajoute aussi.
 */
export const COIN_RANK_HEADS = 1 / 6

/** « Une pièce » ; aiguisée, sa chance de pile en sixièmes (« Une pièce, pile 4 fois sur 6 »). */
const coinOdds = (s: Status) => (s.power ? `Une pièce, pile ${Math.min(5, 3 + s.power)} fois sur 6` : 'Une pièce')

/**
 * Aura de sainteté (décision D11 du 2026-10-30) : tous les deux tours, +4 PV à la fin de son tour (+1 puis +2 par tour
 * avant). Départ d'Ysolde 45,6 → 46,7 % (laboratoire, série 161, 400 par duel, 0.133.0 ; +3 : 41,6 ; tous les trois
 * tours, +6 : 44,3). Chaque charge de plus : +2 PV.
 */
export const HOLY_TURNS = 2
export const HOLY_HEAL = 4
/**
 * Aura du brasier (décision D11 du 2026-10-30) : tous les deux tours, la Brûlure de l'adversaire monte de 2 (de 1 à
 * chaque tour avant). Départ de Thaldrin 52,1 → 50,4 % (laboratoire, série 162, 400 par duel, 0.133.0 ; +3 : 57,1 ;
 * tous les trois tours, +3 : 49,8). Chaque charge de plus : Brûlure +2.
 */
export const BRASIER_TURNS = 2
export const BRASIER_BURN = 2
/** Cuir épais (décision D19 du 2026-10-30, Morgrut) : armure temporaire par coup reçu, sans cumul */
export const THICK_HIDE_ARMOR = 3
/** L'intensité d'une aura regroupée (D11) : ses charges au-delà de la première, que porte son compteur */
const tallyPower = (s: Status) => s.stacks - 1
/** Ce que lâche le seuil d'une aura regroupée, selon l'intensité `p` que porte son compteur : +2 ou un impact de plus par cran */
const holyHeal = (p: number) => HOLY_HEAL + 2 * p
const decoctionPoison = (p: number) => DECOCTION_POISON + 2 * p
const brasierBurn = (p: number) => BRASIER_BURN + 2 * p
const stormBolts = (p: number) => STORM_BOLTS + p
const balladShards = (p: number) => BALLAD_NOTES + p

/**
 * Aura de puissance (refonte des auras, § 3.1) : +2 à chacun de ses coups, puis +1 par gros coup (critique, coup ×2 et
 * plus) et par nouvelle pose, jusqu'à +6 : une charge par +1, cinq au plus.
 */
const POWER_AURA_CAP = 5
const powerAuraBonus = (s: Status) => 1 + s.stacks

/** Rancœur (refonte des auras, § 3.1) : Ferveur par coup reçu, sans cumul (à +2, 41,9 % au départ de Morgrut ; à +3, 51,9) */
export const RANCOR_FERVOR = 3
/** Bastion (refonte des auras, § 3.1) : son armure temporaire vidée, l'attaquant perd 3 PV et il regagne 2 d'armure */
export const BASTION_LOSS = 3
export const BASTION_ARMOR = 2
/**
 * Jugement : la faute qui fait tomber le verdict. Retour du 30 octobre (D17) : à la 3e faute, l'attaquant perd 8 PV de
 * Lumière au lieu d'avoir Peur (départ d'Ysolde 49,6 → 49,0 % au laboratoire ; 6 PV : 43,3 ; 10 PV : 53,9)
 */
export const JUDGEMENT_FAULTS = 3
export const VERDICT_LOSS = 8
/**
 * Ballade (décision D22 du 2026-10-30) : une note par coup qui touche ; à la 4e, le refrain, quatre éclats de 2 sur
 * l'adversaire et +4 PV (+1 PV par coup et quatre éclats de 1 avant). Départ de Fanchon 50,5 → 52,4 % (laboratoire,
 * série 125, 0.131.2). Chaque charge de plus : un éclat de plus.
 */
export const BALLAD_NOTES = 4
export const BALLAD_REFRAIN = 2
export const BALLAD_HEAL = 4
/** Veine (refonte des auras, § 3.1) : coups bruts par 6 au dé (un jet complet avant) */
export const VEIN_STRIKES = 2
/**
 * La Visée (refonte des auras, Q5 : des valeurs entières) : chaque esquive et chaque coup qui touche, +1 au multiplicateur
 * de son prochain critique (la Mire), +3 au plus ; le critique la lâche. Mesuré au départ d'Elaria (400 par duel, arbre du
 * 2026-10-28, Duo de Fanchon en chantier) : +1 par esquive 39,1 % ; +2 par esquive 46,9 ; +1 par esquive et 10 %
 * d'esquive 49,1 ; +1 par coup seul 51,8 ; +1 par esquive et par coup, plafond +3 52,9, +4 56,0, sans plafond 57,9
 */
export const AIM_STEP = 1
export const AIM_CAP = 3

/** Focale (retour du 30 octobre, D26) : chaque impact de ses sorts, tant qu'elle brille */
export const SPELL_FOCUS = 2

export const STATUSES: Record<StatusId, StatusDef> = {
  guaranteedCrit: {
    name: 'Critique assuré',
    look: { glow: 'rgba(251,191,36,0.85)' },
    polarity: 'positive',
    family: 'precision',
    summary: 'Son prochain coup est critique ; esquivé ou raté, le critique est perdu.',
    describe: (s) => `Son prochain coup est critique${s.power ? `, et fait ${damageText(s.power)}` : ''}`,
    grafted: (s) => `Ce coup est critique${s.power ? `, et fait ${damageText(s.power)}` : ''}`,
    // Retour de l'utilisateur du 2026-10-27 (B8) : une seule charge, qui ne se cumule pas, pour la prochaine frappe ; un coup
    // esquivé ou raté la perd. Elle remplace l'usure d'une charge par tour (M1, 0.121.0), qui laissait encore les critiques
    // de la Rancune, de la Feinte ou de la Pièce porte-bonheur s'empiler entre deux tours
    detail: () => "Une seule à la fois : une nouvelle pose ne s'ajoute pas. Un coup esquivé ou raté le perd.",
    plural: 'Critiques assurés',
    badge: () => '100 %',
    stacking: 'add',
    maxStacks: 1,
    forcesCrit: true,
    // Son intensité (Œil de faucon aiguisé, Pièce porte-bonheur) : des dégâts en plus au coup critique, après le
    // multiplicateur, avant l'armure. Le statut part avec ce coup : elle ne sert qu'à lui
    modifyOutgoing: (damage, s) => damage + (s.power ?? 0),
    power: (n) => `${damageText(n)} au coup critique`,
  },
  bonusArmor: {
    name: 'Armure temporaire',
    look: { glow: 'rgba(186,198,214,0.95)' },
    polarity: 'positive',
    family: 'guard',
    summary: "Absorbe des dégâts, puis s'use d'autant.",
    describe: (s) => `+${s.stacks} armure temporaire`,
    detail: () => "Elle absorbe les dégâts après l'armure et s'use d'autant ; le coup garde au moins 1 dégât.",
    badge: (s) => String(s.stacks),
    stacking: 'add',
    shield: true,
  },

  poison: {
    name: 'Poison',
    look: { glow: 'rgba(74,222,128,0.75)' },
    polarity: 'negative',
    family: 'affliction',
    // Retour de l'utilisateur du 2026-10-27 (M2) : ses dégâts tombent à la fin du tour de celui qui le subit (au début
    // jusqu'à la 0.120.0, avant son action)
    summary: 'À la fin de ses tours, perd 1 PV par charge, puis une charge part.',
    describe: (s) => {
      const list = countdown(s.stacks)
      if (s.stacks === 1) return 'Perd 1 PV à la fin de son prochain tour'
      return list
        ? `Perd ${list} PV à la fin de ses tours (${triangle(s.stacks)} en tout)`
        : `Perd ${s.stacks} PV à la fin de son prochain tour, puis 1 de moins à chaque tour (${triangle(s.stacks)} en tout)`
    },
    bears: 'est empoisonné',
    badge: (s) => String(s.stacks),
    // Une seule valeur, comme les autres états : dégâts et durée à la fois (0.36.4, demande de l'utilisateur)
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    onTurnEnd: (s) => [{ type: 'damage', amount: s.stacks, source: 'poison' }],
    tickSound: 'fizz',
    opposes: 'regeneration',
  },
  /*
   * Saignement (0.68.0) : le pendant du Poison, qui compte les coups au lieu des tours. Chaque coup qui
   * touche le porteur rouvre la plaie ; plusieurs coups dans une action (Furie des vents, Coup de chance) la
   * vident d'un coup, une esquive ou une action perdue la laissent ouverte. Comme tout statut (règle 9 de
   * RESOLUTION, 2026-10-21), une plaie ouverte pendant un coup ne coule pas sur ce coup, et une plaie grossie y coule
   * de ses charges du début du coup : la plaie de Pourfendre coule dès le coup suivant qui touche le porteur.
   */
  bleed: {
    name: 'Saignement',
    look: { glow: 'rgba(220,38,38,0.85)' },
    polarity: 'negative',
    family: 'affliction',
    summary: 'Chaque coup qui le touche lui fait perdre 1 PV par charge, puis une charge part.',
    describe: (s) => {
      const list = countdown(s.stacks)
      if (s.stacks === 1) return 'Perd 1 PV au prochain coup qui le touche'
      return list
        ? `Perd ${list} PV aux prochains coups qui le touchent (${triangle(s.stacks)} en tout)`
        : `Perd ${s.stacks} PV au prochain coup qui le touche, puis 1 de moins à chaque coup (${triangle(s.stacks)} en tout)`
    },
    detail: () => 'Posé pendant un coup, il coule dès le coup suivant.',
    bears: 'saigne',
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
    family: 'healing',
    summary: 'Regagne des PV au début de chacun de ses tours.',
    describe: (s) => `+${s.stacks} PV au début de chacun de ses tours${forTurns(s)}`,
    badge: (s) => `+${s.stacks}`,
    stacking: 'refresh',
    onTurnStart: (s) => [{ type: 'heal', amount: s.stacks }],
    opposes: 'poison',
  },
  weakened: {
    name: 'Affaibli',
    polarity: 'negative',
    family: 'power',
    summary: 'Ses coups font 1 dégât de moins par charge.',
    describe: (s) => `${damageText(-s.stacks)} à chacun de ses coups${forTurns(s)}`,
    onFoe: (s) => `${damageText(-s.stacks)} à chacun des coups de l'adversaire${forTurns(s)}`,
    detail: () => "Avant l'armure.",
    badge: (s) => `−${s.stacks}`,
    stacking: 'refresh',
    modifyOutgoing: (damage, s) => damage - s.stacks,
  },
  exposed: {
    name: 'Brèche',
    polarity: 'negative',
    family: 'guard',
    summary: 'Son armure perd 1 par charge, 3 au plus.',
    describe: (s) => `−${s.stacks} armure${forTurns(s)}`,
    onFoe: (s) => `−${s.stacks} armure à l'adversaire${forTurns(s)}`,
    badge: (s) => `−${s.stacks}`,
    stacking: 'add',
    maxStacks: 3,
    modifyStats: (stats, s) => ({ ...stats, armor: stats.armor - s.stacks }),
  },

  /* Statuts de résolution (docs/RESOLUTION.md) : la Brûlure est en jeu (Feux follets) ; Vulnérable et Étourdi attendent un porteur. */
  burn: {
    name: 'Brûlure',
    polarity: 'negative',
    family: 'affliction',
    summary: 'Brûlure 3 : il perd 3 PV à la fin de chacun de ses tours, pendant 3 tours. Une nouvelle Brûlure remplace l’ancienne et repart pour autant de tours que sa valeur.',
    bears: 'brûle',
    describe: (s) =>
      s.turns === undefined
        ? `Perd ${plural(s.stacks, 'PV')} à la fin de chacun de ses tours`
        : `Perd ${plural(s.stacks, 'PV')} à la fin de ${s.turns > 1 ? `ses ${s.turns} prochains tours` : 'son prochain tour'}`,
    // Retour du 31 octobre (textes) : une compétence qui l'allume la nomme (Boule de feu, Feux follets), pour que l'Arc
    // électrique, l'Embrasement ou le Soufflet de forge qui la lisent se comprennent
    onFoe: (s) => `Brûlure ${s.stacks} : l'adversaire perd ${plural(s.stacks, 'PV')} à la fin de ${s.turns !== undefined && s.turns > 1 ? `ses ${s.turns} prochains tours` : 'son prochain tour'}`,
    badge: (s) => String(s.stacks),
    // 0.69.0 (demande de l'utilisateur) : une seule valeur, comme le Poison et le Saignement ; la durée
    // suit les dégâts. Avant : deux valeurs posées à part (Feux follets : 3 PV, 3 tours). 2026-10-21 (audit S7) :
    // le médaillon montre les tours restants (3, 2, 1), les PV par tour restent dans l'infobulle.
    counter: 'turns',
    stacking: 'refresh',
    turnsFromStacks: true,
    onTurnEnd: (s) => [{ type: 'damage', amount: s.stacks, source: 'burn' }],
    expiresAt: 'turnEnd',
    // Embrasement (phase 8, second lot) : relâchée d'un coup, ses PV par tour pour chacun de ses tours restants
    releases: (s) => s.stacks * (s.turns ?? 1),
  },
  vulnerable: {
    name: 'Vulnérable',
    polarity: 'negative',
    family: 'guard',
    summary: 'Chaque coup reçu lui fait 1 dégât de plus par charge, 3 au plus.',
    describe: (s) => `${damageText(s.stacks)} à chaque coup reçu${forTurns(s)}`,
    onFoe: (s) => `${damageText(s.stacks)} à chaque coup que l'adversaire reçoit${forTurns(s)}`,
    detail: () => "Avant l'armure.",
    badge: (s) => `+${s.stacks}`,
    stacking: 'add',
    maxStacks: 3,
    modifyIncoming: (damage, s) => damage + s.stacks,
  },
  stunned: {
    name: 'Étourdi',
    polarity: 'negative',
    family: 'tempo',
    summary: 'Perd sa prochaine action.',
    describe: (s) => (s.stacks > 1 ? `Perd ses ${s.stacks} prochaines actions` : 'Perd sa prochaine action'),
    badge: (s) => `×${s.stacks}`,
    stacking: 'add',
    maxStacks: 1,
    skipsAction: true,
    // Une action perdue ne se double pas sur une pile critique (Pièce maudite)
    noCritDouble: true,
  },
  thorns: {
    // Aura d'épines (revue X1, 0.118.1) : une aura sans le nom ; l'id reste `thorns` (traces et tests). Retour du 30
    // octobre (D13, docs/etudes/PERSOS_RETOUR_30.md § 3.1) : les épines plantées. Le Saignement 1 de chaque coup reçu
    // coulait aussitôt (1 PV) ; la plaie se regroupe sur Brokk et s'ouvre quand il rend le coup (départ 49,3 → 49,8 %)
    name: "Aura d'épines",
    look: { aura: 'rgba(132,204,22,0.55)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Chaque coup reçu lui plante une épine. Son prochain coup qui touche les enfonce toutes : Saignement ${THORN_BLEED} par épine.`,
    describe: () => `Chaque coup reçu lui plante une épine ; son prochain coup qui touche les enfonce toutes : Saignement ${THORN_BLEED} par épine`,
    detail: () => 'Les épines restent plantées tant que son coup ne touche pas. Une nouvelle pose ne change rien.',
    badge: () => String(THORN_BLEED),
    counter: 'stacks',
    stacking: 'refresh',
    maxStacks: 1,
    // Son compteur, sur son anneau : le Saignement à venir (PersosB, `tally`)
    tally: 'thornSpike',
    // Pas de `spentOnReaction` : contre une Furie des vents, chaque coup plante son épine
    reactions: { hurt: () => [{ type: 'applyStatus', status: 'thornSpike', stacks: 1 }] },
  },
  // Les épines plantées (D13) : le compteur de l'Aura d'épines sur son porteur ; son prochain coup qui touche les enfonce
  thornSpike: {
    name: 'Épines plantées',
    look: { glow: 'rgba(132,204,22,0.85)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Les épines plantées en lui ; son prochain coup qui touche les enfonce toutes : Saignement ${THORN_BLEED} par épine.`,
    describe: (s) =>
      `${s.stacks > 1 ? `${COUNT_WORDS[s.stacks] ?? s.stacks} épines plantées` : 'Une épine plantée'} ; son prochain coup qui touche fait saigner l'adversaire de ${thornBleed(s)}`,
    detail: () => 'Elles partent toutes à la fois, sur un coup qui touche.',
    // Le Saignement à venir (D11 : un chiffre affiché vaut 2 ou plus, jamais le nombre d'épines)
    badge: (s) => String(thornBleed(s)),
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    reactions: { hit: (s) => [{ type: 'applyStatus', status: 'bleed', stacks: thornBleed(s), target: 'opponent' }] },
    spentOnReaction: true,
  },
  ward: {
    name: 'Garde sacrée',
    polarity: 'positive',
    family: 'seals',
    summary: 'Bloque les prochains malus posés sur lui.',
    describe: (s) => (s.stacks > 1 ? `Bloque les ${s.stacks} prochains malus` : 'Bloque le prochain malus'),
    badge: (s) => `×${s.stacks}`,
    stacking: 'add',
    wards: { polarity: 'negative' },
  },
  lifesteal: {
    name: 'Vol de vie',
    look: { glow: 'rgba(225,29,72,0.85)' },
    polarity: 'positive',
    family: 'healing',
    summary: 'Son prochain coup qui touche lui rend les PV qu’il retire, une charge par coup.',
    // Le rang I rend déjà des PV de plus (revue des compétences, P3 : +2 ; +4 depuis les Maîtrises) : l'intensité posée par la compétence, que ses rangs grossissent
    describe: (s) => {
      const more = s.power ? `, +${s.power}` : ''
      return next(s.stacks, `Son prochain coup qui touche lui rend les PV qu'il retire${more}`, `Ses N prochains coups qui touchent lui rendent les PV qu'ils retirent${more}`)
    },
    grafted: (s) => {
      const more = s.power ? `, +${s.power}` : ''
      if (s.stacks === 1) return `Ce coup lui rend les PV qu'il retire${more}`
      return `Ce coup et ${s.stacks === 2 ? 'le suivant' : `les ${s.stacks - 1} suivants`} lui rendent les PV qu'ils retirent${more}`
    },
    detail: () => 'Un coup esquivé use une charge sans rien rendre.',
    plural: 'Vols de vie',
    badge: (s) => `×${s.stacks}`,
    // 0.45.0 : deux charges par Vol de vie (deux coups drainés), au lieu d'une ; le compteur dit
    // combien de coups drainent encore. Avant : +3 à +4 points, et un « 1 » qui n'apprenait rien.
    stacking: 'add',
    maxStacks: 2,
    drainsHit: true,
    // Aiguisé (0.110.0) : chaque coup drainé rend des PV en plus ; le plafond de 2 charges ne bouge pas
    power: (n) => `+${n} PV par coup qui touche`,
  },
  windFury: {
    name: 'Furie des vents',
    look: { glow: 'rgba(186,230,253,0.95)' },
    polarity: 'positive',
    family: 'tempo',
    summary: "Ce jet ne frappe pas : deux coups à la place, par charge.",
    describe: (s) => `${COUNT_WORDS[furyStrikes(s)] ?? furyStrikes(s)} coups au lieu d'un`,
    detail: () => 'Des coups de base bruts, tout de suite, chacun son dé : leur face ne déclenche aucune compétence.',
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
    power: (n) => `+${plural(n, 'coup')}`,
  },
  evasion: {
    name: 'Esquive améliorée',
    look: { glow: 'rgba(165,243,252,0.8)', opacity: 0.45 },
    polarity: 'positive',
    family: 'evasion',
    summary: 'Esquive à coup sûr le prochain coup reçu.',
    describe: (s) => `Esquive à coup sûr le prochain coup reçu${s.power ? ` ; d'ici là, ses coups font ${damageText(s.power)}` : ''}${forTurns(s)}`,
    grafted: (s) => (s.power ? `Esquive à coup sûr le prochain coup reçu ; d'ici là, ce coup et les suivants font ${damageText(s.power)}` : 'Esquive à coup sûr le prochain coup reçu'),
    detail: () => "Une seule à la fois : une nouvelle pose ne s'ajoute pas.",
    plural: 'Esquives améliorées',
    badge: () => '100 %',
    // 2026-10-25 (décision de l'utilisateur, 0.117.1) : ne se cumule plus. Une charge au plus (`add` plafonné à 1, comme
    // l'Étourdissement : une nouvelle pose garde la plus forte intensité, là où `refresh` la remplacerait par la sienne).
    // Du 2026-10-21 à la 0.117.0 : cumulable, une charge par esquive ; les esquives sûres empilées par la forge (copie,
    // aiguisage, Dé creux, Plume d'aigle) faisaient d'Elaria construite la plus forte presque à chaque build.
    counter: 'stacks',
    stacking: 'add',
    maxStacks: 1,
    forcesDodge: true,
    // Son rang (0.117.1) : l'intensité, des dégâts en plus à ses coups tant qu'elle attend le coup reçu (avant : une charge)
    modifyOutgoing: (damage, s) => damage + (s.power ?? 0),
    power: (n) => `${damageText(n)} par coup en attendant l'esquive`,
  },
  // Lot des consommateurs (docs/PROGRESSION.md § 13.3) : posé par l'Encens de l'abbaye, chaque fois que son porteur
  // regagne des PV. Aucun statut ne disait « +N au prochain coup » : la Puissance dure, la Fausse note est un malus.
  momentum: {
    name: 'Ferveur',
    polarity: 'positive',
    family: 'power',
    summary: 'Son prochain coup qui touche fait 1 dégât de plus par charge.',
    describe: (s) => `Son prochain coup qui touche fait ${damageText(s.stacks)}`,
    detail: () => "Avant l'armure ; toutes les charges partent sur ce coup.",
    badge: (s) => `+${s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    modifyOutgoing: (damage, s) => damage + s.stacks,
    spentOnHit: true,
  },
  /*
   * Phase 8, premier lot (0.114.0, docs/PROGRESSION.md § 13.3, SORTS.md) : trois consommateurs. La Curée (Saignement →
   * coups) reprend la rafale de la Furie, posée par une greffe : elle part juste après le coup de base de son jet. La
   * Rancune (coups encaissés → critiques) s'estompe d'une charge par coup encaissé.
   */
  quarry: {
    name: 'Curée',
    look: { glow: 'rgba(220,38,38,0.85)' },
    polarity: 'positive',
    family: 'tempo',
    summary: `${COUNT_WORDS[QUARRY_STRIKES]} coups de plus par charge, juste après le coup du jet.`,
    describe: (s) => `${COUNT_WORDS[quarryStrikes(s)] ?? quarryStrikes(s)} coups de plus`,
    detail: () => 'Des coups de base bruts, juste après celui du jet, chacun son dé : leur face ne déclenche aucune compétence.',
    badge: (s) => `×${quarryStrikes(s)}`,
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    extraStrikes: QUARRY_STRIKES,
    instantStrikes: true,
  },
  grudge: {
    name: 'Rancune',
    look: { glow: 'rgba(245,158,11,0.85)' },
    polarity: 'positive',
    family: 'precision',
    summary: 'Chaque coup reçu lui donne un critique assuré, une charge par coup.',
    describe: (s) => next(s.stacks, 'Son prochain coup reçu lui donne un critique assuré', 'Ses N prochains coups reçus lui donnent chacun un critique assuré'),
    badge: (s) => `×${s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    reactions: { hurt: () => [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }] },
  },
  /*
   * Phase 8, second lot (docs/SORTS.md § 23) : quatre consommateurs des ressources restées sans eux. L'Embrasement (la
   * Brûlure) et le Dé pipé (la pièce) sont des mécanismes de leur compétence, des charges qui attendent leur moment (comme
   * Pile ou face) : ni bonus ni malus, aucune purge ne les retire. Le Rempart hérissé (l'armure temporaire vidée) et la
   * Vindicte (les dégâts renvoyés) sont des auras.
   */
  conflagration: {
    name: 'Embrasement',
    look: { glow: 'rgba(251,146,60,0.85)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Son prochain coup qui touche un adversaire qui brûle lui fait perdre ${times(CONFLAGRATION_TIMES)} sa Brûlure restante, d'un coup, puis la Brûlure s'éteint.`,
    // Revue des compétences (T6) : la condition en tête, sans « restante » ni « d'un coup » (le détail le dit)
    describe: (s) => {
      const many = times(CONFLAGRATION_TIMES + (s.power ?? 0))
      return next(s.stacks, `Si l'adversaire brûle, son prochain coup qui touche lui fait perdre ${many} sa Brûlure`, `Si l'adversaire brûle, ses N prochains coups qui touchent lui font perdre ${many} sa Brûlure`)
    },
    detail: () => "D'un coup, puis la Brûlure s'éteint ; sans Brûlure, la charge attend.",
    badge: (s) => `×${CONFLAGRATION_TIMES + (s.power ?? 0)}`,
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    decays: true,
    // Une relâche sans Brûlure ne part pas (combat.ts, `fire`) : la charge attend un coup sur un adversaire qui brûle
    reactions: { hit: (s) => [{ type: 'release', status: 'burn', from: 'opponent', min: 0, share: CONFLAGRATION_TIMES + (s.power ?? 0), target: 'opponent', source: 'burn' }] },
    power: (n) => `+${n} fois la Brûlure`,
  },
  // Les Maîtrises (M9, décision de l'utilisateur, 2026-10-27) : une aura de la Chance, « un dé pipé l'est en permanence ».
  // Elle sert toutes ses pièces et grandit avec elles. Jusqu'à la 0.120.0 : un mécanisme de compétence, sa prochaine pièce
  // de Pile ou face tombait sur pile, ce coup ×6 (gravée +11,9 ; en aura, borne haute +5,9 avec la seule Pile ou face)
  loadedDie: {
    name: 'Aura du dé pipé',
    look: { aura: 'rgba(167,139,250,0.5)' },
    polarity: 'positive',
    family: 'fortune',
    summary: `+${Math.round(LOADED_DIE_HEADS * 100)} % de chances de faire pile à ses pièces (5 sur 6 au plus), +${Math.round(LOADED_DIE_EDGE * 100)} % de critique et +${Math.round(LOADED_DIE_EDGE * 100)} % d'esquive, par charge.`,
    describe: (s) =>
      `+${Math.round(LOADED_DIE_HEADS * 100 * s.stacks)} % de chances de faire pile à ses pièces (5 sur 6 au plus), +${Math.round(LOADED_DIE_EDGE * 100 * s.stacks)} % de critique et +${Math.round(LOADED_DIE_EDGE * 100 * s.stacks)} % d'esquive`,
    detail: () => 'Toutes ses pièces ; jamais plus de 5 chances sur 6 de faire pile.',
    badge: (s) => `+${Math.round(LOADED_DIE_HEADS * 100 * s.stacks)} %`,
    counter: 'stacks',
    stacking: 'add',
    headsChance: LOADED_DIE_HEADS,
    modifyStats: (stats, s) => ({ ...stats, critChance: stats.critChance + LOADED_DIE_EDGE * s.stacks, dodgeChance: stats.dodgeChance + LOADED_DIE_EDGE * s.stacks }),
  },
  vendetta: {
    name: 'Aura de vindicte',
    look: { aura: 'rgba(253,186,116,0.5)' },
    polarity: 'positive',
    family: 'power',
    summary: `+${VENDETTA_MOMENTUM} Ferveur par charge chaque fois que son porteur renvoie des dégâts.`,
    describe: (s) => `+${VENDETTA_MOMENTUM * s.stacks} Ferveur chaque fois que son porteur renvoie des dégâts`,
    badge: (s) => `+${VENDETTA_MOMENTUM * s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    reactions: { reflected: (s) => [{ type: 'applyStatus', status: 'momentum', stacks: VENDETTA_MOMENTUM * s.stacks }] },
  },

  /* Humains et hommes-lézards (0.30.0). */
  fear: {
    name: 'Peur',
    look: { glow: 'rgba(148,163,184,0.7)', motion: 'tremble' },
    polarity: 'negative',
    family: 'tempo',
    summary: 'Terrifié, il perd sa prochaine action.',
    describe: () => 'Perd sa prochaine action',
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
    family: 'fortune',
    summary: `Juste après son coup, une pièce : pile, ce coup ×${COIN_HEADS} ; face, rien.`,
    describe: (s) => `Une pièce : pile, ce coup ×${COIN_HEADS + (s.power ?? 0)} ; face, rien`,
    detail: () => 'Pile compte comme un coup qui touche.',
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
  /*
   * Les pièces de la Fortune (retour du 2026-10-27, M10 et R2 ; docs/RELIQUES.md § 17) : même geste que Pile ou face
   * (la pièce part juste après le coup qui touche ; pile, un gros effet ; face, rien), une nature d'effet chacune. Pile ou
   * face frappe ; la Pièce porte-bonheur donne un bonus à son lanceur ; la Pièce maudite, un malus à l'adversaire.
   */
  luckyCoin: {
    name: 'Pièce porte-bonheur',
    look: { glow: 'rgba(52,211,153,0.85)', coin: 'hue-rotate(95deg) saturate(1.3)' },
    polarity: 'positive',
    family: 'fortune',
    summary: `Juste après son coup, une pièce : pile, un critique assuré qui fait ${damageText(LUCKY_COIN_POWER)} ; face, rien.`,
    describe: (s) => `${coinOdds(s)} : pile, un critique assuré qui fait ${damageText(LUCKY_COIN_POWER)} ; face, rien`,
    badge: () => damageText(LUCKY_COIN_POWER),
    stacking: 'refresh',
    mechanic: 'skill',
    maxStacks: 1,
    coinToss: { heads: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1, power: LUCKY_COIN_POWER }] },
    // Aiguisée : pile plus souvent (`COIN_RANK_HEADS`), comme toutes les pièces d'effet
    power: (n) => `+${n} chance${n > 1 ? 's' : ''} sur 6 de faire pile`,
  },
  cursedCoin: {
    name: 'Pièce maudite',
    look: { glow: 'rgba(167,139,250,0.85)', coin: 'hue-rotate(230deg) saturate(0.9) brightness(0.85)' },
    polarity: 'positive',
    family: 'fortune',
    summary: "Juste après son coup, une pièce : pile, l'adversaire perd sa prochaine action ; face, rien.",
    describe: (s) => `${coinOdds(s)} : pile, l'adversaire perd sa prochaine action ; face, rien`,
    badge: () => '×1',
    stacking: 'refresh',
    mechanic: 'skill',
    maxStacks: 1,
    coinToss: { heads: [{ type: 'applyStatus', status: 'stunned', stacks: 1, target: 'opponent' }] },
    power: (n) => `+${n} chance${n > 1 ? 's' : ''} sur 6 de faire pile`,
  },
  luckyStrike: {
    name: 'Coup de chance',
    look: { glow: 'rgba(52,211,153,0.85)' },
    polarity: 'positive',
    family: 'fortune',
    summary: 'Un dé de frappe de plus à sa prochaine action, par charge ; sur un Doublé, la compétence repart.',
    describe: (s) =>
      next(s.stacks, 'Un dé de frappe de plus à sa prochaine action ; sur un Doublé, la compétence repart', 'N dés de frappe de plus à sa prochaine action ; sur un Doublé, la compétence repart'),
    detail: () => "Un dé de frappe porte un coup de base, sans compétence. Doublé : s'il fait la même face que le dé de compétence de l'action, la compétence de cette face repart.",
    plural: 'Coups de chance',
    badge: (s) => `+${s.stacks}d6`,
    // 0.50.0 (demande de l'utilisateur) : cumulable, un d6 par charge, toutes les charges à la prochaine action
    counter: 'stacks',
    stacking: 'add',
    extraStrikes: 1,
    strikeCharges: 'all',
    // 0.107.0 (SORTS.md § 19) : le jet qui le pose se greffe (son coup part) ; remplacer le coup en faisait perdre un
    // pour en gagner un plus tard (+3 points gravé). D5 du retour du 30 octobre (« le Doublé ») : chaque dé donné est un
    // dé de frappe, sauf Doublé (docs/etudes/DES_SUPPLEMENTAIRES.md, S2)
  },

  /* Paladin (0.31.0). */
  riposte: {
    name: 'Riposte',
    look: { glow: 'rgba(253,230,138,0.9)' },
    polarity: 'positive',
    family: 'retaliation',
    summary: "Son prochain coup reçu renvoie tous ses dégâts à l'attaquant, une charge par coup.",
    describe: (s) => {
      const more = s.power ? `, +${s.power},` : ''
      return next(
        s.stacks,
        `Son prochain coup reçu renvoie tous ses dégâts${more} à l'attaquant`,
        `Ses N prochains coups reçus renvoient chacun tous leurs dégâts${more} à l'attaquant`,
      )
    },
    detail: () => 'Un coup sans dé : il s’esquive, critique et se heurte à l’armure ; aucun renvoi n’y répond.',
    badge: () => '100 %',
    // 0.50.0 : deux charges par Riposte (deux coups renvoyés), comme le Vol de vie
    counter: 'stacks',
    stacking: 'add',
    maxStacks: 2,
    // Refonte des auras (2026-10-28, Q6, docs/REFONTE_AURAS.md § 5.6) : le coup entier, pour tous ses porteurs (la moitié
    // jusque-là ; gravée, +6,4 de plus chez Brokk, +5,5 chez Morgrut)
    reflectsHit: 1,
    // Aiguisée (0.110.0) : chaque coup renvoyé l'est de quelques PV de plus ; le plafond de 2 charges ne bouge pas
    power: (n) => `+${n} à chaque coup renvoyé`,
  },
  retribution: {
    name: 'Rétribution',
    polarity: 'positive',
    family: 'retaliation',
    summary: 'Garde les dégâts des trois derniers coups reçus ; sa compétence les renvoie.',
    describe: (s) => `Jauges : ${(s.slots ?? []).join(' · ') || 'vides'} (${s.stacks} PV gardé${s.stacks > 1 ? 's' : ''})`,
    // Le compteur : le nombre de coups que sa compétence enverra, un par jauge remplie (retour du 2026-10-27, S1 ; les
    // PV gardés jusque-là). Leur valeur se lit dans l'infobulle
    badge: (s) => String((s.slots ?? []).filter((n) => n > 0).length),
    stacking: 'refresh',
    mechanic: 'skill',
    fillsOnHurt: { slots: 3 },
  },

  /* Auras : bonus permanents (sans durée) posés sur un 3 au dé, pour le reste du combat. */
  frostAura: {
    // Retour du 2026-10-28 (A3) : « Aura glaciale » redevient « Aura de poison » (id `frostAura` gardé : historique)
    name: 'Aura de poison',
    // Vert toxique (bleu glacé jusqu'au 2026-10-28, quand elle s'appelait l'Aura glaciale)
    look: { aura: 'rgba(74,222,128,0.55)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Au début de chacun de ses tours, Poison ${POISON_AURA} à l'adversaire.`,
    describe: () => `Poison ${POISON_AURA} à l'adversaire au début de chacun de ses tours`,
    detail: () => 'Le Poison s’ajoute à celui qu’il porte déjà. Une nouvelle pose ne change rien.',
    badge: () => `+${POISON_AURA}`,
    counter: 'stacks',
    // 0.69.0 (choix de l'utilisateur, SORTS.md § 15) : elle pose du vrai Poison au lieu de dégâts directs
    // au début du tour adverse (0.45.0). Un seul statut, une seule règle : l'immunité le bloque, la
    // Régénération l'annule, une purge l'enlève, sans crochet propre. Retour du 30 octobre (D15) : Poison 2 à chaque tour,
    // sans montée (1, 1, 2, 2 puis 3 avant : un « 1 » au début, et sans fin dans un combat long)
    stacking: 'refresh',
    maxStacks: 1,
    onTurnStart: () => [{ type: 'applyStatus', status: 'poison', stacks: POISON_AURA, target: 'opponent' }],
  },
  powerAura: {
    name: 'Aura de puissance',
    look: { aura: 'rgba(251,146,60,0.55)' },
    polarity: 'positive',
    family: 'power',
    summary: `+2 dégâts à chacun de ses coups ; chacun de ses gros coups ajoute +1, jusqu'à +${POWER_AURA_CAP + 1}.`,
    describe: (s) => `${damageText(powerAuraBonus(s))} à chacun de ses coups`,
    detail: () =>
      `Après le critique, avant l'armure. Chaque gros coup (un critique, un coup ×2 et plus) et chaque nouvelle pose ajoutent +1, jusqu'à +${POWER_AURA_CAP + 1}.`,
    badge: (s) => `+${powerAuraBonus(s)}`,
    counter: 'stacks',
    // 0.107.0 (SORTS.md § 19) : non cumulable ; revue des auras (A4) : +2, +3 puis +4 par nouvelle pose. Refonte des auras
    // (2026-10-28, § 3.1, Morgrut) : un convertisseur, chacun de ses gros coups le rend plus lourd (+2 jusqu'à +6). Mesure
    // de la conception : Puissance qui monte / Assaut, 54,8 % au départ de Morgrut (51,0 pour tous, W5)
    stacking: 'add',
    maxStacks: POWER_AURA_CAP,
    modifyOutgoing: (damage, s) => damage + powerAuraBonus(s),
    // Au plafond, la réaction ne part plus (une aura qui reposerait un statut à son plafond, combat.ts)
    reactions: { heavy: () => [{ type: 'applyStatus', status: 'powerAura', stacks: 1 }] },
  },
  // Refonte des auras (2026-10-28, docs/REFONTE_AURAS.md § 4) : l'Aura d'immunité devient l'Ampoule bénite, une relique
  // qui pose ce statut pour ses premiers tours (une règle de défense, pas un moteur de build)
  immunity: {
    name: 'Immunité',
    look: { glow: 'rgba(253,224,71,0.85)' },
    polarity: 'positive',
    family: 'seals',
    summary: 'Aucun malus ne peut lui être posé.',
    describe: (s) => `Aucun malus ne peut lui être posé${forTurns(s)}`,
    badge: () => '∞',
    counter: 'turns',
    stacking: 'refresh',
    maxStacks: 1,
    immune: 'negative',
  },
  holyAura: {
    name: 'Aura de sainteté',
    look: { aura: 'rgba(254,243,199,0.6)' },
    polarity: 'positive',
    family: 'healing',
    summary: `Tous les ${COUNT_WORDS[HOLY_TURNS].toLowerCase()} tours, à la fin de son tour, elle lui rend ${plural(HOLY_HEAL, 'PV')}.`,
    describe: (s) => `Tous les ${COUNT_WORDS[HOLY_TURNS].toLowerCase()} tours, à la fin de son tour, elle lui rend ${plural(holyHeal(tallyPower(s)), 'PV')}`,
    detail: () => `Son anneau compte ses tours (1/${HOLY_TURNS}). Chaque nouvelle pose : +2 PV.`,
    badge: (s) => `+${holyHeal(tallyPower(s))}`,
    counter: 'stacks',
    stacking: 'add',
    // 0.42.0 : un plafond ; 0.107.0 : 2 charges de 1 PV ; refonte des auras (2026-10-28, § 2) : la montée, 1 puis 2.
    // Décision D11 (2026-10-30) : regroupée, +4 PV tous les deux tours (son compteur, le Recueillement)
    tally: 'holyVigil',
    onTurnEnd: (s) => [{ type: 'applyStatus', status: 'holyVigil', stacks: 1, power: tallyPower(s) }],
  },
  // Le compteur de l'Aura de sainteté (D11) : à son 2e tour, le soin
  holyVigil: {
    name: 'Recueillement',
    look: { glow: 'rgba(254,243,199,0.85)' },
    polarity: 'positive',
    family: 'healing',
    summary: `Les tours de l'Aura de sainteté ; au ${HOLY_TURNS}e, elle lui rend ${plural(HOLY_HEAL, 'PV')}.`,
    describe: (s) => `${s.stacks} sur ${HOLY_TURNS} tours ; au ${HOLY_TURNS}e, l'Aura de sainteté lui rend ${plural(holyHeal(s.power ?? 0), 'PV')}`,
    badge: (s) => `${s.stacks}/${HOLY_TURNS}`,
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    threshold: { at: HOLY_TURNS, effects: (s) => [{ type: 'heal', amount: holyHeal(s.power ?? 0) }] },
  },
  // Sentence (phase 8, 0.114.0) : elle consomme les soins du porteur ; dégâts directs de Lumière, sans chaîne. Refonte des
  // auras (2026-10-28) : ses prochains soins, une charge chacun, comme la Flamme votive
  sentence: {
    name: 'Sentence',
    look: { glow: 'rgba(254,240,138,0.85)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Chacun de ses prochains soins fait perdre ${plural(SENTENCE_LOSS, 'PV')} à l'adversaire.`,
    describe: (s) => {
      const loss = plural(SENTENCE_LOSS + (s.power ?? 0), 'PV')
      return next(s.stacks, `Son prochain soin fait perdre ${loss} à l'adversaire`, `Ses N prochains soins font perdre chacun ${loss} à l'adversaire`)
    },
    detail: () => 'En dégâts directs.',
    badge: (s) => `−${SENTENCE_LOSS + (s.power ?? 0)}`,
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    reactions: { healed: (s) => [{ type: 'damage', amount: SENTENCE_LOSS + (s.power ?? 0), target: 'opponent', source: 'holy' }] },
    power: (n) => `+${plural(n, 'PV')} par soin`,
  },
  decoctionAura: {
    name: 'Aura de décoction',
    look: { aura: 'rgba(163,230,53,0.5)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Tous les ${COUNT_WORDS[DECOCTION_HITS].toLowerCase()} coups qui touchent, Poison ${DECOCTION_POISON} à l'adversaire.`,
    describe: (s) => `Tous les ${COUNT_WORDS[DECOCTION_HITS].toLowerCase()} coups qui touchent, Poison ${decoctionPoison(tallyPower(s))} à l'adversaire`,
    detail: () => `Son anneau compte ses coups qui touchent (1/${DECOCTION_HITS}). Chaque nouvelle pose : Poison +2.`,
    badge: (s) => `+${decoctionPoison(tallyPower(s))}`,
    counter: 'stacks',
    stacking: 'add',
    // Refonte des auras (2026-10-28, § 2) : la montée, 1, 2 puis 3. Décision D11 (2026-10-30) : regroupée, Poison 6 tous
    // les trois coups qui touchent (son compteur, la Dose)
    tally: 'decoctionDose',
    reactions: { hit: (s) => [{ type: 'applyStatus', status: 'decoctionDose', stacks: 1, power: tallyPower(s) }] },
  },
  // Le compteur de l'Aura de décoction (D11) : à son 3e coup qui touche, le Poison
  decoctionDose: {
    name: 'Dose',
    look: { glow: 'rgba(163,230,53,0.85)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Les coups qui touchent de l'Aura de décoction ; au ${DECOCTION_HITS}e, Poison ${DECOCTION_POISON} à l'adversaire.`,
    describe: (s) => `${s.stacks} sur ${DECOCTION_HITS} coups qui touchent ; au ${DECOCTION_HITS}e, Poison ${decoctionPoison(s.power ?? 0)} à l'adversaire`,
    badge: (s) => `${s.stacks}/${DECOCTION_HITS}`,
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    threshold: { at: DECOCTION_HITS, effects: (s) => [{ type: 'applyStatus', status: 'poison', stacks: decoctionPoison(s.power ?? 0), target: 'opponent' }] },
  },

  /* Druide (0.35.0). */
  firefly: {
    name: 'Luciole',
    look: { motion: 'fireflies' },
    polarity: 'negative',
    family: 'evasion',
    summary: 'Il ne peut plus esquiver, et chaque coup reçu lui fait +2 dégâts ; chaque coup qui le touche chasse une luciole.',
    describe: (s) => `Ne peut plus esquiver, et chaque coup reçu lui fait +2 dégâts ; ${next(s.stacks, 'le prochain coup reçu les chasse', 'N coups reçus les chassent')}`,
    badge: (s) => String(s.stacks),
    counter: 'stacks',
    stacking: 'add',
    modifyStats: (stats) => ({ ...stats, dodgeChance: 0 }),
    // +2 par coup, quel que soit le nombre de charges : chaque charge est déjà un coup
    modifyIncoming: (damage) => damage + 2,
    spentOnHurt: true,
  },

  /*
   * Druide (0.73.0, SORTS.md § 18) : un tour sur deux, l'homme lance un sort ; l'autre tour, la bête frappe.
   * Les deux règles de forme sont des mécanismes de forme (`mechanic: 'form'`), visibles dans l'en-tête. Règles v2,
   * phase 5 bis : l'homme frappe aussi, d'un coup de base sur lequel son sort se greffe ; l'ours, du même coup de base,
   * plus fort (un type d'attaque unique depuis le 2026-10-24).
   */
  casting: {
    name: 'Incantation',
    look: { glow: 'rgba(163,230,53,0.7)' },
    polarity: 'positive',
    family: 'fortune',
    summary: 'Sous forme humaine, ses sorts partent sur leurs faces ; sous forme d’ours, ils se taisent.',
    describe: () => 'Ses sorts partent, puis un coup',
    badge: () => 'Sort',
    // Une règle, pas une réserve : aucun nombre sur le médaillon (`turns` sans durée n'affiche rien)
    counter: 'turns',
    stacking: 'refresh',
    maxStacks: 1,
    mechanic: 'form',
    // Jusqu'à la 0.104.0, son dé devenait un d3 (trois sorts sur le 1, le 2 et le 3) ; du d6 imprimé à la 0.112.0, chaque
    // face portait son sort (Foudre sur 1 à 3, Feux follets sur 4 à 6) ; depuis la 0.113.0, son dé vanilla : Feux follets
    // sur le 1, Foudre sur le 2, quatre faces nues
  },
  bearMight: {
    name: "Force de l'ours",
    look: { glow: 'rgba(180,83,9,0.7)' },
    polarity: 'positive',
    family: 'power',
    summary: `Sous forme d'ours, seules ses gravures partent, et ses coups font +${BEAR_MIGHT} dégâts.`,
    describe: () => `${damageText(BEAR_MIGHT)} à chacun de ses coups`,
    detail: () => "Après le critique, avant l'armure.",
    badge: () => `+${BEAR_MIGHT}`,
    counter: 'turns',
    stacking: 'refresh',
    maxStacks: 1,
    mechanic: 'form',
    modifyOutgoing: (damage) => damage + BEAR_MIGHT,
  },

  /* Barde (0.41.0) : ses compétences sur les faces depuis la phase 5 ter (doubles avant) ; un seul d6 depuis le Duo.
     Noms du 2026-10-30 (D23) : Sifflotement → Répit, Fausse note → Main tremblante, Duo → Écho (ids inchangés). */
  whistling: {
    name: 'Répit',
    polarity: 'positive',
    family: 'healing',
    summary: `+${WHISTLE_HEAL} PV à la fin de ses tours, pendant autant de tours que de charges.`,
    describe: (s) => `+${WHISTLE_HEAL} PV à la fin de ${s.stacks > 1 ? `ses ${s.stacks} prochains tours` : 'son prochain tour'} (${WHISTLE_HEAL * s.stacks} en tout)`,
    badge: (s) => `+${WHISTLE_HEAL * s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    onTurnEnd: () => [{ type: 'heal', amount: WHISTLE_HEAL }],
  },
  falseNote: {
    name: 'Main tremblante',
    polarity: 'negative',
    family: 'power',
    summary: `Son prochain coup qui touche fait ${FALSE_NOTE} dégâts de moins par charge.`,
    // Revue des compétences (P4) : la compétence la pose déjà pour deux coups (une intensité de 1), chacun à −4
    describe: (s) =>
      s.power
        ? `Ses ${1 + s.power} prochains coups qui touchent font ${damageText(-FALSE_NOTE * s.stacks)}`
        : `Son prochain coup qui touche fait ${damageText(-FALSE_NOTE * s.stacks)}`,
    onFoe: (s) =>
      s.power
        ? `Les ${1 + s.power} prochains coups de l'adversaire qui touchent font ${damageText(-FALSE_NOTE * s.stacks)}`
        : `Le prochain coup de l'adversaire qui touche fait ${damageText(-FALSE_NOTE * s.stacks)}`,
    detail: () => "Après l'armure ; le coup garde au moins 1 dégât.",
    badge: (s) => `−${FALSE_NOTE * s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    modifyFinal: (damage, s) => damage - FALSE_NOTE * s.stacks,
    spentOnHit: true,
    // Aiguisée (0.110.0) : elle dure un coup de plus par rang (un coup qui touche use l'intensité avant le statut) ; des
    // charges de plus ne gagnaient presque rien, la première rabat déjà souvent le coup à 1
    power: (n) => `+${plural(n, 'coup')}`,
  },
  // Le Duo (2026-10-25, piste D validée par l'utilisateur) : le second dé de la barde vit dans sa signature. Refonte des
  // auras (2026-10-28, Q8, docs/REFONTE_AURAS.md § 5.8) : des coups de plus, tout de suite, des coups bruts (la rafale de
  // la Curée) ; plus de dés complets qui relançaient un Duo (la boule de neige, A11). Trois, puis un (tranche 8) : son
  // coup et un coup de plus, le duo
  duo: {
    name: 'Écho',
    look: { glow: 'rgba(196,181,253,0.85)' },
    polarity: 'positive',
    family: 'tempo',
    summary: `${COUNT_WORDS[DUO_STRIKES]} coup${DUO_STRIKES > 1 ? 's' : ''} de plus par charge, juste après le coup du jet.`,
    describe: (s) => `${COUNT_WORDS[duoStrikes(s)] ?? duoStrikes(s)} coup${duoStrikes(s) > 1 ? 's' : ''} de plus`,
    detail: () => 'Des coups de base bruts, juste après celui du jet, chacun son dé : leur face ne déclenche aucune compétence.',
    badge: (s) => `×${duoStrikes(s)}`,
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    extraStrikes: DUO_STRIKES,
    instantStrikes: true,
    // Aiguisé : un coup de plus par rang, comme la Furie des vents
    power: (n) => `+${plural(n, 'coup')}`,
  },

  /*
   * Revue des auras et des compétences (docs/REVUE_COMPETENCES.md, I1, I3, I4) : trois auras qui bouchent un trou de
   * famille. Le Bouclier de foi consomme les soins du porteur (Soin → Garde, la boucle d'Ysolde : il nourrit aussi l'armure
   * vidée) ; le Pas de côté est la première esquive permanente ; la Plaie ouverte, la seconde consommatrice de critiques
   * (Précision → Saignement).
   */
  // Refonte des auras (2026-10-28, docs/REFONTE_AURAS.md § 4) : une compétence à charges, ses prochains soins
  faithShield: {
    name: 'Bouclier de foi',
    look: { glow: 'rgba(253,230,138,0.85)' },
    polarity: 'positive',
    family: 'guard',
    summary: `Chacun de ses prochains soins lui donne +${FAITH_SHIELD_ARMOR} armure temporaire.`,
    describe: (s) => {
      const armor = FAITH_SHIELD_ARMOR + (s.power ?? 0)
      return next(s.stacks, `Son prochain soin lui donne +${armor} armure temporaire`, `Ses N prochains soins lui donnent chacun +${armor} armure temporaire`)
    },
    badge: (s) => `+${FAITH_SHIELD_ARMOR + (s.power ?? 0)}`,
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    reactions: { healed: (s) => [{ type: 'applyStatus', status: 'bonusArmor', stacks: FAITH_SHIELD_ARMOR + (s.power ?? 0) }] },
    power: (n) => `+${n} armure temporaire par soin`,
  },
  openWound: {
    name: 'Aura des plaies',
    look: { aura: 'rgba(220,38,38,0.5)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Chacun de ses critiques pose ${OPEN_WOUND_BLEED} Saignement par charge à l'adversaire.`,
    describe: (s) => `${OPEN_WOUND_BLEED * s.stacks} Saignement à l'adversaire à chacun de ses critiques`,
    detail: () => 'Posé pendant le coup, le Saignement coule dès le coup suivant.',
    badge: (s) => `+${OPEN_WOUND_BLEED * s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    // Refonte des auras (2026-10-28, § 3.1, § 5.1) : au critique, la Saignée d'Elaria (Odeur du sang : le critique fait
    // saigner, le saignement fait critiquer). 3 par critique : 48,1 % au départ ; 4 : 54,2
    reactions: { crit: (s) => [{ type: 'applyStatus', status: 'bleed', stacks: OPEN_WOUND_BLEED * s.stacks, target: 'opponent' }] },
  },
  // Phase 8, lot 3 (docs/SORTS.md § 29) : les malus de famille manquants, Garde, Fortune, Précision, Soin, Sceaux
  guardBreak: {
    name: 'Garde brisée',
    polarity: 'negative',
    family: 'guard',
    summary: 'Son prochain coup reçu ×2 et brise son armure temporaire.',
    describe: (s) =>
      next(s.stacks, 'Son prochain coup reçu ×2 et brise son armure temporaire', 'Ses N prochains coups reçus ×2 et brisent son armure temporaire'),
    onFoe: (s) =>
      s.stacks > 1
        ? `Les ${s.stacks} prochains coups que reçoit l'adversaire ×2 et brisent son armure temporaire`
        : "Le prochain coup que reçoit l'adversaire ×2 et brise son armure temporaire",
    bears: 'a la garde brisée',
    plural: 'Gardes brisées',
    badge: (s) => `×${s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    modifyIncoming: (damage) => damage * 2,
    spentOnHurt: true,
    shatters: true,
  },
  jinx: {
    name: 'Malchance',
    polarity: 'negative',
    family: 'fortune',
    summary: 'Son prochain jet sur une compétence tombe à vide.',
    describe: (s) => next(s.stacks, 'Son prochain jet sur une compétence tombe à vide', 'Ses N prochains jets sur une compétence tombent à vide'),
    onFoe: (s) =>
      s.stacks > 1 ? `Les ${s.stacks} prochains jets de l'adversaire sur une compétence tombent à vide` : "Le prochain jet de l'adversaire sur une compétence tombe à vide",
    detail: () => 'Ni la compétence ni le coup de base. Un jet sur une face nue ne l’use pas.',
    plural: 'Malchances',
    badge: (s) => `×${s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    jinxesRoll: true,
  },
  blinded: {
    name: 'Aveuglé',
    polarity: 'negative',
    family: 'precision',
    summary: 'Ses critiques ratent.',
    describe: (s) => `Ses critiques ratent${s.power ? `, et +${Math.round(BLIND_MISS * 100 * s.power)} % de coups ratés` : ''}${forTurns(s)}`,
    onFoe: (s) => `Les critiques de l'adversaire ratent${s.power ? `, et +${Math.round(BLIND_MISS * 100 * s.power)} % de coups ratés` : ''}${s.turns === undefined ? ", jusqu'à la fin du combat" : forTurns(s)}`,
    bears: 'est aveuglé',
    badge: () => '×0',
    stacking: 'refresh',
    maxStacks: 1,
    blinds: true,
    power: (n) => `+${Math.round(BLIND_MISS * 100 * n)} % de coups ratés`,
  },
  hemorrhage: {
    name: 'Hémorragie',
    polarity: 'negative',
    family: 'healing',
    summary: 'Ne regagne plus de PV.',
    describe: () => 'Ne regagne plus de PV',
    onFoe: () => "L'adversaire ne regagne plus de PV, jusqu'à la fin du combat",
    detail: () => 'Ni soin, ni vol de vie, ni aura.',
    badge: () => '0',
    stacking: 'refresh',
    maxStacks: 1,
    modifyHealing: () => 0,
  },
  sealTheft: {
    name: 'Sceau de vol',
    polarity: 'negative',
    family: 'seals',
    summary: 'Son prochain bonus va à l’adversaire.',
    describe: (s) => (s.stacks > 1 ? `Ses ${s.stacks} prochains bonus vont à l'adversaire` : "Son prochain bonus va à l'adversaire"),
    onFoe: (s) => (s.stacks > 1 ? `Vole les ${s.stacks} prochains bonus de l'adversaire` : "Vole le prochain bonus de l'adversaire"),
    detail: () => 'Le prochain bonus qu’il se donne revient au lanceur à sa place, entier. Une aura ne se vole pas.',
    plural: 'Sceaux de vol',
    badge: (s) => `×${s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    stealsBonus: true,
  },
  /*
   * Phase 8, lot 3 (docs/SORTS.md § 28) : des auras qui remplissent les fils minces. La Feinte nourrit sa propre
   * ressource (l'esquive) et la convertit en critiques ; le Ciel d'orage frappe l'adversaire à chaque début de tour du
   * porteur, en dégâts directs ; l'Ivresse du sang change chaque critique en deux coups bruts.
   */
  feint: {
    // Refonte des auras (2026-10-28, § 3.1, § 5.1 ; Q5 : des valeurs entières) : la Feinte devient la Visée. Plus de
    // critique assuré (B8 l'avait éteint à une charge) : chaque esquive met en joue, +1 au multiplicateur de son prochain
    // critique (la Mire), qui s'accumule jusqu'à ce critique ; l'Œil de faucon est le tir. Id `feint` gardé (historique)
    name: 'Aura de visée',
    look: { aura: 'rgba(52,211,153,0.5)' },
    polarity: 'positive',
    family: 'precision',
    summary: `+${Math.round(FEINT_DODGE * 100)} % d'esquive par charge ; chaque esquive et chaque coup qui touche ajoutent +${AIM_STEP} au multiplicateur de son prochain critique, +${AIM_CAP} au plus.`,
    describe: (s) =>
      `+${Math.round(FEINT_DODGE * 100 * s.stacks)} % d'esquive. Chaque esquive et chaque coup qui touche ajoutent +${AIM_STEP} au multiplicateur de son prochain critique, +${AIM_CAP} au plus`,
    detail: () => 'La Mire s’accumule jusqu’à son prochain critique, qui la lâche. Chaque nouvelle pose ajoute +5 % d’esquive.',
    badge: (s) => `+${Math.round(FEINT_DODGE * 100 * s.stacks)} %`,
    counter: 'stacks',
    stacking: 'add',
    modifyStats: (stats, s) => ({ ...stats, dodgeChance: stats.dodgeChance + FEINT_DODGE * s.stacks }),
    reactions: {
      dodge: () => [{ type: 'applyStatus', status: 'aim', stacks: AIM_STEP }],
      hit: () => [{ type: 'applyStatus', status: 'aim', stacks: AIM_STEP }],
    },
  },
  // La Mire (la Visée, refonte des auras) : un chiffre qui grossit en attendant le coup ; le critique la lâche entière
  aim: {
    name: 'Mire',
    look: { glow: 'rgba(52,211,153,0.85)' },
    polarity: 'positive',
    family: 'precision',
    summary: `+1 au multiplicateur de son prochain critique, par charge ; ${AIM_CAP} charges au plus.`,
    describe: (s) => `+${s.stacks} au multiplicateur de son prochain critique`,
    detail: () => 'Elle s’accumule jusqu’à ce critique, qui la lâche entière.',
    badge: (s) => `×+${s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    maxStacks: AIM_CAP,
    modifyStats: (stats, s) => ({ ...stats, critMultiplier: stats.critMultiplier + s.stacks }),
    reactions: { crit: () => [] },
    spentOnReaction: true,
  },
  stormSky: {
    name: "Aura d'orage",
    look: { aura: 'rgba(186,230,253,0.55)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Tous les ${COUNT_WORDS[STORM_TURNS].toLowerCase()} tours, au début de son tour, l'orage éclate : ${COUNT_WORDS[STORM_BOLTS].toLowerCase()} éclairs de ${STORM_BOLT} sur l'adversaire.`,
    describe: (s) =>
      `Tous les ${COUNT_WORDS[STORM_TURNS].toLowerCase()} tours, au début de son tour, l'orage éclate : l'adversaire perd ${plural(STORM_BOLT, 'PV')} ${times(stormBolts(tallyPower(s)))}`,
    detail: () => `Son anneau compte ses tours (1/${STORM_TURNS}). Des éclairs de dégâts directs ; chaque nouvelle pose : un éclair de plus.`,
    badge: (s) => `${stormBolts(tallyPower(s))}×${STORM_BOLT}`,
    counter: 'stacks',
    stacking: 'add',
    // Refonte des auras (2026-10-28, § 2) : la montée, 1 puis 2 éclairs de 1. Décision D20 (2026-10-30) : regroupée, trois
    // éclairs de 2 tous les trois tours (son compteur, la Nuée)
    tally: 'stormCloud',
    onTurnStart: (s) => [{ type: 'applyStatus', status: 'stormCloud', stacks: 1, power: tallyPower(s) }],
    // L'orage qui éclate : l'arène s'assombrit et ses éclairs tombent comme ceux de la Foudre (§ 3.2)
    scene: ({ hits }) => (hits >= 2 ? 'lightning' : undefined),
  },
  // Le compteur de l'Aura d'orage (D20) : à son 3e tour, l'orage éclate
  stormCloud: {
    name: 'Nuée',
    look: { glow: 'rgba(186,230,253,0.85)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Les tours de l'Aura d'orage ; au ${STORM_TURNS}e, l'orage éclate : ${COUNT_WORDS[STORM_BOLTS].toLowerCase()} éclairs de ${STORM_BOLT} sur l'adversaire.`,
    describe: (s) => `${s.stacks} sur ${STORM_TURNS} tours ; au ${STORM_TURNS}e, l'orage éclate : l'adversaire perd ${plural(STORM_BOLT, 'PV')} ${times(stormBolts(s.power ?? 0))}`,
    badge: (s) => `${s.stacks}/${STORM_TURNS}`,
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    threshold: { at: STORM_TURNS, effects: (s) => [{ type: 'damage', amount: STORM_BOLT, hits: stormBolts(s.power ?? 0), target: 'opponent', source: 'lightning' }] },
  },
  bloodFrenzy: {
    name: "Aura d'ivresse",
    look: { aura: 'rgba(132,204,22,0.5)' },
    polarity: 'positive',
    family: 'tempo',
    summary: `Chacun de ses critiques lui donne deux coups de plus ; chaque charge de plus, +${Math.round(BLOOD_FRENZY_CRIT * 100)} % de critique.`,
    describe: (s) => {
      const crit = Math.round(frenzyCrit(s) * 100)
      return `Chacun de ses critiques lui donne deux coups de plus${crit > 0 ? `, et +${crit} % de critique` : ''}`
    },
    detail: () => 'Des coups de base bruts, juste après le coup qui a critiqué ; chaque nouvelle pose : +5 % de critique.',
    badge: (s) => `×${BLOOD_FRENZY_STRIKES}`,
    counter: 'stacks',
    stacking: 'add',
    modifyStats: (stats, s) => ({ ...stats, critChance: stats.critChance + frenzyCrit(s) }),
    reactions: { crit: () => [{ type: 'applyStatus', status: 'bloodFrenzyStrike', stacks: BLOOD_FRENZY_STRIKES }] },
  },
  // Les coups de l'Ivresse : une rafale comme la Curée, posée par un critique. Un critique pendant une rafale pose une
  // charge que la rafale en cours ne relance pas : elle part après le prochain jet du porteur (RESOLUTION § 2)
  bloodFrenzyStrike: {
    name: 'Ivresse du sang',
    look: { glow: 'rgba(132,204,22,0.85)' },
    polarity: 'positive',
    family: 'tempo',
    summary: 'Un coup de plus par charge, juste après le coup qui a critiqué.',
    describe: (s) => `${COUNT_WORDS[s.stacks] ?? s.stacks} ${s.stacks > 1 ? 'coups' : 'coup'} de plus`,
    detail: () => 'Des coups de base bruts, chacun son dé : leur face ne déclenche aucune compétence.',
    badge: (s) => `×${s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    extraStrikes: 1,
    instantStrikes: true,
  },

  /*
   * Les Maîtrises, vague 2 (retour du 2026-10-27, docs/MAITRISES.md § 4) : cinq auras nouvelles, une par maîtrise qui en
   * manquait, et le Poing de pierre de Brokk (P4). Mesures (laboratoire, séries 70 à 73, 400 combats par duel) : gravées,
   * Veine +8,5 (Naraxes), Effroi +12,1 (Ervald), Rancœur +9,5 (Aldric), Champ d'orage +11,8 (Ysolde), Ballade +12,4
   * (Fanchon) ; la Peau de pierre et son Poing, départ de Brokk 49,8 → 54,9 %.
   */
  luckyStreak: {
    name: 'Aura de veine',
    look: { aura: 'rgba(56,189,248,0.5)' },
    polarity: 'positive',
    family: 'fortune',
    summary: `Chaque 6 au dé lui donne ${COUNT_WORDS[VEIN_STRIKES].toLowerCase()} coups de plus, tout de suite, par charge.`,
    describe: (s) => `Chaque 6 au dé lui donne ${VEIN_STRIKES * s.stacks} coups de plus, tout de suite`,
    detail: () => 'Des coups de base bruts, juste après le coup du 6 : leur face ne déclenche aucune compétence.',
    badge: (s) => `×${VEIN_STRIKES * s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    // Refonte des auras (2026-10-28, § 3.1, § 5.8) : des coups bruts (un jet complet de plus avant : 40,8 % au départ de
    // Fanchon), sans boucle ; à deux coups, 44,4 % pour tous (W5)
    reactions: { naturalMax: (s) => [{ type: 'applyStatus', status: 'veinStrike', stacks: VEIN_STRIKES * s.stacks }] },
  },
  // Les coups de la Veine : une rafale comme celle de l'Ivresse du sang, posée par un 6
  veinStrike: {
    name: 'Veine',
    look: { glow: 'rgba(56,189,248,0.85)' },
    polarity: 'positive',
    family: 'tempo',
    summary: 'Un coup de plus par charge, juste après le coup du 6.',
    describe: (s) => `${COUNT_WORDS[s.stacks] ?? s.stacks} ${s.stacks > 1 ? 'coups' : 'coup'} de plus`,
    detail: () => 'Des coups de base bruts, chacun son dé : leur face ne déclenche aucune compétence.',
    badge: (s) => `×${s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    extraStrikes: 1,
    instantStrikes: true,
  },
  dread: {
    name: "Aura d'effroi",
    look: { aura: 'rgba(120,113,108,0.55)' },
    polarity: 'positive',
    family: 'tempo',
    summary: `Chacun de ses critiques fait perdre sa prochaine action à l'adversaire ; chaque charge de plus, +${Math.round(DREAD_CRIT * 100)} % de critique, jusqu'à ${COUNT_WORDS[DREAD_CAP].toLowerCase()} charges.`,
    describe: (s) => {
      const crit = Math.round(dreadCrit(s) * 100)
      return `Chacun de ses critiques fait perdre sa prochaine action à l'adversaire${crit > 0 ? `, et +${crit} % de critique` : ''}`
    },
    detail: () => `La Peur : une action perdue au plus à la fois. Chaque nouvelle pose : +${Math.round(DREAD_CRIT * 100)} % de critique, ${COUNT_WORDS[DREAD_CAP].toLowerCase()} charges au plus.`,
    // D11 : jamais « ×1 » ; ses charges vers le plafond (1/3, 2/3, 3/3), un compteur qui se lit comme une jauge
    badge: (s) => `${Math.min(s.stacks, DREAD_CAP)}/${DREAD_CAP}`,
    counter: 'stacks',
    stacking: 'add',
    maxStacks: DREAD_CAP,
    modifyStats: (stats, s) => ({ ...stats, critChance: stats.critChance + dreadCrit(s) }),
    reactions: { crit: () => [{ type: 'applyStatus', status: 'fear', stacks: 1, target: 'opponent' }] },
  },
  rancor: {
    name: 'Aura de rancœur',
    look: { aura: 'rgba(234,88,12,0.5)' },
    polarity: 'positive',
    family: 'power',
    summary: `Chaque coup reçu lui donne +${RANCOR_FERVOR} Ferveur.`,
    describe: () => `Chaque coup reçu lui donne +${RANCOR_FERVOR} Ferveur`,
    detail: () => 'La Ferveur part sur son prochain coup qui touche. Une nouvelle pose ne change rien.',
    badge: () => `+${RANCOR_FERVOR}`,
    counter: 'stacks',
    // Refonte des auras (2026-10-28, § 3.1, § 5.7) : « il s'énerve si on le frappe », +3 sans cumul (+1 par charge avant).
    // Décision D19 (2026-10-30) : elle quitte la fiche de Morgrut (le Cuir épais la remplace) et reste une brique du
    // Rempart
    stacking: 'refresh',
    maxStacks: 1,
    reactions: { hurt: () => [{ type: 'applyStatus', status: 'momentum', stacks: RANCOR_FERVOR }] },
  },
  // Cuir épais (décision D19 du 2026-10-30, Rempart) : la seconde aura de Morgrut, celle qui tient. Chaque coup reçu, de
  // l'armure temporaire : le gros tas qui encaisse, qui nourrit le Bastion, la Riposte et l'Onde de choc. Sans cumul, comme
  // la Rancœur (la mesure de l'étude, série 123 : 49,3 → 46,6 %) ; cumulée par le 1 de Morgrut, 54,4 % et Gorak 78 % (série
  // 165, 0.133.0)
  thickHide: {
    name: 'Aura du cuir épais',
    look: { aura: 'rgba(161,98,7,0.5)' },
    polarity: 'positive',
    family: 'guard',
    summary: `Chaque coup reçu lui donne +${THICK_HIDE_ARMOR} armure temporaire.`,
    describe: () => `Chaque coup reçu lui donne +${THICK_HIDE_ARMOR} armure temporaire`,
    detail: () => "Après le coup : l'armure attend le coup suivant. Une nouvelle pose ne change rien.",
    badge: () => `+${THICK_HIDE_ARMOR}`,
    counter: 'stacks',
    stacking: 'refresh',
    maxStacks: 1,
    reactions: { hurt: () => [{ type: 'applyStatus', status: 'bonusArmor', stacks: THICK_HIDE_ARMOR }] },
  },
  ballad: {
    name: 'Aura de ballade',
    look: { aura: 'rgba(244,114,182,0.5)' },
    polarity: 'positive',
    family: 'healing',
    summary: `Chaque coup qui touche joue une note ; à la ${BALLAD_NOTES}e, le refrain : ${COUNT_WORDS[BALLAD_NOTES].toLowerCase()} éclats de ${BALLAD_REFRAIN} sur l'adversaire, et ${plural(BALLAD_HEAL, 'PV')} pour elle.`,
    describe: (s) =>
      `Chaque coup qui touche joue une note ; à la ${BALLAD_NOTES}e, le refrain : l'adversaire perd ${plural(BALLAD_REFRAIN, 'PV')} ${times(balladShards(tallyPower(s)))}, et elle lui rend ${plural(BALLAD_HEAL, 'PV')}`,
    detail: () => `Son anneau compte ses notes (1/${BALLAD_NOTES}). Le refrain : des dégâts directs, puis les notes repartent de zéro ; chaque nouvelle pose : un éclat de plus.`,
    badge: (s) => `${balladShards(tallyPower(s))}×${BALLAD_REFRAIN}`,
    counter: 'stacks',
    stacking: 'add',
    // Refonte des auras (2026-10-28, § 3.1, § 5.8) : la note et son refrain. Décision D22 (2026-10-30) : plus de +1 PV par
    // coup ; le refrain porte tout (quatre éclats de 2, +4 PV)
    tally: 'balladNote',
    reactions: { hit: (s) => [{ type: 'applyStatus', status: 'balladNote', stacks: 1, power: tallyPower(s) }] },
  },
  // Les notes de la Ballade : un statut à seuil ; la 4e joue le refrain
  balladNote: {
    name: 'Note',
    look: { glow: 'rgba(244,114,182,0.85)' },
    polarity: 'positive',
    family: 'tempo',
    summary: `Une note de l'Aura de ballade ; à la ${BALLAD_NOTES}e, le refrain.`,
    describe: (s) => `${s.stacks} sur ${BALLAD_NOTES} notes ; à la ${BALLAD_NOTES}e, le refrain`,
    detail: (s) =>
      `Le refrain : l'adversaire perd ${plural(BALLAD_REFRAIN, 'PV')} ${times(balladShards(s.power ?? 0))} en dégâts directs, et elle regagne ${plural(BALLAD_HEAL, 'PV')}.`,
    badge: (s) => `${s.stacks}/${BALLAD_NOTES}`,
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    threshold: {
      at: BALLAD_NOTES,
      effects: (s) => [
        { type: 'damage', amount: BALLAD_REFRAIN, hits: balladShards(s.power ?? 0), target: 'opponent', source: 'wind' },
        { type: 'heal', amount: BALLAD_HEAL },
      ],
    },
  },
  // Refonte des auras (2026-10-28, § 3.1) : trois auras nouvelles, un moteur chacune
  // Bastion (Brokk, Rempart) : la Peau de pierre éclate, l'attaquant paie, l'armure revient (sans la réarmure : 36,3 %)
  bastion: {
    name: 'Aura du bastion',
    look: { aura: 'rgba(148,163,184,0.6)' },
    polarity: 'positive',
    family: 'retaliation',
    summary: `Chaque fois que l'armure temporaire du porteur est vidée, l'attaquant perd ${plural(BASTION_LOSS, 'PV')} et le porteur regagne +${BASTION_ARMOR} armure temporaire, par charge.`,
    describe: (s) =>
      `Chaque fois que son armure temporaire est vidée, l'attaquant perd ${plural(BASTION_LOSS * s.stacks, 'PV')} et le porteur regagne +${BASTION_ARMOR * s.stacks} armure temporaire`,
    detail: () => 'En dégâts directs. L’armure regagnée peut être vidée à son tour.',
    badge: (s) => `−${BASTION_LOSS * s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    reactions: {
      shieldBroken: (s) => [
        { type: 'damage', amount: BASTION_LOSS * s.stacks, target: 'opponent', source: 'strike' },
        { type: 'applyStatus', status: 'bonusArmor', stacks: BASTION_ARMOR * s.stacks },
      ],
    },
  },
  // Jugement (Ysolde, Lumière) : les fautes de qui la frappe ; à la 3e, le verdict (D17, retour du 30 octobre : des PV de
  // Lumière au lieu de la Peur, que donnent déjà l'Effroi et sa Peur : la juge punit, l'Ombre terrifie)
  judgement: {
    name: 'Aura de jugement',
    look: { aura: 'rgba(253,224,71,0.5)' },
    polarity: 'positive',
    family: 'retaliation',
    summary: `Chaque coup qui touche le porteur donne une faute à l'attaquant. À la ${JUDGEMENT_FAULTS}e, le verdict tombe : il perd ${plural(VERDICT_LOSS, 'PV')}.`,
    describe: () =>
      `Chaque coup qui touche le porteur donne une faute à l'attaquant ; à la ${JUDGEMENT_FAULTS}e, le verdict tombe : il perd ${plural(VERDICT_LOSS, 'PV')}`,
    detail: () => 'En dégâts directs. Les fautes ne viennent que des coups qui touchent le porteur, jamais des tours. Le verdict emporte les fautes : le compte repart de zéro. Une nouvelle pose ne change rien.',
    badge: () => `−${VERDICT_LOSS}`,
    counter: 'stacks',
    stacking: 'refresh',
    maxStacks: 1,
    reactions: { hurt: () => [{ type: 'applyStatus', status: 'fault', stacks: 1, target: 'opponent' }] },
  },
  // La faute : un malus à seuil ; à la 3e, le verdict (dégâts directs de Lumière, sur celui qui la porte)
  fault: {
    name: 'Faute',
    polarity: 'negative',
    family: 'retaliation',
    summary: `Une faute de l'Aura de jugement ; à la ${JUDGEMENT_FAULTS}e, le verdict : il perd ${plural(VERDICT_LOSS, 'PV')}.`,
    describe: (s) => `${s.stacks} sur ${JUDGEMENT_FAULTS} fautes ; à la ${JUDGEMENT_FAULTS}e, le verdict : il perd ${plural(VERDICT_LOSS, 'PV')}`,
    onFoe: (s) => `L'adversaire reçoit ${s.stacks > 1 ? `${s.stacks} fautes` : 'une faute'} ; à la ${JUDGEMENT_FAULTS}e, le verdict : il perd ${plural(VERDICT_LOSS, 'PV')}`,
    detail: () => 'En dégâts directs. Ses fautes partent avec le verdict.',
    // Un compteur à seuil (1/3, 2/3) : il se lit comme une jauge (docs/etudes/PERSOS_RETOUR_30.md § 2)
    badge: (s) => `${s.stacks}/${JUDGEMENT_FAULTS}`,
    counter: 'stacks',
    stacking: 'add',
    bears: 'est en faute',
    plural: 'fautes',
    threshold: { at: JUDGEMENT_FAULTS, effects: () => [{ type: 'damage', amount: VERDICT_LOSS, source: 'holy' }] },
  },
  // Brasier (Thaldrin, Magie) : le feu ne s'éteint plus ; il attise la Brûlure de l'adversaire, ou l'allume
  brasier: {
    name: 'Aura du brasier',
    look: { aura: 'rgba(249,115,22,0.5)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Tous les ${COUNT_WORDS[BRASIER_TURNS].toLowerCase()} tours, au début de son tour, des braises tombent sur l'adversaire : sa Brûlure monte de ${BRASIER_BURN} et repart pour autant de tours que sa nouvelle valeur (Brûlure ${BRASIER_BURN} s'il ne brûlait pas).`,
    describe: (s) =>
      `Tous les ${COUNT_WORDS[BRASIER_TURNS].toLowerCase()} tours, au début de son tour, des braises tombent sur l'adversaire : sa Brûlure monte de ${brasierBurn(tallyPower(s))} et repart pour autant de tours que sa nouvelle valeur`,
    detail: () =>
      `Son anneau compte ses tours (1/${BRASIER_TURNS}). S'il ne brûle pas, les braises l'allument. Exemple : une Brûlure 2 à un tour de sa fin devient une Brûlure 4, pour 4 tours. Chaque nouvelle pose : Brûlure +2.`,
    badge: (s) => `+${brasierBurn(tallyPower(s))}`,
    counter: 'stacks',
    stacking: 'add',
    // Le Brasier qui n'attise qu'une Brûlure déjà là ne vit que des Feux follets (41,1 %) ; qui l'allume aussi, 47,8 %.
    // Décision D11 (2026-10-30) : regroupé, +2 tous les deux tours (+1 à chaque tour avant ; son compteur, les Tisons)
    tally: 'emberHeap',
    onTurnStart: (s) => [{ type: 'applyStatus', status: 'emberHeap', stacks: 1, power: tallyPower(s) }],
    // Une Brûlure de 3 et plus : le ciel rougit et les braises tombent sur l'adversaire (§ 3.2)
    scene: ({ posed }) => (posed >= 3 ? 'emberRain' : undefined),
  },
  // Le compteur de l'Aura du brasier (D11) : à son 2e tour, les braises
  emberHeap: {
    name: 'Tisons',
    look: { glow: 'rgba(249,115,22,0.85)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Les tours de l'Aura du brasier ; au ${BRASIER_TURNS}e, la Brûlure de l'adversaire monte de ${BRASIER_BURN}.`,
    describe: (s) => `${s.stacks} sur ${BRASIER_TURNS} tours ; au ${BRASIER_TURNS}e, la Brûlure de l'adversaire monte de ${brasierBurn(s.power ?? 0)}`,
    badge: (s) => `${s.stacks}/${BRASIER_TURNS}`,
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    threshold: {
      at: BRASIER_TURNS,
      effects: (s) => [{ type: 'applyStatus', status: 'burn', stacks: brasierBurn(s.power ?? 0), target: 'opponent', fromStatus: { status: 'burn', who: 'opponent', factor: 1 } }],
    },
  },
  stoneFist: {
    name: 'Poing de pierre',
    look: { glow: 'rgba(220,38,38,0.8)' },
    polarity: 'positive',
    family: 'power',
    summary: `Tant que son armure temporaire tient, ses coups font +${STONE_FIST}.`,
    describe: () => `Tant que son armure temporaire tient, ses coups font ${damageText(STONE_FIST)}`,
    detail: () => "Avant l'armure de l'adversaire ; il part quand son armure temporaire est vidée.",
    badge: () => `+${STONE_FIST}`,
    stacking: 'refresh',
    maxStacks: 1,
    modifyOutgoing: (damage) => damage + STONE_FIST,
    whileShielded: true,
    reactions: { shieldBroken: () => [] },
    spentOnReaction: true,
  },
  /*
   * Quatrième demande du 2026-10-27 (docs/MAITRISES.md, « Le contenu des maîtrises ») : l'Élan fait critiquer et change
   * chaque gros coup en Ferveur (la boucle de la Fureur) ; la Surtension renforce chaque dégât direct (Magie, et la Lumière,
   * le Sang, le Rempart qui en font) ; l'Emprise frappe d'autant plus fort que l'adversaire porte de malus (tous, d'où qu'ils
   * viennent) ; le Larcin esquive et vole le dernier bonus de l'attaquant ; l'Onde de choc compte les coups encaissés.
   */
  onrush: {
    name: "Aura d'élan",
    look: { aura: 'rgba(251,113,133,0.5)' },
    polarity: 'positive',
    family: 'power',
    summary: `+${Math.round(ONRUSH_CRIT * 100)} % de critique par charge ; chacun de ses gros coups lui donne +${ONRUSH_FERVOR} Ferveur.`,
    describe: (s) => `+${Math.round(ONRUSH_CRIT * 100 * s.stacks)} % de critique. Chacun de ses gros coups lui donne +${ONRUSH_FERVOR} Ferveur`,
    detail: () => 'Un gros coup : un critique, ou un coup ×2 et plus (Assaut, Coup de maître, Acharnement). La Ferveur part sur son prochain coup qui touche.',
    badge: (s) => `+${Math.round(ONRUSH_CRIT * 100 * s.stacks)} %`,
    counter: 'stacks',
    stacking: 'add',
    modifyStats: (stats, s) => ({ ...stats, critChance: stats.critChance + ONRUSH_CRIT * s.stacks }),
    reactions: { heavy: () => [{ type: 'applyStatus', status: 'momentum', stacks: ONRUSH_FERVOR }] },
  },
  // Refonte des auras (2026-10-28, docs/REFONTE_AURAS.md § 4) : la Surtension et l'Emprise deviennent des reliques (la
  // Pointe de paratonnerre, la Chaîne du geôlier), qui posent leur statut à son premier tour, pour tout le combat
  overcharge: {
    name: 'Surtension',
    look: { glow: 'rgba(129,140,248,0.85)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Chacun de ses éclairs fait +${OVERCHARGE}.`,
    describe: () => `Chacun de ses éclairs fait +${OVERCHARGE}`,
    detail: () => "Ses dégâts directs de foudre sur l'adversaire, d'où qu'ils viennent : chaque éclair de la Foudre, de l'Aura d'orage.",
    badge: () => `+${OVERCHARGE}`,
    counter: 'turns',
    stacking: 'refresh',
    maxStacks: 1,
    modifyDirect: (amount, _s, source) => (source === 'lightning' ? amount + OVERCHARGE : amount),
  },
  grip: {
    name: 'Emprise',
    look: { glow: 'rgba(52,211,153,0.85)' },
    polarity: 'positive',
    family: 'power',
    summary: `Ses coups font +${GRIP} par malus que porte l'adversaire.`,
    describe: () => `Ses coups font +${GRIP} par malus que porte l'adversaire`,
    detail: () => "Avant l'armure. Chaque malus compte une fois, quelles que soient ses charges : Poison, Saignement, Brûlure, Peur…",
    badge: () => `+${GRIP}`,
    counter: 'turns',
    stacking: 'refresh',
    maxStacks: 1,
    modifyOutgoing: (damage, _s, foe) => damage + GRIP * malusCount(foe),
  },
  spellFocus: {
    name: 'Focale',
    look: { glow: 'rgba(196,181,253,0.85)' },
    polarity: 'positive',
    family: 'affliction',
    // Retour du 31 octobre (textes) : le détail disait « rafale » quand le résumé dit « lame d'air » ; sa durée au survol
    summary: `Chaque éclair, flamme, rayon ou lame d'air qu'il lance fait +${SPELL_FOCUS}.`,
    describe: (s) => `Chaque éclair, flamme, rayon ou lame d'air qu'il lance fait +${SPELL_FOCUS}${forTurns(s)}`,
    detail: () => "Chaque impact, sur l'adversaire, d'où qu'il vienne : compétence, aura ou relique ; pas la Brûlure qui se consume.",
    badge: () => `+${SPELL_FOCUS}`,
    counter: 'turns',
    stacking: 'refresh',
    maxStacks: 1,
    modifyDirect: (amount, _s, source) => (DAMAGE_SOURCES[source].magical && source !== 'burn' ? amount + SPELL_FOCUS : amount),
  },
  sealedFace: {
    name: 'Face scellée',
    polarity: 'negative',
    family: 'fortune',
    summary: 'Un jet sur sa face scellée ne lance pas sa compétence : le coup de base seul.',
    describe: (s) => `Un jet sur ${s.power ? `le ${s.power}` : 'sa face scellée'} ne lance pas sa compétence`,
    onFoe: (s) => `Un jet de l'adversaire sur ${s.power ? `le ${s.power}` : 'la face de son dernier jet'} ne lance pas sa compétence`,
    detail: () => 'La face de son dernier jet, scellée : le jet ne porte que son coup de base.',
    badge: (s) => `${s.power ?? '?'}`,
    counter: 'turns',
    stacking: 'refresh',
    maxStacks: 1,
    sealsFace: true,
  },
  pilfer: {
    name: 'Aura de larcin',
    look: { aura: 'rgba(217,70,239,0.45)' },
    polarity: 'positive',
    family: 'seals',
    summary: `+${Math.round(PILFER_DODGE * 100)} % d'esquive par charge ; chaque esquive lui fait voler le dernier bonus de l'attaquant.`,
    describe: (s) => `+${Math.round(PILFER_DODGE * 100 * s.stacks)} % d'esquive. Chaque esquive lui fait voler le dernier bonus de l'attaquant`,
    // Un vrai vol (retour du 2026-10-28, A6) : le bonus entier change de camp, et seuls les bonus de la zone des statuts se
    // volent (`isStealable`) ; une charge par vol (0.127.0) laissait le bonus au volé, comme une copie
    detail: () => 'Le bonus entier, charges, durée et intensité. Ni une aura ni un mécanisme ne se volent.',
    badge: (s) => `+${Math.round(PILFER_DODGE * 100 * s.stacks)} %`,
    counter: 'stacks',
    stacking: 'add',
    modifyStats: (stats, s) => ({ ...stats, dodgeChance: stats.dodgeChance + PILFER_DODGE * s.stacks }),
    reactions: { dodge: () => [{ type: 'cleanse', polarity: 'positive', target: 'opponent', count: 1, steal: 'pilfer' }] },
  },
  // L'Onde de choc compte les coups qu'il encaisse : des jauges, comme la Rétribution, dont sa compétence lit le nombre
  shockwave: {
    name: 'Onde de choc',
    polarity: 'positive',
    family: 'retaliation',
    summary: `Compte les coups qui le touchent depuis sa dernière onde, ${COUNT_WORDS[SHOCKWAVE_SLOTS].toLowerCase()} au plus ; sa compétence Onde de choc les relâche sur l'adversaire, ${plural(SHOCKWAVE_PER, 'PV')} par coup compté.`,
    describe: (s) => {
      const n = (s.slots ?? []).filter((x) => x > 0).length
      return n > 1 ? `${COUNT_WORDS[n] ?? n} coups encaissés, ${SHOCKWAVE_PER * n} PV d'onde de choc` : n === 1 ? `Un coup encaissé, ${SHOCKWAVE_PER} PV d'onde de choc` : 'Aucun coup encaissé'
    },
    // D11 : les PV de l'onde (3, 6, 9), pas le nombre de coups comptés
    badge: (s) => String(SHOCKWAVE_PER * (s.slots ?? []).filter((n) => n > 0).length),
    stacking: 'refresh',
    mechanic: 'skill',
    fillsOnHurt: { slots: SHOCKWAVE_SLOTS },
  },
  /*
   * Quatrième demande du 2026-10-27 (docs/MAITRISES.md, « Le contenu du soin ») : la Dîme fait payer l'adversaire en
   * soignant le lanceur ; la Flamme votive change ses soins en Brûlure (Lumière → Magie) ; la Sangsue boit le Saignement
   * (Sang → soins) ; la Peau de crapaud empoisonne qui la frappe ; la Pièce vert-de-gris, la pièce du Poison (Poison → Chance).
   */
  // La Dîme est un bonus du lanceur (un malus posé sur l'adversaire, d'abord : la perte de l'adversaire et le soin du
  // lanceur, dans la fenêtre de son coup, ne se mettaient pas en scène dans l'ordre) ; même règle, vue de l'autre côté
  tithe: {
    name: 'Dîme',
    look: { glow: 'rgba(234,179,8,0.85)' },
    polarity: 'positive',
    family: 'healing',
    summary: `Chacun de ses prochains coups reçus lui rend ${TITHE_PV} PV, pris à l'attaquant.`,
    describe: (s) => next(s.stacks, `Son prochain coup reçu lui rend ${TITHE_PV} PV, pris à l'attaquant`, `Ses N prochains coups reçus lui rendent chacun ${TITHE_PV} PV, pris à l'attaquant`),
    detail: () => "L'attaquant les perd en dégâts directs, après son coup ; les PV rendus comptent comme un soin.",
    badge: () => `+${TITHE_PV}`,
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    reactions: {
      hurt: () => [
        { type: 'damage', amount: TITHE_PV, target: 'opponent', source: 'holy' },
        { type: 'heal', amount: TITHE_PV },
      ],
    },
  },
  votiveFlame: {
    name: 'Flamme votive',
    look: { glow: 'rgba(96,165,250,0.85)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Chacun de ses prochains soins brûle l'adversaire : Brûlure ${VOTIVE_BURN}.`,
    describe: (s) => {
      const burn = VOTIVE_BURN + (s.power ?? 0)
      return next(s.stacks, `Son prochain soin brûle l'adversaire : Brûlure ${burn}`, `Ses N prochains soins brûlent l'adversaire : Brûlure ${burn} chacun`)
    },
    detail: (s) => `Brûlure ${VOTIVE_BURN + (s.power ?? 0)} : ${VOTIVE_BURN + (s.power ?? 0)} PV à la fin de ses ${VOTIVE_BURN + (s.power ?? 0)} prochains tours ; une nouvelle Brûlure remplace l'ancienne.`,
    badge: (s) => String(VOTIVE_BURN + (s.power ?? 0)),
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    reactions: { healed: (s) => [{ type: 'applyStatus', status: 'burn', stacks: VOTIVE_BURN + (s.power ?? 0), target: 'opponent' }] },
    power: (n) => `Brûlure +${n}`,
  },
  // Refonte des auras (2026-10-28, docs/REFONTE_AURAS.md § 4) : la Sangsue et la Peau de crapaud, des compétences à
  // charges (leurs 3 prochains coups), comme la Flamme votive. Sans Saignement, la Sangsue attend : aucune charge ne part
  leech: {
    name: 'Sangsue',
    look: { glow: 'rgba(136,19,55,0.85)' },
    polarity: 'positive',
    family: 'healing',
    summary: `Chacun de ses prochains coups qui touchent lui rend ${LEECH_HEAL} PV par charge de Saignement de l'adversaire.`,
    describe: (s) => {
      const heal = plural(LEECH_HEAL + (s.power ?? 0), 'PV')
      return next(
        s.stacks,
        `Son prochain coup qui touche lui rend ${heal} par charge de Saignement de l'adversaire`,
        `Ses N prochains coups qui touchent lui rendent chacun ${heal} par charge de Saignement de l'adversaire`,
      )
    },
    detail: () => 'Lu au coup, avant que la plaie coule ; sans Saignement, rien, et la charge attend.',
    badge: (s) => `+${LEECH_HEAL + (s.power ?? 0)}`,
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    reactions: { hit: (s) => [{ type: 'heal', amount: 0, fromStatus: { status: 'bleed', who: 'opponent', factor: LEECH_HEAL + (s.power ?? 0) } }] },
    power: (n) => `+${plural(n, 'PV')} par charge de Saignement`,
  },
  // Récolte (retour du 2026-10-30, R30-R31, mécanique écrite par l'utilisateur) : un drain sur un coup, comme la Sangsue,
  // lu sur le Poison. Posée par sa greffe juste avant son coup de base : elle apparaît avec le dé, part à l'impact avec son
  // soin. Sans Poison, rien, et la charge attend
  harvest: {
    name: 'Récolte',
    look: { glow: 'rgba(132,204,22,0.85)' },
    polarity: 'positive',
    family: 'healing',
    summary: `Son prochain coup qui touche lui rend ${HARVEST_DRAIN === 1 ? '1 PV' : plural(HARVEST_DRAIN, 'PV')} par charge de Poison de l'adversaire.`,
    describe: (s) => {
      const heal = plural(HARVEST_DRAIN + (s.power ?? 0), 'PV')
      return next(
        s.stacks,
        `Son prochain coup qui touche lui rend ${heal} par charge de Poison de l'adversaire`,
        `Ses N prochains coups qui touchent lui rendent chacun ${heal} par charge de Poison de l'adversaire`,
      )
    },
    detail: () => 'Lu au coup ; sans Poison, rien, et la charge attend.',
    badge: (s) => `+${HARVEST_DRAIN + (s.power ?? 0)}`,
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    reactions: { hit: (s) => [{ type: 'heal', amount: 0, fromStatus: { status: 'poison', who: 'opponent', factor: HARVEST_DRAIN + (s.power ?? 0) } }] },
    power: (n) => `+${plural(n, 'PV')} par charge de Poison`,
  },
  toadSkin: {
    name: 'Peau de crapaud',
    look: { glow: 'rgba(251,146,60,0.85)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Chacun de ses prochains coups reçus empoisonne l'attaquant : Poison ${TOAD_POISON}.`,
    describe: (s) => {
      const poison = TOAD_POISON + (s.power ?? 0)
      return next(s.stacks, `Son prochain coup reçu empoisonne l'attaquant : Poison ${poison}`, `Ses N prochains coups reçus empoisonnent l'attaquant : Poison ${poison} chacun`)
    },
    detail: () => 'Un bonus à charges, pas une aura : une charge part à chaque coup reçu, et il disparaît à la dernière.',
    badge: (s) => String(TOAD_POISON + (s.power ?? 0)),
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    reactions: { hurt: (s) => [{ type: 'applyStatus', status: 'poison', stacks: TOAD_POISON + (s.power ?? 0), target: 'opponent' }] },
    power: (n) => `Poison +${n}`,
  },
  verdigrisCoin: {
    name: 'Pièce vert-de-gris',
    look: { glow: 'rgba(45,212,191,0.85)', coin: 'hue-rotate(120deg) saturate(0.8) brightness(0.9)' },
    polarity: 'positive',
    family: 'fortune',
    summary: `Juste après son coup, une pièce : pile, ${VERDIGRIS_POISON} Poison à l'adversaire ; face, rien.`,
    describe: (s) => `${coinOdds(s)} : pile, ${VERDIGRIS_POISON} Poison à l'adversaire ; face, rien`,
    badge: () => String(VERDIGRIS_POISON),
    stacking: 'refresh',
    mechanic: 'skill',
    maxStacks: 1,
    coinToss: { heads: [{ type: 'applyStatus', status: 'poison', stacks: VERDIGRIS_POISON, target: 'opponent' }] },
    power: (n) => `+${n} chance${n > 1 ? 's' : ''} sur 6 de faire pile`,
  },
  /*
   * Refonte des auras (tranche 6, 2026-10-28, § 5.9) : trois pièces de plus, même geste, une nature chacune. La Pièce
   * de bouclier protège son lanceur, la Pièce de la rafale frappe encore (coups bruts, comme l'Ivresse du sang), la
   * Pièce ensorcelée affaiblit l'adversaire longtemps.
   */
  shieldCoin: {
    name: 'Pièce de bouclier',
    look: { glow: 'rgba(148,163,184,0.85)', coin: 'saturate(0.15) brightness(1.2)' },
    polarity: 'positive',
    family: 'fortune',
    summary: `Juste après son coup, une pièce : pile, +${SHIELD_COIN_ARMOR} armure temporaire ; face, rien.`,
    describe: (s) => `${coinOdds(s)} : pile, +${SHIELD_COIN_ARMOR} armure temporaire ; face, rien`,
    badge: () => `+${SHIELD_COIN_ARMOR}`,
    stacking: 'refresh',
    mechanic: 'skill',
    maxStacks: 1,
    coinToss: { heads: [{ type: 'applyStatus', status: 'bonusArmor', stacks: SHIELD_COIN_ARMOR }] },
    power: (n) => `+${n} chance${n > 1 ? 's' : ''} sur 6 de faire pile`,
  },
  volleyCoin: {
    name: 'Pièce de la rafale',
    look: { glow: 'rgba(251,146,60,0.85)', coin: 'hue-rotate(-25deg) saturate(1.8)' },
    polarity: 'positive',
    family: 'fortune',
    summary: `Juste après son coup, une pièce : pile, ${COUNT_WORDS[VOLLEY_COIN_STRIKES].toLowerCase()} coups de plus, tout de suite ; face, rien.`,
    describe: (s) => `${coinOdds(s)} : pile, ${COUNT_WORDS[VOLLEY_COIN_STRIKES].toLowerCase()} coups de plus, tout de suite ; face, rien`,
    badge: () => `×${VOLLEY_COIN_STRIKES}`,
    stacking: 'refresh',
    mechanic: 'skill',
    maxStacks: 1,
    coinToss: { heads: [{ type: 'applyStatus', status: 'volleyStrike', stacks: VOLLEY_COIN_STRIKES }] },
    power: (n) => `+${n} chance${n > 1 ? 's' : ''} sur 6 de faire pile`,
  },
  // Les coups de la Pièce de la rafale : des coups bruts, juste après le jet de la pièce (comme ceux de l'Ivresse du sang)
  volleyStrike: {
    name: 'Rafale de pile',
    look: { glow: 'rgba(251,146,60,0.85)' },
    polarity: 'positive',
    family: 'tempo',
    summary: 'Un coup de plus par charge, juste après la pièce qui a fait pile.',
    describe: (s) => `${COUNT_WORDS[s.stacks] ?? s.stacks} ${s.stacks > 1 ? 'coups' : 'coup'} de plus`,
    detail: () => 'Des coups de base bruts, chacun son dé : leur face ne déclenche aucune compétence.',
    badge: (s) => `×${s.stacks}`,
    counter: 'stacks',
    stacking: 'add',
    mechanic: 'skill',
    extraStrikes: 1,
    instantStrikes: true,
  },
  hexCoin: {
    name: 'Pièce ensorcelée',
    look: { glow: 'rgba(236,72,153,0.85)', coin: 'hue-rotate(275deg) saturate(1.6) brightness(1.1)' },
    polarity: 'positive',
    family: 'fortune',
    summary: `Juste après son coup, une pièce : pile, ${damageText(-HEX_COIN_WEAKEN)} aux coups de l'adversaire pendant ${plural(HEX_COIN_TURNS, 'tour')} ; face, rien.`,
    describe: (s) => `${coinOdds(s)} : pile, ${damageText(-HEX_COIN_WEAKEN)} aux coups de l'adversaire pendant ${plural(HEX_COIN_TURNS, 'tour')} ; face, rien`,
    badge: () => `−${HEX_COIN_WEAKEN}`,
    stacking: 'refresh',
    mechanic: 'skill',
    maxStacks: 1,
    coinToss: { heads: [{ type: 'applyStatus', status: 'weakened', stacks: HEX_COIN_WEAKEN, target: 'opponent', turns: HEX_COIN_TURNS }] },
    power: (n) => `+${n} chance${n > 1 ? 's' : ''} sur 6 de faire pile`,
  },
  /*
   * Décisions du 2026-10-30 (D26, docs/etudes/CONTENU_RETOUR_30.md § 5 ; profondeur de l'offre ; D9) : trois compétences à
   * charges (l'Égide d'orage, la défense des Arcanes ; la Grâce, le soin qui fait frapper ; la Lame enduite, une source de
   * Poison au coup) et la Rage montante, la Fureur qui monte à chaque critique reçu.
   */
  stormAegis: {
    name: "Égide d'orage",
    look: { glow: 'rgba(103,232,249,0.85)' },
    polarity: 'positive',
    family: 'retaliation',
    summary: `Chacun de ses prochains coups reçus foudroie l'attaquant : ${STORM_AEGIS_BOLT * STORM_AEGIS_BOLTS} PV, en ${STORM_AEGIS_BOLTS === 2 ? 'deux' : STORM_AEGIS_BOLTS} éclairs.`,
    describe: (s) =>
      next(
        s.stacks,
        `Son prochain coup reçu foudroie l'attaquant : ${STORM_AEGIS_BOLT * STORM_AEGIS_BOLTS} PV, en deux éclairs`,
        `Ses N prochains coups reçus foudroient l'attaquant : ${STORM_AEGIS_BOLT * STORM_AEGIS_BOLTS} PV chacun, en deux éclairs`,
      ),
    detail: () => "Des dégâts directs, après le coup reçu ; une charge part à chaque coup reçu, et l'Égide disparaît à la dernière.",
    badge: () => String(STORM_AEGIS_BOLT * STORM_AEGIS_BOLTS),
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    reactions: { hurt: () => [{ type: 'damage', amount: STORM_AEGIS_BOLT, hits: STORM_AEGIS_BOLTS, target: 'opponent', source: 'lightning' }] },
  },
  grace: {
    name: 'Grâce',
    look: { glow: 'rgba(253,230,138,0.85)' },
    polarity: 'positive',
    family: 'power',
    summary: `Chacun de ses prochains soins lui donne +${GRACE_MOMENTUM} Ferveur.`,
    describe: (s) => next(s.stacks, `Son prochain soin lui donne +${GRACE_MOMENTUM} Ferveur`, `Ses N prochains soins lui donnent chacun +${GRACE_MOMENTUM} Ferveur`),
    detail: () => 'La Ferveur renforce son prochain coup qui touche ; une charge part à chaque soin reçu.',
    badge: () => `+${GRACE_MOMENTUM}`,
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    reactions: { healed: () => [{ type: 'applyStatus', status: 'momentum', stacks: GRACE_MOMENTUM }] },
  },
  coatedBlade: {
    name: 'Lame enduite',
    look: { glow: 'rgba(132,204,22,0.85)' },
    polarity: 'positive',
    family: 'affliction',
    summary: `Chacun de ses prochains coups qui touchent empoisonne l'adversaire : Poison ${COATED_BLADE_POISON}.`,
    describe: (s) =>
      next(
        s.stacks,
        `Son prochain coup qui touche empoisonne l'adversaire : Poison ${COATED_BLADE_POISON}`,
        `Ses N prochains coups qui touchent empoisonnent l'adversaire : Poison ${COATED_BLADE_POISON} chacun`,
      ),
    detail: () => 'Une charge part à chaque coup qui touche ; un coup esquivé ne la consomme pas.',
    badge: () => String(COATED_BLADE_POISON),
    counter: 'stacks',
    stacking: 'add',
    decays: true,
    reactions: { hit: () => [{ type: 'applyStatus', status: 'poison', stacks: COATED_BLADE_POISON, target: 'opponent' }] },
  },
  risingRage: {
    name: 'Rage montante',
    look: { glow: 'rgba(239,68,68,0.85)' },
    polarity: 'positive',
    family: 'power',
    summary: `${damageText(RISING_RAGE)} à chacun de ses coups ; chaque critique reçu ajoute ${damageText(RISING_RAGE)}, jusqu'à ${damageText(RISING_RAGE * RISING_RAGE_CAP)}.`,
    describe: (s) => `${damageText(risingRageBonus(s))} à chacun de ses coups`,
    // Le plafond dit avec le rang (aiguisée : +4 au départ, jusqu'à +8 ; « jusqu'à +6 » mentait au rang II)
    detail: (s) =>
      `Après le critique, avant l'armure, jusqu'à la fin du combat. Chaque critique encaissé ajoute ${damageText(RISING_RAGE)}, jusqu'à ${damageText(risingRageBonus({ ...s, stacks: RISING_RAGE_CAP }))}.`,
    badge: (s) => `+${risingRageBonus(s)}`,
    counter: 'stacks',
    stacking: 'add',
    maxStacks: RISING_RAGE_CAP,
    modifyOutgoing: (damage, s) => damage + risingRageBonus(s),
    reactions: { critHurt: () => [{ type: 'applyStatus', status: 'risingRage', stacks: 1 }] },
    // Aiguisée : un bonus fixe en plus des charges (une charge de plus butait sur le plafond de 3)
    power: (n) => `${damageText(n)} par coup`,
  },
}

// Typographie française (passe compendium, 2026-10-25) : les textes du registre s'écrivent avec des espaces simples, la
// composition (`typeset`) leur met une fois pour toutes l'espace insécable devant « : ; ! ? % »
for (const def of Object.values(STATUSES)) {
  const { describe, badge, grafted, onFoe, detail, power } = def
  def.summary = typeset(def.summary)
  def.describe = (s) => typeset(describe(s))
  def.badge = (s) => typeset(badge(s))
  if (grafted) def.grafted = (s) => typeset(grafted(s))
  if (onFoe) def.onFoe = (s) => typeset(onFoe(s))
  if (detail) def.detail = (s) => typeset(detail(s))
  if (power) def.power = (n) => typeset(power(n))
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
 * Ni l'opposition à un autre statut ni ce qui le retire : des interactions, que le compendium ne montre pas (2026-10-27).
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
  const say = (list: RuleLine[], text: string, rule?: RuleId) => list.push(rule ? { text: typeset(text), rule } : { text: typeset(text) })
  if (def.forcesDodge) say(effect, 'Le prochain coup reçu est esquivé à coup sûr, sans tirage ; une charge par esquive.', 'dodge')
  if (def.drainsHit)
    say(
      effect,
      'Le prochain coup du porteur qui touche lui rend les PV réellement retirés ; une charge par coup. Un coup esquivé consomme la charge sans rien rendre.',
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
      `À sa prochaine action, le porteur lance ${def.extraStrikes === 1 ? 'un dé de frappe' : `${def.extraStrikes} dés de frappe`} de plus${def.strikeCharges ? ' par charge' : ''}, après son dé de compétence : chacun porte un coup de base, sans compétence (esquive et critique résolus à part). Doublé : un dé de frappe qui fait la même face que le dé de compétence, sur une face à compétence, relance cette compétence, puis son coup ; sur une face nue, il reste un dé de frappe.`,
      'strike-dice',
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
  if (def.coinToss?.multiplier !== undefined)
    say(
      effect,
      `Le porteur lance aussitôt une pièce, juste après le coup qui a posé le statut : pile, ce coup ×${def.coinToss.multiplier}, l'adversaire perd encore ${def.coinToss.multiplier - 1} fois les PV qu'il lui a retirés, en dégâts directs${def.coinToss.headsTouches ? ' qui comptent comme un coup qui touche' : ''} ; face, rien. Le statut est consommé.`,
      'direct-damage',
    )
  else if (def.coinToss)
    say(effect, 'Le porteur lance aussitôt une pièce, juste après le coup qui a posé le statut : pile, son effet tombe aussitôt ; face, rien. Le statut est consommé.')
  if (def.forcesCrit) say(effect, 'Force le critique du prochain coup du porteur. Le coup esquivé ou raté perd ce critique.', 'crit')
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
      `Réagit ${lowerFirst(triggerText(trigger).label)}${def.spentOnReaction ? ', une seule fois, puis disparaît' : ''}, sans réaction en chaîne. Posé pendant un coup, il agit dès le coup suivant.`,
      hurts ? 'direct-damage' : undefined,
    )
  }
  if (def.immune)
    say(
      effect,
      `Aucun ${def.immune === 'negative' ? 'malus' : 'bonus'} ne peut être posé sur le porteur ; l'immunité ne s'use pas.`,
      'application',
    )
  if (def.mechanic === 'form')
    say(consumption, 'Règle de forme : présente tant que le porteur a cette forme, retirée quand il en change. Ni bonus ni malus.', 'forms')
  if (def.mechanic === 'skill')
    say(consumption, 'Mécanisme de sa compétence : ni bonus ni malus.', 'polarity')
  if (def.reflectsHit)
    say(
      effect,
      `Le prochain coup qui touche le porteur lui fait renvoyer à l'attaquant un coup de ${Math.round(def.reflectsHit * 100)} % des PV retirés, arrondis au-dessus : un coup sans dé, qui s'esquive, critique et se heurte à l'armure, sans renvoi en retour ; une charge par coup.`,
      'base-hit',
    )
  if (def.fillsOnHurt)
    say(
      effect,
      `Chaque coup qui touche le porteur range ses dégâts dans une des ${def.fillsOnHurt.slots} jauges, la plus ancienne cédant sa place ; les dégâts directs ne comptent pas. La compétence du porteur les relâche : un coup sans dé par jauge, chacun esquivé, critique ou arrêté par l'armure à part.`,
      'base-hit',
    )
  if (def.wards)
    say(
      effect,
      `Bloque la pose ${def.wards.polarity === 'negative' ? 'des malus' : def.wards.polarity === 'positive' ? 'des bonus' : 'de certains statuts'} sur le porteur ; une charge par blocage.`,
      'application',
    )
  if (def.decays) say(consumption, "S'estompe : perd une charge chaque fois qu'il agit, et disparaît à 0.")
  if (def.threshold) say(effect, `À ${def.threshold.at} charges, il part et son effet tombe aussitôt.`)
  if (def.spentOnHit) say(consumption, 'Disparaît, toutes charges comprises, dès que le prochain coup du porteur touche ; un coup esquivé ne le consomme pas.')
  if (def.spentOnHurt) say(consumption, 'Perd une charge chaque fois qu’un coup touche le porteur.')
  if (def.shatters) say(effect, 'Ce coup brise toute son armure temporaire, qui n’en absorbe rien.', 'shields')
  if (def.jinxesRoll)
    say(effect, 'Le prochain jet du porteur qui porterait une compétence tombe à vide : le dé est lancé, mais ni la compétence ni le coup de base ne partent ; une charge par jet.', 'die')
  if (def.blinds) say(effect, 'Chaque critique du porteur, tiré ou assuré, devient un coup raté.', 'crit')
  if (def.modifyHealing) say(effect, 'Le porteur ne regagne plus de PV.')
  if (def.stealsBonus) say(effect, "Le prochain bonus que le porteur se pose va à l'adversaire, entier ; une aura ne se vole pas. Une charge de Sceau par vol.", 'application')
  if (def.turnsFromStacks) say(consumption, 'Une seule valeur : il dure autant de tours que de charges.', 'duration')
  else if (def.expiresAt === 'turnEnd') say(consumption, 'Sa durée se décompte à la fin des tours du porteur.', 'duration')
  else if (def.expiresAt === 'turnStart') say(consumption, 'Sa durée se décompte au début des tours du porteur, avant son action.', 'duration')
  if (isAura(id)) say(consumption, "Aura : sans durée, jusqu'à la fin du combat.", 'auras')
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
  const def = STATUSES[added.id]
  const cap = def.maxStacks ?? Infinity
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
  /**
   * Posé, éventuellement après annulation partielle par l'opposé. `raised` : au plafond (aucune charge gagnée), la pose a
   * pourtant renforcé l'intensité du statut (un Œil de faucon aiguisé sur un Critique assuré déjà là) : ce n'est pas une
   * pose sans effet
   */
  | { kind: 'applied'; stacks: number; cancelled?: { status: StatusId; stacks: number }; raised?: true }
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
  const was = findStatus(current, added.id)
  current = applyStatus(current, { ...added, stacks })
  const now = findStatus(current, added.id)
  const gained = (now?.stacks ?? 0) - (def.stacking === 'add' ? (was?.stacks ?? 0) : 0)
  const raised = gained <= 0 && was !== undefined && (now?.power ?? 0) > (was.power ?? 0)
  return { list: current, outcome: { kind: 'applied', stacks: Math.max(gained, 0), ...(cancelled && { cancelled }), ...(raised && { raised: true as const }) } }
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

/**
 * Un bonus qui se vole (Larcin, Confiscation ; retour du 2026-10-28, A6) : un bonus de la zone des statuts, lu sur sa
 * définition. Jamais une aura (`look.aura`, l'identité, dans la zone des compétences) ni un mécanisme (`mechanic`).
 */
export const isStealable = (id: StatusId) => STATUSES[id].polarity === 'positive' && !isMechanic(id) && !isAura(id)

/** Un statut de jets de plus à la prochaine action (Coup de chance, Duo) : des dés, pas des coups bruts instantanés */
export const givesJets = (id: StatusId) => !!STATUSES[id].extraStrikes && !STATUSES[id].instantStrikes

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
