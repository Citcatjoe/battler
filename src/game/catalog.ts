import type { Character } from './character'
import { deName, type CharacterEvent, type Effect, type Target, type Trigger } from './events'
import { CHARACTERS } from './roster'
import { POLARITY_STYLE, STATUS_IDS, STATUSES, statusRuleSections, type Polarity, type StatusDef, type StatusId, type StatusRuleSections } from './statuses'

/*
 * Catalogue : vues de lecture sur les registres (roster, statuts), pour le compendium et la
 * documentation. Rien n'est saisi ici : tout est déduit des données du jeu, y compris les liens
 * croisés (qui pose un statut, ce qui l'empêche, ce qu'il renforce).
 */

/**
 * Ce qui met un statut en jeu :
 * - `skill` : une compétence le pose directement (Souffle de la tombe → Poison) ;
 * - `status` : un autre statut le pose par ses effets de tour ou ses réactions (Aura glaciale → Poison) ;
 * - `release` : une compétence le relâche, ce qui le fait remplir pendant le combat (Rétribution).
 */
export type StatusSource =
  | { kind: 'skill'; character: Character; event: CharacterEvent; target: Target; stacks: number; turns?: number }
  | { kind: 'status'; status: StatusId }
  | { kind: 'release'; character: Character; event: CharacterEvent }
  | { kind: 'form'; character: Character; form: string }

/** Une interaction d'un statut, avec ce vers quoi elle mène (un autre statut ou une compétence). */
export interface StatusLink {
  text: string
  status?: StatusId
  skill?: { event: CharacterEvent; character: Character }
}

export interface StatusEntry {
  id: StatusId
  def: StatusDef
  rules: StatusRuleSections
  sources: StatusSource[]
  /** Faux tant que rien ne le met en jeu : statut « à venir » */
  inGame: boolean
}

/** Les effets que les crochets d'un statut produisent (effets de tour, réactions), sondés sur une charge. */
function hookEffects(id: StatusId): Effect[] {
  const def = STATUSES[id]
  const probe = { id, stacks: 1 }
  return [
    ...(def.onTurnStart?.(probe) ?? []),
    ...(def.onTurnEnd?.(probe) ?? []),
    ...Object.values(def.reactions ?? {}).flatMap((react) => react?.(probe) ?? []),
  ]
}

/** Les statuts qu'un statut pose lui-même (Aura de décoction → Poison). */
const posedByStatus = (id: StatusId) =>
  [...new Set(hookEffects(id).flatMap((e) => (e.type === 'applyStatus' ? [e.status] : [])))]

/** Toutes les compétences du roster, avec leur porteur. */
const skillsOf = (characters: readonly Character[]) => characters.flatMap((character) => character.events.map((event) => ({ character, event })))

export function statusSources(id: StatusId, characters: readonly Character[] = CHARACTERS): StatusSource[] {
  const skills = skillsOf(characters)
  const direct = skills.flatMap(({ character, event }) =>
    event.effects.flatMap((e): StatusSource[] =>
      e.type === 'applyStatus' && e.status === id
        ? [{ kind: 'skill', character, event, target: e.target ?? 'self', stacks: e.stacks, turns: e.turns }]
        : [],
    ),
  )
  const released = skills.flatMap(({ character, event }): StatusSource[] =>
    event.effects.some((e) => e.type === 'release' && e.status === id) ? [{ kind: 'release', character, event }] : [],
  )
  // Un statut posé par un autre statut n'est en jeu que si celui-ci l'est (directement)
  const byStatus = STATUS_IDS.filter((other) => other !== id && posedByStatus(other).includes(id)).flatMap((other): StatusSource[] =>
    skills.some(({ event }) => event.effects.some((e) => e.type === 'applyStatus' && e.status === other)) ? [{ kind: 'status', status: other }] : [],
  )
  // Statut de forme (0.73.0) : posé par le moteur tant que le personnage a la forme qui le déclare
  const forms = characters.flatMap((character): StatusSource[] =>
    (character.forms ?? []).filter((f) => f.statuses?.includes(id)).map((f) => ({ kind: 'form', character, form: f.name })),
  )
  return [...direct, ...released, ...byStatus, ...forms]
}

/** Tous les statuts : bonus d'abord, puis malus ; ceux en jeu avant ceux à venir. */
export function statusCatalog(characters: readonly Character[] = CHARACTERS): StatusEntry[] {
  const entries = STATUS_IDS.map((id) => {
    const sources = statusSources(id, characters)
    return { id, def: STATUSES[id], rules: statusRuleSections(id), sources, inGame: sources.length > 0 }
  })
  const rank = (e: StatusEntry) => (e.def.polarity === 'positive' ? 0 : 2) + (e.inGame ? 0 : 1)
  return entries.sort((a, b) => rank(a) - rank(b))
}

const polarityWord = (p: Polarity) => POLARITY_STYLE[p].label.toLowerCase()

/**
 * Interactions d'un statut avec les autres, déduites du code, dans les deux sens : opposition, immunité et
 * garde, statut qu'il pose, purge par une compétence. Seuls les statuts et
 * compétences en jeu sont cités. Les cas d'ordre de résolution (Vol de vie, puis Riposte, puis Épines…) ne se
 * déduisent pas : ils restent dans docs/RESOLUTION.md (voir docs/AUDIT_COMPENDIUM.md).
 */
export function statusLinks(id: StatusId, characters: readonly Character[] = CHARACTERS): StatusLink[] {
  const def = STATUSES[id]
  const inGame = new Set(statusCatalog(characters).filter((e) => e.inGame).map((e) => e.id))
  const skills = skillsOf(characters)
  const links: StatusLink[] = []
  // Opposition : déclarée d'un côté, vraie des deux
  for (const other of STATUS_IDS)
    if ((def.opposes === other || STATUSES[other].opposes === id) && inGame.has(other))
      links.push({ text: `S'oppose à ${STATUSES[other].name} : leurs charges s'annulent une à une.`, status: other })
  // Immunité et garde : ce que ce statut bloque, ou ce qui le bloque
  if (def.immune) links.push({ text: `Bloque la pose de tous les ${polarityWord(def.immune)}.` })
  if (def.wards?.polarity) links.push({ text: `Bloque la pose des ${polarityWord(def.wards.polarity)}, une charge par blocage.` })
  for (const other of STATUS_IDS) {
    if (def.innate) break
    if (other === id || !inGame.has(other)) continue
    const o = STATUSES[other]
    if (o.immune === def.polarity || o.wards?.polarity === def.polarity || o.wards?.statuses?.includes(id))
      links.push({ text: `Ne peut pas être posé sur un porteur ${deName(o.name)}.`, status: other })
  }
  // Statuts qu'il pose
  for (const posed of posedByStatus(id)) links.push({ text: `Pose ${STATUSES[posed].name}.`, status: posed })
  // Purges : les compétences qui retirent les statuts de sa polarité (sauf un statut de forme, qui ne se purge pas)
  for (const { character, event } of skills)
    if (!def.innate && event.effects.some((e) => e.type === 'cleanse' && e.polarity === def.polarity))
      links.push({ text: `Peut être retiré par ${event.name}.`, skill: { event, character } })
  return links
}

/** Une compétence et les personnages qui la possèdent. */
export interface SkillEntry {
  event: CharacterEvent
  owners: Character[]
  /**
   * Déclencheurs de la ligne : une compétence identique sur plusieurs faces du même porteur (l'Attente de
   * l'ogre, sur 1, 2 et 3) n'a qu'une ligne, qui les liste toutes.
   */
  triggers: Trigger[]
  /** Les compétences réunies sur cette ligne (une seule, sauf faces identiques) */
  events: CharacterEvent[]
}

/** Les compétences d'une race, dans l'ordre du roster. */
export interface SkillFamily {
  race: string
  skills: SkillEntry[]
}

/** Deux compétences identiques à leur déclencheur près (même nom, mêmes effets, même forme). */
const sameSkill = (a: CharacterEvent, b: CharacterEvent) =>
  a.name === b.name && a.form === b.form && JSON.stringify(a.effects) === JSON.stringify(b.effects)

/**
 * Toutes les compétences, regroupées par race. Une compétence partagée par plusieurs personnages
 * n'apparaît qu'une fois, avec tous ses possesseurs ; les faces identiques d'un même porteur sont réunies.
 */
export function skillCatalog(characters: readonly Character[] = CHARACTERS): SkillFamily[] {
  const families: SkillFamily[] = []
  for (const character of characters) {
    let family = families.find((f) => f.race === character.race)
    if (!family) families.push((family = { race: character.race, skills: [] }))
    for (const event of character.events) {
      const shared = family.skills.find((s) => s.event.id === event.id)
      if (shared) {
        if (!shared.owners.includes(character)) shared.owners.push(character)
        continue
      }
      const twin = family.skills.find((s) => s.owners.includes(character) && sameSkill(s.event, event))
      if (twin) {
        twin.triggers.push(event.trigger)
        twin.events.push(event)
      } else family.skills.push({ event, owners: [character], triggers: [event.trigger], events: [event] })
    }
  }
  return families
}
