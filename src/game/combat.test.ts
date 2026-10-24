import { describe, expect, it } from 'vitest'
import { attacksOf, diceOf, dieAt, effectiveStats, finalState, MAX_TURNS, rollsDie, simulateCombat, type Beat, type CombatResult, type Pair } from './combat'
import { DIE_FACES, faceTrigger, isRollTrigger, relationOf, rollFace, rollMatches, type CharacterEvent } from './events'
import { autoForge, drawForgeOffer, FORGE_OFFER_SIZE, forgedFaces, forgeState, GILD_BONUS, offerTargets, stepOf, TEMPER_BONUS, withForgeStep, type ForgeBase, type ForgeStep } from './forge'
import { seededRng } from './rng'
import { CHARACTER_IDS, CHARACTERS, createCharacter, ENGRAVABLE_SKILLS, ROSTER, validateRoster } from './roster'
import { computeStats } from './stats'
import { BEAR_MIGHT, COIN_HEADS, DECOCTION_POISON, PRECISION_CRIT, STATUSES, stacksOf, WILD_AURA_ATTACK, type Status, type StatusId } from './statuses'
import { EMOJI, testCharacter } from './test-utils'
import { Character } from './character'
import { getRelic, RELIC_IDS, relicKind, relicLine, RELICS, validateRelics, type Relic } from './relics'
import { parseForcedRolls, parseForge, parseRelics, traceText } from './trace'

const run = (fighters: Pair<Character>, seed = 1) =>
  simulateCombat(fighters, { rng: seededRng(seed) })

/**
 * Mode triche : chaque dé du combat (les deux camps, pièces comprises : 1 = pile) tombe sur `face`. Remplace l'ancien
 * dé à une face (`damageDie: 1`) pour qu'une compétence « sur un 1 » parte à chaque jet.
 */
const everyDie = (face: number): Record<number, number> => Object.fromEntries(Array.from({ length: 4 * MAX_TURNS }, (_, k) => [k, face]))

/** Comme `run`, chaque dé tombant sur `face`. */
const runOn = (face: number, fighters: Pair<Character>, seed = 1) =>
  simulateCombat(fighters, { rng: seededRng(seed), forcedRolls: everyDie(face) })

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
          if (a.dodged || a.replaced) {
            expect(a.damage).toBe(0)
            expect(a.crit).toBe(false)
            expect(a.dodged && a.replaced).toBe(false)
          } else {
            expect(a.damage).toBeGreaterThanOrEqual(1)
            // Dégâts finaux (Aura mélodieuse, Fausse note, 0.41.0) : après l'armure et les boucliers
            const final = a.modifiers.reduce((t, m) => t + (m.final ? m.delta : 0), 0)
            expect(a.damage).toBe(a.raw - a.armorAbsorbed - a.shieldAbsorbed + final)
            expect(a.dealt).toBeLessThanOrEqual(a.damage)
            expect(a.dealt).toBeGreaterThanOrEqual(0)
            // Coup de base (× Crescendo, Soliste), bonus de relique et dorure, puis critique, modificateurs sortants
            // (attaquant) et entrants (défenseur), plancher à 1
            const value = a.value * (a.multiplier ?? 1) + (a.relicBonus ?? []).reduce((t, b) => t + b.amount, 0) + (a.gild ?? 0)
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

  it('déclenche les compétences du dé du roster sur leur face, au moment que fixe leur relation', () => {
    let checked = 0
    for (const r of rosterCombats(20)) {
      r.beats.forEach((beat) => {
        // Un jet greffé : le dé tombe, la compétence suit, puis le coup de base au même dé
        if (beat.type === 'roll') {
          const strike = r.beats.find((b) => b.type === 'attack' && b.cause === beat.id)
          if (strike?.type === 'attack') expect(strike.attack).toMatchObject({ roll: beat.roll, preset: true, replaced: false })
          return
        }
        if (beat.type !== 'event' || !isRollTrigger(beat.event.trigger)) return
        const skill = r.fighters[beat.event.side].events.find((e) => e.id === beat.event.eventId && e.trigger === beat.event.trigger)!
        const cause = beat.cause === undefined ? undefined : r.beats[beat.cause]
        const relation = relationOf(skill)
        checked++
        if (relation === 'graft') {
          expect(cause?.type).toBe('roll')
          if (cause?.type === 'roll') expect(rollMatches(skill.trigger, cause.roll, DIE_FACES)).toBe(true)
          return
        }
        // Modifie : son coup a touché ; remplace : son jet n'a pas porté de coup. Jamais un coup brut (Furie des vents)
        expect(cause?.type).toBe('attack')
        if (cause?.type !== 'attack') return
        expect(rollMatches(skill.trigger, cause.attack.roll, DIE_FACES)).toBe(true)
        expect(cause.attack.plain).toBeUndefined()
        if (relation === 'modify') expect(cause.attack.dodged || cause.attack.replaced).toBe(false)
        else expect(cause.attack.replaced).toBe(true)
      })
    }
    expect(checked).toBeGreaterThan(100)
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
    const r = run([testCharacter('a'), testCharacter('b', { armor: 5 })])
    const first = attacksOf(r).find((a) => a.attacker === 0)!
    expect(first).toMatchObject({ raw: 1, damage: 1, armorAbsorbed: 0 })
    const strong = run([
      testCharacter('a', { critChance: 1, critMultiplier: 9 }),
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

  it('dorure : +2 au coup de base du jet dont le dé fait la face dorée, quelle que soit la face', () => {
    const r = run([testCharacter('a', { maxHp: 500 }).withForge([{ op: 'gild', face: 4 }]), testCharacter('b', { maxHp: 500 })])
    const mine = attacksOf(r).filter((a) => a.attacker === 0)
    expect(mine.some((a) => a.roll === 4)).toBe(true)
    for (const a of mine) expect(a).toMatchObject(a.roll === 4 ? { value: 1, gild: GILD_BONUS, raw: 1 + GILD_BONUS } : { value: 1, raw: 1 })
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
      testCharacter('a', { critChance: 1, critMultiplier: 6 }),
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
    expect(hits[0]).toMatchObject({ raw: 6, damage: 2, shieldAbsorbed: 4, shields: [{ status: 'bonusArmor', absorbed: 4 }] })
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
    expect(ofType(r, 'statusAge').flatMap((b) => b.changes)).toEqual([])
    const last = r.beats.indexOf(ticks[2])
    expect(r.beats[last + 1]).toMatchObject({ type: 'statusAge', side: 1, changes: [], expired: ['poison'] })
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
    const def = { ...ROSTER[0], id: 'x', events: [{ id: 'e', name: 'e', trigger: 'naturalOne' as const, effects: [{ type: 'applyStatus' as const, status: 'poison' as const, stacks: 2, turns: 3, target: 'opponent' as const }] }] }
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

  it('hit, crit, naturalOne et naturalMax (chaque dé fait 1 : naturalMax, le 6, ne part jamais)', () => {
    const r = runOn(1, [
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
            { type: 'damage', amount: 99, target: 'opponent', source: 'strike' },
            { type: 'heal', amount: 1 },
          ],
        },
      ]),
      testCharacter('b'),
    ])
    expect(r.winner).toBe(0)
    expect(r.turns).toBe(0)
    expect(ofType(r, 'event')[0].event.effects).toEqual([{ type: 'damage', target: 1, amount: 99, source: 'strike' }])
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
        testCharacter('a', { dodgeChance: 0.3, critChance: 0.3, attackMin: 1, attackMax: 6 }, events),
        testCharacter('b', { dodgeChance: 0.3, attackMin: 1, attackMax: 6 }),
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

  it('fin de tour : Brûlure agit après l’attaque du porteur, et dure autant de tours que sa valeur (0.69.0)', () => {
    const r = onB([{ type: 'applyStatus', status: 'burn', stacks: 2, target }])
    const ticks = ofType(r, 'statusTick')
    expect(ticks).toHaveLength(2)
    for (const t of ticks) {
      expect(t.phase).toBe('turnEnd')
      expect(t.side).toBe(1)
      const prev = r.beats[r.beats.indexOf(t) - 1]
      expect(prev.type === 'attack' && prev.attack.attacker === 1).toBe(true)
    }
    expect(ofType(r, 'statusAge')).toEqual([
      expect.objectContaining({ phase: 'turnEnd', side: 1, changes: [{ status: 'burn', from: 2, to: 1 }], expired: [] }),
      expect.objectContaining({ phase: 'turnEnd', side: 1, changes: [], expired: ['burn'] }),
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

  it('réaction : Épines acérées font saigner l’attaquant, et la plaie qui coule ne déclenche pas de chaîne', () => {
    const hurtA: CharacterEvent = { id: 'ouch', name: 'ouch', trigger: 'hurt', effects: [{ type: 'heal', amount: 1 }] }
    const r = run([
      testCharacter('a', { maxHp: 40 }, [hurtA]),
      testCharacter('b', { maxHp: 40 }, [
        { id: 't', name: 't', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'thorns', stacks: 1 }] },
      ]),
    ])
    const reactions = ofType(r, 'statusReaction')
    const thorns = reactions.filter((x) => x.status === 'thorns')
    const bleeds = reactions.filter((x) => x.status === 'bleed')
    expect(thorns.length).toBeGreaterThan(0)
    expect(thorns.every((x) => x.side === 1 && x.effects[0].type === 'applyStatus' && x.effects[0].status === 'bleed' && x.effects[0].target === 0)).toBe(true)
    expect(bleeds.length).toBeGreaterThan(0)
    expect(bleeds.every((x) => x.side === 0 && x.effects[0].type === 'damage' && x.effects[0].target === 0)).toBe(true)
    // « hurt » de a ne se déclenche que sur les vrais coups de b, jamais sur la plaie qui coule
    const hurtEvents = ofType(r, 'event').filter((b) => b.event.eventId === 'ouch').length
    const hitsOnA = attacksOf(r).filter((x) => x.attacker === 1 && !x.dodged).length
    // Un « hurt » par vrai coup de b (sauf le coup fatal, après lequel plus rien ne se déclenche)
    expect(hurtEvents).toBeLessThanOrEqual(hitsOnA)
    expect(hurtEvents).toBeGreaterThanOrEqual(hitsOnA - 1)
  })

  it('réaction : un K.O. par Saignement donne la victoire à l’adversaire', () => {
    const r = run([
      testCharacter('a', { maxHp: 6, dodgeChance: 0 }, [
        { id: 's', name: 's', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'bleed', stacks: 10 }] },
      ]),
      testCharacter('b', { maxHp: 40, critChance: 0 }),
    ])
    expect(r.winner).toBe(1)
    expect(r.beats[r.beats.length - 1]).toMatchObject({ type: 'statusReaction', status: 'bleed', side: 0 })
  })

  it('Saignement (0.68.0) : chaque coup qui touche retire ses charges en ignorant l’armure, puis la plaie perd une charge', () => {
    const bleed: CharacterEvent = { id: 's', name: 's', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'bleed', stacks: 3 }] }
    const r = run([testCharacter('a', { maxHp: 60, armor: 5, dodgeChance: 0 }, [bleed]), testCharacter('b', { maxHp: 200, critChance: 0 })])
    const flows = ofType(r, 'statusReaction').filter((b) => b.status === 'bleed')
    // 3, 2 puis 1 PV, sur les trois premiers coups de b ; l'armure de 5 n'y change rien
    expect(flows.map((b) => b.effects[0])).toEqual([3, 2, 1].map((amount) => ({ type: 'damage', target: 0, amount, source: 'bleed' })))
    expect(flows.map((b) => b.state.statuses[0].find((s) => s.id === 'bleed')?.stacks ?? 0)).toEqual([2, 1, 0])
    // Chaque écoulement suit un coup de b qui touche
    for (const flow of flows) expect(r.beats[r.beats.indexOf(flow) - 1]).toMatchObject({ type: 'attack', attack: { attacker: 1, dodged: false } })
    // Une esquive ne rouvre pas la plaie : elle reste entière
    const dodging = run([testCharacter('a', { maxHp: 60, dodgeChance: 1 }, [bleed]), testCharacter('b', { maxHp: 30, critChance: 0 })])
    expect(ofType(dodging, 'statusReaction').some((b) => b.status === 'bleed')).toBe(false)
    expect(finalState(dodging).statuses[0]).toContainEqual({ id: 'bleed', stacks: 3 })
  })

  it('Saignement (2026-10-21, règle 9) : la plaie ouverte par un coup ne coule pas sur ce coup, elle coule dès le coup suivant, de ses charges du début du coup', () => {
    // b pose Saignement 2 à chaque coup qui touche (fenêtre `hit`) ; la fenêtre `hurt` de a vient après
    const cut: CharacterEvent = { id: 'cut', name: 'cut', trigger: 'hit', effects: [{ type: 'applyStatus', status: 'bleed', stacks: 2, target: 'opponent' }] }
    const r = run([testCharacter('a', { maxHp: 200, dodgeChance: 0 }), testCharacter('b', { maxHp: 200, critChance: 0 }, [cut])])
    const hits = r.beats.flatMap((b, i) => (b.type === 'attack' && b.attack.attacker === 1 && !b.attack.dodged ? [i] : []))
    const flowOf = (hit: number) => r.beats.find((b) => b.cause === hit && b.type === 'statusReaction' && b.status === 'bleed')
    const bleedAfter = (hit: number) => r.beats.filter((b) => b.cause === hit).at(-1)!.state.statuses[0].find((s) => s.id === 'bleed')?.stacks
    // Le premier coup ouvre la plaie (2) : elle ne coule pas sur ce coup
    expect(flowOf(hits[0])).toBeUndefined()
    expect(bleedAfter(hits[0])).toBe(2)
    // Le deuxième la grossit (2 + 2 = 4) et la fait couler de ses charges du début du coup : 2 PV, puis 3 charges
    const second = flowOf(hits[1])
    expect(second?.type === 'statusReaction' && second.effects).toEqual([{ type: 'damage', target: 0, amount: 2, source: 'bleed' }])
    expect(second!.state.statuses[0]).toContainEqual({ id: 'bleed', stacks: 3 })
    // Le troisième : 3 au début, 5 après la pose, 3 PV, puis 4
    const third = flowOf(hits[2])
    expect(third?.type === 'statusReaction' && third.effects).toEqual([{ type: 'damage', target: 0, amount: 3, source: 'bleed' }])
    expect(third!.state.statuses[0]).toContainEqual({ id: 'bleed', stacks: 4 })
  })

  it('règle 9 (2026-10-21) : un statut posé pendant un coup réagit dès le coup suivant de la même volée (Coup de chance)', () => {
    // a prend un Coup de chance à chaque tour (un d6 de plus) ; chaque coup de a qui touche donne des Épines à b dans la
    // fenêtre `hit`, avant la fenêtre `hurt` de b où elles répondent : sans la règle, elles répondraient à ce coup même
    const luck: CharacterEvent = { id: 'luck', name: 'luck', trigger: 'turnStart', effects: [{ type: 'applyStatus', status: 'luckyStrike', stacks: 1 }] }
    const spikes: CharacterEvent = { id: 'spikes', name: 'spikes', trigger: 'hit', effects: [{ type: 'applyStatus', status: 'thorns', stacks: 1, target: 'opponent' }] }
    let volleys = 0
    for (let seed = 1; seed < 40; seed++) {
      const r = run([testCharacter('a', { maxHp: 400, critChance: 0 }, [luck, spikes]), testCharacter('b', { maxHp: 400, dodgeChance: 0 })], seed)
      for (const flurry of ofType(r, 'flurry')) {
        if (flurry.side !== 0) continue
        const strikes = r.beats.filter((b): b is Extract<Beat, { type: 'attack' }> => b.type === 'attack' && b.cause === flurry.id)
        const [first, second] = strikes
        if (!first || !second || first.attack.dodged || second.attack.dodged || second.state.hp.includes(0)) continue
        const thornsAt = (beat: number) => stacksOf(r.beats[beat - 1].state.statuses[1], 'thorns')
        const reaction = (hit: number) => r.beats.find((b) => b.cause === hit && b.type === 'statusReaction' && b.status === 'thorns')
        if (thornsAt(first.id) > 0) continue
        // Posées pendant le premier coup, les Épines ne répondent pas à ce coup, mais au deuxième, de leur charge du début
        expect(reaction(first.id)).toBeUndefined()
        const back = reaction(second.id)
        expect(back?.type === 'statusReaction' && back.effects[0]).toMatchObject({ type: 'applyStatus', status: 'bleed', stacks: thornsAt(second.id) })
        volleys++
      }
    }
    expect(volleys).toBeGreaterThan(3)
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
    const b = new Character({ ...testCharacter('b').definition, immunities: ['poison'] })
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
  it('chaque personnage a au moins un événement décrit (sauf l’ogre, aux faces nues)', () => {
    for (const c of CHARACTERS.filter((x) => x.id !== 'morgrut')) expect(c.events.length).toBeGreaterThan(0)
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

  it('Vol de vie (0.45.0, greffé en phase 5 bis) : sur le 1, pose 1 charge (2 au plus, 0.107.0) avant le coup de base, qui draine déjà ; chaque coup qui touche en use une et rend les PV retirés', () => {
    let drains = 0
    let grafted = 0
    for (const r of duelsOf('ervald')) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'attack') return
        const a = beat.attack
        const owner = r.fighters[a.attacker]
        if (!owner.events.some((e) => e.id === 'life-steal')) return
        const charges = (st: readonly { id: string; stacks: number }[]) => st.find((s) => s.id === 'lifesteal')?.stacks ?? 0
        if (a.roll === 1 && !a.plain) {
          // Greffé : le dé, la compétence (1 charge, plafonnée à 2), puis le coup de base au même dé
          const skill = r.beats[i - 1]
          expect(skill.type === 'event' && skill.event.eventId === 'life-steal').toBe(true)
          expect(charges(skill.state.statuses[a.attacker])).toBe(Math.min(2, charges(r.beats[i - 2].state.statuses[a.attacker]) + 1))
          expect(r.beats[i - 2]).toMatchObject({ type: 'roll', roll: 1 })
          expect(a.preset).toBe(true)
          grafted++
        }
        const was = charges(before(r, i).statuses[a.attacker])
        const held = was > 0
        // Esquivé : une charge perdue sans soin
        if (held && a.dodged) expect(charges(beat.state.statuses[a.attacker])).toBe(was - 1)
        const next = r.beats[i + 1]
        const reacted = next?.type === 'statusReaction' && next.status === 'lifesteal'
        expect(reacted).toBe(held && !a.dodged && beat.state.hp[1 - a.attacker] > 0)
        if (reacted && next.effects[0].type === 'heal') {
          drains++
          expect(next.effects[0].amount).toBe(Math.min(a.dealt, owner.maxHp - beat.state.hp[a.attacker]))
          expect(charges(next.state.statuses[a.attacker])).toBe(was - 1)
        }
      })
    }
    expect(drains).toBeGreaterThan(0)
    expect(grafted).toBeGreaterThan(0)
  })

  it('Furie des vents (0.69.0, remplace en phase 5 bis) : sur un 2, pas de coup de base, mais deux coups bruts tout de suite, sans compétence ni Furie en chaîne', () => {
    let bursts = 0
    let low = 0
    for (const r of duelsOf('gorak')) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'event' || beat.event.eventId !== 'wind-fury') return
        const side = beat.event.side
        // Le 2 qui l'a déclenchée est un jet remplacé (aucun coup), et ce n'est jamais un coup de Furie
        const trigger = r.beats.slice(0, i).reverse().find((b) => b.type === 'attack')
        if (trigger?.type === 'attack') expect(trigger.attack).toMatchObject({ roll: 2, replaced: true, value: 0, damage: 0, dodged: false, crit: false })
        if (trigger?.type === 'attack') expect(trigger.attack.plain).toBeUndefined()
        if (beat.state.hp.some((h) => h === 0)) return
        // La rafale suit dans le même tour, avec deux coups au dé du porteur
        const k = r.beats.findIndex((b, j) => j > i && b.type === 'flurry' && b.side === side)
        const burst = r.beats[k]
        const purged = r.beats.slice(i + 1, k < 0 ? undefined : k).some((b) => b.type === 'event' && b.event.side !== side)
        if (purged || !burst) return
        expect(burst.turn).toBe(beat.turn)
        if (burst.type === 'flurry') expect(burst.faces).toEqual([DIE_FACES, DIE_FACES])
        // Deux coups de base bruts : la face ne déclenche aucune compétence
        const strikes = r.beats.slice(k + 1).filter((b) => b.turn === beat.turn && b.type === 'attack')
        for (const s of strikes) {
          if (s.type !== 'attack') continue
          expect(s.attack).toMatchObject({ plain: true, replaced: false })
          if (s.attack.roll <= 3 && !s.attack.dodged) low++
        }
        // Aucune compétence du porteur ne suit (celles de l'adversaire, comme le relais du druide touché, oui)
        expect(r.beats.slice(k + 1).some((b) => b.turn === beat.turn && ((b.type === 'event' && b.event.side === side) || b.type === 'flurry'))).toBe(false)
        bursts++
      })
    }
    expect(bursts).toBeGreaterThan(5)
    expect(low).toBeGreaterThan(0)
  })

  it('Esquive améliorée : le prochain coup reçu est esquivé sans tirage, une charge est consommée', () => {
    let forced = 0
    for (const r of duelsOf('elaria')) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'attack') return
        const a = beat.attack
        const defender = 1 - a.attacker
        const held = has(before(r, i).statuses[defender], 'evasion')
        if (a.replaced) return
        expect(a.dodgeForced).toBe(held)
        if (held) {
          forced++
          expect(a.dodged).toBe(true)
          expect(stacksOf(beat.state.statuses[defender], 'evasion')).toBe(stacksOf(before(r, i).statuses[defender], 'evasion') - 1)
        }
      })
    }
    expect(forced).toBeGreaterThan(0)
  })

  it('Esquive améliorée (2026-10-21) : cumulable, chaque charge esquive un coup reçu', () => {
    const evade: CharacterEvent['effects'] = [{ type: 'applyStatus', status: 'evasion', stacks: 1 }]
    const r = run([
      testCharacter('a', { maxHp: 200 }),
      testCharacter('b', { maxHp: 200 }, [
        { id: 'e1', name: 'e1', trigger: 'combatStart', effects: evade },
        { id: 'e2', name: 'e2', trigger: 'combatStart', effects: evade },
      ]),
    ])
    // Deux poses à l'ouverture : deux charges
    const posed = ofType(r, 'event').filter((e) => e.event.side === 1)
    expect(stacksOf(posed.at(-1)!.state.statuses[1], 'evasion')).toBe(2)
    // Les deux premiers coups de a sont esquivés à coup sûr (2 → 1 → 0), le troisième touche
    const hits = ofType(r, 'attack').filter((b) => b.attack.attacker === 0)
    expect(hits.slice(0, 3).map((b) => [b.attack.dodgeForced, b.attack.dodged])).toEqual([
      [true, true],
      [true, true],
      [false, false],
    ])
    expect(hits.slice(0, 2).map((b) => stacksOf(b.state.statuses[1], 'evasion'))).toEqual([1, 0])
  })

  it('Épines acérées (0.68.0) : chaque coup encaissé pose sur l’attaquant une charge de Saignement par épine, à chaque coup d’une Furie', () => {
    let thorns = 0
    let doubled = 0
    for (const r of duelsOf('brokk', 40)) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'attack') return
        const a = beat.attack
        const defender = 1 - a.attacker
        const held = before(r, i).statuses[defender].find((s) => s.id === 'thorns')
        if (!held || a.dodged || a.replaced || beat.state.hp[defender] === 0) return
        // La réaction suit ce coup, avant le coup suivant, sauf si un K.O. tombe avant (le nain saigne aussi,
        // et sa plaie, posée avant les épines, coule la première)
        const after = r.beats.slice(i + 1)
        const stop = after.findIndex((b) => b.type === 'attack')
        const window = stop < 0 ? after : after.slice(0, stop)
        const reaction = window.find((b) => b.type === 'statusReaction' && b.status === 'thorns')
        if (!reaction) {
          expect(window.some((b) => b.state.hp.includes(0))).toBe(true)
          return
        }
        thorns++
        expect(reaction!.type === 'statusReaction' && reaction!.effects[0]).toMatchObject({
          type: 'applyStatus',
          status: 'bleed',
          target: a.attacker,
          stacks: held.stacks,
        })
        // Les épines restent pour les coups suivants du même tour
        expect(has(reaction!.state.statuses[defender], 'thorns')).toBe(true)
      })
      const perTurn = new Map<number, number>()
      for (const b of ofType(r, 'statusReaction')) if (b.status === 'thorns') perTurn.set(b.turn, (perTurn.get(b.turn) ?? 0) + 1)
      if ([...perTurn.values()].some((n) => n >= 2)) doubled++
    }
    expect(thorns).toBeGreaterThan(0)
    // Furie des vents contre Épines acérées : deux coups, deux plaies ouvertes dans le même tour
    expect(doubled).toBeGreaterThan(0)
  })

  it('durée : un statut posé pendant un tour ne se décompte pas à la fin de ce tour', () => {
    // Chaque dé fait 1 : a se pose une Brûlure d'un tour (décomptée en fin de tour) à chaque coup (0.50.0 :
    // la Furie des vents, instantanée, ne sert plus d'exemple)
    const burn: CharacterEvent = {
      id: 'f',
      name: 'f',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'burn', stacks: 1, turns: 1 }],
    }
    const r = runOn(1, [testCharacter('a', { maxHp: 60 }, [burn]), testCharacter('b', { maxHp: 60 })])
    const posed = ofType(r, 'event').filter((b) => b.event.side === 0)
    expect(posed.length).toBeGreaterThan(2)
    for (const p of posed) {
      // À la fin du tour de la pose, la Brûlure est toujours là, avec son tour entier
      const end = r.beats.filter((b) => b.turn === p.turn).at(-1)!
      if (end.state.hp.some((h) => h === 0)) continue
      expect(end.state.statuses[0].find((x) => x.id === 'burn')?.turns).toBe(1)
    }
  })

  it('validation : une relation au coup (greffe, modifie, remplace) est réservée aux compétences du dé, sans chance pour remplacer', () => {
    expect(validateRoster()).toEqual([])
    const bad = validateRoster([
      {
        ...ROSTER[0],
        id: 'x',
        events: [
          { id: 'y', name: 'y', trigger: 'hit', relation: 'modify', effects: [{ type: 'heal', amount: 1 }] },
          { id: 'z', name: 'z', trigger: 'naturalTwo', relation: 'replace', chance: 0.5, effects: [{ type: 'heal', amount: 1 }] },
        ],
      },
    ])
    expect(bad.some((p) => p.includes('y.relation'))).toBe(true)
    expect(bad.some((p) => p.includes('z : une compétence qui remplace'))).toBe(true)
  })
})

describe('auras du 3 au dé (0.26.0)', () => {
  const at = (trigger: CharacterEvent['trigger'], status: StatusId, id: string = status): CharacterEvent => ({
    id,
    name: id,
    trigger,
    effects: [{ type: 'applyStatus', status, stacks: 1 }],
  })

  it('Aura glaciale (0.69.0) : au début du tour du porteur, 1 charge de Poison par charge ; une charge fige le poison', () => {
    // a pose une charge d'aura et un Poison 3 au début du combat : chaque tour, b perd une charge de
    // poison et l'aura la lui rend, donc il perd 3 PV à chacun de ses tours
    const frost: CharacterEvent = {
      id: 'start',
      name: 'start',
      trigger: 'combatStart',
      effects: [{ type: 'applyStatus', status: 'frostAura', stacks: 1 }, { type: 'applyStatus', status: 'poison', stacks: 3, target: 'opponent' }],
    }
    const r = run([testCharacter('a', { maxHp: 60 }, [frost]), testCharacter('b', { maxHp: 60 })])
    const ticks = ofType(r, 'statusTick').filter((b) => b.status === 'frostAura')
    expect(ticks.length).toBeGreaterThan(3)
    for (const tick of ticks) {
      // Son propre tour, avant son coup
      expect(tick).toMatchObject({ side: 0, phase: 'turnStart' })
      expect(tick.effects).toEqual([expect.objectContaining({ type: 'applyStatus', status: 'poison', stacks: 1, target: 1 })])
      const strike = r.beats.slice(r.beats.indexOf(tick)).find((b) => b.type === 'attack')
      if (strike?.type === 'attack' && tick.state.hp[1] > 0) expect(strike).toMatchObject({ turn: tick.turn, attack: { attacker: 0 } })
    }
    const poisoned = ofType(r, 'statusTick').filter((b) => b.status === 'poison')
    expect(poisoned.length).toBeGreaterThan(3)
    // 3, ou 4 si a joue le premier (l'aura ajoute sa charge avant le premier tour de b) ; puis plus rien ne bouge
    const amount = poisoned[0].effects[0].type === 'damage' ? poisoned[0].effects[0].amount : 0
    expect([3, 4]).toContain(amount)
    for (const p of poisoned) expect(p.effects).toEqual([expect.objectContaining({ type: 'damage', amount, target: 1 })])
    // Permanente : jamais expirée
    expect(ofType(r, 'statusAge').some((b) => b.expired.includes('frostAura'))).toBe(false)
  })

  it('Aura glaciale : un vrai Poison, que l’Aura d’immunité bloque et que la Régénération annule', () => {
    const frost = at('combatStart', 'frostAura')
    const immune = run([testCharacter('a', { maxHp: 60 }, [frost]), testCharacter('b', { maxHp: 60 }, [at('combatStart', 'immunityAura')])])
    const blocked = ofType(immune, 'statusTick').filter((b) => b.status === 'frostAura')
    expect(blocked.length).toBeGreaterThan(0)
    for (const b of blocked) expect(b.effects[0]).toMatchObject({ type: 'applyStatus', result: { kind: 'blocked' } })
    expect(ofType(immune, 'statusTick').some((b) => b.status === 'poison')).toBe(false)
    const regen: CharacterEvent = { id: 'regen', name: 'regen', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'regeneration', stacks: 5, turns: 20 }] }
    const healed = run([testCharacter('a', { maxHp: 60 }, [frost]), testCharacter('b', { maxHp: 60 }, [regen])])
    const first = ofType(healed, 'statusTick').find((b) => b.status === 'frostAura')!
    expect(first.effects[0]).toMatchObject({ type: 'applyStatus', result: { kind: 'cancelled' } })
  })

  it('Aura de puissance : +2 dégâts, non cumulable (0.107.0), avant l’armure', () => {
    // Chaque dé fait 1 : l'aura se greffe et compte dès le coup du jet ; reposée à chaque jet, elle reste à +2
    const r = runOn(1, [testCharacter('a', { maxHp: 80 }, [at('naturalOne', 'powerAura')]), testCharacter('b', { maxHp: 80, armor: 1 })])
    const mine = attacksOf(r).filter((x) => x.attacker === 0)
    expect(mine.length).toBeGreaterThan(3)
    // 1 + 2, et l'armure retire 1
    for (const x of mine) expect(x).toMatchObject({ raw: 3, damage: 2 })
    expect(finalState(r).statuses[0].find((s) => s.id === 'powerAura')?.stacks).toBe(1)
  })

  it("Aura d'intimidation : −1 par charge (0.107.0) sur les coups de l'adversaire, avant l'armure, cumulable, combinée à la puissance", () => {
    const r = runOn(1, [
      testCharacter('a', { maxHp: 80, attackMin: 6, attackMax: 6 }, [at('naturalOne', 'powerAura')]),
      testCharacter('b', { maxHp: 80 }, [at('combatStart', 'intimidationAura'), at('combatStart', 'intimidationAura', 'again')]),
    ])
    expect(finalState(r).statuses[1].find((s) => s.id === 'intimidationAura')?.stacks).toBe(2)
    // Sortant puis entrant : 6 + 2 − 2 × 1
    const mine = attacksOf(r).filter((x) => x.attacker === 0)
    expect(mine.length).toBeGreaterThan(3)
    for (const x of mine) expect(x).toMatchObject({ raw: 6, modifiers: [{ status: 'powerAura', delta: 2 }, { status: 'intimidationAura', delta: -2 }] })
  })

  it('Aura de précision : +1 au multiplicateur de critique et +5 % de critique par charge (0.107.0), cumulable', () => {
    const r = run([
      testCharacter('a', { maxHp: 80, critChance: 1, critMultiplier: 2 }, [
        at('combatStart', 'precisionAura'),
        at('combatStart', 'precisionAura', 'again'),
      ]),
      testCharacter('b', { maxHp: 80 }),
    ])
    for (const x of attacksOf(r).filter((y) => y.attacker === 0)) expect(x).toMatchObject({ crit: true, critMultiplier: 4, raw: 4 })
    // Sans critique (l'ogre) : deux charges lui en donnent 10 %
    const ogre = createCharacter('morgrut')
    expect(effectiveStats(ogre, [{ id: 'precisionAura', stacks: 2 }])).toMatchObject({ critChance: 2 * PRECISION_CRIT, critMultiplier: ogre.stats.critMultiplier + 2 })
  })

  it('Aura sauvage : +1 à l’attaque par charge (0.107.0), minimum et maximum, avant le critique', () => {
    const base = testCharacter('a', { maxHp: 80, attackMin: 3, attackMax: 4, critChance: 1, critMultiplier: 2 }, [at('combatStart', 'wildAura'), at('combatStart', 'wildAura', 'again')])
    expect(effectiveStats(base, [{ id: 'wildAura', stacks: 2 }])).toMatchObject({ attackMin: 3 + 2 * WILD_AURA_ATTACK, attackMax: 4 + 2 * WILD_AURA_ATTACK })
    const mine = attacksOf(run([base, testCharacter('b', { maxHp: 80 })])).filter((x) => x.attacker === 0)
    expect(mine.length).toBeGreaterThan(3)
    // La valeur du coup tirée dans l'attaque montée (5 ou 6), puis le critique la double : aucun bonus après le critique
    for (const x of mine) expect(x.dodged || (x.value >= 5 && x.value <= 6 && x.raw === 2 * x.value && x.modifiers.length === 0)).toBe(true)
  })

  it('roster : une aura posée (Aura glaciale, de sainteté, de décoction) ne disparaît jamais', () => {
    const auras: StatusId[] = ['frostAura', 'powerAura', 'intimidationAura', 'precisionAura', 'holyAura', 'decoctionAura', 'immunityAura', 'wildAura']
    let posed = 0
    for (const r of rosterCombats(5)) {
      posed += ofType(r, 'event').filter((b) => b.event.effects.some((e) => e.type === 'applyStatus' && auras.includes(e.status))).length
      for (const b of ofType(r, 'statusAge')) expect(b.expired.some((s) => auras.includes(s))).toBe(false)
    }
    expect(posed).toBeGreaterThan(0)
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
    // Chaque dé fait 1 : a terrifie b à chaque jet, b ne joue jamais
    const r = runOn(1, [
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

  it('Aura de sainteté : +1 PV par charge à la fin de chaque tour du porteur, cumulable, 2 charges au plus (0.107.0)', () => {
    const r = run([
      testCharacter('a', { maxHp: 60 }, [at('naturalOne', [{ type: 'applyStatus', status: 'holyAura', stacks: 1 }])]),
      testCharacter('b', { maxHp: 60 }),
    ])
    const ticks = ofType(r, 'statusTick').filter((b) => b.status === 'holyAura')
    expect(ticks.length).toBeGreaterThan(2)
    for (const t of ticks) {
      expect(t).toMatchObject({ side: 0, phase: 'turnEnd' })
      const stacks = before(r, r.beats.indexOf(t)).statuses[0].find((s) => s.id === 'holyAura')!.stacks
      const hp = before(r, r.beats.indexOf(t)).hp[0]
      expect(stacks).toBeLessThanOrEqual(2)
      expect(t.effects).toEqual([{ type: 'heal', target: 0, amount: Math.min(stacks, 60 - hp) }])
    }
    expect(ticks.some((t) => before(r, r.beats.indexOf(t)).statuses[0].find((s) => s.id === 'holyAura')!.stacks === 2)).toBe(true)
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

  it('Pile ou face (modifie, phase 5 bis) : la pièce part aussitôt, juste après le coup du 1 qui touche ; pile, ce coup ×3 (0.107.0) ; face, rien ; le statut est consommé', () => {
    const coin: CharacterEvent = { ...at('naturalOne', [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }]), relation: 'modify' }
    let heads = 0
    let tails = 0
    for (let seed = 1; seed < 40; seed++) {
      const r = run([testCharacter('a', { maxHp: 200, attackMin: 1, attackMax: 3 }, [coin]), testCharacter('b', { maxHp: 200, dodgeChance: 0.2 })], seed)
      // Jamais gardée : aucun coup ne part pendant qu'une pièce attend
      r.beats.forEach((b, i) => {
        if (b.type === 'attack') expect(has(before(r, i).statuses[0], 'coinFlip')).toBe(false)
        // Un 1 esquivé ne pose pas de pièce
        if (b.type === 'attack' && b.attack.attacker === 0 && b.attack.roll === 1 && b.attack.dodged)
          expect(r.beats.some((x) => x.cause === b.id && x.type === 'event')).toBe(false)
      })
      for (const c of ofType(r, 'coin')) {
        const k = r.beats.indexOf(c)
        expect(c.side).toBe(0)
        expect(has(c.state.statuses[0], 'coinFlip')).toBe(false)
        // Juste derrière la compétence qui la pose, elle-même juste derrière le coup du 1 qui a touché, dans le même tour
        const skill = r.beats[k - 1]
        const strike = r.beats[k - 2]
        expect(skill.type === 'event' && skill.event.side === 0 && skill.turn === c.turn && skill.cause === strike.id).toBe(true)
        if (strike.type !== 'attack') throw new Error('la pièce suit un coup')
        expect(strike.attack).toMatchObject({ attacker: 0, roll: 1, dodged: false })
        expect(strike.turn).toBe(c.turn)
        if (c.heads) {
          heads++
          // Pile : ce coup ×3, les PV retirés par ce coup, encore deux fois (en une perte)
          expect(c.effects).toEqual([{ type: 'damage', target: 1, amount: (COIN_HEADS - 1) * strike.attack.dealt, source: 'strike' }])
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

  it('Pile ou face (0.42.0) : pile compte comme un coup qui touche, l’Aura de décoction empoisonne', () => {
    let poisoned = 0
    for (let seed = 1; seed < 40; seed++) {
      const r = run(
        [
          testCharacter('a', { maxHp: 200 }, [
            at('combatStart', [{ type: 'applyStatus', status: 'decoctionAura', stacks: 1 }], 'combatStart'),
            { ...at('naturalOne', [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }]), relation: 'modify' },
          ]),
          testCharacter('b', { maxHp: 200 }),
        ],
        seed,
      )
      for (const c of ofType(r, 'coin').filter((x) => x.heads)) {
        const next = r.beats[r.beats.indexOf(c) + 1]
        if (!next) continue // dernière étape du combat (limite de tours)
        // La réaction de l'aura suit la pièce et pose le poison sur l'adversaire
        expect(next.type === 'statusReaction' && next.status === 'decoctionAura').toBe(true)
        expect(next.state.statuses[1].find((s) => s.id === 'poison')?.stacks).toBeGreaterThanOrEqual(DECOCTION_POISON)
        poisoned++
      }
    }
    expect(poisoned).toBeGreaterThan(10)
  })

  it('Purification (0.42.0) : retire le dernier bonus ; sans bonus à retirer, la lumière inflige ses dégâts directs', () => {
    const purification = createCharacter('ysolde').events.find((e) => e.id === 'purification')!
    const cleanse = purification.effects[0]
    expect(cleanse.type === 'cleanse' && cleanse.orElse?.type === 'damage').toBe(true)
    const light = cleanse.type === 'cleanse' && cleanse.orElse?.type === 'damage' ? cleanse.orElse.amount : 0
    let empty = 0
    let full = 0
    for (const r of rosterCombats(4))
      for (const b of ofType(r, 'event')) {
        if (b.event.eventId !== 'purification') continue
        const [effect] = b.event.effects
        if (effect.type === 'cleanse') {
          // Un bonus retiré : pas de dégâts en plus
          expect(effect.removed.length).toBeGreaterThan(0)
          full++
        } else {
          expect(effect).toMatchObject({ type: 'damage', amount: light })
          empty++
        }
      }
    expect(empty).toBeGreaterThan(10)
    expect(full).toBeGreaterThan(10)
  })

  it('Purification double (0.69.0) : Ysolde retire aussi son propre dernier malus, poison compris', () => {
    let purged = 0
    for (const r of rosterCombats(8))
      r.beats.forEach((b, i) => {
        if (b.type !== 'event' || b.event.eventId !== 'purification' || b.state.hp.some((h) => h === 0)) return
        const side = b.event.side
        const self = b.event.effects[1]
        expect(self?.type).toBe('cleanse')
        if (self?.type !== 'cleanse') return
        const maluses = r.beats[i - 1].state.statuses[side].filter((s) => STATUSES[s.id].polarity === 'negative').map((s) => s.id)
        expect(self.removed).toEqual(maluses.slice(-1))
        if (self.removed.length) {
          purged++
          expect(b.state.statuses[side].some((s) => s.id === self.removed[0])).toBe(false)
        }
      })
    expect(purged).toBeGreaterThan(10)
  })

  it('Aura d’immunité (0.42.0) : tant qu’elle est là, l’armure du porteur gagne 1 ; hors kit d’Aldric depuis le d6', () => {
    const paladin = createCharacter('aldric')
    expect(effectiveStats(paladin, [{ id: 'immunityAura', stacks: 1 }]).armor).toBe(paladin.stats.armor + 1)
    expect(paladin.definition.reserve?.map((e) => e.id)).toContain('immunity-aura')
  })

  it('Saignement dans le roster (règle 9) : la plaie coule de ses charges du début du coup (au plus de celles qui lui restent), puis en perd une', () => {
    let flows = 0
    for (const r of rosterCombats(4))
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'statusReaction' || beat.status !== 'bleed') return
        const was = r.beats[i - 1].state.statuses[beat.side].find((s) => s.id === 'bleed')!
        // Le coup (ou la pièce) dont la plaie coule : son état de référence est celui d'avant son étape
        const opener = r.beats.slice(0, i).reverse().find((b) => b.type === 'attack' || b.type === 'coin')!
        const atStart = opener.id ? stacksOf(r.beats[opener.id - 1].state.statuses[beat.side], 'bleed') : 0
        expect(atStart).toBeGreaterThan(0)
        expect(beat.effects).toEqual([{ type: 'damage', target: beat.side, amount: Math.min(was.stacks, atStart), source: 'bleed' }])
        expect(beat.state.statuses[beat.side].find((s) => s.id === 'bleed')?.stacks ?? 0).toBe(was.stacks - 1)
        flows++
      })
    expect(flows).toBeGreaterThan(50)
  })

  it('Pourfendre (Gorak, modifie) : le 1 frappe ; s’il touche, Saignement de la moitié des PV retirés, arrondie au-dessus (0.107.0), qui ne coule pas sur ce coup mais dès le coup suivant (règle 9)', () => {
    let cuts = 0
    let dodged = 0
    for (const r of rosterCombats(4))
      r.beats.forEach((beat, i) => {
        // Les coups bruts de la Furie des vents (0.69.0) ne déclenchent aucune compétence de jet
        if (beat.type !== 'attack' || beat.attack.plain || beat.attack.roll !== 1 || r.fighters[beat.attack.attacker].id !== 'gorak') return
        expect(beat.attack.replaced).toBe(false)
        const target = 1 - beat.attack.attacker
        const end = r.beats.findIndex((b, j) => j > i && (b.type === 'attack' || b.turn !== beat.turn))
        const next = r.beats.slice(i + 1, end < 0 ? undefined : end)
        const cleave = next.find((b) => b.type === 'event' && b.event.eventId === 'cleave')
        if (beat.attack.dodged) {
          expect(cleave).toBeUndefined()
          dodged++
          return
        }
        if (beat.state.hp[target] === 0 || next.some((b) => b.state.hp.includes(0))) return
        expect(cleave?.type === 'event' && cleave.event.effects).toEqual([expect.objectContaining({ type: 'applyStatus', status: 'bleed', stacks: Math.ceil(beat.attack.dealt / 2), target })])
        // La plaie ne coule sur ce coup que si elle était déjà là au début du coup, et de ses charges de ce moment (l'étape
        // du coup ne touche pas au Saignement : son état vaut celui du début du coup)
        const before = stacksOf(beat.state.statuses[target], 'bleed')
        const flow = next.find((b) => b.type === 'statusReaction' && b.status === 'bleed' && b.cause === i)
        if (before === 0) expect(flow).toBeUndefined()
        else expect(flow?.type === 'statusReaction' && flow.effects[0]).toMatchObject({ amount: before })
        cuts++
      })
    expect(cuts).toBeGreaterThan(20)
    expect(dodged).toBeGreaterThan(0)
  })

  it('Aura de sainteté (0.42.0) : plafonnée, ses charges ne dépassent jamais le plafond', () => {
    const cap = STATUSES.holyAura.maxStacks!
    expect(cap).toBeGreaterThan(1)
    let capped = 0
    for (const r of rosterCombats(4))
      for (const b of r.beats)
        for (const side of [0, 1] as const) {
          const holy = b.state.statuses[side].find((s) => s.id === 'holyAura')
          if (!holy) continue
          expect(holy.stacks).toBeLessThanOrEqual(cap)
          if (holy.stacks === cap) capped++
        }
    expect(capped).toBeGreaterThan(0)
  })

  it("Coup de chance (gravé sur le 3 de Naraxes, se greffe, 0.107.0) : son coup part ; à l'action suivante, un d6 par charge en plus du dé habituel, chacun un jet complet", () => {
    const lucky = ENGRAVABLE_SKILLS.find((e) => e.id === 'lucky-strike')!
    const naraxes = createCharacter('naraxes').withForge([{ op: 'engrave', face: 3, skill: lucky }])
    let volleys = 0
    for (const other of CHARACTERS)
      for (let seed = 1; seed <= 12; seed++) {
        const r = simulateCombat([naraxes, other], { seed })
        for (const f of ofType(r, 'flurry')) {
          if (f.status !== 'luckyStrike') continue
          volleys++
          // Cumulable (0.50.0) : un d6 par charge, toutes à la fois
          const stacks = r.beats[r.beats.indexOf(f) - 1].state.statuses[f.side].find((x) => x.id === 'luckyStrike')!.stacks
          const dice = Array<number>(1 + stacks).fill(DIE_FACES)
          expect(f.faces).toEqual(dice)
          // Un coup par d6 ; les jets greffés ont leur étape `roll` pour cause, les autres la rafale
          const strikes = attacksOf(r).filter((x) => x.attacker === f.side && x.turn === f.turn)
          if (f.turn < r.turns) expect(strikes).toHaveLength(dice.length)
          // Chaque d6 lit les faces du porteur : son 3 (Coup de chance) se greffe, son coup part
          for (const s of strikes) expect(s.replaced).toBe(false)
          for (const s of strikes.filter((x) => x.roll === 3)) expect(s.preset).toBe(true)
        }
      }
    expect(volleys).toBeGreaterThan(0)
  })
})

describe('paladin (0.31.0)', () => {
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  const release = ev('naturalMax', [{ type: 'release', status: 'retribution', min: 1, target: 'opponent', source: 'strike' }], 'rel')

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
      testCharacter('b', { maxHp: 60, critChance: 1, critMultiplier: 7 }),
    ])
    const first = r.beats.findIndex((b) => b.type === 'attack' && b.attack.attacker === 1)
    const reaction = r.beats[first + 1]
    expect(reaction).toMatchObject({ type: 'statusReaction', status: 'riposte', side: 0 })
    if (reaction.type === 'statusReaction') expect(reaction.effects[0]).toMatchObject({ type: 'damage', target: 1, amount: Math.round(7 / 2) })
    expect(ofType(r, 'statusReaction').filter((b) => b.status === 'riposte')).toHaveLength(1)
  })

  it("Riposte : sans durée, elle attend le premier coup qui touche (un jet remplacé adverse ne l'use pas)", () => {
    // Chaque dé fait 1, et le 1 de b remplace son coup : la riposte d'Aldric ne doit jamais s'éteindre
    const replace: CharacterEvent = { id: 'f', name: 'f', trigger: 'naturalOne', relation: 'replace', effects: [{ type: 'heal', amount: 1 }] }
    const aldric = createCharacter('aldric')
    const riposteEvent = aldric.events.find((e) => e.id === 'riposte')!
    expect(riposteEvent.effects[0]).not.toHaveProperty('turns')
    const r = runOn(1, [
      testCharacter('a', { maxHp: 60 }, [{ ...riposteEvent, trigger: 'combatStart' }]),
      testCharacter('b', { maxHp: 60 }, [replace]),
    ])
    expect(attacksOf(r).filter((a) => a.attacker === 1 && a.replaced).length).toBeGreaterThan(5)
    expect(r.beats.every((b) => b.type === 'event' && b.event.trigger === 'combatStart' || b.state.statuses[0].some((s) => s.id === 'riposte'))).toBe(true)
  })

  it('Rétribution : trois jauges des derniers coups reçus, relâchées en dégâts directs (au moins 1)', () => {
    // b frappe toujours 1 ; a relâche sur un jet maximal (le 6), avant son coup
    const r = run([testCharacter('a', { maxHp: 80 }, [release]), testCharacter('b', { maxHp: 80 })])
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
    // Le dé d'un coup, ou celui d'un jet greffé (étape `roll`)
    expect(forced.type === 'attack' ? forced.attack : forced).toMatchObject({ roll: 1, forced: true })
    expect(cheated.forcedRolls).toEqual({ [rank]: 1 })
    expect(original.forcedRolls).toBeUndefined()
  })

  it('une valeur hors du dé est ramenée à ses bornes ; la pièce suit 1 = pile, 2 = face', () => {
    const r = simulateCombat(pair(), { seed: 3, forcedRolls: { 0: 99 } })
    const first = r.beats.filter(rollsDie)[0]
    expect(first.type === 'attack' ? first.attack.roll : first.type === 'roll' && first.roll).toBe(DIE_FACES)
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

  it('combat test : chaque dé choisi un par un, du premier au K.O., sans changer ce qui précède', () => {
    // Le déroulé de `useCombat` en combat test : on choisit le dé du rang suivant, le moteur résout à
    // nouveau, et ainsi de suite. Le hasard (0) laisse le dé tiré ; deux dés (barde) et pièce compris.
    for (const ids of [['gorak', 'naraxes'], ['fanchon', 'elaria']] as const) {
      const fighters: Pair<ReturnType<typeof createCharacter>> = [createCharacter(ids[0]), createCharacter(ids[1])]
      const forced: Record<number, number> = {}
      let current = simulateCombat(fighters, { seed: 11 })
      let rank = 0
      for (; rank < 400; rank++) {
        const die = dieAt(current, rank)
        if (!die) break
        // Les étapes avant celle qui lance ce dé
        let n = 0
        const before = current.beats.slice(0, current.beats.findIndex((b) => (n += diceOf(b).length) > rank))
        if (rank % 3 !== 2) forced[rank] = die.coin ? 1 + (rank % 2) : 1 + (rank % die.faces)
        const next = simulateCombat(fighters, { seed: 11, forcedRolls: forced })
        expect(next.beats.slice(0, before.length)).toEqual(before)
        expect(dieAt(next, rank)).toEqual(die)
        current = next
      }
      expect(rank).toBeLessThan(400)
      expect(finalState(current).hp[current.winner === 0 ? 1 : 0]).toBe(0)
    }
  })
})

describe('ogre et druide (0.35.0)', () => {
  const duelOf = (a: string, b: string, seed: number) => simulateCombat([createCharacter(a), createCharacter(b)], { seed })
  const statusOn = (s: { statuses: Pair<Status[]> }, side: number, id: StatusId) => s.statuses[side].find((x) => x.id === id)

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

  it('l’homme lance un sort à chaque jet (Foudre sur 1 à 3, Feux follets sur 4 à 6), greffé sur son coup ; l’ours n’a aucun sort et frappe avec sa Force de l’ours, chacun avec son statut de forme', () => {
    const human = ['thunderbolt', 'firefly']
    let spells = 0
    let blows = 0
    for (let seed = 1; seed < 60; seed++) {
      const r = duelOf('thaldrin', 'gorak', seed)
      let form = 0
      r.beats.forEach((b, i) => {
        if (b.type === 'shift' && b.side === 0) form = b.form
        // Le statut de forme suit la forme, à chaque étape
        const forms = b.state.statuses[0].filter((s) => STATUSES[s.id].mechanic === 'form').map((s) => s.id)
        expect(forms).toEqual([form === 0 ? 'casting' : 'bearMight'])
        if (b.type === 'event' && b.event.side === 0) expect(human).toContain(b.event.eventId)
        if (b.type !== 'attack' || b.attack.attacker !== 0) return
        const a = b.attack
        if (form === 0) {
          // Chaque jet de l'homme est un sort greffé : le dé, le sort de sa face, puis son coup de base
          expect(a).toMatchObject({ faces: 6, preset: true, replaced: false })
          expect(r.beats[i - 1]).toMatchObject({ type: 'event', event: { side: 0, eventId: a.roll <= 3 ? 'thunderbolt' : 'firefly' } })
          expect(r.beats[i - 2]).toMatchObject({ type: 'roll', side: 0, roll: a.roll })
          spells++
        } else {
          // L'ours n'a aucun sort : un coup de base à chaque jet, avec sa Force de l'ours
          expect(a.faces).toBe(6)
          expect(a.preset).toBeUndefined()
          expect(a.replaced).toBe(false)
          if (!a.dodged) expect(a.modifiers).toContainEqual({ status: 'bearMight', by: 'attacker', delta: BEAR_MIGHT })
          blows++
        }
      })
    }
    expect(spells).toBeGreaterThan(50)
    expect(blows).toBeGreaterThan(50)
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

  it('Brûlure à une seule valeur (0.69.0) : une durée en plus est refusée par la validation', () => {
    const druid = ROSTER.find((d) => d.id === 'thaldrin')!
    const burn: CharacterEvent = { id: 'wisps', name: 'wisps', trigger: 'naturalThree', form: 'human', effects: [{ type: 'applyStatus', status: 'burn', stacks: 3, turns: 3, target: 'opponent' }] }
    expect(validateRoster([{ ...druid, events: [burn] }])).toEqual(['thaldrin : wisps : burn dure autant de tours que de charges, sans durée en plus'])
  })

  it('0.76.0 : la Foudre tombe en trois coups avec son événement de scène, et les statuts de forme ne se purgent pas', () => {
    const bolt = createCharacter('thaldrin').events.find((e) => e.id === 'thunderbolt')!
    const strike = bolt.effects[0]
    expect(bolt).toMatchObject({ scene: 'lightning', effects: [{ type: 'damage', hits: 3, target: 'opponent' }] })
    const amount = strike.type === 'damage' ? strike.amount : 0
    let bolts = 0
    for (let seed = 1; seed < 40; seed++)
      for (const b of ofType(duelOf('thaldrin', 'brokk', seed), 'event').filter((x) => x.event.eventId === 'thunderbolt')) {
        expect(b.event.effects).toEqual([{ type: 'damage', target: 1, amount: 3 * amount, source: 'lightning', parts: [amount, amount, amount] }])
        bolts++
      }
    expect(bolts).toBeGreaterThan(10)
    let purges = 0
    for (let seed = 1; seed < 80; seed++) {
      const r = duelOf('ysolde', 'thaldrin', seed)
      for (const b of ofType(r, 'event')) {
        if (b.event.eventId !== 'purification' || b.state.hp.some((h) => h === 0)) continue
        const stripped = b.event.effects[0]
        if (stripped.type === 'cleanse') expect(stripped.removed.some((id) => STATUSES[id].mechanic)).toBe(false)
        expect(b.state.statuses[1].some((s) => STATUSES[s.id].mechanic === 'form')).toBe(true)
        purges++
      }
    }
    expect(purges).toBeGreaterThan(10)
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
    expect(ofType(r, 'statusAge').some((b) => b.expired.includes('rot'))).toBe(false)
  })

  it("Armure temporaire (0.50.0) : la Peau de pierre du nain, qui se cumule", () => {
    const pose = (id: string, skill: string) => createCharacter(id).events.find((e) => e.id === skill)!.effects[0]
    expect(pose('brokk', 'stoneskin')).toMatchObject({ type: 'applyStatus', status: 'bonusArmor' })
    const bark = [{ id: 'b', name: 'b', trigger: 'combatStart' as const, effects: [{ type: 'applyStatus' as const, status: 'bonusArmor' as const, stacks: 4 }, { type: 'applyStatus' as const, status: 'bonusArmor' as const, stacks: 4 }] }]
    const r = run([testCharacter('a', {}, bark), testCharacter('b', { critChance: 1, critMultiplier: 6 })])
    expect(statusOn(ofType(r, 'event')[0].state, 0, 'bonusArmor')?.stacks).toBe(8)
    const hit = attacksOf(r).find((a) => a.attacker === 1)!
    expect(hit).toMatchObject({ raw: 6, damage: 1, shieldAbsorbed: 5 })
  })
})

describe('reliques (docs/RELIQUES.md)', () => {
  /** Tours entamés par `side` jusqu'au tour global `t` (le premier joue les tours impairs). */
  const ownTurn = (r: CombatResult, side: 0 | 1, t: number) => {
    const [x, y] = r.initiative[r.initiative.length - 1]
    return side === (x > y ? 0 : 1) ? Math.ceil(t / 2) : Math.floor(t / 2)
  }
  const relic = (r: Partial<Relic>): Relic => ({ id: 'test-relic', name: 'Relique de test', flavor: 'Test.', ...r })

  it('le registre est valide, chaque type a ses trois reliques, et aucune ne pose de malus sur l’adversaire', () => {
    expect(validateRelics()).toEqual([])
    // Les douze de la 0.77.0, trois par type, puis les quatre élémentaires de la 0.85.0 (une par élément)
    const plain = RELICS.filter((r) => !r.element)
    expect(plain).toHaveLength(12)
    for (const kind of ['stat', 'strike', 'turn', 'threshold']) expect(plain.filter((r) => relicKind(r) === kind), kind).toHaveLength(3)
    expect(validateRelics([relic({ stats: { armor: 1 }, rollBonus: 1 })])).toHaveLength(1)
    expect(validateRelics([relic({ trigger: { type: 'turn', turn: 0 }, effects: [{ type: 'heal', amount: 1 }] })])).toHaveLength(1)
    expect(validateRelics([relic({ trigger: { type: 'hpBelow', ratio: 1.2 }, effects: [{ type: 'heal', amount: 1 }] })])).toHaveLength(1)
    expect(validateRelics([relic({ stats: { armor: 1 }, onFace: 4 })])).toHaveLength(1)
    // Règle 7 (décision de l'utilisateur) : vers l'adversaire, seulement des dégâts directs ; jamais de malus
    const stun = relic({ trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'stunned', stacks: 1, target: 'opponent' }] })
    expect(validateRelics([stun])).toHaveLength(2)
    expect(validateRelics([relic({ trigger: { type: 'strike', on: 'hit' }, effects: [{ type: 'damage', amount: 2, target: 'opponent', source: 'strike' }] })])).toEqual([])
  })

  it('caractéristique : les stats s’ajoutent à plat, la base reste connue, une stat peut passer sous 0', () => {
    const c = createCharacter('morgrut').withRelics([getRelic('mercenary-mail'), getRelic('lead-pommel')])
    expect(c.stats).toMatchObject({ armor: c.baseStats.armor + 1, critMultiplier: c.baseStats.critMultiplier + 1 })
    // Morgrut ne vise pas (0 % de critique) : le Contrepoids l'affiche sous 0, il ne critique simplement jamais
    expect(c.stats.critChance).toBeCloseTo(-0.04)
    expect(effectiveStats(c, []).critChance).toBe(0)
    // Morgrut n'a pas d'esquive : la cotte l'affiche à −5 % (« c'est marrant »), il n'esquive simplement jamais
    expect(c.stats.dodgeChance).toBeCloseTo(-0.05)
    expect(effectiveStats(c, []).dodgeChance).toBe(0)
    // La cotte retient 1 de chaque coup : un coup de 1 tombe au plancher
    const r = run([testCharacter('a', { maxHp: 10 }), testCharacter('b', { maxHp: 10 }).withRelics([getRelic('mercenary-mail')])])
    for (const a of attacksOf(r).filter((x) => x.attacker === 0)) expect(a).toMatchObject({ armor: 1, damage: 1, floored: true })
  })

  it('coup : un bonus ajouté à chaque coup qui touche, avant le critique, sans changer le jet', () => {
    const sharp = relic({ rollBonus: 1 })
    const one: CharacterEvent = { id: 'one', name: 'Sur un 1', trigger: 'naturalOne', effects: [{ type: 'heal', amount: 1 }] }
    const r = runOn(1, [testCharacter('a', { critChance: 1 }, [one]).withRelics([sharp]), testCharacter('b', { maxHp: 40 })])
    const mine = attacksOf(r).filter((a) => a.attacker === 0)
    // Coup de base de 1, +1, ×2 du critique : 4 ; le 1 déclenche toujours sa compétence, greffée avant le coup
    for (const a of mine) expect(a).toMatchObject({ roll: 1, value: 1, crit: true, raw: 4, relicBonus: [{ relic: 'test-relic', amount: 1 }] })
    expect(ofType(r, 'event').filter((b) => b.event.side === 0)).toHaveLength(mine.length)
    // Un coup esquivé n'en profite pas
    const dodged = run([testCharacter('a').withRelics([sharp]), testCharacter('b', { dodgeChance: 1, maxHp: 5 })])
    expect(attacksOf(dodged).filter((a) => a.attacker === 0).every((a) => a.dodged && !a.relicBonus)).toBe(true)
  })

  it('coup : une relique de face lit le dé de tout coup, coup brut de Furie compris (2026-10-23)', () => {
    let plainFours = 0
    let plainOnes = 0
    for (let seed = 0; seed < 60; seed++) {
      const gorak = createCharacter('gorak').withRelics([getRelic('four-nail-shoe'), getRelic('split-knucklebone')])
      const r = simulateCombat([gorak, createCharacter('brokk')], { seed })
      r.beats.forEach((b, i) => {
        if (b.type !== 'attack' || b.attack.attacker !== 0) return
        const a = b.attack
        // Le Fer renforce le coup dont le dé fait 4, et lui seul
        if (!a.dodged && !a.replaced) expect(!!a.relicBonus, `jet ${a.roll}${a.plain ? ' brut' : ''}`).toBe(a.roll === 4)
        if (a.plain && a.roll === 4 && !a.dodged) plainFours++
        if (!a.plain || a.roll !== 1 || b.state.hp.includes(0)) return
        // Un 1 brut éveille l'Osselet dans les fenêtres de ce coup, mais aucune compétence (pas de Pourfendre)
        expect(a.replaced).toBe(false)
        expect(r.beats.some((x) => x.type === 'relic' && x.relic === 'split-knucklebone' && x.cause === i)).toBe(true)
        expect(r.beats.some((x) => x.type === 'event' && x.cause === i)).toBe(false)
        plainOnes++
      })
    }
    expect(plainFours).toBeGreaterThan(0)
    expect(plainOnes).toBeGreaterThan(0)
  })

  it('deux dés : chaque dé se lit seul (un 1 de Fanchon éveille l’Osselet, le bonus du 4 va au coup du 4)', () => {
    let ones = 0
    for (let seed = 0; seed < 40; seed++) {
      const r = simulateCombat([createCharacter('fanchon').withRelics([getRelic('split-knucklebone'), getRelic('four-nail-shoe')]), createCharacter('morgrut')], { seed })
      r.beats.forEach((b, i) => {
        if (b.type !== 'attack' || b.attack.attacker !== 0) return
        if (!b.attack.dodged) expect(!!b.attack.relicBonus).toBe(b.attack.roll === 4)
        if (b.attack.roll !== 1 || b.state.hp.includes(0)) return
        // L'Osselet part dans les fenêtres de ce coup, avant le coup suivant
        const next = r.beats.slice(i + 1).findIndex((x) => x.type === 'attack' || x.type === 'roll')
        const window = r.beats.slice(i + 1, next < 0 ? undefined : i + 1 + next)
        expect(window.some((x) => x.type === 'relic' && x.relic === 'split-knucklebone')).toBe(true)
        ones++
      })
    }
    expect(ones).toBeGreaterThan(0)
  })

  it('seuil : un même coup fait passer deux seuils ; le soin de la première relique n’efface pas le passage de la seconde', () => {
    // 0.85.0 : un critique fait passer B de 20 à 5 PV, sous sa Larme (35 %) et sous le Trophée de A (30 %). La Larme
    // le remonte à 10 PV, au-dessus de 30 % : le Trophée part quand même, son passage a eu lieu sur le coup
    const trophy = relic({ id: 'test-trophy', trigger: { type: 'hpBelow', ratio: 0.3, who: 'opponent' }, charges: 1, effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }] })
    const tear = relic({ id: 'test-tear', trigger: { type: 'hpBelow', ratio: 0.35 }, charges: 1, effects: [{ type: 'heal', amount: 5 }] })
    // La Larme est à gauche : elle part la première (les camps dans l'ordre), avant le Trophée
    const r = run([
      testCharacter('b', { maxHp: 20 }).withRelics([tear]),
      testCharacter('a', { maxHp: 50, critChance: 1, critMultiplier: 15 }).withRelics([trophy]),
    ])
    const fires = ofType(r, 'relic')
    expect(fires.slice(0, 2).map((b) => b.relic)).toEqual(['test-tear', 'test-trophy'])
    expect(fires[0].state.hp[0]).toBe(10)
    // Les deux ont pour cause le coup qui a fait passer les seuils
    expect(fires[0].cause).toBe(fires[1].cause)
  })

  it('reliques élémentaires : un élément et sa scène, des impacts pour chaque coup, le moteur ne lit pas la scène', () => {
    const elemental = RELICS.filter((r) => r.element)
    expect(elemental.map((r) => r.element).sort()).toEqual(['earth', 'fire', 'frost', 'wind'])
    // Validation : élément sans scène, scène inconnue, scène sans déclencheur, impacts qui ne comptent pas les coups
    expect(validateRelics([relic({ element: 'fire', trigger: { type: 'turn', turn: 1 }, effects: [{ type: 'heal', amount: 1 }] })])).toHaveLength(1)
    expect(validateRelics([relic({ element: 'fire', scene: 'emberRain', stats: { armor: 1 } })])).toHaveLength(1)
    const rain = relic({ element: 'fire', scene: 'emberRain', trigger: { type: 'turn', turn: 1 }, effects: [{ type: 'damage', amount: 2, hits: 2, target: 'opponent', source: 'fire' }] })
    expect(validateRelics([rain])).toEqual(['test-relic : scène à 3 impacts pour 2 coups'])
    expect(validateRelics([{ ...rain, effects: [{ type: 'damage', amount: 2, hits: 3, target: 'opponent', source: 'fire' }] }])).toEqual([])
    // Présentation seulement : la même relique sans sa scène donne exactement le même combat
    for (const r of elemental)
      for (const seed of [1, 2, 3]) {
        const fight = (x: Relic) => simulateCombat([createCharacter('elaria').withRelics([x]), createCharacter('gorak')], { seed })
        const { element: _e, scene: _s, ...bare } = r
        expect(fight(r).beats.map((b) => b.state)).toEqual(fight(bare).beats.map((b) => b.state))
      }
  })

  it('tour : la relique part au début de son n-ième tour, puis tous les `cooldown` tours, dans la limite de ses charges', () => {
    const candle = relic({ trigger: { type: 'turn', turn: 2 }, cooldown: 3, effects: [{ type: 'heal', amount: 1 }] })
    const fighters = (r: Relic): Pair<ReturnType<typeof testCharacter>> => [testCharacter('a', { maxHp: 60 }).withRelics([r]), testCharacter('b', { maxHp: 60 })]
    const r = run(fighters(candle))
    const turns = ofType(r, 'relic').map((b) => ownTurn(r, 0, b.turn))
    expect(turns.slice(0, 4)).toEqual([2, 5, 8, 11])
    // Au début de son tour : avant son coup
    for (const b of ofType(r, 'relic')) expect(r.beats[r.beats.indexOf(b) + 1]).toMatchObject({ type: 'attack', attack: { attacker: 0 } })
    expect(ofType(run(fighters({ ...candle, charges: 2 })), 'relic')).toHaveLength(2)
    expect(ofType(r, 'relic').map((b) => b.uses).slice(0, 3)).toEqual([1, 2, 3])
  })

  it('seuil : elle part quand ses PV passent sous le seuil, et se réarme s’ils remontent au-dessus', () => {
    const draught = relic({ trigger: { type: 'hpBelow', ratio: 0.5 }, charges: 2, effects: [{ type: 'heal', amount: 5 }] })
    const r = run([testCharacter('a', { maxHp: 20 }).withRelics([draught]), testCharacter('b', { maxHp: 200 })])
    const fires = ofType(r, 'relic')
    expect(fires).toHaveLength(2)
    for (const b of fires) {
      expect(r.beats[r.beats.indexOf(b) - 1].state.hp[0]).toBe(9)
      expect(b.state.hp[0]).toBe(14)
    }
    // Une seule charge : une seule fois, même en repassant sous le seuil
    expect(ofType(run([testCharacter('a', { maxHp: 20 }).withRelics([{ ...draught, charges: 1 }]), testCharacter('b', { maxHp: 200 })]), 'relic')).toHaveLength(1)
    // Le coup qui met K.O. ne la déclenche pas
    const ko = run([testCharacter('a', { maxHp: 20 }).withRelics([draught]), testCharacter('b', { maxHp: 200, critChance: 1, critMultiplier: 30 })])
    expect(ofType(ko, 'relic')).toHaveLength(0)
  })

  it('Dent de loup (2026-10-21) : une seule fois par combat, même quand le vol de vie remonte le porteur au-dessus de 40 %', () => {
    // a frappe pour 1 et encaisse 1 par coup : sous 40 % (7 PV sur 20), le vol de vie le remonte à 8, puis il retombe à 7
    const r = run([testCharacter('a', { maxHp: 20 }).withRelics([getRelic('wolf-fang')]), testCharacter('b', { maxHp: 200 })])
    const fires = ofType(r, 'relic')
    expect(fires).toHaveLength(1)
    const after = r.beats.slice(r.beats.indexOf(fires[0]))
    // Le seuil est bien repassé dans les deux sens après le déclenchement : sans sa charge unique, elle repartait
    const rise = after.findIndex((b) => b.state.hp[0] >= 8)
    expect(rise).toBeGreaterThan(0)
    expect(after.slice(rise).some((b) => b.state.hp[0] > 0 && b.state.hp[0] < 8)).toBe(true)
    expect(relicLine(getRelic('wolf-fang'))).toContain('1 fois par combat')
  })

  it('coup : sur un moment du coup (il esquive), avec une recharge en tours du porteur', () => {
    const mirror = relic({ trigger: { type: 'strike', on: 'dodge' }, cooldown: 2, effects: [{ type: 'damage', amount: 1, target: 'opponent', source: 'wind' }] })
    const r = run([testCharacter('a', { dodgeChance: 1, maxHp: 30 }).withRelics([mirror]), testCharacter('b', { maxHp: 12 })])
    const fires = ofType(r, 'relic')
    expect(fires.length).toBeGreaterThan(2)
    for (const b of fires) expect(r.beats[r.beats.indexOf(b) - 1]).toMatchObject({ type: 'attack', attack: { attacker: 1, dodged: true } })
    const turns = fires.map((b) => ownTurn(r, 0, b.turn))
    for (let k = 1; k < turns.length; k++) expect(turns[k] - turns[k - 1]).toBeGreaterThanOrEqual(2)
  })

  it('une relique ne tire aucun dé : sans déclenchement, le combat est identique à celui sans elle', () => {
    const asleep = relic({ trigger: { type: 'hpBelow', ratio: 0.01 }, effects: [{ type: 'heal', amount: 50 }] })
    const fighters = [createCharacter('gorak'), createCharacter('brokk')] as const
    for (let seed = 0; seed < 20; seed++) {
      const bare = simulateCombat([...fighters], { seed })
      const held = simulateCombat([fighters[0].withRelics([asleep]), fighters[1]], { seed })
      if (ofType(held, 'relic').length === 0) expect(traceText(held).split('\n').filter((l) => !l.startsWith('Reliques ('))).toEqual(traceText(bare).split('\n'))
    }
  })

  it('seuil adverse : le Trophée part quand les PV de l’adversaire passent sous 30 %, et agit sur son porteur', () => {
    const r = run([testCharacter('a', { maxHp: 40 }).withRelics([getRelic('hunter-trophy')]), testCharacter('b', { maxHp: 20 })])
    const fires = ofType(r, 'relic')
    expect(fires).toHaveLength(1)
    const before = r.beats[r.beats.indexOf(fires[0]) - 1].state
    expect(before.hp[1]).toBe(5)
    expect(fires[0].effects).toEqual([expect.objectContaining({ type: 'applyStatus', status: 'guaranteedCrit', target: 0 })])
  })

  it('la trace rejoue les reliques : en-tête lisible, identifiants relus', () => {
    const fighters = [createCharacter('gorak').withRelics(RELICS), createCharacter('brokk').withRelics([getRelic('wolf-fang')])] as const
    const text = traceText(simulateCombat([...fighters], { seed: 5 }))
    expect(parseRelics(text)).toEqual([RELIC_IDS, ['wolf-fang']])
    expect(text).not.toMatch(EMOJI)
    expect(parseRelics(traceText(simulateCombat([createCharacter('gorak'), createCharacter('brokk')], { seed: 5 })))).toEqual([[], []])
  })
})

describe('causes des étapes (moteur v2, docs/MOTEUR_V2.md § 3)', () => {
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  const causeOf = (r: CombatResult, b: Beat) => (b.cause === undefined ? undefined : r.beats[b.cause])

  it('chaque étape porte son rang ; une cause désigne toujours une étape antérieure', () => {
    for (const r of rosterCombats(1))
      r.beats.forEach((b, i) => {
        expect(b.id).toBe(i)
        if (b.cause !== undefined) expect(b.cause).toBeLessThan(i)
      })
  })

  it("poison de l'Aura de décoction (Naraxes) : il a pour cause le coup qui touche (ou la pièce qui touche)", () => {
    let poisons = 0
    for (const r of rosterCombats(4))
      for (const b of ofType(r, 'statusReaction')) {
        if (b.status !== 'decoctionAura') continue
        const cause = causeOf(r, b)
        if (cause?.type === 'attack') expect(cause.attack.attacker).toBe(b.side)
        else expect(cause?.type === 'coin' && cause.side === b.side).toBe(true)
        poisons++
      }
    expect(poisons).toBeGreaterThan(20)
  })

  it('saignement qui coule : il a pour cause le coup qui le fait couler', () => {
    const bleed = ev('combatStart', [{ type: 'applyStatus', status: 'bleed', stacks: 3 }])
    const r = run([testCharacter('a', { maxHp: 60 }, [bleed]), testCharacter('b', { maxHp: 200 })])
    const flows = ofType(r, 'statusReaction').filter((b) => b.status === 'bleed')
    expect(flows).toHaveLength(3)
    for (const f of flows) {
      const cause = causeOf(r, f)
      expect(cause?.type === 'attack' && cause.attack.attacker === 1 && cause.turn === f.turn).toBe(true)
    }
  })

  it('Riposte et poison sur le même coup : chacun dans sa fenêtre (poison sur `hit`, puis Riposte sur `hurt`), même cause', () => {
    const r = run([
      testCharacter('a', { maxHp: 200, attackMin: 1, attackMax: 6 }, [ev('combatStart', [{ type: 'applyStatus', status: 'decoctionAura', stacks: 1 }])]),
      testCharacter('b', { maxHp: 200 }, [ev('turnStart', [{ type: 'applyStatus', status: 'riposte', stacks: 1 }])]),
    ])
    let both = 0
    for (const strike of ofType(r, 'attack')) {
      if (strike.attack.attacker !== 0 || strike.attack.dodged) continue
      const caused = r.beats.filter((b) => b.cause === strike.id)
      const riposte = caused.find((b) => b.type === 'statusReaction' && b.status === 'riposte')
      const poison = caused.find((b) => b.type === 'statusReaction' && b.status === 'decoctionAura')
      if (!riposte || !poison) continue
      // 2026-10-21 : la Riposte n'est plus intercalée avant les fenêtres ; le poison (`hit` de l'attaquant) vient d'abord
      expect(poison.id).toBe(strike.id + 1)
      expect(riposte.id).toBeGreaterThan(poison.id)
      expect(riposte.type === 'statusReaction' && riposte.trigger).toBe('hurt')
      both++
    }
    expect(both).toBeGreaterThan(3)
  })

  it('Pourfendre (Gorak, modifie) : la compétence a pour cause le coup du 1 qui touche', () => {
    let cuts = 0
    for (const r of rosterCombats(4))
      for (const b of ofType(r, 'event')) {
        if (b.event.eventId !== 'cleave') continue
        const cause = causeOf(r, b)
        expect(cause?.type === 'attack' && cause.attack.roll === 1 && !cause.attack.dodged && cause.attack.attacker === b.event.side).toBe(true)
        cuts++
      }
    expect(cuts).toBeGreaterThan(20)
  })

  it('deux dés (Fanchon) : son action est une rafale sans statut de deux jets ; chaque coup a la rafale pour cause, ou son jet greffé', () => {
    let actions = 0
    let grafted = 0
    for (const r of rosterCombats(4))
      for (const f of ofType(r, 'flurry')) {
        if (r.fighters[f.side].id !== 'fanchon' || f.status) continue
        actions++
        expect(f.strikes).toBe(2)
        const strikes = r.beats.filter((b) => b.type === 'attack' && b.cause !== undefined && (b.cause === f.id || (r.beats[b.cause].type === 'roll' && r.beats[b.cause].cause === f.id)))
        if (f.turn < r.turns) expect(strikes).toHaveLength(2)
        grafted += strikes.filter((s) => s.cause !== f.id).length
      }
    expect(actions).toBeGreaterThan(50)
    expect(grafted).toBeGreaterThan(10)
  })

  it('rafale : chaque coup a la rafale pour cause ; des coups instantanés ont pour cause ce qui a posé leur charge', () => {
    let volleys = 0
    let bursts = 0
    // Coup de chance, hors kit depuis le d6, gravé sur le 3 de Naraxes : la rafale qui attend l'action suivante
    const lucky = createCharacter('naraxes').withForge([{ op: 'engrave', face: 3, skill: ENGRAVABLE_SKILLS.find((e) => e.id === 'lucky-strike')! }])
    const luckyCombats = CHARACTERS.flatMap((c) => [1, 2, 3, 4, 5, 6].map((seed) => simulateCombat([lucky, c], { seed })))
    for (const r of [...rosterCombats(4), ...luckyCombats])
      for (const f of ofType(r, 'flurry')) {
        // Un jet greffé a son étape `roll` pour cause, elle-même causée par la rafale
        const strikes = r.beats.filter((b) => b.type === 'attack' && b.cause !== undefined && (b.cause === f.id || (r.beats[b.cause].type === 'roll' && r.beats[b.cause].cause === f.id)))
        if (f.turn < r.turns) expect(strikes).toHaveLength(f.strikes)
        if (f.status && STATUSES[f.status].instantStrikes) {
          expect(causeOf(r, f)).toBeDefined()
          bursts++
        } else {
          expect(f.cause).toBeUndefined()
          volleys++
        }
      }
    expect(volleys).toBeGreaterThan(0)
    expect(bursts).toBeGreaterThan(0)
  })

  it("pièce : elle a pour cause l'étape qui l'a posée ; pile qui touche, les réactions du coup ont la pièce pour cause", () => {
    let coins = 0
    for (let seed = 1; seed < 40; seed++) {
      const r = run(
        [
          testCharacter('a', { maxHp: 200 }, [
            ev('combatStart', [{ type: 'applyStatus', status: 'decoctionAura', stacks: 1 }]),
            ev('naturalOne', [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }], 'coin'),
          ]),
          testCharacter('b', { maxHp: 200 }),
        ],
        seed,
      )
      for (const c of ofType(r, 'coin')) {
        expect(causeOf(r, c)).toMatchObject({ type: 'event', event: { eventId: 'coin', side: 0 } })
        if (c.heads && c.id + 1 < r.beats.length) expect(r.beats[c.id + 1]).toMatchObject({ type: 'statusReaction', status: 'decoctionAura', cause: c.id })
        coins++
      }
    }
    expect(coins).toBeGreaterThan(20)
  })

  it('usure (décompte et extinction, une seule étape) : elle a pour cause l’effet de tour de son statut', () => {
    let linked = 0
    for (const r of rosterCombats(2))
      for (const b of r.beats) {
        if (b.type !== 'statusAge' || b.cause === undefined) continue
        expect(causeOf(r, b)).toMatchObject({ type: 'statusTick', side: b.side, phase: b.phase, turn: b.turn })
        linked++
      }
    expect(linked).toBeGreaterThan(20)
  })
})

describe('audit de fidélité (2026-10-21) : une règle pour « un coup qui touche », mécanismes, coups bruts', () => {
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  const release = ev('naturalMax', [{ type: 'release', status: 'retribution', min: 1, target: 'opponent', source: 'strike' }], 'rel')
  const reactionTo = (r: CombatResult, cause: number, status: StatusId) =>
    r.beats.find((b): b is Extract<Beat, { type: 'statusReaction' }> => b.cause === cause && b.type === 'statusReaction' && b.status === status)

  it('pile (Pile ou face) : Vol de vie, Riposte et jauges de Rétribution réagissent comme à un coup qui touche, des PV de la pièce', () => {
    // a touche toujours, d'un coup de base de 10 (pile : 20 de plus, ce coup ×3) ; chaque coup qui touche lui donne une
    // charge de Vol de vie et une pièce
    const thief = ev('hit', [
      { type: 'applyStatus', status: 'lifesteal', stacks: 1 },
      { type: 'applyStatus', status: 'coinFlip', stacks: 1 },
    ])
    // b reprend une Riposte à chaque début de tour et sait relâcher ses jauges
    const paladin = [ev('turnStart', [{ type: 'applyStatus', status: 'riposte', stacks: 2 }]), release]
    let drained = 0
    let riposted = 0
    let filled = 0
    for (let seed = 1; seed < 40; seed++) {
      const r = run([testCharacter('a', { maxHp: 400, attackMin: 10, attackMax: 10 }, [thief]), testCharacter('b', { maxHp: 400 }, paladin)], seed)
      for (const coin of ofType(r, 'coin')) {
        if (!coin.heads || coin.state.hp.includes(0)) continue
        const drain = reactionTo(r, coin.id, 'lifesteal')
        expect(drain?.trigger).toBe('hit')
        const missing = r.fighters[0].maxHp - r.beats[drain!.id - 1].state.hp[0]
        expect(drain!.effects).toEqual([{ type: 'heal', target: 0, amount: Math.min(20, missing) }])
        drained++
        if (stacksOf(coin.state.statuses[1], 'riposte') > 0) {
          const back = reactionTo(r, coin.id, 'riposte')
          expect(back?.trigger).toBe('hurt')
          expect(back!.effects).toEqual([{ type: 'damage', target: 0, amount: 10, source: 'strike' }])
          riposted++
        }
        const gauge = reactionTo(r, coin.id, 'retribution')
        expect(gauge).toMatchObject({ trigger: 'hurt', effects: [] })
        expect(gauge!.state.statuses[1].find((s) => s.id === 'retribution')?.slots?.at(-1)).toBe(20)
        filled++
      }
    }
    expect(drained).toBeGreaterThan(5)
    expect(riposted).toBeGreaterThan(5)
    expect(filled).toBeGreaterThan(5)
  })

  it('Vol de vie, Riposte et jauges sont des réactions des fenêtres du coup, avec le coup pour cause', () => {
    const r = run([
      testCharacter('a', { maxHp: 200 }, [ev('turnStart', [{ type: 'applyStatus', status: 'lifesteal', stacks: 1 }])]),
      testCharacter('b', { maxHp: 200 }, [ev('turnStart', [{ type: 'applyStatus', status: 'riposte', stacks: 1 }]), release]),
    ])
    let seen = 0
    for (const strike of ofType(r, 'attack')) {
      if (strike.attack.attacker !== 0 || strike.state.hp.includes(0)) continue
      const before = r.beats[strike.id - 1].state
      const caused = r.beats.filter((b) => b.cause === strike.id && b.type === 'statusReaction')
      // Fenêtre `hit` de l'attaquant (Vol de vie), puis `hurt` du défenseur (Riposte et jauges, dans l'ordre de pose)
      const expected = [
        ...(stacksOf(before.statuses[0], 'lifesteal') > 0 ? ['lifesteal:hit'] : []),
        ...before.statuses[1].flatMap((s) => (s.id === 'riposte' ? ['riposte:hurt'] : s.id === 'retribution' ? ['retribution:hurt'] : [])),
        ...(before.statuses[1].some((s) => s.id === 'retribution') ? [] : ['retribution:hurt']),
      ]
      expect(caused.map((b) => (b.type === 'statusReaction' ? `${b.status}:${b.trigger}` : ''))).toEqual(expected)
      seen++
    }
    expect(seen).toBeGreaterThan(5)
  })

  it('Collier de ronces (règle 9) : les Épines posées par le seuil ne répondent pas au coup qui l’a fait franchir, mais dès le coup suivant', () => {
    let waited = 0
    let answered = 0
    for (let seed = 0; seed < 200; seed++) {
      const r = simulateCombat([createCharacter('gorak').withRelics([getRelic('bramble-collar')]), createCharacter('naraxes')], { seed })
      for (const relic of ofType(r, 'relic')) {
        if (relic.relic !== 'bramble-collar' || relic.cause === undefined || relic.state.hp.includes(0)) continue
        const hit = r.beats[relic.cause]
        if (hit.type !== 'attack' && hit.type !== 'coin') continue
        if (stacksOf(r.beats[hit.id - 1].state.statuses[0], 'thorns') > 0) continue
        expect(reactionTo(r, hit.id, 'thorns')).toBeUndefined()
        waited++
        // Le coup suivant qui touche Gorak (et ouvre ses fenêtres) : les Épines y répondent
        const next = r.beats.find(
          (b): b is Extract<Beat, { type: 'attack' }> =>
            b.id > hit.id && b.type === 'attack' && b.attack.attacker === 1 && !b.attack.dodged && !b.attack.replaced && !b.attack.plain,
        )
        if (!next || next.state.hp.includes(0) || stacksOf(r.beats[next.id - 1].state.statuses[0], 'thorns') === 0) continue
        expect(reactionTo(r, next.id, 'thorns')).toBeDefined()
        answered++
      }
    }
    expect(waited).toBeGreaterThan(5)
    expect(answered).toBeGreaterThan(3)
  })

  it('pile (règle 9) : un statut posé pendant la pièce ne réagit pas à la pièce ; posé pendant le coup qui la lance, il y réagit', () => {
    // Chaque fois que a touche (coup ou pile), il donne une Épine à b dans la fenêtre `hit` et prend une pièce
    const spikes = ev('hit', [
      { type: 'applyStatus', status: 'thorns', stacks: 1, target: 'opponent' },
      { type: 'applyStatus', status: 'coinFlip', stacks: 1 },
    ])
    let coins = 0
    for (let seed = 1; seed < 40; seed++) {
      const r = run([testCharacter('a', { maxHp: 400 }, [spikes]), testCharacter('b', { maxHp: 400, dodgeChance: 0 })], seed)
      for (const coin of ofType(r, 'coin')) {
        if (!coin.heads || coin.side !== 0 || r.beats.some((b) => b.cause === coin.id && b.state.hp.includes(0))) continue
        // Les Épines du début de la pièce (celles du coup qui l'a lancée) répondent, sans celle que la pièce vient d'ajouter
        const atStart = stacksOf(r.beats[coin.id - 1].state.statuses[1], 'thorns')
        expect(atStart).toBeGreaterThan(0)
        const back = reactionTo(r, coin.id, 'thorns')
        expect(back?.effects[0]).toMatchObject({ type: 'applyStatus', status: 'bleed', stacks: atStart })
        expect(stacksOf(back!.state.statuses[1], 'thorns')).toBe(atStart + 1)
        coins++
      }
    }
    expect(coins).toBeGreaterThan(5)
  })

  it('Purification ne retire pas la Rétribution : un mécanisme ne se purge pas', () => {
    let purges = 0
    for (let seed = 1; seed < 120; seed++) {
      const r = simulateCombat([createCharacter('ysolde'), createCharacter('aldric')], { seed })
      for (const b of ofType(r, 'event')) {
        if (b.event.eventId !== 'purification' || b.state.hp.includes(0)) continue
        const had = r.beats[b.id - 1].state.statuses[1].find((s) => s.id === 'retribution')
        if (!had) continue
        const cleanse = b.event.effects[0]
        if (cleanse.type === 'cleanse') expect(cleanse.removed).not.toContain('retribution')
        expect(b.state.statuses[1].find((s) => s.id === 'retribution')).toEqual(had)
        purges++
      }
    }
    expect(purges).toBeGreaterThan(5)
  })

  it('Furie des vents : aucune durée, ni dans le registre ni en combat', () => {
    expect(STATUSES.windFury.expiresAt).toBeUndefined()
    let furies = 0
    for (const r of rosterCombats(2))
      for (const b of r.beats)
        for (const s of b.state.statuses.flat())
          if (s.id === 'windFury') {
            expect(s.turns).toBeUndefined()
            furies++
          }
    expect(furies).toBeGreaterThan(0)
  })

  it('usure : décompte et extinction de la même phase tombent dans une seule étape', () => {
    const r = run([
      testCharacter('a', { maxHp: 60 }, [
        ev('combatStart', [
          { type: 'applyStatus', status: 'weakened', stacks: 1, turns: 3, target: 'opponent' },
          { type: 'applyStatus', status: 'poison', stacks: 1, target: 'opponent' },
        ]),
      ]),
      testCharacter('b', { maxHp: 60 }),
    ])
    const ages = ofType(r, 'statusAge').filter((b) => b.side === 1)
    expect(ages[0]).toMatchObject({ phase: 'turnStart', changes: [{ status: 'weakened', from: 3, to: 2 }], expired: ['poison'] })
  })
})

describe('forge du dé (0.88.0, docs/CAMPAGNE.md § 4)', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  const def = (id: string) => createCharacter(id).definition
  /** Le journal est-il rejouable sur la définition d'origine ? */
  const valid = (base: ForgeBase, steps: readonly ForgeStep[]) => {
    try {
      forgeState(base, steps)
      return true
    } catch {
      return false
    }
  }
  const causeOf = (r: CombatResult, b: Beat) => (b.cause === undefined ? undefined : r.beats[b.cause])

  it('gravure sur une face nue : part exactement sur sa face, greffée sur le coup de base, jamais sur un coup brut', () => {
    // Le Souffle de la tombe, sans limite (la Peur, une fois par combat depuis la 0.107.0, laisse ensuite sa face nue)
    const gorak = createCharacter('gorak').withForge([{ op: 'engrave', face: 6, skill: skill('grave-breath') }])
    let sixes = 0
    let plainSixes = 0
    for (let seed = 0; seed < 80; seed++) {
      const r = simulateCombat([gorak, createCharacter('brokk')], { seed })
      // Chaque Souffle a pour cause le jet de Gorak dont le dé fait 6 (étape `roll`), jamais un coup brut
      for (const b of ofType(r, 'event').filter((x) => x.event.eventId === 'grave-breath')) {
        expect(b.event.trigger).toBe(faceTrigger(6))
        expect(causeOf(r, b)).toMatchObject({ type: 'roll', side: 0, roll: 6 })
      }
      for (const b of ofType(r, 'attack')) {
        const a = b.attack
        if (a.attacker !== 0 || a.roll !== 6) continue
        if (a.plain) {
          plainSixes++
          expect(a.replaced).toBe(false)
          expect(r.beats.some((x) => x.type === 'event' && x.cause === b.id)).toBe(false)
          continue
        }
        sixes++
        // Le coup de base du 6 part après le Souffle, au même dé
        const rolled = causeOf(r, b)
        expect(a).toMatchObject({ preset: true, replaced: false })
        expect(rolled).toMatchObject({ type: 'roll', roll: 6 })
        expect(r.beats.some((x) => x.type === 'event' && x.event.eventId === 'grave-breath' && x.cause === rolled!.id)).toBe(true)
      }
    }
    expect(sixes).toBeGreaterThan(0)
    expect(plainSixes).toBeGreaterThan(0)
  })

  it('dorure : +2 au coup qui touche quand le dé fait sa face, avant le critique, coup brut compris (2026-10-23)', () => {
    // Chaque dé fait 1, face dorée, critique assuré ×2 : (1 + 2) × 2 = 6
    const r = runOn(1, [testCharacter('a', { critChance: 1 }).withForge([{ op: 'gild', face: 1 }]), testCharacter('b', { maxHp: 40 })])
    for (const a of attacksOf(r).filter((x) => x.attacker === 0)) expect(a).toMatchObject({ roll: 1, gild: GILD_BONUS, crit: true, raw: 6 })
    let sixes = 0
    let plainSixes = 0
    for (let seed = 0; seed < 60; seed++) {
      const g = simulateCombat([createCharacter('gorak').withForge([{ op: 'gild', face: 6 }]), createCharacter('brokk')], { seed })
      for (const a of attacksOf(g).filter((x) => x.attacker === 0 && !x.dodged && !x.replaced)) {
        expect(a.gild ?? 0, `jet ${a.roll}${a.plain ? ' brut' : ''}`).toBe(a.roll === 6 ? GILD_BONUS : 0)
        if (a.roll === 6) a.plain ? plainSixes++ : sixes++
      }
    }
    expect(sixes).toBeGreaterThan(0)
    expect(plainSixes).toBeGreaterThan(0)
  })

  it('graver et dorer : seulement une face nue', () => {
    const ervald = def('ervald')
    // Faces d'origine (1 et 2) : ni gravure ni dorure
    expect(valid(ervald, [{ op: 'gild', face: 2 }])).toBe(false)
    expect(valid(ervald, [{ op: 'engrave', face: 1, skill: skill('cleave') }])).toBe(false)
    // Hors du dé : refusé
    expect(valid(ervald, [{ op: 'gild', face: 7 }])).toBe(false)
    // Une face gravée ne se regrave pas ; une compétence ne se grave qu'une fois, jamais une de son kit
    expect(valid(ervald, [{ op: 'engrave', face: 5, skill: skill('cleave') }, { op: 'engrave', face: 5, skill: skill('fear') }])).toBe(false)
    expect(valid(ervald, [{ op: 'engrave', face: 5, skill: skill('cleave') }, { op: 'engrave', face: 6, skill: skill('cleave') }])).toBe(false)
    expect(valid(ervald, [{ op: 'engrave', face: 5, skill: skill('life-steal') }])).toBe(false)
    // Une compétence qui a quitté son kit (le Souffle de la tombe, hors kit) se grave à nouveau
    expect(valid(ervald, [{ op: 'engrave', face: 5, skill: skill('grave-breath') }])).toBe(true)
    // Une face gravée n'est plus nue : elle ne se dore pas ; une face dorée, elle, se grave encore
    expect(valid(ervald, [{ op: 'engrave', face: 5, skill: skill('cleave') }, { op: 'gild', face: 5 }])).toBe(false)
    expect(valid(ervald, [{ op: 'gild', face: 6 }, { op: 'engrave', face: 6, skill: skill('fear') }])).toBe(true)
    expect(() => createCharacter('ervald').withForge([{ op: 'gild', face: 2 }])).toThrow()
  })

  it('ogre : ses faces sont nues ; une gravure sur le 1 (Pourfendre) frappe et pourfend', () => {
    expect(def('morgrut').events.filter((e) => isRollTrigger(e.trigger))).toEqual([])
    const morgrut = createCharacter('morgrut').withForge([{ op: 'engrave', face: 1, skill: skill('cleave') }])
    expect(morgrut.events.filter((e) => isRollTrigger(e.trigger)).map((e) => e.id)).toEqual(['cleave'])
    expect(morgrut.events.find((e) => e.id === 'cleave')?.trigger).toBe('naturalOne')
    expect(forgedFaces(morgrut.definition, morgrut.forge)[0]).toMatchObject({ engraved: { id: 'cleave' } })
    let ones = 0
    for (let seed = 0; seed < 60; seed++) {
      const r = simulateCombat([morgrut, createCharacter('ysolde')], { seed })
      for (const b of ofType(r, 'attack').filter((x) => x.attack.attacker === 0 && x.attack.roll === 1)) {
        expect(b.attack.replaced).toBe(false)
        const cut = r.beats.some((x) => x.type === 'event' && x.event.eventId === 'cleave' && x.cause === b.id)
        if (b.attack.dodged) expect(cut).toBe(false)
        else if (b.state.hp.every((h) => h > 0)) {
          expect(cut).toBe(true)
          ones++
        }
      }
      for (const b of ofType(r, 'event').filter((x) => x.event.eventId === 'cleave')) {
        const cause = causeOf(r, b)
        expect(cause?.type === 'attack' && cause.attack.roll === 1 && !cause.attack.dodged).toBe(true)
      }
    }
    expect(ones).toBeGreaterThan(0)
  })

  it('deux dés : la forge vise les faces nues, comme pour tous ; une face gravée ou dorée vaut pour chacun des deux dés', () => {
    const fanchon = def('fanchon')
    expect(offerTargets(fanchon, [], { op: 'engrave', skill: skill('fear') })).toEqual([3, 4, 5, 6])
    expect(offerTargets(fanchon, [], { op: 'gild' })).toEqual([3, 4, 5, 6])
    expect(() => forgeState(fanchon, [{ op: 'gild', face: 1 }])).toThrow()
    const bard = createCharacter('fanchon').withForge([{ op: 'engrave', face: 6, skill: skill('grave-breath') }, { op: 'gild', face: 5 }])
    expect(bard.events.find((e) => e.id === 'grave-breath')!.trigger).toBe(faceTrigger(6))
    // Une compétence qui modifie son coup le modifie aussi sur la barde : chaque dé porte son coup
    expect(relationOf(createCharacter('fanchon').withForge([{ op: 'engrave', face: 6, skill: skill('cleave') }]).events.find((e) => e.id === 'cleave')!)).toBe('modify')
    let sixes = 0
    let both = 0
    let gilded = 0
    for (let seed = 0; seed < 150; seed++) {
      const r = simulateCombat([bard, createCharacter('morgrut')], { seed })
      for (const f of ofType(r, 'flurry').filter((x) => x.side === 0 && !x.status)) {
        // Ses deux jets, dans l'ordre : un 6 lance le Souffle (greffé : étape roll, le Souffle, puis le coup), sur chacun des dés
        const rolls = r.beats.filter((x) => x.type === 'roll' && x.cause === f.id)
        const feared = rolls.filter((x) => x.type === 'roll' && x.roll === 6)
        for (const roll of feared) {
          expect(r.beats[roll.id + 1]).toMatchObject({ type: 'event', event: { eventId: 'grave-breath', trigger: faceTrigger(6) } })
          sixes++
        }
        if (feared.length === 2) both++
      }
      for (const a of attacksOf(r).filter((x) => x.attacker === 0 && !x.dodged && !x.replaced)) {
        expect(a.gild ?? 0).toBe(a.roll === 5 ? GILD_BONUS : 0)
        if (a.gild) gilded++
      }
    }
    expect(sixes).toBeGreaterThan(20)
    expect(both).toBeGreaterThan(0)
    expect(gilded).toBeGreaterThan(0)
  })

  it('aiguiser : un rang de plus (charges sous le plafond, +2 soin, dégâts et libération, ×1 de plus à Crescendo)', () => {
    const sharp = (id: string, steps: ForgeStep[], skillId: string) => createCharacter(id).withForge(steps).events.find((e) => e.id === skillId)!
    const once = sharp('gorak', [{ op: 'sharpen', face: 1 }], 'cleave')
    const twice = sharp('gorak', [{ op: 'sharpen', face: 1 }, { op: 'sharpen', face: 1 }], 'cleave')
    expect(once.name).toBe('Pourfendre II')
    expect(twice.name).toBe('Pourfendre III')
    // Pourfendre (0.107.0) : la moitié des PV du coup, plus une charge par rang
    expect([once.effects[0], twice.effects[0]]).toMatchObject([{ stacks: 1, fromHit: 0.5 }, { stacks: 2, fromHit: 0.5 }])
    // Seules les compétences de la face aiguisée changent
    expect(createCharacter('gorak').withForge([{ op: 'sharpen', face: 1 }]).events.filter((e) => e.id !== 'cleave')).toEqual(def('gorak').events.filter((e) => e.id !== 'cleave'))
    const bolt = def('thaldrin').events.find((e) => e.id === 'thunderbolt')!.effects[0]
    expect(sharp('thaldrin', [{ op: 'sharpen', face: 1 }], 'thunderbolt').effects[0]).toMatchObject({ type: 'damage', amount: (bolt.type === 'damage' ? bolt.amount : 0) + 2 })
    expect(sharp('aldric', [{ op: 'sharpen', face: 1 }], 'retribution').effects[0]).toMatchObject({ type: 'release', min: 3 })
    expect(sharp('gorak', [{ op: 'engrave', face: 3, skill: skill('crescendo') }, { op: 'sharpen', face: 3 }], 'crescendo').hitMultiplier).toBe(skill('crescendo').hitMultiplier! + 1)
    // Une gravure s'aiguise sur sa face
    expect(sharp('ervald', [{ op: 'engrave', face: 5, skill: skill('cleave') }, { op: 'sharpen', face: 5 }], 'cleave').effects[0]).toMatchObject({ stacks: 1 })
    // Rien à gagner (statut qui ne cumule pas, statut au plafond) : la face n'est pas proposée, l'opération est refusée
    expect(valid(def('aldric'), [{ op: 'sharpen', face: 2 }])).toBe(false)
    expect(valid(def('gorak'), [{ op: 'sharpen', face: 5 }])).toBe(false)
    // Le Vol de vie (1 charge, plafond 2, 0.107.0) monte au plafond en un rang, puis sa face n'est plus proposée
    expect(sharp('ervald', [{ op: 'sharpen', face: 1 }], 'life-steal').effects[0]).toMatchObject({ stacks: STATUSES.lifesteal.maxStacks })
    expect(offerTargets(def('ervald'), [{ op: 'sharpen', face: 1 }], { op: 'sharpen' })).not.toContain(1)
    // L'Aura de sainteté (plafond 2, 0.107.0) aussi
    const holy: ForgeStep[] = [{ op: 'sharpen', face: 2 }]
    expect(sharp('ysolde', holy, 'holy-aura').effects[0]).toMatchObject({ stacks: STATUSES.holyAura.maxStacks })
    expect(offerTargets(def('ysolde'), holy, { op: 'sharpen' })).not.toContain(2)
    expect(() => forgeState(def('ysolde'), [...holy, { op: 'sharpen', face: 2 }])).toThrow()
    // Pas de rang maximal (décision de l'utilisateur, 2026-10-23) : Pourfendre monte au rang IV et au-delà
    const thrice: ForgeStep[] = [{ op: 'sharpen', face: 1 }, { op: 'sharpen', face: 1 }, { op: 'sharpen', face: 1 }]
    expect(sharp('gorak', thrice, 'cleave')).toMatchObject({ name: 'Pourfendre IV', effects: [{ stacks: 3, fromHit: 0.5 }] })
    expect(offerTargets(def('gorak'), thrice, { op: 'sharpen' })).toContain(1)
  })

  it('offre : des opérations différentes, toutes jouables ; le choix automatique est toujours valide', () => {
    for (const id of CHARACTER_IDS) {
      const base = def(id)
      const rng = seededRng(id.length * 31)
      let steps: ForgeStep[] = []
      for (let k = 0; k < 12; k++) {
        const offer = drawForgeOffer(base, steps, rng, ENGRAVABLE_SKILLS)
        expect(offer.length).toBeLessThanOrEqual(FORGE_OFFER_SIZE)
        expect(new Set(offer.map((o) => o.op)).size).toBe(offer.length)
        for (const o of offer) {
          const targets = offerTargets(base, steps, o)
          if (o.op === 'temper') {
            expect(targets).toEqual([])
            expect(valid(base, [...steps, stepOf(o)]), `${id} ${o.op}`).toBe(true)
          } else {
            expect(targets.length, `${id} ${o.op}`).toBeGreaterThan(0)
            for (const face of targets) expect(valid(base, [...steps, stepOf(o, face)]), `${id} ${o.op} ${face}`).toBe(true)
          }
        }
        const step = autoForge(base, steps, offer, rng)
        if (!step) break
        steps = withForgeStep(base, steps, step)
        // Tremper l'arme : +1 à l'attaque par trempe
        const tempered = steps.filter((s) => s.op === 'temper').length
        const forged = createCharacter(id).withForge(steps)
        expect(forged.baseStats).toMatchObject({ attackMin: base.stats.attackMin + tempered, attackMax: base.stats.attackMax + tempered })
        // Une gravure ou une copie n'écrase jamais une compétence d'origine
        for (const e of base.events) expect(forged.events.some((x) => x.id === e.id && x.trigger === e.trigger), `${id} ${e.id} ${e.trigger}`).toBe(true)
      }
      expect(steps.length).toBeGreaterThan(0)
    }
    expect(() => withForgeStep(def('gorak'), [], { op: 'gild', face: 1 })).toThrow()
  })

  it('trace : l’en-tête de forge se relit et rejoue le combat à l’identique', () => {
    const left = createCharacter('gorak').withForge([{ op: 'engrave', face: 6, skill: skill('fear') }, { op: 'gild', face: 5 }, { op: 'temper' }, { op: 'sharpen', face: 1 }])
    const right = createCharacter('morgrut').withForge([{ op: 'engrave', face: 1, skill: skill('cleave') }, { op: 'copy', face: 1 }])
    const r = simulateCombat([left, right], { seed: 5 })
    const text = traceText(r)
    const forge = parseForge(text, ENGRAVABLE_SKILLS)
    expect(forge).toEqual([left.forge, right.forge])
    const replay = simulateCombat([createCharacter('gorak').withForge(forge[0]), createCharacter('morgrut').withForge(forge[1])], { seed: 5 })
    expect(traceText(replay)).toBe(text)
    // Un camp sans forge relit un journal vide
    expect(parseForge(traceText(simulateCombat([left, createCharacter('brokk')], { seed: 5 })), ENGRAVABLE_SKILLS)[1]).toEqual([])
  })
})

describe('attaque de base (phase 5 bis)', () => {
  const heal: CharacterEvent['effects'] = [{ type: 'heal', amount: 1 }]
  /** Les étapes dont l'étape `id` est la cause directe, dans l'ordre. */
  const causedBy = (r: CombatResult, id: number) => r.beats.filter((b) => b.cause === id)

  it('chaque jet d’un dé simple porte un coup de base, quelle que soit sa face (nue, greffe, modifie), sauf un jet remplacé', () => {
    // Le 1 greffe, le 2 modifie, le 3 remplace ; le 4, le 5 et le 6 sont nus
    const kit: CharacterEvent[] = [
      { id: 'g', name: 'g', trigger: 'naturalOne', effects: heal },
      { id: 'm', name: 'm', trigger: 'naturalTwo', relation: 'modify', effects: heal },
      { id: 'x', name: 'x', trigger: 'naturalThree', relation: 'replace', effects: heal },
    ]
    let actions = 0
    const faces = new Set<number>()
    for (let seed = 1; seed <= 20; seed++) {
      const r = run([testCharacter('a', { maxHp: 60, attackMin: 2, attackMax: 4 }, kit), testCharacter('b', { maxHp: 60, dodgeChance: 0.2 })], seed)
      const turns = new Set(r.beats.filter((b) => b.owner === 0 && b.turn > 0).map((b) => b.turn))
      for (const turn of turns) {
        // Une action, un jet, une étape de coup : un coup de base, ou un jet remplacé (le 3)
        const strikes = attacksOf(r).filter((a) => a.attacker === 0 && a.turn === turn)
        expect(strikes).toHaveLength(1)
        expect(strikes[0].replaced).toBe(strikes[0].roll === 3)
        if (!strikes[0].replaced) expect(strikes[0].value).toBeGreaterThanOrEqual(2)
        faces.add(strikes[0].roll)
        actions++
      }
    }
    expect(faces).toEqual(new Set([1, 2, 3, 4, 5, 6]))
    expect(actions).toBeGreaterThan(200)
  })

  it('la valeur du coup se tire dans [attackMin, attackMax], après le dé ; une attaque fixe ne tire rien', () => {
    const values = new Set<number>()
    for (let seed = 1; seed <= 20; seed++)
      for (const a of attacksOf(run([testCharacter('a', { maxHp: 80, attackMin: 3, attackMax: 6 }), testCharacter('b', { maxHp: 80, attackMin: 3, attackMax: 6 })], seed))) {
        expect(a.value).toBeGreaterThanOrEqual(3)
        expect(a.value).toBeLessThanOrEqual(6)
        values.add(a.value)
      }
    expect(values).toEqual(new Set([3, 4, 5, 6]))
    // Attaque fixe : toujours sa valeur, et aucun tirage de plus (les dés suivent la même suite qu'une attaque de 1)
    const fight = (attackMin: number, attackMax: number) =>
      attacksOf(run([testCharacter('a', { maxHp: 1000, attackMin, attackMax }), testCharacter('b', { maxHp: 1000 })], 9))
    const fixed = fight(4, 4)
    expect(fixed.filter((a) => a.attacker === 0).every((a) => a.value === 4)).toBe(true)
    expect(fixed.slice(0, 60).map((a) => a.roll)).toEqual(fight(1, 1).slice(0, 60).map((a) => a.roll))
    expect(fight(1, 2).slice(0, 60).map((a) => a.roll)).not.toEqual(fight(1, 1).slice(0, 60).map((a) => a.roll))
  })

  it('greffe : le dé tombe, la compétence part, puis le coup de base au même dé ; un statut qu’elle pose réagit à ce coup', () => {
    // Le 1 pose un Critique assuré : il fait critiquer le coup même du jet
    const hawk: CharacterEvent = { id: 'hawk', name: 'hawk', trigger: 'naturalOne', effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }] }
    const r = runOn(1, [testCharacter('a', { maxHp: 60 }, [hawk]), testCharacter('b', { maxHp: 60 })])
    const rolls = ofType(r, 'roll').filter((b) => b.side === 0)
    expect(rolls.length).toBeGreaterThan(5)
    for (const roll of rolls) {
      expect(roll).toMatchObject({ roll: 1, faces: DIE_FACES })
      const [skill, strike] = causedBy(r, roll.id)
      expect(skill).toMatchObject({ type: 'event', id: roll.id + 1, event: { side: 0, eventId: 'hawk' } })
      expect(strike).toMatchObject({ type: 'attack', attack: { attacker: 0, roll: 1, preset: true, replaced: false, crit: true, critForced: true, critBy: 'guaranteedCrit', raw: 2 } })
      // Le critique a usé la charge posée par la compétence
      expect(stacksOf(strike.state.statuses[0], 'guaranteedCrit')).toBe(0)
    }
  })

  it('modifie : la compétence part dans les fenêtres de son coup, seulement s’il touche', () => {
    const cut: CharacterEvent = { id: 'cut', name: 'cut', trigger: 'naturalOne', relation: 'modify', effects: [{ type: 'applyStatus', status: 'exposed', stacks: 1, target: 'opponent' }] }
    // Défenseur qui esquive tout : jamais de compétence, et aucun jet greffé
    const dodging = runOn(1, [testCharacter('a', { maxHp: 60 }, [cut]), testCharacter('b', { maxHp: 60, dodgeChance: 1 })])
    expect(attacksOf(dodging).filter((a) => a.attacker === 0).every((a) => a.dodged && a.roll === 1 && !a.preset)).toBe(true)
    expect(ofType(dodging, 'event')).toEqual([])
    expect(ofType(dodging, 'roll')).toEqual([])
    // Coup qui touche : la compétence suit, avec le coup pour cause
    const r = runOn(1, [testCharacter('a', { maxHp: 60 }, [cut]), testCharacter('b', { maxHp: 60 })])
    const strikes = ofType(r, 'attack').filter((b) => b.attack.attacker === 0 && b.state.hp[1] > 0)
    expect(strikes.length).toBeGreaterThan(5)
    for (const s of strikes) expect(causedBy(r, s.id).filter((b) => b.type === 'event').map((b) => b.type === 'event' && b.event.eventId)).toEqual(['cut'])
  })

  it('remplace : le jet ne porte pas de coup (valeur 0, ni esquive ni critique), la compétence part à sa place', () => {
    const swap: CharacterEvent = { id: 'swap', name: 'swap', trigger: 'naturalOne', relation: 'replace', effects: heal }
    const r = runOn(1, [testCharacter('a', { maxHp: 60, attackMin: 5, attackMax: 7, critChance: 1 }, [swap]), testCharacter('b', { maxHp: 60, dodgeChance: 0.5 })])
    const mine = ofType(r, 'attack').filter((b) => b.attack.attacker === 0)
    expect(mine.length).toBeGreaterThan(5)
    for (const b of mine) {
      expect(b.attack).toMatchObject({ roll: 1, replaced: true, value: 0, dodged: false, dodgeForced: false, crit: false, raw: 0, damage: 0, dealt: 0 })
      expect(causedBy(r, b.id).some((x) => x.type === 'event' && x.event.eventId === 'swap')).toBe(true)
    }
    expect(r.beats.every((b) => b.state.hp[1] === 60)).toBe(true)
  })

  it('remplace : la Furie des vents donne, à la place du coup du 2, deux coups de base bruts, chacun avec son dé', () => {
    const fury = createCharacter('gorak').events.find((e) => e.id === 'wind-fury')!
    expect(relationOf(fury)).toBe('replace')
    const r = runOn(2, [testCharacter('a', { maxHp: 60, attackMin: 3, attackMax: 3 }, [fury]), testCharacter('b', { maxHp: 200 })])
    let checked = 0
    for (const flurry of ofType(r, 'flurry').filter((b) => b.side === 0)) {
      const replaced = r.beats[flurry.cause!]
      expect(replaced.type === 'event' && replaced.event.eventId).toBe('wind-fury')
      const strikes = causedBy(r, flurry.id).filter((b): b is Extract<Beat, { type: 'attack' }> => b.type === 'attack')
      if (strikes.some((s) => s.state.hp.includes(0))) continue
      expect(strikes.map((s) => s.attack)).toEqual([
        expect.objectContaining({ roll: 2, plain: true, replaced: false, value: 3, dealt: 3 }),
        expect.objectContaining({ roll: 2, plain: true, replaced: false, value: 3, dealt: 3 }),
      ])
      expect(strikes.every((s) => s.attack.preset === undefined)).toBe(true)
      checked++
    }
    expect(checked).toBeGreaterThan(5)
    // Le jet du 2 lui-même ne frappe pas
    expect(attacksOf(r).filter((a) => a.attacker === 0 && !a.plain).every((a) => a.replaced)).toBe(true)
  })

  it('Pile ou face ×3 (0.107.0) : sur pile, la pièce retire encore deux fois les PV que le coup a retirés', () => {
    const coin = createCharacter('naraxes').events.find((e) => e.id === 'coin-flip')!
    expect(relationOf(coin)).toBe('modify')
    // Chaque dé fait 1 : la pièce tombe sur pile ; coup de base de 5, armure 2 : 3 PV, puis 6 de plus
    const r = runOn(1, [testCharacter('a', { maxHp: 100, attackMin: 5, attackMax: 5 }, [coin]), testCharacter('b', { maxHp: 100, armor: 2 })])
    const coins = ofType(r, 'coin')
    expect(coins.length).toBeGreaterThan(5)
    for (const c of coins) {
      const strike = r.beats.slice(0, c.id).reverse().find((b) => b.type === 'attack')!
      expect(strike.type === 'attack' && strike.attack.dealt).toBe(3)
      expect(c).toMatchObject({ heads: true, effects: [{ type: 'damage', target: 1, amount: 6, source: 'strike' }] })
    }
  })

  it('Tremper l’arme : +1 à l’attaque (minimum et maximum) par trempe, cumulable ; le combat la lit', () => {
    const base = testCharacter('a', { maxHp: 80, attackMin: 3, attackMax: 5 })
    expect(forgeState(base.definition, [{ op: 'temper' }, { op: 'temper' }]).temper).toBe(2 * TEMPER_BONUS)
    expect(base.withForge([{ op: 'temper' }]).stats).toMatchObject({ attackMin: 4, attackMax: 6 })
    const twice = base.withForge([{ op: 'temper' }, { op: 'temper' }])
    expect(twice.stats).toMatchObject({ attackMin: 5, attackMax: 7 })
    expect(offerTargets(base.definition, [], { op: 'temper' })).toEqual([])
    const values = new Set(attacksOf(run([twice, testCharacter('b', { maxHp: 80 })])).filter((a) => a.attacker === 0).map((a) => a.value))
    expect([...values].every((v) => v >= 5 && v <= 7)).toBe(true)
  })

  it('druide : le coup de base de l’homme est magique (DM), celui de l’ours physique (DP)', () => {
    const druid = createCharacter('thaldrin')
    expect([druid.attackKindIn(0), druid.attackKindIn(1)]).toEqual(['magical', 'physical'])
    const kinds = { magical: 0, physical: 0 }
    for (let seed = 1; seed < 20; seed++) {
      const r = simulateCombat([druid, createCharacter('gorak')], { seed })
      let form = 0
      for (const b of r.beats) {
        if (b.type === 'shift' && b.side === 0) form = b.form
        if (b.type !== 'attack') continue
        if (b.attack.attacker === 1) expect(b.attack.kind).toBe('physical')
        else {
          expect(b.attack.kind).toBe(form === 0 ? 'magical' : 'physical')
          kinds[b.attack.kind]++
        }
      }
    }
    expect(kinds.magical).toBeGreaterThan(20)
    expect(kinds.physical).toBeGreaterThan(20)
  })

  it('Copier une face : la compétence d’une face, rang compris, sur la face nue de plus petit numéro qui n’est pas dorée ; une face nue ne se copie pas', () => {
    // Gorak : Pourfendre sur le 1, la Furie sur le 2, le 3 à 6 nus
    const gorak = createCharacter('gorak').definition
    const copiedOn = (steps: ForgeStep[]) => forgedFaces(gorak, steps).flatMap((f) => (f.engraved ? [[f.face, f.engraved.id]] : []))
    expect(copiedOn([{ op: 'copy', face: 1 }])).toEqual([[3, 'cleave']])
    // Le 3 doré : la copie va sur le 4 ; toutes les faces nues dorées : sur la plus petite
    expect(copiedOn([{ op: 'gild', face: 3 }, { op: 'copy', face: 1 }])).toEqual([[4, 'cleave']])
    const allGilded: ForgeStep[] = [3, 4, 5, 6].map((face) => ({ op: 'gild', face }))
    expect(copiedOn([...allGilded, { op: 'copy', face: 2 }])).toEqual([[3, 'wind-fury']])
    // Seules les faces de compétence se copient
    expect(offerTargets(gorak, [], { op: 'copy' })).toEqual([1, 2])
    expect(() => forgeState(gorak, [{ op: 'copy', face: 4 }])).toThrow()
    // Avec son rang ; deux faces au plus, puis elle n'est plus proposée
    const twice: ForgeStep[] = [{ op: 'sharpen', face: 1 }, { op: 'copy', face: 1 }]
    expect(createCharacter('gorak').withForge(twice).events.filter((e) => e.id === 'cleave').map((e) => [e.trigger, e.name])).toEqual([
      ['naturalOne', 'Pourfendre II'],
      ['naturalThree', 'Pourfendre II'],
    ])
    expect(offerTargets(gorak, twice, { op: 'copy' })).toEqual([2])
    // Le druide : un sort sur chaque face, aucune face nue où copier
    expect(offerTargets(createCharacter('thaldrin').definition, [], { op: 'copy' })).toEqual([])
    // Une copie qui ne rapporte rien n'est pas proposée : l'Aura de puissance (permanente, non cumulable depuis la 0.107.0)
    // gravée sur le 3 ne se copie pas ; l'Aura de décoction, cumulable, se copie
    const engraved = (id: string): ForgeStep[] => [{ op: 'engrave', face: 3, skill: ENGRAVABLE_SKILLS.find((e) => e.id === id)! }]
    expect(offerTargets(gorak, engraved('power-aura'), { op: 'copy' })).toEqual([1, 2])
    expect(() => forgeState(gorak, [...engraved('power-aura'), { op: 'copy', face: 3 }])).toThrow()
    expect(offerTargets(gorak, engraved('decoction-aura'), { op: 'copy' })).toEqual([1, 2, 3])
  })

  it('ce coup ×N (Crescendo, Soliste, phase 5 ter) : une compétence qui modifie son coup multiplie sa valeur, avant le critique ; elle part s’il touche', () => {
    const solo: CharacterEvent = { id: 'solo', name: 'solo', trigger: 'naturalOne', relation: 'modify', hitMultiplier: 3, effects: [] }
    const a = testCharacter('a', { maxHp: 400, attackMin: 4, attackMax: 4, critChance: 0.5 }, [solo])
    const r = runOn(1, [a, testCharacter('b', { maxHp: 400, dodgeChance: 0.3 })])
    let touched = 0
    let dodged = 0
    for (const b of ofType(r, 'attack').filter((x) => x.attack.attacker === 0)) {
      expect(b.attack).toMatchObject({ roll: 1, value: 4, multiplier: 3, replaced: false })
      if (!b.attack.dodged) expect(b.attack.damage).toBe(b.attack.crit ? 24 : 12)
      const fired = causedBy(r, b.id).some((x) => x.type === 'event' && x.event.eventId === 'solo')
      // Le coup fatal arrête le combat avant ses fenêtres
      if (!b.state.hp.includes(0)) expect(fired).toBe(!b.attack.dodged)
      if (b.attack.dodged) dodged++
      else touched++
    }
    expect(touched).toBeGreaterThan(3)
    expect(dodged).toBeGreaterThan(0)
    // Une autre face : le coup n'est pas multiplié
    for (const b of ofType(runOn(4, [a, testCharacter('b', { maxHp: 400 })]), 'attack').filter((x) => x.attack.attacker === 0)) expect(b.attack.multiplier).toBeUndefined()
  })

  it('Crescendo (0.107.0) : ce coup ×2, puis ×1 de plus à chaque fois qu’il a touché ; un coup esquivé ne le fait pas monter', () => {
    const cresc: CharacterEvent = { id: 'cresc', name: 'cresc', trigger: 'naturalOne', relation: 'modify', hitMultiplier: 2, buildsUp: true, effects: [] }
    const r = runOn(1, [testCharacter('a', { maxHp: 400, attackMin: 2, attackMax: 2 }, [cresc]), testCharacter('b', { maxHp: 400, dodgeChance: 0.3 })])
    let fired = 0
    let dodged = 0
    for (const b of ofType(r, 'attack').filter((x) => x.attack.attacker === 0)) {
      expect(b.attack.multiplier).toBe(2 + fired)
      if (b.attack.dodged) dodged++
      // Il part s'il touche (le coup fatal arrête le combat avant ses fenêtres)
      fired += causedBy(r, b.id).filter((x) => x.type === 'event' && x.event.eventId === 'cresc').length
    }
    expect(fired).toBeGreaterThan(3)
    expect(dodged).toBeGreaterThan(0)
    expect(validateRoster([{ ...createCharacter('gorak').definition, events: [{ ...cresc, hitMultiplier: undefined }] }]).some((p) => p.includes('buildsUp'))).toBe(true)
  })

  it('Rétribution (0.107.0) : sur le 1, Aldric relâche la moitié de ses jauges, arrondie au-dessous (au moins 1)', () => {
    let released = 0
    for (const other of CHARACTER_IDS)
      for (let seed = 1; seed <= 6; seed++) {
        const r = simulateCombat([createCharacter('aldric'), createCharacter(other)], { seed })
        for (const b of ofType(r, 'event').filter((x) => x.event.eventId === 'retribution' && x.event.side === 0)) {
          const stored = r.beats[b.id - 1].state.statuses[0].find((s) => s.id === 'retribution')?.stacks ?? 0
          expect(b.event.effects).toEqual([{ type: 'damage', target: 1, amount: Math.max(1, Math.floor(stored / 2)), source: 'strike' }])
          // Les jauges sont vidées
          expect(b.state.statuses[0].some((s) => s.id === 'retribution')).toBe(false)
          if (stored > 1) released++
        }
      }
    expect(released).toBeGreaterThan(20)
  })

  it('Pourfendre (0.107.0) : `fromHit` seulement sur une compétence du dé qui modifie son coup', () => {
    const cut = (relation?: 'modify'): CharacterEvent => ({ id: 'cut', name: 'cut', trigger: 'naturalOne', relation, effects: [{ type: 'applyStatus', status: 'bleed', stacks: 0, fromHit: 0.5, target: 'opponent' }] })
    const gorak = { ...createCharacter('gorak').definition, signature: undefined }
    expect(validateRoster([{ ...gorak, events: [cut('modify')] }])).toEqual([])
    expect(validateRoster([{ ...gorak, events: [cut()] }]).some((p) => p.includes('fromHit'))).toBe(true)
  })

  it('compétence épuisée (`limit`, 0.107.0) : sa face redevient nue, le coup part sans étape roll ni compétence', () => {
    const fear: CharacterEvent = { id: 'scare', name: 'scare', trigger: 'naturalOne', limit: 1, effects: [{ type: 'applyStatus', status: 'fear', stacks: 1, target: 'opponent' }] }
    const r = runOn(1, [testCharacter('a', { maxHp: 200 }, [fear]), testCharacter('b', { maxHp: 200 })])
    expect(ofType(r, 'event').filter((x) => x.event.eventId === 'scare')).toHaveLength(1)
    const mine = ofType(r, 'attack').filter((x) => x.attack.attacker === 0)
    expect(mine.length).toBeGreaterThan(3)
    // Le premier 1 se greffe (étape roll, la Peur, puis le coup) ; les suivants sont des coups simples
    expect(mine[0].attack.preset).toBe(true)
    for (const b of mine.slice(1)) expect(b.attack.preset).toBeUndefined()
    expect(ofType(r, 'roll').filter((x) => x.side === 0)).toHaveLength(1)
  })

  it('barde (phase 5 ter) : ses deux dés sont deux jets complets ; chacun déclenche la compétence de sa face, puis son coup de base', () => {
    const fanchon = createCharacter('fanchon')
    // Plus aucun déclencheur de double : ses compétences sont sur ses faces, comme celles de tous
    for (const e of [...fanchon.events, ...(fanchon.definition.reserve ?? [])]) expect(e.trigger === 'combatStart' || rollFace(e.trigger) !== undefined).toBe(true)
    for (const face of [1, 2]) {
      const skill = fanchon.events.find((e) => rollFace(e.trigger) === face)!
      const r = runOn(face, [fanchon, testCharacter('cible', { maxHp: 400, dodgeChance: 0.3 })])
      const actions = ofType(r, 'flurry').filter((f) => f.side === 0 && !f.status)
      expect(actions.length).toBeGreaterThan(3)
      let total = 0
      for (const f of actions) {
        if (f.turn === r.turns) continue
        expect(f).toMatchObject({ strikes: 2, faces: [DIE_FACES, DIE_FACES] })
        // Ses deux coups, chacun sous sa rafale ou son jet greffé, et la compétence de la face sur chacun des deux
        const jets = r.beats.filter((b) => b.cause === f.id)
        const strikes = jets.flatMap((b) => (b.type === 'roll' ? causedBy(r, b.id) : [b])).filter((b): b is Extract<Beat, { type: 'attack' }> => b.type === 'attack')
        expect(strikes).toHaveLength(2)
        for (const s of strikes) expect(s.attack.roll).toBe(face)
        const fired = r.beats.filter((b) => b.type === 'event' && b.event.eventId === skill.id && strikes.some((s) => b.cause === s.id || b.cause === s.cause))
        if (skill.limit === undefined) expect(fired.length).toBe(strikes.filter((s) => s.cause !== f.id || !s.attack.dodged).length)
        total += fired.length
      }
      // Soliste, une fois par combat (0.107.0) : un seul solo, puis sa face est nue
      if (skill.limit !== undefined) expect(total).toBe(skill.limit)
    }
  })
})
