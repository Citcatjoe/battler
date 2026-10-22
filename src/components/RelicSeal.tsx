import { describeRelic, elementLabel, RELIC_KINDS, relicKind, type Relic } from '../game/relics'
import { POLARITY_STYLE, STATUSES } from '../game/statuses'
import { RelicIcon, StatusIcon } from './Icon'

/*
 * Identité des reliques (docs/RELIQUES.md § Identité visuelle) : un sceau HEXAGONAL à bord biseauté, cadre d'or
 * éclairé du haut à gauche, jour sombre, plaque de cuir brun. Les compétences ont l'octogone (SkillSeal), les
 * statuts le médaillon rond : la forme seule dit « relique », à toutes les tailles. Le motif est l'icône peinte de
 * la relique (`src/assets/icons/<id>.png`, RelicIcon), son initiale en attendant.
 */

interface SealProps {
  relic: Relic
  /** Hauteur du sceau en pixels (la largeur suit l'hexagone) */
  size: number
  /** Toutes ses charges sont dépensées : le sceau s'éteint */
  spent?: boolean
  /** Charges restantes, en pastille (absent : pas de pastille) */
  charges?: number
  /** L'éclat d'un déclenchement : rejoué à chaque nouvelle clé */
  pulse?: number
}

export function RelicSeal({ relic, size, spent, charges, pulse }: SealProps) {
  return (
    <span
      className="relic-seal"
      style={{ height: size, width: Math.round(size * 0.88) }}
      data-spent={spent || undefined}
      data-size={size < 30 ? 'xs' : undefined}
    >
      {pulse !== undefined && <span key={`glint-${pulse}`} aria-hidden className="relic-seal-glint" />}
      <span key={`body-${pulse ?? 'idle'}`} className={`relic-seal-frame ${pulse !== undefined ? 'relic-seal-flash' : ''}`}>
        <span className="relic-seal-plate" style={{ fontSize: size * 0.42 }}>
          <RelicIcon id={relic.id} name={relic.name} className="h-[62%] w-[62%]" />
        </span>
      </span>
      {charges !== undefined && <span className="relic-seal-count">{charges}</span>}
    </span>
  )
}

const ALIGN = { left: 'left-0', center: 'left-1/2 -translate-x-1/2', right: 'right-0' }

/**
 * Infobulle d'une relique : nom, type, moment, effet, pastilles, phrase d'ambiance, et ses charges en combat.
 * Elle s'ouvre au survol de SON sceau seulement (groupe nommé `group/relic`) : un `group-hover` nu réagirait au
 * survol de n'importe quel ancêtre `group` (la ligne de l'arbre du tournoi, par exemple) et ouvrirait d'un coup
 * les infobulles de toutes les reliques du combattant, superposées.
 */
export function RelicTooltip({
  relic,
  placement,
  align,
  left,
}: {
  relic: Relic
  placement: 'above' | 'below'
  align: keyof typeof ALIGN
  /** En combat : charges restantes */
  left?: number
}) {
  const { moment, text, tags, posed } = describeRelic(relic)
  return (
    <div
      role="tooltip"
      className={`pointer-events-none invisible absolute z-[70] w-80 rounded-(--r-sm) border border-gold-500/60 bg-surface-1/95 px-4 py-3 text-left opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover/relic:visible group-hover/relic:opacity-100 ${
        placement === 'above' ? 'bottom-full mb-3' : 'top-full mt-3'
      } ${ALIGN[align]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-display text-lg font-extrabold leading-tight text-ink-1">
          <RelicSeal relic={relic} size={34} />
          {relic.name}
        </span>
        <span className="shrink-0 rounded-(--r-xs) border border-gold-500/60 bg-gold-500/15 px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider text-gold-300">
          {RELIC_KINDS[relicKind(relic)].label}
        </span>
      </div>
      {relic.element && <p className="mt-1 font-body text-[13px] font-bold uppercase tracking-wider text-gold-300">{elementLabel(relic)}</p>}
      <p className="mt-1 font-body text-[13px] font-medium text-gold-300">{[moment, ...tags].join(' · ')}</p>
      <div className="codex-divider my-2.5" />
      <p className="font-body text-[15px] leading-snug text-ink-1">{text}</p>
      {posed.map((p) => (
        <p key={p.status} className="mt-2 flex items-center gap-1.5 font-body text-[14px] font-bold text-ink-1">
          <StatusIcon id={p.status} className="h-6 w-6" />
          {STATUSES[p.status].name}
          <span className={`font-normal ${STATUSES[p.status].polarity === 'positive' ? 'text-good' : 'text-bad'}`}>
            {POLARITY_STYLE[STATUSES[p.status].polarity].label.toLowerCase()}
            {p.target === 'opponent' ? ' · adversaire' : ' · sur soi'}
          </span>
        </p>
      ))}
      {left !== undefined && (
        <p className={`mt-2 font-body text-[14px] font-bold ${left > 0 ? 'text-gold-300' : 'text-ink-3'}`}>
          {left > 0 ? `${left} charge${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}` : 'Dépensée pour ce combat'}
        </p>
      )}
      <p className="mt-2 font-body text-[13px] italic leading-snug text-ink-3">{relic.flavor}</p>
    </div>
  )
}

/**
 * Les reliques d'un combattant, en rangée de sceaux avec leur infobulle : à côté du nom en combat (charges
 * restantes, éclat au déclenchement), sous la fiche de l'écran d'affrontement, dans l'arbre du tournoi.
 */
export function RelicRow({
  relics,
  size = 36,
  tooltip = 'below',
  align = 'left',
  uses,
  pulse,
}: {
  relics: readonly Relic[]
  size?: number
  tooltip?: 'above' | 'below'
  align?: keyof typeof ALIGN
  /** En combat : déclenchements de chaque relique jusqu'ici (charges restantes, sceau éteint) */
  uses?: Readonly<Record<string, number>>
  /** En combat : reliques qui viennent d'agir, et la clé de leur éclat */
  pulse?: { relics: readonly string[]; key: number }
}) {
  if (relics.length === 0) return null
  return (
    <ul className={`flex items-center ${size < 24 ? 'gap-0.5' : 'gap-1.5'} ${align === 'right' ? 'flex-row-reverse' : ''}`} aria-label="Reliques">
      {relics.map((r) => {
        const left = uses && r.charges !== undefined ? r.charges - (uses[r.id] ?? 0) : undefined
        return (
          <li key={r.id} className="group/relic relative cursor-help hover:z-[70]" aria-label={r.name}>
            <RelicSeal relic={r} size={size} charges={left} spent={left === 0} pulse={pulse?.relics.includes(r.id) ? pulse.key : undefined} />
            <RelicTooltip relic={r} placement={tooltip} align={align} left={left} />
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Carte d'une relique à choisir (récompense de tournoi) : le grand sceau, le nom, le type, quand elle agit, ce
 * qu'elle fait et sa phrase d'ambiance. `mark` : bandeau au-dessus de la carte (« Choix de Gorak »).
 */
export function RelicCard({ relic, selected, mark, onSelect }: { relic: Relic; selected: boolean; mark?: string; onSelect: () => void }) {
  const { moment, text, tags } = describeRelic(relic)
  return (
    <button type="button" className="relic-card" aria-pressed={selected} onClick={onSelect}>
      {mark && <span className="relic-card-mark">{mark}</span>}
      <RelicSeal relic={relic} size={104} />
      <span className="font-display text-[26px] font-extrabold leading-tight text-ink-1">{relic.name}</span>
      <span className="rounded-(--r-xs) border border-gold-500/60 bg-gold-500/15 px-2 py-px font-body text-[13px] font-bold uppercase tracking-[0.2em] text-gold-300">
        {RELIC_KINDS[relicKind(relic)].label}
      </span>
      {relic.element && <span className="font-body text-[14px] font-bold uppercase tracking-[0.15em] text-gold-300">{elementLabel(relic)}</span>}
      <span className="font-body text-[15px] font-bold text-gold-300">{[moment, ...tags].join(' · ')}</span>
      <span className="font-body text-[18px] leading-snug text-ink-1">{text}</span>
      <span className="mt-auto font-body text-[14px] italic leading-snug text-ink-3">{relic.flavor}</span>
    </button>
  )
}
