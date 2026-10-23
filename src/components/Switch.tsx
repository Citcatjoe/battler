/**
 * Curseur d'interrupteur du jeu (règles du tournoi, panneau du son) : piste ronde, bille or quand c'est actif.
 * Purement visuel (`aria-hidden`) : c'est le bouton qui le porte qui a `role="switch"` et `aria-checked`,
 * pour que toute la ligne (libellé compris) se clique.
 */
export function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative ml-auto h-6 w-11 shrink-0 rounded-full border-2 transition-colors ${on ? 'border-gold-400 bg-gold-500/40' : 'border-line-2 bg-surface-0'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full shadow-(--shadow-2) transition-all duration-150 ${on ? 'left-[22px] bg-gold-300' : 'left-0.5 bg-ink-3'}`}
      />
    </span>
  )
}
