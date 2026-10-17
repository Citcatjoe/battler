import { BUFF_INFO, type Buff } from '../game/events'

/** Bonus actifs d'un combattant : icône, valeur et explication au survol. */
export function BuffChips({ buffs, align = 'left' }: { buffs: Buff[]; align?: 'left' | 'right' }) {
  return (
    <div className={`flex min-h-7 flex-wrap gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
      {buffs.map((b) => {
        const info = BUFF_INFO[b.kind]
        return (
          <span
            key={b.kind}
            title={`${info.label} — ${info.describe(b.amount)}`}
            className={`fade-in inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold ${info.className}`}
          >
            <span>{info.icon}</span>
            {info.label}
            <span className="rounded bg-black/40 px-1 font-mono">
              {b.kind === 'guaranteedCrit' ? `×${b.amount}` : b.amount}
            </span>
          </span>
        )
      })}
    </div>
  )
}
