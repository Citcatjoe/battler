import type { Character } from './character'
import type { CharacterEvent, Effect } from './events'
import {
  FALSE_NOTE,
  isAura,
  STATUS_IDS,
  STATUSES,
  statusCounter,
  WHISTLE_HEAL,
  WILD_AURA_BONUS,
  type Polarity,
  type Status,
  type StatusId,
} from './statuses'

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

export type StateId =
  | 'power'
  | 'weakened'
  | 'shield'
  | 'sureCrit'
  | 'critPower'
  | 'sureDodge'
  | 'extraDie'
  | 'healing'
  | 'drain'
  | 'reflect'
  | 'thorns'
  | 'immunity'
  | 'poison'
  | 'bleed'
  | 'burn'
  | 'rot'
  | 'lostTurn'
  | 'breach'
  | 'vulnerable'
  | 'firefly'
  | 'spoiled'

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
  // Puissance et Critique renforcé : sans source depuis la 0.79.7 (les auras qui les donnaient se lisent sur leur
  // anneau) ; gardés dans le vocabulaire, avec leur emblème, pour une compétence ou une relique à venir
  power: { name: 'Puissance', polarity: 'positive', summary: 'Ses coups font plus de dégâts.', counter: 'amount' },
  weakened: { name: 'Affaibli', polarity: 'negative', summary: "Ses coups font moins de dégâts, avant l'armure.", counter: 'amount' },
  shield: { name: 'Bouclier', polarity: 'positive', summary: "Absorbe des dégâts après l'armure, puis s'épuise.", counter: 'status' },
  sureCrit: { name: 'Critique assuré', polarity: 'positive', summary: 'Son prochain coup qui touche est critique.', counter: 'status' },
  critPower: { name: 'Critique renforcé', polarity: 'positive', summary: 'Ses critiques frappent plus fort (multiplicateur).', counter: 'amount' },
  sureDodge: { name: 'Esquive assurée', polarity: 'positive', summary: 'Il esquive à coup sûr le prochain coup reçu.', counter: 'status' },
  extraDie: { name: 'Dé en plus', polarity: 'positive', summary: 'Il lance des dés de plus à sa prochaine action, chacun résolu comme un jet.', counter: 'status' },
  healing: { name: 'Soin', polarity: 'positive', summary: 'Il regagne des PV à chacun de ses tours.', counter: 'amount' },
  drain: { name: 'Drain', polarity: 'positive', summary: "Ses prochains coups qui touchent lui rendent les PV qu'ils retirent.", counter: 'status' },
  reflect: { name: 'Renvoi', polarity: 'positive', summary: 'Le prochain coup qui le touche renvoie une part des dégâts.', counter: 'status' },
  thorns: { name: 'Épines', polarity: 'positive', summary: "Chaque coup encaissé fait saigner l'attaquant.", counter: 'status' },
  immunity: { name: 'Immunité', polarity: 'positive', summary: 'Aucun malus ne peut plus lui être posé.', counter: 'none' },
  poison: { name: 'Poison', polarity: 'negative', summary: 'Il perd des PV au début de chacun de ses tours.', counter: 'status' },
  bleed: { name: 'Saignement', polarity: 'negative', summary: 'Il perd des PV à chaque coup qui le touche.', counter: 'status' },
  burn: { name: 'Brûlure', polarity: 'negative', summary: 'Il perd des PV à la fin de chacun de ses tours.', counter: 'status' },
  rot: { name: 'Pourriture', polarity: 'negative', summary: "Il perd des PV à chacun de ses tours, jusqu'à ce qu'on le purifie.", counter: 'status' },
  lostTurn: { name: 'Tour perdu', polarity: 'negative', summary: 'Il perd sa prochaine action.', counter: 'none' },
  breach: { name: 'Brèche', polarity: 'negative', summary: 'Son armure est réduite.', counter: 'status' },
  vulnerable: { name: 'Vulnérable', polarity: 'negative', summary: 'Il subit plus de dégâts à chaque coup.', counter: 'status' },
  firefly: { name: 'Luciole', polarity: 'negative', summary: 'Il ne peut plus esquiver et chaque coup reçu lui fait plus mal.', counter: 'status' },
  // Fausse note (audit du 2026-10-21) : un seul coup, après l'armure ; l'additionner à Affaibli (chaque coup, avant
  // l'armure) donnait un total qu'aucun coup ne subit
  spoiled: { name: 'Coup gâché', polarity: 'negative', summary: "Son prochain coup qui touche fera moins de dégâts, retirés après l'armure.", counter: 'amount' },
}

/** Ce qu'un statut verse à un état : sur son porteur (`self`) ou sur l'adversaire de son porteur (une aura qui agit sur lui). */
export interface Relay {
  state: StateId
  on: 'self' | 'opponent'
  /** Sa part du total (états à `amount`) */
  amount?: (s: Status) => number
  /** Son effet vu depuis la cible, quand il agit sur l'adversaire (le `describe` du statut parle de son porteur) */
  describe?: (s: Status) => string
}

/**
 * Où se montre un statut :
 * - `tray` : dans la zone d'état, sous l'état générique qu'il alimente ;
 * - `aura` : dans l'en-tête, en anneau qui tourne ; son effet est relayé dans la zone (`relays`) ;
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

const tray = (state: StateId, amount?: (s: Status) => number): StatusPlace => ({ place: 'tray', relays: [{ state, on: 'self', amount }] })
const aura = (...relays: Relay[]): StatusPlace => ({ place: 'aura', relays })

/** Place des statuts qui ne sont pas des mécanismes (bonus et malus) ; celle d'un mécanisme découle de `mechanic`. */
const DISPLAYED: Partial<Record<StatusId, StatusPlace>> = {
  guaranteedCrit: tray('sureCrit'),
  bonusArmor: tray('shield'),
  poison: tray('poison'),
  regeneration: tray('healing', (s) => s.stacks),
  weakened: tray('weakened', (s) => s.stacks),
  exposed: tray('breach'),
  burn: tray('burn'),
  vulnerable: tray('vulnerable'),
  stunned: tray('lostTurn'),
  thorns: tray('thorns'),
  ward: tray('immunity'),
  lifesteal: tray('drain'),
  evasion: tray('sureDodge'),
  fear: tray('lostTurn'),
  luckyStrike: tray('extraDie'),
  riposte: tray('reflect'),
  firefly: tray('firefly'),
  rot: tray('rot'),
  bleed: tray('bleed'),
  whistling: tray('healing', () => WHISTLE_HEAL),
  falseNote: tray('spoiled', (s) => FALSE_NOTE * s.stacks),

  // Une aura sur son porteur est une modification permanente, de l'identité : elle se lit sur son anneau (sa
  // valeur, `badge`), dans la barre de compétences, et ne se relaie pas dans la zone d'état (0.79.7)
  powerAura: aura(),
  wildAura: aura(),
  melodiousAura: aura(),
  precisionAura: aura(),
  holyAura: aura(),
  immunityAura: aura(),
  // Les coups de l'adversaire font moins mal au nain : c'est l'adversaire qui est affaibli, un malus comme un autre
  intimidationAura: aura({
    state: 'weakened',
    on: 'opponent',
    amount: (s) => 2 * s.stacks,
    describe: (s) => `Ses coups lui font ${2 * s.stacks} de moins, avant l'armure, pour le reste du combat`,
  }),
  // Ces trois-là posent de vrais statuts (Poison, Pourriture) : ils s'affichent d'eux-mêmes chez la cible
  frostAura: aura(),
  decoctionAura: aura(),
  rotAura: aura(),
}

/** Où se montre chaque statut : un mécanisme d'après `StatusDef.mechanic` (une seule source), les autres d'après `DISPLAYED`. */
export const STATUS_PLACE = Object.fromEntries(
  STATUS_IDS.map((id): [StatusId, StatusPlace] => {
    const { mechanic, fillsOnHurt } = STATUSES[id]
    return [id, mechanic ? { place: mechanic, relays: [], ...(fillsOnHurt && { onSeal: true as const }) } : DISPLAYED[id]!]
  }),
) as Record<StatusId, StatusPlace>

/** Une part d'un état affiché : le statut qui la verse, et à qui il appartient. */
export interface StateSource {
  status: Status
  /** `self` : statut du combattant lui-même ; `opponent` : aura de son adversaire qui agit sur lui */
  from: 'self' | 'opponent'
  amount?: number
  /** Effet de la part, quand il diffère du `describe` du statut (aura qui agit sur l'adversaire) */
  text?: string
}

/** Un médaillon de la zone d'état : un état générique, son nombre, et ce qui le compose. */
export interface TrayState {
  id: StateId
  /** Nombre affiché (absent : aucun nombre) */
  value?: number
  /** `turns` : le nombre est une durée (icône de sablier) ; `amount` : un total signé */
  unit?: 'stacks' | 'turns' | 'amount'
  sources: StateSource[]
}

/**
 * Les états de la zone d'un combattant, à partir de ses statuts et de ceux de son adversaire (ses auras qui
 * agissent sur lui). Un médaillon par état, dans l'ordre où leurs statuts sont arrivés.
 */
export function trayStates(own: readonly Status[], opponent: readonly Status[]): TrayState[] {
  const byId = new Map<StateId, StateSource[]>()
  const add = (state: StateId, source: StateSource) => {
    const list = byId.get(state)
    if (list) list.push(source)
    else byId.set(state, [source])
  }
  for (const [from, list, on] of [
    ['self', own, 'self'],
    ['opponent', opponent, 'opponent'],
  ] as const)
    for (const status of list)
      for (const relay of STATUS_PLACE[status.id].relays)
        if (relay.on === on) add(relay.state, {
          status,
          from,
          ...(relay.amount && { amount: relay.amount(status) }),
          ...(relay.describe && { text: relay.describe(status) }),
        })

  return [...byId].map(([id, sources]): TrayState => {
    const def = STATES[id]
    if (def.counter === 'none') return { id, sources }
    if (def.counter === 'amount') return { id, value: sources.reduce((t, s) => t + (s.amount ?? 0), 0), unit: 'amount', sources }
    // Compteur du statut : celui du seul statut qui l'alimente, ou la somme des charges s'ils sont plusieurs
    if (sources.length === 1) {
      const counter = statusCounter(sources[0].status)
      return counter ? { id, value: counter.value, unit: counter.unit, sources } : { id, sources }
    }
    return { id, value: sources.reduce((t, s) => t + s.status.stacks, 0), unit: 'stacks', sources }
  })
}


/** Texte du nombre d'un état : « +7 » ou « −9 » pour un total, le nombre seul sinon. */
export function stateValueText(state: Pick<TrayState, 'id' | 'value' | 'unit'>): string | undefined {
  if (state.value === undefined) return undefined
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
 * autre chose au passage (l'Aura d'immunité purge d'abord ses malus) : l'infobulle de l'anneau dit le reste.
 */
export const auraOfSkill = (e: Pick<CharacterEvent, 'effects'>): StatusId | undefined =>
  posedBy(e.effects).find((p) => p.target === 'self' && isAura(p.status))?.status

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
 * combattant où un état apparaît ou grossit. Un statut de la zone vise son porteur ; une aura posée vise la
 * zone où elle relaie son effet (Aura d'intimidation : chez l'adversaire) ; un mécanisme de compétence ne vise
 * rien. Un statut entièrement bloqué ou annulé ne laisse rien à voir : pas de signal. Undefined : rien à envoyer.
 */
export function signalTargets(effects: readonly AppliedLike[]): { to: (0 | 1)[]; polarity: Polarity } | undefined {
  const to = new Set<0 | 1>()
  let polarity: Polarity | undefined
  for (const e of effects) {
    if (e.type !== 'applyStatus' || !e.status || e.result?.kind !== 'applied') continue
    const place = STATUS_PLACE[e.status]
    const sides = place.relays.map((r) => (r.on === 'self' ? e.target : ((1 - e.target) as 0 | 1)))
    for (const side of sides) to.add(side)
    if (sides.length > 0) polarity ??= place.relays.map((r) => STATES[r.state].polarity)[0]
  }
  return polarity && to.size > 0 ? { to: [...to], polarity } : undefined
}

/**
 * Les états qu'une compétence fait apparaître, et chez qui (infobulle de son sceau : « quelle compétence pose
 * quoi »). Un statut de la zone donne son état ; une aura, les états qu'elle relaie et ceux des statuts qu'elle
 * pose d'elle-même (l'Aura glaciale : du Poison chez l'adversaire) ; un mécanisme de compétence, rien.
 */
export function statesPosedBy(effects: readonly Effect[]): { state: StateId; target: 'self' | 'opponent' }[] {
  const flip = (t: 'self' | 'opponent') => (t === 'self' ? 'opponent' : 'self')
  const found = posedBy(effects).flatMap(({ status, target }) => {
    const place = STATUS_PLACE[status]
    const relayed = place.relays.map((r) => ({ state: r.state, target: r.on === 'self' ? target : flip(target) }))
    if (place.place === 'tray' || place.place === 'skill') return relayed
    const spread = posedBy(statusEffects(status)).flatMap((p) =>
      STATUS_PLACE[p.status].relays.map((r) => ({ state: r.state, target: p.target === 'self' ? target : flip(target) })),
    )
    return [...relayed, ...spread]
  })
  return found.filter((f, k) => found.findIndex((g) => g.state === f.state && g.target === f.target) === k)
}
