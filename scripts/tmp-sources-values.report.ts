// Jetable (agent SourcesStudy) : valeur gravée des producteurs nouveaux, apport des reliques de source. Supprimé après l'étude.
import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { winRate } from '../src/game/analysis'
import type { CharacterEvent } from '../src/game/events'
import type { Relic } from '../src/game/relics'
import { ALL_SKILLS, CHARACTERS, createCharacter } from '../src/game/roster'
import { BARBED_ARROW, FIRE_BREATH, SOURCE_RELICS } from './tmp-sources-variant'

/** Candidats de reliques de source (calage) */
const CANDIDATES: Relic[] = [
  { id: 'wasp-a', name: 'Dard : coup qui touche, 3 Poison, 1x', flavor: '', trigger: { type: 'strike', on: 'hit' }, charges: 1, effects: [{ type: 'applyStatus', status: 'poison', stacks: 3, target: 'opponent' }] },
  { id: 'wasp-b', name: 'Dard : sur un 6, 2 Poison', flavor: '', trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, target: 'opponent' }] },
  { id: 'tinder-a', name: 'Briquet : 3e tour, 2 Brûlure, 1x', flavor: '', trigger: { type: 'turn', turn: 3 }, charges: 1, effects: [{ type: 'applyStatus', status: 'burn', stacks: 2, target: 'opponent' }] },
  { id: 'tinder-b', name: 'Briquet : sur un 6, 2 Brûlure', flavor: '', trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'burn', stacks: 2, target: 'opponent' }] },
  { id: 'coin-a', name: 'Pièce : sur un 6, une pièce', flavor: '', trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }] },
  { id: 'coin-b', name: 'Pièce : sur un 1, une pièce', flavor: '', trigger: { type: 'strike', on: 'naturalOne' }, effects: [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }] },
  { id: 'bracer-a', name: 'Brassard : 1er tour, Riposte, 1x', flavor: '', trigger: { type: 'turn', turn: 1 }, charges: 1, effects: [{ type: 'applyStatus', status: 'riposte', stacks: 1 }] },
  { id: 'bracer-b', name: 'Brassard : 1er tour, Riposte, 2x (recharge 4)', flavor: '', trigger: { type: 'turn', turn: 1 }, cooldown: 4, charges: 2, effects: [{ type: 'applyStatus', status: 'riposte', stacks: 1 }] },
]

const N = Number(process.env.SOURCES_N ?? 400)
const skill = (id: string) => ALL_SKILLS.find((e) => e.id === id)!
const pts = (x: number) => (x * 100).toFixed(1)

it('valeurs', () => {
  const out: string[] = []
  const only = process.env.SOURCES_PART ?? 'skills,relics'
  if (only.includes('skills')) {
    const engrave = (host: string, steps: { face: number; skill: CharacterEvent }[]) =>
      createCharacter(host).withForge(steps.map((s) => ({ op: 'engrave' as const, face: s.face, skill: s.skill })))
    const cases: [string, string, { face: number; skill: CharacterEvent }[]][] = [
      ['Flèche barbelée chez Elaria (3)', 'elaria', [{ face: 3, skill: BARBED_ARROW }]],
      ['Pourfendre chez Elaria (3)', 'elaria', [{ face: 3, skill: skill('cleave') }]],
      ['Flèche barbelée (3) + Curée (4) chez Elaria', 'elaria', [{ face: 3, skill: BARBED_ARROW }, { face: 4, skill: skill('quarry') }]],
      ['Pourfendre (3) + Curée (4) chez Elaria', 'elaria', [{ face: 3, skill: skill('cleave') }, { face: 4, skill: skill('quarry') }]],
      ['Rancune chez Elaria (3)', 'elaria', [{ face: 3, skill: skill('grudge') }]],
      ['Riposte (3) + Vindicte (4) chez Elaria', 'elaria', [{ face: 3, skill: skill('riposte') }, { face: 4, skill: skill('vendetta') }]],
      ['Riposte chez Elaria (3)', 'elaria', [{ face: 3, skill: skill('riposte') }]],
      ['Cracheuse de feu chez Fanchon (3)', 'fanchon', [{ face: 3, skill: FIRE_BREATH }]],
      ['Cracheuse de feu (3) + Embrasement (4) chez Fanchon', 'fanchon', [{ face: 3, skill: FIRE_BREATH }, { face: 4, skill: skill('conflagration') }]],
      ['Pile ou face chez Fanchon (3)', 'fanchon', [{ face: 3, skill: skill('coin-flip') }]],
      ['Pile ou face (3) + Dé pipé (4) chez Fanchon', 'fanchon', [{ face: 3, skill: skill('coin-flip') }, { face: 4, skill: skill('loaded-die') }]],
      ['Siffloter (3) chez Fanchon', 'fanchon', [{ face: 3, skill: skill('whistle') }]],
      ['Siffloter (3) + Sentence (4) chez Fanchon', 'fanchon', [{ face: 3, skill: skill('whistle') }, { face: 4, skill: skill('sentence') }]],
    ]
    const base: Record<string, number> = {}
    for (const host of ['elaria', 'fanchon']) base[host] = winRate(createCharacter(host), CHARACTERS, N)
    out.push(`Vanilla : Elaria ${pts(base.elaria)} %, Fanchon ${pts(base.fanchon)} % (${N} par duel)`)
    for (const [label, host, steps] of cases) {
      const r = winRate(engrave(host, steps), CHARACTERS, N)
      out.push(`${label} : ${pts(r)} % (${r >= base[host] ? '+' : ''}${pts(r - base[host])})`)
    }
  }
  if (only.includes('relics')) {
    for (const relic of process.env.SOURCES_CAND ? CANDIDATES : SOURCE_RELICS) {
      const gains = CHARACTERS.map((c) => {
        const before = winRate(createCharacter(c.id), CHARACTERS, N / 2)
        const after = winRate(createCharacter(c.id).withRelics([relic]), CHARACTERS, N / 2)
        return { name: c.name, gain: after - before }
      })
      const mean = gains.reduce((s, g) => s + g.gain, 0) / gains.length
      out.push(`${relic.name} : moyenne +${pts(mean)} ; ${gains.map((g) => `${g.name} ${pts(g.gain)}`).join(', ')}`)
    }
  }
  console.log(out.join('\n'))
  writeFileSync(`/tmp/sources-values-${only.replace(',', '-')}-${process.env.SOURCES_BARBED ?? 2}-${process.env.SOURCES_FIRE ?? 3}.txt`, out.join('\n'))
}, 3_600_000)
