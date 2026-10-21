import type { CSSProperties, ReactNode } from 'react'
import { SCENE_EVENTS, type SceneEventId } from '../game/scenes'
import type { SceneFx } from '../game/staging'

/*
 * Événements de scène (0.73.0) : le rendu des `scene` des compétences (rythme dans game/scenes.ts).
 * Chaque événement a deux parties, toutes deux facultatives :
 * - `Backdrop` : sur toute l'arène, sous les combattants (assombrir, teinter), avec un éclat par-dessus ;
 * - `OnTarget` : posé dans la colonne de la cible, au-dessus d'elle (l'éclair qui la frappe).
 * Les animations lisent `--scene-length` et `--speed` : elles suivent la vitesse et la pause du combat.
 * Ajouter un événement : son rythme dans SCENE_EVENTS, ses deux parties dans SCENE_VIEWS.
 */

interface SceneView {
  Backdrop?: (props: { scene: SceneFx }) => ReactNode
  OnTarget?: (props: { scene: SceneFx }) => ReactNode
}

/** Hasard d'affichage stable pour un même événement (la clé) : jamais de Math.random à l'écran. */
function jitter(seed: number) {
  let s = (seed * 2654435761) % 4294967296
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/** Un éclair en zigzag de (x0, 0) à (x1, h), en `steps` segments ; renvoie le tracé SVG. */
function boltPath(rand: () => number, x0: number, x1: number, y0: number, h: number, steps: number, swing: number) {
  const points: [number, number][] = [[x0, y0]]
  for (let k = 1; k < steps; k++) {
    const t = k / steps
    points.push([x0 + (x1 - x0) * t + (rand() - 0.5) * swing, y0 + (h - y0) * t])
  }
  points.push([x1, h])
  return { d: points.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '), points }
}

const BOLT_W = 220
const BOLT_H = 900
/** Vie d'un éclair à l'écran (ms à ×1) ; il frappe à 38 % de sa vie (keyframes `scene-bolt`) */
const BOLT_LIFE = 640
const BOLT_PEAK = BOLT_LIFE * 0.38
/** Où tombe chaque éclair autour de la cible : décalage horizontal (px) et hauteur de l'impact */
const BOLT_SPOTS = [
  { dx: -85, bottom: '46%' },
  { dx: 75, bottom: '33%' },
  { dx: 0, bottom: '39%' },
]

/** Rythme d'un éclair : il frappe à l'impact `at` (ms depuis le début de l'événement) */
const boltStyle = (at: number): CSSProperties =>
  ({ '--scene-length': `${BOLT_LIFE}ms`, animationDelay: `calc(${at - BOLT_PEAK}ms / var(--speed))` }) as CSSProperties

function Bolt({ seed, at, dx, bottom }: { seed: number; at: number; dx: number; bottom: string }) {
  const rand = jitter(seed)
  const main = boltPath(rand, BOLT_W / 2 + (rand() - 0.5) * 60, BOLT_W / 2, 0, BOLT_H, 14, 70)
  // Deux branches qui partent du tronc et s'éteignent dans le vide
  const forks = [4, 8].map((at, k) => {
    const [x, y] = main.points[at]
    return boltPath(rand, x, x + (k ? 1 : -1) * (40 + rand() * 40), y, y + 140 + rand() * 80, 5, 30).d
  })
  const style = boltStyle(at)
  return (
    <div
      aria-hidden
      className="scene-bolt pointer-events-none absolute left-1/2 z-[20] -translate-x-1/2"
      style={{ width: BOLT_W, height: BOLT_H, bottom, marginLeft: dx, ...style }}
    >
      <svg viewBox={`0 0 ${BOLT_W} ${BOLT_H}`} width={BOLT_W} height={BOLT_H} className="overflow-visible">
        <defs>
          <filter id={`bolt-glow-${seed}`} x="-50%" y="-5%" width="200%" height="110%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={main.d} stroke="#38bdf8" strokeWidth={22} opacity={0.55} filter={`url(#bolt-glow-${seed})`} />
          {forks.map((d) => (
            <path key={d} d={d} stroke="#7dd3fc" strokeWidth={5} opacity={0.7} />
          ))}
          <path d={main.d} stroke="#bae6fd" strokeWidth={8} />
          <path d={main.d} stroke="#ffffff" strokeWidth={3} />
          {forks.map((d) => (
            <path key={`core-${d}`} d={d} stroke="#ffffff" strokeWidth={1.5} />
          ))}
        </g>
      </svg>
      {/* L'impact : une boule de lumière qui éclate où il tombe */}
      <div className="scene-bolt-impact absolute bottom-[-40px] left-1/2 h-[180px] w-[180px] -translate-x-1/2 rounded-full" style={style} />
    </div>
  )
}

/** Un éclair par impact (SCENE_EVENTS.lightning), chacun à sa place autour de la cible */
function LightningBolts({ scene }: { scene: SceneFx }) {
  return SCENE_EVENTS.lightning.impacts.map((at, k) => {
    const spot = BOLT_SPOTS[k % BOLT_SPOTS.length]
    return <Bolt key={k} seed={scene.key * 7 + k + 1} at={at} dx={spot.dx} bottom={spot.bottom} />
  })
}

function LightningBackdrop() {
  const { impacts, length } = SCENE_EVENTS.lightning
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* L'arène s'assombrit sous un ciel d'orage, puis chaque éclair la blanchit un instant */}
      <div className="scene-dark absolute inset-0" style={{ '--scene-length': `${length}ms` } as CSSProperties} />
      {impacts.map((at) => (
        <div key={at} className="scene-flash absolute inset-0 z-[35]" style={boltStyle(at)} />
      ))}
    </div>
  )
}

const SCENE_VIEWS: Record<SceneEventId, SceneView> = {
  lightning: { Backdrop: LightningBackdrop, OnTarget: LightningBolts },
}

/** Partie de l'événement sur toute l'arène (à placer après le décor, avant les combattants). */
export function SceneBackdrop({ scene }: { scene: SceneFx }) {
  const View = SCENE_VIEWS[scene.id].Backdrop
  return View ? <View key={scene.key} scene={scene} /> : null
}

/** Partie de l'événement posée sur la cible (à placer dans la colonne du combattant visé). */
export function SceneOnTarget({ scene }: { scene: SceneFx }) {
  const View = SCENE_VIEWS[scene.id].OnTarget
  return View ? <View key={scene.key} scene={scene} /> : null
}
