import { useState, type ReactNode } from 'react'
import type { Character } from '../game/character'
import { stepKey, type ForgeOffer, type ForgeStep } from '../game/forge'
import type { Relic } from '../game/relics'
import { of } from '../game/narration'
import { attacksOf, other, percent, SIDE_STYLE, SIDES, type CombatResult, type Side } from '../game/combat'
import { computeStats, type FighterStats } from '../game/stats'
import { Fighter } from './Fighter'
import { ForgeChoice, useForgeChoice } from './ForgedDie'
import { BackLink, Button, Glyph, type GlyphName } from './kit'
import { Tabs, type TabDef } from './Tabs'
import { CopyTraceButton } from './CopyTraceButton'
import { BetsResult, type BetsOutcome } from './Betting'
import { RelicCard, RelicRow } from './RelicSeal'
import { CombatReportPanel } from './CombatReport'

/**
 * Récompense d'un combattant à la fin d'un match (arbre du tournoi, construction de la saison) : une relique ou une
 * forge du dé, l'offre, son choix, et de quoi le changer.
 */
export type MatchReward =
  | { kind: 'relic'; offer: readonly Relic[]; chosen: string; onChoose: (relic: string) => void }
  | { kind: 'forge'; offer: readonly ForgeOffer[]; chosen: ForgeStep; onChoose: (step: ForgeStep) => void }

/** La récompense d'un côté du combat. */
export interface SideReward {
  side: Side
  reward: MatchReward
}

interface Props {
  result: CombatResult
  onReplay: () => void
  onMenu: () => void
  /**
   * En tournoi, en saison ou en campagne : remplace Revanche / Menu par la suite (l'arbre, la saison, la carte de
   * l'acte). `rewards` : les récompenses du match, dans l'ordre où on les montre (le vainqueur de l'arbre hors finale ;
   * en saison, chaque côté qui se construit encore), chacune à choisir parmi son offre ; `chosen` est le choix du
   * combattant, que l'observateur peut changer. `icon` : le glyphe du bouton (le tournoi par défaut) ; `action` : son
   * texte, quand la suite est une récompense ailleurs (campagne : « Relique », « Forge du dé »).
   */
  tournament?: {
    label: string
    onContinue: () => void
    rewards?: readonly SideReward[]
    icon?: GlyphName
    action?: string
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

export type EndTab = 'report' | 'summary' | 'defense' | 'events' | 'dice'

const TABS: TabDef<EndTab>[] = [
  { id: 'report', label: 'Rapport' },
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

export function EndScreen({ result, onReplay, onMenu, tournament, initialTab = 'report', bets }: Props) {
  const stats = computeStats(result)
  const { fighters, winner } = result
  const attacks = attacksOf(result)
  const loser = other(winner)
  // Dernier coup porté par le vainqueur (le K.O. peut venir d'un effet, ex. poison)
  const finisher = [...attacks].reverse().find((a) => a.attacker === winner && !a.dodged && !a.replaced)
  const biggest = attacks.reduce<(typeof attacks)[number] | undefined>(
    (best, a) => (!best || a.dealt > best.dealt ? a : best),
    undefined,
  )
  const [details, setDetails] = useState(false)
  // La récompense montrée (index dans `rewards`), null : l'écran de fin
  const [rewardStep, setRewardStep] = useState<number | null>(null)
  const rewards = tournament?.rewards ?? []
  const shown = rewardStep === null ? undefined : rewards[rewardStep]
  const nextReward = () => (rewardStep !== null && rewardStep + 1 < rewards.length ? setRewardStep(rewardStep + 1) : tournament?.onContinue())
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
              icon={tournament.icon ?? 'tournoi'}
              onClick={rewards.length ? () => setRewardStep(0) : tournament.onContinue}
              title={tournament.label}
              className="flex-1"
            >
              {rewards.length > 1 ? 'Récompenses' : rewards.length ? 'Récompense' : (tournament.action ?? 'Continuer')}
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
            <Button variant="secondary" size="md" icon="statistiques" onClick={() => setDetails(true)} title="Rapport de combat (reliques, faces jouées) et statistiques détaillées">
              Rapport
            </Button>
          )}
        </div>
        {tournament && <p className="relative mt-2 text-center text-sm text-stone-400">{tournament.label}</p>}
      </section>

      {/* Moitié droite : les paris et le classement, ou le rapport de combat et les statistiques si personne ne parie */}
      {/* À droite, la place du bouton rond du son (48 px en haut à droite de la scène) : le filet du titre s'arrête avant */}
      <section className="relative flex flex-col border-l border-amber-900/30 bg-gradient-to-b from-stone-950/40 to-black/60 py-10 pl-12 pr-20">
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

      {tournament && shown && (
        shown.reward.kind === 'relic' ? (
          <RelicMenu key={rewardStep} fighter={fighters[shown.side]} reward={shown.reward} onBack={() => setRewardStep(null)} onContinue={nextReward} />
        ) : (
          <ForgeMenu key={rewardStep} fighter={fighters[shown.side]} reward={shown.reward} onBack={() => setRewardStep(null)} onContinue={nextReward} />
        )
      )}
    </div>
  )
}

/**
 * Récompense d'un combattant (docs/RELIQUES.md § 5), menu superposé à l'écran de fin : trois grandes cartes. Le
 * combattant a déjà choisi (au hasard, sa carte porte « Choix de… ») ; un clic sur une autre carte décide à sa place.
 * `own` : le choix affiché est encore le sien ; `ready` : il est complet (une forge attend sa face).
 */
function RewardFrame({
  title,
  sub,
  own,
  ready = true,
  onBack,
  onContinue,
  children,
}: {
  title: string
  sub: string
  own: boolean
  ready?: boolean
  onBack: () => void
  onContinue: () => void
  children: ReactNode
}) {
  return (
    <div className="desk-in absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-black/95 px-20">
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.5em] text-gold-300">Récompense</p>
        <h2 className="font-display text-5xl font-extrabold text-amber-100">{title}</h2>
        <p className="font-body text-xl text-ink-2">{sub}</p>
      </header>
      {children}
      {/* Le bouton primaire centré, comme en campagne ; le retour au combat se tient à sa gauche */}
      <div className="relative flex justify-center">
        <BackLink onClick={onBack} className="absolute right-full top-1/2 mr-8 -translate-y-1/2 whitespace-nowrap">
          Combat
        </BackLink>
        <Button variant="primary" size="xl" icon="tournoi" disabled={!ready} onClick={onContinue} className="w-96">
          {own ? 'Continuer' : 'Imposer ce choix'}
        </Button>
      </div>
    </div>
  )
}

/** Une relique parmi l'offre ; ses reliques déjà portées sont rappelées en dessous. */
function RelicMenu({
  fighter,
  reward,
  onBack,
  onContinue,
}: {
  fighter: Character
  reward: Extract<MatchReward, { kind: 'relic' }>
  onBack: () => void
  onContinue: () => void
}) {
  const [picked, setPicked] = useState(reward.chosen)
  const own = picked === reward.chosen
  return (
    <RewardFrame
      title={`${fighter.name} reçoit une relique`}
      sub={
        reward.offer.length > 1
          ? `${fighter.name} a fait son choix parmi ${reward.offer.length} : cliquez sur une autre carte pour décider à sa place.`
          : `Une seule relique est à la portée de ${fighter.name} : elle lui revient.`
      }
      own={own}
      onBack={onBack}
      onContinue={() => {
        if (!own) reward.onChoose(picked)
        onContinue()
      }}
    >
      <div className="flex items-stretch gap-8 pt-3">
        {reward.offer.map((r) => (
          <RelicCard
            key={r.id}
            relic={r}
            selected={picked === r.id}
            mark={r.id === reward.chosen ? `Choix ${of(fighter.name)}` : picked === r.id ? 'Votre choix' : undefined}
            onSelect={() => setPicked(r.id)}
          />
        ))}
      </div>
      {fighter.relics.length > 0 && (
        <div className="flex items-center gap-3 font-body text-[15px] text-ink-3">
          Déjà portées :
          <RelicRow relics={fighter.relics} size={40} tooltip="above" />
        </div>
      )}
    </RewardFrame>
  )
}

/** Une opération de forge parmi l'offre, puis la face qu'elle vise sur le dé du combattant (tel qu'il a combattu). */
function ForgeMenu({
  fighter,
  reward,
  onBack,
  onContinue,
}: {
  fighter: Character
  reward: Extract<MatchReward, { kind: 'forge' }>
  onBack: () => void
  onContinue: () => void
}) {
  const choice = useForgeChoice(fighter, reward.offer, reward.chosen)
  const own = !!choice.step && stepKey(choice.step) === stepKey(reward.chosen)
  return (
    <RewardFrame
      title={`${fighter.name} forge son dé`}
      sub={`${fighter.name} a fait son choix : cliquez sur une autre opération, puis sur une face, pour décider à sa place.`}
      own={own}
      ready={!!choice.step}
      onBack={onBack}
      onContinue={() => {
        if (!own && choice.step) reward.onChoose(choice.step)
        onContinue()
      }}
    >
      <ForgeChoice character={fighter} choice={choice} />
    </RewardFrame>
  )
}

/**
 * Statistiques des deux combattants, réparties en onglets : d'abord le rapport de combat (reliques déclenchées, faces
 * jouées, CombatReport.tsx), puis les statistiques comparées.
 */
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
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {/* Hauteur fixe : changer d'onglet ne fait pas sauter la mise en page */}
      <div className="h-[520px]">
        {tab === 'report' ? (
          <div key={tab} className="fade-in">
            <CombatReportPanel result={result} />
          </div>
        ) : (
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
        )}
      </div>
      <div className="flex justify-end">
        <CopyTraceButton result={result} />
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
