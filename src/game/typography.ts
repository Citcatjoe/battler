/**
 * Typographie française des textes du joueur (passe compendium, 2026-10-25) : les registres s'écrivent avec des espaces
 * simples, lisibles dans le code ; `typeset` met une espace insécable (U+00A0) devant « : ; ! ? % » et à l'intérieur des
 * guillemets, pour qu'aucun signe ne tombe seul en début de ligne. Idempotent : un texte déjà composé ne change plus.
 * Les générateurs (`describeSkill`, `describeRelic`, `rankText`) et les registres (statuts, états, règles) le passent
 * une fois ; `scanText` (combat.test.ts) vérifie qu'aucun texte n'y échappe.
 */
export const NBSP = '\u00a0'

export function typeset(text: string): string {
  return text.replace(/ (?=[:;!?%»])/g, NBSP).replace(/« /g, `«${NBSP}`)
}
