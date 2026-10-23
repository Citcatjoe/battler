import menuDuelImg from './assets/menu-duel.jpg'
import menuTournamentImg from './assets/menu-tournament.jpg'
import { ICON_URLS } from './components/Icon'
import { ARENAS, TRAINING_ARENA } from './game/arenas'
import { poseImages } from './game/poses'
import { CHARACTERS } from './game/roster'
import { AUDIO_URLS, prefetchAudio } from './game/sound'

/*
 * Préchargement des ressources avant l'accueil (LoadingScreen.tsx). En local, tout arrive presque aussitôt ;
 * en ligne, sans lui, chaque illustration se téléchargerait à sa première apparition (un combattant vide le
 * temps de son image, une icône qui surgit en plein combat). On ne précharge que ce que le jeu affiche ou joue :
 * les fichiers de `src/assets/` qu'aucun module n'importe ne sont pas livrés et restent hors de la liste.
 */

/** Polices du jeu (index.html), dans les graisses utilisées ; le test de police (`?police=`) n'en fait pas partie. */
const FONTS = [
  '600 16px Cinzel',
  '700 16px Cinzel',
  '800 16px Cinzel',
  "400 16px 'Alegreya Sans'",
  "500 16px 'Alegreya Sans'",
  "700 16px 'Alegreya Sans'",
  "italic 400 16px 'Alegreya Sans'",
  "800 16px 'Alegreya Sans SC'",
  "900 16px 'Alegreya Sans SC'",
  "400 16px 'IBM Plex Mono'",
  "500 16px 'IBM Plex Mono'",
  '400 16px Inter',
  '500 16px Inter',
  '700 16px Inter',
]

/** Les images affichées : combattants (chaque forme, chaque posture), arènes, fonds des menus, icônes peintes */
function imageUrls(): string[] {
  const fighters = CHARACTERS.flatMap((c) => (c.forms ?? [null]).flatMap((_, f) => poseImages(c.lookFor(f))))
  const arenas = [...ARENAS, TRAINING_ARENA].map((a) => a.image)
  return [...new Set([...fighters, ...arenas, menuDuelImg, menuTournamentImg, ...ICON_URLS])]
}

function loadImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(url))
    img.src = url
  })
}

export interface PreloadProgress {
  done: number
  total: number
}

let progress: PreloadProgress = { done: 0, total: 0 }
const listeners = new Set<() => void>()
let running: Promise<void> | null = null

function setProgress(next: PreloadProgress) {
  progress = next
  for (const listener of listeners) listener()
}

/**
 * Télécharge toutes les ressources, une seule fois même si on l'appelle plusieurs fois. Ne rejette jamais :
 * un fichier manquant est signalé dans la console et se rechargera au besoin, sans bloquer l'entrée en jeu.
 */
export function preloadAssets(): Promise<void> {
  return (running ??= (async () => {
    const tasks: (() => Promise<unknown>)[] = [
      ...imageUrls().map((url) => () => loadImage(url)),
      ...AUDIO_URLS.map((url) => () => prefetchAudio(url)),
      ...FONTS.map((font) => () => document.fonts.load(font)),
    ]
    setProgress({ done: 0, total: tasks.length })
    const results = await Promise.allSettled(
      tasks.map((task) => task().finally(() => setProgress({ ...progress, done: progress.done + 1 }))),
    )
    const failed = results.flatMap((r) => (r.status === 'rejected' ? [String(r.reason)] : []))
    if (failed.length) console.warn(`Préchargement : ${failed.length} ressource(s) indisponible(s)\n${failed.join('\n')}`)
  })())
}

/** Pour `useSyncExternalStore` : avancement du préchargement */
export function subscribePreload(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const preloadProgress = () => progress
