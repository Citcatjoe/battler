import type { KeyboardEvent } from 'react'
import homeImg from '../assets/menu-home.jpg'
// Illustrations des arches. Le combat test reprend une arène (son marais est réservé au combat lui-même)
import testArt from '../assets/arena-dwarf-city.jpg'
import duelArt from '../assets/arch-duel.jpg'
import tournamentArt from '../assets/arch-tournament.jpg'
import { Icon } from './Icon'

export type HomeChoice = 'test' | 'duel' | 'tournament'

interface Props {
  onChoose: (choice: HomeChoice) => void
  onOpenRecords: () => void
  onOpenCompendium: () => void
  /** Tournoi en cours : progression affichée sous l'arche « Tournoi » */
  tournamentProgress: string | null
}

interface Item {
  id: HomeChoice
  label: string
  hint: string
  art: string
  /** Cadrage de l'illustration dans l'arche (`preserveAspectRatio` du SVG) */
  focus: string
  /** Mode pas encore jouable : l'arche se choisit, mais ne s'ouvre pas */
  soon?: boolean
}

/** Le triptyque, dans l'ordre affiché. Le Duel est au centre, mais aucune arche n'est mise en avant. */
const ITEMS: Item[] = [
  {
    id: 'test',
    label: 'Combat test',
    hint: 'Choisir chaque dé pour tester les compétences',
    art: testArt,
    focus: 'xMidYMid slice',
  },
  {
    id: 'duel',
    label: 'Duel',
    hint: 'Deux combattants, un seul reste debout',
    art: duelArt,
    focus: 'xMidYMid slice',
  },
  {
    id: 'tournament',
    label: 'Tournoi',
    hint: '16 participants, élimination directe',
    art: tournamentArt,
    focus: 'xMinYMid slice',
  },
]

/** Dimensions des arches : le panneau central domine, les volets sont plus bas et plus étroits. */
const SIZE = { center: { w: 340, h: 470 }, wing: { w: 288, h: 404 } }

/**
 * Contour d'une arche brisée (ogive) de largeur `w` et de hauteur `h`, rentré de `d` px : les deux
 * arcs gardent leurs centres, si bien que chaque couche du cadre est parallèle à la précédente.
 */
function archPath(w: number, h: number, d: number) {
  const r = w * 0.8
  const rise = Math.sqrt(r * r - (r - w / 2) ** 2)
  const spring = rise + 4
  const ri = r - d
  const apex = spring - Math.sqrt(ri * ri - (r - w / 2) ** 2)
  return `M${d},${h - d} V${spring} A${ri},${ri} 0 0 1 ${w / 2},${apex} A${ri},${ri} 0 0 1 ${w - d},${spring} V${h - d} Z`
}

/** Rivets du bandeau de fer, sur les deux montants (à mi-épaisseur du bandeau). */
function rivets(w: number, h: number) {
  const r = w * 0.8
  const spring = Math.sqrt(r * r - (r - w / 2) ** 2) + 4
  const ys: number[] = []
  for (let y = spring; y < h - 20; y += 56) ys.push(y)
  return ys.flatMap((y) => [
    [7.5, y],
    [w - 7.5, y],
  ])
}

export function HomeScreen({ onChoose, onOpenRecords, onOpenCompendium, tournamentProgress }: Props) {
  /** Au clavier, comme un menu de jeu : les flèches passent d'une arche à l'autre, Entrée l'ouvre */
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const arches = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('.arch')]
    const i = arches.indexOf(document.activeElement as HTMLButtonElement)
    const next = i + (e.key === 'ArrowRight' ? 1 : -1)
    arches[Math.max(0, Math.min(arches.length - 1, next))]?.focus()
    e.preventDefault()
  }

  return (
    <div className="fade-in relative isolate flex h-full flex-col items-center justify-center gap-10 pb-6">
      <img
        src={homeImg}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-[50%_55%]"
        style={{ filter: 'brightness(0.7) saturate(0.9)' }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_55%,transparent_15%,rgba(12,10,9,0.75)_100%)]" />

      <button
        onClick={onOpenRecords}
        title="Statistiques"
        aria-label="Statistiques"
        className="btn btn-round absolute left-4 top-4"
      >
        <Icon name="stats" className="btn-icon" />
      </button>
      {/* Accès provisoire au compendium : son intégration définitive reste à définir */}
      <button
        onClick={onOpenCompendium}
        title="Compendium"
        aria-label="Compendium"
        className="btn btn-round absolute left-20 top-4"
      >
        <Icon name="scroll" className="btn-icon" />
      </button>

      <h1 className="font-display text-7xl font-extrabold tracking-[0.12em] text-amber-200 drop-shadow-[0_5px_0_#78350f]">
        BATTLER
      </h1>

      {/* Le triptyque : trois arches de fer forgé sur leur socle, les volets tournés vers le centre */}
      <nav aria-label="Modes de jeu" className="triptych" onKeyDown={onKey}>
        {ITEMS.map((item, i) => (
          <Arch
            key={item.id}
            item={item}
            place={i === 0 ? 'left' : i === ITEMS.length - 1 ? 'right' : 'center'}
            hint={item.id === 'tournament' && tournamentProgress ? `En cours · ${tournamentProgress}` : item.hint}
            // Un clic ouvre le mode ; un mode à venir ne s'ouvre pas
            onClick={() => !item.soon && onChoose(item.id)}
          />
        ))}
      </nav>

      <span className="absolute bottom-2 right-4 font-mono text-xs text-stone-600">v{__APP_VERSION__}</span>
    </div>
  )
}

function Arch({
  item,
  place,
  hint,
  onClick,
}: {
  item: Item
  place: 'left' | 'center' | 'right'
  hint: string
  onClick: () => void
}) {
  const { w, h } = place === 'center' ? SIZE.center : SIZE.wing
  const clip = `arch-clip-${item.id}`
  const shade = `arch-shade-${item.id}`
  const r = w * 0.8
  const apex = 4
  const spring = Math.sqrt(r * r - (r - w / 2) ** 2) + 4
  return (
    <button
      type="button"
      aria-label={`${item.label} : ${hint}`}
      data-place={place}
      data-soon={item.soon || undefined}
      onClick={onClick}
      className="arch"
    >
      <span className="arch-body">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="arch-frame" aria-hidden>
        <defs>
          <clipPath id={clip}>
            <path d={archPath(w, h, 15)} />
          </clipPath>
          <linearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.45" stopColor="#0E0B09" stopOpacity="0" />
            <stop offset="1" stopColor="#0E0B09" stopOpacity="0.92" />
          </linearGradient>
        </defs>
        {/* Cadre : filet de bronze, bandeau de fer forgé, second filet, puis l'illustration */}
        <path d={archPath(w, h, 0)} className="arch-rim" />
        <path d={archPath(w, h, 2)} className="arch-iron" />
        <path d={archPath(w, h, 13)} className="arch-rim arch-rim-inner" />
        <path d={archPath(w, h, 15)} className="arch-void" />
        <g clipPath={`url(#${clip})`}>
          <image href={item.art} x="0" y="0" width={w} height={h} preserveAspectRatio={item.focus} className="arch-art" />
          <rect x="0" y="0" width={w} height={h} fill={`url(#${shade})`} />
        </g>
        {/* Gravure à 10 px du cadre, comme sur les pièces prestige */}
        <path d={archPath(w, h, 25)} className="arch-engrave" />
        {rivets(w, h).map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={2.6} className="arch-rivet" />
        ))}
        {/* Clef de voûte : losange de bronze à cheval sur le bandeau */}
        <path
          d={`M${w / 2},${apex - 6} L${w / 2 + 11},${apex + 8} L${w / 2},${apex + 22} L${w / 2 - 11},${apex + 8} Z`}
          className="arch-key"
        />
        {/* Ressauts : là où l'ogive prend appui sur les montants */}
        <rect x={-3} y={spring - 5} width={19} height={10} className="arch-key" />
        <rect x={w - 16} y={spring - 5} width={19} height={10} className="arch-key" />
      </svg>
      </span>

      {/* Socle : la plaque gravée du titre, plus large que l'arche */}
      <span className="arch-plinth" style={{ width: w + 28 }}>
        <span className="arch-plinth-label">{item.label}</span>
      </span>
      <span className="arch-hint">{item.soon ? 'Bientôt disponible' : hint}</span>
    </button>
  )
}
