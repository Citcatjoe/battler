import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { percent } from '../game/combat'
import { preloadAssets, preloadProgress, subscribePreload } from '../preload'
import { Stage } from './Stage'

/** La jauge pleine reste un instant à l'écran : en local, le chargement ne serait sinon qu'un éclair */
const HOLD_MS = 300

/**
 * Écran de chargement, avant l'accueil : le logo et une jauge, le temps de télécharger les illustrations,
 * les sons et les polices (preload.ts). Le jeu n'est monté qu'ensuite.
 */
export function LoadingGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    let timer: number | undefined
    void preloadAssets().then(() => {
      if (live) timer = window.setTimeout(() => setReady(true), HOLD_MS)
    })
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [])

  if (ready) return children
  return (
    <Stage>
      <LoadingScreen />
    </Stage>
  )
}

function LoadingScreen() {
  const { done, total } = useSyncExternalStore(subscribePreload, preloadProgress)
  const share = total ? done / total : 0
  return (
    <div className="loading-screen fade-in flex h-full flex-col items-center justify-center">
      <h1 className="home-logo font-display text-[96px] font-bold leading-none tracking-[0.08em]">BATTLER</h1>
      <div className="mt-16 w-[560px]">
        <div className="flex items-baseline justify-between">
          <span className="loading-label">Préparation de l'arène</span>
          <span className="loading-value">{percent(share)}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Chargement"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(share * 100)}
          className="loading-track mt-3"
        >
          <div className="loading-fill" style={{ width: `${share * 100}%` }} />
        </div>
      </div>
    </div>
  )
}
