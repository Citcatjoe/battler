import { useEffect, useRef, useState } from 'react'
import seasonImg from '../assets/menu-season.jpg'
import { createCharacter } from '../game/roster'
import { champion, currentRound, nextMatch, readyMatches, ROUND_NAMES, ROUNDS, type MatchRef, type Tournament } from '../game/tournament'
import { humansOf, type Wallets } from '../game/betting'
import { Bracket } from './Bracket'
import { Fighter } from './Fighter'
import { BettingPanel, humansWhoBet } from './Betting'
import { BackLink, Button, Glyph, SquareButton } from './kit'
import { TrophySeal } from './VsSeal'

interface Props {
  tournament: Tournament
  onPlay: (ref: MatchRef) => void
  onSimulate: (refs: MatchRef[]) => void
  /** Tournoi terminé : revoir l'écran du champion */
  onChampion: () => void
  onNewTournament: () => void
  onMenu: () => void
  /** Bourses des parieurs (docs/PARIS.md) ; absent : tournoi sans paris */
  wallets?: Wallets | null
  /** Page de référence seulement : panneau Paris ouvert d'emblée, carte montrée survolée */
  initialBetsOpen?: boolean
  hovered?: MatchRef
}

/**
 * Suivi du tournoi (refonte 0.100.0, docs/ref/tournoi-arbre-survol.png) : l'intitulé du tour au centre, l'arbre, et en
 * bas le grand bouton « Prochain combat » entre le bouton Paris (panneau du classement) et « Simuler le tour ».
 */
export function BracketScreen({ tournament, onPlay, onSimulate, onChampion, onNewTournament, onMenu, wallets, initialBetsOpen = false, hovered }: Props) {
  const round = currentRound(tournament)
  const winnerIdx = champion(tournament)
  const winner = winnerIdx === null ? null : tournament.entrants[winnerIdx]
  const ready = readyMatches(tournament).filter((m) => m.round === round)
  const doneCount = Object.keys(tournament.results).length
  // Le prochain match, dans l'ordre de jeu (`playOrder`) : le grand bouton l'ouvre, comme « Affronter » sur sa carte
  const next = nextMatch(tournament)
  // Mises des joueurs sur ce tour (clés de pari `t-<tour>-<match>`, App.tsx) ; tournoi fini : sur la finale
  const placed = wallets ? humansWhoBet(wallets, `t-${round ?? ROUNDS - 1}-`).length : 0

  const [betsOpen, setBetsOpen] = useState(initialBetsOpen)
  const betsRef = useRef<HTMLDivElement>(null)
  // Le panneau se ferme par Échap ou par un clic hors de lui (et hors de son bouton)
  useEffect(() => {
    if (!betsOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setBetsOpen(false)
    const onDown = (e: PointerEvent) => {
      if (!betsRef.current?.contains(e.target as Node)) setBetsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [betsOpen])

  return (
    <div className="fade-in relative isolate h-full">
      {/* L'arène vue du ciel, combats en cours (menu-season.jpg, même décor que la saison), assombrie sous l'arbre */}
      <img
        src={seasonImg}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover"
        style={{ filter: 'brightness(0.35) saturate(0.8)' }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_55%,transparent_20%,rgba(14,11,9,0.85)_100%)]" />

      <BackLink onClick={onMenu} className="absolute left-9 top-10 z-10">
        Menu
      </BackLink>
      <header className="pointer-events-none absolute inset-x-0 top-7 z-10 flex flex-col items-center text-center">
        <p className="font-display text-[14px] font-semibold uppercase tracking-[0.3em] text-ink-2">Tournoi</p>
        <h1 className="on-illus mt-1 font-display text-[36px] font-bold uppercase leading-none tracking-wide text-gold-300">
          {round === null ? 'Tournoi terminé' : ROUND_NAMES[round]}
        </h1>
        <p className="mt-3 font-data text-[13px] text-ink-3">{doneCount} / 15 combats joués</p>
      </header>

      <Bracket
        tournament={tournament}
        onPlay={onPlay}
        onSimulate={(ref) => onSimulate([ref])}
        next={next}
        hovered={hovered}
        center={
          winner ? (
            <div key="champion" className="fade-in flex flex-col items-center">
              <div className="mt-14 h-[150px]">
                <Fighter character={createCharacter(winner.characterId)} side={0} state="victory" />
              </div>
              <p className="flex items-center gap-1.5 font-display text-[15px] font-bold uppercase tracking-[0.16em] text-gold-300">
                <Glyph name="tournoi" size={18} /> Champion
              </p>
              <p className="font-display text-[28px] font-semibold leading-tight text-gold-200">{winner.label}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center pt-[102px]">
              <TrophySeal />
              <p className="mt-6 font-display text-[16px] font-bold uppercase tracking-[0.3em] text-ink-1">Finale</p>
            </div>
          )
        }
      />

      {/* Le grand bouton reste au centre ; Paris à sa gauche, Simuler le tour (ou, à la fin, Le champion) à sa droite */}
      <footer className="absolute inset-x-0 bottom-7 z-20 flex items-center gap-6">
        <div className="flex flex-1 justify-end">
          <div ref={betsRef} className="relative flex w-[60px] justify-center">
          {wallets && (
            <>
              {betsOpen && (
                <div className="absolute bottom-[calc(100%+40px)] left-[-34px]">
                  <BettingPanel id="bracket-bets" wallets={wallets} placed={placed} />
                </div>
              )}
              <SquareButton
                icon="parier"
                label="Paris"
                badge={`${placed}/${humansOf(wallets).length}`}
                aria-expanded={betsOpen}
                aria-controls="bracket-bets"
                onClick={() => setBetsOpen((o) => !o)}
              />
            </>
          )}
          </div>
        </div>
        <Button
          variant="primary"
          size="xl"
          icon={winner ? 'tournoi' : 'combattre'}
          disabled={!winner && !next}
          onClick={() => (winner ? onNewTournament() : next && onPlay(next))}
          className="w-[440px]"
        >
          {winner ? 'Nouveau tournoi' : 'Prochain combat'}
        </Button>
        <div className="flex flex-1 justify-start">
          {winner ? (
            <Button variant="secondary" size="md" icon="tournoi" onClick={onChampion}>
              Le champion
            </Button>
          ) : (
            ready.length > 0 && (
              <div className="flex w-[60px] justify-center">
                <SquareButton
                  icon="simuler"
                  label={`Simuler le tour (${ready.length} combat${ready.length > 1 ? 's' : ''})`}
                  badge={`×${ready.length}`}
                  onClick={() => onSimulate(ready)}
                />
              </div>
            )
          )}
        </div>
      </footer>
    </div>
  )
}
