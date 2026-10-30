/*
 * Retour du 2026-10-28 (A1, A10, A11, A12, A14 et les ressentis par personnage), agent AuraVision : la refonte des auras et
 * des boucles de build, à proposer avant tout code (docs/REFONTE_AURAS.md). Statuts d'essai `labV…`, construits avec les
 * crochets du moteur. Rien ici n'est livré au jeu. Mesuré sur une copie figée de la 0.127.0 (`git archive d68472b`) : le
 * moteur bougeait le même jour (A6, A7) ; sur l'arbre de travail, les taux absolus ne sont pas comparables.
 *
 * Série 100 : les départs d'aujourd'hui (chaque aura de départ sur le 1, la face 2 du roster), l'état des lieux.
 * Série 101 : les auras refaites, au départ (sur le 1, la face 2 d'aujourd'hui sauf mention).
 * Série 102 : les faces 2 (Aldric, Morgrut), le Duo (A11), les pièces de Naraxes et leur critique (A14).
 * Série 103 : les directions de build (l'aura, sa face 2 et deux briques gravées sur le 3 et le 4), avant → après.
 * Série 104 : la refonte pour tous, premier jet (W1 : la structure ; W2 : les « 1 » à 2), puis les secondes auras.
 * Série 105 : A12, une valeur forte sans cumul ; réglages (Visée, Ciel, Brasier, Jugement, Ivresse, Rancœur).
 * Série 106 : A12 par la montée (1, 1, 2, 2, 3), Plaie ouverte au critique, les formes du Duo sans boucle (A7, A11).
 * Séries 107 à 109 : la refonte réglée pour tous (W3, W4, W5 = la proposition finale), et les secondes auras.
 */
import type { Character } from '../../src/game/character'
import { faceTrigger, rollFace, type CharacterEvent, type Effect } from '../../src/game/events'
import { ALL_SKILLS, CHARACTERS } from '../../src/game/roster'
import { charges, STATUSES, type Status, type StatusDef, type StatusId } from '../../src/game/statuses'
import type { LabIdea } from './ideas'

const id = (s: string) => s as StatusId
const skill = (sid: string): CharacterEvent => {
  const found = ALL_SKILLS.find((e) => e.id === sid)
  if (!found) throw new Error(`AuraVision : compétence inconnue (${sid})`)
  return found
}
/** Une aura d'essai : le halo d'une aura (la règle du 3e tour la reconnaît), aucun crochet hérité */
const aura = (name: string, rest: Partial<StatusDef>): StatusDef => ({
  ...STATUSES.sidestep,
  modifyStats: undefined,
  name,
  summary: name,
  describe: () => name,
  badge: (s) => `+${charges(s)}`,
  stacking: 'add',
  ...rest,
})
/** Un statut d'essai sans halo (une ressource, une charge) */
const plain = (name: string, rest: Partial<StatusDef>): StatusDef => ({
  ...STATUSES.weakened,
  modifyOutgoing: undefined,
  polarity: 'positive',
  name,
  summary: name,
  describe: () => name,
  badge: (s) => String(s.stacks),
  stacking: 'add',
  counter: 'stacks',
  ...rest,
})
const coin = (name: string, heads: Effect[]): StatusDef => plain(name, { family: 'fortune', mechanic: 'skill', stacking: 'refresh', maxStacks: 1, coinToss: { heads } })
const pose = (status: StatusId | string, stacks: number, rest: Partial<Extract<Effect, { type: 'applyStatus' }>> = {}): Effect => ({ type: 'applyStatus', status: status as StatusId, stacks, ...rest })
const foe = { target: 'opponent' as const }

const S = {
  // Chance : la Visée (Elaria, la montée esquive → critique → multiplicateur)
  aim: id('labVAim'),
  feintAim: id('labVFeintAim'),
  feintAimHit: id('labVFeintAimHit'),
  feintAimCrit: id('labVFeintAimCrit'),
  // Sang : les épines à 2 et 3
  thorns2: id('labVThorns2'),
  thorns3: id('labVThorns3'),
  // Rempart : le bastion (l'armure vidée frappe)
  bastion: id('labVBastion'),
  bastion4: id('labVBastion4'),
  vendettaFull: id('labVVendettaFull'),
  vendettaHit: id('labVVendettaHit'),
  riposteFull: id('labVRiposteFull'),
  rancor2: id('labVRancor2'),
  // Poison
  poison2: id('labVPoison2'),
  decoction2: id('labVDecoction2'),
  // Lumière
  holy2: id('labVHoly2'),
  holy3: id('labVHoly3'),
  judgement: id('labVJudgement'),
  sentenceCharges: id('labVSentenceCharges'),
  faithCharges: id('labVFaithCharges'),
  // Fureur
  powerGrow: id('labVPowerGrow'),
  // Magie
  skyRise3: id('labVSkyRise3'),
  skyRise4: id('labVSkyRise4'),
  skyRise5: id('labVSkyRise5'),
  brasier: id('labVBrasier'),
  brasier2: id('labVBrasier2'),
  refrain: id('labVRefrain'),
  refrainHeal: id('labVRefrainHeal'),
  note: id('labVNote'),
  noteHeal: id('labVNoteHeal'),
  // Chance : la Veine brute (un coup de plus, pas un jet)
  veinRaw: id('labVVeinRaw'),
  // Le Duo : non récursif (un verrou le temps de sa rafale)
  duoLock: id('labVDuoLock'),
  // Pièces (Naraxes) et critique (A14)
  shieldCoin: id('labVShieldCoin'),
  volleyCoin: id('labVVolleyCoin'),
  hexCoin: id('labVHexCoin'),
  critHeads: id('labVCritHeads'),
  critHeadsMark: id('labVCritHeadsMark'),
  critDouble: id('labVCritDouble'),
  critDoubleMark: id('labVCritDoubleMark'),
}

/** La Visée : +0,5 au multiplicateur de son prochain critique par charge ; elle part avec ce critique */
const AIM_STEP = 0.5
const strike = (n: number): Effect => pose('bloodFrenzyStrike', n)

const STATUSES_V: Record<string, StatusDef> = {
  [S.aim]: plain('Visée', { family: 'precision', modifyStats: (st, s) => ({ ...st, critMultiplier: st.critMultiplier + AIM_STEP * s.stacks }), reactions: { crit: () => [] }, spentOnReaction: true }),
  // Feinte refaite : chaque esquive, +1 au multiplicateur (deux charges de Visée), sans critique assuré
  [S.feintAim]: aura('Feinte (Visée par esquive)', { family: 'precision', modifyStats: (st, s) => ({ ...st, dodgeChance: st.dodgeChance + 0.05 * charges(s) }), reactions: { dodge: () => [pose(S.aim, 2)] } }),
  // … et +0,5 par coup qui touche : le tir se règle à chaque coup, l'Œil de faucon ou un critique le lâche
  [S.feintAimHit]: aura('Feinte (Visée par esquive et par coup)', { family: 'precision', modifyStats: (st, s) => ({ ...st, dodgeChance: st.dodgeChance + 0.05 * charges(s) }), reactions: { dodge: () => [pose(S.aim, 2)], hit: () => [pose(S.aim, 1)] } }),
  // … la Feinte d'aujourd'hui (critique assuré) et la Visée par esquive
  [S.feintAimCrit]: aura('Feinte (critique assuré et Visée)', { family: 'precision', modifyStats: (st, s) => ({ ...st, dodgeChance: st.dodgeChance + 0.05 * charges(s) }), reactions: { dodge: () => [pose('guaranteedCrit', 1), pose(S.aim, 2)] } }),

  [S.thorns2]: aura("Aura d'épines (2)", { family: 'affliction', reactions: { hurt: (s) => [pose('bleed', 2 * charges(s), foe)] } }),
  [S.thorns3]: aura("Aura d'épines (3)", { family: 'affliction', reactions: { hurt: (s) => [pose('bleed', 3 * charges(s), foe)] } }),

  // Bastion : son armure temporaire vidée, l'attaquant perd 3 PV et il en regagne 2
  [S.bastion]: aura('Bastion (3 dégâts, +2 armure)', { family: 'guard', reactions: { shieldBroken: (s) => [{ type: 'damage', amount: 3 * charges(s), target: 'opponent', source: 'strike' }, pose('bonusArmor', 2)] } }),
  [S.bastion4]: aura('Bastion (4 dégâts)', { family: 'guard', reactions: { shieldBroken: (s) => [{ type: 'damage', amount: 4 * charges(s), target: 'opponent', source: 'strike' }] } }),

  // Vindicte refaite : ses renvois sont entiers (la Riposte d'essai le porte), +4 Ferveur par renvoi
  [S.vendettaFull]: aura('Vindicte (renvois entiers, +4 Ferveur)', { family: 'power', reactions: { reflected: () => [pose('momentum', 4)] } }),
  // Vindicte : chaque renvoi frappe de 3 de plus (dégâts directs), +4 Ferveur
  [S.vendettaHit]: aura('Vindicte (+3 par renvoi, +4 Ferveur)', { family: 'power', reactions: { reflected: () => [{ type: 'damage', amount: 3, target: 'opponent', source: 'strike' }, pose('momentum', 4)] } }),
  [S.riposteFull]: { ...STATUSES.riposte, name: 'Riposte (entière)', reflectsHit: 1 },
  [S.rancor2]: aura('Rancœur (2)', { family: 'retaliation', reactions: { hurt: (s) => [pose('momentum', 2 * charges(s))] } }),

  [S.poison2]: aura('Aura de poison (2)', { family: 'affliction', onTurnStart: (s) => [pose('poison', 2 * charges(s), foe)] }),
  [S.decoction2]: aura('Aura de décoction (2)', { family: 'affliction', reactions: { hit: (s) => [pose('poison', 2 * charges(s), foe)] } }),

  [S.holy2]: aura('Aura de sainteté (2)', { family: 'healing', maxStacks: 2, onTurnEnd: (s) => [{ type: 'heal', amount: 2 * charges(s) }] }),
  [S.holy3]: aura('Aura de sainteté (3)', { family: 'healing', maxStacks: 2, onTurnEnd: (s) => [{ type: 'heal', amount: 3 * charges(s) }] }),
  // Jugement : une marque, que sa Purification lit (l'événement d'essai `lab-v-judgement-fear`)
  [S.judgement]: aura('Jugement', { family: 'tempo' }),
  // Les consommatrices de soin, en compétences à charges (Sentence, Bouclier de foi)
  [S.sentenceCharges]: plain('Sentence (3 soins)', { family: 'affliction', decays: true, reactions: { healed: () => [{ type: 'damage', amount: 4, target: 'opponent', source: 'holy' }] } }),
  [S.faithCharges]: plain('Bouclier de foi (3 soins)', { family: 'guard', decays: true, reactions: { healed: () => [pose('bonusArmor', 3)] } }),

  // Aura de puissance refaite : +2, puis +1 par gros coup, jusqu'à +6 (5 charges)
  [S.powerGrow]: aura('Aura de puissance (+1 par gros coup)', { family: 'power', maxStacks: 5, modifyOutgoing: (d, s) => d + 1 + s.stacks, reactions: { heavy: () => [pose(S.powerGrow, 1)] } }),

  // Ciel d'orage montant : au début de chacun de ses tours, un éclair par charge, puis une charge de plus (plafond 3 à 5)
  [S.skyRise3]: aura("Ciel d'orage (montant, 3)", { family: 'affliction', maxStacks: 3, onTurnStart: (s) => [{ type: 'damage', amount: 1, hits: s.stacks, target: 'opponent', source: 'lightning' }, pose(S.skyRise3, 1)] }),
  [S.skyRise4]: aura("Ciel d'orage (montant, 4)", { family: 'affliction', maxStacks: 4, onTurnStart: (s) => [{ type: 'damage', amount: 1, hits: s.stacks, target: 'opponent', source: 'lightning' }, pose(S.skyRise4, 1)] }),
  [S.skyRise5]: aura("Ciel d'orage (montant, 5)", { family: 'affliction', maxStacks: 5, onTurnStart: (s) => [{ type: 'damage', amount: 1, hits: s.stacks, target: 'opponent', source: 'lightning' }, pose(S.skyRise5, 1)] }),
  // Brasier : la marque ; l'événement d'essai `lab-v-brasier` attise la Brûlure au début de chacun de ses tours
  [S.brasier]: aura('Brasier (+1)', { family: 'affliction' }),
  [S.brasier2]: aura('Brasier (+2)', { family: 'affliction' }),

  // Ballade refaite : chaque coup qui touche, une note ; à la 4e, le refrain (4 dégâts en quatre notes, et 4 PV)
  [S.refrain]: aura('Ballade (refrain)', { family: 'healing', reactions: { hit: () => [pose(S.note, 1)] } }),
  [S.note]: plain('Note', { family: 'tempo', reactions: { hit: (s) => (s.stacks >= 3 ? [{ type: 'damage', amount: 1, hits: 4, target: 'opponent', source: 'wind' }, { type: 'heal', amount: 4 }] : (undefined as unknown as Effect[])) }, spentOnReaction: true }),
  // … et 1 PV par coup, comme aujourd'hui
  [S.refrainHeal]: aura('Ballade (1 PV et refrain)', { family: 'healing', reactions: { hit: () => [{ type: 'heal', amount: 1 }, pose(S.noteHeal, 1)] } }),
  [S.noteHeal]: plain('Note', { family: 'tempo', reactions: { hit: (s) => (s.stacks >= 3 ? [{ type: 'damage', amount: 1, hits: 4, target: 'opponent', source: 'wind' }] : (undefined as unknown as Effect[])) }, spentOnReaction: true }),

  [S.veinRaw]: aura('Veine (un coup de plus par 6)', { family: 'fortune', reactions: { naturalMax: (s) => [strike(charges(s))] } }),

  [S.duoLock]: plain('Duo (verrou)', { family: 'tempo', expiresAt: 'turnEnd' }),

  // Pièces nouvelles (Naraxes) : pile, de l'armure ; pile, deux coups ; pile, un gros malus
  [S.shieldCoin]: coin('Pièce de bouclier', [pose('bonusArmor', 8)]),
  [S.volleyCoin]: coin('Pièce de la rafale', [strike(2)]),
  [S.hexCoin]: coin('Pièce ensorcelée', [pose('weakened', 3, { ...foe, turns: 2 })]),
  // A14, (a) le critique fait pile : un critique pose une chance de pile, le temps de sa pièce
  [S.critHeads]: aura('Pile critique (le critique fait pile)', { family: 'fortune', reactions: { crit: () => [pose(S.critHeadsMark, 1, { turns: 1 })] } }),
  [S.critHeadsMark]: plain('Pile assurée', { family: 'fortune', stacking: 'refresh', maxStacks: 1, headsChance: 1, expiresAt: 'turnEnd', reactions: { heads: () => [] }, spentOnReaction: true }),
}

// A14, (b) pile critique : un critique double l'effet de sa pièce (une marque qui rejoue l'effet de pile, ici la Pièce
// vert-de-gris : 5 Poison de plus ; la Pièce maudite étourdit, un effet qui ne se double pas)
STATUSES_V[S.critDouble] = aura('Pile critique (effet doublé)', { family: 'fortune', reactions: { crit: () => [pose(S.critDoubleMark, 1, { turns: 1 })] } })
STATUSES_V[S.critDoubleMark] = plain('Pile critique', { family: 'fortune', stacking: 'refresh', maxStacks: 1, expiresAt: 'turnEnd', reactions: { heads: () => [pose('poison', 5, foe)] }, spentOnReaction: true })

const auraSkill = (sid: string, name: string, status: StatusId): CharacterEvent => ({ id: sid, name, trigger: 'naturalOne', effects: [pose(status, 1)] })
const A = {
  feintAim: auraSkill('lab-v-feint-aim', 'Feinte (Visée par esquive)', S.feintAim),
  feintAimHit: auraSkill('lab-v-feint-aim-hit', 'Feinte (Visée par esquive et par coup)', S.feintAimHit),
  feintAimCrit: auraSkill('lab-v-feint-aim-crit', 'Feinte (critique assuré et Visée)', S.feintAimCrit),
  thorns2: auraSkill('lab-v-thorns2', "Aura d'épines (2)", S.thorns2),
  thorns3: auraSkill('lab-v-thorns3', "Aura d'épines (3)", S.thorns3),
  bastion: auraSkill('lab-v-bastion', 'Bastion (3 dégâts, +2 armure)', S.bastion),
  bastion4: auraSkill('lab-v-bastion4', 'Bastion (4 dégâts)', S.bastion4),
  vendettaFull: auraSkill('lab-v-vendetta-full', 'Vindicte (renvois entiers)', S.vendettaFull),
  vendettaHit: auraSkill('lab-v-vendetta-hit', 'Vindicte (+3 par renvoi)', S.vendettaHit),
  rancor2: auraSkill('lab-v-rancor2', 'Rancœur (2)', S.rancor2),
  poison2: auraSkill('lab-v-poison2', 'Aura de poison (2)', S.poison2),
  decoction2: auraSkill('lab-v-decoction2', 'Aura de décoction (2)', S.decoction2),
  holy2: auraSkill('lab-v-holy2', 'Aura de sainteté (2)', S.holy2),
  holy3: auraSkill('lab-v-holy3', 'Aura de sainteté (3)', S.holy3),
  judgement: auraSkill('lab-v-judgement', 'Jugement', S.judgement),
  powerGrow: auraSkill('lab-v-power-grow', 'Aura de puissance (+1 par gros coup)', S.powerGrow),
  skyRise3: auraSkill('lab-v-sky3', "Ciel d'orage (montant, 3)", S.skyRise3),
  skyRise4: auraSkill('lab-v-sky4', "Ciel d'orage (montant, 4)", S.skyRise4),
  skyRise5: auraSkill('lab-v-sky5', "Ciel d'orage (montant, 5)", S.skyRise5),
  brasier: auraSkill('lab-v-brasier-aura', 'Brasier (+1)', S.brasier),
  brasier2: auraSkill('lab-v-brasier2-aura', 'Brasier (+2)', S.brasier2),
  refrain: auraSkill('lab-v-refrain', 'Ballade (refrain)', S.refrain),
  refrainHeal: auraSkill('lab-v-refrain-heal', 'Ballade (1 PV et refrain)', S.refrainHeal),
  veinRaw: auraSkill('lab-v-vein-raw', 'Veine (un coup de plus)', S.veinRaw),
  critHeads: auraSkill('lab-v-crit-heads', 'Pile critique', S.critHeads),
}

/** Les événements d'essai qui accompagnent une aura (hors du dé) */
const stokeBy = (n: number): Effect => pose('burn', n, { ...foe, fromStatus: { status: 'burn', who: 'opponent', factor: 1 } })
const SUPPORT = {
  brasier: { id: 'lab-v-brasier', name: 'Brasier', trigger: 'turnStart', when: [{ type: 'hasStatus', who: 'self', status: S.brasier }, { type: 'hasStatus', who: 'opponent', status: 'burn' }], effects: [stokeBy(1)] } as CharacterEvent,
  brasier2: { id: 'lab-v-brasier2', name: 'Brasier', trigger: 'turnStart', when: [{ type: 'hasStatus', who: 'self', status: S.brasier2 }, { type: 'hasStatus', who: 'opponent', status: 'burn' }], effects: [stokeBy(2)] } as CharacterEvent,
  judgement: { id: 'lab-v-judgement-fear', name: 'Jugement', trigger: 'naturalTwo', when: [{ type: 'hasStatus', who: 'self', status: S.judgement }], effects: [pose('fear', 1, foe)] } as CharacterEvent,
}

/** Les faces d'essai */
const F = {
  riposteFull: { ...skill('riposte'), id: 'lab-v-riposte-full', name: 'Riposte (entière)', effects: [pose(S.riposteFull, 2)] } as CharacterEvent,
  massue2: { ...skill('stunning-blow'), id: 'lab-v-massue2', name: 'Coup de massue ×2 (étourdit une fois)', hitMultiplier: 2, limit: undefined, effects: [] } as CharacterEvent,
  duo1: { ...skill('duo'), id: 'lab-v-duo1', name: 'Duo (un dé de plus)', effects: [pose('duo', 1)] } as CharacterEvent,
  duo2: { ...skill('duo'), id: 'lab-v-duo2', name: 'Duo (deux dés de plus)', effects: [pose('duo', 2)] } as CharacterEvent,
  duo3Lock: { ...skill('duo'), id: 'lab-v-duo3-lock', name: 'Duo (trois dés, sans relance)', when: [{ type: 'lacksStatus', who: 'self', status: S.duoLock }], effects: [pose('duo', 3), pose(S.duoLock, 1, { turns: 2 })] } as CharacterEvent,
  duo2Lock: { ...skill('duo'), id: 'lab-v-duo2-lock', name: 'Duo (deux dés, sans relance)', when: [{ type: 'lacksStatus', who: 'self', status: S.duoLock }], effects: [pose('duo', 2), pose(S.duoLock, 1, { turns: 2 })] } as CharacterEvent,
  duoRaw: { ...skill('duo'), id: 'lab-v-duo-raw', name: 'Duo (deux coups bruts tout de suite)', effects: [strike(2)] } as CharacterEvent,
  duoRaw3: { ...skill('duo'), id: 'lab-v-duo-raw3', name: 'Duo (trois coups bruts tout de suite)', effects: [strike(3)] } as CharacterEvent,
  shieldCoin: { ...skill('lucky-coin'), id: 'lab-v-shield-coin', name: 'Pièce de bouclier (pile : +8 armure temporaire)', effects: [pose(S.shieldCoin, 1)] } as CharacterEvent,
  volleyCoin: { ...skill('lucky-coin'), id: 'lab-v-volley-coin', name: 'Pièce de la rafale (pile : deux coups de plus)', effects: [pose(S.volleyCoin, 1)] } as CharacterEvent,
  hexCoin: { ...skill('lucky-coin'), id: 'lab-v-hex-coin', name: 'Pièce ensorcelée (pile : −3 à ses coups, 2 tours)', effects: [pose(S.hexCoin, 1)] } as CharacterEvent,
  sentenceCharges: { id: 'lab-v-sentence-charges', name: 'Sentence (ses 3 prochains soins : 4 PV)', trigger: 'naturalThree', effects: [pose(S.sentenceCharges, 3)] } as CharacterEvent,
  faithCharges: { id: 'lab-v-faith-charges', name: 'Bouclier de foi (ses 3 prochains soins : +3 armure)', trigger: 'naturalThree', effects: [pose(S.faithCharges, 3)] } as CharacterEvent,
}

const byId = (cid: string) => CHARACTERS.find((c) => c.id === cid)!
const formOf = (c: Character, face: number) => c.events.find((e) => rollFace(e.trigger) === face)?.form
const onFace = (e: CharacterEvent, face: number, form?: string): CharacterEvent => ({ ...e, trigger: faceTrigger(face), ...(form ? { form } : {}) })

/** Un dé : `one` sur le 1, `two` sur le 2 (la face d'aujourd'hui sans eux), des gravures sur le 3, le 4…, des événements hors du dé */
export interface Kit {
  one?: CharacterEvent | string
  two?: CharacterEvent | string
  engraved?: (CharacterEvent | string)[]
  support?: CharacterEvent[]
  stats?: Parameters<Character['adjusted']>[0]['stats']
}
const of = (e: CharacterEvent | string) => (typeof e === 'string' ? skill(e) : e)
export function withKit(c: Character, kit: Kit): Character {
  const one = kit.one ? onFace(of(kit.one), 1, formOf(c, 1)) : c.events.find((e) => rollFace(e.trigger) === 1)
  const two = kit.two ? onFace(of(kit.two), 2, formOf(c, 2)) : c.events.find((e) => rollFace(e.trigger) === 2)
  const engraved = (kit.engraved ?? []).map((e, i) => onFace({ ...of(e), form: undefined }, 3 + i))
  const events = [...(one ? [one] : []), ...(two ? [two] : []), ...engraved, ...(kit.support ?? [])]
  return c.adjusted({ events, ...(kit.stats && { stats: kit.stats }) })
}

function idea(series: number, character: string, key: string, name: string, kit: Kit, before?: Kit): LabIdea {
  return {
    series,
    id: `v${series}-${character}-${key}`,
    character,
    name: `${byId(character).name} : ${name}`,
    schema: series === 103 ? 'Direction' : 'Dé de départ',
    family: 'Auras',
    pitch: name,
    apply: (c) => withKit(c, kit),
    ...(before && { world: (c: Character) => (c.id === character ? withKit(c, before) : c) }),
    watch: [kit.one, kit.two, ...(kit.engraved ?? []), ...(kit.support ?? [])].filter((e): e is CharacterEvent | string => e !== undefined).map((e) => of(e).id),
    statuses: STATUSES_V,
  }
}

/* --- Série 100 : les départs d'aujourd'hui, chaque aura de départ du roster sur le 1 (l'avant : l'aura par défaut). --- */
const SERIES_100: LabIdea[] = CHARACTERS.flatMap((c) => (c.definition.auras ?? []).slice(1).map((a) => idea(100, c.id, `start-${a}`, `${skill(a).name} sur le 1`, { one: a })))

/* --- Série 101 : les auras refaites, au départ. --- */
const SERIES_101: LabIdea[] = [
  // Elaria : la Visée
  idea(101, 'elaria', 'aim', 'Feinte : chaque esquive, +1 au multiplicateur de son prochain critique', { one: A.feintAim }),
  idea(101, 'elaria', 'aim-hit', 'Feinte : +1 par esquive, +0,5 par coup qui touche', { one: A.feintAimHit }),
  idea(101, 'elaria', 'aim-crit', 'Feinte : critique assuré et +1 par esquive', { one: A.feintAimCrit }),
  // Brokk : les épines à 2 et 3, le bastion
  idea(101, 'brokk', 'thorns2', "Aura d'épines : Saignement 2 par coup reçu", { one: A.thorns2 }),
  idea(101, 'brokk', 'thorns3', "Aura d'épines : Saignement 3 par coup reçu", { one: A.thorns3 }),
  idea(101, 'brokk', 'bastion', 'Bastion : armure vidée, 3 dégâts et +2 armure', { one: A.bastion }),
  idea(101, 'brokk', 'bastion4', 'Bastion : armure vidée, 4 dégâts', { one: A.bastion4 }),
  // Ervald et Naraxes : le Poison à 2
  idea(101, 'ervald', 'poison2', 'Aura de poison : 2 Poison par tour', { one: A.poison2 }),
  idea(101, 'thaldrin', 'poison2', 'Aura de poison : 2 Poison par tour', { one: A.poison2 }),
  idea(101, 'naraxes', 'decoction2', 'Aura de décoction : 2 Poison par coup', { one: A.decoction2 }),
  idea(101, 'naraxes', 'loaded', 'Dé pipé (registre)', { one: 'loaded-die' }),
  // Ysolde : la sainteté à 2 et 3, le Jugement
  idea(101, 'ysolde', 'holy2', 'Aura de sainteté : +2 PV par tour', { one: A.holy2 }),
  idea(101, 'ysolde', 'holy3', 'Aura de sainteté : +3 PV par tour', { one: A.holy3 }),
  idea(101, 'ysolde', 'judgement', 'Jugement : chaque Purification terrifie (Peur)', { one: A.judgement, support: [SUPPORT.judgement] }),
  // Aldric : la Rancœur à 2 (repère)
  idea(101, 'aldric', 'rancor2', 'Rancœur : +2 Ferveur par coup reçu', { one: A.rancor2 }),
  // Morgrut : la Puissance qui monte
  idea(101, 'morgrut', 'power-grow', 'Aura de puissance : +2, +1 par gros coup (+6)', { one: A.powerGrow }),
  idea(101, 'morgrut', 'rancor2', 'Rancœur : +2 Ferveur par coup reçu', { one: A.rancor2 }),
  // Thaldrin : le ciel qui monte, le brasier
  idea(101, 'thaldrin', 'sky3', "Ciel d'orage montant (1, 2, 3 éclairs)", { one: A.skyRise3 }),
  idea(101, 'thaldrin', 'sky4', "Ciel d'orage montant (jusqu'à 4)", { one: A.skyRise4 }),
  idea(101, 'thaldrin', 'sky5', "Ciel d'orage montant (jusqu'à 5)", { one: A.skyRise5 }),
  idea(101, 'thaldrin', 'brasier', 'Brasier : +1 à sa Brûlure chaque tour', { one: A.brasier, support: [SUPPORT.brasier] }),
  idea(101, 'thaldrin', 'brasier2', 'Brasier : +2 à sa Brûlure chaque tour', { one: A.brasier2, support: [SUPPORT.brasier2] }),
  idea(101, 'ysolde', 'sky4', "Ciel d'orage montant (jusqu'à 4)", { one: A.skyRise4 }),
  // Fanchon : le refrain, la Veine brute
  idea(101, 'fanchon', 'refrain', 'Ballade : une note par coup, le refrain à la 4e (4 dégâts, 4 PV)', { one: A.refrain }),
  idea(101, 'fanchon', 'refrain-heal', 'Ballade : 1 PV par coup, et le refrain (4 dégâts)', { one: A.refrainHeal }),
  idea(101, 'fanchon', 'vein-raw', 'Veine : chaque 6, un coup de plus', { one: A.veinRaw }),
]

/* --- Série 102 : les faces 2, le Duo (A11), les pièces (A14). --- */
const SERIES_102: LabIdea[] = [
  // Aldric : la Riposte sur le 2
  idea(102, 'aldric', 'riposte', 'Vindicte / Riposte (à la place de la Rétribution)', { two: 'riposte' }),
  idea(102, 'aldric', 'full', 'Vindicte refaite (renvois entiers, +4 Ferveur) / Riposte', { one: A.vendettaFull, two: F.riposteFull }),
  idea(102, 'aldric', 'hit', 'Vindicte refaite (+3 par renvoi, +4 Ferveur) / Riposte', { one: A.vendettaHit, two: 'riposte' }),
  idea(102, 'aldric', 'full-retri', 'Vindicte refaite (renvois entiers) / Rétribution', { one: A.vendettaFull }),
  // Morgrut : une face 2 de son lore
  idea(102, 'morgrut', 'assault', 'Aura de puissance / Assaut (ce coup ×2)', { two: 'assault' }),
  idea(102, 'morgrut', 'massue', 'Aura de puissance / Coup de massue (registre)', { two: 'stunning-blow' }),
  idea(102, 'morgrut', 'massue2', 'Aura de puissance / Coup de massue ×2', { two: F.massue2 }),
  idea(102, 'morgrut', 'grow-assault', 'Puissance qui monte / Assaut', { one: A.powerGrow, two: 'assault' }),
  idea(102, 'morgrut', 'grow-massue2', 'Puissance qui monte / Coup de massue ×2', { one: A.powerGrow, two: F.massue2 }),
  idea(102, 'morgrut', 'grow-crescendo', 'Puissance qui monte / Crescendo', { one: A.powerGrow }),
  // Fanchon : les formes du Duo
  idea(102, 'fanchon', 'duo1', 'Ballade / Duo à un dé de plus', { two: F.duo1 }),
  idea(102, 'fanchon', 'duo2', 'Ballade / Duo à deux dés de plus', { two: F.duo2 }),
  idea(102, 'fanchon', 'duo3-lock', 'Ballade / Duo à trois dés, sans relance', { two: F.duo3Lock }),
  idea(102, 'fanchon', 'duo2-lock', 'Ballade / Duo à deux dés, sans relance', { two: F.duo2Lock }),
  idea(102, 'fanchon', 'duo-raw', 'Ballade / Duo : deux coups bruts tout de suite', { two: F.duoRaw }),
  idea(102, 'fanchon', 'duo-raw3', 'Ballade / Duo : trois coups bruts tout de suite', { two: F.duoRaw3 }),
  idea(102, 'fanchon', 'refrain-duo2-lock', 'Ballade refrain / Duo à deux dés, sans relance', { one: A.refrain, two: F.duo2Lock }),
  idea(102, 'fanchon', 'refrain-duo-raw3', 'Ballade refrain / Duo : trois coups bruts', { one: A.refrain, two: F.duoRaw3 }),
  idea(102, 'fanchon', 'refrainheal-duo2-lock', 'Ballade (1 PV et refrain) / Duo à deux dés, sans relance', { one: A.refrainHeal, two: F.duo2Lock }),
  // Naraxes : la famille des pièces, gravée sur le 3 (Dé pipé sur le 1, Pile ou face sur le 2)
  ...([['shield', F.shieldCoin], ['volley', F.volleyCoin], ['hex', F.hexCoin], ['lucky', 'lucky-coin'], ['cursed', 'cursed-coin'], ['verdigris', 'verdigris-coin']] as const).map(([k, e]) =>
    idea(102, 'naraxes', `coin-${k}`, `Dé pipé / Pile ou face, ${of(e).name} gravée`, { one: 'loaded-die', engraved: [e] }, { one: 'loaded-die' }),
  ),
  // A14 : le critique et la pièce, Dé pipé / Pile ou face et la Pièce maudite gravée
  idea(102, 'naraxes', 'crit-heads', 'A14 (a) : un critique fait pile (Dé pipé / Pile ou face, Pièce maudite)', { one: 'loaded-die', engraved: ['cursed-coin'], support: [{ id: 'lab-v-crit-heads-rule', name: 'Pile critique', trigger: 'combatStart', effects: [pose(S.critHeads, 1)] }] }, { one: 'loaded-die', engraved: ['cursed-coin'] }),
  idea(102, 'naraxes', 'crit-double', 'A14 (b) : pile sur un critique, effet doublé (Pièce vert-de-gris)', { one: 'loaded-die', engraved: ['verdigris-coin'], support: [{ id: 'lab-v-crit-double-rule', name: 'Pile critique', trigger: 'combatStart', effects: [pose(S.critDouble, 1)] }] }, { one: 'loaded-die', engraved: ['verdigris-coin'] }),
  idea(102, 'naraxes', 'crit-heads-verdigris', 'A14 (a) : un critique fait pile (Pièce vert-de-gris)', { one: 'loaded-die', engraved: ['verdigris-coin'], support: [{ id: 'lab-v-crit-heads-rule', name: 'Pile critique', trigger: 'combatStart', effects: [pose(S.critHeads, 1)] }] }, { one: 'loaded-die', engraved: ['verdigris-coin'] }),
]

/* --- Série 103 : les directions de build. L'avant : l'aura par défaut d'aujourd'hui, sa face 2, les mêmes gravures. --- */
const dir = (character: string, key: string, name: string, kit: Kit, beforeOne?: CharacterEvent | string, beforeTwo?: CharacterEvent | string) =>
  idea(103, character, key, name, kit, { engraved: kit.engraved, ...(beforeOne && { one: beforeOne }), ...(beforeTwo && { two: beforeTwo }) })
const SERIES_103: LabIdea[] = [
  dir('elaria', 'aim', 'Visée + Esquive améliorée, Coup de chance', { one: A.feintAim, engraved: ['evasion', 'lucky-strike'] }),
  dir('elaria', 'aim-hit', 'Visée (esquive et coup) + Esquive améliorée, Coup de chance', { one: A.feintAimHit, engraved: ['evasion', 'lucky-strike'] }),
  dir('elaria', 'frenzy', 'Ivresse du sang + Pourfendre, Odeur du sang', { one: 'blood-frenzy', engraved: ['cleave', 'blood-scent'] }),
  dir('brokk', 'thorns2', 'Épines 2 + Curée, Odeur du sang', { one: A.thorns2, engraved: ['quarry', 'blood-scent'] }),
  dir('brokk', 'bastion', 'Bastion + Onde de choc, Riposte', { one: A.bastion, engraved: ['shockwave', 'riposte'] }),
  dir('ervald', 'poison2', 'Aura de poison 2 + Virulence, Morsure', { one: A.poison2, engraved: ['virulence', 'venom-bite'] }),
  dir('ervald', 'dread', 'Effroi + Peur, Confiscation', { one: 'dread', engraved: ['fear', 'seal-theft'] }),
  dir('ysolde', 'holy2', 'Sainteté 2 + Sentence et Bouclier de foi à charges', { one: A.holy2, engraved: [F.sentenceCharges, F.faithCharges] }),
  dir('ysolde', 'holy3', 'Sainteté 3 + Sentence et Bouclier de foi à charges', { one: A.holy3, engraved: [F.sentenceCharges, F.faithCharges] }),
  dir('ysolde', 'judgement', 'Jugement + Prière, Éclair aveuglant', { one: A.judgement, support: [SUPPORT.judgement], engraved: ['prayer', 'blinding'] }),
  dir('naraxes', 'loaded', 'Dé pipé + Pièce porte-bonheur, Pièce maudite', { one: 'loaded-die', engraved: ['lucky-coin', 'cursed-coin'] }),
  dir('naraxes', 'decoction2', 'Décoction 2 + Morsure, Virulence', { one: A.decoction2, engraved: ['venom-bite', 'virulence'] }),
  dir('aldric', 'full', 'Vindicte (renvois entiers) / Riposte + Rétribution, Onde de choc', { one: A.vendettaFull, two: F.riposteFull, engraved: ['retribution', 'shockwave'] }),
  dir('aldric', 'pilfer', 'Larcin / Riposte + Confiscation, Peur', { one: 'pilfer', two: 'riposte', engraved: ['seal-theft', 'fear'] }),
  dir('morgrut', 'grow-assault', 'Puissance qui monte / Assaut + Soliste, Brise-garde', { one: A.powerGrow, two: 'assault', engraved: ['soloist', 'guard-break'] }),
  dir('morgrut', 'grow-massue2', 'Puissance qui monte / Massue ×2 + Soliste, Brise-garde', { one: A.powerGrow, two: F.massue2, engraved: ['soloist', 'guard-break'] }),
  dir('thaldrin', 'brasier', 'Brasier + Attiser, Embrasement', { one: A.brasier, support: [SUPPORT.brasier], engraved: ['stoke', 'conflagration'] }),
  dir('fanchon', 'refrain', 'Ballade refrain / Duo 2 sans relance + Coup de chance, Foudre', { one: A.refrain, two: F.duo2Lock, engraved: ['lucky-strike', 'thunderbolt'] }, undefined, undefined),
  dir('fanchon', 'vein', 'Veine brute / Duo 2 sans relance + Coup de chance, Foudre', { one: A.veinRaw, two: F.duo2Lock, engraved: ['lucky-strike', 'thunderbolt'] }, undefined, undefined),
]

/* --- Série 105 : A12, une valeur forte sans cumul (le 1 ne l'empile plus), et les réglages de la série 101. --- */
const V = {
  thornsN2: id('labVThornsN2'),
  poisonN2: id('labVPoisonN2'),
  poisonN3: id('labVPoisonN3'),
  decoctionN2: id('labVDecoctionN2'),
  holyN2: id('labVHolyN2'),
  holyN3: id('labVHolyN3'),
  skyN2: id('labVSkyN2'),
  skySlow: id('labVSkySlow'),
  skyRise2: id('labVSkyRise2'),
  balladN2: id('labVBalladN2'),
  aimQ: id('labVAimQ'),
  feintAimQ: id('labVFeintAimQ'),
  feintAimHalf: id('labVFeintAimHalf'),
  brasierAlways: id('labVBrasierAlways'),
  fault3: id('labVFault3'),
  fault4: id('labVFault4'),
  judge3: id('labVJudge3'),
  judge4: id('labVJudge4'),
  frenzy1: id('labVFrenzy1'),
  rancorN2: id('labVRancorN2'),
}
/** Une faute (Jugement) : posée sur l'attaquant ; à son N-ième coup qui touche, il perd sa prochaine action, et ses fautes partent */
const fault = (name: string, n: number): StatusDef => ({ ...plain(name, { family: 'tempo', reactions: { hit: (s) => (s.stacks >= n - 1 ? [pose('fear', 1)] : (undefined as unknown as Effect[])) }, spentOnReaction: true }), polarity: 'negative' })
Object.assign(STATUSES_V, {
  [V.thornsN2]: aura("Aura d'épines (2, sans cumul)", { family: 'affliction', maxStacks: 1, reactions: { hurt: () => [pose('bleed', 2, foe)] } }),
  [V.poisonN2]: aura('Aura de poison (2, sans cumul)', { family: 'affliction', maxStacks: 1, onTurnStart: () => [pose('poison', 2, foe)] }),
  [V.poisonN3]: aura('Aura de poison (3, sans cumul)', { family: 'affliction', maxStacks: 1, onTurnStart: () => [pose('poison', 3, foe)] }),
  [V.decoctionN2]: aura('Aura de décoction (2, sans cumul)', { family: 'affliction', maxStacks: 1, reactions: { hit: () => [pose('poison', 2, foe)] } }),
  [V.holyN2]: aura('Aura de sainteté (2, sans cumul)', { family: 'healing', maxStacks: 1, onTurnEnd: () => [{ type: 'heal', amount: 2 }] }),
  [V.holyN3]: aura('Aura de sainteté (3, sans cumul)', { family: 'healing', maxStacks: 1, onTurnEnd: () => [{ type: 'heal', amount: 3 }] }),
  [V.skyN2]: aura("Ciel d'orage (2 éclairs, sans cumul)", { family: 'affliction', maxStacks: 1, onTurnStart: () => [{ type: 'damage', amount: 1, hits: 2, target: 'opponent', source: 'lightning' }] }),
  // L'orage monte d'un éclair tous les deux tours : 1, 1, 2, 2, 3, 3
  [V.skySlow]: aura("Ciel d'orage (montant lent, 3)", { family: 'affliction', maxStacks: 6, onTurnStart: (s) => [{ type: 'damage', amount: 1, hits: Math.ceil(s.stacks / 2), target: 'opponent', source: 'lightning' }, pose(V.skySlow, 1)] }),
  [V.skyRise2]: aura("Ciel d'orage (montant, 2)", { family: 'affliction', maxStacks: 2, onTurnStart: (s) => [{ type: 'damage', amount: 1, hits: s.stacks, target: 'opponent', source: 'lightning' }, pose(V.skyRise2, 1)] }),
  [V.balladN2]: aura('Ballade (2, sans cumul)', { family: 'healing', maxStacks: 1, reactions: { hit: () => [{ type: 'heal', amount: 2 }] } }),
  // Visée au quart : chaque charge vaut +0,25 au multiplicateur ; une esquive en pose quatre (+1), un coup qui touche une (+0,25)
  [V.aimQ]: plain('Visée', { family: 'precision', modifyStats: (st, s) => ({ ...st, critMultiplier: st.critMultiplier + 0.25 * s.stacks }), reactions: { crit: () => [] }, spentOnReaction: true }),
  [V.feintAimQ]: aura('Feinte (Visée : +1 par esquive, +0,25 par coup)', { family: 'precision', modifyStats: (st, s) => ({ ...st, dodgeChance: st.dodgeChance + 0.05 * charges(s) }), reactions: { dodge: () => [pose(V.aimQ, 4)], hit: () => [pose(V.aimQ, 1)] } }),
  // … +0,5 par esquive et par coup qui touche
  [V.feintAimHalf]: aura('Feinte (Visée : +0,5 par esquive et par coup)', { family: 'precision', modifyStats: (st, s) => ({ ...st, dodgeChance: st.dodgeChance + 0.05 * charges(s) }), reactions: { dodge: () => [pose(S.aim, 1)], hit: () => [pose(S.aim, 1)] } }),
  [V.brasierAlways]: aura('Brasier (attise ou allume)', { family: 'affliction' }),
  [V.fault3]: fault('Faute (3)', 3),
  [V.fault4]: fault('Faute (4)', 4),
  [V.judge3]: aura('Jugement (Peur à la 3e faute)', { family: 'tempo', reactions: { hurt: () => [pose(V.fault3, 1, foe)] } }),
  [V.judge4]: aura('Jugement (Peur à la 4e faute)', { family: 'tempo', reactions: { hurt: () => [pose(V.fault4, 1, foe)] } }),
  [V.frenzy1]: aura('Ivresse du sang (un coup par critique)', { family: 'tempo', reactions: { crit: (s) => [strike(charges(s))] } }),
  [V.rancorN2]: aura('Rancœur (2, sans cumul)', { family: 'retaliation', maxStacks: 1, reactions: { hurt: () => [pose('momentum', 2)] } }),
} satisfies Record<string, StatusDef>)
const B = Object.fromEntries(Object.entries(V).map(([k, status]) => [k, auraSkill(`lab-v-${k}`, STATUSES_V[status].name, status)])) as Record<keyof typeof V, CharacterEvent>
const BRASIER_ALWAYS: CharacterEvent = { id: 'lab-v-brasier-always', name: 'Brasier', trigger: 'turnStart', when: [{ type: 'hasStatus', who: 'self', status: V.brasierAlways }], effects: [stokeBy(1)] }
const SERIES_105: LabIdea[] = [
  idea(105, 'brokk', 'thorns-n2', "Aura d'épines : Saignement 2, sans cumul", { one: B.thornsN2 }),
  idea(105, 'ervald', 'poison-n2', 'Aura de poison : 2 par tour, sans cumul', { one: B.poisonN2 }),
  idea(105, 'ervald', 'poison-n3', 'Aura de poison : 3 par tour, sans cumul', { one: B.poisonN3 }),
  idea(105, 'thaldrin', 'poison-n2', 'Aura de poison : 2 par tour, sans cumul', { one: B.poisonN2 }),
  idea(105, 'naraxes', 'decoction-n2', 'Aura de décoction : 2 par coup, sans cumul', { one: B.decoctionN2 }),
  idea(105, 'ysolde', 'holy-n2', 'Aura de sainteté : +2 PV par tour, sans cumul', { one: B.holyN2 }),
  idea(105, 'ysolde', 'holy-n3', 'Aura de sainteté : +3 PV par tour, sans cumul', { one: B.holyN3 }),
  idea(105, 'thaldrin', 'sky-n2', "Ciel d'orage : 2 éclairs par tour, sans cumul", { one: B.skyN2 }),
  idea(105, 'thaldrin', 'sky-slow', "Ciel d'orage montant lent (1, 1, 2, 2, 3)", { one: B.skySlow }),
  idea(105, 'thaldrin', 'sky-rise2', "Ciel d'orage montant (1, puis 2)", { one: B.skyRise2 }),
  idea(105, 'ysolde', 'sky-slow', "Ciel d'orage montant lent (1, 1, 2, 2, 3)", { one: B.skySlow }),
  idea(105, 'fanchon', 'ballad-n2', 'Ballade : 2 PV par coup, sans cumul', { one: B.balladN2 }),
  idea(105, 'elaria', 'aim-q', 'Feinte : Visée +1 par esquive, +0,25 par coup', { one: B.feintAimQ }),
  idea(105, 'elaria', 'aim-half', 'Feinte : Visée +0,5 par esquive et par coup', { one: B.feintAimHalf }),
  idea(105, 'thaldrin', 'brasier-always', 'Brasier : chaque tour, +1 à sa Brûlure (ou Brûlure 1)', { one: B.brasierAlways, support: [BRASIER_ALWAYS] }),
  idea(105, 'ysolde', 'judge3', "Jugement : chaque coup reçu, une faute à l'attaquant ; à la 3e, la Peur", { one: B.judge3 }),
  idea(105, 'ysolde', 'judge4', "Jugement : chaque coup reçu, une faute ; à la 4e, la Peur", { one: B.judge4 }),
  idea(105, 'elaria', 'frenzy1', 'Ivresse du sang : un coup de plus par critique', { one: B.frenzy1 }),
  idea(105, 'elaria', 'frenzy', 'Ivresse du sang (registre : deux coups)', { one: 'blood-frenzy' }),
  idea(105, 'gorak', 'frenzy1', 'Ivresse du sang : un coup de plus par critique', { one: B.frenzy1 }),
  idea(105, 'morgrut', 'rancor-n2', 'Rancœur : +2 Ferveur par coup reçu, sans cumul', { one: B.rancorN2 }),
  idea(105, 'aldric', 'rancor-n2', 'Rancœur : +2 Ferveur par coup reçu, sans cumul', { one: B.rancorN2 }),
]

/* --- Série 106 : A12 par la montée (l'aura part à 1 et gagne un cran tous les deux déclenchements, 3 au plus ; le 1 la
   fait monter d'un cran), la Plaie ouverte au critique, la Visée plus basse, le Ciel plafonné à 2, les formes du Duo sans
   relance (A11, sur la règle A7). --- */
const R = {
  thornsRise: id('labVThornsRise'),
  poisonRise: id('labVPoisonRise'),
  decoctionRise: id('labVDecoctionRise'),
  holyRise: id('labVHolyRise'),
  skySlow2: id('labVSkySlow2'),
  critWound3: id('labVCritWound3'),
  critWound4: id('labVCritWound4'),
  aimLow: id('labVFeintAimLow'),
  duoSpread: id('labVDuoSpread'),
  duoSpreadLock: id('labVDuoSpreadLock'),
}
/** Le cran d'une aura qui monte : 1, 1, 2, 2, 3 (six charges au plus) */
const rise = (s: Status) => Math.ceil(s.stacks / 2)
Object.assign(STATUSES_V, {
  [R.thornsRise]: aura("Aura d'épines (montante)", { family: 'affliction', maxStacks: 6, reactions: { hurt: (s) => [pose('bleed', rise(s), foe), pose(R.thornsRise, 1)] } }),
  [R.poisonRise]: aura('Aura de poison (montante)', { family: 'affliction', maxStacks: 6, onTurnStart: (s) => [pose('poison', rise(s), foe), pose(R.poisonRise, 1)] }),
  [R.decoctionRise]: aura('Aura de décoction (montante)', { family: 'affliction', maxStacks: 6, reactions: { hit: (s) => [pose('poison', rise(s), foe), pose(R.decoctionRise, 1)] } }),
  [R.holyRise]: aura('Aura de sainteté (montante)', { family: 'healing', maxStacks: 6, onTurnEnd: (s) => [{ type: 'heal', amount: rise(s) }, pose(R.holyRise, 1)] }),
  [R.skySlow2]: aura("Ciel d'orage (montant lent, 2)", { family: 'affliction', maxStacks: 4, onTurnStart: (s) => [{ type: 'damage', amount: 1, hits: rise(s), target: 'opponent', source: 'lightning' }, pose(R.skySlow2, 1)] }),
  [R.critWound3]: aura('Plaie ouverte (Saignement 3 par critique)', { family: 'affliction', reactions: { crit: (s) => [pose('bleed', 3 * charges(s), foe)] } }),
  [R.critWound4]: aura('Plaie ouverte (Saignement 4 par critique)', { family: 'affliction', reactions: { crit: (s) => [pose('bleed', 4 * charges(s), foe)] } }),
  [R.aimLow]: aura('Feinte (Visée : +0,5 par esquive, +0,25 par coup)', { family: 'precision', modifyStats: (st, s) => ({ ...st, dodgeChance: st.dodgeChance + 0.05 * charges(s) }), reactions: { dodge: () => [pose(V.aimQ, 2)], hit: () => [pose(V.aimQ, 1)] } }),
  // Duo étalé : un dé de plus à chacune de ses N prochaines actions
  [R.duoSpread]: { ...STATUSES.duo, name: 'Duo (étalé)', strikeCharges: 'one' },
  [R.duoSpreadLock]: plain('Duo (verrou étalé)', { family: 'tempo', expiresAt: 'turnEnd' }),
} satisfies Record<string, StatusDef>)
const C = Object.fromEntries(Object.entries(R).map(([k, status]) => [k, auraSkill(`lab-v-${k}`, STATUSES_V[status].name, status)])) as Record<keyof typeof R, CharacterEvent>
const DUO: Record<string, CharacterEvent> = {
  spread3: { ...skill('duo'), id: 'lab-v-duo-spread3', name: 'Duo (deux dés à ses 3 prochaines actions, sans relance)', when: [{ type: 'lacksStatus', who: 'self', status: R.duoSpreadLock }], effects: [pose(R.duoSpread, 3), pose(R.duoSpreadLock, 1, { turns: 4 })] },
  spread4: { ...skill('duo'), id: 'lab-v-duo-spread4', name: 'Duo (deux dés à ses 4 prochaines actions, sans relance)', when: [{ type: 'lacksStatus', who: 'self', status: R.duoSpreadLock }], effects: [pose(R.duoSpread, 4), pose(R.duoSpreadLock, 1, { turns: 5 })] },
}
const SERIES_106: LabIdea[] = [
  idea(106, 'brokk', 'thorns-rise', "Aura d'épines montante (1, 1, 2, 2, 3 par coup reçu)", { one: C.thornsRise }),
  idea(106, 'ervald', 'poison-rise', 'Aura de poison montante (1, 1, 2, 2, 3 par tour)', { one: C.poisonRise }),
  idea(106, 'naraxes', 'decoction-rise', 'Aura de décoction montante (1, 1, 2, 2, 3 par coup)', { one: C.decoctionRise }),
  idea(106, 'ysolde', 'holy-rise', 'Aura de sainteté montante (+1, +1, +2, +2, +3 PV par tour)', { one: C.holyRise }),
  idea(106, 'thaldrin', 'sky-slow2', "Ciel d'orage montant lent (1, 1, 2, 2)", { one: C.skySlow2 }),
  idea(106, 'elaria', 'crit-wound3', 'Plaie ouverte : Saignement 3 par critique', { one: C.critWound3 }),
  idea(106, 'elaria', 'crit-wound4', 'Plaie ouverte : Saignement 4 par critique', { one: C.critWound4 }),
  idea(106, 'gorak', 'crit-wound4', 'Plaie ouverte : Saignement 4 par critique', { one: C.critWound4 }),
  idea(106, 'elaria', 'aim-low', 'Feinte : Visée +0,5 par esquive, +0,25 par coup', { one: C.aimLow }),
  // Le Duo sans relance (A7), ses formes : l'avant est le Duo à trois dés sans relance (la règle A7 seule)
  idea(106, 'fanchon', 'duo-spread3', 'Duo étalé : deux dés à ses 3 prochaines actions', { two: DUO.spread3 }, { two: F.duo3Lock }),
  idea(106, 'fanchon', 'duo-spread4', 'Duo étalé : deux dés à ses 4 prochaines actions', { two: DUO.spread4 }, { two: F.duo3Lock }),
  idea(106, 'fanchon', 'duo3-att56', 'Duo à trois dés sans relance, attaque 5 à 6', { two: F.duo3Lock, stats: { attackMin: 5, attackMax: 6 } }, { two: F.duo3Lock }),
  idea(106, 'fanchon', 'duo3-hp52', 'Duo à trois dés sans relance, 52 PV', { two: F.duo3Lock, stats: { maxHp: 52 } }, { two: F.duo3Lock }),
  idea(106, 'fanchon', 'duo3-ballad2', 'Duo à trois dés sans relance, Ballade 2 PV sans cumul', { one: B.balladN2, two: F.duo3Lock }, { two: F.duo3Lock }),
  idea(106, 'fanchon', 'duo3-refrain', 'Duo à trois dés sans relance, Ballade (1 PV et refrain)', { one: A.refrainHeal, two: F.duo3Lock }, { two: F.duo3Lock }),
  idea(106, 'fanchon', 'spread4-refrain', 'Duo étalé sur 4 actions, Ballade (1 PV et refrain)', { one: A.refrainHeal, two: DUO.spread4 }, { two: F.duo3Lock }),
  idea(106, 'fanchon', 'duo3-raw-refrain', 'Duo : trois coups bruts, Ballade (1 PV et refrain)', { one: A.refrainHeal, two: F.duoRaw3 }, { two: F.duo3Lock }),
]

/* --- Série 104 : la refonte pour tous. W1 : la structure proposée (une aura par personnage, sa face 2), valeurs d'aujourd'hui
   pour les auras qui restent ; W2 : W1 et A12 (les auras à « 1 » passent à 2, sans cumul). Chaque personnage, et tous ses
   adversaires, passent au dé proposé (`everyone`) ; puis la seconde aura de chacun, dans le monde W1. --- */
const PROPOSED: Record<string, { first: Kit; second: Kit; strong?: Kit }> = {
  gorak: { first: { one: 'blood-frenzy' }, second: { one: 'onrush' } },
  elaria: { first: { one: B.feintAimHalf }, second: { one: 'blood-frenzy' } },
  brokk: { first: { one: 'thorns' }, second: { one: A.bastion }, strong: { one: B.thornsN2 } },
  ervald: { first: { one: 'frost-aura' }, second: { one: 'dread' }, strong: { one: B.poisonN2 } },
  ysolde: { first: { one: 'holy-aura' }, second: { one: B.judge3 }, strong: { one: B.holyN2 } },
  naraxes: { first: { one: 'decoction-aura' }, second: { one: 'loaded-die' }, strong: { one: B.decoctionN2 } },
  aldric: { first: { one: A.vendettaFull, two: F.riposteFull }, second: { one: 'pilfer', two: 'riposte' } },
  morgrut: { first: { one: A.powerGrow, two: 'assault' }, second: { one: B.rancorN2, two: 'assault' } },
  thaldrin: { first: { one: B.skySlow }, second: { one: B.brasierAlways, support: [BRASIER_ALWAYS] } },
  fanchon: { first: { one: A.refrainHeal, two: F.duo3Lock }, second: { one: A.veinRaw, two: F.duo3Lock } },
}
const W1 = (c: Character) => withKit(c, PROPOSED[c.id].first)
const W2 = (c: Character) => withKit(c, PROPOSED[c.id].strong ?? PROPOSED[c.id].first)
const world = (c: Character, key: string, pitch: string, apply: (x: Character) => Character): LabIdea => ({
  series: 104,
  id: `v104-${key}-${c.id}`,
  character: c.id,
  name: `${pitch} · ${c.name}`,
  schema: 'Règle',
  family: 'Auras',
  pitch,
  apply,
  everyone: true,
  watch: [],
  statuses: STATUSES_V,
})
const SERIES_104: LabIdea[] = [
  ...CHARACTERS.map((c) => world(c, 'w1', 'Refonte W1 : une aura par personnage, sa face 2 proposée', W1)),
  ...CHARACTERS.map((c) => world(c, 'w2', 'Refonte W2 : W1 et les auras à 1 passées à 2, sans cumul', W2)),
  ...CHARACTERS.map((c) => ({ ...idea(104, c.id, 'second', `seconde aura dans le monde W1`, PROPOSED[c.id].second), world: W1 })),
]

/* --- Série 107 : la refonte retenue (W3), pour tous : les valeurs réglées des séries 105 et 106 (auras montantes à 2 ou 3,
   Visée à +0,5, Plaie ouverte au critique, Ciel montant lent à 2, Duo en trois coups bruts) ; puis la seconde aura de
   chacun et les réglages de Fanchon, dans ce monde. --- */
const R2 = { thornsRise2: id('labVThornsRise2'), holyRise2: id('labVHolyRise2') }
Object.assign(STATUSES_V, {
  [R2.thornsRise2]: aura("Aura d'épines (montante, 2)", { family: 'affliction', maxStacks: 4, reactions: { hurt: (s) => [pose('bleed', rise(s), foe), pose(R2.thornsRise2, 1)] } }),
  [R2.holyRise2]: aura('Aura de sainteté (montante, 2)', { family: 'healing', maxStacks: 4, onTurnEnd: (s) => [{ type: 'heal', amount: rise(s) }, pose(R2.holyRise2, 1)] }),
} satisfies Record<string, StatusDef>)
const D = {
  thornsRise2: auraSkill('lab-v-thorns-rise2', "Aura d'épines (montante, 2)", R2.thornsRise2),
  holyRise2: auraSkill('lab-v-holy-rise2', 'Aura de sainteté (montante, 2)', R2.holyRise2),
  raw4: { ...skill('duo'), id: 'lab-v-duo-raw4', name: 'Duo (quatre coups bruts tout de suite)', effects: [strike(4)] } as CharacterEvent,
}
const FANCHON_W3: Kit = { one: A.refrainHeal, two: F.duoRaw3 }
const PROPOSED_W3: Record<string, { first: Kit; second: Kit }> = {
  gorak: { first: { one: 'blood-frenzy' }, second: { one: 'onrush' } },
  elaria: { first: { one: B.feintAimHalf }, second: { one: C.critWound4 } },
  brokk: { first: { one: D.thornsRise2 }, second: { one: A.bastion } },
  ervald: { first: { one: C.poisonRise }, second: { one: 'dread' } },
  ysolde: { first: { one: D.holyRise2 }, second: { one: B.judge3 } },
  naraxes: { first: { one: C.decoctionRise }, second: { one: 'loaded-die' } },
  aldric: { first: { one: A.vendettaFull, two: F.riposteFull }, second: { one: 'pilfer', two: 'riposte' } },
  morgrut: { first: { one: A.powerGrow, two: 'assault' }, second: { one: B.rancorN2, two: 'assault' } },
  thaldrin: { first: { one: C.skySlow2 }, second: { one: B.brasierAlways, support: [BRASIER_ALWAYS] } },
  fanchon: { first: FANCHON_W3, second: { one: A.veinRaw, two: F.duoRaw3 } },
}
const W3 = (c: Character) => withKit(c, PROPOSED_W3[c.id].first)
const in3 = (i: LabIdea): LabIdea => ({ ...i, series: 107, world: W3 })
const SERIES_107: LabIdea[] = [
  ...CHARACTERS.map((c) => ({ ...world(c, 'w3', 'Refonte W3 : la proposition réglée, pour tous', W3), series: 107, id: `v107-w3-${c.id}` })),
  ...CHARACTERS.map((c) => in3(idea(107, c.id, 'second', 'seconde aura dans le monde W3', PROPOSED_W3[c.id].second))),
  in3(idea(107, 'fanchon', 'att56', 'W3, attaque 5 à 6', { ...FANCHON_W3, stats: { attackMin: 5, attackMax: 6 } })),
  in3(idea(107, 'fanchon', 'hp50', 'W3, 50 PV', { ...FANCHON_W3, stats: { maxHp: 50 } })),
  in3(idea(107, 'fanchon', 'raw4', 'W3, quatre coups bruts', { ...FANCHON_W3, two: D.raw4 })),
  in3(idea(107, 'brokk', 'thorns-rise3', 'W3, Épines montantes à 3', { one: C.thornsRise })),
  in3(idea(107, 'ysolde', 'holy-rise3', 'W3, Sainteté montante à 3', { one: C.holyRise })),
  in3(idea(107, 'brokk', 'thorns-reg', "W3, Aura d'épines du registre", { one: 'thorns' })),
  in3(idea(107, 'ervald', 'frost-reg', 'W3, Aura de poison du registre', { one: 'frost-aura' })),
  in3(idea(107, 'naraxes', 'decoction-reg', 'W3, Aura de décoction du registre', { one: 'decoction-aura' })),
  in3(idea(107, 'ysolde', 'holy-reg', 'W3, Aura de sainteté du registre', { one: 'holy-aura' })),
]

/* --- Série 108 : W4 = W3 et Fanchon à l'attaque 5 à 6 (sa compensation du Duo sans boucle) ; les secondes auras et leurs
   réglages dans ce monde. --- */
const S108 = { vein2: id('labVVeinRaw2'), rancorN3: id('labVRancorN3'), pilfer10: id('labVPilfer10') }
Object.assign(STATUSES_V, {
  [S108.vein2]: aura('Veine (deux coups de plus par 6)', { family: 'fortune', reactions: { naturalMax: () => [strike(2)] } }),
  [S108.rancorN3]: aura('Rancœur (3, sans cumul)', { family: 'retaliation', maxStacks: 1, reactions: { hurt: () => [pose('momentum', 3)] } }),
  [S108.pilfer10]: { ...STATUSES.pilfer, name: 'Larcin (+10 % d’esquive)', modifyStats: (st: Parameters<NonNullable<StatusDef['modifyStats']>>[0]) => ({ ...st, dodgeChance: st.dodgeChance + 0.1 }) },
} satisfies Record<string, StatusDef>)
const FANCHON_W4: Kit = { ...FANCHON_W3, stats: { attackMin: 5, attackMax: 6 } }
const W4 = (c: Character) => (c.id === 'fanchon' ? withKit(c, FANCHON_W4) : W3(c))
const in4 = (i: LabIdea): LabIdea => ({ ...i, series: 108, world: W4 })
const SECOND_W4: Record<string, Kit> = { ...Object.fromEntries(Object.entries(PROPOSED_W3).map(([k, v]) => [k, v.second])), fanchon: { ...PROPOSED_W3.fanchon.second, stats: FANCHON_W4.stats } }
const SERIES_108: LabIdea[] = [
  ...CHARACTERS.map((c) => ({ ...world(c, 'w4', 'Refonte W4 : W3 et Fanchon à l’attaque 5 à 6, pour tous', W4), series: 108, id: `v108-w4-${c.id}` })),
  ...CHARACTERS.map((c) => in4(idea(108, c.id, 'second', 'seconde aura dans le monde W4', SECOND_W4[c.id]))),
  in4(idea(108, 'fanchon', 'vein2', 'W4, Veine : deux coups de plus par 6', { one: auraSkill('lab-v-vein2', 'Veine (deux coups)', S108.vein2), two: F.duoRaw3, stats: FANCHON_W4.stats })),
  in4(idea(108, 'fanchon', 'sky', "W4, Ciel d'orage montant lent", { one: C.skySlow2, two: F.duoRaw3, stats: FANCHON_W4.stats })),
  in4(idea(108, 'morgrut', 'rancor3', 'W4, Rancœur : +3 Ferveur par coup reçu', { one: auraSkill('lab-v-rancor-n3', 'Rancœur (3)', S108.rancorN3), two: 'assault' })),
  in4(idea(108, 'aldric', 'pilfer10', 'W4, Larcin à +10 % d’esquive / Riposte', { one: auraSkill('lab-v-pilfer10', 'Larcin (+10 %)', S108.pilfer10), two: 'riposte' })),
  in4(idea(108, 'aldric', 'pilfer-full', 'W4, Larcin / Riposte entière', { one: 'pilfer', two: F.riposteFull })),
  in4(idea(108, 'aldric', 'vendetta-reg-full', 'W4, Vindicte du registre (+6 Ferveur) / Riposte entière', { one: 'vendetta', two: F.riposteFull })),
]

/* --- Série 109 : W5, la proposition finale = W4, la Riposte entière (Aldric : Vindicte du registre), la Rancœur à 3, la
   Veine à deux coups. Pour tous, puis chaque seconde aura dans ce monde. --- */
const FINAL: Record<string, { first: Kit; second: Kit }> = {
  ...PROPOSED_W3,
  aldric: { first: { one: 'vendetta', two: F.riposteFull }, second: { one: 'pilfer', two: F.riposteFull } },
  morgrut: { first: PROPOSED_W3.morgrut.first, second: { one: auraSkill('lab-v-rancor-n3', 'Rancœur (3)', S108.rancorN3), two: 'assault' } },
  fanchon: { first: FANCHON_W4, second: { one: auraSkill('lab-v-vein2', 'Veine (deux coups)', S108.vein2), two: F.duoRaw3, stats: FANCHON_W4.stats } },
}
const W5 = (c: Character) => withKit(c, FINAL[c.id].first)
const SERIES_109: LabIdea[] = [
  ...CHARACTERS.map((c) => ({ ...world(c, 'w5', 'Refonte W5 : la proposition finale, pour tous', W5), series: 109, id: `v109-w5-${c.id}` })),
  ...CHARACTERS.map((c) => ({ ...idea(109, c.id, 'second', 'seconde aura dans le monde W5', FINAL[c.id].second), world: W5 })),
  // La Riposte entière gravée sur le 3 chez les autres porteurs du Rempart (avant : la Riposte du registre au même endroit)
  ...['brokk', 'morgrut'].map((w) => idea(109, w, 'riposte-full-engraved', 'Riposte entière gravée sur le 3 (avant : la Riposte du registre)', { engraved: [F.riposteFull] }, { engraved: ['riposte'] })),
]

/* --- Série 110 : les directions de la proposition finale (son aura, sa face 2, deux briques gravées sur le 3 et le 4), contre
   le roster d'aujourd'hui ; l'avant : son dé d'aujourd'hui et les mêmes gravures. --- */
const DIRECTIONS: [character: string, which: 'first' | 'second', bricks: (CharacterEvent | string)[]][] = [
  ['gorak', 'first', ['cleave', 'quarry']],
  ['gorak', 'second', ['assault', 'soloist']],
  ['elaria', 'first', ['evasion', 'lucky-strike']],
  ['elaria', 'second', ['blood-scent', 'quarry']],
  ['brokk', 'first', ['quarry', 'blood-scent']],
  ['brokk', 'second', ['shockwave', F.riposteFull]],
  ['ervald', 'first', ['virulence', 'venom-bite']],
  ['ervald', 'second', ['fear', 'seal-theft']],
  ['ysolde', 'first', [F.sentenceCharges, F.faithCharges]],
  ['ysolde', 'second', ['prayer', 'blinding']],
  ['naraxes', 'first', ['venom-bite', 'virulence']],
  ['naraxes', 'second', ['lucky-coin', 'cursed-coin']],
  ['aldric', 'first', ['retribution', 'shockwave']],
  ['aldric', 'second', ['seal-theft', 'fear']],
  ['morgrut', 'first', ['soloist', 'guard-break']],
  ['morgrut', 'second', ['soloist', 'guard-break']],
  ['thaldrin', 'second', ['stoke', 'conflagration']],
  ['fanchon', 'first', ['lucky-strike', 'thunderbolt']],
  ['fanchon', 'second', ['lucky-strike', 'thunderbolt']],
]
const SERIES_110: LabIdea[] = DIRECTIONS.map(([who, which, bricks]) =>
  idea(110, who, `dir-${which}`, `${which === 'first' ? 'première' : 'seconde'} aura + ${bricks.map((b) => of(b).name).join(', ')}`, { ...FINAL[who][which], engraved: bricks }, { engraved: bricks }),
)

export const AURA_VISION: readonly LabIdea[] = [...SERIES_100, ...SERIES_101, ...SERIES_102, ...SERIES_103, ...SERIES_104, ...SERIES_105, ...SERIES_106, ...SERIES_107, ...SERIES_108, ...SERIES_109, ...SERIES_110]
