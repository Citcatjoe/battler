import { useState, type ReactNode } from 'react'
import { sheetStatuses, statusHome, type StatusEntry } from '../../game/catalog'
import type { CharacterEvent, Target } from '../../game/events'
import { RULES } from '../../game/rules'
import { STATES, STATUS_PLACE, type StateId } from '../../game/states'
import { POLARITY_STYLE, STATUSES, type Polarity, type StatusId } from '../../game/statuses'
import { StateIcon } from '../Icon'
import { CodexBox, Line, RelicSource, RuleLink, skillLine, skillLink, SkillMedal, StatusMedal, useFocusRef } from './CodexBits'
import { matches, type CompendiumNav, type CompendiumTarget, type SectionProps } from './sections'

type KindFilter = Polarity | 'all'

const KIND_TONE: Record<Polarity, string> = { positive: 'text-good!', negative: 'text-bad!' }
const KINDS: Polarity[] = ['positive', 'negative']

/**
 * Section « Statuts » : le vocabulaire commun, les bonus et malus de la zone d'état, réunis dans un seul index
 * (polarité dite par la couleur et par le mot), rangés comme la zone d'état (docs/EMBLEMES.md, 0.130.2) : un intertitre
 * par état, avec son emblème, une seule fois, et ses statuts dessous, sans icône ; un état dont le seul statut porte son
 * nom (Poison) tient en une ligne. Une aura ou un mécanisme appartient à sa compétence, une règle de forme à son
 * personnage : ils sont décrits là (0.98.0). À droite, le détail du statut choisi : effet, consommation, cumul, qui le
 * pose ; ni ses interactions ni ce qui le retire (au joueur de les découvrir, 2026-10-27). Seuls les statuts mis en jeu
 * (compétence ou relique) y figurent ; les statuts « à venir » restent dans docs/STATUTS.md.
 */
export function StatusesSection({ nav, focus, filter }: SectionProps) {
  const [kind, setKind] = useState<KindFilter>('all')
  const focusRef = useFocusRef<HTMLButtonElement>(focus)
  const inGame = sheetStatuses()
  const count = (k: KindFilter) => inGame.filter((e) => k === 'all' || e.def.polarity === k).length
  const shown = inGame.filter((e) => (kind === 'all' || e.def.polarity === kind) && matches(filter, e.def.name, e.def.summary))
  const selected = inGame.find((e) => e.id === focus) ?? shown[0] ?? inGame[0]

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex gap-2">
        {(['all', ...KINDS] as KindFilter[]).map((k) => (
          <button key={k} type="button" className="codex-pill" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k !== 'all' && <span className="seal h-3 w-3" data-tone={k} />}
            {k === 'all' ? 'Tous' : POLARITY_STYLE[k].label}
            <span className="font-data text-[13px] font-normal text-ink-3">{count(k)}</span>
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[520px_1fr] gap-6">
        <nav aria-label="Statuts" className="codex-panel scroll-panel min-h-0 overflow-y-auto">
          {shown.length === 0 && <p className="p-4 font-body italic text-ink-3">Aucun statut ne correspond.</p>}
          {KINDS.map((k) => {
            const group = shown.filter((e) => e.def.polarity === k)
            if (group.length === 0) return null
            // Les états de cette polarité, dans l'ordre du vocabulaire (STATES), chacun avec ses statuts affichés
            const byState = (Object.keys(STATES) as StateId[])
              .map((state) => ({ state, entries: group.filter((e) => STATUS_PLACE[e.id].relays[0]?.state === state) }))
              .filter((g) => g.entries.length > 0)
            const row = (e: StatusEntry, medal: boolean) => (
              <button
                key={e.id}
                type="button"
                ref={e.id === focus ? focusRef : undefined}
                aria-current={e.id === selected.id}
                onClick={() => nav.go({ section: 'statuses', id: e.id })}
                className={`codex-row w-full ${medal ? '' : 'min-h-12! pl-[68px]!'}`}
              >
                {medal && <StatusMedal id={e.id} size={40} />}
                <span className="min-w-0">
                  <span className="block font-display text-[17px] font-bold leading-tight text-ink-1">{e.def.name}</span>
                  <span className="block truncate font-body text-[14px] text-ink-3">{e.def.summary}</span>
                </span>
              </button>
            )
            return (
              <section key={k}>
                <h3 className={`codex-label bg-surface-2/70 px-4 py-1.5 ${KIND_TONE[k]}`}>
                  {POLARITY_STYLE[k].label} · {group.length}
                </h3>
                {byState.map(({ state, entries }) => {
                  // Le statut qui porte le nom de son état (Critique assuré, Poison) tient lieu d'intertitre : sa ligne porte l'emblème
                  const namesake = entries.find((e) => e.def.name === STATES[state].name)
                  return (
                    <div key={state}>
                      {namesake ? (
                        row(namesake, true)
                      ) : (
                        <div className="flex items-center gap-[14px] px-[14px] pb-1 pt-3">
                          <span className="seal" data-tone={STATES[state].polarity} style={{ width: 40, height: 40 }}>
                            <StateIcon id={state} className="h-full w-full" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-display text-[17px] font-bold leading-tight text-amber-200">{STATES[state].name}</span>
                            <span className="block truncate font-body text-[14px] text-ink-3">{STATES[state].summary}</span>
                          </span>
                        </div>
                      )}
                      {entries.filter((e) => e !== namesake).map((e) => row(e, false))}
                    </div>
                  )
                })}
              </section>
            )
          })}
        </nav>
        <StatusDetail key={selected.id} entry={selected} nav={nav} />
      </div>
    </div>
  )
}

/** Une compétence qui pose le statut, et sa cible ; ni ses porteurs ni leur race (0.98.1). */
interface Poser {
  event: CharacterEvent
  target: Target
}

/** Un statut cité par une fiche : l'emblème et la fiche d'un état, ou le sceau et la fiche de la compétence à qui il appartient. */
function cite(id: StatusId, size: number): { medal: ReactNode; to: CompendiumTarget; skill: boolean } {
  const home = statusHome(id)
  return home?.kind === 'skill'
    ? { medal: <SkillMedal event={home.event} size={size} />, to: skillLink(home.event), skill: true }
    : { medal: <StatusMedal id={id} size={size} />, to: { section: 'statuses', id }, skill: false }
}

function StatusDetail({ entry, nav }: { entry: StatusEntry; nav: CompendiumNav }) {
  const { def, rules } = entry
  const posers: Poser[] = []
  for (const s of entry.sources)
    if (s.kind === 'skill' && !posers.some((p) => p.event.id === s.event.id)) posers.push({ event: s.event, target: s.target })
  const byStatus = entry.sources.flatMap((s) => (s.kind === 'status' ? [s.status] : []))
  const byRelic = entry.sources.flatMap((s) => (s.kind === 'relic' ? [{ relic: s.relic, target: s.target }] : []))

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

      <div className={`grid gap-3 ${rules.stacking ? (rules.effect.length > 0 ? 'grid-cols-[1.6fr_1.2fr_1fr]' : 'grid-cols-2') : 'grid-cols-2'}`}>
        {rules.effect.length > 0 && (
          <CodexBox title="Effet">
            {rules.effect.map((l) => (
              <Line key={l.text} line={l} nav={nav} />
            ))}
          </CodexBox>
        )}
        <CodexBox title="Consommation">
          {rules.consumption.map((l) => (
            <Line key={l.text} line={l} nav={nav} />
          ))}
          {rules.lifetime && <RuleLink nav={nav} id={rules.lifetime} />}
        </CodexBox>
        {rules.stacking && (
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
        )}
      </div>

      <section>
        <h3 className="codex-label mb-1 border-b border-line-2 pb-1">Posé par</h3>
        {posers.map((p) => (
          <div key={p.event.id} className="flex items-center gap-3 border-b border-line-1 py-2.5">
            <SkillMedal event={p.event} size={40} />
            <div className="min-w-0 flex-1">
              <button type="button" className="codex-link font-display text-[17px] font-bold" onClick={() => nav.go(skillLink(p.event))}>
                {p.event.name}
              </button>
              <p className="font-body text-[14px] text-ink-3">
                {skillLine(p.event)}
                {p.target === 'opponent' ? " · sur l'adversaire" : ' · sur soi'}
              </p>
            </div>
          </div>
        ))}
        {byRelic.map(({ relic, target }) => (
          <RelicSource key={relic.id} relic={relic} target={target} nav={nav} />
        ))}
        {byStatus.map((id) => {
          const { medal, to, skill } = cite(id, 40)
          return (
            <div key={id} className="flex items-center gap-3 border-b border-line-1 py-2.5">
              {medal}
              <p className="font-body text-[15px] text-ink-2">
                Aussi posé par {skill ? 'la compétence' : 'le statut'}{' '}
                <button type="button" className="codex-link font-bold" onClick={() => nav.go(to)}>
                  {STATUSES[id].name}
                </button>
              </p>
            </div>
          )
        })}
      </section>

      {/* Le pied de fiche mène à la règle de vie du statut (Durée), jamais à « Durée » pour un statut qui n'en a pas */}
      <button
        type="button"
        className="codex-link mt-auto self-start font-body text-[14px] text-ink-3"
        onClick={() => nav.go({ section: 'rules', id: rules.lifetime ?? 'polarity' })}
      >
        Bonus, malus, durée et cumul : règles communes à tous les statuts →
      </button>
    </article>
  )
}
