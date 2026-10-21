/*
 * Événements de scène (0.73.0) : une compétence peut déclarer un `scene` (events.ts) ; l'écran le joue sur
 * toute l'arène quand elle part, avant que ses effets tombent. Présentation seulement : le moteur ne les lit
 * pas, ils ne changent aucun résultat. C'est un gabarit pour de futurs coups spéciaux et sorts « à grand
 * spectacle » d'autres personnages.
 *
 * Ajouter un événement de scène :
 * 1. un identifiant dans `SceneEventId` et son rythme dans `SCENE_EVENTS` (ici) ;
 * 2. son rendu dans `SCENE_VIEWS` (`components/SceneEvent.tsx`) : un fond sur toute l'arène (`Backdrop`)
 *    et, s'il vise quelqu'un, une marque posée sur sa cible (`OnTarget`) ;
 * 3. `scene: '<id>'` sur la compétence (roster.ts). Une compétence en plusieurs coups (`hits` d'un effet
 *    `damage`) fait tomber un coup par impact.
 */

export type SceneEventId = 'lightning'

export interface SceneTiming {
  /**
   * Instants des impacts depuis le début de l'événement (ms à ×1) : les dégâts du coup n° k s'affichent au
   * k-ième. Un seul impact pour un coup unique.
   */
  impacts: readonly number[]
  /** Durée totale de l'événement à l'écran (ms à ×1), impacts compris */
  length: number
}

export const SCENE_EVENTS: Record<SceneEventId, SceneTiming> = {
  // Foudre (druide, 0.76.0) : l'arène s'assombrit, trois éclairs tombent l'un après l'autre autour de la
  // cible (un coup de 2 chacun), puis la lumière revient
  lightning: { impacts: [440, 800, 1160], length: 1750 },
}
