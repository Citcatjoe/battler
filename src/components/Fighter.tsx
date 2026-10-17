import type { CSSProperties } from 'react'
import type { Character } from '../game/character'
import type { AppliedEffect, Side } from '../game/combat'
import { effectBadge, TONE_CLASS } from '../game/narration'
import { POLARITY_STYLE, STATUSES, type Polarity, type Status } from '../game/statuses'

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
  /** Effets en cours d'affichage : titre et aura si ce combattant en est la source, badges s'il est visé */
  fx?: { key: number; source: Side | null; title: string; effects: AppliedEffect[] }
  /** Statuts actifs : une aura discrète au sol signale bonus (vert) et malus (rouge) */
  statuses?: readonly Status[]
  className?: string
}

const polarities = (statuses: readonly Status[]) =>
  (['positive', 'negative'] as Polarity[]).filter((p) => statuses.some((s) => STATUSES[s.id].polarity === p))

export function Fighter({
  character,
  side,
  lunging = false,
  received,
  state = 'idle',
  fx,
  statuses = [],
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

  const isSource = fx !== undefined && fx.source === side
  const badges = fx?.effects.filter((e) => e.target === side).map(effectBadge) ?? []
  const auras = polarities(statuses)

  return (
    <div className={`relative aspect-[636/1062] h-full ${lunging ? 'z-20' : 'z-10'} ${className}`} style={style}>
      {/* ombre au sol */}
      <div className="absolute bottom-[1%] left-1/2 h-[5%] w-[80%] -translate-x-1/2 rounded-[50%] bg-black/60 blur-md" />
      {/* auras des statuts actifs : bonus et malus côte à côte */}
      {auras.map((p, i) => (
        <div
          key={p}
          className="status-aura pointer-events-none absolute bottom-0 h-[16%] rounded-[50%] blur-lg"
          style={{
            left: auras.length > 1 ? `${5 + i * 45}%` : '10%',
            width: auras.length > 1 ? '50%' : '80%',
            background: `radial-gradient(ellipse at 50% 70%, ${POLARITY_STYLE[p].glow} 0%, transparent 70%)`,
          }}
        />
      ))}

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

      {fx && (isSource || badges.length > 0) && (
        <div key={`fx-${fx.key}`} className="pointer-events-none absolute inset-0 z-30">
          {isSource && (
            <>
              <div
                style={at(45)}
                className="event-aura absolute left-1/2 aspect-square w-[130%] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.55)_0%,rgba(167,139,250,0.15)_45%,transparent_70%)]"
              />
              {/* Nom de la compétence : même texte flottant qu'ESQUIVE ou CRITIQUE, en violet */}
              {fx.title && (
                <div
                  style={at(6)}
                  className="dodge-text absolute left-1/2 whitespace-nowrap font-display text-3xl font-extrabold uppercase text-violet-300 [-webkit-text-stroke:1.5px_#2e1065]"
                >
                  {fx.title} !
                </div>
              )}
            </>
          )}
          {badges.map((badge, i) => (
            <div
              key={i}
              style={at(20 + i * 10)}
              className={`damage-float absolute left-1/2 whitespace-nowrap font-display text-4xl font-extrabold ${TONE_CLASS[badge.tone]}`}
            >
              {badge.text}
            </div>
          ))}
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
