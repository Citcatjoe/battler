import { useEffect, useState } from 'react'
import { rollDie } from '../game/combat'

interface Props {
  value: number
  faces: number
  rolling: boolean
  color?: string
  size?: number
}

/** Dé stylisé : affiche des valeurs aléatoires tant qu'il roule. */
export function Die({ value, faces, rolling, color = '#e7e5e4', size = 96 }: Props) {
  const [face, setFace] = useState(value || rollDie(faces))

  useEffect(() => {
    if (!rolling) {
      if (value) setFace(value)
      return
    }
    const id = setInterval(() => setFace(rollDie(faces)), 70)
    return () => clearInterval(id)
  }, [rolling, value, faces])

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
        {face}
      </span>
    </div>
  )
}
