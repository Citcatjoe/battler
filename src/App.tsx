import { useState } from 'react'
import type { Character } from './game/character'
import { simulateCombat, type CombatResult, type Pair } from './game/combat'
import { createCharacter } from './game/roster'
import { recordMatch, recordTournamentWin } from './game/history'
import {
  champion,
  createTournament,
  matchFighters,
  ROUND_NAMES,
  SLOTS,
  withResult,
  type MatchRef,
  type Tournament,
} from './game/tournament'
import { sfx } from './game/sound'
import { StartScreen, type GameMode } from './components/StartScreen'
import { MatchupScreen } from './components/MatchupScreen'
import { FightScreen } from './components/FightScreen'
import { EndScreen } from './components/EndScreen'
import { CharacterScreen } from './components/CharacterScreen'
import { RecordsScreen } from './components/RecordsScreen'
import { TournamentSetupScreen } from './components/TournamentSetupScreen'
import { BracketScreen } from './components/BracketScreen'
import { SoundToggle } from './components/SoundToggle'
import { Stage } from './components/Stage'

type Screen =
  | { name: 'start' }
  | { name: 'matchup' }
  | { name: 'fight'; script: CombatResult }
  | { name: 'end'; result: CombatResult }
  | { name: 'character'; id: string }
  | { name: 'records' }
  | { name: 'tournamentSetup' }
  | { name: 'bracket' }

const matchTitle = (ref: MatchRef) =>
  ref.round === ROUND_NAMES.length - 1 ? 'Finale' : `${ROUND_NAMES[ref.round]} · Match ${ref.index + 1}`

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'start' })
  const [mode, setMode] = useState<GameMode>('duel')
  const [fighters, setFighters] = useState<Pair<Character>>(() => [createCharacter('gorak'), createCharacter('elaria')])

  // Tournoi : en mémoire uniquement, perdu au rechargement de la page.
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(SLOTS).fill(null))
  const [tournament, setTournament] = useState<Tournament | null>(null)
  /** Match de tournoi en cours via l'écran d'affrontement ; null en affrontement simple */
  const [activeMatch, setActiveMatch] = useState<MatchRef | null>(null)

  const go = (next: Screen) => {
    sfx.click()
    setScreen(next)
  }

  /** Reporte des combats dans l'arbre, et sacre le champion si la finale vient d'être jouée. */
  const applyResults = (t: Tournament, done: [MatchRef, CombatResult][]) => {
    let next = t
    for (const [ref, result] of done) {
      recordMatch(result, { tournament: true })
      next = withResult(next, ref, result)
    }
    const champ = champion(next)
    if (champ !== null && champion(t) === null) recordTournamentWin(next.entrants[champ].characterId)
    setTournament(next)
    return next
  }

  // Tout combat terminé, joué ou simulé, est enregistré dans l'historique local.
  const finish = (result: CombatResult) => {
    if (activeMatch && tournament) applyResults(tournament, [[activeMatch, result]])
    else recordMatch(result)
    setScreen({ name: 'end', result })
  }

  const openMatch = (ref: MatchRef) => {
    if (!tournament) return
    setActiveMatch(ref)
    setFighters(matchFighters(tournament, ref))
    go({ name: 'matchup' })
  }

  const progress = (() => {
    if (!tournament || champion(tournament) !== null) return null
    return `${Object.keys(tournament.results).length} / 15 matchs joués`
  })()

  const backToBracket = () => {
    setActiveMatch(null)
    go({ name: 'bracket' })
  }

  return (
    <Stage>
      <SoundToggle />
      {screen.name === 'start' && (
        <StartScreen
          initial={fighters}
          mode={mode}
          onModeChange={setMode}
          onStart={(f) => {
            setActiveMatch(null)
            setFighters(f)
            go({ name: 'matchup' })
          }}
          onOpenCharacter={(id, current) => {
            setFighters(current)
            go({ name: 'character', id })
          }}
          onOpenRecords={(current) => {
            setFighters(current)
            go({ name: 'records' })
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
          backLabel={activeMatch ? '← ARBRE' : undefined}
          // Les deux modes passent par le même moteur : jouer ne fait qu'animer le résultat.
          onPlay={() => go({ name: 'fight', script: simulateCombat(fighters) })}
          onSimulate={() => {
            sfx.click()
            finish(simulateCombat(fighters))
          }}
          onBack={activeMatch ? backToBracket : () => go({ name: 'start' })}
        />
      )}
      {screen.name === 'fight' && <FightScreen script={screen.script} onEnd={finish} />}
      {screen.name === 'end' && (
        <EndScreen
          result={screen.result}
          onReplay={() => go({ name: 'matchup' })}
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
                  onContinue: backToBracket,
                }
              : undefined
          }
        />
      )}
      {screen.name === 'character' && (
        <CharacterScreen
          characterId={screen.id}
          onSelect={(id) => go({ name: 'character', id })}
          onBack={() => go({ name: 'start' })}
        />
      )}
      {screen.name === 'records' && (
        <RecordsScreen onOpenCharacter={(id) => go({ name: 'character', id })} onBack={() => go({ name: 'start' })} />
      )}
      {screen.name === 'tournamentSetup' && (
        <TournamentSetupScreen
          slots={slots}
          onChange={setSlots}
          onBack={() => go({ name: 'start' })}
          onValidate={(filled) => {
            setTournament(createTournament(filled, (id) => createCharacter(id).name))
            setActiveMatch(null)
            go({ name: 'bracket' })
          }}
        />
      )}
      {screen.name === 'bracket' && tournament && (
        <BracketScreen
          tournament={tournament}
          onPlay={openMatch}
          onSimulate={(refs) => {
            sfx.click()
            applyResults(
              tournament,
              refs.map((ref) => [ref, simulateCombat(matchFighters(tournament, ref))]),
            )
          }}
          onNewTournament={() => go({ name: 'tournamentSetup' })}
          onMenu={() => go({ name: 'start' })}
        />
      )}
    </Stage>
  )
}
