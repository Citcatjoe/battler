import { useEffect, useRef } from 'react'
import type { Character } from '../game/character'
import { SIDE_STYLE, type Pair } from '../game/combat'
import type { CheatState } from '../game/useCombat'

interface Props {
  cheat: CheatState
  fighters: Pair<Character>
  onForce: (value: number | null) => void
  onClose: () => void
  /** Position verticale : au-dessus du journal s'il est ouvert */
  bottom: number
}

/** Le plus gros dé du jeu : le pavé montre toujours ces touches, celles hors du dé sont grisées. */
const KEYS = Array.from({ length: 10 }, (_, i) => i + 1)

/**
 * Mode triche (outil d'observation) : impose la valeur du prochain dé qui sera lancé à l'écran.
 * Le combat est alors résolu à nouveau par le moteur (`forcedRolls`) ; il est exclu des statistiques.
 * Clavier, panneau ouvert : 1 à 9, 0 pour 10, P et F pour la pièce, Retour arrière pour rendre le dé au hasard.
 */
export function CheatPad({ cheat, fighters, onForce, onClose, bottom }: Props) {
  const { next, forced } = cheat
  const usable = cheat.available && next !== undefined

  const keyRef = useRef((_: KeyboardEvent) => {})
  keyRef.current = (e) => {
    if (!usable || e.ctrlKey || e.metaKey || e.altKey) return
    const k = e.key.toLowerCase()
    if (next.coin && (k === 'p' || k === 'f')) onForce(k === 'p' ? 1 : 2)
    else if (!next.coin && /^[0-9]$/.test(k)) {
      const v = k === '0' ? 10 : Number(k)
      if (v <= next.faces) onForce(v)
    } else if (k === 'backspace' || k === 'delete') onForce(null)
    else return
    e.preventDefault()
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const who = next ? fighters[next.side] : undefined
  return (
    <section aria-label="Mode triche" className="cheat-panel absolute left-1/2 z-[46] w-[340px] -translate-x-1/2" style={{ bottom }}>
      <header className="cheat-head">
        <span>Cheat · dé imposé</span>
        <button onClick={onClose} title="Fermer (C)" aria-label="Fermer le mode triche" className="cheat-close">
          ✕
        </button>
      </header>

      <div className="px-4 pb-4 pt-3">
        <p className="mb-3 flex items-baseline justify-between font-mono text-[12px] text-stone-400">
          <span>Prochain dé</span>
          {!cheat.available ? (
            <span>indisponible (combat sans graine)</span>
          ) : next && who ? (
            <span>
              <span className="font-bold" style={{ color: SIDE_STYLE[next.side].hex }}>
                {who.name}
              </span>{' '}
              · {next.coin ? 'pièce' : `d${next.faces}`}
            </span>
          ) : (
            <span>aucun, le combat s'achève</span>
          )}
        </p>

        {next?.coin ? (
          <div className="grid grid-cols-2 gap-2">
            {(['Pile', 'Face'] as const).map((label, i) => (
              <button key={label} className="cheat-key" aria-pressed={forced === i + 1} disabled={!usable} onClick={() => onForce(i + 1)}>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {KEYS.map((v) => (
              <button
                key={v}
                className="cheat-key"
                aria-pressed={forced === v}
                disabled={!usable || v > (next?.faces ?? 0)}
                onClick={() => onForce(v)}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-mono text-[12px] leading-tight text-stone-400">
            {forced !== undefined ? (
              <>
                Imposé : <b className="text-fuchsia-300">{next?.coin ? (forced === 1 ? 'pile' : 'face') : forced}</b>
              </>
            ) : (
              'Au hasard'
            )}
            {cheat.count > 0 && (
              <span className="block text-stone-500">
                {cheat.count} dé{cheat.count > 1 ? 's' : ''} imposé{cheat.count > 1 ? 's' : ''} · hors statistiques
              </span>
            )}
          </span>
          <button className="cheat-key cheat-key-wide" disabled={!usable || forced === undefined} onClick={() => onForce(null)}>
            Hasard
          </button>
        </div>
      </div>
    </section>
  )
}
