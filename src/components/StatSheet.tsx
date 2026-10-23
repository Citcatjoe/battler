import type { Character, CharacterStats } from '../game/character'
import { effectiveStats, multiplier, percent } from '../game/combat'
import { ROSTER } from '../game/roster'
import type { Status } from '../game/statuses'

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

/** Une ligne telle que la fiche la montre : le texte, la longueur de sa barre, et une explication au survol. */
interface ShownStat {
  text: string
  bar: number
  hint?: string
}

const signedPct = (p: number) => (p < 0 ? `−${Math.round(-p * 100)} %` : percent(p))

/**
 * Ce que la stat vaut vraiment en combat, quand la valeur brute tromperait : deux dés (la barde), un dé par forme
 * (le druide : d3 en homme, son dé en ours), une esquive que les reliques font passer sous 0 (bornée à 0 par le
 * moteur), un multiplicateur sans critique. Lu dans les règles du moteur (`effectiveStats`), rien n'est recalculé.
 */
function shownStat(character: Character, l: StatLine): ShownStat {
  const v = character.stats[l.key]
  const base = character.baseStats[l.key]
  const relicHint = v !== base ? `${l.format(base)} sans ses reliques` : undefined
  const plain: ShownStat = { text: l.format(v), bar: v, hint: relicHint }
  if (l.key === 'damageDie') {
    if (character.twinDice) return { ...plain, text: `2d${v}`, hint: [`Deux d${v} à chaque action`, relicHint].filter(Boolean).join(' ; ') }
    const forms = character.forms
    if (forms) {
      const dice = forms.map((f) => effectiveStats(character, (f.statuses ?? []).map((id): Status => ({ id, stacks: 1 }))).damageDie)
      if (dice.some((d) => d !== dice[0]))
        return {
          ...plain,
          text: dice.map((d) => `d${d}`).join(' / '),
          hint: [forms.map((f, i) => `${f.name} : 1d${dice[i]}`).join(' · '), relicHint].filter(Boolean).join(' ; '),
        }
    }
  }
  if (l.key === 'dodgeChance' && v < 0)
    return { text: percent(0), bar: 0, hint: `${signedPct(v)} avec ses reliques (${percent(base)} sans elles) : ramenée à 0 %, il n'esquive jamais` }
  if (l.key === 'critMultiplier' && character.stats.critChance <= 0) return { text: '—', bar: 0, hint: 'Aucune chance de critique : le multiplicateur ne sert pas' }
  return plain
}

/** Fiche de stats d'un personnage : jauges fines à la couleur du camp sur sa piste (design system). `className` : celle
 *  de la liste (l'affrontement lui donne une hauteur fixe et répartit les lignes). */
export function StatSheet({
  character,
  barClass,
  trackClass = 'bg-surface-3',
  className = 'gap-1',
}: {
  character: Character
  barClass: string
  trackClass?: string
  className?: string
}) {
  return (
    <dl className={`flex flex-col ${className}`}>
      {STAT_LINES.map((l) => {
        const shown = shownStat(character, l)
        // Une relique de caractéristique l'a changée : la valeur passe en or, avec l'apport en infobulle
        const changed = character.stats[l.key] !== character.baseStats[l.key]
        return (
          <div key={l.key} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-2">
            <dt className="font-body text-[15px] font-medium text-ink-2">{l.label}</dt>
            <div className={`h-1.5 overflow-hidden rounded-(--r-xs) ${trackClass}`}>
              <div
                className={`h-full rounded-(--r-xs) ${barClass}`}
                style={{ width: `${MAX[l.key] ? (Math.max(shown.bar, 0) / MAX[l.key]) * 100 : 0}%` }}
              />
            </div>
            <dd
              className={`whitespace-nowrap text-right font-data text-[14px] font-medium tabular-nums ${changed ? 'text-gold-300' : 'text-ink-1'}`}
              title={shown.hint}
            >
              {shown.text}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
