import { skillCatalog, type SkillEntry } from '../../game/catalog'
import { DEFAULT_SKILL_NATURE, describeCondition, TRIGGERS, type Effect, type SkillNature } from '../../game/events'
import { lowerFirst, POLARITY_STYLE, STATUSES } from '../../game/statuses'
import { Icon, StatusIcon } from '../Icon'
import { MiniPortrait } from '../RecordBits'
import { SkillSeal } from '../SkillSeal'

/** Libellé de la nature d'une compétence, en tête de sa carte. */
export const NATURE_LABEL: Record<SkillNature, string> = {
  martial: 'Martiale',
  finesse: 'Adresse',
  arcane: 'Arcane',
  neutral: 'Neutre',
}

/** « Orc » → « Orcs », « Mort-vivant » → « Morts-vivants ». */
const plural = (race: string) =>
  race
    .split('-')
    .map((w) => `${w}s`)
    .join('-')

/**
 * Verticale « Compétences » : les capacités des personnages, regroupées par race. Chaque carte
 * dit quand la compétence se déclenche, à quelles conditions, ce qu'elle produit (effet immédiat
 * ou statut posé) et qui la possède. C'est elle qui fait le lien entre un personnage et les
 * statuts, présentés comme des règles neutres dans « Bonus et malus ».
 */
export function SkillsSection({ onSelectCharacter }: { onSelectCharacter: (id: string) => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <p className="font-body text-[15px] leading-relaxed text-ink-3">
        Une compétence appartient à un personnage : elle se déclenche à un moment du combat et produit un effet
        immédiat (soin, dégâts directs, purge) ou pose un statut, décrit dans « Bonus et malus ». Les variantes
        héritent des compétences de leur race.
      </p>
      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto pr-1">
        {skillCatalog().map((family) => (
          <section key={family.race}>
            <div className="mb-3 flex items-center gap-4">
              <h3 className="font-display text-2xl font-bold text-ink-1">{plural(family.race)}</h3>
              <div className="h-px flex-1 bg-line-2" />
              <span className="font-body text-[13px] font-bold uppercase tracking-[0.2em] text-ink-3">
                {family.skills.length} compétence{family.skills.length > 1 ? 's' : ''}
              </span>
            </div>
            <ul className="grid grid-cols-3 gap-5">
              {family.skills.map((s) => (
                <li key={s.event.id}>
                  <SkillCard entry={s} onSelectCharacter={onSelectCharacter} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function SkillCard({ entry, onSelectCharacter }: { entry: SkillEntry; onSelectCharacter: (id: string) => void }) {
  const { event, owners } = entry
  const nature = event.nature ?? DEFAULT_SKILL_NATURE
  const terms = [
    ...(event.form ? [owners[0]?.forms?.find((f) => f.id === event.form)?.name ?? event.form] : []),
    ...(event.forfeitsHit ? ["le jet qui la déclenche n'inflige aucun dégât"] : []),
    ...(event.reshapesHit?.value === 'max' ? ['frappe pour la valeur maximale du dé'] : []),
    ...(event.reshapesHit?.value === 'reroll' ? [`relance le dé, en secret, et ajoute ${event.reshapesHit.bonus ?? 0}`] : []),
    ...(event.reshapesHit?.noCrit ? ['jamais critique'] : []),
    ...(event.when ?? []).map((c) => `si ${describeCondition(c)}`),
    ...(event.chance !== undefined && event.chance < 1 ? [`${Math.round(event.chance * 100)} % de chances`] : []),
    ...(event.limit !== undefined ? [`${event.limit} fois max. par combat`] : []),
  ]
  return (
    <div className="skill-blade-wrap">
      <article className="skill-blade h-[300px]" data-nature={nature}>
        <header className="flex items-center gap-3 px-5 pt-5">
          <SkillSeal id={event.id} size={56} />
          <div className="min-w-0">
            <h4 className="font-display text-xl font-bold leading-tight text-ink-1">{event.name}</h4>
            <p className="font-body text-[14px] font-medium text-(--nature)">
              {NATURE_LABEL[nature]} · {TRIGGERS[event.trigger].label}
            </p>
          </div>
        </header>

        {terms.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 px-5 pt-3">
            {terms.map((t) => (
              <li
                key={t}
                className="rounded-(--r-xs) border border-(--nature)/40 bg-(--nature)/10 px-2 py-px font-body text-[13px] text-ink-1"
              >
                {t}
              </li>
            ))}
          </ul>
        )}

        <div className="mx-5 my-3 h-px bg-line-2" />

        <ul className="flex-1 space-y-2 overflow-hidden px-5">
          {event.effects.map((effect, i) => (
            <li key={i}>
              <EffectLine effect={effect} />
            </li>
          ))}
        </ul>

        <footer className="flex flex-wrap gap-2 border-t border-line-1 bg-black/25 px-4 py-2.5">
          {owners.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCharacter(c.id)}
              title={`Voir la fiche de ${c.name}`}
              className="group flex items-center gap-2 rounded-(--r-xs) py-0.5 pr-2 font-body text-[13px] text-ink-2 hover:bg-white/5 hover:text-ink-1"
            >
              <MiniPortrait character={c} size="h-7 w-7" />
              <span>
                <b className="text-ink-1 group-hover:text-gold-300">{c.name}</b>
                <span className="text-ink-3"> · {c.archetype}</span>
              </span>
            </button>
          ))}
        </footer>
      </article>
    </div>
  )
}

type ImmediateEffect = Exclude<Effect, { type: 'applyStatus' }>

/** Présentation d'un effet immédiat (sans statut) : symbole, couleur et texte. */
function immediateLook(effect: ImmediateEffect) {
  switch (effect.type) {
    case 'heal':
      return { glyph: '✚', tone: 'border-good text-good', text: `+${effect.amount} PV` }
    case 'damage':
      return { glyph: '✦', tone: 'border-bad text-bad', text: `${effect.amount} dégâts directs` }
    case 'release':
      return {
        glyph: <Icon name="retribution" className="h-7 w-7" />,
        tone: 'border-crit text-crit',
        text: `relâche ${STATUSES[effect.status].name} : la somme de ses jauges en dégâts directs (au moins ${effect.min})`,
      }
    case 'cleanse': {
      const kind = effect.polarity === 'negative' ? 'malus' : 'bonus'
      return {
        glyph: <Icon name="purification" className="h-7 w-7" />,
        tone: 'border-dodge text-dodge',
        text:
          effect.count === undefined
            ? `retire les ${kind}`
            : `retire le dernier ${kind} posé, toutes charges comprises (aura comprise)`,
      }
    }
  }
}

const TARGET = (target: Effect['target']) => (target === 'opponent' ? "sur l'adversaire" : 'sur soi')

/** Un effet : médaillon (icône du statut, ou symbole de l'effet immédiat) et sa règle en clair. */
export function EffectLine({ effect }: { effect: Effect }) {
  if (effect.type === 'applyStatus') {
    const def = STATUSES[effect.status]
    const status = { id: effect.status, stacks: effect.stacks, turns: effect.turns }
    return (
      <div className="flex items-start gap-3" title={def.summary}>
        <StatusIcon id={effect.status} className="h-9 w-9 shrink-0" />
        <p className="font-body text-[15px] leading-snug text-ink-1">
          <span className={`mr-1.5 rounded-(--r-xs) border px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider ${POLARITY_STYLE[def.polarity].chip}`}>
            Pose
          </span>
          <b className="text-ink-1">{def.name}</b> <span className="text-ink-2">{TARGET(effect.target)}</span>
          <br />
          <span className="text-[13px] text-ink-2">{lowerFirst(def.describe(status))}</span>
        </p>
      </div>
    )
  }
  const immediate = immediateLook(effect)
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-surface-0/80 text-lg ${immediate.tone}`}>
        {immediate.glyph}
      </span>
      <p className="font-body text-[15px] leading-snug text-ink-1">
        <span className="mr-1.5 rounded-(--r-xs) border border-line-2 bg-ink-1/10 px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider text-ink-1">
          Immédiat
        </span>
        <b className="text-ink-1">{immediate.text}</b> <span className="text-ink-2">{TARGET(effect.target)}</span>
      </p>
    </div>
  )
}
