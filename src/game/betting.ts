import { hashSeed } from './analysis'
import type { Character } from './character'
import { finalState, simulateCombat, type CombatResult, type Pair, type Side } from './combat'
import { seededRng } from './rng'

/*
 * Paris entre observateurs, en Deniers fictifs : un jeu dans le jeu, sans aucun effet sur le
 * combat. Règles complètes : docs/PARIS.md.
 * - Quatre parieurs : les deux joueurs, et deux parieurs de l'ordinateur (Borin le prudent, Zlatka
 *   la flambeuse) qui parient sur chaque match.
 * - Les cotes viennent de combats simulés sur des graines propres au pari, jamais celle du vrai
 *   combat (tirée au lancement) : elles sont reproductibles et ne trahissent rien. Elles ne sont
 *   pas affichées avant le combat (décision de l'utilisateur : on parie à l'intuition) ; elles se
 *   révèlent au règlement.
 * - Mises fixes (50, 100, 200), et un coup de poker (400) réservé au dernier du classement : le
 *   meneur ne peut pas s'envoler hors d'atteinte, et le dernier peut revenir.
 * - La mise quitte la bourse dès qu'elle est posée (séquestre) et revient si le pari est annulé ;
 *   un pari gagné rend mise × cote.
 * Tout est immuable, comme `tournament.ts`.
 */

export const STARTING_PURSE = 1000
/** Mises proposées : prudente, franche, audacieuse */
export const STAKES = [50, 100, 200] as const
/** Coup de poker : réservé au dernier du classement, quand il est distancé */
export const POKER_STAKE = 400
export const MIN_STAKE = STAKES[0]
/** Prime de relance d'un joueur ruiné, au début du tour suivant */
export const RELIEF = 100
/** Combats simulés pour coter un match */
export const PRICING_SAMPLES = 400
/** Paliers de cote : la cote juste (1 / probabilité) est ramenée au palier inférieur, ×10 au plus */
export const ODDS_STEPS = [1.1, 1.2, 1.3, 1.5, 1.8, 2, 2.5, 3, 4, 5, 7, 10] as const
/** Part des matchs qui reçoivent un coup de théâtre */
export const TWIST_CHANCE = 1 / 3

/** Index d'un parieur dans `Wallets.bettors` */
export type Bettor = number

/** Caractère d'un parieur de l'ordinateur. */
export type BotStyle = 'prudent' | 'gambler'

export interface BettorDef {
  name: string
  /** Absent : un joueur ; présent : un parieur de l'ordinateur et son caractère */
  bot?: BotStyle
}

export const DEFAULT_BETTOR_NAMES: Pair<string> = ['karma', 'MiaMiaM']
export const BOTS: readonly BettorDef[] = [
  { name: 'Borin', bot: 'prudent' },
  { name: 'Zlatka', bot: 'gambler' },
]

export type Market = 'winner' | 'rout' | 'duration'

/** Issue pariée : un combattant (vainqueur, victoire écrasante) ou la durée par rapport à la ligne. */
export type Pick = { market: 'winner' | 'rout'; side: Side } | { market: 'duration'; over: boolean }

export interface Outcome {
  pick: Pick
  /** Probabilité estimée par la simulation */
  probability: number
  /** Cote payée (après palier et coup de théâtre éventuel) ; révélée au règlement */
  odds: number
}

export type Twist =
  /** La cote d'une issue est multipliée par 1,5 */
  | { kind: 'boost'; pick: Pick }
  /** La cote du favori, au marché Vainqueur, est multipliée par 0,8 */
  | { kind: 'taxFavorite' }
  /** Un pari gagnant sur l'outsider rapporte une prime */
  | { kind: 'courage' }
  /** Tous les gains du match sont doublés */
  | { kind: 'jackpot' }
  /** Toutes les mises de ce match comptent double */
  | { kind: 'doubleStakes' }

export const BOOST_FACTOR = 1.5
export const TAX_FACTOR = 0.8
export const COURAGE_BONUS = 100

export const TWISTS: Record<Twist['kind'], { name: string; weight: number; describe: string }> = {
  boost: { name: 'Cote boostée', weight: 40, describe: 'Cette issue rapporte une fois et demie plus que d’habitude.' },
  taxFavorite: { name: 'Favori taxé', weight: 25, describe: 'Parier sur le favori rapporte moins que d’habitude.' },
  courage: { name: 'Prime de courage', weight: 20, describe: `Un pari gagnant sur l'outsider rapporte ${COURAGE_BONUS} Deniers de plus.` },
  jackpot: { name: 'Jackpot', weight: 10, describe: 'Tous les gains de ce match sont doublés.' },
  doubleStakes: { name: 'Mise doublée', weight: 5, describe: 'Toutes les mises de ce match comptent double.' },
}

export interface MatchOdds {
  key: string
  /** Ligne du marché Durée : la durée médiane simulée, en tours */
  line: number
  /** Six issues : vainqueur ×2, victoire écrasante ×2, durée ×2 */
  outcomes: Outcome[]
  /** Combattant le plus probable au marché Vainqueur */
  favorite: Side
  twist?: Twist
}

export interface Bet {
  pick: Pick
  stake: number
  odds: number
  /** Posé par le dernier du classement : son gain net compte double (rattrapage) */
  underdog?: true
}

export type LedgerEntry =
  | {
      kind: 'settle'
      key: string
      bettor: Bettor
      bet: Bet
      won: boolean
      /** Deniers rendus à la bourse (0 si perdu ; la mise si annulé) */
      payout: number
      /** Combat triché : pari annulé, mise rendue */
      void?: 'cheat'
      twist?: Twist['kind']
    }
  | { kind: 'relief'; bettor: Bettor; amount: number; label: string }

export interface Wallets {
  bettors: BettorDef[]
  /** Deniers disponibles (mises en cours déjà retirées), un par parieur */
  purses: number[]
  /** Paris en attente, par match : un emplacement par parieur */
  bets: Record<string, (Bet | null)[]>
  ledger: LedgerEntry[]
}

/** Les deux joueurs, puis les deux parieurs de l'ordinateur, 1 000 Deniers chacun. */
export function createWallets(names: Pair<string> = DEFAULT_BETTOR_NAMES): Wallets {
  const bettors: BettorDef[] = [...names.map((name) => ({ name })), ...BOTS.map((b) => ({ ...b }))]
  return { bettors, purses: bettors.map(() => STARTING_PURSE), bets: {}, ledger: [] }
}

export const bettorsOf = (w: Wallets): Bettor[] => w.bettors.map((_, i) => i)
export const humansOf = (w: Wallets): Bettor[] => bettorsOf(w).filter((b) => !w.bettors[b].bot)
export const botsOf = (w: Wallets): Bettor[] => bettorsOf(w).filter((b) => !!w.bettors[b].bot)

/** Fortune d'un parieur : sa bourse plus ses mises en cours. */
export const worthOf = (w: Wallets, b: Bettor) =>
  w.purses[b] + Object.values(w.bets).reduce((t, bets) => t + (bets[b]?.stake ?? 0), 0)

/** Classement : du plus riche au moins riche (à égalité, l'ordre des parieurs). */
export const ranking = (w: Wallets): Bettor[] => [...bettorsOf(w)].sort((a, b) => worthOf(w, b) - worthOf(w, a) || a - b)

/** Le parieur est-il dernier du classement (seul ou à égalité) ? */
export const isLast = (w: Wallets, b: Bettor) => bettorsOf(w).every((o) => worthOf(w, b) <= worthOf(w, o))

/** Dernier ET distancé (tous à égalité, personne n'est distancé) : coup de poker et gain doublé. */
export const isTrailing = (w: Wallets, b: Bettor) => isLast(w, b) && worthOf(w, b) < worthOf(w, ranking(w)[0])

/* ---------- Cotes ---------- */

export const samePick = (a: Pick, b: Pick) =>
  a.market === b.market && (a.market === 'duration' ? a.over === (b as typeof a).over : a.side === (b as { side: Side }).side)

/** Cote juste ramenée au palier le plus proche, en proportion (×1,1 au moins, ×10 au plus). */
export function oddsFor(probability: number) {
  const fair = 1 / probability
  return ODDS_STEPS.reduce((best, step) => (Math.abs(Math.log(step / fair)) < Math.abs(Math.log(best / fair)) ? step : best), ODDS_STEPS[0] as number)
}

const round1 = (x: number) => Math.round(x * 10) / 10

/** L'issue pariée a-t-elle lieu dans ce combat ? */
export function pickWins(pick: Pick, result: CombatResult, line: number) {
  if (pick.market === 'duration') return pick.over ? result.turns > line : result.turns <= line
  if (result.winner !== pick.side) return false
  if (pick.market === 'winner') return true
  return finalState(result).hp[pick.side] > result.fighters[pick.side].maxHp / 2
}

/** Tirage du coup de théâtre d'un match, à sa propre graine. */
function drawTwist(key: string, favorite: Side, outcomes: readonly Outcome[]): Twist | undefined {
  const rng = seededRng(hashSeed(`coup:${key}`))
  if (rng() >= TWIST_CHANCE) return undefined
  const kinds = Object.entries(TWISTS) as [Twist['kind'], (typeof TWISTS)[Twist['kind']]][]
  let roll = rng() * kinds.reduce((a, [, t]) => a + t.weight, 0)
  const kind = kinds.find(([, t]) => (roll -= t.weight) < 0)![0]
  if (kind !== 'boost') return { kind }
  // Une fois sur deux l'outsider au marché Vainqueur, sinon une issue au hasard
  const pick = rng() < 0.5 ? ({ market: 'winner', side: (1 - favorite) as Side } as Pick) : outcomes[Math.floor(rng() * outcomes.length)].pick
  return { kind, pick }
}

/**
 * Cote un match : `samples` combats simulés à des graines tirées de `key` et des deux combattants.
 * Les probabilités sont lissées (une issue jamais vue n'est pas impossible).
 */
export function priceMatch(fighters: Pair<Character>, key: string, samples = PRICING_SAMPLES): MatchOdds {
  const wins = [0, 0]
  const routs = [0, 0]
  const turns: number[] = []
  for (let k = 0; k < samples; k++) {
    const r = simulateCombat(fighters, { seed: hashSeed(`pari:${key}:${fighters[0].id}-${fighters[1].id}#${k}`) })
    wins[r.winner]++
    if (pickWins({ market: 'rout', side: r.winner }, r, 0)) routs[r.winner]++
    turns.push(r.turns)
  }
  const sorted = [...turns].sort((a, b) => a - b)
  const line = sorted[Math.floor(samples / 2)]
  const over = turns.filter((t) => t > line).length
  const p = (count: number) => (count + 1) / (samples + 2)
  const base: Outcome[] = [
    ...([0, 1] as Side[]).map((side) => ({ pick: { market: 'winner', side } as Pick, probability: p(wins[side]) })),
    ...([0, 1] as Side[]).map((side) => ({ pick: { market: 'rout', side } as Pick, probability: p(routs[side]) })),
    { pick: { market: 'duration', over: true } as Pick, probability: p(over) },
    { pick: { market: 'duration', over: false } as Pick, probability: p(samples - over) },
  ].map((o) => ({ ...o, odds: oddsFor(o.probability) }))
  const favorite: Side = wins[0] >= wins[1] ? 0 : 1
  const twist = drawTwist(key, favorite, base)
  const outcomes = base.map((o) => {
    if (twist?.kind === 'boost' && samePick(twist.pick, o.pick)) return { ...o, odds: round1(o.odds * BOOST_FACTOR) }
    if (twist?.kind === 'taxFavorite' && o.pick.market === 'winner' && o.pick.side === favorite)
      return { ...o, odds: Math.max(ODDS_STEPS[0], round1(o.odds * TAX_FACTOR)) }
    return o
  })
  return { key, line, outcomes, favorite, ...(twist && { twist }) }
}

export const outcomeOf = (odds: MatchOdds, pick: Pick) => odds.outcomes.find((o) => samePick(o.pick, pick))!

/* ---------- Mises ---------- */

const slotsOf = (w: Wallets, key: string) => w.bets[key] ?? w.bettors.map(() => null)

/** Deniers qu'un parieur peut engager sur ce match (sa bourse, plus sa mise actuelle sur ce match). */
export const available = (w: Wallets, key: string, bettor: Bettor) => w.purses[bettor] + (slotsOf(w, key)[bettor]?.stake ?? 0)

/** Mises qu'un parieur peut choisir sur ce match : les mises fixes, et le coup de poker s'il est dernier. */
export function stakeChoices(w: Wallets, bettor: Bettor): number[] {
  return isTrailing(w, bettor) ? [...STAKES, POKER_STAKE] : [...STAKES]
}

/** Mise réellement engagée pour un choix (une Mise doublée la double). */
export const effectiveStake = (odds: MatchOdds, choice: number) => (odds.twist?.kind === 'doubleStakes' ? choice * 2 : choice)

export type BetCheck = { ok: true; wallets: Wallets } | { ok: false; reason: string }

/**
 * Pose (ou remplace) le pari d'un parieur sur un match, avec une mise choisie parmi `stakeChoices`.
 * La mise est retirée de sa bourse ; son ancienne mise sur ce match lui est d'abord rendue.
 */
export function placeBet(w: Wallets, odds: MatchOdds, bettor: Bettor, pick: Pick, choice: number): BetCheck {
  if (!stakeChoices(w, bettor).includes(choice))
    return { ok: false, reason: choice === POKER_STAKE ? 'Le coup de poker est réservé au dernier du classement.' : 'Mise inconnue.' }
  const stake = effectiveStake(odds, choice)
  if (stake > available(w, odds.key, bettor)) return { ok: false, reason: 'Pas assez de Deniers.' }
  const cleared = cancelBet(w, odds.key, bettor)
  const bets = [...slotsOf(cleared, odds.key)]
  const underdog = isTrailing(cleared, bettor)
  bets[bettor] = { pick, stake, odds: outcomeOf(odds, pick).odds, ...(underdog && { underdog: true as const }) }
  const purses = [...cleared.purses]
  purses[bettor] -= stake
  return { ok: true, wallets: { ...cleared, purses, bets: { ...cleared.bets, [odds.key]: bets } } }
}

/** Retire le pari d'un parieur sur un match et lui rend sa mise. */
export function cancelBet(w: Wallets, key: string, bettor: Bettor): Wallets {
  const bets = slotsOf(w, key)
  const bet = bets[bettor]
  if (!bet) return w
  const next = [...bets]
  next[bettor] = null
  const purses = [...w.purses]
  purses[bettor] += bet.stake
  const all = { ...w.bets }
  if (next.some(Boolean)) all[key] = next
  else delete all[key]
  return { ...w, purses, bets: all }
}

/** Annule les paris des joueurs sur un match (retour arrière avant le combat) : les mises sont rendues. */
export const cancelMatch = (w: Wallets, key: string) => bettorsOf(w).reduce((acc, b) => cancelBet(acc, key, b), w)

/* ---------- Parieurs de l'ordinateur ---------- */

/**
 * Le pari d'un parieur de l'ordinateur, tiré à la graine du match : il « sent » les probabilités
 * (sans voir le combat), et parie selon son caractère.
 * - Borin, le prudent : le favori, mise franche (prudente quand sa bourse fond) ; parfois la durée la plus probable.
 * - Zlatka, la flambeuse : l'outsider, une victoire écrasante ou un pari de durée, mise audacieuse
 *   (coup de poker quand elle est dernière).
 */
export function botBet(w: Wallets, odds: MatchOdds, bettor: Bettor): { pick: Pick; choice: number } | null {
  const style = w.bettors[bettor].bot
  if (!style) return null
  const rng = seededRng(hashSeed(`parieur:${odds.key}:${bettor}`))
  const choices = stakeChoices(w, bettor).filter((c) => effectiveStake(odds, c) <= available(w, odds.key, bettor))
  if (!choices.length) return null
  const outsider = (1 - odds.favorite) as Side
  if (style === 'prudent') {
    const duration = outcomeOf(odds, { market: 'duration', over: true }).probability >= 0.5
    const pick: Pick = rng() < 0.2 ? { market: 'duration', over: duration } : { market: 'winner', side: odds.favorite }
    const wanted = w.purses[bettor] < STARTING_PURSE / 2 ? STAKES[0] : STAKES[1]
    return { pick, choice: choices.includes(wanted) ? wanted : choices[0] }
  }
  const roll = rng()
  const pick: Pick =
    roll < 0.5
      ? { market: 'winner', side: outsider }
      : roll < 0.75
        ? { market: 'rout', side: rng() < 0.6 ? odds.favorite : outsider }
        : { market: 'duration', over: rng() < 0.5 }
  return { pick, choice: choices[choices.length - 1] }
}

/** Les parieurs de l'ordinateur posent leur pari sur ce match (s'ils n'en ont pas déjà un). */
export function placeBotBets(w: Wallets, odds: MatchOdds): Wallets {
  let next = w
  for (const b of botsOf(w)) {
    if (slotsOf(next, odds.key)[b]) continue
    const bet = botBet(next, odds, b)
    if (!bet) continue
    const r = placeBet(next, odds, b, bet.pick, bet.choice)
    if (r.ok) next = r.wallets
  }
  return next
}

/* ---------- Règlement ---------- */

/** Deniers rendus par un pari gagnant : mise × cote, puis coup de théâtre (jackpot, prime de courage). */
export function payoutOf(bet: Bet, odds: MatchOdds) {
  const gross = Math.floor(bet.stake * bet.odds)
  // Jackpot et dernier du classement : le gain net double, et les deux se cumulent
  const jackpot = (odds.twist?.kind === 'jackpot' ? gross - bet.stake : 0) + (bet.underdog ? gross - bet.stake : 0)
  const onOutsider = bet.pick.market !== 'duration' && bet.pick.side !== odds.favorite
  const courage = odds.twist?.kind === 'courage' && onOutsider ? COURAGE_BONUS : 0
  return gross + jackpot + courage
}

/** Règle les paris d'un match joué. Un combat triché (dés imposés) annule les paris : mises rendues. */
export function settleMatch(w: Wallets, odds: MatchOdds, result: CombatResult): { wallets: Wallets; entries: LedgerEntry[] } {
  const bets = slotsOf(w, odds.key)
  const purses = [...w.purses]
  const entries: LedgerEntry[] = []
  for (const bettor of bettorsOf(w)) {
    const bet = bets[bettor]
    if (!bet) continue
    const twist = odds.twist?.kind
    if (result.forcedRolls) {
      purses[bettor] += bet.stake
      entries.push({ kind: 'settle', key: odds.key, bettor, bet, won: false, payout: bet.stake, void: 'cheat', ...(twist && { twist }) })
      continue
    }
    const won = pickWins(bet.pick, result, odds.line)
    const payout = won ? payoutOf(bet, odds) : 0
    purses[bettor] += payout
    entries.push({ kind: 'settle', key: odds.key, bettor, bet, won, payout, ...(twist && { twist }) })
  }
  const all = { ...w.bets }
  delete all[odds.key]
  return { wallets: { ...w, purses, bets: all, ledger: [...w.ledger, ...entries] }, entries }
}

/** Prime de relance : un parieur qui ne peut plus miser le minimum, sans pari en cours, reçoit RELIEF Deniers. */
export function relief(w: Wallets, label: string): Wallets {
  const purses = [...w.purses]
  const entries: LedgerEntry[] = []
  for (const bettor of bettorsOf(w)) {
    const pending = Object.values(w.bets).some((b) => b[bettor])
    if (purses[bettor] >= MIN_STAKE || pending) continue
    purses[bettor] += RELIEF
    entries.push({ kind: 'relief', bettor, amount: RELIEF, label })
  }
  return entries.length ? { ...w, purses, ledger: [...w.ledger, ...entries] } : w
}

/* ---------- Textes ---------- */

export const MARKET_NAMES: Record<Market, string> = {
  winner: 'Vainqueur',
  rout: 'Victoire écrasante',
  duration: 'Durée',
}

/** Nom d'une mise fixe. */
export const STAKE_NAMES: Record<number, string> = { 50: 'Prudent', 100: 'Franc', 200: 'Audacieux', [POKER_STAKE]: 'Coup de poker' }

/** L'issue en toutes lettres, ex. « Victoire écrasante : Gorak » ou « Plus de 20 tours ». */
export function pickLabel(pick: Pick, names: Pair<string>, line: number) {
  if (pick.market === 'duration') return pick.over ? `Plus de ${line} tours` : `${line} tours ou moins`
  return `${MARKET_NAMES[pick.market]} : ${names[pick.side]}`
}

/** Cote affichée au règlement, ex. « ×1,5 ». */
export const oddsLabel = (odds: number) => `×${odds.toLocaleString('fr-FR')}`

/** Montant affiché, ex. « 1 250 Deniers ». */
export const deniers = (n: number) => `${n.toLocaleString('fr-FR')} Denier${Math.abs(n) > 1 ? 's' : ''}`
