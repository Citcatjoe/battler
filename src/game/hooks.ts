import type { Character, CharacterStats } from './character'
import { damageKind, type DamageKind } from './damage'
import { doubleFace, rollFace, type CharacterEvent, type Effect, type Target, type Trigger } from './events'
import type { Relic } from './relics'
import type { StatusId } from './statuses'

/*
 * Accroches (règles v2, phase 1, docs/PROGRESSION.md § 8 et P1) : ce que chaque brique PRODUIT et CONSOMME, dans un
 * vocabulaire fermé de choses concrètes du combat. Une synergie naît quand une brique produit ce qu'une autre consomme
 * (le Dé creux produit une esquive, la Conque des vents la consomme) ; un conflit, quand une brique GÊNE ce qu'une autre
 * consomme (la Cotte retire de l'esquive, la Conque en vit). Aucune règle de combat ne lit ces accroches : elles servent
 * à la validation (aucune brique isolée), au rapport des synergies, et plus tard à l'offre orientée.
 *
 * Point de vue : toujours celui de la brique qui pose ou porte l'effet. « moment:hit » produit, c'est « je touche plus
 * souvent » ; un statut posé sur l'adversaire (Saignement) s'écrit du point de vue de celui qui le pose (il saigne
 * quand JE touche : il consomme « moment:hit »). D'où une règle vérifiée par `validateHooks` : un statut est toujours
 * posé du même côté (sur soi, ou sur l'adversaire).
 *
 * Les compétences et les reliques ne déclarent rien : leurs accroches se déduisent de leurs données (déclencheur,
 * conditions, effets, stats). Seuls les statuts déclarent les leurs (`STATUS_HOOKS`), parce que leur comportement
 * est écrit en code (crochets du moteur). Les opérations de forge viendront avec la forge du d6 (phase 5).
 */

/** Les moments d'un combat, du point de vue de la brique : il touche, il encaisse, il critique, il esquive, il est esquivé, il se soigne. */
export type Moment = 'hit' | 'hurt' | 'crit' | 'dodge' | 'missed' | 'heal'

export type Hook =
  /** Un statut et ses charges (Poison sur l'adversaire, Esquive améliorée sur soi) */
  | `status:${StatusId}`
  | `moment:${Moment}`
  /** Des dégâts infligés de ce type (DP, DM, DT) */
  | `damage:${DamageKind}`
  /** Une face du dé qui tombe (« face:4 »), la face maximale, un double (deux dés) */
  | `face:${number}`
  | 'face:max'
  | 'double'
  /** Une stat de base */
  | `stat:${keyof CharacterStats}`

export interface Hooks {
  produces: Hook[]
  consumes: Hook[]
  /** Ce qu'elle retire ou raréfie : une brique qui le consomme entre en conflit avec elle */
  hinders: Hook[]
}

type StatusHooks = { produces?: readonly Hook[]; consumes?: readonly Hook[]; side: Target }

/**
 * Ce que fait chaque statut, au-delà de lui-même (« status:X » est toujours produit par qui le pose), et de quel côté on
 * le pose. Un statut nouveau doit y être déclaré (le registre est complet : le typage le refuse sinon).
 */
export const STATUS_HOOKS: Record<StatusId, StatusHooks> = {
  guaranteedCrit: { side: 'self', produces: ['moment:crit'] },
  bonusArmor: { side: 'self' },
  poison: { side: 'opponent', produces: ['damage:temporal'] },
  bleed: { side: 'opponent', consumes: ['moment:hit'], produces: ['damage:temporal'] },
  regeneration: { side: 'self', produces: ['moment:heal'] },
  weakened: { side: 'opponent' },
  exposed: { side: 'opponent' },
  burn: { side: 'opponent', produces: ['damage:temporal'] },
  vulnerable: { side: 'opponent', produces: ['damage:physical'] },
  stunned: { side: 'opponent' },
  thorns: { side: 'self', consumes: ['moment:hurt'], produces: ['status:bleed', 'damage:temporal'] },
  ward: { side: 'self' },
  lifesteal: { side: 'self', consumes: ['moment:hit'], produces: ['moment:heal'] },
  windFury: { side: 'self', produces: ['moment:hit', 'damage:physical'] },
  evasion: { side: 'self', produces: ['moment:dodge'] },
  frostAura: { side: 'self', produces: ['status:poison', 'damage:temporal'] },
  powerAura: { side: 'self', produces: ['damage:physical'] },
  intimidationAura: { side: 'self' },
  precisionAura: { side: 'self', consumes: ['moment:crit'], produces: ['stat:critMultiplier'] },
  fear: { side: 'opponent' },
  holyAura: { side: 'self', produces: ['moment:heal'] },
  decoctionAura: { side: 'self', consumes: ['moment:hit'], produces: ['status:poison', 'damage:temporal'] },
  coinFlip: { side: 'self', produces: ['moment:hit', 'damage:physical'] },
  // Le dé de plus (Coup de chance) : ses faces réveillent compétences et reliques de face
  luckyStrike: { side: 'self', produces: ['face:1', 'face:2', 'face:3', 'moment:hit'] },
  immunityAura: { side: 'self' },
  riposte: { side: 'self', consumes: ['moment:hurt'], produces: ['damage:physical'] },
  retribution: { side: 'self', consumes: ['moment:hurt'] },
  // Luciole : l'adversaire ne peut plus esquiver, et prend 2 de plus
  firefly: { side: 'opponent', produces: ['moment:hit', 'damage:physical'] },
  rotAura: { side: 'self', consumes: ['moment:hit'], produces: ['status:rot', 'damage:temporal'] },
  rot: { side: 'opponent', produces: ['damage:temporal'] },
  whistling: { side: 'self', produces: ['moment:heal'] },
  falseNote: { side: 'opponent' },
  melodiousAura: { side: 'self', produces: ['damage:physical'] },
  casting: { side: 'self' },
  bearMight: { side: 'self', produces: ['damage:physical'] },
  wildAura: { side: 'self', produces: ['damage:physical'] },
}

/** Le moment d'un déclencheur, ou sa face ; rien pour un déclencheur de temps (début de combat, de tour…). */
function triggerHook(t: Trigger): Hook | undefined {
  if (t === 'naturalMax') return 'face:max'
  const face = rollFace(t)
  if (face !== undefined) return `face:${face}`
  if (doubleFace(t) !== undefined) return 'double'
  return t === 'hit' || t === 'hurt' || t === 'crit' || t === 'dodge' || t === 'missed' ? `moment:${t}` : undefined
}

function addEffect(into: Hooks, e: Effect) {
  switch (e.type) {
    case 'applyStatus': {
      const s = STATUS_HOOKS[e.status]
      into.produces.push(`status:${e.status}`, ...(s.produces ?? []))
      into.consumes.push(...(s.consumes ?? []))
      break
    }
    case 'damage':
    case 'release':
      into.produces.push(`damage:${damageKind(e.source)}`)
      break
    case 'heal':
      into.produces.push('moment:heal')
      break
    case 'cleanse':
      if (e.orElse) addEffect(into, e.orElse)
      break
  }
}

const unique = (h: Hooks): Hooks => ({ produces: [...new Set(h.produces)], consumes: [...new Set(h.consumes)], hinders: [...new Set(h.hinders)] })

/** Les accroches d'une compétence, déduites de son déclencheur, de ses conditions et de ses effets. */
export function eventHooks(e: CharacterEvent): Hooks {
  const h: Hooks = { produces: [], consumes: [], hinders: [] }
  const on = triggerHook(e.trigger)
  if (on) h.consumes.push(on)
  for (const c of e.when ?? []) if (c.type === 'hasStatus') h.consumes.push(`status:${c.status}`)
  // Crescendo, Soliste : un coup de base multiplié, à la place des deux coups du double
  if (e.hitMultiplier) h.produces.push('moment:hit', 'damage:physical')
  for (const effect of e.effects) addEffect(h, effect)
  return unique(h)
}

/** Une stat de relique : ce qu'elle produit si elle monte, ce qu'elle gêne si elle baisse. */
const STAT_HOOK: Record<keyof CharacterStats, Hook> = {
  maxHp: 'stat:maxHp',
  attackMin: 'stat:attackMin',
  attackMax: 'stat:attackMax',
  armor: 'stat:armor',
  dodgeChance: 'moment:dodge',
  critChance: 'moment:crit',
  critMultiplier: 'stat:critMultiplier',
}

/** Les accroches d'une relique, déduites de son type : stats, bonus de coup, ou déclencheur et effets. */
export function relicHooks(r: Relic): Hooks {
  const h: Hooks = { produces: [], consumes: [], hinders: [] }
  for (const [k, v] of Object.entries(r.stats ?? {}) as [keyof CharacterStats, number][]) (v > 0 ? h.produces : h.hinders).push(STAT_HOOK[k])
  if (r.rollBonus) {
    h.produces.push('damage:physical')
    if (r.onFace !== undefined) h.consumes.push(`face:${r.onFace}`)
  }
  if (r.trigger?.type === 'strike') {
    const on = triggerHook(r.trigger.on)
    if (on) h.consumes.push(on)
  }
  for (const c of r.when ?? []) if (c.type === 'hasStatus') h.consumes.push(`status:${c.status}`)
  for (const effect of r.effects ?? []) addEffect(h, effect)
  return unique(h)
}

/** Le lien entre deux briques : ce que l'une produit et que l'autre consomme, dans les deux sens, et les conflits. */
export function linkBetween(a: Hooks, b: Hooks): { feeds: Hook[]; conflicts: Hook[] } {
  const meet = (given: readonly Hook[], wanted: readonly Hook[]) => wanted.filter((w) => given.includes(w))
  return {
    feeds: [...new Set([...meet(a.produces, b.consumes), ...meet(b.produces, a.consumes)])],
    conflicts: [...new Set([...meet(a.hinders, b.consumes), ...meet(b.hinders, a.consumes)])],
  }
}

/** Les briques d'un combattant construit : ses compétences (forge comprise) et ses reliques. */
export function buildBricks(c: Pick<Character, 'events' | 'relics'>): Hooks[] {
  return [...c.events.map(eventHooks), ...c.relics.map(relicHooks)]
}

/** Ses accroches réunies : ce que l'ensemble de son build produit, consomme et gêne. */
export function buildHooks(c: Pick<Character, 'events' | 'relics'>): Hooks {
  const all = buildBricks(c)
  return unique({ produces: all.flatMap((h) => h.produces), consumes: all.flatMap((h) => h.consumes), hinders: all.flatMap((h) => h.hinders) })
}

/**
 * L'écho d'une brique dans un build (l'offre orientée, docs/PROGRESSION.md § 13.2) : combien d'accroches la relient à ce
 * qu'il porte déjà, dans un sens ou dans l'autre. 0 : elle n'y touche rien.
 */
export const echoOf = (brick: Hooks, build: Hooks) => linkBetween(brick, build).feeds.length

/** La cohérence d'un build : ses paires de briques qui se nourrissent, sur toutes ses paires. */
export function buildLinks(c: Pick<Character, 'events' | 'relics'>): { linked: number; pairs: number } {
  const bricks = buildBricks(c)
  let linked = 0
  for (let i = 0; i < bricks.length; i++) for (let j = i + 1; j < bricks.length; j++) if (linkBetween(bricks[i], bricks[j]).feeds.length) linked++
  return { linked, pairs: (bricks.length * (bricks.length - 1)) / 2 }
}

/** Tous les statuts posés par un effet, avec le côté où il les pose (y compris ce que posent les statuts eux-mêmes). */
function posed(effects: readonly Effect[]): { status: StatusId; side: Target }[] {
  return effects.flatMap((e) =>
    e.type === 'applyStatus' ? [{ status: e.status, side: e.target ?? 'self' }] : e.type === 'cleanse' && e.orElse ? posed([e.orElse]) : [],
  )
}

/**
 * Erreurs d'accroches (vide si tout va bien) : une compétence ou une relique qui ne produit rien vit seule ; un statut
 * posé des deux côtés rendrait ses accroches fausses (elles s'écrivent du point de vue de qui le pose).
 */
export function validateHooks(events: readonly CharacterEvent[], relics: readonly Relic[]): string[] {
  const errors: string[] = []
  for (const e of events) if (eventHooks(e).produces.length === 0) errors.push(`${e.id} : la compétence ne produit aucune accroche`)
  for (const r of relics) if (relicHooks(r).produces.length === 0) errors.push(`${r.id} : la relique ne produit aucune accroche`)
  const all = [...events.flatMap((e) => posed(e.effects)), ...relics.flatMap((r) => posed(r.effects ?? []))]
  for (const { status, side } of all)
    if (side !== STATUS_HOOKS[status].side) errors.push(`${status} : posé sur ${side === 'self' ? 'soi' : 'l’adversaire'}, déclaré ${STATUS_HOOKS[status].side === 'self' ? 'sur soi' : 'sur l’adversaire'}`)
  return [...new Set(errors)]
}

export interface KitSeed {
  skill: CharacterEvent
  /** Les autres briques qui consomment ce qu'elle produit (compétences d'autres personnages, reliques) */
  consumers: string[]
}

/**
 * Le kit ouvert (docs/PROGRESSION.md § 6.2) : pour chaque compétence d'un kit, les briques hors du kit qui consomment ce
 * qu'elle produit. Une compétence est une graine si deux briques au moins la prolongent. Un relevé, pas une règle :
 * il deviendra un contrôle quand les répertoires existeront (phase 2 et 5).
 */
export function kitSeeds(kit: readonly CharacterEvent[], pool: readonly CharacterEvent[], relics: readonly Relic[]): KitSeed[] {
  const own = new Set(kit.map((e) => e.id))
  const others = [
    ...pool.filter((e) => !own.has(e.id)).map((e) => ({ name: e.name, hooks: eventHooks(e) })),
    ...relics.map((r) => ({ name: r.name, hooks: relicHooks(r) })),
  ]
  return kit.map((skill) => {
    const made = eventHooks(skill).produces
    return { skill, consumers: others.filter((o) => o.hooks.consumes.some((w) => made.includes(w))).map((o) => o.name) }
  })
}
