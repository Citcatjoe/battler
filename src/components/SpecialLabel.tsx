import type { CSSProperties } from 'react'
import { SPECIAL_SOURCES, type SpecialBadge } from '../game/specials'
import { Icon, RelicIcon } from './Icon'

/**
 * Un label de la zone de surcharge, sous le dé (FightScreen) : plaque dans la couleur de sa source
 * (SPECIAL_SOURCES, docs/design-system.md § 3.1), hachurée si elle réduit ou contre l'action de l'attaquant
 * (`data-sign`, `.special-badge`), avec son icône peinte s'il en a une (relique, critique assuré).
 */
export function SpecialLabel({ badge }: { badge: SpecialBadge }) {
  const source = SPECIAL_SOURCES[badge.source]
  return (
    <span
      data-source={badge.source}
      data-sign={badge.sign}
      className="special-badge flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-1 font-display text-xl font-extrabold uppercase"
      style={{
        backgroundColor: source.bg,
        color: source.fg,
        '--hatch': source.hatch,
        boxShadow: `0 3px 0 ${source.edge}${source.ring ? `, inset 0 0 0 1.5px ${source.ring}` : ''}`,
      } as CSSProperties}
    >
      {badge.icon &&
        ('relic' in badge.icon ? (
          <RelicIcon id={badge.icon.relic} name={badge.icon.name} className="h-[1.3em] w-[1.3em]" />
        ) : (
          <Icon name={badge.icon.icon} />
        ))}
      {badge.label}
    </span>
  )
}
