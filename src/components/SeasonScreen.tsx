import { useState } from 'react'
import tournamentImg from '../assets/menu-tournament.jpg'
import { getRelic } from '../game/relics'
import { CHARACTERS } from '../game/roster'
import {
  buildDone,
  buildOf,
  currentDay,
  matchCount,
  nextSeasonMatch,
  playedCount,
  seasonSchedule,
  seasonStatus,
  standings,
  type Fixture,
  type Season,
  type Standing,
} from '../game/season'
import { SLOTS } from '../game/tournament'
import { ForgeMark } from './ForgedDie'
import { Portrait } from './Portrait'
import { BackLink, Button, IconButton } from './kit'
import { RelicRow } from './RelicSeal'
import { SeasonReport } from './CombatReport'
import { TipLayer } from './TipLayer'

interface Props {
  season: Season
  /** Simulation en cours : la journée, ou toute la saison (journée par journée) */
  running: 'day' | 'all' | null
  /** Regarder un match de la journée : passe par l'écran d'affrontement, sans paris (récompense en construction) */
  onPlay: (number: number) => void
  onSimulateDay: () => void
  onSimulateSeason: () => void
  onStop: () => void
  /** Saison finie : les 16 premiers entrent dans l'arbre */
  onStartBracket: () => void
  onMenu: () => void
}

const characterById = (id: string) => CHARACTERS.find((c) => c.id === id)!

/** Mise en évidence du survol croisé : la ligne du classement et le match d'un même combattant */
const HIGHLIGHT = 'bg-gold-500/20 ring-2 ring-inset ring-gold-300'

/** Ce que la souris survole : un combattant du classement, ou un match de la journée (ses deux combattants) */
type Hover = { entrant: number } | { fixture: Fixture } | null

/** Colonnes chiffrées du classement : libellé, infobulle, valeur */
const COLUMNS: { label: string; title: string; value: (s: Standing) => string | number; width: string }[] = [
  { label: 'J', title: 'Matchs joués', value: (s) => s.played, width: 'w-11' },
  { label: 'V', title: 'Victoires', value: (s) => s.wins, width: 'w-11' },
  { label: 'D', title: 'Défaites', value: (s) => s.losses, width: 'w-11' },
  { label: 'Diff.', title: 'Différence de PV : dégâts infligés − dégâts subis', value: (s) => (s.diff > 0 ? `+${s.diff}` : s.diff), width: 'w-16' },
  { label: 'Pts', title: 'Points : 3 par victoire', value: (s) => s.points, width: 'w-16' },
]

/**
 * Phase de saison (0.86.0) : le classement en une seule liste qui défile (0.87.0), avec la ligne de qualification
 * sous le 16e et les suivants atténués, la journée en cours et ses matchs, et les commandes de simulation. Saison
 * finie : passer à l'arbre. Construction (0.92.0 ; une récompense par match en 0.115.0) : ce que chacun a reçu
 * (reliques, forge) au classement, combien ont fini la leur, et ce que chaque combattant a tiré de son match. 0.96.0 :
 * survol croisé classement ↔ journée, infobulles des améliorations dans un calque (TipLayer) que le défilement ne coupe
 * pas, grand bouton Combattre (nextSeasonMatch).
 */
export function SeasonScreen({ season, running, onPlay, onSimulateDay, onSimulateSeason, onStop, onStartBracket, onMenu }: Props) {
  const n = season.entrants.length
  const schedule = seasonSchedule(n)
  const day = currentDay(season)
  const done = day === null
  // Journée affichée : celle en cours, sauf si l'on en parcourt une autre
  const [viewDay, setViewDay] = useState<number | null>(null)
  // Saison finie : le rapport de saison à la place de la journée, ou la journée de nouveau
  const [report, setReport] = useState(true)
  const shown = viewDay ?? day ?? schedule.length - 1
  const table = standings(season)
  const played = playedCount(season)
  // Construction de chacun : complète, elle est figée
  const builds = season.rewards.length > 0 ? season.entrants.map((_, i) => buildOf(season, i)) : undefined
  const finished = builds?.filter((b) => buildDone(season, b)).length ?? 0
  const baseOf = (entrant: number) => characterById(season.entrants[entrant].characterId).definition
  // Survol croisé : un combattant allume son match de la journée affichée, un match allume ses deux lignes
  const [hover, setHover] = useState<Hover>(null)
  const rowLit = (entrant: number) => !!hover && 'fixture' in hover && (hover.fixture.home === entrant || hover.fixture.away === entrant)
  const matchLit = (f: Fixture) => !!hover && 'entrant' in hover && (f.home === hover.entrant || f.away === hover.entrant)
  const next = nextSeasonMatch(season)
  const nextFixture = next === null ? undefined : schedule.flat().find((f) => f.number === next)

  const simulate = (run: () => void) => {
    setViewDay(null)
    run()
  }

  const row = (s: Standing, rank: number) => {
    const e = season.entrants[s.entrant]
    const qualified = rank <= SLOTS
    const build = builds?.[s.entrant]
    return (
      <li
        key={s.entrant}
        onMouseEnter={() => setHover({ entrant: s.entrant })}
        onMouseLeave={() => setHover(null)}
        className={`flex h-11 items-center gap-3 border-b border-line-1 px-3 transition-colors ${rowLit(s.entrant) ? HIGHLIGHT : qualified ? '' : 'opacity-50'}`}
      >
        <span className={`w-8 text-right font-data text-[18px] font-semibold tabular-nums ${qualified ? 'text-gold-300' : 'text-ink-3'}`}>{rank}</span>
        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-(--r-xs)">
          <Portrait character={characterById(e.characterId)} side={0} className="h-full w-full" />
        </span>
        <span className={`min-w-0 flex-1 truncate font-body text-[18px] font-semibold ${qualified ? 'text-ink-1' : 'text-ink-2'}`} title={e.label}>
          {e.label}
        </span>
        {/* Sa construction : ses reliques, puis ses opérations de forge, dans l'ordre (dix au plus : un acte de campagne) */}
        {build && (
          <span className="flex w-[296px] shrink-0 items-center gap-1" aria-label="Construction">
            {build.relics.length > 0 && <RelicRow relics={build.relics.map(getRelic)} size={26} />}
            {build.forge.map((_, i) => (
              <ForgeMark key={i} base={baseOf(s.entrant)} steps={build.forge} index={i} size={26} />
            ))}
          </span>
        )}
        {COLUMNS.map((c) => (
          <span
            key={c.label}
            className={`${c.width} text-right font-data text-[17px] tabular-nums ${c.label === 'Pts' ? (qualified ? 'font-bold text-gold-200' : 'font-bold text-ink-2') : 'text-ink-2'}`}
          >
            {c.value(s)}
          </span>
        ))}
      </li>
    )
  }

  /** La limite de l'arbre, juste après le 16e : au-dessus, qualifiés ; au-dessous, non qualifiés */
  const qualificationLine = (
    <li key="ligne" className="flex items-center gap-3 border-y-4 border-gold-400 bg-gold-500/15 px-3 py-1.5">
      <span className="font-body text-[15px] font-bold uppercase tracking-wider text-gold-200">Ligne de qualification</span>
      <span className="ml-auto font-body text-[14px] font-bold uppercase tracking-wider text-gold-300">
        {done ? `Au-dessus, les ${SLOTS} qualifiés · en dessous, éliminés` : `Au-dessus, qualifiés pour l'arbre · en dessous, non qualifiés`}
      </span>
    </li>
  )

  return (
    <TipLayer className="fade-in relative isolate h-full">
      {/* Même décor que l'arbre : la porte de l'arène, très assombrie */}
      <img
        src={tournamentImg}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover"
        style={{ filter: 'brightness(0.2) saturate(0.7)' }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_55%,transparent_20%,rgba(14,11,9,0.85)_100%)]" />

      <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-8 pr-20 pt-5">
        <div>
          <BackLink onClick={onMenu}>Menu</BackLink>
          <h1 className="on-illus mt-1 font-display text-[44px] font-bold leading-none tracking-wide text-gold-200">Saison</h1>
          <p className="mt-1 whitespace-nowrap font-body text-[17px] text-ink-2">
            {done ? 'Saison terminée' : `Journée ${day + 1} / ${schedule.length}`} · {played} / {matchCount(season)} matchs joués · {n}{' '}
            participants
            {builds && (
              <span className={finished < n ? 'font-semibold text-gold-300' : 'text-ink-3'}>
                {' '}
                · {finished < n ? `Constructions : ${finished} / ${n} achevées` : 'Constructions figées'}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4 pt-6">
          {running === 'all' && (
            <Button variant="tertiary" size="md" icon="pause" onClick={onStop}>
              Interrompre
            </Button>
          )}
          {!done && (
            <>
              <Button variant="secondary" size="md" icon="simuler" disabled={!!running} onClick={() => simulate(onSimulateDay)} title="Simule les matchs restants de la journée en cours">
                Simuler la journée
              </Button>
              <Button variant="secondary" size="md" icon="simuler" disabled={!!running} onClick={() => simulate(onSimulateSeason)} title="Simule toute la saison, journée par journée">
                Simuler la saison
              </Button>
              <Button
                variant="primary"
                size="xl"
                icon="combattre"
                disabled={!!running || next === null}
                onClick={() => next !== null && onPlay(next)}
                title={
                  nextFixture
                    ? `Prochain match : ${season.entrants[nextFixture.home].label} contre ${season.entrants[nextFixture.away].label} (journée ${nextFixture.day + 1})`
                    : undefined
                }
              >
                Combattre
              </Button>
            </>
          )}
          {done && (
            <Button
              variant="secondary"
              size="md"
              icon={report ? 'journal' : 'statistiques'}
              onClick={() => setReport(!report)}
              title={report ? 'Revoir les matchs de chaque journée' : 'Reliques déclenchées et faces jouées de toute la saison'}
            >
              {report ? 'Journées' : 'Rapport'}
            </Button>
          )}
          {done && (
            <Button variant="primary" size="xl" icon="tournoi" onClick={onStartBracket} title={`Les ${SLOTS} premiers entrent dans l'arbre, placés en têtes de série`}>
              Passer à l'arbre
            </Button>
          )}
        </div>
      </header>

      <div className="absolute inset-x-8 bottom-4 top-[140px] flex items-start gap-6">
        {/* Le classement : une seule liste, du 1er au dernier, qui défile dans son cadre */}
        <section className="bracket-panel flex h-full w-[900px] shrink-0 flex-col pb-2 pt-2.5">
          <div className="flex items-center gap-3 border-b-2 border-line-2 px-3 pb-1.5 pr-5">
            <h2 className="min-w-0 flex-1 font-display text-[22px] font-semibold tracking-wide text-ink-1">Classement</h2>
            {builds && (
              <span title="Reliques et forge du dé reçues pendant la construction" className="w-[296px] font-body text-[14px] font-bold uppercase tracking-wider text-ink-3">
                Construction
              </span>
            )}
            {COLUMNS.map((c) => (
              <span key={c.label} title={c.title} className={`${c.width} text-right font-body text-[14px] font-bold uppercase tracking-wider text-ink-3`}>
                {c.label}
              </span>
            ))}
          </div>
          <ol className="scroll-panel min-h-0 flex-1 overflow-y-auto pr-2">
            {table.flatMap((s, i) => (i === SLOTS ? [qualificationLine, row(s, i + 1)] : [row(s, i + 1)]))}
          </ol>
        </section>

        {/* Saison finie : le rapport de saison (reliques déclenchées, faces jouées), à la place de la journée */}
        {done && report && <SeasonReport season={season} />}

        {/* La journée : ses matchs, à regarder ou déjà joués */}
        <section className={`bracket-panel min-w-0 flex-1 flex-col px-3 pb-2 pt-2 ${done && report ? 'hidden' : 'flex'}`}>
          <div className="flex items-center gap-2 border-b-2 border-line-2 px-1 pb-1.5">
            <IconButton icon="moment-precedent" label="Journée précédente" size="sm" disabled={shown === 0} onClick={() => setViewDay(shown - 1)} />
            <h2 className="flex-1 text-center font-display text-[22px] font-semibold tracking-wide text-ink-1">
              Journée {shown + 1}
              <span className="ml-2 font-body text-[14px] font-bold uppercase tracking-wider text-ink-3">{shown < n - 1 ? 'aller' : 'retour'}</span>
            </h2>
            <IconButton
              icon="moment-suivant"
              label="Journée suivante"
              size="sm"
              disabled={shown === schedule.length - 1}
              onClick={() => setViewDay(shown + 1)}
            />
          </div>
          <ol>
            {schedule[shown].map((f) => {
              const r = season.results[f.number]
              const side = (i: number, s: 0 | 1) => {
                const e = season.entrants[i]
                const won = r?.winner === s
                const lost = !!r && !won
                // Sa récompense (gagnant comme perdant), et pour une forge ce qu'il avait forgé avant cette journée
                // (l'infobulle dit ce qu'elle a produit)
                const reward = r?.rewards?.[s] ?? undefined
                const forgedBefore = reward?.kind === 'forge' ? buildOf(season, i, f.day).forge : []
                return (
                  <span className={`flex min-w-0 flex-1 items-center gap-2 ${s === 0 ? 'flex-row-reverse text-right' : ''}`}>
                    <span className={`h-7 w-7 shrink-0 overflow-hidden rounded-(--r-xs) ${lost ? 'opacity-40' : ''}`}>
                      <Portrait character={characterById(e.characterId)} side={s} className="h-full w-full" />
                    </span>
                    <span
                      className={`min-w-0 truncate font-body text-[16px] ${won ? 'font-bold text-gold-200' : lost ? 'text-ink-off line-through' : 'font-semibold text-ink-1'}`}
                    >
                      {e.label}
                    </span>
                    {reward &&
                      (reward.kind === 'relic' ? (
                        <RelicRow relics={[getRelic(reward.chosen)]} size={34} />
                      ) : (
                        <ForgeMark base={baseOf(i)} steps={[...forgedBefore, reward.chosen]} index={forgedBefore.length} />
                      ))}
                  </span>
                )
              }
              const pending = !r && seasonStatus(season, f.number) === 'pending'
              return (
                <li
                  key={f.number}
                  onMouseEnter={() => setHover({ fixture: f })}
                  onMouseLeave={() => setHover(null)}
                  className={`flex h-10 items-center gap-2 border-b border-line-1 px-1 transition-colors last:border-b-0 ${matchLit(f) ? HIGHLIGHT : ''}`}
                >
                  {side(f.home, 0)}
                  <span className="flex w-[150px] shrink-0 justify-center">
                    {r ? (
                      <span className="whitespace-nowrap font-data text-[13px] text-ink-3" title={`${r.hpLeft[r.winner]} PV restants au vainqueur`}>
                        {r.turns} tours · {r.hpLeft[r.winner]} PV
                      </span>
                    ) : (
                      <Button
                        variant="tertiary"
                        size="sm"
                        icon="combattre"
                        disabled={!!running || pending}
                        onClick={() => onPlay(f.number)}
                        title={pending ? 'Attend les matchs précédents de ses combattants : leur construction n’est pas encore connue' : "Ouvrir l'écran d'affrontement"}
                      >
                        Affronter
                      </Button>
                    )}
                  </span>
                  {side(f.away, 1)}
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </TipLayer>
  )
}
