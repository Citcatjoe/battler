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
   * 3 = petite touche sur une compétence existante signalée par l'audit (`scripts/skills.report.ts`)
   */
  series: 1 | 2 | 3
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
]
