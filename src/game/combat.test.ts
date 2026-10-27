import { describe, expect, it } from 'vitest'
import { attacksOf, diceOf, dieAt, effectiveStats, finalState, firstSide, HEADS_CAP, MAX_TURNS, rollsDie, simulateCombat, splitAmong, type Beat, type CombatResult, type Pair } from './combat'
import { describeSkill, DIE_FACES, faceTrigger, isRollTrigger, relationOf, rollFace, rollMatches, type CharacterEvent } from './events'
import { autoForge, copyDestinations, drawForgeOffer, FORGE_OFFER_SIZE, forgedFaces, forgeState, GILD_BONUS, offerTargets, rankText, sharpen, stepKey, stepLabel, stepOf, TEMPER_BONUS, withForgeStep, writtenFace, type ForgeBase, type ForgeStep } from './forge'
import { seededRng } from './rng'
import { CHARACTER_IDS, CHARACTERS, createCharacter, ENGRAVABLE_SKILLS, ROSTER, validateRoster } from './roster'
import { aurasOf, characterPool, MASTERIES, MASTERY_IDS, masteryOfSkill, poolOf, validateMasteries } from './masteries'
import { skillById } from './skills'
import { computeStats } from './stats'
import { applyStatus, BEAR_MIGHT, COIN_HEADS, DECOCTION_POISON, hurtsEachTurn, LUCKY_COIN_POWER, PRECISION_CRIT, STATUSES, stacksOf, WILD_AURA_ATTACK, type Status, type StatusId } from './statuses'
import { EMOJI, oldDie, onOldDie, testCharacter } from './test-utils'
import { Character, type CharacterStats } from './character'
import { describeRelic, getRelic, RELIC_IDS, relicKind, RELICS, validateRelics, type Relic } from './relics'
import { typeset } from './typography'
import { parseForcedRolls, parseForge, parseRelics, traceText } from './trace'
import { buildHooks, echoOf, eventHooks, linkBetween, reachOf, relicHooks, relicNeeds, skillNeeds } from './hooks'
import { SCENE_EVENTS } from './scenes'
import { offerableSkills } from './offers'

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

// Les dés de la 0.120.0 (`DIE_0120`, `oldDie`, `onOldDie`) : test-utils.ts

/** Les duels de `id` contre tout le roster, de chaque côté, sur plusieurs graines, tous sur leur dé de la 0.120.0 (`onOldDie`). */
function* oldDuels(id: string, perPair: number) {
  let seed = 1000
  for (const b of CHARACTER_IDS)
    for (let k = 0; k < perPair; k++) {
      yield simulateCombat([oldDie(id), onOldDie(b)], { rng: seededRng(seed++) })
      yield simulateCombat([onOldDie(b), oldDie(id)], { rng: seededRng(seed++) })
    }
}

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
            // Le Poing de pierre (`whileShielded`) n'agit que si l'attaquant a une armure temporaire
            const armored = prev[a.attacker].some((s) => STATUSES[s.id].shield)
            for (const s of prev[a.attacker]) if (!STATUSES[s.id].whileShielded || armored) raw = STATUSES[s.id].modifyOutgoing?.(raw, s) ?? raw
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
  it('Critique assuré (B8, 2026-10-27) : une seule charge, qui ne se cumule pas ; la prochaine frappe est critique et la dépense', () => {
    const r = withStart([
      { type: 'applyStatus', status: 'guaranteedCrit', stacks: 3 },
      { type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 },
    ])
    const start = ofType(r, 'event').find((b) => b.event.eventId === 'start')!
    expect(stacksOf(start.state.statuses[0], 'guaranteedCrit')).toBe(1)
    const mine = ofType(r, 'attack').filter((b) => b.attack.attacker === 0)
    expect(mine[0].attack).toMatchObject({ crit: true, critForced: true, critBy: 'guaranteedCrit' })
    expect(stacksOf(mine[0].state.statuses[0], 'guaranteedCrit')).toBe(0)
    expect(mine[1].attack).toMatchObject({ critForced: false })
    // Plus d'usure par tour : aucune étape d'usure ne le nomme
    expect(ofType(r, 'statusAge').some((b) => b.expired.includes('guaranteedCrit'))).toBe(false)
  })

  it('Critique assuré : un coup esquivé le perd', () => {
    const r = run([
      testCharacter('a', { maxHp: 400 }, [{ id: 's', name: 's', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }] }]),
      testCharacter('b', { maxHp: 400, dodgeChance: 1 }),
    ])
    const first = ofType(r, 'attack').find((b) => b.attack.attacker === 0)!
    expect(first.attack).toMatchObject({ dodged: true, crit: false, critForced: true, critBy: 'guaranteedCrit', damage: 0 })
    expect(stacksOf(first.state.statuses[0], 'guaranteedCrit')).toBe(0)
    expect(traceText(r)).toContain('Critique assuré perdu')
  })

  it('Critique assuré : il attend la prochaine frappe sans s’user, d’un tour à l’autre ; son intensité s’ajoute au coup critique', () => {
    // Posé pendant le tour de l'adversaire (comme la Rancune, la Feinte) : la frappe suivante du porteur est critique
    const grudge: CharacterEvent = { id: 'g', name: 'g', trigger: 'hurt', limit: 1, effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }] }
    const g = run([testCharacter('a', { maxHp: 400 }, [grudge]), testCharacter('b', { maxHp: 400 })])
    const got = ofType(g, 'event').find((b) => b.event.eventId === 'g')!
    const next = ofType(g, 'attack').find((b) => b.attack.attacker === 0 && b.id > got.id)!
    expect(next.attack).toMatchObject({ crit: true, critForced: true })
    // Intensité (Œil de faucon aiguisé, Pièce porte-bonheur) : +3 après le multiplicateur, avant l'armure
    const r = withStart([{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1, power: 3 }])
    const a = attacksOf(r).find((x) => x.attacker === 0)!
    expect(a).toMatchObject({ crit: true, critForced: true })
    expect(a.raw).toBe(Math.round(a.value * a.critMultiplier) + 3)
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
  /** Duels du roster où `id` est impliqué, côté gauche puis droit, tous sur leur dé de la 0.120.0 (`onOldDie`). */
  function* duelsOf(id: string, perPair = 25) {
    let seed = 5000
    const me = onOldDie(id)
    for (const opp of CHARACTER_IDS)
      for (let k = 0; k < perPair; k++) {
        const pair: Pair<Character> = k % 2 ? [me, onOldDie(opp)] : [onOldDie(opp), me]
        yield simulateCombat(pair, { rng: seededRng(seed++) })
      }
  }
  const before = (r: CombatResult, i: number) =>
    i > 0 ? r.beats[i - 1].state : { hp: [r.fighters[0].maxHp, r.fighters[1].maxHp], statuses: [[], []] }
  const has = (list: readonly { id: string }[], id: string) => list.some((s) => s.id === id)

  it('Vol de vie (0.45.0, greffé en phase 5 bis) : sur le 2 (le 1 jusqu’à la 0.112.0), pose 1 charge (2 au plus, 0.107.0) avant le coup de base, qui draine déjà ; chaque coup qui touche en use une et rend les PV retirés, +2 (revue P3)', () => {
    let drains = 0
    let grafted = 0
    for (const r of duelsOf('ervald')) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'attack') return
        const a = beat.attack
        const owner = r.fighters[a.attacker]
        if (!owner.events.some((e) => e.id === 'life-steal')) return
        const charges = (st: readonly { id: string; stacks: number }[]) => st.find((s) => s.id === 'lifesteal')?.stacks ?? 0
        if (a.roll === 2 && !a.plain) {
          // Greffé : le dé, la compétence (1 charge, plafonnée à 2), puis le coup de base au même dé
          const skill = r.beats[i - 1]
          expect(skill.type === 'event' && skill.event.eventId === 'life-steal').toBe(true)
          expect(charges(skill.state.statuses[a.attacker])).toBe(Math.min(2, charges(r.beats[i - 2].state.statuses[a.attacker]) + 1))
          expect(r.beats[i - 2]).toMatchObject({ type: 'roll', roll: 2 })
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
          // Revue des compétences (P3) : des PV de plus dès le rang I, l'intensité que la compétence pose (+4 depuis le
          // réglage des Maîtrises, 2026-10-27 ; +2 avant)
          const more = before(r, i).statuses[a.attacker].find((s) => s.id === 'lifesteal')?.power ?? 0
          expect(more).toBe(4)
          expect(next.effects[0].amount).toBe(Math.min(a.dealt + more, owner.maxHp - beat.state.hp[a.attacker]))
          expect(charges(next.state.statuses[a.attacker])).toBe(was - 1)
        }
      })
    }
    expect(drains).toBeGreaterThan(0)
    expect(grafted).toBeGreaterThan(0)
  })

  it('Furie des vents (0.69.0, remplace en phase 5 bis) : sur un 1 (le 2 jusqu’à la 0.112.0), pas de coup de base, mais deux coups bruts tout de suite, sans compétence ni Furie en chaîne', () => {
    let bursts = 0
    let low = 0
    for (const r of duelsOf('gorak')) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'event' || beat.event.eventId !== 'wind-fury') return
        const side = beat.event.side
        // Le 1 qui l'a déclenchée est un jet remplacé (aucun coup), et ce n'est jamais un coup de Furie
        const trigger = r.beats.slice(0, i).reverse().find((b) => b.type === 'attack')
        if (trigger?.type === 'attack') expect(trigger.attack).toMatchObject({ roll: 1, replaced: true, value: 0, damage: 0, dodged: false, crit: false })
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

  it('Esquive améliorée (2026-10-25, 0.117.1) : non cumulable, une charge au plus ; une nouvelle pose garde la plus forte intensité', () => {
    const evade: CharacterEvent['effects'] = [{ type: 'applyStatus', status: 'evasion', stacks: 1 }]
    const r = run([
      testCharacter('a', { maxHp: 200 }),
      testCharacter('b', { maxHp: 200 }, [
        { id: 'e1', name: 'e1', trigger: 'combatStart', effects: evade },
        { id: 'e2', name: 'e2', trigger: 'combatStart', effects: evade },
      ]),
    ])
    // Deux poses à l'ouverture : une seule charge (du 2026-10-21 à la 0.117.0 : deux, cumulées)
    const posed = ofType(r, 'event').filter((e) => e.event.side === 1)
    expect(stacksOf(posed.at(-1)!.state.statuses[1], 'evasion')).toBe(1)
    // Le premier coup de a est esquivé à coup sûr et use la charge ; le deuxième touche
    const hits = ofType(r, 'attack').filter((b) => b.attack.attacker === 0)
    expect(hits.slice(0, 2).map((b) => [b.attack.dodgeForced, b.attack.dodged])).toEqual([
      [true, true],
      [false, false],
    ])
    expect(stacksOf(hits[0].state.statuses[1], 'evasion')).toBe(0)
    // Esquive aiguisée puis reposée sans intensité (Plume d'aigle, Dé creux) : la charge reste une, l'intensité la plus forte
    expect(applyStatus([{ id: 'evasion', stacks: 1, power: 2 }], { id: 'evasion', stacks: 1 })).toEqual([{ id: 'evasion', stacks: 1, power: 2 }])
    expect(applyStatus([{ id: 'evasion', stacks: 1 }], { id: 'evasion', stacks: 2, power: 1 })).toEqual([{ id: 'evasion', stacks: 1, power: 1 }])
  })

  it('Esquive améliorée aiguisée (0.117.1) : son intensité ajoute des dégâts aux coups du porteur tant qu’il attend l’esquive', () => {
    const r = run([
      testCharacter('a', { maxHp: 200, attackMin: 4, attackMax: 4 }, [{ id: 'e', name: 'e', trigger: 'naturalTwo', effects: [{ type: 'applyStatus', status: 'evasion', stacks: 1, power: 3 }] }]),
      testCharacter('b', { maxHp: 200 }),
    ])
    let boosted = 0
    r.beats.forEach((beat, i) => {
      if (beat.type !== 'attack' || beat.attack.attacker !== 0 || beat.attack.dodged || beat.attack.replaced) return
      const held = has(before(r, i).statuses[0], 'evasion')
      const evasion = beat.attack.modifiers.filter((m) => m.status === 'evasion')
      expect(evasion).toEqual(held ? [{ status: 'evasion', by: 'attacker', delta: 3 }] : [])
      if (held) boosted++
    })
    // Greffée sur le 2, elle compte dès le coup de son propre jet
    expect(boosted).toBeGreaterThan(2)
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

  it('Aura de puissance : cumulable à 3 charges depuis la revue A4, +2, +3 puis +4, avant l’armure', () => {
    // Chaque dé fait 1 : l'aura se greffe et compte dès le coup du jet ; reposée à chaque jet, elle monte d'une charge
    const r = runOn(1, [testCharacter('a', { maxHp: 80 }, [at('naturalOne', 'powerAura')]), testCharacter('b', { maxHp: 80, armor: 1 })])
    const mine = attacksOf(r).filter((x) => x.attacker === 0)
    expect(mine.length).toBeGreaterThan(3)
    // 1 + 2, 1 + 3, puis 1 + 4 à chaque coup ; l'armure retire 1
    mine.forEach((x, k) => expect(x).toMatchObject({ raw: 2 + Math.min(k + 1, 3), damage: 1 + Math.min(k + 1, 3) }))
    expect(finalState(r).statuses[0].find((s) => s.id === 'powerAura')?.stacks).toBe(3)
    expect(describeSkill(ENGRAVABLE_SKILLS.find((e) => e.id === 'power-aura')!).text).toBe('+2 dégâts à chacun de ses coups.')
  })

  it("Aura d'intimidation : −1 par charge (0.107.0) sur les coups de l'adversaire, avant l'armure, cumulable, combinée à la puissance", () => {
    const r = runOn(1, [
      testCharacter('a', { maxHp: 80, attackMin: 6, attackMax: 6 }, [at('combatStart', 'powerAura')]),
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

  it('Purification (0.113.0, décision de l’utilisateur) : plus d’effet sur soi ; ses malus restent à Ysolde', () => {
    const purification = createCharacter('ysolde').events.find((e) => e.id === 'purification')!
    expect(purification.effects).toHaveLength(1)
    expect(purification.effects[0]).toMatchObject({ type: 'cleanse', polarity: 'positive', target: 'opponent' })
    let kept = 0
    for (const r of rosterCombats(8))
      r.beats.forEach((b, i) => {
        if (b.type !== 'event' || b.event.eventId !== 'purification' || b.state.hp.some((h) => h === 0)) return
        const side = b.event.side
        // Un seul effet joué, sur l'adversaire : un bonus retiré, ou la lumière
        expect(b.event.effects).toHaveLength(1)
        const maluses = r.beats[i - 1].state.statuses[side].filter((s) => STATUSES[s.id].polarity === 'negative').map((s) => s.id)
        for (const id of maluses) expect(b.state.statuses[side].some((s) => s.id === id), id).toBe(true)
        if (maluses.length) kept++
      })
    expect(kept).toBeGreaterThan(10)
  })

  it('Aura d’immunité (0.42.0) : tant qu’elle est là, l’armure du porteur gagne 1 ; une aura de la Lumière (B1)', () => {
    const paladin = createCharacter('aldric')
    expect(effectiveStats(paladin, [{ id: 'immunityAura', stacks: 1 }]).armor).toBe(paladin.stats.armor + 1)
    expect(masteryOfSkill('immunity-aura')).toBe('light')
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

  it('Pourfendre (Gorak, modifie) : le 2 frappe (le 1 jusqu’à la 0.112.0) ; s’il touche, Saignement de la moitié des PV retirés, arrondie au-dessus (0.107.0), qui ne coule pas sur ce coup mais dès le coup suivant (règle 9)', () => {
    let cuts = 0
    let dodged = 0
    for (const r of oldDuels('gorak', 4))
      r.beats.forEach((beat, i) => {
        // Les coups bruts de la Furie des vents (0.69.0) ne déclenchent aucune compétence de jet
        if (beat.type !== 'attack' || beat.attack.plain || beat.attack.roll !== 2 || r.fighters[beat.attack.attacker].id !== 'gorak') return
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
    const riposteEvent = skillById('riposte')
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
  // Elaria plutôt que Gorak depuis la 0.113.0 : sa Furie, sur le 1, lance deux dés d'une étape, et le rang d'un dé imposé
  // (compté en dés) ne serait plus celui de l'étape
  const pair = (): Pair<Character> => [createCharacter('elaria'), createCharacter('naraxes')]

  it("avant le dé imposé, le combat est identique à l'original ; ce dé prend la valeur demandée", () => {
    const original = simulateCombat(pair(), { seed: 42 })
    // Le cinquième dé de la graine 42 est la pièce de Naraxes : le sixième est un d6
    const rank = 5
    const target = original.beats.filter(rollsDie)[rank]
    const at = original.beats.indexOf(target)
    const cheated = simulateCombat(pair(), { seed: 42, forcedRolls: { [rank]: 3 } })
    expect(cheated.beats.slice(0, at)).toEqual(original.beats.slice(0, at))
    const forced = cheated.beats.filter(rollsDie)[rank]
    // Le dé d'un coup, ou celui d'un jet greffé (étape `roll`)
    expect(forced.type === 'attack' ? forced.attack : forced).toMatchObject({ roll: 3, forced: true })
    expect(cheated.forcedRolls).toEqual({ [rank]: 3 })
    expect(original.forcedRolls).toBeUndefined()
  })

  it('une valeur hors du dé est ramenée à ses bornes ; la pièce suit 1 = pile, 2 = face', () => {
    const r = simulateCombat(pair(), { seed: 3, forcedRolls: { 0: 99 } })
    const first = r.beats.filter(rollsDie)[0]
    expect(first.type === 'attack' ? first.attack.roll : first.type === 'roll' && first.roll).toBe(DIE_FACES)
    // Une pièce : Naraxes la lance quand son 2 touche ; on cherche une graine où elle tombe
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
    // nouveau, et ainsi de suite. Le hasard (0) laisse le dé tiré ; rafale (le Duo de la barde) et pièce compris.
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
  // Sur leur dé de la 0.120.0 (`oldDie`) : les sorts du druide sur le 1 et le 2, la Furie de Gorak sur le 1
  const pick = onOldDie
  const duelOf = (a: string, b: string, seed: number) => simulateCombat([pick(a), pick(b)], { seed })
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

  it('l’homme lance ses sorts sur leurs faces (Feux follets sur le 1, Foudre sur le 2, 0.113.0), greffés sur son coup ; ses autres faces frappent ; l’ours n’a aucun sort et frappe avec sa Force de l’ours, chacun avec son statut de forme', () => {
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
        if (form === 0 && a.roll <= 2) {
          // Un jet de l'homme sur une face à sort est un sort greffé : le dé, le sort de sa face, puis son coup de base
          expect(a).toMatchObject({ faces: 6, preset: true, replaced: false })
          expect(r.beats[i - 1]).toMatchObject({ type: 'event', event: { side: 0, eventId: a.roll === 1 ? 'firefly' : 'thunderbolt' } })
          expect(r.beats[i - 2]).toMatchObject({ type: 'roll', side: 0, roll: a.roll })
          spells++
        } else if (form === 0) {
          // Une face nue : le coup de base seul
          expect(a).toMatchObject({ faces: 6, replaced: false })
          expect(a.preset).toBeUndefined()
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
    const burn: CharacterEvent = { id: 'wisps', name: 'wisps', trigger: 'naturalThree', form: 'human', effects: [{ type: 'applyStatus', status: 'burn', stacks: 3, turns: 3, target: 'opponent' }], rankAxis: { kind: 'stacks', per: 1 } }
    expect(validateRoster([{ ...druid, signature: undefined, events: [burn] }])).toContain('thaldrin : wisps : burn dure autant de tours que de charges, sans durée en plus')
  })

  it('0.76.0 : la Foudre tombe en quatre coups (trois jusqu’à la revue O3) avec son événement de scène, et les statuts de forme ne se purgent pas', () => {
    const bolt = skillById('thunderbolt')
    const strike = bolt.effects[0]
    expect(bolt).toMatchObject({ scene: 'lightning', effects: [{ type: 'damage', hits: 4, target: 'opponent' }] })
    // Un éclair par impact de sa scène ; le texte dit la perte et les éclairs, pas le calcul (revue T5)
    expect(SCENE_EVENTS.lightning.impacts).toHaveLength(4)
    expect(describeSkill(bolt).text).toBe("L'adversaire perd 4 PV, en quatre éclairs.")
    expect(rankText(bolt)).toBe('+1 à chacun des 4 éclairs')
    const amount = strike.type === 'damage' ? strike.amount : 0
    let bolts = 0
    for (let seed = 1; seed < 40; seed++)
      for (const b of ofType(duelOf('thaldrin', 'brokk', seed), 'event').filter((x) => x.event.eventId === 'thunderbolt')) {
        expect(b.event.effects).toEqual([{ type: 'damage', target: 1, amount: 4 * amount, source: 'lightning', parts: [amount, amount, amount, amount] }])
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

  it('Pourriture : posée par chaque critique sous Aura de pourriture (Maîtrises, 2026-10-27), elle ne s’estompe jamais', () => {
    const aura = [{ id: 'r', name: 'r', trigger: 'combatStart' as const, effects: [{ type: 'applyStatus' as const, status: 'rotAura' as const, stacks: 2 }] }]
    const r = run([testCharacter('a', { maxHp: 200, critChance: 1 }, aura), testCharacter('b', { maxHp: 200 })])
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
    // Les douze de la 0.77.0, trois par type, puis les quatre à scène de la 0.85.0, puis le lot des consommateurs
    // (PROGRESSION.md § 13.3), cinq reliques de coup, puis les trois reliques de durée (phase 7), puis les quatre du second
    // lot de la phase 8 (trois de coup sur un moment, une de coup à conditions). Les types restent internes : le joueur ne
    // les voit pas (2026-10-24)
    const consumers = ['venom-vial', 'butcher-hook', 'abbey-incense', 'dented-shield', 'eagle-feather']
    const durability = ['quilted-gambison', 'bonesetter-salve', 'vigil-candle']
    const lot2 = ['forge-bellows', 'pavise-nails', 'talion-gauntlet', 'holed-coin']
    // Les reliques de source (2026-10-25) : deux de coup sur un 6, une de tour (la Pièce de foire, retirée le 2026-10-27)
    const sources = ['wasp-sting', 'tinder-box', 'spiked-bracer']
    // Retour du 2026-10-27 : le sursis (seuil), l'initiative (tour), la chance de pile (caractéristique)
    const r27 = ['reprieve-medal', 'vanguard-horn', 'weighted-coin']
    const plain = RELICS.filter((r) => !r.scene && ![...consumers, ...durability, ...lot2, ...sources, ...r27].includes(r.id))
    expect(plain).toHaveLength(12)
    for (const kind of ['stat', 'strike', 'turn', 'threshold']) expect(plain.filter((r) => relicKind(r) === kind), kind).toHaveLength(3)
    expect(consumers.map((id) => relicKind(getRelic(id)))).toEqual(['strike', 'strike', 'strike', 'strike', 'strike'])
    expect(durability.map((id) => relicKind(getRelic(id)))).toEqual(['stat', 'strike', 'turn'])
    expect(lot2.map((id) => relicKind(getRelic(id)))).toEqual(['strike', 'strike', 'strike', 'strike'])
    expect(sources.map((id) => relicKind(getRelic(id)))).toEqual(['strike', 'strike', 'turn'])
    expect(r27.map((id) => relicKind(getRelic(id)))).toEqual(['threshold', 'turn', 'stat'])
    // Une pièce est une compétence, jamais une relique (M10) ; sursis et initiative, sans effet ; une chance de pile bornée
    expect(validateRelics([relic({ trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }] })])).toEqual([
      'test-relic : une relique ne lance pas de pièce : coinFlip',
    ])
    expect(validateRelics([relic({ trigger: { type: 'lethal' }, charges: 1, effects: [{ type: 'heal', amount: 1 }] })])).toHaveLength(1)
    expect(validateRelics([relic({ trigger: { type: 'lethal' } })])).toEqual(['test-relic : sursis : une charge'])
    expect(validateRelics([relic({ trigger: { type: 'initiative' }, charges: 1 })])).toEqual(['test-relic : initiative : sans limite'])
    expect(validateRelics([relic({ headsChance: 0.6 })])).toHaveLength(1)
    expect(validateRelics([relic({ headsChance: 0.25, stats: { armor: 1 } })])).toHaveLength(1)
    expect(validateRelics([relic({ stats: { armor: 1 }, rollBonus: 1 })])).toHaveLength(1)
    expect(validateRelics([relic({ trigger: { type: 'turn', turn: 0 }, effects: [{ type: 'heal', amount: 1 }] })])).toHaveLength(1)
    expect(validateRelics([relic({ trigger: { type: 'hpBelow', ratio: 1.2 }, effects: [{ type: 'heal', amount: 1 }] })])).toHaveLength(1)
    expect(validateRelics([relic({ stats: { armor: 1 }, onFace: 4 })])).toHaveLength(1)
    // Une seule limite (2026-10-24, retour de l'utilisateur sur la Géode fendue) : des charges, ou une recharge
    const both = relic({ trigger: { type: 'strike', on: 'hurt' }, charges: 2, cooldown: 3, effects: [{ type: 'heal', amount: 1 }] })
    expect(validateRelics([both])).toEqual(['test-relic : une seule limite : des charges ou une recharge'])
    expect(RELICS.filter((r) => r.charges !== undefined && r.cooldown !== undefined)).toEqual([])
    // Règle 7 (décision de l'utilisateur) : vers l'adversaire, seulement des dégâts directs ; jamais de malus
    const stun = relic({ trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'stunned', stacks: 1, target: 'opponent' }] })
    expect(validateRelics([stun])).toHaveLength(2)
    expect(validateRelics([relic({ trigger: { type: 'strike', on: 'hit' }, effects: [{ type: 'damage', amount: 2, target: 'opponent', source: 'strike' }] })])).toEqual([])
    // Exception des reliques de source (2026-10-25) : le Poison et la Brûlure seuls ; un autre malus reste refusé
    const bleed = relic({ trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'bleed', stacks: 2, target: 'opponent' }] })
    expect(validateRelics([bleed])).toHaveLength(2)
    const poison = relic({ trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, target: 'opponent' }] })
    expect(validateRelics([poison])).toEqual([])
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

  it('rafale du Duo : chaque dé se lit seul (un 1 de Fanchon éveille l’Osselet, le bonus du 4 va au coup du 4)', () => {
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
    // L'actif d'abord (0.110.0, § 5 règle 1) : le Trophée de l'attaquant part avant la Larme du défenseur
    const r = run([
      testCharacter('b', { maxHp: 20 }).withRelics([tear]),
      testCharacter('a', { maxHp: 50, critChance: 1, critMultiplier: 15 }).withRelics([trophy]),
    ])
    const fires = ofType(r, 'relic')
    expect(fires.slice(0, 2).map((b) => b.relic)).toEqual(['test-trophy', 'test-tear'])
    expect(fires[1].state.hp[0]).toBe(10)
    // Les deux ont pour cause le coup qui a fait passer les seuils
    expect(fires[0].cause).toBe(fires[1].cause)
    expect(r.beats[fires[0].cause!].type).toBe('attack')
  })

  it('reliques à scène : des impacts pour chaque coup, le moteur ne lit pas la scène', () => {
    const staged = RELICS.filter((r) => r.scene)
    expect(staged.map((r) => r.id).sort()).toEqual(['caged-ember', 'frost-tear', 'split-geode', 'wind-conch'])
    // Validation : scène sans déclencheur, impacts qui ne comptent pas les coups
    expect(validateRelics([relic({ scene: 'emberRain', stats: { armor: 1 } })])).toHaveLength(1)
    const rain = relic({ scene: 'emberRain', trigger: { type: 'turn', turn: 1 }, effects: [{ type: 'damage', amount: 2, hits: 2, target: 'opponent', source: 'fire' }] })
    expect(validateRelics([rain])).toEqual(['test-relic : scène à 3 impacts pour 2 coups'])
    expect(validateRelics([{ ...rain, effects: [{ type: 'damage', amount: 2, hits: 3, target: 'opponent', source: 'fire' }] }])).toEqual([])
    // Présentation seulement : la même relique sans sa scène donne exactement le même combat
    for (const r of staged)
      for (const seed of [1, 2, 3]) {
        const fight = (x: Relic) => simulateCombat([createCharacter('elaria').withRelics([x]), createCharacter('gorak')], { seed })
        const { scene: _s, ...bare } = r
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
    expect(describeRelic(getRelic('wolf-fang')).text).toMatch(/, 1x$/)
  })

  it('Dent de loup (0.110.0) : Vol de vie déjà à son plafond, elle ne part pas et ne s’use pas ; elle part dès qu’elle ajoute', () => {
    // a commence avec Vol de vie 2 (son plafond) ; b le fait passer sous 40 % dès l'ouverture
    const r = run([
      testCharacter('a', { maxHp: 20 }, [{ id: 'drain', name: 'drain', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'lifesteal', stacks: 2 }] }]).withRelics([getRelic('wolf-fang')]),
      testCharacter('b', { maxHp: 200 }, [{ id: 'cut', name: 'cut', trigger: 'combatStart', effects: [{ type: 'damage', amount: 15, target: 'opponent', source: 'strike' }] }]),
    ])
    const fires = ofType(r, 'relic')
    expect(fires).toHaveLength(1)
    // Pas à l'ouverture : après le premier coup de a qui a usé une charge de Vol de vie
    const firstHit = r.beats.findIndex((b) => b.type === 'attack' && b.attack.attacker === 0)
    expect(fires[0].id).toBeGreaterThan(firstHit)
    expect(fires[0].uses).toBe(1)
    expect(fires[0].effects).toEqual([expect.objectContaining({ type: 'applyStatus', status: 'lifesteal', result: expect.objectContaining({ kind: 'applied', stacks: 1 }) })])
  })

  it('dégâts finaux (0.110.0) : la Fausse note se retire après l’armure, puis un seul plancher', () => {
    const note: CharacterEvent['effects'][number] = { type: 'applyStatus', status: 'falseNote', stacks: 1 }
    const r = run([testCharacter('a', { maxHp: 60, attackMin: 3, attackMax: 3 }, [{ id: 's', name: 's', trigger: 'combatStart', effects: [note] }]), testCharacter('b', { maxHp: 60 })])
    const first = attacksOf(r).find((a) => a.attacker === 0)!
    // 3 − 5 = −2, plancher : 1 ; l'écart montré est celui qui a réellement compté
    expect(first.damage).toBe(1)
    expect(first.floored).toBe(true)
    const finals = first.modifiers.filter((m) => m.final)
    expect(first.damage).toBe(3 + finals.reduce((t, m) => t + m.delta, 0))
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

  it('durée (phase 7) : +15 PV max dès le départ, un soin par coup encaissé, un bouclier tous les 3 tours', () => {
    // Gambison matelassé : les PV max montent, l'attaque baisse de 1 au minimum comme au maximum ; le combat part des PV max
    const gorak = createCharacter('gorak')
    const padded = gorak.withRelics([getRelic('quilted-gambison')])
    expect(padded.stats).toMatchObject({ maxHp: gorak.baseStats.maxHp + 15, attackMin: gorak.baseStats.attackMin - 1, attackMax: gorak.baseStats.attackMax - 1 })
    const worn = simulateCombat([padded, createCharacter('brokk')], { seed: 1 })
    expect(Math.max(...worn.beats.map((b) => b.state.hp[0]))).toBeGreaterThan(gorak.baseStats.maxHp)
    // Onguent du rebouteux : +3 PV juste après un coup encaissé qui touche, deux fois au plus (M11, 2026-10-27 ; +1 PV, 5x
    // avant) ; un soin à PV pleins ne part pas, un soin près du plafond s'arrête au plafond
    let full = 0
    for (let seed = 0; seed < 20; seed++) {
      const r = simulateCombat([createCharacter('aldric').withRelics([getRelic('bonesetter-salve')]), createCharacter('gorak')], { seed })
      const fires = ofType(r, 'relic')
      expect(fires.length).toBeLessThanOrEqual(2)
      if (fires.length === 2) full++
      for (const b of fires) {
        expect(b.effects).toEqual([expect.objectContaining({ type: 'heal' })])
        const healed = b.effects[0].type === 'heal' ? b.effects[0].amount : 0
        expect(healed === 3 || b.state.hp[0] === r.fighters[0].maxHp).toBe(true)
        const hit = r.beats[b.cause!]
        expect(hit.type === 'attack' || hit.type === 'coin').toBe(true)
        if (hit.type === 'attack') expect(hit.attack).toMatchObject({ attacker: 1, dodged: false })
      }
    }
    expect(full).toBeGreaterThan(0)
    // Chandelle de veille : +2 Armure temporaire au début de ses 3e, 6e, 9e tours
    const lit = run([testCharacter('a', { maxHp: 60 }).withRelics([getRelic('vigil-candle')]), testCharacter('b', { maxHp: 60 })])
    const fires = ofType(lit, 'relic')
    expect(fires.slice(0, 3).map((b) => ownTurn(lit, 0, b.turn))).toEqual([3, 6, 9])
    for (const b of fires) expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', status: 'bonusArmor', stacks: 2 })])
  })
})

describe('le lot des consommateurs (PROGRESSION.md § 13.3)', () => {
  const relic = (r: Partial<Relic>): Relic => ({ id: 'test-relic', name: 'Relique de test', flavor: 'Test.', ...r })
  const start = (effects: CharacterEvent['effects']): CharacterEvent => ({ id: 'start', name: 'Départ', trigger: 'combatStart', effects })

  it('une ligne chacune, au style de l’utilisateur (2026-10-24) : l’effet, la condition en clair, une seule limite ; ni type ni élément', () => {
    const lines = RELICS.map((r) => describeRelic(r).text)
    // Écrites avec des espaces simples ; la ligne affichée a l'espace insécable devant « % » (`typeset`, passe compendium)
    expect(lines).toEqual(
      [
      '+1 au multiplicateur de critique et −4 % de critique',
      "+6 % d'esquive",
      // M12 (2026-10-27) : l'armure dit ce qu'elle fait, à chaque coup reçu (pas un bouclier qui revient)
      "+1 armure (−1 dégât par coup reçu) et −5 % d'esquive",
      '3 dégâts directs sur un 1',
      '+1 esquive améliorée sur un 6, recharge 3 tours',
      '+4 dégâts sur un 4',
      '+1 critique assuré au 1er tour',
      'Retire son dernier malus (sinon +3 PV) tous les 3 tours',
      '+1 critique assuré au 6e tour, puis tous les 4 tours',
      '+1 vol de vie quand ses PV passent sous 40 %, 1x',
      "+2 aura d'épines quand ses PV passent sous 50 %, 1x",
      "+1 critique assuré quand les PV de l'adversaire passent sous 30 %, 1x",
      '3 × 2 dégâts directs au 4e tour',
      'Retire tous ses malus et +5 PV quand ses PV passent sous 35 %, 1x',
      "3 × 2 dégâts directs à l'attaquant lors d'une esquive, 2x",
      // Les trois exemples de l'utilisateur, mot pour mot
      "+4 armure temporaire lors d'un coup reçu, 2x",
      '+2 dégâts aux adversaires empoisonnés',
      '+2 dégâts aux adversaires qui saignent',
      '+1 ferveur à chaque soin reçu',
      "+2 armure temporaire lors d'un coup reçu de 6 dégâts ou plus",
      "+1 esquive améliorée lors d'un coup critique, recharge 2 tours",
      // Les reliques de durée (phase 7)
      "+15 PV max et −1 à l'attaque",
      "+3 PV lors d'un coup reçu, 2x",
      '+2 armure temporaire tous les 3 tours',
      // Phase 8, second lot
      '+3 dégâts aux adversaires qui brûlent',
      // Contre l'armure de l'attaquant (2026-10-27, M4) : plus des dégâts directs
      "3 dégâts contre l'armure de l'attaquant quand son armure temporaire est vidée",
      '+1 PV quand il renvoie des dégâts',
      // Le pluriel d'un statut qui se compte (passe compendium, 2026-10-25) ; « lancer de pièce gagnant », la phrase de
      // l'utilisateur (2026-10-27)
      '+2 coups de chance à chaque lancer de pièce gagnant',
      // Les reliques de source (2026-10-25)
      "2 poison à l'adversaire sur un 6",
      "2 brûlure à l'adversaire sur un 6",
      '+1 riposte au 1er tour',
      // Retour du 2026-10-27 : la Pièce de foire retirée ; le sursis, l'initiative, la chance de pile
      'Reste à 1 PV quand il devrait tomber, 1x',
      "Joue le premier tour sans jet d'initiative",
      '+25 % de chances de faire pile',
      ].map(typeset),
    )
    for (const line of lines) {
      expect(line).not.toMatch(EMOJI)
      expect(line).not.toMatch(/Caractéristique|Coup|Tour|Seuil|[ée]l[ée]mentaire|Feu|Givre|Vent|Terre|\b(DP|DM|DT)\b/)
    }
    // Des conditions sur un bonus de coup, oui ; sur des stats, non ; « ce coup retire N PV », seulement sur un coup qui touche
    const big = { type: 'hitAtLeast' as const, amount: 6 }
    expect(validateRelics([relic({ stats: { armor: 1 }, when: [{ type: 'fromTurn', turn: 2 }] })])).toHaveLength(1)
    expect(validateRelics([relic({ rollBonus: 2, when: [big] })])).toHaveLength(1)
    expect(validateRelics([relic({ trigger: { type: 'strike', on: 'dodge' }, when: [big], effects: [{ type: 'heal', amount: 1 }] })])).toHaveLength(1)
    expect(validateRelics([relic({ trigger: { type: 'strike', on: 'hit' }, when: [big], effects: [{ type: 'heal', amount: 1 }] })])).toEqual([])
  })

  /** Le bonus d'une relique à conditions tient-il exactement quand l'adversaire porte assez de `status` avant le coup ? */
  const readsStatus = (held: Relic, status: StatusId, posed: number, least: number) => {
    const r = run([testCharacter('a', { maxHp: 60 }, [start([{ type: 'applyStatus', status, stacks: posed, target: 'opponent' }])]).withRelics([held]), testCharacter('b', { maxHp: 60 })])
    let armed = 0
    let bare = 0
    r.beats.forEach((b, i) => {
      if (b.type !== 'attack' || b.attack.attacker !== 0 || b.attack.dodged) return
      const before = stacksOf(r.beats[i - 1].state.statuses[1], status)
      // Coup de base de 1, +2 à la frappe quand la condition tient (aucun critique)
      expect(b.attack.relicBonus ?? [], `${status} ${before}`).toEqual(before >= least ? [{ relic: held.id, name: held.name, amount: 2 }] : [])
      expect(b.attack.raw).toBe(before >= least ? 3 : 1)
      if (before >= least) armed++
      else bare++
    })
    expect(armed).toBeGreaterThan(0)
    expect(bare).toBeGreaterThan(0)
  }

  it('Fiole de venin : +2 à la frappe tant que l’adversaire est empoisonné', () => readsStatus(getRelic('venom-vial'), 'poison', 3, 1))

  it('Croc de boucher : +2 à la frappe tant que l’adversaire saigne', () => readsStatus(getRelic('butcher-hook'), 'bleed', 3, 1))

  it('Fiole de venin : +2 aux coups bruts de la Furie des vents (le coup qui remplace le jet) comme au coup de base', () => {
    const fury = skillById('wind-fury')
    // Chaque dé fait 1 : la Furie remplace chaque jet, et sa rafale frappe en coups bruts ; l'adversaire empoisonné tout le combat
    const r = runOn(1, [
      testCharacter('a', { maxHp: 200 }, [fury, start([{ type: 'applyStatus', status: 'poison', stacks: 30, target: 'opponent' }])]).withRelics([getRelic('venom-vial')]),
      testCharacter('b', { maxHp: 200 }),
    ])
    const brut = ofType(r, 'attack').filter((b) => b.attack.attacker === 0 && b.attack.plain && !b.attack.dodged)
    expect(brut.length).toBeGreaterThan(5)
    for (const b of brut) {
      expect(stacksOf(r.beats[b.id - 1].state.statuses[1], 'poison')).toBeGreaterThan(0)
      expect(b.attack.relicBonus).toEqual([{ relic: 'venom-vial', name: 'Fiole de venin', amount: 2 }])
    }
  })

  it('un bonus à palier : seulement à partir de N charges chez l’adversaire', () =>
    readsStatus(relic({ rollBonus: 2, when: [{ type: 'hasStatus', who: 'opponent', status: 'poison', stacks: 3 }] }), 'poison', 5, 3))

  it('Encens de l’abbaye : chaque étape qui lui rend des PV lui donne +1 Ferveur, cumulée, dépensée par son prochain coup qui touche', () => {
    const heal = (trigger: 'hit' | 'hurt'): CharacterEvent => ({ id: trigger, name: trigger, trigger, effects: [{ type: 'heal', amount: 1 }] })
    const r = run([testCharacter('a', { maxHp: 40 }, [heal('hit'), heal('hurt')]).withRelics([getRelic('abbey-incense')]), testCharacter('b', { maxHp: 40, attackMin: 2, attackMax: 2 })])
    const fires = ofType(r, 'relic')
    expect(fires.length).toBeGreaterThan(2)
    // Sa cause : l'étape qui l'a soigné ; chaque soin non nul l'éveille, un soin nul (PV pleins) jamais
    for (const f of fires) {
      const cause = r.beats[f.cause!]
      expect(cause.type === 'event' && cause.event.side === 0 && cause.event.effects.some((e) => e.type === 'heal' && e.amount > 0)).toBe(true)
      expect(f.effects).toEqual([expect.objectContaining({ type: 'applyStatus', status: 'momentum', stacks: 1, target: 0 })])
    }
    ofType(r, 'event').forEach((b) => {
      const healed = b.event.side === 0 && b.event.effects.some((e) => e.type === 'heal' && e.amount > 0)
      if (!b.state.hp.includes(0)) expect(fires.some((f) => f.cause === b.id), `étape ${b.id}`).toBe(healed)
    })
    // Cumulée : soigné en touchant, puis en encaissant, son coup suivant fait +2 ; la Ferveur part avec ce coup
    const mine = ofType(r, 'attack').filter((b) => b.attack.attacker === 0 && !b.attack.dodged)
    expect(mine.some((b) => b.attack.modifiers.some((m) => m.status === 'momentum' && m.delta === 2))).toBe(true)
    for (const b of mine) expect(stacksOf(b.state.statuses[0], 'momentum')).toBe(0)
  })

  it('Écu cabossé : +2 Armure temporaire quand il encaisse un coup de 6 ou plus, jamais en dessous', () => {
    const fight = (hit: number) => run([testCharacter('a', { maxHp: 60 }).withRelics([getRelic('dented-shield')]), testCharacter('b', { maxHp: 60, attackMin: hit, attackMax: hit })])
    expect(ofType(fight(5), 'relic')).toHaveLength(0)
    const r = fight(6)
    const fires = ofType(r, 'relic')
    expect(fires.length).toBeGreaterThan(1)
    for (const f of fires) {
      expect(r.beats[f.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 1, dealt: 6 } })
      expect(f.effects).toEqual([expect.objectContaining({ type: 'applyStatus', status: 'bonusArmor', stacks: 2, target: 0 })])
    }
    // L'armure retient 2 du coup suivant (4 PV) : celui-là ne la réveille pas
    const hits = ofType(r, 'attack').filter((b) => b.attack.attacker === 1 && !b.state.hp.includes(0))
    for (const b of hits) expect(fires.some((f) => f.cause === b.id), `coup de ${b.attack.dealt}`).toBe(b.attack.dealt >= 6)
    expect(hits.some((b) => b.attack.dealt === 4)).toBe(true)
  })

  it('Plume d’aigle : après un critique, +1 Esquive améliorée, puis 2 de ses tours de recharge', () => {
    const r = run([testCharacter('a', { maxHp: 40, critChance: 1 }).withRelics([getRelic('eagle-feather')]), testCharacter('b', { maxHp: 40 })])
    const fires = ofType(r, 'relic')
    expect(fires.length).toBeGreaterThan(2)
    for (const f of fires) expect(r.beats[f.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 0, crit: true } })
    // Il critique à chaque coup : elle part un de ses tours sur deux (4 tours du combat)
    for (let k = 1; k < fires.length; k++) expect(fires[k].turn - fires[k - 1].turn).toBe(4)
    // Le coup suivant de l'adversaire est esquivé à coup sûr
    for (const f of fires) {
      const next = r.beats.slice(f.id).find((b) => b.type === 'attack' && b.attack.attacker === 1)
      if (next?.type === 'attack') expect(next.attack.dodgeForced).toBe(true)
    }
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

  it('Pourfendre (Gorak, modifie) : la compétence a pour cause le coup du 2 qui touche', () => {
    let cuts = 0
    for (const r of oldDuels('gorak', 4))
      for (const b of ofType(r, 'event')) {
        if (b.event.eventId !== 'cleave') continue
        const cause = causeOf(r, b)
        expect(cause?.type === 'attack' && cause.attack.roll === 2 && !cause.attack.dodged && cause.attack.attacker === b.event.side).toBe(true)
        cuts++
      }
    expect(cuts).toBeGreaterThan(20)
  })

  it('Duo (Fanchon, signature sur le 2 depuis les Maîtrises) : le Duo seul ; à sa prochaine action, une rafale de jets complets, un de plus par charge', () => {
    let duos = 0
    let actions = 0
    let grafted = 0
    for (const r of rosterCombats(4)) {
      for (const b of ofType(r, 'event')) {
        if (b.event.eventId !== 'duo') continue
        expect(causeOf(r, b)).toMatchObject({ type: 'roll', roll: 2 })
        // L'Aura mélodieuse quitte le jeu (retour de l'utilisateur du 2026-10-27, P7) : le Duo ne pose plus que ses dés, trois
        expect(b.event.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: b.event.side, status: 'duo', stacks: 3 })])
        duos++
      }
      for (const f of ofType(r, 'flurry')) {
        if (f.status !== 'duo') continue
        expect(r.fighters[f.side].id).toBe('fanchon')
        // Le Duo vient d'un 1 d'une action passée, et toutes ses charges partent ici
        const held = stacksOf(r.beats[f.id - 1].state.statuses[f.side], 'duo')
        expect(f.strikes).toBe(1 + held)
        expect(stacksOf(f.state.statuses[f.side], 'duo')).toBe(0)
        const posed = ofType(r, 'event').filter((b) => b.id < f.id && b.event.eventId === 'duo' && b.event.side === f.side)
        expect(posed.at(-1)!.turn).toBeLessThan(f.turn)
        const strikes = r.beats.filter((b) => b.type === 'attack' && b.cause !== undefined && (b.cause === f.id || (r.beats[b.cause].type === 'roll' && r.beats[b.cause].cause === f.id)))
        if (f.turn < r.turns) expect(strikes).toHaveLength(f.strikes)
        grafted += strikes.filter((s) => s.cause !== f.id).length
        actions++
      }
    }
    expect(duos).toBeGreaterThan(50)
    expect(actions).toBeGreaterThan(30)
    // Chaque jet est complet : un 1 ou un 2 de la rafale fait partir sa compétence
    expect(grafted).toBeGreaterThan(5)
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
    // Le Poison agit à la fin des tours de sa victime depuis le 2026-10-27 (M2), comme la Brûlure
    const r = run([
      testCharacter('a', { maxHp: 60 }, [
        ev('combatStart', [
          { type: 'applyStatus', status: 'burn', stacks: 3, target: 'opponent' },
          { type: 'applyStatus', status: 'poison', stacks: 1, target: 'opponent' },
        ]),
      ]),
      testCharacter('b', { maxHp: 60 }),
    ])
    const ages = ofType(r, 'statusAge').filter((b) => b.side === 1)
    expect(ages[0]).toMatchObject({ phase: 'turnEnd', changes: [{ status: 'burn', from: 3, to: 2 }], expired: ['poison'] })
  })
})

describe('forge du dé (0.88.0, docs/CAMPAGNE.md § 4)', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  // Les mécaniques de forge se testent sur les dés de la 0.120.0 (Maîtrises, 2026-10-27 : cinq dés ont changé) : Gorak Furie
  // et Pourfendre, Elaria Œil et Esquive, Aldric Rétribution et Riposte, Thaldrin Feux follets et Foudre, Fanchon Duo et Soliste
  const createCharacter = onOldDie
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

  it('graver et dorer : seulement une face libre (nue et non dorée, 0.111.0)', () => {
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
    // Une face gravée n'est plus nue : elle ne se dore pas ; une face dorée ne se grave pas (0.111.0 : dorure et
    // compétence ne se cumulent jamais) et ne se redore pas
    expect(valid(ervald, [{ op: 'engrave', face: 5, skill: skill('cleave') }, { op: 'gild', face: 5 }])).toBe(false)
    expect(valid(ervald, [{ op: 'gild', face: 6 }, { op: 'engrave', face: 6, skill: skill('fear') }])).toBe(false)
    expect(valid(ervald, [{ op: 'gild', face: 6 }, { op: 'gild', face: 6 }])).toBe(false)
    expect(offerTargets(ervald, [{ op: 'gild', face: 6 }], { op: 'engrave', skills: [skill('fear')] })).not.toContain(6)
    expect(offerTargets(ervald, [{ op: 'gild', face: 6 }], { op: 'gild' })).not.toContain(6)
    // Aucune forge tirée au hasard ne met une compétence sur une face dorée (offre, auto-forge : adversaires, saison)
    for (const id of CHARACTER_IDS) {
      const c = createCharacter(id)
      const rng = seededRng(id.length * 7)
      let steps: ForgeStep[] = []
      for (let k = 0; k < 8; k++) {
        const step = autoForge(c.definition, steps, drawForgeOffer(c.definition, steps, rng, ENGRAVABLE_SKILLS), rng)
        if (!step) break
        steps = withForgeStep(c.definition, steps, step)
      }
      for (const f of forgedFaces(c.definition, steps)) expect(f.gild > 0 && (f.engraved ?? f.origin[0]) !== undefined, `${id} face ${f.face}`).toBe(false)
    }
    expect(() => createCharacter('ervald').withForge([{ op: 'gild', face: 2 }])).toThrow()
  })

  it('ogre : son Aura de puissance sur le 1 (Maîtrises), le reste nu ; une gravure sur le 2 (Pourfendre) frappe et pourfend', () => {
    expect(def('morgrut').events.filter((e) => isRollTrigger(e.trigger)).map((e) => `${e.id}@${e.trigger}`)).toEqual(['power-aura@naturalOne'])
    const morgrut = createCharacter('morgrut').withForge([{ op: 'engrave', face: 2, skill: skill('cleave') }])
    expect(morgrut.events.filter((e) => isRollTrigger(e.trigger)).map((e) => e.id)).toEqual(['power-aura', 'cleave'])
    expect(morgrut.events.find((e) => e.id === 'cleave')?.trigger).toBe('naturalTwo')
    expect(forgedFaces(morgrut.definition, morgrut.forge)[1]).toMatchObject({ engraved: { id: 'cleave' } })
    let ones = 0
    for (let seed = 0; seed < 60; seed++) {
      const r = simulateCombat([morgrut, createCharacter('ysolde')], { seed })
      for (const b of ofType(r, 'attack').filter((x) => x.attack.attacker === 0 && x.attack.roll === 2)) {
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
        expect(cause?.type === 'attack' && cause.attack.roll === 2 && !cause.attack.dodged).toBe(true)
      }
    }
    expect(ones).toBeGreaterThan(0)
  })

  it('Duo : la forge de la barde vise les faces nues, comme pour tous ; une face gravée ou dorée vaut pour chaque dé de sa rafale', () => {
    const fanchon = def('fanchon')
    expect(offerTargets(fanchon, [], { op: 'engrave', skills: [skill('fear')] })).toEqual([3, 4, 5, 6])
    expect(offerTargets(fanchon, [], { op: 'gild' })).toEqual([3, 4, 5, 6])
    expect(() => forgeState(fanchon, [{ op: 'gild', face: 1 }])).toThrow()
    const bard = createCharacter('fanchon').withForge([{ op: 'engrave', face: 6, skill: skill('grave-breath') }, { op: 'gild', face: 5 }])
    expect(bard.events.find((e) => e.id === 'grave-breath')!.trigger).toBe(faceTrigger(6))
    // Une compétence qui modifie son coup le modifie aussi dans la rafale : chaque dé porte son coup
    expect(relationOf(createCharacter('fanchon').withForge([{ op: 'engrave', face: 6, skill: skill('cleave') }]).events.find((e) => e.id === 'cleave')!)).toBe('modify')
    let sixes = 0
    let gilded = 0
    for (let seed = 0; seed < 150; seed++) {
      const r = simulateCombat([bard, createCharacter('morgrut')], { seed })
      for (const f of ofType(r, 'flurry').filter((x) => x.side === 0 && x.status === 'duo')) {
        // Ses jets, dans l'ordre : un 6 lance le Souffle (greffé : étape roll, le Souffle, puis le coup), sur chacun des dés
        const rolls = r.beats.filter((x) => x.type === 'roll' && x.cause === f.id)
        const feared = rolls.filter((x) => x.type === 'roll' && x.roll === 6)
        for (const roll of feared) {
          expect(r.beats[roll.id + 1]).toMatchObject({ type: 'event', event: { eventId: 'grave-breath', trigger: faceTrigger(6) } })
          sixes++
        }
      }
      for (const a of attacksOf(r).filter((x) => x.attacker === 0 && !x.dodged && !x.replaced)) {
        expect(a.gild ?? 0).toBe(a.roll === 5 ? GILD_BONUS : 0)
        if (a.gild) gilded++
      }
    }
    expect(sixes).toBeGreaterThan(20)
    expect(gilded).toBeGreaterThan(0)
  })

  it('aiguiser (E1, 0.110.0) : chaque compétence monte sur son axe de rang (ses données), un rang à la fois, sans plafond', () => {
    const sharp = (id: string, steps: ForgeStep[], skillId: string) => createCharacter(id).withForge(steps).events.find((e) => e.id === skillId)!
    const ranks = (face: number, n: number, before: ForgeStep[] = []): ForgeStep[] => [...before, ...Array.from({ length: n }, (): ForgeStep => ({ op: 'sharpen', face }))]
    // Toute compétence du dé déclare son axe, et toutes s'aiguisent : chaque face de compétence d'un kit est proposée
    for (const e of ENGRAVABLE_SKILLS) expect(e.rankAxis, e.id).toBeDefined()
    for (const c of CHARACTERS) {
      const faces = [...new Set(c.events.flatMap((e) => rollFace(e.trigger) ?? []))].sort()
      expect(offerTargets(c.definition, [], { op: 'sharpen' }), c.id).toEqual(faces)
    }
    // Charges (Pourfendre) : deux de plus par rang depuis la revue R1 ; pas de rang maximal (décision de l'utilisateur, 2026-10-23)
    expect(sharp('gorak', ranks(2, 1), 'cleave')).toMatchObject({ name: 'Pourfendre II', effects: [{ stacks: 2, fromHit: 0.5 }] })
    expect(sharp('gorak', ranks(2, 3), 'cleave')).toMatchObject({ name: 'Pourfendre IV', effects: [{ stacks: 6, fromHit: 0.5 }] })
    expect(offerTargets(def('gorak'), ranks(2, 3), { op: 'sharpen' })).toContain(2)
    // Seules les compétences de la face aiguisée changent
    expect(createCharacter('gorak').withForge(ranks(2, 1)).events.filter((e) => e.id !== 'cleave')).toEqual(def('gorak').events.filter((e) => e.id !== 'cleave'))
    // Montant (Purification : sa lumière de repli, +3 par rang)
    const light = def('ysolde').events.find((e) => e.id === 'purification')!.effects[0]
    expect(sharp('ysolde', ranks(2, 1), 'purification').effects[0]).toMatchObject({ orElse: { amount: (light.type === 'cleanse' && light.orElse?.type === 'damage' ? light.orElse.amount : 0) + 3 } })
    // Intensité (Pile ou face : pile ×2 de plus, revue R2 ; Vol de vie et Riposte : leur plafond de 2 charges ne bouge pas,
    // elles s'aiguisent encore au rang III ; le Vol de vie part de +4 PV (+2 avant les Maîtrises) et gagne +4 par rang, revue P3 ; Aura de sainteté :
    // +1 PV par tour par rang, au-delà de son plafond)
    expect(sharp('naraxes', ranks(2, 1), 'coin-flip').effects[0]).toMatchObject({ stacks: 1, power: 2 })
    expect(def('ervald').events.find((e) => e.id === 'life-steal')!.effects[0]).toMatchObject({ stacks: 1, power: 4 })
    expect(sharp('ervald', ranks(2, 2), 'life-steal').effects[0]).toMatchObject({ stacks: 1, power: 12 })
    expect(offerTargets(def('ervald'), ranks(2, 2), { op: 'sharpen' })).toContain(2)
    expect(sharp('aldric', ranks(2, 2), 'riposte').effects[0]).toMatchObject({ stacks: 2, power: 4 })
    expect(sharp('ysolde', ranks(1, 1), 'holy-aura').effects[0]).toMatchObject({ stacks: 1, power: 1 })
    expect(sharp('ysolde', ranks(1, 2), 'holy-aura').effects[0]).toMatchObject({ stacks: 1, power: 2 })
    // Coup ×N (Crescendo, Soliste), limite par combat (Peur), part relâchée (Rétribution)
    expect(sharp('gorak', ranks(3, 1, [{ op: 'engrave', face: 3, skill: skill('crescendo') }]), 'crescendo').hitMultiplier).toBe(skill('crescendo').hitMultiplier! + 1)
    expect(sharp('fanchon', ranks(2, 1), 'soloist')).toMatchObject({ hitMultiplier: 4, limit: 1 })
    expect(sharp('gorak', ranks(3, 1, [{ op: 'engrave', face: 3, skill: skill('fear') }]), 'fear').limit).toBe(2)
    // Part relâchée : en points de pourcentage, +25 par rang (0,5 → 0,75 → 1)
    expect(sharp('aldric', ranks(1, 1), 'retribution').effects[0]).toMatchObject({ type: 'release', share: 0.75, min: 1 })
    expect(sharp('aldric', ranks(1, 2), 'retribution').effects[0]).toMatchObject({ type: 'release', share: 1, min: 1 })
    // Plus de demi-rang (0.111.0) : chaque rang ajoute une quantité entière (Esquive améliorée II : intensité 2, +2 dégâts
    // à ses coups en attendant l'esquive ; une charge de plus jusqu'à la 0.117.0), et le roster refuse un axe de rang à virgule
    expect(sharp('elaria', ranks(2, 1), 'evasion').effects[0]).toMatchObject({ stacks: 1, power: 2 })
    expect(sharp('elaria', ranks(2, 2), 'evasion').effects[0]).toMatchObject({ stacks: 1, power: 4 })
    expect(rankText(def('elaria').events.find((e) => e.id === 'evasion')!)).toBe(typeset("+2 dégâts par coup en attendant l'esquive"))
    for (const e of [...ENGRAVABLE_SKILLS, ...CHARACTERS.flatMap((c) => c.events)]) if (e.rankAxis) expect(Number.isInteger(e.rankAxis.per), e.id).toBe(true)
    const elaria = def('elaria')
    const halfEvasion = elaria.events.map((e) => (e.id === 'evasion' ? { ...e, rankAxis: { kind: 'power' as const, per: 0.5 } } : e))
    expect(validateRoster([{ ...elaria, events: halfEvasion }])).toContain('elaria : evasion : axe de rang, un gain entier ≥ 1 par rang')
    // Non cumulable (0.117.1) : une charge de plus n'aurait plus de prise
    const stackedEvasion = elaria.events.map((e) => (e.id === 'evasion' ? { ...e, rankAxis: { kind: 'stacks' as const, per: 1 } } : e))
    expect(validateRoster([{ ...elaria, events: stackedEvasion }])).toContain('elaria : evasion : axe de rang stacks sans prise sur la compétence')
    // Une gravure s'aiguise sur sa face
    expect(sharp('ervald', ranks(5, 1, [{ op: 'engrave', face: 5, skill: skill('cleave') }]), 'cleave').effects[0]).toMatchObject({ stacks: 2 })
    // Feux follets (E3) : ils s'aiguisent (+2 Brûlure depuis la revue R3 : 5 PV pendant 5 tours), sur leur face 1 depuis la 0.113.0
    const fire = createCharacter('thaldrin').withForge(ranks(1, 1)).events.filter((e) => e.id === 'firefly')
    expect(fire.map((e) => [rollFace(e.trigger), e.name, e.effects[0]])).toEqual([[1, 'Feux follets II', expect.objectContaining({ status: 'burn', stacks: 5 })]])
    // Le texte d'un rang le dit, en une ligne (`rankText`) et dans la compétence (aperçu de forge avant → après)
    expect(rankText(skill('cleave'))).toBe('+2 Saignement')
    expect(rankText(skill('wind-fury'))).toBe('+1 coup')
    expect(rankText(skill('retribution'))).toBe(typeset('+25 % des dégâts renvoyés'))
    expect(describeSkill(sharp('gorak', ranks(1, 1), 'wind-fury')).text).toBe("Trois coups au lieu d'un.")
    expect(describeSkill(sharp('gorak', ranks(1, 2), 'wind-fury')).text).toBe("Quatre coups au lieu d'un.")
    // Aucun chiffre à virgule dans le texte d'une compétence aiguisée, à aucun rang
    for (const c of CHARACTERS)
      for (const face of offerTargets(c.definition, [], { op: 'sharpen' }))
        for (const n of [1, 2]) for (const e of c.withForge(ranks(face, n)).events) expect(describeSkill(e).text, `${c.id} ${e.id}`).not.toMatch(/\d[.,]\d/)
    for (const e of ENGRAVABLE_SKILLS) expect(rankText(e), e.id).not.toMatch(EMOJI)
  })

  it('aiguiser, dans le combat (E1, 0.110.0) : Furie II, un coup de plus à chaque rafale ; Furie III, quatre coups', () => {
    const foe = testCharacter('b', { maxHp: 400 })
    const bursts = (n: number) =>
      ofType(runOn(1, [createCharacter('gorak').withForge(Array.from({ length: n }, (): ForgeStep => ({ op: 'sharpen', face: 1 }))), foe]), 'flurry')
        .filter((f) => f.side === 0 && f.status === 'windFury')
        .map((f) => f.strikes)
    expect(bursts(0).slice(0, 6)).toEqual([2, 2, 2, 2, 2, 2])
    // Avant la 0.110.0, un rang doublait la Furie (une charge de plus : quatre coups par rafale, +15 points gravée) ;
    // en 0.110.0, un coup de plus une rafale sur deux (demi-rang, retiré en 0.111.0)
    expect(bursts(1).slice(0, 6)).toEqual([3, 3, 3, 3, 3, 3])
    expect(bursts(2).slice(0, 6)).toEqual([4, 4, 4, 4, 4, 4])
  })

  it('aiguiser, dans le combat : Foudre II (+1 par éclair), Feux follets II (Brûlure 5), Esquive II, Aura glaciale II, Pile ou face II', () => {
    const foe = testCharacter('b', { maxHp: 400 })
    // Foudre II : chaque éclair fait 1 de plus, à chaque fois
    const bolts = ofType(runOn(2, [createCharacter('thaldrin').withForge([{ op: 'sharpen', face: 2 }]), foe]), 'event').filter((b) => b.event.eventId === 'thunderbolt')
    expect(bolts.length).toBeGreaterThan(3)
    for (const b of bolts) expect(b.event.effects[0]).toMatchObject({ type: 'damage', amount: 8, parts: [2, 2, 2, 2] })
    // Feux follets II : Brûlure 5, cinq tours (revue R3 : +2 par rang)
    const fires = ofType(runOn(1, [createCharacter('thaldrin').withForge([{ op: 'sharpen', face: 1 }]), foe]), 'event').filter((b) => b.event.eventId === 'firefly')
    expect(fires.length).toBeGreaterThan(2)
    for (const b of fires) expect(b.event.effects[0]).toMatchObject({ type: 'applyStatus', status: 'burn', stacks: 5, turns: 5 })
    // Esquive améliorée II (0.117.1) : une charge, d'intensité 2, à chaque fois (deux charges jusqu'à la 0.117.0)
    const sharpened = runOn(2, [createCharacter('elaria').withForge([{ op: 'sharpen', face: 2 }]), foe])
    const dodges = ofType(sharpened, 'event').filter((b) => b.event.eventId === 'evasion')
    expect(dodges.length).toBeGreaterThan(3)
    for (const b of dodges) {
      expect(b.event.effects[0]).toMatchObject({ type: 'applyStatus', status: 'evasion', stacks: 1 })
      expect(b.state.statuses[0].find((s) => s.id === 'evasion')).toEqual({ id: 'evasion', stacks: 1, power: 2 })
    }
    // Aura glaciale II (intensité 1) : un Poison de plus à chaque tour
    const frost = runOn(1, [createCharacter('ervald').withForge([{ op: 'sharpen', face: 1 }]), foe])
    const ticks = ofType(frost, 'statusTick').filter((t) => t.side === 0 && t.status === 'frostAura')
    expect(ticks.length).toBeGreaterThan(3)
    for (const t of ticks) {
      const aura = frost.beats[t.id - 1].state.statuses[0].find((s) => s.id === 'frostAura')!
      expect(aura.power).toBe(1)
      expect(t.effects[0]).toMatchObject({ type: 'applyStatus', status: 'poison', stacks: aura.stacks + 1 })
    }
    // Pile ou face II (chaque pièce tombe sur pile, la pièce lisant 1 = pile : la compétence aiguisée de sa face 2, portée
    // sur le 1) : ce coup ×5 (pile ×2 de plus par rang, revue R2), la pièce rend encore quatre fois les PV retirés
    const coin = createCharacter('naraxes').withForge([{ op: 'sharpen', face: 2 }]).events.find((e) => e.id === 'coin-flip')!
    const r = runOn(1, [testCharacter('a', { maxHp: 60 }, [{ ...coin, trigger: 'naturalOne' }]), foe])
    const coins = ofType(r, 'coin').filter((c) => c.side === 0)
    expect(coins.length).toBeGreaterThan(2)
    for (const c of coins) {
      const hit = r.beats.slice(0, c.id).reverse().find((b) => b.type === 'attack')!
      expect(c.heads).toBe(true)
      expect(c.effects[0]).toMatchObject({ type: 'damage', amount: (hit.type === 'attack' ? hit.attack.dealt : 0) * (COIN_HEADS + 2 - 1) })
    }
  })

  it('aiguiser, dans le combat : Peur II deux fois par combat, Rétribution II les trois quarts des jauges, Crescendo II dès ×3', () => {
    const foe = testCharacter('b', { maxHp: 400 })
    const fear = ofType(runOn(3, [createCharacter('gorak').withForge([{ op: 'engrave', face: 3, skill: skill('fear') }, { op: 'sharpen', face: 3 }]), foe]), 'event')
    expect(fear.filter((b) => b.event.eventId === 'fear')).toHaveLength(2)
    const r = runOn(1, [createCharacter('aldric').withForge([{ op: 'sharpen', face: 1 }]), testCharacter('b', { maxHp: 400, attackMin: 6, attackMax: 6 })])
    const released = ofType(r, 'event').filter((b) => b.event.eventId === 'retribution')
    expect(released.length).toBeGreaterThan(2)
    for (const b of released) {
      const stored = r.beats[b.id - 1].state.statuses[0].find((s) => s.id === 'retribution')?.stacks ?? 0
      expect(b.event.effects[0]).toMatchObject({ type: 'damage', amount: Math.max(1, Math.floor(stored * 0.75)) })
    }
    const cresc = ofType(runOn(3, [createCharacter('gorak').withForge([{ op: 'engrave', face: 3, skill: skill('crescendo') }, { op: 'sharpen', face: 3 }]), foe]), 'attack')
    expect(cresc.find((b) => b.attack.attacker === 0)?.attack.multiplier).toBe(3)
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
            for (const face of targets)
              for (const to of o.op === 'copy' ? copyDestinations(base, steps, face) : [undefined])
                expect(valid(base, [...steps, stepOf(o, face, to)]), `${id} ${o.op} ${face} ${to ?? ''}`).toBe(true)
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

  it('trace : l’en-tête de forge se relit et rejoue le combat à l’identique ; une copie d’avant la 0.111.0 (« copy 1 ») se relit encore', () => {
    const left = createCharacter('gorak').withForge([{ op: 'engrave', face: 6, skill: skill('fear') }, { op: 'gild', face: 5 }, { op: 'temper' }, { op: 'sharpen', face: 1 }])
    const right = createCharacter('morgrut').withForge([{ op: 'engrave', face: 2, skill: skill('cleave') }, { op: 'copy', face: 2, to: 4 }])
    const r = simulateCombat([left, right], { seed: 5 })
    const text = traceText(r)
    expect(text).toContain('engrave 2 cleave ; copy 2 4')
    const forge = parseForge(text, ENGRAVABLE_SKILLS)
    expect(forge).toEqual([left.forge, right.forge])
    const replay = simulateCombat([createCharacter('gorak').withForge(forge[0]), createCharacter('morgrut').withForge(forge[1])], { seed: 5 })
    expect(traceText(replay)).toBe(text)
    // L'ancienne écriture, sans destination : la copie va sur la plus petite face libre (le 3 de Morgrut), comme alors
    const legacy = createCharacter('morgrut').withForge([{ op: 'engrave', face: 2, skill: skill('cleave') }, { op: 'copy', face: 2 }])
    const old = traceText(simulateCombat([left, legacy], { seed: 5 }))
    expect(old).toMatch(/engrave 2 cleave ; copy 2$/m)
    const relu = parseForge(old, ENGRAVABLE_SKILLS)[1]
    expect(relu).toEqual([{ op: 'engrave', face: 2, skill: skill('cleave') }, { op: 'copy', face: 2 }])
    expect(forgedFaces(def('morgrut'), relu).find((f) => f.engraved?.id === 'cleave' && f.face !== 2)?.face).toBe(3)
    expect(traceText(simulateCombat([left, createCharacter('morgrut').withForge(relu)], { seed: 5 }))).toBe(old)
    // Un camp sans forge relit un journal vide
    expect(parseForge(traceText(simulateCombat([left, createCharacter('brokk')], { seed: 5 })), ENGRAVABLE_SKILLS)[1]).toEqual([])
  })
})

describe('attaque de base (phase 5 bis)', () => {
  // Sur les dés de la 0.120.0 (Maîtrises, 2026-10-27), comme la forge
  const createCharacter = onOldDie
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

  it('remplace : la Furie des vents donne, à la place du coup du 1, deux coups de base bruts, chacun avec son dé', () => {
    const fury = createCharacter('gorak').events.find((e) => e.id === 'wind-fury')!
    expect(relationOf(fury)).toBe('replace')
    const r = runOn(1, [testCharacter('a', { maxHp: 60, attackMin: 3, attackMax: 3 }, [fury]), testCharacter('b', { maxHp: 200 })])
    let checked = 0
    for (const flurry of ofType(r, 'flurry').filter((b) => b.side === 0)) {
      const replaced = r.beats[flurry.cause!]
      expect(replaced.type === 'event' && replaced.event.eventId).toBe('wind-fury')
      const strikes = causedBy(r, flurry.id).filter((b): b is Extract<Beat, { type: 'attack' }> => b.type === 'attack')
      if (strikes.some((s) => s.state.hp.includes(0))) continue
      expect(strikes.map((s) => s.attack)).toEqual([
        expect.objectContaining({ roll: 1, plain: true, replaced: false, value: 3, dealt: 3 }),
        expect.objectContaining({ roll: 1, plain: true, replaced: false, value: 3, dealt: 3 }),
      ])
      expect(strikes.every((s) => s.attack.preset === undefined)).toBe(true)
      checked++
    }
    expect(checked).toBeGreaterThan(5)
    // Le jet du 1 lui-même ne frappe pas
    expect(attacksOf(r).filter((a) => a.attacker === 0 && !a.plain).every((a) => a.replaced)).toBe(true)
  })

  it('Furie des vents dans une rafale de jets (0.110.0) : chaque Furie suit le jet qui la pose, avant le jet suivant', () => {
    const fury = createCharacter('gorak').events.find((e) => e.id === 'wind-fury')!
    // Un jet de plus à chaque action (Coup de chance posé au début de chaque tour), et chaque dé fait 1
    const luck: CharacterEvent = { id: 'luck', name: 'luck', trigger: 'turnStart', effects: [{ type: 'applyStatus', status: 'luckyStrike', stacks: 1 }] }
    const r = runOn(1, [testCharacter('a', { maxHp: 200 }, [fury, luck]), testCharacter('b', { maxHp: 400 })])
    let actions = 0
    for (const volley of ofType(r, 'flurry').filter((b) => b.side === 0 && b.status === 'luckyStrike')) {
      const turn = r.beats.filter((b) => b.turn === volley.turn && b.id > volley.id)
      if (turn.some((b) => b.state.hp.includes(0))) continue
      // Jet remplacé, Furie, rafale de deux coups bruts ; puis le second jet, sa Furie, sa rafale
      const shape = turn.filter((b) => b.type === 'attack' || b.type === 'flurry').map((b) => (b.type === 'flurry' ? `rafale ${b.strikes}` : b.attack.replaced ? 'jet' : 'brut'))
      expect(shape).toEqual(['jet', 'rafale 2', 'brut', 'brut', 'jet', 'rafale 2', 'brut', 'brut'])
      // Aucune rafale reportée : la Furie ne survit pas à l'action
      expect(turn.at(-1)!.state.statuses[0].some((s) => s.id === 'windFury')).toBe(false)
      actions++
    }
    expect(actions).toBeGreaterThan(5)
  })

  it('Furie des vents à deux charges (0.110.0) : toutes partent à la fois, quatre coups bruts dans la même action', () => {
    const base = createCharacter('gorak').events.find((e) => e.id === 'wind-fury')!
    const fury: CharacterEvent = { ...base, effects: base.effects.map((e) => (e.type === 'applyStatus' ? { ...e, stacks: 2 } : e)) }
    const r = runOn(1, [testCharacter('a', { maxHp: 200 }, [fury]), testCharacter('b', { maxHp: 400 })])
    const bursts = ofType(r, 'flurry').filter((b) => b.side === 0)
    expect(bursts.length).toBeGreaterThan(5)
    for (const b of bursts) {
      expect(b.strikes).toBe(4)
      expect(b.state.statuses[0].some((s) => s.id === 'windFury')).toBe(false)
      expect(r.beats[b.cause!].turn).toBe(b.turn)
    }
  })

  it('Pile ou face ×3 (0.107.0) : sur pile, la pièce retire encore deux fois les PV que le coup a retirés', () => {
    const coin = createCharacter('naraxes').events.find((e) => e.id === 'coin-flip')!
    expect(relationOf(coin)).toBe('modify')
    // Chaque dé fait 1 : la pièce tombe sur pile (Pile ou face porté sur le 1) ; coup de base de 5, armure 2 : 3 PV, puis 6 de plus
    const r = runOn(1, [testCharacter('a', { maxHp: 100, attackMin: 5, attackMax: 5 }, [{ ...coin, trigger: 'naturalOne' }]), testCharacter('b', { maxHp: 100, armor: 2 })])
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

  it('un type d’attaque unique (2026-10-24) : le coup de base ne porte ni type ni source, la trace ne dit ni DP ni DM', () => {
    for (const id of ['thaldrin', 'ysolde']) {
      const r = simulateCombat([createCharacter(id), createCharacter('gorak')], { seed: 3 })
      const attacks = ofType(r, 'attack')
      expect(attacks.length).toBeGreaterThan(5)
      for (const b of attacks) expect(b.attack).not.toHaveProperty('source')
      expect(traceText(r)).not.toMatch(/\b(DP|DM)\b/)
    }
  })

  it('Copier une face (0.111.0) : la compétence d’une face, rang compris, sur la face libre choisie ; une copie sans destination (avant 0.111.0) prend la plus petite', () => {
    // Gorak : la Furie sur le 1, Pourfendre sur le 2, le 3 à 6 nus
    const gorak = createCharacter('gorak').definition
    const copiedOn = (steps: ForgeStep[]) => forgedFaces(gorak, steps).flatMap((f) => (f.engraved ? [[f.face, f.engraved.id]] : []))
    // Le joueur choisit la destination parmi les faces libres (nues, non dorées)
    expect(copyDestinations(gorak, [], 2)).toEqual([3, 4, 5, 6])
    expect(copiedOn([{ op: 'copy', face: 2, to: 5 }])).toEqual([[5, 'cleave']])
    expect(stepKey({ op: 'copy', face: 1, to: 5 })).toBe('copy 1 5')
    expect(stepLabel({ op: 'copy', face: 1, to: 5 })).toBe('Copier le 1 sur le 5')
    expect(() => stepOf({ op: 'copy' }, 1)).toThrow()
    // Jamais sur une face de compétence ni sur une face dorée
    expect(() => forgeState(gorak, [{ op: 'copy', face: 1, to: 2 }])).toThrow()
    expect(copyDestinations(gorak, [{ op: 'gild', face: 3 }], 1)).toEqual([4, 5, 6])
    expect(() => forgeState(gorak, [{ op: 'gild', face: 3 }, { op: 'copy', face: 1, to: 3 }])).toThrow()
    // Une copie enregistrée avant la 0.111.0 (« copy 1 », sans destination) : la plus petite face libre, comme alors
    expect(copiedOn([{ op: 'copy', face: 2 }])).toEqual([[3, 'cleave']])
    expect(copiedOn([{ op: 'gild', face: 3 }, { op: 'copy', face: 2 }])).toEqual([[4, 'cleave']])
    expect(writtenFace(gorak, [{ op: 'gild', face: 3 }], { op: 'copy', face: 2 })).toBe(4)
    // Toutes les faces nues dorées : plus de face libre, plus de copie (avant la 0.111.0, elle allait sur une face dorée)
    const allGilded: ForgeStep[] = [3, 4, 5, 6].map((face) => ({ op: 'gild', face }))
    expect(offerTargets(gorak, allGilded, { op: 'copy' })).toEqual([])
    expect(() => forgeState(gorak, [...allGilded, { op: 'copy', face: 2 }])).toThrow()
    // L'auto-forge (adversaire, champion de référence) prend la plus petite face libre
    for (let seed = 1; seed <= 20; seed++) {
      const step = autoForge(gorak, [{ op: 'gild', face: 3 }], [{ op: 'copy' }], seededRng(seed))
      expect(step).toMatchObject({ op: 'copy', to: 4 })
    }
    // Seules les faces de compétence se copient
    expect(offerTargets(gorak, [], { op: 'copy' })).toEqual([1, 2])
    expect(() => forgeState(gorak, [{ op: 'copy', face: 4, to: 5 }])).toThrow()
    // Avec son rang ; deux faces au plus, puis elle n'est plus proposée
    const twice: ForgeStep[] = [{ op: 'sharpen', face: 2 }, { op: 'copy', face: 2 }]
    expect(createCharacter('gorak').withForge(twice).events.filter((e) => e.id === 'cleave').map((e) => [e.trigger, e.name])).toEqual([
      ['naturalTwo', 'Pourfendre II'],
      ['naturalThree', 'Pourfendre II'],
    ])
    expect(offerTargets(gorak, twice, { op: 'copy' })).toEqual([1])
    // Le druide (0.113.0) : ses deux sorts se copient sur ses faces nues
    expect(offerTargets(createCharacter('thaldrin').definition, [], { op: 'copy' })).toEqual([1, 2])
    // Une copie qui ne rapporte rien n'est pas proposée : une aura permanente non cumulable, seule, gravée sur le 3 ne se
    // copie pas (l'Aura d'immunité sans sa purge) ; l'Aura de décoction, cumulable, se copie, comme l'Aura de puissance
    // depuis la revue A4 (3 charges)
    const engrave = (skill: CharacterEvent): ForgeStep[] => [{ op: 'engrave', face: 3, skill }]
    const engraved = (id: string) => engrave(ENGRAVABLE_SKILLS.find((e) => e.id === id)!)
    const flat: CharacterEvent = { id: 'flat-aura', name: 'Aura plate', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'immunityAura', stacks: 1 }], rankAxis: { kind: 'power', per: 1 } }
    expect(offerTargets(gorak, engrave(flat), { op: 'copy' })).toEqual([1, 2])
    expect(() => forgeState(gorak, [...engrave(flat), { op: 'copy', face: 3 }])).toThrow()
    expect(offerTargets(gorak, engraved('decoction-aura'), { op: 'copy' })).toEqual([1, 2, 3])
    expect(offerTargets(gorak, engraved('power-aura'), { op: 'copy' })).toEqual([1, 2, 3])
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
          const held = r.beats[b.id - 1].state.statuses[0].find((s) => s.id === 'retribution')
          const stored = held?.stacks ?? 0
          const amount = Math.max(1, Math.floor(stored / 2))
          // Un coup par jauge remplie (retour du 2026-10-27, S1), leur somme inchangée
          const parts = splitAmong(amount, held?.slots?.filter((n) => n > 0) ?? [])
          expect(b.event.effects).toEqual([{ type: 'damage', target: 1, amount, source: 'strike', ...(parts.length > 1 && { parts }) }])
          // Les jauges sont vidées
          expect(b.state.statuses[0].some((s) => s.id === 'retribution')).toBe(false)
          if (stored > 1) released++
        }
      }
    expect(released).toBeGreaterThan(20)
  })

  it('Pourfendre (0.107.0) : `fromHit` seulement sur une compétence du dé qui modifie son coup', () => {
    const cut = (relation?: 'modify'): CharacterEvent => ({ id: 'cut', name: 'cut', trigger: 'naturalOne', relation, effects: [{ type: 'applyStatus', status: 'bleed', stacks: 0, fromHit: 0.5, target: 'opponent' }], rankAxis: { kind: 'stacks', per: 1 } })
    const gorak = { ...createCharacter('gorak').definition, signature: undefined }
    expect(validateRoster([{ ...gorak, events: [cut('modify')] }]).filter((p) => p.includes('fromHit'))).toEqual([])
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

  it('Peur bloquée par une immunité : elle use quand même sa seule fois (E4, décision du 2026-10-24)', () => {
    const fear: CharacterEvent = { id: 'scare', name: 'scare', trigger: 'naturalOne', limit: 1, effects: [{ type: 'applyStatus', status: 'fear', stacks: 1, target: 'opponent' }] }
    const shield: CharacterEvent = { id: 'shield', name: 'shield', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'immunityAura', stacks: 1 }] }
    const r = runOn(1, [testCharacter('a', { maxHp: 200 }, [fear]), testCharacter('b', { maxHp: 200 }, [shield])])
    const scares = ofType(r, 'event').filter((x) => x.event.eventId === 'scare')
    expect(scares).toHaveLength(1)
    expect(scares[0].event.effects[0]).toMatchObject({ type: 'applyStatus', result: { kind: 'blocked', by: 'immunityAura' } })
    expect(ofType(r, 'skip')).toHaveLength(0)
    expect(ofType(r, 'attack').filter((x) => x.attack.attacker === 0).length).toBeGreaterThan(3)
  })

  it('barde (le Duo) : un seul d6 ; sur le 2, Soliste une fois ; chaque 1 donne un dé de plus à sa prochaine action', () => {
    const fanchon = createCharacter('fanchon')
    // Ses compétences sont sur ses faces, comme celles de tous (l'Ouverture, hors dé, a quitté le jeu le 2026-10-27)
    for (const e of [...fanchon.events, ...characterPool(fanchon.definition)]) expect(rollFace(e.trigger)).toBeDefined()
    const target = () => testCharacter('cible', { maxHp: 400, dodgeChance: 0.3 })
    // Sur le 2 : un dé par action, aucune rafale ; Soliste une seule fois (0.107.0), puis sa face est nue
    const solo = runOn(2, [fanchon, target()])
    expect(ofType(solo, 'flurry')).toHaveLength(0)
    expect(ofType(solo, 'event').filter((b) => b.event.eventId === 'soloist')).toHaveLength(1)
    // Sur le 1 : chaque jet pose un Duo de trois charges (2026-10-27, P7), toutes partent à l'action suivante : 1 jet, puis
    // 1 + 3 = 4, puis 1 + 3 × 4 = 13…
    const duo = runOn(1, [fanchon, target()])
    const volleys = ofType(duo, 'flurry').filter((f) => f.side === 0)
    expect(volleys.length).toBeGreaterThan(1)
    let jets = 1
    for (const f of volleys) {
      jets = 1 + 3 * jets
      expect(f).toMatchObject({ status: 'duo', strikes: jets, faces: Array(jets).fill(DIE_FACES) })
    }
    // Un Duo par jet : chaque jet de la rafale est complet (son 1 fait partir la compétence, greffée)
    const rolls = ofType(duo, 'roll').filter((b) => b.side === 0)
    expect(ofType(duo, 'event').filter((b) => b.event.eventId === 'duo')).toHaveLength(rolls.length)
  })
})

describe('phase 8, premier lot : cinq consommatrices (0.114.0)', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  /** La compétence gravée sur le 3, aiguisée `rank` fois (rang I : 0) */
  const engraved = (c: Character, id: string, rank = 0) =>
    c.withForge([{ op: 'engrave', face: 3, skill: skill(id) }, ...Array.from({ length: rank }, (): ForgeStep => ({ op: 'sharpen', face: 3 }))])
  const fired = (r: CombatResult, id: string) => ofType(r, 'event').filter((b) => b.event.eventId === id && b.event.side === 0)

  it('les cinq au roster : des compétences du dé, gravables, leurs textes courts', () => {
    expect(validateRoster()).toEqual([])
    const text = (id: string, rank = 0) => describeSkill(engraved(createCharacter('aldric'), id, rank).events.find((e) => e.id === id)!).text
    // Au style de l'utilisateur (passe compendium, 2026-10-25) : la condition dans la ligne, le jargon au détail
    expect(text('quarry')).toBe("Trois coups de plus si l'adversaire saigne.")
    expect(text('quarry', 1)).toBe("Six coups de plus si l'adversaire saigne.")
    expect(describeSkill(skill('quarry')).detail).toBe(typeset('Des coups de base bruts, juste après celui du jet, chacun son dé : leur face ne déclenche aucune compétence.'))
    // Revue des compétences (P2) : +14 PV, rang +6
    expect(text('harvest')).toBe("+14 PV si l'adversaire est empoisonné.")
    expect(text('harvest', 1)).toBe("+20 PV si l'adversaire est empoisonné.")
    // Revue des compétences (P1) : sans condition, triple puis +2 ; rang +1
    expect(text('virulence')).toBe("Triple le Poison de l'adversaire, puis +2.")
    expect(text('virulence', 1)).toBe("Triple le Poison de l'adversaire, puis +3.")
    // Revue des auras (A1) : 3 PV par soin, rang +3
    expect(text('sentence')).toBe("Chaque soin que son porteur reçoit fait perdre 3 PV à l'adversaire.")
    expect(text('sentence', 1)).toBe("Chaque soin que son porteur reçoit fait perdre 6 PV à l'adversaire.")
    expect(text('grudge')).toBe('Son prochain coup reçu lui donne un critique assuré.')
    expect(text('grudge', 1)).toBe('Ses 2 prochains coups reçus lui donnent chacun un critique assuré.')
    // Plus de pastille de condition : elle est dans la ligne
    for (const id of ['quarry', 'harvest', 'virulence']) expect(describeSkill(skill(id)).tags.map((t) => t.label).join(' ')).not.toMatch(/\bsi\b/)
    expect(describeSkill(skill('sentence')).tags.map((t) => t.label)).toEqual(expect.arrayContaining(['aura permanente', typeset('Sentence : 2 charges au plus')]))
  })

  it('Curée : si l’adversaire saigne, trois coups de base bruts par charge juste après le coup de base de son jet ; sinon, sa face est nue', () => {
    const bleeding = ev('turnStart', [{ type: 'applyStatus', status: 'bleed', stacks: 1, target: 'opponent' }])
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [bleeding]), 'quarry', rank), testCharacter('b', { maxHp: 400 })])
      const quarries = fired(r, 'quarry')
      expect(quarries.length).toBeGreaterThan(3)
      for (const e of quarries) {
        const roll = r.beats[e.cause!]
        expect(roll.type).toBe('roll')
        const base = ofType(r, 'attack').find((x) => x.cause === roll.id)!
        const burst = ofType(r, 'flurry').find((f) => f.cause === e.id)!
        expect(burst).toMatchObject({ side: 0, status: 'quarry', strikes: 3 * (rank + 1) })
        // Le coup de base de son jet d'abord, puis la rafale, avant tout autre coup ; ses coups sont bruts
        expect(base.attack.plain).toBeUndefined()
        expect(burst.id).toBeGreaterThan(base.id)
        expect(ofType(r, 'attack').filter((x) => x.id > base.id && x.id < burst.id)).toEqual([])
        const strikes = ofType(r, 'attack').filter((x) => x.cause === burst.id)
        if (burst.turn !== r.turns) expect(strikes).toHaveLength(3 * (rank + 1))
        for (const s of strikes) expect(s.attack.plain).toBe(true)
        expect(stacksOf(burst.state.statuses[0], 'quarry')).toBe(0)
      }
    }
    // Sans Saignement : sa face 3 est nue, ni étape roll, ni Curée, ni rafale
    const dry = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'quarry'), testCharacter('b', { maxHp: 400 })])
    expect(fired(dry, 'quarry')).toEqual([])
    expect(ofType(dry, 'roll')).toEqual([])
    expect(ofType(dry, 'flurry')).toEqual([])
  })

  it('Récolte : +14 PV si l’adversaire est empoisonné, seulement alors', () => {
    const poisoner = ev('turnStart', [{ type: 'applyStatus', status: 'poison', stacks: 1, target: 'opponent' }])
    const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [poisoner]), 'harvest'), testCharacter('b', { maxHp: 400, attackMin: 9, attackMax: 9 })])
    const harvests = fired(r, 'harvest')
    expect(harvests.length).toBeGreaterThan(3)
    for (const e of harvests) {
      const before = r.beats[e.id - 1].state
      expect(stacksOf(before.statuses[1], 'poison')).toBeGreaterThan(0)
      expect(e.event.effects).toEqual([{ type: 'heal', target: 0, amount: Math.min(14, 400 - before.hp[0]) }])
    }
    const dry = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'harvest'), testCharacter('b', { maxHp: 400, attackMin: 9, attackMax: 9 })])
    expect(fired(dry, 'harvest')).toEqual([])
  })

  it('Virulence (`fromStatus`, sans condition depuis la revue P1) : triple le Poison de l’adversaire, lu quand elle part, puis +2 ; son rang ajoute 1 Poison ; sur un adversaire sain, elle pose ses 2', () => {
    const poisoner = ev('turnStart', [{ type: 'applyStatus', status: 'poison', stacks: 1, target: 'opponent' }])
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 2000 }, [poisoner]), 'virulence', rank), testCharacter('b', { maxHp: 2000 })])
      const virulences = fired(r, 'virulence')
      expect(virulences.length).toBeGreaterThan(3)
      for (const e of virulences) {
        const before = stacksOf(r.beats[e.id - 1].state.statuses[1], 'poison')
        expect(before).toBeGreaterThan(0)
        expect(e.event.effects[0]).toMatchObject({ type: 'applyStatus', status: 'poison', target: 1, stacks: 2 * before + 2 + rank })
        expect(stacksOf(e.state.statuses[1], 'poison')).toBe(3 * before + 2 + rank)
      }
    }
    // Sans Poison : elle part à chaque 3 et pose ses 2 charges (tripler zéro ne fait rien, le +2 si)
    const dry = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'virulence'), testCharacter('b', { maxHp: 400 })])
    const fresh = fired(dry, 'virulence').filter((e) => stacksOf(dry.beats[e.id - 1].state.statuses[1], 'poison') === 0)
    expect(fresh.length).toBeGreaterThan(0)
    for (const e of fresh) expect(e.event.effects[0]).toMatchObject({ type: 'applyStatus', status: 'poison', target: 1, stacks: 2 })
    // Un facteur entier ≥ 1
    const half: CharacterEvent = { ...skill('virulence'), id: 'half', effects: [{ type: 'applyStatus', status: 'poison', stacks: 0, target: 'opponent', fromStatus: { status: 'poison', who: 'opponent', factor: 0.5 } }] }
    expect(validateRoster([{ ...createCharacter('morgrut').definition, events: [half] }]).some((p) => p.includes('fromStatus'))).toBe(true)
  })

  it('Sentence : chaque soin de son porteur coûte 3 PV par charge à l’adversaire (dégâts directs, revue A1), sans chaîne ; 2 charges au plus', () => {
    const holy = ev('combatStart', [{ type: 'applyStatus', status: 'holyAura', stacks: 1 }])
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [holy]), 'sentence', rank), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4 })])
      const reactions = ofType(r, 'statusReaction').filter((b) => b.status === 'sentence')
      expect(reactions.length).toBeGreaterThan(5)
      for (const b of reactions) {
        const held = r.beats[b.id - 1].state.statuses[0].find((s) => s.id === 'sentence')!
        expect(held.stacks).toBeLessThanOrEqual(2)
        expect(b.trigger).toBe('healed')
        expect(b.effects).toEqual([{ type: 'damage', target: 1, amount: 3 * (held.stacks + rank), source: 'holy' }])
        // Sa cause : l'étape qui a soigné son porteur
        const cause = r.beats[b.cause!]
        expect(cause.type === 'statusTick' && cause.effects.some((e) => e.type === 'heal' && e.target === 0 && e.amount > 0)).toBe(true)
      }
      expect(reactions.some((b) => r.beats[b.id - 1].state.statuses[0].find((s) => s.id === 'sentence')!.stacks === 2)).toBe(true)
    }
  })

  it('Rancune : chaque coup qui touche son porteur lui donne un Critique assuré, une charge par coup encaissé', () => {
    const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'grudge'), testCharacter('b', { maxHp: 400 })])
    const reactions = ofType(r, 'statusReaction').filter((b) => b.status === 'grudge')
    expect(reactions.length).toBeGreaterThan(3)
    for (const b of reactions) {
      expect(b).toMatchObject({ side: 0, trigger: 'hurt' })
      expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'guaranteedCrit', stacks: 1 })])
      expect(stacksOf(b.state.statuses[0], 'grudge')).toBe(stacksOf(r.beats[b.id - 1].state.statuses[0], 'grudge') - 1)
      // Sa prochaine frappe porte le critique : critique si elle touche, perdu si elle est esquivée (B8)
      const next = ofType(r, 'attack').find((x) => x.id > b.id && x.attack.attacker === 0 && !x.attack.replaced && !x.attack.jinxed)
      if (next) expect(next.attack).toMatchObject({ crit: !next.attack.dodged, critForced: true })
    }
  })
})

describe('phase 8, second lot : quatre consommatrices, trois moments, quatre reliques', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  /** La compétence gravée sur le 3, aiguisée `rank` fois (rang I : 0) */
  const engraved = (c: Character, id: string, rank = 0) =>
    c.withForge([{ op: 'engrave', face: 3, skill: skill(id) }, ...Array.from({ length: rank }, (): ForgeStep => ({ op: 'sharpen', face: 3 }))])
  const reactions = (r: CombatResult, status: StatusId) => ofType(r, 'statusReaction').filter((b) => b.status === status)
  const relicBeats = (r: CombatResult, id: string) => ofType(r, 'relic').filter((b) => b.relic === id)
  /** Le coup `j` vide-t-il un bouclier du camp `side` ? */
  const emptied = (r: CombatResult, j: number, side: 0 | 1) => {
    const b = r.beats[j]
    return b.type === 'attack' && b.attack.attacker !== side && b.attack.shields.some((sh) => r.beats[j - 1].state.statuses[side].find((x) => x.id === sh.status)?.stacks === sh.absorbed)
  }

  it('les quatre au roster, gravables, leurs textes courts et leur rang', () => {
    expect(validateRoster()).toEqual([])
    const text = (id: string, rank = 0) => describeSkill(engraved(createCharacter('morgrut'), id, rank).events.find((e) => e.id === id)!).text
    // Passe compendium (2026-10-25) : une charge par jet n'est pas une limite par combat, plus de « 1x » ; le détail dit le reste.
    // Revue des compétences (T6, T4, O2) et des auras (A3, A2) : la condition en tête, le coup ×6, l'armure, +6 Ferveur
    expect(text('conflagration')).toBe("Si l'adversaire brûle, son prochain coup qui touche lui fait perdre trois fois sa Brûlure.")
    expect(text('conflagration', 1)).toBe("Si l'adversaire brûle, son prochain coup qui touche lui fait perdre quatre fois sa Brûlure.")
    // Le Dé pipé, une aura depuis les Maîtrises (M9) : sa chance de pile ; son rang, +25 % de plus
    expect(text('loaded-die')).toBe(typeset('+25 % de chances de faire pile à ses pièces.'))
    expect(text('loaded-die', 1)).toBe(typeset('+50 % de chances de faire pile à ses pièces.'))
    expect(text('bristling-rampart')).toBe("+2 Aura d'épines et +2 armure temporaire quand son armure temporaire est vidée.")
    expect(text('bristling-rampart', 1)).toBe("+4 Aura d'épines et +4 armure temporaire quand son armure temporaire est vidée.")
    expect(text('vendetta')).toBe('+6 Ferveur chaque fois que son porteur renvoie des dégâts.')
    expect(text('vendetta', 1)).toBe('+12 Ferveur chaque fois que son porteur renvoie des dégâts.')
    for (const id of ['bristling-rampart', 'vendetta']) expect(describeSkill(skill(id)).tags.map((t) => t.label)).toContain('aura permanente')
    for (const id of ['conflagration', 'loaded-die', 'bristling-rampart', 'vendetta']) expect(rankText(skill(id))).not.toBe('ne s’aiguise pas')
  })

  it('Embrasement : le coup qui touche un adversaire qui brûle relâche 3 fois sa Brûlure restante, l’éteint, et perd une charge ; sans Brûlure, la charge attend', () => {
    const burner = ev('turnStart', [{ type: 'applyStatus', status: 'burn', stacks: 3, target: 'opponent' }])
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 2000 }, [burner]), 'conflagration', rank), testCharacter('b', { maxHp: 2000 })])
      const fired = reactions(r, 'conflagration')
      expect(fired.length).toBeGreaterThan(5)
      for (const b of fired) {
        const before = r.beats[b.id - 1].state
        const burn = before.statuses[1].find((s) => s.id === 'burn')!
        expect(b).toMatchObject({ side: 0, trigger: 'hit' })
        expect(r.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 0 } })
        expect(b.effects).toEqual([{ type: 'damage', target: 1, amount: (3 + rank) * burn.stacks * burn.turns!, source: 'burn' }])
        expect(stacksOf(b.state.statuses[1], 'burn')).toBe(0)
        expect(stacksOf(b.state.statuses[0], 'conflagration')).toBe(stacksOf(before.statuses[0], 'conflagration') - 1)
      }
    }
    // Sans Brûlure : aucune relâche, et les charges s'accumulent en attendant (un mécanisme : aucune purge ne les retire)
    const dry = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'conflagration'), testCharacter('b', { maxHp: 400 })])
    expect(reactions(dry, 'conflagration')).toEqual([])
    expect(stacksOf(finalState(dry).statuses[0], 'conflagration')).toBeGreaterThan(3)
    expect(STATUSES.conflagration.mechanic).toBe('skill')
  })

  it('Dé pipé, une aura (Maîtrises, M9) : +25 % de chances de faire pile par charge à toutes ses pièces, sous le plafond de 5 sur 6 ; pile vaut toujours ×3 ; il ne s’use pas', () => {
    const coin = ev('turnStart', [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }])
    const loaded = (stacks: number) => ev('combatStart', [{ type: 'applyStatus', status: 'loadedDie', stacks }])
    const heads = (stacks: number) => {
      const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap((seed) => ofType(run([testCharacter('a', { maxHp: 400 }, [loaded(stacks), coin]), testCharacter('b', { maxHp: 400 })], seed), 'coin'))
      for (const b of all.filter((x) => x.heads)) expect(b.effects).toEqual([{ type: 'damage', target: 1, amount: 1 * (COIN_HEADS - 1), source: 'strike' }])
      // L'aura reste, charges comprises
      for (const b of all) expect(stacksOf(b.state.statuses[0], 'loadedDie')).toBe(stacks)
      return all.filter((x) => x.heads).length / all.length
    }
    expect(heads(1)).toBeCloseTo(0.75, 1)
    expect(heads(2)).toBeCloseTo(HEADS_CAP, 1)
    expect(describeSkill(skill('loaded-die')).text).toBe(typeset('+25 % de chances de faire pile à ses pièces.'))
    // Mode triche : la pièce imposée (face) reste face
    const forced = runOn(2, [testCharacter('a', { maxHp: 400 }, [loaded(2), coin]), testCharacter('b', { maxHp: 400 })])
    expect(ofType(forced, 'coin').find((b) => b.side === 0)).toMatchObject({ heads: false, forced: true })
  })

  it('armure vidée (`shieldBroken`) : le Rempart hérissé donne 2 Épines acérées et 2 armure temporaire par charge (revue A3) à chaque coup qui vide l’armure temporaire de son porteur, et seulement alors', () => {
    const shield = ev('turnStart', [{ type: 'applyStatus', status: 'bonusArmor', stacks: 1 }])
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 2000 }, [shield]), 'bristling-rampart', rank), testCharacter('b', { maxHp: 2000, attackMin: 30, attackMax: 30 })])
      const fired = reactions(r, 'bristlingRampart')
      expect(fired.length).toBeGreaterThan(5)
      for (const b of fired) {
        expect(b).toMatchObject({ side: 0, trigger: 'shieldBroken' })
        expect(emptied(r, b.cause!, 0)).toBe(true)
        const held = r.beats[b.cause! - 1].state.statuses[0].find((s) => s.id === 'bristlingRampart')!
        expect(b.effects).toEqual([
          expect.objectContaining({ type: 'applyStatus', target: 0, status: 'thorns', stacks: 2 * (held.stacks + rank) }),
          expect.objectContaining({ type: 'applyStatus', target: 0, status: 'bonusArmor', stacks: 2 * (held.stacks + rank) }),
        ])
        // L'armure qu'il redonne est là après le coup : la prochaine armure vidée
        expect(stacksOf(b.state.statuses[0], 'bonusArmor')).toBeGreaterThanOrEqual(2 * (held.stacks + rank))
      }
      // Chaque coup qui vide son armure, quand le Rempart était là au début du coup, le fait réagir
      for (const a of ofType(r, 'attack'))
        if (emptied(r, a.id, 0) && r.beats[a.id - 1].state.statuses[0].some((s) => s.id === 'bristlingRampart') && a.state.hp.every((h) => h > 0))
          expect(fired.some((b) => b.cause === a.id)).toBe(true)
    }
    // Une armure qui ne se vide pas : aucun Rempart
    const thick = ev('combatStart', [{ type: 'applyStatus', status: 'bonusArmor', stacks: 1000 }])
    const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [thick]), 'bristling-rampart'), testCharacter('b', { maxHp: 400, attackMin: 3, attackMax: 3 })])
    expect(reactions(r, 'bristlingRampart')).toEqual([])
  })

  it('dégâts renvoyés (`reflected`) : la Vindicte donne 6 Ferveur par charge (revue A2) après chaque Riposte qui rend une part du coup, l’étape de la Riposte pour cause', () => {
    const riposte = ev('turnStart', [{ type: 'applyStatus', status: 'riposte', stacks: 1 }])
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [riposte]), 'vendetta', rank), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4 })])
      const fired = reactions(r, 'vendetta')
      expect(fired.length).toBeGreaterThan(5)
      for (const b of fired) {
        expect(b).toMatchObject({ side: 0, trigger: 'reflected' })
        const cause = r.beats[b.cause!]
        expect(cause).toMatchObject({ type: 'statusReaction', status: 'riposte', side: 0 })
        const held = r.beats[b.id - 1].state.statuses[0].find((s) => s.id === 'vendetta')!
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'momentum', stacks: 6 * (held.stacks + rank) })])
      }
    }
    // La Rétribution qui relâche ses jauges renvoie aussi des dégâts : la Vindicte y répond, la Rétribution pour cause
    const retribution = ev('naturalThree', [{ type: 'release', status: 'retribution', min: 1, target: 'opponent', source: 'strike' }], 'rel')
    const vendetta = ev('combatStart', [{ type: 'applyStatus', status: 'vendetta', stacks: 1 }], 'v')
    const r = runOn(3, [testCharacter('a', { maxHp: 400 }, [vendetta, retribution]), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4 })])
    const fromRelease = reactions(r, 'vendetta').filter((b) => r.beats[b.cause!].type === 'event')
    expect(fromRelease.length).toBeGreaterThan(3)
  })

  it('pile (`heads`) et les quatre reliques : chacune part à son moment, son étape pour cause', () => {
    const pick = (id: string) => getRelic(id)
    // Soufflet de forge : +3 au coup qui touche un adversaire qui brûle
    const burner = ev('turnStart', [{ type: 'applyStatus', status: 'burn', stacks: 3, target: 'opponent' }])
    const bellows = run([testCharacter('a', { maxHp: 400 }, [burner]).withRelics([pick('forge-bellows')]), testCharacter('b', { maxHp: 400 })])
    const mine = ofType(bellows, 'attack').filter((b) => b.attack.attacker === 0 && !b.attack.dodged)
    for (const b of mine) expect(b.attack.relicBonus).toEqual([{ relic: 'forge-bellows', name: 'Soufflet de forge', amount: 3 }])
    // Clous de pavois : 3 dégâts directs à l'attaquant, sur le coup qui vide l'armure temporaire
    const shield = ev('turnStart', [{ type: 'applyStatus', status: 'bonusArmor', stacks: 1 }])
    const nails = run([testCharacter('a', { maxHp: 400 }, [shield]).withRelics([pick('pavise-nails')]), testCharacter('b', { maxHp: 400, attackMin: 3, attackMax: 3 })])
    expect(relicBeats(nails, 'pavise-nails').length).toBeGreaterThan(5)
    for (const b of relicBeats(nails, 'pavise-nails')) {
      expect(emptied(nails, b.cause!, 0)).toBe(true)
      // Contre l'armure de l'attaquant (2026-10-27, M4) : b n'en a pas, les 3 passent
      expect(b.effects).toEqual([{ type: 'damage', target: 1, amount: 3, source: 'strike', armored: true }])
    }
    // Gantelet du talion : +1 PV après chaque Riposte
    const riposte = ev('turnStart', [{ type: 'applyStatus', status: 'riposte', stacks: 1 }])
    const gauntlet = run([testCharacter('a', { maxHp: 400 }, [riposte]).withRelics([pick('talion-gauntlet')]), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4 })])
    expect(relicBeats(gauntlet, 'talion-gauntlet').length).toBeGreaterThan(5)
    for (const b of relicBeats(gauntlet, 'talion-gauntlet')) {
      expect(gauntlet.beats[b.cause!]).toMatchObject({ type: 'statusReaction', status: 'riposte', side: 0 })
      expect(b.effects).toEqual([{ type: 'heal', target: 0, amount: 1 }])
    }
    // Pièce trouée : +2 Coup de chance sur pile, la pièce pour cause ; jamais sur face
    const coin = ev('turnStart', [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }])
    const holed = run([testCharacter('a', { maxHp: 400 }, [coin]).withRelics([pick('holed-coin')]), testCharacter('b', { maxHp: 400 })])
    const heads = ofType(holed, 'coin').filter((b) => b.side === 0 && b.heads)
    expect(heads.length).toBeGreaterThan(3)
    for (const b of relicBeats(holed, 'holed-coin')) {
      expect(holed.beats[b.cause!]).toMatchObject({ type: 'coin', side: 0, heads: true })
      expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'luckyStrike', stacks: 2 })])
    }
    expect(relicBeats(holed, 'holed-coin').length).toBe(heads.filter((b) => b.state.hp.every((h) => h > 0)).length)
  })

  it('offre pertinente : chacune ne vaut que chez qui produit sa ressource', () => {
    expect(skillNeeds(skill('conflagration'))).toEqual(['status:burn'])
    expect(skillNeeds(skill('loaded-die'))).toEqual(['moment:heads'])
    expect(skillNeeds(skill('bristling-rampart'))).toEqual(['moment:shieldBreak'])
    expect(skillNeeds(skill('vendetta'))).toEqual(['moment:reflect'])
    expect(relicNeeds(getRelic('forge-bellows'))).toEqual(['status:burn'])
    expect(relicNeeds(getRelic('pavise-nails'))).toEqual(['moment:shieldBreak'])
    expect(relicNeeds(getRelic('talion-gauntlet'))).toEqual(['moment:reflect'])
    expect(relicNeeds(getRelic('holed-coin'))).toEqual(['moment:heads'])
  })
})

describe('les reliques de source (2026-10-25) : Poison, Brûlure, pièce et renvoi pour tous', () => {
  const relicBeats = (r: CombatResult, id: string) => ofType(r, 'relic').filter((b) => b.relic === id)
  /** Chaque déclenchement d'une relique du dé suit un jet de 6 du porteur, son coup pour cause */
  const onSix = (r: CombatResult, id: string) => {
    const fired = relicBeats(r, id)
    for (const b of fired) expect(r.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 0, roll: DIE_FACES } })
    return fired
  }

  it('textes au style de l’utilisateur : l’effet d’abord, puis le moment, puis la limite', () => {
    expect(describeRelic(getRelic('wasp-sting')).text).toBe(typeset(`2 poison à l'adversaire sur un ${DIE_FACES}`))
    expect(describeRelic(getRelic('tinder-box')).text).toBe(typeset(`2 brûlure à l'adversaire sur un ${DIE_FACES}`))
    expect(describeRelic(getRelic('spiked-bracer')).text).toBe(typeset('+1 riposte au 1er tour'))
    for (const id of ['wasp-sting', 'tinder-box', 'spiked-bracer']) expect(describeRelic(getRelic(id)).text).not.toMatch(EMOJI)
  })

  it('Dard de guêpe et Briquet d’amadou : 2 Poison, 2 Brûlure à l’adversaire sur un 6', () => {
    for (const [id, status] of [['wasp-sting', 'poison'], ['tinder-box', 'burn']] as const) {
      let seen = 0
      for (let seed = 1; seed < 20; seed++) {
        const r = run([testCharacter('a', { maxHp: 200 }).withRelics([getRelic(id)]), testCharacter('b', { maxHp: 200 })], seed)
        for (const b of onSix(r, id)) {
          expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 1, status, stacks: 2 })])
          expect(stacksOf(b.state.statuses[1], status)).toBeGreaterThanOrEqual(2)
          seen++
        }
      }
      expect(seen, id).toBeGreaterThan(10)
    }
  })

  it('Brassard à pointes : 1 Riposte au début de son 1er tour, une seule fois', () => {
    for (let seed = 1; seed < 10; seed++) {
      const r = run([testCharacter('a', { maxHp: 200 }).withRelics([getRelic('spiked-bracer')]), testCharacter('b', { maxHp: 200 })], seed)
      const fired = relicBeats(r, 'spiked-bracer')
      expect(fired).toHaveLength(1)
      expect(fired[0].effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'riposte', stacks: 1 })])
      expect(ofType(r, 'statusReaction').filter((b) => b.status === 'riposte' && b.side === 0).length).toBeLessThanOrEqual(1)
    }
  })

  it('offre : sans besoin, offertes à tous ; elles ouvrent leurs consommatrices', () => {
    for (const id of ['wasp-sting', 'tinder-box', 'spiked-bracer']) expect(relicNeeds(getRelic(id)), id).toEqual([])
  })
})

describe('retour du 2026-10-27 : les pièces de la Fortune, et trois reliques (docs/RELIQUES.md § 17)', () => {
  const relicBeats = (r: CombatResult, id: string) => ofType(r, 'relic').filter((b) => b.relic === id)
  const coinSkill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  /** La compétence de pièce sur le 1 du lanceur (elle modifie son coup, comme Pile ou face), `power` : son rang */
  const thrower = (id: string, relics: Relic[] = [], power = 0, more: CharacterEvent[] = []) => {
    const skill = coinSkill(id)
    const effects = power ? skill.effects.map((e) => (e.type === 'applyStatus' ? { ...e, power } : e)) : skill.effects
    return testCharacter('a', { maxHp: 400 }, [...more, { ...skill, trigger: 'naturalOne', effects }]).withRelics(relics)
  }
  const coins = (fighter: Character, n = 80) => Array.from({ length: n }, (_, k) => ofType(run([fighter, testCharacter('b', { maxHp: 400 })], k + 1), 'coin')).flat()

  it('les pièces sont des compétences gravables de la Fortune (Naraxes, Fanchon), jamais des reliques', () => {
    for (const id of ['lucky-coin', 'cursed-coin']) {
      expect(relationOf(coinSkill(id)), id).toBe('modify')
      expect(masteryOfSkill(id), id).toBe('chance')
      for (const owner of ['naraxes', 'fanchon']) expect(characterPool(createCharacter(owner).definition).some((e) => e.id === id), `${owner} ${id}`).toBe(true)
    }
    expect(RELIC_IDS).not.toContain('fair-coin')
    expect(RELICS.flatMap((r) => r.effects ?? []).some((e) => e.type === 'applyStatus' && STATUSES[e.status].coinToss)).toBe(false)
  })

  it('Pièce porte-bonheur : juste après le coup qui la pose, une pièce ; pile, un critique assuré qui fait des dégâts en plus (B8) ; face, rien', () => {
    const all = coins(thrower('lucky-coin'))
    for (const c of all) {
      expect(c).toMatchObject({ side: 0, status: 'luckyCoin' })
      if (c.heads) {
        expect(c.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'guaranteedCrit', stacks: 1 })])
        expect(c.state.statuses[0].find((s) => s.id === 'guaranteedCrit')).toMatchObject({ stacks: 1, power: LUCKY_COIN_POWER })
      }
      else expect(c.effects).toEqual([])
      expect(stacksOf(c.state.statuses[0], 'luckyCoin')).toBe(0)
    }
    expect(all.filter((c) => c.heads).length).toBeGreaterThan(20)
    expect(all.filter((c) => !c.heads).length).toBeGreaterThan(20)
  })

  it('Pièce maudite : pile, l’adversaire perd sa prochaine action ; face, rien', () => {
    let stunned = 0
    for (let seed = 1; seed < 80; seed++) {
      const r = run([thrower('cursed-coin'), testCharacter('b', { maxHp: 400 })], seed)
      for (const c of ofType(r, 'coin')) {
        if (!c.heads) {
          expect(c.effects).toEqual([])
          continue
        }
        expect(c.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 1, status: 'stunned', stacks: 1 })])
        // Le tour suivant (celui de b) : aucun coup de b
        const next = r.beats.filter((b) => b.turn === c.turn + 1)
        if (next.length) expect(next.some((b) => b.type === 'attack' && b.attack.attacker === 1)).toBe(false)
        stunned++
      }
    }
    expect(stunned).toBeGreaterThan(20)
  })

  it('rang d’une pièce d’effet : pile plus souvent (1 chance sur 6 par rang) ; la Pièce lestée aussi (+25 %), au plus 5 sur 6', () => {
    const rate = (list: Extract<Beat, { type: 'coin' }>[]) => list.filter((c) => c.heads).length / list.length
    expect(rate(coins(thrower('lucky-coin'), 150))).toBeCloseTo(0.5, 1)
    expect(rate(coins(thrower('lucky-coin', [], 1), 150))).toBeCloseTo(4 / 6, 1)
    expect(rate(coins(thrower('lucky-coin', [getRelic('weighted-coin')]), 150))).toBeCloseTo(0.75, 1)
    // Rang II et Pièce lestée : 1/2 + 2/6 + 1/4 dépasse le plafond, 5 sur 6
    expect(rate(coins(thrower('lucky-coin', [getRelic('weighted-coin')], 2), 150))).toBeCloseTo(HEADS_CAP, 1)
    // Pile ou face (la pièce qui frappe) : la Pièce lestée la sert aussi
    expect(rate(coins(thrower('coin-flip', [getRelic('weighted-coin')]), 150))).toBeCloseTo(0.75, 1)
    expect(describeRelic(getRelic('weighted-coin')).text).toBe(typeset('+25 % de chances de faire pile'))
    expect(relicNeeds(getRelic('weighted-coin'))).toEqual(['moment:heads'])
  })

  it('Dé pipé (aura, M9) : il sert aussi les pièces d’effet, en plus de la Pièce lestée, toujours sous 5 sur 6', () => {
    const rate = (list: Extract<Beat, { type: 'coin' }>[]) => list.filter((c) => c.heads).length / list.length
    const loaded: CharacterEvent = { id: 'pipe', name: 'pipe', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'loadedDie', stacks: 1 }] }
    expect(rate(coins(thrower('cursed-coin', [], 0, [loaded]), 150))).toBeCloseTo(0.75, 1)
    expect(rate(coins(thrower('cursed-coin', [getRelic('weighted-coin')], 0, [loaded]), 150))).toBeCloseTo(HEADS_CAP, 1)
  })

  it('Médaille de sursis : le premier coup qui devrait tuer laisse son porteur à 1 PV (compté en entier), une fois', () => {
    const brute = testCharacter('b', { maxHp: 400, attackMin: 30, attackMax: 30 })
    for (let seed = 1; seed < 15; seed++) {
      const r = run([testCharacter('a', { maxHp: 20 }).withRelics([getRelic('reprieve-medal')]), brute], seed)
      const [medal, ...rest] = relicBeats(r, 'reprieve-medal')
      expect(rest).toEqual([])
      expect(medal).toMatchObject({ side: 0, effects: [], uses: 1, cause: medal.id - 1 })
      const blow = r.beats[medal.id - 1]
      expect(blow).toMatchObject({ type: 'attack', attack: { attacker: 1, dealt: 30 } })
      expect(blow.state.hp[0]).toBe(1)
      // Le coup suivant qui touche l'achève
      expect(r.winner).toBe(1)
      // Sans elle, le même coup l'abat
      const bare = run([testCharacter('a', { maxHp: 20 }), brute], seed)
      expect(bare.beats.find((b) => b.type === 'attack' && b.attack.attacker === 1 && !b.attack.dodged)?.state.hp[0]).toBe(0)
    }
    expect(describeRelic(getRelic('reprieve-medal')).text).toBe(typeset('Reste à 1 PV quand il devrait tomber, 1x'))
  })

  it('Médaille de sursis : aussi contre une perte qui n’est pas un coup (Poison)', () => {
    const venom: CharacterEvent = { id: 'venom', name: 'venom', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'poison', stacks: 40, target: 'opponent' }] }
    const r = run([testCharacter('a', { maxHp: 10, attackMin: 1, attackMax: 1 }).withRelics([getRelic('reprieve-medal')]), testCharacter('b', { maxHp: 400, attackMin: 1, attackMax: 1 }, [venom])])
    const [medal] = relicBeats(r, 'reprieve-medal')
    expect(r.beats[medal.cause!]).toMatchObject({ type: 'statusTick', side: 0 })
    expect(r.beats[medal.cause!].state.hp[0]).toBe(1)
  })

  it('Cor d’avant-garde : son porteur commence, sans jet d’initiative ; si les deux en portent un, le jet revient', () => {
    const horn = getRelic('vanguard-horn')
    for (let seed = 1; seed < 20; seed++)
      for (const side of [0, 1] as const) {
        const pair: Pair<Character> = [testCharacter('a', { maxHp: 100 }), testCharacter('b', { maxHp: 100 })]
        pair[side] = pair[side].withRelics([horn])
        const r = run(pair, seed)
        expect(r.initiative).toEqual([])
        expect(r.initiativeRelic).toEqual({ side, relic: 'vanguard-horn' })
        expect(firstSide(r)).toBe(side)
        expect(r.beats[0]).toMatchObject({ type: 'relic', side, relic: 'vanguard-horn', effects: [], uses: 1, turn: 0 })
        expect(r.beats.find((b) => b.turn === 1)).toBeDefined()
        expect(r.beats.find((b) => b.type === 'attack')).toMatchObject({ attack: { attacker: side } })
        expect(traceText(r)).toContain('sans jet')
      }
    const both = run([testCharacter('a', { maxHp: 100 }).withRelics([horn]), testCharacter('b', { maxHp: 100 }).withRelics([horn])])
    expect(both.initiative.length).toBeGreaterThan(0)
    expect(both.initiativeRelic).toBeUndefined()
    expect(relicBeats(both, 'vanguard-horn')).toEqual([])
    expect(describeRelic(horn).text).toBe(typeset("Joue le premier tour sans jet d'initiative"))
  })
})

describe('revue des auras et des compétences (docs/REVUE_COMPETENCES.md)', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  /** La compétence gravée sur le 3, aiguisée `rank` fois (rang I : 0) */
  const engraved = (c: Character, id: string, rank = 0) =>
    c.withForge([{ op: 'engrave', face: 3, skill: skill(id) }, ...Array.from({ length: rank }, (): ForgeStep => ({ op: 'sharpen', face: 3 }))])
  const reactions = (r: CombatResult, status: StatusId) => ofType(r, 'statusReaction').filter((b) => b.status === status)
  const text = (id: string, rank = 0) => describeSkill(engraved(createCharacter('morgrut'), id, rank).events.find((e) => e.id === id)!).text

  it('les textes : trois auras nouvelles et les retouches, au style de l’utilisateur (T1 à T7, A5, P3 à P5)', () => {
    expect(validateRoster()).toEqual([])
    expect(text('faith-shield')).toBe('Chaque soin que son porteur reçoit lui donne +2 armure temporaire.')
    expect(text('faith-shield', 1)).toBe('Chaque soin que son porteur reçoit lui donne +4 armure temporaire.')
    expect(text('sidestep')).toBe(typeset("+8 % d'esquive."))
    expect(text('sidestep', 1)).toBe(typeset("+16 % d'esquive."))
    expect(text('open-wound')).toBe("1 Saignement à l'adversaire à chaque coup qui touche.")
    expect(text('open-wound', 1)).toBe("2 Saignement à l'adversaire à chaque coup qui touche.")
    for (const id of ['faith-shield', 'sidestep', 'open-wound']) {
      expect(describeSkill(skill(id)).tags.map((t) => t.label)).toContain('aura permanente')
      expect(rankText(skill(id))).not.toBe('ne s’aiguise pas')
    }
    // T1 : l'effet d'abord, la condition ensuite ; la pièce garde la sienne en tête
    expect(text('cleave')).toBe("L'adversaire saigne de la moitié des dégâts de ce coup, s'il touche.")
    expect(text('cleave', 1)).toBe("L'adversaire saigne de la moitié des dégâts de ce coup, +2, s'il touche.")
    expect(text('coin-flip')).toBe(typeset("S'il touche, une pièce : pile, ce coup ×3 ; face, rien."))
    // T2, T3, T7, A5
    expect(describeSkill(skill('evasion')).detail).toBe(typeset("Une seule à la fois : une nouvelle pose ne s'ajoute pas."))
    expect(text('thorns')).toBe("1 Saignement à l'attaquant à chaque coup reçu, jusqu'à la fin du combat.")
    expect(text('crescendo')).toBe("Ce coup ×2, puis ×1 de plus à chaque fois qu'il touche.")
    // Ce qu'elle fait aux auras de l'adversaire est une interaction : le compendium ne la dit plus (retour du 2026-10-27, C3)
    expect(describeSkill(skill('immunity-aura')).detail).toBeUndefined()
    // P3, P4, P5
    expect(text('life-steal')).toBe("Ce coup lui rend les PV qu'il retire, +4.")
    expect(text('life-steal', 1)).toBe("Ce coup lui rend les PV qu'il retire, +8.")
    expect(text('false-note')).toBe("Les 2 prochains coups de l'adversaire qui touchent font −4 dégâts.")
    expect(text('false-note', 1)).toBe("Les 3 prochains coups de l'adversaire qui touchent font −4 dégâts.")
    expect(text('whistle')).toBe('+3 PV à la fin de ses 2 prochains tours (6 en tout).')
    // A4 : la pose qui monte se lit au détail, et sur l'anneau
    expect(describeSkill(skill('power-aura')).detail).toBe(typeset("Après le critique, avant l'armure. Chaque nouvelle pose ajoute +1, jusqu'à +4."))
    expect(describeSkill(skill('power-aura')).tags.map((t) => t.label)).toEqual(expect.arrayContaining(['se cumule', typeset('Aura de puissance : 3 charges au plus')]))
  })

  it('Bouclier de foi (I1) : chaque soin reçu donne 2 armure temporaire par charge, le soin pour cause, et seulement alors', () => {
    const holy = ev('combatStart', [{ type: 'applyStatus', status: 'holyAura', stacks: 1 }])
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [holy]), 'faith-shield', rank), testCharacter('b', { maxHp: 400, attackMin: 6, attackMax: 6 })])
      const fired = reactions(r, 'faithShield')
      expect(fired.length).toBeGreaterThan(5)
      for (const b of fired) {
        const held = r.beats[b.id - 1].state.statuses[0].find((s) => s.id === 'faithShield')!
        expect(b).toMatchObject({ side: 0, trigger: 'healed' })
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'bonusArmor', stacks: 2 * (held.stacks + rank) })])
        const cause = r.beats[b.cause!]
        expect(cause.type === 'statusTick' && cause.effects.some((e) => e.type === 'heal' && e.target === 0 && e.amount > 0)).toBe(true)
      }
    }
    // Sans soin, rien
    const dry = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'faith-shield'), testCharacter('b', { maxHp: 400 })])
    expect(reactions(dry, 'faithShield')).toEqual([])
  })

  it('Pas de côté (I3) : +8 % d’esquive par charge, cumulable', () => {
    const base = createCharacter('fanchon')
    expect(effectiveStats(base, [{ id: 'sidestep', stacks: 2 }]).dodgeChance).toBeCloseTo(base.stats.dodgeChance + 0.16)
    const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'sidestep'), testCharacter('b', { maxHp: 400 })])
    const posed = ofType(r, 'event').filter((b) => b.event.eventId === 'sidestep')
    expect(posed.length).toBeGreaterThan(3)
    posed.forEach((b, k) => expect(stacksOf(b.state.statuses[0], 'sidestep')).toBe(k + 1))
  })

  it('Plaie ouverte, refaite avec les Maîtrises (M9) : chaque coup de son porteur qui touche fait saigner l’adversaire de 1 par charge ; un coup esquivé, rien', () => {
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'open-wound', rank), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
      const fired = reactions(r, 'openWound')
      expect(fired.length).toBeGreaterThan(5)
      for (const b of fired) {
        const cause = r.beats[b.cause!]
        expect(cause).toMatchObject({ type: 'attack', attack: { attacker: 0, dodged: false } })
        const held = r.beats[b.cause! - 1].state.statuses[0].find((s) => s.id === 'openWound')!
        expect(b).toMatchObject({ side: 0, trigger: 'hit' })
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 1, status: 'bleed', stacks: held.stacks + rank })])
      }
    }
    const dry = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'open-wound'), testCharacter('b', { maxHp: 400, dodgeChance: 1 })])
    expect(reactions(dry, 'openWound')).toEqual([])
  })

  it('Fausse note (P4) : les deux prochains coups adverses qui touchent font −4, puis elle s’éteint', () => {
    const note = ev('combatStart', skill('false-note').effects)
    for (let seed = 1; seed < 6; seed++) {
      const r = run([testCharacter('a', { maxHp: 400 }, [note]), testCharacter('b', { maxHp: 400, attackMin: 9, attackMax: 9, dodgeChance: 0 })], seed)
      const touched = attacksOf(r).filter((x) => x.attacker === 1 && !x.dodged && !x.replaced)
      expect(touched.length).toBeGreaterThan(3)
      touched.forEach((x, k) => expect(x.modifiers.some((m) => m.status === 'falseNote' && m.delta === -4)).toBe(k < 2))
    }
  })

  it('Siffloter (P5) : 3 PV à la fin de ses deux prochains tours, une charge par tour', () => {
    const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'whistle'), testCharacter('b', { maxHp: 400, attackMin: 9, attackMax: 9 })])
    const ticks = ofType(r, 'statusTick').filter((b) => b.side === 0 && b.status === 'whistling')
    expect(ticks.length).toBeGreaterThan(3)
    for (const t of ticks) {
      const before = r.beats[t.id - 1].state
      expect(t.effects).toEqual([expect.objectContaining({ type: 'heal', target: 0, amount: Math.min(3, 400 - before.hp[0]) })])
      expect(stacksOf(t.state.statuses[0], 'whistling')).toBe(stacksOf(before.statuses[0], 'whistling') - 1)
    }
  })

  it('X2 : deux producteurs d’un même statut unique se gênent (`slot:`), et l’offre orientée en tient compte', () => {
    const pairs = [
      ['hollow-die', 'evasion', 'slot:evasion'],
      ['tinder-box', 'firefly', 'slot:burn'],
    ] as const
    for (const [relic, id, slot] of pairs) {
      const link = linkBetween(relicHooks(getRelic(relic)), eventHooks(skill(id)))
      expect(link.conflicts, relic).toEqual([slot])
      expect(link.feeds, relic).toEqual([])
    }
    // Deux producteurs d'un statut cumulable ne se gênent pas (le Dard de guêpe et le Souffle de la tombe, le Poison)
    expect(linkBetween(relicHooks(getRelic('wasp-sting')), eventHooks(skill('grave-breath'))).conflicts).toEqual([])
    // Le Briquet nourrit l'Embrasement ; chez Thaldrin, qui a déjà ses Feux follets, il gêne autant qu'il nourrit
    const withConflagration = (id: string) => buildHooks(createCharacter(id).withForge([{ op: 'engrave', face: 3, skill: skill('conflagration') }]))
    expect(echoOf(relicHooks(getRelic('tinder-box')), withConflagration('ervald'))).toBe(1)
    expect(echoOf(relicHooks(getRelic('tinder-box')), withConflagration('thaldrin'))).toBe(0)
  })
})

describe('phase 8, lot 3 : les fils minces (docs/SORTS.md § 28)', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  /** La compétence gravée sur le 3, aiguisée `rank` fois (rang I : 0) */
  const engraved = (c: Character, id: string, rank = 0) =>
    c.withForge([{ op: 'engrave', face: 3, skill: skill(id) }, ...Array.from({ length: rank }, (): ForgeStep => ({ op: 'sharpen', face: 3 }))])
  const reactions = (r: CombatResult, status: StatusId) => ofType(r, 'statusReaction').filter((b) => b.status === status)
  const text = (id: string, rank = 0) => describeSkill(engraved(createCharacter('brokk'), id, rank).events.find((e) => e.id === id)!).text

  it('les textes, au style de l’utilisateur, et leurs rangs', () => {
    expect(validateRoster()).toEqual([])
    expect(text('feint')).toBe(typeset("+5 % d'esquive. Chaque esquive lui donne un critique assuré."))
    expect(text('feint', 1)).toBe(typeset("+10 % d'esquive. Chaque esquive lui donne un critique assuré."))
    expect(text('black-sap')).toBe("Chaque soin que son porteur reçoit inflige 4 Poison à l'adversaire.")
    expect(text('black-sap', 1)).toBe("Chaque soin que son porteur reçoit inflige 8 Poison à l'adversaire.")
    expect(text('blood-debt')).toBe("L'adversaire saigne de 3 chaque fois que son porteur renvoie des dégâts.")
    expect(text('blood-debt', 1)).toBe("L'adversaire saigne de 6 chaque fois que son porteur renvoie des dégâts.")
    expect(text('stoke')).toBe("+2 à la Brûlure de l'adversaire, qui repart.")
    expect(text('stoke', 1)).toBe("+3 à la Brûlure de l'adversaire, qui repart.")
    expect(describeSkill(skill('stoke')).detail).toBe(typeset("Une Brûlure de 3 à un tour de sa fin devient une Brûlure de 5, pour 5 tours ; sans Brûlure, l'adversaire brûle de 2."))
    expect(text('storm-sky')).toBe("Au début de chacun de ses tours, l'adversaire perd 1 PV.")
    expect(text('storm-sky', 1)).toBe("Au début de chacun de ses tours, l'adversaire perd 2 PV.")
    expect(text('blood-frenzy')).toBe('Chacun de ses critiques lui donne deux coups de plus.')
    expect(text('blood-frenzy', 1)).toBe(typeset('Chacun de ses critiques lui donne deux coups de plus, et +5 % de critique.'))
    expect(text('stunning-blow')).toBe("S'il touche, l'adversaire perd sa prochaine action, 1x.")
    expect(text('stunning-blow', 1)).toBe("S'il touche, l'adversaire perd sa prochaine action, 2x.")
    for (const id of ['feint', 'black-sap', 'blood-debt', 'storm-sky', 'blood-frenzy']) expect(describeSkill(skill(id)).tags.map((t) => t.label)).toContain('aura permanente')
    for (const id of ['feint', 'black-sap', 'blood-debt', 'stoke', 'storm-sky', 'blood-frenzy', 'stunning-blow']) {
      expect(rankText(skill(id)), id).not.toBe('ne s’aiguise pas')
      expect(EMOJI.test(describeSkill(skill(id)).text), id).toBe(false)
    }
  })

  it('Feinte : +5 % d’esquive par charge ; chaque esquive de son porteur lui donne un critique assuré', () => {
    const base = createCharacter('naraxes')
    expect(effectiveStats(base, [{ id: 'feint', stacks: 2 }]).dodgeChance).toBeCloseTo(base.stats.dodgeChance + 0.1)
    expect(effectiveStats(base, [{ id: 'feint', stacks: 1, power: 1 }]).dodgeChance).toBeCloseTo(base.stats.dodgeChance + 0.1)
    const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400, dodgeChance: 0.4 }), 'feint'), testCharacter('b', { maxHp: 400 })])
    const fired = reactions(r, 'feint')
    expect(fired.length).toBeGreaterThan(5)
    for (const b of fired) {
      expect(r.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 1, dodged: true } })
      expect(b).toMatchObject({ side: 0, trigger: 'dodge' })
      expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'guaranteedCrit', stacks: 1 })])
    }
  })

  it('Sève noire : chaque soin reçu donne 4 Poison par charge à l’adversaire, le soin pour cause ; sans soin, rien', () => {
    const holy = ev('combatStart', [{ type: 'applyStatus', status: 'holyAura', stacks: 1 }])
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [holy]), 'black-sap', rank), testCharacter('b', { maxHp: 400, attackMin: 6, attackMax: 6 })])
      const fired = reactions(r, 'blackSap')
      expect(fired.length).toBeGreaterThan(5)
      for (const b of fired) {
        const held = r.beats[b.id - 1].state.statuses[0].find((s) => s.id === 'blackSap')!
        expect(b).toMatchObject({ side: 0, trigger: 'healed' })
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 1, status: 'poison', stacks: 4 * (held.stacks + rank) })])
      }
    }
    expect(reactions(runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'black-sap'), testCharacter('b', { maxHp: 400 })]), 'blackSap')).toEqual([])
  })

  it('Dette de sang : chaque renvoi fait saigner l’adversaire de 3 par charge', () => {
    const riposte = ev('turnStart', [{ type: 'applyStatus', status: 'riposte', stacks: 1 }])
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [riposte]), 'blood-debt', rank), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
      const fired = reactions(r, 'bloodDebt')
      expect(fired.length).toBeGreaterThan(3)
      for (const b of fired) {
        const held = r.beats[b.id - 1].state.statuses[0].find((s) => s.id === 'bloodDebt')!
        expect(b).toMatchObject({ side: 0, trigger: 'reflected' })
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 1, status: 'bleed', stacks: 3 * (held.stacks + rank) })])
      }
    }
  })

  it('Attiser : +2 à la Brûlure de l’adversaire, qui se remplace et repart ; sans Brûlure, 2', () => {
    for (const start of [0, 3])
      for (const rank of [0, 1]) {
        const burn = ev('combatStart', start ? [{ type: 'applyStatus', status: 'burn', stacks: start, target: 'opponent' }] : [])
        const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [burn]), 'stoke', rank), testCharacter('b', { maxHp: 400 })])
        const stokes = ofType(r, 'event').filter((b) => b.event.eventId === 'stoke')
        expect(stokes.length).toBeGreaterThan(3)
        for (const b of stokes) {
          const read = r.beats[b.id - 1].state.statuses[1].find((s) => s.id === 'burn')?.stacks ?? 0
          expect(b.event.effects[0]).toMatchObject({ type: 'applyStatus', status: 'burn', target: 1, stacks: read + 2 + rank })
          expect(b.state.statuses[1].find((s) => s.id === 'burn')).toMatchObject({ stacks: read + 2 + rank, turns: read + 2 + rank })
        }
      }
  })

  it('Ciel d’orage : au début de chaque tour de son porteur, un éclair de 1 PV par charge à l’adversaire, en dégâts directs', () => {
    expect(hurtsEachTurn('stormSky')).toBe(false)
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'storm-sky', rank), testCharacter('b', { maxHp: 400 })])
      const ticks = ofType(r, 'statusTick').filter((b) => b.status === 'stormSky')
      expect(ticks.length).toBeGreaterThan(3)
      for (const t of ticks) {
        const held = r.beats[t.id - 1].state.statuses[0].find((s) => s.id === 'stormSky')!
        expect(t).toMatchObject({ side: 0, phase: 'turnStart' })
        expect(t.effects).toEqual([expect.objectContaining({ type: 'damage', target: 1, amount: held.stacks + rank, source: 'lightning' })])
      }
    }
  })

  it('Ivresse du sang : chaque critique, deux coups bruts ; un critique pendant une rafale attend le jet suivant, sans retarder une Furie', () => {
    const base = createCharacter('gorak')
    expect(effectiveStats(base, [{ id: 'bloodFrenzy', stacks: 1 }]).critChance).toBeCloseTo(base.stats.critChance)
    expect(effectiveStats(base, [{ id: 'bloodFrenzy', stacks: 2 }]).critChance).toBeCloseTo(base.stats.critChance + 0.05)
    expect(effectiveStats(base, [{ id: 'bloodFrenzy', stacks: 1, power: 1 }]).critChance).toBeCloseTo(base.stats.critChance + 0.05)
    let deferred = 0
    for (let seed = 1; seed < 40; seed++) {
      const r = run([engraved(oldDie('gorak'), 'blood-frenzy'), testCharacter('b', { maxHp: 200, dodgeChance: 0 })], seed)
      for (const b of reactions(r, 'bloodFrenzy')) {
        expect(r.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 0, crit: true, dodged: false } })
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'bloodFrenzyStrike', stacks: 2 })])
      }
      for (const f of ofType(r, 'flurry')) {
        const posed = r.beats[f.cause!]
        const cause = posed.cause !== undefined ? r.beats[posed.cause] : undefined
        // Posée au critique d'un coup brut : elle part après le jet suivant de son porteur, pas pendant la rafale
        if (f.status === 'bloodFrenzyStrike' && cause?.type === 'attack' && cause.attack.plain) {
          deferred++
          const jets = r.beats.slice(posed.id + 1, f.id).filter((x) => x.type === 'attack' && x.attack.attacker === 0 && !x.attack.plain)
          expect(jets).toHaveLength(1)
        }
        // Une Furie des vents part toujours dans le tour de son jet
        if (f.status === 'windFury') expect(posed.turn).toBe(f.turn)
      }
    }
    expect(deferred).toBeGreaterThan(0)
  })

  it('Coup de massue : s’il touche, l’adversaire perd sa prochaine action (Étourdi), une fois par rang', () => {
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'stunning-blow', rank), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
      const blows = ofType(r, 'event').filter((b) => b.event.eventId === 'stunning-blow')
      expect(blows).toHaveLength(1 + rank)
      for (const b of blows) expect(b.event.effects[0]).toMatchObject({ type: 'applyStatus', status: 'stunned', target: 1, stacks: 1 })
      expect(ofType(r, 'skip').filter((b) => b.side === 1 && b.status === 'stunned')).toHaveLength(1 + rank)
    }
    // Un coup esquivé ne pose rien, et la fois reste
    const dodged = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'stunning-blow'), testCharacter('b', { maxHp: 400, dodgeChance: 1 })])
    expect(ofType(dodged, 'event').filter((b) => b.event.eventId === 'stunning-blow')).toHaveLength(0)
  })

  it('offre pertinente (le producteur d’abord) et X2 : Attiser ne gêne pas la place de la Brûlure', () => {
    const needs = Object.fromEntries(['feint', 'black-sap', 'blood-debt', 'stoke', 'storm-sky', 'blood-frenzy', 'stunning-blow'].map((id) => [id, skillNeeds(skill(id))]))
    expect(needs).toEqual({
      feint: ['moment:dodge'],
      'black-sap': ['moment:heal'],
      'blood-debt': ['moment:reflect'],
      stoke: ['status:burn'],
      'storm-sky': [],
      'blood-frenzy': ['moment:crit'],
      'stunning-blow': [],
    })
    const offered = (championId: string, forge: ForgeStep[], ids: string[]) => offerableSkills({ championId, forge, relics: [] }, ids.map(skill)).map((s) => s.id)
    // Ervald : Attiser une fois ses Feux follets gravés ; Brokk : la Dette de sang une fois sa Riposte gravée
    expect(offered('ervald', [], ['stoke'])).toEqual([])
    expect(offered('ervald', [{ op: 'engrave', face: 4, skill: skill('firefly') }], ['stoke'])).toEqual(['stoke'])
    expect(offered('brokk', [], ['blood-debt'])).toEqual([])
    expect(offered('brokk', [{ op: 'engrave', face: 4, skill: skill('riposte') }], ['blood-debt'])).toEqual(['blood-debt'])
    expect(offered('thaldrin', [], ['stoke', 'storm-sky', 'stunning-blow'])).toEqual(['stoke', 'storm-sky', 'stunning-blow'])
    // X2 : Attiser lit la Brûlure et s'y ajoute ; il ne gêne ni les Feux follets ni le Briquet
    expect(eventHooks(skill('stoke')).hinders).not.toContain('slot:burn')
    expect(linkBetween(eventHooks(skill('firefly')), eventHooks(skill('stoke')))).toEqual({ feeds: ['status:burn'], conflicts: [] })
    expect(linkBetween(relicHooks(getRelic('tinder-box')), eventHooks(skill('stoke'))).conflicts).toEqual([])
  })
})

describe('phase 8, lot 3 : les malus de famille (docs/SORTS.md § 29)', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  const engraved = (c: Character, id: string, rank = 0) =>
    c.withForge([{ op: 'engrave', face: 3, skill: skill(id) }, ...Array.from({ length: rank }, (): ForgeStep => ({ op: 'sharpen', face: 3 }))])
  const text = (id: string, rank = 0) => describeSkill(engraved(createCharacter('morgrut'), id, rank).events.find((e) => e.id === id)!).text
  /** `a` pose ce malus sur son adversaire au début du combat */
  const curse = (status: StatusId, stacks = 1, power?: number) =>
    testCharacter('a', { maxHp: 400, dodgeChance: 0 }, [ev('combatStart', [{ type: 'applyStatus', status, stacks, target: 'opponent', ...(power && { power }) }], 'curse')])

  it('les textes, au style de l’utilisateur, et les axes de rang', () => {
    expect(validateRoster()).toEqual([])
    expect(text('guard-break')).toBe("S'il touche, le prochain coup que reçoit l'adversaire ×2 et brise son armure temporaire.")
    expect(text('guard-break', 1)).toBe("S'il touche, les 2 prochains coups que reçoit l'adversaire ×2 et brisent son armure temporaire.")
    expect(text('jinx')).toBe("Le prochain jet de l'adversaire sur une compétence tombe à vide.")
    expect(text('jinx', 1)).toBe("Les 2 prochains jets de l'adversaire sur une compétence tombent à vide.")
    expect(text('blinding')).toBe("Les critiques de l'adversaire ratent, jusqu'à la fin du combat.")
    expect(text('blinding', 1)).toBe(typeset("Les critiques de l'adversaire ratent, et +10 % de coups ratés, jusqu'à la fin du combat."))
    expect(text('hemorrhage')).toBe("4 dégâts directs à l'adversaire. L'adversaire ne regagne plus de PV, jusqu'à la fin du combat.")
    expect(text('hemorrhage', 1)).toBe("6 dégâts directs à l'adversaire. L'adversaire ne regagne plus de PV, jusqu'à la fin du combat.")
    expect(text('seal-theft')).toBe("Vole le prochain bonus de l'adversaire.")
    expect(text('seal-theft', 1)).toBe("Vole les 2 prochains bonus de l'adversaire.")
    for (const id of ['guard-break', 'jinx', 'blinding', 'hemorrhage', 'seal-theft']) expect(rankText(skill(id)), id).not.toBe('ne s’aiguise pas')
  })

  it('Brise-garde : le prochain coup reçu ×2, avant l’armure, sans armure temporaire qui absorbe, et il la brise', () => {
    const shield = ev('combatStart', [{ type: 'applyStatus', status: 'bonusArmor', stacks: 50 }], 'shield')
    const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400, critChance: 0 }), 'guard-break'), testCharacter('b', { maxHp: 400, dodgeChance: 0 }, [shield])])
    const hits = ofType(r, 'attack').filter((b) => b.attack.attacker === 0 && stacksOf(r.beats[b.id - 1].state.statuses[1], 'guardBreak') > 0)
    expect(hits.length).toBeGreaterThan(3)
    for (const b of hits) {
      expect(b.attack.shatteredBy).toBe('guardBreak')
      expect(b.attack.shields).toEqual([])
      expect(b.attack.modifiers).toContainEqual(expect.objectContaining({ status: 'guardBreak', by: 'defender' }))
      expect(stacksOf(b.state.statuses[1], 'bonusArmor')).toBe(0)
      expect(stacksOf(b.state.statuses[1], 'guardBreak')).toBe(stacksOf(r.beats[b.id - 1].state.statuses[1], 'guardBreak') - 1)
    }
    // Le premier coup brisant trouve encore l'armure temporaire, et la brise
    expect(stacksOf(r.beats[hits[0].id - 1].state.statuses[1], 'bonusArmor')).toBeGreaterThan(0)
  })

  it('Malchance : le prochain jet sur une compétence tombe à vide, une charge par jet ; une face nue ne l’use pas, un dé imposé non plus', () => {
    // b porte une compétence sur le 6 seulement : ses autres jets ne l'usent pas
    const six = ev(faceTrigger(6), [{ type: 'heal', amount: 1 }], 'six')
    let jinxed = 0
    for (let seed = 1; seed < 20; seed++) {
      const r = run([curse('jinx', 2), testCharacter('b', { maxHp: 400 }, [six])], seed)
      const empty = ofType(r, 'roll').filter((b) => b.jinxedBy === 'jinx')
      expect(empty.length).toBeLessThanOrEqual(2)
      for (const b of empty) {
        jinxed++
        expect(b).toMatchObject({ side: 1, roll: 6 })
        const hit = r.beats[b.id + 1]
        expect(hit).toMatchObject({ type: 'attack', cause: b.id, attack: { attacker: 1, jinxed: true, damage: 0, dealt: 0 } })
        expect(stacksOf(b.state.statuses[1], 'jinx')).toBe(stacksOf(r.beats[b.id - 1].state.statuses[1], 'jinx') - 1)
      }
      // Les deux premiers jets de 6 tombent à vide : la compétence ne part qu'au troisième
      const sixes = ofType(r, 'attack').filter((b) => b.attack.attacker === 1 && b.attack.roll === 6)
      sixes.slice(0, 2).forEach((b) => expect(b.attack.jinxed).toBe(true))
      expect(ofType(r, 'event').filter((b) => b.event.eventId === 'six').length).toBe(Math.max(0, sixes.length - 2))
    }
    expect(jinxed).toBeGreaterThan(10)
    // Un dé imposé (mode triche) ne tombe jamais à vide
    const forced = runOn(6, [curse('jinx', 2), testCharacter('b', { maxHp: 400 }, [six])])
    expect(ofType(forced, 'roll').filter((b) => b.jinxedBy)).toEqual([])
  })

  it('Aveuglé : ses critiques, assurés compris, deviennent des coups ratés ; seule sa fenêtre « raté » s’ouvre', () => {
    const dodge = ev('dodge', [{ type: 'heal', amount: 1 }], 'on-dodge')
    const missed = ev('missed', [{ type: 'heal', amount: 1 }], 'on-missed')
    const r = run([testCharacter('a', { maxHp: 400, dodgeChance: 0 }, [ev('combatStart', [{ type: 'applyStatus', status: 'blinded', stacks: 1, target: 'opponent' }], 'curse'), dodge]), testCharacter('b', { maxHp: 400, critChance: 1 }, [missed])])
    const b = ofType(r, 'attack').filter((x) => x.attack.attacker === 1)
    expect(b.length).toBeGreaterThan(3)
    for (const x of b) expect(x.attack).toMatchObject({ dodged: true, crit: false, damage: 0, blindedBy: 'blinded' })
    expect(ofType(r, 'event').filter((x) => x.event.eventId === 'on-dodge')).toEqual([])
    expect(ofType(r, 'event').filter((x) => x.event.eventId === 'on-missed').length).toBe(b.length)
    // Le critique assuré part dans le coup raté (une seule charge, B8) ; le coup suivant ne l'a plus
    const sure = run([testCharacter('a', { maxHp: 400, dodgeChance: 0 }, [ev('combatStart', [{ type: 'applyStatus', status: 'blinded', stacks: 1, target: 'opponent' }], 'curse')]), testCharacter('b', { maxHp: 400, critChance: 0 }, [ev('combatStart', [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }], 'sure')])])
    const [first, second] = ofType(sure, 'attack').filter((x) => x.attack.attacker === 1)
    expect(first.attack).toMatchObject({ dodged: true, critForced: true, critBy: 'guaranteedCrit', blindedBy: 'blinded' })
    expect(stacksOf(first.state.statuses[1], 'guaranteedCrit')).toBe(0)
    expect(second.attack).toMatchObject({ critForced: false })
    // Aiguisé : +10 % de coups ratés par rang, même sans critique
    let misses = 0
    let total = 0
    for (let seed = 1; seed < 20; seed++) {
      const rr = run([curse('blinded', 1, 1), testCharacter('b', { maxHp: 400, critChance: 0 })], seed)
      const x = ofType(rr, 'attack').filter((y) => y.attack.attacker === 1)
      total += x.length
      misses += x.filter((y) => y.attack.blindedBy).length
    }
    expect(misses / total).toBeGreaterThan(0.05)
    expect(misses / total).toBeLessThan(0.15)
  })

  it('Hémorragie : 4 PV perdus, puis aucun soin, et la fenêtre « soin reçu » ne s’ouvre pas', () => {
    const healed = ev('healed', [{ type: 'applyStatus', status: 'momentum', stacks: 1 }], 'on-healed')
    const r = run([curse('hemorrhage'), testCharacter('b', { maxHp: 400 }, [ev('combatStart', [{ type: 'applyStatus', status: 'regeneration', stacks: 3 }], 'regen'), healed])])
    const ticks = ofType(r, 'statusTick').filter((b) => b.side === 1 && b.status === 'regeneration')
    expect(ticks.length).toBeGreaterThan(0)
    for (const t of ticks) expect(t.effects).toEqual([{ type: 'heal', target: 1, amount: 0, wanted: 3 }])
    expect(ofType(r, 'event').filter((b) => b.event.eventId === 'on-healed')).toEqual([])
    const hit = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'hemorrhage'), testCharacter('b', { maxHp: 400 })])
    const fired = ofType(hit, 'event').find((b) => b.event.eventId === 'hemorrhage')!
    expect(fired.event.effects).toEqual([
      expect.objectContaining({ type: 'damage', target: 1, amount: 4, source: 'bleed' }),
      expect.objectContaining({ type: 'applyStatus', target: 1, status: 'hemorrhage' }),
    ])
  })

  it('Sceau de vol : le prochain bonus que l’adversaire se pose lui revient, une charge par vol ; un mécanisme ne se vole pas', () => {
    const pose = ev(faceTrigger(3), [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }, { type: 'applyStatus', status: 'powerAura', stacks: 1 }], 'pose')
    const r = runOn(3, [curse('sealTheft'), testCharacter('b', { maxHp: 400 }, [pose])])
    const [first, second] = ofType(r, 'event').filter((b) => b.event.eventId === 'pose')
    expect(first.event.effects[0]).toMatchObject({ target: 1, status: 'coinFlip' })
    expect(first.event.effects[0]).not.toHaveProperty('stolenBy')
    expect(first.event.effects[1]).toMatchObject({ target: 0, status: 'powerAura', stolenBy: 'sealTheft' })
    expect(stacksOf(first.state.statuses[0], 'powerAura')).toBe(1)
    expect(stacksOf(first.state.statuses[1], 'sealTheft')).toBe(0)
    expect(second.event.effects[1]).toMatchObject({ target: 1, status: 'powerAura' })
  })
})

describe('retour de l’utilisateur du 2026-10-27 : règles du moteur (M1 à M8, P7)', () => {
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })

  it('M2 : le Poison inflige ses dégâts à la fin du tour de celui qui le subit, après son action', () => {
    const r = run([testCharacter('a', { maxHp: 60 }, [ev('combatStart', [{ type: 'applyStatus', status: 'poison', stacks: 3, target: 'opponent' }])]), testCharacter('b', { maxHp: 60 })])
    const ticks = ofType(r, 'statusTick').filter((b) => b.status === 'poison')
    expect(ticks.map((b) => b.effects[0])).toEqual([3, 2, 1].map((amount) => expect.objectContaining({ type: 'damage', target: 1, amount, source: 'poison' })))
    for (const t of ticks) {
      expect(t).toMatchObject({ phase: 'turnEnd', side: 1, owner: 1 })
      // Son action d'abord : le coup de b, dans ce même tour, précède le poison
      const own = r.beats.filter((b) => b.turn === t.turn && b.id < t.id)
      expect(own.some((b) => b.type === 'attack' && b.attack.attacker === 1)).toBe(true)
    }
  })

  it('M3 : la Riposte manque un attaquant sous Esquive améliorée, comme un coup esquivé : une charge de chaque part, aucun dégât renvoyé', () => {
    // a se donne une esquive assurée à chaque début de tour ; b une Riposte à chacun des siens
    const a = testCharacter('a', { maxHp: 400 }, [ev('turnStart', [{ type: 'applyStatus', status: 'evasion', stacks: 1 }])])
    const b = testCharacter('b', { maxHp: 400 }, [ev('turnStart', [{ type: 'applyStatus', status: 'riposte', stacks: 1 }])]).withRelics([getRelic('talion-gauntlet')])
    const r = run([a, b])
    const ripostes = ofType(r, 'statusReaction').filter((x) => x.status === 'riposte')
    expect(ripostes.length).toBeGreaterThan(10)
    for (const x of ripostes) {
      const before = r.beats[x.id - 1].state
      // Le coup de a l'a fait partir pendant le tour de a, qui portait son esquive : la Riposte est esquivée
      expect(x).toMatchObject({ side: 1, trigger: 'hurt', effects: [], dodgedBy: 'evasion' })
      expect(stacksOf(x.state.statuses[1], 'riposte')).toBe(stacksOf(before.statuses[1], 'riposte') - 1)
      expect(stacksOf(x.state.statuses[0], 'evasion')).toBe(0)
      expect(x.state.hp[0]).toBe(before.hp[0])
    }
    // Aucun dégât renvoyé : le Gantelet du talion (« quand il renvoie des dégâts ») ne part jamais
    expect(ofType(r, 'relic').filter((x) => x.relic === 'talion-gauntlet')).toEqual([])
    // Sans esquive assurée, la Riposte renvoie comme avant
    const plain = run([testCharacter('a', { maxHp: 400 }), b])
    const back = ofType(plain, 'statusReaction').filter((x) => x.status === 'riposte')
    expect(back.length).toBeGreaterThan(10)
    for (const x of back) expect(x.dodgedBy).toBeUndefined()
  })

  it('M4 : les dégâts des Clous de pavois se heurtent à l’armure de l’attaquant (au moins 1)', () => {
    const shield = ev('turnStart', [{ type: 'applyStatus', status: 'bonusArmor', stacks: 1 }])
    for (const [armor, amount] of [[0, 3], [2, 1], [5, 1]] as const) {
      const r = run([testCharacter('a', { maxHp: 400 }, [shield]).withRelics([getRelic('pavise-nails')]), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4, armor })])
      const fires = ofType(r, 'relic').filter((x) => x.relic === 'pavise-nails')
      expect(fires.length, `armure ${armor}`).toBeGreaterThan(5)
      for (const x of fires) {
        expect(x.effects).toEqual([{ type: 'damage', target: 1, amount, source: 'strike', armored: true, ...(armor > 0 && { armorAbsorbed: 3 - amount }) }])
        expect(r.beats[x.id - 1].state.hp[1] - x.state.hp[1]).toBe(amount)
      }
    }
    expect(describeRelic(getRelic('pavise-nails')).text).not.toContain('directs')
  })

  it('M5 : Esquive améliorée II ajoute ses +2 à chaque coup qui touche tant que l’esquive attend (vérifié, pas de défaut)', () => {
    const elaria = oldDie('elaria').withForge([{ op: 'sharpen', face: 2 }])
    let checked = 0
    for (let seed = 1; seed <= 30; seed++) {
      const r = run([elaria, createCharacter('brokk')], seed)
      for (const b of ofType(r, 'attack')) {
        if (b.attack.attacker !== 0 || b.attack.dodged || b.attack.replaced) continue
        if (b.id === 0 || stacksOf(r.beats[b.id - 1].state.statuses[0], 'evasion') === 0) continue
        expect(b.attack.modifiers).toContainEqual({ status: 'evasion', by: 'attacker', delta: 2 })
        checked++
      }
    }
    expect(checked).toBeGreaterThan(30)
  })

  it('M7 : Pourfendre ajoute à chaque fois la moitié des PV retirés (arrondie au-dessus) au Saignement déjà là (vérifié, pas de défaut)', () => {
    const r = runOn(2, [oldDie('gorak'), testCharacter('d', { maxHp: 600 })])
    const cuts = ofType(r, 'event').filter((b) => b.event.eventId === 'cleave')
    expect(cuts.length).toBeGreaterThan(10)
    for (const c of cuts) {
      const hit = r.beats[c.cause!]
      if (hit.type !== 'attack') throw new Error('coup attendu')
      expect(stacksOf(c.state.statuses[1], 'bleed')).toBe(stacksOf(r.beats[c.id - 1].state.statuses[1], 'bleed') + Math.ceil(hit.attack.dealt / 2))
    }
  })

  it('M8 : une compétence gravée sur Thaldrin part sous ses deux formes ; ses sorts imprimés, sous forme humaine seulement', () => {
    const hawk = ENGRAVABLE_SKILLS.find((e) => e.id === 'hawk-eye')!
    const thaldrin = createCharacter('thaldrin').withForge([{ op: 'engrave', face: 3, skill: hawk }])
    const onThree = runOn(3, [thaldrin, testCharacter('d', { maxHp: 2000 })])
    const turns = new Set(onThree.beats.filter((b) => b.owner === 0 && b.turn > 0).map((b) => b.turn)).size
    // Le 3 gravé : une fois par tour, homme comme ours
    expect(ofType(onThree, 'event').filter((b) => b.event.eventId === 'hawk-eye' && b.event.side === 0).length).toBe(turns)
    // Le 2 imprimé (Feux follets, sa signature depuis les Maîtrises) : un tour sur deux, sous forme humaine
    const onOne = runOn(2, [thaldrin, testCharacter('d', { maxHp: 2000 })])
    const fires = ofType(onOne, 'event').filter((b) => b.event.eventId === 'firefly').length
    const ownTurns = new Set(onOne.beats.filter((b) => b.owner === 0 && b.turn > 0).map((b) => b.turn)).size
    expect(fires).toBe(Math.ceil(ownTurns / 2))
  })

  it('P7 : l’Aura mélodieuse quitte le jeu ; le Duo ne pose que le Duo, trois charges (quatre dés), son rang lui ajoute un dé', () => {
    const fanchon = createCharacter('fanchon')
    // Maîtrises (2026-10-27) : la Ballade sur le 1, le Duo sur le 2
    expect(fanchon.events.map((e) => e.id)).toEqual(['ballad', 'duo'])
    expect(fanchon.events.some((e) => e.trigger === 'combatStart')).toBe(false)
    const sharpened = fanchon.withForge([{ op: 'sharpen', face: 2 }]).events.find((e) => e.id === 'duo')!
    expect(sharpened.effects).toEqual([{ type: 'applyStatus', status: 'duo', stacks: 4 }])
    // Rien n'est posé à l'entrée en scène
    for (let seed = 1; seed <= 10; seed++) {
      const r = run([fanchon, createCharacter('gorak')], seed)
      expect(r.beats.filter((b) => b.turn === 0)).toEqual([])
    }
    // Au rang II, la première rafale du Duo compte cinq jets : celui de l'action, plus quatre
    const r = runOn(2, [fanchon.withForge([{ op: 'sharpen', face: 2 }]), testCharacter('d', { maxHp: 2000 })])
    expect(ofType(r, 'flurry').find((f) => f.status === 'duo')!.strikes).toBe(5)
  })
})

describe('les Maîtrises (retour du 2026-10-27, V1 à V5 ; docs/MAITRISES.md)', () => {
  it('le registre : huit maîtrises (B1), chaque compétence dans une seule, deux maîtrises distinctes par personnage', () => {
    expect(validateMasteries(ROSTER)).toEqual([])
    expect(MASTERY_IDS).toEqual(['fury', 'blood', 'bulwark', 'poison', 'chance', 'light', 'shadow', 'magic'])
    // Toute compétence gravable du roster a sa maîtrise, une seule
    for (const e of ENGRAVABLE_SKILLS) expect(masteryOfSkill(e.id), e.id).toBeDefined()
    expect(Object.values(MASTERIES).flatMap((m) => m.skills)).toHaveLength(new Set(Object.values(MASTERIES).flatMap((m) => m.skills)).size)
    for (const d of ROSTER) expect(new Set(d.masteries).size, d.id).toBe(2)
    // Une compétence de son dé hors de ses maîtrises, deux fois la même maîtrise : signalées
    const gorak = ROSTER.find((d) => d.id === 'gorak')!
    expect(validateMasteries([{ ...gorak, masteries: ['fury', 'fury'] }])).toEqual(['gorak : deux maîtrises distinctes attendues', 'gorak : blood-frenzy (blood) hors de ses maîtrises'])
    expect(validateMasteries([{ ...gorak, masteries: ['chance', 'light'] }])).toEqual(['gorak : blood-frenzy (blood) hors de ses maîtrises', 'gorak : wind-fury (fury) hors de ses maîtrises'])
    // Chaque signature appartient à l'une de ses deux maîtrises (B2)
    for (const d of ROSTER) if (d.signature) expect(d.masteries, d.id).toContain(masteryOfSkill(d.signature))
  })

  it('V5 : deux personnages qui partagent une maîtrise tirent dans la même réserve', () => {
    const def = (id: string) => ROSTER.find((d) => d.id === id)!
    expect(def('naraxes').masteries).toContain('poison')
    expect(def('ervald').masteries).toContain('poison')
    const poison = poolOf('poison').map((e) => e.id)
    for (const id of ['naraxes', 'ervald', 'thaldrin']) {
      const pool = characterPool(def(id)).map((e) => e.id)
      // Toute la réserve Poison, moins ce qui est déjà sur son dé
      expect(pool.filter((s) => poison.includes(s)), id).toEqual(poison.filter((s) => !def(id).events.some((e) => e.id === s)))
    }
  })

  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  /** L'aura `status` posée sur `a` au début du combat */
  const auraOn = (status: StatusId, stats: Partial<CharacterStats> = {}, stacks = 1) => testCharacter('a', { maxHp: 400, ...stats }, [ev('combatStart', [{ type: 'applyStatus', status, stacks }], 'aura')])
  const reactions = (r: CombatResult, status: StatusId) => ofType(r, 'statusReaction').filter((b) => b.status === status)
  const text = (id: string, rank = 0) => describeSkill(sharpen(skillById(id), rank)).text

  it('dés de départ (§ 5) : une aura de ses maîtrises sur le 1, sa signature sur le 2, quatre faces nues ; une autre aura de départ au choix', () => {
    expect(validateRoster()).toEqual([])
    for (const d of ROSTER) {
      const faces = d.events.map((e) => `${e.id}@${rollFace(e.trigger)}`)
      // B5 : ses auras de départ, celles de ses deux maîtrises dont le besoin est servi par son dé de départ sans le 1 (le
      // producteur d'abord, la règle de l'offre : `reachOf`, `skillNeeds`), l'aura de son dé vanilla d'abord
      const reach = reachOf({ ...d, events: d.events.filter((e) => rollFace(e.trigger) !== 1) })
      for (const a of d.masteries.flatMap(aurasOf)) expect(d.startAuras!.includes(a.id), `${d.id} ${a.id}`).toBe(skillNeeds(a).every((h) => reach.has(h)))
      expect(faces, d.id).toEqual([`${d.startAuras![0]}@1`, ...(d.signature ? [`${d.signature}@2`] : [])])
      // L'aura par défaut (la première, celle du duel) donne le personnage du roster, tel quel ; le tournoi et la saison en tirent une au hasard
      expect(createCharacter(d.id, { aura: d.startAuras![0] }), d.id).toBe(createCharacter(d.id))
      for (const aura of d.startAuras!) {
        const c = createCharacter(d.id, { aura })
        expect(c.events.find((e) => rollFace(e.trigger) === 1)?.id, `${d.id} ${aura}`).toBe(aura)
        expect(c.events.filter((e) => rollFace(e.trigger) !== 1)).toEqual(d.events.filter((e) => rollFace(e.trigger) !== 1))
      }
    }
    // Les consommatrices sans producteur sur le dé de départ ne sont pas proposées ; avec, elles le sont
    const starts = (id: string) => ROSTER.find((d) => d.id === id)!.startAuras!
    expect(starts('ysolde')).not.toContain('sentence')
    expect(starts('ysolde')).not.toContain('faith-shield')
    expect(starts('brokk')).not.toContain('vendetta')
    expect(starts('aldric')).toEqual(expect.arrayContaining(['vendetta', 'blood-debt']))
    expect(starts('naraxes')).toContain('loaded-die')
    expect(starts('elaria')).not.toContain('loaded-die')
    expect(starts('morgrut')).not.toContain('bristling-rampart')
    // Le druide garde ses sorts sous forme humaine, l'aura choisie comprise
    expect(createCharacter('thaldrin', { aura: 'storm-field' }).events.map((e) => e.form)).toEqual(['human', 'human'])
    // Une aura hors de ses auras de départ est refusée
    expect(() => createCharacter('gorak', { aura: 'holy-aura' })).toThrow()
    const gorak = ROSTER.find((d) => d.id === 'gorak')!
    expect(validateRoster([{ ...gorak, startAuras: ['holy-aura'] }])).toEqual(expect.arrayContaining(['gorak : aura de départ holy-aura hors de ses maîtrises']))
    expect(validateRoster([{ ...gorak, startAuras: ['wind-fury'] }])).toEqual(expect.arrayContaining(['gorak : aura de départ wind-fury : pas une aura']))
    // Aldric (attaque 5 à 6) et Morgrut (6 à 8), la compensation de leur nouveau dé
    expect([createCharacter('aldric').stats.attackMin, createCharacter('aldric').stats.attackMax]).toEqual([5, 6])
    expect([createCharacter('morgrut').stats.attackMin, createCharacter('morgrut').stats.attackMax]).toEqual([6, 8])
  })

  it('Veine : chaque 6 au dé lui donne un jet de plus à sa prochaine action, par charge', () => {
    const r = runOn(6, [auraOn('luckyStreak'), testCharacter('b', { maxHp: 400 })])
    const fired = reactions(r, 'luckyStreak')
    expect(fired.length).toBeGreaterThan(5)
    for (const b of fired) {
      expect(r.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 0, roll: 6 } })
      expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'luckyStrike', stacks: 1 })])
    }
    expect(ofType(r, 'flurry').some((f) => f.side === 0 && f.status === 'luckyStrike')).toBe(true)
    // Sur un autre jet, rien
    expect(reactions(runOn(3, [auraOn('luckyStreak'), testCharacter('b', { maxHp: 400 })]), 'luckyStreak')).toEqual([])
    expect(text('lucky-streak')).toBe('Chaque 6 au dé lui donne un jet de plus à sa prochaine action.')
    expect(text('lucky-streak', 1)).toBe('Chaque 6 au dé lui donne 2 jets de plus à sa prochaine action.')
  })

  it('Effroi : chacun de ses critiques fait perdre sa prochaine action à l’adversaire ; chaque charge de plus, +5 % de critique', () => {
    const r = run([auraOn('dread', { critChance: 1 }), testCharacter('b', { maxHp: 400 })])
    const fired = reactions(r, 'dread')
    expect(fired.length).toBeGreaterThan(3)
    for (const b of fired) {
      expect(r.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 0, crit: true } })
      expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 1, status: 'fear' })])
    }
    expect(ofType(r, 'skip').some((b) => b.side === 1 && b.status === 'fear')).toBe(true)
    expect(reactions(run([auraOn('dread'), testCharacter('b', { maxHp: 400 })]), 'dread')).toEqual([])
    const base = testCharacter('c')
    expect(effectiveStats(base, [{ id: 'dread', stacks: 1 }]).critChance).toBeCloseTo(0)
    expect(effectiveStats(base, [{ id: 'dread', stacks: 2 }]).critChance).toBeCloseTo(0.05)
    expect(text('dread')).toBe("Chacun de ses critiques fait perdre sa prochaine action à l'adversaire.")
  })

  it('Rancœur : chaque coup reçu lui donne +1 Ferveur par charge ; Champ d’orage : chaque coup reçu foudroie l’attaquant, 1 PV par charge', () => {
    for (const stacks of [1, 2]) {
      const rancor = run([auraOn('rancor', {}, stacks), testCharacter('b', { maxHp: 400 })])
      const fed = reactions(rancor, 'rancor')
      expect(fed.length).toBeGreaterThan(3)
      for (const b of fed) {
        expect(rancor.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 1, dodged: false } })
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'momentum', stacks })])
      }
      const field = run([auraOn('stormField', {}, stacks), testCharacter('b', { maxHp: 400 })])
      const struck = reactions(field, 'stormField')
      expect(struck.length).toBeGreaterThan(3)
      for (const b of struck) expect(b.effects).toEqual([expect.objectContaining({ type: 'damage', target: 1, amount: stacks, source: 'lightning' })])
    }
    expect(text('rancor')).toBe('Chaque coup reçu lui donne +1 Ferveur.')
    expect(text('storm-field')).toBe(typeset("Chaque coup reçu foudroie l'attaquant : 1 PV."))
  })

  it('Ballade : chaque coup qui touche lui rend 1 PV par charge', () => {
    // b frappe fort : a perd des PV, la Ballade en rend à chaque coup qui touche
    const r = run([auraOn('ballad', { maxHp: 60 }), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4 })])
    const sung = reactions(r, 'ballad')
    expect(sung.length).toBeGreaterThan(3)
    for (const b of sung) {
      expect(r.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 0, dodged: false } })
      expect(b.effects[0]).toMatchObject({ type: 'heal', target: 0 })
    }
    expect(sung.some((b) => b.effects[0].type === 'heal' && b.effects[0].amount === 1)).toBe(true)
    expect(text('ballad')).toBe('Chaque coup qui touche lui rend 1 PV.')
  })

  it('Prière (+6 PV), Flétrissure (−2 dégâts aux coups de l’adversaire, 3 tours), Assaut (ce coup ×2) : gravées sur le 3', () => {
    const on3 = (id: string) => runOn(3, [testCharacter('a', { maxHp: 400 }).withForge([{ op: 'engrave', face: 3, skill: skillById(id) }]), testCharacter('b', { maxHp: 400, attackMin: 9, attackMax: 9 })])
    const prayers = ofType(on3('prayer'), 'event').filter((b) => b.event.eventId === 'prayer')
    expect(prayers.length).toBeGreaterThan(3)
    expect(prayers.some((b) => b.event.effects[0].type === 'heal' && b.event.effects[0].amount === 6)).toBe(true)
    expect(text('prayer')).toBe('+6 PV.')
    expect(rankText(skillById('prayer'))).toBe('+3 PV')
    const withered = on3('wither')
    for (const b of ofType(withered, 'event').filter((x) => x.event.eventId === 'wither'))
      expect(b.event.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 1, status: 'weakened', stacks: 2 })])
    expect(attacksOf(withered).filter((a) => a.attacker === 1).some((a) => a.modifiers.some((m) => m.status === 'weakened' && m.delta === -2))).toBe(true)
    expect(text('wither')).toBe("−2 dégâts à chacun des coups de l'adversaire, encore 3 tours.")
    const assault = attacksOf(on3('assault')).filter((a) => a.attacker === 0 && !a.plain)
    expect(assault.length).toBeGreaterThan(3)
    for (const a of assault) expect(a.multiplier).toBe(2)
    expect(text('assault')).toBe('Ce coup ×2.')
  })

  it('Poing de pierre (P4) : posé avec la Peau de pierre, ses coups font +1 tant que son armure temporaire tient ; il part quand elle est vidée', () => {
    expect(skillById('stoneskin').effects).toEqual([
      { type: 'applyStatus', status: 'bonusArmor', stacks: 6 },
      { type: 'applyStatus', status: 'stoneFist', stacks: 1 },
    ])
    expect(text('stoneskin')).toBe('+6 armure temporaire. Tant que son armure temporaire tient, ses coups font +1 dégât.')
    let punched = 0
    let broken = 0
    for (let seed = 1; seed <= 20; seed++) {
      const r = run([createCharacter('brokk'), testCharacter('b', { maxHp: 400, attackMin: 9, attackMax: 9 })], seed)
      r.beats.forEach((b, i) => {
        if (b.type === 'statusReaction' && b.status === 'stoneFist') {
          expect(b.trigger).toBe('shieldBroken')
          expect(stacksOf(b.state.statuses[0], 'stoneFist')).toBe(0)
          broken++
        }
        if (b.type !== 'attack' || b.attack.attacker !== 0 || b.attack.dodged || b.attack.replaced || i === 0) return
        const before = r.beats[i - 1].state.statuses[0]
        const armored = before.some((s) => s.id === 'bonusArmor')
        const fist = b.attack.modifiers.some((m) => m.status === 'stoneFist' && m.delta === 1)
        expect(fist, `graine ${seed}`).toBe(armored && before.some((s) => s.id === 'stoneFist'))
        if (fist) punched++
      })
    }
    expect(punched).toBeGreaterThan(10)
    expect(broken).toBeGreaterThan(3)
    // Une Garde brisée emporte l'armure et le Poing
    const shattered = run([testCharacter('a', { maxHp: 400 }, [ev('combatStart', skillById('stoneskin').effects)]), testCharacter('b', { maxHp: 400 }, [ev('combatStart', [{ type: 'applyStatus', status: 'guardBreak', stacks: 1, target: 'opponent' }], 'gb')])])
    const firstHit = attacksOf(shattered).find((a) => a.attacker === 1 && !a.dodged)!
    expect(firstHit.shatteredBy).toBe('guardBreak')
    expect(finalState(shattered).statuses[0].some((s) => s.id === 'stoneFist')).toBe(false)
  })

  it('Aura sauvage : une aura de la Fureur, sans forme (elle agit gravée chez tous)', () => {
    expect(skillById('wild-aura').form).toBeUndefined()
    const r = runOn(3, [testCharacter('a', { maxHp: 400 }).withForge([{ op: 'engrave', face: 3, skill: skillById('wild-aura') }]), testCharacter('b', { maxHp: 400 })])
    expect(stacksOf(finalState(r).statuses[0], 'wildAura')).toBeGreaterThan(1)
  })
})
