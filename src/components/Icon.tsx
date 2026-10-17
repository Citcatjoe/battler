import { STATUSES, type StatusId } from '../game/statuses'

/** Icônes peintes (`src/assets/icons/`, voir la section 7 de `docs/STYLE_BIBLE.md`). */
const URLS = import.meta.glob<string>('../assets/icons/*.png', { eager: true, import: 'default' })

export type IconName =
  | 'swords'
  | 'trophy'
  | 'lightning'
  | 'stats'
  | 'scroll'
  | 'dice'
  | 'event'
  | 'crit'
  | 'shield'
  | 'poison'
  | 'regen'
  | 'weakened'
  | 'breach'
  | 'sound-on'
  | 'sound-off'
  | 'turns'

/**
 * Icône peinte de chaque statut ; `STATUSES[id].icon` (emoji) reste utilisé dans le texte du journal.
 * Facultative pour un statut « à venir » (repli sur l'emoji), obligatoire avant qu'un personnage
 * le pose : un test le vérifie.
 */
export const STATUS_ICON: Partial<Record<StatusId, IconName>> = {
  guaranteedCrit: 'crit',
  bonusArmor: 'shield',
  poison: 'poison',
  regeneration: 'regen',
  weakened: 'weakened',
  exposed: 'breach',
}

/** Icône d'un statut : l'icône peinte, sinon son emoji à la même taille. */
export function StatusIcon({ id, className }: { id: StatusId; className: string }) {
  const name = STATUS_ICON[id]
  if (name) return <Icon name={name} className={className} />
  return (
    <span aria-hidden className={`flex items-center justify-center text-[1.6em] leading-none ${className}`}>
      {STATUSES[id].icon}
    </span>
  )
}

/** Icône à la taille du texte qui l'entoure ; `className` permet de l'agrandir (`h-24 w-24`…). */
export function Icon({ name, className = 'h-[1.3em] w-[1.3em]' }: { name: IconName; className?: string }) {
  return (
    <img
      src={URLS[`../assets/icons/${name}.png`]}
      alt=""
      aria-hidden
      draggable={false}
      className={`inline-block shrink-0 select-none align-[-0.3em] ${className}`}
    />
  )
}
