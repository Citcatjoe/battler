import type { Character } from '../game/character'
import type { Side } from '../game/combat'

/** Vignette cadrée sur le visage, tournée vers le centre de l'écran selon le camp. */
export function Portrait({
  character,
  side,
  className = '',
}: {
  character: Character
  side: Side
  className?: string
}) {
  const { image, tint, portrait, facing } = character.look
  const flip = facing !== (side === 0 ? 'right' : 'left')
  return (
    <div
      className={`bg-no-repeat ${className}`}
      style={{
        backgroundImage: `url(${image})`,
        backgroundSize: `${portrait.zoom * 100}% auto`,
        backgroundPosition: `${portrait.x}% ${portrait.y}%`,
        transform: flip ? 'scaleX(-1)' : undefined,
        filter: tint,
      }}
    />
  )
}
