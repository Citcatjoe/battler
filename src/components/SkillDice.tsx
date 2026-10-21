import type { Character } from '../game/character'
import { DEFAULT_SKILL_NATURE, describeSkill, doubleFace, DOUBLE_TRIGGERS, type CharacterEvent, type Trigger } from '../game/events'
import { STATES, statesPosedBy } from '../game/states'
import { POLARITY_STYLE } from '../game/statuses'
import { StateIcon } from './Icon'
import { SkillSeal } from './SkillSeal'
import type { SkillPulse } from '../game/useCombat'

export type Face = 1 | 2 | 3 | 4 | 5

/** Les trois faces qui déclenchent une compétence de race, dans l'ordre. */
export const FACES: { face: Face; trigger: Trigger }[] = [
  { face: 1, trigger: 'naturalOne' },
  { face: 2, trigger: 'naturalTwo' },
  { face: 3, trigger: 'naturalThree' },
]

/** Personnage à deux dés (barde) : une compétence par double, du double 1 au double 5. */
export const DOUBLES: { face: Face; trigger: Trigger }[] = ([1, 2, 3, 4, 5] as const).map((face) => ({
  face,
  trigger: DOUBLE_TRIGGERS[face],
}))

/** Points d'une face de dé, sur une grille de 3 × 3 (1 : centre ; 2 : diagonale ; 3 : diagonale et centre…). */
const PIPS: Record<Face, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
}

interface Props {
  character: Character
  /** Où s'ouvre l'infobulle : au-dessus (sélection) ou en dessous (en-tête du combat) */
  tooltip?: 'above' | 'below'
  /** Côté vers lequel l'infobulle s'aligne, pour ne pas sortir de la scène */
  align?: 'left' | 'center' | 'right'
  size?: 'sm' | 'header' | 'md'
  /**
   * Personnage à formes (druide) : en combat, la forme en cours (ses trois dés à elle) ; absent,
   * une rangée de dés par forme, avec son nom (sélection)
   */
  form?: number
  /** En combat : le dé de la face qui vient de sortir s'allume un instant (une fois par `key`) */
  pulse?: SkillPulse
  /** En combat : les dés sont éteints au repos, et ne s'allument qu'au déclenchement */
  dim?: boolean
}

/**
 * Les compétences d'un personnage en trois dés (faces 1, 2 et 3) : au survol d'un dé, une
 * infobulle donne la compétence qu'il déclenche (version allégée de la carte du compendium, au
 * style de l'infobulle de la zone d'état). Sur l'écran de sélection et en tête du combat.
 */
export function SkillDice({ character, tooltip = 'above', align = 'center', size = 'md', form, pulse, dim = false }: Props) {
  const forms = character.forms
  if (forms && form === undefined)
    return (
      <div className="flex flex-col gap-1.5">
        {forms.map((f, k) => (
          <div key={f.id} className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
            <SkillDice character={character} tooltip={tooltip} align={align} size="sm" form={k} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{f.name}</span>
          </div>
        ))}
      </div>
    )
  const formId = forms?.[form ?? 0].id
  return (
    <ul className={`flex gap-2 ${dim ? 'skill-dice-dim' : ''}`} aria-label={`Compétences de ${character.name}`}>
      {(character.twinDice ? DOUBLES : FACES).map(({ face, trigger }) => {
        const event = character.events.find((e) => e.trigger === trigger && (!e.form || e.form === formId))
        return (
          <li key={face} className="skill-die-slot group relative hover:z-[70]" data-nature={event ? (event.nature ?? DEFAULT_SKILL_NATURE) : 'neutral'}>
            {/* Le dé qui sort : il s'allume un instant, comme un tintement, dans la couleur de la nature de la
                compétence ; la clé relance l'éclat quand la même face sort deux fois de suite */}
            {event && pulse?.face === face && <span key={`wave-${pulse.key}`} aria-hidden className="skill-die-pulse" />}
            <div key={event && pulse?.face === face ? `flash-${pulse.key}` : 'idle'} className={event && pulse?.face === face ? 'skill-die-flash' : ''}>
              <DieFace face={face} size={size} empty={!event} double={character.twinDice} />
            </div>
            {event && <SkillTooltip event={event} face={face} placement={tooltip} align={align} />}
          </li>
        )
      })}
    </ul>
  )
}

const BOX = { xs: 'skill-die-xs h-[28px] w-[28px] p-[4px] rounded-[7px]', sm: 'h-8 w-8 p-[5px]', header: 'h-9 w-9 p-[6px]', md: 'h-11 w-11 p-[7px]' }

/** Une face de dé de compétence (ses points), ou un double (deux dés décalés). Aussi en pastille des sceaux (SkillBar). */
export function DieFace({ face, size, empty, double }: { face: Face; size: keyof typeof BOX; empty: boolean; double?: boolean }) {
  const box = BOX[size]
  const die = (
    <div
      aria-label={double ? undefined : `Dé ${face}`}
      className={`skill-die grid grid-cols-3 grid-rows-3 ${size === 'xs' ? '' : 'rounded-lg'} ${box} ${empty ? 'opacity-30' : 'cursor-help'}`}
    >
      {PIPS[face].map(([x, y]) => (
        <span key={`${x}${y}`} className="skill-pip rounded-full" style={{ gridColumn: x + 1, gridRow: y + 1 }} />
      ))}
    </div>
  )
  if (!double) return die
  // Un double : le même dé deux fois, le second décalé derrière le premier
  return (
    <div aria-label={`Double ${face}`} className="relative">
      <div className={`absolute opacity-60 ${size === 'xs' ? 'left-[3px] top-[3px]' : 'left-1.5 top-1.5'}`} aria-hidden>
        {die}
      </div>
      <div className="relative">{die}</div>
    </div>
  )
}

export const ALIGN = {
  left: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-0',
}

/** Infobulle d'une compétence (dé de sélection, sceau de l'en-tête du combat). */
export function SkillTooltip({
  event,
  face,
  placement,
  align,
}: {
  event: CharacterEvent
  face: number
  placement: 'above' | 'below'
  align: 'left' | 'center' | 'right'
}) {
  const double = doubleFace(event.trigger)
  // Le même texte que le compendium (describeSkill) : pastilles en tête, puis l'effet et les statuts posés
  const { text, tags } = describeSkill(event)
  const states = statesPosedBy(event.effects)
  return (
    <div
      role="tooltip"
      className={`pointer-events-none invisible absolute z-[70] w-80 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-4 py-3 text-left opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover:visible group-hover:opacity-100 ${
        placement === 'above' ? 'bottom-full mb-3' : 'top-full mt-3'
      } ${ALIGN[align]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-display text-lg font-extrabold leading-tight text-ink-1">
          <SkillSeal id={event.id} size={32} />
          {event.name}
        </span>
        <span className="shrink-0 rounded-(--r-xs) border border-arcane/60 bg-arcane/15 px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider text-arcane">
          {double !== undefined ? 'Double' : 'Dé'} {face}
        </span>
      </div>
      {tags.length > 0 && <p className="mt-0.5 font-body text-[13px] font-medium text-arcane">{tags.map((t) => t.label).join(' · ')}</p>}
      <div className="codex-divider my-2.5" />
      {text && <p className="font-body text-[15px] leading-snug text-ink-1">{text}</p>}
      {/* Les états qu'elle fait apparaître dans la zone d'état, et chez qui (le vocabulaire commun, states.ts) */}
      {states.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {states.map((p) => (
            <li key={`${p.state}-${p.target}`} className="flex items-center gap-1.5 font-body text-[14px] font-bold text-ink-1">
              <StateIcon id={p.state} className="h-6 w-6" />
              {STATES[p.state].name}
              <span className={`font-normal ${STATES[p.state].polarity === 'positive' ? 'text-good' : 'text-bad'}`}>
                {POLARITY_STYLE[STATES[p.state].polarity].label.toLowerCase()}
                {p.target === 'opponent' ? ' · adversaire' : ' · sur soi'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
