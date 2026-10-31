import { describeRelic, OFFER_SIZE, RELICS, type Relic } from '../../game/relics'
import { RelicSeal } from '../RelicSeal'
import { CodexBox, StatusChip, useFocusRef } from './CodexBits'
import { matches, type CompendiumNav, type SectionProps } from './sections'

/**
 * Section « Reliques » : les objets gagnés en tournoi (registre `relics.ts`), même disposition que les Statuts :
 * l'index à gauche, le détail de la relique choisie à droite. Ni type ni élément (2026-10-24, retour de
 * l'utilisateur) : une seule liste, et la règle de chacune dit quand elle agit. Le texte vient de `describeRelic`, la
 * seule rédaction d'une relique.
 */
export function RelicsSection({ nav, focus, filter }: SectionProps) {
  const focusRef = useFocusRef<HTMLButtonElement>(focus)
  const shown = RELICS.filter((r) => matches(filter, r.name, r.flavor, describeRelic(r).text))
  const selected = RELICS.find((r) => r.id === focus) ?? shown[0] ?? RELICS[0]

  if (!selected) return <p className="codex-panel p-6 font-body italic text-ink-3">Aucune relique pour l'instant.</p>

  return (
    <div className="grid h-full min-h-0 grid-cols-[520px_1fr] gap-6">
      <nav aria-label="Reliques" className="codex-panel scroll-panel min-h-0 overflow-y-auto">
        {shown.length === 0 && <p className="p-4 font-body italic text-ink-3">Aucune relique ne correspond.</p>}
        {shown.map((r) => (
          <button
            key={r.id}
            type="button"
            ref={r.id === focus ? focusRef : undefined}
            aria-current={r.id === selected.id}
            onClick={() => nav.go({ section: 'relics', id: r.id })}
            className="codex-row w-full"
          >
            <RelicSeal relic={r} size={48} />
            <span className="min-w-0">
              <span className="block font-display text-[17px] font-bold leading-tight text-ink-1">{r.name}</span>
              <span className="block truncate font-body text-[14px] text-ink-3">{describeRelic(r).text}</span>
            </span>
          </button>
        ))}
      </nav>
      <RelicDetail key={selected.id} relic={selected} nav={nav} />
    </div>
  )
}

function RelicDetail({ relic, nav }: { relic: Relic; nav: CompendiumNav }) {
  const { text, posed } = describeRelic(relic)
  return (
    <article className="codex-panel fade-in scroll-panel flex min-h-0 flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center gap-5">
        <RelicSeal relic={relic} size={128} />
        <div className="min-w-0">
          <h2 className="font-display text-4xl font-extrabold text-amber-100">{relic.name}</h2>
          <p className="mt-1 font-body text-[17px] italic leading-snug text-amber-200/80">{relic.flavor}</p>
        </div>
      </header>

      <CodexBox title="Règle">
        <p className="text-[19px] font-bold text-ink-1">{text}</p>
        {posed.map((p) => (
          <StatusChip key={p.status} status={p.status} target={p.target} nav={nav} />
        ))}
      </CodexBox>

      <p className="mt-auto font-body text-[14px] text-ink-3">
        Une relique se gagne au fil d’un tournoi, d’une saison ou d’une campagne{'\u00a0'}: on en choisit une parmi {OFFER_SIZE}, ou parmi {OFFER_SIZE + 1} à la 2e et à la 4e offre.
      </p>
    </article>
  )
}
