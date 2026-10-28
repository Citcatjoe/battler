/*
 * Mesure de la campagne : `npm run campaign` (CAMPAIGN_RUNS parties par champion, 12 par défaut ; CAMPAIGN_SEEDS=b pour
 * un autre jeu de graines, CAMPAIGN_TAG pour nommer le rapport, CAMPAIGN_BUILD_N combats par duel des builds). Chaque
 * partie se joue en pilote automatique, comme le champion de référence : un adversaire au hasard parmi ceux du nœud, la
 * récompense du choix par défaut. Donne, par champion, la profondeur moyenne, la part de parties qui atteignent le boss
 * et qui gagnent l'acte, la chance estimée avant chaque combat (bandes de danger ; aux nœuds 1-2 et 3-10, et contre les
 * combats normaux réellement gagnés), la part d'adversaires au plancher des PV et la durée des combats (tours par
 * combattant). Par nœud : « le build se voit-il ? » (chaque combat normal rejoué sur la même graine par le champion nu,
 * sans forge ni relique : l'écart de victoire est l'apport du build), la durée et les PV des adversaires réglés (moyenne
 * et plus bas, en part de leurs PV de base). Les builds d'un acte complet (offre seule) : gravures, paires liées, force
 * contre les builds des autres. Les briques des deux lots de la phase 8 : actes où chacune est offerte et prise, et la
 * part prise quand elle est offerte. Écrit dans logs/campaign/.
 * Méthode et lecture : docs/CAMPAGNE.md § 18, docs/PROGRESSION.md § 3.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { hashSeed, winRate } from '../src/game/analysis'
import { ACT_FIGHTS, BOSS_HP_CEILING, BOSS_TARGET, championOf, EARLY_HP_FLOOR, encountersFor, HP_FLOOR, hpFloorOf, NORMAL_TARGETS, OPPONENT_LAG, opponentOf, rewardChoice, startRun, withFightResult, withReward, type CampaignRun } from '../src/game/campaign'
import { drawReward, forgesLeftIn, MAX_SKILL_FACES, REWARDS, type PendingReward } from '../src/game/offers'
import { simulateCombat } from '../src/game/combat'
import { forgedFaces, withForgeStep, type ForgeStep } from '../src/game/forge'
import { buildLinks } from '../src/game/hooks'
import { getRelic } from '../src/game/relics'
import { pick, seededRng } from '../src/game/rng'
import { masteryOfSkill } from '../src/game/masteries'
import { ALL_SKILLS, CHARACTER_IDS, createCharacter } from '../src/game/roster'
import pkg from '../package.json' with { type: 'json' }

const RUNS = Number(process.env.CAMPAIGN_RUNS ?? 12)
/** Un autre jeu de graines (CAMPAIGN_SEEDS=b) : à 30 parties, l'écart par champion se lit contre le bruit des graines */
const SEEDS = process.env.CAMPAIGN_SEEDS ? `:${process.env.CAMPAIGN_SEEDS}` : ''
/** Combats par duel pour la force d'un build d'acte contre le roster nu */
const BUILD_N = Number(process.env.CAMPAIGN_BUILD_N ?? 20)
const pct = (x: number) => `${Math.round(x * 100)} %`
/** Tours par combattant : un tour du combat est l'action d'un seul des deux */
const perFighter = (turns: number, fights: number) => (fights ? (turns / fights / 2).toFixed(1).replace('.', ',') : '—')

/**
 * Les briques des deux lots de la phase 8 (SORTS.md § 22 et § 23, RELIQUES.md § 15) : sont-elles offertes, et prises par
 * le choix par défaut, dans la progression ?
 */
const LOT_SKILLS: Record<string, string> = {
  quarry: '1',
  harvest: '1',
  virulence: '1',
  sentence: '1',
  grudge: '1',
  conflagration: '2',
  'loaded-die': '2',
  vendetta: '2',
  'guard-break': '3',
  jinx: '3',
  blinding: '3',
  hemorrhage: '3',
  'seal-theft': '3',
  feint: '3',
  stoke: '3',
  'storm-sky': '3',
  'blood-frenzy': '3',
  'stunning-blow': '3',
}
const LOT_RELICS: readonly string[] = ['forge-bellows', 'pavise-nails', 'talion-gauntlet', 'holed-coin']
const LOT_BRICKS: readonly string[] = [...Object.keys(LOT_SKILLS), ...LOT_RELICS]
/** Les briques des lots dans une offre, et celle que le choix par défaut a prise */
function lotBricks(reward: PendingReward): { offered: string[]; taken?: string } {
  if (reward.kind === 'relic') {
    return { offered: reward.offer.filter((id) => LOT_RELICS.includes(id)), taken: reward.choice && LOT_RELICS.includes(reward.choice) ? reward.choice : undefined }
  }
  const offered = reward.offer.flatMap((o) => (o.op === 'engrave' ? o.skills.flatMap((s) => (s.id in LOT_SKILLS ? [s.id] : [])) : []))
  const step = reward.choice
  return { offered, taken: step?.op === 'engrave' && step.skill.id in LOT_SKILLS ? step.skill.id : undefined }
}

/**
 * Un acte complet tiré comme le champion de référence (`drawBuild` de campaign.ts, mêmes graines que
 * `referenceChampions`, l'aura par défaut), avec ses offres : la mesure de l'offre seule.
 */
function actBuild(championId: string, seed: number, v: number) {
  const aura = createCharacter(championId).definition.auras[0]
  const rng = seededRng(hashSeed(`campagne:${seed}:${aura}:reference:${v}`))
  const def = createCharacter(championId).definition
  let forge: ForgeStep[] = []
  const relics: string[] = []
  const rewards: PendingReward[] = []
  for (const [index, kind] of REWARDS.entries()) {
    const reward = drawReward({ championId, forge, relics }, kind, rng, forgesLeftIn(REWARDS, index))
    rewards.push(reward)
    if (reward.kind === 'forge' && reward.choice) forge = withForgeStep(def, forge, reward.choice)
    if (reward.kind === 'relic' && reward.choice) relics.push(reward.choice)
  }
  return { champion: championOf({ championId, forge, relics }), rewards }
}

it('mesure de la campagne (pilote automatique)', () => {
  const rows: string[] = []
  let all = { runs: 0, boss: 0, won: 0 }
  // Par nœud normal, tous champions : victoires du champion construit, du même nu, tours de chacun, PV des adversaires
  // réglés (part de leurs PV de base : somme, plus bas, rencontres proposées sous 75 %)
  const nodes = Array.from({ length: ACT_FIGHTS }, () => ({ fights: 0, built: 0, naked: 0, turns: 0, nakedTurns: 0, hp: 0, hpMin: Infinity }))
  // Rencontres dont le retard s'est allongé au plancher (`tunedOpponent`) et récompenses rendues
  const offered = { count: 0, hp: 0, hpMin: Infinity, under: 0, stripped: 0, returned: 0 }
  const boss = { fights: 0, turns: 0 }
  // Les briques des lots dans les parties : offres où elles figurent, et prises par le choix par défaut
  const inRuns = Object.fromEntries(LOT_BRICKS.map((b) => [b, { offered: 0, taken: 0 }]))
  // Chaque champion, parti de chacune de ses auras de départ (docs/MAITRISES.md § 5) : `RUNS` parties par aura
  for (const [id, aura] of CHARACTER_IDS.flatMap((id) => createCharacter(id).definition.auras.map((a) => [id, a] as const))) {
    // Chance avant combat aux nœuds 1-2 (le plancher des PV y retient la courbe) et 3-10 ; adversaires normaux au plancher
    const tally = { depth: 0, boss: 0, won: 0, bossHp: 0, chance: 0, fights: 0, turns: 0, early: [0, 0], late: [0, 0], floor: 0, normals: 0, normalWins: 0 }
    for (let k = 0; k < RUNS; k++) {
      const rng = seededRng(hashSeed(`mesure:${id}:${aura}:${k}${SEEDS}`))
      let run: CampaignRun = startRun(id, hashSeed(`partie:${id}:${k}${SEEDS}`), undefined, aura)
      while (!run.outcome) {
        const encounters = encountersFor(run)
        for (const e of encounters.filter((x) => !x.boss)) {
          const share = e.maxHp / createCharacter(e.characterId).baseStats.maxHp
          offered.count++
          offered.hp += share
          offered.hpMin = Math.min(offered.hpMin, share)
          if (share < 0.75) offered.under++
          const returned = Math.max(0, run.wins - OPPONENT_LAG) - e.forge.length - e.relics.length
          offered.stripped += returned > 0 ? 1 : 0
          offered.returned += returned
        }
        const encounter = pick(rng, encounters)
        tally.chance += encounter.chance
        tally.fights++
        if (encounter.boss) {
          tally.boss++
          tally.bossHp += encounter.maxHp
        } else {
          const span = run.wins < 2 ? tally.early : tally.late
          span[0] += encounter.chance
          span[1]++
          tally.normals++
          if (encounter.maxHp === Math.ceil(createCharacter(encounter.characterId).baseStats.maxHp * hpFloorOf(encounter.forge.length + encounter.relics.length))) tally.floor++
        }
        const seed = hashSeed(`combat:${id}:${k}:${run.wins}${SEEDS}`)
        const opponent = opponentOf(encounter)
        const result = simulateCombat([championOf(run), opponent], { seed })
        tally.turns += result.turns
        if (encounter.boss) {
          boss.fights++
          boss.turns += result.turns
        } else {
          // Le même champion nu : le personnage vanilla, sans forge ni relique
          const naked = simulateCombat([createCharacter(id, { aura }), opponent], { seed })
          const node = nodes[run.wins]
          const hp = encounter.maxHp / createCharacter(encounter.characterId).baseStats.maxHp
          node.fights++
          node.built += result.winner === 0 ? 1 : 0
          tally.normalWins += result.winner === 0 ? 1 : 0
          node.naked += naked.winner === 0 ? 1 : 0
          node.turns += result.turns
          node.nakedTurns += naked.turns
          node.hp += hp
          node.hpMin = Math.min(node.hpMin, hp)
        }
        run = withFightResult(run, encounter, result)
        if (run.reward) {
          const lot = lotBricks(run.reward)
          for (const b of lot.offered) inRuns[b].offered++
          if (lot.taken) inRuns[lot.taken].taken++
          run = withReward(run, rewardChoice(run.reward))
        }
      }
      tally.depth += run.wins
      if (run.outcome === 'won') tally.won++
    }
    all = { runs: all.runs + RUNS, boss: all.boss + tally.boss, won: all.won + tally.won }
    const start = createCharacter(id, { aura }).events.map((e) => e.name).join(', ') || 'six faces nues'
    rows.push(
      `| ${createCharacter(id).name} | ${ALL_SKILLS.find((e) => e.id === aura)?.name ?? aura} | ${start} | ${(tally.depth / RUNS).toFixed(1)} | ${pct(tally.boss / RUNS)} | ${pct(tally.won / RUNS)} | ${tally.boss ? pct(tally.won / tally.boss) : '—'} | ${tally.boss ? Math.round(tally.bossHp / tally.boss) : '—'} | ${pct(tally.chance / tally.fights)} | ${pct(tally.early[0] / tally.early[1])} | ${pct(tally.late[0] / tally.late[1])} | ${pct((tally.early[0] + tally.late[0]) / tally.normals)} → ${pct(tally.normalWins / tally.normals)} | ${pct(tally.floor / tally.normals)} | ${perFighter(tally.turns, tally.fights)} |`,
    )
  }
  // Les builds d'un acte complet (`REWARDS`), tirés comme le champion de référence : sans combat, ils ne
  // mesurent que l'offre. Diversité (compétences gravées distinctes) et cohérence (paires de briques qui se nourrissent).
  // Les briques des lots : part des actes où chacune est offerte au moins une fois, et prise.
  const inActs = Object.fromEntries(LOT_BRICKS.map((b) => [b, CHARACTER_IDS.map(() => ({ offered: 0, taken: 0 }))]))
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
  const actsOf = CHARACTER_IDS.map((id) => Array.from({ length: 10 }, (_, s) => Array.from({ length: 12 }, (_, v) => actBuild(id, hashSeed(`builds:${id}:${s}`), v))).flat())
  const builds = CHARACTER_IDS.map((id, c) => {
    const acts = actsOf[c]
    const all = acts.map((a) => a.champion)
    const engraved = all.map((ch) => ch.forge.flatMap((f) => (f.op === 'engrave' ? [f.skill.id] : [])))
    // Faces de compétence en fin d'acte (aura et signature comprises), et part des dés complets (A9, 2026-10-28)
    const cap = createCharacter(id).definition.skillFaces ?? MAX_SKILL_FACES
    const faces = all.map((ch) => forgedFaces(ch.definition, ch.forge).filter((f) => f.origin.length > 0 || f.engraved).length)
    // Les gravures de sa première maîtrise (V3 : l'offre ne verrouille rien, une compétence de chaque maîtrise)
    const first = createCharacter(id).definition.masteries[0]
    const flat = engraved.flat()
    const links = all.map(buildLinks)
    const lots = acts.map((a) => a.rewards.map(lotBricks))
    for (const act of lots) {
      for (const b of new Set(act.flatMap((r) => r.offered))) inActs[b][c].offered++
      for (const b of new Set(act.flatMap((r) => (r.taken ? [r.taken] : [])))) inActs[b][c].taken++
    }
    const lotOffered = lots.filter((act) => act.some((r) => r.offered.length)).length
    const lotTaken = lots.map((act) => act.filter((r) => r.taken).length)
    // La force d'un build d'acte, comme en saison : chacun des 24 premiers contre le build de même rang des autres
    // champions ; et son écart-type d'un build à l'autre (un build fort qui reste fort enchaîne les nœuds)
    const rates = all.slice(0, 24).map((ch, b) => winRate(ch, actsOf.map((x) => x[b].champion), BUILD_N))
    const rate = mean(rates)
    const spread = Math.sqrt(mean(rates.map((r) => (r - rate) ** 2)))
    return {
      line: `| ${createCharacter(id).name} | ${all.length} | ${mean(engraved.map((e) => e.length)).toFixed(2).replace('.', ',')} | ${mean(faces).toFixed(2).replace('.', ',')} / ${cap} (${pct(faces.filter((n) => n >= cap).length / faces.length)}) | ${flat.length ? pct(flat.filter((s) => masteryOfSkill(s) === first).length / flat.length) : '—'} | ${new Set(flat).size} | ${mean(links.map((l) => l.linked)).toFixed(2).replace('.', ',')} | ${pct(mean(links.map((l) => l.linked / Math.max(1, l.pairs))))} | ${pct(rate)} ± ${Math.round(spread * 100)} | ${pct(lotOffered / acts.length)} | ${pct(lotTaken.filter((n) => n > 0).length / acts.length)} | ${mean(lotTaken).toFixed(2).replace('.', ',')} |`,
      linked: mean(links.map((l) => l.linked)),
    }
  })
  const brickRows = LOT_BRICKS.map((b) => {
    const seers = CHARACTER_IDS.flatMap((id, c) => (inActs[b][c].offered ? [`${createCharacter(id).name} ${pct(inActs[b][c].offered / 120)} / ${pct(inActs[b][c].taken / 120)}`] : []))
    const name = b in LOT_SKILLS ? ALL_SKILLS.find((e) => e.id === b)!.name : getRelic(b).name
    const lot = b in LOT_SKILLS ? `${LOT_SKILLS[b]}, gravure` : '2, relique'
    const r = inRuns[b]
    return `| ${name} | ${lot} | ${seers.join(' ; ') || 'personne'} | ${r.offered} | ${r.taken} | ${r.offered ? pct(r.taken / r.offered) : '—'} |`
  })
  const expected = NORMAL_TARGETS.reduce((p, t) => p * t, 1)
  const out = [
    `# Campagne · règles ${pkg.version} · ${RUNS} parties par champion, pilote automatique`,
    '',
    `Courbe nominale : ${NORMAL_TARGETS.map(pct).join(', ')} aux combats normaux, ${pct(BOSS_TARGET)} contre le boss. Attendu pour le champion de référence : boss atteint ${pct(expected)}, acte gagné ${pct(expected * BOSS_TARGET)}.`,
    `Départ : le personnage vanilla parti de chacune de ses auras de départ (l'aura sur le 1, sa compétence sur le 2 ; docs/MAITRISES.md § 5), le champion de référence parti de la même aura ; ${MAX_SKILL_FACES} faces de compétence au plus. Adversaire normal : PV réglés, jamais sous ${pct(EARLY_HP_FLOOR)} de ses PV de base nu, ${pct(HP_FLOOR)} construit ; construit avec ${OPPONENT_LAG} récompense${OPPONENT_LAG > 1 ? 's' : ''} de retard sur le champion, une de plus chaque fois que le plancher arrête son réglage. Boss : PV réglés jusqu'à ${BOSS_HP_CEILING} fois sa base.`,
    `Mesuré, tous champions : boss atteint ${pct(all.boss / all.runs)}, acte gagné ${pct(all.won / all.runs)} (${all.runs} parties).`,
    `PV des adversaires normaux proposés (${offered.count} rencontres), en part de leurs PV de base : au plus bas ${pct(offered.hpMin)}, en moyenne ${pct(offered.hp / offered.count)} ; ${offered.under} sous 75 %. Retard allongé au plancher : ${offered.stripped} rencontres, ${offered.returned} récompenses rendues.`,
    '',
    '| Champion | Aura de départ | Départ (1, 2) | Victoires moyennes | Atteint le boss | Gagne l’acte | Bat le boss (atteint) | PV du boss (moyenne) | Chance moyenne avant combat | Chance aux nœuds 1-2 | Chance aux nœuds 3-10 | Combats normaux : chance estimée → gagnés | Adversaires au plancher des PV | Tours par combattant |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    '## Le build se voit-il ? (par nœud, tous champions)',
    '',
    'Chaque combat normal est rejoué sur la même graine par le champion nu (le personnage vanilla, sans forge ni relique), contre le même adversaire. Au premier nœud, le champion est encore nu : l’écart y est nul par construction. PV de l’adversaire : ses PV réglés, en part de ses PV de base (moyenne et plus bas).',
    '',
    '| Nœud | Récompenses reçues | Combats | Victoires construit | Victoires nu | Apport du build | Tours par combattant (construit) | Tours par combattant (nu) | PV de l’adversaire | Au plus bas |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...nodes.map(
      (n, i) =>
        `| ${i + 1} | ${i} | ${n.fights} | ${pct(n.built / n.fights)} | ${pct(n.naked / n.fights)} | ${Math.round(((n.built - n.naked) / n.fights) * 100)} points | ${perFighter(n.turns, n.fights)} | ${perFighter(n.nakedTurns, n.fights)} | ${pct(n.hp / n.fights)} | ${pct(n.hpMin)} |`,
    ),
    `| Boss | ${ACT_FIGHTS} | ${boss.fights} | | | | ${perFighter(boss.turns, boss.fights)} | | | |`,
    '',
    '## Les builds d’un acte complet (offre et choix par défaut, sans combat)',
    '',
    `${REWARDS.length} récompenses, tirées comme pour le champion de référence (aura par défaut), 120 builds par champion. Diversité : compétences gravées distinctes. « Première maîtrise » : part des gravures prises à sa première maîtrise (le reste vient de la seconde ; Graver propose une compétence de chacune, le choix par défaut au hasard). Cohérence : paires de briques du build (compétences, gravures, reliques) qui se nourrissent selon leurs accroches (hooks.ts). Moyenne, tous champions : ${(builds.reduce((s, b) => s + b.linked, 0) / builds.length).toFixed(2).replace('.', ',')} paires liées par build. Briques des lots : les ${LOT_BRICKS.length} briques de la phase 8 (les trois lots) ; part des actes où l'une au moins est offerte, où l'une au moins est prise, et briques prises par acte.`,
    '',
    `| Champion | Builds | Gravures par build | Faces de compétence en fin d'acte (dés complets) | Première maîtrise | Compétences gravées distinctes | Paires liées par build | Part des paires liées | Construit contre construits (24 tirages, ${BUILD_N} combats par duel ; ± écart-type d'un build à l'autre) | Une brique des lots offerte | Une brique des lots prise | Briques des lots par build |`,
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...builds.map((b) => b.line),
    '',
    '## Les briques des lots dans la progression',
    '',
    `Actes complets (offre seule, 120 par champion) : par champion qui la voit, part des actes où elle est offerte au moins une fois / où elle est prise. Parties (${all.runs}, avec combats) : offres où elle figure, prises par le choix par défaut, et la part prise quand elle est offerte (au hasard dans l'offre : un tiers attendu, plus quand l'offre est plus courte).`,
    '',
    '| Brique | Lot | Actes : offerte / prise, par champion | Parties : offerte | Prise | Prise quand offerte |',
    '| --- | --- | --- | --- | --- | --- |',
    ...brickRows,
  ].join('\n')
  console.log(out)
  mkdirSync('logs/campaign', { recursive: true })
  const tag = process.env.CAMPAIGN_TAG ? `_${process.env.CAMPAIGN_TAG}` : ''
  writeFileSync(`logs/campaign/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}_campagne${tag}_${RUNS}.md`, `${out}\n`)
}, 3_600_000)
