import type { ReactNode } from 'react'
import type { IconName } from '../Icon'
import { CharactersSection } from './CharactersSection'
import { SkillsSection } from './SkillsSection'
import { StatusesSection } from './StatusesSection'

/*
 * Verticales du compendium. Ajouter une verticale = un composant de section et une entrée ici :
 * l'onglet, la navigation et la mise en page suivent. Chaque section reçoit le même contexte
 * de navigation (`CompendiumNav`), pour pouvoir pointer vers un personnage depuis n'importe où.
 */

export type CompendiumSectionId = 'characters' | 'skills' | 'statuses'

export interface CompendiumNav {
  characterId: string
  onSelectCharacter: (id: string) => void
}

export interface CompendiumSection {
  id: CompendiumSectionId
  label: string
  icon: IconName
  render: (nav: CompendiumNav) => ReactNode
}

export const COMPENDIUM_SECTIONS: readonly CompendiumSection[] = [
  {
    id: 'characters',
    label: 'Personnages',
    icon: 'scroll',
    render: (nav) => <CharactersSection characterId={nav.characterId} onSelect={nav.onSelectCharacter} />,
  },
  {
    id: 'skills',
    label: 'Compétences',
    icon: 'event',
    render: (nav) => <SkillsSection onSelectCharacter={nav.onSelectCharacter} />,
  },
  {
    id: 'statuses',
    label: 'Bonus et malus',
    icon: 'shield',
    render: () => <StatusesSection />,
  },
]
