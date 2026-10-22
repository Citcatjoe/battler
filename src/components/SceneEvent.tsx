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

/* ---------- Reliques élémentaires (0.85.0, docs/RELIQUES.md § 12) ----------
 * Même grammaire que la Foudre : un fond sur l'arène et une marque sur la cible, tout en SVG et en CSS. Chaque élément
 * qui frappe a sa propre vie (`*_LIFE`) et touche à une part fixe de celle-ci (`*_PEAK`, le pic de ses keyframes) ;
 * son retard (`--scene-delay`, hérité par ses morceaux) le cale sur son impact. Les scènes sur le porteur (givre, roche)
 * vivent sur toute la durée de l'événement : leurs keyframes placent l'éclatement à la part de `impacts[0]`.
 */

/** Rythme d'un élément qui frappe à l'impact `at` : sa vie, et le retard qui place son pic sur l'impact (hérité) */
const strikeStyle = (at: number, life: number, peak: number): CSSProperties =>
  ({ '--scene-length': `${life}ms`, '--scene-delay': `calc(${at - life * peak}ms / var(--speed))` }) as CSSProperties

/** Vers où va ce qui part du lanceur : +1 vers la droite (il est à gauche), −1 vers la gauche */
const dirOf = (scene: SceneFx) => (scene.source === 0 ? 1 : -1)

/** Des particules semées une fois par événement : position, taille, retard, dérive (jamais de Math.random) */
function sow<T>(seed: number, n: number, make: (rand: () => number, k: number) => T): T[] {
  const rand = jitter(seed)
  return Array.from({ length: n }, (_, k) => make(rand, k))
}

/* Feu : Pluie de braises (Braise captive) */

/** Vie d'un météore (ms à ×1) ; il s'écrase à 58 % (keyframes `scene-meteor`) */
const METEOR_LIFE = 820
const METEOR_PEAK = 0.58
const METEOR_SPOTS = [
  { dx: -95, bottom: '30%' },
  { dx: 85, bottom: '44%' },
  { dx: 0, bottom: '20%' },
]

function Meteor({ seed, at, dx, bottom, dir }: { seed: number; at: number; dx: number; bottom: string; dir: number }) {
  const rand = jitter(seed)
  // Il tombe du ciel, du côté du lanceur, en diagonale couchée : sa traîne reste dans l'arène, sous l'en-tête
  const fx = -dir * (780 + rand() * 140)
  const fy = -(500 + rand() * 90)
  const tail = (Math.atan2(fy, fx) * 180) / Math.PI
  const sparks = sow(seed + 3, 10, (r, k) => {
    const a = (k / 10) * Math.PI * 2 + r() * 0.5
    const d = 70 + r() * 90
    return { sx: Math.cos(a) * d, sy: Math.sin(a) * d * 0.7 - 40, size: 5 + r() * 6 }
  })
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 z-[20]" style={{ bottom, marginLeft: dx, ...strikeStyle(at, METEOR_LIFE, METEOR_PEAK) }}>
      <div className="scene-meteor absolute" style={{ '--fx': `${fx}px`, '--fy': `${fy}px` } as CSSProperties}>
        <div className="scene-meteor-tail absolute" style={{ transform: `rotate(${tail}deg)` }} />
        <div className="scene-meteor-head absolute" />
      </div>
      <div className="scene-meteor-blast absolute" />
      {sparks.map((p, k) => (
        <div
          key={k}
          className="scene-meteor-spark absolute rounded-full"
          style={{ width: p.size, height: p.size, '--sx': `${p.sx}px`, '--sy': `${p.sy}px` } as CSSProperties}
        />
      ))}
    </div>
  )
}

function EmberMeteors({ scene }: { scene: SceneFx }) {
  return SCENE_EVENTS.emberRain.impacts.map((at, k) => {
    const spot = METEOR_SPOTS[k % METEOR_SPOTS.length]
    return <Meteor key={k} seed={scene.key * 11 + k + 1} at={at} dx={spot.dx} bottom={spot.bottom} dir={dirOf(scene)} />
  })
}

function EmberBackdrop({ scene }: { scene: SceneFx }) {
  const { impacts, length } = SCENE_EVENTS.emberRain
  // Des cendres qui montent du sol, toute la largeur de l'arène
  const ashes = sow(scene.key * 5 + 2, 34, (r) => ({ x: r() * 100, delay: r() * 900, drift: (r() - 0.5) * 120, size: 3 + r() * 5, rise: 380 + r() * 380 }))
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Le ciel rougit, comme sous un incendie lointain, puis la lumière revient */}
      <div className="scene-ember-sky absolute inset-0" style={{ '--scene-length': `${length}ms` } as CSSProperties} />
      {ashes.map((a, k) => (
        <div
          key={k}
          className="scene-ash absolute bottom-[8%] rounded-full"
          style={{ left: `${a.x}%`, width: a.size, height: a.size, '--d': `${a.delay}ms`, '--drift': `${a.drift}px`, '--rise': `${a.rise}px` } as CSSProperties}
        />
      ))}
      {impacts.map((at) => (
        <div key={at} className="scene-flash scene-flash-ember absolute inset-0 z-[35]" style={boltStyle(at)} />
      ))}
    </div>
  )
}

/* Vent : Bourrasque (Conque des vents) */

/** Vie d'une lame d'air (ms à ×1) ; elle frappe à 55 % (keyframes `scene-gust`) */
const GUST_LIFE = 600
const GUST_PEAK = 0.55
const GUST_SPOTS = [
  { dy: '52%', tilt: -8 },
  { dy: '30%', tilt: 10 },
  { dy: '42%', tilt: 0 },
]

function Gust({ at, dy, tilt, dir }: { at: number; dy: string; tilt: number; dir: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 z-[20]" style={{ bottom: dy, ...strikeStyle(at, GUST_LIFE, GUST_PEAK) }}>
      <div className="scene-gust absolute" style={{ '--dir': dir } as CSSProperties}>
        {/* Un croissant d'air, convexe vers sa cible */}
        <svg viewBox="0 0 160 300" width={160} height={300} className="overflow-visible" style={{ transform: `scaleX(${dir}) rotate(${tilt}deg)` }}>
          <defs>
            <linearGradient id="gust-fill" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#e0f2fe" stopOpacity="0" />
              <stop offset="0.65" stopColor="#e0f2fe" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <path d="M20 8 Q190 150 20 292 Q120 150 20 8 Z" fill="url(#gust-fill)" />
          <path d="M20 8 Q190 150 20 292" fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
          <path d="M0 60 Q110 150 0 240" fill="none" stroke="#bae6fd" strokeWidth={2} strokeOpacity={0.6} strokeLinecap="round" />
        </svg>
      </div>
      <div className="scene-gust-ring absolute" />
    </div>
  )
}

function GaleGusts({ scene }: { scene: SceneFx }) {
  return SCENE_EVENTS.gale.impacts.map((at, k) => {
    const spot = GUST_SPOTS[k % GUST_SPOTS.length]
    return <Gust key={k} at={at} dy={spot.dy} tilt={spot.tilt} dir={dirOf(scene)} />
  })
}

const LEAF = 'M0 -9 C7 -6 7 6 0 9 C-7 6 -7 -6 0 -9 Z'

function GaleBackdrop({ scene }: { scene: SceneFx }) {
  const { length } = SCENE_EVENTS.gale
  const dir = dirOf(scene)
  // Des traits de vent qui traversent l'arène du lanceur vers sa cible, et des feuilles emportées
  const streaks = sow(scene.key * 3 + 1, 22, (r) => ({ y: 8 + r() * 80, w: 180 + r() * 320, delay: r() * 850, thick: 1.5 + r() * 2.5 }))
  const leaves = sow(scene.key * 3 + 2, 12, (r) => ({ y: 20 + r() * 65, delay: r() * 800, spin: (r() > 0.5 ? 1 : -1) * (360 + r() * 540), hue: r() }))
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ '--dir': dir } as CSSProperties}>
      <div className="scene-gale-tint absolute inset-0" style={{ '--scene-length': `${length}ms` } as CSSProperties} />
      {streaks.map((st, k) => (
        <div
          key={k}
          className="scene-streak absolute left-1/2"
          style={{ top: `${st.y}%`, width: st.w, height: st.thick, marginLeft: -st.w / 2, '--d': `${st.delay}ms` } as CSSProperties}
        />
      ))}
      {leaves.map((l, k) => (
        <svg
          key={`leaf-${k}`}
          viewBox="-10 -10 20 20"
          width={22}
          height={22}
          className="scene-leaf absolute left-1/2"
          style={{ top: `${l.y}%`, '--d': `${l.delay}ms`, '--spin': `${l.spin}deg` } as CSSProperties}
        >
          <path d={LEAF} fill={l.hue > 0.5 ? '#a16207' : '#4d7c0f'} stroke="#1c1917" strokeWidth={1} />
        </svg>
      ))}
    </div>
  )
}

/* Givre : la gangue (Larme de givre) */

/** Une fougère de givre en SVG : des branches qui se ramifient depuis (`ox`, `oy`), vers `base` + un quart de tour */
function frostFern(seed: number, length: number, ox: number, oy: number, base: number) {
  const rand = jitter(seed)
  const paths: string[] = []
  const grow = (x: number, y: number, angle: number, len: number, depth: number) => {
    const x2 = x + Math.cos(angle) * len
    const y2 = y + Math.sin(angle) * len
    paths.push(`M${x.toFixed(1)} ${y.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`)
    if (depth === 0) return
    // Des épines de part et d'autre, à intervalles, puis la pointe qui continue
    for (const t of [0.35, 0.65]) {
      const bx = x + Math.cos(angle) * len * t
      const by = y + Math.sin(angle) * len * t
      grow(bx, by, angle - 0.9 + (rand() - 0.5) * 0.3, len * 0.42, depth - 1)
      grow(bx, by, angle + 0.9 + (rand() - 0.5) * 0.3, len * 0.42, depth - 1)
    }
    grow(x2, y2, angle + (rand() - 0.5) * 0.5, len * 0.55, depth - 1)
  }
  for (let k = 0; k < 4; k++) grow(ox, oy, base + (Math.PI / 2) * (0.08 + (k / 3) * 0.84), length * (0.6 + rand() * 0.4), 3)
  return paths.join(' ')
}

/** Les quatre coins de l'arène : où la fougère s'accroche, d'où elle grandit, vers où elle pousse */
const CORNERS = [
  { at: { left: 0, top: 0 }, origin: 'top left', ox: 0, oy: 0, base: 0 },
  { at: { right: 0, top: 0 }, origin: 'top right', ox: 420, oy: 0, base: Math.PI / 2 },
  { at: { left: 0, bottom: 0 }, origin: 'bottom left', ox: 0, oy: 420, base: -Math.PI / 2 },
  { at: { right: 0, bottom: 0 }, origin: 'bottom right', ox: 420, oy: 420, base: Math.PI },
] as const

function FrostBackdrop({ scene }: { scene: SceneFx }) {
  const { length } = SCENE_EVENTS.hoarfrost
  const flakes = sow(scene.key * 13 + 4, 30, (r) => ({ x: r() * 100, delay: r() * 1000, size: 3 + r() * 4, drift: (r() - 0.5) * 80 }))
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ '--scene-length': `${length}ms` } as CSSProperties}>
      {/* Le givre gagne l'écran depuis les bords : un voile froid, et une fougère de glace dans chaque coin */}
      <div className="scene-frost-veil absolute inset-0" />
      {CORNERS.map((c, k) => (
        <svg key={k} viewBox="0 0 420 420" width={420} height={420} className="scene-frost-fern absolute overflow-visible" style={{ ...c.at, transformOrigin: c.origin }}>
          <path d={frostFern(scene.key * 17 + k, 330, c.ox, c.oy, c.base)} stroke="#f0f9ff" strokeWidth={2.2} strokeLinecap="round" fill="none" />
        </svg>
      ))}
      {flakes.map((f, k) => (
        <div
          key={k}
          className="scene-flake absolute top-[-2%] rounded-full"
          style={{ left: `${f.x}%`, width: f.size, height: f.size, '--d': `${f.delay}ms`, '--drift': `${f.drift}px` } as CSSProperties}
        />
      ))}
    </div>
  )
}

/** Les éclats de la gangue : des cristaux qui montent autour du porteur, penchés vers lui, puis volent en éclats */
const SHARDS = [-150, -112, -74, -36, 0, 36, 74, 112, 150]

function FrostShell({ scene }: { scene: SceneFx }) {
  const { length } = SCENE_EVENTS.hoarfrost
  const shards = sow(scene.key * 19 + 5, SHARDS.length, (r, k) => {
    const x = SHARDS[k]
    const h = 380 - Math.abs(x) * 1.25 + r() * 40
    const w = 46 + r() * 22
    return { x, h, w, tilt: -x * 0.11, bx: x * 2.4 + (r() - 0.5) * 120, by: -(120 + r() * 220), spin: (r() - 0.5) * 140 }
  })
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[20] h-full" style={{ '--scene-length': `${length}ms` } as CSSProperties}>
      {shards.map((sh, k) => (
        <svg
          key={k}
          viewBox={`0 0 ${sh.w} ${sh.h}`}
          width={sh.w}
          height={sh.h}
          className="scene-shard absolute bottom-0 left-1/2"
          style={{ marginLeft: sh.x - sh.w / 2, '--tilt': `${sh.tilt}deg`, '--bx': `${sh.bx}px`, '--by': `${sh.by}px`, '--spin': `${sh.spin}deg` } as CSSProperties}
        >
          {/* Un cristal hexagonal effilé : une face éclairée, une face dans l'ombre, une arête blanche */}
          <polygon points={`${sh.w / 2},0 ${sh.w},${sh.h * 0.16} ${sh.w * 0.86},${sh.h} ${sh.w * 0.14},${sh.h} 0,${sh.h * 0.16}`} fill="rgba(186,230,253,0.42)" stroke="#f0f9ff" strokeWidth={2} />
          <polygon points={`${sh.w / 2},0 ${sh.w},${sh.h * 0.16} ${sh.w * 0.86},${sh.h} ${sh.w / 2},${sh.h}`} fill="rgba(56,189,248,0.28)" />
          <line x1={sh.w / 2} y1={4} x2={sh.w / 2} y2={sh.h} stroke="#ffffff" strokeWidth={1.5} strokeOpacity={0.8} />
        </svg>
      ))}
      <div className="scene-frost-burst absolute bottom-[30%] left-1/2" />
      <div className="scene-frost-mist absolute bottom-[-30px] left-1/2" />
    </div>
  )
}

/* Terre : le rempart (Géode fendue) */

/** Les colonnes de roche : sur les flancs du porteur, jamais devant lui */
const PILLARS = [
  { x: -250, h: 150, w: 70 },
  { x: -190, h: 250, w: 86 },
  { x: -128, h: 190, w: 64 },
  { x: 128, h: 205, w: 66 },
  { x: 190, h: 270, w: 88 },
  { x: 252, h: 140, w: 72 },
]

function crack(rand: () => number, dir: number, reach: number) {
  let x = 0
  let y = 0
  const points = ['M0 0']
  while (Math.abs(x) < reach) {
    x += dir * (26 + rand() * 34)
    y = Math.max(-14, Math.min(14, y + (rand() - 0.5) * 18))
    points.push(`L${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return points.join(' ')
}

function StoneWall({ scene }: { scene: SceneFx }) {
  const { length } = SCENE_EVENTS.stoneWall
  const rand = jitter(scene.key * 23 + 7)
  const cracks = [crack(rand, -1, 430), crack(rand, 1, 430), crack(rand, -1, 260), crack(rand, 1, 260)]
  const pillars = PILLARS.map((p) => ({ ...p, lean: (rand() - 0.5) * 10, cap: 0.12 + rand() * 0.1 }))
  const debris = sow(scene.key * 23 + 8, 12, (r) => ({ x: (r() - 0.5) * 520, up: 140 + r() * 200, size: 10 + r() * 14, spin: (r() - 0.5) * 540 }))
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[20] h-full" style={{ '--scene-length': `${length}ms` } as CSSProperties}>
      {/* Le sol se fend sous ses pieds, une lueur ambrée au fond de chaque fissure */}
      <svg viewBox="-450 -20 900 40" width={900} height={40} className="absolute bottom-[-14px] left-1/2 -ml-[450px] overflow-visible">
        {cracks.map((d, k) => (
          <g key={k} className="scene-crack" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={d} stroke="#f59e0b" strokeWidth={9} strokeOpacity={0.45} pathLength={1} />
            <path d={d} stroke="#1c1008" strokeWidth={4} pathLength={1} />
          </g>
        ))}
      </svg>
      {/* Les colonnes sortent de terre : coupées au niveau du sol */}
      <div className="absolute bottom-0 left-1/2 h-[340px] w-[640px] -translate-x-1/2 overflow-hidden">
        {pillars.map((p, k) => {
          const { w, h, cap } = p
          // Silhouette brisée : flanc gauche, sommet en éclats, flanc droit
          const outline = [
            [0, h],
            [w * 0.06, h * 0.55],
            [w * 0.1, h * cap * 1.5],
            [w * 0.3, h * cap * 0.5],
            [w * 0.44, 0],
            [w * 0.58, h * cap * 0.7],
            [w * 0.78, h * cap * 0.25],
            [w * 0.97, h * cap * 1.4],
            [w * 0.93, h * 0.6],
            [w, h],
          ]
          const pts = outline.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
          return (
            <svg
              key={k}
              viewBox={`0 0 ${w} ${h}`}
              width={w}
              height={h}
              className="scene-pillar absolute bottom-0 left-1/2"
              style={{ marginLeft: p.x - w / 2, '--lean': `${p.lean}deg`, '--delay': `${(k % 3) * 40}ms` } as CSSProperties}
            >
              <defs>
                <linearGradient id={`pillar-${k}`} x1="0" x2="1" y1="0" y2="0.3">
                  <stop offset="0" stopColor="#8b8178" />
                  <stop offset="0.45" stopColor="#57504a" />
                  <stop offset="1" stopColor="#25201c" />
                </linearGradient>
              </defs>
              <polygon points={pts} fill={`url(#pillar-${k})`} stroke="#140f0b" strokeWidth={3} strokeLinejoin="round" />
              {/* Face dans l'ombre, à droite de l'arête */}
              <polygon points={`${w * 0.44},0 ${w * 0.58},${h * cap * 0.7} ${w * 0.78},${h * cap * 0.25} ${w * 0.97},${h * cap * 1.4} ${w * 0.93},${h * 0.6} ${w},${h} ${w * 0.62},${h}`} fill="rgba(10,7,5,0.32)" />
              {/* Strates */}
              <path d={`M${w * 0.12} ${h * 0.42} L${w * 0.55} ${h * 0.47} M${w * 0.2} ${h * 0.7} L${w * 0.8} ${h * 0.74}`} stroke="rgba(10,7,5,0.45)" strokeWidth={2} fill="none" />
              {/* La veine de la géode : une fêlure ambrée qui luit depuis la base */}
              <path d={`M${w * 0.5} ${h} L${w * 0.46} ${h * 0.82} L${w * 0.55} ${h * 0.66} L${w * 0.49} ${h * 0.52}`} stroke="#fbbf24" strokeWidth={2.5} fill="none" strokeLinecap="round" className="scene-vein" />
            </svg>
          )
        })}
      </div>
      {debris.map((d, k) => (
        <div
          key={k}
          className="scene-debris absolute bottom-0 left-1/2"
          style={{ width: d.size, height: d.size * 0.8, '--x': `${d.x}px`, '--up': `${-d.up}px`, '--spin': `${d.spin}deg` } as CSSProperties}
        />
      ))}
      <div className="scene-dust absolute bottom-[-40px] left-1/2" />
    </div>
  )
}

function StoneBackdrop() {
  const { length } = SCENE_EVENTS.stoneWall
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="scene-stone-tint absolute inset-0" style={{ '--scene-length': `${length}ms` } as CSSProperties} />
    </div>
  )
}

const SCENE_VIEWS: Record<SceneEventId, SceneView> = {
  lightning: { Backdrop: LightningBackdrop, OnTarget: LightningBolts },
  emberRain: { Backdrop: EmberBackdrop, OnTarget: EmberMeteors },
  gale: { Backdrop: GaleBackdrop, OnTarget: GaleGusts },
  hoarfrost: { Backdrop: FrostBackdrop, OnTarget: FrostShell },
  stoneWall: { Backdrop: StoneBackdrop, OnTarget: StoneWall },
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
