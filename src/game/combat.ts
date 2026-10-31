import type { Character } from './character'
import type { DamageSource } from './damage'
import { DIE_FACES, faceTrigger, isRollTrigger, relationOf, rollMatches, type CharacterEvent, type Condition, type Effect, type HitRelation, type StatusRead, type Trigger } from './events'
import type { Relic } from './relics'
import { chance, defaultRng, rollDie, seededRng, type Rng } from './rng'
import {
  BLIND_MISS,
  COIN_RANK_HEADS,
  consumeStatus,
  directDamage,
  givesJets,
  isAura,
  isMechanic,
  isStealable,
  removeStatuses,
  resolveApplication,
  stacksOf,
  STATUS_IDS,
  STATUSES,
  tickDurations,
  type ApplicationOutcome,
  type CombatStats,
  type Polarity,
  type Status,
  type StatusId,
} from './statuses'

/*
 * Moteur de combat : l'unique endroit où les règles s'appliquent et où l'on tire les dés.
 * `simulateCombat` est pur à hasard près (le `rng` est injecté) et produit une chronologie
 * (`beats`) que l'écran de combat se contente de rejouer et que les statistiques lisent.
 *
 * Les règles de résolution sont spécifiées dans docs/RESOLUTION.md ; ce fichier les applique :
 *
 *   Ouverture : initiative (relance sur égalité) → fenêtre « combatStart » (gauche, puis droite)
 *   Chaque tour, pour le joueur actif (l'attaquant) :
 *     Phase 1 · Début de tour : effets `onTurnStart` (bonus, puis malus) → durées « début »
 *               → fenêtre « turnStart »
 *               → au 3e tour de son porteur (le 2e, aiguisée), l'aura de départ absente se pose d'office (déclencheur
 *                 `auraDue`) ; dissipée, elle revient de même au début du 2e tour suivant de son porteur (le rendez-vous
 *                 réarmé, D8)
 *     Phase 2 · Action : contrôle (`skipsAction` : le tour est perdu), sinon un jet, ou plusieurs (Coup de chance, Duo),
 *               et des coups instantanés (Furie des vents). Un jet : le d6 désigne une face ; sa compétence se
 *               greffe (étape roll, la compétence, puis le coup de base), modifie le coup (il part, elle suit s'il
 *               touche) ou le remplace (jet remplacé, pas de coup). Chaque coup de base, résolu en entier à son tour :
 *               valeur tirée dans l'attaque → esquive → reliques de coup, face dorée → critique → dégâts sortants
 *               → dégâts entrants → armure → boucliers
 *               → fenêtres du coup : bloodied, la face du dé (naturalOne… face:4), naturalMax (coup brut : reliques seules),
 *                 puis esquivé : missed (actif) → dodge (défenseur) ; touché : hit → crit (actif) → hurt → shieldBroken
 *                 (défenseur, si ce coup a vidé un de ses boucliers). Pile : heads (lanceur), puis hit et hurt si pile touche.
 *                 Vol de vie (`hit`), Riposte et jauges (`hurt`) y réagissent comme toute réaction. Seuls les statuts
 *                 présents au début du coup réagissent dans ses fenêtres (`strikeBase`, règle 9).
 *                 Renvois (C1) : la Riposte et chaque jauge relâchée de la Rétribution sont des coups sans dé (`rebound`),
 *                 résolus par la même chaîne, avec leurs fenêtres sans face ; aucun renvoi ne répond à un renvoi.
 *     Phase 3 · Fin de tour : effets `onTurnEnd` (bonus, puis malus) → durées « fin » → fenêtre « turnEnd »
 *   Dans une fenêtre, pour chaque camp concerné : réactions de ses statuts (ordre de pose), puis
 *   événements de son personnage (ordre de définition). Les effets ainsi produits ne déclenchent
 *   pas d'autres réactions (pas de chaîne), sauf trois moments de la vérification d'état : le soin reçu (`healed`), les
 *   dégâts renvoyés (`reflected`) et le seuil « bloodied ».
 *   Vérification d'état après chaque effet : un combattant à 0 PV met fin au combat aussitôt.
 */

/** Position à l'écran : 0 = gauche (regarde à droite), 1 = droite. */
export type Side = 0 | 1
export type Pair<T> = [T, T]

/** Moment du tour où un statut agit ou s'use. */
export type TurnPhase = 'turnStart' | 'turnEnd'

export const SIDES: readonly Side[] = [0, 1]
export const other = (side: Side): Side => (side === 0 ? 1 : 0)

export const INITIATIVE_DIE = 10

/** Garde-fou si des stats rendaient le K.O. impossible (ex. 100 % d'esquive). */
export const MAX_TURNS = 1000

/**
 * Jets de plus à une action, au plus (Coup de chance, Duo ; retour du 2026-10-28, A7). Avec la règle « un dé de plus ne
 * donne jamais de dé de plus » (`extraJet`), la boucle ne se nourrit plus d'elle-même (la Veine gravée faisait 1 600 jets
 * au tour 47, le Duo de Fanchon 9 dés et plus) ; le plafond borne ce qu'une action reçoit de ses charges. Il remplace le
 * plafond de 12 de la 0.125.0.
 */
export const MAX_EXTRA_JETS = 3

/**
 * Plafond d'esquive (troisième retour du 2026-10-27, C5) : les statuts ne portent pas la chance d'esquive au-delà de 75 %,
 * règle pour tous. Sans plafond, le Pas de côté gravé et copié montait à 100 % : des combats bloqués jusqu'à `MAX_TURNS`
 * (38 sur 259 200 combats construits à 10 récompenses, `npm run ramp`). À 60 comme à 75 % : plus aucun, et aucune force
 * construite ne bouge de plus de 0,1 point ; 75 % retient le plus haut des deux. Une esquive de fiche plus haute (un
 * personnage de test) reste la sienne : seuls les bonus sont bornés.
 */
export const MAX_DODGE = 0.75

/** État des deux combattants à un instant du combat. */
export interface Snapshot {
  hp: Pair<number>
  statuses: Pair<Status[]>
  /**
   * Sursis (retour du 2026-10-28, A15) : le camp figé par sa Médaille de sursis, de l'étape qui aurait dû le faire tomber
   * jusqu'à la fin du tour ; il ne descend pas sous 1 PV. Absent quand personne ne l'est.
   */
  stone?: Pair<boolean>
}

/** Effet réellement appliqué (un soin peut être réduit par le plafond de PV, etc.). */
export type AppliedEffect =
  /** `wanted` : le soin d'avant les filtres des statuts du soigné (Hémorragie, `modifyHealing`), s'ils l'ont changé */
  | { type: 'heal'; target: Side; amount: number; wanted?: number }
  | {
      type: 'damage'
      target: Side
      amount: number
      /** Ce que sont ces dégâts (damage.ts), d'où leur teinte ; recopié de l'effet, sans effet sur la règle */
      source: DamageSource
      /** Le détail par coup, dont la somme vaut `amount` (jauges d'une relâche, coups de `hits`) ; l'écran en fait autant de coups */
      parts?: number[]
      /**
       * Dégâts qui se heurtent à l'armure (`armored`, Clous de pavois, 2026-10-27) ; `armorAbsorbed` : ce que l'armure de la
       * cible en a retenu, s'il y en a
       */
      armored?: true
      armorAbsorbed?: number
    }
  /**
   * `stacks` : charges demandées ; `result` : ce qui s'est réellement passé (posé, annulé, bloqué). `stolenBy` : le bonus
   * que le lanceur se posait est allé à l'adversaire, entier, pris par ce statut du lanceur (Sceau de vol, `stealsBonus`) ;
   * ou le bonus pris par un Larcin, marqué par son statut
   */
  | { type: 'applyStatus'; target: Side; status: StatusId; stacks: number; turns?: number; result: ApplicationOutcome; stolenBy?: StatusId }
  /** `stolen` : une purge de vol (Larcin) ; le bonus retiré, entier, passe au voleur (retour du 2026-10-28, A6) */
  | { type: 'cleanse'; target: Side; removed: StatusId[]; stolen?: true }
  /**
   * Jauges relâchées en renvois (Rétribution, retour du 2026-10-27, C1) : `parts`, la valeur de chaque coup sans dé qui
   * part (une jauge chacun) ; leurs PV retirés sont dans les étapes de ces coups (`statusReaction` à `strike`), qui suivent
   */
  | { type: 'rebound'; target: Side; status: StatusId; parts: number[] }

export interface Attack {
  attacker: Side
  /** Le dé : la face tombée (« sur un 4 »), qui déclenche sa compétence ; elle ne fait aucun dégât */
  roll: number
  /** Nombre de faces du dé utilisé (le d6) */
  faces: number
  /**
   * Valeur du coup de base, tirée dans l'attaque de l'attaquant (règles v2, phase 5 bis), avant le multiplicateur, les
   * reliques, la dorure et le critique ; 0 pour un jet remplacé
   */
  value: number
  /** Crescendo, Soliste (relation « modifie ») : ce coup ×N (`CharacterEvent.hitMultiplier`) */
  multiplier?: number
  dodged: boolean
  /** Esquive imposée par un statut du défenseur (ex. « Esquive améliorée »), sans tirage */
  dodgeForced: boolean
  /** Le statut du défenseur qui a imposé l'esquive (présent si `dodgeForced`) */
  dodgeBy?: StatusId
  /**
   * Jet remplacé par sa compétence (relation `replace` : Furie des vents, Coup de chance) : pas de coup de base, ni
   * esquive ni critique ; seules les fenêtres du dé s'ouvrent
   */
  replaced: boolean
  /** Dé imposé par l'observateur (mode triche, `forcedRolls`) ; absent d'un combat normal */
  forced?: true
  /** Dé déjà tiré par l'étape qui précède (jet greffé) : ce coup ne lance aucun dé */
  preset?: true
  /**
   * Coup brut (0.69.0, coups de la Furie des vents) : sa face ne déclenche aucune compétence. Les reliques de face et la
   * dorure, elles, lisent son dé (2026-10-23).
   */
  plain?: true
  /**
   * Jet tombé à vide (Malchance, `StatusDef.jinxesRoll`) : ni compétence de la face, ni coup ; seules les reliques de face
   * lisent son dé, comme pour un coup brut
   */
  jinxed?: true
  /**
   * Renvoi (retour du 2026-10-27, C1) : un coup sans dé, d'une valeur fixée (`value`), porté par une réaction
   * (`statusReaction.strike`). Ni face ni dorure ; les reliques de coup sans face le lisent (R4)
   */
  rebound?: true
  /** Coup raté par un critique de l'attaquant aveuglé (Aveuglé, `StatusDef.blinds`) : le statut ; `dodged` est vrai */
  blindedBy?: StatusId
  /** Coup qui brise l'armure temporaire du défenseur (Garde brisée, `StatusDef.shatters`) : aucun bouclier n'absorbe */
  shatteredBy?: StatusId
  crit: boolean
  /**
   * Critique imposé par un statut (ex. « Critique assuré ») : ce coup a dépensé sa charge. Sur un coup esquivé ou raté
   * (Aveuglé), le critique est perdu (B8, 2026-10-27)
   */
  critForced: boolean
  /** Le statut de l'attaquant qui a imposé le critique (présent si `critForced`) */
  critBy?: StatusId
  critMultiplier: number
  /** Dégâts avant l'armure (après critique et modificateurs) */
  raw: number
  /** Dégâts réellement infligés (0 si esquive) */
  damage: number
  /**
   * Dégâts comptés : `damage` en entier, excès du coup fatal compris (overkill, compté depuis la 0.34.0).
   * Les PV, eux, ne descendent pas sous 0 : le défenseur perd `min(dealt, PV restants)`.
   */
  dealt: number
  /** Armure du défenseur au moment du coup (de base, modifiée par les statuts) */
  armor: number
  /** Retenus par l'armure */
  armorAbsorbed: number
  /** Vrai si le plancher d'1 dégât a joué : l'armure ou un bouclier aurait retenu davantage */
  floored: boolean
  /** Modificateurs de dégâts appliqués avant l'armure, dans l'ordre (sortants de l'attaquant, puis entrants du défenseur) */
  modifiers: AttackModifier[]
  /** Retenus par les boucliers, au total */
  shieldAbsorbed: number
  /** Retenus par chaque bouclier, dans l'ordre d'application (ordre de pose des statuts du défenseur) */
  shields: { status: StatusId; absorbed: number }[]
  /**
   * Bonus de coup des reliques de l'attaquant (Fer à quatre clous), ajoutés à la valeur du coup avant le
   * critique ; seulement sur un coup qui touche
   */
  relicBonus?: { relic: string; name: string; amount: number }[]
  /**
   * Face dorée (forge du dé, 0.88.0) : ajouté à la valeur du coup qui touche, avant le critique, quand son dé fait
   * cette face, coup brut compris, comme une relique de face
   */
  gild?: number
}

/** Un statut qui a changé la force d'un coup (ex. Aura de puissance +2, Aura d'intimidation −2). */
export interface AttackModifier {
  status: StatusId
  /** Porté par l'attaquant (sortant) ou par le défenseur (entrant) */
  by: 'attacker' | 'defender'
  delta: number
  /** Modificateur des dégâts finaux (`modifyFinal`), appliqué après l'armure et les boucliers */
  final?: true
}

export interface TriggeredEvent {
  /** Porteur de l'événement */
  side: Side
  eventId: string
  name: string
  trigger: Trigger
  effects: AppliedEffect[]
}

/** Décompte d'une durée : tours restants avant → après. */
export interface DurationChange {
  status: StatusId
  from: number
  to: number
}

/**
 * Moment du tour où une étape a lieu : changement de forme, début de tour, action, fin de tour.
 * Les étapes de l'ouverture (fenêtre « combatStart », tour 0) sont rangées en `turnStart`.
 */
export type BeatPhase = 'shift' | TurnPhase | 'action'

/** Champs communs à toutes les étapes (docs/MOTEUR_V2.md § 3). */
export interface BeatFields {
  /** Rang de l'étape dans `beats`, à partir de 0 */
  id: number
  /** `id` de l'étape qui a provoqué celle-ci ; absent pour une étape racine (jet de l'action, début de phase) */
  cause?: number
  phase: BeatPhase
  /** Celui dont c'est le tour (tour 0, l'ouverture : celui qui ne commence pas, comme l'alternance le veut) */
  owner: Side
  turn: number
  state: Snapshot
}

/** Une étape de la chronologie, avec l'état qui en résulte. */
export type Beat = BeatFields & BeatBody

/** Le contenu propre à chaque type d'étape. */
export type BeatBody =
  | { type: 'attack'; attack: Attack }
  | { type: 'event'; event: TriggeredEvent }
  /** Effet de tour d'un statut (ex. brûlure et poison à la fin du tour, pourriture au début) */
  | { type: 'statusTick'; phase: TurnPhase; side: Side; status: StatusId; effects: AppliedEffect[] }
  /**
   * Usure de la phase (2026-10-21 : une seule étape au lieu de `statusDuration` et `statusExpire`) : `changes`, les
   * durées décomptées (un tour de moins) ; `expired`, les statuts éteints (charges épuisées ou durée écoulée).
   */
  | { type: 'statusAge'; phase: TurnPhase; side: Side; changes: DurationChange[]; expired: StatusId[] }
  /**
   * Réaction d'un statut à un moment du combat (ex. Épines quand le porteur encaisse, Vol de vie quand il touche).
   * Sans effet pour une jauge qui se remplit (Rétribution) : l'état de l'étape montre les jauges. `strike` (retour du
   * 2026-10-27, C1) : un renvoi, coup sans dé (Riposte, chaque jauge relâchée d'une Rétribution), résolu par la chaîne du
   * coup (esquive, critique, armure, boucliers) ; `effects` porte ses PV retirés, rien s'il est esquivé.
   */
  | { type: 'statusReaction'; side: Side; status: StatusId; trigger: Trigger; effects: AppliedEffect[]; strike?: Attack }
  /** Action perdue à cause d'un statut de contrôle (ex. Étourdi) */
  | { type: 'skip'; side: Side; status: StatusId }
  /** Changement de forme (druide), au tout début de son tour : `form` est l'index de la nouvelle forme */
  | { type: 'shift'; side: Side; form: number }
  /**
   * Une action à plusieurs jets : un statut qui donne plusieurs coups (Furie des vents : deux coups bruts ; Coup de
   * chance : des dés de frappe à l'action suivante, D5 du retour du 30 octobre), qui est consommé.
   */
  | { type: 'flurry'; side: Side; status: StatusId; strikes: number; faces: number[] }
  /**
   * Un Doublé (D5, retour du 30 octobre, docs/RESOLUTION.md § 2) : un dé de frappe de la rafale vient de faire la face du
   * dé de compétence de l'action ; ce dé devient un jet complet, la compétence de la face repart. L'étape ne porte pas de
   * dé à elle : le jet qui suit (même cause, la rafale) réutilise ce dé, `roll`.
   */
  | { type: 'doublet'; side: Side; roll: number }
  /**
   * Un jet dont la face porte une compétence qui se greffe (règles v2, phase 5 bis) : le dé tombe, la compétence suit
   * (étape event), puis le coup de base, au dé déjà tiré (`Attack.preset`). Un jet sans greffe n'a pas cette étape : son
   * coup lance lui-même son dé.
   */
  /** `jinxedBy` : ce jet tombe à vide, par ce statut du lanceur (Malchance) ; l'étape `attack` qui suit est `jinxed` */
  | { type: 'roll'; side: Side; roll: number; faces: number; forced?: true; jinxedBy?: StatusId; sealedBy?: StatusId }
  /**
   * Pile ou face : une pièce lancée juste après le coup qui l'a posée ; pile, ce coup ×3 (les PV qu'il a retirés, encore
   * deux fois, en coup), face, rien. Le statut est consommé.
   */
  | { type: 'coin'; side: Side; status: StatusId; heads: boolean; effects: AppliedEffect[]; forced?: true; crit?: true }
  /**
   * Une relique du porteur se déclenche (docs/RELIQUES.md) : sur un moment du coup, au début d'un de ses tours,
   * ou quand ses PV passent sous son seuil. `uses` : ses déclenchements dans ce combat, celui-ci compris.
   */
  | { type: 'relic'; side: Side; relic: string; name: string; effects: AppliedEffect[]; uses: number }

export interface CombatResult {
  fighters: Pair<Character>
  /** Tous les jets d'initiative, relances comprises ; vide quand une relique d'initiative a décidé (`initiativeRelic`) */
  initiative: Pair<number>[]
  /**
   * Relique d'initiative (retour du 2026-10-27, R3) : son porteur commence sans jet. Absent si personne n'en porte, ou si
   * les deux en portent une (le jet revient).
   */
  initiativeRelic?: { side: Side; relic: string }
  beats: Beat[]
  /** Nombre de tours entamés */
  turns: number
  winner: Side
  /** K.O. ou, cas pathologique, limite de tours atteinte */
  endedBy: 'ko' | 'turnLimit'
  /** Joué à l'écran ou simulé directement */
  mode: 'played' | 'simulated'
  /** Durée du combat à l'écran (0 si simulé) */
  durationMs: number
  /** Graine du hasard, si le combat a été tiré avec une graine : `simulateCombat(fighters, { seed })` le rejoue */
  seed?: number
  /** Dés imposés par l'observateur (mode triche), par rang de dé : voir `SimulateOptions.forcedRolls` */
  forcedRolls?: Readonly<Record<number, number>>
}

/** Le camp qui joue le premier tour : celui d'une relique d'initiative, sinon le vainqueur du dernier jet d'initiative. */
export function firstSide(r: Pick<CombatResult, 'initiative' | 'initiativeRelic'>): Side {
  if (r.initiativeRelic) return r.initiativeRelic.side
  const [a, b] = r.initiative[r.initiative.length - 1]
  return a > b ? 0 : 1
}

/* ---------- Lecture d'un résultat ---------- */

/** Un dé lancé (mode triche) : son lanceur, ses faces (2 pour une pièce). */
export interface RolledDie {
  side: Side
  faces: number
  coin: boolean
}

/**
 * Les dés que lance une étape, dans l'ordre (mode triche, `forcedRolls`) : un pour un coup (sauf un coup dont le jet
 * greffé a déjà tiré le dé), un pour un jet greffé, un pour une pièce.
 */
export function diceOf(beat: Beat): RolledDie[] {
  if (beat.type === 'attack') return beat.attack.preset ? [] : [{ side: beat.attack.attacker, faces: beat.attack.faces, coin: false }]
  if (beat.type === 'roll') return [{ side: beat.side, faces: beat.faces, coin: false }]
  if (beat.type === 'coin') return [{ side: beat.side, faces: 2, coin: true }]
  return []
}

/** Une étape qui lance au moins un dé. */
export const rollsDie = (beat: Beat) => diceOf(beat).length > 0

/** Nombre de dés lancés par les étapes qui précèdent l'étape `index` : le rang de son premier dé. */
export const rankAt = (beats: readonly Beat[], index: number) =>
  beats.slice(0, index).reduce((n, b) => n + diceOf(b).length, 0)

/**
 * Le dé de rang `rank` (mode triche) : son lanceur et son nombre de faces (2 pour une pièce).
 * `undefined` si le combat se termine avant.
 */
export function dieAt(result: CombatResult, rank: number): RolledDie | undefined {
  return result.beats.flatMap(diceOf)[rank]
}

export const attacksOf = (result: CombatResult) =>
  result.beats.flatMap((b) => (b.type === 'attack' ? [{ turn: b.turn, ...b.attack }] : []))

export const eventsOf = (result: CombatResult) => result.beats.flatMap((b) => (b.type === 'event' ? [b.event] : []))

/** Effets appliqués par une étape, quelle que soit leur source (compétence, statut, pièce, relique). */
export function beatEffects(b: Beat): readonly AppliedEffect[] {
  if (b.type === 'event') return b.event.effects
  if (b.type === 'statusTick' || b.type === 'statusReaction' || b.type === 'coin' || b.type === 'relic') return b.effects
  return []
}

/** État final du combat (PV restants, statuts). */
export function finalState(result: CombatResult): Snapshot {
  const last = result.beats[result.beats.length - 1]
  return last ? last.state : { hp: [result.fighters[0].maxHp, result.fighters[1].maxHp], statuses: [[], []] }
}

/* ---------- Stats effectives ---------- */

const clamp = (v: number, min: number, max = Infinity) => Math.min(max, Math.max(min, v))

/**
 * Répartit `amount` entre des jauges (`weights`, dans leur ordre) pour l'écran : un coup par jauge (retour du
 * 2026-10-27, S1). Le montant entier d'une relâche garde ses jauges telles quelles ; une part (la moitié de la
 * Rétribution) en donne au moins 1 à chacune tant qu'il suffit (les plus grosses d'abord), puis le reste au prorata, au
 * plus fort reste. La somme vaut toujours `amount` ; aucune règle n'en dépend.
 */
export function splitAmong(amount: number, weights: readonly number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0)
  if (amount <= 0 || weights.length === 0) return []
  if (amount === total) return [...weights]
  const n = Math.min(weights.length, amount)
  // Les `n` plus grosses jauges, dans leur ordre
  const kept = weights.map((w, i) => ({ w, i })).sort((a, b) => b.w - a.w || a.i - b.i).slice(0, n).sort((a, b) => a.i - b.i)
  const sum = kept.reduce((a, k) => a + k.w, 0)
  const rest = amount - n
  const exact = kept.map((k) => (rest * k.w) / sum)
  const parts = exact.map((x) => 1 + Math.floor(x))
  let left = amount - parts.reduce((a, b) => a + b, 0)
  for (const j of exact.map((x, j) => ({ f: x - Math.floor(x), j })).sort((a, b) => b.f - a.f || a.j - b.j)) {
    if (left-- <= 0) break
    parts[j.j]++
  }
  return parts
}

/**
 * Les coups d'une relâche en part ou en entier (Rétribution) : le montant, réparti entre les jauges remplies, un coup par
 * jauge (`splitAmong`) ; sans jauge, un seul coup. Lu par le moteur et par l'écran (le compteur du sceau : le nombre de
 * coups, retour du 2026-10-28, A4), pour qu'ils ne divergent jamais. L'Onde de choc (`per`) n'y passe pas.
 */
export function releaseParts(effect: Extract<Effect, { type: 'release' }>, held: Status | undefined): number[] {
  const releases = STATUSES[effect.status].releases
  const stored = held ? (releases ? releases(held) : held.stacks) : 0
  // Compté en entier (overkill compris) ; les PV s'arrêtent à 0. En part (`share`, Rétribution 0.107.0) : arrondie au-dessous
  const amount = clamp(Math.max(effect.min, Math.floor(stored * (effect.share ?? 1))), 0)
  const split = splitAmong(amount, held?.slots?.filter((n) => n > 0) ?? [])
  return split.length > 0 ? split : amount > 0 ? [amount] : []
}

/** Stats de combat du porteur, une fois appliqués les modificateurs de ses statuts. */
export function effectiveStats(character: Character, statuses: readonly Status[]): CombatStats {
  const { maxHp: _maxHp, ...base } = character.stats
  const modified = statuses.reduce<CombatStats>((s, st) => STATUSES[st.id].modifyStats?.(s, st) ?? s, base)
  const attackMin = Math.round(clamp(modified.attackMin, 0))
  return {
    attackMin,
    attackMax: Math.round(clamp(modified.attackMax, attackMin)),
    armor: clamp(modified.armor, 0),
    dodgeChance: clamp(modified.dodgeChance, 0, Math.max(base.dodgeChance, MAX_DODGE)),
    critChance: clamp(modified.critChance, 0, 1),
    critMultiplier: clamp(modified.critMultiplier, 1),
  }
}

/* ---------- Résolution d'une attaque ---------- */

/**
 * Dé imposé (mode triche) : le tirage a lieu quand même, pour que la suite du hasard reste celle du
 * combat d'origine ; seule sa valeur est remplacée.
 */
function forceRoll(drawn: number, faces: number, forced: number | undefined) {
  return forced === undefined ? drawn : Math.min(faces, Math.max(1, Math.round(forced)))
}

/** Plafond de la chance de pile d'une pièce (retour du 2026-10-27, R4) : 5 sur 6, jamais une pile assurée. */
export const HEADS_CAP = 5 / 6

/** Le jet d'un coup, déjà tiré par le moteur : sa face, et ce que sa compétence fait du coup de base. */
export interface StrikeRoll {
  /** La face du dé */
  roll: number
  /** Le dé a été lancé par l'étape d'avant (jet greffé) : ce coup n'en lance pas */
  preset?: boolean
  /** Dé imposé par l'observateur (mode triche) */
  forced?: boolean
  /** Jet remplacé par sa compétence (relation `replace`) : pas de coup de base */
  replaced?: boolean
  /** Ce coup ×N (Crescendo, Soliste : une compétence de sa face qui le modifie) */
  multiplier?: number
  /** Jet tombé à vide (Malchance) : aucun coup */
  jinxed?: boolean
  /**
   * Renvoi (C1) : la valeur du coup, fixée, sans dé ni tirage dans l'attaque ; `roll` vaut 0 (aucune face : ni relique
   * de face ni dorure)
   */
  fixed?: number
}

/** Un coup résolu par `resolveAttack`, avant d'être appliqué : sans son auteur ni ses dégâts comptés */
export type StrikeOutcome = Omit<Attack, 'attacker' | 'dealt' | 'plain'>

/**
 * Résout un coup de base sans modifier l'état : sa valeur est tirée dans l'attaque, le défenseur tente d'esquiver,
 * puis l'attaquant peut critiquer (forcément s'il porte un statut `forcesCrit`). Les modificateurs de dégâts de
 * l'attaquant s'appliquent, puis l'armure (le coup garde au moins 1), puis les boucliers du défenseur absorbent ce
 * qu'ils peuvent, sans descendre sous 1, enfin les modificateurs de dégâts finaux de l'attaquant (`modifyFinal`),
 * toujours au moins 1. L'ordre des tirages (valeur, esquive, critique) est fixe : il garantit la reproductibilité ; le
 * dé, lui, est tiré avant (`StrikeRoll`). `holds` : une condition de relique, vue depuis l'attaquant, en ce moment.
 */
export function resolveAttack(
  rng: Rng,
  attacker: Character,
  defender: Character,
  attackerStatuses: readonly Status[],
  defenderStatuses: readonly Status[],
  strike: StrikeRoll,
  holds: (c: Condition) => boolean,
): StrikeOutcome {
  const att = effectiveStats(attacker, attackerStatuses)
  const def = effectiveStats(defender, defenderStatuses)
  const { roll } = strike
  const base = {
    roll,
    faces: DIE_FACES,
    ...(strike.multiplier !== undefined && { multiplier: strike.multiplier }),
    ...(strike.forced && { forced: true as const }),
    ...(strike.preset && { preset: true as const }),
    ...(strike.fixed !== undefined && { rebound: true as const }),
    critMultiplier: att.critMultiplier,
    shields: [] as Attack['shields'],
    armor: def.armor,
    floored: false,
    dodgeForced: false,
    replaced: false,
    modifiers: [] as AttackModifier[],
  }
  const nothing = { crit: false, critForced: false, raw: 0, damage: 0, armorAbsorbed: 0, shieldAbsorbed: 0 }
  if (strike.replaced) return { ...base, ...nothing, value: 0, dodged: false, replaced: true }
  if (strike.jinxed) return { ...base, ...nothing, value: 0, dodged: false, jinxed: true }
  // Le coup de base : sa valeur tirée dans l'attaque (aucun tirage pour une attaque fixe, ni pour un renvoi), qu'il touche
  // ou soit esquivé
  const drawn =
    strike.fixed !== undefined ? strike.fixed : att.attackMax > att.attackMin ? att.attackMin - 1 + rollDie(rng, att.attackMax - att.attackMin + 1) : att.attackMin
  // Critique assuré (B8, 2026-10-27) : la prochaine frappe le porte, qu'elle touche ou non ; un coup esquivé le perd
  const critBy = attackerStatuses.find((s) => STATUSES[s.id].forcesCrit)?.id
  const critForced = critBy !== undefined
  // Esquive imposée : pas de tirage (les combats sans ce statut gardent la même suite de hasard).
  const dodgeBy = defenderStatuses.find((s) => STATUSES[s.id].forcesDodge)?.id
  const dodgeForced = dodgeBy !== undefined
  if (dodgeForced || chance(rng, def.dodgeChance)) {
    return { ...base, ...nothing, value: drawn, dodgeForced, ...(dodgeBy && { dodgeBy }), dodged: true, critForced, ...(critBy && { critBy }) }
  }
  // Reliques de coup : la valeur du coup qui touche grandit, avant le critique ; un bonus de face (Fer à quatre
  // clous) ne vaut que si le dé de ce coup fait cette face (chaque dé d'une rafale se lit seul), coup brut compris
  // (2026-10-23 : une relique ou une dorure lit la face du dé, quel que soit le coup) ; un bonus à conditions (Fiole de
  // venin) ne vaut que si elles sont vraies à ce coup
  const relicBonus = attacker.relics.flatMap((r) =>
    r.rollBonus && (r.onFace === undefined || r.onFace === roll) && (!r.when || r.when.every(holds))
      ? [{ relic: r.id, name: r.name, amount: r.rollBonus }]
      : [],
  )
  // Face dorée (forge du dé) : même règle qu'une relique de face
  const gild = attacker.gilded[roll] ?? 0
  const value = drawn * (strike.multiplier ?? 1) + relicBonus.reduce((t, b) => t + b.amount, 0) + gild

  // Aveuglé (lot 3) : le tirage du critique a lieu, chance de critique plus BLIND_MISS par intensité ; un critique, tiré ou
  // assuré, devient un coup raté (le critique assuré part). Sans Aveuglé, le tirage est celui d'avant.
  const blind = attackerStatuses.find((s) => STATUSES[s.id].blinds)
  const crit = critForced || chance(rng, blind ? Math.min(1, att.critChance + BLIND_MISS * (blind.power ?? 0)) : att.critChance)
  if (crit && blind) return { ...base, ...nothing, value: drawn, dodged: true, critForced, blindedBy: blind.id, ...(critBy && { critBy }) }
  let raw = crit ? Math.round(value * att.critMultiplier) : value
  // Dégâts sortants (statuts de l'attaquant), puis entrants (statuts du défenseur), dans l'ordre de pose.
  const modifiers: AttackModifier[] = []
  // Poing de pierre (`whileShielded`) : il n'agit que si l'attaquant a une armure temporaire
  const armored = attackerStatuses.some((s) => STATUSES[s.id].shield)
  for (const s of attackerStatuses) {
    const modify = STATUSES[s.id].modifyOutgoing
    if (!modify || (STATUSES[s.id].whileShielded && !armored)) continue
    const next = modify(raw, s, defenderStatuses)
    if (next !== raw) modifiers.push({ status: s.id, by: 'attacker', delta: next - raw })
    raw = next
  }
  for (const s of defenderStatuses) {
    const modify = STATUSES[s.id].modifyIncoming
    if (!modify) continue
    const next = modify(raw, s)
    if (next !== raw) modifiers.push({ status: s.id, by: 'defender', delta: next - raw })
    raw = next
  }
  raw = Math.max(1, Math.round(raw))

  const afterArmor = Math.max(1, raw - def.armor)
  let damage = afterArmor
  const shields: Attack['shields'] = []
  // Garde brisée (lot 3) : l'armure temporaire n'absorbe rien, le coup la brise (`strikeOnce`)
  const shatteredBy = defenderStatuses.find((s) => STATUSES[s.id].shatters)?.id
  for (const s of defenderStatuses) {
    if (shatteredBy || !STATUSES[s.id].shield || damage <= 1) continue
    const taken = Math.min(s.stacks, damage - 1)
    if (taken > 0) {
      shields.push({ status: s.id, absorbed: taken })
      damage -= taken
    }
  }
  // Le plancher a joué si l'armure aurait tout retenu, ou si un bouclier n'a pas pu prendre le dernier point.
  const floored =
    raw - def.armor < 1 ||
    (damage === 1 &&
      defenderStatuses.some((s) => STATUSES[s.id].shield && s.stacks > (shields.find((x) => x.status === s.id)?.absorbed ?? 0)))
  // Dégâts finaux (Fausse note) : après l'armure et les boucliers, additionnés, puis un seul plancher
  // de 1 (le résultat ne dépend pas de l'ordre de pose)
  const shielded = damage
  const finals: Attack['modifiers'] = []
  for (const s of attackerStatuses) {
    const modify = STATUSES[s.id].modifyFinal
    if (!modify) continue
    const delta = Math.round(modify(damage, s)) - damage
    if (delta !== 0) finals.push({ status: s.id, by: 'attacker', delta, final: true })
  }
  const wanted = finals.reduce((t, m) => t + m.delta, shielded)
  const finalFloor = wanted < 1
  damage = Math.max(1, wanted)
  // Le plancher se retranche des malus, du dernier posé au premier : la somme des écarts reste les dégâts finaux
  let lift = damage - wanted
  for (let k = finals.length - 1; k >= 0 && lift > 0; k--) {
    const m = finals[k]
    if (m.delta >= 0) continue
    const back = Math.min(lift, -m.delta)
    finals[k] = { ...m, delta: m.delta + back }
    lift -= back
  }
  modifiers.push(...finals.filter((m) => m.delta !== 0))
  return {
    ...base,
    value: drawn,
    ...(relicBonus.length > 0 && { relicBonus }),
    ...(gild > 0 && { gild }),
    shields,
    modifiers,
    floored: damage === 1 && (floored || finalFloor),
    dodged: false,
    crit,
    critForced,
    ...(critBy && { critBy }),
    ...(shatteredBy && { shatteredBy }),
    raw,
    damage,
    armorAbsorbed: raw - afterArmor,
    shieldAbsorbed: afterArmor - shielded,
  }
}

/**
 * Pile critique (A14, refonte des auras) : l'effet de pile d'une pièce lancée par un coup critique, doublé. Un statut
 * double son intensité s'il en a une (Pièce porte-bonheur : +4 → +8), sinon ses charges ; dégâts et soins doublent ;
 * un statut `noCritDouble` (Étourdi : une action perdue) reste tel quel.
 */
export function critDoubled(effect: Effect): Effect {
  if (effect.type === 'applyStatus') {
    if (STATUSES[effect.status].noCritDouble) return effect
    return effect.power ? { ...effect, power: effect.power * 2 } : { ...effect, stacks: effect.stacks * 2 }
  }
  if (effect.type === 'damage' || effect.type === 'heal') return { ...effect, amount: effect.amount * 2 }
  return effect
}

/* ---------- Effet nul ---------- */

/** Le statut qu'un effet `applyStatus` pose, `extra` charges de plus (Pourfendre), durée et intensité comprises */
function statusOfEffect(effect: Extract<Effect, { type: 'applyStatus' }>, extra = 0): Status {
  const stacks = effect.stacks + extra
  const status: Status = { id: effect.status, stacks }
  // Une seule valeur (Brûlure, `turnsFromStacks`) : sans durée donnée, il dure autant de tours que de charges
  const turns = effect.turns ?? (STATUSES[effect.status].turnsFromStacks ? stacks : undefined)
  if (turns !== undefined) status.turns = turns
  if (effect.power) status.power = effect.power
  return status
}

/** Un soin reçu après les filtres des statuts du soigné (Hémorragie, `modifyHealing`), dans l'ordre de pose, au moins 0 ; lu par le moteur et l'audit */
export function healingOf(amount: number, statuses: readonly Status[]): number {
  return clamp(Math.round(statuses.reduce((n, s) => STATUSES[s.id].modifyHealing?.(n, s) ?? n, amount)), 0)
}

/** Les relations au coup d'une compétence qu'un jet malchanceux fait tomber à vide (Malchance) : toutes */
const JINXED_RELATIONS: readonly HitRelation[] = ['replace', 'graft', 'modify']

/**
 * L'effet ne changerait rien (0.110.0) : un soin sur des PV pleins, un statut déjà à son plafond ou bloqué par une
 * immunité, une purge sans rien à retirer ni repli utile. Lu sur un état, sans rien appliquer ni tirer.
 */
function isNilEffect(effect: Effect, owner: Side, view: Snapshot, fighters: Pair<Pick<Character, 'maxHp' | 'immunities'>>): boolean {
  const target = effect.target === 'opponent' ? other(owner) : owner
  switch (effect.type) {
    case 'heal':
      return view.hp[target] >= fighters[target].maxHp || healingOf(effect.amount, view.statuses[target]) <= 0
    case 'damage':
    case 'release':
      return false
    case 'applyStatus': {
      const { list, outcome } = resolveApplication(view.statuses[target], statusOfEffect(effect), fighters[target].immunities)
      // Une garde qui bloque s'use : ce n'est pas nul ; une immunité qui bloque, si
      if (outcome.kind === 'blocked') return outcome.by === 'immunity' || !STATUSES[outcome.by].wards
      if (outcome.kind !== 'applied' || outcome.cancelled) return false
      // Reposé tel quel (une aura non cumulable déjà là, le Collier de ronces chez Brokk, 30 octobre) : rien ne change
      const was = view.statuses[target].find((s) => s.id === effect.status)
      const now = list.find((s) => s.id === effect.status)
      return outcome.stacks === 0 || (!!was && !!now && was.stacks === now.stacks && was.turns === now.turns && was.power === now.power)
    }
    case 'cleanse': {
      const any = view.statuses[target].some((s) => (effect.steal ? isStealable(s.id) : STATUSES[s.id].polarity === effect.polarity && !isMechanic(s.id)))
      return !any && (effect.orElse === undefined || isNilEffect(effect.orElse, owner, view, fighters))
    }
  }
}

/**
 * Une relique dont tous les effets seraient nuls sur cet état ne part pas et ne s'use pas (0.110.0, RESOLUTION § 5
 * règle 6). Lu par le moteur au déclenchement et par l'audit.
 */
export function relicIsInert(relic: Relic, side: Side, view: Snapshot, fighters: Pair<Pick<Character, 'maxHp' | 'immunities'>>): boolean {
  const effects = relic.effects ?? []
  return effects.length > 0 && effects.every((e) => isNilEffect(e, side, view, fighters))
}

/* ---------- Combat complet ---------- */

interface FighterState {
  hp: number
  statuses: Status[]
  /** Déclenchements par id d'événement, pour `limit` */
  fired: Record<string, number>
  bloodied: boolean
  /** Statuts posés ou renouvelés pendant le tour en cours : pas de décompte à la fin de ce tour */
  fresh: Set<StatusId>
  /** Forme en cours (index dans `Character.forms`), pour un personnage à formes */
  form: number
  /** Tours joués : le druide ne change pas de forme à son premier tour */
  turnsTaken: number
  /** Reliques : déclenchements dans ce combat (charges) et tour du porteur où elles sont de nouveau prêtes (recharge) */
  relicUses: Record<string, number>
  relicReady: Record<string, number>
  /** Reliques de seuil déjà déclenchées sous leur seuil : elles se réarment quand les PV remontent au-dessus */
  relicBelow: Set<string>
  /**
   * Aura de départ : le tour de son porteur où elle se pose d'office si elle est absente (son rendez-vous). Le 3e tour (le
   * 2e, aiguisée : `auraDueTurn`), une fois ; passé (posée d'office, ou déjà là), plus aucun, jusqu'à ce qu'on la lui
   * dissipe : le rendez-vous se réarme au 2e tour suivant (D8, retour du 30 octobre)
   */
  auraDueAt: number
}

/** Le tour de son porteur où l'aura de départ se pose d'office si elle n'est pas là (docs/RESOLUTION.md, phase 1) */
export const AURA_DUE_TURN = 3
/** Dissipée, l'aura de départ revient au début de ce tour de son porteur après la dissipation (le 2e ; D8) */
export const AURA_REARM_TURNS = 2

/**
 * Le premier rendez-vous de son aura de départ : le 3e tour, le 2e si elle est aiguisée (axe `due`, retour du 30 octobre :
 * une règle pour toutes les auras), le 1er au rang III (le journal seul ; la partie s'arrête au rang II).
 */
export const auraDueTurn = (f: Character) => startAuraOf(f)?.event.dueTurn ?? AURA_DUE_TURN

/**
 * L'aura de départ d'un combattant : la compétence de la face 1 de son dé, si c'est une aura (elle ne pose qu'une aura
 * sur son lanceur) et s'il a des auras de départ (un personnage du roster, vanilla ou à l'aura choisie).
 */
export function startAuraOf(f: Character): { event: CharacterEvent; status: StatusId } | undefined {
  if (!f.definition.auras?.length) return undefined
  const event = f.events.find((e) => e.trigger === faceTrigger(1))
  if (!event || event.effects.length === 0) return undefined
  const posed = event.effects.map((e) => (e.type === 'applyStatus' && (e.target ?? 'self') === 'self' && isAura(e.status) ? e.status : undefined))
  return posed.every((s) => s !== undefined) ? { event, status: posed[0]! } : undefined
}

export interface SimulateOptions {
  rng?: Rng
  /** Graine du hasard : rend le combat rejouable à l'identique (ignorée si `rng` est fourni) */
  seed?: number
  /**
   * Mode triche : valeurs imposées par rang de dé (0 = premier dé du combat, hors initiative). Chaque
   * coup (étape `attack`) et chaque pièce (étape `coin`) consomme un rang, dans l'ordre des étapes ;
   * pour la pièce, 1 = pile et 2 = face. Avant le premier dé imposé, le combat est identique à l'original.
   */
  forcedRolls?: Readonly<Record<number, number>>
}

/**
 * Résout un combat complet à partir des stats, statuts et événements des personnages.
 * C'est l'unique moteur : jouer un combat ne fait qu'animer ce résultat.
 */
export function simulateCombat(
  fighters: Pair<Character>,
  { seed, rng: injected, forcedRolls }: SimulateOptions = {},
): CombatResult {
  const cheats = forcedRolls && Object.keys(forcedRolls).length > 0 ? forcedRolls : undefined
  /** Rang du prochain dé (mode triche) */
  let dieRank = 0
  const nextForced = () => cheats?.[dieRank++]
  const rng: Rng = injected ?? (seed !== undefined ? seededRng(seed) : defaultRng)
  // Relique d'initiative (retour du 2026-10-27, R3) : avant le jet, son porteur commence et le jet n'a pas lieu ; si les
  // deux camps en portent une, aucune ne part et le jet revient
  const heralds = SIDES.flatMap((s) => fighters[s].relics.filter((r) => r.trigger?.type === 'initiative').slice(0, 1).map((relic) => ({ side: s, relic })))
  const herald = heralds.length === 1 ? heralds[0] : undefined
  const initiative: Pair<number>[] = []
  let roll: Pair<number> = herald?.side === 0 ? [1, 0] : [0, 1]
  if (!herald)
    do {
      roll = [rollDie(rng, INITIATIVE_DIE), rollDie(rng, INITIATIVE_DIE)]
      initiative.push(roll)
    } while (roll[0] === roll[1])

  // Statuts de forme (0.73.0, druide) : ceux de la forme du moment, posés et retirés par le moteur seul
  const formStatuses = (f: Character, form: number): Status[] => (f.forms?.[form].statuses ?? []).map((id) => ({ id, stacks: 1 }))
  const states = fighters.map(
    (f): FighterState => ({
      hp: f.maxHp,
      statuses: formStatuses(f, 0),
      fired: {},
      bloodied: false,
      fresh: new Set(),
      form: 0,
      turnsTaken: 0,
      relicUses: {},
      relicReady: {},
      relicBelow: new Set(),
      auraDueAt: auraDueTurn(f),
    }),
  ) as Pair<FighterState>
  const beats: Beat[] = []
  let turn = 0
  const first: Side = roll[0] > roll[1] ? 0 : 1
  /** Phase et maître du tour en cours, recopiés dans chaque étape (l'ouverture, tour 0, appartient à celui qui ne commence pas) */
  let phase: BeatPhase = 'turnStart'
  let owner: Side = other(first)
  /**
   * Dernière étape qui a posé chaque statut, par camp : la pièce (Pile ou face) et les coups instantanés (Furie
   * des vents) ont pour cause l'étape qui a posé leur statut. Un effet s'applique juste avant l'émission de
   * l'étape qui le porte, d'où `beats.length`.
   */
  const posedBy: Pair<Partial<Record<StatusId, number>>> = [{}, {}]
  /** Dernier coup émis : cause de repli des coups instantanés dont le statut n'a pas d'auteur connu */
  let lastStrike = -1
  /** La face du dernier jet de dé de compétence de chaque camp (Cachet du greffier : la face qu'il scelle) */
  const lastFace: Pair<number | undefined> = [undefined, undefined]
  /** Émet une étape avec ses champs communs (rang, cause, phase, maître du tour, état) ; renvoie son rang. */
  const push = (body: BeatBody, cause?: number): number => {
    const id = beats.length
    beats.push({ id, ...(cause !== undefined && { cause }), phase, owner, turn, state: snapshot(), ...body })
    return id
  }
  /**
   * Le coup en cours, pendant ses fenêtres (null hors d'un coup) : a-t-il touché, combien de dégâts a-t-il faits (`dealt`,
   * comptés en entier) et de PV a-t-il vraiment retirés (`removed`, A5 du 2026-10-28 : moins que `dealt` sur un sursis), est-ce
   * un coup brut ou un jet remplacé. Les réactions d'un coup qui touche en ont besoin (Vol de vie, Riposte, jauges), et
   * les compétences de la face, qui n'y partent que si elles modifient un coup qui touche ou remplacent le jet.
   */
  let strike: { touched: boolean; dealt: number; removed: number; plain: boolean; replaced: boolean; rebound: boolean } | null = null
  /**
   * Le camp dont le jet en cours est un dé de plus (un jet de rafale après le dé de l'action ; retour du 2026-10-28, A7) :
   * rien de ce jet ne lui donne de jets de plus (`givesJets`), ni compétence, ni réaction, ni relique (`chains`).
   */
  let extraJet: Side | undefined
  /**
   * Camps qui ont regagné des PV depuis la dernière vérification d'état (`checkThresholds`) : elle leur ouvre la fenêtre
   * `healed` (Encens de l'abbaye), une fois, avec pour cause l'étape qui les a soignés.
   */
  const healed: Pair<boolean> = [false, false]
  /**
   * Camps qui ont renvoyé des dégâts depuis la dernière vérification d'état (phase 8, second lot) : une Riposte qui rend
   * une part du coup, une Rétribution qui relâche ses jauges. `checkThresholds` leur ouvre la fenêtre `reflected`, une fois,
   * avec pour cause l'étape qui a renvoyé, comme le soin reçu.
   */
  const reflected: Pair<boolean> = [false, false]
  /** Jauges relâchées en renvois (C1) par l'effet qui vient de s'appliquer : leurs coups partent après son étape (`releaseRebounds`) */
  const pendingRebounds: { side: Side; status: StatusId; parts: number[] }[] = []
  /** Les conditions d'une relique de coup, vues depuis chaque camp (`resolveAttack`) */
  const holds: Pair<(c: Condition) => boolean> = [(c) => conditionMet(0, c), (c) => conditionMet(1, c)]
  /**
   * État de référence du coup en cours (null hors d'un coup) : les statuts des deux camps au début du coup, avant son
   * dé. Règle du jeu (2026-10-21, RESOLUTION règle 9) : un statut posé ou renforcé pendant un coup ne réagit pas à ce
   * coup, il agit dès le coup suivant (le coup suivant d'une même volée compris). Vaut pour toutes les fenêtres du
   * coup : seuils, faces du dé, esquivé ou touché, et celles de la pièce qui tombe sur pile.
   */
  let strikeBase: Pair<Status[]> | null = null
  /**
   * Résout `run` avec `base` pour état de référence du coup. Un renvoi (C1) est un coup à part, résolu dans une fenêtre
   * d'un autre coup : à sa fin, l'état de référence de ce coup revient.
   */
  const withinStrike = <T,>(base: Pair<Status[]>, run: () => T): T => {
    const outer = strikeBase
    strikeBase = base
    try {
      return run()
    } finally {
      strikeBase = outer
    }
  }
  /**
   * Fenêtres d'un coup (`hit`, `hurt`…) ; `cause` : le coup (ou la pièce) ; `plain` : coup brut (Furie des vents) ;
   * `rebound` : un renvoi, auquel aucun renvoi ne répond (R1). Le coup qui l'entoure reprend à sa fin.
   */
  const fireStrike = (list: [Side, Trigger][], touched: boolean, dealt: number, removed: number, cause: number, plain = false, replaced = false, rebound = false) => {
    const outer = strike
    strike = { touched, dealt, removed, plain, replaced, rebound }
    try {
      return fireAll(list, cause)
    } finally {
      strike = outer
    }
  }

  /**
   * Sursis (retour du 2026-10-28, A15) : le tour où la Médaille de sursis a gardé ce camp. Jusqu'à la fin de ce tour, tout
   * ce qui suit compris, il ne descend pas sous 1 PV : il est figé (`Snapshot.stone`).
   */
  const stone: Pair<number | undefined> = [undefined, undefined]
  const snapshot = (): Snapshot => ({
    hp: [states[0].hp, states[1].hp],
    statuses: [states[0].statuses, states[1].statuses],
    ...(stone.includes(turn) && { stone: [stone[0] === turn, stone[1] === turn] as Pair<boolean> }),
  })
  const fallen = () => SIDES.find((s) => states[s].hp <= 0)
  const end = (winner: Side, endedBy: CombatResult['endedBy']): CombatResult => ({
    fighters,
    initiative,
    ...(herald && { initiativeRelic: { side: herald.side, relic: herald.relic.id } }),
    beats,
    turns: turn,
    winner,
    endedBy,
    mode: 'simulated',
    durationMs: 0,
    ...(seed !== undefined && !injected ? { seed } : {}),
    ...(cheats && { forcedRolls: { ...cheats } }),
  })

  /** Sursis en attente d'annonce (retour du 2026-10-27, R1) : la relique qui vient de garder ce camp à 1 PV */
  const spared: Pair<Relic | undefined> = [undefined, undefined]
  /**
   * Une perte de PV, bornée à 0. Une relique de sursis prête (Médaille de sursis) garde son porteur à 1 PV au lieu de
   * le faire tomber, et s'use ; son étape suit celle de la perte (`checkThresholds`). Il est alors figé jusqu'à la fin du
   * tour (A15) : aucune perte ne le fait descendre sous 1 PV. Les dégâts comptés ne changent pas.
   */
  function loseHp(side: Side, amount: number) {
    const s = states[side]
    s.hp = Math.max(stone[side] === turn ? Math.min(1, s.hp) : 0, s.hp - amount)
    if (s.hp > 0 || amount <= 0) return
    const medal = fighters[side].relics.find((r) => r.trigger?.type === 'lethal' && (s.relicUses[r.id] ?? 0) < (r.charges ?? 1))
    if (!medal) return
    s.relicUses[medal.id] = (s.relicUses[medal.id] ?? 0) + 1
    s.hp = 1
    spared[side] = medal
    stone[side] = turn
  }

  /**
   * Un soin remonte les PV de `side` : les reliques de seuil qui lisent ses PV (les siennes, ou un Trophée adverse)
   * et qu'il repasse se réarment tout de suite, même si une perte les refait passer dessous avant la prochaine
   * vérification (vol de vie puis Riposte, sur le même coup). Rien ne se déclenche ici.
   */
  function rearmThresholds(side: Side) {
    for (const bearer of SIDES)
      for (const relic of fighters[bearer].relics) {
        const t = relic.trigger
        const watched = t?.type === 'hpBelow' && t.who === 'opponent' ? other(bearer) : bearer
        if (t?.type === 'hpBelow' && watched === side && states[side].hp >= fighters[side].maxHp * t.ratio) states[bearer].relicBelow.delete(relic.id)
      }
  }

  /** Une valeur lue sur un statut (`StatusRead`, Virulence, Sangsue, Agonie) : `factor` fois ses charges chez qui le porte, maintenant. */
  function readStatus(owner: Side, from: StatusRead | undefined): number {
    return from ? from.factor * stacksOf(states[from.who === 'opponent' ? other(owner) : owner].statuses, from.status) : 0
  }

  /** Applique un effet à partir du porteur `owner` ; renvoie ce qui a réellement changé. */
  function applyEffect(owner: Side, effect: Effect): AppliedEffect {
    const target = effect.target === 'opponent' ? other(owner) : owner
    const state = states[target]
    switch (effect.type) {
      case 'heal': {
        // Hémorragie (`modifyHealing`) : le soin passe par les filtres des statuts du soigné, puis le plafond de PV.
        // Sangsue (`fromStatus`) : des PV en plus, lus sur un statut
        const asked = effect.amount + readStatus(owner, effect.fromStatus)
        const kept = healingOf(asked, state.statuses)
        const amount = clamp(Math.min(kept, fighters[target].maxHp - state.hp), 0)
        state.hp += amount
        rearmThresholds(target)
        if (amount > 0) healed[target] = true
        return { type: 'heal', target, amount, ...(kept !== asked && { wanted: asked }) }
      }
      case 'damage': {
        // Montant compté en entier (overkill compris) ; les PV s'arrêtent à 0. En `hits` coups : tous comptés. Contre
        // l'armure (`armored`, Clous de pavois) : chaque impact perd l'armure effective de la cible, au moins 1. Agonie
        // (`fromStatus`) : des PV en plus, lus sur un statut
        const wanted = directImpact(owner, target, clamp(effect.amount + readStatus(owner, effect.fromStatus), 0), effect.source)
        const armor = effect.armored ? effectiveStats(fighters[target], state.statuses).armor : 0
        const each = effect.armored && wanted > 0 ? Math.max(1, wanted - armor) : wanted
        const hits = effect.hits ?? 1
        const amount = each * hits
        loseHp(target, amount)
        return {
          type: 'damage',
          target,
          amount,
          source: effect.source,
          ...(hits > 1 && { parts: Array.from({ length: hits }, () => each) }),
          ...(effect.armored && { armored: true as const }),
          ...(each < wanted && { armorAbsorbed: (wanted - each) * hits }),
        }
      }
      case 'applyStatus': {
        // Pourfendre (`fromHit`) : des charges de plus, la part des PV que le coup de ce jet a retirés, arrondie au-dessus ;
        // Virulence (`fromStatus`) : `factor` fois les charges d'un statut, lues maintenant chez son porteur
        const fromHit = effect.fromHit !== undefined && strike?.touched ? Math.ceil(strike.dealt * effect.fromHit) : 0
        const fromStatus = readStatus(owner, effect.fromStatus)
        const status = statusOfEffect(effect, fromHit + fromStatus)
        // Sceau de vol (lot 3) : un bonus volable que le lanceur se pose (`isStealable` : de la zone des statuts, jamais une
        // aura ni un mécanisme ; A6 du 2026-10-28) va à l'adversaire, toutes ses charges et son intensité (un vrai vol : le
        // lanceur n'en garde rien), une charge de Sceau par vol ; ce sont les règles de la pose chez l'adversaire qui
        // s'appliquent (plafond, immunité, opposition, garde)
        const thief = target === owner && isStealable(effect.status) ? state.statuses.find((s) => STATUSES[s.id].stealsBonus) : undefined
        if (thief) {
          state.statuses = consumeStatus(state.statuses, thief.id, 1)
          const stolen = applyEffect(owner, {
            type: 'applyStatus',
            status: effect.status,
            stacks: status.stacks,
            target: 'opponent',
            ...(effect.turns !== undefined && { turns: effect.turns }),
            ...(status.power !== undefined && { power: status.power }),
          })
          return stolen.type === 'applyStatus' ? { ...stolen, stolenBy: thief.id } : stolen
        }
        const { stacks, turns } = status
        // Face scellée (D9) : elle retient la face du dernier jet de sa cible, et remplace l'ancienne
        const sealed = STATUSES[effect.status].sealsFace ? lastFace[target] : undefined
        if (sealed !== undefined) state.statuses = state.statuses.filter((s) => s.id !== effect.status)
        const { list, outcome } = resolveApplication(state.statuses, sealed !== undefined ? { ...status, power: sealed } : status, fighters[target].immunities)
        state.statuses = list
        if (outcome.kind === 'applied') state.fresh.add(effect.status)
        if (outcome.kind === 'applied') posedBy[target][effect.status] = beats.length
        return {
          type: 'applyStatus',
          target,
          status: effect.status,
          stacks,
          turns,
          result: outcome,
        }
      }
      case 'release': {
        // Le porteur de l'effet relâche son statut à jauges sur sa cible ; ou celui de l'adversaire (Embrasement : sa Brûlure)
        const holder = states[effect.from === 'opponent' ? other(owner) : owner]
        const held = holder.statuses.find((s) => s.id === effect.status)
        holder.statuses = holder.statuses.filter((s) => s.id !== effect.status)
        // Onde de choc (`per`) : ses jauges se comptent, `per` PV chacune, en une perte de dégâts directs
        if (effect.per !== undefined) {
          const count = held?.slots?.filter((n) => n > 0).length ?? 0
          const amount = directImpact(owner, target, clamp(Math.max(effect.min, effect.per * count), 0), effect.source)
          loseHp(target, amount)
          return { type: 'damage', target, amount, source: effect.source }
        }
        // Les jauges, une par coup (retour du 2026-10-27, S1) : en entier, chacune la sienne ; en part (Rétribution), le
        // montant réparti entre elles (`releaseParts`)
        const parts = releaseParts(effect, held)
        const amount = parts.reduce((a, b) => a + b, 0)
        // Ses propres jauges, relâchées sur l'adversaire : des renvois (C1), un coup sans dé par jauge, qui partent juste
        // après l'étape qui les relâche (`releaseRebounds`)
        if (effect.from !== 'opponent' && target !== owner) {
          pendingRebounds.push({ side: owner, status: effect.status, parts })
          return { type: 'rebound', target, status: effect.status, parts }
        }
        if (target !== owner) {
          const direct = directImpact(owner, target, amount, effect.source)
          loseHp(target, direct)
          return { type: 'damage', target, amount: direct, source: effect.source, ...(parts.length > 1 && direct === amount && { parts }) }
        }
        loseHp(target, amount)
        return { type: 'damage', target, amount, source: effect.source, ...(parts.length > 1 && { parts }) }
      }
      case 'cleanse': {
        // Les mécanismes (statuts de forme, mécanismes de compétence : `mechanic`) ne se purgent pas ; un vol (`steal`,
        // Larcin) ne vise que les bonus volables (`isStealable`, A6 du 2026-10-28 : ni aura ni mécanisme)
        const matching = state.statuses.filter((s) => (effect.steal ? isStealable(s.id) : STATUSES[s.id].polarity === effect.polarity && !isMechanic(s.id))).map((s) => s.id)
        // `count` : seulement les derniers posés (ordre de la liste), toutes charges comprises
        const removed = effect.count === undefined ? matching : matching.slice(-effect.count)
        // Rien à retirer : l'effet de repli joue à la place (il garde la même cible de référence, le porteur)
        if (removed.length === 0 && effect.orElse) return applyEffect(owner, effect.orElse)
        // Une purge sans compte retire toute la polarité ; une purge comptée ou un vol (`steal`, Larcin : un vrai vol, A6 du
        // 2026-10-28), les statuts visés, toutes charges comprises
        state.statuses =
          effect.count === undefined && !effect.steal ? removeStatuses(state.statuses, effect.polarity) : state.statuses.filter((s) => !removed.includes(s.id))
        // Son aura de départ dissipée : son rendez-vous se réarme au début de son 2e tour suivant (D8, retour du 30 octobre)
        const start = startAuraOf(fighters[target])
        if (start && removed.includes(start.status)) state.auraDueAt = Math.min(state.auraDueAt, state.turnsTaken + AURA_REARM_TURNS)
        return { type: 'cleanse', target, removed, ...(effect.steal && { stolen: true as const }) }
      }
    }
  }

  /**
   * Surtension (`modifyDirect`, quatrième retour du 2026-10-27) : un impact de dégâts directs que `owner` inflige à son
   * adversaire passe par les filtres de ses statuts ; ceux qu'il s'inflige ne changent pas
   */
  function directImpact(owner: Side, target: Side, amount: number, source: DamageSource): number {
    return target === owner ? amount : directDamage(states[owner].statuses, amount, source)
  }

  /** Une relique dont tous les effets seraient nuls ne part pas et ne s'use pas (Dent de loup au plafond du Vol de vie) */
  function inert(side: Side, relic: Relic) {
    return (
      muted(side, relic.effects ?? []) ||
      relicIsInert(relic, side, { hp: [states[0].hp, states[1].hp], statuses: [states[0].statuses, states[1].statuses] }, fighters)
    )
  }

  /**
   * Un effet qu'un dé de plus ne donne pas (A7 du 2026-10-28, `extraJet`) : des jets de plus à qui lance ce dé, quelle
   * qu'en soit la source (sa compétence, la réaction d'un de ses statuts, une de ses reliques)
   */
  const chains = (owner: Side, e: Effect) => extraJet === owner && e.type === 'applyStatus' && e.target !== 'opponent' && givesJets(e.status)
  /** Des effets qui ne sont que des jets qu'un dé de plus ne donne pas : ce qui les porte ne part pas (sa face est nue) */
  const muted = (owner: Side, effects: readonly Effect[]) => effects.length > 0 && effects.every((e) => chains(owner, e))

  /**
   * Applique des effets dans l'ordre et s'arrête au premier K.O. (vérification d'état). Une purge qui a retiré quelque
   * chose joue ensuite sa suite (`andThen`, Purification : sa lumière), rangée juste après elle dans les effets appliqués.
   */
  function applyEffects(owner: Side, effects: readonly Effect[]) {
    const applied: AppliedEffect[] = []
    for (const effect of effects) {
      if (chains(owner, effect)) continue
      // Larcin (`steal`) : ce que la purge retire, lu avant elle, passe au porteur de l'effet, entier (charges, durée,
      // intensité), selon ses règles de pose
      const held = effect.type === 'cleanse' && effect.steal ? states[effect.target === 'opponent' ? other(owner) : owner].statuses : []
      const done = applyEffect(owner, effect)
      applied.push(done)
      if (fallen() !== undefined) break
      // Un statut à seuil (la faute du Jugement, la note de la Ballade) : la pose qui l'amène à son seuil le fait partir,
      // toutes charges comprises, et ses effets tombent aussitôt, du point de vue de son porteur, dans cette étape
      const threshold = done.type === 'applyStatus' && done.result.kind === 'applied' ? STATUSES[done.status].threshold : undefined
      const reached = threshold && done.type === 'applyStatus' ? states[done.target].statuses.find((s) => s.id === done.status && s.stacks >= threshold.at) : undefined
      if (threshold && reached && done.type === 'applyStatus') {
        states[done.target].statuses = states[done.target].statuses.filter((s) => s.id !== reached.id)
        applied.push(...applyEffects(done.target, threshold.effects(reached)))
        if (fallen() !== undefined) break
      }
      if (effect.type === 'cleanse' && effect.steal && done.type === 'cleanse')
        for (const s of held.filter((x) => done.removed.includes(x.id))) {
          const taken = applyEffect(owner, {
            type: 'applyStatus',
            status: s.id,
            stacks: s.stacks,
            ...(s.turns !== undefined && { turns: s.turns }),
            ...(s.power !== undefined && { power: s.power }),
          })
          applied.push(taken.type === 'applyStatus' && !taken.stolenBy ? { ...taken, stolenBy: effect.steal } : taken)
        }
      if (effect.type === 'cleanse' && effect.andThen && done.type === 'cleanse' && done.removed.length > 0) {
        applied.push(applyEffect(owner, effect.andThen))
        if (fallen() !== undefined) break
      }
    }
    return applied
  }

  /**
   * Ce qu'un statut fait dans une fenêtre : sa réaction déclarée (`reactions`), ou sa réaction à un coup qui touche
   * (Vol de vie sur `hit` : les PV que ce coup a vraiment retirés lui reviennent, pas l'excès compté au-delà, A5 du
   * 2026-10-28), son intensité en plus (rangs d'aiguisage, 0.110.0). Undefined : rien. La Riposte, elle, est un renvoi
   * (`rebound`).
   */
  function reactionTo(status: Status, trigger: Trigger): Effect[] | undefined {
    const def = STATUSES[status.id]
    const declared = def.reactions?.[trigger]
    if (declared) return declared(status)
    if (!strike?.touched) return undefined
    if (trigger === 'hit' && def.drainsHit) return [{ type: 'heal', amount: strike.removed + (status.power ?? 0) }]
    return undefined
  }

  /**
   * Jauges (Rétribution) : le coup qui touche `side` range ses PV retirés dans le statut à jauges qu'il sait relâcher
   * (la plus ancienne jauge cède sa place). Une réaction sans effet : son étape montre les jauges remplies.
   */
  function fillGauge(side: Side, id: StatusId, dealt: number, cause?: number) {
    const old = states[side].statuses.find((s) => s.id === id)
    const slots = [...(old?.slots ?? []), dealt].slice(-STATUSES[id].fillsOnHurt!.slots)
    const gauge: Status = { id, stacks: slots.reduce((t, n) => t + n, 0), slots }
    states[side].statuses = old ? states[side].statuses.map((s) => (s.id === id ? gauge : s)) : [...states[side].statuses, gauge]
    push({ type: 'statusReaction', side, status: id, trigger: 'hurt', effects: [] }, cause)
  }

  /**
   * Fenêtre de déclenchement pour un camp : réactions de ses statuts (ordre de pose), puis
   * événements de son personnage (ordre de définition), puis ses reliques (ordre d'obtention).
   * Renvoie le perdant s'il y a K.O. `cause` : l'étape qui a ouvert la fenêtre (le coup, la pièce, le jet greffé,
   * l'étape qui a franchi un seuil) ; aucune pour une fenêtre de phase (début ou fin de tour, ouverture).
   */
  function fire(side: Side, trigger: Trigger, cause?: number): Side | undefined {
    // Coup brut (Furie des vents) : ses fenêtres du dé n'éveillent que les reliques (2026-10-23), ni statut ni compétence
    const relicsOnly = !!strike?.plain && isRollTrigger(trigger)
    // Statuts présents à l'ouverture de la fenêtre : un statut posé dans cette fenêtre attend la suivante (pas de
    // chaîne). Jauges (Rétribution) : celles que le porteur sait relâcher ; encore vides, elles passent après ses statuts.
    const gauges =
      trigger === 'hurt' && strike?.touched
        ? STATUS_IDS.filter((id) => STATUSES[id].fillsOnHurt && fighters[side].events.some((e) => e.effects.some((x) => x.type === 'release' && x.status === id)))
        : []
    const order: StatusId[] = [...states[side].statuses.map((s) => s.id), ...gauges.filter((id) => !states[side].statuses.some((s) => s.id === id))]
    for (const id of relicsOnly ? [] : order) {
      const def = STATUSES[id]
      if (gauges.includes(id)) {
        fillGauge(side, id, strike!.dealt, cause)
        continue
      }
      // Le statut tel qu'il est maintenant : retiré entre-temps, il ne réagit plus. Pendant un coup, seul un statut déjà
      // là au début du coup réagit, et avec au plus ses charges de ce moment (les charges ajoutées attendent le coup suivant)
      const now = states[side].statuses.find((s) => s.id === id)
      const was = strikeBase?.[side].find((s) => s.id === id)
      if (strikeBase && !was) continue
      const status = now && was && was.stacks < now.stacks ? { ...now, stacks: was.stacks } : now
      if (!status) continue
      // Riposte (C1) : un renvoi, coup sans dé d'une part des PV que ce coup a retirés, résolu comme un coup (esquive,
      // critique, armure…) ; une charge part. Aucun renvoi ne répond à un renvoi (R1) : la charge attend
      if (def.reflectsHit && trigger === 'hurt') {
        if (!strike?.touched || strike.rebound) continue
        states[side].statuses = consumeStatus(states[side].statuses, id, 1)
        const down = rebound(side, id, trigger, Math.round(strike.dealt * def.reflectsHit) + (status.power ?? 0), cause, false)
        if (down !== undefined) return down
        continue
      }
      const react = reactionTo(status, trigger)
      if (!react) continue
      // Une relâche du statut de l'adversaire (Embrasement, phase 8) attend qu'il le porte ; un soin ou des dégâts qui ne
      // valent que ce qu'ils lisent sur un statut (Sangsue, 2026-10-27) attendent qu'il soit là ; un Larcin (`cleanse.steal`)
      // attend un bonus volable à prendre ; des jets de plus attendent un jet qui n'est pas un dé de plus (A7) : sans eux,
      // la réaction ne part pas
      const idle = (e: Effect) =>
        (e.type === 'release' && e.from === 'opponent' && !states[other(side)].statuses.some((s) => s.id === e.status)) ||
        ((e.type === 'heal' || e.type === 'damage') && e.fromStatus !== undefined && e.amount + readStatus(side, e.fromStatus) <= 0) ||
        (e.type === 'cleanse' && e.steal !== undefined && !states[e.target === 'opponent' ? other(side) : side].statuses.some((s) => isStealable(s.id))) ||
        chains(side, e) ||
        // Une aura qui ne ferait que reposer sur son porteur un statut déjà à son plafond (la Mire de la Visée à +3) ne part
        // pas : rien ne changerait (M25)
        (isAura(id) && e.type === 'applyStatus' && (e.target ?? 'self') === 'self' && STATUSES[e.status].maxStacks !== undefined && stacksOf(states[side].statuses, e.status) >= STATUSES[e.status].maxStacks! && !e.power)
      if (react.length > 0 && react.every(idle)) continue
      const effects = applyEffects(side, react)
      if (def.spentOnReaction) states[side].statuses = states[side].statuses.filter((s) => s.id !== id)
      // Saignement, Vol de vie : le statut agit avec ses charges, puis en perd une dans la même étape
      else if (def.decays || def.drainsHit) states[side].statuses = consumeStatus(states[side].statuses, id, 1)
      const beat = push({ type: 'statusReaction', side, status: id, trigger, effects }, cause)
      const down = fallen() ?? checkThresholds(beat) ?? releaseRebounds(beat)
      if (down !== undefined) return down
    }
    for (const event of relicsOnly ? [] : fighters[side].events) {
      if (event.trigger !== trigger) continue
      // Une compétence du dé ne part dans la fenêtre de sa face que si elle modifie un coup qui touche (un coup doit
      // toucher pour poser un malus physique, vérifié avant tout tirage) ou si son jet est remplacé ; greffée, elle est
      // déjà partie au jet (`fireGrafts`)
      if (isRollTrigger(trigger) && !(strike?.replaced || (relationOf(event) === 'modify' && strike?.touched))) continue
      if (!canFire(side, event)) continue
      const down = fireEvent(side, event, trigger, cause)
      if (down !== undefined) return down
    }
    // Reliques : un moment du coup, ou le début d'un de ses tours (à partir du tour de la relique)
    for (const relic of fighters[side].relics) {
      const t = relic.trigger
      const due = t?.type === 'strike' ? t.on === trigger : t?.type === 'turn' && trigger === 'turnStart' && states[side].turnsTaken >= t.turn
      if (!due) continue
      const down = fireRelic(side, relic, cause)
      if (down !== undefined) return down
    }
    return undefined
  }

  /** Une condition d'événement, vue depuis le porteur `side`. */
  function conditionMet(side: Side, c: Condition): boolean {
    if (c.type === 'fromTurn') return turn >= c.turn
    // Les PV que le coup en cours a retirés (Écu cabossé) : seulement dans les fenêtres d'un coup qui touche
    if (c.type === 'hitAtLeast') {
      const now = strike
      return !!now?.touched && now.dealt >= c.amount
    }
    const target = c.who === 'opponent' ? other(side) : side
    const state = states[target]
    switch (c.type) {
      case 'hpBelow':
        return state.hp < fighters[target].maxHp * c.ratio
      case 'hpAtLeast':
        return state.hp >= fighters[target].maxHp * c.ratio
      case 'hasStatus':
        return stacksOf(state.statuses, c.status) >= (c.stacks ?? 1)
      case 'lacksStatus':
        return stacksOf(state.statuses, c.status) === 0
    }
  }

  /** La compétence existe-t-elle sous la forme actuelle du porteur (`form`) ? */
  function inForm(side: Side, event: CharacterEvent) {
    return !event.form || event.form === fighters[side].forms?.[states[side].form].id
  }

  /** Une compétence part : ses effets s'appliquent, son étape est émise. Renvoie le perdant s'il y a K.O. */
  function fireEvent(side: Side, event: CharacterEvent, trigger: Trigger, cause?: number): Side | undefined {
    states[side].fired[event.id] = (states[side].fired[event.id] ?? 0) + 1
    const effects = applyEffects(side, event.effects)
    const id = push({ type: 'event', event: { side, eventId: event.id, name: event.name, trigger, effects } }, cause)
    return fallen() ?? checkThresholds(id) ?? releaseRebounds(id)
  }

  /**
   * Au jet (règles v2, phase 5 bis) : les compétences de cette face qui se greffent sur le coup de base, dans l'ordre de
   * définition, avant le coup. Ni statut ni relique : la fenêtre de la face s'ouvre ensuite avec le coup.
   */
  function fireGrafts(side: Side, roll: number, cause: number): Side | undefined {
    for (const event of fighters[side].events) {
      if (!isRollTrigger(event.trigger) || relationOf(event) !== 'graft' || !rollMatches(event.trigger, roll, DIE_FACES)) continue
      if (!canFire(side, event)) continue
      const down = fireEvent(side, event, event.trigger, cause)
      if (down !== undefined) return down
    }
    return undefined
  }

  function canFire(side: Side, event: CharacterEvent) {
    if (!inForm(side, event)) return false
    if (event.limit !== undefined && (states[side].fired[event.id] ?? 0) >= event.limit) return false
    if (event.when && !event.when.every((c) => conditionMet(side, c))) return false
    // Un dé de plus ne lance pas une compétence qui ne donne que des jets de plus (A7) : sa face est nue
    if (muted(side, event.effects)) return false
    // Le tirage n'a lieu que pour les événements aléatoires : les autres ne consomment pas de hasard.
    return event.chance === undefined || chance(rng, event.chance)
  }

  /**
   * Relique prête : il lui reste une charge, sa recharge est passée, ses conditions sont remplies, et son effet change
   * quelque chose (0.110.0). Aucun tirage : une relique n'a pas de chance de déclenchement.
   */
  function fireRelic(side: Side, relic: Relic, cause?: number): Side | undefined {
    const s = states[side]
    const uses = s.relicUses[relic.id] ?? 0
    if (relic.charges !== undefined && uses >= relic.charges) return undefined
    if (s.turnsTaken < (s.relicReady[relic.id] ?? 0)) return undefined
    if (relic.when && !relic.when.every((c) => conditionMet(side, c))) return undefined
    // Le Cachet du greffier ne scelle rien tant que l'adversaire n'a pas jeté son dé
    if (relic.effects?.some((e) => e.type === 'applyStatus' && STATUSES[e.status].sealsFace) && lastFace[other(side)] === undefined) return undefined
    if (inert(side, relic)) return undefined
    s.relicUses[relic.id] = uses + 1
    if (relic.cooldown) s.relicReady[relic.id] = s.turnsTaken + relic.cooldown
    const effects = applyEffects(side, relic.effects ?? [])
    const id = push({ type: 'relic', side, relic: relic.id, name: relic.name, effects, uses: uses + 1 }, cause)
    return fallen() ?? checkThresholds(id) ?? releaseRebounds(id)
  }

  /**
   * Après chaque changement de PV : la fenêtre `healed` de qui a regagné des PV (Encens de l'abbaye), puis les seuils,
   * « bloodied » (la première fois sous la moitié) et les reliques de seuil, qui partent quand les PV passent sous le
   * leur et se réarment s'ils remontent au-dessus. L'actif d'abord, puis le défenseur (§ 5, règle 1).
   * `cause` : l'étape dont le changement de PV est vérifié ; elle devient la cause de ce qui se déclenche.
   */
  function checkThresholds(cause: number): Side | undefined {
    const order: Side[] = [owner, other(owner)]
    // Sursis (R1) : la relique s'annonce juste après l'étape qui aurait fait tomber son porteur, avant tout le reste
    for (const side of order) {
      const medal = spared[side]
      if (!medal) continue
      spared[side] = undefined
      push({ type: 'relic', side, relic: medal.id, name: medal.name, effects: [], uses: states[side].relicUses[medal.id] }, cause)
    }
    // Les passages se lisent sur les PV du changement vérifié (0.85.0) et sont tous marqués avant qu'aucun ne parte
    // (0.110.0) : chacun a ce changement pour cause, pas la relique partie avant lui ; une relique qui soigne (Larme de
    // givre) n'efface pas le passage d'une autre (Trophée adverse, même coup). Une relique dont l'effet serait nul
    // n'est pas marquée : elle attend une vérification où elle ajoute quelque chose.
    const due: [Side, Relic][] = []
    for (const side of order)
      for (const relic of fighters[side].relics) {
        const t = relic.trigger
        if (t?.type !== 'hpBelow') continue
        // Le seuil lit les PV du porteur, ou ceux de l'adversaire (Trophée du chasseur) ; l'effet reste au porteur
        const watched = t.who === 'opponent' ? other(side) : side
        const hp = states[watched].hp
        const below = states[side].relicBelow
        if (hp >= fighters[watched].maxHp * t.ratio) below.delete(relic.id)
        else if (hp > 0 && !below.has(relic.id) && !inert(side, relic)) {
          below.add(relic.id)
          due.push([side, relic])
        }
      }
    // Soin reçu : la fenêtre s'ouvre une fois par étape soignante, avant les seuils ; ce qu'elle déclenche vérifie
    // l'état à son tour (une relique qui soignerait rouvrirait la fenêtre, avec sa propre étape pour cause)
    for (const side of order) {
      if (!healed[side]) continue
      healed[side] = false
      const down = fire(side, 'healed', cause)
      if (down !== undefined) return down
    }
    // Dégâts renvoyés (phase 8, second lot) : de même, une fois par étape qui renvoie, après le soin reçu
    for (const side of order) {
      if (!reflected[side]) continue
      reflected[side] = false
      const down = fire(side, 'reflected', cause)
      if (down !== undefined) return down
    }
    for (const side of order) {
      const s = states[side]
      if (s.bloodied || s.hp <= 0 || s.hp >= fighters[side].maxHp / 2) continue
      s.bloodied = true
      const down = fire(side, 'bloodied', cause)
      if (down !== undefined) return down
    }
    for (const [side, relic] of due) {
      // Devenue nulle entre-temps (une relique partie avant elle) : elle n'est plus marquée et attend
      if (inert(side, relic)) {
        states[side].relicBelow.delete(relic.id)
        continue
      }
      const down = fireRelic(side, relic, cause)
      if (down !== undefined) return down
    }
    return fallen()
  }

  /** Enchaîne des fenêtres et s'arrête au premier K.O. */
  function fireAll(list: [Side, Trigger][], cause?: number) {
    for (const [side, trigger] of list) {
      const down = fire(side, trigger, cause)
      if (down !== undefined) return down
    }
    return undefined
  }

  /**
   * Effets de tour des statuts du porteur (`onTurnStart` ou `onTurnEnd`) : bonus d'abord, puis
   * malus, chacun dans l'ordre de pose. Puis décompte des durées qui s'usent à ce moment-là.
   */
  function statusPhase(side: Side, phase: TurnPhase): Side | undefined {
    const order: Polarity[] = ['positive', 'negative']
    const ticking = order.flatMap((p) => states[side].statuses.filter((s) => STATUSES[s.id].polarity === p))
    const faded: StatusId[] = []
    /** Étape d'effet de chaque statut dans cette phase : son décompte et son expiration en découlent */
    const ticks = new Map<StatusId, number>()
    for (const status of ticking) {
      const def = STATUSES[status.id]
      const tick = phase === 'turnStart' ? def.onTurnStart?.(status) : def.onTurnEnd?.(status)
      // Un statut retiré entre-temps (ex. annulé par son opposé) n'agit plus.
      if (!tick || !states[side].statuses.some((s) => s.id === status.id)) continue
      const effects = applyEffects(side, tick)
      // S'estomper est la règle même du statut : il perd une charge chaque fois qu'il agit, dans l'étape de son effet
      if (def.decays) {
        states[side].statuses = consumeStatus(states[side].statuses, status.id, 1)
        if (!states[side].statuses.some((s) => s.id === status.id)) faded.push(status.id)
      }
      const id = push({ type: 'statusTick', phase, side, status: status.id, effects })
      ticks.set(status.id, id)
      const down = fallen() ?? checkThresholds(id) ?? releaseRebounds(id)
      if (down !== undefined) return down
    }
    // Un statut posé pendant ce tour n'est pas décompté à sa fin : « 1 tour » dure jusqu'au prochain.
    const fresh = phase === 'turnEnd' ? states[side].statuses.filter((s) => states[side].fresh.has(s.id)) : []
    const { kept: aged, expired } = tickDurations(
      states[side].statuses.filter((s) => !fresh.includes(s)),
      phase,
    )
    const kept = states[side].statuses.flatMap((s) => (fresh.includes(s) ? [s] : aged.filter((a) => a.id === s.id)))
    const changes = kept.flatMap((s) => {
      const was = states[side].statuses.find((w) => w.id === s.id)
      return was?.turns !== undefined && s.turns !== undefined && was.turns !== s.turns
        ? [{ status: s.id, from: was.turns, to: s.turns }]
        : []
    })
    states[side].statuses = kept
    // Une seule étape pour l'usure de la phase : durées décomptées et statuts éteints (épuisés ou expirés). Sa cause :
    // l'effet du premier statut concerné qui a agi dans cette phase (son « −2 » et son compteur vont ensemble)
    const gone = [...faded, ...expired]
    if (changes.length || gone.length)
      push(
        { type: 'statusAge', phase, side, changes, expired: gone },
        [...changes.map((c) => c.status), ...gone].map((s) => ticks.get(s)).find((t) => t !== undefined),
      )
    return undefined
  }

  /**
   * Les compétences de cette face qui ont cette relation au coup et peuvent partir : même règle que leur déclenchement
   * (forme, limite, conditions), sans tirage. `validateRoster` refuse `chance` à une compétence qui remplace le coup ou
   * qui le multiplie : le moteur doit savoir dès le jet si le coup part, et ce qu'il vaut.
   */
  function ready(side: Side, roll: number, relation: HitRelation) {
    return fighters[side].events.filter(
      (e) =>
        relationOf(e) === relation &&
        inForm(side, e) &&
        isRollTrigger(e.trigger) &&
        rollMatches(e.trigger, roll, DIE_FACES) &&
        (e.limit === undefined || (states[side].fired[e.id] ?? 0) < e.limit) &&
        (!e.when || e.when.every((c) => conditionMet(side, c))) &&
        !muted(side, e.effects),
    )
  }

  /**
   * Le coup de base de ce jet, avec son multiplicateur : une compétence de sa face qui le modifie avec `hitMultiplier`
   * (Crescendo, Soliste) en fait « ce coup ×N » ; Crescendo (`buildsUp`) gagne ×1 de plus chaque fois qu'il est parti.
   * Elle part ensuite, comme toute compétence qui modifie, dans la fenêtre de sa face si le coup touche.
   */
  function baseHit(side: Side, jetRoll: StrikeRoll): StrikeRoll {
    const multiplier = ready(side, jetRoll.roll, 'modify').reduce(
      (m, e) => m * (e.hitMultiplier === undefined ? 1 : e.hitMultiplier + (e.buildsUp ? (states[side].fired[e.id] ?? 0) : 0)),
      1,
    )
    return multiplier > 1 ? { ...jetRoll, multiplier } : jetRoll
  }

  /**
   * Le porteur a-t-il, sous sa forme du moment, une compétence de cette face qui se greffe sur le coup et peut partir
   * (limite, conditions : une compétence épuisée laisse sa face nue, 0.107.0) ? Sa chance se tire au déclenchement.
   */
  function grafts(side: Side, roll: number) {
    return ready(side, roll, 'graft').length > 0
  }

  /** Lance le d6 (un rang de dé en mode triche). */
  function drawDie(): { roll: number; forced: boolean } {
    const forced = nextForced()
    return { roll: forceRoll(rollDie(rng, DIE_FACES), DIE_FACES, forced), forced: forced !== undefined }
  }

  /**
   * Un jet complet (règles v2, phase 5 bis, docs/RESOLUTION.md § 2) : un dé, qui désigne une face. Sa compétence
   * remplace le coup (jet remplacé), ou se greffe (étape roll, la compétence, puis le coup de base au dé tiré), ou modifie
   * le coup (elle part dans ses fenêtres s'il touche, ou le multiplie) ; une face nue ne porte que le coup de base.
   * `cause` : la rafale dont le jet fait partie (Coup de chance). `die` : le dé déjà tiré (le dé de compétence d'une
   * rafale, ou le dé de frappe d'un Doublé), à défaut le jet tire le sien.
   */
  function jet(attacker: Side, cause?: number, die?: { roll: number; forced: boolean }): Side | undefined {
    // Coups instantanés (Furie des vents) : juste après le jet qui les a posés, dans la même action (RESOLUTION § 2)
    return throwDie(attacker, cause, die) ?? burst(attacker)
  }

  function throwDie(attacker: Side, cause?: number, die = drawDie()): Side | undefined {
    // Dé de joueur (D9) : un jet sur une face nue (aucune compétence prête) est relancé, une fois par tour ; un dé imposé
    // (mode triche) ne se relance pas
    const s = states[attacker]
    const reroll = die.forced ? undefined : fighters[attacker].relics.find((r) => r.trigger?.type === 'bareFace' && s.turnsTaken >= (s.relicReady[r.id] ?? 0))
    if (reroll && !(['graft', 'modify', 'replace'] as const).some((rel) => ready(attacker, die.roll, rel).length > 0)) {
      const uses = (s.relicUses[reroll.id] ?? 0) + 1
      s.relicUses[reroll.id] = uses
      s.relicReady[reroll.id] = s.turnsTaken + (reroll.cooldown ?? 1)
      push({ type: 'relic', side: attacker, relic: reroll.id, name: reroll.name, effects: [], uses }, cause)
      die = drawDie()
    }
    const { roll, forced } = die
    lastFace[attacker] = roll
    // Face scellée (D9, Cachet du greffier) : un jet sur la face scellée qui porterait une compétence ne porte que son coup
    // de base, un coup brut ; un dé imposé garde sa compétence
    const seal = forced ? undefined : s.statuses.find((x) => STATUSES[x.id].sealsFace && x.power === roll)
    if (seal && JINXED_RELATIONS.some((r) => ready(attacker, roll, r).length > 0)) {
      const rolled = push({ type: 'roll', side: attacker, roll, faces: DIE_FACES, sealedBy: seal.id }, cause)
      return strikeOnce(attacker, { roll, preset: true }, true, rolled)
    }
    // Malchance (lot 3) : un jet qui porterait une compétence tombe à vide (une charge par jet). Le dé est tiré comme
    // avant ; un dé imposé (mode triche) garde sa valeur et laisse la charge
    const jinx = forced ? undefined : states[attacker].statuses.find((s) => STATUSES[s.id].jinxesRoll)
    if (jinx && JINXED_RELATIONS.some((r) => ready(attacker, roll, r).length > 0)) {
      states[attacker].statuses = consumeStatus(states[attacker].statuses, jinx.id, 1)
      const rolled = push({ type: 'roll', side: attacker, roll, faces: DIE_FACES, jinxedBy: jinx.id }, cause)
      return strikeOnce(attacker, { roll, preset: true, jinxed: true }, false, rolled)
    }
    if (ready(attacker, roll, 'replace').length > 0) return strikeOnce(attacker, { roll, forced, replaced: true }, false, cause)
    if (!grafts(attacker, roll)) return strikeOnce(attacker, baseHit(attacker, { roll, forced }), false, cause)
    const rolled = push({ type: 'roll', side: attacker, roll, faces: DIE_FACES, ...(forced && { forced: true as const }) }, cause)
    const down = fireGrafts(attacker, roll, rolled)
    if (down !== undefined) return down
    return strikeOnce(attacker, baseHit(attacker, { roll, preset: true }), false, rolled)
  }

  /**
   * Un coup de base de `attacker` (ou un jet remplacé), fenêtres comprises, au jet déjà tiré. Renvoie le perdant s'il y a
   * K.O. `plain` : coup brut (Furie des vents), dont la face ne déclenche aucune compétence (les reliques, si).
   * `cause` : l'étape `roll` ou `flurry` dont ce coup fait partie ; aucune pour le coup simple de l'action.
   */
  function strikeOnce(attacker: Side, jetRoll: StrikeRoll, plain = false, cause?: number): Side | undefined {
    const defender = other(attacker)
    // État de référence du coup : les statuts de ce moment, après une compétence greffée (règle 9)
    const base: Pair<Status[]> = [states[0].statuses, states[1].statuses]
    const outcome = resolveAttack(rng, fighters[attacker], fighters[defender], states[attacker].statuses, states[defender].statuses, jetRoll, holds[attacker])
    const before = states[defender].hp
    const { touched, emptied } = landStrike(attacker, outcome)
    const dealt = outcome.damage
    const removed = before - states[defender].hp
    const hit = push({ type: 'attack', attack: { attacker, ...outcome, dealt, ...(plain && { plain: true as const }) } }, cause)
    lastStrike = hit
    if (states[defender].hp === 0) return defender

    // Fenêtres du coup : seuils, faces du dé (reliques seules pour un coup brut), puis esquivé ou touché. Vol de vie,
    // Riposte et jauges y réagissent comme toute réaction (2026-10-21 : une seule règle pour « un coup qui touche »).
    // Seuls les statuts déjà là au début du coup y réagissent (`strikeBase`).
    const fell = withinStrike(base, () => {
      const down = checkThresholds(hit)
      if (down !== undefined) return down
      const faces: [Side, Trigger][] = [faceTrigger(outcome.roll), ...(outcome.roll === DIE_FACES ? ['naturalMax' as const] : [])].map((t) => [attacker, t])
      // Un jet tombé à vide : ses fenêtres du dé n'éveillent que les reliques, comme un coup brut
      return fireStrike([...faces, ...strikeWindows(attacker, outcome, touched, emptied)], touched, dealt, removed, hit, plain || !!outcome.jinxed, outcome.replaced)
    })
    if (fell !== undefined) return fell
    // Pile ou face : la pièce part aussitôt, juste après le coup qui l'a posée ; pile, ce coup ×N
    return tossCoin(attacker, hit, dealt, outcome.crit && !outcome.dodged)
  }

  /**
   * Ce qu'un coup résolu change à l'état, au moment du coup, coup de base comme renvoi (C1 : une seule voie) : les
   * charges qu'il dépense (critique assuré, esquive assurée, boucliers, Fausse note, Vol de vie esquivé, Luciole),
   * l'armure temporaire qu'il brise, les PV perdus. `emptied` : un bouclier du défenseur a absorbé tout ce qui lui restait.
   */
  function landStrike(attacker: Side, outcome: StrikeOutcome): { touched: boolean; emptied: boolean } {
    const defender = other(attacker)
    const att = states[attacker]
    const def = states[defender]
    const touched = !outcome.dodged && !outcome.replaced && !outcome.jinxed
    if (outcome.critBy) att.statuses = consumeStatus(att.statuses, outcome.critBy, 1)
    if (outcome.dodgeBy) def.statuses = consumeStatus(def.statuses, outcome.dodgeBy, 1)
    for (const { status, absorbed } of outcome.shields) def.statuses = consumeStatus(def.statuses, status, absorbed)
    // Bouclier vidé (phase 8, second lot) : un bouclier du défenseur a absorbé tout ce qui lui restait
    const emptied = outcome.shields.some(({ status }) => !def.statuses.some((s) => s.id === status))
    // Fausse note : le coup du porteur qui touche l'a subie, elle disparaît avec toutes ses charges (`spentOnHit`) ; aiguisée
    // (0.110.0), elle use d'abord son intensité, un coup de plus chacune
    if (touched)
      att.statuses = att.statuses.flatMap((x) => {
        if (!STATUSES[x.id].spentOnHit) return [x]
        if (!x.power) return []
        const { power, ...rest } = x
        return [power > 1 ? { ...rest, power: power - 1 } : rest]
      })
    // Vol de vie sur un coup esquivé : la charge est perdue sans soin, au moment même du coup (un jet remplacé ne
    // porte pas de coup : la charge reste). Sur un coup qui touche, il réagit dans la fenêtre `hit`.
    const drain = outcome.dodged ? att.statuses.find((s) => STATUSES[s.id].drainsHit) : undefined
    if (drain) att.statuses = consumeStatus(att.statuses, drain.id, 1)
    // Garde brisée : le coup qui touche brise toute l'armure temporaire du défenseur, sans ouvrir sa fenêtre `shieldBroken` ;
    // ce qui ne tient que par elle (Poing de pierre, `whileShielded`) part avec elle
    if (touched && outcome.shatteredBy) def.statuses = def.statuses.filter((s) => !STATUSES[s.id].shield && !STATUSES[s.id].whileShielded)
    // Luciole : chaque coup qui touche le porteur lui retire une charge (`spentOnHurt`)
    if (touched) for (const s of def.statuses.filter((x) => STATUSES[x.id].spentOnHurt)) def.statuses = consumeStatus(def.statuses, s.id, 1)
    loseHp(defender, outcome.damage)
    return { touched, emptied }
  }

  /**
   * Les fenêtres d'un coup résolu, après celles de sa face : esquivé, `missed` (actif) puis `dodge` (défenseur ; un coup
   * raté d'aveuglé n'ouvre que `missed`, l'esquive est un geste du défenseur) ; touché, `hit`, `crit`, `hurt`, puis
   * `shieldBroken` s'il a vidé un bouclier.
   */
  function strikeWindows(attacker: Side, outcome: StrikeOutcome, touched: boolean, emptied: boolean): [Side, Trigger][] {
    const defender = other(attacker)
    if (outcome.dodged) return [[attacker, 'missed'], ...(outcome.blindedBy ? [] : [[defender, 'dodge'] as [Side, Trigger]])]
    if (!touched) return []
    // Gros coup (quatrième retour du 2026-10-27) : un critique, ou un coup ×2 et plus (Assaut, Soliste, Crescendo), juste
    // après la fenêtre du critique
    const heavy = outcome.crit || (outcome.multiplier ?? 1) >= 2
    return [
      [attacker, 'hit'],
      ...(outcome.crit ? [[attacker, 'crit'] as [Side, Trigger]] : []),
      ...(heavy ? [[attacker, 'heavy'] as [Side, Trigger]] : []),
      [defender, 'hurt'],
      // Critique reçu (retour du 30 octobre, D9) : juste après le coup reçu
      ...(outcome.crit ? [[defender, 'critHurt'] as [Side, Trigger]] : []),
      ...(emptied ? [[defender, 'shieldBroken'] as [Side, Trigger]] : []),
    ]
  }

  /**
   * Un renvoi (retour du 2026-10-27, C1, RESOLUTION § 9) : un coup sans dé de `side`, d'une valeur fixée, porté par la
   * réaction de son statut `status` (la Riposte, une jauge de la Rétribution). Il est résolu et appliqué comme un coup de
   * base (`resolveAttack`, `landStrike`) : esquive, critique (le Critique assuré s'y dépense, R2), reliques de coup sans
   * face (R4), modificateurs, armure, boucliers ; puis ses fenêtres, sans face, où aucun renvoi ne lui répond (R1).
   * `returned` : ce renvoi ferme une série (la Riposte seule, le dernier coup d'une Rétribution) et ouvre le moment
   * `reflected` si lui ou un coup d'avant de la série (`returned` vrai) a retiré des PV, juste après son étape ; undefined
   * pour un coup au milieu de la série. Renvoie le perdant s'il y a K.O.
   */
  function rebound(side: Side, status: StatusId, trigger: Trigger, value: number, cause: number | undefined, returned: boolean | undefined): Side | undefined {
    const target = other(side)
    const base: Pair<Status[]> = [states[0].statuses, states[1].statuses]
    const outcome = resolveAttack(rng, fighters[side], fighters[target], states[side].statuses, states[target].statuses, { roll: 0, fixed: value }, holds[side])
    const before = states[target].hp
    const { touched, emptied } = landStrike(side, outcome)
    const dealt = outcome.damage
    const removed = before - states[target].hp
    if (returned !== undefined && (returned || (touched && dealt > 0))) reflected[side] = true
    const effects: AppliedEffect[] = touched ? [{ type: 'damage', target, amount: dealt, source: 'strike' }] : []
    const beat = push({ type: 'statusReaction', side, status, trigger, effects, strike: { attacker: side, ...outcome, dealt } }, cause)
    if (states[target].hp === 0) return target
    return withinStrike(base, () => checkThresholds(beat) ?? fireStrike(strikeWindows(side, outcome, touched, emptied), touched, dealt, removed, beat, false, false, true))
  }

  /**
   * Les jauges relâchées par l'étape `cause` (Rétribution) : un renvoi par jauge, chacun un coup à part (R3), dans
   * l'ordre des jauges ; le moment `reflected` une fois, après le dernier, si l'un d'eux a retiré des PV. Un renvoi ne
   * déclenche pas de renvoi (R1) : relâchées pendant un renvoi, les jauges partent sans coup.
   */
  function releaseRebounds(cause: number): Side | undefined {
    const b = beats[cause]
    const trigger: Trigger =
      b.type === 'event' ? b.event.trigger : b.type === 'statusReaction' ? b.trigger : b.type === 'statusTick' ? b.phase : b.type === 'coin' ? 'heads' : 'hit'
    while (pendingRebounds.length > 0) {
      const { side, status, parts } = pendingRebounds.shift()!
      if (strike?.rebound) continue
      const from = beats.length
      for (const [k, value] of parts.entries()) {
        const landed = beats.slice(from).some((x) => x.type === 'statusReaction' && x.cause === cause && !!x.strike && x.effects.length > 0)
        const down = rebound(side, status, trigger, value, cause, k === parts.length - 1 ? landed : undefined)
        if (down !== undefined) return down
      }
    }
    return undefined
  }

  /**
   * Pile ou face (relation « modifie », règles v2) : si `side` détient une pièce, il la lance tout de suite (pile = 1 sur
   * un d2, un rang de dé). Pile, ce coup ×N (`coinToss.multiplier`) : les PV qu'il a retirés (`dealt`), encore N − 1 fois,
   * en coup et en une perte ; s'ils « touchent » (0.42.0), les fenêtres `hit` et `hurt` s'ouvrent comme pour un coup qui
   * touche de ce montant : tout ce qui réagit à un coup qui touche réagit (Aura de décoction, Épines, Saignement, Vol de
   * vie, Riposte, jauges). Le statut est consommé. Renvoie le perdant s'il y a K.O. La pièce a pour cause l'étape qui l'a
   * posée, à défaut le coup `after`. Pile critique (A14) : une pièce d'effet lancée par un coup critique (`crit`) double
   * son effet de pile (`critDoubled`) ; Pile ou face n'en a pas besoin, pile multiplie déjà le coup critique.
   */
  function tossCoin(side: Side, after: number, dealt: number, crit: boolean): Side | undefined {
    const coin = states[side].statuses.find((s) => STATUSES[s.id].coinToss)
    if (!coin) return undefined
    // État de référence de la pièce (un coup à part entière, règle 9) : les statuts au moment où elle part
    const base: Pair<Status[]> = [states[0].statuses, states[1].statuses]
    states[side].statuses = states[side].statuses.filter((s) => s.id !== coin.id)
    const toss = STATUSES[coin.id].coinToss!
    const forced = nextForced()
    // Pile = 1 sur un d2 ; une Pièce lestée (R4, 2026-10-27) et un Dé pipé (Maîtrises, M9 : `StatusDef.headsChance` par
    // charge) ajoutent leur chance de pile, une pièce d'effet aiguisée 1 chance sur 6 par rang (`COIN_RANK_HEADS`), le tout
    // plafonné à 5 sur 6 (`HEADS_CAP`). Un seul tirage dans tous les cas : la suite du hasard ne change pas (sans relique,
    // aura ni rang, le tirage est celui du d2)
    const ranked = toss.multiplier === undefined ? (coin.power ?? 0) * COIN_RANK_HEADS : 0
    const fromStatuses = base[side].reduce((p, s) => p + (STATUSES[s.id].headsChance ?? 0) * s.stacks, ranked)
    const bias = fighters[side].relics.reduce((p, r) => p + (r.headsChance ?? 0), fromStatuses)
    const heads = forceRoll(rng() < Math.min(HEADS_CAP, 0.5 + bias) ? 1 : 2, 2, forced) === 1
    // Aiguisée (0.110.0) : son intensité monte le multiplicateur de pile
    const extra = toss.multiplier !== undefined ? dealt * (toss.multiplier + (coin.power ?? 0) - 1) : 0
    const critical = crit && toss.multiplier === undefined
    const onHeads: readonly Effect[] =
      toss.multiplier !== undefined ? [{ type: 'damage', amount: extra, target: 'opponent', source: 'strike' }] : critical ? toss.heads.map(critDoubled) : toss.heads
    const foeBefore = states[other(side)].hp
    const effects = heads ? applyEffects(side, onHeads) : []
    const removed = foeBefore - states[other(side)].hp
    const id = push(
      { type: 'coin', side, status: coin.id, heads, effects, ...(forced !== undefined && { forced: true as const }), ...(critical && { crit: true as const }) },
      posedBy[side][coin.id] ?? after,
    )
    return withinStrike(base, () => {
      const down = fallen() ?? checkThresholds(id) ?? releaseRebounds(id)
      if (down !== undefined || !heads) return down
      // Pile (phase 8, second lot) : la fenêtre `heads` du lanceur, puis, si pile touche, celles d'un coup qui touche
      const windows: [Side, Trigger][] = [[side, 'heads']]
      if (toss.headsTouches) windows.push([side, 'hit'], [other(side), 'hurt'])
      return fireStrike(windows, !!toss.headsTouches, extra, removed, id)
    })
  }

  /**
   * Coups instantanés (Furie des vents) : les charges gagnées pendant un jet frappent juste après lui, toutes à la fois,
   * en coups de base bruts (0.69.0), chacun avec son dé : ils ne déclenchent aucune compétence, donc aucune Furie en
   * chaîne. Chaque charge donne `extraStrikes` coups, plus son intensité (Furie aiguisée, 0.110.0). Ils ont pour cause
   * l'étape qui a posé la charge (Furie des vents sur un 2), à défaut le dernier coup. Chaque statut de coups instantanés
   * détenu au début de la rafale part, dans l'ordre de pose (phase 8, lot 3) : une charge que l'Ivresse du sang a posée au
   * critique d'un coup brut, qui attendait ce jet, puis celle de ce jet. Une charge gagnée pendant ces coups attend le
   * prochain jet.
   */
  function burst(attacker: Side): Side | undefined {
    const held = states[attacker].statuses.filter((s) => STATUSES[s.id].instantStrikes).map((s) => s.id)
    for (const id of held) {
      const att = states[attacker]
      const charge = att.statuses.find((s) => s.id === id)
      if (!charge) continue
      const strikes = ((STATUSES[charge.id].extraStrikes ?? 1) + (charge.power ?? 0)) * charge.stacks
      att.statuses = att.statuses.filter((s) => s.id !== charge.id)
      const burstBeat = push(
        { type: 'flurry', side: attacker, status: charge.id, strikes, faces: Array.from({ length: strikes }, () => DIE_FACES) },
        posedBy[attacker][charge.id] ?? lastStrike,
      )
      for (let k = 0; k < strikes; k++) {
        const { roll, forced } = drawDie()
        const down = strikeOnce(attacker, { roll, forced }, true, burstBeat)
        if (down !== undefined) return down
      }
    }
    return undefined
  }

  /**
   * L'action : un jet, plus les dés de plus d'un statut de coups supplémentaires non instantané (Coup de chance, consommé
   * au début de l'action : un nouveau déclenchement pendant ces jets vaut pour la prochaine action ; un seul de ces
   * statuts par action, l'autre attend la suivante). Le premier dé est le dé de compétence de l'action, un jet complet :
   * sa face, sa compétence, son coup de base. Les suivants sont des dés de frappe (D5 du retour du 30 octobre, « le
   * Doublé ») : un coup de base brut, dont la face ne lance aucune compétence (les reliques de face la lisent), comme un
   * coup de Furie ; sauf s'il fait la même face que le dé de compétence et que cette face porte une compétence prête à
   * partir (`ready` : forme, limite, conditions, A7) : Doublé (étape `doublet`), ce dé devient un jet complet et la
   * compétence de la face repart. Sur une face nue, pas de Doublé (décision du parent, retour du 30 octobre : jamais un
   * « Doublé ! » sans suite). Plusieurs jets font une rafale (étape flurry), cause de chacun. Au plus `MAX_EXTRA_JETS`
   * dés de plus par action ; les charges au-delà partent avec les autres. Rien de ce que déclenche un dé de plus, Doublé
   * compris, ne donne de dés de plus (`extraJet`, A7).
   */
  function action(attacker: Side): Side | undefined {
    const att = states[attacker]
    const flurry = att.statuses.find((s) => STATUSES[s.id].extraStrikes && !STATUSES[s.id].instantStrikes)
    if (!flurry) return jet(attacker)
    const def = STATUSES[flurry.id]
    const jets = 1 + Math.min(MAX_EXTRA_JETS, def.extraStrikes! * (def.strikeCharges === 'all' ? flurry.stacks : 1))
    // Charges en réserve (`strikeCharges: 'one'`) : une seule est dépensée, les autres attendent
    att.statuses = def.strikeCharges === 'one' ? consumeStatus(att.statuses, flurry.id, 1) : att.statuses.filter((s) => s.id !== flurry.id)
    // Tous les jets d'une rafale, celui de l'action compris, ont la rafale pour cause
    const volley = push({ type: 'flurry', side: attacker, status: flurry.id, strikes: jets, faces: Array.from({ length: jets }, () => DIE_FACES) })
    const skillDie = drawDie()
    try {
      const down = jet(attacker, volley, skillDie)
      if (down !== undefined) return down
      extraJet = attacker
      for (let k = 1; k < jets; k++) {
        const die = drawDie()
        // Lu avec `extraJet` posé : une face qui ne donnerait que des dés de plus (Coup de chance, A7) est nue
        const doublet = die.roll === skillDie.roll && (['graft', 'modify', 'replace'] as const).some((rel) => ready(attacker, die.roll, rel).length > 0)
        if (doublet) push({ type: 'doublet', side: attacker, roll: die.roll }, volley)
        // Un dé de frappe est un coup brut, comme ceux d'une Furie : une charge de coups instantanés qu'il pose (l'Ivresse
        // du sang à son critique) attend le prochain jet complet (RESOLUTION § 2)
        const fell = doublet ? jet(attacker, volley, die) : strikeOnce(attacker, die, true, volley)
        if (fell !== undefined) return fell
      }
    } finally {
      extraJet = undefined
    }
    return undefined
  }

  // La relique d'initiative s'annonce avant tout (étape n° 0, à l'ouverture) : sans effet, son porteur joue le premier tour
  if (herald) {
    const s = states[herald.side]
    s.relicUses[herald.relic.id] = 1
    push({ type: 'relic', side: herald.side, relic: herald.relic.id, name: herald.relic.name, effects: [], uses: 1 })
  }
  let down = fireAll([
    [0, 'combatStart'],
    [1, 'combatStart'],
  ])
  if (down !== undefined) return end(other(down), 'ko')

  let attacker: Side = first
  for (turn = 1; turn <= MAX_TURNS; turn++) {
    owner = attacker
    const defender = other(attacker)
    const att = states[attacker]

    for (const side of SIDES) states[side].fresh.clear()

    // Changement de forme (druide) : au tout début de chacun de ses tours, sauf le premier. Les statuts de
    // l'ancienne forme partent, ceux de la nouvelle arrivent, dans la même étape.
    if (fighters[attacker].forms && att.turnsTaken > 0) {
      const leaving = fighters[attacker].forms?.[att.form].statuses ?? []
      att.form = 1 - att.form
      att.statuses = [...att.statuses.filter((s) => !leaving.includes(s.id)), ...formStatuses(fighters[attacker], att.form)]
      phase = 'shift'
      push({ type: 'shift', side: attacker, form: att.form })
    }
    att.turnsTaken++

    // Phase 1 · Début de tour
    phase = 'turnStart'
    down = statusPhase(attacker, 'turnStart') ?? fire(attacker, 'turnStart')
    if (down !== undefined) return end(other(down), 'ko')
    // Clairon du héraut (D9) : au début de son 1er tour, après ses statuts et ses reliques de tour, son aura de départ part
    // comme sur un 1 si elle n'est pas déjà là (sous sa forme du moment)
    const clarion = att.turnsTaken === 1 ? fighters[attacker].relics.find((r) => r.trigger?.type === 'startAura') : undefined
    const herald = clarion && startAuraOf(fighters[attacker])
    if (clarion && herald && inForm(attacker, herald.event) && !att.statuses.some((s) => s.id === herald.status)) {
      att.relicUses[clarion.id] = 1
      const call = push({ type: 'relic', side: attacker, relic: clarion.id, name: clarion.name, effects: [], uses: 1 })
      down = fireEvent(attacker, herald.event, 'auraDue', call)
      if (down !== undefined) return end(other(down), 'ko')
    }
    // L'aura de départ au rendez-vous (2026-10-27, AURAS.md § 2) : au début de son 3e tour (son 2e, aiguisée : retour du 30
    // octobre, `auraDueTurn`), après ses statuts et ses reliques de tour, avant son action, si sa compétence de la face 1
    // n'a pas posé son aura (ou qu'on la lui a retirée), elle part comme sur un 1. Passé, le rendez-vous ne revient que si
    // on lui dissipe son aura : au début de son 2e tour suivant (D8, `auraDueAt`). Sous l'autre forme (le druide), au tour
    // suivant
    const due = att.turnsTaken < att.auraDueAt ? undefined : startAuraOf(fighters[attacker])
    if (due && inForm(attacker, due.event)) {
      att.auraDueAt = Infinity
      if (!att.statuses.some((s) => s.id === due.status)) {
        down = fireEvent(attacker, due.event, 'auraDue')
        if (down !== undefined) return end(other(down), 'ko')
      }
    }

    // Phase 2 · Action : un statut de contrôle fait perdre l'action, sinon ses jets (chacun suivi des coups instantanés
    // qu'il a posés : Furie des vents)
    phase = 'action'
    const control = att.statuses.find((s) => STATUSES[s.id].skipsAction)
    if (control) {
      att.statuses = consumeStatus(att.statuses, control.id, 1)
      push({ type: 'skip', side: attacker, status: control.id })
    } else {
      down = action(attacker)
      if (down !== undefined) return end(other(down), 'ko')
    }

    // Phase 3 · Fin de tour
    phase = 'turnEnd'
    down = statusPhase(attacker, 'turnEnd') ?? fire(attacker, 'turnEnd')
    if (down !== undefined) return end(other(down), 'ko')

    attacker = defender
  }
  turn = MAX_TURNS
  return end(states[0].hp >= states[1].hp ? 0 : 1, 'turnLimit')
}

/** Couleurs des camps (tokens --side-a / --side-b du design system). hex reprend la valeur du
 *  token pour les attributs SVG, qui ne lisent pas les variables CSS partout. */
export const SIDE_STYLE = {
  0: { accent: 'text-side-a-hi', bar: 'bg-side-a', track: 'bg-side-a-track', ring: 'ring-side-a/60', hex: '#43B4EE' },
  1: { accent: 'text-side-b-hi', bar: 'bg-side-b', track: 'bg-side-b-track', ring: 'ring-side-b/60', hex: '#EE4A72' },
} as const

export const percent = (p: number) => `${Math.round(p * 100)} %`

export const multiplier = (m: number) => `×${m.toLocaleString('fr-FR')}`
