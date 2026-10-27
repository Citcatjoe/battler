import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { Beat, Pair } from '../game/combat'
import type { Character } from '../game/character'
import { vcrToggle } from '../game/debugConsole'
import { of } from '../game/narration'
import type { Cue, Moment } from '../game/staging'
import { STATUSES } from '../game/statuses'
import type { VcrControls, VcrSnapshot } from '../game/useCombat'

/*
 * Magnétoscope de combat (outil de développement, docs/MOTEUR_V2.md § 8) : pause, pas à pas de cue en cue, retour
 * au moment précédent, curseur dans le moment, ralenti. Il montre les attentes du moment (`Moment.spans`), chacune
 * avec la constante de timing.ts qui l'a produite, et les cues de chaque instant. Ouvert par `battler.vcr()` en console
 * ou la touche V en combat ; seulement sur le serveur de dev, hors combat test.
 */

/** Le magnétoscope est-il ouvert (`battler.vcr()`, touche V) ? Toujours faux hors du serveur de dev. */
export function useVcrOpen() {
  const open = useSyncExternalStore(vcrToggle.subscribe, vcrToggle.get, () => false)
  return import.meta.env.DEV && open
}

const SPEEDS = [0.25, 0.5, 1]

/** Libellé court de chaque canal sous la frise (les sons portent leur nom) */
const CHANNEL: Record<Exclude<Cue['channel'], 'sound'>, string> = {
  dice: 'dés',
  strike: 'coup',
  blow: 'frappe',
  float: 'texte',
  aura: 'aura',
  special: 'label',
  specialsClear: 'efface',
  hp: 'PV',
  statuses: 'statuts',
  log: 'journal',
  skillPulse: 'sceau',
  relicPulse: 'relique',
  relicUse: 'charges',
  signal: 'signal',
  scene: 'scène',
  form: 'forme',
  daze: 'vacille',
  cast: 'incante',
  turn: 'tour',
  winner: 'victoire',
}

const phaseOf = (phase: string) => (phase === 'turnStart' ? 'début de tour' : 'fin de tour')

/** Ce que joue un moment : son étape racine, en clair (« Coup de Gorak », « Poison (début de tour) »). */
function momentTitle(moment: Moment, index: number, beats: readonly Beat[], fighters: Pair<Character>) {
  if (moment.beats.length === 0) return index === 0 ? 'Ouverture' : 'Fin du combat'
  const beat = beats[moment.beats[0]]
  if (!beat) return 'Étape inconnue'
  switch (beat.type) {
    case 'attack':
      return `Coup ${of(fighters[beat.attack.attacker].name)}`
    case 'event':
      return `« ${beat.event.name} » ${of(fighters[beat.event.side].name)}`
    case 'statusTick':
      return `${STATUSES[beat.status].name} (${phaseOf(beat.phase)})`
    case 'statusAge':
      return `Usure (${phaseOf(beat.phase)})`
    case 'statusReaction':
      return `${STATUSES[beat.status].name} (réaction)`
    case 'skip':
      return `${STATUSES[beat.status].name} : action perdue`
    case 'shift':
      return `Changement de forme ${of(fighters[beat.side].name)}`
    case 'flurry':
      return `Rafale (${STATUSES[beat.status].name})`
    case 'roll':
      return `Jet de dé ${of(fighters[beat.side].name)}`
    case 'coin':
      return `Pile ou face (${STATUSES[beat.status].name})`
    case 'relic':
      return `Relique « ${beat.name} »`
    default:
      return beat satisfies never
  }
}

interface Props {
  vcr: VcrControls & { snapshot: VcrSnapshot | null }
  beats: readonly Beat[]
  fighters: Pair<Character>
  speed: number
  setSpeed: (speed: number) => void
  paused: boolean
  setPaused: (paused: boolean) => void
}

const ms = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} ms`

export function CombatVcr({ vcr, beats, fighters, speed, setSpeed, paused, setPaused }: Props) {
  // Clavier, panneau ouvert : Espace pause, → pas, Maj+→ moment suivant, ← moment précédent
  const keys = useRef((_: KeyboardEvent) => {})
  keys.current = (e) => {
    if (e.key === ' ') setPaused(!paused)
    else if (e.key === 'ArrowRight' && e.shiftKey) vcr.nextMoment()
    else if (e.key === 'ArrowRight') vcr.stepCue()
    else if (e.key === 'ArrowLeft') vcr.prevMoment()
    else return
    e.preventDefault()
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) keys.current(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const snap = vcr.snapshot
  if (!snap) return null
  const moment = snap.moments[snap.mi]
  const duration = Math.max(1, moment.duration)
  const at = Math.min(snap.at, moment.duration)
  const pct = (t: number) => `${(t / duration) * 100}%`
  const span = moment.spans.find((s) => at >= s.at && at < s.at + s.ms) ?? moment.spans[moment.spans.length - 1]
  // Les cues de chaque instant : ce qui change à l'écran, et les sons à part
  const instants = [...new Set(moment.cues.map((c) => c.at))].map((t) => {
    const cues = moment.cues.filter((c) => c.at === t)
    return {
      at: t,
      screen: [...new Set(cues.flatMap((c) => (c.channel === 'sound' ? [] : [CHANNEL[c.channel]])))],
      sounds: cues.flatMap((c) => (c.channel === 'sound' ? [c.cue] : [])),
    }
  })

  return (
    <section aria-label="Magnétoscope du combat" className="vcr absolute bottom-[76px] left-1/2 z-[58] w-[680px] -translate-x-1/2">
      <header className="vcr-head">
        <span className="vcr-title">
          Moment {snap.mi + 1} / {snap.moments.length} · tour {moment.turn} · {momentTitle(moment, snap.mi, beats, fighters)}
        </span>
        <span className="vcr-time">
          {span && (
            <b>
              {span.name} {ms(span.ms)}
            </b>
          )}
          {ms(at)} / {ms(moment.duration)}
        </span>
      </header>

      {/* Sons, au-dessus de la frise */}
      <div className="vcr-ticks vcr-ticks-sound">
        {instants
          .filter((i) => i.sounds.length > 0)
          .map((i) => (
            <span key={i.at} className="vcr-tick" style={{ left: pct(i.at) }} title={`${ms(i.at)} : ${i.sounds.join(', ')}`}>
              {i.sounds.join(' ')}
            </span>
          ))}
      </div>

      {/* Frise des attentes du moment, à l'échelle ; le curseur s'y pose */}
      <div className="vcr-track">
        {moment.spans.map((s) => (
          <span
            key={s.at}
            className="vcr-span"
            data-current={s === span}
            data-named={/^[A-Z_]+$/.test(s.name)}
            style={{ left: pct(s.at), width: pct(s.ms) }}
            title={`${s.name} : ${ms(s.ms)} (de ${ms(s.at)} à ${ms(s.at + s.ms)})`}
          >
            {s.name} {Math.round(s.ms)}
          </span>
        ))}
        {instants.map((i) => (
          <span key={i.at} className="vcr-mark" style={{ left: pct(i.at) }} />
        ))}
        <span className="vcr-head-line" style={{ left: pct(at) }} />
        <input
          type="range"
          aria-label="Instant dans le moment"
          className="vcr-scrub"
          min={0}
          max={moment.duration}
          step={1}
          value={Math.round(at)}
          onChange={(e) => vcr.seek(snap.mi, Number(e.target.value))}
        />
      </div>

      {/* Ce qui change à l'écran à chaque instant, sur deux rangs pour ne pas se chevaucher */}
      <div className="vcr-ticks vcr-ticks-screen">
        {instants
          .filter((i) => i.screen.length > 0)
          .map((i, k) => (
            <span
              key={i.at}
              className="vcr-tick"
              data-row={k % 2}
              style={{ left: pct(i.at) }}
              title={`${ms(i.at)} : ${i.screen.join(', ')}`}
            >
              {i.screen.join('·')}
            </span>
          ))}
      </div>

      <nav aria-label="Commandes du magnétoscope" className="vcr-controls">
        <button onClick={vcr.prevMoment} className="hud-btn" title="Moment précédent (←)">
          <span className="hud-glyph">◀◀</span>
        </button>
        <button onClick={vcr.restartMoment} className="hud-btn" title="Recommencer le moment">
          <span className="hud-glyph">↺</span>
        </button>
        <button onClick={() => setPaused(!paused)} className="hud-btn w-[118px]" aria-pressed={paused} title={paused ? 'Lecture (Espace)' : 'Pause (Espace)'}>
          <span className="hud-glyph">{paused ? '▶' : '❚❚'}</span>
          {paused ? 'Lecture' : 'Pause'}
        </button>
        <button onClick={vcr.stepCue} className="hud-btn" title="Pas suivant : prochain instant de cues (→)">
          <span className="hud-glyph">▶❚</span> Pas
        </button>
        <button onClick={vcr.nextMoment} className="hud-btn" title="Moment suivant (Maj+→)">
          <span className="hud-glyph">▶▶</span>
        </button>
        <span className="hud-sep" />
        <div className="hud-speeds" role="group" aria-label="Vitesse">
          {SPEEDS.map((s) => (
            <button key={s} onClick={() => setSpeed(s)} aria-pressed={s === speed} className="hud-speed" title={`Vitesse ×${String(s).replace('.', ',')}`}>
              ×{String(s).replace('.', ',')}
            </button>
          ))}
        </div>
      </nav>
    </section>
  )
}
