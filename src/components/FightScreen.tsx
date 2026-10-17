import { useEffect, useRef, type CSSProperties } from 'react'
import arenaImg from '../assets/arena1.jpg'
import { multiplier, SIDE_STYLE, type CombatResult, type Side } from '../game/combat'
import { useCombat } from '../game/useCombat'
import { CombatLog } from './CombatLog'
import { Die } from './Die'
import { Fighter, type Received } from './Fighter'
import { HpBar } from './HpBar'

interface Props {
  /** Combat déjà résolu, que cet écran met en scène */
  script: CombatResult
  onEnd: (result: CombatResult) => void
}

const SPEEDS = [1, 2, 4]

const SHAKE: Keyframe[] = [
  { transform: 'translate(0, 0)' },
  { transform: 'translate(-7px, 4px)' },
  { transform: 'translate(6px, -4px)' },
  { transform: 'translate(-4px, 2px)' },
  { transform: 'translate(3px, -1px)' },
  { transform: 'translate(0, 0)' },
]

export function FightScreen({ script, onEnd }: Props) {
  const { fighters } = script
  const { hp, buffs, dice, strike, eventFx, log, turn, winner, speed, setSpeed, paused, setPaused } = useCombat(
    script,
    onEnd,
  )

  const fighterState = (side: Side) => (winner === null ? 'idle' : winner === side ? 'victory' : 'ko')
  const diceColor = dice.owner === null ? '#e7e5e4' : SIDE_STYLE[dice.owner].hex
  const shake = strike?.landed && !strike.dodged && (strike.crit || strike.damage >= 8)

  // Secousse de l'arène sur les gros coups (sans remonter les combattants).
  const arenaRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!shake) return
    const crit = strike?.crit
    arenaRef.current?.animate(crit ? SHAKE.map((k) => ({ transform: `${k.transform} scale(1.02)` })) : SHAKE, {
      duration: (crit ? 500 : 350) / speed,
      easing: 'linear',
    })
  }, [shake, strike?.key, strike?.crit, speed])

  const receivedBy = (side: Side): Received | undefined =>
    strike && strike.attacker !== side
      ? { key: strike.key, damage: strike.damage, crit: strike.crit, dodged: strike.dodged, landed: strike.landed }
      : undefined

  return (
    <div
      className={`arena flex h-full flex-col ${paused ? 'is-paused' : ''}`}
      style={{ '--speed': speed } as CSSProperties}
    >
      {/* Barres de vie */}
      <header className="flex items-start gap-6 border-b border-stone-800 bg-stone-950/80 py-4 pl-8 pr-20">
        <HpBar side={0} name={fighters[0].name} hp={hp[0]} maxHp={fighters[0].maxHp} buffs={buffs[0]} />
        <div className="flex shrink-0 flex-col items-center pt-1">
          <span className="text-xs uppercase tracking-widest text-stone-500">Tour</span>
          <span className="font-display text-3xl font-extrabold tabular-nums">{turn || '–'}</span>
        </div>
        <HpBar side={1} name={fighters[1].name} hp={hp[1]} maxHp={fighters[1].maxHp} buffs={buffs[1]} />
      </header>

      {/* Arène */}
      <main
        ref={arenaRef}
        className="relative flex flex-1 items-end justify-between overflow-hidden bg-stone-950 px-[10%] pt-6"
      >
        {/* Décor : assombri, désaturé et légèrement flou pour laisser les combattants au premier plan */}
        <img
          src={arenaImg}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full scale-[1.04] select-none object-cover object-[50%_70%]"
          style={{ filter: 'brightness(0.45) saturate(0.7) blur(1.5px)' }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_35%,rgba(12,10,9,0.85)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-stone-950/85 to-transparent" />
        {/* Halo au sol qui détache les silhouettes */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,237,213,0.12)_0%,transparent_65%)]" />

        {([0, 1] as Side[]).map((side) => (
          <div key={side} className={`relative h-[500px] ${side === 1 ? 'order-last' : ''}`}>
            <Fighter
              character={fighters[side]}
              side={side}
              state={fighterState(side)}
              lunging={strike?.attacker === side}
              received={receivedBy(side)}
              eventFx={eventFx?.event.side === side ? eventFx : undefined}
            />
          </div>
        ))}

        {/* Zone des dés */}
        <div className="absolute left-1/2 top-[12%] z-0 flex -translate-x-1/2 flex-col items-center gap-3">
          <span
            className="h-5 whitespace-nowrap text-sm font-bold uppercase tracking-widest"
            style={{ color: diceColor }}
          >
            {dice.label}
          </span>
          <div className="flex gap-6">
            {dice.values.map((v, i) => (
              <Die
                key={`${dice.values.length}-${i}`}
                value={v}
                faces={dice.faces}
                rolling={dice.rolling}
                color={dice.owner === null ? SIDE_STYLE[i as Side].hex : diceColor}
                size={dice.values.length > 1 ? 80 : 104}
              />
            ))}
          </div>
          <div className="h-10">
            {dice.crit && dice.owner !== null && (
              <span className="crit-badge inline-block rounded-md bg-amber-400 px-3 py-1 font-display text-xl font-extrabold text-stone-950 shadow-[0_3px_0_#92400e]">
                {dice.critFromBuff ? '🎯 CRITIQUE ASSURÉ' : 'CRITIQUE'}{' '}
                {multiplier(fighters[dice.owner].stats.critMultiplier)}
              </span>
            )}
          </div>
          {winner !== null && (
            <span className="fade-in font-display text-5xl font-extrabold text-amber-300 drop-shadow-[0_3px_0_#78350f]">
              K.O. !
            </span>
          )}
        </div>
      </main>

      {/* Journal + contrôles */}
      <footer className="flex border-t border-stone-800 bg-stone-950">
        <div className="h-44 flex-1">
          <CombatLog entries={log} />
        </div>
        <div className="flex flex-col items-center justify-center gap-2 border-l border-stone-800 p-3">
          <button
            onClick={() => setPaused(!paused)}
            className="w-28 rounded-md border border-stone-700 px-3 py-1.5 text-sm font-bold hover:bg-stone-800"
          >
            {paused ? '▶ Reprendre' : '❚❚ Pause'}
          </button>
          <div className="flex overflow-hidden rounded-md border border-stone-700">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1.5 text-sm font-bold ${s === speed ? 'bg-amber-500 text-stone-950' : 'hover:bg-stone-800'}`}
              >
                ×{s}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
