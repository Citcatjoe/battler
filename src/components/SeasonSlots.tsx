import type { ReactNode } from 'react'
import { CHARACTERS } from '../game/roster'
import { centerZone, SETUP_GEOMETRY } from './Bracket'
import { Portrait } from './Portrait'
import { STAGE_WIDTH } from './Stage'

interface Props {
  /** Les cases de la saison (20, 24 ou 32), dans l'ordre de tirage */
  slots: (string | null)[]
  /** Personnage qui sera placé au clic, montré au survol d'une case vide */
  slotHint: { id: string; name: string }
  onSlotClick: (slot: number) => void
  onSlotClear: (slot: number) => void
  /** Le panneau central (la palette), à la place qu'il occupe dans la configuration de l'arbre */
  center: ReactNode
}

const characterById = (id: string) => CHARACTERS.find((c) => c.id === id)!

/**
 * Configuration d'un tournoi avec saison (0.86.1) : les participants de la saison, et non les cases de l'arbre (il ne
 * se peuple qu'à la fin de la saison). Les cases se rangent sur deux colonnes, aux places des extrémités de l'arbre
 * (1 à n/2 à gauche, la suite à droite), avec la même allure et le même pinceau.
 */
export function SeasonSlots({ slots, slotHint, onSlotClick, onSlotClear, center }: Props) {
  const g = SETUP_GEOMETRY
  const width = g.widths[0]
  const zone = centerZone('setup')
  const perSide = slots.length / 2
  const spacing = (g.bottom - g.top) / perSide
  const rowH = Math.min(g.rowH[0], spacing - 4)

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="pointer-events-auto absolute flex flex-col items-center"
        style={{ left: zone.left, width: zone.right - zone.left, top: zone.top, height: zone.bottom - zone.top }}
      >
        {center}
      </div>
      {slots.map((id, slot) => {
        const right = slot >= perSide
        const cy = g.top + ((slot % perSide) + 0.5) * spacing
        const character = id ? characterById(id) : null
        return (
          <div
            key={slot}
            className="bracket-match pointer-events-auto absolute"
            style={{ left: right ? STAGE_WIDTH - g.margin - width : g.margin, top: cy - rowH / 2, width, height: rowH }}
          >
            <div className={`bracket-row group ${right ? 'flex-row-reverse text-right' : ''}`} style={{ height: rowH }}>
              <button
                type="button"
                onClick={() => onSlotClick(slot)}
                aria-label={character ? `Case ${slot + 1} : ${character.name}, remplacer par ${slotHint.name}` : `Case ${slot + 1} : placer ${slotHint.name}`}
                className={`bracket-slot ${right ? 'flex-row-reverse' : ''}`}
              >
                <span className="bracket-seed" aria-hidden>
                  {slot + 1}
                </span>
                {character ? (
                  <>
                    <span className="bracket-face h-8 w-8">
                      <Portrait character={character} side={right ? 1 : 0} className="h-full w-full" />
                    </span>
                    <span className="bracket-name" data-leaf>
                      {character.name}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="bracket-empty group-hover:hidden">Case vide</span>
                    <span className="bracket-hint hidden group-hover:flex">
                      <span className="bracket-face h-8 w-8 opacity-70">
                        <Portrait character={characterById(slotHint.id)} side={right ? 1 : 0} className="h-full w-full" />
                      </span>
                      + {slotHint.name}
                    </span>
                  </>
                )}
              </button>
              {character && (
                <button
                  type="button"
                  onClick={() => onSlotClear(slot)}
                  className="bracket-clear hidden group-hover:flex"
                  aria-label={`Vider la case ${slot + 1}`}
                  title="Vider la case"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
