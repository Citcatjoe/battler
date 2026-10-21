import { useState } from 'react'
import { isMusicMuted, isMuted, setMusicMuted, setMuted, sfx } from '../game/sound'
import { Icon } from './Icon'

/**
 * Boutons du son, en haut à droite de toutes les scènes : le son entier (effets et musique), et juste
 * dessous, plus petit, la musique seule (0.53.0) ; à côté, il aurait couvert l'en-tête du combat. Couper le son coupe aussi la musique ; le choix de la musique
 * est gardé à part et retrouvé quand le son revient.
 */
export function SoundToggle() {
  const [muted, setState] = useState(isMuted)
  const [musicMuted, setMusicState] = useState(isMusicMuted)
  const toggle = () => {
    setMuted(!muted)
    setState(!muted)
    if (muted) sfx.click()
  }
  const toggleMusic = () => {
    setMusicMuted(!musicMuted)
    setMusicState(!musicMuted)
    sfx.click()
  }
  const musicSilent = muted || musicMuted
  return (
    <div className="absolute right-4 top-4 z-[60] flex flex-col items-center gap-2">
      <button
        onClick={toggle}
        title={muted ? 'Activer le son' : 'Couper le son'}
        aria-label={muted ? 'Activer le son' : 'Couper le son'}
        className="btn btn-round"
      >
        <Icon name={muted ? 'sound-off' : 'sound-on'} className="btn-icon" />
      </button>
      <button
        onClick={toggleMusic}
        title={musicMuted ? 'Remettre la musique' : 'Couper la musique'}
        aria-label={musicMuted ? 'Remettre la musique' : 'Couper la musique'}
        aria-pressed={musicMuted}
        className="btn btn-round h-10 w-10 [--icon:20px]"
      >
        <Icon name={musicSilent ? 'music-off' : 'music-on'} className="btn-icon" />
      </button>
    </div>
  )
}
