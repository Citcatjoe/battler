/*
 * Test de fumée : chaque écran se rend sans erreur avec de vraies données (combat réel,
 * statuts variés, tournoi en cours). Rendu côté serveur : les effets ne s'exécutent pas.
 */
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ARENAS, RANDOM_ARENA } from '../game/arenas'
import { simulateCombat, type CombatResult } from '../game/combat'
import { seededRng } from '../game/rng'
import { CHARACTER_IDS, createCharacter, ENGRAVABLE_SKILLS } from '../game/roster'
import { ACT_FIGHTS, BOSS, championOf, startRun, type Encounter, type PendingReward } from '../game/campaign'
import { Character } from '../game/character'
import { CampaignScreen } from './CampaignScreen'
import { STATUS_IDS } from '../game/statuses'
import { fxFloats, type Float, type FxSpec } from '../game/staging'
import { attackSpecials, isSurcharge, relicSpecial, SPECIAL_SIGNS, SPECIAL_SOURCES, statusSpecial } from '../game/specials'
import { isAura, STATUSES, type StatusId } from '../game/statuses'
import { EMOJI, testCharacter } from '../game/test-utils'
import { allMatches, championRun, createTournament, fillSlots, matchFighters, matchKey, SLOTS, withResult } from '../game/tournament'
import { BracketScreen } from './BracketScreen'
import { ChampionScreen } from './ChampionScreen'
import { CheatPad } from './CheatPad'
import { CharacterSheet } from './compendium/CharacterSheet'
import { CompendiumScreen } from './compendium/CompendiumScreen'
import { COMPENDIUM_SECTIONS } from './compendium/sections'
import { SkillsSection } from './compendium/SkillsSection'
import { StatusesSection } from './compendium/StatusesSection'
import { sheetStatuses, skillCatalog, statusCatalog } from '../game/catalog'
import { EndScreen } from './EndScreen'
import { Fighter } from './Fighter'
import { FightScreen } from './FightScreen'
import { TestFightScreen } from './TestFightScreen'
import { HpBar } from './HpBar'
import { StatusTray, trayAfter } from './StatusTray'
import { SkillBar } from './SkillBar'
import { DieBuild, dieCells } from './DieBuild'
import { offerTargets } from '../game/forge'
import { STATES, STATUS_PLACE, trayStates } from '../game/states'
import { skillIcon, STATE_ICON, statusIcon } from './Icon'
import { RelicCard } from './RelicSeal'
import { SeasonReport } from './CombatReport'
import { getRelic, RELICS } from '../game/relics'
import { MatchupScreen } from './MatchupScreen'
import { RecordsScreen } from './RecordsScreen'
import { StartScreen } from './StartScreen'
import { HomeScreen } from './HomeScreen'
import { TournamentSetupScreen } from './TournamentSetupScreen'
import { SeasonScreen } from './SeasonScreen'
import { createSeasonTournament, DEFAULT_SEASON_SIZE, pendingOfDay, simulateSeasonMatches } from '../game/season'
import { BetSummary, BetsResult, BettingDesk, Standings, type BetsOutcome } from './Betting'
import { createWallets, placeBet, placeBotBets, priceMatch, settleMatch, worthOf, type MatchOdds } from '../game/betting'

const noop = () => {}
const fighters = [createCharacter('gorak'), createCharacter('brokk')] as [
  ReturnType<typeof createCharacter>,
  ReturnType<typeof createCharacter>,
]
const result = simulateCombat(fighters, { rng: seededRng(9) })
/** Les textes flottants d'un effet à côté d'un combattant, avec leur clé (comme les pose le lecteur) */
const floatsOf = (fx: FxSpec, side: 0 | 1) => fxFloats(fx, side).map((f, key) => ({ key, ...f }) as Float)

// Combat qui se termine par un poison, sans coup final du vainqueur
const poisoned: CombatResult = simulateCombat(
  [
    testCharacter('a', { maxHp: 50 }, [
      {
        id: 'p',
        name: 'Venin',
        trigger: 'combatStart',
        effects: [{ type: 'applyStatus', status: 'poison', stacks: 30, target: 'opponent' }],
      },
    ]),
    testCharacter('b'),
  ],
  { rng: seededRng(1) },
)

/** Rend un écran et vérifie qu'il n'affiche aucun emoji (icônes peintes seulement). */
const render = (node: React.ReactNode) => {
  const html = renderToString(node)
  expect(html.length).toBeGreaterThan(100)
  expect(html.match(EMOJI)?.[0], 'emoji affiché').toBeUndefined()
}

describe('écrans', () => {
  it('accueil, sélection, affrontement, combat, fin', () => {
    for (const progress of [null, '3 / 15'])
      render(<HomeScreen onChoose={noop} onOpenRecords={noop} onOpenCompendium={noop} tournamentProgress={progress} campaignProgress={progress} />)
    render(
      <StartScreen
        initial={fighters}
        mode="duel"
        onHome={noop}
        onStart={noop}
        onOpenCharacter={noop}
        onOpenRecords={noop}
        onOpenCompendium={noop}
        tournamentProgress={null}
        onNewTournament={noop}
        onResumeTournament={noop}
      />,
    )
    render(
      <StartScreen
        initial={fighters}
        mode="tournament"
        onHome={noop}
        onStart={noop}
        onOpenCharacter={noop}
        onOpenRecords={noop}
        onOpenCompendium={noop}
        tournamentProgress="3 / 15"
        onNewTournament={noop}
        onResumeTournament={noop}
      />,
    )
    for (const arena of [...ARENAS.map((a) => a.id), RANDOM_ARENA])
      render(
        <MatchupScreen
          fighters={fighters}
          arena={arena}
          onArenaChange={noop}
          onPlay={noop}
          onSimulate={noop}
          onBack={noop}
        />,
      )
    for (const arena of ARENAS) render(<FightScreen script={result} arena={arena} onEnd={noop} />)
    // Paris : écran d'affrontement, guichet (avec et sans coup de théâtre), écran de fin avec classement
    const odds = priceMatch(fighters, 'test', 40)
    const names: [string, string] = [fighters[0].name, fighters[1].name]
    const bet = placeBet(placeBotBets(createWallets(), odds), odds, 0, { market: 'winner', side: 0 }, 100)
    if (!bet.ok) throw new Error(bet.reason)
    const wallets = bet.wallets
    const betting = { wallets, odds, onBet: () => null, onCancel: noop }
    render(<MatchupScreen fighters={fighters} arena={ARENAS[0].id} onArenaChange={noop} onPlay={noop} onSimulate={noop} onBack={noop} betting={betting} />)
    render(<MatchupScreen fighters={fighters} arena={ARENAS[0].id} onArenaChange={noop} onPlay={noop} onSimulate={noop} onBack={noop} betting={{ ...betting, odds: null }} />)
    // Rang au-dessus du nom : un badge, son chiffre seul, sans texte autour ; aucun badge pour un opposant sans rang
    const ranked = renderToString(
      <MatchupScreen
        fighters={fighters}
        ranks={[12, null]}
        arena={RANDOM_ARENA}
        onArenaChange={noop}
        onPlay={noop}
        onSimulate={noop}
        onBack={noop}
      />,
    )
    expect(ranked.match(/class="matchup-rank"/g)).toHaveLength(1)
    expect(ranked).toContain('<span class="matchup-rank-num">12</span>')
    const twists: MatchOdds[] = [
      odds,
      { ...odds, twist: { kind: 'boost', pick: { market: 'duration', over: true } } },
      { ...odds, twist: { kind: 'doubleStakes' } },
      { ...odds, twist: { kind: 'jackpot' } },
    ]
    for (const o of twists) {
      render(<BettingDesk wallets={wallets} odds={o} fighters={fighters} onBet={() => null} onCancel={noop} onClose={noop} onReset={noop} />)
      render(<BetSummary wallets={wallets} odds={o} fighterNames={names} />)
    }
    render(<BettingDesk wallets={wallets} odds={null} fighters={fighters} onBet={() => null} onCancel={noop} onClose={noop} />)
    render(<Standings wallets={wallets} />)
    const outcome = (r: CombatResult): BetsOutcome => {
      const { wallets: next, entries } = settleMatch(wallets, odds, r)
      const ids = next.bettors.map((_, i) => i)
      return { entries, bettors: next.bettors, before: ids.map((b) => worthOf(wallets, b)), after: ids.map((b) => worthOf(next, b)), line: odds.line, twist: { kind: 'jackpot' } }
    }
    render(<BetsResult outcome={outcome(result)} fighterNames={names} />)
    render(<EndScreen result={result} onReplay={noop} onMenu={noop} bets={outcome(result)} />)
    render(<EndScreen result={result} onReplay={noop} onMenu={noop} bets={outcome({ ...result, forcedRolls: { 0: 1 } })} tournament={{ label: 'x', onContinue: noop }} />)
    // Combat test : l'écran, et le pavé de chaque camp (dé attendu, pièce attendue, en attente, plus de dé)
    render(<TestFightScreen initial={['gorak', 'elaria']} onMenu={noop} />)
    render(<FightScreen script={result} arena={null} onEnd={noop} test={{ toolbar: null }} />)
    for (const cheat of [
      { available: true, rank: 3, next: { side: 0 as const, faces: 8, coin: false }, count: 2, waiting: true },
      { available: true, rank: 3, next: { side: 1 as const, faces: 2, coin: true }, count: 0, waiting: true },
      { available: true, rank: 3, next: { side: 1 as const, faces: 10, coin: false }, count: 0, waiting: false },
      { available: true, rank: 40, count: 1, waiting: false },
    ])
      for (const side of [0, 1] as const)
        render(<CheatPad side={side} fighter={result.fighters[side]} cheat={cheat} onForce={noop} />)
    for (const tab of ['report', 'summary', 'defense', 'events', 'dice'] as const)
      render(<EndScreen result={result} onReplay={noop} onMenu={noop} initialTab={tab} />)
    render(<EndScreen result={poisoned} onReplay={noop} onMenu={noop} tournament={{ label: 'x', onContinue: noop }} />)
  })

  it('combattant avec postures : chaque moment se rend', () => {
    const base = createCharacter('gorak')
    const posed = base.adjusted({})
    Object.assign(posed, { look: { ...base.look, poses: { attack: 'a.png', dodge: 'd.png', hurt: 'h.png', ko: 'k.png', victory: 'v.png' } } })
    for (const state of ['idle', 'ko', 'victory'] as const) render(<Fighter character={posed} side={0} state={state} />)
    render(<Fighter character={posed} side={1} lunging />)
    render(<Fighter character={posed} side={0} received={{ key: 1, damage: 5, crit: false, dodged: false, landed: true }} />)
    render(<Fighter character={posed} side={0} received={{ key: 1, damage: 0, crit: false, dodged: true, landed: false }} />)
    const html = renderToString(<Fighter character={posed} side={1} lunging />)
    expect(html).toContain('a.png')
  })

  it('passage de main et dé de compétence qui sort (en-tête)', () => {
    const on = renderToString(
      <>
        <HpBar side={0} name="A" hp={10} maxHp={20} character={fighters[0]} turn="active" />
        <SkillBar character={fighters[0]} side={0} statuses={[]} pulse={{ side: 0, face: 2, key: 1 }} />
      </>,
    )
    expect(on).toContain('data-turn="active"')
    // Un seul sceau s'allume : celui de la compétence de la face 2
    expect(on.split('skill-bar-wave').length - 1).toBe(1)
    const after = on.slice(on.indexOf('skill-bar-wave'))
    expect(after.match(/aria-label="Dé (\d)"/)?.[1]).toBe('2')
    const off = renderToString(<HpBar side={1} name="B" hp={10} maxHp={20} character={fighters[1]} turn="waiting" />)
    expect(off).toContain('data-turn="waiting"')
    expect(off).not.toContain('skill-bar-wave')
  })

  it('dé face par face (affrontement) : toutes les faces du dé, dans l’ordre, la forge lue sur ses faces', () => {
    const gorak = createCharacter('gorak')
    const cells = dieCells(gorak)
    expect(cells.map((c) => c.face)).toEqual(Array.from({ length: gorak.stats.damageDie }, (_, k) => k + 1))
    expect(cells.slice(0, 3).every((c) => c.event)).toBe(true)
    expect(cells.slice(3).some((c) => c.event)).toBe(false)
    // La forme du druide change son dé : un d3 sous forme humaine (Incantation), son dé entier sous l'ours
    const thaldrin = createCharacter('thaldrin')
    expect(dieCells(thaldrin, 0)).toHaveLength(3)
    expect(dieCells(thaldrin, 1)).toHaveLength(thaldrin.stats.damageDie)
    // La forge se lit sur ses faces : la dorure, le rang de la compétence aiguisée
    const sharp = offerTargets(gorak.definition, [], { op: 'sharpen' })[0]
    const forged = gorak.withForge([{ op: 'gild', face: 5 }, { op: 'sharpen', face: sharp }])
    const f = dieCells(forged)
    expect(f[4].gild).toBeGreaterThan(0)
    expect(f[sharp - 1].rank).toBe(1)
    const build = renderToString(<DieBuild character={forged} />)
    expect(build).toContain('die-slot-rank')
    expect(build).toContain('aria-label="Face 4"')
    expect(build.match(/data-gild=""/g)).toHaveLength(1)
    // Une face dorée porte son bonus au cartouche, lu dans la donnée
    expect(build).toContain(`<span class="die-slot-num">+${f[4].gild}</span>`)
    // Toujours douze emplacements : ceux au-delà de la taille du dé, grisés
    expect(build.match(/<li class="die-slot[ "]/g)).toHaveLength(12)
    expect(build.match(/data-empty=""/g)).toHaveLength(12 - gorak.stats.damageDie)
    // Une face gravée par la forge est une face forgée (cadre d'or)
    const foreign = ENGRAVABLE_SKILLS.find((e) => !gorak.events.some((own) => own.id === e.id))!
    const engraved = gorak.withForge([{ op: 'engrave', face: 5, skill: foreign }])
    expect(renderToString(<DieBuild character={engraved} />).match(/data-forged=""/g)).toHaveLength(1)
    // Au-delà de douze faces : douze emplacements, et « +N faces » en tête
    const big = createCharacter('morgrut').withForge([{ op: 'enlarge' }])
    const bigBuild = renderToString(<DieBuild character={big} />)
    expect(bigBuild.match(/<li class="die-slot[ "]/g)).toHaveLength(12)
    expect(bigBuild).toContain('matchup-section-more')
    expect(bigBuild).not.toContain('data-empty')
    // Le druide : un sélecteur de forme du kit dans l'en-tête du dé
    expect(renderToString(<DieBuild character={thaldrin} />)).toContain('bt-segmented')
  })

  it('fiche d’affrontement : six places de reliques, « +N » au-delà, « Aucune relique » sans', () => {
    const many = createCharacter('ervald').withRelics(RELICS.slice(0, 10))
    const html = renderToString(
      <MatchupScreen fighters={[createCharacter('gorak'), many]} arena={RANDOM_ARENA} onArenaChange={() => {}} onPlay={() => {}} onSimulate={() => {}} onBack={() => {}} />,
    )
    expect(html).toContain('Aucune relique')
    expect(html.match(/class="group\/relic/g)).toHaveLength(6)
    expect(html).toContain('matchup-relics-more')
    // Les deux fiches, et le sélecteur d'arène avec son index au lieu des points
    expect(html.match(/class="matchup-card/g)).toHaveLength(2)
    expect(html).toContain('matchup-arena-index')
  })

  it('zone de compétence du combat : le dé qui roule allume brièvement le sceau de la face montrée, sans éclat', () => {
    const gorak = createCharacter('gorak')
    // Le 2 de Gorak est une face de compétence ; le 5, une face simple sans sceau
    const rolling = renderToString(<SkillBar character={gorak} side={0} statuses={[]} rolling={[2]} />)
    expect(rolling.match(/is-rolled/g)).toHaveLength(1)
    expect(rolling).not.toContain('skill-bar-wave')
    expect(renderToString(<SkillBar character={gorak} side={0} statuses={[]} rolling={[5]} />)).not.toContain('is-rolled')
  })

  it("zone de surcharge : n'y entrent que les statuts qui changent ce coup-ci, sans aura ni action déclenchée (registre unique)", () => {
    const surcharges = STATUS_IDS.filter(isSurcharge).sort()
    // Critique et esquive imposés, bouclier, modificateurs qui s'usent sur le coup, réactions au coup. Pas d'aura
    // (agit à chaque coup), pas de modificateur durable (Affaibli, Force de l'ours), pas de Pile ou face ni de Furie
    expect(surcharges).toEqual(['bleed', 'bonusArmor', 'evasion', 'falseNote', 'firefly', 'guaranteedCrit', 'lifesteal', 'riposte', 'thorns'].sort())
    for (const id of STATUS_IDS) {
      const def = STATUSES[id]
      if (def.coinToss || def.extraStrikes || isAura(id)) expect(isSurcharge(id), def.name).toBe(false)
    }
    // Une couleur par source, jamais la même pour deux sources ; le son suit le signe (SONS.md § 4.4)
    const sources = Object.values(SPECIAL_SOURCES)
    expect(new Set(sources.map((s) => s.bg)).size).toBe(sources.length)
    for (const s of [...sources, ...Object.values(SPECIAL_SIGNS)]) expect(s.name).not.toMatch(EMOJI)
    expect(SPECIAL_SIGNS.plus.cue).toBe('coinWin')
    expect(SPECIAL_SIGNS.minus.cue).toBe('debuff')
  })

  it("zone de surcharge : le signe se lit du point de vue de l'attaquant", () => {
    const spec = (id: StatusId, bearer: 'attacker' | 'defender', amount?: number) => {
      const s = statusSpecial(id, bearer, amount)!
      return `${s.label} [${s.source} ${s.sign}]`
    }
    // Ce qui amplifie l'action de l'attaquant : son bonus, ou un malus du défenseur
    expect(spec('guaranteedCrit', 'attacker')).toBe('Critique assuré [strike plus]')
    expect(spec('lifesteal', 'attacker', 5)).toBe('Vol de vie +5 [skill plus]')
    expect(spec('bleed', 'defender', 2)).toBe('Saignement +2 [skill plus]')
    expect(spec('firefly', 'defender', 2)).toBe('Luciole +2 [skill plus]')
    // Ce qui la réduit ou la contre : un bonus du défenseur, ou un malus de l'attaquant
    expect(spec('evasion', 'defender')).toBe('Esquive assurée [skill minus]')
    expect(spec('bonusArmor', 'defender', -6)).toBe('Armure temporaire −6 [skill minus]')
    expect(spec('riposte', 'defender', 3)).toBe('Riposte −3 [skill minus]')
    expect(spec('thorns', 'defender')).toBe('Épines acérées [skill minus]')
    expect(spec('falseNote', 'attacker', -10)).toBe('Fausse note −10 [skill minus]')
    // Le même statut change de signe avec son porteur ; une aura n'a jamais de label
    expect(statusSpecial('lifesteal', 'defender')?.sign).toBe('minus')
    expect(statusSpecial('powerAura', 'attacker', 2)).toBeUndefined()
    // Une relique qui se déclenche : + pour l'attaquant, − pour le défenseur
    expect(relicSpecial('wolf-fang', 'Dent de loup', 'attacker').sign).toBe('plus')
    expect(relicSpecial('bramble-collar', 'Collier de ronces', 'defender').sign).toBe('minus')
  })

  it("zone de surcharge d'un coup : dans l'ordre du livre de règles, sans modificateur d'aura", () => {
    const base = simulateCombat([createCharacter('gorak'), createCharacter('brokk')], { seed: 1 }).beats.find((b) => b.type === 'attack')!
    if (base.type !== 'attack') throw new Error('coup attendu')
    const attack = {
      ...base.attack,
      dodged: false,
      forfeited: false,
      crit: true,
      critForced: true,
      critBy: 'guaranteedCrit',
      critMultiplier: 2,
      relicBonus: [{ relic: 'four-nail-shoe', name: 'Fer à quatre clous', amount: 4 }],
      modifiers: [
        { status: 'powerAura', by: 'attacker', delta: 2 },
        { status: 'firefly', by: 'defender', delta: 2 },
        { status: 'falseNote', by: 'attacker', delta: -10, final: true },
      ],
      shields: [{ status: 'bonusArmor', absorbed: 6 }],
    } satisfies typeof base.attack
    const { roll, crit, impact } = attackSpecials(attack)
    const show = (list: typeof roll) => list.map((s) => `${s.label} ${s.sign}`)
    expect(show(roll)).toEqual(['Fer à quatre clous +4 plus'])
    expect(show(crit)).toEqual(['Critique assuré plus', 'Critique ×2 plus'])
    expect(show(impact)).toEqual(['Luciole +2 plus', 'Armure temporaire −6 minus', 'Fausse note −10 minus'])
    // Esquive imposée : elle annule le reste du coup
    const dodged = attackSpecials({ ...base.attack, dodged: true, dodgeForced: true, dodgeBy: 'evasion', forfeited: false, crit: false, critForced: false, relicBonus: undefined, modifiers: [], shields: [] })
    expect(show([...dodged.roll, ...dodged.crit, ...dodged.impact])).toEqual(['Esquive assurée minus'])
    // Sur tout le roster : aucun emoji, et un coup sacrifié n'a aucune surcharge
    for (const x of CHARACTER_IDS)
      for (const beat of simulateCombat([createCharacter(x), createCharacter('brokk')], { seed: 2 }).beats) {
        if (beat.type !== 'attack') continue
        const all = Object.values(attackSpecials(beat.attack)).flat()
        for (const s of all) expect(s.label).not.toMatch(EMOJI)
        if (beat.attack.forfeited) expect(all).toEqual([])
      }
  })

  it("chaque compétence montre sa vraie icône (pas l'étoile générique) dans son sceau", () => {
    for (const id of CHARACTER_IDS)
      for (const e of createCharacter(id).events) expect(skillIcon(e), `${e.name} (${e.id}) : icône du sceau`).not.toBe('event')
  })

  it("la Peur fait trembler le conteneur, pas l'image (centrée par sa propriété translate)", () => {
    const html = renderToString(<Fighter character={createCharacter('naraxes')} side={0} statuses={[{ id: 'fear', stacks: 1 }]} />)
    expect(html).toContain('status-tremble')
    expect(html.match(/<img[^>]*status-tremble/), 'tremblement sur l’image').toBeNull()
  })

  it('une toile avec du vide sous les pieds est redescendue (voleuse)', () => {
    const naraxes = createCharacter('naraxes')
    expect(naraxes.look.footroom).toBeGreaterThan(0)
    expect(renderToString(<Fighter character={naraxes} side={0} />)).toMatch(/bottom:-\d/)
  })

  it('compendium, fiches et statistiques', () => {
    const nav = { go: noop, openRecords: noop }
    for (const section of COMPENDIUM_SECTIONS)
      render(<CompendiumScreen section={section.id} characterId="gorak" onNavigate={noop} onBack={noop} />)
    for (const id of CHARACTER_IDS) {
      render(<CharacterSheet characterId={id} nav={nav} />)
      render(<CharacterSheet characterId={id} nav={nav} initialTab="performance" />)
    }
    // Chaque statut de la section Statuts et chaque compétence ont leur fiche détaillée
    for (const e of sheetStatuses()) render(<StatusesSection nav={nav} focus={e.id} filter="" />)
    for (const s of skillCatalog().flatMap((f) => f.skills)) render(<SkillsSection nav={nav} focus={s.event.id} filter="" />)
    render(<RecordsScreen onOpenCharacter={noop} onBack={noop} />)
  })

  it('les sections Compétences et Statuts ne nomment aucun porteur (ni personnage, ni race)', () => {
    const names = CHARACTER_IDS.map((id) => createCharacter(id).name)
    const pages = [
      ...skillCatalog().flatMap((f) => f.skills).map((s) => renderToString(<SkillsSection nav={{ go: noop }} focus={s.event.id} filter="" />)),
      ...sheetStatuses().map((e) => renderToString(<StatusesSection nav={{ go: noop }} focus={e.id} filter="" />)),
    ]
    for (const html of pages) for (const name of [...names, 'Orcs', 'Humains', 'Porteur']) expect(html).not.toContain(name)
  })

  it('tout statut en jeu a une icône peinte', () => {
    for (const e of statusCatalog()) if (e.inGame) expect(statusIcon(e.id), e.id).toBeDefined()
  })

  it("un statut de la zone d'état montre partout l'emblème de son état, pas l'icône de la compétence qui le pose", () => {
    for (const e of statusCatalog()) {
      const place = STATUS_PLACE[e.id]
      if (e.inGame && place.place === 'tray') expect(statusIcon(e.id), e.id).toBe(STATE_ICON[place.relays[0].state])
    }
    // Œil de faucon garde sa cible ; le Critique assuré qu'il pose montre la pièce gravée
    expect(skillIcon(createCharacter('elaria').events.find((e) => e.id === 'hawk-eye')!)).toBe('crit')
    expect(statusIcon('guaranteedCrit')).toBe('state-sure-crit')
  })

  it("la section Statuts ne liste que les statuts en jeu de la zone d'état : une aura ou un mécanisme appartient à sa compétence", () => {
    const html = renderToString(<StatusesSection nav={{ go: noop }} filter="" />)
    for (const e of statusCatalog()) {
      const listed = html.includes(`>${e.def.name.replace(/'/g, '&#x27;')}<`)
      expect(listed, e.id).toBe(e.inGame && STATUS_PLACE[e.id].place === 'tray')
    }
  })

  it('la fiche d’une compétence porte son aura ou son mécanisme', () => {
    const sheet = (id: string) => renderToString(<SkillsSection nav={{ go: noop }} focus={id} filter="" />).replace(/&#x27;/g, "'")
    // Aura de sainteté : sa vie, son plafond et ce qui la retire
    const holy = sheet('holy-aura')
    for (const text of ["jusqu'à la fin du combat", '3 charges au plus', 'Peut être retirée par Purification']) expect(holy).toContain(text)
    // Aura de puissance : la relique qui la pose aussi ; Aura mélodieuse : l'autre compétence qui la pose
    expect(sheet('power-aura')).toContain('Clepsydre du siège')
    expect(sheet('melodious-aura')).toContain('Ouverture')
    // Rétribution : la règle de ses jauges, que sa description ne dit pas
    expect(sheet('retribution')).toContain('range ses dégâts dans une des 3 jauges')
  })

  it('tournoi', () => {
    const slots = fillSlots(Array(SLOTS).fill(null), CHARACTER_IDS, seededRng(3))
    const betting = { enabled: true, names: ['karma', 'MiaMiaM'] as [string, string] }
    const season = { enabled: false, size: DEFAULT_SEASON_SIZE }
    const setup = renderToString(
      <TournamentSetupScreen slots={slots} onChange={noop} onValidate={noop} onBack={noop} betting={betting} onBettingChange={noop} relics onRelicsChange={noop} forge onForgeChange={noop} uniqueNames={false} onUniqueNamesChange={noop} season={season} onSeasonChange={noop} />,
    )
    expect(setup).toContain('role="switch" aria-checked="true"')
    // Le panneau « Règles » : tous les réglages, nombre de combattants compris
    for (const label of ['Règles', 'Phase de saison', 'Nombre de combattants', 'Forge du dé', 'Reliques', 'Noms uniques']) expect(setup).toContain(label)
    // Sans saison, la forge du dé ne s'actionne pas, et l'arbre se remplit à la main
    expect(setup).toContain('Avec la saison')
    expect(setup).toContain('Compléter')
    expect(setup).not.toContain('de la saison</span>')
    const setupOff = renderToString(
      <TournamentSetupScreen slots={Array(SLOTS).fill(null)} onChange={noop} onValidate={noop} onBack={noop} betting={{ ...betting, enabled: false }} onBettingChange={noop} relics={false} onRelicsChange={noop} forge={false} onForgeChange={noop} uniqueNames onUniqueNamesChange={noop} season={{ ...season, enabled: true }} onSeasonChange={noop} />,
    )
    expect(setupOff).toContain('Désactivées')
    // Avec la saison : l'arbre de 16 cases vides, chacune avec son rang de saison ; ni placement ni « Compléter », et le
    // lancement est toujours permis (les participants se tirent au lancement)
    expect(setupOff).toContain('1er de la saison')
    expect(setupOff).toContain('16e de la saison')
    expect(setupOff).not.toContain('Case vide')
    expect(setupOff).not.toContain('Compléter')
    const launchAt = setupOff.indexOf('Lancer la saison')
    expect(setupOff.slice(setupOff.lastIndexOf('<button', launchAt), launchAt)).not.toContain('disabled')
    expect(setupOff.match(EMOJI)?.[0]).toBeUndefined()
    // Phase de saison avec construction (reliques et forge) : classement, constructions et journée, sans emoji
    let s = createSeasonTournament(fillSlots(Array(20).fill(null), CHARACTER_IDS, seededRng(3)), (id) => createCharacter(id).name, { seed: 1, forge: true })
    s = simulateSeasonMatches(s, [...pendingOfDay(s.season!, 0), ...pendingOfDay(s.season!, 1)])
    const seasonHtml = renderToString(
      <SeasonScreen season={s.season!} running={null} onPlay={noop} onSimulateDay={noop} onSimulateSeason={noop} onStop={noop} onStartBracket={noop} onMenu={noop} />,
    )
    expect(seasonHtml).toContain('Constructions : 0 / 20 achevées')
    expect(seasonHtml).toContain('class="forge-face')
    // Le grand bouton « Combattre » : le prochain match de la journée en cours
    expect(seasonHtml).toContain('Combattre')
    expect(seasonHtml.match(EMOJI)?.[0]).toBeUndefined()
    let t = createTournament(slots, (id) => createCharacter(id).name)
    t = withResult(
      t,
      { round: 0, index: 0 },
      simulateCombat(matchFighters(t, { round: 0, index: 0 }), { rng: seededRng(4) }),
    )
    render(<BracketScreen tournament={t} onPlay={noop} onSimulate={noop} onChampion={noop} onNewTournament={noop} onMenu={noop} />)
    render(<BracketScreen tournament={t} onPlay={noop} onSimulate={noop} onChampion={noop} onNewTournament={noop} onMenu={noop} wallets={createWallets()} />)
    // Tournoi complet : l'arbre terminé, puis l'écran du champion et son bilan cumulé
    let seed = 10
    for (const ref of allMatches()) if (!t.results[matchKey(ref)]) t = withResult(t, ref, simulateCombat(matchFighters(t, ref), { seed: seed++ }))
    const tree = renderToString(<BracketScreen tournament={t} onPlay={noop} onSimulate={noop} onChampion={noop} onNewTournament={noop} onMenu={noop} />)
    expect(tree.match(EMOJI)?.[0]).toBeUndefined()
    // Les reliques gagnées s'affichent dans l'arbre, sur les matchs des tours suivants
    for (const id of championRun(t)!.relics) expect(tree).toContain(`aria-label="${getRelic(id).name}"`)
    const run = championRun(t)!
    expect(run.matches).toHaveLength(4)
    expect(run.totals.damage).toBeGreaterThan(0)
    expect(run.totals.turns).toBe(run.matches.reduce((s, m) => s + m.turns, 0))
    render(<ChampionScreen run={run} onBracket={noop} onNewTournament={noop} onMenu={noop} />)
    render(<ChampionScreen run={run} onBracket={noop} onNewTournament={noop} onMenu={noop} wallets={createWallets()} />)
    expect(renderToString(<ChampionScreen run={run} onBracket={noop} onNewTournament={noop} onMenu={noop} />)).toContain('aria-label="Reliques"')
    // Tournoi sans reliques : l'arbre terminé ne montre aucun sceau
    let bare = createTournament(slots, (id) => createCharacter(id).name, { relics: false })
    for (const ref of allMatches()) bare = withResult(bare, ref, simulateCombat(matchFighters(bare, ref), { seed: seed++ }))
    expect(renderToString(<BracketScreen tournament={bare} onPlay={noop} onSimulate={noop} onChampion={noop} onNewTournament={noop} onMenu={noop} />)).not.toContain('aria-label="Reliques"')
    expect(renderToString(<ChampionScreen run={championRun(bare)!} onBracket={noop} onNewTournament={noop} onMenu={noop} />)).not.toContain('aria-label="Reliques"')
  })

  it('reliques : sceaux à côté du nom, charges en combat, récompense sur l’écran de victoire', () => {
    const holder = createCharacter('brokk').withRelics(RELICS)
    const draught = getRelic('bramble-collar')
    // En combat : la fiole a servi, son sceau s'éteint et sa pastille tombe à 0
    const hud = renderToString(<HpBar side={1} name="Brokk" hp={10} maxHp={holder.maxHp} character={holder} turn="active" relicUses={{ [draught.id]: 1 }} />)
    for (const r of RELICS) expect(hud).toContain(`aria-label="${r.name}"`)
    expect(hud).toContain('data-spent="true"')
    expect(hud).toContain('Dépensée pour ce combat')
    expect(hud.match(EMOJI)?.[0]).toBeUndefined()
    render(<MatchupScreen fighters={[holder, createCharacter('gorak')]} onPlay={noop} onSimulate={noop} onBack={noop} arena={RANDOM_ARENA} onArenaChange={noop} />)
    // Écran de victoire d'un match de tournoi : le bouton principal mène à la récompense
    const reward = { kind: 'relic' as const, offer: RELICS.slice(0, 3), chosen: RELICS[1].id, onChoose: noop }
    const end = renderToString(<EndScreen result={result} onReplay={noop} onMenu={noop} tournament={{ label: 'x', onContinue: noop, reward }} />)
    expect(end).toContain('Récompense')
    render(<RelicCard relic={draught} selected mark="Choix de Brokk" onSelect={noop} />)
  })

  it('rapport de combat (écran de victoire) et rapport de saison : reliques déclenchées, faces jouées', () => {
    const holder = createCharacter('brokk').withRelics(RELICS)
    const fight = simulateCombat([holder, createCharacter('fanchon')], { seed: 5 })
    const end = renderToString(<EndScreen result={fight} onReplay={noop} onMenu={noop} />)
    expect(end).toContain('aria-label="Rapport de combat"')
    expect(end).toContain('aria-label="Déclenchements des reliques"')
    expect(end).toContain(`aria-label="Faces jouées par ${holder.name}"`)
    expect(end).toContain('report-bar')
    expect(end.match(EMOJI)?.[0]).toBeUndefined()
    // Saison forgée, en partie jouée : le cumul de chaque participant, sa construction (reliques, dé forgé)
    let s = createSeasonTournament(fillSlots(Array(20).fill(null), CHARACTER_IDS, seededRng(3)), (id) => createCharacter(id).name, { seed: 1, forge: true })
    s = simulateSeasonMatches(s, [...pendingOfDay(s.season!, 0), ...pendingOfDay(s.season!, 1), ...pendingOfDay(s.season!, 2)])
    const report = renderToString(<SeasonReport season={s.season!} />)
    expect(report).toContain('aria-label="Rapport de saison"')
    expect(report).toContain('class="forge-face')
    expect(report).toContain('Reliques déclenchées')
    expect(report.match(EMOJI)?.[0]).toBeUndefined()
    // Une saison enregistrée avant les rapports (aucun `report`) s'affiche encore
    const old = { ...s.season!, results: Object.fromEntries(Object.entries(s.season!.results).map(([n, { report: _r, ...r }]) => [n, r])) }
    expect(renderToString(<SeasonReport season={old} />)).toContain('Aucun rapport')
  })

  it('tous les statuts et effets s’affichent', () => {
    const statuses = STATUS_IDS.map((id, i) => ({ id, stacks: i + 1, ...(i % 2 ? { turns: 2 } : {}) }))
    render(<HpBar side={0} name="x" hp={10} maxHp={20} />)
    render(<StatusTray states={trayStates(statuses, statuses)} cast={{ bearer: fighters[0], opponent: fighters[1] }} />)
    // Chaque état a son infobulle : nom, effet actuel, tours restants
    const tray = renderToString(<StatusTray states={trayStates([{ id: 'poison', stacks: 2, turns: 3 }], [])} />)
    expect(tray).toContain('role="tooltip"')
    expect(tray).toContain('Poison')
    expect(tray).toContain('3 tours restants')
    // Regroupés par moment : l'Aura d'intimidation adverse fait un Affaibli, qui dit d'où il vient ; la Fausse note,
    // qui ne gâche que le prochain coup, après l'armure, a son propre état
    const weak = renderToString(
      <StatusTray
        states={trayStates([{ id: 'falseNote', stacks: 1 }], [{ id: 'intimidationAura', stacks: 1 }])}
        cast={{ bearer: createCharacter('fanchon'), opponent: createCharacter('brokk') }}
      />,
    )
    expect(weak.match(/data-state="/g)).toHaveLength(2)
    expect(weak).toContain('Affaibli −2')
    expect(weak).toContain('Coup gâché −5')
    expect(weak).toContain('Aura d&#x27;intimidation (Brokk)')
    // L'en-tête : les sceaux des compétences, l'aura en anneau (active : il tourne), la face du dé en pastille
    const bar = renderToString(<SkillBar character={createCharacter('gorak')} side={0} statuses={[{ id: 'powerAura', stacks: 2 }]} />)
    expect(bar).toContain('data-signal="0:cleave"')
    expect(bar).toContain('data-signal="0:powerAura 0:power-aura"')
    expect(bar).toContain('aura-token')
    // L'anneau porte la valeur de l'aura : deux charges, +4 aux coups
    expect(bar).toContain('+4')
    expect(renderToString(<SkillBar character={createCharacter('gorak')} side={0} statuses={[]} />)).not.toContain('aura-token')
    expect(bar.match(EMOJI)?.[0]).toBeUndefined()
    const effects = [
      { type: 'heal' as const, target: 0 as const, amount: 3 },
      { type: 'damage' as const, target: 0 as const, amount: 2 },
      ...STATUS_IDS.map((status) => ({
        type: 'applyStatus' as const,
        target: 0 as const,
        status,
        stacks: 1,
        result: { kind: 'applied' as const, stacks: 1 },
      })),
      {
        type: 'applyStatus' as const,
        target: 0 as const,
        status: 'poison' as const,
        stacks: 1,
        result: { kind: 'blocked' as const, by: 'ward' as const },
      },
      { type: 'cleanse' as const, target: 0 as const, removed: [] },
    ]
    render(
      <Fighter
        character={fighters[0]}
        side={0}
        statuses={statuses}
        floats={floatsOf({ source: 0, title: 'Test', effects }, 0)}
      />,
    )
  })

  it('textes flottants : un malus posé monte, « Tour perdu » tombe, sans titre de compétence', () => {
    const fear = { type: 'applyStatus' as const, target: 1 as const, status: 'fear' as const, stacks: 1, result: { kind: 'applied' as const, stacks: 1 } }
    const posed = renderToString(<Fighter character={fighters[1]} side={1} floats={floatsOf({ source: null, title: '', effects: [fear] }, 1)} />)
    expect(posed).toMatch(/class="damage-float[^"]*"[^>]*>Peur</)
    const lost = renderToString(
      <Fighter
        character={fighters[1]}
        side={1}
        floats={floatsOf({ source: null, title: '', effects: [], notes: [{ target: 1, text: STATES.lostTurn.name, tone: 'negative', rises: false }] }, 1)}
      />,
    )
    expect(lost).toMatch(/class="damage-sink[^"]*"[^>]*>Tour perdu</)
    expect(lost).not.toContain('Peur')
    expect(lost).not.toContain('text-violet-300')
  })

  it('zone d’état : un état épuisé sort par son propre médaillon, et un état reposé pendant sa sortie ne se double pas', () => {
    const [poison] = trayStates([{ id: 'poison', stacks: 2 }], [])
    let items = trayAfter([], [poison])
    // Épuisé : le même médaillon reste, sortant (il montre son 0, puis s'efface)
    items = trayAfter(items, [])
    expect(items).toEqual([{ state: poison, leaving: true }])
    // Reposé pendant sa sortie : il reprend vie dans ce médaillon, sans second médaillon à côté
    const [again] = trayStates([{ id: 'poison', stacks: 3 }], [])
    items = trayAfter(items, [again])
    expect(items).toEqual([{ state: again, leaving: false }])
    // Un nouvel état s'ajoute après les autres, l'ordre est gardé
    items = trayAfter(items, trayStates([{ id: 'fear', stacks: 1 }, { id: 'poison', stacks: 3 }], []))
    expect(items.map((i) => i.state.id)).toEqual(['poison', 'lostTurn'])
  })

  it('campagne : chaque étape se rend, avec un dé forgé au-delà de ses faces d’origine', () => {
    const props = { heritage: {}, onStart: noop, onFight: noop, onReward: noop, onAbandon: noop, onNewRun: noop, onMenu: noop }
    // Un champion qui a déjà forgé : une gravure sur le 9, une dorure, et le boss en face
    let run = startRun('gorak', 5, { kind: 'relic', relic: 'wolf-fang' })
    run = { ...run, forge: [{ op: 'enlarge' }, { op: 'engrave', face: 10, skill: ENGRAVABLE_SKILLS.find((e) => e.id === 'fear')! }, { op: 'gild', face: 8 }] }
    const encounters: Encounter[] = [
      { characterId: 'brokk', maxHp: 44, chance: 0.8 },
      { characterId: 'ysolde', maxHp: 61, chance: 0.4 },
    ]
    render(<CampaignScreen {...props} run={null} />)
    render(<CampaignScreen {...props} run={null} heritage={Object.fromEntries(CHARACTER_IDS.map((id) => [id, [{ kind: 'relic' as const, relic: 'wolf-fang' }]]))} />)
    render(<CampaignScreen {...props} run={run} />)
    render(<CampaignScreen {...props} run={{ ...run, encounters }} />)
    render(<CampaignScreen {...props} run={{ ...run, wins: ACT_FIGHTS, encounters: [{ characterId: BOSS.id, maxHp: 90, boss: true, chance: 0.45 }] }} />)
    const forge: PendingReward = { kind: 'forge', offer: [{ op: 'gild' }, { op: 'trim' }, { op: 'sharpen' }], choice: { op: 'gild', face: 5 } }
    const relic: PendingReward = { kind: 'relic', offer: ['felt-boots', 'wolf-fang'], choice: 'felt-boots' }
    for (const reward of [forge, relic]) render(<CampaignScreen {...props} run={{ ...run, wins: 2, reward }} />)
    for (const outcome of ['won', 'lost'] as const) render(<CampaignScreen {...props} run={{ ...run, outcome, gains: [{ kind: 'relic', relic: 'felt-boots' }] }} />)
    // Le combat d'un champion forgé contre le boss : l'en-tête montre la compétence gravée sur le 10
    const pair: [Character, Character] = [championOf(run), new Character(BOSS)]
    const fight = renderToString(<FightScreen script={simulateCombat(pair, { seed: 3 })} arena={null} onEnd={noop} />)
    expect(fight).toContain('aria-label="Dé 10"')
    render(<MatchupScreen fighters={pair} onPlay={noop} onSimulate={noop} onBack={noop} arena={RANDOM_ARENA} onArenaChange={noop} />)
  })
})
