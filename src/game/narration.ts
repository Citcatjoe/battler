import type { Character } from './character'
import {
  multiplier,
  type AppliedEffect,
  type Attack,
  type DurationChange,
  type Pair,
  type Side,
  type TriggeredEvent,
  type Beat,
} from './combat'
import { DAMAGE_SOURCES, type DamageTone } from './damage'
import { COIN_HEADS, lowerFirst, STATUSES, type StatusId } from './statuses'

/*
 * Textes du journal et badges à l'écran, générés à partir de la chronologie et du registre
 * des statuts : un nouveau statut ou effet n'a pas besoin de texte écrit à la main ailleurs.
 */

export type LogKind = 'info' | 'initiative' | 'attack' | 'crit' | 'dodge' | 'event' | 'relic' | 'status' | 'ko'

export interface LogEntry {
  id: number
  kind: LogKind
  text: string
  side?: Side
}

/**
 * Couleur d'un texte flottant. Celle d'un chiffre de dégâts vient de sa source (`DamageTone`, `DAMAGE_SOURCES` de
 * damage.ts ; docs/MISE_EN_SCENE.md, M37) : blanc du coup (le « coup blanc », 2026-10-24), rouge du Saignement, ivoire
 * de la Lumière, cyan de la Foudre, gris acier du Vent, jaune du Feu et de la Brûlure, mauve de la Pourriture, vert
 * acide du Poison. Un statut qui fait perdre des PV a la teinte de ses dégâts pour son nom et ses charges (`statusTone`).
 */
export type Tone = 'heal' | 'positive' | 'negative' | 'neutral' | DamageTone

export const TONE_CLASS: Record<Tone, string> = {
  heal: 'text-emerald-300 [-webkit-text-stroke:3px_#064e3b]',
  hit: 'text-white [-webkit-text-stroke:3px_#0c0a09]',
  damage: 'text-red-400 [-webkit-text-stroke:3px_#450a0a]',
  positive: 'text-amber-200 [-webkit-text-stroke:3px_#78350f]',
  negative: 'text-fuchsia-300 [-webkit-text-stroke:3px_#4a044e]',
  neutral: 'text-stone-200 [-webkit-text-stroke:3px_#1c1917]',
  // Vert acide, loin de l'émeraude du soin ; mauve, loin du fuchsia d'un malus posé (docs/MISE_EN_SCENE.md, M37)
  poison: 'text-lime-300 [-webkit-text-stroke:3px_#1a2e05]',
  arcane: 'text-violet-300 [-webkit-text-stroke:3px_#2e1065]',
  // Le feu (retour du 2026-10-30, R43) : jaune vif cerclé de rouge, loin de l'or pâle d'un bonus (cerclé de brun) et de
  // l'ambre du critique
  fire: 'text-yellow-300 [-webkit-text-stroke:3px_#b91c1c]',
  // Jetons du design system (index.css) : l'ivoire du texte cerclé de bronze, le cyan de l'esquive, l'acier de l'armure
  light: 'text-ink-1 [-webkit-text-stroke:3px_var(--gold-700)]',
  storm: 'text-dodge [-webkit-text-stroke:3px_#083344]',
  air: 'text-armor [-webkit-text-stroke:3px_#1e293b]',
}

/**
 * Le gros chiffre d'un coup qui touche (coup de base, coup de compétence), dans la teinte de sa source ; un critique ou
 * un coup lourd garde son or (`Fighter.tsx`).
 */
export const HIT_TONE_CLASS: Record<DamageTone, string> = {
  hit: 'text-white [-webkit-text-stroke:4px_#0c0a09]',
  damage: 'text-red-500 [-webkit-text-stroke:4px_#450a0a]',
  poison: 'text-lime-300 [-webkit-text-stroke:4px_#1a2e05]',
  arcane: 'text-violet-300 [-webkit-text-stroke:4px_#2e1065]',
  fire: 'text-yellow-300 [-webkit-text-stroke:4px_#b91c1c]',
  light: 'text-ink-1 [-webkit-text-stroke:4px_var(--gold-700)]',
  storm: 'text-dodge [-webkit-text-stroke:4px_#083344]',
  air: 'text-armor [-webkit-text-stroke:4px_#1e293b]',
}

// « PV » est une abréviation : invariable
const plural = (n: number, word: string) => `${n} ${word}${n > 1 && word !== 'PV' ? 's' : ''}`

const statusLabel = (id: StatusId) => STATUSES[id].name

/** « de Brokk », « d'Ervald » : élision devant une voyelle ou un h muet. */
export const of = (name: string) => (/^[aeiouyhàâéèêëîïôûü]/i.test(name) ? `d'${name}` : `de ${name}`)

/** Pose sans effet : le statut était déjà à son plafond (une aura non cumulable reposée), sans intensité gagnée. */
export const atCap = (e: AppliedEffect) =>
  e.type === 'applyStatus' && e.result.kind === 'applied' && e.result.stacks === 0 && !e.result.cancelled && !e.result.raised

/**
 * Texte flottant au-dessus d'un combattant. `rises` : son sens, qui dit gain ou perte de la chose nommée, pas
 * bon ou mauvais (2026-10-21) : un statut gagné (bonus ou malus) ou des PV regagnés montent ; des PV perdus ou un
 * statut perdu (dissipé, purifié) tombent ; un fait neutre (résisté, au maximum) monte. La couleur dit la polarité.
 */
export interface Badge {
  text: string
  tone: Tone
  rises: boolean
  /** Barré : ce qui aurait dû arriver et n'arrive pas (le soin empêché par l'Hémorragie, lot 3) */
  struck?: true
}

/** Le bonus que le lanceur se posait est parti chez l'adversaire (Sceau de vol, lot 3) : le texte du volé, qui le perd */
export const STOLEN_BADGE: Badge = { text: 'Volé', tone: 'negative', rises: false }

/**
 * La teinte d'un statut à l'écran : celle de ses dégâts s'il fait perdre des PV (`DAMAGE_SOURCES`, `status` : jaune de
 * la Brûlure, vert du Poison, rouge du Saignement), sinon sa polarité. Son nom posé et ses charges gagnées la prennent,
 * comme son « −N » (retour du 2026-10-30, R43 : une couleur par statut).
 */
export const statusTone = (id: StatusId): Tone => Object.values(DAMAGE_SOURCES).find((s) => s.status === id)?.tone ?? STATUSES[id].polarity

/** Badge flottant au-dessus de la cible d'un effet. */
export function effectBadge(e: AppliedEffect): Badge {
  switch (e.type) {
    case 'heal':
      // Un soin empêché (l'Hémorragie, `wanted`) : son « 0 » barré (lot 3)
      if (e.wanted !== undefined && e.amount === 0) return { text: '0', tone: 'heal', rises: true, struck: true }
      return { text: `+${e.amount} PV`, tone: 'heal', rises: true }
    case 'damage':
      return { text: `-${e.amount}`, tone: DAMAGE_SOURCES[e.source].tone, rises: false }
    case 'applyStatus': {
      const def = STATUSES[e.status]
      if (e.result.kind === 'blocked') return { text: `${def.name} résisté`, tone: 'neutral', rises: true }
      if (e.result.kind === 'cancelled') return { text: `${def.name} neutralisé`, tone: 'neutral', rises: true }
      if (atCap(e)) return { text: `${def.name} au maximum`, tone: 'neutral', rises: true }
      // Gagné, même un malus : il monte (Peur posée sur Naraxes), dans la teinte du statut
      return { text: def.name, tone: statusTone(e.status), rises: true }
    }
    case 'cleanse':
      // Bonus retiré par l'adversaire : « Aura de puissance dissipée » ; malus retirés : « Purifié » ; rien à retirer :
      // « Rien à purifier » (2026-10-21 : « Purifié » laissait croire qu'un malus était parti). Un statut perdu tombe.
      if (!e.removed.length) return { text: 'Rien à purifier', tone: 'neutral', rises: true }
      // Un vol (Larcin) : le bonus part entier chez le voleur, « Volé » sur le volé à son arrivée ; ici, le bonus qui s'en va
      if (e.stolen) return { text: e.removed.map((id) => `${STATUSES[id].name} volé`).join(', '), tone: 'negative', rises: false }
      if (STATUSES[e.removed[0]].polarity === 'positive')
        return {
          text: `${e.removed.map((id) => STATUSES[id].name).join(', ')} dissipé${e.removed.length > 1 ? 's' : ''}`,
          tone: 'negative',
          rises: false,
        }
      return { text: 'Purifié', tone: 'neutral', rises: false }
    case 'rebound':
      // Les jauges relâchées (C1) : leurs coups suivent, chacun avec son chiffre ; l'écran ne montre pas ce badge
      return { text: plural(e.parts.length, 'renvoi'), tone: 'neutral', rises: false }
  }
}

/** Effet raconté dans le journal : « Gorak regagne 5 PV ». */
export function effectText(e: AppliedEffect, fighters: Pair<Character>): string {
  const name = fighters[e.target].name
  switch (e.type) {
    case 'heal':
      if (e.wanted !== undefined && e.amount === 0) return `${name} ne regagne pas les ${plural(e.wanted, 'PV')} : soin empêché`
      return e.amount > 0 ? `${name} regagne ${plural(e.amount, 'PV')}` : `${name} est déjà au maximum de ses PV`
    case 'damage':
      // Contre l'armure (Clous de pavois) : ce que l'armure a retenu
      if (e.armored) return `${name} perd ${plural(e.amount, 'PV')}${e.armorAbsorbed ? ` (armure −${e.armorAbsorbed})` : ''}`
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
      // Un bonus volé (Sceau de vol, Larcin) : le voleur le prend entier, à la place du volé
      const gets = `${name} ${e.stolenBy ? 'vole' : 'reçoit'} ${statusLabel(e.status)} (${lowerFirst(def.describe(status))})`
      return cancel ? `${cancel}, puis ${gets}` : gets
    }
    case 'cleanse':
      if (!e.removed.length) return `${name} n'avait rien à purifier`
      // Un malus retiré libère ; un bonus retiré (Purification de l'adversaire) est perdu, toutes charges comprises ; un vol
      // (Larcin) aussi, et le voleur le reçoit
      if (e.stolen) return `${name} se fait voler ${e.removed.map(statusLabel).join(', ')}`
      return STATUSES[e.removed[0]].polarity === 'negative'
        ? `${name} se libère de ${e.removed.map(statusLabel).join(', ')}`
        : `${name} perd ${e.removed.map(statusLabel).join(', ')}, toutes charges comprises`
    case 'rebound':
      return `${plural(e.parts.length, 'renvoi')} sur ${name} (${e.parts.join(' · ')})`
  }
}

const modifierText = (m: Attack['modifiers'][number]) => `${lowerFirst(statusLabel(m.status))} ${m.delta > 0 ? '+' : '−'}${Math.abs(m.delta)}`

const armorDetail = (attack: Attack) => {
  const parts = [
    // Reliques de coup (Fer à quatre clous), puis face dorée (forge du dé), avant le critique
    ...(attack.relicBonus ?? []).map((b) => `${lowerFirst(b.name)} +${b.amount}`),
    attack.gild && `face dorée +${attack.gild}`,
    // Auras et statuts qui ont changé la force du coup (puissance +2, intimidation −2…)
    ...attack.modifiers.filter((m) => !m.final).map(modifierText),
    attack.armorAbsorbed > 0 && `armure −${attack.armorAbsorbed}`,
    ...attack.shields.map((s) => `${lowerFirst(statusLabel(s.status))} −${s.absorbed}`),
    // Dégâts finaux (Fausse note), après l'armure et les boucliers
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
  if (attack.replaced) {
    return {
      kind: 'attack',
      side: attack.attacker,
      text: `Tour ${turn} · ${att.name} fait ${attack.roll} : pas de coup, sa compétence le remplace.`,
    }
  }
  // Jet tombé à vide (Malchance, lot 3) : ni compétence ni coup
  if (attack.jinxed)
    return { kind: 'attack', side: attack.attacker, text: `Tour ${turn} · Le jet de ${attack.roll} ${of(att.name)} tombe à vide : ni compétence ni coup.` }
  // Le coup de base : sa valeur tirée, multipliée par Crescendo ou Soliste. Un coup brut est un dé de frappe (D5, retour du
  // 30 octobre) : le journal le nomme, avec sa face
  const value = attack.multiplier ? `${attack.value} ×${attack.multiplier}` : String(attack.value)
  const head = attack.plain ? `Tour ${turn} · Dé de frappe (${attack.roll}) ·` : `Tour ${turn} ·`
  // Critique raté d'un aveuglé (lot 3) : le critique tiré, ou assuré, rate
  if (attack.blindedBy)
    return {
      kind: 'dodge',
      side: attack.attacker,
      text: `${head} ${att.name} ${STATUSES[attack.blindedBy].bears ?? `subit ${statusLabel(attack.blindedBy)}`} : son ${attack.critForced ? 'critique assuré' : 'critique'} (${value}) rate ${def.name} !`,
    }
  if (attack.dodged) {
    return {
      kind: 'dodge',
      side: defender,
      text: `${head} ${att.name} frappe (${value}) mais ${def.name} esquive${attack.dodgeForced ? ' à coup sûr' : ''}${attack.critForced ? ' : le critique assuré est perdu' : ''} !`,
    }
  }
  if (attack.crit) {
    return {
      kind: 'crit',
      side: attack.attacker,
      text: `${head} ${attack.critForced ? 'CRITIQUE ASSURÉ' : 'CRITIQUE'} ! ${att.name} frappe ${value} ${multiplier(attack.critMultiplier)} et inflige ${attack.damage} dégâts à ${def.name}${armorDetail(attack)} (${defenderHp} PV).`,
    }
  }
  const flavor = attack.multiplier ? ` Coup ×${attack.multiplier} !` : attack.value === att.stats.attackMax && att.stats.attackMax > att.stats.attackMin ? ' Coup maximal !' : ''
  return {
    kind: 'attack',
    side: attack.attacker,
    text: `${head} ${att.name} inflige ${plural(attack.damage, 'dégât')} à ${def.name}${armorDetail(attack)} (${defenderHp} PV).${flavor}`,
  }
}

export function eventLog(event: TriggeredEvent, fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  const effects = event.effects.map((e) => effectText(e, fighters)).join(', ')
  // L'aura de départ posée d'office (2026-10-27 ; au 3e tour, ou au 2e tour après sa dissipation : D8 du 2026-10-30) : le
  // journal dit le rendez-vous avant la compétence
  const due = event.trigger === 'auraDue' ? `Début du tour ${of(fighters[event.side].name)} : son aura s'éveille. ` : ''
  return { kind: 'event', side: event.side, text: effects ? `${due}Compétence · ${event.name} ! ${effects}.` : `${due}Compétence · ${event.name} !` }
}

/** Une relique se déclenche : « Relique · Osselet fendu ! Brokk perd 3 PV. » */
export function relicLog(beat: Extract<Beat, { type: 'relic' }>, fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  const effects = beat.effects.map((e) => effectText(e, fighters)).join(', ')
  return { kind: 'relic', side: beat.side, text: effects ? `Relique · ${beat.name} ! ${effects}.` : `Relique · ${beat.name} !` }
}

export function statusTickLog(
  side: Side,
  status: StatusId,
  effects: AppliedEffect[],
  fighters: Pair<Character>,
): Omit<LogEntry, 'id'> {
  // Un statut qui agit sur l'adversaire dit à qui il appartient : « Aura glaciale d'Ervald · … »
  const owner = effects.some((e) => e.target !== side) ? ` ${of(fighters[side].name)}` : ''
  return {
    kind: 'status',
    side,
    text: `${statusLabel(status)}${owner} · ${effects.map((e) => effectText(e, fighters)).join(', ')}.`,
  }
}

/**
 * Réaction d'un statut (ex. Épines). Un renvoi (C1 : Riposte, jauge de Rétribution, `strike`) se raconte comme un coup :
 * esquivé, critique, ce que l'armure et les boucliers ont retenu
 */
export function statusReactionLog(
  side: Side,
  status: StatusId,
  effects: AppliedEffect[],
  fighters: Pair<Character>,
  strike?: Attack,
): Omit<LogEntry, 'id'> {
  const head = `${statusLabel(status)} ${of(fighters[side].name)}`
  if (!strike) return { kind: 'status', side, text: `${head} · ${effects.map((e) => effectText(e, fighters)).join(', ')}.` }
  const target = fighters[side === 0 ? 1 : 0].name
  if (strike.blindedBy) return { kind: 'dodge', side, text: `${head} · son ${strike.critForced ? 'critique assuré' : 'critique'} (${strike.value}) rate ${target} !` }
  if (strike.dodged)
    return {
      kind: 'dodge',
      side,
      text: `${head} · ${target} esquive le renvoi (${strike.value})${strike.dodgeForced ? ' à coup sûr' : ''}${strike.critForced ? ' : le critique assuré est perdu' : ''} !`,
    }
  const crit = strike.crit ? `${strike.critForced ? 'CRITIQUE ASSURÉ' : 'CRITIQUE'} ! ` : ''
  const value = strike.crit ? `${strike.value} ${multiplier(strike.critMultiplier)}` : String(strike.value)
  return { kind: strike.crit ? 'crit' : 'status', side, text: `${head} · ${crit}renvoi de ${value} : ${target} perd ${plural(strike.damage, 'PV')}${armorDetail(strike)}.` }
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

/** Coups multiples (Furie des vents, Duo : des coups tout de suite ; Coup de chance : des dés de frappe après le dé de compétence) */
export function flurryLog(turn: number, side: Side, status: StatusId, strikes: number, fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  const what = STATUSES[status].instantStrikes ? `frappe ${strikes} fois !` : `lance ${plural(strikes - 1, 'dé')} de frappe de plus !`
  return { kind: 'status', side, text: `Tour ${turn} · ${statusLabel(status)} · ${fighters[side].name} ${what}` }
}

/** Un jet dont la face porte une compétence qui se greffe : le dé, avant la compétence et le coup de base */
export function rollLog(turn: number, side: Side, roll: number, fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  return { kind: 'attack', side, text: `Tour ${turn} · ${fighters[side].name} fait ${roll}.` }
}

/** Un Doublé (D5, retour du 30 octobre) : le dé de frappe fait la face du dé de compétence, une face à compétence ; elle repart */
export function doubletLog(turn: number, side: Side, roll: number, fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  return { kind: 'attack', side, text: `Tour ${turn} · Doublé ! Le dé de frappe de ${fighters[side].name} fait ${roll}, comme son dé de compétence : la compétence repart.` }
}

/** Pile ou face */
export function coinLog(turn: number, side: Side, heads: boolean, effects: AppliedEffect[], fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  const name = fighters[side].name
  return {
    kind: 'status',
    side,
    text: heads
      ? `Tour ${turn} · Pile ! Ce coup ×${COIN_HEADS} : ${effects.map((e) => effectText(e, fighters)).join(', ')}.`
      : `Tour ${turn} · Face… ${name} ne gagne rien cette fois.`,
  }
}

/**
 * Usure d'une phase : « Poison sur Brokk : encore 2 tours. » puis « Brûlure se dissipe sur Brokk. » (2026-10-21 : une
 * seule étape `statusAge` pour les décomptes et les extinctions).
 */
export function statusAgeLog(side: Side, changes: DurationChange[], expired: StatusId[], fighters: Pair<Character>): Omit<LogEntry, 'id'> {
  const name = fighters[side].name
  const counted = changes.map((c) => `${statusLabel(c.status)} sur ${name} : encore ${plural(c.to, 'tour')}`).join(', ')
  const gone = expired.length ? `${expired.map(statusLabel).join(', ')} se dissipe${expired.length > 1 ? 'nt' : ''} sur ${name}` : ''
  return { kind: 'status', side, text: `${[counted, gone].filter(Boolean).join('. ')}.` }
}
