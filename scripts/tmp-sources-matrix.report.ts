// Jetable (agent SourcesStudy) : matrice ressource × producteurs × consommateurs. Supprimé après l'étude.
import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { eventHooks, relicHooks, relicNeeds, skillNeeds, type Hook } from '../src/game/hooks'
import { offerableRelics, offerableSkills, REPERTOIRES } from '../src/game/offers'
import { RELICS, getRelic } from '../src/game/relics'
import { ALL_SKILLS, CHARACTER_IDS, createCharacter } from '../src/game/roster'

const RES: Hook[] = ['status:bleed', 'status:poison', 'status:burn', 'moment:heal', 'status:coinFlip', 'moment:heads', 'moment:shieldBreak', 'moment:reflect', 'moment:crit', 'moment:dodge']

it('matrice', () => {
  const out: string[] = []
  const name = (id: string) => ALL_SKILLS.find((e) => e.id === id)?.name ?? id
  // Producteurs et consommateurs (besoins) de chaque ressource
  out.push('## Ressources')
  for (const r of RES) {
    const prodSkills = ALL_SKILLS.filter((e) => eventHooks(e).produces.includes(r)).map((e) => e.name)
    const prodRelics = RELICS.filter((x) => relicHooks(x).produces.includes(r)).map((x) => x.name)
    const consSkills = ALL_SKILLS.filter((e) => skillNeeds(e).includes(r)).map((e) => e.name)
    const consRelics = RELICS.filter((x) => relicNeeds(x).includes(r)).map((x) => x.name)
    out.push(`${r}\n  P comp: ${[...new Set(prodSkills)].join(', ')}\n  P rel: ${prodRelics.join(', ')}\n  C comp: ${[...new Set(consSkills)].join(', ')}\n  C rel: ${consRelics.join(', ')}`)
  }
  out.push('\n## Personnages')
  for (const id of CHARACTER_IDS) {
    const c = createCharacter(id)
    const kit = c.events.map((e) => `${e.name} [${eventHooks(e).produces.filter((h) => RES.includes(h)).join(' ')}]`)
    const rep = REPERTOIRES[id].map((e) => `${e.name} [P ${eventHooks(e).produces.filter((h) => RES.includes(h)).join(' ')} | N ${skillNeeds(e).join(' ')}]`)
    const b0 = { championId: id, forge: [], relics: [] }
    const start = new Set(RES.filter((r) => c.events.some((e) => eventHooks(e).produces.includes(r)) || (r === 'moment:dodge' && c.stats.dodgeChance > 0) || (r === 'moment:crit' && c.stats.critChance > 0)))
    for (const f of c.forms ?? []) for (const s of f.statuses ?? []) if (RES.includes(`status:${s}`)) start.add(`status:${s}`)
    const skills0 = offerableSkills(b0, REPERTOIRES[id]).map((e) => e.name)
    const relics0 = offerableRelics(b0)
    const rp = RELICS.filter((x) => relics0.includes(x.id)).flatMap((x) => relicHooks(x).produces.filter((h) => RES.includes(h)).map((h) => `${h}<${x.name}`))
    // Après une gravure offerte : ce qui s'ouvre
    const after = offerableSkills(b0, REPERTOIRES[id]).map((s) => {
      const p = eventHooks(s).produces.filter((h) => RES.includes(h) && !start.has(h))
      return `${s.name} → ${p.join(' ') || '∅'}`
    })
    const gated = REPERTOIRES[id].filter((s) => !skills0.includes(s.name)).map((s) => `${s.name}(${skillNeeds(s).join(' ')})`)
    out.push(`### ${c.name} (${id}) esq ${c.stats.dodgeChance} crit ${c.stats.critChance}`)
    out.push(`  kit: ${kit.join(' ; ')}`)
    out.push(`  départ: ${[...start].join(' ')}`)
    out.push(`  répertoire: ${rep.join(' ; ')}`)
    out.push(`  offrables au départ: ${skills0.join(', ')} ; fermées: ${gated.join(', ')}`)
    out.push(`  après une gravure: ${after.join(' ; ')}`)
    out.push(`  reliques productrices offrables au départ: ${rp.join(', ')}`)
    out.push(`  reliques fermées au départ: ${RELICS.filter((x) => !relics0.includes(x.id)).map((x) => `${x.name}(${relicNeeds(x).join(' ')})`).join(', ')}`)
  }
  out.push('\n## Reliques')
  for (const x of RELICS) out.push(`${x.id} ${x.name}: P ${relicHooks(x).produces.join(' ')} | N ${relicNeeds(x).join(' ')}`)
  out.push('\n## Compétences')
  for (const e of ALL_SKILLS) out.push(`${e.id} ${e.name} (${e.trigger}): P ${eventHooks(e).produces.join(' ')} | C ${eventHooks(e).consumes.join(' ')} | N ${skillNeeds(e).join(' ')}`)
  void getRelic
  void name
  writeFileSync('/tmp/sources-matrix.txt', out.join('\n'))
})
