import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Character } from '../game/character'
import type { Side } from '../game/combat'

/** Vignette cadrée sur le visage, tournée vers le centre de l'écran selon le camp. */
export function Portrait({
  character,
  side,
  className = '',
}: {
  character: Character
  side: Side
  className?: string
}) {
  const { image, tint, portrait, facing } = character.look
  const flip = facing !== (side === 0 ? 'right' : 'left')
  return (
    <div
      className={`bg-no-repeat ${className}`}
      style={{
        backgroundImage: `url(${image})`,
        backgroundSize: `${portrait.zoom * 100}% auto`,
        backgroundPosition: `${portrait.x}% ${portrait.y}%`,
        transform: flip ? 'scaleX(-1)' : undefined,
        filter: tint,
      }}
    />
  )
}

export type PortraitTileState = 'idle' | 'selected' | 'taken' | 'disabled'

/**
 * Tuile de portrait cliquable (design system) : carré cadré sur le visage, avec ses états
 * (.portrait-tile de index.css) : repos, survol, choisi (2 px à la couleur du camp, ou or hors
 * camp), pris en face (45 %), focus et indisponible. Ni la taille ni la grille ne sont fixées ici.
 */
export function PortraitTile({
  character,
  side,
  state = 'idle',
  selection = 'gold',
  className = '',
  children,
  ...button
}: {
  character: Character
  side: Side
  state?: PortraitTileState
  /** Couleur de l'état choisi : le camp qui choisit, ou l'or hors camp (tournoi) */
  selection?: 'a' | 'b' | 'gold'
  className?: string
  children?: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>) {
  return (
    <button
      type="button"
      data-state={state}
      data-selection={selection}
      aria-pressed={state === 'selected'}
      disabled={state === 'disabled'}
      className={`portrait-tile ${className}`}
      {...button}
    >
      <Portrait character={character} side={side} className="h-full w-full" />
      {children}
    </button>
  )
}
