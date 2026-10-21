import { useState } from 'react'
import { skillCatalog, type SkillEntry } from '../../game/catalog'
import { describeSkill, type SkillNature } from '../../game/events'
import { STATUSES } from '../../game/statuses'
import { MiniPortrait } from '../RecordBits'
import { CharacterLink, formName, NATURE_LABEL, natureOf, racePlural, SkillMedal, SkillTags, StatusChip, triggerShort, useFocusRef } from './CodexBits'
import { matches, type CompendiumNav, type SectionProps } from './sections'

type NatureFilter = SkillNature | 'all'

/**
 * Section « Compétences » : l'index dense de toutes les compétences, groupées par race. Une ligne dit sa nature,
 * son déclencheur, son effet (le texte unique de `describeSkill`), le statut qu'elle pose (lien vers Statuts) et
 * ses porteurs (liens vers leur fiche). Ce qui relève d'une règle commune est une pastille qui mène à Règles.
 */
export function SkillsSection({ nav, focus, filter }: SectionProps) {
  const [nature, setNature] = useState<NatureFilter>('all')
  const focusRef = useFocusRef(focus)
  const families = skillCatalog()
  const all = families.flatMap((f) => f.skills)
  const natures = (['martial', 'finesse', 'arcane', 'neutral'] as SkillNature[]).filter((n) => all.some((s) => natureOf(s.event) === n))
  const keep = (s: SkillEntry) =>
    (nature === 'all' || natureOf(s.event) === nature) &&
    matches(
      filter,
      s.event.name,
      describeSkill(s.event).text,
      ...s.owners.map((c) => c.name),
      ...describeSkill(s.event).posed.map((p) => STATUSES[p.status].name),
    )
  const shown = families.map((f) => ({ ...f, skills: f.skills.filter(keep) })).filter((f) => f.skills.length > 0)

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex gap-2">
        {(['all', ...natures] as NatureFilter[]).map((n) => (
          <button key={n} type="button" className="codex-pill" aria-pressed={nature === n} onClick={() => setNature(n)}>
            {n !== 'all' && <span className="seal h-3 w-3" data-tone={n} />}
            {n === 'all' ? 'Toutes' : NATURE_LABEL[n]}
          </button>
        ))}
      </div>

      <div className="codex-panel flex min-h-0 flex-1 flex-col">
        <div className="grid grid-cols-[330px_1fr_240px_200px] gap-5 border-b border-line-2 px-4 py-2.5">
          {['Compétence', 'Effet', 'Statut posé', 'Porteurs'].map((h) => (
            <span key={h} className="codex-label">
              {h}
            </span>
          ))}
        </div>
        <div className="scroll-panel min-h-0 flex-1 overflow-y-auto">
          {shown.length === 0 && <p className="p-4 font-body italic text-ink-3">Aucune compétence ne correspond.</p>}
          {shown.map((family) => (
            <section key={family.race}>
              <div className="flex items-baseline gap-3 bg-surface-2/70 px-4 py-1.5">
                <h3 className="font-display text-[17px] font-bold uppercase tracking-[0.12em] text-gold-300">{racePlural(family.race)}</h3>
                <span className="font-body text-[14px] text-ink-3">
                  {family.skills.length} compétence{family.skills.length > 1 ? 's' : ''}
                </span>
              </div>
              {family.skills.map((s) => {
                const focused = s.events.some((e) => e.id === focus)
                return (
                  <div key={s.event.id} ref={focused ? focusRef : undefined} data-flash={focused} className="codex-row grid! grid-cols-[330px_1fr_240px_200px] gap-5!">
                    <SkillRow entry={s} nav={nav} />
                  </div>
                )
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function SkillRow({ entry, nav }: { entry: SkillEntry; nav: CompendiumNav }) {
  const { event, owners, triggers } = entry
  const { text, posed } = describeSkill(event)
  return (
    <>
      <div className="flex items-center gap-3">
        <SkillMedal event={event} size={44} />
        <div className="min-w-0">
          <p className="truncate font-display text-[17px] font-bold leading-tight text-ink-1">{event.name}</p>
          <p className="font-body text-[14px] text-ink-3">
            {NATURE_LABEL[natureOf(event)]} · {triggerShort(triggers)}
          </p>
        </div>
      </div>
      <div className="min-w-0 py-1">
        <p className="font-body text-[15px] leading-snug text-ink-2">{text}</p>
        <SkillTags event={event} nav={nav} form={formName(owners[0], event)} />
      </div>
      <div className="flex flex-col gap-1.5">
        {posed.length === 0 ? (
          <span className="font-body text-ink-off">—</span>
        ) : (
          posed.map((p) => <StatusChip key={p.status} status={p.status} target={p.target} nav={nav} />)
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {owners.map((c) => (
          <span key={c.id} className="flex items-center gap-2">
            <MiniPortrait character={c} size="h-8 w-8" />
            <CharacterLink character={c} nav={nav} />
          </span>
        ))}
      </div>
    </>
  )
}
