import { useMemo, useState, type CSSProperties } from 'react'
import type { Character } from '../game/character'
import { effectiveStats, SIDE_STYLE, type Side } from '../game/combat'
import { DEFAULT_SKILL_NATURE, doubleTrigger, faceTrigger, type CharacterEvent } from '../game/events'
import { forgeState, rankLabel } from '../game/forge'
import { auraOfSkill, STATUS_PLACE } from '../game/states'
import type { Status } from '../game/statuses'
import type { SkillPulse } from '../game/staging'
import { SkillSeal } from './SkillSeal'
import { ALIGN, DieFace, FormLabel, SkillTooltip } from './SkillDice'

/*
 * Le dé d'un personnage, face par face (0.96.0) : toutes les faces de 1 à la taille de son dé du moment (forge,
 * reliques, forme du druide comprises), dans l'ordre, sept par ligne. Une face qui porte une compétence montre son
 * sceau, la face en pastille, son rang (forge) ; une face simple, son chiffre. Une gravure a le liseré violet des runes,
 * une dorure le liseré d'or (et la plaque d'or sur une face simple). Tout se lit dans la donnée : aucune règle ici.
 * En combat (SkillBar), la face que montre le dé qui roule s'éclaire un instant, la face tombée reste marquée, et la
 * compétence qui se déclenche sonne (Ding) ; à l'affrontement, le même dé, sans état de combat.
 */

/** Une face du dé, pour l'écran. */
export interface DieCell {
  face: number
  /** Sa compétence dans la forme en cours (le double de cette face pour deux dés) */
  event?: CharacterEvent
  /** Sa compétence pose une aura : elle sonne sur son médaillon d'aura (SkillBar), pas sur la face */
  aura: boolean
  /** Compétence gravée par la forge */
  engraved: boolean
  /** Bonus de la dorure (0 : aucune) */
  gild: number
  /** Rang de forge de sa compétence (0 : jamais aiguisée) */
  rank: number
}

/** Les statuts d'une forme hors combat (le d3 de l'Incantation), pour lire la taille de son dé. */
const formStatuses = (character: Character, form: number): Status[] => (character.forms?.[form].statuses ?? []).map((id) => ({ id, stacks: 1 }))

/** Les faces du dé d'un personnage, de 1 à la taille de son dé sous ces statuts (en combat) ou sous cette forme. */
export function dieCells(character: Character, form = 0, statuses?: readonly Status[]): DieCell[] {
  const formId = character.forms?.[form].id
  const events = character.events.filter((e) => !e.form || e.form === formId)
  const size = effectiveStats(character, statuses ?? formStatuses(character, form)).damageDie
  const forge = forgeState(character.definition, character.forge)
  return Array.from({ length: size }, (_, k) => {
    const face = k + 1
    const trigger = character.twinDice ? doubleTrigger(face) : faceTrigger(face)
    const event = events.find((e) => e.trigger === trigger)
    return {
      face,
      event,
      aura: !!event && auraOfSkill(event) !== undefined,
      engraved: !!event && forge.engraved.get(face)?.id === event.id,
      gild: character.gilded[face] ?? 0,
      rank: event ? (forge.ranks.get(event.id) ?? 0) : 0,
    }
  })
}

/** Faces par ligne. */
const PER_ROW = 7

const SIZES = {
  /** En-tête du combat, affrontement : le sceau des compétences en grand, son nom dessous */
  md: { cell: 80, seal: 56, gap: 4, names: true },
  /** Compact : sceaux seuls */
  sm: { cell: 48, seal: 40, gap: 4, names: false },
} as const

interface Props {
  character: Character
  /** Sens de la rangée (face 1 au bord gauche ou droit) et côté vers lequel s'alignent les infobulles */
  align?: 'left' | 'right'
  tooltip?: 'above' | 'below'
  size?: keyof typeof SIZES
  /** Druide : la forme montrée ; absente hors combat, une rangée par forme avec son nom */
  form?: number
  /* ---------- En combat seulement (SkillBar) ---------- */
  /** Son camp : ancres des signaux d'activation (`data-signal`), couleur du reflet du dé */
  side?: Side
  /** Ses statuts : taille du dé du moment, jauges comptées sur un sceau */
  statuses?: readonly Status[]
  /** La face qui vient de sortir : sa compétence sonne */
  pulse?: SkillPulse
  /** Le dé roule : les faces qu'il montre en ce moment, et le pas du roulement (relance le reflet) */
  rolling?: { faces: readonly number[]; tick: number }
  /** Les dés sont retombés sur ces faces */
  landed?: readonly number[]
}

export function DieBuild({ character, align = 'left', tooltip = 'above', size = 'md', form, side, statuses, pulse, rolling, landed }: Props) {
  if (character.forms && form === undefined)
    return (
      <div className={`flex flex-col gap-2 ${align === 'right' ? 'items-end' : 'items-start'}`}>
        {character.forms.map((f, k) => (
          <div key={f.id} className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
            <DieBuild character={character} align={align} tooltip={tooltip} size={size} form={k} />
            <FormLabel character={character} form={k} tooltip={tooltip} align={align} />
          </div>
        ))}
      </div>
    )
  return <DieRow character={character} align={align} tooltip={tooltip} size={size} form={form ?? 0} side={side} statuses={statuses} pulse={pulse} rolling={rolling} landed={landed} />
}

function DieRow({
  character,
  align,
  tooltip,
  size,
  form,
  side,
  statuses,
  pulse,
  rolling,
  landed,
}: Required<Pick<Props, 'character' | 'align' | 'tooltip' | 'size' | 'form'>> & Omit<Props, 'character' | 'align' | 'tooltip' | 'size' | 'form'>) {
  const cells = useMemo(() => dieCells(character, form, statuses), [character, form, statuses])
  const dims = SIZES[size]
  const cols = Math.min(cells.length, PER_ROW)
  return (
    <ul
      className={`die-build flex shrink-0 flex-wrap items-start ${align === 'right' ? 'justify-end' : ''} ${side === undefined ? '' : 'is-live'}`}
      data-size={size}
      style={{ width: cols * dims.cell + (cols - 1) * dims.gap, columnGap: dims.gap, rowGap: 8, '--roll': side === undefined ? undefined : SIDE_STYLE[side].hex } as CSSProperties}
      aria-label={`Dé de ${character.name} : ${character.twinDice ? 'deux ' : ''}d${cells.length}`}
    >
      {cells.map((c) => (
        <FaceCell
          key={c.face}
          cell={c}
          side={side}
          twin={character.twinDice}
          statuses={statuses ?? []}
          dims={dims}
          tooltip={tooltip}
          align={align}
          lit={pulse?.face === c.face ? pulse.key : undefined}
          flicker={rolling?.faces.includes(c.face) ? rolling.tick : undefined}
          drawn={!rolling && !!landed?.includes(c.face)}
        />
      ))}
    </ul>
  )
}

function FaceCell({
  cell,
  side,
  twin,
  statuses,
  dims,
  tooltip,
  align,
  lit: litNow,
  flicker: flickerNow,
  drawn,
}: {
  cell: DieCell
  side?: Side
  twin: boolean
  statuses: readonly Status[]
  dims: (typeof SIZES)[keyof typeof SIZES]
  tooltip: 'above' | 'below'
  align: 'left' | 'right'
  lit?: number
  flicker?: number
  drawn: boolean
}) {
  const lit = useLastLit(litNow)
  const flicker = useLastLit(flickerNow)
  const { face, event, gild, rank, engraved } = cell
  const count = event && sealCount(event, statuses)
  const notes = [engraved ? 'Gravée par la forge du dé.' : '', gild ? `Face dorée : +${gild} au coup.` : ''].filter(Boolean)
  return (
    <li
      className="skill-bar-slot die-cell group relative flex flex-col items-center gap-3 hover:z-[70]"
      style={{ width: dims.cell }}
      data-nature={event ? (event.nature ?? DEFAULT_SKILL_NATURE) : 'neutral'}
      data-engraved={engraved ? '' : undefined}
      data-gild={gild ? '' : undefined}
      data-drawn={drawn ? '' : undefined}
    >
      {/* Une compétence qui pose une aura part de son médaillon d'aura (SkillBar) : la face n'en est pas l'ancre */}
      <div className="relative" data-signal={event && side !== undefined && !cell.aura ? `${side}:${event.id}` : undefined}>
        {(engraved || gild > 0) && <span aria-hidden className="die-cell-rim" />}
        {lit !== undefined && event && !cell.aura && <Ding lit={lit} />}
        <div
          key={lit !== undefined ? `flash-${lit}` : 'idle'}
          className={event ? `skill-bar-face cursor-help ${lit !== undefined ? 'is-lit' : ''}` : 'die-cell-plain cursor-help'}
        >
          {event ? (
            <SkillSeal id={event.id} size={dims.seal} />
          ) : (
            <span aria-label={`Face ${face}`} className="skill-seal" style={{ width: dims.seal, height: dims.seal }}>
              {face}
            </span>
          )}
        </div>
        {/* Le reflet du dé qui roule : un éclat fugace à chaque face qu'il montre, relancé à chaque pas */}
        {flicker !== undefined && <span key={`roll-${flicker}`} aria-hidden className="die-cell-flicker" data-k={flicker % 3} />}
        <span aria-hidden className="die-cell-drawn" />
        {event && (
          <span className="absolute -bottom-2 -right-2.5 z-[1]">
            <DieFace face={face} size="xs" empty={false} double={twin} />
          </span>
        )}
        {rank > 0 && <span className="forge-face-rank z-[2]">{rankLabel(rank)}</span>}
        {count !== undefined && <Count text={String(count)} />}
      </div>
      {dims.names && event && (
        <span key={lit !== undefined ? `name-${lit}` : 'name'} className={`skill-bar-name ${lit !== undefined ? 'is-lit' : ''}`} data-long={longName(event.name)}>
          {event.name}
        </span>
      )}
      {event ? (
        <SkillTooltip event={event} face={face} placement={tooltip} align={align} notes={notes} />
      ) : (
        <div
          role="tooltip"
          className={`pointer-events-none invisible absolute z-[70] w-72 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-4 py-3 text-left opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover:visible group-hover:opacity-100 ${
            tooltip === 'above' ? 'bottom-full mb-3' : 'top-full mt-3'
          } ${ALIGN[align]}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-lg font-extrabold leading-tight text-ink-1">Face {face}</span>
            <span className="shrink-0 rounded-(--r-xs) border border-line-2 bg-ink-1/10 px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider text-ink-1">
              {gild ? 'Dorée' : 'Coup'}
            </span>
          </div>
          <p className="mt-1.5 font-body text-[15px] leading-snug text-ink-1">
            {twin ? `Chaque dé qui fait ${face} frappe pour ${face}` : `Frappe pour ${face}`}
            {gild ? `, +${gild} (face dorée).` : '.'}
          </p>
        </div>
      )}
    </li>
  )
}

/** Un nom au mot très long (« Aura d'intimidation ») passe un cran plus petit sous son sceau : il tient sans être coupé. */
export const longName = (name: string) => (name.split(/\s+/).some((word) => word.length >= 12) ? '' : undefined)

/**
 * Le dernier déclenchement d'un sceau, retenu (0.80.2) : la barre ne reçoit que la dernière face sortie, et un sceau
 * qui la perdait (une autre compétence se déclenche) était coupé net, au milieu de son éclat. Il garde la clé de son
 * dernier éclat : son animation va au bout, jusqu'à retomber éteint, et repart seulement à son prochain déclenchement.
 */
export function useLastLit(lit: number | undefined) {
  const [last, setLast] = useState(lit)
  if (lit !== undefined && lit !== last) setLast(lit)
  return lit ?? last
}

/**
 * Le tintement visuel d'une compétence qui se déclenche (0.79.8) : l'onde serrée autour du sceau, puis un éclat de
 * lumière bref qui part de lui et s'étend sur une grande partie de l'arène, avec un anneau fin qui file plus loin.
 * Dans la couleur de la nature de la compétence (ou de l'aura) ; la clé relance l'éclat quand la même face ressort.
 */
export function Ding({ lit, round }: { lit: number; round?: boolean }) {
  return (
    <>
      <span key={`wave-${lit}`} aria-hidden className={`skill-bar-wave ${round ? 'rounded-full' : ''}`} />
      <span key={`burst-${lit}`} aria-hidden className="skill-bar-burst" />
      <span key={`ring-${lit}`} aria-hidden className="skill-bar-ring" />
    </>
  )
}

/** Jauges ou réserve d'une compétence, comptées sur son sceau (Rétribution : les dégâts stockés). */
export function sealCount(event: CharacterEvent, statuses: readonly Status[]): number | undefined {
  for (const effect of event.effects) {
    const id = effect.type === 'release' || effect.type === 'applyStatus' ? effect.status : undefined
    if (!id || !STATUS_PLACE[id].onSeal) continue
    const s = statuses.find((x) => x.id === id)
    return s?.stacks ?? 0
  }
  return undefined
}

/** Pastille de compte, en haut à gauche d'un sceau : jauges d'une compétence, charges d'une aura (dorée). */
export function Count({ text, aura }: { text: string; aura?: boolean }) {
  return (
    <span
      className={`absolute -left-2 -top-2 z-[1] flex h-7 min-w-7 items-center justify-center rounded-full border bg-stone-950 px-1.5 font-display text-base font-extrabold leading-none ${
        aura ? 'border-amber-300/80 text-amber-100' : 'border-line-2 text-ink-1'
      }`}
    >
      {text}
    </span>
  )
}
