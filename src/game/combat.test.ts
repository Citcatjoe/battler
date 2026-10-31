import { describe, expect, it } from 'vitest'
import { attacksOf, AURA_DUE_TURN, beatEffects, diceOf, dieAt, effectiveStats, finalState, firstSide, HEADS_CAP, MAX_DODGE, MAX_EXTRA_JETS, MAX_TURNS, rollsDie, simulateCombat, splitAmong, startAuraOf, type Beat, type CombatResult, type Pair, type Side } from './combat'
import { describeSkill, DIE_FACES, faceTrigger, isRollTrigger, relationOf, rollFace, rollMatches, triggerText, type CharacterEvent } from './events'
import { eventLog, of } from './narration'
import { AURA_FACE, autoForge, copyDestinations, drawForgeOffer, FORGE_OFFER_SIZE, forgedFaces, forgeState, GILD_BONUS, isAuraSkill, MAX_SHARPENS, OFFERED_OPS, offerTargets, rankText, sharpen, stepKey, stepLabel, stepOf, validOnOrigin, withForgeStep, writtenFace, type ForgeBase, type ForgeStep } from './forge'
import { seededRng } from './rng'
import { CHARACTER_IDS, CHARACTERS, createCharacter, ENGRAVABLE_SKILLS, ROSTER, validateRoster } from './roster'
import { aurasOf, characterPool, MASTERIES, MASTERY_IDS, masteryOfSkill, poolOf, validateMasteries } from './masteries'
import { skillById } from './skills'
import { computeStats } from './stats'
import { AIM_CAP, applyStatus, BALLAD_HEAL, BALLAD_NOTES, BALLAD_REFRAIN, BASTION_ARMOR, BASTION_LOSS, BEAR_MIGHT, BRASIER_BURN, COIN_HEADS, CONFLAGRATION_TIMES, DECOCTION_POISON, HOLY_HEAL, hurtsEachTurn, isStealable, JUDGEMENT_FAULTS, LUCKY_COIN_POWER, ONRUSH_FERVOR, OPEN_WOUND_BLEED, RANCOR_FERVOR, STATUS_IDS, STATUSES, STONE_FIST, STORM_BOLT, STORM_BOLTS, stacksOf, statusCounter, THICK_HIDE_ARMOR, VEIN_STRIKES, VERDICT_LOSS, type Status, type StatusId } from './statuses'
import { STATUS_PLACE } from './states'
import { EMOJI, oldDie, onOldDie, testCharacter } from './test-utils'
import { Character, REWARD_HP, type CharacterStats } from './character'
import { describeRelic, getRelic, RELIC_IDS, relicKind, RELICS, validateRelics, type Relic } from './relics'
import { typeset } from './typography'
import { parseForcedRolls, parseForge, parseRelics, traceText } from './trace'
import { buildHooks, echoOf, eventHooks, linkBetween, reachOf, relicHooks, relicNeeds, skillNeeds } from './hooks'
import { SCENE_EVENTS } from './scenes'
import { drawReward, MAX_SKILL_FACES, offerableSkills } from './offers'

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
            for (const s of prev[a.attacker]) if (!STATUSES[s.id].whileShielded || armored) raw = STATUSES[s.id].modifyOutgoing?.(raw, s, prev[1 - a.attacker]) ?? raw
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

  it('réaction (D13, épines plantées) : chaque coup reçu plante une épine sur le porteur ; son coup qui touche les enfonce toutes, Saignement 2 par épine, et la plaie qui coule ne déclenche pas de chaîne', () => {
    const hurtA: CharacterEvent = { id: 'ouch', name: 'ouch', trigger: 'hurt', effects: [{ type: 'heal', amount: 1 }] }
    // a esquive souvent les coups de b : les épines s'accumulent sur b jusqu'à ce qu'un de ses coups touche
    const r = run([
      testCharacter('a', { maxHp: 80, dodgeChance: 0.6 }, [hurtA]),
      testCharacter('b', { maxHp: 80 }, [
        { id: 't', name: 't', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'thorns', stacks: 1 }] },
      ]),
    ])
    const reactions = ofType(r, 'statusReaction')
    const planted = reactions.filter((x) => x.status === 'thorns')
    const driven = reactions.filter((x) => x.status === 'thornSpike')
    const bleeds = reactions.filter((x) => x.status === 'bleed')
    // Chaque coup reçu plante une épine sur b lui-même
    expect(planted.length).toBeGreaterThan(0)
    expect(planted.every((x) => x.side === 1 && x.trigger === 'hurt' && x.effects[0].type === 'applyStatus' && x.effects[0].status === 'thornSpike' && x.effects[0].target === 1 && x.effects[0].stacks === 1)).toBe(true)
    // Son coup qui touche les enfonce toutes : Saignement 2 par épine sur a, et elles partent
    expect(driven.length).toBeGreaterThan(0)
    for (const x of driven) {
      const held = stacksOf(r.beats[x.id - 1].state.statuses[1], 'thornSpike')
      expect(x.side === 1 && x.trigger === 'hit' && x.effects[0]).toMatchObject({ type: 'applyStatus', status: 'bleed', target: 0, stacks: 2 * held })
      expect(stacksOf(x.state.statuses[1], 'thornSpike')).toBe(0)
    }
    // Plusieurs coups reçus avant de rendre le coup : une plaie de 4 et plus d'un seul geste
    expect(driven.some((x) => x.effects[0].type === 'applyStatus' && x.effects[0].stacks >= 4)).toBe(true)
    expect(bleeds.length).toBeGreaterThan(0)
    expect(bleeds.every((x) => x.side === 0 && x.effects[0].type === 'damage' && x.effects[0].target === 0)).toBe(true)
    // « hurt » de a ne se déclenche que sur les vrais coups de b, jamais sur la plaie qui coule
    const hurtEvents = ofType(r, 'event').filter((b) => b.event.eventId === 'ouch').length
    const hitsOnA = attacksOf(r).filter((x) => x.attacker === 1 && !x.dodged).length
    expect(hurtEvents).toBeLessThanOrEqual(hitsOnA)
    expect(hurtEvents).toBeGreaterThanOrEqual(hitsOnA - 1)
    // Les textes disent l'épine et le chiffre, jamais un « 1 » (D11)
    expect(STATUSES.thorns.describe({ id: 'thorns', stacks: 1 })).toBe(typeset('Chaque coup reçu lui plante une épine ; son prochain coup qui touche les enfonce toutes : Saignement 2 par épine'))
    expect(STATUSES.thornSpike.badge({ id: 'thornSpike', stacks: 3 })).toBe('6')
    expect(STATUSES.thornSpike.badge({ id: 'thornSpike', stacks: 1, power: 1 })).toBe('3')
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
        expect(back?.type === 'statusReaction' && back.effects[0]).toMatchObject({ type: 'applyStatus', status: 'thornSpike', stacks: 1, target: 1 })
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
  it('chaque personnage a au moins deux événements décrits (l’ogre aussi depuis son Crescendo, C5)', () => {
    for (const c of CHARACTERS) expect(c.events.length).toBeGreaterThanOrEqual(2)
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

  it('Épines plantées (D13) : chaque coup encaissé plante une épine sur Brokk, à chaque coup d’une Furie ; son coup qui touche les enfonce toutes', () => {
    let planted = 0
    let doubled = 0
    let driven = 0
    for (const r of duelsOf('brokk', 40)) {
      r.beats.forEach((beat, i) => {
        if (beat.type !== 'attack') return
        const a = beat.attack
        const defender = 1 - a.attacker
        if (!before(r, i).statuses[defender].some((s) => s.id === 'thorns') || a.dodged || a.replaced || beat.state.hp[defender] === 0) return
        // La réaction suit ce coup, avant le coup suivant, sauf si un K.O. tombe avant
        const after = r.beats.slice(i + 1)
        const stop = after.findIndex((b) => b.type === 'attack')
        const window = stop < 0 ? after : after.slice(0, stop)
        const reaction = window.find((b) => b.type === 'statusReaction' && b.status === 'thorns')
        if (!reaction) {
          expect(window.some((b) => b.state.hp.includes(0))).toBe(true)
          return
        }
        planted++
        expect(reaction.type === 'statusReaction' && reaction.effects[0]).toMatchObject({ type: 'applyStatus', status: 'thornSpike', target: defender, stacks: 1 })
        expect(stacksOf(reaction.state.statuses[defender], 'thornSpike')).toBe(stacksOf(before(r, reaction.id).statuses[defender], 'thornSpike') + 1)
      })
      for (const b of ofType(r, 'statusReaction'))
        if (b.status === 'thornSpike') {
          driven++
          expect(b.trigger).toBe('hit')
          expect(stacksOf(b.state.statuses[b.side], 'thornSpike')).toBe(0)
        }
      const perTurn = new Map<number, number>()
      for (const b of ofType(r, 'statusReaction')) if (b.status === 'thorns') perTurn.set(b.turn, (perTurn.get(b.turn) ?? 0) + 1)
      if ([...perTurn.values()].some((n) => n >= 2)) doubled++
    }
    expect(planted).toBeGreaterThan(0)
    expect(driven).toBeGreaterThan(0)
    // Furie des vents contre les Épines : deux coups, deux épines plantées dans le même tour
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

  it('Aura de poison (D15) : au début de chaque tour du porteur, Poison 2 à l’adversaire, sans montée ; rang II, Poison 3', () => {
    const frost: CharacterEvent = { id: 'start', name: 'start', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'frostAura', stacks: 1 }] }
    const r = run([testCharacter('a', { maxHp: 200 }, [frost]), testCharacter('b', { maxHp: 200 })])
    const ticks = ofType(r, 'statusTick').filter((b) => b.status === 'frostAura')
    expect(ticks.length).toBeGreaterThan(6)
    expect(ticks.every((t) => t.effects[0].type === 'applyStatus' && t.effects[0].status === 'poison' && t.effects[0].target === 1 && t.effects[0].stacks === 2)).toBe(true)
    for (const tick of ticks) {
      // Son propre tour, avant son coup ; l'aura ne bouge pas
      expect(tick).toMatchObject({ side: 0, phase: 'turnStart' })
      expect(stacksOf(tick.state.statuses[0], 'frostAura')).toBe(1)
      const strike = r.beats.slice(r.beats.indexOf(tick)).find((b) => b.type === 'attack')
      if (strike?.type === 'attack' && tick.state.hp[1] > 0) expect(strike).toMatchObject({ turn: tick.turn, attack: { attacker: 0 } })
    }
    // Aiguisée : Poison 3 (le total s'affiche, jamais un « +1 », D11)
    const sharp = run([testCharacter('a', { maxHp: 200 }, [{ ...frost, effects: [{ type: 'applyStatus', status: 'frostAura', stacks: 1, power: 1 }] }]), testCharacter('b', { maxHp: 200 })])
    expect(ofType(sharp, 'statusTick').filter((b) => b.status === 'frostAura').every((t) => t.effects[0].type === 'applyStatus' && t.effects[0].stacks === 3)).toBe(true)
    expect(STATUSES.frostAura.badge({ id: 'frostAura', stacks: 1 })).toBe('+2')
    expect(STATUSES.frostAura.power!(1)).toBe('Poison 3 par tour')
    // Permanente : jamais expirée
    expect(ofType(r, 'statusAge').some((b) => b.expired.includes('frostAura'))).toBe(false)
  })

  it('sans cumul (D13, D15, D17) : une nouvelle pose ne change rien aux Épines, au Poison, au Jugement ; l’Effroi plafonné à 3 charges (D16)', () => {
    for (const id of ['thorns', 'frostAura', 'judgement'] as const) {
      let list = applyStatus([], { id, stacks: 1 })
      list = applyStatus(list, { id, stacks: 1 })
      expect(list).toEqual([{ id, stacks: 1 }])
    }
    let dread = applyStatus([], { id: 'dread', stacks: 1 })
    for (let k = 0; k < 6; k++) dread = applyStatus(dread, { id: 'dread', stacks: 1 })
    expect(dread).toEqual([{ id: 'dread', stacks: 3 }])
    // +10 % de critique au plus par ses poses, et son badge compte vers le plafond
    expect(effectiveStats(testCharacter('a', { critChance: 0.2 }), dread).critChance).toBeCloseTo(0.3)
    expect(STATUSES.dread.badge(dread[0])).toBe('3/3')
    // Au combat : chaque 1 repose l'Effroi, jamais au-delà de 3
    const r = runOn(1, [testCharacter('a', { maxHp: 200 }, [at('naturalOne', 'dread')]), testCharacter('b', { maxHp: 200 })])
    const counts = ofType(r, 'event').filter((b) => b.event.side === 0).map((b) => stacksOf(b.state.statuses[0], 'dread'))
    expect(counts.length).toBeGreaterThan(3)
    expect(counts.slice(0, 4)).toEqual([1, 2, 3, 3])
  })

  it('Aura glaciale : un vrai Poison, que l’Immunité bloque et que la Régénération annule', () => {
    const frost = at('combatStart', 'frostAura')
    const immune = run([testCharacter('a', { maxHp: 60 }, [frost]), testCharacter('b', { maxHp: 60 }, [at('combatStart', 'immunity')])])
    const blocked = ofType(immune, 'statusTick').filter((b) => b.status === 'frostAura')
    expect(blocked.length).toBeGreaterThan(0)
    for (const b of blocked) expect(b.effects[0]).toMatchObject({ type: 'applyStatus', result: { kind: 'blocked' } })
    expect(ofType(immune, 'statusTick').some((b) => b.status === 'poison')).toBe(false)
    const regen: CharacterEvent = { id: 'regen', name: 'regen', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'regeneration', stacks: 5, turns: 20 }] }
    const healed = run([testCharacter('a', { maxHp: 60 }, [frost]), testCharacter('b', { maxHp: 60 }, [regen])])
    const first = ofType(healed, 'statusTick').find((b) => b.status === 'frostAura')!
    expect(first.effects[0]).toMatchObject({ type: 'applyStatus', result: { kind: 'cancelled' } })
  })

  it('Aura de puissance (refonte des auras) : +2, puis +1 par gros coup et par nouvelle pose, jusqu’à +6, avant l’armure', () => {
    // Chaque dé fait 1 : l'aura se greffe et compte dès le coup du jet ; reposée à chaque jet, elle monte d'une charge
    const r = runOn(1, [testCharacter('a', { maxHp: 80 }, [at('naturalOne', 'powerAura')]), testCharacter('b', { maxHp: 120, armor: 1 })])
    const mine = attacksOf(r).filter((x) => x.attacker === 0)
    expect(mine.length).toBeGreaterThan(5)
    // 1 + 2, 1 + 3… puis 1 + 6 à chaque coup ; l'armure retire 1
    mine.forEach((x, k) => expect(x).toMatchObject({ raw: 2 + Math.min(k + 1, 5), damage: 1 + Math.min(k + 1, 5) }))
    expect(finalState(r).statuses[0].find((s) => s.id === 'powerAura')?.stacks).toBe(5)
    expect(describeSkill(ENGRAVABLE_SKILLS.find((e) => e.id === 'power-aura')!).text).toBe('+2 dégâts à chacun de ses coups.')
    // Chaque gros coup (ici, chaque critique) : +1, sans reposer l'aura ; au plafond, plus de réaction
    const heavy = run([testCharacter('a', { maxHp: 200, critChance: 1 }, [at('combatStart', 'powerAura')]), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
    const grown = ofType(heavy, 'statusReaction').filter((b) => b.status === 'powerAura')
    expect(grown.length).toBe(4)
    for (const b of grown) {
      expect(b).toMatchObject({ side: 0, trigger: 'heavy' })
      expect(stacksOf(b.state.statuses[0], 'powerAura')).toBe(stacksOf(heavy.beats[b.id - 1].state.statuses[0], 'powerAura') + 1)
    }
    expect(finalState(heavy).statuses[0].find((s) => s.id === 'powerAura')?.stacks).toBe(5)
  })

  it('roster : une aura posée (Aura glaciale, de sainteté, de décoction) ne disparaît jamais', () => {
    const auras: StatusId[] = ['frostAura', 'powerAura', 'holyAura', 'decoctionAura']
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

  it('Aura de sainteté regroupée (D11, 2026-10-30) : à la fin de chacun de ses tours, une charge de Recueillement ; à la 2e, +4 PV, et le compte repart', () => {
    const r = run([testCharacter('a', { maxHp: 60 }, [at('combatStart', [{ type: 'applyStatus', status: 'holyAura', stacks: 1 }])]), testCharacter('b', { maxHp: 60 })])
    const ticks = ofType(r, 'statusTick').filter((b) => b.status === 'holyAura')
    expect(ticks.length).toBeGreaterThan(4)
    ticks.forEach((t, k) => {
      expect(t).toMatchObject({ side: 0, phase: 'turnEnd' })
      expect(t.effects[0]).toMatchObject({ type: 'applyStatus', target: 0, status: 'holyVigil', stacks: 1 })
      // Un tour sur deux, le soin tombe dans la même étape ; le compteur repart de zéro
      const heal = t.effects.find((e) => e.type === 'heal')
      if (k % 2 === 1) {
        expect(heal).toMatchObject({ type: 'heal', target: 0 })
        // Le soin s'arrête à ses PV max
        expect(heal?.type === 'heal' && heal.amount).toBe(Math.min(HOLY_HEAL, 60 - r.beats[t.id - 1].state.hp[0]))
        expect(stacksOf(t.state.statuses[0], 'holyVigil')).toBe(0)
      } else {
        expect(heal).toBeUndefined()
        expect(stacksOf(t.state.statuses[0], 'holyVigil')).toBe(1)
      }
    })
    expect(describeSkill(skillById('holy-aura')).text).toBe(typeset('Tous les deux tours, à la fin de son tour, elle lui rend 4 PV.'))
    expect(describeSkill(sharpen(skillById('holy-aura'), 1)).text).toBe(typeset('Tous les deux tours, à la fin de son tour, elle lui rend 6 PV.'))
  })

  it('Aura de décoction regroupée (D11, 2026-10-30) : chaque coup qui touche, une Dose ; à la 3e, Poison 6 à la cible, et le compte repart', () => {
    const r = run([testCharacter('a', { maxHp: 60 }, [at('combatStart', [{ type: 'applyStatus', status: 'decoctionAura', stacks: 1 }])]), testCharacter('b', { maxHp: 200, dodgeChance: 0 })])
    const hits = r.beats.flatMap((b, i) => (b.type === 'attack' && b.attack.attacker === 0 && !b.attack.dodged ? [i] : []))
    expect(hits.length).toBeGreaterThan(5)
    const posed: number[] = []
    for (const i of hits) {
      if (r.beats[i].state.hp[1] === 0) continue
      const reaction = r.beats[i + 1]
      expect(reaction.type === 'statusReaction' && reaction.status === 'decoctionAura').toBe(true)
      if (reaction.type !== 'statusReaction') continue
      expect(reaction.effects[0]).toMatchObject({ type: 'applyStatus', status: 'decoctionDose', stacks: 1, target: 0 })
      const poison = reaction.effects.find((e) => e.type === 'applyStatus' && e.status === 'poison')
      posed.push(poison?.type === 'applyStatus' ? poison.stacks : 0)
    }
    expect(posed.slice(0, 6)).toEqual([0, 0, DECOCTION_POISON, 0, 0, DECOCTION_POISON])
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

  it('Pile ou face (0.42.0) : pile compte comme un coup qui touche, l’Aura de décoction compte une Dose', () => {
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
        // La réaction de l'aura suit la pièce et compte une Dose (au seuil, le Poison sur l'adversaire, D11)
        expect(next.type === 'statusReaction' && next.status === 'decoctionAura').toBe(true)
        expect(next.type === 'statusReaction' && next.effects[0]).toMatchObject({ type: 'applyStatus', status: 'decoctionDose', stacks: 1 })
        poisoned++
      }
    }
    expect(poisoned).toBeGreaterThan(10)
  })

  it('Purification (0.42.0 ; 2026-10-27 ; D8) : retire le dernier bonus et blesse de 7 ; sans bonus à retirer, la lumière inflige ses 8 dégâts directs', () => {
    const purification = createCharacter('ysolde').events.find((e) => e.id === 'purification')!
    const cleanse = purification.effects[0]
    expect(cleanse).toMatchObject({ orElse: { type: 'damage', amount: 8, target: 'opponent' }, andThen: { type: 'damage', amount: 7, target: 'opponent' } })
    let empty = 0
    let full = 0
    for (const r of rosterCombats(4))
      for (const b of ofType(r, 'event')) {
        if (b.event.eventId !== 'purification') continue
        const [effect, light] = b.event.effects
        if (effect.type === 'cleanse') {
          // Un bonus retiré : la lumière suit, 7 dégâts directs à l'adversaire (5 avant le rendez-vous réarmé, D8)
          expect(effect.removed.length).toBeGreaterThan(0)
          expect(light).toMatchObject({ type: 'damage', amount: 7, target: 1 - b.event.side })
          full++
        } else {
          expect(effect).toMatchObject({ type: 'damage', amount: 8 })
          expect(light).toBeUndefined()
          empty++
        }
      }
    expect(empty).toBeGreaterThan(10)
    expect(full).toBeGreaterThan(10)
  })

  it('D8 : l’aura de départ dissipée se réarme ; elle revient d’office au début du 2e tour suivant de son porteur, pas au 1er', () => {
    let back = 0
    for (const r of rosterCombats(6)) {
      // La première dissipation de chaque camp : une suivante, son rendez-vous déjà en attente, ne le recule pas
      const done = [false, false]
      for (const b of ofType(r, 'event')) {
        const cleanse = b.event.effects[0]
        if (b.event.eventId !== 'purification' || cleanse.type !== 'cleanse') continue
        const side = cleanse.target as Side
        const start = startAuraOf(r.fighters[side])
        if (!start || !cleanse.removed.includes(start.status) || done[side]) continue
        done[side] = true
        const turns = [...new Set(r.beats.filter((x) => x.id > b.id && x.owner === side && x.turn > b.turn).map((x) => x.turn))]
        const dueIn = (turn: number) => ofType(r, 'event').filter((x) => x.turn === turn && x.event.side === side && x.event.trigger === 'auraDue')
        // Le 1er tour suivant : jamais d'office, sauf si c'est encore son 3e tour (le premier rendez-vous, pas encore passé)
        const own = new Set(r.beats.filter((x) => x.owner === side && x.turn > 0).map((x) => x.turn))
        if (turns[0] !== undefined && [...own].indexOf(turns[0]) + 1 > AURA_DUE_TURN) expect(dueIn(turns[0])).toEqual([])
        if (turns[1] === undefined || r.fighters[side].forms) continue
        // Dissipée de nouveau entre-temps : son rendez-vous repart de cette dissipation-là
        const again = r.beats.some((x) => x.id > b.id && x.turn < turns[1] && beatEffects(x).some((e) => e.type === 'cleanse' && e.target === side && e.removed.includes(start.status)))
        if (again) continue
        // Le 2e : d'office si elle n'est pas revenue d'elle-même (un 1 au dé), au début du tour, avant l'action
        const opening = r.beats.find((x) => x.turn === turns[1])!
        const had = r.beats[opening.id - 1].state.statuses[side].some((s) => s.id === start.status)
        const posed = dueIn(turns[1])
        if (had) expect(posed).toEqual([])
        else {
          expect(posed).toHaveLength(1)
          expect(posed[0]).toMatchObject({ phase: 'turnStart', event: { eventId: start.event.id } })
          back++
        }
      }
    }
    expect(back).toBeGreaterThan(5)
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
        // Sur l'adversaire seulement : un bonus retiré et la lumière qui suit, ou la lumière seule
        expect(b.event.effects.every((e) => e.target === 1 - side)).toBe(true)
        const maluses = r.beats[i - 1].state.statuses[side].filter((s) => STATUSES[s.id].polarity === 'negative').map((s) => s.id)
        for (const id of maluses) expect(b.state.statuses[side].some((s) => s.id === id), id).toBe(true)
        if (maluses.length) kept++
      })
    expect(kept).toBeGreaterThan(10)
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

  it('Aura de sainteté (regroupée, D11) : dans le roster, son Recueillement ne reste jamais à son seuil, et chacun de ses soins vaut 4 PV, +2 par charge ou rang de plus (jusqu’à ses PV max)', () => {
    let healed = 0
    for (const r of rosterCombats(4))
      r.beats.forEach((b, i) => {
        for (const side of [0, 1] as const) expect(stacksOf(b.state.statuses[side], 'holyVigil')).toBeLessThan(STATUSES.holyVigil.threshold!.at)
        if (b.type !== 'statusTick' || b.status !== 'holyAura') return
        const heal = b.effects.find((e) => e.type === 'heal')
        if (!heal || heal.type !== 'heal') return
        const was = r.beats[i - 1].state.statuses[b.side]
        const holy = was.find((s) => s.id === 'holyAura')!
        const vigil = was.find((s) => s.id === 'holyVigil')
        const want = HOLY_HEAL + 2 * Math.max(vigil?.power ?? 0, holy.stacks - 1 + (holy.power ?? 0))
        // Jusqu'à ses PV max (une Hémorragie peut aussi l'éteindre)
        expect(heal.amount).toBeLessThanOrEqual(Math.min(want, r.fighters[b.side].maxHp - r.beats[i - 1].state.hp[b.side]))
        healed++
      })
    expect(healed).toBeGreaterThan(0)
  })

  it("Coup de chance (gravé sur le 3 de Naraxes, se greffe, 0.107.0) : son coup part ; à l'action suivante, un dé de frappe par charge après le dé de compétence (D5, retour du 30 octobre)", () => {
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
          const dice = Array<number>(1 + Math.min(MAX_EXTRA_JETS, stacks)).fill(DIE_FACES)
          expect(f.faces).toEqual(dice)
          // Un coup par d6 ; les jets greffés ont leur étape `roll` pour cause, les autres la rafale
          const strikes = attacksOf(r).filter((x) => x.attacker === f.side && x.turn === f.turn)
          if (f.turn < r.turns) expect(strikes).toHaveLength(dice.length)
          // Le dé de compétence lit sa face (son 3, Coup de chance, se greffe) ; les dés de frappe portent un coup brut, sauf
          // Doublé (la face du dé de compétence, si elle porte une compétence prête) : un jet complet, qui ne redonne pas de
          // dé de plus (A7 : un 3 sur le 3 de Coup de chance reste un dé de frappe)
          for (const s of strikes) expect(s.replaced).toBe(false)
          expect(strikes[0]?.plain).toBeUndefined()
          for (const s of strikes.slice(1)) if (!s.plain) expect(s.roll).toBe(strikes[0].roll)
          for (const s of strikes.slice(1)) if (s.roll === 3 && strikes[0].roll === 3) expect(s.plain).toBe(true)
        }
      }
    expect(volleys).toBeGreaterThan(0)
  })

  it('le Doublé (D5, retour du 30 octobre) : un dé de frappe qui fait la face du dé de compétence relance sa compétence, une fois par dé ; sur une face nue, ou sinon, un coup brut, sans compétence', () => {
    const luck: CharacterEvent = { id: 'luck', name: 'luck', trigger: 'turnStart', effects: [{ type: 'applyStatus', status: 'luckyStrike', stacks: MAX_EXTRA_JETS }] }
    const two: CharacterEvent = { id: 'two', name: 'two', trigger: 'naturalTwo', effects: [{ type: 'applyStatus', status: 'poison', stacks: 1, target: 'opponent' }] }
    let doublets = 0
    let bare = 0
    let strikeDice = 0
    for (let seed = 1; seed <= 200; seed++) {
      const r = run([testCharacter('a', { maxHp: 400 }, [luck, two]), testCharacter('b', { maxHp: 400 })], seed)
      for (const f of ofType(r, 'flurry').filter((x) => x.side === 0 && x.status === 'luckyStrike')) {
        const jets = r.beats.filter((x) => x.cause === f.id && (x.type === 'roll' || x.type === 'attack'))
        const rollOf = (x: Beat) => (x.type === 'roll' ? x.roll : x.type === 'attack' ? x.attack.roll : 0)
        const skillRoll = rollOf(jets[0])
        let fired = skillRoll === 2 ? 1 : 0
        for (const jet of jets.slice(1)) {
          const mark = r.beats[jet.id - 1]
          const doubled = mark.type === 'doublet' && mark.cause === f.id
          // Seule la face 2 porte une compétence : le Doublé n'existe que là (décision du parent, retour du 30 octobre)
          expect(doubled, `graine ${seed}, tour ${f.turn}`).toBe(rollOf(jet) === skillRoll && skillRoll === 2)
          if (doubled) {
            doublets++
            expect(mark).toMatchObject({ side: 0, roll: skillRoll })
            fired++
          } else {
            strikeDice++
            if (rollOf(jet) === skillRoll) bare++
            expect(jet).toMatchObject({ type: 'attack', attack: { plain: true } })
          }
        }
        const events = r.beats.filter((x) => x.turn === f.turn && x.type === 'event' && x.event.eventId === 'two')
        if (!r.beats.some((x) => x.turn === f.turn && x.state.hp.includes(0))) expect(events, `graine ${seed}, tour ${f.turn}`).toHaveLength(fired)
      }
    }
    expect(doublets).toBeGreaterThan(5)
    expect(bare).toBeGreaterThan(doublets)
    expect(strikeDice).toBeGreaterThan(5 * doublets)
  })
})

describe('paladin (0.31.0)', () => {
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  const release = ev('naturalMax', [{ type: 'release', status: 'retribution', min: 1, target: 'opponent', source: 'strike' }], 'rel')

  it("Immunité : bloque toute nouvelle pose, sans s'user", () => {
    const r = run([
      testCharacter('a', { maxHp: 40 }, [
        ev('combatStart', [
          { type: 'cleanse', polarity: 'negative' },
          { type: 'applyStatus', status: 'immunity', stacks: 1 },
        ]),
      ]),
      testCharacter('b', { maxHp: 40 }, [ev('naturalOne', [{ type: 'applyStatus', status: 'poison', stacks: 2, turns: 3, target: 'opponent' }])]),
    ])
    const tries = ofType(r, 'event').filter((b) => b.event.side === 1)
    expect(tries.length).toBeGreaterThan(3)
    for (const t of tries) expect(t.event.effects[0]).toMatchObject({ type: 'applyStatus', result: { kind: 'blocked', by: 'immunity' } })
    expect(r.beats.every((b) => !b.state.statuses[0].some((s) => STATUSES[s.id].polarity === 'negative'))).toBe(true)
  })

  it('Riposte : le prochain coup encaissé renvoie tous les PV retirés (refonte des auras, Q6), puis la charge disparaît', () => {
    const r = run([
      testCharacter('a', { maxHp: 60 }, [ev('combatStart', [{ type: 'applyStatus', status: 'riposte', stacks: 1 }])]),
      testCharacter('b', { maxHp: 60, critChance: 1, critMultiplier: 7 }),
    ])
    const first = r.beats.findIndex((b) => b.type === 'attack' && b.attack.attacker === 1)
    const reaction = r.beats[first + 1]
    expect(reaction).toMatchObject({ type: 'statusReaction', status: 'riposte', side: 0 })
    if (reaction.type === 'statusReaction') expect(reaction.effects[0]).toMatchObject({ type: 'damage', target: 1, amount: 7 })
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

  it('Rétribution : trois jauges des derniers coups reçus, relâchées en renvois, un coup par jauge (au moins 1)', () => {
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
        const release = b.event.effects[0]
        expect(release).toMatchObject({ type: 'rebound', target: 1, status: 'retribution' })
        if (release.type === 'rebound') {
          expect(release.parts.reduce((t, n) => t + n, 0)).toBe(Math.max(1, stored))
          // Chaque jauge part en un coup sans dé, l'étape de la relâche pour cause (C1, R3)
          const blows = r.beats.filter((x) => x.cause === b.id && x.type === 'statusReaction' && x.strike)
          if (!r.beats.at(-1)!.state.hp.includes(0)) expect(blows.map((x) => (x.type === 'statusReaction' ? x.strike!.value : 0))).toEqual(release.parts)
        }
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

  it('0.76.0 : la Foudre tombe en éclairs (deux de 2 depuis D11, le même total que quatre de 1) avec son événement de scène, et les statuts de forme ne se purgent pas', () => {
    const bolt = skillById('thunderbolt')
    const strike = bolt.effects[0]
    expect(bolt).toMatchObject({ scene: 'lightning', effects: [{ type: 'damage', amount: 2, hits: 2, target: 'opponent' }] })
    // La scène garde ses impacts ; le texte dit la perte et les éclairs, pas le calcul (revue T5)
    expect(SCENE_EVENTS.lightning.impacts).toHaveLength(4)
    expect(describeSkill(bolt).text).toBe("L'adversaire perd 4 PV, en deux éclairs.")
    expect(rankText(bolt)).toBe('+2 à chacun des 2 éclairs')
    const amount = strike.type === 'damage' ? strike.amount : 0
    let bolts = 0
    for (let seed = 1; seed < 40; seed++)
      for (const b of ofType(duelOf('thaldrin', 'brokk', seed), 'event').filter((x) => x.event.eventId === 'thunderbolt')) {
        expect(b.event.effects).toEqual([{ type: 'damage', target: 1, amount: 2 * amount, source: 'lightning', parts: [amount, amount] }])
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
  const relic = (r: Partial<Relic>): Relic => ({ id: 'test-relic', name: 'Relique de test', flavor: 'Test.', tier: 'trinket', ...r })

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
    // Refonte des auras (2026-10-28) : trois auras sorties en reliques de tour
    const r28 = ['blessed-phial', 'gaoler-chain', 'lightning-rod']
    // Retour du 30 octobre (D9, D26, profondeur) : les reliques du dé, des trous et des builds
    const r30 = RELICS.slice(RELICS.findIndex((r) => r.id === 'herald-clarion')).map((r) => r.id)
    const plain = RELICS.filter((r) => !r.scene && ![...consumers, ...durability, ...lot2, ...sources, ...r27, ...r28, ...r30].includes(r.id))
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
    expect(validateRelics([relic({ trigger: { type: 'initiative' }, charges: 1 })])).toEqual(['test-relic : initiative, aura d’entrée : sans limite'])
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
    // Exception des reliques de source (2026-10-25) : le Poison, la Brûlure, le Saignement (30 octobre) ; un autre malus reste refusé
    const bleed = relic({ trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'bleed', stacks: 2, target: 'opponent' }] })
    expect(validateRelics([bleed])).toEqual([])
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
      testCharacter('b', { maxHp: 20 - REWARD_HP }).withRelics([tear]),
      testCharacter('a', { maxHp: 50 - REWARD_HP, critChance: 1, critMultiplier: 15 }).withRelics([trophy]),
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
    const rain = relic({ scene: 'emberRain', trigger: { type: 'turn', turn: 1 }, effects: [{ type: 'damage', amount: 2, hits: 3, target: 'opponent', source: 'fire' }] })
    expect(validateRelics([rain])).toEqual(['test-relic : scène à 2 impacts pour 3 coups'])
    expect(validateRelics([{ ...rain, effects: [{ type: 'damage', amount: 2, hits: 2, target: 'opponent', source: 'fire' }] }])).toEqual([])
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
    // 20 PV max, sa relique comprise (une récompense : REWARD_HP)
    const r = run([testCharacter('a', { maxHp: 20 - REWARD_HP }).withRelics([draught]), testCharacter('b', { maxHp: 200 })])
    const fires = ofType(r, 'relic')
    expect(fires).toHaveLength(2)
    for (const b of fires) {
      expect(r.beats[r.beats.indexOf(b) - 1].state.hp[0]).toBe(9)
      expect(b.state.hp[0]).toBe(14)
    }
    // Une seule charge : une seule fois, même en repassant sous le seuil
    expect(ofType(run([testCharacter('a', { maxHp: 20 - REWARD_HP }).withRelics([{ ...draught, charges: 1 }]), testCharacter('b', { maxHp: 200 })]), 'relic')).toHaveLength(1)
    // Le coup qui met K.O. ne la déclenche pas
    const ko = run([testCharacter('a', { maxHp: 20 - REWARD_HP }).withRelics([draught]), testCharacter('b', { maxHp: 200, critChance: 1, critMultiplier: 30 })])
    expect(ofType(ko, 'relic')).toHaveLength(0)
  })

  it('Dent de loup (2026-10-21) : une seule fois par combat, même quand le vol de vie remonte le porteur au-dessus de 40 %', () => {
    // a frappe pour 1 et encaisse 1 par coup : sous 40 % (7 PV sur 20), le vol de vie le remonte à 8, puis il retombe à 7
    const r = run([testCharacter('a', { maxHp: 20 - REWARD_HP }).withRelics([getRelic('wolf-fang')]), testCharacter('b', { maxHp: 200 })])
    const fires = ofType(r, 'relic')
    expect(fires).toHaveLength(1)
    const after = r.beats.slice(r.beats.indexOf(fires[0]))
    // Le seuil est bien repassé dans les deux sens après le déclenchement : sans sa charge unique, elle repartait
    const rise = after.findIndex((b) => b.state.hp[0] >= 8)
    expect(rise).toBeGreaterThan(0)
    expect(after.slice(rise).some((b) => b.state.hp[0] > 0 && b.state.hp[0] < 8)).toBe(true)
    expect(describeRelic(getRelic('wolf-fang')).text).toMatch(/, une fois$/)
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
    // Sans relique, aux mêmes PV max (la relique est une récompense : REWARD_HP)
    const unarmed = fighters[0].adjusted({ stats: { maxHp: fighters[0].definition.stats.maxHp + REWARD_HP } })
    for (let seed = 0; seed < 20; seed++) {
      const bare = simulateCombat([unarmed, fighters[1]], { seed })
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
    expect(padded.stats).toMatchObject({ maxHp: gorak.baseStats.maxHp + REWARD_HP + 15, attackMin: gorak.baseStats.attackMin - 1, attackMax: gorak.baseStats.attackMax - 1 })
    const worn = simulateCombat([padded, createCharacter('brokk')], { seed: 1 })
    expect(Math.max(...worn.beats.map((b) => b.state.hp[0]))).toBeGreaterThan(gorak.baseStats.maxHp)
    // Onguent du rebouteux : +2 PV juste après un coup encaissé qui touche, au plus une fois tous les 3 tours (D28, retour du
    // 30 octobre ; +3 PV, 2x avant) ; un soin à PV pleins ne part pas, un soin près du plafond s'arrête au plafond
    let again = 0
    for (let seed = 0; seed < 20; seed++) {
      const r = simulateCombat([createCharacter('aldric').withRelics([getRelic('bonesetter-salve')]), createCharacter('gorak')], { seed })
      const fires = ofType(r, 'relic')
      const turns = fires.map((b) => ownTurn(r, 0, b.turn))
      for (let k = 1; k < turns.length; k++) expect(turns[k] - turns[k - 1]).toBeGreaterThanOrEqual(3)
      if (fires.length > 2) again++
      for (const b of fires) {
        expect(b.effects).toEqual([expect.objectContaining({ type: 'heal' })])
        const healed = b.effects[0].type === 'heal' ? b.effects[0].amount : 0
        expect(healed === 2 || b.state.hp[0] === r.fighters[0].maxHp).toBe(true)
        const hit = r.beats[b.cause!]
        expect(hit.type === 'attack' || hit.type === 'coin').toBe(true)
        if (hit.type === 'attack') expect(hit.attack).toMatchObject({ attacker: 1, dodged: false })
      }
    }
    expect(again).toBeGreaterThan(0)
    // Chandelle de veille : +2 Armure temporaire au début de ses 3e, 6e, 9e tours
    const lit = run([testCharacter('a', { maxHp: 60 }).withRelics([getRelic('vigil-candle')]), testCharacter('b', { maxHp: 60 })])
    const fires = ofType(lit, 'relic')
    expect(fires.slice(0, 3).map((b) => ownTurn(lit, 0, b.turn))).toEqual([3, 6, 9])
    for (const b of fires) expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', status: 'bonusArmor', stacks: 2 })])
  })
})

describe('le lot des consommateurs (PROGRESSION.md § 13.3)', () => {
  const relic = (r: Partial<Relic>): Relic => ({ id: 'test-relic', name: 'Relique de test', flavor: 'Test.', tier: 'trinket', ...r })
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
      // Retour du 2026-10-30 (R72) : qui perd quoi, en PV ; ce que fait le bonus posé, entre parenthèses
      "L'adversaire perd 3 PV sur un 1",
      // Retour du 30 octobre (D11) : une seule charge se dit sans « +1 », une seule fois sans « 1x »
      'Esquive améliorée (esquive à coup sûr le prochain coup reçu) sur un 6, au plus une fois tous les 3 tours',
      '+4 dégâts sur un 4',
      'Critique assuré (son prochain coup est critique) au 1er tour',
      // Retour du 31 octobre (textes) : une relique de tour qui revient dit son rythme après une virgule
      'Retire son dernier malus (sinon +3 PV), tous les 3 tours',
      'Critique assuré (son prochain coup est critique), au 6e tour, puis tous les 4 tours',
      "Vol de vie (son prochain coup qui touche lui rend les PV qu'il retire) quand ses PV passent sous 40 %, une fois",
      "Aura d'épines (chaque coup reçu lui plante une épine ; son prochain coup qui touche les enfonce toutes : Saignement 2 par épine) quand ses PV passent sous 50 %, une fois",
      "Critique assuré (son prochain coup est critique) quand les PV de l'adversaire passent sous 30 %, une fois",
      // D24 : la Braise captive revient et profite de la Brûlure
      "L'adversaire perd 2 PV deux fois (chaque fois +1 par charge de Brûlure qu'il porte), tous les 4 tours",
      'Retire tous ses malus et +5 PV quand ses PV passent sous 35 %, une fois',
      // D28 : recharge 3 au lieu de charges
      "L'attaquant perd 2 PV trois fois lors d'une esquive, au plus une fois tous les 3 tours",
      "+2 armure temporaire lors d'un coup reçu, au plus une fois tous les 3 tours",
      '+2 dégâts aux adversaires empoisonnés',
      '+2 dégâts aux adversaires qui saignent',
      '+2 Ferveur (son prochain coup qui touche fait +2 dégâts) à chaque soin reçu',
      "+2 armure temporaire lors d'un coup reçu de 6 dégâts ou plus",
      "Esquive améliorée (esquive à coup sûr le prochain coup reçu) lors d'un coup critique, au plus une fois tous les 4 tours",
      // Les reliques de durée (phase 7)
      "+15 PV max et −1 à l'attaque",
      "+2 PV lors d'un coup reçu, au plus une fois tous les 3 tours",
      '+2 armure temporaire, tous les 3 tours',
      // Phase 8, second lot
      '+3 dégâts aux adversaires qui brûlent',
      // Contre l'armure de l'attaquant (2026-10-27, M4) : plus des dégâts directs
      "L'attaquant prend un coup de 3 dégâts (son armure compte) quand sa propre armure temporaire est vidée",
      '+2 PV quand il renvoie des dégâts',
      // Le pluriel d'un statut qui se compte (passe compendium, 2026-10-25) ; « lancer de pièce gagnant », la phrase de
      // l'utilisateur (2026-10-27) ; sa recharge depuis la mesure d'ensemble de la refonte des auras
      "+2 coups de chance (2 dés de frappe de plus à sa prochaine action ; sur un Doublé, la compétence repart) chaque fois qu'une de ses pièces fait pile, au plus une fois tous les 3 tours",
      // Les reliques de source (2026-10-25)
      "Poison 2 à l'adversaire sur un 6",
      "Brûlure 2 à l'adversaire sur un 6",
      "Riposte (son prochain coup reçu renvoie tous ses dégâts à l'attaquant) au 1er tour",
      // Retour du 2026-10-27 : la Pièce de foire retirée ; le sursis (tout le tour depuis le 2026-10-28, A15), l'initiative,
      // la chance de pile
      'Reste à 1 PV jusqu’à la fin du tour quand il devrait tomber, une fois',
      "Joue le premier tour sans jet d'initiative",
      '+25 % de chances de faire pile à ses pièces (5 sur 6 au plus)',
      'Aucun malus ne peut lui être posé, ses 3 premiers tours',
      "Ses coups font +2 par malus que porte l'adversaire, tout le combat",
      'Chacun de ses éclairs fait +2, tout le combat',
      // Retour du 30 octobre (D9, D26, profondeur de l'offre)
      'Pose son aura de départ dès le début de son 1er tour (au lieu du 3e au plus tard)',
      "Scelle la face du dernier jet de l'adversaire pendant 3 tours (un jet sur sa face scellée ne lance pas sa compétence : le coup de base seul), tous les 3 tours",
      'Relance son dé quand il tombe sur une face sans compétence, au plus une fois tous les 2 tours',
      "+5 Ferveur (son prochain coup qui touche fait +5 dégâts) lors d'un critique reçu",
      "Saignement 2 à l'adversaire sur un 6",
      // Une relique de tour à condition guette chaque début de tour, puis se recharge
      "Double le Poison de l'adversaire, puis +2, à partir du 5e tour, au début de son tour si l'adversaire est empoisonné, au plus une fois tous les 5 tours",
      "+5 Ferveur (son prochain coup qui touche fait +5 dégâts) lors d'un coup critique",
      "Vol de vie (son prochain coup qui touche lui rend les PV qu'il retire) lors d'un coup critique, au plus une fois tous les 4 tours",
      "L'adversaire perd 3 PV à chaque soin reçu, au plus une fois tous les 3 tours",
      "L'adversaire perd 2 PV deux fois, au début de son tour si l'adversaire brûle, au plus une fois tous les 3 tours",
      "Chaque éclair, flamme, rayon ou lame d'air qu'il lance fait +2, pendant 2 tours, au 1er tour, puis tous les 4 tours",
      "Brûlure 2 à l'adversaire lors d'un coup critique",
      "Poison 2 à l'attaquant lors d'un coup reçu, au plus une fois tous les 4 tours",
      "Saignement 2 à l'attaquant lors d'un coup reçu, au plus une fois tous les 4 tours",
      '+3 PV, tous les 4 tours',
      "+3 Ferveur (son prochain coup qui touche fait +3 dégâts) lors d'une esquive",
      "+2 PV lors d'un coup qui touche si l'adversaire saigne, au plus une fois tous les 2 tours",
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

  it('Encens de l’abbaye : chaque étape qui lui rend des PV lui donne +2 Ferveur (D11), cumulée, dépensée par son prochain coup qui touche', () => {
    const heal = (trigger: 'hit' | 'hurt'): CharacterEvent => ({ id: trigger, name: trigger, trigger, effects: [{ type: 'heal', amount: 1 }] })
    const r = run([testCharacter('a', { maxHp: 40 }, [heal('hit'), heal('hurt')]).withRelics([getRelic('abbey-incense')]), testCharacter('b', { maxHp: 40, attackMin: 2, attackMax: 2 })])
    const fires = ofType(r, 'relic')
    expect(fires.length).toBeGreaterThan(2)
    // Sa cause : l'étape qui l'a soigné ; chaque soin non nul l'éveille, un soin nul (PV pleins) jamais
    for (const f of fires) {
      const cause = r.beats[f.cause!]
      expect(cause.type === 'event' && cause.event.side === 0 && cause.event.effects.some((e) => e.type === 'heal' && e.amount > 0)).toBe(true)
      expect(f.effects).toEqual([expect.objectContaining({ type: 'applyStatus', status: 'momentum', stacks: 2, target: 0 })])
    }
    ofType(r, 'event').forEach((b) => {
      const healed = b.event.side === 0 && b.event.effects.some((e) => e.type === 'heal' && e.amount > 0)
      if (!b.state.hp.includes(0)) expect(fires.some((f) => f.cause === b.id), `étape ${b.id}`).toBe(healed)
    })
    // Cumulée : soigné en touchant, puis en encaissant, son coup suivant fait +4 ; la Ferveur part avec ce coup
    const mine = ofType(r, 'attack').filter((b) => b.attack.attacker === 0 && !b.attack.dodged)
    expect(mine.some((b) => b.attack.modifiers.some((m) => m.status === 'momentum' && m.delta === 4))).toBe(true)
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

  it('Plume d’aigle : après un critique, +1 Esquive améliorée, puis 4 de ses tours de recharge (quatrième demande du 2026-10-27)', () => {
    const r = run([testCharacter('a', { maxHp: 120, critChance: 1 }).withRelics([getRelic('eagle-feather')]), testCharacter('b', { maxHp: 120 })])
    expect(getRelic('eagle-feather').cooldown).toBe(4)
    const fires = ofType(r, 'relic')
    expect(fires.length).toBeGreaterThan(2)
    for (const f of fires) expect(r.beats[f.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 0, crit: true } })
    // Il critique à chaque coup : elle part un de ses tours sur quatre (8 tours du combat ; 2 de recharge : 4 tours)
    for (let k = 1; k < fires.length; k++) expect(fires[k].turn - fires[k - 1].turn).toBe(8)
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

  it('Duo (Fanchon, signature sur le 2, refonte des auras) : un coup brut de plus (trois jusqu’à la mesure d’ensemble), tout de suite, juste après le coup du jet ; aucun ne relance rien', () => {
    let duos = 0
    let volleys = 0
    for (const r of rosterCombats(4)) {
      for (const b of ofType(r, 'event')) {
        if (b.event.eventId !== 'duo') continue
        expect(causeOf(r, b)).toMatchObject({ type: 'roll', roll: 2 })
        expect(b.event.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: b.event.side, status: 'duo', stacks: 1 })])
        duos++
      }
      for (const f of ofType(r, 'flurry')) {
        if (f.status !== 'duo') continue
        expect(r.fighters[f.side].id).toBe('fanchon')
        // La rafale suit, dans le même tour, le coup du jet qui l'a posé ; toutes ses charges partent
        const posed = ofType(r, 'event').filter((b) => b.id < f.id && b.event.eventId === 'duo' && b.event.side === f.side)
        expect(posed.at(-1)!.turn).toBe(f.turn)
        expect(f.strikes).toBe(1)
        expect(stacksOf(f.state.statuses[f.side], 'duo')).toBe(0)
        // Des coups bruts : leur face ne déclenche rien (ni jet greffé, ni Duo)
        const strikes = r.beats.filter((b) => b.type === 'attack' && b.cause === f.id)
        if (f.turn < r.turns) expect(strikes).toHaveLength(1)
        for (const s of strikes) if (s.type === 'attack') expect(s.attack.plain).toBe(true)
        volleys++
      }
    }
    expect(duos).toBeGreaterThan(50)
    expect(volleys).toBeGreaterThan(30)
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
          // La Riposte entière (refonte des auras, Q6) : tous les PV de la pièce, 20
          expect(back!.effects).toEqual([{ type: 'damage', target: 0, amount: 20, source: 'strike' }])
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
    // Chaque fois que a touche (coup ou pile), il pose Saignement 2 à b dans la fenêtre `hit` et prend une pièce (le
    // Jugement servait d'exemple avant de ne plus se cumuler, D17)
    const spikes = ev('hit', [
      { type: 'applyStatus', status: 'bleed', stacks: 2, target: 'opponent' },
      { type: 'applyStatus', status: 'coinFlip', stacks: 1 },
    ])
    let coins = 0
    for (let seed = 1; seed < 40; seed++) {
      const r = run([testCharacter('a', { maxHp: 400 }, [spikes]), testCharacter('b', { maxHp: 400, dodgeChance: 0 })], seed)
      for (const coin of ofType(r, 'coin')) {
        if (!coin.heads || coin.side !== 0 || coin.state.hp.includes(0) || r.beats.some((b) => b.cause === coin.id && b.state.hp.includes(0))) continue
        // Le Saignement du début de la pièce (celui du coup qui l'a lancée) coule, sans les charges que la pièce vient d'ajouter
        const atStart = stacksOf(r.beats[coin.id - 1].state.statuses[1], 'bleed')
        expect(atStart).toBeGreaterThan(0)
        const back = reactionTo(r, coin.id, 'bleed')
        expect(back?.effects[0]).toMatchObject({ type: 'damage', target: 1, amount: atStart })
        expect(stacksOf(back!.state.statuses[1], 'bleed')).toBe(atStart + 2 - 1)
        coins++
      }
    }
    expect(coins).toBeGreaterThan(5)
  })

  it('Purification ne retire pas la Rétribution : un mécanisme ne se purge pas', () => {
    let purges = 0
    // La Rétribution, dans la réserve du Rempart depuis la refonte des auras : gravée sur le 3 d'Aldric
    const aldric = createCharacter('aldric').withForge([{ op: 'engrave', face: 3, skill: skillById('retribution') }])
    for (let seed = 1; seed < 120; seed++) {
      const r = simulateCombat([createCharacter('ysolde'), aldric], { seed })
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
    // Dorer n'est plus offerte (retour du 2026-10-28, A8) : seul le boss porte des faces dorées
    expect(offerTargets(ervald, [], { op: 'gild' })).toEqual([])
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

  it('ogre : son Aura de puissance sur le 1, son Assaut sur le 2 (refonte des auras, Q7), le reste nu ; une gravure sur le 3 (Pourfendre) frappe et pourfend', () => {
    expect(def('morgrut').events.filter((e) => isRollTrigger(e.trigger)).map((e) => `${e.id}@${e.trigger}`)).toEqual(['power-aura@naturalOne', 'assault@naturalTwo'])
    expect(() => createCharacter('morgrut').withForge([{ op: 'engrave', face: 2, skill: skill('cleave') }])).toThrow()
    const morgrut = createCharacter('morgrut').withForge([{ op: 'engrave', face: 3, skill: skill('cleave') }])
    expect(morgrut.events.filter((e) => isRollTrigger(e.trigger)).map((e) => e.id)).toEqual(['power-aura', 'assault', 'cleave'])
    expect(morgrut.events.find((e) => e.id === 'cleave')?.trigger).toBe('naturalThree')
    expect(forgedFaces(morgrut.definition, morgrut.forge)[2]).toMatchObject({ engraved: { id: 'cleave' } })
    let ones = 0
    for (let seed = 0; seed < 60; seed++) {
      const r = simulateCombat([morgrut, createCharacter('ysolde')], { seed })
      for (const b of ofType(r, 'attack').filter((x) => x.attack.attacker === 0 && x.attack.roll === 3)) {
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
        expect(cause?.type === 'attack' && cause.attack.roll === 3 && !cause.attack.dodged).toBe(true)
      }
    }
    expect(ones).toBeGreaterThan(0)
  })

  it('ogre : quatre faces de compétence au plus (« il ne fait presque rien, mais ses coups sont plus forts », quatrième demande du 2026-10-27)', () => {
    // Les dés d'aujourd'hui (le roster), pas ceux de la 0.120.0 de ce bloc
    const real = (id: string) => ROSTER.find((d) => d.id === id)!
    expect(real('morgrut').skillFaces).toBe(4)
    expect(real('morgrut').skillFaces).toBeLessThan(MAX_SKILL_FACES)
    expect(real('morgrut').stats).toMatchObject({ attackMin: 6, attackMax: 8, maxHp: 52 })
    // La plus lourde attaque du roster ; personne d'autre ne déclare de limite (la règle commune, `MAX_SKILL_FACES`)
    for (const d of ROSTER.filter((x) => x.id !== 'morgrut')) {
      expect(d.stats.attackMax, d.id).toBeLessThan(8)
      expect(d.skillFaces, d.id).toBeUndefined()
    }
    // Son aura, son Assaut et deux gravures : ni Graver ni Copier ensuite ; Gorak, au même point, grave encore
    const engraved = (id: string) => characterPool(real(id)).slice(0, 2).map((s, i) => ({ op: 'engrave' as const, face: 3 + i, skill: s }))
    const ops = (id: string, forge: ForgeStep[]) => Array.from({ length: 20 }, (_, k) => drawReward({ championId: id, forge, relics: [] }, 'forge', seededRng(k))).flatMap((r) => (r.kind === 'forge' ? r.offer.map((o) => o.op) : []))
    expect(ops('morgrut', engraved('morgrut').slice(0, 1))).toContain('engrave')
    const full = ops('morgrut', engraved('morgrut'))
    expect(full).not.toContain('engrave')
    expect(full).not.toContain('copy')
    expect(full).toEqual(expect.arrayContaining(['sharpen']))
    expect(full).not.toContain('gild')
    expect(ops('gorak', engraved('gorak'))).toContain('engrave')
  })

  it('Duo : la forge de la barde vise les faces nues, comme pour tous ; dans sa rafale de coups bruts, une face gravée ne part pas, une face dorée frappe plus fort', () => {
    const fanchon = def('fanchon')
    expect(offerTargets(fanchon, [], { op: 'engrave', skills: [skill('fear')] })).toEqual([3, 4, 5, 6])
    expect(offerTargets(fanchon, [], { op: 'gild' })).toEqual([])
    expect(() => forgeState(fanchon, [{ op: 'gild', face: 1 }])).toThrow()
    const bard = createCharacter('fanchon').withForge([{ op: 'engrave', face: 6, skill: skill('grave-breath') }, { op: 'gild', face: 5 }])
    expect(bard.events.find((e) => e.id === 'grave-breath')!.trigger).toBe(faceTrigger(6))
    let sixes = 0
    let gilded = 0
    for (let seed = 0; seed < 300; seed++) {
      const r = simulateCombat([bard, createCharacter('morgrut')], { seed })
      for (const f of ofType(r, 'flurry').filter((x) => x.side === 0 && x.status === 'duo')) {
        // Un 6 de la rafale est un coup brut : le Souffle ne part pas (aucune boucle, A11)
        for (const s of r.beats.filter((x) => x.type === 'attack' && x.cause === f.id && x.attack.roll === 6)) {
          expect(r.beats.some((x) => x.type === 'event' && x.event.eventId === 'grave-breath' && x.cause === s.id)).toBe(false)
          sixes++
        }
      }
      for (const a of attacksOf(r).filter((x) => x.attacker === 0 && !x.dodged && !x.replaced)) {
        expect(a.gild ?? 0).toBe(a.roll === 5 ? GILD_BONUS : 0)
        if (a.gild && a.plain) gilded++
      }
    }
    expect(sixes).toBeGreaterThan(10)
    expect(gilded).toBeGreaterThan(0)
  })

  it('aiguiser (E1, 0.110.0) : chaque compétence monte sur son axe de rang (ses données), un rang à la fois ; rang II au plus en partie', () => {
    const sharp = (id: string, steps: ForgeStep[], skillId: string) => createCharacter(id).withForge(steps).events.find((e) => e.id === skillId)!
    const ranks = (face: number, n: number, before: ForgeStep[] = []): ForgeStep[] => [...before, ...Array.from({ length: n }, (): ForgeStep => ({ op: 'sharpen', face }))]
    // Toute compétence du dé déclare son axe, et toutes s'aiguisent : chaque face de compétence d'un kit est proposée
    for (const e of ENGRAVABLE_SKILLS) expect(e.rankAxis, e.id).toBeDefined()
    for (const c of CHARACTERS) {
      const faces = [...new Set(c.events.flatMap((e) => rollFace(e.trigger) ?? []))].sort()
      expect(offerTargets(c.definition, [], { op: 'sharpen' }), c.id).toEqual(faces)
    }
    // Charges (Pourfendre) : deux de plus par rang depuis la revue R1 ; le journal n'a pas de rang maximal, la partie s'arrête
    // au rang II (`MAX_SHARPENS`, retour du 2026-10-28, A8)
    expect(sharp('gorak', ranks(2, 1), 'cleave')).toMatchObject({ name: 'Pourfendre II', effects: [{ stacks: 2, fromHit: 0.5 }] })
    expect(sharp('gorak', ranks(2, 3), 'cleave')).toMatchObject({ name: 'Pourfendre IV', effects: [{ stacks: 6, fromHit: 0.5 }] })
    expect(offerTargets(def('gorak'), [], { op: 'sharpen' })).toContain(2)
    expect(offerTargets(def('gorak'), ranks(2, 1), { op: 'sharpen' })).not.toContain(2)
    expect(() => withForgeStep(def('gorak'), ranks(2, 1), { op: 'sharpen', face: 2 })).toThrow()
    // Seules les compétences de la face aiguisée changent
    expect(createCharacter('gorak').withForge(ranks(2, 1)).events.filter((e) => e.id !== 'cleave')).toEqual(def('gorak').events.filter((e) => e.id !== 'cleave'))
    // Montant (Purification : sa lumière de repli, +3 par rang)
    const light = def('ysolde').events.find((e) => e.id === 'purification')!.effects[0]
    expect(sharp('ysolde', ranks(2, 1), 'purification').effects[0]).toMatchObject({ orElse: { amount: (light.type === 'cleanse' && light.orElse?.type === 'damage' ? light.orElse.amount : 0) + 3 } })
    // Intensité (Pile ou face : pile ×1 de plus, ×2 de la revue R2 à la mesure d'ensemble de la refonte des auras ; Vol de
    // vie et Riposte : leur plafond de 2 charges ne bouge pas, la Riposte en pose une depuis la mesure d'ensemble,
    // elles s'aiguisent encore au rang III ; le Vol de vie part de +4 PV (+2 avant les Maîtrises) et gagne +4 par rang, revue P3 ; Aura de sainteté :
    // +1 PV par tour par rang, au-delà de son plafond)
    expect(sharp('naraxes', ranks(2, 1), 'coin-flip').effects[0]).toMatchObject({ stacks: 1, power: 1 })
    expect(def('ervald').events.find((e) => e.id === 'life-steal')!.effects[0]).toMatchObject({ stacks: 1, power: 4 })
    expect(sharp('ervald', ranks(2, 2), 'life-steal').effects[0]).toMatchObject({ stacks: 1, power: 12 })
    expect(offerTargets(def('ervald'), ranks(2, 1), { op: 'sharpen' })).not.toContain(2)
    expect(sharp('aldric', ranks(2, 2), 'riposte').effects[0]).toMatchObject({ stacks: 1, power: 4 })
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

  it('aiguiser, dans le combat : Foudre II (+2 par éclair), Feux follets II (Brûlure 5), Esquive II, Aura glaciale II, Pile ou face II', () => {
    const foe = testCharacter('b', { maxHp: 400 })
    // Foudre II : chaque éclair fait 2 de plus, à chaque fois (D11 : deux éclairs de 4, le total de quatre de 2 avant)
    const bolts = ofType(runOn(2, [createCharacter('thaldrin').withForge([{ op: 'sharpen', face: 2 }]), foe]), 'event').filter((b) => b.event.eventId === 'thunderbolt')
    expect(bolts.length).toBeGreaterThan(3)
    for (const b of bolts) expect(b.event.effects[0]).toMatchObject({ type: 'damage', amount: 8, parts: [4, 4] })
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
    // Aura de poison II (intensité 1) : un cran de plus à chaque tour, au-delà du plafond
    const frost = runOn(1, [createCharacter('ervald').withForge([{ op: 'sharpen', face: 1 }]), foe])
    const ticks = ofType(frost, 'statusTick').filter((t) => t.side === 0 && t.status === 'frostAura')
    expect(ticks.length).toBeGreaterThan(3)
    for (const t of ticks) {
      const aura = frost.beats[t.id - 1].state.statuses[0].find((s) => s.id === 'frostAura')!
      expect(aura.power).toBe(1)
      expect(t.effects[0]).toMatchObject({ type: 'applyStatus', status: 'poison', stacks: 3 })
    }
    // Pile ou face II (chaque pièce tombe sur pile, la pièce lisant 1 = pile : la compétence aiguisée de sa face 2, portée
    // sur le 1) : ce coup ×4 (pile ×1 de plus par rang : ×2 de la revue R2 à la mesure d'ensemble de la refonte des auras),
    // la pièce rend encore trois fois les PV retirés
    const coin = createCharacter('naraxes').withForge([{ op: 'sharpen', face: 2 }]).events.find((e) => e.id === 'coin-flip')!
    const r = runOn(1, [testCharacter('a', { maxHp: 60 }, [{ ...coin, trigger: 'naturalOne' }]), foe])
    const coins = ofType(r, 'coin').filter((c) => c.side === 0)
    expect(coins.length).toBeGreaterThan(2)
    for (const c of coins) {
      const hit = r.beats.slice(0, c.id).reverse().find((b) => b.type === 'attack')!
      expect(c.heads).toBe(true)
      expect(c.effects[0]).toMatchObject({ type: 'damage', amount: (hit.type === 'attack' ? hit.attack.dealt : 0) * (COIN_HEADS + 1 - 1) })
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
      const release = b.event.effects[0]
      expect(release.type === 'rebound' && release.parts.reduce((t, n) => t + n, 0)).toBe(Math.max(1, Math.floor(stored * 0.75)))
    }
    const cresc = ofType(runOn(3, [createCharacter('gorak').withForge([{ op: 'engrave', face: 3, skill: skill('crescendo') }, { op: 'sharpen', face: 3 }]), foe]), 'attack')
    expect(cresc.find((b) => b.attack.attacker === 0)?.attack.multiplier).toBe(3)
  })

  it('offre : des opérations différentes, toutes jouables en partie ; le choix automatique est toujours valide ; ni Dorer, ni Tremper, ni aura, ni rang III', () => {
    for (const id of CHARACTER_IDS) {
      const base = def(id)
      const rng = seededRng(id.length * 31)
      let steps: ForgeStep[] = []
      for (let k = 0; k < 12; k++) {
        const offer = drawForgeOffer(base, steps, rng, ENGRAVABLE_SKILLS)
        expect(offer.length).toBeLessThanOrEqual(FORGE_OFFER_SIZE)
        expect(new Set(offer.map((o) => o.op)).size).toBe(offer.length)
        for (const o of offer) {
          expect(OFFERED_OPS, `${id} ${o.op}`).toContain(o.op)
          if (o.op === 'engrave') for (const s of o.skills) expect(isAuraSkill(s), `${id} ${s.id}`).toBe(false)
          const targets = offerTargets(base, steps, o)
          expect(targets.length, `${id} ${o.op}`).toBeGreaterThan(0)
          for (const face of targets)
            for (const to of o.op === 'copy' ? copyDestinations(base, steps, face) : [undefined])
              expect(() => withForgeStep(base, steps, stepOf(o, face, to)), `${id} ${o.op} ${face} ${to ?? ''}`).not.toThrow()
        }
        const step = autoForge(base, steps, offer, rng)
        if (!step) break
        steps = withForgeStep(base, steps, step)
        const forged = createCharacter(id).withForge(steps)
        expect(forged.baseStats).toMatchObject({ attackMin: base.stats.attackMin, attackMax: base.stats.attackMax })
        expect(Math.max(0, ...forgeState(base, steps).ranks.values()), id).toBeLessThanOrEqual(MAX_SHARPENS)
        // Une gravure ou une copie n'écrase jamais une compétence d'origine
        for (const e of base.events) expect(forged.events.some((x) => x.id === e.id && x.trigger === e.trigger), `${id} ${e.id} ${e.trigger}`).toBe(true)
      }
      expect(steps.length).toBeGreaterThan(0)
    }
    expect(() => withForgeStep(def('gorak'), [], { op: 'gild', face: 1 })).toThrow()
    expect(() => withForgeStep(def('gorak'), [], { op: 'gild', face: 5 })).toThrow()
  })

  it('une aura par personnage (retour du 2026-10-28, A2) : la partie ne grave ni ne copie une aura, ni la face 1 ; le journal le peut (tests, laboratoire)', () => {
    // Le dé d'aujourd'hui (le roster) : l'Ivresse du sang sur son 1
    const gorak = ROSTER.find((d) => d.id === 'gorak')!
    const aura = ENGRAVABLE_SKILLS.find((e) => isAuraSkill(e) && !gorak.events.some((x) => x.id === e.id))!
    const engrave: ForgeStep = { op: 'engrave', face: 3, skill: aura }
    expect(valid(gorak, [engrave])).toBe(true)
    expect(() => withForgeStep(gorak, [], engrave)).toThrow()
    expect(validOnOrigin(gorak, engrave)).toBe(false)
    // La face 1 (l'aura de départ) ne se copie pas ; une aura gravée par le journal non plus
    const one = gorak.events.find((e) => rollFace(e.trigger) === AURA_FACE)!
    expect(isAuraSkill(one)).toBe(true)
    expect(offerTargets(gorak, [], { op: 'copy' })).not.toContain(AURA_FACE)
    expect(copyDestinations(gorak, [], AURA_FACE)).toEqual([])
    expect(() => withForgeStep(gorak, [], { op: 'copy', face: AURA_FACE, to: 3 })).toThrow()
    expect(offerTargets(gorak, [engrave], { op: 'copy' })).not.toContain(3)
    // Aiguiser l'aura du 1 reste permis (une compétence de son dé, rang II au plus)
    expect(offerTargets(gorak, [], { op: 'sharpen' })).toContain(AURA_FACE)
    expect(offerTargets(gorak, [{ op: 'sharpen', face: AURA_FACE }], { op: 'sharpen' })).not.toContain(AURA_FACE)
  })

  it('trace : l’en-tête de forge se relit et rejoue le combat à l’identique ; une copie d’avant la 0.111.0 (« copy 1 ») se relit encore', () => {
    const left = createCharacter('gorak').withForge([{ op: 'engrave', face: 6, skill: skill('fear') }, { op: 'gild', face: 5 }, { op: 'sharpen', face: 1 }])
    const right = createCharacter('morgrut').withForge([{ op: 'engrave', face: 3, skill: skill('cleave') }, { op: 'copy', face: 3, to: 5 }])
    const r = simulateCombat([left, right], { seed: 5 })
    const text = traceText(r)
    expect(text).toContain('engrave 3 cleave ; copy 3 5')
    const forge = parseForge(text, ENGRAVABLE_SKILLS)
    expect(forge).toEqual([left.forge, right.forge])
    const replay = simulateCombat([createCharacter('gorak').withForge(forge[0]), createCharacter('morgrut').withForge(forge[1])], { seed: 5 })
    expect(traceText(replay)).toBe(text)
    // L'ancienne écriture, sans destination : la copie va sur la plus petite face libre (le 4 de Morgrut, son Crescendo
    // sur le 2 depuis le C5), comme alors
    const legacy = createCharacter('morgrut').withForge([{ op: 'engrave', face: 3, skill: skill('cleave') }, { op: 'copy', face: 3 }])
    const old = traceText(simulateCombat([left, legacy], { seed: 5 }))
    expect(old).toMatch(/engrave 3 cleave ; copy 3$/m)
    const relu = parseForge(old, ENGRAVABLE_SKILLS)[1]
    expect(relu).toEqual([{ op: 'engrave', face: 3, skill: skill('cleave') }, { op: 'copy', face: 3 }])
    expect(forgedFaces(def('morgrut'), relu).find((f) => f.engraved?.id === 'cleave' && f.face !== 3)?.face).toBe(4)
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

  it('Tremper l’arme, retirée (retour du 2026-10-28, A8) : un journal qui trempe est refusé, comme Refondre', () => {
    const base = testCharacter('a', { maxHp: 80, attackMin: 3, attackMax: 5 })
    const temper = { op: 'temper' } as unknown as ForgeStep
    expect(() => forgeState(base.definition, [temper])).toThrow()
    expect(() => withForgeStep(base.definition, [], temper)).toThrow()
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
    expect(copyDestinations(gorak, [{ op: 'gild', face: 3 }], 2)).toEqual([4, 5, 6])
    // Une aura par personnage (retour du 2026-10-28, A2) : la face 1, celle de l'aura, ne se copie pas en partie
    expect(copyDestinations(gorak, [], 1)).toEqual([])
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
    // Seules les faces de compétence se copient, jamais la face 1 de l'aura (A2)
    expect(offerTargets(gorak, [], { op: 'copy' })).toEqual([2])
    expect(() => forgeState(gorak, [{ op: 'copy', face: 4, to: 5 }])).toThrow()
    // Avec son rang ; deux faces au plus, puis elle n'est plus proposée
    const twice: ForgeStep[] = [{ op: 'sharpen', face: 2 }, { op: 'copy', face: 2 }]
    expect(createCharacter('gorak').withForge(twice).events.filter((e) => e.id === 'cleave').map((e) => [e.trigger, e.name])).toEqual([
      ['naturalTwo', 'Pourfendre II'],
      ['naturalThree', 'Pourfendre II'],
    ])
    expect(offerTargets(gorak, twice, { op: 'copy' })).toEqual([])
    // Le druide (0.113.0) : son sort du 2 se copie sur ses faces nues, pas son aura du 1
    expect(offerTargets(createCharacter('thaldrin').definition, [], { op: 'copy' })).toEqual([2])
    // Une aura gravée (au journal : tests, labo) ne se copie pas non plus en partie (A2), qu'elle soit plate ou cumulable
    const engrave = (skill: CharacterEvent): ForgeStep[] => [{ op: 'engrave', face: 3, skill }]
    const engraved = (id: string) => engrave(ENGRAVABLE_SKILLS.find((e) => e.id === id)!)
    const flat: CharacterEvent = { id: 'flat-aura', name: 'Aura plate', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: 'rancor', stacks: 1 }], rankAxis: { kind: 'power', per: 1 } }
    expect(offerTargets(gorak, engrave(flat), { op: 'copy' })).toEqual([2])
    expect(() => forgeState(gorak, [...engrave(flat), { op: 'copy', face: 3 }])).toThrow()
    expect(offerTargets(gorak, engraved('decoction-aura'), { op: 'copy' })).toEqual([2])
    expect(offerTargets(gorak, engraved('power-aura'), { op: 'copy' })).toEqual([2])
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
          // Un coup par jauge remplie (retour du 2026-10-27, S1), leur somme inchangée ; chacun un renvoi (C1)
          const parts = splitAmong(amount, held?.slots?.filter((n) => n > 0) ?? [])
          expect(b.event.effects).toEqual([{ type: 'rebound', target: 1, status: 'retribution', parts: parts.length > 0 ? parts : [amount] }])
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
    const shield: CharacterEvent = { id: 'shield', name: 'shield', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'immunity', stacks: 1 }] }
    const r = runOn(1, [testCharacter('a', { maxHp: 200 }, [fear]), testCharacter('b', { maxHp: 200 }, [shield])])
    const scares = ofType(r, 'event').filter((x) => x.event.eventId === 'scare')
    expect(scares).toHaveLength(1)
    expect(scares[0].event.effects[0]).toMatchObject({ type: 'applyStatus', result: { kind: 'blocked', by: 'immunity' } })
    expect(ofType(r, 'skip')).toHaveLength(0)
    expect(ofType(r, 'attack').filter((x) => x.attack.attacker === 0).length).toBeGreaterThan(3)
  })

  it('barde (le Duo, dé de la 0.120.0 de ce bloc) : un seul d6 ; sur le 2, Soliste une fois ; chaque 1, un coup brut de plus, tout de suite', () => {
    const fanchon = createCharacter('fanchon')
    // Ses compétences sont sur ses faces, comme celles de tous (l'Ouverture, hors dé, a quitté le jeu le 2026-10-27)
    for (const e of [...fanchon.events, ...characterPool(fanchon.definition)]) expect(rollFace(e.trigger)).toBeDefined()
    const target = () => testCharacter('cible', { maxHp: 400, dodgeChance: 0.3 })
    // Sur le 2 : aucune rafale ; Soliste une seule fois (0.107.0), puis sa face est nue
    const solo = runOn(2, [fanchon, target()])
    expect(ofType(solo, 'flurry')).toHaveLength(0)
    expect(ofType(solo, 'event').filter((b) => b.event.eventId === 'soloist')).toHaveLength(1)
    // Sur le 1 : chaque jet pose un Duo, qui part aussitôt en un coup brut (refonte des auras, Q8 ; trois jusqu'à la
    // mesure d'ensemble) ; un coup brut ne relance jamais de Duo : une rafale par jet
    const duo = runOn(1, [fanchon, target()])
    const volleys = ofType(duo, 'flurry').filter((f) => f.side === 0)
    expect(volleys.length).toBeGreaterThan(3)
    for (const f of volleys) expect(f).toMatchObject({ status: 'duo', strikes: 1, faces: [DIE_FACES] })
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
    // Retour du 2026-10-30 (R30-R31) : un drain au prochain coup, 1 PV par charge de Poison, rang +1
    expect(text('harvest')).toBe("Son prochain coup qui touche lui rend 1 PV par charge de Poison de l'adversaire.")
    expect(text('harvest', 1)).toBe("Son prochain coup qui touche lui rend 2 PV par charge de Poison de l'adversaire.")
    // Revue des compétences (P1) : sans condition, triple puis +2 ; rang +1
    expect(text('virulence')).toBe("Triple le Poison de l'adversaire, puis +2.")
    expect(text('virulence', 1)).toBe("Triple le Poison de l'adversaire, puis +3.")
    // Refonte des auras (2026-10-28) : une compétence à charges, 3 PV par soin ; rang +2 (D11, passe d'équilibre du 2026-10-31)
    expect(text('sentence')).toBe("Ses 3 prochains soins font perdre chacun 3 PV à l'adversaire.")
    expect(text('sentence', 1)).toBe("Ses 3 prochains soins font perdre chacun 5 PV à l'adversaire.")
    expect(text('grudge')).toBe('Son prochain coup reçu lui donne un critique assuré.')
    expect(text('grudge', 1)).toBe('Ses 2 prochains coups reçus lui donnent chacun un critique assuré.')
    // Plus de pastille de condition : elle est dans la ligne
    for (const id of ['quarry', 'harvest', 'virulence']) expect(describeSkill(skill(id)).tags.map((t) => t.label).join(' ')).not.toMatch(/\bsi\b/)
    expect(describeSkill(skill('sentence')).tags.map((t) => t.label)).not.toContain('aura permanente')
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

  it('Récolte (retour du 2026-10-30) : son statut, posé avec le dé, rend au coup qui touche 1 PV par charge de Poison de l’adversaire (+1 par rang) ; sans Poison, la charge attend', () => {
    const poisoner = ev('turnStart', [{ type: 'applyStatus', status: 'poison', stacks: 1, target: 'opponent' }])
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [poisoner]), 'harvest', rank), testCharacter('b', { maxHp: 400, attackMin: 9, attackMax: 9 })])
      const harvests = fired(r, 'harvest')
      expect(harvests.length).toBeGreaterThan(3)
      // Greffée : le dé tombe, le statut se pose, puis le coup de base de ce dé
      for (const e of harvests) {
        expect(r.beats[e.cause!].type).toBe('roll')
        expect(e.event.effects).toMatchObject([{ type: 'applyStatus', target: 0, status: 'harvest', stacks: 1 }])
      }
      const drunk = ofType(r, 'statusReaction').filter((b) => b.status === 'harvest')
      expect(drunk.length).toBeGreaterThan(3)
      for (const b of drunk) {
        expect(b).toMatchObject({ side: 0, trigger: 'hit' })
        expect(r.beats[b.cause!].type).toBe('attack')
        const before = r.beats[b.id - 1].state
        const want = (1 + rank) * stacksOf(before.statuses[1], 'poison')
        expect(b.effects).toEqual([{ type: 'heal', target: 0, amount: Math.min(want, r.fighters[0].maxHp - before.hp[0]) }])
        expect(stacksOf(b.state.statuses[0], 'harvest')).toBe(stacksOf(before.statuses[0], 'harvest') - 1)
      }
    }
    // Sans Poison : la Récolte se pose, aucun coup ne la consomme, ses charges restent
    const dry = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'harvest'), testCharacter('b', { maxHp: 400, attackMin: 9, attackMax: 9 })])
    expect(fired(dry, 'harvest').length).toBeGreaterThan(3)
    expect(ofType(dry, 'statusReaction').filter((b) => b.status === 'harvest')).toEqual([])
    expect(stacksOf(finalState(dry).statuses[0], 'harvest')).toBeGreaterThanOrEqual(3)
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

  it('Sentence (compétence à charges, refonte des auras) : ses 3 prochains soins coûtent 3 PV (+2 par rang, D11) à l’adversaire, une charge chacun, sans chaîne', () => {
    const holy = ev('combatStart', [{ type: 'applyStatus', status: 'holyAura', stacks: 1 }])
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [holy]), 'sentence', rank), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4 })])
      const reactions = ofType(r, 'statusReaction').filter((b) => b.status === 'sentence')
      expect(reactions.length).toBeGreaterThan(5)
      for (const b of reactions) {
        const held = r.beats[b.id - 1].state.statuses[0].find((s) => s.id === 'sentence')!
        expect(b.trigger).toBe('healed')
        expect(b.effects).toEqual([{ type: 'damage', target: 1, amount: 3 + 2 * rank, source: 'holy' }])
        expect(b.state.statuses[0].find((s) => s.id === 'sentence')?.stacks ?? 0).toBe(held.stacks - 1)
        // Sa cause : l'étape qui a soigné son porteur
        const cause = r.beats[b.cause!]
        expect(cause.type === 'statusTick' && cause.effects.some((e) => e.type === 'heal' && e.target === 0 && e.amount > 0)).toBe(true)
      }
    }
    // Posée seule, sans soin : ses 3 charges attendent
    const dry = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'sentence'), testCharacter('b', { maxHp: 400 })])
    expect(ofType(dry, 'statusReaction').filter((b) => b.status === 'sentence')).toEqual([])
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
    // Revue des compétences (T6, T4, O2) et des auras (A3, A2) : la condition en tête, le coup ×6, l'armure, +6 Ferveur.
    // Passe d'équilibre du 2026-10-31 : l'Embrasement relâche deux fois la Brûlure (trois avant), quatre fois au rang II
    expect(text('conflagration')).toBe("Si l'adversaire brûle, son prochain coup qui touche lui fait perdre deux fois sa Brûlure.")
    expect(text('conflagration', 1)).toBe("Si l'adversaire brûle, son prochain coup qui touche lui fait perdre quatre fois sa Brûlure.")
    // Le Dé pipé, une aura depuis les Maîtrises (M9) : sa chance de pile, du critique et de l'esquive (2026-10-27 ; 6 % depuis
    // la passe d'équilibre du 2026-10-31) ; son rang, une charge de plus
    expect(text('loaded-die')).toBe(typeset("+25 % de chances de faire pile à ses pièces (5 sur 6 au plus), +6 % de critique et +6 % d'esquive."))
    expect(text('loaded-die', 1)).toBe(typeset("+50 % de chances de faire pile à ses pièces (5 sur 6 au plus), +12 % de critique et +12 % d'esquive."))
    expect(text('vendetta')).toBe('+6 Ferveur chaque fois que son porteur renvoie des dégâts.')
    expect(text('vendetta', 1)).toBe('+12 Ferveur chaque fois que son porteur renvoie des dégâts.')
    expect(describeSkill(skill('vendetta')).tags.map((t) => t.label)).toContain('aura permanente')
    for (const id of ['conflagration', 'loaded-die', 'vendetta']) expect(rankText(skill(id))).not.toBe('ne s’aiguise pas')
  })

  it('Embrasement : le coup qui touche un adversaire qui brûle relâche 2 fois sa Brûlure restante (+2 par rang), l’éteint, et perd une charge ; sans Brûlure, la charge attend', () => {
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
        expect(b.effects).toEqual([{ type: 'damage', target: 1, amount: (CONFLAGRATION_TIMES + 2 * rank) * burn.stacks * burn.turns!, source: 'burn' }])
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
      // Sans multiplicateur de critique : le Dé pipé fait aussi critiquer (2026-10-27), le coup de 1 reste 1
      const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap((seed) => ofType(run([testCharacter('a', { maxHp: 400, critMultiplier: 1 }, [loaded(stacks), coin]), testCharacter('b', { maxHp: 400 })], seed), 'coin'))
      for (const b of all.filter((x) => x.heads)) expect(b.effects).toEqual([{ type: 'damage', target: 1, amount: 1 * (COIN_HEADS - 1), source: 'strike' }])
      // L'aura reste, charges comprises
      for (const b of all) expect(stacksOf(b.state.statuses[0], 'loadedDie')).toBe(stacks)
      return all.filter((x) => x.heads).length / all.length
    }
    expect(heads(1)).toBeCloseTo(0.75, 1)
    expect(heads(2)).toBeCloseTo(HEADS_CAP, 1)
    expect(describeSkill(skill('loaded-die')).text).toBe(typeset("+25 % de chances de faire pile à ses pièces (5 sur 6 au plus), +6 % de critique et +6 % d'esquive."))
    // Mode triche : la pièce imposée (face) reste face
    const forced = runOn(2, [testCharacter('a', { maxHp: 400 }, [loaded(2), coin]), testCharacter('b', { maxHp: 400 })])
    expect(ofType(forced, 'coin').find((b) => b.side === 0)).toMatchObject({ heads: false, forced: true })
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
    // La Rétribution qui relâche ses jauges renvoie aussi des dégâts : la Vindicte y répond une fois, son dernier coup pour
    // cause (C1 : chaque jauge est un renvoi, un coup à part)
    const retribution = ev('naturalThree', [{ type: 'release', status: 'retribution', min: 1, target: 'opponent', source: 'strike' }], 'rel')
    const vendetta = ev('combatStart', [{ type: 'applyStatus', status: 'vendetta', stacks: 1 }], 'v')
    const r = runOn(3, [testCharacter('a', { maxHp: 400 }, [vendetta, retribution]), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4 })])
    const fromRelease = reactions(r, 'vendetta').filter((b) => {
      const cause = r.beats[b.cause!]
      return cause.type === 'statusReaction' && cause.status === 'retribution' && !!cause.strike
    })
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
      expect(b.effects).toEqual([{ type: 'heal', target: 0, amount: 2 }])
    }
    // Coccinelle d'émail (la Pièce trouée) : +2 Coup de chance sur pile, la pièce pour cause ; jamais sur face ; recharge
    // de 2 de ses tours depuis la mesure d'ensemble de la refonte des auras
    const coin = ev('turnStart', [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }])
    const holed = run([testCharacter('a', { maxHp: 400 }, [coin]).withRelics([pick('holed-coin')]), testCharacter('b', { maxHp: 400 })])
    const heads = ofType(holed, 'coin').filter((b) => b.side === 0 && b.heads)
    expect(heads.length).toBeGreaterThan(3)
    for (const b of relicBeats(holed, 'holed-coin')) {
      expect(holed.beats[b.cause!]).toMatchObject({ type: 'coin', side: 0, heads: true })
      expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'luckyStrike', stacks: 2 })])
    }
    const cooldown = pick('holed-coin').cooldown!
    const ownTurns = [...new Set(holed.beats.filter((b) => b.owner === 0 && b.turn > 0).map((b) => b.turn))]
    const fired = relicBeats(holed, 'holed-coin').map((b) => ownTurns.indexOf(b.turn))
    expect(fired.length).toBeGreaterThan(1)
    for (let k = 1; k < fired.length; k++) expect(fired[k] - fired[k - 1]).toBeGreaterThanOrEqual(cooldown)
    // Une pile sans elle tombe pendant sa recharge
    for (const h of heads.filter((b) => b.state.hp.every((x) => x > 0))) {
      const t = ownTurns.indexOf(h.turn)
      if (!relicBeats(holed, 'holed-coin').some((b) => b.cause === h.id)) expect(fired.some((f) => f <= t && t - f < cooldown)).toBe(true)
    }
  })

  it('offre pertinente : chacune ne vaut que chez qui produit sa ressource', () => {
    expect(skillNeeds(skill('conflagration'))).toEqual(['status:burn'])
    expect(skillNeeds(skill('loaded-die'))).toEqual(['moment:heads'])
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
    expect(describeRelic(getRelic('wasp-sting')).text).toBe(typeset(`Poison 2 à l'adversaire sur un ${DIE_FACES}`))
    expect(describeRelic(getRelic('tinder-box')).text).toBe(typeset(`Brûlure 2 à l'adversaire sur un ${DIE_FACES}`))
    expect(describeRelic(getRelic('spiked-bracer')).text).toBe(typeset("Riposte (son prochain coup reçu renvoie tous ses dégâts à l'attaquant) au 1er tour"))
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
    for (const id of ['lucky-coin', 'cursed-coin', 'shield-coin', 'volley-coin', 'hex-coin']) {
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
        // Lancée par un critique (celui qu'une pile précédente a assuré), pile critique : l'intensité double (A14)
        expect(c.state.statuses[0].find((s) => s.id === 'guaranteedCrit')).toMatchObject({ stacks: 1, power: LUCKY_COIN_POWER * (c.crit ? 2 : 1) })
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
    expect(describeRelic(getRelic('weighted-coin')).text).toBe(typeset('+25 % de chances de faire pile à ses pièces (5 sur 6 au plus)'))
    expect(relicNeeds(getRelic('weighted-coin'))).toEqual(['moment:heads'])
  })

  it('Dé pipé (aura, M9) : il sert aussi les pièces d’effet, en plus de la Pièce lestée, toujours sous 5 sur 6', () => {
    const rate = (list: Extract<Beat, { type: 'coin' }>[]) => list.filter((c) => c.heads).length / list.length
    const loaded: CharacterEvent = { id: 'pipe', name: 'pipe', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'loadedDie', stacks: 1 }] }
    expect(rate(coins(thrower('cursed-coin', [], 0, [loaded]), 150))).toBeCloseTo(0.75, 1)
    expect(rate(coins(thrower('cursed-coin', [getRelic('weighted-coin')], 0, [loaded]), 150))).toBeCloseTo(HEADS_CAP, 1)
  })

  // Refonte des auras (tranche 6, docs/REFONTE_AURAS.md § 5.9) : trois pièces de plus, et la pile critique (A14)
  it('Pièce de bouclier, de la rafale, ensorcelée : pile, +8 armure ; deux coups bruts tout de suite ; −4 aux coups de l’adversaire, 3 tours ; face, rien', () => {
    for (const c of coins(thrower('shield-coin'))) {
      if (!c.heads) expect(c.effects).toEqual([])
      else expect(c.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'bonusArmor', stacks: 8 })])
    }
    for (const c of coins(thrower('hex-coin'))) {
      if (!c.heads) expect(c.effects).toEqual([])
      else {
        expect(c.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 1, status: 'weakened', stacks: 4 })])
        expect(c.state.statuses[1].find((s) => s.id === 'weakened')).toMatchObject({ stacks: 4, turns: 3 })
      }
    }
    let volleys = 0
    for (let seed = 1; seed < 60; seed++) {
      const r = run([thrower('volley-coin'), testCharacter('b', { maxHp: 400 })], seed)
      for (const c of ofType(r, 'coin').filter((x) => x.heads)) {
        expect(c.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'volleyStrike', stacks: 2 })])
        const burst = ofType(r, 'flurry').find((f) => f.id > c.id && f.status === 'volleyStrike')
        if (c.state.hp.every((h) => h > 0)) {
          expect(burst).toMatchObject({ side: 0, strikes: 2 })
          expect(ofType(r, 'attack').filter((a) => a.cause === burst!.id).every((a) => a.attack.plain)).toBe(true)
          volleys++
        }
      }
    }
    expect(volleys).toBeGreaterThan(20)
  })

  it('pile critique (A14) : une pièce d’effet lancée par un critique double son effet de pile, sauf une action perdue ; pas Pile ou face', () => {
    // Les piles d'une pièce sur le 1 d'un lanceur qui critique toujours (1) ou jamais (0)
    const heads = (id: string, critChance: number) =>
      Array.from({ length: 80 }, (_, k) => run([testCharacter('a', { maxHp: 400, critChance }, [{ ...coinSkill(id), trigger: 'naturalOne' }]), testCharacter('b', { maxHp: 400 })], k + 1)).flatMap((r) =>
        ofType(r, 'coin').filter((c) => c.heads),
      )
    for (const c of heads('verdigris-coin', 1)) expect(c).toMatchObject({ crit: true, effects: [expect.objectContaining({ status: 'poison', stacks: 10 })] })
    for (const c of heads('shield-coin', 1)) expect(c).toMatchObject({ crit: true, effects: [expect.objectContaining({ status: 'bonusArmor', stacks: 16 })] })
    for (const c of heads('hex-coin', 1)) expect(c.state.statuses[1].find((s) => s.id === 'weakened')).toMatchObject({ stacks: 8, turns: 3 })
    for (const c of heads('volley-coin', 1)) expect(c.effects).toEqual([expect.objectContaining({ status: 'volleyStrike', stacks: 4 })])
    // Une intensité double (le critique assuré : +4 → +8), pas ses charges
    for (const c of heads('lucky-coin', 1)) expect(c.state.statuses[0].find((s) => s.id === 'guaranteedCrit')).toMatchObject({ stacks: 1, power: LUCKY_COIN_POWER * 2 })
    // Une action perdue ne se double pas (`noCritDouble`)
    expect(STATUSES.stunned.noCritDouble).toBe(true)
    for (const c of heads('cursed-coin', 1)) expect(c).toMatchObject({ crit: true, effects: [expect.objectContaining({ status: 'stunned', stacks: 1 })] })
    // Sans critique, rien ne double ; Pile ou face multiplie déjà le coup critique : pas de pile critique
    for (const c of heads('verdigris-coin', 0)) expect(c.crit).toBeUndefined()
    for (const c of heads('coin-flip', 1)) expect(c.crit).toBeUndefined()
    expect(heads('verdigris-coin', 1).length).toBeGreaterThan(20)
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
    expect(describeRelic(getRelic('reprieve-medal')).text).toBe(typeset('Reste à 1 PV jusqu’à la fin du tour quand il devrait tomber, une fois'))
  })

  it('Médaille de sursis : aussi contre une perte qui n’est pas un coup (Poison)', () => {
    const venom: CharacterEvent = { id: 'venom', name: 'venom', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'poison', stacks: 40, target: 'opponent' }] }
    const r = run([testCharacter('a', { maxHp: 10, attackMin: 1, attackMax: 1 }).withRelics([getRelic('reprieve-medal')]), testCharacter('b', { maxHp: 400, attackMin: 1, attackMax: 1 }, [venom])])
    const [medal] = relicBeats(r, 'reprieve-medal')
    expect(r.beats[medal.cause!]).toMatchObject({ type: 'statusTick', side: 0 })
    expect(r.beats[medal.cause!].state.hp[0]).toBe(1)
  })

  it('Médaille de sursis (A15, 2026-10-28) : figé jusqu’à la fin du tour, rien ne le fait descendre sous 1 PV ; le Vol de vie ne rend que les PV retirés', () => {
    // Deux jets par action (un Coup de chance à chaque début de tour) et un Vol de vie : le second coup du tour frappe un porteur figé
    const luck: CharacterEvent = { id: 'luck', name: 'luck', trigger: 'turnStart', effects: [{ type: 'applyStatus', status: 'luckyStrike', stacks: 1 }, { type: 'applyStatus', status: 'lifesteal', stacks: 2, power: 4 }] }
    let figés = 0
    for (let seed = 1; seed < 30; seed++) {
      const r = run([testCharacter('a', { maxHp: 20, dodgeChance: 0 }).withRelics([getRelic('reprieve-medal')]), testCharacter('b', { maxHp: 400, attackMin: 30, attackMax: 30, dodgeChance: 0, critChance: 0 }, [luck])], seed)
      const [medal] = relicBeats(r, 'reprieve-medal')
      if (!medal) continue
      const turn = r.beats[medal.cause!].turn
      const rest = r.beats.filter((b) => b.id >= medal.cause! && b.turn === turn)
      for (const b of rest) expect(b.state.stone?.[0], `étape ${b.id}`).toBe(true)
      for (const b of rest) expect(b.state.hp[0]).toBeGreaterThanOrEqual(1)
      expect(r.beats.filter((b) => b.turn > turn).every((b) => !b.state.stone)).toBe(true)
      // Un coup de plus dans le tour : il ne retire rien, et le Vol de vie ne rend que son intensité
      const later = rest.filter((b) => b.type === 'attack' && b.id > medal.id && b.attack.attacker === 1 && !b.attack.dodged)
      for (const hit of later) {
        expect(hit.state.hp[0]).toBe(1)
        const drain = r.beats.find((x) => x.type === 'statusReaction' && x.status === 'lifesteal' && x.cause === hit.id)
        if (drain?.type === 'statusReaction') expect(drain.effects[0]).toMatchObject({ type: 'heal', target: 1, amount: Math.min(4, 400 - r.beats[drain.id - 1].state.hp[1]) })
        figés++
      }
    }
    expect(figés).toBeGreaterThan(0)
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
    expect(text('faith-shield')).toBe('Ses 3 prochains soins lui donnent chacun +3 armure temporaire.')
    expect(text('faith-shield', 1)).toBe('Ses 3 prochains soins lui donnent chacun +5 armure temporaire.')
    expect(text('open-wound')).toBe("4 Saignement à l'adversaire à chacun de ses critiques.")
    expect(text('open-wound', 1)).toBe("8 Saignement à l'adversaire à chacun de ses critiques.")
    expect(describeSkill(skill('open-wound')).tags.map((t) => t.label)).toContain('aura permanente')
    expect(describeSkill(skill('faith-shield')).tags.map((t) => t.label)).not.toContain('aura permanente')
    for (const id of ['faith-shield', 'open-wound']) expect(rankText(skill(id))).not.toBe('ne s’aiguise pas')
    // T1, puis R6 du retour du 2026-10-30 : la condition d'abord, et la plaie en clair (un Saignement égal à la moitié des PV retirés)
    expect(text('cleave')).toBe("S'il touche, l'adversaire prend un Saignement égal à la moitié des PV que ce coup lui retire.")
    expect(text('cleave', 1)).toBe("S'il touche, l'adversaire prend un Saignement égal à la moitié des PV que ce coup lui retire, +2.")
    expect(text('coin-flip')).toBe(typeset("S'il touche, une pièce : pile, ce coup ×3 ; face, rien."))
    // T2, T3, T7, A5
    expect(describeSkill(skill('evasion')).detail).toBe(typeset("Une seule à la fois : une nouvelle pose ne s'ajoute pas."))
    // R25 du retour du 2026-10-30, puis D13 : les épines plantées, enfoncées par son prochain coup qui touche
    expect(text('thorns')).toBe(typeset('Chaque coup reçu lui plante une épine ; son prochain coup qui touche les enfonce toutes : Saignement 2 par épine.'))
    // Le Crescendo, dans la réserve de la Fureur depuis la refonte des auras (l'Assaut sur le 2 de l'ogre)
    expect(describeSkill(skill('crescendo')).text).toBe("Ce coup ×2, puis ×1 de plus à chaque fois qu'il touche.")
    // P3, P4, P5
    expect(text('life-steal')).toBe("Ce coup lui rend les PV qu'il retire, +4.")
    expect(text('life-steal', 1)).toBe("Ce coup lui rend les PV qu'il retire, +8.")
    expect(text('false-note')).toBe("Les 2 prochains coups de l'adversaire qui touchent font −4 dégâts.")
    expect(text('false-note', 1)).toBe("Les 3 prochains coups de l'adversaire qui touchent font −4 dégâts.")
    expect(text('whistle')).toBe('+3 PV à la fin de ses 2 prochains tours (6 en tout).')
    // A4 : la pose qui monte se lit au détail, et sur l'anneau
    expect(describeSkill(skill('power-aura')).detail).toBe(
      typeset("Après le critique, avant l'armure. Chaque gros coup (un critique, un coup ×2 et plus) et chaque nouvelle pose ajoutent +1, jusqu'à +6."),
    )
    expect(describeSkill(skill('power-aura')).tags.map((t) => t.label)).toEqual(expect.arrayContaining(['se cumule', typeset('Aura de puissance : 5 charges au plus')]))
  })

  it('Bouclier de foi (compétence à charges, refonte des auras) : ses 3 prochains soins donnent 3 armure temporaire (+2 par rang, D11), le soin pour cause, une charge chacun', () => {
    const holy = ev('combatStart', [{ type: 'applyStatus', status: 'holyAura', stacks: 1 }])
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [holy]), 'faith-shield', rank), testCharacter('b', { maxHp: 400, attackMin: 6, attackMax: 6 })])
      const fired = reactions(r, 'faithShield')
      expect(fired.length).toBeGreaterThan(5)
      for (const b of fired) {
        const held = r.beats[b.id - 1].state.statuses[0].find((s) => s.id === 'faithShield')!
        expect(b).toMatchObject({ side: 0, trigger: 'healed' })
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'bonusArmor', stacks: 3 + 2 * rank })])
        expect(b.state.statuses[0].find((s) => s.id === 'faithShield')?.stacks ?? 0).toBe(held.stacks - 1)
        const cause = r.beats[b.cause!]
        expect(cause.type === 'statusTick' && cause.effects.some((e) => e.type === 'heal' && e.target === 0 && e.amount > 0)).toBe(true)
      }
    }
    // Sans soin, rien
    const dry = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'faith-shield'), testCharacter('b', { maxHp: 400 })])
    expect(reactions(dry, 'faithShield')).toEqual([])
  })

  it('Plaie ouverte (refonte des auras) : chacun de ses critiques fait saigner l’adversaire de 4 par charge ; un coup qui touche sans critique, rien', () => {
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400, critChance: 1 }), 'open-wound', rank), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
      const fired = reactions(r, 'openWound')
      expect(fired.length).toBeGreaterThan(5)
      for (const b of fired) {
        const cause = r.beats[b.cause!]
        expect(cause).toMatchObject({ type: 'attack', attack: { attacker: 0, dodged: false, crit: true } })
        const held = r.beats[b.cause! - 1].state.statuses[0].find((s) => s.id === 'openWound')!
        expect(b).toMatchObject({ side: 0, trigger: 'crit' })
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 1, status: 'bleed', stacks: OPEN_WOUND_BLEED * (held.stacks + rank) })])
      }
    }
    const dry = runOn(3, [engraved(testCharacter('a', { maxHp: 400, critChance: 0 }), 'open-wound'), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
    expect(reactions(dry, 'openWound')).toEqual([])
    expect(attacksOf(dry).filter((x) => x.attacker === 0 && !x.dodged).length).toBeGreaterThan(5)
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
      expect(t.effects).toEqual([expect.objectContaining({ type: 'heal', target: 0, amount: Math.min(3, r.fighters[0].maxHp - before.hp[0]) })])
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
    expect(text('feint')).toBe(typeset("+5 % d'esquive. Chaque esquive et chaque coup qui touche ajoutent +1 au multiplicateur de son prochain critique, +3 au plus."))
    expect(text('feint', 1)).toBe(typeset("+10 % d'esquive. Chaque esquive et chaque coup qui touche ajoutent +1 au multiplicateur de son prochain critique, +3 au plus."))
    // R44 du retour du 2026-10-30 : « qui repart » dit ce qu'il fait
    expect(text('stoke')).toBe("La Brûlure de l'adversaire monte de 2 et repart pour autant de tours que sa nouvelle valeur.")
    expect(text('stoke', 1)).toBe("La Brûlure de l'adversaire monte de 3 et repart pour autant de tours que sa nouvelle valeur.")
    expect(describeSkill(skill('stoke')).detail).toBe(typeset("Une Brûlure de 3 à un tour de sa fin devient une Brûlure de 5, pour 5 tours ; sans Brûlure, l'adversaire brûle de 2."))
    expect(text('storm-sky')).toBe(typeset("Tous les trois tours, au début de son tour, l'orage éclate : l'adversaire perd 2 PV trois fois."))
    expect(text('storm-sky', 1)).toBe(typeset("Tous les trois tours, au début de son tour, l'orage éclate : l'adversaire perd 2 PV quatre fois."))
    expect(text('blood-frenzy')).toBe('Chacun de ses critiques lui donne deux coups de plus.')
    expect(text('blood-frenzy', 1)).toBe(typeset('Chacun de ses critiques lui donne deux coups de plus, et +5 % de critique.'))
    // D11 (passe d'équilibre du 2026-10-31) : « une fois » au lieu de « 1x » ; son rang reste une fois de plus (deux de plus :
    // rang II +7,7 points nu, +12,1 construit)
    expect(text('stunning-blow')).toBe("S'il touche, l'adversaire perd sa prochaine action, une fois par combat.")
    expect(text('stunning-blow', 1)).toBe("S'il touche, l'adversaire perd sa prochaine action, deux fois par combat.")
    for (const id of ['feint', 'storm-sky', 'blood-frenzy']) expect(describeSkill(skill(id)).tags.map((t) => t.label)).toContain('aura permanente')
    for (const id of ['feint', 'stoke', 'storm-sky', 'blood-frenzy', 'stunning-blow']) {
      expect(rankText(skill(id)), id).not.toBe('ne s’aiguise pas')
      expect(EMOJI.test(describeSkill(skill(id)).text), id).toBe(false)
    }
  })

  it('Visée (refonte des auras, Q5) : +5 % d’esquive par charge ; chaque esquive et chaque coup qui touche, la Mire +1 (+3 au plus), que son critique lâche entière', () => {
    const base = createCharacter('naraxes')
    expect(effectiveStats(base, [{ id: 'feint', stacks: 2 }]).dodgeChance).toBeCloseTo(base.stats.dodgeChance + 0.1)
    expect(effectiveStats(base, [{ id: 'feint', stacks: 1, power: 1 }]).dodgeChance).toBeCloseTo(base.stats.dodgeChance + 0.1)
    expect(effectiveStats(base, [{ id: 'aim', stacks: 3 }]).critMultiplier).toBe(base.stats.critMultiplier + 3)
    let released = 0
    for (let seed = 1; seed < 20; seed++) {
      const r = run([engraved(testCharacter('a', { maxHp: 400, dodgeChance: 0.4, critChance: 0.2 }), 'feint'), testCharacter('b', { maxHp: 400, dodgeChance: 0 })], seed)
      for (const b of reactions(r, 'feint')) {
        const cause = r.beats[b.cause!]
        if (b.trigger === 'dodge') expect(cause).toMatchObject({ type: 'attack', attack: { attacker: 1, dodged: true } })
        else expect(b.trigger === 'hit' && cause.type === 'attack' && cause.attack.attacker === 0 && !cause.attack.dodged).toBe(true)
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'aim', stacks: 1 })])
        expect(stacksOf(b.state.statuses[0], 'aim')).toBeLessThanOrEqual(AIM_CAP)
      }
      // Le critique la lâche : son multiplicateur l'a comptée, puis elle part
      for (const b of reactions(r, 'aim')) {
        const blow = r.beats[b.cause!]
        const held = stacksOf(r.beats[b.cause! - 1].state.statuses[0], 'aim')
        expect(b).toMatchObject({ side: 0, trigger: 'crit', effects: [] })
        expect(blow.type === 'attack' && blow.attack.crit && blow.attack.critMultiplier).toBe(r.fighters[0].stats.critMultiplier + held)
        expect(stacksOf(b.state.statuses[0], 'aim')).toBe(0)
        released++
      }
    }
    expect(released).toBeGreaterThan(5)
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

  it('Aura d’orage (D20, 2026-10-30) : au début de chaque tour de son porteur, une Nuée ; à la 3e, l’orage éclate, trois éclairs de 2 (un de plus par charge ou rang de plus)', () => {
    expect(hurtsEachTurn('stormSky')).toBe(false)
    for (const rank of [0, 1]) {
      let storms = 0
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'storm-sky', rank), testCharacter('b', { maxHp: 400 })])
      const ticks = ofType(r, 'statusTick').filter((b) => b.status === 'stormSky')
      expect(ticks.length).toBeGreaterThan(5)
      for (const t of ticks) {
        const was = r.beats[t.id - 1].state.statuses[0]
        const held = was.find((s) => s.id === 'stormSky')!
        const cloud = was.find((s) => s.id === 'stormCloud')
        expect(t).toMatchObject({ side: 0, phase: 'turnStart' })
        expect(t.effects[0]).toMatchObject({ type: 'applyStatus', target: 0, status: 'stormCloud', stacks: 1 })
        if ((cloud?.stacks ?? 0) + 1 < 3) {
          expect(t.effects).toHaveLength(1)
          continue
        }
        const bolts = STORM_BOLTS + Math.max(cloud?.power ?? 0, held.stacks - 1 + (held.power ?? 0))
        expect(t.effects[1]).toMatchObject({ type: 'damage', target: 1, amount: STORM_BOLT * bolts, parts: Array(bolts).fill(STORM_BOLT), source: 'lightning' })
        expect(stacksOf(t.state.statuses[0], 'stormCloud')).toBe(0)
        storms++
      }
      expect(storms).toBeGreaterThan(1)
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
    const needs = Object.fromEntries(['feint', 'stoke', 'storm-sky', 'blood-frenzy', 'stunning-blow'].map((id) => [id, skillNeeds(skill(id))]))
    expect(needs).toEqual({
      feint: ['moment:dodge'],
      stoke: ['status:burn'],
      'storm-sky': [],
      'blood-frenzy': ['moment:crit'],
      'stunning-blow': [],
    })
    const offered = (championId: string, forge: ForgeStep[], ids: string[]) => offerableSkills({ championId, forge, relics: [] }, ids.map(skill)).map((s) => s.id)
    // Ervald : Attiser une fois ses Feux follets gravés ; Brokk : la Vindicte une fois sa Riposte gravée
    expect(offered('ervald', [], ['stoke'])).toEqual([])
    expect(offered('ervald', [{ op: 'engrave', face: 4, skill: skill('firefly') }], ['stoke'])).toEqual(['stoke'])
    expect(offered('brokk', [], ['vendetta'])).toEqual([])
    expect(offered('brokk', [{ op: 'engrave', face: 4, skill: skill('riposte') }], ['vendetta'])).toEqual(['vendetta'])
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
    // Passe d'équilibre du 2026-10-31 : Aveuglé pendant 4 tours
    expect(text('jinx')).toBe("Le prochain jet de l'adversaire sur une compétence tombe à vide.")
    expect(text('jinx', 1)).toBe("Les 2 prochains jets de l'adversaire sur une compétence tombent à vide.")
    expect(text('blinding')).toBe("Les critiques de l'adversaire ratent, encore 4 tours.")
    expect(text('blinding', 1)).toBe(typeset("Les critiques de l'adversaire ratent, et +10 % de coups ratés, encore 4 tours."))
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

  it('Sceau de vol : le prochain bonus volable que l’adversaire se pose lui revient, entier ; ni un mécanisme ni une aura ne se volent (A6)', () => {
    const pose = ev(
      faceTrigger(3),
      [
        { type: 'applyStatus', status: 'coinFlip', stacks: 1 },
        { type: 'applyStatus', status: 'powerAura', stacks: 1 },
        { type: 'applyStatus', status: 'momentum', stacks: 2 },
      ],
      'pose',
    )
    const r = runOn(3, [curse('sealTheft'), testCharacter('b', { maxHp: 400 }, [pose])])
    const [first, second] = ofType(r, 'event').filter((b) => b.event.eventId === 'pose')
    // Le mécanisme et l'aura restent au lanceur ; la Ferveur, un bonus de la zone des statuts, part entière
    expect(first.event.effects[0]).toMatchObject({ target: 1, status: 'coinFlip' })
    expect(first.event.effects[0]).not.toHaveProperty('stolenBy')
    expect(first.event.effects[1]).toMatchObject({ target: 1, status: 'powerAura' })
    expect(first.event.effects[1]).not.toHaveProperty('stolenBy')
    expect(first.event.effects[2]).toMatchObject({ target: 0, status: 'momentum', stacks: 2, stolenBy: 'sealTheft', result: { kind: 'applied', stacks: 2 } })
    expect(stacksOf(first.state.statuses[0], 'momentum')).toBe(2)
    expect(stacksOf(first.state.statuses[1], 'momentum')).toBe(0)
    expect(stacksOf(first.state.statuses[1], 'powerAura')).toBe(1)
    expect(stacksOf(first.state.statuses[1], 'sealTheft')).toBe(0)
    expect(second.event.effects[2]).toMatchObject({ target: 1, status: 'momentum' })
    // La règle se lit sur la définition : un bonus de la zone des statuts, jamais une aura ni un mécanisme
    for (const id of STATUS_IDS) expect(isStealable(id), id).toBe(STATUSES[id].polarity === 'positive' && STATUS_PLACE[id].place === 'tray')
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
      expect(x).toMatchObject({ side: 1, trigger: 'hurt', effects: [], strike: { dodged: true, dodgeForced: true, dodgeBy: 'evasion' } })
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
    for (const x of back) expect(x.strike?.dodgeBy).toBeUndefined()
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

  it('P7 : l’Aura mélodieuse quitte le jeu ; le Duo ne pose que le Duo, une charge (un coup brut depuis la mesure d’ensemble de la refonte des auras), son rang lui ajoute un coup', () => {
    const fanchon = createCharacter('fanchon')
    // Maîtrises (2026-10-27) : la Ballade sur le 1, le Duo sur le 2
    expect(fanchon.events.map((e) => e.id)).toEqual(['ballad', 'duo'])
    expect(fanchon.events.some((e) => e.trigger === 'combatStart')).toBe(false)
    const sharpened = fanchon.withForge([{ op: 'sharpen', face: 2 }]).events.find((e) => e.id === 'duo')!
    expect(sharpened.effects).toEqual([{ type: 'applyStatus', status: 'duo', stacks: 1, power: 1 }])
    // Rien n'est posé à l'entrée en scène
    for (let seed = 1; seed <= 10; seed++) {
      const r = run([fanchon, createCharacter('gorak')], seed)
      expect(r.beats.filter((b) => b.turn === 0)).toEqual([])
    }
    // Au rang II, deux coups bruts de plus
    const r = runOn(2, [fanchon.withForge([{ op: 'sharpen', face: 2 }]), testCharacter('d', { maxHp: 2000 })])
    expect(ofType(r, 'flurry').find((f) => f.status === 'duo')!.strikes).toBe(2)
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
    // D21 (2026-10-30) : Thaldrin passe du Poison à la Fureur (l'homme appelle l'orage, l'ours frappe)
    expect(def('thaldrin').masteries).toEqual(['magic', 'fury'])
    for (const [mastery, ids] of [
      ['poison', ['naraxes', 'ervald']],
      ['fury', ['gorak', 'morgrut', 'thaldrin']],
    ] as const) {
      const shared = poolOf(mastery).map((e) => e.id)
      for (const id of ids) {
        const pool = characterPool(def(id)).map((e) => e.id)
        // Toute la réserve de la maîtrise, moins ce qui est déjà sur son dé
        expect(pool.filter((s) => shared.includes(s)), id).toEqual(shared.filter((s) => !def(id).events.some((e) => e.id === s)))
      }
    }
  })

  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  /** L'aura `status` posée sur `a` au début du combat */
  const auraOn = (status: StatusId, stats: Partial<CharacterStats> = {}, stacks = 1) => testCharacter('a', { maxHp: 400, ...stats }, [ev('combatStart', [{ type: 'applyStatus', status, stacks }], 'aura')])
  const reactions = (r: CombatResult, status: StatusId) => ofType(r, 'statusReaction').filter((b) => b.status === status)
  const text = (id: string, rank = 0) => describeSkill(sharpen(skillById(id), rank)).text

  it('refonte des auras (§ 3) : deux auras sur la fiche, de ses maîtrises, servies par son dé ; la première sur le 1, l’autre au choix', () => {
    expect(validateRoster()).toEqual([])
    const pairs = Object.fromEntries(ROSTER.map((d) => [d.id, d.auras]))
    expect(pairs).toEqual({
      gorak: ['blood-frenzy', 'onrush'],
      elaria: ['feint', 'open-wound'],
      brokk: ['thorns', 'bastion'],
      ervald: ['frost-aura', 'dread'],
      ysolde: ['holy-aura', 'judgement'],
      naraxes: ['decoction-aura', 'loaded-die'],
      aldric: ['vendetta', 'pilfer'],
      morgrut: ['power-aura', 'thick-hide'],
      thaldrin: ['storm-sky', 'brasier'],
      fanchon: ['ballad', 'lucky-streak'],
    })
    for (const d of ROSTER) {
      const faces = d.events.map((e) => `${e.id}@${rollFace(e.trigger)}`)
      // Chacune servie par son dé de départ sans le 1 (le producteur d'abord, la règle de l'offre : `reachOf`, `skillNeeds`)
      const reach = reachOf({ ...d, events: d.events.filter((e) => rollFace(e.trigger) !== 1) })
      for (const a of d.auras!) expect(skillNeeds(skillById(a)).every((h) => reach.has(h)), `${d.id} ${a}`).toBe(true)
      expect(faces, d.id).toEqual([`${d.auras![0]}@1`, ...(d.signature ? [`${d.signature}@2`] : [])])
      // L'aura par défaut (la première, celle du duel) donne le personnage du roster, tel quel ; le tournoi et la saison en tirent une au hasard
      expect(createCharacter(d.id, { aura: d.auras![0] }), d.id).toBe(createCharacter(d.id))
      for (const aura of d.auras!) {
        const c = createCharacter(d.id, { aura })
        expect(c.events.find((e) => rollFace(e.trigger) === 1)?.id, `${d.id} ${aura}`).toBe(aura)
        expect(c.events.filter((e) => rollFace(e.trigger) !== 1)).toEqual(d.events.filter((e) => rollFace(e.trigger) !== 1))
      }
    }
    // Le druide garde ses sorts sous forme humaine, l'aura choisie comprise
    expect(createCharacter('thaldrin', { aura: 'brasier' }).events.map((e) => e.form)).toEqual(['human', 'human'])
    // Une aura hors de sa fiche est refusée ; la fiche est vérifiée (deux auras, de ses maîtrises, des auras, servies)
    expect(() => createCharacter('gorak', { aura: 'holy-aura' })).toThrow()
    const gorak = ROSTER.find((d) => d.id === 'gorak')!
    const brokk = ROSTER.find((d) => d.id === 'brokk')!
    expect(validateRoster([{ ...gorak, auras: ['blood-frenzy', 'holy-aura'] }])).toEqual(['gorak : aura holy-aura hors de ses maîtrises'])
    expect(validateRoster([{ ...gorak, auras: ['blood-frenzy', 'wind-fury'] }])).toEqual(['gorak : aura wind-fury : pas une aura'])
    expect(validateRoster([{ ...gorak, auras: ['blood-frenzy', 'blood-frenzy'] }])).toEqual(['gorak : aura en double'])
    expect(validateRoster([{ ...gorak, auras: ['onrush', 'blood-frenzy'] }])).toEqual(['gorak : le 1 du dé vanilla porte blood-frenzy, pas onrush'])
    expect(validateRoster([{ ...gorak, auras: undefined }])).toEqual(['gorak : deux auras attendues sur sa fiche'])
    // Le producteur d'abord : la Vindicte (renvois) n'est pas servie par le dé de Brokk
    expect(validateRoster([{ ...brokk, auras: ['thorns', 'vendetta'] }])).toEqual(['brokk : aura vendetta : son dé de départ ne la sert pas (le producteur d\'abord)'])
    // Aldric (attaque 5 à 7 depuis sa Riposte à une charge, mesure d'ensemble) et Morgrut (6 à 8, quatre faces de
    // compétence au plus : quatrième demande ; l'Assaut sur le 2 depuis la refonte des auras, Q7), la compensation de leur
    // dé ; Morgrut garde l'attaque la plus lourde du roster
    expect([createCharacter('aldric').stats.attackMin, createCharacter('aldric').stats.attackMax]).toEqual([5, 7])
    for (const c of CHARACTERS) if (c.id !== 'morgrut') expect(c.stats.attackMax, c.id).toBeLessThan(createCharacter('morgrut').stats.attackMax)
    expect([createCharacter('morgrut').stats.attackMin, createCharacter('morgrut').stats.attackMax]).toEqual([6, 8])
    expect(createCharacter('morgrut').definition.signature).toBe('assault')
  })

  it('Veine (refonte des auras) : chaque 6 au dé lui donne deux coups bruts de plus, tout de suite, par charge', () => {
    const r = runOn(6, [auraOn('luckyStreak'), testCharacter('b', { maxHp: 400 })])
    const fired = reactions(r, 'luckyStreak')
    expect(fired.length).toBeGreaterThan(5)
    for (const b of fired) {
      const cause = r.beats[b.cause!]
      expect(cause.type === 'roll' ? cause.roll : cause.type === 'attack' && !cause.attack.plain ? cause.attack.roll : 0).toBe(6)
      expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'veinStrike', stacks: VEIN_STRIKES })])
      // Tout de suite, dans la même action : deux coups bruts, qui ne relancent pas la Veine
      const volley = ofType(r, 'flurry').find((f) => f.side === 0 && f.status === 'veinStrike' && f.id > b.id)!
      expect(volley).toMatchObject({ turn: b.turn, strikes: VEIN_STRIKES })
    }
    expect(ofType(r, 'flurry').some((f) => f.status === 'luckyStrike')).toBe(false)
    // Sur un autre jet, rien
    expect(reactions(runOn(3, [auraOn('luckyStreak'), testCharacter('b', { maxHp: 400 })]), 'luckyStreak')).toEqual([])
    expect(text('lucky-streak')).toBe('Chaque 6 au dé lui donne 2 coups de plus, tout de suite.')
    expect(text('lucky-streak', 1)).toBe('Chaque 6 au dé lui donne 4 coups de plus, tout de suite.')
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

  it('Rancœur (refonte des auras) : chaque coup reçu lui donne +3 Ferveur, sans cumul', () => {
    for (const stacks of [1, 2]) {
      const rancor = run([auraOn('rancor', {}, stacks), testCharacter('b', { maxHp: 400 })])
      const fed = reactions(rancor, 'rancor')
      expect(fed.length).toBeGreaterThan(3)
      for (const b of fed) {
        expect(rancor.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 1, dodged: false } })
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'momentum', stacks: RANCOR_FERVOR })])
      }
    }
    expect(text('rancor')).toBe('Chaque coup reçu lui donne +3 Ferveur.')
    expect(text('rancor', 1)).toBe('Chaque coup reçu lui donne +5 Ferveur.')
  })

  it('Cuir épais (D19, 2026-10-30, Morgrut) : chaque coup reçu lui donne +3 armure temporaire, sans cumul ; +1 par rang (+4 au rang II, passe d’équilibre du 2026-10-31)', () => {
    for (const stacks of [1, 2]) {
      const r = run([auraOn('thickHide', {}, stacks), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
      const hidden = reactions(r, 'thickHide')
      expect(hidden.length).toBeGreaterThan(3)
      for (const b of hidden) {
        expect(r.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 1, dodged: false } })
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'bonusArmor', stacks: THICK_HIDE_ARMOR })])
      }
    }
    // L'armure posée attend le coup suivant : elle en absorbe une part
    const r = run([auraOn('thickHide'), testCharacter('b', { maxHp: 400, attackMin: 6, attackMax: 6, dodgeChance: 0 })])
    expect(attacksOf(r).some((a) => a.attacker === 1 && !a.dodged && a.shields.some((x) => x.status === 'bonusArmor' && x.absorbed > 0))).toBe(true)
    expect(text('thick-hide')).toBe('Chaque coup reçu lui donne +3 armure temporaire.')
    expect(text('thick-hide', 1)).toBe('Chaque coup reçu lui donne +4 armure temporaire.')
    // Morgrut la porte en seconde aura, à la place de la Rancœur ; la Rancœur reste une brique offerte du Rempart
    expect(createCharacter('morgrut', { aura: 'thick-hide' }).events.find((e) => rollFace(e.trigger) === 1)?.id).toBe('thick-hide')
    expect(poolOf('bulwark').map((e) => e.id)).toEqual(expect.arrayContaining(['rancor', 'thick-hide']))
  })

  it('Ballade (D22, 2026-10-30) : chaque coup qui touche joue une note, sans soin ; à la 4e, le refrain, quatre éclats de 2 sur l’adversaire et +4 PV', () => {
    // b frappe fort : a perd des PV, le refrain lui en rend
    const r = run([auraOn('ballad', { maxHp: 60 }), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4, dodgeChance: 0 })])
    const sung = reactions(r, 'ballad')
    expect(sung.length).toBeGreaterThan(8)
    let refrains = 0
    for (const b of sung) {
      expect(r.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 0, dodged: false } })
      expect(b.effects[0]).toMatchObject({ type: 'applyStatus', target: 0, status: 'balladNote', stacks: 1 })
      const notes = stacksOf(r.beats[b.id - 1].state.statuses[0], 'balladNote')
      if (notes === BALLAD_NOTES - 1) {
        // La 4e note : le refrain, dans la même étape ; les notes repartent de zéro
        expect(b.effects[1]).toMatchObject({ type: 'damage', target: 1, amount: BALLAD_NOTES * BALLAD_REFRAIN, parts: Array(BALLAD_NOTES).fill(BALLAD_REFRAIN), source: 'wind' })
        expect(b.effects[2]).toMatchObject({ type: 'heal', target: 0 })
        expect(b.effects[2].type === 'heal' && (b.effects[2].wanted ?? b.effects[2].amount)).toBe(BALLAD_HEAL)
        expect(stacksOf(b.state.statuses[0], 'balladNote')).toBe(0)
        refrains++
      } else {
        expect(b.effects).toHaveLength(1)
        expect(stacksOf(b.state.statuses[0], 'balladNote')).toBe(notes + 1)
      }
    }
    expect(refrains).toBeGreaterThan(1)
    expect(text('ballad')).toBe(typeset("Chaque coup qui touche joue une note ; à la 4e, le refrain : l'adversaire perd 2 PV quatre fois, et elle lui rend 4 PV."))
    expect(text('ballad', 1)).toBe(typeset("Chaque coup qui touche joue une note ; à la 4e, le refrain : l'adversaire perd 2 PV cinq fois, et elle lui rend 4 PV."))
  })

  it('Bastion (refonte des auras) : son armure temporaire vidée, l’attaquant perd 3 PV et il regagne 2 d’armure temporaire', () => {
    const armor = ev('combatStart', [{ type: 'applyStatus', status: 'bonusArmor', stacks: 3 }], 'armor')
    const r = run([testCharacter('a', { maxHp: 400 }, [armor, ...auraOn('bastion').events]), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4, dodgeChance: 0 })])
    const broken = reactions(r, 'bastion')
    expect(broken.length).toBeGreaterThan(3)
    for (const b of broken.filter((x) => x.state.hp[1] > 0)) {
      expect(b).toMatchObject({ side: 0, trigger: 'shieldBroken' })
      expect(b.effects).toEqual([
        expect.objectContaining({ type: 'damage', target: 1, amount: BASTION_LOSS, source: 'strike' }),
        expect.objectContaining({ type: 'applyStatus', target: 0, status: 'bonusArmor', stacks: BASTION_ARMOR }),
      ])
      expect(stacksOf(b.state.statuses[0], 'bonusArmor')).toBe(BASTION_ARMOR)
    }
    expect(text('bastion')).toBe("Chaque fois que son armure temporaire est vidée, l'attaquant perd 3 PV et le porteur regagne +2 armure temporaire.")
  })

  it('Jugement (D17, le verdict) : chaque coup qui la touche met une faute à l’attaquant ; à la 3e, il perd 8 PV de Lumière, ses fautes partent, et il garde son action', () => {
    const r = run([auraOn('judgement'), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
    const judged = reactions(r, 'judgement')
    expect(judged.length).toBeGreaterThan(5)
    let verdicts = 0
    for (const b of judged) {
      expect(r.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 1, dodged: false } })
      expect(b.effects[0]).toMatchObject({ type: 'applyStatus', target: 1, status: 'fault', stacks: 1 })
      const faults = stacksOf(r.beats[b.id - 1].state.statuses[1], 'fault')
      if (faults === JUDGEMENT_FAULTS - 1) {
        expect(b.effects[1]).toEqual({ type: 'damage', target: 1, amount: VERDICT_LOSS, source: 'holy' })
        expect(b.state.hp[1]).toBe(Math.max(0, r.beats[b.id - 1].state.hp[1] - VERDICT_LOSS))
        expect(stacksOf(b.state.statuses[1], 'fault')).toBe(0)
        verdicts++
      } else expect(stacksOf(b.state.statuses[1], 'fault')).toBe(faults + 1)
    }
    expect(verdicts).toBeGreaterThan(1)
    // Plus de Peur : l'attaquant ne perd aucune action
    expect(ofType(r, 'skip').some((b) => b.side === 1)).toBe(false)
    // Aiguisée : le verdict plus lourd (+2 PV)
    const sharp = run([testCharacter('a', { maxHp: 400 }, [ev('combatStart', [{ type: 'applyStatus', status: 'judgement', stacks: 1, power: 1 }], 'j')]), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
    expect(reactions(sharp, 'judgement').some((b) => b.effects[1]?.type === 'damage' && b.effects[1].amount === VERDICT_LOSS + 2)).toBe(true)
    // R28 du retour du 2026-10-30 : d'où viennent les fautes (des coups reçus, jamais des tours), et le verdict ; le
    // compteur se lit 1/3, 2/3, l'aura dit le verdict (D11 : aucun « 1 » seul)
    expect(text('judgement')).toBe(typeset("Chaque coup qui touche le porteur donne une faute à l'attaquant ; à la 3e, le verdict tombe : il perd 8 PV."))
    expect(STATUSES.fault.badge({ id: 'fault', stacks: 2 })).toBe('2/3')
    expect(STATUSES.judgement.badge({ id: 'judgement', stacks: 1 })).toBe('−8')
  })

  it('Brasier (D11, 2026-10-30) : au début de chacun de ses tours, des Tisons ; au 2e, +2 à la Brûlure de l’adversaire, qui repart ; sans Brûlure, Brûlure 2', () => {
    for (const start of [0, 3]) {
      const fire = ev('combatStart', [{ type: 'applyStatus', status: 'brasier', stacks: 1 }, ...(start ? [{ type: 'applyStatus' as const, status: 'burn' as const, stacks: start, target: 'opponent' as const }] : [])], 'fire')
      const r = run([testCharacter('a', { maxHp: 400 }, [fire]), testCharacter('b', { maxHp: 400 })])
      const ticks = ofType(r, 'statusTick').filter((b) => b.status === 'brasier')
      expect(ticks.length).toBeGreaterThan(5)
      ticks.forEach((t, k) => {
        expect(t).toMatchObject({ side: 0, phase: 'turnStart' })
        expect(t.effects[0]).toMatchObject({ type: 'applyStatus', target: 0, status: 'emberHeap', stacks: 1 })
        if (k % 2 === 0) {
          expect(t.effects).toHaveLength(1)
          return
        }
        const read = stacksOf(r.beats[t.id - 1].state.statuses[1], 'burn')
        expect(t.effects[1]).toMatchObject({ type: 'applyStatus', target: 1, status: 'burn', stacks: read + BRASIER_BURN })
        expect(t.state.statuses[1].find((s) => s.id === 'burn')).toMatchObject({ stacks: read + BRASIER_BURN, turns: read + BRASIER_BURN })
      })
    }
    // R42 du retour du 2026-10-30 : les braises qui tombent, et ce que « repart » veut dire
    expect(text('brasier')).toBe(typeset("Tous les deux tours, au début de son tour, des braises tombent sur l'adversaire : sa Brûlure monte de 2 et repart pour autant de tours que sa nouvelle valeur."))
    expect(text('brasier', 1)).toBe(typeset("Tous les deux tours, au début de son tour, des braises tombent sur l'adversaire : sa Brûlure monte de 4 et repart pour autant de tours que sa nouvelle valeur."))
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

  it('Poing de pierre (P4 ; D11 : +2, armure 5) : posé avec la Peau de pierre, ses coups font +2 tant que son armure temporaire tient ; il part quand elle est vidée', () => {
    expect(skillById('stoneskin').effects).toEqual([
      { type: 'applyStatus', status: 'bonusArmor', stacks: 5 },
      { type: 'applyStatus', status: 'stoneFist', stacks: 1 },
    ])
    expect(text('stoneskin')).toBe('+5 armure temporaire. Tant que son armure temporaire tient, ses coups font +2 dégâts.')
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
        const fist = b.attack.modifiers.some((m) => m.status === 'stoneFist' && m.delta === STONE_FIST)
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
})


describe('retour du 2026-10-27 (C2, C3) : l’aura de départ au 3e tour, le Dé pipé', () => {
  /** Les tours de `side`, dans l'ordre (tour global) */
  const turnsOf = (r: CombatResult, side: 0 | 1) => [...new Set(r.beats.filter((b) => b.owner === side && b.turn > 0).map((b) => b.turn))]

  it('au début de son 3e tour, l’aura de la face 1 absente se pose d’office, une fois (avant toute dissipation), après les statuts et reliques de tour, avant l’action', () => {
    let due = 0
    let checked = 0
    for (const r of rosterCombats(3)) {
      for (const side of [0, 1] as const) {
        const start = startAuraOf(r.fighters[side])
        expect(start, r.fighters[side].id).toBeDefined()
        // Dissipée, elle a un autre rendez-vous (D8, testé plus haut) : seules comptent ici les poses d'avant
        const dissipated = r.beats.find((b) => beatEffects(b).some((e) => e.type === 'cleanse' && e.target === side && e.removed.includes(start!.status)))?.id ?? Infinity
        const posed = ofType(r, 'event').filter((b) => b.event.side === side && b.event.trigger === 'auraDue' && b.id < dissipated)
        expect(posed.length).toBeLessThanOrEqual(1)
        const third = turnsOf(r, side)[AURA_DUE_TURN - 1]
        for (const b of posed) {
          expect(b.turn).toBe(third)
          expect(b.phase).toBe('turnStart')
          expect(b.event.eventId).toBe(start!.event.id)
          expect(r.beats[b.id - 1].state.statuses[side].some((s) => s.id === start!.status)).toBe(false)
          expect(b.state.statuses[side].some((s) => s.id === start!.status)).toBe(true)
          // Rien de son tour n'est encore parti : ni jet ni coup
          expect(r.beats.slice(0, b.id).some((x) => x.turn === third && x.phase === 'action')).toBe(false)
          due++
        }
        // Hors du druide (son 1 ne vaut qu'en forme humaine) : à la première étape de l'action de son 3e tour, l'aura est là
        if (third === undefined || r.fighters[side].forms) continue
        const acting = r.beats.find((b) => b.turn === third && b.phase === 'action')
        if (!acting) continue
        expect(r.beats[acting.id - 1].state.statuses[side].some((s) => s.id === start!.status), `${r.fighters[side].id} graine ${r.seed}`).toBe(true)
        checked++
      }
    }
    expect(due).toBeGreaterThan(30)
    expect(checked).toBeGreaterThan(100)
  })

  it('un 1 la pose plus tôt (rien au 3e tour) ; une aura cumulable gagne une charge à chaque 1 ; sans auras de départ, aucune pose d’office', () => {
    // Chaque dé fait 1 : l'Aura de puissance de Morgrut est là dès son 1er tour, et monte d'une charge par jet
    const r = simulateCombat([createCharacter('morgrut'), createCharacter('ysolde')], { seed: 3, forcedRolls: Object.fromEntries(Array.from({ length: 6 }, (_, k) => [k, 1])) })
    expect(ofType(r, 'event').some((b) => b.event.side === 0 && b.event.trigger === 'auraDue')).toBe(false)
    const powers = ofType(r, 'event').filter((b) => b.event.side === 0 && b.event.eventId === 'power-aura')
    expect(powers.length).toBeGreaterThan(1)
    expect(stacksOf(powers[1].state.statuses[0], 'powerAura')).toBe(2)
    // Un personnage de test (sans auras de départ) n'a pas de rendez-vous, même avec une aura sur le 1
    const aura: CharacterEvent = { id: 'pa', name: 'pa', trigger: 'naturalOne', effects: [{ type: 'applyStatus', status: 'powerAura', stacks: 1 }] }
    expect(startAuraOf(testCharacter('a', {}, [aura]))).toBeUndefined()
  })

  it('le journal, la trace et le libellé disent le rendez-vous', () => {
    const r = [...rosterCombats(2)].find((x) => ofType(x, 'event').some((b) => b.event.trigger === 'auraDue'))!
    const b = ofType(r, 'event').find((x) => x.event.trigger === 'auraDue')!
    expect(eventLog(b.event, r.fighters).text).toContain(`Début du tour ${of(r.fighters[b.event.side].name)} : son aura s'éveille.`)
    expect(traceText(r)).toContain('au début de son 3e tour, ou de son 2e tour après sa dissipation, son aura de départ absente')
    for (const text of [eventLog(b.event, r.fighters).text, triggerText('auraDue').label]) expect(text).not.toMatch(EMOJI)
  })

  it('Dé pipé : +25 % de pile, +6 % de critique et +6 % d’esquive par charge (5 % avant la passe d’équilibre du 2026-10-31), rang compris', () => {
    const c = createCharacter('naraxes')
    const base = effectiveStats(c, [])
    const two = effectiveStats(c, [{ id: 'loadedDie', stacks: 1, power: 1 }])
    expect(two.critChance).toBeCloseTo(base.critChance + 0.12)
    expect(two.dodgeChance).toBeCloseTo(base.dodgeChance + 0.12)
    expect(STATUSES.loadedDie.headsChance).toBe(0.25)
  })
})

describe('retour du 2026-10-27 (C1) : la Riposte et la Rétribution sont des coups (RESOLUTION § 9)', () => {
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  const riposte = ev('turnStart', [{ type: 'applyStatus', status: 'riposte', stacks: 1 }], 'rip')
  const release = ev('naturalMax', [{ type: 'release', status: 'retribution', min: 1, target: 'opponent', source: 'strike' }], 'rel')
  type Reaction = Extract<Beat, { type: 'statusReaction' }>
  /** Les renvois d'un combat (un coup sans dé chacun), d'un statut */
  const rebounds = (r: CombatResult, status: StatusId) => ofType(r, 'statusReaction').filter((b): b is Reaction & { strike: NonNullable<Reaction['strike']> } => b.status === status && !!b.strike)
  /** a riposte à chaque coup de b (coup fixe de 4) */
  const duel = (a: Partial<CharacterStats>, b: Partial<CharacterStats>, aEvents: CharacterEvent[] = [], bEvents: CharacterEvent[] = [], seed = 1) =>
    run([testCharacter('a', { maxHp: 400, ...a }, [riposte, ...aEvents]), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4, ...b }, bEvents)], seed)

  it('une Riposte esquivée au tirage consomme sa charge, sans dégât, et ouvre la fenêtre `dodge` de la cible', () => {
    const r = duel({}, { dodgeChance: 1 }, [], [ev('dodge', [{ type: 'heal', amount: 1 }], 'evade')])
    const all = rebounds(r, 'riposte')
    expect(all.length).toBeGreaterThan(5)
    for (const x of all) {
      expect(x.strike).toMatchObject({ attacker: 0, rebound: true, roll: 0, value: 4, dodged: true, dodgeForced: false, damage: 0 })
      expect(x.effects).toEqual([])
      expect(stacksOf(x.state.statuses[0], 'riposte')).toBe(stacksOf(r.beats[x.id - 1].state.statuses[0], 'riposte') - 1)
      expect(r.beats.some((b) => b.cause === x.id && b.type === 'event' && b.event.eventId === 'evade')).toBe(true)
    }
  })

  it('critique au tirage, avec le multiplicateur du riposteur ; contre l’armure de la cible', () => {
    const crit = rebounds(duel({ critChance: 1, critMultiplier: 3 }, {}), 'riposte')
    expect(crit.length).toBeGreaterThan(5)
    for (const x of crit) {
      expect(x.strike).toMatchObject({ value: 4, crit: true, critForced: false, raw: 12, damage: 12, dealt: 12 })
      expect(x.effects).toEqual([{ type: 'damage', target: 1, amount: 12, source: 'strike' }])
    }
    const armored = rebounds(duel({}, { armor: 1 }), 'riposte')
    expect(armored.length).toBeGreaterThan(5)
    // b frappe 4 contre une armure 0 : la Riposte, entière depuis la refonte des auras, vaut 4, l'armure 1 de b en retient 1
    for (const x of armored) expect(x.strike).toMatchObject({ value: 4, armor: 1, armorAbsorbed: 1, damage: 3 })
  })

  it('R2 : une Riposte dépense le Critique assuré, comme toute frappe', () => {
    let spent = 0
    for (let seed = 1; seed < 30; seed++) {
      const r = duel({}, {}, [ev('turnEnd', [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }], 'sure')], [], seed)
      for (const x of rebounds(r, 'riposte')) {
        const held = stacksOf(r.beats[x.id - 1].state.statuses[0], 'guaranteedCrit')
        expect(x.strike.critForced).toBe(held > 0)
        if (held === 0) continue
        expect(x.strike).toMatchObject({ crit: true, critBy: 'guaranteedCrit' })
        expect(stacksOf(x.state.statuses[0], 'guaranteedCrit')).toBe(0)
        spent++
      }
    }
    expect(spent).toBeGreaterThan(5)
  })

  it('fenêtre `hit` du riposteur : le Vol de vie draine, l’Aura de décoction empoisonne, le renvoi pour cause', () => {
    const r = duel({}, {}, [ev('turnEnd', [{ type: 'applyStatus', status: 'lifesteal', stacks: 1 }], 'drain'), ev('combatStart', [{ type: 'applyStatus', status: 'decoctionAura', stacks: 1 }], 'aura')])
    let drained = 0
    for (const x of rebounds(r, 'riposte')) {
      const caused = r.beats.filter((b): b is Reaction => b.cause === x.id && b.type === 'statusReaction')
      expect(caused.some((b) => b.status === 'decoctionAura' && b.trigger === 'hit')).toBe(true)
      const drain = caused.find((b) => b.status === 'lifesteal')
      if (!drain) continue
      expect(drain).toMatchObject({ trigger: 'hit', side: 0 })
      expect(drain.effects[0]).toMatchObject({ type: 'heal', target: 0 })
      drained++
    }
    expect(drained).toBeGreaterThan(3)
  })

  it('R4 : une relique « contre un adversaire empoisonné » s’applique au renvoi ; une relique de face jamais (pas de dé)', () => {
    const venom = ev('combatStart', [{ type: 'applyStatus', status: 'poison', stacks: 40, target: 'opponent' }], 'venom')
    const r = run([
      testCharacter('a', { maxHp: 400 }, [riposte, venom]).withRelics([getRelic('venom-vial'), getRelic('four-nail-shoe')]),
      testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4 }),
    ])
    const all = rebounds(r, 'riposte').filter((x) => stacksOf(r.beats[x.id - 1].state.statuses[1], 'poison') > 0)
    expect(all.length).toBeGreaterThan(3)
    for (const x of all) expect(x.strike).toMatchObject({ value: 4, relicBonus: [{ relic: 'venom-vial', name: getRelic('venom-vial').name, amount: 2 }], damage: 6 })
  })

  it('R1 : un renvoi ne déclenche pas de renvoi ; la Riposte touchée par une Riposte garde sa charge', () => {
    const r = run([testCharacter('a', { maxHp: 400 }, [riposte]), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4 }, [riposte])])
    const all = [...rebounds(r, 'riposte')]
    expect(all.length).toBeGreaterThan(10)
    for (const x of all) {
      expect(r.beats[x.cause!].type).not.toBe('statusReaction')
      if (x.strike.dodged) continue
      const target = (1 - x.side) as Side
      expect(r.beats.some((b) => b.cause === x.id && b.type === 'statusReaction' && b.strike)).toBe(false)
      expect(stacksOf(r.beats.filter((b) => b.cause === x.id).at(-1)?.state.statuses[target] ?? x.state.statuses[target], 'riposte')).toBe(stacksOf(x.state.statuses[target], 'riposte'))
    }
  })

  it('R3 : chaque jauge de la Rétribution est un coup à part (son esquive, son armure, son critique)', () => {
    let parts = 0
    let dodged = 0
    let landed = 0
    for (let seed = 1; seed < 40; seed++) {
      const r = run([testCharacter('a', { maxHp: 400, critChance: 0.3 }, [release]), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4, armor: 1, dodgeChance: 0.3 })], seed)
      for (const b of ofType(r, 'event').filter((x) => x.event.eventId === 'rel')) {
        const freed = b.event.effects[0]
        if (freed.type !== 'rebound') throw new Error('relâche attendue')
        const blows = r.beats.filter((x): x is Reaction => x.cause === b.id && x.type === 'statusReaction' && !!x.strike)
        if (r.beats.at(-1)!.state.hp.includes(0) && blows.length < freed.parts.length) continue
        expect(blows.map((x) => x.strike!.value)).toEqual(freed.parts)
        for (const x of blows) {
          parts++
          if (x.strike!.dodged) dodged++
          else {
            landed++
            // Chaque coup contre l'armure de b, au moins 1
            expect(x.strike).toMatchObject({ armor: 1, damage: Math.max(1, (x.strike!.crit ? Math.round(x.strike!.value * 2) : x.strike!.value) - 1) })
          }
        }
      }
    }
    expect(parts).toBeGreaterThan(20)
    expect(dodged).toBeGreaterThan(0)
    expect(landed).toBeGreaterThan(0)
  })

  it('la trace lit un renvoi comme un coup', () => {
    const r = duel({ critChance: 1, critMultiplier: 3 }, { armor: 1 })
    expect(traceText(r)).toContain('renvoi sur b, coup sans dé · valeur 4 · critique ×3')
  })
})

describe('retour du 2026-10-27 : au plus douze jets de plus par action (MAX_EXTRA_JETS)', () => {
  it('la Veine à 12 charges contre un adversaire qui esquive tout : les jets d’une action ne croissent plus sans fin (`npm run ramp` plantait)', () => {
    // Retour du 2026-10-27 : la Veine à 12 charges ; depuis la refonte des auras (la Veine en coups bruts), 12 Coups de
    // chance à chaque début de tour
    const streak: CharacterEvent = { id: 'streak', name: 'streak', trigger: 'turnStart', effects: [{ type: 'applyStatus', status: 'luckyStrike', stacks: 12 }] }
    const r = run([testCharacter('a', { maxHp: 400 }, [streak]), testCharacter('b', { maxHp: 400, dodgeChance: 1 })])
    const volleys = ofType(r, 'flurry').filter((b) => b.status === 'luckyStrike')
    expect(volleys.length).toBeGreaterThan(20)
    for (const b of volleys) expect(b.strikes).toBeLessThanOrEqual(1 + MAX_EXTRA_JETS)
    // Le plafond sert : des actions à sept jets, toutes les charges parties avec elles
    const capped = volleys.filter((b) => b.strikes === 1 + MAX_EXTRA_JETS)
    expect(capped.length).toBeGreaterThan(5)
    for (const b of capped) expect(stacksOf(r.beats[b.id - 1].state.statuses[0], 'luckyStrike')).toBeGreaterThanOrEqual(MAX_EXTRA_JETS)
    expect(r.endedBy).toBe('ko')
  })
})

describe('troisième retour du 2026-10-27 (C5) : plafond d’esquive (MAX_DODGE)', () => {
  // Le Larcin (+10 % d'esquive par charge) : le Pas de côté, qui servait ici, est sorti avec la refonte des auras
  const pilfer = (stacks: number): CharacterEvent => ({ id: 'step', name: 'step', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'pilfer', stacks }] })

  it('les statuts ne portent pas l’esquive au-delà de 75 % ; une esquive de fiche plus haute reste la sienne', () => {
    const fanchon = createCharacter('fanchon')
    expect(effectiveStats(fanchon, [{ id: 'pilfer', stacks: 2 }]).dodgeChance).toBeCloseTo(fanchon.stats.dodgeChance + 0.2)
    expect(effectiveStats(fanchon, [{ id: 'pilfer', stacks: 20 }]).dodgeChance).toBe(MAX_DODGE)
    expect(effectiveStats(fanchon, [{ id: 'pilfer', stacks: 6 }, { id: 'loadedDie', stacks: 3 }]).dodgeChance).toBe(MAX_DODGE)
    // Un personnage de test qui esquive tout le garde ; un malus d'esquive s'applique toujours
    const dodger = testCharacter('t', { dodgeChance: 1 })
    expect(effectiveStats(dodger, [{ id: 'pilfer', stacks: 3 }]).dodgeChance).toBe(1)
    expect(effectiveStats(fanchon, [{ id: 'pilfer', stacks: 20 }, { id: 'firefly', stacks: 1 }]).dodgeChance).toBe(0)
  })

  it('vingt charges de Larcin : trois coups sur quatre esquivés, et le combat finit par un K.O. (il durait jusqu’à MAX_TURNS)', () => {
    let dodged = 0
    let strikes = 0
    for (let seed = 1; seed <= 20; seed++) {
      const r = run([testCharacter('a', { maxHp: 60 }, [pilfer(20)]), testCharacter('b', { maxHp: 60 })], seed)
      expect(r.endedBy).toBe('ko')
      const theirs = attacksOf(r).filter((a) => a.attacker === 1 && !a.replaced)
      strikes += theirs.length
      dodged += theirs.filter((a) => a.dodged).length
    }
    expect(strikes).toBeGreaterThan(400)
    expect(dodged / strikes).toBeGreaterThan(0.7)
    expect(dodged / strikes).toBeLessThan(0.8)
  })
})
describe('quatrième demande du 2026-10-27 : le contenu du soin (Lumière, Sang, Poison)', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  const engraved = (c: Character, id: string, rank = 0) =>
    c.withForge([{ op: 'engrave', face: 3, skill: skill(id) }, ...Array.from({ length: rank }, (): ForgeStep => ({ op: 'sharpen', face: 3 }))])
  const reactions = (r: CombatResult, status: StatusId) => ofType(r, 'statusReaction').filter((b) => b.status === status)
  const text = (id: string, rank = 0) => describeSkill(engraved(createCharacter('morgrut'), id, rank).events.find((e) => e.id === id)!).text
  const held = (r: CombatResult, beat: Beat, side: Side, status: StatusId) => r.beats[beat.id - 1].state.statuses[side].find((s) => s.id === status)
  const fired = (r: CombatResult, id: string) => ofType(r, 'event').filter((b) => b.event.eventId === id)
  const bleeder = ev('turnStart', [{ type: 'applyStatus', status: 'bleed', stacks: 3, target: 'opponent' }], 'bleeder')
  const poisoner = ev('turnStart', [{ type: 'applyStatus', status: 'poison', stacks: 2, target: 'opponent' }], 'poisoner')

  it('les textes, au style de l’utilisateur, et leurs rangs', () => {
    expect(validateRoster()).toEqual([])
    // D11 (passe d'équilibre du 2026-10-31) : Dîme, Flamme votive, Sangsue et Morsure, deux de plus par rang
    expect(text('tithe')).toBe("Ses 2 prochains coups reçus lui rendent chacun 2 PV, pris à l'attaquant.")
    expect(text('tithe', 1)).toBe("Ses 4 prochains coups reçus lui rendent chacun 2 PV, pris à l'attaquant.")
    expect(text('votive-flame')).toBe(typeset("Ses 2 prochains soins brûlent l'adversaire : Brûlure 3 chacun."))
    expect(text('votive-flame', 1)).toBe(typeset("Ses 2 prochains soins brûlent l'adversaire : Brûlure 5 chacun."))
    expect(text('leech')).toBe("Ses 3 prochains coups qui touchent lui rendent chacun 1 PV par charge de Saignement de l'adversaire.")
    expect(text('leech', 1)).toBe("Ses 5 prochains coups qui touchent lui rendent chacun 1 PV par charge de Saignement de l'adversaire.")
    expect(text('blood-oath')).toBe("Il perd 3 PV. L'adversaire perd 4, 3, 2 puis 1 PV aux prochains coups qui le touchent (10 en tout).")
    expect(text('blood-scent')).toBe("Ce coup est critique, et fait +4 dégâts si l'adversaire saigne.")
    expect(text('blood-scent', 1)).toBe("Ce coup est critique, et fait +7 dégâts si l'adversaire saigne.")
    expect(text('toad-skin')).toBe(typeset("Ses 3 prochains coups reçus empoisonnent l'attaquant : Poison 2 chacun."))
    expect(text('toad-skin', 1)).toBe(typeset("Ses 3 prochains coups reçus empoisonnent l'attaquant : Poison 3 chacun."))
    expect(text('verdigris-coin')).toBe(typeset("S'il touche, une pièce : pile, 5 Poison à l'adversaire ; face, rien."))
    expect(text('venom-bite')).toBe("Ce coup ×3 si l'adversaire est empoisonné.")
    expect(text('venom-bite', 1)).toBe("Ce coup ×4 si l'adversaire est empoisonné.")
    // Refonte des auras (2026-10-28) : des compétences à charges, plus des auras
    for (const id of ['leech', 'toad-skin']) expect(describeSkill(skill(id)).tags.map((t) => t.label)).not.toContain('aura permanente')
    for (const id of ['tithe', 'votive-flame', 'leech', 'blood-oath', 'blood-scent', 'toad-skin', 'verdigris-coin', 'venom-bite']) {
      expect(rankText(skill(id)), id).not.toBe('ne s’aiguise pas')
      expect(EMOJI.test(describeSkill(skill(id)).text), id).toBe(false)
    }
    // Ce qu'elles attendent (le producteur d'abord) : un soin, le Saignement, le Poison
    expect(['votive-flame', 'leech', 'blood-scent', 'venom-bite', 'tithe', 'blood-oath', 'toad-skin', 'verdigris-coin'].map((id) => skillNeeds(skill(id)))).toEqual([
      ['moment:heal'],
      ['status:bleed'],
      ['status:bleed'],
      ['status:poison'],
      [],
      [],
      [],
      [],
    ])
  })

  it('Dîme : chaque coup qui touche le porteur coûte 2 PV à l’attaquant, que le porteur regagne ; une charge par coup', () => {
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'tithe', rank), testCharacter('b', { maxHp: 400, attackMin: 6, attackMax: 6, dodgeChance: 0 })])
      expect(fired(r, 'tithe')[0].event.effects[0]).toMatchObject({ type: 'applyStatus', target: 0, status: 'tithe', stacks: 2 + 2 * rank })
      const paid = reactions(r, 'tithe')
      expect(paid.length).toBeGreaterThan(5)
      for (const b of paid) {
        expect(b).toMatchObject({ side: 0, trigger: 'hurt' })
        expect(r.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 1, dodged: false } })
        expect(b.effects).toEqual([
          { type: 'damage', target: 1, amount: 2, source: 'holy' },
          { type: 'heal', target: 0, amount: 2 },
        ])
        expect(b.state.statuses[0].find((s) => s.id === 'tithe')?.stacks ?? 0).toBe(held(r, b, 0, 'tithe')!.stacks - 1)
      }
    }
  })

  it('Flamme votive : chaque soin de son porteur pose Brûlure 3 (+2 par rang, D11) à l’adversaire ; une charge par soin ; sans soin, rien', () => {
    const holy = ev('combatStart', [{ type: 'applyStatus', status: 'holyAura', stacks: 1 }])
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [holy]), 'votive-flame', rank), testCharacter('b', { maxHp: 400, attackMin: 6, attackMax: 6 })])
      const lit = reactions(r, 'votiveFlame')
      expect(lit.length).toBeGreaterThan(5)
      for (const b of lit) {
        expect(b).toMatchObject({ side: 0, trigger: 'healed' })
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 1, status: 'burn', stacks: 3 + 2 * rank })])
        expect(b.state.statuses[0].find((s) => s.id === 'votiveFlame')?.stacks ?? 0).toBe(held(r, b, 0, 'votiveFlame')!.stacks - 1)
      }
    }
    expect(reactions(runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'votive-flame'), testCharacter('b', { maxHp: 400 })]), 'votiveFlame')).toEqual([])
  })

  it('Sangsue (compétence à charges, refonte des auras) : ses 3 prochains coups qui touchent rendent 1 PV (+1 par rang) par charge de Saignement de l’adversaire, une charge chacun ; sans Saignement, elle attend', () => {
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400, dodgeChance: 0 }, [bleeder]), 'leech', rank), testCharacter('b', { maxHp: 400, attackMin: 8, attackMax: 8, dodgeChance: 0 })])
      const drunk = reactions(r, 'leech')
      expect(drunk.length).toBeGreaterThan(5)
      for (const b of drunk) {
        expect(b).toMatchObject({ side: 0, trigger: 'hit' })
        const leech = held(r, b, 0, 'leech')!
        const bleed = held(r, b, 1, 'bleed')!.stacks
        const want = (1 + (leech.power ?? 0)) * bleed
        const heal = b.effects[0]
        expect(heal.type === 'heal' && heal.target === 0 && heal.amount === Math.min(want, r.fighters[0].maxHp - r.beats[b.id - 1].state.hp[0])).toBe(true)
        expect(b.state.statuses[0].find((s) => s.id === 'leech')?.stacks ?? 0).toBe(leech.stacks - 1)
      }
    }
    // Sans Saignement : aucune réaction, ses charges restent
    const dry = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'leech'), testCharacter('b', { maxHp: 400 })])
    expect(reactions(dry, 'leech')).toEqual([])
    expect(stacksOf(finalState(dry).statuses[0], 'leech')).toBeGreaterThanOrEqual(3)
  })

  it('Serment de sang : il perd 3 PV, l’adversaire prend 4 Saignement (+1 par rang)', () => {
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'blood-oath', rank), testCharacter('b', { maxHp: 400 })])
      const oath = fired(r, 'blood-oath')
      expect(oath.length).toBeGreaterThan(3)
      for (const b of oath)
        expect(b.event.effects).toEqual([
          { type: 'damage', target: 0, amount: 3, source: 'bleed' },
          expect.objectContaining({ type: 'applyStatus', target: 1, status: 'bleed', stacks: 4 + rank }),
        ])
    }
  })

  it('Odeur du sang : si l’adversaire saigne, ce coup est critique, +4 (+3 par rang) ; sinon sa face est nue', () => {
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [bleeder]), 'blood-scent', rank), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
      const scent = fired(r, 'blood-scent')
      expect(scent.length).toBeGreaterThan(3)
      for (const b of scent) {
        expect(b.event.effects[0]).toMatchObject({ type: 'applyStatus', target: 0, status: 'guaranteedCrit', stacks: 1 })
        const strike = r.beats.slice(b.id).find((x) => x.type === 'attack')
        expect(strike?.type === 'attack' && strike.attack.attacker === 0 && strike.attack.crit).toBe(true)
      }
      expect(STATUSES.guaranteedCrit.describe({ id: 'guaranteedCrit', stacks: 1, power: 4 + 3 * rank })).toContain(`+${4 + 3 * rank}`)
    }
    expect(fired(runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'blood-scent'), testCharacter('b', { maxHp: 400 })]), 'blood-scent')).toEqual([])
  })

  it('Peau de crapaud (compétence à charges, refonte des auras) : ses 3 prochains coups reçus, Poison 2 (+1 par rang) à l’attaquant, une charge chacun', () => {
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400, dodgeChance: 0 }), 'toad-skin', rank), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
      const skin = reactions(r, 'toadSkin')
      expect(skin.length).toBeGreaterThan(5)
      for (const b of skin) {
        const toad = held(r, b, 0, 'toadSkin')!
        expect(b).toMatchObject({ side: 0, trigger: 'hurt' })
        expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 1, status: 'poison', stacks: 2 + rank })])
        expect(b.state.statuses[0].find((s) => s.id === 'toadSkin')?.stacks ?? 0).toBe(toad.stacks - 1)
      }
    }
  })

  it('Pièce vert-de-gris : s’il touche, une pièce ; pile, 5 Poison à l’adversaire, face, rien ; son rang la fait tomber plus souvent sur pile', () => {
    // Dés libres : un dé imposé imposerait aussi la pièce. 40 graines, la pièce sur le 3
    const coins = (rank: number) =>
      Array.from({ length: 40 }, (_, k) => k + 1).flatMap((seed) => ofType(run([engraved(testCharacter('a', { maxHp: 400 }), 'verdigris-coin', rank), testCharacter('b', { maxHp: 400, dodgeChance: 0 })], seed), 'coin'))
    const plain = coins(0)
    expect(plain.length).toBeGreaterThan(20)
    for (const c of plain) {
      expect(c.status).toBe('verdigrisCoin')
      expect(c.effects).toEqual(c.heads ? [expect.objectContaining({ type: 'applyStatus', target: 1, status: 'poison', stacks: 5 })] : [])
    }
    const share = (list: typeof plain) => list.filter((c) => c.heads).length / list.length
    expect(share(coins(2))).toBeGreaterThan(share(plain))
  })

  it('Morsure : si l’adversaire est empoisonné au jet, ce coup ×3 (+1 par rang) ; sinon sa face est nue', () => {
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [poisoner]), 'venom-bite', rank), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
      const bites = attacksOf(r).filter((a) => a.attacker === 0)
      expect(bites.length).toBeGreaterThan(3)
      for (const a of bites) expect(a.multiplier).toBe(3 + rank)
      expect(fired(r, 'venom-bite').length).toBe(bites.filter((a) => !a.dodged).length)
    }
    const dry = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'venom-bite'), testCharacter('b', { maxHp: 400 })])
    expect(attacksOf(dry).some((a) => a.attacker === 0 && a.multiplier !== undefined)).toBe(false)
    expect(fired(dry, 'venom-bite')).toEqual([])
  })

  it('valeurs lues sur un statut (`fromStatus` sur un soin ou des dégâts) : le texte, et un facteur entier ≥ 1', () => {
    const agony: CharacterEvent = { id: 'agony', name: 'agony', trigger: 'naturalThree', effects: [{ type: 'damage', amount: 0, target: 'opponent', source: 'poison', fromStatus: { status: 'poison', who: 'opponent', factor: 2 } }] }
    expect(describeSkill(agony).text).toBe("L'adversaire perd 2 PV par charge de Poison qu'il porte.")
    const r = runOn(3, [testCharacter('a', { maxHp: 400 }, [poisoner, agony]), testCharacter('b', { maxHp: 400 })])
    for (const b of fired(r, 'agony')) {
      const poison = r.beats[b.id - 1].state.statuses[1].find((s) => s.id === 'poison')?.stacks ?? 0
      expect(b.event.effects[0]).toMatchObject({ type: 'damage', target: 1, amount: 2 * poison })
    }
    const half = { ...agony, effects: [{ ...agony.effects[0], fromStatus: { status: 'poison' as const, who: 'opponent' as const, factor: 0.5 } }] }
    expect(validateRoster([{ ...createCharacter('morgrut').definition, events: [half] }]).some((p) => p.includes('fromStatus'))).toBe(true)
  })
})

describe('quatrième demande du 2026-10-27 : le contenu des maîtrises (Fureur, Magie, Ombre, Rempart)', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  const ev = (trigger: CharacterEvent['trigger'], effects: CharacterEvent['effects'], id: string = trigger): CharacterEvent => ({ id, name: id, trigger, effects })
  const engraved = (c: Character, id: string, rank = 0) =>
    c.withForge([{ op: 'engrave', face: 3, skill: skill(id) }, ...Array.from({ length: rank }, (): ForgeStep => ({ op: 'sharpen', face: 3 }))])
  const text = (id: string, rank = 0) => describeSkill(engraved(createCharacter('morgrut'), id, rank).events.find((e) => e.id === id)!).text
  const reactions = (r: CombatResult, status: StatusId) => ofType(r, 'statusReaction').filter((b) => b.status === status)
  const aura = (status: StatusId) => ev('combatStart', [{ type: 'applyStatus', status, stacks: 1 }], `with-${status}`)

  it('les textes, au style de l’utilisateur, leurs rangs, et ce qu’elles attendent', () => {
    expect(validateRoster()).toEqual([])
    expect(text('onrush')).toBe(typeset("+10 % de critique. Chacun de ses gros coups lui donne +4 Ferveur."))
    expect(text('pilfer')).toBe(typeset("+10 % d'esquive. Chaque esquive lui fait voler le dernier bonus de l'attaquant."))
    // R20 du retour du 2026-10-30 : sur quoi tape l'onde (les coups encaissés depuis la dernière) ; D14 : 3 PV par coup compté.
    // Son rang reste +1 par coup (4 PV au rang II, le total affiché) : +2 valait +9,8 points (passe d'équilibre du 2026-10-31)
    expect(text('shockwave')).toBe("L'adversaire perd 3 PV par coup qui a touché le porteur depuis sa dernière onde, trois coups au plus.")
    expect(text('shockwave', 1)).toBe("L'adversaire perd 4 PV par coup qui a touché le porteur depuis sa dernière onde, trois coups au plus.")
    for (const id of ['onrush', 'pilfer', 'shockwave']) {
      expect(rankText(skill(id)), id).not.toBe('ne s’aiguise pas')
      expect(EMOJI.test(describeSkill(skill(id)).text), id).toBe(false)
    }
    // Le producteur d'abord : un gros coup, une esquive ; l'Onde de choc vit des coups reçus
    expect(['onrush', 'pilfer', 'shockwave'].map((id) => skillNeeds(skill(id)))).toEqual([['moment:heavy'], ['moment:dodge'], []])
    expect(masteryOfSkill('onrush')).toBe('fury')
    expect(masteryOfSkill('pilfer')).toBe('shadow')
    expect(masteryOfSkill('shockwave')).toBe('bulwark')
    // L'Emprise et la Surtension, des reliques depuis la refonte des auras : elles attendent ce qu'attend leur statut
    expect(relicNeeds(getRelic('gaoler-chain'))).toEqual(['malus'])
    expect(relicNeeds(getRelic('lightning-rod'))).toEqual(['damage:lightning'])
    expect(relicNeeds(getRelic('blessed-phial'))).toEqual([])
  })

  it('gros coup (`heavy`) : il part après chaque critique et chaque coup ×2 et plus qui touche, jamais sur un coup simple ; l’Élan y donne +4 Ferveur (+3 jusqu’à la mesure d’ensemble de la refonte des auras) et fait critiquer', () => {
    const crit = run([testCharacter('a', { maxHp: 400, critChance: 1 }, [aura('onrush')]), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
    const gains = reactions(crit, 'onrush')
    expect(gains.length).toBeGreaterThan(3)
    for (const b of gains) {
      expect(b.trigger).toBe('heavy')
      expect(b.effects).toMatchObject([{ type: 'applyStatus', status: 'momentum', stacks: ONRUSH_FERVOR, target: 0 }])
      const cause = crit.beats[b.cause!]
      expect(cause.type === 'attack' && cause.attack.crit && !cause.attack.dodged).toBe(true)
    }
    // Sans critique : seul l'Assaut (ce coup ×2) fait un gros coup
    const assault = ev('naturalThree', [], 'assault-test')
    const plain = runOn(3, [testCharacter('a', { maxHp: 400, critChance: 0 }, [aura('onrush'), { ...assault, relation: 'modify', hitMultiplier: 2 }]), testCharacter('b', { maxHp: 400, dodgeChance: 0, critChance: 0 })])
    const heavy = reactions(plain, 'onrush')
    expect(heavy.length).toBeGreaterThan(3)
    // Un gros coup par coup qui touche en critique ou ×2 (l'Élan fait aussi critiquer), aucun pour un coup simple
    const big = ofType(plain, 'attack').filter((b) => b.attack.attacker === 0 && !b.attack.dodged && b.state.hp[1] > 0 && (b.attack.crit || (b.attack.multiplier ?? 1) >= 2))
    expect(heavy.map((b) => b.cause)).toEqual(big.map((b) => b.id))
    const none = runOn(4, [testCharacter('a', { maxHp: 400, critChance: 0 }, [aura('onrush')]), testCharacter('b', { maxHp: 400, dodgeChance: 0, critChance: 0 })])
    for (const b of reactions(none, 'onrush')) expect(none.beats[b.cause!].type === 'attack' && (none.beats[b.cause!] as Extract<Beat, { type: 'attack' }>).attack.crit).toBe(true)
    expect(effectiveStats(createCharacter('morgrut'), [{ id: 'onrush', stacks: 2 }]).critChance).toBeCloseTo(0.2)
  })

  it('Surtension (`modifyDirect`) : chaque impact de ses dégâts directs sur l’adversaire fait +2 (D11) ; ceux qu’il s’inflige, non', () => {
    const bolts = ev('turnStart', [{ type: 'damage', amount: 2, hits: 3, target: 'opponent', source: 'lightning' }], 'bolts')
    const self = ev('turnEnd', [{ type: 'damage', amount: 1, source: 'bleed' }], 'self-hurt')
    const r = run([testCharacter('a', { maxHp: 400 }, [aura('overcharge'), bolts, self]), testCharacter('b', { maxHp: 400 })])
    const shots = ofType(r, 'event').filter((b) => b.event.eventId === 'bolts')
    expect(shots.length).toBeGreaterThan(3)
    for (const b of shots) expect(b.event.effects[0]).toMatchObject({ type: 'damage', target: 1, amount: 12, parts: [4, 4, 4] })
    for (const b of ofType(r, 'event').filter((x) => x.event.eventId === 'self-hurt')) expect(b.event.effects[0]).toMatchObject({ type: 'damage', target: 0, amount: 1 })
  })

  it('Emprise (`modifyOutgoing` qui lit le défenseur) : ses coups font +2 (D11) par malus que porte l’adversaire, un par statut', () => {
    const curse = ev('combatStart', [
      { type: 'applyStatus', status: 'poison', stacks: 40, target: 'opponent' },
      { type: 'applyStatus', status: 'weakened', stacks: 1, target: 'opponent' },
    ], 'curse')
    const r = run([testCharacter('a', { maxHp: 400, critChance: 0 }, [aura('grip'), curse]), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
    let seen = 0
    for (const b of ofType(r, 'attack').filter((x) => x.attack.attacker === 0 && !x.attack.dodged)) {
      const foe = r.beats[b.id - 1].state.statuses[1].filter((s) => STATUSES[s.id].polarity === 'negative')
      const grip = b.attack.modifiers.find((m) => m.status === 'grip')
      expect(grip?.delta ?? 0).toBe(2 * foe.length)
      if (foe.length === 2) seen++
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('Larcin (`cleanse.steal`) : chaque esquive vole le dernier bonus volable de l’attaquant, entier, marqué volé ; jamais une aura ; rien à prendre, il ne part pas', () => {
    const held = ev('combatStart', [{ type: 'applyStatus', status: 'ward', stacks: 3 }, { type: 'applyStatus', status: 'powerAura', stacks: 1 }], 'held')
    const r = run([testCharacter('a', { maxHp: 400, dodgeChance: 0.5 }, [aura('pilfer')]), testCharacter('b', { maxHp: 400 }, [held])])
    const thefts = reactions(r, 'pilfer')
    // Un seul vol : la Garde part entière ; l'Aura de puissance, une aura, reste à son porteur
    expect(thefts).toHaveLength(1)
    const [first] = thefts
    expect(first.trigger).toBe('dodge')
    expect(first.effects[0]).toMatchObject({ type: 'cleanse', target: 1, removed: ['ward'], stolen: true })
    expect(first.effects[1]).toMatchObject({ type: 'applyStatus', target: 0, status: 'ward', stacks: 3, stolenBy: 'pilfer' })
    expect(stacksOf(first.state.statuses[0], 'ward')).toBe(3)
    expect(stacksOf(first.state.statuses[1], 'ward')).toBe(0)
    expect(stacksOf(r.beats.at(-1)!.state.statuses[1], 'powerAura')).toBe(1)
    expect(stacksOf(r.beats.at(-1)!.state.statuses[0], 'powerAura')).toBe(0)
    // Une aura seule : rien à voler, il ne part jamais
    const auraOnly = run([testCharacter('a', { maxHp: 400, dodgeChance: 0.5 }, [aura('pilfer')]), testCharacter('b', { maxHp: 400 }, [aura('powerAura')])])
    expect(reactions(auraOnly, 'pilfer')).toEqual([])
    // +10 % d'esquive par charge depuis le vrai vol (A6, 2026-10-28)
    expect(effectiveStats(createCharacter('morgrut'), [{ id: 'pilfer', stacks: 1 }]).dodgeChance).toBeCloseTo(createCharacter('morgrut').stats.dodgeChance + 0.1)
  })

  it('un vrai vol (A6, 2026-10-28) : la Confiscation détourne le bonus posé entier, intensité comprise ; le lanceur n’en garde rien', () => {
    const seal = ev('combatStart', [{ type: 'applyStatus', status: 'sealTheft', stacks: 1, target: 'opponent' }], 'seal')
    const pose = ev(faceTrigger(3), [{ type: 'applyStatus', status: 'lifesteal', stacks: 2, power: 4 }], 'pose')
    const r = runOn(3, [testCharacter('a', { maxHp: 400, dodgeChance: 0 }, [seal]), testCharacter('b', { maxHp: 400 }, [pose])])
    const [first] = ofType(r, 'event').filter((b) => b.event.eventId === 'pose')
    expect(first.event.effects).toEqual([expect.objectContaining({ type: 'applyStatus', target: 0, status: 'lifesteal', stacks: 2, stolenBy: 'sealTheft' })])
    expect(first.event.effects[0]).not.toHaveProperty('kept')
    expect(first.state.statuses[0].find((s) => s.id === 'lifesteal')).toMatchObject({ stacks: 2, power: 4 })
    expect(stacksOf(first.state.statuses[1], 'lifesteal')).toBe(0)
    expect(stacksOf(first.state.statuses[1], 'sealTheft')).toBe(0)
  })

  it('un dé de plus ne donne jamais de dé de plus (A7, 2026-10-28) : ni compétence ni réaction ; au plus trois dés de plus par action', () => {
    // Chaque face pose un Coup de chance (une charge) et la Veine réagit à chaque 6 : sans la règle, chaque rafale relançait
    // la suivante (le Duo, des coups bruts depuis la refonte des auras, ne donne plus de dés)
    const allDuo = [1, 2, 3, 4, 5, 6].map((face): CharacterEvent => ({ ...skillById('lucky-strike'), id: `lucky-${face}`, trigger: faceTrigger(face) }))
    let volleys = 0
    let muted = 0
    for (let seed = 1; seed <= 6; seed++) {
      const r = run([testCharacter('a', { maxHp: 2000 }, [...allDuo, aura('luckyStreak')]), testCharacter('b', { maxHp: 2000 })], seed)
      for (const f of ofType(r, 'flurry').filter((x) => x.side === 0 && x.status === 'luckyStrike')) {
        expect(f.strikes).toBeLessThanOrEqual(1 + MAX_EXTRA_JETS)
        // Le dé de l'action pose un Coup de chance (son étape `roll`) ; les dés de plus, des coups sur une face nue
        const jets = r.beats.filter((x) => x.cause === f.id && (x.type === 'roll' || x.type === 'attack'))
        expect(jets[0]?.type).toBe('roll')
        for (const jet of jets.slice(1)) {
          expect(jet.type).toBe('attack')
          muted++
        }
        // Rien après le premier jet de la rafale ne redonne de jets de plus à son lanceur, dans ce tour
        const after = jets[1] ? r.beats.filter((x) => x.id >= jets[1].id && x.turn === f.turn) : []
        expect(after.some((x) => beatEffects(x).some((e) => e.type === 'applyStatus' && e.target === 0 && (e.status === 'duo' || e.status === 'luckyStrike')))).toBe(false)
        volleys++
      }
    }
    expect(volleys).toBeGreaterThan(20)
    expect(muted).toBeGreaterThan(40)
  })

  it('Onde de choc (`release.per`, D14) : 3 PV de dégâts directs par coup encaissé, des trois derniers, et ses jauges se vident ; sans coup encaissé, sa face est nue', () => {
    for (const rank of [0, 1]) {
      const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'shockwave', rank), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
      const waves = ofType(r, 'event').filter((b) => b.event.eventId === 'shockwave')
      expect(waves.length).toBeGreaterThan(3)
      for (const b of waves) {
        const gauges = r.beats[b.id - 1].state.statuses[0].find((s) => s.id === 'shockwave')!.slots!.filter((n) => n > 0).length
        expect(gauges).toBeGreaterThan(0)
        expect(b.event.effects[0]).toMatchObject({ type: 'damage', target: 1, amount: (3 + rank) * gauges, source: 'strike' })
        expect(b.state.statuses[0].some((s) => s.id === 'shockwave')).toBe(false)
      }
    }
    // Il esquive à coup sûr chaque coup (une Esquive améliorée reposée à chacun de ses tours) : jamais de jauge, jamais d'onde
    const dodge = ev('turnStart', [{ type: 'applyStatus', status: 'evasion', stacks: 1 }], 'dodge')
    const calm = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [dodge]), 'shockwave'), testCharacter('b', { maxHp: 400 })])
    expect(ofType(calm, 'event').filter((b) => b.event.eventId === 'shockwave')).toEqual([])
    expect(SCENE_EVENTS[skill('shockwave').scene!].impacts).toHaveLength(1)
  })
})
describe('décisions du 2026-10-30 : compétences nouvelles (D26, profondeur de l’offre, D9)', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  const engraved = (c: Character, id: string, rank = 0) =>
    c.withForge([{ op: 'engrave', face: 3, skill: skill(id) }, ...Array.from({ length: rank }, (): ForgeStep => ({ op: 'sharpen', face: 3 }))])
  const reactions = (r: CombatResult, status: StatusId) => ofType(r, 'statusReaction').filter((b) => b.status === status)
  const held = (r: CombatResult, beat: Beat, side: Side, status: StatusId) => r.beats[beat.id - 1].state.statuses[side].find((s) => s.id === status)
  const fired = (r: CombatResult, id: string) => ofType(r, 'event').filter((b) => b.event.eventId === id && b.event.side === 0)
  const NEW = ['mauling', 'rising-rage', 'shield-wall', 'challenge', 'coated-blade', 'grace', 'holy-light', 'anointing', 'arc-lightning', 'fireball', 'storm-aegis']

  it('chacune est gravable, dans sa maîtrise, et son texte ne montre aucun « 1 » ni emoji', () => {
    const owners = ['fury', 'fury', 'bulwark', 'bulwark', 'poison', 'light', 'light', 'light', 'magic', 'magic', 'magic']
    expect(NEW.map((id) => masteryOfSkill(id))).toEqual(owners)
    for (const id of NEW) {
      const t = describeSkill(engraved(createCharacter('morgrut'), id).events.find((e) => e.id === id)!).text
      expect(t).not.toMatch(EMOJI)
      expect(t).not.toMatch(/[+−-]1\b|\b1 (PV|dégât)/)
    }
  })

  it('Arc électrique : 3 PV, +2 par charge de Brûlure de l’adversaire ; Boule de feu : 4 PV et Brûlure 2', () => {
    const arc = fired(runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'arc-lightning'), testCharacter('b', { maxHp: 400 })]), 'arc-lightning')
    expect(arc.length).toBeGreaterThan(3)
    expect(skill('arc-lightning').effects[0]).toMatchObject({ type: 'damage', amount: 3, source: 'lightning', fromStatus: { status: 'burn', factor: 2 } })
    const ball = fired(runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'fireball'), testCharacter('b', { maxHp: 400 })]), 'fireball')
    expect(ball[0].event.effects).toEqual([expect.objectContaining({ type: 'damage', amount: 4, target: 1 }), expect.objectContaining({ type: 'applyStatus', status: 'burn', stacks: 2, target: 1 })])
  })

  it('Égide d’orage : ses 2 prochains coups reçus foudroient l’attaquant (2 éclairs de 2), une charge chacun', () => {
    const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400, dodgeChance: 0 }), 'storm-aegis'), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
    const zap = reactions(r, 'stormAegis')
    expect(zap.length).toBeGreaterThan(3)
    for (const b of zap) {
      expect(b).toMatchObject({ side: 0, trigger: 'hurt' })
      expect(b.effects).toEqual([expect.objectContaining({ type: 'damage', target: 1 })])
      expect(b.state.statuses[0].find((s) => s.id === 'stormAegis')?.stacks ?? 0).toBe(held(r, b, 0, 'stormAegis')!.stacks - 1)
    }
  })

  it('Grâce : chacun de ses 3 prochains soins lui donne +3 Ferveur ; sans soin, rien', () => {
    const healer: CharacterEvent = { id: 'healer', name: 'healer', trigger: 'turnStart', effects: [{ type: 'heal', amount: 2 }] }
    const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }, [healer]), 'grace'), testCharacter('b', { maxHp: 400 })])
    const g = reactions(r, 'grace')
    expect(g.length).toBeGreaterThan(3)
    for (const b of g) expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', status: 'momentum', stacks: 3 })])
    expect(reactions(runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'grace'), testCharacter('b', { maxHp: 400 })]), 'grace')).toEqual([])
  })

  it('Lame enduite : ses 3 prochains coups qui touchent posent Poison 2, une charge chacun', () => {
    const r = runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), 'coated-blade'), testCharacter('b', { maxHp: 400, dodgeChance: 0 })])
    const cut = reactions(r, 'coatedBlade')
    expect(cut.length).toBeGreaterThan(3)
    for (const b of cut) {
      expect(b).toMatchObject({ side: 0, trigger: 'hit' })
      expect(b.effects).toEqual([expect.objectContaining({ type: 'applyStatus', status: 'poison', stacks: 2, target: 1 })])
    }
  })

  it('Rage montante : +2 à ses coups par charge ; chaque critique reçu ajoute une charge, 3 au plus', () => {
    const r = runOn(3, [engraved(testCharacter('a', { maxHp: 600 }), 'rising-rage'), testCharacter('b', { maxHp: 600, critChance: 0.5 })])
    const rage = reactions(r, 'risingRage')
    expect(rage.length).toBeGreaterThan(0)
    for (const b of rage) expect(b).toMatchObject({ side: 0, trigger: 'critHurt' })
    for (const b of r.beats) expect(stacksOf(b.state.statuses[0], 'risingRage')).toBeLessThanOrEqual(3)
    expect(STATUSES.risingRage.modifyOutgoing!(5, { id: 'risingRage', stacks: 2 }, undefined as never)).toBe(9)
  })

  it('Rempart et Lumière sans condition : Mur de boucliers +6 armure, Défi +2 armure et une Riposte, Lumière sacrée 3 PV et +3 PV, Onction +3 PV et +3 armure, Charge de l’ours ×2 et +2 armure', () => {
    expect(skill('shield-wall').effects).toEqual([expect.objectContaining({ status: 'bonusArmor', stacks: 6 })])
    expect(skill('challenge').effects).toEqual([expect.objectContaining({ status: 'bonusArmor', stacks: 2 }), expect.objectContaining({ status: 'riposte', stacks: 1 })])
    expect(skill('holy-light').effects).toEqual([expect.objectContaining({ type: 'damage', amount: 3, source: 'holy' }), expect.objectContaining({ type: 'heal', amount: 3 })])
    expect(skill('anointing').effects).toEqual([expect.objectContaining({ type: 'heal', amount: 3 }), expect.objectContaining({ status: 'bonusArmor', stacks: 3 })])
    expect(skill('mauling')).toMatchObject({ relation: 'modify', hitMultiplier: 2 })
    for (const id of ['shield-wall', 'challenge', 'holy-light', 'anointing', 'mauling']) expect(fired(runOn(3, [engraved(testCharacter('a', { maxHp: 400 }), id), testCharacter('b', { maxHp: 400 })]), id).length).toBeGreaterThan(3)
  })
})

describe('décisions du 2026-10-30 : reliques (D9, D24, D26, D27, D28)', () => {
  const relicBeats = (r: CombatResult, id: string) => ofType(r, 'relic').filter((b) => b.relic === id)
  const big = (id: string, stats: Partial<CharacterStats> = {}, events: CharacterEvent[] = []) => testCharacter(id, { maxHp: 400, ...stats }, events)

  it('chaque relique a un palier (D27) ; le registre est valide', () => {
    expect(RELICS.every((r) => r.tier === 'trinket' || r.tier === 'strong' || r.tier === 'master')).toBe(true)
    expect(validateRelics()).toEqual([])
    expect(validateRelics([{ ...getRelic('ram-horn'), tier: undefined }])).toContain('ram-horn : palier requis : babiole, forte ou maîtresse (D27)')
  })

  it('D28 : Géode, Onguent et Conque en recharge 3 ; D24 : la Braise captive revient tous les 4 tours, +1 par Brûlure à chaque braise', () => {
    for (const id of ['split-geode', 'bonesetter-salve', 'wind-conch']) expect([getRelic(id).cooldown, getRelic(id).charges], id).toEqual([3, undefined])
    const burner: CharacterEvent = { id: 'burner', name: 'burner', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'burn', stacks: 3, target: 'opponent' }] }
    const r = run([big('a', {}, [burner]).withRelics([getRelic('caged-ember')]), big('b')])
    const embers = relicBeats(r, 'caged-ember')
    expect(embers.length).toBeGreaterThan(1)
    const turns = embers.map((b) => r.beats.filter((x) => x.id <= b.id && x.type === 'attack' && x.attack.attacker === 0).length)
    expect(turns.length).toBe(new Set(turns).size)
    for (const b of embers) {
      const burn = stacksOf(r.beats[b.id - 1].state.statuses[1], 'burn')
      expect(b.effects).toEqual([expect.objectContaining({ type: 'damage', amount: (2 + burn) * 2 })])
    }
    expect(describeRelic(getRelic('caged-ember')).text).toBe(typeset("L'adversaire perd 2 PV deux fois (chaque fois +1 par charge de Brûlure qu'il porte), tous les 4 tours"))
  })

  it('Clairon du héraut (D9) : au 1er tour, son aura de départ part, la relique pour cause', () => {
    const brokk = createCharacter('brokk')
    const aura = startAuraOf(brokk)!
    for (let seed = 1; seed < 6; seed++) {
      const r = run([brokk.withRelics([getRelic('herald-clarion')]), big('b')], seed)
      const [call, ...rest] = relicBeats(r, 'herald-clarion')
      expect(rest).toEqual([])
      expect(call.side).toBe(0)
      expect(r.beats.slice(0, call.id).filter((b) => b.type === 'attack' && b.attack.attacker === 0)).toEqual([])
      const posed = ofType(r, 'event').find((b) => b.cause === call.id)!
      expect(posed.event).toMatchObject({ side: 0, eventId: aura.event.id, trigger: 'auraDue' })
      expect(posed.state.statuses[0].some((s) => s.id === aura.status)).toBe(true)
    }
  })

  it('Dé de joueur (D9) : un jet sur une face nue est relancé, au plus une fois tous les 2 tours ; un dé imposé ne l’est jamais', () => {
    const r = run([big('a').withRelics([getRelic('gambler-die')]), big('b')])
    const rerolls = relicBeats(r, 'gambler-die')
    expect(rerolls.length).toBeGreaterThan(5)
    expect(new Set(rerolls.map((b) => b.turn)).size).toBe(rerolls.length)
    expect(relicBeats(runOn(2, [big('a').withRelics([getRelic('gambler-die')]), big('b')]), 'gambler-die')).toEqual([])
  })

  it('Cachet du greffier (D9) : la face du dernier jet adverse est scellée 3 tours ; un jet dessus ne porte que son coup de base', () => {
    const skilled: CharacterEvent[] = DIE_FACES_LIST.map((f) => ({ id: `s${f}`, name: `s${f}`, trigger: faceTrigger(f), effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 2 }] }))
    let sealedRolls = 0
    for (let seed = 1; seed < 10; seed++) {
      const r = run([big('a').withRelics([getRelic('clerk-seal')]), big('b', {}, skilled)], seed)
      for (const b of relicBeats(r, 'clerk-seal')) {
        const face = ofType(r, 'attack').filter((a) => a.id < b.id && a.attack.attacker === 1 && !a.attack.plain).at(-1)?.attack.roll
        expect(b.state.statuses[1].find((s) => s.id === 'sealedFace')).toMatchObject({ power: face })
      }
      for (const roll of ofType(r, 'roll').filter((x) => x.sealedBy)) {
        sealedRolls++
        expect(r.beats[roll.id - 1].state.statuses[1].find((s) => s.id === 'sealedFace')?.power).toBe(roll.roll)
        expect(r.beats.find((x) => x.cause === roll.id && x.type === 'attack')).toMatchObject({ attack: { plain: true } })
        expect(r.beats.some((x) => x.type === 'event' && x.cause === roll.id)).toBe(false)
      }
    }
    expect(sealedRolls).toBeGreaterThan(0)
  })

  it('Torque du berserker (D9) : chaque critique reçu lui donne +5 Ferveur (la fenêtre critHurt)', () => {
    const r = run([big('a').withRelics([getRelic('berserker-torc')]), big('b', { critChance: 1 })])
    const fired = relicBeats(r, 'berserker-torc')
    expect(fired.length).toBeGreaterThan(3)
    for (const b of fired) expect(r.beats[b.cause!]).toMatchObject({ type: 'attack', attack: { attacker: 1, crit: true } })
  })

  it('D26 et profondeur : les afflictions de source vont à l’adversaire (Saignement compris), le Mortier double le Poison', () => {
    const venom: CharacterEvent = { id: 'venom', name: 'venom', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'poison', stacks: 3, target: 'opponent' }] }
    const r = run([big('a', {}, [venom]).withRelics([getRelic('apothecary-mortar')]), big('b')])
    for (const b of relicBeats(r, 'apothecary-mortar')) {
      const before = stacksOf(r.beats[b.id - 1].state.statuses[1], 'poison')
      expect(b.effects[0]).toMatchObject({ type: 'applyStatus', status: 'poison', stacks: before + 2 })
    }
    expect(describeRelic(getRelic('apothecary-mortar')).text).toContain('Double le Poison de l')
    for (const id of ['rusty-hook', 'barbed-wire']) expect(getRelic(id).effects![0]).toMatchObject({ status: 'bleed', target: 'opponent' })
    for (const r of RELICS) expect(describeRelic(r).text, r.id).not.toMatch(EMOJI)
  })
})

const DIE_FACES_LIST = Array.from({ length: DIE_FACES }, (_, k) => k + 1)
