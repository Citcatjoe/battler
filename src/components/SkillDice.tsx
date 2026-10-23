import type { Character } from '../game/character'
import { DEFAULT_SKILL_NATURE, describeSkill, doubleFace, doubleTrigger, faceTrigger, isRollTrigger, rollFace, triggerText, type CharacterEvent, type Trigger } from '../game/events'
import { STATES, statesPosedBy } from '../game/states'
import { POLARITY_STYLE, STATUSES } from '../game/statuses'
import { StateIcon } from './Icon'
import { SkillSeal } from './SkillSeal'
import type { SkillPulse } from '../game/staging'

/**
 * Les faces de compétence d'un personnage, dans l'ordre : 1, 2 et 3 (les doubles 1 à 5 pour deux dés), puis celles que
 * la forge du dé a gravées au-delà (docs/CAMPAGNE.md § 4). En-tête du combat, sélection, affrontement.
 */
export function skillFaces(character: Character, events: readonly CharacterEvent[]): { face: number; trigger: Trigger }[] {
  const twin = character.twinDice
  const base = twin ? [1, 2, 3, 4, 5] : [1, 2, 3]
  const engraved = events.map((e) => (twin ? doubleFace(e.trigger) : rollFace(e.trigger))).filter((f): f is number => f !== undefined && !base.includes(f))
  return [...base, ...new Set(engraved.sort((a, b) => a - b))].map((face) => ({ face, trigger: twin ? doubleTrigger(face) : faceTrigger(face) }))
}

/** Points d'une face de dé, sur une grille de 3 × 3 (1 : centre ; 2 : diagonale ; 3 : diagonale et centre…). Au-delà de 6, son chiffre. */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
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
 * style de l'infobulle de la zone d'état). En tête du combat et sur les fiches qui montrent un dé.
 */
export function SkillDice({ character, tooltip = 'above', align = 'center', size = 'md', form, pulse, dim = false }: Props) {
  const forms = character.forms
  if (forms && form === undefined)
    return (
      <div className="flex flex-col gap-1.5">
        {forms.map((f, k) => (
          <div key={f.id} className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
            <SkillDice character={character} tooltip={tooltip} align={align} size="sm" form={k} />
            <FormLabel character={character} form={k} tooltip={tooltip} align={align} />
          </div>
        ))}
      </div>
    )
  const formId = forms?.[form ?? 0].id
  const own = character.events.filter((e) => !e.form || e.form === formId)
  const faces = skillFaces(character, own)
  // Les compétences hors dé (l'Ouverture de la barde, au début du combat) : un sceau à la suite des dés
  const offDice = own.filter((e) => !faces.some((f) => f.trigger === e.trigger) && !isRollTrigger(e.trigger))
  return (
    <ul className={`flex gap-2 ${dim ? 'skill-dice-dim' : ''}`} aria-label={`Compétences de ${character.name}`}>
      {faces.map(({ face, trigger }) => {
        const event = own.find((e) => e.trigger === trigger)
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
      {offDice.map((e) => (
        <li key={e.id} className="skill-die-slot group relative cursor-help hover:z-[70]" data-nature={e.nature ?? DEFAULT_SKILL_NATURE}>
          <SkillSeal id={e.id} size={SEAL_SIZE[size]} />
          <SkillTooltip event={e} placement={tooltip} align={align} />
        </li>
      ))}
    </ul>
  )
}

/** Taille du sceau d'une compétence hors dé, au plus près de la hauteur des dés de la rangée (tailles de SkillSeal). */
const SEAL_SIZE = { sm: 32, header: 40, md: 40 } as const

const BOX = { xs: 'skill-die-xs h-[28px] w-[28px] p-[4px] rounded-[7px]', sm: 'h-8 w-8 p-[5px]', header: 'h-9 w-9 p-[6px]', md: 'h-11 w-11 p-[7px]' }

/** Une face de dé de compétence (ses points), ou un double (deux dés décalés). Aussi en pastille des sceaux (SkillBar). */
export function DieFace({ face, size, empty, double }: { face: number; size: keyof typeof BOX; empty: boolean; double?: boolean }) {
  const box = BOX[size]
  const pips = PIPS[face]
  const die = (
    <div
      aria-label={double ? undefined : `Dé ${face}`}
      className={`skill-die ${pips ? 'grid grid-cols-3 grid-rows-3' : 'skill-die-number'} ${size === 'xs' ? '' : 'rounded-lg'} ${box} ${empty ? 'opacity-30' : 'cursor-help'}`}
    >
      {pips
        ? pips.map(([x, y]) => <span key={`${x}${y}`} className="skill-pip rounded-full" style={{ gridColumn: x + 1, gridRow: y + 1 }} />)
        : face}
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

/**
 * Le nom d'une forme (druide), qui dit ses règles au survol (le d3 de l'homme, le +3 de l'ours) : la rangée de l'ours
 * n'a aucune compétence, ses dés vides ne disaient rien. Sélection (SkillDice).
 */
function FormLabel({ character, form, tooltip, align }: { character: Character; form: number; tooltip: 'above' | 'below'; align: 'left' | 'center' | 'right' }) {
  const f = character.forms![form]
  return (
    <span className="group relative cursor-help text-[11px] font-bold uppercase tracking-wider text-stone-400 hover:z-[70]">
      {f.name}
      {(f.statuses ?? []).length > 0 && (
        <span
          role="tooltip"
          className={`pointer-events-none invisible absolute z-[70] w-80 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-4 py-3 text-left normal-case tracking-normal opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover:visible group-hover:opacity-100 ${
            tooltip === 'above' ? 'bottom-full mb-3' : 'top-full mt-3'
          } ${ALIGN[align]}`}
        >
          <span className="block font-display text-lg font-extrabold leading-tight text-ink-1">{f.name}</span>
          {(f.statuses ?? []).map((id) => (
            <span key={id} className="mt-1.5 block font-body text-[15px] font-normal leading-snug text-ink-1">
              {STATUSES[id].summary}
            </span>
          ))}
          <span className="mt-1.5 block font-body text-[13px] font-medium text-ink-3">Il change de forme à chacun de ses tours, sauf le premier.</span>
        </span>
      )}
    </span>
  )
}

export const ALIGN = {
  left: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-0',
}

/**
 * Infobulle d'une compétence (dé de sélection, sceau de l'en-tête du combat). `face` : la face du dé ou du double qui
 * la déclenche ; absente pour une compétence hors dé (l'Ouverture : « début du combat »). `notes` : ce que la forge a
 * fait de la face (gravée, dorée), en pied.
 */
export function SkillTooltip({
  event,
  face,
  placement,
  align,
  notes = [],
}: {
  event: CharacterEvent
  face?: number
  placement: 'above' | 'below'
  align: 'left' | 'center' | 'right'
  notes?: readonly string[]
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
          {face === undefined ? triggerText(event.trigger).short : `${double !== undefined ? 'Double' : 'Dé'} ${face}`}
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
      {notes.map((n) => (
        <p key={n} className="mt-1.5 font-body text-[13px] font-medium text-ink-3">
          {n}
        </p>
      ))}
    </div>
  )
}
