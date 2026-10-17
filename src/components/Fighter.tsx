import type { CSSProperties } from 'react'
import type { Character } from '../game/character'
import type { AppliedEffect, Side, TriggeredEvent } from '../game/combat'

/** Ce que le combattant subit pendant le coup en cours. */
export interface Received {
  key: number
  damage: number
  crit: boolean
  dodged: boolean
  /** false pendant l'élan de l'attaquant, true une fois le coup arrivé */
  landed: boolean
}

interface Props {
  character: Character
  /** 0 = à gauche, regarde à droite ; 1 = à droite, regarde à gauche */
  side: Side
  lunging?: boolean
  received?: Received
  state?: 'idle' | 'ko' | 'victory'
  /** Événement en cours d'affichage sur ce combattant */
  eventFx?: { key: number; event: TriggeredEvent }
  className?: string
}

const effectBadge = (e: AppliedEffect) =>
  e.type === 'heal'
    ? { text: `+${e.amount} PV`, className: 'text-emerald-300 [-webkit-text-stroke:1.5px_#064e3b]' }
    : e.kind === 'guaranteedCrit'
      ? { text: '🎯 Critique assuré', className: 'text-amber-300 [-webkit-text-stroke:1px_#78350f]' }
      : { text: `🛡️ +${e.amount} armure`, className: 'text-cyan-200 [-webkit-text-stroke:1px_#164e63]' }

export function Fighter({
  character,
  side,
  lunging = false,
  received,
  state = 'idle',
  eventFx,
  className = '',
}: Props) {
  const style = { '--dir': side === 0 ? 1 : -1 } as CSSProperties
  const wantsFacing = side === 0 ? 'right' : 'left'
  const flip = character.look.facing !== wantsFacing

  // L'esquive démarre avec l'élan, le recul n'arrive qu'à l'impact.
  const reaction = received?.dodged ? 'dodge' : received?.landed ? 'hit' : ''

  // Les effets se placent par rapport à la silhouette, plus petite pour un nain.
  const scale = character.look.scale
  const at = (pct: number) => ({ top: `${(1 - scale) * 100 + scale * pct}%` })

  return (
    <div className={`relative aspect-[636/1062] h-full ${lunging ? 'z-20' : 'z-10'} ${className}`} style={style}>
      {/* ombre au sol */}
      <div className="absolute bottom-[1%] left-1/2 h-[5%] w-[80%] -translate-x-1/2 rounded-[50%] bg-black/60 blur-md" />

      <div className={`h-full ${lunging ? 'lunge' : ''}`}>
        <div className={`h-full ${reaction}`}>
          <div className={`flex h-full items-end ${state === 'ko' ? 'ko' : state === 'victory' ? 'victory' : ''}`}>
            <img
              src={character.look.image}
              alt={character.name}
              draggable={false}
              className="w-full select-none object-contain object-bottom drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
              style={{
                height: `${scale * 100}%`,
                transform: flip ? 'scaleX(-1)' : undefined,
                filter: character.look.tint,
              }}
            />
          </div>
        </div>
      </div>

      {eventFx && (
        <div key={`ev${eventFx.key}`} className="pointer-events-none absolute inset-0 z-30">
          <div
            style={at(45)}
            className="event-aura absolute left-1/2 aspect-square w-[130%] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.55)_0%,rgba(167,139,250,0.15)_45%,transparent_70%)]"
          />
          <div
            style={at(4)}
            className="event-title absolute left-1/2 whitespace-nowrap rounded-full border border-violet-300/60 bg-violet-950/80 px-3 py-1 font-display text-lg font-extrabold text-violet-100"
          >
            ✨ {eventFx.event.name}
          </div>
          {eventFx.event.effects.map((e, i) => {
            const badge = effectBadge(e)
            return (
              <div
                key={i}
                style={at(20 + i * 10)}
                className={`damage-float absolute left-1/2 whitespace-nowrap font-display text-4xl font-extrabold ${badge.className}`}
              >
                {badge.text}
              </div>
            )
          })}
        </div>
      )}

      {received?.landed && (
        <div key={`fx${received.key}`} className="pointer-events-none absolute inset-0 z-30">
          {received.dodged ? (
            <div
              style={at(22)}
              className="dodge-text absolute left-1/2 whitespace-nowrap font-display text-4xl font-extrabold text-cyan-200 [-webkit-text-stroke:1.5px_#164e63]"
            >
              ESQUIVE !
            </div>
          ) : (
            <>
              <ImpactStar size={received.crit ? 'crit' : received.damage >= 8 ? 'big' : 'normal'} style={at(38)} />
              {received.crit && (
                <div
                  style={at(6)}
                  className="dodge-text absolute left-1/2 whitespace-nowrap font-display text-3xl font-extrabold text-amber-300 [-webkit-text-stroke:1.5px_#78350f]"
                >
                  CRITIQUE !
                </div>
              )}
              <div
                style={at(18)}
                className={`damage-float absolute left-1/2 font-display font-extrabold ${
                  received.crit
                    ? 'text-8xl text-amber-400 [-webkit-text-stroke:2.5px_#451a03]'
                    : `text-red-500 [-webkit-text-stroke:2px_#450a0a] ${received.damage >= 10 ? 'text-7xl' : received.damage >= 7 ? 'text-6xl' : 'text-5xl'}`
                }`}
              >
                -{received.damage}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ImpactStar({ size, style }: { size: 'normal' | 'big' | 'crit'; style: CSSProperties }) {
  const spikes = size === 'crit' ? 16 : 12
  const points = Array.from({ length: spikes * 2 }, (_, i) => {
    const r = i % 2 === 0 ? 50 : 22
    const a = (Math.PI * i) / spikes
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`
  }).join(' ')
  const width = { normal: 'w-[70%]', big: 'w-[95%]', crit: 'w-[125%]' }[size]
  return (
    <svg viewBox="0 0 100 100" style={style} className={`impact absolute left-1/2 ${width}`}>
      <polygon
        points={points}
        fill={size === 'crit' ? '#fbbf24' : '#fde047'}
        stroke={size === 'crit' ? '#dc2626' : '#f97316'}
        strokeWidth="3"
      />
      <circle cx="50" cy="50" r={size === 'crit' ? 18 : 14} fill="#fff" />
    </svg>
  )
}
