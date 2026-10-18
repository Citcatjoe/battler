/*
 * Mesures de spectacle d'un combat, lues dans sa chronologie : ce qui rend un combat agréable à
 * regarder, en complément du taux de victoire. Utilisées par le laboratoire (`scripts/lab.report.ts`).
 * - changements de meneur : combien de fois la tête change de camp, en ne comptant que les vrais
 *   retournements (le nouveau meneur a au moins LEAD_GAP de part de PV d'avance) ;
 * - retour : le vainqueur est passé sous 30 % de ses PV ;
 * - fin serrée : le vainqueur finit sous 20 % de ses PV.
 */
import type { CombatResult, Side } from '../../src/game/combat'

/** Avance (en part de PV) qu'il faut prendre pour devenir meneur : les petits écarts ne comptent pas. */
const LEAD_GAP = 0.15

export interface Spectacle {
  leadChanges: number
  comeback: boolean
  closeFinish: boolean
}

export function spectacleOf(r: CombatResult): Spectacle {
  const max = [r.fighters[0].maxHp, r.fighters[1].maxHp]
  let leader: Side | undefined
  let leadChanges = 0
  let winnerMin = 1
  let winnerEnd = 1
  for (const b of r.beats) {
    const ratio = [b.state.hp[0] / max[0], b.state.hp[1] / max[1]]
    winnerMin = Math.min(winnerMin, ratio[r.winner])
    winnerEnd = ratio[r.winner]
    const gap = ratio[0] - ratio[1]
    if (Math.abs(gap) < LEAD_GAP) continue
    const now: Side = gap > 0 ? 0 : 1
    if (leader !== undefined && now !== leader) leadChanges++
    leader = now
  }
  return { leadChanges, comeback: winnerMin < 0.3, closeFinish: winnerEnd < 0.2 }
}

/** Nombre d'étapes de la chronologie où agit l'une des briques surveillées (compétence ou statut), côté `side`. */
export function momentsOf(r: CombatResult, side: Side, watch: readonly string[]) {
  let n = 0
  for (const b of r.beats) {
    if (b.type === 'event' && b.event.side === side && watch.includes(b.event.eventId)) n++
    if ((b.type === 'statusReaction' || b.type === 'statusTick') && b.side === side && watch.includes(b.status)) n++
    if (b.type === 'attack' && b.attack.attacker === side && b.attack.modifiers.some((m) => watch.includes(m.status))) n++
  }
  return n
}
