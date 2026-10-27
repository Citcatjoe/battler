/*
 * Laboratoire du quatrième retour du 2026-10-27 (contenu des maîtrises), agent ContentB : Fureur (+1 aura), Magie (+1 aura),
 * Ombre (+2 auras), Rempart (+1 compétence). Séries 85 à 89 ; chaque idée est un statut d'essai construit avec les crochets
 * du moteur (dont ceux de ce retour : déclencheur `heavy`, `cleanse.steal`, `modifyOutgoing` qui voit les statuts du
 * défenseur, `modifyDirect`, `release.per`). Gravure : la brique sur le 3 nu du dé vanilla de chaque porteur de sa maîtrise.
 * Les départs se mesurent une fois la brique au registre (la règle du 3e tour ne reconnaît pas une aura d'essai). Rien
 * ici n'est livré au jeu.
 */
import type { Character } from '../../src/game/character'
import { faceTrigger, type CharacterEvent } from '../../src/game/events'
import { charges, isMechanic, STATUSES, type Status, type StatusDef, type StatusId } from '../../src/game/statuses'
import type { LabIdea } from './ideas'

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
const auraSkill = (id: string, name: string, status: StatusId): CharacterEvent => ({ id, name, trigger: 'naturalThree', effects: [{ type: 'applyStatus', status, stacks: 1 }] })
const onFace = (e: CharacterEvent, face: number): CharacterEvent => ({ ...e, trigger: faceTrigger(face) })

/** Les malus que porte l'adversaire, un par statut (charges non comptées), mécanismes exclus */
const malusOn = (foe: readonly Status[]) => foe.filter((x) => STATUSES[x.id].polarity === 'negative' && !isMechanic(x.id)).length

const id = (s: string) => s as StatusId
const S = {
  // Fureur
  elan3: id('labElan3'),
  elan2: id('labElan2'),
  elan4: id('labElan4'),
  rage: id('labRage'),
  rageStack: id('labRageStack'),
  rushCrit10: id('labRushCrit10'),
  rushCrit5: id('labRushCrit5'),
  rush: id('labRush'),
  rush2: id('labRush2'),
  fervorCrit10: id('labFervorCrit10'),
  // Magie
  surge: id('labSurge'),
  surge2: id('labSurge2'),
  surgeHalf: id('labSurgeHalf'),
  // Ombre
  grip: id('labGrip'),
  grip2: id('labGrip2'),
  pilferDodge10: id('labPilferDodge10'),
  pilferDodge5: id('labPilferDodge5'),
  pilferDodge0: id('labPilferDodge0'),
  pilferDodge7: id('labPilferDodge7'),
  pilferHurt: id('labPilferHurt'),
  pilferHit: id('labPilferHit'),
  surgeDouble: id('labSurgeDouble'),
  // Fournaise (Magie, le feu qui lit la Brûlure)
  forge2: id('labForge2'),
  forge3: id('labForge3'),
  forgePer: id('labForgePer'),
}

const steal = (by: StatusId) => [{ type: 'cleanse' as const, polarity: 'positive' as const, target: 'opponent' as const, count: 1, steal: by }]

const STATUSES_B: Record<string, StatusDef> = {
  [S.elan3]: aura('Élan (+3 Ferveur)', { family: 'power', reactions: { heavy: (s) => [{ type: 'applyStatus', status: 'momentum', stacks: 3 * charges(s) }] } }),
  [S.elan2]: aura('Élan (+2 Ferveur)', { family: 'power', reactions: { heavy: (s) => [{ type: 'applyStatus', status: 'momentum', stacks: 2 * charges(s) }] } }),
  [S.elan4]: aura('Élan (+4 Ferveur)', { family: 'power', reactions: { heavy: (s) => [{ type: 'applyStatus', status: 'momentum', stacks: 4 * charges(s) }] } }),
  [S.rageStack]: { ...STATUSES.momentum, name: 'Rage', spentOnHit: undefined },
  [S.rage]: aura('Rage (+1 à ses coups par gros coup)', { family: 'power', reactions: { heavy: (s) => [{ type: 'applyStatus', status: S.rageStack, stacks: charges(s) }] } }),
  [S.rushCrit10]: aura('Élan (+10 % de critique, un coup par gros coup)', { family: 'tempo', modifyStats: (st, s) => ({ ...st, critChance: st.critChance + 0.1 * charges(s) }), reactions: { heavy: () => [{ type: 'applyStatus', status: 'bloodFrenzyStrike', stacks: 1 }] } }),
  [S.rushCrit5]: aura('Élan (+5 % de critique, un coup par gros coup)', { family: 'tempo', modifyStats: (st, s) => ({ ...st, critChance: st.critChance + 0.05 * charges(s) }), reactions: { heavy: () => [{ type: 'applyStatus', status: 'bloodFrenzyStrike', stacks: 1 }] } }),
  [S.rush]: aura('Élan (un coup par gros coup)', { family: 'tempo', reactions: { heavy: (s) => [{ type: 'applyStatus', status: 'bloodFrenzyStrike', stacks: charges(s) }] } }),
  [S.rush2]: aura('Élan (deux coups par gros coup)', { family: 'tempo', reactions: { heavy: (s) => [{ type: 'applyStatus', status: 'bloodFrenzyStrike', stacks: 2 * charges(s) }] } }),
  [S.fervorCrit10]: aura('Élan (+10 % de critique, +3 Ferveur par gros coup)', { family: 'power', modifyStats: (st, s) => ({ ...st, critChance: st.critChance + 0.1 * charges(s) }), reactions: { heavy: () => [{ type: 'applyStatus', status: 'momentum', stacks: 3 }] } }),
  [S.surge]: aura('Surtension (+1 par impact)', { family: 'affliction', modifyDirect: (n, s) => n + charges(s) }),
  [S.surge2]: aura('Surtension (+2 par impact)', { family: 'affliction', modifyDirect: (n, s) => n + 2 * charges(s) }),
  [S.surgeHalf]: aura('Surtension (moitié plus)', { family: 'affliction', modifyDirect: (n) => Math.ceil(n * 1.5) }),
  [S.grip]: aura('Emprise (+1 par malus)', { family: 'power', modifyOutgoing: (d, s, foe) => d + charges(s) * malusOn(foe) }),
  [S.grip2]: aura('Emprise (+2 par malus)', { family: 'power', modifyOutgoing: (d, s, foe) => d + 2 * charges(s) * malusOn(foe) }),
  [S.pilferDodge10]: aura('Larcin (+10 % d’esquive)', { family: 'seals', modifyStats: (st, s) => ({ ...st, dodgeChance: st.dodgeChance + 0.1 * charges(s) }), reactions: { dodge: () => steal(S.pilferDodge10) } }),
  [S.pilferDodge5]: aura('Larcin (+5 % d’esquive)', { family: 'seals', modifyStats: (st, s) => ({ ...st, dodgeChance: st.dodgeChance + 0.05 * charges(s) }), reactions: { dodge: () => steal(S.pilferDodge5) } }),
  [S.pilferDodge0]: aura('Larcin (esquive seule)', { family: 'seals', reactions: { dodge: () => steal(S.pilferDodge0) } }),
  [S.pilferDodge7]: aura('Larcin (+7 % d’esquive)', { family: 'seals', modifyStats: (st, s) => ({ ...st, dodgeChance: st.dodgeChance + 0.07 * charges(s) }), reactions: { dodge: () => steal(S.pilferDodge7) } }),
  [S.pilferHurt]: aura('Larcin (coup reçu)', { family: 'seals', reactions: { hurt: () => steal(S.pilferHurt) } }),
  [S.pilferHit]: aura('Larcin (coup qui touche)', { family: 'seals', reactions: { hit: () => steal(S.pilferHit) } }),
  [S.surgeDouble]: aura('Surtension (doublés)', { family: 'affliction', modifyDirect: (n) => n * 2 }),
  [S.forge2]: aura('Fournaise (+2 contre un adversaire qui brûle)', { family: 'power', modifyOutgoing: (d, _s, foe) => (foe.some((x) => x.id === 'burn') ? d + 2 : d) }),
  [S.forge3]: aura('Fournaise (+3 contre un adversaire qui brûle)', { family: 'power', modifyOutgoing: (d, _s, foe) => (foe.some((x) => x.id === 'burn') ? d + 3 : d) }),
  [S.forgePer]: aura('Fournaise (+1 par Brûlure)', { family: 'power', modifyOutgoing: (d, _s, foe) => d + (foe.find((x) => x.id === 'burn')?.stacks ?? 0) }),
}

const shockwave = (status: StatusId, per: number): CharacterEvent => ({
  id: `lab-shockwave-${status}-${per}`,
  name: `Onde de choc (${per} par coup encaissé)`,
  trigger: 'naturalThree',
  when: [{ type: 'hasStatus', who: 'self', status }],
  effects: [{ type: 'release', status, min: 0, per, target: 'opponent', source: 'strike' }],
})

const SKILLS = {
  elan3: auraSkill('lab-elan3', 'Élan +3', S.elan3),
  elan2: auraSkill('lab-elan2', 'Élan +2', S.elan2),
  elan4: auraSkill('lab-elan4', 'Élan +4', S.elan4),
  rage: auraSkill('lab-rage', 'Rage', S.rage),
  rushCrit10: auraSkill('lab-rush-crit10', 'Élan +10 % / coup', S.rushCrit10),
  rushCrit5: auraSkill('lab-rush-crit5', 'Élan +5 % / coup', S.rushCrit5),
  rush: auraSkill('lab-rush', 'Élan / coup', S.rush),
  rush2: auraSkill('lab-rush2', 'Élan / deux coups', S.rush2),
  fervorCrit10: auraSkill('lab-fervor-crit10', 'Élan +10 % / Ferveur', S.fervorCrit10),
  surge: auraSkill('lab-surge', 'Surtension +1', S.surge),
  surge2: auraSkill('lab-surge2', 'Surtension +2', S.surge2),
  surgeHalf: auraSkill('lab-surge-half', 'Surtension ×1,5', S.surgeHalf),
  grip: auraSkill('lab-grip', 'Emprise +1', S.grip),
  grip2: auraSkill('lab-grip2', 'Emprise +2', S.grip2),
  pilfer10: auraSkill('lab-pilfer10', 'Larcin +10 %', S.pilferDodge10),
  pilfer5: auraSkill('lab-pilfer5', 'Larcin +5 %', S.pilferDodge5),
  pilfer0: auraSkill('lab-pilfer0', 'Larcin (esquive)', S.pilferDodge0),
  pilfer7: auraSkill('lab-pilfer7', 'Larcin +7 %', S.pilferDodge7),
  pilferHurt: auraSkill('lab-pilfer-hurt', 'Larcin (coup reçu)', S.pilferHurt),
  pilferHit: auraSkill('lab-pilfer-hit', 'Larcin (coup qui touche)', S.pilferHit),
  // Les jauges d'essai ne sont pas dans `STATUS_IDS` (le moteur ne remplit que les siennes) : celles de la Rétribution, trois
  shock3x2: shockwave('retribution', 2),
  shock3x3: shockwave('retribution', 3),
  shock3x4: shockwave('retribution', 4),
  surgeDouble: auraSkill('lab-surge-double', 'Surtension ×2', S.surgeDouble),
  forge2: auraSkill('lab-forge2', 'Fournaise +2', S.forge2),
  forge3: auraSkill('lab-forge3', 'Fournaise +3', S.forge3),
  forgePer: auraSkill('lab-forge-per', 'Fournaise +1 par Brûlure', S.forgePer),
}

/** La brique gravée sur le 3 nu du dé vanilla */
const engrave = (series: number, character: string, e: CharacterEvent, presence?: StatusId): LabIdea => ({
  series,
  id: `cb-${character}-${e.id}`,
  character,
  name: `${character} : ${e.name} gravée`,
  schema: 'Gravure',
  family: 'Maîtrises',
  pitch: e.name,
  apply: (c: Character) => c.adjusted({ events: [...c.events, onFace(e, 3)] }),
  watch: [e.id],
  statuses: STATUSES_B,
  ...(presence && { presence }),
})
const FURY = ['gorak', 'morgrut']
const MAGIC = ['thaldrin', 'ysolde', 'fanchon']
const SHADOW = ['ervald', 'aldric']
const BULWARK = ['brokk', 'morgrut']
const each = (hosts: string[], f: (h: string) => LabIdea[]) => hosts.flatMap(f)

export const CONTENT_B: readonly LabIdea[] = [
  // Série 85 : l'aura de la Fureur, au gros coup, consommatrice seule (Ferveur, Rage) ; série 90 : avec sa production
  ...each(FURY, (h) => [engrave(85, h, SKILLS.elan2), engrave(85, h, SKILLS.elan3), engrave(85, h, SKILLS.elan4), engrave(85, h, SKILLS.rage)]),
  ...each(FURY, (h) => [engrave(90, h, SKILLS.rushCrit10), engrave(90, h, SKILLS.rushCrit5), engrave(90, h, SKILLS.rush), engrave(90, h, SKILLS.rush2), engrave(90, h, SKILLS.fervorCrit10)]),
  // Série 86 : l'aura de la Magie, aux dégâts directs
  ...each(MAGIC, (h) => [engrave(86, h, SKILLS.surge), engrave(86, h, SKILLS.surge2), engrave(86, h, SKILLS.surgeHalf)]),
  ...each(['thaldrin', 'ysolde'], (h) => [engrave(92, h, SKILLS.surgeDouble)]),
  engrave(91, 'thaldrin', SKILLS.forge2),
  engrave(91, 'thaldrin', SKILLS.forge3),
  engrave(91, 'thaldrin', SKILLS.forgePer),
  // Série 87 : l'Emprise, aux malus de l'adversaire
  ...each(SHADOW, (h) => [engrave(87, h, SKILLS.grip), engrave(87, h, SKILLS.grip2)]),
  // Série 88 : le Larcin, le bonus déjà porté
  ...each(SHADOW, (h) => [SKILLS.pilfer10, SKILLS.pilfer7, SKILLS.pilfer5, SKILLS.pilfer0, SKILLS.pilferHurt, SKILLS.pilferHit].map((e) => engrave(88, h, e))),
  // Série 89 : l'Onde de choc du Rempart, aux coups encaissés
  ...each(BULWARK, (h) => [engrave(89, h, SKILLS.shock3x2), engrave(89, h, SKILLS.shock3x3), engrave(89, h, SKILLS.shock3x4)]),
]
