import type { CharacterStats } from './character'
import { describeCondition, describeEffect, ROLL_TRIGGERS, TRIGGERS, type Condition, type Effect, type Target, type Trigger } from './events'
import { pick, shuffle, type Rng } from './rng'
import { STATUSES, type StatusId } from './statuses'

/*
 * Reliques (docs/RELIQUES.md) : des objets gagnés en tournoi, un par victoire, qui changent le profil d'un
 * combattant. Une relique est une donnée, comme une compétence : ce registre dit ce qu'elle fait, le moteur
 * (`combat.ts`) l'applique, l'écran la montre. Quatre types, déduits de sa définition (`relicKind`) :
 *   - caractéristique : des stats de base en plus, à plat (armure, esquive, critique, PV…) ;
 *   - coup : un bonus à la valeur de ses coups, ou un effet sur un moment du coup (touche, esquive…) ;
 *   - tour : un effet au début de son n-ième tour (puis tous les `cooldown` tours) ;
 *   - seuil : un effet quand ses PV passent sous une part de ses PV max.
 * Une relique qui se déclenche peut avoir des charges (déclenchements par combat) et un temps de recharge.
 */

/** Moments d'un coup sur lesquels une relique de coup peut se déclencher (ceux du porteur). */
export const STRIKE_TRIGGERS = ['naturalOne', 'naturalTwo', 'naturalThree', 'naturalMax', 'hit', 'crit', 'missed', 'dodge', 'hurt'] as const satisfies readonly Trigger[]
export type StrikeTrigger = (typeof STRIKE_TRIGGERS)[number]

export type RelicTrigger =
  /** Un moment d'un coup, du point de vue du porteur (il touche, il esquive, il encaisse…) */
  | { type: 'strike'; on: StrikeTrigger }
  /** Au début de son `turn`-ième tour (le premier vaut 1) ; puis tous les `cooldown` tours s'il en a un */
  | { type: 'turn'; turn: number }
  /**
   * Quand les PV de `who` (le porteur par défaut, ou l'adversaire) passent sous `ratio` × ses PV max ; elle se
   * réarme s'ils remontent au-dessus. L'effet, lui, reste sur le porteur (règle 7 de docs/RELIQUES.md).
   */
  | { type: 'hpBelow'; ratio: number; who?: Target }

/** Stats de base ajoutées à plat par une relique (0,05 d'esquive = 5 points de pourcentage). */
export type RelicStats = Partial<CharacterStats>

export interface Relic {
  id: string
  name: string
  /** Une phrase d'ambiance ; la règle, elle, se rédige depuis les données (`describeRelic`) */
  flavor: string
  /** Caractéristique : stats ajoutées à plat */
  stats?: RelicStats
  /** Coup : ajouté à la valeur de chacun de ses coups qui touchent, avant le critique */
  rollBonus?: number
  /**
   * Le bonus de coup ne vaut que pour un coup dont le dé fait cette face (Fer à quatre clous : sur un 4). Relique de
   * face : un coup brut (Furie des vents) ne l'éveille pas, comme il n'ouvre aucune fenêtre du dé (2026-10-21).
   */
  onFace?: number
  /** Coup, tour ou seuil : le moment où elle se déclenche, et ses effets (du point de vue du porteur) */
  trigger?: RelicTrigger
  effects?: readonly Effect[]
  /** Conditions supplémentaires, toutes requises au moment du déclenchement */
  when?: readonly Condition[]
  /** Déclenchements par combat (défaut : illimité) */
  charges?: number
  /** Tours du porteur avant de pouvoir se déclencher de nouveau (défaut : aucun) */
  cooldown?: number
}

export type RelicKind = 'stat' | 'strike' | 'turn' | 'threshold'

/** Les quatre types, dans l'ordre de lecture : nom et ce qu'ils font, pour l'infobulle et le compendium. */
export const RELIC_KINDS: Record<RelicKind, { label: string; summary: string }> = {
  stat: { label: 'Caractéristique', summary: 'Ajoute des stats de base, à plat, pour tout le combat.' },
  strike: {
    label: 'Coup',
    summary: "Agit sur ses coups : la valeur d'un coup, ou un moment du coup (une face de ses dés, il touche, esquive, encaisse…). Les coups bruts (Furie des vents) n'éveillent aucune relique de face.",
  },
  turn: { label: 'Tour', summary: 'Se déclenche au début d’un de ses tours (une fois, ou à intervalle régulier), après ses statuts de début de tour et avant son action.' },
  threshold: { label: 'Seuil', summary: 'Se déclenche quand ses PV, ou ceux de l’adversaire, passent sous un seuil.' },
}

export function relicKind(r: Relic): RelicKind {
  if (r.stats) return 'stat'
  if (r.trigger?.type === 'turn') return 'turn'
  if (r.trigger?.type === 'hpBelow') return 'threshold'
  return 'strike'
}

/* ---------- Le registre ---------- */

/**
 * Première série (0.77.0), douze reliques, trois par type, reprises de la proposition de docs/RELIQUES.md § 7
 * (revue par l'utilisateur le 2026-10-20). Aucune ne pose de malus sur l'adversaire (règle 7). Impact visé :
 * 5 à 15 points de taux de victoire, 20 au plus (mesures dans docs/RELIQUES.md).
 */
export const RELICS: readonly Relic[] = [
  /* Caractéristique : de l'équipement qu'on porte */
  {
    id: 'lead-pommel',
    name: 'Contrepoids de plomb',
    flavor: 'Un pommeau de plomb cerclé de fer, limé à la main. Le bras frappe plus lourd, et moins souvent juste.',
    stats: { damageDie: 2 },
  },
  {
    id: 'felt-boots',
    name: 'Bottes de feutre',
    flavor: 'Des bottes souples aux talons usés, lacets défaits. On ne les entend pas venir, on ne les voit pas partir.',
    stats: { dodgeChance: 0.06 },
  },
  {
    id: 'mercenary-mail',
    name: 'Cotte du mercenaire',
    flavor: 'Une cotte de mailles roulée en boule, rapiécée d’anneaux plus clairs. Elle arrête les coups, et les pas.',
    stats: { armor: 2, dodgeChance: -0.08 },
  },
  /* Coup : des objets de hasard, qui portent la face qui les éveille */
  {
    id: 'split-knucklebone',
    name: 'Osselet fendu',
    flavor: 'Un osselet de mouton fendu en long, un seul point gravé sur sa face creuse. Même le pire jet mord.',
    trigger: { type: 'strike', on: 'naturalOne' },
    effects: [{ type: 'damage', amount: 3, target: 'opponent' }],
  },
  {
    id: 'hollow-die',
    name: 'Dé creux',
    flavor: 'Un dé d’os évidé, une couronne gravée à la place des points. Le jet parfait laisse le porteur en garde.',
    trigger: { type: 'strike', on: 'naturalMax' },
    cooldown: 3,
    effects: [{ type: 'applyStatus', status: 'evasion', stacks: 1 }],
  },
  {
    id: 'four-nail-shoe',
    name: 'Fer à quatre clous',
    flavor: 'Un fer à cheval étroit, quatre clous encore plantés. Le plus pauvre des vrais coups devient un bon coup.',
    rollBonus: 4,
    onFace: 4,
  },
  /* Tour : des objets qui marquent le temps */
  {
    id: 'opening-bell',
    name: 'Cloche d’ouverture',
    flavor: 'Une petite cloche de bronze, une seule encoche sur la robe. Elle ne sonne qu’une fois : au premier coup.',
    trigger: { type: 'turn', turn: 1 },
    charges: 1,
    effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }],
  },
  {
    id: 'hermit-beads',
    name: 'Chapelet de l’ermite',
    flavor: 'Des grains de bois, trois plus gros que les autres, un fermoir d’os. À chaque gros grain, une prière lave.',
    trigger: { type: 'turn', turn: 3 },
    cooldown: 3,
    effects: [{ type: 'cleanse', polarity: 'negative', count: 1, orElse: { type: 'heal', amount: 3 } }],
  },
  {
    id: 'siege-clepsydra',
    name: 'Clepsydre du siège',
    flavor: 'Un bol de bronze percé au fond, trois graduations, l’eau arrêtée à la deuxième. Plus le siège dure, plus il frappe fort.',
    trigger: { type: 'turn', turn: 6 },
    cooldown: 4,
    effects: [{ type: 'applyStatus', status: 'powerAura', stacks: 1 }],
  },
  /* Seuil : des contenants et talismans qui gardent quelque chose jusqu'à la rupture */
  {
    id: 'wolf-fang',
    name: 'Dent de loup',
    flavor: 'Une canine de loup en cage de fil de fer, fêlée aux quatre dixièmes. Acculé, il mord pour reprendre son sang.',
    trigger: { type: 'hpBelow', ratio: 0.4 },
    // 2026-10-21 (retour de l'utilisateur) : une seule fois par combat. Sans charge, elle se réarmait quand un
    // soin remontait le porteur au-dessus de 40 %, et repartait à la chute suivante.
    charges: 1,
    effects: [{ type: 'applyStatus', status: 'lifesteal', stacks: 2 }],
  },
  {
    id: 'bramble-collar',
    name: 'Collier de ronces',
    flavor: 'Une ronce séchée tressée sur un médaillon fendu. À mi-chemin de sa chute, il devient dangereux à frapper.',
    trigger: { type: 'hpBelow', ratio: 0.5 },
    charges: 1,
    effects: [{ type: 'applyStatus', status: 'thorns', stacks: 2 }],
  },
  {
    id: 'hunter-trophy',
    name: 'Trophée du chasseur',
    flavor: 'Une mâchoire de bête pendue à la ceinture, quatre encoches, la dernière à peine commencée. Elle sent la proie faiblir.',
    trigger: { type: 'hpBelow', ratio: 0.3, who: 'opponent' },
    charges: 1,
    effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }],
  },
]

export const RELIC_IDS = RELICS.map((r) => r.id)

export function getRelic(id: string): Relic {
  const r = RELICS.find((x) => x.id === id)
  if (!r) throw new Error(`Relique inconnue : ${id}`)
  return r
}

/** Stats de base d'un porteur une fois ses reliques ajoutées (à plat, dans l'ordre d'obtention). */
export function withRelicStats(base: CharacterStats, relics: readonly Relic[]): CharacterStats {
  const stats = { ...base }
  for (const r of relics) for (const [k, v] of Object.entries(r.stats ?? {}) as [keyof CharacterStats, number][]) stats[k] += v
  return stats
}

/* ---------- Rédaction ---------- */

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`)

/** Une stat ajoutée, en clair : « +1 armure », « +5 % d'esquive ». */
const STAT_TEXT: Record<keyof CharacterStats, (v: number) => string> = {
  maxHp: (v) => `${signed(v)} PV max`,
  damageDie: (v) => `${signed(v)} face${Math.abs(v) > 1 ? 's' : ''} à son dé de dégâts (sauf un dé fixé par une forme, comme le d3 de l'Incantation)`,
  armor: (v) => `${signed(v)} armure`,
  dodgeChance: (v) => `${signed(Math.round(v * 100))} % d'esquive${v < 0 ? ' (jamais sous 0 %)' : ''}`,
  critChance: (v) => `${signed(Math.round(v * 100))} % de critique`,
  critMultiplier: (v) => `${signed(v).replace('.', ',')} au multiplicateur de critique`,
}

export interface RelicDescription {
  /** Quand elle agit : « En permanence », « Au début de son 3e tour, puis tous les 3 tours »… */
  moment: string
  /** Ce qu'elle fait, une phrase par effet */
  text: string
  /** Charges, recharge, conditions */
  tags: string[]
  /** Statuts qu'elle pose, avec leur cible */
  posed: { status: StatusId; target: Target }[]
}

/** La seule rédaction d'une relique : infobulle, compendium, écran de récompense et rapports la lisent. */
export function describeRelic(r: Relic): RelicDescription {
  const t = r.trigger
  // Une face de dé : n'importe lequel de ses jets (le d6 de Coup de chance compris), pas un coup brut
  const face = t?.type === 'strike' && ROLL_TRIGGERS.includes(t.on)
  const moment = !t
    ? r.onFace !== undefined
      ? `Sur un ${r.onFace} à l'un de ses dés, si le coup touche`
      : r.rollBonus
        ? 'À chacun de ses coups qui touchent'
        : 'En permanence'
    : t.type === 'turn'
      ? `Au début de son ${t.turn === 1 ? '1er' : `${t.turn}e`} tour${r.charges === 1 ? '' : r.cooldown ? `, puis tous les ${r.cooldown} tours` : ', puis à chacun de ses tours'}`
      : t.type === 'hpBelow'
        ? `Quand ${t.who === 'opponent' ? 'les PV de l’adversaire passent' : 'ses PV passent'} sous ${Math.round(t.ratio * 100)} %`
        : face
          ? t.on === 'naturalMax'
            ? "Sur le jet maximal d'un de ses dés"
            : `Sur un ${ROLL_TRIGGERS.indexOf(t.on) + 1} à l'un de ses dés`
          : TRIGGERS[t.on].label
  const parts = [
    ...Object.entries(r.stats ?? {}).map(([k, v]) => STAT_TEXT[k as keyof CharacterStats](v)),
    r.rollBonus ? `${signed(r.rollBonus)} à la valeur ${r.onFace !== undefined ? 'de ce coup' : 'du coup'}, avant le critique` : '',
    ...(r.effects ?? []).map(describeEffect),
  ]
    .filter(Boolean)
    .map((p) => `${p.charAt(0).toUpperCase()}${p.slice(1)}.`)
  // Posée au passage d'un seuil, une réaction aux coups encaissés ne réagit pas au coup qui l'a fait franchir : elle
  // répond dès le coup suivant (règle 9)
  const reactsNext = t?.type === 'hpBelow' && (r.effects ?? []).some((e) => e.type === 'applyStatus' && STATUSES[e.status].reactions?.hurt)
  const tags = [
    ...(face ? ['que le coup touche ou non', 'pas sur les coups bruts (Furie des vents)'] : []),
    ...(r.onFace !== undefined ? ['pas sur les coups bruts (Furie des vents)'] : []),
    ...(t?.type === 'turn' ? ['après ses statuts de début de tour, avant son action'] : []),
    ...(reactsNext ? ['répond dès le coup suivant, pas à celui qui fait passer le seuil'] : []),
    ...(r.when ?? []).map((c) => `si ${describeCondition(c)}`),
    ...(r.charges !== undefined ? [r.charges === 1 ? 'une fois par combat' : `${r.charges} fois par combat`] : []),
    ...(r.cooldown && t?.type !== 'turn' ? [`recharge : ${r.cooldown} de ses tours`] : []),
  ]
  const posed = (r.effects ?? []).flatMap((e) => (e.type === 'applyStatus' ? [{ status: e.status, target: e.target ?? ('self' as const) }] : []))
  return { moment, text: parts.join(' '), tags, posed }
}

/** Une relique en une ligne (rapports, trace) : moment, effet, pastilles. */
export function relicLine(r: Relic) {
  const { moment, text, tags } = describeRelic(r)
  return [`${moment} : ${text}`, ...tags].join(' · ')
}

/* ---------- Validation ---------- */

/** Erreurs de définition du registre (vide si tout va bien). Vérifié par les tests. */
export function validateRelics(relics: readonly Relic[] = RELICS): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const r of relics) {
    const at = (msg: string) => errors.push(`${r.id} : ${msg}`)
    if (ids.has(r.id)) at('identifiant en double')
    ids.add(r.id)
    if (!/^[a-z]+(-[a-z]+)*$/.test(r.id)) at('identifiant en kebab-case attendu')
    if (!r.name || !r.flavor) at('nom et phrase d’ambiance requis')
    // Un seul type par relique : des stats, un bonus de coup, ou un déclencheur et ses effets
    const families = [r.stats !== undefined, r.rollBonus !== undefined, r.trigger !== undefined].filter(Boolean).length
    if (families !== 1) at('une relique a un seul type : stats, bonus de coup ou déclencheur')
    if (r.stats && Object.keys(r.stats).length === 0) at('stats vides')
    if (r.rollBonus !== undefined && (!Number.isInteger(r.rollBonus) || r.rollBonus === 0)) at('bonus de coup entier et non nul')
    if (r.onFace !== undefined && (r.rollBonus === undefined || !Number.isInteger(r.onFace) || r.onFace < 1)) at('face : un entier ≥ 1, avec un bonus de coup')
    if (r.trigger && !r.effects?.length) at('un déclencheur sans effet')
    if (!r.trigger && (r.effects || r.when || r.charges !== undefined || r.cooldown !== undefined)) at('effets, conditions, charges et recharge demandent un déclencheur')
    if (r.charges !== undefined && (!Number.isInteger(r.charges) || r.charges < 1)) at('charges : entier ≥ 1')
    if (r.cooldown !== undefined && (!Number.isInteger(r.cooldown) || r.cooldown < 1)) at('recharge : entier ≥ 1')
    const t = r.trigger
    if (t?.type === 'turn' && (!Number.isInteger(t.turn) || t.turn < 1)) at('tour : entier ≥ 1')
    if (t?.type === 'hpBelow' && !(t.ratio > 0 && t.ratio < 1)) at('seuil : part des PV entre 0 et 1')
    if (t?.type === 'strike' && !(STRIKE_TRIGGERS as readonly string[]).includes(t.on)) at(`moment de coup inconnu : ${t.on}`)
    for (const e of r.effects ?? []) {
      if (e.type === 'applyStatus' && !STATUSES[e.status]) at(`statut inconnu : ${e.status}`)
      if (e.type === 'release') at('une relique ne relâche pas de jauges')
      // Règle 7 (décision de l'utilisateur) : une relique agit sur son porteur, jamais de malus sur l'adversaire.
      // Vers l'adversaire, seuls les dégâts directs ; un statut posé est un bonus du porteur.
      if (e.target === 'opponent' && e.type !== 'damage') at('vers l’adversaire, une relique ne fait que des dégâts directs')
      if (e.type === 'applyStatus' && STATUSES[e.status]?.polarity === 'negative') at(`une relique ne pose pas de malus : ${e.status}`)
    }
  }
  return errors
}

/* ---------- Récompense de tournoi ---------- */

/** Nombre de reliques proposées après une victoire. */
export const OFFER_SIZE = 3

/** L'offre d'une victoire : `OFFER_SIZE` reliques tirées parmi celles que le vainqueur n'a pas encore. */
export function drawOffer(held: readonly string[], rng: Rng, pool: readonly string[] = RELIC_IDS): string[] {
  return shuffle(
    rng,
    pool.filter((id) => !held.includes(id)),
  ).slice(0, OFFER_SIZE)
}

/**
 * Le choix du vainqueur quand personne ne choisit pour lui (match simulé depuis l'arbre, ou choix par défaut
 * de l'écran de victoire) : une relique de l'offre au hasard, à parts égales.
 */
export const autoPick = (offer: readonly string[], rng: Rng): string | undefined => (offer.length ? pick(rng, offer) : undefined)
