/*
 * Garde-fous d'équilibre et de non-régression.
 * - Équilibre : chaque personnage doit gagner entre 45 et 55 % de ses combats.
 * - Empreinte : un résumé de combats à graine fixe. Si une règle change VOLONTAIREMENT,
 *   mettre à jour l'instantané (`npx vitest run -u`) et le noter dans le CHANGELOG.
 *   S'il change sans qu'on l'ait voulu, c'est un effet de bord.
 */
import { describe, expect, it } from 'vitest'
import { attacksOf, simulateCombat } from './combat'
import { seededRng } from './rng'
import { CHARACTER_IDS, createCharacter } from './roster'

describe('équilibre du roster', () => {
  it('chaque personnage gagne entre 45 et 55 % de ses combats', () => {
    const rng = seededRng(2024)
    const N = 600
    const rates: Record<string, string> = {}
    for (const id of CHARACTER_IDS) {
      let wins = 0
      let fights = 0
      for (const opp of CHARACTER_IDS) {
        if (opp === id) continue
        for (let k = 0; k < N; k++) {
          // Alterner les côtés neutralise tout avantage de position.
          const side = k % 2
          const pair = side === 0 ? [id, opp] : [opp, id]
          const r = simulateCombat([createCharacter(pair[0]), createCharacter(pair[1])], { rng })
          if (r.winner === side) wins++
          fights++
        }
      }
      rates[id] = (wins / fights).toFixed(3)
      expect(wins / fights, `${id} : ${rates[id]}`).toBeGreaterThan(0.45)
      expect(wins / fights, `${id} : ${rates[id]}`).toBeLessThan(0.55)
    }
  })
})

describe('non-régression des règles', () => {
  it('les combats à graine fixe ne changent pas', () => {
    const lines: string[] = []
    for (const a of CHARACTER_IDS)
      for (const b of CHARACTER_IDS) {
        // Graine tirée du nom de la paire : ajouter un personnage n'ajoute que des lignes,
        // sans changer celles des duels existants.
        const r = simulateCombat([createCharacter(a), createCharacter(b)], { rng: seededRng(hash(`${a}-${b}`)) })
        const attacks = attacksOf(r)
        const sig = attacks.map((x) => `${x.roll}${x.dodged ? 'd' : x.crit ? 'c' : ''}${x.damage}`).join(',')
        lines.push(`${a}-${b} w${r.winner} t${r.turns} e${r.beats.length - attacks.length} ${sig}`)
      }
    expect(lines).toMatchSnapshot()
  })
})

/** Empreinte FNV-1a d'une chaîne, pour en faire une graine stable. */
function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}
