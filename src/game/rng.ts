/*
 * Hasard du jeu. Tout tirage passe par une fonction `Rng` injectée, jamais par
 * `Math.random` directement : avec une graine fixe, un combat est reproductible
 * à l'identique, ce qui permet de le tester et de le rejouer.
 */

/** Renvoie un nombre dans [0, 1[, comme `Math.random`. */
export type Rng = () => number

export const defaultRng: Rng = () => Math.random()

/** Générateur déterministe (mulberry32) : même graine, même suite de tirages. */
export function seededRng(seed: number): Rng {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Jet d'un dé à `faces` faces : de 1 à `faces`. */
export const rollDie = (rng: Rng, faces: number) => 1 + Math.floor(rng() * faces)

/** Vrai avec la probabilité `p` (consomme toujours un tirage, même si p vaut 0 ou 1). */
export const chance = (rng: Rng, p: number) => rng() < p

export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)]

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
