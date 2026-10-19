import { useState } from 'react'
import { statusCatalog, type StatusEntry } from '../../game/catalog'
import { POLARITY_STYLE, STATUS_DURATION_RULE, type Polarity } from '../../game/statuses'
import { StatusIcon } from '../Icon'
import { Tabs } from '../Tabs'

const LABEL: Record<Polarity, string> = { positive: 'Bonus', negative: 'Malus' }

/**
 * Verticale « Bonus et malus » : la liste de tous les effets qu'on peut rencontrer en combat.
 * Seuls les statuts réellement posés par un personnage y figurent (les statuts « à venir »
 * restent dans docs/STATUTS.md). Second niveau de tri : bonus ou malus.
 */
export function StatusesSection() {
  const inGame = statusCatalog().filter((e) => e.inGame)
  const [polarity, setPolarity] = useState<Polarity>('positive')
  const shown = inGame.filter((e) => e.def.polarity === polarity)
  const count = (p: Polarity) => inGame.filter((e) => e.def.polarity === p).length

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex items-center justify-between gap-8">
        <Tabs
          value={polarity}
          onChange={setPolarity}
          tabs={(['positive', 'negative'] as Polarity[]).map((p) => ({ id: p, label: LABEL[p], hint: count(p) }))}
        />
        <p className="max-w-xl text-right text-xs leading-relaxed text-stone-500">{STATUS_DURATION_RULE}</p>
      </div>

      <div key={polarity} className="fade-in min-h-0 flex-1 overflow-y-auto pr-1">
        {shown.length === 0 ? (
          <p className="italic text-stone-500">Aucun {LABEL[polarity].toLowerCase()} en jeu pour l'instant.</p>
        ) : (
          <ul className="grid grid-cols-4 gap-5">
            {shown.map((e) => (
              <li key={e.id}>
                <StatusCard entry={e} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * Carte à proportions fixes : médaillon, nom, effet et règles. Un statut est présenté comme
 * une règle neutre : on ne dit pas qui le pose (la provenance ne sert qu'au filtre « en jeu »).
 */
function StatusCard({ entry }: { entry: StatusEntry }) {
  const { def, rules } = entry
  const positive = def.polarity === 'positive'
  return (
    <article className={`codex-card aspect-[4/5] ${positive ? 'codex-positive' : 'codex-negative'}`}>
      <header className="flex flex-col items-center gap-2 pt-5 text-center">
        <div
          className={`h-20 w-20 rounded-full border-2 bg-stone-950/80 p-1 ${
            positive
              ? 'border-emerald-400 shadow-[0_0_22px_rgba(52,211,153,0.45)]'
              : 'border-red-500 shadow-[0_0_22px_rgba(239,68,68,0.5)]'
          }`}
        >
          <StatusIcon id={entry.id} className="h-full w-full" />
        </div>
        <h4 className="font-display text-xl font-extrabold leading-tight text-amber-100">{def.name}</h4>
        <span
          className={`rounded-(--r-xs) border px-2 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-[0.2em] ${POLARITY_STYLE[def.polarity].chip}`}
        >
          {POLARITY_STYLE[def.polarity].label}
        </span>
      </header>

      <p className="px-5 pt-3 text-center text-sm leading-snug text-stone-200">{def.summary}</p>

      <div className="codex-divider mx-5 my-3" />

      <ul className="flex-1 space-y-1 overflow-hidden px-5 text-xs leading-snug text-stone-400">
        {rules.map((rule) => (
          <li key={rule} className="flex gap-1.5">
            <span className="text-amber-500/70">◆</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>

    </article>
  )
}
