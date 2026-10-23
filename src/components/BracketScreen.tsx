import tournamentImg from '../assets/menu-tournament.jpg'
import { createCharacter } from '../game/roster'
import { champion, currentRound, players, readyMatches, ROUND_NAMES, type MatchRef, type Tournament } from '../game/tournament'
import { Bracket } from './Bracket'
import { Fighter } from './Fighter'
import { Icon } from './Icon'
import type { Wallets } from '../game/betting'
import { Standings } from './Betting'
import { BackLink, Button, Glyph } from './kit'

interface Props {
  tournament: Tournament
  onPlay: (ref: MatchRef) => void
  onSimulate: (refs: MatchRef[]) => void
  /** Tournoi terminé : revoir l'écran du champion */
  onChampion: () => void
  onNewTournament: () => void
  onMenu: () => void
  /** Bourses des deux parieurs (docs/PARIS.md) ; absent : tournoi sans paris */
  wallets?: Wallets | null
}

/** Suivi du tournoi : l'arbre, les matchs à venir et, à la fin, le champion. */
export function BracketScreen({ tournament, onPlay, onSimulate, onChampion, onNewTournament, onMenu, wallets }: Props) {
  const round = currentRound(tournament)
  const winnerIdx = champion(tournament)
  const winner = winnerIdx === null ? null : tournament.entrants[winnerIdx]
  const ready = readyMatches(tournament).filter((m) => m.round === round)
  const doneCount = Object.keys(tournament.results).length
  // Le prochain match de l'arbre, dans l'ordre de l'arbre : le bouton « Combattre » l'ouvre, comme un clic sur lui
  const next = ready[0]
  const nextNames = next && players(tournament, next).map((i) => (i === null ? '?' : tournament.entrants[i].label))

  return (
    <div className="fade-in relative isolate h-full">
      {/* Même décor que la configuration : la porte de l'arène, très assombrie (refonte 0.47.0) */}
      <img
        src={tournamentImg}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover"
        style={{ filter: 'brightness(0.2) saturate(0.7)' }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_55%,transparent_20%,rgba(14,11,9,0.85)_100%)]" />
      <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-8 pr-20 pt-5">
        <div>
          <BackLink onClick={onMenu}>Menu</BackLink>
          <h1 className="on-illus mt-1 font-display text-[44px] font-bold leading-none tracking-wide text-gold-200">Tournoi</h1>
          <p className="mt-1 font-body text-[15px] text-ink-2">
            {round === null ? 'Tournoi terminé' : ROUND_NAMES[round]} · {doneCount} / 15 matchs joués
          </p>
          {wallets && (
            <div className="mt-2" title="Classement des parieurs. Les joueurs parient en ouvrant un match (Affronter) ; Borin et Zlatka parient sur tous les matchs.">
              <Standings wallets={wallets} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 pt-6">
          {ready.length > 0 && (
            <Button variant="secondary" size="md" icon="simuler" onClick={() => onSimulate(ready)} title="Simule tous les matchs prêts de ce tour">
              Simuler le tour ({ready.length})
            </Button>
          )}
          {next && (
            <Button
              variant="primary"
              size="xl"
              icon="combattre"
              onClick={() => onPlay(next)}
              title={`Prochain match : ${nextNames.join(' contre ')} (${ROUND_NAMES[next.round]})`}
            >
              Combattre
            </Button>
          )}
          {winner && (
            <Button variant="secondary" size="md" icon="tournoi" onClick={onChampion}>
              Le champion
            </Button>
          )}
          {winner && (
            <Button variant="primary" size="xl" icon="tournoi" onClick={onNewTournament}>
              Nouveau tournoi
            </Button>
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
              <p className="flex items-center gap-1.5 font-display text-[15px] font-bold uppercase tracking-[0.16em] text-gold-300">
                <Glyph name="tournoi" size={18} /> Champion
              </p>
              <p className="font-display text-[32px] font-semibold text-gold-200">{winner.label}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center pt-16 text-center">
              <Icon name="trophy" className="h-28 w-28" />
              <p className="mt-4 font-display text-[22px] font-semibold tracking-wide text-ink-2">Finale</p>
            </div>
          )
        }
      />
    </div>
  )
}
