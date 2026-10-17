import type { Character, CharacterStats } from '../game/character'
import { multiplier, percent } from '../game/combat'
import { ROSTER } from '../game/roster'

export interface StatLine {
  label: string
  key: keyof CharacterStats
  format: (v: number) => string
}

export const STAT_LINES: StatLine[] = [
  { label: 'PV', key: 'maxHp', format: String },
  { label: 'Dégâts', key: 'damageDie', format: (v) => `1d${v}` },
  { label: 'Armure', key: 'armor', format: String },
  { label: 'Esquive', key: 'dodgeChance', format: percent },
  { label: 'Critique', key: 'critChance', format: percent },
  { label: 'Mult. critique', key: 'critMultiplier', format: multiplier },
]

// Les barres sont relatives au meilleur personnage du roster sur chaque stat.
const MAX = Object.fromEntries(
  STAT_LINES.map((l) => [l.key, Math.max(...ROSTER.map((c) => c.stats[l.key]))]),
) as Record<keyof CharacterStats, number>

/** Fiche de stats d'un personnage. */
export function StatSheet({ character, barClass }: { character: Character; barClass: string }) {
  return (
    <dl className="flex flex-col gap-1.5 text-xs">
      {STAT_LINES.map((l) => {
        const v = character.stats[l.key]
        return (
          <div key={l.key} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-2">
            <dt className="text-stone-400">{l.label}</dt>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-800">
              <div
                className={`h-full rounded-full ${barClass}`}
                style={{ width: `${MAX[l.key] ? (v / MAX[l.key]) * 100 : 0}%` }}
              />
            </div>
            <dd className="text-right font-mono text-stone-100">{l.format(v)}</dd>
          </div>
        )
      })}
    </dl>
  )
}
