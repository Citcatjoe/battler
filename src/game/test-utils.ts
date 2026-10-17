/* Outils partagés par les tests : personnages sur mesure aux jets prévisibles. */
import { Character, type CharacterDef, type CharacterStats } from './character'
import type { CharacterEvent } from './events'

/**
 * Personnage de test. Par défaut ses jets sont entièrement prévisibles quel que soit le hasard :
 * dé à 1 face (toujours 1), 0 % d'esquive et de critique.
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
    stats: { maxHp: 20, damageDie: 1, armor: 0, dodgeChance: 0, critChance: 0, critMultiplier: 2, ...stats },
    look: { image: '', facing: 'right', scale: 1, portrait: { x: 50, y: 50, zoom: 1 } },
    lore: { tagline: 'Test.', background: 'Personnage de test.', strengths: ['—'], weaknesses: ['—'] },
    events,
  }
  return new Character(def)
}
