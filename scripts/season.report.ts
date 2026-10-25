/*
 * Mesure de la saison construite : `npm run season` (SEASON_RUNS saisons de SEASON_SIZE, 24 par défaut, reliques et
 * forge, 4 saisons par défaut ; SEASON_N combats par duel pour la valeur des constructions, 60 par défaut). Chaque saison
 * se joue en entier, journée par journée, avec les récompenses du choix par défaut, comme « Simuler » dans le jeu. Donne :
 * - le rythme de construction (0.115.0 : une récompense à chacun des dix premiers matchs, gagné ou perdu) : builds
 *   complets à l'arbre, journée où ils le deviennent, gravures et paires liées par build ;
 * - l'écart des taux de victoire de saison par personnage (la construction écrase-t-elle le classement ?) ;
 * - la durée des combats (tours par combattant) par tiers de saison : la construction raccourcit-elle les combats ?
 * - « le build se voit-il ? » : en fin de saison, chaque participant construit contre le roster nu, et le même nu, sur
 *   les mêmes graines (`winRate`) ; l'écart est l'apport de sa construction.
 * Écrit dans logs/season/. Méthode et lecture : docs/PROGRESSION.md § 3.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { hashSeed, winRate } from '../src/game/analysis'
import { buildLinks } from '../src/game/hooks'
import { getRelic } from '../src/game/relics'
import { CHARACTERS, createCharacter } from '../src/game/roster'
import { buildDone, buildOf, createSeasonTournament, DEFAULT_SEASON_SIZE, drawSeasonParticipants, inSeason, SEASON_SIZES, seasonSchedule, simulateSeasonMatches } from '../src/game/season'
import pkg from '../package.json' with { type: 'json' }

const pct = (x: number) => `${Math.round(x * 100)} %`
const dec = (x: number, n = 1) => x.toFixed(n).replace('.', ',')
const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length)
/** Les briques des trois lots de la phase 8 (SORTS.md § 22, § 23, § 28 et § 29, RELIQUES.md § 15), comptées dans chaque build */
const LOT_BRICKS: readonly string[] = ['quarry', 'harvest', 'virulence', 'sentence', 'grudge', 'conflagration', 'loaded-die', 'bristling-rampart', 'vendetta', 'forge-bellows', 'pavise-nails', 'talion-gauntlet', 'holed-coin', 'guard-break', 'jinx', 'blinding', 'hemorrhage', 'seal-theft', 'feint', 'black-sap', 'blood-debt', 'stoke', 'storm-sky', 'blood-frenzy', 'stunning-blow']

it('mesure de la saison construite', () => {
  const runs = Number(process.env.SEASON_RUNS ?? 4)
  const perPair = Number(process.env.SEASON_N ?? 60)
  const size = SEASON_SIZES.find((n) => n === Number(process.env.SEASON_SIZE)) ?? DEFAULT_SEASON_SIZE
  const days = seasonSchedule(size)
  const thirds = [0, 1, 2].map(() => ({ fights: 0, turns: 0 }))
  const naked = new Map(CHARACTERS.map((c) => [c.id, winRate(c, CHARACTERS, perPair)]))
  const gains: { id: string; built: number; complete: boolean; doneDay: number; engraved: number; linked: number; lot: number }[] = []
  const record = new Map<string, { wins: number; played: number }>()

  for (let k = 0; k < runs; k++) {
    const seed = hashSeed(`saison:${k}`)
    let t = createSeasonTournament(drawSeasonParticipants(size, seed), (id) => createCharacter(id).name, { relics: true, forge: true, seed })
    for (const day of days) t = simulateSeasonMatches(t, day.map((f) => f.number))
    if (!inSeason(t)) throw new Error('Saison interrompue')
    const { season } = t
    for (const day of days)
      for (const f of day) {
        const r = season.results[f.number]
        const third = thirds[Math.min(2, Math.floor((f.day * 3) / days.length))]
        third.fights++
        third.turns += r.turns
        ;[f.home, f.away].forEach((i, side) => {
          const own = record.get(season.entrants[i].characterId) ?? { wins: 0, played: 0 }
          own.played++
          if (r.winner === side) own.wins++
          record.set(season.entrants[i].characterId, own)
        })
      }
    season.entrants.forEach((e, i) => {
      const { relics, forge } = buildOf(season, i)
      const built = createCharacter(e.characterId).withForge(forge).withRelics(relics.map(getRelic))
      const doneDay = days.findIndex((_, d) => buildDone(season, buildOf(season, i, d + 1))) + 1
      gains.push({
        id: e.characterId,
        built: winRate(built, CHARACTERS, perPair),
        complete: buildDone(season, { relics, forge }),
        doneDay,
        engraved: forge.filter((s) => s.op === 'engrave').length,
        linked: buildLinks(built).linked,
        lot: [...relics, ...forge.flatMap((s) => (s.op === 'engrave' ? [s.skill.id] : []))].filter((id) => LOT_BRICKS.includes(id)).length,
      })
    })
  }

  const rates = CHARACTERS.flatMap((c) => {
    const r = record.get(c.id)
    return r ? [{ name: c.name, rate: r.wins / r.played, played: r.played }] : []
  })
  const avg = mean(rates.map((r) => r.rate))
  const spread = Math.sqrt(mean(rates.map((r) => (r.rate - avg) ** 2)))
  const byCharacter = CHARACTERS.map((c) => {
    const own = gains.filter((g) => g.id === c.id)
    const built = mean(own.map((g) => g.built))
    const season = rates.find((r) => r.name === c.name)
    return `| ${c.name} | ${own.length} | ${season ? pct(season.rate) : '—'} | ${pct(naked.get(c.id)!)} | ${pct(built)} | ${Math.round((built - naked.get(c.id)!) * 100)} points | ${dec(mean(own.map((g) => g.engraved)), 2)} | ${dec(mean(own.map((g) => g.linked)), 2)} | ${dec(mean(own.map((g) => g.lot)), 2)} |`
  })
  const meanGain = mean(gains.map((g) => g.built - naked.get(g.id)!))
  const complete = gains.filter((g) => g.complete)
  const out = [
    `# Saison construite · règles ${pkg.version} · ${runs} saisons de ${size}, reliques et forge, choix par défaut`,
    '',
    '## Rythme de construction',
    '',
    `Builds complets à l'arbre : ${complete.length} sur ${gains.length}, à la journée ${dec(mean(complete.map((g) => g.doneDay)))} en moyenne (sur ${days.length}). Gravures par build : ${dec(mean(gains.map((g) => g.engraved)), 2)} ; paires liées par build : ${dec(mean(gains.map((g) => g.linked)), 2)} ; briques des lots de la phase 8 par build : ${dec(mean(gains.map((g) => g.lot)), 2)}.`,
    '',
    '## Taux de victoire de saison par personnage',
    '',
    `De ${pct(Math.min(...rates.map((r) => r.rate)))} à ${pct(Math.max(...rates.map((r) => r.rate)))}, écart-type ${dec(spread * 100)} points (${rates.reduce((s, r) => s + r.played, 0) / 2} matchs).`,
    '',
    '## Durée des combats, par tiers de saison',
    '',
    '| Tiers | Journées | Combats | Tours par combattant |',
    '| --- | --- | --- | --- |',
    ...thirds.map((th, i) => `| ${i + 1} | ${Math.ceil((i * days.length) / 3) + 1} à ${Math.ceil(((i + 1) * days.length) / 3)} | ${th.fights} | ${dec(th.turns / th.fights / 2)} |`),
    '',
    '## Le build se voit-il ? (fin de saison, contre le roster nu)',
    '',
    `${perPair} combats par duel, mêmes graines pour le construit et le nu. Apport moyen : ${Math.round(meanGain * 100)} points.`,
    '',
    '| Personnage | Participants | Saison | Nu | Construit | Apport du build | Gravures | Paires liées | Briques des lots |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...byCharacter,
  ].join('\n')
  console.log(out)
  mkdirSync('logs/season', { recursive: true })
  writeFileSync(`logs/season/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}_saison.md`, `${out}\n`)
}, 3_600_000)
