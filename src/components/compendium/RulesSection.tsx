import { hiddenRules } from '../../game/catalog'
import { RULE_GROUPS, RULE_IDS, RULES, type RuleGroup } from '../../game/rules'
import { useFocusRef } from './CodexBits'
import { matches, type SectionProps } from './sections'

/**
 * Section « Règles » : les règles communes, écrites une seule fois (rules.ts) et regroupées par thème. Les
 * compétences et les statuts y renvoient par leurs pastilles au lieu de les répéter. Une règle qu'aucune
 * compétence en jeu n'applique est tue (`hiddenRules`).
 */
export function RulesSection({ focus, filter }: SectionProps) {
  const focusRef = useFocusRef(focus)
  const hidden = hiddenRules()
  const groups = (Object.keys(RULE_GROUPS) as RuleGroup[])
    .map((group) => ({
      group,
      ids: RULE_IDS.filter((id) => RULES[id].group === group && !hidden.includes(id) && matches(filter, RULES[id].title, RULES[id].text)),
    }))
    .filter((g) => g.ids.length > 0)

  return (
    <div className="codex-panel scroll-panel h-full min-h-0 overflow-y-auto px-8 py-5">
      {groups.length === 0 && <p className="font-body italic text-ink-3">Aucune règle ne correspond.</p>}
      <div className="columns-2 gap-12">
        {groups.map(({ group, ids }) => (
          <section key={group} className="mb-6 break-inside-avoid">
            <h3 className="mb-1 border-b border-line-2 pb-1 font-display text-[19px] font-bold uppercase tracking-[0.12em] text-gold-300">
              {RULE_GROUPS[group]}
            </h3>
            {ids.map((id) => (
              <div
                key={id}
                ref={id === focus ? focusRef : undefined}
                data-flash={id === focus}
                className="codex-row block! min-h-0! px-2! py-2!"
              >
                <h4 className="font-body text-[16px] font-bold text-ink-1">{RULES[id].title}</h4>
                <p className="font-body text-[15px] leading-snug text-ink-2">{RULES[id].text}</p>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
