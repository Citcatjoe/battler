import { useSyncExternalStore } from 'react'
import { computeStats, other, type CombatResult, type Pair, type Side } from './combat'

/*
 * Historique des combats, conservé dans le localStorage du navigateur.
 * - `characters` : totaux cumulés par personnage, jamais tronqués.
 * - `matches` : le détail des derniers combats, limité pour ne pas saturer le stockage.
 * La clé est versionnée : un changement de format incompatible repart d'un historique vide.
 */

const STORAGE_KEY = 'battler:history:v1'
const MAX_MATCHES = 300

export interface MatchRecord {
  id: string
  /** Horodatage (ms) */
  at: number
  mode: CombatResult['mode']
  /** Combat disputé dans le cadre d'un tournoi */
  tournament?: boolean
  fighters: Pair<string>
  names: Pair<string>
  winner: Side
  turns: number
  hpLeft: Pair<number>
  damage: Pair<number>
}

export interface OpponentRecord {
  fights: number
  wins: number
}

export interface CharacterRecord {
  fights: number
  wins: number
  played: number
  simulated: number
  turns: number
  attacks: number
  hits: number
  crits: number
  critDamage: number
  damageDealt: number
  damageTaken: number
  absorbed: number
  dodges: number
  dodgeAttempts: number
  bestHit: number
  tournamentWins: number
  events: number
  healed: number
  /** Bilan contre chaque adversaire, par id */
  opponents: Record<string, OpponentRecord>
}

export interface History {
  totalMatches: number
  played: number
  simulated: number
  tournaments: number
  characters: Record<string, CharacterRecord>
  matches: MatchRecord[]
}

const empty = (): History => ({ totalMatches: 0, played: 0, simulated: 0, tournaments: 0, characters: {}, matches: [] })

export const emptyRecord = (): CharacterRecord => ({
  fights: 0,
  wins: 0,
  played: 0,
  simulated: 0,
  turns: 0,
  attacks: 0,
  hits: 0,
  crits: 0,
  critDamage: 0,
  damageDealt: 0,
  damageTaken: 0,
  absorbed: 0,
  dodges: 0,
  dodgeAttempts: 0,
  bestHit: 0,
  tournamentWins: 0,
  events: 0,
  healed: 0,
  opponents: {},
})

function load(): History {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    // Complète les champs ajoutés depuis l'enregistrement des données.
    const data = { ...empty(), ...JSON.parse(raw) } as History
    for (const id of Object.keys(data.characters)) data.characters[id] = { ...emptyRecord(), ...data.characters[id] }
    return data
  } catch {
    return empty()
  }
}

function save(history: History) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {
    /* stockage plein ou indisponible : l'historique reste en mémoire pour la session */
  }
}

// Cache en mémoire : `getHistory` doit renvoyer le même objet tant que rien ne change.
let current = load()
const listeners = new Set<() => void>()

function update(next: History) {
  current = next
  save(next)
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Garde l'affichage à jour si un autre onglet enregistre un combat.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return
    current = load()
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export const getHistory = () => current

export const useHistory = () => useSyncExternalStore(subscribe, getHistory)

export function recordMatch(result: CombatResult, options: { tournament?: boolean } = {}) {
  const stats = computeStats(result)
  const ids: Pair<string> = [result.fighters[0].id, result.fighters[1].id]
  const characters = structuredClone(current.characters)

  for (const side of [0, 1] as Side[]) {
    const s = stats[side]
    const opp = other(side)
    const rec = (characters[ids[side]] ??= emptyRecord())
    const won = result.winner === side ? 1 : 0
    rec.fights++
    rec.wins += won
    rec[result.mode]++
    rec.turns += result.attacks.length
    rec.attacks += s.attacks
    rec.hits += s.hits
    rec.crits += s.crits
    rec.critDamage += s.critDamage
    rec.damageDealt += s.totalDamage
    rec.damageTaken += stats[opp].totalDamage
    rec.absorbed += s.absorbed
    rec.dodges += s.dodges
    rec.dodgeAttempts += s.dodgeAttempts
    rec.bestHit = Math.max(rec.bestHit, s.best)
    rec.events += s.events
    rec.healed += s.healed
    const vs = (rec.opponents[ids[opp]] ??= { fights: 0, wins: 0 })
    vs.fights++
    vs.wins += won
  }

  const match: MatchRecord = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    mode: result.mode,
    ...(options.tournament && { tournament: true }),
    fighters: ids,
    names: [result.fighters[0].name, result.fighters[1].name],
    winner: result.winner,
    turns: result.attacks.length,
    hpLeft: [stats[0].hpLeft, stats[1].hpLeft],
    damage: [stats[0].totalDamage, stats[1].totalDamage],
  }

  update({
    ...current,
    totalMatches: current.totalMatches + 1,
    played: current.played + (result.mode === 'played' ? 1 : 0),
    simulated: current.simulated + (result.mode === 'simulated' ? 1 : 0),
    characters,
    matches: [match, ...current.matches].slice(0, MAX_MATCHES),
  })
}

export function recordTournamentWin(characterId: string) {
  const characters = structuredClone(current.characters)
  const rec = (characters[characterId] ??= emptyRecord())
  rec.tournamentWins++
  update({ ...current, tournaments: current.tournaments + 1, characters })
}

export function clearHistory() {
  update(empty())
}

/** Ratios dérivés pour l'affichage ; `null` tant qu'il n'y a pas de données. */
export function ratios(rec: CharacterRecord) {
  const ratio = (a: number, b: number) => (b ? a / b : null)
  return {
    winRate: ratio(rec.wins, rec.fights),
    hitRate: ratio(rec.hits, rec.attacks),
    critRate: ratio(rec.crits, rec.hits),
    dodgeRate: ratio(rec.dodges, rec.dodgeAttempts),
    damagePerFight: ratio(rec.damageDealt, rec.fights),
    turnsPerFight: ratio(rec.turns, rec.fights),
  }
}
