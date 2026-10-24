import { describe, expect, it } from 'vitest'
import { simulateCombat } from './combat'
import { EPITHETS, uniqueNames } from './epithets'
import { copyDestinations, offerTargets, stepKey, stepOf } from './forge'
import { EMOJI } from './test-utils'
import { getRelic, RELICS } from './relics'
import { seededRng } from './rng'
import { CHARACTER_IDS, createCharacter } from './roster'
import {
  BRACKET_SEEDS,
  buildOf,
  buildRewards,
  chooseSeasonReward,
  createSeasonTournament,
  currentDay,
  drawSeasonParticipants,
  inSeason,
  nextSeasonMatch,
  pendingOfDay,
  SEASON_SIZES,
  seasonFighters,
  seasonFixtures,
  seasonMatchSeed,
  seasonSchedule,
  seasonStatus,
  simulateSeasonMatches,
  standings,
  startBracket,
  withSeasonResult,
  type Fixture,
  type Season,
  type SeasonResult,
} from './season'
import { championRun, createTournament, fillSlots, matchFighters, matchKey, players, readyMatches, SLOTS, withResult, type Tournament } from './tournament'

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
    expect(bracket.entrants).toEqual(
      BRACKET_SEEDS.map((rank) => ({ ...seasonOf(t).entrants[table[rank - 1].entrant], seasonRank: rank, build: buildOf(seasonOf(t), table[rank - 1].entrant) })),
    )
    // Les 8 derniers sont éliminés
    const eliminated = new Set(table.slice(SLOTS).map((s) => seasonOf(t).entrants[s.entrant].label))
    expect(bracket.entrants.some((e) => eliminated.has(e.label))).toBe(false)
  })

  it('construction : reliques et forge alternent, six récompenses avec les deux, trois avec une seule', () => {
    expect(buildRewards({ relics: true, forge: true })).toEqual(['relic', 'forge', 'relic', 'forge', 'relic', 'forge'])
    expect(buildRewards({ relics: true, forge: false })).toEqual(['relic', 'relic', 'relic'])
    expect(buildRewards({ relics: false, forge: true })).toEqual(['forge', 'forge', 'forge'])
    expect(buildRewards({ relics: false, forge: false })).toEqual([])
  })

  it('construction : chaque victoire rapporte la récompense suivante, jusqu’à trois de chaque, puis tout se fige jusqu’à la fin du tournoi', () => {
    let t = createSeasonTournament(participants(20), nameOf, { seed: 3, forge: true })
    // Un combattant qui porte une relique qu'il n'a pas gagnée n'est pas celui du match
    const [home, away] = seasonFighters(seasonOf(t), 0)
    const armed = simulateCombat([home.withRelics([getRelic(RELICS[0].id)]), away], { seed: 1 })
    expect(() => withSeasonResult(t, 0, armed)).toThrow()

    t = simulateSeasonMatches(t, seasonFixtures(seasonOf(t)).map((f) => f.number))
    const season = seasonOf(t)
    expect(Object.keys(season.results)).toHaveLength(380)
    expect(t.results).toEqual({})
    for (const f of seasonFixtures(season)) {
      const r = season.results[f.number]
      // Le vainqueur reçoit sa récompense suivante tant qu'il n'a pas les six ; après, plus rien
      const before = buildOf(season, r.winner === 0 ? f.home : f.away, f.day)
      const count = before.relics.length + before.forge.length
      expect(r.reward?.kind).toBe(count < 6 ? season.rewards[count] : undefined)
      // Chacun combat avec ce qu'il a gagné aux journées précédentes
      const fighters = seasonFighters(season, f.number)
      ;[f.home, f.away].forEach((i, side) => {
        const build = buildOf(season, i, f.day)
        expect(fighters[side].relics.map((x) => x.id)).toEqual(build.relics)
        expect(fighters[side].forge.map(stepKey)).toEqual(build.forge.map(stepKey))
      })
    }
    // Au bout de la saison, chacun a reçu une récompense par victoire, dans l'ordre, jusqu'aux six (trois de chaque) :
    // une offre de forge n'est jamais vide (Tremper l'arme vaut toujours), rien ne bloque la construction
    season.entrants.forEach((_, i) => {
      const { relics, forge } = buildOf(season, i)
      const wins = seasonFixtures(season).filter((f) => (season.results[f.number].winner === 0 ? f.home : f.away) === i).length
      const got = season.rewards.slice(0, Math.min(wins, season.rewards.length))
      expect(relics).toHaveLength(got.filter((k) => k === 'relic').length)
      expect(forge).toHaveLength(got.filter((k) => k === 'forge').length)
      expect(new Set(relics).size).toBe(relics.length)
    })
    expect(season.entrants.filter((_, i) => buildOf(season, i).relics.length === 3).length).toBeGreaterThan(season.entrants.length / 2)
    const [first] = seasonFixtures(season)
    const firstLoser = season.results[0].winner === 0 ? first.away : first.home
    expect(buildOf(season, firstLoser, 1)).toEqual({ relics: [], forge: [] })
    // Rejouer un match avec sa graine notée redonne le même vainqueur, avec la même construction
    const replay = simulateCombat(seasonFighters(season, 150), { seed: season.results[150].seed })
    expect(replay.winner).toBe(season.results[150].winner)
    expect(() => withSeasonResult(t, 150, replay)).toThrow() // déjà joué

    // L'arbre : chacun garde sa construction, figée ; aucune victoire n'y rapporte plus rien
    t = startBracket(t)
    t.entrants.forEach((e) => expect(e.build).toEqual(buildOf(season, season.entrants.findIndex((s) => s.label === e.label))))
    let seed = 1
    while (readyMatches(t).length) {
      for (const ref of readyMatches(t)) {
        const fighters = matchFighters(t, ref)
        const [a, b] = players(t, ref) as [number, number]
        expect(fighters[0].relics.map((x) => x.id)).toEqual(t.entrants[a].build!.relics)
        expect(fighters[1].forge.map(stepKey)).toEqual(t.entrants[b].build!.forge.map(stepKey))
        t = withResult(t, ref, simulateCombat(fighters, { seed: seed++ }), seededRng(seed))
        expect(t.results[matchKey(ref)].relic).toBeUndefined()
      }
    }
    const champ = championRun(t)!
    expect(champ.relics).toEqual(champ.entrant.build!.relics)
  })

  it('construction : un match attend que la construction de ses deux combattants soit connue ; figés, ils jouent dans l’ordre voulu', () => {
    let t = createSeasonTournament(participants(20), nameOf, { seed: 8 })
    const season = () => seasonOf(t)
    const f3 = seasonSchedule(20)[3][0]
    const late = seasonSchedule(20)[30][0]
    expect(seasonStatus(season(), f3.number)).toBe('pending')
    expect(() => simulateSeasonMatches(t, [f3.number])).toThrow()
    t = simulateSeasonMatches(t, [...pendingOfDay(season(), 0), ...pendingOfDay(season(), 1), ...pendingOfDay(season(), 2)])
    expect(seasonStatus(season(), f3.number)).toBe('ready')
    // Journée par journée, jusqu'à ce que les deux combattants du match du retour aient leurs trois reliques
    let day = 3
    while (seasonStatus(season(), late.number) === 'pending') t = simulateSeasonMatches(t, pendingOfDay(season(), day++))
    expect(day).toBeLessThan(30)
    for (const i of [late.home, late.away]) expect(buildOf(season(), i).relics).toHaveLength(3)
    // Il se joue avant les journées qui le précèdent, sans récompense
    t = simulateSeasonMatches(t, [late.number])
    expect(season().results[late.number].reward).toBeUndefined()
    expect(pendingOfDay(season(), day)).not.toEqual([])
  })

  it('le prochain match à jouer (« Combattre ») : le premier non joué de la journée en cours, prêt ; aucun en fin de saison', () => {
    let t = createSeasonTournament(participants(20), nameOf, { seed: 8 })
    const [first, second] = seasonSchedule(20)[0]
    expect(nextSeasonMatch(seasonOf(t))).toBe(first.number)
    t = simulateSeasonMatches(t, [first.number])
    expect(nextSeasonMatch(seasonOf(t))).toBe(second.number)
    t = simulateSeasonMatches(t, pendingOfDay(seasonOf(t), 0))
    const next = nextSeasonMatch(seasonOf(t))!
    expect(next).toBe(seasonSchedule(20)[1][0].number)
    expect(seasonStatus(seasonOf(t), next)).toBe('ready')
    t = simulateSeasonMatches(t, seasonFixtures(seasonOf(t)).map((f) => f.number).filter((n) => !seasonOf(t).results[n]))
    expect(nextSeasonMatch(seasonOf(t))).toBeNull()
  })

  it('construction : l’observateur change la récompense tant que le vainqueur n’a pas rejoué', () => {
    let t = createSeasonTournament(participants(20), nameOf, { seed: 12, forge: true })
    const fixtures = seasonFixtures(seasonOf(t))
    const winnerOf = (n: number) => (seasonOf(t).results[n].winner === 0 ? fixtures[n].home : fixtures[n].away)
    const nextOf = (entrant: number, day: number) => fixtures.find((g) => g.day === day && (g.home === entrant || g.away === entrant))!
    t = simulateSeasonMatches(t, pendingOfDay(seasonOf(t), 0))

    // Relique (journée 1) : une autre de l'offre ; une relique non proposée est refusée
    const number = fixtures[0].number
    const relic = seasonOf(t).results[number].reward
    if (relic?.kind !== 'relic') throw new Error('La journée 1 donne une relique')
    const other = relic.offer.find((id) => id !== relic.chosen)!
    const winner = winnerOf(number)
    const stale = simulateCombat(seasonFighters(seasonOf(t), nextOf(winner, 1).number), { seed: 1 })
    t = chooseSeasonReward(t, number, other)
    expect(buildOf(seasonOf(t), winner).relics).toEqual([other])
    expect(() => chooseSeasonReward(t, number, 'pas-une-relique')).toThrow()
    // Un combat préparé avant le changement n'est plus celui du match
    expect(() => withSeasonResult(t, nextOf(winner, 1).number, stale)).toThrow()

    // Le vainqueur a rejoué : sa relique ne change plus
    t = simulateSeasonMatches(t, pendingOfDay(seasonOf(t), 1))
    expect(() => chooseSeasonReward(t, number, relic.chosen)).toThrow()

    // Forge (journée 2, deuxième victoire) : chaque opération de l'offre, sur une face qu'elle peut viser ; une autre est refusée
    const n1 = seasonSchedule(20)[1].map((f) => f.number).find((n) => seasonOf(t).results[n].reward?.kind === 'forge')!
    const forged = seasonOf(t).results[n1].reward
    if (forged?.kind !== 'forge') throw new Error('Une deuxième victoire donne une forge')
    const smith = winnerOf(n1)
    const def = createCharacter(seasonOf(t).entrants[smith].characterId).definition
    const held = buildOf(seasonOf(t), smith, 1).forge
    for (const offer of forged.offer) {
      const face = offerTargets(def, held, offer).at(-1)
      const step = stepOf(offer, face, offer.op === 'copy' && face !== undefined ? copyDestinations(def, held, face).at(-1) : undefined)
      t = chooseSeasonReward(t, n1, step)
      expect(buildOf(seasonOf(t), smith).forge.map(stepKey)).toEqual([...held, step].map(stepKey))
    }
    const targeted = forged.offer.find((o) => o.op !== 'temper')!
    expect(() => chooseSeasonReward(t, n1, stepOf(targeted, 999, 999))).toThrow()
    const missing = (['temper', 'gild', 'sharpen', 'copy'] as const).find((op) => !forged.offer.some((o) => o.op === op))!
    expect(() => chooseSeasonReward(t, n1, missing === 'temper' ? { op: missing } : { op: missing, face: 1 })).toThrow()
  })

  it('sans reliques ni forge : ni récompense ni construction, et l’arbre n’en donne pas', () => {
    let t = createSeasonTournament(participants(20), nameOf, { seed: 3, relics: false })
    expect(seasonOf(t).rewards).toEqual([])
    t = simulateSeasonMatches(t, seasonFixtures(seasonOf(t)).map((f) => f.number))
    expect(Object.values(seasonOf(t).results).every((r) => !r.reward)).toBe(true)
    t = startBracket(t)
    expect(t.entrants.every((e) => !('build' in e))).toBe(true)
    const ref = { round: 0, index: 0 }
    t = withResult(t, ref, simulateCombat(matchFighters(t, ref), { seed: 1 }), seededRng(1))
    expect(t.results[matchKey(ref)].relic).toBeUndefined()
  })

  it('reproductible à graine égale', () => {
    // Les dix premières journées, avec reliques et forge : construction en cours
    const make = (seed: number) => {
      const t = createSeasonTournament(participants(32), nameOf, { seed, forge: true })
      return simulateSeasonMatches(t, Array.from({ length: 10 }, (_, d) => pendingOfDay(seasonOf(t), d)).flat())
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

  it('participants tirés au lancement : roster équilibré, reproductibles à graine égale', () => {
    for (const size of SEASON_SIZES) {
      const ids = drawSeasonParticipants(size, 7)
      expect(ids).toHaveLength(size)
      const counts = CHARACTER_IDS.map((id) => ids.filter((x) => x === id).length)
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
      expect(drawSeasonParticipants(size, 7)).toEqual(ids)
      expect(() => createSeasonTournament(ids, nameOf, { seed: 7 })).not.toThrow()
    }
    expect(drawSeasonParticipants(24, 7)).not.toEqual(drawSeasonParticipants(24, 8))
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
