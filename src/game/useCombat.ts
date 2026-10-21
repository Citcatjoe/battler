import { useEffect, useRef, useState } from 'react'
import {
  diceOf,
  dieAt,
  INITIATIVE_DIE,
  multiplier,
  other,
  rankAt,
  simulateCombat,
  type AppliedEffect,
  type Attack,
  type Beat,
  type CombatResult,
  type Pair,
  type Side,
} from './combat'
import {
  atCap,
  attackLog,
  coinLog,
  eventLog,
  flurryLog,
  pairLog,
  shiftLog,
  skipLog,
  statusDurationLog,
  statusExpireLog,
  statusReactionLog,
  statusTickLog,
  relicLog,
  type Badge,
  type LogEntry,
} from './narration'
import { SCENE_EVENTS, type SceneEventId } from './scenes'
import { STATUSES, type StatusId } from './statuses'
import { signalTargets, STATES, STATUS_PLACE } from './states'
import { doubleFace, type Trigger } from './events'
import { cueOf } from './cues'
import { attackSpecials, reactionSpecial, relicSpecial, SPECIAL_SIGNS, type SpecialBadge, type SpecialSign, type SpecialSpec } from './specials'
import { setSoundSpeed, sfx } from './sound'
import type { Polarity, Status } from './statuses'
import type { Character } from './character'

export interface DiceState {
  values: number[]
  /** Nombre de faces, pour colorer le jet maximal */
  faces: number
  rolling: boolean
  owner: Side | null
  label: string
  crit: boolean
  /** Critique imposé par un statut */
  critForced: boolean
  critMultiplier: number
  /** Rafale (Furie des vents) : plusieurs dés lancés ensemble, un coup par dé */
  volley?: boolean
  /** Pendant une rafale, le dé du coup en cours */
  active?: number
  /** Faces et couleur de chaque dé quand ils diffèrent (le d6 vert de Coup de chance) */
  dieFaces?: number[]
  dieColors?: (string | undefined)[]
  /** Pile ou face : une pièce remplace le dé ; `heads` absent tant qu'elle tournoie */
  coin?: { heads?: boolean }
  /** Un dé affiché a été imposé par l'observateur (mode triche) : marqué une fois retombé */
  forced?: boolean
  /** Zone de surcharge : ses labels, empilés en colonne dans l'ordre où ils s'appliquent (critique, Riposte…), voir specials.ts */
  specials?: SpecialBadge[]
}

/**
 * Saignement qui coule sur un coup (0.68.1) : l'étape de la plaie, jouée à l'impact du coup qui la fait
 * couler. `special` est son label de surcharge posé sous le dé (« Saignement +2 »).
 */
interface Flow {
  special: SpecialSpec
  effects: AppliedEffect[]
  hp: Pair<number>
  statuses: Pair<Status[]>
  log: Omit<LogEntry, 'id'>
}

/**
 * Statut posé par le coup qui vient de toucher (Aura de décoction, 2026-10-21) : l'étape de réaction qui suit le
 * coup, jouée à son impact (frappe + poison, frappe + poison), sans attente propre.
 */
interface Ride {
  side: Side
  effects: AppliedEffect[]
  statuses: Pair<Status[]>
  log: Omit<LogEntry, 'id'>
}

/** Effets tous refusés par le plafond (aura cumulable déjà à son maximum) : rien ne s'active, seul le texte neutre s'affiche. */
const capped = (effects: readonly AppliedEffect[]) => effects.length > 0 && effects.every(atCap)

/**
 * Purges à vide (rien à retirer) d'une compétence : leur texte « Rien à purifier » ne s'affiche que si la
 * compétence n'a rien retiré ni posé d'autre (Purification sans bonus adverse ni malus à soi : « Rien à
 * purifier », puis la lumière frappe), et une seule fois. Sinon il bruite (l'Aura d'immunité sans malus).
 */
function quietPurges(effects: AppliedEffect[]): AppliedEffect[] {
  const empty = (e: AppliedEffect) => e.type === 'cleanse' && e.removed.length === 0
  const did = effects.some((e) => (e.type === 'cleanse' && e.removed.length > 0) || e.type === 'applyStatus')
  const first = effects.findIndex(empty)
  return effects.filter((e, k) => !empty(e) || (!did && k === first))
}

/** Un coup en cours : sert de clé pour relancer les animations CSS. */
export interface Strike extends Attack {
  key: number
  landed: boolean
  /** Coup d'une rafale : élan raccourci */
  fast?: boolean
}

/**
 * Coup de compétence : des dégâts directs portés par une compétence ou un statut (Rétribution,
 * pièce sur pile, Épines, Riposte) joués comme un vrai coup, élan, impact et gros chiffre compris.
 * Rien n'est recalculé : les montants viennent de la chronologie (`parts` pour une relâche de jauges).
 */
export interface Blow {
  key: number
  from: Side
  to: Side
  damage: number
  /** Coup lourd (dernier coup d'une relâche, pièce) : chiffre doré, secousse */
  heavy: boolean
  /** Élan du lanceur vers sa cible ; sans élan pour une réaction (Épines) */
  lunge: boolean
  landed: boolean
}

/** Effets en train de s'afficher : un événement (avec son titre) ou un statut qui agit. */
export interface EffectFx {
  key: number
  /** Combattant à l'origine : reçoit l'aura et le titre */
  source: Side | null
  title: string
  effects: AppliedEffect[]
  /**
   * Une relique agit : elle s'annonce sur son emplacement (son sceau s'illumine, `RelicPulse`), pas sur le
   * personnage. Ni aura ni titre sur son porteur ; les badges arrivent sur la cible (docs/RELIQUES.md § 1).
   */
  relic?: true
  /** Textes qui ne viennent d'aucun effet, sur leur cible : « Tour perdu » sur celui qui perd son action (`skip`) */
  notes?: readonly (Badge & { target: Side })[]
}

/**
 * Événement de scène en cours (0.73.0, `scenes.ts`) : l'écran le joue sur toute l'arène. `key` relance
 * l'animation ; `source` lance, `target` reçoit (l'éclair de la Foudre tombe sur lui).
 */
export interface SceneFx {
  key: number
  id: SceneEventId
  source: Side
  target: Side
}

/** Mode triche : le prochain dé à venir (pas encore lancé à l'écran) et la valeur qui lui est imposée. */
/**
 * Dé de compétence qui sort : au moment où le dé tombe sur une face qui déclenche une compétence
 * (1, 2, 3, ou un double de la barde), le dé de cette face pulse dans l'en-tête de son camp (SkillDice).
 * `key` relance l'animation quand la même face sort deux fois de suite.
 */
export interface SkillPulse {
  side: Side
  face: number
  key: number
}

/**
 * Signal d'activation (0.79.0, deux niveaux de lecture) : quand une compétence ou une aura agit, une lueur part
 * de son sceau, dans l'en-tête de son camp, et file vers la zone d'état de chaque combattant où son effet
 * apparaît (`signalTargets`). L'état ne s'y montre qu'à son arrivée. `from` : id de la compétence ou de l'aura
 * (le `data-signal` de son sceau, SkillBar) ; `key` relance le vol.
 */
export interface SkillSignal {
  key: number
  side: Side
  from: string
  to: Side[]
  polarity: Polarity
}

/** Durée du vol d'un signal, de l'en-tête à la zone d'état (ms, à ×1) ; la même que `.signal-orb` (index.css). */
export const SIGNAL_MS = 340

/**
 * Relique qui agit : son sceau s'illumine dans l'en-tête de son camp (RelicSeals), qu'elle se déclenche
 * (étape `relic`) ou qu'elle renforce un coup (Fer à quatre clous, `Attack.relicBonus`). `key` relance l'éclat.
 */
export interface RelicPulse {
  side: Side
  relics: string[]
  key: number
}

/** Déclenchements de chaque relique depuis le début du combat, par camp (charges restantes à l'écran). */
export type RelicUses = Pair<Readonly<Record<string, number>>>

/** Face des dés de compétence (en-tête) qui correspond à un déclencheur du dé. */
const NATURAL_FACE: Partial<Record<Trigger, number>> = { naturalOne: 1, naturalTwo: 2, naturalThree: 3 }
export const skillFaceOf = (trigger: Trigger) => NATURAL_FACE[trigger] ?? doubleFace(trigger)

/**
 * Face de compétence du coup de l'étape `i` (une étape `attack`) : la compétence que son dé déclenche
 * (sur un 1, 2 ou 3), cherchée dans la suite du même tour, ou le coup transformé (Charge, Coup de griffe).
 * Lue dans la chronologie, jamais recalculée. Undefined si le jet ne déclenche rien.
 */
export function skillFaceAt(beats: Beat[], fighters: Pair<Character>, i: number): number | undefined {
  const beat = beats[i]
  if (beat?.type !== 'attack') return undefined
  const attack = beat.attack
  const own = fighters[attack.attacker].events
  if (attack.reshaped) {
    const trigger = own.find((e) => e.id === attack.reshaped!.event)?.trigger
    return trigger && skillFaceOf(trigger)
  }
  for (let j = i + 1; j < beats.length && beats[j].turn === beat.turn; j++) {
    const next = beats[j]
    if (next.type === 'attack') break
    if (next.type === 'event' && next.event.side === attack.attacker) {
      const face = skillFaceOf(next.event.trigger)
      if (face !== undefined) return face
    }
  }
  return undefined
}

/** Annonce du passage de main, avec l'élision devant une voyelle (« Au tour d'Elaria »). */
export const turnLabel = (name: string) => (/^[aeiouyàâäéèêëîïôöûü]/i.test(name) ? `Au tour d'${name}` : `Au tour de ${name}`)

/** Passage de main : pause entre la fin du tour d'un combattant et le début du tour de l'autre (ms, à ×1). */
export const HANDOVER_MS = 400

export interface CheatState {
  /** Faux sans graine : le combat ne peut pas être résolu à nouveau */
  available: boolean
  /** Rang du prochain dé (voir `SimulateOptions.forcedRolls`) */
  rank: number
  /** Ce dé : lanceur, faces (2 pour la pièce) ; absent si le combat n'en lance plus */
  next?: { side: Side; faces: number; coin: boolean }
  /** Valeur imposée à ce dé, s'il y en a une */
  forced?: number
  /** Nombre de dés imposés depuis le début du combat */
  count: number
  /** Combat test : la lecture est arrêtée sur ce dé, en attendant le choix du joueur */
  waiting: boolean
}

const ABORTED = Symbol('aborted')

const IDLE_DICE: DiceState = {
  values: [],
  faces: 0,
  rolling: false,
  owner: null,
  label: '',
  crit: false,
  critForced: false,
  critMultiplier: 1,
}

/**
 * Met en scène un combat déjà résolu par `simulateCombat` : mêmes jets, même issue,
 * seul le rythme (vitesse, pause) dépend de l'affichage. Chaque type d'étape de la
 * chronologie a sa mise en scène ci-dessous ; aucune règle n'est recalculée ici.
 *
 * `test` (combat test) : pas d'initiative animée, et la lecture s'arrête avant chaque dé jusqu'à
 * ce que le joueur le choisisse (`forceNextRoll`, null pour le hasard). C'est le mécanisme du mode
 * triche : chaque choix fait résoudre le combat à nouveau par le moteur, avec la même graine.
 */
export function useCombat(script: CombatResult, onEnd: (result: CombatResult) => void, { test = false } = {}) {
  const { fighters } = script
  const [hp, setHp] = useState<Pair<number>>([fighters[0].maxHp, fighters[1].maxHp])
  // Statuts de forme (druide, 0.73.0) : présents dès l'entrée en scène
  const [statuses, setStatuses] = useState<Pair<Status[]>>(() => [0, 1].map((side) => (fighters[side].forms?.[0].statuses ?? []).map((id) => ({ id, stacks: 1 }))) as Pair<Status[]>)
  const [dice, setDice] = useState<DiceState>(IDLE_DICE)
  const [strike, setStrike] = useState<Strike | null>(null)
  const [fx, setFx] = useState<EffectFx | null>(null)
  const [scene, setScene] = useState<SceneFx | null>(null)
  const [blow, setBlow] = useState<Blow | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [turn, setTurn] = useState(0)
  /** Forme de chaque combattant (druide) : index dans `Character.forms` */
  const [forms, setForms] = useState<Pair<number>>([0, 0])
  const [winner, setWinner] = useState<Side | null>(null)
  /** Le combattant dont c'est le tour (null avant l'initiative et après le K.O.) */
  const [active, setActive] = useState<Side | null>(null)
  const [pulse, setPulse] = useState<SkillPulse | null>(null)
  const [signal, setSignal] = useState<SkillSignal | null>(null)
  const [relicPulse, setRelicPulse] = useState<RelicPulse | null>(null)
  const [relicUses, setRelicUses] = useState<RelicUses>([{}, {}])
  const [speed, setSpeed] = useState(1)
  const [paused, setPaused] = useState(false)

  const speedRef = useRef(speed)
  const pausedRef = useRef(paused)
  speedRef.current = speed
  pausedRef.current = paused

  // Les sons du combat s'écourtent avec la vitesse ; hors combat, ils jouent en entier
  useEffect(() => {
    setSoundSpeed(speed)
    return () => setSoundSpeed(1)
  }, [speed])

  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const [cheat, setCheat] = useState<CheatState>(() => ({
    available: script.seed !== undefined,
    rank: 0,
    next: dieAt(script, 0),
    count: 0,
    waiting: false,
  }))
  /** Le combat tel qu'il se résout maintenant (différent de `script` dès qu'un dé est imposé) */
  const [resolved, setResolved] = useState(script)
  /** Branché par la lecture en cours : impose (ou retire, avec null) la valeur du prochain dé */
  const forceRef = useRef<(value: number | null) => void>(() => {})

  useEffect(() => {
    let aborted = false
    let logId = 0
    let fxId = 0
    let strikeId = 0
    let pulseId = 0
    let signalId = 0
    let relicPulseId = 0
    let specialId = 0
    const [a, b] = fighters

    // PV affichés, retenus pour faire tomber une relâche de jauges coup par coup
    let shownHp: Pair<number> = [a.maxHp, b.maxHp]
    const showHp = (next: Pair<number>) => {
      shownHp = next
      setHp(next)
    }

    /*
     * Mode triche. Le combat est déjà résolu ; imposer un dé le résout à nouveau, avec la même graine,
     * depuis le moteur (`forcedRolls`). Tout ce qui précède ce dé est identique, donc la lecture continue
     * à la même étape, sur la nouvelle chronologie. `committed` : dés déjà lancés à l'écran, intouchables.
     */
    let current = script
    const forced: Record<number, number> = {}
    let committed = 0
    /** Combat test : le dé de rang `committed` attend le choix du joueur */
    let waiting = false
    const publishCheat = () =>
      setCheat({
        available: script.seed !== undefined,
        rank: committed,
        next: dieAt(current, committed),
        forced: forced[committed],
        count: Object.keys(forced).length,
        waiting,
      })
    const rankOf = (i: number) => rankAt(current.beats, i)
    const commit = (upTo: number) => {
      if (upTo <= committed) return
      committed = upTo
      publishCheat()
    }
    forceRef.current = (value) => {
      if (script.seed === undefined || dieAt(current, committed) === undefined) return
      if (value === null) delete forced[committed]
      else forced[committed] = value
      current = simulateCombat(fighters, { seed: script.seed, forcedRolls: forced })
      setResolved(current)
      // Combat test : le choix est fait, la lecture reprend
      waiting = false
      publishCheat()
    }
    setResolved(script)
    setForms([0, 0])
    setActive(null)
    setPulse(null)
    setRelicPulse(null)
    setRelicUses([{}, {}])
    publishCheat()

    // Attente qui respecte la vitesse et la pause.
    const wait = (ms: number) =>
      new Promise<void>((resolve, reject) => {
        let left = ms
        let last = performance.now()
        const tick = (now: number) => {
          if (aborted) return reject(ABORTED)
          if (!pausedRef.current) left -= (now - last) * speedRef.current
          last = now
          if (left <= 0) resolve()
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })

    /**
     * Combat test : chaque dé, du prochain jusqu'au rang `upTo` exclu, attend le choix du joueur avant
     * d'être lancé. Un choix peut raccourcir le combat (K.O.) : on s'arrête quand il n'y a plus de dé.
     */
    const choose = async (upTo: number) => {
      if (!test) return
      while (committed < upTo && dieAt(current, committed) !== undefined) {
        waiting = true
        publishCheat()
        while (waiting) await idle()
        commit(committed + 1)
      }
    }
    // Attente du joueur : hors vitesse et pause
    const idle = () =>
      new Promise<void>((resolve, reject) => setTimeout(() => (aborted ? reject(ABORTED) : resolve()), 50))

    const push = (entry: Omit<LogEntry, 'id'>) => setLog((l) => [...l, { ...entry, id: logId++ }])

    /** Son d'une compétence ou d'un statut, déduit de ses effets (`cueOf`, `docs/SONS.md` § 4.2). */
    const cueFor = (source: Side | null, effects: AppliedEffect[]) => {
      const cue = cueOf(source, effects)
      if (cue) sfx[cue]()
    }

    /*
     * Son des labels (docs/SONS.md § 4.4) : déduit du signe du label (le ding de Pile réussie pour +, Malus reçu pour
     * −, `SPECIAL_SIGNS`). Les labels posés au même instant (même passage synchrone, entre deux attentes) n'en jouent
     * qu'un par signe.
     */
    let pendingCues: Set<SpecialSign> | null = null
    const labelCue = (sign: SpecialSign) => {
      if (!pendingCues) {
        const cues = (pendingCues = new Set())
        queueMicrotask(() => {
          pendingCues = null
          if (aborted) return
          for (const s of cues) sfx[SPECIAL_SIGNS[s].cue]()
        })
      }
      pendingCues.add(sign)
    }
    /**
     * Empile un label dans la zone de surcharge (une seule fois par libellé pour un même jet) et joue son son, sauf
     * `silent` : l'effet de la même frappe joue déjà ce son-là (les Épines et leur Malus reçu, SONS.md § 4.4 règle 5).
     */
    const addSpecial = (spec: SpecialSpec, silent = false) => {
      if (!silent) labelCue(spec.sign)
      setDice((d) =>
        d.specials?.some((x) => x.label === spec.label) ? d : { ...d, specials: [...(d.specials ?? []), { key: specialId++, ...spec }] },
      )
    }
    /**
     * Surcharges du coup au résultat du dé (`attackSpecials`, specials.ts) : l'esquive assurée, le bonus d'une relique
     * de coup (Fer à quatre clous), dont le sceau s'illumine au même instant.
     */
    const rollSpecials = (attack: Attack) => {
      if (attack.relicBonus?.length && !attack.dodged)
        setRelicPulse({ side: attack.attacker, relics: attack.relicBonus.map((b) => b.relic), key: relicPulseId++ })
      for (const s of attackSpecials(attack).roll) addSpecial(s)
    }
    /**
     * La plaie du défenseur coule sur ce coup : son label de surcharge (« Saignement +2 », + pour l'attaquant) tombe
     * sous le dé à l'impact, avec son ding, puis ses PV perdus suivent d'un battement, sur la même frappe (son Ronge).
     */
    async function bleedOut(flow: Flow) {
      addSpecial(flow.special)
      await wait(140)
      sfx.rot()
      setFx({ key: fxId++, source: null, title: '', effects: flow.effects })
      showHp(flow.hp)
      setStatuses(flow.statuses)
      push(flow.log)
    }
    /**
     * Le statut posé par ce coup (poison de l'Aura de décoction) tombe à son impact : son texte sur la cible, la zone
     * d'état, le journal ; son son (Malus reçu) suit le Coup d'un battement, sans retenir la frappe (SONS.md § 4.1).
     */
    const landRide = (ride: Ride) => {
      setFx({ key: fxId++, source: null, title: '', effects: ride.effects })
      setStatuses(ride.statuses)
      push(ride.log)
      wait(120).then(
        () => cueFor(ride.side, ride.effects),
        () => {},
      )
    }

    /**
     * Coups de compétence : chaque montant (ou chaque jauge d'une relâche) part comme un coup, en
     * rafale ; les PV tombent coup par coup. Le dernier d'une série est lourd (secousse, chiffre doré).
     * `schedule` (événement de scène) : l'instant de chaque impact (ms depuis l'appel) ; les coups sont
     * alors égaux, aucun n'est lourd (la Foudre ne fait jamais de critique, rien ne doit y ressembler).
     */
    async function playBlows(
      from: Side,
      hits: AppliedEffect[],
      lunge: boolean,
      sound: (damage: number, heavy: boolean) => void,
      schedule?: readonly number[],
    ) {
      const parts = hits.flatMap((e) => (e.type === 'damage' ? (e.parts ?? [e.amount]).map((n) => ({ n, to: e.target })) : []))
      let elapsed = 0
      for (const [k, part] of parts.entries()) {
        const at = schedule?.[k]
        const heavy = at === undefined && (parts.length > 1 ? k === parts.length - 1 : part.n >= 10)
        const key = strikeId++
        const wind = lunge ? 170 : 60
        // Au rythme imposé, le chiffre du coup précédent reste à l'écran jusqu'à l'élan de celui-ci
        if (at !== undefined) {
          await wait(Math.max(0, at - wind - elapsed))
          elapsed = Math.max(elapsed, at)
        }
        setBlow({ key, from, to: part.to, damage: part.n, heavy, lunge, landed: false })
        await wait(wind)
        if (heavy) await wait(90) // arrêt sur image avant le gros coup
        sound(part.n, heavy)
        const hp = [...shownHp] as Pair<number>
        hp[part.to] = Math.max(0, hp[part.to] - part.n)
        showHp(hp)
        setBlow({ key, from, to: part.to, damage: part.n, heavy, lunge, landed: true })
        if (at === undefined || k === parts.length - 1) await wait(k === parts.length - 1 ? 520 : 260)
      }
      setBlow(null)
    }

    /**
     * Affiche des effets ; `apply` met à jour PV, statuts et journal au moment de l'apparition.
     * `blows` : les dégâts directs sur l'adversaire de `source` sont joués comme des coups (avec ou
     * sans élan) au lieu d'un simple badge. `cue` : son imposé, sinon déduit des effets (`cueFor`).
     */
    const showEffects = async (
      source: Side | null,
      title: string,
      effects: AppliedEffect[],
      apply: () => void,
      opts: {
        blows?: 'lunge' | 'reaction'
        cue?: () => void
        impact?: (damage: number, heavy: boolean) => void
        /** Attente avant l'apparition : 0 quand l'effet tombe avec le dé qui le déclenche (voir `grouped`) */
        lead?: number
        /**
         * Label de surcharge posé à l'apparition ; il reste muet si l'effet déduit joue déjà le son de son signe
         * (les Épines et leur Malus reçu, SONS.md § 4.4 règle 5)
         */
        special?: SpecialSpec
        /** Au moment de l'apparition, avec le son et les textes (le sceau d'une relique qui s'illumine) */
        onShow?: () => void
        /** Temps de lecture après l'effet (1 300 ms) ; plus court quand des frappes instantanées suivent */
        hold?: number
        /** Effet d'une relique : ni aura ni titre sur la source (voir `EffectFx.relic`) */
        relic?: true
        /** Instants des impacts, depuis l'apparition (événement de scène, voir `playBlows`) */
        schedule?: readonly number[]
        /**
         * Compétence ou aura d'où part un signal d'activation (`SkillSignal`) : s'il pose un état visible, la lueur
         * file de son sceau à la zone d'état de la cible, et l'effet n'apparaît qu'à son arrivée.
         */
        signal?: string
        /** Textes posés sur leur cible avec les effets (voir `EffectFx.notes`) */
        notes?: EffectFx['notes']
      } = {},
    ) => {
      const hits =
        source !== null && opts.blows ? effects.filter((e) => e.type === 'damage' && e.target !== source && e.amount > 0) : []
      const lead = opts.lead ?? 250
      if (lead > 0) await wait(lead)
      const aim = opts.signal !== undefined && source !== null ? signalTargets(effects) : undefined
      if (aim) {
        setSignal({ key: signalId++, side: source!, from: opts.signal!, ...aim })
        await wait(SIGNAL_MS)
      }
      opts.onShow?.()
      ;(opts.cue ?? (() => cueFor(source, effects)))()
      setFx({
        key: fxId++,
        source,
        title,
        effects: effects.filter((e) => !hits.includes(e)),
        ...(opts.relic && { relic: true as const }),
        ...(opts.notes && { notes: opts.notes }),
      })
      if (opts.special) addSpecial(opts.special, !opts.cue && cueOf(source, effects) === SPECIAL_SIGNS[opts.special.sign].cue)
      if (hits.length > 0 && source !== null) {
        await wait(200)
        await playBlows(source, hits, opts.blows === 'lunge', opts.impact ?? ((_, heavy) => (heavy ? sfx.crit() : sfx.hit())), opts.schedule?.map((t) => t - 200))
        apply()
        await wait(500)
      } else {
        apply()
        await wait(opts.hold ?? 1300)
      }
      setFx(null)
    }

    /**
     * Rafale : tous les dés roulent ensemble, le second jaillit en tournoyant (Furie des vents), ou
     * apparaît dans sa couleur s'il est d'une autre sorte (le d6 de Coup de chance).
     */
    /**
     * `flat` : rafale instantanée (Furie des vents), déclenchée par le dé qui vient de tomber. Pas de nouveau lancer :
     * les dés des coups apparaissent d'un coup, à plat. La rafale est une action qui se déclenche, pas une surcharge :
     * aucun label (son statut s'annonce par le sceau de sa compétence) ; la colonne se vide pour ses coups.
     */
    async function rollVolley(attacks: Attack[], color?: string, flat = false) {
      const { attacker, faces } = attacks[0]
      const shown = {
        ...IDLE_DICE,
        faces,
        owner: attacker,
        label: `${fighters[attacker].name} · ${attacks.length} coups`,
        volley: true,
        dieFaces: attacks.map((a) => a.faces),
        dieColors: attacks.map((_, k) => (k > 0 ? color : undefined)),
      }
      if (flat) {
        setDice({ ...shown, values: attacks.map((a) => a.roll), forced: attacks.some((a) => a.forced) })
        await wait(250)
        return
      }
      setDice({ ...shown, values: attacks.map(() => 0), rolling: true })
      // Un seul dé lancé et un seul dé posé pour toute la rafale : un instant, un son
      sfx.diceRoll(900 / speedRef.current)
      await wait(900)
      sfx.diceLand()
      setDice({ ...shown, values: attacks.map((a) => a.roll), forced: attacks.some((a) => a.forced) })
      await wait(400)
    }

    /** Le son d'un coup qui arrive : Esquive, Coup critique ou Coup. */
    const strikeSound = (attack: Attack) => (attack.dodged ? sfx.dodge() : attack.crit ? sfx.crit() : sfx.hit())

    /** Un coup de la rafale : pas de nouveau jet, élan court, impact presque immédiat. */
    /**
     * `skillFace`, `grouped` : un dé de la rafale qui déclenche une compétence (un 2 relance la Furie) ; voir `playAttack`.
     * `flow` : la plaie qui coule à l'impact ; `ride` : le statut que ce coup pose, à son impact. Chaque coup est une
     * étape : sa zone de surcharge repart vide, puis montre les siennes (`attackSpecials`) à leur instant.
     */
    async function playVolleyStrike(
      t: number,
      index: number | undefined,
      attack: Attack,
      after: Pair<number>,
      afterStatuses: Pair<Status[]>,
      skillFace?: number,
      grouped = false,
      flow?: Flow,
      ride?: Ride,
    ) {
      const specials = attackSpecials(attack)
      setDice((d) => ({ ...d, active: index, crit: attack.crit, critForced: attack.critForced, critMultiplier: attack.critMultiplier, specials: undefined }))
      rollSpecials(attack)
      for (const s of specials.crit) addSpecial(s)
      if (attack.forfeited) {
        // Le dé de la rafale ressort, son dé de l'en-tête s'allume, et sa compétence suit sans attente
        pulseSkill(attack.attacker, skillFace)
        showHp(after)
        setStatuses(afterStatuses)
        push(attackLog(t, attack, fighters, after[other(attack.attacker)]))
        await wait(grouped ? 120 : 250)
        return
      }
      const key = strikeId++
      setStrike({ ...attack, key, landed: false, fast: true })
      await wait(170)
      if (attack.crit && !attack.dodged) await wait(90)
      strikeSound(attack)
      showHp(after)
      setStatuses(afterStatuses)
      setStrike({ ...attack, key, landed: true, fast: true })
      for (const s of specials.impact) addSpecial(s)
      push(attackLog(t, attack, fighters, after[other(attack.attacker)]))
      if (ride) landRide(ride)
      if (flow) await bleedOut(flow)
      await wait(flow ? 220 : 260)
      setStrike(null)
      if (flow || ride) setFx(null)
    }

    /** Deux dés (barde) : la paire roule ensemble et retombe ; un double qui a sa compétence est annoncé. */
    async function rollPair(side: Side, rolls: [number, number], faces: number, skill: string | undefined, forced: boolean, double?: number) {
      const shown = { ...IDLE_DICE, faces, owner: side, label: `${fighters[side].name} · deux dés`, volley: true }
      setDice({ ...shown, values: [0, 0], rolling: true })
      sfx.diceRoll(900 / speedRef.current)
      await wait(900)
      sfx.diceLand()
      // Un double, quel qu'il soit : le « ding » de la chance, en même temps que les dés (0.46.0, SONS.md § 4.1). La
      // compétence du double (Crescendo, Soliste) se déclenche : son sceau le dit, elle n'a pas de label de surcharge
      if (rolls[0] === rolls[1]) sfx.coinWin()
      if (skill) pulseSkill(side, double)
      setDice({ ...shown, values: rolls, forced, label: skill ? `DOUBLE ${rolls[0]} !` : shown.label })
      // Un double qui a sa compétence : elle tombe avec la paire (étape suivante, sans attente)
      if (!skill) await wait(400)
    }

    /**
     * Pile ou face : la pièce remplace le dé, tournoie, retombe ; pile, les dégâts tombent sur l'adversaire.
     * `ride` : le statut que le coup de pile pose (Aura de décoction), à son impact. La pièce est une action qui se
     * déclenche, pas une surcharge : aucun label (décision de l'utilisateur, 2026-10-21), le libellé « PILE ! » suffit.
     */
    async function playCoin(
      t: number,
      side: Side,
      heads: boolean,
      effects: AppliedEffect[],
      after: Pair<number>,
      afterStatuses: Pair<Status[]>,
      forced?: boolean,
      ride?: Ride,
    ) {
      const shown = { ...IDLE_DICE, owner: side, label: `${fighters[side].name} · Pile ou face` }
      setStatuses(afterStatuses)
      setDice({ ...shown, coin: {} })
      sfx.coinToss(1200 / speedRef.current)
      await wait(1200)
      sfx.coinLand()
      setDice({ ...shown, coin: { heads }, label: heads ? 'PILE !' : 'FACE…', forced })
      // Le résultat tombe d'un bloc : la pièce, son libellé, le « ding » de la réussite (SONS.md § 4.1) et le texte
      // flottant. Puis un temps pour le lire, et seulement alors la frappe.
      if (heads) sfx.coinWin()
      setFx({ key: fxId++, source: side, title: heads ? 'Pile !' : 'Face…', effects: [] })
      await wait(650)
      // Pile : la voleuse fond sur sa cible, un seul coup lourd ; le poison qu'il pose tombe avec lui
      if (heads)
        await playBlows(side, effects, true, () => {
          sfx.crit()
          if (ride) landRide(ride)
        })
      showHp(after)
      push(coinLog(t, side, heads, effects, fighters))
      await wait(heads ? 700 : 1000)
      setFx(null)
    }

    /** Le dé de compétence de cette face pulse dans l'en-tête, au moment où le dé tombe. */
    const pulseSkill = (side: Side, face: number | undefined) => {
      if (face !== undefined) setPulse({ side, face, key: pulseId++ })
    }

    /**
     * `grouped` : le jet déclenche une compétence qui remplace le coup ; tout tombe ensemble, au moment où le
     * dé s'arrête (dé de l'en-tête, nom de la compétence, statut, son) : l'étape suivante suit sans attente.
     * `flow` : la plaie du défenseur qui coule à l'impact ; `ride` : le statut que ce coup pose, à son impact.
     * Zone de surcharge (`attackSpecials`) : chaque label à l'instant où il s'applique, dans l'ordre du livre de règles.
     */
    async function playAttack(
      t: number,
      attack: Attack,
      after: Pair<number>,
      afterStatuses: Pair<Status[]>,
      skillFace?: number,
      grouped = false,
      flow?: Flow,
      ride?: Ride,
    ) {
      const { attacker, faces } = attack
      const label = `${fighters[attacker].name} attaque`
      const shown = { ...IDLE_DICE, faces, owner: attacker, label, critMultiplier: attack.critMultiplier }
      const specials = attackSpecials(attack)

      setDice({ ...shown, values: [0], rolling: true })
      sfx.diceRoll(800 / speedRef.current)
      await wait(800)
      sfx.diceLand()
      // Une compétence qui accompagne le coup (Pourfendre) ne part que s'il touche : son dé s'allume à l'impact
      const rides = !attack.forfeited && !attack.reshaped
      if (!rides) pulseSkill(attacker, skillFace)
      // Au résultat du dé : l'esquive assurée, le bonus d'une relique de coup (il vaut dès que le dé montre sa face)
      setDice({ ...shown, values: [attack.roll], forced: attack.forced })
      rollSpecials(attack)

      // Coup sacrifié par une compétence : pas d'élan, la compétence qui suit prend le relais.
      if (attack.forfeited) {
        showHp(after)
        setStatuses(afterStatuses)
        push(attackLog(t, attack, fighters, after[other(attacker)]))
        if (!grouped) await wait(650)
        return
      }

      await wait(350)
      if (attack.crit) {
        setDice((d) => ({ ...d, crit: true, critForced: attack.critForced }))
        for (const s of specials.crit) addSpecial(s)
        await wait(450)
      }

      // Élan vers l'adversaire, muet ; l'impact (ou l'esquive) tombe au milieu de l'animation.
      const key = strikeId++
      setStrike({ ...attack, key, landed: false })
      await wait(300)
      // Critique : un arrêt sur image avant l'impact, puis un coup plus lourd
      if (attack.crit && !attack.dodged) await wait(110)
      strikeSound(attack)
      showHp(after)
      setStatuses(afterStatuses)
      setStrike({ ...attack, key, landed: true })
      // À l'impact : ce qui change les dégâts de ce coup et s'use sur lui (Luciole, bouclier, Fausse note)
      for (const s of specials.impact) addSpecial(s)
      if (rides) pulseSkill(attacker, skillFace)
      push(attackLog(t, attack, fighters, after[other(attacker)]))
      // Le statut que ce coup pose (poison de l'Aura de décoction) tombe avec l'impact : frappe + poison
      if (ride) landRide(ride)
      // Saignement : la plaie coule sur cette frappe, son label tombe avec l'impact
      if (flow) await bleedOut(flow)
      await wait(flow ? 650 : 550)
      setStrike(null)
      if (flow || ride) setFx(null)
    }

    async function run() {
      const startedAt = performance.now()

      if (!test) await wait(500)
      push({ kind: 'info', text: `${a.name} (${a.maxHp} PV) affronte ${b.name} (${b.maxHp} PV) !` })

      // Initiative : chacun lance un dé, le plus haut commence (relance sur égalité). Combat test :
      // seulement notée au journal, on entre directement dans le combat.
      const initDice = { ...IDLE_DICE, faces: INITIATIVE_DIE, label: 'Initiative' }
      for (const [ia, ib] of script.initiative) {
        if (!test) {
          setDice({ ...initDice, values: [0, 0], rolling: true })
          sfx.diceRoll(900 / speedRef.current)
          await wait(900)
          sfx.diceLand()
          setDice({ ...initDice, values: [ia, ib] })
        }
        push({ kind: 'initiative', text: `Initiative — ${a.name} : ${ia}, ${b.name} : ${ib}` })
        if (!test) await wait(1000)
        if (ia === ib) push({ kind: 'info', text: 'Égalité ! On relance.' })
      }
      const [lastA, lastB] = script.initiative[script.initiative.length - 1]
      const first: Side = lastA > lastB ? 0 : 1
      push({ kind: 'info', text: `${fighters[first].name} frappe en premier.`, side: first })
      if (test) setDice({ ...IDLE_DICE, owner: first, label: turnLabel(fighters[first].name) })
      else await wait(700)

      /*
       * Synchronisation : quand un statut agit (poison au début du tour…), le décompte de sa
       * durée ou son expiration, qui suivent dans la même phase, sont montrés en même temps que
       * son effet. Le « −2 » flottant et le compteur qui passe de 3 à 2 (ou à 0) tombent ensemble.
       * Ces anticipations restent appliquées jusqu'à l'étape qui les réalise.
       */
      type Preview = { side: Side; status: StatusId; turns?: number; until: number }
      let previews: Preview[] = []
      const display = (state: Pair<Status[]>): Pair<Status[]> =>
        previews.length === 0
          ? state
          : (state.map((list, side) =>
              list.flatMap((s) => {
                const p = previews.filter((x) => x.side === side && x.status === s.id)
                if (p.some((x) => x.turns === undefined)) return []
                const turns = p.find((x) => x.turns !== undefined)?.turns
                return turns === undefined ? [s] : [{ ...s, turns }]
              }),
            ) as Pair<Status[]>)
      const show = (state: Pair<Status[]>) => setStatuses(display(state))
      const anticipate = (i: number) => {
        const tick = current.beats[i]
        if (tick.type !== 'statusTick') return
        for (const [j, next] of current.beats.entries()) {
          if (j <= i) continue
          const samePhase =
            (next.type === 'statusTick' || next.type === 'statusDuration' || next.type === 'statusExpire') &&
            next.turn === tick.turn &&
            next.side === tick.side &&
            next.phase === tick.phase
          if (!samePhase) break
          if (next.type === 'statusDuration') {
            const change = next.changes.find((c) => c.status === tick.status)
            if (change) previews.push({ side: tick.side, status: tick.status, turns: change.to, until: j })
          }
          if (next.type === 'statusExpire' && next.statuses.includes(tick.status))
            previews.push({ side: tick.side, status: tick.status, until: j })
        }
      }
      /** Ce statut de cette étape a déjà été montré avec l'effet qui la précède : pas besoin d'une pause de plus. */
      const previewed = (i: number, status: StatusId) => previews.some((p) => p.until === i && p.status === status)

      // Rafale en cours (Furie des vents) : les index de ses coups, dans l'ordre, et le prochain à jouer.
      // Des index plutôt que les étapes : la chronologie peut être remplacée en cours de route (mode triche).
      // `pointed` : chaque coup désigne son dé (rafale, deux coups de la barde) ; faux pour les coups d'un double
      let volley: { strikes: number[]; next: number; pointed: boolean } | null = null
      // L'étape précédente a été un jet qui déclenche une compétence : celle-ci tombe avec lui, sans attente
      let snap = false

      /**
       * Saignement : l'étape qui suit le coup `i` est la plaie du défenseur qui coule ; elle est jouée à
       * l'impact du coup (`bleedOut`), et son étape n'a plus rien à montrer (`flowShown`). Une plaie séparée du
       * coup par une autre étape (Riposte, épines posées avant elle) garde sa propre étape, avec le même label.
       */
      const flowAt = (i: number): Flow | undefined => {
        const hit = current.beats[i]
        const next = current.beats[i + 1]
        if (hit.type !== 'attack' || next?.type !== 'statusReaction' || next.side !== other(hit.attack.attacker)) return undefined
        const wound = next.effects.some((e) => e.type === 'damage' && e.target === next.side && e.amount > 0)
        const special = reactionSpecial(next.status, 'defender', next.effects)
        if (!wound || !special) return undefined
        return {
          special,
          effects: next.effects,
          hp: next.state.hp,
          statuses: display(next.state.statuses),
          log: statusReactionLog(next.side, next.status, next.effects, fighters),
        }
      }
      let flowShown = -1

      /**
       * Statut posé par le coup `i` qui vient de toucher (attaque, ou pièce sur pile) : l'étape suivante est la réaction
       * au coup du frappeur, qui ne fait que poser des statuts sur sa cible (le poison de l'Aura de décoction). Elle est
       * jouée à l'impact du coup (`landRide`), et son étape n'a plus rien à montrer (`rideShown`) : frappe + poison.
       */
      const rideAt = (i: number): Ride | undefined => {
        const hit = current.beats[i]
        const next = current.beats[i + 1]
        const striker = hit.type === 'attack' ? hit.attack.attacker : hit.type === 'coin' ? hit.side : undefined
        if (striker === undefined || !next) return undefined
        const onTarget = (effects: readonly AppliedEffect[]) => effects.length > 0 && effects.every((e) => e.type === 'applyStatus' && e.target !== striker)
        // Compétence qui accompagne le coup s'il touche (Pourfendre : Saignement) : son statut tombe à l'impact
        if (next.type === 'event' && next.event.side === striker && hit.type === 'attack') {
          const def = fighters[striker].events.find((e) => e.id === next.event.eventId)
          if (!def?.needsTouch || !onTarget(next.event.effects)) return undefined
          return { side: striker, effects: next.event.effects, statuses: display(next.state.statuses), log: eventLog(next.event, fighters) }
        }
        if (next.type !== 'statusReaction' || next.side !== striker || next.trigger !== 'hit' || !onTarget(next.effects)) return undefined
        return {
          side: striker,
          effects: next.effects,
          statuses: display(next.state.statuses),
          log: statusReactionLog(next.side, next.status, next.effects, fighters),
        }
      }
      let rideShown = -1

      // Le tour t appartient à celui qui a commencé s'il est impair, à l'autre s'il est pair (les tours alternent)
      const ownerOf = (t: number): Side => (t % 2 === 1 ? first : other(first))
      setActive(first)

      // `current.beats` est relu à chaque étape : un dé imposé en remplace la suite
      for (let i = 0; i < current.beats.length; i++) {
        const snapped = snap
        snap = false
        // Passage de main : le plateau de dés se vide et annonce le suivant, son camp s'allume, un temps de pause
        if (i > 0 && current.beats[i].turn !== current.beats[i - 1].turn) {
          const next = ownerOf(current.beats[i].turn)
          setTurn(current.beats[i].turn)
          setActive(next)
          setDice({ ...IDLE_DICE, owner: next, label: turnLabel(fighters[next].name) })
          await wait(HANDOVER_MS)
        }
        // Combat test : les dés de cette étape attendent le choix du joueur (l'étape peut en sortir changée)
        await choose(rankOf(i) + diceOf(current.beats[i]).length)
        const beat = current.beats[i]
        setTurn(beat.turn)
        anticipate(i)
        const rolled = diceOf(beat).length
        if (rolled > 0) commit(rankOf(i) + rolled)
        switch (beat.type) {
          case 'attack': {
            const flow = flowAt(i)
            if (flow) flowShown = i + 1
            const ride = rideAt(i)
            if (ride) rideShown = i + 1
            if (volley && volley.strikes.includes(i)) {
              const index = volley.next++
              const face = skillFaceAt(current.beats, fighters, i)
              const grouped = beat.attack.forfeited === true && face !== undefined && current.beats[i + 1]?.type === 'event'
              await playVolleyStrike(
                beat.turn,
                volley.pointed ? index : undefined,
                beat.attack,
                beat.state.hp,
                display(beat.state.statuses),
                face,
                grouped,
                flow,
                ride,
              )
              const last = volley.next === volley.strikes.length
              if (last) volley = null
              if (grouped) snap = true
              else await wait(last ? 450 : 60)
              break
            }
            const face = skillFaceAt(current.beats, fighters, i)
            const next = current.beats[i + 1]
            const grouped = beat.attack.forfeited === true && face !== undefined && next?.type === 'event'
            await playAttack(beat.turn, beat.attack, beat.state.hp, display(beat.state.statuses), face, grouped, flow, ride)
            if (grouped) snap = true
            else await wait(450)
            break
          }
          case 'event':
            // Un coup transformé (Charge…) a déjà été joué avec le coup : la compétence n'est que notée. Une compétence
            // qui accompagne le coup (Pourfendre) a déjà posé son statut à l'impact (`rideAt`, `landRide`).
            if (i === rideShown) {
              show(beat.state.statuses)
              break
            }
            if (fighters[beat.event.side].events.find((e) => e.id === beat.event.eventId)?.reshapesHit) {
              push(eventLog(beat.event, fighters))
              setFx(null)
              break
            }
            // Dégâts directs d'une compétence (Rétribution…) : de vrais coups, un par jauge. Une compétence à
            // événement de scène (Foudre) le lance d'abord : ses dégâts tombent au moment de l'impact, sans élan
            {
              const def = fighters[beat.event.side].events.find((e) => e.id === beat.event.eventId)
              const timing = def?.scene ? SCENE_EVENTS[def.scene] : undefined
              // Purge à vide : « Rien à purifier » seulement si la compétence n'a rien fait d'autre (voir `quietPurges`)
              const effects = quietPurges(beat.event.effects)
              // Aura cumulable déjà à son maximum : rien ne s'active, seul le texte neutre « … au maximum » s'affiche
              // sur la cible (ni aura, ni label, ni son)
              const idle = capped(effects)
              if (def?.scene) setScene({ key: fxId++, id: def.scene, source: beat.event.side, target: other(beat.event.side) })
              // Aucun nom flottant au-dessus du lanceur (2026-10-21) : son sceau dans la barre de compétences s'allume
              // déjà. Une compétence qui se déclenche n'a pas de label de surcharge (RESOLUTION.md, « Zone de surcharge »)
              await showEffects(
                idle ? null : beat.event.side,
                '',
                effects,
                () => {
                  showHp(beat.state.hp)
                  show(beat.state.statuses)
                  push(eventLog(beat.event, fighters))
                },
                // Le coup lourd (le dernier d'une relâche) sonne comme un critique
                {
                  blows: timing ? 'reaction' : 'lunge',
                  // Avec une scène : chaque coup tombe sur un impact (un éclair de la Foudre), au son du tonnerre
                  lead: timing || snapped ? 0 : undefined,
                  ...(timing && { schedule: timing.impacts, impact: () => sfx.crit() }),
                  // Furie instantanée : ses frappes suivent vite (son nom est déjà tombé avec le dé)
                  hold: current.beats[i + 1]?.type === 'flurry' ? 500 : undefined,
                  // Le sceau de la compétence envoie son effet vers la zone d'état de sa cible
                  signal: beat.event.eventId,
                },
              )
            }
            break
          case 'statusTick': {
            // Un statut qui agit sur l'adversaire (Aura glaciale, qui l'empoisonne) s'annonce au-dessus de son
            // porteur, sauf une aura : son anneau dans la barre de compétences s'allume et envoie le signal. Le poison
            // subi n'a que son texte. Un statut posé déjà à son maximum n'annonce rien (texte neutre sur la cible).
            const outward = beat.effects.some((e) => e.target !== beat.side) && !capped(beat.effects)
            const fromRing = STATUS_PLACE[beat.status].place === 'aura'
            const harms = beat.effects.some((e) => e.type === 'damage')
            await showEffects(
              outward ? beat.side : null,
              outward && !fromRing ? STATUSES[beat.status].name : '',
              beat.effects,
              () => {
                showHp(beat.state.hp)
                show(beat.state.statuses)
                push(statusTickLog(beat.side, beat.status, beat.effects, fighters))
              },
              // Une aura qui agit (l'Aura glaciale empoisonne) envoie son effet depuis son anneau, dans l'en-tête
              { ...(harms && { cue: sfx.rot }), ...(STATUS_PLACE[beat.status].place === 'aura' && { signal: beat.status }) },
            )
            break
          }
          case 'statusReaction':
            // Le statut agit comme un événement : son nom flotte au-dessus de son porteur.
            // Épines : la plaie s'ouvre sur l'attaquant ; Riposte : contre-coup avec élan ; Vol de vie : aspiration.
            // Un statut qui frappe son propre porteur (Saignement) se montre comme le poison subi : Ronge, sans titre.
            // La plaie qui coule juste après son coup a déjà été jouée à l'impact (`flowAt`, `bleedOut`), comme le
            // statut que le coup vient de poser (`rideAt`, `landRide`).
            if (i === flowShown || i === rideShown) {
              show(beat.state.statuses)
              break
            }
            {
              const def = STATUSES[beat.status]
              const reflects = def.reflectsHit !== undefined
              const harms = beat.effects.some((e) => e.type === 'damage' && e.target !== beat.side)
              const wound = beat.effects.reduce((t, e) => t + (e.type === 'damage' && e.target === beat.side ? e.amount : 0), 0)
              // Statut posé déjà à son maximum : ni nom, ni label, ni son ; seul le texte neutre sur la cible
              const idle = capped(beat.effects)
              // Riposte, Épines, Vol de vie, Saignement : une réaction au coup en cours, vue de l'attaquant (le maître du tour)
              const special = idle ? undefined : reactionSpecial(beat.status, beat.side === ownerOf(beat.turn) ? 'attacker' : 'defender', beat.effects)
              // Son nom ne flotte plus au-dessus du porteur quand son label le dit déjà sous le dé
              const named = wound === 0 && !idle && !special
              await showEffects(
                wound > 0 || idle ? null : beat.side,
                named ? def.name : '',
                beat.effects,
                () => {
                  showHp(beat.state.hp)
                  show(beat.state.statuses)
                  push(statusReactionLog(beat.side, beat.status, beat.effects, fighters))
                },
                // Un renvoi de dégâts n'est qu'un coup, même gros ; le vol de vie, un soin
                {
                  ...(harms
                    ? { blows: reflects ? 'lunge' : 'reaction', cue: () => {}, impact: () => sfx.hit() }
                    : def.drainsHit
                      ? { cue: sfx.heal }
                      : wound > 0
                        ? { cue: sfx.rot, lead: 0, hold: 700 }
                        : {}),
                  // Son label de surcharge (« Riposte −3 », « Vol de vie +5 », « Saignement +2 »), muet si l'effet sonne
                  // déjà le son de son signe (les Épines et leur Malus reçu, SONS.md § 4.4, règle 5)
                  special,
                  // L'Aura de décoction empoisonne à chaque coup : la lueur part de son anneau
                  ...(STATUS_PLACE[beat.status].place === 'aura' && { signal: beat.status }),
                } as const,
              )
            }
            break
          case 'skip':
            setTurn(beat.turn)
            // La conséquence, pas la cause : « Tour perdu » sur celui qui perd son action, sans titre ni aura. Le nom
            // de la Peur flotterait comme une nouvelle Peur (2026-10-21). Une perte : il tombe, en couleur de malus.
            await showEffects(
              null,
              '',
              [],
              () => {
                show(beat.state.statuses)
                push(skipLog(beat.turn, beat.side, beat.status, fighters))
              },
              {
                cue: sfx.stun,
                notes: [{ target: beat.side, text: STATES.lostTurn.name, tone: STATES.lostTurn.polarity, rises: false }],
              },
            )
            break
          case 'flurry': {
            // Le nom du statut flotte au-dessus du porteur, puis tous les dés roulent ensemble
            // et les coups partent en rafale, un par dé (voir `rollVolley`, `playVolleyStrike`).
            // Furie instantanée : la compétence qui la pose vient d'afficher son nom ; la rafale part sans le répéter
            const chained = current.beats[i - 1]?.type === 'event'
            if (chained) {
              show(beat.state.statuses)
              push(flurryLog(beat.turn, beat.side, beat.status, beat.strikes, fighters))
            } else
              await showEffects(beat.side, STATUSES[beat.status].name, [], () => {
                show(beat.state.statuses)
                push(flurryLog(beat.turn, beat.side, beat.status, beat.strikes, fighters))
              })
            // Tous les dés de la rafale roulent ensemble : ils sont lancés, donc plus imposables.
            // Combat test : le joueur les choisit d'abord, un par un.
            await choose(rankOf(i) + beat.strikes)
            const strikes = [...current.beats.entries()]
              .filter(([j, b]) => j > i && b.type === 'attack' && b.turn === beat.turn && b.attack.attacker === beat.side)
              .slice(0, beat.strikes)
            if (strikes.length > 0) {
              volley = { strikes: strikes.map(([j]) => j), next: 0, pointed: true }
              commit(rankOf(i) + strikes.length)
              await rollVolley(
                strikes.flatMap(([, b]) => (b.type === 'attack' ? [b.attack] : [])),
                STATUSES[beat.status].look?.dieColor,
                chained,
              )
            }
            break
          }
          case 'shift': {
            // Le druide change de forme : fondu entre ses deux silhouettes, tourbillon de feuilles (Fighter)
            const form = fighters[beat.side].forms?.[beat.form]
            await showEffects(
              beat.side,
              form?.name ?? '',
              [],
              () => {
                setForms((f) => (beat.side === 0 ? [beat.form, f[1]] : [f[0], beat.form]))
                push(shiftLog(beat.turn, beat.side, beat.form, fighters))
              },
              { cue: sfx.shift },
            )
            break
          }
          case 'pair': {
            // Les deux dés roulent ensemble ; les coups qui suivent (deux, ou ceux d'un double) partent en rafale
            const skill = beat.double !== undefined ? current.beats[i + 1] : undefined
            const name = skill?.type === 'event' ? skill.event.name : undefined
            const strikes = [...current.beats.entries()]
              .filter(([j, b]) => j > i && b.type === 'attack' && b.turn === beat.turn && b.attack.preset)
              .map(([j]) => j)
            volley = strikes.length > 0 ? { strikes, next: 0, pointed: beat.double === undefined } : null
            await rollPair(beat.side, beat.rolls, beat.faces, name, !!beat.forced, beat.double)
            push(pairLog(beat.turn, beat.side, beat.rolls, name, fighters))
            if (name) snap = true
            break
          }
          case 'coin': {
            const ride = beat.heads ? rideAt(i) : undefined
            if (ride) rideShown = i + 1
            await playCoin(beat.turn, beat.side, beat.heads, beat.effects, beat.state.hp, beat.state.statuses, beat.forced, ride)
            break
          }
          case 'statusDuration': {
            // Le compteur de la zone d'état rebondit sur sa nouvelle valeur (StatusTray),
            // sauf s'il l'a déjà fait avec l'effet du statut (voir `anticipate`).
            const shown = beat.changes.every((c) => previewed(i, c.status))
            show(beat.state.statuses)
            push(statusDurationLog(beat.side, beat.changes, fighters))
            if (!shown) await wait(650)
            break
          }
          case 'statusExpire': {
            // L'état passe à 0 sous les yeux du joueur, puis quitte la zone d'état (StatusTray).
            const shown = beat.statuses.every((id) => previewed(i, id))
            show(beat.state.statuses)
            push(statusExpireLog(beat.side, beat.statuses, fighters))
            if (!shown) await wait(650)
            break
          }
          case 'relic': {
            // La relique s'annonce sur son emplacement : son sceau s'illumine dans l'en-tête, rien ne flotte au-dessus
            // du porteur ; ses effets arrivent sur leur cible (dégâts directs en coups, sans élan), avec le son déduit
            // de ses effets (docs/RELIQUES.md § 1). Son label (son nom et son icône) tombe sous le dé au même instant
            // que le sceau, le son et les textes de ses effets : exception déclarée de la zone de surcharge (une relique
            // n'a pas de sceau dans la barre de compétences), + si son porteur est l'attaquant (le maître du tour), −
            // sinon. Un effet refusé par le plafond n'a pas de label (seul le texte neutre « … au maximum »).
            const idle = capped(beat.effects)
            await showEffects(
              beat.side,
              '',
              beat.effects,
              () => {
                showHp(beat.state.hp)
                show(beat.state.statuses)
                push(relicLog(beat, fighters))
                setRelicUses((u) => (beat.side === 0 ? [{ ...u[0], [beat.relic]: beat.uses }, u[1]] : [u[0], { ...u[1], [beat.relic]: beat.uses }]))
              },
              {
                blows: 'reaction',
                relic: true,
                onShow: () => setRelicPulse({ side: beat.side, relics: [beat.relic], key: relicPulseId++ }),
                special: idle ? undefined : relicSpecial(beat.relic, beat.name, beat.side === ownerOf(beat.turn) ? 'attacker' : 'defender'),
              },
            )
            break
          }
          default:
            // Tout nouveau type d'étape doit avoir sa mise en scène ici.
            beat satisfies never
        }
        previews = previews.filter((p) => p.until !== i)
      }

      forceRef.current = () => {}
      const w = current.winner
      const lost = other(w)
      push({
        kind: 'ko',
        side: w,
        text:
          current.endedBy === 'ko'
            ? `${fighters[lost].name} s'effondre ! ${fighters[w].name} remporte le combat.`
            : `Limite de tours atteinte : ${fighters[w].name} l'emporte aux points de vie.`,
      })
      setWinner(w)
      setActive(null)
      setDice((d) => ({ ...d, label: 'K.O.' }))
      sfx.ko()
      await wait(1000)
      sfx.victory()
      await wait(1200)
      onEndRef.current({ ...current, mode: 'played', durationMs: performance.now() - startedAt })
    }

    run().catch((e) => {
      if (e !== ABORTED) throw e
    })
    return () => {
      aborted = true
    }
  }, [script, fighters, test])

  /** Mode triche : impose `value` au prochain dé (null : le laisse au hasard) */
  const forceNextRoll = (value: number | null) => forceRef.current(value)

  return { hp, statuses, forms, dice, strike, blow, fx, scene, log, turn, winner, active, pulse, signal, relicPulse, relicUses, speed, setSpeed, paused, setPaused, cheat, forceNextRoll, resolved }
}
