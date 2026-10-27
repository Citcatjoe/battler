import { skillCatalog, statusHome, statusSources, type SkillEntry } from '../../game/catalog'
import { describeSkill, triggerText, type CharacterEvent } from '../../game/events'
import { MASTERIES, MASTERY_IDS, masteryOfSkill } from '../../game/masteries'
import { RULES, type RuleId } from '../../game/rules'
import { auraOfSkill, STATUS_PLACE } from '../../game/states'
import { STATUSES, statusRuleSections, type StatusId } from '../../game/statuses'
import { NBSP, typeset } from '../../game/typography'
import { CodexBox, formName, Line, MasteryName, RelicSource, RuleLink, SkillMedal, skillLink, StatusChip, triggerShort, useFocusRef } from './CodexBits'
import { matches, type CompendiumNav, type SectionProps } from './sections'

/** Les deux onglets qui se partagent les compétences : celles qui posent une aura sur leur lanceur, et les autres. */
export type SkillKind = 'skills' | 'auras'

/** Les compétences d'un onglet, par ordre alphabétique (une ligne par compétence, `skillCatalog`). */
export function compendiumSkills(kind: SkillKind): SkillEntry[] {
  return skillCatalog()
    .filter((s) => (auraOfSkill(s.event) !== undefined) === (kind === 'auras'))
    .sort((a, b) => a.event.name.localeCompare(b.event.name, 'fr'))
}

/** Ce qu'est une aura et comment on l'obtient : l'en-tête de l'onglet Auras (docs/MAITRISES.md § 5 et § 12). */
const AURA_INTRO = typeset(
  "Une aura dure jusqu'à la fin du combat : posée quand sa face sort, elle se renforce à chaque nouvelle sortie, jusqu'à son plafond. Chaque combattant en porte une sur le 1 de son dé, choisie parmi celles de ses deux maîtrises au début d'une campagne ; les autres s'obtiennent en gravant.",
)

/**
 * Sections « Compétences » et « Auras » (retour du 2026-10-27) : deux onglets, une seule mise en page. À gauche
 * l'index (les compétences par ordre alphabétique ; les auras rangées par maîtrise, sous un court texte qui dit ce
 * qu'elles sont), à droite le détail de celle choisie. Chaque brique nomme sa maîtrise, avec son petit emblème. Une
 * compétence se décrit pour elle-même, jamais par ses porteurs (0.98.1), ni par ses interactions avec les autres (au
 * joueur de les découvrir) : sa description (`describeSkill`), les états qu'elle pose, et ce qui lui appartient, son aura
 * ou son mécanisme.
 */
export function SkillsSection({ kind, nav, focus, filter }: SectionProps & { kind: SkillKind }) {
  const focusRef = useFocusRef<HTMLButtonElement>(focus)
  const all = compendiumSkills(kind)
  const shown = all.filter((s) => {
    const mastery = masteryOfSkill(s.event.id)
    return matches(filter, s.event.name, describeSkill(s.event).text, ...describeSkill(s.event).posed.map((p) => STATUSES[p.status].name), mastery && MASTERIES[mastery].name)
  })
  // Les auras par maîtrise, dans l'ordre du registre (celui de l'onglet Maîtrises) ; une aura hors catalogue, à la fin
  const groups =
    kind === 'auras'
      ? [...MASTERY_IDS, undefined]
          .map((m) => ({ mastery: m, skills: shown.filter((s) => masteryOfSkill(s.event.id) === m) }))
          .filter((g) => g.skills.length > 0)
      : [{ mastery: undefined, skills: shown }]
  const selected = all.find((s) => s.events.some((e) => e.id === focus)) ?? shown[0] ?? all[0]

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {kind === 'auras' && (
        <p className="max-w-[1100px] font-body text-[17px] leading-snug text-ink-2">
          {AURA_INTRO}{' '}
          <button type="button" className="codex-link" onClick={() => nav.go({ section: 'rules', id: 'auras' })}>
            {RULES.auras.title} →
          </button>
        </p>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-[520px_1fr] gap-6">
        <nav aria-label={kind === 'auras' ? 'Auras' : 'Compétences'} className="codex-panel scroll-panel min-h-0 overflow-y-auto">
          {shown.length === 0 && <p className="p-4 font-body italic text-ink-3">{kind === 'auras' ? 'Aucune aura ne correspond.' : 'Aucune compétence ne correspond.'}</p>}
          {groups.map((group) => (
            <section key={group.mastery ?? 'all'}>
              {group.mastery && (
                <h3 className="codex-label flex items-center bg-surface-2/70 px-4 py-1.5 text-gold-300!">
                  <MasteryName id={group.mastery} />
                  &nbsp;· {group.skills.length}
                </h3>
              )}
              {group.skills.map((s) => {
                const mastery = masteryOfSkill(s.event.id)
                return (
                  <button
                    key={s.event.id}
                    type="button"
                    ref={s.events.some((e) => e.id === focus) ? focusRef : undefined}
                    aria-current={s === selected}
                    onClick={() => nav.go(skillLink(s.event))}
                    className="codex-row w-full"
                  >
                    <SkillMedal event={s.event} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2.5">
                        <span className="font-display text-[17px] font-bold leading-tight text-ink-1">{s.event.name}</span>
                        {/* Sa maîtrise ; dans l'onglet Auras, l'en-tête du groupe la dit déjà */}
                        {kind === 'skills' && mastery && <MasteryName id={mastery} className="font-body text-[13px] text-ink-3" />}
                      </span>
                      <span className="block truncate font-body text-[14px] text-ink-3">{describeSkill(s.event).text}</span>
                    </span>
                    <span className="shrink-0 font-data text-[13px] text-ink-3">{triggerShort(s.triggers)}</span>
                  </button>
                )
              })}
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
  const { text, detail, tags, posed } = describeSkill(event, form)
  const aura = auraOfSkill(event)
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
            <MasteryBadge event={event} aura={aura !== undefined} nav={nav} />
          </div>
          <p className="mt-1 font-body text-[17px] leading-snug text-ink-2">
            {triggers.length === 0 ? 'Hors kit : sur aucune face d’origine, elle se grave par la forge' : triggers.length === 1 ? triggerText(triggers[0]).label : `Sur ${triggerShort(triggers)}`}
          </p>
        </div>
      </header>

      <CodexBox title="Effet">
        <p className="text-[17px] text-ink-1">{text}</p>
        {/* Ce que la ligne tait (arrondis, moment exact, coups bruts) : la règle précise, en second plan */}
        {detail && (
          <p className="text-[15px] leading-snug text-ink-3">
            <span className="font-bold text-ink-2">Détail{NBSP}: </span>
            {detail}
          </p>
        )}
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
        Déclencheurs, faces et relations au coup : règles communes à toutes les compétences →
      </button>
    </article>
  )
}

/** « Aura · Lumière » ou « Compétence · Sang » en tête de la fiche : la maîtrise, en lien vers son onglet. */
function MasteryBadge({ event, aura, nav }: { event: CharacterEvent; aura: boolean; nav: CompendiumNav }) {
  const id = masteryOfSkill(event.id)
  const kind = aura ? 'Aura' : 'Compétence'
  const style = 'rounded-(--r-xs) border border-line-2 px-2 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-[0.2em] text-ink-1'
  if (!id) return aura ? <span className={style}>{kind}</span> : null
  return (
    <button type="button" className={`${style} inline-flex items-center gap-1.5 hover:border-gold-500 hover:text-gold-200`} onClick={() => nav.go({ section: 'masteries', id })}>
      {kind} · <MasteryName id={id} />
    </button>
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
 * L'aura de la compétence, dans le vocabulaire des règles : sa vie (permanente), son cumul et son plafond, et ce qui
 * d'autre la pose (une autre compétence, une relique). Rien de ce qui la retire ni de ce avec quoi elle joue.
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
      {also.map((s) =>
        s.kind === 'relic' ? (
          <RelicSource key={s.relic.id} relic={s.relic} target={s.target} nav={nav} />
        ) : s.kind === 'skill' ? (
          <p key={s.event.id}>
            Aussi posée par{' '}
            <button type="button" className="codex-link font-bold" onClick={() => nav.go(skillLink(s.event))}>
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
        Ni bonus ni malus. <RuleLink nav={nav} id="polarity" />
      </p>
    </CodexBox>
  )
}
