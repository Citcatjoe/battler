import { useEffect, useRef, type CSSProperties } from 'react'
import type { Character } from '../game/character'
import { SIDE_STYLE, type Side } from '../game/combat'
import type { CheatState } from '../game/useCombat'

interface Props {
  /** Combattant sous lequel le pavé est posé */
  side: Side
  fighter: Character
  cheat: CheatState
  onForce: (value: number | null) => void
}

/**
 * Combat test : le pavé du dé, sous chaque combattant. Il s'allume quand la lecture attend le dé de
 * ce combattant ; le joueur choisit la face (ou pile, face), ou laisse le hasard. Le combat est alors
 * résolu à nouveau par le moteur (`forcedRolls`). Clavier, pavé allumé : 1 à 9, 0 pour 10, P et F
 * pour la pièce, H ou Retour arrière pour le hasard.
 */
export function CheatPad({ side, fighter, cheat, onForce }: Props) {
  const { next } = cheat
  const mine = next?.side === side ? next : undefined
  const active = cheat.waiting && mine !== undefined
  // En attendant son tour, le pavé montre le dé du combattant
  const faces = mine?.faces ?? fighter.stats.damageDie
  const color = SIDE_STYLE[side].hex

  const keyRef = useRef((_: KeyboardEvent) => {})
  keyRef.current = (e) => {
    if (!active || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
    const k = e.key.toLowerCase()
    if (mine.coin && (k === 'p' || k === 'f')) onForce(k === 'p' ? 1 : 2)
    else if (!mine.coin && /^[0-9]$/.test(k)) {
      const v = k === '0' ? 10 : Number(k)
      if (v > faces) return
      onForce(v)
    } else if (k === 'h' || k === 'backspace' || k === 'delete') onForce(null)
    else return
    e.preventDefault()
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <section
      aria-label={`Dé de ${fighter.name}`}
      className={`cheat-panel cheat-pad w-[300px] ${active ? 'is-active' : ''}`}
      style={{ '--camp': color } as CSSProperties}
    >
      <header className="cheat-head">
        <span style={{ color: active ? color : undefined }}>Dé de {fighter.name}</span>
        <span className="font-mono tracking-normal">
          {active ? (mine.coin ? 'pièce' : `d${faces}`) : cheat.next ? 'en attente' : '—'}
        </span>
      </header>

      <div className="flex flex-col gap-2 p-3">
        {mine?.coin ? (
          <div className="grid grid-cols-2 gap-1.5">
            {(['Pile', 'Face'] as const).map((label, i) => (
              <button key={label} className="cheat-key" disabled={!active} onClick={() => onForce(i + 1)}>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: faces }, (_, i) => i + 1).map((v) => (
              <button key={v} className="cheat-key" disabled={!active} onClick={() => onForce(v)}>
                {v}
              </button>
            ))}
          </div>
        )}
        <button className="cheat-key cheat-key-wide w-full" disabled={!active} onClick={() => onForce(null)}>
          Hasard
        </button>
      </div>
    </section>
  )
}
