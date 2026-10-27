import type { CSSProperties } from 'react'
import { STATUSES, type StatusId } from '../game/statuses'
import { Icon } from './Icon'

interface Props {
  /** Absent tant que la pièce tournoie ; ensuite, le côté sur lequel elle est retombée */
  heads?: boolean
  /** Le statut de la pièce lancée (Pile ou face, Pièce porte-bonheur…) : il choisit sa teinte ; sans lui, l'or de Pile ou face */
  status?: StatusId
  size?: number
}

/**
 * Pièce de la Fortune (icônes peintes `coin-pile`, aux sabres croisés, et `coin-face`, à tête de
 * lézard) : elle remplace le dé quand le lanceur lance sa pièce. Elle tournoie en l'air, puis
 * retombe et se fige sur le côté tiré (rotation finale : pile devant, face derrière). Chaque pièce a
 * sa teinte (`look.coin` de son statut, retour du 2026-10-27), pour qu'on les distingue en l'air.
 */
export function Coin({ heads, status, size = 112 }: Props) {
  const flipping = heads === undefined
  const style = { width: size, height: size, '--coin-end': heads === false ? '1980deg' : '1800deg' } as CSSProperties
  const tint = status ? STATUSES[status].look?.coin : undefined
  const face = tint ? { filter: tint } : undefined
  return (
    <div className="coin-stage relative" style={{ width: size, height: size }} aria-label={status ? STATUSES[status].name : 'Pièce de Pile ou face'}>
      <div
        key={flipping ? 'flip' : `land-${heads}`}
        className={`coin relative ${flipping ? 'coin-flipping' : 'coin-landed'}`}
        style={style}
      >
        <div className="coin-side absolute inset-0" style={face}>
          <Icon name="coin-pile" className="h-full w-full" />
        </div>
        <div className="coin-side absolute inset-0" style={{ ...face, transform: 'rotateY(180deg)' }}>
          <Icon name="coin-face" className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}
