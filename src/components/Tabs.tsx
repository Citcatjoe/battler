import type { ReactNode } from 'react'
import { sfx } from '../game/sound'

export interface TabDef<T extends string> {
  id: T
  label: string
  /** Repère avant le libellé (ex. la pastille de couleur d'un camp) */
  lead?: ReactNode
  /** Compteur à droite du libellé (ex. « 12 combats »), en `.bt-count` */
  hint?: ReactNode
}

/**
 * Onglets mineurs du UI kit (`.bt-tabs`, docs/ui-kit/README.md) : sous-vues d'un écran, soulignées, sans icône.
 * L'onglet actif porte `aria-selected="true"`.
 */
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
    <div role="tablist" className={`bt-tabs ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === value}
          onClick={() => {
            if (t.id === value) return
            sfx.click()
            onChange(t.id)
          }}
        >
          {t.lead}
          {t.label}
          {t.hint !== undefined && <span className="bt-count">{t.hint}</span>}
        </button>
      ))}
    </div>
  )
}
