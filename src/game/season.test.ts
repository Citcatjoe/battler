import { describe, expect, it } from 'vitest'
import { simulateCombat } from './combat'
import { EPITHETS, uniqueNames } from './epithets'
import { EMOJI } from './test-utils'
import { getRelic, RELICS } from './relics'
import { seededRng } from './rng'
import { CHARACTER_IDS, createCharacter } from './roster'
import {
  BRACKET_SEEDS,
  createSeasonTournament,
  currentDay,
  inSeason,
  pendingOfDay,
  SEASON_SIZES,
  seasonFighters,
  seasonFixtures,
  seasonMatchSeed,
  seasonSchedule,
  simulateSeasonMatches,
  standings,
  startBracket,
  withSeasonResult,
  type Fixture,
  type Season,
  type SeasonResult,
} from './season'
import { createTournament, fillSlots, matchFighters, matchKey, players, readyMatches, SLOTS, withResult, type Tournament } from './tournament'

const nameOf = (id: string) => createCharacter(id).name
const participants = (n: number, seed = 5) => fillSlots(Array(n).fill(null), CHARACTER_IDS, seededRng(seed))
const seasonOf = (t: Tournament): Season => t.season!

/** Bilan inventé d'un match : `winner` (index de participant) l'emporte, avec les dégâts de chacun. */
function fake(f: Fixture, winner: number, damage: Record<number, number> = {}): SeasonResult {
  return {
    winner: winner === f.home ? 0 : 1,
    turns: 5,
    hpLeft: [winner === f.home ? 10 : 0, winner === f.away ? 10 : 0],
    damage: [damage[f.home] ?? 0, damage[f.away] ?? 0],
    seed: 0,
    mode: 'simulated',
  }
}

const withResults = (t: Tournament, results: Record<number, SeasonResult>): Tournament => ({
  ...t,
  season: { ...seasonOf(t), results: { ...seasonOf(t).results, ...results } },
})

describe('saison', () => {
  it('calendrier aller-retour : chaque paire deux fois, camps inversés, un match par participant et par journée', () => {
    for (const n of SEASON_SIZES) {
      const days = seasonSchedule(n)
      expect(days).toHaveLength(2 * (n - 1))
      const ordered = new Map<string, number>()
      days.forEach((day, d) => {
        expect(day).toHaveLength(n / 2)
        const seen = day.flatMap((f) => [f.home, f.away])
        expect(new Set(seen).size).toBe(n)
        for (const f of day) {
          expect(f.day).toBe(d)
          expect(f.number).toBe(d * (n / 2) + f.index)
          expect(f.home).not.toBe(f.away)
          ordered.set(`${f.home}-${f.away}`, (ordered.get(`${f.home}-${f.away}`) ?? 0) + 1)
        }
      })
      // Chaque paire ordonnée (camp gauche, camp droit) une seule fois : deux rencontres, camps inversés
      expect(ordered.size).toBe(n * (n - 1))
      expect([...ordered.values()].every((c) => c === 1)).toBe(true)
      // L'aller (n−1 premières journées) contient chaque paire une fois ; le retour la reprend à l'envers
      const first = days.slice(0, n - 1).flat()
      expect(new Set(first.map((f) => [f.home, f.away].sort((a, b) => a - b).join('-'))).size).toBe((n * (n - 1)) / 2)
      days.slice(n - 1).forEach((day, d) => day.forEach((f, i) => expect([f.away, f.home]).toEqual([days[d][i].home, days[d][i].away])))
    }
  })

  it('points, puis différence de PV, puis confrontations directes, puis ordre de tirage', () => {
    const t = createSeasonTournament(participants(20), nameOf, { seed: 1 })
    const fixtures = seasonFixtures(seasonOf(t))
    const find = (a: number, b: number) => fixtures.find((f) => f.home === a && f.away === b)!
    const results: Record<number, SeasonResult> = {}
    const put = (a: number, b: number, winner: number, damage: Record<number, number>) => {
      const f = find(a, b)
      results[f.number] = fake(f, winner, damage)
    }
    put(0, 1, 1, { 0: 10, 1: 10 }) // 0 et 1 : 3 points et différence nulle chacun, 1 a battu 0
    put(0, 2, 0, { 0: 10, 2: 10 })
    put(3, 4, 3, { 3: 5, 4: 50 }) // 3 gagne mais encaisse plus : les points passent avant la différence
    const table = standings(seasonOf(withResults(t, results)))
    expect(table.map((s) => s.entrant)).toEqual([1, 0, 3, 4, 2, ...Array.from({ length: 15 }, (_, i) => i + 5)])
    const row = (i: number) => table.find((s) => s.entrant === i)!
    expect(row(3)).toMatchObject({ played: 1, wins: 1, losses: 0, points: 3, damageFor: 5, damageAgainst: 50, diff: -45 })
    expect(row(4)).toMatchObject({ points: 0, diff: 45 })
    expect(row(0)).toMatchObject({ played: 2, wins: 1, losses: 1, points: 3, diff: 0 })
  })

  it('les 16 premiers entrent dans l’arbre en têtes de série, sous leur nom de saison', () => {
    const t = createSeasonTournament(participants(24), nameOf, { seed: 2 })
    expect(() => startBracket(t)).toThrow()
    // Le plus petit index gagne toujours : le classement suit l'ordre de tirage
    const results = Object.fromEntries(seasonFixtures(seasonOf(t)).map((f) => [f.number, fake(f, Math.min(f.home, f.away))]))
    const done = withResults(t, results)
    expect(currentDay(seasonOf(done))).toBeNull()
    const table = standings(seasonOf(done))
    expect(table.map((s) => s.entrant)).toEqual(Array.from({ length: 24 }, (_, i) => i))
    expect(table[0].points).toBe(23 * 2 * 3)

    const bracket = startBracket(done)
    expect(inSeason(bracket)).toBe(false)
    expect(bracket.entrants).toHaveLength(SLOTS)
    expect(bracket.entrants.map((e) => e.seasonRank)).toEqual([...BRACKET_SEEDS])
    bracket.entrants.forEach((e) => expect(e.label).toBe(seasonOf(t).entrants[e.seasonRank! - 1].label))
    // Huitièmes : 1–16, 8–9, 5–12, 4–13, 3–14, 6–11, 7–10, 2–15 ; le 1er et le 2e dans deux moitiés
    const firstRound = Array.from({ length: 8 }, (_, index) => players(bracket, { round: 0, index }).map((i) => bracket.entrants[i!].seasonRank))
    expect(firstRound).toEqual([[1, 16], [8, 9], [5, 12], [4, 13], [3, 14], [6, 11], [7, 10], [2, 15]])
    expect(() => startBracket(bracket)).toThrow()
  })

  it('l’arbre reste vide pendant la saison, puis reçoit exactement les 16 premiers du classement', () => {
    const ids = participants(24, 11)
    let t = createSeasonTournament(ids, nameOf, { seed: 6 })
    // Rien de la configuration n'entre dans l'arbre : il est vide, ses matchs sans participants
    expect(t.entrants).toEqual([])
    expect(t.results).toEqual({})
    expect(seasonOf(t).entrants.map((e) => e.characterId)).toEqual(ids)
    t = simulateSeasonMatches(t, seasonFixtures(seasonOf(t)).map((f) => f.number))
    expect(t.entrants).toEqual([])
    const table = standings(seasonOf(t))
    const bracket = startBracket(t)
    expect(bracket.entrants).toEqual(BRACKET_SEEDS.map((rank) => ({ ...seasonOf(t).entrants[table[rank - 1].entrant], seasonRank: rank })))
    // Les 8 derniers sont éliminés
    const eliminated = new Set(table.slice(SLOTS).map((s) => seasonOf(t).entrants[s.entrant].label))
    expect(bracket.entrants.some((e) => eliminated.has(e.label))).toBe(false)
  })

  it('aucune relique pendant la saison ; elles reprennent dans l’arbre', () => {
    let t = createSeasonTournament(participants(20), nameOf, { seed: 3 })
    expect(t.relics).toBe(true)
    // Un combattant qui porte une relique n'est pas celui du match
    const [home, away] = seasonFighters(seasonOf(t), 0)
    const armed = simulateCombat([home.withRelics([getRelic(RELICS[0].id)]), away], { seed: 1 })
    expect(() => withSeasonResult(t, 0, armed)).toThrow()

    t = simulateSeasonMatches(t, seasonFixtures(seasonOf(t)).map((f) => f.number))
    const season = seasonOf(t)
    expect(Object.keys(season.results)).toHaveLength(380)
    expect(t.results).toEqual({})
    // Rejouer un match avec sa graine notée redonne le même vainqueur, sans relique
    const replay = simulateCombat(seasonFighters(season, 7), { seed: season.results[7].seed })
    expect(replay.fighters.every((f) => f.relics.length === 0)).toBe(true)
    expect(replay.winner).toBe(season.results[7].winner)
    expect(() => withSeasonResult(t, 7, replay)).toThrow() // déjà joué

    t = startBracket(t)
    const ref = { round: 0, index: 0 }
    t = withResult(t, ref, simulateCombat(matchFighters(t, ref), { seed: 1 }), seededRng(1))
    expect(t.results[matchKey(ref)].relic).toBeDefined()
  })

  it('reproductible à graine égale', () => {
    const make = (seed: number) => {
      const t = createSeasonTournament(participants(32), nameOf, { seed })
      return simulateSeasonMatches(t, [...pendingOfDay(seasonOf(t), 0), ...pendingOfDay(seasonOf(t), 40)])
    }
    expect(seasonOf(make(9)).results).toEqual(seasonOf(make(9)).results)
    expect(seasonOf(make(9)).results).not.toEqual(seasonOf(make(10)).results)
    // La graine d'un match ne dépend que de la saison et de son numéro
    const s = seasonOf(make(9))
    expect(s.results[0].seed).toBe(seasonMatchSeed(s, 0))
    expect(new Set(Array.from({ length: 992 }, (_, i) => seasonMatchSeed(s, i))).size).toBe(992)
    // Journée par journée ou d'un coup : même saison
    const t = createSeasonTournament(participants(20), nameOf, { seed: 4 })
    let byDay = t
    for (let d = currentDay(seasonOf(byDay)); d !== null && d < 3; d = currentDay(seasonOf(byDay)))
      byDay = simulateSeasonMatches(byDay, pendingOfDay(seasonOf(byDay), d))
    const atOnce = simulateSeasonMatches(t, Array.from({ length: 30 }, (_, i) => i))
    expect(seasonOf(byDay).results).toEqual(seasonOf(atOnce).results)
  })

  it('un tournoi sans saison reste l’arbre seul', () => {
    const slots = participants(SLOTS)
    const t = createTournament(slots, nameOf)
    expect('season' in t).toBe(false)
    expect(inSeason(t)).toBe(false)
    expect(Object.keys(t)).toEqual(['entrants', 'results', 'relics'])
    expect(t.entrants.every((e) => !('seasonRank' in e))).toBe(true)
    expect(readyMatches(t)).toHaveLength(8)
    expect(() => withSeasonResult(t, 0, simulateCombat([createCharacter('gorak'), createCharacter('brokk')], { seed: 1 }))).toThrow()
  })
})

describe('noms uniques', () => {
  it('chaque personnage a assez d’épithètes, distinctes et sans emoji', () => {
    // Le plus d'apparitions qu'un personnage peut avoir quand « Compléter » remplit 32 cases
    let most = 0
    for (let seed = 1; seed < 200; seed++) {
      const counts = new Map<string, number>()
      for (const id of participants(32, seed)) counts.set(id, (counts.get(id) ?? 0) + 1)
      most = Math.max(most, ...counts.values())
    }
    expect(most).toBe(Math.ceil(32 / CHARACTER_IDS.length))
    for (const id of CHARACTER_IDS) {
      const pool = EPITHETS[id]
      expect(pool.length, id).toBeGreaterThanOrEqual(Math.max(6, 2 * most))
      expect(new Set(pool).size, id).toBe(pool.length)
      for (const e of pool) expect(e.match(EMOJI)?.[0], e).toBeUndefined()
    }
  })

  it('32 participants : noms tous distincts, reproductibles à graine égale', () => {
    const ids = participants(32, 8)
    const names = (seed: number) => seasonOf(createSeasonTournament(ids, nameOf, { seed, uniqueNames: true })).entrants.map((e) => e.label)
    expect(new Set(names(3)).size).toBe(32)
    expect(names(3)).toEqual(names(3))
    expect(names(3)).not.toEqual(names(4))
    // Le personnage reste reconnaissable : son nom, puis son épithète
    names(3).forEach((label, i) => expect(EPITHETS[ids[i]].map((e) => `${nameOf(ids[i])} ${e}`)).toContain(label))
    // Sans l'interrupteur, les chiffres romains
    expect(seasonOf(createSeasonTournament(ids, nameOf, { seed: 3 })).entrants.some((e) => / (I|II|III|IV)$/.test(e.label))).toBe(true)
    // Au-delà du registre (cases posées à la main), les noms restent distincts
    const many = uniqueNames(Array(20).fill('gorak'), nameOf, seededRng(1))
    expect(new Set(many).size).toBe(20)
    expect(createTournament(participants(SLOTS), nameOf, { epithets: seededRng(2) }).entrants.every((e) => !/ I+$/.test(e.label))).toBe(true)
  })
})
