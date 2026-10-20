import { useState } from 'react'
import { ROSTER } from '../game/roster'
import { Icon, skillIcon } from './Icon'

/**
 * Sceaux peints des compétences (asset A-01 du design system, pas encore générés), par id de
 * compétence. Tant qu'une compétence n'a pas le sien, ou si l'image ne charge pas, sa fenêtre
 * montre son icône peinte actuelle, à la même taille : rien ne bouge quand le sceau arrive.
 */
const SKILL_SEAL: Partial<Record<string, string>> = {}

/** Fenêtre octogonale du sceau d'une compétence (.skill-seal de index.css), de 32, 40 ou 56 px. */
export function SkillSeal({ id, size = 56 }: { id: string; size?: 32 | 40 | 56 }) {
  const [failed, setFailed] = useState(false)
  const seal = SKILL_SEAL[id]
  // L'icône de la compétence elle-même (et non l'étoile générique), cherchée par son id dans le roster
  const event = ROSTER.flatMap((c) => c.events).find((e) => e.id === id)
  const icon = event ? skillIcon(event) : 'event'
  return (
    <span className="skill-seal" style={{ width: size, height: size }}>
      {seal && !failed ? (
        <img src={seal} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <Icon name={icon} className="h-[86%] w-[86%]" />
      )}
    </span>
  )
}
