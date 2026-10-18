import { describe, expect, it } from 'vitest'
import { attacksOf, dieAt, finalState, MAX_TURNS, rollsDie, simulateCombat, type Beat, type CombatResult, type Pair } from './combat'
import type { CharacterEvent } from './events'
import { seededRng } from './rng'
import { CHARACTER_IDS, CHARACTERS, createCharacter, ROSTER, validateRoster } from './roster'
import { computeStats } from './stats'
import { DECOCTION_POISON, STATUSES, type Status, type StatusId } from './statuses'
import { EMOJI, testCharacter } from './test-utils'
import { parseForcedRolls, traceText } from './trace'

const run = (fighters: Pair<ReturnType<typeof testCharacter>>, seed = 1) =>
  simulateCombat(fighters, { rng: seededRng(seed) })

/** Tous les duels du roster, sur plusieurs graines. */
function* rosterCombats(perPair: number) {
  let seed = 1000
  for (const a of CHARACTER_IDS)
    for (const b of CHARACTER_IDS)
      for (let k = 0; k < perPair; k++)
        yield simulateCombat([createCharacter(a), createCharacter(b)], { rng: seededRng(seed++) })
}

const ofType = <T extends Beat['type']>(r: CombatResult, type: T) =>
  r.beats.filter((b): b is Extract<Beat, { type: T }> => b.type === type)

describe('simulateCombat : propriétés générales', () => {
  it('est reproductible : même graine, même combat', () => {
    const fighters: Pair<ReturnType<typeof createCharacter>> = [createCharacter('gorak'), createCharacter('elaria')]
    const a = simulateCombat(fighters, { rng: seededRng(42) })
    const b = simulateCombat(fighters, { rng: seededRng(42) })
    expect(b).toEqual(a)
  })

  it('respecte les invariants sur tous les duels du roster', () => {
    for (const r of rosterCombats(40)) {
      const max = [r.fighters[0].maxHp, r.fighters[1].maxHp]
      let lastTurn = 0
      let prev: Pair<Status[]> = [[], []]
      for (const beat of r.beats) {
        // Chronologie ordonnée, PV bornés, statuts valides
        expect(beat.turn).toBeGreaterThanOrEqual(lastTurn)
        lastTurn = beat.turn
        for (const side of [0, 1] as const) {
          expect(beat.state.hp[side]).toBeGreaterThanOrEqual(0)
          expect(beat.state.hp[side]).toBeLessThanOrEqual(max[side])
          for (const s of beat.state.statuses[side]) {
            expect(s.stacks).toBeGreaterThan(0)
            if (s.turns !== undefined) expect(s.turns).toBeGreaterThan(0)
          }
        }
        if (beat.type === 'attack') {
          const a = beat.attack
          expect(a.roll).toBeGreaterThanOrEqual(1)
          expect(a.roll).toBeLessThanOrEqual(a.faces)
          if (a.dodged || a.forfeited) {
            expect(a.damage).toBe(0)
            expect(a.crit).toBe(false)
            expect(a.dodged && a.forfeited).toBe(false)
          } else {
            expect(a.damage).toBeGreaterThanOrEqual(1)
            expect(a.damage).toBe(a.raw - a.armorAbsorbed - a.shieldAbsorbed)
            expect(a.dealt).toBeLessThanOrEqual(a.damage)
            expect(a.dealt).toBeGreaterThanOrEqual(0)
            // Jet (× critique), puis modificateurs sortants (attaquant) et entrants (défenseur), plancher à 1
            // Un coup transformé (Charge, Coup de griffe) part de sa valeur, pas du jet
            const value = a.reshaped?.value ?? a.roll
            let raw = a.crit ? Math.round(value * a.critMultiplier) : value
            for (const s of prev[a.attacker]) raw = STATUSES[s.id].modifyOutgoing?.(raw, s) ?? raw
            for (const s of prev[1 - a.attacker]) raw = STATUSES[s.id].modifyIncoming?.(raw, s) ?? raw
            expect(a.raw).toBe(Math.max(1, Math.round(raw)))
          }
        }
        prev = beat.state.statuses
      }
      // Fin du combat : le perdant est à 0, le vainqueur debout, plus rien après le K.O.
      const final = finalState(r)
      expect(r.endedBy).toBe('ko')
      expect(final.hp[1 - r.winner]).toBe(0)
      expect(final.hp[r.winner]).toBeGreaterThan(0)
      expect(r.turns).toBe(lastTurn)
      expect(r.initiative[r.initiative.length - 1][0]).not.toBe(r.initiative[r.initiative.length - 1][1])
    }
  }, 60_000)

  it('déclenche les compétences du dé (1 et 2) du roster exactement quand il le faut', () => {
    for (const r of rosterCombats(20)) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'attack') return
        // Les étapes qui suivent le coup, jusqu'au prochain coup (vol de vie, compétences, réactions)
        const after: typeof r.beats = []
        for (const next of r.beats.slice(i + 1)) {
          if (next.type !== 'event' && next.type !== 'statusReaction') break
          after.push(next)
        }
        const alive = beat.state.hp[1 - beat.attack.attacker] > 0
        for (const [trigger, roll] of [['naturalOne', 1], ['naturalTwo', 2]] as const) {
          const fired = after.some((b) => b.type === 'event' && b.event.trigger === trigger)
          expect(fired).toBe(beat.attack.roll === roll && alive)
        }
        // Un jet qui déclenche une compétence du dé (1, 2 ou 3) n'inflige aucun dégât (0.27.0),
        // sauf s'il la transforme en coup (druide en ours : Charge, Coup de griffe, 0.35.0)
        expect(beat.attack.forfeited).toBe(beat.attack.roll <= 3 && !beat.attack.reshaped)
      })
    }
  })

  it('arrête un combat sans issue à la limite de tours', () => {
    const r = run([testCharacter('a', { dodgeChance: 1 }), testCharacter('b', { dodgeChance: 1 })])
    expect(r.endedBy).toBe('turnLimit')
    expect(r.turns).toBe(MAX_TURNS)
    expect(attacksOf(r)).toHaveLength(MAX_TURNS)
  })
})

describe('attaque', () => {
  it("applique l'armure sans descendre sous 1 dégât", () => {
    const r = run([testCharacter('a', { damageDie: 1 }), testCharacter('b', { armor: 5 })])
    const first = attacksOf(r).find((a) => a.attacker === 0)!
    expect(first).toMatchObject({ raw: 1, damage: 1, armorAbsorbed: 0 })
    const strong = run([
      testCharacter('a', { damageDie: 1, critChance: 1, critMultiplier: 9 }),
      testCharacter('b', { armor: 5 }),
    ])
    expect(attacksOf(strong).find((a) => a.attacker === 0)).toMatchObject({ raw: 9, damage: 4, armorAbsorbed: 5 })
  })

  it("le coup fatal compte tous ses dégâts, excès compris (overkill, 0.34.0) ; les PV s'arrêtent à 0", () => {
    // 5 PV restants, coup de 9 : les 9 sont comptés, le défenseur finit à 0 PV.
    const r = run([testCharacter('a', { critChance: 1, critMultiplier: 9 }), testCharacter('b', { maxHp: 5 })])
    const fatal = attacksOf(r).find((a) => a.attacker === 0)!
    expect(fatal).toMatchObject({ damage: 9, dealt: 9 })
    expect(finalState(r).hp[1]).toBe(0)
    expect(computeStats(r)[0]).toMatchObject({ totalDamage: 9, critDamage: 9, best: 9 })
  })

  it('applique le multiplicateur critique, arrondi', () => {
    const r = run([testCharacter('a', { critChance: 1, critMultiplier: 2.5 }), testCharacter('b')])
    expect(attacksOf(r)[0]).toMatchObject({ crit: true, raw: 3, damage: 3 })
  })
})

/** Combat où `a` pose un statut dès le début du combat. */
const withStart = (effects: CharacterEvent['effects'], statsA = {}, statsB = {}) =>
  run([
    testCharacter('a', statsA, [{ id: 'start', name: 'Départ', trigger: 'combatStart', effects }]),
    testCharacter('b', statsB),
  ])

describe('statuts', () => {
  it('Critique assuré : force le critique du prochain coup qui touche et consomme une charge', () => {
    const r = withStart([{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 2 }])
    const mine = attacksOf(r).filter((a) => a.attacker === 0)
    expect(mine.slice(0, 2).every((a) => a.crit && a.critForced)).toBe(true)
    expect(mine[2].crit).toBe(false)
  })

  it("Critique assuré : n'est pas consommé par une esquive", () => {
    const r = run([
      testCharacter('a', { dodgeChance: 1 }, [
        {
          id: 's',
          name: 's',
          trigger: 'combatStart',
          effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }],
        },
      ]),
      testCharacter('b', { dodgeChance: 1 }),
    ])
    const after = attacksOf(r).length
    expect(after).toBe(MAX_TURNS)
    expect(finalState(r).statuses[0]).toEqual([{ id: 'guaranteedCrit', stacks: 1 }])
  })

  it('Armure temporaire : absorbe sans descendre sous 1, puis disparaît', () => {
    // a frappe 6 ; b a un bouclier de 4 : 1er coup 2 dégâts (−4), puis bouclier épuisé.
    const r = run([
      testCharacter('a', { damageDie: 1, critChance: 1, critMultiplier: 6 }),
      testCharacter('b', { maxHp: 30 }, [
        {
          id: 's',
          name: 's',
          trigger: 'combatStart',
          effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 4 }],
        },
      ]),
    ])
    const hits = attacksOf(r).filter((a) => a.attacker === 0)
    expect(hits[0]).toMatchObject({ raw: 6, damage: 2, shieldAbsorbed: 4, shields: { bonusArmor: 4 } })
    expect(hits[1]).toMatchObject({ damage: 6, shieldAbsorbed: 0 })
  })

  it('Armure temporaire : un coup de 1 ne la consomme pas', () => {
    const r = run([
      testCharacter('a'),
      testCharacter('b', {}, [
        {
          id: 's',
          name: 's',
          trigger: 'combatStart',
          effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 3 }],
        },
      ]),
    ])
    expect(
      attacksOf(r)
        .filter((a) => a.attacker === 0)
        .every((a) => a.shieldAbsorbed === 0),
    ).toBe(true)
  })

  it('Poison (0.36.4) : une seule valeur, dégâts et durée ; 3, 2 puis 1 PV au début des tours du porteur', () => {
    const r = run([
      testCharacter('a', { maxHp: 50 }, [
        {
          id: 'p',
          name: 'p',
          trigger: 'combatStart',
          effects: [{ type: 'applyStatus', status: 'poison', stacks: 3, target: 'opponent' }],
        },
      ]),
      testCharacter('b', { maxHp: 50 }),
    ])
    const ticks = ofType(r, 'statusTick')
    expect(ticks.map((t) => t.side)).toEqual([1, 1, 1])
    expect(ticks.map((t) => (t.effects[0].type === 'damage' ? t.effects[0].amount : 0))).toEqual([3, 2, 1])
    // La charge tombe avec les dégâts : l'état de l'étape montre déjà la valeur suivante, puis plus rien
    expect(ticks.map((t) => t.state.statuses[1].find((s) => s.id === 'poison')?.stacks ?? 0)).toEqual([2, 1, 0])
    // Aucune durée en tours ; il disparaît au 3e tick, puis b attaque
    expect(ofType(r, 'statusDuration')).toEqual([])
    const last = r.beats.indexOf(ticks[2])
    expect(r.beats[last + 1]).toMatchObject({ type: 'statusExpire', side: 1, statuses: ['poison'] })
    expect(r.beats[last + 2].type).toBe('attack')
    for (const t of ticks.slice(0, 2)) expect(r.beats[r.beats.indexOf(t) + 1].type).toBe('attack')
  })

  it('Poison (0.36.4) : se cumule en additionnant ses charges', () => {
    const r = run([
      testCharacter('a', { maxHp: 80 }, [
        { id: 'p3', name: 'p3', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'poison', stacks: 3, target: 'opponent' }] },
        { id: 'p2', name: 'p2', trigger: 'turnEnd', effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, target: 'opponent' }] },
      ]),
      testCharacter('b', { maxHp: 80 }),
    ])
    // Avant le 1er tick de b : 3 charges, plus 2 si a a fini un tour avant (initiative)
    const first = ofType(r, 'statusTick')[0]
    const before = r.beats[r.beats.indexOf(first) - 1].state.statuses[1].find((s) => s.id === 'poison')!.stacks
    expect(first.effects[0]).toMatchObject({ type: 'damage', amount: before })
    expect([3, 5]).toContain(before)
  })

  it("validation : un statut qui s'estompe ne prend pas de durée en tours", () => {
    const def = { ...ROSTER[0], id: 'x', events: [{ id: 'e', name: 'e', trigger: 'naturalOne' as const, forfeitsHit: true, effects: [{ type: 'applyStatus' as const, status: 'poison' as const, stacks: 2, turns: 3, target: 'opponent' as const }] }] }
    expect(validateRoster([def]).some((p) => p.includes("s'estompe"))).toBe(true)
  })

  it('Poison : peut mettre K.O. au début du tour', () => {
    const r = run([
      testCharacter('a', { maxHp: 50 }, [
        {
          id: 'p',
          name: 'p',
          trigger: 'combatStart',
          effects: [{ type: 'applyStatus', status: 'poison', stacks: 30, target: 'opponent' }],
        },
      ]),
      testCharacter('b', { maxHp: 20 }),
    ])
    expect(r.winner).toBe(0)
    expect(r.beats[r.beats.length - 1].type).toBe('statusTick')
    expect(finalState(r).hp[1]).toBe(0)
  })

  it('Régénération : soigne au début du tour, sans dépasser les PV max', () => {
    const r = withStart([{ type: 'applyStatus', status: 'regeneration', stacks: 5, turns: 4 }], { maxHp: 20 })
    const heals = ofType(r, 'statusTick').map((t) => t.effects[0])
    expect(heals.length).toBeGreaterThan(0)
    // Les PV de a ne dépassent jamais 20 et le soin est plafonné
    for (const b of r.beats) expect(b.state.hp[0]).toBeLessThanOrEqual(20)
    expect(heals.every((h) => h.type === 'heal' && h.amount <= 5)).toBe(true)
  })

  it('Affaibli : réduit les dégâts avant armure, minimum 1', () => {
    const r = withStart(
      [{ type: 'applyStatus', status: 'weakened', stacks: 3, target: 'opponent' }],
      {},
      { critChance: 1, critMultiplier: 5 },
    )
    const bHits = attacksOf(r).filter((a) => a.attacker === 1)
    expect(bHits[0]).toMatchObject({ raw: 2, damage: 2 })
    const floor = withStart([{ type: 'applyStatus', status: 'weakened', stacks: 9, target: 'opponent' }])
    expect(attacksOf(floor).filter((a) => a.attacker === 1)[0]).toMatchObject({ raw: 1, damage: 1 })
  })

  it("Brèche : réduit l'armure, jamais en dessous de 0", () => {
    const r = withStart(
      [{ type: 'applyStatus', status: 'exposed', stacks: 2, target: 'opponent' }],
      { critChance: 1, critMultiplier: 5 },
      { armor: 3 },
    )
    expect(attacksOf(r).filter((a) => a.attacker === 0)[0]).toMatchObject({ raw: 5, damage: 4, armorAbsorbed: 1 })
    const deep = withStart(
      [{ type: 'applyStatus', status: 'exposed', stacks: 10, target: 'opponent' }],
      { critChance: 1, critMultiplier: 5 },
      { armor: 3 },
    )
    expect(attacksOf(deep).filter((a) => a.attacker === 0)[0]).toMatchObject({ damage: 5, armorAbsorbed: 0 })
  })

  it('cumul : « add » additionne les charges, « refresh » remplace', () => {
    const r = withStart([
      { type: 'applyStatus', status: 'bonusArmor', stacks: 2 },
      { type: 'applyStatus', status: 'bonusArmor', stacks: 3 },
      { type: 'applyStatus', status: 'regeneration', stacks: 4, turns: 5 },
      { type: 'applyStatus', status: 'regeneration', stacks: 1, turns: 2 },
    ])
    expect(r.beats[0].state.statuses[0]).toEqual([
      { id: 'bonusArmor', stacks: 5 },
      { id: 'regeneration', stacks: 1, turns: 2 },
    ])
  })

  it('purge : retire les statuts de la polarité visée', () => {
    const r = run([
      testCharacter('a', {}, [
        {
          id: 'x',
          name: 'x',
          trigger: 'combatStart',
          effects: [
            { type: 'applyStatus', status: 'poison', stacks: 1 },
            { type: 'applyStatus', status: 'bonusArmor', stacks: 1 },
            { type: 'cleanse', polarity: 'negative' },
          ],
        },
      ]),
      testCharacter('b'),
    ])
    const event = ofType(r, 'event')[0]
    expect(event.event.effects[2]).toEqual({ type: 'cleanse', target: 0, removed: ['poison'] })
    expect(event.state.statuses[0]).toEqual([{ id: 'bonusArmor', stacks: 1 }])
  })

  it('chaque statut du registre a un texte et une pastille, sans emoji', () => {
    for (const def of Object.values(STATUSES)) {
      expect(def.name).not.toBe('')
      for (const text of [def.name, def.summary, def.describe({ id: 'poison', stacks: 2, turns: 2 }), def.badge({ id: 'poison', stacks: 2 })])
        expect(text).not.toMatch(EMOJI)
      expect(def.describe({ id: 'poison', stacks: 2, turns: 2 })).not.toBe('')
      expect(def.badge({ id: 'poison', stacks: 2 })).not.toBe('')
    }
  })
})

describe('événements', () => {
  const healEvent = (trigger: CharacterEvent['trigger'], extra: Partial<CharacterEvent> = {}): CharacterEvent => ({
    id: trigger,
    name: trigger,
    trigger,
    effects: [{ type: 'heal', amount: 1 }],
    ...extra,
  })
  const triggersOf = (r: CombatResult, side: 0 | 1) =>
    ofType(r, 'event')
      .filter((b) => b.event.side === side)
      .map((b) => b.event.trigger)

  it('combatStart et turnStart', () => {
    const r = run([testCharacter('a', {}, [healEvent('combatStart'), healEvent('turnStart')]), testCharacter('b')])
    const t = triggersOf(r, 0)
    expect(t[0]).toBe('combatStart')
    expect(t.filter((x) => x === 'turnStart').length).toBe(attacksOf(r).filter((a) => a.attacker === 0).length)
  })

  it('hit, crit, naturalOne et naturalMax (dé à 1 face : un 1 est aussi le maximum, sauf pour naturalMax)', () => {
    const r = run([
      testCharacter('a', { critChance: 1 }, [
        healEvent('hit'),
        healEvent('crit'),
        healEvent('naturalOne'),
        healEvent('naturalMax'),
      ]),
      testCharacter('b'),
    ])
    const t = new Set(triggersOf(r, 0))
    expect(t).toEqual(new Set(['hit', 'crit', 'naturalOne']))
  })

  it('missed et dodge', () => {
    const r = run([
      testCharacter('a', {}, [healEvent('missed')]),
      testCharacter('b', { dodgeChance: 1 }, [healEvent('dodge')]),
    ])
    expect(triggersOf(r, 0)).toContain('missed')
    expect(triggersOf(r, 1)).toContain('dodge')
  })

  it('hurt, et bloodied une seule fois', () => {
    // Effet neutre (Brèche sur une armure déjà à 0) pour ne pas fausser les PV
    const neutral = (trigger: CharacterEvent['trigger']): CharacterEvent => ({
      id: trigger,
      name: trigger,
      trigger,
      effects: [{ type: 'applyStatus', status: 'exposed', stacks: 1 }],
    })
    const r = run([
      testCharacter('a', { maxHp: 40 }),
      testCharacter('b', { maxHp: 10 }, [neutral('hurt'), neutral('bloodied')]),
    ])
    expect(triggersOf(r, 1)).toContain('hurt')
    expect(triggersOf(r, 1).filter((t) => t === 'bloodied')).toHaveLength(1)
  })

  it('limit : plafonne les déclenchements', () => {
    const r = run([testCharacter('a', {}, [healEvent('hit', { limit: 2 })]), testCharacter('b')])
    expect(triggersOf(r, 0)).toEqual(['hit', 'hit'])
  })

  it('chance : 0 ne déclenche jamais, 1 toujours', () => {
    const never = run([testCharacter('a', {}, [healEvent('hit', { chance: 0 })]), testCharacter('b')])
    expect(triggersOf(never, 0)).toEqual([])
    const always = run([testCharacter('a', {}, [healEvent('hit', { chance: 1 })]), testCharacter('b')])
    expect(triggersOf(always, 0).length).toBe(
      attacksOf(always).filter((a) => a.attacker === 0).length - (always.winner === 0 ? 1 : 0),
    )
  })

  it('aucun événement après le coup fatal', () => {
    const r = run([testCharacter('a', { maxHp: 5 }, [healEvent('hit')]), testCharacter('b', { maxHp: 1 })])
    expect(r.beats[r.beats.length - 1].type).toBe('attack')
  })

  it("des dégâts d'effet peuvent mettre K.O. et arrêtent les effets suivants", () => {
    const r = run([
      testCharacter('a', {}, [
        {
          id: 'boom',
          name: 'boom',
          trigger: 'combatStart',
          effects: [
            { type: 'damage', amount: 99, target: 'opponent' },
            { type: 'heal', amount: 1 },
          ],
        },
      ]),
      testCharacter('b'),
    ])
    expect(r.winner).toBe(0)
    expect(r.turns).toBe(0)
    expect(ofType(r, 'event')[0].event.effects).toEqual([{ type: 'damage', target: 1, amount: 99 }])
  })
})

describe('conditions (when)', () => {
  // Effet neutre : Brèche sur une armure à 0 ne change rien aux PV
  const neutral = [{ type: 'applyStatus' as const, status: 'exposed' as const, stacks: 1 }]
  const firedBeats = (r: CombatResult, id: string) =>
    r.beats.flatMap((b, i) =>
      // Avant la toute première étape, l'état est celui du départ (PV max, aucun statut).
      b.type === 'event' && b.event.eventId === id
        ? [
            {
              beat: b,
              before: r.beats[i - 1] ?? {
                state: { hp: [r.fighters[0].maxHp, r.fighters[1].maxHp], statuses: [[], []] },
              },
            },
          ]
        : [],
    )

  it('fromTurn : rien avant le tour fixé', () => {
    const r = run([
      testCharacter('a', {}, [
        { id: 'late', name: 'late', trigger: 'hit', effects: neutral, when: [{ type: 'fromTurn', turn: 5 }] },
      ]),
      testCharacter('b'),
    ])
    const fired = firedBeats(r, 'late')
    expect(fired.length).toBeGreaterThan(0)
    expect(fired.every(({ beat }) => beat.turn >= 5)).toBe(true)
  })

  it('hpBelow / hpAtLeast : selon les PV du porteur ou de l’adversaire au moment du déclencheur', () => {
    const r = run([
      testCharacter('a', { maxHp: 20 }, [
        {
          id: 'low',
          name: 'low',
          trigger: 'turnStart',
          effects: neutral,
          when: [{ type: 'hpBelow', who: 'self', ratio: 0.5 }],
        },
        {
          id: 'oppHigh',
          name: 'oppHigh',
          trigger: 'turnStart',
          effects: neutral,
          when: [{ type: 'hpAtLeast', who: 'opponent', ratio: 0.75 }],
        },
      ]),
      testCharacter('b', { maxHp: 20 }),
    ])
    const low = firedBeats(r, 'low')
    expect(low.length).toBeGreaterThan(0)
    expect(low.every(({ before }) => before.state.hp[0] < 10)).toBe(true)
    const high = firedBeats(r, 'oppHigh')
    expect(high.length).toBeGreaterThan(0)
    expect(high.every(({ before }) => before.state.hp[1] >= 15)).toBe(true)
  })

  it('hasStatus : seulement tant que l’adversaire porte le statut', () => {
    const r = run([
      testCharacter('a', { maxHp: 40 }, [
        {
          id: 'venom',
          name: 'venom',
          trigger: 'combatStart',
          effects: [{ type: 'applyStatus', status: 'poison', stacks: 1, turns: 2, target: 'opponent' }],
        },
        {
          id: 'prey',
          name: 'prey',
          trigger: 'hit',
          effects: neutral,
          when: [{ type: 'hasStatus', who: 'opponent', status: 'poison' }],
        },
      ]),
      testCharacter('b', { maxHp: 40 }),
    ])
    const fired = firedBeats(r, 'prey')
    expect(fired.length).toBeGreaterThan(0)
    expect(fired.every(({ before }) => before.state.statuses[1].some((s) => s.id === 'poison'))).toBe(true)
  })

  it('lacksStatus : n’applique un bouclier que s’il n’y en a pas déjà', () => {
    const r = run([
      testCharacter('a', {}, [
        {
          id: 'ward',
          name: 'ward',
          trigger: 'turnStart',
          effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 3 }],
          when: [{ type: 'lacksStatus', who: 'self', status: 'bonusArmor' }],
        },
      ]),
      testCharacter('b'),
    ])
    for (const b of r.beats)
      expect(b.state.statuses[0].find((s) => s.id === 'bonusArmor')?.stacks ?? 0).toBeLessThanOrEqual(3)
    expect(firedBeats(r, 'ward')).toHaveLength(1) // les coups de 1 ne l'entament jamais
  })

  it('une condition fausse ne consomme pas de hasard (chance non tirée)', () => {
    const blocked: CharacterEvent = {
      id: 'x',
      name: 'x',
      trigger: 'hit',
      effects: neutral,
      chance: 0.5,
      when: [{ type: 'fromTurn', turn: 999999 }],
    }
    const fighters = (events: CharacterEvent[]) =>
      [
        testCharacter('a', { dodgeChance: 0.3, critChance: 0.3, damageDie: 6 }, events),
        testCharacter('b', { dodgeChance: 0.3, damageDie: 6 }),
      ] as const
    const withEvent = run([...fighters([blocked])], 7)
    const without = run([...fighters([])], 7)
    expect(attacksOf(withEvent)).toEqual(attacksOf(without))
  })
})

describe('plafond de cumul (maxStacks)', () => {
  it('Brèche ne dépasse pas 3 charges', () => {
    const r = withStart(
      Array.from({ length: 5 }, () => ({
        type: 'applyStatus' as const,
        status: 'exposed' as const,
        stacks: 2,
        target: 'opponent' as const,
      })),
    )
    expect(r.beats[0].state.statuses[1]).toEqual([{ id: 'exposed', stacks: 3 }])
  })
})

describe('résolution : phases, contrôle, réactions, application', () => {
  /** b reçoit des statuts au début du combat (posés par a sur son adversaire). */
  const onB = (effects: CharacterEvent['effects'], statsA = {}, statsB = {}, eventsB: CharacterEvent[] = []) =>
    run([
      testCharacter('a', { maxHp: 40, ...statsA }, [{ id: 'start', name: 'start', trigger: 'combatStart', effects }]),
      testCharacter('b', { maxHp: 40, ...statsB }, eventsB),
    ])
  const target = 'opponent' as const

  it('fin de tour : Brûlure agit après l’attaque du porteur, et s’use à la fin de ses tours', () => {
    const r = onB([{ type: 'applyStatus', status: 'burn', stacks: 2, turns: 2, target }])
    const ticks = ofType(r, 'statusTick')
    expect(ticks).toHaveLength(2)
    for (const t of ticks) {
      expect(t.phase).toBe('turnEnd')
      expect(t.side).toBe(1)
      const prev = r.beats[r.beats.indexOf(t) - 1]
      expect(prev.type === 'attack' && prev.attack.attacker === 1).toBe(true)
    }
    expect(ofType(r, 'statusExpire')).toEqual([
      expect.objectContaining({ phase: 'turnEnd', side: 1, statuses: ['burn'] }),
    ])
  })

  it('fin de tour : un K.O. par Brûlure termine le combat', () => {
    const r = onB([{ type: 'applyStatus', status: 'burn', stacks: 50, target }])
    expect(r.winner).toBe(0)
    expect(r.beats[r.beats.length - 1]).toMatchObject({ type: 'statusTick', phase: 'turnEnd' })
  })

  it('événements de fin de tour (turnEnd)', () => {
    const r = run([
      testCharacter('a', {}, [{ id: 'e', name: 'e', trigger: 'turnEnd', effects: [{ type: 'heal', amount: 1 }] }]),
      testCharacter('b'),
    ])
    const ends = ofType(r, 'event').filter((b) => b.event.trigger === 'turnEnd')
    expect(ends.length).toBe(attacksOf(r).filter((x) => x.attacker === 0).length - (r.winner === 0 ? 1 : 0))
  })

  it('dégâts entrants : Vulnérable ajoute des dégâts avant l’armure', () => {
    const r = onB(
      [{ type: 'applyStatus', status: 'vulnerable', stacks: 2, target }],
      { critChance: 1, critMultiplier: 3 },
      { armor: 1 },
    )
    expect(attacksOf(r).filter((x) => x.attacker === 0)[0]).toMatchObject({ raw: 5, damage: 4, armorAbsorbed: 1 })
  })

  it('contrôle : Étourdi fait perdre l’action, puis s’use (plafond 1)', () => {
    const r = onB([{ type: 'applyStatus', status: 'stunned', stacks: 3, target }])
    const skip = ofType(r, 'skip')
    expect(skip).toHaveLength(1)
    expect(skip[0]).toMatchObject({ side: 1, status: 'stunned', turn: expect.any(Number) })
    // Aucun coup de b pendant le tour perdu, et le statut a disparu
    expect(attacksOf(r).some((x) => x.turn === skip[0].turn)).toBe(false)
    expect(skip[0].state.statuses[1].some((s) => s.id === 'stunned')).toBe(false)
  })

  it('réaction : Épines renvoie des dégâts sans déclencher de chaîne', () => {
    const hurtA: CharacterEvent = { id: 'ouch', name: 'ouch', trigger: 'hurt', effects: [{ type: 'heal', amount: 1 }] }
    const r = run([
      testCharacter('a', { maxHp: 40 }, [hurtA]),
      testCharacter('b', { maxHp: 40 }, [
        { id: 't', name: 't', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'thorns', stacks: 1 }] },
      ]),
    ])
    const reactions = ofType(r, 'statusReaction')
    expect(reactions.length).toBeGreaterThan(0)
    expect(reactions.every((x) => x.side === 1 && x.effects[0].type === 'damage' && x.effects[0].target === 0)).toBe(
      true,
    )
    // « hurt » de a ne se déclenche que sur les vrais coups de b, jamais sur les épines
    const hurtEvents = ofType(r, 'event').filter((b) => b.event.eventId === 'ouch').length
    const hitsOnA = attacksOf(r).filter((x) => x.attacker === 1 && !x.dodged).length
    // Un « hurt » par vrai coup de b (sauf le coup fatal, après lequel plus rien ne se déclenche)
    expect(hurtEvents).toBeLessThanOrEqual(hitsOnA)
    expect(hurtEvents).toBeGreaterThanOrEqual(hitsOnA - 1)
  })

  it('réaction : un K.O. par Épines donne la victoire au porteur', () => {
    const r = run([
      testCharacter('a', { maxHp: 3 }),
      testCharacter('b', { maxHp: 40 }, [
        { id: 't', name: 't', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'thorns', stacks: 5 }] },
      ]),
    ])
    expect(r.winner).toBe(1)
    expect(r.beats[r.beats.length - 1].type).toBe('statusReaction')
  })

  it('application : Garde sacrée bloque un malus et perd une charge, pas un bonus', () => {
    const r = run([
      testCharacter('a', {}, [
        {
          id: 'x',
          name: 'x',
          trigger: 'combatStart',
          effects: [
            { type: 'applyStatus', status: 'ward', stacks: 1 },
            { type: 'applyStatus', status: 'poison', stacks: 2, turns: 2 },
            { type: 'applyStatus', status: 'poison', stacks: 2, turns: 2 },
            { type: 'applyStatus', status: 'bonusArmor', stacks: 1 },
          ],
        },
      ]),
      testCharacter('b'),
    ])
    const [, first, second, bonus] = ofType(r, 'event')[0].event.effects
    expect(first).toMatchObject({ result: { kind: 'blocked', by: 'ward' } })
    expect(second).toMatchObject({ result: { kind: 'applied', stacks: 2 } })
    expect(bonus).toMatchObject({ result: { kind: 'applied' } })
  })

  it('application : immunité du personnage, sans rien consommer', () => {
    const immune = testCharacter('b')
    const b = Object.assign(Object.create(Object.getPrototypeOf(immune)), immune, { immunities: ['poison'] })
    const r = run([
      testCharacter('a', {}, [
        {
          id: 'p',
          name: 'p',
          trigger: 'combatStart',
          effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, target }],
        },
      ]),
      b,
    ])
    expect(ofType(r, 'event')[0].event.effects[0]).toMatchObject({ result: { kind: 'blocked', by: 'immunity' } })
    expect(ofType(r, 'statusTick')).toHaveLength(0)
  })

  it('opposition : Régénération et Poison s’annulent charge à charge', () => {
    const r = run([
      testCharacter('a', {}, [
        {
          id: 'x',
          name: 'x',
          trigger: 'combatStart',
          effects: [
            { type: 'applyStatus', status: 'poison', stacks: 3, turns: 3 },
            { type: 'applyStatus', status: 'regeneration', stacks: 2, turns: 2 },
            { type: 'applyStatus', status: 'regeneration', stacks: 4, turns: 2 },
          ],
        },
      ]),
      testCharacter('b'),
    ])
    const event = ofType(r, 'event')[0]
    const [, partial, flip] = event.event.effects
    expect(partial).toMatchObject({ result: { kind: 'cancelled', cancelled: { status: 'poison', stacks: 2 } } })
    expect(flip).toMatchObject({ result: { kind: 'applied', stacks: 3, cancelled: { status: 'poison', stacks: 1 } } })
    expect(event.state.statuses[0]).toEqual([{ id: 'regeneration', stacks: 3, turns: 2 }])
  })
})

describe('registre des statuts', () => {
  it('les oppositions sont réciproques', () => {
    for (const [id, def] of Object.entries(STATUSES)) if (def.opposes) expect(STATUSES[def.opposes].opposes).toBe(id)
  })
})

describe('roster réel', () => {
  it('chaque personnage a au moins un événement décrit', () => {
    for (const c of CHARACTERS) expect(c.events.length).toBeGreaterThan(0)
  })
})

describe('compétences du 2 au dé (0.25.0)', () => {
  /** Duels du roster où `id` est impliqué, côté gauche puis droit. */
  function* duelsOf(id: string, perPair = 25) {
    let seed = 5000
    for (const opp of CHARACTER_IDS)
      for (let k = 0; k < perPair; k++) {
        const pair: Pair<ReturnType<typeof createCharacter>> =
          k % 2 ? [createCharacter(id), createCharacter(opp)] : [createCharacter(opp), createCharacter(id)]
        yield simulateCombat(pair, { rng: seededRng(seed++) })
      }
  }
  const before = (r: CombatResult, i: number) =>
    i > 0 ? r.beats[i - 1].state : { hp: [r.fighters[0].maxHp, r.fighters[1].maxHp], statuses: [[], []] }
  const has = (list: readonly { id: string }[], id: string) => list.some((s) => s.id === id)

  it('Vol de vie : le 2 ne fait aucun dégât, le prochain coup qui touche rend les PV retirés', () => {
    let drains = 0
    for (const r of duelsOf('ervald')) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'attack') return
        const a = beat.attack
        const owner = r.fighters[a.attacker]
        if (!owner.events.some((e) => e.id === 'life-steal')) return
        if (a.roll === 2) {
          expect(a).toMatchObject({ forfeited: true, damage: 0, dealt: 0, dodged: false, crit: false })
          // La compétence suit et pose (ou renouvelle) une seule charge
          if (beat.state.hp[1 - a.attacker] > 0) {
            const next = r.beats[i + 1]
            expect(next.type === 'event' && next.event.eventId === 'life-steal').toBe(true)
            expect(next.state.statuses[a.attacker].find((s) => s.id === 'lifesteal')?.stacks).toBe(1)
          }
          return
        }
        const held = has(before(r, i).statuses[a.attacker], 'lifesteal')
        // Esquivé : charge perdue sans soin ; jet de compétence (1, 3) : aucun coup porté, la charge reste
        if (held && a.dodged) expect(has(beat.state.statuses[a.attacker], 'lifesteal')).toBe(false)
        if (held && a.forfeited) expect(has(beat.state.statuses[a.attacker], 'lifesteal')).toBe(true)
        const next = r.beats[i + 1]
        const reacted = next?.type === 'statusReaction' && next.status === 'lifesteal'
        expect(reacted).toBe(held && !a.dodged && !a.forfeited && beat.state.hp[1 - a.attacker] > 0)
        if (reacted && next.effects[0].type === 'heal') {
          drains++
          expect(next.effects[0].amount).toBe(Math.min(a.dealt, owner.maxHp - beat.state.hp[a.attacker]))
          expect(has(next.state.statuses[a.attacker], 'lifesteal')).toBe(false)
        }
      })
    }
    expect(drains).toBeGreaterThan(0)
  })

  it('Furie des vents : deux coups à la prochaine action, chacun résolu à part', () => {
    let flurries = 0
    for (const r of duelsOf('gorak')) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'flurry') return
        flurries++
        expect(beat.strikes).toBe(2)
        expect(has(beat.state.statuses[beat.side], 'windFury')).toBe(false)
        const strikes = r.beats.slice(i + 1).filter((b) => b.turn === beat.turn && b.type === 'attack')
        // Deux coups, sauf si le combat s'arrête entre les deux (K.O. par le coup, les épines, etc.)
        expect(strikes.length).toBe(r.turns === beat.turn && strikes.length < 2 ? strikes.length : 2)
      })
      // Hors Furie, une action = un coup
      const perTurn = new Map<number, number>()
      for (const a of attacksOf(r)) perTurn.set(a.turn, (perTurn.get(a.turn) ?? 0) + 1)
      const flurryTurns = new Set(ofType(r, 'flurry').map((b) => b.turn))
      for (const [t, n] of perTurn) expect(n).toBe(flurryTurns.has(t) ? n : 1)
      // La Furie gagnée sur un 2 vaut pour l'action suivante du porteur, pas pour la même
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'event' || beat.event.eventId !== 'wind-fury') return
        const side = beat.event.side
        const nextAction = r.beats.slice(i + 1).find((b) => b.turn > beat.turn && (b.type === 'attack' || b.type === 'skip' || b.type === 'flurry') && ('side' in b ? b.side : b.attack.attacker) === side)
        // Sauf si une Purification l'a retirée entre-temps
        const kept = nextAction && r.beats[r.beats.indexOf(nextAction) - 1].state.statuses[side].some((s) => s.id === 'windFury')
        if (nextAction && nextAction.type !== 'skip' && kept) expect(nextAction.type).toBe('flurry')
      })
    }
    expect(flurries).toBeGreaterThan(0)
  })

  it('Esquive améliorée : le prochain coup reçu est esquivé sans tirage, la charge est consommée', () => {
    let forced = 0
    for (const r of duelsOf('elaria')) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'attack') return
        const a = beat.attack
        const defender = 1 - a.attacker
        const held = has(before(r, i).statuses[defender], 'evasion')
        if (a.forfeited) return
        expect(a.dodgeForced).toBe(held)
        if (held) {
          forced++
          expect(a.dodged).toBe(true)
          expect(has(beat.state.statuses[defender], 'evasion')).toBe(false)
        }
      })
    }
    expect(forced).toBeGreaterThan(0)
  })

  it('Épines : chaque coup encaissé pendant le tour adverse renvoie 6 dégâts directs, deux fois contre une Furie', () => {
    let thorns = 0
    let doubled = 0
    for (const r of duelsOf('brokk', 40)) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'attack') return
        const a = beat.attack
        const defender = 1 - a.attacker
        const held = before(r, i).statuses[defender].find((s) => s.id === 'thorns')
        if (!held || a.dodged || a.forfeited || beat.state.hp[defender] === 0) return
        // La réaction suit ce coup, avant le coup suivant
        const after = r.beats.slice(i + 1)
        const stop = after.findIndex((b) => b.type === 'attack')
        const reaction = (stop < 0 ? after : after.slice(0, stop)).find((b) => b.type === 'statusReaction' && b.status === 'thorns')
        expect(reaction).toBeDefined()
        thorns++
        const at = r.beats.indexOf(reaction!)
        expect(reaction!.type === 'statusReaction' && reaction!.effects[0]).toMatchObject({
          type: 'damage',
          target: a.attacker,
          // Plafonné aux PV de l'attaquant juste avant la réaction (un vol de vie a pu le soigner entre-temps)
          amount: held.stacks,
        })
        // Les épines restent pour les coups suivants du même tour
        if (reaction!.state.hp[a.attacker] > 0) expect(has(reaction!.state.statuses[defender], 'thorns')).toBe(true)
      })
      const perTurn = new Map<number, number>()
      for (const b of ofType(r, 'statusReaction')) if (b.status === 'thorns') perTurn.set(b.turn, (perTurn.get(b.turn) ?? 0) + 1)
      if ([...perTurn.values()].some((n) => n >= 2)) doubled++
    }
    expect(thorns).toBeGreaterThan(0)
    // Furie des vents contre Épines : deux coups, deux renvois dans le même tour
    expect(doubled).toBeGreaterThan(0)
  })

  it('durée : un statut posé pendant un tour ne se décompte pas à la fin de ce tour', () => {
    // a fait toujours 1 et gagne Furie des vents (1 tour, décomptée en fin de tour) à chaque coup
    const fury: CharacterEvent = {
      id: 'f',
      name: 'f',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'windFury', stacks: 1, turns: 1 }],
    }
    const r = run([testCharacter('a', { maxHp: 30 }, [fury]), testCharacter('b', { maxHp: 30 })])
    const first = attacksOf(r).find((x) => x.attacker === 0)!
    // Sa première action : un coup. Ensuite, chaque action de a commence par Furie et compte deux coups.
    expect(attacksOf(r).filter((x) => x.attacker === 0 && x.turn === first.turn)).toHaveLength(1)
    const flurries = ofType(r, 'flurry').filter((b) => b.side === 0)
    expect(flurries.length).toBeGreaterThan(2)
    for (const f of flurries) {
      const strikes = attacksOf(r).filter((x) => x.attacker === 0 && x.turn === f.turn)
      // Deux coups, sauf si le combat s'arrête pendant ce tour
      if (f.turn < r.turns) expect(strikes).toHaveLength(2)
    }
    // Aucune expiration de Furie à la fin du tour où elle est gagnée
    expect(ofType(r, 'statusExpire').some((b) => b.side === 0)).toBe(false)
  })

  it('validation : un coup sacrifié exige un déclencheur du dé, sans chance', () => {
    expect(validateRoster()).toEqual([])
    const bad = validateRoster([
      {
        ...ROSTER[0],
        id: 'x',
        events: [{ id: 'y', name: 'y', trigger: 'hit', forfeitsHit: true, effects: [{ type: 'heal', amount: 1 }] }],
      },
    ])
    expect(bad.some((p) => p.includes('forfeitsHit'))).toBe(true)
  })
})

describe('auras du 3 au dé (0.26.0)', () => {
  const at = (trigger: CharacterEvent['trigger'], status: StatusId, id: string = status): CharacterEvent => ({
    id,
    name: id,
    trigger,
    effects: [{ type: 'applyStatus', status, stacks: 1 }],
  })

  it('Aura de poison : au début du tour du porteur, avant son coup, 1 dégât direct par charge à l’adversaire', () => {
    // a gagne une charge au début du combat, puis une à chacun de ses coups (dé à 1 face)
    const r = run([
      testCharacter('a', { maxHp: 60 }, [at('combatStart', 'poisonAura', 'start'), at('naturalOne', 'poisonAura')]),
      testCharacter('b', { maxHp: 60 }),
    ])
    const ticks = ofType(r, 'statusTick').filter((b) => b.status === 'poisonAura')
    expect(ticks.length).toBeGreaterThan(3)
    ticks.forEach((tick, k) => {
      expect(tick).toMatchObject({ side: 0, phase: 'turnStart' })
      const before = r.beats[r.beats.indexOf(tick) - 1].state
      const stacks = before.statuses[0].find((s) => s.id === 'poisonAura')!.stacks
      // Une charge de départ, plus une par coup déjà porté : elle ne fait que grandir
      expect(stacks).toBe(k + 1)
      expect(tick.effects).toEqual([{ type: 'damage', target: 1, amount: stacks }])
      // Le coup du porteur vient après, dans le même tour
      const strike = r.beats.slice(r.beats.indexOf(tick)).find((b) => b.type === 'attack')
      if (strike && strike.type === 'attack' && tick.state.hp[1] > 0) {
        expect(strike.turn).toBe(tick.turn)
        expect(strike.attack.attacker).toBe(0)
      }
    })
    // Permanente : jamais expirée
    expect(ofType(r, 'statusExpire').some((b) => b.statuses.includes('poisonAura'))).toBe(false)
  })

  it('Aura de puissance : +2 dégâts par charge, cumulable, avant l’armure', () => {
    const r = run([testCharacter('a', { maxHp: 80 }, [at('naturalOne', 'powerAura')]), testCharacter('b', { maxHp: 80, armor: 1 })])
    const mine = attacksOf(r).filter((x) => x.attacker === 0)
    // 1er coup : 1 (pas encore d'aura) ; puis 1 + 2, 1 + 4… et l'armure retire 1
    mine.slice(0, 4).forEach((x, k) => expect(x).toMatchObject({ raw: 1 + 2 * k, damage: Math.max(1, 2 * k) }))
  })

  it("Aura d'intimidation : −2 par charge sur les coups de l'adversaire, avant l'armure, cumulable, combinée à la puissance", () => {
    const r = run([
      testCharacter('a', { maxHp: 80 }, [at('naturalOne', 'powerAura')]),
      testCharacter('b', { maxHp: 80 }, [at('combatStart', 'intimidationAura'), at('combatStart', 'intimidationAura', 'again')]),
    ])
    expect(finalState(r).statuses[1].find((s) => s.id === 'intimidationAura')?.stacks).toBe(2)
    // Sortant puis entrant : 1 + 2k − 4, plancher à 1
    attacksOf(r)
      .filter((x) => x.attacker === 0)
      .slice(0, 5)
      .forEach((x, k) => expect(x.raw).toBe(Math.max(1, 1 + 2 * k - 4)))
  })

  it('Aura de précision : +1 au multiplicateur de critique par charge, cumulable', () => {
    const r = run([
      testCharacter('a', { maxHp: 80, damageDie: 1, critChance: 1, critMultiplier: 2 }, [
        at('combatStart', 'precisionAura'),
        at('combatStart', 'precisionAura', 'again'),
      ]),
      testCharacter('b', { maxHp: 80 }),
    ])
    for (const x of attacksOf(r).filter((y) => y.attacker === 0)) expect(x).toMatchObject({ crit: true, critMultiplier: 4, raw: 4 })
  })

  it('roster : chaque 3 au dé pose (ou renforce) l’aura de sa race, qui ne disparaît jamais', () => {
    const auras: StatusId[] = ['poisonAura', 'powerAura', 'intimidationAura', 'precisionAura', 'holyAura', 'decoctionAura', 'immunityAura', 'rotAura']
    for (const r of rosterCombats(5)) {
      const threes = r.beats.filter((b) => b.type === 'event' && b.event.trigger === 'naturalThree')
      for (const b of threes) {
        if (b.type !== 'event') continue
        // Exceptions (0.35.0) : l'ogre n'a pas d'aura (il attend), le druide n'a la sienne qu'en ours
        if (['waiting-3', 'firefly'].includes(b.event.eventId)) continue
        // L'aura du 3 (le paladin purge d'abord ses malus, puis pose son aura)
        expect(b.event.effects.some((e) => e.type === 'applyStatus' && auras.includes(e.status))).toBe(true)
      }
      for (const b of ofType(r, 'statusExpire')) expect(b.statuses.some((s) => auras.includes(s))).toBe(false)
    }
  })
})

describe('prêtresse et voleuse (0.30.0)', () => {
  const at = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id = trigger): CharacterEvent => ({
    id,
    name: id,
    trigger,
    effects,
  })
  const has = (list: readonly { id: string }[], id: string) => list.some((s) => s.id === id)
  const before = (r: CombatResult, i: number) =>
    i > 0 ? r.beats[i - 1].state : { hp: [r.fighters[0].maxHp, r.fighters[1].maxHp], statuses: [[], []] }

  it("Peur : l'adversaire perd sa prochaine action, puis la peur disparaît", () => {
    // a fait toujours 1 et terrifie b à chaque coup : b ne joue jamais
    const r = run([
      testCharacter('a', { maxHp: 30 }, [at('naturalOne', [{ type: 'applyStatus', status: 'fear', stacks: 1, target: 'opponent' }])]),
      testCharacter('b', { maxHp: 30 }),
    ])
    const skips = ofType(r, 'skip')
    expect(skips.length).toBeGreaterThan(3)
    expect(skips.every((b) => b.side === 1 && b.status === 'fear')).toBe(true)
    expect(attacksOf(r).some((x) => x.attacker === 1 && r.beats.find((b) => b.type === 'skip' && b.turn === x.turn))).toBe(false)
    for (const s of skips) expect(has(s.state.statuses[1], 'fear')).toBe(false)
  })

  it("Purification : retire le dernier bonus posé de l'adversaire, toutes ses charges, aura comprise", () => {
    const r = run([
      testCharacter('a', { maxHp: 40 }, [
        at('combatStart', [
          { type: 'applyStatus', status: 'bonusArmor', stacks: 3 },
          { type: 'applyStatus', status: 'powerAura', stacks: 6 },
        ]),
      ]),
      testCharacter('b', { maxHp: 40 }, [at('naturalOne', [{ type: 'cleanse', polarity: 'positive', count: 1, target: 'opponent' }])]),
    ])
    const purges = ofType(r, 'event').filter((b) => b.event.effects[0]?.type === 'cleanse')
    const first = purges[0].event.effects[0]
    // L'aura, posée en dernier, part en premier, avec ses 6 charges ; puis l'armure temporaire
    expect(first.type === 'cleanse' && first.removed).toEqual(['powerAura'])
    expect(has(purges[0].state.statuses[0], 'powerAura')).toBe(false)
    const second = purges.find((b) => b.event.effects[0].type === 'cleanse' && b.event.effects[0].removed.length > 0 && b !== purges[0])
    if (second && second.event.effects[0].type === 'cleanse') expect(second.event.effects[0].removed).toEqual(['bonusArmor'])
  })

  it('Aura de sainteté : +2 PV par charge à la fin de chaque tour du porteur, cumulable', () => {
    const r = run([
      testCharacter('a', { maxHp: 60 }, [at('naturalOne', [{ type: 'applyStatus', status: 'holyAura', stacks: 1 }])]),
      testCharacter('b', { maxHp: 60, damageDie: 1 }),
    ])
    const ticks = ofType(r, 'statusTick').filter((b) => b.status === 'holyAura')
    expect(ticks.length).toBeGreaterThan(2)
    for (const t of ticks) {
      expect(t).toMatchObject({ side: 0, phase: 'turnEnd' })
      const stacks = before(r, r.beats.indexOf(t)).statuses[0].find((s) => s.id === 'holyAura')!.stacks
      const hp = before(r, r.beats.indexOf(t)).hp[0]
      expect(t.effects).toEqual([{ type: 'heal', target: 0, amount: Math.min(2 * stacks, 60 - hp) }])
    }
  })

  it("Aura de décoction : chaque coup qui touche empoisonne la cible d'autant de charges que l'aura", () => {
    const r = run([
      testCharacter('a', { maxHp: 60 }, [at('combatStart', [{ type: 'applyStatus', status: 'decoctionAura', stacks: 2 }])]),
      testCharacter('b', { maxHp: 60 }),
    ])
    const hits = r.beats.flatMap((b, i) => (b.type === 'attack' && b.attack.attacker === 0 && !b.attack.dodged ? [i] : []))
    expect(hits.length).toBeGreaterThan(0)
    for (const i of hits) {
      if (r.beats[i].state.hp[1] === 0) continue
      const reaction = r.beats[i + 1]
      expect(reaction.type === 'statusReaction' && reaction.status === 'decoctionAura').toBe(true)
      if (reaction.type === 'statusReaction')
        expect(reaction.effects[0]).toMatchObject({ type: 'applyStatus', status: 'poison', stacks: 2 * DECOCTION_POISON, target: 1 })
    }
  })

  it('Pile ou face : la pièce remplace le dé ; pile, 15 dégâts directs ; face, rien ; le statut est consommé', () => {
    let heads = 0
    let tails = 0
    for (let seed = 1; seed < 40; seed++) {
      const r = run(
        [
          testCharacter('a', { maxHp: 200 }, [at('naturalOne', [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }])]),
          testCharacter('b', { maxHp: 200 }),
        ],
        seed,
      )
      for (const c of ofType(r, 'coin')) {
        const i = r.beats.indexOf(c)
        expect(c.side).toBe(0)
        expect(has(c.state.statuses[0], 'coinFlip')).toBe(false)
        // Pas de coup ce tour-là : la pièce remplace l'action
        expect(attacksOf(r).some((x) => x.attacker === 0 && x.turn === c.turn)).toBe(false)
        if (c.heads) {
          heads++
          expect(c.effects).toEqual([{ type: 'damage', target: 1, amount: 15 }])
        } else {
          tails++
          expect(c.effects).toEqual([])
        }
      }
    }
    // Les deux côtés tombent
    expect(heads).toBeGreaterThan(10)
    expect(tails).toBeGreaterThan(10)
  })

  it("Coup de chance : à l'action suivante, un d6 en plus du dé habituel, joué comme un coup à part", () => {
    let volleys = 0
    for (const r of rosterCombats(4)) {
      for (const f of ofType(r, 'flurry')) {
        if (f.status !== 'luckyStrike') continue
        volleys++
        const own = r.fighters[f.side].stats.damageDie
        expect(f.faces).toEqual([own, 6])
        const strikes = attacksOf(r).filter((x) => x.attacker === f.side && x.turn === f.turn)
        if (f.turn < r.turns) expect(strikes.map((x) => x.faces)).toEqual([own, 6])
        // Le d6 frappe sur 4, 5 ou 6 ; sur 1, 2 ou 3, il déclenche une compétence (0.36.5 : un d3 ne frappait jamais)
        if (strikes[1]) expect(strikes[1].forfeited).toBe(strikes[1].roll <= 3)
      }
    }
    expect(volleys).toBeGreaterThan(0)
  })
})

describe('paladin (0.31.0)', () => {
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  const release = ev('naturalMax', [{ type: 'release', status: 'retribution', min: 1, target: 'opponent' }], 'rel')

  it("Aura d'immunité : purge les malus et bloque toute nouvelle pose, sans s'user", () => {
    const r = run([
      testCharacter('a', { maxHp: 40 }, [
        ev('combatStart', [
          { type: 'cleanse', polarity: 'negative' },
          { type: 'applyStatus', status: 'immunityAura', stacks: 1 },
        ]),
      ]),
      testCharacter('b', { maxHp: 40 }, [ev('naturalOne', [{ type: 'applyStatus', status: 'poison', stacks: 2, turns: 3, target: 'opponent' }])]),
    ])
    const tries = ofType(r, 'event').filter((b) => b.event.side === 1)
    expect(tries.length).toBeGreaterThan(3)
    for (const t of tries) expect(t.event.effects[0]).toMatchObject({ type: 'applyStatus', result: { kind: 'blocked', by: 'immunityAura' } })
    expect(r.beats.every((b) => !b.state.statuses[0].some((s) => STATUSES[s.id].polarity === 'negative'))).toBe(true)
  })

  it('Riposte : le prochain coup encaissé renvoie la moitié des PV retirés, puis la charge disparaît', () => {
    const r = run([
      testCharacter('a', { maxHp: 60 }, [ev('combatStart', [{ type: 'applyStatus', status: 'riposte', stacks: 1 }])]),
      testCharacter('b', { maxHp: 60, damageDie: 1, critChance: 1, critMultiplier: 7 }),
    ])
    const first = r.beats.findIndex((b) => b.type === 'attack' && b.attack.attacker === 1)
    const reaction = r.beats[first + 1]
    expect(reaction).toMatchObject({ type: 'statusReaction', status: 'riposte', side: 0 })
    if (reaction.type === 'statusReaction') expect(reaction.effects[0]).toMatchObject({ type: 'damage', target: 1, amount: Math.round(7 / 2) })
    expect(ofType(r, 'statusReaction').filter((b) => b.status === 'riposte')).toHaveLength(1)
  })

  it("Riposte : sans durée, elle attend le premier coup qui touche (un jet de 1 à 3 adverse ne l'use pas)", () => {
    // b fait toujours 1 et sacrifie son coup : la riposte d'Aldric ne doit jamais s'éteindre
    const forfeit = { id: 'f', name: 'f', trigger: 'naturalOne' as const, forfeitsHit: true, effects: [{ type: 'heal' as const, amount: 1 }] }
    const aldric = createCharacter('aldric')
    const riposteEvent = aldric.events.find((e) => e.id === 'riposte')!
    expect(riposteEvent.effects[0]).not.toHaveProperty('turns')
    const r = run([
      testCharacter('a', { maxHp: 60 }, [{ ...riposteEvent, trigger: 'combatStart', forfeitsHit: false }]),
      testCharacter('b', { maxHp: 60, damageDie: 1 }, [forfeit]),
    ])
    expect(r.beats.length).toBeGreaterThan(5)
    expect(r.beats.every((b) => b.type === 'event' && b.event.trigger === 'combatStart' || b.state.statuses[0].some((s) => s.id === 'riposte'))).toBe(true)
  })

  it('Rétribution : trois jauges des derniers coups reçus, relâchées en dégâts directs (au moins 1)', () => {
    // b frappe toujours 1 ; a relâche sur un jet maximal (dé à 2 faces)
    const r = run([testCharacter('a', { maxHp: 80, damageDie: 2 }, [release]), testCharacter('b', { maxHp: 80 })])
    let checked = 0
    r.beats.forEach((b, i) => {
      const gauge = b.state.statuses[0].find((s) => s.id === 'retribution')
      if (gauge) {
        expect(gauge.slots!.length).toBeLessThanOrEqual(3)
        expect(gauge.stacks).toBe(gauge.slots!.reduce((t, n) => t + n, 0))
      }
      if (b.type === 'event' && b.event.eventId === 'rel') {
        const stored = r.beats[i - 1].state.statuses[0].find((s) => s.id === 'retribution')?.stacks ?? 0
        expect(b.event.effects[0]).toMatchObject({ type: 'damage', target: 1, amount: Math.max(1, stored) })
        expect(b.state.statuses[0].some((s) => s.id === 'retribution')).toBe(false)
        checked++
      }
    })
    expect(checked).toBeGreaterThan(2)
    // Sans effet de relâche, pas de jauge
    const plain = run([testCharacter('a', { maxHp: 30 }), testCharacter('b', { maxHp: 30 })])
    expect(plain.beats.some((b) => b.state.statuses[0].some((s) => s.id === 'retribution'))).toBe(false)
  })
})

describe('mode triche : dés imposés (0.33.0)', () => {
  const pair = () => [createCharacter('gorak'), createCharacter('naraxes')] as [ReturnType<typeof createCharacter>, ReturnType<typeof createCharacter>]

  it("avant le dé imposé, le combat est identique à l'original ; ce dé prend la valeur demandée", () => {
    const original = simulateCombat(pair(), { seed: 42 })
    const rank = 4
    const target = original.beats.filter(rollsDie)[rank]
    const at = original.beats.indexOf(target)
    const cheated = simulateCombat(pair(), { seed: 42, forcedRolls: { [rank]: 1 } })
    expect(cheated.beats.slice(0, at)).toEqual(original.beats.slice(0, at))
    const forced = cheated.beats.filter(rollsDie)[rank]
    expect(forced.type === 'attack' && forced.attack).toMatchObject({ roll: 1, forced: true })
    expect(cheated.forcedRolls).toEqual({ [rank]: 1 })
    expect(original.forcedRolls).toBeUndefined()
  })

  it('une valeur hors du dé est ramenée à ses bornes ; la pièce suit 1 = pile, 2 = face', () => {
    const r = simulateCombat(pair(), { seed: 3, forcedRolls: { 0: 99 } })
    const first = r.beats.filter(rollsDie)[0]
    expect(first.type === 'attack' && first.attack.roll).toBe(first.type === 'attack' && first.attack.faces)
    // Une pièce : Naraxes la lance au tour qui suit un 2 ; on cherche une graine où elle tombe
    for (let seed = 0; seed < 200; seed++) {
      const base = simulateCombat(pair(), { seed })
      const rank = base.beats.filter(rollsDie).findIndex((b) => b.type === 'coin')
      if (rank < 0) continue
      for (const [value, heads] of [[1, true], [2, false]] as const) {
        const coin = simulateCombat(pair(), { seed, forcedRolls: { [rank]: value } }).beats.filter(rollsDie)[rank]
        expect(coin).toMatchObject({ type: 'coin', heads, forced: true })
      }
      expect(dieAt(base, rank)).toMatchObject({ coin: true, faces: 2 })
      return
    }
    throw new Error('aucune pièce trouvée')
  })

  it('la trace note les dés imposés et se relit pour rejouer le combat', () => {
    const r = simulateCombat(pair(), { seed: 8, forcedRolls: { 1: 2, 6: 8 } })
    const text = traceText(r)
    expect(text).toContain('#2=2, #7=8')
    expect(text).toContain('[imposé]')
    expect(parseForcedRolls(text)).toEqual({ 1: 2, 6: 8 })
    expect(traceText(simulateCombat(pair(), { seed: 8, forcedRolls: parseForcedRolls(text) }))).toBe(text)
  })
})

describe('ogre et druide (0.35.0)', () => {
  const duelOf = (a: string, b: string, seed: number) => simulateCombat([createCharacter(a), createCharacter(b)], { seed })
  const statusOn = (s: { statuses: Pair<Status[]> }, side: number, id: StatusId) => s.statuses[side].find((x) => x.id === id)

  it("Attente : un 1, 2 ou 3 de l'ogre ne frappe pas et le laisse attendre jusqu'à son tour suivant", () => {
    let seen = 0
    for (let seed = 1; seed < 40; seed++) {
      const r = duelOf('morgrut', 'brokk', seed)
      r.beats.forEach((b, i) => {
        if (b.type !== 'attack' || b.attack.attacker !== 0) return
        expect(b.attack.forfeited).toBe(b.attack.roll <= 3)
        if (!b.attack.forfeited || b.state.hp[1] === 0) return
        seen++
        const next = r.beats.slice(i + 1).find((x) => x.type === 'event')
        expect(next?.type === 'event' && next.event.name).toBe('Attente')
        // Il attend : l'état reste jusqu'au début de son tour suivant, puis tombe avant son nouveau jet
        const own = r.beats.findIndex((x, j) => j > i && x.type === 'attack' && x.attack.attacker === 0)
        if (own > 0) expect(statusOn(r.beats[own].state, 0, 'waiting')).toBeUndefined()
      })
    }
    expect(seen).toBeGreaterThan(10)
  })

  it('le druide change de forme au début de chacun de ses tours, sauf le premier', () => {
    for (let seed = 1; seed < 30; seed++) {
      const r = duelOf('thaldrin', 'gorak', seed)
      const last = r.initiative[r.initiative.length - 1]
      const firstTurn = last[0] > last[1] ? 1 : 2
      const shifts = ofType(r, 'shift')
      shifts.forEach((s, k) => {
        expect(s.side).toBe(0)
        expect(s.form).toBe(k % 2 === 0 ? 1 : 0)
        expect(s.turn).toBe(firstTurn + 2 * (k + 1))
      })
      // Toujours le tout premier fait de son tour
      for (const s of shifts) {
        const i = r.beats.indexOf(s)
        expect(r.beats[i - 1].turn).toBeLessThan(s.turn)
      }
      expect(ofType(r, 'shift').some((b) => b.side === 1)).toBe(false)
    }
  })

  it('ses compétences dépendent de sa forme ; Charge frappe au maximum sans critique, Griffe relance et ajoute 3', () => {
    const human = ['life-bloom', 'bark-skin', 'firefly']
    const bear = ['charge', 'claw', 'rot-aura']
    let charges = 0
    let claws = 0
    for (let seed = 1; seed < 80; seed++) {
      const r = duelOf('thaldrin', 'gorak', seed)
      let form = 0
      for (const b of r.beats) {
        if (b.type === 'shift' && b.side === 0) form = b.form
        if (b.type === 'event' && b.event.side === 0) expect(form === 0 ? human : bear).toContain(b.event.eventId)
        if (b.type !== 'attack' || b.attack.attacker !== 0) continue
        const a = b.attack
        if (a.reshaped?.event === 'charge') {
          charges++
          expect(form).toBe(1)
          expect(a.roll).toBe(1)
          expect(a.reshaped.value).toBe(a.faces)
          expect(a.crit).toBe(false)
          expect(a.forfeited).toBe(false)
        }
        if (a.reshaped?.event === 'claw') {
          claws++
          expect(a.roll).toBe(2)
          expect(a.reshaped.value).toBeGreaterThanOrEqual(4)
          expect(a.reshaped.value).toBeLessThanOrEqual(a.faces + 3)
        }
      }
    }
    expect(charges).toBeGreaterThan(5)
    expect(claws).toBeGreaterThan(5)
  })

  it("Luciole : plus d'esquive, une charge par coup encaissé, les charges se cumulent", () => {
    const fly = (stacks: number) => [{ id: 'f', name: 'f', trigger: 'combatStart' as const, effects: [{ type: 'applyStatus' as const, status: 'firefly' as const, stacks, target: 'opponent' as const }] }]
    const r = run([testCharacter('a', { maxHp: 80 }, fly(2)), testCharacter('b', { maxHp: 80, dodgeChance: 1 })])
    const mine = attacksOf(r).filter((a) => a.attacker === 0)
    // Les deux premiers coups touchent malgré 100 % d'esquive ; ensuite, tout est esquivé
    expect(mine.slice(0, 2).every((a) => !a.dodged)).toBe(true)
    expect(mine.slice(2).every((a) => a.dodged)).toBe(true)
    // Chaque coup encaissé sous Luciole prend +2 avant l'armure, une seule fois quel que soit le nombre de charges
    expect(mine[0].modifiers).toEqual([{ status: 'firefly', by: 'defender', delta: 2 }])
    expect(mine[1].modifiers).toEqual([{ status: 'firefly', by: 'defender', delta: 2 }])
    expect(mine.slice(2).every((a) => !a.modifiers?.length)).toBe(true)
  })

  it('Luciole du druide : 3 charges posées sur l’adversaire (0.35.1)', () => {
    for (const id of ['thaldrin', 'brannoc'] as const) {
      const fly = createCharacter(id).events.find((e) => e.id === 'firefly')!
      expect(fly.effects).toEqual([{ type: 'applyStatus', status: 'firefly', stacks: 3, target: 'opponent' }])
    }
  })

  it('Pourriture : posée par chaque coup sous Aura de pourriture, elle ne s’estompe jamais', () => {
    const aura = [{ id: 'r', name: 'r', trigger: 'combatStart' as const, effects: [{ type: 'applyStatus' as const, status: 'rotAura' as const, stacks: 2 }] }]
    const r = run([testCharacter('a', { maxHp: 200 }, aura), testCharacter('b', { maxHp: 200 })])
    let last = 0
    for (const b of r.beats) {
      const rot = statusOn(b.state, 1, 'rot')?.stacks ?? 0
      expect(rot).toBeGreaterThanOrEqual(last)
      last = rot
    }
    expect(last).toBeGreaterThanOrEqual(4)
    const ticks = ofType(r, 'statusTick').filter((t) => t.status === 'rot')
    expect(ticks.length).toBeGreaterThan(0)
    expect(ofType(r, 'statusExpire').some((b) => b.statuses.includes('rot'))).toBe(false)
  })

  it("Écorce épaisse : un bouclier de 4 qui se cumule", () => {
    const bark = [{ id: 'b', name: 'b', trigger: 'combatStart' as const, effects: [{ type: 'applyStatus' as const, status: 'barkSkin' as const, stacks: 4 }, { type: 'applyStatus' as const, status: 'barkSkin' as const, stacks: 4 }] }]
    const r = run([testCharacter('a', {}, bark), testCharacter('b', { damageDie: 1, critChance: 1, critMultiplier: 6 })])
    expect(statusOn(ofType(r, 'event')[0].state, 0, 'barkSkin')?.stacks).toBe(8)
    const hit = attacksOf(r).find((a) => a.attacker === 1)!
    expect(hit).toMatchObject({ raw: 6, damage: 1, shieldAbsorbed: 5 })
  })
})
