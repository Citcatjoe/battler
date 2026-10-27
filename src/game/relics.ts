import type { CharacterStats } from './character'
import { conditionClause, DIE_FACES, type Condition, type Effect, type Target, type Trigger } from './events'
import { pick, pickWeighted, shuffle, type Rng } from './rng'
import { SCENE_EVENTS, type SceneEventId } from './scenes'
import { lowerFirst, STATUSES, type StatusId } from './statuses'
import { typeset } from './typography'

/*
 * Reliques (docs/RELIQUES.md) : des objets gagnés en tournoi, un par victoire, qui changent le profil d'un
 * combattant. Une relique est une donnée, comme une compétence : ce registre dit ce qu'elle fait, le moteur
 * (`combat.ts`) l'applique, l'écran la montre. Quatre types, déduits de sa définition (`relicKind`), pour le code, les
 * rapports et la trace seulement : le joueur ne les voit pas (2026-10-24), sa description dit quand elle agit.
 *   - caractéristique : des stats de base en plus, à plat (armure, esquive, critique, PV…) ;
 *   - coup : un bonus à la valeur de ses coups, ou un effet sur un moment du coup (touche, esquive…) ;
 *   - tour : un effet au début de son n-ième tour (puis tous les `cooldown` tours) ;
 *   - seuil : un effet quand ses PV passent sous une part de ses PV max.
 * Une relique qui se déclenche peut avoir une limite : des charges (déclenchements par combat) ou une recharge.
 */

/**
 * Moments sur lesquels une relique de coup peut se déclencher (ceux du porteur) : les moments d'un coup, et le soin
 * reçu (`healed`, lot des consommateurs, docs/PROGRESSION.md § 13.3), qui nourrit ses coups suivants ; depuis le second
 * lot de la phase 8, son armure temporaire vidée, ses dégâts renvoyés et sa pièce sur pile.
 */
export const STRIKE_TRIGGERS = ['naturalOne', 'naturalTwo', 'naturalThree', 'naturalMax', 'hit', 'crit', 'missed', 'dodge', 'hurt', 'healed', 'shieldBroken', 'reflected', 'heads'] as const satisfies readonly Trigger[]
export type StrikeTrigger = (typeof STRIKE_TRIGGERS)[number]

/** Les moments d'un coup qui touche : seuls à connaître les PV que ce coup a retirés (condition `hitAtLeast`). */
const TOUCH_MOMENTS: readonly StrikeTrigger[] = ['hit', 'crit', 'hurt']

export type RelicTrigger =
  /** Un moment d'un coup, du point de vue du porteur (il touche, il esquive, il encaisse…), ou le soin qu'il reçoit */
  | { type: 'strike'; on: StrikeTrigger }
  /** Au début de son `turn`-ième tour (le premier vaut 1) ; puis tous les `cooldown` tours s'il en a un */
  | { type: 'turn'; turn: number }
  /**
   * Quand les PV de `who` (le porteur par défaut, ou l'adversaire) passent sous `ratio` × ses PV max ; elle se
   * réarme s'ils remontent au-dessus. L'effet, lui, reste sur le porteur (règle 7 de docs/RELIQUES.md).
   */
  | { type: 'hpBelow'; ratio: number; who?: Target }
  /**
   * Sursis (retour du 2026-10-27, R1) : quand une perte de PV devrait le faire tomber (coup, dégâts directs, Poison…),
   * il reste à 1 PV. Sans effet ni condition ; une charge (`charges: 1`). Son étape suit celle de la perte.
   */
  | { type: 'lethal' }
  /**
   * Initiative (retour du 2026-10-27, R3) : avant le jet d'initiative, le porteur commence et le jet n'a pas lieu ; si
   * les deux camps en portent une, aucune ne part et le jet revient. Sans effet, sans limite (une fois par combat).
   */
  | { type: 'initiative' }

/** Stats de base ajoutées à plat par une relique (0,05 d'esquive = 5 points de pourcentage). */
export type RelicStats = Partial<CharacterStats>

export interface Relic {
  id: string
  name: string
  /** Une phrase d'ambiance, pour le compendium seulement ; la règle se rédige depuis les données (`describeRelic`) */
  flavor: string
  /** Caractéristique : stats ajoutées à plat */
  stats?: RelicStats
  /** Coup : ajouté au coup de base de chacun de ses coups qui touchent, avant le critique (« +4 dégâts à ce coup ») */
  rollBonus?: number
  /** Le bonus de coup ne vaut que pour un coup dont le dé fait cette face (Fer à quatre clous : sur un 4), coup brut compris */
  onFace?: number
  /**
   * Chance de pile (retour du 2026-10-27, R4) : ajoutée aux 50 % de chacune de ses pièces (0,25 : 75 % de pile). Une
   * caractéristique : toujours active, sans étape.
   */
  headsChance?: number
  /** Coup, tour ou seuil : le moment où elle se déclenche, et ses effets (du point de vue du porteur) */
  trigger?: RelicTrigger
  effects?: readonly Effect[]
  /**
   * Conditions supplémentaires, toutes requises au moment du déclenchement ; sur un bonus de coup (Fiole de venin), au
   * moment du coup qui touche, avant le critique
   */
  when?: readonly Condition[]
  /** Déclenchements par combat (défaut : illimité) */
  charges?: number
  /** Tours du porteur avant de pouvoir se déclencher de nouveau (défaut : aucun) */
  cooldown?: number
  /**
   * L'événement de scène joué quand elle agit (présentation seulement, docs/RELIQUES.md § 12) : son sceau se brise et sa
   * magie envahit l'arène. Le joueur n'y lit aucun élément (2026-10-24).
   */
  scene?: SceneEventId
}

export type RelicKind = 'stat' | 'strike' | 'turn' | 'threshold'

/** Les quatre types, pour les rapports et la trace (jamais montrés au joueur). */
export const RELIC_KINDS: Record<RelicKind, { label: string }> = {
  stat: { label: 'Caractéristique' },
  strike: { label: 'Coup' },
  turn: { label: 'Tour' },
  threshold: { label: 'Seuil' },
}

export function relicKind(r: Relic): RelicKind {
  if (r.stats || r.headsChance !== undefined) return 'stat'
  if (r.trigger?.type === 'turn' || r.trigger?.type === 'initiative') return 'turn'
  if (r.trigger?.type === 'hpBelow' || r.trigger?.type === 'lethal') return 'threshold'
  return 'strike'
}

/* ---------- Le registre ---------- */

/**
 * Première série (0.77.0), douze reliques, trois par type, reprises de la proposition de docs/RELIQUES.md § 7
 * (revue par l'utilisateur le 2026-10-20). Aucune ne pose de malus sur l'adversaire (règle 7). Impact visé :
 * 5 à 15 points de taux de victoire, 20 au plus (mesures dans docs/RELIQUES.md).
 */
export const RELICS: readonly Relic[] = [
  /* Caractéristique : de l'équipement qu'on porte */
  {
    // 0.105.0 (règles v2, d6 imprimé) : +2 faces au dé jusqu'à la 0.104.0 ; un d6 ne grandit plus. Même idée, en stats :
    // le bras frappe plus lourd (critique), et moins souvent juste
    id: 'lead-pommel',
    name: 'Contrepoids de plomb',
    flavor: 'Un pommeau de plomb cerclé de fer, limé à la main. Le bras frappe plus lourd, et moins souvent juste.',
    stats: { critMultiplier: 1, critChance: -0.04 },
  },
  {
    id: 'felt-boots',
    name: 'Bottes de feutre',
    flavor: 'Des bottes souples aux talons usés, lacets défaits. On ne les entend pas venir, on ne les voit pas partir.',
    stats: { dodgeChance: 0.06 },
  },
  {
    id: 'mercenary-mail',
    name: 'Cotte du mercenaire',
    flavor: 'Une cotte de mailles roulée en boule, rapiécée d’anneaux plus clairs. Elle arrête les coups, et les pas.',
    stats: { armor: 1, dodgeChance: -0.05 },
  },
  /* Coup : des objets de hasard, qui portent la face qui les éveille */
  {
    id: 'split-knucklebone',
    name: 'Osselet fendu',
    flavor: 'Un osselet de mouton fendu en long, un seul point gravé sur sa face creuse. Même le pire jet mord.',
    trigger: { type: 'strike', on: 'naturalOne' },
    effects: [{ type: 'damage', amount: 3, target: 'opponent', source: 'strike' }],
  },
  {
    id: 'hollow-die',
    name: 'Dé creux',
    flavor: 'Un dé d’os évidé, une couronne gravée à la place des points. Le jet parfait laisse le porteur en garde.',
    trigger: { type: 'strike', on: 'naturalMax' },
    cooldown: 3,
    effects: [{ type: 'applyStatus', status: 'evasion', stacks: 1 }],
  },
  {
    id: 'four-nail-shoe',
    name: 'Fer à quatre clous',
    flavor: 'Un fer à cheval étroit, quatre clous encore plantés. Le plus pauvre des vrais coups devient un bon coup.',
    rollBonus: 4,
    onFace: 4,
  },
  /* Tour : des objets qui marquent le temps */
  {
    id: 'opening-bell',
    name: 'Cloche d’ouverture',
    flavor: 'Une petite cloche de bronze, une seule encoche sur la robe. Elle ne sonne qu’une fois : au premier coup.',
    trigger: { type: 'turn', turn: 1 },
    charges: 1,
    effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }],
  },
  {
    id: 'hermit-beads',
    name: 'Chapelet de l’ermite',
    flavor: 'Des grains de bois, trois plus gros que les autres, un fermoir d’os. À chaque gros grain, une prière lave.',
    trigger: { type: 'turn', turn: 3 },
    cooldown: 3,
    effects: [{ type: 'cleanse', polarity: 'negative', count: 1, orElse: { type: 'heal', amount: 3 } }],
  },
  {
    // 0.105.0 (retour de l'utilisateur) : l'Aura de puissance qu'elle posait se lisait comme une compétence dans la barre
    // de compétences, et sa règle (cumulée tous les 4 tours) était abstraite. Un statut générique, le Critique assuré.
    id: 'siege-clepsydra',
    name: 'Clepsydre du siège',
    flavor: 'Un bol de bronze percé au fond, trois graduations, l’eau arrêtée à la deuxième. Plus le siège dure, plus il frappe juste.',
    trigger: { type: 'turn', turn: 6 },
    cooldown: 4,
    effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }],
  },
  /* Seuil : des contenants et talismans qui gardent quelque chose jusqu'à la rupture */
  {
    id: 'wolf-fang',
    name: 'Dent de loup',
    flavor: 'Une canine de loup en cage de fil de fer, fêlée aux quatre dixièmes. Acculé, il mord pour reprendre son sang.',
    trigger: { type: 'hpBelow', ratio: 0.4 },
    // 2026-10-21 (retour de l'utilisateur) : une seule fois par combat. Sans charge, elle se réarmait quand un
    // soin remontait le porteur au-dessus de 40 %, et repartait à la chute suivante.
    charges: 1,
    // Phase 5 ter : +1 Vol de vie au lieu de +2 ; à +2, elle valait +22,0 points (`npm run relics`), au-delà du plafond de 20
    effects: [{ type: 'applyStatus', status: 'lifesteal', stacks: 1 }],
  },
  {
    id: 'bramble-collar',
    name: 'Collier de ronces',
    flavor: 'Une ronce séchée tressée sur un médaillon fendu. À mi-chemin de sa chute, il devient dangereux à frapper.',
    trigger: { type: 'hpBelow', ratio: 0.5 },
    charges: 1,
    effects: [{ type: 'applyStatus', status: 'thorns', stacks: 2 }],
  },
  {
    id: 'hunter-trophy',
    name: 'Trophée du chasseur',
    flavor: 'Une mâchoire de bête pendue à la ceinture, quatre encoches, la dernière à peine commencée. Elle sent la proie faiblir.',
    trigger: { type: 'hpBelow', ratio: 0.3, who: 'opponent' },
    charges: 1,
    effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }],
  },
  /*
   * Reliques à scène (0.85.0, docs/RELIQUES.md § 12, « élémentaires » jusqu'au 2026-10-24) : leur sceau se brise quand
   * elles agissent (événement de scène) ; le spectacle reste rare, une ou deux fois par combat. Aucun élément pour le
   * joueur : la scène est de la mise en scène.
   */
  {
    id: 'caged-ember',
    name: 'Braise captive',
    flavor: 'Une braise vivante dans une cage de quatre barreaux. Au quatrième tour, la cage cède, et le ciel brûle.',
    scene: 'emberRain',
    trigger: { type: 'turn', turn: 4 },
    charges: 1,
    effects: [{ type: 'damage', amount: 2, hits: 3, target: 'opponent', source: 'fire' }],
  },
  {
    id: 'frost-tear',
    name: 'Larme de givre',
    flavor: 'Une larme de glace qui ne fond pas, fêlée près de la pointe. Quand tout saigne, elle gèle la plaie.',
    scene: 'hoarfrost',
    trigger: { type: 'hpBelow', ratio: 0.35 },
    charges: 1,
    effects: [
      { type: 'cleanse', polarity: 'negative' },
      { type: 'heal', amount: 5 },
    ],
  },
  {
    id: 'wind-conch',
    name: 'Conque des vents',
    flavor: 'Un coquillage à deux tours de spire où souffle encore une tempête. Qui l’esquive l’entend répondre.',
    scene: 'gale',
    trigger: { type: 'strike', on: 'dodge' },
    charges: 2,
    effects: [{ type: 'damage', amount: 2, hits: 3, target: 'opponent', source: 'wind' }],
  },
  {
    id: 'split-geode',
    name: 'Géode fendue',
    flavor: 'Une géode ouverte en deux, deux gros cristaux ambrés au fond. Frappée, la terre se lève autour du porteur.',
    scene: 'stoneWall',
    trigger: { type: 'strike', on: 'hurt' },
    // 2026-10-24 (retour de l'utilisateur) : une seule limite, deux fois par combat ; la recharge de 3 tours part
    charges: 2,
    effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 4 }],
  },
  /*
   * Le lot des consommateurs (docs/PROGRESSION.md § 13.3, validé par l'utilisateur le 2026-10-24) : une relique par
   * ressource que personne ne consommait (Poison, Saignement, soins, coups encaissés), et un second consommateur des
   * critiques. Chacune lit une ressource que d'autres posent ; mesures dans docs/RELIQUES.md § 13.
   */
  {
    // 2026-10-24 : « 3 Poison ou plus » dans la proposition (PROGRESSION.md § 13.3) ; mesurée +0,2 (Ervald +1,5) : le
    // Poison s'estompe d'une charge par tour, aucun personnage n'en tient 3. Dès 1 Poison : Ervald +13,7 (docs/RELIQUES.md § 13)
    id: 'venom-vial',
    name: 'Fiole de venin',
    flavor: 'Une fiole de verre vert bouchée de cire, une goutte figée le long du col. Là où le venin court déjà, la lame mord.',
    rollBonus: 2,
    when: [{ type: 'hasStatus', who: 'opponent', status: 'poison' }],
  },
  {
    id: 'butcher-hook',
    name: 'Croc de boucher',
    flavor: 'Un croc à viande au manche de corne, la pointe noircie. Là où le sang coule déjà, il entre mieux.',
    rollBonus: 2,
    when: [{ type: 'hasStatus', who: 'opponent', status: 'bleed' }],
  },
  {
    id: 'abbey-incense',
    name: 'Encens de l’abbaye',
    flavor: 'Un encensoir de cuivre cabossé, la chaîne nouée, une braise tiède au fond. Chaque soin la ranime.',
    trigger: { type: 'strike', on: 'healed' },
    effects: [{ type: 'applyStatus', status: 'momentum', stacks: 1 }],
  },
  {
    id: 'dented-shield',
    name: 'Écu cabossé',
    flavor: 'La bosse de fer d’un vieil écu, arrachée à son bois, six creux profonds sur le dôme. Elle se souvient des gros coups.',
    trigger: { type: 'strike', on: 'hurt' },
    when: [{ type: 'hitAtLeast', amount: 6 }],
    effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 2 }],
  },
  {
    id: 'eagle-feather',
    name: 'Plume d’aigle',
    flavor: 'Une rémige d’aigle liée d’un fil rouge à un anneau de cuivre, deux barbes arrachées. Après le coup juste, il est déjà ailleurs.',
    trigger: { type: 'strike', on: 'crit' },
    cooldown: 2,
    effects: [{ type: 'applyStatus', status: 'evasion', stacks: 1 }],
  },
  /*
   * Les reliques de durée (phase 7, seconde partie, docs/RELIQUES.md § 14) : la durée vient du contenu (PROGRESSION.md
   * § 12.2), environ une récompense sur trois fait durer. Des PV à plat (avec un troc qui ralentit aussi le porteur), un
   * soin qui consomme les coups encaissés, un bouclier qui revient. Chaque PV vaut environ 2,3 points : « +12 PV » seul
   * vaudrait +25,7, au-delà du plafond de 20 (mesures dans docs/RELIQUES.md § 14).
   */
  {
    id: 'quilted-gambison',
    name: 'Gambison matelassé',
    flavor: 'Un gambison de lin épais, piqué de losanges, raide de vieille sueur. Il encaisse tout, et pèse au bras.',
    stats: { maxHp: 15, attackMin: -1, attackMax: -1 },
  },
  {
    id: 'bonesetter-salve',
    name: 'Onguent du rebouteux',
    flavor: 'Un pot de terre bouché de cire, deux creux de doigts dans la graisse jaune. Chaque gros coup reçu en appelle une bonne noix.',
    trigger: { type: 'strike', on: 'hurt' },
    // Retour du 2026-10-27 (M11, « 5 PV sur un combat, c'est peanuts ») : +3 PV, 2x (+13,3 points, 200 combats par duel) au
    // lieu de +1 PV, 5x (+11,1) : des soins qu'on voit. +4 PV, 2x valait +17,0, hors de la bande de 5 à 15
    charges: 2,
    effects: [{ type: 'heal', amount: 3 }],
  },
  {
    id: 'vigil-candle',
    name: 'Chandelle de veille',
    flavor: 'Une chandelle de suif dans un bougeoir de fer, trois anneaux gravés dans la cire. À chaque anneau fondu, la garde se relève.',
    trigger: { type: 'turn', turn: 3 },
    cooldown: 3,
    effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 2 }],
  },
  /*
   * Phase 8, second lot (docs/RELIQUES.md § 15) : un consommateur par ressource restée sans lui. La Brûlure (Feux follets),
   * l'armure temporaire vidée (Peau de pierre, Chandelle, Géode, Écu), les dégâts renvoyés (Riposte, Rétribution) et la
   * pièce sur pile (Pile ou face). Chacune ne vaut que chez ses producteurs, comme la Fiole et le Croc : l'offre pertinente
   * ne la propose qu'à eux (`relicNeeds`).
   */
  {
    // Laboratoire (série 24) : +2 valait +6,1 chez Thaldrin, au partenaire de justesse (+0,25) ; +3, +7,8 (+0,32)
    id: 'forge-bellows',
    name: 'Soufflet de forge',
    flavor: 'Un petit soufflet de cuir plissé entre deux planchettes de chêne, trois clous de laiton. Là où le feu couve déjà, il le ranime.',
    rollBonus: 3,
    when: [{ type: 'hasStatus', who: 'opponent', status: 'burn' }],
  },
  {
    id: 'pavise-nails',
    name: 'Clous de pavois',
    flavor: 'Un éclat de pavois peint, trois gros clous forgés encore plantés. Quand le bouclier cède, ses pointes restent.',
    trigger: { type: 'strike', on: 'shieldBroken' },
    // Retour de l'utilisateur du 2026-10-27 (M4) : ses 3 dégâts se heurtent à l'armure de l'attaquant (au moins 1)
    effects: [{ type: 'damage', amount: 3, target: 'opponent', source: 'strike', armored: true }],
  },
  {
    id: 'talion-gauntlet',
    name: 'Gantelet du talion',
    flavor: 'La manchette d’un gantelet de fer, une courroie bouclée, une seule pointe sur le dos. Chaque coup rendu lui rend un peu de souffle.',
    trigger: { type: 'strike', on: 'reflected' },
    effects: [{ type: 'heal', amount: 1 }],
  },
  {
    id: 'holed-coin',
    name: 'Pièce trouée',
    flavor: 'Une vieille pièce de cuivre percée, sur un cordon noué, deux étoiles frappées côté pile. Pile, la chance relance.',
    trigger: { type: 'strike', on: 'heads' },
    effects: [{ type: 'applyStatus', status: 'luckyStrike', stacks: 2 }],
  },
  /*
   * Les reliques de source (option C1 de l'étude des sources, validée par l'utilisateur le 2026-10-25 ; docs/RELIQUES.md
   * § 16) : une relique par ressource qu'aucune relique ne produisait (Poison, Brûlure, pièce, renvoi). Sans besoin, elles
   * sont offertes à tous ; elles ouvrent l'offre de leurs consommatrices (le producteur d'abord). Le Dard et le Briquet
   * sont l'exception à la règle 7 : ils posent une affliction à l'adversaire (`SOURCE_AFFLICTIONS`).
   */
  {
    // Calage (200 combats par duel) : sur un 6, +10,6 ; au coup qui touche 1x, +7,8 (une seule fenêtre de Poison) ; 2x, +20,0
    id: 'wasp-sting',
    name: 'Dard de guêpe',
    flavor: 'Un dard de guêpe séché dans un capuchon de laiton, deux gouttes de venin perlées à la pointe. Le coup parfait pique.',
    trigger: { type: 'strike', on: 'naturalMax' },
    effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, target: 'opponent' }],
  },
  {
    // Calage : sur un 6, +9,6 ; au coup reçu 1x, +14,3 (Morgrut +19,3) ; recharge 3, +29,2
    id: 'tinder-box',
    name: 'Briquet d’amadou',
    flavor: 'Un briquet de fer, son silex et son battant, deux braises dans l’amadou. Le coup parfait fait jaillir l’étincelle.',
    trigger: { type: 'strike', on: 'naturalMax' },
    effects: [{ type: 'applyStatus', status: 'burn', stacks: 2, target: 'opponent' }],
  },
  {
    // Calage : 1 charge, +8,9 ; 2 charges, +17,3
    id: 'spiked-bracer',
    name: 'Brassard à pointes',
    flavor: 'Un brassard de cuir clouté, une grosse pointe rabattue vers l’arrière. Le premier qui frappe s’y pique.',
    trigger: { type: 'turn', turn: 1 },
    charges: 1,
    effects: [{ type: 'applyStatus', status: 'riposte', stacks: 1 }],
  },
  /*
   * Retour du 2026-10-27 (docs/RELIQUES.md § 17) : les idées de l'utilisateur. La Pièce de foire (une relique qui lançait
   * une pièce sur un 6) est retirée : les pièces sont des compétences de la Fortune (M10). Restent des reliques qui
   * servent ces pièces (Pièce trouée, Pièce lestée), une qui épargne un coup fatal et une qui prend l'initiative.
   */
  {
    id: 'reprieve-medal',
    name: 'Médaille de sursis',
    flavor: 'Une médaille de bronze sur un ruban délavé, entaillée en plein centre par la lame qu’elle a arrêtée. Une fois, pas deux.',
    trigger: { type: 'lethal' },
    charges: 1,
  },
  {
    id: 'vanguard-horn',
    name: 'Cor d’avant-garde',
    flavor: 'Un cor de corne cerclé de laiton, l’embouchure mâchée, pendu à une lanière. Qui sonne le premier frappe le premier.',
    trigger: { type: 'initiative' },
  },
  {
    id: 'weighted-coin',
    name: 'Pièce lestée',
    flavor: 'Une pièce d’argent rognée, un grain de plomb serti côté face. Elle retombe toujours un peu du même côté.',
    headsChance: 0.25,
  },
]

export const RELIC_IDS = RELICS.map((r) => r.id)

export function getRelic(id: string): Relic {
  const r = RELICS.find((x) => x.id === id)
  if (!r) throw new Error(`Relique inconnue : ${id}`)
  return r
}

/** Stats de base d'un porteur une fois ses reliques ajoutées (à plat, dans l'ordre d'obtention). */
export function withRelicStats(base: CharacterStats, relics: readonly Relic[]): CharacterStats {
  const stats = { ...base }
  for (const r of relics) for (const [k, v] of Object.entries(r.stats ?? {}) as [keyof CharacterStats, number][]) stats[k] += v
  return stats
}

/* ---------- Rédaction ---------- */

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`)
const capitalize = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`
const ordinal = (n: number) => (n === 1 ? '1er' : `${n}e`)

/**
 * Une stat ajoutée, en clair : « +2 armure », « +6 % d'esquive ». Une esquive négative n'esquive jamais. L'attaque se dit
 * une fois, « +1 à l'attaque », pour son minimum et son maximum (`validateRelics` les veut égaux). L'armure se dit avec ce
 * qu'elle fait (retour du 2026-10-27, M12 : « 1 d'armure à chaque tour ? ») : une stat permanente, qui retire des points à
 * chaque coup reçu, à ne pas confondre avec l'armure temporaire, un bouclier qui s'use.
 */
const STAT_TEXT: Record<keyof CharacterStats, (v: number) => string> = {
  maxHp: (v) => `${signed(v)} PV max`,
  attackMin: (v) => `${signed(v)} à l'attaque`,
  attackMax: () => '',
  armor: (v) => `${signed(v)} armure (${signed(-v)} dégât${Math.abs(v) > 1 ? 's' : ''} par coup reçu)`,
  dodgeChance: (v) => `${signed(Math.round(v * 100))} % d'esquive`,
  critChance: (v) => `${signed(Math.round(v * 100))} % de critique`,
  critMultiplier: (v) => `${signed(v).replace('.', ',')} au multiplicateur de critique`,
}

/**
 * Un effet de relique au plus court : « 3 dégâts directs », « +2 vol de vie », « retire son dernier malus (sinon +3 PV) ».
 * Un statut posé est toujours un bonus de son porteur (« +2 armure temporaire », A3), écrit comme un mot de la phrase ;
 * `attacker` : la relique part sur un coup reçu ou esquivé, ses dégâts directs vont à l'attaquant, et le texte le dit
 * (Conque des vents). `validateRelics` garantit le reste : vers l'adversaire, seulement des dégâts directs ; aucune
 * relâche de jauges.
 */
function effectText(e: Effect, attacker = false): string {
  switch (e.type) {
    case 'damage':
      // Contre l'armure (Clous de pavois, 2026-10-27, M4) : ce ne sont plus des dégâts directs
      if (e.armored && e.target === 'opponent') return `${e.hits ? `${e.hits} × ` : ''}${e.amount} dégâts contre l'armure de ${attacker ? "l'attaquant" : "l'adversaire"}`
      return `${e.hits ? `${e.hits} × ` : ''}${e.amount} dégâts directs${e.target === 'opponent' ? (attacker ? " à l'attaquant" : '') : ' à soi-même'}`
    case 'heal':
      return `+${e.amount} PV`
    case 'applyStatus': {
      const def = STATUSES[e.status]
      // Une affliction de source (Dard de guêpe) : « 2 Poison à l'adversaire », comme une compétence
      if (e.target === 'opponent') return `${e.stacks} ${lowerFirst(e.stacks > 1 ? (def.plural ?? def.name) : def.name)} à l'adversaire`
      // Un statut qui se compte prend son pluriel (« +2 coups de chance ») ; les autres ne varient pas (« +4 armure temporaire »)
      return `+${e.stacks} ${lowerFirst(e.stacks > 1 ? (def.plural ?? def.name) : def.name)}${e.turns ? ` (${e.turns} tours)` : ''}`
    }
    case 'cleanse': {
      const kind = e.polarity === 'negative' ? 'malus' : 'bonus'
      const what = e.count === undefined ? `tous ses ${kind}` : e.count === 1 ? `son dernier ${kind}` : `ses ${e.count} derniers ${kind}`
      return `retire ${what}${e.orElse ? ` (sinon ${effectText(e.orElse)})` : ''}`
    }
    case 'release':
      return `relâche ${lowerFirst(STATUSES[e.status].name)}`
  }
}

/** Le moment d'une relique de coup, en clair, après son effet : « sur un 1 », « lors d'un coup reçu ». */
const STRIKE_MOMENT: Record<StrikeTrigger, string> = {
  naturalOne: 'sur un 1',
  naturalTwo: 'sur un 2',
  naturalThree: 'sur un 3',
  naturalMax: `sur un ${DIE_FACES}`,
  hit: "lors d'un coup qui touche",
  crit: "lors d'un coup critique",
  missed: "lors d'un coup manqué",
  dodge: "lors d'une esquive",
  hurt: "lors d'un coup reçu",
  healed: 'à chaque soin reçu',
  shieldBroken: 'quand son armure temporaire est vidée',
  reflected: 'quand il renvoie des dégâts',
  // Retour du 2026-10-27 : la phrase de l'utilisateur (« les lancers de pièce gagnants octroient +2 coups de chance »)
  heads: 'à chaque lancer de pièce gagnant',
}

/** Les adversaires qui portent ce statut, en un mot quand il existe (« +2 dégâts aux adversaires empoisonnés »). */
const BEARERS: Partial<Record<StatusId, string>> = { poison: 'empoisonnés', bleed: 'qui saignent', burn: 'qui brûlent' }

/**
 * Une condition, en clair, après l'effet : sur un bonus de coup, le statut que porte l'adversaire (« aux adversaires
 * empoisonnés ») ; sur un coup qui touche, sa taille (« de 6 dégâts ou plus ») ; sinon la condition des compétences.
 */
function conditionText(c: Condition, r: Relic): string {
  if (c.type === 'hasStatus' && c.who === 'opponent' && r.rollBonus !== undefined) {
    const name = lowerFirst(STATUSES[c.status].name)
    return `aux adversaires ${c.stacks ? `qui portent ${c.stacks} ${name} ou plus` : (BEARERS[c.status] ?? `qui portent ${name}`)}`
  }
  if (c.type === 'hitAtLeast') return `de ${c.amount} dégâts ou plus`
  return conditionClause(c)
}

/**
 * Quand elle agit, après l'effet : sa face (« sur un 4 »), son moment (« lors d'un coup reçu », « tous les 3 tours »,
 * « quand ses PV passent sous 40 % »), puis ses conditions ; rien pour une relique toujours active.
 */
function momentOf(r: Relic): string {
  const t = r.trigger
  const head = (() => {
    if (!t) return r.onFace !== undefined ? `sur un ${r.onFace}` : ''
    switch (t.type) {
      case 'turn': {
        if (r.charges === 1) return `au ${ordinal(t.turn)} tour`
        const every = r.cooldown ? `tous les ${r.cooldown} tours` : 'à chaque tour'
        return t.turn === (r.cooldown ?? 1) ? every : `au ${ordinal(t.turn)} tour, puis ${every}`
      }
      case 'hpBelow':
        return `quand ${t.who === 'opponent' ? "les PV de l'adversaire passent" : 'ses PV passent'} sous ${Math.round(t.ratio * 100)} %`
      case 'strike':
        return STRIKE_MOMENT[t.on]
      case 'lethal':
        return 'quand il devrait tomber'
      case 'initiative':
        return "sans jet d'initiative"
    }
  })()
  return [head, ...(r.when ?? []).map((c) => conditionText(c, r))].filter(Boolean).join(' ')
}

/**
 * Sa limite, une seule (`validateRelics`) : « 2x » par combat, ou « recharge 3 tours ». Une relique de tour dit sa
 * recharge, ou sa charge unique, par son moment (« tous les 3 tours », « au 4e tour »).
 */
function limitOf(r: Relic): string {
  const turn = r.trigger?.type === 'turn'
  if (r.charges !== undefined) return turn && r.charges === 1 ? '' : `${r.charges}x`
  return r.cooldown && !turn ? `recharge ${r.cooldown} tours` : ''
}

export interface RelicDescription {
  /**
   * La règle en une ligne, au style de l'utilisateur (2026-10-24) : l'effet d'abord, la condition en clair, la limite en
   * « 2x » (« +4 armure temporaire lors d'un coup reçu, 2x », « +2 dégâts aux adversaires empoisonnés »). Ni type de
   * relique, ni élément, ni type de dégâts.
   */
  text: string
  /** Statuts qu'elle pose, avec leur cible */
  posed: { status: StatusId; target: Target }[]
}

/** La seule rédaction d'une relique : infobulle, compendium, écran de récompense, trace et rapports la lisent. */
export function describeRelic(r: Relic): RelicDescription {
  const t = r.trigger
  const effect = [
    ...Object.entries(r.stats ?? {}).map(([k, v]) => STAT_TEXT[k as keyof CharacterStats](v)),
    r.headsChance ? `${signed(Math.round(r.headsChance * 100))} % de chances de faire pile` : '',
    r.rollBonus ? `${signed(r.rollBonus)} dégâts` : '',
    // Sursis et initiative : leur effet est leur règle, sans effet de compétence
    t?.type === 'lethal' ? 'reste à 1 PV' : t?.type === 'initiative' ? 'joue le premier tour' : '',
    ...(r.effects ?? []).map((e) => effectText(e, t?.type === 'strike' && (t.on === 'hurt' || t.on === 'dodge' || t.on === 'shieldBroken'))),
  ]
    .filter(Boolean)
    .join(' et ')
  const rule = [effect, momentOf(r)].filter(Boolean).join(' ')
  const limit = limitOf(r)
  const posed = (r.effects ?? []).flatMap((e) => (e.type === 'applyStatus' ? [{ status: e.status, target: e.target ?? ('self' as const) }] : []))
  return { text: typeset(capitalize(limit ? `${rule}, ${limit}` : rule)), posed }
}

/* ---------- Validation ---------- */

/** Les seules afflictions qu'une relique pose à l'adversaire : les reliques de source (exception à la règle 7, 2026-10-25). */
const SOURCE_AFFLICTIONS: readonly StatusId[] = ['poison', 'burn']

/** Erreurs de définition du registre (vide si tout va bien). Vérifié par les tests. */
export function validateRelics(relics: readonly Relic[] = RELICS): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const r of relics) {
    const at = (msg: string) => errors.push(`${r.id} : ${msg}`)
    if (ids.has(r.id)) at('identifiant en double')
    ids.add(r.id)
    if (!/^[a-z]+(-[a-z]+)*$/.test(r.id)) at('identifiant en kebab-case attendu')
    if (!r.name || !r.flavor) at('nom et phrase d’ambiance requis')
    // Un seul type par relique : des stats, une chance de pile, un bonus de coup, ou un déclencheur et ses effets
    const families = [r.stats !== undefined, r.headsChance !== undefined, r.rollBonus !== undefined, r.trigger !== undefined].filter(Boolean).length
    if (families !== 1) at('une relique a un seul type : stats, chance de pile, bonus de coup ou déclencheur')
    if (r.headsChance !== undefined && !(r.headsChance > 0 && r.headsChance <= 0.5)) at('chance de pile : entre 0 et 0,5 (au plus 100 % de pile)')
    if (r.stats && Object.keys(r.stats).length === 0) at('stats vides')
    // L'attaque s'écrit à plat sur toute sa fourchette : autant au minimum qu'au maximum
    if ((r.stats?.attackMin ?? 0) !== (r.stats?.attackMax ?? 0)) at("l'attaque se change autant au minimum qu'au maximum")
    if (r.rollBonus !== undefined && (!Number.isInteger(r.rollBonus) || r.rollBonus === 0)) at('bonus de coup entier et non nul')
    if (r.onFace !== undefined && (r.rollBonus === undefined || !Number.isInteger(r.onFace) || r.onFace < 1)) at('face : un entier ≥ 1, avec un bonus de coup')
    // Sursis et initiative : leur règle est leur effet ; le sursis part une fois (une charge), l'initiative une fois par nature
    const bare = r.trigger?.type === 'lethal' || r.trigger?.type === 'initiative'
    if (r.trigger && !bare && !r.effects?.length) at('un déclencheur sans effet')
    if (bare && (r.effects?.length || r.when || r.scene)) at('sursis et initiative : sans effet, condition ni scène')
    if (r.trigger?.type === 'lethal' && r.charges !== 1) at('sursis : une charge')
    if (r.trigger?.type === 'initiative' && (r.charges !== undefined || r.cooldown !== undefined)) at('initiative : sans limite')
    if (!r.trigger && (r.effects || r.charges !== undefined || r.cooldown !== undefined)) at('effets, charges et recharge demandent un déclencheur')
    // Des conditions : sur un déclencheur, ou sur un bonus de coup (lues au coup qui touche, avant le critique)
    if (r.when && !r.trigger && r.rollBonus === undefined) at('des conditions demandent un déclencheur ou un bonus de coup')
    for (const c of r.when ?? []) {
      if (c.type === 'hasStatus' && c.stacks !== undefined && (!Number.isInteger(c.stacks) || c.stacks < 1)) at('condition hasStatus : charges entières ≥ 1')
      // « Ce coup retire N PV » : le nombre n'existe que dans les fenêtres d'un coup qui touche, pas encore au bonus de coup
      if (c.type === 'hitAtLeast' && (!Number.isInteger(c.amount) || c.amount < 1)) at('condition hitAtLeast : un entier ≥ 1')
      if (c.type === 'hitAtLeast' && !(r.trigger?.type === 'strike' && TOUCH_MOMENTS.includes(r.trigger.on)))
        at('condition hitAtLeast : sur un moment d’un coup qui touche (touche, critique, encaisse)')
    }
    if (r.charges !== undefined && (!Number.isInteger(r.charges) || r.charges < 1)) at('charges : entier ≥ 1')
    if (r.cooldown !== undefined && (!Number.isInteger(r.cooldown) || r.cooldown < 1)) at('recharge : entier ≥ 1')
    // Une seule limite (2026-10-24, retour de l'utilisateur) : des charges, ou une recharge
    if (r.charges !== undefined && r.cooldown !== undefined) at('une seule limite : des charges ou une recharge')
    const t = r.trigger
    if (t?.type === 'turn' && (!Number.isInteger(t.turn) || t.turn < 1)) at('tour : entier ≥ 1')
    if (t?.type === 'hpBelow' && !(t.ratio > 0 && t.ratio < 1)) at('seuil : part des PV entre 0 et 1')
    if (t?.type === 'strike' && !(STRIKE_TRIGGERS as readonly string[]).includes(t.on)) at(`moment de coup inconnu : ${t.on}`)
    // Relique à scène : sur une relique qui se déclenche. Une scène qui vise l'adversaire fait tomber un coup par impact :
    // autant d'impacts que de coups de ses dégâts directs
    if (r.scene) {
      const timing = SCENE_EVENTS[r.scene]
      if (!timing) at(`scène inconnue : ${r.scene}`)
      else if (!r.trigger) at('une scène demande un déclencheur')
      else if (timing.aim !== 'self') {
        const blows = (r.effects ?? []).reduce((n, e) => n + (e.type === 'damage' && e.target === 'opponent' ? (e.hits ?? 1) : 0), 0)
        if (blows !== timing.impacts.length) at(`scène à ${timing.impacts.length} impacts pour ${blows} coups`)
      } else if (timing.impacts.length !== 1) at('une scène sur le porteur a un seul impact')
    }
    for (const e of r.effects ?? []) {
      if (e.type === 'applyStatus' && !STATUSES[e.status]) at(`statut inconnu : ${e.status}`)
      // Retour du 2026-10-27 (M10) : une pièce est une compétence de la Fortune, jamais une relique
      if (e.type === 'applyStatus' && STATUSES[e.status]?.coinToss) at(`une relique ne lance pas de pièce : ${e.status}`)
      if (e.type === 'release') at('une relique ne relâche pas de jauges')
      // Règle 7 (décision de l'utilisateur) : une relique agit sur son porteur, jamais de malus sur l'adversaire.
      // Vers l'adversaire, seuls les dégâts directs ; un statut posé est un bonus du porteur. Exception (reliques de
      // source, 2026-10-25) : le Poison et la Brûlure, des afflictions de source
      const source = e.type === 'applyStatus' && e.target === 'opponent' && SOURCE_AFFLICTIONS.includes(e.status)
      if (e.target === 'opponent' && e.type !== 'damage' && !source) at('vers l’adversaire, une relique ne fait que des dégâts directs')
      if (e.type === 'applyStatus' && STATUSES[e.status]?.polarity === 'negative' && !source) at(`une relique ne pose pas de malus : ${e.status}`)
    }
  }
  return errors
}

/* ---------- Récompense de tournoi ---------- */

/** Nombre de reliques proposées après une victoire. */
export const OFFER_SIZE = 3

/**
 * L'offre d'une victoire : `OFFER_SIZE` reliques tirées parmi celles que le vainqueur n'a pas encore.
 * `focus` (offre orientée, règles v2, docs/PROGRESSION.md § 13.2) : la première se tire au poids que `focus` lui donne
 * (l'écho avec le build), les autres restent libres, à parts égales.
 */
export function drawOffer(held: readonly string[], rng: Rng, pool: readonly string[] = RELIC_IDS, focus?: (id: string) => number): string[] {
  const open = pool.filter((id) => !held.includes(id))
  if (!focus || open.length === 0) return shuffle(rng, open).slice(0, OFFER_SIZE)
  const echo = pickWeighted(rng, open, focus)
  return [echo, ...shuffle(rng, open.filter((id) => id !== echo)).slice(0, OFFER_SIZE - 1)]
}

/**
 * Le choix du vainqueur quand personne ne choisit pour lui (match simulé depuis l'arbre, ou choix par défaut
 * de l'écran de victoire) : une relique de l'offre au hasard, à parts égales.
 */
export const autoPick = (offer: readonly string[], rng: Rng): string | undefined => (offer.length ? pick(rng, offer) : undefined)
