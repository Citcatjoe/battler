import { useState } from 'react'
import type { CombatResult } from '../game/combat'
import { traceText } from '../game/trace'

/**
 * Copie la trace de résolution complète du combat (texte brut, voir trace.ts) : outil de
 * vérification et de débogage, à coller dans un rapport. La même trace est dans la console.
 */
export function CopyTraceButton({ result, className = '' }: { result: CombatResult; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(traceText(result))
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 1800)
  }
  return (
    <button
      onClick={copy}
      title="Copier la trace de résolution complète (aussi dans la console du navigateur : battler.trace())"
      className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-stone-500 hover:bg-stone-800/60 hover:text-stone-200 ${className}`}
    >
      {state === 'copied' ? '✓ Trace copiée' : state === 'failed' ? 'Copie impossible' : '⧉ Copier la trace'}
    </button>
  )
}
