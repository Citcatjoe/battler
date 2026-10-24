/*
 * Mesure des reliques : `npm run relics` (RELICS_N=800 npm run relics pour plus de combats par duel). Pour
 * chaque relique et chaque personnage : son taux de victoire contre le roster nu, avec la relique puis sans,
 * sur les mêmes graines (`winRate`, analysis.ts). L'écart est l'apport de la relique, en points. Écrit le
 * rapport dans logs/relics/ et l'affiche. Méthode et lecture : docs/RELIQUES.md § Mesurer.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { winRate } from '../src/game/analysis'
import { simulateCombat } from '../src/game/combat'
import { describeRelic, RELIC_KINDS, relicKind, RELICS } from '../src/game/relics'
import { CHARACTERS } from '../src/game/roster'
import pkg from '../package.json' with { type: 'json' }

const pts = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1).replace('.', ',')}`

it('rapport des reliques', () => {
  const perPair = Number(process.env.RELICS_N ?? 400)
  const base = new Map(CHARACTERS.map((c) => [c.id, winRate(c, CHARACTERS, perPair)]))
  const out = [
    `# Reliques · version ${pkg.version}`,
    '',
    `${perPair} combats par duel, côtés alternés, contre les ${CHARACTERS.length} personnages sans relique. Apport = taux avec la relique − taux sans, en points, sur les mêmes graines. Cible : 5 à 15 points, 20 au plus (docs/RELIQUES.md).`,
    '',
    '| Relique | Type | Apport moyen | Plus faible | Plus fort | Déclenchements par combat |',
    '| --- | --- | --- | --- | --- | --- |',
  ]
  const detail: string[] = ['', '## Par personnage (taux sans → avec)', '']
  for (const relic of RELICS) {
    const gains = CHARACTERS.map((c) => ({ c, without: base.get(c.id)!, with: winRate(c.withRelics([relic]), CHARACTERS, perPair) }))
    const delta = gains.map((g) => g.with - g.without)
    const mean = delta.reduce((t, d) => t + d, 0) / delta.length
    const low = gains[delta.indexOf(Math.min(...delta))]
    const high = gains[delta.indexOf(Math.max(...delta))]
    // Fréquence : 20 combats par duel suffisent pour un ordre de grandeur
    let fires = 0
    let fights = 0
    for (const c of CHARACTERS)
      for (const o of CHARACTERS)
        for (let k = 0; k < 20; k++) {
          const r = simulateCombat([c.withRelics([relic]), o], { seed: 9000 + k })
          fires += r.beats.filter((b) => b.type === 'relic' || (b.type === 'attack' && b.attack.relicBonus && b.attack.attacker === 0)).length
          fights++
        }
    out.push(
      `| ${relic.name} | ${RELIC_KINDS[relicKind(relic)].label} | ${pts(mean)} | ${low.c.name} ${pts(low.with - low.without)} | ${high.c.name} ${pts(high.with - high.without)} | ${(fires / fights).toFixed(1).replace('.', ',')} |`,
    )
    detail.push(
      `**${relic.name}** (${describeRelic(relic).text}) : ${gains.map((g) => `${g.c.name} ${(g.without * 100).toFixed(1)} → ${(g.with * 100).toFixed(1)}`).join(', ')}`,
      '',
    )
  }
  const text = [...out, ...detail].join('\n')
  mkdirSync('logs/relics', { recursive: true })
  const file = `logs/relics/${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}_v${pkg.version}.md`
  writeFileSync(file, `${text}\n`)
  console.log(`${text}\n→ ${file}`)
}, 900_000)
