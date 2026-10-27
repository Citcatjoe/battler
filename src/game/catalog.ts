import type { Character } from './character'
import type { CharacterEvent, Effect, Target, Trigger } from './events'
import type { RuleId } from './rules'
import { RELICS, type Relic } from './relics'
import { characterPool } from './masteries'
import { CHARACTERS } from './roster'
import { STATUS_PLACE } from './states'
import { STATUS_IDS, STATUSES, statusRuleSections, type StatusDef, type StatusId, type StatusRuleSections } from './statuses'

/*
 * Catalogue : vues de lecture sur les registres (roster, statuts), pour le compendium et la
 * documentation. Rien n'est saisi ici : tout est déduit des données du jeu, y compris qui pose un statut. Les
 * interactions entre statuts, compétences et reliques ne sont pas montrées : au joueur de les découvrir (retour du
 * 2026-10-27).
 */

/**
 * Ce qui met un statut en jeu :
 * - `skill` : une compétence le pose directement (Souffle de la tombe → Poison) ;
 * - `status` : un autre statut le pose par ses effets de tour ou ses réactions (Aura glaciale → Poison) ;
 * - `release` : une compétence le relâche, ce qui le fait remplir pendant le combat (Rétribution) ;
 * - `form` : la forme d'un personnage le porte (règles de forme du druide) ;
 * - `relic` : une relique le pose (Collier de ronces → Épines acérées).
 */
export type StatusSource =
  | { kind: 'skill'; character: Character; event: CharacterEvent; target: Target; stacks: number; turns?: number }
  | { kind: 'status'; status: StatusId }
  | { kind: 'release'; character: Character; event: CharacterEvent }
  | { kind: 'form'; character: Character; form: string }
  | { kind: 'relic'; relic: Relic; target: Target }

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

/**
 * Toutes les compétences du jeu, avec leur porteur : celles de son dé, puis celles de sa réserve (ses deux maîtrises,
 * `characterPool`), une fois chacune par porteur.
 */
const skillsOf = (characters: readonly Character[]) =>
  characters.flatMap((character) =>
    [...character.events, ...characterPool(character.definition)]
      .filter((e, k, all) => all.findIndex((x) => x.id === e.id) === k)
      .map((event) => ({ character, event })),
  )

export function statusSources(id: StatusId, characters: readonly Character[] = CHARACTERS, relics: readonly Relic[] = RELICS): StatusSource[] {
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
  // Un statut posé par un autre statut n'est en jeu que si celui-ci l'est (directement, par une compétence ou une relique)
  const posesDirectly = (effects: readonly Effect[], other: StatusId) => effects.some((e) => e.type === 'applyStatus' && e.status === other)
  const byStatus = STATUS_IDS.filter((other) => other !== id && posedByStatus(other).includes(id)).flatMap((other): StatusSource[] =>
    skills.some(({ event }) => posesDirectly(event.effects, other)) || relics.some((r) => posesDirectly(r.effects ?? [], other))
      ? [{ kind: 'status', status: other }]
      : [],
  )
  // Statut de forme (0.73.0) : posé par le moteur tant que le personnage a la forme qui le déclare
  const forms = characters.flatMap((character): StatusSource[] =>
    (character.forms ?? []).filter((f) => f.statuses?.includes(id)).map((f) => ({ kind: 'form', character, form: f.name })),
  )
  const byRelic = relics.flatMap((relic) =>
    (relic.effects ?? []).flatMap((e): StatusSource[] => (e.type === 'applyStatus' && e.status === id ? [{ kind: 'relic', relic, target: e.target ?? 'self' }] : [])),
  )
  return [...direct, ...released, ...byStatus, ...forms, ...byRelic]
}

/** Tous les statuts : bonus d'abord, puis malus ; ceux en jeu avant ceux à venir. */
export function statusCatalog(characters: readonly Character[] = CHARACTERS): StatusEntry[] {
  const entries = STATUS_IDS.map((id) => {
    const sources = statusSources(id, characters)
    const rules = statusRuleSections(id)
    // Une compétence qui le pose pour quelques tours lui donne une durée, même si sa définition n'en parle pas
    if (!rules.lifetime && sources.some((s) => s.kind === 'skill' && s.turns !== undefined)) rules.lifetime = 'duration'
    return { id, def: STATUSES[id], rules, sources, inGame: sources.length > 0 }
  })
  const rank = (e: StatusEntry) => (e.def.polarity === 'positive' ? 0 : 2) + (e.inGame ? 0 : 1)
  return entries.sort((a, b) => rank(a) - rank(b))
}

/**
 * Un statut a sa fiche dans la section Statuts s'il est du vocabulaire commun, celui de la zone d'état (`tray`).
 * Une aura ou un mécanisme appartient à sa compétence, une règle de forme à son personnage (0.98.0) : le compendium
 * les décrit là.
 */
export const hasStatusSheet = (id: StatusId) => STATUS_PLACE[id].place === 'tray'

/** Les statuts de la section Statuts : en jeu, et du vocabulaire commun. */
export const sheetStatuses = (characters: readonly Character[] = CHARACTERS) => statusCatalog(characters).filter((e) => e.inGame && hasStatusSheet(e.id))

/** Où le compendium décrit un statut : sa fiche, la compétence à qui il appartient, ou la forme qui le déclare. */
export type StatusHome =
  | { kind: 'sheet' }
  | { kind: 'skill'; event: CharacterEvent; character: Character }
  | { kind: 'form'; character: Character; form: string }

/**
 * La demeure d'un statut (`StatusHome`). Pour une aura ou un mécanisme, la compétence qui le pose ou le relâche,
 * celle de même nom d'abord. Rien pour un statut propre à une
 * compétence qui n'est pas en jeu.
 */
export function statusHome(id: StatusId, characters: readonly Character[] = CHARACTERS): StatusHome | undefined {
  if (hasStatusSheet(id)) return { kind: 'sheet' }
  const sources = statusSources(id, characters)
  const skills = sources.flatMap((s) => (s.kind === 'skill' || s.kind === 'release' ? [s] : []))
  const skill = skills.find((s) => s.event.name === STATUSES[id].name) ?? skills[0]
  if (skill) return { kind: 'skill', event: skill.event, character: skill.character }
  const form = sources.find((s) => s.kind === 'form')
  return form?.kind === 'form' ? { kind: 'form', character: form.character, form: form.form } : undefined
}

/** Une compétence et les personnages qui la possèdent. */
export interface SkillEntry {
  event: CharacterEvent
  /**
   * Ceux qui la portent sur leur dé de départ ; pour une compétence hors kit, ceux dont la réserve l'offre (ses deux
   * maîtrises, `characterPool`).
   */
  owners: Character[]
  /**
   * Déclencheurs de la ligne : une compétence identique sur plusieurs faces du même porteur (la Foudre du druide,
   * sur 1, 2 et 3) n'a qu'une ligne, qui les liste toutes.
   */
  triggers: Trigger[]
  /** Les compétences réunies sur cette ligne (une seule, sauf faces identiques) */
  events: CharacterEvent[]
  /** Hors kit : elle n'est sur aucun dé de départ, elle se grave par la forge */
  outside?: true
}

/** Deux compétences identiques à leur déclencheur près (même nom, mêmes effets, même forme). */
const sameSkill = (a: CharacterEvent, b: CharacterEvent) =>
  a.name === b.name && a.form === b.form && JSON.stringify(a.effects) === JSON.stringify(b.effects)

/**
 * Toutes les compétences du jeu, une ligne chacune, dans l'ordre du roster : d'abord celles des dés de départ (une
 * compétence partagée par plusieurs dés a tous ses porteurs ; les faces identiques d'un même porteur sont réunies),
 * puis celles qu'on ne trouve que dans les réserves des maîtrises, hors kit, avec tous ceux à qui elles s'offrent (V5).
 */
export function skillCatalog(characters: readonly Character[] = CHARACTERS): SkillEntry[] {
  const skills: SkillEntry[] = []
  for (const character of characters)
    for (const event of character.events) {
      const shared = skills.find((s) => s.event.id === event.id)
      // La même compétence sur une autre face du même porteur (la Foudre du druide) : une ligne, tous ses déclencheurs
      if (shared?.owners.includes(character)) {
        shared.triggers.push(event.trigger)
        shared.events.push(event)
        continue
      }
      if (shared) {
        shared.owners.push(character)
        continue
      }
      const twin = skills.find((s) => s.owners.includes(character) && sameSkill(s.event, event))
      if (twin) {
        twin.triggers.push(event.trigger)
        twin.events.push(event)
      } else skills.push({ event, owners: [character], triggers: [event.trigger], events: [event] })
    }
  for (const character of characters)
    for (const event of characterPool(character.definition)) {
      const listed = skills.find((s) => s.event.id === event.id)
      if (!listed) skills.push({ event, owners: [character], triggers: [], events: [event], outside: true })
      else if (listed.outside && !listed.owners.includes(character)) listed.owners.push(character)
    }
  return skills
}
