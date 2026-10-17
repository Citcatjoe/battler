import orcImg from '../assets/orc.png'
import elfImg from '../assets/elf.png'
import dwarfImg from '../assets/dwarf.png'
import { Character, variant, type CharacterDef } from './character'

/*
 * Archétypes par race :
 * - Orc : brute, beaucoup de PV et un gros dé, mais lent à esquiver.
 * - Elfe : agile, peu de PV, esquive et critiques fréquents.
 * - Nain : tank, armure qui réduit chaque coup, critiques rares mais lourds.
 * Chaque variante de coloris décale légèrement ces stats et hérite de l'événement de sa race :
 * - Orc, Rage du sang : sur un 1 au dé, regagne 5 PV.
 * - Elfe, Œil de faucon : sur un 1 au dé, son prochain coup qui touche est critique.
 * - Nain, Peau de pierre : sur un 1 au dé, +4 d'armure temporaire, cumulable, qui s'use en encaissant.
 */

const gorak: CharacterDef = {
  id: 'gorak',
  name: 'Gorak',
  race: 'Orc',
  archetype: 'Brute',
  stats: { maxHp: 61, damageDie: 10, armor: 0, dodgeChance: 0.05, critChance: 0.1, critMultiplier: 2 },
  look: { image: orcImg, facing: 'right', scale: 1, portrait: { x: 55, y: 5, zoom: 3 } },
  events: [{ id: 'blood-rage', name: 'Rage du sang', trigger: 'naturalOne', effects: [{ type: 'heal', amount: 5 }] }],
}

const murzug = variant(gorak, {
  id: 'murzug',
  name: 'Murzug',
  archetype: 'Berserker',
  tint: 'hue-rotate(-75deg) saturate(1.25) brightness(0.95)',
  stats: { maxHp: -4, critChance: +0.08 },
})

const elaria: CharacterDef = {
  id: 'elaria',
  name: 'Elaria',
  race: 'Elfe',
  archetype: 'Rôdeuse',
  stats: { maxHp: 48, damageDie: 8, armor: 0, dodgeChance: 0.33, critChance: 0.22, critMultiplier: 2 },
  look: { image: elfImg, facing: 'right', scale: 1.04, portrait: { x: 57, y: 7, zoom: 3.4 } },
  events: [
    {
      id: 'hawk-eye',
      name: 'Œil de faucon',
      trigger: 'naturalOne',
      effects: [{ type: 'buff', kind: 'guaranteedCrit', amount: 1 }],
    },
  ],
}

const sylwen = variant(elaria, {
  id: 'sylwen',
  name: 'Sylwen',
  archetype: 'Sentinelle sylvestre',
  tint: 'hue-rotate(120deg)',
  stats: { maxHp: +2, dodgeChance: -0.07, critChance: -0.05, critMultiplier: +0.4 },
})

const brokk: CharacterDef = {
  id: 'brokk',
  name: 'Brokk',
  race: 'Nain',
  archetype: 'Gardien',
  stats: { maxHp: 52, damageDie: 8, armor: 2, dodgeChance: 0.06, critChance: 0.08, critMultiplier: 2.5 },
  look: { image: dwarfImg, facing: 'left', scale: 0.78, portrait: { x: 38, y: 40, zoom: 2.8 } },
  events: [
    {
      id: 'stoneskin',
      name: 'Peau de pierre',
      trigger: 'naturalOne',
      effects: [{ type: 'buff', kind: 'bonusArmor', amount: 4 }],
    },
  ],
}

const grimbald = variant(brokk, {
  id: 'grimbald',
  name: 'Grimbald',
  archetype: 'Briseur de fer',
  tint: 'saturate(0.15) brightness(1.15)',
  stats: { damageDie: +2, armor: -1, maxHp: -2 },
})

/** Personnages disponibles, dans l'ordre d'affichage. Pour en ajouter un : une entrée ici. */
export const ROSTER: CharacterDef[] = [gorak, murzug, elaria, sylwen, brokk, grimbald]

export const createCharacter = (id: string) => {
  const def = ROSTER.find((c) => c.id === id)
  if (!def) throw new Error(`Personnage inconnu : ${id}`)
  return new Character(def)
}
