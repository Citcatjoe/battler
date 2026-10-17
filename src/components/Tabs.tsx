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

/** Onglets au style du jeu (classes .tabs / .tab de index.css). */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className = '',
}: {
  tabs: readonly TabDef<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div role="tablist" className={`tabs ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === value}
          aria-pressed={t.id === value}
          onClick={() => {
            if (t.id === value) return
            sfx.click()
            onChange(t.id)
          }}
          className="tab"
        >
          {t.icon && <Icon name={t.icon} className="btn-icon" />}
          <span>{t.label}</span>
          {t.hint !== undefined && (
            <span className="font-sans text-[11px] font-normal normal-case tracking-normal opacity-70">{t.hint}</span>
          )}
        </button>
      ))}
    </div>
  )
}
