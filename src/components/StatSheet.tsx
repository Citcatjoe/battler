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

/** Fiche de stats d'un personnage : jauges fines à la couleur du camp sur sa piste (design system). */
export function StatSheet({
  character,
  barClass,
  trackClass = 'bg-surface-3',
}: {
  character: Character
  barClass: string
  trackClass?: string
}) {
  return (
    <dl className="flex flex-col gap-1">
      {STAT_LINES.map((l) => {
        const v = character.stats[l.key]
        // Une relique de caractéristique l'a changée : la valeur passe en or, avec l'apport en infobulle
        const base = character.baseStats[l.key]
        return (
          <div key={l.key} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-2">
            <dt className="font-body text-[15px] font-medium text-ink-2">{l.label}</dt>
            <div className={`h-1.5 overflow-hidden rounded-(--r-xs) ${trackClass}`}>
              <div
                className={`h-full rounded-(--r-xs) ${barClass}`}
                style={{ width: `${MAX[l.key] ? (v / MAX[l.key]) * 100 : 0}%` }}
              />
            </div>
            <dd
              className={`text-right font-data text-[14px] font-medium tabular-nums ${v !== base ? 'text-gold-300' : 'text-ink-1'}`}
              title={v !== base ? `${l.format(base)} sans ses reliques` : undefined}
            >
              {l.format(v)}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
