/*
 * Mesure des synergies : `npm run synergy` (SYNERGY_N combats par duel, 200 par défaut ; environ 5 minutes). Pour chaque
 * personnage et chaque paire de reliques, l'écart à l'additivité en log-cote : L(AB) − L(A) − L(B) + L(∅), où
 * L(p) = ln(p / (1 − p)) et p le taux de victoire contre le roster nu, sur les mêmes graines (`winRate`). En points de
 * taux de victoire, la saturation près de 100 % ferait paraître toute paire négative : la log-cote est la bonne échelle.
 * Cible d'un lot de contenu : chaque brique a un partenaire au-delà de +0,25, aucune anti-synergie non voulue sous
 * −0,15. Écrit le rapport dans logs/synergy/ et l'affiche. Méthode et lecture : docs/PROGRESSION.md § 3 et P8.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { winRate } from '../src/game/analysis'
import { RELICS } from '../src/game/relics'
import { CHARACTERS } from '../src/game/roster'
import pkg from '../package.json' with { type: 'json' }

/** Cibles d'un lot (docs/PROGRESSION.md, P8) */
const PARTNER = 0.25
const CONFLICT = -0.15

/** Log-cote, bornée pour qu'un taux de 0 ou 100 % reste fini */
const logit = (p: number) => {
  const q = Math.min(0.999, Math.max(0.001, p))
  return Math.log(q / (1 - q))
}
const num = (x: number, digits = 2) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(digits).replace('.', ',')}`
const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length

it('rapport des synergies', () => {
  const perPair = Number(process.env.SYNERGY_N ?? 200)
  type Row = { a: string; b: string; who: string; logit: number; pts: number }
  const rows: Row[] = []
  for (const c of CHARACTERS) {
    const none = winRate(c, CHARACTERS, perPair)
    const alone = RELICS.map((r) => winRate(c.withRelics([r]), CHARACTERS, perPair))
    for (let i = 0; i < RELICS.length; i++)
      for (let j = i + 1; j < RELICS.length; j++) {
        const both = winRate(c.withRelics([RELICS[i], RELICS[j]]), CHARACTERS, perPair)
        rows.push({
          a: RELICS[i].name,
          b: RELICS[j].name,
          who: c.name,
          logit: logit(both) - logit(alone[i]) - logit(alone[j]) + logit(none),
          pts: (both - alone[i] - alone[j] + none) * 100,
        })
      }
  }

  const pairs = new Map<string, Row[]>()
  for (const r of rows) pairs.set(`${r.a} + ${r.b}`, [...(pairs.get(`${r.a} + ${r.b}`) ?? []), r])
  const byPair = [...pairs].map(([name, rs]) => ({ name, logit: mean(rs.map((r) => r.logit)), pts: mean(rs.map((r) => r.pts)) })).sort((x, y) => y.logit - x.logit)
  const strongest = [...rows].sort((x, y) => y.logit - x.logit)
  const line = (name: string, l: number, pts: number) => `| ${name} | ${num(l)} | ${num(pts, 1)} |`

  // Meilleur partenaire de chaque relique, sur un personnage précis : une relique sans partenaire vit seule
  const partners = RELICS.map((r) => {
    const own = rows.filter((x) => x.a === r.name || x.b === r.name)
    const best = own.reduce((m, x) => (x.logit > m.logit ? x : m))
    const worst = own.reduce((m, x) => (x.logit < m.logit ? x : m))
    const other = (x: Row) => (x.a === r.name ? x.b : x.a)
    return `| ${r.name} | ${other(best)} sur ${best.who} (${num(best.logit)}) | ${other(worst)} sur ${worst.who} (${num(worst.logit)}) | ${best.logit >= PARTNER ? 'oui' : '**non**'} |`
  })

  const out = [
    `# Synergies des reliques · version ${pkg.version}`,
    '',
    `${perPair} combats par duel contre les ${CHARACTERS.length} personnages nus, mêmes graines. Synergie : L(AB) − L(A) − L(B) + L(∅) en log-cote (0 : les deux reliques s'additionnent sans interagir) ; en points de victoire à titre indicatif. Cibles d'un lot : un partenaire au-delà de ${num(PARTNER)}, aucune anti-synergie non voulue sous ${num(CONFLICT)}.`,
    '',
    '| Mesure | Valeur |',
    '| --- | --- |',
    `| Triplets (paire × personnage) | ${rows.length} |`,
    `| Synergie moyenne | ${num(mean(rows.map((r) => r.logit)), 3)} |`,
    `| Écart absolu moyen | ${num(mean(rows.map((r) => Math.abs(r.logit))), 3)} |`,
    `| Triplets au-delà de ${num(PARTNER)} | ${rows.filter((r) => r.logit >= PARTNER).length} |`,
    `| Triplets sous ${num(CONFLICT)} | ${rows.filter((r) => r.logit <= CONFLICT).length} |`,
    `| Reliques avec un partenaire au-delà de ${num(PARTNER)} | ${partners.filter((p) => p.endsWith('oui |')).length} sur ${RELICS.length} |`,
    '',
    '## Paires, en moyenne sur le roster',
    '',
    '| Paire | Log-cote | Points |',
    '| --- | --- | --- |',
    ...byPair.slice(0, 10).map((p) => line(p.name, p.logit, p.pts)),
    '| … | | |',
    ...byPair.slice(-10).map((p) => line(p.name, p.logit, p.pts)),
    '',
    '## Triplets les plus marqués (un personnage précis)',
    '',
    '| Personnage : paire | Log-cote | Points |',
    '| --- | --- | --- |',
    ...strongest.slice(0, 12).map((r) => line(`${r.who} : ${r.a} + ${r.b}`, r.logit, r.pts)),
    '| … | | |',
    ...strongest.slice(-8).map((r) => line(`${r.who} : ${r.a} + ${r.b}`, r.logit, r.pts)),
    '',
    '## Partenaire de chaque relique',
    '',
    '| Relique | Meilleur partenaire | Pire partenaire | A un partenaire |',
    '| --- | --- | --- | --- |',
    ...partners,
  ].join('\n')
  mkdirSync('logs/synergy', { recursive: true })
  const file = `logs/synergy/${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}_v${pkg.version}.md`
  writeFileSync(file, `${out}\n`)
  console.log(`${out}\n→ ${file}`)
}, 3_600_000)
