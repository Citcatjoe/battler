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
import { ACT_FIGHTS, BOSS, championOf, startRun, type Encounter, type HeritageItem } from '../game/campaign'
import type { PendingReward } from '../game/offers'
import { Character } from '../game/character'
import { CampaignScreen, HeritagePick } from './CampaignScreen'
import { STATUS_IDS } from '../game/statuses'
import { fxFloats, type Float, type FxSpec } from '../game/staging'
import { attackSpecials, isSurcharge, relicSpecial, SPECIAL_SIGNS, SPECIAL_SOURCES, statusSpecial } from '../game/specials'
import { isAura, STATUSES, type StatusId } from '../game/statuses'
import { characterPool, MASTERIES, MASTERY_IDS, masteryOfSkill } from '../game/masteries'
import { EMOJI, testCharacter } from '../game/test-utils'
import { allMatches, championRun, createTournament, fillSlots, matchFighters, matchKey, SLOTS, withResult } from '../game/tournament'
import { BracketScreen } from './BracketScreen'
import { ChampionScreen } from './ChampionScreen'
import { CheatPad } from './CheatPad'
import { CharacterSheet } from './compendium/CharacterSheet'
import { CompendiumScreen } from './compendium/CompendiumScreen'
import { COMPENDIUM_SECTIONS } from './compendium/sections'
import { holdersOf, MasteriesSection } from './compendium/MasteriesSection'
import { compendiumSkills, SkillsSection, type SkillKind } from './compendium/SkillsSection'
import { StatusesSection } from './compendium/StatusesSection'
import { sheetStatuses, statusCatalog } from '../game/catalog'
import { EndScreen } from './EndScreen'
import { Fighter } from './Fighter'
import { FightScreen } from './FightScreen'
import { TestFightScreen } from './TestFightScreen'
import { HpBar } from './HpBar'
import { StatusTray, trayAfter } from './StatusTray'
import { SkillBar } from './SkillBar'
import { DieBuild, dieCells } from './DieBuild'
import { offerTargets, type ForgeStep } from '../game/forge'
import { auraOfSkill, STATES, STATUS_PLACE, trayStates } from '../game/states'
import { skillIcon, STATE_ICON, statusIcon } from './Icon'
import { RelicCard } from './RelicSeal'
import { SeasonReport } from './CombatReport'
import { getRelic, RELICS } from '../game/relics'
import { MatchupScreen } from './MatchupScreen'
import { RecordsScreen } from './RecordsScreen'
import { TournamentIntroScreen } from './TournamentIntroScreen'
import { StatSheet } from './StatSheet'
import { HomeScreen } from './HomeScreen'
import { TournamentOptions, TournamentSetupScreen } from './TournamentSetupScreen'
import { SeasonScreen } from './SeasonScreen'
import { createSeasonTournament, DEFAULT_SEASON_SIZE, pendingOfDay, simulateSeasonMatches } from '../game/season'
import { BetSummary, BetsResult, BettingDesk, Standings, type BetsOutcome } from './Betting'
import { createWallets, placeBet, placeBotBets, priceMatch, settleMatch, worthOf, type MatchOdds } from '../game/betting'

const noop = () => {}
const SKILL_KINDS: SkillKind[] = ['skills', 'auras']
/** L'onglet d'une compétence du compendium : Auras ou Compétences. */
const kindOf = (id: string): SkillKind => (compendiumSkills('auras').some((s) => s.event.id === id) ? 'auras' : 'skills')
/** Les fiches de toutes les compétences et auras, chacune dans son onglet. */
const skillPages = () =>
  SKILL_KINDS.flatMap((kind) => compendiumSkills(kind).map((s) => renderToString(<SkillsSection kind={kind} nav={{ go: noop }} focus={s.event.id} filter="" />)))
/** Le texte affiché seul, sans balises ni commentaires de React, apostrophes décodées. */
const textOf = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&#x27;/g, "'")
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
    for (const progress of [null, '3 / 15'])
      render(<TournamentIntroScreen onHome={noop} tournamentProgress={progress} onNewTournament={noop} onResumeTournament={noop} />)
    for (const arena of [...ARENAS.map((a) => a.id), RANDOM_ARENA])
      for (const mode of ['duel', 'tournament', 'season', 'campaign'] as const)
        render(
          <MatchupScreen
            mode={mode}
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
    render(<MatchupScreen mode="tournament" fighters={fighters} arena={ARENAS[0].id} onArenaChange={noop} onPlay={noop} onSimulate={noop} onBack={noop} betting={betting} />)
    render(<MatchupScreen mode="tournament" fighters={fighters} arena={ARENAS[0].id} onArenaChange={noop} onPlay={noop} onSimulate={noop} onBack={noop} betting={{ ...betting, odds: null }} />)
    // Rang au-dessus du nom : un badge, son chiffre seul, sans texte autour ; aucun badge pour un opposant sans rang
    const ranked = renderToString(
      <MatchupScreen
        mode="season"
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

  it('dé face par face (affrontement) : les six faces du dé, dans l’ordre, la forge lue sur ses faces', () => {
    const gorak = createCharacter('gorak')
    const cells = dieCells(gorak)
    expect(cells.map((c) => c.face)).toEqual([1, 2, 3, 4, 5, 6])
    // Le druide : un d6 sous ses deux formes, ses deux sorts sous forme humaine (le 1 et le 2), des coups sous l'ours
    const thaldrin = createCharacter('thaldrin')
    expect(dieCells(thaldrin, 0).map((c) => !!c.event)).toEqual([true, true, false, false, false, false])
    expect(dieCells(thaldrin, 1).some((c) => c.event)).toBe(false)
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
    // Une face dorée : le fond d'or suffit, ni bonus ni chiffre en cartouche (0.111.0)
    expect(build).not.toContain(`+${f[4].gild}</span>`)
    expect(build.match(/class="die-slot-num"/g)).toHaveLength(dieCells(forged).filter((c) => c.event).length)
    // Six emplacements, un par face
    expect(build.match(/<li class="die-slot[ "]/g)).toHaveLength(6)
    // Une face gravée par la forge est une face forgée (cadre d'or)
    const foreign = ENGRAVABLE_SKILLS.find((e) => !gorak.events.some((own) => own.id === e.id))!
    const engraved = gorak.withForge([{ op: 'engrave', face: 5, skill: foreign }])
    expect(renderToString(<DieBuild character={engraved} />).match(/data-forged=""/g)).toHaveLength(1)
    // Le druide : un sélecteur de forme du kit dans l'en-tête du dé
    expect(renderToString(<DieBuild character={thaldrin} />)).toContain('bt-segmented')
  })

  it('fiche d’affrontement : six places de reliques, « +N » au-delà, « Aucune relique » sans', () => {
    const many = createCharacter('ervald').withRelics(RELICS.slice(0, 10))
    const html = renderToString(
      <MatchupScreen mode="tournament" fighters={[createCharacter('gorak'), many]} arena={RANDOM_ARENA} onArenaChange={() => {}} onPlay={() => {}} onSimulate={() => {}} onBack={() => {}} />,
    )
    expect(html).toContain('Aucune relique')
    expect(html.match(/class="group\/relic/g)).toHaveLength(6)
    expect(html).toContain('matchup-relics-more')
    // Les deux fiches, et le sélecteur d'arène avec son index au lieu des points
    expect(html.match(/class="matchup-card/g)).toHaveLength(2)
    expect(html).toContain('matchup-arena-index')
    // Hors duel : pas de sélecteur de combattants ; le retour mène à l'arbre
    expect(html).not.toContain('matchup-picker')
    expect(html).toContain('Tournoi</button>')
  })

  it('fiche d’affrontement (U5) : sous le nom, les deux maîtrises avec leurs emblèmes, plus la race ni l’archétype', () => {
    const pair = [createCharacter('elaria'), createCharacter('naraxes')] as const
    for (const mode of ['duel', 'tournament'] as const) {
      const html = renderToString(<MatchupScreen mode={mode} fighters={[...pair]} arena={RANDOM_ARENA} onArenaChange={noop} onPlay={noop} onSimulate={noop} onBack={noop} />)
      const text = textOf(html)
      for (const c of pair) {
        const [a, b] = c.definition.masteries
        expect(text, `${mode} ${c.id}`).toContain(`${MASTERIES[a].name}·${MASTERIES[b].name}`)
        for (const m of [a, b]) expect(html, `${mode} ${m}`).toContain(`mastery-${m}`)
        expect(text, `${mode} ${c.id}`).not.toContain(`${c.race} · ${c.archetype}`)
      }
    }
  })

  it('affrontement en duel : sélecteur de combattants, ni reliques ni Parier, Simuler en bouton carré', () => {
    const pair = [createCharacter('gorak'), createCharacter('ervald')] as const
    const odds = priceMatch([...pair], 'test', 20)
    const betting = { wallets: createWallets(), odds, onBet: () => null, onCancel: noop }
    const duel = renderToString(
      <MatchupScreen mode="duel" fighters={[...pair]} arena={RANDOM_ARENA} onArenaChange={noop} onPlay={noop} onSimulate={noop} onBack={noop} betting={betting} />,
    )
    // Un portrait par personnage du roster, sans nom écrit ; les deux camps choisis, chacun à sa couleur
    expect(duel.match(/matchup-picker-tile/g)).toHaveLength(CHARACTER_IDS.length)
    expect(duel).toContain('data-selection="a"')
    expect(duel).toContain('data-selection="b"')
    expect(duel).not.toContain('<span>Reliques</span>')
    expect(duel).not.toContain('Aucune relique')
    expect(duel).not.toContain('title="Parier"')
    expect(duel).toContain('aria-label="Simuler le combat"')
    expect(duel).toContain('Menu</button>')
    // Hors duel, le même guichet ouvre un bouton Parier avec son compteur
    const run = renderToString(
      <MatchupScreen mode="tournament" fighters={[...pair]} arena={RANDOM_ARENA} onArenaChange={noop} onPlay={noop} onSimulate={noop} onBack={noop} betting={betting} />,
    )
    expect(run).toContain('title="Parier"')
    expect(run).toContain('bt-badge')
  })

  it('comparaison des stats : le meilleur de chaque ligne surligné à la couleur de son camp, rien à égalité', () => {
    const base = createCharacter('gorak')
    const strong = base.adjusted({ stats: { maxHp: base.stats.maxHp + 10 } })
    const html = renderToString(<StatSheet character={strong} barClass="" compare={{ rival: base, side: 1 }} />)
    // PV seuls meilleurs : une ligne surlignée, au rose du camp droit ; l'adversaire n'en a aucune
    expect(html.match(/data-best="true"/g)).toHaveLength(1)
    expect(html).toContain('bg-side-b/15')
    expect(renderToString(<StatSheet character={base} barClass="" compare={{ rival: strong, side: 0 }} />)).not.toContain('data-best')
    // Multiplicateur sans critique : « — », il ne gagne jamais
    const noCrit = base.adjusted({ stats: { critChance: 0, critMultiplier: 9 } })
    const crit = renderToString(<StatSheet character={noCrit} barClass="" compare={{ rival: base, side: 0 }} />)
    expect(crit).not.toContain('data-best')
  })

  it('zone de compétence du combat : le dé qui roule allume brièvement le sceau de la face montrée, sans éclat', () => {
    const gorak = createCharacter('gorak')
    // Le 2 de Gorak est une face de compétence ; le 5, une face nue : elle s'allume aussi (0.111.0)
    const rolling = renderToString(<SkillBar character={gorak} side={0} statuses={[]} rolling={[2]} />)
    expect(rolling.match(/is-rolled/g)).toHaveLength(1)
    expect(rolling).not.toContain('skill-bar-wave')
    expect(renderToString(<SkillBar character={gorak} side={0} statuses={[]} rolling={[5]} />).match(/is-rolled/g)).toHaveLength(1)
  })

  it('zone de compétence du combat (0.111.0) : les six faces, une face nue en case vide éteinte qui s’allume où le dé tombe, une face dorée en or', () => {
    // Un dé de six faces nues (Morgrut porte une aura sur le 1 depuis les Maîtrises), et pourtant six cases
    const morgrut = renderToString(<SkillBar character={testCharacter('nu')} side={0} statuses={[]} />)
    expect(morgrut.match(/class="skill-seal skill-bar-bare"/g)).toHaveLength(6)
    expect(morgrut).not.toContain('is-rolled')
    for (const face of [1, 2, 3, 4, 5, 6]) expect(morgrut).toContain(`aria-label="Dé ${face}"`)
    // Le dé tombé sur le 4 l'allume, seul
    const landed = renderToString(<SkillBar character={testCharacter('nu')} side={0} statuses={[]} landed={[4]} />)
    expect(landed.match(/is-rolled/g)).toHaveLength(1)
    expect(landed.slice(landed.indexOf('is-rolled')).match(/aria-label="Face (\d)"/)?.[1]).toBe('4')
    // Une face dorée : la même case, sur fond d'or, sans chiffre de bonus ; une face de compétence ne s'allume qu'à son déclenchement
    const gilded = createCharacter('gorak').withForge([{ op: 'gild', face: 5 }])
    const bar = renderToString(<SkillBar character={gilded} side={0} statuses={[]} landed={[1]} />)
    expect(bar.match(/data-gild=""/g)).toHaveLength(1)
    expect(bar.match(/class="skill-seal skill-bar-bare"/g)).toHaveLength(4)
    expect(bar).not.toContain('is-rolled')
  })

  it("zone de surcharge : n'y entrent que les statuts qui changent ce coup-ci, sans aura ni action déclenchée (registre unique)", () => {
    const surcharges = STATUS_IDS.filter(isSurcharge).sort()
    // Critique et esquive imposés, bouclier, modificateurs qui s'usent sur le coup (Fausse note, Ferveur), réactions au coup
    // (Rancune comprise, 0.114.0). Pas d'aura (agit à chaque coup), pas de modificateur durable (Affaibli, Force de l'ours),
    // pas de Pile ou face ni de Furie
    // L'Aura d'épines (revue X1, 0.118.1) en est sortie : une aura n'a pas de label sous le dé. La Garde brisée (lot 3) y
    // entre : elle double le coup qui la consomme (label « Garde brisée ×2 » sous le dé du défenseur)
    expect(surcharges).toEqual(['bleed', 'bonusArmor', 'evasion', 'falseNote', 'firefly', 'grudge', 'guaranteedCrit', 'guardBreak', 'lifesteal', 'momentum', 'riposte'].sort())
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
    expect(statusSpecial('thorns', 'defender')).toBeUndefined()
    expect(spec('falseNote', 'attacker', -10)).toBe('Fausse note −10 [skill minus]')
    // Le même statut change de signe avec son porteur ; une aura n'a jamais de label
    expect(statusSpecial('lifesteal', 'defender')?.sign).toBe('minus')
    expect(statusSpecial('powerAura', 'attacker', 2)).toBeUndefined()
    // Une relique qui se déclenche : + pour le bonus de son porteur, même chez le défenseur (0.110.0) ; − seulement
    // quand elle contre le coup en frappant l'attaquant (Conque des vents)
    const armor = { type: 'applyStatus', target: 1, status: 'thorns', stacks: 2, result: { kind: 'applied', stacks: 2 } } as const
    const gust = { type: 'damage', target: 0, amount: 2, source: 'wind' } as const
    expect(relicSpecial('wolf-fang', 'Dent de loup', 'attacker', []).sign).toBe('plus')
    expect(relicSpecial('bramble-collar', 'Collier de ronces', 'defender', [armor]).sign).toBe('plus')
    expect(relicSpecial('wind-conch', 'Conque des vents', 'defender', [gust]).sign).toBe('minus')
  })

  it("zone de surcharge d'un coup : dans l'ordre du livre de règles, sans modificateur d'aura", () => {
    const base = simulateCombat([createCharacter('gorak'), createCharacter('brokk')], { seed: 1 }).beats.find((b) => b.type === 'attack')!
    if (base.type !== 'attack') throw new Error('coup attendu')
    const attack = {
      ...base.attack,
      dodged: false,
      replaced: false,
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
    const dodged = attackSpecials({ ...base.attack, dodged: true, dodgeForced: true, dodgeBy: 'evasion', replaced: false, crit: false, critForced: false, relicBonus: undefined, modifiers: [], shields: [] })
    expect(show([...dodged.roll, ...dodged.crit, ...dodged.impact])).toEqual(['Esquive assurée minus'])
    // Sur tout le roster : aucun emoji, et un jet remplacé n'a aucune surcharge
    for (const x of CHARACTER_IDS)
      for (const beat of simulateCombat([createCharacter(x), createCharacter('brokk')], { seed: 2 }).beats) {
        if (beat.type !== 'attack') continue
        const all = Object.values(attackSpecials(beat.attack)).flat()
        for (const s of all) expect(s.label).not.toMatch(EMOJI)
        if (beat.attack.replaced) expect(all).toEqual([])
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

  it('perte de contrôle : ses deux images alternent, à la place du tremblement de la Peur ; un coup reçu les interrompt', () => {
    const naraxes = createCharacter('naraxes')
    const [a, b] = naraxes.look.poses!.dazed!
    const html = renderToString(<Fighter character={naraxes} side={1} statuses={[{ id: 'fear', stacks: 1 }]} dazed />)
    expect(html).toMatch(new RegExp(`<img[^>]*src="${a}"[^>]*daze-frame-a`))
    expect(html).toMatch(new RegExp(`<img[^>]*src="${b}"[^>]*daze-frame-b`))
    expect(html).not.toContain('status-tremble')
    const hurt = renderToString(<Fighter character={naraxes} side={1} dazed received={{ key: 1, damage: 3, crit: false, dodged: false, landed: true }} />)
    expect(hurt).toContain(naraxes.look.poses!.hurt!)
    expect(hurt).not.toContain('daze-frame')
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
    // Chaque statut de la section Statuts et chaque compétence ou aura ont leur fiche détaillée
    for (const e of sheetStatuses()) render(<StatusesSection nav={nav} focus={e.id} filter="" />)
    for (const kind of SKILL_KINDS) for (const s of compendiumSkills(kind)) render(<SkillsSection kind={kind} nav={nav} focus={s.event.id} filter="" />)
    render(<RecordsScreen onOpenCharacter={noop} onBack={noop} />)
  })

  it('les sections Compétences et Statuts ne nomment aucun porteur (ni personnage, ni race)', () => {
    const names = CHARACTER_IDS.map((id) => createCharacter(id).name)
    const pages = [
      ...skillPages(),
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
    // L'index seul : la fiche du statut choisi cite ses sources, dont une aura qui porte le nom de sa compétence (la
    // Feinte, lot 3, pose des Critiques assurés)
    const index = html.slice(html.indexOf('aria-label="Statuts"'), html.indexOf('</nav>'))
    for (const e of statusCatalog()) {
      const listed = index.includes(`>${e.def.name.replace(/'/g, '&#x27;')}<`)
      expect(listed, e.id).toBe(e.inGame && STATUS_PLACE[e.id].place === 'tray')
    }
  })

  it('la fiche d’une compétence porte son aura ou son mécanisme', () => {
    const sheet = (id: string) => renderToString(<SkillsSection kind={kindOf(id)} nav={{ go: noop }} focus={id} filter="" />).replace(/&#x27;/g, "'")
    // Aura de sainteté : sa vie, son plafond et sa maîtrise
    const holy = sheet('holy-aura')
    for (const text of ["jusqu'à la fin du combat", '2 charges au plus']) expect(holy).toContain(text)
    expect(textOf(holy)).toContain('Aura · Lumière')
    // Rétribution : la règle de ses jauges, que sa description ne dit pas
    expect(sheet('retribution')).toContain('range ses dégâts dans une des 3 jauges')
  })

  it('compendium (retour du 2026-10-27) : deux onglets, Compétences et Auras ; chaque brique dit sa maîtrise', () => {
    const auras = compendiumSkills('auras').map((s) => s.event.id)
    const skills = compendiumSkills('skills').map((s) => s.event.id)
    // Classées selon le moteur : ce qui pose une aura sur son lanceur est une aura (Sève noire, Ivresse du sang)
    expect(auras).toEqual(expect.arrayContaining(['black-sap', 'blood-frenzy', 'thorns']))
    expect(skills).toEqual(expect.arrayContaining(['cleave']))
    expect(auras.some((id) => skills.includes(id))).toBe(false)
    // Une brique sur un dé de départ n'est jamais « hors kit », même dans la réserve d'un autre (Épines : Brokk, et Gorak par le Sang)
    const onFace = new Set(CHARACTER_IDS.flatMap((id) => createCharacter(id).events.map((e) => e.id)))
    for (const s of [...compendiumSkills('auras'), ...compendiumSkills('skills')]) if (onFace.has(s.event.id)) expect(s.outside, s.event.id).toBeUndefined()
    const html = renderToString(<SkillsSection kind="auras" nav={{ go: noop }} filter="" />).replace(/&#x27;/g, "'")
    expect(html).toContain("Une aura dure jusqu'à la fin du combat")
    expect(html).toContain('choisie parmi celles de ses deux maîtrises')
    // Chaque brique nomme sa maîtrise (son emblème peint), dans l'index et en tête de sa fiche
    for (const s of compendiumSkills('auras')) {
      const m = masteryOfSkill(s.event.id)
      expect(m, s.event.id).toBeDefined()
      expect(html, s.event.id).toContain(MASTERIES[m!].name)
      expect(html, s.event.id).toContain(`mastery-${m}`)
    }
    const list = renderToString(<SkillsSection kind="skills" nav={{ go: noop }} filter="" />)
    for (const s of compendiumSkills('skills')) {
      const m = masteryOfSkill(s.event.id)
      if (m) expect(list, s.event.id).toContain(MASTERIES[m].name)
    }
    // Plus de niveau Martiale / Adresse / Arcane
    for (const kind of SKILL_KINDS) for (const word of ['Martiale', 'Adresse', 'Arcane']) expect(renderToString(<SkillsSection kind={kind} nav={{ go: noop }} filter="" />)).not.toContain(word)
  })

  it('compendium : ni interaction ni purification dans les fiches de compétence, d’aura et de statut', () => {
    const pages = [...skillPages(), ...sheetStatuses().map((e) => renderToString(<StatusesSection nav={{ go: noop }} focus={e.id} filter="" />))]
    // Le texte affiché seul (les noms d'icônes, purification.png, ne comptent pas) ; la compétence Purification garde son
    // nom dans l'index, mais aucune fiche ne dit ce qui retire un statut
    for (const html of pages) for (const word of ['Interactions', 'purifi', 'purge', 'Peut être retiré']) expect(html.replace(/<[^>]*>/g, '')).not.toContain(word)
  })

  it('compendium, onglet Maîtrises : une tuile par maîtrise, ses porteurs, ses auras puis ses compétences ; ni interaction ni purification', () => {
    expect(COMPENDIUM_SECTIONS.map((s) => s.id)).toContain('masteries')
    const index = renderToString(<MasteriesSection nav={{ go: noop }} filter="" />).replace(/&#x27;/g, "'")
    for (const id of MASTERY_IDS) {
      for (const text of [MASTERIES[id].name, MASTERIES[id].question, `mastery-${id}`]) expect(index, id).toContain(text)
      expect(holdersOf(id).length, id).toBeGreaterThan(0)
    }
    // Le Poison se partage (V5) : Naraxes, Ervald et Thaldrin
    expect(holdersOf('poison').map((c) => c.id)).toEqual(expect.arrayContaining(['naraxes', 'ervald', 'thaldrin']))
    for (const id of MASTERY_IDS) {
      const text = textOf(renderToString(<MasteriesSection nav={{ go: noop }} focus={id} filter="" />))
      for (const c of holdersOf(id)) expect(text, `${id} ${c.id}`).toContain(c.name)
      // Ses auras avant ses compétences
      const aurasAt = text.indexOf('Auras · ')
      expect(aurasAt, id).toBeGreaterThan(-1)
      expect(text.indexOf('Compétences · '), id).toBeGreaterThan(aurasAt)
      for (const word of ['Interactions', 'purifi', 'purge', 'Peut être retiré']) expect(text, id).not.toContain(word)
    }
  })

  it('fiche d’un combattant : son dé de départ toujours visible, seules ses compétences de départ citées', () => {
    for (const id of CHARACTER_IDS) {
      const character = createCharacter(id)
      // Ses deux maîtrises sous son nom
      const head = textOf(renderToString(<CharacterSheet characterId={id} nav={{ go: noop }} />))
      for (const m of character.definition.masteries) expect(head, `${id} ${m}`).toContain(MASTERIES[m].name)
      for (const tab of ['sheet', 'performance'] as const) {
        const html = renderToString(<CharacterSheet characterId={id} nav={{ go: noop }} initialTab={tab} />).replace(/&#x27;/g, "'")
        expect(html, `${id} ${tab}`).toContain(`Dé de ${character.name}`)
      }
      const sheet = renderToString(<CharacterSheet characterId={id} nav={{ go: noop }} />).replace(/&#x27;/g, "'")
      const list = sheet.slice(sheet.indexOf('Compétences de départ'))
      for (const e of character.events) expect(list, `${id} ${e.id}`).toContain(e.name)
      // Ce qu'il pourrait graver ensuite (sa réserve, celle de ses deux maîtrises) n'est pas cité
      for (const e of characterPool(character.definition)) if (!character.events.some((x) => x.name === e.name)) expect(list, `${id} ${e.id}`).not.toContain(`>${e.name}<`)
    }
  })

  it('tournoi', () => {
    const slots = fillSlots(Array(SLOTS).fill(null), CHARACTER_IDS, seededRng(3))
    const betting = { enabled: true, names: ['karma', 'MiaMiaM'] as [string, string] }
    const season = { enabled: false, size: DEFAULT_SEASON_SIZE }
    const setup = renderToString(
      <TournamentSetupScreen slots={slots} onChange={noop} onValidate={noop} onBack={noop} betting={betting} onBettingChange={noop} relics onRelicsChange={noop} forge onForgeChange={noop} uniqueNames={false} onUniqueNamesChange={noop} season={season} onSeasonChange={noop} />,
    )
    // L'écran ne garde que l'essentiel : le résumé des options et le bouton qui ouvre leur boîte, fermée
    expect(setup).toContain('Options')
    expect(setup).toContain('aria-haspopup="dialog"')
    expect(setup).not.toContain('role="dialog"')
    expect(setup).not.toContain('role="switch"')
    expect(setup).toContain('paris entre karma et MiaMiaM')
    expect(setup).toContain('Compléter')
    // La boîte « Options » : tous les réglages, nombre de combattants et paris compris, et sa croix
    const options = { betting, onBettingChange: noop, relics: true, onRelicsChange: noop, forge: true, onForgeChange: noop, uniqueNames: false, onUniqueNamesChange: noop, season, onSeasonChange: noop }
    const box = renderToString(<TournamentOptions {...options} onClose={noop} />)
    expect(box).toContain('role="dialog"')
    expect(box).toContain('role="switch" aria-checked="true"')
    for (const label of ['Phase de saison', 'Combattants', 'Forge du dé', 'Reliques', 'Noms uniques', 'Paris', 'Fermer les options', 'aria-label="Parieur 1"']) expect(box).toContain(label)
    // Sans saison, la forge du dé ne s'actionne pas
    expect(box).toContain('Avec la saison')
    expect(box.match(EMOJI)?.[0]).toBeUndefined()
    // Avec la saison, reliques et forge : la règle de construction, une récompense par match aux dix premiers
    const seasonBox = renderToString(<TournamentOptions {...options} season={{ ...season, enabled: true }} onClose={noop} />)
    expect(seasonBox).toContain('Une récompense à chacun des 10 premiers matchs de chaque combattant, gagné ou perdu (4 forges du dé et 6 reliques)')
    expect(setup).not.toContain('de la saison</span>')
    const setupOff = renderToString(
      <TournamentSetupScreen slots={Array(SLOTS).fill(null)} onChange={noop} onValidate={noop} onBack={noop} betting={{ ...betting, enabled: false }} onBettingChange={noop} relics={false} onRelicsChange={noop} forge={false} onForgeChange={noop} uniqueNames onUniqueNamesChange={noop} season={{ ...season, enabled: true }} onSeasonChange={noop} />,
    )
    // Saison sans reliques ni forge : le résumé le dit, et la boîte montre les options coupées
    expect(setupOff).toContain('Saison de 24, aller-retour (552 matchs) · noms uniques')
    expect(renderToString(<TournamentOptions {...options} relics={false} forge={false} season={{ ...season, enabled: true }} onClose={noop} />)).toContain('Désactivées')
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
    const live = renderToString(
      <BracketScreen tournament={t} onPlay={noop} onSimulate={noop} onChampion={noop} onNewTournament={noop} onMenu={noop} wallets={createWallets()} initialBetsOpen />,
    )
    // Un seul prochain match cadré d'or ; les actions des matchs prêts, Paris (0/2) et son panneau
    expect(live.match(/data-next="true"/g)).toHaveLength(1)
    expect(live).toContain('aria-label="Affronter"')
    expect(live).toContain('aria-label="Paris (0/2)"')
    expect(live).toContain('aria-label="Simuler le tour (7 combats) (×7)"')
    expect(live).toContain('mises de ce tour 0 / 2')
    // Après une saison, la carte montre le build figé du participant : sa face dorée et sa relique
    const gild: ForgeStep = { op: 'gild', face: 3 }
    const built = { ...t, results: {}, entrants: t.entrants.map((e, i) => (i === 0 ? { ...e, build: { relics: [RELICS[0].id], forge: [gild] } } : e)) }
    const builtHtml = renderToString(<BracketScreen tournament={built} onPlay={noop} onSimulate={noop} onChampion={noop} onNewTournament={noop} onMenu={noop} />)
    expect(builtHtml.match(/data-gild=""/g)).toHaveLength(1)
    expect(builtHtml).toContain(`aria-label="${RELICS[0].name}"`)
    // Tournoi complet : l'arbre terminé, puis l'écran du champion et son bilan cumulé
    let seed = 10
    for (const ref of allMatches()) if (!t.results[matchKey(ref)]) t = withResult(t, ref, simulateCombat(matchFighters(t, ref), { seed: seed++ }))
    const tree = renderToString(<BracketScreen tournament={t} onPlay={noop} onSimulate={noop} onChampion={noop} onNewTournament={noop} onMenu={noop} />)
    expect(tree.match(EMOJI)?.[0]).toBeUndefined()
    // Aperçu du build sur chaque carte : le dé en miniature de chaque participant (30 lignes remplies), et les reliques
    // qu'il porte à ce match (le champion, celles gagnées en chemin)
    expect(tree.match(/aria-label="Dé de /g)).toHaveLength(30)
    expect(tree).toContain('data-size="xs"')
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
    render(<MatchupScreen mode="tournament" fighters={[holder, createCharacter('gorak')]} onPlay={noop} onSimulate={noop} onBack={noop} arena={RANDOM_ARENA} onArenaChange={noop} />)
    // Écran de victoire d'un match de tournoi : le bouton principal mène à la récompense
    const reward = { kind: 'relic' as const, offer: RELICS.slice(0, 3), chosen: RELICS[1].id, onChoose: noop }
    const end = renderToString(<EndScreen result={result} onReplay={noop} onMenu={noop} tournament={{ label: 'x', onContinue: noop, rewards: [{ side: result.winner, reward }] }} />)
    expect(end).toContain('Récompense')
    // En saison, les deux côtés qui se construisent encore : le bouton le dit au pluriel
    const both = renderToString(<EndScreen result={result} onReplay={noop} onMenu={noop} tournament={{ label: 'x', onContinue: noop, rewards: [{ side: 0, reward }, { side: 1, reward }] }} />)
    expect(both).toContain('Récompenses')
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
    expect(weak).toContain('Affaibli −1')
    expect(weak).toContain('Coup gâché −4')
    expect(weak).toContain('Aura d&#x27;intimidation (Brokk)')
    // L'en-tête : les sceaux des compétences, l'aura en anneau (active : il tourne), la face du dé en pastille. L'Aura de
    // puissance, hors kit depuis le d6, est gravée sur le 3 de Gorak
    const powerAura = ENGRAVABLE_SKILLS.find((e) => e.id === 'power-aura')!
    const auraGorak = createCharacter('gorak').withForge([{ op: 'engrave', face: 3, skill: powerAura }])
    const bar = renderToString(<SkillBar character={auraGorak} side={0} statuses={[{ id: 'powerAura', stacks: 1 }]} />)
    expect(bar).toContain('data-signal="0:wind-fury"')
    expect(bar).toContain('data-signal="0:powerAura 0:power-aura"')
    expect(bar).toContain('aura-token')
    // L'anneau porte la valeur de l'aura : +2 aux coups (non cumulable depuis la 0.107.0)
    expect(bar).toContain('+2')
    expect(renderToString(<SkillBar character={auraGorak} side={0} statuses={[]} />)).not.toContain('aura-token')
    expect(bar.match(EMOJI)?.[0]).toBeUndefined()
    const effects = [
      { type: 'heal' as const, target: 0 as const, amount: 3 },
      { type: 'damage' as const, target: 0 as const, amount: 2, source: 'strike' as const },
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

  it('campagne : chaque étape se rend, avec un dé forgé', () => {
    const props = { heritage: {}, onStart: noop, onFight: noop, onReward: noop, onAbandon: noop, onNewRun: noop, onMenu: noop }
    // Un champion qui a déjà forgé : une gravure sur le 6, une copie, une dorure, et le boss en face
    let run = startRun('gorak', 5, { kind: 'relic', relic: 'wolf-fang' })
    run = { ...run, forge: [{ op: 'engrave', face: 6, skill: ENGRAVABLE_SKILLS.find((e) => e.id === 'fear')! }, { op: 'copy', face: 1 }, { op: 'gild', face: 4 }] }
    const encounters: Encounter[] = [
      { characterId: 'brokk', maxHp: 44, forge: [{ op: 'gild', face: 6 }], relics: ['wolf-fang'], chance: 0.8 },
      { characterId: 'ysolde', maxHp: 61, forge: [], relics: [], chance: 0.4 },
    ]
    render(<CampaignScreen {...props} run={null} />)
    render(<CampaignScreen {...props} run={null} heritage={Object.fromEntries(CHARACTER_IDS.map((id) => [id, [{ kind: 'relic' as const, relic: 'wolf-fang' }]]))} />)
    render(<CampaignScreen {...props} run={run} />)
    render(<CampaignScreen {...props} run={{ ...run, encounters }} />)
    render(<CampaignScreen {...props} run={{ ...run, wins: ACT_FIGHTS, encounters: [{ characterId: BOSS.id, maxHp: 90, forge: [], relics: [], boss: true, chance: 0.45 }] }} />)
    const forge: PendingReward = { kind: 'forge', offer: [{ op: 'gild' }, { op: 'temper' }, { op: 'copy' }], choice: { op: 'gild', face: 5 } }
    const relic: PendingReward = { kind: 'relic', offer: ['felt-boots', 'wolf-fang'], choice: 'felt-boots' }
    for (const reward of [forge, relic]) render(<CampaignScreen {...props} run={{ ...run, wins: 2, reward }} />)
    for (const outcome of ['won', 'lost'] as const) render(<CampaignScreen {...props} run={{ ...run, outcome, gains: [{ kind: 'relic', relic: 'felt-boots' }] }} />)
    // Le combat d'un champion forgé contre le boss : l'en-tête montre la compétence gravée sur le 6
    const pair: [Character, Character] = [championOf(run), new Character(BOSS)]
    const fight = renderToString(<FightScreen script={simulateCombat(pair, { seed: 3 })} arena={null} onEnd={noop} />)
    expect(fight).toContain('aria-label="Dé 6"')
    render(<MatchupScreen mode="campaign" fighters={pair} onPlay={noop} onSimulate={noop} onBack={noop} arena={RANDOM_ARENA} onArenaChange={noop} />)
  })

  it('campagne, choix du champion (retour du 2026-10-27) : tous les champions, sa ligne de lore, l’héritage par interrupteur', () => {
    const props = { onStart: noop, onFight: noop, onReward: noop, onAbandon: noop, onNewRun: noop, onMenu: noop }
    const html = (heritage: Record<string, HeritageItem[]>) => renderToString(<CampaignScreen {...props} run={null} heritage={heritage} />)
    const none = html({})
    for (const id of CHARACTER_IDS) expect(none).toContain(`aria-label="${createCharacter(id).name}"`)
    expect(none).toContain(createCharacter(CHARACTER_IDS[0]).definition.lore.background.slice(0, 30))
    // Sans partie précédente : interrupteur coupé et grisé, et sa raison
    expect(none).toMatch(/role="switch" aria-checked="false" disabled=""/)
    expect(none).toContain('Aucune partie précédente pour ce champion.')
    // Avec un héritage : interrupteur actif par défaut, une seule ligne d'explication, plus de note « N améliorations »
    const some = html({ [CHARACTER_IDS[0]]: [{ kind: 'relic', relic: 'wolf-fang' }] })
    expect(some).toMatch(/role="switch" aria-checked="true"/)
    expect(some).toContain('Récupère un objet de la dernière partie perdue de ce champion.')
    expect(some).not.toContain('amélioration')
    expect(some).toContain('Commencer la campagne')
  })

  it('héritage (U4) : aucune carte choisie d’avance, « Commencer » attend le choix du joueur', () => {
    const items: HeritageItem[] = [
      { kind: 'forge', step: { op: 'engrave', face: 3, skill: ENGRAVABLE_SKILLS.find((e) => e.id === 'lucky-strike')! } },
      { kind: 'relic', relic: 'wolf-fang' },
      { kind: 'relic', relic: 'eagle-feather' },
    ]
    const html = renderToString(<HeritagePick champion={createCharacter('elaria')} items={items} seed={1} onBack={noop} onStart={noop} />)
    expect(html).not.toContain('aria-pressed="true"')
    expect(html).not.toContain('Choix d')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Commencer/)
  })

  it('écrans de victoire (U2) : déclenchements de chaque relique et de chaque face, lus dans les combats enregistrés', () => {
    const props = { heritage: {}, onStart: noop, onFight: noop, onReward: noop, onAbandon: noop, onNewRun: noop, onMenu: noop }
    const run = { ...startRun('gorak', 5, { kind: 'relic', relic: 'wolf-fang' }), outcome: 'won' as const }
    const fights = [{ opponentId: 'brokk', won: true, turns: 5, hpLeft: 10, triggers: { relics: { 'wolf-fang': 3 }, faces: [2, 0, 1, 0, 0, 4] } }]
    const html = renderToString(<CampaignScreen {...props} run={{ ...run, fights }} />)
    expect(html).toContain('Reliques · déclenchements')
    expect(html.replace(/<!-- -->/g, '')).toContain('×3')
    expect(html.replace(/<!-- -->/g, '')).toContain('×4')
  })
})
