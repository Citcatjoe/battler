import { useState } from 'react'
import { isMuted, setMuted, sfx } from '../game/sound'

export function SoundToggle() {
  const [muted, setState] = useState(isMuted)
  const toggle = () => {
    setMuted(!muted)
    setState(!muted)
    if (muted) sfx.click()
  }
  return (
    <button
      onClick={toggle}
      title={muted ? 'Activer le son' : 'Couper le son'}
      aria-label={muted ? 'Activer le son' : 'Couper le son'}
      className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-stone-900/80 text-lg backdrop-blur hover:bg-stone-800"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
