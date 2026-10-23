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
import { faceTrigger, isDoubleTrigger, isRollTrigger, type CharacterEvent } from './events'
import { isEngravable } from './forge'
import { STATUSES } from './statuses'

/**
 * Foudre du druide (0.76.0, demande de l'utilisateur) : trois éclairs de dégâts directs, jamais critiques. 2 chacun
 * jusqu'à la 0.105.0 ; 1 depuis la 0.106.0 (phase 5 bis) : la Foudre se greffe sur un coup de base magique.
 */
const THUNDERBOLT = 1
const THUNDERBOLT_HITS = 3

/*
 * Archétypes par race :
 * - Orc : brute, beaucoup de PV, lent à esquiver.
 * - Elfe : agile, peu de PV, esquive et critiques fréquents.
 * - Nain : tank, une armure temporaire qui s'use, critiques rares mais lourds.
 * - Mort-vivant : affliction, endurant et peu esquiveur, il empoisonne l'adversaire.
 * - Humain (prêtresse) : contrôle, une attaque magique et des soins.
 * - Homme-lézard (voleuse) : chance et poison, esquive et critiques.
 * Un seul personnage par famille depuis la 0.43.0 (les jumeaux de coloris sont retirés, chacun garde
 * les statistiques les plus pertinentes des deux, voir docs/PERSONNAGES.md).
 * Règles v2, phase 5 bis (0.106.0, docs/RESOLUTION.md § 3 bis) : chacun a une attaque (une petite fourchette, DD ou
 * DM), son coup de base à chaque jet ; le d6 ne fait plus de dégâts, ses faces 1 et 2 déclenchent ses deux
 * compétences, qui se greffent sur le coup (défaut), le modifient (`relation: 'modify'`) ou le remplacent
 * (`relation: 'replace'`) ; les faces 3 à 6 sont nues.
 */

const gorak: CharacterDef = {
  id: 'gorak',
  name: 'Gorak',
  race: 'Orc',
  archetype: 'Brute',
  // Statistiques de Murzug, son ancien jumeau (0.43.0, un personnage par famille) : 57 PV et 18 % de critique.
  // Avec les siennes (61 PV, 10 %), il gagnait 46,8 % contre les neuf autres, 50,4 % ainsi.
  // d9 et 19 % de critique (0.69.0, choix de l'utilisateur) : la Furie frappe en coups bruts.
  // d6 imprimé (règles v2, phase 5, 0.105.0) : Pourfendre sur le 1, Furie des vents sur le 2. Mesuré : 50,0 %.
  // Attaque (phase 5 bis, 0.106.0) : voir docs/PERSONNAGES.md pour la mesure avant → après.
  stats: { maxHp: 57, attackMin: 5, attackMax: 6, armor: 0, dodgeChance: 0.05, critChance: 0.19, critMultiplier: 2 },
  attackKind: 'direct',
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
    strengths: ['Furie des vents : deux coups tout de suite', 'Critiques fréquents pour un orc (19 %)', 'Pourfendre : son 1 fait saigner'],
    weaknesses: ["N'esquive presque jamais", 'Aucune armure', 'Brutal mais prévisible'],
  },
  // Signature (règles v2, décision de l'utilisateur) : la Furie des vents, seule au départ d'une campagne
  signature: 'wind-fury',
  // Répertoire (règles v2, phase 2, docs/PROGRESSION.md § 7) : le Sang (Épines acérées, Vol de vie), la Furie (Œil de faucon, Aura de précision)
  repertoire: ['thorns', 'life-steal', 'hawk-eye', 'precision-aura'],
  reserve: [
    {
      id: 'power-aura',
      name: 'Aura de puissance',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'powerAura', stacks: 1 }],
    },
  ],
  events: [
    {
      // 0.70.0 (proposition de l'utilisateur) : remplace la Saignée, qui sacrifiait le coup. Phase 5 bis : elle modifie
      // son coup de base : s'il touche, Saignement 2 ; un coup doit toucher pour poser un malus physique. La plaie coule
      // au coup suivant (RESOLUTION § 5, règle 9).
      id: 'cleave',
      name: 'Pourfendre',
      nature: 'martial',
      trigger: 'naturalOne',
      relation: 'modify',
      effects: [{ type: 'applyStatus', status: 'bleed', stacks: 2, target: 'opponent' }],
    },
    {
      // Phase 5 bis : elle remplace le coup du 2 par deux coups de base bruts, tout de suite
      id: 'wind-fury',
      name: 'Furie des vents',
      nature: 'martial',
      trigger: 'naturalTwo',
      relation: 'replace',
      effects: [{ type: 'applyStatus', status: 'windFury', stacks: 1 }],
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
  // d6 imprimé (règles v2, phase 5, 0.105.0) : Œil de faucon sur le 1, Esquive améliorée sur le 2 ; l'Aura de précision
  // quitte le kit. 53 PV (50 avant). Mesuré : 50,2 %.
  // Phase 5 bis : 22 % d'esquive (26 avant) et 15 % de critique (17) : ses compétences, désormais gratuites, la portaient
  // trop haut (Esquive améliorée et Œil de faucon greffés sur un coup).
  stats: { maxHp: 53, attackMin: 4, attackMax: 5, armor: 0, dodgeChance: 0.22, critChance: 0.15, critMultiplier: 2.4 },
  attackKind: 'direct',
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
    strengths: ['Meilleure esquive (22 %)', 'Critiques dévastateurs (×2,4)', 'Œil de faucon : son 1 est critique'],
    weaknesses: ['PV modestes (53)', 'Attaque légère', "Peine face aux boucliers et à l'intimidation"],
  },
  signature: 'hawk-eye',
  // Répertoire : la Chasse (Furie des vents, Pourfendre), la Fuite (Coup de chance, Riposte)
  repertoire: ['wind-fury', 'cleave', 'lucky-strike', 'riposte'],
  reserve: [
    {
      id: 'precision-aura',
      name: 'Aura de précision',
      nature: 'finesse',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'precisionAura', stacks: 1 }],
    },
  ],
  events: [
    {
      id: 'hawk-eye',
      name: 'Œil de faucon',
      nature: 'finesse',
      trigger: 'naturalOne',
      // Phase 5 bis : greffé, le Critique assuré rend critique le coup de base de ce jet même
      effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }],
    },
    {
      id: 'evasion',
      name: 'Esquive améliorée',
      nature: 'finesse',
      trigger: 'naturalTwo',
      // Sans durée depuis la 0.36.5 : elle attend le prochain coup reçu. Avec une durée d'un tour, elle
      // s'éteignait sans servir une fois sur trois (coup adverse sans frappe ou tour perdu), comme la Riposte avant la 0.32.0.
      effects: [{ type: 'applyStatus', status: 'evasion', stacks: 1 }],
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
  // d6 imprimé (règles v2, phase 5, 0.105.0) : Peau de pierre sur le 1, Épines acérées sur le 2 ; l'Aura d'intimidation
  // quitte le kit. Mesuré : 51,0 % (47,4 % avant).
  // Phase 5 bis : critique ×2,2 (×2,5 avant), la compensation d'Épines acérées et de Peau de pierre, greffées sur un coup
  stats: { maxHp: 57, attackMin: 5, attackMax: 6, armor: 0, dodgeChance: 0.06, critChance: 0.1, critMultiplier: 2.2 },
  attackKind: 'direct',
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
    strengths: ['Attaque lourde', 'Peau de pierre cumulable', 'Critiques lourds (×2,2)'],
    weaknesses: ['Critiques peu fréquents (10 %)', 'Esquive faible', 'Lent à prendre l’avantage'],
  },
  // Signature (décision de l'utilisateur) : Épines acérées
  signature: 'thorns',
  // Répertoire : le Rempart (Aura d'immunité, Rétribution), les Représailles (Riposte, Pourfendre)
  repertoire: ['immunity-aura', 'retribution', 'riposte', 'cleave'],
  reserve: [
    {
      id: 'intimidation-aura',
      name: "Aura d'intimidation",
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'intimidationAura', stacks: 1 }],
    },
  ],
  events: [
    {
      id: 'stoneskin',
      name: 'Peau de pierre',
      nature: 'martial',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 6 }],
    },
    {
      id: 'thorns',
      name: 'Épines acérées',
      nature: 'martial',
      trigger: 'naturalTwo',
      effects: [{ type: 'applyStatus', status: 'thorns', stacks: 1 }],
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
  // d6 imprimé (règles v2, phase 5, 0.105.0) : Vol de vie sur le 1, Aura glaciale sur le 2 ; le Souffle de la tombe
  // quitte le kit. Mesuré : 50,2 % (53,9 % avant).
  stats: { maxHp: 56, attackMin: 4, attackMax: 6, armor: 0, dodgeChance: 0.08, critChance: 0.16, critMultiplier: 2 },
  attackKind: 'direct',
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
    strengths: ['Vol de vie : son coup le soigne', 'Aura glaciale : un poison sans fin', 'Critiques fréquents (16 %)'],
    weaknesses: ["N'esquive presque jamais", 'Aucune armure', 'Dégâts lents à venir'],
  },
  signature: 'frost-aura',
  // Répertoire : le Poison (Aura de décoction, Feux follets), le Drain (Pourfendre, Peur)
  repertoire: ['decoction-aura', 'firefly', 'cleave', 'fear'],
  reserve: [
    {
      id: 'grave-breath',
      name: 'Souffle de la tombe',
      nature: 'arcane',
      trigger: 'naturalOne',
      // Poison 3 : 3, 2 puis 1 PV, les 6 PV de l'ancien poison 2 pendant 3 tours (0.36.4)
      effects: [{ type: 'applyStatus', status: 'poison', stacks: 3, target: 'opponent' }],
    },
  ],
  events: [
    {
      id: 'life-steal',
      name: 'Vol de vie',
      nature: 'arcane',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'lifesteal', stacks: 2 }],
    },
    {
      id: 'frost-aura',
      name: 'Aura glaciale',
      nature: 'arcane',
      trigger: 'naturalTwo',
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
  // Petit dé (d7) jusqu'à la 0.104.0 : 3 jets sur 7 (1 à 3) déclenchaient une compétence au lieu de frapper.
  // d6 imprimé (règles v2, phase 5, 0.105.0) : Purification sur le 1, Aura de sainteté sur le 2 ; la Peur quitte le kit.
  // Mesuré : 49,1 % (43,9 % avant, la plus basse du roster). Phase 5 bis : son attaque est magique (DM, la lumière).
  stats: { maxHp: 52, attackMin: 4, attackMax: 6, armor: 0, dodgeChance: 0.08, critChance: 0.1, critMultiplier: 2 },
  attackKind: 'magical',
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
    strengths: ['Purification : retire un bonus, sinon blesse', 'Se soigne chaque tour (sainteté)', 'Combats longs'],
    weaknesses: ['Compétences sur un jet sur trois seulement', 'Peu de critiques (10 %)', 'Esquive faible'],
  },
  signature: 'holy-aura',
  // Répertoire : la Lumière (Aura d'immunité, Rétribution), le Contrôle (Peau de pierre, Vol de vie)
  repertoire: ['immunity-aura', 'retribution', 'stoneskin', 'life-steal'],
  reserve: [
    {
      id: 'fear',
      name: 'Peur',
      nature: 'arcane',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'fear', stacks: 1, target: 'opponent' }],
    },
  ],
  events: [
    {
      id: 'purification',
      name: 'Purification',
      nature: 'arcane',
      trigger: 'naturalOne',
      // 0.42.0 : quand l'adversaire n'a aucun bonus à retirer, la lumière le blesse (dégâts directs) au lieu
      // de tomber à vide (54 % des déclenchements avant). Contre un adversaire à bonus (Brokk), rien ne change.
      // 0.69.0 (choix de l'utilisateur, SORTS.md § 14 et 15) : elle retire aussi son propre dernier malus (un
      // poison, une plaie, une brûlure). L'Aura glaciale cumulable la mettait à 41,3 % ; ainsi, 43,4 %.
      effects: [
        { type: 'cleanse', polarity: 'positive', count: 1, target: 'opponent', orElse: { type: 'damage', amount: PURIFICATION_LIGHT, target: 'opponent', source: 'holy' } },
        { type: 'cleanse', polarity: 'negative', count: 1 },
      ],
    },
    {
      id: 'holy-aura',
      name: 'Aura de sainteté',
      nature: 'arcane',
      trigger: 'naturalTwo',
      effects: [{ type: 'applyStatus', status: 'holyAura', stacks: 1 }],
    },
  ],
}

const naraxes: CharacterDef = {
  id: 'naraxes',
  name: 'Naraxes',
  race: 'Homme-lézard',
  archetype: 'Voleuse',
  // Gros dé (d10) jusqu'à la 0.104.0 : moins de jets de compétence, de plus gros coups.
  // d6 imprimé (règles v2, phase 5, 0.105.0) : Pile ou face sur le 1, Aura de décoction sur le 2 ; Coup de chance quitte
  // le kit. Mesuré : 51,5 % (53,7 % avant).
  stats: { maxHp: 50, attackMin: 4, attackMax: 5, armor: 0, dodgeChance: 0.2, critChance: 0.14, critMultiplier: 2 },
  attackKind: 'direct',
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
    strengths: ['Bonne esquive (20 %)', 'Pile ou face : son coup compte double', 'Lames empoisonnées (décoction)'],
    weaknesses: ['Peu de PV', 'Hasard à double tranchant', 'Aucune armure'],
  },
  // Signature (décision de l'utilisateur) : Pile ou face, l'identité plutôt que la valeur
  signature: 'coin-flip',
  // Répertoire : la Fortune (Œil de faucon, Esquive améliorée), le Poison (Souffle de la tombe, Aura glaciale)
  repertoire: ['hawk-eye', 'evasion', 'grave-breath', 'frost-aura'],
  reserve: [
    {
      id: 'lucky-strike',
      name: 'Coup de chance',
      nature: 'finesse',
      trigger: 'naturalOne',
      // Phase 5 bis : il remplace le coup de ce jet ; le dé qu'il donne, à l'action suivante, est un jet complet
      relation: 'replace',
      effects: [{ type: 'applyStatus', status: 'luckyStrike', stacks: 1 }],
    },
  ],
  events: [
    {
      id: 'coin-flip',
      name: 'Pile ou face',
      nature: 'finesse',
      trigger: 'naturalOne',
      // Phase 5 bis (décision de l'utilisateur) : elle modifie son coup ; s'il touche, la pièce : pile, ce coup ×2
      relation: 'modify',
      effects: [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }],
    },
    {
      id: 'decoction-aura',
      name: 'Aura de décoction',
      nature: 'finesse',
      trigger: 'naturalTwo',
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
  // d6 imprimé (règles v2, phase 5, 0.105.0) : Rétribution sur le 1, Riposte sur le 2 ; l'Aura d'immunité quitte le
  // kit. Mesuré : 50,2 % (53,9 % avant).
  stats: { maxHp: 54, attackMin: 3, attackMax: 5, armor: 0, dodgeChance: 0.07, critChance: 0.17, critMultiplier: 2.5 },
  attackKind: 'direct',
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
    strengths: ['Rétribution : rend les coups reçus', 'Critiques fréquents et lourds (17 %, ×2,5)', 'Riposte : punit qui le frappe'],
    weaknesses: ['Esquive faible (7 %)', 'Rétribution dérisoire si on ne l’a pas frappé', 'Aucune armure'],
  },
  signature: 'retribution',
  // Répertoire : la Lumière (Purification, Vol de vie), l'Ombre du serment brisé (Peur, Souffle de la tombe)
  repertoire: ['purification', 'life-steal', 'fear', 'grave-breath'],
  reserve: [
    {
      id: 'immunity-aura',
      name: "Aura d'immunité",
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [
        { type: 'cleanse', polarity: 'negative' },
        { type: 'applyStatus', status: 'immunityAura', stacks: 1 },
      ],
    },
  ],
  events: [
    {
      id: 'retribution',
      name: 'Rétribution',
      nature: 'arcane',
      trigger: 'naturalOne',
      effects: [{ type: 'release', status: 'retribution', min: 1, target: 'opponent', source: 'strike' }],
    },
    {
      id: 'riposte',
      name: 'Riposte',
      nature: 'martial',
      trigger: 'naturalTwo',
      effects: [{ type: 'applyStatus', status: 'riposte', stacks: 2 }],
    },
  ],
}

const morgrut: CharacterDef = {
  id: 'morgrut',
  name: 'Morgrut',
  race: 'Ogre',
  archetype: 'Cogneur',
  // Aucune compétence : de la masse. Aucun critique (il ne vise pas) : avec 8 % de critique et 66 PV, il gagnait 63 %.
  // d6 imprimé (règles v2, phase 5, 0.105.0) : une Attente sur le 1, coups de 7 à 11. Mesuré : 52,1 %.
  // Phase 5 bis (décision de l'utilisateur, 2026-10-23) : la plus forte attaque du roster, plus d'Attente ; ses six faces
  // sont nues, la forge les remplit.
  // 59 PV (63 avant) : la plus forte attaque (7 à 9) frappe à chaque jet ; sans compétence ni critique, les PV sont
  // son seul autre levier.
  stats: { maxHp: 59, attackMin: 7, attackMax: 9, armor: 0, dodgeChance: 0, critChance: 0, critMultiplier: 2 },
  attackKind: 'direct',
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
    tagline: 'Taper. Taper encore. Taper plus fort.',
    background:
      "Morgrut ne sait ni compter ni viser, mais personne n'a jamais encaissé deux fois sa massue. Les dés, il ne les regarde même pas : il tape.",
    strengths: ['La plus forte attaque (7 à 9)', 'Beaucoup de PV', 'Frappe fort à chaque jet'],
    weaknesses: ['Aucune compétence', 'Six faces nues', 'Ni esquive ni critique'],
  },
  // Répertoire : la Colère (Aura de puissance, Pourfendre), la Masse (Peau de pierre, Aura d'intimidation)
  repertoire: ['power-aura', 'cleave', 'stoneskin', 'intimidation-aura'],
  events: [],
}

const thaldrin: CharacterDef = {
  id: 'thaldrin',
  name: 'Thaldrin',
  race: 'Sylvain',
  archetype: 'Druide',
  // d6 imprimé (règles v2, phase 5, 0.105.0) : sous forme humaine, la Foudre sur le 1, le 2 et le 3, les Feux follets
  // sur le 4, le 5 et le 6 (les probabilités du d3 d'avant). L'Aura sauvage quitte le kit. Mesuré : 47,4 %.
  // Phase 5 bis (décision de l'utilisateur) : deux attaques selon sa forme. L'homme frappe d'un petit coup magique (DM),
  // sur lequel son sort se greffe ; l'ours, de la même attaque en coup direct (DD), plus la Force de l'ours (+3, gardée :
  // la règle de forme la plus lisible).
  stats: { maxHp: 56, attackMin: 3, attackMax: 4, armor: 0, dodgeChance: 0.08, critChance: 0.08, critMultiplier: 2 },
  attackKind: 'magical',
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
  // chaque forme a sa règle, un statut de forme : l'homme lance un sort à chaque jet, l'ours frappe à +3
  forms: [
    { id: 'human', name: 'Forme humaine', statuses: ['casting'], attackKind: 'magical' },
    // L'ours est une bête à quatre pattes (règle de l'utilisateur, POSTURES.md § 0) : bois compris, à peine
    // moins haut que le druide (96 %), et une fois et demie plus long que haut. La métamorphose le fait
    // grossir, pas grandir. La garde occupe 90 % de la hauteur de sa toile. Si large qu'il sortait de l'écran
    // par l'arrière : sa toile est allongée à l'arrière (slice-poses --avant=130), ce qui l'avance de
    // 130 px de toile vers l'adversaire (la garde va des pixels 290 à 1286 sur 1318)
    {
      id: 'bear',
      name: "Forme d'ours",
      statuses: ['bearMight'],
      attackKind: 'direct',
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
    strengths: ['Un sort à chaque tour d’homme (foudre, feu)', 'L’ours frappe fort (+3)', 'La Foudre sur la moitié des faces'],
    weaknesses: ['Aucun soin ni armure', 'L’homme frappe peu', 'Forme imposée à chaque tour'],
  },
  // 0.73.0 (SORTS.md § 18, choix de l'utilisateur) : l'homme lance des sorts, l'ours frappe. Phase 5 bis : l'homme frappe
  // aussi, d'un petit coup magique. Remplace Fleur de vie, Écorce épaisse, Charge, Coup de griffe et ses deux auras.
  // Répertoire : l'Orage et le Feu en dégâts qui durent (Souffle de la tombe, Aura de décoction), la Bête (Aura de puissance, Épines acérées)
  repertoire: ['grave-breath', 'decoction-aura', 'power-aura', 'thorns'],
  reserve: [
    { id: 'wild-aura', name: 'Aura sauvage', nature: 'martial', trigger: 'naturalThree', form: 'human', effects: [{ type: 'applyStatus', status: 'wildAura', stacks: 1 }] },
  ],
  // Un même sort sur trois faces : trois déclencheurs de la même compétence (une compétence par face)
  events: [
    ...([1, 2, 3] as const).map(
      (face): CharacterEvent => ({
        id: 'thunderbolt',
        name: 'Foudre',
        nature: 'arcane',
        trigger: faceTrigger(face),
        form: 'human',
        scene: 'lightning',
        effects: [{ type: 'damage', amount: THUNDERBOLT, hits: THUNDERBOLT_HITS, target: 'opponent', source: 'lightning' }],
      }),
    ),
    ...([4, 5, 6] as const).map(
      (face): CharacterEvent => ({
        id: 'firefly',
        name: 'Feux follets',
        nature: 'arcane',
        trigger: faceTrigger(face),
        form: 'human',
        effects: [{ type: 'applyStatus', status: 'burn', stacks: 3, target: 'opponent' }],
      }),
    ),
  ],
}

/*
 * Barde (0.41.0, concept d'un ami de l'utilisateur) : deux dés à chaque action. Hors double, deux coups de base
 * (esquive et critique chacun) ; sur un double, la compétence de sa face se greffe sur les deux coups, ou les remplace
 * (Crescendo, Soliste) (RESOLUTION.md § 2).
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
  // Deux d6 imprimés (règles v2, phase 5, 0.105.0). Mesuré : 49,4 % (52,1 % avant).
  // Phase 5 bis : deux coups de base par action, d'une petite attaque ; Crescendo et Soliste, un coup de base ×N.
  // Phase 5 bis : 10 % de critique (5 avant), la compensation de sa petite attaque
  stats: { maxHp: 46, attackMin: 2, attackMax: 4, armor: 0, dodgeChance: 0.06, critChance: 0.1, critMultiplier: 2 },
  attackKind: 'direct',
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
    strengths: ['Deux coups par tour', 'Aura dès son entrée en scène', 'Crescendo et Soliste : un coup multiplié'],
    weaknesses: ['Petite attaque', 'Un double sur six seulement', 'Peu de PV (46)'],
  },
  // Répertoire, sur ses doubles : la Fortune (Coup de chance, Pile ou face), le Chant (Esquive améliorée, Aura de précision)
  repertoire: ['lucky-strike', 'coin-flip', 'evasion', 'precision-aura'],
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
      // 0.46.0 : le double frappe aussi ses deux coups (il ne les sacrifie plus : « presque inutile » avant) ; phase 5 bis :
      // il se greffe sur les deux coups de base
      effects: [{ type: 'applyStatus', status: 'whistling', stacks: 3 }],
    },
    {
      id: 'false-note',
      name: 'Fausse note',
      nature: 'arcane',
      trigger: 'doubleTwo',
      // 0.46.0 : le double frappe aussi ses deux coups ; phase 5 bis : il se greffe sur les deux coups de base
      // 0.45.0 : 2 charges (le prochain coup adverse qui touche perd 10), pour la même raison
      effects: [{ type: 'applyStatus', status: 'falseNote', stacks: 2, target: 'opponent' }],
    },
    {
      id: 'melodious-aura',
      name: 'Aura mélodieuse',
      nature: 'arcane',
      trigger: 'doubleThree',
      // 0.45.0 : 2 charges ; phase 5 bis : le double 3 porte aussi ses deux coups de base
      effects: [{ type: 'applyStatus', status: 'melodiousAura', stacks: 2 }],
    },
    // Un seul gros coup (idée de l'utilisateur) : l'intimidation et les épines ne le rognent qu'une fois. Phase 5 bis : un
    // coup de base ×N, qui remplace les deux coups du double
    { id: 'crescendo', name: 'Crescendo', nature: 'martial', trigger: 'doubleFour', relation: 'replace', hitMultiplier: 4, effects: [] },
    { id: 'soloist', name: 'Soliste', nature: 'martial', trigger: 'doubleFive', relation: 'replace', hitMultiplier: 5, effects: [] },
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

/**
 * Toutes les compétences du roster, une fois chacune : celles des kits, puis celles hors kit (`reserve`, règles v2). Une
 * compétence imprimée sur plusieurs faces (la Foudre du druide) n'y est qu'une fois.
 */
export const ALL_SKILLS: readonly CharacterEvent[] = ROSTER.flatMap((c) => [...c.events, ...(c.reserve ?? [])]).filter(
  (e, k, all) => all.findIndex((x) => x.id === e.id) === k,
)

/**
 * Les compétences qu'on peut graver sur un dé forgé (forge.ts, Graver) : celles du dé simple de tout le roster, kits et
 * compétences hors kit, avec un effet. La forge en tire une ; elle ne la grave jamais sur son propre propriétaire.
 */
export const ENGRAVABLE_SKILLS: readonly CharacterEvent[] = ALL_SKILLS.filter(isEngravable)

/** Le répertoire d'un personnage (règles v2, phase 2) : les compétences gravables qu'il peut apprendre, dans l'ordre de sa fiche. */
export function repertoireOf(id: string): CharacterEvent[] {
  const ids = ROSTER.find((d) => d.id === id)?.repertoire ?? []
  return ids.map((skill) => ENGRAVABLE_SKILLS.find((e) => e.id === skill)!)
}

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
    // L'attaque (règles v2, phase 5 bis) : une petite fourchette d'entiers, écart de 3 au plus (2 de règle, une exception)
    if (!Number.isInteger(s.attackMin) || !Number.isInteger(s.attackMax) || s.attackMin < 1 || s.attackMax < s.attackMin)
      problems.push(`${at} attaque : des entiers, 1 ≤ attackMin ≤ attackMax`)
    if (s.attackMax - s.attackMin > 3) problems.push(`${at} attaque : une petite fourchette (écart de 3 au plus)`)
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
    // Une même compétence peut être imprimée sur plusieurs faces (la Foudre du druide) : ses déclencheurs seuls diffèrent
    const seen = new Map<string, CharacterEvent>()
    for (const e of d.events) {
      const twin = seen.get(e.id)
      if (twin && JSON.stringify({ ...twin, trigger: '' }) !== JSON.stringify({ ...e, trigger: '' })) problems.push(`${at} compétence en double (${e.id})`)
      seen.set(e.id, e)
      if (e.effects.length === 0 && !e.hitMultiplier) problems.push(`${at} la compétence ${e.id} n'a aucun effet`)
      const onDie = isRollTrigger(e.trigger) || isDoubleTrigger(e.trigger)
      if (e.relation && !onDie) problems.push(`${at} ${e.id}.relation : réservée aux compétences du dé et des doubles`)
      if (e.relation === 'modify' && !isRollTrigger(e.trigger)) problems.push(`${at} ${e.id} : modifier son coup est réservé au dé simple`)
      // Le moteur doit savoir dès le jet si le coup part : une compétence qui remplace n'a pas de probabilité
      if (e.relation === 'replace' && e.chance !== undefined) problems.push(`${at} ${e.id} : une compétence qui remplace le coup, sans chance`)
      if (e.hitMultiplier !== undefined && (e.relation !== 'replace' || !isDoubleTrigger(e.trigger) || !Number.isInteger(e.hitMultiplier) || e.hitMultiplier < 2))
        problems.push(`${at} ${e.id}.hitMultiplier : un entier ≥ 2, sur un double qui remplace ses coups`)
      if (isDoubleTrigger(e.trigger) && (!d.twinDice || e.chance !== undefined))
        problems.push(`${at} ${e.id} : un double est réservé aux personnages à deux dés (twinDice), sans chance`)
      if (d.twinDice && isRollTrigger(e.trigger))
        problems.push(`${at} ${e.id} : un personnage à deux dés n'a de compétences que sur les doubles`)
      if (e.form && !d.forms?.some((f) => f.id === e.form)) problems.push(`${at} ${e.id}.form : forme inconnue (${e.form})`)
      if (e.chance !== undefined && !inRange(e.chance, 0, 1)) problems.push(`${at} ${e.id}.chance hors de [0, 1]`)
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
    for (const e of d.reserve ?? []) if (seen.has(e.id)) problems.push(`${at} ${e.id} : à la fois dans le kit et hors kit`)
    // Répertoire (règles v2) : des compétences gravables d'autres personnages (de tout le roster), sans doublon
    const others = ENGRAVABLE_SKILLS.filter((e) => ![...d.events, ...(d.reserve ?? [])].some((own) => own.id === e.id)).map((e) => e.id)
    for (const id of d.repertoire ?? []) if (!others.includes(id)) problems.push(`${at} répertoire : ${id} n'est pas une compétence gravable d'un autre personnage`)
    if (new Set(d.repertoire).size !== (d.repertoire ?? []).length) problems.push(`${at} répertoire : doublon`)
    if (d.signature && !d.events.some((e) => e.id === d.signature)) problems.push(`${at} signature : ${d.signature} n'est pas une de ses compétences`)
  }
  return problems
}
