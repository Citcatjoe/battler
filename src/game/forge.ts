import type { CharacterDef } from './character'
import { doubleFace, doubleTrigger, faceTrigger, rollFace, type CharacterEvent, type Effect } from './events'
import { pick, pickWeighted, shuffle, type Rng } from './rng'
import { STATUSES } from './statuses'

/*
 * La forge du dé (0.88.0, docs/CAMPAGNE.md § 4 ; d6 imprimé depuis la 0.105.0, docs/PROGRESSION.md § 6.5) : le dé,
 * c'est l'arme. Cinq opérations changent ce que portent ses faces, sans jamais toucher la règle de base (un jet, une
 * face, et cette face porte une compétence ou un coup). Une forge est un JOURNAL d'opérations (`ForgeStep[]`), rejoué sur
 * la définition d'origine du personnage (`forgeState`) : c'est une donnée, comme une relique, que n'importe quel mode
 * peut donner (`Character.withForge`).
 *   - Graver : une compétence prise à un autre combattant prend une face libre (sur une face d'Attente, elle la remplace) ;
 *   - Dorer : +2 dégâts à la frappe de cette face, avant le critique, coup brut compris (`Attack.gild`) ;
 *   - Aiguiser : la compétence d'une face monte d'un rang ;
 *   - Copier une face : la face choisie, telle qu'elle est (sa compétence et son rang, ou son coup et sa dorure), est
 *     copiée sur la face de coup la plus faible ; une compétence sur deux faces au plus ;
 *   - Refondre : les faces de coup frappent toutes pour leur moyenne, arrondie au-dessus.
 * Agrandir et Retailler (0.88.0 à 0.104.0) changeaient le nombre de faces : le d6 est fixe.
 * Règles de l'utilisateur : une compétence d'origine ne se déplace pas, ses faces sont irréductibles, et seules les
 * faces libres se gravent ou se dorent. Personnage à deux dés (barde) : ses faces sont des doubles pour Graver et
 * Aiguiser, et la dorure vaut pour chaque dé qui fait cette face.
 */

/** Bonus d'une dorure, ajouté à la valeur du coup avant le critique. */
export const GILD_BONUS = 2

/** Une même compétence sur deux faces au plus (Copier une face, décision de l'utilisateur, PROGRESSION.md § 6.5). */
export const MAX_COPIES = 2

/** Opérations proposées à chaque forge, comme les reliques d'une récompense. */
export const FORGE_OFFER_SIZE = 3

export type ForgeOpKind = 'engrave' | 'gild' | 'sharpen' | 'copy' | 'reforge'

/** Ce que vaut une dorure, sans son montant : « +2 dégâts à la frappe » (le montant se colore à part dans l'aperçu). */
export const GILD_RULE = 'dégâts à la frappe'

/**
 * Les cinq opérations : nom, règle au plus court (2026-10-23, demande de l'utilisateur : une information simple, pas
 * d'explication ; ce qu'elle change se lit dans l'aperçu du dé), et si elles visent une face.
 */
export const FORGE_OPS: Record<ForgeOpKind, { name: string; summary: string; targeted: boolean }> = {
  engrave: { name: 'Graver', summary: 'Nouvelle compétence sur une face libre', targeted: true },
  gild: { name: 'Dorer', summary: `+${GILD_BONUS} ${GILD_RULE}`, targeted: true },
  sharpen: { name: 'Aiguiser', summary: '+1 rang à une compétence', targeted: true },
  copy: { name: 'Copier une face', summary: 'Copie cette face sur ta face de coup la plus faible', targeted: true },
  reforge: { name: 'Refondre', summary: 'Tes faces de coup frappent pour leur moyenne', targeted: false },
}

/**
 * Une opération proposée, avant le choix de sa face. Graver porte la compétence à graver ; Copier une face peut être
 * limitée aux faces de coup (`strikesOnly` : la campagne, quand le dé porte déjà ses quatre faces de compétence).
 */
export type ForgeOffer =
  | { op: 'engrave'; skill: CharacterEvent }
  | { op: 'copy'; strikesOnly?: true }
  | { op: Exclude<ForgeOpKind, 'engrave' | 'copy'> }

/** Une opération appliquée : celles qui visent une face portent sa face. */
export type ForgeStep =
  | { op: 'engrave'; face: number; skill: CharacterEvent }
  | { op: 'gild'; face: number }
  | { op: 'sharpen'; face: number }
  | { op: 'copy'; face: number }
  | { op: 'reforge' }

/**
 * Ce que la forge a fait du dé : sa taille, ses compétences gravées, ses dorures, les rangs de ses compétences, et les
 * valeurs imprimées qu'elle a changées (règles v2).
 */
export interface ForgeState {
  size: number
  engraved: ReadonlyMap<number, CharacterEvent>
  gilded: ReadonlyMap<number, number>
  /** Rangs gagnés par compétence (id), 0 par défaut : une compétence aiguisée deux fois est au rang III */
  ranks: ReadonlyMap<string, number>
  /** Valeurs imprimées changées par la forge, par face (les autres gardent celle de la définition) */
  printed: ReadonlyMap<number, number>
}

/** Ce qu'il faut de la définition d'un personnage pour forger son dé. */
export type ForgeBase = Pick<CharacterDef, 'stats' | 'events' | 'twinDice' | 'strikes'>

/**
 * Ce que frappe une face (règles v2, phase 3) : la valeur que la forge lui a donnée, sinon sa valeur imprimée, sinon son
 * numéro. Le jet désigne la face ; la face frappe pour sa valeur.
 */
export function faceValue(base: Pick<ForgeBase, 'strikes'>, state: Pick<ForgeState, 'printed'> | undefined, face: number): number {
  return state?.printed.get(face) ?? base.strikes?.[face - 1] ?? face
}

/** La face (ou le double) d'une compétence du dé, ou undefined (compétence hors dé, jet maximal). */
const faceOf = (base: ForgeBase, e: CharacterEvent) => (base.twinDice ? doubleFace(e.trigger) : rollFace(e.trigger))

/** Les compétences d'origine d'une face (toutes formes confondues). */
const originOn = (base: ForgeBase, face: number) => base.events.filter((e) => faceOf(base, e) === face)

/* ---------- Rejouer le journal ---------- */

/** Les faces qu'une opération peut viser, dans l'état donné (vide pour une opération sans face). */
function targetsIn(base: ForgeBase, state: ForgeState, op: ForgeOpKind, strikesOnly = false): number[] {
  const faces = Array.from({ length: state.size }, (_, k) => k + 1)
  switch (op) {
    case 'engrave':
      return faces.filter((f) => !state.engraved.has(f) && originOn(base, f).every((e) => e.idle))
    case 'gild':
      // Une face qui frappe : sans compétence d'origine, sans gravure qui sacrifie le coup (deux dés : chaque dé frappe
      // hors double, toute face se dore)
      return faces.filter(
        (f) => !state.gilded.has(f) && (base.twinDice || (originOn(base, f).length === 0 && !state.engraved.get(f)?.forfeitsHit)),
      )
    case 'sharpen':
      // Aiguisable : un rang de plus change ses effets (un statut au plafond, ou qui ne cumule pas, ne gagne rien). Pas de
      // rang maximal : le nombre d'aiguisages se règle par le nombre d'occasions qu'un mode en donne (décision de
      // l'utilisateur, 2026-10-23)
      return faces.filter((f) =>
        skillsOn(base, state, f).some((e) => {
          const rank = state.ranks.get(e.id) ?? 0
          const [now, next] = [sharpen(e, rank), sharpen(e, rank + 1)]
          return JSON.stringify([next.effects, next.volley]) !== JSON.stringify([now.effects, now.volley])
        }),
      )
    case 'copy':
      // Les faces qu'on peut copier : une compétence encore sur moins de deux faces, ou une face de coup plus forte que la
      // face de coup la plus faible ; dans les deux cas, il faut une face libre où la poser (`copyTarget`)
      return faces.filter((f) => (!strikesOnly || !skillOf(base, state, f)) && copyTarget(base, state, f) !== undefined)
    case 'reforge':
      return []
  }
}

/** Les faces qui frappent sur un jet simple : sans compétence d'origine ni gravure (deux dés : toutes, chaque dé frappe). */
function strikeFaces(base: ForgeBase, state: ForgeState): number[] {
  const faces = Array.from({ length: state.size }, (_, k) => k + 1)
  return base.twinDice ? faces : faces.filter((f) => originOn(base, f).length === 0 && !state.engraved.has(f))
}

/** La compétence que porte une face (sa gravure, sinon sa compétence d'origine, l'Attente exclue), avant aiguisage. */
function skillOf(base: ForgeBase, state: ForgeState, face: number): CharacterEvent | undefined {
  return state.engraved.get(face) ?? originOn(base, face).find((e) => !e.idle)
}

/** Faces qui portent cette compétence (d'origine ou gravée) : une compétence sur `MAX_COPIES` faces au plus. */
const facesWith = (base: ForgeBase, state: ForgeState, id: string) =>
  Array.from({ length: state.size }, (_, k) => k + 1).filter((f) => skillOf(base, state, f)?.id === id).length

/**
 * Où Copier une face pose sa copie : la face de coup la plus faible (valeur imprimée et dorure ; à égalité, la plus
 * basse), autre que la face copiée. Une compétence peut aussi remplacer une Attente. Une face de coup ne se copie que
 * sur plus faible qu'elle. Undefined : rien à copier là.
 */
function copyTarget(base: ForgeBase, state: ForgeState, source: number): number | undefined {
  const skill = skillOf(base, state, source)
  const idle = originOn(base, source).some((e) => e.idle) && !state.engraved.has(source)
  if (idle || (skill && facesWith(base, state, skill.id) >= MAX_COPIES)) return undefined
  const strength = (f: number) => faceValue(base, state, f) + (state.gilded.get(f) ?? 0)
  // Libre : ni gravure ni compétence d'origine ; une Attente, seulement pour une compétence copiée
  const free = Array.from({ length: state.size }, (_, k) => k + 1).filter(
    (f) => f !== source && !state.engraved.has(f) && originOn(base, f).every((e) => e.idle && !!skill),
  )
  const candidates = skill ? free : free.filter((f) => strength(f) < strength(source))
  return candidates.sort((a, b) => strength(a) - strength(b) || a - b)[0]
}

/** Refondre est-il possible ? Au moins deux faces de coup, de valeurs différentes. */
function reforgeValid(base: ForgeBase, state: ForgeState) {
  return new Set(strikeFaces(base, state).map((f) => faceValue(base, state, f))).size > 1
}

/** Les compétences d'une face, aiguisables : celles d'origine (sauf l'Attente), et sa gravure. */
function skillsOn(base: ForgeBase, state: ForgeState, face: number): CharacterEvent[] {
  const engraved = state.engraved.get(face)
  return [...originOn(base, face).filter((e) => !e.idle), ...(engraved ? [engraved] : [])]
}

/** Une opération est-elle valide dans cet état ? */
function stepValid(base: ForgeBase, state: ForgeState, step: ForgeStep) {
  if (step.op === 'reforge') return reforgeValid(base, state)
  if (!targetsIn(base, state, step.op).includes(step.face)) return false
  // Une compétence ne se grave qu'une fois, et jamais par-dessus une des siennes
  return step.op !== 'engrave' || ![...base.events, ...state.engraved.values()].some((e) => e.id === step.skill.id)
}

/** Rejoue un journal de forge sur une définition d'origine. Une opération impossible est une erreur. */
export function forgeState(base: ForgeBase, steps: readonly ForgeStep[]): ForgeState {
  const size = base.stats.damageDie
  const engraved = new Map<number, CharacterEvent>()
  const gilded = new Map<number, number>()
  const ranks = new Map<string, number>()
  const printed = new Map<number, number>()
  const state = { size, engraved, gilded, ranks, printed }
  for (const step of steps) {
    if (!stepValid(base, state, step)) throw new Error(`Forge impossible : ${stepLabel(step)}`)
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
      case 'copy': {
        const target = copyTarget(base, state, step.face)!
        const skill = skillOf(base, state, step.face)
        if (skill) {
          // Sans forme : la copie vaut sous toutes les formes (comme une gravure)
          engraved.set(target, skill)
          gilded.delete(target)
        } else {
          printed.set(target, faceValue(base, state, step.face))
          const gild = gilded.get(step.face)
          if (gild) gilded.set(target, gild)
          else gilded.delete(target)
        }
        break
      }
      case 'reforge': {
        const faces = strikeFaces(base, state)
        const mean = Math.ceil(faces.reduce((t, f) => t + faceValue(base, state, f), 0) / faces.length)
        for (const f of faces) printed.set(f, mean)
        break
      }
    }
  }
  return state
}

/* ---------- Le personnage forgé ---------- */

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/** Le rang affiché d'une compétence aiguisée `rank` fois : II, III… (une compétence nue est au rang I). */
export const rankLabel = (rank: number) => ROMAN[rank + 1] ?? String(rank + 1)

function sharpenEffect(effect: Effect, rank: number): Effect {
  switch (effect.type) {
    case 'applyStatus': {
      const def = STATUSES[effect.status]
      // Une charge de plus par rang, pour un statut qui cumule ses charges et sous son plafond
      if (def.stacking !== 'add') return effect
      return { ...effect, stacks: Math.min(def.maxStacks ?? Infinity, effect.stacks + rank) }
    }
    case 'heal':
    case 'damage':
      return { ...effect, amount: effect.amount + 2 * rank }
    case 'release':
      return { ...effect, min: effect.min + 2 * rank }
    case 'cleanse':
      return effect.orElse ? { ...effect, orElse: sharpenEffect(effect.orElse, rank) as typeof effect.orElse } : effect
  }
}

/** Une compétence aiguisée `rank` fois : son nom porte son rang, ses effets grandissent. */
function sharpen(e: CharacterEvent, rank: number): CharacterEvent {
  if (rank === 0) return e
  return {
    ...e,
    name: `${e.name} ${rankLabel(rank)}`,
    effects: e.effects.map((x) => sharpenEffect(x, rank)),
    ...(e.volley !== undefined && { volley: e.volley + rank }),
  }
}

/**
 * Une compétence gravée sur une face : son déclencheur devient cette face (ou ce double), sans forme. Sur un double,
 * elle remplace les deux coups (ni coup sacrifié ni « s'il touche » : ce sont des règles du dé simple).
 */
function engraveOn(skill: CharacterEvent, face: number, twin: boolean): CharacterEvent {
  const { form: _form, ...rest } = skill
  if (!twin) return { ...rest, trigger: faceTrigger(face) }
  const { forfeitsHit: _forfeits, needsTouch: _touch, chance: _chance, ...double } = rest
  return { ...double, trigger: doubleTrigger(face) }
}

/**
 * Les compétences d'un personnage forgé, dans l'ordre de définition : celles d'origine (sauf l'Attente d'une face
 * gravée), aiguisées, puis ses gravures, aiguisées.
 */
export function forgedEvents(base: ForgeBase, state: ForgeState): CharacterEvent[] {
  const replaced = (e: CharacterEvent) => e.idle && state.engraved.has(faceOf(base, e) ?? 0)
  const origin = base.events.filter((e) => !replaced(e))
  const engraved = [...state.engraved].sort(([a], [b]) => a - b).map(([face, skill]) => engraveOn(skill, face, !!base.twinDice))
  return [...origin, ...engraved].map((e) => sharpen(e, state.ranks.get(e.id) ?? 0))
}

/** Une face du dé forgé, pour l'écran : ses compétences d'origine, sa gravure, sa dorure, son rang. */
export interface ForgedFace {
  face: number
  /** Compétences d'origine (aiguisées), sans l'Attente */
  origin: CharacterEvent[]
  /** Face d'attente (l'ogre) : elle ne frappe pas, et se grave */
  idle: boolean
  /** Compétence gravée (aiguisée) */
  engraved?: CharacterEvent
  gild: number
  /** Ce que frappe la face, dorure non comprise (`faceValue`) */
  value: number
  /** Rang le plus haut de ses compétences (0 : aucune aiguisée) */
  rank: number
}

/** Toutes les faces du dé forgé, de 1 à sa taille. */
export function forgedFaces(base: ForgeBase, steps: readonly ForgeStep[]): ForgedFace[] {
  const state = forgeState(base, steps)
  const events = forgedEvents(base, state)
  return Array.from({ length: state.size }, (_, k) => {
    const face = k + 1
    const on = events.filter((e) => faceOf(base, e) === face)
    const engraved = state.engraved.get(face)
    const own = on.filter((e) => e.id !== engraved?.id && !e.idle)
    return {
      face,
      origin: own,
      idle: originOn(base, face).some((e) => e.idle) && !engraved,
      ...(engraved && { engraved: on.find((e) => e.id === engraved.id) }),
      gild: state.gilded.get(face) ?? 0,
      value: faceValue(base, state, face),
      rank: Math.max(0, ...skillsOn(base, state, face).map((e) => state.ranks.get(e.id) ?? 0)),
    }
  })
}

/* ---------- Offre et choix ---------- */

/**
 * Les compétences qu'on peut graver : celles du dé des autres combattants (un 1, un 2 ou un 3), avec un effet, sans
 * coup transformé. `pool` vient du roster (`ENGRAVABLE_SKILLS`) : ce module ne l'importe pas (character.ts l'importe).
 */
const engravable = (base: ForgeBase, state: ForgeState, pool: readonly CharacterEvent[]) =>
  pool.filter((s) => ![...base.events, ...state.engraved.values()].some((e) => e.id === s.id))

/** Les faces qu'une offre peut viser maintenant (vide pour Refondre). */
export function offerTargets(base: ForgeBase, steps: readonly ForgeStep[], offer: ForgeOffer): number[] {
  return targetsIn(base, forgeState(base, steps), offer.op, offer.op === 'copy' && !!offer.strikesOnly)
}

/** Une offre est-elle jouable (au moins une face visée, ou une opération sans face possible) ? */
function offerValid(base: ForgeBase, state: ForgeState, op: ForgeOpKind, pool: readonly CharacterEvent[], noNewSkill: boolean) {
  if (op === 'reforge') return reforgeValid(base, state)
  if (op === 'engrave' && (noNewSkill || engravable(base, state, pool).length === 0)) return false
  return targetsIn(base, state, op, op === 'copy' && noNewSkill).length > 0
}

/**
 * L'offre d'une forge : `FORGE_OFFER_SIZE` opérations jouables, différentes, tirées au hasard.
 * `focus` (offre orientée, règles v2, docs/PROGRESSION.md § 13.2) : Graver est toujours proposée quand elle le peut, et
 * sa compétence se tire au poids que `focus` lui donne (l'écho avec le build) au lieu de parts égales.
 * `noNewSkill` (la campagne, quand le dé porte déjà toutes ses faces de compétence) : ni Graver, ni copie d'une compétence.
 */
export function drawForgeOffer(
  base: ForgeBase,
  steps: readonly ForgeStep[],
  rng: Rng,
  pool: readonly CharacterEvent[],
  focus?: (skill: CharacterEvent) => number,
  noNewSkill = false,
): ForgeOffer[] {
  const state = forgeState(base, steps)
  const kinds = shuffle(rng, Object.keys(FORGE_OPS) as ForgeOpKind[]).filter((op) => offerValid(base, state, op, pool, noNewSkill))
  const chosen = focus ? [...kinds.filter((op) => op === 'engrave'), ...kinds.filter((op) => op !== 'engrave')] : kinds
  const skills = engravable(base, state, pool)
  return chosen.slice(0, FORGE_OFFER_SIZE).map((op): ForgeOffer => {
    if (op === 'engrave') return { op, skill: focus ? pickWeighted(rng, skills, focus) : pick(rng, skills) }
    if (op === 'copy') return noNewSkill ? { op, strikesOnly: true } : { op }
    return { op }
  })
}

/** L'opération d'une offre sur une face (ignorée sans face). */
export function stepOf(offer: ForgeOffer, face?: number): ForgeStep {
  if (offer.op === 'reforge') return { op: 'reforge' }
  if (face === undefined) throw new Error(`${FORGE_OPS[offer.op].name} : une face est requise`)
  return offer.op === 'engrave' ? { op: 'engrave', face, skill: offer.skill } : { op: offer.op, face }
}

/**
 * Le choix du combattant quand personne ne choisit pour lui (champion de référence, choix par défaut de l'écran) :
 * une offre au hasard, puis une face au hasard parmi celles qu'elle peut viser.
 */
export function autoForge(base: ForgeBase, steps: readonly ForgeStep[], offer: readonly ForgeOffer[], rng: Rng): ForgeStep | undefined {
  if (offer.length === 0) return undefined
  const chosen = pick(rng, offer)
  const targets = offerTargets(base, steps, chosen)
  return stepOf(chosen, targets.length ? pick(rng, targets) : undefined)
}

/** Le journal avec une opération de plus, vérifiée (erreur si elle est impossible). */
export function withForgeStep(base: ForgeBase, steps: readonly ForgeStep[], step: ForgeStep): ForgeStep[] {
  const next = [...steps, step]
  forgeState(base, next)
  return next
}

/** Est-ce que cette opération, seule, vaut sur le dé d'origine ? (héritage : une face du dé d'origine) */
export function validOnOrigin(base: ForgeBase, step: ForgeStep) {
  return stepValid(base, forgeState(base, []), step)
}

/** Une opération en une courte clé lisible (« engrave 5 cleave », « gild 4 », « copy 2 », « reforge ») : trace, comparaison de journaux. */
export const stepKey = (step: ForgeStep) => (step.op === 'engrave' ? `engrave ${step.face} ${step.skill.id}` : step.op === 'reforge' ? step.op : `${step.op} ${step.face}`)

/* ---------- Rédaction ---------- */

/**
 * « Graver Pourfendre sur le 5 », « Dorer le 4 », « Copier le 2 », « Refondre » : l'opération en clair (écran, trace).
 * `twin` : deux dés, où Graver, Aiguiser et Copier visent un double (la dorure, elle, vaut pour chaque dé qui fait sa face).
 */
export function stepLabel(step: ForgeStep | ForgeOffer, twin = false): string {
  const name = FORGE_OPS[step.op].name
  const where = 'face' in step ? ` ${twin && step.op !== 'gild' ? 'le double' : 'le'} ${step.face}` : ''
  if (step.op === 'engrave') return `${name} ${step.skill.name}${'face' in step ? ` sur${where}` : ''}`
  if (step.op === 'copy' && 'face' in step) return `Copier${where}`
  return `${name}${where}`
}

/**
 * Une compétence du roster qui peut se graver sur un autre dé : sur une face du dé simple (1, 2 ou 3), avec un effet, sans
 * coup transformé. Le roster en tire `ENGRAVABLE_SKILLS`.
 */
export const isEngravable = (e: CharacterEvent) => rollFace(e.trigger) !== undefined && !e.idle && !e.reshapesHit
