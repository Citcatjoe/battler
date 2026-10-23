/*
 * Mesure de la campagne : `npm run campaign` (CAMPAIGN_RUNS parties par champion, 12 par défaut). Chaque partie se joue
 * en pilote automatique, comme le champion de référence : un adversaire au hasard parmi ceux du nœud, la récompense du
 * choix par défaut. Donne, par champion, la profondeur moyenne, la part de parties qui atteignent le boss et
 * qui gagnent l'acte, la chance moyenne estimée avant chaque combat (bandes de danger) et la durée des combats (tours par
 * combattant). Par nœud : « le build se voit-il ? » (chaque combat normal rejoué sur la même graine par le champion nu,
 * sans forge ni relique : l'écart de victoire est l'apport du build) et la durée. Écrit dans logs/campaign/.
 * Méthode et lecture : docs/CAMPAGNE.md § 18, docs/PROGRESSION.md § 3.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { hashSeed } from '../src/game/analysis'
import { ACT_FIGHTS, BOSS_TARGET, championOf, encountersFor, NORMAL_TARGETS, opponentOf, referenceChampions, REWARDS, rewardChoice, startRun, withFightResult, withReward, type CampaignRun } from '../src/game/campaign'
import { simulateCombat } from '../src/game/combat'
import { buildLinks } from '../src/game/hooks'
import { pick, seededRng } from '../src/game/rng'
import { CHARACTER_IDS, createCharacter, repertoireOf } from '../src/game/roster'
import pkg from '../package.json' with { type: 'json' }

const RUNS = Number(process.env.CAMPAIGN_RUNS ?? 12)
const pct = (x: number) => `${Math.round(x * 100)} %`
/** Tours par combattant : un tour du combat est l'action d'un seul des deux */
const perFighter = (turns: number, fights: number) => (fights ? (turns / fights / 2).toFixed(1).replace('.', ',') : '—')

it('mesure de la campagne (pilote automatique)', () => {
  const rows: string[] = []
  let all = { runs: 0, boss: 0, won: 0 }
  // Par nœud normal, tous champions : victoires du champion construit, du même nu, tours de chacun
  const nodes = Array.from({ length: ACT_FIGHTS }, () => ({ fights: 0, built: 0, naked: 0, turns: 0, nakedTurns: 0 }))
  const boss = { fights: 0, turns: 0 }
  for (const id of CHARACTER_IDS) {
    const tally = { depth: 0, boss: 0, won: 0, chance: 0, fights: 0, turns: 0 }
    for (let k = 0; k < RUNS; k++) {
      const rng = seededRng(hashSeed(`mesure:${id}:${k}`))
      let run: CampaignRun = startRun(id, hashSeed(`partie:${id}:${k}`))
      while (!run.outcome) {
        const encounter = pick(rng, encountersFor(run))
        tally.chance += encounter.chance
        tally.fights++
        if (encounter.boss) tally.boss++
        const seed = hashSeed(`combat:${id}:${k}:${run.wins}`)
        const opponent = opponentOf(encounter)
        const result = simulateCombat([championOf(run), opponent], { seed })
        tally.turns += result.turns
        if (encounter.boss) {
          boss.fights++
          boss.turns += result.turns
        } else {
          const naked = simulateCombat([createCharacter(id), opponent], { seed })
          const node = nodes[run.wins]
          node.fights++
          node.built += result.winner === 0 ? 1 : 0
          node.naked += naked.winner === 0 ? 1 : 0
          node.turns += result.turns
          node.nakedTurns += naked.turns
        }
        run = withFightResult(run, encounter, result)
        if (run.reward) run = withReward(run, rewardChoice(run.reward))
      }
      tally.depth += run.wins
      if (run.outcome === 'won') tally.won++
    }
    all = { runs: all.runs + RUNS, boss: all.boss + tally.boss, won: all.won + tally.won }
    rows.push(
      `| ${createCharacter(id).name} | ${(tally.depth / RUNS).toFixed(1)} | ${pct(tally.boss / RUNS)} | ${pct(tally.won / RUNS)} | ${pct(tally.chance / tally.fights)} | ${perFighter(tally.turns, tally.fights)} |`,
    )
  }
  // Les builds d'un acte complet (`REWARDS`), tirés comme le champion de référence : sans combat, ils ne
  // mesurent que l'offre. Diversité (compétences gravées distinctes) et cohérence (paires de briques qui se nourrissent)
  const builds = CHARACTER_IDS.map((id) => {
    const all = Array.from({ length: 10 }, (_, s) => referenceChampions(id, ACT_FIGHTS, hashSeed(`builds:${id}:${s}`))).flat()
    const engraved = all.map((c) => c.forge.flatMap((f) => (f.op === 'engrave' ? [f.skill.id] : [])))
    const own = new Set(repertoireOf(id).map((e) => e.id))
    const flat = engraved.flat()
    const links = all.map(buildLinks)
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
    return {
      line: `| ${createCharacter(id).name} | ${all.length} | ${mean(engraved.map((e) => e.length)).toFixed(2).replace('.', ',')} | ${flat.length ? pct(flat.filter((s) => own.has(s)).length / flat.length) : '—'} | ${new Set(flat).size} | ${mean(links.map((l) => l.linked)).toFixed(2).replace('.', ',')} | ${pct(mean(links.map((l) => l.linked / Math.max(1, l.pairs))))} |`,
      linked: mean(links.map((l) => l.linked)),
    }
  })
  const expected = NORMAL_TARGETS.reduce((p, t) => p * t, 1)
  const out = [
    `# Campagne · règles ${pkg.version} · ${RUNS} parties par champion, pilote automatique`,
    '',
    `Courbe nominale : ${NORMAL_TARGETS.map(pct).join(', ')} aux combats normaux, ${pct(BOSS_TARGET)} contre le boss. Attendu pour le champion de référence : boss atteint ${pct(expected)}, acte gagné ${pct(expected * BOSS_TARGET)}.`,
    `Mesuré, tous champions : boss atteint ${pct(all.boss / all.runs)}, acte gagné ${pct(all.won / all.runs)} (${all.runs} parties).`,
    '',
    '| Champion | Victoires moyennes | Atteint le boss | Gagne l’acte | Chance moyenne avant combat | Tours par combattant |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    '## Le build se voit-il ? (par nœud, tous champions)',
    '',
    'Chaque combat normal est rejoué sur la même graine par le champion nu (sans forge ni relique), contre le même adversaire aux PV réglés. Au premier nœud, le champion est encore nu : l’écart y est nul par construction.',
    '',
    '| Nœud | Récompenses reçues | Combats | Victoires construit | Victoires nu | Apport du build | Tours par combattant (construit) | Tours par combattant (nu) |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...nodes.map(
      (n, i) =>
        `| ${i + 1} | ${i} | ${n.fights} | ${pct(n.built / n.fights)} | ${pct(n.naked / n.fights)} | ${Math.round(((n.built - n.naked) / n.fights) * 100)} points | ${perFighter(n.turns, n.fights)} | ${perFighter(n.nakedTurns, n.fights)} |`,
    ),
    `| Boss | ${ACT_FIGHTS} | ${boss.fights} | | | | ${perFighter(boss.turns, boss.fights)} | |`,
    '',
    '## Les builds d’un acte complet (offre et choix par défaut, sans combat)',
    '',
    `${REWARDS.length} récompenses, tirées comme pour le champion de référence, 120 builds par champion. Diversité : compétences gravées distinctes. « D'autres personnages » : part des gravures prises aux quatre compétences de son répertoire (le reste vient des compétences que sa signature seule a quittées). Cohérence : paires de briques du build (compétences, gravures, reliques) qui se nourrissent selon leurs accroches (hooks.ts). Moyenne, tous champions : ${(builds.reduce((s, b) => s + b.linked, 0) / builds.length).toFixed(2).replace('.', ',')} paires liées par build.`,
    '',
    "| Champion | Builds | Gravures par build | D'autres personnages | Compétences gravées distinctes | Paires liées par build | Part des paires liées |",
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...builds.map((b) => b.line),
  ].join('\n')
  console.log(out)
  mkdirSync('logs/campaign', { recursive: true })
  writeFileSync(`logs/campaign/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}_campagne.md`, `${out}\n`)
}, 3_600_000)
