import { useState } from 'react'
import { Tabs } from '../Tabs'
import { BackLink, Glyph } from '../kit'
import { COMPENDIUM_SECTIONS, type CompendiumSectionId, type CompendiumTarget } from './sections'

interface Props {
  section: CompendiumSectionId
  /** Combattant affiché dans « Combattants » (gardé quand on visite une autre section) */
  characterId: string
  /** Élément visé par le dernier lien dans les autres sections (compétence, statut, règle) */
  focus?: string
  onNavigate: (to: CompendiumTarget) => void
  /** Ouvre l'écran Statistiques (onglet Performances d'une fiche) */
  onOpenRecords?: () => void
  onBack: () => void
  backLabel?: string
}

/**
 * Compendium : le savoir du jeu, en sections (combattants, maîtrises, compétences, statuts, reliques, règles).
 * Chaque section a son propre filtre, en haut à droite ; les liens d'une section à l'autre passent par `onNavigate`.
 */
export function CompendiumScreen({ section, characterId, focus, onNavigate, onOpenRecords, onBack, backLabel = 'Retour' }: Props) {
  const current = COMPENDIUM_SECTIONS.find((s) => s.id === section) ?? COMPENDIUM_SECTIONS[0]
  const [filters, setFilters] = useState<Partial<Record<CompendiumSectionId, string>>>({})
  const filter = filters[current.id] ?? ''
  const props = {
    nav: { go: onNavigate, openRecords: onOpenRecords },
    focus: current.id === 'characters' ? characterId : focus,
    filter,
  }
  return (
    // isolate : le fond d'une section (z négatif) passe derrière tout l'écran, sans sortir de lui
    <div className="fade-in relative isolate flex h-full flex-col gap-4 px-12 py-8">
      {current.backdrop?.(props)}
      <header className="flex items-end justify-between gap-8 pr-14">
        <div>
          <BackLink onClick={onBack}>{backLabel}</BackLink>
          <h1 className="font-display text-5xl font-extrabold text-amber-200">Compendium</h1>
        </div>
        <label className="flex items-center gap-2 text-ink-3">
          <Glyph name="filtrer" size={18} />
          <input
            type="search"
            className="codex-filter"
            placeholder={current.placeholder}
            aria-label={current.placeholder}
            value={filter}
            onChange={(e) => setFilters({ ...filters, [current.id]: e.target.value })}
          />
        </label>
      </header>
      <Tabs
        value={current.id}
        onChange={(id) => onNavigate({ section: id })}
        tabs={COMPENDIUM_SECTIONS.map((s) => ({ id: s.id, label: s.label, hint: s.count }))}
      />
      <div key={current.id} className="fade-in min-h-0 flex-1">
        {current.render(props)}
      </div>
    </div>
  )
}
