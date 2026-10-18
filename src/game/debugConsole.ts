import type { Pair } from './combat'
import { simulateCombat, type CombatResult } from './combat'
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
 *   copy(battler.dump())     → copie les traces de tous les combats gardés (un tournoi entier), du plus ancien au plus récent
 */

// Un tournoi compte 15 combats : on en garde assez pour un tournoi et quelques duels.
const KEEP = 40
const traces: CombatResult[] = []

declare global {
  interface Window {
    battler?: {
      traces: readonly CombatResult[]
      trace: (back?: number) => string | undefined
      dump: () => string
      replay: (seed: number, left: string, right: string) => CombatResult
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
    replay: (seed, left, right) => {
      const fighters: Pair<ReturnType<typeof createCharacter>> = [createCharacter(left), createCharacter(right)]
      const result = simulateCombat(fighters, { seed })
      reportCombat(result)
      return result
    },
  }
}
