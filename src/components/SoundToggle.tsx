import { useEffect, useRef, useState } from 'react'
import { isMusicMuted, isMuted, setMusicMuted, setMuted, sfx } from '../game/sound'
import { IconButton } from './kit'
import { Switch } from './Switch'

/**
 * Le son, en haut à droite de toutes les scènes : un seul bouton rond qui ouvre un petit panneau dessous, avec deux
 * interrupteurs indépendants, « Musique » et « Effets sonores » (couper les effets laisse la musique, et l'inverse).
 * Le glyphe n'est barré que si les deux sont coupés. Le panneau se ferme par le bouton, un clic ailleurs ou Échap.
 * `initialOpen` : panneau ouvert d'emblée (page de développement, capture de référence).
 */
export function SoundToggle({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  const [effectsMuted, setEffectsState] = useState(isMuted)
  const [musicMuted, setMusicState] = useState(isMusicMuted)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    // Échap ferme le panneau seul : il ne remonte pas jusqu'à une fenêtre ouverte dessous (paris)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const rows = [
    {
      label: 'Musique',
      on: !musicMuted,
      toggle: () => {
        setMusicMuted(!musicMuted)
        setMusicState(!musicMuted)
      },
    },
    {
      label: 'Effets sonores',
      on: !effectsMuted,
      toggle: () => {
        setMuted(!effectsMuted)
        setEffectsState(!effectsMuted)
      },
    },
  ]
  const silent = effectsMuted && musicMuted
  return (
    <div ref={rootRef} className="absolute right-4 top-4 z-[60]">
      <IconButton
        icon={silent ? 'son-coupe' : 'son'}
        label="Réglages du son"
        aria-expanded={open}
        aria-controls="sound-panel"
        onClick={() => {
          sfx.click()
          setOpen(!open)
        }}
      />
      {open && (
        <div
          id="sound-panel"
          role="group"
          aria-label="Son"
          className="absolute right-0 top-[60px] flex w-[248px] flex-col rounded-[2px] border border-gold-500/70 bg-surface-1/95 py-2 shadow-(--shadow-3)"
        >
          {rows.map((row) => (
            <button
              key={row.label}
              type="button"
              role="switch"
              aria-checked={row.on}
              onClick={() => {
                row.toggle()
                sfx.click()
              }}
              className="flex h-12 w-full items-center gap-4 px-4 text-left font-body text-[16px] text-ink-1 transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-200 focus-visible:ring-inset"
            >
              {row.label}
              <Switch on={row.on} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
