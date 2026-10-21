import orcIdleImg from '../assets/orc-idle.png'
import orcAttackImg from '../assets/orc-attack.png'
import orcDodgeImg from '../assets/orc-dodge.png'
import orcKoImg from '../assets/orc-ko.png'
import orcVictoryImg from '../assets/orc-victory.png'
import orcHurtImg from '../assets/orc-hurt.png'
import elfIdleImg from '../assets/elf-idle.png'
import elfAttackImg from '../assets/elf-attack.png'
import elfDodgeImg from '../assets/elf-dodge.png'
import elfHurtImg from '../assets/elf-hurt.png'
import elfKoImg from '../assets/elf-ko.png'
import elfVictoryImg from '../assets/elf-victory.png'
import dwarfIdleImg from '../assets/dwarf-idle.png'
import dwarfAttackImg from '../assets/dwarf-attack.png'
import dwarfDodgeImg from '../assets/dwarf-dodge.png'
import dwarfHurtImg from '../assets/dwarf-hurt.png'
import dwarfKoImg from '../assets/dwarf-ko.png'
import dwarfVictoryImg from '../assets/dwarf-victory.png'
import undeadIdleImg from '../assets/undead-idle.png'
import undeadAttackImg from '../assets/undead-attack.png'
import undeadDodgeImg from '../assets/undead-dodge.png'
import undeadHurtImg from '../assets/undead-hurt.png'
import undeadKoImg from '../assets/undead-ko.png'
import undeadVictoryImg from '../assets/undead-victory.png'
import humanIdleImg from '../assets/human-idle.png'
import humanAttackImg from '../assets/human-attack.png'
import humanDodgeImg from '../assets/human-dodge.png'
import humanHurtImg from '../assets/human-hurt.png'
import humanKoImg from '../assets/human-ko.png'
import humanVictoryImg from '../assets/human-victory.png'
import lizardIdleImg from '../assets/lizardman-idle.png'
import lizardAttackImg from '../assets/lizardman-attack.png'
import lizardDodgeImg from '../assets/lizardman-dodge.png'
import lizardHurtImg from '../assets/lizardman-hurt.png'
import lizardKoImg from '../assets/lizardman-ko.png'
import lizardVictoryImg from '../assets/lizardman-victory.png'
import paladinIdleImg from '../assets/paladin-idle.png'
import paladinAttackImg from '../assets/paladin-attack.png'
import paladinDodgeImg from '../assets/paladin-dodge.png'
import paladinHurtImg from '../assets/paladin-hurt.png'
import paladinKoImg from '../assets/paladin-ko.png'
import paladinVictoryImg from '../assets/paladin-victory.png'
import ogreIdleImg from '../assets/ogre-idle.png'
import ogreAttackImg from '../assets/ogre-attack.png'
import ogreDodgeImg from '../assets/ogre-dodge.png'
import ogreHurtImg from '../assets/ogre-hurt.png'
import ogreKoImg from '../assets/ogre-ko.png'
import ogreVictoryImg from '../assets/ogre-victory.png'
import druidIdleImg from '../assets/druid-idle.png'
import druidAttackImg from '../assets/druid-attack.png'
import druidDodgeImg from '../assets/druid-dodge.png'
import druidHurtImg from '../assets/druid-hurt.png'
import druidKoImg from '../assets/druid-ko.png'
import druidVictoryImg from '../assets/druid-victory.png'
import bearIdleImg from '../assets/druid-bear-idle.png'
import bearAttackImg from '../assets/druid-bear-attack.png'
import bearDodgeImg from '../assets/druid-bear-dodge.png'
import bearHurtImg from '../assets/druid-bear-hurt.png'
import bearKoImg from '../assets/druid-bear-ko.png'
import bearVictoryImg from '../assets/druid-bear-victory.png'
import bardIdleImg from '../assets/bard-idle.png'
import bardAttackImg from '../assets/bard-attack.png'
import bardDodgeImg from '../assets/bard-dodge.png'
import bardHurtImg from '../assets/bard-hurt.png'
import bardKoImg from '../assets/bard-ko.png'
import bardVictoryImg from '../assets/bard-victory.png'
import { Character, type CharacterDef } from './character'
import type { CharacterEvent } from './events'
import { isDoubleTrigger, ROLL_TRIGGERS } from './events'
import { STATUSES } from './statuses'

/** Foudre du druide (0.76.0, demande de l'utilisateur) : trois éclairs de 2 dégâts directs chacun, jamais critiques. */
const THUNDERBOLT = 2
const THUNDERBOLT_HITS = 3

/*
 * Archétypes par race :
 * - Orc : brute, beaucoup de PV et un gros dé, mais lent à esquiver.
 * - Elfe : agile, peu de PV, esquive et critiques fréquents.
 * - Nain : tank, le plus de PV et une armure temporaire qui s'use, critiques rares mais lourds.
 * - Mort-vivant : affliction, endurant et peu esquiveur, il empoisonne l'adversaire.
 * - Humain (prêtresse) : contrôle, un petit dé (d7) mais des compétences sur 3 de ses 7 faces.
 * - Homme-lézard (voleuse) : chance et poison, esquive et critiques, coups de dés à double tranchant.
 * Un seul personnage par famille depuis la 0.43.0 (les jumeaux de coloris sont retirés, chacun garde
 * les statistiques les plus pertinentes des deux, voir docs/PERSONNAGES.md). Trois compétences,
 * sur un 1, un 2 et un 3 au dé (le 3 donne une aura permanente, voir plus bas). Depuis la 0.27.0, la
 * plupart de ces jets sacrifient leur coup : ils servent seulement à déclencher la compétence (`forfeitsHit`).
 * - Orc : Pourfendre (1 : un vrai coup qui, s'il touche, pose Saignement 2) ; Furie des vents (2 : frappe deux fois tout de suite).
 * - Elfe : Œil de faucon (1 : prochain coup qui touche critique) ; Esquive améliorée (2 : esquive à coup sûr le prochain coup reçu,
 *   sans limite de durée depuis la 0.36.5).
 * - Nain : Peau de pierre (1 : +6 d'armure temporaire, cumulable) ; Épines acérées (2 : permanentes, chaque coup
 *   encaissé fait saigner l'attaquant, une charge de Saignement par charge d'épines).
 * - Mort-vivant : Souffle de la tombe (1 : Poison 3, qui s'estompe : 3, 2 puis 1 PV) ; Vol de vie (2 : son prochain
 *   coup porté rend les PV qu'il retire ; esquivé, la charge est perdue ; un jet de 1 à 3 la laisse en place).
 * Auras du 3, permanentes et cumulables (chaque nouveau 3 ajoute une charge) : Orc, Aura de puissance
 * (+2 dégâts par charge) ; Elfe, Aura de précision (+1 au multiplicateur de critique par charge) ; Nain,
 * Aura d'intimidation (l'adversaire frappe 2 de moins par charge) ; Mort-vivant, Aura glaciale (au début
 * de son tour, 1 charge de Poison par charge sur l'adversaire, depuis la 0.69.0).
 */

const gorak: CharacterDef = {
  id: 'gorak',
  name: 'Gorak',
  race: 'Orc',
  archetype: 'Brute',
  // Statistiques de Murzug, son ancien jumeau (0.43.0, un personnage par famille) : 57 PV et 18 % de critique.
  // Avec les siennes (61 PV, 10 %), il gagnait 46,8 % contre les neuf autres, 50,4 % ainsi.
  // Dé de d10 à d8 (0.50.0) : compensation de la Furie des vents instantanée (sinon 64 %).
  // d9 et 19 % de critique (0.69.0, choix de l'utilisateur) : la Furie frappe en coups bruts ; au d8, Gorak tombait à 39,8 %
  stats: { maxHp: 57, damageDie: 9, armor: 0, dodgeChance: 0.05, critChance: 0.19, critMultiplier: 2 },
  // Premier personnage à postures (0.40.0, docs/POSTURES.md). La toile commune est plus haute que la garde
  // seule (la garde en occupe 84 %, avec 13 % de vide au-dessus de la tête) : scale 1,18 pour sa taille 1,08.
  look: {
    image: orcIdleImg,
    poses: { attack: orcAttackImg, dodge: orcDodgeImg, hurt: orcHurtImg, ko: orcKoImg, victory: orcVictoryImg },
    facing: 'right',
    scale: 1.18,
    headroom: 0.13,
    portrait: { x: 49, y: 8, zoom: 3 },
  },
  lore: {
    tagline: 'Le roc des fosses de Kar-Dush.',
    background:
      "Sept saisons invaincu dans les fosses de combat de Kar-Dush. Gorak frappe sans finesse mais encaisse tout, et l'on dit qu'un coup manqué ne fait que l'énerver davantage.",
    strengths: ['Furie des vents : deux coups tout de suite', 'Critiques fréquents pour un orc (19 %)', 'Pourfendre : son 1 frappe et fait saigner'],
    weaknesses: ["N'esquive presque jamais", 'Aucune armure', 'Brutal mais prévisible'],
  },
  events: [
    {
      // 0.70.0 (proposition de l'utilisateur) : remplace la Saignée, qui sacrifiait le coup. Le 1 frappe pour
      // sa valeur (Aura de puissance et critique compris) et, s'il touche, pose Saignement 2 : un coup doit
      // toucher pour poser un malus physique. La plaie coule au coup suivant (RESOLUTION § 5, règle 9).
      // Version la plus forte des deux mesurées (Saignement 1 : −1,3 point), choisie par l'utilisateur.
      id: 'cleave',
      name: 'Pourfendre',
      nature: 'martial',
      trigger: 'naturalOne',
      needsTouch: true,
      effects: [{ type: 'applyStatus', status: 'bleed', stacks: 2, target: 'opponent' }],
    },
    {
      id: 'wind-fury',
      name: 'Furie des vents',
      nature: 'martial',
      trigger: 'naturalTwo',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'windFury', stacks: 1 }],
    },
    {
      id: 'power-aura',
      name: 'Aura de puissance',
      nature: 'martial',
      trigger: 'naturalThree',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'powerAura', stacks: 1 }],
    },
  ],
}

const elaria: CharacterDef = {
  id: 'elaria',
  name: 'Elaria',
  race: 'Elfe',
  archetype: 'Rôdeuse',
  // Statistiques de Sylwen, son ancienne jumelle (0.43.0) : même valeur (49,4 % contre 49,6 %), duels plus
  // resserrés (de 42 à 57 % au lieu de 40 à 62 %).
  stats: { maxHp: 50, damageDie: 8, armor: 0, dodgeChance: 0.26, critChance: 0.17, critMultiplier: 2.4 },
  // Postures (atelier des postures, 2026-10-20). L'arc dépasse de la tête : la taille se règle sur le
  // corps (capuche-pieds, 77 % de la toile), le reste compte dans `headroom` (comme Aldric et Ysolde)
  look: {
    image: elfIdleImg,
    poses: { attack: elfAttackImg, dodge: elfDodgeImg, hurt: elfHurtImg, ko: elfKoImg, victory: elfVictoryImg },
    facing: 'right',
    scale: 1.25,
    headroom: 0.22,
    // Toile large (fente de l'attaque, arc levé) : la garde n'occupe que le milieu. L'écran de fin et
    // l'affrontement la calent sur sa silhouette, pas sur sa toile
    bodyInset: { left: 0.18, right: 0.181 },
    portrait: { x: 42, y: 25, zoom: 4.8 },
  },
  lore: {
    tagline: 'Un souffle, une flèche.',
    background:
      "Éclaireuse des marches de Lithmeren, Elaria chasse à la lueur de la lune et n'est jamais là où l'ennemi frappe. Chaque tir manqué lui sert à mieux ajuster le suivant.",
    strengths: ['Meilleure esquive (26 %)', 'Critiques dévastateurs (×2,4)', 'Un jet raté prépare un critique'],
    weaknesses: ['PV modestes (50)', 'Petit dé (d8)', "Peine face aux boucliers et à l'intimidation"],
  },
  events: [
    {
      id: 'hawk-eye',
      name: 'Œil de faucon',
      nature: 'finesse',
      trigger: 'naturalOne',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }],
    },
    {
      id: 'evasion',
      name: 'Esquive améliorée',
      nature: 'finesse',
      trigger: 'naturalTwo',
      forfeitsHit: true,
      // Sans durée depuis la 0.36.5 : elle attend le prochain coup reçu. Avec une durée d'un tour, elle
      // s'éteignait sans servir une fois sur trois (coup adverse sacrifié ou tour perdu), comme la Riposte avant la 0.32.0.
      effects: [{ type: 'applyStatus', status: 'evasion', stacks: 1 }],
    },
    {
      id: 'precision-aura',
      name: 'Aura de précision',
      nature: 'finesse',
      trigger: 'naturalThree',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'precisionAura', stacks: 1 }],
    },
  ],
}

const brokk: CharacterDef = {
  id: 'brokk',
  name: 'Brokk',
  race: 'Nain',
  archetype: 'Gardien',
  // Statistiques de Grimbald, son ancien jumeau (0.43.0) : d10 et 57 PV. Avec les siennes (d8, 68 PV), Ysolde
  // ne le battait qu'à 26 % (contre connu) ; ainsi, tous ses duels tiennent entre 45 et 60 %.
  stats: { maxHp: 57, damageDie: 10, armor: 0, dodgeChance: 0.06, critChance: 0.1, critMultiplier: 2.5 },
  // Nouveau modèle et postures (atelier des postures, 2026-10-20), création originale qui remplace le
  // placeholder. La hache dépasse de la tête : la taille se règle sur le corps (tête-pieds, 71,6 % de la
  // toile), le reste compte dans `headroom` (comme Aldric). La hache du K.O. descend sous les pieds
  look: {
    image: dwarfIdleImg,
    poses: { attack: dwarfAttackImg, dodge: dwarfDodgeImg, hurt: dwarfHurtImg, ko: dwarfKoImg, victory: dwarfVictoryImg },
    facing: 'right',
    scale: 1.14,
    headroom: 0.23,
    footroom: 0.035,
    bodyInset: { left: 0.139, right: 0.139 },
    portrait: { x: 60, y: 33, zoom: 4.6 },
  },
  lore: {
    tagline: 'Ce qui passe la porte passe par moi.',
    background:
      "Gardien héréditaire de la grande porte de Durnhold, Brokk n'a jamais reculé d'un pas. Il encaisse plus que quiconque, et chaque faux pas le rend plus dur encore.",
    strengths: ['Gros dé (d10)', 'Peau de pierre cumulable', 'Critiques lourds (×2,5)'],
    weaknesses: ['Critiques peu fréquents (10 %)', 'Esquive faible', 'Lent à prendre l’avantage'],
  },
  events: [
    {
      id: 'stoneskin',
      name: 'Peau de pierre',
      nature: 'martial',
      trigger: 'naturalOne',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 6 }],
    },
    {
      id: 'thorns',
      name: 'Épines acérées',
      nature: 'martial',
      trigger: 'naturalTwo',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'thorns', stacks: 1 }],
    },
    {
      id: 'intimidation-aura',
      name: "Aura d'intimidation",
      nature: 'martial',
      trigger: 'naturalThree',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'intimidationAura', stacks: 1 }],
    },
  ],
}

const ervald: CharacterDef = {
  id: 'ervald',
  name: 'Ervald',
  race: 'Mort-vivant',
  archetype: 'Chevalier liche',
  // Statistiques de Caldrec, son ancien jumeau (0.43.0) : d10, sans armure, 56 PV, 16 % de critique.
  // 48,8 % contre les neuf autres (46,7 % avec les siennes).
  stats: { maxHp: 56, damageDie: 10, armor: 0, dodgeChance: 0.08, critChance: 0.16, critMultiplier: 2 },
  // Postures (atelier des postures, 2026-10-20) : la garde occupe 83,4 % de la toile ; la même hauteur
  // à l'écran qu'avant (0,98 × 0,99 de l'ancienne image) donne scale 0,97 / 0,834 = 1,16
  look: {
    image: undeadIdleImg,
    poses: { attack: undeadAttackImg, dodge: undeadDodgeImg, hurt: undeadHurtImg, ko: undeadKoImg, victory: undeadVictoryImg },
    facing: 'right',
    scale: 1.16,
    headroom: 0.15, // part vide au-dessus de la tête (l'épée levée de la victoire)
    bodyInset: { left: 0.221, right: 0.222 },
    portrait: { x: 56, y: 19, zoom: 5 },
  },
  lore: {
    tagline: 'La mort l’a rendu, pas pardonné.',
    background:
      "Ancien capitaine de la garde d'Ostremort, Ervald est tombé en défendant la cité, puis s'est relevé sous son étendard pourpre. Il ne fatigue jamais, et son souffle glacé ronge lentement ceux qui l'affrontent.",
    strengths: ['Empoisonne sur un jet raté', 'Gros dé (d10)', 'Critiques fréquents (16 %)'],
    weaknesses: ["N'esquive presque jamais", 'Aucune armure', 'Dégâts lents à venir'],
  },
  events: [
    {
      id: 'grave-breath',
      name: 'Souffle de la tombe',
      nature: 'arcane',
      trigger: 'naturalOne',
      forfeitsHit: true,
      // Poison 3 : 3, 2 puis 1 PV, les 6 PV de l'ancien poison 2 pendant 3 tours (0.36.4)
      effects: [{ type: 'applyStatus', status: 'poison', stacks: 3, target: 'opponent' }],
    },
    {
      id: 'life-steal',
      name: 'Vol de vie',
      nature: 'arcane',
      trigger: 'naturalTwo',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'lifesteal', stacks: 2 }],
    },
    {
      id: 'frost-aura',
      name: 'Aura glaciale',
      nature: 'arcane',
      trigger: 'naturalThree',
      forfeitsHit: true,
      // 0.69.0 : l'aura pose du vrai Poison (cumulable, sans compensation), au lieu de dégâts directs
      effects: [{ type: 'applyStatus', status: 'frostAura', stacks: 1 }],
    },
  ],
}

/** Dégâts directs de la Purification quand il n'y a aucun bonus à retirer (0.42.0). */
const PURIFICATION_LIGHT = 5

const ysolde: CharacterDef = {
  id: 'ysolde',
  name: 'Ysolde',
  race: 'Humain',
  archetype: 'Prêtresse solaire',
  // Petit dé (d7) : 3 jets sur 7 (1 à 3) déclenchent une compétence au lieu de frapper. Un d6 (un jet
  // sur deux) la rendait trop dépendante de l'Aura de sainteté : 63 % de victoires, combats de 52 tours.
  stats: { maxHp: 52, damageDie: 7, armor: 0, dodgeChance: 0.08, critChance: 0.1, critMultiplier: 2 },
  // Postures (atelier des postures, 2026-10-20). La masse levée et le halo dépassent de la tête : la taille
  // se règle sur le corps (tête-pieds, 74 % de la toile), le reste compte dans `headroom` (comme Aldric)
  look: {
    image: humanIdleImg,
    poses: { attack: humanAttackImg, dodge: humanDodgeImg, hurt: humanHurtImg, ko: humanKoImg, victory: humanVictoryImg },
    facing: 'right',
    scale: 1.25,
    headroom: 0.245,
    bodyInset: { left: 0.215, right: 0.215 },
    portrait: { x: 52, y: 28, zoom: 5 },
  },
  lore: {
    tagline: 'Le soleil ne frappe pas. Il juge.',
    background:
      "Gardienne du sanctuaire d'Aurelhaven, Ysolde combat à la masse sacrée, mais sa vraie arme est sa foi : elle terrifie, purifie et se relève sous la lumière.",
    strengths: ['Compétences sur 3 jets sur 7', 'Peur : l’adversaire perd son tour', 'Se soigne chaque tour (sainteté)'],
    weaknesses: ['Petit dé (d7)', 'Peu de dégâts par coup', 'Esquive faible'],
  },
  events: [
    {
      id: 'fear',
      name: 'Peur',
      nature: 'arcane',
      trigger: 'naturalOne',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'fear', stacks: 1, target: 'opponent' }],
    },
    {
      id: 'purification',
      name: 'Purification',
      nature: 'arcane',
      trigger: 'naturalTwo',
      forfeitsHit: true,
      // 0.42.0 : quand l'adversaire n'a aucun bonus à retirer, la lumière le blesse (dégâts directs) au lieu
      // de tomber à vide (54 % des déclenchements avant). Contre un adversaire à bonus (Brokk), rien ne change.
      // 0.69.0 (choix de l'utilisateur, SORTS.md § 14 et 15) : elle retire aussi son propre dernier malus (un
      // poison, une plaie, une brûlure). L'Aura glaciale cumulable la mettait à 41,3 % ; ainsi, 43,4 %.
      effects: [
        { type: 'cleanse', polarity: 'positive', count: 1, target: 'opponent', orElse: { type: 'damage', amount: PURIFICATION_LIGHT, target: 'opponent' } },
        { type: 'cleanse', polarity: 'negative', count: 1 },
      ],
    },
    {
      id: 'holy-aura',
      name: 'Aura de sainteté',
      nature: 'arcane',
      trigger: 'naturalThree',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'holyAura', stacks: 1 }],
    },
  ],
}

const naraxes: CharacterDef = {
  id: 'naraxes',
  name: 'Naraxes',
  race: 'Homme-lézard',
  archetype: 'Voleuse',
  // Gros dé (d10) : moins de jets de compétence (3 sur 10) et de plus gros coups. Avec un d8, Pile ou face
  // et Coup de chance, qui ne frappent pas, la laissaient à 33 % de victoires.
  stats: { maxHp: 50, damageDie: 10, armor: 0, dodgeChance: 0.2, critChance: 0.14, critMultiplier: 2 },
  // Postures (0.40.0, docs/POSTURES.md) : la garde occupe 81 % de la toile commune, avec 14 % de vide
  // au-dessus de la tête (dague levée de l'attaque) : scale 1,10 pour sa taille 0,97.
  look: {
    image: lizardIdleImg,
    poses: { attack: lizardAttackImg, dodge: lizardDodgeImg, hurt: lizardHurtImg, ko: lizardKoImg, victory: lizardVictoryImg },
    facing: 'right',
    scale: 1.1,
    headroom: 0.14,
    // 6 % de vide sous ses pieds (sa queue au K.O. descend plus bas) : elle paraissait flotter. Redescendue
    // de 4 %, comme l'orc et la barde (2 à 3 %) ; demande de l'utilisateur
    footroom: 0.04,
    portrait: { x: 62, y: 16, zoom: 3.2 },
  },
  lore: {
    tagline: 'Pile, je gagne. Face, tu perds quand même.',
    background:
      "Coupe-bourse des marais de Sszeth, Naraxes vit de paris et de lames enduites. Elle joue tout sur un coup de chance, et ce qu'elle ne tue pas, son poison s'en charge.",
    strengths: ['Bonne esquive (20 %)', 'Pile ou face : 10 dégâts aussitôt', 'Lames empoisonnées (décoction)'],
    weaknesses: ['Peu de PV', 'Hasard à double tranchant', 'Aucune armure'],
  },
  events: [
    {
      id: 'lucky-strike',
      name: 'Coup de chance',
      nature: 'finesse',
      trigger: 'naturalOne',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'luckyStrike', stacks: 1 }],
    },
    {
      id: 'coin-flip',
      name: 'Pile ou face',
      nature: 'finesse',
      trigger: 'naturalTwo',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }],
    },
    {
      id: 'decoction-aura',
      name: 'Aura de décoction',
      nature: 'finesse',
      trigger: 'naturalThree',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'decoctionAura', stacks: 1 }],
    },
  ],
}

/*
 * 0.42.0 : esquive de 5 à 2 %, en compensation de l'Aura d'immunité qui donne +1 d'armure (Aldric
 * battait sinon Thaldrin à 66-68 %). Depuis la 0.43.0, il a les statistiques de Gauvain (7 %).
 */
const aldric: CharacterDef = {
  id: 'aldric',
  name: 'Aldric',
  race: 'Humain',
  archetype: 'Paladin',
  // Critiques lourds (12 % ×2,5 depuis la 0.32.0, quand la riposte a cessé de s'éteindre à vide) : face à l'intimidation du nain, ses coups moyens ne passaient pas (Brokk le battait à 75 %).
  // Statistiques de Gauvain, son ancien jumeau (0.43.0) : 54 PV, 7 % d'esquive, 17 % de critique.
  // 50,1 % contre les neuf autres (52,7 % avec les siennes).
  stats: { maxHp: 54, damageDie: 8, armor: 0, dodgeChance: 0.07, critChance: 0.17, critMultiplier: 2.5 },
  // Nouveau modèle et postures (atelier des postures, 2026-10-20) : épée basse, plus rien au-dessus de la
  // tête que la hampe de la bannière. La taille se règle sur le corps (tête-pieds, 77 % de la toile) et non
  // sur la hampe : le vide et la bannière au-dessus de la tête comptent dans `headroom`
  look: {
    image: paladinIdleImg,
    poses: { attack: paladinAttackImg, dodge: paladinDodgeImg, hurt: paladinHurtImg, ko: paladinKoImg, victory: paladinVictoryImg },
    facing: 'right',
    scale: 1.24,
    headroom: 0.21,
    bodyInset: { left: 0.198, right: 0.198 },
    portrait: { x: 55, y: 22, zoom: 5.2 },
  },
  lore: {
    tagline: 'Chaque coup reçu est une dette.',
    background:
      "Champion de l'ordre du Sceau ardent, Aldric porte la bannière dans les pires mêlées. Il encaisse sans broncher, tient le compte des coups reçus et rend la justice d'un seul revers.",
    strengths: ['Rétribution : rend les coups reçus', 'Critiques fréquents et lourds (17 %, ×2,5)', 'Immunité aux malus et +1 d’armure (aura)'],
    weaknesses: ['Esquive faible (7 %)', 'Rétribution dérisoire si on ne l’a pas frappé', 'Aucune armure sans son aura'],
  },
  events: [
    {
      id: 'retribution',
      name: 'Rétribution',
      nature: 'arcane',
      trigger: 'naturalOne',
      forfeitsHit: true,
      effects: [{ type: 'release', status: 'retribution', min: 1, target: 'opponent' }],
    },
    {
      id: 'riposte',
      name: 'Riposte',
      nature: 'martial',
      trigger: 'naturalTwo',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'riposte', stacks: 2 }],
    },
    {
      id: 'immunity-aura',
      name: "Aura d'immunité",
      nature: 'arcane',
      trigger: 'naturalThree',
      forfeitsHit: true,
      effects: [
        { type: 'cleanse', polarity: 'negative' },
        { type: 'applyStatus', status: 'immunityAura', stacks: 1 },
      ],
    },
  ],
}

/** Attente : un 1, un 2 ou un 3 laisse l'ogre planté là, sans frapper (il n'a aucune compétence). */
const waitOn = (trigger: 'naturalOne' | 'naturalTwo' | 'naturalThree', face: number): CharacterEvent => ({
  id: `waiting-${face}`,
  name: 'Attente',
  nature: 'neutral',
  trigger,
  forfeitsHit: true,
  effects: [{ type: 'applyStatus', status: 'waiting', stacks: 1, turns: 1 }],
})

const morgrut: CharacterDef = {
  id: 'morgrut',
  name: 'Morgrut',
  race: 'Ogre',
  archetype: 'Cogneur',
  // Aucune compétence : un d14 et de la masse. Un jet de 1 à 3 (3 sur 14) le laisse attendre.
  // Aucun critique (il ne vise pas) : avec 8 % de critique et 66 PV, il gagnait 63 % de ses combats.
  stats: { maxHp: 63, damageDie: 14, armor: 0, dodgeChance: 0, critChance: 0, critMultiplier: 2 },
  // Postures (atelier des postures, 2026-10-20). La garde (casque compris) occupe 70,3 % de la toile, que
  // la massue levée de la victoire rend haute : même taille à l'écran qu'avant (1,13 d'un humain). La
  // massue du coup encaissé et du K.O. descend sous les pieds
  look: {
    image: ogreIdleImg,
    poses: { attack: ogreAttackImg, dodge: ogreDodgeImg, hurt: ogreHurtImg, ko: ogreKoImg, victory: ogreVictoryImg },
    facing: 'right',
    scale: 1.48,
    headroom: 0.22,
    footroom: 0.06,
    // Toile large (massue levée) : sans cela, l'écran de fin le décalait vers la droite, sur son nom
    bodyInset: { left: 0.215, right: 0.214 },
    portrait: { x: 56, y: 28, zoom: 4.6 },
  },
  lore: {
    tagline: 'Taper. Attendre. Taper plus fort.',
    background:
      "Morgrut ne sait ni compter ni viser, mais personne n'a jamais encaissé deux fois sa massue. Quand il ne comprend pas ce qu'il fait, et ça arrive, il attend.",
    strengths: ['Énorme dé (d14)', 'Beaucoup de PV', 'Coups dévastateurs'],
    weaknesses: ['Aucune compétence', 'Sur 1, 2 ou 3, il attend sans frapper', "Ni esquive ni critique"],
  },
  events: [waitOn('naturalOne', 1), waitOn('naturalTwo', 2), waitOn('naturalThree', 3)],
}

const thaldrin: CharacterDef = {
  id: 'thaldrin',
  name: 'Thaldrin',
  race: 'Sylvain',
  archetype: 'Druide',
  stats: { maxHp: 56, damageDie: 10, armor: 0, dodgeChance: 0.08, critChance: 0.08, critMultiplier: 2 },
  // Postures (atelier des postures, 2026-10-20). La garde (bâton et bois compris) occupe 83,9 % de la toile,
  // que le bâton levé de la victoire rend haute : même taille à l'écran qu'avant (1,00 d'un humain)
  look: {
    image: druidIdleImg,
    poses: { attack: druidAttackImg, dodge: druidDodgeImg, hurt: druidHurtImg, ko: druidKoImg, victory: druidVictoryImg },
    facing: 'right',
    scale: 1.1,
    headroom: 0.155,
    // Toile large (fente de l'attaque) : la garde n'en occupe que le milieu (pixels 217 à 785 sur 1004)
    bodyInset: { left: 0.216, right: 0.217 },
    portrait: { x: 62, y: 22, zoom: 4.2 },
  },
  // Il change de forme au début de chacun de ses tours, sauf le premier. Depuis la 0.73.0 (SORTS.md § 18),
  // chaque forme a sa règle, un statut de forme : l'homme lance un sort à chaque jet (d3), l'ours frappe à +3
  forms: [
    { id: 'human', name: 'Forme humaine', statuses: ['casting'] },
    // L'ours est une bête à quatre pattes (règle de l'utilisateur, POSTURES.md § 0) : bois compris, à peine
    // moins haut que le druide (96 %), et une fois et demie plus long que haut. La métamorphose le fait
    // grossir, pas grandir. La garde occupe 90 % de la hauteur de sa toile. Si large qu'il sortait de l'écran
    // par l'arrière : sa toile est allongée à l'arrière (slice-poses --avant=130), ce qui l'avance de
    // 130 px de toile vers l'adversaire (la garde va des pixels 290 à 1286 sur 1318)
    {
      id: 'bear',
      name: "Forme d'ours",
      statuses: ['bearMight'],
      look: {
        image: bearIdleImg,
        poses: { attack: bearAttackImg, dodge: bearDodgeImg, hurt: bearHurtImg, ko: bearKoImg, victory: bearVictoryImg },
        scale: 0.98,
        headroom: 0.088,
        bodyInset: { left: 0.22, right: 0.024 },
        portrait: { x: 98, y: 31, zoom: 4 },
      },
    },
  ],
  lore: {
    tagline: 'La forêt a deux visages.',
    background:
      "Gardien des chênes anciens, Thaldrin appelle la foudre et le feu sous sa forme d'homme, puis devient l'ours qui frappe et déchire. Un tour sur deux, l'un ou l'autre.",
    strengths: ['Un sort à chaque tour d’homme (foudre, feu)', 'L’ours frappe toujours, et fort (+3)', 'Aura sauvage : un ours de plus en plus dangereux'],
    weaknesses: ['Aucun soin ni armure', 'L’homme ne frappe jamais', 'Forme imposée à chaque tour'],
  },
  // 0.73.0 (SORTS.md § 18, choix de l'utilisateur) : l'homme ne lance que des sorts, l'ours ne fait que frapper.
  // Remplace Fleur de vie, Écorce épaisse, Charge, Coup de griffe, le relais des formes et ses deux auras.
  events: [
    {
      id: 'thunderbolt',
      name: 'Foudre',
      nature: 'arcane',
      trigger: 'naturalOne',
      form: 'human',
      forfeitsHit: true,
      scene: 'lightning',
      effects: [{ type: 'damage', amount: THUNDERBOLT, hits: THUNDERBOLT_HITS, target: 'opponent' }],
    },
    { id: 'firefly', name: 'Feux follets', nature: 'arcane', trigger: 'naturalTwo', form: 'human', forfeitsHit: true, effects: [{ type: 'applyStatus', status: 'burn', stacks: 3, target: 'opponent' }] },
    { id: 'wild-aura', name: 'Aura sauvage', nature: 'martial', trigger: 'naturalThree', form: 'human', forfeitsHit: true, effects: [{ type: 'applyStatus', status: 'wildAura', stacks: 1 }] },
  ],
}

/*
 * Barde (0.41.0, concept d'un ami de l'utilisateur) : un petit d5, mais deux dés à chaque action. Hors
 * double, deux coups séparés (esquive et critique chacun) ; sur un double, la compétence de sa face
 * remplace les deux coups (RESOLUTION.md § 2).
 * Équilibrage (0.41.0, choix de l'utilisateur après mesure) : appliqué à la lettre, le concept gagnait 45 %
 * mais perdait 87/13 contre Brokk, 78/22 contre Grimbald, 71/29 contre Ervald : l'intimidation, les épines
 * et l'armure rognent chacun de ses petits coups. D'où l'Ouverture (Aura mélodieuse dès le début, en dégâts
 * finaux, après l'armure), Crescendo et Soliste en un seul gros coup, et 46 PV, 5 % de critique.
 */
const fanchon: CharacterDef = {
  id: 'fanchon',
  name: 'Fanchon',
  race: 'Humain',
  archetype: 'Saltimbanque',
  twinDice: true,
  // Esquive de 12 à 6 % (0.46.0) : compensation de Siffloter et de la Fausse note, qui frappent désormais
  stats: { maxHp: 46, damageDie: 5, armor: 0, dodgeChance: 0.06, critChance: 0.05, critMultiplier: 2 },
  // Postures (session images, 0.41.0) : la garde occupe 94,7 % de la toile ; scale = 1,00 × 0,92 / 0,947
  look: {
    image: bardIdleImg,
    poses: { attack: bardAttackImg, dodge: bardDodgeImg, hurt: bardHurtImg, ko: bardKoImg, victory: bardVictoryImg },
    facing: 'right',
    scale: 0.97,
    headroom: 0.03,
    // Toile large (fente de l'attaque) : la garde n'en occupe que la moitié centrale (pixels 242 à 750 sur 992)
    bodyInset: { left: 0.244, right: 0.244 },
    portrait: { x: 60, y: 5, zoom: 3.2 },
  },
  lore: {
    tagline: 'Deux dés, une chanson, aucune fausse note. Sauf chez vous.',
    background:
      "Fanchon a appris l'escrime entre deux couplets, sur les tréteaux des foires. Elle lance deux dés à chaque tour et frappe deux fois ; quand les dés s'accordent, c'est la musique qui frappe.",
    strengths: ['Deux coups par tour', 'Aura dès son entrée en scène', 'Crescendo (12) et Soliste (15)'],
    weaknesses: ['Petit dé (d5)', 'Un double sur cinq seulement', 'Peu de PV (46)'],
  },
  events: [
    {
      id: 'overture',
      name: 'Ouverture',
      nature: 'arcane',
      trigger: 'combatStart',
      effects: [{ type: 'applyStatus', status: 'melodiousAura', stacks: 1 }],
    },
    {
      id: 'whistle',
      name: 'Siffloter',
      nature: 'arcane',
      trigger: 'doubleOne',
      // 0.46.0 : le double frappe aussi ses deux coups (il ne les sacrifie plus : « presque inutile » avant)
      volley: 2,
      effects: [{ type: 'applyStatus', status: 'whistling', stacks: 3 }],
    },
    {
      id: 'false-note',
      name: 'Fausse note',
      nature: 'arcane',
      trigger: 'doubleTwo',
      // 0.46.0 : le double frappe aussi ses deux coups
      volley: 2,
      // 0.45.0 : 2 charges (le prochain coup adverse qui touche perd 10), pour la même raison
      effects: [{ type: 'applyStatus', status: 'falseNote', stacks: 2, target: 'opponent' }],
    },
    {
      id: 'melodious-aura',
      name: 'Aura mélodieuse',
      nature: 'arcane',
      trigger: 'doubleThree',
      // 0.45.0 : 2 charges (le double 3 remplace deux coups : à 1 charge, l'aura coûtait des victoires)
      effects: [{ type: 'applyStatus', status: 'melodiousAura', stacks: 2 }],
    },
    // Un seul gros coup (idée de l'utilisateur) : l'intimidation et les épines ne le rognent qu'une fois
    { id: 'crescendo', name: 'Crescendo', nature: 'martial', trigger: 'doubleFour', volley: 3, merged: true, effects: [] },
    { id: 'soloist', name: 'Soliste', nature: 'martial', trigger: 'doubleFive', volley: 3, merged: true, effects: [] },
  ],
}

/** Personnages disponibles, un par famille, dans l'ordre d'affichage. Pour en ajouter un : une entrée ici. */
export const ROSTER: readonly CharacterDef[] = [
  gorak,
  elaria,
  brokk,
  ervald,
  ysolde,
  naraxes,
  aldric,
  morgrut,
  thaldrin,
  fanchon,
]

/** Les personnages instanciés une fois pour toutes (ils sont immuables). */
export const CHARACTERS: readonly Character[] = ROSTER.map((def) => new Character(def))

export const CHARACTER_IDS: readonly string[] = CHARACTERS.map((c) => c.id)


export function createCharacter(id: string): Character {
  const character = CHARACTERS.find((c) => c.id === id)
  if (!character) throw new Error(`Personnage inconnu : ${id}`)
  return character
}

/**
 * Vérifie la cohérence des données du roster ; renvoie la liste des problèmes (vide si tout va bien).
 * Appelée par les tests, et au démarrage en développement.
 */
export function validateRoster(defs: readonly CharacterDef[] = ROSTER): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  const inRange = (v: number, min: number, max = Infinity) => Number.isFinite(v) && v >= min && v <= max
  for (const d of defs) {
    const at = `${d.id} :`
    if (ids.has(d.id)) problems.push(`${at} id en double`)
    ids.add(d.id)
    const s = d.stats
    if (!Number.isInteger(s.maxHp) || s.maxHp < 1) problems.push(`${at} maxHp doit être un entier ≥ 1`)
    if (!Number.isInteger(s.damageDie) || s.damageDie < 1) problems.push(`${at} damageDie doit être un entier ≥ 1`)
    if (!inRange(s.armor, 0)) problems.push(`${at} armor doit être ≥ 0`)
    if (!inRange(s.dodgeChance, 0, 1)) problems.push(`${at} dodgeChance hors de [0, 1]`)
    if (!inRange(s.critChance, 0, 1)) problems.push(`${at} critChance hors de [0, 1]`)
    if (!inRange(s.critMultiplier, 1)) problems.push(`${at} critMultiplier doit être ≥ 1`)
    const { lore } = d
    if (!lore.tagline || !lore.background) problems.push(`${at} fiche incomplète (accroche ou background)`)
    if (lore.background.length > 240) problems.push(`${at} background trop long pour la fiche (240 caractères max.)`)
    if (
      lore.strengths.length < 1 ||
      lore.strengths.length > 3 ||
      lore.weaknesses.length < 1 ||
      lore.weaknesses.length > 3
    )
      problems.push(`${at} 1 à 3 forces et 1 à 3 faiblesses attendues`)
    for (const f of d.forms ?? [])
      for (const id of f.statuses ?? [])
        if (STATUSES[id]?.mechanic !== 'form') problems.push(`${at} forme ${f.id} : ${id} n'est pas un statut de forme (mechanic: 'form')`)
    for (const id of Object.keys(STATUSES) as (keyof typeof STATUSES)[])
      if (STATUSES[id].mechanic === 'form' && d.events.some((e) => e.effects.some((x) => x.type === 'applyStatus' && x.status === id)))
        problems.push(`${at} ${id} est un statut de forme : seul le moteur le pose`)
    const eventIds = new Set<string>()
    for (const e of d.events) {
      if (eventIds.has(e.id)) problems.push(`${at} compétence en double (${e.id})`)
      eventIds.add(e.id)
      if (e.effects.length === 0 && !e.reshapesHit && !e.volley) problems.push(`${at} la compétence ${e.id} n'a aucun effet`)
      if (e.reshapesHit && (!ROLL_TRIGGERS.includes(e.trigger) || e.chance !== undefined || e.forfeitsHit))
        problems.push(`${at} ${e.id}.reshapesHit : réservé aux déclencheurs du dé, sans chance ni forfeitsHit`)
      if (isDoubleTrigger(e.trigger) && (!d.twinDice || e.chance !== undefined || e.forfeitsHit))
        problems.push(`${at} ${e.id} : un double est réservé aux personnages à deux dés (twinDice), sans chance ni forfeitsHit`)
      if (e.volley !== undefined && (!isDoubleTrigger(e.trigger) || !Number.isInteger(e.volley) || e.volley < 1))
        problems.push(`${at} ${e.id}.volley : un entier ≥ 1, réservé aux doubles`)
      if (d.twinDice && ROLL_TRIGGERS.includes(e.trigger))
        problems.push(`${at} ${e.id} : un personnage à deux dés n'a de compétences que sur les doubles`)
      if (e.form && !d.forms?.some((f) => f.id === e.form)) problems.push(`${at} ${e.id}.form : forme inconnue (${e.form})`)
      if (e.chance !== undefined && !inRange(e.chance, 0, 1)) problems.push(`${at} ${e.id}.chance hors de [0, 1]`)
      if (e.forfeitsHit && (!ROLL_TRIGGERS.includes(e.trigger) || e.chance !== undefined))
        problems.push(`${at} ${e.id}.forfeitsHit : réservé aux déclencheurs du dé, sans chance`)
      if (e.needsTouch && (!ROLL_TRIGGERS.includes(e.trigger) || e.chance !== undefined || e.forfeitsHit || e.reshapesHit))
        problems.push(`${at} ${e.id}.needsTouch : réservé aux déclencheurs du dé, sans chance, forfeitsHit ni reshapesHit`)
      if (e.limit !== undefined && (!Number.isInteger(e.limit) || e.limit < 1))
        problems.push(`${at} ${e.id}.limit doit être un entier ≥ 1`)
      for (const x of e.effects)
        if (x.type === 'damage' && x.hits !== undefined && (!Number.isInteger(x.hits) || x.hits < 2))
          problems.push(`${at} ${e.id} : hits est un entier ≥ 2 (sinon, un seul coup)`)
      for (const c of e.when ?? []) {
        if ((c.type === 'hpBelow' || c.type === 'hpAtLeast') && !(c.ratio > 0 && c.ratio <= 1))
          problems.push(`${at} ${e.id} : condition ${c.type}, ratio hors de ]0, 1]`)
        if (c.type === 'fromTurn' && (!Number.isInteger(c.turn) || c.turn < 1))
          problems.push(`${at} ${e.id} : condition fromTurn, tour entier ≥ 1 attendu`)
        if (c.type === 'hasStatus' && c.stacks !== undefined && (!Number.isInteger(c.stacks) || c.stacks < 1))
          problems.push(`${at} ${e.id} : condition hasStatus, charges entières ≥ 1 attendues`)
      }
      for (const f of e.effects) {
        const amount = f.type === 'applyStatus' ? f.stacks : f.type === 'cleanse' ? 1 : f.type === 'release' ? f.min : f.amount
        if (!Number.isInteger(amount) || amount < 1)
          problems.push(`${at} ${e.id} : effet ${f.type} sans valeur entière ≥ 1`)
        if (f.type === 'applyStatus' && f.turns !== undefined && (!Number.isInteger(f.turns) || f.turns < 1))
          problems.push(`${at} ${e.id} : durée invalide`)
        if (f.type === 'applyStatus' && f.turns !== undefined && STATUSES[f.status].decays)
          problems.push(`${at} ${e.id} : ${f.status} s'estompe de lui-même, sans durée en tours`)
        if (f.type === 'applyStatus' && f.turns !== undefined && STATUSES[f.status].turnsFromStacks)
          problems.push(`${at} ${e.id} : ${f.status} dure autant de tours que de charges, sans durée en plus`)
      }
    }
  }
  return problems
}
