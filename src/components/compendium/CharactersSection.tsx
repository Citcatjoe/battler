import { MASTERIES } from '../../game/masteries'
import { CHARACTERS } from '../../game/roster'
import { Portrait } from '../Portrait'
import { CharacterFigure, CharacterSheet, FIGURE_COLUMN } from './CharacterSheet'
import { matches, type SectionProps } from './sections'

/** Largeurs de la mise en page : marge de l'écran (px-12 du compendium), index et écart (gap-6) ; la colonne de
 *  l'illustration vient de la fiche. */
const SCREEN_PADDING = 48
const INDEX_WIDTH = 250
const GAP = 24

const selectedOf = (focus?: string) => CHARACTERS.find((c) => c.id === focus) ?? CHARACTERS[0]

/**
 * Fond de la section : le combattant choisi, en grand, debout entre l'index et la fiche. Il est dessiné derrière tout
 * l'écran du compendium : sa tête peut passer derrière le titre et les onglets, ses côtés sous l'index et la fiche.
 */
export function CharactersBackdrop({ focus }: SectionProps) {
  const selected = selectedOf(focus)
  return <CharacterFigure key={selected.id} character={selected} center={SCREEN_PADDING + INDEX_WIDTH + GAP + FIGURE_COLUMN / 2} />
}

/**
 * Section « Combattants » : l'index compact des combattants, et la fiche de celui qui est choisi. Le combattant se
 * tient en fond, entre les deux : l'index et la fiche, encadrés, passent devant lui.
 */
export function CharactersSection({ nav, focus, filter }: SectionProps) {
  const selected = selectedOf(focus)
  const shown = CHARACTERS.filter((c) => matches(filter, c.name, c.race, c.archetype, ...c.definition.masteries.map((id) => MASTERIES[id].name)))
  return (
    <div className="grid h-full min-h-0 gap-6" style={{ gridTemplateColumns: `${INDEX_WIDTH}px 1fr` }}>
      <nav aria-label="Combattants" className="codex-panel scroll-panel min-h-0 overflow-y-auto">
        {shown.length === 0 && <p className="p-4 font-body italic text-ink-3">Aucun combattant ne correspond.</p>}
        {shown.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => nav.go({ section: 'characters', id: c.id })}
            aria-current={c.id === selected.id}
            className="codex-row w-full"
          >
            <span className="h-11 w-11 shrink-0 overflow-hidden rounded-(--r-xs) border border-line-2 bg-surface-1">
              <Portrait character={c} side={0} className="h-full w-full" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-[17px] font-bold leading-tight text-ink-1">{c.name}</span>
              <span className="block truncate font-body text-[14px] text-ink-3">
                {c.race} · {c.archetype}
              </span>
            </span>
          </button>
        ))}
      </nav>
      <CharacterSheet characterId={selected.id} nav={nav} />
    </div>
  )
}
