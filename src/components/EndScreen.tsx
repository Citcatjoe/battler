import { useState } from 'react'
import { attacksOf, other, percent, SIDE_STYLE, SIDES, type CombatResult, type Side } from '../game/combat'
import { computeStats, type FighterStats } from '../game/stats'
import { Fighter } from './Fighter'
import { Icon } from './Icon'
import { Tabs, type TabDef } from './Tabs'

interface Props {
  result: CombatResult
  onReplay: () => void
  onMenu: () => void
  /** En tournoi : remplace Revanche / Menu par un retour à l'arbre */
  tournament?: { label: string; onContinue: () => void }
  /** Onglet affiché à l'ouverture */
  initialTab?: EndTab
}

interface Row {
  label: string
  value: (s: FighterStats) => string | number
  /** Valeur comparée pour mettre en avant le meilleur ; absente = pas de comparaison */
  score?: (s: FighterStats) => number
}

export type EndTab = 'summary' | 'defense' | 'events' | 'dice'

const TABS: TabDef<EndTab>[] = [
  { id: 'summary', label: 'Bilan', icon: 'swords' },
  { id: 'defense', label: 'Critiques et défense', icon: 'shield' },
  { id: 'events', label: 'Événements', icon: 'event' },
  { id: 'dice', label: 'Dés', icon: 'dice' },
]

interface Section {
  title: string
  /** Onglet où la section s'affiche */
  tab: EndTab
  rows: Row[]
}

const SECTIONS: Section[] = [
  {
    title: 'Bilan',
    tab: 'summary',
    rows: [
      { label: 'PV restants', value: (s) => s.hpLeft, score: (s) => s.hpLeft },
      { label: 'Dégâts infligés', value: (s) => s.totalDamage, score: (s) => s.totalDamage },
    ],
  },
  {
    title: 'Attaque',
    tab: 'summary',
    rows: [
      { label: 'Attaques portées', value: (s) => s.attacks },
      {
        label: 'Coups réussis',
        value: (s) => `${s.hits} / ${s.attacks} (${percent(s.hitRate)})`,
        score: (s) => s.hitRate,
      },
      {
        label: 'Dégâts moyens par coup réussi',
        value: (s) => s.averagePerHit.toFixed(2),
        score: (s) => s.averagePerHit,
      },
      { label: 'Meilleur coup', value: (s) => s.best, score: (s) => s.best },
      { label: 'Plus petit coup', value: (s) => s.worst },
    ],
  },
  {
    title: 'Critiques',
    tab: 'defense',
    rows: [
      { label: 'Coups critiques', value: (s) => s.crits, score: (s) => s.crits },
      { label: 'Dégâts des critiques', value: (s) => s.critDamage, score: (s) => s.critDamage },
    ],
  },
  {
    title: 'Défense',
    tab: 'defense',
    rows: [
      {
        label: 'Esquives réussies',
        value: (s) => `${s.dodges} / ${s.dodgeAttempts} (${percent(s.dodgeAttempts ? s.dodges / s.dodgeAttempts : 0)})`,
        score: (s) => s.dodges,
      },
      { label: "Dégâts absorbés par l'armure", value: (s) => s.absorbed, score: (s) => s.absorbed },
    ],
  },
  {
    title: 'Événements et statuts',
    tab: 'events',
    rows: [
      { label: 'Événements déclenchés', value: (s) => s.events, score: (s) => s.events },
      { label: 'PV regagnés', value: (s) => s.healed, score: (s) => s.healed },
      { label: 'Critiques assurés utilisés', value: (s) => s.forcedCrits },
      { label: 'Absorbé par les boucliers', value: (s) => s.shieldAbsorbed, score: (s) => s.shieldAbsorbed },
      { label: 'Dégâts subis hors coups', value: (s) => s.effectDamageTaken },
      { label: 'Malus reçus', value: (s) => s.debuffsTaken },
    ],
  },
  {
    title: 'Dés',
    tab: 'dice',
    rows: [
      { label: 'Jets maximaux', value: (s) => s.maxRolls },
      { label: 'Jets à 1', value: (s) => s.minRolls },
    ],
  },
]

export function EndScreen({ result, onReplay, onMenu, tournament, initialTab = 'summary' }: Props) {
  const stats = computeStats(result)
  const { fighters, winner } = result
  const attacks = attacksOf(result)
  const loser = other(winner)
  // Dernier coup porté par le vainqueur (le K.O. peut venir d'un effet, ex. poison)
  const finisher = [...attacks].reverse().find((a) => a.attacker === winner && !a.dodged)
  const biggest = attacks.reduce<(typeof attacks)[number] | undefined>(
    (best, a) => (!best || a.dealt > best.dealt ? a : best),
    undefined,
  )
  const totalCrits = stats[0].crits + stats[1].crits
  const totalDodges = stats[0].dodges + stats[1].dodges

  const [tab, setTab] = useState<EndTab>(initialTab)
  const sections = SECTIONS.filter((section) => section.tab === tab)

  const isBetter = (row: Row, side: Side) => {
    if (!row.score) return false
    const [a, b] = [row.score(stats[0]), row.score(stats[1])]
    return a !== b && (side === 0 ? a > b : b > a)
  }

  return (
    <div className="fade-in flex h-full items-center gap-12 px-16 py-8">
      {/* Colonne gauche : vainqueur et faits marquants */}
      <div className="flex w-[600px] shrink-0 flex-col gap-6">
        <div className="flex items-end gap-6">
          <div className="h-[400px]">
            <Fighter character={fighters[winner]} side={0} state="victory" />
          </div>
          <div className="mb-10">
            {result.mode === 'simulated' && (
              <p className="mb-2 inline-block rounded-md border border-amber-500/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-200">
                <Icon name="lightning" /> Combat simulé
              </p>
            )}
            <p className="text-sm uppercase tracking-[0.3em] text-stone-400">Vainqueur</p>
            <h1 className={`font-display text-6xl font-extrabold ${SIDE_STYLE[winner].accent}`}>
              {fighters[winner].name}
            </h1>
            <p className="text-sm text-stone-500">
              {fighters[winner].race} · {fighters[winner].archetype}
            </p>
            <p className="mt-2 text-stone-400">
              {result.endedBy === 'ko'
                ? `met ${fighters[loser].name} K.O.`
                : `l'emporte aux PV sur ${fighters[loser].name}`}{' '}
              en {result.turns} tours
              {result.mode === 'played' && <> ({Math.round(result.durationMs / 1000)} s)</>}
              {finisher && (
                <>
                  <br />
                  avec un dernier coup de <b className="text-stone-100">{finisher.dealt}</b>
                  {finisher.crit && <b className="text-amber-300"> critique</b>}.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 text-center">
          <Highlight label="Tours joués" value={result.turns} />
          <Highlight
            label="Plus gros coup"
            value={biggest?.dealt ?? '—'}
            sub={
              biggest && `${fighters[biggest.attacker].name}, tour ${biggest.turn}${biggest.crit ? ' (critique)' : ''}`
            }
          />
          <Highlight label="Critiques" value={totalCrits} accent="text-amber-300" />
          <Highlight label="Esquives" value={totalDodges} accent="text-cyan-200" />
        </div>

        {tournament ? (
          <div className="flex flex-col gap-2">
            <p className="text-center text-sm text-stone-400">{tournament.label}</p>
            <button
              onClick={tournament.onContinue}
              className="rounded-xl bg-amber-500 py-3 font-display text-xl font-extrabold tracking-wider text-stone-950 shadow-[0_4px_0_#92400e] hover:bg-amber-400 active:translate-y-1 active:shadow-none"
            >
              <Icon name="trophy" /> CONTINUER LE TOURNOI
            </button>
          </div>
        ) : (
          <div className="flex gap-4">
            <button
              onClick={onReplay}
              className="flex-1 rounded-xl bg-amber-500 py-3 font-display text-xl font-extrabold tracking-wider text-stone-950 shadow-[0_4px_0_#92400e] hover:bg-amber-400 active:translate-y-1 active:shadow-none"
            >
              REVANCHE
            </button>
            <button
              onClick={onMenu}
              className="flex-1 rounded-xl border border-stone-700 py-3 font-display text-xl font-bold tracking-wider hover:bg-stone-800"
            >
              MENU
            </button>
          </div>
        )}
      </div>

      {/* Colonne droite : statistiques comparées, réparties en onglets */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 self-center">
        <Tabs tabs={TABS} value={tab} onChange={setTab} className="self-start" />
        {/* Hauteur fixe : changer d'onglet ne fait pas sauter la mise en page */}
        <div className="h-[520px]">
          <table key={tab} className="fade-in w-full overflow-hidden rounded-xl border border-stone-800 text-sm">
            <thead className="bg-stone-900">
              <tr>
                <th className="px-4 py-3 text-left font-normal text-stone-500">Statistique</th>
                {SIDES.map((s) => (
                  <th key={s} className={`px-4 py-3 text-right font-display text-lg ${SIDE_STYLE[s].accent}`}>
                    {fighters[s].name}
                    <span className="block font-sans text-xs font-normal text-stone-500">{fighters[s].race}</span>
                  </th>
                ))}
              </tr>
            </thead>
            {sections.map((section) => (
              <tbody key={section.title}>
                <tr className="border-t border-stone-800 bg-stone-900/70">
                  <th
                    colSpan={3}
                    className="px-4 py-1 text-left text-xs font-bold uppercase tracking-widest text-stone-500"
                  >
                    {section.title}
                  </th>
                </tr>
                {section.rows.map((row) => (
                  <tr key={row.label} className="border-t border-stone-800/60">
                    <td className="px-4 py-2 text-stone-300">{row.label}</td>
                    {SIDES.map((s) => (
                      <td
                        key={s}
                        className={`px-4 py-2 text-right font-mono tabular-nums ${isBetter(row, s) ? 'font-bold text-amber-300' : 'text-stone-200'}`}
                      >
                        {row.value(stats[s])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
            {tab === 'dice' && (
              <tbody>
                <tr className="border-t border-stone-800/60">
                  <td className="px-4 py-2 text-stone-300">Jets d'initiative</td>
                  {SIDES.map((s) => (
                    <td key={s} className="px-4 py-1 text-right font-mono tabular-nums text-stone-200">
                      {result.initiative.map((r) => r[s]).join(' → ')}
                    </td>
                  ))}
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

function Highlight({
  label,
  value,
  sub,
  accent = '',
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-4">
      <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
      <p className={`font-display text-3xl font-extrabold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-stone-400">{sub}</p>}
    </div>
  )
}
