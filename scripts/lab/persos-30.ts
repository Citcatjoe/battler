/*
 * Retour de l'utilisateur du 2026-10-30 (prompts/Retour du 30 octobre.md), agent PropPersos : les ressentis par personnage,
 * mesurés et proposés avant tout code (docs/etudes/PERSOS_RETOUR_30.md). Statuts d'essai `labP…`, construits avec les
 * crochets du moteur ; rien ici n'est livré au jeu. Règle nouvelle de l'utilisateur : éviter les auras et les coups à
 * « +1 / −1 » ; une règle pour tous ; des valeurs entières.
 *
 * Série 120 : Brokk, l'Aura d'épines sans « 1 » (au départ) ; l'Onde de choc (gravée sur le 3, chez ses trois porteurs).
 * Série 121 : Ervald, l'Aura de poison sans « 1 » (au départ) ; l'Ombre contre un adversaire à 4 fois ses PV (le boss).
 * Série 122 : Ysolde, le Jugement en verdict (au départ).
 * Série 123 : Morgrut, une seconde aura qui tient (au départ, et contre un adversaire à 4 fois ses PV).
 * Série 124 : Thaldrin, le Ciel d'orage (au départ) ; l'ours et la Fureur (directions).
 * Série 125 : Fanchon, la Ballade sans « +1 PV » (au départ).
 * Série 126 : Elaria, la Saignée de l'utilisateur et la Sangsue (directions).
 * Série 127 : Naraxes, Pile ou face et le critique (la « méga beigne » d'Aldric).
 */
import type { Character } from '../../src/game/character'
import type { CharacterEvent, Effect } from '../../src/game/events'
import { ALL_SKILLS, CHARACTERS } from '../../src/game/roster'
import { STATUSES, type StatusDef, type StatusId } from '../../src/game/statuses'
import { withKit, type Kit } from './aura-vision'
import type { LabIdea } from './ideas'

const id = (s: string) => s as StatusId
const skill = (sid: string): CharacterEvent => {
  const found = ALL_SKILLS.find((e) => e.id === sid)
  if (!found) throw new Error(`PropPersos : compétence inconnue (${sid})`)
  return found
}
const pose = (status: StatusId | string, stacks: number, rest: Partial<Extract<Effect, { type: 'applyStatus' }>> = {}): Effect => ({ type: 'applyStatus', status: status as StatusId, stacks, ...rest })
const foe = { target: 'opponent' as const }
/** Une aura d'essai : un halo (la règle du 3e tour la reconnaît), une charge, sans cumul */
const aura = (name: string, rest: Partial<StatusDef>): StatusDef => ({
  name,
  look: { aura: 'rgba(148,163,184,0.5)' },
  polarity: 'positive',
  family: 'affliction',
  summary: name,
  describe: () => name,
  badge: () => '',
  counter: 'stacks',
  stacking: 'refresh',
  maxStacks: 1,
  ...rest,
})
/** Un compteur d'essai, sans halo */
const plain = (name: string, rest: Partial<StatusDef>): StatusDef => ({
  name,
  polarity: 'positive',
  family: 'tempo',
  summary: name,
  describe: () => name,
  badge: (s) => String(s.stacks),
  counter: 'stacks',
  stacking: 'add',
  ...rest,
})
const auraSkill = (sid: string, name: string, status: StatusId): CharacterEvent => ({ id: sid, name, trigger: 'naturalOne', effects: [pose(status, 1)] })

const P = {
  // Brokk
  thornsHalf: id('labPThornsHalf'),
  thornsThird: id('labPThornsThird'),
  thornsCount5: id('labPThornsCount5'),
  thornsCount6: id('labPThornsCount6'),
  thornTally5: id('labPThornTally5'),
  thornTally6: id('labPThornTally6'),
  thornsPlant2: id('labPThornsPlant2'),
  thornsPlant3: id('labPThornsPlant3'),
  planted2: id('labPPlanted2'),
  planted3: id('labPPlanted3'),
  // Ervald
  poisonAlt3: id('labPPoisonAlt3'),
  poisonAlt4: id('labPPoisonAlt4'),
  poisonTick3: id('labPPoisonTick3'),
  poisonTick4: id('labPPoisonTick4'),
  poisonFreeze: id('labPPoisonFreeze'),
  dread3: id('labPDread3'),
  respite: id('labPRespite'),
  // Ysolde
  judge6: id('labPJudge6'),
  judge8: id('labPJudge8'),
  judge10: id('labPJudge10'),
  fault6: id('labPFault6'),
  fault8: id('labPFault8'),
  fault10: id('labPFault10'),
  // Morgrut
  hide3: id('labPHide3'),
  hide4: id('labPHide4'),
  rancorHalf: id('labPRancorHalf'),
  // Thaldrin
  skyBolt3: id('labPSkyBolt3'),
  skyCharged: id('labPSkyCharged'),
  skyAlt: id('labPSkyAlt'),
  skyTick: id('labPSkyTick'),
  skyAlt22: id('labPSkyAlt22'),
  skyTick22: id('labPSkyTick22'),
  skyAlt13: id('labPSkyAlt13'),
  skyTick13: id('labPSkyTick13'),
  skyThird32: id('labPSkyThird32'),
  skyTick32: id('labPSkyTick32'),
  // Fanchon
  balladR4: id('labPBalladR4'),
  noteR4: id('labPNoteR4'),
  balladR4b: id('labPBalladR4b'),
  noteR4b: id('labPNoteR4b'),
  balladR3: id('labPBalladR3'),
  noteR3: id('labPNoteR3'),
  // Naraxes
  coin2: id('labPCoin2'),
  // Récolte (R31, la phrase de l'utilisateur) : son prochain coup qui touche draine autant de PV que l'adversaire a de Poison
  harvestDrain: id('labPHarvestDrain'),
  harvestDrain2: id('labPHarvestDrain2'),
  harvestHeal1: id('labPHarvestHeal1'),
  harvestHeal3: id('labPHarvestHeal3'),
}

/** Un seuil : `at` charges, puis ses effets (relatifs au porteur), et le compteur repart à zéro */
const tally = (name: string, at: number, effects: Effect[], rest: Partial<StatusDef> = {}): StatusDef => plain(name, { threshold: { at, effects: () => effects }, ...rest })
const fault = (name: string, loss: number): StatusDef => ({
  ...tally(name, 3, [{ type: 'damage', amount: loss, source: 'holy' }]),
  polarity: 'negative',
})

const STATUSES_P: Record<string, StatusDef> = {
  // Brokk : la plaie lit le coup reçu (la moitié, le tiers des PV qu'il retire, arrondis au-dessus), comme Pourfendre
  [P.thornsHalf]: aura("Aura d'épines (la moitié du coup)", { reactions: { hurt: () => [pose('bleed', 0, { ...foe, fromHit: 0.5 })] } }),
  [P.thornsThird]: aura("Aura d'épines (le tiers du coup)", { reactions: { hurt: () => [pose('bleed', 0, { ...foe, fromHit: 1 / 3 })] } }),
  // … ou un compteur sur Brokk : au 3e coup reçu, l'attaquant saigne d'un coup
  [P.thornTally5]: tally('Épines (5 au 3e coup reçu)', 3, [pose('bleed', 5, foe)]),
  [P.thornTally6]: tally('Épines (6 au 3e coup reçu)', 3, [pose('bleed', 6, foe)]),
  [P.thornsCount5]: aura("Aura d'épines (3e coup reçu : Saignement 5)", { reactions: { hurt: () => [pose(P.thornTally5, 1)] } }),
  [P.thornsCount6]: aura("Aura d'épines (3e coup reçu : Saignement 6)", { reactions: { hurt: () => [pose(P.thornTally6, 1)] } }),
  // … ou des épines plantées en lui, que son prochain coup qui touche enfonce toutes
  [P.planted2]: plain('Épines plantées (2)', { reactions: { hit: (s) => [pose('bleed', 2 * s.stacks, foe)] }, spentOnReaction: true }),
  [P.planted3]: plain('Épines plantées (3)', { reactions: { hit: (s) => [pose('bleed', 3 * s.stacks, foe)] }, spentOnReaction: true }),
  [P.thornsPlant2]: aura("Aura d'épines (plantées, 2 par épine)", { reactions: { hurt: () => [pose(P.planted2, 1)] } }),
  [P.thornsPlant3]: aura("Aura d'épines (plantées, 3 par épine)", { reactions: { hurt: () => [pose(P.planted3, 1)] } }),

  // Ervald : un tour sur deux, un gros Poison ; ou Poison 3, puis le Poison ne baisse plus
  [P.poisonTick3]: tally('Aura de poison (le tour)', 2, [pose('poison', 3, foe)]),
  [P.poisonTick4]: tally('Aura de poison (le tour)', 2, [pose('poison', 4, foe)]),
  [P.poisonAlt3]: aura('Aura de poison (un tour sur deux, Poison 3)', { onTurnStart: () => [pose(P.poisonTick3, 1)] }),
  [P.poisonAlt4]: aura('Aura de poison (un tour sur deux, Poison 4)', { onTurnStart: () => [pose(P.poisonTick4, 1)] }),
  // L'usure du Poison compensée à chacun de ses tours ; l'événement d'essai `lab-p-poison-light` l'allume à 3
  [P.poisonFreeze]: aura('Aura de poison (Poison 3, qui ne baisse plus)', { onTurnStart: () => [pose('poison', 1, foe)] }),
  // L'Effroi plafonné : +5 % de critique par pose, trois charges au plus (+10 %)
  [P.dread3]: { ...STATUSES.dread, name: 'Effroi (3 charges au plus)', maxStacks: 3 },
  // Le répit (règle pour tous) : une action perdue, la suivante est garantie (la Peur suivante est parée)
  [P.respite]: plain('Répit', { family: 'seals', counter: 'turns', stacking: 'refresh', maxStacks: 1, wards: { statuses: ['fear'] }, expiresAt: 'turnStart' }),

  // Ysolde : le Jugement rend un verdict (des PV de Lumière) au lieu de la Peur
  [P.fault6]: fault('Faute (verdict 6)', 6),
  [P.fault8]: fault('Faute (verdict 8)', 8),
  [P.fault10]: fault('Faute (verdict 10)', 10),
  [P.judge6]: aura('Jugement (verdict 6)', { family: 'tempo', reactions: { hurt: () => [pose(P.fault6, 1, foe)] } }),
  [P.judge8]: aura('Jugement (verdict 8)', { family: 'tempo', reactions: { hurt: () => [pose(P.fault8, 1, foe)] } }),
  [P.judge10]: aura('Jugement (verdict 10)', { family: 'tempo', reactions: { hurt: () => [pose(P.fault10, 1, foe)] } }),

  // Morgrut : une seconde aura du Rempart qui tient (de l'armure temporaire à chaque coup reçu), ou la Rancœur qui lit le coup
  [P.hide3]: aura('Cuir épais (+3 armure temporaire par coup reçu)', { family: 'guard', reactions: { hurt: () => [pose('bonusArmor', 3)] } }),
  [P.hide4]: aura('Cuir épais (+4 armure temporaire par coup reçu)', { family: 'guard', reactions: { hurt: () => [pose('bonusArmor', 4)] } }),
  [P.rancorHalf]: aura('Rancœur (Ferveur : la moitié du coup reçu)', { family: 'power', reactions: { hurt: () => [pose('momentum', 0, { fromHit: 0.5 })] } }),

  // Thaldrin : un éclair de 3 ; un éclair de 2 et +2 à chacun de ses éclairs ; un tour sur deux, trois éclairs de 2
  [P.skyBolt3]: aura("Ciel d'orage (un éclair de 3)", { onTurnStart: () => [{ type: 'damage', amount: 3, target: 'opponent', source: 'lightning' }] }),
  [P.skyCharged]: aura("Ciel d'orage (un éclair, et ses éclairs +2)", {
    onTurnStart: () => [{ type: 'damage', amount: 1, target: 'opponent', source: 'lightning' }],
    modifyDirect: (amount, _s, source) => (source === 'lightning' ? amount + 2 : amount),
  }),
  [P.skyTick]: tally("Ciel d'orage (le tour)", 2, [{ type: 'damage', amount: 2, hits: 3, target: 'opponent', source: 'lightning' }]),
  [P.skyAlt]: aura("Ciel d'orage (un tour sur deux, 3 éclairs de 2)", { onTurnStart: () => [pose(P.skyTick, 1)] }),
  [P.skyTick22]: tally("Ciel d'orage (le tour)", 2, [{ type: 'damage', amount: 2, hits: 2, target: 'opponent', source: 'lightning' }]),
  [P.skyAlt22]: aura("Ciel d'orage (un tour sur deux, 2 éclairs de 2)", { onTurnStart: () => [pose(P.skyTick22, 1)] }),
  [P.skyTick13]: tally("Ciel d'orage (le tour)", 2, [{ type: 'damage', amount: 3, target: 'opponent', source: 'lightning' }]),
  [P.skyAlt13]: aura("Ciel d'orage (un tour sur deux, un éclair de 3)", { onTurnStart: () => [pose(P.skyTick13, 1)] }),
  [P.skyTick32]: tally("Ciel d'orage (le tour)", 3, [{ type: 'damage', amount: 2, hits: 3, target: 'opponent', source: 'lightning' }]),
  [P.skyThird32]: aura("Ciel d'orage (un tour sur trois, 3 éclairs de 2)", { onTurnStart: () => [pose(P.skyTick32, 1)] }),

  // Fanchon : la Ballade sans « +1 PV » par coup ; le refrain porte tout
  [P.noteR4]: tally('Note (refrain : 4 × 2, +4 PV)', 4, [{ type: 'damage', amount: 2, hits: 4, target: 'opponent', source: 'wind' }, { type: 'heal', amount: 4 }]),
  [P.noteR4b]: tally('Note (refrain : 4 × 2, +8 PV)', 4, [{ type: 'damage', amount: 2, hits: 4, target: 'opponent', source: 'wind' }, { type: 'heal', amount: 8 }]),
  [P.noteR3]: tally('Note (refrain : 3 × 2, +3 PV)', 3, [{ type: 'damage', amount: 2, hits: 3, target: 'opponent', source: 'wind' }, { type: 'heal', amount: 3 }]),
  [P.balladR4]: aura('Ballade (refrain 4 × 2, +4 PV)', { family: 'healing', reactions: { hit: () => [pose(P.noteR4, 1)] } }),
  [P.balladR4b]: aura('Ballade (refrain 4 × 2, +8 PV)', { family: 'healing', reactions: { hit: () => [pose(P.noteR4b, 1)] } }),
  [P.balladR3]: aura('Ballade (refrain 3 × 2, +3 PV)', { family: 'healing', reactions: { hit: () => [pose(P.noteR3, 1)] } }),

  // Naraxes : pile ×2 (×3 au registre)
  [P.coin2]: { ...STATUSES.coinFlip, name: 'Pile ou face (×2)', coinToss: { multiplier: 2, headsTouches: true } },
  // Récolte drainante : l'adversaire perd N PV par Poison, il en regagne autant (lu au coup)
  [P.harvestDrain]: plain('Récolte (draine 1 par Poison)', { family: 'healing', stacking: 'refresh', maxStacks: 1, spentOnReaction: true, reactions: { hit: () => [{ type: 'damage', amount: 0, target: 'opponent', source: 'poison', fromStatus: { status: 'poison', who: 'opponent', factor: 1 } }, { type: 'heal', amount: 0, fromStatus: { status: 'poison', who: 'opponent', factor: 1 } }] } }),
  // La forme que code Rythme (feu vert de Main) : un soin seul, Poison de la cible × facteur, au coup qui touche
  [P.harvestDrain2]: plain('Récolte (soin 2 par Poison)', { family: 'healing', stacking: 'refresh', maxStacks: 1, spentOnReaction: true, reactions: { hit: () => [{ type: 'heal', amount: 0, fromStatus: { status: 'poison', who: 'opponent', factor: 2 } }] } }),
  [P.harvestHeal1]: plain('Récolte (soin 1 par Poison)', { family: 'healing', stacking: 'refresh', maxStacks: 1, spentOnReaction: true, reactions: { hit: () => [{ type: 'heal', amount: 0, fromStatus: { status: 'poison', who: 'opponent', factor: 1 } }] } }),
  [P.harvestHeal3]: plain('Récolte (soin 3 par Poison)', { family: 'healing', stacking: 'refresh', maxStacks: 1, spentOnReaction: true, reactions: { hit: () => [{ type: 'heal', amount: 0, fromStatus: { status: 'poison', who: 'opponent', factor: 3 } }] } }),
}

const A = Object.fromEntries(
  (
    [
      ['thornsHalf', P.thornsHalf],
      ['thornsThird', P.thornsThird],
      ['thornsCount5', P.thornsCount5],
      ['thornsCount6', P.thornsCount6],
      ['thornsPlant2', P.thornsPlant2],
      ['thornsPlant3', P.thornsPlant3],
      ['poisonAlt3', P.poisonAlt3],
      ['poisonAlt4', P.poisonAlt4],
      ['poisonFreeze', P.poisonFreeze],
      ['dread3', P.dread3],
      ['judge6', P.judge6],
      ['judge8', P.judge8],
      ['judge10', P.judge10],
      ['hide3', P.hide3],
      ['hide4', P.hide4],
      ['rancorHalf', P.rancorHalf],
      ['skyBolt3', P.skyBolt3],
      ['skyCharged', P.skyCharged],
      ['skyAlt', P.skyAlt],
      ['balladR4', P.balladR4],
      ['balladR4b', P.balladR4b],
      ['balladR3', P.balladR3],
    ] as const
  ).map(([k, status]) => [k, auraSkill(`lab-p-${k}`, STATUSES_P[status].name, status)]),
) as Record<string, CharacterEvent>

/** Les événements d'essai qui accompagnent une aura (hors du dé) */
const SUPPORT = {
  // L'Aura de poison figée s'allume à 3 (et se rallume si le Poison part)
  poisonLight: { id: 'lab-p-poison-light', name: 'Aura de poison', trigger: 'turnStart', when: [{ type: 'hasStatus', who: 'self', status: P.poisonFreeze }, { type: 'lacksStatus', who: 'opponent', status: 'poison' }], effects: [pose('poison', 2, foe)] } as CharacterEvent,
  // Le répit : au début d'un tour où il a peur (il va perdre son action), la Peur suivante est parée jusqu'à son prochain tour
  respite: { id: 'lab-p-respite', name: 'Répit', trigger: 'turnStart', when: [{ type: 'hasStatus', who: 'self', status: 'fear' }], effects: [pose(P.respite, 1)] } as CharacterEvent,
}

/** Les faces d'essai */
const F = {
  shock3: { ...skill('shockwave'), id: 'lab-p-shock3', name: 'Onde de choc (3 par coup encaissé)', effects: [{ type: 'release', status: 'shockwave', min: 0, per: 3, target: 'opponent', source: 'strike' }] } as CharacterEvent,
  shock4: { ...skill('shockwave'), id: 'lab-p-shock4', name: 'Onde de choc (4 par coup encaissé)', effects: [{ type: 'release', status: 'shockwave', min: 0, per: 4, target: 'opponent', source: 'strike' }] } as CharacterEvent,
  // L'onde de son armure : l'adversaire perd autant de PV que son armure temporaire (qu'il garde), deux fois autant
  shockArmor: { id: 'lab-p-shock-armor', name: "Onde de choc (son armure temporaire)", trigger: 'naturalThree', when: [{ type: 'hasStatus', who: 'self', status: 'bonusArmor' }], scene: 'shockwave', effects: [{ type: 'damage', amount: 0, target: 'opponent', source: 'strike', fromStatus: { status: 'bonusArmor', who: 'self', factor: 1 } }] } as CharacterEvent,
  shockArmor2: { id: 'lab-p-shock-armor2', name: "Onde de choc (deux fois son armure temporaire)", trigger: 'naturalThree', when: [{ type: 'hasStatus', who: 'self', status: 'bonusArmor' }], scene: 'shockwave', effects: [{ type: 'damage', amount: 0, target: 'opponent', source: 'strike', fromStatus: { status: 'bonusArmor', who: 'self', factor: 2 } }] } as CharacterEvent,
  leech2: { ...skill('leech'), id: 'lab-p-leech2', name: 'Sangsue (2 charges)', effects: [pose('leech', 2)] } as CharacterEvent,
  coin2: { ...skill('coin-flip'), id: 'lab-p-coin2', name: 'Pile ou face (×2)', effects: [pose(P.coin2, 1)] } as CharacterEvent,
  harvestDrain: { ...skill('harvest'), id: 'lab-p-harvest-drain', name: 'Récolte (son coup draine 1 PV par Poison)', effects: [pose(P.harvestDrain, 1)] } as CharacterEvent,
  harvestDrain2: { ...skill('harvest'), id: 'lab-p-harvest-heal2', name: 'Récolte (son coup lui rend 2 PV par Poison)', effects: [pose(P.harvestDrain2, 1)] } as CharacterEvent,
  harvestHeal1: { ...skill('harvest'), id: 'lab-p-harvest-heal1', name: 'Récolte (son coup lui rend 1 PV par Poison)', effects: [pose(P.harvestHeal1, 1)] } as CharacterEvent,
  harvestHeal3: { ...skill('harvest'), id: 'lab-p-harvest-heal3', name: 'Récolte (son coup lui rend 3 PV par Poison)', effects: [pose(P.harvestHeal3, 1)] } as CharacterEvent,
}

const byId = (cid: string) => CHARACTERS.find((c) => c.id === cid)!
const nameOf = (e: CharacterEvent | string) => (typeof e === 'string' ? skill(e).name : e.name)

function idea(series: number, character: string, key: string, name: string, kit: Kit, before?: Kit, world?: (c: Character) => Character): LabIdea {
  const own = (c: Character) => (before && c.id === character ? withKit(c, before) : c)
  return {
    series,
    id: `p${series}-${character}-${key}`,
    character,
    name: `${byId(character).name} : ${name}`,
    schema: 'Dé de départ',
    family: 'Retour du 30',
    pitch: name,
    apply: (c) => withKit(c, kit),
    ...((before || world) && { world: (c: Character) => own(world ? world(c) : c) }),
    watch: [kit.one, kit.two, ...(kit.engraved ?? []), ...(kit.support ?? [])].filter((e): e is CharacterEvent | string => e !== undefined).map((e) => (typeof e === 'string' ? e : e.id)),
    statuses: STATUSES_P,
  }
}

/** Le boss, en approché : ses adversaires à `factor` fois leurs PV (le Colosse va jusqu'à 5 fois les siens), lui tel quel */
const longFight =
  (who: string, factor = 4) =>
  (c: Character) =>
    c.id === who ? c : c.adjusted({ stats: { maxHp: Math.round(c.stats.maxHp * factor) } })

/* --- Série 120 : Brokk. --- */
const SERIES_120: LabIdea[] = [
  ...(
    [
      ['thorns-half', 'Épines : Saignement de la moitié du coup reçu', A.thornsHalf],
      ['thorns-third', 'Épines : Saignement du tiers du coup reçu', A.thornsThird],
      ['thorns-count5', 'Épines : au 3e coup reçu, Saignement 5', A.thornsCount5],
      ['thorns-count6', 'Épines : au 3e coup reçu, Saignement 6', A.thornsCount6],
      ['thorns-plant2', 'Épines plantées : son coup les enfonce, Saignement 2 par épine', A.thornsPlant2],
      ['thorns-plant3', 'Épines plantées : son coup les enfonce, Saignement 3 par épine', A.thornsPlant3],
    ] as const
  ).map(([k, name, e]) => idea(120, 'brokk', k, name, { one: e })),
  // Les épines nouvelles et les consommatrices du Saignement (Curée, Odeur du sang) ; avant : l'Aura d'épines du registre
  ...([['count5', A.thornsCount5], ['plant2', A.thornsPlant2]] as const).map(([k, e]) =>
    idea(120, 'brokk', `dir-${k}`, `${e.name} + Curée, Odeur du sang`, { one: e, engraved: ['quarry', 'blood-scent'] }, { engraved: ['quarry', 'blood-scent'] }),
  ),
  // L'Onde de choc gravée sur le 3 nu de ses porteurs (avant : celle du registre, 2 par coup encaissé)
  ...['brokk', 'aldric', 'morgrut'].flatMap((who) =>
    (
      [
        ['shock3', F.shock3],
        ['shock4', F.shock4],
        ['shock-armor', F.shockArmor],
        ['shock-armor2', F.shockArmor2],
      ] as const
    ).map(([k, e]) => idea(120, who, k, `${e.name}, gravée sur le 3`, { engraved: [e] }, { engraved: ['shockwave'] })),
  ),
  // … dans la direction du Bastion (sa Peau de pierre sur le 2) ; avant : l'Onde du registre
  ...([['shock4', F.shock4], ['shock-armor', F.shockArmor], ['shock-armor2', F.shockArmor2]] as const).map(([k, e]) =>
    idea(120, 'brokk', `bastion-${k}`, `Bastion + ${e.name}, Riposte`, { one: 'bastion', engraved: [e, 'riposte'] }, { one: 'bastion', engraved: ['shockwave', 'riposte'] }),
  ),
]

/* --- Série 121 : Ervald. --- */
const OMBRE: Kit = { one: 'dread', engraved: ['jinx', 'fear', 'wither', 'life-steal'] }
const SERIES_121: LabIdea[] = [
  idea(121, 'ervald', 'poison-alt3', 'Aura de poison : un tour sur deux, Poison 3', { one: A.poisonAlt3 }),
  idea(121, 'ervald', 'poison-alt4', 'Aura de poison : un tour sur deux, Poison 4', { one: A.poisonAlt4 }),
  idea(121, 'ervald', 'poison-freeze', 'Aura de poison : Poison 3, puis le Poison ne baisse plus', { one: A.poisonFreeze, support: [SUPPORT.poisonLight] }),
  // Avec Virulence et Morsure gravées (la direction du Poison) ; avant : l'aura du registre, mêmes gravures
  ...(
    [
      ['alt3', A.poisonAlt3, []],
      ['alt4', A.poisonAlt4, []],
      ['freeze', A.poisonFreeze, [SUPPORT.poisonLight]],
    ] as const
  ).map(([k, e, support]) => idea(121, 'ervald', `dir-${k}`, `${e.name} + Virulence, Morsure`, { one: e, support: [...support], engraved: ['virulence', 'venom-bite'] }, { engraved: ['virulence', 'venom-bite'] })),
  // Contre 4 fois les PV (le boss approché) : l'aura du registre, puis les autres
  idea(121, 'ervald', 'long-poison-alt3', 'Contre 4 fois les PV : un tour sur deux, Poison 3', { one: A.poisonAlt3 }, undefined, longFight('ervald')),
  idea(121, 'ervald', 'long-poison-freeze', 'Contre 4 fois les PV : Poison 3 qui ne baisse plus', { one: A.poisonFreeze, support: [SUPPORT.poisonLight] }, undefined, longFight('ervald')),
  // L'Ombre de l'utilisateur (Effroi, Malchance, Peur, Flétrissure, Vol de vie copié) contre 4 fois les PV : l'Effroi plafonné
  idea(121, 'ervald', 'long-ombre-dread3', "Contre 4 fois les PV, l'Ombre : l'Effroi plafonné à 3 charges", { ...OMBRE, one: A.dread3 }, OMBRE, longFight('ervald')),
  idea(121, 'ervald', 'ombre-dread3', "L'Ombre : l'Effroi plafonné à 3 charges", { ...OMBRE, one: A.dread3 }, OMBRE),
  // Le répit, pour tous : une action perdue, la Peur suivante est parée
  ...CHARACTERS.map((c) => ({
    ...idea(121, c.id, 'respite', 'Le répit : après une action perdue, la Peur suivante est parée (pour tous)', {}),
    apply: (x: Character) => x.adjusted({ events: [...x.events, SUPPORT.respite] }),
    everyone: true,
    pitch: 'Le répit : après une action perdue, la Peur suivante est parée',
  })),
  {
    ...idea(121, 'ervald', 'long-ombre-respite', "Contre 4 fois les PV, l'Ombre : le répit pour tous", OMBRE, OMBRE, longFight('ervald')),
    apply: (x: Character) => withKit(x, { ...OMBRE, support: [SUPPORT.respite] }),
    everyone: true,
  },
]

/* --- Série 122 : Ysolde. --- */
const SERIES_122: LabIdea[] = [
  ...(
    [
      ['judge6', 6],
      ['judge8', 8],
      ['judge10', 10],
    ] as const
  ).map(([k, n]) => idea(122, 'ysolde', k, `Jugement : à la 3e faute, l'attaquant perd ${n} PV (au lieu de la Peur)`, { one: A[k] }, { one: 'judgement' })),
]

/* --- Série 123 : Morgrut. --- */
const SERIES_123: LabIdea[] = [
  ...(
    [
      ['hide3', A.hide3],
      ['hide4', A.hide4],
      ['rancor-half', A.rancorHalf],
    ] as const
  ).map(([k, e]) => idea(123, 'morgrut', k, `${e.name} (avant : la Rancœur)`, { one: e }, { one: 'rancor' })),
  ...(
    [
      ['long-rancor', 'rancor'],
      ['long-hide3', A.hide3],
      ['long-hide4', A.hide4],
    ] as const
  ).map(([k, e]) => idea(123, 'morgrut', k, `Contre 4 fois les PV : ${nameOf(e)} (avant : la Puissance)`, { one: e }, undefined, longFight('morgrut'))),
]

/* --- Série 124 : Thaldrin. --- */
const SERIES_124: LabIdea[] = [
  idea(124, 'thaldrin', 'sky-bolt3', "Ciel d'orage : un éclair de 3 à chacun de ses tours", { one: A.skyBolt3 }),
  idea(124, 'thaldrin', 'sky-charged', "Ciel d'orage : un éclair à chacun de ses tours, et ses éclairs +2", { one: A.skyCharged }),
  idea(124, 'thaldrin', 'sky-alt', "Ciel d'orage : un tour sur deux, trois éclairs de 2", { one: A.skyAlt }),
  // Avec la Foudre gravée (la direction de l'orage) ; avant : le Ciel du registre et la Foudre
  ...(
    [
      ['bolt3', A.skyBolt3],
      ['charged', A.skyCharged],
      ['alt', A.skyAlt],
    ] as const
  ).map(([k, e]) => idea(124, 'thaldrin', `dir-${k}`, `${e.name} + Foudre, Éclair aveuglant`, { one: e, engraved: ['thunderbolt', 'blinding'] }, { engraved: ['thunderbolt', 'blinding'] })),
  // L'ours et la Fureur : la même aura, des gravures de corps à corps au lieu de ses gravures de Poison les plus offertes
  idea(124, 'thaldrin', 'fury-sky', "Ciel d'orage + Furie des vents, Assaut (avant : Pièce vert-de-gris, Souffle de la tombe)", { engraved: ['wind-fury', 'assault'] }, { engraved: ['verdigris-coin', 'grave-breath'] }),
  idea(124, 'thaldrin', 'fury-sky-bg', "Ciel d'orage + Brise-garde, Soliste (avant : Pièce vert-de-gris, Peau de crapaud)", { engraved: ['guard-break', 'soloist'] }, { engraved: ['verdigris-coin', 'toad-skin'] }),
  // Une seconde aura de la Fureur pour l'ours : l'Élan (celui de Gorak) au lieu du Brasier, au départ et en direction
  idea(124, 'thaldrin', 'onrush', "Élan sur le 1 (avant : le Brasier)", { one: 'onrush' }, { one: 'brasier' }),
  idea(124, 'thaldrin', 'onrush-dir', 'Élan + Assaut, Brise-garde (avant : Brasier + Attiser, Embrasement)', { one: 'onrush', engraved: ['assault', 'guard-break'] }, { one: 'brasier', engraved: ['stoke', 'conflagration'] }),
]

/* --- Série 125 : Fanchon. --- */
const SERIES_125: LabIdea[] = [
  idea(125, 'fanchon', 'ballad-r4', 'Ballade : une note par coup, refrain à la 4e : 4 éclats de 2, +4 PV (plus de +1 PV par coup)', { one: A.balladR4 }),
  idea(125, 'fanchon', 'ballad-r4b', 'Ballade : refrain à la 4e : 4 éclats de 2, +8 PV', { one: A.balladR4b }),
  idea(125, 'fanchon', 'ballad-r3', 'Ballade : refrain à la 3e : 3 éclats de 2, +3 PV', { one: A.balladR3 }),
]

/* --- Série 126 : Elaria et la Sangsue. --- */
const SAIGNEE: Kit = { one: 'open-wound', engraved: ['cleave', 'leech', 'lucky-strike'] }
const SERIES_126: LabIdea[] = [
  // Ce que vaut chaque brique de la Saignée de l'utilisateur (Plaie ouverte, Pourfendre, Sangsue, Coup de chance) : retirée
  idea(126, 'elaria', 'saignee-leech', 'Saignée : la Sangsue (avant : sans elle)', SAIGNEE, { one: 'open-wound', engraved: ['cleave', 'lucky-strike'] }),
  idea(126, 'elaria', 'saignee-lucky', 'Saignée : le Coup de chance (avant : sans lui)', SAIGNEE, { one: 'open-wound', engraved: ['cleave', 'leech'] }),
  idea(126, 'elaria', 'saignee-leech2', 'Saignée : la Sangsue à 2 charges (avant : à 3)', { ...SAIGNEE, engraved: ['cleave', F.leech2, 'lucky-strike'] }, SAIGNEE),
  idea(126, 'brokk', 'thorns-leech', 'Épines + Sangsue (avant : sans elle)', { engraved: ['leech'] }),
  idea(126, 'brokk', 'thorns-leech2', 'Épines + Sangsue à 2 charges (avant : à 3)', { engraved: [F.leech2] }, { engraved: ['leech'] }),
]

/* --- Série 127 : Naraxes, pile ×2. --- */
const SERIES_127: LabIdea[] = [
  idea(127, 'naraxes', 'coin2', 'Pile ou face : pile ×2 (×3 au registre)', { two: F.coin2 }),
  // R31 : la Récolte au coup, gravée sur le 3 nu des porteurs du Poison (avant : la face nue ; la Récolte du registre en repère)
  ...['naraxes', 'ervald', 'thaldrin'].flatMap((who) =>
    ['harvest', F.harvestHeal1, F.harvestDrain2, F.harvestHeal3, F.harvestDrain].map((e) =>
      idea(127, who, `${typeof e === 'string' ? 'harvest-registre' : e.id.replace('lab-p-', '')}`, `${nameOf(e)}, gravée sur le 3`, { engraved: [e] }),
    ),
  ),
]

/* --- Série 128 : les compléments. Le répit mesuré sur l'Ombre (ses adversaires seuls le reçoivent), le combat long à 2 fois
   les PV (4 fois laissait tous les départs à 0 %), le Ciel d'orage moins fort, les stats d'Elaria. --- */
const withRespite = (x: Character) => x.adjusted({ events: [...x.events, SUPPORT.respite] })
const POISON_DIR: Kit = { engraved: ['virulence', 'venom-bite'] }
const sky = (k: string, status: StatusId) => auraSkill(`lab-p-${k}`, STATUSES_P[status].name, status)
const SERIES_128: LabIdea[] = [
  // L'Ombre de l'utilisateur, puis le Poison, contre des adversaires à 2 fois leurs PV (l'« avant » : l'Ombre du registre au même endroit)
  idea(128, 'ervald', 'long2-ombre-dread3', "L'Ombre contre 2 fois les PV : l'Effroi plafonné à 3 charges", { ...OMBRE, one: A.dread3 }, OMBRE, longFight('ervald', 2)),
  {
    ...idea(128, 'ervald', 'long2-ombre-respite', "L'Ombre contre 2 fois les PV : le répit (ses adversaires)", OMBRE, OMBRE, longFight('ervald', 2)),
    apply: (x: Character) => (x.id === 'ervald' ? x : withRespite(x)),
    everyone: true,
  },
  { ...idea(128, 'ervald', 'ombre-respite', "L'Ombre : le répit (ses adversaires)", OMBRE, OMBRE), apply: (x: Character) => (x.id === 'ervald' ? x : withRespite(x)), everyone: true },
  { ...idea(128, 'ysolde', 'judgement-respite', 'Jugement : le répit (ses adversaires)', { one: 'judgement' }, { one: 'judgement' }), apply: (x: Character) => (x.id === 'ysolde' ? x : withRespite(x)), everyone: true },
  { ...idea(128, 'ervald', 'dread-respite', 'Effroi au départ : le répit (ses adversaires)', { one: 'dread' }, { one: 'dread' }), apply: (x: Character) => (x.id === 'ervald' ? x : withRespite(x)), everyone: true },
  idea(128, 'ervald', 'long2-poison-reg', "Aura de poison + Virulence, Morsure contre 2 fois les PV (registre)", POISON_DIR, POISON_DIR, longFight('ervald', 2)),
  idea(128, 'ervald', 'long2-poison-alt4', 'Aura de poison (un tour sur deux, Poison 4) + Virulence, Morsure contre 2 fois les PV', { ...POISON_DIR, one: A.poisonAlt4 }, POISON_DIR, longFight('ervald', 2)),
  idea(128, 'ervald', 'long2-dir-poison', "Aura de poison du registre + Virulence, Morsure, contre 2 fois les PV (avant : l'Ombre)", POISON_DIR, OMBRE, longFight('ervald', 2)),
  // Morgrut : la seconde aura contre 2 fois les PV (avant : la Puissance)
  ...([['rancor', 'rancor'], ['hide3', A.hide3], ['rancor-half', A.rancorHalf]] as const).map(([k, e]) =>
    idea(128, 'morgrut', `long2-${k}`, `Contre 2 fois les PV : ${nameOf(e)} (avant : la Puissance)`, { one: e }, undefined, longFight('morgrut', 2)),
  ),
  // Thaldrin : des ciels plus rares et plus gros, à la force d'aujourd'hui
  idea(128, 'thaldrin', 'sky-alt22', "Ciel d'orage : un tour sur deux, 2 éclairs de 2", { one: sky('skyAlt22', P.skyAlt22) }),
  idea(128, 'thaldrin', 'sky-alt13', "Ciel d'orage : un tour sur deux, un éclair de 3", { one: sky('skyAlt13', P.skyAlt13) }),
  idea(128, 'thaldrin', 'sky-third32', "Ciel d'orage : un tour sur trois, 3 éclairs de 2", { one: sky('skyThird32', P.skyThird32) }),
  idea(128, 'thaldrin', 'sky-charged-crit8', "Ciel d'orage (un éclair, ses éclairs +2), critique 15 → 8 %", { one: A.skyCharged, stats: { critChance: 0.08 } }),
  idea(128, 'thaldrin', 'sky-alt22-dir', "Ciel d'orage (un tour sur deux, 2 éclairs de 2) + Foudre, Éclair aveuglant", { one: sky('skyAlt22', P.skyAlt22), engraved: ['thunderbolt', 'blinding'] }, { engraved: ['thunderbolt', 'blinding'] }),
  // Elaria : ses stats secondaires (vanilla au haut de la bande)
  idea(128, 'elaria', 'dodge22', 'Elaria : esquive 24 → 22 %', { stats: { dodgeChance: 0.22 } }),
  idea(128, 'elaria', 'crit15', 'Elaria : critique 17 → 15 %', { stats: { critChance: 0.15 } }),
  idea(128, 'elaria', 'saignee-dodge22', 'Saignée (Plaie ouverte + Pourfendre, Sangsue, Coup de chance) : esquive 24 → 22 %', { ...SAIGNEE, stats: { dodgeChance: 0.22 } }, SAIGNEE),
]

/* --- Série 129 : Fanchon, ses deux axes (des coups de plus, ou de la magie) et le duel contre Aldric. L'avant : son dé nu. --- */
const SERIES_129: LabIdea[] = [
  idea(129, 'fanchon', 'axis-strikes', 'Veine + Coup de chance, Pièce de la rafale (l’axe des coups)', { one: 'lucky-streak', engraved: ['lucky-strike', 'volley-coin'] }, { one: 'lucky-streak' }),
  idea(129, 'fanchon', 'axis-magic', 'Ballade + Éclair aveuglant, Foudre (l’axe de la magie)', { engraved: ['blinding', 'thunderbolt'] }),
  idea(129, 'fanchon', 'axis-magic-r4', 'Ballade (refrain 4 × 2, +4 PV) + Éclair aveuglant, Foudre', { one: A.balladR4, engraved: ['blinding', 'thunderbolt'] }, { engraved: ['blinding', 'thunderbolt'] }),
]

export const PERSOS_30: readonly LabIdea[] = [...SERIES_120, ...SERIES_121, ...SERIES_122, ...SERIES_123, ...SERIES_124, ...SERIES_125, ...SERIES_126, ...SERIES_127, ...SERIES_128, ...SERIES_129]
