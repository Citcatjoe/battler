import { useEffect, useRef, useState } from 'react'
import {
  INITIATIVE_DIE,
  other,
  type AppliedEffect,
  type Attack,
  type CombatResult,
  type Pair,
  type Side,
} from './combat'
import {
  attackLog,
  eventLog,
  skipLog,
  statusExpireLog,
  statusReactionLog,
  statusTickLog,
  type LogEntry,
} from './narration'
import { STATUSES } from './statuses'
import { sfx } from './sound'
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
}

/** Un coup en cours : sert de clé pour relancer les animations CSS. */
export interface Strike extends Attack {
  key: number
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
  const [log, setLog] = useState<LogEntry[]>([])
  const [turn, setTurn] = useState(0)
  const [winner, setWinner] = useState<Side | null>(null)
  const [speed, setSpeed] = useState(1)
  const [paused, setPaused] = useState(false)

  const speedRef = useRef(speed)
  const pausedRef = useRef(paused)
  speedRef.current = speed
  pausedRef.current = paused

  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  useEffect(() => {
    let aborted = false
    let logId = 0
    let fxId = 0
    const [a, b] = fighters

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

    /** Affiche des effets ; `apply` met à jour PV, statuts et journal au moment de l'apparition. */
    const showEffects = async (source: Side | null, title: string, effects: AppliedEffect[], apply: () => void) => {
      await wait(250)
      sfx.event()
      setFx({ key: fxId++, source, title, effects })
      apply()
      await wait(1300)
      setFx(null)
    }

    async function playAttack(t: number, attack: Attack, after: Pair<number>, afterStatuses: Pair<Status[]>) {
      const { attacker, faces } = attack
      const label = `${fighters[attacker].name} attaque`
      const shown = { ...IDLE_DICE, faces, owner: attacker, label, critMultiplier: attack.critMultiplier }

      setDice({ ...shown, values: [0], rolling: true })
      sfx.diceRoll(800 / speedRef.current)
      await wait(800)
      sfx.diceLand(attack.roll, faces)
      setDice({ ...shown, values: [attack.roll] })
      await wait(350)
      if (attack.crit) {
        sfx.crit()
        setDice((d) => ({ ...d, crit: true, critForced: attack.critForced }))
        await wait(450)
      }

      // Élan vers l'adversaire, l'impact (ou l'esquive) tombe au milieu de l'animation.
      setStrike({ ...attack, key: t, landed: false })
      sfx.whoosh()
      await wait(300)
      if (attack.dodged) sfx.dodge()
      else sfx.impact(attack.damage, attack.crit)
      setHp(after)
      setStatuses(afterStatuses)
      setStrike({ ...attack, key: t, landed: true })
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
        sfx.diceLand(Math.max(ia, ib), INITIATIVE_DIE)
        setDice({ ...initDice, values: [ia, ib] })
        push({ kind: 'initiative', text: `Initiative — ${a.name} : ${ia}, ${b.name} : ${ib}` })
        await wait(1000)
        if (ia === ib) push({ kind: 'info', text: 'Égalité ! On relance.' })
      }
      const [lastA, lastB] = script.initiative[script.initiative.length - 1]
      const first: Side = lastA > lastB ? 0 : 1
      push({ kind: 'info', text: `${fighters[first].name} frappe en premier.`, side: first })
      await wait(700)

      for (const beat of script.beats) {
        setTurn(beat.turn)
        switch (beat.type) {
          case 'attack':
            await playAttack(beat.turn, beat.attack, beat.state.hp, beat.state.statuses)
            await wait(450)
            break
          case 'event':
            await showEffects(beat.event.side, beat.event.name, beat.event.effects, () => {
              setHp(beat.state.hp)
              setStatuses(beat.state.statuses)
              push(eventLog(beat.event, fighters))
            })
            break
          case 'statusTick':
            await showEffects(null, '', beat.effects, () => {
              setHp(beat.state.hp)
              setStatuses(beat.state.statuses)
              push(statusTickLog(beat.side, beat.status, beat.effects, fighters))
            })
            break
          case 'statusReaction':
            // Le statut agit comme un événement : son nom flotte au-dessus de son porteur.
            await showEffects(beat.side, STATUSES[beat.status].name, beat.effects, () => {
              setHp(beat.state.hp)
              setStatuses(beat.state.statuses)
              push(statusReactionLog(beat.side, beat.status, beat.effects, fighters))
            })
            break
          case 'skip':
            setTurn(beat.turn)
            await showEffects(beat.side, STATUSES[beat.status].name, [], () => {
              setStatuses(beat.state.statuses)
              push(skipLog(beat.turn, beat.side, beat.status, fighters))
            })
            break
          case 'statusExpire':
            setStatuses(beat.state.statuses)
            push(statusExpireLog(beat.side, beat.statuses, fighters))
            await wait(400)
            break
          default:
            // Tout nouveau type d'étape doit avoir sa mise en scène ici.
            beat satisfies never
        }
      }

      const w = script.winner
      const lost = other(w)
      push({
        kind: 'ko',
        side: w,
        text:
          script.endedBy === 'ko'
            ? `${fighters[lost].name} s'effondre ! ${fighters[w].name} remporte le combat.`
            : `Limite de tours atteinte : ${fighters[w].name} l'emporte aux points de vie.`,
      })
      setWinner(w)
      setDice((d) => ({ ...d, label: 'K.O.' }))
      sfx.ko()
      await wait(1000)
      sfx.victory()
      await wait(1200)
      onEndRef.current({ ...script, mode: 'played', durationMs: performance.now() - startedAt })
    }

    run().catch((e) => {
      if (e !== ABORTED) throw e
    })
    return () => {
      aborted = true
    }
  }, [script, fighters])

  return { hp, statuses, dice, strike, fx, log, turn, winner, speed, setSpeed, paused, setPaused }
}
