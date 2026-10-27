import { useState } from "react";
import { clearHistory, emptyRecord, ratios, useHistory } from "../game/history";
import { CHARACTERS } from "../game/roster";
import {
  fmtNum,
  fmtPct,
  MatchRow,
  MiniPortrait,
  WinBar,
  winColor,
} from "./RecordBits";
import { Icon } from "./Icon";
import { Tabs } from "./Tabs";
import { BackLink, Button } from "./kit";

interface Props {
  onOpenCharacter: (id: string) => void;
  onBack: () => void;
  backLabel?: string;
}

/** Statistiques globales de tous les personnages, tirées de l'historique local. */
export function RecordsScreen({
  onOpenCharacter,
  onBack,
  backLabel = "Retour au menu",
}: Props) {
  const roster = CHARACTERS;
  const history = useHistory();
  const [confirmReset, setConfirmReset] = useState(false);
  const [tab, setTab] = useState<"table" | "matrix">("table");
  const rec = (id: string) => history.characters[id] ?? emptyRecord();

  return (
    <div className="fade-in flex h-full flex-col gap-6 px-12 py-8">
      <header className="flex items-end justify-between pr-14">
        <div>
          <BackLink onClick={onBack}>{backLabel}</BackLink>
          <h1 className="font-display text-5xl font-extrabold text-amber-200">
            Statistiques
          </h1>
          <p className="text-sm text-stone-400">
            {history.totalMatches} combat{history.totalMatches > 1 ? "s" : ""}{" "}
            enregistré
            {history.totalMatches > 1 ? "s" : ""} · {history.played} joué
            {history.played > 1 ? "s" : ""} · {history.simulated} simulé
            {history.simulated > 1 ? "s" : ""} · {history.tournaments} tournoi
            {history.tournaments > 1 ? "s" : ""} terminé
            {history.tournaments > 1 ? "s" : ""}
          </p>
        </div>
        {confirmReset ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-300">Effacer tout l'historique ?</span>
            <button
              onClick={() => {
                clearHistory();
                setConfirmReset(false);
              }}
              className="min-h-9 rounded-(--r-xs) bg-bad px-3 font-body text-[15px] font-bold text-ink-1 transition-[filter] hover:brightness-110"
            >
              Effacer
            </button>
            <Button variant="tertiary" size="sm" onClick={() => setConfirmReset(false)}>
              Annuler
            </Button>
          </div>
        ) : (
          <Button
            variant="tertiary"
            size="sm"
            icon="reinitialiser"
            onClick={() => setConfirmReset(true)}
            disabled={history.totalMatches === 0}
          >
            Réinitialiser
          </Button>
        )}
      </header>

      {/* La matrice prend toute la largeur ; le classement partage l'écran avec l'historique */}
      <div
        className={`grid min-h-0 flex-1 gap-8 ${tab === "matrix" ? "grid-cols-1" : "grid-cols-[1fr_400px]"}`}
      >
        <div className="flex min-h-0 flex-col gap-4">
          <Tabs
            className="self-start"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "table", label: "Classement" },
              { id: "matrix", label: "Confrontations" },
            ]}
          />
          {/* Tableau par personnage */}
          {/* Le tableau défile dans son cadre, en-tête figé, s'il ne tient pas dans l'écran */}
          {tab === "table" && (
            <div className="scroll-panel min-h-0 flex-1 overflow-y-auto rounded-(--r-sm) border border-line-1">
              <table className="w-full font-body text-[15px] text-ink-1">
                <thead className="sticky top-0 z-10 bg-surface-1 text-[13px] text-ink-3">
                  <tr>
                    <th className="px-3 py-2 text-left font-normal">
                      Personnage
                    </th>
                    <th className="px-2 py-2 text-right font-normal">
                      Combats
                    </th>
                    <th className="px-2 py-2 text-right font-normal">V / D</th>
                    <th className="w-48 px-2 py-2 text-left font-normal">
                      % victoire
                    </th>
                    <th className="px-2 py-2 text-right font-normal">
                      Dégâts / combat
                    </th>
                    <th className="px-2 py-2 text-right font-normal">
                      Coups réussis
                    </th>
                    <th className="px-2 py-2 text-right font-normal">
                      Critiques
                    </th>
                    <th className="px-2 py-2 text-right font-normal">
                      Esquives
                    </th>
                    <th className="px-2 py-2 text-right font-normal">
                      Armure abs.
                    </th>
                    <th className="px-2 py-2 text-right font-normal">
                      Meilleur coup
                    </th>
                    <th className="px-2 py-2 text-right font-normal">
                      <Icon name="event" /> Évts
                    </th>
                    <th className="px-3 py-2 text-right font-normal">
                      <Icon name="trophy" /> Tournois
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((c) => {
                    const r = rec(c.id);
                    const x = ratios(r);
                    return (
                      <tr key={c.id} className="border-t border-line-1">
                        <td className="px-3 py-1">
                          <button
                            onClick={() => onOpenCharacter(c.id)}
                            className="group flex items-center gap-3 text-left"
                          >
                            <MiniPortrait character={c} size="h-9 w-9" />
                            <span>
                              <span className="block font-display font-bold text-ink-1 group-hover:text-gold-300">
                                {c.name}
                              </span>
                              <span className="block text-[13px] text-ink-3">
                                {c.race}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-2 text-right font-data tabular-nums">
                          {r.fights}
                        </td>
                        <td className="whitespace-nowrap px-2 text-right font-data tabular-nums text-ink-2">
                          {r.wins} / {r.fights - r.wins}
                        </td>
                        <td className="px-2">
                          <WinBar rate={x.winRate} />
                        </td>
                        <td className="px-2 text-right font-data tabular-nums">
                          {fmtNum(x.damagePerFight)}
                        </td>
                        <td className="px-2 text-right font-data tabular-nums">
                          {fmtPct(x.hitRate)}
                        </td>
                        <td className="px-2 text-right font-data tabular-nums text-crit">
                          {fmtPct(x.critRate)}
                        </td>
                        <td className="px-2 text-right font-data tabular-nums text-dodge">
                          {fmtPct(x.dodgeRate)}
                        </td>
                        <td className="px-2 text-right font-data tabular-nums">
                          {r.absorbed}
                        </td>
                        <td className="px-2 text-right font-data tabular-nums">
                          {r.bestHit || "—"}
                        </td>
                        <td className="px-2 text-right font-data tabular-nums text-arcane">
                          {r.events}
                        </td>
                        <td className="px-3 text-right font-data tabular-nums text-gold-300">
                          {r.tournamentWins}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Matrice des confrontations : seule à l'écran, elle défile dans son cadre si le roster grandit */}
          {tab === "matrix" && (
            <section
              key="matrix"
              className="fade-in flex min-h-0 flex-1 flex-col"
            >
              <h2 className="mb-2 font-body text-[13px] font-bold uppercase tracking-widest text-ink-3">
                Confrontations{" "}
                <span className="font-normal normal-case tracking-normal">
                  · % de victoire de la ligne contre la colonne
                </span>
              </h2>
              <div className="scroll-panel min-h-0 flex-1 overflow-auto">
                <table className="font-body text-[15px] text-ink-1">
                  <thead className="sticky top-0 z-10 bg-surface-0">
                    <tr>
                      <th />
                      {roster.map((c) => (
                        <th key={c.id} className="px-1 pb-1">
                          <button
                            type="button"
                            onClick={() => onOpenCharacter(c.id)}
                            className="group flex flex-col items-center gap-0.5"
                          >
                            <MiniPortrait character={c} size="h-8 w-8" />
                            <span className="text-[13px] font-normal text-ink-3 group-hover:text-gold-300">
                              {c.name}
                            </span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((row) => (
                      <tr key={row.id}>
                        <th className="pr-3 text-right font-body text-[14px] font-bold text-ink-2">
                          <button
                            type="button"
                            onClick={() => onOpenCharacter(row.id)}
                            className="codex-link"
                          >
                            {row.name}
                          </button>
                        </th>
                        {roster.map((col) => {
                          const vs = rec(row.id).opponents[col.id];
                          const rate = vs ? vs.wins / vs.fights : null;
                          return (
                            <td key={col.id} className="p-0.5">
                              <div
                                title={
                                  vs
                                    ? `${row.name} contre ${col.name} : ${vs.wins} victoire(s) sur ${vs.fights}`
                                    : "Pas encore de combat"
                                }
                                className="flex h-10 w-24 flex-col items-center justify-center rounded-(--r-xs) border border-line-1 bg-surface-1/60 leading-tight"
                                style={
                                  rate === null
                                    ? undefined
                                    : {
                                        background: `color-mix(in srgb, ${winColor(rate)} 22%, transparent)`,
                                      }
                                }
                              >
                                <span className="font-data text-[14px] font-medium">
                                  {fmtPct(rate)}
                                </span>
                                <span className="text-[13px] text-ink-3">
                                  {vs ? `${vs.fights} comb.` : ""}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* Historique */}
        {tab === "table" && (
          <section className="flex min-h-0 flex-col rounded-(--r-sm) border border-line-1 bg-surface-1/40 p-4">
            <h2 className="mb-2 font-body text-[13px] font-bold uppercase tracking-widest text-ink-3">
              Derniers combats{" "}
              <span className="font-normal normal-case tracking-normal">
                · <Icon name="swords" /> joué, <Icon name="lightning" /> simulé
              </span>
            </h2>
            {history.matches.length === 0 ? (
              <p className="font-body text-[15px] italic text-ink-3">
                Aucun combat enregistré. Jouez ou simulez un affrontement !
              </p>
            ) : (
              <ul className="min-h-0 flex-1 overflow-y-auto pr-1">
                {history.matches.map((m) => (
                  <MatchRow key={m.id} match={m} onOpenCharacter={onOpenCharacter} />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
