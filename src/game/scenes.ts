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
 * 3. `scene: '<id>'` sur la compétence (roster.ts) ou sur la relique (relics.ts, reliques élémentaires, 0.85.0).
 *    Un effet `damage` en plusieurs coups (`hits`) fait tomber un coup par impact.
 */

export type SceneEventId = 'lightning' | 'emberRain' | 'gale' | 'hoarfrost' | 'stoneWall' | 'blindFlash' | 'dread' | 'shockwave'

export interface SceneTiming {
  /**
   * Instants des impacts depuis le début de l'événement (ms à ×1) : les dégâts du coup n° k s'affichent au
   * k-ième. Un seul impact pour un coup unique.
   */
  impacts: readonly number[]
  /** Durée totale de l'événement à l'écran (ms à ×1), impacts compris */
  length: number
  /**
   * Qui l'événement vise (0.85.0) : l'adversaire du lanceur (défaut : l'éclair tombe sur lui, un coup par impact), ou
   * le lanceur lui-même (la gangue de givre se referme sur lui ; ses effets tombent au premier impact).
   */
  aim?: 'opponent' | 'self'
  /** L'arène tremble à chaque impact (météores, roche qui jaillit) : la secousse des gros coups (FightScreen) */
  quake?: true
  /**
   * Son de chaque coup vers l'adversaire, à son impact (0.110.0, docs/SONS.md § 3 et § 4.1). Défaut : Coup.
   */
  sound?: 'hit' | 'crit'
}

export const SCENE_EVENTS: Record<SceneEventId, SceneTiming> = {
  // Foudre (druide, 0.76.0) : l'arène s'assombrit, les éclairs tombent l'un après l'autre autour de la cible (un coup de 1
  // chacun), puis la lumière revient ; chacun sonne le Coup critique, le son de l'éclair (0.76.0 ; gardé par l'utilisateur
  // le 2026-10-24, après le son de synthèse « Éclair » de la 0.110.0). Quatre éclairs depuis la revue des compétences
  // (O3) : le quatrième au même pas (360 ms), la scène s'allonge d'autant
  lightning: { impacts: [440, 800, 1160, 1520], length: 2110, sound: 'crit' },
  // Reliques élémentaires (0.85.0, docs/RELIQUES.md § 12) : le sceau de l'objet se brise, sa magie envahit l'arène.
  // Braise captive : le ciel rougit, trois météores tombent en diagonale sur l'adversaire (un coup de 2 chacun)
  emberRain: { impacts: [560, 900, 1240], length: 1900, quake: true, sound: 'crit' },
  // Conque des vents : l'esquive appelle le vent, trois lames d'air traversent l'arène vers l'adversaire
  gale: { impacts: [420, 640, 860], length: 1450 },
  // Larme de givre : le givre gagne l'écran, une gangue se referme sur le porteur et éclate (purge et soin)
  hoarfrost: { impacts: [760], length: 1650, aim: 'self' },
  // Géode fendue : l'arène tremble, des colonnes de roche jaillissent autour du porteur (le bouclier)
  stoneWall: { impacts: [380], length: 1350, aim: 'self', quake: true },
  // Sorts de malus (retour du 2026-10-27, S10 : « plus de magie, l'Éclair aveuglant devrait se voir ») : la scène porte le
  // malus, qui tombe sur la cible à son impact (MISE_EN_SCENE.md M54), sans coup.
  // Éclair aveuglant : un éclair blanc frappe la cible et l'arène blanchit, aveuglante, puis la lumière retombe
  blindFlash: { impacts: [360], length: 1150 },
  // Peur : l'arène s'assombrit de violet, une ombre monte sous la cible et l'enveloppe, puis se dissipe
  dread: { impacts: [560], length: 1400 },
  // Onde de choc (quatrième demande du 2026-10-27, proposition 1 de l'utilisateur) : le porteur frappe le sol, le sol se
  // fend devant lui, une onde roule jusqu'à l'adversaire et le soulève à l'impact ; l'arène tremble (MISE_EN_SCENE.md M56)
  shockwave: { impacts: [620], length: 1500, quake: true },
}

/** Le camp visé par un événement lancé par `source` (l'adversaire, ou le lanceur lui-même). */
export const sceneTarget = (id: SceneEventId, source: 0 | 1): 0 | 1 => (SCENE_EVENTS[id].aim === 'self' ? source : source === 0 ? 1 : 0)
