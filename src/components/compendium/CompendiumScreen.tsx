import { Tabs } from '../Tabs'
import { COMPENDIUM_SECTIONS, type CompendiumSectionId } from './sections'

interface Props {
  section: CompendiumSectionId
  characterId: string
  onNavigate: (to: { section?: CompendiumSectionId; characterId?: string }) => void
  onBack: () => void
  backLabel?: string
}

/** Compendium : le recueil du jeu, une verticale par onglet (personnages, bonus et malus…). */
export function CompendiumScreen({ section, characterId, onNavigate, onBack, backLabel = '← Retour' }: Props) {
  const current = COMPENDIUM_SECTIONS.find((s) => s.id === section) ?? COMPENDIUM_SECTIONS[0]
  return (
    <div className="fade-in flex h-full flex-col gap-5 px-12 py-8">
      <header className="flex items-end justify-between gap-8 pr-14">
        <div>
          <button onClick={onBack} className="text-sm font-bold text-stone-400 hover:text-stone-100">
            {backLabel}
          </button>
          <h1 className="font-display text-5xl font-extrabold text-amber-200">Compendium</h1>
        </div>
        <Tabs
          value={current.id}
          onChange={(id) => onNavigate({ section: id })}
          tabs={COMPENDIUM_SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon }))}
        />
      </header>
      <div key={current.id} className="fade-in min-h-0 flex-1">
        {current.render({
          characterId,
          onSelectCharacter: (id) => onNavigate({ section: 'characters', characterId: id }),
        })}
      </div>
    </div>
  )
}
