/*
 * Audit des compétences : passe chaque compétence de chaque personnage au crible d'une grille de
 * « drapeaux rouges », inspirée de celle de Magic: The Gathering (New World Order) : une carte qui
 * cumule trop de drapeaux est revue. Ici, deux familles de drapeaux :
 * - drapeaux de JEU, mesurés par simulation (mêmes graines que `npm run balance`) : valeur nette,
 *   combats renversés, fréquence, déclenchements gâchés ;
 * - drapeaux de LECTURE, lus dans la définition : texte long, effet différé, jet caché,
 *   dépendance à l'adversaire, crochet propre à un seul statut.
 *   npx vitest run --config vitest.balance.config.ts scripts/skills.report.ts --silent=false
 *   SKILLS_N=400 (combats par duel, défaut 200) · SKILLS_ONLY=naraxes,thaldrin (personnages)
 * Écrit dans logs/skills/. Méthode et lecture : docs/SORTS.md § 8.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import type { Character } from '../src/game/character'
import type { CombatResult, Side } from '../src/game/combat'
import { describeEvent, type CharacterEvent } from '../src/game/events'
import { CHARACTERS } from '../src/game/roster'
import { STATUSES, type StatusDef } from '../src/game/statuses'
import pkg from '../package.json' with { type: 'json' }
import { duelFight } from './lab/duel'

/** Seuils de la grille. Ils se discutent : ce sont des signaux, pas des verdicts. */
const T = {
  /** Valeur nette sous laquelle une compétence « ne sert presque à rien » (points de victoire) */
  useless: 0.01,
  /** Valeur nette au-delà de laquelle elle décide trop souvent du combat */
  dominant: 0.2,
  /** Part des combats où l'on voit la compétence au moins une fois */
  seen: 0.4,
  /** Part des déclenchements sans effet (soin à PV pleins, statut bloqué, purification à vide, charge perdue) */
  wasted: 0.25,
  /** Part des combats dont elle change le vainqueur, dans un sens ou dans l'autre */
  swing: 0.03,
  /** Longueur de la description en jeu */
  text: 140,
}

/** Compétences hors grille, par décision de design (aucune depuis le retrait de l'Attente, 0.106.0). */
const EXEMPT: Record<string, string> = {}

/** Crochets qui imposent une usure « au prochain coup ou à la prochaine action » : effet différé, et charge qui peut se perdre. */
const DELAYED: (keyof StatusDef)[] = ['forcesCrit', 'forcesDodge', 'drainsHit', 'extraStrikes', 'coinToss', 'reflectsHit']
/** Crochets à surveiller pour l'aplatissement du moteur (FAMILLES.md, ETUDE § 4.1) */
const SPECIAL: (keyof StatusDef)[] = [...DELAYED, 'fillsOnHurt', 'spentOnHurt', 'immune', 'wards', 'skipsAction', 'shield']

const usesOf = (key: keyof StatusDef) => Object.values(STATUSES).filter((d) => d[key] !== undefined && d[key] !== false).length

interface Measure {
  fired: number
  wasted: number
  lost: number
  seenIn: number
}

/** Statuts posés par la compétence, avec le camp qui les porte (relatif au porteur de la compétence). */
const postedBy = (e: CharacterEvent) =>
  e.effects.flatMap((f) => (f.type === 'applyStatus' ? [{ status: f.status, opponent: f.target === 'opponent' }] : []))

/** Lit un combat du point de vue de `side` : déclenchements, déclenchements gâchés, charges perdues de la compétence. */
function readSkill(r: CombatResult, side: Side, e: CharacterEvent, into: Measure) {
  const losable = postedBy(e).filter((p) => DELAYED.some((k) => STATUSES[p.status][k]))
  let fired = 0
  for (const b of r.beats) {
    if (b.type === 'event' && b.event.side === side && b.event.eventId === e.id) {
      fired++
      const empty = b.event.effects.every((f) =>
        f.type === 'heal'
          ? f.amount === 0
          : f.type === 'applyStatus'
            ? f.result.kind !== 'applied' || f.result.stacks === 0
            : f.type === 'cleanse'
              ? f.removed.length === 0
              : f.type === 'damage'
                ? f.amount <= (e.effects.some((x) => x.type === 'release') ? 1 : 0)
                : false,
      )
      if (b.event.effects.length && empty) into.wasted++
    }
    if (b.type === 'statusAge')
      for (const p of losable) if (b.side === (p.opponent ? 1 - side : side) && b.expired.includes(p.status)) into.lost++
  }
  into.fired += fired
  if (fired > 0) into.seenIn++
}

/** Drapeaux de lecture, tirés de la définition. */
function readingFlags(e: CharacterEvent): string[] {
  const flags: string[] = []
  const text = describeEvent(e)
  if (text.length > T.text) flags.push(`texte long (${text.length} car.)`)
  const posted = postedBy(e)
  if (posted.some((p) => !p.opponent && DELAYED.some((k) => STATUSES[p.status][k]))) flags.push('effet différé')
  if (e.effects.some((f) => f.type === 'cleanse' && f.target === 'opponent') || e.when?.some((c) => 'who' in c && c.who === 'opponent'))
    flags.push("dépend de l'adversaire")
  const unique = new Set<string>()
  for (const p of posted) for (const k of SPECIAL) if (STATUSES[p.status][k] && usesOf(k) === 1) unique.add(k)
  if (e.effects.some((f) => f.type === 'release')) unique.add('fillsOnHurt')
  if (unique.size) flags.push(`crochet unique (${[...unique].join(', ')})`)
  return flags
}

const FACE: Record<string, string> = { naturalOne: '1', naturalTwo: '2', naturalThree: '3', naturalMax: 'max' }
const faceOf = (e: CharacterEvent) => `${FACE[e.trigger] ?? e.trigger}${e.form ? ` (${e.form === 'bear' ? 'ours' : 'humain'})` : ''}`

const pct = (x: number) => `${(x * 100).toFixed(0)} %`
const pts = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1).replace('.', ',')}`

it('audit des compétences', () => {
  const perPair = Number(process.env.SKILLS_N ?? 200)
  const only = process.env.SKILLS_ONLY?.split(',').map((s) => s.trim()).filter(Boolean)
  const roster = only?.length ? CHARACTERS.filter((c) => only.includes(c.id)) : CHARACTERS
  const rows: {
    who: Character
    e: CharacterEvent
    perCombat: number
    seen: number
    value: number
    margin: number
    swing: number
    waste: number
    game: string[]
    reading: string[]
    exempt?: string
  }[] = []

  for (const me of roster) {
    const opponents = CHARACTERS.filter((c) => c.id !== me.id)
    const base: boolean[] = []
    const measures = new Map<string, Measure>(me.events.map((e) => [e.id, { fired: 0, wasted: 0, lost: 0, seenIn: 0 }]))
    for (const opp of opponents)
      for (let k = 0; k < perPair; k++) {
        const { result, side } = duelFight(me, opp, k)
        base.push(result.winner === side)
        for (const e of me.events) readSkill(result, side, e, measures.get(e.id)!)
      }
    const n = base.length
    for (const e of me.events) {
      const without = me.adjusted({ events: me.events.filter((x) => x.id !== e.id) })
      const diffs: number[] = []
      let i = 0
      for (const opp of opponents)
        for (let k = 0; k < perPair; k++) {
          const { result, side } = duelFight(without, opp, k)
          diffs.push(Number(base[i++]) - Number(result.winner === side))
        }
      const value = diffs.reduce((a, b) => a + b, 0) / n
      const sd = Math.sqrt(diffs.reduce((a, d) => a + (d - value) ** 2, 0) / Math.max(n - 1, 1))
      const margin = (1.96 * sd) / Math.sqrt(n)
      const swing = diffs.filter((d) => d !== 0).length / n
      const m = measures.get(e.id)!
      const waste = m.fired ? (m.wasted + m.lost) / m.fired : 0
      const seen = m.seenIn / n
      const game: string[] = []
      if (value + margin < 0) game.push('coûte des victoires')
      else if (value < T.useless) game.push('presque inutile')
      if (value - margin > T.dominant) game.push('écrasante')
      // Une compétence de forme (druide) n'existe qu'une forme sur deux : seuil de visibilité divisé par deux
      if (seen < (e.form ? T.seen / 2 : T.seen)) game.push('rare à l’écran')
      if (waste > T.wasted) game.push(`gâchée (${pct(waste)})`)
      if (swing < T.swing) game.push('sans enjeu')
      rows.push({ who: me, e, perCombat: m.fired / n, seen, value, margin, swing, waste, game, reading: readingFlags(e), exempt: EXEMPT[e.id] })
    }
  }

  const score = (r: (typeof rows)[number]) => (r.exempt ? -1 : r.game.length * 2 + r.reading.length)
  const ranked = [...rows].sort((a, b) => score(b) - score(a) || a.value - b.value)
  const line = (r: (typeof rows)[number]) =>
    `| ${r.who.name} | ${r.e.name} | ${faceOf(r.e)} | ${r.perCombat.toFixed(2).replace('.', ',')} | ${pct(r.seen)} | ${pts(r.value)} ± ${(r.margin * 100).toFixed(1).replace('.', ',')} | ${pct(r.swing)} | ${pct(r.waste)} | ${r.exempt ? `_${r.exempt}_` : r.game.join(', ') || '—'} | ${r.reading.join(', ') || '—'} |`

  const text = [
    `# Audit des compétences · règles ${pkg.version}`,
    ``,
    `${perPair} combats par duel contre les 17 autres personnages, mêmes graines que \`npm run balance\`.`,
    ``,
    `- **Valeur** : points de victoire gagnés grâce à la compétence (on rejoue les mêmes combats sans elle : son jet redevient un coup normal), ± marge à 95 %.`,
    `- **Renversés** : part des combats dont elle change le vainqueur, dans un sens ou dans l'autre. Une compétence à valeur nulle mais très « renversante » est un pile ou face ; à valeur nulle et peu renversante, elle ne pèse rien.`,
    `- **Gâchis** : part des déclenchements sans effet (soin à PV pleins, statut bloqué ou annulé, purification à vide, rétribution relâchée à vide) ou dont la charge s'est perdue sans servir.`,
    `- **Drapeaux de jeu** (mesurés) : coûte des victoires, presque inutile (moins de ${T.useless * 100} point), écrasante (plus de ${T.dominant * 100} points), rare à l'écran (vue dans moins de ${pct(T.seen)} des combats, ${pct(T.seen / 2)} pour une compétence de forme), gâchée (plus de ${pct(T.wasted)}), sans enjeu (renverse moins de ${pct(T.swing)} des combats).`,
    `- **Drapeaux de lecture** (définition) : texte long (plus de ${T.text} caractères), effet différé (il faut se souvenir d'une charge), jet caché, dépend de l'adversaire, crochet unique (règle du moteur écrite pour ce seul statut).`,
    ``,
    `Classement : un drapeau de jeu compte double. Les compétences exemptées (décision de design) sont en fin de liste.`,
    ``,
    `| Personnage | Compétence | Face | Par combat | Vue | Valeur (pts) | Renversés | Gâchis | Drapeaux de jeu | Drapeaux de lecture |`,
    `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
    ...ranked.map(line),
    ``,
    `## À retoucher en priorité`,
    ``,
    ...ranked
      .filter((r) => !r.exempt && r.game.length > 0)
      .map((r) => `- **${r.e.name}** (${r.who.name}) : ${[...r.game, ...r.reading].join(', ')}.`),
  ].join('\n')

  mkdirSync('logs/skills', { recursive: true })
  const file = `logs/skills/${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}_v${pkg.version}.md`
  writeFileSync(file, `${text}\n`)
  console.log(`${text}\n\n→ ${file}`)
}, 1_800_000)

