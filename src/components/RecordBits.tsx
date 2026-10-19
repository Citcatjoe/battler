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

/** Couleur d'un taux de victoire, en trois paliers (design system) : rouille sous 40 %, laiton de
 *  40 à 59 %, vert à partir de 60 %. Le chiffre est toujours affiché à côté. */
export const winColor = (rate: number) =>
  rate < 0.4 ? 'var(--rate-low)' : rate < 0.6 ? 'var(--rate-mid)' : 'var(--good)'

/** Classe de texte du palier d'un taux de victoire (voir winColor). */
export const WIN_TEXT = (rate: number) => (rate < 0.4 ? 'text-rate-low' : rate < 0.6 ? 'text-rate-mid' : 'text-good')

export function WinBar({ rate }: { rate: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-(--r-xs) bg-surface-3">
        {rate !== null && (
          <div className="h-full rounded-(--r-xs)" style={{ width: `${rate * 100}%`, background: winColor(rate) }} />
        )}
      </div>
      <span className="w-12 text-right font-data text-[14px] font-medium tabular-nums text-ink-1">{fmtPct(rate)}</span>
    </div>
  )
}

export function Kpi({ label, value, accent }: { label: ReactNode; value: string | number; accent?: string }) {
  return (
    <div className="rounded-(--r-xs) border border-line-1 bg-surface-1/60 px-3 py-2">
      <p className="font-body text-[13px] uppercase tracking-wider text-ink-3">{label}</p>
      <p className={`font-data text-2xl font-medium tabular-nums ${accent ?? 'text-ink-1'}`}>{value}</p>
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
    <li className="flex items-center gap-2 border-b border-line-1 py-1.5 font-body text-[14px]">
      {won !== null && (
        <span className={`w-5 font-bold ${won ? 'text-good' : 'text-bad'}`}>{won ? 'V' : 'D'}</span>
      )}
      <span className="flex-1 truncate">
        <span className={match.winner === 0 ? 'font-bold text-ink-1' : 'text-ink-2'}>{a}</span>
        <span className="text-ink-off"> vs </span>
        <span className={match.winner === 1 ? 'font-bold text-ink-1' : 'text-ink-2'}>{b}</span>
      </span>
      <span className="font-data text-[13px] text-ink-3">{match.turns} t.</span>
      {match.tournament && (
        <span title="Match de tournoi">
          <Icon name="trophy" />
        </span>
      )}
      <span title={match.mode === 'simulated' ? 'Simulé' : 'Joué'}>
        <Icon name={match.mode === 'simulated' ? 'lightning' : 'swords'} />
      </span>
      <span className="w-24 text-right font-data text-[13px] tabular-nums text-ink-3">{dateFmt.format(match.at)}</span>
    </li>
  )
}

export function MiniPortrait({ character, size = 'h-10 w-10' }: { character: Character; size?: string }) {
  return (
    <div className={`shrink-0 overflow-hidden rounded-(--r-xs) border border-line-2 ${size}`}>
      <Portrait character={character} side={0} className="h-full w-full" />
    </div>
  )
}
