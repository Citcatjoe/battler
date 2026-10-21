import { useEffect, useRef, useState } from 'react'
import type { Character } from './game/character'
import { simulateCombat, type CombatResult, type Pair } from './game/combat'
import { createCharacter } from './game/roster'
import { nextSeed, reportCombat } from './game/debugConsole'
import { recordMatch, recordTournamentWin } from './game/history'
import {
  champion,
  championRun,
  chooseRelic,
  createTournament,
  matchFighters,
  matchKey,
  ROUND_NAMES,
  SLOTS,
  withResult,
  type MatchRef,
  type Tournament,
} from './game/tournament'
import { getRelic } from './game/relics'
import { music, sfx } from './game/sound'
import {
  cancelBet,
  cancelMatch,
  createWallets,
  DEFAULT_BETTOR_NAMES,
  placeBet,
  placeBotBets,
  priceMatch,
  relief,
  settleMatch,
  worthOf,
  type MatchOdds,
  type Wallets,
} from './game/betting'
import type { BetsOutcome } from './components/Betting'
import { RANDOM_ARENA, resolveArena, type Arena, type ArenaChoice } from './game/arenas'
import { StartScreen, type GameMode } from './components/StartScreen'
import { HomeScreen } from './components/HomeScreen'
import { MatchupScreen } from './components/MatchupScreen'
import { FightScreen } from './components/FightScreen'
import { TestFightScreen } from './components/TestFightScreen'
import { EndScreen } from './components/EndScreen'
import { CompendiumScreen } from './components/compendium/CompendiumScreen'
import type { CompendiumSectionId } from './components/compendium/sections'
import { RecordsScreen } from './components/RecordsScreen'
import { TournamentSetupScreen } from './components/TournamentSetupScreen'
import { BracketScreen } from './components/BracketScreen'
import { SoundToggle } from './components/SoundToggle'
import { Stage } from './components/Stage'
import { ChampionScreen } from './components/ChampionScreen'

/** Écrans d'où l'on ouvre le compendium ou les statistiques, et où l'on y revient */
type Origin = 'home' | 'start'

type Screen =
  /** Accueil : menu des modes de jeu */
  | { name: 'home' }
  /** Combat test : chaque dé choisi par le joueur, hors statistiques */
  | { name: 'test' }
  | { name: 'start' }
  | { name: 'matchup' }
  | { name: 'fight'; script: CombatResult; arena: Arena }
  /** `bets` : règlement des paris du match, s'il y en avait */
  | { name: 'end'; result: CombatResult; bets?: BetsOutcome }
  /** `from` : écran où revient le bouton retour ; `focus` : élément visé par un lien (compétence, statut, règle) */
  | { name: 'compendium'; section: CompendiumSectionId; characterId: string; focus?: string; from: Origin | 'records' }
  | { name: 'records' }
  | { name: 'tournamentSetup' }
  | { name: 'bracket' }
  /** Sacre du champion, à la fin d'un tournoi */
  | { name: 'champion' }

const matchTitle = (ref: MatchRef) =>
  ref.round === ROUND_NAMES.length - 1 ? 'Finale' : `${ROUND_NAMES[ref.round]} · Match ${ref.index + 1}`

/**
 * Résout un combat avec une graine (pour pouvoir le rejouer) et écrit sa trace dans la console. La graine est tirée
 * au hasard, sauf si la console en impose une (`battler.play`, debugConsole.ts).
 */
function runCombat(fighters: Pair<Character>): CombatResult {
  const result = simulateCombat(fighters, { seed: nextSeed() })
  reportCombat(result)
  return result
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [mode, setMode] = useState<GameMode>('duel')
  const [fighters, setFighters] = useState<Pair<Character>>(() => [createCharacter('gorak'), createCharacter('elaria')])
  // Écran d'où les statistiques ont été ouvertes : il survit à un passage par une fiche du compendium
  const [recordsFrom, setRecordsFrom] = useState<Origin>('start')
  // Arène choisie sur l'écran d'affrontement, gardée pour les combats suivants de la session
  const [arenaChoice, setArenaChoice] = useState<ArenaChoice>(RANDOM_ARENA)

  // Tournoi : en mémoire uniquement, perdu au rechargement de la page.
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(SLOTS).fill(null))
  const [tournament, setTournament] = useState<Tournament | null>(null)
  /** Match de tournoi en cours via l'écran d'affrontement ; null en affrontement simple */
  const [activeMatch, setActiveMatch] = useState<MatchRef | null>(null)
  /** Réglage de l'écran de configuration : tournoi avec ou sans reliques, gardé pour le tournoi suivant */
  const [relicsEnabled, setRelicsEnabled] = useState(true)

  // Paris entre deux observateurs (docs/PARIS.md) : une bourse par tournoi, une autre pour les duels
  // de la session. En mémoire seulement, comme le tournoi.
  const [bettingSetup, setBettingSetup] = useState<{ enabled: boolean; names: Pair<string> }>({
    enabled: true,
    names: [...DEFAULT_BETTOR_NAMES],
  })
  const [wallets, setWallets] = useState<Wallets | null>(null)
  const [duelWallets, setDuelWallets] = useState<Wallets>(() => createWallets())
  /** Numéro du duel en cours : chaque duel a ses cotes et son coup de théâtre */
  const [duelNumber, setDuelNumber] = useState(1)
  /** Dernier tour du tournoi pour lequel la prime de relance a été examinée */
  const [reliefRound, setReliefRound] = useState(0)
  const [odds, setOdds] = useState<MatchOdds | null>(null)
  const betKey = activeMatch ? `t-${activeMatch.round}-${activeMatch.index}` : `d-${duelNumber}`
  const purse = activeMatch ? wallets : duelWallets
  // Dernière bourse connue : deux paris posés dans la même image ne s'écrasent pas
  const purseRef = useRef(purse)
  purseRef.current = purse
  const setPurse = (w: Wallets) => {
    purseRef.current = w
    if (activeMatch) setWallets(w)
    else setDuelWallets(w)
  }
  const oddsId = `${betKey}:${fighters[0].id}-${fighters[1].id}`

  // Tapis sonore (docs/SONS.md § 10) : une boucle au hasard pendant chaque combat joué, en fondu
  const fightScript = screen.name === 'fight' ? screen.script : null
  useEffect(() => {
    if (!fightScript) return
    music.start()
    return () => music.stop()
  }, [fightScript])

  // Cotes du match, calculées une fois l'écran d'affrontement affiché (quelques centaines de combats simulés)
  useEffect(() => {
    if (screen.name !== 'matchup' || !purse) return
    if (odds && `${odds.key}:${fighters[0].id}-${fighters[1].id}` === oddsId) return
    setOdds(null)
    const id = setTimeout(() => setOdds(priceMatch(fighters, betKey)), 60)
    return () => clearTimeout(id)
  }, [screen.name, oddsId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Les parieurs de l'ordinateur misent dès que les cotes du match sont prêtes
  useEffect(() => {
    if (screen.name !== 'matchup' || !odds || !purseRef.current) return
    const next = placeBotBets(purseRef.current, odds)
    if (next !== purseRef.current) setPurse(next)
  }, [screen.name, odds]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Prime de relance d'un tournoi au premier match d'un nouveau tour ; renvoie les bourses à jour. */
  const reliefFor = (w: Wallets, round: number) => {
    if (round <= reliefRound) return w
    setReliefRound(round)
    return relief(w, ROUND_NAMES[round])
  }

  const go = (next: Screen) => {
    sfx.click()
    setScreen(next)
  }

  /** Reporte des combats dans l'arbre, et sacre le champion si la finale vient d'être jouée. */
  const applyResults = (t: Tournament, done: [MatchRef, CombatResult][]) => {
    let next = t
    for (const [ref, result] of done) {
      // L'arbre valide d'abord le match (prêt, bons combattants) : rien n'est enregistré sinon.
      next = withResult(next, ref, result)
      if (!result.forcedRolls) recordMatch(result, { tournament: true })
    }
    const champ = champion(next)
    const crowned = champ !== null && champion(t) === null
    if (crowned) recordTournamentWin(next.entrants[champ].characterId)
    setTournament(next)
    return { next, crowned }
  }

  // Tout combat terminé, joué ou simulé, est enregistré dans l'historique local, sauf s'il a été
  // triché (dés imposés) : il fausserait les statistiques. Sa trace finale, différente de celle
  // écrite au départ, est enregistrée à part (fichier « _triche » dans logs/combats/).
  const finish = (result: CombatResult) => {
    if (result.forcedRolls) reportCombat(result)
    if (activeMatch && tournament) applyResults(tournament, [[activeMatch, result]])
    else if (!result.forcedRolls) recordMatch(result)
    // Règlement des paris du match : mise × cote au gagnant ; combat triché, mises rendues
    let bets: Extract<Screen, { name: 'end' }>['bets']
    if (purse && odds && odds.key === betKey && purse.bets[betKey]) {
      const { wallets: next, entries } = settleMatch(purse, odds, result)
      setPurse(next)
      const ids = next.bettors.map((_, i) => i)
      bets = {
        entries,
        bettors: next.bettors,
        before: ids.map((b) => worthOf(purse, b)),
        after: ids.map((b) => worthOf(next, b)),
        line: odds.line,
        ...(odds.twist && { twist: odds.twist }),
      }
      if (entries.some((e) => e.kind === 'settle' && e.won)) sfx.coinWin()
    }
    if (!activeMatch) setDuelNumber((n) => n + 1)
    setScreen({ name: 'end', result, bets })
  }

  /** Nouveau duel : prime de relance d'un parieur ruiné. */
  const toDuel = () => {
    setActiveMatch(null)
    setDuelWallets((w) => relief(w, 'Nouveau duel'))
    go({ name: 'matchup' })
  }

  const openMatch = (ref: MatchRef) => {
    if (!tournament) return
    if (wallets) setWallets(reliefFor(wallets, ref.round))
    setActiveMatch(ref)
    setFighters(matchFighters(tournament, ref))
    go({ name: 'matchup' })
  }

  const progress = (() => {
    if (!tournament || champion(tournament) !== null) return null
    return `${Object.keys(tournament.results).length} / 15 matchs joués`
  })()

  const openRecords = (from: Origin) => {
    setRecordsFrom(from)
    go({ name: 'records' })
  }

  /** Libellé du lien de retour (BackLink : la flèche est son glyphe) */
  const backLabel = (from: Origin | 'records') =>
    ({ home: 'Retour au menu', start: 'Retour à la sélection', records: 'Retour aux statistiques' })[from]

  const backToBracket = () => {
    setActiveMatch(null)
    go({ name: 'bracket' })
  }

  return (
    <Stage>
      <SoundToggle />
      {screen.name === 'home' && (
        <HomeScreen
          tournamentProgress={progress}
          onChoose={(choice) => {
            if (choice === 'test') return go({ name: 'test' })
            setMode(choice)
            go({ name: 'start' })
          }}
          onOpenRecords={() => openRecords('home')}
          onOpenCompendium={() =>
            go({ name: 'compendium', section: 'characters', characterId: fighters[0].id, from: 'home' })
          }
        />
      )}
      {screen.name === 'start' && (
        <StartScreen
          initial={fighters}
          mode={mode}
          onHome={() => go({ name: 'home' })}
          onStart={(f) => {
            setFighters(f)
            toDuel()
          }}
          onOpenCharacter={(id, current) => {
            setFighters(current)
            go({ name: 'compendium', section: 'characters', characterId: id, from: 'start' })
          }}
          onOpenCompendium={(current) => {
            setFighters(current)
            go({ name: 'compendium', section: 'characters', characterId: current[0].id, from: 'start' })
          }}
          onOpenRecords={(current) => {
            setFighters(current)
            openRecords('start')
          }}
          tournamentProgress={progress}
          onNewTournament={() => go({ name: 'tournamentSetup' })}
          onResumeTournament={() => go({ name: 'bracket' })}
        />
      )}
      {screen.name === 'matchup' && (
        <MatchupScreen
          fighters={fighters}
          title={activeMatch ? matchTitle(activeMatch) : undefined}
          back={activeMatch ? { label: 'Arbre', icon: 'retour' } : undefined}
          // Les deux modes passent par le même moteur : jouer ne fait qu'animer le résultat.
          arena={arenaChoice}
          onArenaChange={setArenaChoice}
          onPlay={() => go({ name: 'fight', script: runCombat(fighters), arena: resolveArena(arenaChoice) })}
          onSimulate={() => {
            sfx.click()
            finish(runCombat(fighters))
          }}
          onBack={() => {
            // Revenir avant le combat annule les paris du match : les mises sont rendues
            if (purse) setPurse(cancelMatch(purse, betKey))
            if (activeMatch) backToBracket()
            else go({ name: 'start' })
          }}
          betting={
            purse
              ? {
                  wallets: purse,
                  odds,
                  onBet: (bettor, pick, choice) => {
                    if (!odds || !purseRef.current) return 'Cotes en calcul'
                    const r = placeBet(purseRef.current, odds, bettor, pick, choice)
                    if (!r.ok) return r.reason
                    setPurse(r.wallets)
                    return null
                  },
                  onCancel: (bettor) => purseRef.current && setPurse(cancelBet(purseRef.current, betKey, bettor)),
                  onReset: activeMatch ? undefined : () => setDuelWallets(createWallets(bettingSetup.names)),
                }
              : undefined
          }
        />
      )}
      {screen.name === 'fight' && <FightScreen script={screen.script} arena={screen.arena} onEnd={finish} />}
      {screen.name === 'test' && (
        <TestFightScreen initial={[fighters[0].id, fighters[1].id]} onMenu={() => go({ name: 'home' })} />
      )}
      {screen.name === 'end' && (
        <EndScreen
          result={screen.result}
          bets={screen.bets}
          onReplay={toDuel}
          onMenu={() => go({ name: 'start' })}
          tournament={
            activeMatch && tournament
              ? {
                  label:
                    activeMatch.round === ROUND_NAMES.length - 1
                      ? `${screen.result.fighters[screen.result.winner].name} remporte le tournoi !`
                      : `${screen.result.fighters[screen.result.winner].name} se qualifie pour les ${ROUND_NAMES[
                          activeMatch.round + 1
                        ].toLowerCase()}.`,
                  // Après la finale, le sacre du champion ; sinon, retour à l'arbre
                  onContinue:
                    activeMatch.round === ROUND_NAMES.length - 1
                      ? () => {
                          setActiveMatch(null)
                          go({ name: 'champion' })
                        }
                      : backToBracket,
                  // Récompense du vainqueur (hors finale) : son choix, que l'observateur peut changer
                  reward: (() => {
                    const relic = tournament.results[matchKey(activeMatch)]?.relic
                    if (!relic) return undefined
                    return {
                      offer: relic.offer.map(getRelic),
                      chosen: relic.chosen,
                      onChoose: (id: string) => setTournament((t) => t && chooseRelic(t, activeMatch, id)),
                    }
                  })(),
                }
              : undefined
          }
        />
      )}
      {screen.name === 'compendium' && (
        <CompendiumScreen
          section={screen.section}
          characterId={screen.characterId}
          focus={screen.focus}
          // Navigation interne : sans son de clic en double (les onglets jouent déjà le leur). Un lien vers un
          // combattant change le combattant affiché ; un lien vers une autre section vise l'un de ses éléments.
          onNavigate={(to) =>
            setScreen(
              to.section === 'characters'
                ? { ...screen, section: 'characters', characterId: to.id ?? screen.characterId }
                : { ...screen, section: to.section, focus: to.id },
            )
          }
          onOpenRecords={() => (screen.from === 'records' ? go({ name: 'records' }) : openRecords(screen.from))}
          onBack={() => go({ name: screen.from })}
          backLabel={backLabel(screen.from)}
        />
      )}
      {screen.name === 'records' && (
        <RecordsScreen
          onOpenCharacter={(id) => go({ name: 'compendium', section: 'characters', characterId: id, from: 'records' })}
          onBack={() => go({ name: recordsFrom })}
          backLabel={backLabel(recordsFrom)}
        />
      )}
      {screen.name === 'tournamentSetup' && (
        <TournamentSetupScreen
          slots={slots}
          onChange={setSlots}
          betting={bettingSetup}
          onBettingChange={setBettingSetup}
          relics={relicsEnabled}
          onRelicsChange={setRelicsEnabled}
          onBack={() => go({ name: 'start' })}
          onValidate={(filled) => {
            setTournament(createTournament(filled, (id) => createCharacter(id).name, { relics: relicsEnabled }))
            setActiveMatch(null)
            const names = bettingSetup.names.map((n, i) => n.trim() || DEFAULT_BETTOR_NAMES[i]) as Pair<string>
            setWallets(bettingSetup.enabled ? createWallets(names) : null)
            setDuelWallets((w) => ({ ...w, bettors: w.bettors.map((b, i) => (i < names.length ? { ...b, name: names[i] } : b)) }))
            setReliefRound(0)
            go({ name: 'bracket' })
          }}
        />
      )}
      {screen.name === 'bracket' && tournament && (
        <BracketScreen
          tournament={tournament}
          wallets={wallets}
          onPlay={openMatch}
          onSimulate={(refs) => {
            sfx.click()
            // Matchs simulés depuis l'arbre : seuls les parieurs de l'ordinateur misent (pas de guichet de tour)
            let w = wallets && refs.length ? reliefFor(wallets, Math.max(...refs.map((r) => r.round))) : wallets
            const done = refs.map((ref): [MatchRef, CombatResult] => {
              const pair = matchFighters(tournament, ref)
              const result = runCombat(pair)
              if (w) {
                const matchOdds = priceMatch(pair, `t-${ref.round}-${ref.index}`)
                w = settleMatch(placeBotBets(w, matchOdds), matchOdds, result).wallets
              }
              return [ref, result]
            })
            if (w) setWallets(w)
            const { crowned } = applyResults(tournament, done)
            // Finale simulée : on passe directement au sacre du champion
            if (crowned) go({ name: 'champion' })
          }}
          onChampion={() => go({ name: 'champion' })}
          onNewTournament={() => go({ name: 'tournamentSetup' })}
          onMenu={() => go({ name: 'home' })}
        />
      )}
      {screen.name === 'champion' && tournament && championRun(tournament) && (
        <ChampionScreen
          run={championRun(tournament)!}
          wallets={wallets}
          onBracket={() => go({ name: 'bracket' })}
          onNewTournament={() => go({ name: 'tournamentSetup' })}
          onMenu={() => go({ name: 'home' })}
        />
      )}
    </Stage>
  )
}
