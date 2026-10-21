/*
 * Test de fumée : chaque écran se rend sans erreur avec de vraies données (combat réel,
 * statuts variés, tournoi en cours). Rendu côté serveur : les effets ne s'exécutent pas.
 */
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ARENAS, RANDOM_ARENA } from '../game/arenas'
import { simulateCombat, type CombatResult } from '../game/combat'
import { seededRng } from '../game/rng'
import { CHARACTER_IDS, createCharacter } from '../game/roster'
import { STATUS_IDS } from '../game/statuses'
import { fxFloats, turnLabel, type Float, type FxSpec } from '../game/staging'
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
import { StatusesSection } from './compendium/StatusesSection'
import { statusCatalog } from '../game/catalog'
import { EndScreen } from './EndScreen'
import { Fighter } from './Fighter'
import { FightScreen } from './FightScreen'
import { TestFightScreen } from './TestFightScreen'
import { HpBar } from './HpBar'
import { StatusTray, trayAfter } from './StatusTray'
import { SkillBar } from './SkillBar'
import { STATES, trayStates } from '../game/states'
import { skillIcon, STATUS_ICON } from './Icon'
import { RelicCard } from './RelicSeal'
import { getRelic, RELICS } from '../game/relics'
import { MatchupScreen } from './MatchupScreen'
import { RecordsScreen } from './RecordsScreen'
import { StartScreen } from './StartScreen'
import { HomeScreen } from './HomeScreen'
import { TournamentSetupScreen } from './TournamentSetupScreen'
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
      render(<HomeScreen onChoose={noop} onOpenRecords={noop} onOpenCompendium={noop} tournamentProgress={progress} />)
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
    for (const tab of ['summary', 'defense', 'events', 'dice'] as const)
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
    expect(turnLabel('Elaria')).toBe("Au tour d'Elaria")
    expect(turnLabel('Ysolde')).toBe("Au tour d'Ysolde")
    expect(turnLabel('Gorak')).toBe('Au tour de Gorak')
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
    // Chaque statut en jeu a sa fiche détaillée
    for (const e of statusCatalog()) if (e.inGame) render(<StatusesSection nav={nav} focus={e.id} filter="" />)
    render(<RecordsScreen onOpenCharacter={noop} onBack={noop} />)
  })

  it('tout statut en jeu a une icône peinte', () => {
    for (const e of statusCatalog()) if (e.inGame) expect(STATUS_ICON[e.id], e.id).toBeDefined()
  })

  it('le compendium ne liste que les statuts en jeu, bonus et malus réunis', () => {
    const html = renderToString(<StatusesSection nav={{ go: noop }} filter="" />)
    for (const e of statusCatalog()) {
      const name = e.def.name.replace(/'/g, '&#x27;')
      if (e.inGame) expect(html, e.id).toContain(name)
      else expect(html, e.id).not.toContain(name)
    }
  })

  it('tournoi', () => {
    const slots = fillSlots(Array(SLOTS).fill(null), CHARACTER_IDS, seededRng(3))
    const betting = { enabled: true, names: ['karma', 'MiaMiaM'] as [string, string] }
    const setup = renderToString(
      <TournamentSetupScreen slots={slots} onChange={noop} onValidate={noop} onBack={noop} betting={betting} onBettingChange={noop} relics onRelicsChange={noop} />,
    )
    expect(setup).toContain('role="switch" aria-checked="true"')
    const setupOff = renderToString(
      <TournamentSetupScreen slots={Array(SLOTS).fill(null)} onChange={noop} onValidate={noop} onBack={noop} betting={{ ...betting, enabled: false }} onBettingChange={noop} relics={false} onRelicsChange={noop} />,
    )
    expect(setupOff).toContain('Désactivées')
    expect(setupOff.match(EMOJI)?.[0]).toBeUndefined()
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
    const reward = { offer: RELICS.slice(0, 3), chosen: RELICS[1].id, onChoose: noop }
    const end = renderToString(<EndScreen result={result} onReplay={noop} onMenu={noop} tournament={{ label: 'x', onContinue: noop, reward }} />)
    expect(end).toContain('Récompense')
    render(<RelicCard relic={draught} selected mark="Choix de Brokk" onSelect={noop} />)
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
    // Regroupés : Affaibli, Fausse note et l'Aura d'intimidation adverse font un seul Affaibli, qui dit d'où il vient
    const weak = renderToString(
      <StatusTray
        states={trayStates([{ id: 'falseNote', stacks: 1 }], [{ id: 'intimidationAura', stacks: 1 }])}
        cast={{ bearer: createCharacter('fanchon'), opponent: createCharacter('brokk') }}
      />,
    )
    expect(weak.match(/data-state="/g)).toHaveLength(1)
    expect(weak).toContain('Affaibli −7')
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
})
