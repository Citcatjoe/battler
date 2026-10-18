import { useState } from 'react'
import { isMuted, setMuted, sfx } from '../game/sound'
import { Icon } from './Icon'

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
      className="btn btn-round absolute right-4 top-4 z-[60]"
    >
      <Icon name={muted ? 'sound-off' : 'sound-on'} className="btn-icon" />
    </button>
  )
}
