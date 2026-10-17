import { useMemo } from 'react'
import { Character } from '../game/character'
import { emptyRecord, ratios, useHistory } from '../game/history'
import { ROSTER } from '../game/roster'
import { Fighter } from './Fighter'
import { fmtNum, fmtPct, Kpi, MatchRow, MiniPortrait, WinBar } from './RecordBits'
import { STAT_LINES, StatSheet } from './StatSheet'
import { EventInfo } from './EventInfo'

interface Props {
  characterId: string
  onSelect: (id: string) => void
  onBack: () => void
}

/** Fiche d'un personnage : modèle, caractéristiques, lien avec sa variante et palmarès. */
export function CharacterScreen({ characterId, onSelect, onBack }: Props) {
  const roster = useMemo(() => ROSTER.map((def) => new Character(def)), [])
  const history = useHistory()
  const index = roster.findIndex((c) => c.id === characterId)
  const character = roster[index]
  const record = history.characters[character.id] ?? emptyRecord()
  const r = ratios(record)

  // Une variante se compare à son original ; un original à sa (première) variante.
  const related = character.baseId
    ? roster.find((c) => c.id === character.baseId)
    : roster.find((c) => c.baseId === character.id)
  const matches = history.matches.filter((m) => m.fighters.includes(character.id)).slice(0, 7)
  const browse = (step: number) => onSelect(roster[(index + step + roster.length) % roster.length].id)

  return (
    <div className="fade-in grid h-full grid-cols-[380px_1fr_1fr] gap-10 px-12 py-10">
      {/* Modèle */}
      <div className="flex flex-col items-center justify-end gap-4">
        <div className="h-[660px]">
          <Fighter key={character.id} character={character} side={0} className="fade-in" />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => browse(-1)}
            className="rounded-md border border-stone-700 px-3 py-1.5 font-bold hover:bg-stone-800"
          >
            ‹
          </button>
          <span className="w-20 text-center text-sm text-stone-500">
            {index + 1} / {roster.length}
          </span>
          <button
            onClick={() => browse(1)}
            className="rounded-md border border-stone-700 px-3 py-1.5 font-bold hover:bg-stone-800"
          >
            ›
          </button>
        </div>
      </div>

      {/* Identité et caractéristiques */}
      <div className="flex min-h-0 flex-col gap-6">
        <button onClick={onBack} className="self-start text-sm font-bold text-stone-400 hover:text-stone-100">
          ← Retour à la sélection
        </button>
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-stone-500">
            {character.race} · {character.archetype}
          </p>
          <h1 className="font-display text-7xl font-extrabold text-amber-200">{character.name}</h1>
          {related && (
            <button
              onClick={() => onSelect(related.id)}
              className="mt-2 flex items-center gap-2 text-sm text-stone-400 hover:text-stone-100"
            >
              <MiniPortrait character={related} size="h-8 w-8" />
              {character.baseId ? 'Variante de coloris de' : 'Variante de coloris :'}{' '}
              <b className="text-stone-200">{related.name}</b>
            </button>
          )}
        </div>

        <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-500">Caractéristiques</h2>
          <StatSheet character={character} barClass="bg-amber-400" />
          <h2 className="mb-2 mt-4 text-xs font-bold uppercase tracking-widest text-stone-500">Événement</h2>
          <EventInfo character={character} />
        </section>

        {related && (
          <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-500">
              Comparé à {related.name}
            </h2>
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
                        {delta === 0
                          ? '='
                          : `${delta > 0 ? '+' : '−'}${l.format(Math.abs(delta)).replace(/^1d|^×/, '')}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {/* Palmarès */}
      <div className="flex min-h-0 flex-col gap-5 pt-10">
        <h2 className="text-xs font-bold uppercase tracking-widest text-stone-500">
          Palmarès{' '}
          <span className="font-normal normal-case tracking-normal">
            · {record.played} joués, {record.simulated} simulés
          </span>
        </h2>
        <div className="grid grid-cols-4 gap-2">
          <Kpi label="Combats" value={record.fights} />
          <Kpi label="Victoires" value={record.wins} />
          <Kpi label="% victoire" value={fmtPct(r.winRate)} accent="text-amber-300" />
          <Kpi label="Dégâts / combat" value={fmtNum(r.damagePerFight)} />
          <Kpi label="Coups réussis" value={fmtPct(r.hitRate)} />
          <Kpi label="Critiques" value={fmtPct(r.critRate)} accent="text-amber-200" />
          <Kpi label="Esquives" value={fmtPct(r.dodgeRate)} accent="text-cyan-200" />
          <Kpi label="Armure absorbée" value={record.absorbed} />
          <Kpi label="Meilleur coup" value={record.bestHit || '—'} />
          <Kpi label="🏆 Tournois" value={record.tournamentWins} accent="text-amber-300" />
          <Kpi label="✨ Événements" value={record.events} accent="text-violet-200" />
          <Kpi label="PV regagnés" value={record.healed} accent="text-emerald-300" />
        </div>

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">Contre chaque adversaire</h3>
          <ul className="flex flex-col gap-1.5">
            {roster.map((opp) => {
              const vs = record.opponents[opp.id]
              return (
                <li key={opp.id} className="grid grid-cols-[2rem_6rem_1fr_3.5rem] items-center gap-2 text-sm">
                  <MiniPortrait character={opp} size="h-8 w-8" />
                  <span className="truncate text-stone-300">{opp.name}</span>
                  <WinBar rate={vs ? vs.wins / vs.fights : null} />
                  <span className="text-right text-xs text-stone-500">{vs ? `${vs.wins}/${vs.fights}` : '—'}</span>
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
  )
}
