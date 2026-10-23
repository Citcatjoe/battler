import { hashSeed } from './analysis'
import { Character, type CharacterDef } from './character'
import { simulateCombat, type CombatResult } from './combat'
import { autoForge, drawForgeOffer, validOnOrigin, withForgeStep, type ForgeOffer, type ForgeStep } from './forge'
import { buildHooks, echoOf, eventHooks, relicHooks } from './hooks'
import { autoPick, drawOffer, FORGE_RELIC_IDS, getRelic } from './relics'
import { pick, seededRng, shuffle, type Rng } from './rng'
import { CHARACTER_IDS, createCharacter, ENGRAVABLE_SKILLS, repertoireOf, ROSTER } from './roster'

/*
 * Campagne (0.88.0, prototype de docs/CAMPAGNE.md ; acte resserré en 0.89.0) : un champion tiré parmi trois mène un
 * acte de six nœuds, cinq combats normaux puis le boss. Les combats restent automatiques ; le joueur choisit son
 * adversaire à chaque nœud (deux propositions, avec leur bande de danger), et chaque combat normal gagné rapporte une
 * récompense, tour à tour une relique et une forge du dé : trois reliques et deux forges dans l'acte. Une défaite met
 * fin à la partie ; la victoire contre le boss aussi. Toute partie qui a rapporté quelque chose laisse un héritage au
 * même personnage (docs/CAMPAGNE.md § 8).
 *
 * Réglage (§ 6.3) : chaque adversaire est réglé par simulation sur une courbe nominale montante, contre un « champion
 * de référence » (le même personnage, forgé et équipé au hasard au même rythme), pas contre le champion réel : un
 * champion bien construit dépasse la courbe et écrase, un champion mal construit souffre. Le levier est le seul nombre
 * de PV de l'adversaire. Les bandes de danger, elles, se calculent contre le champion réel ; les chiffres restent cachés.
 */

/** Combats normaux d'un acte, avant le boss (décision de l'utilisateur, 2026-10-22 : trois reliques et deux forges). */
export const ACT_FIGHTS = 5

/** Nœuds d'un acte : les combats normaux, puis le boss. */
export const ACT_LENGTH = ACT_FIGHTS + 1

export type RewardKind = 'relic' | 'forge'

/** La récompense de chaque combat normal gagné, dans l'ordre : relique, forge, relique, forge, relique. */
export const REWARDS: readonly RewardKind[] = ['relic', 'forge', 'relic', 'forge', 'relic']

/** Champions proposés au départ d'une campagne. */
export const CHAMPION_CHOICES = 3

/** Adversaires proposés à chaque nœud de combat normal. */
export const ENCOUNTER_CHOICES = 2

/** Héritages proposés au départ, tirés parmi les gains de la dernière partie du personnage. */
export const HERITAGE_CHOICES = 3

/**
 * Courbe nominale montante (§ 18.3, recommandation retenue le 2026-10-22) : la victoire visée du champion de référence
 * à chaque combat normal, de la démonstration (95 %) à la tension (81 %), puis le drame du boss (45 %). Produit des
 * cinq : 51 % des champions de référence atteignent le boss, 23 % gagnent l'acte.
 */
export const NORMAL_TARGETS: readonly number[] = [0.95, 0.9, 0.87, 0.84, 0.81]
export const BOSS_TARGET = 0.45

/* ---------- Le boss ---------- */

const rosterDef = (id: string) => ROSTER.find((c) => c.id === id)!
const rosterSkill = (id: string) => ROSTER.flatMap((c) => c.events).find((e) => e.id === id)!

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
  stats: { maxHp: 70, damageDie: 12, armor: 0, dodgeChance: 0.04, critChance: 0.08, critMultiplier: 2 },
  look: { ...rosterDef('morgrut').look, tint: 'brightness(0.72) sepia(0.35) hue-rotate(-20deg) saturate(1.4)' },
  lore: {
    tagline: 'Personne ne l’a jamais vu tomber. Personne ne l’a jamais vu de près, non plus.',
    background:
      "Le Colosse règne sur l'arène depuis plus longtemps que ses gradins. De chaque champion qu'il a brisé, il a gardé une technique et un trophée ; son couperet porte l'or de ceux qui l'ont payé pour perdre.",
    strengths: ['Trois techniques volées', 'Deux trophées', 'Un couperet doré'],
    weaknesses: ['Lent à s’échauffer', 'Peu d’esquive'],
  },
  events: [
    { ...rosterSkill('stoneskin'), trigger: 'naturalOne' },
    { ...rosterSkill('cleave'), trigger: 'naturalTwo' },
    { ...rosterSkill('intimidation-aura'), trigger: 'naturalThree' },
  ],
  relics: [getRelic('mercenary-mail'), getRelic('wolf-fang')],
  forge: [
    { op: 'gild', face: 12 },
    { op: 'gild', face: 11 },
  ],
}

/** Un combattant de campagne par son id : un personnage du roster, ou le boss. */
export const campaignCharacter = (id: string) => (id === BOSS.id ? new Character(BOSS) : createCharacter(id))

/* ---------- La partie ---------- */

/** Un héritage : une relique, ou une opération de forge sur une face du dé d'origine. */
export type HeritageItem = { kind: 'relic'; relic: string } | { kind: 'forge'; step: ForgeStep }

/** Une rencontre proposée : un adversaire réglé (ses PV), et la chance cachée du champion réel. */
export interface Encounter {
  characterId: string
  /** PV de base réglés par simulation sur la courbe nominale */
  maxHp: number
  boss?: true
  /** Victoire du champion réel, estimée par simulation : seule sa bande (`dangerOf`) s'affiche */
  chance: number
}

/** La récompense en attente après un combat normal gagné : une relique ou une forge, l'offre, et le choix du champion. */
export type PendingReward =
  | { kind: 'relic'; offer: string[]; /** choix du champion (au hasard dans l'offre), modifiable */ choice?: string }
  | { kind: 'forge'; offer: ForgeOffer[]; choice?: ForgeStep }

export interface FightRecord {
  opponentId: string
  boss?: true
  won: boolean
  turns: number
  hpLeft: number
  seed?: number
}

export interface CampaignRun {
  version: 2
  /** Graine de la partie : rencontres, réglages, offres et choix par défaut en dérivent */
  seed: number
  championId: string
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

/** Le champion tel qu'il est maintenant : son personnage, son dé forgé, ses reliques. */
export function championOf(run: Pick<CampaignRun, 'championId' | 'forge' | 'relics'>): Character {
  return createCharacter(run.championId).withForge(run.forge).withRelics(run.relics.map(getRelic))
}

/** L'adversaire d'une rencontre, à ses PV réglés. */
export function opponentOf(encounter: Encounter): Character {
  return campaignCharacter(encounter.characterId).adjusted({ stats: { maxHp: encounter.maxHp } })
}

/** Le nœud en cours (0 à 5) ; le dernier est le boss. */
export const isBossNode = (run: CampaignRun) => run.wins === ACT_FIGHTS

/** Les champions proposés au départ : trois personnages différents, au hasard. */
export const drawChampions = (rng: Rng) => shuffle(rng, CHARACTER_IDS).slice(0, CHAMPION_CHOICES)

/** Commence une partie : le champion, et son héritage s'il en a choisi un. */
export function startRun(championId: string, seed: number, heritage?: HeritageItem): CampaignRun {
  const def = createCharacter(championId).definition
  return {
    version: 2,
    seed,
    championId,
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
/** Combats simulés pour estimer la chance du champion réel (bande de danger). */
const DANGER_FIGHTS = 160

/**
 * Le champion de référence au nœud `node` : `REFERENCE_VARIANTS` versions du personnage nu, qui reçoivent aux mêmes
 * moments que le joueur ses récompenses (`REWARDS`), choisies au hasard dans l'offre (le choix automatique du tournoi).
 * Sans héritage : la courbe nominale ne connaît pas la puissance permanente (§ 8).
 */
export function referenceChampions(championId: string, node: number, seed: number): Character[] {
  const def = createCharacter(championId).definition
  return Array.from({ length: REFERENCE_VARIANTS }, (_, v) => {
    const rng = seededRng(hashSeed(`campagne:${seed}:reference:${v}`))
    let forge: ForgeStep[] = []
    const relics: string[] = []
    for (const kind of REWARDS.slice(0, node)) {
      const reward = drawReward({ championId, forge, relics }, kind, rng)
      if (reward.kind === 'forge' && reward.choice) forge = withForgeStep(def, forge, reward.choice)
      if (reward.kind === 'relic' && reward.choice) relics.push(reward.choice)
    }
    return championOf({ championId, forge, relics })
  })
}

/** Poids d'une brique dans l'offre orientée : 1, plus `ECHO_WEIGHT` par accroche qui la relie au build (docs/PROGRESSION.md § 13.2). */
export const ECHO_WEIGHT = 2

/**
 * La récompense d'un nœud, la même pour le joueur et le champion de référence (règles v2, phase 2, offre orientée) :
 * - forge : Graver est toujours proposée, sa compétence tirée dans le **répertoire** du champion (`repertoireOf` ; tout
 *   le roster gravable une fois son répertoire épuisé), au poids de son écho avec le build ;
 * - relique : la première carte au poids de son écho, les deux autres libres.
 * Le choix par défaut reste au hasard dans l'offre.
 */
export function drawReward(run: Pick<CampaignRun, 'championId' | 'forge' | 'relics'>, kind: RewardKind, rng: Rng): PendingReward {
  const build = buildHooks(championOf(run))
  if (kind === 'relic') {
    const offer = drawOffer(run.relics, rng, FORGE_RELIC_IDS, (id) => 1 + ECHO_WEIGHT * echoOf(relicHooks(getRelic(id)), build))
    const choice = autoPick(offer, rng)
    return { kind: 'relic', offer, ...(choice && { choice }) }
  }
  const def = createCharacter(run.championId).definition
  const left = repertoireOf(run.championId).filter((s) => !run.forge.some((f) => f.op === 'engrave' && f.skill.id === s.id))
  const offer = drawForgeOffer(def, run.forge, rng, left.length ? left : ENGRAVABLE_SKILLS, (s) => 1 + ECHO_WEIGHT * echoOf(eventHooks(s), build))
  const choice = autoForge(def, run.forge, offer, rng)
  return { kind: 'forge', offer, ...(choice && { choice }) }
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
 * de PV, moins ils gagnent ; mêmes graines à chaque essai). Entre le quart et le triple de ses PV d'origine.
 */
export function tuneHp(references: readonly Character[], opponent: Character, target: number, key: string): number {
  const base = opponent.baseStats.maxHp
  const share = (hp: number) => winShare(references, opponent.adjusted({ stats: { maxHp: hp } }), REFERENCE_FIGHTS, key)
  let lo = Math.max(1, Math.round(base / 4))
  let hi = base * 3
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
 * Les rencontres du nœud en cours : deux adversaires du roster (jamais le champion, jamais le dernier adversaire),
 * ou le boss au dernier nœud ; chacun réglé sur la courbe, puis estimé contre le champion réel.
 */
export function encountersFor(run: CampaignRun): Encounter[] {
  const node = run.wins
  const rng = seededRng(hashSeed(`campagne:${run.seed}:noeud:${node}`))
  const references = referenceChampions(run.championId, node, run.seed)
  const champion = championOf(run)
  const boss = isBossNode(run)
  const last = run.fights[run.fights.length - 1]?.opponentId
  const ids = boss ? [BOSS.id] : shuffle(rng, CHARACTER_IDS.filter((id) => id !== run.championId && id !== last)).slice(0, ENCOUNTER_CHOICES)
  return ids.map((id) => {
    const key = `campagne:${run.seed}:${node}:${id}`
    const maxHp = tuneHp(references, campaignCharacter(id), boss ? BOSS_TARGET : NORMAL_TARGETS[node], key)
    const encounter: Encounter = { characterId: id, maxHp, ...(boss && { boss: true as const }), chance: 0 }
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
  }
  const next: CampaignRun = { ...run, fights: [...run.fights, fight], encounters: undefined }
  if (!won) return { ...next, outcome: 'lost' }
  const wins = run.wins + 1
  if (encounter.boss) return { ...next, wins, outcome: 'won' }
  const rng = seededRng(hashSeed(`campagne:${run.seed}:recompense:${wins}`))
  return { ...next, wins, reward: drawReward(run, REWARDS[wins - 1], rng) }
}

/** Le choix du champion pour la récompense en attente, comme un gain (rien si l'offre était vide). */
export function rewardChoice(reward: PendingReward): HeritageItem | undefined {
  if (!reward.choice) return undefined
  return reward.kind === 'relic' ? { kind: 'relic', relic: reward.choice } : { kind: 'forge', step: reward.choice }
}

/** Applique la récompense choisie (une relique, ou une opération de forge) et l'ajoute aux gains de la partie. */
export function withReward(run: CampaignRun, gain: HeritageItem | undefined): CampaignRun {
  if (!gain) return { ...run, reward: undefined }
  const def = createCharacter(run.championId).definition
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
 * Ce qu'une partie laisse en héritage : ses reliques gagnées, et ses opérations sur une face du dé d'origine qui valent
 * seules (une gravure, une dorure, une compétence d'origine aiguisée). Agrandir et Retailler ne s'héritent pas.
 */
export function heritableGains(run: CampaignRun): HeritageItem[] {
  const def = createCharacter(run.championId).definition
  return run.gains.filter((g) => g.kind === 'relic' || (g.step.op !== 'enlarge' && g.step.op !== 'trim' && validOnOrigin(def, g.step)))
}

/** Les héritages proposés au départ d'une partie : trois au plus, tirés parmi ceux du personnage. */
export const drawHeritage = (items: readonly HeritageItem[], rng: Rng) => shuffle(rng, items).slice(0, HERITAGE_CHOICES)

/** Le choix du champion parmi les héritages proposés, quand personne ne choisit pour lui. */
export const autoHeritage = (offer: readonly HeritageItem[], rng: Rng) => (offer.length ? pick(rng, offer) : undefined)

/* ---------- Sauvegarde ---------- */

/** Partie en cours ; v2 (0.89.0) : acte de cinq combats, une récompense par victoire (une partie v1 est oubliée) */
const RUN_KEY = 'battler:campaign:v2'
const HERITAGE_KEY = 'battler:campaign-heritage:v1'

/** La partie en cours enregistrée, ou null (aucune, ou illisible : règles changées depuis). */
export function loadRun(): CampaignRun | null {
  try {
    const raw = localStorage.getItem(RUN_KEY)
    if (!raw) return null
    const run = JSON.parse(raw) as CampaignRun
    if (run.version !== 2) return null
    championOf(run)
    return run
  } catch {
    return null
  }
}

export function saveRun(run: CampaignRun | null) {
  try {
    if (run) localStorage.setItem(RUN_KEY, JSON.stringify(run))
    else localStorage.removeItem(RUN_KEY)
  } catch {
    /* stockage plein ou indisponible : la partie reste en mémoire pour la session */
  }
}

/** Les héritages de chaque personnage : les gains de sa dernière partie qui a rapporté quelque chose. */
export function loadHeritage(): Record<string, HeritageItem[]> {
  try {
    const raw = localStorage.getItem(HERITAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, HeritageItem[]>) : {}
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
