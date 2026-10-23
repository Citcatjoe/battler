/*
 * Garde-fous d'équilibre et de non-régression.
 * - Équilibre : chaque personnage doit gagner entre 42 et 58 % de ses combats, aucun duel au-delà de 65/35.
 * - Empreinte : un résumé de combats à graine fixe. Si une règle change VOLONTAIREMENT,
 *   mettre à jour l'instantané (`npx vitest run -u`) et le noter dans le CHANGELOG.
 *   S'il change sans qu'on l'ait voulu, c'est un effet de bord.
 */
import { describe, expect, it } from 'vitest'
import { analyzeBalance } from './analysis'
import { attacksOf, simulateCombat } from './combat'
import { seededRng } from './rng'
import { CHARACTER_IDS, CHARACTERS, createCharacter } from './roster'

describe('équilibre du roster', () => {
  // Tolérance volontairement large (0.28.0) : des personnages tous à 50 % seraient des clones.
  // On vise un roster « équilibré mais typé » ; la méthode est dans docs/EQUILIBRAGE.md.
  /**
   * Contres connus, en attente d'une décision de l'utilisateur (docs/EQUILIBRAGE.md, questions
   * ouvertes) : tolérés jusqu'à 75/25 au lieu de 65/35. Ne rien ajouter ici sans l'écrire là-bas.
   * Depuis le d6 imprimé (0.105.0), aucun : Brokk–Fanchon et Naraxes–Ysolde sont revenus sous 63 %.
   */
  const KNOWN_COUNTERS = new Set<string>()
  const counter = (a: string, b: string) => KNOWN_COUNTERS.has([a, b].sort().join('-'))

  it('chaque personnage gagne entre 42 et 58 % de ses combats, aucun duel au-delà de 65/35', () => {
    // 800 combats par duel depuis le d6 (0.105.0) : deux duels typés tiennent vers 64/36 (Aldric–Elaria, Thaldrin–
    // Aldric) ; à 300 combats, le bruit d'un duel (±5 points) les faisait sortir au hasard des graines
    const report = analyzeBalance(CHARACTERS, 800, false)
    for (const c of report.characters) {
      expect(c.winRate, `${c.id} : ${c.winRate.toFixed(3)}`).toBeGreaterThan(0.42)
      expect(c.winRate, `${c.id} : ${c.winRate.toFixed(3)}`).toBeLessThan(0.58)
      for (const [opp, rate] of Object.entries(report.matrix[c.id])) {
        const limit = counter(c.id, opp) ? 0.25 : 0.35
        expect(rate, `${c.id} contre ${opp} : ${rate.toFixed(3)}`).toBeGreaterThan(limit)
        expect(rate, `${c.id} contre ${opp} : ${rate.toFixed(3)}`).toBeLessThan(1 - limit)
      }
    }
  }, 60_000)
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
        // L'usure des statuts (étape de présentation, 0.23.0 ; `statusAge` depuis le 2026-10-21) ne compte pas : l'empreinte reste celle des règles.
        const others = r.beats.filter((x) => x.type !== 'attack' && x.type !== 'statusAge').length
        lines.push(`${a}-${b} w${r.winner} t${r.turns} e${others} ${sig}`)
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
