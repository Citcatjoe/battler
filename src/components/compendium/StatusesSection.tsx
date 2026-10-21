import { useState } from 'react'
import type { Character } from '../../game/character'
import { statusCatalog, statusLinks, type StatusEntry } from '../../game/catalog'
import type { CharacterEvent, Target } from '../../game/events'
import { RULES } from '../../game/rules'
import { POLARITY_STYLE, STATUSES, type Polarity } from '../../game/statuses'
import { CharacterLink, CodexBox, racePlural, skillLine, SkillMedal, StatusMedal, useFocusRef } from './CodexBits'
import { matches, type CompendiumNav, type SectionProps } from './sections'

type PolarityFilter = Polarity | 'all'

const FILTERS: { id: PolarityFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'positive', label: POLARITY_STYLE.positive.label },
  { id: 'negative', label: POLARITY_STYLE.negative.label },
]

/**
 * Section « Statuts » : bonus et malus réunis dans un seul index (polarité dite par la couleur et par le mot),
 * et le détail du statut choisi : effet, consommation, cumul, qui le pose, interactions. Seuls les statuts mis
 * en jeu par une compétence y figurent ; les statuts « à venir » restent dans docs/STATUTS.md.
 */
export function StatusesSection({ nav, focus, filter }: SectionProps) {
  const [polarity, setPolarity] = useState<PolarityFilter>('all')
  const focusRef = useFocusRef<HTMLButtonElement>(focus)
  const inGame = statusCatalog().filter((e) => e.inGame)
  const count = (p: PolarityFilter) => inGame.filter((e) => p === 'all' || e.def.polarity === p).length
  const shown = inGame.filter((e) => (polarity === 'all' || e.def.polarity === polarity) && matches(filter, e.def.name, e.def.summary))
  const selected = inGame.find((e) => e.id === focus) ?? shown[0] ?? inGame[0]

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="codex-pill" aria-pressed={polarity === f.id} onClick={() => setPolarity(f.id)}>
            {f.id !== 'all' && <span className="seal h-3 w-3" data-tone={f.id} />}
            {f.label}
            <span className="font-data text-[13px] font-normal text-ink-3">{count(f.id)}</span>
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[520px_1fr] gap-6">
        <nav aria-label="Statuts" className="codex-panel scroll-panel min-h-0 overflow-y-auto">
          {shown.length === 0 && <p className="p-4 font-body italic text-ink-3">Aucun statut ne correspond.</p>}
          {(['positive', 'negative'] as Polarity[]).map((p) => {
            const group = shown.filter((e) => e.def.polarity === p)
            if (group.length === 0) return null
            return (
              <section key={p}>
                <h3 className={`codex-label bg-surface-2/70 px-4 py-1.5 ${p === 'positive' ? 'text-good!' : 'text-bad!'}`}>
                  {POLARITY_STYLE[p].label} · {group.length}
                </h3>
                {group.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    ref={e.id === focus ? focusRef : undefined}
                    aria-current={e.id === selected.id}
                    onClick={() => nav.go({ section: 'statuses', id: e.id })}
                    className="codex-row w-full"
                  >
                    <StatusMedal id={e.id} size={40} />
                    <span className="min-w-0">
                      <span className="block font-display text-[17px] font-bold leading-tight text-ink-1">{e.def.name}</span>
                      <span className="block truncate font-body text-[14px] text-ink-3">{e.def.summary}</span>
                    </span>
                  </button>
                ))}
              </section>
            )
          })}
        </nav>
        <StatusDetail key={selected.id} entry={selected} nav={nav} />
      </div>
    </div>
  )
}

/** Une compétence qui pose le statut, et ses porteurs : sources réunies par compétence. */
interface Poser {
  event: CharacterEvent
  target?: Target
  owners: Character[]
  released?: boolean
}

function StatusDetail({ entry, nav }: { entry: StatusEntry; nav: CompendiumNav }) {
  const { def, rules } = entry
  const posers: Poser[] = []
  for (const s of entry.sources) {
    // Un statut de forme (druide) n'a pas de compétence qui le pose : le moteur le pose avec la forme
    if (s.kind === 'status' || s.kind === 'form') continue
    const known = posers.find((p) => p.event.id === s.event.id)
    if (known) known.owners.push(s.character)
    else posers.push({ event: s.event, owners: [s.character], ...(s.kind === 'skill' ? { target: s.target } : { released: true }) })
  }
  const byStatus = entry.sources.flatMap((s) => (s.kind === 'status' ? [s.status] : []))
  const links = statusLinks(entry.id)

  return (
    <article className="codex-panel fade-in scroll-panel flex min-h-0 flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center gap-5">
        <StatusMedal id={entry.id} size={88} />
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-4xl font-extrabold text-amber-100">{def.name}</h2>
            <span
              className={`rounded-(--r-xs) border px-2 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-[0.2em] ${POLARITY_STYLE[def.polarity].chip}`}
            >
              {POLARITY_STYLE[def.polarity].label}
            </span>
          </div>
          <p className="mt-1 font-body text-[17px] leading-snug text-ink-2">{def.summary}</p>
        </div>
      </header>

      <div className={`grid gap-3 ${rules.effect.length > 0 ? 'grid-cols-[1.6fr_1.2fr_1fr]' : 'grid-cols-2'}`}>
        {rules.effect.length > 0 && (
          <CodexBox title="Effet">
            {rules.effect.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </CodexBox>
        )}
        <CodexBox title="Consommation">
          {rules.consumption.map((t) => (
            <p key={t}>{t}</p>
          ))}
          <RuleLink nav={nav} id="duration" />
        </CodexBox>
        <CodexBox title="Cumul">
          <RuleLink nav={nav} id={rules.stacking} />
          {rules.maxStacks !== undefined && (
            <p>
              <button type="button" className="codex-link" onClick={() => nav.go({ section: 'rules', id: 'max-stacks' })}>
                {RULES['max-stacks'].title}
              </button>{' '}
              : {rules.maxStacks} charge{rules.maxStacks > 1 ? 's' : ''}
            </p>
          )}
        </CodexBox>
      </div>

      <section>
        <h3 className="codex-label mb-1 border-b border-line-2 pb-1">Posé par</h3>
        {posers.map((p) => (
          <div key={p.event.id} className="flex items-center gap-3 border-b border-line-1 py-2.5">
            <SkillMedal event={p.event} size={40} />
            <div className="min-w-0 flex-1">
              <button type="button" className="codex-link font-display text-[17px] font-bold" onClick={() => nav.go({ section: 'skills', id: p.event.id })}>
                {p.event.name}
              </button>
              <p className="font-body text-[14px] text-ink-3">
                {skillLine(p.event)}
                {p.released ? ' · le relâche' : p.target === 'opponent' ? " · sur l'adversaire" : ' · sur soi'}
              </p>
            </div>
            <p className="max-w-[260px] text-right font-body text-[15px] text-ink-3">
              {racePlural(p.owners[0].race)} ·{' '}
              {p.owners.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ', '}
                  <CharacterLink character={c} nav={nav} />
                </span>
              ))}
            </p>
          </div>
        ))}
        {byStatus.map((id) => (
          <div key={id} className="flex items-center gap-3 border-b border-line-1 py-2.5">
            <StatusMedal id={id} size={40} />
            <p className="font-body text-[15px] text-ink-2">
              Aussi posé par le statut{' '}
              <button type="button" className="codex-link font-bold" onClick={() => nav.go({ section: 'statuses', id })}>
                {STATUSES[id].name}
              </button>
            </p>
          </div>
        ))}
      </section>

      {links.length > 0 && (
        <section>
          <h3 className="codex-label mb-1 border-b border-line-2 pb-1">Interactions</h3>
          {links.map((l) => (
            <div key={l.text} className="flex items-center gap-3 border-b border-line-1 py-2">
              {l.status && <StatusMedal id={l.status} size={32} />}
              {l.skill && <SkillMedal event={l.skill.event} size={32} />}
              {l.status || l.skill ? (
                <button
                  type="button"
                  className="codex-link text-left font-body text-[15px]"
                  onClick={() => nav.go(l.status ? { section: 'statuses', id: l.status } : { section: 'skills', id: l.skill?.event.id })}
                >
                  {l.text}
                </button>
              ) : (
                <p className="font-body text-[15px] text-ink-2">{l.text}</p>
              )}
            </div>
          ))}
        </section>
      )}

      <button type="button" className="codex-link mt-auto self-start font-body text-[14px] text-ink-3" onClick={() => nav.go({ section: 'rules', id: 'duration' })}>
        Durée, charges et cumul : règles communes à tous les statuts →
      </button>
    </article>
  )
}

/** Lien vers une règle commune, par son titre (« Cumulable », « Durée »). */
function RuleLink({ nav, id }: { nav: CompendiumNav; id: 'duration' | 'stacking-add' | 'stacking-refresh' }) {
  return (
    <button type="button" className="codex-link self-start text-left" onClick={() => nav.go({ section: 'rules', id })}>
      {id === 'duration' ? 'Durée : règle commune' : RULES[id].title}
    </button>
  )
}
