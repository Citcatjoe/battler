import tournamentImg from '../assets/menu-tournament.jpg'
import { Icon } from './Icon'
import { BackLink, Button } from './kit'

interface Props {
  /** Retour à l'écran d'accueil */
  onHome: () => void
  /** Tournoi en cours : sa progression, sous « Reprendre le tournoi » ; null : aucun */
  tournamentProgress: string | null
  onNewTournament: () => void
  onResumeTournament: () => void
}

/**
 * Présentation du tournoi, choisie sur l'accueil (« Tournoi ») : créer un tournoi, ou reprendre celui en cours. Seul
 * reste de l'ancien écran de sélection (StartScreen) : la sélection du duel se fait sur l'écran d'affrontement (0.100.0).
 */
export function TournamentIntroScreen({ onHome, tournamentProgress, onNewTournament, onResumeTournament }: Props) {
  return (
    <div className="fade-in relative isolate flex h-full flex-col items-center gap-5 px-8 py-8">
      {/* Porte de l'arène vue du parvis : la porte (30 % de la largeur) éclaire le champion à contre-jour */}
      <img
        src={tournamentImg}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-[50%_50%]"
        style={{ filter: 'brightness(0.8) saturate(0.95)' }}
      />
      {/* Moitié droite assombrie pour le texte, coins en vignettage */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-l from-stone-950/90 via-stone-950/55 via-45% to-transparent to-70%" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_30%_60%,transparent_35%,rgba(12,10,9,0.75)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[30%] bg-gradient-to-t from-stone-950/85 to-transparent" />
      <BackLink onClick={onHome} className="absolute left-10 top-[36px] z-20">
        Menu
      </BackLink>
      <header className="relative z-20 text-center">
        <h1 className="font-display text-6xl font-extrabold tracking-widest text-amber-200 drop-shadow-[0_4px_0_#78350f]">
          BATTLER
        </h1>
      </header>

      {/* Moitié droite, sur le mur sombre : présentation et actions */}
      <div className="absolute right-24 top-1/2 flex w-[600px] -translate-y-[40%] flex-col items-center gap-8 text-center">
        <div>
          <Icon name="trophy" className="mx-auto h-20 w-20 drop-shadow-[0_0_24px_rgba(251,191,36,0.35)]" />
          <p className="mt-3 font-display text-4xl font-extrabold tracking-wide text-amber-200 drop-shadow-[0_3px_0_#78350f]">
            Tournoi à élimination directe
          </p>
          <div className="mx-auto mt-4 h-px w-48 bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />
          <p className="mt-4 text-lg leading-relaxed text-stone-300">
            16 participants, des huitièmes de finale jusqu'à la finale. Un même personnage peut être engagé plusieurs
            fois. Chaque match se joue ou se simule, et compte dans les statistiques.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Button variant="primary" size="xl" icon="tournoi" onClick={onNewTournament} className="w-[460px]">
            {tournamentProgress ? 'Nouveau tournoi' : 'Créer un tournoi'}
          </Button>
          {tournamentProgress && (
            <>
              <Button variant="secondary" size="md" icon="combattre" onClick={onResumeTournament} className="w-[460px]">
                Reprendre le tournoi
              </Button>
              <p className="text-sm text-stone-400">{tournamentProgress}</p>
            </>
          )}
        </div>
      </div>
      <span className="absolute bottom-2 right-4 font-mono text-xs text-stone-600">v{__APP_VERSION__}</span>
    </div>
  )
}
