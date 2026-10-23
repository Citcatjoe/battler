/*
 * Mesure de la saison construite : `npm run season` (SEASON_RUNS saisons de 24, reliques et forge, 4 par défaut ;
 * SEASON_N combats par duel pour la valeur des constructions, 60 par défaut). Chaque saison se joue en entier, journée
 * par journée, avec les récompenses du choix par défaut, comme « Simuler » dans le jeu. Donne :
 * - la durée des combats (tours par combattant) par tiers de saison : la construction raccourcit-elle les combats ?
 * - « le build se voit-il ? » : en fin de saison, chaque participant construit contre le roster nu, et le même nu, sur
 *   les mêmes graines (`winRate`) ; l'écart est l'apport de sa construction.
 * Écrit dans logs/season/. Méthode et lecture : docs/PROGRESSION.md § 3.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { hashSeed, winRate } from '../src/game/analysis'
import { getRelic } from '../src/game/relics'
import { CHARACTERS, createCharacter } from '../src/game/roster'
import { buildOf, createSeasonTournament, drawSeasonParticipants, inSeason, seasonSchedule, simulateSeasonMatches } from '../src/game/season'
import pkg from '../package.json' with { type: 'json' }

const SIZE = 24
const pct = (x: number) => `${Math.round(x * 100)} %`
const dec = (x: number) => x.toFixed(1).replace('.', ',')

it('mesure de la saison construite', () => {
  const runs = Number(process.env.SEASON_RUNS ?? 4)
  const perPair = Number(process.env.SEASON_N ?? 60)
  const days = seasonSchedule(SIZE)
  const thirds = [0, 1, 2].map(() => ({ fights: 0, turns: 0 }))
  const naked = new Map(CHARACTERS.map((c) => [c.id, winRate(c, CHARACTERS, perPair)]))
  const gains: { id: string; built: number; rewards: number }[] = []

  for (let k = 0; k < runs; k++) {
    const seed = hashSeed(`saison:${k}`)
    let t = createSeasonTournament(drawSeasonParticipants(SIZE, seed), (id) => createCharacter(id).name, { relics: true, forge: true, seed })
    for (const day of days) t = simulateSeasonMatches(t, day.map((f) => f.number))
    if (!inSeason(t)) throw new Error('Saison interrompue')
    const { season } = t
    for (const day of days)
      for (const f of day) {
        const third = thirds[Math.min(2, Math.floor((f.day * 3) / days.length))]
        third.fights++
        third.turns += season.results[f.number].turns
      }
    season.entrants.forEach((e, i) => {
      const { relics, forge } = buildOf(season, i)
      const built = createCharacter(e.characterId).withForge(forge).withRelics(relics.map(getRelic))
      gains.push({ id: e.characterId, built: winRate(built, CHARACTERS, perPair), rewards: relics.length + forge.length })
    })
  }

  const byCharacter = CHARACTERS.map((c) => {
    const own = gains.filter((g) => g.id === c.id)
    const built = own.reduce((s, g) => s + g.built, 0) / own.length
    return `| ${c.name} | ${own.length} | ${pct(naked.get(c.id)!)} | ${pct(built)} | ${Math.round((built - naked.get(c.id)!) * 100)} points |`
  })
  const meanGain = gains.reduce((s, g) => s + g.built - naked.get(g.id)!, 0) / gains.length
  const complete = gains.filter((g) => g.rewards === 6).length
  const out = [
    `# Saison construite · règles ${pkg.version} · ${runs} saisons de ${SIZE}, reliques et forge, choix par défaut`,
    '',
    '## Durée des combats, par tiers de saison',
    '',
    '| Tiers | Journées | Combats | Tours par combattant |',
    '| --- | --- | --- | --- |',
    ...thirds.map((th, i) => `| ${i + 1} | ${Math.ceil((i * days.length) / 3) + 1} à ${Math.ceil(((i + 1) * days.length) / 3)} | ${th.fights} | ${dec(th.turns / th.fights / 2)} |`),
    '',
    '## Le build se voit-il ? (fin de saison, contre le roster nu)',
    '',
    `${perPair} combats par duel, mêmes graines pour le construit et le nu. Constructions complètes (six récompenses) : ${complete} sur ${gains.length}. Apport moyen : ${Math.round(meanGain * 100)} points.`,
    '',
    '| Personnage | Participants | Nu | Construit | Apport du build |',
    '| --- | --- | --- | --- | --- |',
    ...byCharacter,
  ].join('\n')
  console.log(out)
  mkdirSync('logs/season', { recursive: true })
  writeFileSync(`logs/season/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}_saison.md`, `${out}\n`)
}, 3_600_000)
