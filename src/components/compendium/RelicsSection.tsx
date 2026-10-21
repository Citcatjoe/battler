import { useState } from 'react'
import { describeRelic, OFFER_SIZE, RELIC_KINDS, relicKind, RELICS, type Relic, type RelicKind } from '../../game/relics'
import { RelicSeal } from '../RelicSeal'
import { CodexBox, StatusChip, useFocusRef } from './CodexBits'
import { matches, type CompendiumNav, type SectionProps } from './sections'

type KindFilter = RelicKind | 'all'

const KINDS = Object.keys(RELIC_KINDS) as RelicKind[]

/**
 * Section « Reliques » : les objets gagnés en tournoi (registre `relics.ts`), même disposition que les Statuts :
 * l'index groupé par type à gauche (filtre par type), le détail de la relique choisie à droite. Le texte vient de
 * `describeRelic`, la seule rédaction d'une relique.
 */
export function RelicsSection({ nav, focus, filter }: SectionProps) {
  const [kind, setKind] = useState<KindFilter>('all')
  const focusRef = useFocusRef<HTMLButtonElement>(focus)
  const count = (k: KindFilter) => RELICS.filter((r) => k === 'all' || relicKind(r) === k).length
  const shown = RELICS.filter((r) => {
    const d = describeRelic(r)
    return (kind === 'all' || relicKind(r) === kind) && matches(filter, r.name, r.flavor, d.moment, d.text)
  })
  const selected = RELICS.find((r) => r.id === focus) ?? shown[0] ?? RELICS[0]

  if (!selected) return <p className="codex-panel p-6 font-body italic text-ink-3">Aucune relique pour l'instant.</p>

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex gap-2">
        {(['all', ...KINDS] as KindFilter[]).map((k) => (
          <button key={k} type="button" className="codex-pill" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k === 'all' ? 'Toutes' : RELIC_KINDS[k].label}
            <span className="font-data text-[13px] font-normal text-ink-3">{count(k)}</span>
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[520px_1fr] gap-6">
        <nav aria-label="Reliques" className="codex-panel scroll-panel min-h-0 overflow-y-auto">
          {shown.length === 0 && <p className="p-4 font-body italic text-ink-3">Aucune relique ne correspond.</p>}
          {KINDS.map((k) => {
            const group = shown.filter((r) => relicKind(r) === k)
            if (group.length === 0) return null
            return (
              <section key={k}>
                <h3 className="codex-label bg-surface-2/70 px-4 py-1.5">
                  {RELIC_KINDS[k].label} · {group.length}
                </h3>
                {group.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    ref={r.id === focus ? focusRef : undefined}
                    aria-current={r.id === selected.id}
                    onClick={() => nav.go({ section: 'relics', id: r.id })}
                    className="codex-row w-full"
                  >
                    <RelicSeal relic={r} size={40} />
                    <span className="min-w-0">
                      <span className="block font-display text-[17px] font-bold leading-tight text-ink-1">{r.name}</span>
                      <span className="block truncate font-body text-[14px] text-ink-3">{describeRelic(r).text}</span>
                    </span>
                  </button>
                ))}
              </section>
            )
          })}
        </nav>
        <RelicDetail key={selected.id} relic={selected} nav={nav} />
      </div>
    </div>
  )
}

function RelicDetail({ relic, nav }: { relic: Relic; nav: CompendiumNav }) {
  const { moment, text, tags, posed } = describeRelic(relic)
  const kind = relicKind(relic)
  return (
    <article className="codex-panel fade-in scroll-panel flex min-h-0 flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center gap-5">
        <RelicSeal relic={relic} size={88} />
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-4xl font-extrabold text-amber-100">{relic.name}</h2>
            <span className="rounded-(--r-xs) border border-gold-500/70 bg-gold-500/15 px-2 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-[0.2em] text-gold-300">
              {RELIC_KINDS[kind].label}
            </span>
          </div>
          <p className="mt-1 font-body text-[17px] italic leading-snug text-amber-200/80">{relic.flavor}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <CodexBox title="Quand">
          <p>{moment}</p>
          {tags.map((t) => (
            <p key={t} className="text-ink-3">
              {t}
            </p>
          ))}
        </CodexBox>
        <CodexBox title="Effet">
          <p>{text}</p>
          {posed.map((p) => (
            <StatusChip key={p.status} status={p.status} target={p.target} nav={nav} />
          ))}
        </CodexBox>
      </div>

      <CodexBox title={`Type · ${RELIC_KINDS[kind].label}`}>
        <p>{RELIC_KINDS[kind].summary}</p>
      </CodexBox>

      <p className="mt-auto font-body text-[14px] text-ink-3">
        Une relique se gagne en tournoi : à chaque victoire, le vainqueur en choisit une parmi {OFFER_SIZE}.
      </p>
    </article>
  )
}
