import type { ReactNode } from 'react'
import { getRelic } from '../game/relics'
import { CHARACTERS } from '../game/roster'
import { STAGE_HEIGHT, STAGE_WIDTH } from './Stage'
import {
  allMatches,
  matchesInRound,
  matchKey,
  players,
  ROUNDS,
  relicsOf,
  status,
  type MatchRef,
  type Tournament,
} from '../game/tournament'
import { Portrait } from './Portrait'
import { Glyph } from './kit'
import { RelicRow } from './RelicSeal'

/*
 * Arbre du tournoi (design system, refonte 0.47.0), en pixels de la scène 1600×900. Deux mises en page :
 * - `track` (suivi) : les quatre tours, les deux moitiés convergent vers la finale au centre. Les cases
 *   du premier tour, aux extrémités, sont plus larges et plus hautes que les suivantes.
 * - `setup` (configuration) : seul le premier tour se remplit. Ses cases sont grandes, les tours
 *   suivants ne sont plus que des jonctions, et les lignes convergent vers le grand panneau central
 *   (la palette des combattants), qui prend toute la place libérée.
 */
type Layout = 'track' | 'setup'

interface Geometry {
  top: number
  bottom: number
  margin: number
  /** Largeur d'une case par tour (0 : une simple jonction) ; la finale est au centre */
  widths: readonly number[]
  /** Hauteur d'une ligne (un participant) par tour */
  rowH: readonly number[]
  /** Écart entre deux colonnes */
  gap: number
}

const GEOMETRY: Record<Layout, Geometry> = {
  // Tours 2 et 3 à 184 px (168 avant la 0.75.0) : la place des reliques gagnées, à côté du nom
  track: { top: 150, bottom: 880, margin: 24, widths: [208, 184, 184, 208], rowH: [38, 32, 32, 38], gap: 28 },
  setup: { top: 176, bottom: 884, margin: 24, widths: [252, 0, 0, 0], rowH: [42, 0, 0, 0], gap: 30 },
}

/** Géométrie de la configuration : les cases de la saison (SeasonSlots) reprennent celle des cases de l'arbre. */
export const SETUP_GEOMETRY = GEOMETRY.setup

interface Box {
  x: number
  /** Centre vertical */
  cy: number
  w: number
  rowH: number
  side: 'left' | 'right' | 'center'
}

/** Abscisse (bord gauche) de la colonne d'un tour, côté gauche. */
function columnX(g: Geometry, round: number) {
  let x = g.margin
  for (let r = 0; r < round; r++) x += g.widths[r] + g.gap
  return x
}

/** Position d'un match : les deux moitiés de l'arbre convergent vers la finale au centre. */
function boxOf(layout: Layout, { round, index }: MatchRef): Box {
  const g = GEOMETRY[layout]
  const w = g.widths[round]
  const rowH = g.rowH[round]
  if (round === ROUNDS - 1) return { x: STAGE_WIDTH / 2 - w / 2, cy: (g.top + g.bottom) / 2, w, rowH, side: 'center' }
  const perSide = matchesInRound(round) / 2
  const left = index < perSide
  const cy = g.top + (((index % perSide) + 0.5) * (g.bottom - g.top)) / perSide
  const x = columnX(g, round)
  return left ? { x, cy, w, rowH, side: 'left' } : { x: STAGE_WIDTH - x - w, cy, w, rowH, side: 'right' }
}

/** Zone libre au centre de l'arbre, entre les deux dernières colonnes (palette, trophée, champion). */
export function centerZone(layout: Layout) {
  const g = GEOMETRY[layout]
  const edge = columnX(g, ROUNDS - 2) + g.widths[ROUNDS - 2] + (layout === 'setup' ? g.gap : 20)
  return { left: edge, right: STAGE_WIDTH - edge, top: g.top, bottom: g.bottom }
}

const roster = CHARACTERS
const characterById = (id: string) => roster.find((c) => c.id === id)!

/* Couleurs des connecteurs (attributs SVG) : filet du design system, or quand le vainqueur est passé. */
const LINE = 'rgba(232,200,140,0.22)'
const LINE_FILLED = 'rgba(232,200,140,0.42)'
const LINE_WON = '#B9862F'

/** Hauteur réservée à l'infobulle d'une relique (la plus longue, marge comprise) pour choisir son côté. */
const RELIC_TOOLTIP_ROOM = 300

/**
 * Côté de l'infobulle des reliques d'une ligne : au-dessus de la ligne du haut, au-dessous de celle du bas
 * (l'autre participant du match reste lisible), sauf si elle sortirait de la scène.
 */
function relicTooltipSide(rowTop: number, rowH: number, row: 0 | 1): 'above' | 'below' {
  if (row === 0) return rowTop >= RELIC_TOOLTIP_ROOM ? 'above' : 'below'
  return rowTop + rowH + RELIC_TOOLTIP_ROOM <= STAGE_HEIGHT ? 'below' : 'above'
}

interface Props {
  /** Mode configuration : seules les cases du premier tour existent */
  slots?: (string | null)[]
  tournament?: Tournament
  onSlotClick?: (slot: number) => void
  onSlotClear?: (slot: number) => void
  /** Personnage qui sera placé au clic, montré au survol d'une case vide */
  slotHint?: { id: string; name: string }
  /** Actions sur un match prêt */
  onPlay?: (ref: MatchRef) => void
  onSimulate?: (ref: MatchRef) => void
  /** Contenu libre affiché au centre (palette, trophée…) */
  center?: ReactNode
}

export function Bracket({ slots, tournament, onSlotClick, onSlotClear, slotHint, onPlay, onSimulate, center }: Props) {
  const layout: Layout = slots ? 'setup' : 'track'
  const matches = allMatches()
  const zone = centerZone(layout)
  const box = (ref: MatchRef) => boxOf(layout, ref)

  // Participant affiché sur une ligne : en configuration, les cases ; en tournoi, les entrants.
  const entrantAt = (ref: MatchRef, row: 0 | 1) => {
    if (tournament) {
      const idx = players(tournament, ref)[row]
      if (idx === null) return null
      const e = tournament.entrants[idx]
      // Reliques qu'il avait pour ce match : celles gagnées aux tours précédents
      return { idx, character: characterById(e.characterId), label: e.label, relics: relicsOf(tournament, idx, ref.round).map(getRelic) }
    }
    if (ref.round !== 0 || !slots) return null
    const slot = 2 * ref.index + row
    const id = slots[slot]
    return id ? { idx: slot, character: characterById(id), label: characterById(id).name, relics: [] } : null
  }
  /** Un match de configuration dont les deux cases sont remplies : sa ligne s'éclaire */
  const filled = (ref: MatchRef): boolean =>
    !!slots &&
    (ref.round === 0 ? !!slots[2 * ref.index] && !!slots[2 * ref.index + 1] : [0, 1].every((k) => filled({ round: ref.round - 1, index: 2 * ref.index + k })))

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Connecteurs */}
      <svg className="pointer-events-none absolute inset-0" width="100%" height="100%" aria-hidden>
        {matches
          .filter((m) => m.round > 0)
          .flatMap((parent) =>
            [0, 1].map((k) => {
              const child = { round: parent.round - 1, index: 2 * parent.index + k }
              const c = box(child)
              const p = box(parent)
              const toRight = c.side === 'left'
              const x1 = toRight ? c.x + c.w : c.x
              const isFinal = parent.round === ROUNDS - 1
              // Configuration : la finale est le panneau central, les lignes y entrent par son bord
              const x2 =
                layout === 'setup' && isFinal ? (toRight ? zone.left : zone.right) : toRight ? p.x : p.x + p.w
              const y2 = p.cy + (layout === 'track' && !isFinal ? (k === 0 ? -1 : 1) * (p.rowH / 2) : 0)
              const xm = layout === 'setup' && !isFinal ? x2 : (x1 + x2) / 2
              const won = tournament?.results[matchKey(child)]
              const lit = won || filled(child)
              return (
                <path
                  key={`${matchKey(parent)}-${k}`}
                  d={`M ${x1} ${c.cy} H ${xm} V ${y2} H ${x2}`}
                  fill="none"
                  stroke={won ? LINE_WON : lit ? LINE_FILLED : LINE}
                  strokeWidth={won ? 2 : 1.5}
                />
              )
            }),
          )}
        {/* Configuration : un point à chaque jonction des tours suivants */}
        {layout === 'setup' &&
          matches
            .filter((m) => m.round > 0 && m.round < ROUNDS - 1)
            .map((m) => {
              const p = box(m)
              return <circle key={matchKey(m)} cx={p.x} cy={p.cy} r={3} fill={filled(m) ? LINE_FILLED : LINE} />
            })}
      </svg>

      {center && (
        <div
          className="pointer-events-auto absolute flex flex-col items-center"
          style={{ left: zone.left, width: zone.right - zone.left, top: zone.top, height: zone.bottom - zone.top }}
        >
          {center}
        </div>
      )}

      {matches.map((ref) => {
        const b = box(ref)
        if (b.w === 0) return null // configuration : les tours suivants ne sont que des jonctions
        const isFinal = ref.round === ROUNDS - 1
        const leaf = ref.round === 0
        const st = tournament ? status(tournament, ref) : 'pending'
        const result = tournament?.results[matchKey(ref)]
        const right = b.side === 'right'
        return (
          <div
            key={matchKey(ref)}
            data-state={st === 'ready' ? 'ready' : result ? 'done' : 'pending'}
            data-final={isFinal || undefined}
            className="bracket-match pointer-events-auto absolute"
            style={{ left: b.x, top: b.cy - b.rowH, width: b.w, height: b.rowH * 2 }}
          >
            {([0, 1] as const).map((row) => {
              const e = entrantAt(ref, row)
              const won = !!(result && e && result.winner === e.idx)
              const lost = !!(result && e && result.winner !== e.idx)
              const slot = 2 * ref.index + row
              const editable = !!slots && leaf
              // Numéro de la case ; après une saison, le rang de saison du participant (tête de série)
              const seed = (
                <span className="bracket-seed" aria-hidden>
                  {(tournament && leaf && tournament.entrants[slot]?.seasonRank) || slot + 1}
                </span>
              )
              const portraitSize = leaf ? (layout === 'setup' ? 'h-8 w-8' : 'h-7 w-7') : 'h-6 w-6'
              const content = e ? (
                <>
                  <span className={`bracket-face ${portraitSize}`} data-lost={lost || undefined}>
                    <Portrait character={e.character} side={right ? 1 : 0} className="h-full w-full" />
                  </span>
                  <span className="bracket-name" data-won={won || undefined} data-lost={lost || undefined} data-leaf={leaf || undefined}>
                    {e.label}
                  </span>
                  {won && <span className="bracket-hp">{result!.hpLeft} PV</span>}
                  <RelicRow
                    relics={e.relics}
                    size={18}
                    tooltip={relicTooltipSide(b.cy - b.rowH + row * b.rowH, b.rowH, row)}
                    align={right ? 'right' : 'left'}
                  />
                </>
              ) : editable ? (
                <>
                  <span className="bracket-empty group-hover:hidden">Case vide</span>
                  {slotHint && (
                    <span className="bracket-hint hidden group-hover:flex">
                      <span className={`bracket-face ${portraitSize} opacity-70`}>
                        <Portrait character={characterById(slotHint.id)} side={right ? 1 : 0} className="h-full w-full" />
                      </span>
                      + {slotHint.name}
                    </span>
                  )}
                </>
              ) : (
                <span className="bracket-empty">À déterminer</span>
              )
              return (
                <div
                  key={row}
                  data-row={row}
                  className={`bracket-row group ${right ? 'flex-row-reverse text-right' : ''}`}
                  style={{ height: b.rowH }}
                >
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => onSlotClick?.(slot)}
                      aria-label={e ? `Case ${slot + 1} : ${e.label}, remplacer par ${slotHint?.name}` : `Case ${slot + 1} : placer ${slotHint?.name}`}
                      className={`bracket-slot ${right ? 'flex-row-reverse' : ''}`}
                    >
                      {seed}
                      {content}
                    </button>
                  ) : (
                    <>
                      {leaf && seed}
                      {content}
                    </>
                  )}
                  {editable && e && (
                    <button
                      type="button"
                      onClick={() => onSlotClear?.(slot)}
                      className="bracket-clear hidden group-hover:flex"
                      aria-label={`Vider la case ${slot + 1}`}
                      title="Vider la case"
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}

            {st === 'ready' && (
              <div className="absolute -bottom-9 left-0 right-0 flex justify-center gap-1.5">
                <button onClick={() => onPlay?.(ref)} className="bracket-action" data-primary title="Ouvrir l'écran d'affrontement">
                  <Glyph name="combattre" size={16} />
                  Affronter
                </button>
                <button onClick={() => onSimulate?.(ref)} className="bracket-action" title="Simuler ce match directement">
                  <Glyph name="simuler" size={16} />
                  Simuler
                </button>
              </div>
            )}
            {result && (
              <span className="bracket-result">
                <Glyph name={result.mode === 'simulated' ? 'simuler' : 'combattre'} size={14} />
                {result.mode === 'simulated' ? 'simulé' : 'joué'} · {result.turns} tours
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
