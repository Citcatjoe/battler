import { describe, expect, it } from 'vitest'
import { simulateCombat } from './combat'
import { EPITHETS, uniqueNames } from './epithets'
import { copyDestinations, forgedFaces, isAuraSkill, offerTargets, stepKey, stepOf } from './forge'
import { MAX_SKILL_FACES, offerableRelics, offerableSkills, REWARDS } from './offers'
import { characterPool } from './masteries'
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
import { championRun, createTournament, entrantAura, fillSlots, matchFighters, matchKey, players, readyMatches, SLOTS, withResult, type Tournament } from './tournament'
import { rollFace } from './events'
import type { Character } from './character'

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

  it('construction : l’ordre d’un acte de campagne, réduit aux sortes activées (dix, cinq reliques, cinq forges, aucune)', () => {
    expect(buildRewards({ relics: true, forge: true })).toEqual([...REWARDS])
    expect(buildRewards({ relics: true, forge: true })).toEqual(['forge', 'relic', 'forge', 'relic', 'forge', 'relic', 'forge', 'relic', 'forge', 'relic'])
    expect(buildRewards({ relics: true, forge: false })).toEqual(Array(5).fill('relic'))
    expect(buildRewards({ relics: false, forge: true })).toEqual(Array(5).fill('forge'))
    expect(buildRewards({ relics: false, forge: false })).toEqual([])
  })

  it('construction : une récompense à chacun des dix premiers matchs, gagné ou perdu, offerte comme en campagne ; build complet au soir de la journée 10, figé jusqu’à la fin du tournoi', () => {
    let t = createSeasonTournament(participants(20), nameOf, { seed: 3, forge: true })
    // Un combattant qui porte une relique qu'il n'a pas reçue n'est pas celui du match
    const [home, away] = seasonFighters(seasonOf(t), 0)
    const armed = simulateCombat([home.withRelics([getRelic(RELICS[0].id)]), away], { seed: 1 })
    expect(() => withSeasonResult(t, 0, armed)).toThrow()

    t = simulateSeasonMatches(t, seasonFixtures(seasonOf(t)).map((f) => f.number))
    const season = seasonOf(t)
    expect(Object.keys(season.results)).toHaveLength(380)
    expect(t.results).toEqual({})
    for (const f of seasonFixtures(season)) {
      const r = season.results[f.number]
      // Chaque côté, gagnant comme perdant, reçoit sa récompense suivante aux dix premières journées ; après, plus rien
      ;[f.home, f.away].forEach((i, side) => {
        const before = buildOf(season, i, f.day)
        const count = before.relics.length + before.forge.length
        expect(count).toBe(Math.min(f.day, 10))
        const reward = r.rewards?.[side] ?? undefined
        expect(reward?.kind).toBe(f.day < 10 ? season.rewards[f.day] : undefined)
        // L'offre de la campagne (offers.ts) : reliques à sa portée qu'il n'a pas, gravures de ses maîtrises à sa portée
        const championId = season.entrants[i].characterId
        // Sa construction part de l'aura tirée au lancement (B7)
        const aura = season.entrants[i].aura
        if (reward?.kind === 'relic') {
          const pool = offerableRelics({ championId, aura, ...before })
          for (const id of reward.offer) expect(pool, `${championId} ${id}`).toContain(id)
          expect(reward.offer.some((id) => before.relics.includes(id))).toBe(false)
        }
        if (reward?.kind === 'forge') {
          const reach = offerableSkills({ championId, aura, ...before }, characterPool(createCharacter(championId, { aura }).definition)).map((s) => s.id)
          for (const o of reward.offer) if (o.op === 'engrave') for (const s of o.skills) expect(reach).toContain(s.id)
        }
        // Chacun combat avec ce qu'il a reçu aux journées précédentes
        const fighter = seasonFighters(season, f.number)[side]
        expect(fighter.relics.map((x) => x.id)).toEqual(before.relics)
        expect(fighter.forge.map(stepKey)).toEqual(before.forge.map(stepKey))
      })
      expect(!!r.rewards).toBe(f.day < 10)
    }
    // Au soir de la journée 10, chacun porte un build d'acte (cinq forges, cinq reliques, toutes différentes), le même
    // qu'en fin de saison ; son dé est complet (retour du 2026-10-28, A9) : `MAX_SKILL_FACES` faces de compétence, ou
    // les siennes (Morgrut, quatre), et aucune aura gravée (A2)
    season.entrants.forEach((e, i) => {
      const build = buildOf(season, i, 10)
      expect(build.forge).toHaveLength(5)
      expect(build.relics).toHaveLength(5)
      expect(new Set(build.relics).size).toBe(5)
      expect(buildOf(season, i)).toEqual(build)
      // Forgé sur son dé de départ : l'aura tirée sur le 1 (B7)
      const def = createCharacter(e.characterId, { aura: e.aura }).definition
      const faces = forgedFaces(def, build.forge)
      expect(faces.filter((f) => f.origin.length > 0 || f.engraved).length, e.label).toBe(def.skillFaces ?? MAX_SKILL_FACES)
      expect(build.forge.some((s) => s.op === 'engrave' && isAuraSkill(s.skill)), e.label).toBe(false)
    })
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
    // Reliques seules : cinq, aux cinq premières journées
    let t = createSeasonTournament(participants(20), nameOf, { seed: 8 })
    const season = () => seasonOf(t)
    const f3 = seasonSchedule(20)[3][0]
    const late = seasonSchedule(20)[30][0]
    expect(seasonStatus(season(), f3.number)).toBe('pending')
    expect(() => simulateSeasonMatches(t, [f3.number])).toThrow()
    t = simulateSeasonMatches(t, [...pendingOfDay(season(), 0), ...pendingOfDay(season(), 1), ...pendingOfDay(season(), 2)])
    expect(seasonStatus(season(), f3.number)).toBe('ready')
    // Journée par journée, jusqu'à ce que les deux combattants du match du retour aient leurs cinq reliques
    let day = 3
    while (seasonStatus(season(), late.number) === 'pending') t = simulateSeasonMatches(t, pendingOfDay(season(), day++))
    expect(day).toBe(5)
    for (const i of [late.home, late.away]) expect(buildOf(season(), i).relics).toHaveLength(5)
    // Il se joue avant les journées qui le précèdent, sans récompense
    t = simulateSeasonMatches(t, [late.number])
    expect(season().results[late.number].rewards).toBeUndefined()
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

  it('construction : l’observateur change la récompense d’un côté tant que ce combattant n’a pas rejoué', () => {
    let t = createSeasonTournament(participants(20), nameOf, { seed: 12, forge: true })
    const schedule = seasonSchedule(20)
    const nextOf = (entrant: number, day: number) => schedule[day].find((g) => g.home === entrant || g.away === entrant)!
    t = simulateSeasonMatches(t, pendingOfDay(seasonOf(t), 0))

    // Forge (journée 1, les deux côtés) : chaque opération de l'offre, sur une face qu'elle peut viser ; une autre est refusée
    const f0 = schedule[0][0]
    const rewards0 = seasonOf(t).results[f0.number].rewards!
    expect(rewards0[1]?.kind).toBe('forge')
    const forged = rewards0[0]
    if (forged?.kind !== 'forge') throw new Error('La journée 1 donne une forge')
    const smith = f0.home
    const def = createCharacter(seasonOf(t).entrants[smith].characterId).definition
    for (const offer of forged.offer) {
      const face = offerTargets(def, [], offer).at(-1)
      // Graver : chacune de ses compétences (une par maîtrise) se choisit
      for (const skill of offer.op === 'engrave' ? offer.skills : [undefined]) {
        const step = stepOf(offer, face, offer.op === 'copy' && face !== undefined ? copyDestinations(def, [], face).at(-1) : undefined, skill)
        t = chooseSeasonReward(t, f0.number, 0, step)
        expect(buildOf(seasonOf(t), smith).forge.map(stepKey)).toEqual([stepKey(step)])
      }
    }
    expect(() => chooseSeasonReward(t, f0.number, 0, stepOf(forged.offer[0], 999, 999))).toThrow()
    // Dorer n'est plus offerte (retour du 2026-10-28, A8) : refusée, comme toute opération hors de l'offre
    expect(forged.offer.some((o) => o.op === 'gild')).toBe(false)
    expect(() => chooseSeasonReward(t, f0.number, 0, { op: 'gild', face: 3 })).toThrow()

    // Relique (journée 2, côté droit) : une autre de l'offre ; une relique non proposée est refusée
    t = simulateSeasonMatches(t, pendingOfDay(seasonOf(t), 1))
    expect(() => chooseSeasonReward(t, f0.number, 0, forged.chosen)).toThrow() // le forgeron a rejoué
    const f1 = schedule[1][0]
    const relic = seasonOf(t).results[f1.number].rewards![1]
    if (relic?.kind !== 'relic') throw new Error('La journée 2 donne une relique')
    const other = relic.offer.find((id) => id !== relic.chosen)!
    const holder = f1.away
    const stale = simulateCombat(seasonFighters(seasonOf(t), nextOf(holder, 2).number), { seed: 1 })
    t = chooseSeasonReward(t, f1.number, 1, other)
    expect(buildOf(seasonOf(t), holder).relics).toEqual([other])
    expect(() => chooseSeasonReward(t, f1.number, 1, 'pas-une-relique')).toThrow()
    // Un combat préparé avant le changement n'est plus celui du match
    expect(() => withSeasonResult(t, nextOf(holder, 2).number, stale)).toThrow()
    // Il a rejoué : sa relique ne change plus
    t = simulateSeasonMatches(t, pendingOfDay(seasonOf(t), 2))
    expect(() => chooseSeasonReward(t, f1.number, 1, relic.chosen)).toThrow()
  })

  it('sans reliques ni forge : ni récompense ni construction, et l’arbre n’en donne pas', () => {
    let t = createSeasonTournament(participants(20), nameOf, { seed: 3, relics: false })
    expect(seasonOf(t).rewards).toEqual([])
    t = simulateSeasonMatches(t, seasonFixtures(seasonOf(t)).map((f) => f.number))
    expect(Object.values(seasonOf(t).results).every((r) => !r.rewards)).toBe(true)
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

describe('aura de départ tirée (retour du 2026-10-27, B7)', () => {
  const faceOne = (c: Character) => c.definition.events.find((e) => rollFace(e.trigger) === 1)?.id

  it('saison : chacun tire au lancement une aura parmi ses startAuras, reproductible à graine égale, toutes possibles', () => {
    const ids = participants(32, 4)
    const draw = (seed: number) => seasonOf(createSeasonTournament(ids, nameOf, { seed })).entrants.map((e) => e.aura)
    expect(draw(3)).toEqual(draw(3))
    expect(draw(3)).not.toEqual(draw(4))
    const seen = new Map<string, Set<string>>()
    for (let seed = 1; seed <= 40; seed++)
      draw(seed).forEach((aura, i) => {
        expect(createCharacter(ids[i]).definition.startAuras, ids[i]).toContain(aura)
        seen.set(ids[i], (seen.get(ids[i]) ?? new Set()).add(aura!))
      })
    // Sur quarante saisons, chaque aura de départ de chaque personnage sort au moins une fois
    for (const [id, auras] of seen) expect([...auras].sort(), id).toEqual([...createCharacter(id).definition.startAuras!].sort())
  })

  it('saison forgée : l’aura tient toute la saison puis l’arbre ; un combat parti d’une autre aura est refusé', () => {
    let t = createSeasonTournament(participants(20), nameOf, { seed: 3, forge: true })
    const season = () => seasonOf(t)
    // Un participant dont l'aura tirée n'est pas l'aura par défaut : son dé vanilla n'est pas celui du match
    const f = seasonFixtures(season()).find((g) => [g.home, g.away].some((i) => season().entrants[i].aura !== createCharacter(season().entrants[i].characterId).definition.startAuras![0]))!
    const side = season().entrants[f.home].aura !== createCharacter(season().entrants[f.home].characterId).definition.startAuras![0] ? 0 : 1
    t = simulateSeasonMatches(t, seasonFixtures(season()).filter((g) => g.day < f.day).map((g) => g.number))
    const pair = seasonFighters(season(), f.number)
    const vanilla = createCharacter(pair[side].id).withName(pair[side].name).withForge(pair[side].forge).withRelics(pair[side].relics)
    expect(() => withSeasonResult(t, f.number, simulateCombat(side === 0 ? [vanilla, pair[1]] : [pair[0], vanilla], { seed: 1 }))).toThrow()
    // Toute la saison : chaque combattant part de son aura tirée, sa forge (offerte sur ce dé) s'y applique
    t = simulateSeasonMatches(t, seasonFixtures(season()).map((g) => g.number).filter((n) => !season().results[n]))
    for (const g of seasonFixtures(season()))
      seasonFighters(season(), g.number).forEach((c, s) => expect(faceOne(c)).toBe(season().entrants[s === 0 ? g.home : g.away].aura))
    t = startBracket(t)
    for (const ref of readyMatches(t)) {
      const [a, b] = players(t, ref) as [number, number]
      expect(matchFighters(t, ref).map(faceOne)).toEqual([t.entrants[a].aura, t.entrants[b].aura])
    }
  })

  it('un participant sans aura (tournoi d’avant le tirage) ou dont l’aura n’est plus de ses startAuras part de l’aura par défaut', () => {
    const def = createCharacter('brokk').definition.startAuras!
    expect(entrantAura({ characterId: 'brokk' })).toBe(def[0])
    expect(entrantAura({ characterId: 'brokk', aura: 'holy-aura' })).toBe(def[0])
    expect(entrantAura({ characterId: 'brokk', aura: def.at(-1) })).toBe(def.at(-1))
  })
})
