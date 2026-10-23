import type { CombatResult, Pair } from './combat'

/*
 * Rapport de combat (écran de victoire, fin de saison) : ce que chaque combattant a tiré de ses reliques et de son dé.
 * Tout se lit dans la chronologie (`beats`) : aucune règle n'est recalculée ici ni dans l'écran.
 */

/** Ce qu'un combattant a fait de ses reliques et de son dé, sur un combat ou cumulé sur une saison. */
export interface FighterReport {
  /**
   * Déclenchements de chaque relique (par id) : une étape `relic` (moment du coup, début de tour, seuil de PV), ou un
   * bonus de coup appliqué à un coup qui touche (Fer à quatre clous). Une relique de caractéristique n'a pas de
   * déclenchement.
   */
  relics: Record<string, number>
  /**
   * Faces jouées : `faces[k]`, le nombre de dés tombés sur la face k + 1. Chaque dé lancé compte : le coup de l'action
   * (ou le jet d'une compétence greffée, étape `roll`), les coups d'une rafale (Furie des vents, Coup de chance), chacun
   * des deux dés d'une paire (la barde). Le coup qui reprend un dé déjà tiré (paire, jet greffé) ne relance rien, il ne
   * compte pas une seconde fois ; une pièce n'est pas un dé.
   */
  faces: number[]
}

/** Rapport d'un combat : un par camp (0 à gauche, 1 à droite). */
export type CombatReport = Pair<FighterReport>

export const emptyReport = (): FighterReport => ({ relics: {}, faces: [] })

/** Ajoute `n` dés tombés sur `face` (les faces manquantes valent 0). */
function addFace(report: FighterReport, face: number, n = 1) {
  while (report.faces.length < face) report.faces.push(0)
  report.faces[face - 1] += n
}

/** Le rapport d'un combat, lu dans sa chronologie. */
export function combatReport(result: Pick<CombatResult, 'beats'>): CombatReport {
  const reports: CombatReport = [emptyReport(), emptyReport()]
  const relic = (side: 0 | 1, id: string) => (reports[side].relics[id] = (reports[side].relics[id] ?? 0) + 1)
  for (const beat of result.beats) {
    if (beat.type === 'relic') relic(beat.side, beat.relic)
    else if (beat.type === 'pair') for (const roll of beat.rolls) addFace(reports[beat.side], roll)
    else if (beat.type === 'roll') addFace(reports[beat.side], beat.roll)
    else if (beat.type === 'attack') {
      const a = beat.attack
      if (!a.preset) addFace(reports[a.attacker], a.roll)
      for (const bonus of a.relicBonus ?? []) relic(a.attacker, bonus.relic)
    }
  }
  return reports
}

/** Ajoute `extra` à `into` (cumul d'une saison) ; renvoie `into`. */
export function addReport(into: FighterReport, extra: FighterReport): FighterReport {
  for (const [id, n] of Object.entries(extra.relics)) into.relics[id] = (into.relics[id] ?? 0) + n
  extra.faces.forEach((n, k) => addFace(into, k + 1, n))
  return into
}

/** Les reliques d'un rapport, de la plus déclenchée à la moins déclenchée (ordre d'id à égalité). */
export const relicsByProcs = (report: FighterReport): [string, number][] =>
  Object.entries(report.relics).sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
