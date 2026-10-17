import ruinsImg from '../assets/arena-ruins.jpg'
import fortressImg from '../assets/arena-dwarf-fortress.jpg'
import { defaultRng, pick, type Rng } from './rng'

/*
 * Arènes : le cadre visuel d'un combat. Purement décoratives, elles n'influencent pas les règles.
 * Ajouter une arène = une image dans src/assets/ (voir docs/STYLE_BIBLE.md) et une entrée ici.
 */

export interface Arena {
  id: string
  name: string
  image: string
  /** Cadrage CSS (`object-position`) : le sol doit tomber sous les pieds des combattants */
  focus: string
  /** Traitement du décor pendant le combat (assombri pour laisser les combattants au premier plan) */
  filter: string
}

export const ARENAS: readonly Arena[] = [
  {
    id: 'ruins',
    name: 'Ruines forestières',
    image: ruinsImg,
    focus: '50% 70%',
    filter: 'brightness(0.5) saturate(0.85) blur(1.5px)',
  },
  {
    id: 'dwarf-fortress',
    name: 'Cour de Durnhold',
    image: fortressImg,
    focus: '50% 75%',
    // Décor très lumineux (ciel, braseros) : un peu plus assombri
    filter: 'brightness(0.45) saturate(0.85) blur(1.5px)',
  },
]

/** Choix « au hasard » : l'arène est tirée au moment de lancer le combat. */
export const RANDOM_ARENA = 'random'

export type ArenaChoice = string

export function getArena(id: string): Arena {
  return ARENAS.find((a) => a.id === id) ?? ARENAS[0]
}

/** Résout un choix (une arène précise ou « au hasard ») en arène concrète. */
export function resolveArena(choice: ArenaChoice, rng: Rng = defaultRng): Arena {
  return choice === RANDOM_ARENA ? pick(rng, ARENAS) : getArena(choice)
}
