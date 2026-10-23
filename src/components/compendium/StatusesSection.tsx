import { useState } from 'react'
import type { Character } from '../../game/character'
import { statusCatalog, statusLinks, type StatusEntry } from '../../game/catalog'
import type { CharacterEvent, Target } from '../../game/events'
import type { Relic } from '../../game/relics'
import { RULES, type RuleId } from '../../game/rules'
import { isMechanic, POLARITY_STYLE, STATUSES, type Polarity, type RuleLine } from '../../game/statuses'
import { RelicSeal } from '../RelicSeal'
import { CharacterLink, CodexBox, racePlural, skillLine, SkillMedal, StatusMedal, useFocusRef } from './CodexBits'
import { matches, type CompendiumNav, type SectionProps } from './sections'

/** Un bonus, un malus, ou un mécanisme de compétence ou de forme (ni l'un ni l'autre). */
type Kind = Polarity | 'mechanic'
type KindFilter = Kind | 'all'

const KIND_LABEL: Record<Kind, string> = { positive: POLARITY_STYLE.positive.label, negative: POLARITY_STYLE.negative.label, mechanic: 'Mécanismes' }
const KIND_TONE: Record<Kind, string> = { positive: 'text-good!', negative: 'text-bad!', mechanic: 'text-ink-2!' }
const KINDS: Kind[] = ['positive', 'negative', 'mechanic']

const kindOf = (e: StatusEntry): Kind => (isMechanic(e.id) ? 'mechanic' : e.def.polarity)

/**
 * Section « Statuts » : bonus et malus réunis dans un seul index (polarité dite par la couleur et par le mot), et à
 * part les mécanismes des compétences et des formes (jauges de Rétribution, Pile ou face, règles de forme du druide),
 * qui ne sont ni l'un ni l'autre. À droite, le détail du statut choisi : effet, consommation, cumul, qui le pose,
 * interactions. Seuls les statuts mis en jeu (compétence, forme ou relique) y figurent ; les statuts « à venir »
 * restent dans docs/STATUTS.md.
 */
export function StatusesSection({ nav, focus, filter }: SectionProps) {
  const [kind, setKind] = useState<KindFilter>('all')
  const focusRef = useFocusRef<HTMLButtonElement>(focus)
  const inGame = statusCatalog().filter((e) => e.inGame)
  const count = (k: KindFilter) => inGame.filter((e) => k === 'all' || kindOf(e) === k).length
  const shown = inGame.filter((e) => (kind === 'all' || kindOf(e) === kind) && matches(filter, e.def.name, e.def.summary))
  const selected = inGame.find((e) => e.id === focus) ?? shown[0] ?? inGame[0]

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex gap-2">
        {(['all', ...KINDS] as KindFilter[]).map((k) => (
          <button key={k} type="button" className="codex-pill" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k !== 'all' && <span className="seal h-3 w-3" data-tone={k === 'mechanic' ? 'neutral' : k} />}
            {k === 'all' ? 'Tous' : KIND_LABEL[k]}
            <span className="font-data text-[13px] font-normal text-ink-3">{count(k)}</span>
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[520px_1fr] gap-6">
        <nav aria-label="Statuts" className="codex-panel scroll-panel min-h-0 overflow-y-auto">
          {shown.length === 0 && <p className="p-4 font-body italic text-ink-3">Aucun statut ne correspond.</p>}
          {KINDS.map((k) => {
            const group = shown.filter((e) => kindOf(e) === k)
            if (group.length === 0) return null
            return (
              <section key={k}>
                <h3 className={`codex-label bg-surface-2/70 px-4 py-1.5 ${KIND_TONE[k]}`}>
                  {KIND_LABEL[k]} · {group.length}
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
  const mechanic = def.mechanic
  const posers: Poser[] = []
  for (const s of entry.sources) {
    if (s.kind !== 'skill' && s.kind !== 'release') continue
    const known = posers.find((p) => p.event.id === s.event.id)
    if (known) known.owners.push(s.character)
    else posers.push({ event: s.event, owners: [s.character], ...(s.kind === 'skill' ? { target: s.target } : { released: true }) })
  }
  const byStatus = entry.sources.flatMap((s) => (s.kind === 'status' ? [s.status] : []))
  const byRelic = entry.sources.flatMap((s) => (s.kind === 'relic' ? [{ relic: s.relic, target: s.target }] : []))
  const byForm = entry.sources.flatMap((s) => (s.kind === 'form' ? [{ character: s.character, form: s.form }] : []))
  const links = statusLinks(entry.id)

  return (
    <article className="codex-panel fade-in scroll-panel flex min-h-0 flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center gap-5">
        <StatusMedal id={entry.id} size={88} />
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-4xl font-extrabold text-amber-100">{def.name}</h2>
            <span
              className={`rounded-(--r-xs) border px-2 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-[0.2em] ${
                mechanic ? 'border-line-2 bg-ink-1/10 text-ink-1' : POLARITY_STYLE[def.polarity].chip
              }`}
            >
              {mechanic === 'form' ? 'Règle de forme' : mechanic === 'skill' ? 'Mécanisme' : POLARITY_STYLE[def.polarity].label}
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
        <h3 className="codex-label mb-1 border-b border-line-2 pb-1">{mechanic ? 'Mécanisme de' : 'Posé par'}</h3>
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
        {byForm.map(({ character, form }) => (
          <div key={`${character.id}-${form}`} className="flex items-center gap-3 border-b border-line-1 py-2.5">
            <StatusMedal id={entry.id} size={40} />
            <p className="font-body text-[15px] text-ink-2">
              {form} de <CharacterLink character={character} nav={nav} /> : tant qu'il a cette forme
            </p>
          </div>
        ))}
        {byRelic.map(({ relic, target }) => (
          <RelicSource key={relic.id} relic={relic} target={target} nav={nav} />
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
              {l.relic && <RelicSeal relic={l.relic} size={40} />}
              {l.status || l.skill || l.relic ? (
                <button
                  type="button"
                  className="codex-link text-left font-body text-[15px]"
                  onClick={() =>
                    nav.go(
                      l.status
                        ? { section: 'statuses', id: l.status }
                        : l.relic
                          ? { section: 'relics', id: l.relic.id }
                          : { section: 'skills', id: l.skill?.event.id },
                    )
                  }
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

      {/* Le pied de fiche mène à la règle de vie du statut (Durée, ou Auras pour une aura), jamais à « Durée » pour un
          statut qui n'en a pas */}
      <button
        type="button"
        className="codex-link mt-auto self-start font-body text-[14px] text-ink-3"
        onClick={() => nav.go({ section: 'rules', id: mechanic ? 'polarity' : (rules.lifetime ?? 'polarity') })}
      >
        {mechanic ? 'Bonus, malus et mécanismes : règles communes →' : 'Bonus, malus, durée et cumul : règles communes à tous les statuts →'}
      </button>
    </article>
  )
}

/** Une relique qui pose le statut : son sceau, son nom (lien vers Reliques), sa cible. */
function RelicSource({ relic, target, nav }: { relic: Relic; target: Target; nav: CompendiumNav }) {
  return (
    <div className="flex items-center gap-3 border-b border-line-1 py-2.5">
      <RelicSeal relic={relic} size={48} />
      <div className="min-w-0 flex-1">
        <button type="button" className="codex-link font-display text-[17px] font-bold" onClick={() => nav.go({ section: 'relics', id: relic.id })}>
          {relic.name}
        </button>
        <p className="font-body text-[14px] text-ink-3">Relique{target === 'opponent' ? " · sur l'adversaire" : ' · sur soi'}</p>
      </div>
    </div>
  )
}

/** Une phrase de la fiche, suivie du lien vers la règle commune qu'elle applique. */
function Line({ line, nav }: { line: RuleLine; nav: CompendiumNav }) {
  return (
    <p>
      {line.text}
      {line.rule && (
        <>
          {' '}
          <RuleLink nav={nav} id={line.rule} />
        </>
      )}
    </p>
  )
}

/** Lien vers une règle commune, par son titre (« Cumulable », « Durée »). */
function RuleLink({ nav, id }: { nav: CompendiumNav; id: RuleId }) {
  return (
    <button type="button" className="codex-link self-start text-left" onClick={() => nav.go({ section: 'rules', id })}>
      {RULES[id].title} →
    </button>
  )
}
