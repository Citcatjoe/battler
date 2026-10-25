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
import { faceTrigger, type CharacterEvent } from '../../src/game/events'
import { STATUSES, type StatusDef, type StatusId } from '../../src/game/statuses'

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

export const IDEAS: readonly LabIdea[] = [...SERIES_14, ...SERIES_16, ...SERIES_17, ...SERIES_17_B]
