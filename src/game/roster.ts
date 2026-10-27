import orcIdleImg from '../assets/orc-idle.png'
import orcAttackImg from '../assets/orc-attack.png'
import orcDodgeImg from '../assets/orc-dodge.png'
import orcKoImg from '../assets/orc-ko.png'
import orcVictoryImg from '../assets/orc-victory.png'
import orcHurtImg from '../assets/orc-hurt.png'
import orcDazedAImg from '../assets/orc-dazed-a.png'
import orcDazedBImg from '../assets/orc-dazed-b.png'
import elfIdleImg from '../assets/elf-idle.png'
import elfAttackImg from '../assets/elf-attack.png'
import elfDodgeImg from '../assets/elf-dodge.png'
import elfHurtImg from '../assets/elf-hurt.png'
import elfKoImg from '../assets/elf-ko.png'
import elfVictoryImg from '../assets/elf-victory.png'
import elfDazedAImg from '../assets/elf-dazed-a.png'
import elfDazedBImg from '../assets/elf-dazed-b.png'
import dwarfIdleImg from '../assets/dwarf-idle.png'
import dwarfAttackImg from '../assets/dwarf-attack.png'
import dwarfDodgeImg from '../assets/dwarf-dodge.png'
import dwarfHurtImg from '../assets/dwarf-hurt.png'
import dwarfKoImg from '../assets/dwarf-ko.png'
import dwarfVictoryImg from '../assets/dwarf-victory.png'
import dwarfDazedAImg from '../assets/dwarf-dazed-a.png'
import dwarfDazedBImg from '../assets/dwarf-dazed-b.png'
import undeadIdleImg from '../assets/undead-idle.png'
import undeadAttackImg from '../assets/undead-attack.png'
import undeadDodgeImg from '../assets/undead-dodge.png'
import undeadHurtImg from '../assets/undead-hurt.png'
import undeadKoImg from '../assets/undead-ko.png'
import undeadVictoryImg from '../assets/undead-victory.png'
import undeadDazedAImg from '../assets/undead-dazed-a.png'
import undeadDazedBImg from '../assets/undead-dazed-b.png'
import humanIdleImg from '../assets/human-idle.png'
import humanAttackImg from '../assets/human-attack.png'
import humanDodgeImg from '../assets/human-dodge.png'
import humanHurtImg from '../assets/human-hurt.png'
import humanKoImg from '../assets/human-ko.png'
import humanVictoryImg from '../assets/human-victory.png'
import humanDazedAImg from '../assets/human-dazed-a.png'
import humanDazedBImg from '../assets/human-dazed-b.png'
import lizardIdleImg from '../assets/lizardman-idle.png'
import lizardAttackImg from '../assets/lizardman-attack.png'
import lizardDodgeImg from '../assets/lizardman-dodge.png'
import lizardHurtImg from '../assets/lizardman-hurt.png'
import lizardKoImg from '../assets/lizardman-ko.png'
import lizardVictoryImg from '../assets/lizardman-victory.png'
import lizardDazedAImg from '../assets/lizardman-dazed-a.png'
import lizardDazedBImg from '../assets/lizardman-dazed-b.png'
import paladinIdleImg from '../assets/paladin-idle.png'
import paladinAttackImg from '../assets/paladin-attack.png'
import paladinDodgeImg from '../assets/paladin-dodge.png'
import paladinHurtImg from '../assets/paladin-hurt.png'
import paladinKoImg from '../assets/paladin-ko.png'
import paladinVictoryImg from '../assets/paladin-victory.png'
import paladinDazedAImg from '../assets/paladin-dazed-a.png'
import paladinDazedBImg from '../assets/paladin-dazed-b.png'
import ogreIdleImg from '../assets/ogre-idle.png'
import ogreAttackImg from '../assets/ogre-attack.png'
import ogreDodgeImg from '../assets/ogre-dodge.png'
import ogreHurtImg from '../assets/ogre-hurt.png'
import ogreKoImg from '../assets/ogre-ko.png'
import ogreVictoryImg from '../assets/ogre-victory.png'
import ogreDazedAImg from '../assets/ogre-dazed-a.png'
import ogreDazedBImg from '../assets/ogre-dazed-b.png'
import druidIdleImg from '../assets/druid-idle.png'
import druidAttackImg from '../assets/druid-attack.png'
import druidDodgeImg from '../assets/druid-dodge.png'
import druidHurtImg from '../assets/druid-hurt.png'
import druidKoImg from '../assets/druid-ko.png'
import druidVictoryImg from '../assets/druid-victory.png'
import druidDazedAImg from '../assets/druid-dazed-a.png'
import druidDazedBImg from '../assets/druid-dazed-b.png'
import bearIdleImg from '../assets/druid-bear-idle.png'
import bearAttackImg from '../assets/druid-bear-attack.png'
import bearDodgeImg from '../assets/druid-bear-dodge.png'
import bearHurtImg from '../assets/druid-bear-hurt.png'
import bearKoImg from '../assets/druid-bear-ko.png'
import bearVictoryImg from '../assets/druid-bear-victory.png'
import bearDazedAImg from '../assets/druid-bear-dazed-a.png'
import bearDazedBImg from '../assets/druid-bear-dazed-b.png'
import bardIdleImg from '../assets/bard-idle.png'
import bardAttackImg from '../assets/bard-attack.png'
import bardDodgeImg from '../assets/bard-dodge.png'
import bardHurtImg from '../assets/bard-hurt.png'
import bardKoImg from '../assets/bard-ko.png'
import bardVictoryImg from '../assets/bard-victory.png'
import bardDazedAImg from '../assets/bard-dazed-a.png'
import bardDazedBImg from '../assets/bard-dazed-b.png'
import { Character, type CharacterDef } from './character'
import { isRollTrigger, type CharacterEvent, type RankAxis } from './events'
import { isEngravable } from './forge'
import { STATUSES } from './statuses'

/**
 * Foudre du druide (0.76.0, demande de l'utilisateur) : des éclairs de dégâts directs, jamais critiques. 2 chacun
 * jusqu'à la 0.105.0 ; 1 depuis la 0.106.0 (phase 5 bis) : la Foudre se greffe sur son coup de base. Trois éclairs jusqu'à
 * la revue des compétences (O3, docs/REVUE_COMPETENCES.md), quatre depuis : la plus faible brique de kit du jeu.
 */
const THUNDERBOLT = 1
const THUNDERBOLT_HITS = 4

/*
 * Archétypes par race :
 * - Orc : brute, beaucoup de PV, lent à esquiver.
 * - Elfe : agile, peu de PV, esquive et critiques fréquents.
 * - Nain : tank, une armure temporaire qui s'use, critiques rares mais lourds.
 * - Mort-vivant : affliction, endurant et peu esquiveur, il empoisonne l'adversaire.
 * - Humain (prêtresse) : contrôle, la Lumière et des soins.
 * - Homme-lézard (voleuse) : chance et poison, esquive et critiques.
 * Un seul personnage par famille depuis la 0.43.0 (les jumeaux de coloris sont retirés, chacun garde
 * les statistiques les plus pertinentes des deux, voir docs/PERSONNAGES.md).
 * Règles v2, phase 5 bis (0.106.0, docs/RESOLUTION.md § 3 bis) : chacun a une attaque (une petite fourchette, d'un type
 * unique depuis le 2026-10-24), son coup de base à chaque jet ; le d6 ne fait plus de dégâts, ses faces 1 et 2 déclenchent ses deux
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
  // Un seul modèle (0.113.0, règle de l'utilisateur) : la signature sur le 1, Pourfendre sur le 2, en tournoi comme en campagne.
  stats: { maxHp: 57, attackMin: 5, attackMax: 6, armor: 0, dodgeChance: 0.05, critChance: 0.14, critMultiplier: 2 },
  // Premier personnage à postures (0.40.0, docs/POSTURES.md). La toile commune est plus haute que la garde
  // seule (la garde en occupe 84 %, avec 13 % de vide au-dessus de la tête) : scale 1,18 pour sa taille 1,08.
  look: {
    image: orcIdleImg,
    poses: { attack: orcAttackImg, dodge: orcDodgeImg, hurt: orcHurtImg, ko: orcKoImg, victory: orcVictoryImg, dazed: [orcDazedAImg, orcDazedBImg] },
    facing: 'right',
    scale: 1.18,
    headroom: 0.13,
    portrait: { x: 49, y: 8, zoom: 3 },
  },
  lore: {
    tagline: 'Le roc des fosses de Kar-Dush.',
    background:
      "Sept saisons invaincu dans les fosses de combat de Kar-Dush. Gorak frappe sans finesse mais encaisse tout, et l'on dit qu'un coup manqué ne fait que l'énerver davantage.",
    strengths: ['Furie des vents : deux coups tout de suite', 'Critiques fréquents pour un orc (14 %)', 'Pourfendre : la plaie suit le coup'],
    weaknesses: ["N'esquive presque jamais", 'Aucune armure', 'Brutal mais prévisible'],
  },
  // Signature (règles v2, décision de l'utilisateur) : la Furie des vents, sur la face 1
  signature: 'wind-fury',
  // Répertoire (règles v2, phase 2, docs/PROGRESSION.md § 7) : le Sang (Épines acérées, Vol de vie, Plaie ouverte), la Furie
  // (Œil de faucon, Aura de précision). La Plaie ouverte (revue des compétences, I4) : ses critiques nourrissent sa Curée
  repertoire: ['thorns', 'life-steal', 'open-wound', 'hawk-eye', 'precision-aura'],
  reserve: [
    // Phase 8, lot 3 (SORTS.md § 29) : le malus de Soin, la plaie qui ne se referme pas. La perte de 4 PV porte la gravure
    // (l'arrêt des soins seul : +1,9, deux soigneurs sur neuf) ; gravée +14,0 chez lui, +14,1 en moyenne, rang II +5,4
    {
      id: 'hemorrhage',
      name: 'Hémorragie',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [
        { type: 'damage', amount: 4, target: 'opponent', source: 'bleed' },
        { type: 'applyStatus', status: 'hemorrhage', stacks: 1, target: 'opponent' },
      ],
      rankAxis: { kind: 'amount', per: 2 },
    },
    {
      id: 'power-aura',
      name: 'Aura de puissance',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'powerAura', stacks: 1 }],
      // Axes de rang (E1, 0.110.0, SORTS.md § 20 ; entiers depuis la 0.111.0). Une aura non cumulable aiguisée vaut un
      // cran de plus (son intensité) ; une aura cumulable, une charge de plus, ou une intensité. Cumulable à 3 charges depuis
      // la revue des auras (A4) : son rang reste une intensité, +1 par coup
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      // Phase 8, premier lot (0.114.0, SORTS.md) : le pont du Sang vers la Furie. Greffée, elle part si l'adversaire saigne :
      // des coups de base bruts juste après le coup de base de son jet, deux jusqu'à la revue des compétences (O1), trois
      // depuis (Gorak construit +5,8 → +7,4). Gravée : Brokk +10,4, Gorak +7,0. Rang : une charge de plus, trois coups
      // (« un coup » par rang ne valait que +1,5 à +1,9)
      id: 'quarry',
      name: 'Curée',
      nature: 'martial',
      trigger: 'naturalThree',
      when: [{ type: 'hasStatus', who: 'opponent', status: 'bleed' }],
      effects: [{ type: 'applyStatus', status: 'quarry', stacks: 1 }],
      rankAxis: { kind: 'stacks', per: 1 },
    },
    {
      // Phase 8, lot 3 (SORTS.md § 28) : la consommatrice de critiques de sa Furie, une aura. Chaque critique : deux coups
      // de base bruts juste après ; chaque pose de plus et chaque rang : +5 % de critique. Gravée : Gorak +11,8, rang II +3,9
      id: 'blood-frenzy',
      name: 'Ivresse du sang',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'bloodFrenzy', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
  ],
  events: [
    {
      // Phase 5 bis : elle remplace le coup de sa face par deux coups de base bruts, tout de suite
      id: 'wind-fury',
      name: 'Furie des vents',
      nature: 'martial',
      trigger: 'naturalOne',
      relation: 'replace',
      effects: [{ type: 'applyStatus', status: 'windFury', stacks: 1 }],
      // Un coup de plus par rafale : +9,8 points gravée, au-dessus de la bande (0.111.0, signalé ; une charge de plus
      // doublait la rafale : +15 ; le demi-rang de la 0.110.0, +7,9, est retiré)
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      // 0.70.0 (proposition de l'utilisateur) : remplace la Saignée, qui sacrifiait le coup. Phase 5 bis : elle modifie
      // son coup de base ; un coup doit toucher pour poser un malus physique. La plaie coule au coup suivant (RESOLUTION
      // § 5, règle 9). 0.107.0 (SORTS.md § 19) : Saignement égal à la moitié des PV que ce coup retire, arrondie au-dessus,
      // au lieu de 2 : la plaie lit le coup.
      id: 'cleave',
      name: 'Pourfendre',
      nature: 'martial',
      trigger: 'naturalTwo',
      relation: 'modify',
      effects: [{ type: 'applyStatus', status: 'bleed', stacks: 0, fromHit: 0.5, target: 'opponent' }],
      // +2 Saignement par rang depuis la revue des compétences (R1) : +1 laissait le rang II à +2,4 chez Gorak construit
      rankAxis: { kind: 'stacks', per: 2 },
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
  // Postures (atelier des postures, 2026-10-20). L'arc dépasse de la tête : la taille se règle sur le
  // corps (capuche-pieds, 77 % de la toile), le reste compte dans `headroom` (comme Aldric et Ysolde)
  look: {
    image: elfIdleImg,
    poses: { attack: elfAttackImg, dodge: elfDodgeImg, hurt: elfHurtImg, ko: elfKoImg, victory: elfVictoryImg, dazed: [elfDazedAImg, elfDazedBImg] },
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
  // Répertoire : la Chasse (Furie des vents, Pourfendre, Curée), la Fuite (Coup de chance, Riposte) ; le Coup de massue
  // (phase 8, lot 3 : la Feinte, sa consommatrice d'esquive, attend la décision de l'utilisateur, elle est la plus construite)
  repertoire: ['wind-fury', 'cleave', 'quarry', 'lucky-strike', 'riposte', 'stunning-blow'],
  reserve: [
    {
      id: 'precision-aura',
      name: 'Aura de précision',
      nature: 'finesse',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'precisionAura', stacks: 1 }],
      rankAxis: { kind: 'stacks', per: 1 },
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
      rankAxis: { kind: 'stacks', per: 1 },
    },
    {
      id: 'evasion',
      name: 'Esquive améliorée',
      nature: 'finesse',
      trigger: 'naturalTwo',
      // Sans durée depuis la 0.36.5 : elle attend le prochain coup reçu. Avec une durée d'un tour, elle
      // s'éteignait sans servir une fois sur trois (coup adverse sans frappe ou tour perdu), comme la Riposte avant la 0.32.0.
      effects: [{ type: 'applyStatus', status: 'evasion', stacks: 1 }],
      // Son rang (0.117.1, non cumulable) : +2 dégâts à ses coups tant qu'elle attend l'esquive, +3,3 points gravée (+1 :
      // +1,8, sous la bande). Avant : une esquive de plus (+9,6 en 0.111.0), que « une charge au plus » ne permet plus
      rankAxis: { kind: 'power', per: 2 },
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
  // Un seul modèle (0.113.0) : Épines acérées sur le 1, Peau de pierre sur le 2
  stats: { maxHp: 57, attackMin: 5, attackMax: 6, armor: 0, dodgeChance: 0.06, critChance: 0.1, critMultiplier: 2.2 },
  // Nouveau modèle et postures (atelier des postures, 2026-10-20), création originale qui remplace le
  // placeholder. La hache dépasse de la tête : la taille se règle sur le corps (tête-pieds, 71,6 % de la
  // toile), le reste compte dans `headroom` (comme Aldric). La hache du K.O. descend sous les pieds
  look: {
    image: dwarfIdleImg,
    poses: { attack: dwarfAttackImg, dodge: dwarfDodgeImg, hurt: dwarfHurtImg, ko: dwarfKoImg, victory: dwarfVictoryImg, dazed: [dwarfDazedAImg, dwarfDazedBImg] },
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
  // Signature (décision de l'utilisateur) : Épines acérées, sur la face 1
  signature: 'thorns',
  // Répertoire : le Rempart (Aura d'immunité, Rétribution, Rancune, Coup de massue), les Représailles (Riposte, Pourfendre,
  // Curée, Vindicte, Dette de sang)
  repertoire: ['immunity-aura', 'retribution', 'grudge', 'riposte', 'cleave', 'quarry', 'vendetta', 'blood-debt', 'stunning-blow', 'guard-break'],
  reserve: [
    {
      id: 'intimidation-aura',
      name: "Aura d'intimidation",
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'intimidationAura', stacks: 1 }],
      rankAxis: { kind: 'stacks', per: 1 },
    },
    {
      // Phase 8, second lot (SORTS.md § 23) : le consommateur de sa Peau de pierre, le pont du Rempart vers les Épines
      // (FAMILLES § 7, « un bouclier consommé donne des Épines »). Une aura : +2 Épines acérées par charge à chaque armure
      // temporaire vidée (gravée : +8,1 ; « +3 Épines, 1x » valait +8,8, mais son rang n'ajoutait que +0,7). Revue des
      // auras (A3) : +2 armure temporaire avec elles, la boucle qui nourrit sa ressource (Brokk +7,8 → +11,7, 0,39 armure
      // vidée par combat avant). Son rang : +2 Épines et +2 armure ; il était de +6 Épines (calage de campagne, série 28)
      id: 'bristling-rampart',
      name: 'Rempart hérissé',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'bristlingRampart', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
  ],
  events: [
    {
      id: 'thorns',
      name: "Aura d'épines",
      nature: 'martial',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'thorns', stacks: 1 }],
      // Une charge de plus qui agit sans se poser : chaque coup encaissé fait saigner d'une charge de plus (+8,8 points
      // gravée, au-dessus de la bande, 0.111.0 ; à demi en 0.110.0 : +6,1)
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      id: 'stoneskin',
      name: 'Peau de pierre',
      nature: 'martial',
      trigger: 'naturalTwo',
      effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 6 }],
      rankAxis: { kind: 'stacks', per: 2 },
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
  // quitte le kit. Mesuré : 50,2 % (53,9 % avant). Un seul modèle (0.113.0) : Aura glaciale sur le 1, Vol de vie sur le 2.
  stats: { maxHp: 56, attackMin: 4, attackMax: 6, armor: 0, dodgeChance: 0.08, critChance: 0.24, critMultiplier: 2 },
  // Postures (atelier des postures, 2026-10-20) : la garde occupe 83,4 % de la toile ; la même hauteur
  // à l'écran qu'avant (0,98 × 0,99 de l'ancienne image) donne scale 0,97 / 0,834 = 1,16
  look: {
    image: undeadIdleImg,
    poses: { attack: undeadAttackImg, dodge: undeadDodgeImg, hurt: undeadHurtImg, ko: undeadKoImg, victory: undeadVictoryImg, dazed: [undeadDazedAImg, undeadDazedBImg] },
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
    strengths: ['Vol de vie : son coup le soigne', 'Aura glaciale : un poison sans fin', 'Critiques fréquents (24 %)'],
    weaknesses: ["N'esquive presque jamais", 'Aucune armure', 'Dégâts lents à venir'],
  },
  signature: 'frost-aura',
  // Répertoire : le Poison (Aura de décoction, Feux follets, Embrasement, Attiser), le Drain (Pourfendre, Peur)
  repertoire: ['decoction-aura', 'firefly', 'conflagration', 'stoke', 'cleave', 'fear'],
  reserve: [
    {
      id: 'grave-breath',
      name: 'Souffle de la tombe',
      nature: 'arcane',
      trigger: 'naturalOne',
      // Poison 3 : 3, 2 puis 1 PV, les 6 PV de l'ancien poison 2 pendant 3 tours (0.36.4)
      effects: [{ type: 'applyStatus', status: 'poison', stacks: 3, target: 'opponent' }],
      rankAxis: { kind: 'stacks', per: 1 },
    },
    // Phase 8, premier lot (0.114.0, SORTS.md) : les consommateurs de son Poison. Le pont vers le Drain (Récolte) et
    // l'amplificateur du fil Poison (Virulence). Revue des compétences (P1, P2) : elles mouraient sur leur condition et leur
    // montant (Ervald construit +5,3 et +5,2)
    {
      // +14 PV si l'adversaire est empoisonné (7 avant la revue), rang +6 (+4 avant)
      id: 'harvest',
      name: 'Récolte',
      nature: 'arcane',
      trigger: 'naturalThree',
      when: [{ type: 'hasStatus', who: 'opponent', status: 'poison' }],
      effects: [{ type: 'heal', amount: 14 }],
      rankAxis: { kind: 'amount', per: 6 },
    },
    {
      // Le Poison de l'adversaire triplé (`fromStatus`, deux fois ses charges en plus, lues quand elle part), puis +2. Sans
      // condition depuis la revue (P1) : elle part à chaque fois (0,51 → 1,23 fois par combat), et pose elle-même son Poison
      // sur un adversaire sain. Son rang ajoute 1 Poison à plat (3 avant la revue : sans condition, +3 sortait de la bande)
      id: 'virulence',
      name: 'Virulence',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, target: 'opponent', fromStatus: { status: 'poison', who: 'opponent', factor: 2 } }],
      rankAxis: { kind: 'stacks', per: 1 },
    },
    {
      // Revue des compétences (I4) : la seconde consommatrice de critiques (Précision → Saignement), une aura. Réservée aux
      // critiques fréquents : gravée, Ervald +10,3, Elaria +12,5, ailleurs +0,9 à +6,3. Son rang : +3 Saignement
      id: 'open-wound',
      name: 'Plaie ouverte',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'openWound', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      // Phase 8, lot 3 (SORTS.md § 28) : la seconde consommatrice de soins, son Drain vers le Poison, une aura. Gravée :
      // Ervald +8,9 ; rang II +2,6, sous la bande (ses soins sont rares, comme pour la Récolte)
      id: 'black-sap',
      name: 'Sève noire',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'blackSap', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
  ],
  events: [
    {
      id: 'frost-aura',
      name: 'Aura glaciale',
      nature: 'arcane',
      trigger: 'naturalOne',
      // 0.69.0 : l'aura pose du vrai Poison (cumulable, sans compensation), au lieu de dégâts directs
      effects: [{ type: 'applyStatus', status: 'frostAura', stacks: 1 }],
      // +1 Poison par tour : +10,2 points gravée, au-dessus de la bande (0.111.0, signalé ; à demi en 0.110.0 : +7,5)
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      id: 'life-steal',
      name: 'Vol de vie',
      nature: 'arcane',
      trigger: 'naturalTwo',
      // 0.107.0 (SORTS.md § 19) : 1 charge au lieu de 2 (plafond 2 gardé) ; deux coups drainés à chaque 1 le mettaient à
      // +21 points gravé et +23,6 dans le kit d'Ervald. Revue des compétences (P3) : +2 PV par coup drainé dès le rang I
      // (l'intensité posée), +4 par rang ; la plus faible compétence de kit après la Foudre (+5,9 dans les builds d'Ervald)
      effects: [{ type: 'applyStatus', status: 'lifesteal', stacks: 1, power: 2 }],
      rankAxis: { kind: 'power', per: 4 },
    },
  ],
}

/** Dégâts directs de la Purification quand il n'y a aucun bonus à retirer (0.42.0 ; 6 depuis 0.115.1). */
const PURIFICATION_LIGHT = 6

const ysolde: CharacterDef = {
  id: 'ysolde',
  name: 'Ysolde',
  race: 'Humain',
  archetype: 'Prêtresse solaire',
  // Petit dé (d7) jusqu'à la 0.104.0 : 3 jets sur 7 (1 à 3) déclenchaient une compétence au lieu de frapper.
  // d6 imprimé (règles v2, phase 5, 0.105.0) : Purification sur le 1, Aura de sainteté sur le 2 ; la Peur quitte le kit.
  // Mesuré : 49,1 % (43,9 % avant, la plus basse du roster). Son coup de base est un coup comme les autres (2026-10-24 ;
  // magique, en Lumière, de la phase 5 bis à la 0.110.1) ; la Lumière reste à sa Purification. Un seul modèle (0.113.0) :
  // Aura de sainteté sur le 1, Purification sur le 2.
  stats: { maxHp: 52, attackMin: 5, attackMax: 7, armor: 0, dodgeChance: 0.08, critChance: 0.1, critMultiplier: 2 },
  // Postures (atelier des postures, 2026-10-20). La masse levée et le halo dépassent de la tête : la taille
  // se règle sur le corps (tête-pieds, 74 % de la toile), le reste compte dans `headroom` (comme Aldric)
  look: {
    image: humanIdleImg,
    poses: { attack: humanAttackImg, dodge: humanDodgeImg, hurt: humanHurtImg, ko: humanKoImg, victory: humanVictoryImg, dazed: [humanDazedAImg, humanDazedBImg] },
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
  // Répertoire : la Lumière (Aura d'immunité, Rétribution), le Contrôle (Peau de pierre, Vol de vie, Coup de massue)
  // Phase 8, lot 3 : deux malus de la Lumière, Éclair aveuglant (Précision) et Confiscation (Sceaux)
  repertoire: ['immunity-aura', 'retribution', 'stoneskin', 'life-steal', 'stunning-blow', 'blinding', 'seal-theft'],
  reserve: [
    {
      id: 'fear',
      name: 'Peur',
      nature: 'arcane',
      trigger: 'naturalOne',
      // 0.107.0 (SORTS.md § 19) : une fois par combat ; un tour perdu à chaque 1 valait +22 points gravé (+20 à deux fois)
      limit: 1,
      effects: [{ type: 'applyStatus', status: 'fear', stacks: 1, target: 'opponent' }],
      rankAxis: { kind: 'limit', per: 1 },
    },
    {
      // Phase 8, premier lot (0.114.0, SORTS.md) : le consommateur de ses soins, une aura (+8,1 gravée). Revue des auras
      // (A1) : 3 PV par charge (1 avant), Ysolde +7,9 → +15,9 ; son rang, +3 par soin
      id: 'sentence',
      name: 'Sentence',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'sentence', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      // Revue des compétences (I1, retenue avec la Sentence) : l'autre consommatrice de ses soins, Soin → Garde, une aura.
      // Gravée : Ysolde +16,1 (ailleurs +0,5 à +4,1) ; à la place de la Sentence dans ses builds, 37,0 → 43,9 %
      id: 'faith-shield',
      name: 'Bouclier de foi',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'faithShield', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
  ],
  events: [
    {
      id: 'holy-aura',
      name: 'Aura de sainteté',
      nature: 'arcane',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'holyAura', stacks: 1 }],
      // Plafonnée à 2 charges : son intensité, +1 PV par tour (+8,1 points gravée, au bord de la bande, 0.111.0)
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      id: 'purification',
      name: 'Purification',
      nature: 'arcane',
      trigger: 'naturalTwo',
      // 0.42.0 : quand l'adversaire n'a aucun bonus à retirer, la lumière le blesse (dégâts directs) au lieu
      // de tomber à vide (54 % des déclenchements avant). Contre un adversaire à bonus (Brokk), rien ne change.
      // 0.69.0 à 0.112.0 : elle retirait aussi son propre dernier malus ; retiré en 0.113.0 (décision de l'utilisateur :
      // « l'effet sur soi doit être retiré ») : un bonus en face, ou 6 dégâts s'il n'en a pas. Son rang aiguise ces dégâts.
      effects: [{ type: 'cleanse', polarity: 'positive', count: 1, target: 'opponent', orElse: { type: 'damage', amount: PURIFICATION_LIGHT, target: 'opponent', source: 'holy' } }],
      rankAxis: { kind: 'amount', per: 3 },
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
  // le kit. Mesuré : 51,5 % (53,7 % avant). Un seul modèle (0.113.0) : Aura de décoction sur le 1, Pile ou face sur le 2.
  stats: { maxHp: 50, attackMin: 5, attackMax: 6, armor: 0, dodgeChance: 0.2, critChance: 0.14, critMultiplier: 2 },
  // Postures (0.40.0, docs/POSTURES.md) : la garde occupe 81 % de la toile commune, avec 14 % de vide
  // au-dessus de la tête (dague levée de l'attaque) : scale 1,10 pour sa taille 0,97.
  look: {
    image: lizardIdleImg,
    poses: { attack: lizardAttackImg, dodge: lizardDodgeImg, hurt: lizardHurtImg, ko: lizardKoImg, victory: lizardVictoryImg, dazed: [lizardDazedAImg, lizardDazedBImg] },
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
    strengths: ['Bonne esquive (20 %)', 'Pile ou face : pile, son coup ×3', 'Lames empoisonnées (décoction)'],
    weaknesses: ['Peu de PV', 'Hasard à double tranchant', 'Aucune armure'],
  },
  // Signature : Pile ou face jusqu'à la 0.106.1 (l'identité plutôt que la valeur) ; l'Aura de décoction depuis la 0.107.0
  // (décision de l'utilisateur, SORTS.md § 19) : en campagne, elle partait sans ce qui la fait gagner
  signature: 'decoction-aura',
  // Répertoire : la Fortune (Œil de faucon, Esquive améliorée, Pas de côté), le Poison (Souffle de la tombe, Aura glaciale,
  // Virulence). Le Pas de côté (revue des compétences, I3) : l'esquive permanente de la voleuse qui esquive déjà (20 %)
  repertoire: ['hawk-eye', 'evasion', 'sidestep', 'grave-breath', 'frost-aura', 'virulence'],
  reserve: [
    // Phase 8, lot 3 (SORTS.md § 29) : le malus de Fortune, le mauvais œil de la voleuse ; gravée +15,7 chez elle, +18,2
    // en moyenne, rang II +4,6
    { id: 'jinx', name: 'Malchance', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'jinx', stacks: 1, target: 'opponent' }], rankAxis: { kind: 'stacks', per: 1 } },
    {
      id: 'lucky-strike',
      name: 'Coup de chance',
      nature: 'finesse',
      trigger: 'naturalOne',
      // 0.107.0 (SORTS.md § 19) : il se greffe (le coup de ce jet part) ; il remplaçait le coup depuis la phase 5 bis. Le dé
      // qu'il donne, à l'action suivante, est un jet complet
      effects: [{ type: 'applyStatus', status: 'luckyStrike', stacks: 1 }],
      rankAxis: { kind: 'stacks', per: 1 },
    },
    {
      // Phase 8, second lot (SORTS.md § 23) : le consommateur de sa pièce (la Fortune). Une charge qui attend sa prochaine
      // pièce : pile, et pile vaut ×3 de plus (ce coup ×6 ; ×5 jusqu'à la revue des compétences, O2). Gravée : +9,8 à ×5
      // (pile seule, sans bonus : +5,1)
      id: 'loaded-die',
      name: 'Dé pipé',
      nature: 'finesse',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'loadedDie', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      // Phase 8, lot 3 (SORTS.md § 28) : la consommatrice de ses esquives, qui nourrit sa ressource (+5 % d'esquive par
      // charge) ; chaque esquive, un critique assuré. Gravée : Naraxes +11,2, rang II +3,8
      id: 'feint',
      name: 'Feinte',
      nature: 'finesse',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'feint', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
  ],
  events: [
    {
      id: 'decoction-aura',
      name: 'Aura de décoction',
      nature: 'finesse',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'decoctionAura', stacks: 1 }],
      // +1 Poison par coup qui touche : +9,9 points gravée, au-dessus de la bande (0.111.0, signalé ; à demi : +7,4)
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      id: 'coin-flip',
      name: 'Pile ou face',
      nature: 'finesse',
      trigger: 'naturalTwo',
      // Phase 5 bis (décision de l'utilisateur) : elle modifie son coup ; s'il touche, la pièce : pile, ce coup ×2 (×3 depuis
      // la 0.107.0, `COIN_HEADS`)
      relation: 'modify',
      effects: [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }],
      // Pile ×2 de plus par rang depuis la revue des compétences (R2) : ×1 laissait le rang II à +2,3 chez Naraxes construite
      rankAxis: { kind: 'power', per: 2 },
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
  stats: { maxHp: 54, attackMin: 4, attackMax: 6, armor: 0, dodgeChance: 0.07, critChance: 0.17, critMultiplier: 2.5 },
  // Nouveau modèle et postures (atelier des postures, 2026-10-20) : épée basse, plus rien au-dessus de la
  // tête que la hampe de la bannière. La taille se règle sur le corps (tête-pieds, 77 % de la toile) et non
  // sur la hampe : le vide et la bannière au-dessus de la tête comptent dans `headroom`
  look: {
    image: paladinIdleImg,
    poses: { attack: paladinAttackImg, dodge: paladinDodgeImg, hurt: paladinHurtImg, ko: paladinKoImg, victory: paladinVictoryImg, dazed: [paladinDazedAImg, paladinDazedBImg] },
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
  // Répertoire : la Lumière (Purification, Vol de vie), l'Ombre du serment brisé (Peur, Souffle de la tombe, Rancune) ; la
  // Sève noire (phase 8, lot 3), le pont de son Vol de vie vers le Poison du Souffle ; l'Hémorragie (lot 3), la malédiction
  // du serment brisé qui refuse la guérison
  repertoire: ['purification', 'life-steal', 'fear', 'grave-breath', 'grudge', 'black-sap', 'hemorrhage'],
  reserve: [
    // Phase 8, lot 3 (SORTS.md § 29) : le malus de Sceaux, le paladin confisque ; gravée +9,3 chez lui, +10,0 en moyenne,
    // rang II +3,1 (au bord bas de la bande)
    { id: 'seal-theft', name: 'Confiscation', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'sealTheft', stacks: 1, target: 'opponent' }], rankAxis: { kind: 'stacks', per: 1 } },
    {
      id: 'immunity-aura',
      name: "Aura d'immunité",
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [
        { type: 'cleanse', polarity: 'negative' },
        { type: 'applyStatus', status: 'immunityAura', stacks: 1 },
      ],
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      // Phase 8, second lot (SORTS.md § 23) : le consommateur de ses Représailles, les dégâts qu'il renvoie (Riposte,
      // Rétribution). Une aura : +6 Ferveur par charge à chaque renvoi depuis la revue des auras (A2 ; +3 avant, Aldric
      // +9,0 → +12,9 gravée ; +9 valait +15,4, plus risqué)
      id: 'vendetta',
      name: 'Vindicte',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'vendetta', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      // Phase 8, lot 3 (SORTS.md § 28) : la seconde consommatrice des renvois, ses Représailles vers le Sang, une aura.
      // Gravée : Aldric +12,1, rang II +4,0
      id: 'blood-debt',
      name: 'Dette de sang',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'bloodDebt', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
  ],
  events: [
    {
      id: 'retribution',
      name: 'Rétribution',
      nature: 'arcane',
      trigger: 'naturalOne',
      // 0.107.0 (SORTS.md § 19, choisi au laboratoire, série 16) : la moitié des jauges, arrondie au-dessous (au-dessus,
      // elle restait à +20,8 gravée, hors de la bande) ; un coup à chaque jet remplissait ses trois jauges à chaque tour
      // adverse (+38 points dans son kit, +28 gravée)
      effects: [{ type: 'release', status: 'retribution', min: 1, share: 0.5, target: 'opponent', source: 'strike' }],
      rankAxis: { kind: 'share', per: 25 },
    },
    {
      id: 'riposte',
      name: 'Riposte',
      nature: 'martial',
      trigger: 'naturalTwo',
      effects: [{ type: 'applyStatus', status: 'riposte', stacks: 2 }],
      rankAxis: { kind: 'power', per: 2 },
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
  // Postures (atelier des postures, 2026-10-20). La garde (casque compris) occupe 70,3 % de la toile, que
  // la massue levée de la victoire rend haute : même taille à l'écran qu'avant (1,13 d'un humain). La
  // massue du coup encaissé et du K.O. descend sous les pieds
  look: {
    image: ogreIdleImg,
    poses: { attack: ogreAttackImg, dodge: ogreDodgeImg, hurt: ogreHurtImg, ko: ogreKoImg, victory: ogreVictoryImg, dazed: [ogreDazedAImg, ogreDazedBImg] },
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
  // Répertoire : la Colère (Aura de puissance, Pourfendre, Curée), la Masse (Peau de pierre, Aura d'intimidation, Rempart hérissé)
  repertoire: ['power-aura', 'cleave', 'quarry', 'stoneskin', 'intimidation-aura', 'bristling-rampart'],
  // Hors kit (phase 8, premier lot, 0.114.0, SORTS.md) : la Rancune, sa Masse (il encaisse, et son critique sur 7 à 9 est
  // le plus lourd : +19,8 gravée, au bord de la bande ; +14,2 en moyenne sur le roster)
  reserve: [
    // Phase 8, lot 3 (SORTS.md § 29) : le malus de Garde, l'ogre fracasse la garde ; il ne critique pas, ce coup ×2 est son
    // critique. Gravée +18,6 chez lui, +14,5 en moyenne, rang II +5,8
    {
      id: 'guard-break',
      name: 'Brise-garde',
      nature: 'martial',
      trigger: 'naturalThree',
      relation: 'modify',
      effects: [{ type: 'applyStatus', status: 'guardBreak', stacks: 1, target: 'opponent' }],
      rankAxis: { kind: 'stacks', per: 1 },
    },
    {
      id: 'grudge',
      name: 'Rancune',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'grudge', stacks: 1 }],
      rankAxis: { kind: 'stacks', per: 1 },
    },
    {
      // Phase 8, lot 3 (SORTS.md § 28) : sa Masse, le premier porteur d'Étourdi. Il modifie son coup (un malus physique
      // demande un coup qui touche), une fois par combat ; son rang, une fois de plus. Gravé : Morgrut +15,3, rang II +5,3
      id: 'stunning-blow',
      name: 'Coup de massue',
      nature: 'martial',
      trigger: 'naturalThree',
      relation: 'modify',
      limit: 1,
      effects: [{ type: 'applyStatus', status: 'stunned', stacks: 1, target: 'opponent' }],
      rankAxis: { kind: 'limit', per: 1 },
    },
  ],
  events: [],
}

const thaldrin: CharacterDef = {
  id: 'thaldrin',
  name: 'Thaldrin',
  race: 'Sylvain',
  archetype: 'Druide',
  // d6 imprimé (règles v2, phase 5, 0.105.0) : sous forme humaine, la Foudre sur le 1, le 2 et le 3, les Feux follets
  // sur le 4, le 5 et le 6 (les probabilités du d3 d'avant). L'Aura sauvage quitte le kit. Mesuré : 47,4 %.
  // Phase 5 bis (décision de l'utilisateur) : sous ses deux formes, la même attaque ; l'ours a en plus la Force de l'ours
  // (+3, gardée : la règle de forme la plus lisible). Un coup de base d'un type unique depuis le 2026-10-24 (magique, la
  // Foudre, en homme jusqu'à la 0.110.1). Son feu, les Feux follets, est une Brûlure, un dégât qui dure, pas un coup.
  // Un seul modèle (0.113.0, règle de l'utilisateur) : les Feux follets sur le 1, la Foudre sur le 2, quatre faces nues,
  // en tournoi comme en campagne. Attaque 3 à 4 → 5 à 6 (celle de sa campagne de la 0.112.0) : réglée pour un sort sur
  // chaque face humaine, elle laissait ce départ à 15,1 % contre le roster (docs/PERSONNAGES.md).
  stats: { maxHp: 56, attackMin: 5, attackMax: 6, armor: 0, dodgeChance: 0.08, critChance: 0.08, critMultiplier: 2 },
  // Postures (atelier des postures, 2026-10-20). La garde (bâton et bois compris) occupe 83,9 % de la toile,
  // que le bâton levé de la victoire rend haute : même taille à l'écran qu'avant (1,00 d'un humain)
  look: {
    image: druidIdleImg,
    poses: { attack: druidAttackImg, dodge: druidDodgeImg, hurt: druidHurtImg, ko: druidKoImg, victory: druidVictoryImg, dazed: [druidDazedAImg, druidDazedBImg] },
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
        poses: { attack: bearAttackImg, dodge: bearDodgeImg, hurt: bearHurtImg, ko: bearKoImg, victory: bearVictoryImg, dazed: [bearDazedAImg, bearDazedBImg] },
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
    strengths: ['Feux follets : une Brûlure qui dure', 'L’ours frappe fort (+3)', 'Foudre : quatre éclairs'],
    weaknesses: ['Aucun soin ni armure', 'Ses sorts, sous forme d’homme seulement', 'Forme imposée à chaque tour'],
  },
  // 0.73.0 (SORTS.md § 18, choix de l'utilisateur) : l'homme lance des sorts, l'ours frappe. Phase 5 bis : l'homme frappe
  // aussi, d'un petit coup de base. Remplace Fleur de vie, Écorce épaisse, Charge, Coup de griffe et ses deux auras.
  // Signature (2026-10-24, décision de l'utilisateur, PROGRESSION.md § 13.3) : les Feux follets, sur la face 1
  signature: 'firefly',
  // Répertoire : l'Orage et le Feu en dégâts qui durent (Souffle de la tombe, Aura de décoction), la Bête (Aura de puissance,
  // Épines acérées, Coup de massue)
  repertoire: ['grave-breath', 'decoction-aura', 'power-aura', 'thorns', 'stunning-blow'],
  reserve: [
    // Phase 8, lot 3 (SORTS.md § 29) : le malus de Précision, l'éclair qui éblouit ; gravée +13,8 chez lui, +13,6 en
    // moyenne, rang II +3,8 (+10 % de coups ratés)
    { id: 'blinding', name: 'Éclair aveuglant', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'blinded', stacks: 1, target: 'opponent' }], rankAxis: { kind: 'power', per: 1 } },
    { id: 'wild-aura', name: 'Aura sauvage', nature: 'martial', trigger: 'naturalThree', form: 'human', effects: [{ type: 'applyStatus', status: 'wildAura', stacks: 1 }], rankAxis: { kind: 'stacks', per: 1 } },
    {
      // Phase 8, second lot (SORTS.md § 23) : le consommateur de ses Feux follets (la Brûlure). Une charge qui attend son
      // prochain coup qui touche un adversaire qui brûle : trois fois sa Brûlure restante, d'un coup (gravée : +8,6 ; au jet,
      // sans attente, elle ne partait que 0,15 fois par combat : +2,2 à ×2)
      id: 'conflagration',
      name: 'Embrasement',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'conflagration', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      // Phase 8, lot 3 (SORTS.md § 28) : son Feu, l'amplificateur de la Brûlure. +2 à la Brûlure de l'adversaire, qui
      // repart (une Brûlure se remplace) ; sans Brûlure, 2. Gravé : Thaldrin +11,7, rang II +5,5 (+1 de plus)
      id: 'stoke',
      name: 'Attiser',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'burn', stacks: 2, target: 'opponent', fromStatus: { status: 'burn', who: 'opponent', factor: 1 } }],
      rankAxis: { kind: 'stacks', per: 1 },
    },
    {
      // Phase 8, lot 3 (SORTS.md § 28) : son Orage, une aura qui frappe l'adversaire au début de chacun de ses tours, un éclair
      // de dégâts directs par charge ; gravée, elle agit sous ses deux formes. Gravée : Thaldrin +10,5, rang II +4,7
      id: 'storm-sky',
      name: "Ciel d'orage",
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'stormSky', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
  ],
  events: [
    {
      id: 'firefly',
      name: 'Feux follets',
      nature: 'arcane',
      trigger: 'naturalOne',
      form: 'human',
      effects: [{ type: 'applyStatus', status: 'burn', stacks: 3, target: 'opponent' }],
      // +2 Brûlure par rang depuis la revue des compétences (R3) : +1 laissait le rang II à +3,4 chez Thaldrin construit
      rankAxis: { kind: 'stacks', per: 2 },
    },
    {
      id: 'thunderbolt',
      name: 'Foudre',
      nature: 'arcane',
      trigger: 'naturalTwo',
      form: 'human',
      scene: 'lightning',
      effects: [{ type: 'damage', amount: THUNDERBOLT, hits: THUNDERBOLT_HITS, target: 'opponent', source: 'lightning' }],
      // +1 par éclair : +8,7 points gravée, au-dessus de la bande (0.111.0, signalé ; à demi en 0.110.0 : +6,5 ; +2 par
      // éclair avant la 0.110.0 : +15,1)
      rankAxis: { kind: 'amount', per: 1 },
    },
  ],
}

/*
 * Barde (0.41.0, concept d'un ami de l'utilisateur). Équilibrage (0.41.0, choix de l'utilisateur après mesure) : appliqué
 * à la lettre, le concept gagnait 45 % mais perdait 87/13 contre Brokk, 78/22 contre Grimbald, 71/29 contre Ervald :
 * l'intimidation, les épines et l'armure rognent chacun de ses petits coups. D'où l'Ouverture (Aura mélodieuse dès le
 * début, en dégâts finaux, après l'armure), et un gros coup qui multiplie un seul coup de base.
 * Phase 5 ter (2026-10-24, décision de l'utilisateur) : ses compétences passent sur les faces 1 et 2, comme les autres.
 * Le Duo (2026-10-25, piste D validée par l'utilisateur) : un seul d6, comme tout le monde. Son second dé vit dans sa
 * signature : sur le 1, +1 Aura mélodieuse et deux dés à sa prochaine action. Chaque gravure et chaque rang comptait sur
 * ses deux dés (gravures +17 en moyenne, rang II de l'aura +18,9). Kit et mesures : docs/PERSONNAGES.md.
 */
const fanchon: CharacterDef = {
  id: 'fanchon',
  name: 'Fanchon',
  race: 'Humain',
  archetype: 'Saltimbanque',
  // Esquive de 12 à 6 % (0.46.0), puis 10 % : compensation de Siffloter et de la Fausse note, qui frappent désormais.
  // Le Duo (2026-10-25) : attaque 1 à 3 → 4 à 6, critique 10 → 5 % (un dé au lieu de deux ; PV intacts). Sa chanson
  // fait le reste : l'Aura mélodieuse s'ajoute après l'armure.
  stats: { maxHp: 46, attackMin: 4, attackMax: 6, armor: 0, dodgeChance: 0.1, critChance: 0.05, critMultiplier: 2 },
  // Postures (session images, 0.41.0) : la garde occupe 94,7 % de la toile ; scale = 1,00 × 0,92 / 0,947
  look: {
    image: bardIdleImg,
    poses: { attack: bardAttackImg, dodge: bardDodgeImg, hurt: bardHurtImg, ko: bardKoImg, victory: bardVictoryImg, dazed: [bardDazedAImg, bardDazedBImg] },
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
      "Fanchon a appris l'escrime entre deux couplets, sur les tréteaux des foires. Quand la foule reprend le refrain, elle lance deux dés et frappe deux fois ; sa chanson porte ses coups, et son solo les fait trembler.",
    strengths: ['Duo : deux dés au tour suivant', 'Aura dès son entrée en scène', 'Soliste : ce coup ×3'],
    weaknesses: ['Peu de PV (46)', 'Aucune armure', 'Gros coups rares'],
  },
  // Signature (le Duo, 2026-10-25) : sur la face 1, sa chanson et son second dé ; l'Ouverture n'est pas une face, elle reste
  signature: 'duo',
  // Répertoire : le Chant (Aura de puissance, Esquive améliorée, Aura de précision), la Fortune (Pile ou face, Dé pipé).
  // Le Duo (2026-10-25) : l'Aura de puissance remplace Coup de chance, la mécanique même du Duo (un seul de leurs
  // statuts part par action). Gravée chez elle : +13,7 points (Coup de chance +18,0) ; construite 56 % contre 57 %,
  // saison 57 % contre 58 %, à égalité dans le bruit
  repertoire: ['power-aura', 'coin-flip', 'loaded-die', 'evasion', 'precision-aura', 'feint', 'jinx'],
  // Hors kit (phase 5 ter) : ses autres chansons, gravables, réécrites pour une face (elles valaient un double, un jet
  // sur 36) : Siffloter 3 → 2 charges, Fausse note 2 → 1, Crescendo ×4 à la place des deux coups → ce coup ×2. 0.107.0 :
  // Crescendo monte (×1 de plus à chaque fois qu'il touche), il n'est plus un Soliste plus faible. Revue des compétences
  // (P5, P4) : Siffloter rend 3 PV par tour (2 avant) ; la Fausse note vaut deux coups à −4 (un coup à −5 avant), son
  // intensité de départ (1) les compte. Le Pas de côté (I3) : la saltimbanque qui esquive d'un pas de danse
  reserve: [
    { id: 'whistle', name: 'Siffloter', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'whistling', stacks: 2 }], rankAxis: { kind: 'stacks', per: 1 } },
    {
      id: 'false-note',
      name: 'Fausse note',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'falseNote', stacks: 1, power: 1, target: 'opponent' }],
      rankAxis: { kind: 'power', per: 1 },
    },
    { id: 'crescendo', name: 'Crescendo', nature: 'martial', trigger: 'naturalThree', relation: 'modify', hitMultiplier: 2, buildsUp: true, effects: [], rankAxis: { kind: 'multiplier', per: 1 } },
    // Revue des compétences (I3) : la première esquive permanente, une aura cumulable (+8 % par charge ; gravée +8,2, de
    // Fanchon +6,4 à Ervald +10,0). Son rang : une charge de plus
    {
      id: 'sidestep',
      name: 'Pas de côté',
      nature: 'finesse',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'sidestep', stacks: 1 }],
      rankAxis: { kind: 'stacks', per: 1 },
    },
  ],
  events: [
    { id: 'overture', name: 'Ouverture', nature: 'arcane', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'melodiousAura', stacks: 1 }] },
    // Le Duo (2026-10-25) : l'aura du 1 (1 charge depuis la phase 5 ter), puis un dé de plus à sa prochaine action, joué en
    // entier (la mécanique de Coup de chance). Un rang va à l'aura, son premier effet : +7,8 points au rang II (le second
    // dé seul, aiguisé, valait +14,6 ; FanchonLab, série 29)
    {
      id: 'duo',
      name: 'Duo',
      nature: 'arcane',
      trigger: 'naturalOne',
      effects: [
        { type: 'applyStatus', status: 'melodiousAura', stacks: 1 },
        { type: 'applyStatus', status: 'duo', stacks: 1 },
      ],
      rankAxis: { kind: 'stacks', per: 1 },
    },
    // Un gros coup (idée de l'utilisateur) : l'intimidation et les épines ne le rognent qu'une fois. Phase 5 ter : il
    // modifie son coup de base, ce coup ×3. 0.107.0 (SORTS.md § 19) : le solo, une fois par combat (un solo qui touche) ;
    // à chaque 2, il valait +23 points gravé ; Crescendo, lui, monte à chaque fois
    { id: 'soloist', name: 'Soliste', nature: 'martial', trigger: 'naturalTwo', relation: 'modify', hitMultiplier: 3, limit: 1, effects: [], rankAxis: { kind: 'multiplier', per: 1 } },
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
    // Toutes ses compétences, celles du kit et celles hors kit (`reserve`) : les mêmes contrôles (revue 0.110.0)
    const skills = [...d.events, ...(d.reserve ?? [])]
    for (const id of Object.keys(STATUSES) as (keyof typeof STATUSES)[])
      if (STATUSES[id].mechanic === 'form' && skills.some((e) => e.effects.some((x) => x.type === 'applyStatus' && x.status === id)))
        problems.push(`${at} ${id} est un statut de forme : seul le moteur le pose`)
    // Une même compétence peut être imprimée sur plusieurs faces (la Foudre du druide) : ses déclencheurs seuls diffèrent
    const seen = new Map<string, CharacterEvent>()
    for (const e of d.events) {
      const twin = seen.get(e.id)
      if (twin && JSON.stringify({ ...twin, trigger: '' }) !== JSON.stringify({ ...e, trigger: '' })) problems.push(`${at} compétence en double (${e.id})`)
      seen.set(e.id, e)
    }
    for (const e of skills) {
      if (e.effects.length === 0 && !e.hitMultiplier) problems.push(`${at} la compétence ${e.id} n'a aucun effet`)
      const onDie = isRollTrigger(e.trigger)
      if (e.relation && !onDie) problems.push(`${at} ${e.id}.relation : réservée aux compétences du dé`)
      // Le moteur doit savoir dès le jet si le coup part : une compétence qui remplace n'a pas de probabilité
      if (e.relation === 'replace' && e.chance !== undefined) problems.push(`${at} ${e.id} : une compétence qui remplace le coup, sans chance`)
      // Ni ce que vaut le coup : « ce coup ×N » modifie son coup, sans probabilité
      if (e.hitMultiplier !== undefined && (e.relation !== 'modify' || !onDie || e.chance !== undefined || !Number.isInteger(e.hitMultiplier) || e.hitMultiplier < 2))
        problems.push(`${at} ${e.id}.hitMultiplier : un entier ≥ 2, sur une compétence du dé qui modifie son coup, sans chance`)
      if (e.buildsUp && e.hitMultiplier === undefined) problems.push(`${at} ${e.id}.buildsUp : sur une compétence « ce coup ×N » seulement`)
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
        // Pourfendre (`fromHit`), Virulence (`fromStatus`) : leurs charges viennent du coup ou d'un statut, celles de la
        // définition s'y ajoutent (0 permis) ; Pourfendre, sur une compétence qui modifie son coup (elle part s'il touche)
        const amount = f.type === 'applyStatus' ? f.stacks + (f.fromHit === undefined && f.fromStatus === undefined ? 0 : 1) : f.type === 'cleanse' ? 1 : f.type === 'release' ? f.min : f.amount
        if (!Number.isInteger(amount) || amount < 1)
          problems.push(`${at} ${e.id} : effet ${f.type} sans valeur entière ≥ 1`)
        if (f.type === 'applyStatus' && f.fromHit !== undefined && (!(f.fromHit > 0 && f.fromHit <= 1) || e.relation !== 'modify' || !onDie))
          problems.push(`${at} ${e.id} : fromHit dans ]0, 1], sur une compétence du dé qui modifie son coup`)
        if (f.type === 'applyStatus' && f.fromStatus !== undefined && (!Number.isInteger(f.fromStatus.factor) || f.fromStatus.factor < 1))
          problems.push(`${at} ${e.id} : fromStatus, un facteur entier ≥ 1`)
        if (f.type === 'release' && f.share !== undefined && !(f.share > 0 && f.share <= 1)) problems.push(`${at} ${e.id} : share dans ]0, 1]`)
        if (f.type === 'applyStatus' && f.turns !== undefined && (!Number.isInteger(f.turns) || f.turns < 1))
          problems.push(`${at} ${e.id} : durée invalide`)
        if (f.type === 'applyStatus' && f.turns !== undefined && STATUSES[f.status].decays)
          problems.push(`${at} ${e.id} : ${f.status} s'estompe de lui-même, sans durée en tours`)
        if (f.type === 'applyStatus' && f.turns !== undefined && STATUSES[f.status].turnsFromStacks)
          problems.push(`${at} ${e.id} : ${f.status} dure autant de tours que de charges, sans durée en plus`)
      }
    }
    for (const e of d.reserve ?? []) if (seen.has(e.id)) problems.push(`${at} ${e.id} : à la fois dans le kit et hors kit`)
    // Axe de rang (E1, 0.110.0) : toute compétence du dé en déclare un, qui a prise sur elle et grandit sans plafond
    for (const e of skills) {
      const axis = e.rankAxis
      if (!isRollTrigger(e.trigger)) {
        if (axis) problems.push(`${at} ${e.id} : hors du dé, elle ne s'aiguise pas (pas d'axe de rang)`)
        continue
      }
      if (!axis) {
        problems.push(`${at} ${e.id} : compétence du dé sans axe de rang (rankAxis)`)
        continue
      }
      const posed = e.effects.find((x) => x.type === 'applyStatus')
      const grip: Record<RankAxis['kind'], boolean> = {
        // Des charges en plus : sur un statut sans plafond (au plafond, un rang ne gagnerait plus rien)
        stacks: posed !== undefined && STATUSES[posed.status].maxStacks === undefined,
        power: posed !== undefined && STATUSES[posed.status].power !== undefined,
        amount: e.effects.some((x) => x.type === 'damage' || x.type === 'heal' || (x.type === 'cleanse' && (x.orElse?.type === 'damage' || x.orElse?.type === 'heal'))),
        multiplier: e.hitMultiplier !== undefined,
        limit: e.limit !== undefined,
        share: e.effects.some((x) => x.type === 'release' && x.share !== undefined),
      }
      if (!grip[axis.kind]) problems.push(`${at} ${e.id} : axe de rang ${axis.kind} sans prise sur la compétence`)
      // Un gain entier par rang (0.111.0, retour de l'utilisateur : plus de demi-rang ni de chiffre à virgule) ; une part
      // se compte en points de pourcentage
      if (!Number.isInteger(axis.per) || axis.per < 1) problems.push(`${at} ${e.id} : axe de rang, un gain entier ≥ 1 par rang`)
    }
    // Répertoire (règles v2) : des compétences gravables d'autres personnages (de tout le roster), sans doublon
    const others = ENGRAVABLE_SKILLS.filter((e) => ![...d.events, ...(d.reserve ?? [])].some((own) => own.id === e.id)).map((e) => e.id)
    for (const id of d.repertoire ?? []) if (!others.includes(id)) problems.push(`${at} répertoire : ${id} n'est pas une compétence gravable d'un autre personnage`)
    if (new Set(d.repertoire).size !== (d.repertoire ?? []).length) problems.push(`${at} répertoire : doublon`)
    // La signature, une compétence du dé : sur la face 1 du personnage vanilla (0.113.0, le même dans tous les modes ; le
    // dé vanilla entier est figé par un test du roster, modules.test.ts)
    if (d.signature && !d.events.some((e) => e.id === d.signature && isRollTrigger(e.trigger))) problems.push(`${at} signature : ${d.signature} n'est pas une de ses compétences du dé`)
  }
  return problems
}
