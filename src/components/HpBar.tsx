import { SIDE_STYLE, type Side } from '../game/combat'

interface Props {
  side: Side
  name: string
  hp: number
  maxHp: number
}

export function HpBar({ side, name, hp, maxHp }: Props) {
  const pct = (hp / maxHp) * 100
  const style = SIDE_STYLE[side]
  const low = pct <= 25
  return (
    <div className={`flex flex-1 flex-col gap-1.5 ${side === 1 ? 'items-end text-right' : ''}`}>
      <div className={`flex w-full items-baseline justify-between gap-3 ${side === 1 ? 'flex-row-reverse' : ''}`}>
        <span className={`font-display text-2xl font-extrabold tracking-wide ${style.accent}`}>{name}</span>
        <span className="font-mono text-sm tabular-nums text-stone-300">
          <span className={`text-lg font-bold ${low ? 'text-red-400' : 'text-stone-100'}`}>{hp}</span> / {maxHp} PV
        </span>
      </div>
      <div
        className={`relative h-4 w-full overflow-hidden rounded-full border border-stone-700 bg-stone-900 ${
          side === 1 ? 'rotate-180' : ''
        }`}
      >
        {/* traînée blanche qui rattrape les dégâts avec un léger retard */}
        <div
          className="absolute inset-y-0 left-0 bg-stone-100/80 transition-[width] delay-300 duration-700"
          style={{ width: `${pct}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 transition-[width] duration-200 ${low ? 'bg-red-500' : style.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
