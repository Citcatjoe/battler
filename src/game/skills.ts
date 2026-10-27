/*
 * Le catalogue des compétences (Maîtrises, docs/MAITRISES.md § 11.1) : chaque définition une fois, rangée dans sa maîtrise
 * (une brique, une maîtrise). Le roster pose les faces de chaque dé par id (`skillById`) ; la réserve d'une maîtrise en
 * dérive (masteries.ts). Hors d'un dé, le déclencheur d'une définition ne sert qu'à son texte : une face (le dé d'un
 * personnage, une gravure) le remplace par le sien.
 */
import type { CharacterEvent } from './events'
import type { MasteryId } from './masteries'
import { SHOCKWAVE_PER } from './statuses'

/**
 * Foudre du druide (0.76.0, demande de l'utilisateur) : des éclairs de dégâts directs, jamais critiques. 2 chacun
 * jusqu'à la 0.105.0 ; 1 depuis la 0.106.0 (phase 5 bis) : la Foudre se greffe sur son coup de base. Trois éclairs jusqu'à
 * la revue des compétences (O3, docs/REVUE_COMPETENCES.md), quatre depuis : la plus faible brique de kit du jeu.
 */
const THUNDERBOLT = 1
const THUNDERBOLT_HITS = 4

/** Dégâts directs de la Purification quand il n'y a aucun bonus à retirer (0.42.0 ; 6 en 0.115.1 ; 8 depuis les Maîtrises). */
const PURIFICATION_LIGHT = 8

/** Dégâts directs de la Purification quand elle retire un bonus (2026-10-27, avec l'aura de départ au 3e tour, AURAS.md § 2.4). */
const PURIFICATION_STRIP = 5

/**
 * Les compétences de chaque maîtrise : ses auras d'abord, puis ses compétences, dans l'ordre du compendium. Second retour
 * du 2026-10-27 (B1) : onze → huit maîtrises, aucune compétence nouvelle. La Chasse (finesse : critiques et esquives)
 * passe à la Chance, l'Aura de précision à la Fureur ; les Représailles (rendre les coups) au Rempart, Dette de sang
 * comprise (une consommatrice reste avec le producteur de sa ressource, les renvois) ; l'Orage devient la Magie, qui
 * reçoit les sorts du Chant (Ballade, Duo) ; ses gros coups martiaux (Soliste, Crescendo) vont à la Fureur, Siffloter (un
 * soin) à la Lumière, la Fausse note (un malus) à l'Ombre. Ivresse du sang passe au Sang, l'Aura d'immunité à la
 * Lumière, la Malchance à l'Ombre (docs/MAITRISES.md, « Huit maîtrises »).
 */
export const MASTERY_SKILLS: Record<MasteryId, readonly CharacterEvent[]> = {
  fury: [
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
    // Les Maîtrises (2026-10-27) : une aura de la Fureur, sans forme (elle n'agissait que sous la forme humaine du druide).
    // Gravée chez Gorak +13,0 (série 73)
    { id: 'wild-aura', name: 'Aura sauvage', nature: 'martial', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'wildAura', stacks: 1 }], rankAxis: { kind: 'stacks', per: 1 } },
    {
      id: 'precision-aura',
      name: 'Aura de précision',
      nature: 'finesse',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'precisionAura', stacks: 1 }],
      rankAxis: { kind: 'stacks', per: 1 },
    },
    // Quatrième demande du 2026-10-27 (docs/MAITRISES.md, « Le contenu des maîtrises ») : la boucle de la Fureur, une aura
    // qui fait critiquer et change chaque gros coup (critique, coup ×2 et plus) en Ferveur. Série 90 : Gorak +15,7, Morgrut +7,7
    { id: 'onrush', name: 'Élan', nature: 'martial', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'onrush', stacks: 1 }], rankAxis: { kind: 'power', per: 1 } },
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
    // Les Maîtrises (2026-10-27) : le gros coup de la Fureur. Gravé : Gorak +14,8, Morgrut +20,6 (au bord haut, série 71)
    { id: 'assault', name: 'Assaut', nature: 'martial', trigger: 'naturalThree', relation: 'modify', hitMultiplier: 2, effects: [], rankAxis: { kind: 'multiplier', per: 1 } },
    // Un gros coup (idée de l'utilisateur) : l'intimidation et les épines ne le rognent qu'une fois. Phase 5 ter : il
    // modifie son coup de base, ce coup ×3. 0.107.0 (SORTS.md § 19) : le solo, une fois par combat (un solo qui touche) ;
    // à chaque 2, il valait +23 points gravé ; Crescendo, lui, monte à chaque fois
    { id: 'soloist', name: 'Soliste', nature: 'martial', trigger: 'naturalTwo', relation: 'modify', hitMultiplier: 3, limit: 1, effects: [], rankAxis: { kind: 'multiplier', per: 1 } },
    { id: 'crescendo', name: 'Crescendo', nature: 'martial', trigger: 'naturalThree', relation: 'modify', hitMultiplier: 2, buildsUp: true, effects: [], rankAxis: { kind: 'multiplier', per: 1 } },
  ],
  blood: [
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
      // Revue des compétences (I4) : une consommatrice de critiques (3 Saignement par critique). Refaite avec les Maîtrises
      // (M9, 2026-10-27) : 1 Saignement à chaque coup qui touche, le producteur constant du Sang (la Curée partait 0,23 fois
      // par combat chez Gorak). Son rang : +1 Saignement par coup
      id: 'open-wound',
      name: 'Plaie ouverte',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'openWound', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      // Quatrième demande du 2026-10-27 (le contenu du soin) : la seconde consommatrice du Saignement, le pont du Sang vers
      // les soins (Sentence, Bouclier de foi, Sève noire). Chaque coup qui touche lui rend 1 PV par charge de Saignement de
      // l'adversaire, lue avant que la plaie coule. Gravée : Brokk +14,6 (ses Épines), Gorak +6,5 et Elaria +7,1 avec la
      // Plaie ouverte ; ×2 : Brokk +21,8 (série 82). Son rang : 1 PV de plus par charge de Saignement
      id: 'leech',
      name: 'Sangsue',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'leech', stacks: 1 }],
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
      // Quatrième demande du 2026-10-27 : le producteur sur jet, sans coup à toucher, au prix de son propre sang. Gravé
      // (série 81) : −3 PV et 4 Saignement, Gorak +12,5, Elaria +12,8, Brokk +15,7 (4 Saignement sans prix : +18,8 à
      // +21,6, hors bande). Son rang : 1 Saignement de plus
      id: 'blood-oath',
      name: 'Serment de sang',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [
        { type: 'damage', amount: 3, source: 'bleed' },
        { type: 'applyStatus', status: 'bleed', stacks: 4, target: 'opponent' },
      ],
      rankAxis: { kind: 'stacks', per: 1 },
    },
    {
      // Quatrième demande du 2026-10-27 : le Saignement lu par un critique (Sang → critiques, que lisent l'Ivresse du sang,
      // l'Effroi, la Pourriture). Greffée : ce coup est critique, +4, si l'adversaire saigne ; sinon sa face est nue. Gravée
      // (série 83) : Gorak +7,8 et Elaria +5,0 avec la Plaie ouverte, Brokk +12,0 ; les relâches du Saignement (×2, ×3)
      // et les dégâts par charge restaient sous la bande hors de Brokk (séries 81, 82). Son rang : +3 au critique
      id: 'blood-scent',
      name: 'Odeur du sang',
      nature: 'martial',
      trigger: 'naturalThree',
      when: [{ type: 'hasStatus', who: 'opponent', status: 'bleed' }],
      effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1, power: 4 }],
      rankAxis: { kind: 'power', per: 3 },
    },
  ],
  bulwark: [
    {
      id: 'intimidation-aura',
      name: "Aura d'intimidation",
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'intimidationAura', stacks: 1 }],
      rankAxis: { kind: 'stacks', per: 1 },
    },
    {
      // Phase 8, second lot (SORTS.md § 23) : le consommateur des dégâts qu'il renvoie (Riposte, Rétribution, au Rempart
      // depuis B1). Une aura : +6 Ferveur par charge à chaque renvoi depuis la revue des auras (A2 ; +3 avant, Aldric
      // +9,0 → +12,9 gravée ; +9 valait +15,4, plus risqué)
      id: 'vendetta',
      name: 'Vindicte',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'vendetta', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
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
    // Les Maîtrises (2026-10-27) : une aura qui vit des coups reçus (des Représailles, au Rempart depuis B1). Gravée chez Aldric +9,5
    { id: 'rancor', name: 'Rancœur', nature: 'martial', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'rancor', stacks: 1 }], rankAxis: { kind: 'power', per: 1 } },
    {
      // Phase 8, lot 3 (SORTS.md § 28) : la seconde consommatrice des renvois (Riposte, Rétribution) vers le Sang, une aura.
      // Gravée : Aldric +12,1, rang II +4,0
      id: 'blood-debt',
      name: 'Dette de sang',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'bloodDebt', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      id: 'stoneskin',
      name: 'Peau de pierre',
      nature: 'martial',
      trigger: 'naturalTwo',
      // Le Poing de pierre (Maîtrises, P4 : « un début très mou ») : tant que l'armure tient, ses coups font +1. Départ de
      // Brokk 49,8 → 54,9 % (à +2 : 58,4 %, trop ; série 73). Son rang reste à l'armure
      effects: [
        { type: 'applyStatus', status: 'bonusArmor', stacks: 6 },
        { type: 'applyStatus', status: 'stoneFist', stacks: 1 },
      ],
      rankAxis: { kind: 'stacks', per: 2 },
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
    {
      // Quatrième demande du 2026-10-27 (docs/MAITRISES.md, « Le contenu des maîtrises », proposition 1 de l'utilisateur) :
      // la consommatrice des coups encaissés qui frappe. Ses jauges comptent les trois derniers coups reçus ; elle les relâche
      // en une onde de choc, 2 PV de dégâts directs par coup compté (série 89 : Brokk +10,6, Morgrut +9,2 ; 3 PV : +15,4).
      // Sans coup encaissé, sa face reste nue. Elle se voit : le sol se fend et l'onde roule vers l'adversaire (scène)
      id: 'shockwave',
      name: 'Onde de choc',
      nature: 'martial',
      trigger: 'naturalThree',
      when: [{ type: 'hasStatus', who: 'self', status: 'shockwave' }],
      scene: 'shockwave',
      effects: [{ type: 'release', status: 'shockwave', min: 0, per: SHOCKWAVE_PER, target: 'opponent', source: 'strike' }],
      rankAxis: { kind: 'amount', per: 1 },
    },
  ],
  poison: [
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
      // Phase 8, lot 3 (SORTS.md § 28) : la seconde consommatrice de soins, son Drain vers le Poison, une aura. Gravée :
      // Ervald +8,9 ; rang II +2,6, sous la bande (ses soins sont rares, comme pour la Récolte)
      id: 'black-sap',
      name: 'Sève noire',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'blackSap', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      // Quatrième demande du 2026-10-27 : l'aura défensive du Poison, qui empoisonne qui la frappe. Gravée (série 80) :
      // Ervald +16,0, Naraxes +11,4, Thaldrin +10,6 ; au départ (série 81) : Ervald 53,4 %, Naraxes 49,1 %, Thaldrin 58,1 %
      // (au bord). Son rang : 1 Poison de plus par coup reçu
      id: 'toad-skin',
      name: 'Peau de crapaud',
      nature: 'finesse',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'toadSkin', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      id: 'grave-breath',
      name: 'Souffle de la tombe',
      nature: 'arcane',
      trigger: 'naturalOne',
      // Poison 3 : 3, 2 puis 1 PV, les 6 PV de l'ancien poison 2 pendant 3 tours (0.36.4)
      effects: [{ type: 'applyStatus', status: 'poison', stacks: 3, target: 'opponent' }],
      rankAxis: { kind: 'stacks', per: 1 },
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
      // Quatrième demande du 2026-10-27 : le producteur sur jet, la pièce du Poison (Poison → Chance : elle nourrit le Dé pipé).
      // Même geste que les pièces de la Chance : s'il touche, une pièce ; pile, 5 Poison. Gravée (série 80) : Ervald +13,4,
      // Naraxes +10,1, Thaldrin +10,7 (6 Poison : +11,3 à +15,0). Son rang : pile plus souvent
      id: 'verdigris-coin',
      name: 'Pièce vert-de-gris',
      nature: 'finesse',
      trigger: 'naturalThree',
      relation: 'modify',
      effects: [{ type: 'applyStatus', status: 'verdigrisCoin', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      // Quatrième demande du 2026-10-27 : la consommatrice du Poison qui frappe, par condition (comme la Curée). Gravée (série
      // 83) : ×3, Ervald +16,1, Naraxes +3,9, Thaldrin +6,4 avec l'Aura glaciale (×2 : +8,7, +2,7, +4,2). Les dégâts par
      // charge de Poison (×4 : +10,1, +2,8, +4,2) et la relâche (×3 : +8,6, +2,3, +3,1) valaient moins (série 82). Un gros
      // coup : ce que lit la Fureur. Son rang : ×1 de plus
      id: 'venom-bite',
      name: 'Morsure',
      nature: 'finesse',
      trigger: 'naturalThree',
      relation: 'modify',
      hitMultiplier: 3,
      when: [{ type: 'hasStatus', who: 'opponent', status: 'poison' }],
      effects: [],
      rankAxis: { kind: 'multiplier', per: 1 },
    },
  ],
  chance: [
    {
      // Phase 8, second lot (SORTS.md § 23) : le consommateur de sa pièce. Une aura depuis les Maîtrises (M9, 2026-10-27) :
      // +25 % de chances de faire pile à toutes ses pièces (avant : sa prochaine pièce de Pile ou face sur pile, ce coup ×6)
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
    // Les Maîtrises (2026-10-27) : une aura de la Chance qui lit le dé, à côté des pièces. Gravée chez Naraxes +8,5
    { id: 'lucky-streak', name: 'Veine', nature: 'finesse', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'luckyStreak', stacks: 1 }], rankAxis: { kind: 'power', per: 1 } },
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
    // Retour du 2026-10-27 (M10, R2 ; docs/RELIQUES.md § 17) : les pièces sont des compétences de la Fortune. Même geste
    // que Pile ou face (elle modifie son coup ; s'il touche, la pièce ; pile, un gros effet ; face, rien), une nature
    // chacune : Pile ou face frappe, la Pièce porte-bonheur arme son lanceur, la Pièce maudite frappe l'adversaire d'un malus
    {
      id: 'lucky-coin',
      name: 'Pièce porte-bonheur',
      nature: 'finesse',
      trigger: 'naturalThree',
      relation: 'modify',
      effects: [{ type: 'applyStatus', status: 'luckyCoin', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      id: 'cursed-coin',
      name: 'Pièce maudite',
      nature: 'arcane',
      trigger: 'naturalThree',
      relation: 'modify',
      effects: [{ type: 'applyStatus', status: 'cursedCoin', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
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
      id: 'hawk-eye',
      name: 'Œil de faucon',
      nature: 'finesse',
      trigger: 'naturalOne',
      // Phase 5 bis : greffé, le Critique assuré rend critique le coup de base de ce jet même. Son rang (B8, 2026-10-27 :
      // le Critique assuré n'a plus qu'une charge) : des dégâts en plus à ce coup critique (avant : une charge de plus)
      effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }],
      rankAxis: { kind: 'power', per: 3 },
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
  light: [
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
      id: 'purification',
      name: 'Purification',
      nature: 'arcane',
      trigger: 'naturalTwo',
      // 0.42.0 : quand l'adversaire n'a aucun bonus à retirer, la lumière le blesse (dégâts directs) au lieu
      // de tomber à vide (54 % des déclenchements avant). Contre un adversaire à bonus (Brokk), rien ne change.
      // 0.69.0 à 0.112.0 : elle retirait aussi son propre dernier malus ; retiré en 0.113.0 (décision de l'utilisateur :
      // « l'effet sur soi doit être retiré ») : un bonus en face, sinon sa lumière. Son rang aiguise ces dégâts. Maîtrises
      // (vague 2, 2026-10-27) : 6 → 8 dégâts, Ysolde vanilla 43,8 → 47,6 % (400 par duel), construite 36,4 → 37,7 %.
      // L'aura de départ au 3e tour (2026-10-27, AURAS.md § 2.4) : ses adversaires portent leur aura bien plus souvent, elle
      // blessait moins ; elle blesse aussi de 5 quand elle retire un bonus (sa lumière de repli, seule, s'aiguise)
      effects: [
        {
          type: 'cleanse',
          polarity: 'positive',
          count: 1,
          target: 'opponent',
          andThen: { type: 'damage', amount: PURIFICATION_STRIP, target: 'opponent', source: 'holy' },
          orElse: { type: 'damage', amount: PURIFICATION_LIGHT, target: 'opponent', source: 'holy' },
        },
      ],
      rankAxis: { kind: 'amount', per: 3 },
    },
    // Les Maîtrises (P9, 2026-10-27) : le soin franc de la Lumière. Gravée : Ysolde +17,7, Gorak +14,2 (série 71)
    { id: 'prayer', name: 'Prière', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'heal', amount: 6 }], rankAxis: { kind: 'amount', per: 3 } },
    { id: 'whistle', name: 'Siffloter', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'whistling', stacks: 2 }], rankAxis: { kind: 'stacks', per: 1 } },
    {
      // Quatrième demande du 2026-10-27 (le contenu du soin) : la Lumière fait payer l'adversaire. Ses 2 prochains coups reçus
      // lui rendent chacun 2 PV, pris à l'attaquant : un soin (Sentence, Bouclier de foi, Flamme votive). Gravée sur Ysolde
      // (séries 80, 81) : 2 × 2, +15,6 ; 3 × 1, +11,2 ; 3 × 2, +19,1 (son rang II). Son rang : un coup de plus
      id: 'tithe',
      name: 'Dîme',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'tithe', stacks: 2 }],
      rankAxis: { kind: 'stacks', per: 1 },
    },
    {
      // Quatrième demande du 2026-10-27 : la consommatrice de soins en compétence, le pont de la Lumière vers la Magie
      // (Brûlure : Embrasement, Attiser). Ses 2 prochains soins posent chacun Brûlure 3. Gravée sur Ysolde (séries 80 à 82) :
      // 2 × Brûlure 3, +14,4 ; 2 × Brûlure 4 (son rang II), +18,3 ; « +1 à sa Brûlure » par soin, +5,3. Son rang : Brûlure +1
      id: 'votive-flame',
      name: 'Flamme votive',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'votiveFlame', stacks: 2 }],
      rankAxis: { kind: 'power', per: 1 },
    },
  ],
  shadow: [
    // Les Maîtrises (2026-10-27) : les deux auras de l'Ombre, au critique. Effroi gravé : Ervald +12,1, Aldric +6,7 ; Aura de
    // pourriture (le statut attendait un porteur) : départs Ervald 45,4 %, Aldric 51,0 % (séries 70 et 71)
    { id: 'dread', name: 'Effroi', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'dread', stacks: 1 }], rankAxis: { kind: 'power', per: 1 } },
    { id: 'rot-aura', name: 'Aura de pourriture', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'rotAura', stacks: 1 }], rankAxis: { kind: 'power', per: 1 } },
    // Quatrième demande du 2026-10-27 (docs/MAITRISES.md, « Le contenu des maîtrises ») : deux auras de l'Ombre hors du
    // critique. L'Emprise lit ses malus posés (et ceux des autres maîtrises : Poison, Saignement, Brûlure) ; série 87 :
    // Ervald +9,1. Le Larcin gêne sans critique : il esquive et prend une charge du dernier bonus de l'attaquant, l'icône
    // volant d'un camp à l'autre (proposition 2 de l'utilisateur) ; série 88 : Ervald +12,6, Aldric +7,6. Une charge par vol
    // (règle commune des vols) : gravé Ervald +16,3 → +14,2, Aldric +10,9 → +10,4 ; départ contre Fanchon 66,5 → 52,3 %
    { id: 'grip', name: 'Emprise', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'grip', stacks: 1 }], rankAxis: { kind: 'power', per: 1 } },
    { id: 'pilfer', name: 'Larcin', nature: 'finesse', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'pilfer', stacks: 1 }], rankAxis: { kind: 'power', per: 1 } },
    {
      id: 'life-steal',
      name: 'Vol de vie',
      nature: 'arcane',
      trigger: 'naturalTwo',
      // 0.107.0 (SORTS.md § 19) : 1 charge au lieu de 2 (plafond 2 gardé) ; deux coups drainés à chaque 1 le mettaient à
      // +21 points gravé et +23,6 dans le kit d'Ervald. Revue des compétences (P3) : +2 PV par coup drainé dès le rang I
      // (l'intensité posée), +4 par rang. Maîtrises (vague 2, 2026-10-27) : +2 → +4 PV, Ervald vanilla 44,5 → 47,3 %
      // (400 par duel), construit 41,2 → 43,0 %
      effects: [{ type: 'applyStatus', status: 'lifesteal', stacks: 1, power: 4 }],
      rankAxis: { kind: 'power', per: 4 },
    },
    {
      id: 'fear',
      name: 'Peur',
      nature: 'arcane',
      trigger: 'naturalOne',
      // 0.107.0 (SORTS.md § 19) : une fois par combat ; un tour perdu à chaque 1 valait +22 points gravé (+20 à deux fois)
      limit: 1,
      effects: [{ type: 'applyStatus', status: 'fear', stacks: 1, target: 'opponent' }],
      // Retour du 2026-10-27 (S10) : la Peur se voit, une ombre monte sous la cible (MISE_EN_SCENE.md M54)
      scene: 'dread',
      rankAxis: { kind: 'limit', per: 1 },
    },
    // Phase 8, lot 3 (SORTS.md § 29) : le malus de Sceaux, le paladin confisque ; gravée +9,3 chez lui, +10,0 en moyenne,
    // rang II +3,1 (au bord bas de la bande). Une charge par vol (règle commune des vols, quatrième demande du 2026-10-27,
    // comme le Larcin) : gravée +16,0 → +14,3 en moyenne (Aldric +13,9 → +12,8), rang II +6,2 → +6,3 (400 par duel)
    { id: 'seal-theft', name: 'Confiscation', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'sealTheft', stacks: 1, target: 'opponent' }], rankAxis: { kind: 'stacks', per: 1 } },
    // Phase 8, lot 3 (SORTS.md § 29) : le malus de Fortune, le mauvais œil de la voleuse ; gravée +15,7 chez elle, +18,2
    // en moyenne, rang II +4,6
    { id: 'jinx', name: 'Malchance', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'jinx', stacks: 1, target: 'opponent' }], rankAxis: { kind: 'stacks', per: 1 } },
    // Les Maîtrises (2026-10-27) : le malus de Puissance de l'Ombre (Affaibli). Gravée : Ervald +11,5, Aldric +8,2
    { id: 'wither', name: 'Flétrissure', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'weakened', stacks: 2, turns: 3, target: 'opponent' }], rankAxis: { kind: 'stacks', per: 1 } },
    {
      id: 'false-note',
      name: 'Fausse note',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'falseNote', stacks: 1, power: 1, target: 'opponent' }],
      rankAxis: { kind: 'power', per: 1 },
    },
  ],
  magic: [
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
    // Les Maîtrises (2026-10-27) : la seconde aura de l'Orage (la Magie depuis B1), la foudre sur qui le frappe. Gravée : Ysolde +11,8, Thaldrin +10,7
    { id: 'storm-field', name: "Champ d'orage", nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'stormField', stacks: 1 }], rankAxis: { kind: 'power', per: 1 } },
    // Les Maîtrises (P9, 2026-10-27) : l'aura du Chant (la Magie depuis B1), la chanson qui soigne à chaque coup. Gravée chez Fanchon +12,4 (à 2 PV,
    // son départ passait 62,4 % : trop)
    { id: 'ballad', name: 'Ballade', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'ballad', stacks: 1 }], rankAxis: { kind: 'power', per: 1 } },
    // Quatrième demande du 2026-10-27 (docs/MAITRISES.md, « Le contenu des maîtrises ») : l'aura de foudre qui lit les dégâts
    // directs, chaque impact +1 (Foudre, Ciel d'orage, Champ d'orage ; la Purification, la Sentence). Série 86 : Thaldrin +9,3
    { id: 'overcharge', name: 'Surtension', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'overcharge', stacks: 1 }], rankAxis: { kind: 'power', per: 1 } },
    {
      id: 'firefly',
      name: 'Feux follets',
      nature: 'arcane',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'burn', stacks: 3, target: 'opponent' }],
      // +2 Brûlure par rang depuis la revue des compétences (R3) : +1 laissait le rang II à +3,4 chez Thaldrin construit
      rankAxis: { kind: 'stacks', per: 2 },
    },
    {
      id: 'thunderbolt',
      name: 'Foudre',
      nature: 'arcane',
      trigger: 'naturalTwo',
      scene: 'lightning',
      effects: [{ type: 'damage', amount: THUNDERBOLT, hits: THUNDERBOLT_HITS, target: 'opponent', source: 'lightning' }],
      // +1 par éclair : +8,7 points gravée, au-dessus de la bande (0.111.0, signalé ; à demi en 0.110.0 : +6,5 ; +2 par
      // éclair avant la 0.110.0 : +15,1)
      rankAxis: { kind: 'amount', per: 1 },
    },
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
    // Phase 8, lot 3 (SORTS.md § 29) : le malus de Précision, l'éclair qui éblouit ; gravée +13,8 chez lui, +13,6 en
    // moyenne, rang II +3,8 (+10 % de coups ratés)
    // Retour du 2026-10-27 (S10) : un éclair blanc frappe la cible, l'arène blanchit, puis « Aveuglé » (MISE_EN_SCENE.md M54)
    { id: 'blinding', name: 'Éclair aveuglant', nature: 'arcane', trigger: 'naturalThree', scene: 'blindFlash', effects: [{ type: 'applyStatus', status: 'blinded', stacks: 1, target: 'opponent' }], rankAxis: { kind: 'power', per: 1 } },
    // Le Duo (2026-10-25) : des dés de plus à sa prochaine action, joués en entier (la mécanique de Coup de chance). Jusqu'à
    // la 0.120.0, il posait d'abord +1 Aura mélodieuse, et un seul dé de plus. Retour du 2026-10-27 (P7) : l'aura quitte le
    // jeu, le Duo la compense par ses charges, 1 → 3 (quatre dés à l'action suivante). Mesuré (winRate, 300 combats par
    // duel) : sans l'aura, Duo 1 18,5 %, Duo 2 36,9 %, Duo 3 49,4 % ; rang II (4 charges) 56,3 %. Son rang : un dé de plus
    {
      id: 'duo',
      name: 'Duo',
      nature: 'arcane',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'duo', stacks: 3 }],
      rankAxis: { kind: 'stacks', per: 1 },
    },
  ],
}

/** Toutes les compétences du catalogue, par id. */
export const SKILLS: Readonly<Record<string, CharacterEvent>> = Object.fromEntries(
  Object.values(MASTERY_SKILLS)
    .flat()
    .map((e) => [e.id, e]),
)

/** Une compétence du catalogue ; une id inconnue est une erreur de données. */
export function skillById(id: string): CharacterEvent {
  const found = SKILLS[id]
  if (!found) throw new Error(`Compétence inconnue : ${id}`)
  return found
}
