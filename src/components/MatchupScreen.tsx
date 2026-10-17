import { useEffect } from 'react'
import type { Character } from '../game/character'
import { multiplier, percent, SIDE_STYLE, type Pair, type Side } from '../game/combat'
import { sfx } from '../game/sound'
import { Fighter } from './Fighter'
import { EventInfo } from './EventInfo'

interface Props {
  fighters: Pair<Character>
  onPlay: () => void
  onSimulate: () => void
  onBack: () => void
  /** Bandeau au-dessus du duel, ex. « Quarts de finale · Match 2 » */
  title?: string
  backLabel?: string
}

/** Écran d'affrontement : présente le duel et laisse choisir entre le jouer ou le simuler. */
export function MatchupScreen({
  fighters,
  onPlay,
  onSimulate,
  onBack,
  title = 'Affrontement',
  backLabel = '← CHANGER',
}: Props) {
  // Fracas quand le « VS » s'abat ; le délai est annulé si l'écran est démonté entre-temps.
  useEffect(() => {
    const id = setTimeout(() => sfx.impact(10, true), 550)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_110%,#57534e_0%,#1c1917_45%,#0c0a09_80%)]">
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-sky-500/10 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-rose-500/10 to-transparent" />

      <p className="relative pt-8 text-center text-sm font-bold uppercase tracking-[0.5em] text-stone-500">{title}</p>

      <div className="relative grid flex-1 grid-cols-[1fr_auto_1fr] items-end px-10">
        {([0, 1] as Side[]).map((side) => (
          <FighterCard key={side} character={fighters[side]} side={side} />
        ))}
        <span className="vs-slam col-start-2 row-start-1 mb-[300px] font-display text-[140px] font-extrabold leading-none text-amber-300 drop-shadow-[0_6px_0_#78350f]">
          VS
        </span>
      </div>

      <div className="relative flex items-center justify-center gap-6 pb-10 pt-4">
        <button
          onClick={onBack}
          className="w-56 rounded-xl border border-stone-700 py-4 font-display text-lg font-bold tracking-wider text-stone-300 hover:bg-stone-800"
        >
          {backLabel}
        </button>
        <button
          onClick={onPlay}
          className="w-80 rounded-xl bg-amber-500 py-5 font-display text-3xl font-extrabold tracking-widest text-stone-950 shadow-[0_5px_0_#92400e] transition hover:bg-amber-400 active:translate-y-1 active:shadow-[0_1px_0_#92400e]"
        >
          ⚔ JOUER
        </button>
        <button
          onClick={onSimulate}
          title="Résout le combat instantanément, avec les mêmes règles, et affiche les scores"
          className="w-56 rounded-xl border-2 border-amber-500/70 py-4 font-display text-lg font-extrabold tracking-wider text-amber-200 hover:bg-amber-500/10"
        >
          ⚡ SIMULER
        </button>
      </div>
    </div>
  )
}

function FighterCard({ character, side }: { character: Character; side: Side }) {
  const style = SIDE_STYLE[side]
  const s = character.stats
  const chips = [
    ['PV', s.maxHp],
    ['Dégâts', `1d${s.damageDie}`],
    ['Armure', s.armor],
    ['Esquive', percent(s.dodgeChance)],
    ['Critique', `${percent(s.critChance)} ${multiplier(s.critMultiplier)}`],
  ]
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
        <dl className={`flex max-w-72 flex-wrap gap-1.5 ${side === 1 ? 'justify-end' : ''}`}>
          {chips.map(([k, v]) => (
            <div key={k} className="rounded-md border border-stone-700 bg-stone-900/70 px-2 py-1 text-xs">
              <dt className="inline text-stone-500">{k} </dt>
              <dd className="inline font-mono font-bold text-stone-100">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="max-w-72 text-left">
          <EventInfo character={character} compact />
        </div>
      </div>
    </div>
  )
}
