import type { CharacterDef } from './character'
import type { CharacterEvent } from './events'
import { isEngravable } from './forge'
import { MASTERY_SKILLS } from './skills'
import { auraOfSkill } from './states'
import { typeset } from './typography'

/*
 * Les Maîtrises (retour de l'utilisateur du 2026-10-27, V1 à V5 ; docs/MAITRISES.md) : onze grandes familles de sorts,
 * par thème, lisibles par le joueur. Chaque personnage en joue deux (`CharacterDef.masteries`) ; chaque compétence et
 * chaque aura appartient à une seule (son rangement dans le catalogue, skills.ts). Deux personnages qui partagent une
 * maîtrise tirent dans la même réserve (V5). La famille d'un statut (`StatusDef.family`) reste une donnée technique (le
 * son de sa pose), jamais montrée comme une maîtrise.
 */

export type MasteryId = 'fury' | 'blood' | 'hunt' | 'bulwark' | 'retaliation' | 'poison' | 'chance' | 'light' | 'shadow' | 'storm' | 'song'

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
  fury: mastery('fury', 'Fureur', 'Frappe-t-il plus fort, plus souvent ?', 'Des rafales et de gros coups : chaque jet frappe plus fort ou plus souvent.'),
  blood: mastery('blood', 'Sang', "L'adversaire saigne-t-il ?", "Il fait saigner l'adversaire, puis frappe plus quand il saigne."),
  hunt: mastery('hunt', 'Chasse', 'Va-t-il viser juste, ou esquiver ?', "Des critiques et des esquives : il vise juste et n'est jamais là où l'on frappe."),
  bulwark: mastery('bulwark', 'Rempart', 'Encaisse-t-il, puis le rend-il ?', "De l'armure temporaire et des coups encaissés, qu'il rend ensuite."),
  retaliation: mastery('retaliation', 'Représailles', 'Le frapper se paie-t-il ?', "Chaque coup qu'il reçoit se paie : il renvoie les dégâts."),
  poison: mastery('poison', 'Poison', 'Perd-il des PV à chaque tour ?', "Le Poison ronge l'adversaire à chaque tour, et nourrit ses soins."),
  chance: mastery('chance', 'Chance', 'Que vont donner le dé et la pièce ?', 'Des pièces et des jets de plus : le hasard joue pour lui.'),
  light: mastery('light', 'Lumière', 'Se soigne-t-il, et le fait-il payer ?', "Il se soigne, et chaque soin se retourne contre l'adversaire."),
  shadow: mastery('shadow', 'Ombre', "L'adversaire est-il maudit ?", "Des malédictions : l'adversaire perd ses actions, ses coups et ses bonus."),
  storm: mastery('storm', 'Orage', 'La foudre et le feu tombent-ils ?', 'La foudre et le feu frappent sans coup : des éclairs et des Brûlures.'),
  song: mastery('song', 'Chant', 'La chanson porte-t-elle ses coups ?', 'Des dés de plus et de gros coups : la chanson porte ses coups.'),
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

/** Une maîtrise tient une boucle : au moins cinq briques, et deux auras (le choix du départ), sauf le Chant (§ 2, règle 4). */
const MIN_SKILLS = 5
const MIN_AURAS = 2
const ONE_AURA: readonly MasteryId[] = ['song']

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
    if (aurasOf(m).length < (ONE_AURA.includes(m) ? 1 : MIN_AURAS)) problems.push(`${m} : trop peu d'auras`)
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
