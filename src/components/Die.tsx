import { useLayoutEffect, useState } from 'react'
import { defaultRng, rollDie } from '../game/rng'

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
}

/** Dé stylisé : la face que lui donne useRollingFaces, qui défile tant qu'il roule. */
export function Die({ value, face, faces, rolling, color = '#e7e5e4', size = 96 }: Props) {
  const isMax = !rolling && value === faces
  const isMin = !rolling && value === 1

  return (
    <div
      key={rolling ? 'rolling' : `v${value}`}
      className={`relative ${rolling ? 'die-rolling' : 'die-landed'}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]">
        <polygon points="50,3 95,40 50,97 5,40" fill="#1c1917" stroke={color} strokeWidth="4" strokeLinejoin="round" />
        <polyline
          points="5,40 30,48 50,97 70,48 95,40"
          fill="none"
          stroke={color}
          strokeOpacity="0.35"
          strokeWidth="2"
        />
        <polyline points="30,48 50,3 70,48 30,48" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="2" />
      </svg>
      <span
        className={`absolute inset-x-0 top-[26%] text-center font-display font-extrabold leading-none ${
          isMax ? 'text-amber-300' : isMin ? 'text-stone-500' : ''
        }`}
        style={{ fontSize: size * 0.32, color: isMax || isMin ? undefined : color }}
      >
        {face || ''}
      </span>
    </div>
  )
}
