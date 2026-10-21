/**
 * La haie de l'accueil (HomeScreen) : les combattants qui encadrent l'allée centrale, des deux côtés,
 * jusqu'à la porte de l'arène. Une simple liste, pour pouvoir changer les personnages ou les tirer au
 * hasard plus tard sans toucher au composant.
 *
 * Perspective : plus un plan est éloigné, plus le personnage est petit, sombre et haut sur l'écran (ses
 * pieds remontent vers la porte). Les pieds du plan avant sont près du bas de l'écran. De chaque côté : le
 * milieu au bord, l'avant devant lui, l'arrière qui dépasse entre l'avant et l'allée. Aucun emplacement ne
 * doit empiéter sur la colonne du logo et des modes (x de 545 à 1055 px) ni sortir de l'écran.
 */

export type HedgePlane = 'front' | 'mid' | 'back'

export interface HedgeSlot {
  /** Id du personnage (roster.ts) */
  id: string
  /** Côté de l'allée : le personnage regarde toujours vers le centre (miroir à droite) */
  side: 'left' | 'right'
  plane: HedgePlane
  /** Taille du personnage, des pieds au sommet de la tête, en part de la hauteur de la scène */
  height: number
  /** Centre du corps, en part de la largeur de la scène, compté depuis le bord de son côté */
  x: number
  /** Ligne des pieds, en part de la hauteur de la scène, depuis le haut */
  feet: number
}

/** Assombrissement et ordre d'empilement de chaque plan : l'avant est seul en pleine lumière. */
export const HEDGE_PLANES: Record<HedgePlane, { brightness: number; saturate: number; z: number }> = {
  back: { brightness: 0.38, saturate: 0.6, z: 1 },
  mid: { brightness: 0.6, saturate: 0.8, z: 2 },
  front: { brightness: 1, saturate: 1, z: 3 },
}

/**
 * 6 combattants, 3 par côté : avant ≈ 52 % de la hauteur, milieu ≈ 46 %, arrière ≈ 41 %. L'écart entre les
 * plans est resserré (0.66.1) : un avant énorme devant un arrière minuscule faisait deux mondes. Les avants
 * laissent voir l'arrière qui dépasse derrière eux, et sont visuellement calmes (0.66.2) : peu de motifs,
 * de grandes masses, une silhouette compacte ; un personnage très détaillé (Fanchon) brouillait la lecture
 * au premier plan. À gauche, l'ordre est celui de l'utilisateur (0.67.1) : Ysolde devant, Aldric au
 * milieu, Gorak derrière, plus grand que l'arrière de droite et monté (0.67.3) : derrière Ysolde, seule
 * sa partie haute se voit, donc on le grandit et on remonte ses pieds pour que sa tête dépasse nettement.
 * Il est rentré pour que sa hache n'entre pas dans l'allée.
 */
export const HOME_HEDGE: readonly HedgeSlot[] = [
  { id: 'aldric', side: 'left', plane: 'mid', height: 0.46, x: 0.115, feet: 0.9 },
  { id: 'ysolde', side: 'left', plane: 'front', height: 0.51, x: 0.215, feet: 0.975 },
  { id: 'gorak', side: 'left', plane: 'back', height: 0.47, x: 0.225, feet: 0.8 },
  { id: 'ervald', side: 'right', plane: 'front', height: 0.52, x: 0.225, feet: 0.975 },
  { id: 'elaria', side: 'right', plane: 'mid', height: 0.46, x: 0.11, feet: 0.9 },
  { id: 'naraxes', side: 'right', plane: 'back', height: 0.41, x: 0.268, feet: 0.83 },
]
