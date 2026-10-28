import { hashSeed } from './analysis'
import { Character, type CharacterDef } from './character'
import type { CharacterEvent } from './events'
import { simulateCombat, type CombatResult } from './combat'
import { isAuraSkill, isOffered, OFFERED_OPS, stepKey, validOnOrigin, withForgeStep, type ForgeOffer, type ForgeStep } from './forge'
import { drawReward, forgesLeftIn, REWARDS, type PendingReward } from './offers'
import { getRelic, RELIC_IDS } from './relics'
import { seededRng, shuffle, type Rng } from './rng'
import { ALL_SKILLS, CHARACTER_IDS, createCharacter, ROSTER } from './roster'
import { sumTriggers, triggerCounts, type TriggerCounts } from './stats'

/*
 * Campagne (0.88.0, prototype de docs/CAMPAGNE.md ; acte resserré en 0.89.0, allongé en 0.104.0) : un champion tiré
 * parmi trois, parti de sa signature et d'une seconde compétence (0.112.0), mène un acte de onze nœuds, dix combats
 * normaux puis le boss. Les combats restent automatiques ; le joueur choisit son adversaire à chaque nœud (deux
 * propositions, avec leur bande de danger), et chaque combat normal gagné rapporte une récompense, une relique ou une
 * forge du dé (`REWARDS`, offers.ts) : cinq reliques et cinq forges dans l'acte (six et quatre jusqu'au 2026-10-28). Une
 * défaite met fin à la partie ; la victoire
 * contre le boss aussi. Toute partie qui a rapporté quelque chose laisse un héritage au même personnage
 * (docs/CAMPAGNE.md § 8).
 *
 * Réglage (§ 6.3) : chaque adversaire est réglé par simulation sur une courbe nominale montante, contre un « champion
 * de référence » (le même personnage, forgé et équipé au hasard au même rythme), pas contre le champion réel : un
 * champion bien construit dépasse la courbe et écrase, un champion mal construit souffre. Le levier est le nombre de PV
 * de l'adversaire, borné par un plancher (`HP_FLOOR`), et sa construction en retard (`OPPONENT_LAG`). Les bandes de
 * danger, elles, se calculent contre le champion réel ; les chiffres restent cachés.
 */

/**
 * Combats normaux d'un acte, avant le boss (règles v2, décision de l'utilisateur, docs/PROGRESSION.md § 11.2 : dix
 * combats ; cinq de 0.89.0 à 0.103.0). Leurs récompenses : `REWARDS`, offers.ts.
 */
export const ACT_FIGHTS = 10

/** Nœuds d'un acte : les combats normaux, puis le boss. */
export const ACT_LENGTH = ACT_FIGHTS + 1

/** Adversaires proposés à chaque nœud de combat normal. */
export const ENCOUNTER_CHOICES = 2

/** Héritages proposés au départ, tirés parmi les gains de la dernière partie du personnage. */
export const HERITAGE_CHOICES = 3

/**
 * Courbe nominale (§ 18.3 de CAMPAGNE.md, allongée en 0.104.0, PROGRESSION.md § 11.3) : la victoire visée du champion
 * de référence à chaque combat normal, puis le drame du boss (45 %). Abaissée au début en 0.106.0 (décision de
 * l'utilisateur, « plus basse au début, vers 90 % ») : de 90 à 88 %. Depuis la 0.113.0 (option B, décision de
 * l'utilisateur), les deux premiers combats visent ce qu'ils valent avec le plancher des PV (`HP_FLOOR`) : 78 et 86 %.
 */
export const NORMAL_TARGETS: readonly number[] = [0.78, 0.86, 0.9, 0.89, 0.89, 0.89, 0.89, 0.88, 0.88, 0.88]
export const BOSS_TARGET = 0.45

/* ---------- Le boss ---------- */

const rosterDef = (id: string) => ROSTER.find((c) => c.id === id)!
const rosterSkill = (id: string) => ALL_SKILLS.find((e) => e.id === id)!

/**
 * Le boss commun (§ 6.3, décision du 2026-10-22), écrit à la main : Le Colosse, l'ogre qui règne sur l'arène. Il garde
 * de chaque champion brisé une technique (trois compétences du roster, sur ses faces 1 à 3) et un trophée (deux
 * reliques) ; son couperet est forgé (deux faces dorées). Ses PV, seuls, se règlent pour chaque champion (BOSS_TARGET).
 * Image de Morgrut, assombrie : un autre ogre, plus grand et plus vieux.
 */
export const BOSS: CharacterDef = {
  id: 'colossus',
  name: 'Le Colosse',
  race: 'Ogre',
  archetype: 'Champion de l’arène',
  // Ses techniques volées viennent du Rempart et du Sang (exigé par la fiche ; le boss ne grave pas)
  masteries: ['bulwark', 'blood'],
  // Règles v2, phase 5 bis (0.106.0) : une attaque lourde, ses trois techniques sur le 1, le 2 et le 3 (Peau de pierre
  // se greffe sur son coup, Pourfendre le modifie), ses faces 5 et 6 dorées. Refonte des auras (2026-10-28) : l'Aura
  // d'intimidation sort du jeu, la Riposte d'Aldric la remplace sur son 3
  stats: { maxHp: 70, attackMin: 6, attackMax: 8, armor: 0, dodgeChance: 0.04, critChance: 0.08, critMultiplier: 2 },
  look: { ...rosterDef('morgrut').look, tint: 'brightness(0.72) sepia(0.35) hue-rotate(-20deg) saturate(1.4)' },
  lore: {
    tagline: 'Personne ne l’a jamais vu tomber. Personne ne l’a jamais vu de près, non plus.',
    background:
      "Le Colosse règne sur l'arène depuis plus longtemps que ses gradins. De chaque champion qu'il a brisé, il a gardé une technique et un trophée ; son couperet porte l'or de ceux qui l'ont payé pour perdre.",
    strengths: ['Trois techniques volées', 'Deux trophées', 'Un couperet doré'],
    weaknesses: ['Lent à s’échauffer', 'N’esquive jamais'],
  },
  events: [
    { ...rosterSkill('stoneskin'), trigger: 'naturalOne' },
    { ...rosterSkill('cleave'), trigger: 'naturalTwo' },
    { ...rosterSkill('riposte'), trigger: 'naturalThree' },
  ],
  relics: [getRelic('mercenary-mail'), getRelic('wolf-fang')],
  forge: [
    { op: 'gild', face: 6 },
    { op: 'gild', face: 5 },
  ],
}

/** Un adversaire de campagne par son id : un personnage du roster, à son dé vanilla, ou le boss. */
export const campaignCharacter = (id: string) => (id === BOSS.id ? new Character(BOSS) : createCharacter(id))

/*
 * ---------- Le champion : le personnage vanilla ----------
 *
 * Un seul modèle (0.113.0, règle de l'utilisateur) : un champion de campagne part du personnage du roster tel quel
 * (`createCharacter`), le même qu'en tournoi, à l'aura de départ près (maîtrises : l'aura choisie sur le 1, sa
 * compétence de personnage sur le 2, docs/MAITRISES.md § 5) ; seules les règles du mode (forge, reliques, réserve de
 * ses maîtrises, limite de faces) le font évoluer.
 */

/* ---------- La partie ---------- */

/** Un héritage : une relique, ou une opération de forge sur une face du dé d'origine. */
export type HeritageItem = { kind: 'relic'; relic: string } | { kind: 'forge'; step: ForgeStep }

/**
 * Une rencontre proposée : un adversaire construit comme un champion (sa signature, puis les récompenses que le nœud
 * lui donne), réglé par ses PV, et la chance cachée du champion réel.
 */
export interface Encounter {
  characterId: string
  /** PV de base réglés par simulation sur la courbe nominale */
  maxHp: number
  /** Sa forge et ses reliques (règles v2, 0.105.0 : l'adversaire grandit avec l'acte ; vides pour le boss) */
  forge: ForgeStep[]
  relics: string[]
  boss?: true
  /** Victoire du champion réel, estimée par simulation : seule sa bande (`dangerOf`) s'affiche */
  chance: number
}

export interface FightRecord {
  opponentId: string
  boss?: true
  won: boolean
  turns: number
  hpLeft: number
  seed?: number
  /** Déclenchements du champion (reliques, faces du dé), pour l'écran de fin ; absents d'une partie d'avant 0.121 */
  triggers?: TriggerCounts
}

export interface CampaignRun {
  version: 5
  /** Graine de la partie : rencontres, réglages, offres et choix par défaut en dérivent */
  seed: number
  championId: string
  /** L'aura de départ choisie (docs/REFONTE_AURAS.md § 3) : sur le 1 de son dé, l'une des deux `auras` de sa fiche */
  aura: string
  /** L'héritage choisi au départ (il n'entre pas dans les gains : il ne se transmet pas à nouveau) */
  heritage?: HeritageItem
  forge: ForgeStep[]
  relics: string[]
  /** Améliorations gagnées pendant la partie, dans l'ordre : la matière du prochain héritage */
  gains: HeritageItem[]
  /** Combats gagnés (le nœud en cours est le suivant) */
  wins: number
  fights: FightRecord[]
  /** Rencontres du nœud en cours, une fois réglées (absentes : à calculer, `withEncounters`) */
  encounters?: Encounter[]
  reward?: PendingReward
  /** Fin de la partie : victoire contre le boss, ou défaite */
  outcome?: 'won' | 'lost'
}

/** Le dé de départ d'un champion parti de l'aura `aura` (l'aura par défaut sans elle) : la base de sa forge. */
const startDef = (championId: string, aura?: string) => createCharacter(championId, { aura }).definition

/** Le champion tel qu'il est maintenant : le personnage vanilla, parti de son aura (`createCharacter`), son dé forgé, ses reliques. */
export function championOf(run: Pick<CampaignRun, 'championId' | 'forge' | 'relics'> & { aura?: string }): Character {
  return createCharacter(run.championId, { aura: run.aura }).withForge(run.forge).withRelics(run.relics.map(getRelic))
}

/** Un adversaire avant le réglage de ses PV : le boss, ou le personnage vanilla et sa construction. */
function opponentBase(e: Pick<Encounter, 'characterId' | 'forge' | 'relics'>): Character {
  if (e.characterId === BOSS.id) return new Character(BOSS)
  return createCharacter(e.characterId).withForge(e.forge).withRelics(e.relics.map(getRelic))
}

/** L'adversaire d'une rencontre, à ses PV réglés. */
export function opponentOf(encounter: Encounter): Character {
  return opponentBase(encounter).adjusted({ stats: { maxHp: encounter.maxHp } })
}

/** Le nœud en cours (0 à `ACT_FIGHTS`) ; le dernier est le boss. */
export const isBossNode = (run: CampaignRun) => run.wins === ACT_FIGHTS

/** Les deux auras d'un champion (la première : l'aura par défaut, celle du duel ; le tournoi en tire une au hasard). */
export const startAurasOf = (championId: string): readonly string[] => rosterDef(championId).auras ?? []

/**
 * Les héritages d'un champion qui valent sur le dé de l'aura choisie (docs/MAITRISES.md § 11.2) : une gravure de l'aura
 * qui est déjà sur son 1, ou un aiguisage d'une aura qui ne s'aiguise pas, est écarté.
 */
export function heritageFor(championId: string, aura: string, items: readonly HeritageItem[]): HeritageItem[] {
  const def = startDef(championId, aura)
  return items.filter((g) => g.kind === 'relic' || validOnOrigin(def, g.step))
}

/** Commence une partie : le champion, son aura de départ (l'aura par défaut sans elle), et son héritage s'il en a choisi un. */
export function startRun(championId: string, seed: number, heritage?: HeritageItem, aura = startAurasOf(championId)[0]): CampaignRun {
  if (!startAurasOf(championId).includes(aura)) throw new Error(`${aura} n'est pas une aura de départ de ${championId}`)
  const def = startDef(championId, aura)
  return {
    version: 5,
    seed,
    championId,
    aura,
    ...(heritage && { heritage }),
    forge: heritage?.kind === 'forge' ? withForgeStep(def, [], heritage.step) : [],
    relics: heritage?.kind === 'relic' ? [heritage.relic] : [],
    gains: [],
    wins: 0,
    fights: [],
  }
}

/* ---------- Réglage des rencontres (§ 6.3) ---------- */

/** Champions de référence simulés par réglage, et combats par champion et par essai de PV. */
const REFERENCE_VARIANTS = 12
const REFERENCE_FIGHTS = 8
/**
 * Le boss (retour du 2026-10-28, A16) : ses PV se règlent avec cinq fois plus de combats par champion de référence (le
 * bruit du réglage passe d'environ ±5 à ±2 points, soit ±20 à 50 PV de moins), jusqu'à cinq fois ses PV de base (le triple
 * laissait beaucoup de champions au-dessus des 45 % visés). Un seul nœud paie ce calcul.
 */
const BOSS_REFERENCE_FIGHTS = 40
export const BOSS_HP_CEILING = 5
/** Combats simulés pour estimer la chance du champion réel (bande de danger). */
const DANGER_FIGHTS = 160

/**
 * Le levier des PV, moins fort (0.112.0, retour de l'utilisateur : « croiser des persos à 13 PV, c'est bizarre ») : un
 * adversaire normal n'a jamais moins des trois quarts de ses PV de base (25 % à 0.111.0, 63 % en moyenne), quitte à
 * passer sous la courbe ; et il est construit avec `OPPONENT_LAG` récompenses de retard sur le champion, pour que ses PV
 * restent proches de sa base (88 % en moyenne). Mesures : docs/CAMPAGNE.md § 18.3. Le boss garde son plancher du quart.
 * Retour du 2026-10-28 (A13, premiers combats durs) : aux deux premiers nœuds, presque tous les adversaires étaient au
 * plancher, plus forts que la courbe ; leur plancher descend à `EARLY_HP_FLOOR` (environ 30 PV au plus bas), la courbe
 * ne change pas. Depuis TuningG (2026-10-28), le plancher suit la construction de l'adversaire, pas le nœud : nu (les
 * `OPPONENT_LAG` + 1 premiers nœuds, ou dépouillé de ses récompenses), `EARLY_HP_FLOOR` ; construit, `HP_FLOOR`.
 */
export const HP_FLOOR = 0.75
export const EARLY_HP_FLOOR = 0.65
export const OPPONENT_LAG = 3

/** Le plancher des PV d'un adversaire normal qui a reçu `rewards` récompenses (0 : nu) */
export const hpFloorOf = (rewards: number) => (rewards === 0 ? EARLY_HP_FLOOR : HP_FLOOR)

/**
 * Une construction de campagne tirée au hasard au nœud `node` : les récompenses de l'acte jusque-là (`REWARDS`), choisies
 * par défaut dans l'offre (le choix automatique du tournoi), sur le dé de l'aura `aura` (l'aura par défaut sans elle).
 * Le champion de référence et les adversaires sont construits ainsi.
 */
export function drawBuild(championId: string, node: number, rng: Rng, aura?: string): Pick<CampaignRun, 'forge' | 'relics'> {
  const def = startDef(championId, aura)
  let forge: ForgeStep[] = []
  const relics: string[] = []
  for (const [index, kind] of REWARDS.slice(0, node).entries()) {
    const reward = drawReward({ championId, aura, forge, relics }, kind, rng, forgesLeftIn(REWARDS, index))
    if (reward.kind === 'forge' && reward.choice) forge = withForgeStep(def, forge, reward.choice)
    if (reward.kind === 'relic' && reward.choice) relics.push(reward.choice)
  }
  return { forge, relics }
}

/**
 * Le champion de référence au nœud `node` : `REFERENCE_VARIANTS` versions du personnage nu, **parti de la même aura**
 * que le joueur (docs/MAITRISES.md § 11.3 : un départ plus faible ne rend pas la partie plus dure), qui reçoivent aux
 * mêmes moments que le joueur ses récompenses (`drawBuild`). Sans héritage : la courbe nominale ne connaît pas la
 * puissance permanente (§ 8). La graine de chaque version inclut l'aura.
 */
export function referenceChampions(championId: string, node: number, seed: number, aura = startAurasOf(championId)[0]): Character[] {
  return Array.from({ length: REFERENCE_VARIANTS }, (_, v) =>
    championOf({ championId, aura, ...drawBuild(championId, node, seededRng(hashSeed(`campagne:${seed}:${aura}:reference:${v}`)), aura) }),
  )
}

/** Part de victoires de chacun des `champions` contre `opponent`, `fights` combats chacun, côtés alternés. */
function winShare(champions: readonly Character[], opponent: Character, fights: number, key: string) {
  let wins = 0
  champions.forEach((champion, v) => {
    for (let k = 0; k < fights; k++) {
      const left = k % 2 === 0
      const r = simulateCombat(left ? [champion, opponent] : [opponent, champion], { seed: hashSeed(`${key}:${v}#${k}`) })
      if (r.winner === (left ? 0 : 1)) wins++
    }
  })
  return wins / (champions.length * fights)
}

/**
 * Les PV qui mettent les champions de référence au plus près de `target` contre cet adversaire (dichotomie : plus il a
 * de PV, moins ils gagnent ; mêmes graines à chaque essai). Entre `floor` de ses PV d'origine (le quart par défaut, le
 * boss ; `hpFloorOf` pour un adversaire normal) et `ceiling` fois (le triple ; `BOSS_HP_CEILING` pour le boss), `fights`
 * combats par champion de référence et par essai.
 */
export function tuneHp(references: readonly Character[], opponent: Character, target: number, key: string, floor = 1 / 4, ceiling = 3, fights = REFERENCE_FIGHTS): number {
  // Ses PV d'origine, sans ceux de ses récompenses : `adjusted` règle la définition, les récompenses s'y rajoutent
  const base = opponent.baseStats.maxHp - opponent.rewardHp
  const share = (hp: number) => winShare(references, opponent.adjusted({ stats: { maxHp: hp } }), fights, key)
  let lo = Math.max(1, Math.ceil(base * floor))
  let hi = base * ceiling
  let atLo = share(lo)
  let atHi = share(hi)
  if (atLo <= target) return lo
  if (atHi >= target) return hi
  while (hi - lo > 1) {
    const mid = Math.round((lo + hi) / 2)
    const at = share(mid)
    if (at > target) [lo, atLo] = [mid, at]
    else [hi, atHi] = [mid, at]
  }
  return atLo - target < target - atHi ? lo : hi
}

/** Les bandes de danger d'une rencontre (§ 6.4), contre le champion réel : le chiffre reste caché. */
export const DANGER_BANDS = [
  { id: 'safe', label: 'Sûr', min: 0.72 },
  { id: 'risky', label: 'Risqué', min: 0.5 },
  { id: 'deadly', label: 'Mortel', min: 0 },
] as const

export type DangerBand = (typeof DANGER_BANDS)[number]

export const dangerOf = (chance: number): DangerBand => DANGER_BANDS.find((b) => chance >= b.min)!

/**
 * Un adversaire normal réglé au nœud `node` : le personnage vanilla et les récompenses du nœud, `OPPONENT_LAG` de moins
 * que le champion (`drawBuild`, 0.112.0) ; ses PV le règlent sur la courbe, jamais sous son plancher (`hpFloorOf`).
 * **Le retard s'allonge au plancher** (TuningG, 2026-10-28) : quand le plancher arrête le réglage, l'adversaire est trop
 * fort pour la courbe même à ses PV les plus bas ; il rend sa dernière récompense et se règle de nouveau, jusqu'à nu.
 * Sans cette règle, un départ faible contre les adversaires construits (Plaie ouverte, Effroi, Ivresse du sang)
 * rencontrait un adversaire au plancher une fois sur deux en fin d'acte, sous la courbe : il atteignait le boss 16 à
 * 18 % du temps, contre 25 % pour les plus forts (docs/CAMPAGNE.md § 18.7), alors qu'un départ plus faible ne doit pas
 * rendre la partie plus dure (docs/MAITRISES.md § 11.3).
 */
function tunedOpponent(references: readonly Character[], id: string, node: number, key: string): Pick<Encounter, 'forge' | 'relics' | 'maxHp'> {
  const base = createCharacter(id).baseStats.maxHp
  for (let rewards = Math.max(0, node - OPPONENT_LAG); ; rewards--) {
    const build = drawBuild(id, rewards, seededRng(hashSeed(`${key}:construction`)))
    const floor = hpFloorOf(rewards)
    const maxHp = tuneHp(references, opponentBase({ characterId: id, ...build }), NORMAL_TARGETS[node], key, floor)
    if (rewards === 0 || maxHp > Math.ceil(base * floor)) return { ...build, maxHp }
  }
}

/**
 * Les rencontres du nœud en cours : deux adversaires du roster (jamais le champion, jamais le dernier adversaire),
 * ou le boss au dernier nœud. Un adversaire grandit avec l'acte (règles v2, décision de l'utilisateur, 0.105.0) et se
 * règle sur la courbe (`tunedOpponent`) ; il est ensuite estimé contre le champion réel.
 */
export function encountersFor(run: CampaignRun): Encounter[] {
  const node = run.wins
  const rng = seededRng(hashSeed(`campagne:${run.seed}:noeud:${node}`))
  const references = referenceChampions(run.championId, node, run.seed, run.aura)
  const champion = championOf(run)
  const boss = isBossNode(run)
  const last = run.fights[run.fights.length - 1]?.opponentId
  const ids = boss ? [BOSS.id] : shuffle(rng, CHARACTER_IDS.filter((id) => id !== run.championId && id !== last)).slice(0, ENCOUNTER_CHOICES)
  return ids.map((id) => {
    const key = `campagne:${run.seed}:${node}:${id}`
    const encounter: Encounter = boss
      ? { characterId: id, forge: [], relics: [], maxHp: tuneHp(references, opponentBase({ characterId: id, forge: [], relics: [] }), BOSS_TARGET, key, 1 / 4, BOSS_HP_CEILING, BOSS_REFERENCE_FIGHTS), boss: true, chance: 0 }
      : { characterId: id, ...tunedOpponent(references, id, node, key), chance: 0 }
    return { ...encounter, chance: winShare([champion], opponentOf(encounter), DANGER_FIGHTS, `${key}:danger`) }
  })
}

/** La partie avec les rencontres de son nœud en cours (calcul de quelques milliers de combats). */
export const withEncounters = (run: CampaignRun): CampaignRun => ({ ...run, encounters: encountersFor(run) })

/* ---------- Combats et récompenses ---------- */

/**
 * Reporte un combat de la rencontre `encounter` (champion à gauche) : une victoire avance d'un nœud et, contre un
 * adversaire normal, propose sa récompense (`REWARDS`, avec le choix du champion) ; une défaite, ou la victoire contre
 * le boss, termine la partie.
 */
export function withFightResult(run: CampaignRun, encounter: Encounter, result: CombatResult): CampaignRun {
  const won = result.winner === 0
  const last = result.beats[result.beats.length - 1]
  const fight: FightRecord = {
    opponentId: encounter.characterId,
    ...(encounter.boss && { boss: true as const }),
    won,
    turns: result.turns,
    hpLeft: last ? last.state.hp[0] : result.fighters[0].maxHp,
    ...(result.seed !== undefined && { seed: result.seed }),
    triggers: triggerCounts(result, 0),
  }
  const next: CampaignRun = { ...run, fights: [...run.fights, fight], encounters: undefined }
  if (!won) return { ...next, outcome: 'lost' }
  const wins = run.wins + 1
  if (encounter.boss) return { ...next, wins, outcome: 'won' }
  const rng = seededRng(hashSeed(`campagne:${run.seed}:recompense:${wins}`))
  return { ...next, wins, reward: drawReward(run, REWARDS[wins - 1], rng, forgesLeftIn(REWARDS, wins - 1)) }
}

/** Déclenchements du champion sur toute la partie (écran de fin) : la somme de ses combats. */
export const runTriggers = (run: CampaignRun) => sumTriggers(run.fights.flatMap((f) => (f.triggers ? [f.triggers] : [])))

/** Le choix du champion pour la récompense en attente, comme un gain (rien si l'offre était vide). */
export function rewardChoice(reward: PendingReward): HeritageItem | undefined {
  if (!reward.choice) return undefined
  return reward.kind === 'relic' ? { kind: 'relic', relic: reward.choice } : { kind: 'forge', step: reward.choice }
}

/** Applique la récompense choisie (une relique, ou une opération de forge) et l'ajoute aux gains de la partie. */
export function withReward(run: CampaignRun, gain: HeritageItem | undefined): CampaignRun {
  if (!gain) return { ...run, reward: undefined }
  const def = startDef(run.championId, run.aura)
  return {
    ...run,
    forge: gain.kind === 'forge' ? withForgeStep(def, run.forge, gain.step) : run.forge,
    relics: gain.kind === 'relic' ? [...run.relics, gain.relic] : run.relics,
    gains: [...run.gains, gain],
    reward: undefined,
  }
}

/* ---------- Héritage (§ 8) ---------- */

/**
 * Ce qu'une partie laisse en héritage : ses reliques gagnées, et ses opérations de forge qui valent seules sur le dé
 * d'origine de son aura (une gravure, une dorure, une copie, une compétence d'origine aiguisée). Une gravure d'une
 * compétence d'une autre maîtrise reste héritable : elle a été gagnée. Au départ suivant, `heritageFor` la revérifie sur
 * le dé de l'aura alors choisie.
 */
export function heritableGains(run: CampaignRun): HeritageItem[] {
  const def = startDef(run.championId, run.aura)
  return run.gains.filter((g) => g.kind === 'relic' || validOnOrigin(def, g.step))
}

/** Les héritages proposés au départ d'une partie : trois au plus, tirés parmi ceux du personnage. */
export const drawHeritage = (items: readonly HeritageItem[], rng: Rng) => shuffle(rng, items).slice(0, HERITAGE_CHOICES)

/* ---------- Sauvegarde ---------- */

/**
 * Partie en cours ; v5 (maîtrises, docs/MAITRISES.md § 11.2) : l'aura de départ (`aura`). Une partie v4 (0.105.0 : le
 * d6 imprimé et les adversaires construits) se relit (`fromSaved`) : l'aura par défaut, et ce qui ne vaut plus sur le
 * nouveau dé de départ (cinq dés vanilla ont changé) est retiré ; le reste est gardé. Une partie v3 ou plus ancienne est
 * oubliée.
 */
const RUN_KEY = 'battler:campaign:v5'
const RUN_KEY_V4 = 'battler:campaign:v4'
const HERITAGE_KEY = 'battler:campaign-heritage:v1'

/** Une offre de forge enregistrée avant les maîtrises : Graver portait une seule compétence (`skill`). */
type SavedForgeOffer = ForgeOffer | { op: 'engrave'; skill: CharacterEvent }

/** Une partie enregistrée : v5, ou v4 (sans aura, ses offres de Graver à une compétence). */
type SavedRun =
  | CampaignRun
  | (Omit<CampaignRun, 'version' | 'aura' | 'reward'> & {
      version: 4
      reward?: { kind: 'relic'; offer: string[]; choice?: string } | { kind: 'forge'; offer: SavedForgeOffer[]; choice?: ForgeStep }
    })

/** Le journal de forge rejoué sur un dé, sans les opérations qui n'y valent plus (une à une, dans l'ordre). */
function keptSteps(def: CharacterDef, steps: readonly ForgeStep[]): ForgeStep[] {
  let kept: ForgeStep[] = []
  for (const step of steps) {
    try {
      kept = withForgeStep(def, kept, step)
    } catch {
      /* ne vaut plus sur ce dé : retirée */
    }
  }
  return kept
}

/** Les rencontres enregistrées se reconstruisent-elles toutes (une opération retirée du jeu, Tremper l'arme, ne se rejoue plus) ? */
function replays(encounters: readonly Encounter[]) {
  try {
    encounters.forEach(opponentBase)
    return true
  } catch {
    return false
  }
}

/**
 * Relit une partie enregistrée. Une partie v4, ou dont l'aura n'est plus proposée, part de l'aura par défaut. Dans tous
 * les cas, sa forge, ses gains et son héritage gardent ce qui se joue encore en partie sur ce dé (`withForgeStep`, une à
 * une : un aiguisage du 1 ou du 2 d'un dé qui a changé, et depuis le retour du 2026-10-28 une aura gravée ou copiée,
 * une copie de la face 1, une dorure, une trempe, un rang III sont retirés), l'offre en attente garde ses opérations
 * encore offertes (le choix du champion, s'il vaut encore), et les rencontres du nœud se recalculent si la forge a
 * changé ou si elles ne se reconstruisent plus.
 */
function fromSaved(saved: SavedRun): CampaignRun {
  const current = saved.version === 5 && startAurasOf(saved.championId).includes(saved.aura)
  const aura = current ? saved.aura : startAurasOf(saved.championId)[0]
  const def = startDef(saved.championId, aura)
  const forge = keptSteps(def, saved.forge)
  // Les opérations gardées, comptées : un gain ou l'héritage en consomme une (deux aiguisages du même 6, dont le second
  // dépasse le rang II, ne laissent qu'un gain)
  const left = new Map<string, number>()
  for (const step of forge) left.set(stepKey(step), (left.get(stepKey(step)) ?? 0) + 1)
  const valid = (step: ForgeStep) => {
    const n = left.get(stepKey(step)) ?? 0
    if (n > 0) left.set(stepKey(step), n - 1)
    return n > 0
  }
  const { reward: old, encounters, heritage, ...rest } = saved
  let reward: PendingReward | undefined
  if (old?.kind === 'relic') reward = old
  if (old?.kind === 'forge') {
    const taken = new Set([...def.events, ...forge.flatMap((s) => (s.op === 'engrave' ? [s.skill] : []))].map((e) => e.id))
    const offer = old.offer.flatMap((o): ForgeOffer[] => {
      if (!OFFERED_OPS.includes(o.op)) return []
      if (o.op !== 'engrave') return [o]
      const skills = ('skill' in o ? [o.skill] : o.skills).filter((s) => !taken.has(s.id) && !isAuraSkill(s))
      return skills.length ? [{ op: 'engrave', skills }] : []
    })
    const choice = old.choice && isOffered(offer, old.choice) && keptSteps(def, [...forge, old.choice]).length > forge.length ? old.choice : undefined
    reward = { kind: 'forge', offer, ...(choice && { choice }) }
  }
  const keepEncounters = current && forge.length === saved.forge.length && encounters && replays(encounters)
  const keptHeritage = heritage && (heritage.kind === 'relic' || valid(heritage.step))
  return {
    ...rest,
    version: 5,
    aura,
    ...(keptHeritage && { heritage }),
    forge,
    gains: saved.gains.filter((g) => g.kind === 'relic' || valid(g.step)),
    ...(keepEncounters && { encounters }),
    ...(reward && { reward }),
  }
}

/**
 * La partie en cours enregistrée, ou null (aucune, ou illisible : règles changées depuis). Le champion, les adversaires
 * proposés et la forge choisie en attente se reconstruisent : ce qui ne se reconstruit plus fait oublier la partie, au
 * lieu de faire planter l'écran.
 */
export function loadRun(): CampaignRun | null {
  try {
    const raw = localStorage.getItem(RUN_KEY) ?? localStorage.getItem(RUN_KEY_V4)
    if (!raw) return null
    const saved = JSON.parse(raw) as SavedRun
    if (saved.version !== 4 && saved.version !== 5) return null
    const run = fromSaved(saved)
    championOf(run)
    run.encounters?.forEach(opponentBase)
    if (run.reward?.kind === 'forge' && run.reward.choice) withForgeStep(startDef(run.championId, run.aura), run.forge, run.reward.choice)
    // Une relique retirée du jeu (offre en attente, héritage) fait oublier la partie, au lieu de faire planter l'écran
    if (run.reward?.kind === 'relic') run.reward.offer.forEach(getRelic)
    if (run.heritage?.kind === 'relic') getRelic(run.heritage.relic)
    return run
  } catch {
    return null
  }
}

export function saveRun(run: CampaignRun | null) {
  try {
    // La partie v4 relue est désormais en v5 : l'ancienne clé ne doit plus la faire revenir
    localStorage.removeItem(RUN_KEY_V4)
    if (run) localStorage.setItem(RUN_KEY, JSON.stringify(run))
    else localStorage.removeItem(RUN_KEY)
  } catch {
    /* stockage plein ou indisponible : la partie reste en mémoire pour la session */
  }
}

/**
 * Les héritages de chaque personnage : les gains de sa dernière partie qui a rapporté quelque chose. Une opération de
 * forge qui ne vaut plus sur aucun de ses dés de départ (une compétence d'origine aiguisée qui a quitté le dé) est
 * écartée ; celle qui ne vaut que sur le dé d'une autre aura reste, et `heritageFor` la trie au départ, sur le dé de
 * l'aura choisie (docs/MAITRISES.md § 11.2).
 */
export function loadHeritage(): Record<string, HeritageItem[]> {
  try {
    const raw = localStorage.getItem(HERITAGE_KEY)
    const saved = raw ? (JSON.parse(raw) as Record<string, HeritageItem[]>) : {}
    return Object.fromEntries(
      Object.entries(saved)
        .filter(([id]) => CHARACTER_IDS.includes(id))
        .map(([id, items]) => {
          const dice = startAurasOf(id).map((aura) => startDef(id, aura))
          return [id, items.filter((g) => (g.kind === 'relic' ? RELIC_IDS.includes(g.relic) : dice.some((def) => validOnOrigin(def, g.step))))]
        }),
    )
  } catch {
    return {}
  }
}

/**
 * Enregistre l'héritage d'une partie terminée : ses gains héritables remplacent ceux du personnage ; une partie sans
 * gain n'efface rien (décision du 2026-10-22).
 */
export function recordHeritage(run: CampaignRun) {
  const items = heritableGains(run)
  if (!items.length) return
  try {
    localStorage.setItem(HERITAGE_KEY, JSON.stringify({ ...loadHeritage(), [run.championId]: items }))
  } catch {
    /* stockage indisponible : pas d'héritage pour cette fois */
  }
}

/**
 * Les choix de départ mémorisés par champion (écran de choix, retour du 2026-10-27) : l'interrupteur « Activer
 * l'héritage » (actif tant qu'on ne l'a pas coupé ; il ne touche pas au calcul de l'héritage : coupé, la partie part
 * sans), et l'aura de départ (`aura`, maîtrises V3, docs/MAITRISES.md § 11.2 : absente, ou qui n'est plus une de ses
 * `auras`, l'écran retombe sur la première).
 */
export interface CampaignChoice {
  heritage: boolean
  aura?: string
}

const CHOICES_KEY = 'battler:campaign-choices:v1'

export function loadCampaignChoices(): Record<string, CampaignChoice> {
  try {
    const raw = localStorage.getItem(CHOICES_KEY)
    return raw ? (JSON.parse(raw) as Record<string, CampaignChoice>) : {}
  } catch {
    return {}
  }
}

/** Mémorise les choix d'un champion (fusionnés avec ceux déjà enregistrés pour lui). */
export function saveCampaignChoice(championId: string, choice: Partial<CampaignChoice>) {
  const all = loadCampaignChoices()
  try {
    localStorage.setItem(CHOICES_KEY, JSON.stringify({ ...all, [championId]: { ...(all[championId] ?? { heritage: true }), ...choice } }))
  } catch {
    /* stockage indisponible : le choix vaut pour la session */
  }
}
