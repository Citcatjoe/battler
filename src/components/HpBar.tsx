import type { CSSProperties } from 'react'
import type { Character } from '../game/character'
import { SIDE_STYLE, type Side } from '../game/combat'
import type { RelicPulse } from '../game/staging'
import { RelicRow } from './RelicSeal'

interface Props {
  side: Side
  name: string
  /** En combat : ses reliques suivent le nom */
  character?: Character
  hp: number
  maxHp: number
  /** En combat : son tour (son camp s'allume) ou celui de l'adversaire (il se tamise) */
  turn?: 'active' | 'waiting'
  /** En combat : déclenchements de ses reliques jusqu'ici (charges restantes) */
  relicUses?: Readonly<Record<string, number>>
  /** En combat : la relique qui vient d'agir s'illumine */
  relicPulse?: RelicPulse
}

export function HpBar({ side, name, hp, maxHp, character, turn, relicUses, relicPulse }: Props) {
  const pct = (hp / maxHp) * 100
  const style = SIDE_STYLE[side]
  const low = pct <= 25
  return (
    <div
      data-turn={turn}
      className={`hp-camp flex flex-1 flex-col gap-1.5 ${side === 1 ? 'items-end text-right' : ''}`}
      style={{ '--camp': style.hex } as CSSProperties}
    >
      {/* Hauteur fixe, celle d'une relique : avec ou sans reliques, les deux barres restent alignées (0.96.0) */}
      <div className={`flex h-11 w-full items-center justify-between gap-3 ${side === 1 ? 'flex-row-reverse' : ''}`}>
        <span className={`flex items-center gap-3 ${side === 1 ? 'flex-row-reverse' : ''}`}>
          <span className={`hp-camp-name font-display text-2xl font-extrabold tracking-wide ${style.accent}`}>{name}</span>
          {/* Ses reliques (tournoi) suivent le nom ; ses compétences sont sous l'en-tête, sur l'arène (SkillBar) */}
          {character && character.relics.length > 0 && (
            <RelicRow relics={character.relics} size={44} tooltip="below" align={side === 1 ? 'right' : 'left'} uses={relicUses} pulse={relicPulse} />
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
