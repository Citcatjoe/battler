/*
 * Rapport d'équilibre du roster réel : `npm run balance` (BALANCE_N=800 npm run balance pour plus
 * de combats par duel). Écrit le rapport dans logs/balance/ et l'affiche. Méthode : docs/EQUILIBRAGE.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { analyzeBalance, formatBalance } from '../src/game/analysis'
import { CHARACTERS } from '../src/game/roster'
import pkg from '../package.json' with { type: 'json' }

it('rapport d’équilibre', () => {
  const perPair = Number(process.env.BALANCE_N ?? 400)
  const text = `${formatBalance(analyzeBalance(CHARACTERS, perPair))}\n`.replace(
    "# Rapport d'équilibre",
    `# Rapport d'équilibre · version ${pkg.version}`,
  )
  mkdirSync('logs/balance', { recursive: true })
  const file = `logs/balance/${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}_v${pkg.version}.md`
  writeFileSync(file, text)
  console.log(`${text}\n→ ${file}`)
}, 600_000)
