import { useEffect, useRef, useState } from 'react'
import {
  INITIATIVE_DIE,
  multiplier,
  other,
  type AppliedEffect,
  type Attack,
  type AttackOutcome,
  type TriggeredEvent,
  type CombatResult,
  type LogEntry,
  type LogKind,
  type Pair,
  type Side,
} from './combat'
import type { Buff } from './events'
import { sfx } from './sound'

export interface DiceState {
  values: number[]
  /** Nombre de faces, pour colorer le jet maximal */
  faces: number
  rolling: boolean
  owner: Side | null
  label: string
  crit: boolean
  /** Critique déclenché par un bonus « critique assuré » */
  critFromBuff: boolean
}

/** Un coup en cours : sert de clé pour relancer les animations CSS. */
export interface Strike extends AttackOutcome {
  key: number
  attacker: Side
  landed: boolean
}

const ABORTED = Symbol('aborted')

const IDLE_DICE: DiceState = {
  values: [],
  faces: 0,
  rolling: false,
  owner: null,
  label: '',
  crit: false,
  critFromBuff: false,
}

/** Événement en train de s'afficher au-dessus d'un combattant. */
export interface EventFx {
  key: number
  event: TriggeredEvent
}

const armorDetail = (attack: Attack) => {
  const base = attack.absorbed - attack.bonusAbsorbed
  const parts = [
    base > 0 && `armure −${base}`,
    attack.bonusAbsorbed > 0 && `🛡️ armure temporaire −${attack.bonusAbsorbed}`,
  ]
  return parts
    .filter(Boolean)
    .map((p) => `, ${p}`)
    .join('')
}

const effectText = (e: AppliedEffect) =>
  e.type === 'heal'
    ? e.amount > 0
      ? `regagne ${e.amount} PV`
      : 'est déjà au maximum de ses PV'
    : e.kind === 'guaranteedCrit'
      ? 'son prochain coup qui touche sera critique'
      : `gagne ${e.amount} d'armure temporaire`

/**
 * Met en scène un combat déjà résolu par `simulateCombat` : mêmes jets, même issue,
 * seul le rythme (vitesse, pause) dépend de l'affichage.
 */
export function useCombat(script: CombatResult, onEnd: (result: CombatResult) => void) {
  const { fighters } = script
  const [hp, setHp] = useState<Pair<number>>([fighters[0].maxHp, fighters[1].maxHp])
  const [dice, setDice] = useState<DiceState>(IDLE_DICE)
  const [strike, setStrike] = useState<Strike | null>(null)
  const [buffs, setBuffs] = useState<Pair<Buff[]>>([[], []])
  const [eventFx, setEventFx] = useState<EventFx | null>(null)
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

    const push = (kind: LogKind, text: string, side?: Side) => setLog((l) => [...l, { id: logId++, kind, text, side }])

    async function run() {
      const startedAt = performance.now()

      await wait(500)
      push('info', `${a.name} (${a.maxHp} PV) affronte ${b.name} (${b.maxHp} PV) !`)

      // Initiative : chacun lance un dé, le plus haut commence (relance sur égalité).
      const initDice = { ...IDLE_DICE, faces: INITIATIVE_DIE, label: 'Initiative' }
      for (const [ia, ib] of script.initiative) {
        setDice({ ...initDice, values: [0, 0], rolling: true })
        sfx.diceRoll(900 / speedRef.current)
        await wait(900)
        sfx.diceLand(Math.max(ia, ib), INITIATIVE_DIE)
        setDice({ ...initDice, values: [ia, ib] })
        push('initiative', `Initiative — ${a.name} : ${ia}, ${b.name} : ${ib}`)
        await wait(1000)
        if (ia === ib) push('info', 'Égalité ! On relance.')
      }

      const first = script.attacks[0].attacker
      push('info', `${fighters[first].name} frappe en premier.`, first)
      await wait(700)

      const life: Pair<number> = [a.maxHp, b.maxHp]
      for (const attack of script.attacks) {
        const { turn: t, attacker } = attack
        const defender = other(attacker)
        const att = fighters[attacker]
        const def = fighters[defender]
        const faces = att.stats.damageDie
        const label = `${att.name} attaque`
        setTurn(t)

        setDice({ ...IDLE_DICE, faces, values: [0], rolling: true, owner: attacker, label })
        sfx.diceRoll(800 / speedRef.current)
        await wait(800)
        sfx.diceLand(attack.roll, faces)
        setDice({ ...IDLE_DICE, faces, values: [attack.roll], owner: attacker, label })
        await wait(350)
        if (attack.crit) {
          sfx.crit()
          setDice((d) => ({ ...d, crit: true, critFromBuff: attack.critFromBuff }))
          await wait(450)
        }

        // Élan vers l'adversaire, l'impact (ou l'esquive) tombe au milieu de l'animation.
        setStrike({ ...attack, key: t, attacker, landed: false })
        sfx.whoosh()
        await wait(300)
        if (attack.dodged) sfx.dodge()
        else sfx.impact(attack.damage, attack.crit)
        life[defender] = attack.defenderHp
        setHp(attack.afterHit.hp)
        setBuffs(attack.afterHit.buffs)
        setStrike({ ...attack, key: t, attacker, landed: true })

        if (attack.dodged) {
          push('dodge', `Tour ${t} · ${att.name} frappe (${attack.roll}) mais ${def.name} esquive !`, defender)
        } else if (attack.crit) {
          push(
            'crit',
            `Tour ${t} · ${attack.critFromBuff ? '🎯 CRITIQUE ASSURÉ' : 'CRITIQUE'} ! ${att.name} frappe ${attack.roll} ${multiplier(att.stats.critMultiplier)} et inflige ${attack.damage} dégâts à ${def.name}${armorDetail(attack)} (${life[defender]} PV).`,
            attacker,
          )
        } else {
          const flavor = attack.roll === faces ? ' Coup maximal !' : attack.roll === 1 ? ' Une égratignure.' : ''
          push(
            'attack',
            `Tour ${t} · ${att.name} inflige ${attack.damage} dégât${attack.damage > 1 ? 's' : ''} à ${def.name}${armorDetail(attack)} (${life[defender]} PV).${flavor}`,
            attacker,
          )
        }
        await wait(550)
        setStrike(null)

        // Événements déclenchés par ce coup (ex. un 1 au dé).
        for (const [k, event] of attack.events.entries()) {
          await wait(250)
          sfx.event()
          setEventFx({ key: t * 10 + k, event })
          setHp(attack.after.hp)
          setBuffs(attack.after.buffs)
          push(
            'event',
            `✨ Événement · ${event.name} ! ${fighters[event.side].name} ${event.effects.map(effectText).join(', ')}.`,
            event.side,
          )
          await wait(1300)
          setEventFx(null)
        }
        await wait(450)
      }

      const w = script.winner
      push('ko', `${fighters[other(w)].name} s'effondre ! ${fighters[w].name} remporte le combat.`, w)
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

  return { hp, buffs, dice, strike, eventFx, log, turn, winner, speed, setSpeed, paused, setPaused }
}
