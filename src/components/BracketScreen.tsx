import { createCharacter } from '../game/roster'
import { champion, currentRound, readyMatches, ROUND_NAMES, type MatchRef, type Tournament } from '../game/tournament'
import { Bracket } from './Bracket'
import { Fighter } from './Fighter'

interface Props {
  tournament: Tournament
  onPlay: (ref: MatchRef) => void
  onSimulate: (refs: MatchRef[]) => void
  onNewTournament: () => void
  onMenu: () => void
}

/** Suivi du tournoi : l'arbre, les matchs à venir et, à la fin, le champion. */
export function BracketScreen({ tournament, onPlay, onSimulate, onNewTournament, onMenu }: Props) {
  const round = currentRound(tournament)
  const winnerIdx = champion(tournament)
  const winner = winnerIdx === null ? null : tournament.entrants[winnerIdx]
  const ready = readyMatches(tournament).filter((m) => m.round === round)
  const doneCount = Object.keys(tournament.results).length

  return (
    <div className="fade-in relative h-full bg-[radial-gradient(ellipse_at_50%_55%,#292524_0%,#0c0a09_70%)]">
      <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-8 pr-20 pt-6">
        <div>
          <button onClick={onMenu} className="text-sm font-bold text-stone-400 hover:text-stone-100">
            ← Menu
          </button>
          <h1 className="font-display text-4xl font-extrabold text-amber-200">Tournoi</h1>
          <p className="text-sm text-stone-400">
            {round === null ? 'Tournoi terminé' : ROUND_NAMES[round]} · {doneCount} / 15 matchs joués
          </p>
        </div>
        <div className="flex items-center gap-2 pt-6">
          {ready.length > 0 && (
            <button
              onClick={() => onSimulate(ready)}
              className="rounded-md border border-amber-500/70 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/10"
              title="Simule tous les matchs prêts de ce tour"
            >
              ⚡ Simuler le tour ({ready.length})
            </button>
          )}
          {winner && (
            <button
              onClick={onNewTournament}
              className="rounded-xl bg-amber-500 px-5 py-2.5 font-display font-extrabold tracking-wider text-stone-950 shadow-[0_4px_0_#92400e] hover:bg-amber-400"
            >
              NOUVEAU TOURNOI
            </button>
          )}
        </div>
      </header>

      <Bracket
        tournament={tournament}
        onPlay={onPlay}
        onSimulate={(ref) => onSimulate([ref])}
        center={
          winner ? (
            <div key="champion" className="fade-in flex flex-col items-center">
              <div className="h-[230px]">
                <Fighter character={createCharacter(winner.characterId)} side={0} state="victory" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">🏆 Champion</p>
              <p className="font-display text-3xl font-extrabold text-amber-200">{winner.label}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center pt-16 text-center">
              <span className="text-8xl drop-shadow-[0_6px_12px_rgba(245,158,11,0.35)]">🏆</span>
              <p className="mt-4 font-display text-2xl font-extrabold text-stone-300">Finale</p>
            </div>
          )
        }
      />
    </div>
  )
}
