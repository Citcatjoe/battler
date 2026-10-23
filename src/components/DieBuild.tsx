import { useState } from 'react'
import type { Character } from '../game/character'
import { effectiveStats } from '../game/combat'
import { doubleTrigger, faceTrigger, type CharacterEvent } from '../game/events'
import { forgeState, rankLabel } from '../game/forge'
import type { Status } from '../game/statuses'
import { SegmentedControl } from './kit'
import { SkillSeal } from './SkillSeal'
import { ALIGN, SkillTooltip } from './SkillDice'

/*
 * Le dé d'un personnage à l'affrontement (géométrie fixe, 0.99.0) : toujours douze emplacements, deux rangées de six
 * octogones de 44 px. Les faces du dé (forge, reliques, forme du druide comprises) occupent les premiers, dans l'ordre ;
 * les emplacements au-delà de sa taille restent visibles, grisés : la taille du dé se lit comme une jauge. Une face
 * simple montre son chiffre ; une face à compétence, l'emblème peint et le chiffre dans un cartouche en bas à gauche ;
 * une compétence gravée par la forge (« face forgée »), un cadre et un fond d'or ; une face dorée, un fond d'or sans le
 * cadre, et son bonus (« +2 ») au cartouche ; une compétence aiguisée, son rang en pastille d'or en haut à droite. Au-delà
 * de douze faces, « +N faces » en or dans l'en-tête, la liste en infobulle. Ni halo, ni effet de survol : seule
 * l'infobulle s'ouvre. Tout se lit dans la donnée : aucune règle ici.
 */

/** Une face du dé, pour l'écran. */
export interface DieCell {
  face: number
  /** Sa compétence dans cette forme (le double de cette face pour deux dés) */
  event?: CharacterEvent
  /** Compétence gravée par la forge */
  engraved: boolean
  /** Bonus de la dorure (0 : aucune) */
  gild: number
  /** Ce que frappe la face (valeur imprimée, forge comprise), dorure non comprise */
  value: number
  /** Rang de forge de sa compétence (0 : jamais aiguisée) */
  rank: number
}

/** Les statuts d'une forme hors combat (le d3 de l'Incantation), pour lire la taille de son dé. */
const formStatuses = (character: Character, form: number): Status[] => (character.forms?.[form].statuses ?? []).map((id) => ({ id, stacks: 1 }))

/** Les faces du dé d'un personnage, de 1 à la taille de son dé sous cette forme. */
export function dieCells(character: Character, form = 0): DieCell[] {
  const formId = character.forms?.[form].id
  const events = character.events.filter((e) => !e.form || e.form === formId)
  const size = effectiveStats(character, formStatuses(character, form)).damageDie
  const forge = forgeState(character.definition, character.forge)
  return Array.from({ length: size }, (_, k) => {
    const face = k + 1
    const trigger = character.twinDice ? doubleTrigger(face) : faceTrigger(face)
    const event = events.find((e) => e.trigger === trigger)
    return {
      face,
      event,
      engraved: !!event && forge.engraved.get(face)?.id === event.id,
      gild: character.gilded[face] ?? 0,
      value: character.strikeValue(face),
      rank: event ? (forge.ranks.get(event.id) ?? 0) : 0,
    }
  })
}

/** Emplacements du dé à l'affrontement : deux rangées de six. */
export const DIE_SLOTS = 12
const PER_ROW = 6
/** Côté d'un octogone (px de scène) */
const SLOT = 44

/** Le nom court d'une forme, pour le sélecteur : « Forme d'ours » → « Ours ». */
const formLabel = (name: string) => {
  const short = name.replace(/^forme\s+(d'|de\s+)?/i, '')
  return short.charAt(0).toUpperCase() + short.slice(1)
}

/**
 * La section « Dé de combat » de la fiche d'affrontement : en-tête (taille du dé, forme du druide, faces au-delà de
 * douze) et grille de douze emplacements. Hauteur fixe (124 px) quel que soit le dé.
 */
export function DieBuild({ character }: { character: Character }) {
  const [form, setForm] = useState(0)
  const cells = dieCells(character, form)
  const extra = cells.slice(DIE_SLOTS)
  const twin = character.twinDice
  return (
    <section className="flex h-[124px] shrink-0 flex-col" aria-label={`Dé de ${character.name} : ${twin ? 'deux ' : ''}d${cells.length}`}>
      <header className="matchup-section-head">
        <span>Dé de combat</span>
        <span className="flex items-center gap-3">
          {character.forms && (
            // Le sélecteur du kit (38 px) déborde de l'en-tête vers le haut, jamais sur la grille
            <span className="relative -top-[7px]">
              <SegmentedControl
                label="Forme montrée"
                options={character.forms.map((f, k) => ({ value: k, label: formLabel(f.name), title: f.name }))}
                value={form}
                onChange={setForm}
              />
            </span>
          )}
          {extra.length > 0 && <ExtraFaces cells={extra} twin={twin} />}
          <span className="matchup-section-count">
            {twin ? '2' : ''}d{cells.length}
          </span>
        </span>
      </header>
      <ul className="die-grid mt-[5px]">
        {Array.from({ length: DIE_SLOTS }, (_, k) => {
          const align = k % PER_ROW < PER_ROW / 2 ? 'left' : 'right'
          const cell = cells[k]
          return cell ? (
            <FaceSlot key={k} cell={cell} twin={twin} align={align} />
          ) : (
            <li key={k} className="die-slot" data-empty="" aria-hidden>
              <span className="skill-seal" style={{ width: SLOT, height: SLOT }} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function FaceSlot({ cell, twin, align }: { cell: DieCell; twin: boolean; align: 'left' | 'right' }) {
  const { face, event, gild, rank, engraved, value } = cell
  // Cartouche : le chiffre d'une face à compétence, suivi du bonus d'une dorure (« 3+2 ») ; le bonus seul sur une face simple
  const plate = `${event ? face : ''}${gild ? `+${gild}` : ''}`
  return (
    // hover:z-[70] : l'infobulle passe au-dessus des faces voisines (aucun effet visible sur la face)
    <li className="die-slot group relative hover:z-[70]" data-forged={engraved ? '' : undefined} data-gild={gild ? '' : undefined}>
      <div className="relative cursor-help">
        {event ? (
          <SkillSeal id={event.id} size={SLOT} />
        ) : (
          <span aria-label={`Face ${face}`} className="skill-seal die-slot-plain" style={{ width: SLOT, height: SLOT }}>
            {value}
          </span>
        )}
        {plate && <span className="die-slot-num">{plate}</span>}
        {rank > 0 && <span className="die-slot-rank">{rankLabel(rank)}</span>}
      </div>
      {event ? (
        <SkillTooltip
          event={event}
          face={face}
          placement="above"
          align={align}
          notes={[engraved ? 'Gravée par la forge du dé.' : '', gild ? `Face dorée : +${gild} au coup.` : ''].filter(Boolean)}
        />
      ) : (
        <div
          role="tooltip"
          className={`pointer-events-none invisible absolute bottom-full z-[70] mb-3 w-72 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-4 py-3 text-left opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover:visible group-hover:opacity-100 ${ALIGN[align]}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-lg font-extrabold leading-tight text-ink-1">Face {face}</span>
            <span className="shrink-0 rounded-(--r-xs) border border-line-2 bg-ink-1/10 px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider text-ink-1">
              {gild ? 'Dorée' : 'Coup'}
            </span>
          </div>
          <p className="mt-1.5 font-body text-[15px] leading-snug text-ink-1">
            {twin ? `Chaque dé qui fait ${face} frappe pour ${value}` : `Frappe pour ${value}`}
            {gild ? `, +${gild} (face dorée).` : '.'}
          </p>
        </div>
      )}
    </li>
  )
}

/** Les faces au-delà des douze emplacements (forge) : « +N faces » en or, leur liste en infobulle. */
function ExtraFaces({ cells, twin }: { cells: readonly DieCell[]; twin: boolean }) {
  return (
    <span className="group relative cursor-help hover:z-[70]">
      <span className="matchup-section-more">
        +{cells.length} face{cells.length > 1 ? 's' : ''}
      </span>
      <div
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full right-0 z-[70] mb-3 w-80 rounded-(--r-sm) border border-gold-500/60 bg-surface-1/95 px-4 py-3 text-left normal-case tracking-normal opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
      >
        <span className="block font-display text-lg font-extrabold leading-tight text-ink-1">Faces au-delà de {DIE_SLOTS}</span>
        <ul className="mt-2 flex flex-col gap-1">
          {cells.map((c) => {
            const forge = [c.engraved ? 'gravée' : '', c.rank > 0 ? `rang ${rankLabel(c.rank)}` : '', c.gild ? `dorée +${c.gild}` : ''].filter(Boolean)
            return (
              <li key={c.face} className="flex items-baseline gap-2 font-body text-[15px] leading-snug text-ink-1">
                <span className="w-14 shrink-0 font-data text-[13px] text-ink-2">
                  {twin ? 'Double' : 'Dé'} {c.face}
                </span>
                <span>
                  {c.event ? c.event.name : 'Coup'}
                  {forge.length > 0 && <span className="text-gold-300"> · {forge.join(', ')}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </span>
  )
}
