import { useEffect, useRef, useState } from 'react'
import {
  dieAt,
  INITIATIVE_DIE,
  other,
  rollsDie,
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
  shiftLog,
  skipLog,
  statusDurationLog,
  statusExpireLog,
  statusReactionLog,
  statusTickLog,
  type LogEntry,
} from './narration'
import { STATUSES, type StatusId } from './statuses'
import { cueOf } from './cues'
import { setSoundSpeed, sfx } from './sound'
import type { Status } from './statuses'

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
 */
export function useCombat(script: CombatResult, onEnd: (result: CombatResult) => void) {
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
    const publishCheat = () =>
      setCheat({
        available: script.seed !== undefined,
        rank: committed,
        next: dieAt(current, committed),
        forced: forced[committed],
        count: Object.keys(forced).length,
      })
    const rankOf = (i: number) => current.beats.slice(0, i).filter(rollsDie).length
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
      publishCheat()
    }
    setResolved(script)
    setForms([0, 0])
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

    const push = (entry: Omit<LogEntry, 'id'>) => setLog((l) => [...l, { ...entry, id: logId++ }])

    /** Son d'une compétence ou d'un statut, déduit de ses effets (`cueOf`, `docs/SONS.md` § 4.2). */
    const cueFor = (source: Side | null, effects: AppliedEffect[]) => {
      const cue = cueOf(source, effects)
      if (cue) sfx[cue]()
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
      opts: { blows?: 'lunge' | 'reaction'; cue?: () => void; impact?: (damage: number, heavy: boolean) => void } = {},
    ) => {
      const hits =
        source !== null && opts.blows ? effects.filter((e) => e.type === 'damage' && e.target !== source && e.amount > 0) : []
      await wait(250)
      ;(opts.cue ?? (() => cueFor(source, effects)))()
      setFx({ key: fxId++, source, title, effects: effects.filter((e) => !hits.includes(e)) })
      if (hits.length > 0 && source !== null) {
        await wait(200)
        await playBlows(source, hits, opts.blows === 'lunge', opts.impact ?? ((_, heavy) => (heavy ? sfx.crit() : sfx.hit())))
        apply()
        await wait(500)
      } else {
        apply()
        await wait(1300)
      }
      setFx(null)
    }

    /**
     * Rafale : tous les dés roulent ensemble, le second jaillit en tournoyant (Furie des vents), ou
     * apparaît dans sa couleur s'il est d'une autre sorte (le d6 de Coup de chance).
     */
    async function rollVolley(attacks: Attack[], color?: string) {
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
    async function playVolleyStrike(t: number, index: number, attack: Attack, after: Pair<number>, afterStatuses: Pair<Status[]>) {
      setDice((d) => ({ ...d, active: index, crit: attack.crit, critForced: attack.critForced, critMultiplier: attack.critMultiplier }))
      if (attack.forfeited) {
        showHp(after)
        setStatuses(afterStatuses)
        push(attackLog(t, attack, fighters, after[other(attack.attacker)]))
        await wait(250)
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

    /** Pile ou face : la pièce remplace le dé, tournoie, retombe ; pile, les dégâts tombent sur l'adversaire. */
    async function playCoin(
      t: number,
      side: Side,
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
      setDice({ ...shown, coin: { heads }, label: heads ? 'PILE !' : 'FACE…', forced })
      // Pile : un « ding » juste après le résultat, pour que la réussite s'entende (SONS.md § 4.1)
      if (heads) {
        await wait(140)
        sfx.coinWin()
        await wait(210)
      } else await wait(350)
      setFx({ key: fxId++, source: side, title: heads ? 'Pile !' : 'Face…', effects: [] })
      // Pile : la voleuse fond sur sa cible, un seul coup lourd
      if (heads)
        await playBlows(side, effects, true, () => sfx.crit())
      showHp(after)
      push(coinLog(t, side, heads, effects, fighters))
      await wait(heads ? 700 : 1000)
      setFx(null)
    }

    async function playAttack(t: number, attack: Attack, after: Pair<number>, afterStatuses: Pair<Status[]>) {
      const { attacker, faces } = attack
      const label = `${fighters[attacker].name} attaque`
      const shown = { ...IDLE_DICE, faces, owner: attacker, label, critMultiplier: attack.critMultiplier }

      setDice({ ...shown, values: [0], rolling: true })
      sfx.diceRoll(800 / speedRef.current)
      await wait(800)
      sfx.diceLand()
      setDice({ ...shown, values: [attack.roll], forced: attack.forced })
      await wait(350)
      if (attack.crit) {
        setDice((d) => ({ ...d, crit: true, critForced: attack.critForced }))
        await wait(450)
      }

      // Coup sacrifié par une compétence : pas d'élan, la compétence qui suit prend le relais.
      if (attack.forfeited) {
        showHp(after)
        setStatuses(afterStatuses)
        push(attackLog(t, attack, fighters, after[other(attacker)]))
        await wait(300)
        return
      }

      // Coup transformé (Charge, Coup de griffe) : le nom de la compétence jaillit avant l'élan ; il sonne comme un coup
      if (attack.reshaped) {
        const move = fighters[attacker].events.find((e) => e.id === attack.reshaped!.event)
        setFx({ key: fxId++, source: attacker, title: move?.name ?? '', effects: [] })
        await wait(350)
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

      await wait(500)
      push({ kind: 'info', text: `${a.name} (${a.maxHp} PV) affronte ${b.name} (${b.maxHp} PV) !` })

      // Initiative : chacun lance un dé, le plus haut commence (relance sur égalité).
      const initDice = { ...IDLE_DICE, faces: INITIATIVE_DIE, label: 'Initiative' }
      for (const [ia, ib] of script.initiative) {
        setDice({ ...initDice, values: [0, 0], rolling: true })
        sfx.diceRoll(900 / speedRef.current)
        await wait(900)
        sfx.diceLand()
        setDice({ ...initDice, values: [ia, ib] })
        push({ kind: 'initiative', text: `Initiative — ${a.name} : ${ia}, ${b.name} : ${ib}` })
        await wait(1000)
        if (ia === ib) push({ kind: 'info', text: 'Égalité ! On relance.' })
      }
      const [lastA, lastB] = script.initiative[script.initiative.length - 1]
      const first: Side = lastA > lastB ? 0 : 1
      push({ kind: 'info', text: `${fighters[first].name} frappe en premier.`, side: first })
      await wait(700)

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
      let volley: { strikes: number[]; next: number } | null = null

      // `current.beats` est relu à chaque étape : un dé imposé en remplace la suite
      for (let i = 0; i < current.beats.length; i++) {
        const beat = current.beats[i]
        setTurn(beat.turn)
        anticipate(i)
        if (rollsDie(beat)) commit(rankOf(i) + 1)
        switch (beat.type) {
          case 'attack':
            if (volley && volley.strikes.includes(i)) {
              const index = volley.next++
              await playVolleyStrike(beat.turn, index, beat.attack, beat.state.hp, display(beat.state.statuses))
              const last = volley.next === volley.strikes.length
              if (last) volley = null
              await wait(last ? 450 : 60)
              break
            }
            await playAttack(beat.turn, beat.attack, beat.state.hp, display(beat.state.statuses))
            await wait(450)
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
              // Le coup lourd (le dernier d'une relâche) sonne comme un critique
              { blows: 'lunge' },
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
                harms
                  ? { blows: reflects ? 'lunge' : 'reaction', cue: () => {}, impact: () => sfx.hit() }
                  : def.drainsHit
                    ? { cue: sfx.heal }
                    : {},
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
            await showEffects(beat.side, STATUSES[beat.status].name, [], () => {
              show(beat.state.statuses)
              push(flurryLog(beat.turn, beat.side, beat.status, beat.strikes, fighters))
            })
            // Tous les dés de la rafale roulent ensemble : ils sont lancés, donc plus imposables
            const strikes = [...current.beats.entries()]
              .filter(([j, b]) => j > i && b.type === 'attack' && b.turn === beat.turn && b.attack.attacker === beat.side)
              .slice(0, beat.strikes)
            if (strikes.length > 0) {
              volley = { strikes: strikes.map(([j]) => j), next: 0 }
              commit(rankOf(i) + strikes.length)
              await rollVolley(
                strikes.flatMap(([, b]) => (b.type === 'attack' ? [b.attack] : [])),
                STATUSES[beat.status].look?.dieColor,
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
          case 'coin':
            await playCoin(beat.turn, beat.side, beat.heads, beat.effects, beat.state.hp, beat.state.statuses, beat.forced)
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
  }, [script, fighters])

  /** Mode triche : impose `value` au prochain dé (null : le laisse au hasard) */
  const forceNextRoll = (value: number | null) => forceRef.current(value)

  return { hp, statuses, forms, dice, strike, blow, fx, log, turn, winner, speed, setSpeed, paused, setPaused, cheat, forceNextRoll, resolved }
}
