import type { Character } from './character'
import type { Pair } from './combat'
import { simulateCombat, type CombatResult } from './combat'
import { randomSeed } from './rng'
import { getRelic } from './relics'
import { createCharacter } from './roster'
import { traceCombat, traceText, turnTitle } from './trace'

/*
 * Console de débogage : chaque combat résolu est écrit sur le disque (`logs/combats/`, en dev) et
 * dans la console du navigateur (un groupe
 * replié par combat, un sous-groupe par tour), avec sa graine pour pouvoir le rejouer. Les
 * derniers combats restent accessibles depuis la console :
 *   battler.trace()          → réaffiche la trace du dernier combat (texte brut)
 *   battler.trace(2)         → celle de l'avant-avant-dernier
 *   battler.traces           → les derniers combats (résultats complets)
 *   battler.replay(graine, 'gorak', 'brokk') → rejoue un combat à l'identique et l'affiche
 *   battler.replay(graine, 'gorak', 'brokk', ['wolf-fang'], []) → idem, avec les reliques de chaque camp
 *   battler.play(graine)     → le prochain combat lancé (Jouer, Simuler, match de tournoi) prend cette graine : on le
 *                              regarde à l'écran. Une seule fois ; battler.play(null) l'annule. Les combattants se
 *                              choisissent à l'écran, dans le même ordre (gauche, droite) que la graine notée.
 *   copy(battler.dump())     → copie les traces de tous les combats gardés (un tournoi entier), du plus ancien au plus récent
 *   battler.vcr()            → ouvre ou ferme le magnétoscope de combat (serveur de dev seulement ; touche V en combat) :
 *                              pause, pas à pas, retour en arrière, ralenti, durées de timing.ts (docs/MOTEUR_V2.md § 8)
 */

// Un tournoi compte 15 combats : on en garde assez pour un tournoi et quelques duels.
const KEEP = 40
const traces: CombatResult[] = []
/** Graine imposée au prochain combat (`battler.play`), consommée par `nextSeed` */
let pendingSeed: number | null = null

/** Graine du prochain combat : celle imposée en console (une seule fois), sinon une au hasard. */
export function nextSeed(): number {
  const seed = pendingSeed ?? randomSeed()
  pendingSeed = null
  return seed
}

/* Magnétoscope de combat (outil de développement) : ouvert ou fermé, retenu d'une session à l'autre. */
const VCR_KEY = 'battler:vcr'
let vcrOpen = (() => {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(VCR_KEY) === '1'
  } catch {
    return false
  }
})()
const vcrListeners = new Set<() => void>()

/** Le magnétoscope (`useSyncExternalStore`) : état, abonnement, bascule. */
export const vcrToggle = {
  get: () => vcrOpen,
  subscribe(listener: () => void) {
    vcrListeners.add(listener)
    return () => void vcrListeners.delete(listener)
  },
  set(open: boolean) {
    vcrOpen = open
    try {
      localStorage.setItem(VCR_KEY, open ? '1' : '0')
    } catch {
      // Stockage indisponible : l'état vaut pour cette session
    }
    for (const listener of vcrListeners) listener()
  },
}

declare global {
  interface Window {
    battler?: {
      traces: readonly CombatResult[]
      trace: (back?: number) => string | undefined
      dump: () => string
      replay: (seed: number, left: string, right: string, leftRelics?: string[], rightRelics?: string[]) => CombatResult
      play: (seed: number | null) => void
      vcr: (open?: boolean) => boolean
    }
  }
}

/** Nom du fichier de journal : « 2026-10-18_22-15-03_gorak-vs-brokk_graine-123 ». */
function logName(result: CombatResult) {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
  return `${date}_${result.fighters[0].id}-vs-${result.fighters[1].id}_graine-${result.seed ?? 'aucune'}${result.forcedRolls ? '_triche' : ''}`
}

/**
 * Écrit la trace sur le disque, dans `logs/combats/` du projet (serveur de dev, voir vite.config.ts),
 * pour qu'on puisse la relire hors du navigateur. Sans serveur de dev (build), rien n'est envoyé.
 */
function saveToDisk(result: CombatResult) {
  if (!import.meta.env.DEV || typeof fetch !== 'function') return
  fetch('/__battler/combat-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: logName(result), text: traceText(result) }),
  }).catch(() => {
    /* serveur indisponible : la trace reste dans la console */
  })
}

export function reportCombat(result: CombatResult) {
  traces.unshift(result)
  traces.length = Math.min(traces.length, KEEP)
  saveToDisk(result)
  if (typeof console === 'undefined' || typeof console.groupCollapsed !== 'function') return
  const trace = traceCombat(result)
  console.groupCollapsed(`Battler · ${trace.title} → ${trace.footer}`)
  for (const line of trace.header) console.log(line)
  for (const turn of trace.turns) {
    console.groupCollapsed(turnTitle(turn, result.fighters))
    for (const line of turn.lines) console.log(line)
    console.groupEnd()
  }
  console.log(trace.footer)
  console.groupEnd()
}

export function installDebugConsole() {
  if (typeof window === 'undefined') return
  window.battler = {
    traces,
    trace: (back = 0) => {
      const result = traces[back]
      if (!result) return undefined
      const text = traceText(result)
      console.log(text)
      return text
    },
    dump: () => [...traces].reverse().map(traceText).join('\n\n'),
    replay: (seed, left, right, leftRelics = [], rightRelics = []) => {
      const fighters: Pair<Character> = [
        createCharacter(left).withRelics(leftRelics.map(getRelic)),
        createCharacter(right).withRelics(rightRelics.map(getRelic)),
      ]
      const result = simulateCombat(fighters, { seed })
      reportCombat(result)
      return result
    },
    play: (seed) => {
      if (seed === null) {
        pendingSeed = null
        console.log('Battler · graine imposée annulée : le prochain combat sera tiré au hasard.')
        return
      }
      if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
        console.warn('Battler · graine invalide : un entier de 0 à 4294967295.')
        return
      }
      pendingSeed = seed
      console.log(`Battler · graine ${seed} retenue pour le prochain combat (Jouer, Simuler ou match de tournoi).`)
    },
    vcr: (open = !vcrToggle.get()) => {
      vcrToggle.set(open)
      console.log(
        open
          ? 'Battler · magnétoscope ouvert (serveur de dev, hors combat test ; touche V en combat).'
          : 'Battler · magnétoscope fermé.',
      )
      return open
    },
  }
}
