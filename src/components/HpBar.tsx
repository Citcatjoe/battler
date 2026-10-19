import type { CSSProperties } from 'react'
import type { Character } from '../game/character'
import { SIDE_STYLE, type Side } from '../game/combat'
import type { SkillPulse } from '../game/useCombat'
import { SkillDice } from './SkillDice'

interface Props {
  side: Side
  name: string
  /** En combat : ses trois dés de compétence suivent le nom, pour s'en souvenir */
  character?: Character
  /** Forme en cours (druide) : ses dés montrent les compétences de cette forme */
  form?: number
  hp: number
  maxHp: number
  /** En combat : son tour (son camp s'allume) ou celui de l'adversaire (il se tamise) */
  turn?: 'active' | 'waiting'
  /** En combat : le dé de compétence qui vient de sortir pulse */
  pulse?: SkillPulse
}

export function HpBar({ side, name, hp, maxHp, character, form, turn, pulse }: Props) {
  const pct = (hp / maxHp) * 100
  const style = SIDE_STYLE[side]
  const low = pct <= 25
  return (
    <div
      data-turn={turn}
      className={`hp-camp flex flex-1 flex-col gap-1.5 ${side === 1 ? 'items-end text-right' : ''}`}
      style={{ '--camp': style.hex } as CSSProperties}
    >
      <div className={`flex w-full items-baseline justify-between gap-3 ${side === 1 ? 'flex-row-reverse' : ''}`}>
        <span className={`flex items-center gap-3 ${side === 1 ? 'flex-row-reverse' : ''}`}>
          <span className={`hp-camp-name font-display text-2xl font-extrabold tracking-wide ${style.accent}`}>{name}</span>
          {character && (
            <SkillDice character={character} form={form ?? 0} size="sm" tooltip="below" align={side === 1 ? 'right' : 'left'} pulse={pulse} />
          )}
        </span>
        <span className="font-data text-[15px] font-medium tabular-nums text-ink-2">
          <span className={`text-lg font-bold ${low ? 'text-bad' : 'text-ink-1'}`}>{hp}</span> / {maxHp} PV
        </span>
      </div>
      <div
        className={`hp-camp-track relative h-4 w-full overflow-hidden rounded-(--r-xs) border border-line-2 ${style.track} ${
          side === 1 ? 'rotate-180' : ''
        }`}
      >
        {/* traînée blanche qui rattrape les dégâts avec un léger retard */}
        <div
          className="absolute inset-y-0 left-0 bg-ink-1/80 transition-[width] delay-300 duration-700"
          style={{ width: `${pct}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 transition-[width] duration-200 ${low ? 'bg-bad' : style.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
