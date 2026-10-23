import { describe, expect, it } from 'vitest'
import { simulateCombat, type Beat, type CombatResult } from './combat'
import { of } from './narration'
import { getRelic, RELICS } from './relics'
import { addReport, combatReport, emptyReport, relicsByProcs, type FighterReport } from './report'
import { seededRng } from './rng'
import { CHARACTER_IDS, createCharacter } from './roster'
import { createSeasonTournament, pendingOfDay, seasonFixtures, seasonReport, simulateSeasonMatches } from './season'
import { fillSlots } from './tournament'
import { traceText } from './trace'

/** Le même rapport, relu dans la trace texte d'un combat (trace.ts) : une lecture indépendante des étapes. */
function fromTrace(result: CombatResult, side: 0 | 1): FighterReport {
  const name = result.fighters[side].name
  const report = emptyReport()
  const face = (roll: number) => {
    while (report.faces.length < roll) report.faces.push(0)
    report.faces[roll - 1]++
  }
  const relic = (relicName: string) => {
    const id = RELICS.find((r) => r.name === relicName)!.id
    report.relics[id] = (report.relics[id] ?? 0) + 1
  }
  for (const line of traceText(result).split('\n')) {
    const attack = line.match(new RegExp(`${name} attaque .*?: dé (\\d+) sur d\\d+`))
    if (attack) {
      if (!line.includes('(dé de la paire)')) face(Number(attack[1]))
      for (const bonus of line.matchAll(/relique (.+?) \+\d+/g)) relic(bonus[1])
    }
    const pair = line.match(new RegExp(`${name} lance ses deux dés \\(d\\d+\\) : (\\d+) et (\\d+)`))
    if (pair) [pair[1], pair[2]].forEach((r) => face(Number(r)))
    const fired = line.match(new RegExp(`^.*?Relique « (.+?) » ${of(name)} \\(`))
    if (fired) relic(fired[1])
  }
  return report
}

describe('rapport de combat (report.ts)', () => {
  it('compte exact sur une chronologie connue : dés lancés, paire, coup de la paire, reliques', () => {
    const attack = (attacker: 0 | 1, roll: number, extra: object = {}) => ({ type: 'attack', attack: { attacker, roll, faces: 6, ...extra } })
    const beats = [
      attack(0, 4, { relicBonus: [{ relic: 'four-nail-shoe', name: 'Fer à quatre clous', amount: 4 }] }),
      attack(1, 6),
      { type: 'relic', side: 1, relic: 'wolf-fang', name: 'Dent de loup', effects: [], uses: 1 },
      { type: 'pair', side: 0, rolls: [2, 2], faces: 6 },
      // Les deux coups de la paire reprennent ses dés : ils ne comptent pas une seconde fois
      attack(0, 2, { preset: true }),
      attack(0, 2, { preset: true }),
      { type: 'coin', side: 1, status: 'heads', heads: true, effects: [] },
      attack(1, 1, { forfeited: true }),
      { type: 'relic', side: 1, relic: 'wolf-fang', name: 'Dent de loup', effects: [], uses: 2 },
    ] as unknown as Beat[]
    expect(combatReport({ beats })).toEqual([
      { relics: { 'four-nail-shoe': 1 }, faces: [0, 2, 0, 1] },
      { relics: { 'wolf-fang': 2 }, faces: [1, 0, 0, 0, 0, 1] },
    ])
  })

  it('cohérent avec la trace, sur des graines fixes (reliques de tous les types, deux dés)', () => {
    const fighters = [
      createCharacter('brokk').withRelics(RELICS),
      createCharacter('fanchon').withRelics([getRelic('four-nail-shoe'), getRelic('split-knucklebone'), getRelic('wolf-fang')]),
    ] as const
    let procs = 0
    let pairs = 0
    for (let seed = 1; seed <= 12; seed++) {
      const result = simulateCombat([...fighters], { seed })
      const report = combatReport(result)
      for (const side of [0, 1] as const) {
        const expected = fromTrace(result, side)
        expect(report[side].relics, `graine ${seed}, côté ${side}`).toEqual(expected.relics)
        expect(report[side].faces, `graine ${seed}, côté ${side}`).toEqual(expected.faces)
      }
      // Chaque étape `relic` et chaque bonus de coup comptent une fois
      const relicBeats = result.beats.filter((b) => b.type === 'relic').length
      const bonuses = result.beats.reduce((t, b) => t + (b.type === 'attack' ? (b.attack.relicBonus?.length ?? 0) : 0), 0)
      expect(Object.values(report[0].relics).concat(Object.values(report[1].relics)).reduce((t, n) => t + n, 0)).toBe(relicBeats + bonuses)
      procs += relicBeats + bonuses
      pairs += result.beats.filter((b) => b.type === 'pair').length
      // La barde lance deux dés par paire, et aucun autre dé que ceux de ses paires et de ses coups lancés
      const fanchonDice = result.beats.reduce(
        (t, b) => t + (b.type === 'pair' && b.side === 1 ? 2 : b.type === 'attack' && b.attack.attacker === 1 && !b.attack.preset ? 1 : 0),
        0,
      )
      expect(report[1].faces.reduce((t, n) => t + n, 0)).toBe(fanchonDice)
    }
    expect(procs).toBeGreaterThan(0)
    expect(pairs).toBeGreaterThan(0)
  })

  it('cumul : addReport additionne reliques et faces, relicsByProcs les classe', () => {
    const total = addReport(addReport(emptyReport(), { relics: { a: 2 }, faces: [1, 0, 3] }), { relics: { a: 1, b: 5 }, faces: [0, 2, 0, 0, 1] })
    expect(total).toEqual({ relics: { a: 3, b: 5 }, faces: [1, 2, 3, 0, 1] })
    expect(relicsByProcs(total)).toEqual([
      ['b', 5],
      ['a', 3],
    ])
  })

  it('saison : chaque match (regardé ou simulé) garde son rapport, le cumul suit les participants', () => {
    let t = createSeasonTournament(fillSlots(Array(20).fill(null), CHARACTER_IDS, seededRng(3)), (id) => createCharacter(id).name, { seed: 7 })
    t = simulateSeasonMatches(t, pendingOfDay(t.season!, 0))
    const season = t.season!
    const played = seasonFixtures(season).filter((f) => season.results[f.number])
    expect(played.length).toBeGreaterThan(0)
    for (const f of played) expect(season.results[f.number].report).toBeDefined()
    const reports = seasonReport(season)
    // Une journée : chaque participant a joué un match, son rapport est celui de ce match
    for (const f of played) {
      expect(reports[f.home]).toEqual(season.results[f.number].report![0])
      expect(reports[f.away]).toEqual(season.results[f.number].report![1])
    }
    // Rétrocompatible : sans rapport (saison enregistrée avant), le cumul est vide
    const old = { ...season, results: Object.fromEntries(Object.entries(season.results).map(([n, { report: _r, ...r }]) => [n, r])) }
    expect(seasonReport(old).every((r) => r.faces.length === 0 && Object.keys(r.relics).length === 0)).toBe(true)
  })
})
