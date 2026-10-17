import { describe, expect, it } from 'vitest'
import { statusCatalog } from './catalog'
import { ARENAS, getArena, RANDOM_ARENA, resolveArena } from './arenas'
import { attacksOf, finalState, simulateCombat, type AppliedEffect, type CombatResult } from './combat'
import { describeEvent, TRIGGERS, type Effect } from './events'
import { getHistory, normalize, recordMatch, recordTournamentWin, clearHistory } from './history'
import { attackLog, effectBadge, effectText, eventLog } from './narration'
import { chance, rollDie, seededRng, shuffle } from './rng'
import { CHARACTER_IDS, createCharacter, ROSTER, validateRoster } from './roster'
import { computeStats } from './stats'
import { STATUS_IDS, statusCounter } from './statuses'
import {
  champion,
  createTournament,
  fillSlots,
  matchFighters,
  readyMatches,
  SLOTS,
  status,
  withResult,
  type Tournament,
} from './tournament'

const duel = (a: string, b: string, seed: number) =>
  simulateCombat([createCharacter(a), createCharacter(b)], { rng: seededRng(seed) })

describe('arènes', () => {
  it('ont des ids uniques, une image et un nom', () => {
    expect(new Set(ARENAS.map((a) => a.id)).size).toBe(ARENAS.length)
    for (const a of ARENAS) expect(a.name && a.image && a.focus && a.filter).toBeTruthy()
  })
  it('« au hasard » tire chaque arène, un id inconnu retombe sur la première', () => {
    const rng = seededRng(3)
    const drawn = new Set(Array.from({ length: 200 }, () => resolveArena(RANDOM_ARENA, rng).id))
    expect(drawn.size).toBe(ARENAS.length)
    expect(resolveArena(ARENAS[1].id)).toBe(ARENAS[1])
    expect(getArena('inconnue')).toBe(ARENAS[0])
  })
})

describe('catalogue des statuts', () => {
  it('liste chaque statut une fois, avec ses règles et qui le pose', () => {
    const catalog = statusCatalog()
    expect(catalog.map((e) => e.id).sort()).toEqual([...STATUS_IDS].sort())
    for (const e of catalog) expect(e.rules.length).toBeGreaterThan(0)
    const poison = catalog.find((e) => e.id === 'poison')!
    expect(poison.inGame).toBe(true)
    expect(poison.sources.map((s) => s.character.id).sort()).toEqual(['caldrec', 'ervald'])
    expect(poison.sources.every((s) => s.target === 'opponent')).toBe(true)
    expect(catalog.find((e) => e.id === 'regeneration')!.inGame).toBe(false)
    // Bonus d'abord, puis malus
    const firstNegative = catalog.findIndex((e) => e.def.polarity === 'negative')
    expect(catalog.slice(firstNegative).every((e) => e.def.polarity === 'negative')).toBe(true)
  })
  it('nombre affiché sur un état : tours restants s’il a une durée, sinon ses charges', () => {
    expect(statusCounter({ id: 'poison', stacks: 2, turns: 3 })).toEqual({ value: 3, unit: 'turns' })
    expect(statusCounter({ id: 'bonusArmor', stacks: 4 })).toEqual({ value: 4, unit: 'stacks' })
    expect(statusCounter({ id: 'guaranteedCrit', stacks: 1 })).toEqual({ value: 1, unit: 'stacks' })
  })
  it('décrit les conditions des événements', () => {
    const text = describeEvent({
      id: 'x',
      name: 'x',
      trigger: 'hit',
      effects: [{ type: 'heal', amount: 2 }],
      when: [
        { type: 'hpBelow', who: 'self', ratio: 0.5 },
        { type: 'hasStatus', who: 'opponent', status: 'poison', stacks: 2 },
        { type: 'lacksStatus', who: 'self', status: 'bonusArmor' },
        { type: 'hpAtLeast', who: 'opponent', ratio: 0.25 },
        { type: 'fromTurn', turn: 3 },
      ],
    })
    expect(text).toContain('sous 50 %')
    expect(text).toContain('tour 3')
  })
})

describe('rng', () => {
  it('seededRng est déterministe et dans [0, 1[', () => {
    const a = seededRng(7)
    const b = seededRng(7)
    for (let i = 0; i < 1000; i++) {
      const v = a()
      expect(v).toBe(b())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('rollDie couvre toutes les faces, chance respecte les bornes', () => {
    const rng = seededRng(1)
    const seen = new Set(Array.from({ length: 2000 }, () => rollDie(rng, 6)))
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6])
    expect(Array.from({ length: 100 }, () => chance(rng, 0)).some(Boolean)).toBe(false)
    expect(Array.from({ length: 100 }, () => chance(rng, 1)).every(Boolean)).toBe(true)
    expect(shuffle(rng, [1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4])
  })
})

describe('roster', () => {
  it('les données sont valides', () => {
    expect(validateRoster()).toEqual([])
  })
  it('détecte les erreurs de données', () => {
    const broken = { ...ROSTER[0], id: 'x', stats: { ...ROSTER[0].stats, dodgeChance: 1.5 }, baseId: 'nope' }
    expect(validateRoster([broken, broken]).length).toBeGreaterThanOrEqual(3)
  })
  it('une variante hérite des événements de son original', () => {
    for (const def of ROSTER.filter((d) => d.baseId)) {
      expect(def.events).toEqual(ROSTER.find((d) => d.id === def.baseId)!.events)
    }
  })
  it('createCharacter refuse un id inconnu ; withName garde id et stats', () => {
    expect(() => createCharacter('inconnu')).toThrow()
    const g = createCharacter('gorak')
    const g2 = g.withName('Gorak II')
    expect(g2).toMatchObject({ id: 'gorak', name: 'Gorak II', stats: g.stats })
    expect(g.name).toBe('Gorak')
  })
})

describe('stats', () => {
  it('les dégâts comptabilisés expliquent exactement les PV perdus', () => {
    let seed = 1
    for (const a of CHARACTER_IDS)
      for (const b of CHARACTER_IDS)
        for (let k = 0; k < 15; k++) {
          const r = duel(a, b, seed++)
          const s = computeStats(r)
          const final = finalState(r)
          for (const side of [0, 1] as const) {
            const opp = side === 0 ? 1 : 0
            expect(s[side].hpLeft).toBe(final.hp[side])
            // Exact : le coup fatal ne compte que les PV qu'il restait.
            expect(s[opp].totalDamage + s[side].effectDamageTaken - s[side].healed).toBe(
              r.fighters[side].maxHp - final.hp[side],
            )
            expect(s[side].hits + s[opp].dodges).toBe(s[side].attacks)
            expect(s[side].attacks + s[opp].attacks).toBe(attacksOf(r).length)
          }
        }
  })
})

describe('narration', () => {
  const fighters = [createCharacter('gorak'), createCharacter('brokk')] as const
  it('chaque type d’effet et chaque statut produisent un texte et un badge', () => {
    const effects: AppliedEffect[] = [
      { type: 'heal', target: 0, amount: 3 },
      { type: 'damage', target: 1, amount: 2 },
      ...STATUS_IDS.map((status): AppliedEffect => ({
        type: 'applyStatus',
        target: 0,
        status,
        stacks: 2,
        turns: 2,
        result: { kind: 'applied', stacks: 2 },
      })),
      { type: 'applyStatus', target: 0, status: 'poison', stacks: 1, result: { kind: 'blocked', by: 'immunity' } },
      { type: 'applyStatus', target: 0, status: 'poison', stacks: 1, result: { kind: 'blocked', by: 'ward' } },
      {
        type: 'applyStatus',
        target: 1,
        status: 'regeneration',
        stacks: 1,
        result: { kind: 'cancelled', cancelled: { status: 'poison', stacks: 1 } },
      },
      { type: 'cleanse', target: 0, removed: ['poison'] },
    ]
    for (const e of effects) {
      expect(effectText(e, [...fighters])).not.toBe('')
      expect(effectBadge(e).text).not.toBe('')
    }
  })
  it('chaque déclencheur a un libellé, chaque événement une description', () => {
    for (const t of Object.values(TRIGGERS)) expect(t.label).not.toBe('')
    const effects: Effect[] = [
      { type: 'heal', amount: 2 },
      { type: 'damage', amount: 2, target: 'opponent' },
      { type: 'applyStatus', status: 'poison', stacks: 1, turns: 2, target: 'opponent' },
      { type: 'cleanse', polarity: 'negative' },
    ]
    expect(describeEvent({ id: 'x', name: 'x', trigger: 'hit', effects, chance: 0.25, limit: 2 })).toContain('25 %')
  })
  it('raconte un combat entier sans trou', () => {
    const r = duel('brokk', 'elaria', 3)
    for (const b of r.beats) {
      if (b.type === 'attack') expect(attackLog(b.turn, b.attack, r.fighters, 0).text).toMatch(/^Tour \d+/)
      if (b.type === 'event') expect(eventLog(b.event, r.fighters).text).toContain(b.event.name)
    }
  })
})

describe('tournoi', () => {
  const slots = (rng = seededRng(5)) => fillSlots(Array(SLOTS).fill(null), CHARACTER_IDS, rng)

  it('fillSlots garde les cases placées à la main et équilibre le roster', () => {
    for (let seed = 1; seed < 300; seed++) {
      const manual: (string | null)[] = Array(SLOTS).fill(null)
      manual[0] = 'gorak'
      manual[5] = 'gorak'
      manual[9] = 'brokk'
      const out = fillSlots(manual, CHARACTER_IDS, seededRng(seed))
      expect(out[0]).toBe('gorak')
      expect(out[5]).toBe('gorak')
      expect(out[9]).toBe('brokk')
      expect(out.every(Boolean)).toBe(true)
      const counts = CHARACTER_IDS.map((id) => out.filter((s) => s === id).length)
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
    }
  })

  it('numérote les doublons', () => {
    const t = createTournament(slots(), (id) => createCharacter(id).name)
    const labels = t.entrants.map((e) => e.label)
    expect(new Set(labels).size).toBe(SLOTS)
    expect(labels.some((l) => / (I|II|III)$/.test(l))).toBe(true)
  })

  it('se joue jusqu’au champion, sans incohérence', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const rng = seededRng(seed)
      let t: Tournament = createTournament(slots(rng), (id) => createCharacter(id).name)
      let played = 0
      while (champion(t) === null) {
        const ready = readyMatches(t)
        expect(ready.length).toBeGreaterThan(0)
        for (const ref of ready) {
          const result = simulateCombat(matchFighters(t, ref), { rng })
          t = withResult(t, ref, result)
          played++
          expect(status(t, ref)).toBe('done')
        }
      }
      expect(played).toBe(SLOTS - 1)
    }
  })

  it('refuse un match déjà joué, pas prêt, ou avec les mauvais combattants', () => {
    let t = createTournament(slots(), (id) => createCharacter(id).name)
    const ref = { round: 0, index: 0 }
    const result = simulateCombat(matchFighters(t, ref), { rng: seededRng(1) })
    t = withResult(t, ref, result)
    expect(() => withResult(t, ref, result)).toThrow()
    expect(() => withResult(t, { round: 1, index: 0 }, result)).toThrow()
    const other = simulateCombat(matchFighters(t, { round: 0, index: 1 }), { rng: seededRng(2) })
    const wrong: CombatResult = { ...other, fighters: [createCharacter('gorak'), createCharacter('gorak')] }
    if (t.entrants[2].characterId !== 'gorak' || t.entrants[3].characterId !== 'gorak')
      expect(() => withResult(t, { round: 0, index: 1 }, wrong)).toThrow()
  })
})

describe('historique', () => {
  it('complète un historique ancien ou abîmé', () => {
    expect(normalize(null).totalMatches).toBe(0)
    const old = normalize({ totalMatches: 2, characters: { gorak: { fights: 2, wins: 1 } } })
    expect(old.characters.gorak).toMatchObject({ fights: 2, wins: 1, events: 0, healed: 0, opponents: {} })
    expect(old.matches).toEqual([])
  })

  it('cumule les combats de façon cohérente', () => {
    clearHistory()
    const results = Array.from({ length: 50 }, (_, i) => duel(CHARACTER_IDS[i % 6], CHARACTER_IDS[(i * 5) % 6], i + 1))
    results.forEach((r, i) => recordMatch(r, { tournament: i % 2 === 0 }))
    recordTournamentWin('gorak')
    const h = getHistory()
    expect(h.totalMatches).toBe(50)
    expect(h.tournaments).toBe(1)
    const recs = Object.values(h.characters)
    expect(recs.reduce((s, r) => s + r.fights, 0)).toBe(100)
    expect(recs.reduce((s, r) => s + r.wins, 0)).toBe(50)
    expect(recs.reduce((s, r) => s + r.damageDealt, 0)).toBe(recs.reduce((s, r) => s + r.damageTaken, 0))
    for (const r of recs) {
      const vs = Object.values(r.opponents)
      expect(vs.reduce((s, o) => s + o.fights, 0)).toBe(r.fights)
      expect(vs.reduce((s, o) => s + o.wins, 0)).toBe(r.wins)
    }
    expect(h.matches.filter((m) => m.tournament)).toHaveLength(25)
    clearHistory()
  })
})
