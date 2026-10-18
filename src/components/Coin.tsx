import type { CSSProperties } from 'react'
import { Icon } from './Icon'

interface Props {
  /** Absent tant que la pièce tournoie ; ensuite, le côté sur lequel elle est retombée */
  heads?: boolean
  size?: number
}

/**
 * Pièce de Pile ou face (icônes peintes `coin-pile`, aux sabres croisés, et `coin-face`, à tête de
 * lézard) : elle remplace le dé quand la voleuse lance sa pièce. Elle tournoie en l'air, puis
 * retombe et se fige sur le côté tiré (rotation finale : pile devant, face derrière).
 */
export function Coin({ heads, size = 112 }: Props) {
  const flipping = heads === undefined
  const style = { width: size, height: size, '--coin-end': heads === false ? '1980deg' : '1800deg' } as CSSProperties
  return (
    <div className="coin-stage relative" style={{ width: size, height: size }} aria-label="Pièce de Pile ou face">
      <div
        key={flipping ? 'flip' : `land-${heads}`}
        className={`coin relative ${flipping ? 'coin-flipping' : 'coin-landed'}`}
        style={style}
      >
        <div className="coin-side absolute inset-0">
          <Icon name="coin-pile" className="h-full w-full" />
        </div>
        <div className="coin-side absolute inset-0" style={{ transform: 'rotateY(180deg)' }}>
          <Icon name="coin-face" className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}
