import type { CharacterStats } from './character'
import { TRIGGERS, type Effect, type Trigger } from './events'

/*
 * Statuts (« auras ») : effets durables portés par un combattant, positifs ou négatifs.
 * Un statut est entièrement décrit ici, règles ET présentation : le moteur et l'interface
 * ne connaissent aucun statut par son nom. Ajouter un statut = ajouter une entrée à STATUSES.
 *
 * Durée de vie :
 * - `stacks` : charges ou points. Un statut à 0 charge disparaît.
 * - `turns` (facultatif) : nombre de tours du porteur avant expiration, décompté au début
 *   (défaut) ou à la fin de ses tours (`expiresAt`). Sans `turns`, le statut dure jusqu'à
 *   épuisement de ses charges.
 * Les règles de résolution (phases, ordre, application, opposition) sont dans docs/RESOLUTION.md.
 */

export type StatusId =
  | 'guaranteedCrit'
  | 'bonusArmor'
  | 'poison'
  | 'regeneration'
  | 'weakened'
  | 'exposed'
  | 'burn'
  | 'vulnerable'
  | 'stunned'
  | 'thorns'
  | 'ward'

export type Polarity = 'positive' | 'negative'

/** Un statut actif sur un combattant. */
export interface Status {
  id: StatusId
  stacks: number
  /** Débuts de tour restants ; absent = illimité */
  turns?: number
}

/** Stats qu'un statut peut modifier pendant le combat (les PV max restent fixes). */
export type CombatStats = Omit<CharacterStats, 'maxHp'>

export interface StatusDef {
  name: string
  icon: string
  polarity: Polarity
  /** Une phrase générique, pour le compendium et la documentation */
  summary: string
  /** Explication au survol, selon l'état courant */
  describe: (s: Status) => string
  /** Valeur courte, avec son unité, pour les textes (survol, compendium) */
  badge: (s: Status) => string
  /**
   * Nombre affiché sur l'icône de l'état, au-dessus du combattant.
   * Défaut (`auto`) : les tours restants si le statut a une durée, sinon ses charges.
   */
  counter?: 'auto' | 'stacks' | 'turns'
  /**
   * Nouvelle application d'un statut déjà présent :
   * - `add` : les charges s'additionnent (la durée garde la plus longue) ;
   * - `refresh` : remplace charges et durée.
   */
  stacking: 'add' | 'refresh'
  /** Plafond de charges (défaut : aucun) : un cumul au-delà est ramené au plafond */
  maxStacks?: number

  /* --- Règles. Chaque crochet est facultatif ; le moteur les appelle à un moment fixe. --- */

  /** Modifie les stats effectives du porteur (bornées ensuite par le moteur) */
  modifyStats?: (stats: CombatStats, s: Status) => CombatStats
  /** Modifie les dégâts du porteur avant l'armure (le coup garde au moins 1) */
  modifyOutgoing?: (damage: number, s: Status) => number
  /** Le prochain coup qui touche est critique ; consomme une charge */
  forcesCrit?: boolean
  /** Bouclier : absorbe jusqu'à `stacks` points après l'armure, sans descendre sous 1 dégât ; s'use d'autant */
  shield?: boolean
  /** Effets appliqués au porteur au début de chacun de ses tours (phase 1) */
  onTurnStart?: (s: Status) => Effect[]
  /** Effets appliqués au porteur à la fin de chacun de ses tours (phase 3) */
  onTurnEnd?: (s: Status) => Effect[]
  /** Moment où la durée (`turns`) est décomptée : début (défaut) ou fin des tours du porteur */
  expiresAt?: 'turnStart' | 'turnEnd'
  /** Modifie les dégâts reçus par le porteur, avant l'armure (le coup garde au moins 1) */
  modifyIncoming?: (damage: number, s: Status) => number
  /** Contrôle : le porteur perd son action ; consomme une charge par tour perdu */
  skipsAction?: boolean
  /**
   * Réactions : effets déclenchés par un moment du combat, du point de vue du porteur
   * (mêmes déclencheurs que les événements ; ex. Épines sur `hurt`). Ils ne déclenchent rien
   * en cascade. Les cibles sont relatives au porteur.
   */
  reactions?: Partial<Record<Trigger, (s: Status) => Effect[]>>
  /** Opposition : poser ce statut sur un porteur du statut opposé annule les charges une à une */
  opposes?: StatusId
  /** Garde : bloque la pose de ces statuts sur le porteur ; consomme une charge par blocage */
  wards?: { polarity?: Polarity; statuses?: readonly StatusId[] }
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`
const forTurns = (s: Status) => (s.turns === undefined ? '' : `, encore ${plural(s.turns, 'tour')}`)

export const STATUSES: Record<StatusId, StatusDef> = {
  guaranteedCrit: {
    name: 'Critique assuré',
    icon: '🎯',
    polarity: 'positive',
    summary: 'Le prochain coup qui touche est un coup critique.',
    describe: (s) =>
      s.stacks > 1
        ? `Les ${s.stacks} prochains coups qui touchent sont critiques`
        : 'Le prochain coup qui touche est critique',
    badge: (s) => `×${s.stacks}`,
    stacking: 'add',
    forcesCrit: true,
  },
  bonusArmor: {
    name: 'Armure temporaire',
    icon: '🛡️',
    polarity: 'positive',
    summary: "Un bouclier qui absorbe des dégâts après l'armure, puis s'épuise.",
    describe: (s) => `Absorbe encore ${plural(s.stacks, 'point')} de dégâts, puis disparaît`,
    badge: (s) => String(s.stacks),
    stacking: 'add',
    shield: true,
  },

  /* Statuts disponibles pour de futurs événements, pas encore attribués à un personnage. */
  poison: {
    name: 'Poison',
    icon: '☠️',
    polarity: 'negative',
    summary: "Fait perdre des PV au début de chaque tour du porteur, en ignorant l'armure.",
    describe: (s) => `Perd ${plural(s.stacks, 'PV')} au début de chacun de ses tours${forTurns(s)}`,
    badge: (s) => String(s.stacks),
    stacking: 'add',
    onTurnStart: (s) => [{ type: 'damage', amount: s.stacks }],
    opposes: 'regeneration',
  },
  regeneration: {
    name: 'Régénération',
    icon: '💚',
    polarity: 'positive',
    summary: 'Rend des PV au début de chaque tour du porteur.',
    describe: (s) => `Regagne ${plural(s.stacks, 'PV')} au début de chacun de ses tours${forTurns(s)}`,
    badge: (s) => `+${s.stacks}`,
    stacking: 'refresh',
    onTurnStart: (s) => [{ type: 'heal', amount: s.stacks }],
    opposes: 'poison',
  },
  weakened: {
    name: 'Affaibli',
    icon: '🥀',
    polarity: 'negative',
    summary: 'Les coups du porteur infligent moins de dégâts.',
    describe: (s) => `Ses coups infligent ${s.stacks} de moins avant l'armure${forTurns(s)}`,
    badge: (s) => `−${s.stacks}`,
    stacking: 'refresh',
    modifyOutgoing: (damage, s) => damage - s.stacks,
  },
  exposed: {
    name: 'Brèche',
    icon: '💔',
    polarity: 'negative',
    summary: "L'armure du porteur est réduite.",
    describe: (s) => `Armure réduite de ${s.stacks}${forTurns(s)}`,
    badge: (s) => `−${s.stacks}`,
    stacking: 'add',
    maxStacks: 3,
    modifyStats: (stats, s) => ({ ...stats, armor: stats.armor - s.stacks }),
  },

  /* Statuts qui illustrent chaque mécanique de résolution (docs/RESOLUTION.md), à venir. */
  burn: {
    name: 'Brûlure',
    icon: '🔥',
    polarity: 'negative',
    summary: 'Fait perdre des PV à la fin de chaque tour du porteur.',
    describe: (s) => `Perd ${plural(s.stacks, 'PV')} à la fin de chacun de ses tours${forTurns(s)}`,
    badge: (s) => String(s.stacks),
    stacking: 'refresh',
    onTurnEnd: (s) => [{ type: 'damage', amount: s.stacks }],
    expiresAt: 'turnEnd',
  },
  vulnerable: {
    name: 'Vulnérable',
    icon: '🩸',
    polarity: 'negative',
    summary: "Le porteur subit plus de dégâts à chaque coup, avant l'armure.",
    describe: (s) => `Chaque coup reçu inflige ${s.stacks} de plus avant l'armure${forTurns(s)}`,
    badge: (s) => `+${s.stacks}`,
    stacking: 'add',
    maxStacks: 3,
    modifyIncoming: (damage, s) => damage + s.stacks,
  },
  stunned: {
    name: 'Étourdi',
    icon: '💫',
    polarity: 'negative',
    summary: 'Le porteur perd sa prochaine action.',
    describe: (s) => (s.stacks > 1 ? `Perd ses ${s.stacks} prochaines actions` : 'Perd sa prochaine action'),
    badge: (s) => `×${s.stacks}`,
    stacking: 'add',
    maxStacks: 1,
    skipsAction: true,
  },
  thorns: {
    name: 'Épines',
    icon: '🌵',
    polarity: 'positive',
    summary: "Chaque coup encaissé renvoie des dégâts directs à l'attaquant.",
    describe: (s) => `Renvoie ${plural(s.stacks, 'dégât')} à l'attaquant à chaque coup encaissé${forTurns(s)}`,
    badge: (s) => String(s.stacks),
    stacking: 'refresh',
    reactions: { hurt: (s) => [{ type: 'damage', amount: s.stacks, target: 'opponent' }] },
  },
  ward: {
    name: 'Garde sacrée',
    icon: '✨',
    polarity: 'positive',
    summary: 'Bloque les prochains malus posés sur le porteur.',
    describe: (s) => (s.stacks > 1 ? `Bloque les ${s.stacks} prochains malus` : 'Bloque le prochain malus'),
    badge: (s) => `×${s.stacks}`,
    stacking: 'add',
    wards: { polarity: 'negative' },
  },
}

export const STATUS_IDS = Object.keys(STATUSES) as StatusId[]

/** Le nombre à afficher sur l'icône d'un état (voir `StatusDef.counter`), ou null s'il n'y a rien à compter. */
export function statusCounter(s: Status): { value: number; unit: 'stacks' | 'turns' } | null {
  const mode = STATUSES[s.id].counter ?? 'auto'
  if (mode === 'turns' || (mode === 'auto' && s.turns !== undefined))
    return s.turns === undefined ? null : { value: s.turns, unit: 'turns' }
  return { value: s.stacks, unit: 'stacks' }
}

/** Met la première lettre en minuscule, pour insérer une description dans une phrase (garde « PV »). */
export const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

export const POLARITY_STYLE: Record<Polarity, { chip: string; glow: string; label: string }> = {
  positive: {
    chip: 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100',
    glow: 'rgba(52,211,153,0.35)',
    label: 'Bonus',
  },
  negative: {
    chip: 'border-red-400/70 bg-red-500/15 text-red-100',
    glow: 'rgba(248,113,113,0.4)',
    label: 'Malus',
  },
}

/** Règle de durée commune à tous les statuts (affichée une fois, pas sur chaque statut). */
export const STATUS_DURATION_RULE =
  "Un statut dure jusqu'à épuisement de ses charges, ou pendant le nombre de tours du porteur fixé par l'effet qui le pose. La durée est décomptée au début de chacun de ses tours."

/**
 * Règles d'un statut en phrases, déduites de sa définition (crochets, cumul, plafond) :
 * le compendium et la documentation restent fidèles au code sans texte écrit à la main.
 */
export function statusRules(id: StatusId): string[] {
  const def = STATUSES[id]
  const rules: string[] = []
  if (def.forcesCrit)
    rules.push('Force le critique du prochain coup qui touche ; une charge par coup. Une esquive ne la consomme pas.')
  if (def.shield)
    rules.push("Absorbe autant de points que de charges, après l'armure, sans faire descendre un coup sous 1 dégât.")
  if (def.onTurnStart) rules.push('Agit au début de chaque tour du porteur, avant son attaque.')
  if (def.modifyOutgoing) rules.push("Modifie les dégâts du porteur avant l'armure ; un coup garde au moins 1 dégât.")
  if (def.modifyStats)
    rules.push('Modifie les caractéristiques du porteur, bornées par le moteur (armure ≥ 0, chances entre 0 et 100 %).')
  if (def.onTurnEnd) rules.push('Agit à la fin de chaque tour du porteur, après son action.')
  if (def.modifyIncoming) rules.push("Modifie les dégâts reçus par le porteur avant l'armure ; un coup garde au moins 1 dégât.")
  if (def.skipsAction) rules.push('Le porteur perd son action ; une charge par tour perdu.')
  for (const trigger of Object.keys(def.reactions ?? {}) as Trigger[])
    rules.push(`Réagit ${lowerFirst(TRIGGERS[trigger].label)}, sans déclencher d'autre réaction en chaîne.`)
  if (def.wards)
    rules.push(
      `Bloque la pose ${def.wards.polarity === 'negative' ? 'des malus' : def.wards.polarity === 'positive' ? 'des bonus' : 'de certains statuts'} sur le porteur ; une charge par blocage.`,
    )
  if (def.opposes)
    rules.push(`S'oppose à ${STATUSES[def.opposes].icon} ${STATUSES[def.opposes].name} : leurs charges s'annulent une à une.`)
  if (def.expiresAt === 'turnEnd') rules.push('Sa durée se décompte à la fin des tours du porteur.')
  rules.push(
    def.stacking === 'add'
      ? 'Cumulable : une nouvelle application ajoute ses charges, la durée garde la plus longue.'
      : "Non cumulable : une nouvelle application remplace l'existante (charges et durée).",
  )
  if (def.maxStacks !== undefined) rules.push(`Plafonné à ${def.maxStacks} charges.`)
  return rules
}

/* ---------- Manipulation (immuable) d'une liste de statuts ---------- */

export const findStatus = (list: readonly Status[], id: StatusId) => list.find((s) => s.id === id)

export const stacksOf = (list: readonly Status[], id: StatusId) => findStatus(list, id)?.stacks ?? 0

/** Applique un statut selon sa règle de cumul ; l'ordre d'application est conservé. */
export function applyStatus(list: readonly Status[], added: Status): Status[] {
  if (added.stacks <= 0) return [...list]
  const cap = STATUSES[added.id].maxStacks ?? Infinity
  const existing = findStatus(list, added.id)
  if (!existing) return [...list, { ...added, stacks: Math.min(added.stacks, cap) }]
  const merged: Status =
    STATUSES[added.id].stacking === 'add'
      ? {
          id: added.id,
          stacks: Math.min(existing.stacks + added.stacks, cap),
          turns:
            existing.turns === undefined || added.turns === undefined
              ? undefined
              : Math.max(existing.turns, added.turns),
        }
      : { ...added, stacks: Math.min(added.stacks, cap) }
  if (merged.turns === undefined) delete merged.turns
  return list.map((s) => (s.id === added.id ? merged : s))
}

/** Issue de la pose d'un statut (voir `resolveApplication`). */
export type ApplicationOutcome =
  /** Posé, éventuellement après annulation partielle par l'opposé */
  | { kind: 'applied'; stacks: number; cancelled?: { status: StatusId; stacks: number } }
  /** Entièrement absorbé par le statut opposé */
  | { kind: 'cancelled'; cancelled: { status: StatusId; stacks: number } }
  /** Bloqué : immunité du personnage, ou garde (qui perd une charge) */
  | { kind: 'blocked'; by: 'immunity' | StatusId }

/**
 * Pose un statut en appliquant, dans cet ordre, les règles de résolution :
 * 1. immunité du personnage → bloqué ;
 * 2. garde (`wards`) d'un statut du porteur → bloqué, la garde perd une charge ;
 * 3. opposition (`opposes`) → les charges s'annulent une à une avec le statut opposé ;
 * 4. cumul (`stacking`) et plafond (`maxStacks`) pour ce qui reste.
 */
export function resolveApplication(
  list: readonly Status[],
  added: Status,
  immunities: readonly StatusId[] = [],
): { list: Status[]; outcome: ApplicationOutcome } {
  const def = STATUSES[added.id]
  if (immunities.includes(added.id)) return { list: [...list], outcome: { kind: 'blocked', by: 'immunity' } }
  const ward = list.find((s) => {
    const w = STATUSES[s.id].wards
    return w && (w.polarity === def.polarity || w.statuses?.includes(added.id))
  })
  if (ward) return { list: consumeStatus(list, ward.id, 1), outcome: { kind: 'blocked', by: ward.id } }

  let current: Status[] = [...list]
  let stacks = added.stacks
  let cancelled: { status: StatusId; stacks: number } | undefined
  const opposite = def.opposes ? findStatus(current, def.opposes) : undefined
  if (opposite) {
    const n = Math.min(stacks, opposite.stacks)
    current = consumeStatus(current, opposite.id, n)
    stacks -= n
    cancelled = { status: opposite.id, stacks: n }
    if (stacks <= 0) return { list: current, outcome: { kind: 'cancelled', cancelled } }
  }
  const before = stacksOf(current, added.id)
  current = applyStatus(current, { ...added, stacks })
  const gained = stacksOf(current, added.id) - (def.stacking === 'add' ? before : 0)
  return { list: current, outcome: { kind: 'applied', stacks: Math.max(gained, 0), ...(cancelled && { cancelled }) } }
}

/** Retire des charges ; le statut disparaît à 0. */
export function consumeStatus(list: readonly Status[], id: StatusId, amount: number): Status[] {
  return list.flatMap((s) => {
    if (s.id !== id) return [s]
    const left = s.stacks - amount
    return left > 0 ? [{ ...s, stacks: left }] : []
  })
}

export const removeStatuses = (list: readonly Status[], polarity: Polarity) =>
  list.filter((s) => STATUSES[s.id].polarity !== polarity)

/** Décompte d'un début de tour : renvoie les statuts restants et ceux qui expirent. */
export function tickDurations(
  list: readonly Status[],
  phase: 'turnStart' | 'turnEnd' = 'turnStart',
): { kept: Status[]; expired: StatusId[] } {
  const kept: Status[] = []
  const expired: StatusId[] = []
  for (const s of list) {
    if (s.turns === undefined || (STATUSES[s.id].expiresAt ?? 'turnStart') !== phase) kept.push(s)
    else if (s.turns > 1) kept.push({ ...s, turns: s.turns - 1 })
    else expired.push(s.id)
  }
  return { kept, expired }
}
