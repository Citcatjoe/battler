import { describe, expect, it, vi } from 'vitest'
import { skillCatalog, statusCatalog, statusLinks } from './catalog'
import { ARENAS, getArena, RANDOM_ARENA, resolveArena, TRAINING_ARENA } from './arenas'
import { attacksOf, finalState, simulateCombat, type AppliedEffect, type CombatResult } from './combat'
import { cueOf } from './cues'
import { describeEffect, describeEvent, describeSkill, faceTrigger, rollFace, TRIGGERS, type Effect } from './events'
import { getHistory, normalize, recordMatch, recordTournamentWin, clearHistory } from './history'
import { attackLog, coinLog, effectBadge, effectText, eventLog, statusAgeLog, statusReactionLog, statusTickLog } from './narration'
import { chance, pickWeighted, rollDie, seededRng, shuffle } from './rng'
import { CHARACTER_IDS, CHARACTERS, createCharacter, ENGRAVABLE_SKILLS, ROSTER, validateRoster } from './roster'
import { offerTargets } from './forge'
import { computeStats } from './stats'
import { POSE_IDS, POSES, poseImage, poseImages, poseOf } from './poses'
import { Character, figureHeight } from './character'
import { EMOJI, testCharacter } from './test-utils'
import { traceCombat, traceText } from './trace'
import {
  ACT_FIGHTS,
  ACT_LENGTH,
  BOSS,
  CAMPAIGN_REPERTOIRES,
  campaignCharacter,
  drawBuild,
  drawReward,
  offerableRelics,
  offerableSkills,
  encountersFor,
  opponentOf,
  HP_FLOOR,
  MAX_SKILL_FACES,
  OPPONENT_LAG,
  secondSkillOf,
  tuneHp,
  championOf,
  heritableGains,
  isBossNode,
  loadHeritage,
  loadRun,
  recordHeritage,
  referenceChampions,
  rewardChoice,
  REWARDS,
  startRun,
  withFightResult,
  withReward,
  type Encounter,
} from './campaign'
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
import { OFFER_SIZE, RELIC_IDS, RELICS } from './relics'
import { eventHooks, linkBetween, relicHooks, skillNeeds, validateHooks } from './hooks'

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
    // Une ligne par compétence, avec ses déclencheurs (la Foudre du druide, sur le 2 de son dé vanilla depuis la 0.113.0)
    expect(skills.find((s) => s.event.id === 'thunderbolt')!.triggers).toEqual(['naturalTwo'])
    // Les faces nues ne sont pas des compétences : l'ogre n'en a aucune sur son dé ; sa Rancune est hors kit (0.114.0)
    expect(skills.filter((s) => s.owners.some((c) => c.id === 'morgrut')).map((s) => [s.event.id, s.outside])).toEqual([['grudge', true]])
    // Hors kit (règles v2, d6) : listée chez son personnage, sans face
    expect(skills.find((s) => s.event.id === 'power-aura')).toMatchObject({ outside: true, triggers: [], owners: [createCharacter('gorak')] })
    // Un personnage par famille (0.43.0) : chaque compétence a un seul possesseur
    for (const s of skills) expect(s.owners).toHaveLength(1)
    expect(skills.find((s) => s.event.id === 'wind-fury')!.owners.map((c) => c.id)).toEqual(['gorak'])
  })

  it('chaque compétence déclare sa nature (couleur de sa carte)', () => {
    const skills = skillCatalog().flatMap((f) => f.skills)
    expect(skills.filter((s) => !s.event.nature).map((s) => s.event.id)).toEqual([])
    expect(skills.find((s) => s.event.id === 'cleave')!.event.nature).toBe('martial')
  })

  it('un effet subi par l’adversaire le nomme dans le texte de la compétence (retour du 2026-10-21)', () => {
    // « Perd 3 PV au début de son prochain tour » (Souffle de la tombe) se lisait comme une perte du lanceur
    for (const c of CHARACTERS)
      for (const e of [...c.events, ...(c.definition.reserve ?? [])])
        for (const effect of e.effects.filter((x) => x.target === 'opponent'))
          expect(describeSkill({ ...e, effects: [effect] }).text, `${c.id} · ${e.id}`).toContain('adversaire')
    expect(describeSkill(createCharacter('ervald').definition.reserve!.find((e) => e.id === 'grave-breath')!).text).toMatch(/^Sur l'adversaire : perd 3, 2 puis 1 PV/)
  })
})

describe('catalogue des statuts', () => {
  it('liste chaque statut une fois, avec ses règles et qui le met en jeu', () => {
    const catalog = statusCatalog()
    expect(catalog.map((e) => e.id).sort()).toEqual([...STATUS_IDS].sort())
    const who = (id: StatusId) =>
      catalog
        .find((e) => e.id === id)!
        .sources.map((s) => (s.kind === 'status' ? `statut:${s.status}` : s.kind === 'relic' ? `relique:${s.relic.id}` : `${s.kind}:${s.character.id}`))
        .sort()
    // Poison : posé par Ervald (Souffle de la tombe, Virulence), et aussi par deux auras (effet de tour, réaction)
    expect(who('poison')).toEqual(['skill:ervald', 'skill:ervald', 'statut:decoctionAura', 'statut:frostAura'])
    // Régénération : sans porteur depuis la 0.73.0 (Fleur de vie retirée)
    expect(who('regeneration')).toEqual([])
    // Rétribution : aucune compétence ne la pose, celle d'Aldric la relâche ; elle était absente du compendium
    expect(who('retribution')).toEqual(['release:aldric'])
    // Statuts de forme (0.73.0) : posés par la forme du druide, pas par une compétence
    expect(who('casting')).toEqual(['form:thaldrin'])
    expect(who('bearMight')).toEqual(['form:thaldrin'])
    // Reliques (audit du 2026-10-21) : elles posent aussi des statuts, le compendium les cite
    expect(who('thorns')).toEqual(['relique:bramble-collar', 'skill:brokk'])
    // La Rancune (0.114.0) en pose un à chaque coup encaissé
    expect(who('guaranteedCrit')).toEqual(['relique:hunter-trophy', 'relique:opening-bell', 'relique:siege-clepsydra', 'skill:elaria', 'statut:grudge'])
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
    // Purge par une relique (Chapelet de l'ermite) ; un mécanisme (jauges de Rétribution) ne se purge pas
    expect(statusLinks('poison').some((l) => l.relic?.id === 'hermit-beads')).toBe(true)
    expect(statusLinks('retribution').some((l) => l.skill || l.relic)).toBe(false)
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
  it('pickWeighted tire au poids : jamais un poids nul, trois fois plus souvent un poids triple', () => {
    const rng = seededRng(3)
    const draws = Array.from({ length: 4000 }, () => pickWeighted(rng, ['a', 'b', 'c'], (x) => ({ a: 1, b: 3, c: 0 })[x]!))
    const n = (x: string) => draws.filter((d) => d === x).length
    expect(n('c')).toBe(0)
    expect(n('b') / n('a')).toBeGreaterThan(2.6)
    expect(n('b') / n('a')).toBeLessThan(3.4)
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

describe('accroches (règles v2, phase 1)', () => {
  const events = ROSTER.flatMap((d) => d.events)
  const relic = (id: string) => relicHooks(RELICS.find((r) => r.id === id)!)

  it('chaque compétence et chaque relique produit une accroche, chaque statut est posé du côté déclaré', () => {
    expect(validateHooks(events, RELICS)).toEqual([])
  })

  it('refuse une compétence qui ne produit rien, et un statut posé du mauvais côté', () => {
    const empty = { id: 'vide', name: 'Vide', trigger: 'naturalOne' as const, effects: [] }
    const wrong = { id: 'travers', name: 'Travers', trigger: 'naturalTwo' as const, effects: [{ type: 'applyStatus' as const, status: 'poison' as const, stacks: 1 }] }
    expect(validateHooks([empty, wrong], [])).toEqual(['vide : la compétence ne produit aucune accroche', 'poison : posé sur soi, déclaré sur l’adversaire'])
  })

  it('les liens mesurés (PROGRESSION.md § 3) se lisent dans les accroches : Dé creux nourrit la Conque, la Cotte la gêne', () => {
    expect(linkBetween(relic('hollow-die'), relic('wind-conch')).feeds).toContain('moment:dodge')
    expect(linkBetween(relic('mercenary-mail'), relic('wind-conch')).conflicts).toContain('moment:dodge')
  })

  it('une compétence hérite des accroches du statut qu’elle pose : Pourfendre fait saigner quand il touche', () => {
    const cleave = eventHooks(events.find((e) => e.id === 'cleave')!)
    expect(cleave.produces).toEqual(expect.arrayContaining(['status:bleed', 'damage:temporal']))
    expect(cleave.consumes).toEqual(expect.arrayContaining(['face:2', 'moment:hit']))
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
            // Un jet remplacé sans coup de base (Coup de chance) ne compte pas comme coup porté
            expect(s[side].attacks + s[opp].attacks).toBe(attacksOf(r).filter((x) => !x.replaced).length)
          }
        }
  })
})

describe('narration', () => {
  const fighters = [createCharacter('gorak'), createCharacter('brokk')] as const
  it('chaque type d’effet et chaque statut produisent un texte et un badge', () => {
    const effects: AppliedEffect[] = [
      { type: 'heal', target: 0, amount: 3 },
      { type: 'damage', target: 1, amount: 2, source: 'strike' },
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
    expect(effectBadge({ type: 'damage', target: 0, amount: 7, source: 'strike' })).toMatchObject({ text: '-7', rises: false })
    expect(effectBadge({ type: 'heal', target: 0, amount: 3 }).rises).toBe(true)
  })
  it('chaque déclencheur a un libellé, chaque événement une description', () => {
    for (const t of Object.values(TRIGGERS)) expect(t.label).not.toBe('')
    const effects: Effect[] = [
      { type: 'heal', amount: 2 },
      { type: 'damage', amount: 2, target: 'opponent', source: 'strike' },
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
    testCharacter('ervald', { attackMin: 2, attackMax: 2 }, [
      {
        id: 'venin',
        name: 'Venin',
        trigger: 'combatStart',
        effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, turns: 3, target: 'opponent' }],
      },
    ])
  const armored = () => testCharacter('brokk', { armor: 5, attackMin: 1, attackMax: 1 })

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
    expect(text).toContain('[début] usure sur brokk : Poison 3 → 2 tours')
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
            case 'statusAge':
              return [statusAgeLog(beat.side, beat.changes, beat.expired, r.fighters).text]
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
  it('effets et musique : deux interrupteurs indépendants (panneau du son)', async () => {
    // Faux contexte audio : on lit le niveau du bus des effets (premier gain) et de la musique (dernier)
    type FakeGain = { gain: { value: number; setTargetAtTime: (v: number) => void }; connect: (n: unknown) => unknown }
    const gains: FakeGain[] = []
    const node = () => ({ connect: (n: unknown) => n, threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} })
    class FakeAudioContext {
      state = 'running'
      currentTime = 0
      sampleRate = 8
      destination = {}
      createGain() {
        const g: FakeGain = { gain: { value: 1, setTargetAtTime: (v) => void (g.gain.value = v) }, connect: (n) => n }
        gains.push(g)
        return g
      }
      createDynamicsCompressor = node
      createBuffer = () => ({ getChannelData: () => new Float32Array(8) })
      decodeAudioData = () => Promise.reject(new Error('faux'))
      resume = () => Promise.resolve()
    }
    vi.stubGlobal('AudioContext', FakeAudioContext)
    vi.stubGlobal('fetch', () => Promise.reject(new Error('hors ligne')))
    try {
      // Import dynamique voulu : le module crée son contexte audio à partir du faux, rechargé ici
      vi.resetModules()
      const sound = await import('./sound')
      sound.setMuted(true)
      sound.setMusicMuted(false)
      sound.music.start(sound.MUSIC_TRACKS[0])
      const [effects, musicBus] = [gains[0], gains[gains.length - 1]]
      // Effets coupés, musique active : la musique s'entend
      expect(effects.gain.value).toBe(0)
      expect(musicBus.gain.value).toBe(1)
      // Musique coupée seule : les effets reviennent sans elle
      sound.setMuted(false)
      sound.setMusicMuted(true)
      expect(sound.isMuted()).toBe(false)
      expect(effects.gain.value).toBeGreaterThan(0)
      expect(musicBus.gain.value).toBe(0)
      // Couper les effets ne touche plus à la musique
      sound.setMusicMuted(false)
      sound.setMuted(true)
      expect(sound.isMusicMuted()).toBe(false)
      expect(musicBus.gain.value).toBe(1)
      sound.music.stop()
    } finally {
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })
  it('effets et musique coupés par défaut ; un choix enregistré « rallumé » les rétablit', async () => {
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
    family('auraGain', ['power-aura', 'precision-aura', 'intimidation-aura', 'frost-aura', 'holy-aura', 'decoction-aura', 'immunity-aura', 'wild-aura', 'melodious-aura', 'overture', 'sentence'])
    family('buff', ['hawk-eye', 'evasion', 'stoneskin', 'thorns', 'life-steal', 'lucky-strike', 'riposte', 'whistle', 'grudge'])
    family('debuff', ['grave-breath', 'fear', 'firefly', 'false-note', 'cleave', 'virulence'])
    family('heal', ['harvest'])
    // Crescendo et Soliste (barde) : leur coup ×N sonne, la compétence est muette ; la Furie des vents, la Curée et Pile ou
    // face posent un mécanisme, muet (0.110.0) : leur rafale et leur pièce sonnent
    family(null, ['retribution', 'thunderbolt', 'crescendo', 'soloist', 'wind-fury', 'coin-flip', 'quarry'])
    // Les compétences hors kit (d6) se jouent gravées sur le 3 d'un porteur : Gorak (il fait saigner), ou Ervald pour
    // l'Aura de puissance et les consommatrices du Poison (il empoisonne)
    const carriers = CHARACTERS.flatMap((c) => c.definition.reserve ?? []).map((skill) =>
      createCharacter(['power-aura', 'harvest', 'virulence'].includes(skill.id) ? 'ervald' : 'gorak').withForge([{ op: 'engrave', face: 3, skill }]),
    )
    const seen: Record<string, Set<string | null>> = {}
    for (const a of [...CHARACTERS, ...carriers])
      for (const b of CHARACTERS)
        for (let seed = 1; seed <= 6; seed++)
          for (const beat of simulateCombat([a, b], { rng: seededRng(seed) }).beats) {
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

describe('campagne et héritage (0.88.0, docs/CAMPAGNE.md)', () => {
  const encounter: Encounter = { characterId: 'brokk', maxHp: 57, forge: [], relics: [], chance: 0.5 }
  const bossEncounter: Encounter = { characterId: BOSS.id, maxHp: BOSS.stats.maxHp, forge: [], relics: [], boss: true, chance: 0.4 }
  // Le champion est toujours à gauche (camp 0) : un combat gagné, un combat perdu
  const won = simulateCombat([testCharacter('a', { maxHp: 100 }), testCharacter('b', { maxHp: 1 })], { seed: 1 })
  const lost = simulateCombat([testCharacter('a', { maxHp: 1 }), testCharacter('b', { maxHp: 100 })], { seed: 1 })
  const fear = ENGRAVABLE_SKILLS.find((e) => e.id === 'fear')!

  it('les adversaires grandissent avec l’acte (0.105.0) : au nœud k, leur départ et les k récompenses de l’acte, puis leurs PV réglés', () => {
    for (const node of [0, 4, ACT_FIGHTS - 1]) {
      const build = drawBuild('brokk', node, seededRng(node))
      expect(build.forge).toHaveLength(REWARDS.slice(0, node).filter((k) => k === 'forge').length)
      expect(build.relics).toHaveLength(REWARDS.slice(0, node).filter((k) => k === 'relic').length)
      const opponent = opponentOf({ characterId: 'brokk', maxHp: 33, ...build, chance: 0 })
      // Son départ (Épines acérées et Peau de pierre, copiées peut-être) et rien d'autre hors gravures ; sa forge, ses reliques, ses PV
      expect([...new Set(opponent.events.filter((e) => !build.forge.some((f) => f.op === 'engrave' && f.skill.id === e.id)).map((e) => e.id))]).toEqual(['thorns', 'stoneskin'])
      expect(opponent.forge).toEqual(build.forge)
      expect(opponent.relics.map((r) => r.id)).toEqual(build.relics)
      expect(opponent.maxHp).toBe(33)
    }
  })

  it('le levier des PV, moins fort (0.112.0) : un adversaire normal a `OPPONENT_LAG` récompenses de retard, et jamais moins de `HP_FLOOR` de ses PV de base', () => {
    for (const wins of [0, 1, 5]) {
      const run = { ...startRun('gorak', 8), wins }
      for (const e of encountersFor(run)) {
        expect(e.forge.length + e.relics.length, `nœud ${wins}`).toBe(Math.max(0, wins - OPPONENT_LAG))
        expect(e.maxHp, `${e.characterId}, nœud ${wins}`).toBeGreaterThanOrEqual(Math.ceil(createCharacter(e.characterId).baseStats.maxHp * HP_FLOOR))
      }
    }
    // Le plancher : contre un adversaire qui les bat toujours, le réglage s'arrête au plancher demandé (le quart, sinon)
    const weak = [testCharacter('a', { maxHp: 20, attackMin: 1, attackMax: 1 })]
    const strong = testCharacter('b', { maxHp: 40, attackMin: 9, attackMax: 9 })
    expect(tuneHp(weak, strong, 0.9, 'plancher', HP_FLOOR)).toBe(Math.ceil(40 * HP_FLOOR))
    expect(tuneHp(weak, strong, 0.9, 'plancher')).toBe(10)
  })

  it('le boss est un personnage valide, à son dé forgé', () => {
    expect(validateRoster([BOSS])).toEqual([])
    expect(campaignCharacter(BOSS.id).gilded).toEqual({ 5: 2, 6: 2 })
  })

  it('un seul modèle (0.113.0, règle de l’utilisateur) : un personnage part du même point en campagne et en tournoi, le personnage vanilla du roster', () => {
    const start = (c: Character) => ({ stats: c.baseStats, events: c.events, forms: c.forms, twinDice: c.definition.twinDice, forge: c.forge, relics: c.relics })
    for (const id of CHARACTER_IDS) {
      const vanilla = start(createCharacter(id))
      // Le champion de campagne, un adversaire de campagne avant sa construction, un participant de tournoi au premier tour
      expect(start(championOf(startRun(id, 1))), id).toEqual(vanilla)
      expect(start(campaignCharacter(id)), id).toEqual(vanilla)
      const t = createTournament(Array.from({ length: SLOTS }, () => id), (x) => createCharacter(x).name)
      for (const fighter of matchFighters(t, { round: 0, index: 0 })) expect(start(fighter), id).toEqual(vanilla)
    }
  })

  it('le dé vanilla (0.113.0) : la signature sur le 1, la seconde compétence sur le 2, quatre faces nues ; le reste de ses compétences entre dans son répertoire de campagne', () => {
    for (const c of CHARACTERS) {
      const signature = c.definition.signature
      const second = secondSkillOf(c.definition)
      const onFaces = c.events.filter((e) => rollFace(e.trigger) !== undefined).map((e) => `${e.id}@${e.trigger}`)
      // Sans signature (Morgrut, le combattant nu) : six faces nues
      if (!signature) expect(onFaces, c.id).toEqual([])
      else expect(onFaces, c.id).toEqual([`${signature}@${faceTrigger(1)}`, `${second?.id}@${faceTrigger(2)}`])
    }
    // Ce qui n'est pas une face reste : l'Ouverture de Fanchon
    expect(createCharacter('fanchon').events.map((e) => e.id)).toEqual(['overture', 'melodious-aura', 'soloist'])
    for (const c of CHARACTERS) {
      const kit = c.events.map((e) => e.id)
      const reserve = (c.definition.reserve ?? []).filter((e) => ENGRAVABLE_SKILLS.some((x) => x.id === e.id)).map((e) => e.id)
      // Pas de gravure en double : ni la signature ni la seconde dans le répertoire de campagne
      expect(CAMPAIGN_REPERTOIRES[c.id].map((e) => e.id), c.id).toEqual([...reserve, ...(c.definition.repertoire ?? [])])
      expect(CAMPAIGN_REPERTOIRES[c.id].some((e) => kit.includes(e.id)), c.id).toBe(false)
    }
    // Seul Morgrut part sans signature
    expect(CHARACTERS.filter((c) => !c.definition.signature).map((c) => c.id)).toEqual(['morgrut'])
    // Gorak : la Furie des vents sur le 1, Pourfendre sur le 2 ; le 3 à 6 sont des faces nues qui se gravent
    const gorak = championOf(startRun('gorak', 1))
    expect(gorak.events.map((e) => `${e.id}@${e.trigger}`)).toEqual(['wind-fury@naturalOne', 'cleave@naturalTwo'])
    expect(offerTargets(gorak.definition, [], { op: 'engrave', skill: CAMPAIGN_REPERTOIRES.gorak[0] })).toEqual([3, 4, 5, 6])
  })

  it('Thaldrin (0.113.0) : un Feu follet sur le 1, une Foudre sur le 2, en forme humaine, attaque 5 à 6 ; des gravures jusqu’à la limite', () => {
    const thaldrin = createCharacter('thaldrin')
    expect(thaldrin.events.map((e) => `${e.id}@${e.trigger}@${e.form}`)).toEqual(['firefly@naturalOne@human', 'thunderbolt@naturalTwo@human'])
    expect(thaldrin.forms?.map((f) => f.statuses)).toEqual([['casting'], ['bearMight']])
    expect(CAMPAIGN_REPERTOIRES.thaldrin.map((e) => e.id)).not.toContain('thunderbolt')
    expect([thaldrin.baseStats.attackMin, thaldrin.baseStats.attackMax]).toEqual([5, 6])
    // Les quatre faces nues se gravent
    expect(offerTargets(thaldrin.definition, [], { op: 'engrave', skill: CAMPAIGN_REPERTOIRES.thaldrin[0] })).toEqual([3, 4, 5, 6])
    // La limite compte des faces : le Feu follet, la Foudre et les gravures font `MAX_SKILL_FACES`, ni Graver ni Copier ensuite
    const engraved = CAMPAIGN_REPERTOIRES.thaldrin.slice(0, MAX_SKILL_FACES - 2).map((skill, i) => ({ op: 'engrave' as const, face: 3 + i, skill }))
    for (let k = 0; k < 20; k++) {
      const under = drawReward({ championId: 'thaldrin', forge: engraved.slice(0, -1), relics: [] }, 'forge', seededRng(k))
      const full = drawReward({ championId: 'thaldrin', forge: engraved, relics: [] }, 'forge', seededRng(k))
      if (under.kind !== 'forge' || full.kind !== 'forge') throw new Error('forge attendue')
      expect(under.offer.some((o) => o.op === 'engrave'), `graine ${k}`).toBe(true)
      expect(full.offer.some((o) => o.op === 'engrave' || o.op === 'copy'), `graine ${k}`).toBe(false)
    }
  })

  it('offre orientée (règles v2, phase 2) : Graver est toujours proposée quand une face peut la recevoir, avec une compétence du répertoire de campagne', () => {
    for (const id of CHARACTER_IDS) {
      const own = CAMPAIGN_REPERTOIRES[id].map((e) => e.id)
      const def = createCharacter(id).definition
      for (let k = 0; k < 20; k++) {
        const reward = drawReward({ championId: id, forge: [], relics: [] }, 'forge', seededRng(k))
        if (reward.kind !== 'forge') throw new Error('forge attendue')
        const engrave = reward.offer.find((o) => o.op === 'engrave')
        const room = offerTargets(def, [], { op: 'engrave', skill: CAMPAIGN_REPERTOIRES[id][0] }).length > 0
        expect(!!engrave, `${id} graine ${k}`).toBe(room)
        if (engrave?.op === 'engrave') expect(own).toContain(engrave.skill.id)
      }
    }
  })

  it('`MAX_SKILL_FACES` faces de compétence au plus : la limite atteinte, plus de Graver ni de Copier ; Dorer, Aiguiser et Tremper restent', () => {
    // La signature, la seconde compétence et les gravures : `MAX_SKILL_FACES` faces de compétence, la limite
    const engraved = CAMPAIGN_REPERTOIRES.gorak.slice(0, MAX_SKILL_FACES - 2).map((skill, i) => ({ op: 'engrave' as const, face: 3 + i, skill }))
    for (let k = 0; k < 20; k++) {
      const under = drawReward({ championId: 'gorak', forge: engraved.slice(0, -1), relics: [] }, 'forge', seededRng(k))
      const full = drawReward({ championId: 'gorak', forge: engraved, relics: [] }, 'forge', seededRng(k))
      if (under.kind !== 'forge' || full.kind !== 'forge') throw new Error('forge attendue')
      expect(under.offer.some((o) => o.op === 'engrave'), `graine ${k}`).toBe(true)
      expect(full.offer.some((o) => o.op === 'engrave'), `graine ${k}`).toBe(false)
      // Copier ne copie qu'une compétence : à la limite, elle n'est plus proposée
      expect(full.offer.some((o) => o.op === 'copy'), `graine ${k}`).toBe(false)
      expect(full.offer.length).toBeGreaterThan(0)
    }
  })

  it('offre orientée : la première relique se tire à l’écho du build (le Dé creux appelle la Conque des vents)', () => {
    // Morgrut, six faces nues : rien d'autre dans son build ne fait écho (Gorak, depuis Pourfendre sur le 2, appelle aussi le Croc de boucher)
    let first = 0
    let others = 0
    for (let k = 0; k < 400; k++) {
      const reward = drawReward({ championId: 'morgrut', forge: [], relics: ['hollow-die'] }, 'relic', seededRng(k))
      if (reward.kind !== 'relic') throw new Error('relique attendue')
      if (reward.offer[0] === 'wind-conch') first++
      if (reward.offer.slice(1).includes('wind-conch')) others++
    }
    // Libre, la Conque tomberait deux fois plus souvent dans les deux autres cartes qu'en première : orientée, l'inverse
    expect(first).toBeGreaterThan(others)
  })

  it('offre pertinente (2026-10-24) : jamais une relique dont la condition ne peut pas arriver ; une brique qui la rend possible la rouvre', () => {
    // La Fiole de venin lit le Poison : ni Elaria, ni Gorak, ni Ysolde n'en posent (signature, répertoire, reliques)
    for (const id of ['elaria', 'gorak', 'ysolde']) {
      expect(offerableRelics({ championId: id, forge: [], relics: [] }), id).not.toContain('venom-vial')
      for (let k = 0; k < 200; k++) {
        const reward = drawReward({ championId: id, forge: [], relics: [] }, 'relic', seededRng(k))
        if (reward.kind !== 'relic') throw new Error('relique attendue')
        expect(reward.offer, `${id}, graine ${k}`).not.toContain('venom-vial')
      }
    }
    expect(offerableRelics({ championId: 'ervald', forge: [], relics: [] })).toContain('venom-vial')
    // Le soin reçu : Elaria n'en a pas, la Dent de loup (Vol de vie) lui en donne
    expect(offerableRelics({ championId: 'elaria', forge: [], relics: [] })).not.toContain('abbey-incense')
    expect(offerableRelics({ championId: 'elaria', forge: [], relics: ['wolf-fang'] })).toContain('abbey-incense')
    // Morgrut n'esquive pas : pas de Conque des vents, jusqu'au Dé creux (Esquive améliorée). Il ne critique pas, mais sa
    // Rancune (hors kit, 0.114.0) donne des critiques : la Plume d'aigle, son partenaire (+0,30), lui est offerte
    expect(offerableRelics({ championId: 'morgrut', forge: [], relics: [] })).not.toContain('wind-conch')
    expect(offerableRelics({ championId: 'morgrut', forge: [], relics: [] })).toContain('eagle-feather')
    expect(offerableRelics({ championId: 'morgrut', forge: [], relics: ['hollow-die'] })).toContain('wind-conch')
  })

  it('offre pertinente des compétences (0.114.0) : Graver ne propose pas une consommatrice dont la ressource ne peut pas arriver', () => {
    const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
    const lot = ['quarry', 'harvest', 'virulence', 'sentence', 'grudge'].map(skill)
    // Ce qu'elles attendent : le Saignement, le Poison, un soin ; la Rancune vit des coups encaissés, que tout le monde reçoit
    expect(lot.map((s) => skillNeeds(s))).toEqual([['status:bleed'], ['status:poison'], ['status:poison'], ['moment:heal'], []])
    // Ysolde ne fait ni saigner ni empoisonner : de tout le lot, seules la Sentence (ses soins) et la Rancune lui restent
    expect(offerableSkills({ championId: 'ysolde', forge: [], relics: [] }, lot).map((s) => s.id)).toEqual(['sentence', 'grudge'])
    // Elaria : le Saignement de Pourfendre (son répertoire) ; un soin, seulement avec la Dent de loup (Vol de vie)
    expect(offerableSkills({ championId: 'elaria', forge: [], relics: [] }, lot).map((s) => s.id)).toEqual(['quarry', 'grudge'])
    expect(offerableSkills({ championId: 'elaria', forge: [], relics: ['wolf-fang'] }, lot).map((s) => s.id)).toEqual(['quarry', 'sentence', 'grudge'])
    // Chaque répertoire de campagne ne porte que des compétences à la portée de son champion, et l'offre n'en sort pas
    for (const id of CHARACTER_IDS) {
      const run = { championId: id, forge: [], relics: [] }
      expect(offerableSkills(run, CAMPAIGN_REPERTOIRES[id]).map((s) => s.id), id).toEqual(CAMPAIGN_REPERTOIRES[id].map((s) => s.id))
      const reach = offerableSkills(run, CAMPAIGN_REPERTOIRES[id]).map((s) => s.id)
      for (let k = 0; k < 20; k++) {
        const reward = drawReward(run, 'forge', seededRng(k))
        if (reward.kind !== 'forge') throw new Error('forge attendue')
        for (const o of reward.offer) if (o.op === 'engrave') expect(reach, `${id}, graine ${k}`).toContain(o.skill.id)
      }
    }
  })

  it('un acte : une récompense par combat normal gagné, dans l’ordre de REWARDS, le boss au dernier nœud, sa défaite gagne la partie', () => {
    let run = startRun('gorak', 12)
    const rewarded: string[] = []
    while (!isBossNode(run)) {
      run = withFightResult(run, encounter, won)
      expect(run.outcome).toBeUndefined()
      expect(run.reward).toBeDefined()
      rewarded.push(run.reward!.kind)
      const gain = rewardChoice(run.reward!)
      expect(gain).toBeDefined()
      run = withReward(run, gain)
      expect(run.reward).toBeUndefined()
    }
    expect(rewarded).toEqual([...REWARDS])
    expect(run.wins).toBe(ACT_FIGHTS)
    // Les gains sont les choix appliqués, dans l'ordre : quatre forges et six reliques différentes
    expect(run.gains.filter((g) => g.kind === 'forge').map((g) => g.kind === 'forge' && g.step)).toEqual(run.forge)
    expect(run.gains.filter((g) => g.kind === 'relic').map((g) => g.kind === 'relic' && g.relic)).toEqual(run.relics)
    expect(run.forge).toHaveLength(4)
    expect(new Set(run.relics).size).toBe(6)
    expect(run.relics.every((r) => RELIC_IDS.includes(r))).toBe(true)
    expect(championOf(run).forge).toEqual(run.forge)
    const end = withFightResult(run, bossEncounter, won)
    expect(end).toMatchObject({ outcome: 'won', wins: ACT_LENGTH, fights: { length: ACT_LENGTH } })
    expect(end.fights[ACT_FIGHTS]).toMatchObject({ opponentId: BOSS.id, boss: true, won: true })
    expect(end.reward).toBeUndefined()
  })

  it('le champion de référence reçoit les récompenses déjà gagnées au nœud : aucune au premier, toutes au boss', () => {
    const [first] = referenceChampions('gorak', 0, 4)
    expect(first.forge).toEqual([])
    expect(first.relics).toEqual([])
    for (const ref of referenceChampions('gorak', ACT_FIGHTS, 4)) {
      expect(ref.forge).toHaveLength(REWARDS.filter((k) => k === 'forge').length)
      expect(ref.relics).toHaveLength(REWARDS.filter((k) => k === 'relic').length)
    }
  })

  it('une défaite termine la partie sans avancer ; la perte du boss aussi', () => {
    const rewarded = withFightResult(startRun('gorak', 3), encounter, won)
    const first = withReward(rewarded, rewardChoice(rewarded.reward!))
    const end = withFightResult(first, encounter, lost)
    expect(end).toMatchObject({ outcome: 'lost', wins: 1 })
    expect(end.fights.map((f) => f.won)).toEqual([true, false])
    expect(end.reward).toBeUndefined()
    expect(withFightResult({ ...first, wins: ACT_FIGHTS }, bossEncounter, lost)).toMatchObject({ outcome: 'lost', wins: ACT_FIGHTS })
  })

  it('héritage : les reliques et les opérations valides seules sur le dé d’origine', () => {
    const graveBreath = ENGRAVABLE_SKILLS.find((e) => e.id === 'grave-breath')!
    let run = startRun('gorak', 5)
    run = withReward(run, { kind: 'forge', step: { op: 'gild', face: 5 } })
    run = withReward(run, { kind: 'relic', relic: 'wolf-fang' })
    // La Furie des vents (le 1) copiée sur la face libre de plus petit numéro (Pourfendre est sur le 2, le 5 est doré) : le 3
    run = withReward(run, { kind: 'forge', step: { op: 'copy', face: 1 } })
    run = withReward(run, { kind: 'forge', step: { op: 'engrave', face: 4, skill: fear } })
    run = withReward(run, { kind: 'relic', relic: 'mercenary-mail' })
    run = withReward(run, { kind: 'forge', step: { op: 'engrave', face: 6, skill: graveBreath } })
    // Aiguiser une gravure : seule sur le dé d'origine, le 6 ne porte rien
    run = withReward(run, { kind: 'forge', step: { op: 'sharpen', face: 6 } })
    // Aiguiser une compétence d'origine (la signature, sur le 1) : vaut seule ; tremper l'arme aussi
    run = withReward(run, { kind: 'forge', step: { op: 'sharpen', face: 1 } })
    run = withReward(run, { kind: 'forge', step: { op: 'temper' } })
    expect(heritableGains(run)).toEqual([
      { kind: 'forge', step: { op: 'gild', face: 5 } },
      { kind: 'relic', relic: 'wolf-fang' },
      { kind: 'forge', step: { op: 'copy', face: 1 } },
      { kind: 'forge', step: { op: 'engrave', face: 4, skill: fear } },
      { kind: 'relic', relic: 'mercenary-mail' },
      { kind: 'forge', step: { op: 'engrave', face: 6, skill: graveBreath } },
      { kind: 'forge', step: { op: 'sharpen', face: 1 } },
      { kind: 'forge', step: { op: 'temper' } },
    ])
  })

  it('héritage choisi au départ : il équipe le champion, sans entrer dans les gains ; une forge impossible est refusée', () => {
    const engraved = startRun('gorak', 7, { kind: 'forge', step: { op: 'engrave', face: 4, skill: fear } })
    expect(engraved).toMatchObject({ forge: [{ op: 'engrave', face: 4 }], relics: [], gains: [] })
    expect(championOf(engraved).events.some((e) => e.id === 'fear')).toBe(true)
    expect(heritableGains(engraved)).toEqual([])
    const relic = startRun('gorak', 7, { kind: 'relic', relic: 'wolf-fang' })
    expect(relic).toMatchObject({ forge: [], relics: ['wolf-fang'], gains: [] })
    // Dorer la face de la signature : refusé (une dorure ne vise qu'une face de coup)
    expect(() => startRun('gorak', 7, { kind: 'forge', step: { op: 'gild', face: 1 } })).toThrow()
  })

  it('sauvegarde de l’héritage : les gains d’une partie remplacent ceux du personnage ; une partie sans gain n’efface rien', () => {
    const stored = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => stored.get(k) ?? null,
      setItem: (k: string, v: string) => void stored.set(k, v),
    })
    try {
      const first = withReward(startRun('gorak', 1), { kind: 'relic', relic: 'wolf-fang' })
      recordHeritage(first)
      expect(loadHeritage()).toEqual({ gorak: [{ kind: 'relic', relic: 'wolf-fang' }] })
      // Une partie sans gain : rien n'est effacé
      recordHeritage(startRun('gorak', 3))
      expect(loadHeritage().gorak).toEqual([{ kind: 'relic', relic: 'wolf-fang' }])
      recordHeritage(withReward(startRun('gorak', 4), { kind: 'relic', relic: 'mercenary-mail' }))
      recordHeritage(withReward(startRun('brokk', 4), { kind: 'relic', relic: 'wolf-fang' }))
      expect(loadHeritage()).toEqual({ gorak: [{ kind: 'relic', relic: 'mercenary-mail' }], brokk: [{ kind: 'relic', relic: 'wolf-fang' }] })
      // Un héritage de la 0.111.0 : une gravure sur le 2, où est maintenant Pourfendre (0.112.0), est écartée
      stored.set('battler:campaign-heritage:v1', JSON.stringify({ gorak: [{ kind: 'forge', step: { op: 'engrave', face: 2, skill: fear } }, { kind: 'relic', relic: 'wolf-fang' }] }))
      expect(loadHeritage()).toEqual({ gorak: [{ kind: 'relic', relic: 'wolf-fang' }] })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('partie enregistrée (0.111.0, 0.112.0) : une forge qui ne vaut plus sur le dé de campagne, au champion ou chez un adversaire proposé, fait oublier la partie', () => {
    const stored = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => stored.get(k) ?? null,
      setItem: (k: string, v: string) => void stored.set(k, v),
      removeItem: (k: string) => void stored.delete(k),
    })
    try {
      const run = startRun('gorak', 2)
      const save = (r: unknown) => stored.set('battler:campaign:v4', JSON.stringify(r))
      save({ ...run, encounters: [{ characterId: 'brokk', maxHp: 40, forge: [{ op: 'gild', face: 6 }], relics: [], chance: 0.5 }] })
      expect(loadRun()).not.toBeNull()
      // Une gravure sur le 2 de Gorak (nu en 0.111.0) : Pourfendre y est depuis la 0.112.0
      save({ ...run, forge: [{ op: 'engrave', face: 2, skill: fear }] })
      expect(loadRun()).toBeNull()
      // Graver le 1 de Brokk, où sont maintenant ses Épines
      save({ ...run, encounters: [{ characterId: 'brokk', maxHp: 40, forge: [{ op: 'engrave', face: 1, skill: fear }], relics: [], chance: 0.5 }] })
      expect(loadRun()).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
