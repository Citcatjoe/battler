import type { Character } from './character'
import { finalState, type CombatResult } from './combat'
import { defaultRng, shuffle, type Rng } from './rng'
import { createCharacter } from './roster'

/*
 * Tournoi à élimination directe, 16 participants : huitièmes, quarts, demies, finale.
 * Les participants d'un match se déduisent des vainqueurs du tour précédent :
 * le match i du tour r oppose les vainqueurs des matchs 2i et 2i+1 du tour r-1.
 */

export const SLOTS = 16
export const ROUNDS = 4
export const ROUND_NAMES = ['Huitièmes de finale', 'Quarts de finale', 'Demi-finales', 'Finale']

/** Nombre de matchs dans un tour : 8, 4, 2, 1 */
export const matchesInRound = (round: number) => SLOTS >> (round + 1)

export interface Entrant {
  characterId: string
  /** Nom affiché, numéroté si le personnage est présent plusieurs fois (« Gorak II ») */
  label: string
}

export interface MatchResult {
  /** Index du participant vainqueur */
  winner: number
  turns: number
  mode: CombatResult['mode']
  /** PV restants du vainqueur */
  hpLeft: number
}

export interface Tournament {
  entrants: Entrant[]
  results: Record<string, MatchResult>
}

export interface MatchRef {
  round: number
  index: number
}

export const matchKey = ({ round, index }: MatchRef) => `${round}-${index}`

export type MatchStatus = 'done' | 'ready' | 'pending'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI']

/** Crée le tournoi à partir des 16 cases (ids de personnages), dans l'ordre de l'arbre. */
export function createTournament(slots: string[], nameOf: (id: string) => string): Tournament {
  if (slots.length !== SLOTS) throw new Error(`Il faut ${SLOTS} participants`)
  const total = new Map<string, number>()
  slots.forEach((id) => total.set(id, (total.get(id) ?? 0) + 1))
  const seen = new Map<string, number>()
  const entrants = slots.map((id) => {
    const n = (seen.get(id) ?? 0) + 1
    seen.set(id, n)
    return { characterId: id, label: total.get(id)! > 1 ? `${nameOf(id)} ${ROMAN[n - 1]}` : nameOf(id) }
  })
  return { entrants, results: {} }
}

/** Les deux participants d'un match (null tant que le tour précédent n'est pas joué). */
export function players(t: Tournament, { round, index }: MatchRef): [number | null, number | null] {
  if (round === 0) return [2 * index, 2 * index + 1]
  const prev = (i: number) => t.results[matchKey({ round: round - 1, index: i })]?.winner ?? null
  return [prev(2 * index), prev(2 * index + 1)]
}

export function status(t: Tournament, ref: MatchRef): MatchStatus {
  if (t.results[matchKey(ref)]) return 'done'
  const [a, b] = players(t, ref)
  return a !== null && b !== null ? 'ready' : 'pending'
}

export const allMatches = (): MatchRef[] =>
  Array.from({ length: ROUNDS }, (_, round) =>
    Array.from({ length: matchesInRound(round) }, (_, index) => ({ round, index })),
  ).flat()

export const readyMatches = (t: Tournament) => allMatches().filter((m) => status(t, m) === 'ready')

/** Tour en cours : le premier qui a encore des matchs à jouer (null si tout est fini). */
export function currentRound(t: Tournament): number | null {
  const next = allMatches().find((m) => status(t, m) !== 'done')
  return next ? next.round : null
}

export const champion = (t: Tournament): number | null =>
  t.results[matchKey({ round: ROUNDS - 1, index: 0 })]?.winner ?? null

/** Les deux combattants d'un match, sous leur nom de tournoi. */
export function matchFighters(t: Tournament, ref: MatchRef): [Character, Character] {
  const [a, b] = players(t, ref)
  if (a === null || b === null) throw new Error('Match pas encore prêt')
  const make = (i: number) => createCharacter(t.entrants[i].characterId).withName(t.entrants[i].label)
  return [make(a), make(b)]
}

/**
 * Enregistre l'issue d'un combat dans l'arbre (renvoie un nouveau tournoi).
 * Refuse un match déjà joué ou pas encore prêt : l'appelant ne doit alors rien enregistrer.
 */
export function withResult(t: Tournament, ref: MatchRef, result: CombatResult): Tournament {
  if (status(t, ref) !== 'ready') throw new Error(`Match ${matchKey(ref)} non jouable (${status(t, ref)})`)
  const [a, b] = players(t, ref) as [number, number]
  const expected = [t.entrants[a].characterId, t.entrants[b].characterId]
  if (result.fighters[0].id !== expected[0] || result.fighters[1].id !== expected[1])
    throw new Error(`Le combat ne correspond pas au match ${matchKey(ref)}`)
  const winner = result.winner === 0 ? a : b
  return {
    ...t,
    results: {
      ...t.results,
      [matchKey(ref)]: {
        winner,
        turns: result.turns,
        mode: result.mode,
        // PV restants du vainqueur, soins compris
        hpLeft: finalState(result).hp[result.winner],
      },
    },
  }
}

/**
 * Remplit les cases vides en équilibrant le roster (chaque personnage 2 ou 3 fois sur 16),
 * en tenant compte des cases déjà choisies à la main et en évitant si possible
 * qu'un personnage affronte son double au premier tour.
 */
export function fillSlots(slots: readonly (string | null)[], ids: readonly string[], rng: Rng = defaultRng): string[] {
  const count = new Map(ids.map((id) => [id, 0]))
  slots.forEach((id) => id && count.set(id, (count.get(id) ?? 0) + 1))
  const empty = shuffle(
    rng,
    slots.map((id, i) => (id ? -1 : i)).filter((i) => i >= 0),
  )
  const out = [...slots]
  for (const i of empty) {
    const partner = out[i % 2 === 0 ? i + 1 : i - 1]
    const min = Math.min(...count.values())
    const least = ids.filter((id) => count.get(id) === min)
    const candidates = least.filter((id) => id !== partner)
    const pool = candidates.length ? candidates : least
    const id = pool[Math.floor(rng() * pool.length)]
    out[i] = id
    count.set(id, min + 1)
  }
  return out as string[]
}
