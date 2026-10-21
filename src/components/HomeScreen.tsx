import type { KeyboardEvent } from 'react'
import gateImg from '../assets/menu-duel.jpg'
import { createCharacter } from '../game/roster'
import { HEDGE_PLANES, HOME_HEDGE, type HedgeSlot } from './homeHedge'
import { Glyph, IconButton, ModePair, ModePairItem, type GlyphName } from './kit'
import { STAGE_HEIGHT, STAGE_WIDTH } from './Stage'

export type HomeChoice = 'test' | 'duel' | 'tournament'

interface Props {
  onChoose: (choice: HomeChoice) => void
  onOpenRecords: () => void
  onOpenCompendium: () => void
  /** Tournoi en cours : progression affichée sous la plaque « Tournoi » */
  tournamentProgress: string | null
}

/** Les deux modes principaux, côte à côte dans la paire de modes du UI kit, dans l'ordre affiché */
const MODES: { id: HomeChoice; label: string; icon: GlyphName }[] = [
  { id: 'duel', label: 'Duel', icon: 'combattre' },
  { id: 'tournament', label: 'Tournoi', icon: 'tournoi' },
]

/**
 * L'accueil : le seuil de l'arène. Une haie de combattants (homeHedge.ts) accompagne le joueur vers la
 * porte et sa lumière ; le logo et le choix du mode sont posés au premier plan, dans l'allée centrale.
 * Duel et Tournoi sont deux choix de même rang, deux plaques d'or dans un même cadre ; Combat test est un lien.
 */
export function HomeScreen({ onChoose, onOpenRecords, onOpenCompendium, tournamentProgress }: Props) {
  /** Au clavier, comme un menu de jeu : les flèches passent d'un mode à l'autre, Entrée l'ouvre */
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const modes = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-mode]')]
    const i = modes.indexOf(document.activeElement as HTMLButtonElement)
    const next = i + (e.key === 'ArrowRight' ? 1 : -1)
    modes[Math.max(0, Math.min(modes.length - 1, next))]?.focus()
    e.preventDefault()
  }

  return (
    <div className="fade-in relative isolate h-full overflow-hidden">
      {/* La porte de l'arène, centrée sur l'allée ; le sol reste dans l'ombre */}
      <img
        src={gateImg}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-[50%_40%]"
        style={{ filter: 'brightness(0.78) saturate(0.95)' }}
      />
      <div className="home-vignette pointer-events-none absolute inset-0 -z-10" />

      {/* La haie : chaque plan plus petit et plus sombre que le précédent */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {HOME_HEDGE.map((slot) => (
          <HedgeFigure key={`${slot.side}-${slot.id}`} slot={slot} />
        ))}
      </div>

      {/* Voile sombre localisé sous le logo et les boutons : la lumière de la porte reste au-dessus */}
      <div className="home-veil pointer-events-none absolute bottom-0 left-1/2 h-[560px] w-[1000px] -translate-x-1/2" />

      <IconButton onClick={onOpenRecords} icon="statistiques" label="Statistiques" className="absolute left-4 top-4" />
      {/* Accès provisoire au compendium : son intégration définitive reste à définir */}
      <IconButton onClick={onOpenCompendium} icon="compendium" label="Compendium" className="absolute left-20 top-4" />

      <nav aria-label="Modes de jeu" onKeyDown={onKey} className="absolute inset-x-0 bottom-[60px] z-10 flex flex-col items-center">
        <h1 className="home-logo font-display text-[96px] font-bold leading-none tracking-[0.08em]">BATTLER</h1>

        {/* Paire de modes du UI kit : deux choix de même rang dans un même cadre */}
        <div className="mt-8">
          <ModePair label="Modes de jeu">
            {MODES.map((m) => (
              <ModePairItem key={m.id} icon={m.icon} data-mode onClick={() => onChoose(m.id)}>
                {m.label}
              </ModePairItem>
            ))}
          </ModePair>
        </div>
        <div className="mode-hints mt-3">
          <span className="home-hint">Deux combattants, un vainqueur</span>
          <span className="home-hint">{tournamentProgress ? `En cours · ${tournamentProgress}` : '16 participants, élimination directe'}</span>
        </div>
      </nav>

      <button
        onClick={() => onChoose('test')}
        title="Choisir chaque dé pour tester les compétences"
        className="home-link absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
      >
        <Glyph name="hasard" size={16} />
        <span>
          Combat test <span className="text-ink-3">· choisir chaque dé</span>
        </span>
      </button>

      <span className="on-illus absolute bottom-2 right-4 z-10 font-mono text-xs text-stone-500">v{__APP_VERSION__}</span>
    </div>
  )
}

/**
 * Un combattant de la haie, en garde, à l'échelle par la hauteur (jamais déformé), ancré bas-centre sur
 * ses pieds (le vide de la toile au-dessus de la tête et sous les pieds est compté), tourné vers l'allée,
 * avec son ombre de contact.
 */
function HedgeFigure({ slot }: { slot: HedgeSlot }) {
  const { look } = createCharacter(slot.id)
  const plane = HEDGE_PLANES[slot.plane]
  const body = slot.height * STAGE_HEIGHT
  const canvas = body / (1 - (look.headroom ?? 0) - (look.footroom ?? 0))
  const flip = look.facing !== (slot.side === 'left' ? 'right' : 'left')
  // Centre de la silhouette dans la toile (source, avant miroir), pour poser le corps et non la toile
  const inset = look.bodyInset ?? { left: 0, right: 0 }
  const shift = (inset.left - inset.right) / 2
  const x = slot.side === 'left' ? slot.x * STAGE_WIDTH : (1 - slot.x) * STAGE_WIDTH
  return (
    <div className="absolute h-0 w-0" style={{ left: x, top: slot.feet * STAGE_HEIGHT, zIndex: plane.z }}>
      <span
        className="hedge-shadow"
        style={{ width: body * 0.62, height: body * 0.08, opacity: 0.55 + 0.45 * plane.brightness }}
      />
      <img
        src={look.image}
        alt=""
        draggable={false}
        className="absolute left-0 max-w-none select-none"
        style={{
          height: canvas,
          bottom: -(look.footroom ?? 0) * canvas,
          transform: `translateX(${(-0.5 - (flip ? -shift : shift)) * 100}%) scaleX(${flip ? -1 : 1})`,
          filter: [look.tint, `brightness(${plane.brightness}) saturate(${plane.saturate})`].filter(Boolean).join(' '),
        }}
      />
    </div>
  )
}
