import type { Character } from '../game/character'
import { describeCondition, type CharacterEvent, type Trigger } from '../game/events'
import { EffectLine } from './compendium/SkillsSection'
import { Icon, SKILL_ICON } from './Icon'

/** Les trois faces qui déclenchent une compétence de race, dans l'ordre. */
const FACES: { face: 1 | 2 | 3; trigger: Trigger }[] = [
  { face: 1, trigger: 'naturalOne' },
  { face: 2, trigger: 'naturalTwo' },
  { face: 3, trigger: 'naturalThree' },
]

/** Points d'une face de dé, sur une grille de 3 × 3 (1 : centre ; 2 : diagonale ; 3 : diagonale et centre). */
const PIPS: Record<1 | 2 | 3, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
}

interface Props {
  character: Character
  /** Où s'ouvre l'infobulle : au-dessus (sélection) ou en dessous (en-tête du combat) */
  tooltip?: 'above' | 'below'
  /** Côté vers lequel l'infobulle s'aligne, pour ne pas sortir de la scène */
  align?: 'left' | 'center' | 'right'
  size?: 'sm' | 'md'
  /**
   * Personnage à formes (druide) : en combat, la forme en cours (ses trois dés à elle) ; absent,
   * une rangée de dés par forme, avec son nom (sélection)
   */
  form?: number
}

/**
 * Les compétences d'un personnage en trois dés (faces 1, 2 et 3) : au survol d'un dé, une
 * infobulle donne la compétence qu'il déclenche (version allégée de la carte du compendium, au
 * style de l'infobulle de la zone d'état). Sur l'écran de sélection et en tête du combat.
 */
export function SkillDice({ character, tooltip = 'above', align = 'center', size = 'md', form }: Props) {
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
    <ul className="flex gap-2" aria-label={`Compétences de ${character.name}`}>
      {FACES.map(({ face, trigger }) => {
        const event = character.events.find((e) => e.trigger === trigger && (!e.form || e.form === formId))
        return (
          <li key={face} className="group relative hover:z-[70]">
            <DieFace face={face} size={size} empty={!event} />
            {event && <SkillTooltip event={event} face={face} placement={tooltip} align={align} />}
          </li>
        )
      })}
    </ul>
  )
}

function DieFace({ face, size, empty }: { face: 1 | 2 | 3; size: 'sm' | 'md'; empty: boolean }) {
  const box = size === 'sm' ? 'h-8 w-8 p-[5px]' : 'h-11 w-11 p-[7px]'
  return (
    <div
      aria-label={`Dé ${face}`}
      className={`skill-die grid grid-cols-3 grid-rows-3 rounded-lg ${box} ${empty ? 'opacity-30' : 'cursor-help'}`}
    >
      {PIPS[face].map(([x, y]) => (
        <span key={`${x}${y}`} className="skill-pip rounded-full" style={{ gridColumn: x + 1, gridRow: y + 1 }} />
      ))}
    </div>
  )
}

const ALIGN = {
  left: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-0',
}

function SkillTooltip({
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
  const reshape = event.reshapesHit
  const terms = [
    ...(event.forfeitsHit ? ["Le jet n'inflige aucun dégât"] : []),
    ...(reshape?.value === 'max' ? ['Frappe pour la valeur maximale de son dé'] : []),
    ...(reshape?.value === 'reroll' ? [`Relance son dé et ajoute ${reshape.bonus ?? 0}`] : []),
    ...(reshape?.noCrit ? ['Jamais critique'] : []),
    ...(event.when ?? []).map((c) => `si ${describeCondition(c)}`),
    ...(event.chance !== undefined && event.chance < 1 ? [`${Math.round(event.chance * 100)} % de chances`] : []),
    ...(event.limit !== undefined ? [`${event.limit} fois max. par combat`] : []),
  ]
  return (
    <div
      role="tooltip"
      className={`pointer-events-none invisible absolute z-[70] w-80 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-4 py-3 text-left opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover:visible group-hover:opacity-100 ${
        placement === 'above' ? 'bottom-full mb-3' : 'top-full mt-3'
      } ${ALIGN[align]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-display text-lg font-extrabold leading-tight text-ink-1">
          {SKILL_ICON[event.id] && <Icon name={SKILL_ICON[event.id]!} className="h-8 w-8" />}
          {event.name}
        </span>
        <span className="shrink-0 rounded-(--r-xs) border border-arcane/60 bg-arcane/15 px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider text-arcane">
          Dé {face}
        </span>
      </div>
      {terms.length > 0 && <p className="mt-0.5 font-body text-[13px] font-medium text-arcane">{terms.join(' · ')}</p>}
      <div className="codex-divider my-2.5" />
      {event.effects.length === 0 && <p className="font-body text-[15px] text-ink-1">Un coup porté, plus puissant qu'un coup ordinaire.</p>}
      <ul className="space-y-2.5">
        {event.effects.map((effect, i) => (
          <li key={i}>
            <EffectLine effect={effect} />
          </li>
        ))}
      </ul>
    </div>
  )
}
