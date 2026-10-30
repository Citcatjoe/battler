import { useLayoutEffect, useState } from 'react'
import { defaultRng, rollDie } from '../game/rng'
import type { DieKind } from '../game/staging'
import { PIPS } from './SkillDice'

/** Pas du roulement : une nouvelle face toutes les 70 ms. */
const ROLL_STEP = 70

/**
 * Les faces que montrent les dés, une seule source pour le dé de l'arène et la zone de compétence (SkillBar, 0.96.0).
 * Pendant le roulement, une face au hasard par dé à chaque pas : pur décor, aucune règle n'en dépend (d'où
 * `defaultRng`), et figé en pause. Retombés, les valeurs des beats (`values`). `tick` compte les pas du roulement : il
 * relance le reflet de la face montrée dans la zone de compétence.
 */
export function useRollingFaces(values: readonly number[], faces: readonly number[], rolling: boolean, paused = false) {
  const [roll, setRoll] = useState<{ faces: number[]; tick: number }>({ faces: [], tick: 0 })
  const sizes = faces.join(',')
  // Avant de peindre : le premier pas remplace aussitôt les faces du roulement précédent
  useLayoutEffect(() => {
    if (!rolling || paused || !sizes) return
    const dice = sizes.split(',').map(Number)
    const step = () => setRoll((r) => ({ faces: dice.map((f) => rollDie(defaultRng, f)), tick: r.tick + 1 }))
    step()
    const id = setInterval(step, ROLL_STEP)
    return () => clearInterval(id)
  }, [rolling, paused, sizes])
  return rolling ? roll : { faces: [...values], tick: roll.tick }
}

interface Props {
  /** Valeur tombée (0 tant qu'il roule) */
  value: number
  /** Face montrée en ce moment (useRollingFaces) */
  face: number
  faces: number
  rolling: boolean
  color?: string
  size?: number
  /** Dé de compétence (défaut) ou dé de frappe (DieKind) */
  kind?: DieKind
  /** Doublé : allumé en or */
  gold?: boolean
}

/** L'or du Doublé (celui du critique, `SPECIAL_SOURCES.strike`) */
const GOLD = '#fbbf24'

/** Un dé de frappe est plus petit que le dé de compétence : cette part de sa taille */
export const STRIKE_DIE_SCALE = 0.68

/**
 * Un dé de l'arène, la face que lui donne useRollingFaces, qui défile tant qu'il roule. Deux sortes, distinctes par la
 * forme et la couleur (D6 du retour du 30 octobre) : le dé de compétence, un cristal à la couleur du camp, son chiffre ;
 * le dé de frappe, un cube blanc à points, jamais d'icône ni de couleur de camp (`StrikeDie`). Un Doublé allume en or.
 */
export function Die({ value, face, faces, rolling, color = '#e7e5e4', size = 96, kind = 'skill', gold = false }: Props) {
  const isMax = !rolling && value === faces
  const isMin = !rolling && value === 1
  const stroke = gold ? GOLD : color

  return (
    <div
      key={rolling ? 'rolling' : `v${value}${kind}`}
      className={`relative ${rolling ? 'die-rolling' : 'die-landed'} ${gold ? 'die-gold' : ''}`}
      style={{ width: size, height: size }}
      data-kind={kind}
    >
      {kind === 'strike' ? (
        <StrikeDie face={face} />
      ) : (
        <>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]">
            <polygon points="50,3 95,40 50,97 5,40" fill={gold ? '#3e2a10' : '#1c1917'} stroke={stroke} strokeWidth={gold ? 6 : 4} strokeLinejoin="round" />
            <polyline points="5,40 30,48 50,97 70,48 95,40" fill="none" stroke={stroke} strokeOpacity="0.35" strokeWidth="2" />
            <polyline points="30,48 50,3 70,48 30,48" fill="none" stroke={stroke} strokeOpacity="0.35" strokeWidth="2" />
          </svg>
          <span
            className={`absolute inset-x-0 top-[26%] text-center font-display font-extrabold leading-none ${
              gold || isMax ? 'text-amber-300' : isMin ? 'text-stone-500' : ''
            }`}
            style={{ fontSize: size * 0.32, color: gold || isMax || isMin ? undefined : color }}
          >
            {face || ''}
          </span>
        </>
      )}
    </div>
  )
}

/** Le dé de frappe : un cube d'ivoire aux points sombres ; au-delà de 6, son chiffre. Remplit son parent (positionné). */
export function StrikeDie({ face }: { face: number }) {
  const pips = PIPS[face]
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]" aria-label={face ? `Dé de frappe ${face}` : 'Dé de frappe'}>
      <rect x="8" y="8" width="84" height="84" rx="18" fill="#f5efe1" stroke="#a8a29e" strokeWidth="3" />
      <rect x="14" y="12" width="72" height="10" rx="5" fill="#ffffff" opacity="0.5" />
      {pips
        ? pips.map(([x, y]) => <circle key={`${x}${y}`} cx={28 + x * 22} cy={28 + y * 22} r="8.5" fill="#1c1917" />)
        : face > 0 && (
            <text x="50" y="66" textAnchor="middle" className="font-display" fontSize="44" fontWeight="800" fill="#1c1917">
              {face}
            </text>
          )}
    </svg>
  )
}
