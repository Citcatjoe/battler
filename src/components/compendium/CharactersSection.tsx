import { CHARACTERS } from '../../game/roster'
import { Portrait } from '../Portrait'
import { CharacterSheet } from './CharacterSheet'

/** Verticale « Personnages » : la liste des personnages (un par famille, 0.43.0), et la fiche du personnage choisi. */
export function CharactersSection({ characterId, onSelect }: { characterId: string; onSelect: (id: string) => void }) {
  return (
    <div className="grid h-full min-h-0 grid-cols-[180px_1fr] gap-8">
      <nav aria-label="Personnages" className="flex flex-col gap-4 overflow-y-auto pr-1">
        <ul className="flex flex-col gap-1">
              {CHARACTERS.map((c) => {
                const selected = c.id === characterId
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => onSelect(c.id)}
                      aria-pressed={selected}
                      className={`flex w-full items-center gap-2.5 rounded-lg border p-1 pr-2 text-left transition ${
                        selected
                          ? 'border-amber-400/80 bg-amber-500/10 text-amber-100'
                          : 'border-transparent text-stone-400 hover:border-stone-700 hover:text-stone-100'
                      }`}
                    >
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-stone-700 bg-stone-900">
                        <Portrait character={c} side={0} className="h-full w-full" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-display text-base font-bold leading-tight">{c.name}</span>
                        <span className="block truncate text-[13px] text-stone-500">{c.race} · {c.archetype}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
        </ul>
      </nav>
      <CharacterSheet characterId={characterId} onSelect={onSelect} />
    </div>
  )
}
