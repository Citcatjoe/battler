import { useEffect, useState } from 'react'
import {
  available,
  bettorsOf,
  deniers,
  effectiveStake,
  humansOf,
  oddsLabel,
  pickLabel,
  POKER_STAKE,
  ranking,
  samePick,
  stakeChoices,
  STAKE_NAMES,
  TWISTS,
  worthOf,
  type BettorDef,
  type Bettor,
  type LedgerEntry,
  type MatchOdds,
  type Pick,
  type Twist,
  type Wallets,
} from '../game/betting'
import type { Character } from '../game/character'
import type { Pair, Side } from '../game/combat'
import { sfx } from '../game/sound'
import { Icon } from './Icon'
import { Portrait } from './Portrait'
import { Button, Glyph } from './kit'

/*
 * Paris entre observateurs (docs/PARIS.md), présentés comme un menu de jeu : de grandes tuiles,
 * des pièces à poser, aucune cote avant le combat (on parie à l'intuition ; elles se révèlent au
 * règlement). Aucune règle ici : tout vient de `betting.ts`.
 */

/** Couleur de chaque parieur, distincte des camps (bleu, rose) et de l'ambre du critique. */
export const BETTOR_STYLE = [
  { text: 'text-emerald-300', dot: 'bg-emerald-400', border: 'border-emerald-400/70', glow: 'shadow-[0_0_40px_rgba(52,211,153,0.25)]', bg: 'from-emerald-950/60' },
  { text: 'text-fuchsia-300', dot: 'bg-fuchsia-400', border: 'border-fuchsia-400/70', glow: 'shadow-[0_0_40px_rgba(232,121,249,0.25)]', bg: 'from-fuchsia-950/60' },
  { text: 'text-slate-300', dot: 'bg-slate-400', border: 'border-slate-400/60', glow: '', bg: 'from-slate-900/60' },
  { text: 'text-orange-300', dot: 'bg-orange-400', border: 'border-orange-400/60', glow: '', bg: 'from-orange-950/60' },
] as const
const styleOf = (b: Bettor) => BETTOR_STYLE[b % BETTOR_STYLE.length]

/** Pastille « IA » d'un parieur de l'ordinateur. */
function BotTag({ def }: { def: BettorDef }) {
  if (!def.bot) return null
  return (
    <span className="ml-1.5 rounded border border-stone-500/70 px-1 align-middle font-sans text-[10px] font-bold tracking-wider text-stone-400">
      IA
    </span>
  )
}

/** Bandeau du coup de théâtre d'un match. */
export function TwistBanner({ twist, names, line, size = 'lg' }: { twist?: Twist; names: Pair<string>; line: number; size?: 'lg' | 'sm' }) {
  if (!twist) return null
  const t = TWISTS[twist.kind]
  const target = twist.kind === 'boost' ? ` · ${pickLabel(twist.pick, names, line)}` : ''
  return (
    <div className={`twist-ribbon flex items-center justify-center gap-3 ${size === 'lg' ? 'px-12 py-2.5' : 'px-6 py-1'}`}>
      <Icon name="twist" className={size === 'lg' ? 'h-9 w-9' : 'h-5 w-5'} />
      <div className="text-center">
        {/* Espace insécable devant les deux-points : il ne reste jamais seul sur sa ligne dans la colonne étroite de l'affrontement */}
        <p className={`font-display font-extrabold uppercase tracking-[0.2em] text-amber-100 ${size === 'lg' ? 'text-xl' : 'text-xs'}`}>
          Coup de théâtre{'\u00a0'}: {t.name}
          {target}
        </p>
        {size === 'lg' && <p className="text-sm text-amber-100/80">{t.describe}</p>}
      </div>
    </div>
  )
}

interface DeskProps {
  wallets: Wallets
  /** Cotes du match ; null tant qu'elles sont en calcul */
  odds: MatchOdds | null
  fighters: Pair<Character>
  onBet: (bettor: Bettor, pick: Pick, choice: number) => string | null
  onCancel: (bettor: Bettor) => void
  onClose: () => void
  /** Duel simple : remettre les bourses à zéro */
  onReset?: () => void
}

/** Le guichet du match : un plateau par joueur, en plein écran, par-dessus l'affrontement. */
export function BettingDesk({ wallets, odds, fighters, onBet, onCancel, onClose, onReset }: DeskProps) {
  const names: Pair<string> = [fighters[0].name, fighters[1].name]
  // Échap ferme le guichet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const bots = bettorsOf(wallets).filter((b) => wallets.bettors[b].bot)
  return (
    <div className="desk-in absolute inset-0 z-30 flex flex-col items-center bg-[radial-gradient(ellipse_at_50%_40%,rgba(28,25,23,0.985)_0%,rgba(8,6,5,1)_75%)]">
      <div className="mt-7 flex flex-col items-center gap-3">
        <h2 className="desk-title font-display text-6xl font-extrabold tracking-[0.3em] text-amber-200">PARIS</h2>
        {odds?.twist ? (
          <TwistBanner twist={odds.twist} names={names} line={odds.line} />
        ) : (
          <p className="text-lg text-stone-400">Fiez-vous à votre flair : les cotes se dévoilent après le combat.</p>
        )}
      </div>

      <div className="mt-6 flex gap-8">
        {humansOf(wallets).map((b, i) => (
          <BetBoard key={b} bettor={b} wallets={wallets} odds={odds} fighters={fighters} onBet={onBet} onCancel={onCancel} delay={i * 90} />
        ))}
      </div>

      <div className="mb-8 mt-auto grid w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-6">
        <div>
          {onReset && (
            <Button variant="secondary" size="md" icon="reinitialiser" onClick={onReset} className="w-72">
              Bourses à zéro
            </Button>
          )}
        </div>
        <Button variant="primary" size="xl" icon="combattre" onClick={onClose} className="w-96">
          Au combat
        </Button>
        <p className="text-right text-sm text-stone-400">
          {bots.map((b) => wallets.bettors[b].name).join(' et ')} ont aussi misé.
          <br />
          Leurs paris se dévoilent après le combat.
        </p>
      </div>
    </div>
  )
}

interface BoardProps {
  bettor: Bettor
  wallets: Wallets
  odds: MatchOdds | null
  fighters: Pair<Character>
  onBet: DeskProps['onBet']
  onCancel: DeskProps['onCancel']
  delay: number
}

/** Le plateau d'un joueur : sur quoi (six tuiles), puis combien (des pièces). Le pari se pose dès que les deux sont choisis. */
function BetBoard({ bettor, wallets, odds, fighters, onBet, onCancel, delay }: BoardProps) {
  const style = styleOf(bettor)
  const key = odds?.key
  const placed = key ? (wallets.bets[key]?.[bettor] ?? null) : null
  const [pick, setPick] = useState<Pick | undefined>(placed?.pick)
  const [choice, setChoice] = useState<number | undefined>(
    placed ? (odds?.twist?.kind === 'doubleStakes' ? placed.stake / 2 : placed.stake) : undefined,
  )
  const [error, setError] = useState<string | null>(null)
  const rank = ranking(wallets).indexOf(bettor) + 1
  const choices = stakeChoices(wallets, bettor)
  const max = key ? available(wallets, key, bettor) : wallets.purses[bettor]

  const commit = (p: Pick | undefined, c: number | undefined) => {
    setPick(p)
    setChoice(c)
    setError(null)
    if (!p || c === undefined || !odds) return
    const err = onBet(bettor, p, c)
    setError(err)
    if (!err) sfx.coinLand()
  }
  const choosePick = (p: Pick) => {
    sfx.click()
    // Toucher à nouveau l'issue choisie retire le pari
    if (pick && samePick(pick, p)) {
      if (placed) onCancel(bettor)
      setPick(undefined)
      setError(null)
      return
    }
    commit(p, choice)
  }
  const chooseCoin = (c: number) => {
    sfx.click()
    commit(pick, c)
  }

  const line = odds ? odds.line : '…'
  const tile = (p: Pick, title: string, sub: string, side?: Side) => {
    const active = !!pick && samePick(pick, p)
    return (
      <button key={JSON.stringify(p)} onClick={() => choosePick(p)} className={`bet-tile ${active ? 'is-active' : ''}`} aria-pressed={active}>
        {side !== undefined ? (
          <Portrait character={fighters[side]} side={side} className="h-16 w-16 shrink-0 rounded-lg border border-black/70" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-black/70 bg-stone-950/80">
            <Icon name="turns" className="h-10 w-10" />
          </span>
        )}
        <span className="min-w-0 text-left leading-tight">
          <span className="block truncate font-display text-xl font-extrabold uppercase tracking-wider text-stone-100">{title}</span>
          <span className="block text-sm text-stone-400">{sub}</span>
        </span>
      </button>
    )
  }

  return (
    <div
      className={`bet-board codex-card w-[700px] bg-gradient-to-b ${style.bg} to-transparent ${placed ? style.glow : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex items-center justify-between border-b border-amber-900/40 px-6 py-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-lg font-bold text-stone-500">{rank === 1 ? '1er' : `${rank}e`}</span>
          <span className={`font-display text-4xl font-extrabold ${style.text}`}>{wallets.bettors[bettor].name}</span>
        </div>
        <span className="flex items-center gap-2 font-display text-3xl font-extrabold tabular-nums text-amber-100">
          <Icon name="purse" className="h-8 w-8" />
          {wallets.purses[bettor].toLocaleString('fr-FR')}
        </span>
      </header>

      <div className="px-6 pt-4">
        <p className="mb-2 font-display text-sm font-bold uppercase tracking-[0.3em] text-amber-300/80">Sur quoi ?</p>
        <div className="grid grid-cols-2 gap-3">
          {([0, 1] as Side[]).map((s) => tile({ market: 'winner', side: s }, fighters[s].name, 'gagne le combat', s))}
          {([0, 1] as Side[]).map((s) => tile({ market: 'rout', side: s }, fighters[s].name, 'écrase : gagne avec plus de la moitié de ses PV', s))}
          {tile({ market: 'duration', over: true }, 'Combat long', `plus de ${line} tours`)}
          {tile({ market: 'duration', over: false }, 'Combat court', `${line} tours ou moins`)}
        </div>
      </div>

      <div className="px-6 pb-5 pt-5">
        <p className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.3em] text-amber-300/80">
          <Icon name="bet-token" className="h-6 w-6" />
          Combien ?
        </p>
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-3">
            {choices.map((c) => {
              const stake = odds ? effectiveStake(odds, c) : c
              const active = choice === c
              return (
                <button
                  key={c}
                  onClick={() => chooseCoin(c)}
                  disabled={stake > max || !odds}
                  className={`bet-coin ${c === POKER_STAKE ? 'is-poker' : ''} ${active ? 'is-active' : ''}`}
                  aria-pressed={active}
                  title={c === POKER_STAKE ? 'Réservé au dernier du classement' : undefined}
                >
                  <span className="font-display text-2xl font-extrabold leading-none">{stake}</span>
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-wider">{STAKE_NAMES[c]}</span>
                </button>
              )
            })}
          </div>
          <div className="min-w-0 flex-1 text-right">
            {placed && odds ? (
              <>
                <p key={JSON.stringify(placed)} className="bet-stamp inline-block font-display text-2xl font-extrabold uppercase tracking-widest">
                  Pari posé
                </p>
                <p className="mt-1 truncate text-sm text-stone-300">
                  {placed.stake} sur {pickLabel(placed.pick, [fighters[0].name, fighters[1].name], odds.line)}
                </p>
                {placed.underdog && <p className="text-xs text-amber-300">Dernier du classement : gain doublé</p>}
              </>
            ) : (
              <p className="font-display text-lg text-stone-500">
                {!odds ? 'Les bookmakers réfléchissent…' : pick ? 'Posez une pièce' : 'Choisissez une issue'}
              </p>
            )}
            {error && <p className="mt-1 text-sm text-red-300">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Rappel des paris du match, sous le « VS » : les joueurs, puis les parieurs de l'ordinateur (sans dévoiler leur choix). */
export function BetSummary({ wallets, odds, fighterNames }: { wallets: Wallets; odds: MatchOdds | null; fighterNames: Pair<string> }) {
  const bets = odds ? wallets.bets[odds.key] : undefined
  return (
    <div className="flex flex-col items-center gap-1.5">
      {odds?.twist && <TwistBanner twist={odds.twist} names={fighterNames} line={odds.line} size="sm" />}
      {bettorsOf(wallets).map((b) => {
        const bet = bets?.[b]
        const def = wallets.bettors[b]
        return (
          <p key={b} className={`whitespace-nowrap rounded-full border ${styleOf(b).border} bg-stone-950/85 px-3 py-0.5 text-xs`}>
            <b className={styleOf(b).text}>{def.name}</b>{' '}
            {!bet ? (
              <span className="text-stone-500">pas de pari</span>
            ) : def.bot || !odds ? (
              <span className="text-stone-300">a misé {bet.stake}</span>
            ) : (
              <span className="text-stone-200">
                {bet.stake} sur {pickLabel(bet.pick, fighterNames, odds.line)}
              </span>
            )}
          </p>
        )
      })}
    </div>
  )
}

/**
 * Joueurs (pas l'ordinateur) qui ont misé sur un des matchs dont la clé commence par `prefix` : paris en attente ou
 * déjà réglés (journal). Arbre du tournoi : `t-<tour>-`, les mises de ce tour.
 */
export const humansWhoBet = (wallets: Wallets, prefix: string): Bettor[] =>
  humansOf(wallets).filter(
    (b) =>
      Object.entries(wallets.bets).some(([key, bets]) => key.startsWith(prefix) && !!bets[b]) ||
      wallets.ledger.some((e) => e.kind === 'settle' && e.bettor === b && e.key.startsWith(prefix)),
  )

/**
 * Panneau « Paris » de l'arbre du tournoi (docs/ref/tournoi-paris-ouverts.png) : le classement des parieurs, avec
 * leur fortune, et les mises des joueurs sur ce tour. On n'y parie pas : les mises se font à l'affrontement.
 */
export function BettingPanel({ wallets, placed, id }: { wallets: Wallets; placed: number; id?: string }) {
  return (
    <div id={id} role="dialog" aria-label="Paris" className="bets-panel">
      <div className="flex items-baseline justify-between px-4 pb-2.5 pt-3.5">
        <span className="font-display text-[14px] font-bold uppercase tracking-[0.16em] text-gold-300">Paris</span>
        <span className="font-data text-[12px] text-ink-3">{`mises de ce tour ${placed} / ${humansOf(wallets).length}`}</span>
      </div>
      <ol>
        {ranking(wallets).map((b, i) => (
          <li key={b} className="flex h-[41px] items-center gap-3 border-t border-line-1 px-4">
            <span className="w-4 font-data text-[12px] text-ink-3">{i + 1}</span>
            <span className={`h-2 w-2 rounded-full ${styleOf(b).dot}`} aria-hidden />
            <span className="flex-1 font-body text-[15px] font-bold text-ink-1">
              {wallets.bettors[b].name}
              <BotTag def={wallets.bettors[b]} />
            </span>
            <span className="font-data text-[14px] tabular-nums text-gold-300">{worthOf(wallets, b).toLocaleString('fr-FR')}</span>
          </li>
        ))}
      </ol>
      <p className="border-t border-line-1 px-4 py-3 font-body text-[13px] text-ink-3">Les mises se font depuis l'écran d'affrontement.</p>
    </div>
  )
}

/** Classement des parieurs, en ligne (écran du champion). */
export function Standings({ wallets }: { wallets: Wallets }) {
  return (
    <div className="flex items-center gap-2">
      {ranking(wallets).map((b, i) => (
        <div key={b} className={`flex items-center gap-2 rounded-lg border ${styleOf(b).border} bg-stone-950/85 px-3 py-1.5`}>
          <span className="font-display text-xs font-bold text-stone-500">{i + 1}</span>
          <span className={`font-display text-sm font-extrabold ${styleOf(b).text}`}>
            {wallets.bettors[b].name}
            <BotTag def={wallets.bettors[b]} />
          </span>
          <span className="font-mono text-sm tabular-nums text-stone-100">{worthOf(wallets, b).toLocaleString('fr-FR')}</span>
          {i === 0 && <Glyph name="tournoi" size={16} className="text-gold-300" />}
        </div>
      ))}
    </div>
  )
}

/** Compte animé d'un montant (de `from` à `to`). */
function CountUp({ from, to }: { from: number; to: number }) {
  const [value, setValue] = useState(from)
  useEffect(() => {
    if (from === to) return
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start - 600) / 1200)
      if (t > 0) setValue(Math.round(from + (to - from) * (1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [from, to])
  return <>{value.toLocaleString('fr-FR')}</>
}

export interface BetsOutcome {
  entries: LedgerEntry[]
  bettors: BettorDef[]
  /** Fortune de chaque parieur avant et après le règlement */
  before: number[]
  after: number[]
  line: number
  twist?: Twist
}

/** Résultat des paris d'un match et classement mis à jour (moitié droite de l'écran de fin). */
export function BetsResult({ outcome, fighterNames }: { outcome: BetsOutcome; fighterNames: Pair<string> }) {
  const { entries, bettors, before, after, line, twist } = outcome
  const settled = new Map(entries.flatMap((e) => (e.kind === 'settle' ? [[e.bettor, e] as const] : [])))
  const ids = bettors.map((_, i) => i)
  const order = [...ids].sort((a, b) => after[b] - after[a] || a - b)
  const oldRank = [...ids].sort((a, b) => before[b] - before[a] || a - b)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <h2 className="font-display text-4xl font-extrabold tracking-[0.25em] text-amber-200">PARIS</h2>
        <div className="codex-divider flex-1" />
      </div>
      {twist && <TwistBanner twist={twist} names={fighterNames} line={line} size="sm" />}

      <div className="flex flex-col gap-2">
        {ids.map((b) => {
          const e = settled.get(b)
          const net = e ? (e.void ? 0 : e.payout - e.bet.stake) : 0
          return (
            <div key={b} className="bet-result codex-card flex-row items-center gap-4 px-5 py-2.5" style={{ animationDelay: `${120 + b * 110}ms` }}>
              <p className={`w-36 shrink-0 font-display text-xl font-extrabold ${styleOf(b).text}`}>
                {bettors[b].name}
                <BotTag def={bettors[b]} />
              </p>
              <div className="min-w-0 flex-1">
                {e ? (
                  <>
                    <p className="truncate text-base text-stone-100">{pickLabel(e.bet.pick, fighterNames, line)}</p>
                    <p className="text-xs text-stone-500">
                      mise {e.bet.stake} · cote {oddsLabel(e.bet.odds)}
                      {e.bet.underdog && ' · gain doublé'}
                    </p>
                  </>
                ) : (
                  <p className="text-base text-stone-500">n'a pas parié</p>
                )}
              </div>
              {e && (
                <span
                  className={`bet-verdict rounded-md border px-2 py-0.5 font-display text-sm font-extrabold uppercase tracking-widest ${
                    e.void ? 'border-stone-600 text-stone-400' : e.won ? 'border-emerald-400/70 text-emerald-300' : 'border-red-500/60 text-red-400'
                  }`}
                  style={{ animationDelay: `${500 + b * 110}ms` }}
                >
                  {e.void ? 'Annulé' : e.won ? 'Gagné' : 'Perdu'}
                </span>
              )}
              <span className={`w-24 text-right font-display text-2xl font-extrabold tabular-nums ${net > 0 ? 'text-emerald-300' : net < 0 ? 'text-red-400' : 'text-stone-600'}`}>
                {net === 0 ? '—' : `${net > 0 ? '+' : '−'}${Math.abs(net)}`}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex items-center gap-4">
        <h3 className="font-display text-xl font-extrabold tracking-[0.25em] text-amber-200/90">CLASSEMENT</h3>
        <div className="codex-divider flex-1" />
      </div>
      <div className="flex flex-col gap-1.5">
        {order.map((b, i) => {
          const moved = oldRank.indexOf(b) - i
          return (
            <div
              key={b}
              className={`flex items-center gap-4 rounded-lg border px-5 py-2 ${i === 0 ? 'border-amber-400/60 bg-amber-500/10' : 'border-stone-800 bg-stone-900/60'}`}
            >
              <span className="w-8 font-display text-2xl font-extrabold text-stone-400">{i + 1}</span>
              <span className={`flex-1 font-display text-lg font-extrabold ${styleOf(b).text}`}>
                {bettors[b].name}
                <BotTag def={bettors[b]} />
              </span>
              <span className={`w-10 text-center text-xs font-bold ${moved > 0 ? 'text-emerald-300' : moved < 0 ? 'text-red-400' : 'text-stone-600'}`}>
                {moved > 0 ? `+${moved}` : moved < 0 ? `−${-moved}` : '='}
              </span>
              <span className="flex w-36 items-center justify-end gap-2 font-display text-2xl font-extrabold tabular-nums text-amber-100">
                <Icon name="purse" className="h-6 w-6" />
                <CountUp from={before[b]} to={after[b]} />
              </span>
              <span className="w-6">{i === 0 && <Glyph name="tournoi" size={24} className="text-gold-300" />}</span>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-stone-500">
        Fortune : bourse et mises en cours. Le dernier du classement double ses gains et peut tenter le coup de poker ({deniers(POKER_STAKE)}).
      </p>
    </div>
  )
}
