import { describe, expect, it, vi } from 'vitest'
import { skillCatalog, statusCatalog, statusLinks } from './catalog'
import { ARENAS, getArena, RANDOM_ARENA, resolveArena, TRAINING_ARENA } from './arenas'
import { attacksOf, finalState, simulateCombat, type AppliedEffect, type CombatResult } from './combat'
import { cueOf } from './cues'
import { describeEffect, describeEvent, describeSkill, TRIGGERS, type Effect } from './events'
import { getHistory, normalize, recordMatch, recordTournamentWin, clearHistory } from './history'
import { attackLog, coinLog, effectBadge, effectText, eventLog, statusDurationLog, statusReactionLog, statusTickLog } from './narration'
import { chance, rollDie, seededRng, shuffle } from './rng'
import { CHARACTER_IDS, CHARACTERS, createCharacter, ROSTER, validateRoster } from './roster'
import { computeStats } from './stats'
import { POSE_IDS, POSES, poseImage, poseImages, poseOf } from './poses'
import { Character, figureHeight } from './character'
import { EMOJI, testCharacter } from './test-utils'
import { traceCombat, traceText } from './trace'
import { STATUS_IDS, statusCounter, type StatusId } from './statuses'
import {
  allMatches,
  champion,
  championRun,
  chooseRelic,
  createTournament,
  fillSlots,
  matchFighters,
  matchKey,
  readyMatches,
  relicsOf,
  ROUNDS,
  SLOTS,
  status,
  withResult,
  type Tournament,
} from './tournament'
import { OFFER_SIZE, RELIC_IDS } from './relics'

const duel = (a: string, b: string, seed: number) =>
  simulateCombat([createCharacter(a), createCharacter(b)], { rng: seededRng(seed) })

describe('arènes', () => {
  it('ont des ids uniques, une image et un nom', () => {
    expect(new Set(ARENAS.map((a) => a.id)).size).toBe(ARENAS.length)
    for (const a of [...ARENAS, TRAINING_ARENA]) expect(a.name && a.region && a.image && a.focus && a.filter).toBeTruthy()
  })
  it("l'arène d'entraînement n'est jamais proposée ni tirée au hasard", () => {
    expect(ARENAS.some((a) => a.id === TRAINING_ARENA.id || a.image === TRAINING_ARENA.image)).toBe(false)
    const rng = seededRng(7)
    for (let i = 0; i < 300; i++) expect(resolveArena(RANDOM_ARENA, rng).id).not.toBe(TRAINING_ARENA.id)
    expect(getArena(TRAINING_ARENA.id)).not.toBe(TRAINING_ARENA)
  })
  it('« au hasard » tire chaque arène, un id inconnu retombe sur la première', () => {
    const rng = seededRng(3)
    const drawn = new Set(Array.from({ length: 200 }, () => resolveArena(RANDOM_ARENA, rng).id))
    expect(drawn.size).toBe(ARENAS.length)
    expect(resolveArena(ARENAS[1].id)).toBe(ARENAS[1])
    expect(getArena('inconnue')).toBe(ARENAS[0])
  })
})

describe('catalogue des compétences', () => {
  it('liste chaque compétence une fois, par race, avec tous ses possesseurs', () => {
    const families = skillCatalog()
    expect(families.map((f) => f.race)).toEqual([...new Set(CHARACTERS.map((c) => c.race))])
    const skills = families.flatMap((f) => f.skills)
    expect(new Set(skills.map((s) => s.event.id)).size).toBe(skills.length)
    // Chaque compétence de chaque personnage est retrouvée, avec lui parmi ses possesseurs
    for (const c of CHARACTERS)
      for (const e of c.events) expect(skills.find((s) => s.events.some((x) => x.id === e.id))!.owners).toContain(c)
    // Faces identiques d'un même porteur : une seule ligne, qui liste ses déclencheurs (l'Attente de l'ogre)
    const waiting = skills.filter((s) => s.event.name === 'Attente')
    expect(waiting.map((s) => s.triggers)).toEqual([['naturalOne', 'naturalTwo', 'naturalThree']])
    // Un personnage par famille (0.43.0) : chaque compétence a un seul possesseur
    for (const s of skills) expect(s.owners).toHaveLength(1)
    expect(skills.find((s) => s.event.id === 'wind-fury')!.owners.map((c) => c.id)).toEqual(['gorak'])
  })

  it('chaque compétence déclare sa nature (couleur de sa carte)', () => {
    const skills = skillCatalog().flatMap((f) => f.skills)
    expect(skills.filter((s) => !s.event.nature).map((s) => s.event.id)).toEqual([])
    expect(skills.find((s) => s.event.id === 'cleave')!.event.nature).toBe('martial')
    expect(skills.find((s) => s.event.id === 'waiting-1')!.event.nature).toBe('neutral')
  })

  it('un effet subi par l’adversaire le nomme dans le texte de la compétence (retour du 2026-10-21)', () => {
    // « Perd 3 PV au début de son prochain tour » (Souffle de la tombe) se lisait comme une perte du lanceur
    for (const c of CHARACTERS)
      for (const e of c.events)
        for (const effect of e.effects.filter((x) => x.target === 'opponent'))
          expect(describeSkill({ ...e, effects: [effect] }).text, `${c.id} · ${e.id}`).toContain('adversaire')
    expect(describeSkill(createCharacter('ervald').events.find((e) => e.id === 'grave-breath')!).text).toMatch(/^Sur l'adversaire : perd 3 PV/)
  })
})

describe('catalogue des statuts', () => {
  it('liste chaque statut une fois, avec ses règles et qui le met en jeu', () => {
    const catalog = statusCatalog()
    expect(catalog.map((e) => e.id).sort()).toEqual([...STATUS_IDS].sort())
    const who = (id: StatusId) =>
      catalog
        .find((e) => e.id === id)!
        .sources.map((s) => (s.kind === 'status' ? `statut:${s.status}` : `${s.kind}:${s.character.id}`))
        .sort()
    // Poison : posé par Ervald, et aussi par deux auras (effet de tour, réaction)
    expect(who('poison')).toEqual(['skill:ervald', 'statut:decoctionAura', 'statut:frostAura'])
    // Régénération : sans porteur depuis la 0.73.0 (Fleur de vie retirée)
    expect(who('regeneration')).toEqual([])
    // Rétribution : aucune compétence ne la pose, celle d'Aldric la relâche ; elle était absente du compendium
    expect(who('retribution')).toEqual(['release:aldric'])
    // Statuts de forme (0.73.0) : posés par la forme du druide, pas par une compétence
    expect(who('casting')).toEqual(['form:thaldrin'])
    expect(who('bearMight')).toEqual(['form:thaldrin'])
    // La Brûlure revient en 0.73.0 avec les Feux follets ; la Luciole attend un porteur
    expect(catalog.find((e) => e.id === 'burn')!.inGame).toBe(true)
    expect(catalog.find((e) => e.id === 'firefly')!.inGame).toBe(false)
    // Bonus d'abord, puis malus
    const firstNegative = catalog.findIndex((e) => e.def.polarity === 'negative')
    expect(catalog.slice(firstNegative).every((e) => e.def.polarity === 'negative')).toBe(true)
  })
  it('liens croisés : un statut affiché par une compétence la cite parmi ceux qui le posent, et inversement', () => {
    const catalog = statusCatalog()
    for (const c of CHARACTERS)
      for (const e of c.events)
        for (const { status } of describeSkill(e).posed) {
          const entry = catalog.find((x) => x.id === status)!
          expect(entry.inGame, `${e.id} → ${status}`).toBe(true)
          expect(entry.sources.some((s) => (s.kind === 'skill' || s.kind === 'release') && s.event.id === e.id), `${status} ← ${e.id}`).toBe(true)
        }
    for (const entry of catalog)
      for (const s of entry.sources)
        if (s.kind === 'skill' || s.kind === 'release') expect(describeSkill(s.event).posed.map((p) => p.status), `${s.event.id} → ${entry.id}`).toContain(entry.id)
  })
  it('interactions : déclarées d’un côté, montrées des deux', () => {
    const texts = (id: StatusId) => statusLinks(id).map((l) => l.status)
    // Opposition (déclarée sur le Poison seulement) ; la Régénération n'a plus de porteur depuis la 0.73.0 : un
    // personnage de test la met en jeu
    const healer = testCharacter('healer', {}, [{ id: 'mend', name: 'mend', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'regeneration', stacks: 2, turns: 3 }] }])
    const withHealer = (id: StatusId) => statusLinks(id, [...CHARACTERS, healer]).map((l) => l.status)
    expect(withHealer('poison')).toContain('regeneration')
    expect(withHealer('regeneration')).toContain('poison')
    // Un statut de forme ne se purge pas : aucune purge n'est citée (la Purification d'Ysolde vise les bonus)
    expect(statusLinks('casting').some((l) => l.skill)).toBe(false)
    expect(statusLinks('wildAura').some((l) => l.skill?.event.id === 'purification')).toBe(true)
    // Immunité : chaque malus en jeu renvoie à l'aura qui le bloque
    expect(texts('fear')).toContain('immunityAura')
  })
  it('bord en pointillés : seuls les états qui font perdre des PV à leur porteur à chaque tour (0.52.1)', async () => {
    const { hurtsEachTurn } = await import('./statuses')
    const dashed = STATUS_IDS.filter(hurtsEachTurn).sort()
    expect(dashed).toEqual(['burn', 'poison', 'rot'])
  })
  it('nombre affiché sur un état : tours restants s’il a une durée, sinon ses charges', () => {
    expect(statusCounter({ id: 'regeneration', stacks: 1, turns: 2 })).toEqual({ value: 2, unit: 'turns' })
    // La Furie des vents compte ses charges en réserve (0.46.0)
    expect(statusCounter({ id: 'windFury', stacks: 2 })).toEqual({ value: 2, unit: 'stacks' })
    // Le poison n'affiche qu'une valeur, ses charges (0.36.4)
    expect(statusCounter({ id: 'poison', stacks: 3 })).toEqual({ value: 3, unit: 'stacks' })
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
    const broken = { ...ROSTER[0], id: 'x', stats: { ...ROSTER[0].stats, dodgeChance: 1.5, maxHp: 0 } }
    expect(validateRoster([broken, broken]).length).toBeGreaterThanOrEqual(3)
  })
  it('un personnage par famille (0.43.0) : dix personnages, dix races ou archétypes distincts, sans jumeau', () => {
    expect(ROSTER).toHaveLength(10)
    expect(new Set(ROSTER.map((d) => d.look.image)).size).toBe(ROSTER.length)
    for (const id of ['murzug', 'sylwen', 'grimbald', 'caldrec', 'berengere', 'ssythra', 'gauvain', 'gnashka', 'brannoc', 'melisande'])
      expect(() => createCharacter(id)).toThrow()
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
            // Exact pour qui reste debout ; pour le vaincu, l'excès du coup fatal (overkill) est compté en plus
            const counted = s[opp].totalDamage + s[side].effectDamageTaken - s[side].healed
            const lost = r.fighters[side].maxHp - final.hp[side]
            if (final.hp[side] > 0) expect(counted).toBe(lost)
            else expect(counted).toBeGreaterThanOrEqual(lost)
            expect(s[side].hits + s[opp].dodges).toBe(s[side].attacks)
            // Les coups sacrifiés (Vol de vie) ne comptent pas comme coups portés
            expect(s[side].attacks + s[opp].attacks).toBe(attacksOf(r).filter((x) => !x.forfeited).length)
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
    // Purge à vide : rien n'est parti, on ne dit pas « Purifié »
    expect(effectBadge({ type: 'cleanse', target: 0, removed: [] }).text).toBe('Rien à purifier')
    expect(effectBadge({ type: 'cleanse', target: 0, removed: ['poison'] }).text).toBe('Purifié')
  })
  it('le sens d’un texte flottant dit gain ou perte de la chose nommée, pas bon ou mauvais (2026-10-21)', () => {
    // Un malus posé est gagné : il monte, en couleur de malus (Peur posée sur Naraxes)
    const fear = effectBadge({ type: 'applyStatus', target: 1, status: 'fear', stacks: 1, result: { kind: 'applied', stacks: 1 } })
    expect(fear).toMatchObject({ text: 'Peur', tone: 'negative', rises: true })
    // Un bonus gagné monte aussi
    expect(effectBadge({ type: 'applyStatus', target: 0, status: 'powerAura', stacks: 1, result: { kind: 'applied', stacks: 1 } }).rises).toBe(true)
    // Un bonus dissipé est perdu : il tombe ; des malus purifiés aussi
    expect(effectBadge({ type: 'cleanse', target: 0, removed: ['powerAura'] })).toMatchObject({ tone: 'negative', rises: false })
    expect(effectBadge({ type: 'cleanse', target: 0, removed: ['poison'] }).rises).toBe(false)
    // Des PV perdus tombent, des PV regagnés montent
    expect(effectBadge({ type: 'damage', target: 0, amount: 7 })).toMatchObject({ text: '-7', rises: false })
    expect(effectBadge({ type: 'heal', target: 0, amount: 3 }).rises).toBe(true)
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
      // Équilibre : une case remplie automatiquement reçoit toujours un des personnages les moins
      // présents (le roster peut compter plus de personnages que de cases)
      const count = (id: string) => out.filter((s) => s === id).length
      const min = Math.min(...CHARACTER_IDS.map(count))
      out.forEach((id, i) => {
        if (manual[i] === null) expect(count(id)).toBeLessThanOrEqual(min + 1)
      })
    }
  })

  it('numérote les doublons', () => {
    const filled = slots()
    filled[1] = filled[0] // au moins un doublon, même si le roster dépasse 16 personnages
    const t = createTournament(filled, (id) => createCharacter(id).name)
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
          t = withResult(t, ref, result, rng)
          played++
          expect(status(t, ref)).toBe('done')
          // Récompense : hors finale, une offre de reliques distinctes qu'il n'avait pas, et son choix dedans
          const won = t.results[matchKey(ref)]
          const before = relicsOf(t, won.winner, ref.round)
          if (ref.round === ROUNDS - 1) expect(won.relic).toBeUndefined()
          else {
            expect(won.relic!.offer).toHaveLength(Math.min(OFFER_SIZE, RELIC_IDS.length - before.length))
            expect(new Set(won.relic!.offer).size).toBe(won.relic!.offer.length)
            expect(won.relic!.offer.some((id) => before.includes(id))).toBe(false)
            expect(won.relic!.offer).toContain(won.relic!.chosen)
          }
        }
      }
      expect(played).toBe(SLOTS - 1)
      // Le champion a gagné une relique par tour avant la finale, toutes différentes, et il les portait en finale
      const champ = championRun(t)!
      expect(champ.relics).toHaveLength(ROUNDS - 1)
      expect(new Set(champ.relics).size).toBe(ROUNDS - 1)
      const final = allMatches().find((m) => m.round === ROUNDS - 1)!
      const finalists = matchFighters(t, final)
      const champSide = t.results[matchKey(final)].players![0] === champion(t) ? 0 : 1
      expect(finalists[champSide].relics.map((r) => r.id)).toEqual(champ.relics)
      // Bilan : encaissés = PV perdus (PV max + soins − PV restants) ; infligés (coups et effets, excès du coup
      // fatal compris) ≥ ce que chaque adversaire avait à perdre (les effets ont longtemps manqué aux infligés).
      let lost = 0
      let owed = 0
      for (const ref of allMatches()) {
        const r = t.results[matchKey(ref)]
        const i = r.players!.indexOf(champion(t)!)
        if (i < 0) continue
        const pair = matchFighters(t, ref)
        lost += pair[i].maxHp + r.stats![i].healed - r.hpLeft
        owed += pair[1 - i].maxHp + r.stats![1 - i].healed
      }
      expect(champ.totals.damageTaken).toBe(lost)
      expect(champ.totals.damage).toBeGreaterThanOrEqual(owed)
    }
  })

  it('sans reliques : aucune victoire n’en offre, personne n’en porte', () => {
    const rng = seededRng(5)
    let t = createTournament(slots(rng), (id) => createCharacter(id).name, { relics: false })
    expect(t.relics).toBe(false)
    while (champion(t) === null)
      for (const ref of readyMatches(t)) {
        const fighters = matchFighters(t, ref)
        expect(fighters.every((f) => f.relics.length === 0)).toBe(true)
        t = withResult(t, ref, simulateCombat(fighters, { rng }), rng)
        expect(t.results[matchKey(ref)].relic).toBeUndefined()
      }
    expect(championRun(t)!.relics).toEqual([])
    // Par défaut, le système est actif
    expect(createTournament(slots(rng), (id) => createCharacter(id).name).relics).toBe(true)
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

  it('l’observateur peut changer la relique du vainqueur, tant qu’il n’a pas rejoué', () => {
    const rng = seededRng(3)
    let t = createTournament(slots(rng), (id) => createCharacter(id).name)
    const first = { round: 0, index: 0 }
    t = withResult(t, first, simulateCombat(matchFighters(t, first), { rng }), rng)
    const { offer, chosen } = t.results[matchKey(first)].relic!
    const other = offer.find((id) => id !== chosen)!
    t = chooseRelic(t, first, other)
    const winner = t.results[matchKey(first)].winner
    expect(relicsOf(t, winner)).toEqual([other])
    expect(() => chooseRelic(t, first, 'pas-une-relique')).toThrow()
    // Le combat suivant se joue avec la relique choisie ; un combat préparé avant le changement est refusé
    const second = { round: 0, index: 1 }
    t = withResult(t, second, simulateCombat(matchFighters(t, second), { rng }), rng)
    const next = { round: 1, index: 0 }
    const stale = simulateCombat(matchFighters(chooseRelic(t, first, chosen), next), { rng })
    expect(() => withResult(t, next, stale, rng)).toThrow()
    expect(matchFighters(t, next).flatMap((f) => f.relics.map((r) => r.id))).toContain(other)
    t = withResult(t, next, simulateCombat(matchFighters(t, next), { rng }), rng)
    expect(() => chooseRelic(t, first, chosen)).toThrow()
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

describe('trace de résolution', () => {
  const poisoner = () =>
    testCharacter('ervald', { damageDie: 4 }, [
      {
        id: 'venin',
        name: 'Venin',
        trigger: 'combatStart',
        effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, turns: 3, target: 'opponent' }],
      },
    ])
  const armored = () => testCharacter('brokk', { armor: 5, damageDie: 2 })

  it('une graine rejoue le combat à l’identique et figure dans le résultat', () => {
    const a = simulateCombat([createCharacter('gorak'), createCharacter('brokk')], { seed: 1234 })
    const b = simulateCombat([createCharacter('gorak'), createCharacter('brokk')], { seed: 1234 })
    expect(a.seed).toBe(1234)
    expect(b.beats).toEqual(a.beats)
    expect(simulateCombat([createCharacter('gorak'), createCharacter('brokk')], { rng: seededRng(1234) }).beats).toEqual(a.beats)
  })

  it('une ligne par étape de la chronologie, dans l’ordre, avec les PV avant et après', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const result = simulateCombat([poisoner(), armored()], { seed })
      const trace = traceCombat(result)
      const steps = trace.turns.flatMap((t) => t.lines.filter((l) => l.startsWith('[')))
      expect(steps).toHaveLength(result.beats.length)
      expect(trace.footer).toContain(`${result.fighters[result.winner].name} gagne`)
      expect(traceText(result)).toContain('graine')
    }
  })

  it('le poison est tracé comme des dégâts directs qui ignorent l’armure', () => {
    const result = simulateCombat([poisoner(), armored()], { seed: 7 })
    const tick = result.beats.findIndex((b) => b.type === 'statusTick' && b.status === 'poison')
    expect(tick).toBeGreaterThan(-1)
    const before = result.beats[tick - 1].state.hp[1]
    const text = traceText(result)
    expect(text).toContain('Poison agit sur brokk')
    expect(text).toContain('[début] durée décomptée sur brokk : Poison 3 → 2 tours')
    expect(text).toContain(`2 dégâts directs à brokk, sans armure, esquive ni bouclier (brokk ${before} → ${before - 2} PV)`)
  })
})

describe('aucun emoji dans les textes du jeu', () => {
  it('journal, trace, fiches et descriptions des compétences', () => {
    let seed = 1
    for (const a of CHARACTER_IDS)
      for (const b of CHARACTER_IDS) {
        const r = simulateCombat([createCharacter(a), createCharacter(b)], { seed: seed++ })
        expect(traceText(r).match(EMOJI)?.[0], `trace ${a}-${b}`).toBeUndefined()
        const lines = r.beats.flatMap((beat) => {
          switch (beat.type) {
            case 'attack':
              return [attackLog(beat.turn, beat.attack, r.fighters, beat.state.hp[beat.attack.attacker === 0 ? 1 : 0]).text]
            case 'event':
              return [eventLog(beat.event, r.fighters).text, ...beat.event.effects.map((e) => effectBadge(e).text)]
            case 'statusTick':
              return [statusTickLog(beat.side, beat.status, beat.effects, r.fighters).text]
            case 'statusReaction':
              return [statusReactionLog(beat.side, beat.status, beat.effects, r.fighters).text]
            case 'coin':
              return [coinLog(beat.turn, beat.side, beat.heads, beat.effects, r.fighters).text]
            case 'statusDuration':
              return [statusDurationLog(beat.side, beat.changes, r.fighters).text]
            default:
              return []
          }
        })
        for (const line of lines) expect(line.match(EMOJI)?.[0], line).toBeUndefined()
      }
    for (const c of CHARACTERS) {
      const texts = [c.name, c.race, c.archetype, c.lore.tagline, c.lore.background, ...c.lore.strengths, ...c.lore.weaknesses]
      for (const e of c.events) texts.push(e.name, ...e.effects.map((x) => describeEffect(x)))
      for (const t of texts) expect(t.match(EMOJI)?.[0], `${c.id} : ${t}`).toBeUndefined()
    }
  })
})

describe('musique de fond (docs/SONS.md § 10, 0.48.0)', () => {
  it('trois boucles, chacune avec sa sonie mesurée pour être égalisée', async () => {
    const sound = await import('./sound')
    expect([...sound.MUSIC_TRACKS].sort()).toEqual(['battle-boss', 'battle-drums', 'battle-orchestral'])
    for (const t of sound.MUSIC_TRACKS) expect(sound.MUSIC_LOUDNESS[t]).toBeLessThan(0)
  })
  it('la musique se coupe à part (0.53.0), sans toucher au bouton du son', async () => {
    const sound = await import('./sound')
    const before = sound.isMuted()
    sound.setMusicMuted(true)
    expect(sound.isMusicMuted()).toBe(true)
    expect(sound.isMuted()).toBe(before)
    sound.setMusicMuted(false)
    expect(sound.isMusicMuted()).toBe(false)
  })
  it('son et musique coupés par défaut ; un choix enregistré « rallumé » les rétablit', async () => {
    const stored = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => stored.get(k) ?? null,
      setItem: (k: string, v: string) => void stored.set(k, v),
    })
    try {
      // Import dynamique voulu : l'état muet se lit au chargement du module, qu'on recharge ici
      vi.resetModules()
      const fresh = await import('./sound')
      expect(fresh.isMuted()).toBe(true)
      expect(fresh.isMusicMuted()).toBe(true)
      fresh.setMuted(false)
      fresh.setMusicMuted(false)
      vi.resetModules()
      const reloaded = await import('./sound')
      expect(reloaded.isMuted()).toBe(false)
      expect(reloaded.isMusicMuted()).toBe(false)
    } finally {
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })
})

describe('Sons (docs/SONS.md, 0.36.2)', () => {
  it('chaque fichier de src/assets/sounds porte un nom de son connu (un fichier par son)', async () => {
    const { SAMPLE_URLS, SOUND_NAMES } = await import('./sound')
    const names: readonly string[] = SOUND_NAMES
    expect(Object.keys(SAMPLE_URLS).filter((n) => !names.includes(n))).toEqual([])
  })

  it('seuls les dés ont plusieurs fichiers, tirés au hasard (exception de la règle 2, 0.36.4)', async () => {
    const { SAMPLE_URLS, VARIED_SOUNDS } = await import('./sound')
    expect(Object.entries(SAMPLE_URLS).filter(([n, urls]) => urls.length > 1 && !VARIED_SOUNDS.includes(n as never)).map(([n]) => n)).toEqual([])
    expect(SAMPLE_URLS['dice-roll']).toHaveLength(2)
    expect(SAMPLE_URLS['dice-land']).toHaveLength(3)
  })

  it('chaque compétence joue le son de sa nature, le même pour tous les personnages (§ 4.3)', async () => {
    const { cueOf } = await import('./cues')
    // Coups (null) : Rétribution et la Foudre du druide sonnent avec leurs dégâts
    const expected: Record<string, string | null> = {}
    const family = (cue: string | null, ids: string[]) => ids.forEach((id) => (expected[id] = cue))
    family('auraGain', ['power-aura', 'precision-aura', 'intimidation-aura', 'frost-aura', 'holy-aura', 'decoction-aura', 'immunity-aura', 'wild-aura', 'melodious-aura', 'overture'])
    family('buff', ['wind-fury', 'hawk-eye', 'evasion', 'stoneskin', 'thorns', 'life-steal', 'lucky-strike', 'coin-flip', 'riposte', 'whistle'])
    family('debuff', ['grave-breath', 'fear', 'firefly', 'waiting-1', 'waiting-2', 'waiting-3', 'false-note', 'cleave'])
    // Crescendo et Soliste (barde) : leurs trois coups sonnent, la compétence est muette
    family(null, ['retribution', 'thunderbolt', 'crescendo', 'soloist'])
    const seen: Record<string, Set<string | null>> = {}
    for (const a of CHARACTER_IDS)
      for (const b of CHARACTER_IDS)
        for (let seed = 1; seed <= 4; seed++)
          for (const beat of simulateCombat([createCharacter(a), createCharacter(b)], { rng: seededRng(seed) }).beats) {
            if (beat.type !== 'event') continue
            const blocked = beat.event.effects.some((e) => e.type === 'applyStatus' && e.result.kind !== 'applied')
            if (!blocked) (seen[beat.event.eventId] ??= new Set()).add(cueOf(beat.event.side, beat.event.effects))
          }
    expect(Object.keys(expected).filter((id) => !seen[id])).toEqual([])
    for (const [id, cues] of Object.entries(seen)) {
      // Purification : Aura perdue si le bonus retiré est une aura, sinon Dissipation (rien si rien à retirer)
      if (id === 'purification') expect([...cues].every((c) => c === 'auraLoss' || c === 'dispel' || c === null)).toBe(true)
      // Un effet sans résultat (soin à PV pleins) est muet (règle 8) : seul compte le son quand il agit
      else if (expected[id] === null) expect({ id, cues: [...cues] }).toEqual({ id, cues: [null] })
      else expect({ id, cues: [...cues].filter((c) => c !== null) }).toEqual({ id, cues: [expected[id]] })
    }
  })

  it("une aura cumulable reposée à son plafond ne sonne pas : rien ne s'est activé (§ 4.2, règle 8)", () => {
    const capped = { type: 'applyStatus', target: 0, status: 'holyAura', stacks: 1, result: { kind: 'applied', stacks: 0 } } as const
    expect(cueOf(0, [capped])).toBeNull()
    expect(cueOf(0, [{ ...capped, result: { kind: 'applied', stacks: 1 } }])).toBe('auraGain')
  })
})

describe('postures (docs/POSTURES.md)', () => {
  it('choisit la posture du moment par ordre de priorité', () => {
    expect(poseOf({})).toBe('idle')
    expect(poseOf({ received: { landed: false, dodged: false } })).toBe('idle') // élan adverse pas encore arrivé
    expect(poseOf({ received: { landed: true, dodged: false } })).toBe('hurt')
    expect(poseOf({ received: { landed: false, dodged: true } })).toBe('dodge')
    expect(poseOf({ lunging: true, received: { landed: true, dodged: false } })).toBe('attack')
    expect(poseOf({ state: 'ko', lunging: true })).toBe('ko')
    expect(poseOf({ state: 'victory' })).toBe('victory')
    expect(POSE_IDS).toEqual(['idle', 'attack', 'dodge', 'hurt', 'ko', 'victory'])
  })

  it("retombe sur l'image de garde quand une posture manque", () => {
    const look = { image: 'garde.png', poses: { attack: 'attaque.png' } }
    expect(poseImage(look, 'attack')).toBe('attaque.png')
    expect(poseImage(look, 'dodge')).toBe('garde.png')
    expect(poseImage({ image: 'garde.png' }, 'ko')).toBe('garde.png')
    expect(poseImages(look)).toEqual(['garde.png', 'attaque.png'])
  })

  it("une forme qui change d'image ne reprend pas les postures de la forme de base", () => {
    const base = ROSTER.find((d) => d.forms)!
    const c = new Character({
      ...base,
      look: { ...base.look, poses: { attack: 'druide-attaque.png' } },
      forms: [base.forms![0], { ...base.forms![1], look: { ...base.forms![1].look, poses: { ko: 'ours-ko.png' } } }],
    })
    expect(poseImage(c.lookFor(0), 'attack')).toBe('druide-attaque.png')
    expect(poseImage(c.lookFor(1), 'attack')).toBe(c.lookFor(1).image) // pas l'attaque du druide
    expect(poseImage(c.lookFor(1), 'ko')).toBe('ours-ko.png')
  })

  it("échelle resserrée (STYLE_BIBLE § 2) : le nain le plus petit, l'ogre le plus grand, des écarts modérés", () => {
    const h = (id: string, form = 0) => figureHeight(createCharacter(id).lookFor(form))
    expect(h('brokk')).toBeLessThan(h('ysolde'))
    expect(h('ysolde')).toBeLessThan(h('gorak'))
    expect(h('gorak')).toBeLessThan(h('morgrut'))
    // L'ours, à quatre pattes, ne grandit pas : il reste sous l'ogre et à la hauteur du druide, à 5 % près
    expect(h('thaldrin', 1)).toBeLessThan(h('morgrut'))
    expect(Math.abs(h('thaldrin', 1) / h('thaldrin', 0) - 1)).toBeLessThan(0.05)
    for (const c of CHARACTERS) expect(h(c.id)).toBeLessThanOrEqual(h('morgrut'))
    // Ni des clones de même taille, ni des tailles « réalistes » (ogre deux fois le nain, jugé trop fort)
    expect(h('morgrut') / h('brokk')).toBeGreaterThan(1.2)
    expect(h('morgrut') / h('brokk')).toBeLessThan(1.5)
  })

  it('tous les personnages, et les deux formes du druide, ont les cinq postures communes', () => {
    const looks = CHARACTERS.flatMap((c) => (c.forms ?? [null]).map((_, f) => [`${c.id}:${f}`, c.lookFor(f)] as const))
    for (const [id, look] of looks) expect(Object.keys(look.poses ?? {}).sort(), id).toEqual(['attack', 'dodge', 'hurt', 'ko', 'victory'])
    // L'ours a ses propres postures, pas celles du druide
    const thaldrin = createCharacter('thaldrin')
    expect(thaldrin.lookFor(1).poses?.attack).not.toBe(thaldrin.lookFor(0).poses?.attack)
  })

  it('chaque posture a un nom, un moment et un prompt, sans emoji', () => {
    for (const id of POSE_IDS) {
      const p = POSES[id]
      expect(p.name && p.when && p.prompt).toBeTruthy()
      for (const t of [p.name, p.when, p.prompt]) expect(t).not.toMatch(EMOJI)
    }
  })
})

