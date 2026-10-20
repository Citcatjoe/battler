import { useMemo, useState } from 'react'
import type { Character } from '../game/character'
import { simulateCombat, type CombatResult, type Pair, type Side } from '../game/combat'
import { reportCombat } from '../game/debugConsole'
import { randomSeed } from '../game/rng'
import { CHARACTERS, createCharacter } from '../game/roster'
import { FightScreen } from './FightScreen'

/*
 * Combat test : un mode de mise au point des compétences, sans sélection ni écran d'affrontement,
 * sans décor (fond noir en attendant le sien). Le combat s'arrête avant chaque dé et le joueur
 * choisit la face sur le pavé du combattant qui a la main (ou laisse le hasard) : on vérifie ainsi
 * l'enchaînement des compétences, leur résolution et leur rythme, coup par coup. Rien n'est compté
 * dans les statistiques ; la trace finale part dans `logs/combats/` (suffixe `_triche`).
 */

interface Props {
  /** Combattants de départ */
  initial: Pair<string>
  onMenu: () => void
}

interface Session {
  ids: Pair<string>
  /** Hasard du combat (initiative, esquive, critique, chances) : les dés choisis le remplacent un à un */
  seed: number
}

const newSession = (ids: Pair<string>): Session => ({ ids, seed: randomSeed() })

export function TestFightScreen({ initial, onMenu }: Props) {
  const [session, setSession] = useState(() => newSession(initial))
  const { ids, seed } = session
  const script = useMemo(() => {
    const fighters: Pair<Character> = [createCharacter(ids[0]), createCharacter(ids[1])]
    return simulateCombat(fighters, { seed })
  }, [ids, seed])

  const swap = (side: Side, id: string) => setSession(newSession(side === 0 ? [id, ids[1]] : [ids[0], id]))
  // Combat test : hors statistiques ; seule sa trace est gardée, pour `npm run logs`
  const onEnd = (result: CombatResult) => reportCombat(result)

  return (
    <FightScreen
      key={`${ids.join('-')}-${seed}`}
      script={script}
      arena={null}
      onEnd={onEnd}
      test={{
        // En haut de l'arène : un sélecteur par camp, et les commandes du mode au centre
        toolbar: (
          <div className="pointer-events-none absolute inset-x-8 top-4 z-40 flex items-start justify-between">
            {([0, 1] as Side[]).map((side) => (
              <label
                key={side}
                className={`pointer-events-auto flex flex-col gap-1 ${side === 1 ? 'order-last items-end' : ''}`}
              >
                <span className="text-[11px] font-bold uppercase tracking-widest text-stone-500">
                  {side === 0 ? 'Gauche' : 'Droite'}
                </span>
                <select value={ids[side]} onChange={(e) => swap(side, e.target.value)} className="test-select">
                  {CHARACTERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <div className="pointer-events-auto flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-fuchsia-300/80">Combat test</span>
              <div className="flex gap-2">
                <button onClick={() => setSession(newSession(ids))} className="btn btn-sm" title="Recommencer le combat (nouvelle initiative)">
                  <span>Recommencer</span>
                </button>
                <button onClick={onMenu} className="btn btn-sm" title="Retour au menu">
                  <span>Menu</span>
                </button>
              </div>
            </div>
          </div>
        ),
      }}
    />
  )
}
