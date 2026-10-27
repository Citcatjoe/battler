import type { Character } from './character'
import { finalState, type CombatResult, type Pair } from './combat'
import { stepKey, type ForgeStep } from './forge'
import { rollFace } from './events'
import { computeStats, sumTriggers, triggerCounts, type FighterStats, type TriggerCounts } from './stats'
import { defaultRng, pick, shuffle, type Rng } from './rng'
import { drawReward } from './offers'
import { getRelic } from './relics'
import { createCharacter } from './roster'
import type { Season } from './season'
import { uniqueNames } from './epithets'

/*
 * Tournoi à élimination directe, 16 participants : huitièmes, quarts, demies, finale.
 * Les participants d'un match se déduisent des vainqueurs du tour précédent :
 * le match i du tour r oppose les vainqueurs des matchs 2i et 2i+1 du tour r-1.
 * Facultative, une phase de saison (season.ts) peut précéder l'arbre : ses 16 premiers y entrent, avec ce qu'ils y ont
 * construit (reliques, forge du dé), figé jusqu'à la fin du tournoi.
 */

export const SLOTS = 16
export const ROUNDS = 4
export const ROUND_NAMES = ['Huitièmes de finale', 'Quarts de finale', 'Demi-finales', 'Finale']

/** Nombre de matchs dans un tour : 8, 4, 2, 1 */
export const matchesInRound = (round: number) => SLOTS >> (round + 1)

/** Ce qu'un participant a construit pendant la saison : ses reliques et le journal de forge de son dé, dans l'ordre. */
export interface Build {
  relics: string[]
  forge: ForgeStep[]
}

export interface Entrant {
  characterId: string
  /** Nom affiché, numéroté si le personnage est présent plusieurs fois (« Gorak II ») */
  label: string
  /**
   * Son aura de départ (retour du 2026-10-27, B7 ; docs/MAITRISES.md § 5.3) : tirée au lancement parmi les `startAuras`
   * de sa fiche, sur le 1 de son dé pour tout le tournoi (et toute la saison). Absente (un tournoi d'avant le tirage) ou
   * qui n'est plus l'une de ses auras de départ : l'aura par défaut (`entrantAura`).
   */
  aura?: string
  /** Rang au classement final de la saison, s'il y en a eu une (tête de série dans l'arbre) */
  seasonRank?: number
  /** Sa construction de saison (season.ts), figée : il la porte à chaque match de l'arbre */
  build?: Build
}

export interface MatchResult {
  /** Index du participant vainqueur */
  winner: number
  turns: number
  mode: CombatResult['mode']
  /** PV restants du vainqueur */
  hpLeft: number
  /** Index des deux participants (gauche, droite), pour retrouver le bilan de chacun */
  players?: Pair<number>
  /** Bilan de chaque côté (`computeStats`), pour l'écran du champion */
  stats?: Pair<FighterStats>
  /** Compétences déclenchées par chaque côté, par nom */
  skills?: Pair<Record<string, number>>
  /** Déclenchements de chaque côté (reliques, faces du dé), pour l'écran du champion ; absents d'un match d'avant 0.121 */
  triggers?: Pair<TriggerCounts>
  /**
   * Récompense du vainqueur (docs/RELIQUES.md) : les reliques proposées, et celle qu'il garde. Absente après la
   * finale, ou s'il n'y a plus rien à proposer. `chosen` est d'abord le choix du vainqueur (au hasard dans
   * l'offre) ; l'observateur peut le changer sur l'écran de victoire (`chooseRelic`).
   */
  relic?: { offer: string[]; chosen: string }
}

export interface Tournament {
  /** Les 16 participants de l'arbre, dans son ordre ; vide tant que la phase de saison n'est pas terminée */
  entrants: Entrant[]
  results: Record<string, MatchResult>
  /**
   * Système de reliques (docs/RELIQUES.md) : choisi sur l'écran de configuration. Désactivé, aucune victoire
   * n'offre de relique, donc personne n'en porte pendant ce tournoi. Avec une saison, les reliques se gagnent
   * aux victoires de la saison (season.ts, construction), jamais dans l'arbre.
   */
  relics: boolean
  /** Phase de saison qui précède l'arbre (season.ts) ; absente : l'arbre seul, comme avant la 0.86.0 */
  season?: Season
}

export interface MatchRef {
  round: number
  index: number
}

export const matchKey = ({ round, index }: MatchRef) => `${round}-${index}`

export type MatchStatus = 'done' | 'ready' | 'pending'

/** Chiffres romains, pour numéroter les doublons (jusqu'à 39, plus qu'il n'y a de cases). */
function roman(n: number): string {
  const units = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']
  return 'X'.repeat(Math.floor(n / 10)) + units[n % 10]
}

/**
 * Participants nommés à partir de leurs ids : un doublon prend son numéro en chiffres romains (Gorak I, Gorak II…).
 * `epithets` (interrupteur « Noms uniques », 0.87.0) : chacun reçoit plutôt une épithète de son personnage, tirée
 * avec ce hasard (« Gorak le Borgne », epithets.ts).
 */
export function labelEntrants(ids: readonly string[], nameOf: (id: string) => string, epithets?: Rng): Entrant[] {
  if (epithets) {
    const labels = uniqueNames(ids, nameOf, epithets)
    return ids.map((id, i) => ({ characterId: id, label: labels[i] }))
  }
  const total = new Map<string, number>()
  ids.forEach((id) => total.set(id, (total.get(id) ?? 0) + 1))
  const seen = new Map<string, number>()
  return ids.map((id) => {
    const n = (seen.get(id) ?? 0) + 1
    seen.set(id, n)
    return { characterId: id, label: total.get(id)! > 1 ? `${nameOf(id)} ${roman(n)}` : nameOf(id) }
  })
}

/**
 * Le tirage des auras de départ (retour du 2026-10-27, B7), « comme si chaque participant choisissait son build » avant
 * le premier combat : pour chacun, dans l'ordre, une aura au hasard parmi les `startAuras` de sa fiche (toutes les
 * auras de ses deux maîtrises), chacune avec la même chance. Le hasard est injecté : à graine égale, même tirage.
 */
export function drawStartAuras(entrants: readonly Entrant[], rng: Rng): Entrant[] {
  return entrants.map((e) => {
    const auras = createCharacter(e.characterId).definition.startAuras ?? []
    return auras.length > 0 ? { ...e, aura: pick(rng, auras) } : e
  })
}

/**
 * L'aura de départ d'un participant : celle de son tirage, si elle est encore l'une des `startAuras` de son personnage ;
 * sinon (participant d'avant le tirage, liste changée depuis) l'aura par défaut, la première.
 */
export function entrantAura(e: Pick<Entrant, 'characterId' | 'aura'>): string | undefined {
  const auras = createCharacter(e.characterId).definition.startAuras ?? []
  return e.aura !== undefined && auras.includes(e.aura) ? e.aura : auras[0]
}

/** Le personnage d'un participant, sans sa construction : son dé de départ (son aura sur le 1), sous son nom de tournoi. */
export const entrantCharacter = (e: Entrant): Character => createCharacter(e.characterId, { aura: entrantAura(e) }).withName(e.label)

/**
 * Crée le tournoi à partir des 16 cases (ids de personnages), dans l'ordre de l'arbre. `relics` : le système
 * de reliques est actif (par défaut) ou non pour tout le tournoi. `epithets` : noms uniques, tirés avec ce hasard.
 * `auras` : le hasard du tirage des auras de départ (`drawStartAuras`) ; sans lui, chacun part de son dé vanilla.
 */
export function createTournament(
  slots: string[],
  nameOf: (id: string) => string,
  { relics = true, epithets, auras }: { relics?: boolean; epithets?: Rng; auras?: Rng } = {},
): Tournament {
  if (slots.length !== SLOTS) throw new Error(`Il faut ${SLOTS} participants`)
  const entrants = labelEntrants(slots, nameOf, epithets)
  return { entrants: auras ? drawStartAuras(entrants, auras) : entrants, results: {}, relics }
}

/** Les deux participants d'un match (null tant que le tour précédent n'est pas joué). */
export function players(t: Tournament, { round, index }: MatchRef): [number | null, number | null] {
  if (round === 0) return [2 * index, 2 * index + 1]
  const prev = (i: number) => t.results[matchKey({ round: round - 1, index: i })]?.winner ?? null
  return [prev(2 * index), prev(2 * index + 1)]
}

export function status(t: Tournament, ref: MatchRef): MatchStatus {
  if (t.results[matchKey(ref)]) return 'done'
  const [a, b] = players(t, ref)
  return a !== null && b !== null ? 'ready' : 'pending'
}

export const allMatches = (): MatchRef[] =>
  Array.from({ length: ROUNDS }, (_, round) =>
    Array.from({ length: matchesInRound(round) }, (_, index) => ({ round, index })),
  ).flat()

export const readyMatches = (t: Tournament) => allMatches().filter((m) => status(t, m) === 'ready')

/**
 * L'ordre de jeu d'un tour (retour du 2026-10-27) : chaque moitié de l'arbre (gauche, puis droite), de ses extrémités
 * (le haut et le bas) vers son centre : le haut, le bas, puis on resserre. Les tours se jouent l'un après l'autre.
 */
export function playOrder(round: number): MatchRef[] {
  const n = matchesInRound(round)
  const perSide = Math.max(1, n / 2)
  const side = (start: number, count: number) =>
    Array.from({ length: count }, (_, k) => start + (k % 2 ? count - 1 - (k >> 1) : k >> 1))
  const order = n === 1 ? [0] : [...side(0, perSide), ...side(perSide, perSide)]
  return order.map((index) => ({ round, index }))
}

/** Le prochain combat à jouer : le premier prêt du tour en cours, dans l'ordre de jeu (`playOrder`). */
export function nextMatch(t: Tournament): MatchRef | undefined {
  const round = currentRound(t)
  return round === null ? undefined : playOrder(round).find((m) => status(t, m) === 'ready')
}

/** Tour en cours : le premier qui a encore des matchs à jouer (null si tout est fini). */
export function currentRound(t: Tournament): number | null {
  const next = allMatches().find((m) => status(t, m) !== 'done')
  return next ? next.round : null
}

export const champion = (t: Tournament): number | null =>
  t.results[matchKey({ round: ROUNDS - 1, index: 0 })]?.winner ?? null

/**
 * Reliques d'un participant, dans l'ordre d'obtention : celles de sa construction de saison, puis une par match
 * gagné avant le tour `beforeRound` (toutes par défaut). Elles se déduisent des participants et des résultats.
 */
export function relicsOf(t: Tournament, entrant: number, beforeRound = ROUNDS): string[] {
  const won = allMatches().flatMap((ref) => {
    const r = t.results[matchKey(ref)]
    return r?.relic && r.winner === entrant && ref.round < beforeRound ? [r.relic.chosen] : []
  })
  return [...(t.entrants[entrant]?.build?.relics ?? []), ...won]
}

/**
 * Ce qui fait un combattant de tournoi : son personnage, l'aura sur le 1 de son dé de départ, ses reliques, sa forge
 * (validation d'un résultat).
 */
export const fighterKey = (c: Character) =>
  `${c.id}@${c.definition.events.find((e) => rollFace(e.trigger) === 1)?.id ?? ''}+${c.relics.map((r) => r.id).join(',')}+${c.forge.map(stepKey).join(';')}`

/**
 * Les deux combattants d'un match, sous leur nom de tournoi, partis de leur aura de départ, avec leur construction de
 * saison et les reliques gagnées aux tours précédents.
 */
export function matchFighters(t: Tournament, ref: MatchRef): [Character, Character] {
  const [a, b] = players(t, ref)
  if (a === null || b === null) throw new Error('Match pas encore prêt')
  const make = (i: number) =>
    entrantCharacter(t.entrants[i])
      .withForge(t.entrants[i].build?.forge ?? [])
      .withRelics(relicsOf(t, i, ref.round).map(getRelic))
  return [make(a), make(b)]
}

/**
 * Enregistre l'issue d'un combat dans l'arbre (renvoie un nouveau tournoi), avec la récompense du vainqueur
 * (hors finale, si le tournoi a ses reliques et pas de saison : après une saison, chacun garde sa construction
 * figée) : l'offre de relique de la campagne (`drawReward`, offers.ts : reliques à sa portée qu'il n'a pas encore, la
 * première à l'écho de son build), et son choix, tiré au hasard (`rng`).
 * Refuse un match déjà joué ou pas encore prêt, ou un combat dont les combattants (personnages, reliques, forge)
 * ne sont pas ceux du match : l'appelant ne doit alors rien enregistrer.
 */
export function withResult(t: Tournament, ref: MatchRef, result: CombatResult, rng: Rng = defaultRng): Tournament {
  if (status(t, ref) !== 'ready') throw new Error(`Match ${matchKey(ref)} non jouable (${status(t, ref)})`)
  const [a, b] = players(t, ref) as [number, number]
  const expected = matchFighters(t, ref).map(fighterKey)
  const actual = result.fighters.map(fighterKey)
  if (actual[0] !== expected[0] || actual[1] !== expected[1]) throw new Error(`Le combat ne correspond pas au match ${matchKey(ref)}`)
  const winner = result.winner === 0 ? a : b
  const drawn =
    t.relics && !t.season && ref.round < ROUNDS - 1
      ? drawReward(
          { championId: t.entrants[winner].characterId, aura: entrantAura(t.entrants[winner]), forge: t.entrants[winner].build?.forge ?? [], relics: relicsOf(t, winner) },
          'relic',
          rng,
        )
      : undefined
  const relic = drawn?.kind === 'relic' && drawn.choice ? { offer: drawn.offer, chosen: drawn.choice } : undefined
  return {
    ...t,
    results: {
      ...t.results,
      [matchKey(ref)]: {
        winner,
        turns: result.turns,
        mode: result.mode,
        // PV restants du vainqueur, soins compris
        hpLeft: finalState(result).hp[result.winner],
        players: [a, b],
        stats: computeStats(result),
        skills: [skillCounts(result, 0), skillCounts(result, 1)],
        triggers: [triggerCounts(result, 0), triggerCounts(result, 1)],
        ...(relic && { relic }),
      },
    },
  }
}

/**
 * L'observateur choisit la relique du vainqueur, parmi l'offre (écran de victoire). Refusé si la relique
 * n'est pas proposée, ou si le vainqueur a déjà joué son match suivant : il s'est battu avec l'autre.
 */
export function chooseRelic(t: Tournament, ref: MatchRef, relic: string): Tournament {
  const r = t.results[matchKey(ref)]
  if (!r?.relic || !r.relic.offer.includes(relic)) throw new Error(`Relique ${relic} non proposée au match ${matchKey(ref)}`)
  // Son match suivant (il n'y a pas de récompense après la finale) : s'il est joué, la relique a servi
  const next = matchKey({ round: ref.round + 1, index: ref.index >> 1 })
  if (t.results[next]) throw new Error(`Match ${next} déjà joué : la relique ne change plus`)
  return { ...t, results: { ...t.results, [matchKey(ref)]: { ...r, relic: { ...r.relic, chosen: relic } } } }
}

const skillCounts = (result: CombatResult, side: 0 | 1) => {
  const counts: Record<string, number> = {}
  for (const b of result.beats) if (b.type === 'event' && b.event.side === side) counts[b.event.name] = (counts[b.event.name] ?? 0) + 1
  return counts
}

/** Un match du parcours du champion : l'adversaire battu et comment. */
export interface RunMatch {
  round: number
  opponent: Entrant
  turns: number
  hpLeft: number
  mode: CombatResult['mode']
  stats?: FighterStats
}

/** Le parcours du champion, ses quatre victoires, et le bilan cumulé de son tournoi. */
export interface ChampionRun {
  entrant: Entrant
  matches: RunMatch[]
  /**
   * Dégâts symétriques : `damage` (infligés) = ses coups qui touchent + les dégâts d'effets subis par
   * l'adversaire (Foudre, poison, saignement, brûlure, riposte, reliques…) ; `damageTaken` (encaissés) = les
   * coups de l'adversaire + les dégâts d'effets qu'il a subis. `effectDamage` : la part d'effets de `damage`.
   */
  totals: {
    turns: number
    damage: number
    effectDamage: number
    hits: number
    attacks: number
    crits: number
    critDamage: number
    best: number
    dodges: number
    healed: number
    events: number
    absorbed: number
    damageTaken: number
  }
  /** Compétences déclenchées sur tout le tournoi, de la plus fréquente à la plus rare */
  skills: [string, number][]
  /** Reliques gagnées en chemin, dans l'ordre d'obtention */
  relics: string[]
  /** Déclenchements de ses reliques et des faces de son dé sur tout le tournoi (les matchs sans bilan comptent pour 0) */
  triggers: TriggerCounts
}

/** Bilan du champion (null tant que la finale n'est pas jouée). Les bilans manquants comptent pour 0. */
export function championRun(t: Tournament): ChampionRun | null {
  const champ = champion(t)
  if (champ === null) return null
  const matches: RunMatch[] = []
  const totals = { turns: 0, damage: 0, effectDamage: 0, hits: 0, attacks: 0, crits: 0, critDamage: 0, best: 0, dodges: 0, healed: 0, events: 0, absorbed: 0, damageTaken: 0 }
  const skills = new Map<string, number>()
  const triggers: TriggerCounts[] = []
  for (const ref of allMatches()) {
    const r = t.results[matchKey(ref)]
    const [a, b] = players(t, ref)
    if (!r || (a !== champ && b !== champ)) continue
    const side = a === champ ? 0 : 1
    const opponent = t.entrants[(side === 0 ? b : a)!]
    const mine = r.stats?.[side]
    const theirs = r.stats?.[side === 0 ? 1 : 0]
    matches.push({ round: ref.round, opponent, turns: r.turns, hpLeft: r.hpLeft, mode: r.mode, stats: mine })
    totals.turns += r.turns
    if (mine) {
      // Infligés : les dégâts d'effets de l'adversaire comptent comme ceux du champion (ils viennent de ses
      // compétences, de ses reliques et des statuts qu'il a posés), comme ses propres dégâts d'effets comptent
      // dans ses dégâts encaissés.
      const effectDealt = theirs?.effectDamageTaken ?? 0
      totals.damage += mine.totalDamage + effectDealt
      totals.effectDamage += effectDealt
      totals.hits += mine.hits
      totals.attacks += mine.attacks
      totals.crits += mine.crits
      totals.critDamage += mine.critDamage
      totals.best = Math.max(totals.best, mine.best)
      totals.dodges += mine.dodges
      totals.healed += mine.healed
      totals.events += mine.events
      totals.absorbed += mine.absorbed
      totals.damageTaken += (theirs?.totalDamage ?? 0) + mine.effectDamageTaken
    }
    for (const [name, n] of Object.entries(r.skills?.[side] ?? {})) skills.set(name, (skills.get(name) ?? 0) + n)
    if (r.triggers) triggers.push(r.triggers[side])
  }
  return {
    entrant: t.entrants[champ],
    matches,
    totals,
    skills: [...skills].sort((x, y) => y[1] - x[1]),
    relics: relicsOf(t, champ),
    triggers: sumTriggers(triggers),
  }
}

/**
 * Remplit les cases vides en équilibrant le roster (chaque personnage autant de fois que possible : 2 ou 3 fois
 * sur 16, 3 ou 4 sur 32 avec dix personnages), en tenant compte des cases déjà choisies à la main et en évitant
 * si possible qu'un personnage affronte son double au premier tour (cases 2i et 2i+1). Vaut pour tout nombre
 * pair de cases : l'arbre (16) comme la saison (20, 24 ou 32).
 */
export function fillSlots(slots: readonly (string | null)[], ids: readonly string[], rng: Rng = defaultRng): string[] {
  const count = new Map(ids.map((id) => [id, 0]))
  slots.forEach((id) => id && count.set(id, (count.get(id) ?? 0) + 1))
  const empty = shuffle(
    rng,
    slots.map((id, i) => (id ? -1 : i)).filter((i) => i >= 0),
  )
  const out = [...slots]
  for (const i of empty) {
    const partner = out[i % 2 === 0 ? i + 1 : i - 1]
    const min = Math.min(...count.values())
    const least = ids.filter((id) => count.get(id) === min)
    const candidates = least.filter((id) => id !== partner)
    const pool = candidates.length ? candidates : least
    const id = pool[Math.floor(rng() * pool.length)]
    out[i] = id
    count.set(id, min + 1)
  }
  return out as string[]
}
