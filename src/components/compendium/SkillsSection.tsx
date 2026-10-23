import { useState } from 'react'
import { skillCatalog, statusHome, statusLinks, statusSources, type SkillEntry } from '../../game/catalog'
import { describeSkill, triggerText, type CharacterEvent, type SkillNature } from '../../game/events'
import { RULES, type RuleId } from '../../game/rules'
import { STATUS_PLACE } from '../../game/states'
import { STATUSES, statusRuleSections, type StatusId } from '../../game/statuses'
import { RelicSeal } from '../RelicSeal'
import { CodexBox, formName, Line, NATURE_LABEL, natureOf, RelicSource, RuleLink, SkillMedal, StatusChip, StatusMedal, triggerShort, useFocusRef } from './CodexBits'
import { matches, type CompendiumNav, type SectionProps } from './sections'

type NatureFilter = SkillNature | 'all'

/**
 * Section « Compétences » : l'index de toutes les compétences, groupées par nature, à gauche ; le détail de la
 * compétence choisie à droite (même disposition que les Statuts et les Reliques, 0.98.0). Une compétence se décrit
 * pour elle-même, jamais par ses porteurs (0.98.1, décision de l'utilisateur : la forge les détache des
 * personnages). La description (`describeSkill`) porte le fonctionnement ; le détail dit le reste dans le
 * vocabulaire des règles : les états qu'elle pose (emblèmes, liens vers Statuts), et ce qui lui appartient, son aura
 * ou son mécanisme, qui n'ont pas de fiche à eux.
 */
export function SkillsSection({ nav, focus, filter }: SectionProps) {
  const [nature, setNature] = useState<NatureFilter>('all')
  const focusRef = useFocusRef<HTMLButtonElement>(focus)
  const all = skillCatalog().flatMap((f) => f.skills)
  const natures = (['martial', 'finesse', 'arcane', 'neutral'] as SkillNature[]).filter((n) => all.some((s) => natureOf(s.event) === n))
  const keep = (s: SkillEntry) =>
    (nature === 'all' || natureOf(s.event) === nature) &&
    matches(filter, s.event.name, describeSkill(s.event).text, ...describeSkill(s.event).posed.map((p) => STATUSES[p.status].name))
  const shown = natures.map((n) => ({ nature: n, skills: all.filter((s) => natureOf(s.event) === n && keep(s)) })).filter((g) => g.skills.length > 0)
  const selected = all.find((s) => s.events.some((e) => e.id === focus)) ?? shown[0]?.skills[0] ?? all[0]

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex gap-2">
        {(['all', ...natures] as NatureFilter[]).map((n) => (
          <button key={n} type="button" className="codex-pill" aria-pressed={nature === n} onClick={() => setNature(n)}>
            {n !== 'all' && <span className="skill-seal codex-skill-seal h-3 w-3" data-nature={n} />}
            {n === 'all' ? 'Toutes' : NATURE_LABEL[n]}
            <span className="font-data text-[13px] font-normal text-ink-3">{all.filter((s) => n === 'all' || natureOf(s.event) === n).length}</span>
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[520px_1fr] gap-6">
        <nav aria-label="Compétences" className="codex-panel scroll-panel min-h-0 overflow-y-auto">
          {shown.length === 0 && <p className="p-4 font-body italic text-ink-3">Aucune compétence ne correspond.</p>}
          {shown.map((group) => (
            <section key={group.nature}>
              <h3 className="codex-label flex items-center gap-2 bg-surface-2/70 px-4 py-1.5 text-gold-300!">
                <span className="skill-seal codex-skill-seal h-3 w-3" data-nature={group.nature} />
                {NATURE_LABEL[group.nature]} · {group.skills.length}
              </h3>
              {group.skills.map((s) => (
                <button
                  key={s.event.id}
                  type="button"
                  ref={s.events.some((e) => e.id === focus) ? focusRef : undefined}
                  aria-current={s === selected}
                  onClick={() => nav.go({ section: 'skills', id: s.event.id })}
                  className="codex-row w-full"
                >
                  <SkillMedal event={s.event} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[17px] font-bold leading-tight text-ink-1">{s.event.name}</span>
                    <span className="block truncate font-body text-[14px] text-ink-3">{describeSkill(s.event).text}</span>
                  </span>
                  <span className="shrink-0 font-data text-[13px] text-ink-3">{triggerShort(s.triggers)}</span>
                </button>
              ))}
            </section>
          ))}
        </nav>
        {selected && <SkillDetail key={selected.event.id} entry={selected} nav={nav} />}
      </div>
    </div>
  )
}

function SkillDetail({ entry, nav }: { entry: SkillEntry; nav: CompendiumNav }) {
  const { event, owners, triggers } = entry
  // La forme qu'elle exige (druide) est une règle de la compétence, pas un porteur : sa pastille reste
  const form = formName(owners[0], event)
  const { text, tags, posed } = describeSkill(event, form)
  const nature = natureOf(event)
  // Ce qui appartient à la compétence : l'aura ou le mécanisme qu'elle pose ou relâche, sans fiche dans Statuts
  const own = posed
    .filter((p) => {
      const home = statusHome(p.status)
      return home?.kind === 'skill' && home.event.name === event.name
    })
    .map((p) => p.status)
  const others = posed.filter((p) => !own.includes(p.status))
  // Les règles que son aura ou son mécanisme applique (Modificateurs de dégâts, Critique…), en pastilles à la suite des siennes
  const ruleTags = [...new Set(own.flatMap((id) => statusRuleSections(id).effect.flatMap((l) => (l.rule ? [l.rule] : []))))].filter(
    (rule) => !tags.some((t) => t.rule === rule),
  )

  return (
    <article className="codex-panel fade-in scroll-panel flex min-h-0 flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center gap-5">
        <SkillMedal event={event} size={88} />
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-4xl font-extrabold text-amber-100">{event.name}</h2>
            <span className="flex items-center gap-1.5 rounded-(--r-xs) border border-line-2 px-2 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-[0.2em] text-ink-1">
              <span className="skill-seal codex-skill-seal h-3 w-3" data-nature={nature} />
              {NATURE_LABEL[nature]}
            </span>
          </div>
          <p className="mt-1 font-body text-[17px] leading-snug text-ink-2">
            {triggers.length === 1 ? triggerText(triggers[0]).label : `Sur ${triggerShort(triggers)}`}
          </p>
        </div>
      </header>

      <CodexBox title="Effet">
        <p className="text-[17px] text-ink-1">{text}</p>
        {(tags.length > 0 || ruleTags.length > 0) && (
          <span className="mt-1 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <RuleTag key={t.label} label={t.label} rule={t.rule} nav={nav} />
            ))}
            {ruleTags.map((rule) => (
              <RuleTag key={rule} label={RULES[rule].title.toLowerCase()} rule={rule} nav={nav} />
            ))}
          </span>
        )}
      </CodexBox>

      {own.map((id) => (STATUS_PLACE[id].place === 'aura' ? <AuraBox key={id} id={id} event={event} nav={nav} /> : <MechanicBox key={id} id={id} event={event} nav={nav} />))}

      {others.length > 0 && (
        <CodexBox title="Pose">
          <div className="grid grid-cols-2 gap-2">
            {others.map((p) => (
              <StatusChip key={p.status} status={p.status} target={p.target} nav={nav} from={event} />
            ))}
          </div>
        </CodexBox>
      )}

      <button type="button" className="codex-link mt-auto self-start font-body text-[14px] text-ink-3" onClick={() => nav.go({ section: 'rules', id: 'skill' })}>
        Déclencheurs, faces et coups sacrifiés : règles communes à toutes les compétences →
      </button>
    </article>
  )
}

/** Pastille d'une règle commune citée par la compétence : un lien vers la section Règles. */
function RuleTag({ label, rule, nav }: { label: string; rule: RuleId; nav: CompendiumNav }) {
  return (
    <button type="button" className="codex-tag" title={RULES[rule].title} onClick={() => nav.go({ section: 'rules', id: rule })}>
      {label}
    </button>
  )
}

/**
 * L'aura de la compétence, dans le vocabulaire des règles : sa vie (permanente), son cumul et son plafond, puis
 * ce qu'elle fait aux autres statuts (ce qu'elle pose, ce qu'elle bloque, ce qui la retire) et qui d'autre la pose.
 */
function AuraBox({ id, event, nav }: { id: StatusId; event: CharacterEvent; nav: CompendiumNav }) {
  const rules = statusRuleSections(id)
  const also = statusSources(id).filter((s) => (s.kind === 'skill' ? s.event.name !== event.name : s.kind === 'relic'))
  return (
    <CodexBox title="Aura">
      <span className="flex flex-wrap gap-1.5">
        <RuleTag label="jusqu'à la fin du combat" rule="auras" nav={nav} />
        {rules.stacking && <RuleTag label={RULES[rules.stacking].title.toLowerCase()} rule={rules.stacking} nav={nav} />}
        {rules.maxStacks !== undefined && (
          <RuleTag label={`${rules.maxStacks} charge${rules.maxStacks > 1 ? 's' : ''} au plus`} rule="max-stacks" nav={nav} />
        )}
      </span>
      {statusLinks(id).map((l) => (
        <div key={l.text} className="flex items-center gap-2.5">
          {l.status && <StatusMedal id={l.status} size={28} />}
          {l.skill && <SkillMedal event={l.skill.event} size={28} />}
          {l.relic && <RelicSeal relic={l.relic} size={32} />}
          {l.status || l.skill || l.relic ? (
            <button
              type="button"
              className="codex-link text-left"
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
            <p>{l.text}</p>
          )}
        </div>
      ))}
      {also.map((s) =>
        s.kind === 'relic' ? (
          <RelicSource key={s.relic.id} relic={s.relic} target={s.target} nav={nav} />
        ) : s.kind === 'skill' ? (
          <p key={s.event.id}>
            Aussi posée par{' '}
            <button type="button" className="codex-link font-bold" onClick={() => nav.go({ section: 'skills', id: s.event.id })}>
              {s.event.name}
            </button>
          </p>
        ) : null,
      )}
    </CodexBox>
  )
}

/**
 * Le mécanisme de la compétence : ni bonus ni malus. Un mécanisme qu'elle relâche (les jauges de Rétribution) vit
 * entre deux déclenchements : sa règle s'écrit ici, la description ne disant que ce qu'elle en fait.
 */
function MechanicBox({ id, event, nav }: { id: StatusId; event: CharacterEvent; nav: CompendiumNav }) {
  const released = event.effects.some((e) => e.type === 'release' && e.status === id)
  return (
    <CodexBox title={released ? STATUSES[id].name : 'Mécanisme'}>
      {released && statusRuleSections(id).effect.map((l) => <Line key={l.text} line={l} nav={nav} />)}
      <p>
        Ni bonus ni malus : rien ne {released ? 'les' : 'le'} retire ni ne {released ? 'les' : 'le'} bloque. <RuleLink nav={nav} id="polarity" />
      </p>
    </CodexBox>
  )
}
