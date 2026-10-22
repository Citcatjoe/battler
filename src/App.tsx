import { useEffect, useRef, useState } from 'react'
import type { Character } from './game/character'
import { simulateCombat, type CombatResult, type Pair } from './game/combat'
import { createCharacter } from './game/roster'
import { nextSeed, reportCombat } from './game/debugConsole'
import { recordMatch, recordTournamentWin } from './game/history'
import { randomSeed, seededRng } from './game/rng'
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
import {
  createSeasonTournament,
  currentDay,
  DEFAULT_SEASON_SIZE,
  SEASON_SIZES,
  inSeason,
  matchCount,
  pendingOfDay,
  playedCount,
  seasonFighters,
  seasonMatchSeed,
  simulateSeasonMatches,
  startBracket,
  WIN_POINTS,
  withSeasonResult,
  type SeasonSize,
} from './game/season'
import { getRelic } from './game/relics'
import {
  ACT_FIGHTS,
  BOSS,
  championOf,
  isBossNode,
  loadHeritage,
  loadRun,
  opponentOf,
  recordHeritage,
  saveRun,
  startRun,
  withEncounters,
  withFightResult,
  withReward,
  type CampaignRun,
  type Encounter,
} from './game/campaign'
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
import { SeasonScreen } from './components/SeasonScreen'
import { SoundToggle } from './components/SoundToggle'
import { Stage } from './components/Stage'
import { ChampionScreen } from './components/ChampionScreen'
import { CampaignScreen } from './components/CampaignScreen'

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
  /** Phase de saison d'un tournoi (classement, journées), avant l'arbre */
  | { name: 'season' }
  /** Sacre du champion, à la fin d'un tournoi */
  | { name: 'champion' }
  /** Campagne : choix du champion, carte de l'acte, récompense, fin de partie (docs/CAMPAGNE.md) */
  | { name: 'campaign' }

const matchTitle = (ref: MatchRef) =>
  ref.round === ROUND_NAMES.length - 1 ? 'Finale' : `${ROUND_NAMES[ref.round]} · Match ${ref.index + 1}`

/**
 * Résout un combat avec une graine (pour pouvoir le rejouer) et écrit sa trace dans la console. La graine est tirée
 * au hasard, sauf si la console en impose une (`battler.play`, debugConsole.ts), ou imposée par l'appelant (match
 * de saison : graine dérivée de celle de la saison).
 */
function runCombat(fighters: Pair<Character>, seed = nextSeed()): CombatResult {
  const result = simulateCombat(fighters, { seed })
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
  /** Cases des participants de la saison, à la plus grande taille ; la configuration n'en montre que la taille choisie */
  const [seasonSlots, setSeasonSlots] = useState<(string | null)[]>(() => Array(Math.max(...SEASON_SIZES)).fill(null))
  const [tournament, setTournament] = useState<Tournament | null>(null)
  /** Match de tournoi en cours via l'écran d'affrontement ; null en affrontement simple */
  const [activeMatch, setActiveMatch] = useState<MatchRef | null>(null)
  /** Match de saison en cours via l'écran d'affrontement (numéro dans la saison) */
  const [activeSeasonMatch, setActiveSeasonMatch] = useState<number | null>(null)
  /** Simulation de saison en cours : une journée, ou toute la saison, journée par journée */
  const [seasonRun, setSeasonRun] = useState<'day' | 'all' | null>(null)
  /** Réglage de l'écran de configuration : tournoi avec ou sans reliques, gardé pour le tournoi suivant */
  const [relicsEnabled, setRelicsEnabled] = useState(true)
  /** Noms uniques (une épithète par participant au lieu des chiffres romains), gardé pour le tournoi suivant */
  const [uniqueNames, setUniqueNames] = useState(false)
  /** Phase de saison avant l'arbre (désactivée par défaut) et nombre de participants, gardés pour le tournoi suivant */
  const [seasonSetup, setSeasonSetup] = useState<{ enabled: boolean; size: SeasonSize }>({ enabled: false, size: DEFAULT_SEASON_SIZE })

  // Campagne (docs/CAMPAGNE.md) : la partie en cours est enregistrée (campaign.ts, `saveRun`), et l'héritage de
  // chaque personnage aussi ; la rencontre en cours ne vit qu'en mémoire, le temps d'un combat.
  const [campaignRun, setCampaignRunState] = useState<CampaignRun | null>(loadRun)
  const [heritage, setHeritage] = useState(loadHeritage)
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(null)
  const setCampaignRun = (run: CampaignRun | null) => {
    saveRun(run)
    setCampaignRunState(run)
  }

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
  // Pas de paris pendant la saison ni en campagne : ni bourse, ni cotes
  const purse = activeSeasonMatch !== null || activeEncounter ? null : activeMatch ? wallets : duelWallets
  // Dernière bourse connue : deux paris posés dans la même image ne s'écrasent pas
  const purseRef = useRef(purse)
  purseRef.current = purse
  const setPurse = (w: Wallets) => {
    purseRef.current = w
    if (activeMatch) setWallets(w)
    else setDuelWallets(w)
  }
  const oddsId = `${betKey}:${fighters[0].id}-${fighters[1].id}`

  // Campagne : les rencontres du nœud en cours se règlent par simulation (quelques milliers de combats), après
  // l'affichage de la carte, pour qu'elle apparaisse aussitôt
  useEffect(() => {
    if (screen.name !== 'campaign' || !campaignRun || campaignRun.outcome || campaignRun.reward || campaignRun.encounters) return
    const id = setTimeout(() => setCampaignRun(withEncounters(campaignRun)), 60)
    return () => clearTimeout(id)
  }, [screen.name, campaignRun]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Simulation de saison : une journée par tâche, pour que l'écran suive (classement, journée) sans se figer.
  // Ni trace ni historique pour ces combats (season.ts, `simulateSeasonMatches`).
  useEffect(() => {
    if (!seasonRun || screen.name !== 'season' || !tournament || !inSeason(tournament)) return
    const day = currentDay(tournament.season)
    if (day === null) return setSeasonRun(null)
    const id = setTimeout(() => {
      setTournament(simulateSeasonMatches(tournament, pendingOfDay(tournament.season, day)))
      if (seasonRun === 'day') setSeasonRun(null)
    }, 0)
    return () => clearTimeout(id)
  }, [seasonRun, tournament, screen.name])

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
    // Campagne : le combat fait avancer la partie, sans historique (adversaires aux PV réglés, boss hors du roster)
    if (activeEncounter && campaignRun) {
      const next = withFightResult(campaignRun, activeEncounter, result)
      if (next.outcome) {
        recordHeritage(next)
        setHeritage(loadHeritage())
      }
      setCampaignRun(next)
    }
    // Match de saison regardé : comme un match de l'arbre, il compte dans l'historique (sans récompense)
    else if (activeSeasonMatch !== null && tournament) {
      setTournament(withSeasonResult(tournament, activeSeasonMatch, result))
      if (!result.forcedRolls) recordMatch(result, { tournament: true })
    } else if (activeMatch && tournament) applyResults(tournament, [[activeMatch, result]])
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
    if (!activeMatch && activeSeasonMatch === null && !activeEncounter) setDuelNumber((n) => n + 1)
    setScreen({ name: 'end', result, bets })
  }

  /** Nouveau duel : prime de relance d'un parieur ruiné. */
  const toDuel = () => {
    setActiveMatch(null)
    setActiveSeasonMatch(null)
    setDuelWallets((w) => relief(w, 'Nouveau duel'))
    go({ name: 'matchup' })
  }

  const openMatch = (ref: MatchRef) => {
    if (!tournament) return
    if (wallets) setWallets(reliefFor(wallets, ref.round))
    setActiveMatch(ref)
    setActiveSeasonMatch(null)
    setFighters(matchFighters(tournament, ref))
    go({ name: 'matchup' })
  }

  const openSeasonMatch = (number: number) => {
    if (!tournament || !inSeason(tournament)) return
    setActiveMatch(null)
    setActiveSeasonMatch(number)
    setFighters(seasonFighters(tournament.season, number))
    go({ name: 'matchup' })
  }

  /** Match de saison regardé : sa graine dérive de celle de la saison (hors saison, graine habituelle) */
  const seasonSeed = () =>
    activeSeasonMatch !== null && tournament?.season ? seasonMatchSeed(tournament.season, activeSeasonMatch) : nextSeed()

  /** Titre d'un match de saison à l'écran d'affrontement */
  const seasonMatchTitle = (number: number) => {
    const half = (tournament?.season?.entrants.length ?? 0) / 2
    return `Saison · Journée ${Math.floor(number / half) + 1} · Match ${(number % half) + 1}`
  }

  const progress = (() => {
    if (!tournament || champion(tournament) !== null) return null
    if (inSeason(tournament)) return `Saison : ${playedCount(tournament.season)} / ${matchCount(tournament.season)} matchs joués`
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

  const backToSeason = () => {
    setActiveSeasonMatch(null)
    go({ name: 'season' })
  }

  /** Partie de campagne en cours, sous la plaque de l'accueil */
  const campaignProgress =
    campaignRun && !campaignRun.outcome ? (isBossNode(campaignRun) ? BOSS.name : `Combat ${campaignRun.wins + 1} sur ${ACT_FIGHTS}`) : null

  /** Une rencontre de la carte : le champion à gauche, l'adversaire réglé à droite, par l'écran d'affrontement */
  const openEncounter = (encounter: Encounter) => {
    if (!campaignRun) return
    setActiveMatch(null)
    setActiveSeasonMatch(null)
    setActiveEncounter(encounter)
    setFighters([championOf(campaignRun), opponentOf(encounter)])
    go({ name: 'matchup' })
  }

  const backToCampaign = () => {
    setActiveEncounter(null)
    go({ name: 'campaign' })
  }

  /** Ce qui attend le champion après un combat de campagne (la partie est déjà à jour) */
  const campaignLabel = (run: CampaignRun) => {
    const name = championOf(run).name
    if (run.outcome === 'lost') return `${name} tombe : la partie s'arrête.`
    if (run.outcome === 'won') return `${name} terrasse ${BOSS.name} : l'acte est gagné !`
    if (run.reward) return `${name} gagne : ${run.reward.kind === 'relic' ? 'une relique' : 'une forge du dé'} l'attend.`
    return isBossNode(run) ? `${name} gagne : ${BOSS.name} l'attend.` : `${name} gagne : combat ${run.wins + 1} sur ${ACT_FIGHTS}.`
  }

  return (
    <Stage>
      <SoundToggle />
      {screen.name === 'home' && (
        <HomeScreen
          tournamentProgress={progress}
          campaignProgress={campaignProgress}
          onChoose={(choice) => {
            if (choice === 'test') return go({ name: 'test' })
            if (choice === 'campaign') return go({ name: 'campaign' })
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
          onResumeTournament={() => go({ name: tournament && inSeason(tournament) ? 'season' : 'bracket' })}
        />
      )}
      {screen.name === 'matchup' && (
        <MatchupScreen
          fighters={fighters}
          title={
            activeEncounter && campaignRun
              ? `Campagne · ${activeEncounter.boss ? 'Boss' : `Combat ${campaignRun.wins + 1} sur ${ACT_FIGHTS}`}`
              : activeMatch
                ? matchTitle(activeMatch)
                : activeSeasonMatch !== null
                  ? seasonMatchTitle(activeSeasonMatch)
                  : undefined
          }
          back={
            activeEncounter
              ? { label: 'Carte', icon: 'retour' }
              : activeMatch
                ? { label: 'Arbre', icon: 'retour' }
                : activeSeasonMatch !== null
                  ? { label: 'Saison', icon: 'retour' }
                  : undefined
          }
          // Les deux modes passent par le même moteur : jouer ne fait qu'animer le résultat.
          arena={arenaChoice}
          onArenaChange={setArenaChoice}
          onPlay={() => {
            // Le cri de guerre signe le lancement du combat animé, à la place du clic (SONS.md § 3)
            sfx.warCry()
            setScreen({ name: 'fight', script: runCombat(fighters, seasonSeed()), arena: resolveArena(arenaChoice) })
          }}
          onSimulate={() => {
            sfx.click()
            finish(runCombat(fighters, seasonSeed()))
          }}
          onBack={() => {
            // Revenir avant le combat annule les paris du match : les mises sont rendues
            if (purse) setPurse(cancelMatch(purse, betKey))
            if (activeEncounter) backToCampaign()
            else if (activeMatch) backToBracket()
            else if (activeSeasonMatch !== null) backToSeason()
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
            activeEncounter && campaignRun
              ? {
                  label: campaignLabel(campaignRun),
                  onContinue: backToCampaign,
                  icon: 'chroniques',
                  // Une victoire mène à sa récompense : le bouton le dit
                  ...(campaignRun.reward && { action: campaignRun.reward.kind === 'relic' ? 'Relique' : 'Forge du dé' }),
                }
              : activeSeasonMatch !== null
              ? {
                  label: `${screen.result.fighters[screen.result.winner].name} prend les ${WIN_POINTS} points du match.`,
                  onContinue: backToSeason,
                }
              : activeMatch && tournament
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
          seasonSlots={seasonSlots}
          onSeasonSlotsChange={setSeasonSlots}
          betting={bettingSetup}
          onBettingChange={setBettingSetup}
          relics={relicsEnabled}
          onRelicsChange={setRelicsEnabled}
          uniqueNames={uniqueNames}
          onUniqueNamesChange={setUniqueNames}
          season={seasonSetup}
          onSeasonChange={setSeasonSetup}
          onBack={() => go({ name: 'start' })}
          onValidate={(filled) => {
            const nameOf = (id: string) => createCharacter(id).name
            // Saison : `filled` sont ses participants, dans l'ordre de tirage ; l'arbre reste vide jusqu'à la fin de la
            // saison (startBracket). Les cases de l'arbre de la configuration ne servent pas.
            setTournament(
              seasonSetup.enabled
                ? createSeasonTournament(filled, nameOf, { relics: relicsEnabled, seed: randomSeed(), uniqueNames })
                : createTournament(filled, nameOf, { relics: relicsEnabled, epithets: uniqueNames ? seededRng(randomSeed()) : undefined }),
            )
            setActiveMatch(null)
            setActiveSeasonMatch(null)
            setSeasonRun(null)
            const names = bettingSetup.names.map((n, i) => n.trim() || DEFAULT_BETTOR_NAMES[i]) as Pair<string>
            setWallets(bettingSetup.enabled ? createWallets(names) : null)
            setDuelWallets((w) => ({ ...w, bettors: w.bettors.map((b, i) => (i < names.length ? { ...b, name: names[i] } : b)) }))
            setReliefRound(0)
            go({ name: seasonSetup.enabled ? 'season' : 'bracket' })
          }}
        />
      )}
      {screen.name === 'season' && tournament && inSeason(tournament) && (
        <SeasonScreen
          season={tournament.season}
          running={seasonRun}
          onPlay={openSeasonMatch}
          onSimulateDay={() => {
            sfx.click()
            setSeasonRun('day')
          }}
          onSimulateSeason={() => {
            sfx.click()
            setSeasonRun('all')
          }}
          onStop={() => {
            sfx.click()
            setSeasonRun(null)
          }}
          onStartBracket={() => {
            setTournament(startBracket(tournament))
            go({ name: 'bracket' })
          }}
          onMenu={() => {
            setSeasonRun(null)
            go({ name: 'home' })
          }}
        />
      )}
      {screen.name === 'bracket' && tournament && !inSeason(tournament) && (
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
      {screen.name === 'campaign' && (
        <CampaignScreen
          run={campaignRun}
          heritage={heritage}
          onStart={(championId, seed, item) => {
            sfx.click()
            setCampaignRun(startRun(championId, seed, item))
          }}
          onFight={openEncounter}
          onReward={(gain) => {
            sfx.click()
            if (campaignRun) setCampaignRun(withReward(campaignRun, gain))
          }}
          onAbandon={() => {
            if (!campaignRun) return
            sfx.click()
            // Abandonner compte comme une défaite : la partie s'arrête, et laisse son héritage
            const lost: CampaignRun = { ...campaignRun, outcome: 'lost', encounters: undefined }
            recordHeritage(lost)
            setHeritage(loadHeritage())
            setCampaignRun(lost)
          }}
          onNewRun={() => {
            sfx.click()
            setCampaignRun(null)
          }}
          onMenu={() => go({ name: 'home' })}
        />
      )}
    </Stage>
  )
}
