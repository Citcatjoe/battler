/*
 * Décision D11 de l'utilisateur (2026-10-30, docs/RETOUR_30.md) : tout chiffre affiché vaut 2 ou plus ; une ressource
 * qui arrive au compte-gouttes se regroupe (un compteur visible, puis un gros effet), à force égale. Agent PersosB : les
 * briques à « 1 » que l'étude PERSOS_RETOUR_30 § 2 n'avait pas mesurées. Statuts d'essai `labD…` ; rien n'est livré.
 *
 * Série 160 : Aura de décoction (Naraxes, au départ).
 * Série 161 : Aura de sainteté (Ysolde, au départ).
 * Série 162 : Aura du brasier (Thaldrin, au départ).
 * Série 163 : Foudre, 4 éclairs de 1 → 2 éclairs de 2 (gravée sur le 3, chez Thaldrin, Fanchon, Ysolde).
 * Série 164 : Peau de pierre, le Poing de pierre à +2 (Brokk, au départ ; gravée chez Morgrut et Aldric).
 * Série 165 : après la livraison (le registre), les départs touchés et le Cuir épais de Morgrut (D19).
 */
import type { CharacterEvent, Effect } from '../../src/game/events'
import { ALL_SKILLS, CHARACTERS } from '../../src/game/roster'
import type { StatusDef, StatusId } from '../../src/game/statuses'
import { withKit, type Kit } from './aura-vision'
import type { LabIdea } from './ideas'

const id = (s: string) => s as StatusId
const skill = (sid: string): CharacterEvent => {
  const found = ALL_SKILLS.find((e) => e.id === sid)
  if (!found) throw new Error(`D11 : compétence inconnue (${sid})`)
  return found
}
const foe = { target: 'opponent' as const }
const pose = (status: StatusId | string, stacks: number, rest: Partial<Extract<Effect, { type: 'applyStatus' }>> = {}): Effect => ({ type: 'applyStatus', status: status as StatusId, stacks, ...rest })
const aura = (name: string, rest: Partial<StatusDef>): StatusDef => ({
  name,
  look: { aura: 'rgba(148,163,184,0.5)' },
  polarity: 'positive',
  family: 'affliction',
  summary: name,
  describe: () => name,
  badge: () => '',
  counter: 'stacks',
  stacking: 'add',
  ...rest,
})
/** Un compteur sur le porteur : `at` charges, puis ses effets (relatifs au porteur), et il repart de zéro */
const tally = (name: string, at: number, effects: Effect[]): StatusDef => ({
  name,
  polarity: 'positive',
  family: 'tempo',
  summary: name,
  describe: () => name,
  badge: (s) => `${s.stacks}/${at}`,
  counter: 'stacks',
  stacking: 'add',
  threshold: { at, effects: () => effects },
})
const auraSkill = (sid: string, name: string, status: StatusId, trigger: CharacterEvent['trigger'] = 'naturalOne'): CharacterEvent => ({ id: sid, name, trigger, effects: [pose(status, 1)] })

const STATUSES_D: Record<string, StatusDef> = {}
const EVENTS: Record<string, CharacterEvent> = {}
/** Une aura d'essai qui nourrit un compteur, au début de son tour (`turn`), à la fin (`end`) ou à chaque coup qui touche (`hit`) */
function counted(key: string, name: string, when: 'turn' | 'end' | 'hit', at: number, effects: Effect[]): CharacterEvent {
  const t = id(`labD${key}Tally`)
  const a = id(`labD${key}`)
  STATUSES_D[t] = tally(`${name} (le compte)`, at, effects)
  const feed = () => [pose(t, 1)]
  STATUSES_D[a] = aura(name, when === 'turn' ? { onTurnStart: feed } : when === 'end' ? { onTurnEnd: feed } : { reactions: { hit: feed } })
  return (EVENTS[key] = auraSkill(`lab-d-${key}`, name, a))
}

const poison = (n: number) => [pose('poison', n, foe)]
const heal = (n: number): Effect[] => [{ type: 'heal', amount: n }]
const burn = (n: number) => [pose('burn', n, { ...foe, fromStatus: { status: 'burn' as StatusId, who: 'opponent', factor: 1 } })]

const DECOCTION = {
  d42: counted('Deco42', 'Décoction : tous les 2 coups qui touchent, Poison 4', 'hit', 2, poison(4)),
  d52: counted('Deco52', 'Décoction : tous les 2 coups qui touchent, Poison 5', 'hit', 2, poison(5)),
  d63: counted('Deco63', 'Décoction : tous les 3 coups qui touchent, Poison 6', 'hit', 3, poison(6)),
  d22: counted('Deco21', 'Décoction : Poison 2 à chaque coup qui touche', 'hit', 1, poison(2)),
}
const HOLY = {
  h42: counted('Holy42', 'Sainteté : tous les 2 tours, +4 PV', 'end', 2, heal(4)),
  h32: counted('Holy32', 'Sainteté : tous les 2 tours, +3 PV', 'end', 2, heal(3)),
  h63: counted('Holy63', 'Sainteté : tous les 3 tours, +6 PV', 'end', 3, heal(6)),
  h21: counted('Holy21', 'Sainteté : +2 PV à chaque tour', 'end', 1, heal(2)),
}
const BRASIER = {
  b22: counted('Bras22', 'Brasier : tous les 2 tours, Brûlure +2', 'turn', 2, burn(2)),
  b32: counted('Bras32', 'Brasier : tous les 2 tours, Brûlure +3', 'turn', 2, burn(3)),
  b33: counted('Bras33', 'Brasier : tous les 3 tours, Brûlure +3', 'turn', 3, burn(3)),
}

const THUNDER = (amount: number, hits: number): CharacterEvent => ({
  ...skill('thunderbolt'),
  id: `lab-d-bolt-${hits}x${amount}`,
  name: `Foudre (${hits} éclairs de ${amount})`,
  effects: [{ type: 'damage', amount, hits, target: 'opponent', source: 'lightning' }],
})

const FIST = (bonus: number, armor: number): CharacterEvent => {
  const fist = id(`labDFist${bonus}`)
  STATUSES_D[fist] = {
    name: `Poing de pierre (+${bonus})`,
    look: { glow: 'rgba(220,38,38,0.8)' },
    polarity: 'positive',
    family: 'power',
    summary: 'Poing',
    describe: () => 'Poing',
    badge: () => `+${bonus}`,
    stacking: 'refresh',
    maxStacks: 1,
    modifyOutgoing: (damage) => damage + bonus,
    whileShielded: true,
    reactions: { shieldBroken: () => [] },
    spentOnReaction: true,
  }
  return { ...skill('stoneskin'), id: `lab-d-skin-${bonus}-${armor}`, name: `Peau de pierre (armure ${armor}, Poing +${bonus})`, effects: [pose('bonusArmor', armor), pose(fist, 1)] }
}

const byId = (cid: string) => CHARACTERS.find((c) => c.id === cid)!
function idea(series: number, character: string, key: string, name: string, kit: Kit, before?: Kit): LabIdea {
  return {
    series,
    id: `d${series}-${character}-${key}`,
    character,
    name: `${byId(character).name} : ${name}`,
    schema: 'Dé de départ',
    family: 'Retour du 30 (D11)',
    pitch: name,
    apply: (c) => withKit(c, kit),
    ...(before && { world: (c) => (c.id === character ? withKit(c, before) : c) }),
    watch: [kit.one, kit.two, ...(kit.engraved ?? [])].filter((e): e is CharacterEvent | string => e !== undefined).map((e) => (typeof e === 'string' ? e : e.id)),
    statuses: STATUSES_D,
  }
}

const SERIES_160 = Object.entries(DECOCTION).map(([k, e]) => idea(160, 'naraxes', k, `${e.name} (avant : 1, 2 puis 3 par coup)`, { one: e }))
const SERIES_161 = Object.entries(HOLY).map(([k, e]) => idea(161, 'ysolde', k, `${e.name} (avant : +1 puis +2 par tour)`, { one: e }))
const SERIES_162 = Object.entries(BRASIER).map(([k, e]) => idea(162, 'thaldrin', k, `${e.name} (avant : +1 par tour ; sur le 1, au lieu du Ciel)`, { one: e }, { one: 'brasier' }))
const SERIES_163 = ['thaldrin', 'fanchon', 'ysolde', 'naraxes'].flatMap((who) => [
  idea(163, who, 'bolt2x2', 'Foudre 2 éclairs de 2, gravée sur le 3 (avant : 4 de 1)', { engraved: [THUNDER(2, 2)] }, { engraved: ['thunderbolt'] }),
  idea(163, who, 'bolt3x2', 'Foudre 3 éclairs de 2, gravée sur le 3 (avant : 4 de 1)', { engraved: [THUNDER(2, 3)] }, { engraved: ['thunderbolt'] }),
  idea(163, who, 'bolt-r2-2x4', 'Foudre rang II : 2 éclairs de 4 (avant : 4 de 2)', { engraved: [THUNDER(4, 2)] }, { engraved: [THUNDER(2, 4)] }),
  idea(163, who, 'bolt-r2-2x3', 'Foudre rang II : 2 éclairs de 3 (avant : 4 de 2)', { engraved: [THUNDER(3, 2)] }, { engraved: [THUNDER(2, 4)] }),
])
const SERIES_164 = [
  ...([[2, 6], [2, 5], [2, 4]] as const).map(([b, a]) => idea(164, 'brokk', `fist${b}-armor${a}`, `Peau de pierre : armure ${a}, Poing +${b} (avant : armure 6, Poing +1)`, { two: FIST(b, a) })),
  ...(['morgrut', 'aldric'] as const).flatMap((who) =>
    ([[2, 6], [2, 5]] as const).map(([b, a]) => idea(164, who, `fist${b}-armor${a}`, `Peau de pierre gravée : armure ${a}, Poing +${b} (avant : celle du registre)`, { engraved: [FIST(b, a)] }, { engraved: ['stoneskin'] })),
  ),
]

/* --- Série 165 : après la livraison, les départs du registre (kit vide : avant = après, le taux absolu) et le Cuir épais
   de Morgrut contre la Rancœur du registre. --- */
const SERIES_165 = [
  idea(165, 'morgrut', 'thick-hide', 'Cuir épais sur le 1 (avant : la Rancœur)', { one: 'thick-hide' }, { one: 'rancor' }),
  idea(165, 'morgrut', 'power', 'Aura de puissance (départ du registre)', {}),
  idea(165, 'thaldrin', 'storm', "Aura d'orage (départ du registre)", {}),
  idea(165, 'thaldrin', 'brasier', 'Aura du brasier (départ du registre)', { one: 'brasier' }, { one: 'brasier' }),
  idea(165, 'fanchon', 'ballad', 'Aura de ballade (départ du registre)', {}),
  idea(165, 'naraxes', 'decoction', 'Aura de décoction (départ du registre)', {}),
  idea(165, 'ysolde', 'holy', 'Aura de sainteté (départ du registre)', {}),
  idea(165, 'brokk', 'thorns', "Aura d'épines et Peau de pierre (départ du registre)", {}),
]

export const D11_30: readonly LabIdea[] = [...SERIES_160, ...SERIES_161, ...SERIES_162, ...SERIES_163, ...SERIES_164, ...SERIES_165]
