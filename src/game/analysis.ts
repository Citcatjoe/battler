import type { Character } from './character'
import { simulateCombat, type CombatResult, type Pair, type Side } from './combat'
import { STATUSES, type StatusId } from './statuses'

/*
 * Analyse d'équilibre : fait s'affronter tout le roster (ou des personnages modifiés pour un essai)
 * sur de nombreux combats, puis dit QUI gagne et surtout POURQUOI : durée, dégâts, part de chaque
 * compétence et de chaque statut. La méthode et le moment de s'en servir sont dans
 * docs/EQUILIBRAGE.md ; le rapport se lance avec `npm run balance`.
 *
 * Chaque combat a sa propre graine, tirée du duel et de son numéro : deux essais qui ne changent
 * qu'un personnage rejouent les mêmes graines (« hasard commun »), ce qui réduit le bruit quand
 * on compare deux réglages.
 */

export interface SkillStats {
  name: string
  /** Déclenchements moyens par combat */
  perCombat: number
  /**
   * Valeur nette, en points de taux de victoire : on rejoue les mêmes combats sans cette
   * compétence (sa face redevient nue : le coup de base seul). Positive = la compétence fait gagner ;
   * négative = elle coûte plus (un coup remplacé, par exemple) qu'elle ne rapporte. Absente si non mesurée.
   */
  value?: number
}

export interface StatusValue {
  status: StatusId
  /** Valeur moyenne par combat, en PV gagnés, retirés ou évités (voir `statusValues`) */
  perCombat: number
  /** Ce que mesure la valeur */
  unit: string
}

export interface CharacterReport {
  id: string
  name: string
  fights: number
  winRate: number
  /** Demi-largeur de l'intervalle de confiance à 95 % du taux de victoire */
  margin: number
  turns: number
  /** Dégâts moyens d'un coup qui touche */
  perHit: number
  /** Part des jets sans coup de base : remplacés par leur compétence (Furie des vents, Coup de chance) */
  replacedRate: number
  skills: SkillStats[]
  statuses: StatusValue[]
}

export interface BalanceReport {
  perPair: number
  characters: CharacterReport[]
  /** matrix[a][b] : taux de victoire de a contre b */
  matrix: Record<string, Record<string, number>>
}

/** Empreinte FNV-1a, pour tirer une graine stable d'un texte. */
export function hashSeed(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Valeur apportée par chaque statut à son bénéficiaire (le porteur pour un bonus, son adversaire
 * pour un malus), lue dans la chronologie :
 * - PV soignés ou retirés par ses effets de tour et ses réactions ;
 * - dégâts ajoutés ou retirés aux coups (`Attack.modifiers`) ;
 * - points absorbés (boucliers) ;
 * - coups esquivés d'office (esquive imposée, compté en coups) ;
 * - dégâts des coups supplémentaires (Furie des vents).
 */
function statusValues(r: CombatResult, side: Side, into: Map<StatusId, { total: number; unit: string }>) {
  const add = (id: StatusId, n: number, unit: string) => {
    const cur = into.get(id) ?? { total: 0, unit }
    cur.total += n
    into.set(id, cur)
  }
  const benefits = (bearer: Side, id: StatusId) => (STATUSES[id].polarity === 'positive' ? bearer === side : bearer !== side)
  // Rafale en cours : ses premiers coups valent ceux d'une action sans le statut (un : la Furie remplace son jet ; un par
  // dé pour Coup de chance, deux pour la barde), les suivants sont l'apport du statut. Les deux dés seuls n'apportent rien.
  let flurry: { status: StatusId; skip: number; extra: number } | null = null
  for (const b of r.beats) {
    if (b.type === 'statusTick' || b.type === 'statusReaction') {
      if (!benefits(b.side, b.status)) continue
      for (const e of b.effects) if (e.type === 'heal' || e.type === 'damage') add(b.status, e.amount, 'PV')
    }
    if (b.type === 'coin' && b.side === side)
      for (const e of b.effects) if (e.type === 'damage') add(b.status, e.amount, 'PV')
    if (b.type === 'flurry') {
      const own = b.status && !STATUSES[b.status].instantStrikes ? r.fighters[b.side].dice : 1
      flurry = b.side === side && b.status ? { status: b.status, skip: own, extra: b.strikes - own } : null
    }
    if (b.type !== 'attack') continue
    const a = b.attack
    for (const m of a.modifiers) {
      const bearer = m.by === 'attacker' ? a.attacker : ((1 - a.attacker) as Side)
      if (benefits(bearer, m.status)) add(m.status, Math.abs(m.delta), 'PV')
    }
    if (a.attacker !== side) {
      for (const s of a.shields) add(s.status, s.absorbed, 'PV')
      if (a.dodgeBy) add(a.dodgeBy, 1, 'coups')
    }
    if (a.attacker === side && flurry) {
      if (flurry.skip > 0) flurry.skip--
      else if (flurry.extra > 0) {
        add(flurry.status, a.dealt, 'PV')
        if (--flurry.extra === 0) flurry = null
      }
    }
  }
}

/**
 * Le k-ième combat du duel entre `me` et `opp`, toujours le même quel que soit le point de vue :
 * placement alterné à partir de l'ordre des identifiants, graine tirée du duel et de k.
 * Renvoie le côté de `me`, pour lire le résultat de son point de vue.
 */
function duelFight(me: Character, opp: Character, k: number): { result: CombatResult; side: Side } {
  const [first, second] = me.id < opp.id ? [me, opp] : [opp, me]
  const pair: Pair<Character> = k % 2 === 0 ? [first, second] : [second, first]
  const result = simulateCombat(pair, { seed: hashSeed(`${first.id}-${second.id}#${k}`) })
  return { result, side: pair[0] === me ? 0 : 1 }
}

/** Taux de victoire de `me` contre tous les autres (même graines que `analyzeBalance`). */
export function winRate(me: Character, characters: readonly Character[], perPair = 400) {
  let wins = 0
  let fights = 0
  for (const opp of characters) {
    if (opp.id === me.id) continue
    for (let k = 0; k < perPair; k++) {
      const { result, side } = duelFight(me, opp, k)
      if (result.winner === side) wins++
      fights++
    }
  }
  return wins / fights
}

/**
 * Fait s'affronter toutes les paires de `characters`, `perPair` combats par duel, côtés alternés.
 * `withValues` mesure aussi la valeur nette de chaque compétence (un passage de plus par compétence).
 */
export function analyzeBalance(characters: readonly Character[], perPair = 400, withValues = true): BalanceReport {
  const matrix: BalanceReport['matrix'] = {}
  const reports: CharacterReport[] = []
  for (const me of characters) {
    matrix[me.id] = {}
    let wins = 0
    let fights = 0
    let turns = 0
    let hitDamage = 0
    let hits = 0
    let actions = 0
    let replaced = 0
    const skill = new Map<string, { name: string; fired: number }>()
    for (const e of me.events) skill.set(e.id, { name: e.name, fired: 0 })
    const values = new Map<StatusId, { total: number; unit: string }>()
    for (const opp of characters) {
      if (opp.id === me.id) continue
      let duelWins = 0
      for (let k = 0; k < perPair; k++) {
        // Les deux points de vue d'un duel lisent les mêmes combats : la matrice est symétrique
        const { result: r, side } = duelFight(me, opp, k)
        const won = r.winner === side
        if (won) {
          wins++
          duelWins++
        }
        fights++
        turns += r.turns
        const fired = new Map<string, number>()
        for (const b of r.beats) {
          if (b.type === 'event' && b.event.side === side) fired.set(b.event.eventId, (fired.get(b.event.eventId) ?? 0) + 1)
          if (b.type === 'attack' && b.attack.attacker === side) {
            actions++
            if (b.attack.replaced) replaced++
            else if (!b.attack.dodged) {
              hits++
              hitDamage += b.attack.dealt
            }
          }
        }
        for (const [id, s] of skill) s.fired += fired.get(id) ?? 0
        statusValues(r, side, values)
      }
      matrix[me.id][opp.id] = duelWins / perPair
    }
    const rate = wins / fights
    reports.push({
      id: me.id,
      name: me.name,
      fights,
      winRate: rate,
      margin: 1.96 * Math.sqrt((rate * (1 - rate)) / fights),
      turns: turns / fights,
      perHit: hits ? hitDamage / hits : 0,
      replacedRate: actions ? replaced / actions : 0,
      skills: [...skill.entries()].map(([id, s]) => ({
        name: s.name,
        perCombat: s.fired / fights,
        ...(withValues && { value: rate - winRate(me.adjusted({ events: me.events.filter((e) => e.id !== id) }), characters, perPair) }),
      })),
      statuses: [...values].map(([status, v]) => ({ status, perCombat: v.total / fights, unit: v.unit })),
    })
  }
  return { perPair, characters: reports, matrix }
}

const pct = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')} %`

/** Rapport lisible, en Markdown : taux de victoire, profils de combat, compétences, statuts, matrice. */
export function formatBalance(report: BalanceReport): string {
  const ids = report.characters.map((c) => c.id)
  const name = (id: string) => report.characters.find((c) => c.id === id)!.name
  const rows = report.characters
  const duels = ids.flatMap((a) => ids.filter((b) => b > a).map((b) => ({ a, b, rate: report.matrix[a][b] })))
  const worst = [...duels].sort((x, y) => Math.abs(y.rate - 0.5) - Math.abs(x.rate - 0.5)).slice(0, 5)
  return [
    `# Rapport d'équilibre`,
    ``,
    `${report.perPair} combats par duel, côtés alternés, une graine par combat.`,
    ``,
    `## Taux de victoire et profil de combat`,
    ``,
    `| Personnage | Victoires | ± (95 %) | Tours | Dégâts par coup | Jets remplacés |`,
    `| --- | --- | --- | --- | --- | --- |`,
    ...rows.map(
      (c) =>
        `| ${c.name} | **${pct(c.winRate)}** | ${pct(c.margin)} | ${c.turns.toFixed(1)} | ${c.perHit.toFixed(1)} | ${pct(c.replacedRate)} |`,
    ),
    ``,
    `## Compétences`,
    ``,
    `Valeur nette : écart de taux de victoire avec la même compétence retirée (sa face redevient nue : le coup de base seul), sur les mêmes combats. Négative : la compétence coûte plus qu'elle ne rapporte.`,
    ``,
    `| Personnage | Compétence | Par combat | Valeur nette |`,
    `| --- | --- | --- | --- |`,
    ...rows.flatMap((c) =>
      c.skills.map(
        (s) =>
          `| ${c.name} | ${s.name} | ${s.perCombat.toFixed(2)} | ${s.value === undefined ? '—' : `${s.value >= 0 ? '+' : '−'}${(Math.abs(s.value) * 100).toFixed(1).replace('.', ',')} pts`} |`,
      ),
    ),
    ``,
    `## Apport des statuts (par combat, au bénéficiaire)`,
    ``,
    `| Personnage | Statut | Apport |`,
    `| --- | --- | --- |`,
    ...rows.flatMap((c) =>
      c.statuses
        .filter((s) => s.perCombat > 0)
        .sort((x, y) => y.perCombat - x.perCombat)
        .map((s) => `| ${c.name} | ${STATUSES[s.status].name} | ${s.perCombat.toFixed(1)} ${s.unit} |`),
    ),
    ``,
    `## Duels les plus déséquilibrés`,
    ``,
    ...worst.map((d) => `- ${name(d.a)} contre ${name(d.b)} : ${pct(d.rate)}`),
    ``,
    `## Matrice (ligne contre colonne)`,
    ``,
    `| | ${ids.map(name).join(' | ')} |`,
    `| --- |${ids.map(() => ' --- |').join('')}`,
    ...ids.map((a) => `| **${name(a)}** | ${ids.map((b) => (a === b ? '—' : `${Math.round(report.matrix[a][b] * 100)} %`)).join(' | ')} |`),
  ].join('\n')
}
