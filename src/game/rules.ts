/*
 * Règles communes du jeu, telles que le compendium les montre (section « Règles »). Une règle est écrite ici
 * une seule fois ; les compétences et les statuts la citent par son id (une pastille qui mène ici) au lieu de la
 * répéter sur chaque carte.
 *
 * Chaque texte décrit le comportement du moteur (`combat.ts`, `statuses.ts`) ; l'audit de fidélité du 2026-10-21
 * les a confrontés au code (docs/AUDIT_COMPENDIUM.md). Une règle change avec le moteur, dans le même lot.
 */

export type RuleGroup = 'turn' | 'dice' | 'dodge' | 'crit' | 'damage' | 'skills' | 'statuses'

export const RULE_GROUPS: Record<RuleGroup, string> = {
  turn: 'Tour',
  dice: 'Dés',
  dodge: 'Esquive',
  crit: 'Critique',
  damage: 'Armure et dégâts',
  skills: 'Déclenchement des compétences',
  statuses: 'Statuts : durée, charges, cumul',
}

export type RuleId =
  | 'initiative'
  | 'phases'
  | 'ko'
  | 'damage-die'
  | 'twin-dice'
  | 'dodge'
  | 'crit'
  | 'modifiers'
  | 'armor'
  | 'shields'
  | 'final-damage'
  | 'direct-damage'
  | 'skill'
  | 'dice-faces'
  | 'forfeit'
  | 'needs-touch'
  | 'reshape'
  | 'volley'
  | 'conditions'
  | 'forms'
  | 'polarity'
  | 'duration'
  | 'auras'
  | 'stacking-add'
  | 'stacking-refresh'
  | 'max-stacks'
  | 'application'

export interface Rule {
  group: RuleGroup
  title: string
  text: string
}

export const RULES: Record<RuleId, Rule> = {
  initiative: {
    group: 'turn',
    title: 'Initiative',
    text: "Chaque combattant lance 1d10, le plus haut frappe en premier (on relance en cas d'égalité). Avant le premier tour, les compétences « au début du combat » des deux combattants agissent, celui de gauche d'abord. Ensuite, les deux jouent chacun à leur tour.",
  },
  phases: {
    group: 'turn',
    title: 'Un tour, trois phases',
    text: "Pour le joueur actif : début de tour (changement de forme ; ses statuts agissent, bonus puis malus ; leurs durées « début » baissent ; puis ses compétences et reliques de début de tour), action (son coup, ou ses coups : deux dés, Furie des vents, Coup de chance ; rien s'il porte la Peur), fin de tour (ses statuts de fin, comme la Brûlure ; leurs durées « fin » ; ses compétences de fin de tour).",
  },
  ko: {
    group: 'turn',
    title: 'Fin du combat',
    text: "Le premier à 0 PV perd, que ce soit à cause d'un coup, d'un effet ou d'un statut. Plus rien ne se déclenche après un K.O. Une limite de sécurité arrête le combat à 1 000 tours ; il est alors gagné aux PV (à égalité, par celui de gauche).",
  },
  'damage-die': {
    group: 'dice',
    title: 'Dé de dégâts',
    text: "L'attaquant lance son dé : un d6 aux faces imprimées (deux pour la barde). Le jet désigne une face (« sur un 4 » : la face 4) ; une face de coup frappe pour la valeur imprimée dessus, propre à chaque personnage. Le jet compte même si le coup est esquivé : les compétences de sa face se déclenchent.",
  },
  'twin-dice': {
    group: 'dice',
    title: 'Deux dés',
    text: 'Un personnage à deux dés lance deux dés à chaque action. Hors double, deux coups séparés, un par dé (esquive et critique chacun). Sur un double qui a sa compétence, celle-ci remplace les deux coups : sans coups à elle (voir Double qui frappe), il ne frappe pas ce tour.',
  },
  dodge: {
    group: 'dodge',
    title: 'Esquive',
    text: "Le défenseur tente d'esquiver (sa chance d'esquive), sauf s'il porte une esquive imposée (Esquive améliorée) : elle réussit sans tirage, même contre une esquive nulle, et perd une charge par coup esquivé. Un coup esquivé ne fait aucun dégât, ne peut pas être critique et ne déclenche rien de ce qui demande de toucher ; il use pourtant une charge de Vol de vie de l'attaquant, sans rien rendre.",
  },
  crit: {
    group: 'crit',
    title: 'Critique',
    text: "Selon sa chance de critique, ou à coup sûr avec Critique assuré (une charge par coup qui touche ; une esquive ne l'use pas) : la valeur du coup (la valeur imprimée de sa face, plus un bonus de relique, ou la somme d'un coup fondu) est multipliée par son multiplicateur (×2 à ×2,5 selon le personnage, plus avec l'Aura de précision), arrondie au plus proche. Les bonus et malus de dégâts viennent après.",
  },
  modifiers: {
    group: 'damage',
    title: 'Modificateurs de dégâts',
    text: "Après le critique, les bonus et malus de dégâts s'appliquent : ceux de l'attaquant (Aura de puissance, Aura sauvage, Force de l'ours), puis ceux du défenseur (Aura d'intimidation). Ils ne sont jamais multipliés par le critique. Le total garde au moins 1.",
  },
  armor: {
    group: 'damage',
    title: 'Armure',
    text: "L'armure du défenseur retire des points, mais le coup fait toujours au moins 1.",
  },
  shields: {
    group: 'damage',
    title: 'Boucliers',
    text: 'Les boucliers du défenseur (Armure temporaire) absorbent ensuite des points, sans faire descendre le coup sous 1, et s’usent d’autant.',
  },
  'final-damage': {
    group: 'damage',
    title: 'Dégâts finaux',
    text: "Les dégâts finaux de l'attaquant (Aura mélodieuse, Fausse note) s'ajoutent ou se retirent en dernier, sur un coup qui touche, sans que l'armure, l'intimidation ni les boucliers ne les touchent ; au moins 1 dégât.",
  },
  'direct-damage': {
    group: 'damage',
    title: 'Dégâts directs',
    text: "Les dégâts directs (poison, saignement, brûlure, foudre, riposte, rétribution, purification…) ignorent l'armure, l'esquive, les boucliers et les bonus de dégâts, et ne sont jamais critiques. Ce ne sont pas des coups, même quand l'écran en montre plusieurs impacts (les trois éclairs de la Foudre, les jauges de la Rétribution) : rien de ce qui réagit à un coup ne part. Seule exception : pile, à Pile ou face, compte comme un coup qui touche.",
  },
  skill: {
    group: 'skills',
    title: 'Compétence',
    text: 'Une capacité propre à un personnage : quand (déclencheur) → quoi (effets). Elle peut avoir une probabilité et un nombre maximal de déclenchements par combat.',
  },
  'dice-faces': {
    group: 'skills',
    title: 'Faces de compétence',
    text: "Chaque personnage a deux compétences, sur les faces 1 et 2 de son d6 ; les quatre autres faces frappent. Exceptions : l'ogre n'en a aucune (il attend sur le 1), le druide a un sort sur chaque face sous forme humaine et aucun en ours, la barde a les siennes sur ses doubles. D'autres compétences se gravent par la forge.",
  },
  forfeit: {
    group: 'skills',
    title: 'Coup sacrifié',
    text: "Une compétence du dé peut sacrifier son coup : ce jet ne frappe pas (ni esquive, ni critique, ni dégâts) et seule la compétence agit. Rien de ce qui attend un coup n'est usé : esquive imposée, Riposte, Vol de vie, Critique assuré, Fausse note et Saignement attendent le suivant.",
  },
  'needs-touch': {
    group: 'skills',
    title: "S'il touche",
    text: "La compétence d'un jet ne se déclenche que si le coup qu'elle accompagne touche : un coup doit toucher pour poser un malus physique. Le jet n'est pas sacrifié, c'est un vrai coup (esquive, critique, modificateurs). Ce qu'elle pose ne réagit pas à ce coup : la plaie de Pourfendre coule dès le coup suivant qui touche l'adversaire.",
  },
  reshape: {
    group: 'skills',
    title: 'Coup transformé',
    text: 'Au lieu de sacrifier le coup, la compétence le change (sa valeur, ou son critique). C’est ensuite un coup normal : esquive, modificateurs, armure, boucliers.',
  },
  volley: {
    group: 'skills',
    title: 'Double qui frappe',
    text: "Une compétence d'un double qui attaque : l'action devient plusieurs coups qui frappent chacun pour la valeur imprimée du double (Siffloter : deux coups de 1). Fondus en un seul, ils valent leur somme (Crescendo : un coup de 3 × 4 = 12 ; Soliste : 15) ; ce coup peut être critique.",
  },
  conditions: {
    group: 'skills',
    title: 'Conditions',
    text: "Une compétence peut exiger que les PV du porteur ou de l'adversaire soient sous une fraction de leur maximum (ou au moins à cette fraction), qu'un statut soit présent (avec un minimum de charges) ou absent, ou qu'un numéro de tour du combat soit atteint (les tours des deux combattants comptent). Toutes les conditions doivent être vraies, et elles sont vérifiées avant le tirage de la probabilité.",
  },
  forms: {
    group: 'skills',
    title: 'Formes',
    text: "Un personnage à formes commence sous sa première forme, puis en change au tout début de chacun de ses tours, sauf le premier. Ses compétences dépendent de sa forme, et chaque forme a ses règles (le druide : un sort à chaque jet en homme, +3 à chaque coup en ours) : ce sont des mécanismes, ni bonus ni malus.",
  },
  polarity: {
    group: 'statuses',
    title: 'Bonus et malus',
    text: "Les statuts sont des effets durables, positifs (bonus) ou négatifs (malus). La polarité décide de l'ordre en début et fin de tour (bonus d'abord) et de ce que visent immunité, garde et purification. Les mécanismes d'une compétence ou d'une forme (jauges de Rétribution, Pile ou face, Furie des vents, Attente, règles de forme du druide) ne sont ni l'un ni l'autre : rien ne les retire ni ne les bloque.",
  },
  duration: {
    group: 'statuses',
    title: 'Durée',
    text: "Un statut dure jusqu'à épuisement de ses charges, ou un nombre de tours de son porteur (fixé par la compétence, ou égal à ses charges pour la Brûlure). Au moment où il se décompte (au début de ses tours, ou à la fin pour certains), il agit d'abord, puis perd un tour. Un statut décompté au début, posé sur l'adversaire, perd donc un tour avant la prochaine action de celui-ci. Un statut décompté à la fin ne l'est pas à la fin du tour où il a été posé.",
  },
  auras: {
    group: 'statuses',
    title: 'Auras',
    text: "Les auras restent jusqu'à la fin du combat, sans durée ; seule une purification peut en retirer une, avec toutes ses charges. Chaque charge renforce l'effet ; en combat, leur anneau dans la barre de compétences affiche cet effet.",
  },
  'stacking-add': {
    group: 'statuses',
    title: 'Cumulable',
    text: "Une nouvelle pose ajoute ses charges, jusqu'au plafond s'il y en a un. Si les deux ont une durée, la plus longue est gardée ; sinon, le statut reste sans durée.",
  },
  'stacking-refresh': {
    group: 'statuses',
    title: 'Non cumulable',
    text: "Une nouvelle pose remplace l'existante (charges et durée), même si elle est plus faible.",
  },
  'max-stacks': {
    group: 'statuses',
    title: 'Plafond',
    text: 'Plafond de charges : un cumul au-delà est ramené au plafond.',
  },
  application: {
    group: 'statuses',
    title: "Pose d'un statut",
    text: "Quand un statut est posé : 1. une immunité (du personnage, ou d'un statut comme l'Aura d'immunité, qui ne s'use pas) le bloque : « résisté » ; 2. sinon, une garde le bloque et perd une charge ; 3. le statut opposé annule ses charges une à une (« neutralisé » s'il n'en reste rien) ; 4. le reste se cumule selon sa règle, jusqu'au plafond (« au maximum » si rien ne change). Les mécanismes de compétence et de forme ne passent pas par ces étapes.",
  },
}

export const RULE_IDS = Object.keys(RULES) as RuleId[]
