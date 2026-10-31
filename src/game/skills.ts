/*
 * Le catalogue des compétences (Maîtrises, docs/MAITRISES.md § 11.1) : chaque définition une fois, rangée dans sa maîtrise
 * (une brique, une maîtrise). Le roster pose les faces de chaque dé par id (`skillById`) ; la réserve d'une maîtrise en
 * dérive (masteries.ts). Hors d'un dé, le déclencheur d'une définition ne sert qu'à son texte : une face (le dé d'un
 * personnage, une gravure) le remplace par le sien.
 */
import type { CharacterEvent, RankAxis } from './events'
import type { MasteryId } from './masteries'
import { SHOCKWAVE_PER } from './statuses'

/**
 * Foudre du druide (0.76.0, demande de l'utilisateur) : des éclairs de dégâts directs, jamais critiques. 2 chacun
 * jusqu'à la 0.105.0 ; 1 depuis la 0.106.0 (phase 5 bis) : la Foudre se greffe sur son coup de base. Trois éclairs jusqu'à
 * la revue des compétences (O3, docs/REVUE_COMPETENCES.md), quatre depuis : la plus faible brique de kit du jeu. Décision
 * D11 (2026-10-30, plus de « 1 ») : deux éclairs de 2, le même total en une seule perte (gravée sur le 3, avant → après
 * +0,0 point chez Thaldrin, Fanchon, Ysolde, Naraxes, 400 par duel, laboratoire série 163) ; son rang, +2 par éclair
 * (2 × 4 au rang II, comme 4 × 2 avant)
 */
const THUNDERBOLT = 2
const THUNDERBOLT_HITS = 2

/** Dégâts directs de la Purification quand il n'y a aucun bonus à retirer (0.42.0 ; 6 en 0.115.1 ; 8 depuis les Maîtrises). */
const PURIFICATION_LIGHT = 8

/**
 * Dégâts directs de la Purification quand elle retire un bonus (2026-10-27, avec l'aura de départ au 3e tour, AURAS.md
 * § 2.4). 5 → 7 avec le rendez-vous réarmé (D8, retour du 30 octobre, A2·7 de docs/etudes/DES_SUPPLEMENTAIRES.md § 4 :
 * l'aura dissipée revient au début du 2e tour suivant de son porteur ; Ysolde garde sa force).
 */
const PURIFICATION_STRIP = 7

/**
 * Les compétences à charges sorties des auras (refonte des auras, 2026-10-28, docs/REFONTE_AURAS.md § 4) : Sangsue, Peau
 * de crapaud, Sentence, Bouclier de foi agissent sur leurs 3 prochains déclenchements, une charge chacun.
 */
const SPENT_CHARGES = 3

/**
 * Le rang d'une aura (retour du 30 octobre, décision de l'utilisateur : « l'aura aiguisée arrive au 2e tour au lieu du
 * 3e ») : une règle pour toutes les auras, son rendez-vous un tour plus tôt (`auraDueTurn`, combat.ts) ; ses valeurs ne
 * changent plus. Avant, un cran de plus de son effet : rang II au départ de +6,4 (Vindicte) à +17,6 points (Épines),
 * presque tous au-dessus de la bande de +3 à +8. Mesures : docs/SORTS.md § 35.
 */
const AURA_RANK: RankAxis = { kind: 'due', per: 1 }

/**
 * Les compétences de chaque maîtrise : ses auras d'abord, puis ses compétences, dans l'ordre du compendium. Second retour
 * du 2026-10-27 (B1) : onze → huit maîtrises, aucune compétence nouvelle. La Chasse (finesse : critiques et esquives)
 * passe à la Chance, l'Aura de précision à la Fureur ; les Représailles (rendre les coups) au Rempart, Dette de sang
 * comprise (une consommatrice reste avec le producteur de sa ressource, les renvois) ; l'Orage devient la Magie, qui
 * reçoit les sorts du Chant (Ballade, Duo) ; ses gros coups martiaux (Soliste, Crescendo) vont à la Fureur, Siffloter (un
 * soin) à la Lumière, la Fausse note (un malus) à l'Ombre. Ivresse du sang passe au Sang, l'Aura d'immunité à la
 * Lumière, la Malchance à l'Ombre (docs/MAITRISES.md, « Huit maîtrises »).
 *
 * Second retour du 2026-10-30 (D29, D23) : la Magie s'affiche Arcanes (id `magic` gardé) ; cinq compétences quittent la
 * musique de Fanchon, ids inchangés (journaux, historique) : Duo → Écho, Soliste → Coup de maître, Crescendo →
 * Acharnement, Siffloter → Répit, Fausse note → Main tremblante. Une compétence arcane est un sort (`isSpell`, events.ts).
 */
export const MASTERY_SKILLS: Record<MasteryId, readonly CharacterEvent[]> = {
  fury: [
    {
      id: 'power-aura',
      name: 'Aura de puissance',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'powerAura', stacks: 1 }],
      // Cumulable à 3 charges depuis la revue des auras (A4) ; son rang, comme toute aura, avance son rendez-vous
      rankAxis: AURA_RANK,
    },
    // Quatrième demande du 2026-10-27 (docs/MAITRISES.md, « Le contenu des maîtrises ») : la boucle de la Fureur, une aura
    // qui fait critiquer et change chaque gros coup (critique, coup ×2 et plus) en Ferveur. Série 90 : Gorak +15,7, Morgrut +7,7
    { id: 'onrush', name: "Aura d'élan", nature: 'martial', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'onrush', stacks: 1 }], rankAxis: AURA_RANK },
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
    // à chaque 2, il valait +23 points gravé ; l'Acharnement, lui, monte à chaque fois. Noms du 2026-10-30 (D23) : le
    // Soliste devient le Coup de maître, le Crescendo l'Acharnement
    { id: 'soloist', name: 'Coup de maître', nature: 'martial', trigger: 'naturalTwo', relation: 'modify', hitMultiplier: 3, limit: 1, effects: [], rankAxis: { kind: 'multiplier', per: 1 } },
    { id: 'crescendo', name: 'Acharnement', nature: 'martial', trigger: 'naturalThree', relation: 'modify', hitMultiplier: 2, buildsUp: true, effects: [], rankAxis: { kind: 'multiplier', per: 1 } },
    // Profondeur de l'offre et D21 (2026-10-30) : le corps à corps de la Fureur, pour qui frappe aussi en ours (Thaldrin) ;
    // le gros coup qui encaisse (Fureur → armure, que lisent le Poing de pierre, le Bastion, le Bouclier de foi)
    {
      id: 'mauling',
      name: "Charge de l'ours",
      nature: 'martial',
      trigger: 'naturalThree',
      relation: 'modify',
      hitMultiplier: 2,
      effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 2 }],
      rankAxis: { kind: 'stacks', per: 3 },
    },
    // D9 (2026-10-30, docs/etudes/DES_SUPPLEMENTAIRES.md R59) : la Rage montante, un moteur offrable plutôt qu'une aura sans
    // porteur. +2 à ses coups, puis +2 à chaque critique reçu (fenêtre `critHurt`), jusqu'à +6. Son rang : +2 fixe par coup
    { id: 'rising-rage', name: 'Rage montante', nature: 'martial', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'risingRage', stacks: 1 }], rankAxis: { kind: 'power', per: 2 } },
  ],
  blood: [
    {
      // Phase 8, lot 3 (SORTS.md § 28) : la consommatrice de critiques de sa Furie, une aura. Chaque critique : deux coups
      // de base bruts juste après ; chaque pose de plus : +5 % de critique. Gravée : Gorak +11,8
      id: 'blood-frenzy',
      name: "Aura d'ivresse",
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'bloodFrenzy', stacks: 1 }],
      rankAxis: AURA_RANK,
    },
    {
      id: 'thorns',
      name: "Aura d'épines",
      nature: 'martial',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'thorns', stacks: 1 }],
      // Les épines plantées (D13, 2026-10-30)
      rankAxis: AURA_RANK,
    },
    {
      // Revue des compétences (I4) : une consommatrice de critiques (3 Saignement par critique). Refaite avec les Maîtrises
      // (M9, 2026-10-27) : 1 Saignement à chaque coup qui touche. Refonte des auras (2026-10-28, § 3.1) : de nouveau au
      // critique, Saignement 4, la seconde aura d'Elaria (la Saignée)
      id: 'open-wound',
      name: 'Aura des plaies',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'openWound', stacks: 1 }],
      rankAxis: AURA_RANK,
    },
    {
      // Quatrième demande du 2026-10-27 (le contenu du soin) : la seconde consommatrice du Saignement, le pont du Sang vers
      // les soins (Sentence, Bouclier de foi, Sève noire). Chaque coup qui touche lui rend 1 PV par charge de Saignement de
      // l'adversaire, lue avant que la plaie coule. Gravée : Brokk +14,6 (ses Épines), Gorak +6,5 et Elaria +7,1 avec la
      // Plaie ouverte ; ×2 : Brokk +21,8 (série 82). Son rang : une charge de plus (mesure d'ensemble de la refonte des
      // auras, tranche 8 : +1 PV par charge de Saignement le doublait, rang II +4,2 mais Brokk +10,8 ; une charge : +3,6,
      // Brokk +5,3)
      id: 'leech',
      name: 'Sangsue',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'leech', stacks: SPENT_CHARGES }],
      rankAxis: { kind: 'stacks', per: 2 },
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
      // Phase 8, second lot (SORTS.md § 23) : le consommateur des dégâts qu'il renvoie (Riposte, Rétribution, au Rempart
      // depuis B1). Une aura : +6 Ferveur par charge à chaque renvoi depuis la revue des auras (A2 ; +3 avant, Aldric
      // +9,0 → +12,9 gravée ; +9 valait +15,4, plus risqué)
      id: 'vendetta',
      name: 'Aura de vindicte',
      nature: 'martial',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'vendetta', stacks: 1 }],
      rankAxis: AURA_RANK,
    },
    // Les Maîtrises (2026-10-27) : une aura qui vit des coups reçus (des Représailles, au Rempart depuis B1). Gravée chez Aldric +9,5.
    // Décision D19 (2026-10-30) : elle quitte la fiche de Morgrut ; une brique offerte du Rempart
    { id: 'rancor', name: 'Aura de rancœur', nature: 'martial', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'rancor', stacks: 1 }], rankAxis: AURA_RANK },
    // Décision D19 (2026-10-30) : la seconde aura de Morgrut, celle qui tient (+3 armure temporaire par coup reçu), à la
    // place de la Rancœur. Départ de Morgrut 49,3 → 46,6 % (laboratoire, série 123, 0.131.2)
    { id: 'thick-hide', name: 'Aura du cuir épais', nature: 'martial', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'thickHide', stacks: 1 }], rankAxis: AURA_RANK },
    // Refonte des auras (2026-10-28, § 3.1, § 5.2) : la seconde aura de Brokk, à la place du Rempart hérissé (même
    // déclencheur) : l'armure vidée frappe l'attaquant et revient. Départ de Brokk 53,6 % (conception, série 101)
    { id: 'bastion', name: 'Aura du bastion', nature: 'martial', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'bastion', stacks: 1 }], rankAxis: AURA_RANK },
    {
      id: 'stoneskin',
      name: 'Peau de pierre',
      nature: 'martial',
      trigger: 'naturalTwo',
      // Le Poing de pierre (Maîtrises, P4 : « un début très mou ») : tant que l'armure tient, ses coups font plus. Son rang
      // reste à l'armure. Décision D11 (2026-10-30) : Poing +1 → +2 et armure 6 → 5, à force égale (laboratoire, série
      // 164, 400 par duel : départ de Brokk 46,4 → 46,4 % ; gravée chez Morgrut −0,2, chez Aldric +0,8 ; armure 6 et +2 :
      // +2,4 à +2,8)
      effects: [
        { type: 'applyStatus', status: 'bonusArmor', stacks: 5 },
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
      // Martiale depuis le 2026-10-30 (D29) : la relâche de coups encaissés, des coups blancs, pas un sort
      nature: 'martial',
      trigger: 'naturalOne',
      // 0.107.0 (SORTS.md § 19, choisi au laboratoire, série 16) : la moitié des jauges, arrondie au-dessous (au-dessus,
      // elle restait à +20,8 gravée, hors de la bande) ; un coup à chaque jet remplissait ses trois jauges à chaque tour
      // adverse (+38 points dans son kit, +28 gravée)
      effects: [{ type: 'release', status: 'retribution', min: 1, share: 0.5, target: 'opponent', source: 'strike' }],
      rankAxis: { kind: 'share', per: 25 },
    },
    {
      // Refonte des auras (Q6) : le coup reçu renvoyé en entier. Mesure d'ensemble (tranche 8) : une charge par pose au
      // lieu de deux (deux au plus, un 2 de plus en ajoute une) : gravée chez les autres +23,0 → +17,0, rang II +5,4 ;
      // Aldric compensé par son attaque (5 à 6 → 5 à 7)
      id: 'riposte',
      name: 'Riposte',
      nature: 'martial',
      trigger: 'naturalTwo',
      effects: [{ type: 'applyStatus', status: 'riposte', stacks: 1 }],
      rankAxis: { kind: 'power', per: 2 },
    },
    {
      // Quatrième demande du 2026-10-27 (docs/MAITRISES.md, « Le contenu des maîtrises », proposition 1 de l'utilisateur) :
      // la consommatrice des coups encaissés qui frappe. Ses jauges comptent les trois derniers coups reçus ; elle les relâche
      // en une onde de choc, 3 PV de dégâts directs par coup compté (D14, 2026-10-30 ; 2 PV avant, « faible ») : gravée sur
      // le 3 nu, Brokk +14,8, Aldric +12,3, Morgrut +14,2 (2 → 3 : +5,1, +4,3, +4,7 ; 0.133.0, 400 par duel)
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
    // Profondeur de l'offre (2026-10-30) : le Rempart, la maîtrise la plus courte. Le Mur de boucliers produit l'armure (que
    // lisent le Poing de pierre, le Bastion) ; le Défi encaisse et renvoie le coup suivant (que lit la Vindicte)
    { id: 'shield-wall', name: 'Mur de boucliers', nature: 'martial', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 6 }], rankAxis: { kind: 'stacks', per: 3 } },
    {
      // Retour du 30 octobre (décision ouverte 2, « trop haut ») : il modifie son coup (s'il touche) et part deux fois par
      // combat. Gravé sur le 3 nu (400 par duel) : Brokk +22,3 → +19,9, Aldric +21,4 → +18,4, Morgrut +19,3 → +17,4 ;
      // construit (builds à 8 récompenses, 29 à 45 par porteur) : +14,6 → +12,4, +17,2 → +14,5, +11,4 → +9,7 ; rang II
      // +3,3 à +4,8. Essais écartés (docs/SORTS.md § 35) : +4 armure et Rancune (+20,6 à +24,4), une fois par combat (rang
      // II +7,8 à +8,5)
      id: 'challenge',
      name: 'Défi',
      nature: 'martial',
      trigger: 'naturalThree',
      relation: 'modify',
      limit: 2,
      effects: [
        { type: 'applyStatus', status: 'bonusArmor', stacks: 2 },
        { type: 'applyStatus', status: 'riposte', stacks: 1 },
      ],
      rankAxis: { kind: 'stacks', per: 2 },
    },
  ],
  poison: [
    {
      id: 'decoction-aura',
      name: 'Aura de décoction',
      nature: 'finesse',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'decoctionAura', stacks: 1 }],
      // Décision D11 (2026-10-30) : regroupée, Poison 6 tous les trois coups qui touchent
      rankAxis: AURA_RANK,
    },
    {
      id: 'frost-aura',
      name: 'Aura de poison',
      nature: 'arcane',
      trigger: 'naturalOne',
      // 0.69.0 : l'aura pose du vrai Poison (cumulable, sans compensation), au lieu de dégâts directs
      effects: [{ type: 'applyStatus', status: 'frostAura', stacks: 1 }],
      // Poison 2 à chaque tour (D15, 2026-10-30)
      rankAxis: AURA_RANK,
    },
    {
      // Quatrième demande du 2026-10-27 : l'aura défensive du Poison, qui empoisonne qui la frappe. Gravée (série 80) :
      // Ervald +16,0, Naraxes +11,4, Thaldrin +10,6 ; au départ (série 81) : Ervald 53,4 %, Naraxes 49,1 %, Thaldrin 58,1 %
      // (au bord). Son rang : 1 Poison de plus par coup reçu
      id: 'toad-skin',
      name: 'Peau de crapaud',
      nature: 'finesse',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'toadSkin', stacks: SPENT_CHARGES }],
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
      // Retour du 2026-10-30 (R30-R31, mécanique écrite par l'utilisateur) : « votre prochain coup draine un montant de PV
      // égal au nombre de charges de Poison sur l'adversaire ». Un statut posé par sa greffe, que son coup de base consomme
      // s'il touche (comme la Sangsue) ; sans Poison, la charge attend. Avant : +14 PV tout de suite si l'adversaire était
      // empoisonné, rang +6. Son rang : +1 PV par charge de Poison
      id: 'harvest',
      name: 'Récolte',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'harvest', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
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
    // Profondeur de l'offre (2026-10-30) : une source de Poison au coup (Fureur, Chance : ceux qui frappent souvent), qui
    // ouvre la Virulence, la Récolte, la Morsure. Ses 3 prochains coups qui touchent, Poison 2 chacun ; son rang, deux de plus
    // (D11, passe d'équilibre du 2026-10-31 : rang II +4,3 points, 200 par duel)
    { id: 'coated-blade', name: 'Lame enduite', nature: 'finesse', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'coatedBlade', stacks: 3 }], rankAxis: { kind: 'stacks', per: 2 } },
  ],
  chance: [
    {
      // Phase 8, second lot (SORTS.md § 23) : le consommateur de sa pièce. Une aura depuis les Maîtrises (M9, 2026-10-27) :
      // +25 % de chances de faire pile à toutes ses pièces (avant : sa prochaine pièce de Pile ou face sur pile, ce coup ×6)
      id: 'loaded-die',
      name: 'Aura du dé pipé',
      nature: 'finesse',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'loadedDie', stacks: 1 }],
      rankAxis: AURA_RANK,
    },
    {
      // Phase 8, lot 3 (SORTS.md § 28) : la consommatrice de ses esquives, qui nourrit sa ressource (+5 % d'esquive par
      // charge). Refonte des auras (2026-10-28, § 5.1, Q5) : la Feinte devient la Visée, chaque esquive +1 au
      // multiplicateur de son prochain critique (plus de critique assuré)
      id: 'feint',
      name: 'Aura de visée',
      nature: 'finesse',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'feint', stacks: 1 }],
      rankAxis: AURA_RANK,
    },
    // Les Maîtrises (2026-10-27) : une aura de la Chance qui lit le dé, à côté des pièces. Gravée chez Naraxes +8,5
    { id: 'lucky-streak', name: 'Aura de veine', nature: 'finesse', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'luckyStreak', stacks: 1 }], rankAxis: AURA_RANK },
    {
      id: 'coin-flip',
      name: 'Pile ou face',
      nature: 'finesse',
      trigger: 'naturalTwo',
      // Phase 5 bis (décision de l'utilisateur) : elle modifie son coup ; s'il touche, la pièce : pile, ce coup ×2 (×3 depuis
      // la 0.107.0, `COIN_HEADS`)
      relation: 'modify',
      effects: [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }],
      // Pile ×2 de plus par rang depuis la revue des compétences (R2) : ×1 laissait le rang II à +2,3 chez Naraxes construite.
      // Mesure d'ensemble de la refonte des auras (tranche 8) : avec les pièces, le Dé pipé et la Coccinelle, son aiguisage
      // valait +9,7 chez Naraxes construite (26 builds sur 48, au-dessus de la bande de +3 à +8) et la portait à 58,8 % :
      // ×1 de plus par rang
      rankAxis: { kind: 'power', per: 1 },
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
      rankAxis: { kind: 'power', per: 2 },
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
    // Refonte des auras (tranche 6, 2026-10-28, docs/REFONTE_AURAS.md § 5.9) : trois pièces de plus, même geste. Pile,
    // de l'armure ; pile, deux coups bruts tout de suite ; pile, un malus long à l'adversaire. Son rang : pile plus souvent
    {
      id: 'shield-coin',
      name: 'Pièce de bouclier',
      nature: 'martial',
      trigger: 'naturalThree',
      relation: 'modify',
      effects: [{ type: 'applyStatus', status: 'shieldCoin', stacks: 1 }],
      rankAxis: { kind: 'power', per: 2 },
    },
    {
      id: 'volley-coin',
      name: 'Pièce de la rafale',
      nature: 'finesse',
      trigger: 'naturalThree',
      relation: 'modify',
      effects: [{ type: 'applyStatus', status: 'volleyCoin', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
    {
      id: 'hex-coin',
      name: 'Pièce ensorcelée',
      nature: 'arcane',
      trigger: 'naturalThree',
      relation: 'modify',
      effects: [{ type: 'applyStatus', status: 'hexCoin', stacks: 1 }],
      rankAxis: { kind: 'power', per: 2 },
    },
    {
      id: 'lucky-strike',
      name: 'Coup de chance',
      nature: 'finesse',
      trigger: 'naturalOne',
      // 0.107.0 (SORTS.md § 19) : il se greffe (le coup de ce jet part) ; il remplaçait le coup depuis la phase 5 bis. Le dé
      // qu'il donne, à l'action suivante, est un dé de frappe ; sur un Doublé, la compétence repart (D5, retour du 30 octobre)
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
      // Décision D11 (2026-10-30) : regroupée, +4 PV tous les deux tours
      rankAxis: AURA_RANK,
    },
    // Refonte des auras (2026-10-28, § 3.1, § 5.4) : la seconde aura d'Ysolde, les fautes de qui la frappe. Le verdict (D17,
    // 2026-10-30) : à la 3e faute, 8 PV de Lumière au lieu de la Peur (départ d'Ysolde 43,8 → 49,2 %, émulé, 0.133.0)
    { id: 'judgement', name: 'Aura de jugement', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'judgement', stacks: 1 }], rankAxis: AURA_RANK },
    {
      // Phase 8, premier lot (0.114.0, SORTS.md) : le consommateur de ses soins, une aura (+8,1 gravée). Revue des auras
      // (A1) : 3 PV par charge (1 avant), Ysolde +7,9 → +15,9 ; son rang, +3 par soin
      id: 'sentence',
      name: 'Sentence',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'sentence', stacks: SPENT_CHARGES }],
      rankAxis: { kind: 'power', per: 2 },
    },
    {
      // Revue des compétences (I1, retenue avec la Sentence) : l'autre consommatrice de ses soins, Soin → Garde, une aura.
      // Gravée : Ysolde +16,1 (ailleurs +0,5 à +4,1) ; à la place de la Sentence dans ses builds, 37,0 → 43,9 %
      id: 'faith-shield',
      name: 'Bouclier de foi',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'faithShield', stacks: SPENT_CHARGES }],
      rankAxis: { kind: 'power', per: 2 },
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
      // blessait moins ; elle blesse aussi quand elle retire un bonus, de 7 depuis le rendez-vous réarmé (D8 ; 5 avant), sa
      // lumière de repli, seule, s'aiguise
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
    // Siffloter, renommé Répit le 2026-10-30 (D23) : le soin de la Lumière n'est plus une chanson de Fanchon
    { id: 'whistle', name: 'Répit', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'whistling', stacks: 2 }], rankAxis: { kind: 'stacks', per: 2 } },
    {
      // Quatrième demande du 2026-10-27 (le contenu du soin) : la Lumière fait payer l'adversaire. Ses 2 prochains coups reçus
      // lui rendent chacun 2 PV, pris à l'attaquant : un soin (Sentence, Bouclier de foi, Flamme votive). Gravée sur Ysolde
      // (séries 80, 81) : 2 × 2, +15,6 ; 3 × 1, +11,2 ; 3 × 2, +19,1 (son rang II). Son rang : un coup de plus
      id: 'tithe',
      name: 'Dîme',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'tithe', stacks: 2 }],
      rankAxis: { kind: 'stacks', per: 2 },
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
      rankAxis: { kind: 'power', per: 2 },
    },
    // D26 (docs/etudes/CONTENU_RETOUR_30.md § 5, n° 12) : la Grâce, le soin qui fait frapper (une consommatrice de soins)
    { id: 'grace', name: 'Grâce', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'grace', stacks: 3 }], rankAxis: { kind: 'stacks', per: 2 } },
    // Profondeur de l'offre (2026-10-30) : deux Lumières sans condition, qui produisent le soin que lisent la Sentence, le
    // Bouclier de foi, la Flamme votive, la Grâce. La Lumière sacrée blesse et soigne ; l'Onction soigne et garde. Passe
    // d'équilibre du 2026-10-31 : le rang de la Lumière sacrée va au soin seul (+2 PV), comme son texte de rang le disait
    // (sur les deux effets, rang II +8,9 points, 400 par duel, au-dessus de la bande)
    {
      id: 'holy-light',
      name: 'Lumière sacrée',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [
        { type: 'damage', amount: 3, target: 'opponent', source: 'holy' },
        { type: 'heal', amount: 3 },
      ],
      rankAxis: { kind: 'amount', per: 2, on: 'heal' },
    },
    {
      id: 'anointing',
      name: 'Onction',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [
        { type: 'heal', amount: 3 },
        { type: 'applyStatus', status: 'bonusArmor', stacks: 3 },
      ],
      rankAxis: { kind: 'amount', per: 2 },
    },
  ],
  shadow: [
    // Les Maîtrises (2026-10-27) : l'aura de l'Ombre, au critique. Effroi gravé : Ervald +12,1, Aldric +6,7. Le Larcin gêne
    // sans critique : il esquive et prend une charge du dernier bonus de l'attaquant, l'icône volant d'un camp à l'autre
    // (proposition 2 de l'utilisateur) ; série 88 : Ervald +12,6, Aldric +7,6. Une charge par vol (règle commune des vols) :
    // gravé Ervald +16,3 → +14,2, Aldric +10,9 → +10,4 ; départ contre Fanchon 66,5 → 52,3 %. Refonte des auras
    // (2026-10-28) : l'Aura de pourriture sort (doublon de l'Effroi), l'Emprise devient une relique (Chaîne du geôlier).
    // D16 (2026-10-30) : l'Effroi plafonné à 3 charges (`DREAD_CAP`)
    { id: 'dread', name: "Aura d'effroi", nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'dread', stacks: 1 }], rankAxis: AURA_RANK },
    { id: 'pilfer', name: 'Aura de larcin', nature: 'finesse', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'pilfer', stacks: 1 }], rankAxis: AURA_RANK },
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
      // La Fausse note, renommée Main tremblante le 2026-10-30 (D23) : le malus de l'Ombre, une main qui tremble
      id: 'false-note',
      name: 'Main tremblante',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'falseNote', stacks: 1, power: 1, target: 'opponent' }],
      rankAxis: { kind: 'power', per: 1 },
    },
  ],
  magic: [
    {
      // Phase 8, lot 3 (SORTS.md § 28) : son Orage, une aura qui frappe l'adversaire en dégâts directs ; gravée, elle agit
      // sous ses deux formes. Décision D20 (2026-10-30) : tous les trois tours, trois éclairs de 2
      id: 'storm-sky',
      name: "Aura d'orage",
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [{ type: 'applyStatus', status: 'stormSky', stacks: 1 }],
      rankAxis: AURA_RANK,
    },
    // Les Maîtrises (P9, 2026-10-27) : l'aura du Chant (la Magie depuis B1). Décision D22 (2026-10-30) : une note par coup
    // qui touche ; à la 4e, le refrain (quatre éclats de 2, +4 PV)
    { id: 'ballad', name: 'Aura de ballade', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'ballad', stacks: 1 }], rankAxis: AURA_RANK },
    // Refonte des auras (2026-10-28, § 3.1, § 5.5) : la seconde aura de Thaldrin, le feu qui ne s'éteint plus (il attise
    // ou allume la Brûlure). Décision D11 (2026-10-30) : regroupée, Brûlure +2 tous les deux tours
    { id: 'brasier', name: 'Aura du brasier', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'brasier', stacks: 1 }], rankAxis: AURA_RANK },
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
      // Son rang : +2 par éclair depuis la décision D11 (+1 par éclair sur quatre avant, le même total : +8,7 points gravée
      // en 0.111.0, signalé)
      rankAxis: { kind: 'amount', per: 2 },
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
      rankAxis: { kind: 'power', per: 2 },
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
    // Retour du 2026-10-27 (S10) : un éclair blanc frappe la cible, l'arène blanchit, puis « Aveuglé » (MISE_EN_SCENE.md M54).
    // Passe d'équilibre du 2026-10-31 : Aveuglé pendant 4 tours (jusqu'à la fin du combat avant) ; gravé sur le 3 nu,
    // Ysolde +20,6 → +16,4, Thaldrin +17,4 → +15,0 (400 par duel) ; construit, Thaldrin +21,6 → +18,2 (`npm run ramp`).
    // Retour du 30 octobre (décision ouverte 4, « l'option la moins forte ») : 3 tours. Gravé nu, Ysolde +16,4 → +13,3,
    // Thaldrin +15,0 → +13,3, Fanchon +13,6 → +11,8 ; construit (builds à 8 récompenses, 30 à 40 par porteur), Ysolde
    // +14,6 → +12,0, Thaldrin +12,0 → +10,0, Fanchon +10,8 → +8,9 ; rang II +5,1 à +5,9 (docs/SORTS.md § 35)
    { id: 'blinding', name: 'Éclair aveuglant', nature: 'arcane', trigger: 'naturalThree', scene: 'blindFlash', effects: [{ type: 'applyStatus', status: 'blinded', stacks: 1, turns: 3, target: 'opponent' }], rankAxis: { kind: 'power', per: 1 } },
    // Le Duo (2026-10-25) : des dés de plus à sa prochaine action, joués en entier (la mécanique de Coup de chance). Jusqu'à
    // la 0.120.0, il posait d'abord +1 Aura mélodieuse, et un seul dé de plus. Retour du 2026-10-27 (P7) : l'aura quitte le
    // jeu, le Duo la compense par ses charges, 1 → 3 (quatre dés à l'action suivante). Mesuré (winRate, 300 combats par
    // duel) : sans l'aura, Duo 1 18,5 %, Duo 2 36,9 %, Duo 3 49,4 % ; rang II (4 charges) 56,3 %. Son rang : un dé de plus.
    // Retour du 2026-10-28 (A11, « clairement trop fort ») : 3 → 1 charge. Sous le plafond de 3 dés de plus (A7), le rang II
    // ne donnait plus rien (+1,7) ; gravé, il valait +40,9 chez Ysolde et +34,4 chez Thaldrin à 10 récompenses. Gravé contre
    // le roster nu (200 par duel) : 3 charges +28 à +33, 2 charges +23 à +28, 1 charge +15 à +20 (rang II +10). Refonte des
    // auras (2026-10-28, Q8) : des coups bruts de plus, tout de suite (la rafale de la Curée), aucune boucle ; son rang,
    // un coup de plus. Trois coups, puis un à la mesure d'ensemble (tranche 8) : gravé chez les autres +29,4 → +16,2
    // Renommé Écho le 2026-10-30 (D23) : le coup de plus qui suit le coup du jet, sans la musique
    {
      id: 'duo',
      name: 'Écho',
      nature: 'arcane',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'duo', stacks: 1 }],
      rankAxis: { kind: 'power', per: 1 },
    },
    // D26 (docs/etudes/CONTENU_RETOUR_30.md § 5, n° 9 à 11) : trois sorts. L'Arc électrique lit la Brûlure (le feu appelle
    // la foudre) ; la Boule de feu la pose (la source de Brûlure qui manquait, profondeur de l'offre) ; l'Égide d'orage est
    // la première défense des Arcanes
    {
      id: 'arc-lightning',
      name: 'Arc électrique',
      nature: 'arcane',
      trigger: 'naturalThree',
      scene: 'lightning',
      effects: [{ type: 'damage', amount: 3, target: 'opponent', source: 'lightning', fromStatus: { status: 'burn', who: 'opponent', factor: 2 } }],
      rankAxis: { kind: 'amount', per: 2 },
    },
    {
      id: 'fireball',
      name: 'Boule de feu',
      nature: 'arcane',
      trigger: 'naturalThree',
      effects: [
        { type: 'damage', amount: 4, target: 'opponent', source: 'fire' },
        { type: 'applyStatus', status: 'burn', stacks: 2, target: 'opponent' },
      ],
      rankAxis: { kind: 'amount', per: 2 },
    },
    { id: 'storm-aegis', name: "Égide d'orage", nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'stormAegis', stacks: 2 }], rankAxis: { kind: 'stacks', per: 2 } },
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
