// Types de BattlerIcon.jsx, copié tel quel depuis docs/ui-kit/ (source de vérité des glyphes de commande).
// Un glyphe ajouté au kit s'ajoute aussi à GlyphName.
import type { JSX } from 'react'

export type GlyphName =
  | 'combattre'
  | 'tournoi'
  | 'hasard'
  | 'changer'
  | 'parier'
  | 'simuler'
  | 'statistiques'
  | 'compendium'
  | 'chroniques'
  | 'retour'
  | 'son'
  | 'son-coupe'
  | 'musique'
  | 'musique-coupee'
  | 'lecture'
  | 'pause'
  | 'journal'
  | 'magnetoscope'
  | 'moment-precedent'
  | 'moment-suivant'
  | 'phase-suivante'
  | 'rejouer'
  | 'reinitialiser'
  | 'copier'
  | 'fermer'
  | 'filtrer'
  | 'info'

export type GlyphSize = 14 | 16 | 18 | 20 | 22 | 24

export declare const GLYPHS: Record<GlyphName, JSX.Element>

export declare function BattlerIcon(props: { name: GlyphName; size?: GlyphSize; className?: string; title?: string }): JSX.Element | null
