import type { Character } from './character'
import type { CharacterEvent, Effect } from './events'
import {
  FALSE_NOTE,
  isAura,
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
  | 'lostTurn'
  | 'breach'
  | 'vulnerable'
  | 'firefly'
  | 'spoiled'
  // Phase 8, lot 3 : les malus de famille manquants
  | 'guardBroken'
  | 'jinxed'
  | 'blinded'
  | 'noHealing'
  | 'bonusStolen'
  // Quatrième demande du 2026-10-27 (le contenu du soin) : la Dîme et la Flamme votive
  | 'tithed'
  | 'votive'
  // Refonte des auras (2026-10-28) : les compétences à charges sorties des auras, et les statuts des reliques qui en sortent
  | 'leeching'
  | 'toadSkin'
  | 'sentence'
  | 'faithShield'
  | 'grip'
  | 'overcharge'
  // Refonte des auras (tranche 3, 2026-10-28) : les fautes du Jugement
  | 'fault'

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
  // anneau), gardés dans le vocabulaire avec leur emblème ; la Puissance revient avec la Ferveur (Encens de l'abbaye)
  power: { name: 'Puissance', polarity: 'positive', summary: 'Ses coups font plus de dégâts.', counter: 'amount' },
  weakened: { name: 'Affaibli', polarity: 'negative', summary: 'Ses coups font moins de dégâts.', counter: 'amount' },
  shield: { name: 'Bouclier', polarity: 'positive', summary: "Absorbe des dégâts après l'armure, puis s'épuise.", counter: 'status' },
  // Une seule charge depuis B8 (2026-10-27) : rien à compter
  sureCrit: { name: 'Critique assuré', polarity: 'positive', summary: 'Sa prochaine frappe est critique.', counter: 'none' },
  critPower: { name: 'Critique renforcé', polarity: 'positive', summary: 'Ses critiques frappent plus fort (multiplicateur).', counter: 'amount' },
  sureDodge: { name: 'Esquive assurée', polarity: 'positive', summary: 'Il esquive à coup sûr le prochain coup reçu.', counter: 'status' },
  extraDie: { name: 'Dé en plus', polarity: 'positive', summary: 'Des jets de plus à sa prochaine action.', counter: 'status' },
  healing: { name: 'Soin', polarity: 'positive', summary: 'Il regagne des PV à chacun de ses tours.', counter: 'amount' },
  drain: { name: 'Drain', polarity: 'positive', summary: "Ses prochains coups qui touchent lui rendent les PV qu'ils retirent.", counter: 'status' },
  reflect: { name: 'Renvoi', polarity: 'positive', summary: 'Le prochain coup reçu lui revient : une part des dégâts renvoyée, ou un critique.', counter: 'status' },
  // Épines : sans source depuis la 0.118.1 (l'Aura d'épines se lit sur son anneau), gardé dans le vocabulaire avec son emblème
  thorns: { name: 'Épines', polarity: 'positive', summary: "Chaque coup reçu fait saigner l'attaquant.", counter: 'status' },
  immunity: { name: 'Immunité', polarity: 'positive', summary: 'Aucun malus ne peut lui être posé.', counter: 'status' },
  poison: { name: 'Poison', polarity: 'negative', summary: 'Il perd des PV au début de chacun de ses tours.', counter: 'status' },
  bleed: { name: 'Saignement', polarity: 'negative', summary: 'Il perd des PV à chaque coup qui le touche.', counter: 'status' },
  burn: { name: 'Brûlure', polarity: 'negative', summary: 'Il perd des PV à la fin de chacun de ses tours.', counter: 'status' },
  lostTurn: { name: 'Tour perdu', polarity: 'negative', summary: 'Il perd sa prochaine action.', counter: 'none' },
  breach: { name: 'Brèche', polarity: 'negative', summary: 'Son armure est réduite.', counter: 'status' },
  vulnerable: { name: 'Vulnérable', polarity: 'negative', summary: 'Il subit plus de dégâts à chaque coup.', counter: 'status' },
  firefly: { name: 'Luciole', polarity: 'negative', summary: 'Il ne peut plus esquiver et chaque coup reçu lui fait plus mal.', counter: 'status' },
  // Fausse note (audit du 2026-10-21) : un seul coup, après l'armure ; l'additionner à Affaibli (chaque coup, avant
  // l'armure) donnait un total qu'aucun coup ne subit
  spoiled: { name: 'Coup gâché', polarity: 'negative', summary: 'Son prochain coup qui touche fera moins de dégâts.', counter: 'amount' },
  // Phase 8, lot 3 : les malus de famille manquants (Garde, Fortune, Précision, Soin, Sceaux)
  guardBroken: { name: 'Garde brisée', polarity: 'negative', summary: 'Le prochain coup qu’il reçoit ×2 et brise son armure temporaire.', counter: 'status' },
  jinxed: { name: 'Malchance', polarity: 'negative', summary: 'Son prochain jet sur une compétence tombe à vide.', counter: 'status' },
  blinded: { name: 'Aveuglé', polarity: 'negative', summary: 'Ses critiques ratent.', counter: 'none' },
  noHealing: { name: 'Hémorragie', polarity: 'negative', summary: 'Il ne regagne plus de PV.', counter: 'none' },
  bonusStolen: { name: 'Sceau de vol', polarity: 'negative', summary: 'Son prochain bonus va à l’adversaire.', counter: 'status' },
  tithed: { name: 'Dîme', polarity: 'positive', summary: 'Ses prochains coups reçus lui rendent des PV, pris à l’attaquant.', counter: 'status' },
  votive: { name: 'Flamme votive', polarity: 'positive', summary: 'Ses prochains soins brûlent l’adversaire.', counter: 'status' },
  leeching: { name: 'Sangsue', polarity: 'positive', summary: 'Ses prochains coups qui touchent lui rendent des PV, selon le Saignement de l’adversaire.', counter: 'status' },
  toadSkin: { name: 'Peau de crapaud', polarity: 'positive', summary: 'Ses prochains coups reçus empoisonnent l’attaquant.', counter: 'status' },
  sentence: { name: 'Sentence', polarity: 'positive', summary: 'Ses prochains soins font perdre des PV à l’adversaire.', counter: 'status' },
  faithShield: { name: 'Bouclier de foi', polarity: 'positive', summary: 'Ses prochains soins lui donnent de l’armure temporaire.', counter: 'status' },
  grip: { name: 'Emprise', polarity: 'positive', summary: 'Ses coups font plus de dégâts par malus de l’adversaire.', counter: 'none' },
  overcharge: { name: 'Surtension', polarity: 'positive', summary: 'Chacun de ses éclairs fait plus de dégâts.', counter: 'none' },
  fault: { name: 'Faute', polarity: 'negative', summary: 'À sa troisième faute, il perd sa prochaine action.', counter: 'status' },
}

// Typographie française (passe compendium, 2026-10-25) : l'espace insécable devant « : ; ! ? % »
for (const def of Object.values(STATES)) def.summary = typeset(def.summary)

/**
 * Ce qu'un statut verse à un état de la zone de son porteur. L'effet d'une aura relayé chez l'adversaire (l'Aura
 * d'intimidation, « Affaibli ») est sorti avec elle (refonte des auras, 2026-10-28) : une aura se lit sur son anneau.
 */
export interface Relay {
  state: StateId
  /** Sa part du total (états à `amount`) */
  amount?: (s: Status) => number
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

const tray = (state: StateId, amount?: (s: Status) => number): StatusPlace => ({ place: 'tray', relays: [{ state, amount }] })
const aura = (): StatusPlace => ({ place: 'aura', relays: [] })

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
  ward: tray('immunity'),
  lifesteal: tray('drain'),
  evasion: tray('sureDodge'),
  // Ferveur (Encens de l'abbaye) : la Puissance du vocabulaire, son emblème compris, pour un seul coup
  momentum: tray('power', (s) => s.stacks),
  fear: tray('lostTurn'),
  luckyStrike: tray('extraDie'),
  riposte: tray('reflect'),
  firefly: tray('firefly'),
  bleed: tray('bleed'),
  whistling: tray('healing', () => WHISTLE_HEAL),
  falseNote: tray('spoiled', (s) => FALSE_NOTE * s.stacks),
  // Rancune (0.114.0) : comme la Riposte, elle attend le coup qui le touche ; elle se range sous le Renvoi
  grudge: tray('reflect'),

  // Une aura sur son porteur est une modification permanente, de l'identité : elle se lit sur son anneau (sa
  // valeur, `badge`), dans la barre de compétences, et ne se relaie pas dans la zone d'état (0.79.7)
  powerAura: aura(),
  holyAura: aura(),
  // Refonte des auras (2026-10-28) : l'Immunité de l'Ampoule bénite, ses tours comptés
  immunity: tray('immunity'),
  frostAura: aura(),
  decoctionAura: aura(),
  // Les compétences à charges (refonte des auras, 2026-10-28) : leurs charges se comptent dans la zone d'état
  sentence: tray('sentence'),
  // Phase 8, second lot : la Vindicte, une aura d'identité (la Ferveur qu'elle pose s'affiche d'elle-même) ; l'Embrasement
  // est un mécanisme (sa place découle de `mechanic`)
  vendetta: aura(),
  faithShield: tray('faithShield'),
  // Revue des compétences (I4) : la Plaie ouverte pose de vrais Saignements, qui s'affichent d'eux-mêmes
  openWound: aura(),
  // Revue X1 (0.118.1) : l'Aura d'épines, permanente et cumulable, se lit sur son anneau ; le Saignement qu'elle pose
  // s'affiche de lui-même chez l'attaquant
  thorns: aura(),
  // Phase 8, lot 3 : les malus de famille, chacun son état dans la zone de l'adversaire
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
  // Refonte des auras (2026-10-28) : la Mire de la Visée renforce son prochain critique (l'état sans source depuis la
  // 0.79.7 reprend du service) ; les fautes du Jugement se comptent chez l'attaquant ; Bastion, Jugement et Brasier, trois
  // auras d'identité, se lisent sur leur anneau
  aim: tray('critPower', (s) => s.stacks),
  fault: tray('fault'),
  bastion: aura(),
  judgement: aura(),
  brasier: aura(),
  stoneFist: tray('power', () => STONE_FIST),
  // Quatrième demande du 2026-10-27 (le contenu des maîtrises) : quatre auras d'identité, qui se lisent sur leur anneau ;
  // la Ferveur de l'Élan et le bonus pris par le Larcin s'affichent d'eux-mêmes
  onrush: aura(),
  // Refonte des auras (2026-10-28) : la Surtension et l'Emprise des reliques, pour tout le combat
  overcharge: tray('overcharge'),
  grip: tray('grip'),
  pilfer: aura(),
  // Quatrième demande du 2026-10-27 : la Dîme et la Flamme votive comptent leurs charges ; la Sangsue et la Peau de
  // crapaud aussi depuis la refonte des auras (2026-10-28)
  tithe: tray('tithed'),
  votiveFlame: tray('votive'),
  leech: tray('leeching'),
  toadSkin: tray('toadSkin'),
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
 * Les états de la zone d'un combattant, à partir de ses statuts. Un médaillon par état, dans l'ordre où leurs statuts
 * sont arrivés.
 */
export function trayStates(own: readonly Status[]): TrayState[] {
  const byId = new Map<StateId, StateSource[]>()
  for (const status of own)
    for (const relay of STATUS_PLACE[status.id].relays) {
      const source = { status, ...(relay.amount && { amount: relay.amount(status) }) }
      const list = byId.get(relay.state)
      if (list) list.push(source)
      else byId.set(relay.state, [source])
    }

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
