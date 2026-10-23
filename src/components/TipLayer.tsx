import { createContext, useContext, useRef, useState, type ReactNode } from 'react'

/*
 * Calque des infobulles d'un écran : une infobulle peinte posée en place (`absolute`, au survol de son groupe) est
 * coupée par le cadre d'une liste qui défile. Dans un `TipLayer`, les objets qui le savent (RelicRow, ForgeMark)
 * ouvrent la leur dans ce calque, posé sur tout l'écran, sous ou au-dessus de l'objet survolé : rien ne la coupe.
 */

/** Ouvre une infobulle sous (ou au-dessus de) l'élément survolé ; `null` la ferme. */
type ShowTip = (content: ReactNode | null, anchor?: HTMLElement) => void

const TipContext = createContext<ShowTip | null>(null)

/** Le calque de l'écran englobant, ou null : l'objet ouvre alors son infobulle en place. */
export const useTipLayer = () => useContext(TipContext)

/** Largeur des infobulles peintes (`w-80`), pour les garder dans l'écran. */
const TIP_WIDTH = 320
const GAP = 12
const MARGIN = 8

interface OpenTip {
  content: ReactNode
  left: number
  /** Sous l'objet : distance au haut du calque ; au-dessus : distance à son bas */
  top?: number
  bottom?: number
}

/**
 * Le conteneur d'un écran, à la place de sa `div` racine (`className` compris, qui doit le positionner) : ses enfants,
 * puis le calque, qui le couvre sans capter la souris. L'infobulle s'ouvre sous l'objet dans la moitié haute de
 * l'écran, au-dessus dans la moitié basse.
 */
export function TipLayer({ className, children }: { className: string; children: ReactNode }) {
  const layer = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<OpenTip | null>(null)

  const show: ShowTip = (content, anchor) => {
    const el = layer.current
    if (!content || !anchor || !el) return setTip(null)
    // La scène est mise à l'échelle par `zoom` (Stage) : les rectangles sont à l'échelle de l'écran, le calque non
    const box = el.getBoundingClientRect()
    const scale = box.width / el.offsetWidth || 1
    const a = anchor.getBoundingClientRect()
    const x = (a.left - box.left) / scale
    const top = (a.top - box.top) / scale
    const bottom = (a.bottom - box.top) / scale
    const left = Math.max(MARGIN, Math.min(x, el.offsetWidth - TIP_WIDTH - MARGIN))
    const below = (top + bottom) / 2 < el.offsetHeight / 2
    setTip(below ? { content, left, top: bottom + GAP } : { content, left, bottom: el.offsetHeight - top + GAP })
  }

  return (
    <TipContext.Provider value={show}>
      <div className={className}>
        {children}
        <div ref={layer} className="pointer-events-none absolute inset-0 z-[80]">
          {tip && (
            <div className="absolute" style={{ left: tip.left, top: tip.top, bottom: tip.bottom }}>
              {tip.content}
            </div>
          )}
        </div>
      </div>
    </TipContext.Provider>
  )
}
