import orcIdleImg from '../assets/orc-idle.png'
import orcAttackImg from '../assets/orc-attack.png'
import orcDodgeImg from '../assets/orc-dodge.png'
import orcKoImg from '../assets/orc-ko.png'
import orcVictoryImg from '../assets/orc-victory.png'
import orcHurtImg from '../assets/orc-hurt.png'
import orcDazedAImg from '../assets/orc-dazed-a.png'
import orcDazedBImg from '../assets/orc-dazed-b.png'
import orcCastImg from '../assets/orc-cast.png'
import elfIdleImg from '../assets/elf-idle.png'
import elfAttackImg from '../assets/elf-attack.png'
import elfDodgeImg from '../assets/elf-dodge.png'
import elfHurtImg from '../assets/elf-hurt.png'
import elfKoImg from '../assets/elf-ko.png'
import elfVictoryImg from '../assets/elf-victory.png'
import elfDazedAImg from '../assets/elf-dazed-a.png'
import elfDazedBImg from '../assets/elf-dazed-b.png'
import elfCastImg from '../assets/elf-cast.png'
import dwarfIdleImg from '../assets/dwarf-idle.png'
import dwarfAttackImg from '../assets/dwarf-attack.png'
import dwarfDodgeImg from '../assets/dwarf-dodge.png'
import dwarfHurtImg from '../assets/dwarf-hurt.png'
import dwarfKoImg from '../assets/dwarf-ko.png'
import dwarfVictoryImg from '../assets/dwarf-victory.png'
import dwarfDazedAImg from '../assets/dwarf-dazed-a.png'
import dwarfDazedBImg from '../assets/dwarf-dazed-b.png'
import dwarfCastImg from '../assets/dwarf-cast.png'
import undeadIdleImg from '../assets/undead-idle.png'
import undeadAttackImg from '../assets/undead-attack.png'
import undeadDodgeImg from '../assets/undead-dodge.png'
import undeadHurtImg from '../assets/undead-hurt.png'
import undeadKoImg from '../assets/undead-ko.png'
import undeadVictoryImg from '../assets/undead-victory.png'
import undeadDazedAImg from '../assets/undead-dazed-a.png'
import undeadDazedBImg from '../assets/undead-dazed-b.png'
import undeadCastImg from '../assets/undead-cast.png'
import humanIdleImg from '../assets/human-idle.png'
import humanAttackImg from '../assets/human-attack.png'
import humanDodgeImg from '../assets/human-dodge.png'
import humanHurtImg from '../assets/human-hurt.png'
import humanKoImg from '../assets/human-ko.png'
import humanVictoryImg from '../assets/human-victory.png'
import humanDazedAImg from '../assets/human-dazed-a.png'
import humanDazedBImg from '../assets/human-dazed-b.png'
import humanCastImg from '../assets/human-cast.png'
import lizardIdleImg from '../assets/lizardman-idle.png'
import lizardAttackImg from '../assets/lizardman-attack.png'
import lizardDodgeImg from '../assets/lizardman-dodge.png'
import lizardHurtImg from '../assets/lizardman-hurt.png'
import lizardKoImg from '../assets/lizardman-ko.png'
import lizardVictoryImg from '../assets/lizardman-victory.png'
import lizardDazedAImg from '../assets/lizardman-dazed-a.png'
import lizardDazedBImg from '../assets/lizardman-dazed-b.png'
import lizardCastImg from '../assets/lizardman-cast.png'
import paladinIdleImg from '../assets/paladin-idle.png'
import paladinAttackImg from '../assets/paladin-attack.png'
import paladinDodgeImg from '../assets/paladin-dodge.png'
import paladinHurtImg from '../assets/paladin-hurt.png'
import paladinKoImg from '../assets/paladin-ko.png'
import paladinVictoryImg from '../assets/paladin-victory.png'
import paladinDazedAImg from '../assets/paladin-dazed-a.png'
import paladinDazedBImg from '../assets/paladin-dazed-b.png'
import paladinCastImg from '../assets/paladin-cast.png'
import ogreIdleImg from '../assets/ogre-idle.png'
import ogreAttackImg from '../assets/ogre-attack.png'
import ogreDodgeImg from '../assets/ogre-dodge.png'
import ogreHurtImg from '../assets/ogre-hurt.png'
import ogreKoImg from '../assets/ogre-ko.png'
import ogreVictoryImg from '../assets/ogre-victory.png'
import ogreDazedAImg from '../assets/ogre-dazed-a.png'
import ogreDazedBImg from '../assets/ogre-dazed-b.png'
import ogreCastImg from '../assets/ogre-cast.png'
import druidIdleImg from '../assets/druid-idle.png'
import druidAttackImg from '../assets/druid-attack.png'
import druidDodgeImg from '../assets/druid-dodge.png'
import druidHurtImg from '../assets/druid-hurt.png'
import druidKoImg from '../assets/druid-ko.png'
import druidVictoryImg from '../assets/druid-victory.png'
import druidDazedAImg from '../assets/druid-dazed-a.png'
import druidDazedBImg from '../assets/druid-dazed-b.png'
import druidCastImg from '../assets/druid-cast.png'
import bearIdleImg from '../assets/druid-bear-idle.png'
import bearAttackImg from '../assets/druid-bear-attack.png'
import bearDodgeImg from '../assets/druid-bear-dodge.png'
import bearHurtImg from '../assets/druid-bear-hurt.png'
import bearKoImg from '../assets/druid-bear-ko.png'
import bearVictoryImg from '../assets/druid-bear-victory.png'
import bearDazedAImg from '../assets/druid-bear-dazed-a.png'
import bearDazedBImg from '../assets/druid-bear-dazed-b.png'
import bearCastImg from '../assets/druid-bear-cast.png'
import bardIdleImg from '../assets/bard-idle.png'
import bardAttackImg from '../assets/bard-attack.png'
import bardDodgeImg from '../assets/bard-dodge.png'
import bardHurtImg from '../assets/bard-hurt.png'
import bardKoImg from '../assets/bard-ko.png'
import bardVictoryImg from '../assets/bard-victory.png'
import bardDazedAImg from '../assets/bard-dazed-a.png'
import bardDazedBImg from '../assets/bard-dazed-b.png'
import bardCastImg from '../assets/bard-cast.png'
import { Character, type CharacterDef } from './character'
import { faceTrigger, isRollTrigger, rollFace, type CharacterEvent, type RankAxis } from './events'
import { isEngravable } from './forge'
import { auraServed, characterPool, masteryOfSkill } from './masteries'
import { MASTERY_SKILLS, skillById } from './skills'
import { auraOfSkill } from './states'
import { STATUSES } from './statuses'

/**
 * Le dé de départ d'un personnage (Maîtrises, docs/MAITRISES.md § 5.1) : son aura de départ sur le 1, sa compétence de
 * personnage (signature) sur le 2, quatre faces nues. `form` : les sorts du druide, sous sa forme humaine.
 */
function startDie(aura: string, signature?: string, form?: string): CharacterEvent[] {
  return [aura, signature].flatMap((id, k) => (id ? [{ ...skillById(id), trigger: faceTrigger(k + 1), ...(form && { form }) }] : []))
}

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
  // Passe d'équilibre du 2026-10-31 : critique 14 → 16 % (ses deux auras vivent du critique) : départs Ivresse 42,6 → 46,7 %,
  // Élan 40,8 → 43,5 % (sous 42 avant) ; Morgrut Cuir épais contre lui 65,8 → 60,0 % (400 par duel) ; construit 48,8 → 52,1
  stats: { maxHp: 57, attackMin: 5, attackMax: 6, armor: 0, dodgeChance: 0.05, critChance: 0.16, critMultiplier: 2 },
  // Premier personnage à postures (0.40.0, docs/POSTURES.md). La toile commune est plus haute que la garde
  // seule (la garde en occupe 84 %, avec 13 % de vide au-dessus de la tête) : scale 1,18 pour sa taille 1,08.
  look: {
    image: orcIdleImg,
    poses: { attack: orcAttackImg, dodge: orcDodgeImg, hurt: orcHurtImg, ko: orcKoImg, victory: orcVictoryImg, dazed: [orcDazedAImg, orcDazedBImg], cast: orcCastImg },
    poseRoom: { cast: 0.147 },
    facing: 'right',
    scale: 1.18,
    headroom: 0.13,
    portrait: { x: 49, y: 8, zoom: 3 },
  },
  lore: {
    tagline: 'Le roc des fosses de Kar-Dush.',
    background:
      "Sept saisons invaincu dans les fosses de combat de Kar-Dush. Gorak frappe sans finesse mais encaisse tout, et l'on dit qu'un coup manqué ne fait que l'énerver davantage.",
    strengths: ['Furie des vents : deux coups tout de suite', 'Critiques fréquents pour un orc (16 %)', "Aura d'ivresse : chaque critique, deux coups de plus"],
    weaknesses: ["N'esquive presque jamais", 'Aucune armure', 'Brutal mais prévisible'],
  },
  // Maîtrises (retour du 2026-10-27, docs/MAITRISES.md § 5 et § 7) : sur le 1, son aura de départ (l'Ivresse du sang par
  // défaut), sur le 2 sa signature, la Furie des vents ; Pourfendre quitte son dé pour la réserve du Sang
  masteries: ['fury', 'blood'],
  auras: ['blood-frenzy', 'onrush'],
  signature: 'wind-fury',
  events: startDie('blood-frenzy', 'wind-fury'),
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
  // Maîtrises, réglage de la vague 2 (2026-10-27, docs/MAITRISES.md § 8, P6) : critique ×2,4 → ×2,2 et 15 → 17 % (plus
  // souvent, moins lourd). Ses critiques assurés (Feinte, Œil de faucon) font de la Contrepoids de plomb et de la Plume
  // d'aigle ses meilleures reliques : construite 60,6 → 57,7 % (`npm run ramp`), vanilla 51,9 → 47,0 % (400 par duel)
  // Troisième retour du 2026-10-27 (C5) : esquive 22 → 24 % (vanilla 44,8 → 48,2 %, pire duel Ysolde contre elle 64,8 →
  // 61,5 % ; 400 combats par duel). Mesures : docs/PERSONNAGES.md, Elaria
  // Retour du 30 octobre (D12) : critique 17 → 15 % (vanilla 55,1 → 52,8 % au laboratoire, pire duel Gorak 62,3 → 61,3)
  stats: { maxHp: 53, attackMin: 4, attackMax: 5, armor: 0, dodgeChance: 0.24, critChance: 0.15, critMultiplier: 2.2 },
  // Postures (atelier des postures, 2026-10-20). L'arc dépasse de la tête : la taille se règle sur le
  // corps (capuche-pieds, 77 % de la toile), le reste compte dans `headroom` (comme Aldric et Ysolde)
  look: {
    image: elfIdleImg,
    poses: { attack: elfAttackImg, dodge: elfDodgeImg, hurt: elfHurtImg, ko: elfKoImg, victory: elfVictoryImg, dazed: [elfDazedAImg, elfDazedBImg], cast: elfCastImg },
    poseRoom: { cast: 0.088 },
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
    strengths: ['Meilleure esquive (24 %)', 'Critiques fréquents (15 %, ×2,2)', 'Œil de faucon : son 2 est critique'],
    weaknesses: ['PV modestes (53)', 'Attaque légère', "Peine face aux boucliers et à l'intimidation"],
  },
  // Maîtrises : la Feinte sur le 1 par défaut, l'Œil de faucon sur le 2 ; l'Esquive améliorée quitte son dé pour la réserve.
  // Second retour du 2026-10-27 (B2) : la Chasse fondue dans la Chance, ses deux écoles sont la Chance et le Sang
  masteries: ['chance', 'blood'],
  auras: ['feint', 'open-wound'],
  signature: 'hawk-eye',
  events: startDie('feint', 'hawk-eye'),
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
    poses: { attack: dwarfAttackImg, dodge: dwarfDodgeImg, hurt: dwarfHurtImg, ko: dwarfKoImg, victory: dwarfVictoryImg, dazed: [dwarfDazedAImg, dwarfDazedBImg], cast: dwarfCastImg },
    poseRoom: { cast: 0.149 },
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
    strengths: ['Attaque lourde', 'Peau de pierre : son armure frappe aussi', 'Critiques lourds (×2,2)'],
    weaknesses: ['Critiques peu fréquents (10 %)', 'Esquive faible', 'Lent à prendre l’avantage'],
  },
  // Maîtrises : le Rempart et le Sang (Q1) ; l'Aura d'épines sur le 1 par défaut, la Peau de pierre (et son Poing) sur le 2
  masteries: ['bulwark', 'blood'],
  auras: ['thorns', 'bastion'],
  signature: 'stoneskin',
  events: startDie('thorns', 'stoneskin'),
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
  // Troisième retour du 2026-10-27 (C5) : critique 24 → 28 % (vanilla 44,1 → 46,7 %, construit 43,1 → 45,0 % ; ses
  // auras de départ au critique, Effroi et Pourriture, restent sous 58 %)
  stats: { maxHp: 56, attackMin: 4, attackMax: 6, armor: 0, dodgeChance: 0.08, critChance: 0.28, critMultiplier: 2 },
  // Postures (atelier des postures, 2026-10-20) : la garde occupe 83,4 % de la toile ; la même hauteur
  // à l'écran qu'avant (0,98 × 0,99 de l'ancienne image) donne scale 0,97 / 0,834 = 1,16
  look: {
    image: undeadIdleImg,
    poses: { attack: undeadAttackImg, dodge: undeadDodgeImg, hurt: undeadHurtImg, ko: undeadKoImg, victory: undeadVictoryImg, dazed: [undeadDazedAImg, undeadDazedBImg], cast: undeadCastImg },
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
    strengths: ['Vol de vie : son coup le soigne', 'Aura de poison : Poison 2 à chaque tour', 'Critiques fréquents (28 %)'],
    weaknesses: ["N'esquive presque jamais", 'Aucune armure', 'Dégâts lents à venir'],
  },
  // Maîtrises : dé inchangé, l'Aura de poison sur le 1 par défaut, le Vol de vie sur le 2
  masteries: ['poison', 'shadow'],
  auras: ['frost-aura', 'dread'],
  signature: 'life-steal',
  events: startDie('frost-aura', 'life-steal'),
}

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
    poses: { attack: humanAttackImg, dodge: humanDodgeImg, hurt: humanHurtImg, ko: humanKoImg, victory: humanVictoryImg, dazed: [humanDazedAImg, humanDazedBImg], cast: humanCastImg },
    poseRoom: { cast: 0.124 },
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
  // Maîtrises : dé inchangé, l'Aura de sainteté sur le 1 par défaut, la Purification sur le 2
  masteries: ['light', 'magic'],
  auras: ['holy-aura', 'judgement'],
  signature: 'purification',
  events: startDie('holy-aura', 'purification'),
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
    poses: { attack: lizardAttackImg, dodge: lizardDodgeImg, hurt: lizardHurtImg, ko: lizardKoImg, victory: lizardVictoryImg, dazed: [lizardDazedAImg, lizardDazedBImg], cast: lizardCastImg },
    poseRoom: { cast: 0.043 },
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
  // Maîtrises : dé inchangé, l'Aura de décoction sur le 1 par défaut (sa signature de la 0.107.0), Pile ou face sur le 2
  masteries: ['chance', 'poison'],
  auras: ['decoction-aura', 'loaded-die'],
  signature: 'coin-flip',
  events: startDie('decoction-aura', 'coin-flip'),
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
  // Maîtrises (docs/MAITRISES.md § 5.2) : la Riposte quitte son dé ; sans compensation, chaque aura de départ le laissait de
  // 41 à 45 %. Attaque 4 à 6 → 5 à 6, PV intacts : de 51 à 56 % selon l'aura (série 72 du laboratoire)
  // Mesure d'ensemble de la refonte des auras (tranche 8) : la Riposte pose une charge au lieu de deux (gravée +23,0 →
  // +17,0) ; sans compensation, Vindicte 39,6 %, Larcin 44,4 ; attaque 5 à 6 → 5 à 7 : 46,8 et 52,2 (400 par duel).
  // Écartés : 6 à 7 (53,9 et 60,2), critique 25 % (49,6 et 54,3), Vindicte +8 ou +10 Ferveur (41,8 et 43,6)
  stats: { maxHp: 54, attackMin: 5, attackMax: 7, armor: 0, dodgeChance: 0.07, critChance: 0.17, critMultiplier: 2.5 },
  // Nouveau modèle et postures (atelier des postures, 2026-10-20) : épée basse, plus rien au-dessus de la
  // tête que la hampe de la bannière. La taille se règle sur le corps (tête-pieds, 77 % de la toile) et non
  // sur la hampe : le vide et la bannière au-dessus de la tête comptent dans `headroom`
  look: {
    image: paladinIdleImg,
    poses: { attack: paladinAttackImg, dodge: paladinDodgeImg, hurt: paladinHurtImg, ko: paladinKoImg, victory: paladinVictoryImg, dazed: [paladinDazedAImg, paladinDazedBImg], cast: paladinCastImg },
    poseRoom: { cast: 0.154 },
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
    strengths: ['Riposte : rend le coup reçu, entier', 'Critiques fréquents et lourds (17 %, ×2,5)', 'Aura de vindicte : chaque renvoi nourrit son coup'],
    weaknesses: ['Esquive faible (7 %)', 'Riposte dérisoire si on ne l’a pas frappé', 'Aucune armure'],
  },
  // Maîtrises : la Vindicte sur le 1 par défaut. Refonte des auras (2026-10-28, Q6, docs/REFONTE_AURAS.md § 5.6) : la
  // Riposte, entière, sur le 2 ; la Rétribution passe dans la réserve du Rempart
  masteries: ['bulwark', 'shadow'],
  auras: ['vendetta', 'pilfer'],
  signature: 'riposte',
  events: startDie('vendetta', 'riposte'),
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
  // Maîtrises (Q2, défaut adopté) : une aura sur le 1 comme tout le monde, l'Aura de puissance, et sa face 2 nue. Attaque
  // 7 à 9 → 6 à 8 : avec la Puissance à 7 à 9, il passait 65,1 % (série 73)
  // Troisième retour du 2026-10-27 (C5, demande de l'utilisateur) : une compétence sur le 2, prise dans ses maîtrises, le
  // Crescendo (Fureur) : « Taper. Taper encore. Taper plus fort. », ce coup ×2, puis ×3, ×4 à chaque fois. Des six
  // candidates mesurées, la meilleure montée construite (33,1 → 50,1 % à 10 récompenses, sans compensation) ; sa force
  // nue (69,4 %) se compense par l'attaque, 6 à 8 → 5 à 7 (PV intacts). Mesures : docs/PERSONNAGES.md, Morgrut
  // Quatrième demande du 2026-10-27 (« il ne fait presque rien, mais ses coups sont plus forts ») : quatre faces de
  // compétence au plus (`skillFaces`, cinq pour les autres), la plus lourde attaque du roster, 5 à 7 → 6 à 8, et 59 → 52 PV,
  // le seul levier qui baisse sa force nue plus que sa force construite (les +2 PV par récompense pèsent plus sur peu de
  // PV). Vanilla 54,8 → 55,3 ; départs 41,9-54,8 → 44,3-55,3 ; construit 40,5 → 43,9 (face 2 nue : 41 au mieux, pour
  // 66 % nu). Mesures : docs/PERSONNAGES.md, « La quatrième demande »
  stats: { maxHp: 52, attackMin: 6, attackMax: 8, armor: 0, dodgeChance: 0, critChance: 0, critMultiplier: 2 },
  // Postures (atelier des postures, 2026-10-20). La garde (casque compris) occupe 70,3 % de la toile, que
  // la massue levée de la victoire rend haute : même taille à l'écran qu'avant (1,13 d'un humain). La
  // massue du coup encaissé et du K.O. descend sous les pieds
  look: {
    image: ogreIdleImg,
    poses: { attack: ogreAttackImg, dodge: ogreDodgeImg, hurt: ogreHurtImg, ko: ogreKoImg, victory: ogreVictoryImg, dazed: [ogreDazedAImg, ogreDazedBImg], cast: ogreCastImg },
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
    strengths: ['La plus lourde attaque (6 à 8)', 'Assaut : ce coup ×2'],
    weaknesses: ['Quatre faces de compétence au plus', 'Ni esquive ni critique', 'Aucune armure ni soin'],
  },
  // Maîtrises : la Fureur et le Rempart ; l'Aura de puissance sur le 1 par défaut. Refonte des auras (2026-10-28, Q7,
  // docs/REFONTE_AURAS.md § 5.7) : l'Assaut sur le 2 (il tape, plus fort), le Crescendo retourne dans la réserve de la
  // Fureur ; deux gravures au plus ensuite (quatrième demande). Décision D19 (2026-10-30) : sa seconde aura, le Cuir épais
  // (Rempart, celle qui tient) au lieu de la Rancœur (qui disait comme la Puissance « il frappe plus fort »)
  masteries: ['fury', 'bulwark'],
  auras: ['power-aura', 'thick-hide'],
  signature: 'assault',
  skillFaces: 4,
  events: startDie('power-aura', 'assault'),
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
  // Mesure d'ensemble de la refonte des auras (tranche 8) : construit à 10 récompenses, 40,9 % (`npm run ramp`, pente
  // −13 points) ; critique 8 → 15 % (400 par duel) : départs Ciel d'orage 51,5 → 57,0 %, Brasier 47,0 → 53,0. Écartés :
  // attaque 5 à 7 (Ciel 59,2), 6 à 7 (66,4)
  stats: { maxHp: 56, attackMin: 5, attackMax: 6, armor: 0, dodgeChance: 0.08, critChance: 0.15, critMultiplier: 2 },
  // Postures (atelier des postures, 2026-10-20). La garde (bâton et bois compris) occupe 83,9 % de la toile,
  // que le bâton levé de la victoire rend haute : même taille à l'écran qu'avant (1,00 d'un humain)
  look: {
    image: druidIdleImg,
    poses: { attack: druidAttackImg, dodge: druidDodgeImg, hurt: druidHurtImg, ko: druidKoImg, victory: druidVictoryImg, dazed: [druidDazedAImg, druidDazedBImg], cast: druidCastImg },
    poseRoom: { cast: 0.08 },
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
        poses: { attack: bearAttackImg, dodge: bearDodgeImg, hurt: bearHurtImg, ko: bearKoImg, victory: bearVictoryImg, dazed: [bearDazedAImg, bearDazedBImg], cast: bearCastImg },
        poseRoom: { cast: 0.113 },
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
    strengths: ['Feux follets : une Brûlure qui dure', 'L’ours frappe fort (+3)', "Aura d'orage : trois éclairs tous les trois tours"],
    weaknesses: ['Aucun soin ni armure', 'Ses sorts, sous forme d’homme seulement', 'Forme imposée à chaque tour'],
  },
  // 0.73.0 (SORTS.md § 18, choix de l'utilisateur) : l'homme lance des sorts, l'ours frappe. Phase 5 bis : l'homme frappe
  // aussi, d'un petit coup de base. Remplace Fleur de vie, Écorce épaisse, Charge, Coup de griffe et ses deux auras.
  // Maîtrises : le Ciel d'orage sur le 1 par défaut, les Feux follets sur le 2 (sa signature, décision de l'utilisateur du
  // 2026-10-24), sous forme humaine ; la Foudre quitte son dé pour la réserve. L'Orage est la Magie depuis B1. Décision D21
  // (2026-10-30) : la Fureur au lieu du Poison (l'homme appelle l'orage, l'ours frappe) ; le Brasier reste sa seconde aura
  masteries: ['magic', 'fury'],
  auras: ['storm-sky', 'brasier'],
  signature: 'firefly',
  events: startDie('storm-sky', 'firefly', 'human'),
}

/*
 * Barde (0.41.0, concept d'un ami de l'utilisateur). Équilibrage (0.41.0, choix de l'utilisateur après mesure) : appliqué
 * à la lettre, le concept gagnait 45 % mais perdait 87/13 contre Brokk, 78/22 contre Grimbald, 71/29 contre Ervald :
 * l'intimidation, les épines et l'armure rognent chacun de ses petits coups. D'où l'Ouverture (Aura mélodieuse dès le
 * début, en dégâts finaux, après l'armure), et un gros coup qui multiplie un seul coup de base.
 * Phase 5 ter (2026-10-24, décision de l'utilisateur) : ses compétences passent sur les faces 1 et 2, comme les autres.
 * Le Duo (2026-10-25, piste D validée par l'utilisateur) : un seul d6, comme tout le monde. Son second dé vit dans sa
 * signature : sur le 1, deux dés à sa prochaine action. Chaque gravure et chaque rang comptait sur ses deux dés (gravures
 * +17 en moyenne). Retour de l'utilisateur du 2026-10-27 (P7) : l'Aura mélodieuse quitte le jeu, Ouverture comprise (elle
 * partait dès l'entrée en scène, sans face ni compétence visible) ; le Duo ne pose plus que le Duo. Kit et mesures :
 * docs/PERSONNAGES.md.
 */
const fanchon: CharacterDef = {
  id: 'fanchon',
  name: 'Fanchon',
  race: 'Humain',
  archetype: 'Saltimbanque',
  // Esquive de 12 à 6 % (0.46.0), puis 10 % : compensation de Siffloter et de la Fausse note, qui frappent désormais.
  // Le Duo (2026-10-25) : attaque 1 à 3 → 4 à 6, critique 10 → 5 % (un dé au lieu de deux ; PV intacts).
  // Un dé de plus ne donne plus de dé de plus, au plus 3 par action (retour du 2026-10-28, A7) : le Duo ne s'enchaîne plus
  // (Fanchon 46,9 → 36,8 %, 400 par duel) ; attaque 4 à 6 → 5 à 7, le levier essayé le plus juste (51,4 % ; construite
  // 47,0 → 57,2 %, contre 72,7 avec la chaîne). Écartés : critique 20 % (46,9), esquive 18 % (44,2), PV 54 (49,7),
  // Ballade à 2 PV (56,1, mais Ervald 65,3 contre elle).
  // Le Duo à une charge (retour du 2026-10-28, A11) : Fanchon 51,4 → 25,9 % ; attaque 5 à 7 → 6 à 7, esquive 10 → 15 %,
  // critique 5 → 15 % (50,7 %, 400 par duel ; l'attaque reste sous les 8 de Morgrut, la plus lourde du roster). Essayés :
  // 6 à 7 seule (33,9), 7 (42,8), 6 à 7 et critique 20 % (49,7), 6 à 7 et esquive 25 % (54,3), 6 à 8 et critique 15 % (52,6)
  // Refonte des auras (2026-10-28, Q8) : le Duo, trois coups bruts de plus tout de suite ; à 6 à 7, Ballade 73,9 %, Veine
  // 72,9 %. Attaque 6 à 7 → 4 à 6 (400 par duel) : Ballade 58,1, Veine 51,5, duels de 39 à 63 % ; écartés : 5 à 6 (63,9 et
  // 61,7), 5 à 7 (69,4 et 68,7), 4 à 5 (50,3 et 40,7), 3 à 6 (50,2 et 41,1). Mesures : docs/PERSONNAGES.md, Fanchon
  // Mesure d'ensemble (tranche 8) : le Duo, un coup de plus au lieu de trois (gravé chez les autres +29,4 → +16,2) ; à 4 à
  // 6 : Ballade 29,9 %, Veine 31,2. Attaque 5 à 7 et esquive 15 → 18 % (400 par duel) : 51,6 et 53,1, duels de 39 à 60 % ;
  // à 20 % : 53,3 et 54,3, mais construite 60,0 % (`npm run ramp`). Écartés : 5 à 7 seule (47,5 et 49,4 ; Elaria 66 contre
  // elle), esquive 16 % (Elaria 65), 5 à 7 et critique 20 % (51,9 et 53,0 ; Ysolde 63), 5 à 6 et esquive 20 % (45,1 et
  // 46,4), 6 à 7 (55,5 et 57,2 ; Ysolde et Ervald 65). Toujours sous les 6 à 8 de Morgrut
  stats: { maxHp: 46, attackMin: 5, attackMax: 7, armor: 0, dodgeChance: 0.18, critChance: 0.15, critMultiplier: 2 },
  // Postures (session images, 0.41.0) : la garde occupe 94,7 % de la toile ; scale = 1,00 × 0,92 / 0,947
  look: {
    image: bardIdleImg,
    poses: { attack: bardAttackImg, dodge: bardDodgeImg, hurt: bardHurtImg, ko: bardKoImg, victory: bardVictoryImg, dazed: [bardDazedAImg, bardDazedBImg], cast: bardCastImg },
    poseRoom: { cast: 0.227 },
    facing: 'right',
    scale: 0.97,
    headroom: 0.03,
    // Toile large (fente de l'attaque) : la garde n'en occupe que la moitié centrale (pixels 242 à 750 sur 992)
    bodyInset: { left: 0.244, right: 0.244 },
    portrait: { x: 60, y: 5, zoom: 3.2 },
  },
  lore: {
    tagline: 'Une chanson, deux coups, aucune fausse note. Sauf chez vous.',
    background:
      "Fanchon a appris l'escrime entre deux couplets, sur les tréteaux des foires. Quand la foule reprend le refrain, elle frappe deux fois d'affilée ; sa chanson porte ses coups, et son solo les fait trembler.",
    strengths: ['Écho : un coup de plus, tout de suite', 'Aura de ballade : un refrain toutes les quatre touches', 'Esquive (18 %) et critique (15 %)'],
    weaknesses: ['Peu de PV (46)', 'Aucune armure', 'Gros coups rares'],
  },
  // Maîtrises (P7) : la Ballade sur le 1 par défaut, le Duo sur le 2 (son identité) ; le Soliste quitte son dé pour la
  // réserve. Ses stats ne bougent pas : Ballade / Duo 50,4 % (série 70). Second retour du 2026-10-27 (B2) : le Chant fondu,
  // ses sorts (Ballade, Duo) à la Magie, ses gros coups à la Fureur ; ses deux écoles sont la Magie et la Chance
  masteries: ['magic', 'chance'],
  auras: ['ballad', 'lucky-streak'],
  signature: 'duo',
  events: startDie('ballad', 'duo'),
}

/** Personnages disponibles, un par famille, dans l'ordre d'affichage. Pour en ajouter un : une entrée ici. */
export const ROSTER: readonly CharacterDef[] = [gorak, elaria, brokk, ervald, ysolde, naraxes, aldric, morgrut, thaldrin, fanchon]

/** Les personnages instanciés une fois pour toutes (ils sont immuables). */
export const CHARACTERS: readonly Character[] = ROSTER.map((def) => new Character(def))

export const CHARACTER_IDS: readonly string[] = CHARACTERS.map((c) => c.id)

/**
 * Toutes les compétences du jeu, une fois chacune : le catalogue des maîtrises (skills.ts), dans l'ordre du compendium.
 */
export const ALL_SKILLS: readonly CharacterEvent[] = Object.values(MASTERY_SKILLS).flat()

/**
 * Les compétences qu'on peut graver sur un dé forgé (forge.ts, Graver) : celles du catalogue qui se posent sur une face,
 * avec un effet. La campagne en tire dans la réserve des maîtrises du champion (`characterPool`).
 */
export const ENGRAVABLE_SKILLS: readonly CharacterEvent[] = ALL_SKILLS.filter(isEngravable)

/**
 * Un personnage du roster. Son dé vanilla porte la première de ses deux auras ; `aura` y pose l'autre (le choix du départ
 * de campagne, le tirage du tournoi et de la saison) : une aura hors de ses `auras` est une erreur.
 */
export function createCharacter(id: string, options: { aura?: string } = {}): Character {
  const character = CHARACTERS.find((c) => c.id === id)
  if (!character) throw new Error(`Personnage inconnu : ${id}`)
  return options.aura === undefined || options.aura === character.definition.auras?.[0] ? character : character.withStartAura(options.aura)
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
    // Toutes ses compétences, celles de son dé et celles de sa réserve (ses deux maîtrises) : les mêmes contrôles (revue
    // 0.110.0) ; chaque brique du catalogue appartient à la réserve d'au moins un personnage
    const skills = [...d.events, ...characterPool(d)]
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
        // définition s'y ajoutent (0 permis) ; Pourfendre, sur une compétence qui modifie son coup (elle part s'il touche).
        // Onde de choc (`release.per`) : sa valeur est le montant par jauge. Un soin ou des dégâts lus sur un statut
        // (`fromStatus`, Sangsue, 2026-10-27) : leur montant s'y ajoute (0 permis)
        const read = f.type === 'applyStatus' || f.type === 'heal' || f.type === 'damage' ? f.fromStatus : undefined
        const amount =
          f.type === 'applyStatus'
            ? f.stacks + (f.fromHit === undefined && read === undefined ? 0 : 1)
            : f.type === 'cleanse'
              ? 1
              : f.type === 'release'
                ? (f.per ?? f.min)
                : f.amount + (read === undefined ? 0 : 1)
        if (!Number.isInteger(amount) || amount < 1)
          problems.push(`${at} ${e.id} : effet ${f.type} sans valeur entière ≥ 1`)
        if (f.type === 'applyStatus' && f.fromHit !== undefined && (!(f.fromHit > 0 && f.fromHit <= 1) || e.relation !== 'modify' || !onDie))
          problems.push(`${at} ${e.id} : fromHit dans ]0, 1], sur une compétence du dé qui modifie son coup`)
        if (read !== undefined && (!Number.isInteger(read.factor) || read.factor < 1))
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
        amount: e.effects.some((x) => x.type === 'damage' || x.type === 'heal' || (x.type === 'release' && x.per !== undefined) || (x.type === 'cleanse' && (x.orElse?.type === 'damage' || x.orElse?.type === 'heal'))),
        multiplier: e.hitMultiplier !== undefined,
        limit: e.limit !== undefined,
        share: e.effects.some((x) => x.type === 'release' && x.share !== undefined),
      }
      if (!grip[axis.kind]) problems.push(`${at} ${e.id} : axe de rang ${axis.kind} sans prise sur la compétence`)
      // Un gain entier par rang (0.111.0, retour de l'utilisateur : plus de demi-rang ni de chiffre à virgule) ; une part
      // se compte en points de pourcentage
      if (!Number.isInteger(axis.per) || axis.per < 1) problems.push(`${at} ${e.id} : axe de rang, un gain entier ≥ 1 par rang`)
    }
    // Refonte des auras (docs/REFONTE_AURAS.md § 3, règle 1) : deux auras sur sa fiche, distinctes, chacune une aura d'une
    // de ses maîtrises, servie par son dé de départ (le producteur d'abord) ; la première sur le 1 du dé vanilla. La
    // signature est sur le 2 et appartient à une de ses maîtrises
    const onFace = (face: number) => d.events.filter((e) => rollFace(e.trigger) === face).map((e) => e.id)
    const auras: readonly string[] = d.auras ?? []
    if (auras.length !== 2) problems.push(`${at} deux auras attendues sur sa fiche`)
    if (new Set(auras).size !== auras.length) problems.push(`${at} aura en double`)
    if (auras.length > 0 && onFace(1).join() !== auras[0]) problems.push(`${at} le 1 du dé vanilla porte ${onFace(1).join() || 'rien'}, pas ${auras[0]}`)
    for (const id of auras) {
      const m = masteryOfSkill(id)
      if (!m || !d.masteries.includes(m)) problems.push(`${at} aura ${id} hors de ses maîtrises`)
      else if (!auraOfSkill(skillById(id))) problems.push(`${at} aura ${id} : pas une aura`)
      else if (!auraServed(d, id)) problems.push(`${at} aura ${id} : son dé de départ ne la sert pas (le producteur d'abord)`)
    }
    if (d.signature && onFace(2).join() !== d.signature) problems.push(`${at} signature : ${d.signature} n'est pas sur le 2`)
    if (!d.signature && onFace(2).length > 0) problems.push(`${at} une compétence sur le 2 sans signature`)
    if (d.events.some((e) => (rollFace(e.trigger) ?? 0) > 2)) problems.push(`${at} les faces 3 à 6 du dé vanilla sont nues`)
  }
  return problems
}
