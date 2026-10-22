/*
 * Mesure de la campagne : `npm run campaign` (CAMPAIGN_RUNS parties par champion, 12 par défaut). Chaque partie se joue
 * en pilote automatique, comme le champion de référence : un adversaire au hasard parmi ceux du nœud, la récompense du
 * choix par défaut. Donne, par champion, la profondeur moyenne, la part de parties qui atteignent le boss et
 * qui gagnent l'acte, et la chance moyenne estimée avant chaque combat (bandes de danger). Écrit dans logs/campaign/.
 * Méthode et lecture : docs/CAMPAGNE.md § 18.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { hashSeed } from '../src/game/analysis'
import { BOSS_TARGET, championOf, encountersFor, NORMAL_TARGETS, opponentOf, rewardChoice, startRun, withFightResult, withReward, type CampaignRun } from '../src/game/campaign'
import { simulateCombat } from '../src/game/combat'
import { pick, seededRng } from '../src/game/rng'
import { CHARACTER_IDS, createCharacter } from '../src/game/roster'
import pkg from '../package.json' with { type: 'json' }

const RUNS = Number(process.env.CAMPAIGN_RUNS ?? 12)
const pct = (x: number) => `${Math.round(x * 100)} %`

it('mesure de la campagne (pilote automatique)', () => {
  const rows: string[] = []
  let all = { runs: 0, boss: 0, won: 0 }
  for (const id of CHARACTER_IDS) {
    const tally = { depth: 0, boss: 0, won: 0, chance: 0, fights: 0 }
    for (let k = 0; k < RUNS; k++) {
      const rng = seededRng(hashSeed(`mesure:${id}:${k}`))
      let run: CampaignRun = startRun(id, hashSeed(`partie:${id}:${k}`))
      while (!run.outcome) {
        const encounter = pick(rng, encountersFor(run))
        tally.chance += encounter.chance
        tally.fights++
        if (encounter.boss) tally.boss++
        const result = simulateCombat([championOf(run), opponentOf(encounter)], { seed: hashSeed(`combat:${id}:${k}:${run.wins}`) })
        run = withFightResult(run, encounter, result)
        if (run.reward) run = withReward(run, rewardChoice(run.reward))
      }
      tally.depth += run.wins
      if (run.outcome === 'won') tally.won++
    }
    all = { runs: all.runs + RUNS, boss: all.boss + tally.boss, won: all.won + tally.won }
    rows.push(`| ${createCharacter(id).name} | ${(tally.depth / RUNS).toFixed(1)} | ${pct(tally.boss / RUNS)} | ${pct(tally.won / RUNS)} | ${pct(tally.chance / tally.fights)} |`)
  }
  const expected = NORMAL_TARGETS.reduce((p, t) => p * t, 1)
  const out = [
    `# Campagne · règles ${pkg.version} · ${RUNS} parties par champion, pilote automatique`,
    '',
    `Courbe nominale : ${NORMAL_TARGETS.map(pct).join(', ')} aux combats normaux, ${pct(BOSS_TARGET)} contre le boss. Attendu pour le champion de référence : boss atteint ${pct(expected)}, acte gagné ${pct(expected * BOSS_TARGET)}.`,
    `Mesuré, tous champions : boss atteint ${pct(all.boss / all.runs)}, acte gagné ${pct(all.won / all.runs)} (${all.runs} parties).`,
    '',
    '| Champion | Victoires moyennes | Atteint le boss | Gagne l’acte | Chance moyenne avant combat |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n')
  console.log(out)
  mkdirSync('logs/campaign', { recursive: true })
  writeFileSync(`logs/campaign/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}_campagne.md`, `${out}\n`)
}, 3_600_000)
