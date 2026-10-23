import { useState } from 'react'
import { ARENAS, RANDOM_ARENA, type ArenaChoice } from '../game/arenas'
import { createWallets, priceMatch } from '../game/betting'
import type { Character } from '../game/character'
import type { Pair } from '../game/combat'
import { offerTargets, withForgeStep, type ForgeStep } from '../game/forge'
import { RELICS } from '../game/relics'
import { createCharacter, ENGRAVABLE_SKILLS } from '../game/roster'
import { MatchupScreen } from '../components/MatchupScreen'
import { SoundToggle } from '../components/SoundToggle'
import { Stage } from '../components/Stage'

/*
 * Page de développement (`?matchup=<cas>` sur le serveur de dev) : l'écran d'affrontement avec des fiches factices,
 * construites par les vraies fonctions du jeu (personnage, forge du dé, reliques), pour comparer ses captures en
 * 1440 × 810 aux références (docs/ref/affrontement-reel.png, affrontement-limite.png). Cas : `reel`, `limite`,
 * `reel-inverse`, `limite-inverse`, `druide` (druide contre un d16 forgé et doré), `barde` (barde contre un dé doré).
 */

/** Une opération de forge voulue ; la compétence d'une gravure est la première du roster qui convient. */
type Plan = { op: 'engrave'; face: number } | { op: 'sharpen'; face: number } | { op: 'gild'; face: number } | { op: 'enlarge' } | { op: 'trim' }

/** Compétences à graver, celles qui gardent le coup d'abord */
const POOL = [...ENGRAVABLE_SKILLS].sort((a, b) => Number(!!a.forfeitsHit) - Number(!!b.forfeitsHit))

/**
 * Le personnage forgé selon le plan, chaque opération vérifiée par la forge. Une compétence qui ne gagne rien à un rang
 * de plus ne s'aiguise pas : l'aiguisage passe alors à la première face aiguisable (le cas veut un rang, pas une face).
 */
function forged(character: Character, plan: readonly Plan[]): Character {
  const base = character.definition
  let steps: ForgeStep[] = []
  for (const p of plan) {
    if (p.op === 'engrave') {
      const next = POOL.map((skill) => {
        try {
          return withForgeStep(base, steps, { op: 'engrave', face: p.face, skill })
        } catch {
          return null
        }
      }).find((s) => s !== null)
      if (!next) throw new Error(`Aucune gravure possible sur le ${p.face}`)
      steps = next
    } else if (p.op === 'sharpen') {
      const targets = offerTargets(base, steps, { op: 'sharpen' })
      const face = targets.includes(p.face) ? p.face : targets[0]
      if (face === undefined) throw new Error(`${character.name} : aucune face à aiguiser`)
      steps = withForgeStep(base, steps, { op: 'sharpen', face })
    } else steps = withForgeStep(base, steps, p)
  }
  return character.withForge(steps)
}

/** Reliques qui ne changent pas la taille du dé (le cas fixe sa taille par la forge) */
const RELIC_POOL = RELICS.filter((r) => !r.stats?.damageDie)
const relics = (n: number, from = 0) => RELIC_POOL.slice(from, from + n)

const gorak = createCharacter('gorak')
const ervald = createCharacter('ervald')

interface Case {
  fighters: Pair<Character>
  ranks?: Pair<number | null>
  arena: ArenaChoice
  title: string
}

function buildCases(): Record<string, Case> {
  const real: Case = {
    fighters: [
      forged(gorak, [{ op: 'engrave', face: 5 }, { op: 'sharpen', face: 3 }]).withRelics(relics(3)),
      forged(ervald, [{ op: 'enlarge' }, { op: 'trim' }, { op: 'engrave', face: 9 }])
        .withName('Ervald le Revenu')
        .withRelics(relics(3, 3)),
    ],
    ranks: [1, 16],
    arena: ARENAS[2].id,
    title: 'Huitièmes de finale · Match 1',
  }
  const limit: Case = {
    fighters: [
      forged(gorak, [{ op: 'trim' }, { op: 'trim' }, { op: 'trim' }, { op: 'trim' }, { op: 'trim' }]),
      forged(ervald, [
        { op: 'enlarge' },
        { op: 'engrave', face: 9 },
        { op: 'engrave', face: 12 },
        { op: 'sharpen', face: 2 },
        { op: 'sharpen', face: 9 },
        { op: 'sharpen', face: 9 },
      ])
        .withName('Ervald le Revenu, Chevalier des Cendres')
        .withRelics(relics(10)),
    ],
    ranks: [1, 16],
    arena: RANDOM_ARENA,
    title: 'Huitièmes de finale · Match 1',
  }
  const cases: Record<string, Case> = {
    reel: real,
    limite: limit,
    druide: {
      fighters: [
        forged(createCharacter('thaldrin'), [{ op: 'gild', face: 5 }]).withRelics(relics(2, 4)),
        forged(createCharacter('morgrut'), [{ op: 'enlarge' }, { op: 'engrave', face: 6 }, { op: 'gild', face: 4 }, { op: 'engrave', face: 15 }]).withRelics(
          relics(6),
        ),
      ],
      arena: ARENAS[0].id,
      title: 'Saison · Journée 2 · Match 3',
    },
    barde: {
      fighters: [
        forged(createCharacter('fanchon'), [{ op: 'enlarge' }, { op: 'engrave', face: 6 }, { op: 'gild', face: 6 }, { op: 'gild', face: 2 }]).withRelics(relics(1, 7)),
        forged(gorak, [{ op: 'gild', face: 4 }, { op: 'gild', face: 8 }, { op: 'engrave', face: 7 }]).withRelics(relics(7)),
      ],
      ranks: [null, 3],
      arena: ARENAS[5].id,
      title: 'Duel',
    },
  }
  // Les deux mêmes fiches, camps inversés
  for (const [name, c] of [['reel', real], ['limite', limit]] as const)
    cases[`${name}-inverse`] = { ...c, fighters: [c.fighters[1], c.fighters[0]], ranks: c.ranks && [c.ranks[1], c.ranks[0]] }
  return cases
}

export function MatchupReference() {
  const asked = new URLSearchParams(location.search).get('matchup') || 'reel'
  const [cases] = useState(buildCases)
  const shown = cases[asked] ?? cases.reel
  const [arena, setArena] = useState<ArenaChoice>(shown.arena)
  const [odds] = useState(() => priceMatch(shown.fighters, 'dev', 40))
  const [wallets] = useState(createWallets)
  const noop = () => {}
  return (
    <Stage>
      <SoundToggle />
      <MatchupScreen
        fighters={shown.fighters}
        ranks={shown.ranks}
        title={shown.title}
        back={{ label: 'Arbre', icon: 'retour' }}
        arena={arena}
        onArenaChange={setArena}
        onPlay={noop}
        onSimulate={noop}
        onBack={noop}
        betting={{ wallets, odds, onBet: () => null, onCancel: noop }}
      />
    </Stage>
  )
}
