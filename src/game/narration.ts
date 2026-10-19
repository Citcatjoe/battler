import type { Character } from './character'
import {
  multiplier,
  type AppliedEffect,
  type Attack,
  type DurationChange,
  type Pair,
  type Side,
  type TriggeredEvent,
} from './combat'
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
  heal: 'text-emerald-300 [-webkit-text-stroke:3px_#064e3b]',
  damage: 'text-red-400 [-webkit-text-stroke:3px_#450a0a]',
  positive: 'text-amber-200 [-webkit-text-stroke:3px_#78350f]',
  negative: 'text-fuchsia-300 [-webkit-text-stroke:3px_#4a044e]',
  neutral: 'text-stone-200 [-webkit-text-stroke:3px_#1c1917]',
}

// « PV » est une abréviation : invariable
const plural = (n: number, word: string) => `${n} ${word}${n > 1 && word !== 'PV' ? 's' : ''}`

const statusLabel = (id: StatusId) => STATUSES[id].name

/** « de Brokk », « d'Ervald » : élision devant une voyelle ou un h muet. */
export const of = (name: string) => (/^[aeiouyhàâéèêëîïôûü]/i.test(name) ? `d'${name}` : `de ${name}`)

/** Pose sans effet : le statut était déjà à son plafond (une aura non cumulable reposée). */
export const atCap = (e: AppliedEffect) =>
  e.type === 'applyStatus' && e.result.kind === 'applied' && e.result.stacks === 0 && !e.result.cancelled

/** Badge flottant au-dessus de la cible d'un effet. */
export function effectBadge(e: AppliedEffect): { text: string; tone: Tone } {
  switch (e.type) {
    case 'heal':
      return { text: `+${e.amount} PV`, tone: 'heal' }
    case 'damage':
      return { text: `-${e.amount}`, tone: 'damage' }
    case 'applyStatus': {
      const def = STATUSES[e.status]
      if (e.result.kind === 'blocked') return { text: `${def.name} résisté`, tone: 'neutral' }
      if (e.result.kind === 'cancelled') return { text: `${def.name} neutralisé`, tone: 'neutral' }
      if (atCap(e)) return { text: `${def.name} au maximum`, tone: 'neutral' }
      return { text: def.name, tone: def.polarity }
    }
    case 'cleanse':
      // Bonus retiré par l'adversaire : « Aura de puissance dissipée » ; malus retirés : « Purifié »
      if (e.removed.length && STATUSES[e.removed[0]].polarity === 'positive')
        return { text: `${e.removed.map((id) => STATUSES[id].name).join(', ')} dissipé${e.removed.length > 1 ? 's' : ''}`, tone: 'negative' }
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
      // Dégâts directs (poison, effets) : le dire, sinon on croit que l'armure a été oubliée.
      return `${name} perd ${plural(e.amount, 'PV')} (dégâts directs, l'armure ne compte pas)`
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
      if (atCap(e)) return `${name} a déjà ${statusLabel(e.status)} au maximum : rien ne change`
      const status = { id: e.status, stacks: r.stacks, turns: e.turns }
      const gets = `${name} reçoit ${statusLabel(e.status)} (${lowerFirst(def.describe(status))})`
      return cancel ? `${cancel}, puis ${gets}` : gets
    }
    case 'cleanse':
      if (!e.removed.length) return `${name} n'avait rien à purifier`
      // Un malus retiré libère ; un bonus retiré (Purification de l'adversaire) est perdu, toutes charges comprises
      return STATUSES[e.removed[0]].polarity === 'negative'
        ? `${name} se libère de ${e.removed.map(statusLabel).join(', ')}`
        : `${name} perd ${e.removed.map(statusLabel).join(', ')}, toutes charges comprises`
  }
}

const modifierText = (m: Attack['modifiers'][number]) => `${lowerFirst(statusLabel(m.status))} ${m.delta > 0 ? '+' : '−'}${Math.abs(m.delta)}`

const armorDetail = (attack: Attack) => {
  const parts = [
    // Auras et statuts qui ont changé la force du coup (puissance +2, intimidation −2…)
    ...attack.modifiers.filter((m) => !m.final).map(modifierText),
    attack.armorAbsorbed > 0 && `armure −${attack.armorAbsorbed}`,
    ...Object.entries(attack.shields).map(([id, n]) => `${lowerFirst(statusLabel(id as StatusId))} −${n}`),
    // Dégâts finaux (Aura mélodieuse, Fausse note), après l'armure et les boucliers
    ...attack.modifiers.filter((m) => m.final).map(modifierText),
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
  if (attack.forfeited) {
    return {
      kind: 'attack',
      side: attack.attacker,
      text: `Tour ${turn} · ${att.name} fait ${attack.roll} : pas de dégâts, sa compétence se déclenche.`,
    }
  }
  // Coup transformé (Charge, Coup de griffe) : le nom de la compétence, puis le coup lui-même
  const move = attack.reshaped ? att.events.find((e) => e.id === attack.reshaped!.event)?.name : undefined
  if (move && !attack.dodged) {
    const crit = attack.crit ? ` CRITIQUE ${multiplier(attack.critMultiplier)} !` : ''
    return {
      kind: attack.crit ? 'crit' : 'attack',
      side: attack.attacker,
      text: `Tour ${turn} · ${att.name} fait ${attack.roll} : ${move} !${crit} Il inflige ${attack.damage} dégâts à ${def.name}${armorDetail(attack)} (${defenderHp} PV).`,
    }
  }
  if (attack.dodged) {
    return {
      kind: 'dodge',
      side: defender,
      text: `Tour ${turn} · ${att.name} frappe (${attack.roll}) mais ${def.name} esquive${attack.dodgeForced ? ' à coup sûr' : ''} !`,
    }
  }
  if (attack.crit) {
    return {
      kind: 'crit',
      side: attack.attacker,
      text: `Tour ${turn} · ${attack.critForced ? 'CRITIQUE ASSURÉ' : 'CRITIQUE'} ! ${att.name} frappe ${attack.roll} ${multiplier(attack.critMultiplier)} et inflige ${attack.damage} dégâts à ${def.name}${armorDetail(attack)} (${defenderHp} PV).`,
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
  return { kind: 'event', side: event.side, text: effects ? `Compétence · ${event.name} ! ${effects}.` : `Compétence · ${event.name} !` }
}

export function statusTickLog(
  side: Side,
  status: StatusId,
  effects: AppliedEffect[],
  fighters: Pair<Character>,
): Omit<LogEntry, 'id'> {
  // Arrêté par l'immunité de la victime (0.48.0) : rien ne se passe, on dit pourquoi
  if (effects.length === 0 && STATUSES[status].stoppedByImmunity)
    return { kind: 'status', side, text: `${statusLabel(status)} ${of(fighters[side].name)} · l'immunité de ${fighters[1 - side].name} l'arrête.` }
  // Un statut qui agit sur l'adversaire dit à qui il appartient : « Aura de poison d'Ervald · … »
  const owner = effects.some((e) => e.target !== side) ? ` ${of(fighters[side].name)}` : ''
  return {
    kind: 'status',
    side,
    text: `${statusLabel(status)}${owner} · ${effects.map((e) => effectText(e, fighters)).join(', ')}.`,
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
    text: `${statusLabel(status)} ${of(fighters[side].name)} · ${effects.map((e) => effectText(e, fighters)).join(', ')}.`,
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

/** Changement de forme (druide) */
export function shiftLog(turn: number, side: Side, form: number, fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  const c = fighters[side]
  return { kind: 'event', side, text: `Tour ${turn} · ${c.name} prend sa ${c.forms?.[form].name.toLowerCase() ?? 'autre forme'}.` }
}

/** Coups multiples (ex. Furie des vents) */
export function flurryLog(turn: number, side: Side, status: StatusId, strikes: number, fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  return {
    kind: 'status',
    side,
    text: `Tour ${turn} · ${statusLabel(status)} · ${fighters[side].name} frappe ${strikes} fois !`,
  }
}

/** Deux dés (barde) : la paire lancée, et ce qu'elle donne */
export function pairLog(turn: number, side: Side, rolls: [number, number], skill: string | undefined, fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  const name = fighters[side].name
  const [x, y] = rolls
  return {
    kind: skill ? 'event' : 'attack',
    side,
    text: skill
      ? `Tour ${turn} · ${name} fait un double ${x} : ${skill} !`
      : `Tour ${turn} · ${name} lance ses deux dés : ${x} et ${y}${x === y ? ', un double' : ''}, deux coups.`,
  }
}

/** Pile ou face */
export function coinLog(turn: number, side: Side, heads: boolean, effects: AppliedEffect[], fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  const name = fighters[side].name
  return {
    kind: 'status',
    side,
    text: heads
      ? `Tour ${turn} · Pile ! ${effects.map((e) => effectText(e, fighters)).join(', ')}.`
      : `Tour ${turn} · Face… ${name} ne gagne rien cette fois.`,
  }
}

/** Durées décomptées : « Poison sur Brokk : encore 2 tours » */
export function statusDurationLog(side: Side, changes: DurationChange[], fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  return {
    kind: 'status',
    side,
    text: `${changes.map((c) => `${statusLabel(c.status)} sur ${fighters[side].name} : encore ${plural(c.to, 'tour')}`).join(', ')}.`,
  }
}

export function statusExpireLog(side: Side, statuses: StatusId[], fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  return {
    kind: 'status',
    side,
    text: `${statuses.map(statusLabel).join(', ')} se dissipe${statuses.length > 1 ? 'nt' : ''} sur ${fighters[side].name}.`,
  }
}
