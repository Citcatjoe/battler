import { describeSkill, triggerText, type CharacterEvent } from '../game/events'
import { STATES, statesPosedBy } from '../game/states'
import { POLARITY_STYLE } from '../game/statuses'
import { StateIcon } from './Icon'
import { SkillSeal } from './SkillSeal'

/*
 * Le dé de compétence en pastille (DieFace, sur les sceaux de la zone de compétences du combat) et l'infobulle d'une
 * compétence (SkillTooltip), communes aux écrans qui montrent un dé. La rangée de dés du choix du champion (SkillDice)
 * est retirée en 0.111.0 (demande de l'utilisateur : doublon de la mention de la signature).
 */

/** Points d'une face de dé, sur une grille de 3 × 3 (1 : centre ; 2 : diagonale ; 3 : diagonale et centre…). Au-delà de 6, son chiffre. */
export const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
}

/** Une face de dé de compétence (ses points), en pastille des sceaux (SkillBar). Au-delà de 6, son chiffre. */
export function DieFace({ face, empty }: { face: number; empty: boolean }) {
  const pips = PIPS[face]
  return (
    <div
      aria-label={`Dé ${face}`}
      className={`skill-die skill-die-xs h-[28px] w-[28px] rounded-[7px] p-[4px] ${pips ? 'grid grid-cols-3 grid-rows-3' : 'skill-die-number'} ${empty ? 'opacity-30' : 'cursor-help'}`}
    >
      {pips
        ? pips.map(([x, y]) => <span key={`${x}${y}`} className="skill-pip rounded-full" style={{ gridColumn: x + 1, gridRow: y + 1 }} />)
        : face}
    </div>
  )
}

export const ALIGN = {
  left: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-0',
}

/**
 * Infobulle d'une compétence (sceau de la zone de compétences du combat, dé forgé, fiche d'affrontement). `face` : la
 * face du dé qui la déclenche ; absente pour une compétence hors dé (« début du combat » ; l'Ouverture jusqu'au 2026-10-27). `badge` :
 * remplace la pastille de face quand la compétence n'est sur aucun dé (une maîtrise au compendium : « Aura »). `notes` :
 * ce que la forge a fait de la face (gravée), en pied. `floating` : ouverte dans un calque (TipLayer), sans position propre.
 */
export function SkillTooltip({
  event,
  face,
  badge,
  placement,
  align,
  notes = [],
}: {
  event: CharacterEvent
  face?: number
  badge?: string
  placement: 'above' | 'below' | 'floating'
  align?: 'left' | 'center' | 'right'
  notes?: readonly string[]
}) {
  // Le même texte que le compendium (describeSkill) : pastilles en tête, puis l'effet et les statuts posés
  const { text, tags } = describeSkill(event)
  const states = statesPosedBy(event.effects)
  return (
    <div
      role="tooltip"
      className={`w-80 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-4 py-3 text-left shadow-(--shadow-2) ${
        placement === 'floating'
          ? ''
          : `pointer-events-none invisible absolute z-[70] opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 ${
              placement === 'above' ? 'bottom-full mb-3' : 'top-full mt-3'
            } ${ALIGN[align ?? 'left']}`
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-display text-lg font-extrabold leading-tight text-ink-1">
          <SkillSeal id={event.id} size={32} />
          {event.name}
        </span>
        <span className="shrink-0 rounded-(--r-xs) border border-arcane/60 bg-arcane/15 px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider text-arcane">
          {badge ?? (face === undefined ? triggerText(event.trigger).short : `Dé ${face}`)}
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
