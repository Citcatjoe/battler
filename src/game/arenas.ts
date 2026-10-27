import gladeImg from '../assets/arena-glade.jpg'
import dwarfCityImg from '../assets/arena-dwarf-city.jpg'
import lanternLakeImg from '../assets/arena-lantern-lake.jpg'
import mushroomValeImg from '../assets/arena-mushroom-vale.jpg'
import tideTempleImg from '../assets/arena-tide-temple.jpg'
import skyHandImg from '../assets/arena-sky-hand.jpg'
import swampImg from '../assets/arena-swamp.jpg'
import terraceImg from '../assets/arena-terrace.jpg'
import trainingImg from '../assets/arena-training.jpg'
import redPitsImg from '../assets/arena-red-pits.jpg'
import archersPassImg from '../assets/arena-archers-pass.jpg'
import loneGateImg from '../assets/arena-lone-gate.jpg'
import spearFieldImg from '../assets/arena-spear-field.jpg'
import judgmentNaveImg from '../assets/arena-judgment-nave.jpg'
import greenhouseImg from '../assets/arena-greenhouse.jpg'
import titheBarnImg from '../assets/arena-tithe-barn.jpg'
import sunflowersImg from '../assets/arena-sunflowers.jpg'
import splitOakImg from '../assets/arena-split-oak.jpg'
import stageImg from '../assets/arena-stage.jpg'
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

/**
 * Arènes de campagne, par personnage : on affronte chaque adversaire chez lui (docs/STYLE_BIBLE.md § 5.7). Chacune
 * n'apparaît que contre son personnage, en campagne ; jamais au choix, jamais au hasard, ni en duel, ni en tournoi, ni en
 * saison. Le boss n'en a pas encore : sa rencontre garde le sélecteur d'arène.
 */
export const HOME_ARENAS: Readonly<Partial<Record<string, Arena>>> = {
  gorak: { id: 'red-pits', name: 'Les Fosses-Rouges', region: 'Kar-Dush', image: redPitsImg, focus: '50% 70%', filter: 'brightness(0.7) saturate(0.8)' },
  elaria: { id: 'archers-pass', name: 'La Passe-des-Archères', region: 'Marches de Lithmeren', image: archersPassImg, focus: '50% 70%', filter: 'brightness(0.75) saturate(0.9)' },
  brokk: { id: 'lone-gate', name: 'La Porte-Seule', region: 'Durnhold', image: loneGateImg, focus: '50% 70%', filter: 'brightness(0.6) saturate(0.85)' },
  ervald: { id: 'spear-field', name: 'Le Champ-des-Lances', region: 'Ostremort', image: spearFieldImg, focus: '50% 70%', filter: 'brightness(0.8) saturate(0.9)' },
  // Nef blanche en plein midi : la plus claire, la plus assombrie
  ysolde: { id: 'judgment-nave', name: 'Le Fléau', region: "Sanctuaire d'Aurelhaven", image: judgmentNaveImg, focus: '50% 70%', filter: 'brightness(0.55) saturate(0.9)' },
  naraxes: { id: 'greenhouse', name: 'La Serre-Gagnée', region: 'Sszeth', image: greenhouseImg, focus: '50% 70%', filter: 'brightness(0.65) saturate(0.85)' },
  aldric: { id: 'tithe-barn', name: 'La Grange-aux-Dîmes', region: 'Commanderie du Sceau ardent', image: titheBarnImg, focus: '50% 70%', filter: 'brightness(0.65) saturate(0.8)' },
  morgrut: { id: 'sunflowers', name: 'Les Grands-Soleils', region: 'Moulin de Brévanne', image: sunflowersImg, focus: '50% 70%', filter: 'brightness(0.65) saturate(0.85)' },
  thaldrin: { id: 'split-oak', name: 'Le Chêne-Fendu', region: 'Lande de Garance', image: splitOakImg, focus: '50% 70%', filter: 'brightness(0.7) saturate(0.85)' },
  fanchon: { id: 'stage', name: 'Les Tréteaux', region: 'Foire de Clairbourg', image: stageImg, focus: '50% 70%', filter: 'brightness(0.7) saturate(0.85)' },
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
