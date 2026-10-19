import type { ReactNode } from 'react'
import { sfx } from '../game/sound'
import { Icon, type IconName } from './Icon'

export interface TabDef<T extends string> {
  id: T
  label: string
  icon?: IconName
  /** Petite information à droite du libellé (ex. « 12 combats ») */
  hint?: ReactNode
}

/**
 * Onglets au style du jeu (index.css). « minor » (par défaut) : sous-vues d'un écran, soulignées
 * (.tabs-minor / .tab-minor). « major » : choix du mode de jeu, plaque d'or (.tabs / .tab).
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className = '',
  variant = 'minor',
}: {
  tabs: readonly TabDef<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
  variant?: 'major' | 'minor'
}) {
  const minor = variant === 'minor'
  return (
    <div role="tablist" className={`${minor ? 'tabs-minor' : 'tabs'} ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === value}
          aria-pressed={t.id === value}
          data-state={t.id === value ? 'selected' : 'idle'}
          onClick={() => {
            if (t.id === value) return
            sfx.click()
            onChange(t.id)
          }}
          className={minor ? 'tab-minor' : 'tab'}
        >
          {t.icon && <Icon name={t.icon} className="btn-icon" />}
          <span>{t.label}</span>
          {t.hint !== undefined && (
            <span className="font-body text-[13px] font-normal normal-case tracking-normal opacity-70">{t.hint}</span>
          )}
        </button>
      ))}
    </div>
  )
}
