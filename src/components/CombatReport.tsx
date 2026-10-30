import { useMemo } from 'react'
import type { Character } from '../game/character'
import { SIDE_STYLE, type CombatResult, type Side } from '../game/combat'
import { DIE_FACES } from '../game/events'
import { forgedFaces, rankLabel } from '../game/forge'
import { getRelic, relicKind, type Relic } from '../game/relics'
import { addReport, combatReport, emptyReport, relicsByProcs, type FighterReport } from '../game/report'
import { buildOf, seasonReport, standings, type Season } from '../game/season'
import { entrantCharacter } from '../game/tournament'
import { StrikeDie } from './Die'
import { ForgeFaceTooltip } from './ForgeFaceTooltip'
import { Portrait } from './Portrait'
import { RelicSeal, RelicTooltip } from './RelicSeal'
import { SkillSeal } from './SkillSeal'
import { SkillTooltip } from './SkillDice'
import { useTipLayer } from './TipLayer'

/*
 * Rapport de combat (écran de victoire) et de saison (fin de saison) : les déclenchements de chaque relique, et combien
 * de fois chaque face du dé est tombée, en histogramme au-dessus des faces du dé (forgées comprises : gravure, dorure,
 * rang). Tout vient de report.ts, lu dans la chronologie du combat ; rien n'est recalculé ici.
 */

const TILE = { sm: 40, xs: 34 } as const

/**
 * Faces jouées en histogramme : une colonne par face du dé, le compte au-dessus de sa barre, la face en dessous (sceau de
 * sa compétence ou de son aura, gravure, dorure, rang, comme ForgedDie), son infobulle au survol. Les faces tombées
 * hors du dé forgé (un dé grandi par une relique) suivent, nues.
 */
export function FaceHistogram({
  character,
  report,
  size = 'sm',
  barHeight = 56,
  tooltip = 'above',
}: {
  character: Character
  report: FighterReport
  size?: keyof typeof TILE
  barHeight?: number
  tooltip?: 'above' | 'below'
}) {
  const die = forgedFaces(character.definition, character.forge)
  const count = Math.max(die.length, DIE_FACES, report.faces.length)
  const top = Math.max(1, ...report.faces)
  return (
    <ul className={`flex flex-wrap items-end ${size === 'sm' ? 'gap-1' : 'gap-x-0.5 gap-y-3'}`} aria-label={`Faces jouées par ${character.name}`}>
      {Array.from({ length: count }, (_, k) => {
        const face = k + 1
        const f = die[k]
        const n = report.faces[k] ?? 0
        const skill = f?.engraved ?? f?.origin[0]
        const align = k < count / 3 ? 'left' : k >= (count * 2) / 3 ? 'right' : 'center'
        return (
          <li key={face} className="group relative flex flex-col items-center gap-1 hover:z-[70]" style={{ width: TILE[size] }}>
            <span className={`font-data text-[15px] font-bold tabular-nums leading-none ${n === 0 ? 'text-ink-off' : n === top ? 'text-gold-200' : 'text-ink-1'}`}>{n}</span>
            <span className="flex w-full items-end" style={{ height: barHeight }}>
              <span className="report-bar" data-top={n === top && n > 0 ? '' : undefined} style={{ height: n === 0 ? 2 : Math.max(4, (n / top) * barHeight) }} />
            </span>
            <span
              className="forge-face"
              data-size="sm"
              data-engraved={f?.engraved ? '' : undefined}
              data-gild={f?.gild ? '' : undefined}
              aria-label={`Face ${face} : ${n} fois`}
              style={{ width: TILE[size], height: TILE[size] }}
            >
              {skill ? <SkillSeal id={skill.id} size={32} /> : face}
              {skill && <span className="forge-face-num">{face}</span>}
              {!!f?.rank && <span className="forge-face-rank">{rankLabel(f.rank)}</span>}
            </span>
            {/* Même infobulle que le dé forgé : sa compétence, ou la face (sans compétence, dorée) ; rien hors du dé forgé */}
            {f && (skill && !f.gild ? <SkillTooltip event={skill} face={face} placement={tooltip} align={align} /> : <ForgeFaceTooltip face={f} placement={tooltip} align={align} />)}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Les reliques d'un combattant et leurs déclenchements : le sceau, son infobulle, et « ×N » ; une relique de
 * caractéristique agit en permanence, sans déclenchement. Les reliques déclenchées qu'il ne porte pas (ou plus) suivent
 * celles qu'il porte.
 */
export function RelicProcs({
  relics,
  report,
  size = 44,
  tooltip = 'above',
}: {
  relics: readonly Relic[]
  report: FighterReport
  size?: number
  tooltip?: 'above' | 'below'
}) {
  // Dans un TipLayer (écran de saison), l'infobulle s'ouvre dans le calque : le cadre qui défile ne la coupe pas
  const tip = useTipLayer()
  const held = new Set(relics.map((r) => r.id))
  const shown = [...relics, ...relicsByProcs(report).flatMap(([id]) => (held.has(id) ? [] : [getRelic(id)]))]
  if (shown.length === 0) return null
  const compact = size < 36
  return (
    <ul className={`flex flex-wrap items-center gap-y-2 ${compact ? 'gap-x-2.5' : 'gap-x-4'}`} aria-label="Déclenchements des reliques">
      {shown.map((r, i) => {
        const n = report.relics[r.id] ?? 0
        const passive = relicKind(r) === 'stat'
        return (
          <li
            key={r.id}
            className="group/relic relative flex cursor-help items-center gap-1 hover:z-[70]"
            aria-label={`${r.name} : ${passive ? 'permanente' : `${n} fois`}`}
            onMouseEnter={tip ? (e) => tip(<RelicTooltip relic={r} placement="floating" />, e.currentTarget) : undefined}
            onMouseLeave={tip ? () => tip(null) : undefined}
          >
            <RelicSeal relic={r} size={size} spent={!passive && n === 0} />
            {/* Une relique de caractéristique agit sans se déclencher : son nom suffit en grand, son sceau en petit */}
            {passive ? (
              !compact && <span className="font-body text-[13px] font-bold uppercase tracking-wider text-ink-3">Permanente</span>
            ) : (
              <span className={`report-procs ${n === 0 ? 'text-ink-off' : 'text-gold-200'}`} style={{ fontSize: Math.round(size * 0.55) }}>
                ×{n}
              </span>
            )}
            {!tip && <RelicTooltip relic={r} placement={tooltip} align={i === 0 ? 'left' : 'center'} />}
          </li>
        )
      })}
    </ul>
  )
}

/** Le rapport d'un combattant : son nom, ses reliques et leurs déclenchements, ses faces jouées, ses dés de frappe. */
function FighterBlock({ character, side, report, winner }: { character: Character; side: Side; report: FighterReport; winner: boolean }) {
  const rolled = report.faces.reduce((t, n) => t + n, 0)
  const strikes = report.strikes ?? 0
  return (
    <section className={`report-block flex flex-col gap-2.5 px-4 py-3 ${winner ? '' : 'opacity-80'}`}>
      <header className="flex items-baseline gap-3">
        <h3 className={`font-display text-[24px] font-extrabold leading-none ${SIDE_STYLE[side].accent}`}>{character.name}</h3>
        <span className="font-body text-[13px] font-bold uppercase tracking-wider text-gold-300">{winner ? 'Vainqueur' : 'Vaincu'}</span>
        <span className="ml-auto font-body text-[14px] text-ink-3">
          {rolled} dé{rolled > 1 ? 's' : ''} de compétence
        </span>
        {/* Les dés de frappe à part (D6 du retour du 30 octobre) : leur face ne lance rien, elle n'entre pas dans l'histogramme */}
        {strikes > 0 && (
          <span className="flex items-center gap-1.5 self-center font-body text-[14px] text-ink-3" aria-label={`${strikes} dé${strikes > 1 ? 's' : ''} de frappe`}>
            <span className="relative inline-block h-[18px] w-[18px]">
              <StrikeDie face={3} />
            </span>
            {strikes} de frappe
          </span>
        )}
      </header>
      {character.relics.length > 0 || Object.keys(report.relics).length > 0 ? (
        <RelicProcs relics={character.relics} report={report} />
      ) : (
        <p className="flex h-11 items-center font-body text-[15px] italic text-ink-3">Aucune relique</p>
      )}
      <FaceHistogram character={character} report={report} />
    </section>
  )
}

/** Rapport d'un combat (écran de victoire) : le vainqueur, puis le vaincu. */
export function CombatReportPanel({ result }: { result: CombatResult }) {
  const reports = combatReport(result)
  const order: Side[] = [result.winner, result.winner === 0 ? 1 : 0]
  return (
    <div className="flex flex-col gap-3" aria-label="Rapport de combat">
      {order.map((s) => (
        <FighterBlock key={s} character={result.fighters[s]} side={s} report={reports[s]} winner={s === result.winner} />
      ))}
    </div>
  )
}

/**
 * Rapport de saison (fin de saison, avant l'arbre) : les reliques les plus déclenchées de toute la saison, puis chaque
 * participant dans l'ordre du classement, avec sa construction finale (reliques, dé forgé), ses déclenchements et ses
 * faces jouées sur tous ses matchs.
 */
export function SeasonReport({ season }: { season: Season }) {
  // Le survol de l'écran de saison le rafraîchit souvent : le cumul ne se refait que si la saison change
  const { reports, total, top, counted, rows } = useMemo(() => {
    const reports = seasonReport(season)
    const total = reports.reduce((all, r) => addReport(all, r), emptyReport())
    const rows = standings(season).map((s) => {
      const e = season.entrants[s.entrant]
      const build = buildOf(season, s.entrant)
      // Parti de son aura de départ (le 1 de son dé), sa construction de saison forgée dessus
      const base = entrantCharacter(e)
      return { entrant: s.entrant, label: e.label, base, character: base.withRelics(build.relics.map(getRelic)).withForge(build.forge) }
    })
    return { reports, total, top: relicsByProcs(total), counted: Object.values(season.results).filter((r) => r.report).length, rows }
  }, [season])
  return (
    <section className="bracket-panel flex h-full min-h-0 min-w-0 flex-1 flex-col px-3 pb-2 pt-2" aria-label="Rapport de saison">
      <div className="flex items-baseline gap-3 border-b-2 border-line-2 px-1 pb-1.5">
        <h2 className="flex-1 font-display text-[22px] font-semibold tracking-wide text-ink-1">Rapport de saison</h2>
        <span className="font-body text-[14px] text-ink-3">
          {counted} match{counted > 1 ? 's' : ''}
        </span>
      </div>
      {counted === 0 ? (
        <p className="px-1 py-4 font-body text-[16px] italic text-ink-3">Aucun rapport : cette saison a été jouée avant les rapports de combat.</p>
      ) : (
        <>
          {/* Les reliques de toute la saison, de la plus déclenchée à la moins déclenchée */}
          <div className="border-b border-line-1 px-1 py-2.5">
            <p className="mb-2 font-body text-[13px] font-bold uppercase tracking-wider text-ink-3">Reliques déclenchées</p>
            {top.length > 0 ? (
              <RelicProcs relics={top.map(([id]) => getRelic(id))} report={total} size={36} tooltip="below" />
            ) : (
              <p className="font-body text-[15px] italic text-ink-3">Aucune relique déclenchée</p>
            )}
          </div>
          <ol className="scroll-panel min-h-0 flex-1 overflow-y-auto pr-2">
            {rows.map(({ entrant, label, base, character }, rank) => (
              <li key={entrant} className="flex flex-col gap-2 border-b border-line-1 px-1 py-2.5 last:border-b-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 text-right font-data text-[16px] font-semibold tabular-nums text-gold-300">{rank + 1}</span>
                  <span className="h-8 w-8 shrink-0 overflow-hidden rounded-(--r-xs)">
                    <Portrait character={base} side={0} className="h-full w-full" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-body text-[17px] font-semibold text-ink-1">{label}</span>
                </div>
                {/* Ses faces jouées, puis ses reliques à droite, sur deux lignes au besoin : six reliques et leurs comptes
                    ne tiennent pas à côté du nom */}
                <div className="flex items-end gap-5">
                  <FaceHistogram character={character} report={reports[entrant]} size="xs" barHeight={34} tooltip="below" />
                  <div className="min-w-0 flex-1 pb-1">
                    <RelicProcs relics={character.relics} report={reports[entrant]} size={28} tooltip="below" />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
