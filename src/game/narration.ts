import type { Character } from './character'
import { multiplier, type AppliedEffect, type Attack, type Pair, type Side, type TriggeredEvent } from './combat'
import { lowerFirst, STATUSES, type StatusId } from './statuses'

/*
 * Textes du journal et badges à l'écran, générés à partir de la chronologie et du registre
 * des statuts : un nouveau statut ou effet n'a pas besoin de texte écrit à la main ailleurs.
 */

export type LogKind = 'info' | 'initiative' | 'attack' | 'crit' | 'dodge' | 'event' | 'status' | 'ko'

export interface LogEntry {
  id: number
  kind: LogKind
  text: string
  side?: Side
}

export type Tone = 'heal' | 'damage' | 'positive' | 'negative' | 'neutral'

export const TONE_CLASS: Record<Tone, string> = {
  heal: 'text-emerald-300 [-webkit-text-stroke:1.5px_#064e3b]',
  damage: 'text-red-400 [-webkit-text-stroke:1.5px_#450a0a]',
  positive: 'text-amber-200 [-webkit-text-stroke:1px_#78350f]',
  negative: 'text-fuchsia-300 [-webkit-text-stroke:1px_#4a044e]',
  neutral: 'text-stone-200 [-webkit-text-stroke:1px_#1c1917]',
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

const statusLabel = (id: StatusId) => `${STATUSES[id].icon} ${STATUSES[id].name}`

/** Badge flottant au-dessus de la cible d'un effet. */
export function effectBadge(e: AppliedEffect): { text: string; tone: Tone } {
  switch (e.type) {
    case 'heal':
      return { text: `+${e.amount} PV`, tone: 'heal' }
    case 'damage':
      return { text: `-${e.amount}`, tone: 'damage' }
    case 'applyStatus': {
      const def = STATUSES[e.status]
      if (e.result.kind === 'blocked') return { text: `${def.icon} Résisté`, tone: 'neutral' }
      if (e.result.kind === 'cancelled') return { text: `${def.icon} Neutralisé`, tone: 'neutral' }
      return { text: `${def.icon} ${def.name}`, tone: def.polarity }
    }
    case 'cleanse':
      return { text: 'Purifié', tone: 'neutral' }
  }
}

/** Effet raconté dans le journal : « Gorak regagne 5 PV ». */
export function effectText(e: AppliedEffect, fighters: Pair<Character>): string {
  const name = fighters[e.target].name
  switch (e.type) {
    case 'heal':
      return e.amount > 0 ? `${name} regagne ${plural(e.amount, 'PV')}` : `${name} est déjà au maximum de ses PV`
    case 'damage':
      return `${name} perd ${plural(e.amount, 'PV')}`
    case 'applyStatus': {
      const def = STATUSES[e.status]
      const r = e.result
      if (r.kind === 'blocked')
        return r.by === 'immunity'
          ? `${name} est insensible à ${statusLabel(e.status)}`
          : `${statusLabel(r.by)} protège ${name} de ${statusLabel(e.status)}`
      const cancel = r.cancelled
        ? `${statusLabel(r.cancelled.status)} et ${statusLabel(e.status)} s'annulent (−${r.cancelled.stacks})`
        : ''
      if (r.kind === 'cancelled') return `${cancel} sur ${name}`
      const status = { id: e.status, stacks: r.stacks, turns: e.turns }
      const gets = `${name} reçoit ${statusLabel(e.status)} (${lowerFirst(def.describe(status))})`
      return cancel ? `${cancel}, puis ${gets}` : gets
    }
    case 'cleanse':
      return e.removed.length
        ? `${name} se libère de ${e.removed.map(statusLabel).join(', ')}`
        : `${name} n'avait rien à purifier`
  }
}

const armorDetail = (attack: Attack) => {
  const parts = [
    attack.armorAbsorbed > 0 && `armure −${attack.armorAbsorbed}`,
    ...Object.entries(attack.shields).map(([id, n]) => `${lowerFirst(statusLabel(id as StatusId))} −${n}`),
  ]
  return parts
    .filter(Boolean)
    .map((p) => `, ${p}`)
    .join('')
}

export function attackLog(
  turn: number,
  attack: Attack,
  fighters: Pair<Character>,
  defenderHp: number,
): Omit<LogEntry, 'id'> {
  const att = fighters[attack.attacker]
  const def = fighters[attack.attacker === 0 ? 1 : 0]
  const defender = (attack.attacker === 0 ? 1 : 0) as Side
  if (attack.dodged) {
    return {
      kind: 'dodge',
      side: defender,
      text: `Tour ${turn} · ${att.name} frappe (${attack.roll}) mais ${def.name} esquive !`,
    }
  }
  if (attack.crit) {
    return {
      kind: 'crit',
      side: attack.attacker,
      text: `Tour ${turn} · ${attack.critForced ? '🎯 CRITIQUE ASSURÉ' : 'CRITIQUE'} ! ${att.name} frappe ${attack.roll} ${multiplier(attack.critMultiplier)} et inflige ${attack.damage} dégâts à ${def.name}${armorDetail(attack)} (${defenderHp} PV).`,
    }
  }
  const flavor = attack.roll === attack.faces ? ' Coup maximal !' : attack.roll === 1 ? ' Une égratignure.' : ''
  return {
    kind: 'attack',
    side: attack.attacker,
    text: `Tour ${turn} · ${att.name} inflige ${plural(attack.damage, 'dégât')} à ${def.name}${armorDetail(attack)} (${defenderHp} PV).${flavor}`,
  }
}

export function eventLog(event: TriggeredEvent, fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  const effects = event.effects.map((e) => effectText(e, fighters)).join(', ')
  return { kind: 'event', side: event.side, text: `✨ Événement · ${event.name} ! ${effects}.` }
}

export function statusTickLog(
  side: Side,
  status: StatusId,
  effects: AppliedEffect[],
  fighters: Pair<Character>,
): Omit<LogEntry, 'id'> {
  return {
    kind: 'status',
    side,
    text: `${statusLabel(status)} · ${effects.map((e) => effectText(e, fighters)).join(', ')}.`,
  }
}

/** Réaction d'un statut (ex. Épines) */
export function statusReactionLog(
  side: Side,
  status: StatusId,
  effects: AppliedEffect[],
  fighters: Pair<Character>,
): Omit<LogEntry, 'id'> {
  return {
    kind: 'status',
    side,
    text: `${statusLabel(status)} de ${fighters[side].name} · ${effects.map((e) => effectText(e, fighters)).join(', ')}.`,
  }
}

/** Action perdue (ex. Étourdi) */
export function skipLog(turn: number, side: Side, status: StatusId, fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  return {
    kind: 'status',
    side,
    text: `Tour ${turn} · ${statusLabel(status)} · ${fighters[side].name} perd son action.`,
  }
}

export function statusExpireLog(side: Side, statuses: StatusId[], fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  return {
    kind: 'status',
    side,
    text: `${statuses.map(statusLabel).join(', ')} se dissipe${statuses.length > 1 ? 'nt' : ''} sur ${fighters[side].name}.`,
  }
}
