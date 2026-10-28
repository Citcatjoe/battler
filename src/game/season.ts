import type { Character } from './character'
import { simulateCombat, finalState, type CombatResult, type Pair, type Side } from './combat'
import { isOffered, withForgeStep, type ForgeOffer, type ForgeStep } from './forge'
import { drawReward, forgesLeftIn, REWARDS, type RewardKind } from './offers'
import { getRelic } from './relics'
import { seededRng } from './rng'
import { addReport, combatReport, emptyReport, type CombatReport, type FighterReport } from './report'
import { CHARACTER_IDS, createCharacter } from './roster'
import { computeStats } from './stats'
import { drawStartAuras, entrantAura, entrantCharacter, fighterKey, fillSlots, labelEntrants, SLOTS, type Build, type Entrant, type MatchStatus, type Tournament } from './tournament'

/*
 * Phase de saison (0.86.0), facultative, avant l'arbre du tournoi : un championnat aller-retour à 20, 24 ou
 * 32 participants. Chacun rencontre chacun deux fois, camps inversés au retour, en journées (tableau
 * circulaire de Berger : chaque participant joue une fois par journée). Victoire 3 points, défaite 0 : le
 * moteur ne produit jamais de nul (la limite de tours désigne aussi un vainqueur). Les 16 premiers du
 * classement entrent dans l'arbre, placés en têtes de série.
 *
 * Construction (0.92.0, demandes de l'utilisateur du 2026-10-22 ; rythme de la 0.115.0, choisi par l'agent sur mesure,
 * docs/FEATURES.md § 8) : avec les reliques ou la forge du dé, chaque participant reçoit une récompense à **chacun de ses
 * premiers matchs, gagné ou perdu**, dans l'ordre d'un acte de campagne (`REWARDS` : forge, relique, forge, relique…,
 * cinq forges et cinq reliques depuis le 2026-10-28), offerte comme en campagne (offers.ts : offre pertinente, orientée
 * par l'écho ; le dé complet au dernier forgeage). Au
 * soir de la journée 10, tous portent un build d'acte complet ; il se fige alors jusqu'à la fin de la saison et dans
 * l'arbre, qui n'en donne plus. Ni pari pendant la saison.
 *
 * Chaque combat a sa graine, dérivée de celle de la saison et du numéro du match, et la récompense aussi : toute la
 * saison se rejoue à l'identique. Seul un bilan compact de chaque match est gardé, jamais sa chronologie.
 */

export const SEASON_SIZES = [20, 24, 32] as const
export type SeasonSize = (typeof SEASON_SIZES)[number]
export const DEFAULT_SEASON_SIZE: SeasonSize = 24

export const WIN_POINTS = 3

/**
 * Les récompenses d'un participant, une par match dès son premier : l'ordre d'un acte de campagne (`REWARDS`), réduit
 * aux sortes activées. Dix avec les deux (cinq forges, cinq reliques), cinq reliques seules, cinq forges seules,
 * aucune sans.
 */
export function buildRewards({ relics, forge }: { relics: boolean; forge: boolean }): RewardKind[] {
  return REWARDS.filter((k) => (k === 'relic' ? relics : forge))
}

/**
 * Têtes de série des huitièmes, dans l'ordre de l'arbre : le match i oppose les rangs `BRACKET_SEEDS[2i]` et
 * `BRACKET_SEEDS[2i + 1]`. Le 1er et le 2e sont dans deux moitiés : ils ne peuvent se croiser qu'en finale.
 */
export const BRACKET_SEEDS = [1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15] as const

/** Une rencontre du calendrier. `home` joue à gauche (côté 0), `away` à droite (côté 1). */
export interface Fixture {
  /** Journée, de 0 à 2(n−1)−1 : les n−1 premières sont l'aller, les suivantes le retour */
  day: number
  /** Place dans la journée */
  index: number
  /** Numéro du match dans la saison (clé de son résultat et de sa graine) */
  number: number
  home: number
  away: number
}

/** Récompense d'un participant qui se construit encore : l'offre, et son choix (au hasard, modifiable). */
export type SeasonReward = { kind: 'relic'; offer: string[]; chosen: string } | { kind: 'forge'; offer: ForgeOffer[]; chosen: ForgeStep }

/** Bilan compact d'un match de saison : de quoi tenir le classement et rejouer le combat (`seed`). */
export interface SeasonResult {
  /** Côté vainqueur : 0 = `home`, 1 = `away` */
  winner: Side
  turns: number
  /** PV restants de chaque côté */
  hpLeft: Pair<number>
  /**
   * Dégâts infligés par chaque côté : ses coups qui touchent + les dégâts d'effets subis par l'adversaire
   * (même compte que le bilan du champion, `championRun`).
   */
  damage: Pair<number>
  seed: number
  mode: CombatResult['mode']
  /**
   * Journée de construction : la récompense de chaque côté (0 = `home`, 1 = `away`), gagnant comme perdant ; `null` pour
   * un côté déjà complet, ou dont l'offre était vide. Absente quand aucun des deux ne se construit plus.
   */
  rewards?: Pair<SeasonReward | null>
  /**
   * Rapport du combat (report.ts) : reliques déclenchées et faces jouées de chaque côté. Absent des matchs enregistrés
   * avant la 0.92 (le rapport de saison les ignore).
   */
  report?: CombatReport
}

export interface Season {
  /** Les participants, dans l'ordre de tirage (dernier critère de départage) */
  entrants: Entrant[]
  /** Graine de la saison : celle de chaque match en dérive */
  seed: number
  /** Résultats par numéro de match */
  results: Record<number, SeasonResult>
  /** Récompenses de chaque participant, une par match dans l'ordre (`buildRewards`) ; vide : personne ne construit */
  rewards: RewardKind[]
}

export interface Standing {
  /** Index du participant dans `Season.entrants` */
  entrant: number
  played: number
  wins: number
  losses: number
  points: number
  damageFor: number
  damageAgainst: number
  /** Différence de PV : dégâts infligés − dégâts subis */
  diff: number
}

const schedules = new Map<number, Fixture[][]>()

/**
 * Calendrier aller-retour de `n` participants (n pair) : 2(n−1) journées de n/2 matchs. Méthode du tableau
 * circulaire : le dernier participant reste fixe, les autres tournent d'un cran à chaque journée. Le retour
 * reprend l'aller, journée par journée, camps inversés.
 */
export function seasonSchedule(n: number): Fixture[][] {
  const cached = schedules.get(n)
  if (cached) return cached
  if (n < 2 || n % 2) throw new Error(`Une saison se joue à un nombre pair de participants (${n})`)
  const half = n / 2
  const first: Pair<number>[][] = []
  for (let r = 0; r < n - 1; r++) {
    const circle = [n - 1, ...Array.from({ length: n - 1 }, (_, i) => (i + r) % (n - 1))]
    const day: Pair<number>[] = []
    for (let i = 0; i < half; i++) {
      const a = circle[i]
      const b = circle[n - 1 - i]
      // Alterne les camps (le participant fixe change de côté à chaque journée)
      day.push((i === 0 ? r % 2 === 1 : i % 2 === 1) ? [b, a] : [a, b])
    }
    first.push(day)
  }
  const days = [...first, ...first.map((day) => day.map(([a, b]): Pair<number> => [b, a]))]
  const schedule = days.map((day, d) => day.map(([home, away], index) => ({ day: d, index, number: d * half + index, home, away })))
  schedules.set(n, schedule)
  return schedule
}

export const seasonFixtures = (season: Season) => seasonSchedule(season.entrants.length).flat()
export const matchCount = (season: Season) => season.entrants.length * (season.entrants.length - 1)
export const playedCount = (season: Season) => Object.keys(season.results).length
export const seasonDone = (season: Season) => playedCount(season) === matchCount(season)

/** Journée en cours : la première qui a encore un match à jouer (null quand la saison est finie). */
export function currentDay(season: Season): number | null {
  const day = seasonSchedule(season.entrants.length).find((d) => d.some((f) => !season.results[f.number]))
  return day ? day[0].day : null
}

/** Phase de saison en cours : le tournoi en a une, et son arbre n'est pas encore tiré. */
export const inSeason = (t: Tournament): t is Tournament & { season: Season } => !!t.season && t.entrants.length === 0

/**
 * Tire les participants d'une saison au lancement : le roster équilibré (`fillSlots`, chaque personnage autant de fois
 * que possible, 2 ou 3 fois sur 20 et 24, 3 ou 4 sur 32), dans l'ordre de tirage. Ils ne se placent pas à la main : on
 * les découvre sur l'écran de saison. Tirés à la graine de la saison, sur un hasard à part : toute la saison se rejoue.
 */
export function drawSeasonParticipants(size: SeasonSize, seed: number): string[] {
  return fillSlots(Array(size).fill(null), CHARACTER_IDS, seededRng((seed ^ 0x74697261) | 0))
}

/**
 * Crée un tournoi qui commence par une saison. `participants` : ids des personnages, dans l'ordre de tirage ;
 * `seed` : graine de la saison (tirée par l'appelant). `relics`, `forge` : les récompenses des journées de
 * construction (`buildRewards`). Chacun reçoit son aura de départ au lancement (`drawStartAuras`, retour du 2026-10-27,
 * B7), tirée à la graine de la saison sur un hasard à part : elle tient toute la saison, puis dans l'arbre, car sa
 * forge se construit sur ce dé.
 */
export function createSeasonTournament(
  participants: string[],
  nameOf: (id: string) => string,
  { relics = true, forge = false, seed, uniqueNames = false }: { relics?: boolean; forge?: boolean; seed: number; uniqueNames?: boolean },
): Tournament {
  if (!(SEASON_SIZES as readonly number[]).includes(participants.length))
    throw new Error(`Une saison compte ${SEASON_SIZES.join(', ')} participants (${participants.length})`)
  // Noms uniques et auras : tirés à la graine de la saison, chacun sur un hasard à part de celui des matchs
  const labeled = labelEntrants(participants, nameOf, uniqueNames ? seededRng((seed ^ 0x6e6f6d73) | 0) : undefined)
  const entrants = drawStartAuras(labeled, seededRng((seed ^ 0x61757261) | 0))
  return { entrants: [], results: {}, relics, season: { entrants, seed: seed >>> 0, results: {}, rewards: buildRewards({ relics, forge }) } }
}

/** Graine d'un match de saison, dérivée de la graine de la saison et du numéro du match. */
export function seasonMatchSeed(season: Season, number: number): number {
  return Math.floor(seededRng((season.seed ^ Math.imul(number + 1, 0x9e3779b1)) | 0)() * 4294967296) >>> 0
}

const fixtureOf = (season: Season, number: number): Fixture => {
  const half = season.entrants.length / 2
  const f = seasonSchedule(season.entrants.length)[Math.floor(number / half)]?.[number % half]
  if (!f || number < 0) throw new Error(`Match de saison ${number} inconnu`)
  return f
}

const involves = (f: Fixture, entrant: number) => f.home === entrant || f.away === entrant

/**
 * Ce qu'un participant a construit avant la journée `beforeDay` (toute la saison par défaut) : les récompenses de ses
 * matchs, dans l'ordre. Elle se déduit des résultats : rien d'autre ne la stocke.
 */
export function buildOf(season: Season, entrant: number, beforeDay = Infinity): Build {
  const build: Build = { relics: [], forge: [] }
  for (const day of seasonSchedule(season.entrants.length).slice(0, beforeDay)) {
    if (buildDone(season, build)) break
    const f = day.find((g) => involves(g, entrant))!
    const reward = season.results[f.number]?.rewards?.[f.home === entrant ? 0 : 1]
    if (!reward) continue
    if (reward.kind === 'relic') build.relics.push(reward.chosen)
    else build.forge.push(reward.chosen)
  }
  return build
}

/** Une construction est-elle complète (toutes les récompenses de la saison reçues) ? Alors elle est figée. */
export const buildDone = (season: Season, build: Build) => build.relics.length + build.forge.length >= season.rewards.length

/**
 * État d'un match de saison. Il n'est prêt que si la construction de ses deux participants à cette journée est connue :
 * chacun a joué tous ses matchs précédents, ou sa construction était déjà complète avant le premier qu'il n'a pas joué.
 * Un participant figé joue donc dans l'ordre qu'on veut.
 */
export function seasonStatus(season: Season, number: number): MatchStatus {
  if (season.results[number]) return 'done'
  const f = fixtureOf(season, number)
  const days = seasonSchedule(season.entrants.length)
  const known = (entrant: number) => {
    const gap = days.slice(0, f.day).findIndex((day) => !season.results[day.find((g) => involves(g, entrant))!.number])
    return gap < 0 || buildDone(season, buildOf(season, entrant, gap))
  }
  return known(f.home) && known(f.away) ? 'ready' : 'pending'
}

/** Les deux combattants d'un match de saison, sous leur nom de tournoi, partis de leur aura de départ, avec leur construction à cette journée. */
export function seasonFighters(season: Season, number: number): Pair<Character> {
  const { home, away, day } = fixtureOf(season, number)
  const make = (i: number) => {
    const { relics, forge } = buildOf(season, i, day)
    return entrantCharacter(season.entrants[i]).withForge(forge).withRelics(relics.map(getRelic))
  }
  return [make(home), make(away)]
}

/**
 * La récompense d'un participant qui n'a pas fini sa construction, gagnant ou perdant : la suivante de `Season.rewards`,
 * tirée comme en campagne (`drawReward`, offers.ts : reliques et compétences à sa portée, la première carte à l'écho de
 * son build), et son choix, au hasard. Tirée à la graine du match et du côté : regardé ou simulé, même récompense.
 */
function seasonReward(season: Season, number: number, side: Side): SeasonReward | null {
  const f = fixtureOf(season, number)
  const entrant = side === 0 ? f.home : f.away
  const build = buildOf(season, entrant, f.day)
  if (buildDone(season, build)) return null
  const index = build.relics.length + build.forge.length
  const rng = seededRng((seasonMatchSeed(season, number) ^ (side === 0 ? 0x72657764 : 0x70657264)) | 0)
  const e = season.entrants[entrant]
  const drawn = drawReward({ championId: e.characterId, aura: entrantAura(e), ...build }, season.rewards[index], rng, forgesLeftIn(season.rewards, index))
  if (drawn.kind === 'relic') return drawn.choice ? { kind: 'relic', offer: drawn.offer, chosen: drawn.choice } : null
  return drawn.choice ? { kind: 'forge', offer: drawn.offer, chosen: drawn.choice } : null
}

/**
 * Enregistre l'issue d'un match de saison (renvoie un nouveau tournoi) : son bilan compact et la récompense de chaque
 * côté qui se construit encore. Refuse un match déjà joué ou pas encore prêt (`seasonStatus`), hors
 * saison, ou un combat dont les combattants (personnages, reliques, forge) ne sont pas ceux du match : l'appelant
 * ne doit alors rien enregistrer.
 */
export function withSeasonResult(t: Tournament, number: number, result: CombatResult): Tournament {
  if (!inSeason(t)) throw new Error('Pas de saison en cours')
  const { season } = t
  const status = seasonStatus(season, number)
  if (status === 'done') throw new Error(`Match de saison ${number} déjà joué`)
  if (status === 'pending') throw new Error(`Match de saison ${number} pas encore prêt : ses participants n'ont pas fini leur construction`)
  const expected = seasonFighters(season, number).map(fighterKey)
  const actual = result.fighters.map(fighterKey)
  if (actual[0] !== expected[0] || actual[1] !== expected[1]) throw new Error(`Le combat ne correspond pas au match de saison ${number}`)
  const stats = computeStats(result)
  const hp = finalState(result).hp
  const rewards: Pair<SeasonReward | null> = [seasonReward(season, number, 0), seasonReward(season, number, 1)]
  const compact: SeasonResult = {
    winner: result.winner,
    turns: result.turns,
    hpLeft: [hp[0], hp[1]],
    damage: [stats[0].totalDamage + stats[1].effectDamageTaken, stats[1].totalDamage + stats[0].effectDamageTaken],
    seed: result.seed ?? seasonMatchSeed(season, number),
    mode: result.mode,
    ...((rewards[0] || rewards[1]) && { rewards }),
    report: combatReport(result),
  }
  return { ...t, season: { ...season, results: { ...season.results, [number]: compact } } }
}

/**
 * L'observateur change le choix d'un côté (`side`) d'un match à récompense (écran de fin) : une relique de l'offre, ou
 * une opération de l'offre sur une face qu'elle peut viser. Refusé si ce participant a déjà joué un match suivant : il
 * s'est battu avec l'autre.
 */
export function chooseSeasonReward(t: Tournament, number: number, side: Side, choice: string | ForgeStep): Tournament {
  if (!inSeason(t)) throw new Error('Pas de saison en cours')
  const { season } = t
  const r = season.results[number]
  const current = r?.rewards?.[side]
  if (!r?.rewards || !current) throw new Error(`Aucune récompense de ce côté au match de saison ${number}`)
  const f = fixtureOf(season, number)
  const entrant = side === 0 ? f.home : f.away
  const later = seasonFixtures(season).filter((g) => g.day > f.day && involves(g, entrant))
  if (later.some((g) => season.results[g.number])) throw new Error(`Ce participant du match ${number} a déjà rejoué : sa récompense ne change plus`)
  let reward: SeasonReward
  if (current.kind === 'relic') {
    if (typeof choice !== 'string' || !current.offer.includes(choice)) throw new Error(`Relique non proposée au match de saison ${number}`)
    reward = { ...current, chosen: choice }
  } else {
    if (typeof choice === 'string' || !isOffered(current.offer, choice)) throw new Error(`Opération non proposée au match de saison ${number}`)
    // La face doit être de celles que l'opération peut viser sur son dé de ce jour-là (erreur sinon)
    withForgeStep(entrantCharacter(season.entrants[entrant]).definition, buildOf(season, entrant, f.day).forge, choice)
    reward = { ...current, chosen: choice }
  }
  const rewards: Pair<SeasonReward | null> = side === 0 ? [reward, r.rewards[1]] : [r.rewards[0], reward]
  return { ...t, season: { ...season, results: { ...season.results, [number]: { ...r, rewards } } } }
}

/**
 * Simule des matchs de saison avec leur graine. Rien d'autre : ni trace dans `logs/combats/`, ni historique
 * (des centaines de combats par tournoi fausseraient les statistiques).
 */
export function simulateSeasonMatches(t: Tournament, numbers: readonly number[]): Tournament {
  let next = t
  for (const number of numbers) {
    if (!inSeason(next)) break
    const result = simulateCombat(seasonFighters(next.season, number), { seed: seasonMatchSeed(next.season, number) })
    next = withSeasonResult(next, number, result)
  }
  return next
}

/** Matchs pas encore joués d'une journée. */
export const pendingOfDay = (season: Season, day: number) =>
  (seasonSchedule(season.entrants.length)[day] ?? []).filter((f) => !season.results[f.number]).map((f) => f.number)

/**
 * Le prochain match à jouer (bouton « Combattre » de la saison) : le premier pas encore joué de la journée en cours
 * (les journées d'avant sont finies, il est donc prêt) ; null si la saison est finie.
 */
export function nextSeasonMatch(season: Season): number | null {
  const day = currentDay(season)
  return day === null ? null : (pendingOfDay(season, day)[0] ?? null)
}

/**
 * Rapport de la saison : le cumul des rapports de match de chaque participant (index de `Season.entrants`), côté
 * `home` ou `away` selon le match. Un match sans rapport (enregistré avant lui) n'y compte pas.
 */
export function seasonReport(season: Season): FighterReport[] {
  const reports = season.entrants.map(() => emptyReport())
  for (const f of seasonFixtures(season)) {
    const report = season.results[f.number]?.report
    if (!report) continue
    addReport(reports[f.home], report[0])
    addReport(reports[f.away], report[1])
  }
  return reports
}

/**
 * Classement de la saison (matchs joués seulement). Départage, dans l'ordre : points ; différence de PV ;
 * confrontations directes (points pris entre les seuls ex aequo) ; ordre de tirage.
 */
export function standings(season: Season): Standing[] {
  const rows: Standing[] = season.entrants.map((_, entrant) => ({
    entrant,
    played: 0,
    wins: 0,
    losses: 0,
    points: 0,
    damageFor: 0,
    damageAgainst: 0,
    diff: 0,
  }))
  const played: { fixture: Fixture; result: SeasonResult }[] = []
  for (const fixture of seasonFixtures(season)) {
    const result = season.results[fixture.number]
    if (!result) continue
    played.push({ fixture, result })
    const sides: Pair<number> = [fixture.home, fixture.away]
    sides.forEach((i, side) => {
      const row = rows[i]
      const won = result.winner === side
      row.played++
      if (won) {
        row.wins++
        row.points += WIN_POINTS
      } else row.losses++
      row.damageFor += result.damage[side]
      row.damageAgainst += result.damage[1 - side]
    })
  }
  for (const row of rows) row.diff = row.damageFor - row.damageAgainst

  // Confrontations directes : points pris contre les participants à égalité de points et de différence
  const headToHead = (row: Standing) => {
    const group = new Set(rows.filter((r) => r.points === row.points && r.diff === row.diff).map((r) => r.entrant))
    if (group.size < 2) return 0
    let points = 0
    for (const { fixture, result } of played) {
      if (!group.has(fixture.home) || !group.has(fixture.away)) continue
      if ((result.winner === 0 ? fixture.home : fixture.away) === row.entrant) points += WIN_POINTS
    }
    return points
  }
  const h2h = new Map(rows.map((r) => [r.entrant, headToHead(r)]))
  return [...rows].sort(
    (a, b) => b.points - a.points || b.diff - a.diff || h2h.get(b.entrant)! - h2h.get(a.entrant)! || a.entrant - b.entrant,
  )
}

/**
 * Fin de la saison : les 16 premiers du classement entrent dans l'arbre, placés en têtes de série
 * (`BRACKET_SEEDS`), sous leur nom de saison, avec leur rang et leur construction, figée. Refusé tant que la
 * saison n'est pas finie.
 */
export function startBracket(t: Tournament): Tournament {
  if (!inSeason(t)) throw new Error('Pas de saison en cours')
  if (!seasonDone(t.season)) throw new Error('La saison n’est pas terminée')
  const { season } = t
  const table = standings(season)
  const entrants = BRACKET_SEEDS.map((rank) => {
    const i = table[rank - 1].entrant
    return { ...season.entrants[i], seasonRank: rank, ...(season.rewards.length > 0 && { build: buildOf(season, i) }) }
  })
  if (entrants.length !== SLOTS) throw new Error(`Il faut ${SLOTS} qualifiés`)
  return { ...t, entrants }
}
