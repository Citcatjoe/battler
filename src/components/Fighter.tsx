import { useEffect, useState, type CSSProperties } from 'react'
import { figureHeight, footDrop, type Character } from '../game/character'
import type { Side } from '../game/combat'
import { TONE_CLASS } from '../game/narration'
import type { Float } from '../game/staging'
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
  /** Aura d'une compétence qui agit, sur son lanceur : sa clé relance l'animation (`EffectFx`) */
  aura?: number
  /** Textes flottants à côté du combattant, chacun avec sa clé (staging.ts, `Float`) : aucun n'en écrase un autre */
  floats?: readonly Float[]
  /** Statuts actifs : aura de personnage, transparence, tremblement, lucioles (voir `statusLooks`) */
  statuses?: readonly Status[]
  /** Forme en cours (druide) : index dans `character.forms` ; un changement joue la métamorphose */
  form?: number
  className?: string
  /**
   * Ancrage d'une image plus large que sa colonne : `center` (défaut) centre la toile sur la colonne ;
   * `body` centre la silhouette (toile à postures plus large que la garde : `look.bodyInset`), pour une carte ;
   * `inside` garde son bord extérieur dans la colonne (près du bord de l'écran) et la fait déborder vers le
   * centre, derrière les panneaux.
   */
  anchor?: 'center' | 'body' | 'inside'
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

export function Fighter({
  character,
  side,
  lunging = false,
  fastLunge = false,
  received,
  state = 'idle',
  aura,
  floats = [],
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
   * Ancrage `body` : la toile est décalée pour que la silhouette, et non la toile, soit au centre de la colonne.
   */
  const insetShift = (look: { bodyInset?: { left: number; right: number } }, flipped: boolean) => {
    if (anchor === 'center' || !look.bodyInset) return ''
    const { left, right } = look.bodyInset
    if (anchor === 'body') return `translateX(${((flipped ? left - right : right - left) / 2) * 100}%)`
    // Vide du côté du bord de l'écran, une fois l'image retournée ou non
    const outer = side === 0 ? (flipped ? right : left) : flipped ? left : right
    return `translateX(${side === 0 ? -outer * 100 : outer * 100}%)`
  }

  // L'esquive démarre avec l'élan. Un coup qui touche montre la posture « coup encaissé », sans plus ;
  // seul un critique repousse aussi le combattant (demande de l'utilisateur, 0.68.x : le recul dit la puissance)
  const reaction = received?.dodged ? 'dodge' : received?.landed && received.crit ? 'knockback' : ''

  // Les effets se placent par rapport à la silhouette, plus petite pour un nain.
  const scale = figureHeight(look)
  const at = (pct: number) => ({ top: `${(1 - scale) * 100 + scale * pct}%` })

  // Posture du moment (docs/POSTURES.md) : élan, esquive, coup encaissé, K.O., victoire
  const pose = poseOf({ state, lunging, received })
  // Sans posture de K.O., l'image bascule (`.ko`) ; avec, la chute est dans l'image. Le grisé passe par le
  // filtre de l'enveloppe de l'image (plus bas), jamais par un conteneur plus petit qu'elle : dans Firefox, un
  // filtre sur un parent coupe l'image qui déborde de la colonne du combattant
  const koClass = look.poses?.ko ? '' : 'ko'
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
  // Contour lumineux de l'aura (couleur --aura, posée sur le combattant) en plus de l'ombre portée.
  // Le grisé du K.O. ouvre toujours la liste (à 0 sinon) : le filtre passe en fondu de l'un à l'autre.
  // Au K.O., l'aura s'éteint : son contour devient transparent (même liste de filtres, donc même fondu)
  const ko = state === 'ko'
  const filter = [
    character.look.tint,
    `grayscale(${ko ? 1 : 0}) brightness(${ko ? 0.5 : 1})`,
    'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
    looks.aura &&
      (ko
        ? 'drop-shadow(0 0 2px transparent) drop-shadow(0 0 12px transparent)'
        : 'drop-shadow(0 0 2px var(--aura)) drop-shadow(0 0 12px var(--aura))'),
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`pointer-events-none relative aspect-[636/1062] h-full ${lunging ? 'z-20' : 'z-10'} ${className}`} style={style}>
      {/* ombre au sol */}
      <div className="absolute bottom-[1%] left-1/2 h-[5%] w-[80%] -translate-x-1/2 rounded-[50%] bg-black/60 blur-md" />
      <div className={`relative h-full ${lunging ? (fastLunge ? 'lunge lunge-fast' : 'lunge') : ''}`}>
        {/* Aura de personnage : halo qui pulse, cercle au sol et particules qui montent ; elle suit l'élan.
            Un combattant vaincu perd son aura : elle s'éteint en fondu (`char-aura-out`) */}
        {looks.aura && (
          <div key={looks.aura.id} className={`char-aura pointer-events-none absolute inset-0 ${ko ? 'char-aura-out' : ''}`}>
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
                // Enveloppe exactement à la taille de l'image : elle porte la position, le filtre (ombre, aura,
                // grisé), l'opacité et les fondus. Le retournement est sur l'image, sous le filtre : dans Firefox,
                // un filtre dans un repère retourné est coupé au bord de l'écran du mauvais côté (l'ours du druide,
                // dont la toile déborde de l'écran, perdait son museau à droite)
                <div
                  key={`${f}-${shown ? morph.key : 'out'}`}
                  // Largeur naturelle, centrée sur les pieds : une image large (ogre, homme-lézard, toile à postures)
                  // n'est plus rétrécie par la colonne, si bien que chacun garde sa vraie carrure
                  className={`absolute bottom-0 transition-[opacity,filter] duration-300 ${
                    anchor === 'inside' ? (side === 0 ? 'left-0' : 'right-0') : 'left-1/2 -translate-x-1/2'
                  } ${morph.key > 0 ? (shown ? 'form-in' : 'form-out') : ''}`}
                  style={{
                    height: `${fLook.scale * 100}%`,
                    // Toile avec du vide sous les pieds (voleuse) : redescendue pour toucher le sol
                    bottom: fLook.footroom ? `${-footDrop(fLook) * 100}%` : undefined,
                    transform: insetShift(fLook, flipOf(f)) || undefined,
                    filter,
                    // Le K.O. grise et estompe l'image en fondu lent ; translucide tant qu'il porte une esquive
                    // imposée (Esquive améliorée)
                    transitionDuration: ko ? '900ms' : undefined,
                    opacity: shown ? (ko ? 0.75 : looks.opacity) : undefined,
                  }}
                >
                  <img
                    src={shown ? poseImage(fLook, pose) : fLook.image}
                    alt={shown ? character.name : ''}
                    draggable={false}
                    className="block h-full w-auto max-w-none select-none"
                    style={flipOf(f) ? { transform: 'scaleX(-1)' } : undefined}
                  />
                </div>
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

      {/* Aura de la compétence : sur le personnage qui la lance, le temps de l'effet. Une relique n'en a pas :
          elle s'annonce sur son sceau, dans l'en-tête */}
      {aura !== undefined && (
        <div key={`aura-${aura}`} className="pointer-events-none absolute inset-0 z-30">
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

      {/* Textes flottants : devant le combattant, du côté de l'adversaire. Chacun vit sa vie (sa clé, sa durée) ;
          ceux d'un même instant se rangent en colonne, ce qui monte avec un coup passe au-dessus de son chiffre */}
      <div className={`pointer-events-none absolute inset-y-0 z-30 w-[250px] ${side === 0 ? 'text-left' : 'text-right'}`} style={column}>
        {floats.map((f) => (
          <div key={f.key} className="absolute inset-0">
            {f.kind === 'title' ? (
              // Nom de la compétence : même texte flottant qu'ESQUIVE ou CRITIQUE, en violet
              <div style={at(4)} className="dodge-text float-text absolute inset-x-0 text-3xl text-violet-300 [-webkit-text-stroke:3px_#2e1065]">
                {f.text} !
                {f.subtitle && <span className="mt-1 block text-xl text-violet-200 [-webkit-text-stroke:2px_#2e1065]">{f.subtitle}</span>}
              </div>
            ) : f.kind === 'badge' ? (
              // Le sens dit gain ou perte de la chose nommée (`Badge.rises`) : un statut gagné monte, même un malus
              <div
                style={f.lift ? at(6 - f.row * 9) : at(30 + f.row * 9)}
                className={`${f.badge.rises ? 'damage-float' : 'damage-sink'} float-text absolute inset-x-0 text-4xl ${TONE_CLASS[f.badge.tone]}`}
              >
                {f.badge.text}
              </div>
            ) : f.dodged ? (
              <div style={at(18)} className="dodge-text float-text absolute inset-x-0 text-4xl text-cyan-200 [-webkit-text-stroke:3px_#164e63]">
                ESQUIVE !
              </div>
            ) : (
              <>
                {f.crit && (
                  <div style={at(12)} className="dodge-text float-text absolute inset-x-0 text-3xl text-amber-300 [-webkit-text-stroke:3px_#78350f]">
                    CRITIQUE !
                  </div>
                )}
                <div
                  style={at(18)}
                  // Les PV perdus tombent ; un critique, lui, jaillit vers le haut (demande de l'utilisateur)
                  className={`${f.crit ? 'damage-float' : 'damage-sink'} float-text absolute inset-x-0 ${
                    f.crit
                      ? 'text-9xl text-amber-400 [-webkit-text-stroke:6px_#451a03]'
                      : `text-red-500 [-webkit-text-stroke:4px_#450a0a] ${f.damage >= 10 ? 'text-7xl' : f.damage >= 7 ? 'text-6xl' : 'text-5xl'}`
                  }`}
                >
                  {/* Un critique tremble sous le choc */}
                  <span className={`inline-block ${f.crit ? 'crit-shake' : ''}`}>-{f.damage}</span>
                </div>
              </>
            )}
          </div>
        ))}
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
