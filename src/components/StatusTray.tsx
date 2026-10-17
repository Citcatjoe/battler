import { STATUSES, statusCounter, type Polarity, type Status } from '../game/statuses'
import { Icon, StatusIcon } from './Icon'

const RING: Record<Polarity, string> = {
  positive: 'border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.55)]',
  negative: 'border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.6)]',
}
const COUNT: Record<Polarity, string> = {
  positive: 'border-emerald-400 text-emerald-100',
  negative: 'border-red-500 text-red-100',
}

/**
 * Zone d'état d'un combattant, posée sur l'arène au-dessus de lui : bonus à gauche, malus à
 * droite. Chaque état = une icône et un seul nombre (tours restants ou charges, voir `statusCounter`).
 */
export function StatusTray({ statuses }: { statuses: readonly Status[] }) {
  const bonus = statuses.filter((s) => STATUSES[s.id].polarity === 'positive')
  const malus = statuses.filter((s) => STATUSES[s.id].polarity === 'negative')
  if (statuses.length === 0) return null
  return (
    <div className="flex items-center gap-2.5" aria-label="États actifs">
      <div className="flex gap-1.5">
        {bonus.map((s) => (
          <StatusToken key={s.id} status={s} />
        ))}
      </div>
      {bonus.length > 0 && malus.length > 0 && <span className="h-8 w-px bg-stone-400/40" />}
      <div className="flex gap-1.5">
        {malus.map((s) => (
          <StatusToken key={s.id} status={s} />
        ))}
      </div>
    </div>
  )
}

function StatusToken({ status }: { status: Status }) {
  const def = STATUSES[status.id]
  const counter = statusCounter(status)
  const unit =
    counter?.unit === 'turns'
      ? `${counter.value} tour${counter.value > 1 ? 's' : ''} restant${counter.value > 1 ? 's' : ''}`
      : ''
  return (
    <div
      title={`${def.name} — ${def.describe(status)}${unit ? ` (${unit})` : ''}`}
      className={`status-pop relative h-12 w-12 rounded-full border-2 bg-stone-950/75 ${RING[def.polarity]}`}
    >
      <StatusIcon id={status.id} className="absolute inset-0.5 h-[calc(100%-4px)] w-[calc(100%-4px)]" />
      {counter && (
        <span
          // La clé relance la petite pulsation quand le nombre change
          key={counter.value}
          className={`status-count absolute -bottom-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border bg-stone-950 px-1 font-display text-sm font-extrabold leading-none ${COUNT[def.polarity]}`}
        >
          {counter.unit === 'turns' && <Icon name="turns" className="-ml-0.5 h-3 w-3" />}
          {counter.value}
        </span>
      )}
    </div>
  )
}
