import { useState } from 'react'
import type { Character } from '../game/character'
import { DIE_FACES, faceTrigger, type CharacterEvent } from '../game/events'
import { forgeState, rankLabel } from '../game/forge'
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
  /** Sa compétence dans cette forme */
  event?: CharacterEvent
  /** Compétence gravée par la forge */
  engraved: boolean
  /** Bonus de la dorure (0 : aucune) */
  gild: number
  /** Rang de forge de sa compétence (0 : jamais aiguisée) */
  rank: number
}

/** Les faces du dé d'un personnage, de 1 à 6, sous cette forme. */
export function dieCells(character: Character, form = 0): DieCell[] {
  const formId = character.forms?.[form].id
  const events = character.events.filter((e) => !e.form || e.form === formId)
  const forge = forgeState(character.definition, character.forge)
  return Array.from({ length: DIE_FACES }, (_, k) => {
    const face = k + 1
    const event = events.find((e) => e.trigger === faceTrigger(face))
    return {
      face,
      event,
      engraved: !!event && forge.engraved.get(face)?.id === event.id,
      gild: character.gilded[face] ?? 0,
      rank: event ? (forge.ranks.get(event.id) ?? 0) : 0,
    }
  })
}

/** Côté d'un octogone (px de scène) : six faces sur une rangée depuis le d6 (0.105.0) */
const SLOT = 56

/** Le nom court d'une forme, pour le sélecteur : « Forme d'ours » → « Ours ». */
const formLabel = (name: string) => {
  const short = name.replace(/^forme\s+(d'|de\s+)?/i, '')
  return short.charAt(0).toUpperCase() + short.slice(1)
}

/**
 * La section « Dé de combat » de la fiche d'affrontement : en-tête (le dé, la forme du druide) et les six faces sur une
 * rangée. Hauteur fixe (124 px). Jusqu'à la 0.104.0, douze emplacements montraient la taille du dé comme une jauge.
 */
export function DieBuild({ character }: { character: Character }) {
  const [form, setForm] = useState(0)
  const cells = dieCells(character, form)
  const dice = character.dice > 1 ? String(character.dice) : ''
  return (
    <section className="flex h-[124px] shrink-0 flex-col" aria-label={`Dé de ${character.name} : ${dice ? 'deux ' : ''}d${cells.length}`}>
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
          <span className="matchup-section-count">
            {dice}d{cells.length}
          </span>
        </span>
      </header>
      <ul className="die-grid mt-[5px]">
        {cells.map((cell, k) => (
          <FaceSlot key={cell.face} cell={cell} align={k < cells.length / 2 ? 'left' : 'right'} />
        ))}
      </ul>
    </section>
  )
}

function FaceSlot({ cell, align }: { cell: DieCell; align: 'left' | 'right' }) {
  const { face, event, gild, rank, engraved } = cell
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
            {face}
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
            Le coup de base, sans compétence
            {gild ? `, +${gild} (face dorée).` : '.'}
          </p>
        </div>
      )}
    </li>
  )
}

