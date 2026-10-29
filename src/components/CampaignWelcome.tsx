import { useState } from 'react'
import campaignImg from '../assets/menu-campaign.jpg'
import { ACT_FIGHTS, ACT_LENGTH, championOf } from '../game/campaign'
import { DIE_FACES } from '../game/events'
import { leaderboard, type LeaderboardEntry, type LeaderboardPeriod } from '../game/leaderboard'
import { sfx } from '../game/sound'
import { ForgedDie } from './ForgedDie'
import { BackLink, Button, Glyph, SegmentedControl, SquareButton } from './kit'
import { MiniPortrait } from './RecordBits'
import { RelicRow } from './RelicSeal'
import { StatSheet } from './StatSheet'

/*
 * L'accueil de la campagne (0.131.0, docs/ref/06 à 08 ; avant le choix du champion depuis la 0.131.2, comme la
 * présentation du tournoi avant sa configuration). Il explique le parcours (onze combats, le boss, puis le mode sans fin
 * au choix) et montre le classement du mode sans fin ; une ligne du classement ouvre la fiche de son champion à la place
 * des explications. Le classement est statique tant que le mode sans fin et le backend n'existent pas (leaderboard.ts).
 * Mesures de la maquette (1440) × 10/9.
 */

interface Props {
  onBack: () => void
  /** Vers le choix du champion */
  onNext: () => void
}

const PERIODS: readonly { value: LeaderboardPeriod; label: string }[] = [
  { value: 'week', label: 'Semaine' },
  { value: 'season', label: 'Saison' },
  { value: 'allTime', label: 'Depuis toujours' },
]

const STEPS = [
  {
    title: 'Menez une campagne',
    text: `Un champion, ${ACT_LENGTH} combats jusqu'au boss. Il gagne en force à chaque victoire. Une défaite met fin à la partie.`,
  },
  {
    title: 'Le boss tombe : à vous de choisir',
    text: "Arrêter là avec la victoire, ou continuer sans fin avec le même champion, tel que vous l'avez construit.",
  },
  {
    title: 'Tenez le plus longtemps',
    text: 'Les adversaires sont bâtis comme le boss, de plus en plus forts, et identiques pour tous les joueurs : le classement compare des séries à armes égales. La première défaite arrête la série.',
  },
]

/** Une ligne consultée : son entrée et son rang (la fiche montre les deux) */
interface Viewed {
  entry: LeaderboardEntry
  rank: number
}

export function CampaignWelcome({ onBack, onNext }: Props) {
  const [period, setPeriod] = useState<LeaderboardPeriod>('season')
  const [viewed, setViewed] = useState<Viewed | null>(null)
  const board = leaderboard(period)
  const toggle = (next: Viewed) => {
    sfx.click()
    setViewed(viewed?.entry === next.entry ? null : next)
  }
  return (
    <div className="fade-in relative h-full overflow-hidden bg-surface-0">
      <img src={campaignImg} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-[0.12]" />
      <BackLink onClick={onBack} className="absolute left-10 top-[36px] z-30">
        Menu
      </BackLink>
      <header className="absolute inset-x-0 top-[26px] flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.5em] text-gold-300">Mode sans fin</p>
        <h1 className="font-display text-[40px] font-extrabold leading-tight text-amber-100">Jusqu'où ira votre champion ?</h1>
      </header>

      <div className="absolute left-[53px] top-[147px] w-[522px]">
        {viewed ? (
          <EntrySheet
            viewed={viewed}
            onClose={() => {
              sfx.click()
              setViewed(null)
            }}
          />
        ) : (
          <>
            <Course />
            <ol className="mt-10 flex flex-col gap-8 pr-2">
              {STEPS.map((s, k) => (
                <li key={s.title} className="flex gap-5">
                  <span className="welcome-oct shrink-0" data-tone="gold" data-size="md">
                    {k + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h2 className="welcome-step-title">{s.title}</h2>
                    <p className="font-body text-[16px] leading-[1.45] text-ink-2">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      <section className="welcome-board absolute left-[623px] top-[147px] flex h-[621px] w-[924px] flex-col" aria-label="Classement">
        <div className="flex h-[59px] shrink-0 items-center justify-between border-b border-line-1 pl-5 pr-4">
          <h2 className="flex items-center gap-3 font-display text-[19px] font-bold uppercase tracking-[0.14em] text-gold-300">
            <Glyph name="tournoi" size={18} />
            Classement
          </h2>
          <SegmentedControl
            label="Période"
            options={PERIODS}
            value={period}
            onChange={(p) => {
              sfx.click()
              setPeriod(p)
              setViewed(null)
            }}
          />
        </div>
        <div className="welcome-row welcome-head h-[33px] shrink-0" aria-hidden>
          <span className="text-center">Rang</span>
          <span />
          <span>Joueur</span>
          <span className="text-right text-gold-300">Série</span>
          <span className="text-right">Points</span>
          <span className="pl-4">Dé</span>
          <span className="text-right">Reliques</span>
        </div>
        <ol className="flex min-h-0 flex-1 flex-col">
          {board.top.map((entry, k) => (
            <li key={entry.player}>
              <EntryRow entry={entry} rank={k + 1} selected={viewed?.entry === entry} onSelect={() => toggle({ entry, rank: k + 1 })} />
            </li>
          ))}
        </ol>
        {/* Le joueur, épinglé en bas à sa couleur, avec son rang même hors des dix premiers */}
        {board.you ? (
          <EntryRow entry={board.you.entry} rank={board.you.rank} you selected={viewed?.entry === board.you.entry} onSelect={() => board.you && toggle(board.you)} />
        ) : (
          <div className="welcome-row welcome-you h-[52px] shrink-0">
            <span className="text-center font-data text-[15px] text-side-a-hi">–</span>
            <span aria-hidden className="h-10 w-10 rounded-(--r-xs) border border-line-2 bg-surface-2" />
            <span className="flex min-w-0 flex-col leading-tight">
              <b className="font-body text-[16px] text-ink-1">Vous</b>
              <span className="font-body text-[13px] text-ink-3">Pas encore classé</span>
            </span>
            <span className="col-span-4 text-right font-body text-[15px] text-ink-2">Battez le boss d'une campagne pour entrer au classement.</span>
          </div>
        )}
      </section>

      <div className="absolute inset-x-0 top-[833px] flex -translate-y-1/2 justify-center">
        <Button variant="primary" size="xl" icon="combattre" onClick={onNext} className="w-[560px]">
          Choisir un champion
        </Button>
      </div>
    </div>
  )
}

/**
 * Le parcours : un losange par combat, le sceau du boss, puis le sceau du mode sans fin ; la ligne est grise jusqu'au
 * boss, or ensuite (« au choix » sur ce segment).
 */
function Course() {
  return (
    <section className="welcome-panel px-5 pb-4 pt-4" aria-label="Le parcours">
      <h2 className="welcome-label">Le parcours</h2>
      <div className="mt-3 flex items-start">
        <div className="flex flex-1 flex-col items-center gap-2">
          <ol className="flex h-[50px] w-full items-center" aria-label={`${ACT_FIGHTS} combats`}>
            {Array.from({ length: ACT_FIGHTS }, (_, k) => (
              <li key={k} className="flex flex-1 items-center first:flex-none">
                {k > 0 && <span className="h-px flex-1 bg-ink-3/60" />}
                <span className="welcome-diamond" />
              </li>
            ))}
          </ol>
          <span className="welcome-course-label">{ACT_FIGHTS} combats</span>
        </div>
        <span className="mt-[25px] h-px w-6 bg-ink-3/60" />
        <div className="flex flex-col items-center gap-2">
          <span className="welcome-oct" data-tone="bronze" data-size="lg">
            <Glyph name="crane" size={20} />
          </span>
          <span className="welcome-course-label">boss</span>
        </div>
        <div className="relative mt-[25px] flex w-[86px] justify-center">
          <span className="h-px w-full bg-gold-500" />
          <span className="welcome-course-label absolute -top-[22px]">au choix</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="welcome-oct" data-tone="gold" data-size="lg">
            <Glyph name="infini" size={24} />
          </span>
          <span className="welcome-course-label text-gold-300">sans fin</span>
        </div>
      </div>
    </section>
  )
}

/** Une ligne du classement : un bouton qui ouvre (ou referme) la fiche de son champion. */
function EntryRow({ entry, rank, you = false, selected, onSelect }: { entry: LeaderboardEntry; rank: number; you?: boolean; selected: boolean; onSelect: () => void }) {
  const character = championOf(entry.build)
  const podium = !you && rank <= 3 ? (['gold', 'silver', 'bronze'] as const)[rank - 1] : undefined
  return (
    <button
      type="button"
      className={`welcome-row welcome-entry ${you ? 'welcome-you h-[52px]' : 'h-[48px]'}`}
      data-rank={rank}
      data-podium={podium}
      aria-pressed={selected}
      aria-label={`${rank}e : ${entry.player}, ${character.name}, série de ${entry.series}`}
      onClick={onSelect}
    >
      <span className="flex justify-center">
        {podium ? (
          <span className="welcome-oct" data-tone={podium} data-size="sm">
            {rank}
          </span>
        ) : (
          <span className={`font-data text-[15px] ${you ? 'text-side-a-hi' : 'text-ink-3'}`}>{rank}</span>
        )}
      </span>
      <MiniPortrait character={character} size="h-10 w-10" />
      <span className="flex min-w-0 flex-col text-left leading-tight">
        <b className="truncate font-body text-[16px] text-ink-1">{entry.player}</b>
        <span className="truncate font-body text-[13px] text-ink-3">
          {character.name} · {character.race} · {character.archetype}
        </span>
      </span>
      <span className={`text-right font-data text-[19px] font-medium tabular-nums ${you ? 'text-side-a-hi' : 'text-gold-300'}`}>{entry.series}</span>
      <span className="text-right font-data text-[15px] tabular-nums text-ink-2">{entry.points.toLocaleString('fr-FR')}</span>
      <span className="pl-4">
        <ForgedDie character={character} size="xs" />
      </span>
      <span className="text-right font-data text-[15px] tabular-nums text-ink-2">{character.relics.length}</span>
    </button>
  )
}

/** La fiche d'un champion du classement, en couleurs neutres (ce n'est pas un camp) : chiffres, stats, dé, reliques. */
function EntrySheet({ viewed, onClose }: { viewed: Viewed; onClose: () => void }) {
  const { entry, rank } = viewed
  const character = championOf(entry.build)
  const figures = [
    { label: 'Série', value: entry.series, gold: true },
    { label: 'Points', value: entry.points.toLocaleString('fr-FR') },
    { label: 'Rang', value: rank },
  ]
  return (
    <section className="welcome-panel welcome-sheet flex flex-col gap-4 px-5 py-5" aria-label={`Champion de ${entry.player}`}>
      <header className="flex items-center gap-4">
        <MiniPortrait character={character} size="h-[62px] w-[62px]" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="font-display text-[26px] font-bold leading-tight text-ink-1">{character.name}</h2>
          <p className="truncate font-body text-[14px] text-ink-3">
            {character.race} · {character.archetype} · champion de <b className="text-ink-1">{entry.player}</b>
          </p>
        </div>
        <SquareButton icon="fermer" label="Fermer la fiche" onClick={onClose} />
      </header>
      <dl className="grid grid-cols-3 gap-2">
        {figures.map((f) => (
          <div key={f.label} className="flex flex-col gap-1 rounded-(--r-xs) bg-surface-2 px-3 py-2">
            <dt className="welcome-label">{f.label}</dt>
            <dd className={`font-data text-[19px] tabular-nums ${f.gold ? 'text-gold-300' : 'text-ink-1'}`}>{f.value}</dd>
          </div>
        ))}
      </dl>
      <StatSheet character={character} barClass="bg-ink-2" trackClass="bg-surface-3" className="gap-1" />
      <div className="h-px bg-line-1" />
      <div className="flex flex-col gap-2">
        <p className="flex justify-between">
          <span className="welcome-label">Dé de combat</span>
          <span className="font-data text-[14px] text-ink-2">d{DIE_FACES}</span>
        </p>
        <ForgedDie character={character} size="md" tooltip="above" />
      </div>
      <div className="h-px bg-line-1" />
      <div className="flex flex-col gap-2">
        <p className="flex justify-between">
          <span className="welcome-label">Reliques</span>
          <span className="font-data text-[14px] text-ink-2">{character.relics.length}</span>
        </p>
        <RelicRow relics={character.relics} size={40} tooltip="above" />
      </div>
    </section>
  )
}
