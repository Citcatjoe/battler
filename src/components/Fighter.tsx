import { useEffect, useState, type CSSProperties } from 'react'
import { figureHeight, footDrop, type Character } from '../game/character'
import type { AppliedEffect, Side } from '../game/combat'
import { atCap, effectBadge, TONE_CLASS } from '../game/narration'
import { isAura, STATUSES, type Status } from '../game/statuses'
import { poseImage, poseImages, poseOf } from '../game/poses'

/** Ce que le combattant subit pendant le coup en cours. */
export interface Received {
  key: number
  damage: number
  crit: boolean
  dodged: boolean
  /** false pendant l'élan de l'attaquant, true une fois le coup arrivé */
  landed: boolean
}

interface Props {
  character: Character
  /** 0 = à gauche, regarde à droite ; 1 = à droite, regarde à gauche */
  side: Side
  lunging?: boolean
  /** Élan raccourci, pour les coups en rafale (Furie des vents) */
  fastLunge?: boolean
  received?: Received
  state?: 'idle' | 'ko' | 'victory'
  /** Effets en cours d'affichage : titre et aura si ce combattant en est la source, badges s'il est visé */
  fx?: { key: number; source: Side | null; title: string; effects: AppliedEffect[] }
  /** Statuts actifs : aura de personnage, transparence, tremblement, lucioles (voir `statusLooks`) */
  statuses?: readonly Status[]
  /** Forme en cours (druide) : index dans `character.forms` ; un changement joue la métamorphose */
  form?: number
  className?: string
  /**
   * Ancrage d'une image plus large que sa colonne : `center` (défaut) la centre sur les pieds ;
   * `inside` garde son bord extérieur dans la colonne (près du bord de l'écran) et la fait déborder vers le
   * centre, derrière les panneaux.
   */
  anchor?: 'center' | 'inside'
}

/**
 * Rappel visuel des statuts actifs, d'après leur `look` (registre). Une seule lumière sur le modèle :
 * celle de son aura de personnage (posée sur un 3), jamais un cumul de halos. Le reste : transparence
 * (esquive) et tremblement (peur).
 */
function statusLooks(statuses: readonly Status[]) {
  const looks = statuses.flatMap((s) => (STATUSES[s.id].look ? [{ id: s.id, ...STATUSES[s.id].look }] : []))
  const aura = statuses.find((s) => isAura(s.id))
  return {
    aura: aura && { id: aura.id, color: STATUSES[aura.id].look!.aura! },
    opacity: Math.min(1, ...looks.map((l) => l.opacity ?? 1)),
    tremble: looks.some((l) => l.motion === 'tremble'),
    // Lucioles : une par charge (cinq au plus), qui tournent autour du porteur
    fireflies: Math.min(5, statuses.filter((s) => STATUSES[s.id].look?.motion === 'fireflies').reduce((n, s) => n + s.stacks, 0)),
  }
}

/** Orbites des lucioles : rayon, durée et départ fixes (aucun hasard dans l'affichage). */
const FIREFLIES = [
  { r: 46, dur: 3.2, delay: 0, top: 30 },
  { r: 38, dur: 2.6, delay: -1.1, top: 42 },
  { r: 52, dur: 3.8, delay: -2.3, top: 24 },
  { r: 34, dur: 2.9, delay: -0.6, top: 52 },
  { r: 44, dur: 3.5, delay: -1.8, top: 36 },
]

/** Feuilles de la métamorphose : angle et distance de chaque feuille qui s'envole. */
const LEAVES = Array.from({ length: 14 }, (_, k) => ({ angle: (360 / 14) * k + (k % 2) * 11, dist: 120 + (k % 4) * 28, delay: (k % 5) * 0.03 }))

/** Retient la forme précédente pour le fondu ; `key` change à chaque métamorphose. */
function useFormChange(form: number) {
  const [state, setState] = useState({ form, prev: form, key: 0 })
  if (form !== state.form) setState({ form, prev: state.form, key: state.key + 1 })
  return state
}

/** Particules de l'aura : positions et délais fixes (aucun hasard dans l'affichage). */
const MOTES = [
  { left: 18, delay: 0, size: 6 },
  { left: 34, delay: 1.1, size: 4 },
  { left: 50, delay: 0.5, size: 7 },
  { left: 63, delay: 1.7, size: 5 },
  { left: 78, delay: 0.9, size: 6 },
  { left: 42, delay: 2.3, size: 4 },
]

/**
 * Garde la dernière valeur reçue (repérée par sa clé) quand l'écran l'efface : les textes flottants
 * finissent leur animation, plus longue que le coup lui-même, au lieu d'être coupés net.
 */
function useLast<T extends { key: number }>(value: T | undefined): T | undefined {
  const [last, setLast] = useState(value)
  if (value !== undefined && value.key !== last?.key) setLast(value)
  return value ?? last
}

export function Fighter({
  character,
  side,
  lunging = false,
  fastLunge = false,
  received,
  state = 'idle',
  fx,
  statuses = [],
  form = 0,
  className = '',
  anchor = 'center',
}: Props) {
  const morph = useFormChange(form)
  const look = character.lookFor(form)
  const style = { '--dir': side === 0 ? 1 : -1 } as CSSProperties
  const looks = statusLooks(statuses)
  if (looks.aura) Object.assign(style, { '--aura': looks.aura.color })
  const wantsFacing = side === 0 ? 'right' : 'left'
  const flipOf = (f: number) => character.lookFor(f).facing !== wantsFacing
  /**
   * Ancrage `inside` : la toile est poussée vers le bord de l'écran du vide qui entoure la garde de ce
   * côté (`look.bodyInset`), pour que ce soit la silhouette, et non la toile, qui touche le bord.
   */
  const insetShift = (look: { bodyInset?: { left: number; right: number } }, flipped: boolean) => {
    if (anchor !== 'inside' || !look.bodyInset) return ''
    const { left, right } = look.bodyInset
    // Vide du côté du bord de l'écran, une fois l'image retournée ou non
    const outer = side === 0 ? (flipped ? right : left) : flipped ? left : right
    return `translateX(${side === 0 ? -outer * 100 : outer * 100}%)`
  }

  // L'esquive démarre avec l'élan, le recul n'arrive qu'à l'impact.
  const reaction = received?.dodged ? 'dodge' : received?.landed ? 'hit' : ''

  // Les effets se placent par rapport à la silhouette, plus petite pour un nain.
  const scale = figureHeight(look)
  const at = (pct: number) => ({ top: `${(1 - scale) * 100 + scale * pct}%` })

  // Textes flottants : à l'extérieur de la silhouette (à gauche du combattant de gauche, à droite de
  // celui de droite), sur le décor, plus lisible que sur le personnage. Ils survivent à l'effacement du coup.
  const shownFx = useLast(fx)
  const hit = useLast(received?.landed ? received : undefined)
  const isSource = shownFx !== undefined && shownFx.source === side
  /*
   * Un seul texte par événement : le nom de la compétence (violet) sur son lanceur suffit pour le
   * statut qu'elle lui pose (bonus, ou malus qu'il s'inflige : l'Attente de l'ogre) (Aura de puissance pose Aura de puissance). Un bonus d'un autre nom
   * (Œil de faucon pose Critique assuré) devient le sous-titre du nom, au lieu d'un second texte.
   * Restent des badges : PV, dégâts, malus posés, résistances (voir `TONE_CLASS`).
   */
  const mine = shownFx?.effects.filter((e) => e.target === side) ?? []
  const echoes = isSource && shownFx.title
    ? mine.filter((e) => e.type === 'applyStatus' && e.result.kind === 'applied' && !atCap(e))
    : []
  const subtitle = [...new Set(echoes.flatMap((e) => (e.type === 'applyStatus' ? [STATUSES[e.status].name] : [])))]
    .filter((name) => name !== shownFx?.title)
    .join(' · ')
  const badges = mine.filter((e) => !echoes.includes(e)).map(effectBadge)

  // Posture du moment (docs/POSTURES.md) : élan, esquive, coup encaissé, K.O., victoire
  const pose = poseOf({ state, lunging, received })
  // Une vraie posture de K.O. (à terre) garde le grisé de l'animation, sans la bascule
  const koClass = look.poses?.ko ? 'ko-posed' : 'ko'
  // Précharge les postures : changer d'image ne doit pas clignoter au premier élan
  const allImages = (character.forms ?? [null]).flatMap((_, f) => poseImages(character.lookFor(f))).join('|')
  useEffect(() => {
    for (const src of allImages.split('|')) if (src) new Image().src = src
  }, [allImages])
  // Textes flottants devant le combattant, du côté de l'adversaire (essai demandé par l'utilisateur : l'œil
  // reste près du centre, où tombent les dés, au lieu d'aller chercher le texte derrière le personnage)
  const column = {
    [side === 0 ? 'left' : 'right']: '78%',
    '--float-x': '0',
    '--float-origin': side === 0 ? 'left' : 'right',
  } as CSSProperties
  // Contour lumineux de l'aura (couleur --aura, posée sur le combattant) en plus de l'ombre portée
  const filter = [
    character.look.tint,
    'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
    looks.aura && 'drop-shadow(0 0 2px var(--aura)) drop-shadow(0 0 12px var(--aura))',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`pointer-events-none relative aspect-[636/1062] h-full ${lunging ? 'z-20' : 'z-10'} ${className}`} style={style}>
      {/* ombre au sol */}
      <div className="absolute bottom-[1%] left-1/2 h-[5%] w-[80%] -translate-x-1/2 rounded-[50%] bg-black/60 blur-md" />
      <div className={`relative h-full ${lunging ? (fastLunge ? 'lunge lunge-fast' : 'lunge') : ''}`}>
        {/* Aura de personnage : halo qui pulse, cercle au sol et particules qui montent ; elle suit l'élan */}
        {looks.aura && (
          <div key={looks.aura.id} className="char-aura pointer-events-none absolute inset-0">
            <div className="char-aura-halo absolute bottom-[2%] left-1/2 w-[110%] rounded-[50%] blur-xl" style={{ height: `${scale * 96}%` }} />
            <div className="char-aura-ring absolute bottom-[0.5%] left-1/2 h-[7%] w-[86%] rounded-[50%]" />
            {MOTES.map((m, k) => (
              <span
                key={k}
                className="char-aura-mote absolute bottom-[4%] rounded-full"
                style={{ left: `${m.left}%`, width: m.size, height: m.size, animationDelay: `${m.delay}s` }}
              />
            ))}
          </div>
        )}
        <div className={`relative h-full ${reaction}`}>
          {/* La Peur fait trembler ce conteneur, pas l'image : l'image est centrée sur ses pieds par sa propriété
              `translate`, qu'une animation sur elle écrasait (le combattant sautait d'une demi-largeur) */}
          <div className={`relative h-full ${looks.tremble ? 'status-tremble' : ''}`}>
          <div className={`relative h-full ${state === 'ko' ? koClass : state === 'victory' ? 'victory' : ''}`}>
            {/* Une silhouette par forme (une seule sans formes) : fondu de l'ancienne vers la nouvelle */}
            {(character.forms ?? [null]).map((_, f) => {
              const shown = f === form
              const leaving = morph.key > 0 && f === morph.prev && !shown
              if (!shown && !leaving) return null
              const fLook = character.lookFor(f)
              return (
                <img
                  key={`${f}-${shown ? morph.key : 'out'}`}
                  src={shown ? poseImage(fLook, pose) : fLook.image}
                  alt={shown ? character.name : ''}
                  draggable={false}
                  // Largeur naturelle, centrée sur les pieds : une image large (ogre, homme-lézard, toile à postures)
                  // n'est plus rétrécie par la colonne, si bien que chacun garde sa vraie carrure
                  className={`absolute bottom-0 select-none object-contain object-bottom transition-[opacity,filter] duration-300 ${
                    anchor === 'inside'
                        ? `w-auto max-w-none ${side === 0 ? 'left-0' : 'right-0'}`
                        : 'left-1/2 w-auto max-w-none -translate-x-1/2'
                  } ${morph.key > 0 ? (shown ? 'form-in' : 'form-out') : ''}`}
                  style={{
                    height: `${fLook.scale * 100}%`,
                    // Toile avec du vide sous les pieds (voleuse) : redescendue pour toucher le sol
                    bottom: fLook.footroom ? `${-footDrop(fLook) * 100}%` : undefined,
                    transform: [insetShift(fLook, flipOf(f)), flipOf(f) ? 'scaleX(-1)' : ''].filter(Boolean).join(' ') || undefined,
                    filter,
                    // Translucide tant qu'il porte une esquive imposée (Esquive améliorée)
                    opacity: shown ? looks.opacity : undefined,
                  }}
                />
              )
            })}
          </div>
          </div>
        </div>
        {/* Lucioles (Luciole) : elles tournent autour du porteur et le trahissent */}
        {looks.fireflies > 0 && (
          <div className="pointer-events-none absolute inset-0">
            {FIREFLIES.slice(0, looks.fireflies).map((f, k) => (
              <div
                key={k}
                className="firefly-orbit absolute left-1/2"
                style={{ top: `${(1 - scale) * 100 + scale * f.top}%`, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
              >
                <span className="firefly absolute block rounded-full" style={{ left: `${f.r * 2.2}px` }} />
              </div>
            ))}
          </div>
        )}
        {/* Métamorphose : éclair de sève et feuilles qui s'envolent, à chaque changement de forme */}
        {morph.key > 0 && (
          <div key={`morph-${morph.key}`} className="pointer-events-none absolute inset-0 z-[25]">
            <div className="morph-flash absolute left-1/2 aspect-square w-[150%] rounded-full" style={at(50)} />
            {LEAVES.map((l, k) => (
              <span
                key={k}
                className="morph-leaf absolute left-1/2"
                style={{ ...at(55), '--a': `${l.angle}deg`, '--d': `${l.dist}px`, animationDelay: `${l.delay}s` } as CSSProperties}
              />
            ))}
          </div>
        )}
      </div>

      {/* Aura de la compétence : sur le personnage qui la lance, le temps de l'effet */}
      {fx && fx.source === side && (
        <div key={`aura-${fx.key}`} className="pointer-events-none absolute inset-0 z-30">
          <div
            style={at(45)}
            className="event-aura absolute left-1/2 aspect-square w-[130%] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.55)_0%,rgba(167,139,250,0.15)_45%,transparent_70%)]"
          />
        </div>
      )}

      {/* Étoile d'impact : sur le personnage, le temps du coup */}
      {received?.landed && !received.dodged && (
        <div key={`star${received.key}`} className="pointer-events-none absolute inset-0 z-30">
          <ImpactStar size={received.crit ? 'crit' : received.damage >= 8 ? 'big' : 'normal'} style={at(38)} />
        </div>
      )}

      <div className={`pointer-events-none absolute inset-y-0 z-30 w-[250px] ${side === 0 ? 'text-left' : 'text-right'}`} style={column}>
        {shownFx && (isSource || badges.length > 0) && (
          <div key={`fx-${shownFx.key}`} className="absolute inset-0">
            {isSource && shownFx.title && (
              // Nom de la compétence : même texte flottant qu'ESQUIVE ou CRITIQUE, en violet
              <div style={at(4)} className="dodge-text float-text absolute inset-x-0 text-3xl text-violet-300 [-webkit-text-stroke:3px_#2e1065]">
                {shownFx.title} !
                {subtitle && <span className="mt-1 block text-xl text-violet-200 [-webkit-text-stroke:2px_#2e1065]">{subtitle}</span>}
              </div>
            )}
            {badges.map((badge, i) => (
              <div key={i} style={at(30 + i * 9)} className={`damage-float float-text absolute inset-x-0 text-4xl ${TONE_CLASS[badge.tone]}`}>
                {badge.text}
              </div>
            ))}
          </div>
        )}

        {hit && (
          <div key={`fx${hit.key}`} className="absolute inset-0">
            {hit.dodged ? (
              <div style={at(18)} className="dodge-text float-text absolute inset-x-0 text-4xl text-cyan-200 [-webkit-text-stroke:3px_#164e63]">
                ESQUIVE !
              </div>
            ) : (
              <>
                {hit.crit && (
                  <div style={at(12)} className="dodge-text float-text absolute inset-x-0 text-3xl text-amber-300 [-webkit-text-stroke:3px_#78350f]">
                    CRITIQUE !
                  </div>
                )}
                <div
                  style={at(18)}
                  className={`damage-float float-text absolute inset-x-0 ${
                    hit.crit
                      ? 'text-9xl text-amber-400 [-webkit-text-stroke:6px_#451a03]'
                      : `text-red-500 [-webkit-text-stroke:4px_#450a0a] ${hit.damage >= 10 ? 'text-7xl' : hit.damage >= 7 ? 'text-6xl' : 'text-5xl'}`
                  }`}
                >
                  {/* Un critique tremble sous le choc */}
                  <span className={`inline-block ${hit.crit ? 'crit-shake' : ''}`}>-{hit.damage}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ImpactStar({ size, style }: { size: 'normal' | 'big' | 'crit'; style: CSSProperties }) {
  const spikes = size === 'crit' ? 16 : 12
  const points = Array.from({ length: spikes * 2 }, (_, i) => {
    const r = i % 2 === 0 ? 50 : 22
    const a = (Math.PI * i) / spikes
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`
  }).join(' ')
  const width = { normal: 'w-[70%]', big: 'w-[95%]', crit: 'w-[125%]' }[size]
  return (
    <svg viewBox="0 0 100 100" style={style} className={`impact absolute left-1/2 ${width}`}>
      <polygon
        points={points}
        fill={size === 'crit' ? '#fbbf24' : '#fde047'}
        stroke={size === 'crit' ? '#dc2626' : '#f97316'}
        strokeWidth="3"
      />
      <circle cx="50" cy="50" r={size === 'crit' ? 18 : 14} fill="#fff" />
    </svg>
  )
}
