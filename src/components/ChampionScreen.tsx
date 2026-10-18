import type { ChampionRun } from '../game/tournament'
import { ROUND_NAMES } from '../game/tournament'
import { createCharacter } from '../game/roster'
import { Fighter } from './Fighter'
import { Icon } from './Icon'
import { MiniPortrait } from './RecordBits'
import type { Wallets } from '../game/betting'
import { Standings } from './Betting'

interface Props {
  run: ChampionRun
  onBracket: () => void
  onNewTournament: () => void
  onMenu: () => void
  /** Classement final des parieurs (docs/PARIS.md) ; absent : tournoi sans paris */
  wallets?: Wallets | null
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)} %` : '—')

/**
 * Sacre du tournoi : le champion en grand, dans un rai de lumière dorée, son parcours (quatre
 * victoires) et le bilan cumulé de son tournoi (dégâts, critiques, soins, compétences…).
 */
export function ChampionScreen({ run, onBracket, onNewTournament, onMenu, wallets }: Props) {
  const character = createCharacter(run.entrant.characterId)
  const { totals } = run
  const final = run.matches[run.matches.length - 1]
  const tiles: { label: string; value: string | number; sub?: string; accent?: string }[] = [
    { label: 'Dégâts infligés', value: totals.damage, sub: `${totals.hits} coups réussis sur ${totals.attacks}`, accent: 'text-red-300' },
    { label: 'Critiques', value: totals.crits, sub: `${totals.critDamage} dégâts critiques`, accent: 'text-amber-300' },
    { label: 'Plus gros coup', value: totals.best || '—', accent: 'text-amber-200' },
    { label: 'PV regagnés', value: totals.healed, accent: 'text-emerald-300' },
    { label: 'Esquives', value: totals.dodges, accent: 'text-cyan-200' },
    { label: 'Compétences', value: totals.events, sub: 'déclenchées', accent: 'text-violet-300' },
    { label: 'Précision', value: pct(totals.hits, totals.attacks), accent: 'text-stone-100' },
    { label: 'Dégâts encaissés', value: totals.damageTaken, sub: `${totals.absorbed} absorbés`, accent: 'text-stone-300' },
  ]
  return (
    <div className="champion-screen fade-in relative flex h-full overflow-hidden">
      {/* Rai de lumière et poussière dorée derrière le champion */}
      <div className="champion-rays pointer-events-none absolute -left-[10%] top-[-30%] h-[160%] w-[70%]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_28%_70%,rgba(251,191,36,0.22)_0%,transparent_55%)]" />

      <div className="relative flex w-[600px] shrink-0 flex-col items-center justify-end pb-10">
        <div className="champion-pedestal absolute bottom-[52px] h-[60px] w-[420px] rounded-[50%]" />
        <div className="relative h-[640px]">
          <Fighter character={character} side={0} state="victory" />
        </div>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-6 py-10 pr-24">
        <header>
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.4em] text-amber-300">
            <Icon name="trophy" className="h-7 w-7" /> Champion du tournoi
          </p>
          <h1 className="champion-name font-display text-8xl font-extrabold leading-none">{run.entrant.label}</h1>
          <p className="mt-2 text-lg text-stone-400">
            {character.race} · {character.archetype} · {run.matches.length} victoires en {totals.turns} tours
            {final && <> · {final.hpLeft} PV restants en finale</>}
          </p>
        </header>

        {wallets && (
          <div className="flex items-center gap-3" aria-label="Classement des parieurs">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-stone-500">Parieurs</span>
            <Standings wallets={wallets} />
          </div>
        )}

        <div className="codex-divider" />

        <section className="grid grid-cols-4 gap-3" aria-label="Bilan du tournoi">
          {tiles.map((t) => (
            <div key={t.label} className="champion-tile px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{t.label}</p>
              <p className={`font-display text-4xl font-extrabold tabular-nums ${t.accent ?? ''}`}>{t.value}</p>
              {t.sub && <p className="text-xs text-stone-500">{t.sub}</p>}
            </div>
          ))}
        </section>

        <div className="grid grid-cols-[1fr_300px] gap-6">
          <section aria-label="Parcours">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-stone-500">Parcours</h2>
            <ol className="space-y-1.5">
              {run.matches.map((m) => (
                <li key={m.round} className="champion-tile flex items-center gap-3 px-3 py-1.5">
                  <span className="w-36 shrink-0 text-xs font-bold uppercase tracking-wider text-amber-200/80">{ROUND_NAMES[m.round]}</span>
                  <MiniPortrait character={createCharacter(m.opponent.characterId)} size="h-8 w-8" />
                  <span className="min-w-0 flex-1 truncate font-display font-bold text-stone-200">{m.opponent.label}</span>
                  <span className="font-mono text-xs tabular-nums text-stone-400">
                    {m.turns} tours · {m.hpLeft} PV
                  </span>
                  <Icon name={m.mode === 'simulated' ? 'lightning' : 'swords'} className="h-5 w-5 opacity-70" />
                </li>
              ))}
            </ol>
          </section>
          <section aria-label="Compétences déclenchées">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-stone-500">Compétences</h2>
            {run.skills.length === 0 ? (
              <p className="text-sm italic text-stone-500">Aucune compétence déclenchée.</p>
            ) : (
              <ul className="space-y-1.5">
                {run.skills.map(([name, n]) => (
                  <li key={name} className="flex items-center justify-between rounded-md border border-violet-400/30 bg-violet-950/30 px-3 py-1.5 text-sm text-violet-100">
                    <span>{name}</span>
                    <b className="font-mono tabular-nums">×{n}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onNewTournament} className="btn btn-primary btn-md w-72">
            <Icon name="trophy" className="btn-icon" />
            <span>Nouveau tournoi</span>
          </button>
          <button onClick={onBracket} className="btn btn-md w-56">
            <span>Voir l'arbre</span>
          </button>
          <button onClick={onMenu} className="btn btn-md w-40">
            <span>Menu</span>
          </button>
        </div>
      </div>
    </div>
  )
}
