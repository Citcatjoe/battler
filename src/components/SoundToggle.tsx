import { useState } from 'react'
import { isMusicMuted, isMuted, setMusicMuted, setMuted, sfx } from '../game/sound'
import { IconButton } from './kit'

/**
 * Boutons du son, en haut à droite de toutes les scènes : le son entier (effets et musique), et juste
 * dessous la musique seule (0.53.0) ; à côté, il aurait couvert l'en-tête du combat. Couper le son coupe aussi la musique ; le choix de la musique
 * est gardé à part et retrouvé quand le son revient. Bascules du UI kit : « coupé » = glyphe barré, `aria-pressed="false"`.
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
      <IconButton onClick={toggle} icon={muted ? 'son-coupe' : 'son'} label={muted ? 'Activer le son' : 'Couper le son'} pressed={!muted} />
      <IconButton
        onClick={toggleMusic}
        icon={musicSilent ? 'musique-coupee' : 'musique'}
        label={musicMuted ? 'Remettre la musique' : 'Couper la musique'}
        pressed={!musicSilent}
      />
    </div>
  )
}
