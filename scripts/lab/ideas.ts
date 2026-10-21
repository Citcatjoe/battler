/*
 * Idées de sorts à essayer au laboratoire (`scripts/lab.report.ts`, méthode : docs/SORTS.md).
 * Une idée modifie UN personnage précis (pas sa famille : Brannoc n'hérite pas d'une idée de Thaldrin)
 * avec les briques existantes : déclencheurs (`events.ts`), conditions `when`, `chance`, `limit`,
 * statuts du registre. Une idée peut aussi déclarer des statuts d'essai (`statuses`), construits avec
 * les crochets existants : ils ne vivent que le temps du laboratoire et ne touchent pas au registre.
 * Rien ici n'est livré au jeu.
 */
import type { Character } from '../../src/game/character'
import type { CharacterEvent } from '../../src/game/events'
import { STATUSES, type StatusDef } from '../../src/game/statuses'

export interface LabIdea {
  id: string
  /**
   * Série d'essais : 1 = idée ajoutée au kit ; 2 = à puissance égale (avec sa compensation) ;
   * 3 = petite touche sur une compétence existante signalée par l'audit (`scripts/skills.report.ts`) ;
   * 4 = les six compétences signalées par l'audit 0.39.1, touches seules et kits compensés (SORTS.md § 10)
   */
  series: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13
  /** Personnage modifié (id du roster) */
  character: string
  name: string
  /** Schéma de sort (docs/SORTS.md § 2) */
  schema: string
  /** Famille d'effets (docs/FAMILLES.md) */
  family: string
  /** La phrase en jeu */
  pitch: string
  apply: (c: Character) => Character
  /** Compétences ou statuts dont on compte les déclenchements (« moments ») */
  watch: readonly string[]
  /** Statuts d'essai, ajoutés au registre le temps du laboratoire */
  statuses?: Record<string, StatusDef>
}

/** Ajoute des compétences au personnage. */
const add =
  (...events: CharacterEvent[]) =>
  (c: Character) =>
    c.adjusted({ events: [...c.events, ...events] })

/** Retire des compétences (leur jet redevient un coup normal). */
const remove =
  (...ids: string[]) =>
  (c: Character) =>
    c.adjusted({ events: c.events.filter((e) => !ids.includes(e.id)) })

/** Enchaîne plusieurs modifications. */
const all =
  (...steps: ((c: Character) => Character)[]) =>
  (c: Character) =>
    steps.reduce((acc, step) => step(acc), c)

/** Change des stats (valeurs absolues). */
const stats =
  (changes: Parameters<Character['adjusted']>[0]['stats']) =>
  (c: Character) =>
    c.adjusted({ stats: changes })

/** Remplace une compétence existante (même id conservé si `next.id` est identique). */
const replace =
  (id: string, next: (old: CharacterEvent) => CharacterEvent) =>
  (c: Character) =>
    c.adjusted({ events: c.events.map((e) => (e.id === id ? next(e) : e)) })

/** Une idée déclinée pour plusieurs personnages (l'original et sa variante). */
function forEach(
  characters: readonly string[],
  idea: Omit<LabIdea, 'character' | 'id' | 'series'> & { id: string },
  series: LabIdea['series'] = 4,
): LabIdea[] {
  return characters.map((character) => ({ ...idea, series, character, id: `${character}-${idea.id}` }))
}

const COIN = STATUSES.coinFlip
const HOLY = STATUSES.holyAura
/** Aura de sainteté plafonnée à `cap` charges, `heal` PV par charge. */
const holy = (cap: number, heal: number): StatusDef => ({
  ...HOLY,
  maxStacks: cap,
  summary: `Le porteur regagne ${heal} PV par charge à la fin de chacun de ses tours (${cap} charges au plus). Permanente.`,
  describe: (st) => `Regagne ${heal * st.stacks} PV à la fin de chacun de ses tours`,
  badge: (st) => `+${heal * st.stacks}`,
  onTurnEnd: (st) => [{ type: 'heal', amount: heal * st.stacks }],
})
const holyAs = (status: string) =>
  replace('holy-aura', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: status as never, stacks: 1 }] }))
/** Purification avec un effet qui sert même quand l'adversaire n'a rien à retirer. */
const purifyPlus = (...extra: CharacterEvent['effects']) =>
  replace('purification', (e) => ({ ...e, effects: [...e.effects, ...extra] }))
const PRIESTS = ['ysolde', 'berengere']
const PALADINS = ['aldric', 'gauvain']
const THIEVES = ['naraxes', 'ssythra']
const DRUIDS = ['thaldrin', 'brannoc']
const retribution2 = replace('retribution', (e) => ({ ...e, effects: [{ type: 'release', status: 'labRetribution2' as never, min: 1, target: 'opponent' }] }))
const immunityPlus = (...extra: CharacterEvent['effects']) =>
  replace('immunity-aura', (e) => ({ ...e, effects: [...e.effects, ...extra] }))

const SERIES_4: LabIdea[] = [
  // Pile ou face : la pièce ne touche pas, et face ne fait rien (FAMILLES.md § 6.2)
  ...forEach(THIEVES, {
    id: 'pile-touche',
    name: 'Pile qui touche',
    schema: 'Retouche (FAMILLES.md § 6.2 A)',
    family: 'Fortune',
    pitch: 'Pile : 15 dégâts directs, et la pièce compte comme un coup qui touche (l’Aura de décoction empoisonne).',
    statuses: { labCoinTouch: { ...COIN, coinToss: { damage: 15, headsTouches: true } } },
    apply: replace('coin-flip', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: 'labCoinTouch' as never, stacks: 1 }] })),
    watch: ['coin-flip'],
  }),
  ...forEach(THIEVES, {
    id: 'face-frappe',
    name: 'Face qui frappe',
    schema: 'Retouche (FAMILLES.md § 6.2 B)',
    family: 'Fortune',
    pitch: 'Face n’est plus vide : elle frappe normalement avec son dé. Pile reste 15 dégâts directs.',
    statuses: { labCoinTails: { ...COIN, coinToss: { damage: 15, tailsStrikes: true } } },
    apply: replace('coin-flip', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: 'labCoinTails' as never, stacks: 1 }] })),
    watch: ['coin-flip'],
  }),
  ...forEach(THIEVES, {
    id: 'pile-touche-face-frappe',
    name: 'Pile qui touche, face qui frappe',
    schema: 'Retouche (FAMILLES.md § 6.2 A + B)',
    family: 'Fortune',
    pitch: 'Pile : 15 dégâts directs qui touchent (décoction) ; face : un coup normal.',
    statuses: { labCoinBoth: { ...COIN, coinToss: { damage: 15, headsTouches: true, tailsStrikes: true } } },
    apply: replace('coin-flip', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: 'labCoinBoth' as never, stacks: 1 }] })),
    watch: ['coin-flip'],
  }),

  // Aura de sainteté (écrasante) et Purification (gâchée) : un seul kit, celui des prêtresses
  ...forEach(PRIESTS, {
    id: 'saintete-3',
    name: 'Sainteté plafonnée à 3',
    schema: 'Petite touche',
    family: 'Soin',
    pitch: 'L’aura ne se cumule plus au-delà de 3 charges (6 PV par tour au plus).',
    statuses: { labHoly3: holy(3, 2) },
    apply: holyAs('labHoly3'),
    watch: ['holy-aura'],
  }),
  ...forEach(PRIESTS, {
    id: 'saintete-2x3',
    name: 'Sainteté à 2 charges de 3 PV',
    schema: 'Petite touche',
    family: 'Soin',
    pitch: 'Deux charges au plus, mais 3 PV par charge (6 PV par tour au plus) : le soin arrive plus vite et s’arrête plus tôt.',
    statuses: { labHoly2x3: holy(2, 3) },
    apply: holyAs('labHoly2x3'),
    watch: ['holy-aura'],
  }),
  ...forEach(PRIESTS, {
    id: 'purification-eclat',
    name: 'Purification et éclat',
    schema: 'Petite touche',
    family: 'Sceaux',
    pitch: 'En plus de retirer le dernier bonus adverse, la lumière inflige 3 dégâts directs : elle ne tombe plus à vide.',
    apply: purifyPlus({ type: 'damage', amount: 3, target: 'opponent' }),
    watch: ['purification'],
  }),
  ...forEach(PRIESTS, {
    id: 'purification-aveugle',
    name: 'Purification aveuglante',
    schema: 'Petite touche',
    family: 'Sceaux',
    pitch: 'En plus de retirer le dernier bonus adverse, la lumière l’affaiblit : ses coups font 2 de moins pendant 2 tours.',
    apply: purifyPlus({ type: 'applyStatus', status: 'weakened', stacks: 2, turns: 2, target: 'opponent' }),
    watch: ['purification'],
  }),
  ...forEach(PRIESTS, {
    id: 'kit-2-eclat',
    name: 'Kit : sainteté à 2, purification et éclat',
    schema: 'Kit compensé',
    family: 'Soin + Sceaux',
    pitch: 'Sainteté plafonnée à 2 charges (4 PV par tour), Purification qui inflige aussi 3 dégâts directs.',
    statuses: { labHoly2: holy(2, 2) },
    apply: all(holyAs('labHoly2'), purifyPlus({ type: 'damage', amount: 3, target: 'opponent' })),
    watch: ['holy-aura', 'purification'],
  }),
  ...forEach(PRIESTS, {
    id: 'kit-3-eclat',
    name: 'Kit : sainteté à 3, purification et éclat',
    schema: 'Kit compensé',
    family: 'Soin + Sceaux',
    pitch: 'Sainteté plafonnée à 3 charges (6 PV par tour), Purification qui inflige aussi 3 dégâts directs.',
    statuses: { labHoly3: holy(3, 2) },
    apply: all(holyAs('labHoly3'), purifyPlus({ type: 'damage', amount: 3, target: 'opponent' })),
    watch: ['holy-aura', 'purification'],
  }),
  ...forEach(PRIESTS, {
    id: 'kit-2x3-eclat',
    name: 'Kit : sainteté à 2 × 3 PV, purification et éclat',
    schema: 'Kit compensé',
    family: 'Soin + Sceaux',
    pitch: 'Sainteté à 2 charges de 3 PV (6 PV par tour), Purification qui inflige aussi 3 dégâts directs.',
    statuses: { labHoly2x3: holy(2, 3) },
    apply: all(holyAs('labHoly2x3'), purifyPlus({ type: 'damage', amount: 3, target: 'opponent' })),
    watch: ['holy-aura', 'purification'],
  }),
  ...forEach(PRIESTS, {
    id: 'kit-3-aveugle',
    name: 'Kit : sainteté à 3, purification aveuglante',
    schema: 'Kit compensé',
    family: 'Soin + Sceaux',
    pitch: 'Sainteté plafonnée à 3 charges, Purification qui affaiblit aussi l’adversaire (−2 pendant 2 tours).',
    statuses: { labHoly3: holy(3, 2) },
    apply: all(holyAs('labHoly3'), purifyPlus({ type: 'applyStatus', status: 'weakened', stacks: 2, turns: 2, target: 'opponent' })),
    watch: ['holy-aura', 'purification'],
  }),

  // Rétribution (écrasante) et Aura d'immunité (coûte des victoires) : un seul kit, celui du paladin
  ...forEach(PALADINS, {
    id: 'immunite-riposte',
    name: 'Immunité qui riposte',
    schema: 'Retouche (FAMILLES.md § 6.4, variante de B)',
    family: 'Sceaux + Représailles',
    pitch: 'En posant l’aura, il se met aussi en garde : une Riposte attend le prochain coup qui le touche.',
    apply: immunityPlus({ type: 'applyStatus', status: 'riposte', stacks: 1 }),
    watch: ['immunity-aura', 'riposte'],
  }),
  ...forEach(PALADINS, {
    id: 'immunite-regeneration',
    name: 'Immunité et régénération',
    schema: 'Petite touche',
    family: 'Sceaux + Soin',
    pitch: 'En posant l’aura, il se régénère : 2 PV par tour pendant 3 tours.',
    apply: immunityPlus({ type: 'applyStatus', status: 'regeneration', stacks: 2, turns: 3 }),
    watch: ['immunity-aura'],
  }),
  ...forEach(PALADINS, {
    id: 'kit-2-jauges-riposte',
    name: 'Kit : Rétribution à 2 jauges, immunité qui riposte',
    schema: 'Kit compensé',
    family: 'Représailles + Sceaux',
    pitch: 'La Rétribution ne retient que les deux derniers coups ; l’Aura d’immunité pose aussi une Riposte.',
    statuses: { labRetribution2: { ...STATUSES.retribution, fillsOnHurt: { slots: 2 } } },
    apply: all(retribution2, immunityPlus({ type: 'applyStatus', status: 'riposte', stacks: 1 })),
    watch: ['retribution', 'immunity-aura', 'riposte'],
  }),
  ...forEach(PALADINS, {
    id: 'kit-2-jauges-soin',
    name: 'Kit : Rétribution à 2 jauges, immunité et soin',
    schema: 'Kit compensé',
    family: 'Représailles + Sceaux',
    pitch: 'La Rétribution ne retient que les deux derniers coups ; l’Aura d’immunité rend aussi 4 PV.',
    statuses: { labRetribution2: { ...STATUSES.retribution, fillsOnHurt: { slots: 2 } } },
    apply: all(retribution2, immunityPlus({ type: 'heal', amount: 4 })),
    watch: ['retribution', 'immunity-aura'],
  }),
  ...forEach(PALADINS, {
    id: 'kit-2-jauges-riposte-soin',
    name: 'Kit : Rétribution à 2 jauges, immunité qui riposte et soigne',
    schema: 'Kit compensé',
    family: 'Représailles + Sceaux',
    pitch: 'La Rétribution ne retient que les deux derniers coups ; l’Aura d’immunité pose une Riposte et rend 4 PV.',
    statuses: { labRetribution2: { ...STATUSES.retribution, fillsOnHurt: { slots: 2 } } },
    apply: all(retribution2, immunityPlus({ type: 'applyStatus', status: 'riposte', stacks: 1 }, { type: 'heal', amount: 4 })),
    watch: ['retribution', 'immunity-aura', 'riposte'],
  }),

  // Second tour : réglages des meilleures pistes du premier
  ...[18, 20].flatMap((damage) =>
    forEach(THIEVES, {
      id: `pile-touche-face-frappe-${damage}`,
      name: `Pile qui touche (${damage}), face qui frappe`,
      schema: 'Retouche (FAMILLES.md § 6.2 A + B)',
      family: 'Fortune',
      pitch: `Pile : ${damage} dégâts directs qui touchent (décoction) ; face : un coup normal.`,
      statuses: { [`labCoinBoth${damage}`]: { ...COIN, coinToss: { damage, headsTouches: true, tailsStrikes: true } } },
      apply: replace('coin-flip', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: `labCoinBoth${damage}` as never, stacks: 1 }] })),
      watch: ['coin-flip'],
    }),
  ),
  ...[4, 5].flatMap((damage) =>
    forEach(PRIESTS, {
      id: `kit-2-eclat-${damage}`,
      name: `Kit : sainteté à 2, purification et éclat de ${damage}`,
      schema: 'Kit compensé',
      family: 'Soin + Sceaux',
      pitch: `Sainteté plafonnée à 2 charges (4 PV par tour), Purification qui inflige aussi ${damage} dégâts directs.`,
      statuses: { labHoly2: holy(2, 2) },
      apply: all(holyAs('labHoly2'), purifyPlus({ type: 'damage', amount: damage, target: 'opponent' })),
      watch: ['holy-aura', 'purification'],
    }),
  ),
  ...forEach(PALADINS, {
    id: 'kit-2-jauges-bouclier',
    name: 'Kit : Rétribution à 2 jauges, immunité et bouclier',
    schema: 'Kit compensé',
    family: 'Représailles + Sceaux + Garde',
    pitch: 'La Rétribution ne retient que les deux derniers coups ; l’Aura d’immunité pose aussi 5 points d’Armure temporaire.',
    statuses: { labRetribution2: { ...STATUSES.retribution, fillsOnHurt: { slots: 2 } } },
    apply: all(retribution2, immunityPlus({ type: 'applyStatus', status: 'bonusArmor', stacks: 5 })),
    watch: ['retribution', 'immunity-aura'],
  }),
  ...forEach(PALADINS, {
    id: 'kit-2-jauges-riposte-soin-2',
    name: 'Kit : Rétribution à 2 jauges, immunité qui riposte et soigne 2',
    schema: 'Kit compensé',
    family: 'Représailles + Sceaux',
    pitch: 'La Rétribution ne retient que les deux derniers coups ; l’Aura d’immunité pose une Riposte et rend 2 PV.',
    statuses: { labRetribution2: { ...STATUSES.retribution, fillsOnHurt: { slots: 2 } } },
    apply: all(retribution2, immunityPlus({ type: 'applyStatus', status: 'riposte', stacks: 1 }, { type: 'heal', amount: 2 })),
    watch: ['retribution', 'immunity-aura', 'riposte'],
  }),
  ...forEach(PALADINS, {
    id: 'immunite-bouclier',
    name: 'Immunité et bouclier',
    schema: 'Petite touche',
    family: 'Sceaux + Garde',
    pitch: 'En posant l’aura, il gagne 5 points d’Armure temporaire.',
    apply: immunityPlus({ type: 'applyStatus', status: 'bonusArmor', stacks: 5 }),
    watch: ['immunity-aura'],
  }),
  ...[2, 3].flatMap((armor) =>
    forEach(PALADINS, {
      id: `immunite-bouclier-${armor}`,
      name: `Immunité et bouclier de ${armor}`,
      schema: 'Petite touche',
      family: 'Sceaux + Garde',
      pitch: `En posant l’aura, il gagne ${armor} points d’Armure temporaire.`,
      apply: immunityPlus({ type: 'applyStatus', status: 'bonusArmor', stacks: armor }),
      watch: ['immunity-aura'],
    }),
  ),
  ...forEach(PALADINS, {
    id: 'immunite-soin-2',
    name: 'Immunité et soin de 2',
    schema: 'Petite touche',
    family: 'Sceaux + Soin',
    pitch: 'En posant l’aura, il regagne 2 PV.',
    apply: immunityPlus({ type: 'heal', amount: 2 }),
    watch: ['immunity-aura'],
  }),
  // Pile ou face, second essai (refus de l'utilisateur : garder face = rien, pile = un gros coup)
  ...[20, 25].flatMap((damage) =>
    forEach(THIEVES, {
      id: `pile-${damage}`,
      name: `Pile à ${damage}`,
      schema: 'Petite touche',
      family: 'Fortune',
      pitch: `Pile : ${damage} dégâts directs ; face, rien.`,
      statuses: { [`labPile${damage}`]: { ...COIN, coinToss: { damage } } },
      apply: replace('coin-flip', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: `labPile${damage}` as never, stacks: 1 }] })),
      watch: ['coin-flip'],
    }),
  ),
  ...[18, 20, 22].flatMap((damage) =>
    forEach(THIEVES, {
      id: `pile-touche-seule-${damage}`,
      name: `Pile qui touche à ${damage}`,
      schema: 'Retouche (FAMILLES.md § 6.2 A)',
      family: 'Fortune',
      pitch: `Pile : ${damage} dégâts directs, qui comptent comme un coup qui touche (décoction) ; face, rien.`,
      statuses: { [`labPileTouche${damage}`]: { ...COIN, coinToss: { damage, headsTouches: true } } },
      apply: replace('coin-flip', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: `labPileTouche${damage}` as never, stacks: 1 }] })),
      watch: ['coin-flip'],
    }),
  ),
  // Aura d'immunité, second essai : une règle d'aura lisible (tant qu'elle est là : aucun malus et +armure)
  ...[1, 2].flatMap((armor) =>
    forEach(PALADINS, {
      id: `immunite-armure-${armor}`,
      name: `Immunité et armure +${armor}`,
      schema: 'Petite touche',
      family: 'Sceaux + Garde',
      pitch: `Tant que l’aura est là : aucun malus ne peut lui être posé, et son armure gagne ${armor}. Sans bouclier temporaire.`,
      statuses: {
        [`labImmunityArmor${armor}`]: {
          ...STATUSES.immunityAura,
          modifyStats: (stats: Parameters<NonNullable<StatusDef['modifyStats']>>[0]) => ({ ...stats, armor: stats.armor + armor }),
        },
      },
      apply: (c: Character) =>
        c.adjusted({
          events: c.events.map((e) =>
            e.id.startsWith('immunity-aura')
              ? { ...e, effects: [{ type: 'cleanse', polarity: 'negative' }, { type: 'applyStatus', status: `labImmunityArmor${armor}` as never, stacks: 1 }] }
              : e,
          ),
        }),
      watch: ['immunity-aura', 'immunity-aura-gauvain'],
    }),
  ),
  // Fleur de vie (presque inutile) : FAMILLES.md § 6.3
  ...forEach(DRUIDS, {
    id: 'fleur-ouverte',
    name: 'Fleur qui s’ouvre',
    schema: 'Retouche (FAMILLES.md § 6.3 A)',
    family: 'Soin',
    pitch: 'Régénération 2 pendant 3 tours au lieu de 3 PV d’un coup : le soin continue sous la forme d’ours.',
    apply: replace('life-bloom', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: 'regeneration', stacks: 2, turns: 3 }] })),
    watch: ['life-bloom'],
  }),
  ...forEach(DRUIDS, {
    id: 'fleur-ouverte-4',
    name: 'Fleur qui s’ouvre, 4 tours',
    schema: 'Retouche (FAMILLES.md § 6.3 A)',
    family: 'Soin',
    pitch: 'Régénération 2 pendant 4 tours.',
    apply: replace('life-bloom', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: 'regeneration', stacks: 2, turns: 4 }] })),
    watch: ['life-bloom'],
  }),
  ...forEach(DRUIDS, {
    id: 'fleur-5',
    name: 'Fleur de vie à 5',
    schema: 'Petite touche (FAMILLES.md § 6.3 B)',
    family: 'Soin',
    pitch: '5 PV au lieu de 3.',
    apply: replace('life-bloom', (e) => ({ ...e, effects: [{ type: 'heal', amount: 5 }] })),
    watch: ['life-bloom'],
  }),
]

/* --- Série 5 : notes de l'utilisateur (poison, vol de vie, aura de la barde, épines) et deux
   compétences signalées par l'audit 0.42.0 (Fausse note, immunité de Gauvain). SORTS.md § 11. --- */
const UNDEAD = ['ervald', 'caldrec']
const DWARVES = ['brokk', 'grimbald']
const BARDS = ['fanchon', 'melisande']
const swap = (id: string, effects: CharacterEvent['effects'], extra: Partial<CharacterEvent> = {}) =>
  replace(id, (e) => ({ ...e, ...extra, effects }))
const SERIES_5: LabIdea[] = [
  // Aura de poison : aujourd'hui des dégâts directs au début du tour du PORTEUR, sans rapport avec le Poison
  ...forEach(UNDEAD, {
    id: 'aura-empoisonne',
    name: 'Aura qui empoisonne',
    schema: 'Clarification',
    family: 'Affliction',
    pitch: 'Au début de chacun de ses tours, l’aura pose 1 charge de Poison par charge d’aura sur l’adversaire : il la subit à son tour, comme tout poison.',
    statuses: { labPoisonAura: { ...STATUSES.poisonAura, onTurnStart: (st) => [{ type: 'applyStatus', status: 'poison', stacks: st.stacks, target: 'opponent' }] } },
    apply: swap('poison-aura', [{ type: 'applyStatus', status: 'labPoisonAura' as never, stacks: 1 }]),
    watch: ['poison-aura'],
  }, 5),
  ...forEach(UNDEAD, {
    id: 'aura-empoisonne-2',
    name: 'Aura qui empoisonne (2 par charge)',
    schema: 'Clarification',
    family: 'Affliction',
    pitch: 'Comme ci-dessus, 2 charges de Poison par charge d’aura.',
    statuses: { labPoisonAura2: { ...STATUSES.poisonAura, onTurnStart: (st) => [{ type: 'applyStatus', status: 'poison', stacks: 2 * st.stacks, target: 'opponent' }] } },
    apply: swap('poison-aura', [{ type: 'applyStatus', status: 'labPoisonAura2' as never, stacks: 1 }]),
    watch: ['poison-aura'],
  }, 5),
  ...[1, 2].flatMap((cap) =>
    forEach(UNDEAD, {
      id: `aura-empoisonne-plafond-${cap}`,
      name: `Aura qui empoisonne, ${cap} charge${cap > 1 ? 's' : ''} d’aura au plus`,
      schema: 'Clarification',
      family: 'Affliction',
      pitch: `L’aura pose 1 charge de Poison par charge d’aura au début de chacun de ses tours, et ne dépasse pas ${cap} charge${cap > 1 ? 's' : ''}.`,
      statuses: { [`labPoisonAuraCap${cap}`]: { ...STATUSES.poisonAura, maxStacks: cap, onTurnStart: (st) => [{ type: 'applyStatus', status: 'poison', stacks: st.stacks, target: 'opponent' }] } },
      apply: swap('poison-aura', [{ type: 'applyStatus', status: `labPoisonAuraCap${cap}` as never, stacks: 1 }]),
      watch: ['poison-aura'],
    }, 5),
  ),
  // Calage de l'Aura de poison (retour de l'utilisateur) : même règle (dégâts directs), autre moment
  ...forEach(UNDEAD, {
    id: 'aura-au-tour-adverse',
    name: 'Aura au début du tour adverse',
    schema: 'Calage',
    family: 'Affliction',
    pitch: 'L’aura frappe au début du tour de l’adversaire, au même moment que le Poison qu’il subit. Toujours des dégâts directs.',
    statuses: { labPoisonAuraOpp: { ...STATUSES.poisonAura, onTurnStart: undefined, onOpponentTurnStart: (st) => [{ type: 'damage', amount: st.stacks, target: 'opponent' }] } },
    apply: swap('poison-aura', [{ type: 'applyStatus', status: 'labPoisonAuraOpp' as never, stacks: 1 }]),
    watch: ['poison-aura', 'labPoisonAuraOpp'],
  }, 5),
  ...forEach(UNDEAD, {
    id: 'aura-fin-de-tour',
    name: 'Aura à la fin de son tour',
    schema: 'Calage',
    family: 'Affliction',
    pitch: 'L’aura frappe à la fin de chacun de ses tours, après son action. Toujours des dégâts directs.',
    statuses: { labPoisonAuraEnd: { ...STATUSES.poisonAura, onTurnStart: undefined, onTurnEnd: (st) => [{ type: 'damage', amount: st.stacks, target: 'opponent' }] } },
    apply: swap('poison-aura', [{ type: 'applyStatus', status: 'labPoisonAuraEnd' as never, stacks: 1 }]),
    watch: ['poison-aura', 'labPoisonAuraEnd'],
  }, 5),
  // Vol de vie : +3 à +4 points
  ...forEach(UNDEAD, {
    id: 'vol-double',
    name: 'Vol de vie sur deux coups',
    schema: 'Petite touche',
    family: 'Drain',
    pitch: 'Deux charges : ses deux prochains coups qui touchent lui rendent les PV qu’ils retirent.',
    statuses: { labDrain2: { ...STATUSES.lifesteal, maxStacks: 2, stacking: 'add' } },
    apply: swap('life-steal', [{ type: 'applyStatus', status: 'labDrain2' as never, stacks: 2 }]),
    watch: ['life-steal'],
  }, 5),
  ...forEach(UNDEAD, {
    id: 'vol-et-soin',
    name: 'Vol de vie et soin',
    schema: 'Petite touche',
    family: 'Drain',
    pitch: 'Il boit tout de suite 3 PV à l’adversaire (3 dégâts directs, 3 PV rendus), puis son prochain coup draine.',
    apply: swap('life-steal', [{ type: 'damage', amount: 3, target: 'opponent' }, { type: 'heal', amount: 3 }, { type: 'applyStatus', status: 'lifesteal', stacks: 1 }]),
    watch: ['life-steal'],
  }, 5),
  // Épines : 6 renvoyés pendant 1 tour ; piste de l'utilisateur : permanentes
  ...[1, 2].flatMap((n) =>
    forEach(DWARVES, {
      id: `epines-permanentes-${n}`,
      name: `Épines permanentes (${n} par charge)`,
      schema: 'Retouche (demande de l’utilisateur)',
      family: 'Représailles',
      pitch: `Chaque 2 ajoute une charge d’épines, sans durée : chaque coup encaissé renvoie ${n} dégât${n > 1 ? 's' : ''} par charge, jusqu’à la fin du combat.`,
      statuses: { [`labThorns${n}`]: { ...STATUSES.thorns, stacking: 'add', reactions: { hurt: (st) => [{ type: 'damage', amount: n * st.stacks, target: 'opponent' }] } } },
      apply: swap('thorns', [{ type: 'applyStatus', status: `labThorns${n}` as never, stacks: 1 }]),
      watch: ['thorns', `labThorns${n}`],
    }, 5),
  ),
  ...forEach(DWARVES, {
    id: 'epines-2-tours',
    name: 'Épines 4 pendant 2 tours',
    schema: 'Petite touche',
    family: 'Représailles',
    pitch: 'Renvoie 4 dégâts par coup encaissé, pendant 2 tours au lieu d’un.',
    apply: swap('thorns', [{ type: 'applyStatus', status: 'thorns', stacks: 4, turns: 2 }]),
    watch: ['thorns'],
  }, 5),
  // Aura mélodieuse (double 3) : coûte des victoires, parce qu'elle remplace les deux coups du double
  ...forEach(BARDS, {
    id: 'melodie-et-coups',
    name: 'Aura mélodieuse sans sacrifier les coups',
    schema: 'Petite touche',
    family: 'Puissance',
    pitch: 'Le double 3 pose l’aura ET frappe ses deux coups de 3.',
    apply: swap('melodious-aura', [{ type: 'applyStatus', status: 'melodiousAura', stacks: 1 }], { volley: 2 }),
    watch: ['melodious-aura'],
  }, 5),
  ...forEach(BARDS, {
    id: 'melodie-2',
    name: 'Aura mélodieuse à 2 charges',
    schema: 'Petite touche',
    family: 'Puissance',
    pitch: 'Le double 3 pose 2 charges d’aura au lieu d’une.',
    apply: swap('melodious-aura', [{ type: 'applyStatus', status: 'melodiousAura', stacks: 2 }]),
    watch: ['melodious-aura'],
  }, 5),
  // Fausse note (double 2) : coûte des victoires pour la même raison
  ...forEach(BARDS, {
    id: 'fausse-note-et-coups',
    name: 'Fausse note sans sacrifier les coups',
    schema: 'Petite touche',
    family: 'Sceaux',
    pitch: 'Le double 2 pose la Fausse note ET frappe ses deux coups de 2.',
    apply: swap('false-note', [{ type: 'applyStatus', status: 'falseNote', stacks: 1, target: 'opponent' }], { volley: 2 }),
    watch: ['false-note'],
  }, 5),
  ...forEach(BARDS, {
    id: 'fausse-note-2',
    name: 'Fausse note à 2 charges',
    schema: 'Petite touche',
    family: 'Sceaux',
    pitch: 'Deux charges : le prochain coup adverse qui touche perd 10 dégâts.',
    apply: swap('false-note', [{ type: 'applyStatus', status: 'falseNote', stacks: 2, target: 'opponent' }]),
    watch: ['false-note'],
  }, 5),
  ...forEach(BARDS, {
    id: 'kit-melodie-2-fausse-note-2',
    name: 'Kit : aura à 2 charges, Fausse note à 2 charges',
    schema: 'Kit',
    family: 'Puissance + Sceaux',
    pitch: 'Double 3 : 2 charges d’aura. Double 2 : 2 charges de Fausse note.',
    apply: all(
      swap('melodious-aura', [{ type: 'applyStatus', status: 'melodiousAura', stacks: 2 }]),
      swap('false-note', [{ type: 'applyStatus', status: 'falseNote', stacks: 2, target: 'opponent' }]),
    ),
    watch: ['melodious-aura', 'false-note'],
  }, 5),
  ...forEach(BARDS, {
    id: 'kit-melodie-2-fausse-note-coups',
    name: 'Kit : aura à 2 charges, Fausse note qui frappe',
    schema: 'Kit',
    family: 'Puissance + Sceaux',
    pitch: 'Double 3 : 2 charges d’aura. Double 2 : la Fausse note et ses deux coups de 2.',
    apply: all(
      swap('melodious-aura', [{ type: 'applyStatus', status: 'melodiousAura', stacks: 2 }]),
      swap('false-note', [{ type: 'applyStatus', status: 'falseNote', stacks: 1, target: 'opponent' }], { volley: 2 }),
    ),
    watch: ['melodious-aura', 'false-note'],
  }, 5),
  // Aura d'immunité de Gauvain (−1,0) : sa propre version, comme la Rage du sang de Murzug
  ...[2, 3].map((armor) => ({
    series: 5 as const,
    id: `gauvain-immunite-armure-${armor}`,
    character: 'gauvain',
    name: `Immunité et armure +${armor} (Gauvain)`,
    schema: 'Petite touche',
    family: 'Sceaux + Garde',
    pitch: `Tant que l’aura est là : aucun malus, et son armure gagne ${armor} (Aldric garde +1).`,
    statuses: { [`labGauvainImmunity${armor}`]: { ...STATUSES.immunityAura, modifyStats: (st: Parameters<NonNullable<StatusDef['modifyStats']>>[0]) => ({ ...st, armor: st.armor + armor }) } },
    apply: swap('immunity-aura', [{ type: 'cleanse', polarity: 'negative' }, { type: 'applyStatus', status: `labGauvainImmunity${armor}` as never, stacks: 1 }]),
    watch: ['immunity-aura'],
  })),
]

/* --- Série 6 : Furie des vents cumulable (demande de l'utilisateur) et kit de la barde (Siffloter,
   Fausse note, Ouverture, signalés par l'audit 0.45.1). SORTS.md § 12. --- */
const WIND = STATUSES.windFury
const SERIES_6: LabIdea[] = [
  {
    series: 6, id: 'gorak-furie-toutes', character: 'gorak', name: 'Furie cumulable, tout d’un coup', schema: 'Retouche (demande)', family: 'Rafale',
    pitch: 'Chaque 2 ajoute une charge, sans durée ; la prochaine action dépense toutes les charges : un coup de plus par charge.',
    statuses: { labWindAll: { ...WIND, stacking: 'add', maxStacks: undefined, expiresAt: undefined, strikeCharges: 'all' } },
    apply: swap('wind-fury', [{ type: 'applyStatus', status: 'labWindAll' as never, stacks: 1 }]),
    watch: ['wind-fury'],
  },
  {
    series: 6, id: 'gorak-furie-reserve', character: 'gorak', name: 'Furie cumulable, en réserve', schema: 'Retouche (demande)', family: 'Rafale',
    pitch: 'Chaque 2 ajoute une charge, sans durée ; chaque action en dépense une (deux coups), les autres restent en réserve.',
    statuses: { labWindOne: { ...WIND, stacking: 'add', maxStacks: undefined, expiresAt: undefined, strikeCharges: 'one' } },
    apply: swap('wind-fury', [{ type: 'applyStatus', status: 'labWindOne' as never, stacks: 1 }]),
    watch: ['wind-fury'],
  },
  {
    series: 6, id: 'fanchon-siffloter-5', character: 'fanchon', name: 'Siffloter à 5 charges', schema: 'Petite touche', family: 'Soin',
    pitch: 'Le double 1 pose 5 charges de Sifflotement (10 PV sur 5 tours) au lieu de 3.',
    apply: swap('whistle', [{ type: 'applyStatus', status: 'whistling', stacks: 5 }]),
    watch: ['whistle'],
  },
  {
    series: 6, id: 'fanchon-siffloter-coups', character: 'fanchon', name: 'Siffloter sans sacrifier les coups', schema: 'Petite touche', family: 'Soin',
    pitch: 'Le double 1 pose le Sifflotement ET frappe ses deux coups de 1.',
    apply: swap('whistle', [{ type: 'applyStatus', status: 'whistling', stacks: 3 }], { volley: 2 }),
    watch: ['whistle'],
  },
  {
    series: 6, id: 'fanchon-fausse-note-coups', character: 'fanchon', name: 'Fausse note qui frappe', schema: 'Petite touche', family: 'Sceaux',
    pitch: 'Le double 2 pose ses 2 charges de Fausse note ET frappe ses deux coups de 2.',
    apply: swap('false-note', [{ type: 'applyStatus', status: 'falseNote', stacks: 2, target: 'opponent' }], { volley: 2 }),
    watch: ['false-note'],
  },
  {
    series: 6, id: 'fanchon-sans-ouverture', character: 'fanchon', name: 'Sans Ouverture', schema: 'Mesure', family: 'Puissance',
    pitch: 'Aucune aura au début du combat (pour mesurer ce que l’Ouverture porte).',
    apply: remove('overture'),
    watch: ['melodious-aura'],
  },
  {
    series: 6, id: 'fanchon-kit-doubles', character: 'fanchon', name: 'Kit : doubles qui frappent, sans Ouverture', schema: 'Kit compensé', family: 'Puissance + Soin + Sceaux',
    pitch: 'Plus d’Ouverture ; en échange, Siffloter, Fausse note et Aura mélodieuse frappent aussi leurs deux coups.',
    apply: all(
      remove('overture'),
      swap('whistle', [{ type: 'applyStatus', status: 'whistling', stacks: 3 }], { volley: 2 }),
      swap('false-note', [{ type: 'applyStatus', status: 'falseNote', stacks: 2, target: 'opponent' }], { volley: 2 }),
      swap('melodious-aura', [{ type: 'applyStatus', status: 'melodiousAura', stacks: 2 }], { volley: 2 }),
    ),
    watch: ['whistle', 'false-note', 'melodious-aura'],
  },
  {
    series: 6, id: 'fanchon-kit-doubles-ouverture', character: 'fanchon', name: 'Kit : Siffloter et Fausse note qui frappent, avec Ouverture', schema: 'Kit', family: 'Soin + Sceaux',
    pitch: 'Ouverture gardée ; Siffloter et Fausse note frappent aussi leurs deux coups.',
    apply: all(
      swap('whistle', [{ type: 'applyStatus', status: 'whistling', stacks: 3 }], { volley: 2 }),
      swap('false-note', [{ type: 'applyStatus', status: 'falseNote', stacks: 2, target: 'opponent' }], { volley: 2 }),
    ),
    watch: ['whistle', 'false-note'],
  },
  ...[0.08, 0.06, 0.04].map((dodge) => ({
    series: 6 as const, id: `fanchon-kit-esquive-${Math.round(dodge * 100)}`, character: 'fanchon',
    name: `Kit : Siffloter et Fausse note qui frappent, esquive ${Math.round(dodge * 100)} %`, schema: 'Kit compensé', family: 'Soin + Sceaux',
    pitch: `Siffloter et Fausse note frappent aussi leurs deux coups ; en compensation, l’esquive passe de 12 à ${Math.round(dodge * 100)} %.`,
    apply: all(
      swap('whistle', [{ type: 'applyStatus', status: 'whistling', stacks: 3 }], { volley: 2 }),
      swap('false-note', [{ type: 'applyStatus', status: 'falseNote', stacks: 2, target: 'opponent' }], { volley: 2 }),
      stats({ dodgeChance: dodge }),
    ),
    watch: ['whistle', 'false-note'],
  })),
]

/* --- Série 7 : doutes de l'utilisateur (immunité et Aura de poison, Furie instantanée, Coup de chance
   cumulable) et trois compétences faibles, en favorisant le spectacle (Écorce, Riposte, Luciole). § 13. --- */
const LUCKY = STATUSES.luckyStrike
const BARK = STATUSES.barkSkin
const FIREFLY = STATUSES.firefly
const SERIES_7: LabIdea[] = [
  {
    series: 7, id: 'gorak-furie-instantanee', character: 'gorak', name: 'Furie des vents instantanée', schema: 'Retouche (demande)', family: 'Rafale',
    pitch: 'Sur un 2, l’orc frappe deux fois tout de suite, dans la même action ; un 2 pendant ces coups enchaîne encore.',
    statuses: { labWindNow: { ...STATUSES.windFury, strikeCharges: undefined, instantStrikes: true } },
    apply: swap('wind-fury', [{ type: 'applyStatus', status: 'labWindNow' as never, stacks: 1 }]),
    watch: ['wind-fury'],
  },
  {
    series: 7, id: 'naraxes-chance-cumulable', character: 'naraxes', name: 'Coup de chance cumulable', schema: 'Retouche (demande)', family: 'Fortune',
    pitch: 'Chaque 1 ajoute une charge : la prochaine action lance un d6 de plus par charge, chacun pouvant être critique.',
    statuses: { labLuckyStack: { ...LUCKY, stacking: 'add', maxStacks: undefined, strikeCharges: 'all' } },
    apply: swap('lucky-strike', [{ type: 'applyStatus', status: 'labLuckyStack' as never, stacks: 1 }]),
    watch: ['lucky-strike'],
  },
  {
    series: 7, id: 'ervald-aura-arretee', character: 'ervald', name: 'Aura de poison arrêtée par l’immunité', schema: 'Clarification', family: 'Affliction',
    pitch: 'L’Aura d’immunité du paladin arrête aussi l’Aura de poison.',
    statuses: { labAuraStopped: { ...STATUSES.poisonAura, stoppedByImmunity: true } },
    apply: swap('poison-aura', [{ type: 'applyStatus', status: 'labAuraStopped' as never, stacks: 1 }]),
    watch: ['poison-aura'],
  },
  ...[7, 9].map((n) => ({
    series: 7 as const, id: `thaldrin-ecorce-${n}`, character: 'thaldrin', name: `Écorce épaisse à ${n}`, schema: 'Petite touche', family: 'Garde',
    pitch: `L’écorce absorbe ${n} points au lieu de 5.`,
    apply: swap('bark-skin', [{ type: 'applyStatus', status: 'barkSkin', stacks: n }]),
    watch: ['bark-skin'],
  })),
  {
    series: 7, id: 'thaldrin-ecorce-epineuse', character: 'thaldrin', name: 'Écorce épineuse', schema: 'Spectacle', family: 'Garde + Représailles',
    pitch: 'Tant que l’écorce tient, chaque coup encaissé renvoie 2 dégâts à l’attaquant : on voit l’écorce mordre.',
    statuses: { labBarkThorns: { ...BARK, reactions: { hurt: () => [{ type: 'damage', amount: 2, target: 'opponent' }] } } },
    apply: swap('bark-skin', [{ type: 'applyStatus', status: 'labBarkThorns' as never, stacks: 5 }]),
    watch: ['bark-skin', 'labBarkThorns'],
  },
  {
    series: 7, id: 'thaldrin-ecorce-seve', character: 'thaldrin', name: 'Écorce de sève', schema: 'Spectacle', family: 'Garde + Soin',
    pitch: 'Tant que l’écorce tient, chaque coup encaissé lui rend 2 PV : la sève coule.',
    statuses: { labBarkSap: { ...BARK, reactions: { hurt: () => [{ type: 'heal', amount: 2 }] } } },
    apply: swap('bark-skin', [{ type: 'applyStatus', status: 'labBarkSap' as never, stacks: 5 }]),
    watch: ['bark-skin', 'labBarkSap'],
  },
  ...[0.75, 1].map((ratio) => ({
    series: 7 as const, id: `aldric-riposte-${Math.round(ratio * 100)}`, character: 'aldric', name: `Riposte à ${Math.round(ratio * 100)} %`, schema: 'Petite touche', family: 'Représailles',
    pitch: `Le prochain coup qui le touche renvoie ${Math.round(ratio * 100)} % de ses dégâts au lieu de 50 %.`,
    statuses: { [`labRiposte${Math.round(ratio * 100)}`]: { ...STATUSES.riposte, reflectsHit: ratio } },
    apply: swap('riposte', [{ type: 'applyStatus', status: `labRiposte${Math.round(ratio * 100)}` as never, stacks: 1 }]),
    watch: ['riposte'],
  })),
  {
    series: 7, id: 'aldric-riposte-double', character: 'aldric', name: 'Riposte sur deux coups', schema: 'Spectacle', family: 'Représailles',
    pitch: 'Deux charges : les deux prochains coups qui le touchent renvoient chacun la moitié de leurs dégâts.',
    statuses: { labRiposte2: { ...STATUSES.riposte, stacking: 'add', maxStacks: 2 } },
    apply: swap('riposte', [{ type: 'applyStatus', status: 'labRiposte2' as never, stacks: 2 }]),
    watch: ['riposte'],
  },
  {
    series: 7, id: 'thaldrin-luciole-4', character: 'thaldrin', name: 'Luciole à 4 charges', schema: 'Petite touche', family: 'Affliction',
    pitch: '4 lucioles au lieu de 3.',
    apply: swap('firefly', [{ type: 'applyStatus', status: 'firefly', stacks: 4, target: 'opponent' }]),
    watch: ['firefly'],
  },
  {
    series: 7, id: 'thaldrin-luciole-3-degats', character: 'thaldrin', name: 'Luciole à +3', schema: 'Petite touche', family: 'Affliction',
    pitch: 'Chaque coup encaissé sous les lucioles fait +3 au lieu de +2.',
    statuses: { labFirefly3: { ...FIREFLY, modifyIncoming: (damage) => damage + 3 } },
    apply: swap('firefly', [{ type: 'applyStatus', status: 'labFirefly3' as never, stacks: 3, target: 'opponent' }]),
    watch: ['firefly'],
  },
  // Remplacer la Luciole, jugée ennuyeuse par l'utilisateur : des effets qui se voient tout de suite
  {
    series: 7, id: 'thaldrin-ronces', character: 'thaldrin', name: 'Ronces', schema: 'Spectacle', family: 'Représailles',
    pitch: 'Des ronces s’enroulent autour de l’adversaire : ses 3 prochains coups qui touchent lui coûtent chacun 2 PV.',
    statuses: { labBrambles: { name: 'Ronces', polarity: 'negative', summary: 'Chaque coup qui touche coûte 2 PV au porteur.', describe: (st) => `Ses ${st.stacks} prochains coups lui coûtent 2 PV chacun`, badge: (st) => String(st.stacks), counter: 'stacks', stacking: 'add', reactions: { hit: () => [{ type: 'damage', amount: 2 }] }, spentOnHit: true } as StatusDef },
    apply: swap('firefly', [{ type: 'applyStatus', status: 'labBrambles' as never, stacks: 3, target: 'opponent' }]),
    watch: ['firefly', 'labBrambles'],
  },
  {
    series: 7, id: 'thaldrin-racines', character: 'thaldrin', name: 'Racines', schema: 'Spectacle', family: 'Contrôle',
    pitch: 'Des racines jaillissent du sol : l’adversaire, pris au piège, perd sa prochaine action.',
    apply: swap('firefly', [{ type: 'applyStatus', status: 'stunned', stacks: 1, target: 'opponent' }]),
    watch: ['firefly'],
  },
  {
    series: 7, id: 'thaldrin-feux-follets', character: 'thaldrin', name: 'Feux follets', schema: 'Spectacle', family: 'Affliction',
    pitch: 'Des feux follets s’accrochent à l’adversaire : il perd 3 PV à la fin de chacun de ses 3 prochains tours.',
    apply: swap('firefly', [{ type: 'applyStatus', status: 'burn', stacks: 3, turns: 3, target: 'opponent' }]),
    watch: ['firefly', 'burn'],
  },
]

/*
 * Série 8 : le Saignement (statut `bleed`, livré en 0.68.0 avec la Saignée de Gorak et les Épines acérées
 * de Brokk). La première passe (2026-10-20, règles 0.67.3) imitait la plaie avec `spentOnHurt` et une
 * charge de plus : une charge fantôme restait après le dernier écoulement, et chaque nouvelle plaie
 * posée par-dessus coulait d'un PV de trop par coup. Elle surestimait le Saignement (Saignée 2 mesurée à
 * −0,6 point, −3,0 en vrai). Ces idées utilisent maintenant le vrai statut (SORTS.md § 11).
 */
const bleed = (n: number) => ({ type: 'applyStatus', status: 'bleed', stacks: n, target: 'opponent' }) as const
const SERIES_8: LabIdea[] = [
  // Pourfendre (0.70.0) : le 1 frappe pour sa valeur et, s'il touche, pose Saignement 2. Variantes de sa plaie.
  // (Les Saignées 3 et 4, mesurées sur l'ancien kit, sont dans SORTS.md § 14.)
  ...[1, 3].map((n) => ({
    series: 8 as const, id: `gorak-pourfendre-${n}`, character: 'gorak', name: `Pourfendre ${n}`, schema: 'Pont', family: 'Affliction',
    pitch: `Sur un 1, le coup frappe et, s'il touche, pose Saignement ${n} au lieu de 2.`,
    apply: swap('cleave', [bleed(n)]),
    watch: ['cleave', 'bleed'],
  })),
  {
    series: 8, id: 'thaldrin-griffe-saignante', character: 'thaldrin', name: 'Griffe qui lacère', schema: 'Ajout', family: 'Affliction',
    pitch: 'Le Coup de griffe (relance + 3) laisse aussi Saignement 3.',
    apply: replace('claw', (e) => ({ ...e, effects: [...e.effects, bleed(3)] })),
    watch: ['claw', 'bleed'],
  },
  {
    series: 8, id: 'thaldrin-griffe-saignante-compensee', character: 'thaldrin', name: 'Griffe qui lacère, relance + 1', schema: 'Retouche compensée', family: 'Affliction',
    pitch: 'Le Coup de griffe relance + 1 au lieu de + 3, et laisse Saignement 3.',
    apply: replace('claw', (e) => ({ ...e, reshapesHit: { value: 'reroll', bonus: 1 }, effects: [...e.effects, bleed(3)] })),
    watch: ['claw', 'bleed'],
  },
  ...[1, 2].map((n) => ({
    series: 8 as const, id: `elaria-fleche-barbelee-${n}`, character: 'elaria', name: `Flèche barbelée ${n}`, schema: 'Pont', family: 'Affliction',
    pitch: `Chacun de ses critiques laisse Saignement ${n}.`,
    apply: add({ id: 'barbed-arrow', name: 'Flèche barbelée', nature: 'finesse', trigger: 'crit', effects: [bleed(n)] }),
    watch: ['barbed-arrow', 'bleed'],
  })),
  {
    series: 8, id: 'elaria-oeil-barbele', character: 'elaria', name: 'Œil de faucon barbelé', schema: 'Pont', family: 'Affliction',
    pitch: 'Sur un 1, en plus du critique assuré, la flèche marquée laisse Saignement 2 tout de suite.',
    apply: replace('hawk-eye', (e) => ({ ...e, effects: [...e.effects, bleed(2)] })),
    watch: ['hawk-eye', 'bleed'],
  },
  {
    series: 8, id: 'brokk-epines-acerees-1', character: 'brokk', name: 'Épines acérées, 1 par coup', schema: 'Retouche', family: 'Représailles',
    pitch: 'Chaque coup encaissé pose 1 charge de Saignement sur l’attaquant, quel que soit le nombre d’épines.',
    statuses: { labThornsBleed1: { ...STATUSES.thorns, reactions: { hurt: () => [bleed(1)] } } },
    apply: swap('thorns', [{ type: 'applyStatus', status: 'labThornsBleed1' as never, stacks: 1 }]),
    watch: ['thorns', 'bleed'],
  },
]

/*
 * Série 9 : préparation de la sixième passe (2026-10-20, SORTS.md § 15). Aura glaciale qui pose du vrai
 * Poison (une seule règle d'affliction pour Ervald, sans crochet propre), et dualité du druide (l'ours
 * garde rancune de ce que l'homme a subi, l'homme panse ce que l'ours a pris, l'écorce éclate sous la
 * Charge). La Furie des vents en coups bruts demande un crochet du moteur : mesurée à part (§ 15).
 * Depuis la 0.69.0, l'Aura glaciale qui pose du Poison (cumulable) est la règle livrée : les idées d'Ervald
 * ci-dessous ne mesurent plus que leurs variantes (plafond, Souffle 2) par rapport à elle. Les séries 5 et 7
 * visent l'ancien `poisonAura` et ne s'appliquent plus.
 */
/** Aura glaciale qui pose, au début du tour d'Ervald, 1 charge de Poison par charge d'aura (règle de la 0.69.0). */
const frostPoison = (cap?: number): StatusDef => ({ ...STATUSES.frostAura, maxStacks: cap })
const frostAs = (status: string) => swap('frost-aura', [{ type: 'applyStatus', status: status as never, stacks: 1 }])
/** Rancune : le prochain coup du druide qui touche fait +`bonus` par charge, puis la rancune retombe. */
const grudge = (bonus: number): StatusDef => ({
  name: 'Rancune',
  polarity: 'positive',
  summary: `Son prochain coup qui touche fait ${bonus} de plus par charge, avant l'armure. Se cumule.`,
  describe: (st) => `Son prochain coup qui touche fait +${bonus * st.stacks}`,
  badge: (st) => `+${bonus * st.stacks}`,
  counter: 'stacks',
  stacking: 'add',
  modifyOutgoing: (damage, st) => damage + bonus * st.stacks,
  spentOnHit: true,
})
/** Sève : au début de son prochain tour, le druide regagne autant de PV que de charges. */
const SAP: StatusDef = {
  name: 'Sève',
  polarity: 'positive',
  summary: 'Au début de son prochain tour, le porteur regagne autant de PV que de charges. Se cumule.',
  describe: (st) => `Regagne ${st.stacks} PV au début de son prochain tour`,
  badge: (st) => `+${st.stacks}`,
  counter: 'stacks',
  stacking: 'add',
  onTurnStart: (st) => [{ type: 'heal', amount: st.stacks }],
  expiresAt: 'turnStart',
}
const grudgeOn = (bonus: number) =>
  add({ id: 'lab-rancune', name: 'Rancune', nature: 'martial', trigger: 'hurt', form: 'human', effects: [{ type: 'applyStatus', status: `labGrudge${bonus}` as never, stacks: 1 }] })
const sapOn = (heal: number) =>
  add({ id: 'lab-seve', name: 'Sève', nature: 'arcane', trigger: 'hurt', form: 'bear', effects: [{ type: 'applyStatus', status: 'labSap' as never, stacks: heal, turns: 1 }] })
/** Aura de rancune (3 de l'ours) : chaque coup encaissé, quelle que soit la forme, arme Rancune +`bonus` par charge d'aura. */
const grudgeAura = (bonus: number): StatusDef => ({
  name: 'Aura de rancune',
  look: { aura: 'rgba(180,83,9,0.55)' },
  polarity: 'positive',
  summary: `Chaque coup encaissé arme +${bonus} par charge sur son prochain coup qui touche. Permanente.`,
  describe: (st) => `Chaque coup encaissé arme +${bonus * st.stacks} sur son prochain coup qui touche`,
  badge: (st) => `+${bonus * st.stacks}`,
  stacking: 'add',
  reactions: { hurt: (st) => [{ type: 'applyStatus', status: `labGrudge${bonus}` as never, stacks: st.stacks }] },
})
/** Aura de sève (3 de l'homme) : chaque coup encaissé rend `heal` PV par charge au début de son prochain tour. */
const sapAura = (heal: number): StatusDef => ({
  name: 'Aura de sève',
  look: { aura: 'rgba(132,204,22,0.5)' },
  polarity: 'positive',
  summary: `Chaque coup encaissé lui rend ${heal} PV par charge au début de son prochain tour. Permanente.`,
  describe: (st) => `Chaque coup encaissé lui rend ${heal * st.stacks} PV au début de son prochain tour`,
  badge: (st) => `+${heal * st.stacks}`,
  stacking: 'add',
  reactions: { hurt: (st) => [{ type: 'applyStatus', status: 'labSap' as never, stacks: heal * st.stacks, turns: 1 }] },
})
const grudgeAuraOn = (bonus: number) => swap('rot-aura', [{ type: 'applyStatus', status: `labGrudgeAura${bonus}` as never, stacks: 1 }])
const sapAuraOn = (heal: number) => swap('firefly', [{ type: 'applyStatus', status: `labSapAura${heal}` as never, stacks: 1 }])
const shards = add({
  id: 'lab-eclats',
  name: 'Éclats d’écorce',
  nature: 'martial',
  trigger: 'naturalOne',
  form: 'bear',
  when: [{ type: 'hasStatus', who: 'self', status: 'bonusArmor' }],
  effects: [{ type: 'release', status: 'bonusArmor', min: 1, target: 'opponent' }],
})
const SERIES_9: LabIdea[] = [
  ...[undefined, 2, 1].map((cap) => ({
    series: 9 as const, id: `ervald-givre-poison${cap ? `-${cap}` : ''}`, character: 'ervald',
    name: `Aura glaciale qui pose du Poison${cap ? `, ${cap} charge${cap > 1 ? 's' : ''} au plus` : ''}`, schema: 'Harmonisation', family: 'Affliction',
    pitch: `Au début de chacun de ses tours, l’aura pose 1 charge de Poison par charge d’aura${cap ? ` (${cap} au plus)` : ''} : un seul statut, une seule règle (immunité, Régénération, purification).`,
    statuses: { [`labFrostPoison${cap ?? ''}`]: frostPoison(cap) },
    apply: frostAs(`labFrostPoison${cap ?? ''}`),
    watch: ['poison-aura', 'poison'],
  })),
  {
    series: 9, id: 'ervald-givre-poison-souffle-2', character: 'ervald', name: 'Aura glaciale qui pose du Poison (cumulable), Souffle 2', schema: 'Harmonisation compensée', family: 'Affliction',
    pitch: 'L’aura reste cumulable (chaque 3 ajoute une charge de Poison par tour) ; le Souffle de la tombe pose Poison 2 au lieu de 3.',
    statuses: { labFrostPoison: frostPoison() },
    apply: all(frostAs('labFrostPoison'), swap('grave-breath', [{ type: 'applyStatus', status: 'poison', stacks: 2, target: 'opponent' }])),
    watch: ['poison-aura', 'poison'],
  },
  {
    series: 9, id: 'ervald-givre-poison-1-souffle-2', character: 'ervald', name: 'Aura glaciale qui pose du Poison (1 au plus), Souffle 2', schema: 'Harmonisation compensée', family: 'Affliction',
    pitch: 'Comme ci-dessus, plafonnée à 1 charge ; le Souffle de la tombe pose Poison 2 au lieu de 3.',
    statuses: { labFrostPoison1: frostPoison(1) },
    apply: all(frostAs('labFrostPoison1'), swap('grave-breath', [{ type: 'applyStatus', status: 'poison', stacks: 2, target: 'opponent' }])),
    watch: ['poison-aura', 'poison'],
  },
  ...[1, 2, 3].map((bonus) => ({
    series: 9 as const, id: `thaldrin-rancune-${bonus}`, character: 'thaldrin', name: `Rancune +${bonus}`, schema: 'Dualité (homme → ours)', family: 'Puissance',
    pitch: `Chaque coup encaissé sous forme humaine arme +${bonus} sur son prochain coup qui touche : l’ours garde rancune de ce que l’homme a subi.`,
    statuses: { [`labGrudge${bonus}`]: grudge(bonus) },
    apply: grudgeOn(bonus),
    watch: ['lab-rancune'],
  })),
  {
    series: 9, id: 'thaldrin-rancune-3-unique', character: 'thaldrin', name: 'Rancune +3, une charge au plus', schema: 'Dualité (homme → ours)', family: 'Puissance',
    pitch: 'Être touché sous forme humaine arme +3 sur son prochain coup qui touche, sans cumul.',
    statuses: { labGrudge3Once: { ...grudge(3), maxStacks: 1 } },
    apply: add({ id: 'lab-rancune', name: 'Rancune', nature: 'martial', trigger: 'hurt', form: 'human', effects: [{ type: 'applyStatus', status: 'labGrudge3Once' as never, stacks: 1 }] }),
    watch: ['lab-rancune'],
  },
  // Les liens portés par les auras du 3 : la dualité se gagne au dé au lieu d'être offerte
  ...[1, 2, 3].map((bonus) => ({
    series: 9 as const, id: `thaldrin-aura-rancune-${bonus}`, character: 'thaldrin', name: `Aura de rancune +${bonus} au lieu de la pourriture`, schema: 'Dualité (aura de l’ours)', family: 'Puissance',
    pitch: `Le 3 de l’ours pose une Aura de rancune : chaque coup encaissé arme +${bonus} par charge sur son prochain coup qui touche. La Pourriture quitte le jeu.`,
    statuses: { [`labGrudge${bonus}`]: grudge(bonus), [`labGrudgeAura${bonus}`]: grudgeAura(bonus) },
    apply: grudgeAuraOn(bonus),
    watch: ['rot-aura'],
  })),
  ...[1, 2, 3].map((heal) => ({
    series: 9 as const, id: `thaldrin-aura-seve-${heal}`, character: 'thaldrin', name: `Aura de sève ${heal} au lieu des Feux follets`, schema: 'Dualité (aura de l’homme)', family: 'Soin',
    pitch: `Le 3 de l’homme pose une Aura de sève : chaque coup encaissé lui rend ${heal} PV par charge au début de son prochain tour.`,
    statuses: { labSap: SAP, [`labSapAura${heal}`]: sapAura(heal) },
    apply: sapAuraOn(heal),
    watch: ['firefly'],
  })),
  ...[2, 3].map((n) => ({
    series: 9 as const, id: `thaldrin-auras-dualite-${n}`, character: 'thaldrin', name: `Kit : Aura de sève ${n} (homme) et Aura de rancune +${n} (ours)`, schema: 'Dualité (les deux auras)', family: 'Puissance + Soin',
    pitch: 'Les deux 3 deviennent les deux liens : l’homme encaisse et se soigne, l’ours encaisse et se venge. Ni Pourriture ni Brûlure.',
    statuses: { [`labGrudge${n}`]: grudge(n), [`labGrudgeAura${n}`]: grudgeAura(n), labSap: SAP, [`labSapAura${n}`]: sapAura(n) },
    apply: all(grudgeAuraOn(n), sapAuraOn(n)),
    watch: ['rot-aura', 'firefly'],
  })),
  {
    series: 9, id: 'thaldrin-auras-dualite-3-2', character: 'thaldrin', name: 'Kit : Aura de sève 2 (homme) et Aura de rancune +3 (ours)', schema: 'Dualité (les deux auras)', family: 'Puissance + Soin',
    pitch: 'Les deux réglages neutres pris seuls, ensemble : l’homme encaisse et se soigne de 2, l’ours encaisse et frappe de +3. Ni Pourriture ni Brûlure.',
    statuses: { labGrudge3: grudge(3), labGrudgeAura3: grudgeAura(3), labSap: SAP, labSapAura2: sapAura(2) },
    apply: all(grudgeAuraOn(3), sapAuraOn(2)),
    watch: ['rot-aura', 'firefly'],
  },
  {
    series: 9, id: 'thaldrin-seve-1', character: 'thaldrin', name: 'Sève 1', schema: 'Dualité (ours → homme)', family: 'Soin',
    pitch: 'Chaque coup encaissé sous forme d’ours lui rend 1 PV au début de son prochain tour.',
    statuses: { labSap: SAP },
    apply: sapOn(1),
    watch: ['lab-seve'],
  },
  {
    series: 9, id: 'thaldrin-dualite-1', character: 'thaldrin', name: 'Kit : Rancune +1 et Sève 1', schema: 'Dualité (les deux sens)', family: 'Puissance + Soin',
    pitch: 'Les deux liens, au plus bas : ce que l’homme encaisse arme l’ours de +1 par coup, ce que l’ours encaisse rend 1 PV par coup à l’homme.',
    statuses: { labGrudge1: grudge(1), labSap: SAP },
    apply: all(grudgeOn(1), sapOn(1)),
    watch: ['lab-rancune', 'lab-seve'],
  },
  {
    series: 9, id: 'thaldrin-seve-2', character: 'thaldrin', name: 'Sève 2', schema: 'Dualité (ours → homme)', family: 'Soin',
    pitch: 'Chaque coup encaissé sous forme d’ours lui rend 2 PV au début de son prochain tour : l’homme panse ce que l’ours a pris.',
    statuses: { labSap: SAP },
    apply: sapOn(2),
    watch: ['lab-seve'],
  },
  {
    series: 9, id: 'thaldrin-eclats', character: 'thaldrin', name: 'Charge qui fait éclater l’écorce', schema: 'Dualité (homme → ours)', family: 'Garde + Puissance',
    pitch: 'Sur la Charge de l’ours, l’Écorce épaisse qui reste éclate : autant de dégâts directs que de points d’écorce, et l’écorce disparaît.',
    apply: shards,
    watch: ['lab-eclats'],
  },
  {
    series: 9, id: 'thaldrin-dualite', character: 'thaldrin', name: 'Kit : Rancune +2 et Sève 2', schema: 'Dualité (les deux sens)', family: 'Puissance + Soin',
    pitch: 'Les deux liens à la fois : ce que l’homme encaisse arme l’ours, ce que l’ours encaisse soigne l’homme.',
    statuses: { labGrudge2: grudge(2), labSap: SAP },
    apply: all(grudgeOn(2), sapOn(2)),
    watch: ['lab-rancune', 'lab-seve'],
  },
]

/*
 * Série 10 : le druide, rework de la dualité (2026-10-20, demande de l'utilisateur, SORTS.md § 16). Une aura
 * sur chaque 3, et une mécanique d'identité : le relais des formes. Ce que l'homme encaisse arme l'ours
 * (Rancune), ce que l'ours encaisse soigne l'homme (Sève) ; les deux auras du 3 amplifient le relais.
 * Compensations cherchées dans l'ordre d'EQUILIBRAGE.md : valeurs des compétences, puis stats, PV en dernier.
 * Livré en 0.71.0 (relais par tour, auras à +2, statuts `grudge`, `sap`, `grudgeAura`, `sapAura`) : ces idées
 * visent l'ancien kit (Feux follets, Aura de pourriture) et ne s'appliquent plus telles quelles.
 */
interface DruidKit {
  /** Relais de base : Rancune +N par coup encaissé sous forme humaine */
  grudge?: number
  /** Relais de base : Sève N par coup encaissé sous forme d'ours */
  sap?: number
  /** Aura de rancune (3 de l'ours, au lieu de la Pourriture) : +N par coup encaissé et par charge */
  grudgeAura?: number
  /** Aura de sève (3 de l'homme, au lieu des Feux follets) : N PV par coup encaissé et par charge */
  sapAura?: number
  /** Coup de griffe : relance + N (3 aujourd'hui) */
  claw?: number
  /** Écorce épaisse : Armure temporaire N (7 aujourd'hui) */
  bark?: number
  /** Fleur de vie : Régénération N pendant 3 tours (2 aujourd'hui) */
  bloom?: number
  crit?: number
  maxHp?: number
}
const druidKit = (k: DruidKit) => {
  const statuses: Record<string, StatusDef> = { labSap: SAP }
  const steps: ((c: Character) => Character)[] = []
  if (k.grudge) {
    statuses[`labGrudge${k.grudge}`] = grudge(k.grudge)
    steps.push(grudgeOn(k.grudge))
  }
  if (k.sap) steps.push(sapOn(k.sap))
  if (k.grudgeAura) {
    statuses[`labGrudge${k.grudgeAura}`] = grudge(k.grudgeAura)
    statuses[`labGrudgeAura${k.grudgeAura}`] = grudgeAura(k.grudgeAura)
    steps.push(grudgeAuraOn(k.grudgeAura))
  }
  if (k.sapAura) {
    statuses[`labSapAura${k.sapAura}`] = sapAura(k.sapAura)
    steps.push(sapAuraOn(k.sapAura))
  }
  if (k.claw !== undefined) steps.push(replace('claw', (e) => ({ ...e, reshapesHit: { value: 'reroll', bonus: k.claw } })))
  if (k.bark !== undefined) steps.push(swap('bark-skin', [{ type: 'applyStatus', status: 'bonusArmor', stacks: k.bark }]))
  if (k.bloom !== undefined) steps.push(swap('life-bloom', [{ type: 'applyStatus', status: 'regeneration', stacks: k.bloom, turns: 3 }]))
  if (k.crit !== undefined || k.maxHp !== undefined)
    steps.push((c) => c.adjusted({ stats: { ...(k.crit !== undefined && { critChance: k.crit }), ...(k.maxHp !== undefined && { maxHp: k.maxHp }) } }))
  return { statuses, apply: all(...steps) }
}
const kitName = (k: DruidKit) =>
  [
    k.grudge || k.sap ? `relais ${k.grudge ?? 0}/${k.sap ?? 0}` : 'sans relais',
    k.grudgeAura || k.sapAura ? `auras rancune +${k.grudgeAura ?? 0}, sève ${k.sapAura ?? 0}` : '',
    k.claw !== undefined ? `griffe +${k.claw}` : '',
    k.bark !== undefined ? `écorce ${k.bark}` : '',
    k.bloom !== undefined ? `fleur ${k.bloom}` : '',
    k.crit !== undefined ? `critique ${Math.round(k.crit * 100)} %` : '',
    k.maxHp !== undefined ? `${k.maxHp} PV` : '',
  ]
    .filter(Boolean)
    .join(', ')
const KITS: Record<string, DruidKit> = {
  relais: { grudge: 1, sap: 1 },
  'relais-auras-3-2': { grudge: 1, sap: 1, grudgeAura: 3, sapAura: 2 },
  'relais-auras-2-1': { grudge: 1, sap: 1, grudgeAura: 2, sapAura: 1 },
  'relais-auras-1-1': { grudge: 1, sap: 1, grudgeAura: 1, sapAura: 1 },
  'relais-auras-2-1-griffe-0': { grudge: 1, sap: 1, grudgeAura: 2, sapAura: 1, claw: 0 },
  'relais-auras-2-1-griffe-0-ecorce-4': { grudge: 1, sap: 1, grudgeAura: 2, sapAura: 1, claw: 0, bark: 4 },
  'relais-auras-2-1-crit-4': { grudge: 1, sap: 1, grudgeAura: 2, sapAura: 1, crit: 0.04 },
  'relais-auras-2-1-griffe-0-crit-4': { grudge: 1, sap: 1, grudgeAura: 2, sapAura: 1, claw: 0, crit: 0.04 },
  'relais-auras-2-1-pv-50': { grudge: 1, sap: 1, grudgeAura: 2, sapAura: 1, maxHp: 50 },
}
const SERIES_10: LabIdea[] = Object.entries(KITS).map(([id, k]) => ({
  series: 10 as const,
  id: `thaldrin-${id}`,
  character: 'thaldrin',
  name: `Druide : ${kitName(k)}`,
  schema: 'Dualité (relais des formes)',
  family: 'Puissance + Soin',
  pitch: 'Ce que l’homme encaisse arme l’ours (Rancune), ce que l’ours encaisse soigne l’homme (Sève) ; les auras du 3 amplifient le relais.',
  ...druidKit(k),
  watch: ['lab-rancune', 'lab-seve', 'rot-aura', 'firefly'],
}))

/*
 * Relais par tour (série 10, deuxième passe) : compté coup par coup, le relais écrasait les adversaires qui
 * frappent deux fois (Fanchon 45 → 75 %). Ici, il est binaire : touché au moins une fois sous forme
 * humaine, l'ours frappe +N sur son prochain coup qui touche ; touché sous forme d'ours, l'homme regagne
 * N PV au début de son tour. L'aura du 3 de chaque forme augmente la valeur de son relais.
 */
const relayGrudge: StatusDef = {
  name: 'Rancune',
  polarity: 'positive',
  summary: 'Son prochain coup qui touche fait autant de dégâts de plus que la valeur, avant l’armure. Une nouvelle Rancune remplace l’ancienne.',
  describe: (st) => `Son prochain coup qui touche fait +${st.stacks}`,
  badge: (st) => `+${st.stacks}`,
  counter: 'stacks',
  stacking: 'refresh',
  modifyOutgoing: (damage, st) => damage + st.stacks,
  spentOnHit: true,
}
const relaySap: StatusDef = { ...SAP, stacking: 'refresh', summary: 'Au début de son prochain tour, il regagne autant de PV que la valeur.' }
const relayMark = (name: string, color: string): StatusDef => ({
  name,
  look: { aura: color },
  polarity: 'positive',
  summary: `${name} : son relais vaut davantage. Permanente.`,
  describe: () => 'Son relais vaut davantage',
  badge: (st) => String(st.stacks),
  stacking: 'add',
})
interface RelayKit extends Omit<DruidKit, 'grudge' | 'sap' | 'grudgeAura' | 'sapAura'> {
  /** Rancune armée par un coup encaissé sous forme humaine */
  g: number
  /** Sève armée par un coup encaissé sous forme d'ours */
  s: number
  /** En plus avec l'Aura de rancune (3 de l'ours, au lieu de la Pourriture) */
  ga?: number
  /** En plus avec l'Aura de sève (3 de l'homme, au lieu des Feux follets) */
  sa?: number
}
const relayKit = (k: RelayKit) => {
  const base = druidKit({ claw: k.claw, bark: k.bark, bloom: k.bloom, crit: k.crit, maxHp: k.maxHp })
  const on = (form: 'human' | 'bear', status: string, stacks: number, when?: CharacterEvent['when']): CharacterEvent => ({
    id: `lab-relais-${form}${when ? '-aura' : ''}`,
    name: form === 'human' ? 'Rancune' : 'Sève',
    nature: form === 'human' ? 'martial' : 'arcane',
    trigger: 'hurt',
    form,
    ...(when && { when }),
    effects: [{ type: 'applyStatus', status: status as never, stacks, ...(form === 'bear' && { turns: 1 }) }],
  })
  const events = [on('human', 'labRelayGrudge', k.g), on('bear', 'labRelaySap', k.s)]
  const steps = [base.apply]
  if (k.ga) {
    events.push(on('human', 'labRelayGrudge', k.g + k.ga, [{ type: 'hasStatus', who: 'self', status: 'labGrudgeMark' as never }]))
    steps.push(swap('rot-aura', [{ type: 'applyStatus', status: 'labGrudgeMark' as never, stacks: 1 }]))
  }
  if (k.sa) {
    events.push(on('bear', 'labRelaySap', k.s + k.sa, [{ type: 'hasStatus', who: 'self', status: 'labSapMark' as never }]))
    steps.push(swap('firefly', [{ type: 'applyStatus', status: 'labSapMark' as never, stacks: 1 }]))
  }
  return {
    statuses: {
      ...base.statuses,
      labRelayGrudge: relayGrudge,
      labRelaySap: relaySap,
      labGrudgeMark: relayMark('Aura de rancune', 'rgba(180,83,9,0.55)'),
      labSapMark: relayMark('Aura de sève', 'rgba(132,204,22,0.5)'),
    },
    apply: all(...steps, add(...events)),
  }
}
const RELAY_KITS: Record<string, RelayKit> = {
  'relais-tour-2-2': { g: 2, s: 2 },
  'relais-tour-3-3': { g: 3, s: 3 },
  'relais-tour-2-2-auras-2-2': { g: 2, s: 2, ga: 2, sa: 2 },
  'relais-tour-2-2-auras-3-3': { g: 2, s: 2, ga: 3, sa: 3 },
  'relais-tour-3-3-auras-3-3': { g: 3, s: 3, ga: 3, sa: 3 },
  'relais-tour-1-1-auras-3-3': { g: 1, s: 1, ga: 3, sa: 3 },
  'relais-tour-1-1': { g: 1, s: 1 },
  'relais-tour-1-1-auras-2-2': { g: 1, s: 1, ga: 2, sa: 2 },
  'relais-tour-1-1-auras-3-2': { g: 1, s: 1, ga: 3, sa: 2 },
  'relais-tour-1-1-auras-4-4': { g: 1, s: 1, ga: 4, sa: 4 },
}
const SERIES_10_RELAY: LabIdea[] = Object.entries(RELAY_KITS).map(([id, k]) => ({
  series: 10 as const,
  id: `thaldrin-${id}`,
  character: 'thaldrin',
  name: `Druide : relais par tour ${k.g}/${k.s}${k.ga || k.sa ? `, auras +${k.ga ?? 0}/+${k.sa ?? 0}` : ''}${kitName({ claw: k.claw, bark: k.bark, bloom: k.bloom, crit: k.crit, maxHp: k.maxHp }).replace('sans relais', '')}`,
  schema: 'Dualité (relais par tour)',
  family: 'Puissance + Soin',
  pitch: 'Touché sous forme humaine : l’ours frappe plus fort au prochain coup. Touché sous forme d’ours : l’homme se soigne à son tour. Les auras du 3 augmentent le relais.',
  ...relayKit(k),
  watch: ['lab-relais-human', 'lab-relais-bear', 'rot-aura', 'firefly'],
}))

/*
 * Série 11 : le druide refondu (2026-10-20, demande de l'utilisateur, SORTS.md § 17). L'homme ne fait que
 * lancer des sorts (un d3 : 1 et 2 sont des sorts, 3 son aura) ; l'ours ne lance plus rien, il frappe à
 * +3 (ses 1 à 3 frappent aussi) et fait saigner. L'aura est le Bosquet, commun aux deux formes : un arbre
 * qui pousse sur la scène, qui soigne l'homme et dont les racines s'en prennent à l'adversaire quand
 * l'ours agit. La forme se lit avec des compétences de début de tour (`turnStart` + `form`).
 */
const DRUID_KIT = ['life-bloom', 'bark-skin', 'sap-aura', 'charge', 'claw', 'grudge-aura', 'grudge', 'sap']
// Les deux statuts de forme imitent des stats de forme (le d3 de l'homme, le +3 de l'ours). En bonus, la
// Purification d'Ysolde les retirait à la place d'un vrai bonus (aura, Régénération) : on les range en malus
// pour que rien ne les vise, comme le feraient de vraies stats de forme (séries 11 et 12 rejouées ainsi).
const CASTING: StatusDef = {
  name: 'Incantation',
  polarity: 'negative',
  summary: 'Sous forme humaine, le druide ne frappe pas : son dé devient un d3, chaque jet est un sort.',
  describe: () => 'Son dé devient un d3 : chaque jet est un sort',
  badge: () => 'd3',
  stacking: 'refresh',
  expiresAt: 'turnStart',
  modifyStats: (s) => ({ ...s, damageDie: 3 }),
}
const bearMight = (bonus: number): StatusDef => ({
  name: 'Force de l’ours',
  polarity: 'negative',
  summary: `Sous forme d’ours, chaque coup fait +${bonus}.`,
  describe: () => `Chaque coup fait +${bonus}`,
  badge: () => `+${bonus}`,
  stacking: 'refresh',
  expiresAt: 'turnStart',
  modifyOutgoing: (damage) => damage + bonus,
})
const GROVE: StatusDef = {
  name: 'Bosquet',
  look: { aura: 'rgba(132,204,22,0.5)' },
  polarity: 'positive',
  summary: 'Un arbre pousse sur la scène : il soigne l’homme, ses racines frappent quand l’ours agit. Permanente.',
  describe: (st) => `Bosquet de taille ${st.stacks}`,
  badge: (st) => String(st.stacks),
  stacking: 'add',
}
type Spell = { name: string; effects: CharacterEvent['effects'] }
const SPELLS: Record<string, Spell> = {
  fleur: { name: 'Fleur de vie', effects: [{ type: 'applyStatus', status: 'regeneration', stacks: 2, turns: 3 }] },
  soin: { name: 'Soin de sève', effects: [{ type: 'heal', amount: 6 }] },
  ecorce: { name: 'Écorce épaisse', effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 7 }] },
  follets: { name: 'Feux follets', effects: [{ type: 'applyStatus', status: 'burn', stacks: 3, target: 'opponent' }] },
  racines: { name: 'Racines', effects: [{ type: 'applyStatus', status: 'stunned', stacks: 1, target: 'opponent' }] },
  epines: { name: 'Lance d’épines', effects: [{ type: 'damage', amount: 6, target: 'opponent' }] },
  epines5: { name: 'Lance d’épines (5)', effects: [{ type: 'damage', amount: 5, target: 'opponent' }] },
  epines4: { name: 'Lance d’épines (4)', effects: [{ type: 'damage', amount: 4, target: 'opponent' }] },
}
interface NewDruid {
  one: keyof typeof SPELLS
  two: keyof typeof SPELLS
  /** Bonus de l'ours sur chaque coup */
  might: number
  /** Saignement posé par chaque coup de l'ours qui touche */
  bleed?: number
  /** Saignement posé par chaque critique de l'ours (au lieu de chaque coup) */
  critBleed?: number
  /** Bosquet : PV rendus à l'homme et effet des racines quand l'ours agit, par palier de taille (1, 2) */
  groveHeal: number
  groveRoots: { kind: 'damage' | 'bleed'; amount: number }
  maxHp?: number
}
const newDruid = (k: NewDruid) => {
  const spell = (trigger: 'naturalOne' | 'naturalTwo', key: keyof typeof SPELLS): CharacterEvent => ({
    id: `lab-sort-${key}`, name: SPELLS[key].name, nature: 'arcane', trigger, form: 'human', forfeitsHit: true, effects: SPELLS[key].effects,
  })
  const tiers = [1, 2].flatMap((level): CharacterEvent[] => {
    const when: CharacterEvent['when'] = [{ type: 'hasStatus', who: 'self', status: 'labGrove' as never, stacks: level }]
    const roots: CharacterEvent['effects'] =
      k.groveRoots.kind === 'damage'
        ? [{ type: 'damage', amount: k.groveRoots.amount, target: 'opponent' }]
        : [{ type: 'applyStatus', status: 'bleed', stacks: k.groveRoots.amount, target: 'opponent' }]
    return [
      { id: `lab-bosquet-soin-${level}`, name: 'Bosquet', nature: 'arcane', trigger: 'turnStart', form: 'human', when, effects: [{ type: 'heal', amount: k.groveHeal }] },
      { id: `lab-bosquet-racines-${level}`, name: 'Racines du bosquet', nature: 'arcane', trigger: 'turnStart', form: 'bear', when, effects: roots },
    ]
  })
  const events: CharacterEvent[] = [
    { id: 'lab-incantation', name: 'Incantation', nature: 'arcane', trigger: 'turnStart', form: 'human', effects: [{ type: 'applyStatus', status: 'labCasting' as never, stacks: 1, turns: 1 }] },
    { id: 'lab-force', name: 'Force de l’ours', nature: 'martial', trigger: 'turnStart', form: 'bear', effects: [{ type: 'applyStatus', status: `labMight${k.might}` as never, stacks: 1, turns: 1 }] },
    spell('naturalOne', k.one),
    spell('naturalTwo', k.two),
    { id: 'lab-bosquet', name: 'Bosquet', nature: 'arcane', trigger: 'naturalThree', form: 'human', forfeitsHit: true, effects: [{ type: 'applyStatus', status: 'labGrove' as never, stacks: 1 }] },
    ...tiers,
    ...(k.bleed ? [{ id: 'lab-griffes', name: 'Griffes', nature: 'martial', trigger: 'hit', form: 'bear', effects: [{ type: 'applyStatus', status: 'bleed', stacks: k.bleed, target: 'opponent' }] } as CharacterEvent] : []),
    ...(k.critBleed ? [{ id: 'lab-griffes', name: 'Griffes', nature: 'martial', trigger: 'crit', form: 'bear', effects: [{ type: 'applyStatus', status: 'bleed', stacks: k.critBleed, target: 'opponent' }] } as CharacterEvent] : []),
  ]
  return {
    statuses: { labCasting: CASTING, [`labMight${k.might}`]: bearMight(k.might), labGrove: GROVE },
    apply: all(remove(...DRUID_KIT), add(...events), ...(k.maxHp ? [stats({ maxHp: k.maxHp })] : [])),
  }
}
const NEW_DRUIDS: Record<string, NewDruid> = {
  'follets-epines-bosquet-1-1-griffes-1': { one: 'follets', two: 'epines', might: 3, bleed: 1, groveHeal: 1, groveRoots: { kind: 'damage', amount: 1 } },
  'follets-epines5-bosquet-1-1-griffes-1': { one: 'follets', two: 'epines5', might: 3, bleed: 1, groveHeal: 1, groveRoots: { kind: 'damage', amount: 1 } },
  'follets-epines4-bosquet-1-1-griffes-1': { one: 'follets', two: 'epines4', might: 3, bleed: 1, groveHeal: 1, groveRoots: { kind: 'damage', amount: 1 } },
  'follets-epines-bosquet-1-0-griffes-1': { one: 'follets', two: 'epines', might: 3, bleed: 1, groveHeal: 1, groveRoots: { kind: 'damage', amount: 0 } },
  'follets-epines-bosquet-2-0-griffes-1': { one: 'follets', two: 'epines', might: 3, bleed: 1, groveHeal: 2, groveRoots: { kind: 'damage', amount: 0 } },
  'soin-epines-bosquet-1-1-griffes-1': { one: 'soin', two: 'epines', might: 3, bleed: 1, groveHeal: 1, groveRoots: { kind: 'damage', amount: 1 } },
  'follets-epines-bosquet-1-1-griffes-crit': { one: 'follets', two: 'epines', might: 3, critBleed: 3, groveHeal: 1, groveRoots: { kind: 'damage', amount: 1 } },
  'follets-epines-bosquet-1-1': { one: 'follets', two: 'epines', might: 3, groveHeal: 1, groveRoots: { kind: 'damage', amount: 1 } },
}
const SERIES_11: LabIdea[] = Object.entries(NEW_DRUIDS).map(([id, k]) => ({
  series: 11 as const,
  id: `thaldrin-refonte-${id}`,
  character: 'thaldrin',
  name: `Refonte : ${SPELLS[k.one].name} / ${SPELLS[k.two].name}, ours +${k.might}${k.bleed ? `, griffes Saignement ${k.bleed}` : ''}, Bosquet ${k.groveHeal} PV / racines ${k.groveRoots.kind === 'damage' ? `${k.groveRoots.amount} dégâts` : `Saignement ${k.groveRoots.amount}`}${k.maxHp ? `, ${k.maxHp} PV` : ''}`,
  schema: 'Refonte (deux formes, un bosquet)',
  family: 'Soin + Puissance + Affliction',
  pitch: 'L’homme ne lance que des sorts (d3), l’ours ne fait que frapper (+3) ; le Bosquet, aura commune, soigne l’un et frappe pour l’autre.',
  ...newDruid(k),
  watch: ['lab-bosquet', 'lab-griffes', `lab-sort-${k.one}`, `lab-sort-${k.two}`],
}))

/*
 * Série 12 : le druide simple (2026-10-20, retour de l'utilisateur : le Bosquet ajoute une couche ; « on
 * n'arrive déjà pas à définir le druide »). Une phrase : l'homme lance un sort à chaque tour, l'ours frappe
 * fort et fait saigner, une seule aura vaut pour les deux. Aucune mécanique en plus : le spectacle des sorts
 * passe par la scène (foudre, lucioles), pas par une règle (SORTS.md § 18). Livré en 0.73.0 (Foudre 5, Feux
 * follets, Aura sauvage, ours +4 sans Saignement) : ces idées partent de l'ancien kit et ne s'appliquent plus.
 */
const WILD_AURA: StatusDef = {
  name: 'Aura sauvage',
  look: { aura: 'rgba(132,204,22,0.5)' },
  polarity: 'positive',
  summary: 'Le porteur regagne 2 PV par charge à la fin de chacun de ses tours, quelle que soit sa forme. Permanente.',
  describe: (st) => `Regagne ${2 * st.stacks} PV à la fin de chacun de ses tours`,
  badge: (st) => `+${2 * st.stacks}`,
  stacking: 'add',
  maxStacks: 3,
  onTurnEnd: (st) => [{ type: 'heal', amount: 2 * st.stacks }],
}
const BARK_AURA: StatusDef = {
  name: 'Aura d’écorce',
  look: { aura: 'rgba(120,83,45,0.55)' },
  polarity: 'positive',
  summary: 'L’armure du porteur gagne 1 par charge, quelle que soit sa forme. Permanente.',
  describe: (st) => `Armure +${st.stacks}`,
  badge: (st) => `+${st.stacks}`,
  stacking: 'add',
  modifyStats: (s, st) => ({ ...s, armor: s.armor + st.stacks }),
}
type SimpleSpell = { name: string; effects: CharacterEvent['effects'] }
const simpleSpells = (key: string): SimpleSpell => {
  const [kind, value] = [key.replace(/\d+$/, ''), Number(key.match(/\d+$/)?.[0] ?? 0)]
  if (kind === 'foudre') return { name: `Foudre (${value})`, effects: [{ type: 'damage', amount: value, target: 'opponent' }] }
  if (kind === 'soin') return { name: `Soin (${value})`, effects: [{ type: 'heal', amount: value }] }
  if (kind === 'follets') return { name: 'Feux follets', effects: [{ type: 'applyStatus', status: 'burn', stacks: value || 3, target: 'opponent' }] }
  if (kind === 'racines') return { name: 'Racines', effects: [{ type: 'applyStatus', status: 'stunned', stacks: 1, target: 'opponent' }] }
  throw new Error(`sort inconnu : ${key}`)
}
interface SimpleDruid {
  one: string
  two: string
  aura: 'sauvage' | 'ecorce' | 'puissance' | 'nature'
  might: number
  bleed: number
  maxHp?: number
}
const simpleDruid = (k: SimpleDruid) => {
  const spell = (trigger: 'naturalOne' | 'naturalTwo', key: string): CharacterEvent => {
    const s = simpleSpells(key)
    return { id: `lab-sort-${trigger}`, name: s.name, nature: 'arcane', trigger, form: 'human', forfeitsHit: true, effects: s.effects }
  }
  // « nature » : une seule aura pour les deux formes, qui fait plus mal sous les deux : +2 par charge aux coups
  // de l'ours (Aura de puissance) et +2 par palier à la Foudre de l'homme (paliers de laboratoire, 2 au plus)
  const aura = { sauvage: 'labWildAura', ecorce: 'labBarkAura', puissance: 'powerAura', nature: 'powerAura' }[k.aura]
  const natureBolt = (level: number): CharacterEvent => ({
    id: `lab-foudre-nature-${level}`, name: 'Foudre (aura)', nature: 'arcane', trigger: 'naturalOne', form: 'human', forfeitsHit: true,
    when: [{ type: 'hasStatus', who: 'self', status: 'powerAura', stacks: level }],
    effects: [{ type: 'damage', amount: 2, target: 'opponent' }],
  })
  const events: CharacterEvent[] = [
    { id: 'lab-incantation', name: 'Incantation', nature: 'arcane', trigger: 'turnStart', form: 'human', effects: [{ type: 'applyStatus', status: 'labCasting' as never, stacks: 1, turns: 1 }] },
    { id: 'lab-force', name: 'Force de l’ours', nature: 'martial', trigger: 'turnStart', form: 'bear', effects: [{ type: 'applyStatus', status: `labMight${k.might}` as never, stacks: 1, turns: 1 }] },
    spell('naturalOne', k.one),
    spell('naturalTwo', k.two),
    { id: 'lab-aura', name: 'Aura', nature: 'arcane', trigger: 'naturalThree', form: 'human', forfeitsHit: true, effects: [{ type: 'applyStatus', status: aura as never, stacks: 1 }] },
    ...(k.bleed ? [{ id: 'lab-griffes', name: 'Griffes', nature: 'martial', trigger: 'hit', form: 'bear', effects: [{ type: 'applyStatus', status: 'bleed', stacks: k.bleed, target: 'opponent' }] } as CharacterEvent] : []),
    ...(k.aura === 'nature' ? [natureBolt(1), natureBolt(2)] : []),
  ]
  return {
    statuses: { labCasting: CASTING, [`labMight${k.might}`]: bearMight(k.might), labWildAura: WILD_AURA, labBarkAura: BARK_AURA },
    apply: all(remove(...DRUID_KIT), add(...events), ...(k.maxHp ? [stats({ maxHp: k.maxHp })] : [])),
  }
}
const SIMPLE_DRUIDS: SimpleDruid[] = [
  { one: 'foudre5', two: 'follets3', aura: 'puissance', might: 3, bleed: 1 },
  { one: 'foudre5', two: 'follets3', aura: 'puissance', might: 3, bleed: 0 },
  { one: 'foudre5', two: 'follets3', aura: 'puissance', might: 4, bleed: 0 },
  { one: 'foudre5', two: 'follets3', aura: 'puissance', might: 5, bleed: 0 },
  { one: 'foudre4', two: 'follets3', aura: 'puissance', might: 4, bleed: 0 },
]
const SERIES_12: LabIdea[] = SIMPLE_DRUIDS.map((k) => ({
  series: 12 as const,
  id: `thaldrin-simple-${k.one}-${k.two}-${k.aura}-ours${k.might}-griffes${k.bleed}${k.maxHp ? `-pv${k.maxHp}` : ''}`,
  character: 'thaldrin',
  name: `Simple : ${simpleSpells(k.one).name} / ${simpleSpells(k.two).name}, aura ${k.aura}, ours +${k.might}, griffes ${k.bleed}${k.maxHp ? `, ${k.maxHp} PV` : ''}`,
  schema: 'Refonte simple (un sort par tour, une bête, une aura)',
  family: 'Puissance + Affliction',
  pitch: 'L’homme lance un sort à chaque tour, l’ours frappe à +3 et fait saigner, une aura pour les deux.',
  ...simpleDruid(k),
  watch: ['lab-sort-naturalOne', 'lab-sort-naturalTwo', 'lab-aura', 'lab-griffes'],
}))

/* --- Série 13 (2026-10-21) : la pièce de Pile ou face part aussitôt, juste après le 2 qui la pose, au lieu de
   remplacer le dé de l'action suivante. Naraxes passe de 49,8 à 61,6 % : pistes de compensation par la valeur de pile.
   Résultats (base 62,3 %) : 10 → 54,1 %, 12 → 56,3 %, 15 → 58,7 %. Décision de l'utilisateur : « Pile à 10 », livrée
   (`COIN_HEADS`, statuses.ts). Les idées se rejouent désormais contre une base déjà à 10. --- */
const SERIES_13: LabIdea[] = [10, 12, 15].map((damage) => ({
  series: 13 as const,
  id: `naraxes-pile-aussitot-${damage}`,
  character: 'naraxes',
  name: `Pile aussitôt à ${damage}`,
  schema: 'Compensation',
  family: 'Fortune',
  pitch: `La pièce part aussitôt ; pile : ${damage} dégâts directs qui touchent (au lieu de 20) ; face, rien.`,
  statuses: { [`labPileNow${damage}`]: { ...COIN, coinToss: { damage, headsTouches: true } } },
  apply: replace('coin-flip', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: `labPileNow${damage}` as never, stacks: 1 }] })),
  watch: ['coin-flip'],
}))

export const IDEAS: readonly LabIdea[] = [
  {
    series: 1,
    id: 'gorak-colere',
    character: 'gorak',
    name: 'Colère',
    schema: 'Accumuler',
    family: 'Puissance',
    pitch: 'Chaque coup encaissé lui donne une charge de Colère (+1 dégât par charge, 5 au plus).',
    statuses: {
      labRage: {
        name: 'Colère',
        polarity: 'positive',
        summary: 'Chaque charge ajoute 1 dégât à ses coups. 5 charges au plus.',
        describe: (s) => `Ses coups infligent ${s.stacks} de plus`,
        badge: (s) => `+${s.stacks}`,
        stacking: 'add',
        maxStacks: 5,
        modifyOutgoing: (damage, s) => damage + s.stacks,
      },
    },
    apply: add({ id: 'lab-colere', name: 'Colère', trigger: 'hurt', effects: [{ type: 'applyStatus', status: 'labRage' as never, stacks: 1 }] }),
    watch: ['labRage'],
  },
  {
    series: 1,
    id: 'murzug-ivresse',
    character: 'murzug',
    name: 'Ivresse du sang',
    schema: 'Pont entre familles',
    family: 'Tempo',
    pitch: 'Chaque critique lui donne une Furie des vents : il frappe deux fois à sa prochaine action.',
    apply: add({ id: 'lab-ivresse', name: 'Ivresse du sang', trigger: 'crit', effects: [{ type: 'applyStatus', status: 'windFury', stacks: 1, turns: 1 }] }),
    watch: ['lab-ivresse'],
  },
  {
    series: 1,
    id: 'elaria-contre-tir',
    character: 'elaria',
    name: 'Contre-tir',
    schema: 'Pont entre familles',
    family: 'Précision',
    pitch: 'Quand elle esquive, son prochain coup qui touche est critique.',
    apply: add({ id: 'lab-contre-tir', name: 'Contre-tir', trigger: 'dodge', effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }] }),
    watch: ['lab-contre-tir'],
  },
  {
    series: 1,
    id: 'sylwen-second-tir',
    character: 'sylwen',
    name: 'Second tir',
    schema: 'Retournement',
    family: 'Précision',
    pitch: 'Quand son coup est esquivé, le prochain qui touche est critique : la forêt ne pardonne pas deux fois.',
    apply: add({ id: 'lab-second-tir', name: 'Second tir', trigger: 'missed', effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }] }),
    watch: ['lab-second-tir'],
  },
  {
    series: 1,
    id: 'brokk-tenir-la-porte',
    character: 'brokk',
    name: 'Tenir la porte',
    schema: 'Retournement',
    family: 'Garde',
    pitch: "La première fois qu'il passe sous la moitié de ses PV, il gagne une charge d'Aura d'intimidation.",
    apply: add({ id: 'lab-porte', name: 'Tenir la porte', trigger: 'bloodied', effects: [{ type: 'applyStatus', status: 'intimidationAura', stacks: 1 }] }),
    watch: ['lab-porte'],
  },
  {
    series: 1,
    id: 'grimbald-brise-fer',
    character: 'grimbald',
    name: 'Brise-fer',
    schema: 'Contre ciblé',
    family: 'Garde (malus)',
    pitch: "Un coup sur quatre qui touche rend l'adversaire Vulnérable (+1 dégât reçu) pendant 2 tours.",
    apply: add({ id: 'lab-brise-fer', name: 'Brise-fer', trigger: 'hit', chance: 0.25, effects: [{ type: 'applyStatus', status: 'vulnerable', stacks: 1, turns: 2, target: 'opponent' }] }),
    watch: ['lab-brise-fer'],
  },
  {
    series: 1,
    id: 'ervald-etreinte',
    character: 'ervald',
    name: 'Étreinte glacée',
    schema: 'Pont entre familles',
    family: 'Soin',
    pitch: "Chaque coup qui touche un adversaire empoisonné lui rend 2 PV.",
    apply: add({ id: 'lab-etreinte', name: 'Étreinte glacée', trigger: 'hit', when: [{ type: 'hasStatus', who: 'opponent', status: 'poison' }], effects: [{ type: 'heal', amount: 2 }] }),
    watch: ['lab-etreinte'],
  },
  {
    series: 1,
    id: 'caldrec-moisson',
    character: 'caldrec',
    name: 'Moisson',
    schema: 'Pont entre familles',
    family: 'Affliction',
    pitch: 'Chaque critique empoisonne : 2 PV par tour pendant 3 tours.',
    apply: add({ id: 'lab-moisson', name: 'Moisson', trigger: 'crit', effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, turns: 3, target: 'opponent' }] }),
    watch: ['lab-moisson'],
  },
  {
    series: 1,
    id: 'ysolde-jugement',
    character: 'ysolde',
    name: 'Jugement',
    schema: 'Contre ciblé',
    family: 'Tempo (malus)',
    pitch: "Quand elle encaisse un coup, une chance sur sept que l'agresseur, saisi de peur, perde sa prochaine action.",
    apply: add({ id: 'lab-jugement', name: 'Jugement', trigger: 'hurt', chance: 1 / 7, effects: [{ type: 'applyStatus', status: 'fear', stacks: 1, target: 'opponent' }] }),
    watch: ['lab-jugement'],
  },
  {
    series: 1,
    id: 'berengere-bucher',
    character: 'berengere',
    name: 'Bûcher',
    schema: 'Pont entre familles',
    family: 'Affliction',
    pitch: "Chaque critique enflamme l'adversaire : Brûlure 3 pendant 2 tours (à la fin de ses tours).",
    apply: add({ id: 'lab-bucher', name: 'Bûcher', trigger: 'crit', effects: [{ type: 'applyStatus', status: 'burn', stacks: 3, turns: 2, target: 'opponent' }] }),
    watch: ['lab-bucher'],
  },
  {
    series: 1,
    id: 'naraxes-main-leste',
    character: 'naraxes',
    name: 'Main leste',
    schema: 'Vol',
    family: 'Sceaux',
    pitch: "Quand elle esquive, elle subtilise le dernier bonus posé de l'adversaire (il le perd).",
    apply: add({ id: 'lab-main-leste', name: 'Main leste', trigger: 'dodge', effects: [{ type: 'cleanse', polarity: 'positive', count: 1, target: 'opponent' }] }),
    watch: ['lab-main-leste'],
  },
  {
    series: 1,
    id: 'ssythra-morsure',
    character: 'ssythra',
    name: 'Morsure',
    schema: 'Paliers',
    family: 'Affliction',
    pitch: "Chaque coup qui touche un adversaire portant 2 charges de poison ou plus lui inflige 3 dégâts directs de plus.",
    apply: add({ id: 'lab-morsure', name: 'Morsure', trigger: 'hit', when: [{ type: 'hasStatus', who: 'opponent', status: 'poison', stacks: 2 }], effects: [{ type: 'damage', amount: 3, target: 'opponent' }] }),
    watch: ['lab-morsure'],
  },
  {
    series: 1,
    id: 'aldric-serment',
    character: 'aldric',
    name: 'Serment',
    schema: 'Contre ciblé',
    family: 'Sceaux',
    pitch: 'Il entre en lice avec 2 charges de Garde sacrée : les deux premiers malus posés sur lui sont bloqués.',
    apply: add({ id: 'lab-serment', name: 'Serment', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'ward', stacks: 2 }] }),
    watch: ['lab-serment', 'ward'],
  },
  {
    series: 1,
    id: 'gauvain-elan',
    character: 'gauvain',
    name: 'Élan du croisé',
    schema: 'Pont entre familles',
    family: 'Représailles',
    pitch: 'Chaque critique arme une Riposte : le prochain coup qui le touche renvoie la moitié de ses dégâts.',
    apply: add({ id: 'lab-elan', name: 'Élan du croisé', trigger: 'crit', effects: [{ type: 'applyStatus', status: 'riposte', stacks: 1 }] }),
    watch: ['lab-elan'],
  },
  {
    series: 1,
    id: 'gnashka-peau-de-roche',
    character: 'gnashka',
    name: 'Peau de roche',
    schema: 'Accumuler',
    family: 'Garde',
    pitch: "Un coup encaissé sur cinq lui laisse 3 points d'Armure temporaire. Morgrut, lui, reste nu : il sert de témoin.",
    apply: add({ id: 'lab-roche', name: 'Peau de roche', trigger: 'hurt', chance: 0.2, effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 3 }] }),
    watch: ['lab-roche'],
  },
  {
    series: 1,
    id: 'thaldrin-fleur-ouverte',
    character: 'thaldrin',
    name: 'Fleur qui s’ouvre',
    schema: 'Retouche (FAMILLES.md § 6.3 A)',
    family: 'Soin',
    pitch: 'Fleur de vie ne soigne plus 3 PV d’un coup : Régénération 2 pendant 3 tours, qui continue sous la forme d’ours et chasse le poison.',
    apply: replace('life-bloom', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: 'regeneration', stacks: 2, turns: 3 }] })),
    watch: ['life-bloom', 'regeneration'],
  },
  {
    series: 1,
    id: 'brannoc-feuilles-mortes',
    character: 'brannoc',
    name: 'Feuilles mortes',
    schema: 'Paliers',
    family: 'Puissance (malus)',
    pitch: "Chaque coup qui touche un adversaire portant 2 charges de Pourriture ou plus l'Affaiblit (−1 dégât) pendant 2 tours.",
    apply: add({ id: 'lab-feuilles', name: 'Feuilles mortes', trigger: 'hit', when: [{ type: 'hasStatus', who: 'opponent', status: 'rot', stacks: 2 }], effects: [{ type: 'applyStatus', status: 'weakened', stacks: 1, turns: 2, target: 'opponent' }] }),
    watch: ['lab-feuilles'],
  },
  /* --- Série 2 : à puissance égale. L'idée vient avec sa compensation, pour rester dans le budget. --- */
  {
    series: 2,
    id: 'gorak-colere-bridee',
    character: 'gorak',
    name: 'Colère bridée',
    schema: 'Accumuler',
    family: 'Puissance',
    pitch: 'Un coup encaissé sur deux lui donne une charge de Colère (+1 dégât par charge, 3 au plus), qui retombe 2 tours après le dernier coup reçu.',
    statuses: {
      labRageCapped: {
        name: 'Colère',
        polarity: 'positive',
        summary: 'Chaque charge ajoute 1 dégât à ses coups. 3 charges au plus ; retombe si on ne le frappe plus.',
        describe: (s) => `Ses coups infligent ${s.stacks} de plus`,
        badge: (s) => `+${s.stacks}`,
        stacking: 'add',
        maxStacks: 3,
        modifyOutgoing: (damage, s) => damage + s.stacks,
      },
    },
    apply: add({ id: 'lab-colere-bridee', name: 'Colère', trigger: 'hurt', chance: 0.5, effects: [{ type: 'applyStatus', status: 'labRageCapped' as never, stacks: 1, turns: 2 }] }),
    watch: ['labRageCapped'],
  },
  {
    series: 2,
    id: 'gorak-colere-au-lieu-de-rage',
    character: 'gorak',
    name: 'Colère, sans Rage du sang',
    schema: 'Accumuler',
    family: 'Puissance',
    pitch: 'Colère bridée, mais Rage du sang disparaît : son 1 redevient un coup normal.',
    apply: all(
      remove('blood-rage'),
      add({ id: 'lab-colere-bridee', name: 'Colère', trigger: 'hurt', chance: 0.5, effects: [{ type: 'applyStatus', status: 'labRageCapped' as never, stacks: 1, turns: 2 }] }),
    ),
    watch: ['labRageCapped'],
  },
  {
    series: 2,
    id: 'murzug-ivresse-au-lieu-de-furie',
    character: 'murzug',
    name: 'Ivresse, sans Furie',
    schema: 'Pont entre familles',
    family: 'Tempo',
    pitch: 'Ses Furies viennent de ses critiques, plus de son 2 : son 2 redevient un coup normal. Il ne joue plus comme Gorak.',
    apply: all(
      remove('wind-fury'),
      add({ id: 'lab-ivresse', name: 'Ivresse du sang', trigger: 'crit', effects: [{ type: 'applyStatus', status: 'windFury', stacks: 1, turns: 1 }] }),
    ),
    watch: ['lab-ivresse'],
  },
  {
    series: 2,
    id: 'elaria-contre-tir-au-lieu-de-faucon',
    character: 'elaria',
    name: 'Contre-tir, sans Œil de faucon',
    schema: 'Pont entre familles',
    family: 'Précision',
    pitch: "Une esquive sur deux prépare un critique ; Œil de faucon disparaît (son 1 redevient un coup).",
    apply: all(
      remove('hawk-eye'),
      add({ id: 'lab-contre-tir', name: 'Contre-tir', trigger: 'dodge', chance: 0.5, effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }] }),
    ),
    watch: ['lab-contre-tir'],
  },
  {
    series: 2,
    id: 'sylwen-second-tir-moins-de-critique',
    character: 'sylwen',
    name: 'Second tir, critique 13 %',
    schema: 'Retournement',
    family: 'Précision',
    pitch: 'Second tir, contre 4 points de critique de base (17 → 13 %) : elle critique moins au hasard, davantage quand elle a raté.',
    apply: all(
      stats({ critChance: 0.13 }),
      add({ id: 'lab-second-tir', name: 'Second tir', trigger: 'missed', effects: [{ type: 'applyStatus', status: 'guaranteedCrit', stacks: 1 }] }),
    ),
    watch: ['lab-second-tir'],
  },
  {
    series: 2,
    id: 'brokk-porte-peau-de-pierre-4',
    character: 'brokk',
    name: 'Tenir la porte, Peau de pierre 4',
    schema: 'Retournement',
    family: 'Garde',
    pitch: 'Tenir la porte, contre une Peau de pierre plus mince (+6 → +4).',
    apply: all(
      replace('stoneskin', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: 'bonusArmor', stacks: 4 }] })),
      add({ id: 'lab-porte', name: 'Tenir la porte', trigger: 'bloodied', effects: [{ type: 'applyStatus', status: 'intimidationAura', stacks: 1 }] }),
    ),
    watch: ['lab-porte'],
  },
  {
    series: 2,
    id: 'caldrec-moisson-au-lieu-du-souffle',
    character: 'caldrec',
    name: 'Moisson, sans Souffle de la tombe',
    schema: 'Pont entre familles',
    family: 'Affliction',
    pitch: "Son poison vient de ses critiques, plus de son 1 : son 1 redevient un coup. Il ne joue plus comme Ervald.",
    apply: all(
      remove('grave-breath'),
      add({ id: 'lab-moisson', name: 'Moisson', trigger: 'crit', effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, turns: 3, target: 'opponent' }] }),
    ),
    watch: ['lab-moisson'],
  },
  {
    series: 2,
    id: 'berengere-bucher-2',
    character: 'berengere',
    name: 'Bûcher 2',
    schema: 'Pont entre familles',
    family: 'Affliction',
    pitch: "Chaque critique enflamme l'adversaire : Brûlure 2 pendant 2 tours.",
    apply: add({ id: 'lab-bucher', name: 'Bûcher', trigger: 'crit', effects: [{ type: 'applyStatus', status: 'burn', stacks: 2, turns: 2, target: 'opponent' }] }),
    watch: ['lab-bucher'],
  },
  {
    series: 2,
    id: 'naraxes-main-leste-une-fois',
    character: 'naraxes',
    name: 'Main leste, une fois',
    schema: 'Vol',
    family: 'Sceaux',
    pitch: 'Main leste, une seule fois par combat.',
    apply: add({ id: 'lab-main-leste', name: 'Main leste', trigger: 'dodge', limit: 1, effects: [{ type: 'cleanse', polarity: 'positive', count: 1, target: 'opponent' }] }),
    watch: ['lab-main-leste'],
  },
  {
    series: 2,
    id: 'gauvain-elan-deux-fois',
    character: 'gauvain',
    name: 'Élan du croisé, deux fois',
    schema: 'Pont entre familles',
    family: 'Représailles',
    pitch: 'Élan du croisé, deux fois par combat au plus.',
    apply: add({ id: 'lab-elan', name: 'Élan du croisé', trigger: 'crit', limit: 2, effects: [{ type: 'applyStatus', status: 'riposte', stacks: 1 }] }),
    watch: ['lab-elan'],
  },
  /* --- Série 3 : petites touches sur les compétences signalées par l'audit (SORTS.md § 8). --- */
  {
    series: 3,
    id: 'naraxes-pile-20',
    character: 'naraxes',
    name: 'Pile ou face à 20',
    schema: 'Petite touche',
    family: 'Fortune',
    pitch: 'Pile rapporte 20 dégâts au lieu de 15.',
    statuses: { labCoin20: { ...STATUSES.coinFlip, coinToss: { damage: 20 }, badge: () => '20' } },
    apply: replace('coin-flip', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: 'labCoin20' as never, stacks: 1 }] })),
    watch: ['coin-flip'],
  },
  {
    series: 3,
    id: 'ssythra-chance-d6',
    character: 'ssythra',
    name: 'Coup de chance au d6',
    schema: 'Petite touche',
    family: 'Fortune',
    pitch: 'Le dé en plus est un d6 au lieu d’un d3 : il frappe une fois sur deux au lieu de jamais.',
    statuses: { labLuckyD6: { ...STATUSES.luckyStrike, extraDie: 6, badge: () => '+d6' } },
    apply: replace('lucky-strike', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: 'labLuckyD6' as never, stacks: 1 }] })),
    watch: ['lucky-strike'],
  },
  {
    series: 3,
    id: 'elaria-esquive-sans-duree',
    character: 'elaria',
    name: 'Esquive améliorée sans durée',
    schema: 'Petite touche',
    family: 'Esquive',
    pitch: 'L’esquive attend le prochain coup reçu, au lieu de s’éteindre au bout d’un tour (même réparation que la Riposte en 0.32.0).',
    apply: replace('evasion', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: 'evasion', stacks: 1 }] })),
    watch: ['evasion'],
  },
  {
    series: 3,
    id: 'aldric-immunite-soin',
    character: 'aldric',
    name: 'Aura d’immunité et soin',
    schema: 'Petite touche',
    family: 'Sceaux',
    pitch: 'En plus de purger ses malus et de le rendre immunisé, l’aura lui rend 4 PV.',
    apply: replace('immunity-aura', (e) => ({ ...e, effects: [...e.effects, { type: 'heal', amount: 4 }] })),
    watch: ['immunity-aura'],
  },
  {
    series: 3,
    id: 'ysolde-purification-double',
    character: 'ysolde',
    name: 'Purification double',
    schema: 'Petite touche',
    family: 'Sceaux',
    pitch: 'Elle retire le dernier bonus de l’adversaire ET son propre dernier malus : la compétence sert même contre un adversaire sans bonus.',
    apply: replace('purification', (e) => ({ ...e, effects: [...e.effects, { type: 'cleanse', polarity: 'negative', count: 1 }] })),
    watch: ['purification'],
  },
  {
    series: 3,
    id: 'aldric-retribution-2-jauges',
    character: 'aldric',
    name: 'Rétribution à 2 jauges',
    schema: 'Petite touche',
    family: 'Représailles',
    pitch: 'Deux jauges au lieu de trois : la rétribution reste son grand moment, mais pèse moins lourd.',
    statuses: { labRetribution2: { ...STATUSES.retribution, fillsOnHurt: { slots: 2 } } },
    apply: replace('retribution', (e) => ({ ...e, effects: [{ type: 'release', status: 'labRetribution2' as never, min: 1, target: 'opponent' }] })),
    watch: ['retribution'],
  },
  {
    series: 3,
    id: 'thaldrin-ecorce-6',
    character: 'thaldrin',
    name: 'Écorce épaisse à 6',
    schema: 'Petite touche',
    family: 'Garde',
    pitch: 'L’écorce absorbe 6 points au lieu de 4.',
    apply: replace('bark-skin', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: 'barkSkin', stacks: 6 }] })),
    watch: ['bark-skin'],
  },
  {
    series: 3,
    id: 'murzug-rage-5',
    character: 'murzug',
    name: 'Rage du sang à 5',
    schema: 'Petite touche',
    family: 'Soin',
    pitch: 'Murzug seul : Rage du sang rend 5 PV au lieu de 3 (Gorak garde 3).',
    apply: replace('blood-rage', (e) => ({ ...e, effects: [{ type: 'heal', amount: 5 }] })),
    watch: ['blood-rage'],
  },
  {
    series: 3,
    id: 'ysolde-saintete-plafond-2',
    character: 'ysolde',
    name: 'Aura de sainteté plafonnée à 2',
    schema: 'Petite touche',
    family: 'Soin',
    pitch: 'L’aura ne se cumule plus au-delà de 2 charges (4 PV par tour au plus).',
    statuses: { labHolyCap2: { ...STATUSES.holyAura, maxStacks: 2 } },
    apply: replace('holy-aura', (e) => ({ ...e, effects: [{ type: 'applyStatus', status: 'labHolyCap2' as never, stacks: 1 }] })),
    watch: ['holy-aura'],
  },

  /* --- Série 4 : les six compétences signalées par l'audit 0.39.1 (SORTS.md § 10). Chaque idée est
     déclinée pour les deux personnages qui partagent la compétence. --- */
  ...SERIES_4,
  ...SERIES_5,
  ...SERIES_6,
  ...SERIES_7,
  ...SERIES_8,
  ...SERIES_9,
  ...SERIES_10,
  ...SERIES_10_RELAY,
  ...SERIES_11,
  ...SERIES_12,
  ...SERIES_13,
]

