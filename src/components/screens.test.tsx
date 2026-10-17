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
import { testCharacter } from '../game/test-utils'
import { createTournament, fillSlots, matchFighters, SLOTS, withResult } from '../game/tournament'
import { BracketScreen } from './BracketScreen'
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

const render = (node: React.ReactNode) => expect(renderToString(node).length).toBeGreaterThan(100)

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
    for (const tab of ['summary', 'defense', 'events', 'dice'] as const)
      render(<EndScreen result={result} onReplay={noop} onMenu={noop} initialTab={tab} />)
    render(<EndScreen result={poisoned} onReplay={noop} onMenu={noop} tournament={{ label: 'x', onContinue: noop }} />)
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
      if (e.inGame) expect(html).toContain(e.def.name)
      else expect(html).not.toContain(e.def.name)
    }
  })

  it('tournoi', () => {
    const slots = fillSlots(Array(SLOTS).fill(null), CHARACTER_IDS, seededRng(3))
    render(<TournamentSetupScreen slots={slots} onChange={noop} onValidate={noop} onBack={noop} />)
    render(<TournamentSetupScreen slots={Array(SLOTS).fill(null)} onChange={noop} onValidate={noop} onBack={noop} />)
    let t = createTournament(slots, (id) => createCharacter(id).name)
    t = withResult(
      t,
      { round: 0, index: 0 },
      simulateCombat(matchFighters(t, { round: 0, index: 0 }), { rng: seededRng(4) }),
    )
    render(<BracketScreen tournament={t} onPlay={noop} onSimulate={noop} onNewTournament={noop} onMenu={noop} />)
  })

  it('tous les statuts et effets s’affichent', () => {
    const statuses = STATUS_IDS.map((id, i) => ({ id, stacks: i + 1, ...(i % 2 ? { turns: 2 } : {}) }))
    render(<HpBar side={0} name="x" hp={10} maxHp={20} />)
    render(<StatusTray statuses={statuses} />)
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
        fx={{ key: 1, source: 0, title: '✨ Test', effects }}
      />,
    )
  })
})
