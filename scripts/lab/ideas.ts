/*
 * Idées de sorts à essayer au laboratoire (`scripts/lab.report.ts`, méthode : docs/SORTS.md).
 * Une idée modifie UN personnage précis avec les briques existantes : déclencheurs (`events.ts`), relation au coup
 * de base (`relation` : greffe par défaut, `modify`, `replace`), conditions `when`, `chance`, `limit`, statuts du
 * registre. Une idée peut aussi déclarer des statuts d'essai (`statuses`), construits avec les crochets existants :
 * ils ne vivent que le temps du laboratoire et ne touchent pas au registre. Rien ici n'est livré au jeu.
 *
 * Séries 1 à 13 (avant les règles v2) : retirées en 0.106.0. Elles visaient des personnages et des mécanismes qui
 * n'existent plus (variantes de race, Attente, coup sacrifié, valeurs imprimées, Rage du sang, Écorce…) ; leurs
 * résultats restent dans docs/SORTS.md, leur code dans l'historique git (commit 7c75781).
 *
 * Séries 18 à 23 (phase 8, premier lot de consommatrices) : retirées en 0.114.0, quand le lot est entré au registre.
 * Leurs statuts d'essai portaient les ids du registre (`quarry`, `sentence`, `grudge`, ce dernier en version Ferveur) et
 * auraient remplacé les statuts livrés ; la Virulence y était émulée par des seuils, que `fromStatus` remplace. Leurs
 * résultats restent dans docs/SORTS.md § 22 et dans les rapports `logs/lab/2026-10-24-22-*`.
 *
 * Séries 24 à 27 (phase 8, second lot : Embrasement, Dé pipé, Rempart hérissé, Vindicte et leurs reliques ; la décoction
 * de Naraxes à 2 Poison) : retirées quand le lot est entré au registre, comme le premier (statuts d'essai `lab…`, et un
 * Dé pipé d'essai à l'ancienne forme de `loadsCoin`). Leurs résultats restent dans docs/SORTS.md § 23 et dans les
 * rapports `logs/lab/2026-10-24-23-56-16`, `2026-10-24-23-59-27`, `2026-10-25-00-01-08` et `2026-10-25-00-02-29`.
 *
 * Série 28 (calage de campagne, nuit du 2026-10-25 : un rang qui ajoute de la ressource ou de la fréquence aux trois rangs
 * II du second lot sous la bande) : retirée une fois l'axe du Rempart hérissé passé au registre (ses rangs s'y lisaient
 * par aiguisages successifs, à l'axe d'alors). Résultats : docs/SORTS.md § 23, rapports `logs/lab/2026-10-25-00-39-04`
 * et `2026-10-25-00-39-53`.
 *
 * Séries 15 et 29 (la barde : son kit sur ses deux dés, phase 5 ter ; puis Fanchon à un seul d6, agent FanchonLab) :
 * retirées quand le Duo est entré au registre (2026-10-25). Ses deux dés n'existent plus ; le statut d'essai `labDuo`
 * est devenu le statut `duo`. Résultats : docs/SORTS.md, docs/PERSONNAGES.md (Fanchon), rapports
 * `logs/lab/2026-10-25-08-21-26_v0.115.1.md` et `2026-10-25-08-27-03_v0.115.1.md`.
 */
import { Character, type CharacterStats } from '../../src/game/character'
import { faceTrigger, rollFace, type CharacterEvent } from '../../src/game/events'
import { getRelic, type Relic } from '../../src/game/relics'
import { ALL_SKILLS, CHARACTERS } from '../../src/game/roster'
import { charges, STATUSES, type StatusDef, type StatusId } from '../../src/game/statuses'
import { AURA_VISION } from './aura-vision'
import { CONTENT_A } from './content-a'
import { CONTENT_B } from './content-b'
import { CONTENU_30 } from './contenu-30'
import { PERSOS_30 } from './persos-30'

export interface LabIdea {
  id: string
  /** Série d'essais : 14 = les relations au coup de base (phase 5 bis, 0.106.0) */
  series: number
  /** Personnage modifié (id du roster) */
  character: string
  name: string
  /** Schéma de sort (docs/SORTS.md § 2) */
  schema: string
  /** Famille d'effets (docs/FAMILLES.md) */
  family: string
  /** La phrase en jeu */
  pitch: string
  apply: (c: Character) => Character
  /** Compétences ou statuts dont on compte les déclenchements (« moments ») */
  watch: readonly string[]
  /** Statuts d'essai, ajoutés au registre le temps du laboratoire */
  statuses?: Record<string, StatusDef>
  /**
   * Règle du monde (faire vivre les auras, B11, 2026-10-27) : posée sur tout le roster, avant comme après (le personnage
   * et ses adversaires). Sert à mesurer une amélioration (relique, forge) dans un monde où une règle a changé.
   */
  world?: (c: Character) => Character
  /** Règle pour tous : ses adversaires reçoivent aussi l'idée (après seulement) ; `apply` vaut alors pour tout personnage */
  everyone?: boolean
  /** Statut dont le rapport mesure la présence chez le personnage (part de ses actions où il le porte) */
  presence?: StatusId
}

/** Remplace une compétence existante (toutes ses faces : la Foudre du druide en a trois). */
const replace =
  (id: string, next: (old: CharacterEvent) => CharacterEvent) =>
  (c: Character) =>
    c.adjusted({ events: c.events.map((e) => (e.id === id ? next(e) : e)) })

/* --- Série 14 : les relations au coup de base (phase 5 bis, 0.106.0, docs/RESOLUTION.md § 3 bis). Chaque idée
   rejoue un choix fait pendant la phase contre la règle livrée. --- */
const SERIES_14: LabIdea[] = [
  {
    series: 14,
    id: 'gorak-pourfendre-greffe',
    character: 'gorak',
    name: 'Pourfendre greffé',
    schema: 'Relation au coup',
    family: 'Affliction',
    pitch: 'Pourfendre se greffe au lieu de modifier son coup : Saignement 2 au jet, même si le coup de base est esquivé.',
    apply: replace('cleave', ({ relation: _relation, ...e }) => e),
    watch: ['cleave', 'bleed'],
  },
  {
    series: 14,
    id: 'thaldrin-foudre-3x2',
    character: 'thaldrin',
    name: 'Foudre 3×2',
    schema: 'Petite touche',
    family: 'Dégâts directs',
    pitch: 'La Foudre garde ses trois coups de 2 de la 0.105.0, en plus du coup de base qui la suit désormais.',
    apply: replace('thunderbolt', (e) => ({ ...e, effects: e.effects.map((x) => (x.type === 'damage' ? { ...x, amount: 2 } : x)) })),
    watch: ['thunderbolt'],
  },
]

/* --- Série 16 : la revue des compétences (phase 5 ter, partie B, 0.107.0, docs/SORTS.md § 19). Rétribution baissée,
   au choix : la moitié des jauges (arrondie au-dessus), ou deux jauges au lieu de trois ; compensations possibles :
   Riposte à 3 charges, ou +1 à l'attaque. « Deux jauges » se mesure en changeant `fillsOnHurt.slots` du registre (un
   statut d'essai à jauges ne se remplit pas : le moteur lit la liste des statuts à jauges au chargement). --- */
const halfRetribution = replace('retribution', (e) => ({ ...e, effects: e.effects.map((x) => (x.type === 'release' ? { ...x, share: 0.5 } : x)) }))
/** Riposte à 3 charges : un statut d'essai, au plafond de 3 */
const RIPOSTE_3 = 'riposteThree' as StatusId

const SERIES_16: LabIdea[] = [
  {
    series: 16,
    id: 'aldric-retri-moitie',
    character: 'aldric',
    name: 'Rétribution : la moitié',
    schema: 'Petite touche',
    family: 'Représailles',
    pitch: 'Sur le 1, Aldric relâche la moitié de ses jauges, arrondie au-dessus.',
    apply: halfRetribution,
    watch: ['retribution'],
  },
  {
    series: 16,
    id: 'aldric-retri-moitie-riposte3',
    character: 'aldric',
    name: 'Rétribution : la moitié, Riposte 3',
    schema: 'Compensation',
    family: 'Représailles',
    pitch: 'La moitié des jauges, et la Riposte pose 3 charges (plafond 3).',
    apply: (c) =>
      halfRetribution(c).adjusted({
        events: halfRetribution(c).events.map((e) => (e.id === 'riposte' ? { ...e, effects: [{ type: 'applyStatus', status: RIPOSTE_3, stacks: 3 }] } : e)),
      }),
    watch: ['retribution', 'riposte'],
    statuses: { [RIPOSTE_3]: { ...STATUSES.riposte, maxStacks: 3 } },
  },
  {
    series: 16,
    id: 'aldric-retri-moitie-att',
    character: 'aldric',
    name: 'Rétribution : la moitié, attaque 4 à 6',
    schema: 'Compensation',
    family: 'Représailles',
    pitch: 'La moitié des jauges, et +1 à l’attaque (4 à 6 au lieu de 3 à 5).',
    apply: (c) => halfRetribution(c).adjusted({ stats: { attackMin: c.stats.attackMin + 1, attackMax: c.stats.attackMax + 1 } }),
    watch: ['retribution'],
  },
  {
    series: 16,
    id: 'aldric-att',
    character: 'aldric',
    name: 'Attaque 4 à 6 seule',
    schema: 'Compensation',
    family: 'Représailles',
    pitch: '+1 à l’attaque, la Rétribution du registre : avec deux jauges au registre, c’est « deux jauges, attaque 4 à 6 ».',
    apply: (c) => c.adjusted({ stats: { attackMin: c.stats.attackMin + 1, attackMax: c.stats.attackMax + 1 } }),
    watch: ['retribution'],
  },
  {
    series: 16,
    id: 'aldric-temoin',
    character: 'aldric',
    name: 'Témoin (kit livré)',
    schema: 'Repère',
    family: 'Représailles',
    pitch: 'Le kit tel qu’il est : sa colonne « avant » sert de repère quand on change le registre (deux jauges).',
    apply: (c) => c,
    watch: ['retribution'],
  },
]

/* --- Série 17 : l'équilibre du roster après la revue (0.107.0). Chaque idée retouche les stats d'un personnage (attaque
   et stats secondaires d'abord, les PV en dernier), contre le roster de la revue. --- */
function tune(id: string, character: string, name: string, stats: Partial<CharacterStats>): LabIdea {
  return { series: 17, id, character, name, schema: 'Réglage', family: 'Stats', pitch: name, apply: (c) => c.adjusted({ stats }), watch: [] }
}

const SERIES_17: LabIdea[] = [
  tune('aldric-att46', 'aldric', 'Attaque 4 à 6', { attackMin: 4, attackMax: 6 }),
  tune('aldric-att46-crit20', 'aldric', 'Attaque 4 à 6, critique 20 %', { attackMin: 4, attackMax: 6, critChance: 0.2 }),
  tune('aldric-att57', 'aldric', 'Attaque 5 à 7', { attackMin: 5, attackMax: 7 }),
  tune('ysolde-att57', 'ysolde', 'Attaque 5 à 7', { attackMin: 5, attackMax: 7 }),
  tune('ysolde-att56', 'ysolde', 'Attaque 5 à 6', { attackMin: 5, attackMax: 6 }),
  tune('ysolde-att58', 'ysolde', 'Attaque 5 à 8', { attackMin: 5, attackMax: 8 }),
  tune('naraxes-att56', 'naraxes', 'Attaque 5 à 6', { attackMin: 5, attackMax: 6 }),
  tune('naraxes-att57', 'naraxes', 'Attaque 5 à 7', { attackMin: 5, attackMax: 7 }),
  tune('naraxes-att56-crit20', 'naraxes', 'Attaque 5 à 6, critique 20 %', { attackMin: 5, attackMax: 6, critChance: 0.2 }),
  tune('ervald-att56', 'ervald', 'Attaque 5 à 6', { attackMin: 5, attackMax: 6 }),
  tune('ervald-crit22', 'ervald', 'Critique 22 %', { critChance: 0.22 }),
  tune('gorak-crit12', 'gorak', 'Critique 12 %', { critChance: 0.12 }),
  tune('gorak-att46', 'gorak', 'Attaque 4 à 6', { attackMin: 4, attackMax: 6 }),
  tune('gorak-att45', 'gorak', 'Attaque 4 à 5', { attackMin: 4, attackMax: 5 }),
  tune('brokk-crit2', 'brokk', 'Critique ×2', { critMultiplier: 2 }),
  tune('brokk-att46', 'brokk', 'Attaque 4 à 6', { attackMin: 4, attackMax: 6 }),
  tune('morgrut-att78', 'morgrut', 'Attaque 7 à 8', { attackMin: 7, attackMax: 8 }),
  tune('morgrut-pv55', 'morgrut', '55 PV', { maxHp: 55 }),
  tune('elaria-crit12', 'elaria', 'Critique 12 %', { critChance: 0.12 }),
  tune('elaria-esq19', 'elaria', 'Esquive 19 %', { dodgeChance: 0.19 }),
  tune('thaldrin-att33', 'thaldrin', 'Attaque 3', { attackMin: 3, attackMax: 3 }),
  tune('thaldrin-crit4', 'thaldrin', 'Critique 4 %', { critChance: 0.04 }),
]

/* Deuxième tour (série 17) : après les premières compensations (Aldric 4 à 6, Ysolde 5 à 6, Naraxes 5 à 6, Ervald 20 %
   de critique, Gorak 14 %), les personnages encore hors tolérance. */
const lightOf = (amount: number) =>
  replace('purification', (e) => ({
    ...e,
    effects: e.effects.map((x) => (x.type === 'cleanse' && x.orElse?.type === 'damage' ? { ...x, orElse: { ...x.orElse, amount } } : x)),
  }))
const SERIES_17_B: LabIdea[] = [
  tune('ysolde-att57-b', 'ysolde', 'Attaque 5 à 7', { attackMin: 5, attackMax: 7 }),
  { ...tune('ysolde-lumiere7', 'ysolde', 'Purification : lumière 7', {}), apply: lightOf(7), watch: ['purification'] },
  { ...tune('ysolde-lumiere8', 'ysolde', 'Purification : lumière 8', {}), apply: lightOf(8), watch: ['purification'] },
  tune('ysolde-crit16', 'ysolde', 'Critique 16 %', { critChance: 0.16 }),
  tune('ervald-crit24', 'ervald', 'Critique 24 %', { critChance: 0.24 }),
  tune('ervald-esq12', 'ervald', 'Esquive 12 %', { dodgeChance: 0.12 }),
  tune('fanchon-att23', 'fanchon', 'Attaque 2 à 3', { attackMin: 2, attackMax: 3 }),
  tune('fanchon-crit16', 'fanchon', 'Critique 16 %', { critChance: 0.16 }),
  tune('fanchon-esq10', 'fanchon', 'Esquive 10 %', { dodgeChance: 0.1 }),
]

/* --- Série 70 : les Maîtrises, dés de départ (retour du 2026-10-27, docs/MAITRISES.md § 5). Le dé vanilla devient une
   aura sur le 1 (choisie parmi celles de ses deux maîtrises) et une face 2 fixe (sa compétence de personnage), quatre
   faces nues. Chaque idée mesure un dé de départ contre le roster nu d'aujourd'hui (le « avant » est le dé vanilla
   actuel). Les auras nouvelles sont des statuts d'essai construits avec les crochets existants. --- */
/**
 * Compétences sorties du registre depuis leur série (refonte des auras, 2026-10-28 : Aura sauvage, d'intimidation,
 * d'immunité, de précision, Sève noire, Dette de sang, Rempart hérissé…). Leurs idées ne se rejouent plus : elles
 * restent ici pour l'historique et sont écartées d'`IDEAS` (rapport du 2026-10-30, agent PropContenu).
 */
const RETIRED = new Set<string>()
const skill = (id: string): CharacterEvent => {
  const found = ALL_SKILLS.find((e) => e.id === id)
  if (found) return found
  RETIRED.add(id)
  return { id, name: `${id} (retirée)`, trigger: 'combatStart', effects: [] }
}
/** Une compétence posée sur une face ; sous forme humaine seulement pour le druide (ses sorts) */
const onFace = (e: CharacterEvent, face: number, form?: string): CharacterEvent => ({ ...e, trigger: faceTrigger(face), ...(form ? { form } : {}) })
const auraSkill = (id: string, name: string, status: StatusId): CharacterEvent => ({ id, name, trigger: 'naturalOne', effects: [{ type: 'applyStatus', status, stacks: 1 }] })

const LAB_BLEED_AURA = 'labBleedAura' as StatusId
const LAB_VEIN = 'labVein' as StatusId
const LAB_DREAD = 'labDread' as StatusId
const LAB_STORM_FIELD = 'labStormField' as StatusId
const LAB_AEGIS = 'labAegis' as StatusId
const LAB_BALLAD = 'labBallad' as StatusId
const LAB_CRIT_ROT = 'labCritRot' as StatusId
const LAB_STONE_FIST = 'labStoneFist' as StatusId
const LAB_RANCOR = 'labRancor' as StatusId
const aura = (name: string, rest: Partial<StatusDef>): StatusDef => ({ ...STATUSES.sidestep, modifyStats: undefined, name, summary: name, describe: () => name, badge: (s) => `+${charges(s)}`, stacking: 'add', ...rest })
const SERIES_70_STATUSES: Record<string, StatusDef> = {
  // Plaie ouverte refaite (M9) : la décoction du Sang, visible à chaque coup
  [LAB_BLEED_AURA]: aura('Plaie ouverte (1 par coup)', { family: 'affliction', reactions: { hit: (s) => [{ type: 'applyStatus', status: 'bleed', stacks: charges(s), target: 'opponent' }] } }),
  // Veine (Chance) : chaque 6 au dé, un jet de plus à sa prochaine action
  [LAB_VEIN]: aura('Veine', { family: 'fortune', reactions: { naturalMax: (s) => [{ type: 'applyStatus', status: 'luckyStrike', stacks: charges(s) }] } }),
  // Effroi (Ombre) : chaque critique fait perdre sa prochaine action à l'adversaire
  [LAB_DREAD]: aura('Effroi', { family: 'tempo', reactions: { crit: () => [{ type: 'applyStatus', status: 'fear', stacks: 1, target: 'opponent' }] } }),
  // Pourriture au critique (Ombre, variante bornée de l'Aura de pourriture)
  [LAB_CRIT_ROT]: aura('Pourriture au critique', { family: 'affliction', reactions: { crit: (s) => [{ type: 'applyStatus', status: 'rot', stacks: charges(s), target: 'opponent' }] } }),
  // Champ d'orage (Orage) : chaque coup reçu foudroie l'attaquant, 1 PV par charge
  [LAB_STORM_FIELD]: aura("Champ d'orage", { family: 'affliction', reactions: { hurt: (s) => [{ type: 'damage', amount: charges(s), target: 'opponent', source: 'lightning' }] } }),
  // Écu vengeur (Rempart, « l'armure en dégâts ») : son armure temporaire vidée, l'adversaire perd 4 PV par charge
  [LAB_AEGIS]: aura('Écu vengeur', { family: 'guard', reactions: { shieldBroken: (s) => [{ type: 'damage', amount: 4 * charges(s), target: 'opponent', source: 'strike' }] } }),
  // Ballade (Chant, P9) : chaque coup qui touche lui rend 1 PV par charge
  [LAB_BALLAD]: aura('Ballade', { family: 'healing', reactions: { hit: (s) => [{ type: 'heal', amount: charges(s) }] } }),
  // Poing de pierre (Brokk, « l'armure en dégâts ») : posé avec la Peau de pierre, +2 à ses coups tant que son armure
  // temporaire tient ; il part quand elle est vidée
  [LAB_STONE_FIST]: { ...STATUSES.sidestep, look: undefined, modifyStats: undefined, name: 'Poing de pierre', summary: 'Poing de pierre', describe: () => 'Poing de pierre', badge: () => '+2', stacking: 'refresh', maxStacks: 1, family: 'power', modifyOutgoing: (d) => d + 2, reactions: { shieldBroken: () => [] }, spentOnReaction: true },
  // Rancœur (Représailles) : chaque coup reçu lui donne +1 Ferveur par charge (son prochain coup qui touche fait plus)
  [LAB_RANCOR]: aura('Rancœur', { family: 'retaliation', reactions: { hurt: (s) => [{ type: 'applyStatus', status: 'momentum', stacks: charges(s) }] } }),
}
const NEW_AURAS = {
  bleed: auraSkill('lab-bleed-aura', 'Plaie ouverte (1 par coup)', LAB_BLEED_AURA),
  vein: auraSkill('lab-vein', 'Veine', LAB_VEIN),
  dread: auraSkill('lab-dread', 'Effroi', LAB_DREAD),
  critRot: auraSkill('lab-crit-rot', 'Pourriture au critique', LAB_CRIT_ROT),
  rot: auraSkill('lab-rot', 'Aura de pourriture', 'rotAura'),
  rancor: auraSkill('lab-rancor', 'Rancœur', LAB_RANCOR),
  stormField: auraSkill('lab-storm-field', "Champ d'orage", LAB_STORM_FIELD),
  aegis: auraSkill('lab-aegis', 'Écu vengeur', LAB_AEGIS),
  ballad: auraSkill('lab-ballad', 'Ballade', LAB_BALLAD),
}

/** Un dé de départ : l'aura sur le 1, la face 2, quatre faces nues (et rien d'autre). */
function start(character: string, id: string, name: string, first: CharacterEvent | string | undefined, second: CharacterEvent | string | undefined, opts: { form?: string; extra?: CharacterEvent[]; watch?: string[]; stats?: Partial<CharacterStats> } = {}): LabIdea {
  const of = (e: CharacterEvent | string) => (typeof e === 'string' ? skill(e) : e)
  const events = [...(first ? [onFace(of(first), 1, opts.form)] : []), ...(second ? [onFace(of(second), 2, opts.form)] : []), ...(opts.extra ?? [])]
  return {
    series: 70,
    id,
    character,
    name,
    schema: 'Dé de départ',
    family: 'Maîtrises',
    pitch: name,
    apply: (c: Character) => c.adjusted({ events, ...(opts.stats && { stats: opts.stats }) }),
    watch: opts.watch ?? events.map((e) => e.id),
    statuses: SERIES_70_STATUSES,
  }
}
/** Pièce lestée (+25 % de pile) portée d'office : la borne haute du Dé pipé en aura (« +25 % de chances de faire pile ») */
const loadedFromStart = (idea: LabIdea): LabIdea => ({ ...idea, apply: (c) => idea.apply(c).withRelics([getRelic('weighted-coin')]) })
const H = 'human'

// Série 70 (0.121.0) : les paires de maîtrises d'alors (onze maîtrises), gardées telles quelles pour
// rejouer la série ; les paires en vigueur depuis la 0.122.0 sont dans docs/MAITRISES.md « Huit maîtrises ».
const SERIES_70: LabIdea[] = [
  // Gorak (Fureur + Sang) : la Furie des vents sur le 2
  start('gorak', 'm-gorak-puissance', 'Gorak : Puissance / Furie', 'power-aura', 'wind-fury'),
  start('gorak', 'm-gorak-sauvage', 'Gorak : Sauvage / Furie', 'wild-aura', 'wind-fury'),
  start('gorak', 'm-gorak-ivresse', 'Gorak : Ivresse du sang / Furie', 'blood-frenzy', 'wind-fury'),
  start('gorak', 'm-gorak-plaie', 'Gorak : Plaie ouverte (critique) / Furie', 'open-wound', 'wind-fury'),
  start('gorak', 'm-gorak-plaie2', 'Gorak : Plaie ouverte (1 par coup) / Furie', NEW_AURAS.bleed, 'wind-fury'),
  // Elaria (Chasse + Sang) : l'Œil de faucon sur le 2
  start('elaria', 'm-elaria-precision', 'Elaria : Précision / Œil', 'precision-aura', 'hawk-eye'),
  start('elaria', 'm-elaria-pas', 'Elaria : Pas de côté / Œil', 'sidestep', 'hawk-eye'),
  start('elaria', 'm-elaria-feinte', 'Elaria : Feinte / Œil', 'feint', 'hawk-eye'),
  start('elaria', 'm-elaria-ivresse', 'Elaria : Ivresse du sang / Œil', 'blood-frenzy', 'hawk-eye'),
  start('elaria', 'm-elaria-plaie2', 'Elaria : Plaie ouverte (1 par coup) / Œil', NEW_AURAS.bleed, 'hawk-eye'),
  // Brokk (Rempart + Représailles) : la Peau de pierre sur le 2 (le vanilla : Aura d'épines sur le 1)
  start('brokk', 'm-brokk-intimidation', 'Brokk : Intimidation / Peau', 'intimidation-aura', 'stoneskin'),
  start('brokk', 'm-brokk-rempart', 'Brokk : Rempart hérissé / Peau', 'bristling-rampart', 'stoneskin'),
  start('brokk', 'm-brokk-immunite', 'Brokk : Immunité / Peau', 'immunity-aura', 'stoneskin'),
  start('brokk', 'm-brokk-ecu', 'Brokk : Écu vengeur / Peau', NEW_AURAS.aegis, 'stoneskin'),
  start('brokk', 'm-brokk-epines-bouclier', 'Brokk : Épines / Peau, Coup de bouclier gravé sur le 3', 'thorns', 'stoneskin', {
    extra: [{ id: 'lab-shield-bash', name: 'Coup de bouclier', trigger: 'naturalThree', effects: [{ type: 'release', status: 'bonusArmor', min: 0, target: 'opponent', source: 'strike' }] }],
  }),
  // Ervald (Poison + Ombre) : le Vol de vie sur le 2 (le vanilla : Aura glaciale sur le 1)
  start('ervald', 'm-ervald-seve', 'Ervald : Sève noire / Vol de vie', 'black-sap', 'life-steal'),
  start('ervald', 'm-ervald-decoction', 'Ervald : Décoction / Vol de vie', 'decoction-aura', 'life-steal'),
  start('ervald', 'm-ervald-pourriture', 'Ervald : Pourriture (coup) / Vol de vie', NEW_AURAS.rot, 'life-steal'),
  start('ervald', 'm-ervald-pourriture-crit', 'Ervald : Pourriture (critique) / Vol de vie', NEW_AURAS.critRot, 'life-steal'),
  start('ervald', 'm-ervald-effroi', 'Ervald : Effroi / Vol de vie', NEW_AURAS.dread, 'life-steal'),
  // Ysolde (Lumière + Orage) : la Purification sur le 2 (le vanilla : Aura de sainteté sur le 1)
  start('ysolde', 'm-ysolde-ciel', "Ysolde : Ciel d'orage / Purification", 'storm-sky', 'purification'),
  start('ysolde', 'm-ysolde-champ', "Ysolde : Champ d'orage / Purification", NEW_AURAS.stormField, 'purification'),
  // Naraxes (Chance + Poison) : Pile ou face sur le 2 (le vanilla : Aura de décoction sur le 1)
  start('naraxes', 'm-naraxes-glaciale', 'Naraxes : Glaciale / Pile', 'frost-aura', 'coin-flip'),
  loadedFromStart(start('naraxes', 'm-naraxes-pipe', 'Naraxes : Dé pipé +25 % d’office (borne haute) / Pile', undefined, 'coin-flip')),
  start('naraxes', 'm-naraxes-veine', 'Naraxes : Veine / Pile', NEW_AURAS.vein, 'coin-flip'),
  // Aldric (Représailles + Ombre) : la Rétribution sur le 2 (le vanilla : Rétribution sur le 1, Riposte sur le 2)
  start('aldric', 'm-aldric-epines', 'Aldric : Épines / Rétribution', 'thorns', 'retribution'),
  start('aldric', 'm-aldric-vindicte', 'Aldric : Vindicte / Rétribution', 'vendetta', 'retribution'),
  start('aldric', 'm-aldric-dette', 'Aldric : Dette de sang / Rétribution', 'blood-debt', 'retribution'),
  start('aldric', 'm-aldric-pourriture-crit', 'Aldric : Pourriture (critique) / Rétribution', NEW_AURAS.critRot, 'retribution'),
  start('aldric', 'm-aldric-effroi', 'Aldric : Effroi / Rétribution', NEW_AURAS.dread, 'retribution'),
  start('aldric', 'm-aldric-vindicte-riposte', 'Aldric : Vindicte / Riposte (face 2 au choix)', 'vendetta', 'riposte'),
  // Thaldrin (Orage + Poison) : les Feux follets sur le 2, sorts sous forme humaine (le vanilla : Feux follets 1, Foudre 2)
  start('thaldrin', 'm-thaldrin-ciel', "Thaldrin : Ciel d'orage / Feux follets", 'storm-sky', 'firefly', { form: H }),
  start('thaldrin', 'm-thaldrin-champ', "Thaldrin : Champ d'orage / Feux follets", NEW_AURAS.stormField, 'firefly', { form: H }),
  start('thaldrin', 'm-thaldrin-decoction', 'Thaldrin : Décoction / Feux follets', 'decoction-aura', 'firefly', { form: H }),
  start('thaldrin', 'm-thaldrin-glaciale', 'Thaldrin : Glaciale / Feux follets', 'frost-aura', 'firefly', { form: H }),
  start('thaldrin', 'm-thaldrin-ciel-foudre', "Thaldrin : Ciel d'orage / Foudre", 'storm-sky', 'thunderbolt', { form: H }),
  // Fanchon (Chant + Chance) : le Duo sur le 2 (le vanilla : Duo 1, Soliste 2)
  start('fanchon', 'm-fanchon-ballade', 'Fanchon : Ballade / Duo', NEW_AURAS.ballad, 'duo'),
  start('fanchon', 'm-fanchon-veine', 'Fanchon : Veine / Duo', NEW_AURAS.vein, 'duo'),
  start('fanchon', 'm-fanchon-ballade-soliste', 'Fanchon : Ballade / Soliste', NEW_AURAS.ballad, 'soloist'),
  start('fanchon', 'm-fanchon-veine-soliste', 'Fanchon : Veine / Soliste', NEW_AURAS.vein, 'soloist'),
  // Morgrut (Fureur + Rempart) : la question du combattant nu
  start('morgrut', 'm-morgrut-puissance', 'Morgrut : Puissance sur le 1, rien d’autre', 'power-aura', undefined),
  start('morgrut', 'm-morgrut-intimidation', 'Morgrut : Intimidation sur le 1, rien d’autre', 'intimidation-aura', undefined),
]

/* --- Série 71 : les briques nouvelles des Maîtrises, gravées sur le 3 nu de leurs porteurs, kit vanilla d'aujourd'hui
   (docs/MAITRISES.md § 4 ; bande d'une gravure : 8 à 20 points). --- */
const engrave = (character: string, id: string, name: string, e: CharacterEvent): LabIdea => ({
  series: 71,
  id,
  character,
  name,
  schema: 'Gravure',
  family: 'Maîtrises',
  pitch: name,
  apply: (c) => c.adjusted({ events: [...c.events, onFace(e, 3)] }),
  watch: [e.id],
  statuses: SERIES_70_STATUSES,
})
const PRAYER: CharacterEvent = { id: 'lab-prayer', name: 'Prière', trigger: 'naturalThree', effects: [{ type: 'heal', amount: 6 }] }
const WITHER: CharacterEvent = { id: 'lab-wither', name: 'Flétrissure', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'weakened', stacks: 2, turns: 3, target: 'opponent' }] }
const ASSAULT: CharacterEvent = { id: 'lab-assault', name: 'Assaut', trigger: 'naturalThree', relation: 'modify', hitMultiplier: 2, effects: [] }
const SHIELD_BASH: CharacterEvent = { id: 'lab-shield-bash', name: 'Coup de bouclier', trigger: 'naturalThree', effects: [{ type: 'release', status: 'bonusArmor', min: 0, target: 'opponent', source: 'strike' }] }
const SERIES_71: LabIdea[] = [
  engrave('ysolde', 'g-ysolde-priere', 'Ysolde : Prière (+6 PV) gravée', PRAYER),
  engrave('gorak', 'g-gorak-priere', 'Gorak : Prière (+6 PV) gravée (repère hors maîtrise)', PRAYER),
  engrave('aldric', 'g-aldric-fletrissure', 'Aldric : Flétrissure (−2 dégâts, 3 tours) gravée', WITHER),
  engrave('ervald', 'g-ervald-fletrissure', 'Ervald : Flétrissure gravée', WITHER),
  engrave('ervald', 'g-ervald-effroi', 'Ervald : Effroi gravé', NEW_AURAS.dread),
  engrave('aldric', 'g-aldric-effroi', 'Aldric : Effroi gravé', NEW_AURAS.dread),
  engrave('gorak', 'g-gorak-assaut', 'Gorak : Assaut (ce coup ×2) gravé', ASSAULT),
  engrave('morgrut', 'g-morgrut-assaut', 'Morgrut : Assaut gravé', ASSAULT),
  engrave('brokk', 'g-brokk-bouclier', 'Brokk : Coup de bouclier gravé', SHIELD_BASH),
  engrave('brokk', 'g-brokk-ecu', 'Brokk : Écu vengeur gravé', NEW_AURAS.aegis),
  engrave('naraxes', 'g-naraxes-veine', 'Naraxes : Veine gravée', NEW_AURAS.vein),
  engrave('ysolde', 'g-ysolde-champ', "Ysolde : Champ d'orage gravé", NEW_AURAS.stormField),
  engrave('thaldrin', 'g-thaldrin-champ', "Thaldrin : Champ d'orage gravé", NEW_AURAS.stormField),
  engrave('gorak', 'g-gorak-plaie2', 'Gorak : Plaie ouverte (1 par coup) gravée', NEW_AURAS.bleed),
  engrave('elaria', 'g-elaria-plaie2', 'Elaria : Plaie ouverte (1 par coup) gravée', NEW_AURAS.bleed),
  engrave('gorak', 'g-gorak-plaie', 'Gorak : Plaie ouverte (critique, registre) gravée', skill('open-wound')),
  engrave('elaria', 'g-elaria-plaie', 'Elaria : Plaie ouverte (critique, registre) gravée', skill('open-wound')),
  engrave('fanchon', 'g-fanchon-ballade', 'Fanchon : Ballade gravée', NEW_AURAS.ballad),
  { ...engrave('naraxes', 'g-naraxes-pipe', 'Naraxes : Dé pipé +25 % d’office (borne haute)', NEW_AURAS.vein), apply: (c) => c.withRelics([getRelic('weighted-coin')]), watch: ['coin-flip'] },
  engrave('naraxes', 'g-naraxes-pipe-registre', 'Naraxes : Dé pipé (registre, pile ×6) gravé', skill('loaded-die')),
]

/* --- Série 72 : les compensations et les retouches de la série 70 (Aldric, Brokk, Fanchon, Gorak). --- */
const STONESKIN_FIST: CharacterEvent = {
  ...skill('stoneskin'),
  id: 'lab-stoneskin-fist',
  name: 'Peau de pierre (poing)',
  effects: [...skill('stoneskin').effects, { type: 'applyStatus', status: LAB_STONE_FIST, stacks: 1 }],
}
const ALDRIC_ATTACK = { attackMin: 5, attackMax: 6 }
/** Fanchon refaite : des stats au niveau du roster, son kit d'un dé ne compense plus rien */
const FANCHON_STATS = { maxHp: 50, attackMin: 5, attackMax: 6, critChance: 0.1 }
const s72 = (idea: LabIdea): LabIdea => ({ ...idea, series: 72 })
const SERIES_72: LabIdea[] = [
  s72(start('gorak', 'm-gorak-sauvage-b', 'Gorak : Sauvage (sans forme) / Furie', { ...skill('wild-aura'), form: undefined }, 'wind-fury')),
  s72(start('brokk', 'm-brokk-plaie2', 'Brokk : Plaie ouverte (1 par coup) / Peau', NEW_AURAS.bleed, 'stoneskin')),
  s72(start('brokk', 'm-brokk-epines-poing', 'Brokk : Épines / Peau de pierre et Poing de pierre (+2 tant qu’elle tient)', 'thorns', STONESKIN_FIST)),
  s72(start('brokk', 'm-brokk-intimidation-poing', 'Brokk : Intimidation / Peau de pierre et Poing de pierre', 'intimidation-aura', STONESKIN_FIST)),
  s72(start('brokk', 'm-brokk-rempart-poing', 'Brokk : Rempart hérissé / Peau de pierre et Poing de pierre', 'bristling-rampart', STONESKIN_FIST)),
  s72(start('aldric', 'm-aldric-rancoeur', 'Aldric : Rancœur / Rétribution', NEW_AURAS.rancor, 'retribution')),
  s72(start('aldric', 'm-aldric-epines-att', 'Aldric : Épines / Rétribution, attaque 5 à 6', 'thorns', 'retribution', { stats: ALDRIC_ATTACK })),
  s72(start('aldric', 'm-aldric-vindicte-att', 'Aldric : Vindicte / Rétribution, attaque 5 à 6', 'vendetta', 'retribution', { stats: ALDRIC_ATTACK })),
  s72(start('aldric', 'm-aldric-dette-att', 'Aldric : Dette de sang / Rétribution, attaque 5 à 6', 'blood-debt', 'retribution', { stats: ALDRIC_ATTACK })),
  s72(start('aldric', 'm-aldric-effroi-att', 'Aldric : Effroi / Rétribution, attaque 5 à 6', NEW_AURAS.dread, 'retribution', { stats: ALDRIC_ATTACK })),
  s72(start('aldric', 'm-aldric-rancoeur-att', 'Aldric : Rancœur / Rétribution, attaque 5 à 6', NEW_AURAS.rancor, 'retribution', { stats: ALDRIC_ATTACK })),
  s72(start('aldric', 'm-aldric-pourriture-att', 'Aldric : Pourriture (critique) / Rétribution, attaque 5 à 6', NEW_AURAS.critRot, 'retribution', { stats: ALDRIC_ATTACK })),
  s72(start('fanchon', 'm-fanchon-ballade-duo-s', 'Fanchon refaite : Ballade / Duo, 50 PV, attaque 5 à 6, critique 10 %', NEW_AURAS.ballad, 'duo', { stats: FANCHON_STATS })),
  s72(start('fanchon', 'm-fanchon-veine-duo-s', 'Fanchon refaite : Veine / Duo', NEW_AURAS.vein, 'duo', { stats: FANCHON_STATS })),
  s72(start('fanchon', 'm-fanchon-puissance-duo-s', 'Fanchon refaite : Aura de puissance / Duo (repère)', 'power-aura', 'duo', { stats: FANCHON_STATS })),
  s72(start('fanchon', 'm-fanchon-ballade-soliste-s', 'Fanchon refaite : Ballade / Soliste', NEW_AURAS.ballad, 'soloist', { stats: FANCHON_STATS })),
  s72(start('fanchon', 'm-fanchon-duo-soliste-s', 'Fanchon : Duo / Soliste (son dé d’aujourd’hui), stats refaites seules', 'duo', 'soloist', { stats: FANCHON_STATS })),
]

/* --- Série 73 : les retouches de la série 72 (Poing de pierre à +1, Ballade à 2 PV, Dé pipé à 5 sur 6, Morgrut avec une
   aura et l'attaque 6 à 8, Fanchon à 52 PV). --- */
const LAB_STONE_FIST_1 = 'labStoneFist1' as StatusId
const LAB_BALLAD_2 = 'labBallad2' as StatusId
const SERIES_73_STATUSES: Record<string, StatusDef> = {
  ...SERIES_70_STATUSES,
  [LAB_STONE_FIST_1]: { ...SERIES_70_STATUSES[LAB_STONE_FIST], modifyOutgoing: (d) => d + 1 },
  [LAB_BALLAD_2]: aura('Ballade (2 PV)', { family: 'healing', reactions: { hit: (s) => [{ type: 'heal', amount: 2 * charges(s) }] } }),
}
const STONESKIN_FIST_1: CharacterEvent = { ...STONESKIN_FIST, id: 'lab-stoneskin-fist-1', effects: [...skill('stoneskin').effects, { type: 'applyStatus', status: LAB_STONE_FIST_1, stacks: 1 }] }
const BALLAD_2 = auraSkill('lab-ballad-2', 'Ballade (2 PV)', LAB_BALLAD_2)
/** Le Dé pipé en aura au plafond des pièces (5 sur 6), porté d'office : une relique d'essai à +1/3 */
const loadedCap = (idea: LabIdea): LabIdea => ({ ...idea, apply: (c) => idea.apply(c).withRelics([{ ...getRelic('weighted-coin'), id: 'lab-loaded-cap', headsChance: 1 / 3 }]) })
const FANCHON_STATS_52 = { ...FANCHON_STATS, maxHp: 52 }
const MORGRUT_ATTACK = { attackMin: 6, attackMax: 8 }
const s73 = (idea: LabIdea): LabIdea => ({ ...idea, series: 73, statuses: SERIES_73_STATUSES })
const SERIES_73: LabIdea[] = [
  s73(start('brokk', 'm-brokk-epines-poing1', 'Brokk : Épines / Peau de pierre et Poing de pierre +1', 'thorns', STONESKIN_FIST_1)),
  s73(start('brokk', 'm-brokk-intimidation-poing1', 'Brokk : Intimidation / Peau de pierre et Poing de pierre +1', 'intimidation-aura', STONESKIN_FIST_1)),
  s73(start('brokk', 'm-brokk-rempart-poing1', 'Brokk : Rempart hérissé / Peau de pierre et Poing de pierre +1', 'bristling-rampart', STONESKIN_FIST_1)),
  s73(start('brokk', 'm-brokk-immunite-poing1', 'Brokk : Immunité / Peau de pierre et Poing de pierre +1', 'immunity-aura', STONESKIN_FIST_1)),
  s73(start('brokk', 'm-brokk-plaie2-poing1', 'Brokk : Plaie ouverte (1 par coup) / Peau de pierre et Poing de pierre +1', NEW_AURAS.bleed, STONESKIN_FIST_1)),
  s73(loadedCap(start('naraxes', 'm-naraxes-pipe-cap', 'Naraxes : Dé pipé 5 sur 6 d’office (borne haute) / Pile', undefined, 'coin-flip'))),
  s73({ ...loadedCap(engrave('naraxes', 'g-naraxes-pipe-cap', 'Naraxes : Dé pipé 5 sur 6 d’office, kit d’aujourd’hui', NEW_AURAS.vein)), apply: (c) => c.withRelics([{ ...getRelic('weighted-coin'), id: 'lab-loaded-cap', headsChance: 1 / 3 }]), watch: ['coin-flip'] }),
  s73(start('fanchon', 'm-fanchon-ballade2-duo-s', 'Fanchon refaite : Ballade 2 PV / Duo', BALLAD_2, 'duo', { stats: FANCHON_STATS })),
  s73(start('fanchon', 'm-fanchon-ballade2-duo-s52', 'Fanchon refaite : Ballade 2 PV / Duo, 52 PV', BALLAD_2, 'duo', { stats: FANCHON_STATS_52 })),
  s73(start('fanchon', 'm-fanchon-ballade2-soliste-s52', 'Fanchon refaite : Ballade 2 PV / Soliste, 52 PV', BALLAD_2, 'soloist', { stats: FANCHON_STATS_52 })),
  s73(start('fanchon', 'm-fanchon-veine-duo-s52', 'Fanchon refaite : Veine / Duo, 52 PV', NEW_AURAS.vein, 'duo', { stats: FANCHON_STATS_52 })),
  s73(start('fanchon', 'm-fanchon-duo-soliste-s52', 'Fanchon : Duo / Soliste, 52 PV et stats refaites', 'duo', 'soloist', { stats: FANCHON_STATS_52 })),
  s73(start('morgrut', 'm-morgrut-puissance-att', 'Morgrut : Puissance sur le 1, attaque 6 à 8', 'power-aura', undefined, { stats: MORGRUT_ATTACK })),
  s73(start('morgrut', 'm-morgrut-intimidation-att', 'Morgrut : Intimidation sur le 1, attaque 6 à 8', 'intimidation-aura', undefined, { stats: MORGRUT_ATTACK })),
  s73(engrave('aldric', 'g-aldric-rancoeur', 'Aldric : Rancœur gravée', NEW_AURAS.rancor)),
  s73(engrave('gorak', 'g-gorak-sauvage', 'Gorak : Aura sauvage (sans forme) gravée', { ...skill('wild-aura'), form: undefined })),
]

/* --- Série 74 : Bonne étoile (Chance) : chaque pile lui donne +1 dégât à chacun de ses coups, jusqu'à la fin du combat. --- */
const LAB_LUCKY_STAR = 'labLuckyStar' as StatusId
const LAB_STAR = 'labStar' as StatusId
const SERIES_74_STATUSES: Record<string, StatusDef> = {
  ...SERIES_73_STATUSES,
  [LAB_LUCKY_STAR]: aura('Bonne étoile', { family: 'fortune', reactions: { heads: (s) => [{ type: 'applyStatus', status: LAB_STAR, stacks: charges(s) }] } }),
  [LAB_STAR]: { ...STATUSES.sidestep, look: undefined, modifyStats: undefined, name: 'Étoile', summary: 'Étoile', describe: (s) => `+${s.stacks}`, badge: (s) => `+${s.stacks}`, stacking: 'add', family: 'power', modifyOutgoing: (d, s) => d + s.stacks },
}
const LUCKY_STAR = auraSkill('lab-lucky-star', 'Bonne étoile', LAB_LUCKY_STAR)
const s74 = (idea: LabIdea): LabIdea => ({ ...idea, series: 74, statuses: SERIES_74_STATUSES })
const SERIES_74: LabIdea[] = [
  s74(start('naraxes', 'm-naraxes-etoile', 'Naraxes : Bonne étoile / Pile', LUCKY_STAR, 'coin-flip')),
  s74(engrave('naraxes', 'g-naraxes-etoile', 'Naraxes : Bonne étoile gravée', LUCKY_STAR)),
  s74(start('elaria', 'm-elaria-epines', 'Elaria : Aura d’épines / Œil', 'thorns', 'hawk-eye')),
  s74(start('morgrut', 'm-morgrut-immunite-att', 'Morgrut : Immunité sur le 1, attaque 6 à 8', 'immunity-aura', undefined, { stats: MORGRUT_ATTACK })),
  s74(start('morgrut', 'm-morgrut-sauvage-att', 'Morgrut : Aura sauvage sur le 1, attaque 6 à 8', { ...skill('wild-aura'), form: undefined }, undefined, { stats: MORGRUT_ATTACK })),
  s74(start('fanchon', 'm-fanchon-ballade2-duo', 'Fanchon : Ballade 2 PV / Duo', BALLAD_2, 'duo')),
]

/* --- Série 75 : R5, la relique qui pose au début du combat l'aura de la face 1 (une fois, au premier tour du porteur). --- */
const herald = (status: StatusId) => ({ ...getRelic('weighted-coin'), id: 'lab-herald', name: 'Clairon du héraut', headsChance: undefined, trigger: { type: 'turn' as const, turn: 1 }, charges: 1, effects: [{ type: 'applyStatus' as const, status, stacks: 1 }] })
const withHerald = (idea: LabIdea, status: StatusId): LabIdea => ({ ...idea, series: 75, id: `${idea.id}-r5`, name: `${idea.name}, avec la relique R5`, apply: (c) => { const built = idea.apply(c); return built.withRelics([...built.relics, herald(status)]) } })
const kitOf = (character: string, id: string, name: string): LabIdea => ({ series: 75, id, character, name, schema: 'Relique', family: 'Maîtrises', pitch: name, apply: (c) => c, watch: [], statuses: SERIES_74_STATUSES })
const SERIES_75: LabIdea[] = [
  withHerald(kitOf('brokk', 'r5-brokk', 'Brokk (kit d’aujourd’hui)'), 'thorns'),
  withHerald(kitOf('ervald', 'r5-ervald', 'Ervald (kit d’aujourd’hui)'), 'frostAura'),
  withHerald(kitOf('naraxes', 'r5-naraxes', 'Naraxes (kit d’aujourd’hui)'), 'decoctionAura'),
  withHerald(kitOf('ysolde', 'r5-ysolde', 'Ysolde (kit d’aujourd’hui)'), 'holyAura'),
  withHerald(s74(start('gorak', 'r5-gorak', 'Gorak : Ivresse du sang / Furie', 'blood-frenzy', 'wind-fury')), 'bloodFrenzy'),
  withHerald(s74(start('aldric', 'r5-aldric', 'Aldric : Vindicte / Rétribution, attaque 5 à 6', 'vendetta', 'retribution', { stats: ALDRIC_ATTACK })), 'vendetta'),
]

/* Série 75 bis : R5 avec un prix (pièce maîtresse, PROGRESSION.md P5) : l'aura de la face 1 posée au début du combat, et sa
   face 1 devient nue (elle ne la repose plus, sa compétence a quitté le dé pour la relique). */
const priced = (idea: LabIdea, status: StatusId): LabIdea => {
  const withIt = withHerald(idea, status)
  return { ...withIt, id: `${withIt.id}-prix`, name: `${idea.name}, R5 avec prix (face 1 nue)`, apply: (c) => { const built = withIt.apply(c); return built.adjusted({ events: built.events.filter((e) => e.trigger !== 'naturalOne') }) } }
}
const SERIES_75_B: LabIdea[] = [
  priced(kitOf('brokk', 'r5p-brokk', 'Brokk (kit d’aujourd’hui)'), 'thorns'),
  priced(kitOf('ervald', 'r5p-ervald', 'Ervald (kit d’aujourd’hui)'), 'frostAura'),
  priced(kitOf('naraxes', 'r5p-naraxes', 'Naraxes (kit d’aujourd’hui)'), 'decoctionAura'),
  priced(kitOf('ysolde', 'r5p-ysolde', 'Ysolde (kit d’aujourd’hui)'), 'holyAura'),
]

/* --- Série 76 : faire vivre les auras (second retour du 2026-10-27, B11 ; docs/AURAS.md). Chaque idée est une
   règle pour tous (`everyone`) : le personnage et tous ses adversaires la reçoivent, chacun avec l'aura de la face 1 de son
   dé vanilla. Les règles sont émulées avec les déclencheurs existants (`combatStart`, `naturalMax`, `bloodied`, `hurt`) ou
   une relique d'essai (« au plus tard à son N-ième tour ») ; livrée, une telle règle vivrait dans le moteur. --- */
type Rule = (c: Character) => Character
/** L'aura de la face 1 : sa compétence, et le statut qu'elle pose sur son lanceur */
function faceOneAura(c: Character): { one: CharacterEvent; status: StatusId } | undefined {
  const one = c.events.find((e) => rollFace(e.trigger) === 1)
  const pose = one?.effects.find((x) => x.type === 'applyStatus' && (x.target ?? 'self') === 'self')
  return one && pose?.type === 'applyStatus' ? { one, status: pose.status } : undefined
}
const lacks = (status: StatusId) => [{ type: 'lacksStatus' as const, who: 'self' as const, status }]
const poseAura = (status: StatusId, turns?: number) => [{ type: 'applyStatus' as const, status, stacks: 1, ...(turns !== undefined && { turns }) }]
/** Une règle bâtie sur l'aura de la face 1 (un personnage sans aura sur le 1 ne change pas) */
const auraRule =
  (build: (c: Character, aura: { one: CharacterEvent; status: StatusId }) => Character): Rule =>
  (c) => {
    const aura = faceOneAura(c)
    return aura ? build(c, aura) : c
  }
const atStart = (status: StatusId, turns?: number): CharacterEvent => ({ id: 'lab-aura-start', name: "Aura d'office", trigger: 'combatStart', effects: poseAura(status, turns) })
/** Au plus tard à son N-ième tour : au début de ce tour, avant son jet, l'aura se pose si elle n'est pas là (une fois) */
const latest = (turn: number): Rule =>
  auraRule((c, a) => {
    const relic: Relic = { ...getRelic('weighted-coin'), id: 'lab-aura-latest', name: 'Au plus tard', headsChance: undefined, trigger: { type: 'turn', turn }, charges: 1, when: lacks(a.status), effects: poseAura(a.status) }
    return c.withRelics([...c.relics, relic])
  })
/** L'aura de la face 1 posée au début du combat, le 1 la repose : la relique R5 (Clairon du héraut), en règle ou en relique */
const office: Rule = auraRule((c, a) => c.adjusted({ events: [...c.events, atStart(a.status)] }))
const RULES_76: [key: string, label: string, rule: Rule][] = [
  ['office', "R5 pour tous : l'aura posée au début, le 1 la repose", office],
  ['office-nu', "L'aura posée au début, le 1 nu", auraRule((c, a) => c.adjusted({ events: [...c.events.filter((e) => e !== a.one), atStart(a.status)] }))],
  [
    'office-sig',
    "L'aura posée au début, le 1 joue la face 2",
    auraRule((c, a) => {
      const two = c.events.find((e) => rollFace(e.trigger) === 2)
      return c.adjusted({ events: [...c.events.filter((e) => e !== a.one), ...(two ? [{ ...two, trigger: a.one.trigger }] : []), atStart(a.status)] })
    }),
  ],
  ['eveil3', "Éveil : posée au début pour 3 tours, le 1 la rend permanente", auraRule((c, a) => c.adjusted({ events: [...c.events, atStart(a.status, 3)] }))],
  ['tour2', 'Au plus tard à son 2e tour', latest(2)],
  ['tour3', 'Au plus tard à son 3e tour', latest(3)],
  ['tour4', 'Au plus tard à son 4e tour', latest(4)],
  ['six', 'Le 1 et le 6 la posent', auraRule((c, a) => c.adjusted({ events: [...c.events, { ...a.one, id: 'lab-aura-six', trigger: 'naturalMax' }] }))],
  ['six-eveil', "Le 6 la pose si elle n'est pas là", auraRule((c, a) => c.adjusted({ events: [...c.events, { ...a.one, id: 'lab-aura-six', trigger: 'naturalMax', when: lacks(a.status) }] }))],
  ['coup', "Le premier coup encaissé la pose si elle n'est pas là", auraRule((c, a) => c.adjusted({ events: [...c.events, { id: 'lab-aura-hurt', name: 'Éveil', trigger: 'hurt', limit: 1, when: lacks(a.status), effects: poseAura(a.status) }] }))],
  ['mi-pv', "Sous la moitié de ses PV, elle se pose si elle n'est pas là", auraRule((c, a) => c.adjusted({ events: [...c.events, { id: 'lab-aura-bloodied', name: 'Éveil', trigger: 'bloodied', when: lacks(a.status), effects: poseAura(a.status) }] }))],
]
const SERIES_76: LabIdea[] = RULES_76.flatMap(([key, label, rule]) =>
  CHARACTERS.flatMap((c) => {
    const aura = faceOneAura(c)
    if (!aura) return []
    return [{ series: 76, id: `aura-${key}-${c.id}`, character: c.id, name: `${label} · ${c.name}`, schema: 'Règle', family: 'Auras', pitch: label, apply: rule, everyone: true, watch: [aura.one.id, 'lab-aura-start', 'lab-aura-six', 'lab-aura-hurt', 'lab-aura-bloodied'], presence: aura.status }]
  }),
)

/* --- Série 77 : la règle « au plus tard à son 3e tour » (série 76) et la progression. Monde : tout le roster porte la règle
   (`world`). Ce que vaut alors la relique R5 (l'aura dès le début), comparée à sa valeur d'aujourd'hui (sans la règle) ; et
   la cause de la baisse d'Ysolde (sa Purification retire l'aura adverse au lieu de blesser). --- */
const tour3 = latest(3)
/** Purification : `bite` de ses dégâts partent aussi quand elle retire un bonus (sans bonus en face : 8, comme aujourd'hui) */
const purificationBite = (bite: number) =>
  replace('purification', (e) => ({
    ...e,
    effects: e.effects.flatMap((x) =>
      x.type === 'cleanse' && x.orElse?.type === 'damage'
        ? [{ ...x, ...(bite < x.orElse.amount ? { orElse: { ...x.orElse, amount: x.orElse.amount - bite } } : { orElse: undefined }) }, { type: 'damage' as const, amount: bite, target: 'opponent' as const, source: 'holy' as const }]
        : [x],
    ),
  }))
const s77 = (character: string, id: string, name: string, apply: Rule, world?: Rule): LabIdea => {
  const aura = faceOneAura(CHARACTERS.find((c) => c.id === character)!)
  return { series: 77, id, character, name, schema: 'Règle', family: 'Auras', pitch: name, apply, ...(world && { world }), watch: aura ? [aura.one.id, 'lab-aura-start'] : [], presence: aura?.status }
}
const SERIES_77: LabIdea[] = [
  ...['gorak', 'brokk', 'ervald', 'naraxes', 'ysolde', 'morgrut'].flatMap((who) => [
    s77(who, `r5-aujourdhui-${who}`, `${who} : la relique R5, sans la règle`, office),
    s77(who, `r5-tour3-${who}`, `${who} : la relique R5, avec la règle du 3e tour`, office, tour3),
  ]),
  s77('ysolde', 'tour3-ysolde-seule', 'Ysolde seule reçoit la règle du 3e tour', tour3),
  s77('ysolde', 'purif-ysolde', 'Ysolde : Purification +3 quand elle retire un bonus, sans la règle', purificationBite(3)),
  ...[3, 5, 8].map((bite) => s77('ysolde', `purif${bite}-ysolde-tour3`, `Ysolde : Purification +${bite} quand elle retire un bonus, avec la règle du 3e tour`, purificationBite(bite), tour3)),
  // Le paquet recommandé, pour tous : la règle du 3e tour, et la Purification qui blesse de 5 quand elle retire un bonus
  ...CHARACTERS.map((c) => ({ ...s77(c.id, `tour3-purif5-${c.id}`, `Au plus tard à son 3e tour, Purification +5 au retrait · ${c.name}`, (x: Character) => purificationBite(5)(tour3(x))), pitch: 'Au plus tard à son 3e tour, Purification +5 au retrait', everyone: true })),
]

/* --- Série 78 : le Dé pipé à double effet (second retour du 2026-10-27, B12 ; docs/AURAS.md). La chance de pile du
   registre (+25 % par charge), plus un second effet par charge ; essayé au départ de Naraxes (sur le 1, Pile ou face sur le
   2) et de Fanchon (sur le 1, Duo sur le 2), et gravé sur le 3 nu de trois hôtes : Naraxes (une pièce), Fanchon et Elaria
   (aucune). --- */
const LAB_LOADED_CRIT5 = 'labLoadedCrit5' as StatusId
const LAB_LOADED_CRIT10 = 'labLoadedCrit10' as StatusId
const LAB_LOADED_DODGE5 = 'labLoadedDodge5' as StatusId
const LAB_LOADED_HEADS_CRIT = 'labLoadedHeadsCrit' as StatusId
const LAB_LOADED_BOTH = 'labLoadedBoth' as StatusId
const loadedVariant = (name: string, rest: Partial<StatusDef>): StatusDef => ({ ...STATUSES.loadedDie, name, summary: name, describe: () => name, ...rest })
const SERIES_78_STATUSES: Record<string, StatusDef> = {
  ...SERIES_70_STATUSES,
  [LAB_LOADED_CRIT5]: loadedVariant('Dé pipé (et +5 % de critique)', { modifyStats: (s, st) => ({ ...s, critChance: s.critChance + 0.05 * charges(st) }) }),
  [LAB_LOADED_CRIT10]: loadedVariant('Dé pipé (et +10 % de critique)', { modifyStats: (s, st) => ({ ...s, critChance: s.critChance + 0.1 * charges(st) }) }),
  [LAB_LOADED_DODGE5]: loadedVariant('Dé pipé (et +5 % d’esquive)', { modifyStats: (s, st) => ({ ...s, dodgeChance: s.dodgeChance + 0.05 * charges(st) }) }),
  // Pile, puis la chance : chaque pile de ses pièces lui donne un Critique assuré (une charge, B8)
  [LAB_LOADED_HEADS_CRIT]: loadedVariant('Dé pipé (pile : Critique assuré)', { reactions: { heads: () => [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }] } }),
  [LAB_LOADED_BOTH]: loadedVariant('Dé pipé (et +5 % de critique et d’esquive)', { modifyStats: (s, st) => ({ ...s, critChance: s.critChance + 0.05 * charges(st), dodgeChance: s.dodgeChance + 0.05 * charges(st) }) }),
}
const LOADED_VARIANTS: [key: string, skill: CharacterEvent][] = [
  ['registre', skill('loaded-die')],
  ['crit5', auraSkill('lab-loaded-crit5', 'Dé pipé, pile et +5 % de critique', LAB_LOADED_CRIT5)],
  ['crit10', auraSkill('lab-loaded-crit10', 'Dé pipé, pile et +10 % de critique', LAB_LOADED_CRIT10)],
  ['esquive5', auraSkill('lab-loaded-dodge5', 'Dé pipé, pile et +5 % d’esquive', LAB_LOADED_DODGE5)],
  ['pile-crit', auraSkill('lab-loaded-heads-crit', 'Dé pipé, pile puis Critique assuré', LAB_LOADED_HEADS_CRIT)],
  ['les-deux', auraSkill('lab-loaded-both', 'Dé pipé, pile et +5 % de critique et d’esquive', LAB_LOADED_BOTH)],
]
const s78 = (idea: LabIdea): LabIdea => ({ ...idea, series: 78, statuses: SERIES_78_STATUSES })
const SERIES_78: LabIdea[] = LOADED_VARIANTS.flatMap(([key, e]) => [
  s78(start('naraxes', `pipe-${key}-depart`, `Naraxes : ${e.name} / Pile ou face`, e, 'coin-flip')),
  s78(start('fanchon', `pipe-${key}-depart-fanchon`, `Fanchon : ${e.name} / Duo`, e, 'duo')),
  s78(start('elaria', `pipe-${key}-depart-elaria`, `Elaria : ${e.name} / Œil de faucon`, e, 'hawk-eye')),
  ...['naraxes', 'fanchon', 'elaria'].map((who) => s78(engrave(who, `pipe-${key}-${who}`, `${e.name}, gravé (${who})`, e))),
])

export const IDEAS: readonly LabIdea[] = [...SERIES_14, ...SERIES_16, ...SERIES_17, ...SERIES_17_B, ...SERIES_70, ...SERIES_71, ...SERIES_72, ...SERIES_73, ...SERIES_74, ...SERIES_75, ...SERIES_75_B, ...SERIES_76, ...SERIES_77, ...SERIES_78, ...CONTENT_A, ...CONTENT_B, ...AURA_VISION, ...CONTENU_30, ...PERSOS_30].filter(
  (i) => !i.watch.some((w) => RETIRED.has(w)),
)
