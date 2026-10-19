import orcImg from '../assets/orc.png'
import elfImg from '../assets/elf.png'
import dwarfImg from '../assets/dwarf.png'
import undeadImg from '../assets/undead.png'
import humanImg from '../assets/human.png'
import lizardImg from '../assets/lizardman.png'
import paladinImg from '../assets/paladin.png'
import ogreImg from '../assets/ogre.png'
import druidImg from '../assets/druid.png'
import druidBearImg from '../assets/druid-bear.png'
import { Character, variant, type CharacterDef } from './character'
import type { CharacterEvent } from './events'
import { ROLL_TRIGGERS } from './events'
import { STATUSES } from './statuses'

/*
 * Archétypes par race :
 * - Orc : brute, beaucoup de PV et un gros dé, mais lent à esquiver.
 * - Elfe : agile, peu de PV, esquive et critiques fréquents.
 * - Nain : tank, le plus de PV et une armure temporaire qui s'use, critiques rares mais lourds.
 * - Mort-vivant : affliction, endurant et peu esquiveur, il empoisonne l'adversaire.
 * - Humain (prêtresse) : contrôle, un petit dé mais des compétences sur la moitié de ses jets.
 * - Homme-lézard (voleuse) : chance et poison, esquive et critiques, coups de dés à double tranchant.
 * Chaque variante de coloris décale légèrement ces stats et hérite des trois compétences de sa race,
 * sur un 1, un 2 et un 3 au dé (le 3 donne une aura permanente, voir plus bas). Depuis la 0.27.0,
 * ces jets n'infligent aucun dégât : ils servent seulement à déclencher la compétence (`forfeitsHit`).
 * - Orc : Rage du sang (1 : regagne 3 PV) ; Furie des vents (2 : frappe deux fois au tour suivant).
 * - Elfe : Œil de faucon (1 : prochain coup qui touche critique) ; Esquive améliorée (2 : esquive à coup sûr le prochain coup reçu,
 *   sans limite de durée depuis la 0.36.5).
 * - Nain : Peau de pierre (1 : +6 d'armure temporaire, cumulable) ; Épines (2 : jusqu'à son prochain tour, chaque coup
 *   encaissé renvoie 6 dégâts, deux fois contre une Furie des vents).
 * - Mort-vivant : Souffle de la tombe (1 : poison, 2 PV par tour pendant 3 tours) ; Vol de vie (2 : son prochain
 *   coup porté rend les PV qu'il retire ; esquivé, la charge est perdue ; un jet de 1 à 3 la laisse en place).
 * Auras du 3, permanentes et cumulables (chaque nouveau 3 ajoute une charge) : Orc, Aura de puissance
 * (+2 dégâts par charge) ; Elfe, Aura de précision (+1 au multiplicateur de critique par charge) ; Nain,
 * Aura d'intimidation (l'adversaire frappe 2 de moins par charge) ; Mort-vivant, Aura de poison (au début
 * de son tour, l'adversaire perd 1 PV par charge).
 */

const gorak: CharacterDef = {
  id: 'gorak',
  name: 'Gorak',
  race: 'Orc',
  archetype: 'Brute',
  stats: { maxHp: 61, damageDie: 10, armor: 0, dodgeChance: 0.05, critChance: 0.1, critMultiplier: 2 },
  look: { image: orcImg, facing: 'right', scale: 1, portrait: { x: 55, y: 5, zoom: 3 } },
  lore: {
    tagline: 'Le roc des fosses de Kar-Dush.',
    background:
      "Sept saisons invaincu dans les fosses de combat de Kar-Dush. Gorak frappe sans finesse mais encaisse tout, et l'on dit qu'un coup manqué ne fait que l'énerver davantage.",
    strengths: ['Beaucoup de PV (61)', 'Gros dé (d10)', 'Un jet raté le soigne'],
    weaknesses: ["N'esquive presque jamais", 'Critiques rares', 'Aucune armure'],
  },
  events: [
    {
      id: 'blood-rage',
      name: 'Rage du sang',
      nature: 'martial',
      trigger: 'naturalOne',
      forfeitsHit: true,
      effects: [{ type: 'heal', amount: 3 }],
    },
    {
      id: 'wind-fury',
      name: 'Furie des vents',
      nature: 'martial',
      trigger: 'naturalTwo',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'windFury', stacks: 1, turns: 1 }],
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

/*
 * Murzug a sa propre Rage du sang (0.36.5) : 5 PV au lieu de 3. Avec moins de PV et des coups plus
 * forts que Gorak, 3 PV ne lui valaient rien (+0,6 point de valeur nette, contre +2,0 pour Gorak).
 */
const murzugDef = variant(gorak, {
  id: 'murzug',
  name: 'Murzug',
  archetype: 'Berserker',
  lore: {
    tagline: 'Il compte les cicatrices, pas les coups reçus.',
    background:
      "Banni de son clan pour avoir défié le chef en plein festin, Murzug s'est couvert de peintures de guerre et ne vit plus que pour la prochaine mêlée. Moins solide que Gorak, bien plus imprévisible.",
    strengths: ['Gros dé (d10)', 'Critiques fréquents pour un orc (18 %)', 'Un jet raté le soigne'],
    weaknesses: ['Moins de PV que Gorak', "N'esquive presque jamais", 'Aucune armure'],
  },
  tint: 'hue-rotate(-75deg) saturate(1.25) brightness(0.95)',
  stats: { maxHp: -4, critChance: +0.08 },
})
const murzug: CharacterDef = {
  ...murzugDef,
  events: murzugDef.events.map((e) =>
    e.id === 'blood-rage' ? { ...e, id: 'blood-rage-murzug', effects: [{ type: 'heal', amount: 5 }] } : e,
  ),
}

const elaria: CharacterDef = {
  id: 'elaria',
  name: 'Elaria',
  race: 'Elfe',
  archetype: 'Rôdeuse',
  stats: { maxHp: 48, damageDie: 8, armor: 0, dodgeChance: 0.33, critChance: 0.22, critMultiplier: 2 },
  look: { image: elfImg, facing: 'right', scale: 1.04, portrait: { x: 42, y: 8, zoom: 3.4 } },
  lore: {
    tagline: 'Un souffle, une flèche.',
    background:
      "Éclaireuse des marches de Lithmeren, Elaria chasse à la lueur de la lune et n'est jamais là où l'ennemi frappe. Chaque tir manqué lui sert à mieux ajuster le suivant.",
    strengths: ['Meilleure esquive (33 %)', 'Critiques fréquents (22 %)', 'Un jet raté prépare un critique'],
    weaknesses: ['Le moins de PV du roster', 'Petit dé (d8)', "Peine face à l'armure"],
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

const sylwen = variant(elaria, {
  id: 'sylwen',
  name: 'Sylwen',
  archetype: 'Sentinelle sylvestre',
  lore: {
    tagline: 'La forêt ne pardonne pas deux fois.',
    background:
      "Gardienne des bois sacrés de Lithmeren, Sylwen attend l'ouverture parfaite plutôt que de harceler. Elle critique moins souvent qu'Elaria, mais chacun de ses critiques fait très mal.",
    strengths: ['Critiques dévastateurs (×2,4)', 'Esquive encore élevée (26 %)', 'Un jet raté prépare un critique'],
    weaknesses: ['Petit dé (d8)', 'PV modestes', "Moins insaisissable qu'Elaria"],
  },
  tint: 'hue-rotate(-110deg)',
  stats: { maxHp: +2, dodgeChance: -0.07, critChance: -0.05, critMultiplier: +0.4 },
})

const brokk: CharacterDef = {
  id: 'brokk',
  name: 'Brokk',
  race: 'Nain',
  archetype: 'Gardien',
  stats: { maxHp: 68, damageDie: 8, armor: 0, dodgeChance: 0.06, critChance: 0.08, critMultiplier: 2.5 },
  look: { image: dwarfImg, facing: 'left', scale: 0.78, portrait: { x: 38, y: 40, zoom: 2.8 } },
  lore: {
    tagline: 'Ce qui passe la porte passe par moi.',
    background:
      "Gardien héréditaire de la grande porte de Durnhold, Brokk n'a jamais reculé d'un pas. Il encaisse plus que quiconque, et chaque faux pas le rend plus dur encore.",
    strengths: ['Le plus de PV du roster (68)', 'Peau de pierre cumulable', 'Critiques lourds (×2,5)'],
    weaknesses: ['Petit dé (d8)', 'Critiques rares (8 %)', 'Esquive faible'],
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
      name: 'Épines',
      nature: 'martial',
      trigger: 'naturalTwo',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'thorns', stacks: 6, turns: 1 }],
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

const grimbald = variant(brokk, {
  id: 'grimbald',
  name: 'Grimbald',
  archetype: 'Briseur de fer',
  lore: {
    tagline: 'Pourquoi parer quand on peut briser ?',
    background:
      "Ancien forgeron de Durnhold, Grimbald a troqué l'enclume pour une hache de siège. Il a troqué l'endurance pour la force de frappe, au grand dam des anciens du clan.",
    strengths: ['Gros dé (d10)', 'Critiques lourds (×2,5)', 'Peau de pierre cumulable'],
    weaknesses: ['Moins de PV que Brokk (57)', 'Critiques peu fréquents (10 %)', 'Esquive faible'],
  },
  tint: 'saturate(0.15) brightness(1.15)',
  stats: { damageDie: +2, maxHp: -11, critChance: +0.02 },
})

const ervald: CharacterDef = {
  id: 'ervald',
  name: 'Ervald',
  race: 'Mort-vivant',
  archetype: 'Chevalier liche',
  stats: { maxHp: 58, damageDie: 8, armor: 1, dodgeChance: 0.08, critChance: 0.12, critMultiplier: 2 },
  look: { image: undeadImg, facing: 'right', scale: 1.02, portrait: { x: 60, y: 8, zoom: 3.2 } },
  lore: {
    tagline: 'La mort l’a rendu, pas pardonné.',
    background:
      "Ancien capitaine de la garde d'Ostremort, Ervald est tombé en défendant la cité, puis s'est relevé sous son étendard pourpre. Il ne fatigue jamais, et son souffle glacé ronge lentement ceux qui l'affrontent.",
    strengths: ['Empoisonne sur un jet raté', 'Armure légère (−1 par coup)', 'Endurant (58 PV)'],
    weaknesses: ["N'esquive presque jamais", 'Petit dé (d8)', 'Dégâts lents à venir'],
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
      effects: [{ type: 'applyStatus', status: 'lifesteal', stacks: 1 }],
    },
    {
      id: 'poison-aura',
      name: 'Aura de poison',
      nature: 'arcane',
      trigger: 'naturalThree',
      forfeitsHit: true,
      effects: [{ type: 'applyStatus', status: 'poisonAura', stacks: 1 }],
    },
  ],
}

const caldrec = variant(ervald, {
  id: 'caldrec',
  name: 'Caldrec',
  archetype: 'Faucheur d’âmes',
  lore: {
    tagline: 'Il ne garde rien, pas même son bouclier.',
    background:
      "Lieutenant d'Ervald, Caldrec a abandonné l'armure pour la vitesse d'une lame spectrale. Il frappe plus fort et plus souvent en critique, mais le moindre coup l'entame.",
    strengths: ['Gros dé (d10)', 'Critiques plus fréquents (16 %)', 'Empoisonne sur un jet raté'],
    weaknesses: ['Aucune armure', 'Moins de PV qu’Ervald', "N'esquive presque jamais"],
  },
  tint: 'hue-rotate(-110deg) saturate(1.1) brightness(0.95)',
  stats: { damageDie: +2, armor: -1, maxHp: -2, critChance: +0.04 },
})

const ysolde: CharacterDef = {
  id: 'ysolde',
  name: 'Ysolde',
  race: 'Humain',
  archetype: 'Prêtresse solaire',
  // Petit dé (d7) : 3 jets sur 7 (1 à 3) déclenchent une compétence au lieu de frapper. Un d6 (un jet
  // sur deux) la rendait trop dépendante de l'Aura de sainteté : 63 % de victoires, combats de 52 tours.
  stats: { maxHp: 52, damageDie: 7, armor: 0, dodgeChance: 0.08, critChance: 0.1, critMultiplier: 2 },
  look: { image: humanImg, facing: 'right', scale: 1, portrait: { x: 52, y: 14, zoom: 3.4 } },
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
      effects: [{ type: 'cleanse', polarity: 'positive', count: 1, target: 'opponent' }],
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

const berengere = variant(ysolde, {
  id: 'berengere',
  name: 'Bérengère',
  archetype: 'Inquisitrice',
  lore: {
    tagline: 'La lumière brûle aussi.',
    background:
      "Inquisitrice de l'ordre solaire, Bérengère a troqué la patience du sanctuaire pour la traque des hérétiques. Elle frappe plus souvent fort qu'Ysolde, mais tient moins longtemps.",
    strengths: ['Critiques fréquents (16 %)', 'Peur et purification', 'Se soigne chaque tour (sainteté)'],
    weaknesses: ['Moins de PV qu’Ysolde (50)', 'Petit dé (d7)', 'Esquive faible'],
  },
  tint: 'saturate(0.55) brightness(0.92) contrast(1.1)',
  stats: { maxHp: -2, critChance: +0.06 },
})

const naraxes: CharacterDef = {
  id: 'naraxes',
  name: 'Naraxes',
  race: 'Homme-lézard',
  archetype: 'Voleuse',
  // Gros dé (d10) : moins de jets de compétence (3 sur 10) et de plus gros coups. Avec un d8, Pile ou face
  // et Coup de chance, qui ne frappent pas, la laissaient à 33 % de victoires.
  stats: { maxHp: 50, damageDie: 10, armor: 0, dodgeChance: 0.2, critChance: 0.14, critMultiplier: 2 },
  look: { image: lizardImg, facing: 'right', scale: 0.98, portrait: { x: 86, y: 8, zoom: 3.2 } },
  lore: {
    tagline: 'Pile, je gagne. Face, tu perds quand même.',
    background:
      "Coupe-bourse des marais de Sszeth, Naraxes vit de paris et de lames enduites. Elle joue tout sur un coup de chance, et ce qu'elle ne tue pas, son poison s'en charge.",
    strengths: ['Bonne esquive (20 %)', 'Pile ou face : 15 dégâts', 'Lames empoisonnées (décoction)'],
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

const ssythra = variant(naraxes, {
  id: 'ssythra',
  name: 'Ssythra',
  archetype: 'Assassine',
  lore: {
    tagline: 'Une seule morsure suffit.',
    background:
      "Sœur de couvée de Naraxes, Ssythra ne vole pas : elle exécute. Moins insaisissable, elle vise les points faibles et ses critiques ne pardonnent pas.",
    strengths: ['Critiques fréquents (20 %)', 'Critiques lourds (×2,3)', 'Pile ou face : 15 dégâts'],
    weaknesses: ['Moins de PV que Naraxes', 'Moins d’esquive (16 %)', 'Aucune armure'],
  },
  tint: 'hue-rotate(-80deg) saturate(1.15) brightness(0.95)',
  stats: { maxHp: -2, dodgeChance: -0.04, critChance: +0.06, critMultiplier: +0.3 },
})

const aldric: CharacterDef = {
  id: 'aldric',
  name: 'Aldric',
  race: 'Humain',
  archetype: 'Paladin',
  // Critiques lourds (12 % ×2,5 depuis la 0.32.0, quand la riposte a cessé de s'éteindre à vide) : face à l'intimidation du nain, ses coups moyens ne passaient pas (Brokk le battait à 75 %).
  stats: { maxHp: 60, damageDie: 8, armor: 0, dodgeChance: 0.05, critChance: 0.12, critMultiplier: 2.5 },
  look: { image: paladinImg, facing: 'right', scale: 1, portrait: { x: 64, y: 24, zoom: 3.4 } },
  lore: {
    tagline: 'Chaque coup reçu est une dette.',
    background:
      "Champion de l'ordre du Sceau ardent, Aldric porte la bannière dans les pires mêlées. Il encaisse sans broncher, tient le compte des coups reçus et rend la justice d'un seul revers.",
    strengths: ['Rétribution : rend les coups reçus', 'Critiques lourds (12 %, ×2,5)', 'Immunité aux malus (aura)'],
    weaknesses: ['Aucune esquive à parler (5 %)', 'Rétribution dérisoire si on ne l’a pas frappé', 'Aucune armure'],
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
      effects: [{ type: 'applyStatus', status: 'riposte', stacks: 1 }],
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

const gauvain = variant(aldric, {
  id: 'gauvain',
  name: 'Gauvain',
  archetype: 'Croisé',
  lore: {
    tagline: 'La foi tranche plus vite que la loi.',
    background:
      "Frère d'armes d'Aldric, Gauvain a quitté la bannière pour la croisade. Plus léger dans son armure, il esquive davantage et frappe plus souvent juste, mais encaisse moins.",
    strengths: ['Critiques fréquents (17 %, ×2,5)', 'Esquive correcte (10 %)', 'Rétribution et riposte'],
    weaknesses: ['Moins de PV qu’Aldric (54)', 'Rétribution plus maigre : il encaisse moins', 'Aucune armure'],
  },
  tint: 'sepia(0.35) hue-rotate(-25deg) saturate(1.4) brightness(0.9)',
  stats: { maxHp: -6, dodgeChance: +0.05, critChance: +0.05 },
})

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
  look: { image: ogreImg, facing: 'right', scale: 1.06, portrait: { x: 63, y: 14, zoom: 3.2 } },
  lore: {
    tagline: 'Taper. Attendre. Taper plus fort.',
    background:
      "Morgrut ne sait ni compter ni viser, mais personne n'a jamais encaissé deux fois sa massue. Quand il ne comprend pas ce qu'il fait, et ça arrive, il attend.",
    strengths: ['Énorme dé (d14)', 'Beaucoup de PV', 'Coups dévastateurs'],
    weaknesses: ['Aucune compétence', 'Sur 1, 2 ou 3, il attend sans frapper', "Ni esquive ni critique"],
  },
  events: [waitOn('naturalOne', 1), waitOn('naturalTwo', 2), waitOn('naturalThree', 3)],
}

const gnashka = variant(morgrut, {
  id: 'gnashka',
  name: 'Gnashka',
  archetype: 'Ogre des cavernes',
  lore: {
    tagline: 'Plus gris, plus dur, toujours aussi perdu.',
    background:
      "Cousine de Morgrut, Gnashka a grandi sous la montagne. Sa peau grise encaisse mieux et elle vise les têtes, mais sa massue de pierre frappe moins fort.",
    strengths: ['Encore plus de PV (70)', 'Critiques (10 %)', 'Gros dé (d12)'],
    weaknesses: ['Aucune compétence', 'Sur 1, 2 ou 3, elle attend sans frapper', "N'esquive jamais"],
  },
  tint: 'hue-rotate(185deg) saturate(0.45) brightness(0.92)',
  // Un d12 au lieu du d14, compensé par 7 PV et 10 % de critique (52,8 % aux essais)
  stats: { maxHp: +7, damageDie: -2, critChance: +0.1 },
})

const thaldrin: CharacterDef = {
  id: 'thaldrin',
  name: 'Thaldrin',
  race: 'Sylvain',
  archetype: 'Druide',
  stats: { maxHp: 56, damageDie: 10, armor: 0, dodgeChance: 0.08, critChance: 0.08, critMultiplier: 2 },
  look: { image: druidImg, facing: 'right', scale: 1, portrait: { x: 47, y: 13, zoom: 3.2 } },
  // Il change de forme au début de chacun de ses tours, sauf le premier
  forms: [
    { id: 'human', name: 'Forme humaine' },
    { id: 'bear', name: "Forme d'ours", look: { image: druidBearImg, portrait: { x: 70, y: 17, zoom: 3.2 } } },
  ],
  lore: {
    tagline: 'La forêt a deux visages.',
    background:
      "Gardien des chênes anciens, Thaldrin soigne et protège sous sa forme d'homme, puis devient l'ours qui charge et déchire. Il change de peau à chaque tour.",
    strengths: ['Deux formes, six compétences', 'Soin, écorce et lucioles', "Charge et griffes d'ours"],
    weaknesses: ['Forme imposée à chaque tour', 'Esquive faible', 'Coups moyens'],
  },
  events: [
    { id: 'life-bloom', name: 'Fleur de vie', nature: 'arcane', trigger: 'naturalOne', form: 'human', forfeitsHit: true, effects: [{ type: 'heal', amount: 3 }] },
    { id: 'bark-skin', name: 'Écorce épaisse', nature: 'arcane', trigger: 'naturalTwo', form: 'human', forfeitsHit: true, effects: [{ type: 'applyStatus', status: 'barkSkin', stacks: 5 }] },
    { id: 'firefly', name: 'Luciole', nature: 'arcane', trigger: 'naturalThree', form: 'human', forfeitsHit: true, effects: [{ type: 'applyStatus', status: 'firefly', stacks: 3, target: 'opponent' }] },
    { id: 'charge', name: 'Charge', nature: 'martial', trigger: 'naturalOne', form: 'bear', reshapesHit: { value: 'max', noCrit: true }, effects: [] },
    { id: 'claw', name: 'Coup de griffe', nature: 'martial', trigger: 'naturalTwo', form: 'bear', reshapesHit: { value: 'reroll', bonus: 3 }, effects: [] },
    { id: 'rot-aura', name: 'Aura de pourriture', nature: 'arcane', trigger: 'naturalThree', form: 'bear', forfeitsHit: true, effects: [{ type: 'applyStatus', status: 'rotAura', stacks: 1 }] },
  ],
}

const brannoc = variant(thaldrin, {
  id: 'brannoc',
  name: 'Brannoc',
  archetype: "Druide d'automne",
  lore: {
    tagline: 'Les feuilles tombent, les griffes aussi.',
    background:
      "Brannoc veille sur les forêts à la fin de l'été. Plus vif que Thaldrin, il esquive mieux et frappe plus souvent juste, mais sa sève s'épuise plus vite.",
    strengths: ['Deux formes, six compétences', 'Meilleure esquive (12 %)', 'Critiques plus fréquents'],
    weaknesses: ['Moins de PV que Thaldrin', 'Forme imposée à chaque tour', 'Coups moyens'],
  },
  tint: 'hue-rotate(-28deg) saturate(1.25) brightness(0.95)',
  stats: { maxHp: -4, dodgeChance: +0.04, critChance: +0.04 },
})

/** Personnages disponibles, dans l'ordre d'affichage. Pour en ajouter un : une entrée ici. */
export const ROSTER: readonly CharacterDef[] = [
  gorak,
  murzug,
  elaria,
  sylwen,
  brokk,
  grimbald,
  ervald,
  caldrec,
  ysolde,
  berengere,
  naraxes,
  ssythra,
  aldric,
  gauvain,
  morgrut,
  gnashka,
  thaldrin,
  brannoc,
]

/** Les personnages instanciés une fois pour toutes (ils sont immuables). */
export const CHARACTERS: readonly Character[] = ROSTER.map((def) => new Character(def))

export const CHARACTER_IDS: readonly string[] = CHARACTERS.map((c) => c.id)

/** Familles : chaque original suivi de ses variantes, dans l'ordre du roster (une colonne par famille). */
export const FAMILIES: readonly (readonly Character[])[] = CHARACTERS.filter((c) => !c.baseId).map((base) => [
  base,
  ...CHARACTERS.filter((c) => c.baseId === base.id),
])

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
    if (d.baseId && !defs.some((o) => o.id === d.baseId)) problems.push(`${at} baseId inconnu (${d.baseId})`)
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
    const eventIds = new Set<string>()
    for (const e of d.events) {
      if (eventIds.has(e.id)) problems.push(`${at} compétence en double (${e.id})`)
      eventIds.add(e.id)
      if (e.effects.length === 0 && !e.reshapesHit) problems.push(`${at} la compétence ${e.id} n'a aucun effet`)
      if (e.reshapesHit && (!ROLL_TRIGGERS.includes(e.trigger) || e.chance !== undefined || e.forfeitsHit))
        problems.push(`${at} ${e.id}.reshapesHit : réservé aux déclencheurs du dé, sans chance ni forfeitsHit`)
      if (e.form && !d.forms?.some((f) => f.id === e.form)) problems.push(`${at} ${e.id}.form : forme inconnue (${e.form})`)
      if (e.chance !== undefined && !inRange(e.chance, 0, 1)) problems.push(`${at} ${e.id}.chance hors de [0, 1]`)
      if (e.forfeitsHit && (!ROLL_TRIGGERS.includes(e.trigger) || e.chance !== undefined))
        problems.push(`${at} ${e.id}.forfeitsHit : réservé aux déclencheurs du dé, sans chance`)
      if (e.limit !== undefined && (!Number.isInteger(e.limit) || e.limit < 1))
        problems.push(`${at} ${e.id}.limit doit être un entier ≥ 1`)
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
      }
    }
  }
  return problems
}
