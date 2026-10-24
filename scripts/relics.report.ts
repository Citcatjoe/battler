/*
 * Mesure des reliques : `npm run relics` (RELICS_N=800 npm run relics pour plus de combats par duel ;
 * RELICS_ONLY=id,id pour quelques reliques seulement). Pour chaque relique et chaque personnage : son taux de
 * victoire contre le roster nu, avec la relique puis sans, sur les mêmes graines (`winRate`, analysis.ts). L'écart
 * est l'apport de la relique, en points. La durée (tours par combattant, sans → avec) se lit sur les combats de la
 * fréquence, mêmes graines avec et sans. Écrit le rapport dans logs/relics/ et l'affiche. Méthode et lecture :
 * docs/RELIQUES.md § Mesurer.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { winRate } from '../src/game/analysis'
import { simulateCombat } from '../src/game/combat'
import { describeRelic, RELIC_KINDS, relicKind, RELICS } from '../src/game/relics'
import { CHARACTERS } from '../src/game/roster'
import pkg from '../package.json' with { type: 'json' }

const pts = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1).replace('.', ',')}`
const dec = (x: number) => x.toFixed(1).replace('.', ',')

/** Fréquence et durée : 20 combats par duel suffisent pour un ordre de grandeur */
const SAMPLE = 20

it('rapport des reliques', () => {
  const perPair = Number(process.env.RELICS_N ?? 400)
  const only = process.env.RELICS_ONLY?.split(',')
  const relics = only ? RELICS.filter((r) => only.includes(r.id)) : RELICS
  const base = new Map(CHARACTERS.map((c) => [c.id, winRate(c, CHARACTERS, perPair)]))
  // Durée sans relique, sur les graines de la fréquence : tours du combat ÷ 2
  let bareTurns = 0
  for (const c of CHARACTERS) for (const o of CHARACTERS) for (let k = 0; k < SAMPLE; k++) bareTurns += simulateCombat([c, o], { seed: 9000 + k }).turns
  const bare = bareTurns / 2 / (CHARACTERS.length ** 2 * SAMPLE)
  const out = [
    `# Reliques · version ${pkg.version}`,
    '',
    `${perPair} combats par duel, côtés alternés, contre les ${CHARACTERS.length} personnages sans relique. Apport = taux avec la relique − taux sans, en points, sur les mêmes graines. Cible : 5 à 15 points, 20 au plus (docs/RELIQUES.md). Durée : tours par combattant, sans relique → avec, sur ${SAMPLE} combats par duel (mêmes graines).`,
    '',
    '| Relique | Type | Apport moyen | Plus faible | Plus fort | Déclenchements par combat | Durée |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ]
  const detail: string[] = ['', '## Par personnage (taux sans → avec)', '']
  for (const relic of relics) {
    const gains = CHARACTERS.map((c) => ({ c, without: base.get(c.id)!, with: winRate(c.withRelics([relic]), CHARACTERS, perPair) }))
    const delta = gains.map((g) => g.with - g.without)
    const mean = delta.reduce((t, d) => t + d, 0) / delta.length
    const low = gains[delta.indexOf(Math.min(...delta))]
    const high = gains[delta.indexOf(Math.max(...delta))]
    let fires = 0
    let fights = 0
    let turns = 0
    for (const c of CHARACTERS)
      for (const o of CHARACTERS)
        for (let k = 0; k < SAMPLE; k++) {
          const r = simulateCombat([c.withRelics([relic]), o], { seed: 9000 + k })
          fires += r.beats.filter((b) => b.type === 'relic' || (b.type === 'attack' && b.attack.relicBonus && b.attack.attacker === 0)).length
          turns += r.turns
          fights++
        }
    out.push(
      `| ${relic.name} | ${RELIC_KINDS[relicKind(relic)].label} | ${pts(mean)} | ${low.c.name} ${pts(low.with - low.without)} | ${high.c.name} ${pts(high.with - high.without)} | ${dec(fires / fights)} | ${dec(bare)} → ${dec(turns / 2 / fights)} |`,
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
