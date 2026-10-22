import { useState } from 'react'
import type { Character } from '../game/character'
import type { Relic } from '../game/relics'
import { of } from '../game/narration'
import { attacksOf, other, percent, SIDE_STYLE, SIDES, type CombatResult, type Side } from '../game/combat'
import { computeStats, type FighterStats } from '../game/stats'
import { Fighter } from './Fighter'
import { BackLink, Button, Glyph } from './kit'
import { Tabs, type TabDef } from './Tabs'
import { CopyTraceButton } from './CopyTraceButton'
import { BetsResult, type BetsOutcome } from './Betting'
import { RelicCard, RelicRow } from './RelicSeal'

/** Récompense d'un match de tournoi : l'offre, le choix du vainqueur, et de quoi le changer. */
export interface RelicReward {
  offer: readonly Relic[]
  chosen: string
  onChoose: (relic: string) => void
}

interface Props {
  result: CombatResult
  onReplay: () => void
  onMenu: () => void
  /**
   * En tournoi : remplace Revanche / Menu par un retour à l'arbre. `reward` : la relique du vainqueur (hors
   * finale), à choisir parmi l'offre ; `chosen` est le choix du vainqueur, que l'observateur peut changer.
   */
  tournament?: {
    label: string
    onContinue: () => void
    reward?: RelicReward
  }
  /** Onglet affiché à l'ouverture */
  initialTab?: EndTab
  /** Règlement des paris du match et classement des parieurs (docs/PARIS.md) : moitié droite de l'écran */
  bets?: BetsOutcome
}

interface Row {
  label: string
  value: (s: FighterStats) => string | number
  /** Valeur comparée pour mettre en avant le meilleur ; absente = pas de comparaison */
  score?: (s: FighterStats) => number
}

export type EndTab = 'summary' | 'defense' | 'events' | 'dice'

const TABS: TabDef<EndTab>[] = [
  { id: 'summary', label: 'Bilan' },
  { id: 'defense', label: 'Critiques et défense' },
  { id: 'events', label: 'Compétences' },
  { id: 'dice', label: 'Dés' },
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
    title: 'Compétences et statuts',
    tab: 'events',
    rows: [
      { label: 'Compétences déclenchées', value: (s) => s.events, score: (s) => s.events },
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

export function EndScreen({ result, onReplay, onMenu, tournament, initialTab = 'summary', bets }: Props) {
  const stats = computeStats(result)
  const { fighters, winner } = result
  const attacks = attacksOf(result)
  const loser = other(winner)
  // Dernier coup porté par le vainqueur (le K.O. peut venir d'un effet, ex. poison)
  const finisher = [...attacks].reverse().find((a) => a.attacker === winner && !a.dodged && !a.forfeited)
  const biggest = attacks.reduce<(typeof attacks)[number] | undefined>(
    (best, a) => (!best || a.dealt > best.dealt ? a : best),
    undefined,
  )
  const [details, setDetails] = useState(false)
  const [rewardOpen, setRewardOpen] = useState(false)
  const reward = tournament?.reward
  const w = stats[winner]
  const l = stats[loser]
  const totalDamage = w.totalDamage + l.totalDamage || 1

  return (
    <div className="fade-in relative grid h-full grid-cols-2">
      {/* Moitié gauche : le combat */}
      <section className="relative flex flex-col overflow-hidden px-14 pb-10 pt-10">
        <div
          className={`pointer-events-none absolute -left-40 top-10 h-[700px] w-[700px] rounded-full opacity-30 blur-3xl ${winner === 0 ? 'bg-side-a' : 'bg-side-b'}`}
        />
        {/* Au-dessus du vainqueur : une arme levée en victoire (la massue de Morgrut) monte jusqu'au titre */}
        <div className="relative z-20 flex items-center gap-4">
          <h2 className="font-display text-4xl font-extrabold tracking-[0.25em] text-amber-200">COMBAT</h2>
          <div className="codex-divider flex-1" />
          {result.mode === 'simulated' && (
            <p className="flex items-center gap-1.5 rounded-md border border-amber-500/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-200">
              <Glyph name="simuler" size={14} /> Simulé
            </p>
          )}
        </div>

        <div className="relative flex flex-1 items-end gap-2">
          <div className="h-[430px] w-[300px] shrink-0">
            <Fighter character={fighters[winner]} side={0} state="victory" anchor="inside" />
          </div>
          <div className="relative z-20 mb-8 min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.4em] text-amber-300">Vainqueur</p>
            {/* Un nom de tournoi long (épithète, 0.87.0) passe en plus petit plutôt que sur trois lignes */}
            <h1 className={`font-display ${fighters[winner].name.length > 11 ? 'text-5xl' : 'text-7xl'} font-extrabold leading-none ${SIDE_STYLE[winner].accent}`}>
              {fighters[winner].name}
            </h1>
            <p className="mt-1 text-base text-stone-500">
              {fighters[winner].race} · {fighters[winner].archetype}
            </p>
            <p className="mt-4 text-xl text-stone-300">
              met <b className={SIDE_STYLE[loser].accent}>{fighters[loser].name}</b> K.O. en <b className="text-stone-100">{result.turns} tours</b>
            </p>
            {finisher && (
              <p className="text-lg text-stone-400">
                d'un dernier coup de <b className="text-stone-100">{finisher.dealt}</b>
                {finisher.crit && <b className="text-amber-300"> critique</b>}
              </p>
            )}
          </div>
        </div>

        {/* Faits marquants : grandes tuiles lisibles de loin */}
        <div className="relative grid grid-cols-4 gap-3">
          <Highlight label="PV restants" value={`${w.hpLeft}`} sub={`sur ${fighters[winner].maxHp}`} accent="text-emerald-300" />
          <Highlight label="Plus gros coup" value={biggest?.dealt ?? '—'} sub={biggest ? `${fighters[biggest.attacker].name}${biggest.crit ? ', critique' : ''}` : undefined} />
          <Highlight label="Critiques" value={stats[0].crits + stats[1].crits} accent="text-amber-300" />
          <Highlight label="Esquives" value={stats[0].dodges + stats[1].dodges} accent="text-cyan-200" />
        </div>
        {/* Part des dégâts de chacun */}
        <div className="relative mt-4">
          <div className="mb-1 flex justify-between text-xs uppercase tracking-wider text-stone-500">
            <span>
              Dégâts · <b className={SIDE_STYLE[0].accent}>{stats[0].totalDamage}</b>
            </span>
            <span>
              <b className={SIDE_STYLE[1].accent}>{stats[1].totalDamage}</b>
            </span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full border border-black bg-stone-900">
            <div className="bg-side-a" style={{ width: `${(stats[0].totalDamage / totalDamage) * 100}%` }} />
            <div className="flex-1 bg-side-b" />
          </div>
        </div>

        <div className="relative mt-6 flex items-center gap-4">
          {tournament ? (
            // Une récompense à choisir : le bouton principal ouvre l'écran des reliques, qui mène à l'arbre
            <Button
              variant="primary"
              size="xl"
              icon="tournoi"
              onClick={reward ? () => setRewardOpen(true) : tournament.onContinue}
              title={tournament.label}
              className="flex-1"
            >
              {reward ? 'Récompense' : 'Continuer'}
            </Button>
          ) : (
            <>
              <Button variant="primary" size="xl" icon="combattre" onClick={onReplay} className="flex-1">
                Revanche
              </Button>
              <BackLink onClick={onMenu}>Menu</BackLink>
            </>
          )}
          {bets && (
            <Button variant="secondary" size="md" icon="statistiques" onClick={() => setDetails(true)}>
              Détails
            </Button>
          )}
        </div>
        {tournament && <p className="relative mt-2 text-center text-sm text-stone-400">{tournament.label}</p>}
      </section>

      {/* Moitié droite : les paris et le classement, ou les statistiques si personne ne parie */}
      <section className="relative flex flex-col border-l border-amber-900/30 bg-gradient-to-b from-stone-950/40 to-black/60 px-12 py-10">
        {bets ? (
          <BetsResult outcome={bets} fighterNames={[fighters[0].name, fighters[1].name]} />
        ) : (
          <StatsTable result={result} stats={stats} initialTab={initialTab} />
        )}
      </section>

      {details && (
        <div className="desk-in absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/90 px-24">
          <div className="w-full max-w-5xl">
            <StatsTable result={result} stats={stats} initialTab={initialTab} />
          </div>
          <Button variant="secondary" size="md" icon="fermer" onClick={() => setDetails(false)}>
            Fermer
          </Button>
        </div>
      )}

      {tournament && reward && rewardOpen && (
        <RewardMenu
          winner={fighters[winner]}
          reward={reward}
          onBack={() => setRewardOpen(false)}
          onContinue={(relic) => {
            if (relic !== reward.chosen) reward.onChoose(relic)
            tournament.onContinue()
          }}
        />
      )}
    </div>
  )
}

/**
 * Récompense de tournoi (docs/RELIQUES.md § Écran de récompense), menu superposé à l'écran de victoire : trois
 * grandes cartes. Le vainqueur a déjà choisi (au hasard, sa carte porte « Choix de… ») ; un clic sur une autre
 * carte décide à sa place. Ses reliques déjà portées sont rappelées en dessous.
 */
function RewardMenu({
  winner,
  reward,
  onBack,
  onContinue,
}: {
  winner: Character
  reward: RelicReward
  onBack: () => void
  onContinue: (relic: string) => void
}) {
  const [picked, setPicked] = useState(reward.chosen)
  const own = picked === reward.chosen
  return (
    <div className="desk-in absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-black/95 px-20">
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.5em] text-gold-300">Récompense</p>
        <h2 className="font-display text-5xl font-extrabold text-amber-100">{winner.name} gagne une relique</h2>
        <p className="font-body text-xl text-ink-2">
          {reward.offer.length > 1
            ? `${winner.name} a fait son choix parmi ${reward.offer.length} : cliquez sur une autre carte pour décider à sa place.`
            : `Une seule relique manque encore à ${winner.name} : elle lui revient.`}
        </p>
      </header>
      <div className="flex items-stretch gap-8 pt-3">
        {reward.offer.map((r) => (
          <RelicCard
            key={r.id}
            relic={r}
            selected={picked === r.id}
            mark={r.id === reward.chosen ? `Choix ${of(winner.name)}` : picked === r.id ? 'Votre choix' : undefined}
            onSelect={() => setPicked(r.id)}
          />
        ))}
      </div>
      {winner.relics.length > 0 && (
        <div className="flex items-center gap-3 font-body text-[15px] text-ink-3">
          Déjà portées :
          <RelicRow relics={winner.relics} size={32} tooltip="above" />
        </div>
      )}
      <div className="flex items-center gap-4">
        <BackLink onClick={onBack}>Combat</BackLink>
        <Button variant="primary" size="xl" icon="tournoi" onClick={() => onContinue(picked)} className="w-96">
          {own ? 'Continuer' : 'Imposer ce choix'}
        </Button>
      </div>
    </div>
  )
}

/** Statistiques comparées des deux combattants, réparties en onglets. */
function StatsTable({ result, stats, initialTab }: { result: CombatResult; stats: FighterStats[]; initialTab: EndTab }) {
  const { fighters } = result
  const [tab, setTab] = useState<EndTab>(initialTab)
  const sections = SECTIONS.filter((section) => section.tab === tab)
  const isBetter = (row: Row, side: Side) => {
    if (!row.score) return false
    const [a, b] = [row.score(stats[0]), row.score(stats[1])]
    return a !== b && (side === 0 ? a > b : b > a)
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <CopyTraceButton result={result} />
      </div>
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
                <th colSpan={3} className="px-4 py-1 text-left text-xs font-bold uppercase tracking-widest text-stone-500">
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
  )
}

function Highlight({ label, value, sub, accent = '' }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="codex-card items-center px-3 py-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{label}</p>
      <p className={`font-display text-4xl font-extrabold leading-tight ${accent}`}>{value}</p>
      <p className="h-4 truncate text-xs text-stone-400">{sub}</p>
    </div>
  )
}
