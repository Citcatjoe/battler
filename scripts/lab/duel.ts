/*
 * Le k-ième combat d'un duel, exactement comme `analysis.ts` (placement alterné à partir de l'ordre
 * des identifiants, graine tirée du duel et de k) : les essais des scripts rejouent les mêmes combats
 * que `npm run balance` (hasard commun), ce qui réduit le bruit des comparaisons.
 */
import { hashSeed } from '../../src/game/analysis'
import type { Character } from '../../src/game/character'
import { simulateCombat, type CombatResult, type Pair, type Side } from '../../src/game/combat'

export function duelFight(me: Character, opp: Character, k: number): { result: CombatResult; side: Side } {
  const [first, second] = me.id < opp.id ? [me, opp] : [opp, me]
  const pair: Pair<Character> = k % 2 === 0 ? [first, second] : [second, first]
  return { result: simulateCombat(pair, { seed: hashSeed(`${first.id}-${second.id}#${k}`) }), side: pair[0] === me ? 0 : 1 }
}
