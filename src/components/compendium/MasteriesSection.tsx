import type { Character } from '../../game/character'
import { describeSkill, type CharacterEvent } from '../../game/events'
import { aurasOf, MASTERIES, MASTERY_IDS, type Mastery, type MasteryId } from '../../game/masteries'
import { CHARACTERS } from '../../game/roster'
import { MASTERY_SKILLS } from '../../game/skills'
import { auraOfSkill } from '../../game/states'
import { MasteryIcon } from '../Icon'
import { Portrait } from '../Portrait'
import { SkillTooltip } from '../SkillDice'
import { CharacterLink, CodexBox, SkillMedal, skillLink, useFocusRef } from './CodexBits'
import { matches, type CompendiumNav, type SectionProps } from './sections'

/** Ceux qui jouent une maîtrise, dans l'ordre du roster. */
export const holdersOf = (id: MasteryId): Character[] => CHARACTERS.filter((c) => c.definition.masteries.includes(id))

/**
 * Section « Maîtrises » (docs/MAITRISES.md § 12) : à gauche une tuile par maîtrise (son emblème, son nom, la question du
 * joueur, les portraits de ceux qui la jouent) ; à droite celle qui est ouverte, ses auras puis ses compétences, une
 * ligne d'effet chacune, le détail au survol. Comme ailleurs, ni interaction ni ce qui retire un statut.
 */
export function MasteriesSection({ nav, focus, filter }: SectionProps) {
  const focusRef = useFocusRef<HTMLButtonElement>(focus)
  const all = MASTERY_IDS.map((id) => MASTERIES[id])
  const shown = all.filter((m) =>
    matches(filter, m.name, m.question, m.summary, ...holdersOf(m.id).map((c) => c.name), ...MASTERY_SKILLS[m.id].map((e) => e.name)),
  )
  const selected = all.find((m) => m.id === focus) ?? shown[0] ?? all[0]

  return (
    <div className="grid h-full min-h-0 grid-cols-[660px_1fr] gap-6">
      <nav aria-label="Maîtrises" className="codex-panel scroll-panel min-h-0 overflow-y-auto p-2">
        {shown.length === 0 && <p className="p-4 font-body italic text-ink-3">Aucune maîtrise ne correspond.</p>}
        <div className="grid grid-cols-2 gap-2">
          {shown.map((m) => (
            <button
              key={m.id}
              type="button"
              ref={m.id === focus ? focusRef : undefined}
              aria-current={m.id === selected.id}
              onClick={() => nav.go({ section: 'masteries', id: m.id })}
              className="codex-row w-full items-start rounded-(--r-xs) border border-line-1"
            >
              <MasteryIcon id={m.id} name={m.name} className="h-16 w-16 text-3xl" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-display text-[20px] font-extrabold leading-tight text-ink-1">{m.name}</span>
                <span className="font-body text-[14px] leading-snug text-ink-3">{m.question}</span>
                <span className="mt-0.5 flex gap-1">
                  {holdersOf(m.id).map((c) => (
                    <span key={c.id} title={c.name} className="h-8 w-8 shrink-0 overflow-hidden rounded-(--r-xs) border border-line-2 bg-surface-1">
                      <Portrait character={c} side={0} className="h-full w-full" />
                    </span>
                  ))}
                </span>
              </span>
            </button>
          ))}
        </div>
      </nav>
      <MasteryDetail key={selected.id} mastery={selected} nav={nav} />
    </div>
  )
}

function MasteryDetail({ mastery, nav }: { mastery: Mastery; nav: CompendiumNav }) {
  // Ses auras, puis ses compétences, dans l'ordre du catalogue
  const auras = aurasOf(mastery.id)
  const skills = MASTERY_SKILLS[mastery.id].filter((e) => auraOfSkill(e) === undefined)
  const holders = holdersOf(mastery.id)
  return (
    <article className="codex-panel fade-in scroll-panel flex min-h-0 flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center gap-5">
        <MasteryIcon id={mastery.id} name={mastery.name} className="h-28 w-28 text-6xl" />
        <div className="min-w-0">
          <h2 className="font-display text-4xl font-extrabold text-amber-100">{mastery.name}</h2>
          <p className="mt-1 font-display text-lg italic text-amber-200/80">{mastery.question}</p>
          <p className="mt-1 font-body text-[17px] leading-snug text-ink-2">{mastery.summary}</p>
        </div>
      </header>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-2 font-body text-[15px] text-ink-2">
        <span className="codex-label">{holders.length > 1 ? 'La jouent' : 'La joue'}</span>
        {holders.map((c) => (
          <span key={c.id} className="flex items-center gap-2">
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-(--r-xs) border border-line-2 bg-surface-1">
              <Portrait character={c} side={0} className="h-full w-full" />
            </span>
            <CharacterLink character={c} nav={nav} />
          </span>
        ))}
      </p>

      <CodexBox title={`Auras · ${auras.length}`}>
        <SkillRows events={auras} nav={nav} />
      </CodexBox>
      <CodexBox title={`Compétences · ${skills.length}`}>
        <SkillRows events={skills} nav={nav} />
      </CodexBox>
    </article>
  )
}

/** Une brique par ligne : son sceau, son nom (lien vers sa fiche), une ligne d'effet ; au survol, son infobulle. */
function SkillRows({ events, nav }: { events: readonly CharacterEvent[]; nav: CompendiumNav }) {
  return (
    <ul className="flex flex-col">
      {events.map((e, k) => (
        <li key={e.id} className="group relative border-b border-line-1 last:border-b-0 hover:z-[70]">
          <button type="button" className="flex w-full items-center gap-3 py-2 text-left" onClick={() => nav.go(skillLink(e))}>
            <SkillMedal event={e} size={38} />
            <span className="min-w-0 flex-1">
              <span className="codex-link block font-display text-[17px] font-bold leading-tight">{e.name}</span>
              <span className="block truncate font-body text-[14px] text-ink-3">{describeSkill(e).text}</span>
            </span>
          </button>
          <SkillTooltip event={e} badge={auraOfSkill(e) ? 'Aura' : 'Compétence'} placement={k < events.length / 2 ? 'below' : 'above'} align="right" />
        </li>
      ))}
    </ul>
  )
}
