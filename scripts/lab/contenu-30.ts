/*
 * Laboratoire du retour du 2026-10-30 (agent PropContenu, docs/etudes/CONTENU_RETOUR_30.md) : séries 140 à 149.
 * - 140 et 141 : la Braise captive refaite (une recharge, la Brûlure), en combat court (roster nu) et long (PV ×1,6) ;
 * - 142 et 143 : les reliques à usage très restreint, leurs charges remplacées par une recharge, court et long ;
 * - 144 : des reliques pour les trous des maîtrises (Sang, Poison, Fureur, Ombre, Lumière, Magie) ;
 * - 145 : des sorts de Magie gravés sur le 3 nu de ses porteurs (et de Thaldrin parti du Brasier).
 * Une relique d'essai n'entre pas au registre : elle est portée par le personnage le temps du combat. Avec ou sans
 * relique, le personnage garde l'endurcissement de sa récompense (+2 PV max), comme `npm run relics`. Rien n'est livré.
 */
import type { Character } from '../../src/game/character'
import { DAMAGE_SOURCES } from '../../src/game/damage'
import { faceTrigger, type CharacterEvent } from '../../src/game/events'
import { getRelic, type Relic } from '../../src/game/relics'
import { CHARACTER_IDS, createCharacter } from '../../src/game/roster'
import { STATUSES, type StatusDef, type StatusId } from '../../src/game/statuses'
import type { LabIdea } from './ideas'

const id = (s: string) => s as StatusId

/* ---------- Mondes ---------- */

/** Combat long : tout le roster à 1,6 fois ses PV (le combat nu passe d'environ 7 à 11 actions par combattant) */
const LONG = (c: Character) => c.adjusted({ stats: { maxHp: Math.round(c.baseStats.maxHp * 1.6) } })
/** Thaldrin parti du Brasier (sa seconde aura), les autres inchangés */
const BRASIER = (c: Character) => (c.id === 'thaldrin' ? createCharacter('thaldrin', { aura: 'brasier' }) : c)

/* ---------- Statuts d'essai ---------- */

const plain = (name: string, rest: Partial<StatusDef>): StatusDef => ({
  ...STATUSES.overcharge,
  modifyDirect: undefined,
  name,
  summary: name,
  describe: () => name,
  ...rest,
})

const STATUSES_C30: Record<string, StatusDef> = {
  // La Focale : chaque impact d'un sort (source magique : foudre, feu, lumière, vent) fait +1 ou +2
  labFocus1: plain('Focale +1', { modifyDirect: (n, _s, source) => (DAMAGE_SOURCES[source].magical ? n + 1 : n) }),
  labFocus2: plain('Focale +2', { modifyDirect: (n, _s, source) => (DAMAGE_SOURCES[source].magical ? n + 2 : n) }),
  // L'Égide d'orage : ses prochains coups reçus foudroient l'attaquant (une charge par coup reçu)
  labStormWard: {
    ...STATUSES.toadSkin,
    name: "Égide d'orage",
    summary: "Ses prochains coups reçus foudroient l'attaquant.",
    describe: () => "Ses prochains coups reçus foudroient l'attaquant",
    reactions: { hurt: () => [{ type: 'damage', amount: 2, hits: 2, target: 'opponent', source: 'lightning' }] },
  },
  // La Grâce (Lumière) : ses prochains soins nourrissent son coup suivant (une charge par soin)
  labGrace: {
    ...STATUSES.faithShield,
    name: 'Grâce',
    summary: 'Chacun de ses prochains soins lui donne +4 Ferveur.',
    describe: () => 'Ses prochains soins lui donnent +4 Ferveur',
    reactions: { healed: () => [{ type: 'applyStatus', status: 'momentum', stacks: 4 }] },
  },
}

/* ---------- Reliques d'essai ---------- */

const relic = (rid: string, name: string, rest: Partial<Relic>): Relic => ({ id: `lab-${rid}`, name, flavor: name, ...rest })
const without = <K extends keyof Relic>(r: Relic, ...keys: K[]): Relic => {
  const copy = { ...r }
  for (const k of keys) delete copy[k]
  return copy
}

const EMBER = getRelic('caged-ember')
const fire = (amount: number, hits: number) => ({ type: 'damage' as const, amount, hits, target: 'opponent' as const, source: 'fire' as const })
const EMBERS: Relic[] = [
  EMBER,
  { ...without(EMBER, 'charges'), id: 'lab-ember-cd4', name: 'Braise : 3 × 2, 4e tour puis tous les 4', cooldown: 4 },
  { ...without(EMBER, 'charges'), id: 'lab-ember-cd3', name: 'Braise : 2 × 2, 3e tour puis tous les 3', trigger: { type: 'turn', turn: 3 }, cooldown: 3, effects: [fire(2, 2)] },
  { ...without(EMBER, 'charges'), id: 'lab-ember-burn3', name: 'Braise : Brûlure 3, 3e tour puis tous les 3', trigger: { type: 'turn', turn: 3 }, cooldown: 3, effects: [{ type: 'applyStatus', status: 'burn', stacks: 3, target: 'opponent' }] },
  {
    ...without(EMBER, 'charges'),
    id: 'lab-ember-fire-burn',
    name: 'Braise : 3 × 2 et Brûlure 2, 4e tour puis tous les 4',
    cooldown: 4,
    effects: [fire(2, 3), { type: 'applyStatus', status: 'burn', stacks: 2, target: 'opponent' }],
  },
]

const GEODE = getRelic('split-geode')
const SALVE = getRelic('bonesetter-salve')
const CONCH = getRelic('wind-conch')
const BRACER = getRelic('spiked-bracer')
const BELL = getRelic('opening-bell')
const RESTRICTED: Relic[] = [
  GEODE,
  { ...without(GEODE, 'charges'), id: 'lab-geode-cd3', name: 'Géode : +4, recharge 3', cooldown: 3 },
  { ...without(GEODE, 'charges'), id: 'lab-geode-cd4', name: 'Géode : +4, recharge 4', cooldown: 4 },
  SALVE,
  { ...without(SALVE, 'charges'), id: 'lab-salve-cd2', name: 'Onguent : +3 PV, recharge 2', cooldown: 2 },
  { ...without(SALVE, 'charges'), id: 'lab-salve-cd3', name: 'Onguent : +3 PV, recharge 3', cooldown: 3 },
  CONCH,
  { ...without(CONCH, 'charges'), id: 'lab-conch-cd3', name: 'Conque : 3 × 2, recharge 3', cooldown: 3 },
  BRACER,
  { ...without(BRACER, 'charges'), id: 'lab-bracer-cd4', name: 'Brassard : Riposte, 1er tour puis tous les 4', cooldown: 4 },
  BELL,
  { ...without(BELL, 'charges'), id: 'lab-bell-cd5', name: 'Cloche : critique assuré, 1er tour puis tous les 5', cooldown: 5 },
]

/** Les reliques des trous (série 144) et leurs hôtes */
const GAPS: { relic: Relic; hosts: readonly string[] }[] = [
  // Sang : aucune relique ne pose de Saignement (le Dard et le Briquet posent Poison et Brûlure)
  { relic: relic('hook', 'Hameçon rouillé : 2 Saignement sur un 6', { trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'bleed', stacks: 2, target: 'opponent' }] }), hosts: CHARACTER_IDS },
  { relic: relic('hook3', 'Hameçon rouillé : 3 Saignement sur un 6', { trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'bleed', stacks: 3, target: 'opponent' }] }), hosts: CHARACTER_IDS },
  // Poison : un amplificateur (la Virulence en relique), tous les 3 tours
  {
    relic: relic('mortar', 'Mortier : le Poison double, +2, tous les 3 tours', {
      trigger: { type: 'turn', turn: 3 },
      cooldown: 3,
      when: [{ type: 'hasStatus', who: 'opponent', status: 'poison' }],
      effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, target: 'opponent', fromStatus: { status: 'poison', who: 'opponent', factor: 1 } }],
    }),
    hosts: ['ervald', 'naraxes', 'thaldrin'],
  },
  // Fureur : le critique nourrit le gros coup suivant
  { relic: relic('ram-horn', 'Corne de bélier : +5 Ferveur lors d’un critique', { trigger: { type: 'strike', on: 'crit' }, effects: [{ type: 'applyStatus', status: 'momentum', stacks: 5 }] }), hosts: CHARACTER_IDS },
  // Ombre : l'esquive vole (le Larcin en relique), recharge 3
  {
    relic: relic('cutpurse', 'Gant de tire-laine : vole un bonus lors d’une esquive, recharge 3', {
      trigger: { type: 'strike', on: 'dodge' },
      cooldown: 3,
      effects: [{ type: 'cleanse', polarity: 'positive', target: 'opponent', count: 1, steal: id('pilfer') }],
    }),
    hosts: CHARACTER_IDS,
  },
  // Lumière : le soin reçu blesse (la Sentence en relique), recharge 2
  { relic: relic('exorcist', 'Cierge de l’exorciste : 3 dégâts sacrés à chaque soin reçu, recharge 2', { trigger: { type: 'strike', on: 'healed' }, cooldown: 2, effects: [{ type: 'damage', amount: 3, target: 'opponent', source: 'holy' }] }), hosts: ['ysolde', 'ervald', 'fanchon', 'brokk'] },
  // Magie : feu et foudre liés ; puis la Focale (la Surtension de tous les sorts), comparée au Paratonnerre
  {
    relic: relic('thunderstone', 'Pierre de tonnerre : 2 éclairs de 2 au début de ses tours si l’adversaire brûle, recharge 2', {
      trigger: { type: 'turn', turn: 1 },
      cooldown: 2,
      when: [{ type: 'hasStatus', who: 'opponent', status: 'burn' }],
      effects: [{ type: 'damage', amount: 2, hits: 2, target: 'opponent', source: 'lightning' }],
    }),
    hosts: ['thaldrin'],
  },
  { relic: relic('focus1', 'Focale : +1 à chaque impact de sort', { trigger: { type: 'turn', turn: 1 }, charges: 1, effects: [{ type: 'applyStatus', status: id('labFocus1'), stacks: 1 }] }), hosts: ['thaldrin', 'ysolde', 'fanchon'] },
  { relic: relic('focus2', 'Focale : +2 à chaque impact de sort', { trigger: { type: 'turn', turn: 1 }, charges: 1, effects: [{ type: 'applyStatus', status: id('labFocus2'), stacks: 1 }] }), hosts: ['thaldrin', 'ysolde', 'fanchon'] },
  { relic: getRelic('lightning-rod'), hosts: ['thaldrin', 'ysolde', 'fanchon'] },
]

const withRelic = (series: number, character: string, r: Relic, world?: (c: Character) => Character, tag = ''): LabIdea => ({
  series,
  id: `c30-${series}-${character}-${r.id}${tag}`,
  character,
  name: `${character} : ${r.name}${tag}`,
  schema: 'Relique',
  family: 'Reliques',
  pitch: r.name,
  apply: (c) => c.withRelics([...c.relics, r]),
  watch: [],
  statuses: STATUSES_C30,
  ...(world && { world }),
})

/* ---------- Sorts de Magie (série 145) ---------- */

const SPELLS: CharacterEvent[] = [
  // Le feu et la foudre se répondent : l'éclair lit la Brûlure
  {
    id: 'lab-arc',
    name: 'Arc électrique : 3 PV, +1 par Brûlure',
    nature: 'arcane',
    trigger: 'naturalThree',
    effects: [{ type: 'damage', amount: 3, target: 'opponent', source: 'lightning', fromStatus: { status: 'burn', who: 'opponent', factor: 1 } }],
  },
  {
    id: 'lab-fireball',
    name: 'Boule de feu : 5 PV et Brûlure 2',
    nature: 'arcane',
    trigger: 'naturalThree',
    effects: [
      { type: 'damage', amount: 5, target: 'opponent', source: 'fire' },
      { type: 'applyStatus', status: 'burn', stacks: 2, target: 'opponent' },
    ],
  },
  {
    id: 'lab-fireball4',
    name: 'Boule de feu : 4 PV et Brûlure 2',
    nature: 'arcane',
    trigger: 'naturalThree',
    effects: [
      { type: 'damage', amount: 4, target: 'opponent', source: 'fire' },
      { type: 'applyStatus', status: 'burn', stacks: 2, target: 'opponent' },
    ],
  },
  {
    id: 'lab-arc2',
    name: 'Arc électrique : 3 PV, +2 par Brûlure',
    nature: 'arcane',
    trigger: 'naturalThree',
    effects: [{ type: 'damage', amount: 3, target: 'opponent', source: 'lightning', fromStatus: { status: 'burn', who: 'opponent', factor: 2 } }],
  },
  // Une défense de Magie : ses 2 prochains coups reçus foudroient l'attaquant (2 éclairs de 2)
  { id: 'lab-storm-ward', name: "Égide d'orage : 2 coups reçus, 2 éclairs de 2", nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: id('labStormWard'), stacks: 2 }] },
]

const engrave = (character: string, e: CharacterEvent, world?: (c: Character) => Character, tag = ''): LabIdea => ({
  series: 145,
  id: `c30-145-${character}-${e.id}${tag}`,
  character,
  name: `${character}${tag} : ${e.name} gravée`,
  schema: 'Gravure',
  family: 'Maîtrises',
  pitch: e.name,
  apply: (c) => c.adjusted({ events: [...c.events, { ...e, trigger: faceTrigger(3) }] }),
  watch: [e.id],
  statuses: STATUSES_C30,
  ...(world && { world }),
})

/* ---------- Second passage (séries 146 à 148) : les variantes réglées après les séries 140 à 145 ---------- */

const SALVE_CD = without(SALVE, 'charges')
const GEODE_CD = without(GEODE, 'charges')
const EMBER_CD = without(EMBER, 'charges')
/** Recharges réglées, mesurées court (146) et long (147) */
const TUNED: Relic[] = [
  { ...EMBER_CD, id: 'lab-ember-2x2-cd4', name: 'Braise : 2 × 2, 4e tour puis tous les 4', cooldown: 4, effects: [fire(2, 2)] },
  { ...EMBER_CD, id: 'lab-ember-burn2-cd4', name: 'Braise : Brûlure 2, 4e tour puis tous les 4', cooldown: 4, effects: [{ type: 'applyStatus', status: 'burn', stacks: 2, target: 'opponent' }] },
  {
    ...EMBER_CD,
    id: 'lab-ember-feeds',
    name: 'Braise : 2 braises de 2, +1 chacune par Brûlure, 4e tour puis tous les 4',
    cooldown: 4,
    effects: [{ ...fire(2, 2), fromStatus: { status: 'burn', who: 'opponent', factor: 1 } }],
  },
  { ...GEODE_CD, id: 'lab-geode-3-cd4', name: 'Géode : +3, recharge 4', cooldown: 4, effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 3 }] },
  { ...GEODE_CD, id: 'lab-geode-4-cd5', name: 'Géode : +4, recharge 5', cooldown: 5 },
  { ...SALVE_CD, id: 'lab-salve-4-cd4', name: 'Onguent : +4 PV, recharge 4', cooldown: 4, effects: [{ type: 'heal', amount: 4 }] },
  { ...without(BRACER, 'charges'), id: 'lab-bracer-cd6', name: 'Brassard : Riposte, 1er tour puis tous les 6', cooldown: 6 },
]
/** Les reliques des trous, réglées (série 148) */
const GAPS_TUNED: { relic: Relic; hosts: readonly string[]; world?: (c: Character) => Character }[] = [
  ...[4, 5].map((cd) => ({
    relic: relic(`mortar-cd${cd}`, `Mortier : le Poison double, tous les ${cd} tours`, {
      trigger: { type: 'turn', turn: cd },
      cooldown: cd,
      when: [{ type: 'hasStatus', who: 'opponent', status: 'poison' }],
      effects: [{ type: 'applyStatus', status: 'poison', stacks: 0, target: 'opponent', fromStatus: { status: 'poison', who: 'opponent', factor: 1 } }],
    }),
    hosts: ['ervald', 'naraxes'],
  })),
  { relic: relic('cutpurse-free', 'Gant de tire-laine : vole un bonus à chaque esquive', { trigger: { type: 'strike', on: 'dodge' }, effects: [{ type: 'cleanse', polarity: 'positive', target: 'opponent', count: 1, steal: id('pilfer') }] }), hosts: CHARACTER_IDS },
  {
    relic: relic('cutpurse-hurt', 'Gant de tire-laine : vole un bonus lors d’un coup reçu, recharge 3', {
      trigger: { type: 'strike', on: 'hurt' },
      cooldown: 3,
      effects: [{ type: 'cleanse', polarity: 'positive', target: 'opponent', count: 1, steal: id('pilfer') }],
    }),
    hosts: CHARACTER_IDS,
  },
  { relic: relic('exorcist-3-cd3', 'Cierge : 3 dégâts sacrés à chaque soin reçu, recharge 3', { trigger: { type: 'strike', on: 'healed' }, cooldown: 3, effects: [{ type: 'damage', amount: 3, target: 'opponent', source: 'holy' }] }), hosts: ['ysolde', 'fanchon', 'ervald'] },
  { relic: relic('exorcist-2-cd2', 'Cierge : 2 dégâts sacrés à chaque soin reçu, recharge 2', { trigger: { type: 'strike', on: 'healed' }, cooldown: 2, effects: [{ type: 'damage', amount: 2, target: 'opponent', source: 'holy' }] }), hosts: ['ysolde', 'fanchon', 'ervald'] },
  ...[
    { cd: 3, hits: 2, amount: 2 },
    { cd: 2, hits: 1, amount: 3 },
  ].map(({ cd, hits, amount }) => ({
    relic: relic(`thunderstone-${hits}x${amount}-cd${cd}`, `Pierre de tonnerre : ${hits} × ${amount} si l’adversaire brûle, recharge ${cd}`, {
      trigger: { type: 'turn', turn: 1 },
      cooldown: cd,
      when: [{ type: 'hasStatus', who: 'opponent', status: 'burn' }],
      effects: [{ type: 'damage', amount, ...(hits > 1 && { hits }), target: 'opponent', source: 'lightning' }],
    }),
    hosts: ['thaldrin'],
    world: BRASIER,
  })),
]

/** Troisième passage (série 149) : le Mortier à charges posées (sans pose, `stacks: 0` ne part pas), l'Onguent, l'Ombre */
const LAST: { relic: Relic; hosts: readonly string[] }[] = [
  {
    relic: relic('mortar-2-cd5', 'Mortier : le Poison double, +2, tous les 5 tours', {
      trigger: { type: 'turn', turn: 5 },
      cooldown: 5,
      when: [{ type: 'hasStatus', who: 'opponent', status: 'poison' }],
      effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, target: 'opponent', fromStatus: { status: 'poison', who: 'opponent', factor: 1 } }],
    }),
    hosts: ['ervald', 'naraxes', 'thaldrin'],
  },
  { relic: { ...SALVE_CD, id: 'lab-salve-3-cd4', name: 'Onguent : +3 PV, recharge 4', cooldown: 4 }, hosts: CHARACTER_IDS },
  { relic: relic('black-chalice', 'Calice noir : +1 Vol de vie lors d’un critique, recharge 4', { trigger: { type: 'strike', on: 'crit' }, cooldown: 4, effects: [{ type: 'applyStatus', status: 'lifesteal', stacks: 1 }] }), hosts: CHARACTER_IDS },
]

const MAGIC = ['thaldrin', 'ysolde', 'fanchon']

/** Lumière (série 149) : ses soins nourrissent ses coups, pour Ysolde, seule porteuse de la Lumière */
const GRACE: CharacterEvent = { id: 'lab-grace', name: 'Grâce : ses 3 prochains soins, +4 Ferveur chacun', nature: 'arcane', trigger: 'naturalThree', effects: [{ type: 'applyStatus', status: id('labGrace'), stacks: 3 }] }

export const CONTENU_30: readonly LabIdea[] = [
  ...CHARACTER_IDS.flatMap((h) => EMBERS.map((r) => withRelic(140, h, r))),
  ...CHARACTER_IDS.flatMap((h) => EMBERS.map((r) => withRelic(141, h, r, LONG, ' (long)'))),
  ...CHARACTER_IDS.flatMap((h) => RESTRICTED.map((r) => withRelic(142, h, r))),
  ...CHARACTER_IDS.flatMap((h) => RESTRICTED.map((r) => withRelic(143, h, r, LONG, ' (long)'))),
  ...GAPS.flatMap(({ relic: r, hosts }) => hosts.map((h) => withRelic(144, h, r))),
  ...GAPS.filter((g) => g.hosts.includes('thaldrin') && g.hosts.length <= 3).map(({ relic: r }) => withRelic(144, 'thaldrin', r, BRASIER, ' (Brasier)')),
  ...MAGIC.flatMap((h) => SPELLS.map((s) => engrave(h, s))),
  ...SPELLS.map((s) => engrave('thaldrin', s, BRASIER, ' (Brasier)')),
  ...CHARACTER_IDS.flatMap((h) => TUNED.map((r) => withRelic(146, h, r))),
  ...CHARACTER_IDS.flatMap((h) => TUNED.map((r) => withRelic(147, h, r, LONG, ' (long)'))),
  ...GAPS_TUNED.flatMap(({ relic: r, hosts, world }) => hosts.map((h) => withRelic(148, h, r, world, world ? ' (Brasier)' : ''))),
  ...LAST.flatMap(({ relic: r, hosts }) => hosts.map((h) => withRelic(149, h, r))),
  ...CHARACTER_IDS.map((h) => withRelic(149, h, LAST[1].relic, LONG, ' (long)')),
  { ...engrave('ysolde', GRACE), series: 149 },
  { ...engrave('ysolde', GRACE, (c) => (c.id === 'ysolde' ? createCharacter('ysolde', { aura: 'judgement' }) : c), ' (Jugement)'), series: 149 },
]
