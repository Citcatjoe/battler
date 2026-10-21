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
        {/* `zoom` et non `transform: scale` : la scène est mise en page à la taille de l'écran, au lieu d'être
            peinte en 1600×900 puis agrandie. Sous une échelle fractionnaire (2,4 sur un écran 4K), Firefox
            dessinait un disque arrondi à fond translucide en quatre quartiers, et leurs jointures laissaient
            une croix claire dans les médaillons d'état, les infobulles et les pastilles des parieurs. */}
        <div
          className="absolute left-0 top-0 overflow-hidden bg-stone-950"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, zoom: scale }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
