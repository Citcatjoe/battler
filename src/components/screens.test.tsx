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
import { skillFaceAt, skillFaceOf, turnLabel } from '../game/useCombat'
import { eventSpecialTone, statusSpecialTone, TONE_STYLE } from '../game/specials'
import { STATUSES } from '../game/statuses'
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
import { HpBar } from './HpBar'
import { StatusTray } from './StatusTray'
import { STATUS_ICON } from './Icon'
import { MatchupScreen } from './MatchupScreen'
import { RecordsScreen } from './RecordsScreen'
import { StartScreen } from './StartScreen'
import { TournamentSetupScreen } from './TournamentSetupScreen'
import { BetSummary, BetsResult, BettingDesk, Standings, type BetsOutcome } from './Betting'
import { createWallets, placeBet, placeBotBets, priceMatch, settleMatch, worthOf, type MatchOdds } from '../game/betting'

const noop = () => {}
const fighters = [createCharacter('gorak'), createCharacter('brokk')] as [
  ReturnType<typeof createCharacter>,
  ReturnType<typeof createCharacter>,
]
const result = simulateCombat(fighters, { rng: seededRng(9) })

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
  it('accueil, affrontement, combat, fin', () => {
    render(
      <StartScreen
        initial={fighters}
        mode="duel"
        onModeChange={noop}
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
        onModeChange={noop}
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
    // Mode triche : dé, pièce, plus de dé, combat sans graine

    for (const cheat of [
      { available: true, rank: 3, next: { side: 0 as const, faces: 8, coin: false }, forced: 6, count: 2 },
      { available: true, rank: 3, next: { side: 1 as const, faces: 2, coin: true }, count: 0 },
      { available: true, rank: 40, count: 1 },
      { available: false, rank: 0, count: 0 },
    ])
      render(<CheatPad cheat={cheat} fighters={result.fighters} onForce={noop} onClose={noop} bottom={76} />)
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
      <HpBar side={0} name="A" hp={10} maxHp={20} character={fighters[0]} turn="active" pulse={{ side: 0, face: 2, key: 1 }} />,
    )
    expect(on).toContain('data-turn="active"')
    // Un seul dé pulse : celui de la face 2 (deuxième dé de la rangée)
    expect(on.split('skill-die-pulse').length - 1).toBe(1)
    const after = on.slice(on.indexOf('skill-die-pulse'))
    expect(after.match(/aria-label="Dé (\d)"/)?.[1]).toBe('2')
    const off = renderToString(<HpBar side={1} name="B" hp={10} maxHp={20} character={fighters[1]} turn="waiting" />)
    expect(off).toContain('data-turn="waiting"')
    expect(off).not.toContain('skill-die-pulse')
    expect(turnLabel('Elaria')).toBe("Au tour d'Elaria")
    expect(turnLabel('Ysolde')).toBe("Au tour d'Ysolde")
    expect(turnLabel('Gorak')).toBe('Au tour de Gorak')
  })

  it('le dé qui pulse est celui du jet qui déclenche la compétence', () => {
    let pulses = 0
    for (const x of CHARACTER_IDS)
      for (const y of CHARACTER_IDS)
        for (const seed of [1, 2, 3]) {
          const pair = [createCharacter(x), createCharacter(y)] as [ReturnType<typeof createCharacter>, ReturnType<typeof createCharacter>]
          const { beats } = simulateCombat(pair, { rng: seededRng(seed) })
          beats.forEach((beat, i) => {
            if (beat.type === 'attack') {
              const face = skillFaceAt(beats, pair, i)
              // Un coup ordinaire (ni compétence, ni coup transformé) ne fait rien pulser ; sinon, c'est la face du dé
              if (face !== undefined && !beat.attack.reshaped) expect(beat.attack.roll).toBe(face)
            }
            // Toute compétence sur un 1, 2 ou 3 a son coup, dont le dé pulse sur cette face
            if (beat.type === 'event' && ['naturalOne', 'naturalTwo', 'naturalThree'].includes(beat.event.trigger)) {
              let j = i - 1
              while (j >= 0 && !(beats[j].turn === beat.turn && beats[j].type === 'attack')) j--
              expect(j, `${beat.event.name} sans coup`).toBeGreaterThanOrEqual(0)
              expect(skillFaceAt(beats, pair, j)).toBe(skillFaceOf(beat.event.trigger))
              pulses++
            }
          })
        }
    expect(pulses).toBeGreaterThan(50)
  })

  it('coups spéciaux : chaque mécanique qui arme ou produit un coup spécial a sa famille (badge)', () => {
    for (const id of STATUS_IDS) {
      const def = STATUSES[id]
      const special = def.forcesCrit || def.extraStrikes || def.coinToss || def.reflectsHit || def.fillsOnHurt || def.reactions?.hurt || def.drainsHit
      expect(statusSpecialTone(id) !== undefined, `${def.name} : badge de coup spécial`).toBe(!!special)
    }
    for (const id of CHARACTER_IDS)
      for (const e of createCharacter(id).events) {
        const special = e.reshapesHit || e.merged || e.effects.some((x) => x.type === 'release')
        expect(eventSpecialTone(e) !== undefined, `${e.name} : badge de coup spécial`).toBe(!!special)
      }
    for (const tone of Object.values(TONE_STYLE)) expect(tone.name).not.toMatch(EMOJI)
  })

  it('une compétence sur le dé tombe avec son jet (regroupement)', () => {
    let grouped = 0
    for (const x of CHARACTER_IDS)
      for (const y of CHARACTER_IDS) {
        const pair = [createCharacter(x), createCharacter(y)] as [ReturnType<typeof createCharacter>, ReturnType<typeof createCharacter>]
        const { beats } = simulateCombat(pair, { rng: seededRng(4) })
        beats.forEach((beat, i) => {
          // Un coup sacrifié par une compétence du dé est suivi directement de cette compétence : le rejoueur les joue ensemble
          if (beat.type === 'attack' && beat.attack.forfeited && skillFaceAt(beats, pair, i) !== undefined) {
            expect(beats[i + 1]?.type).toBe('event')
            grouped++
          }
        })
      }
    expect(grouped).toBeGreaterThan(50)
  })

  it('compendium, fiches et statistiques', () => {
    for (const section of COMPENDIUM_SECTIONS)
      render(<CompendiumScreen section={section.id} characterId="gorak" onNavigate={noop} onBack={noop} />)
    for (const id of CHARACTER_IDS) {
      render(<CharacterSheet characterId={id} onSelect={noop} />)
      render(<CharacterSheet characterId={id} onSelect={noop} initialTab="stats" />)
    }
    render(<RecordsScreen onOpenCharacter={noop} onBack={noop} />)
  })

  it('tout statut en jeu a une icône peinte', () => {
    for (const e of statusCatalog()) if (e.inGame) expect(STATUS_ICON[e.id], e.id).toBeDefined()
  })

  it('le compendium ne liste que les statuts en jeu', () => {
    const html = renderToString(<StatusesSection />)
    for (const e of statusCatalog()) {
      if (e.def.polarity !== 'positive') continue
      const name = e.def.name.replace(/'/g, '&#x27;')
      if (e.inGame) expect(html).toContain(name)
      else expect(html).not.toContain(name)
    }
  })

  it('tournoi', () => {
    const slots = fillSlots(Array(SLOTS).fill(null), CHARACTER_IDS, seededRng(3))
    const betting = { enabled: true, names: ['karma', 'MiaMiaM'] as [string, string] }
    render(<TournamentSetupScreen slots={slots} onChange={noop} onValidate={noop} onBack={noop} betting={betting} onBettingChange={noop} />)
    render(<TournamentSetupScreen slots={Array(SLOTS).fill(null)} onChange={noop} onValidate={noop} onBack={noop} betting={{ ...betting, enabled: false }} onBettingChange={noop} />)
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
    render(<BracketScreen tournament={t} onPlay={noop} onSimulate={noop} onChampion={noop} onNewTournament={noop} onMenu={noop} />)
    const run = championRun(t)!
    expect(run.matches).toHaveLength(4)
    expect(run.totals.damage).toBeGreaterThan(0)
    expect(run.totals.turns).toBe(run.matches.reduce((s, m) => s + m.turns, 0))
    render(<ChampionScreen run={run} onBracket={noop} onNewTournament={noop} onMenu={noop} />)
    render(<ChampionScreen run={run} onBracket={noop} onNewTournament={noop} onMenu={noop} wallets={createWallets()} />)
  })

  it('tous les statuts et effets s’affichent', () => {
    const statuses = STATUS_IDS.map((id, i) => ({ id, stacks: i + 1, ...(i % 2 ? { turns: 2 } : {}) }))
    render(<HpBar side={0} name="x" hp={10} maxHp={20} />)
    render(<StatusTray statuses={statuses} />)
    // Chaque état a son infobulle : nom, effet actuel, tours restants
    const tray = renderToString(<StatusTray statuses={[{ id: 'poison', stacks: 2, turns: 3 }]} />)
    expect(tray).toContain('role="tooltip"')
    expect(tray).toContain('Poison')
    expect(tray).toContain('3 tours restants')
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
        fx={{ key: 1, source: 0, title: 'Test', effects }}
      />,
    )
  })
})
