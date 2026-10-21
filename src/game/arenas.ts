import gladeImg from '../assets/arena-glade.jpg'
import dwarfCityImg from '../assets/arena-dwarf-city.jpg'
import lanternLakeImg from '../assets/arena-lantern-lake.jpg'
import mushroomValeImg from '../assets/arena-mushroom-vale.jpg'
import tideTempleImg from '../assets/arena-tide-temple.jpg'
import skyHandImg from '../assets/arena-sky-hand.jpg'
import swampImg from '../assets/arena-swamp.jpg'
import terraceImg from '../assets/arena-terrace.jpg'
import trainingImg from '../assets/arena-training.jpg'
import { defaultRng, pick, type Rng } from './rng'

/*
 * Arènes : le cadre visuel d'un combat. Purement décoratives, elles n'influencent pas les règles.
 * Ajouter une arène = une image dans src/assets/ (voir docs/STYLE_BIBLE.md) et une entrée ici.
 * Chaque arène porte le nom d'un lieu-dit (`name`) et du lieu qui l'entoure (`region`), comme sur une carte.
 */

export interface Arena {
  id: string
  /** Lieu-dit, affiché en grand */
  name: string
  /** Lieu plus large (bois, val, lac…), affiché sous le lieu-dit */
  region: string
  image: string
  /** Cadrage CSS (`object-position`) : le sol doit tomber sous les pieds des combattants */
  focus: string
  /** Traitement du décor pendant le combat (assombri pour laisser les combattants au premier plan) */
  filter: string
}

/** Arènes des duels et du tournoi : au choix sur l'écran d'affrontement, ou tirées au hasard. */
export const ARENAS: readonly Arena[] = [
  {
    id: 'glade',
    name: 'Les Pierres-Couchées',
    region: 'Bois de Vaumorin',
    image: gladeImg,
    focus: '50% 70%',
    // Plein jour, sol clair : le plus assombri
    filter: 'brightness(0.6) saturate(0.9)',
  },
  {
    id: 'dwarf-city',
    name: 'La Cour-des-Enclumes',
    region: 'Durnhold',
    image: dwarfCityImg,
    focus: '50% 72%',
    filter: 'brightness(0.65) saturate(0.9)',
  },
  {
    id: 'lantern-lake',
    name: 'Les Mille-Feux',
    region: 'Lac Sorelle',
    image: lanternLakeImg,
    focus: '50% 70%',
    filter: 'brightness(0.75) saturate(0.9)',
  },
  {
    id: 'mushroom-vale',
    name: 'Les Chapeaux-Fols',
    region: 'Val Brunelle',
    image: mushroomValeImg,
    focus: '50% 70%',
    // Champignons très saturés : on calme la couleur plus que la lumière
    filter: 'brightness(0.65) saturate(0.75)',
  },
  {
    id: 'tide-temple',
    name: 'Les Cloches-Noyées',
    region: 'Anse de Morvoux',
    image: tideTempleImg,
    focus: '50% 70%',
    filter: 'brightness(0.7) saturate(0.9)',
  },
  {
    id: 'sky-hand',
    name: 'La Paume-du-Vieux',
    region: 'Pic Solange',
    image: skyHandImg,
    focus: '50% 70%',
    filter: 'brightness(0.6) saturate(0.9)',
  },
  {
    id: 'swamp',
    name: 'Les Pilotis',
    region: 'Marais de Gâtebois',
    image: swampImg,
    focus: '50% 70%',
    filter: 'brightness(0.8) saturate(0.9)',
  },
  {
    id: 'terrace',
    name: 'Le Pas-des-Comètes',
    region: "Col d'Aubrelle",
    image: terraceImg,
    focus: '50% 72%',
    filter: 'brightness(0.7) saturate(0.85)',
  },
]

/** Arène de l'entraînement : décor par défaut du combat test, et jamais ailleurs (ni au choix, ni au hasard). */
export const TRAINING_ARENA: Arena = {
  id: 'training',
  name: 'Le Pré-aux-Guetteurs',
  region: 'Forêt de Brandeval',
  image: trainingImg,
  focus: '50% 70%',
  filter: 'brightness(0.8) saturate(0.9)',
}

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
