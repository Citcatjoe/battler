import type { CharacterDef } from './character'
import { rollFace, type CharacterEvent } from './events'
import { reachOf, skillNeeds } from './hooks'
import { isEngravable } from './forge'
import { MASTERY_SKILLS } from './skills'
import { auraOfSkill } from './states'

/*
 * Les Maîtrises (retour de l'utilisateur du 2026-10-27, V1 à V5 ; docs/MAITRISES.md) : huit grandes familles de sorts
 * depuis le second retour du même jour (B1 : la Chasse, les Représailles et le Chant fondus dans les autres, l'Orage
 * devenu la Magie), par thème, lisibles par le joueur. Chaque personnage en joue deux (`CharacterDef.masteries`) ; chaque
 * compétence et chaque aura appartient à une seule (son rangement dans le catalogue, skills.ts). Deux personnages qui
 * partagent une maîtrise tirent dans la même réserve (V5). La famille d'un statut (`StatusDef.family`) reste une donnée
 * technique (le son de sa pose), jamais montrée comme une maîtrise.
 */

export type MasteryId = 'fury' | 'blood' | 'bulwark' | 'poison' | 'chance' | 'light' | 'shadow' | 'magic'

export interface Mastery {
  id: MasteryId
  /** Son nom, le seul mot montré au joueur pour ce niveau (« Fureur ») */
  name: string
  /** La question que se pose le joueur (« Frappe-t-il plus fort, plus souvent ? ») */
  question: string
  /** Une phrase, pour le compendium */
  summary: string
  /** Son emblème peint : `src/assets/icons/<icon>.png` */
  icon: string
  /** Ses auras puis ses compétences, par id, dans l'ordre du compendium (celui du catalogue) */
  skills: readonly string[]
}

const mastery = (id: MasteryId, name: string, question: string, summary: string): Mastery => ({
  id,
  name,
  question,
  summary,
  icon: `mastery-${id}`,
  skills: MASTERY_SKILLS[id].map((e) => e.id),
})

export const MASTERIES: Record<MasteryId, Mastery> = {
  fury: mastery('fury', 'Fureur', 'Frappe-t-il plus fort, plus souvent ?', 'Des rafales, des critiques et de gros coups : chaque jet frappe plus fort ou plus souvent.'),
  blood: mastery('blood', 'Sang', "L'adversaire saigne-t-il ?", "Il fait saigner l'adversaire, puis frappe plus quand le sang coule."),
  bulwark: mastery('bulwark', 'Rempart', 'Encaisse-t-il, puis le rend-il ?', "De l'armure et des coups encaissés, qu'il rend ensuite : ripostes et représailles."),
  poison: mastery('poison', 'Poison', 'Perd-il des PV à chaque tour ?', "Le Poison ronge l'adversaire à chaque tour, et nourrit ses soins."),
  chance: mastery('chance', 'Chance', 'Le hasard joue-t-il pour lui ?', 'Des pièces, des jets de plus, des critiques et des esquives : le hasard joue pour lui.'),
  light: mastery('light', 'Lumière', 'Se soigne-t-il, et le fait-il payer ?', "Il se soigne et se garde des malus, et chaque soin se retourne contre l'adversaire."),
  shadow: mastery('shadow', 'Ombre', "L'adversaire est-il maudit ?", "Des malédictions : l'adversaire perd ses actions, ses coups, ses bonus et sa chance."),
  magic: mastery('magic', 'Magie', 'Ses sorts tombent-ils ?', 'Des sorts : la foudre et le feu frappent sans coup, ses chants portent ses coups.'),
}

export const MASTERY_IDS = Object.keys(MASTERIES) as MasteryId[]

const OWNER: Readonly<Record<string, MasteryId>> = Object.fromEntries(MASTERY_IDS.flatMap((m) => MASTERY_SKILLS[m].map((e) => [e.id, m])))

/** La maîtrise d'une compétence ou d'une aura (aucune : une compétence d'essai, hors catalogue). */
export const masteryOfSkill = (skillId: string): MasteryId | undefined => OWNER[skillId]

/** La réserve d'une maîtrise : ses compétences gravables, dans l'ordre du compendium. La même pour tous ses porteurs (V5). */
export const poolOf = (id: MasteryId): CharacterEvent[] => MASTERY_SKILLS[id].filter(isEngravable)

/** Les auras d'une maîtrise (une compétence qui ne pose qu'une aura sur son lanceur). */
export const aurasOf = (id: MasteryId): CharacterEvent[] => MASTERY_SKILLS[id].filter((e) => auraOfSkill(e) !== undefined)

/**
 * La réserve d'un personnage (docs/MAITRISES.md § 6.1) : celles de ses deux maîtrises, moins les compétences déjà sur son
 * dé de départ.
 */
export function characterPool(def: Pick<CharacterDef, 'masteries' | 'events'>): CharacterEvent[] {
  return def.masteries.flatMap(poolOf).filter((s) => !def.events.some((e) => e.id === s.id))
}

/**
 * Les auras de départ d'un personnage (second retour du 2026-10-27, B5 : une règle pour tous, aucune liste à la main) :
 * les auras de ses deux maîtrises **dont le besoin est satisfait par son dé de départ**, l'aura posée sur le 1 (la règle
 * de l'offre, « le producteur d'abord » : `reachOf`, `skillNeeds`, hooks.ts ; une consommatrice sans sa ressource ne
 * ferait rien, comme la Sentence chez Ysolde sans sa Sainteté). La première, celle du 1 de son dé vanilla (l'aura par
 * défaut, celle du duel ; le tournoi et la saison en tirent une au hasard, docs/MAITRISES.md § 5.3).
 */
export function startAurasFor(def: Pick<CharacterDef, 'masteries' | 'events' | 'stats' | 'forms'>): string[] {
  const one = def.events.find((e) => rollFace(e.trigger) === 1)
  const rest = def.events.filter((e) => rollFace(e.trigger) !== 1)
  // La portée de son dé sans le 1 : ce que l'aura y trouve (comme l'offre, qui lit le build sans la compétence offerte ;
  // une aura qui relance sa propre ressource, le Dé pipé ou le Rempart hérissé, ne se sert pas elle-même)
  const reach = reachOf({ ...def, events: rest })
  const served = (aura: CharacterEvent) => skillNeeds(aura).every((h) => reach.has(h))
  const auras = def.masteries.flatMap(aurasOf).filter(served).map((e) => e.id)
  return one !== undefined && auras.includes(one.id) ? [one.id, ...auras.filter((id) => id !== one.id)] : auras
}

/** Une maîtrise tient une boucle : au moins six briques (B1 : pas de maîtrise pauvre), et deux auras (le choix du départ). */
const MIN_SKILLS = 6
const MIN_AURAS = 2

/**
 * Vérifie le registre des maîtrises et leur rangement dans le roster ; renvoie la liste des problèmes (vide si tout va
 * bien). Chaque compétence dans une seule maîtrise ; chaque personnage sur deux maîtrises distinctes, et chaque compétence
 * de son dé dans l'une d'elles.
 */
export function validateMasteries(defs: readonly Pick<CharacterDef, 'id' | 'masteries' | 'events'>[]): string[] {
  const problems: string[] = []
  const seen = new Map<string, MasteryId>()
  for (const m of MASTERY_IDS) {
    for (const e of MASTERY_SKILLS[m]) {
      const other = seen.get(e.id)
      if (other) problems.push(`${e.id} : dans deux maîtrises (${other}, ${m})`)
      seen.set(e.id, m)
      if (!isEngravable(e)) problems.push(`${m} : ${e.id} n'est pas une compétence du dé`)
    }
    if (MASTERY_SKILLS[m].length < MIN_SKILLS) problems.push(`${m} : ${MIN_SKILLS} briques au moins`)
    if (aurasOf(m).length < MIN_AURAS) problems.push(`${m} : trop peu d'auras`)
    const { name, question, summary } = MASTERIES[m]
    if (!name || !question || !summary) problems.push(`${m} : nom, question ou phrase manquants`)
  }
  for (const d of defs) {
    const [a, b] = d.masteries
    if (a === b) problems.push(`${d.id} : deux maîtrises distinctes attendues`)
    for (const e of d.events) {
      const m = masteryOfSkill(e.id)
      if (!m) problems.push(`${d.id} : ${e.id} n'appartient à aucune maîtrise`)
      else if (!d.masteries.includes(m)) problems.push(`${d.id} : ${e.id} (${m}) hors de ses maîtrises`)
    }
  }
  return problems
}
