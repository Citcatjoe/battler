import { useState, type CSSProperties } from 'react'
import { isAura, POLARITY_STYLE, STATUSES, statusCounter, type Polarity, type Status, type StatusId } from '../game/statuses'
import { Icon, StatusIcon } from './Icon'

const RING: Record<Polarity, string> = {
  positive: 'border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.55)]',
  negative: 'border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.6)]',
}
const DELTA: Record<Polarity, string> = {
  positive: 'text-emerald-200 [-webkit-text-stroke:1px_#064e3b]',
  negative: 'text-red-200 [-webkit-text-stroke:1px_#450a0a]',
}
const COUNT: Record<Polarity, string> = {
  positive: 'border-emerald-400 text-emerald-100',
  negative: 'border-red-500 text-red-100',
}

/** Un état affiché : présent, ou « sortant » (il montre son 0 puis quitte la zone). */
interface TrayItem {
  status: Status
  leaving: boolean
  key: string
}

let ghostId = 0

/**
 * Garde l'ordre des états et retient ceux qui viennent de disparaître : un état épuisé ou
 * expiré reste le temps de montrer son nombre passer à 0, puis s'efface (fin de son animation).
 */
function useTrayItems(statuses: readonly Status[]) {
  const [items, setItems] = useState<TrayItem[]>(() => statuses.map((s) => ({ status: s, leaving: false, key: s.id })))
  const [prev, setPrev] = useState(statuses)
  if (statuses !== prev) {
    setPrev(statuses)
    const byId = new Map<StatusId, Status>(statuses.map((s) => [s.id, s]))
    const next: TrayItem[] = []
    for (const item of items) {
      const live = byId.get(item.status.id)
      if (live && !item.leaving) next.push({ ...item, status: live })
      else if (!live && !item.leaving) next.push({ ...item, leaving: true, key: `${item.status.id}-out-${ghostId++}` })
      else if (item.leaving) next.push(item)
    }
    for (const s of statuses)
      if (!next.some((i) => !i.leaving && i.status.id === s.id)) next.push({ status: s, leaving: false, key: s.id })
    setItems(next)
  }
  const remove = (key: string) => setItems((list) => list.filter((i) => i.key !== key))
  return { items, remove }
}

/**
 * Zone d'état d'un combattant, posée sur l'arène au-dessus de lui : bonus à gauche, malus à
 * droite. Chaque état = une icône et un seul nombre (tours restants ou charges, voir `statusCounter`),
 * et une infobulle au survol. Les animations suivent la vitesse et la pause du combat (--speed, .is-paused).
 */
export function StatusTray({ statuses }: { statuses: readonly Status[] }) {
  const { items, remove } = useTrayItems(statuses)
  const of = (p: Polarity) => items.filter((i) => STATUSES[i.status.id].polarity === p)
  // L'aura de personnage ouvre la rangée des bonus
  const bonus = of('positive').sort((a, b) => Number(isAura(b.status.id)) - Number(isAura(a.status.id)))
  const malus = of('negative')
  if (items.length === 0) return null
  return (
    <div className="flex items-center gap-2.5" aria-label="États actifs">
      <div className="flex gap-1.5">
        {bonus.map((i) => (
          <StatusToken key={i.key} status={i.status} leaving={i.leaving} onLeft={() => remove(i.key)} />
        ))}
      </div>
      {bonus.length > 0 && malus.length > 0 && <span className="h-8 w-px bg-stone-400/40" />}
      <div className="flex gap-1.5">
        {malus.map((i) => (
          <StatusToken key={i.key} status={i.status} leaving={i.leaving} onLeft={() => remove(i.key)} />
        ))}
      </div>
    </div>
  )
}

/**
 * Mise en évidence d'une résolution : chaque fois que le nombre affiché change (charges usées,
 * tour décompté, cumul…), il rebondit en même temps qu'il change et sa variation (−1, +2) flotte
 * au-dessus. Si seule une valeur cachée change (ex. charges d'un statut qui affiche ses tours),
 * c'est le médaillon entier qui sursaute. L'état précédent est retenu pendant le rendu
 * (« état dérivé » de React), pour que l'animation parte au même rendu que la nouvelle valeur.
 */
function useChange(value: number | undefined, hidden: string) {
  const [prev, setPrev] = useState({ value, hidden })
  const [change, setChange] = useState<{ key: number; delta: number | null }>({ key: 0, delta: null })
  if (prev.value !== value || prev.hidden !== hidden) {
    const delta = value !== undefined && prev.value !== undefined && value !== prev.value ? value - prev.value : null
    setPrev({ value, hidden })
    setChange({ key: change.key + 1, delta })
  }
  return change
}

function StatusToken({ status, leaving, onLeft }: { status: Status; leaving: boolean; onLeft: () => void }) {
  const def = STATUSES[status.id]
  const live = statusCounter(status)
  // Un état sortant affiche 0 : ses charges ou ses tours sont épuisés.
  const counter = live && leaving ? { ...live, value: 0 } : live
  const change = useChange(counter?.value, leaving ? 'out' : `${status.stacks}/${status.turns ?? ''}`)
  const changed = change.key > 0
  // Aura de personnage : double contour et anneau tournant (voir .aura-token)
  const aura = isAura(status.id)
  return (
    <div
      onAnimationEnd={(e) => {
        if (e.animationName === 'status-leave') onLeft()
      }}
      className={`group relative h-12 w-12 rounded-full hover:z-10 border-2 bg-stone-950/75 ${RING[def.polarity]} ${aura ? 'aura-token mx-1' : ''} ${leaving ? 'status-leave' : 'status-pop'}`}
      style={aura ? ({ '--aura': def.look!.aura } as CSSProperties) : undefined}
    >
      {/* Sursaut du médaillon : relancé par la clé à chaque changement */}
      <div key={change.key} className={`absolute inset-0 ${changed ? 'status-bump' : ''}`}>
        <StatusIcon id={status.id} className="absolute inset-0.5 h-[calc(100%-4px)] w-[calc(100%-4px)]" />
      </div>
      {counter && (
        <span
          // La clé relance le rebond au moment exact où le nombre change
          key={`count-${change.key}`}
          className={`absolute -bottom-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border bg-stone-950 px-1 font-display text-sm font-extrabold leading-none ${COUNT[def.polarity]} ${change.delta !== null ? 'status-count' : ''}`}
        >
          {counter.unit === 'turns' && <Icon name="turns" className="-ml-0.5 h-3 w-3" />}
          {counter.value}
        </span>
      )}
      {change.delta !== null && (
        <span
          key={`delta-${change.key}`}
          aria-hidden
          className={`status-delta pointer-events-none absolute -right-3 -top-3 font-display text-base font-extrabold ${DELTA[def.polarity]}`}
        >
          {change.delta > 0 ? `+${change.delta}` : `−${-change.delta}`}
        </span>
      )}
      {!leaving && <StatusTooltip status={status} />}
    </div>
  )
}

/** Infobulle au survol, centrée au-dessus du médaillon : nom, polarité, effet actuel et ce qu'il reste. Fonctionne aussi en pause. */
function StatusTooltip({ status }: { status: Status }) {
  const def = STATUSES[status.id]
  const charges = `${status.stacks} charge${status.stacks > 1 ? 's' : ''}`
  const turns =
    status.turns !== undefined ? `${status.turns} tour${status.turns > 1 ? 's' : ''} restant${status.turns > 1 ? 's' : ''}` : null
  return (
    <div
      role="tooltip"
      className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-3 w-60 -translate-x-1/2 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-3 py-2.5 text-left opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-base font-extrabold leading-tight text-ink-1">{def.name}</span>
        <span
          className={`shrink-0 rounded-(--r-xs) border px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider ${isAura(status.id) ? 'border-line-2 bg-ink-1/10 text-ink-1' : POLARITY_STYLE[def.polarity].chip}`}
        >
          {isAura(status.id) ? 'Aura' : POLARITY_STYLE[def.polarity].label}
        </span>
      </div>
      <p className="mt-1 font-body text-[15px] leading-snug text-ink-1">{def.describe(status)}</p>
      <p className="mt-1.5 flex items-center gap-1.5 font-body text-[13px] font-medium text-ink-3">
        {turns && (
          <>
            <Icon name="turns" className="h-3 w-3" /> {turns} ·{' '}
          </>
        )}
        {charges}
      </p>
    </div>
  )
}
