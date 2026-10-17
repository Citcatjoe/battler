import { useEffect, useRef } from 'react'
import { SIDE_STYLE, type LogEntry } from '../game/combat'

export function CombatLog({ entries }: { entries: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' })
  }, [entries.length])

  return (
    <div ref={ref} className="h-full overflow-y-auto px-4 py-3 font-mono text-sm leading-relaxed">
      {entries.length === 0 && <p className="italic text-stone-500">Les combattants se jaugent…</p>}
      {entries.map((e) => (
        <p
          key={e.id}
          className={`fade-in border-l-2 py-0.5 pl-3 ${
            e.kind === 'ko'
              ? 'border-amber-400 font-bold text-amber-300'
              : e.kind === 'event'
                ? 'border-violet-400 font-bold text-violet-200'
                : e.kind === 'crit'
                  ? 'border-amber-400 font-bold text-amber-200'
                  : e.kind === 'dodge'
                    ? 'border-cyan-400 italic text-cyan-200'
                    : e.kind === 'attack' && e.side !== undefined
                      ? `border-current ${SIDE_STYLE[e.side].accent}`
                      : e.kind === 'initiative'
                        ? 'border-stone-400 text-stone-200'
                        : 'border-stone-700 text-stone-400'
          }`}
        >
          {e.text}
        </p>
      ))}
    </div>
  )
}
