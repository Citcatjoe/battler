import { useState } from 'react'
import type { CombatResult } from '../game/combat'
import { traceText } from '../game/trace'
import { IconButton } from './kit'

/**
 * Copie la trace de résolution complète du combat (texte brut, voir trace.ts) : outil de
 * vérification et de débogage, à coller dans un rapport. La même trace est dans la console.
 * Bouton icône du UI kit (glyphe « copier ») ; le résultat de la copie s'écrit à sa gauche.
 */
export function CopyTraceButton({ result }: { result: CombatResult }) {
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
    <span className="flex items-center gap-2">
      {state !== 'idle' && (
        <span role="status" className="font-body text-[13px] text-ink-3">
          {state === 'copied' ? 'Trace copiée' : 'Copie impossible'}
        </span>
      )}
      <IconButton
        onClick={copy}
        icon="copier"
        size="sm"
        label="Copier la trace de résolution complète (aussi dans la console du navigateur : battler.trace())"
      />
    </span>
  )
}
