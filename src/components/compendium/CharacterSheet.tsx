import { useState } from 'react'
import type { Character } from '../../game/character'
import { emptyRecord, ratios, useHistory } from '../../game/history'
import { CHARACTERS } from '../../game/roster'
import { fmtNum, fmtPct, Kpi, MatchRow, MiniPortrait, WIN_TEXT, WinBar } from '../RecordBits'
import { STAT_LINES, StatSheet } from '../StatSheet'
import { EventInfo } from '../EventInfo'
import { Icon } from '../Icon'
import { Tabs } from '../Tabs'

interface Props {
  characterId: string
  /** Ouvre un autre personnage (ex. sa variante) */
  onSelect: (id: string) => void
  /** Onglet affiché à l'ouverture */
  initialTab?: SheetTab
}

export type SheetTab = 'sheet' | 'stats'

/**
 * Fiche d'un personnage, dans le compendium : le modèle à gauche ; à droite, deux onglets.
 * - « Fiche » : ce qui définit le personnage (background, forces, événement, stats, variante).
 * - « Statistiques » : ce qu'il a fait (palmarès, adversaires, derniers combats).
 */
export function CharacterSheet({ characterId, onSelect, initialTab = 'sheet' }: Props) {
  const roster = CHARACTERS
  const history = useHistory()
  // Conservé en passant d'un personnage à l'autre
  const [tab, setTab] = useState<SheetTab>(initialTab)
  const character = roster.find((c) => c.id === characterId) ?? roster[0]
  const record = history.characters[character.id] ?? emptyRecord()
  const r = ratios(record)

  // Une variante se compare à son original ; un original à sa (première) variante.
  const related = character.baseId
    ? roster.find((c) => c.id === character.baseId)
    : roster.find((c) => c.baseId === character.id)
  const matches = history.matches.filter((m) => m.fighters.includes(character.id)).slice(0, 5)

  return (
    <div className="relative isolate grid h-full min-h-0 grid-cols-[330px_1fr] gap-8">
      {/* Le personnage en arrière-plan, grand, centré sur la colonne du modèle (qui reste vide) */}
      <BackdropFigure key={character.id} character={character} />
      <div aria-hidden />

      <div className="flex min-h-0 flex-col gap-4">
        {/* Identité */}
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">
              {character.race} · {character.archetype}
            </p>
            <h2 className="font-display text-5xl font-extrabold text-amber-200">{character.name}</h2>
          </div>
          {related && (
            <button
              onClick={() => onSelect(related.id)}
              className="mb-1 flex items-center gap-2 text-sm text-stone-400 hover:text-stone-100"
            >
              <MiniPortrait character={related} size="h-8 w-8" />
              {character.baseId ? 'Variante de coloris de' : 'Variante de coloris :'}{' '}
              <b className="text-stone-200">{related.name}</b>
            </button>
          )}
        </div>

        {/* Onglets */}
        <Tabs
          className="self-start"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'sheet', label: 'Fiche', icon: 'scroll' },
            { id: 'stats', label: 'Statistiques', icon: 'stats', hint: `${record.fights} combats` },
          ]}
        />

        {tab === 'sheet' ? (
          <div key={`sheet-${character.id}`} className="fade-in grid min-h-0 grid-cols-2 gap-8">
            {/* Identité de jeu : qui il est, comment il se bat */}
            <div className="flex min-h-0 flex-col gap-5">
              <div className="flex flex-col gap-2">
                <p className="font-display text-lg italic text-amber-200/80">« {character.lore.tagline} »</p>
                <p className="leading-snug text-stone-300">{character.lore.background}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <section>
                  <h2 className="mb-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400/80">Forces</h2>
                  <ul className="flex flex-col gap-1 text-emerald-200">
                    {character.lore.strengths.map((t) => (
                      <li key={t}>▲ {t}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h2 className="mb-1.5 text-xs font-bold uppercase tracking-widest text-red-400/80">Faiblesses</h2>
                  <ul className="flex flex-col gap-1 text-red-300">
                    {character.lore.weaknesses.map((t) => (
                      <li key={t}>▼ {t}</li>
                    ))}
                  </ul>
                </section>
              </div>
              {/* Six compétences pour un personnage à formes : la liste défile dans son cadre */}
              <section className="flex min-h-0 flex-1 flex-col">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">Compétences</h2>
                <div className="scroll-panel min-h-0 flex-1 overflow-y-auto pr-1">
                  <EventInfo character={character} />
                </div>
              </section>
            </div>

            {/* Caractéristiques */}
            <div className="flex flex-col gap-5">
              <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-500">Caractéristiques</h2>
                <StatSheet character={character} barClass="bg-ink-2" />
              </section>
              {related && <VariantComparison character={character} related={related} />}
            </div>
          </div>
        ) : (
          <div key={`stats-${character.id}`} className="fade-in grid min-h-0 grid-cols-2 gap-8">
            <div className="flex flex-col gap-5">
              <p className="text-sm text-stone-500">
                {record.played} joués, {record.simulated} simulés
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Kpi label="Combats" value={record.fights} />
                <Kpi label="Victoires" value={record.wins} />
                <Kpi label="% victoire" value={fmtPct(r.winRate)} accent={r.winRate === null ? undefined : WIN_TEXT(r.winRate)} />
                <Kpi label="Dégâts / combat" value={fmtNum(r.damagePerFight)} />
                <Kpi label="Coups réussis" value={fmtPct(r.hitRate)} />
                <Kpi label="Critiques" value={fmtPct(r.critRate)} accent="text-crit" />
                <Kpi label="Esquives" value={fmtPct(r.dodgeRate)} accent="text-dodge" />
                <Kpi label="Armure absorbée" value={record.absorbed} />
                <Kpi label="Meilleur coup" value={record.bestHit || '—'} />
                <Kpi
                  label={
                    <>
                      <Icon name="trophy" /> Tournois
                    </>
                  }
                  value={record.tournamentWins}
                  accent="text-gold-300"
                />
                <Kpi
                  label={
                    <>
                      <Icon name="event" /> Compétences
                    </>
                  }
                  value={record.events}
                  accent="text-arcane"
                />
                <Kpi label="PV regagnés" value={record.healed} accent="text-good" />
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-5">
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">
                  Contre chaque adversaire
                </h3>
                <ul className="flex flex-col gap-1">
                  {roster.map((opp) => {
                    const vs = record.opponents[opp.id]
                    return (
                      <li
                        key={opp.id}
                        className="grid grid-cols-[1.75rem_5.5rem_1fr_3.5rem] items-center gap-2 text-sm"
                      >
                        <MiniPortrait character={opp} size="h-7 w-7" />
                        <span className="truncate text-stone-300">{opp.name}</span>
                        <WinBar rate={vs ? vs.wins / vs.fights : null} />
                        <span className="text-right text-xs text-stone-500">
                          {vs ? `${vs.wins}/${vs.fights}` : '—'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>

              <section className="min-h-0">
                <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-stone-500">Derniers combats</h3>
                {matches.length === 0 ? (
                  <p className="text-sm italic text-stone-500">Aucun combat pour l'instant.</p>
                ) : (
                  <ul>
                    {matches.map((m) => (
                      <MatchRow key={m.id} match={m} focus={character.id} />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Grande figure en fond : pieds en bas de l'écran, centrée sur la colonne du modèle, assombrie
 * et fondue sur les bords pour que la fiche reste lisible devant elle. Elle garde les tailles
 * relatives des races (`look.scale`).
 */
function BackdropFigure({ character }: { character: Character }) {
  const { look } = character
  const flip = look.facing !== 'right'
  return (
    <div
      aria-hidden
      className="backdrop-figure pointer-events-none absolute -bottom-8 left-[165px] -z-10 h-[850px] w-[640px] -translate-x-1/2"
    >
      {/* Halo chaud derrière la silhouette */}
      <div className="absolute inset-x-[8%] bottom-[4%] top-[18%] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_55%,rgba(245,158,11,0.16)_0%,rgba(120,53,15,0.1)_40%,transparent_70%)] blur-2xl" />
      <img
        src={look.image}
        alt=""
        draggable={false}
        className="absolute bottom-0 left-1/2 w-auto max-w-none -translate-x-1/2 select-none object-contain object-bottom"
        style={{
          height: `${look.scale * 100}%`,
          transform: flip ? 'scaleX(-1)' : undefined,
          filter: `${look.tint ?? ''} brightness(0.62) saturate(0.85) contrast(1.05)`,
          // Fondu : le bas se perd dans le sol, les côtés dans le décor
          maskImage:
            'linear-gradient(to top, transparent 0%, #000 26%, #000 82%, rgba(0,0,0,0.6) 100%), linear-gradient(to right, transparent 0%, #000 22%, #000 58%, transparent 96%)',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      />
    </div>
  )
}

/** Écarts de stats avec l'original (ou la variante). */
function VariantComparison({ character, related }: { character: Character; related: Character }) {
  return (
    <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-500">Comparé à {related.name}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-stone-500">
            <th className="pb-1 text-left font-normal">Stat</th>
            <th className="pb-1 text-right font-normal">{character.name}</th>
            <th className="pb-1 text-right font-normal">{related.name}</th>
            <th className="pb-1 text-right font-normal">Écart</th>
          </tr>
        </thead>
        <tbody>
          {STAT_LINES.map((l) => {
            const mine = character.stats[l.key]
            const theirs = related.stats[l.key]
            const delta = Math.round((mine - theirs) * 100) / 100
            return (
              <tr key={l.key} className="border-t border-stone-800/60">
                <td className="py-1 text-stone-400">{l.label}</td>
                <td className="py-1 text-right font-mono text-stone-100">{l.format(mine)}</td>
                <td className="py-1 text-right font-mono text-stone-400">{l.format(theirs)}</td>
                <td
                  className={`py-1 text-right font-mono ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-stone-600'}`}
                >
                  {delta === 0 ? '=' : `${delta > 0 ? '+' : '−'}${l.format(Math.abs(delta)).replace(/^1d|^×/, '')}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
