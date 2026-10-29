import type { KeyboardEvent } from 'react'
import campaignImg from '../assets/title-campaign.webp'
import tournamentImg from '../assets/title-tournament.webp'
import { IconButton } from './kit'

export type HomeChoice = 'test' | 'duel' | 'tournament' | 'campaign'

interface Props {
  onChoose: (choice: HomeChoice) => void
  onOpenRecords: () => void
  onOpenCompendium: () => void
  /** Tournoi en cours : ligne d'état du volet Tournoi (rien sans tournoi) */
  tournamentProgress: string | null
  /** Partie de campagne en cours : ligne d'état du volet Campagne (rien sans partie) */
  campaignProgress: string | null
}

/** Les deux portes, dans l'ordre affiché ; chaque volet est un seul bouton (docs/ref/01-titre-repos.png). */
const DOORS = [
  {
    id: 'campaign',
    label: 'Campagne',
    aria: 'Campagne',
    image: campaignImg,
    hook: "Un champion, onze combats, un boss. Puis l'arène sans fin : jusqu'où ira-t-il ?",
  },
  {
    id: 'tournament',
    label: 'Tournoi',
    aria: 'Tournoi ou saison',
    image: tournamentImg,
    hook: 'Seize combattants, élimination directe, des paris entre amis. Ou une saison entière.',
  },
] as const

/**
 * L'écran titre (0.131.0) : un diptyque, deux portes peintes, Campagne et Tournoi. Survoler ou viser une porte au
 * clavier l'éclaire et assombrit l'autre (index.css, `.title-door`). Duel libre et Combat test sont des liens du coin
 * « Autres modes » ; Statistiques et Compendium, les deux boutons ronds du coin haut gauche ; le son, le bouton commun.
 */
export function HomeScreen({ onChoose, onOpenRecords, onOpenCompendium, tournamentProgress, campaignProgress }: Props) {
  const progress = { campaign: campaignProgress, tournament: tournamentProgress }
  /** Au clavier, comme un menu de jeu : les flèches passent d'une porte à l'autre, Entrée l'ouvre */
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const doors = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('.title-door')]
    doors[e.key === 'ArrowRight' ? 1 : 0]?.focus()
    e.preventDefault()
  }

  return (
    <div className="fade-in relative isolate h-full overflow-hidden bg-[#0e0b09]">
      <nav aria-label="Modes de jeu" onKeyDown={onKey} className="title-diptych absolute inset-0 flex">
        {DOORS.map((door) => (
          <button
            key={door.id}
            type="button"
            className="title-door"
            data-door={door.id}
            aria-label={door.aria}
            aria-describedby={`title-${door.id}-hook${progress[door.id] ? ` title-${door.id}-state` : ''}`}
            onClick={() => onChoose(door.id)}
          >
            <img src={door.image} alt="" draggable={false} className="title-door-art" />
            <span aria-hidden className="title-door-veil" />
            <span className="title-door-text">
              <span aria-hidden className="title-plate">
                <span className="title-plate-label">{door.label}</span>
              </span>
              <span id={`title-${door.id}-hook`} className="title-hook">
                {door.hook}
              </span>
              {progress[door.id] && (
                <span id={`title-${door.id}-state`} className="title-state">
                  {progress[door.id]}
                </span>
              )}
            </span>
          </button>
        ))}
      </nav>

      {/* Entre les portes : le filet d'or et le sceau « ou » */}
      <span aria-hidden className="title-seam pointer-events-none absolute inset-y-0 left-1/2" />
      <span aria-hidden className="title-or pointer-events-none absolute left-1/2 top-[499px]">
        ou
      </span>

      <header className="pointer-events-none absolute inset-x-0 top-[26px] flex flex-col items-center">
        <h1 className="home-logo font-display text-[80px] font-bold leading-none tracking-[0.08em]">BATTLER</h1>
        <span aria-hidden className="title-rule mt-[14px]" />
      </header>

      <IconButton onClick={onOpenRecords} icon="statistiques" label="Statistiques" className="absolute left-4 top-4 z-10" />
      <IconButton onClick={onOpenCompendium} icon="compendium" label="Compendium" className="absolute left-20 top-4 z-10" />

      <nav aria-label="Autres modes" className="absolute bottom-[26px] left-[34px] z-10 flex items-baseline gap-5">
        <span className="title-others">Autres modes</span>
        <button type="button" className="title-link" onClick={() => onChoose('duel')}>
          Duel libre
        </button>
        <button type="button" className="title-link" onClick={() => onChoose('test')} title="Choisir chaque dé pour tester les compétences">
          Combat test
        </button>
      </nav>

      <span className="absolute bottom-[28px] right-[35px] z-10 font-mono text-[13px] text-ink-3">v{__APP_VERSION__}</span>
    </div>
  )
}
