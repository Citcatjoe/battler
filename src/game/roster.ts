import orcImg from '../assets/orc.png'
import elfImg from '../assets/elf.png'
import dwarfImg from '../assets/dwarf.png'
import undeadImg from '../assets/undead.png'
import { Character, variant, type CharacterDef } from './character'

/*
 * Archétypes par race :
 * - Orc : brute, beaucoup de PV et un gros dé, mais lent à esquiver.
 * - Elfe : agile, peu de PV, esquive et critiques fréquents.
 * - Nain : tank, armure qui réduit chaque coup, critiques rares mais lourds.
 * - Mort-vivant : affliction, endurant et peu esquiveur, il empoisonne l'adversaire.
 * Chaque variante de coloris décale légèrement ces stats et hérite de l'événement de sa race :
 * - Orc, Rage du sang : sur un 1 au dé, regagne 5 PV.
 * - Elfe, Œil de faucon : sur un 1 au dé, son prochain coup qui touche est critique.
 * - Nain, Peau de pierre : sur un 1 au dé, +4 d'armure temporaire, cumulable, qui s'use en encaissant.
 * - Mort-vivant, Souffle de la tombe : sur un 1 au dé, empoisonne l'adversaire (2 PV par tour pendant 3 tours).
 */

const gorak: CharacterDef = {
  id: 'gorak',
  name: 'Gorak',
  race: 'Orc',
  archetype: 'Brute',
  stats: { maxHp: 61, damageDie: 10, armor: 0, dodgeChance: 0.05, critChance: 0.1, critMultiplier: 2 },
  look: { image: orcImg, facing: 'right', scale: 1, portrait: { x: 55, y: 5, zoom: 3 } },
  lore: {
    tagline: 'Le roc des fosses de Kar-Dush.',
    background:
      "Sept saisons invaincu dans les fosses de combat de Kar-Dush. Gorak frappe sans finesse mais encaisse tout, et l'on dit qu'un coup manqué ne fait que l'énerver davantage.",
    strengths: ['Le plus de PV du roster', 'Gros dé (d10)', 'Un jet raté le soigne'],
    weaknesses: ["N'esquive presque jamais", 'Critiques rares', 'Aucune armure'],
  },
  events: [{ id: 'blood-rage', name: 'Rage du sang', trigger: 'naturalOne', effects: [{ type: 'heal', amount: 5 }] }],
}

const murzug = variant(gorak, {
  id: 'murzug',
  name: 'Murzug',
  archetype: 'Berserker',
  lore: {
    tagline: 'Il compte les cicatrices, pas les coups reçus.',
    background:
      "Banni de son clan pour avoir défié le chef en plein festin, Murzug s'est couvert de peintures de guerre et ne vit plus que pour la prochaine mêlée. Moins solide que Gorak, bien plus imprévisible.",
    strengths: ['Gros dé (d10)', 'Critiques fréquents pour un orc (18 %)', 'Un jet raté le soigne'],
    weaknesses: ['Moins de PV que Gorak', "N'esquive presque jamais", 'Aucune armure'],
  },
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
  lore: {
    tagline: 'Un souffle, une flèche.',
    background:
      "Éclaireuse des marches de Lithmeren, Elaria a appris à ne jamais être là où l'ennemi frappe. Chaque tir manqué lui sert à mieux ajuster le suivant.",
    strengths: ['Meilleure esquive (33 %)', 'Critiques fréquents (22 %)', 'Un jet raté prépare un critique'],
    weaknesses: ['Le moins de PV du roster', 'Petit dé (d8)', "Peine face à l'armure"],
  },
  events: [
    {
      id: 'hawk-eye',
      name: 'Œil de faucon',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }],
    },
  ],
}

const sylwen = variant(elaria, {
  id: 'sylwen',
  name: 'Sylwen',
  archetype: 'Sentinelle sylvestre',
  lore: {
    tagline: 'La forêt ne pardonne pas deux fois.',
    background:
      "Gardienne des bois sacrés de Lithmeren, Sylwen attend l'ouverture parfaite plutôt que de harceler. Elle critique moins souvent qu'Elaria, mais chacun de ses critiques fait très mal.",
    strengths: ['Critiques dévastateurs (×2,4)', 'Esquive encore élevée (26 %)', 'Un jet raté prépare un critique'],
    weaknesses: ['Petit dé (d8)', 'PV modestes', "Moins insaisissable qu'Elaria"],
  },
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
  lore: {
    tagline: 'Ce qui passe la porte passe par moi.',
    background:
      "Gardien héréditaire de la grande porte de Durnhold, Brokk n'a jamais reculé d'un pas. Son armure use l'adversaire coup après coup, et chaque faux pas le rend plus dur encore.",
    strengths: ['Armure : −2 sur chaque coup', 'Peau de pierre cumulable', 'Critiques lourds (×2,5)'],
    weaknesses: ['Petit dé (d8)', 'Critiques rares (8 %)', 'Esquive faible'],
  },
  events: [
    {
      id: 'stoneskin',
      name: 'Peau de pierre',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 4 }],
    },
  ],
}

const grimbald = variant(brokk, {
  id: 'grimbald',
  name: 'Grimbald',
  archetype: 'Briseur de fer',
  lore: {
    tagline: 'Pourquoi parer quand on peut briser ?',
    background:
      "Ancien forgeron de Durnhold, Grimbald a troqué l'enclume pour une hache de siège. Il a allégé son armure pour frapper plus fort, au grand dam des anciens du clan.",
    strengths: ['Gros dé (d10)', 'Critiques lourds (×2,5)', 'Peau de pierre cumulable'],
    weaknesses: ['Armure réduite (−1 par coup)', 'Moins de PV que Brokk', 'Critiques rares (8 %)'],
  },
  tint: 'saturate(0.15) brightness(1.15)',
  stats: { damageDie: +2, armor: -1, maxHp: -2 },
})

const ervald: CharacterDef = {
  id: 'ervald',
  name: 'Ervald',
  race: 'Mort-vivant',
  archetype: 'Chevalier liche',
  stats: { maxHp: 56, damageDie: 8, armor: 1, dodgeChance: 0.08, critChance: 0.12, critMultiplier: 2 },
  look: { image: undeadImg, facing: 'right', scale: 1.02, portrait: { x: 60, y: 8, zoom: 3.2 } },
  lore: {
    tagline: 'La mort l’a rendu, pas pardonné.',
    background:
      "Ancien capitaine de la garde d'Ostremort, Ervald est tombé en défendant la cité, puis s'est relevé sous son étendard pourpre. Il ne fatigue jamais, et son souffle glacé ronge lentement ceux qui l'affrontent.",
    strengths: ['Empoisonne sur un jet raté', 'Armure légère (−1 par coup)', 'Endurant (56 PV)'],
    weaknesses: ["N'esquive presque jamais", 'Petit dé (d8)', 'Dégâts lents à venir'],
  },
  events: [
    {
      id: 'grave-breath',
      name: 'Souffle de la tombe',
      trigger: 'naturalOne',
      effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, turns: 3, target: 'opponent' }],
    },
  ],
}

const caldrec = variant(ervald, {
  id: 'caldrec',
  name: 'Caldrec',
  archetype: 'Faucheur d’âmes',
  lore: {
    tagline: 'Il ne garde rien, pas même son bouclier.',
    background:
      "Lieutenant d'Ervald, Caldrec a abandonné l'armure pour la vitesse d'une lame spectrale. Il frappe plus fort et plus souvent en critique, mais le moindre coup l'entame.",
    strengths: ['Gros dé (d10)', 'Critiques plus fréquents (16 %)', 'Empoisonne sur un jet raté'],
    weaknesses: ['Aucune armure', 'Moins de PV qu’Ervald', "N'esquive presque jamais"],
  },
  tint: 'hue-rotate(-110deg) saturate(1.1) brightness(0.95)',
  stats: { damageDie: +2, armor: -1, maxHp: -2, critChance: +0.04 },
})

/** Personnages disponibles, dans l'ordre d'affichage. Pour en ajouter un : une entrée ici. */
export const ROSTER: readonly CharacterDef[] = [gorak, murzug, elaria, sylwen, brokk, grimbald, ervald, caldrec]

/** Les personnages instanciés une fois pour toutes (ils sont immuables). */
export const CHARACTERS: readonly Character[] = ROSTER.map((def) => new Character(def))

export const CHARACTER_IDS: readonly string[] = CHARACTERS.map((c) => c.id)

/** Familles : chaque original suivi de ses variantes, dans l'ordre du roster (une colonne par famille). */
export const FAMILIES: readonly (readonly Character[])[] = CHARACTERS.filter((c) => !c.baseId).map((base) => [
  base,
  ...CHARACTERS.filter((c) => c.baseId === base.id),
])

export function createCharacter(id: string): Character {
  const character = CHARACTERS.find((c) => c.id === id)
  if (!character) throw new Error(`Personnage inconnu : ${id}`)
  return character
}

/**
 * Vérifie la cohérence des données du roster ; renvoie la liste des problèmes (vide si tout va bien).
 * Appelée par les tests, et au démarrage en développement.
 */
export function validateRoster(defs: readonly CharacterDef[] = ROSTER): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  const inRange = (v: number, min: number, max = Infinity) => Number.isFinite(v) && v >= min && v <= max
  for (const d of defs) {
    const at = `${d.id} :`
    if (ids.has(d.id)) problems.push(`${at} id en double`)
    ids.add(d.id)
    const s = d.stats
    if (!Number.isInteger(s.maxHp) || s.maxHp < 1) problems.push(`${at} maxHp doit être un entier ≥ 1`)
    if (!Number.isInteger(s.damageDie) || s.damageDie < 1) problems.push(`${at} damageDie doit être un entier ≥ 1`)
    if (!inRange(s.armor, 0)) problems.push(`${at} armor doit être ≥ 0`)
    if (!inRange(s.dodgeChance, 0, 1)) problems.push(`${at} dodgeChance hors de [0, 1]`)
    if (!inRange(s.critChance, 0, 1)) problems.push(`${at} critChance hors de [0, 1]`)
    if (!inRange(s.critMultiplier, 1)) problems.push(`${at} critMultiplier doit être ≥ 1`)
    if (d.baseId && !defs.some((o) => o.id === d.baseId)) problems.push(`${at} baseId inconnu (${d.baseId})`)
    const { lore } = d
    if (!lore.tagline || !lore.background) problems.push(`${at} fiche incomplète (accroche ou background)`)
    if (lore.background.length > 240) problems.push(`${at} background trop long pour la fiche (240 caractères max.)`)
    if (
      lore.strengths.length < 1 ||
      lore.strengths.length > 3 ||
      lore.weaknesses.length < 1 ||
      lore.weaknesses.length > 3
    )
      problems.push(`${at} 1 à 3 forces et 1 à 3 faiblesses attendues`)
    const eventIds = new Set<string>()
    for (const e of d.events) {
      if (eventIds.has(e.id)) problems.push(`${at} événement en double (${e.id})`)
      eventIds.add(e.id)
      if (e.effects.length === 0) problems.push(`${at} l'événement ${e.id} n'a aucun effet`)
      if (e.chance !== undefined && !inRange(e.chance, 0, 1)) problems.push(`${at} ${e.id}.chance hors de [0, 1]`)
      if (e.limit !== undefined && (!Number.isInteger(e.limit) || e.limit < 1))
        problems.push(`${at} ${e.id}.limit doit être un entier ≥ 1`)
      for (const c of e.when ?? []) {
        if ((c.type === 'hpBelow' || c.type === 'hpAtLeast') && !(c.ratio > 0 && c.ratio <= 1))
          problems.push(`${at} ${e.id} : condition ${c.type}, ratio hors de ]0, 1]`)
        if (c.type === 'fromTurn' && (!Number.isInteger(c.turn) || c.turn < 1))
          problems.push(`${at} ${e.id} : condition fromTurn, tour entier ≥ 1 attendu`)
        if (c.type === 'hasStatus' && c.stacks !== undefined && (!Number.isInteger(c.stacks) || c.stacks < 1))
          problems.push(`${at} ${e.id} : condition hasStatus, charges entières ≥ 1 attendues`)
      }
      for (const f of e.effects) {
        const amount = f.type === 'applyStatus' ? f.stacks : f.type === 'cleanse' ? 1 : f.amount
        if (!Number.isInteger(amount) || amount < 1)
          problems.push(`${at} ${e.id} : effet ${f.type} sans valeur entière ≥ 1`)
        if (f.type === 'applyStatus' && f.turns !== undefined && (!Number.isInteger(f.turns) || f.turns < 1))
          problems.push(`${at} ${e.id} : durée invalide`)
      }
    }
  }
  return problems
}
