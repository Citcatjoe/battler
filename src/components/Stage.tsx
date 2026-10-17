import { useEffect, useState, type ReactNode } from 'react'

/** Résolution de référence du jeu ; tout est mis à l'échelle pour tenir dans la fenêtre en 16:9. */
export const STAGE_WIDTH = 1600
export const STAGE_HEIGHT = 900

const fit = () => Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT)

export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(fit)

  useEffect(() => {
    const onResize = () => setScale(fit())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div className="relative overflow-hidden" style={{ width: STAGE_WIDTH * scale, height: STAGE_HEIGHT * scale }}>
        <div
          className="absolute left-0 top-0 origin-top-left overflow-hidden bg-stone-950"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
