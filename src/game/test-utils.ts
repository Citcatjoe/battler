/* Outils partagés par les tests : personnages sur mesure aux jets prévisibles. */
import { Character, type CharacterDef, type CharacterStats } from './character'
import { faceTrigger, type CharacterEvent } from './events'
import { createCharacter } from './roster'
import { skillById } from './skills'

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
    look: { image: '', facing: 'right', scale: 1, portrait: { x: 50, y: 50, zoom: 1 } },
    lore: { tagline: 'Test.', background: 'Personnage de test.', strengths: ['—'], weaknesses: ['—'] },
    events,
    masteries: ['fury', 'blood'],
  }
  return new Character(def)
}

/**
 * Le dé d'un personnage tel qu'il était jusqu'à la 0.120.0, avant les Maîtrises (2026-10-27) : ses deux compétences sur le 1
 * et le 2 (les sorts du druide sous forme humaine). Les tests d'une mécanique (Furie des vents, Pourfendre, Riposte, Foudre,
 * Soliste…) la jouent sur ce dé ; le dé vanilla d'aujourd'hui est figé par modules.test.ts.
 */
export const DIE_0120: Record<string, readonly [string, string]> = {
  gorak: ['wind-fury', 'cleave'],
  elaria: ['hawk-eye', 'evasion'],
  aldric: ['retribution', 'riposte'],
  thaldrin: ['firefly', 'thunderbolt'],
  fanchon: ['duo', 'soloist'],
}
export function oldDie(id: string): Character {
  const form = id === 'thaldrin' ? { form: 'human' } : {}
  return createCharacter(id).adjusted({ events: DIE_0120[id].map((skill, k) => ({ ...skillById(skill), trigger: faceTrigger(k + 1), ...form })) })
}

/** Un personnage du roster, sur son dé de la 0.120.0 s'il a changé avec les Maîtrises (`oldDie`), sinon tel quel. */
export const onOldDie = (id: string) => (id in DIE_0120 ? oldDie(id) : createCharacter(id))

/**
 * Un emoji, tel qu'il s'afficherait en couleur : caractère de présentation emoji, ou suivi du
 * sélecteur de variante U+FE0F. Aucun texte du jeu ne doit en contenir (icônes peintes seulement).
 */
export const EMOJI = /\p{Emoji_Presentation}|\uFE0F/u
