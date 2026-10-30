import { useState, type CSSProperties, type ReactNode } from 'react'
import type { CharacterEvent } from '../game/events'
import { ALL_SKILLS } from '../game/roster'
import { auraOfSkill } from '../game/states'
import { Icon, skillIcon } from './Icon'

/**
 * Sceaux peints des compétences (asset A-01 du design system, pas encore générés), par id de
 * compétence. Tant qu'une compétence n'a pas le sien, ou si l'image ne charge pas, sa fenêtre
 * montre son icône peinte actuelle, à la même taille : rien ne bouge quand le sceau arrive.
 */
const SKILL_SEAL: Partial<Record<string, string>> = {}

/**
 * Le cadre d'une compétence, une grammaire pour tous les écrans (retour du 2026-10-30, R74 à R76) : une compétence dans
 * un octogone au tour violet, le même pour toutes (.skill-seal ; `codex` : le liseré de 2 px du compendium) ; une aura
 * dans un cercle au double contour d'or (.aura-seal). Une aura est une compétence qui ne fait que poser une aura sur
 * son porteur (`auraOfSkill`).
 */
export function SkillFrame({ event, size, codex = false, children }: { event?: Pick<CharacterEvent, 'effects'>; size: number; codex?: boolean; children: ReactNode }) {
  if (event && auraOfSkill(event) !== undefined)
    return (
      <span className="aura-seal" style={{ width: size, height: size, '--s': size } as CSSProperties}>
        {children}
      </span>
    )
  return (
    <span className={codex ? 'skill-seal codex-skill-seal' : 'skill-seal'} style={{ width: size, height: size }}>
      {children}
    </span>
  )
}

/** Sceau d'une compétence ou d'une aura, par son id (SkillFrame), de 16 (aperçu de l'arbre du tournoi), 22 (classement de saison), 32, 40, 44 (dé de l'affrontement) ou 56 px. */
export function SkillSeal({ id, size = 56 }: { id: string; size?: 16 | 22 | 32 | 40 | 44 | 56 }) {
  const [failed, setFailed] = useState(false)
  const seal = SKILL_SEAL[id]
  // L'icône de la compétence elle-même (et non l'étoile générique), cherchée par son id dans le roster, hors kit compris
  const event = ALL_SKILLS.find((e) => e.id === id)
  const icon = event ? skillIcon(event) : 'event'
  // Dans le cercle d'une aura, l'icône laisse voir ses deux contours
  const iconSize = event && auraOfSkill(event) ? 'h-[80%] w-[80%]' : 'h-[86%] w-[86%]'
  return (
    <SkillFrame event={event} size={size}>
      {seal && !failed ? (
        <img src={seal} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <Icon name={icon} className={iconSize} />
      )}
    </SkillFrame>
  )
}
