import { useState } from 'react'
import { createWallets } from '../game/betting'
import { simulateCombat } from '../game/combat'
import { CHARACTER_IDS, createCharacter } from '../game/roster'
import { seededRng } from '../game/rng'
import { createSeasonTournament, seasonSchedule, simulateSeasonMatches, startBracket } from '../game/season'
import { allMatches, createTournament, fillSlots, matchFighters, status, withResult, type MatchRef, type Tournament } from '../game/tournament'
import { BracketScreen } from '../components/BracketScreen'
import { SoundToggle } from '../components/SoundToggle'
import { Stage } from '../components/Stage'

/*
 * Page de développement (`?bracket=<cas>` sur le serveur de dev) : l'arbre du tournoi sur un tournoi factice, construit
 * par les vraies fonctions du jeu (createTournament, simulateCombat, withResult), pour comparer ses captures en
 * 1440 × 810 aux références. Cas : `survol` (docs/ref/tournoi-arbre-survol.png : le 2e match montré survolé),
 * `paris` (docs/ref/tournoi-paris-ouverts.png : panneau Paris ouvert), `reel` (huitièmes joués, un quart joué),
 * `fini` (tournoi terminé, le champion au centre), `saison` (après une saison de 20 simulée, reliques et forge : chaque
 * participant porte sa construction complète ; huitièmes et un quart joués).
 */

/** Les seize cases des références, dans l'ordre de l'arbre */
const SLOTS = ['fanchon', 'aldric', 'gorak', 'elaria', 'ysolde', 'gorak', 'elaria', 'morgrut', 'brokk', 'ervald', 'ysolde', 'thaldrin', 'thaldrin', 'brokk', 'naraxes', 'morgrut']

/** Une saison de 20, reliques et forge, simulée en entier (graines fixes), puis son arbre : 16 constructions complètes. */
function afterSeason(): Tournament {
  const size = 20
  const t = createSeasonTournament(fillSlots(Array(size).fill(null), CHARACTER_IDS, seededRng(3)), (id) => createCharacter(id).name, { seed: 1, forge: true })
  return startBracket(simulateSeasonMatches(t, seasonSchedule(size).flat().map((f) => f.number)))
}

/** Joue (par simulation, graines fixes) les `count` premiers matchs prêts, dans l'ordre de l'arbre. */
function played(count: number, season = false): Tournament {
  let t = season ? afterSeason() : createTournament(SLOTS, (id) => createCharacter(id).name)
  let seed = 1
  for (const ref of allMatches().slice(0, count)) {
    if (status(t, ref) !== 'ready') break
    t = withResult(t, ref, simulateCombat(matchFighters(t, ref), { seed: seed++ }), seededRng(seed))
  }
  return t
}

const CASES: Record<string, { results: number; betsOpen?: boolean; hovered?: MatchRef; season?: boolean }> = {
  survol: { results: 0, hovered: { round: 0, index: 1 } },
  paris: { results: 0, betsOpen: true, hovered: { round: 0, index: 1 } },
  reel: { results: 9 },
  fini: { results: 15 },
  saison: { results: 9, season: true },
}

export function BracketReference() {
  const asked = new URLSearchParams(location.search).get('bracket') || 'survol'
  const shown = CASES[asked] ?? CASES.survol
  const [tournament] = useState(() => played(shown.results, shown.season))
  const [wallets] = useState(createWallets)
  const noop = () => {}
  return (
    <Stage>
      <SoundToggle />
      <BracketScreen
        tournament={tournament}
        wallets={wallets}
        onSimulate={noop}
        onPlay={noop}
        onChampion={noop}
        onNewTournament={noop}
        onMenu={noop}
        initialBetsOpen={shown.betsOpen}
        hovered={shown.hovered}
      />
    </Stage>
  )
}
