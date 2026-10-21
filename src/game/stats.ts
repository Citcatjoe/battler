import { attacksOf, beatEffects, finalState, type CombatResult, type Pair, type Side } from './combat'
import { isMechanic, STATUSES, type StatusId } from './statuses'

/** Un malus au sens des statistiques : un mécanisme (l'Attente de l'ogre) n'en est pas un. */
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
    // Un coup sacrifié par une compétence (Vol de vie) n'est ni porté ni esquivé ; seul son dé compte.
    const rolls = attacks.filter((a) => a.attacker === side)
    const mine = rolls.filter((a) => !a.forfeited)
    const theirs = attacks.filter((a) => a.attacker !== side && !a.forfeited)
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
      forcedCrits: mine.filter((a) => a.critForced).length,
      shieldAbsorbed: theirs.reduce((s, a) => s + a.shieldAbsorbed, 0),
      // Seuls les malus réellement posés (ni bloqués ni annulés par leur opposé)
      debuffsTaken: onMe.filter((e) => e.type === 'applyStatus' && e.result.kind === 'applied' && isNegative(e.status))
        .length,
    }
  }
  return [forSide(0), forSide(1)]
}
