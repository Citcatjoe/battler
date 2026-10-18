import type { Character } from './character'
import type { CharacterEvent, Target } from './events'
import { CHARACTERS } from './roster'
import { STATUS_IDS, STATUSES, statusRules, type StatusDef, type StatusId } from './statuses'

/*
 * Catalogue : vues de lecture sur les registres (roster, statuts), pour le compendium et la
 * documentation. Rien n'est saisi ici : tout est déduit des données du jeu.
 */

/** Un personnage qui pose ce statut, et par quel événement. */
export interface StatusSource {
  character: Character
  event: CharacterEvent
  /** Sur qui : lui-même ou son adversaire */
  target: Target
  stacks: number
  turns?: number
}

export interface StatusEntry {
  id: StatusId
  def: StatusDef
  rules: string[]
  sources: StatusSource[]
  /** Faux tant qu'aucun personnage ne le pose : statut « à venir » */
  inGame: boolean
}

export function statusSources(id: StatusId, characters: readonly Character[] = CHARACTERS): StatusSource[] {
  return characters.flatMap((character) =>
    character.events.flatMap((event) =>
      event.effects.flatMap((e) =>
        e.type === 'applyStatus' && e.status === id
          ? [{ character, event, target: e.target ?? 'self', stacks: e.stacks, turns: e.turns }]
          : [],
      ),
    ),
  )
}

/** Tous les statuts : bonus d'abord, puis malus ; ceux en jeu avant ceux à venir. */
export function statusCatalog(characters: readonly Character[] = CHARACTERS): StatusEntry[] {
  const entries = STATUS_IDS.map((id) => {
    const sources = statusSources(id, characters)
    return { id, def: STATUSES[id], rules: statusRules(id), sources, inGame: sources.length > 0 }
  })
  const rank = (e: StatusEntry) => (e.def.polarity === 'positive' ? 0 : 2) + (e.inGame ? 0 : 1)
  return entries.sort((a, b) => rank(a) - rank(b))
}

/** Une compétence et les personnages qui la possèdent (l'original et les variantes qui en héritent). */
export interface SkillEntry {
  event: CharacterEvent
  owners: Character[]
}

/** Les compétences d'une race, dans l'ordre du roster. */
export interface SkillFamily {
  race: string
  skills: SkillEntry[]
}

/**
 * Toutes les compétences, regroupées par race. Une compétence partagée par l'original et ses
 * variantes n'apparaît qu'une fois, avec tous ses possesseurs.
 */
export function skillCatalog(characters: readonly Character[] = CHARACTERS): SkillFamily[] {
  const families: SkillFamily[] = []
  for (const character of characters) {
    let family = families.find((f) => f.race === character.race)
    if (!family) families.push((family = { race: character.race, skills: [] }))
    for (const event of character.events) {
      const entry = family.skills.find((s) => s.event.id === event.id)
      if (entry) entry.owners.push(character)
      else family.skills.push({ event, owners: [character] })
    }
  }
  return families
}
