import type { CharacterStats } from './character'
import { describeCondition, rollFace, TRIGGERS, type Condition, type Effect, type Target, type Trigger } from './events'
import { pick, pickWeighted, shuffle, type Rng } from './rng'
import { SCENE_EVENTS, type SceneEventId } from './scenes'
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

/**
 * Reliques élémentaires (0.85.0, docs/RELIQUES.md § 12) : quatre fragments d'un même vieux sort, scellés chacun dans un
 * objet. Une relique ordinaire garde sa magie contenue ; une relique élémentaire brise son sceau quand elle agit, et
 * sa magie envahit l'arène (un événement de scène, `scene`). Ce n'est pas un type : chacune est d'un des quatre types.
 */
export type RelicElement = 'fire' | 'frost' | 'wind' | 'earth'

export const RELIC_ELEMENTS: Record<RelicElement, { label: string }> = {
  fire: { label: 'Feu' },
  frost: { label: 'Givre' },
  wind: { label: 'Vent' },
  earth: { label: 'Terre' },
}

/** Ce qui sépare une relique élémentaire des autres, pour l'infobulle et le compendium. */
export const ELEMENTAL_SUMMARY = 'Relique élémentaire : quand elle agit, son sceau se brise et sa magie envahit l’arène.'

/** « Élémentaire · Feu » (vide pour une relique ordinaire) : infobulle, carte de récompense, compendium, trace. */
export const elementLabel = (r: Pick<Relic, 'element'>) => (r.element ? `Élémentaire · ${RELIC_ELEMENTS[r.element].label}` : '')

/** Stats de base ajoutées à plat par une relique (0,05 d'esquive = 5 points de pourcentage). */
export type RelicStats = Partial<CharacterStats>

export interface Relic {
  id: string
  name: string
  /** Une phrase d'ambiance, pour le compendium seulement ; la règle se rédige depuis les données (`describeRelic`) */
  flavor: string
  /** Caractéristique : stats ajoutées à plat */
  stats?: RelicStats
  /** Coup : ajouté au coup de base de chacun de ses coups qui touchent, avant le critique (« +4 dégâts à ce coup ») */
  rollBonus?: number
  /** Le bonus de coup ne vaut que pour un coup dont le dé fait cette face (Fer à quatre clous : sur un 4), coup brut compris */
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
  /** Relique élémentaire : son élément, et l'événement de scène joué quand elle agit (présentation seulement) */
  element?: RelicElement
  scene?: SceneEventId
}

export type RelicKind = 'stat' | 'strike' | 'turn' | 'threshold'

/** Les quatre types, dans l'ordre de lecture : nom et ce qu'ils font, pour l'infobulle et le compendium. */
export const RELIC_KINDS: Record<RelicKind, { label: string; summary: string }> = {
  stat: { label: 'Caractéristique', summary: 'Des stats en plus, tout le combat.' },
  strike: { label: 'Coup', summary: 'Sur ses coups : une face de son dé, ou un moment du coup (il touche, il esquive, il encaisse).' },
  turn: { label: 'Tour', summary: 'Au début d’un de ses tours, avant son action.' },
  threshold: { label: 'Seuil', summary: 'Quand des PV passent sous un seuil : les siens, ou ceux de l’adversaire.' },
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
    // 0.105.0 (règles v2, d6 imprimé) : +2 faces au dé jusqu'à la 0.104.0 ; un d6 ne grandit plus. Même idée, en stats :
    // le bras frappe plus lourd (critique), et moins souvent juste
    id: 'lead-pommel',
    name: 'Contrepoids de plomb',
    flavor: 'Un pommeau de plomb cerclé de fer, limé à la main. Le bras frappe plus lourd, et moins souvent juste.',
    stats: { critMultiplier: 1, critChance: -0.04 },
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
    stats: { armor: 1, dodgeChance: -0.05 },
  },
  /* Coup : des objets de hasard, qui portent la face qui les éveille */
  {
    id: 'split-knucklebone',
    name: 'Osselet fendu',
    flavor: 'Un osselet de mouton fendu en long, un seul point gravé sur sa face creuse. Même le pire jet mord.',
    trigger: { type: 'strike', on: 'naturalOne' },
    effects: [{ type: 'damage', amount: 3, target: 'opponent', source: 'strike' }],
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
    // 0.105.0 (retour de l'utilisateur) : l'Aura de puissance qu'elle posait se lisait comme une compétence dans la barre
    // de compétences, et sa règle (cumulée tous les 4 tours) était abstraite. Un statut générique, le Critique assuré.
    id: 'siege-clepsydra',
    name: 'Clepsydre du siège',
    flavor: 'Un bol de bronze percé au fond, trois graduations, l’eau arrêtée à la deuxième. Plus le siège dure, plus il frappe juste.',
    trigger: { type: 'turn', turn: 6 },
    cooldown: 4,
    effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }],
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
  /*
   * Reliques élémentaires (0.85.0, docs/RELIQUES.md § 12) : une par élément, réparties sur les types. Leur sceau se
   * brise quand elles agissent (événement de scène) ; le spectacle reste rare, une ou deux fois par combat.
   */
  {
    id: 'caged-ember',
    name: 'Braise captive',
    flavor: 'Une braise vivante dans une cage de quatre barreaux. Au quatrième tour, la cage cède, et le ciel brûle.',
    element: 'fire',
    scene: 'emberRain',
    trigger: { type: 'turn', turn: 4 },
    charges: 1,
    effects: [{ type: 'damage', amount: 2, hits: 3, target: 'opponent', source: 'fire' }],
  },
  {
    id: 'frost-tear',
    name: 'Larme de givre',
    flavor: 'Une larme de glace qui ne fond pas, fêlée près de la pointe. Quand tout saigne, elle gèle la plaie.',
    element: 'frost',
    scene: 'hoarfrost',
    trigger: { type: 'hpBelow', ratio: 0.35 },
    charges: 1,
    effects: [
      { type: 'cleanse', polarity: 'negative' },
      { type: 'heal', amount: 5 },
    ],
  },
  {
    id: 'wind-conch',
    name: 'Conque des vents',
    flavor: 'Un coquillage à deux tours de spire où souffle encore une tempête. Qui l’esquive l’entend répondre.',
    element: 'wind',
    scene: 'gale',
    trigger: { type: 'strike', on: 'dodge' },
    charges: 2,
    effects: [{ type: 'damage', amount: 2, hits: 3, target: 'opponent', source: 'wind' }],
  },
  {
    id: 'split-geode',
    name: 'Géode fendue',
    flavor: 'Une géode ouverte en deux, deux gros cristaux ambrés au fond. Frappée, la terre se lève autour du porteur.',
    element: 'earth',
    scene: 'stoneWall',
    trigger: { type: 'strike', on: 'hurt' },
    charges: 2,
    cooldown: 3,
    effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 4 }],
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
const capitalize = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`
const ordinal = (n: number) => (n === 1 ? '1er' : `${n}e`)

/**
 * Une stat ajoutée, en clair : « +2 armure », « +6 % d'esquive ». Une esquive négative n'esquive jamais. L'attaque se dit
 * une fois, « +1 à l'attaque », pour son minimum et son maximum (`validateRelics` les veut égaux).
 */
const STAT_TEXT: Record<keyof CharacterStats, (v: number) => string> = {
  maxHp: (v) => `${signed(v)} PV max`,
  attackMin: (v) => `${signed(v)} à l'attaque`,
  attackMax: () => '',
  armor: (v) => `${signed(v)} armure`,
  dodgeChance: (v) => `${signed(Math.round(v * 100))} % d'esquive`,
  critChance: (v) => `${signed(Math.round(v * 100))} % de critique`,
  critMultiplier: (v) => `${signed(v).replace('.', ',')} au multiplicateur de critique`,
}

/**
 * Un effet de relique au plus court : « 3 dégâts directs », « +2 Vol de vie », « retire son dernier malus, sinon +3 PV ».
 * `validateRelics` garantit le reste : vers l'adversaire, seulement des dégâts directs ; aucune relâche de jauges.
 */
function effectText(e: Effect): string {
  switch (e.type) {
    case 'damage':
      return `${e.hits ? `${e.hits} × ` : ''}${e.amount} dégâts directs${e.target === 'opponent' ? '' : ' à soi-même'}`
    case 'heal':
      return `+${e.amount} PV`
    case 'applyStatus':
      return `+${e.stacks} ${STATUSES[e.status].name}${e.turns ? ` (${e.turns} tours)` : ''}`
    case 'cleanse': {
      const kind = e.polarity === 'negative' ? 'malus' : 'bonus'
      const what = e.count === undefined ? `tous ses ${kind}` : e.count === 1 ? `son dernier ${kind}` : `ses ${e.count} derniers ${kind}`
      return `retire ${what}${e.orElse ? `, sinon ${effectText(e.orElse)}` : ''}`
    }
    case 'release':
      return `relâche ${STATUSES[e.status].name}`
  }
}

/** Quand elle agit, en quelques mots (« Sur un 1 », « Tous les 3 tours », « Sous 40 % PV ») ; rien pour une relique sans déclencheur. */
function momentOf(r: Relic): string {
  const t = r.trigger
  if (!t) return ''
  const when = (r.when ?? []).map((c) => `, si ${describeCondition(c)}`).join('')
  switch (t.type) {
    case 'turn': {
      if (r.charges === 1) return `Au ${ordinal(t.turn)} tour${when}`
      const every = r.cooldown ? `tous les ${r.cooldown} tours` : 'à chaque tour'
      return `${t.turn === (r.cooldown ?? 1) ? capitalize(every) : `Au ${ordinal(t.turn)} tour, puis ${every}`}${when}`
    }
    case 'hpBelow':
      return `${t.who === 'opponent' ? 'Adversaire sous' : 'Sous'} ${Math.round(t.ratio * 100)} % PV${when}`
    case 'strike': {
      const face = rollFace(t.on)
      const moment = face !== undefined ? `Sur un ${face}` : t.on === 'naturalMax' ? 'Sur un jet maximal' : TRIGGERS[t.on].label
      return `${moment}${when}`
    }
  }
}

export interface RelicDescription {
  /**
   * La règle en une ligne, moment puis effet : « Sur un 1 : 3 dégâts directs », « +4 dégâts aux frappes de 4 ». Le
   * vocabulaire porte la résolution : « à la frappe », avant le critique ; « dégâts directs », ni coup ni armure.
   */
  text: string
  /** Ses limites : « 1 fois par combat », « recharge 3 tours » (vide sans limite) */
  limits: string[]
  /** Statuts qu'elle pose, avec leur cible */
  posed: { status: StatusId; target: Target }[]
}

/** La seule rédaction d'une relique : infobulle, compendium, écran de récompense, trace et rapports la lisent. */
export function describeRelic(r: Relic): RelicDescription {
  const t = r.trigger
  // Un bonus de face (Fer à quatre clous) se dit comme un événement, « Sur un 4 : +4 dégâts à ce coup », et non comme
  // une face enrichie (2026-10-23, retour de l'utilisateur) ; la mécanique ne change pas
  const onFace = r.rollBonus !== undefined && r.onFace !== undefined
  const effect = [
    ...Object.entries(r.stats ?? {}).map(([k, v]) => STAT_TEXT[k as keyof CharacterStats](v)),
    r.rollBonus ? `${signed(r.rollBonus)} dégâts ${onFace ? 'à ce coup' : 'à la frappe'}` : '',
    ...(r.effects ?? []).map(effectText),
  ]
    .filter(Boolean)
    .join(', ')
  const moment = onFace ? `Sur un ${r.onFace}` : momentOf(r)
  const limits = [
    // Une relique de tour à une charge le dit déjà par son moment (« Au 4e tour »)
    ...(r.charges !== undefined && !(t?.type === 'turn' && r.charges === 1) ? [`${r.charges} fois par combat`] : []),
    ...(r.cooldown && t?.type !== 'turn' ? [`recharge ${r.cooldown} tours`] : []),
  ]
  const posed = (r.effects ?? []).flatMap((e) => (e.type === 'applyStatus' ? [{ status: e.status, target: e.target ?? ('self' as const) }] : []))
  return { text: capitalize(moment ? `${moment} : ${effect}` : effect), limits, posed }
}

/** Une relique en une ligne (rapports, trace) : sa règle, puis ses limites. */
export function relicLine(r: Relic) {
  const { text, limits } = describeRelic(r)
  return [text, ...limits].join(' · ')
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
    // L'attaque s'écrit à plat sur toute sa fourchette : autant au minimum qu'au maximum
    if ((r.stats?.attackMin ?? 0) !== (r.stats?.attackMax ?? 0)) at("l'attaque se change autant au minimum qu'au maximum")
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
    // Relique élémentaire : un élément et sa scène, toujours ensemble, sur une relique qui se déclenche. Une scène qui
    // vise l'adversaire fait tomber un coup par impact : autant d'impacts que de coups de ses dégâts directs
    if ((r.element === undefined) !== (r.scene === undefined)) at('une relique élémentaire a un élément et une scène')
    if (r.scene) {
      const timing = SCENE_EVENTS[r.scene]
      if (!timing) at(`scène inconnue : ${r.scene}`)
      else if (!r.trigger) at('une scène demande un déclencheur')
      else if (timing.aim !== 'self') {
        const blows = (r.effects ?? []).reduce((n, e) => n + (e.type === 'damage' && e.target === 'opponent' ? (e.hits ?? 1) : 0), 0)
        if (blows !== timing.impacts.length) at(`scène à ${timing.impacts.length} impacts pour ${blows} coups`)
      } else if (timing.impacts.length !== 1) at('une scène sur le porteur a un seul impact')
    }
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

/**
 * L'offre d'une victoire : `OFFER_SIZE` reliques tirées parmi celles que le vainqueur n'a pas encore.
 * `focus` (offre orientée, règles v2, docs/PROGRESSION.md § 13.2) : la première se tire au poids que `focus` lui donne
 * (l'écho avec le build), les autres restent libres, à parts égales.
 */
export function drawOffer(held: readonly string[], rng: Rng, pool: readonly string[] = RELIC_IDS, focus?: (id: string) => number): string[] {
  const open = pool.filter((id) => !held.includes(id))
  if (!focus || open.length === 0) return shuffle(rng, open).slice(0, OFFER_SIZE)
  const echo = pickWeighted(rng, open, focus)
  return [echo, ...shuffle(rng, open.filter((id) => id !== echo)).slice(0, OFFER_SIZE - 1)]
}

/**
 * Le choix du vainqueur quand personne ne choisit pour lui (match simulé depuis l'arbre, ou choix par défaut
 * de l'écran de victoire) : une relique de l'offre au hasard, à parts égales.
 */
export const autoPick = (offer: readonly string[], rng: Rng): string | undefined => (offer.length ? pick(rng, offer) : undefined)
