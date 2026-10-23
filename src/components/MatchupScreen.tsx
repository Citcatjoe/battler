import { useEffect, useRef, useState } from 'react'
import { ARENAS, getArena, RANDOM_ARENA, type ArenaChoice } from '../game/arenas'
import type { Character } from '../game/character'
import { SIDE_STYLE, type Pair, type Side } from '../game/combat'
import { sfx } from '../game/sound'
import { Fighter } from './Fighter'
import { RelicRow } from './RelicSeal'
import { DieBuild } from './DieBuild'
import { StatSheet } from './StatSheet'
import { Button, Glyph, type GlyphName } from './kit'
import { humansOf, type Bettor, type MatchOdds, type Pick, type Wallets } from '../game/betting'
import { BetSummary, BettingDesk } from './Betting'
import { VsSeal } from './VsSeal'

/**
 * Classement d'un opposant, affiché au-dessus de son nom. Lu dans le jeu (App.tsx), jamais recalculé ici :
 * place au classement de saison en cours, ou rang de saison qui fait sa tête de série dans l'arbre.
 */
export type MatchupRank =
  | { kind: 'season'; rank: number; of: number; points: number; wins: number; losses: number }
  | { kind: 'seed'; rank: number }

interface Props {
  fighters: Pair<Character>
  onPlay: () => void
  onSimulate: () => void
  onBack: () => void
  /** Bandeau au-dessus du duel, ex. « Quarts de finale · Match 2 » */
  title?: string
  /** Classement de chaque opposant (saison, arbre après saison) ; absent en duel libre */
  ranks?: Pair<MatchupRank | null>
  /** Bouton de retour (secondaire) : « Changer » en duel, « Arbre » en tournoi */
  back?: { label: string; icon: GlyphName }
  /** Cadre du combat : une arène précise ou « au hasard » */
  arena: ArenaChoice
  onArenaChange: (arena: ArenaChoice) => void
  /** Paris entre deux observateurs (docs/PARIS.md) ; absent : pas de guichet */
  betting?: {
    wallets: Wallets
    /** Cotes du match ; null tant qu'elles sont en calcul */
    odds: MatchOdds | null
    /** Renvoie la raison d'un refus, ou null si le pari est posé */
    onBet: (bettor: Bettor, pick: Pick, choice: number) => string | null
    onCancel: (bettor: Bettor) => void
    /** Duel simple : remettre les bourses à zéro */
    onReset?: () => void
  }
}

/** Écran d'affrontement : présente le duel et laisse choisir entre le jouer ou le simuler. */
export function MatchupScreen({
  fighters,
  onPlay,
  onSimulate,
  onBack,
  title = 'Affrontement',
  back = { label: 'Changer', icon: 'changer' },
  arena,
  onArenaChange,
  betting,
  ranks,
}: Props) {
  const [desk, setDesk] = useState(false)
  const names: Pair<string> = [fighters[0].name, fighters[1].name]
  // Fracas quand le « VS » s'abat ; le délai est annulé si l'écran est démonté entre-temps.
  useEffect(() => {
    const id = setTimeout(() => sfx.clash(), 550)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_110%,#57534e_0%,#1c1917_45%,#0c0a09_80%)]">
      {/* Aperçu de l'arène choisie, très assombri */}
      {arena !== RANDOM_ARENA && (
        <>
          <img
            key={arena}
            src={getArena(arena).image}
            alt=""
            draggable={false}
            className="fade-in pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
            style={{ objectPosition: getArena(arena).focus, filter: 'brightness(0.4) saturate(0.75)' }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(87,83,78,0.25)_0%,rgba(12,10,9,0.55)_55%,rgba(12,10,9,0.9)_100%)]" />
        </>
      )}
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-side-a/10 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-side-b/10 to-transparent" />

      {/* Respiration entre le titre et le choix de l'arène */}
      <header className="relative flex flex-col items-center gap-6 pt-8">
        <p className="text-sm font-bold uppercase tracking-[0.5em] text-stone-500">{title}</p>
        <ArenaSlider value={arena} onChange={onArenaChange} />
      </header>

      <div className="relative grid flex-1 grid-cols-[1fr_auto_1fr] items-end px-10">
        {([0, 1] as Side[]).map((side) => (
          <FighterCard key={side} character={fighters[side]} side={side} rank={ranks?.[side] ?? null} />
        ))}
        {/* Le sceau et le rappel des paris s'empilent dans la colonne centrale, sans se chevaucher, avec une marge de
            chaque côté : le build du druide (deux formes, leur nom à côté) va jusqu'au bord de sa colonne.
            L'animation d'entrée est sur l'enveloppe du sceau : il garde sa forme. */}
        <div
          className={`col-start-2 row-start-1 flex flex-col items-center gap-6 self-end justify-self-center px-5 ${betting ? 'mb-[150px]' : 'mb-[300px]'}`}
        >
          <span className="vs-slam flex justify-center">
            <VsSeal />
          </span>
          {betting && <BetSummary wallets={betting.wallets} odds={betting.odds} fighterNames={names} />}
        </div>
      </div>

      <div className="relative flex items-center justify-center gap-6 pb-10 pt-4">
        <Button variant="secondary" size="md" icon={back.icon} onClick={onBack} className="w-56">
          {back.label}
        </Button>
        <Button variant="primary" size="xl" icon="combattre" onClick={onPlay} className="w-80">
          Jouer
        </Button>
        {betting && (
          <Button
            variant="secondary"
            size="md"
            icon="parier"
            onClick={() => {
              sfx.click()
              setDesk(true)
            }}
            title="Ouvre le guichet du match : chaque joueur peut parier avant le combat"
            className="w-56"
          >
            Parier
            {betting.odds &&
              ` ${humansOf(betting.wallets).filter((b) => betting.wallets.bets[betting.odds!.key]?.[b]).length}/${humansOf(betting.wallets).length}`}
          </Button>
        )}
        <Button
          variant="secondary"
          size="md"
          icon="simuler"
          onClick={onSimulate}
          title="Résout le combat instantanément, avec les mêmes règles, et affiche les scores"
          className="w-56"
        >
          Simuler
        </Button>
      </div>

      {betting && desk && (
        <BettingDesk
          wallets={betting.wallets}
          odds={betting.odds}
          fighters={fighters}
          onBet={betting.onBet}
          onCancel={betting.onCancel}
          onReset={betting.onReset}
          onClose={() => {
            sfx.click()
            setDesk(false)
          }}
        />
      )}
    </div>
  )
}

/** Arènes proposées, dans l'ordre du sélecteur : chacune, puis « au hasard ». */
const ARENA_CHOICES: readonly ArenaChoice[] = [...ARENAS.map((a) => a.id), RANDOM_ARENA]

/** Sélecteur d'arène ‹ nom › : change le décor en fond de l'écran. Flèches du clavier acceptées. */
function ArenaSlider({ value, onChange }: { value: ArenaChoice; onChange: (arena: ArenaChoice) => void }) {
  const index = Math.max(0, ARENA_CHOICES.indexOf(value))
  const step = (delta: number) => {
    sfx.click()
    onChange(ARENA_CHOICES[(index + delta + ARENA_CHOICES.length) % ARENA_CHOICES.length])
  }
  // Les flèches gauche/droite parcourent les arènes.
  const stepRef = useRef(step)
  stepRef.current = step
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') stepRef.current(-1)
      if (e.key === 'ArrowRight') stepRef.current(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const random = value === RANDOM_ARENA
  return (
    <div className="flex items-center gap-3" role="group" aria-label="Arène">
      <button type="button" onClick={() => step(-1)} aria-label="Arène précédente" title="Arène précédente" className="bt-iconbtn bt-iconbtn--sm text-lg">
        ‹
      </button>
      <div className="flex w-96 flex-col items-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-500">Arène</span>
        <span
          key={value}
          className="fade-in flex items-center gap-2 font-display text-2xl font-extrabold text-amber-100 drop-shadow-[0_2px_0_#000]"
        >
          {random && <Glyph name="hasard" size={18} />}
          {random ? 'Au hasard' : getArena(value).name}
        </span>
        <span key={`${value}-region`} className="fade-in text-xs italic text-stone-400">
          {random ? 'Un lieu tiré au sort' : getArena(value).region}
        </span>
        {/* Points de position */}
        <span className="mt-1 flex gap-1.5">
          {ARENA_CHOICES.map((c, i) => (
            <span key={c} className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-amber-300' : 'bg-stone-600'}`} />
          ))}
        </span>
      </div>
      <button type="button" onClick={() => step(1)} aria-label="Arène suivante" title="Arène suivante" className="bt-iconbtn bt-iconbtn--sm text-lg">
        ›
      </button>
    </div>
  )
}

function FighterCard({ character, side, rank }: { character: Character; side: Side; rank: MatchupRank | null }) {
  const style = SIDE_STYLE[side]
  return (
    <div
      className={`row-start-1 flex items-end gap-6 ${side === 0 ? 'slide-in-left col-start-1' : 'slide-in-right col-start-3 flex-row-reverse'}`}
    >
      <div className="h-[560px] shrink-0">
        <Fighter character={character} side={side} anchor="inside" />
      </div>
      <div className={`relative z-20 mb-16 flex flex-col gap-3 ${side === 1 ? 'items-end text-right' : ''}`}>
        <div className={`flex flex-col gap-2 ${side === 1 ? 'items-end' : 'items-start'}`}>
          {rank && <RankPlaque rank={rank} side={side} />}
          <div>
            {/* Un nom de tournoi long (épithète, 0.87.0) passe en plus petit */}
            <h2 className={`on-illus font-display ${character.name.length > 14 ? 'text-4xl' : 'text-5xl'} font-semibold ${style.accent}`}>{character.name}</h2>
            <p className="on-illus font-body text-lg text-ink-2">
              {character.race} · {character.archetype}
            </p>
          </div>
        </div>
        {/* Mêmes barres que sur l'écran de sélection, à la couleur du camp */}
        <div className={`fighter-panel ${side === 1 ? 'side-b' : 'side-a'} w-72 px-3 pb-2.5 pt-3 text-left`}>
          <StatSheet character={character} barClass={style.bar} trackClass={style.track} />
        </div>
        {/* Le build complet : toutes les faces du dé, dans l'ordre, avec la compétence (rang, gravure, dorure) de chacune */}
        <DieBuild character={character} size="sm" align={side === 1 ? 'right' : 'left'} tooltip="above" />
        {/* Reliques portées (tournoi, saison, campagne) : elles comptent dans les cotes, on les montre aux parieurs.
            Hauteur réservée même sans relique : les deux cartes restent alignées. */}
        <div className="min-h-[56px]">
          <RelicRow relics={character.relics} size={56} tooltip="above" align={side === 1 ? 'right' : 'left'} />
        </div>
      </div>
    </div>
  )
}

/**
 * Plaque de classement au-dessus du nom : la place en grand chiffre d'or dans un cartouche, puis son contexte
 * (saison en cours : points et bilan ; arbre : rang de saison qui fait la tête de série). Lisible de loin.
 */
function RankPlaque({ rank, side }: { rank: MatchupRank; side: Side }) {
  return (
    <div className={`matchup-rank ${side === 1 ? 'flex-row-reverse text-right' : ''}`} data-kind={rank.kind}>
      {/* Ordinal français en exposant : 1er, 2e, 3e… */}
      <span className="matchup-rank-place">
        {rank.rank}
        <sup>{rank.rank === 1 ? 'er' : 'e'}</sup>
      </span>
      <span className="matchup-rank-info">
        {rank.kind === 'season' ? (
          <>
            <span className="matchup-rank-label">{`Saison · sur ${rank.of}`}</span>
            <span className="matchup-rank-record">{`${rank.points} pt${rank.points > 1 ? 's' : ''} · ${rank.wins} V – ${rank.losses} D`}</span>
          </>
        ) : (
          <>
            <span className="matchup-rank-label">Tête de série</span>
            <span className="matchup-rank-record">Classement de la saison</span>
          </>
        )}
      </span>
    </div>
  )
}
