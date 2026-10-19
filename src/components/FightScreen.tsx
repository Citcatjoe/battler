import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Arena } from '../game/arenas'
import { multiplier, SIDE_STYLE, type CombatResult, type Side } from '../game/combat'
import { useCombat } from '../game/useCombat'
import { figureHeight } from '../game/character'
import { CheatPad } from './CheatPad'
import { CombatLog } from './CombatLog'
import { CopyTraceButton } from './CopyTraceButton'
import { Coin } from './Coin'
import { Die } from './Die'
import { Fighter, type Received } from './Fighter'
import { HpBar } from './HpBar'
import { StatusTray } from './StatusTray'
import { Icon } from './Icon'

interface Props {
  /** Combat déjà résolu, que cet écran met en scène */
  script: CombatResult
  /** Cadre visuel du combat */
  arena: Arena
  onEnd: (result: CombatResult) => void
}

const SPEEDS = [1, 2, 4]

// Journal masqué au premier combat ; s'il est ouvert, il le reste pour les combats suivants de la session.
let cheatOpenInSession = false
let logOpenInSession = false

const SHAKE: Keyframe[] = [
  { transform: 'translate(0, 0)' },
  { transform: 'translate(-7px, 4px)' },
  { transform: 'translate(6px, -4px)' },
  { transform: 'translate(-4px, 2px)' },
  { transform: 'translate(3px, -1px)' },
  { transform: 'translate(0, 0)' },
]

export function FightScreen({ script, arena, onEnd }: Props) {
  const { fighters } = script
  const { hp, statuses, forms, dice, strike, blow, fx, log, turn, winner, speed, setSpeed, paused, setPaused, cheat, forceNextRoll, resolved } =
    useCombat(script, onEnd)

  const fighterState = (side: Side) => (winner === null ? 'idle' : winner === side ? 'victory' : 'ko')
  const diceColor = dice.owner === null ? '#e7e5e4' : SIDE_STYLE[dice.owner].hex
  const shake =
    (strike?.landed && !strike.dodged && (strike.crit || strike.damage >= 8)) || (blow?.landed && (blow.heavy || blow.damage >= 8))
  const heavyHit = (strike?.landed && !strike.dodged && strike.crit) || (blow?.landed && blow.heavy)
  const hitKey = strike?.key ?? blow?.key

  // Secousse de l'arène sur les gros coups (sans remonter les combattants).
  const arenaRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!shake) return
    const crit = heavyHit
    arenaRef.current?.animate(crit ? SHAKE.map((k) => ({ transform: `${k.transform} scale(1.02)` })) : SHAKE, {
      duration: (crit ? 500 : 350) / speed,
      easing: 'linear',
    })
  }, [shake, hitKey, heavyHit, speed])

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

  // Mode triche (outil d'observation) : ouvert ou fermé, retenu pour la session comme le journal
  const [cheatOpen, setCheatOpenState] = useState(cheatOpenInSession)
  const setCheatOpen = (open: boolean) => {
    cheatOpenInSession = open
    setCheatOpenState(open)
  }

  // Raccourcis clavier : J ouvre ou ferme le journal, C le mode triche.
  const toggleRef = useRef((_: string) => {})
  toggleRef.current = (key) => {
    if (key === 'j') setLogOpen(!logOpen)
    if (key === 'c') setCheatOpen(!cheatOpen)
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

  return (
    <div
      className={`arena relative flex h-full flex-col ${paused ? 'is-paused' : ''}`}
      style={{ '--speed': speed } as CSSProperties}
    >
      {/* Barres de vie */}
      <header className="relative z-[55] flex items-start gap-6 border-b border-stone-800 bg-stone-950/80 py-4 pl-8 pr-20">
        <HpBar side={0} name={fighters[0].name} hp={hp[0]} maxHp={fighters[0].maxHp} character={fighters[0]} form={forms[0]} />
        <div className="flex shrink-0 flex-col items-center pt-1">
          <span className="text-xs uppercase tracking-widest text-stone-500">Tour</span>
          <span className="font-display text-3xl font-extrabold tabular-nums">{turn || '–'}</span>
        </div>
        <HpBar side={1} name={fighters[1].name} hp={hp[1]} maxHp={fighters[1].maxHp} character={fighters[1]} form={forms[1]} />
      </header>

      {/* Arène */}
      <main
        ref={arenaRef}
        className="relative flex flex-1 items-end justify-between overflow-hidden bg-stone-950 px-[13%] pt-6"
      >
        {/* Décor : assombri, désaturé et légèrement flou pour laisser les combattants au premier plan */}
        <img
          src={arena.image}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full scale-[1.04] select-none object-cover"
          style={{ filter: arena.filter, objectPosition: arena.focus }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_35%,rgba(12,10,9,0.85)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-stone-950/85 to-transparent" />
        {/* Éclair d'un critique ou d'un coup lourd : la scène blanchit un instant */}
        {heavyHit && <div key={`flash-${hitKey}`} className="crit-flash pointer-events-none absolute inset-0 z-[35]" />}
        {/* Halo au sol qui détache les silhouettes */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,237,213,0.12)_0%,transparent_65%)]" />

        {/* Pieds posés sur la terre battue de l'arène, un peu en retrait du bord de l'écran */}
        {([0, 1] as Side[]).map((side) => (
          <div key={side} className={`relative mb-[88px] h-[470px] ${side === 1 ? 'order-last' : ''}`}>
            <Fighter
              character={fighters[side]}
              side={side}
              state={fighterState(side)}
              lunging={lungingSide === side}
              fastLunge={strike ? strike.fast : blow !== null}
              received={receivedBy(side)}
              fx={fx ?? undefined}
              statuses={statuses[side]}
              form={forms[side]}
            />
            {/* Zone d'état : au-dessus de la tête (qui dépend de la taille du personnage). Elle passe devant le
                cadre du combattant, qui la recouvrait chez le nain (plus petit) ; au survol, elle passe devant tout
                (combattants, journal, commandes) pour que l'infobulle soit lisible. */}
            <div
              className="pointer-events-auto absolute left-1/2 z-[15] -translate-x-1/2 hover:z-[60]"
              style={{ bottom: `calc(${figureHeight(fighters[side].lookFor(forms[side])) * 100}% + 18px)` }}
            >
              <StatusTray statuses={statuses[side]} />
            </div>
          </div>
        ))}

        {/* Zone des dés */}
        <div className="absolute left-1/2 top-[12%] z-0 flex -translate-x-1/2 flex-col items-center gap-3">
          <span
            className="h-5 whitespace-nowrap text-sm font-bold uppercase tracking-widest"
            style={{ color: diceColor }}
          >
            {dice.label}
          </span>
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
                  faces={dice.dieFaces?.[i] ?? dice.faces}
                  rolling={dice.rolling}
                  color={dice.dieColors?.[i] ?? (dice.owner === null ? SIDE_STYLE[i as Side].hex : diceColor)}
                  size={dice.values.length > 1 ? 88 : 104}
                />
              </div>
            ))}
          </div>
          <div className="flex h-10 items-center gap-2">
            {dice.forced && !dice.rolling && (
              <span className="cheat-tag" title="Dé imposé en mode triche">
                Imposé
              </span>
            )}
            {dice.crit && dice.owner !== null && (
              <span className="crit-badge inline-block rounded-md bg-amber-400 px-3 py-1 font-display text-xl font-extrabold text-stone-950 shadow-[0_3px_0_#92400e]">
                {dice.critForced ? (
                  <>
                    <Icon name="crit" /> CRITIQUE ASSURÉ
                  </>
                ) : (
                  'CRITIQUE'
                )}{' '}
                {multiplier(dice.critMultiplier)}
              </span>
            )}
          </div>
          {winner !== null && (
            <span className="fade-in font-display text-5xl font-extrabold text-amber-300 drop-shadow-[0_3px_0_#78350f]">
              K.O. !
            </span>
          )}
        </div>

        {/* Journal : fenêtre translucide entre les combattants, au premier plan, masquée par défaut */}
        {logOpen && (
          <section
            aria-label="Journal du combat"
            className="log-window absolute bottom-[76px] left-1/2 z-[45] flex h-[230px] w-[600px] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-stone-500/30 bg-stone-950/55 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-[3px]"
          >
            <header className="flex items-center justify-between border-b border-stone-500/20 px-4 py-1.5">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                <Icon name="scroll" /> Journal
              </span>
              <span className="flex items-center gap-1">
                <CopyTraceButton result={resolved} />
                <button
                  onClick={() => setLogOpen(false)}
                  className="rounded px-1.5 text-stone-500 hover:bg-stone-800/60 hover:text-stone-200"
                  title="Masquer le journal (J)"
                >
                  ✕
                </button>
              </span>
            </header>
            <div className="min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,transparent_0,black_18px)]">
              <CombatLog entries={log} />
            </div>
          </section>
        )}
      </main>

      {cheatOpen && (
        <CheatPad
          cheat={cheat}
          fighters={fighters}
          onForce={forceNextRoll}
          onClose={() => setCheatOpen(false)}
          bottom={logOpen ? 316 : 76}
        />
      )}

      {/* Commandes : barre de jeu discrète (plaque de pierre au liseré de bronze), hors de l'arène pour ne pas trembler avec elle */}
      <nav aria-label="Commandes du combat" className="hud absolute bottom-5 left-1/2 z-40 -translate-x-1/2">
        <button onClick={() => setPaused(!paused)} className="hud-btn w-[118px]" aria-pressed={paused} title={paused ? "Reprendre le combat" : "Mettre en pause"}>
          <span className="hud-glyph">{paused ? '▶' : '❚❚'}</span>
          {paused ? 'Reprendre' : 'Pause'}
        </button>
        <span className="hud-sep" />
        <div className="hud-speeds" role="group" aria-label="Vitesse">
          {SPEEDS.map((s) => (
            <button key={s} onClick={() => setSpeed(s)} aria-pressed={s === speed} className="hud-speed" title={`Vitesse ×${s}`}>
              ×{s}
            </button>
          ))}
        </div>
        <span className="hud-sep" />
        <button
          onClick={() => setLogOpen(!logOpen)}
          aria-pressed={logOpen}
          title={logOpen ? 'Masquer le journal (J)' : 'Afficher le journal (J)'}
          className="hud-btn"
        >
          <Icon name="scroll" /> Journal
          {unread > 0 && <span className="hud-count">{unread > 99 ? '99+' : unread}</span>}
        </button>
        <button
          onClick={() => setCheatOpen(!cheatOpen)}
          aria-pressed={cheatOpen}
          title={cheatOpen ? 'Fermer le mode triche (C)' : 'Mode triche : imposer le prochain dé (C)'}
          className="hud-btn hud-cheat"
        >
          <Icon name="dice" /> Cheat
          {cheat.count > 0 && <span className="hud-count hud-count-cheat">{cheat.count}</span>}
        </button>
      </nav>
    </div>
  )
}
