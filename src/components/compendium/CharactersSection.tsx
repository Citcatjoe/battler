import { FAMILIES } from '../../game/roster'
import { Portrait } from '../Portrait'
import { CharacterSheet } from './CharacterSheet'

/** Verticale « Personnages » : la liste par famille, et la fiche du personnage choisi. */
export function CharactersSection({ characterId, onSelect }: { characterId: string; onSelect: (id: string) => void }) {
  return (
    <div className="grid h-full min-h-0 grid-cols-[180px_1fr] gap-8">
      <nav aria-label="Personnages" className="flex flex-col gap-4 overflow-y-auto pr-1">
        {FAMILIES.map((family) => (
          <section key={family[0].id}>
            <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-stone-500">
              {family[0].race}
            </h3>
            <ul className="flex flex-col gap-1">
              {family.map((c) => {
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
                        <span className="block truncate text-[11px] text-stone-500">{c.archetype}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </nav>
      <CharacterSheet characterId={characterId} onSelect={onSelect} />
    </div>
  )
}
