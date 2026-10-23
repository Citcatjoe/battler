import type { CharacterDef } from './character'
import { DIE_FACES, doubleFace, doubleTrigger, faceTrigger, rollFace, type CharacterEvent, type Effect } from './events'
import { pick, pickWeighted, shuffle, type Rng } from './rng'
import { STATUSES } from './statuses'

/*
 * La forge du dé (0.88.0, docs/CAMPAGNE.md § 4 ; règles v2, docs/PROGRESSION.md § 6.5 et § 6 bis) : le dé, c'est l'arme.
 * Le dé ne fait pas de dégâts : chaque face déclenche sa compétence, ou rien (une face nue), et chaque jet porte le coup
 * de base de l'attaque (docs/RESOLUTION.md § 3 bis). Cinq opérations changent ce que portent ses faces, ou l'attaque. Une
 * forge est un JOURNAL d'opérations (`ForgeStep[]`), rejoué sur la définition d'origine du personnage (`forgeState`) :
 * c'est une donnée, comme une relique, que n'importe quel mode peut donner (`Character.withForge`).
 *   - Graver : une compétence prise à un autre combattant prend une face nue ;
 *   - Dorer : +2 au coup de base quand cette face nue tombe, avant le critique, coup brut compris (`Attack.gild`) ;
 *   - Aiguiser : la compétence d'une face monte d'un rang ;
 *   - Copier une face : la compétence d'une face, telle qu'elle est (rang compris), est copiée sur une face nue (la plus
 *     petite qui n'est pas dorée, sinon la plus petite) ; une compétence sur deux faces au plus ;
 *   - Tremper l'arme (phase 5 bis, remplace Refondre) : +1 à l'attaque (minimum et maximum), cumulable, sans face visée.
 * Règles de l'utilisateur : une compétence d'origine ne se déplace pas, ses faces sont irréductibles, et seules les
 * faces nues se gravent ou se dorent. Personnage à deux dés (barde) : ses faces sont des doubles pour Graver, Aiguiser et
 * Copier, et la dorure vaut pour chaque dé qui fait cette face.
 */

/** Bonus d'une dorure, ajouté au coup de base avant le critique. */
export const GILD_BONUS = 2

/** Ce que Tremper l'arme ajoute à l'attaque (au minimum et au maximum). */
export const TEMPER_BONUS = 1

/** Une même compétence sur deux faces au plus (Copier une face, décision de l'utilisateur, PROGRESSION.md § 6.5). */
export const MAX_COPIES = 2

/** Opérations proposées à chaque forge, comme les reliques d'une récompense. */
export const FORGE_OFFER_SIZE = 3

export type ForgeOpKind = 'engrave' | 'gild' | 'sharpen' | 'copy' | 'temper'

/** Ce que vaut une dorure, sans son montant : « +2 au coup de base » (le montant se colore à part dans l'aperçu). */
export const GILD_RULE = 'au coup de base'

/**
 * Les cinq opérations : nom, règle au plus court (2026-10-23, demande de l'utilisateur : une information simple, pas
 * d'explication ; ce qu'elle change se lit dans l'aperçu du dé), et si elles visent une face.
 */
export const FORGE_OPS: Record<ForgeOpKind, { name: string; summary: string; targeted: boolean }> = {
  engrave: { name: 'Graver', summary: 'Nouvelle compétence sur une face nue', targeted: true },
  gild: { name: 'Dorer', summary: `+${GILD_BONUS} ${GILD_RULE}`, targeted: true },
  sharpen: { name: 'Aiguiser', summary: '+1 rang à une compétence', targeted: true },
  copy: { name: 'Copier une face', summary: 'Copie sa compétence sur une face nue', targeted: true },
  temper: { name: 'Tremper l’arme', summary: `+${TEMPER_BONUS} à l'attaque`, targeted: false },
}

/** Une opération proposée, avant le choix de sa face. Graver porte la compétence à graver. */
export type ForgeOffer = { op: 'engrave'; skill: CharacterEvent } | { op: Exclude<ForgeOpKind, 'engrave'> }

/** Une opération appliquée : celles qui visent une face portent sa face. */
export type ForgeStep =
  | { op: 'engrave'; face: number; skill: CharacterEvent }
  | { op: 'gild'; face: number }
  | { op: 'sharpen'; face: number }
  | { op: 'copy'; face: number }
  | { op: 'temper' }

/** Ce que la forge a fait du dé : ses compétences gravées, ses dorures, les rangs de ses compétences, sa trempe. */
export interface ForgeState {
  engraved: ReadonlyMap<number, CharacterEvent>
  gilded: ReadonlyMap<number, number>
  /** Rangs gagnés par compétence (id), 0 par défaut : une compétence aiguisée deux fois est au rang III */
  ranks: ReadonlyMap<string, number>
  /** Ce que Tremper l'arme a ajouté à l'attaque */
  temper: number
}

/** Ce qu'il faut de la définition d'un personnage pour forger son dé. */
export type ForgeBase = Pick<CharacterDef, 'events' | 'twinDice'>

/** Les six faces du dé, de 1 à 6. */
const FACES = Array.from({ length: DIE_FACES }, (_, k) => k + 1)

/** La face (ou le double) d'une compétence du dé, ou undefined (compétence hors dé, jet maximal). */
const faceOf = (base: ForgeBase, e: CharacterEvent) => (base.twinDice ? doubleFace(e.trigger) : rollFace(e.trigger))

/** Les compétences d'origine d'une face (toutes formes confondues). */
const originOn = (base: ForgeBase, face: number) => base.events.filter((e) => faceOf(base, e) === face)

/* ---------- Rejouer le journal ---------- */

/** Une face nue : ni compétence d'origine ni gravure (deux dés : un double sans compétence). */
const isBare = (base: ForgeBase, state: ForgeState, face: number) => originOn(base, face).length === 0 && !state.engraved.has(face)

/** Les faces qu'une opération peut viser, dans l'état donné (vide pour une opération sans face). */
function targetsIn(base: ForgeBase, state: ForgeState, op: ForgeOpKind): number[] {
  switch (op) {
    case 'engrave':
      return FACES.filter((f) => isBare(base, state, f))
    case 'gild':
      // Une face nue (deux dés : toute face, chaque dé porte son coup de base hors double)
      return FACES.filter((f) => !state.gilded.has(f) && (base.twinDice || isBare(base, state, f)))
    case 'sharpen':
      // Aiguisable : un rang de plus change ses effets (un statut au plafond, ou qui ne cumule pas, ne gagne rien). Pas de
      // rang maximal : le nombre d'aiguisages se règle par le nombre d'occasions qu'un mode en donne (décision de
      // l'utilisateur, 2026-10-23)
      return FACES.filter((f) =>
        skillsOn(base, state, f).some((e) => {
          const rank = state.ranks.get(e.id) ?? 0
          const [now, next] = [sharpen(e, rank), sharpen(e, rank + 1)]
          return JSON.stringify([next.effects, next.hitMultiplier]) !== JSON.stringify([now.effects, now.hitMultiplier])
        }),
      )
    case 'copy':
      // Une face de compétence encore sur moins de deux faces, et une face nue où poser la copie
      return FACES.filter((f) => copyTarget(base, state, f) !== undefined)
    case 'temper':
      return []
  }
}

/** La compétence que porte une face (sa gravure, sinon sa compétence d'origine), avant aiguisage. */
function skillOf(base: ForgeBase, state: ForgeState, face: number): CharacterEvent | undefined {
  return state.engraved.get(face) ?? originOn(base, face)[0]
}

/** Faces qui portent cette compétence (d'origine ou gravée) : une compétence sur `MAX_COPIES` faces au plus. */
const facesWith = (base: ForgeBase, state: ForgeState, id: string) => FACES.filter((f) => skillOf(base, state, f)?.id === id).length

/**
 * Où Copier une face pose sa copie : la face nue de plus petit numéro qui n'est pas dorée, sinon la face nue de plus
 * petit numéro. Undefined : rien à copier là (face nue, compétence déjà sur deux faces, ou plus de face nue).
 */
function copyTarget(base: ForgeBase, state: ForgeState, source: number): number | undefined {
  const skill = skillOf(base, state, source)
  if (!skill || facesWith(base, state, skill.id) >= MAX_COPIES) return undefined
  const bare = FACES.filter((f) => isBare(base, state, f))
  return bare.find((f) => !state.gilded.has(f)) ?? bare[0]
}

/** Les compétences d'une face, aiguisables : celles d'origine, et sa gravure. */
function skillsOn(base: ForgeBase, state: ForgeState, face: number): CharacterEvent[] {
  const engraved = state.engraved.get(face)
  return [...originOn(base, face), ...(engraved ? [engraved] : [])]
}

/** Une opération est-elle valide dans cet état ? Une opération inconnue (Refondre, retirée en 0.106.0) ne l'est pas. */
function stepValid(base: ForgeBase, state: ForgeState, step: ForgeStep) {
  if (!(step.op in FORGE_OPS)) return false
  if (step.op === 'temper') return true
  if (!targetsIn(base, state, step.op).includes(step.face)) return false
  // Une compétence ne se grave qu'une fois, et jamais par-dessus une des siennes
  return step.op !== 'engrave' || ![...base.events, ...state.engraved.values()].some((e) => e.id === step.skill.id)
}

/** Rejoue un journal de forge sur une définition d'origine. Une opération impossible est une erreur. */
export function forgeState(base: ForgeBase, steps: readonly ForgeStep[]): ForgeState {
  const engraved = new Map<number, CharacterEvent>()
  const gilded = new Map<number, number>()
  const ranks = new Map<string, number>()
  const state = { engraved, gilded, ranks, temper: 0 }
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
      case 'copy':
        // Sans forme : la copie vaut sous toutes les formes (comme une gravure) ; une dorure de la face visée reste
        engraved.set(copyTarget(base, state, step.face)!, skillOf(base, state, step.face)!)
        break
      case 'temper':
        state.temper += TEMPER_BONUS
        break
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

/** Une compétence aiguisée `rank` fois : son nom porte son rang, ses effets grandissent (Crescendo : ×1 de plus). */
function sharpen(e: CharacterEvent, rank: number): CharacterEvent {
  if (rank === 0) return e
  return {
    ...e,
    name: `${e.name} ${rankLabel(rank)}`,
    effects: e.effects.map((x) => sharpenEffect(x, rank)),
    ...(e.hitMultiplier !== undefined && { hitMultiplier: e.hitMultiplier + rank }),
  }
}

/**
 * Une compétence gravée sur une face : son déclencheur devient cette face (ou ce double), sans forme. Sur un double,
 * une compétence qui modifie son coup se greffe (un double a deux coups), et sans probabilité.
 */
function engraveOn(skill: CharacterEvent, face: number, twin: boolean): CharacterEvent {
  const { form: _form, ...rest } = skill
  if (!twin) return { ...rest, trigger: faceTrigger(face) }
  const { chance: _chance, relation, ...double } = rest
  return { ...double, ...(relation === 'replace' && { relation }), trigger: doubleTrigger(face) }
}

/** Les compétences d'un personnage forgé, dans l'ordre de définition : celles d'origine, puis ses gravures, aiguisées. */
export function forgedEvents(base: ForgeBase, state: ForgeState): CharacterEvent[] {
  const engraved = [...state.engraved].sort(([a], [b]) => a - b).map(([face, skill]) => engraveOn(skill, face, !!base.twinDice))
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
    const on = events.filter((e) => faceOf(base, e) === face)
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
 * Les compétences qu'on peut graver : celles du dé des autres combattants (une face), avec un effet. `pool` vient du
 * roster (`ENGRAVABLE_SKILLS`) : ce module ne l'importe pas (character.ts l'importe).
 */
const engravable = (base: ForgeBase, state: ForgeState, pool: readonly CharacterEvent[]) =>
  pool.filter((s) => ![...base.events, ...state.engraved.values()].some((e) => e.id === s.id))

/** Les faces qu'une offre peut viser maintenant (vide pour Tremper l'arme). */
export function offerTargets(base: ForgeBase, steps: readonly ForgeStep[], offer: ForgeOffer): number[] {
  return targetsIn(base, forgeState(base, steps), offer.op)
}

/** Une offre est-elle jouable (au moins une face visée, ou une opération sans face) ? */
function offerValid(base: ForgeBase, state: ForgeState, op: ForgeOpKind, pool: readonly CharacterEvent[], noNewSkill: boolean) {
  if (op === 'temper') return true
  // Plus de nouvelle face de compétence : ni gravure ni copie
  if ((op === 'engrave' || op === 'copy') && noNewSkill) return false
  if (op === 'engrave' && engravable(base, state, pool).length === 0) return false
  return targetsIn(base, state, op).length > 0
}

/**
 * L'offre d'une forge : `FORGE_OFFER_SIZE` opérations jouables, différentes, tirées au hasard.
 * `focus` (offre orientée, règles v2, docs/PROGRESSION.md § 13.2) : Graver est toujours proposée quand elle le peut, et
 * sa compétence se tire au poids que `focus` lui donne (l'écho avec le build) au lieu de parts égales.
 * `noNewSkill` (la campagne, quand le dé porte déjà toutes ses faces de compétence) : ni Graver, ni Copier une face.
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
    return { op }
  })
}

/** L'opération d'une offre sur une face (ignorée sans face). */
export function stepOf(offer: ForgeOffer, face?: number): ForgeStep {
  if (offer.op === 'temper') return { op: 'temper' }
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

/** Une opération en une courte clé lisible (« engrave 5 cleave », « gild 4 », « copy 2 », « temper ») : trace, comparaison de journaux. */
export const stepKey = (step: ForgeStep) => (step.op === 'engrave' ? `engrave ${step.face} ${step.skill.id}` : step.op === 'temper' ? step.op : `${step.op} ${step.face}`)

/* ---------- Rédaction ---------- */

/**
 * « Graver Pourfendre sur le 5 », « Dorer le 4 », « Copier le 2 », « Tremper l'arme » : l'opération en clair (écran,
 * trace). `twin` : deux dés, où Graver, Aiguiser et Copier visent un double (la dorure, elle, vaut pour chaque dé qui fait
 * sa face).
 */
export function stepLabel(step: ForgeStep | ForgeOffer, twin = false): string {
  const name = FORGE_OPS[step.op].name
  const where = 'face' in step ? ` ${twin && step.op !== 'gild' ? 'le double' : 'le'} ${step.face}` : ''
  if (step.op === 'engrave') return `${name} ${step.skill.name}${'face' in step ? ` sur${where}` : ''}`
  if (step.op === 'copy' && 'face' in step) return `Copier${where}`
  return `${name}${where}`
}

/**
 * Une compétence du roster qui peut se graver sur un autre dé : celle d'une face du dé simple. Le roster en tire
 * `ENGRAVABLE_SKILLS`.
 */
export const isEngravable = (e: CharacterEvent) => rollFace(e.trigger) !== undefined
