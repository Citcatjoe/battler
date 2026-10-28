import type { Character } from './character'
import type { CharacterEvent } from './events'
import { autoForge, drawForgeOffer, forgedFaces, type ForgeOffer, type ForgeStep } from './forge'
import { buildHooks, echoOf, eventHooks, reachOf as fighterReach, relicHooks, relicNeeds, skillNeeds, type Hook } from './hooks'
import { characterPool, masteryOfSkill } from './masteries'
import { autoPick, drawOffer, getRelic, RELIC_IDS } from './relics'
import type { Rng } from './rng'
import { createCharacter } from './roster'

/*
 * Les offres de construction, communes à la campagne et à la saison du tournoi (0.115.0 : une seule voie, déplacée de
 * campaign.ts) : ce qu'un personnage vanilla peut recevoir, relique ou forge du dé, et comment l'offre se tire.
 * - l'ordre des récompenses d'un acte (`REWARDS`) ;
 * - la réserve de chaque personnage (celles de ses deux maîtrises moins son dé, `characterPool`, docs/MAITRISES.md
 *   § 6.1), la limite de faces de compétence (`MAX_SKILL_FACES`) ;
 * - l'offre pertinente (`offerableRelics`, `offerableSkills` : rien dont la condition ne peut pas arriver) ;
 * - l'offre orientée (`drawReward` : la première carte au poids de son écho avec le build, `ECHO_WEIGHT` ; Graver
 *   propose une compétence de chacune de ses deux maîtrises, § 6.2).
 * Chaque mode garde son rythme (quand une récompense tombe) et son stockage ; l'offre, elle, est la même.
 */

export type RewardKind = 'relic' | 'forge'

/**
 * Les récompenses d'un acte de campagne, dans l'ordre retenu (docs/PROGRESSION.md § 11.2 ; une forge tôt, sur le dé de
 * départ). Quatre forges et six reliques jusqu'au retour du 2026-10-28 (A9 : « le dé doit être complet en fin de
 * construction ») ; depuis, cinq et cinq, en alternance : quatre faces à remplir (3 à 6), et une forge de plus pour un
 * aiguisage. La saison du tournoi construit chacun au même rythme (season.ts). Mesures : docs/CAMPAGNE.md § 18.5.
 */
export const REWARDS: readonly RewardKind[] = ['forge', 'relic', 'forge', 'relic', 'forge', 'relic', 'forge', 'relic', 'forge', 'relic']

/** Les forges d'un calendrier de récompenses à partir de la `index`-ième (comprise) : celles qui restent à recevoir. */
export const forgesLeftIn = (calendar: readonly RewardKind[], index: number) => calendar.slice(index).filter((k) => k === 'forge').length

/**
 * Faces de compétence au plus sur un dé construit, aura et signature comprises : les six (retour de l'utilisateur du
 * 2026-10-28, A9 : « le dé doit être complet en fin de construction » ; quatre de la 0.104.0 à la 0.111.0, cinq de la
 * 0.112.0 à la 0.127.0). La limite atteinte, ni Graver ni Copier une face ne sont proposées. Elle compte des faces, pas
 * des compétences : une gravure ou une copie en prend une. Un personnage peut en déclarer moins
 * (`CharacterDef.skillFaces`, une identité : Morgrut, quatre, « il ne fait presque rien, mais ses coups sont plus forts »).
 */
export const MAX_SKILL_FACES = 6

/**
 * Ce qu'un personnage a construit : son id (le « champion » qui se construit), l'aura de départ sur son 1 (choisie en
 * campagne, tirée en tournoi et en saison ; l'aura par défaut sans elle), son journal de forge, ses reliques.
 */
export interface BuildState {
  championId: string
  aura?: string
  forge: ForgeStep[]
  relics: string[]
}

/** Une récompense tirée : une relique ou une forge, l'offre, et le choix par défaut (au hasard dans l'offre), modifiable. */
export type PendingReward =
  | { kind: 'relic'; offer: string[]; /** choix par défaut (au hasard dans l'offre), modifiable */ choice?: string }
  | { kind: 'forge'; offer: ForgeOffer[]; choice?: ForgeStep }

/** Le personnage vanilla parti de son aura (`createCharacter`), son dé forgé, ses reliques. */
const builtCharacter = (b: BuildState): Character => createCharacter(b.championId, { aura: b.aura }).withForge(b.forge).withRelics(b.relics.map(getRelic))

/** Poids d'une brique dans l'offre orientée : 1, plus `ECHO_WEIGHT` par accroche qui la relie au build (docs/PROGRESSION.md § 13.2). */
export const ECHO_WEIGHT = 2

/**
 * Ce qui est à la portée du personnage, l'offre pertinente : ce que produit **son build d'aujourd'hui**, ses compétences
 * (le dé vanilla et ses faces gravées), ses reliques et ses formes, et l'esquive ou le critique s'il en a la chance
 * (`reachOf`, hooks.ts, la même règle que les auras de départ). Du 2026-10-24 à la nuit du 2026-10-25, son répertoire
 * comptait aussi (tout ce qu'il pourrait graver) : une consommatrice arrivait avant son producteur et restait une face
 * morte (la Curée chez Elaria sans Pourfendre gravé, la Pièce trouée chez Fanchon sans Pile ou face ; docs/CAMPAGNE.md
 * § 18.3). Décision du parent : le producteur d'abord.
 */
const reachOf = (b: BuildState): Set<Hook> => fighterReach(builtCharacter(b))

/**
 * Les reliques qu'on peut lui offrir (2026-10-24, retour de l'utilisateur : « la Fiole de venin m'est proposée à chaque
 * fois, alors qu'aucun des persos que j'ai joués ne joue sur le poison ») : celles dont la condition peut arriver avec
 * ce qu'il a déjà (`relicNeeds`, `reachOf`), parmi tout le registre (`RELIC_IDS`).
 */
export function offerableRelics(b: BuildState): string[] {
  const reach = reachOf(b)
  return RELIC_IDS.filter((id) => relicNeeds(getRelic(id)).every((h) => reach.has(h)))
}

/**
 * Les compétences de `skills` qu'on peut lui offrir à graver (0.114.0, la même règle que les reliques) : celles dont le
 * besoin est déjà dans son build (`skillNeeds`, `reachOf`). Une consommatrice sans sa ressource (la Curée sans
 * Saignement, la Sentence sans soin) vaudrait 0 gravée ; elle arrive une fois son producteur gravé ou porté.
 */
export function offerableSkills(b: BuildState, skills: readonly CharacterEvent[]): CharacterEvent[] {
  const reach = reachOf(b)
  return skills.filter((s) => skillNeeds(s).every((h) => reach.has(h)))
}

/**
 * Une récompense de construction, la même en campagne (joueur et champion de référence) et en saison (offre orientée,
 * règles v2, phase 2 ; maîtrises, docs/MAITRISES.md § 6) :
 * - forge : Graver est toujours proposée quand une face peut la recevoir. Elle propose une compétence de chacune de ses
 *   deux maîtrises (une seule si l'autre n'a plus rien d'offrable), tirées dans sa réserve (`characterPool`, jamais une
 *   aura : la sienne est choisie au départ, retour du 2026-10-28, A2), parmi celles dont le besoin est déjà dans son
 *   build (`offerableSkills`, le producteur d'abord), chacune au poids de son écho avec le build dans sa maîtrise ; quand
 *   le dé porte `MAX_SKILL_FACES` faces de compétence, ni Graver ni copie d'une compétence. `forgesLeft`, les forges
 *   qui restent au calendrier, celle-ci comprise (`forgesLeftIn`) : quand il en reste autant que de faces à remplir,
 *   seulement Graver et Copier une face (A9 : le dé complet en fin de construction) ;
 * - relique : parmi celles dont la condition peut arriver avec son build (`offerableRelics`), la première carte au poids de son écho,
 *   les deux autres libres.
 * Le choix par défaut reste au hasard dans l'offre (pour Graver, une maîtrise sur deux).
 */
export function drawReward(b: BuildState, kind: RewardKind, rng: Rng, forgesLeft?: number): PendingReward {
  const build = buildHooks(builtCharacter(b))
  if (kind === 'relic') {
    const offer = drawOffer(b.relics, rng, offerableRelics(b), (id) => 1 + ECHO_WEIGHT * echoOf(relicHooks(getRelic(id)), build))
    const choice = autoPick(offer, rng)
    return { kind: 'relic', offer, ...(choice && { choice }) }
  }
  const def = createCharacter(b.championId, { aura: b.aura }).definition
  const empty = (def.skillFaces ?? MAX_SKILL_FACES) - forgedFaces(def, b.forge).filter((f) => f.origin.length > 0 || f.engraved).length
  const left = offerableSkills(
    b,
    characterPool(def).filter((s) => !b.forge.some((f) => f.op === 'engrave' && f.skill.id === s.id)),
  )
  const offer = drawForgeOffer(def, b.forge, rng, left, {
    focus: (s) => 1 + ECHO_WEIGHT * echoOf(eventHooks(s), build),
    noNewSkill: empty <= 0,
    fillOnly: forgesLeft !== undefined && empty >= forgesLeft,
    groupOf: (s) => masteryOfSkill(s.id),
  })
  const choice = autoForge(def, b.forge, offer, rng)
  return { kind: 'forge', offer, ...(choice && { choice }) }
}
