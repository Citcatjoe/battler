import type { ReactNode } from 'react'
import { MASTERY_IDS } from '../../game/masteries'
import { RELICS } from '../../game/relics'
import { CHARACTERS } from '../../game/roster'
import { sheetStatuses } from '../../game/catalog'
import { CharactersBackdrop, CharactersSection } from './CharactersSection'
import { MasteriesSection } from './MasteriesSection'
import { RelicsSection } from './RelicsSection'
import { RulesSection } from './RulesSection'
import { compendiumSkills, SkillsSection } from './SkillsSection'
import { StatusesSection } from './StatusesSection'

/*
 * Sections du compendium : le savoir du jeu, ce qui ne change pas d'un combat à l'autre (les résultats sont dans
 * l'écran Statistiques). Une donnée, une maison : chaque information est décrite dans une seule section, et
 * apparaît ailleurs en résumé avec un lien vers elle (`CompendiumNav.go`).
 * Ajouter une section = un composant et une entrée ici : l'onglet, le filtre et la navigation suivent. Toutes les
 * compétences, auras comprises, ont leur fiche dans l'onglet Compétences et auras (les auras en tête de sa liste,
 * retour du 2026-10-30) ; les auras se rangent aussi par maîtrise dans l'onglet Maîtrises (docs/MAITRISES.md § 12 ;
 * l'onglet Auras du premier retour du 2026-10-27 est retiré au second, B4).
 */

export type CompendiumSectionId = 'characters' | 'masteries' | 'skills' | 'statuses' | 'relics' | 'rules'

/** Où mène un lien du compendium : une section, et l'élément à montrer (personnage, compétence, statut, relique, règle). */
export interface CompendiumTarget {
  section: CompendiumSectionId
  id?: string
}

export interface CompendiumNav {
  go: (to: CompendiumTarget) => void
  /** Ouvre l'écran Statistiques (lien « Voir dans Statistiques » de l'onglet Performances) */
  openRecords?: () => void
}

/** Ce que reçoit une section : la navigation, l'élément à montrer et le texte de son filtre. */
export interface SectionProps {
  nav: CompendiumNav
  focus?: string
  filter: string
}

export interface CompendiumSection {
  id: CompendiumSectionId
  label: string
  /** Nombre affiché à droite de l'onglet */
  count?: number
  placeholder: string
  render: (props: SectionProps) => ReactNode
  /**
   * Fond de la section, dessiné derrière tout l'écran (en-tête et onglets compris) : la grande illustration du
   * combattant choisi. Il ne capte pas les clics.
   */
  backdrop?: (props: SectionProps) => ReactNode
}

export const COMPENDIUM_SECTIONS: readonly CompendiumSection[] = [
  {
    id: 'characters',
    label: 'Combattants',
    count: CHARACTERS.length,
    placeholder: 'Filtrer les combattants…',
    render: (props) => <CharactersSection {...props} />,
    backdrop: (props) => <CharactersBackdrop {...props} />,
  },
  {
    id: 'masteries',
    label: 'Maîtrises',
    count: MASTERY_IDS.length,
    placeholder: 'Filtrer les maîtrises…',
    render: (props) => <MasteriesSection {...props} />,
  },
  {
    id: 'skills',
    label: 'Compétences et auras',
    count: compendiumSkills().length,
    placeholder: 'Filtrer les compétences et auras…',
    render: (props) => <SkillsSection {...props} />,
  },
  {
    id: 'statuses',
    label: 'Statuts',
    count: sheetStatuses().length,
    placeholder: 'Filtrer les statuts…',
    render: (props) => <StatusesSection {...props} />,
  },
  {
    id: 'relics',
    label: 'Reliques',
    count: RELICS.length,
    placeholder: 'Filtrer les reliques…',
    render: (props) => <RelicsSection {...props} />,
  },
  { id: 'rules', label: 'Règles', placeholder: 'Filtrer les règles…', render: (props) => <RulesSection {...props} /> },
]

/** Le texte d'un filtre contient-il l'un des champs ? (casse et accents ignorés) */
export function matches(filter: string, ...fields: (string | undefined)[]) {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const f = norm(filter.trim())
  return f === '' || fields.some((x) => x !== undefined && norm(x).includes(f))
}
