// Jetable (agent SourcesStudy) : l'offre seule sous une variante (SOURCES_VARIANT), 120 actes par champion tirés comme
// `actBuild` de campaign.report.ts. Supprimé après l'étude.
import { appendFileSync } from 'node:fs'
import { it } from 'vitest'
import { VARIANT } from './tmp-sources-variant'
import { hashSeed } from '../src/game/analysis'
import { championOf } from '../src/game/campaign'
import { withForgeStep, type ForgeStep } from '../src/game/forge'
import { buildHooks, buildLinks, relicNeeds, skillNeeds, type Hook } from '../src/game/hooks'
import { getRelic } from '../src/game/relics'
import { drawReward, REWARDS } from '../src/game/offers'
import { seededRng } from '../src/game/rng'
import { CHARACTER_IDS, createCharacter } from '../src/game/roster'

const LOT = ['quarry', 'harvest', 'virulence', 'sentence', 'grudge', 'conflagration', 'loaded-die', 'bristling-rampart', 'vendetta', 'forge-bellows', 'pavise-nails', 'talion-gauntlet', 'holed-coin']
const RES: readonly Hook[] = ['status:bleed', 'status:poison', 'status:burn', 'moment:heal', 'status:coinFlip', 'moment:shieldBreak', 'moment:reflect']

it('offre', () => {
  const rows: string[] = []
  const pct = (x: number) => `${Math.round(x * 100)}`
  for (const id of CHARACTER_IDS) {
    const def = createCharacter(id).definition
    let offered = 0
    let taken = 0
    let perBuild = 0
    let firstAt = 0
    let resEnd = 0
    let consumers = 0
    let links = 0
    const res0 = RES.filter((h) => buildHooks(createCharacter(id)).produces.includes(h)).length
    for (let s = 0; s < 10; s++) {
      for (let v = 0; v < 12; v++) {
        const rng = seededRng(hashSeed(`campagne:${hashSeed(`builds:${id}:${s}`)}:reference:${v}`))
        let forge: ForgeStep[] = []
        const relics: string[] = []
        let seen = false
        let took = 0
        let first = REWARDS.length + 1
        REWARDS.forEach((kind, i) => {
          const reward = drawReward({ championId: id, forge, relics }, kind, rng)
          const lots = reward.kind === 'relic' ? reward.offer.filter((x) => LOT.includes(x)) : reward.offer.flatMap((o) => (o.op === 'engrave' && LOT.includes(o.skill.id) ? [o.skill.id] : []))
          if (lots.length) {
            seen = true
            first = Math.min(first, i + 1)
          }
          if (reward.kind === 'forge' && reward.choice) {
            if (reward.choice.op === 'engrave' && LOT.includes(reward.choice.skill.id)) took++
            forge = withForgeStep(def, forge, reward.choice)
          }
          if (reward.kind === 'relic' && reward.choice) {
            if (LOT.includes(reward.choice)) took++
            relics.push(reward.choice)
          }
        })
        if (seen) offered++
        if (took) taken++
        perBuild += took
        firstAt += first
        const built = championOf({ championId: id, forge, relics })
        const end = buildHooks(built).produces
        resEnd += RES.filter((h) => end.includes(h)).length
        const engraved = forge.flatMap((f) => (f.op === 'engrave' ? [f.skill] : []))
        consumers += engraved.filter((e) => skillNeeds(e).length > 0).length + relics.filter((r) => relicNeeds(getRelic(r)).length > 0).length
        links += buildLinks(built).linked
      }
    }
    rows.push(`| ${createCharacter(id).name} | ${pct(offered / 120)} / ${pct(taken / 120)} | ${(perBuild / 120).toFixed(2)} | ${(firstAt / 120).toFixed(1)} | ${res0} → ${(resEnd / 120).toFixed(1)} | ${(consumers / 120).toFixed(2)} | ${(links / 120).toFixed(2)} |`)
  }
  appendFileSync('/tmp/sources-offer.md', `\n### ${VARIANT}\n| Champion | Lot offerte / prise (% des actes) | Briques des lots prises par build | Première offre d'une brique (récompense, 11 = jamais) | Ressources des lots produites : départ → fin d'acte | Consommatrices prises par build (toutes) | Paires liées par build |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`)
})
