import type { CharacterDef } from './character'
import { AURA_DUE_TURN } from './combat'
import { DIE_FACES, faceTrigger, HIT_NOUNS, relationOf, rollFace, type CharacterEvent, type Effect, type RankAxis } from './events'
import { pick, pickWeighted, shuffle, type Rng } from './rng'
import { auraOfSkill } from './states'
import { SKILLS } from './skills'
import { STATUSES } from './statuses'
import { typeset } from './typography'

/*
 * La forge du dé (0.88.0, docs/CAMPAGNE.md § 4 ; règles v2, docs/PROGRESSION.md § 6.5 et § 6 bis) : le dé, c'est l'arme.
 * Le dé ne fait pas de dégâts : chaque face déclenche sa compétence, ou rien (une face nue), et chaque jet porte le coup
 * de base de l'attaque (docs/RESOLUTION.md § 3 bis). Des opérations changent ce que portent ses faces. Une forge est un
 * JOURNAL d'opérations (`ForgeStep[]`), rejoué sur la définition d'origine du personnage (`forgeState`) : c'est une
 * donnée, comme une relique, que n'importe quel mode peut donner (`Character.withForge`).
 *   - Graver : une compétence prise à un autre combattant prend une face libre (nue et non dorée) ;
 *   - Aiguiser : la compétence d'une face monte d'un rang ;
 *   - Copier une face : la compétence d'une face, telle qu'elle est (rang compris), est copiée sur une face libre que le
 *     joueur choisit (0.111.0 ; l'adversaire et l'auto-forge prennent la plus petite) ; une compétence sur deux faces au plus ;
 *   - Dorer : +2 au coup de base quand cette face nue tombe, avant le critique, coup brut compris (`Attack.gild`). Plus
 *     offerte depuis le retour du 2026-10-28 (A8) : seul le boss en porte (campaign.ts) ;
 *   - Tremper l'arme (+1 à l'attaque) : retirée le 2026-10-28 (A8), comme Refondre en 0.106.0.
 * Règles de l'utilisateur : une compétence d'origine ne se déplace pas, ses faces sont irréductibles, seules les faces
 * nues se gravent ou se dorent, et (0.111.0) une face dorée ne reçoit pas de compétence : dorure et compétence ne se
 * cumulent jamais sur une face.
 *
 * Deux niveaux (retour du 2026-10-28, A2 et A8). Le journal (`forgeState`, `withForge`) sait tout rejouer : les tests et
 * le laboratoire y gravent une aura pour la mesurer, ou montent un rang III. La forge **en partie** (offre, choix,
 * héritage, sauvegarde : `offerTargets`, `drawForgeOffer`, `withForgeStep`, `validOnOrigin`) suit la règle du jeu :
 * seules les opérations offertes (`OFFERED_OPS`), jamais d'aura ajoutée (ni gravée, ni copiée, ni la face 1 copiée),
 * un rang II au plus (`MAX_SHARPENS`).
 */

/** Bonus d'une dorure, ajouté au coup de base avant le critique. */
export const GILD_BONUS = 2

/** Une même compétence sur deux faces au plus (Copier une face, décision de l'utilisateur, PROGRESSION.md § 6.5). */
export const MAX_COPIES = 2

/** Opérations proposées à chaque forge, comme les reliques d'une récompense. */
export const FORGE_OFFER_SIZE = 3

/** Aiguisages au plus par compétence en partie : un, le rang II (retour de l'utilisateur du 2026-10-28, A8). */
export const MAX_SHARPENS = 1

/** La face de l'aura de départ (docs/MAITRISES.md § 5) : elle ne se copie pas (retour du 2026-10-28, A2). */
export const AURA_FACE = 1

export type ForgeOpKind = 'engrave' | 'gild' | 'sharpen' | 'copy'

/**
 * Les opérations qu'une forge propose en partie (retour de l'utilisateur du 2026-10-28, A8 : « garder Copier ; retirer
 * Dorer et Tremper »). Dorer reste une opération du journal : le boss porte deux faces dorées.
 */
export const OFFERED_OPS: readonly ForgeOpKind[] = ['engrave', 'sharpen', 'copy']

/** Ce que vaut une dorure, sans son montant : « +2 au coup de base » (le montant se colore à part dans l'aperçu). */
export const GILD_RULE = 'au coup de base'

/**
 * Les opérations : nom et règle au plus court (2026-10-23, demande de l'utilisateur : une information simple, pas
 * d'explication ; ce qu'elle change se lit dans l'aperçu du dé). Toutes visent une face. Une phrase, avec son point,
 * comme la ligne d'une compétence à côté d'elle sur les cartes de récompense (passe compendium, 2026-10-25).
 */
export const FORGE_OPS: Record<ForgeOpKind, { name: string; summary: string }> = {
  engrave: { name: 'Graver', summary: 'Nouvelle compétence sur une face nue.' },
  gild: { name: 'Dorer', summary: `+${GILD_BONUS} ${GILD_RULE}.` },
  sharpen: { name: 'Aiguiser', summary: '+1 rang à une compétence.' },
  copy: { name: 'Copier une face', summary: 'Copie sa compétence sur une face libre.' },
}

/**
 * Une opération proposée, avant le choix de sa face. Graver porte les compétences à graver, une ou deux (une par
 * maîtrise du personnage, docs/MAITRISES.md § 6.2) : le joueur en choisit une, l'opération choisie n'en garde qu'une
 * (`ForgeStep`), si bien que le journal de forge ne change pas de forme.
 */
export type ForgeOffer = { op: 'engrave'; skills: CharacterEvent[] } | { op: Exclude<ForgeOpKind, 'engrave'> }

/**
 * Une opération appliquée, sur sa face. Copier une face porte sa face d'origine (`face`) et sa destination (`to`,
 * 0.111.0) ; une copie enregistrée avant (`copy 2` dans une trace, une partie, un héritage) n'a pas de `to` : sa
 * destination est celle que la règle d'alors prenait seule, la plus petite face libre.
 */
export type ForgeStep =
  | { op: 'engrave'; face: number; skill: CharacterEvent }
  | { op: 'gild'; face: number }
  | { op: 'sharpen'; face: number }
  | { op: 'copy'; face: number; to?: number }

/** Ce que la forge a fait du dé : ses compétences gravées, ses dorures, les rangs de ses compétences. */
export interface ForgeState {
  engraved: ReadonlyMap<number, CharacterEvent>
  gilded: ReadonlyMap<number, number>
  /** Rangs gagnés par compétence (id), 0 par défaut : une compétence aiguisée deux fois est au rang III */
  ranks: ReadonlyMap<string, number>
}

/** Ce qu'il faut de la définition d'un personnage pour forger son dé. */
export type ForgeBase = Pick<CharacterDef, 'events'>

/** Les six faces du dé, de 1 à 6. */
const FACES = Array.from({ length: DIE_FACES }, (_, k) => k + 1)

/** Les compétences d'origine d'une face (toutes formes confondues). */
const originOn = (base: ForgeBase, face: number) => base.events.filter((e) => rollFace(e.trigger) === face)

/* ---------- Rejouer le journal ---------- */

/** Une face nue : ni compétence d'origine ni gravure. */
const isBare = (base: ForgeBase, state: ForgeState, face: number) => originOn(base, face).length === 0 && !state.engraved.has(face)

/** Une face libre : nue et non dorée. Seule une face libre se grave, se dore ou reçoit une copie (0.111.0). */
const isFree = (base: ForgeBase, state: ForgeState, face: number) => isBare(base, state, face) && !state.gilded.has(face)

/** Un rang de plus change-t-il cette compétence, à son rang `rank` ? (Une compétence sans axe de rang ne s'aiguise pas.) */
function sharpensAt(e: CharacterEvent, rank: number) {
  const [now, next] = [sharpen(e, rank), sharpen(e, rank + 1)]
  return JSON.stringify({ ...next, name: '' }) !== JSON.stringify({ ...now, name: '' })
}

/** Les faces qu'une opération peut viser, dans l'état donné (le journal : sans les règles de la partie). */
function targetsIn(base: ForgeBase, state: ForgeState, op: ForgeOpKind): number[] {
  switch (op) {
    case 'engrave':
    case 'gild':
      return FACES.filter((f) => isFree(base, state, f))
    case 'sharpen':
      // Aiguisable : une compétence qui déclare son axe de rang (0.110.0, `RankAxis`), toutes celles du roster ; chaque rang
      // change quelque chose. Le journal n'a pas de rang maximal ; la partie s'arrête au rang II (`MAX_SHARPENS`). Une aura
      // (axe `due`) ne s'aiguise que sur la face de l'aura de départ : ailleurs (une aura gravée au laboratoire), pas de
      // rendez-vous à avancer
      return FACES.filter((f) => skillsOn(base, state, f).some((e) => (e.rankAxis?.kind !== 'due' || f === AURA_FACE) && sharpensAt(e, state.ranks.get(e.id) ?? 0)))
    case 'copy':
      // Une face de compétence encore sur moins de deux faces, qu'une seconde face renforce, et une face libre où poser la copie
      return FACES.filter((f) => destinationsIn(base, state, f).length > 0)
  }
}

/** La compétence que porte une face (sa gravure, sinon sa compétence d'origine), avant aiguisage. */
function skillOf(base: ForgeBase, state: ForgeState, face: number): CharacterEvent | undefined {
  return state.engraved.get(face) ?? originOn(base, face)[0]
}

/** Faces qui portent cette compétence (d'origine ou gravée) : une compétence sur `MAX_COPIES` faces au plus. */
const facesWith = (base: ForgeBase, state: ForgeState, id: string) => FACES.filter((f) => skillOf(base, state, f)?.id === id).length

/**
 * Une seconde face ne rapporte rien à une compétence qui ne fait que poser sur son porteur une aura permanente (sans
 * durée) plafonnée à une charge, sans toucher au coup (ex. l'Aura de puissance depuis la 0.107.0) : l'aura est déjà là.
 */
const gainsNothingTwice = (skill: CharacterEvent) =>
  relationOf(skill) === 'graft' &&
  skill.hitMultiplier === undefined &&
  skill.effects.every((e) => {
    if (e.type !== 'applyStatus' || (e.target ?? 'self') !== 'self' || e.turns !== undefined) return false
    const def = STATUSES[e.status]
    return def.maxStacks === 1 && def.look?.aura !== undefined
  })

/**
 * Où Copier une face peut poser la compétence de `source` : les faces libres (nues, non dorées), de la plus petite à la
 * plus grande. Vide : rien à copier là (face nue, compétence déjà sur deux faces, copie qui ne rapporte rien, ou plus de
 * face libre).
 */
function destinationsIn(base: ForgeBase, state: ForgeState, source: number): number[] {
  const skill = skillOf(base, state, source)
  if (!skill || facesWith(base, state, skill.id) >= MAX_COPIES || gainsNothingTwice(skill)) return []
  return FACES.filter((f) => isFree(base, state, f))
}

/** La destination d'une copie : la sienne, ou pour une copie d'avant la 0.111.0 (sans `to`), la plus petite face libre. */
const copyTo = (base: ForgeBase, state: ForgeState, step: Extract<ForgeStep, { op: 'copy' }>) => step.to ?? destinationsIn(base, state, step.face)[0]

/** Les compétences d'une face, aiguisables : celles d'origine, et sa gravure. */
function skillsOn(base: ForgeBase, state: ForgeState, face: number): CharacterEvent[] {
  const engraved = state.engraved.get(face)
  return [...originOn(base, face), ...(engraved ? [engraved] : [])]
}

/**
 * Une opération est-elle valide dans cet état ? Une opération inconnue (Refondre, retirée en 0.106.0 ; Tremper l'arme,
 * retirée le 2026-10-28) ne l'est pas, ni une opération enregistrée avant une règle qui l'interdit (une gravure ou une
 * copie sur une face dorée, avant la 0.111.0) : le journal entier est alors refusé (`forgeState`), et chaque lecture
 * d'une sauvegarde l'écarte.
 */
function stepValid(base: ForgeBase, state: ForgeState, step: ForgeStep) {
  if (!(step.op in FORGE_OPS)) return false
  if (!targetsIn(base, state, step.op).includes(step.face)) return false
  if (step.op === 'copy') return destinationsIn(base, state, step.face).includes(copyTo(base, state, step))
  // Une compétence ne se grave qu'une fois, et jamais par-dessus une des siennes
  return step.op !== 'engrave' || ![...base.events, ...state.engraved.values()].some((e) => e.id === step.skill.id)
}

/** Rejoue un journal de forge sur une définition d'origine. Une opération impossible est une erreur. */
export function forgeState(base: ForgeBase, steps: readonly ForgeStep[]): ForgeState {
  const engraved = new Map<number, CharacterEvent>()
  const gilded = new Map<number, number>()
  const ranks = new Map<string, number>()
  const state = { engraved, gilded, ranks }
  for (const step of steps) {
    if (!stepValid(base, state, step)) throw new Error(`Forge impossible : ${step.op in FORGE_OPS ? stepLabel(step) : step.op}`)
    switch (step.op) {
      case 'engrave':
        engraved.set(step.face, step.skill)
        break
      case 'gild':
        gilded.set(step.face, GILD_BONUS)
        break
      case 'sharpen':
        for (const e of skillsOn(base, state, step.face)) ranks.set(e.id, (ranks.get(e.id) ?? 0) + 1)
        break
      case 'copy':
        // Sans forme : la copie vaut sous toutes les formes (comme une gravure)
        engraved.set(copyTo(base, state, step), skillOf(base, state, step.face)!)
        break
    }
  }
  return state
}

/* ---------- La forge en partie (retour de l'utilisateur du 2026-10-28, A2 et A8) ---------- */

/**
 * Une aura : une compétence qui ne pose qu'une aura sur son lanceur (`auraOfSkill`, la règle des auras de départ,
 * masteries.ts). Une par personnage, choisie au départ sur son 1 : la partie n'en ajoute jamais.
 */
export const isAuraSkill = (e: CharacterEvent) => auraOfSkill(e) !== undefined

/**
 * Les faces qu'une opération peut viser en partie : celles du journal, moins ce que la règle du jeu refuse. Seules les
 * opérations offertes (`OFFERED_OPS`) ; Aiguiser jusqu'au rang II (`MAX_SHARPENS`), l'aura du 1 comprise si elle a un
 * axe de rang ; Copier ni la face 1 (`AURA_FACE`) ni une aura.
 */
function playTargets(base: ForgeBase, state: ForgeState, op: ForgeOpKind): number[] {
  if (!OFFERED_OPS.includes(op)) return []
  const targets = targetsIn(base, state, op)
  if (op === 'sharpen')
    return targets.filter((f) =>
      skillsOn(base, state, f).some((e) => {
        const rank = state.ranks.get(e.id) ?? 0
        return rank < MAX_SHARPENS && sharpensAt(e, rank)
      }),
    )
  if (op === 'copy') return targets.filter((f) => f !== AURA_FACE && !isAuraSkill(skillOf(base, state, f)!))
  return targets
}

/**
 * Une opération est-elle jouable en partie dans cet état ? Valide au journal, et permise par la règle du jeu. Une gravure
 * d'une compétence sortie du catalogue (refonte des auras, 2026-10-28 : une sauvegarde, un héritage) ne l'est plus.
 */
function playable(base: ForgeBase, state: ForgeState, step: ForgeStep) {
  if (!stepValid(base, state, step) || !playTargets(base, state, step.op).includes(step.face)) return false
  return step.op !== 'engrave' || (step.skill.id in SKILLS && !isAuraSkill(step.skill))
}

/* ---------- Le personnage forgé ---------- */

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/** Le rang affiché d'une compétence aiguisée `rank` fois : II, III… (une compétence nue est au rang I). */
export const rankLabel = (rank: number) => ROMAN[rank + 1] ?? String(rank + 1)

/**
 * Un effet aiguisé : `gain` de plus sur l'axe de la compétence (0.110.0). Les charges et l'intensité vont au statut posé,
 * le montant aux dégâts et aux soins (le repli d'une purge compris), la part à une relâche (`gain` en points de
 * pourcentage), le montant par jauge à une relâche comptée (Onde de choc, `per`).
 */
function sharpenEffect(effect: Effect, kind: RankAxis['kind'], gain: number, on?: RankAxis['on']): Effect {
  switch (effect.type) {
    case 'applyStatus':
      if (kind === 'stacks') return { ...effect, stacks: effect.stacks + gain }
      return kind === 'power' ? { ...effect, power: (effect.power ?? 0) + gain } : effect
    case 'heal':
    case 'damage':
      return kind === 'amount' && (!on || on === effect.type) ? { ...effect, amount: effect.amount + gain } : effect
    case 'release':
      if (kind === 'amount' && effect.per !== undefined) return { ...effect, per: effect.per + gain }
      return kind === 'share' ? { ...effect, share: (effect.share ?? 1) + gain / 100 } : effect
    case 'cleanse': {
      // Le repli d'une purge (Purification : sa lumière) gagne le montant
      const fallback = effect.orElse
      if (kind !== 'amount' || !fallback || (fallback.type !== 'damage' && fallback.type !== 'heal')) return effect
      return { ...effect, orElse: { ...fallback, amount: fallback.amount + gain } }
    }
  }
}

/**
 * Une compétence aiguisée `rank` fois : son nom porte son rang, et elle gagne `rank` fois ce que son axe de rang dit
 * (`RankAxis`, 0.110.0 : un statut, son premier effet qui en pose un ; un coup ×N ; une limite par combat). Sans axe :
 * elle ne s'aiguise pas.
 */
export function sharpen(e: CharacterEvent, rank: number): CharacterEvent {
  if (rank === 0 || !e.rankAxis) return e
  const { kind, per, on } = e.rankAxis
  const gain = per * rank
  const named = { ...e, name: `${e.name} ${rankLabel(rank)}` }
  // Une aura aiguisée (retour du 30 octobre) : son rendez-vous avance, ses effets ne changent pas ; le 1er tour au plus tôt
  if (kind === 'due') return { ...named, dueTurn: Math.max(1, AURA_DUE_TURN - gain) }
  const posed = e.effects.findIndex((x) => x.type === 'applyStatus')
  return {
    ...named,
    effects: e.effects.map((x, k) => (x.type === 'applyStatus' && k !== posed ? x : sharpenEffect(x, kind, gain, on))),
    ...(kind === 'multiplier' && e.hitMultiplier !== undefined && { hitMultiplier: e.hitMultiplier + gain }),
    ...(kind === 'limit' && e.limit !== undefined && { limit: e.limit + gain }),
  }
}

/** Ce qu'un rang d'aiguisage ajoute à une compétence, en une ligne (« +1 Saignement », « +2 coups »). */
export function rankText(e: CharacterEvent): string {
  if (!e.rankAxis) return 'ne s’aiguise pas'
  const { kind, per } = e.rankAxis
  const posed = e.effects.find((x) => x.type === 'applyStatus')
  const def = posed && STATUSES[posed.status]
  const strike = e.effects.find((x) => x.type === 'damage')
  // Une charge de coups (Curée) se compte en coups ; un statut qui se compte prend son pluriel (« +2 coups de chance »)
  const stacks = def?.instantStrikes && def.extraStrikes ? `+${per * def.extraStrikes} coups` : `+${per} ${def ? (per > 1 ? (def.plural ?? def.name) : def.name) : 'charge'}`
  return typeset(
    {
      stacks,
      power: (def && def.power?.(per)) ?? `+${per}`,
      amount: strike?.hits ? `+${per} à chacun des ${strike.hits} ${HIT_NOUNS[strike.source] ?? 'coups'}` : `+${per} ${(e.rankAxis.on ? e.rankAxis.on === 'heal' : e.effects.some((x) => x.type === 'heal')) ? 'PV' : per > 1 ? 'dégâts' : 'dégât'}`,
      multiplier: `ce coup ×${per} de plus`,
      limit: `${per} fois de plus par combat`,
      share: `+${per} % des dégâts renvoyés`,
      due: per > 1 ? `arrive ${per} tours plus tôt` : 'arrive un tour plus tôt',
    }[kind],
  )
}

/**
 * Les compétences d'un personnage forgé, dans l'ordre de définition : celles d'origine, puis ses gravures, aiguisées. Une
 * gravure prend pour déclencheur sa face, sans forme.
 */
export function forgedEvents(base: ForgeBase, state: ForgeState): CharacterEvent[] {
  const engraved = [...state.engraved].sort(([a], [b]) => a - b).map(([face, { form: _form, ...skill }]) => ({ ...skill, trigger: faceTrigger(face) }))
  return [...base.events, ...engraved].map((e) => sharpen(e, state.ranks.get(e.id) ?? 0))
}

/** Une face du dé forgé, pour l'écran : ses compétences d'origine, sa gravure, sa dorure, son rang. */
export interface ForgedFace {
  face: number
  /** Compétences d'origine (aiguisées) */
  origin: CharacterEvent[]
  /** Compétence gravée (aiguisée) */
  engraved?: CharacterEvent
  gild: number
  /** Rang le plus haut de ses compétences (0 : aucune aiguisée) */
  rank: number
}

/** Les six faces du dé forgé. */
export function forgedFaces(base: ForgeBase, steps: readonly ForgeStep[]): ForgedFace[] {
  const state = forgeState(base, steps)
  const events = forgedEvents(base, state)
  return FACES.map((face) => {
    const on = events.filter((e) => rollFace(e.trigger) === face)
    const engraved = state.engraved.get(face)
    return {
      face,
      origin: on.filter((e) => e.id !== engraved?.id),
      ...(engraved && { engraved: on.find((e) => e.id === engraved.id) }),
      gild: state.gilded.get(face) ?? 0,
      rank: Math.max(0, ...skillsOn(base, state, face).map((e) => state.ranks.get(e.id) ?? 0)),
    }
  })
}

/* ---------- Offre et choix ---------- */

/**
 * Les compétences qu'on peut graver : celles de `pool` qui ne sont pas déjà sur le dé, jamais une aura (A2). `pool`
 * vient de l'appelant (la réserve du personnage, `characterPool`) : ce module n'importe pas le roster.
 */
const engravable = (base: ForgeBase, state: ForgeState, pool: readonly CharacterEvent[]) =>
  pool.filter((s) => !isAuraSkill(s) && ![...base.events, ...state.engraved.values()].some((e) => e.id === s.id))

/** Les faces qu'une offre peut viser maintenant, en partie. Copier une face : ses faces d'origine. */
export function offerTargets(base: ForgeBase, steps: readonly ForgeStep[], offer: ForgeOffer): number[] {
  return playTargets(base, forgeState(base, steps), offer.op)
}

/** Les faces où Copier une face peut poser la compétence de la face `source` (vide : rien à copier là, en partie). */
export function copyDestinations(base: ForgeBase, steps: readonly ForgeStep[], source: number): number[] {
  const state = forgeState(base, steps)
  return playTargets(base, state, 'copy').includes(source) ? destinationsIn(base, state, source) : []
}

/**
 * La face qu'une opération change, jouée après `before` : sa face, ou pour une copie, sa destination (celle de la règle
 * d'avant la 0.111.0 pour une copie sans `to`).
 */
export function writtenFace(base: ForgeBase, before: readonly ForgeStep[], step: ForgeStep): number {
  return step.op === 'copy' ? copyTo(base, forgeState(base, before), step) : step.face
}

/** Les opérations qui donnent une face de compétence de plus. */
const FILLING_OPS: readonly ForgeOpKind[] = ['engrave', 'copy']

/** Une offre est-elle jouable en partie (au moins une face visée, et pour Graver une compétence) ? */
function offerValid(base: ForgeBase, state: ForgeState, op: ForgeOpKind, pool: readonly CharacterEvent[], noNewSkill: boolean) {
  if (FILLING_OPS.includes(op) && noNewSkill) return false
  if (op === 'engrave' && engravable(base, state, pool).length === 0) return false
  return playTargets(base, state, op).length > 0
}

/** Ce qui oriente l'offre d'une forge (règles v2, docs/PROGRESSION.md § 13.2 ; maîtrises, docs/MAITRISES.md § 6.2). */
export interface ForgeOfferOptions {
  /** L'offre orientée : Graver est toujours proposée quand elle le peut, et ses compétences se tirent au poids que
   * `focus` leur donne (l'écho avec le build) au lieu de parts égales */
  focus?: (skill: CharacterEvent) => number
  /** Le dé porte déjà toutes ses faces de compétence : ni Graver, ni Copier une face */
  noNewSkill?: boolean
  /** Il reste autant de faces à remplir que de forges (retour du 2026-10-28, A9 : le dé complet en fin de construction) :
   * seulement Graver et Copier une face, si l'une des deux peut se jouer */
  fillOnly?: boolean
  /** Le groupe d'une compétence (sa maîtrise) : Graver propose une compétence de chaque groupe qui en a une gravable,
   * dans l'ordre où le groupe apparaît dans `pool` ; sans groupes, une seule compétence */
  groupOf?: (skill: CharacterEvent) => string | undefined
  /** Offre riche (retour du 2026-10-30, option ACsD) : Graver montre une compétence de plus, tirée au poids de `focus`
   * parmi les gravables qui restent (dans ses groupes), s'il en reste */
  extraSkill?: boolean
}

/**
 * L'offre d'une forge : `FORGE_OFFER_SIZE` opérations offertes (`OFFERED_OPS`) jouables, différentes, tirées au hasard
 * (`ForgeOfferOptions`).
 */
export function drawForgeOffer(
  base: ForgeBase,
  steps: readonly ForgeStep[],
  rng: Rng,
  pool: readonly CharacterEvent[],
  { focus, noNewSkill = false, fillOnly = false, groupOf, extraSkill = false }: ForgeOfferOptions = {},
): ForgeOffer[] {
  const state = forgeState(base, steps)
  const valid = shuffle(rng, OFFERED_OPS).filter((op) => offerValid(base, state, op, pool, noNewSkill))
  const filling = valid.filter((op) => FILLING_OPS.includes(op))
  const kinds = fillOnly && filling.length > 0 ? filling : valid
  const chosen = focus ? [...kinds.filter((op) => op === 'engrave'), ...kinds.filter((op) => op !== 'engrave')] : kinds
  const skills = engravable(base, state, pool)
  // Les groupes (maîtrises) dans l'ordre où ils apparaissent dans la réserve ; sans `groupOf`, un seul
  const groups = new Map<string | undefined, CharacterEvent[]>()
  for (const s of skills) {
    const key = groupOf?.(s)
    groups.set(key, [...(groups.get(key) ?? []), s])
  }
  const draw = (items: readonly CharacterEvent[]) => (focus ? pickWeighted(rng, items, focus) : pick(rng, items))
  return chosen.slice(0, FORGE_OFFER_SIZE).map((op): ForgeOffer => {
    if (op !== 'engrave') return { op }
    const shown = [...groups.values()].map(draw)
    const rest = skills.filter((s) => !shown.includes(s))
    return { op, skills: extraSkill && rest.length > 0 ? [...shown, draw(rest)] : shown }
  })
}

/**
 * L'opération d'une offre sur une face ; Copier une face prend aussi sa destination (`to`), Graver la compétence choisie
 * parmi celles de l'offre (`skill`, la première par défaut).
 */
export function stepOf(offer: ForgeOffer, face?: number, to?: number, skill?: CharacterEvent): ForgeStep {
  if (face === undefined) throw new Error(`${FORGE_OPS[offer.op].name} : une face est requise`)
  if (offer.op === 'copy') {
    if (to === undefined) throw new Error('Copier une face : une destination est requise')
    return { op: 'copy', face, to }
  }
  if (offer.op !== 'engrave') return { op: offer.op, face }
  const engraved = skill ?? offer.skills[0]
  if (!offer.skills.some((s) => s.id === engraved.id)) throw new Error(`Graver : ${engraved.name} n'est pas proposée`)
  return { op: 'engrave', face, skill: engraved }
}

/** Une opération est-elle de celles que l'offre propose (pour Graver, l'une de ses compétences) ? */
export const isOffered = (offer: readonly ForgeOffer[], step: ForgeStep) =>
  offer.some((o) => o.op === step.op && (o.op !== 'engrave' || (step.op === 'engrave' && o.skills.some((s) => s.id === step.skill.id))))

/**
 * Le choix du combattant quand personne ne choisit pour lui (champion de référence, adversaire construit, choix par
 * défaut de l'écran) : une offre au hasard, pour Graver une de ses compétences au hasard (une maîtrise sur deux), puis
 * une face au hasard parmi celles qu'elle peut viser ; une copie se pose sur la plus petite face libre (la règle d'avant
 * le choix de la destination, 0.111.0).
 */
export function autoForge(base: ForgeBase, steps: readonly ForgeStep[], offer: readonly ForgeOffer[], rng: Rng): ForgeStep | undefined {
  if (offer.length === 0) return undefined
  const chosen = pick(rng, offer)
  // Une seule compétence : aucun tirage de plus (le hasard des offres sans maîtrises ne bouge pas)
  const skill = chosen.op === 'engrave' && chosen.skills.length > 1 ? pick(rng, chosen.skills) : undefined
  const targets = offerTargets(base, steps, chosen)
  const face = targets.length ? pick(rng, targets) : undefined
  return stepOf(chosen, face, chosen.op === 'copy' && face !== undefined ? copyDestinations(base, steps, face)[0] : undefined, skill)
}

/** Le journal avec une opération de plus, jouée en partie : erreur si le journal ou la règle du jeu la refuse. */
export function withForgeStep(base: ForgeBase, steps: readonly ForgeStep[], step: ForgeStep): ForgeStep[] {
  if (!playable(base, forgeState(base, steps), step)) throw new Error(`Forge refusée en partie : ${step.op in FORGE_OPS ? stepLabel(step) : step.op}`)
  return [...steps, step]
}

/** Est-ce que cette opération, seule, se joue en partie sur le dé d'origine ? (héritage : une face du dé d'origine) */
export function validOnOrigin(base: ForgeBase, step: ForgeStep) {
  return playable(base, forgeState(base, []), step)
}

/**
 * Une opération en une courte clé lisible (« engrave 5 cleave », « gild 4 », « copy 2 5 ») : trace, comparaison de
 * journaux. Une copie d'avant la 0.111.0, sans destination, reste « copy 2 » (`parseForge` la relit).
 */
export function stepKey(step: ForgeStep): string {
  if (step.op === 'engrave') return `engrave ${step.face} ${step.skill.id}`
  return step.op === 'copy' && step.to !== undefined ? `copy ${step.face} ${step.to}` : `${step.op} ${step.face}`
}

/* ---------- Rédaction ---------- */

/**
 * « Graver Pourfendre sur le 5 », « Dorer le 4 », « Copier le 2 sur le 5 », « Aiguiser le 2 » : l'opération en clair
 * (écran, trace). Une copie d'avant la 0.111.0, sans destination : « Copier le 2 ».
 */
export function stepLabel(step: ForgeStep | ForgeOffer): string {
  const name = FORGE_OPS[step.op].name
  const where = 'face' in step ? ` le ${step.face}` : ''
  if (step.op === 'engrave') return 'skill' in step ? `${name} ${step.skill.name}${where && ` sur${where}`}` : `${name} ${step.skills.map((s) => s.name).join(' ou ')}`
  if (step.op === 'copy' && 'face' in step) return `Copier${where}${step.to !== undefined ? ` sur le ${step.to}` : ''}`
  return `${name}${where}`
}

/**
 * Une compétence du roster qui peut se graver sur un autre dé : celle d'une face du dé simple. Le roster en tire
 * `ENGRAVABLE_SKILLS`.
 */
export const isEngravable = (e: CharacterEvent) => rollFace(e.trigger) !== undefined
