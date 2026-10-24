import type { DamageSource } from './damage'
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

/** Les déclencheurs nommés : ceux du roster, des statuts et des reliques, libellés dans `TRIGGERS`. */
export type NamedTrigger =
  | 'combatStart'
  | 'turnStart'
  | 'turnEnd'
  | 'naturalOne'
  | 'naturalTwo'
  | 'naturalThree'
  | 'naturalMax'
  | 'hit'
  | 'crit'
  | 'missed'
  | 'dodge'
  | 'hurt'
  | 'healed'
  | 'bloodied'

/**
 * Une face au-delà de 3 (0.88.0, forge du dé, docs/CAMPAGNE.md § 4) : `face:4` se déclenche sur un 4 au dé.
 * Les faces 1 à 3 gardent leur nom (`naturalOne`…) : une face n'a qu'un seul déclencheur (`faceTrigger`).
 */
export type FaceTrigger = `face:${number}`

export type Trigger = NamedTrigger | FaceTrigger

/**
 * Libellés affichés : `label` en toutes lettres, `short` pour un index (« dé 1 »). L'ordre d'évaluation sur un
 * même coup est fixé par le moteur (combat.ts, étape 4). Un déclencheur de face se lit avec `triggerText`.
 */
export const TRIGGERS: Record<NamedTrigger, { label: string; short: string }> = {
  combatStart: { label: 'Au début du combat', short: 'début du combat' },
  turnStart: { label: 'Au début de chacun de ses tours', short: 'début de tour' },
  turnEnd: { label: 'À la fin de chacun de ses tours', short: 'fin de tour' },
  naturalOne: { label: 'Sur un 1 au dé', short: 'dé 1' },
  naturalTwo: { label: 'Sur un 2 au dé', short: 'dé 2' },
  naturalThree: { label: 'Sur un 3 au dé', short: 'dé 3' },
  naturalMax: { label: 'Sur un 6 au dé (jet maximal)', short: 'dé max.' },
  hit: { label: 'Quand il touche', short: 'touche' },
  crit: { label: 'Quand il porte un critique', short: 'critique' },
  missed: { label: 'Quand son coup est esquivé', short: 'esquivé' },
  dodge: { label: 'Quand il esquive', short: 'esquive' },
  hurt: { label: 'Quand il encaisse un coup', short: 'coup encaissé' },
  // Lot des consommateurs (docs/PROGRESSION.md § 13.3) : après l'étape qui lui a rendu des PV (soin, vol de vie, repli
  // d'une purge), jamais sur un soin nul (PV déjà pleins)
  healed: { label: 'Quand il regagne des PV', short: 'soin reçu' },
  bloodied: { label: 'La première fois qu’il passe sous la moitié de ses PV', short: 'mi-PV' },
}

/** Le libellé de n'importe quel déclencheur, faces de la forge comprises. */
export function triggerText(t: Trigger): { label: string; short: string } {
  if (t in TRIGGERS) return TRIGGERS[t as NamedTrigger]
  const face = rollFace(t)
  return { label: `Sur un ${face} au dé`, short: `dé ${face}` }
}

/** Cible d'un effet, relative au porteur de l'événement. */
export type Target = 'self' | 'opponent'

export type Effect =
  | { type: 'heal'; amount: number; target?: Target }
  /**
   * Dégâts directs : ignorent l'armure, l'esquive et les boucliers, et ne sont jamais critiques. Ce ne sont pas
   * des coups : rien de ce qui réagit à un coup (touche, encaisse) ne part. `hits` (0.76.0, Foudre) : une donnée
   * d'affichage, `hits` fois `amount` appliqués en une seule perte ; l'écran en fait autant d'impacts.
   * `source` : ce que sont ces dégâts dans l'histoire (damage.ts), d'où leur type, DP, DM ou DT ; sans effet sur la règle.
   */
  | { type: 'damage'; amount: number; hits?: number; target?: Target; source: DamageSource }
  /**
   * Pose un statut. `fromHit` (Pourfendre, 0.107.0) : des charges en plus, la part `fromHit` des PV que le coup de ce jet
   * a retirés, arrondie au-dessus (une compétence qui modifie son coup part s'il touche) ; `stacks` s'y ajoute (0 permis).
   * `power` (0.110.0) : l'intensité que les rangs d'aiguisage donnent au statut (`Status.power`, axe `power`).
   */
  | { type: 'applyStatus'; status: StatusId; stacks: number; turns?: number; target?: Target; fromHit?: number; power?: number }
  /**
   * Retire des statuts d'une polarité, avec toutes leurs charges : tous, ou seulement les `count` derniers
   * apparus (un statut renforcé garde son rang). Les mécanismes de compétence et de forme ne se retirent pas.
   * `orElse` : effet joué à la place quand il n'y a rien à retirer (Purification, 0.42.0 : la lumière blesse au
   * lieu de tomber à vide).
   */
  | { type: 'cleanse'; polarity: Polarity; target?: Target; count?: number; orElse?: Exclude<Effect, { type: 'cleanse' }> }
  /**
   * Relâche un statut à jauges (Rétribution) : la somme de ses jauges en dégâts directs à l'adversaire, ou sa part
   * `share` arrondie au-dessous (0.107.0 : la moitié), au moins `min`, puis le statut est vidé. Le porteur ne remplit ses
   * jauges que s'il a cet effet. `source` : comme `damage`.
   */
  | { type: 'release'; status: StatusId; min: number; share?: number; target?: Target; source: DamageSource }

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
   * Le coup en cours a retiré au moins `amount` PV (Écu cabossé : un coup de 6 ou plus). Vraie seulement dans les
   * fenêtres d'un coup qui touche (`hit`, `crit`, `hurt`), où ce nombre existe.
   */
  | { type: 'hitAtLeast'; amount: number }

/**
 * Nature d'une compétence, pour sa présentation seulement (couleur de sa carte, design system) :
 * martiale (force du corps ou de l'arme), adresse (agilité, précision, ruse, chance), arcane (magie,
 * foi, nature, mort) ou neutre (ni l'un ni l'autre). Sans effet sur le combat.
 */
export type SkillNature = 'martial' | 'finesse' | 'arcane' | 'neutral'

/** Nature retenue quand une compétence n'en déclare pas : l'arcane, le violet des cartes d'avant. */
export const DEFAULT_SKILL_NATURE: SkillNature = 'arcane'

/** Le dé de tous les combattants (règles v2) : un d6, dont le jet désigne une face. Il ne fait aucun dégât. */
export const DIE_FACES = 6

/**
 * La relation d'une compétence du dé au coup de base (règles v2, phase 5 bis, docs/RESOLUTION.md § 3 bis) :
 * - `graft` (défaut) : au jet, la compétence se résout, puis le coup de base part ;
 * - `modify` : le coup de base part ; s'il touche, la compétence se déclenche (Pourfendre, Pile ou face), ou elle change
 *   la valeur de ce coup (Crescendo, Soliste : `hitMultiplier`) ;
 * - `replace` : pas de coup de base ; la compétence fournit ses propres coups (Furie des vents, Coup de chance).
 */
export type HitRelation = 'graft' | 'modify' | 'replace'

/**
 * L'axe de rang d'une compétence (E1, 0.110.0, docs/SORTS.md § 20) : ce qu'un rang d'aiguisage lui ajoute, `per` par
 * rang, choisi dans son esprit et réglé pour qu'un rang vaille de +3 à +8 points de victoire (« un rang ajoute moins »).
 * La forge le lit (`forge.ts`, `sharpen`) ; il ne connaît aucun plafond : chaque rang ajoute quelque chose.
 * - `stacks` : charges du statut qu'elle pose (son premier `applyStatus`) ;
 * - `amount` : dégâts ou soin de son effet, repli d'une purge compris (Foudre : chaque éclair) ;
 * - `power` : intensité du statut qu'elle pose (`Status.power`) ; ce qu'elle vaut, le statut le dit (`StatusDef.power`) ;
 * - `multiplier` : son coup ×N, `per` de plus (Soliste, Crescendo) ;
 * - `limit` : `per` fois de plus par combat (Peur) ;
 * - `share` : la part relâchée, `per` de plus (Rétribution).
 */
export interface RankAxis {
  kind: 'stacks' | 'amount' | 'power' | 'multiplier' | 'limit' | 'share'
  per: number
}

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
   * Relation au coup de base (défaut : `graft`). Réservé aux déclencheurs du dé ; `replace` sans `chance` (le moteur
   * doit savoir dès le jet si le coup part).
   */
  relation?: HitRelation
  /**
   * Crescendo, Soliste (avec `relation: 'modify'`, sans `chance`) : ce coup ×N. La valeur du coup de base de ce jet est
   * multipliée, avant les bonus de relique, la dorure et le critique (docs/RESOLUTION.md § 3, étape 1 bis).
   */
  hitMultiplier?: number
  /**
   * Crescendo (0.107.0, avec `hitMultiplier`) : le multiplicateur gagne +1 chaque fois que la compétence part (son coup a
   * touché), pour le reste du combat : ×2, puis ×3, ×4… Soliste, lui, reste à ×3.
   */
  buildsUp?: true
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
  /** Ce qu'un rang d'aiguisage lui ajoute (0.110.0). Toute compétence du dé du roster en déclare un (`validateRoster`). */
  rankAxis?: RankAxis
}

/** La relation d'une compétence au coup de base, `graft` par défaut. */
export const relationOf = (e: Pick<CharacterEvent, 'relation'>): HitRelation => e.relation ?? 'graft'

/**
 * Demi-rang (0.110.0, axe de rang à `per: 0.5`) : une quantité fractionnaire d'une compétence aiguisée (charges,
 * intensité, dégâts ou soin) se paie en entier, une fois sur deux, dès la première : la k-ième fois que la compétence
 * part, ⌈q·k⌉ − ⌈q·(k − 1)⌉ (1,5 charge : 2, 1, 2, 1…). Une quantité entière part telle quelle.
 */
export const paidOnFire = (q: number, k: number) => (Number.isInteger(q) ? q : Math.ceil(q * k) - Math.ceil(q * (k - 1)))

/**
 * Les quantités d'effets (charges, intensité, dégâts, soin), passées par `pay` quand l'une est fractionnaire. `atPose` :
 * une intensité qui se paie à chaque action de son statut (`powerPaidOnAction`, une aura) reste telle quelle.
 */
function mapQuantities(effects: readonly Effect[], pay: (q: number) => number, atPose = false): Effect[] {
  return effects.map((x) => {
    switch (x.type) {
      case 'applyStatus': {
        const power = x.power !== undefined && !(atPose && STATUSES[x.status].powerPaidOnAction) ? pay(x.power) : x.power
        return Number.isInteger(x.stacks) && power === x.power ? x : { ...x, stacks: pay(x.stacks), ...(power !== undefined && { power }) }
      }
      case 'heal':
      case 'damage':
        return Number.isInteger(x.amount) ? x : { ...x, amount: pay(x.amount) }
      default:
        return x
    }
  })
}

/**
 * Les effets d'une compétence (ou d'une action de statut) tels qu'ils partent la k-ième fois (k ≥ 1) : ses demi-rangs
 * payés en entier ; à la pose d'une compétence (`atPose`), l'intensité d'une aura attend ses actions.
 */
export const effectsOnFire = (effects: readonly Effect[], k: number, atPose = false) => mapQuantities(effects, (q) => paidOnFire(q, k), atPose)

/** Ce qu'un demi-rang ajoute une fois sur deux à un effet, en clair ; vide sans demi-rang. */
function halfRankNote(effect: Effect): string {
  const often = 'une fois sur deux, dès la première'
  if (effect.type === 'applyStatus') {
    if (!Number.isInteger(effect.stacks)) return `+1 ${STATUSES[effect.status].name} ${often}`
    if (!Number.isInteger(effect.power ?? 0)) return `${STATUSES[effect.status].power?.(1) ?? '+1'} ${often}`
  }
  if ((effect.type === 'damage' || effect.type === 'heal') && !Number.isInteger(effect.amount))
    return `+1${effect.type === 'damage' && effect.hits ? ` à chacun des ${effect.hits} coups` : effect.type === 'heal' ? ' PV' : ''} ${often}`
  return ''
}

/** Déclencheurs nommés liés à la valeur du dé, connus dès le jet (reliques de coup). */
export const ROLL_TRIGGERS: readonly NamedTrigger[] = ['naturalOne', 'naturalTwo', 'naturalThree', 'naturalMax']

const NATURAL_FACES: readonly NamedTrigger[] = ['naturalOne', 'naturalTwo', 'naturalThree']

/** Le seul déclencheur d'une face du dé : `naturalOne` à `naturalThree`, puis `face:4`, `face:5`… */
export const faceTrigger = (face: number): Trigger => NATURAL_FACES[face - 1] ?? `face:${face}`

/** La face d'un déclencheur de face (naturalTwo : 2, face:7 : 7), ou undefined (le jet maximal n'a pas de face fixe). */
export function rollFace(t: Trigger): number | undefined {
  const named = NATURAL_FACES.indexOf(t as NamedTrigger)
  if (named >= 0) return named + 1
  return t.startsWith('face:') ? Number(t.slice(5)) : undefined
}

/** Déclencheur du dé : une face, ou le jet maximal. */
export const isRollTrigger = (t: Trigger) => t === 'naturalMax' || rollFace(t) !== undefined

/** Le déclencheur du dé correspond-il à ce jet ? */
export function rollMatches(trigger: Trigger, roll: number, faces: number) {
  if (trigger === 'naturalMax') return roll === faces && faces > 1
  return rollFace(trigger) === roll
}

const who = (target: Target | undefined) => (target === 'opponent' ? "à l'adversaire" : '')

const pct = (ratio: number) => `${Math.round(ratio * 100)} %`

export function describeEffect(effect: Effect): string {
  const on = who(effect.target)
  switch (effect.type) {
    case 'heal':
      return effect.target === 'opponent' ? `soigne l'adversaire de ${effect.amount} PV` : `+${effect.amount} PV`
    case 'damage':
      return effect.hits
        ? `${effect.hits} × ${effect.amount} ${effect.amount > 1 ? 'dégâts directs' : 'dégât direct'}${on ? ` ${on}` : ' à soi-même'} (${effect.hits * effect.amount} en tout)`
        : `${effect.amount} dégâts directs${on ? ` ${on}` : ' à soi-même'}`
    case 'applyStatus': {
      const def = STATUSES[effect.status]
      // Pourfendre : des charges tirées du coup, que la définition ne connaît pas
      if (effect.fromHit !== undefined)
        return `${def.name}${effect.target === 'opponent' ? " sur l'adversaire" : ''} : ${effect.fromHit === 0.5 ? 'la moitié' : pct(effect.fromHit)} des PV retirés (arrondie au-dessus)${effect.stacks ? `, plus ${effect.stacks}` : ''}${def.reactions?.hurt ? ' ; il coule dès le coup suivant' : ''}`
      const turns = effect.turns ?? (def.turnsFromStacks ? effect.stacks : undefined)
      const status = { id: effect.status, stacks: effect.stacks, turns, power: effect.power }
      return `${def.name}${on ? ` ${on}` : ''} : ${lowerFirst(def.describe(status))}`
    }
    case 'release': {
      const share = effect.share === undefined ? 'la somme de ses jauges' : `${effect.share === 0.5 ? 'la moitié' : pct(effect.share)} de ses jauges (arrondie au-dessous, au moins ${effect.min})`
      return `relâche ${share} en dégâts directs${on ? ` ${on}` : ''}, puis les vide`
    }
    case 'cleanse': {
      const kind = effect.polarity === 'negative' ? 'malus' : 'bonus'
      const orElse = effect.orElse ? ` ; sinon, ${describeEffect(effect.orElse)}` : ''
      // « Le dernier posé » : le dernier apparu, avec toutes ses charges (un statut renforcé garde son rang : règle « Bonus et malus »)
      const whose = effect.target === 'opponent' ? "à l'adversaire son" : 'son propre'
      if (effect.count === undefined) return `retire ${effect.target === 'opponent' ? `tous les ${kind} de l'adversaire` : `tous ses ${kind}`}${orElse}`
      const what = effect.count === 1 ? `${whose} dernier ${kind} posé` : `${whose.replace(/son( propre)?$/, 'ses')} ${effect.count} derniers ${kind} posés`
      return `retire ${what}${orElse}`
    }
  }
}

const whom = (who: Target) => (who === 'opponent' ? "l'adversaire" : 'il')

export function describeCondition(c: Condition): string {
  switch (c.type) {
    case 'hpBelow':
      return `${whom(c.who)} est sous ${pct(c.ratio)} de ses PV`
    case 'hpAtLeast':
      return `${whom(c.who)} a au moins ${pct(c.ratio)} de ses PV`
    case 'hasStatus': {
      const def = STATUSES[c.status]
      return `${whom(c.who)} porte ${c.stacks && c.stacks > 1 ? `${c.stacks} ${def.name} ou plus` : def.name}`
    }
    case 'lacksStatus':
      return `${whom(c.who)} ne porte pas ${STATUSES[c.status].name}`
    case 'fromTurn':
      return `à partir du tour ${c.turn}`
    case 'hitAtLeast':
      return `ce coup retire ${c.amount} PV ou plus`
  }
}

/** « de » élidé devant une voyelle : « de Poison », « d'Aura de rancune ». */
export const deName = (name: string) => (/^[aeiouyàâéèêëîïôûüh]/i.test(name) ? `d'${name}` : `de ${name}`)

/** Une pastille d'une compétence (forme, relation au coup, condition…) et la règle commune qu'elle cite. */
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
 * fiche) et l'infobulle des dés l'affichent depuis cette source. Ce qui relève d'une règle commune (relation au coup
 * de base, dégâts directs, plafond, conditions…) n'est pas répété dans le texte : c'est une pastille
 * qui cite la règle. `formName` : le nom de la forme requise (personnage à formes), affiché en pastille.
 */
export function describeSkill(e: CharacterEvent, formName?: string): SkillDescription {
  const relation = relationOf(e)
  const modifies = relation === 'modify'
  const graftedOnDie = relation === 'graft' && isRollTrigger(e.trigger)
  // Un demi-rang (0.110.0) : le texte dit la quantité entière, puis le +1 qu'elle gagne une fois sur deux
  const effects = mapQuantities(e.effects, Math.floor).map((effect, k) => {
    // Une compétence qui modifie son coup (Pourfendre) : ses effets n'arrivent que s'il touche
    const touch = modifies && k === 0 ? "s'il touche, " : ''
    const note = halfRankNote(e.effects[k])
    const noted = (text: string) => (note ? `${text} ; ${note}` : text)
    // Pourfendre (`fromHit`) : ses charges viennent du coup, la phrase de l'effet le dit
    if (effect.type !== 'applyStatus' || effect.fromHit !== undefined) return noted(`${touch}${describeEffect(effect)}`)
    const def = STATUSES[effect.status]
    const turns = effect.turns ?? (def.turnsFromStacks ? effect.stacks : undefined)
    const status = { id: effect.status, stacks: effect.stacks, turns, power: effect.power }
    // Greffé sur son lanceur, il agit sur le coup de ce jet (Œil de faucon, Vol de vie : « ce coup », revue 0.110.0)
    const text = lowerFirst(effect.target !== 'opponent' && graftedOnDie && def.grafted ? def.grafted(status) : def.describe(status))
    // Le texte d'un statut parle de son porteur, sans le nommer : posé sur l'adversaire, on dit qui le subit
    // (« Perd 3 PV… » se lisait comme une perte du lanceur ; retour de l'utilisateur, 2026-10-21). Posé par un coup
    // qui touche, un statut qui réagit aux coups reçus ne réagit pas à celui-ci : il agit dès le coup suivant (règle 9,
    // la plaie de Pourfendre coule au prochain coup qui touche l'adversaire).
    if (effect.target !== 'opponent') return noted(`${touch}${text}`)
    return noted(`${touch}sur l'adversaire${modifies && def.reactions?.hurt ? ', dès le coup suivant' : ''} : ${text}`)
  })
  const boost = e.hitMultiplier ? `coup de base ×${e.hitMultiplier}${e.buildsUp ? ', puis ×1 de plus à chaque fois qu’il touche' : ''}` : ''
  const parts = [boost, ...effects]
    .filter(Boolean)
    .map((p) => `${p.charAt(0).toUpperCase()}${p.slice(1)}.`)
  const posedIds = e.effects.flatMap((effect) => (effect.type === 'applyStatus' ? [effect.status] : []))
  const direct = e.effects.some((x) => x.type === 'damage' || x.type === 'release' || (x.type === 'cleanse' && x.orElse?.type === 'damage'))
  const caps = [...new Set(posedIds)].flatMap((id) => {
    const def = STATUSES[id]
    if (def.mechanic) return []
    // Le cumul de chaque statut posé, en pastille (revue 0.110.0, T7) : un plafond de 1 vaut une pose qui remplace
    const cumul = def.stacking === 'add' && def.maxStacks !== 1 ? { label: 'se cumule', rule: 'stacking-add' as const } : { label: 'non cumulable', rule: 'stacking-refresh' as const }
    return def.maxStacks !== undefined && def.maxStacks > 1 ? [cumul, { label: `${def.name} : ${def.maxStacks} charges au plus`, rule: 'max-stacks' as const }] : [cumul]
  })
  // Une compétence du dé dit sa relation au coup de base : se greffer est la règle, elle n'a pas de pastille
  const onDie = isRollTrigger(e.trigger)
  const tags: SkillTag[] = [
    ...(formName ? [{ label: formName, rule: 'forms' as const }] : []),
    // Au début du combat : avant le premier tour, quel que soit le vainqueur de l'initiative (règle « Initiative »)
    ...(e.trigger === 'combatStart' ? [{ label: 'avant le premier tour', rule: 'initiative' as const }] : []),
    ...(onDie && modifies ? [{ label: 'modifie son coup', rule: 'hit-relations' as const }] : []),
    ...(onDie && relation === 'replace' ? [{ label: 'remplace le coup', rule: 'hit-relations' as const }] : []),
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
