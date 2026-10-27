import { attacksOf, beatEffects, finalState, type CombatResult, type Pair, type Side } from './combat'
import { isMechanic, STATUSES, type StatusId } from './statuses'

/** Un malus au sens des statistiques : un mécanisme (règle de forme ou de compétence) n'en est pas un. */
const isNegative = (id: StatusId) => STATUSES[id].polarity === 'negative' && !isMechanic(id)

/** Bilan d'un combattant sur un combat, calculé uniquement à partir de la chronologie. */
export interface FighterStats {
  attacks: number
  hits: number
  hitRate: number
  dodges: number
  dodgeAttempts: number
  /** Dégâts retenus par son armure et ses boucliers */
  absorbed: number
  crits: number
  critDamage: number
  totalDamage: number
  averagePerHit: number
  best: number
  worst: number
  maxRolls: number
  minRolls: number
  hpLeft: number
  /** Événements déclenchés par ce combattant */
  events: number
  /** PV regagnés, toutes sources confondues */
  healed: number
  /** Dégâts subis hors des coups (effets, statuts) */
  effectDamageTaken: number
  /** Critiques imposés par un statut */
  forcedCrits: number
  /** Part retenue par ses boucliers */
  shieldAbsorbed: number
  /** Statuts négatifs reçus */
  debuffsTaken: number
}

export function computeStats(result: CombatResult): Pair<FighterStats> {
  const attacks = attacksOf(result)
  const final = finalState(result)

  // Effets appliqués, quelle que soit leur origine (compétence, statut, pièce, relique).
  const applied = result.beats.flatMap(beatEffects)

  const forSide = (side: Side): FighterStats => {
    // Un jet remplacé par sa compétence (Furie des vents) n'est ni porté ni esquivé ; seul son dé compte.
    const rolls = attacks.filter((a) => a.attacker === side)
    const mine = rolls.filter((a) => !a.replaced)
    const theirs = attacks.filter((a) => a.attacker !== side && !a.replaced)
    const hits = mine.filter((a) => !a.dodged)
    const crits = hits.filter((a) => a.crit)
    // Dégâts comptés en entier, excès du coup fatal compris (overkill, 0.34.0).
    const dealt = hits.map((a) => a.dealt)
    const total = dealt.reduce((s, d) => s + d, 0)
    const onMe = applied.filter((e) => e.target === side)
    const sum = (type: 'heal' | 'damage') => onMe.reduce((s, e) => s + (e.type === type ? e.amount : 0), 0)
    return {
      attacks: mine.length,
      hits: hits.length,
      hitRate: mine.length ? hits.length / mine.length : 0,
      dodges: theirs.filter((a) => a.dodged).length,
      dodgeAttempts: theirs.length,
      absorbed: theirs.reduce((s, a) => s + a.armorAbsorbed + a.shieldAbsorbed, 0),
      crits: crits.length,
      critDamage: crits.reduce((s, a) => s + a.dealt, 0),
      totalDamage: total,
      averagePerHit: hits.length ? total / hits.length : 0,
      best: dealt.length ? Math.max(...dealt) : 0,
      worst: dealt.length ? Math.min(...dealt) : 0,
      maxRolls: rolls.filter((a) => a.roll === a.faces).length,
      minRolls: rolls.filter((a) => a.roll === 1).length,
      hpLeft: final.hp[side],
      events: result.beats.filter((b) => b.type === 'event' && b.event.side === side).length,
      healed: sum('heal'),
      effectDamageTaken: sum('damage'),
      // Ceux qui ont frappé : un critique assuré perdu sur un coup esquivé ou raté (B8) n'est pas « utilisé »
      forcedCrits: mine.filter((a) => a.crit && a.critForced).length,
      shieldAbsorbed: theirs.reduce((s, a) => s + a.shieldAbsorbed, 0),
      // Seuls les malus réellement posés (ni bloqués ni annulés par leur opposé)
      debuffsTaken: onMe.filter((e) => e.type === 'applyStatus' && e.result.kind === 'applied' && isNegative(e.status))
        .length,
    }
  }
  return [forSide(0), forSide(1)]
}

/**
 * Déclenchements d'un combattant (écrans de victoire, retour du 2026-10-27), lus dans la chronologie : chaque relique
 * (par identifiant) et chaque face de son dé tombée (`faces[0]` : la face 1), coups bruts et jets à vide compris.
 */
export interface TriggerCounts {
  relics: Record<string, number>
  faces: number[]
}

export function triggerCounts(result: CombatResult, side: Side): TriggerCounts {
  const counts: TriggerCounts = { relics: {}, faces: [] }
  for (const b of result.beats) {
    if (b.type === 'relic' && b.side === side) counts.relics[b.relic] = (counts.relics[b.relic] ?? 0) + 1
    if (b.type === 'attack' && b.attack.attacker === side) counts.faces[b.attack.roll - 1] = (counts.faces[b.attack.roll - 1] ?? 0) + 1
  }
  return { relics: counts.relics, faces: Array.from(counts.faces, (n) => n ?? 0) }
}

/** La somme de plusieurs bilans de déclenchements (un parcours de tournoi, une partie de campagne). */
export function sumTriggers(all: readonly TriggerCounts[]): TriggerCounts {
  const sum: TriggerCounts = { relics: {}, faces: [] }
  for (const t of all) {
    for (const [id, n] of Object.entries(t.relics)) sum.relics[id] = (sum.relics[id] ?? 0) + n
    t.faces.forEach((n, i) => (sum.faces[i] = (sum.faces[i] ?? 0) + n))
  }
  return { relics: sum.relics, faces: Array.from(sum.faces, (n) => n ?? 0) }
}
