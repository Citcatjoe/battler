/**
 * Sceau « VS » (design system, pièce prestige) : octogone de 96 px, coupe de 28 px, cadre
 * --gold-500, jour sombre, plaque --bg-1 et gravure d'or (.vs-seal de index.css). Purement
 * décoratif. Une animation d'entrée (.vs-slam) se pose sur un parent, jamais sur le sceau.
 */
export function VsSeal({ className = '' }: { className?: string }) {
  return (
    <span className={`vs-seal ${className}`} role="img" aria-label="Contre">
      <span className="vs-seal-plate" aria-hidden>
        {/* Cinzel réserve la place des jambages : sans correction, les capitales sont 0,05 em trop haut */}
        <span className="translate-y-[0.05em]">VS</span>
      </span>
    </span>
  )
}
