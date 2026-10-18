import { describe, expect, it } from 'vitest'
import {
  available,
  BOTS,
  botBet,
  cancelBet,
  cancelMatch,
  COURAGE_BONUS,
  createWallets,
  deniers,
  isLast,
  ODDS_STEPS,
  oddsFor,
  outcomeOf,
  payoutOf,
  pickLabel,
  pickWins,
  placeBet,
  placeBotBets,
  POKER_STAKE,
  priceMatch,
  ranking,
  relief,
  RELIEF,
  settleMatch,
  stakeChoices,
  STAKES,
  STAKE_NAMES,
  STARTING_PURSE,
  TWISTS,
  worthOf,
  type MatchOdds,
  type Pick,
  type Wallets,
} from './betting'
import { finalState, simulateCombat, type CombatResult, type Pair } from './combat'
import type { Character } from './character'
import { createCharacter } from './roster'
import { EMOJI } from './test-utils'

const pair = (a: string, b: string): Pair<Character> => [createCharacter(a), createCharacter(b)]
const winner0: Pick = { market: 'winner', side: 0 }

/** Cotes de test, sans coup de théâtre sauf mention. */
function testOdds(twist?: MatchOdds['twist']): MatchOdds {
  return {
    key: 'test',
    line: 20,
    favorite: 0,
    outcomes: [
      { pick: winner0, probability: 0.6, odds: 1.5 },
      { pick: { market: 'winner', side: 1 }, probability: 0.4, odds: 2.5 },
      { pick: { market: 'rout', side: 0 }, probability: 0.3, odds: 3 },
      { pick: { market: 'rout', side: 1 }, probability: 0.2, odds: 5 },
      { pick: { market: 'duration', over: true }, probability: 0.45, odds: 2 },
      { pick: { market: 'duration', over: false }, probability: 0.55, odds: 1.8 },
    ],
    ...(twist && { twist }),
  }
}

const place = (w: Wallets, odds: MatchOdds, bettor: number, pick: Pick, stake: number) => {
  const r = placeBet(w, odds, bettor, pick, stake)
  if (!r.ok) throw new Error(r.reason)
  return r.wallets
}

/** Bourses imposées, pour tester le classement. */
const withPurses = (purses: number[]): Wallets => ({ ...createWallets(), purses })

describe('paris : parieurs', () => {
  it('deux joueurs et deux parieurs de l’ordinateur, 1 000 Deniers chacun', () => {
    const w = createWallets(['A', 'B'])
    expect(w.bettors.map((b) => b.name)).toEqual(['A', 'B', ...BOTS.map((b) => b.name)])
    expect(w.bettors.map((b) => !!b.bot)).toEqual([false, false, true, true])
    expect(w.purses).toEqual([STARTING_PURSE, STARTING_PURSE, STARTING_PURSE, STARTING_PURSE])
  })

  it('classe par fortune (bourse et mises en cours) ; le dernier a droit au coup de poker', () => {
    const w = withPurses([800, 1200, 300, 1000])
    expect(ranking(w)).toEqual([1, 3, 0, 2])
    expect(isLast(w, 2)).toBe(true)
    expect(stakeChoices(w, 2)).toEqual([...STAKES, POKER_STAKE])
    expect(stakeChoices(w, 0)).toEqual([...STAKES])
    // Une mise en cours compte dans la fortune
    expect(worthOf(place(w, testOdds(), 0, winner0, 200), 0)).toBe(800)
  })
})

describe('paris : cotes', () => {
  it('ramène la cote juste au palier le plus proche, entre ×1,1 et ×10', () => {
    expect(oddsFor(0.7)).toBe(1.5) // juste : ×1,43
    expect(oddsFor(0.3)).toBe(3) // juste : ×3,33
    expect(oddsFor(0.5)).toBe(2)
    expect(oddsFor(0.99)).toBe(ODDS_STEPS[0])
    expect(oddsFor(0.001)).toBe(10)
  })

  it('cote un match de façon reproductible, avec six issues et des probabilités cohérentes', () => {
    const fighters = pair('gorak', 'elaria')
    const a = priceMatch(fighters, '0-0', 120)
    expect(priceMatch(fighters, '0-0', 120)).toEqual(a)
    expect(a.outcomes).toHaveLength(6)
    const p = (pick: Pick) => outcomeOf(a, pick).probability
    expect(p(winner0) + p({ market: 'winner', side: 1 })).toBeCloseTo(1, 1)
    expect(p({ market: 'rout', side: 0 })).toBeLessThanOrEqual(p(winner0))
    expect(a.line).toBeGreaterThan(0)
    for (const o of a.outcomes) expect(o.odds).toBeGreaterThanOrEqual(1.1)
  })

  it('ne touche pas au vrai combat : un combat à graine fixe reste identique après la cotation', () => {
    const fighters = pair('brokk', 'ysolde')
    const before = simulateCombat(fighters, { seed: 42 })
    priceMatch(fighters, '1-0', 60)
    expect(simulateCombat(fighters, { seed: 42 }).beats).toEqual(before.beats)
  })

  it('tire des coups de théâtre sur environ un match sur trois, de tous les genres', () => {
    const fighters = pair('gorak', 'murzug')
    const kinds = new Map<string, number>()
    let twisted = 0
    const n = 300
    for (let i = 0; i < n; i++) {
      const o = priceMatch(fighters, `t${i}`, 4)
      if (o.twist) {
        twisted++
        kinds.set(o.twist.kind, (kinds.get(o.twist.kind) ?? 0) + 1)
      }
    }
    expect(twisted / n).toBeGreaterThan(0.25)
    expect(twisted / n).toBeLessThan(0.42)
    expect([...kinds.keys()].sort()).toEqual(Object.keys(TWISTS).sort())
  })
})

describe('paris : mises', () => {
  it('retire la mise de la bourse, la rend si on annule', () => {
    const odds = testOdds()
    let w = place(createWallets(), odds, 0, winner0, 200)
    expect(w.purses[0]).toBe(STARTING_PURSE - 200)
    expect(w.bets.test[0]).toEqual({ pick: winner0, stake: 200, odds: 1.5 })
    w = cancelBet(w, 'test', 0)
    expect(w.purses[0]).toBe(STARTING_PURSE)
    expect(w.bets.test).toBeUndefined()
  })

  it('remplace le pari précédent du même joueur sur le même match', () => {
    const odds = testOdds()
    let w = place(createWallets(), odds, 1, winner0, 100)
    expect(available(w, 'test', 1)).toBe(STARTING_PURSE)
    w = place(w, odds, 1, { market: 'duration', over: true }, 200)
    expect(w.purses[1]).toBe(STARTING_PURSE - 200)
    expect(w.bets.test[1]?.odds).toBe(2)
  })

  it('n’accepte que les mises proposées, et le coup de poker au seul dernier', () => {
    const odds = testOdds()
    const w = createWallets()
    expect(placeBet(w, odds, 0, winner0, 70).ok).toBe(false)
    expect(placeBet(w, odds, 0, winner0, 1000).ok).toBe(false)
    // Tous à égalité : personne n'est distancé, pas de poker
    expect(placeBet(w, odds, 0, winner0, POKER_STAKE).ok).toBe(false)
    expect(placeBet(withPurses([500, 1000, 1000, 1000]), odds, 0, winner0, POKER_STAKE).ok).toBe(true)
    const behind = withPurses([300, 1000, 1000, 1000])
    expect(placeBet(behind, odds, 1, winner0, POKER_STAKE).ok).toBe(false)
    expect(placeBet(withPurses([30, 1000, 1000, 1000]), odds, 0, winner0, 50).ok).toBe(false)
  })

  it('Mise doublée : la mise engagée compte double', () => {
    const w = place(createWallets(), testOdds({ kind: 'doubleStakes' }), 0, winner0, 100)
    expect(w.bets.test[0]?.stake).toBe(200)
    expect(w.purses[0]).toBe(STARTING_PURSE - 200)
  })

  it('borne la somme des mises de plusieurs matchs par la bourse', () => {
    let w = withPurses([300, 1000, 1000, 1000])
    w = place(w, { ...testOdds(), key: 'a' }, 0, winner0, 200)
    expect(placeBet(w, { ...testOdds(), key: 'b' }, 0, winner0, 200).ok).toBe(false)
    expect(placeBet(w, { ...testOdds(), key: 'b' }, 0, winner0, 100).ok).toBe(true)
  })

  it('annule tous les paris d’un match', () => {
    const odds = testOdds()
    const w = place(place(createWallets(), odds, 0, winner0, 100), odds, 1, winner0, 50)
    expect(cancelMatch(w, 'test').purses).toEqual(createWallets().purses)
  })
})

describe('paris : parieurs de l’ordinateur', () => {
  it('Borin parie le favori, Zlatka plus gros ; leurs paris sont reproductibles', () => {
    const odds = priceMatch(pair('gorak', 'elaria'), 'ia', 80)
    const w = withPurses([1000, 1000, 900, 1100])
    const borin = botBet(w, odds, 2)!
    const zlatka = botBet(w, odds, 3)!
    expect(botBet(w, odds, 2)).toEqual(borin)
    expect(botBet(w, odds, 0)).toBeNull() // un joueur ne parie pas tout seul
    if (borin.pick.market === 'winner') expect(borin.pick.side).toBe(odds.favorite)
    expect(borin.choice).toBe(100)
    expect(zlatka.choice).toBe(200)
    const placed = placeBotBets(w, odds)
    expect(placed.bets.ia.map(Boolean)).toEqual([false, false, true, true])
    // Un second passage ne rejoue pas leur pari
    expect(placeBotBets(placed, odds)).toBe(placed)
  })

  it('parient sur beaucoup de matchs différents sans tomber en panne de mise', () => {
    let w = createWallets()
    const fighters = pair('brokk', 'naraxes')
    for (let i = 0; i < 30; i++) {
      const odds = priceMatch(fighters, `m${i}`, 20)
      w = placeBotBets(relief(w, 'tour'), odds)
      w = settleMatch(w, odds, simulateCombat(fighters, { seed: i })).wallets
    }
    expect(w.ledger.filter((e) => e.kind === 'settle' && e.bettor >= 2).length).toBeGreaterThan(40)
  })
})

describe('paris : règlement', () => {
  const fighters = pair('gorak', 'elaria')
  const result: CombatResult = simulateCombat(fighters, { seed: 7 })
  const win: Pick = { market: 'winner', side: result.winner }
  const lose: Pick = { market: 'winner', side: result.winner === 0 ? 1 : 0 }

  it('reconnaît chaque issue', () => {
    expect(pickWins(win, result, 0)).toBe(true)
    expect(pickWins(lose, result, 0)).toBe(false)
    const crushed = finalState(result).hp[result.winner] > result.fighters[result.winner].maxHp / 2
    expect(pickWins({ market: 'rout', side: result.winner }, result, 0)).toBe(crushed)
    expect(pickWins({ market: 'duration', over: true }, result, result.turns - 1)).toBe(true)
    expect(pickWins({ market: 'duration', over: false }, result, result.turns)).toBe(true)
  })

  it('paie mise × cote au gagnant, rien au perdant, et note le relevé', () => {
    const odds = testOdds()
    let w = place(createWallets(), odds, 0, win, 100)
    w = place(w, odds, 1, lose, 100)
    const { wallets, entries } = settleMatch(w, odds, result)
    expect(wallets.purses[0]).toBe(STARTING_PURSE - 100 + Math.floor(100 * outcomeOf(odds, win).odds))
    expect(wallets.purses[1]).toBe(STARTING_PURSE - 100)
    expect(entries.map((e) => e.kind === 'settle' && e.won)).toEqual([true, false])
    expect(wallets.bets.test).toBeUndefined()
  })

  it('rend les mises d’un combat triché', () => {
    const odds = testOdds()
    const w = place(createWallets(), odds, 0, lose, 200)
    const { wallets, entries } = settleMatch(w, odds, { ...result, forcedRolls: { 0: 1 } })
    expect(wallets.purses[0]).toBe(STARTING_PURSE)
    expect(entries[0]).toMatchObject({ void: 'cheat', payout: 200 })
  })

  it('applique les coups de théâtre et le rattrapage du dernier aux gains', () => {
    const bet = { pick: { market: 'winner', side: 1 } as Pick, stake: 100, odds: 2.5 }
    expect(payoutOf(bet, testOdds())).toBe(250)
    expect(payoutOf(bet, testOdds({ kind: 'jackpot' }))).toBe(400) // gain net 150, doublé
    expect(payoutOf(bet, testOdds({ kind: 'courage' }))).toBe(250 + COURAGE_BONUS) // 1 est l'outsider
    expect(payoutOf({ ...bet, pick: winner0, odds: 1.5 }, testOdds({ kind: 'courage' }))).toBe(150)
    expect(payoutOf({ ...bet, underdog: true }, testOdds())).toBe(400) // dernier : gain net doublé
    // Le dernier du classement (et lui seul) pose des paris « rattrapage »
    const w = place(withPurses([300, 1000, 1000, 1000]), testOdds(), 0, winner0, 100)
    expect(w.bets.test[0]?.underdog).toBe(true)
    expect(place(createWallets(), testOdds(), 0, winner0, 100).bets.test[0]?.underdog).toBeUndefined()
  })

  it('verse la prime de relance à un parieur ruiné, sans pari en cours', () => {
    let w = withPurses([60, 1000, 1000, 1000])
    w = place(w, testOdds(), 0, lose, 50)
    expect(relief(w, 'Quarts de finale')).toBe(w) // mise en cours : pas encore ruiné
    w = settleMatch(w, testOdds(), result).wallets
    w = relief(w, 'Quarts de finale')
    expect(w.purses[0]).toBe(10 + RELIEF)
    expect(w.ledger.at(-1)).toEqual({ kind: 'relief', bettor: 0, amount: RELIEF, label: 'Quarts de finale' })
  })
})

describe('paris : textes', () => {
  it('décrit les issues, les mises et les montants, sans emoji', () => {
    const names: Pair<string> = ['Gorak', 'Elaria']
    const texts = [
      pickLabel(winner0, names, 20),
      pickLabel({ market: 'rout', side: 1 }, names, 20),
      pickLabel({ market: 'duration', over: true }, names, 20),
      pickLabel({ market: 'duration', over: false }, names, 20),
      deniers(1250),
      ...Object.values(STAKE_NAMES),
      ...Object.values(TWISTS).flatMap((t) => [t.name, t.describe]),
    ]
    expect(texts.slice(0, 4)).toEqual(['Vainqueur : Gorak', 'Victoire écrasante : Elaria', 'Plus de 20 tours', '20 tours ou moins'])
    for (const t of texts) expect(t).not.toMatch(EMOJI)
  })
})
