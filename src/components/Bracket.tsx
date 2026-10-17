import type { ReactNode } from 'react'
import { Character } from '../game/character'
import { ROSTER } from '../game/roster'
import { STAGE_WIDTH } from './Stage'
import {
  allMatches,
  matchesInRound,
  matchKey,
  players,
  ROUNDS,
  status,
  type MatchRef,
  type Tournament,
} from '../game/tournament'
import { Portrait } from './Portrait'

/* Géométrie de l'arbre, en pixels de la scène 1600×900. */
const TOP = 150
const BOTTOM = 880
const BOX_W = 180
const ROW_H = 32
const BOX_H = ROW_H * 2
const GAP = 40
const MARGIN = 24

interface Box {
  x: number
  /** Centre vertical */
  cy: number
  side: 'left' | 'right' | 'center'
}

/** Position d'un match : les deux moitiés de l'arbre convergent vers la finale au centre. */
export function boxOf({ round, index }: MatchRef): Box {
  if (round === ROUNDS - 1) return { x: STAGE_WIDTH / 2 - BOX_W / 2, cy: (TOP + BOTTOM) / 2, side: 'center' }
  const perSide = matchesInRound(round) / 2
  const left = index < perSide
  const local = index % perSide
  const cy = TOP + ((local + 0.5) * (BOTTOM - TOP)) / perSide
  const offset = round * (BOX_W + GAP)
  return left
    ? { x: MARGIN + offset, cy, side: 'left' }
    : { x: STAGE_WIDTH - MARGIN - BOX_W - offset, cy, side: 'right' }
}

/** Zone libre au centre de l'arbre (entre les deux demi-finales). */
export const CENTER_ZONE = {
  left: MARGIN + 2 * (BOX_W + GAP) + BOX_W + 24,
  right: STAGE_WIDTH - MARGIN - 2 * (BOX_W + GAP) - BOX_W - 24,
  top: TOP,
  bottom: BOTTOM,
}

const roster = ROSTER.map((def) => new Character(def))
const characterById = (id: string) => roster.find((c) => c.id === id)!

interface Props {
  /** Mode configuration : seules les cases du premier tour existent */
  slots?: (string | null)[]
  tournament?: Tournament
  onSlotClick?: (slot: number) => void
  onSlotClear?: (slot: number) => void
  /** Personnage qui sera placé au clic, montré au survol d'une case vide */
  slotHint?: string
  /** Actions sur un match prêt */
  onPlay?: (ref: MatchRef) => void
  onSimulate?: (ref: MatchRef) => void
  /** Contenu libre affiché au centre (palette, trophée…) */
  center?: ReactNode
}

export function Bracket({ slots, tournament, onSlotClick, onSlotClear, slotHint, onPlay, onSimulate, center }: Props) {
  const matches = allMatches()

  // Participant affiché sur une ligne : en configuration, les cases ; en tournoi, les entrants.
  const entrantAt = (ref: MatchRef, row: 0 | 1) => {
    if (tournament) {
      const idx = players(tournament, ref)[row]
      if (idx === null) return null
      const e = tournament.entrants[idx]
      return { idx, character: characterById(e.characterId), label: e.label }
    }
    if (ref.round !== 0 || !slots) return null
    const slot = 2 * ref.index + row
    const id = slots[slot]
    return id ? { idx: slot, character: characterById(id), label: characterById(id).name } : null
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Connecteurs */}
      <svg className="pointer-events-none absolute inset-0" width="100%" height="100%">
        {matches
          .filter((m) => m.round > 0)
          .flatMap((parent) =>
            [0, 1].map((k) => {
              const child = { round: parent.round - 1, index: 2 * parent.index + k }
              const c = boxOf(child)
              const p = boxOf(parent)
              const toRight = c.x < p.x
              const x1 = toRight ? c.x + BOX_W : c.x
              const x2 = toRight ? p.x : p.x + BOX_W
              const y2 = p.cy + (parent.round === ROUNDS - 1 ? 0 : (k === 0 ? -1 : 1) * (ROW_H / 2))
              const xm = (x1 + x2) / 2
              const advanced = tournament?.results[matchKey(child)]
              return (
                <path
                  key={`${matchKey(parent)}-${k}`}
                  d={`M ${x1} ${c.cy} H ${xm} V ${y2} H ${x2}`}
                  fill="none"
                  stroke={advanced ? '#f59e0b' : '#44403c'}
                  strokeWidth={advanced ? 2.5 : 1.5}
                />
              )
            }),
          )}
      </svg>

      {center && (
        <div
          className="pointer-events-auto absolute flex flex-col items-center"
          style={{ left: CENTER_ZONE.left, width: CENTER_ZONE.right - CENTER_ZONE.left, top: CENTER_ZONE.top }}
        >
          {center}
        </div>
      )}

      {matches.map((ref) => {
        const box = boxOf(ref)
        const isFinal = ref.round === ROUNDS - 1
        if (isFinal && slots) return null // la palette occupe le centre pendant la configuration
        const st = tournament ? status(tournament, ref) : 'pending'
        const result = tournament?.results[matchKey(ref)]
        return (
          <div
            key={matchKey(ref)}
            className={`pointer-events-auto absolute rounded-lg border bg-stone-900/90 shadow-lg ${
              st === 'ready'
                ? 'border-amber-500/80 shadow-amber-500/10'
                : isFinal
                  ? 'border-amber-300/50'
                  : 'border-stone-700'
            }`}
            style={{ left: box.x, top: box.cy - BOX_H / 2, width: BOX_W, height: BOX_H }}
          >
            {([0, 1] as const).map((row) => {
              const e = entrantAt(ref, row)
              const won = result && e && result.winner === e.idx
              const lost = result && e && result.winner !== e.idx
              const slot = 2 * ref.index + row
              const editable = slots && ref.round === 0
              return (
                <div
                  key={row}
                  onClick={editable ? () => onSlotClick?.(slot) : undefined}
                  className={`group relative flex items-center gap-2 px-1.5 ${row === 0 ? 'border-b border-stone-800' : ''} ${
                    editable ? 'cursor-pointer hover:bg-stone-800' : ''
                  } ${box.side === 'right' ? 'flex-row-reverse text-right' : ''}`}
                  style={{ height: ROW_H }}
                >
                  {e ? (
                    <>
                      <div className={`h-6 w-6 shrink-0 overflow-hidden rounded ${lost ? 'opacity-30 grayscale' : ''}`}>
                        <Portrait
                          character={e.character}
                          side={box.side === 'right' ? 1 : 0}
                          className="h-full w-full"
                        />
                      </div>
                      <span
                        className={`flex-1 truncate text-sm ${
                          won ? 'font-bold text-amber-200' : lost ? 'text-stone-600 line-through' : 'text-stone-200'
                        }`}
                      >
                        {e.label}
                      </span>
                      {won && <span className="font-mono text-[10px] text-stone-400">{result.hpLeft} PV</span>}
                      {editable && (
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation()
                            onSlotClear?.(slot)
                          }}
                          className="hidden px-1 text-stone-500 hover:text-red-400 group-hover:block"
                          title="Vider la case"
                        >
                          ×
                        </button>
                      )}
                    </>
                  ) : editable ? (
                    <>
                      <span className="flex-1 text-xs italic text-stone-600 group-hover:hidden">Case vide</span>
                      <span className="hidden flex-1 text-xs font-bold text-amber-300 group-hover:block">
                        + {slotHint}
                      </span>
                    </>
                  ) : (
                    <span className="flex-1 text-xs italic text-stone-600">À déterminer</span>
                  )}
                </div>
              )
            })}

            {st === 'ready' && (
              <div className="absolute -bottom-7 left-0 right-0 flex justify-center gap-1">
                <button
                  onClick={() => onPlay?.(ref)}
                  className="rounded bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-stone-950 hover:bg-amber-400"
                  title="Ouvrir l'écran d'affrontement"
                >
                  ⚔ Affronter
                </button>
                <button
                  onClick={() => onSimulate?.(ref)}
                  className="rounded border border-amber-500/70 bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-amber-200 hover:bg-amber-500/10"
                  title="Simuler ce match directement"
                >
                  ⚡ Simuler
                </button>
              </div>
            )}
            {result && (
              <span className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-stone-500">
                {result.mode === 'simulated' ? '⚡ simulé' : '⚔ joué'} · {result.turns} tours
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
