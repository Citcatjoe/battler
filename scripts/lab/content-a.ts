/*
 * Quatrième demande du 2026-10-27 (agent ContentA) : le contenu du Sang, du Poison et de la Lumière, autour du soin
 * (proposition 3 de l'utilisateur). Chaque brique est essayée gravée sur le 3 nu de ses porteurs, kit vanilla
 * d'aujourd'hui (bande d'une gravure : 8 à 20 points). Statuts d'essai `labA…`, construits avec les crochets existants.
 * Série 80 : la première mesure de chaque brique et de ses variantes.
 */
import type { Character } from '../../src/game/character'
import { faceTrigger, type CharacterEvent, type Effect } from '../../src/game/events'
import { charges, STATUSES, type StatusDef, type StatusId } from '../../src/game/statuses'
import { ALL_SKILLS } from '../../src/game/roster'
import type { LabIdea } from './ideas'

/** Un statut d'essai : une base neutre (ni aura, ni règle), sa présentation réduite au nom */
const trial = (name: string, rest: Partial<StatusDef>): StatusDef => ({
  ...STATUSES.weakened,
  modifyOutgoing: undefined,
  name,
  summary: name,
  describe: () => name,
  badge: (s) => String(charges(s)),
  stacking: 'add',
  ...rest,
})
/** Une aura d'essai : le halo d'une aura du registre (`isAura`) */
const aura = (name: string, rest: Partial<StatusDef>): StatusDef => trial(name, { look: STATUSES.powerAura.look, polarity: 'positive', ...rest })

const ids = {
  dime32: 'labATithe32',
  dime33: 'labATithe33',
  dime23: 'labATithe23',
  dime42: 'labATithe42',
  votive31: 'labAVotive31',
  votive32: 'labAVotive32',
  votiveFlat: 'labAVotiveFlat',
  votive51: 'labAVotive51',
  doom8: 'labADoom8',
  leech: 'labALeech',
  toad: 'labAToad',
  coin5: 'labACoin5',
  coin6: 'labACoin6',
} as const satisfies Record<string, string>
type Id = (typeof ids)[keyof typeof ids]
const S = (id: Id) => id as unknown as StatusId

/** La Dîme : chaque coup qui touche de son porteur (l'adversaire) lui coûte `pv` PV, que le lanceur regagne */
const tithe = (pv: number): Partial<StatusDef> => ({
  polarity: 'negative',
  family: 'healing',
  decays: true,
  counter: 'stacks',
  reactions: {
    hit: () => [
      { type: 'damage', amount: pv, source: 'holy' },
      { type: 'heal', amount: pv, target: 'opponent' },
    ],
  },
})
/** La flamme votive : chaque soin de son porteur attise la Brûlure de l'adversaire de `n` (ou la pose à plat) */
const votive = (burn: Effect): Partial<StatusDef> => ({ polarity: 'positive', family: 'affliction', decays: true, counter: 'stacks', reactions: { healed: () => [burn] } })
const stoke = (n: number): Effect => ({ type: 'applyStatus', status: 'burn', stacks: n, target: 'opponent', fromStatus: { status: 'burn', who: 'opponent', factor: 1 } })

const STATUSES_80: Record<string, StatusDef> = {
  [ids.dime32]: trial('Dîme (3 × 2)', tithe(2)),
  [ids.dime33]: trial('Dîme (3 × 3)', tithe(3)),
  [ids.dime23]: trial('Dîme (2 × 3)', tithe(3)),
  [ids.dime42]: trial('Dîme (4 × 2)', tithe(2)),
  [ids.votive31]: trial('Flamme votive (3, +1)', votive(stoke(1))),
  [ids.votive32]: trial('Flamme votive (3, +2)', votive(stoke(2))),
  [ids.votive51]: trial('Flamme votive (5, +1)', votive(stoke(1))),
  [ids.votiveFlat]: trial('Flamme votive (3, Brûlure 2)', votive({ type: 'applyStatus', status: 'burn', stacks: 2, target: 'opponent' })),
  // Repère : un consommateur de soin à un coup, sans lien (« son prochain soin : 8 PV à l'adversaire »)
  [ids.doom8]: trial('Châtiment (8)', { polarity: 'positive', family: 'affliction', spentOnReaction: true, reactions: { healed: () => [{ type: 'damage', amount: 8, target: 'opponent', source: 'holy' }] } }),
  [ids.leech]: aura('Sangsue', { family: 'healing', reactions: { hit: (s) => [{ type: 'heal', amount: 0, fromStatus: { status: 'bleed', who: 'opponent', factor: charges(s) } }] } }),
  [ids.toad]: aura('Peau de crapaud', { family: 'affliction', reactions: { hurt: (s) => [{ type: 'applyStatus', status: 'poison', stacks: charges(s), target: 'opponent' }] } }),
  [ids.coin5]: trial('Pièce vert-de-gris (5)', { polarity: 'positive', family: 'fortune', mechanic: 'skill', stacking: 'refresh', maxStacks: 1, coinToss: { heads: [{ type: 'applyStatus', status: 'poison', stacks: 5, target: 'opponent' }] } }),
  [ids.coin6]: trial('Pièce vert-de-gris (6)', { polarity: 'positive', family: 'fortune', mechanic: 'skill', stacking: 'refresh', maxStacks: 1, coinToss: { heads: [{ type: 'applyStatus', status: 'poison', stacks: 6, target: 'opponent' }] } }),
}

const three = (id: string, name: string, effects: Effect[], rest: Partial<CharacterEvent> = {}): CharacterEvent => ({ id, name, trigger: faceTrigger(3), effects, ...rest })
const pose = (status: Id, stacks: number, target?: 'opponent'): Effect => ({ type: 'applyStatus', status: S(status), stacks, ...(target && { target }) })

const SKILLS_80: Record<string, CharacterEvent> = {
  dime32: three('lab-a-dime32', 'Dîme 3 × 2', [pose(ids.dime32, 3, 'opponent')]),
  dime33: three('lab-a-dime33', 'Dîme 3 × 3', [pose(ids.dime33, 3, 'opponent')]),
  dime23: three('lab-a-dime23', 'Dîme 2 × 3', [pose(ids.dime23, 2, 'opponent')]),
  dime42: three('lab-a-dime42', 'Dîme 4 × 2', [pose(ids.dime42, 4, 'opponent')]),
  votive31: three('lab-a-votive31', 'Flamme votive 3, +1', [pose(ids.votive31, 3)]),
  votive32: three('lab-a-votive32', 'Flamme votive 3, +2', [pose(ids.votive32, 3)]),
  votive51: three('lab-a-votive51', 'Flamme votive 5, +1', [pose(ids.votive51, 5)]),
  votiveFlat: three('lab-a-votive-flat', 'Flamme votive 3, Brûlure 2', [pose(ids.votiveFlat, 3)]),
  doom8: three('lab-a-doom8', 'Châtiment 8 (repère)', [pose(ids.doom8, 1)]),
  leech: three('lab-a-leech', 'Sangsue', [pose(ids.leech, 1)]),
  oath25: three('lab-a-oath25', 'Serment de sang −2 / 5', [{ type: 'damage', amount: 2, source: 'bleed' }, { type: 'applyStatus', status: 'bleed', stacks: 5, target: 'opponent' }]),
  oath36: three('lab-a-oath36', 'Serment de sang −3 / 6', [{ type: 'damage', amount: 3, source: 'bleed' }, { type: 'applyStatus', status: 'bleed', stacks: 6, target: 'opponent' }]),
  bleed4: three('lab-a-bleed4', '4 Saignement (repère)', [{ type: 'applyStatus', status: 'bleed', stacks: 4, target: 'opponent' }]),
  dry: three('lab-a-dry', 'Saigner à blanc', [{ type: 'release', status: 'bleed', from: 'opponent', min: 0, target: 'opponent', source: 'bleed' }], { when: [{ type: 'hasStatus', who: 'opponent', status: 'bleed' }] }),
  toad: three('lab-a-toad', 'Peau de crapaud', [pose(ids.toad, 1)]),
  coin5: three('lab-a-coin5', 'Pièce vert-de-gris 5', [pose(ids.coin5, 1)], { relation: 'modify' }),
  coin6: three('lab-a-coin6', 'Pièce vert-de-gris 6', [pose(ids.coin6, 1)], { relation: 'modify' }),
  agony1: three('lab-a-agony1', 'Agonie ×1', [{ type: 'damage', amount: 0, target: 'opponent', source: 'poison', fromStatus: { status: 'poison', who: 'opponent', factor: 1 } }], { when: [{ type: 'hasStatus', who: 'opponent', status: 'poison' }] }),
  agony2: three('lab-a-agony2', 'Agonie ×2', [{ type: 'damage', amount: 0, target: 'opponent', source: 'poison', fromStatus: { status: 'poison', who: 'opponent', factor: 2 } }], { when: [{ type: 'hasStatus', who: 'opponent', status: 'poison' }] }),
}

/** Gravée sur le 3 nu de `who`, kit d'aujourd'hui */
const engrave = (series: number, statuses: Record<string, StatusDef>) => (who: string, key: string, e: CharacterEvent, watch: string[] = []): LabIdea => ({
  series,
  id: `a${series}-${key}-${who}`,
  character: who,
  name: `${e.name}, gravée (${who})`,
  schema: 'Gravure',
  family: 'Maîtrises',
  pitch: e.name,
  apply: (c: Character) => c.adjusted({ events: [...c.events, e] }),
  watch: [e.id, ...watch],
  statuses,
})
const g80 = engrave(80, STATUSES_80)
const LIGHT = ['ysolde']
const BLOOD = ['gorak', 'elaria', 'brokk']
const POISON = ['ervald', 'naraxes', 'thaldrin']
const on = (who: string[], keys: (keyof typeof SKILLS_80)[], watch: string[] = []) => keys.flatMap((k) => who.map((w) => g80(w, k, SKILLS_80[k], watch)))

const SERIES_80: LabIdea[] = [
  ...on(LIGHT, ['dime32', 'dime33', 'dime23', 'dime42', 'votive31', 'votive32', 'votive51', 'votiveFlat', 'doom8']),
  ...on(BLOOD, ['leech', 'oath25', 'oath36', 'bleed4', 'dry'], ['bleed']),
  ...on(POISON, ['toad', 'coin5', 'coin6', 'agony1', 'agony2'], ['poison']),
]

/* --- Série 81 : les réglages après la série 80 (Dîme et Flamme votive plus petites, Serment de sang plus petit), et les
   consommatrices mesurées là où leur ressource existe (« le producteur d'abord ») : le producteur gravé sur le 4 nu, avant
   comme après ; la valeur de la consommatrice est l'écart entre « producteur seul » et « producteur et consommatrice ».
   La Peau de crapaud, une aura sans besoin, est une aura de départ des trois porteurs du Poison : mesurée au départ. --- */
const STATUSES_81: Record<string, StatusDef> = {
  ...STATUSES_80,
  labATithe31: trial('Dîme (3 × 1)', tithe(1)),
  labATithe22: trial('Dîme (2 × 2)', tithe(2)),
  labATithe13: trial('Dîme (1 × 3)', tithe(3)),
  labATithe14: trial('Dîme (1 × 4)', tithe(4)),
  labAVotive22: trial('Flamme votive (2, +2)', votive(stoke(2))),
  labAVotiveFlat4: trial('Flamme votive (4, Brûlure 2)', votive({ type: 'applyStatus', status: 'burn', stacks: 2, target: 'opponent' })),
  labAVotiveFlat3: trial('Flamme votive (3, Brûlure 3)', votive({ type: 'applyStatus', status: 'burn', stacks: 3, target: 'opponent' })),
  labAVotiveFlat23: trial('Flamme votive (2, Brûlure 3)', votive({ type: 'applyStatus', status: 'burn', stacks: 3, target: 'opponent' })),
}
const lab = (id: string) => id as StatusId
const oath = (key: string, cost: number, bleed: number): CharacterEvent =>
  three(`lab-a-oath-${key}`, cost ? `Serment de sang −${cost} / ${bleed}` : `${bleed} Saignement (repère)`, [
    ...(cost ? [{ type: 'damage' as const, amount: cost, source: 'bleed' as const }] : []),
    { type: 'applyStatus', status: 'bleed', stacks: bleed, target: 'opponent' },
  ])
const reads = (key: string, name: string, status: StatusId, factor: number, source: 'bleed' | 'poison'): CharacterEvent =>
  three(`lab-a-${key}`, name, [{ type: 'damage', amount: 0, target: 'opponent', source, fromStatus: { status, who: 'opponent', factor } }], { when: [{ type: 'hasStatus', who: 'opponent', status }] })
const SKILLS_81: Record<string, CharacterEvent> = {
  dime31: three('lab-a-dime31', 'Dîme 3 × 1', [{ type: 'applyStatus', status: lab('labATithe31'), stacks: 3, target: 'opponent' }]),
  dime22: three('lab-a-dime22', 'Dîme 2 × 2', [{ type: 'applyStatus', status: lab('labATithe22'), stacks: 2, target: 'opponent' }]),
  dime13: three('lab-a-dime13', 'Dîme 1 × 3', [{ type: 'applyStatus', status: lab('labATithe13'), stacks: 1, target: 'opponent' }]),
  dime14: three('lab-a-dime14', 'Dîme 1 × 4', [{ type: 'applyStatus', status: lab('labATithe14'), stacks: 1, target: 'opponent' }]),
  votive22: three('lab-a-votive22', 'Flamme votive 2, +2', [{ type: 'applyStatus', status: lab('labAVotive22'), stacks: 2 }]),
  votiveFlat4: three('lab-a-votive-flat4', 'Flamme votive 4, Brûlure 2', [{ type: 'applyStatus', status: lab('labAVotiveFlat4'), stacks: 4 }]),
  votiveFlat3: three('lab-a-votive-flat3', 'Flamme votive 3, Brûlure 3', [{ type: 'applyStatus', status: lab('labAVotiveFlat3'), stacks: 3 }]),
  votiveFlat23: three('lab-a-votive-flat23', 'Flamme votive 2, Brûlure 3', [{ type: 'applyStatus', status: lab('labAVotiveFlat23'), stacks: 2 }]),
  oath13: oath('13', 1, 3),
  oath23: oath('23', 2, 3),
  oath34: oath('34', 3, 4),
  oath44: oath('44', 4, 4),
  bleed3: oath('03', 0, 3),
  dryAll: three('lab-a-dry-all', 'Saigner à blanc (tout)', [{ type: 'release', status: 'bleed', from: 'opponent', min: 0, target: 'opponent', source: 'bleed' }], { when: [{ type: 'hasStatus', who: 'opponent', status: 'bleed' }] }),
  reopen1: reads('reopen1', 'Rouvrir ×1 (1 PV par Saignement)', 'bleed', 1, 'bleed'),
  reopen2: reads('reopen2', 'Rouvrir ×2 (2 PV par Saignement)', 'bleed', 2, 'bleed'),
  agony3: reads('agony3', 'Agonie ×3 (3 PV par Poison)', 'poison', 3, 'poison'),
  agonyAll: three('lab-a-agony-all', 'Agonie (tout son Poison, d’un coup)', [{ type: 'release', status: 'poison', from: 'opponent', min: 0, target: 'opponent', source: 'poison' }], { when: [{ type: 'hasStatus', who: 'opponent', status: 'poison' }] }),
}
const g81 = engrave(81, STATUSES_81)
/** Le producteur sur le 4 nu (lab seulement) : le « construit » d'une consommatrice */
const onFour = (e: CharacterEvent): CharacterEvent => ({ ...e, trigger: faceTrigger(4) })
const built = (who: string, key: string, producer: CharacterEvent, consumer?: CharacterEvent): LabIdea => ({
  ...g81(who, key, consumer ?? producer),
  id: `a81-${key}-${who}`,
  name: `${consumer ? `${consumer.name} gravée, avec` : 'Producteur seul :'} ${producer.name} sur le 4 (${who})`,
  apply: (c: Character) => c.adjusted({ events: [...c.events, onFour(producer), ...(consumer ? [consumer] : [])] }),
})
const skillOf = (id: string) => {
  const found = ALL_SKILLS.find((e) => e.id === id)
  if (!found) throw new Error(`Série 81 : compétence inconnue (${id})`)
  return found
}
const BLOOD_CONSUMERS = [SKILLS_80.leech, SKILLS_81.dryAll, SKILLS_81.reopen1, SKILLS_81.reopen2]
const POISON_CONSUMERS = [SKILLS_80.agony2, SKILLS_81.agony3, SKILLS_81.agonyAll]
/** Un dé de départ : l'aura sur le 1, la face 2 du dé vanilla, quatre faces nues */
const start = (who: string, key: string, first: CharacterEvent): LabIdea => ({
  ...g81(who, key, first),
  id: `a81-${key}-${who}`,
  name: `Départ : ${first.name} sur le 1 (${who})`,
  apply: (c: Character) => c.adjusted({ events: [{ ...first, trigger: faceTrigger(1) }, ...c.events.filter((e) => e.trigger === faceTrigger(2))] }),
})
const SERIES_81: LabIdea[] = [
  ...(['dime31', 'dime22', 'dime13', 'dime14', 'votive22', 'votiveFlat4', 'votiveFlat3', 'votiveFlat23'] as const).map((k) => g81('ysolde', k, SKILLS_81[k])),
  ...(['oath13', 'oath23', 'oath34', 'oath44', 'bleed3'] as const).flatMap((k) => BLOOD.map((w) => g81(w, k, SKILLS_81[k], ['bleed']))),
  ...BLOOD.flatMap((w) => [built(w, 'p-cleave', skillOf('cleave')), ...BLOOD_CONSUMERS.map((c) => built(w, `p-cleave-${c.id}`, skillOf('cleave'), c))]),
  ...POISON.flatMap((w) => [built(w, 'p-grave', skillOf('grave-breath')), ...POISON_CONSUMERS.map((c) => built(w, `p-grave-${c.id}`, skillOf('grave-breath'), c))]),
  ...POISON.map((w) => start(w, 'start-toad', SKILLS_80.toad)),
]

/* --- Série 82 : les consommatrices dans leur build réel. Sang : la Plaie ouverte (le producteur constant) sur le 4 nu de Gorak
   et d'Elaria, Brokk tel quel (ses Épines). Poison : Ervald et Naraxes tels quels (Glaciale, Décoction), Thaldrin avec
   l'Aura glaciale sur le 4. Une relâche ne fait qu'avancer une perte déjà due (série 81 : +0,4 à +2,9) : elle se multiplie,
   comme l'Embrasement (×3). Et une troisième piste pour le Sang : Odeur du sang (un critique assuré si l'adversaire saigne). --- */
const STATUSES_82: Record<string, StatusDef> = {
  ...STATUSES_81,
  labAVotiveFlat24: trial('Flamme votive (2, Brûlure 4)', votive({ type: 'applyStatus', status: 'burn', stacks: 4, target: 'opponent' })),
  labALeech2: aura('Sangsue ×2', { family: 'healing', reactions: { hit: (s) => [{ type: 'heal', amount: 0, fromStatus: { status: 'bleed', who: 'opponent', factor: 2 * charges(s) } }] } }),
}
const g82 = engrave(82, STATUSES_82)
const releaseTimes = (key: string, name: string, status: 'bleed' | 'poison', share: number): CharacterEvent =>
  three(`lab-a-${key}`, name, [{ type: 'release', status, from: 'opponent', share, min: 0, target: 'opponent', source: status }], { when: [{ type: 'hasStatus', who: 'opponent', status }] })
const SKILLS_82: Record<string, CharacterEvent> = {
  votiveFlat24: three('lab-a-votive-flat24', 'Flamme votive 2, Brûlure 4 (rang II)', [{ type: 'applyStatus', status: lab('labAVotiveFlat24'), stacks: 2 }]),
  leech2: three('lab-a-leech2', 'Sangsue ×2', [{ type: 'applyStatus', status: lab('labALeech2'), stacks: 1 }]),
  dry2: releaseTimes('dry2', 'Saigner à blanc ×2', 'bleed', 2),
  dry3: releaseTimes('dry3', 'Saigner à blanc ×3', 'bleed', 3),
  scent: three('lab-a-scent', 'Odeur du sang (critique assuré si l’adversaire saigne)', [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }], { when: [{ type: 'hasStatus', who: 'opponent', status: 'bleed' }] }),
  agony4: reads('agony4', 'Agonie ×4 (4 PV par Poison)', 'poison', 4, 'poison'),
  agonyAll2: releaseTimes('agony-all2', 'Agonie, relâche ×2', 'poison', 2),
  agonyAll3: releaseTimes('agony-all3', 'Agonie, relâche ×3', 'poison', 3),
}
/** Le producteur du build réel, sur le 4 nu (rien pour qui l'a déjà) */
const PRODUCER_82: Record<string, string | undefined> = { gorak: 'open-wound', elaria: 'open-wound', brokk: undefined, ervald: undefined, naraxes: undefined, thaldrin: 'frost-aura' }
const built82 = (who: string, key: string, consumer?: CharacterEvent): LabIdea => {
  const producer = PRODUCER_82[who] ? skillOf(PRODUCER_82[who]!) : undefined
  return {
    ...g82(who, key, consumer ?? SKILLS_80.leech),
    id: `a82-${key}-${who}`,
    name: `${consumer ? `${consumer.name} gravée` : 'Build seul'}${producer ? `, ${producer.name} sur le 4` : ''} (${who})`,
    apply: (c: Character) => c.adjusted({ events: [...c.events, ...(producer ? [onFour(producer)] : []), ...(consumer ? [consumer] : [])] }),
  }
}
const SERIES_82: LabIdea[] = [
  g82('ysolde', 'votiveFlat24', SKILLS_82.votiveFlat24),
  ...BLOOD.flatMap((w) => [
    ...(PRODUCER_82[w] ? [built82(w, 'base')] : []),
    ...[SKILLS_80.leech, SKILLS_82.leech2, SKILLS_82.dry2, SKILLS_82.dry3, SKILLS_82.scent, SKILLS_81.reopen2].map((c) => built82(w, c.id, c)),
  ]),
  ...POISON.flatMap((w) => [
    ...(PRODUCER_82[w] ? [built82(w, 'base')] : []),
    ...[SKILLS_81.agony3, SKILLS_82.agony4, SKILLS_82.agonyAll2, SKILLS_82.agonyAll3].map((c) => built82(w, c.id, c)),
  ]),
]

/* --- Série 83 : les consommatrices de la série 82 restent sous la bande hors d'Ervald et de Brokk (la ressource est rare au
   moment du 3). Deux pistes : Odeur du sang, un critique assuré si l'adversaire saigne, avec des dégâts en plus (l'intensité du
   Critique assuré, comme l'Œil de faucon aiguisé) ; Morsure, « ce coup ×2 si l'adversaire est empoisonné » (la consommatrice qui
   frappe, par condition, comme la Curée). --- */
const g83 = engrave(83, STATUSES_82)
const scent = (power: number): CharacterEvent =>
  three(`lab-a-scent${power}`, `Odeur du sang, critique assuré +${power}`, [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1, power }], { when: [{ type: 'hasStatus', who: 'opponent', status: 'bleed' }] })
const bite = (times: number): CharacterEvent =>
  three(`lab-a-bite${times}`, `Morsure ×${times} si empoisonné`, [], { relation: 'modify', hitMultiplier: times, when: [{ type: 'hasStatus', who: 'opponent', status: 'poison' }] })
const built83 = (who: string, consumer: CharacterEvent): LabIdea => ({ ...built82(who, consumer.id, consumer), ...g83(who, consumer.id, consumer), apply: built82(who, consumer.id, consumer).apply, id: `a83-${consumer.id}-${who}` })
const SERIES_83: LabIdea[] = [
  ...BLOOD.flatMap((w) => [scent(2), scent(4)].map((c) => built83(w, c))),
  ...POISON.flatMap((w) => [bite(2), bite(3)].map((c) => built83(w, c))),
]

/* --- Série 84 : la Peau de crapaud du registre, aura de départ des trois porteurs du Poison (le 1, la face 2 vanilla). --- */
const SERIES_84: LabIdea[] = POISON.map((w) => ({ ...start(w, 'start-toad-reg', skillOf('toad-skin')), id: `a84-start-toad-${w}`, series: 84 }))

export const CONTENT_A: readonly LabIdea[] = [...SERIES_80, ...SERIES_81, ...SERIES_82, ...SERIES_83, ...SERIES_84]
