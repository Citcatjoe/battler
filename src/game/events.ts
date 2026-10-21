import type { SceneEventId } from './scenes'
import type { RuleId } from './rules'
import { lowerFirst, STATUSES, type Polarity, type StatusId } from './statuses'

/*
 * Événements (« compétences » dans l'interface) : capacités propres à un personnage, déclenchées à un moment précis du combat.
 * - Le déclencheur (`Trigger`) dit QUAND, toujours du point de vue du porteur de l'événement.
 * - Les effets (`Effect`) disent QUOI : soin, dégâts, statut à poser, statuts à retirer.
 * - `chance` et `limit` règlent la fréquence.
 * Ajouter un événement à un personnage = une entrée dans son `events` (roster.ts).
 * Ajouter un déclencheur = une entrée dans TRIGGERS et un `fire(...)` au bon moment du moteur.
 * Ajouter un type d'effet = étendre `Effect`, `applyEffect` (combat.ts) et `describeEffect`.
 */

export type Trigger =
  | 'combatStart'
  | 'turnStart'
  | 'turnEnd'
  | 'naturalOne'
  | 'naturalTwo'
  | 'naturalThree'
  | 'naturalMax'
  | 'doubleOne'
  | 'doubleTwo'
  | 'doubleThree'
  | 'doubleFour'
  | 'doubleFive'
  | 'hit'
  | 'crit'
  | 'missed'
  | 'dodge'
  | 'hurt'
  | 'bloodied'

/**
 * Libellés affichés : `label` en toutes lettres, `short` pour un index (« dé 1 »). L'ordre d'évaluation sur un
 * même coup est fixé par le moteur (combat.ts, étape 4).
 */
export const TRIGGERS: Record<Trigger, { label: string; short: string }> = {
  combatStart: { label: 'Au début du combat', short: 'début du combat' },
  turnStart: { label: 'Au début de chacun de ses tours', short: 'début de tour' },
  turnEnd: { label: 'À la fin de chacun de ses tours', short: 'fin de tour' },
  naturalOne: { label: 'Sur un 1 au dé de dégâts', short: 'dé 1' },
  naturalTwo: { label: 'Sur un 2 au dé de dégâts', short: 'dé 2' },
  naturalThree: { label: 'Sur un 3 au dé de dégâts', short: 'dé 3' },
  naturalMax: { label: 'Sur un jet maximal au dé de dégâts', short: 'dé max.' },
  doubleOne: { label: 'Sur un double 1 (deux dés)', short: 'double 1' },
  doubleTwo: { label: 'Sur un double 2 (deux dés)', short: 'double 2' },
  doubleThree: { label: 'Sur un double 3 (deux dés)', short: 'double 3' },
  doubleFour: { label: 'Sur un double 4 (deux dés)', short: 'double 4' },
  doubleFive: { label: 'Sur un double 5 (deux dés)', short: 'double 5' },
  hit: { label: 'Quand il touche', short: 'touche' },
  crit: { label: 'Quand il porte un critique', short: 'critique' },
  missed: { label: 'Quand son coup est esquivé', short: 'esquivé' },
  dodge: { label: 'Quand il esquive', short: 'esquive' },
  hurt: { label: 'Quand il encaisse un coup', short: 'coup encaissé' },
  bloodied: { label: 'La première fois qu’il passe sous la moitié de ses PV', short: 'mi-PV' },
}

/** Cible d'un effet, relative au porteur de l'événement. */
export type Target = 'self' | 'opponent'

export type Effect =
  | { type: 'heal'; amount: number; target?: Target }
  /**
   * Dégâts directs : ignorent l'armure, l'esquive et les boucliers, et ne sont jamais critiques. Ce ne sont pas
   * des coups : rien de ce qui réagit à un coup (touche, encaisse) ne part. `hits` (0.76.0, Foudre) : une donnée
   * d'affichage, `hits` fois `amount` appliqués en une seule perte ; l'écran en fait autant d'impacts.
   */
  | { type: 'damage'; amount: number; hits?: number; target?: Target }
  | { type: 'applyStatus'; status: StatusId; stacks: number; turns?: number; target?: Target }
  /**
   * Retire des statuts d'une polarité, avec toutes leurs charges : tous, ou seulement les `count` derniers
   * apparus (un statut renforcé garde son rang). Les mécanismes de compétence et de forme ne se retirent pas.
   * `orElse` : effet joué à la place quand il n'y a rien à retirer (Purification, 0.42.0 : la lumière blesse au
   * lieu de tomber à vide).
   */
  | { type: 'cleanse'; polarity: Polarity; target?: Target; count?: number; orElse?: Exclude<Effect, { type: 'cleanse' }> }
  /**
   * Relâche un statut à jauges (Rétribution) : la somme de ses jauges en dégâts directs à l'adversaire,
   * au moins `min`, puis le statut est vidé. Le porteur ne remplit ses jauges que s'il a cet effet.
   */
  | { type: 'release'; status: StatusId; min: number; target?: Target }

/**
 * Condition à remplir pour qu'un événement se déclenche, évaluée au moment du déclencheur.
 * `who` est relatif au porteur de l'événement. Un événement déclare une liste de conditions :
 * toutes doivent être vraies (ET). Ajouter un type = étendre `Condition`, `conditionMet`
 * (combat.ts) et `describeCondition`.
 */
export type Condition =
  /** PV sous une fraction des PV max (0,5 = sous la moitié) */
  | { type: 'hpBelow'; who: Target; ratio: number }
  /** PV au-dessus (ou égaux) d'une fraction des PV max */
  | { type: 'hpAtLeast'; who: Target; ratio: number }
  /** Porte un statut, avec au moins `stacks` charges (défaut : 1) */
  | { type: 'hasStatus'; who: Target; status: StatusId; stacks?: number }
  | { type: 'lacksStatus'; who: Target; status: StatusId }
  /** À partir du tour n (inclus) */
  | { type: 'fromTurn'; turn: number }

/**
 * Nature d'une compétence, pour sa présentation seulement (couleur de sa carte, design system) :
 * martiale (force du corps ou de l'arme), adresse (agilité, précision, ruse, chance), arcane (magie,
 * foi, nature, mort) ou neutre (ni l'un ni l'autre : l'Attente de l'ogre). Sans effet sur le combat.
 */
export type SkillNature = 'martial' | 'finesse' | 'arcane' | 'neutral'

/** Nature retenue quand une compétence n'en déclare pas : l'arcane, le violet des cartes d'avant. */
export const DEFAULT_SKILL_NATURE: SkillNature = 'arcane'

export interface CharacterEvent {
  id: string
  name: string
  trigger: Trigger
  effects: readonly Effect[]
  /** Probabilité de déclenchement quand le déclencheur survient (défaut : 1) */
  chance?: number
  /** Nombre maximal de déclenchements par combat (défaut : illimité) */
  limit?: number
  /** Conditions supplémentaires, toutes requises ; vérifiées avant le tirage de `chance` */
  when?: readonly Condition[]
  /**
   * Le coup qui déclenche la compétence n'inflige aucun dégât : il n'y a ni esquive, ni critique,
   * ni « touche » (ex. Vol de vie, sur un 2). Réservé aux déclencheurs du dé (naturalOne,
   * naturalTwo, naturalThree, naturalMax), sans `chance` : le moteur doit le savoir dès que le dé est lancé.
   */
  forfeitsHit?: boolean
  /**
   * Le coup qui déclenche la compétence est transformé au lieu d'être sacrifié : `max` frappe pour la valeur
   * maximale du dé, `reroll` relance le dé, en secret, et ajoute `bonus`. `noCrit` : le coup ne peut pas être
   * critique. C'est un coup normal ensuite (esquive, modificateurs, armure, boucliers). Mêmes réserves que
   * `forfeitsHit`. Sans porteur depuis la 0.73.0 (retrait de Charge et de Coup de griffe) : la règle « Coup
   * transformé » est tue tant qu'aucune compétence ne s'en sert (`hiddenRules`, catalog.ts).
   */
  reshapesHit?: { value: 'max' | 'reroll'; bonus?: number; noCrit?: boolean }
  /**
   * La compétence d'un jet ne se déclenche que si le coup qu'elle accompagne touche (Pourfendre, 0.70.0) :
   * un coup doit toucher pour poser un malus physique (règle de l'utilisateur). Le jet n'est pas sacrifié,
   * c'est un vrai coup (esquive, critique, modificateurs) ; ses effets arrivent dans les fenêtres de ce coup.
   * Réservé aux déclencheurs du dé, sans `chance`, `forfeitsHit` ni `reshapesHit`.
   */
  needsTouch?: boolean
  /**
   * Compétence d'un double (personnage à deux dés, `twinDice`) qui attaque : l'action devient `volley`
   * coups dont le dé vaut la face du double (Siffloter : deux coups de 1). Réservé aux déclencheurs
   * doubleOne à doubleFive.
   */
  volley?: number
  /** Les `volley` coups n'en font qu'un, qui vaut leur somme (Soliste : un coup de 3 × 5 = 15) */
  merged?: boolean
  /** Forme requise (personnage à formes, ex. druide) : la compétence n'existe que sous cette forme */
  form?: string
  /** Nature de la compétence, pour sa carte (défaut : DEFAULT_SKILL_NATURE). Présentation seulement. */
  nature?: SkillNature
  /**
   * Événement de scène (0.73.0) : l'écran le joue sur toute l'arène quand la compétence part (la Foudre du
   * druide assombrit l'arène et un éclair tombe sur l'adversaire). Présentation seulement : registre
   * `SCENE_EVENTS` (`scenes.ts`) pour le rythme, `SceneEvent.tsx` pour le rendu.
   */
  scene?: SceneEventId
}

/** Déclencheurs liés à la valeur du dé, connus dès le jet. */
export const ROLL_TRIGGERS: readonly Trigger[] = ['naturalOne', 'naturalTwo', 'naturalThree', 'naturalMax']

/**
 * Déclencheurs d'un double, pour un personnage à deux dés (`twinDice`), par face : connus dès le jet de
 * la paire. Un double qui a sa compétence remplace toute l'action (docs/RESOLUTION.md § 2).
 */
export const DOUBLE_TRIGGERS: Readonly<Record<number, Trigger>> = {
  1: 'doubleOne',
  2: 'doubleTwo',
  3: 'doubleThree',
  4: 'doubleFour',
  5: 'doubleFive',
}

export const isDoubleTrigger = (t: Trigger) => Object.values(DOUBLE_TRIGGERS).includes(t)

/** La face d'un déclencheur de double (doubleFour : 4), ou undefined. */
export const doubleFace = (t: Trigger) => {
  const face = Object.entries(DOUBLE_TRIGGERS).find(([, x]) => x === t)?.[0]
  return face === undefined ? undefined : Number(face)
}

/** Le déclencheur du dé correspond-il à ce jet ? */
export function rollMatches(trigger: Trigger, roll: number, faces: number) {
  if (trigger === 'naturalOne') return roll === 1
  if (trigger === 'naturalTwo') return roll === 2
  if (trigger === 'naturalThree') return roll === 3
  if (trigger === 'naturalMax') return roll === faces && faces > 1
  return false
}

const who = (target: Target | undefined) => (target === 'opponent' ? "à l'adversaire" : '')

export function describeEffect(effect: Effect): string {
  const on = who(effect.target)
  switch (effect.type) {
    case 'heal':
      return effect.target === 'opponent' ? `soigne l'adversaire de ${effect.amount} PV` : `+${effect.amount} PV`
    case 'damage':
      return `${effect.amount} dégâts directs${on ? ` ${on}` : ' à soi-même'}${effect.hits ? `, ${effect.hits} fois (${effect.hits * effect.amount} en tout)` : ''}`
    case 'applyStatus': {
      const def = STATUSES[effect.status]
      const turns = effect.turns ?? (def.turnsFromStacks ? effect.stacks : undefined)
      const status = { id: effect.status, stacks: effect.stacks, turns }
      return `${def.name}${on ? ` ${on}` : ''} : ${lowerFirst(def.describe(status))}`
    }
    case 'release':
      return `relâche ${STATUSES[effect.status].name} : la somme de ses jauges en dégâts directs${on ? ` ${on}` : ''} (au moins ${effect.min})`
    case 'cleanse': {
      const kind = effect.polarity === 'negative' ? 'malus' : 'bonus'
      const orElse = effect.orElse ? ` ; sinon, ${describeEffect(effect.orElse)}` : ''
      // « Le plus récent » : le dernier apparu ; un statut renforcé garde son rang (applyStatus)
      const whose = effect.target === 'opponent' ? "à l'adversaire son" : 'son propre'
      if (effect.count === undefined) return `retire ${effect.target === 'opponent' ? `tous les ${kind} de l'adversaire` : `tous ses ${kind}`}${orElse}`
      const what = effect.count === 1 ? `${whose} ${kind} le plus récent` : `${whose.replace(/son( propre)?$/, 'ses')} ${effect.count} ${kind} les plus récents`
      return `retire ${what} (un ${kind} renforcé garde son rang), avec toutes ses charges${orElse}`
    }
  }
}

const whom = (who: Target) => (who === 'opponent' ? "l'adversaire" : 'il')
const pct = (ratio: number) => `${Math.round(ratio * 100)} %`

export function describeCondition(c: Condition): string {
  switch (c.type) {
    case 'hpBelow':
      return `${whom(c.who)} est sous ${pct(c.ratio)} de ses PV`
    case 'hpAtLeast':
      return `${whom(c.who)} a au moins ${pct(c.ratio)} de ses PV`
    case 'hasStatus': {
      const def = STATUSES[c.status]
      const n = c.stacks && c.stacks > 1 ? ` (${c.stacks} charges ou plus)` : ''
      return `${whom(c.who)} porte ${def.name}${n}`
    }
    case 'lacksStatus':
      return `${whom(c.who)} ne porte pas ${STATUSES[c.status].name}`
    case 'fromTurn':
      return `à partir du tour ${c.turn}`
  }
}

/** « de » élidé devant une voyelle : « de Poison », « d'Aura de rancune ». */
export const deName = (name: string) => (/^[aeiouyàâéèêëîïôûüh]/i.test(name) ? `d'${name}` : `de ${name}`)

/** Une pastille d'une compétence (forme, coup sacrifié, condition…) et la règle commune qu'elle cite. */
export interface SkillTag {
  label: string
  rule: RuleId
}

export interface SkillDescription {
  /** L'effet, une phrase par effet */
  text: string
  /** Les pastilles, dans l'ordre de lecture */
  tags: SkillTag[]
  /** Les statuts que la compétence pose (ou relâche, Rétribution), avec leur cible : une pastille qui mène au statut */
  posed: { status: StatusId; target: Target }[]
}

/**
 * Ce que fait une compétence, en clair. C'est la seule rédaction d'une compétence : le compendium (index et
 * fiche) et l'infobulle des dés l'affichent depuis cette source. Ce qui relève d'une règle commune (coup
 * sacrifié, double, dégâts directs, plafond, conditions…) n'est pas répété dans le texte : c'est une pastille
 * qui cite la règle. `formName` : le nom de la forme requise (personnage à formes), affiché en pastille.
 */
export function describeSkill(e: CharacterEvent, formName?: string): SkillDescription {
  const r = e.reshapesHit
  const face = doubleFace(e.trigger)
  const effects = e.effects.map((effect, k) => {
    // Un vrai coup qui doit toucher (Pourfendre) : ses effets n'arrivent que s'il touche
    const touch = e.needsTouch && k === 0 ? "s'il touche, " : ''
    if (effect.type !== 'applyStatus') return `${touch}${describeEffect(effect)}`
    const def = STATUSES[effect.status]
    const turns = effect.turns ?? (def.turnsFromStacks ? effect.stacks : undefined)
    const text = lowerFirst(def.describe({ id: effect.status, stacks: effect.stacks, turns }))
    // Le texte d'un statut parle de son porteur, sans le nommer : posé sur l'adversaire, on dit qui le subit
    // (« Perd 3 PV… » se lisait comme une perte du lanceur ; retour de l'utilisateur, 2026-10-21). Posé par un coup
    // qui touche, un statut qui réagit aux coups reçus ne réagit pas à celui-ci : il agit dès le coup suivant (règle 9,
    // la plaie de Pourfendre coule au prochain coup qui touche l'adversaire).
    if (effect.target !== 'opponent') return `${touch}${text}`
    return `${touch}sur l'adversaire${e.needsTouch && def.reactions?.hurt ? ', dès le coup suivant' : ''} : ${text}`
  })
  const parts = [
    e.volley ? (e.merged ? `un seul coup de ${e.volley * (face ?? 0)}` : `${e.volley} coups de ${face}`) : '',
    e.needsTouch ? 'frappe pour la valeur du dé' : '',
    r ? (r.value === 'max' ? 'frappe pour la valeur maximale de son dé' : `relance son dé et frappe pour ${r.bonus ?? 0} de plus`) : '',
    ...effects,
  ]
    .filter(Boolean)
    .map((p) => `${p.charAt(0).toUpperCase()}${p.slice(1)}.`)
  const posedIds = e.effects.flatMap((effect) => (effect.type === 'applyStatus' ? [effect.status] : []))
  const direct = e.effects.some((x) => x.type === 'damage' || x.type === 'release' || (x.type === 'cleanse' && x.orElse?.type === 'damage'))
  const caps = [...new Set(posedIds)].flatMap((id) => {
    const def = STATUSES[id]
    return !def.mechanic && def.maxStacks !== undefined && def.maxStacks > 1 ? [{ label: `${def.name} : ${def.maxStacks} charges au plus`, rule: 'max-stacks' as const }] : []
  })
  const tags: SkillTag[] = [
    ...(formName ? [{ label: formName, rule: 'forms' as const }] : []),
    // Au début du combat : avant le premier tour, quel que soit le vainqueur de l'initiative (règle « Initiative »)
    ...(e.trigger === 'combatStart' ? [{ label: 'avant le premier tour', rule: 'initiative' as const }] : []),
    ...(e.forfeitsHit ? [{ label: 'coup sacrifié', rule: 'forfeit' as const }] : []),
    ...(e.needsTouch ? [{ label: "s'il touche", rule: 'needs-touch' as const }] : []),
    ...(r ? [{ label: r.noCrit ? 'coup transformé, jamais critique' : 'coup transformé', rule: 'reshape' as const }] : []),
    ...(e.volley ? [{ label: e.merged ? 'coups fondus en un' : 'double qui frappe', rule: 'volley' as const }] : []),
    // Un double sans coups à lui remplace les deux coups de l'action : ce tour-là, rien ne frappe
    ...(face !== undefined && !e.volley ? [{ label: 'remplace les deux coups', rule: 'twin-dice' as const }] : []),
    ...(direct ? [{ label: 'dégâts directs', rule: 'direct-damage' as const }] : []),
    ...(posedIds.some((id) => STATUSES[id].look?.aura) ? [{ label: 'aura permanente', rule: 'auras' as const }] : []),
    ...caps,
    ...(e.when ?? []).map((c) => ({ label: `si ${describeCondition(c)}`, rule: 'conditions' as const })),
    ...(e.chance !== undefined && e.chance < 1 ? [{ label: `${Math.round(e.chance * 100)} % de chances`, rule: 'skill' as const }] : []),
    ...(e.limit !== undefined ? [{ label: `${e.limit} fois max. par combat`, rule: 'skill' as const }] : []),
  ]
  return {
    text: parts.join(' '),
    tags,
    posed: e.effects.flatMap((effect) =>
      effect.type === 'applyStatus' ? [{ status: effect.status, target: effect.target ?? 'self' }] : effect.type === 'release' ? [{ status: effect.status, target: 'self' as const }] : [],
    ),
  }
}

/** Une compétence en une ligne (rapports, tests) : son texte, puis ses pastilles. Même source que l'écran. */
export function describeEvent(e: CharacterEvent) {
  const { text, tags } = describeSkill(e)
  return [text, ...tags.map((t) => t.label)].filter(Boolean).join(' · ')
}
