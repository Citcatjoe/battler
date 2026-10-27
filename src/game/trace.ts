import type { Character } from './character'
import { firstSide, multiplier, percent, type AppliedEffect, type Attack, type Beat, type CombatResult, type Pair, type Side, type Snapshot } from './combat'
import { DIE_FACES, triggerText, type CharacterEvent, type Trigger } from './events'
import { stepKey, type ForgeStep } from './forge'
import { atCap, of } from './narration'
import { describeRelic, RELIC_KINDS, relicKind } from './relics'
import { STATES, STATUS_PLACE } from './states'
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
  // Le nombre que montre la zone d'état : aucun pour un état sans compteur (Critique assuré depuis B8, Tour perdu…)
  const place = STATUS_PLACE[s.id]
  const uncounted = place.place === 'tray' && place.relays.every((r) => STATES[r.state].counter === 'none')
  const counter = uncounted ? null : statusCounter(s)
  const shown = counter ? ` [affiche ${counter.value}]` : ''
  // Intensité d'un statut aiguisé (0.110.0)
  const power = s.power ? `, intensité ${s.power}` : ''
  return `${label(s.id)} ${s.stacks} charge${s.stacks > 1 ? 's' : ''}${turns}${power}${shown}`
}

function phaseOf(beat: Beat, fighters: Pair<Character>): string {
  switch (beat.type) {
    case 'statusTick':
    case 'statusAge':
      return beat.phase === 'turnStart' ? 'début' : 'fin'
    case 'event':
      return triggerPhase(beat.event.trigger)
    case 'statusReaction':
      return triggerPhase(beat.trigger)
    case 'shift':
      return 'début'
    // Une relique de tour part au début du tour ; les autres, sur un coup (ou un seuil franchi pendant l'action)
    case 'relic':
      return fighters[beat.side].relics.find((r) => r.id === beat.relic)?.trigger?.type === 'turn' ? 'début' : 'action'
    default:
      return 'action'
  }
}

function triggerPhase(trigger: Trigger) {
  if (trigger === 'combatStart') return 'ouverture'
  if (trigger === 'turnStart' || trigger === 'auraDue') return 'début'
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
      if (e.armored)
        return `${e.amount} dégât${e.amount > 1 ? 's' : ''} à ${name}, contre son armure (−${e.armorAbsorbed ?? 0}), sans esquive ni bouclier (${hp})`
      return `${e.amount} dégât${e.amount > 1 ? 's' : ''} direct${e.amount > 1 ? 's' : ''} à ${name}, sans armure, esquive ni bouclier (${hp})`
    case 'applyStatus': {
      const r = e.result
      const asked = `${e.stacks} charge${e.stacks > 1 ? 's' : ''}${e.turns !== undefined ? `, ${e.turns} tour${e.turns > 1 ? 's' : ''}` : ''}`
      if (r.kind === 'blocked')
        return `${label(e.status)} (${asked}) sur ${name} : bloqué par ${r.by === 'immunity' ? 'immunité' : label(r.by)}`
      const cancel = r.cancelled ? ` ; opposition avec ${label(r.cancelled.status)} : −${r.cancelled.stacks} de part et d'autre` : ''
      if (r.kind === 'cancelled') return `${label(e.status)} (${asked}) sur ${name} : entièrement annulé${cancel}`
      if (atCap(e)) return `${label(e.status)} (${asked}) sur ${name} : déjà au plafond, rien ne change`
      // Un vol prend une charge (quatrième demande du 2026-10-27) : le lanceur détroussé garde les autres (`kept`)
      return `${label(e.status)} (${asked}) sur ${name} : posé, ${r.stacks} charge${r.stacks > 1 ? 's' : ''} retenue${r.stacks > 1 ? 's' : ''}${cancel}${e.kept ? ` ; volé, le lanceur en garde ${e.kept}` : ''}`
    }
    case 'cleanse':
      if (e.stolen && e.removed.length) return `vol sur ${name} : prend une charge de ${e.removed.map(label).join(', ')}`
      return e.removed.length ? `purge sur ${name} : retire ${e.removed.map(label).join(', ')}` : `purge sur ${name} : rien à retirer`
    case 'rebound':
      return `${label(e.status)} relâchée : ${e.parts.length} renvoi${e.parts.length > 1 ? 's' : ''} sur ${name} (${e.parts.join(' · ')}), chacun un coup à part, ci-dessous`
  }
}

/**
 * La résolution d'un coup, après son en-tête : sa valeur (`base`), puis esquive, ou reliques, critique, modificateurs,
 * armure, boucliers, dégâts. Un coup de base et un renvoi (C1) se lisent de même.
 */
function strikeSteps(a: Attack, base: string, fighters: Pair<Character>, before: Snapshot, after: Snapshot): string {
  const att = fighters[a.attacker]
  const defSide = other(a.attacker)
  const def = fighters[defSide]
  const modifier = (m: (typeof a.modifiers)[number]) =>
    `${label(m.status)} ${of(m.by === 'attacker' ? att.name : def.name)} ${m.delta > 0 ? '+' : '−'}${Math.abs(m.delta)}`
  const early = a.modifiers.filter((m) => !m.final)
  if (a.dodged)
    return `${base} · esquivé par ${def.name}${a.dodgeForced ? ' (esquive imposée par un statut, sans tirage)' : ''}${a.critBy ? ` · ${label(a.critBy)} perdu` : ''}, aucun dégât`
  const bonus = (a.relicBonus ?? []).reduce((t, b) => t + b.amount, 0) + (a.gild ?? 0)
  const struck = a.value * (a.multiplier ?? 1) + bonus
  const steps = [
    base,
    // Reliques de coup (Fer à quatre clous), puis face dorée (forge du dé) : avant le critique
    ...(a.relicBonus ?? []).map((b) => `relique ${b.name} +${b.amount}`),
    ...(a.gild ? [`face dorée +${a.gild}`] : []),
    a.crit ? `critique ${multiplier(a.critMultiplier)}${a.critForced ? ' (imposé par un statut)' : ''}` : 'pas de critique',
    // Auras et statuts qui changent la force du coup, avec leur porteur
    ...early.map(modifier),
    `avant armure ${a.raw}${a.raw > (a.crit ? Math.round(struck * a.critMultiplier) : struck) + early.reduce((t, m) => t + m.delta, 0) ? ' (plancher : un coup vaut au moins 1)' : ''}`,
    `armure ${a.armor} → −${a.armorAbsorbed}`,
    ...a.shields.map((s) => `${label(s.status)} −${s.absorbed}`),
    // Dégâts finaux (Fausse note) : après l'armure et les boucliers
    ...a.modifiers.filter((m) => m.final).map((m) => `${modifier(m)} (dégâts finaux)`),
    `dégâts ${a.damage}${a.floored ? ' (plancher : un coup qui touche inflige au moins 1)' : ''}`,
    a.dealt > before.hp[defSide] ? `retirés ${before.hp[defSide]}, dont ${a.dealt - before.hp[defSide]} d'excès (overkill, compté)` : `retirés ${a.dealt}`,
  ]
  return `${steps.join(' · ')} (${def.name} ${before.hp[defSide]} → ${after.hp[defSide]} PV)`
}

function beatLines(beat: Beat, fighters: Pair<Character>, before: Snapshot): string[] {
  const after = beat.state
  const effects = (list: AppliedEffect[]) =>
    list.length ? list.map((e) => `    → ${effectLine(e, fighters, before, after)}`) : ['    → aucun effet']
  switch (beat.type) {
    case 'attack': {
      const a = beat.attack
      const att = fighters[a.attacker]
      const head = `${att.name} attaque ${fighters[other(a.attacker)].name} : dé ${a.roll}${a.roll === DIE_FACES ? ' (jet maximal)' : ''}${a.forced ? ' [imposé]' : ''}${a.preset ? ' (dé déjà tiré)' : ''}${a.plain ? ' (coup brut de Furie, sans compétence)' : ''}`
      if (a.replaced) return [`${head} · jet remplacé par sa compétence : pas de coup de base (ni esquive ni critique)`]
      // Le coup de base : sa valeur tirée dans l'attaque (« coup de base 6 (5 à 7) »), ×N par Crescendo ou Soliste ; un
      // type d'attaque unique depuis le 2026-10-24 (« DP », « DM Lumière » avant)
      const base = `coup de base ${a.value} (${att.stats.attackMin} à ${att.stats.attackMax})${a.multiplier ? ` ×${a.multiplier}` : ''}`
      return [`${head} · ${strikeSteps(a, base, fighters, before, after)}`]
    }
    case 'event': {
      const e = beat.event
      const head = `Compétence « ${e.name} » ${of(fighters[e.side].name)} (${triggerText(e.trigger).label.toLowerCase()})`
      // Crescendo, Soliste : leur effet est le multiplicateur du coup qu'ils modifient, déjà compté dans ce coup
      const boost = fighters[e.side].events.find((x) => x.id === e.eventId)?.hitMultiplier
      return boost && e.effects.length === 0 ? [`${head} → ce coup ×${boost}, compté dans le coup ci-dessus`] : [head, ...effects(e.effects)]
    }
    case 'statusTick':
      return [
        beat.effects.some((e) => e.target !== beat.side)
          ? `${label(beat.status)} ${of(fighters[beat.side].name)} agit sur ${fighters[other(beat.side)].name}`
          : `${label(beat.status)} agit sur ${fighters[beat.side].name}`,
        ...effects(beat.effects),
      ]
    case 'statusReaction': {
      const head = `${label(beat.status)} ${of(fighters[beat.side].name)} réagit (${triggerText(beat.trigger).label.toLowerCase()})`
      // Un renvoi (C1 : Riposte, jauge de Rétribution) : un coup sans dé, résolu comme un coup
      if (beat.strike) return [`${head} : renvoi sur ${fighters[other(beat.side)].name}, coup sans dé · ${strikeSteps(beat.strike, `valeur ${beat.strike.value}`, fighters, before, after)}`]
      // Jauges (Rétribution) : le coup est rangé, sans effet à appliquer
      const gauge = STATUSES[beat.status].fillsOnHurt ? after.statuses[beat.side].find((s) => s.id === beat.status) : undefined
      if (gauge) return [head, `    → coup rangé dans les jauges : ${(gauge.slots ?? []).join(' · ')} (${gauge.stacks} à relâcher)`]
      return [head, ...effects(beat.effects)]
    }
    case 'statusAge':
      return [
        `usure sur ${fighters[beat.side].name} : ${[
          ...beat.changes.map((c) => `${label(c.status)} ${c.from} → ${c.to} tour${c.to > 1 ? 's' : ''}`),
          ...beat.expired.map((id) => `${label(id)} s'éteint`),
        ].join(', ')}`,
      ]
    case 'skip':
      return [`${label(beat.status)} : ${fighters[beat.side].name} perd son action (une charge consommée)`]
    case 'shift':
      return [`${fighters[beat.side].name} change de forme : ${fighters[beat.side].forms?.[beat.form].name ?? beat.form}`]
    case 'flurry':
      return [
        `${label(beat.status)} : ${fighters[beat.side].name} frappe ${beat.strikes} fois cette action (${beat.faces.map((f) => `d${f}`).join(' + ')}), chaque jet résolu à part (statut consommé)`,
      ]
    case 'roll':
      return [`${fighters[beat.side].name} lance son dé : ${beat.roll}${beat.forced ? ' [imposé]' : ''} → sa compétence se greffe, puis le coup de base`]
    case 'coin':
      return [
        `${label(beat.status)} : ${fighters[beat.side].name} lance aussitôt une pièce → ${beat.heads ? 'PILE' : 'FACE, rien ne se passe'}${beat.forced ? ' [imposé]' : ''} (statut consommé)`,
        ...(beat.heads ? effects(beat.effects) : []),
      ]
    case 'relic': {
      const relic = fighters[beat.side].relics.find((r) => r.id === beat.relic)
      const kind = relic ? `relique de ${RELIC_KINDS[relicKind(relic)].label.toLowerCase()}${relic.scene ? `, scène ${relic.scene}` : ''}` : 'relique inconnue'
      const left = relic?.charges !== undefined ? `, ${relic.charges - beat.uses} charge${relic.charges - beat.uses > 1 ? 's' : ''} restante${relic.charges - beat.uses > 1 ? 's' : ''}` : ''
      // Sursis et initiative (2026-10-27) : leur règle est leur effet
      const rule =
        relic?.trigger?.type === 'lethal'
          ? [`  → ${fighters[beat.side].name} aurait dû tomber : reste à 1 PV`]
          : relic?.trigger?.type === 'initiative'
            ? [`  → ${fighters[beat.side].name} joue le premier tour, sans jet d'initiative`]
            : []
      return [`Relique « ${beat.name} » ${of(fighters[beat.side].name)} (${kind}, déclenchement n° ${beat.uses}${left})`, ...rule, ...effects(beat.effects)]
    }
  }
}

function statusesLine(state: Snapshot, fighters: Pair<Character>) {
  const side = (s: Side) => `${fighters[s].name} ${state.hp[s]}/${fighters[s].maxHp} PV ${state.statuses[s].length ? state.statuses[s].map(statusText).join(', ') : 'aucun statut'}`
  return `    = ${side(0)} | ${side(1)}`
}

function fighterLine(c: Character, side: Side) {
  const s = c.stats
  const skills = c.events.map((e) => e.name).join(', ') || 'aucune'
  return `${c.name} (${SIDE_LABEL[side]}, ${c.race}) : ${c.maxHp} PV, attaque ${s.attackMin} à ${s.attackMax}, armure ${s.armor}, esquive ${percent(s.dodgeChance)}, critique ${percent(s.critChance)} ${multiplier(s.critMultiplier)} · compétences : ${skills}`
}

/** Trace structurée d'un combat (un bloc par tour). */
export function traceCombat(result: CombatResult): CombatTrace {
  const { fighters, initiative, beats } = result
  const first: Side = firstSide(result)
  const activeAt = (turn: number): Side => (turn % 2 === 1 ? first : other(first))
  const seed = result.seed !== undefined ? ` · graine ${result.seed}` : ''

  const header = [
    fighterLine(fighters[0], 0),
    fighterLine(fighters[1], 1),
    result.initiativeRelic
      ? `Initiative : sans jet, ${fighters[first].name} commence (relique ${result.initiativeRelic.relic})`
      : `Initiative (d10) : ${initiative.map((r) => `${r[0]}–${r[1]}`).join(', relance sur égalité, ')} → ${fighters[first].name} commence`,
    ...(result.forcedRolls ? [`${FORCED_PREFIX}${formatForcedRolls(result.forcedRolls)}`] : []),
    // Reliques (tournoi) : `npm run logs` relit leurs identifiants pour rejouer le combat
    ...([0, 1] as const).flatMap((s) =>
      fighters[s].relics.length
        ? [`${RELICS_PREFIX}${SIDE_LABEL[s]}, ${fighters[s].name}) : ${fighters[s].relics.map((r) => `${r.id} « ${r.name} » (${describeRelic(r).text})`).join(' ; ')}`]
        : [],
    ),
    // Forge du dé (campagne) : `npm run logs` relit son journal pour rejouer le combat
    ...([0, 1] as const).flatMap((s) =>
      fighters[s].forge.length ? [`${FORGE_PREFIX}${SIDE_LABEL[s]}, ${fighters[s].name}) : ${fighters[s].forge.map(stepKey).join(' ; ')}`] : [],
    ),
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
    block.lines.push(`[${phaseOf(beat, fighters)}] ${head}`, ...rest, statusesLine(beat.state, fighters))
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

/** En-tête des reliques d'un camp : « Reliques (gauche, Gorak) : wolf-fang « Dent de loup » (…) ; … » */
export const RELICS_PREFIX = 'Reliques ('

/** Lecture inverse de l'en-tête des reliques : leurs identifiants par camp, dans l'ordre d'obtention. */
export function parseRelics(text: string): Pair<string[]> {
  const relics: Pair<string[]> = [[], []]
  for (const line of text.split('\n').filter((l) => l.startsWith(RELICS_PREFIX))) {
    const side = line.startsWith(`${RELICS_PREFIX}${SIDE_LABEL[0]},`) ? 0 : 1
    relics[side] = [...line.matchAll(/([a-z]+(?:-[a-z]+)*) « /g)].map((m) => m[1])
  }
  return relics
}

/**
 * En-tête de la forge d'un camp : « Forge (gauche, Gorak) : engrave 5 cleave ; gild 4 ; copy 2 3 ; temper » (journal, dans
 * l'ordre). Une copie d'avant la 0.111.0 s'écrivait sans sa destination (« copy 2 ») : elle se relit telle quelle.
 */
export const FORGE_PREFIX = 'Forge ('

/** Lecture inverse de l'en-tête de forge : le journal de chaque camp ; `skills` : où retrouver une compétence gravée. */
export function parseForge(text: string, skills: readonly CharacterEvent[]): Pair<ForgeStep[]> {
  const forge: Pair<ForgeStep[]> = [[], []]
  for (const line of text.split('\n').filter((l) => l.startsWith(FORGE_PREFIX))) {
    const side = line.startsWith(`${FORGE_PREFIX}${SIDE_LABEL[0]},`) ? 0 : 1
    forge[side] = line
      .slice(line.indexOf(') : ') + 4)
      .split(' ; ')
      .map((token): ForgeStep => {
        const [op, face, arg] = token.split(' ')
        if (op === 'temper') return { op }
        if (op === 'copy') return arg === undefined ? { op, face: Number(face) } : { op, face: Number(face), to: Number(arg) }
        if (op === 'gild' || op === 'sharpen') return { op, face: Number(face) }
        const skill = skills.find((e) => e.id === arg)
        if (op !== 'engrave' || !skill) throw new Error(`Forge illisible : ${token}`)
        return { op, face: Number(face), skill }
      })
  }
  return forge
}

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
