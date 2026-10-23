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
 */
import type { Character } from '../../src/game/character'
import type { CharacterEvent } from '../../src/game/events'
import type { StatusDef } from '../../src/game/statuses'

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
  {
    series: 14,
    id: 'fanchon-crescendo-x3',
    character: 'fanchon',
    name: 'Crescendo ×3, Soliste ×4',
    schema: 'Petite touche',
    family: 'Puissance',
    pitch: 'Le double 4 et le double 5 remplacent les deux coups par un coup de base ×3 et ×4 au lieu de ×4 et ×5.',
    apply: (c) =>
      replace('soloist', (e) => ({ ...e, hitMultiplier: 4 }))(replace('crescendo', (e) => ({ ...e, hitMultiplier: 3 }))(c)),
    watch: ['crescendo', 'soloist'],
  },
]

export const IDEAS: readonly LabIdea[] = [...SERIES_14]
