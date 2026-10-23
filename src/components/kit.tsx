import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { BattlerIcon, type GlyphName, type GlyphSize } from './BattlerIcon'

/*
 * Contrôles du UI kit (docs/ui-kit/README.md) : ces composants ne font que poser les classes et la structure
 * HTML du kit (docs/ui-kit/battler-ui-kit.css). Aucun style propre ici : un écart se corrige dans le kit.
 * Les glyphes de commande viennent de BattlerIcon ; une image peinte n'entre jamais dans une commande.
 */

export type { GlyphName }

type ButtonAttrs = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

/**
 * Glyphe de commande à sa taille. BattlerIcon pose `width`/`height` en attributs, mais `.bt-glyph` les fixe à 20 px
 * en CSS : la taille passe donc aussi par la classe `.bt-glyph--<taille>` du kit.
 */
export function Glyph({ name, size = 20, className = '' }: { name: GlyphName; size?: GlyphSize; className?: string }) {
  return <BattlerIcon name={name} size={size} className={`${size === 20 ? '' : `bt-glyph--${size}`} ${className}`.trim()} />
}

/** Taille du glyphe dans un bouton : celle de reference.html (24 en xl, 18 en md et en sm). */
const BUTTON_GLYPH = { xl: 24, md: 18, sm: 18 } as const

/**
 * Bouton du kit. `primary` (xl seulement, un seul par écran) porte la plaque et l'étiquette gravées ;
 * `resume` est le « Reprendre » de la barre de lecture.
 */
export function Button({
  variant,
  size,
  icon,
  className = '',
  children,
  ...button
}: {
  variant: 'primary' | 'secondary' | 'tertiary' | 'resume'
  size: 'xl' | 'md' | 'sm'
  icon?: GlyphName
  className?: string
  children: ReactNode
} & ButtonAttrs) {
  const glyph = icon && <Glyph name={icon} size={BUTTON_GLYPH[size]} />
  return (
    <button type="button" className={`bt-btn bt-btn--${variant} bt-btn--${size} ${className}`} {...button}>
      {variant === 'primary' ? (
        <>
          <span className="bt-plate" aria-hidden="true" />
          <span className="bt-btn__label">
            {glyph}
            {children}
          </span>
        </>
      ) : (
        <>
          {glyph}
          {children}
        </>
      )}
    </button>
  )
}

/**
 * Bouton icône rond (48 px, ou 44 px en `sm`). Le libellé passe par `aria-label` et `title`. `pressed` : état
 * d'une bascule ; « coupé » = `false`, avec le glyphe barré.
 */
export function IconButton({
  icon,
  label,
  size = 'md',
  pressed,
  className = '',
  ...button
}: { icon: GlyphName; label: string; size?: 'md' | 'sm'; pressed?: boolean; className?: string } & ButtonAttrs) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`bt-iconbtn ${size === 'sm' ? 'bt-iconbtn--sm' : ''} ${className}`}
      {...button}
    >
      <Glyph name={icon} size={size === 'sm' ? 18 : 22} />
    </button>
  )
}

/**
 * Bouton carré 44 × 44 (ajout au kit validé par l'utilisateur) : une action secondaire en glyphe seul, au serti du
 * secondaire (Parier, Simuler sous le VS ; Paris, Simuler le tour dans l'arbre). Le libellé passe par `aria-label`
 * et `title` ; `badge` accroche une pastille de compteur en bas à droite (« 0/2 », « ×8 »). `size="sm"` : 28 × 28,
 * glyphe de 16, sans pastille (actions d'une carte de l'arbre : Affronter, Simuler).
 */
export function SquareButton({
  icon,
  label,
  badge,
  size = 'md',
  className = '',
  ...button
}: { icon: GlyphName; label: string; badge?: string; size?: 'md' | 'sm'; className?: string } & ButtonAttrs) {
  return (
    <button
      type="button"
      aria-label={badge ? `${label} (${badge})` : label}
      title={label}
      className={`bt-square ${size === 'sm' ? 'bt-square--sm' : ''} ${className}`}
      {...button}
    >
      <Glyph name={icon} size={size === 'sm' ? 16 : 20} />
      {badge && <Badge aria-hidden>{badge}</Badge>}
    </button>
  )
}

/** Pastille de compteur du kit (« 0/2 », « ×8 ») : seule, ou accrochée à un `SquareButton` par sa prop `badge`. */
export function Badge({ className = '', children, ...span }: { className?: string; children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`bt-badge ${className}`} {...span}>
      {children}
    </span>
  )
}

/** Paire de modes : des choix de même rang dans un même cadre (écran titre : Duel | Tournoi | Campagne). */
export function ModePair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bt-modepair" role="group" aria-label={label}>
      {children}
    </div>
  )
}

export function ModePairItem({ icon, children, ...button }: { icon: GlyphName; children: ReactNode } & ButtonAttrs) {
  return (
    <button type="button" className="bt-modepair__item" {...button}>
      <Glyph name={icon} size={22} />
      {children}
    </button>
  )
}

/** Sélecteur segmenté (vitesses, filtres courts) : un groupe radio. */
export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { value: T; label: string; title?: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="bt-segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} title={o.title} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Outil de la barre de combat (journal, magnétoscope) ; `dot` : point or des nouveautés. */
export function Tool({
  icon,
  label,
  pressed,
  dot = false,
  ...button
}: { icon: GlyphName; label: string; pressed: boolean; dot?: boolean } & Omit<ButtonAttrs, 'className'>) {
  return (
    <button type="button" className="bt-tool" aria-label={label} aria-pressed={pressed} {...button}>
      <Glyph name={icon} />
      {dot && <span className="bt-dot" />}
    </button>
  )
}

/** Lien de retour, le seul style de « retour » du jeu (Menu, Tournoi, Retour aux statistiques…). */
export function BackLink({ className = '', children, ...button }: { className?: string; children: ReactNode } & ButtonAttrs) {
  return (
    <button type="button" className={`bt-back ${className}`} {...button}>
      <Glyph name="retour" size={16} />
      {children}
    </button>
  )
}
