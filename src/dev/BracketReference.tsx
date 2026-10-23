import { useState } from 'react'
import { createWallets } from '../game/betting'
import { simulateCombat } from '../game/combat'
import { createCharacter } from '../game/roster'
import { seededRng } from '../game/rng'
import { allMatches, createTournament, matchFighters, status, withResult, type MatchRef, type Tournament } from '../game/tournament'
import { BracketScreen } from '../components/BracketScreen'
import { SoundToggle } from '../components/SoundToggle'
import { Stage } from '../components/Stage'

/*
 * Page de développement (`?bracket=<cas>` sur le serveur de dev) : l'arbre du tournoi sur un tournoi factice, construit
 * par les vraies fonctions du jeu (createTournament, simulateCombat, withResult), pour comparer ses captures en
 * 1440 × 810 aux références. Cas : `survol` (docs/ref/tournoi-arbre-survol.png : le 2e match montré survolé),
 * `paris` (docs/ref/tournoi-paris-ouverts.png : panneau Paris ouvert), `reel` (huitièmes joués, un quart joué),
 * `fini` (tournoi terminé, le champion au centre).
 */

/** Les seize cases des références, dans l'ordre de l'arbre */
const SLOTS = ['fanchon', 'aldric', 'gorak', 'elaria', 'ysolde', 'gorak', 'elaria', 'morgrut', 'brokk', 'ervald', 'ysolde', 'thaldrin', 'thaldrin', 'brokk', 'naraxes', 'morgrut']

/** Joue (par simulation, graines fixes) les `count` premiers matchs prêts, dans l'ordre de l'arbre. */
function played(count: number): Tournament {
  let t = createTournament(SLOTS, (id) => createCharacter(id).name)
  let seed = 1
  for (const ref of allMatches().slice(0, count)) {
    if (status(t, ref) !== 'ready') break
    t = withResult(t, ref, simulateCombat(matchFighters(t, ref), { seed: seed++ }), seededRng(seed))
  }
  return t
}

const CASES: Record<string, { results: number; betsOpen?: boolean; hovered?: MatchRef }> = {
  survol: { results: 0, hovered: { round: 0, index: 1 } },
  paris: { results: 0, betsOpen: true, hovered: { round: 0, index: 1 } },
  reel: { results: 9 },
  fini: { results: 15 },
}

export function BracketReference() {
  const asked = new URLSearchParams(location.search).get('bracket') || 'survol'
  const shown = CASES[asked] ?? CASES.survol
  const [tournament] = useState(() => played(shown.results))
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
