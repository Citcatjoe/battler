import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Bouton principal d'un écran (Combattre, Jouer, Revanche…), pièce prestige du design system :
 * octogone, cadre bronze, jour sombre, plaque d'or, tranche et gravure (.prestige de index.css).
 * Un seul par écran. Le clip-path coupe l'ombre portée : elle est posée sur l'enveloppe, qui
 * reçoit aussi la largeur (className). La zone cliquable est la forme visible.
 */
export function PrestigeButton({
  size = 'lg',
  className = '',
  children,
  ...button
}: {
  size?: 'md' | 'lg'
  className?: string
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>) {
  return (
    <span className={`prestige prestige-${size} ${className}`}>
      <button type="button" className="prestige-btn" {...button}>
        <span className="prestige-engrave" aria-hidden />
        <span className="prestige-label">{children}</span>
      </button>
    </span>
  )
}
