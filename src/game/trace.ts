import type { Character } from './character'
import { multiplier, percent, type AppliedEffect, type Beat, type CombatResult, type Pair, type Side, type Snapshot } from './combat'
import { TRIGGERS, type Trigger } from './events'
import { atCap, of } from './narration'
import { STATUSES, statusCounter, type Status, type StatusId } from './statuses'

/*
 * Trace de résolution : le récit complet et littéral d'un combat, étape par étape, tiré de la
 * chronologie (`beats`). Rien n'y est recalculé : chaque ligne dit ce que le moteur a fait, dans
 * l'ordre où il l'a fait (décomptes de durée compris), avec les PV avant et après et les statuts restants. Elle sert à
 * vérifier les règles de RESOLUTION.md et à déboguer (console du navigateur, bouton « Copier la
 * trace » du journal).
 */

export interface TraceTurn {
  /** 0 pour l'ouverture (initiative et « début du combat ») */
  turn: number
  /** Camp actif du tour (absent à l'ouverture) */
  active?: Side
  lines: string[]
}

export interface CombatTrace {
  title: string
  header: string[]
  turns: TraceTurn[]
  footer: string
}

const other = (side: Side): Side => (side === 0 ? 1 : 0)
const SIDE_LABEL: Record<Side, string> = { 0: 'gauche', 1: 'droite' }
const label = (id: StatusId) => STATUSES[id].name

/** « Poison 2 charges, 3 tours » */
function statusText(s: Status) {
  const turns = s.turns !== undefined ? `, ${s.turns} tour${s.turns > 1 ? 's' : ''}` : ''
  const counter = statusCounter(s)
  const shown = counter ? ` [affiche ${counter.value}]` : ''
  return `${label(s.id)} ${s.stacks} charge${s.stacks > 1 ? 's' : ''}${turns}${shown}`
}

function phaseOf(beat: Beat): string {
  switch (beat.type) {
    case 'statusTick':
    case 'statusDuration':
    case 'statusExpire':
      return beat.phase === 'turnStart' ? 'début' : 'fin'
    case 'event':
      return triggerPhase(beat.event.trigger)
    case 'statusReaction':
      return triggerPhase(beat.trigger)
    case 'shift':
      return 'début'
    default:
      return 'action'
  }
}

function triggerPhase(trigger: Trigger) {
  if (trigger === 'combatStart') return 'ouverture'
  if (trigger === 'turnStart') return 'début'
  if (trigger === 'turnEnd') return 'fin'
  return 'action'
}

/** Un effet appliqué, avec son résultat réel et les PV de la cible avant → après. */
function effectLine(e: AppliedEffect, fighters: Pair<Character>, before: Snapshot, after: Snapshot) {
  const name = fighters[e.target].name
  const hp = `${name} ${before.hp[e.target]} → ${after.hp[e.target]} PV`
  switch (e.type) {
    case 'heal':
      return `soin de ${e.amount} PV sur ${name} (${hp})`
    case 'damage':
      return `${e.amount} dégât${e.amount > 1 ? 's' : ''} direct${e.amount > 1 ? 's' : ''} à ${name}, sans armure, esquive ni bouclier (${hp})`
    case 'applyStatus': {
      const r = e.result
      const asked = `${e.stacks} charge${e.stacks > 1 ? 's' : ''}${e.turns !== undefined ? `, ${e.turns} tour${e.turns > 1 ? 's' : ''}` : ''}`
      if (r.kind === 'blocked')
        return `${label(e.status)} (${asked}) sur ${name} : bloqué par ${r.by === 'immunity' ? 'immunité' : label(r.by)}`
      const cancel = r.cancelled ? ` ; opposition avec ${label(r.cancelled.status)} : −${r.cancelled.stacks} de part et d'autre` : ''
      if (r.kind === 'cancelled') return `${label(e.status)} (${asked}) sur ${name} : entièrement annulé${cancel}`
      if (atCap(e)) return `${label(e.status)} (${asked}) sur ${name} : déjà au plafond, rien ne change`
      return `${label(e.status)} (${asked}) sur ${name} : posé, ${r.stacks} charge${r.stacks > 1 ? 's' : ''} retenue${r.stacks > 1 ? 's' : ''}${cancel}`
    }
    case 'cleanse':
      return e.removed.length ? `purge sur ${name} : retire ${e.removed.map(label).join(', ')}` : `purge sur ${name} : rien à retirer`
  }
}

function beatLines(beat: Beat, fighters: Pair<Character>, before: Snapshot): string[] {
  const after = beat.state
  const effects = (list: AppliedEffect[]) =>
    list.length ? list.map((e) => `    → ${effectLine(e, fighters, before, after)}`) : ['    → aucun effet']
  switch (beat.type) {
    case 'attack': {
      const a = beat.attack
      const att = fighters[a.attacker]
      const defSide = other(a.attacker)
      const def = fighters[defSide]
      const head = `${att.name} attaque ${def.name} : dé ${a.roll} sur d${a.faces}${a.roll === 1 ? ' (1 naturel)' : a.roll === a.faces ? ' (jet maximal)' : ''}${a.forced ? ' [imposé]' : ''}${a.reshaped ? ` → ${eventName(att, a.reshaped.event)} : coup de ${a.reshaped.value}${a.reshaped.noCrit ? ', sans critique possible' : ''}` : ''}`
      if (a.forfeited) return [`${head} · coup sacrifié par une compétence, aucun dégât (ni esquive ni critique)`]
      if (a.dodged)
        return [`${head} · esquivé par ${def.name}${a.dodgeForced ? ' (esquive imposée par un statut, sans tirage)' : ''}, aucun dégât`]
      const steps = [
        a.crit ? `critique ${multiplier(a.critMultiplier)}${a.critForced ? ' (imposé par un statut)' : ''}` : 'pas de critique',
        // Auras et statuts qui changent la force du coup, avec leur porteur
        ...a.modifiers.map(
          (m) => `${label(m.status)} ${of(m.by === 'attacker' ? att.name : def.name)} ${m.delta > 0 ? '+' : '−'}${Math.abs(m.delta)}`,
        ),
        `avant armure ${a.raw}${a.raw > (a.crit ? Math.round(a.roll * a.critMultiplier) : a.roll) + a.modifiers.reduce((t, m) => t + m.delta, 0) ? ' (plancher : un coup vaut au moins 1)' : ''}`,
        `armure ${a.armor} → −${a.armorAbsorbed}`,
        ...Object.entries(a.shields).map(([id, n]) => `${label(id as StatusId)} −${n}`),
        `dégâts ${a.damage}${a.floored ? ' (plancher : un coup qui touche inflige au moins 1)' : ''}`,
        a.dealt > before.hp[defSide] ? `retirés ${before.hp[defSide]}, dont ${a.dealt - before.hp[defSide]} d'excès (overkill, compté)` : `retirés ${a.dealt}`,
      ]
      return [`${head} · ${steps.join(' · ')} (${def.name} ${before.hp[defSide]} → ${after.hp[defSide]} PV)`]
    }
    case 'event': {
      const e = beat.event
      return [`Compétence « ${e.name} » ${of(fighters[e.side].name)} (${TRIGGERS[e.trigger].label.toLowerCase()})`, ...effects(e.effects)]
    }
    case 'statusTick':
      return [
        beat.effects.some((e) => e.target !== beat.side)
          ? `${label(beat.status)} ${of(fighters[beat.side].name)} agit sur ${fighters[other(beat.side)].name}`
          : `${label(beat.status)} agit sur ${fighters[beat.side].name}`,
        ...effects(beat.effects),
      ]
    case 'statusReaction':
      return [
        `${label(beat.status)} ${of(fighters[beat.side].name)} réagit (${TRIGGERS[beat.trigger].label.toLowerCase()})`,
        ...effects(beat.effects),
      ]
    case 'statusDuration':
      return [
        `durée décomptée sur ${fighters[beat.side].name} : ${beat.changes
          .map((c) => `${label(c.status)} ${c.from} → ${c.to} tour${c.to > 1 ? 's' : ''}`)
          .join(', ')}`,
      ]
    case 'statusExpire':
      return [`durée écoulée sur ${fighters[beat.side].name} : ${beat.statuses.map(label).join(', ')} expire${beat.statuses.length > 1 ? 'nt' : ''}`]
    case 'skip':
      return [`${label(beat.status)} : ${fighters[beat.side].name} perd son action (une charge consommée)`]
    case 'shift':
      return [`${fighters[beat.side].name} change de forme : ${fighters[beat.side].forms?.[beat.form].name ?? beat.form}`]
    case 'flurry':
      return [
        `${label(beat.status)} : ${fighters[beat.side].name} frappe ${beat.strikes} fois cette action (${beat.faces.map((f) => `d${f}`).join(' + ')}), chaque coup résolu à part (statut consommé)`,
      ]
    case 'coin':
      return [
        `${label(beat.status)} : ${fighters[beat.side].name} lance une pièce au lieu de son dé → ${beat.heads ? 'PILE' : 'FACE, rien ne se passe'}${beat.forced ? ' [imposé]' : ''} (statut consommé)`,
        ...(beat.heads ? effects(beat.effects) : []),
      ]
  }
}

function statusesLine(state: Snapshot, fighters: Pair<Character>) {
  const side = (s: Side) => `${fighters[s].name} ${state.hp[s]}/${fighters[s].maxHp} PV ${state.statuses[s].length ? state.statuses[s].map(statusText).join(', ') : 'aucun statut'}`
  return `    = ${side(0)} | ${side(1)}`
}

function fighterLine(c: Character, side: Side) {
  const s = c.stats
  const skills = c.events.map((e) => e.name).join(', ') || 'aucune'
  return `${c.name} (${SIDE_LABEL[side]}, ${c.race}) : ${c.maxHp} PV, d${s.damageDie}, armure ${s.armor}, esquive ${percent(s.dodgeChance)}, critique ${percent(s.critChance)} ${multiplier(s.critMultiplier)} · compétences : ${skills}`
}

/** Trace structurée d'un combat (un bloc par tour). */
export function traceCombat(result: CombatResult): CombatTrace {
  const { fighters, initiative, beats } = result
  const last = initiative[initiative.length - 1]
  const first: Side = last[0] > last[1] ? 0 : 1
  const activeAt = (turn: number): Side => (turn % 2 === 1 ? first : other(first))
  const seed = result.seed !== undefined ? ` · graine ${result.seed}` : ''

  const header = [
    fighterLine(fighters[0], 0),
    fighterLine(fighters[1], 1),
    `Initiative (d10) : ${initiative.map((r) => `${r[0]}–${r[1]}`).join(', relance sur égalité, ')} → ${fighters[first].name} commence`,
    ...(result.forcedRolls ? [`${FORCED_PREFIX}${formatForcedRolls(result.forcedRolls)}`] : []),
  ]

  const turns: TraceTurn[] = []
  let before: Snapshot = { hp: [fighters[0].maxHp, fighters[1].maxHp], statuses: [[], []] }
  for (const beat of beats) {
    let block = turns[turns.length - 1]
    if (!block || block.turn !== beat.turn) {
      block = beat.turn === 0 ? { turn: 0, lines: [] } : { turn: beat.turn, active: activeAt(beat.turn), lines: [] }
      turns.push(block)
    }
    const [head, ...rest] = beatLines(beat, fighters, before)
    block.lines.push(`[${phaseOf(beat)}] ${head}`, ...rest, statusesLine(beat.state, fighters))
    before = beat.state
  }

  const final = beats.length ? beats[beats.length - 1].state : before
  const winner = fighters[result.winner].name
  const how = result.endedBy === 'ko' ? 'par K.O.' : `aux PV (limite de tours atteinte)`
  return {
    title: `${fighters[0].name} contre ${fighters[1].name}${seed}`,
    header,
    turns,
    footer: `Fin : ${winner} gagne ${how} au tour ${result.turns} (${fighters[0].name} ${final.hp[0]} PV, ${fighters[1].name} ${final.hp[1]} PV)`,
  }
}

export const turnTitle = (t: TraceTurn, fighters: Pair<Character>) =>
  t.active === undefined ? 'Ouverture' : `Tour ${t.turn} · ${fighters[t.active].name} actif`

const eventName = (c: Character, id: string) => c.events.find((e) => e.id === id)?.name ?? id

/** En-tête des dés imposés (mode triche) : `npm run logs` la relit pour rejouer le combat. */
export const FORCED_PREFIX = 'Dés imposés (mode triche, rang de dé = valeur) : '

/** « #5=6, #9=1 » : rangs comptés à partir de 1, dans l'ordre des coups et des pièces du combat. */
export const formatForcedRolls = (forced: Readonly<Record<number, number>>) =>
  Object.entries(forced)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([rank, value]) => `#${Number(rank) + 1}=${value}`)
    .join(', ')

/** Lecture inverse de `formatForcedRolls`, depuis une trace écrite. */
export function parseForcedRolls(text: string): Record<number, number> | undefined {
  const line = text.split('\n').find((l) => l.startsWith(FORCED_PREFIX))
  if (!line) return undefined
  const forced: Record<number, number> = {}
  for (const [, rank, value] of line.matchAll(/#(\d+)=(\d+)/g)) forced[Number(rank) - 1] = Number(value)
  return forced
}

/** Trace en texte brut, à copier ou à coller dans un rapport de bug. */
export function traceText(result: CombatResult): string {
  const trace = traceCombat(result)
  return [
    `=== Battler · ${trace.title} ===`,
    ...trace.header,
    ...trace.turns.flatMap((t) => [`--- ${turnTitle(t, result.fighters)} ---`, ...t.lines]),
    `=== ${trace.footer} ===`,
  ].join('\n')
}
