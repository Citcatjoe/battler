import { useEffect, useRef, useState } from 'react'
import { ARENAS, getArena, RANDOM_ARENA, type ArenaChoice } from '../game/arenas'
import type { Character } from '../game/character'
import { SIDE_STYLE, type Pair, type Side } from '../game/combat'
import { sfx } from '../game/sound'
import { Fighter } from './Fighter'
import { SkillDice } from './SkillDice'
import { StatSheet } from './StatSheet'
import { Icon } from './Icon'
import { humansOf, type Bettor, type MatchOdds, type Pick, type Wallets } from '../game/betting'
import { BetSummary, BettingDesk } from './Betting'

interface Props {
  fighters: Pair<Character>
  onPlay: () => void
  onSimulate: () => void
  onBack: () => void
  /** Bandeau au-dessus du duel, ex. « Quarts de finale · Match 2 » */
  title?: string
  backLabel?: string
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
  backLabel = '← CHANGER',
  arena,
  onArenaChange,
  betting,
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
            style={{ objectPosition: getArena(arena).focus, filter: 'brightness(0.4) saturate(0.75) blur(2px)' }}
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
          <FighterCard key={side} character={fighters[side]} side={side} />
        ))}
        <span className="vs-slam col-start-2 row-start-1 mb-[300px] font-display text-[140px] font-extrabold leading-none text-amber-300 drop-shadow-[0_6px_0_#78350f]">
          VS
        </span>
        {betting && (
          <div className="col-start-2 row-start-1 mb-[150px] self-end justify-self-center">
            <BetSummary wallets={betting.wallets} odds={betting.odds} fighterNames={names} />
          </div>
        )}
      </div>

      <div className="relative flex items-center justify-center gap-6 pb-10 pt-4">
        <button onClick={onBack} className="btn btn-md w-56">
          <span>{backLabel}</span>
        </button>
        <button onClick={onPlay} className="btn btn-primary btn-lg w-80">
          <Icon name="swords" className="btn-icon" />
          <span>Jouer</span>
        </button>
        {betting && (
          <button
            onClick={() => {
              sfx.click()
              setDesk(true)
            }}
            title="Ouvre le guichet du match : chaque joueur peut parier avant le combat"
            className="btn btn-md w-56"
          >
            <Icon name="coin-pile" className="btn-icon" />
            <span>
              Parier
              {betting.odds &&
                ` ${humansOf(betting.wallets).filter((b) => betting.wallets.bets[betting.odds!.key]?.[b]).length}/${humansOf(betting.wallets).length}`}
            </span>
          </button>
        )}
        <button
          onClick={onSimulate}
          title="Résout le combat instantanément, avec les mêmes règles, et affiche les scores"
          className="btn btn-md w-56"
        >
          <Icon name="lightning" className="btn-icon" />
          <span>Simuler</span>
        </button>
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
      <button onClick={() => step(-1)} aria-label="Arène précédente" className="btn btn-round h-10 w-10 text-lg">
        <span>‹</span>
      </button>
      <div className="flex w-80 flex-col items-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-500">Arène</span>
        <span
          key={value}
          className="fade-in flex items-center gap-2 font-display text-2xl font-extrabold text-amber-100 drop-shadow-[0_2px_0_#000]"
        >
          {random && <Icon name="dice" />}
          {random ? 'Au hasard' : getArena(value).name}
        </span>
        {/* Points de position */}
        <span className="mt-1 flex gap-1.5">
          {ARENA_CHOICES.map((c, i) => (
            <span key={c} className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-amber-300' : 'bg-stone-600'}`} />
          ))}
        </span>
      </div>
      <button onClick={() => step(1)} aria-label="Arène suivante" className="btn btn-round h-10 w-10 text-lg">
        <span>›</span>
      </button>
    </div>
  )
}

function FighterCard({ character, side }: { character: Character; side: Side }) {
  const style = SIDE_STYLE[side]
  return (
    <div
      className={`row-start-1 flex items-end gap-6 ${side === 0 ? 'slide-in-left col-start-1' : 'slide-in-right col-start-3 flex-row-reverse'}`}
    >
      <div className="h-[560px] shrink-0">
        <Fighter character={character} side={side} />
      </div>
      <div className={`mb-16 flex flex-col gap-3 ${side === 1 ? 'items-end text-right' : ''}`}>
        <div>
          <h2 className={`font-display text-5xl font-extrabold ${style.accent}`}>{character.name}</h2>
          <p className="text-lg text-stone-400">
            {character.race} · {character.archetype}
          </p>

        </div>
        {/* Mêmes barres que sur l'écran de sélection, à la couleur du camp */}
        <div className={`fighter-panel ${side === 1 ? 'side-b' : 'side-a'} w-72 px-3 pb-2.5 pt-3 text-left`}>
          <StatSheet character={character} barClass={style.bar} trackClass={style.track} />
        </div>
        <SkillDice character={character} align={side === 1 ? 'right' : 'left'} />
      </div>
    </div>
  )
}
