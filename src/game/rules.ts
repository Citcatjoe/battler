/*
 * Règles communes du jeu, telles que le compendium les montre (section « Règles »). Une règle est écrite ici
 * une seule fois ; les compétences et les statuts la citent par son id (une pastille qui mène ici) au lieu de la
 * répéter sur chaque carte.
 *
 * Chaque texte décrit le comportement du moteur (`combat.ts`, `statuses.ts`) ; l'audit de fidélité du 2026-10-21
 * les a confrontés au code (docs/AUDIT_COMPENDIUM.md). Une règle change avec le moteur, dans le même lot.
 */

import { DAMAGE_SOURCE_IDS, DAMAGE_SOURCES, DAMAGE_TONES, type DamageSource, type DamageTone } from './damage'
import { typeset } from './typography'

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
  | 'die'
  | 'base-hit'
  | 'dodge'
  | 'crit'
  | 'modifiers'
  | 'armor'
  | 'shields'
  | 'final-damage'
  | 'direct-damage'
  | 'damage-types'
  | 'skill'
  | 'dice-faces'
  | 'hit-relations'
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
  /** Les règles voisines, en liens sous le texte (« Couleurs des dégâts → » sous le coup de base) */
  see?: readonly RuleId[]
}

/** Les sources d'une famille, ou d'une teinte, par leur nom (damage.ts) : « Poison, Saignement, Brûlure, Pourriture » */
const sourceNames = (keep: (s: (typeof DAMAGE_SOURCES)[DamageSource]) => boolean) =>
  DAMAGE_SOURCE_IDS.filter((id) => keep(DAMAGE_SOURCES[id]))
    .map((id) => DAMAGE_SOURCES[id].name)
    .join(', ')
const tints = (Object.keys(DAMAGE_TONES) as DamageTone[]).map((tone) => `${DAMAGE_TONES[tone].label} (${sourceNames((s) => s.tone === tone)})`).join(', ')

export const RULES: Record<RuleId, Rule> = {
  initiative: {
    group: 'turn',
    title: 'Initiative',
    text: "Chaque combattant lance 1d10, le plus haut frappe en premier (on relance en cas d'égalité). Avant le premier tour, les compétences « au début du combat » des deux combattants agissent, celui de gauche d'abord. Ensuite, les deux jouent chacun à leur tour.",
  },
  phases: {
    group: 'turn',
    title: 'Un tour, trois phases',
    text: "Pour le joueur actif : début de tour (changement de forme ; ses statuts agissent, bonus puis malus ; leurs durées « début » baissent ; puis ses compétences et reliques de début de tour), action (son jet et son coup de base, ou ses coups : Furie des vents, Coup de chance, Duo ; rien s'il porte la Peur), fin de tour (ses statuts de fin, comme la Brûlure ; leurs durées « fin » ; ses compétences de fin de tour).",
  },
  ko: {
    group: 'turn',
    title: 'Fin du combat',
    text: "Le premier à 0 PV perd, que ce soit à cause d'un coup, d'un effet ou d'un statut. Plus rien ne se déclenche après un K.O. Une limite de sécurité arrête le combat à 1 000 tours ; il est alors gagné aux PV (à égalité, par celui de gauche).",
  },
  die: {
    group: 'dice',
    title: 'Le dé',
    text: "L'attaquant lance un d6. Le dé ne fait aucun dégât : il désigne une face (« sur un 4 » : la face 4), qui déclenche sa compétence, ou rien (une face nue). Les reliques de face et la dorure lisent aussi la face, que le coup touche ou non.",
  },
  'base-hit': {
    group: 'dice',
    title: 'Coup de base',
    text: "Chaque jet porte un coup de base : sa valeur est tirée dans l'attaque du personnage (« Attaque 5 à 7 »), la même sorte de coup pour tous. C'est un coup : esquive, critique, bonus et malus de dégâts, armure, boucliers, et tout ce qui réagit quand il touche.",
    see: ['damage-types'],
  },
  dodge: {
    group: 'dodge',
    title: 'Esquive',
    text: "Le défenseur tente d'esquiver (sa chance d'esquive), sauf s'il porte une esquive imposée (Esquive améliorée) : elle réussit sans tirage, même contre une esquive nulle, puis disparaît. Un coup esquivé ne fait aucun dégât, ne peut pas être critique et ne déclenche rien de ce qui demande de toucher ; il use pourtant une charge de Vol de vie de l'attaquant, sans rien rendre.",
  },
  crit: {
    group: 'crit',
    title: 'Critique',
    text: "Selon sa chance de critique, ou à coup sûr avec Critique assuré (un seul à la fois, pour la prochaine frappe ; esquivée ou ratée, elle le perd) : la valeur du coup (le coup de base, ×N par Crescendo ou Soliste, plus un bonus de relique ou de dorure) est multipliée par son multiplicateur (×2 ou plus selon le personnage, davantage avec l'Aura de précision), arrondie au plus proche. Les bonus et malus de dégâts viennent après.",
  },
  modifiers: {
    group: 'damage',
    title: 'Modificateurs de dégâts',
    text: "Après le critique, les bonus et malus de dégâts s'appliquent : ceux de l'attaquant (Aura de puissance, Force de l'ours), puis ceux du défenseur (Aura d'intimidation). Ils ne sont jamais multipliés par le critique. Le total garde au moins 1. L'Aura sauvage, elle, monte l'attaque : elle compte avant le critique.",
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
    text: "Les dégâts finaux de l'attaquant (Fausse note) s'additionnent, puis s'ajoutent ou se retirent en dernier, sur un coup qui touche, sans que l'armure, l'intimidation ni les boucliers ne les touchent ; le coup garde au moins 1 dégât.",
  },
  'direct-damage': {
    group: 'damage',
    title: 'Dégâts directs',
    text: "Les dégâts directs (poison, saignement, brûlure, foudre, riposte, rétribution, purification…) ignorent l'armure, l'esquive, les boucliers et les bonus de dégâts, et ne sont jamais critiques. Ce ne sont pas des coups, même quand l'écran en montre plusieurs impacts (les trois éclairs de la Foudre) : rien de ce qui réagit à un coup ne part. Seule exception : pile, à Pile ou face, compte comme un coup qui touche.",
  },
  'damage-types': {
    group: 'damage',
    title: 'Couleurs des dégâts',
    text: `Le chiffre d'un coup est blanc : le coup de base, Pile ou face, la Riposte, la Rétribution. Les dégâts temporaires, ceux d'un statut qui ronge tour après tour (${sourceNames((s) => s.kind === 'temporal')}), prennent la couleur de leur statut ; les dégâts directs de quelques compétences et reliques, celle de leur magie. À l'écran : ${tints}. L'or reste au critique et au coup lourd (pile, dernier coup d'une relâche). La couleur ne change aucune règle.`,
  },
  skill: {
    group: 'skills',
    title: 'Compétence',
    text: 'Une capacité propre à un personnage : quand (déclencheur) → quoi (effets). Elle peut avoir une probabilité et un nombre maximal de déclenchements par combat.',
  },
  'dice-faces': {
    group: 'skills',
    title: 'Faces de compétence',
    text: "Chaque personnage a deux compétences, sur les faces 1 et 2 de son d6 ; les quatre autres faces sont nues : leur jet ne porte que le coup de base. Exceptions : l'ogre n'en a aucune, le druide a un sort sur chaque face sous forme humaine, et en ours ne lance que ses gravures. D'autres compétences se gravent par la forge.",
  },
  'hit-relations': {
    group: 'skills',
    title: 'Greffe, modifie, remplace',
    text: "Une compétence du dé dit ce qu'elle fait du coup de base. Elle se greffe (la règle) : au jet, elle se résout, puis le coup de base part ; ce qu'elle pose agit déjà sur ce coup (Œil de faucon le rend critique ; Coup de chance : le coup part, et l'action suivante a un jet de plus). Elle modifie son coup : il part, et s'il touche, elle se déclenche (Pourfendre : un Saignement de la moitié des PV retirés, dès le coup suivant ; Pile ou face : pile, ce coup ×3), ou elle change la valeur du coup de base (Soliste : coup de base ×3 ; Crescendo : ×2, puis ×1 de plus à chaque fois). Elle remplace le coup : il ne part pas, et elle donne ses propres coups (Furie des vents : deux coups de base par charge, juste après ce jet).",
  },
  conditions: {
    group: 'skills',
    title: 'Conditions',
    text: "Une compétence peut exiger que les PV du porteur ou de l'adversaire soient sous une fraction de leur maximum (ou au moins à cette fraction), qu'un statut soit présent (avec un minimum de charges) ou absent, ou qu'un numéro de tour du combat soit atteint (les tours des deux combattants comptent). Toutes les conditions doivent être vraies, et elles sont vérifiées avant le tirage de la probabilité.",
  },
  forms: {
    group: 'skills',
    title: 'Formes',
    text: "Un personnage à formes commence sous sa première forme, puis en change au tout début de chacun de ses tours, sauf le premier. Ses compétences dépendent de sa forme, et chaque forme a ses règles (le druide : un sort à chaque jet, greffé sur son coup de base, en homme ; en ours, seules ses gravures partent, et un coup de base à +3) : ce sont des mécanismes, ni bonus ni malus.",
  },
  polarity: {
    group: 'statuses',
    title: 'Bonus et malus',
    text: "Les statuts sont des effets durables, positifs (bonus) ou négatifs (malus). La polarité décide de l'ordre en début et fin de tour (bonus d'abord) et de ce que visent immunité, garde et purification. Une purification retire un statut avec toutes ses charges ; « son dernier bonus posé » est le dernier apparu (un statut renforcé garde son rang, il ne redevient pas le dernier). Les mécanismes d'une compétence ou d'une forme (jauges de Rétribution, Pile ou face, Furie des vents, règles de forme du druide) ne sont ni l'un ni l'autre : rien ne les retire ni ne les bloque.",
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

// Typographie française (passe compendium, 2026-10-25) : l'espace insécable devant « : ; ! ? % » et dans les guillemets
for (const rule of Object.values(RULES)) rule.text = typeset(rule.text)

export const RULE_IDS = Object.keys(RULES) as RuleId[]
