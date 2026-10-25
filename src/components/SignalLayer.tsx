import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'
import type { SkillSignal } from '../game/staging'
import type { StatusId } from '../game/statuses'
import { StatusIcon } from './Icon'

interface Flight {
  key: string
  path: string
  /** Point d'arrivée, pour l'éclat d'impact */
  x: number
  y: number
  tone: string
  /** Un bonus volé (Sceau de vol) : son icône vole à la place de la lueur */
  icon?: StatusId
}

const TONE = { positive: '#6ee7b7', negative: '#fca5a5' }

/**
 * Signaux d'activation (0.79.0) : une lueur part du sceau d'une compétence ou de l'anneau d'une aura, dans
 * l'en-tête, et file en arc vers la zone d'état de chaque cible, où l'effet apparaît à son arrivée (`timing.SIGNAL`,
 * la durée de `.signal-orb`). Les positions se lisent dans la page (`data-signal`, `data-tray`) et se ramènent à la
 * scène de 1600×900, quelle que soit sa mise à l'échelle. Le vol suit la vitesse et la pause du combat.
 */
export function SignalLayer({ signal, root }: { signal: SkillSignal | null; root: RefObject<HTMLElement | null> }) {
  const [flights, setFlights] = useState<Flight[]>([])
  useLayoutEffect(() => {
    const el = root.current
    // Plus de signal (le magnétoscope reconstruit une position) : les vols en cours partent avec lui
    if (!signal) return setFlights((list) => (list.length > 0 ? [] : list))
    if (!el) return
    const box = el.getBoundingClientRect()
    const scale = box.width / el.offsetWidth || 1
    const center = (node: Element) => {
      const r = node.getBoundingClientRect()
      return { x: (r.left + r.width / 2 - box.left) / scale, y: (r.top + r.height / 2 - box.top) / scale }
    }
    const from = el.querySelector(`[data-signal~="${signal.side}:${CSS.escape(signal.from)}"]`)
    if (!from) return
    const a = center(from)
    const next = signal.to.flatMap((to, k) => {
      const tray = el.querySelector(`[data-tray="${to}"]`)
      if (!tray) return []
      const b = center(tray)
      // Une courbe qui file d'abord à l'horizontale sous l'en-tête, puis plonge vers la zone d'état
      const cx = a.x + (b.x - a.x) * 0.8
      const cy = a.y + (b.y - a.y) * 0.15
      return [
        {
          key: `${signal.key}-${k}`,
          path: `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`,
          x: b.x,
          y: b.y,
          tone: TONE[signal.polarity],
          ...(signal.icon && { icon: signal.icon }),
        },
      ]
    })
    // Les positions ne se lisent que dans la page, une fois l'en-tête et les zones d'état posés
    setFlights((list) => [...list, ...next])
  }, [signal, root])
  const done = (key: string) => setFlights((list) => list.filter((f) => f.key !== key))
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[58]">
      {flights.map((f) => (
        <span key={f.key} style={{ '--tone': f.tone } as CSSProperties}>
          {f.icon ? (
            <span className="signal-orb signal-icon" style={{ offsetPath: `path('${f.path}')` }}>
              <StatusIcon id={f.icon} className="h-full w-full" />
            </span>
          ) : (
            <span className="signal-orb" style={{ offsetPath: `path('${f.path}')` }} />
          )}
          <span className="signal-hit" style={{ left: f.x, top: f.y }} onAnimationEnd={() => done(f.key)} />
        </span>
      ))}
    </div>
  )
}
