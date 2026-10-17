import type { ReactNode } from 'react'
import type { Character } from '../game/character'
import type { MatchRecord } from '../game/history'
import { ROSTER } from '../game/roster'
import { Portrait } from './Portrait'
import { Icon } from './Icon'

export const fmtPct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)} %`)
export const fmtNum = (v: number | null, digits = 1) =>
  v === null ? '—' : v.toLocaleString('fr-FR', { maximumFractionDigits: digits })

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** Couleur d'un taux de victoire : rouge (0 %) → ambre (50 %) → vert (100 %). */
export const winColor = (rate: number) => `hsl(${Math.round(rate * 130)} 70% 55%)`

export function WinBar({ rate }: { rate: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-800">
        {rate !== null && (
          <div className="h-full rounded-full" style={{ width: `${rate * 100}%`, background: winColor(rate) }} />
        )}
      </div>
      <span className="w-12 text-right font-mono text-sm tabular-nums">{fmtPct(rate)}</span>
    </div>
  )
}

export function Kpi({ label, value, accent }: { label: ReactNode; value: string | number; accent?: string }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-stone-500">{label}</p>
      <p className={`font-display text-2xl font-extrabold ${accent ?? 'text-stone-100'}`}>{value}</p>
    </div>
  )
}

const nameOf = (id: string, fallback: string) => ROSTER.find((c) => c.id === id)?.name ?? fallback

/** Une ligne d'historique ; `focus` met en avant le point de vue d'un personnage. */
export function MatchRow({ match, focus }: { match: MatchRecord; focus?: string }) {
  const [a, b] = [0, 1].map((i) => nameOf(match.fighters[i], match.names[i]))
  const focusSide = focus ? match.fighters.indexOf(focus) : -1
  const won = focusSide === -1 ? null : match.winner === focusSide
  return (
    <li className="flex items-center gap-2 border-b border-stone-800/70 py-1.5 text-xs">
      {won !== null && (
        <span className={`w-5 font-bold ${won ? 'text-emerald-400' : 'text-red-400'}`}>{won ? 'V' : 'D'}</span>
      )}
      <span className="flex-1 truncate">
        <span className={match.winner === 0 ? 'font-bold text-stone-100' : 'text-stone-400'}>{a}</span>
        <span className="text-stone-600"> vs </span>
        <span className={match.winner === 1 ? 'font-bold text-stone-100' : 'text-stone-400'}>{b}</span>
      </span>
      <span className="text-stone-500">{match.turns} t.</span>
      {match.tournament && (
        <span title="Match de tournoi">
          <Icon name="trophy" />
        </span>
      )}
      <span title={match.mode === 'simulated' ? 'Simulé' : 'Joué'}>
        <Icon name={match.mode === 'simulated' ? 'lightning' : 'swords'} />
      </span>
      <span className="w-20 text-right tabular-nums text-stone-500">{dateFmt.format(match.at)}</span>
    </li>
  )
}

export function MiniPortrait({ character, size = 'h-10 w-10' }: { character: Character; size?: string }) {
  return (
    <div className={`shrink-0 overflow-hidden rounded-md border border-stone-700 ${size}`}>
      <Portrait character={character} side={0} className="h-full w-full" />
    </div>
  )
}
