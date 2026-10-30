import type { Character } from './character'
import type { CharacterEvent, Effect } from './events'
import {
  FALSE_NOTE,
  GRIP,
  isAura,
  malusCount,
  STATUS_IDS,
  STATUSES,
  statusCounter,
  STONE_FIST,
  WHISTLE_HEAL,
  type Polarity,
  type Status,
  type StatusId,
} from './statuses'
import { typeset } from './typography'

/*
 * États affichés (0.79.0) : la présentation des statuts en combat, en deux niveaux de lecture.
 * - L'en-tête dit ce que le personnage SAIT FAIRE : ses compétences (sceaux), ses auras (anneau qui tourne
 *   quand elles sont actives), ses règles de forme. C'est son identité.
 * - La zone d'état, au-dessus de lui, dit ce qu'il SUBIT ou PORTE en ce moment : des états génériques, au
 *   vocabulaire partagé, qui regroupent les statuts de même effet (Aura de puissance et Force de l'ours font
 *   une seule « Puissance +7 »). Une aura qui agit sur un combattant y relaie son effet.
 * Rien ici ne touche aux règles : le moteur ne connaît que les statuts (`statuses.ts`). Voir docs/STATUTS.md,
 * « Deux niveaux de lecture ».
 */

/**
 * Le vocabulaire de la zone d'état (docs/EMBLEMES.md § 3, 2026-10-28) : un état par question du spectateur, un emblème
 * gris chacun (`state-*`). Un statut nouveau se range sous l'un d'eux ; un état nouveau est l'exception (règle 8).
 */
export type StateId =
  | 'power'
  | 'weakened'
  | 'shield'
  | 'guardBroken'
  | 'sureCrit'
  | 'critPower'
  | 'blinded'
  | 'sureDodge'
  | 'extraDie'
  | 'jinxed'
  | 'lostTurn'
  | 'healing'
  | 'noHealing'
  | 'drain'
  | 'reprisal'
  | 'immunity'
  | 'bonusStolen'
  | 'poison'
  | 'bleed'
  | 'burn'
  // Réserve (statuts sans porteur) : un état, pas encore d'emblème (EMBLEMES § 3)
  | 'vulnerable'
  | 'noDodge'

export interface StateDef {
  /** Nom générique, le même quel que soit le personnage qui l'a posé */
  name: string
  polarity: Polarity
  /** Ce que l'état veut dire, en une phrase (infobulle, compendium) */
  summary: string
  /**
   * Nombre du médaillon : `amount`, le total des effets regroupés, signé (+7, −9) ; `status`, le compteur du
   * statut lui-même (charges ou tours, `statusCounter`) ; `none`, aucun nombre.
   */
  counter: 'amount' | 'status' | 'none'
}

export const STATES: Record<StateId, StateDef> = {
  // Puissance : chacun de ses coups, et les éclairs de la Surtension (un statut de relique entre sous son concept, règle 9)
  power: { name: 'Puissance', polarity: 'positive', summary: 'Il fait plus de dégâts.', counter: 'amount' },
  weakened: { name: 'Affaibli', polarity: 'negative', summary: 'Ses coups font moins de dégâts.', counter: 'amount' },
  shield: { name: 'Bouclier', polarity: 'positive', summary: "Absorbe des dégâts après l'armure, puis s'épuise.", counter: 'status' },
  guardBroken: { name: 'Garde brisée', polarity: 'negative', summary: 'Le prochain coup qu’il reçoit ×2 et brise son armure temporaire.', counter: 'status' },
  sureCrit: { name: 'Critique assuré', polarity: 'positive', summary: 'Sa prochaine frappe est critique.', counter: 'status' },
  critPower: { name: 'Critique renforcé', polarity: 'positive', summary: 'Son prochain critique frappe plus fort (multiplicateur).', counter: 'amount' },
  blinded: { name: 'Aveuglé', polarity: 'negative', summary: 'Ses critiques ratent.', counter: 'none' },
  sureDodge: { name: 'Esquive assurée', polarity: 'positive', summary: 'Il esquive à coup sûr le prochain coup reçu.', counter: 'status' },
  extraDie: { name: 'Dé en plus', polarity: 'positive', summary: 'Des dés de frappe de plus à sa prochaine action ; sur un Doublé, la compétence repart.', counter: 'status' },
  jinxed: { name: 'Malchance', polarity: 'negative', summary: 'Son prochain jet sur une compétence tombe à vide.', counter: 'status' },
  lostTurn: { name: 'Tour perdu', polarity: 'negative', summary: 'Il perd sa prochaine action.', counter: 'none' },
  healing: { name: 'Soin', polarity: 'positive', summary: 'Il regagne des PV à chacun de ses tours.', counter: 'amount' },
  noHealing: { name: 'Hémorragie', polarity: 'negative', summary: 'Il ne regagne plus de PV.', counter: 'none' },
  drain: { name: 'Drain', polarity: 'positive', summary: 'Ses coups qui touchent lui rendent des PV.', counter: 'status' },
  reprisal: { name: 'Représailles', polarity: 'positive', summary: "Quand on le touche, ou quand il se soigne, l'adversaire en paie le prix.", counter: 'status' },
  immunity: { name: 'Immunité', polarity: 'positive', summary: 'Aucun malus ne peut lui être posé.', counter: 'status' },
  bonusStolen: { name: 'Sceau de vol', polarity: 'negative', summary: 'Son prochain bonus va à l’adversaire.', counter: 'status' },
  poison: { name: 'Poison', polarity: 'negative', summary: 'Il perd des PV à la fin de chacun de ses tours.', counter: 'status' },
  bleed: { name: 'Saignement', polarity: 'negative', summary: 'Il perd des PV à chaque coup qui le touche.', counter: 'status' },
  burn: { name: 'Brûlure', polarity: 'negative', summary: 'Il perd des PV à la fin de chacun de ses tours.', counter: 'status' },
  vulnerable: { name: 'Vulnérable', polarity: 'negative', summary: 'Il subit plus de dégâts à chaque coup.', counter: 'status' },
  noDodge: { name: 'Esquive empêchée', polarity: 'negative', summary: 'Il ne peut plus esquiver.', counter: 'status' },
}

/**
 * Le moment d'un statut, quand ce n'est pas celui de son état (EMBLEMES § 5) : une pastille sur le bord haut gauche du
 * médaillon. Liste fermée ; une pastille n'entre que si deux statuts au moins en ont besoin.
 */
export type TrayMoment = 'strike' | 'hurt' | 'heal'

export const TRAY_MOMENTS: Record<TrayMoment, { label: string }> = {
  strike: { label: 'Au coup porté' },
  hurt: { label: 'Au coup reçu' },
  heal: { label: 'Au soin' },
}

// Typographie française (passe compendium, 2026-10-25) : l'espace insécable devant « : ; ! ? % »
for (const def of Object.values(STATES)) def.summary = typeset(def.summary)

/**
 * Ce qu'un statut verse à un état de la zone de son porteur. L'effet d'une aura relayé chez l'adversaire (l'Aura
 * d'intimidation, « Affaibli ») est sorti avec elle (refonte des auras, 2026-10-28) : une aura se lit sur son anneau.
 */
export interface Relay {
  state: StateId
  /** Sa part du total (états à `amount`) ; `foe`, les statuts de l'adversaire (l'Emprise compte ses malus). Sans elle, aucune part chiffrée */
  amount?: (s: Status, foe: readonly Status[]) => number
  /** Son moment, quand ce n'est pas celui de l'état : sa pastille, et un médaillon à part */
  moment?: TrayMoment
}

/**
 * Où se montre un statut :
 * - `tray` : dans la zone d'état, sous l'état générique qu'il alimente ;
 * - `aura` : dans l'en-tête, en anneau qui tourne ; rien dans la zone d'état ;
 * - `form` et `skill` : un mécanisme (`StatusDef.mechanic`), lu dans sa définition : règle de forme (druide), dans
 *   l'en-tête ; mécanisme d'une compétence, montré sur son sceau (les jauges de Rétribution), ou par le seul éclat
 *   du sceau et le badge du coup (Pile ou face, Furie des vents).
 */
export interface StatusPlace {
  place: 'tray' | 'aura' | 'form' | 'skill'
  relays: readonly Relay[]
  /** Compté sur le sceau de la compétence qui le pose ou le relâche (les jauges de Rétribution, `fillsOnHurt`) */
  onSeal?: true
}

const tray = (state: StateId, amount?: Relay['amount'], moment?: TrayMoment): StatusPlace => ({ place: 'tray', relays: [{ state, amount, moment }] })
const aura = (): StatusPlace => ({ place: 'aura', relays: [] })

/** Place des statuts qui ne sont pas des mécanismes (bonus et malus) ; celle d'un mécanisme découle de `mechanic`. */
const DISPLAYED: Partial<Record<StatusId, StatusPlace>> = {
  guaranteedCrit: tray('sureCrit'),
  bonusArmor: tray('shield'),
  poison: tray('poison'),
  regeneration: tray('healing', (s) => s.stacks),
  weakened: tray('weakened', (s) => s.stacks),
  exposed: tray('vulnerable'),
  burn: tray('burn'),
  vulnerable: tray('vulnerable'),
  stunned: tray('lostTurn'),
  ward: tray('immunity'),
  lifesteal: tray('drain'),
  evasion: tray('sureDodge'),
  // Ferveur : la Puissance, sur son prochain coup qui touche (pastille « coup porté », EMBLEMES § 3)
  momentum: tray('power', (s) => s.stacks, 'strike'),
  fear: tray('lostTurn'),
  luckyStrike: tray('extraDie'),
  // Représailles (EMBLEMES règle 2) : un effet qui frappe l'adversaire quand on touche le porteur
  riposte: tray('reprisal'),
  firefly: tray('noDodge'),
  bleed: tray('bleed'),
  whistling: tray('healing', () => WHISTLE_HEAL),
  // Fausse note : Affaibli, sur son prochain coup qui touche (après l'armure : un médaillon à part, règle 6)
  falseNote: tray('weakened', (s) => FALSE_NOTE * s.stacks, 'strike'),
  // Rancune : le résultat profite au porteur (règle 2), un critique assuré à chaque coup reçu
  grudge: tray('sureCrit', undefined, 'hurt'),

  // Une aura sur son porteur est une modification permanente, de l'identité : elle se lit sur son anneau (sa
  // valeur, `badge`), dans la barre de compétences, et ne se relaie pas dans la zone d'état (0.79.7)
  powerAura: aura(),
  holyAura: aura(),
  // Refonte des auras (2026-10-28) : l'Immunité de l'Ampoule bénite, ses tours comptés
  immunity: tray('immunity'),
  frostAura: aura(),
  decoctionAura: aura(),
  // Les compétences à charges (refonte des auras, 2026-10-28) : leurs charges se comptent dans la zone d'état ; la
  // Sentence, une Représaille au soin
  sentence: tray('reprisal', undefined, 'heal'),
  // Phase 8, second lot : la Vindicte, une aura d'identité (la Ferveur qu'elle pose s'affiche d'elle-même) ; l'Embrasement
  // est un mécanisme (sa place découle de `mechanic`)
  vendetta: aura(),
  faithShield: tray('shield', undefined, 'heal'),
  // Revue des compétences (I4) : la Plaie ouverte pose de vrais Saignements, qui s'affichent d'eux-mêmes
  openWound: aura(),
  // Revue X1 (0.118.1) : l'Aura d'épines, permanente et cumulable, se lit sur son anneau ; le Saignement qu'elle pose
  // s'affiche de lui-même chez l'attaquant
  thorns: aura(),
  // Phase 8, lot 3 : les malus de famille, chacun la négation de son axe (EMBLEMES § 4)
  guardBreak: tray('guardBroken'),
  jinx: tray('jinxed'),
  blinded: tray('blinded'),
  hemorrhage: tray('noHealing'),
  sealTheft: tray('bonusStolen'),
  // Phase 8, lot 3 : trois auras d'identité. La Feinte se lit sur son anneau (son esquive) ; les autres frappent en dégâts
  // directs (Ciel d'orage) ou posent des coups, un mécanisme (leur place découle de `mechanic`)
  feint: aura(),
  stormSky: aura(),
  bloodFrenzy: aura(),
  // Les Maîtrises, vague 2 (2026-10-27) : le Dé pipé devient une aura (sa chance de pile se lit sur son anneau) ; cinq auras
  // d'identité, qui posent de vrais statuts (Coup de chance, Peur, Ferveur) ou frappent et soignent d'elles-mêmes ; le Poing
  // de pierre, la Puissance du vocabulaire tant que l'armure tient
  loadedDie: aura(),
  luckyStreak: aura(),
  dread: aura(),
  rancor: aura(),
  ballad: aura(),
  // Refonte des auras (2026-10-28) : la Mire de la Visée renforce son prochain critique ; les fautes du Jugement mènent
  // au Tour perdu (« 2/3 », règle 6) ; Bastion, Jugement et Brasier, trois auras d'identité, se lisent sur leur anneau
  aim: tray('critPower', (s) => s.stacks),
  fault: tray('lostTurn', undefined, 'strike'),
  bastion: aura(),
  judgement: aura(),
  brasier: aura(),
  stoneFist: tray('power', () => STONE_FIST),
  // Quatrième demande du 2026-10-27 (le contenu des maîtrises) : quatre auras d'identité, qui se lisent sur leur anneau ;
  // la Ferveur de l'Élan et le bonus pris par le Larcin s'affichent d'eux-mêmes
  onrush: aura(),
  // Refonte des auras (2026-10-28) : la Surtension et l'Emprise des reliques, sous la Puissance (règle 9). L'Emprise
  // compte les malus de l'adversaire ; la Surtension ne chiffre rien : ses éclairs ne sont pas des coups (règle 6)
  overcharge: tray('power'),
  grip: tray('power', (_s, foe) => GRIP * malusCount(foe)),
  pilfer: aura(),
  // Quatrième demande du 2026-10-27 (le contenu du soin) : la Dîme, un Drain au coup reçu ; la Flamme votive, une
  // Représaille au soin ; la Sangsue, un Drain ; la Peau de crapaud, une Représaille
  tithe: tray('drain', undefined, 'hurt'),
  votiveFlame: tray('reprisal', undefined, 'heal'),
  leech: tray('drain'),
  harvest: tray('drain'),
  toadSkin: tray('reprisal'),
}

/** Où se montre chaque statut : un mécanisme d'après `StatusDef.mechanic` (une seule source), les autres d'après `DISPLAYED`. */
export const STATUS_PLACE = Object.fromEntries(
  STATUS_IDS.map((id): [StatusId, StatusPlace] => {
    const { mechanic, fillsOnHurt } = STATUSES[id]
    return [id, mechanic ? { place: mechanic, relays: [], ...(fillsOnHurt && { onSeal: true as const }) } : DISPLAYED[id]!]
  }),
) as Record<StatusId, StatusPlace>

/** Une part d'un état affiché : le statut qui la verse. */
export interface StateSource {
  status: Status
  amount?: number
}

/** Un médaillon de la zone d'état : un état générique et son moment, son nombre, et ce qui le compose. */
export interface TrayState {
  /** Sa clé : l'état et son moment (deux moments, deux médaillons) */
  key: string
  id: StateId
  /** Sa pastille (EMBLEMES § 5) */
  moment?: TrayMoment
  /** Nombre affiché (absent : aucun nombre) */
  value?: number
  /** Un seuil (la Faute) : le nombre se lit « value/of » */
  of?: number
  /** `turns` : le nombre est une durée (icône de sablier) ; `amount` : un total signé */
  unit?: 'stacks' | 'turns' | 'amount'
  sources: StateSource[]
}

/**
 * Les états de la zone d'un combattant, à partir de ses statuts : un médaillon par état et par moment, dans l'ordre où
 * leurs statuts sont arrivés. Le nombre suit EMBLEMES règle 6 : total des parts chiffrées ; un statut seul, son
 * compteur ; plusieurs, le plus grand nombre de charges (les prochains déclenchements qui paient encore) ; un seuil,
 * sa progression. `foe` : les statuts de l'adversaire (l'Emprise compte ses malus).
 */
export function trayStates(own: readonly Status[], foe: readonly Status[] = []): TrayState[] {
  const byKey = new Map<string, TrayState>()
  for (const status of own)
    for (const relay of STATUS_PLACE[status.id].relays) {
      const key = relay.moment ? `${relay.state}:${relay.moment}` : relay.state
      const source = { status, ...(relay.amount && { amount: relay.amount(status, foe) }) }
      const found = byKey.get(key)
      if (found) found.sources.push(source)
      else byKey.set(key, { key, id: relay.state, ...(relay.moment && { moment: relay.moment }), sources: [source] })
    }

  return [...byKey.values()].map((state): TrayState => {
    const { sources } = state
    const threshold = sources.find((s) => STATUSES[s.status.id].threshold)
    if (threshold) return { ...state, value: threshold.status.stacks, of: STATUSES[threshold.status.id].threshold!.at, unit: 'stacks' }
    const def = STATES[state.id]
    if (def.counter === 'none') return state
    if (def.counter === 'amount') {
      const total = sources.reduce((t, s) => t + (s.amount ?? 0), 0)
      return total > 0 ? { ...state, value: total, unit: 'amount' } : state
    }
    // Un nombre qui ne peut valoir que 1 ne s'affiche pas (règle 6) : une seule charge au plus, sans durée
    if (sources.length === 1) {
      const counter = statusCounter(sources[0].status)
      if (!counter || (counter.unit === 'stacks' && STATUSES[sources[0].status.id].maxStacks === 1)) return state
      return { ...state, value: counter.value, unit: counter.unit }
    }
    const counted = sources.filter((s) => STATUSES[s.status.id].maxStacks !== 1)
    return counted.length > 0 ? { ...state, value: Math.max(...counted.map((s) => s.status.stacks)), unit: 'stacks' } : state
  })
}

/** Texte du nombre d'un état : « +7 » ou « −9 » pour un total, « 2/3 » pour un seuil, le nombre seul sinon. */
export function stateValueText(state: Pick<TrayState, 'id' | 'value' | 'unit' | 'of'>): string | undefined {
  if (state.value === undefined) return undefined
  if (state.of !== undefined) return `${state.value}/${state.of}`
  if (state.unit !== 'amount') return String(state.value)
  return STATES[state.id].polarity === 'negative' ? `−${state.value}` : `+${state.value}`
}

/** Statuts posés par un effet (et par l'effet de repli d'une purge). */
const posedBy = (effects: readonly Effect[]): { status: StatusId; target: 'self' | 'opponent' }[] =>
  effects.flatMap((e) =>
    e.type === 'applyStatus'
      ? [{ status: e.status, target: e.target ?? 'self' }]
      : e.type === 'cleanse' && e.orElse
        ? posedBy([e.orElse])
        : [],
  )

/** Effets qu'un statut produit de lui-même (début ou fin de tour, réactions), sondés avec une charge. */
function statusEffects(id: StatusId): Effect[] {
  const def = STATUSES[id]
  const probe: Status = { id, stacks: 1 }
  return [def.onTurnStart?.(probe), def.onTurnEnd?.(probe), ...Object.values(def.reactions ?? {}).map((r) => r?.(probe))].flatMap(
    (e) => e ?? [],
  )
}

/**
 * D'où vient un statut porté par `bearer` : les compétences, reliques et statuts (auras) des deux combattants
 * qui peuvent le poser sur lui. « Œil de faucon (Elaria) », « Aura glaciale (Ervald) ». Lu dans les données.
 */
export function originsOf(id: StatusId, bearer: Character, opponent: Character): string[] {
  const found: string[] = []
  for (const [who, target] of [
    [bearer, 'self'],
    [opponent, 'opponent'],
  ] as const) {
    const label = (name: string) => `${name} (${who.name})`
    const reaches = (effects: readonly Effect[]) => posedBy(effects).some((p) => p.status === id && p.target === target)
    for (const e of who.events) if (reaches(e.effects)) found.push(label(e.name))
    for (const r of who.relics) if (reaches(r.effects ?? [])) found.push(label(r.name))
    for (const s of auraIdsOf(who)) if (reaches(statusEffects(s))) found.push(label(STATUSES[s].name))
  }
  return [...new Set(found)]
}

/**
 * Une compétence qui pose une aura sur son lanceur se montre dans l'anneau de cette aura, même si elle fait
 * autre chose au passage (l'Aura d'immunité purge d'abord ses malus) : l'infobulle de l'anneau dit le reste. Une
 * compétence qui pose aussi un autre statut garde son sceau (le Duo : son dé de plus a sa vie propre, 2026-10-25).
 */
export const auraOfSkill = (e: Pick<CharacterEvent, 'effects'>): StatusId | undefined => {
  const posed = posedBy(e.effects)
  if (posed.some((p) => !isAura(p.status))) return undefined
  return posed.find((p) => p.target === 'self' && isAura(p.status))?.status
}

/** Les auras qu'un personnage peut porter : posées par ses compétences (toutes formes) ou ses reliques. */
export function auraIdsOf(character: Character): StatusId[] {
  const ids = [
    ...character.events.flatMap((e) => posedBy(e.effects)),
    ...character.relics.flatMap((r) => posedBy(r.effects ?? [])),
  ].flatMap((p) => (p.target === 'self' && isAura(p.status) ? [p.status] : []))
  return [...new Set(ids)]
}

/** Le strict nécessaire d'un effet appliqué (`AppliedEffect`, combat.ts) pour viser une zone d'état. */
type AppliedLike = { type: string; target: 0 | 1; status?: StatusId; result?: { kind: string } }

/**
 * Où file le signal d'activation d'une compétence ou d'une aura (SignalLayer) : vers la zone d'état de chaque
 * combattant où un état apparaît ou grossit. Un statut de la zone vise son porteur ; une aura posée ou un mécanisme de
 * compétence ne vise rien. Un statut entièrement bloqué ou annulé ne laisse rien à voir : pas de signal. Undefined :
 * rien à envoyer.
 */
export function signalTargets(effects: readonly AppliedLike[]): { to: (0 | 1)[]; polarity: Polarity } | undefined {
  const to = new Set<0 | 1>()
  let polarity: Polarity | undefined
  for (const e of effects) {
    if (e.type !== 'applyStatus' || !e.status || e.result?.kind !== 'applied') continue
    const { relays } = STATUS_PLACE[e.status]
    if (relays.length === 0) continue
    to.add(e.target)
    polarity ??= STATES[relays[0].state].polarity
  }
  return polarity && to.size > 0 ? { to: [...to], polarity } : undefined
}

/**
 * Les états qu'une compétence fait apparaître, et chez qui (infobulle de son sceau : « quelle compétence pose
 * quoi »). Un statut de la zone donne son état ; une aura, les états qu'elle relaie et ceux des statuts qu'elle
 * pose d'elle-même (l'Aura glaciale : du Poison chez l'adversaire) ; un mécanisme de compétence, rien.
 */
export function statesPosedBy(effects: readonly Effect[]): { state: StateId; target: 'self' | 'opponent' }[] {
  const found = posedBy(effects).flatMap(({ status, target }) => {
    const place = STATUS_PLACE[status]
    const relayed = place.relays.map((r) => ({ state: r.state, target }))
    if (place.place === 'tray' || place.place === 'skill') return relayed
    const spread = posedBy(statusEffects(status)).flatMap((p) =>
      STATUS_PLACE[p.status].relays.map((r) => ({ state: r.state, target: p.target === 'self' ? target : target === 'self' ? ('opponent' as const) : ('self' as const) })),
    )
    return [...relayed, ...spread]
  })
  return found.filter((f, k) => found.findIndex((g) => g.state === f.state && g.target === f.target) === k)
}
