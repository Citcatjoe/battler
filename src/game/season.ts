import type { Character } from './character'
import { simulateCombat, finalState, type CombatResult, type Pair, type Side } from './combat'
import { seededRng } from './rng'
import { createCharacter } from './roster'
import { computeStats } from './stats'
import { labelEntrants, SLOTS, type Entrant, type Tournament } from './tournament'

/*
 * Phase de saison (0.86.0), facultative, avant l'arbre du tournoi : un championnat aller-retour à 20, 24 ou
 * 32 participants. Chacun rencontre chacun deux fois, camps inversés au retour, en journées (tableau
 * circulaire de Berger : chaque participant joue une fois par journée). Victoire 3 points, défaite 0 : le
 * moteur ne produit jamais de nul (la limite de tours désigne aussi un vainqueur). Les 16 premiers du
 * classement entrent dans l'arbre, placés en têtes de série.
 *
 * Pendant la saison : ni relique gagnée ni portée, ni pari, ni récompense. Chaque combat a sa graine,
 * dérivée de celle de la saison et du numéro du match : toute la saison se rejoue à l'identique. Seul un
 * bilan compact de chaque match est gardé, jamais sa chronologie.
 */

export const SEASON_SIZES = [20, 24, 32] as const
export type SeasonSize = (typeof SEASON_SIZES)[number]
export const DEFAULT_SEASON_SIZE: SeasonSize = 24

export const WIN_POINTS = 3

/**
 * Têtes de série des huitièmes, dans l'ordre de l'arbre : le match i oppose les rangs `BRACKET_SEEDS[2i]` et
 * `BRACKET_SEEDS[2i + 1]`. Le 1er et le 2e sont dans deux moitiés : ils ne peuvent se croiser qu'en finale.
 */
export const BRACKET_SEEDS = [1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15] as const

/** Une rencontre du calendrier. `home` joue à gauche (côté 0), `away` à droite (côté 1). */
export interface Fixture {
  /** Journée, de 0 à 2(n−1)−1 : les n−1 premières sont l'aller, les suivantes le retour */
  day: number
  /** Place dans la journée */
  index: number
  /** Numéro du match dans la saison (clé de son résultat et de sa graine) */
  number: number
  home: number
  away: number
}

/** Bilan compact d'un match de saison : de quoi tenir le classement et rejouer le combat (`seed`). */
export interface SeasonResult {
  /** Côté vainqueur : 0 = `home`, 1 = `away` */
  winner: Side
  turns: number
  /** PV restants de chaque côté */
  hpLeft: Pair<number>
  /**
   * Dégâts infligés par chaque côté : ses coups qui touchent + les dégâts d'effets subis par l'adversaire
   * (même compte que le bilan du champion, `championRun`).
   */
  damage: Pair<number>
  seed: number
  mode: CombatResult['mode']
}

export interface Season {
  /** Les participants, dans l'ordre de tirage (dernier critère de départage) */
  entrants: Entrant[]
  /** Graine de la saison : celle de chaque match en dérive */
  seed: number
  /** Résultats par numéro de match */
  results: Record<number, SeasonResult>
}

export interface Standing {
  /** Index du participant dans `Season.entrants` */
  entrant: number
  played: number
  wins: number
  losses: number
  points: number
  damageFor: number
  damageAgainst: number
  /** Différence de PV : dégâts infligés − dégâts subis */
  diff: number
}

const schedules = new Map<number, Fixture[][]>()

/**
 * Calendrier aller-retour de `n` participants (n pair) : 2(n−1) journées de n/2 matchs. Méthode du tableau
 * circulaire : le dernier participant reste fixe, les autres tournent d'un cran à chaque journée. Le retour
 * reprend l'aller, journée par journée, camps inversés.
 */
export function seasonSchedule(n: number): Fixture[][] {
  const cached = schedules.get(n)
  if (cached) return cached
  if (n < 2 || n % 2) throw new Error(`Une saison se joue à un nombre pair de participants (${n})`)
  const half = n / 2
  const first: Pair<number>[][] = []
  for (let r = 0; r < n - 1; r++) {
    const circle = [n - 1, ...Array.from({ length: n - 1 }, (_, i) => (i + r) % (n - 1))]
    const day: Pair<number>[] = []
    for (let i = 0; i < half; i++) {
      const a = circle[i]
      const b = circle[n - 1 - i]
      // Alterne les camps (le participant fixe change de côté à chaque journée)
      day.push((i === 0 ? r % 2 === 1 : i % 2 === 1) ? [b, a] : [a, b])
    }
    first.push(day)
  }
  const days = [...first, ...first.map((day) => day.map(([a, b]): Pair<number> => [b, a]))]
  const schedule = days.map((day, d) => day.map(([home, away], index) => ({ day: d, index, number: d * half + index, home, away })))
  schedules.set(n, schedule)
  return schedule
}

export const seasonFixtures = (season: Season) => seasonSchedule(season.entrants.length).flat()
export const matchCount = (season: Season) => season.entrants.length * (season.entrants.length - 1)
export const playedCount = (season: Season) => Object.keys(season.results).length
export const seasonDone = (season: Season) => playedCount(season) === matchCount(season)

/** Journée en cours : la première qui a encore un match à jouer (null quand la saison est finie). */
export function currentDay(season: Season): number | null {
  const day = seasonSchedule(season.entrants.length).find((d) => d.some((f) => !season.results[f.number]))
  return day ? day[0].day : null
}

/** Phase de saison en cours : le tournoi en a une, et son arbre n'est pas encore tiré. */
export const inSeason = (t: Tournament): t is Tournament & { season: Season } => !!t.season && t.entrants.length === 0

/**
 * Crée un tournoi qui commence par une saison. `participants` : ids des personnages, dans l'ordre de tirage ;
 * `seed` : graine de la saison (tirée par l'appelant).
 */
export function createSeasonTournament(
  participants: string[],
  nameOf: (id: string) => string,
  { relics = true, seed, uniqueNames = false }: { relics?: boolean; seed: number; uniqueNames?: boolean },
): Tournament {
  if (!(SEASON_SIZES as readonly number[]).includes(participants.length))
    throw new Error(`Une saison compte ${SEASON_SIZES.join(', ')} participants (${participants.length})`)
  // Noms uniques : tirés à la graine de la saison, sur un hasard à part de celui des matchs
  const entrants = labelEntrants(participants, nameOf, uniqueNames ? seededRng((seed ^ 0x6e6f6d73) | 0) : undefined)
  return { entrants: [], results: {}, relics, season: { entrants, seed: seed >>> 0, results: {} } }
}

/** Graine d'un match de saison, dérivée de la graine de la saison et du numéro du match. */
export function seasonMatchSeed(season: Season, number: number): number {
  return Math.floor(seededRng((season.seed ^ Math.imul(number + 1, 0x9e3779b1)) | 0)() * 4294967296) >>> 0
}

const fixtureOf = (season: Season, number: number): Fixture => {
  const half = season.entrants.length / 2
  const f = seasonSchedule(season.entrants.length)[Math.floor(number / half)]?.[number % half]
  if (!f || number < 0) throw new Error(`Match de saison ${number} inconnu`)
  return f
}

/** Les deux combattants d'un match de saison, sous leur nom de tournoi, sans relique. */
export function seasonFighters(season: Season, number: number): Pair<Character> {
  const { home, away } = fixtureOf(season, number)
  const make = (i: number) => createCharacter(season.entrants[i].characterId).withName(season.entrants[i].label)
  return [make(home), make(away)]
}

/**
 * Enregistre l'issue d'un match de saison (renvoie un nouveau tournoi) : son bilan compact, sans récompense.
 * Refuse un match déjà joué, hors saison, ou un combat dont les combattants ne sont pas ceux du match (ou qui
 * portent une relique) : l'appelant ne doit alors rien enregistrer.
 */
export function withSeasonResult(t: Tournament, number: number, result: CombatResult): Tournament {
  if (!inSeason(t)) throw new Error('Pas de saison en cours')
  const { season } = t
  const { home, away } = fixtureOf(season, number)
  if (season.results[number]) throw new Error(`Match de saison ${number} déjà joué`)
  const expected = [home, away].map((i) => `${season.entrants[i].characterId}+`)
  const actual = result.fighters.map((f) => `${f.id}+${f.relics.map((r) => r.id).join(',')}`)
  if (actual[0] !== expected[0] || actual[1] !== expected[1]) throw new Error(`Le combat ne correspond pas au match de saison ${number}`)
  const stats = computeStats(result)
  const hp = finalState(result).hp
  const compact: SeasonResult = {
    winner: result.winner,
    turns: result.turns,
    hpLeft: [hp[0], hp[1]],
    damage: [stats[0].totalDamage + stats[1].effectDamageTaken, stats[1].totalDamage + stats[0].effectDamageTaken],
    seed: result.seed ?? seasonMatchSeed(season, number),
    mode: result.mode,
  }
  return { ...t, season: { ...season, results: { ...season.results, [number]: compact } } }
}

/**
 * Simule des matchs de saison avec leur graine. Rien d'autre : ni trace dans `logs/combats/`, ni historique
 * (des centaines de combats par tournoi fausseraient les statistiques).
 */
export function simulateSeasonMatches(t: Tournament, numbers: readonly number[]): Tournament {
  let next = t
  for (const number of numbers) {
    if (!inSeason(next)) break
    const result = simulateCombat(seasonFighters(next.season, number), { seed: seasonMatchSeed(next.season, number) })
    next = withSeasonResult(next, number, result)
  }
  return next
}

/** Matchs pas encore joués d'une journée. */
export const pendingOfDay = (season: Season, day: number) =>
  (seasonSchedule(season.entrants.length)[day] ?? []).filter((f) => !season.results[f.number]).map((f) => f.number)

/**
 * Classement de la saison (matchs joués seulement). Départage, dans l'ordre : points ; différence de PV ;
 * confrontations directes (points pris entre les seuls ex aequo) ; ordre de tirage.
 */
export function standings(season: Season): Standing[] {
  const rows: Standing[] = season.entrants.map((_, entrant) => ({
    entrant,
    played: 0,
    wins: 0,
    losses: 0,
    points: 0,
    damageFor: 0,
    damageAgainst: 0,
    diff: 0,
  }))
  const played: { fixture: Fixture; result: SeasonResult }[] = []
  for (const fixture of seasonFixtures(season)) {
    const result = season.results[fixture.number]
    if (!result) continue
    played.push({ fixture, result })
    const sides: Pair<number> = [fixture.home, fixture.away]
    sides.forEach((i, side) => {
      const row = rows[i]
      const won = result.winner === side
      row.played++
      if (won) {
        row.wins++
        row.points += WIN_POINTS
      } else row.losses++
      row.damageFor += result.damage[side]
      row.damageAgainst += result.damage[1 - side]
    })
  }
  for (const row of rows) row.diff = row.damageFor - row.damageAgainst

  // Confrontations directes : points pris contre les participants à égalité de points et de différence
  const headToHead = (row: Standing) => {
    const group = new Set(rows.filter((r) => r.points === row.points && r.diff === row.diff).map((r) => r.entrant))
    if (group.size < 2) return 0
    let points = 0
    for (const { fixture, result } of played) {
      if (!group.has(fixture.home) || !group.has(fixture.away)) continue
      if ((result.winner === 0 ? fixture.home : fixture.away) === row.entrant) points += WIN_POINTS
    }
    return points
  }
  const h2h = new Map(rows.map((r) => [r.entrant, headToHead(r)]))
  return [...rows].sort(
    (a, b) => b.points - a.points || b.diff - a.diff || h2h.get(b.entrant)! - h2h.get(a.entrant)! || a.entrant - b.entrant,
  )
}

/**
 * Fin de la saison : les 16 premiers du classement entrent dans l'arbre, placés en têtes de série
 * (`BRACKET_SEEDS`), sous leur nom de saison et avec leur rang. Refusé tant que la saison n'est pas finie.
 */
export function startBracket(t: Tournament): Tournament {
  if (!inSeason(t)) throw new Error('Pas de saison en cours')
  if (!seasonDone(t.season)) throw new Error('La saison n’est pas terminée')
  const table = standings(t.season)
  const entrants = BRACKET_SEEDS.map((rank) => ({ ...t.season.entrants[table[rank - 1].entrant], seasonRank: rank }))
  if (entrants.length !== SLOTS) throw new Error(`Il faut ${SLOTS} qualifiés`)
  return { ...t, entrants }
}
