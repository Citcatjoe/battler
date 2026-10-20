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
  type LogEntry,
} from './narration'
import { STATUSES, type StatusId } from './statuses'
import { doubleFace, type Trigger } from './events'
import { cueOf } from './cues'
import { eventSpecialTone, statusSpecialTone, type SpecialBadge, type SpecialTone } from './specials'
import { setSoundSpeed, sfx } from './sound'
import type { Status } from './statuses'
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
  /** Badges du coup spécial, empilés dans l'ordre où ils tombent (critique, Riposte…), voir specials.ts */
  specials?: SpecialBadge[]
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
  const [statuses, setStatuses] = useState<Pair<Status[]>>([[], []])
  const [dice, setDice] = useState<DiceState>(IDLE_DICE)
  const [strike, setStrike] = useState<Strike | null>(null)
  const [fx, setFx] = useState<EffectFx | null>(null)
  const [blow, setBlow] = useState<Blow | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [turn, setTurn] = useState(0)
  /** Forme de chaque combattant (druide) : index dans `Character.forms` */
  const [forms, setForms] = useState<Pair<number>>([0, 0])
  const [winner, setWinner] = useState<Side | null>(null)
  /** Le combattant dont c'est le tour (null avant l'initiative et après le K.O.) */
  const [active, setActive] = useState<Side | null>(null)
  const [pulse, setPulse] = useState<SkillPulse | null>(null)
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

    /** Empile un badge de coup spécial sous le dé (une seule fois par libellé pour un même jet). */
    const addSpecial = (label: string, tone: SpecialTone) =>
      setDice((d) =>
        d.specials?.some((x) => x.label === label) ? d : { ...d, specials: [...(d.specials ?? []), { key: specialId++, label, tone }] },
      )
    /** Le critique d'un coup : le badge du critique assuré (s'il vient d'un statut), puis celui du critique. */
    const critSpecials = (attack: Attack) => {
      if (!attack.crit) return
      if (attack.critForced) addSpecial('Critique assuré', 'precision')
      addSpecial(`Critique ${multiplier(attack.critMultiplier)}`, 'crit')
    }
    /** Badge d'un coup transformé ou d'un gros coup de double (Charge, Crescendo…). */
    const reshapedSpecial = (attack: Attack) => {
      const move = attack.reshaped && fighters[attack.attacker].events.find((e) => e.id === attack.reshaped!.event)
      const tone = move && eventSpecialTone(move)
      if (move && tone) addSpecial(move.name, tone)
      return move
    }

    /**
     * Coups de compétence : chaque montant (ou chaque jauge d'une relâche) part comme un coup, en
     * rafale ; les PV tombent coup par coup. Le dernier d'une série est lourd (secousse, chiffre doré).
     */
    async function playBlows(from: Side, hits: AppliedEffect[], lunge: boolean, sound: (damage: number, heavy: boolean) => void) {
      const parts = hits.flatMap((e) => (e.type === 'damage' ? (e.parts ?? [e.amount]).map((n) => ({ n, to: e.target })) : []))
      for (const [k, part] of parts.entries()) {
        const heavy = parts.length > 1 ? k === parts.length - 1 : part.n >= 10
        const key = strikeId++
        setBlow({ key, from, to: part.to, damage: part.n, heavy, lunge, landed: false })
        await wait(lunge ? 170 : 60)
        if (heavy) await wait(90) // arrêt sur image avant le gros coup
        sound(part.n, heavy)
        const hp = [...shownHp] as Pair<number>
        hp[part.to] = Math.max(0, hp[part.to] - part.n)
        showHp(hp)
        setBlow({ key, from, to: part.to, damage: part.n, heavy, lunge, landed: true })
        await wait(k === parts.length - 1 ? 520 : 260)
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
        /** Badge de coup spécial posé à l'apparition */
        special?: { label: string; tone: SpecialTone }
        /** Temps de lecture après l'effet (1 300 ms) ; plus court quand des frappes instantanées suivent */
        hold?: number
      } = {},
    ) => {
      const hits =
        source !== null && opts.blows ? effects.filter((e) => e.type === 'damage' && e.target !== source && e.amount > 0) : []
      const lead = opts.lead ?? 250
      if (lead > 0) await wait(lead)
      ;(opts.cue ?? (() => cueFor(source, effects)))()
      setFx({ key: fxId++, source, title, effects: effects.filter((e) => !hits.includes(e)) })
      if (opts.special) addSpecial(opts.special.label, opts.special.tone)
      if (hits.length > 0 && source !== null) {
        await wait(200)
        await playBlows(source, hits, opts.blows === 'lunge', opts.impact ?? ((_, heavy) => (heavy ? sfx.crit() : sfx.hit())))
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
     * les dés des coups apparaissent d'un coup, à plat, et le badge posé au résultat du dé reste en place.
     */
    async function rollVolley(attacks: Attack[], color?: string, status?: StatusId, relaunch = 1, flat = false) {
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
      // La rafale est un coup spécial dès son départ : le badge du statut qui l'arme (Furie des vents…)
      const tone = status && statusSpecialTone(status)
      if (flat) {
        setDice((d) => ({ ...shown, values: attacks.map((a) => a.roll), forced: attacks.some((a) => a.forced), specials: d.specials }))
        await wait(250)
        return
      }
      const label = status && (relaunch > 1 ? `${STATUSES[status].name} ×${relaunch}` : STATUSES[status].name)
      const specials = label && tone ? [{ key: specialId++, label, tone }] : undefined
      setDice({ ...shown, values: attacks.map(() => 0), rolling: true, specials })
      // Un seul dé lancé et un seul dé posé pour toute la rafale : un instant, un son
      sfx.diceRoll(900 / speedRef.current)
      await wait(900)
      sfx.diceLand()
      setDice({ ...shown, values: attacks.map((a) => a.roll), forced: attacks.some((a) => a.forced), specials })
      await wait(400)
    }

    /** Le son d'un coup qui arrive : Esquive, Coup critique ou Coup. */
    const strikeSound = (attack: Attack) => (attack.dodged ? sfx.dodge() : attack.crit ? sfx.crit() : sfx.hit())

    /** Un coup de la rafale : pas de nouveau jet, élan court, impact presque immédiat. */
    /** `skillFace`, `grouped` : un dé de la rafale qui déclenche une compétence (un 2 relance la Furie) ; voir `playAttack`. */
    async function playVolleyStrike(
      t: number,
      index: number | undefined,
      attack: Attack,
      after: Pair<number>,
      afterStatuses: Pair<Status[]>,
      skillFace?: number,
      grouped = false,
      instant?: { label: string; tone: SpecialTone },
    ) {
      setDice((d) => ({ ...d, active: index, crit: attack.crit, critForced: attack.critForced, critMultiplier: attack.critMultiplier }))
      reshapedSpecial(attack)
      critSpecials(attack)
      if (attack.forfeited) {
        // Le dé de la rafale ressort, son dé de l'en-tête s'allume, et sa compétence suit sans attente
        pulseSkill(attack.attacker, skillFace)
        if (instant) addSpecial(instant.label, instant.tone)
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
      push(attackLog(t, attack, fighters, after[other(attack.attacker)]))
      await wait(260)
      setStrike(null)
    }

    /** Deux dés (barde) : la paire roule ensemble et retombe ; un double qui a sa compétence est annoncé. */
    async function rollPair(
      side: Side,
      rolls: [number, number],
      faces: number,
      skill: string | undefined,
      forced: boolean,
      double?: number,
      special?: { label: string; tone: SpecialTone },
    ) {
      const shown = { ...IDLE_DICE, faces, owner: side, label: `${fighters[side].name} · deux dés`, volley: true }
      setDice({ ...shown, values: [0, 0], rolling: true })
      sfx.diceRoll(900 / speedRef.current)
      await wait(900)
      sfx.diceLand()
      // Un double, quel qu'il soit : le « ding » de la chance, en même temps que les dés (0.46.0, SONS.md § 4.1)
      if (rolls[0] === rolls[1]) sfx.coinWin()
      if (skill) pulseSkill(side, double)
      setDice({
        ...shown,
        values: rolls,
        forced,
        label: skill ? `DOUBLE ${rolls[0]} !` : shown.label,
        specials: special && [{ key: specialId++, ...special }],
      })
      // Un double qui a sa compétence : elle tombe avec la paire (étape suivante, sans attente)
      if (!skill) await wait(400)
    }

    /** Pile ou face : la pièce remplace le dé, tournoie, retombe ; pile, les dégâts tombent sur l'adversaire. */
    async function playCoin(
      t: number,
      side: Side,
      status: StatusId,
      heads: boolean,
      effects: AppliedEffect[],
      after: Pair<number>,
      afterStatuses: Pair<Status[]>,
      forced?: boolean,
    ) {
      const shown = { ...IDLE_DICE, owner: side, label: `${fighters[side].name} · Pile ou face` }
      setStatuses(afterStatuses)
      setDice({ ...shown, coin: {} })
      sfx.coinToss(1200 / speedRef.current)
      await wait(1200)
      sfx.coinLand()
      const tone = statusSpecialTone(status)
      setDice({
        ...shown,
        coin: { heads },
        label: heads ? 'PILE !' : 'FACE…',
        forced,
        specials: heads && tone ? [{ key: specialId++, label: STATUSES[status].name, tone }] : undefined,
      })
      // Le résultat tombe d'un bloc : la pièce, son libellé, le « ding » de la réussite (SONS.md § 4.1), le badge
      // et le texte flottant. Puis un temps pour le lire, et seulement alors la frappe.
      if (heads) sfx.coinWin()
      setFx({ key: fxId++, source: side, title: heads ? 'Pile !' : 'Face…', effects: [] })
      await wait(650)
      // Pile : la voleuse fond sur sa cible, un seul coup lourd
      if (heads)
        await playBlows(side, effects, true, () => sfx.crit())
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
     */
    async function playAttack(
      t: number,
      attack: Attack,
      after: Pair<number>,
      afterStatuses: Pair<Status[]>,
      skillFace?: number,
      grouped = false,
      instant?: { label: string; tone: SpecialTone },
    ) {
      const { attacker, faces } = attack
      const label = `${fighters[attacker].name} attaque`
      const shown = { ...IDLE_DICE, faces, owner: attacker, label, critMultiplier: attack.critMultiplier }

      setDice({ ...shown, values: [0], rolling: true })
      sfx.diceRoll(800 / speedRef.current)
      await wait(800)
      sfx.diceLand()
      pulseSkill(attacker, skillFace)
      // Une compétence qui agit tout de suite (Furie des vents instantanée) pose son badge au résultat du dé
      setDice({ ...shown, values: [attack.roll], forced: attack.forced, specials: instant && [{ key: specialId++, ...instant }] })
      // Coup transformé (Charge, Coup de griffe) : son nom jaillit avec le dé qui tombe, avant l'élan
      if (attack.reshaped) {
        const move = reshapedSpecial(attack)
        setFx({ key: fxId++, source: attacker, title: move?.name ?? '', effects: [] })
      }

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
        critSpecials(attack)
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
      push(attackLog(t, attack, fighters, after[other(attacker)]))
      await wait(550)
      setStrike(null)
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
       * Badge d'une compétence qui agit tout de suite, posé au résultat du dé qui la déclenche : l'étape `i` est le
       * coup sacrifié, la suivante la compétence ; elle pose un statut à frappes instantanées (Furie des vents).
       * Une relance dans la même action monte le compte (« Furie des vents ×2 »).
       */
      const instantBadgeAt = (i: number): { label: string; tone: SpecialTone } | undefined => {
        const next = current.beats[i + 1]
        if (next?.type !== 'event') return undefined
        for (const e of next.event.effects) {
          if (e.type !== 'applyStatus' || !STATUSES[e.status].instantStrikes) continue
          const tone = statusSpecialTone(e.status)
          if (!tone) continue
          const turn = current.beats[i].turn
          const before = current.beats.slice(0, i).filter((b) => b.type === 'flurry' && b.turn === turn && b.side === next.event.side).length
          const name = STATUSES[e.status].name
          return { label: before > 0 ? `${name} ×${before + 1}` : name, tone }
        }
        return undefined
      }

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
          case 'attack':
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
                grouped ? instantBadgeAt(i) : undefined,
              )
              const last = volley.next === volley.strikes.length
              if (last) volley = null
              if (grouped) snap = true
              else await wait(last ? 450 : 60)
              break
            }
            {
              const face = skillFaceAt(current.beats, fighters, i)
              const next = current.beats[i + 1]
              const grouped = beat.attack.forfeited === true && face !== undefined && next?.type === 'event'
              await playAttack(beat.turn, beat.attack, beat.state.hp, display(beat.state.statuses), face, grouped, grouped ? instantBadgeAt(i) : undefined)
              if (grouped) snap = true
              else await wait(450)
            }
            break
          case 'event':
            // Un coup transformé (Charge…) a déjà été joué avec le coup : la compétence n'est que notée
            if (fighters[beat.event.side].events.find((e) => e.id === beat.event.eventId)?.reshapesHit) {
              push(eventLog(beat.event, fighters))
              setFx(null)
              break
            }
            // Dégâts directs d'une compétence (Rétribution…) : de vrais coups, un par jauge
            await showEffects(
              beat.event.side,
              beat.event.name,
              beat.event.effects,
              () => {
                showHp(beat.state.hp)
                show(beat.state.statuses)
                push(eventLog(beat.event, fighters))
              },
              // Le coup lourd (le dernier d'une relâche) sonne comme un critique ; une relâche (Rétribution) est un coup spécial
              {
                blows: 'lunge',
                lead: snapped ? 0 : undefined,
                // Furie instantanée : ses frappes suivent vite (le badge et le nom sont déjà tombés avec le dé)
                hold: current.beats[i + 1]?.type === 'flurry' ? 500 : undefined,
                special: (() => {
                  const def = fighters[beat.event.side].events.find((e) => e.id === beat.event.eventId)
                  const tone = def && eventSpecialTone(def)
                  return tone && !def.merged && !def.reshapesHit ? { label: beat.event.name, tone } : undefined
                })(),
              },
            )
            break
          case 'statusTick': {
            // Un statut qui frappe l'adversaire (Aura de poison) s'annonce au-dessus de son porteur,
            // pour que l'on voie d'où viennent les dégâts ; le poison subi, lui, n'a que son badge.
            const outward = beat.effects.some((e) => e.target !== beat.side)
            const harms = beat.effects.some((e) => e.type === 'damage')
            await showEffects(
              outward ? beat.side : null,
              outward ? STATUSES[beat.status].name : '',
              beat.effects,
              () => {
                showHp(beat.state.hp)
                show(beat.state.statuses)
                push(statusTickLog(beat.side, beat.status, beat.effects, fighters))
              },
              harms ? { cue: sfx.rot } : {},
            )
            break
          }
          case 'statusReaction':
            // Le statut agit comme un événement : son nom flotte au-dessus de son porteur.
            // Épines : l'attaquant se blesse sur place ; Riposte : contre-coup avec élan ; Vol de vie : aspiration
            {
              const def = STATUSES[beat.status]
              const reflects = def.reflectsHit !== undefined
              const harms = beat.effects.some((e) => e.type === 'damage' && e.target !== beat.side)
              await showEffects(
                beat.side,
                def.name,
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
                      : {}),
                  // Riposte, Épines, Vol de vie : le coup en cours devient spécial
                  special: (() => {
                    const tone = statusSpecialTone(beat.status)
                    return tone ? { label: def.name, tone } : undefined
                  })(),
                } as const,
              )
            }
            break
          case 'skip':
            setTurn(beat.turn)
            await showEffects(
              beat.side,
              STATUSES[beat.status].name,
              [],
              () => {
                show(beat.state.statuses)
                push(skipLog(beat.turn, beat.side, beat.status, fighters))
              },
              { cue: sfx.stun },
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
            // Surenchère : la même action relance la Furie, le badge monte (« Furie des vents ×2 », « ×3 »)
            const relaunch = current.beats.slice(0, i + 1).filter((b) => b.type === 'flurry' && b.turn === beat.turn && b.side === beat.side).length
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
                beat.status,
                relaunch,
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
            const move = skill?.type === 'event' ? fighters[beat.side].events.find((e) => e.id === skill.event.eventId) : undefined
            const tone = move && eventSpecialTone(move)
            await rollPair(beat.side, beat.rolls, beat.faces, name, !!beat.forced, beat.double, move && tone ? { label: move.name, tone } : undefined)
            push(pairLog(beat.turn, beat.side, beat.rolls, name, fighters))
            if (name) snap = true
            break
          }
          case 'coin':
            await playCoin(beat.turn, beat.side, beat.status, beat.heads, beat.effects, beat.state.hp, beat.state.statuses, beat.forced)
            break
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

  return { hp, statuses, forms, dice, strike, blow, fx, log, turn, winner, active, pulse, speed, setSpeed, paused, setPaused, cheat, forceNextRoll, resolved }
}
