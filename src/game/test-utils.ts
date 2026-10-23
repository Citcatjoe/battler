/* Outils partagés par les tests : personnages sur mesure aux jets prévisibles. */
import { Character, type CharacterDef, type CharacterStats } from './character'
import type { CharacterEvent } from './events'

/**
 * Personnage de test. Par défaut ses coups sont prévisibles quel que soit le hasard : une attaque fixe de 1, 0 %
 * d'esquive et de critique. Son d6, lui, se tire : imposer les faces par `forcedRolls` (mode triche) pour un jet précis.
 */
export function testCharacter(
  id: string,
  stats: Partial<CharacterStats> = {},
  events: CharacterEvent[] = [],
): Character {
  const def: CharacterDef = {
    id,
    name: id,
    race: 'Test',
    archetype: 'Test',
    stats: { maxHp: 20, attackMin: 1, attackMax: 1, armor: 0, dodgeChance: 0, critChance: 0, critMultiplier: 2, ...stats },
    attackKind: 'physical',
    look: { image: '', facing: 'right', scale: 1, portrait: { x: 50, y: 50, zoom: 1 } },
    lore: { tagline: 'Test.', background: 'Personnage de test.', strengths: ['—'], weaknesses: ['—'] },
    events,
  }
  return new Character(def)
}

/**
 * Un emoji, tel qu'il s'afficherait en couleur : caractère de présentation emoji, ou suivi du
 * sélecteur de variante U+FE0F. Aucun texte du jeu ne doit en contenir (icônes peintes seulement).
 */
export const EMOJI = /\p{Emoji_Presentation}|\uFE0F/u
