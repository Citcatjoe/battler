/*
 * Règles communes du jeu, telles que le compendium les montre (section « Règles »). Une règle est écrite ici
 * une seule fois ; les compétences et les statuts la citent par son id (une pastille qui mène ici) au lieu de la
 * répéter sur chaque carte.
 *
 * Ces textes ne sont pas réécrits : ils sont regroupés depuis l'endroit où ils existaient déjà (source entre
 * crochets dans chaque commentaire). Seuls les numéros de version, les noms de champs du code et les renvois aux
 * documents ont été retirés ; les écarts avec le code relevés par l'audit sont listés dans docs/AUDIT_COMPENDIUM.md.
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
  | 'cast-turn'
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
  // [FEATURES § 1, Initiative]
  initiative: {
    group: 'turn',
    title: 'Initiative',
    text: "Chaque combattant lance 1d10, le plus haut frappe en premier (on relance en cas d'égalité). Ensuite, les deux frappent chacun à leur tour.",
  },
  // [FEATURES § 1, Un tour = trois phases]
  phases: {
    group: 'turn',
    title: 'Un tour, trois phases',
    text: "Pour le joueur actif (l'attaquant) : début de tour (ses statuts périodiques agissent, bonus puis malus, et leurs durées diminuent), action (l'attaque, deux coups sous Furie des vents, ou un tour perdu s'il est Étourdi), fin de tour (effets de fin de tour, comme la Brûlure, et durées « fin »).",
  },
  // [FEATURES § 1, Fin]
  ko: {
    group: 'turn',
    title: 'Fin du combat',
    text: "Le premier à 0 PV perd, que ce soit à cause d'un coup, d'un effet ou d'un statut. Plus rien ne se déclenche après un K.O. Une limite de sécurité arrête le combat à 1 000 tours ; il est alors gagné aux PV.",
  },
  // [FEATURES § 1, Attaque, étape 1] La fourchette « 1d8 à 1d10 », fausse (2 × d5 à d14), n'est pas reprise.
  'damage-die': {
    group: 'dice',
    title: 'Dé de dégâts',
    text: "L'attaquant lance son dé de dégâts, propre à chaque personnage. Le dé reste affiché même si le coup est esquivé. Les stats utilisées sont les stats effectives, modifiées par les statuts.",
  },
  // [FEATURES § 1, Deux dés]
  'twin-dice': {
    group: 'dice',
    title: 'Deux dés',
    text: "Un personnage à deux dés lance deux dés à chaque action. Hors double, deux coups séparés, un par dé (esquive et critique chacun) ; sur un double qui a sa compétence, celle-ci remplace les deux coups.",
  },
  // [FEATURES § 1, Attaque, étape 2]
  dodge: {
    group: 'dodge',
    title: 'Esquive',
    text: "Le défenseur tente d'esquiver (sa chance d'esquive), sauf s'il porte une esquive imposée (Esquive améliorée), qui réussit sans tirage. S'il esquive, le coup ne fait aucun dégât.",
  },
  // [FEATURES § 1, Attaque, étape 3]
  crit: {
    group: 'crit',
    title: 'Critique',
    text: 'Sa chance de critique, ou forcé par un statut : le jet est multiplié par son multiplicateur (×2 à ×2,5), arrondi.',
  },
  // [FEATURES § 1, Attaque, étape 4]
  modifiers: {
    group: 'damage',
    title: 'Modificateurs de dégâts',
    text: "Les modificateurs de dégâts s'appliquent : sortants, de l'attaquant (ex. Affaibli), puis entrants, du défenseur (ex. Vulnérable). Le coup garde au moins 1.",
  },
  // [FEATURES § 1, Attaque, étape 5]
  armor: {
    group: 'damage',
    title: 'Armure',
    text: "L'armure du défenseur retire des points, mais le coup fait toujours au moins 1.",
  },
  // [FEATURES § 1, Attaque, étape 6]
  shields: {
    group: 'damage',
    title: 'Boucliers',
    text: 'Les boucliers du défenseur (ex. armure temporaire) absorbent ensuite des points, sans faire descendre le coup sous 1, et s’usent d’autant.',
  },
  // [FEATURES § 1, Attaque, étape 6 bis]
  'final-damage': {
    group: 'damage',
    title: 'Dégâts finaux',
    text: "Les dégâts finaux de l'attaquant (Aura mélodieuse, Fausse note) s'ajoutent ou se retirent en dernier, sans que l'armure ni l'intimidation ne les touchent ; au moins 1 dégât.",
  },
  // [FEATURES § 3, Effets disponibles ; events.ts, Effect « damage »]
  'direct-damage': {
    group: 'damage',
    title: 'Dégâts directs',
    text: "Les dégâts directs ignorent l'armure, l'esquive et les boucliers.",
  },
  // [FEATURES § 3, définition d'un événement]
  skill: {
    group: 'skills',
    title: 'Compétence',
    text: 'Une capacité propre à un personnage : quand (déclencheur) → quoi (effets). Elle peut avoir une probabilité et un nombre maximal de déclenchements par combat.',
  },
  // [FEATURES § 3, Compétences en jeu]
  'dice-faces': {
    group: 'skills',
    title: 'Faces de compétence',
    text: 'Les compétences se déclenchent sur un 1, un 2 et un 3 au dé de dégâts du porteur. Le 3 donne une aura permanente.',
  },
  // [FEATURES § 3, Effets disponibles et Compétences en jeu]
  forfeit: {
    group: 'skills',
    title: 'Coup sacrifié',
    text: "Une compétence du dé peut sacrifier son coup : le coup du déclenchement n'inflige rien, sans esquive ni critique. Elle se déclenche même si le coup est esquivé, à condition que le défenseur soit encore debout.",
  },
  // [events.ts, needsTouch]
  'needs-touch': {
    group: 'skills',
    title: "S'il touche",
    text: "La compétence d'un jet ne se déclenche que si le coup qu'elle accompagne touche : un coup doit toucher pour poser un malus physique. Le jet n'est pas sacrifié, c'est un vrai coup (esquive, critique, modificateurs).",
  },
  // [FEATURES § 3, Coups transformés]
  reshape: {
    group: 'skills',
    title: 'Coup transformé',
    text: 'Au lieu de sacrifier le coup, la compétence le change. Charge frappe pour la valeur maximale du dé, sans critique possible ; Coup de griffe relance le dé en secret et ajoute 3. C’est ensuite un coup normal : esquive, modificateurs, armure, boucliers.',
  },
  // [events.ts, volley et merged]
  volley: {
    group: 'skills',
    title: 'Double qui frappe',
    text: "Une compétence d'un double qui attaque : l'action devient plusieurs coups dont le dé vaut la face du double (Crescendo : trois coups de 4). Fondus en un seul, ils valent leur somme (Soliste : un coup de 3 × 5 = 15).",
  },
  // [FEATURES § 3, Conditions]
  conditions: {
    group: 'skills',
    title: 'Conditions',
    text: "Une compétence peut exiger que les PV du porteur ou de l'adversaire soient sous (ou au-dessus d') une fraction de leur maximum, qu'un statut soit présent (avec un minimum de charges) ou absent, ou qu'un tour minimal soit atteint. Toutes les conditions doivent être vraies, et elles sont vérifiées avant le tirage de la probabilité.",
  },
  // [FEATURES § 3, Personnages à formes]
  forms: {
    group: 'skills',
    title: 'Formes',
    text: 'Un personnage à formes commence sous sa première forme, puis en change au tout début de chacun de ses tours, sauf le premier. Ses compétences dépendent de sa forme.',
  },
  // [FEATURES § 3, Statuts]
  polarity: {
    group: 'statuses',
    title: 'Bonus et malus',
    text: 'Les statuts sont des effets durables, positifs (bonus) ou négatifs (malus).',
  },
  // [statuses.ts, STATUS_DURATION_RULE]
  duration: {
    group: 'statuses',
    title: 'Durée',
    text: "Un statut dure jusqu'à épuisement de ses charges, ou pendant le nombre de tours du porteur fixé par l'effet qui le pose. La durée est décomptée au début de chacun de ses tours (à la fin pour certains statuts), mais jamais à la fin du tour où le statut a été posé.",
  },
  // [FEATURES § 3, Durées]
  'cast-turn': {
    group: 'statuses',
    title: 'Tour de la pose',
    text: "Un statut posé pendant un tour n'est pas décompté à la fin de ce tour.",
  },
  // [FEATURES § 3, Durées]
  auras: {
    group: 'statuses',
    title: 'Auras',
    text: "Les auras n'ont pas de durée : leur médaillon affiche leurs charges.",
  },
  // [statuses.ts, statusRules]
  'stacking-add': {
    group: 'statuses',
    title: 'Cumulable',
    text: 'Une nouvelle application ajoute ses charges, la durée garde la plus longue.',
  },
  // [statuses.ts, statusRules]
  'stacking-refresh': {
    group: 'statuses',
    title: 'Non cumulable',
    text: "Une nouvelle application remplace l'existante (charges et durée).",
  },
  // [statuses.ts, StatusDef.maxStacks]
  'max-stacks': {
    group: 'statuses',
    title: 'Plafond',
    text: 'Plafond de charges : un cumul au-delà est ramené au plafond.',
  },
  // [statuses.ts, resolveApplication]
  application: {
    group: 'statuses',
    title: "Pose d'un statut",
    text: 'Pose un statut en appliquant, dans cet ordre, les règles de résolution : immunité du personnage (bloqué) ; garde d’un statut du porteur (bloqué, la garde perd une charge) ; opposition (les charges s’annulent une à une avec le statut opposé) ; cumul et plafond pour ce qui reste.',
  },
}

export const RULE_IDS = Object.keys(RULES) as RuleId[]
