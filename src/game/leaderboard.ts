import type { ForgeStep } from './forge'
import { ENGRAVABLE_SKILLS } from './roster'

/*
 * Le classement du mode sans fin (accueil de la campagne, docs/CAMPAGNE.md § 13). Statique pour l'instant : le mode sans
 * fin n'est pas codé et il n'y a pas de backend (docs/EN_LIGNE.md). Le jour où les séries existeront, `leaderboard`
 * lira la source distante ; l'écran ne change pas, il ne connaît que `LeaderboardEntry` et `Leaderboard`. Le personnage
 * d'une entrée se reconstruit comme le champion d'une partie (campaign.ts, `championOf(entry.build)`).
 */

export type LeaderboardPeriod = 'week' | 'season' | 'allTime'

/** Le champion d'une série, tel qu'il est tombé : le personnage, son aura de départ, son dé forgé, ses reliques. */
export interface LeaderboardBuild {
  championId: string
  aura?: string
  forge: ForgeStep[]
  relics: string[]
}

export interface LeaderboardEntry {
  player: string
  build: LeaderboardBuild
  /** Combats gagnés d'affilée en mode sans fin : la mesure principale */
  series: number
  /** Départage des séries égales */
  points: number
}

export interface Leaderboard {
  /** Les dix premiers, triés : série, puis points */
  top: LeaderboardEntry[]
  /** Le joueur : son rang, même hors des dix premiers ; null s'il n'a encore battu aucun boss */
  you: { rank: number; entry: LeaderboardEntry } | null
}

/** Une gravure des données statiques, par l'id de sa compétence. */
function engrave(face: number, id: string): ForgeStep {
  const skill = ENGRAVABLE_SKILLS.find((e) => e.id === id)
  if (!skill) throw new Error(`Compétence à graver inconnue : ${id}`)
  return { op: 'engrave', face, skill }
}

/* ---------- Données statiques ---------- */

const BUILDS: Record<string, LeaderboardBuild> = {
  karma: {
    championId: 'gorak',
    forge: [{ op: 'sharpen', face: 1 }, engrave(3, 'cleave'), { op: 'copy', face: 2, to: 4 }, engrave(5, 'stunning-blow'), { op: 'sharpen', face: 3 }],
    relics: ['wolf-fang', 'lead-pommel', 'butcher-hook', 'spiked-bracer', 'felt-boots', 'opening-bell', 'hunter-trophy', 'talion-gauntlet', 'eagle-feather'],
  },
  miamiam: {
    championId: 'ervald',
    aura: 'dread',
    forge: [engrave(3, 'leech'), { op: 'sharpen', face: 2 }, engrave(4, 'fear'), { op: 'copy', face: 2, to: 5 }, engrave(6, 'grave-breath')],
    relics: ['frost-tear', 'gaoler-chain', 'vigil-candle', 'hermit-beads', 'mercenary-mail', 'blessed-phial', 'dented-shield', 'bonesetter-salve', 'caged-ember', 'reprieve-medal'],
  },
  brutus: {
    championId: 'morgrut',
    forge: [engrave(3, 'shockwave'), { op: 'sharpen', face: 2 }, { op: 'copy', face: 2, to: 4 }, engrave(6, 'guard-break')],
    relics: ['lead-pommel', 'four-nail-shoe', 'pavise-nails', 'quilted-gambison', 'forge-bellows', 'spiked-bracer', 'vanguard-horn'],
  },
  lysandre: {
    championId: 'elaria',
    aura: 'open-wound',
    forge: [engrave(3, 'quarry'), { op: 'sharpen', face: 1 }, engrave(5, 'hemorrhage'), { op: 'copy', face: 2, to: 6 }],
    relics: ['eagle-feather', 'wasp-sting', 'venom-vial', 'wind-conch', 'hunter-trophy', 'felt-boots', 'split-geode', 'holed-coin'],
  },
  okami: {
    championId: 'fanchon',
    forge: [engrave(3, 'false-note'), { op: 'sharpen', face: 1 }, engrave(4, 'lucky-strike'), { op: 'copy', face: 2, to: 5 }],
    relics: ['weighted-coin', 'holed-coin', 'opening-bell', 'abbey-incense', 'wind-conch', 'tinder-box', 'hollow-die', 'felt-boots', 'split-knucklebone'],
  },
  nerezza: {
    championId: 'ysolde',
    aura: 'judgement',
    forge: [engrave(3, 'faith-shield'), { op: 'sharpen', face: 2 }, engrave(6, 'sentence')],
    relics: ['blessed-phial', 'abbey-incense', 'vigil-candle', 'bonesetter-salve', 'reprieve-medal', 'dented-shield'],
  },
  tibo: {
    championId: 'gorak',
    aura: 'onrush',
    forge: [engrave(3, 'blood-scent'), { op: 'copy', face: 2, to: 4 }, { op: 'sharpen', face: 1 }],
    relics: ['butcher-hook', 'wolf-fang', 'spiked-bracer', 'lead-pommel', 'opening-bell', 'mercenary-mail', 'siege-clepsydra', 'vanguard-horn'],
  },
  zlatka: {
    championId: 'naraxes',
    aura: 'loaded-die',
    forge: [engrave(3, 'pilfer'), { op: 'sharpen', face: 2 }, engrave(5, 'cursed-coin')],
    relics: ['venom-vial', 'weighted-coin', 'wasp-sting', 'holed-coin', 'hollow-die', 'tinder-box', 'split-knucklebone'],
  },
  fennec: {
    championId: 'thaldrin',
    forge: [engrave(3, 'thunderbolt'), { op: 'sharpen', face: 2 }, { op: 'copy', face: 2, to: 4 }],
    relics: ['lightning-rod', 'caged-ember', 'tinder-box', 'bramble-collar', 'forge-bellows', 'wind-conch'],
  },
  hadrien: {
    championId: 'aldric',
    forge: [engrave(3, 'judgement'), { op: 'sharpen', face: 2 }],
    relics: ['talion-gauntlet', 'dented-shield', 'mercenary-mail', 'pavise-nails', 'vanguard-horn'],
  },
  sombrefer: {
    championId: 'brokk',
    aura: 'bastion',
    forge: [engrave(3, 'grudge'), { op: 'sharpen', face: 2 }, engrave(6, 'retribution')],
    relics: ['pavise-nails', 'quilted-gambison', 'dented-shield', 'bramble-collar', 'mercenary-mail', 'four-nail-shoe'],
  },
  you: {
    championId: 'elaria',
    forge: [engrave(3, 'quarry'), { op: 'sharpen', face: 2 }],
    relics: ['eagle-feather', 'felt-boots', 'wasp-sting', 'hunter-trophy'],
  },
}

const PLAYERS: Record<string, string> = {
  karma: 'Karma',
  miamiam: 'MiaMiaM',
  brutus: 'Brutus_77',
  lysandre: 'Lysandre',
  okami: 'Okami',
  nerezza: 'Nerezza',
  tibo: 'Tibo',
  zlatka: 'Zlatka',
  fennec: 'Fennec',
  hadrien: 'Hadrien',
  sombrefer: 'Sombrefer',
  you: 'Vous',
}

/** Série et points de chaque joueur, par période (non triés) ; le rang du joueur hors des dix premiers est donné. */
const TABLES: Record<LeaderboardPeriod, { rows: [string, number, number][]; you: { rank: number; series: number; points: number } | null }> = {
  week: {
    rows: [
      ['okami', 21, 8_420],
      ['tibo', 19, 7_905],
      ['zlatka', 17, 7_010],
      ['karma', 16, 6_880],
      ['fennec', 14, 5_930],
      ['sombrefer', 12, 5_215],
      ['nerezza', 11, 4_870],
      ['hadrien', 9, 4_120],
      ['lysandre', 8, 3_655],
      ['brutus', 6, 2_940],
    ],
    you: null,
  },
  season: {
    rows: [
      ['karma', 47, 18_920],
      ['miamiam', 41, 16_305],
      ['brutus', 38, 15_110],
      ['lysandre', 33, 13_870],
      ['okami', 29, 11_440],
      ['nerezza', 27, 10_960],
      ['tibo', 24, 9_785],
      ['zlatka', 22, 9_020],
      ['fennec', 19, 7_640],
      ['hadrien', 17, 6_915],
    ],
    you: { rank: 128, series: 6, points: 2_310 },
  },
  allTime: {
    rows: [
      ['miamiam', 63, 25_480],
      ['karma', 58, 23_115],
      ['sombrefer', 51, 20_640],
      ['brutus', 47, 19_005],
      ['lysandre', 44, 17_730],
      ['nerezza', 39, 15_960],
      ['okami', 37, 15_020],
      ['tibo', 33, 13_310],
      ['zlatka', 31, 12_480],
      ['fennec', 28, 11_205],
    ],
    you: { rank: 342, series: 9, points: 3_480 },
  },
}

/** Le classement d'une période. */
export function leaderboard(period: LeaderboardPeriod): Leaderboard {
  const table = TABLES[period]
  return {
    // Tri : la série, puis les points
    top: table.rows
      .map(([id, series, points]): LeaderboardEntry => ({ player: PLAYERS[id], build: BUILDS[id], series, points }))
      .sort((a, b) => b.series - a.series || b.points - a.points),
    you: table.you && { rank: table.you.rank, entry: { player: PLAYERS.you, build: BUILDS.you, series: table.you.series, points: table.you.points } },
  }
}
