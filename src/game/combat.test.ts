import { describe, expect, it } from 'vitest'
import { attacksOf, diceOf, dieAt, effectiveStats, finalState, MAX_TURNS, rollsDie, simulateCombat, type Beat, type CombatResult, type Pair } from './combat'
import { doubleTrigger, faceTrigger, rollMatches, type CharacterEvent } from './events'
import { autoForge, drawForgeOffer, FORGE_OFFER_SIZE, forgedFaces, forgeState, GILD_BONUS, offerTargets, stepOf, withForgeStep, type ForgeBase, type ForgeStep } from './forge'
import { seededRng } from './rng'
import { CHARACTER_IDS, CHARACTERS, createCharacter, ENGRAVABLE_SKILLS, ROSTER, validateRoster } from './roster'
import { computeStats } from './stats'
import { BEAR_MIGHT, DECOCTION_POISON, STATUSES, stacksOf, type Status, type StatusId } from './statuses'
import { EMOJI, testCharacter } from './test-utils'
import { getRelic, RELIC_IDS, relicKind, relicLine, RELICS, validateRelics, type Relic } from './relics'
import { parseForcedRolls, parseForge, parseRelics, traceText } from './trace'

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
            // Dégâts finaux (Aura mélodieuse, Fausse note, 0.41.0) : après l'armure et les boucliers
            const final = a.modifiers.reduce((t, m) => t + (m.final ? m.delta : 0), 0)
            expect(a.damage).toBe(a.raw - a.armorAbsorbed - a.shieldAbsorbed + final)
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
      // Forme du moment de chaque camp (druide) : une compétence de forme n'existe que sous sa forme
      const form = [0, 0]
      r.beats.forEach((beat, i) => {
        if (beat.type === 'shift') form[beat.side] = beat.form
        // Les coups de la barde (dé de la paire) n'ont pas de compétence du dé : voir « deux dés »
        if (beat.type !== 'attack' || beat.attack.preset) return
        // Les étapes qui suivent le coup, jusqu'au prochain coup (vol de vie, compétences, réactions)
        const after: typeof r.beats = []
        for (const next of r.beats.slice(i + 1)) {
          if (next.type !== 'event' && next.type !== 'statusReaction') break
          after.push(next)
        }
        // Les coups bruts de la Furie des vents (0.69.0) non plus : un 1, un 2 ou un 3 y frappe pour sa valeur
        if (beat.attack.plain) {
          expect(beat.attack.forfeited).toBe(false)
          expect(after.some((b) => b.type === 'event' && b.event.side === beat.attack.attacker)).toBe(false)
          return
        }
        const alive = beat.state.hp[1 - beat.attack.attacker] > 0
        // Un attaquant tué par une réaction au coup (Riposte) avant sa compétence ne la déclenche pas
        const firstEvent = after.findIndex((b) => b.type === 'event')
        const killedFirst = after
          .slice(0, firstEvent < 0 ? after.length : firstEvent)
          .some((b) => b.type === 'statusReaction' && b.state.hp[beat.attack.attacker] === 0)
        // Pourfendre (0.70.0) : une compétence `needsTouch` ne part que si son coup touche, et son jet n'est pas sacrifié
        const side = beat.attack.attacker
        const own = r.fighters[side].events.filter((e) => !e.form || e.form === r.fighters[side].forms?.[form[side]].id)
        const touchOnly = (roll: number) => own.some((e) => e.needsTouch && rollMatches(e.trigger, roll, beat.attack.faces))
        for (const [trigger, roll] of [['naturalOne', 1], ['naturalTwo', 2]] as const) {
          const fired = after.some((b) => b.type === 'event' && b.event.trigger === trigger)
          const exists = own.some((e) => e.trigger === trigger)
          expect(fired).toBe(exists && beat.attack.roll === roll && alive && !killedFirst && !(touchOnly(roll) && beat.attack.dodged))
        }
        // Un jet qui déclenche une compétence du dé (1, 2 ou 3) n'inflige aucun dégât (0.27.0), sauf si elle accompagne
        // le coup (Pourfendre) ; l'ours du druide (0.73.0) n'a aucun sort : ses 1, 2 et 3 frappent
        expect(beat.attack.forfeited).toBe(own.some((e) => e.forfeitsHit && rollMatches(e.trigger, beat.attack.roll, beat.attack.faces)))
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
      testCharacter('b', { maxHp: 40, damageDie: 1, critChance: 0 }),
    ])
    expect(r.winner).toBe(1)
    expect(r.beats[r.beats.length - 1]).toMatchObject({ type: 'statusReaction', status: 'bleed', side: 0 })
  })

  it('Saignement (0.68.0) : chaque coup qui touche retire ses charges en ignorant l’armure, puis la plaie perd une charge', () => {
    const bleed: CharacterEvent = { id: 's', name: 's', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'bleed', stacks: 3 }] }
    const r = run([testCharacter('a', { maxHp: 60, armor: 5, dodgeChance: 0 }, [bleed]), testCharacter('b', { maxHp: 200, damageDie: 1, critChance: 0 })])
    const flows = ofType(r, 'statusReaction').filter((b) => b.status === 'bleed')
    // 3, 2 puis 1 PV, sur les trois premiers coups de b ; l'armure de 5 n'y change rien
    expect(flows.map((b) => b.effects[0])).toEqual([3, 2, 1].map((amount) => ({ type: 'damage', target: 0, amount })))
    expect(flows.map((b) => b.state.statuses[0].find((s) => s.id === 'bleed')?.stacks ?? 0)).toEqual([2, 1, 0])
    // Chaque écoulement suit un coup de b qui touche
    for (const flow of flows) expect(r.beats[r.beats.indexOf(flow) - 1]).toMatchObject({ type: 'attack', attack: { attacker: 1, dodged: false } })
    // Une esquive ne rouvre pas la plaie : elle reste entière
    const dodging = run([testCharacter('a', { maxHp: 60, dodgeChance: 1 }, [bleed]), testCharacter('b', { maxHp: 30, damageDie: 1, critChance: 0 })])
    expect(ofType(dodging, 'statusReaction').some((b) => b.status === 'bleed')).toBe(false)
    expect(finalState(dodging).statuses[0]).toContainEqual({ id: 'bleed', stacks: 3 })
  })

  it('Saignement (2026-10-21, règle 9) : la plaie ouverte par un coup ne coule pas sur ce coup, elle coule dès le coup suivant, de ses charges du début du coup', () => {
    // b pose Saignement 2 à chaque coup qui touche (fenêtre `hit`) ; la fenêtre `hurt` de a vient après
    const cut: CharacterEvent = { id: 'cut', name: 'cut', trigger: 'hit', effects: [{ type: 'applyStatus', status: 'bleed', stacks: 2, target: 'opponent' }] }
    const r = run([testCharacter('a', { maxHp: 200, dodgeChance: 0 }), testCharacter('b', { maxHp: 200, damageDie: 1, critChance: 0 }, [cut])])
    const hits = r.beats.flatMap((b, i) => (b.type === 'attack' && b.attack.attacker === 1 && !b.attack.dodged ? [i] : []))
    const flowOf = (hit: number) => r.beats.find((b) => b.cause === hit && b.type === 'statusReaction' && b.status === 'bleed')
    const bleedAfter = (hit: number) => r.beats.filter((b) => b.cause === hit).at(-1)!.state.statuses[0].find((s) => s.id === 'bleed')?.stacks
    // Le premier coup ouvre la plaie (2) : elle ne coule pas sur ce coup
    expect(flowOf(hits[0])).toBeUndefined()
    expect(bleedAfter(hits[0])).toBe(2)
    // Le deuxième la grossit (2 + 2 = 4) et la fait couler de ses charges du début du coup : 2 PV, puis 3 charges
    const second = flowOf(hits[1])
    expect(second?.type === 'statusReaction' && second.effects).toEqual([{ type: 'damage', target: 0, amount: 2 }])
    expect(second!.state.statuses[0]).toContainEqual({ id: 'bleed', stacks: 3 })
    // Le troisième : 3 au début, 5 après la pose, 3 PV, puis 4
    const third = flowOf(hits[2])
    expect(third?.type === 'statusReaction' && third.effects).toEqual([{ type: 'damage', target: 0, amount: 3 }])
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

  it('Vol de vie (0.45.0) : le 2 ne fait aucun dégât et pose 2 charges ; chaque coup qui touche en use une et rend les PV retirés', () => {
    let drains = 0
    for (const r of duelsOf('ervald')) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'attack') return
        const a = beat.attack
        const owner = r.fighters[a.attacker]
        if (!owner.events.some((e) => e.id === 'life-steal')) return
        if (a.roll === 2) {
          expect(a).toMatchObject({ forfeited: true, damage: 0, dealt: 0, dodged: false, crit: false })
          // La compétence suit et ajoute 2 charges, plafonnées à 2
          if (beat.state.hp[1 - a.attacker] > 0) {
            const next = r.beats[i + 1]
            expect(next.type === 'event' && next.event.eventId === 'life-steal').toBe(true)
            expect(next.state.statuses[a.attacker].find((s) => s.id === 'lifesteal')?.stacks).toBe(2)
          }
          return
        }
        const charges = (st: readonly { id: string; stacks: number }[]) => st.find((s) => s.id === 'lifesteal')?.stacks ?? 0
        const was = charges(before(r, i).statuses[a.attacker])
        const held = was > 0
        // Esquivé : une charge perdue sans soin ; jet de compétence (1, 3) : aucun coup porté, les charges restent
        if (held && a.dodged) expect(charges(beat.state.statuses[a.attacker])).toBe(was - 1)
        if (held && a.forfeited) expect(charges(beat.state.statuses[a.attacker])).toBe(was)
        const next = r.beats[i + 1]
        const reacted = next?.type === 'statusReaction' && next.status === 'lifesteal'
        expect(reacted).toBe(held && !a.dodged && !a.forfeited && beat.state.hp[1 - a.attacker] > 0)
        if (reacted && next.effects[0].type === 'heal') {
          drains++
          expect(next.effects[0].amount).toBe(Math.min(a.dealt, owner.maxHp - beat.state.hp[a.attacker]))
          expect(charges(next.state.statuses[a.attacker])).toBe(was - 1)
        }
      })
    }
    expect(drains).toBeGreaterThan(0)
  })

  it('Furie des vents (0.69.0) : sur un 2, deux coups bruts tout de suite, sans compétence ni Furie en chaîne', () => {
    let bursts = 0
    let low = 0
    for (const r of duelsOf('gorak')) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'event' || beat.event.eventId !== 'wind-fury') return
        const side = beat.event.side
        // Le 2 qui l'a déclenchée ne frappe pas, et ce n'est jamais un coup de Furie
        const trigger = r.beats.slice(0, i).reverse().find((b) => b.type === 'attack')
        if (trigger?.type === 'attack') expect(trigger.attack).toMatchObject({ roll: 2, forfeited: true })
        if (trigger?.type === 'attack') expect(trigger.attack.plain).toBeUndefined()
        if (beat.state.hp.some((h) => h === 0)) return
        // La rafale suit dans le même tour, avec deux coups au dé du porteur
        const k = r.beats.findIndex((b, j) => j > i && b.type === 'flurry' && b.side === side)
        const burst = r.beats[k]
        const purged = r.beats.slice(i + 1, k < 0 ? undefined : k).some((b) => b.type === 'event' && b.event.side !== side)
        if (purged || !burst) return
        expect(burst.turn).toBe(beat.turn)
        if (burst.type === 'flurry') expect(burst.faces).toEqual([r.fighters[side].stats.damageDie, r.fighters[side].stats.damageDie])
        // Deux coups bruts : un 1, un 2 ou un 3 frappe pour sa valeur, et aucune compétence ne suit
        const strikes = r.beats.slice(k + 1).filter((b) => b.turn === beat.turn && b.type === 'attack')
        for (const s of strikes) {
          if (s.type !== 'attack') continue
          expect(s.attack).toMatchObject({ plain: true, forfeited: false })
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
        if (a.forfeited) return
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
        if (!held || a.dodged || a.forfeited || beat.state.hp[defender] === 0) return
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
    // a fait toujours 1 et se pose une Brûlure d'un tour (décomptée en fin de tour) à chaque coup (0.50.0 :
    // la Furie des vents, instantanée, ne sert plus d'exemple)
    const burn: CharacterEvent = {
      id: 'f',
      name: 'f',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'burn', stacks: 1, turns: 1 }],
    }
    const r = run([testCharacter('a', { maxHp: 60 }, [burn]), testCharacter('b', { maxHp: 60 })])
    const posed = ofType(r, 'event').filter((b) => b.event.side === 0)
    expect(posed.length).toBeGreaterThan(2)
    for (const p of posed) {
      // À la fin du tour de la pose, la Brûlure est toujours là, avec son tour entier
      const end = r.beats.filter((b) => b.turn === p.turn).at(-1)!
      if (end.state.hp.some((h) => h === 0)) continue
      expect(end.state.statuses[0].find((x) => x.id === 'burn')?.turns).toBe(1)
    }
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
    const auras: StatusId[] = ['frostAura', 'powerAura', 'intimidationAura', 'precisionAura', 'holyAura', 'decoctionAura', 'immunityAura', 'wildAura']
    for (const r of rosterCombats(5)) {
      const threes = r.beats.filter((b) => b.type === 'event' && b.event.trigger === 'naturalThree')
      for (const b of threes) {
        if (b.type !== 'event') continue
        // Exception (0.35.0) : l'ogre n'a pas d'aura (il attend). Le druide en a une par forme depuis la 0.71.0
        if (b.event.eventId === 'waiting-3') continue
        // L'aura du 3 (le paladin purge d'abord ses malus, puis pose son aura)
        expect(b.event.effects.some((e) => e.type === 'applyStatus' && auras.includes(e.status))).toBe(true)
      }
      for (const b of ofType(r, 'statusAge')) expect(b.expired.some((s) => auras.includes(s))).toBe(false)
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

  it('Pile ou face (2026-10-21) : la pièce part aussitôt, juste après le jet qui la pose ; pile, ses dégâts directs ; face, rien ; le statut est consommé', () => {
    const damage = STATUSES.coinFlip.coinToss!.damage
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
      // Jamais gardée : aucun coup ne part pendant qu'une pièce attend
      r.beats.forEach((b, i) => {
        if (b.type === 'attack') expect(has(before(r, i).statuses[0], 'coinFlip')).toBe(false)
      })
      for (const c of ofType(r, 'coin')) {
        const k = r.beats.indexOf(c)
        expect(c.side).toBe(0)
        expect(has(c.state.statuses[0], 'coinFlip')).toBe(false)
        // Juste derrière la compétence qui la pose, elle-même juste derrière le coup du 1, dans le même tour
        const skill = r.beats[k - 1]
        const strike = r.beats[k - 2]
        expect(skill.type === 'event' && skill.event.side === 0 && skill.turn === c.turn).toBe(true)
        expect(strike.type === 'attack' && strike.attack.attacker === 0 && strike.attack.roll === 1 && strike.turn === c.turn).toBe(true)
        if (c.heads) {
          heads++
          expect(c.effects).toEqual([{ type: 'damage', target: 1, amount: damage }])
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
            at('naturalOne', [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }]),
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
    for (const r of rosterCombats(4))
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

  it('Aura d’immunité (0.42.0) : tant qu’elle est là, l’armure du porteur gagne 1', () => {
    const paladin = createCharacter('aldric')
    expect(effectiveStats(paladin, [{ id: 'immunityAura', stacks: 1 }]).armor).toBe(paladin.stats.armor + 1)
    expect(paladin.events.map((e) => e.id)).toContain('immunity-aura')
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
        expect(beat.effects).toEqual([{ type: 'damage', target: beat.side, amount: Math.min(was.stacks, atStart) }])
        expect(beat.state.statuses[beat.side].find((s) => s.id === 'bleed')?.stacks ?? 0).toBe(was.stacks - 1)
        flows++
      })
    expect(flows).toBeGreaterThan(50)
  })

  it('Pourfendre (Gorak, 0.70.0) : le 1 frappe ; s’il touche, Saignement 2, qui ne coule pas sur ce coup mais dès le coup suivant (règle 9)', () => {
    let cuts = 0
    let dodged = 0
    for (const r of rosterCombats(4))
      r.beats.forEach((beat, i) => {
        // Les coups bruts de la Furie des vents (0.69.0) ne déclenchent aucune compétence de jet
        if (beat.type !== 'attack' || beat.attack.plain || beat.attack.roll !== 1 || r.fighters[beat.attack.attacker].id !== 'gorak') return
        expect(beat.attack.forfeited).toBe(false)
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
        expect(cleave?.type === 'event' && cleave.event.effects).toEqual([expect.objectContaining({ type: 'applyStatus', status: 'bleed', stacks: 2, target })])
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

  it("Coup de chance : à l'action suivante, un d6 par charge en plus du dé habituel, chacun joué comme un coup à part", () => {
    let volleys = 0
    for (const r of rosterCombats(4)) {
      for (const f of ofType(r, 'flurry')) {
        if (f.status !== 'luckyStrike') continue
        volleys++
        const own = r.fighters[f.side].stats.damageDie
        // Cumulable (0.50.0) : un d6 par charge, toutes à la fois
        const stacks = r.beats[r.beats.indexOf(f) - 1].state.statuses[f.side].find((x) => x.id === 'luckyStrike')!.stacks
        const dice = [own, ...Array(stacks).fill(6)]
        expect(f.faces).toEqual(dice)
        const strikes = attacksOf(r).filter((x) => x.attacker === f.side && x.turn === f.turn)
        if (f.turn < r.turns) expect(strikes.map((x) => x.faces)).toEqual(dice)
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

  it('0.73.0 : l’homme ne lance que des sorts (d3), l’ours ne fait que frapper (Force de l’ours), chacun avec son statut de forme', () => {
    const human = ['thunderbolt', 'firefly', 'wild-aura']
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
          // Chaque jet de l'homme est un sort : un d3, un coup sacrifié, et la compétence suit
          expect(a).toMatchObject({ faces: 3, forfeited: true })
          if (b.state.hp[1] > 0) expect(r.beats[i + 1]).toMatchObject({ type: 'event', event: { side: 0 } })
          spells++
        } else {
          // L'ours n'a aucun sort : son 1, son 2 ou son 3 frappe aussi, avec sa Force de l'ours
          expect(a.faces).toBe(10)
          expect(a.forfeited).toBe(false)
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
    const burn: CharacterEvent = { id: 'wisps', name: 'wisps', trigger: 'naturalThree', form: 'human', forfeitsHit: true, effects: [{ type: 'applyStatus', status: 'burn', stacks: 3, turns: 3, target: 'opponent' }] }
    expect(validateRoster([{ ...druid, events: [burn] }])).toEqual(['thaldrin : wisps : burn dure autant de tours que de charges, sans durée en plus'])
  })

  it('0.76.0 : la Foudre tombe en trois coups de 2 avec son événement de scène, et les statuts de forme ne se purgent pas', () => {
    const bolt = createCharacter('thaldrin').events.find((e) => e.id === 'thunderbolt')!
    expect(bolt).toMatchObject({ scene: 'lightning', effects: [{ type: 'damage', amount: 2, hits: 3, target: 'opponent' }] })
    let bolts = 0
    for (let seed = 1; seed < 40; seed++)
      for (const b of ofType(duelOf('thaldrin', 'brokk', seed), 'event').filter((x) => x.event.eventId === 'thunderbolt')) {
        expect(b.event.effects).toEqual([{ type: 'damage', target: 1, amount: 6, parts: [2, 2, 2] }])
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
    const r = run([testCharacter('a', {}, bark), testCharacter('b', { damageDie: 1, critChance: 1, critMultiplier: 6 })])
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
    expect(validateRelics([relic({ trigger: { type: 'strike', on: 'hit' }, effects: [{ type: 'damage', amount: 2, target: 'opponent' }] })])).toEqual([])
  })

  it('caractéristique : les stats s’ajoutent à plat, la base reste connue, une stat peut passer sous 0', () => {
    const c = createCharacter('morgrut').withRelics([getRelic('mercenary-mail'), getRelic('lead-pommel')])
    expect(c.stats).toMatchObject({ armor: c.baseStats.armor + 2, damageDie: c.baseStats.damageDie + 2 })
    // Morgrut n'a pas d'esquive : la cotte l'affiche à −8 % (« c'est marrant »), il n'esquive simplement jamais
    expect(c.stats.dodgeChance).toBeCloseTo(-0.08)
    expect(effectiveStats(c, []).dodgeChance).toBe(0)
    // La cotte retient 2 de chaque coup : un coup de 1 tombe au plancher
    const r = run([testCharacter('a', { maxHp: 10 }), testCharacter('b', { maxHp: 10 }).withRelics([getRelic('mercenary-mail')])])
    for (const a of attacksOf(r).filter((x) => x.attacker === 0)) expect(a).toMatchObject({ armor: 2, damage: 1, floored: true })
  })

  it('coup : un bonus ajouté à chaque coup qui touche, avant le critique, sans changer le jet', () => {
    const sharp = relic({ rollBonus: 1 })
    const one: CharacterEvent = { id: 'one', name: 'Sur un 1', trigger: 'naturalOne', effects: [{ type: 'heal', amount: 1 }] }
    const r = run([testCharacter('a', { critChance: 1 }, [one]).withRelics([sharp]), testCharacter('b', { maxHp: 40 })])
    const mine = attacksOf(r).filter((a) => a.attacker === 0)
    // Jet de 1, +1, ×2 du critique : 4 ; le 1 naturel déclenche toujours sa compétence
    for (const a of mine) expect(a).toMatchObject({ roll: 1, crit: true, raw: 4, relicBonus: [{ relic: 'test-relic', amount: 1 }] })
    // (sauf sur le coup qui met K.O. : le combat s'arrête avant la compétence)
    expect(ofType(r, 'event').filter((b) => b.event.side === 0)).toHaveLength(mine.length - (r.winner === 0 ? 1 : 0))
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
        if (!a.dodged && !a.forfeited) expect(!!a.relicBonus, `jet ${a.roll}${a.plain ? ' brut' : ''}`).toBe(a.roll === 4)
        if (a.plain && a.roll === 4 && !a.dodged) plainFours++
        if (!a.plain || a.roll !== 1 || b.state.hp.includes(0)) return
        // Un 1 brut éveille l'Osselet dans les fenêtres de ce coup, mais aucune compétence (pas de coup sacrifié)
        expect(a.forfeited).toBe(false)
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
        if (b.type !== 'attack' || b.attack.attacker !== 0 || !b.attack.preset) return
        if (!b.attack.dodged) expect(!!b.attack.relicBonus).toBe(b.attack.roll === 4)
        if (b.attack.roll !== 1 || b.state.hp.includes(0)) return
        // L'Osselet part dans les fenêtres de ce coup, avant le coup suivant
        const next = r.beats.slice(i + 1).findIndex((x) => x.type === 'attack' || x.type === 'pair')
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
      testCharacter('b', { maxHp: 20, damageDie: 1 }).withRelics([tear]),
      testCharacter('a', { maxHp: 50, damageDie: 1, critChance: 1, critMultiplier: 15 }).withRelics([trophy]),
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
    const rain = relic({ element: 'fire', scene: 'emberRain', trigger: { type: 'turn', turn: 1 }, effects: [{ type: 'damage', amount: 2, hits: 2, target: 'opponent' }] })
    expect(validateRelics([rain])).toEqual(['test-relic : scène à 3 impacts pour 2 coups'])
    expect(validateRelics([{ ...rain, effects: [{ type: 'damage', amount: 2, hits: 3, target: 'opponent' }] }])).toEqual([])
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
    const ko = run([testCharacter('a', { maxHp: 20 }).withRelics([draught]), testCharacter('b', { maxHp: 200, damageDie: 1, critChance: 1, critMultiplier: 30 })])
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
    const mirror = relic({ trigger: { type: 'strike', on: 'dodge' }, cooldown: 2, effects: [{ type: 'damage', amount: 1, target: 'opponent' }] })
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
      testCharacter('a', { maxHp: 200, damageDie: 6 }, [ev('combatStart', [{ type: 'applyStatus', status: 'decoctionAura', stacks: 1 }])]),
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

  it('Pourfendre (Gorak, needsTouch) : la compétence a pour cause le coup du 1 qui touche', () => {
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

  it('double (Fanchon) : sa compétence et ses coups ont la paire pour cause ; sans double, les deux coups aussi', () => {
    let doubles = 0
    let pairs = 0
    for (const r of rosterCombats(4))
      for (const p of ofType(r, 'pair')) {
        pairs++
        const caused = r.beats.filter((b) => b.cause === p.id)
        const strikes = caused.filter((b) => b.type === 'attack')
        if (p.double !== undefined) {
          doubles++
          expect(caused[0]).toMatchObject({ type: 'event', event: { side: p.side } })
        } else if (p.turn < r.turns) expect(strikes).toHaveLength(2)
        for (const s of strikes) expect(s.type === 'attack' && s.attack.preset).toBe(true)
      }
    expect(pairs).toBeGreaterThan(50)
    expect(doubles).toBeGreaterThan(5)
  })

  it('rafale : chaque coup a la rafale pour cause ; des coups instantanés ont pour cause ce qui a posé leur charge', () => {
    let volleys = 0
    let bursts = 0
    for (const r of rosterCombats(4))
      for (const f of ofType(r, 'flurry')) {
        const strikes = r.beats.filter((b) => b.type === 'attack' && b.cause === f.id)
        if (f.turn < r.turns) expect(strikes).toHaveLength(f.strikes)
        if (STATUSES[f.status].instantStrikes) {
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
  const release = ev('naturalMax', [{ type: 'release', status: 'retribution', min: 1, target: 'opponent' }], 'rel')
  const reactionTo = (r: CombatResult, cause: number, status: StatusId) =>
    r.beats.find((b): b is Extract<Beat, { type: 'statusReaction' }> => b.cause === cause && b.type === 'statusReaction' && b.status === status)

  it('pile (Pile ou face) : Vol de vie, Riposte et jauges de Rétribution réagissent comme à un coup qui touche', () => {
    // a touche toujours (dé 1) ; chaque coup qui touche lui donne une charge de Vol de vie et une pièce
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
      const r = run([testCharacter('a', { maxHp: 400 }, [thief]), testCharacter('b', { maxHp: 400, damageDie: 2 }, paladin)], seed)
      for (const coin of ofType(r, 'coin')) {
        if (!coin.heads || coin.state.hp.includes(0)) continue
        const drain = reactionTo(r, coin.id, 'lifesteal')
        expect(drain?.trigger).toBe('hit')
        const missing = r.fighters[0].maxHp - r.beats[drain!.id - 1].state.hp[0]
        expect(drain!.effects).toEqual([{ type: 'heal', target: 0, amount: Math.min(10, missing) }])
        drained++
        if (stacksOf(coin.state.statuses[1], 'riposte') > 0) {
          const back = reactionTo(r, coin.id, 'riposte')
          expect(back?.trigger).toBe('hurt')
          expect(back!.effects).toEqual([{ type: 'damage', target: 0, amount: 5 }])
          riposted++
        }
        const gauge = reactionTo(r, coin.id, 'retribution')
        expect(gauge).toMatchObject({ trigger: 'hurt', effects: [] })
        expect(gauge!.state.statuses[1].find((s) => s.id === 'retribution')?.slots?.at(-1)).toBe(10)
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
            b.id > hit.id && b.type === 'attack' && b.attack.attacker === 1 && !b.attack.dodged && !b.attack.forfeited && !b.attack.plain,
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

  it('un mécanisme n’est bloqué ni par l’immunité ni par la garde, et ne compte pas comme malus reçu', () => {
    const r = run([
      testCharacter('a', { maxHp: 40 }, [
        ev('combatStart', [
          { type: 'applyStatus', status: 'immunityAura', stacks: 1 },
          { type: 'applyStatus', status: 'ward', stacks: 1 },
        ]),
        ev('hit', [{ type: 'applyStatus', status: 'waiting', stacks: 1, turns: 1 }]),
      ]),
      testCharacter('b', { maxHp: 40 }),
    ])
    const posed = ofType(r, 'event').flatMap((b) => b.event.effects.filter((e) => e.type === 'applyStatus' && e.status === 'waiting'))
    expect(posed.length).toBeGreaterThan(0)
    for (const e of posed) expect(e).toMatchObject({ result: { kind: 'applied' } })
    // La garde n'a rien bloqué, donc rien usé
    expect(finalState(r).statuses[0].find((s) => s.id === 'ward')?.stacks).toBe(1)
    expect(computeStats(r)[0].debuffsTaken).toBe(0)
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

  it('gravure au-delà du 3 : part exactement sur sa face, sacrifie le coup si la compétence le sacrifie, jamais sur un coup brut', () => {
    const gorak = createCharacter('gorak').withForge([{ op: 'engrave', face: 7, skill: skill('fear') }])
    let sevens = 0
    let plainSevens = 0
    for (let seed = 0; seed < 80; seed++) {
      const r = simulateCombat([gorak, createCharacter('brokk')], { seed })
      // Chaque Peur a pour cause un coup de Gorak dont le dé fait 7, jamais un coup brut
      for (const b of ofType(r, 'event').filter((x) => x.event.eventId === 'fear')) {
        const cause = causeOf(r, b)
        expect(b.event.trigger).toBe(faceTrigger(7))
        expect(cause?.type === 'attack' && cause.attack.attacker === 0 && cause.attack.roll === 7 && !cause.attack.plain).toBe(true)
      }
      for (const b of ofType(r, 'attack')) {
        const a = b.attack
        if (a.attacker !== 0 || a.roll !== 7) continue
        if (a.plain) {
          plainSevens++
          expect(a.forfeited).toBe(false)
          expect(r.beats.some((x) => x.type === 'event' && x.cause === b.id)).toBe(false)
          continue
        }
        sevens++
        expect(a.forfeited).toBe(true)
        if (b.state.hp.every((h) => h > 0)) expect(r.beats.some((x) => x.type === 'event' && x.event.eventId === 'fear' && x.cause === b.id)).toBe(true)
      }
    }
    expect(sevens).toBeGreaterThan(0)
    expect(plainSevens).toBeGreaterThan(0)
  })

  it('dorure : +2 au coup qui touche quand le dé fait sa face, avant le critique, coup brut compris (2026-10-23)', () => {
    // Dé à 1 face doré, critique assuré ×2 : (1 + 2) × 2 = 6
    const r = run([testCharacter('a', { critChance: 1 }).withForge([{ op: 'gild', face: 1 }]), testCharacter('b', { maxHp: 40 })])
    for (const a of attacksOf(r).filter((x) => x.attacker === 0)) expect(a).toMatchObject({ roll: 1, gild: GILD_BONUS, crit: true, raw: 6 })
    let eights = 0
    let plainEights = 0
    for (let seed = 0; seed < 60; seed++) {
      const g = simulateCombat([createCharacter('gorak').withForge([{ op: 'gild', face: 8 }]), createCharacter('brokk')], { seed })
      for (const a of attacksOf(g).filter((x) => x.attacker === 0 && !x.dodged && !x.forfeited)) {
        expect(a.gild ?? 0, `jet ${a.roll}${a.plain ? ' brut' : ''}`).toBe(a.roll === 8 ? GILD_BONUS : 0)
        if (a.roll === 8) a.plain ? plainEights++ : eights++
      }
    }
    expect(eights).toBeGreaterThan(0)
    expect(plainEights).toBeGreaterThan(0)
  })

  it('graver et dorer : seulement une face libre ; une gravure qui sacrifie le coup ne se dore pas', () => {
    const ervald = def('ervald')
    // Faces d'origine (1 à 3) : ni gravure ni dorure
    expect(valid(ervald, [{ op: 'gild', face: 2 }])).toBe(false)
    expect(valid(ervald, [{ op: 'engrave', face: 3, skill: skill('cleave') }])).toBe(false)
    // Hors du dé : refusé
    expect(valid(ervald, [{ op: 'gild', face: 11 }])).toBe(false)
    // Une face gravée ne se regrave pas ; une compétence ne se grave qu'une fois, jamais une des siennes
    expect(valid(ervald, [{ op: 'engrave', face: 5, skill: skill('cleave') }, { op: 'engrave', face: 5, skill: skill('fear') }])).toBe(false)
    expect(valid(ervald, [{ op: 'engrave', face: 5, skill: skill('cleave') }, { op: 'engrave', face: 6, skill: skill('cleave') }])).toBe(false)
    expect(valid(ervald, [{ op: 'engrave', face: 5, skill: skill('grave-breath') }])).toBe(false)
    // Pourfendre frappe : sa face se dore ; la Peur sacrifie le coup : sa face ne se dore pas
    expect(valid(ervald, [{ op: 'engrave', face: 5, skill: skill('cleave') }, { op: 'gild', face: 5 }])).toBe(true)
    expect(valid(ervald, [{ op: 'engrave', face: 6, skill: skill('fear') }, { op: 'gild', face: 6 }])).toBe(false)
    expect(() => createCharacter('ervald').withForge([{ op: 'gild', face: 2 }])).toThrow()
  })

  it('retailler : enlève la face du haut avec sa gravure, sa dorure et son rang ; jamais une compétence d’origine', () => {
    const ervald = def('ervald')
    const steps: ForgeStep[] = [{ op: 'engrave', face: 10, skill: skill('cleave') }, { op: 'gild', face: 10 }, { op: 'sharpen', face: 10 }, { op: 'trim' }]
    const state = forgeState(ervald, steps)
    expect(state.size).toBe(9)
    expect([...state.engraved.keys(), ...state.gilded.keys(), ...state.ranks.keys()]).toEqual([])
    const trimmed = createCharacter('ervald').withForge(steps)
    expect(trimmed.baseStats.damageDie).toBe(9)
    expect(trimmed.gilded).toEqual({})
    expect(trimmed.events.map((e) => e.id)).toEqual(def('ervald').events.map((e) => e.id))
    // Agrandir après : les faces 10 et 11 reviennent libres, Pourfendre se grave à nouveau, sans son ancien rang
    const regrown = [...steps, { op: 'enlarge' } as const, { op: 'engrave', face: 11, skill: skill('cleave') } as const]
    expect(offerTargets(ervald, regrown.slice(0, -1), { op: 'engrave', skill: skill('cleave') })).toEqual([4, 5, 6, 7, 8, 9, 10, 11])
    const faces = forgedFaces(ervald, regrown)
    expect(faces).toHaveLength(11)
    expect(faces[10]).toMatchObject({ engraved: { id: 'cleave', trigger: faceTrigger(11) }, gild: 0, rank: 0 })
    expect(faces[9]).toMatchObject({ gild: 0, rank: 0 })
    expect(faces[9].engraved).toBeUndefined()
    // Sous la taille d'origine, jusqu'à la dernière face libre : Gorak (compétences sur 1 à 3) descend à un d3, pas plus bas
    const gorak = def('gorak')
    const trims = Array.from({ length: 6 }, () => ({ op: 'trim' }) as const)
    expect(forgeState(gorak, trims).size).toBe(3)
    expect(() => forgeState(gorak, [...trims, { op: 'trim' }])).toThrow()
    // Les faces d'Attente de l'ogre portent une compétence d'origine : elles ne se retaillent pas non plus
    expect(valid(def('morgrut'), Array.from({ length: 12 }, () => ({ op: 'trim' }) as const))).toBe(false)
    expect(valid(def('morgrut'), Array.from({ length: 11 }, () => ({ op: 'trim' }) as const))).toBe(true)
    // Jamais sous une face
    expect(valid(testCharacter('a').definition, [{ op: 'trim' }])).toBe(false)
  })

  it('ogre : une gravure sur une face d’Attente la remplace (le 1 frappe et pourfend, plus d’Attente sur le 1)', () => {
    const morgrut = createCharacter('morgrut').withForge([{ op: 'engrave', face: 1, skill: skill('cleave') }])
    expect(morgrut.events.map((e) => e.id)).toEqual(['waiting-2', 'waiting-3', 'cleave'])
    expect(morgrut.events.find((e) => e.id === 'cleave')?.trigger).toBe('naturalOne')
    expect(forgedFaces(morgrut.definition, morgrut.forge)[0]).toMatchObject({ idle: false, engraved: { id: 'cleave' } })
    let ones = 0
    for (let seed = 0; seed < 60; seed++) {
      const r = simulateCombat([morgrut, createCharacter('ysolde')], { seed })
      expect(ofType(r, 'event').some((b) => b.event.eventId === 'waiting-1')).toBe(false)
      for (const b of ofType(r, 'attack').filter((x) => x.attack.attacker === 0 && x.attack.roll === 1)) {
        expect(b.attack.forfeited).toBe(false)
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

  it('deux dés : la gravure vise un double au-delà de 5 (après Agrandir), sans forme du dé simple ; la dorure vaut pour chaque dé', () => {
    const fanchon = def('fanchon')
    expect(offerTargets(fanchon, [], { op: 'engrave', skill: skill('fear') })).toEqual([])
    expect(offerTargets(fanchon, [{ op: 'enlarge' }], { op: 'engrave', skill: skill('fear') })).toEqual([6, 7])
    const bard = createCharacter('fanchon').withForge([{ op: 'enlarge' }, { op: 'engrave', face: 6, skill: skill('fear') }, { op: 'gild', face: 7 }])
    const fear = bard.events.find((e) => e.id === 'fear')!
    expect(fear.trigger).toBe(doubleTrigger(6))
    expect([fear.forfeitsHit, fear.needsTouch, fear.chance]).toEqual([undefined, undefined, undefined])
    expect(createCharacter('fanchon').withForge([{ op: 'enlarge' }, { op: 'engrave', face: 6, skill: skill('cleave') }]).events.find((e) => e.id === 'cleave')?.needsTouch).toBeUndefined()
    let doubles = 0
    let gilded = 0
    for (let seed = 0; seed < 150; seed++) {
      const r = simulateCombat([bard, createCharacter('morgrut')], { seed })
      for (const p of ofType(r, 'pair').filter((x) => x.side === 0)) {
        const strikes = r.beats.filter((x) => x.type === 'attack' && x.cause === p.id)
        if (p.rolls[0] === 6 && p.rolls[1] === 6) {
          // Le double 6 lance la Peur à la place des deux coups
          expect(p.double).toBe(6)
          expect(r.beats[p.id + 1]).toMatchObject({ type: 'event', event: { eventId: 'fear', trigger: doubleTrigger(6) } })
          expect(strikes).toEqual([])
          doubles++
        }
      }
      for (const a of attacksOf(r).filter((x) => x.attacker === 0 && x.preset && !x.dodged)) {
        expect(a.gild ?? 0).toBe(a.roll === 7 ? GILD_BONUS : 0)
        if (a.gild) gilded++
      }
    }
    expect(doubles).toBeGreaterThan(0)
    expect(gilded).toBeGreaterThan(0)
  })

  it('aiguiser : un rang de plus (charges sous le plafond, +2 soin, dégâts et libération, +1 coup de volée)', () => {
    const sharp = (id: string, steps: ForgeStep[], skillId: string) => createCharacter(id).withForge(steps).events.find((e) => e.id === skillId)!
    const once = sharp('gorak', [{ op: 'sharpen', face: 1 }], 'cleave')
    const twice = sharp('gorak', [{ op: 'sharpen', face: 1 }, { op: 'sharpen', face: 1 }], 'cleave')
    expect(once.name).toBe('Pourfendre II')
    expect(twice.name).toBe('Pourfendre III')
    expect([once.effects[0], twice.effects[0]]).toMatchObject([{ stacks: 3 }, { stacks: 4 }])
    // Seules les compétences de la face aiguisée changent
    expect(createCharacter('gorak').withForge([{ op: 'sharpen', face: 1 }]).events.filter((e) => e.id !== 'cleave')).toEqual(def('gorak').events.filter((e) => e.id !== 'cleave'))
    expect(sharp('thaldrin', [{ op: 'sharpen', face: 1 }], 'thunderbolt').effects[0]).toMatchObject({ type: 'damage', amount: 4 })
    expect(sharp('aldric', [{ op: 'sharpen', face: 1 }], 'retribution').effects[0]).toMatchObject({ type: 'release', min: 3 })
    expect(sharp('fanchon', [{ op: 'sharpen', face: 1 }], 'whistle').volley).toBe(3)
    // Une gravure s'aiguise sur sa face
    expect(sharp('ervald', [{ op: 'engrave', face: 5, skill: skill('cleave') }, { op: 'sharpen', face: 5 }], 'cleave').effects[0]).toMatchObject({ stacks: 3 })
    // Rien à gagner (statut qui ne cumule pas, statut au plafond) : la face n'est pas proposée, l'opération est refusée
    expect(offerTargets(def('ysolde'), [], { op: 'sharpen' })).not.toContain(1)
    expect(offerTargets(def('ervald'), [], { op: 'sharpen' })).not.toContain(2)
    expect(valid(def('aldric'), [{ op: 'sharpen', face: 2 }])).toBe(false)
    expect(valid(def('gorak'), [{ op: 'sharpen', face: 5 }])).toBe(false)
    // L'Aura de sainteté (plafond 3) monte à 3 en deux rangs, puis sa face n'est plus proposée
    const holy: ForgeStep[] = [{ op: 'sharpen', face: 3 }, { op: 'sharpen', face: 3 }]
    expect(sharp('ysolde', holy, 'holy-aura').effects[0]).toMatchObject({ stacks: STATUSES.holyAura.maxStacks })
    expect(offerTargets(def('ysolde'), holy, { op: 'sharpen' })).not.toContain(3)
    expect(() => forgeState(def('ysolde'), [...holy, { op: 'sharpen', face: 3 }])).toThrow()
  })

  it('offre : des opérations différentes, toutes jouables ; le choix automatique est toujours valide', () => {
    for (const id of CHARACTER_IDS) {
      const base = def(id)
      const rng = seededRng(id.length * 31)
      let steps: ForgeStep[] = []
      for (let k = 0; k < 8; k++) {
        const offer = drawForgeOffer(base, steps, rng, ENGRAVABLE_SKILLS)
        expect(offer.length).toBeLessThanOrEqual(FORGE_OFFER_SIZE)
        expect(new Set(offer.map((o) => o.op)).size).toBe(offer.length)
        for (const o of offer) {
          const targets = offerTargets(base, steps, o)
          if (o.op === 'enlarge' || o.op === 'trim') expect(valid(base, [...steps, stepOf(o)]), `${id} ${o.op}`).toBe(true)
          else {
            expect(targets.length, `${id} ${o.op}`).toBeGreaterThan(0)
            for (const face of targets) expect(valid(base, [...steps, stepOf(o, face)]), `${id} ${o.op} ${face}`).toBe(true)
          }
        }
        const step = autoForge(base, steps, offer, rng)
        if (!step) break
        steps = withForgeStep(base, steps, step)
        expect(createCharacter(id).withForge(steps).baseStats.damageDie).toBe(forgeState(base, steps).size)
      }
      expect(steps.length).toBeGreaterThan(0)
    }
    expect(() => withForgeStep(def('gorak'), [], { op: 'gild', face: 1 })).toThrow()
  })

  it('trace : l’en-tête de forge se relit et rejoue le combat à l’identique', () => {
    const left = createCharacter('gorak').withForge([{ op: 'engrave', face: 7, skill: skill('fear') }, { op: 'gild', face: 8 }, { op: 'enlarge' }, { op: 'sharpen', face: 1 }])
    const right = createCharacter('morgrut').withForge([{ op: 'engrave', face: 1, skill: skill('cleave') }, { op: 'trim' }])
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
