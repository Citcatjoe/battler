import type { DamageSource } from './damage'
import type { SceneEventId } from './scenes'
import type { RuleId } from './rules'
import { lowerFirst, STATUSES, type Polarity, type StatusId } from './statuses'
import { typeset } from './typography'

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
  | 'auraDue'
  | 'naturalOne'
  | 'naturalTwo'
  | 'naturalThree'
  | 'naturalMax'
  | 'hit'
  | 'crit'
  | 'heavy'
  | 'missed'
  | 'dodge'
  | 'hurt'
  | 'critHurt'
  | 'healed'
  | 'bloodied'
  | 'shieldBroken'
  | 'reflected'
  | 'heads'

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
  // L'aura de départ au rendez-vous (2026-10-27 ; réarmé après une dissipation, D8 du 2026-10-30) : réservé au moteur,
  // aucune compétence ne le déclare
  auraDue: { label: 'Au début de son 3e tour, ou de son 2e tour après sa dissipation, son aura de départ absente', short: 'aura due' },
  naturalOne: { label: 'Sur un 1 au dé', short: 'dé 1' },
  naturalTwo: { label: 'Sur un 2 au dé', short: 'dé 2' },
  naturalThree: { label: 'Sur un 3 au dé', short: 'dé 3' },
  naturalMax: { label: 'Sur un 6 au dé (jet maximal)', short: 'dé max.' },
  hit: { label: 'Quand il touche', short: 'touche' },
  crit: { label: 'Quand il porte un critique', short: 'critique' },
  // Retour du 2026-10-27 (quatrième, contenu des maîtrises) : le gros coup de la Fureur, un critique ou un coup ×2 et plus
  // qui touche (Assaut, Soliste, Crescendo), juste après la fenêtre du critique
  heavy: { label: 'Quand il porte un gros coup (critique, ou coup ×2 et plus)', short: 'gros coup' },
  missed: { label: 'Quand son coup est esquivé', short: 'esquivé' },
  dodge: { label: 'Quand il esquive', short: 'esquive' },
  hurt: { label: 'Quand il reçoit un coup', short: 'coup reçu' },
  // Retour du 30 octobre (D9, la Rage) : le coup reçu est un critique, juste après la fenêtre `hurt`
  critHurt: { label: 'Quand il encaisse un critique', short: 'critique reçu' },
  // Lot des consommateurs (docs/PROGRESSION.md § 13.3) : après l'étape qui lui a rendu des PV (soin, vol de vie, repli
  // d'une purge), jamais sur un soin nul (PV déjà pleins)
  healed: { label: 'Quand il regagne des PV', short: 'soin reçu' },
  bloodied: { label: 'La première fois qu’il passe sous la moitié de ses PV', short: 'mi-PV' },
  // Phase 8, second lot : trois moments de famille, ajoutés une fois pour toutes (FAMILLES.md § 7). Le bouclier vidé
  // (Garde) : un coup qui touche le porteur vide son armure temporaire ; les dégâts renvoyés (Représailles) : après
  // l'étape qui renvoie (Riposte, Rétribution) ; pile (Fortune) : sa pièce tombe sur pile
  shieldBroken: { label: 'Quand son armure temporaire est vidée', short: 'armure vidée' },
  reflected: { label: 'Quand il renvoie des dégâts', short: 'dégâts renvoyés' },
  heads: { label: 'Quand sa pièce tombe sur pile', short: 'pile' },
}

/** Le libellé de n'importe quel déclencheur, faces de la forge comprises. */
export function triggerText(t: Trigger): { label: string; short: string } {
  if (t in TRIGGERS) return TRIGGERS[t as NamedTrigger]
  const face = rollFace(t)
  return { label: `Sur un ${face} au dé`, short: `dé ${face}` }
}

/** Cible d'un effet, relative au porteur de l'événement. */
export type Target = 'self' | 'opponent'

/**
 * Une valeur lue sur un statut (Virulence, 0.114.0 ; Sangsue, Agonie, 2026-10-27) : `factor` fois les charges de `status`
 * que porte `who` (relatif au porteur), lues quand l'effet part. Elle s'ajoute à la valeur de l'effet (0 permis).
 */
export interface StatusRead {
  status: StatusId
  who: Target
  factor: number
}

export type Effect =
  /** Soin. `fromStatus` (Sangsue, 2026-10-27) : des PV en plus, lus sur un statut (`StatusRead`) */
  | { type: 'heal'; amount: number; target?: Target; fromStatus?: StatusRead }
  /**
   * Dégâts directs : ignorent l'armure, l'esquive et les boucliers, et ne sont jamais critiques. Ce ne sont pas
   * des coups : rien de ce qui réagit à un coup (touche, encaisse) ne part. `hits` (0.76.0, Foudre) : une donnée
   * d'affichage, `hits` fois `amount` appliqués en une seule perte ; l'écran en fait autant d'impacts.
   * `source` : ce que sont ces dégâts dans l'histoire (damage.ts), d'où leur famille (DT ou non) et leur teinte ; sans effet sur la règle.
   * `armored` (2026-10-27, M4, Clous de pavois) : ils se heurtent à l'armure de leur cible, comme un coup (étape 7 de la
   * chaîne) : moins son armure effective, au moins 1 par impact ; ni esquive, ni critique, ni armure temporaire.
   * `fromStatus` (Agonie, 2026-10-27) : des PV en plus, lus sur un statut (`StatusRead`).
   */
  | { type: 'damage'; amount: number; hits?: number; target?: Target; source: DamageSource; armored?: boolean; fromStatus?: StatusRead }
  /**
   * Pose un statut. `fromHit` (Pourfendre, 0.107.0) : des charges en plus, la part `fromHit` des PV que le coup de ce jet
   * a retirés, arrondie au-dessus (une compétence qui modifie son coup part s'il touche) ; `stacks` s'y ajoute (0 permis).
   * `fromStatus` (Virulence, 0.114.0) : des charges en plus, `factor` fois les charges de `status` que porte `who`
   * (relatif au porteur), lues au déclenchement ; `stacks` s'y ajoute (0 permis). Le Poison de l'adversaire, `factor` 2,
   * sur l'adversaire : son Poison triplé.
   * `power` (0.110.0) : l'intensité que les rangs d'aiguisage donnent au statut (`Status.power`, axe `power`).
   */
  | {
      type: 'applyStatus'
      status: StatusId
      stacks: number
      turns?: number
      target?: Target
      fromHit?: number
      fromStatus?: StatusRead
      power?: number
    }
  /**
   * Retire des statuts d'une polarité, avec toutes leurs charges : tous, ou seulement les `count` derniers
   * apparus (un statut renforcé garde son rang). Les mécanismes de compétence et de forme ne se retirent pas.
   * `orElse` : effet joué à la place quand il n'y a rien à retirer (Purification, 0.42.0 : la lumière blesse au
   * lieu de tomber à vide). `andThen` : effet joué après une purge qui a retiré quelque chose (Purification,
   * 2026-10-27 : elle blesse aussi quand elle retire un bonus) ; le moteur le range juste après la purge.
   * `steal` (Larcin, quatrième retour du 2026-10-27) : un vol, qui ne vise que les bonus volables (`isStealable` : de la
   * zone des statuts, jamais une aura ; retour du 2026-10-28, A6) ; le bonus retiré passe entier au porteur de l'effet
   * (charges, durée, intensité), selon ses règles de pose, marqué volé par ce statut (`stolenBy`).
   */
  | {
      type: 'cleanse'
      polarity: Polarity
      target?: Target
      count?: number
      orElse?: Exclude<Effect, { type: 'cleanse' }>
      andThen?: Exclude<Effect, { type: 'cleanse' }>
      steal?: StatusId
    }
  /**
   * Relâche un statut d'un coup, puis le retire. Le sien (défaut, Rétribution) : la somme de ses jauges en dégâts directs
   * à l'adversaire, ou sa part `share` arrondie au-dessous (0.107.0 : la moitié), au moins `min` ; le porteur ne remplit ses
   * jauges que s'il a cet effet. Celui de l'adversaire (`from: 'opponent'`, Embrasement, phase 8) : tout ce qu'il lui
   * ferait encore perdre (`StatusDef.releases`, la Brûlure : ses PV par tour × ses tours), ×`share`. `source` : comme
   * `damage`. `per` (Onde de choc, quatrième retour du 2026-10-27) : ses jauges se comptent, `per` PV par jauge remplie, en
   * une perte de dégâts directs (pas de renvoi).
   */
  | { type: 'release'; status: StatusId; min: number; share?: number; per?: number; from?: Target; target?: Target; source: DamageSource }

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
 * Nature d'une compétence : martiale (force du corps ou de l'arme), adresse (agilité, précision, ruse, chance), arcane
 * (magie, foi, nature, mort) ou neutre (ni l'un ni l'autre). Elle ne colore plus rien (retour du 2026-10-30 : toutes les
 * compétences ont le même tour violet). Une compétence arcane est un sort (`isSpell`, le mot-clé « sort » du second
 * retour du 2026-10-30, D29) ; un maléfice arcane fait incanter son lanceur (`castsSpell`, poses.ts).
 */
export type SkillNature = 'martial' | 'finesse' | 'arcane' | 'neutral'

/** Nature retenue quand une compétence n'en déclare pas : l'arcane. */
export const DEFAULT_SKILL_NATURE: SkillNature = 'arcane'

/**
 * Le mot-clé « sort » (D29, 2026-10-30) : une compétence arcane, quelle que soit sa maîtrise (la foudre, le feu, les
 * chants, la lumière, les malédictions). Une étiquette qui traverse les maîtrises, lue par la pastille « sort » de sa
 * description (règle « Sorts ») ; toute compétence qui blesse par une source magique (`DAMAGE_SOURCES.magical`) en est
 * un (modules.test.ts). Aucune règle de combat ne la lit encore.
 */
export const isSpell = (e: Pick<CharacterEvent, 'nature'>) => (e.nature ?? DEFAULT_SKILL_NATURE) === 'arcane'

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
 * rang, un entier ≥ 1 (0.111.0 : plus de demi-rang), choisi dans son esprit et réglé pour qu'un rang vaille de +3 à +8
 * points de victoire (« un rang ajoute moins »). La forge le lit (`forge.ts`, `sharpen`) ; il ne connaît aucun plafond :
 * chaque rang ajoute quelque chose.
 * - `stacks` : charges du statut qu'elle pose (son premier `applyStatus`) ;
 * - `amount` : dégâts ou soin de son effet, repli d'une purge compris (Foudre : chaque éclair) ; `on` le limite à un seul
 *   genre d'effet (Lumière sacrée : son soin seul) ;
 * - `power` : intensité du statut qu'elle pose (`Status.power`) ; ce qu'elle vaut, le statut le dit (`StatusDef.power`) ;
 * - `multiplier` : son coup ×N, `per` de plus (Soliste, Crescendo) ;
 * - `limit` : `per` fois de plus par combat (Peur) ;
 * - `share` : la part relâchée, `per` points de pourcentage de plus (Rétribution).
 */
export interface RankAxis {
  kind: 'stacks' | 'amount' | 'power' | 'multiplier' | 'limit' | 'share'
  per: number
  /** `amount` : le seul genre d'effet qui gagne le montant (sans : dégâts et soins) */
  on?: 'heal' | 'damage'
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
  /** Nature de la compétence (défaut : DEFAULT_SKILL_NATURE) : une compétence arcane est un sort (`isSpell`). */
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

const pct = (ratio: number) => `${Math.round(ratio * 100)} %`

/** Un statut multiplié (Virulence) : « double », « triple »… ; au-delà, « multiplie par N ». */
const MULTIPLY: Record<number, string> = { 2: 'double', 3: 'triple', 4: 'quadruple' }

/** Une relâche multipliée (Embrasement aiguisé) : « deux fois », « trois fois »… ; au-delà, en pourcentage. */
const TIMES: Record<number, string> = { 2: 'deux fois', 3: 'trois fois', 4: 'quatre fois' }

/** Une part, en clair : « la moitié », « tous les » (une part de 100 % ou plus), sinon en pourcentage. */
const shareOf = (share: number, all: string) => (share === 0.5 ? 'la moitié des' : share >= 1 ? all : `${pct(share)} des`)

/** Un petit nombre en toutes lettres, au milieu d'une phrase (« des trois derniers coups ») ; au-delà, en chiffres. */
export const SMALL_NUMBERS: Record<number, string> = { 2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq' }

/**
 * Dégâts directs en plusieurs impacts qui ont un nom (revue des compétences, T5) : « L'adversaire perd 4 PV, en quatre
 * éclairs », au lieu de l'écriture de calcul « 4 × 1 dégât direct ». Les autres gardent « 3 × 2 dégâts directs ».
 */
export const HIT_NOUNS: Partial<Record<DamageSource, string>> = { lightning: 'éclairs' }

/**
 * Un effet, en clair, au style de l'utilisateur (passe compendium, 2026-10-25) : l'effet d'abord, sans jargon ; ce que la
 * phrase tait va au détail (`effectDetail`). `grafted` : greffé sur le jet de son lanceur, un statut posé sur lui agit sur
 * le coup de ce jet (Œil de faucon, Vol de vie : « ce coup », `StatusDef.grafted`). Posé sur l'adversaire, un statut a
 * l'adversaire pour sujet (`StatusDef.onFoe`, sinon « L'adversaire » et sa phrase).
 */
export function describeEffect(effect: Effect, grafted = false): string {
  const foe = effect.target === 'opponent'
  // Sangsue, Agonie : une valeur lue sur un statut (« par charge de Poison de l'adversaire »)
  const per = (from: StatusRead) => `par charge ${deName(STATUSES[from.status].name)} ${from.who === 'opponent' ? "de l'adversaire" : 'du porteur'}`
  switch (effect.type) {
    case 'heal':
      if (effect.fromStatus) return `+${effect.fromStatus.factor} PV ${per(effect.fromStatus)}${effect.amount ? `, puis +${effect.amount}` : ''}${foe ? " à l'adversaire" : ''}`
      return `+${effect.amount} PV${foe ? " à l'adversaire" : ''}`
    case 'damage': {
      const noun = effect.hits ? HIT_NOUNS[effect.source] : undefined
      if (noun && effect.hits) return `${foe ? "l'adversaire" : 'il'} perd ${effect.amount * effect.hits} PV, en ${SMALL_NUMBERS[effect.hits] ?? effect.hits} ${noun}`
      // Arc électrique : la base d'abord, puis ce que le statut ajoute ; le porteur lu est celui qui perd (« qu'il porte »)
      if (effect.fromStatus) {
        const from = effect.fromStatus
        const whose = (from.who === 'opponent') === foe ? "qu'il porte" : from.who === 'opponent' ? "de l'adversaire" : 'du porteur'
        const per = `par charge ${deName(STATUSES[from.status].name)} ${whose}`
        return `${foe ? "l'adversaire" : 'il'} perd ${effect.amount ? `${effect.amount} PV, +${from.factor} ${per}` : `${from.factor} PV ${per}`}`
      }
      // Contre l'armure (Clous de pavois, 2026-10-27) : ce ne sont plus des dégâts directs
      if (effect.armored) return `${effect.amount} ${effect.amount > 1 ? 'dégâts' : 'dégât'} contre l'armure ${foe ? "de l'adversaire" : 'du porteur'}`
      // Serment de sang (2026-10-27) : le prix qu'il paie lui-même, en PV
      if (!foe && !effect.hits) return `il perd ${effect.amount} PV`
      return `${effect.hits ? `${effect.hits} × ` : ''}${effect.amount} ${effect.amount > 1 ? 'dégâts directs' : 'dégât direct'}${foe ? " à l'adversaire" : ' à soi-même'}`
    }
    case 'applyStatus': {
      const def = STATUSES[effect.status]
      // Pourfendre : des charges tirées du coup, que la définition ne connaît pas
      if (effect.fromHit !== undefined)
        return `${foe ? "l'adversaire" : 'il'} prend un ${def.name} égal à ${effect.fromHit === 0.5 ? 'la moitié' : pct(effect.fromHit)} des PV que ce coup ${foe ? 'lui ' : ''}retire${effect.stacks ? `, +${effect.stacks}` : ''}`
      // Virulence : des charges tirées d'un statut ; le même statut, au même porteur, se multiplie (« Triple le Poison »)
      if (effect.fromStatus !== undefined) {
        const from = effect.fromStatus
        const whose = from.who === 'opponent' ? "de l'adversaire" : 'du porteur'
        const plus = effect.stacks ? `, puis +${effect.stacks}` : ''
        if (from.status === effect.status && from.who === (effect.target ?? 'self')) {
          // Attiser (lot 3) : un statut qui se remplace (la Brûlure) repart, plus fort de ses charges d'avant
          if (def.stacking === 'refresh' && from.factor === 1) return `la ${def.name} ${whose} monte de ${effect.stacks} et repart pour autant de tours que sa nouvelle valeur`
          return `${MULTIPLY[from.factor + 1] ?? `multiplie par ${from.factor + 1}`} le ${def.name} ${whose}${plus}`
        }
        return `+${from.factor} ${def.name}${foe ? " à l'adversaire" : ''} par charge ${deName(STATUSES[from.status].name)} ${whose}${plus}`
      }
      const turns = effect.turns ?? (def.turnsFromStacks ? effect.stacks : undefined)
      const status = { id: effect.status, stacks: effect.stacks, turns, power: effect.power }
      if (foe) return def.onFoe?.(status) ?? `L'adversaire ${lowerFirst(def.describe(status))}`
      return grafted && def.grafted ? def.grafted(status) : def.describe(status)
    }
    case 'release': {
      const def = STATUSES[effect.status]
      // Embrasement : le statut de l'adversaire, relâché d'un coup (la Brûlure : tous les PV qu'il lui reste à brûler)
      if (effect.from === 'opponent') {
        const times = effect.share === undefined || effect.share === 1 ? '' : `${TIMES[effect.share] ?? pct(effect.share)} `
        return `l'adversaire perd ${times}sa ${def.name} restante, d'un coup`
      }
      // Onde de choc : ses jauges comptées, `per` PV par coup encaissé
      if (effect.per !== undefined)
        return `${foe ? "l'adversaire" : 'il'} perd ${effect.per} PV par coup qui a touché le porteur depuis sa dernière onde, ${SMALL_NUMBERS[def.fillsOnHurt?.slots ?? 3] ?? def.fillsOnHurt?.slots} coups au plus`
      // Rétribution : ses jauges, les dégâts de ses derniers coups reçus
      const share = shareOf(effect.share ?? 1, 'tous les')
      return `${foe ? "l'adversaire" : 'il'} perd ${share} dégâts des ${SMALL_NUMBERS[def.fillsOnHurt?.slots ?? 3] ?? def.fillsOnHurt?.slots} derniers coups reçus`
    }
    case 'cleanse': {
      const kind = effect.polarity === 'negative' ? 'malus' : 'bonus'
      const what = effect.count === undefined ? `tous ${foe ? 'les' : 'ses'} ${kind}` : effect.count === 1 ? `son dernier ${kind}` : `ses ${effect.count} derniers ${kind}`
      // Le repli et la suite visent l'adversaire comme la purge : il n'est pas répété (« sinon 5 dégâts directs »)
      const bare = (e: Effect) => describeEffect(e).replace(foe ? / à l'adversaire$/ : /$^/, '')
      const andThen = effect.andThen ? `, avec ${bare(effect.andThen)}` : ''
      const orElse = effect.orElse ? `${andThen ? ' ;' : ','} sinon ${bare(effect.orElse)}` : ''
      // Larcin : le bonus retiré passe au porteur
      if (effect.steal) return `vole ${what}${foe ? " à l'adversaire" : ''}${andThen}${orElse}`
      return `retire ${what}${foe ? " à l'adversaire" : ''}${andThen}${orElse}`
    }
  }
}

/** Ce que la phrase d'un effet tait (arrondis, moment exact, jargon), en une phrase ; rien s'il n'y a rien à ajouter. */
function effectDetail(effect: Effect): string | undefined {
  switch (effect.type) {
    case 'applyStatus': {
      const def = STATUSES[effect.status]
      const turns = effect.turns ?? (def.turnsFromStacks ? effect.stacks : undefined)
      const detail = def.detail?.({ id: effect.status, stacks: effect.stacks, turns, power: effect.power })
      // Attiser (lot 3) : ce que devient le statut qui repart, en exemple, et sans lui
      const from = effect.fromStatus
      if (from?.status === effect.status && from.factor === 1 && def.stacking === 'refresh' && def.turnsFromStacks) {
        const who = effect.target === 'opponent' ? "l'adversaire" : 'il'
        const n = 3 + effect.stacks
        return `Une ${def.name} de 3 à un tour de sa fin devient une ${def.name} de ${n}, pour ${n} tours ; sans ${def.name}, ${who} ${def.bears ?? `prend ${def.name}`} de ${effect.stacks}.`
      }
      return effect.fromHit !== undefined ? `Arrondi au-dessus.${detail ? ` ${detail}` : ''}` : detail
    }
    case 'release':
      if (effect.per !== undefined) return 'En dégâts directs ; les coups comptés partent avec l’onde, le compte repart de zéro. Sans coup encaissé, la face reste nue.'
      return effect.from === 'opponent'
        ? `Puis la ${STATUSES[effect.status].name} s'éteint.`
        : `Arrondi au-dessous, au moins ${effect.min} ; les jauges se vident.`
    case 'cleanse':
      return effect.count === undefined ? undefined : `Le ${effect.polarity === 'negative' ? 'malus' : 'bonus'} le plus récent, avec toutes ses charges.`
    default:
      return undefined
  }
}

const whom = (who: Target) => (who === 'opponent' ? "l'adversaire" : 'il')

/** Une condition, en proposition : « l'adversaire saigne », « il est sous 50 % de ses PV ». Avec son mot de liaison : `conditionClause`. */
export function describeCondition(c: Condition): string {
  switch (c.type) {
    case 'hpBelow':
      return `${whom(c.who)} est sous ${pct(c.ratio)} de ses PV`
    case 'hpAtLeast':
      return `${whom(c.who)} a au moins ${pct(c.ratio)} de ses PV`
    case 'hasStatus': {
      const def = STATUSES[c.status]
      if (c.stacks && c.stacks > 1) return `${whom(c.who)} porte ${c.stacks} ${def.name} ou plus`
      return `${whom(c.who)} ${def.bears ?? `porte ${def.name}`}`
    }
    case 'lacksStatus': {
      const bears = STATUSES[c.status].bears
      const not = bears === undefined ? `ne porte pas ${STATUSES[c.status].name}` : bears.startsWith('est ') ? `n'est pas ${bears.slice(4)}` : `ne ${bears} pas`
      return `${whom(c.who)} ${not}`
    }
    case 'fromTurn':
      return `le tour ${c.turn} est atteint`
    case 'hitAtLeast':
      return `ce coup retire ${c.amount} PV ou plus`
  }
}

/** Une condition avec son mot de liaison, à la suite d'un effet : « si l'adversaire saigne », « s'il est sous 50 % de ses PV », « à partir du tour 3 ». */
export function conditionClause(c: Condition): string {
  if (c.type === 'fromTurn') return `à partir du tour ${c.turn}`
  const text = describeCondition(c)
  return text.startsWith('il ') ? `s'${text}` : `si ${text}`
}

/** « de » élidé devant une voyelle : « de Poison », « d'Aura de rancune ». */
export const deName = (name: string) => (/^[aeiouyàâéèêëîïôûüh]/i.test(name) ? `d'${name}` : `de ${name}`)

/** Une pastille d'une compétence (forme, relation au coup, cumul…) et la règle commune qu'elle cite. */
export interface SkillTag {
  label: string
  rule: RuleId
}

export interface SkillDescription {
  /** Sa ligne : l'effet, la condition en clair, la limite en « 2x » (« Deux coups de plus si l'adversaire saigne. ») */
  text: string
  /** Ce que la ligne tait (arrondis, moment exact, coups bruts) : la ligne « Détail » du compendium, absente s'il n'y a rien */
  detail?: string
  /** Les pastilles, dans l'ordre de lecture */
  tags: SkillTag[]
  /** Les statuts que la compétence pose (ou relâche, Rétribution), avec leur cible : une pastille qui mène au statut */
  posed: { status: StatusId; target: Target }[]
}

const capitalize = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

/**
 * Ce que fait une compétence, en clair. C'est la seule rédaction d'une compétence : le compendium (index et
 * fiche), l'infobulle des dés et la forge l'affichent depuis cette source. Au style de l'utilisateur (passe compendium,
 * 2026-10-25) : la ligne porte l'effet, puis la condition en clair (« si l'adversaire saigne »), sa chance et sa limite
 * (« 1x ») ; le jargon va au détail. Ce qui relève d'une règle commune (relation au coup de base, dégâts directs, aura,
 * cumul, plafond) est une pastille qui cite la règle. `formName` : le nom de la forme requise (personnage à formes).
 */
export function describeSkill(e: CharacterEvent, formName?: string): SkillDescription {
  const relation = relationOf(e)
  const modifies = relation === 'modify'
  const graftedOnDie = relation === 'graft' && isRollTrigger(e.trigger)
  const sentences = [
    e.hitMultiplier ? `ce coup ×${e.hitMultiplier}${e.buildsUp ? ", puis ×1 de plus à chaque fois qu'il touche" : ''}` : '',
    // Une compétence qui modifie son coup : ses effets n'arrivent que s'il touche, et la phrase le dit d'abord (Pourfendre
    // compris depuis le retour du 2026-10-30, R6 : « S'il touche, l'adversaire prend un Saignement égal à… »)
    ...e.effects.map((effect, k) => {
      const text = describeEffect(effect, graftedOnDie)
      if (!modifies || k > 0) return text
      return `s'il touche, ${lowerFirst(text)}`
    }),
  ].filter(Boolean)
  // Virulence : la condition sur le statut qu'elle multiplie va de soi (tripler zéro ne fait rien) ; l'Onde de choc, celle
  // sur les jauges qu'elle relâche (aucun coup encaissé, rien à compter)
  const multiplied = (c: Condition) =>
    c.type === 'hasStatus' &&
    e.effects.some((x) => (x.type === 'applyStatus' && x.fromStatus?.status === c.status && x.fromStatus.who === c.who) || (x.type === 'release' && x.status === c.status && c.who === 'self'))
  const clauses = (e.when ?? []).filter((c) => !multiplied(c)).map(conditionClause)
  // Une limite par combat se dit en lettres (D11 : plus de « 1 » affiché) et dit sur quoi elle porte : « une fois par
  // combat » (« , une fois » laissait croire à un effet qui ne dure qu'une fois)
  const limits = [
    e.chance !== undefined && e.chance < 1 ? `${Math.round(e.chance * 100)} % de chances` : '',
    e.limit === undefined ? '' : `${e.limit === 1 ? 'une' : (SMALL_NUMBERS[e.limit] ?? e.limit)} fois par combat`,
  ].filter(Boolean)
  // La condition suit une phrase seule (« Deux coups de plus si l'adversaire saigne ») ; devant plusieurs, elle ouvre la première
  if (clauses.length > 0 && sentences.length === 1) sentences[0] = `${sentences[0]} ${clauses.join(' et ')}`
  else if (clauses.length > 0) sentences[0] = `${clauses.join(' et ')}, ${lowerFirst(sentences[0])}`
  if (limits.length > 0) sentences[sentences.length - 1] = `${sentences[sentences.length - 1]}, ${limits.join(', ')}`
  const details = [...new Set(e.effects.flatMap((effect) => effectDetail(effect) ?? []))]
  const posedIds = e.effects.flatMap((effect) => (effect.type === 'applyStatus' ? [effect.status] : []))
  const direct = e.effects.some((x) => x.type === 'damage' || x.type === 'release' || (x.type === 'cleanse' && x.orElse?.type === 'damage'))
  // Une pastille par règle : deux statuts cumulables (le Duo : l'aura et le dé de plus) n'en montrent qu'une
  const caps = [...new Set(posedIds)]
    .flatMap((id) => {
      const def = STATUSES[id]
      if (def.mechanic) return []
      // Le cumul de chaque statut posé, en pastille (revue 0.110.0, T7) : un plafond de 1 vaut une pose qui remplace
      const cumul = def.stacking === 'add' && def.maxStacks !== 1 ? { label: 'se cumule', rule: 'stacking-add' as const } : { label: 'non cumulable', rule: 'stacking-refresh' as const }
      return def.maxStacks !== undefined && def.maxStacks > 1 ? [cumul, { label: `${def.name} : ${def.maxStacks} charges au plus`, rule: 'max-stacks' as const }] : [cumul]
    })
    .filter((t, k, all) => all.findIndex((x) => x.label === t.label) === k)
  // Une compétence du dé dit sa relation au coup de base : se greffer est la règle, elle n'a pas de pastille
  const onDie = isRollTrigger(e.trigger)
  const tags: SkillTag[] = [
    // Le mot-clé « sort » d'abord (D29) : il traverse les maîtrises
    ...(isSpell(e) ? [{ label: 'sort', rule: 'spell' as const }] : []),
    ...(formName ? [{ label: formName, rule: 'forms' as const }] : []),
    // Au début du combat : avant le premier tour, quel que soit le vainqueur de l'initiative (règle « Initiative »)
    ...(e.trigger === 'combatStart' ? [{ label: 'avant le premier tour', rule: 'initiative' as const }] : []),
    ...(onDie && modifies ? [{ label: 'modifie son coup', rule: 'hit-relations' as const }] : []),
    ...(onDie && relation === 'replace' ? [{ label: 'remplace le coup', rule: 'hit-relations' as const }] : []),
    ...(direct ? [{ label: 'dégâts directs', rule: 'direct-damage' as const }] : []),
    ...(posedIds.some((id) => STATUSES[id].look?.aura) ? [{ label: 'aura permanente', rule: 'auras' as const }] : []),
    ...caps,
  ]
  return {
    text: typeset(sentences.map((p) => `${capitalize(p)}.`).join(' ')),
    ...(details.length > 0 && { detail: typeset(details.join(' ')) }),
    tags: tags.map((t) => ({ ...t, label: typeset(t.label) })),
    posed: e.effects.flatMap((effect) =>
      effect.type === 'applyStatus' ? [{ status: effect.status, target: effect.target ?? 'self' }] : effect.type === 'release' ? [{ status: effect.status, target: effect.from ?? 'self' }] : [],
    ),
  }
}

/** Une compétence en une ligne (rapports, tests) : son texte, puis ses pastilles. Même source que l'écran. */
export function describeEvent(e: CharacterEvent) {
  const { text, tags } = describeSkill(e)
  return [text, ...tags.map((t) => t.label)].filter(Boolean).join(' · ')
}
