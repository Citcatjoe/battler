import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Arena } from '../game/arenas'
import { other, SIDE_STYLE, type CombatResult, type Side } from '../game/combat'
import { useCombat } from '../game/useCombat'
import { SCENE_EVENTS } from '../game/scenes'
import { SHAKE, SHAKE_HEAVY, TIMING_VARS } from '../game/timing'
import { figureHeight } from '../game/character'
import { CheatPad } from './CheatPad'
import { CombatVcr, useVcrOpen } from './CombatVcr'
import { vcrToggle } from '../game/debugConsole'
import { CombatLog } from './CombatLog'
import { CopyTraceButton } from './CopyTraceButton'
import { Coin } from './Coin'
import { Die, useRollingFaces } from './Die'
import { Fighter, type Received } from './Fighter'
import { HpBar } from './HpBar'
import { StatusTray } from './StatusTray'
import { SignalLayer } from './SignalLayer'
import { SkillBar } from './SkillBar'
import { trayStates } from '../game/states'
import { SceneBackdrop, SceneOnTarget } from './SceneEvent'
import { Button, Glyph, IconButton, SegmentedControl, Tool } from './kit'
import { SpecialLabel } from './SpecialLabel'

interface Props {
  /** Combat déjà résolu, que cet écran met en scène */
  script: CombatResult
  /** Cadre visuel du combat ; null : fond noir (combat test, en attendant son décor) */
  arena: Arena | null
  onEnd: (result: CombatResult) => void
  /**
   * Combat test : chaque dé attend le choix du joueur sur le pavé posé sous chaque combattant
   * (`CheatPad`), sans initiative animée. `toolbar` : commandes du mode, en haut de l'arène.
   */
  test?: { toolbar: ReactNode }
}

const SPEEDS = [1, 2, 4].map((s) => ({ value: s, label: `×${s}`, title: `Vitesse ×${s}` }))

// Journal masqué au premier combat ; s'il est ouvert, il le reste pour les combats suivants de la session.
let logOpenInSession = false

const SHAKE_KEYS: Keyframe[] = [
  { transform: 'translate(0, 0)' },
  { transform: 'translate(-7px, 4px)' },
  { transform: 'translate(6px, -4px)' },
  { transform: 'translate(-4px, 2px)' },
  { transform: 'translate(3px, -1px)' },
  { transform: 'translate(0, 0)' },
]

export function FightScreen({ script, arena, onEnd, test }: Props) {
  const { fighters } = script
  // Magnétoscope (outil de développement : `battler.vcr()` ou la touche V), jamais en combat test
  const vcrOpen = useVcrOpen() && !test
  const rootRef = useRef<HTMLDivElement>(null)
  const { hp, statuses, forms, dice, strike, blow, aura, floats, scene, log, turn, winner, active, pulse, signal, relicPulse, relicUses, speed, setSpeed, paused, setPaused, cheat, forceNextRoll, resolved, vcr } =
    useCombat(script, onEnd, { test: test !== undefined, vcr: vcrOpen ? rootRef : undefined })

  // Zones d'état : les états génériques de chacun, ses statuts et les auras de l'adversaire qui agissent sur lui
  const trays = useMemo(() => ([0, 1] as Side[]).map((side) => trayStates(statuses[side], statuses[other(side)])), [statuses])

  const fighterState = (side: Side) => (winner === null ? 'idle' : winner === side ? 'victory' : 'ko')
  const diceColor = dice.owner === null ? '#e7e5e4' : SIDE_STYLE[dice.owner].hex
  const shake =
    (strike?.landed && !strike.dodged && (strike.crit || strike.damage >= 8)) || (blow?.landed && (blow.heavy || blow.damage >= 8))
  const heavyHit = (strike?.landed && !strike.dodged && strike.crit) || (blow?.landed && blow.heavy)
  const hitKey = strike?.key ?? blow?.key

  // Secousse de l'arène sur les gros coups (sans remonter les combattants). Elle suit la vitesse et se fige en pause,
  // comme les animations CSS
  const arenaRef = useRef<HTMLElement>(null)
  const shaking = useRef<Animation | undefined>(undefined)
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  useEffect(() => {
    if (!shake) return
    const crit = heavyHit
    shaking.current = arenaRef.current?.animate(crit ? SHAKE_KEYS.map((k) => ({ transform: `${k.transform} scale(1.02)` })) : SHAKE_KEYS, {
      duration: (crit ? SHAKE_HEAVY : SHAKE) / speed,
      easing: 'linear',
    })
    if (pausedRef.current) shaking.current?.pause()
  }, [shake, hitKey, heavyHit, speed])
  // Événement de scène qui fait trembler l'arène (météores, roche qui jaillit, 0.85.0) : une secousse lourde à chacun de
  // ses impacts, calée sur son rythme (SCENE_EVENTS)
  const quaking = useRef<Animation[]>([])
  const speedRef = useRef(speed)
  speedRef.current = speed
  useEffect(() => {
    if (!scene || !SCENE_EVENTS[scene.id].quake) return
    const pace = speedRef.current
    quaking.current = SCENE_EVENTS[scene.id].impacts.flatMap(
      (at) =>
        arenaRef.current?.animate(
          SHAKE_KEYS.map((k) => ({ transform: `${k.transform} scale(1.02)` })),
          { duration: SHAKE_HEAVY / pace, delay: at / pace, easing: 'linear' },
        ) ?? [],
    )
    if (pausedRef.current) for (const a of quaking.current) a.pause()
  }, [scene])
  useEffect(() => {
    for (const a of [shaking.current, ...quaking.current]) {
      if (paused) a?.pause()
      else if (a?.playState === 'paused') a.play()
    }
  }, [paused])

  const [logOpen, setLogOpenState] = useState(logOpenInSession)
  const setLogOpen = (open: boolean) => {
    logOpenInSession = open
    setLogOpenState(open)
  }
  // Lignes arrivées pendant que le journal est fermé
  const [seen, setSeen] = useState(0)
  useEffect(() => {
    if (logOpen) setSeen(log.length)
  }, [logOpen, log.length])
  const unread = logOpen ? 0 : log.length - seen

  // Raccourcis clavier : J ouvre ou ferme le journal ; V, le magnétoscope (serveur de dev, hors combat test).
  const toggleRef = useRef((_: string) => {})
  toggleRef.current = (key) => {
    if (key === 'j') setLogOpen(!logOpen)
    if (key === 'v' && import.meta.env.DEV && !test) vcrToggle.set(!vcrToggle.get())
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) toggleRef.current(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const receivedBy = (side: Side): Received | undefined =>
    strike && strike.attacker !== side
      ? { key: strike.key, damage: strike.damage, crit: strike.crit, dodged: strike.dodged, landed: strike.landed }
      : blow && blow.to === side
        ? { key: blow.key, damage: blow.damage, crit: blow.heavy, dodged: false, landed: blow.landed }
        : undefined
  const lungingSide = strike ? strike.attacker : blow?.lunge ? blow.from : null
  // Passage de main : le camp dont c'est le tour s'allume, l'autre se tamise (rien avant l'initiative ni après le K.O.)
  const turnOf = (side: Side) => (active === null ? undefined : active === side ? 'active' : 'waiting')
  const pulseOf = (side: Side) => (pulse?.side === side ? pulse : undefined)
  const signalOf = (side: Side) => (signal?.side === side ? signal : undefined)
  const relicPulseOf = (side: Side) => (relicPulse?.side === side ? relicPulse : undefined)
  // Les faces que montrent les dés, une seule source pour le dé de l'arène et le reflet dans la zone de compétence de
  // son camp : pendant le roulement, le sceau de la face montrée s'allume brièvement (ni l'initiative ni la pièce)
  const rolled = useRollingFaces(dice.values, dice.values.map((_, i) => dice.dieFaces?.[i] ?? dice.faces), dice.rolling, paused)
  // Hauteur d'ancrage du décor (le second terme de `focus`, « 50% 70% » → « 70% »)
  const focusY = arena?.focus.split(' ')[1] ?? '50%'

  return (
    <div
      ref={rootRef}
      className={`arena relative flex h-full flex-col overflow-hidden ${paused ? 'is-paused' : ''}`}
      style={{ '--speed': speed, ...TIMING_VARS } as CSSProperties}
    >
      {/* Barres de vie : bande vitrée, l'arène passe dessous */}
      <header className="fight-header relative z-[55] flex items-start gap-6 py-4 pl-8 pr-20">
        <HpBar side={0} name={fighters[0].name} hp={hp[0]} maxHp={fighters[0].maxHp} character={fighters[0]} turn={turnOf(0)} relicUses={relicUses[0]} relicPulse={relicPulseOf(0)} />
        <div className="flex shrink-0 flex-col items-center pt-1">
          <span className="text-xs uppercase tracking-widest text-stone-500">Tour</span>
          <span className="font-display text-3xl font-extrabold tabular-nums">{turn || '–'}</span>
        </div>
        <HpBar side={1} name={fighters[1].name} hp={hp[1]} maxHp={fighters[1].maxHp} character={fighters[1]} turn={turnOf(1)} relicUses={relicUses[1]} relicPulse={relicPulseOf(1)} />
      </header>

      {/* Ce que chacun sait faire (SkillBar) : sous l'en-tête, au bord de l'arène, au-dessus de son camp. Hors de
          <main> pour ne pas trembler avec l'arène ; les sceaux restent cliquables au survol, le reste laisse passer.
          Le bouton du son (seul, 48 px) s'arrête au-dessus : marges égales des deux côtés */}
      <div className="pointer-events-none absolute inset-x-0 top-[100px] z-[50] flex items-start justify-between px-8">
        {([0, 1] as Side[]).map((side) => (
          <div key={side} className="skill-bar-plate pointer-events-auto">
            <SkillBar
              character={fighters[side]}
              side={side}
              form={forms[side]}
              statuses={statuses[side]}
              pulse={pulseOf(side)}
              signal={signalOf(side)}
              rolling={dice.owner === side && !dice.coin && dice.rolling ? rolled.faces : undefined}
              landed={dice.owner === side && !dice.coin && !dice.rolling ? dice.values : undefined}
              align={side === 1 ? 'right' : 'left'}
            />
          </div>
        ))}
      </div>

      {/* Arène */}
      <main
        ref={arenaRef}
        className={`relative flex flex-1 items-end justify-between px-[13%] pt-6 ${arena ? 'bg-stone-950' : 'bg-black'}`}
      >
        {/* Décor : assombri et désaturé pour laisser les combattants au premier plan. Calé comme un object-cover
            (pleine largeur, ancré à la hauteur de `focus`) mais en taille naturelle, pour déborder au-dessus de l'arène
            et passer sous la bande vitrée de l'en-tête. Suppose une image moins large que 1600×(hauteur de l'arène) :
            les fonds en 3:2 le sont. La scène coupe le reste (overflow-hidden sur la racine). */}
        {arena && (
          <>
            <img
              src={arena.image}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-x-0 w-full max-w-none select-none"
              style={{ filter: arena.filter, top: focusY, transform: `translateY(-${focusY}) scale(1.04)` }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_35%,rgba(12,10,9,0.85)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-stone-950/85 to-transparent" />
          </>
        )}
        {/* Éclair d'un critique ou d'un coup lourd : la scène blanchit un instant */}
        {heavyHit && <div key={`flash-${hitKey}`} className="crit-flash pointer-events-none absolute inset-0 z-[35]" />}
        {/* Halo au sol qui détache les silhouettes */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,237,213,0.12)_0%,transparent_65%)]" />

        {/* Halo du camp dont c'est le tour : une lueur diffuse qui monte du bas de l'écran, sous sa moitié de l'arène,
            dans la couleur du camp (avec la barre de vie qui s'allume dans l'en-tête) */}
        {([0, 1] as Side[]).map((side) => (
          <div
            key={`turn-${side}`}
            aria-hidden
            data-active={active === side}
            data-side={side}
            className={`turn-halo pointer-events-none absolute bottom-0 h-[45%] w-1/2 ${side === 0 ? 'left-0' : 'right-0'}`}
            style={{ '--camp': SIDE_STYLE[side].hex } as CSSProperties}
          />
        ))}

        {/* Événement de scène (Foudre…) : sous les combattants, sur tout le décor */}
        {scene && <SceneBackdrop scene={scene} />}

        {/* Pieds posés sur la terre battue de l'arène, un peu en retrait du bord de l'écran ;
            combat test : plus haut, pour laisser la place au pavé du dé */}
        {([0, 1] as Side[]).map((side) => (
          <div
            key={side}
            className={`relative h-[470px] ${test ? 'mb-[196px]' : 'mb-[88px]'} ${side === 1 ? 'order-last' : ''}`}
          >
            <Fighter
              character={fighters[side]}
              side={side}
              state={fighterState(side)}
              lunging={lungingSide === side}
              fastLunge={strike ? strike.fast : blow !== null}
              received={receivedBy(side)}
              aura={aura?.source === side ? aura.key : undefined}
              floats={floats[side]}
              statuses={statuses[side]}
              form={forms[side]}
            />
            {scene?.target === side && <SceneOnTarget scene={scene} />}
            {/* Zone d'état : au-dessus de la tête (qui dépend de la taille du personnage). Elle passe devant le
                cadre du combattant, qui la recouvrait chez le nain (plus petit) ; au survol, elle passe devant tout
                (combattants, journal, commandes) pour que l'infobulle soit lisible. */}
            <div
              className="pointer-events-auto absolute left-1/2 z-[15] -translate-x-1/2 hover:z-[60]"
              style={{ bottom: `calc(${figureHeight(fighters[side].lookFor(forms[side])) * 100}% + 18px)` }}
            >
              <StatusTray states={trays[side]} side={side} cast={{ bearer: fighters[side], opponent: fighters[other(side)] }} />
            </div>
            {test && (
              <div className="absolute left-1/2 top-full z-30 mt-3 -translate-x-1/2">
                <CheatPad side={side} fighter={fighters[side]} cheat={cheat} onForce={forceNextRoll} />
              </div>
            )}
          </div>
        ))}

        {/* Zone des dés : sans libellé (0.96.0), le camp se lit à la couleur du dé et au halo du tour */}
        <div className="absolute left-1/2 top-[17%] z-0 flex -translate-x-1/2 flex-col items-center gap-3">
          <div className="flex gap-6">
            {/* Pile ou face : la pièce remplace le dé */}
            {dice.coin && <Coin heads={dice.coin.heads} />}
            {dice.values.map((v, i) => (
              <div
                key={`${dice.values.length}-${i}`}
                // Rafale : le second dé jaillit ; ensuite, le dé du coup en cours ressort
                className={`die-slot ${dice.volley && i > 0 ? 'die-burst' : ''} ${
                  dice.active === undefined ? '' : dice.active === i ? 'is-active' : 'is-idle'
                }`}
              >
                <Die
                  value={v}
                  face={rolled.faces[i] ?? v}
                  faces={dice.dieFaces?.[i] ?? dice.faces}
                  rolling={dice.rolling}
                  color={dice.dieColors?.[i] ?? (dice.owner === null ? SIDE_STYLE[i as Side].hex : diceColor)}
                  size={dice.values.length > 1 ? 88 : 104}
                />
              </div>
            ))}
          </div>
          {/* Zone de surcharge : ce qui change ce coup-ci, en colonne, dans l'ordre où ça s'applique (critique, esquive
              assurée, bouclier, Riposte, relique…), tous à la largeur du plus long ; couleur de la source, hachures pour
              le − (SpecialLabel ; docs/RESOLUTION.md, « Zone de surcharge ») */}
          <div className="flex min-h-10 w-max flex-col items-stretch gap-2">
            {dice.forced && !dice.rolling && (
              <span className="cheat-tag self-center" title="Dé imposé en mode triche">
                Imposé
              </span>
            )}
            {dice.owner !== null && dice.specials?.map((b) => <SpecialLabel key={b.key} badge={b} />)}
          </div>
          {winner !== null && (
            <span className="fade-in font-display text-5xl font-extrabold text-amber-300 drop-shadow-[0_3px_0_#78350f]">
              K.O. !
            </span>
          )}
        </div>

        {test?.toolbar}

        {/* Journal : fenêtre translucide entre les combattants, au premier plan, masquée par défaut */}
        {logOpen && (
          <section
            aria-label="Journal du combat"
            className="log-window absolute bottom-[76px] left-1/2 z-[45] flex h-[230px] w-[600px] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-stone-500/30 bg-stone-950/55 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
          >
            <header className="flex items-center justify-between border-b border-stone-500/20 px-4 py-1.5">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                <Glyph name="journal" size={16} /> Journal
              </span>
              <span className="flex items-center gap-1">
                <CopyTraceButton result={resolved} />
                <IconButton onClick={() => setLogOpen(false)} icon="fermer" size="sm" label="Masquer le journal (J)" />
              </span>
            </header>
            <div className="min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,transparent_0,black_18px)]">
              <CombatLog entries={log} />
            </div>
          </section>
        )}
      </main>


      {/* Barre de lecture du UI kit, hors de l'arène pour ne pas trembler avec elle */}
      <nav aria-label="Commandes du combat" className="bt-playbar absolute bottom-5 left-1/2 z-40 -translate-x-1/2">
        {paused ? (
          <Button variant="resume" size="sm" icon="lecture" onClick={() => setPaused(false)} title="Reprendre le combat">
            Reprendre
          </Button>
        ) : (
          <Button variant="secondary" size="sm" icon="pause" onClick={() => setPaused(true)} title="Mettre en pause">
            Pause
          </Button>
        )}
        <SegmentedControl label="Vitesse" options={SPEEDS} value={speed} onChange={setSpeed} />
        <span className="bt-playbar__sep" />
        <Tool
          icon="journal"
          label={logOpen ? 'Masquer le journal (J)' : 'Afficher le journal (J)'}
          title={logOpen ? 'Masquer le journal (J)' : 'Afficher le journal (J)'}
          pressed={logOpen}
          dot={unread > 0}
          onClick={() => setLogOpen(!logOpen)}
        />
      </nav>

      {vcrOpen && (
        <CombatVcr vcr={vcr} beats={resolved.beats} fighters={fighters} speed={speed} setSpeed={setSpeed} paused={paused} setPaused={setPaused} />
      )}

      {/* Signaux d'activation : du sceau d'une compétence (en-tête) à la zone d'état de sa cible */}
      <SignalLayer signal={signal} root={rootRef} />
    </div>
  )
}
