import { useMemo, useState } from 'react'
import { Character } from '../game/character'
import { clearHistory, emptyRecord, ratios, useHistory } from '../game/history'
import { ROSTER } from '../game/roster'
import { fmtNum, fmtPct, MatchRow, MiniPortrait, WinBar, winColor } from './RecordBits'

interface Props {
  onOpenCharacter: (id: string) => void
  onBack: () => void
}

/** Statistiques globales de tous les personnages, tirées de l'historique local. */
export function RecordsScreen({ onOpenCharacter, onBack }: Props) {
  const roster = useMemo(() => ROSTER.map((def) => new Character(def)), [])
  const history = useHistory()
  const [confirmReset, setConfirmReset] = useState(false)
  const rec = (id: string) => history.characters[id] ?? emptyRecord()

  return (
    <div className="fade-in flex h-full flex-col gap-6 px-12 py-8">
      <header className="flex items-end justify-between pr-14">
        <div>
          <button onClick={onBack} className="text-sm font-bold text-stone-400 hover:text-stone-100">
            ← Retour à la sélection
          </button>
          <h1 className="font-display text-5xl font-extrabold text-amber-200">Statistiques</h1>
          <p className="text-sm text-stone-400">
            {history.totalMatches} combat{history.totalMatches > 1 ? 's' : ''} enregistré
            {history.totalMatches > 1 ? 's' : ''} · {history.played} joué{history.played > 1 ? 's' : ''} ·{' '}
            {history.simulated} simulé{history.simulated > 1 ? 's' : ''} · {history.tournaments} tournoi
            {history.tournaments > 1 ? 's' : ''} terminé{history.tournaments > 1 ? 's' : ''}
          </p>
        </div>
        {confirmReset ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-300">Effacer tout l'historique ?</span>
            <button
              onClick={() => {
                clearHistory()
                setConfirmReset(false)
              }}
              className="rounded-md bg-red-600 px-3 py-1.5 font-bold hover:bg-red-500"
            >
              Effacer
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="rounded-md border border-stone-700 px-3 py-1.5 hover:bg-stone-800"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            disabled={history.totalMatches === 0}
            className="rounded-md border border-stone-700 px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-800 disabled:opacity-40"
          >
            Réinitialiser
          </button>
        )}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_400px] gap-8">
        <div className="flex min-h-0 flex-col gap-6">
          {/* Tableau par personnage */}
          <table className="w-full overflow-hidden rounded-xl border border-stone-800 text-sm">
            <thead className="bg-stone-900 text-xs text-stone-500">
              <tr>
                <th className="px-3 py-2 text-left font-normal">Personnage</th>
                <th className="px-2 py-2 text-right font-normal">Combats</th>
                <th className="px-2 py-2 text-right font-normal">V / D</th>
                <th className="w-48 px-2 py-2 text-left font-normal">% victoire</th>
                <th className="px-2 py-2 text-right font-normal">Dégâts / combat</th>
                <th className="px-2 py-2 text-right font-normal">Coups réussis</th>
                <th className="px-2 py-2 text-right font-normal">Critiques</th>
                <th className="px-2 py-2 text-right font-normal">Esquives</th>
                <th className="px-2 py-2 text-right font-normal">Armure abs.</th>
                <th className="px-2 py-2 text-right font-normal">Meilleur coup</th>
                <th className="px-2 py-2 text-right font-normal">✨ Évts</th>
                <th className="px-3 py-2 text-right font-normal">🏆 Tournois</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((c) => {
                const r = rec(c.id)
                const x = ratios(r)
                return (
                  <tr key={c.id} className="border-t border-stone-800/70">
                    <td className="px-3 py-1">
                      <button onClick={() => onOpenCharacter(c.id)} className="group flex items-center gap-3 text-left">
                        <MiniPortrait character={c} size="h-9 w-9" />
                        <span>
                          <span className="block font-display font-bold text-stone-100 group-hover:text-amber-200">
                            {c.name}
                          </span>
                          <span className="block text-xs text-stone-500">
                            {c.race}
                            {c.baseId ? ' · variante' : ''}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-2 text-right font-mono tabular-nums">{r.fights}</td>
                    <td className="px-2 text-right font-mono tabular-nums text-stone-400">
                      {r.wins} / {r.fights - r.wins}
                    </td>
                    <td className="px-2">
                      <WinBar rate={x.winRate} />
                    </td>
                    <td className="px-2 text-right font-mono tabular-nums">{fmtNum(x.damagePerFight)}</td>
                    <td className="px-2 text-right font-mono tabular-nums">{fmtPct(x.hitRate)}</td>
                    <td className="px-2 text-right font-mono tabular-nums text-amber-200">{fmtPct(x.critRate)}</td>
                    <td className="px-2 text-right font-mono tabular-nums text-cyan-200">{fmtPct(x.dodgeRate)}</td>
                    <td className="px-2 text-right font-mono tabular-nums">{r.absorbed}</td>
                    <td className="px-2 text-right font-mono tabular-nums">{r.bestHit || '—'}</td>
                    <td className="px-2 text-right font-mono tabular-nums text-violet-200">{r.events}</td>
                    <td className="px-3 text-right font-mono tabular-nums text-amber-300">{r.tournamentWins}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Matrice des confrontations */}
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">
              Confrontations{' '}
              <span className="font-normal normal-case tracking-normal">
                · % de victoire de la ligne contre la colonne
              </span>
            </h2>
            <table className="text-sm">
              <thead>
                <tr>
                  <th />
                  {roster.map((c) => (
                    <th key={c.id} className="px-1 pb-1">
                      <div className="flex flex-col items-center gap-0.5">
                        <MiniPortrait character={c} size="h-8 w-8" />
                        <span className="text-[10px] font-normal text-stone-500">{c.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roster.map((row) => (
                  <tr key={row.id}>
                    <th className="pr-3 text-right text-xs font-bold text-stone-300">{row.name}</th>
                    {roster.map((col) => {
                      const vs = rec(row.id).opponents[col.id]
                      const rate = vs ? vs.wins / vs.fights : null
                      return (
                        <td key={col.id} className="p-0.5">
                          <div
                            title={
                              vs
                                ? `${row.name} contre ${col.name} : ${vs.wins} victoire(s) sur ${vs.fights}`
                                : 'Pas encore de combat'
                            }
                            className="flex h-9 w-24 flex-col items-center justify-center rounded-md border border-stone-800 bg-stone-900/60 leading-tight"
                            style={
                              rate === null
                                ? undefined
                                : { background: `color-mix(in srgb, ${winColor(rate)} 22%, transparent)` }
                            }
                          >
                            <span className="font-mono font-bold">{fmtPct(rate)}</span>
                            <span className="text-[10px] text-stone-500">{vs ? `${vs.fights} comb.` : ''}</span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        {/* Historique */}
        <section className="flex min-h-0 flex-col rounded-xl border border-stone-800 bg-stone-900/40 p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">
            Derniers combats <span className="font-normal normal-case tracking-normal">· ⚔ joué, ⚡ simulé</span>
          </h2>
          {history.matches.length === 0 ? (
            <p className="text-sm italic text-stone-500">Aucun combat enregistré. Jouez ou simulez un affrontement !</p>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto pr-1">
              {history.matches.map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
