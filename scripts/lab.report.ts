/*
 * Laboratoire des sorts : essaie des idées de compétences sur un personnage précis, sans rien livrer.
 *   npx vitest run --config vitest.balance.config.ts scripts/lab.report.ts --silent=false
 *   LAB_N=400 (combats par duel, défaut 200) · LAB_ONLY=gorak-colere,elaria-contre-tir (idées à essayer)
 *   LAB_SERIES=2 (une seule série d'essais)
 * Pour chaque idée (scripts/lab/ideas.ts) : le personnage modifié affronte tout le roster sur les mêmes
 * graines que `npm run balance` (hasard commun), avant et après. Le rapport donne l'effet sur la victoire
 * ET sur le spectacle (changements de meneur, retours, fins serrées, moments), puis passe chaque
 * combat à l'audit de résolution. Écrit dans logs/lab/. Méthode : docs/SORTS.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { createAudit } from '../src/game/audit'
import type { Character } from '../src/game/character'
import type { CombatResult } from '../src/game/combat'
import { CHARACTERS } from '../src/game/roster'
import { STATUSES } from '../src/game/statuses'
import pkg from '../package.json' with { type: 'json' }
import { duelFight } from './lab/duel'
import { IDEAS, type LabIdea } from './lab/ideas'
import { momentsOf, presenceOf, spectacleOf } from './lab/spectacle'

// Statuts d'essai : ajoutés au registre pour la durée du laboratoire seulement (le moteur les lit par id)
for (const idea of IDEAS) Object.assign(STATUSES, idea.statuses ?? {})


interface Run {
  wins: number[]
  turns: number
  leadChanges: number
  comebacks: number
  close: number
  moments: number
  withMoment: number
  duels: Record<string, number>
  /** Présence du statut surveillé (`LabIdea.presence`) : ses actions, celles où il le porte, combats où il ne vient jamais */
  actions: number
  withStatus: number
  never: number
}

function run(me: Character, opponents: readonly Character[], perPair: number, idea: LabIdea, audit: (r: CombatResult) => void): Run {
  const out: Run = { wins: [], turns: 0, leadChanges: 0, comebacks: 0, close: 0, moments: 0, withMoment: 0, duels: {}, actions: 0, withStatus: 0, never: 0 }
  for (const opp of opponents) {
    if (opp.id === me.id) continue
    let duelWins = 0
    for (let k = 0; k < perPair; k++) {
      const { result, side } = duelFight(me, opp, k)
      audit(result)
      const won = result.winner === side ? 1 : 0
      out.wins.push(won)
      duelWins += won
      out.turns += result.turns
      const s = spectacleOf(result)
      out.leadChanges += s.leadChanges
      if (s.comeback) out.comebacks++
      if (s.closeFinish) out.close++
      const m = momentsOf(result, side, idea.watch)
      out.moments += m
      if (m > 0) out.withMoment++
      if (idea.presence) {
        const p = presenceOf(result, side, idea.presence)
        out.actions += p.actions
        out.withStatus += p.withStatus
        if (!p.ever) out.never++
      }
    }
    out.duels[opp.name] = duelWins / perPair
  }
  return out
}

/** Le « avant » d'un personnage dans un monde donné ne dépend pas de l'idée : il se calcule une fois (règles pour tous) */
const befores = new Map<string, Run>()
const worldKeys = new Map<LabIdea['world'], number>()

const pct = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')} %`
const num = (x: number, d = 1) => x.toFixed(d).replace('.', ',')
const signed = (x: number, d = 1) => `${x >= 0 ? '+' : '−'}${num(Math.abs(x), d)}`

function compare(idea: LabIdea, perPair: number) {
  const base = CHARACTERS.find((c) => c.id === idea.character)
  if (!base) throw new Error(`Idée ${idea.id} : personnage inconnu (${idea.character})`)
  const { audit, problems } = createAudit()
  // Règle du monde (`world`) : tout le roster la porte, avant comme après ; règle pour tous (`everyone`) : les adversaires
  // reçoivent aussi l'idée, après seulement
  const world = idea.world ?? ((c: Character) => c)
  const others = CHARACTERS.map(world)
  if (!worldKeys.has(idea.world)) worldKeys.set(idea.world, worldKeys.size)
  const key = `${idea.character}|${worldKeys.get(idea.world)}|${idea.presence ?? ''}|${idea.watch.join()}`
  const before = befores.get(key) ?? run(world(base), others, perPair, idea, audit)
  befores.set(key, before)
  const after = run(idea.apply(world(base)), idea.everyone ? others.map(idea.apply) : others, perPair, idea, audit)
  const n = before.wins.length
  // Écart apparié (mêmes graines) : moyenne et marge à 95 % des différences combat par combat
  const diffs = after.wins.map((w, i) => w - before.wins[i])
  const mean = diffs.reduce((a, b) => a + b, 0) / n
  const sd = Math.sqrt(diffs.reduce((a, d) => a + (d - mean) ** 2, 0) / Math.max(n - 1, 1))
  const rate = (r: Run) => r.wins.reduce((a, b) => a + b, 0) / n
  // Pire duel après l'idée, avec sa valeur avant : extrême seulement s'il dépasse 65/35 au-delà de sa marge
  const [opp, rateAfter] = Object.entries(after.duels).sort((x, y) => Math.abs(y[1] - 0.5) - Math.abs(x[1] - 0.5))[0] ?? []
  const worst = opp === undefined ? undefined : { opp, before: before.duels[opp], after: rateAfter, extreme: Math.abs(rateAfter - 0.5) - 1.96 * Math.sqrt((rateAfter * (1 - rateAfter)) / perPair) > 0.15 }
  return {
    idea,
    base,
    n,
    before: rate(before),
    after: rate(after),
    delta: mean,
    margin: (1.96 * sd) / Math.sqrt(n),
    worst,
    turns: [before.turns / n, after.turns / n],
    leads: [before.leadChanges / n, after.leadChanges / n],
    comebacks: [before.comebacks / n, after.comebacks / n],
    close: [before.close / n, after.close / n],
    moments: after.moments / n,
    withMoment: after.withMoment / n,
    presence: idea.presence ? { share: [before.withStatus / before.actions, after.withStatus / after.actions], never: [before.never / n, after.never / n] } : undefined,
    problems: [...problems.entries()],
  }
}

it('laboratoire des sorts', () => {
  const perPair = Number(process.env.LAB_N ?? 200)
  const only = process.env.LAB_ONLY?.split(',').map((s) => s.trim()).filter(Boolean)
  const series = process.env.LAB_SERIES ? Number(process.env.LAB_SERIES) : undefined
  const wanted = IDEAS.filter((i) => (!only?.length || only.includes(i.id)) && (series === undefined || i.series === series))
  // Les idées des jumeaux retirés en 0.43.0 (Murzug, Sylwen…) restent dans ideas.ts pour l'historique, sans être rejouées
  const ideas = wanted.filter((i) => CHARACTERS.some((c) => c.id === i.character))
  const skipped = wanted.filter((i) => !ideas.includes(i))
  if (skipped.length) console.log(`Idées ignorées (personnage retiré) : ${skipped.map((i) => i.id).join(', ')}`)
  const rows = ideas.map((i) => compare(i, perPair))

  const verdict = (r: (typeof rows)[number]) => {
    const flags: string[] = []
    if (r.after < 0.42 || r.after > 0.58) flags.push('hors budget')
    if (r.worst?.extreme) flags.push('duel extrême')
    if (Math.abs(r.delta) <= r.margin) flags.push('effet non significatif')
    if (r.withMoment < 0.3) flags.push('rare à l’écran')
    if (r.problems.length) flags.push('AUDIT')
    return flags.join(', ') || 'à considérer'
  }

  const spread = (xs: number[]) => {
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length
    return { min: Math.min(...xs), max: Math.max(...xs), sd: Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length) }
  }
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  // Règles pour tous (`everyone`) : une ligne par règle (son `pitch`), sur tous les personnages qui la reçoivent
  const rules = [...new Set(rows.filter((r) => r.idea.everyone).map((r) => r.idea.pitch))].map((pitch) => {
    const of = rows.filter((r) => r.idea.everyone && r.idea.pitch === pitch)
    const withPresence = of.filter((r) => r.presence)
    return {
      pitch,
      before: spread(of.map((r) => r.before)),
      after: spread(of.map((r) => r.after)),
      worst: Math.max(...of.map((r) => (r.worst ? Math.abs(r.worst.after - 0.5) + 0.5 : 0.5))),
      turns: [avg(of.map((r) => r.turns[0])), avg(of.map((r) => r.turns[1]))],
      presence: withPresence.length ? [avg(withPresence.map((r) => r.presence!.share[0])), avg(withPresence.map((r) => r.presence!.share[1]))] : undefined,
      never: withPresence.length ? [avg(withPresence.map((r) => r.presence!.never[0])), avg(withPresence.map((r) => r.presence!.never[1]))] : undefined,
    }
  })

  const text = [
    `# Laboratoire des sorts · règles ${pkg.version}`,
    ``,
    `${perPair} combats par duel, contre le reste du roster, mêmes graines avant et après. Rien n'est livré au jeu.`,
    `Δ : écart de taux de victoire, apparié combat par combat (± marge à 95 %). Meneur : vrais retournements par combat (le nouveau meneur a au moins 15 points de part de PV d'avance). Retours : part des combats gagnés après être passé sous 30 % de ses PV. Moments : déclenchements de l'idée par combat (et part des combats où elle se voit au moins une fois). Présence : part de ses actions où il porte le statut surveillé au moment d'agir, et part des combats où il ne le porte jamais.`,
    ``,
    ...(rules.length
      ? [
          `## Règles pour tous`,
          ``,
          `Chaque règle s'applique au personnage et à tous ses adversaires. Taux : du plus bas au plus haut, et écart-type entre personnages ; pire duel : le plus déséquilibré après la règle.`,
          ``,
          `| Règle | Taux avant | Taux après | Écart-type | Pire duel | Tours | Présence | Jamais |`,
          `| --- | --- | --- | --- | --- | --- | --- | --- |`,
          ...rules.map(
            (u) =>
              `| ${u.pitch} | ${pct(u.before.min)} – ${pct(u.before.max)} | **${pct(u.after.min)} – ${pct(u.after.max)}** | ${num(u.before.sd * 100)} → ${num(u.after.sd * 100)} pts | ${pct(u.worst)} | ${num(u.turns[0])} → ${num(u.turns[1])} | ${u.presence ? `${pct(u.presence[0])} → ${pct(u.presence[1])}` : '—'} | ${u.never ? `${pct(u.never[0])} → ${pct(u.never[1])}` : '—'} |`,
          ),
          ``,
        ]
      : []),
    ``,
    `## Victoire`,
    ``,
    `| Série | Idée | Personnage | Victoires | Δ | Pire duel après | Verdict |`,
    `| --- | --- | --- | --- | --- | --- | --- |`,
    ...rows.map(
      (r) =>
        `| ${r.idea.series} | ${r.idea.name} | ${r.base.name} | ${pct(r.before)} → **${pct(r.after)}** | ${signed(r.delta * 100)} ± ${num(r.margin * 100)} pts | ${r.worst ? `${r.worst.opp} ${pct(r.worst.before)} → ${pct(r.worst.after)}` : '—'} | ${verdict(r)} |`,
    ),
    ``,
    `## Spectacle`,
    ``,
    `| Idée | Tours | Meneur | Retours | Fins serrées | Moments | Présence (jamais) |`,
    `| --- | --- | --- | --- | --- | --- | --- |`,
    ...rows.map(
      (r) =>
        `| ${r.idea.name} | ${num(r.turns[0])} → ${num(r.turns[1])} | ${num(r.leads[0], 2)} → ${num(r.leads[1], 2)} | ${pct(r.comebacks[0])} → ${pct(r.comebacks[1])} | ${pct(r.close[0])} → ${pct(r.close[1])} | ${num(r.moments, 2)} (${pct(r.withMoment)}) | ${r.presence ? `${pct(r.presence.share[0])} → ${pct(r.presence.share[1])} (${pct(r.presence.never[0])} → ${pct(r.presence.never[1])})` : '—'} |`,
    ),
    ``,
    `## Fiches`,
    ``,
    ...rows.flatMap((r) => [
      `- **${r.idea.name}** (${r.base.name}, ${r.idea.schema}, ${r.idea.family}) : ${r.idea.pitch}`,
      ...r.problems.map(([kind, p]) => `  - audit : ${kind} ×${p.n}, par exemple ${p.example}`),
    ]),
  ].join('\n')

  mkdirSync('logs/lab', { recursive: true })
  const file = `logs/lab/${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}_v${pkg.version}.md`
  writeFileSync(file, `${text}\n`)
  console.log(`${text}\n\n→ ${file}`)
}, 1_800_000)
