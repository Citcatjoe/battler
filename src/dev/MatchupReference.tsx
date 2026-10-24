import { useEffect, useState } from 'react'
import { ARENAS, RANDOM_ARENA, type ArenaChoice } from '../game/arenas'
import { createWallets, priceMatch } from '../game/betting'
import type { Character } from '../game/character'
import type { Pair } from '../game/combat'
import { offerTargets, withForgeStep, type ForgeStep } from '../game/forge'
import { relationOf } from '../game/events'
import { RELICS } from '../game/relics'
import { createCharacter, ENGRAVABLE_SKILLS } from '../game/roster'
import { MatchupScreen, type MatchupMode } from '../components/MatchupScreen'
import { SoundToggle } from '../components/SoundToggle'
import { Stage } from '../components/Stage'

/*
 * Page de développement (`?matchup=<cas>` sur le serveur de dev) : l'écran d'affrontement avec des fiches factices,
 * construites par les vraies fonctions du jeu (personnage, forge du dé, reliques), pour comparer ses captures en
 * 1440 × 810 aux références (docs/ref/affrontement-*.png). Cas des références de l'écran unique (0.100.0) : `duel`
 * (sélecteur au camp gauche), `duel-droit` (au camp droit), `tournoi` (tête de série, forge, reliques, Parier),
 * `saison-son` (saison, panneau du son ouvert). Cas de la géométrie fixe (0.99.0, forges du d6 depuis la 0.105.0) :
 * `reel`, `limite`, `reel-inverse`, `limite-inverse`, `druide` (druide contre l'ogre gravé, doré et copié), `barde`
 * (barde contre un dé doré).
 */

/** Une opération de forge voulue ; la compétence d'une gravure est la première du roster qui convient. */
type Plan = { op: 'engrave'; face: number } | { op: 'sharpen'; face: number } | { op: 'gild'; face: number } | { op: 'copy'; face: number } | { op: 'temper' }

/** Compétences à graver, celles qui gardent le coup d'abord */
const POOL = [...ENGRAVABLE_SKILLS].sort((a, b) => Number(relationOf(a) === 'replace') - Number(relationOf(b) === 'replace'))

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

const relics = (n: number, from = 0) => RELICS.slice(from, from + n)

const gorak = createCharacter('gorak')
const ervald = createCharacter('ervald')

interface Case {
  mode: MatchupMode
  fighters: Pair<Character>
  ranks?: Pair<number | null>
  arena: ArenaChoice
  /** Intitulé ; absent : celui du contexte (« Duel ») */
  title?: string
  /** Duel : le camp qui choisit dans le sélecteur */
  pickerSide?: 'gauche' | 'droite'
  /** Panneau du son ouvert */
  soundOpen?: boolean
}

function buildCases(): Record<string, Case> {
  const real: Case = {
    mode: 'tournament',
    fighters: [
      forged(gorak, [{ op: 'engrave', face: 5 }, { op: 'sharpen', face: 2 }]).withRelics(relics(3)),
      forged(ervald, [{ op: 'copy', face: 1 }, { op: 'engrave', face: 4 }])
        .withName('Ervald le Revenu')
        .withRelics(relics(3, 3)),
    ],
    ranks: [1, 16],
    arena: ARENAS[2].id,
    title: 'Huitièmes de finale · Match 1',
  }
  const limit: Case = {
    mode: 'tournament',
    fighters: [
      forged(gorak, [{ op: 'temper' }, { op: 'gild', face: 6 }]),
      forged(ervald, [
        { op: 'engrave', face: 3 },
        { op: 'engrave', face: 4 },
        { op: 'sharpen', face: 1 },
        { op: 'sharpen', face: 3 },
        { op: 'sharpen', face: 3 },
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
    duel: { mode: 'duel', fighters: [gorak, ervald], arena: ARENAS[2].id },
    'duel-droit': { mode: 'duel', fighters: [gorak, ervald], arena: ARENAS[2].id, pickerSide: 'droite' },
    tournoi: real,
    'saison-son': { ...real, mode: 'season', title: 'Saison · Journée 1 · Match 4', soundOpen: true },
    druide: {
      mode: 'season',
      fighters: [
        forged(createCharacter('thaldrin'), [{ op: 'sharpen', face: 1 }]).withRelics(relics(2, 4)),
        forged(createCharacter('morgrut'), [{ op: 'engrave', face: 1 }, { op: 'gild', face: 4 }, { op: 'copy', face: 1 }]).withRelics(
          relics(6),
        ),
      ],
      arena: ARENAS[0].id,
      title: 'Saison · Journée 2 · Match 3',
    },
    barde: {
      mode: 'tournament',
      fighters: [
        forged(createCharacter('fanchon'), [{ op: 'engrave', face: 6 }, { op: 'gild', face: 5 }, { op: 'gild', face: 4 }]).withRelics(relics(1, 7)),
        forged(gorak, [{ op: 'gild', face: 4 }, { op: 'gild', face: 6 }, { op: 'engrave', face: 3 }]).withRelics(relics(7)),
      ],
      ranks: [null, 3],
      arena: ARENAS[5].id,
      title: 'Huitièmes de finale · Match 3',
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
  const [fighters, setFighters] = useState(shown.fighters)
  const [arena, setArena] = useState<ArenaChoice>(shown.arena)
  const [odds] = useState(() => priceMatch(shown.fighters, 'dev', 40))
  const [wallets] = useState(createWallets)
  // Duel au camp droit : l'onglet « Droite » du sélecteur, choisi comme le ferait le joueur
  useEffect(() => {
    if (shown.pickerSide !== 'droite') return
    const tab = [...document.querySelectorAll<HTMLButtonElement>('.matchup-picker [role="tab"]')].find((t) => t.textContent === 'Droite')
    tab?.click()
  }, [shown.pickerSide])
  const noop = () => {}
  return (
    <Stage>
      <SoundToggle initialOpen={shown.soundOpen} />
      <MatchupScreen
        mode={shown.mode}
        fighters={fighters}
        ranks={shown.ranks}
        title={shown.title}
        arena={arena}
        onArenaChange={setArena}
        onPlay={noop}
        onSimulate={noop}
        onBack={noop}
        onPick={(side, character) => setFighters((f) => (side === 0 ? [character, f[1]] : [f[0], character]))}
        // Pas de paris en saison (la règle) : pas de bourse
        betting={shown.mode === 'season' ? undefined : { wallets, odds, onBet: () => null, onCancel: noop }}
      />
    </Stage>
  )
}
