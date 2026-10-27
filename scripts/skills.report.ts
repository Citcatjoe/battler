/*
 * Audit des compétences : passe chaque compétence de chaque personnage au crible d'une grille de
 * « drapeaux rouges », inspirée de celle de Magic: The Gathering (New World Order) : une carte qui
 * cumule trop de drapeaux est revue. Ici, deux familles de drapeaux :
 * - drapeaux de JEU, mesurés par simulation (mêmes graines que `npm run balance`) : valeur nette,
 *   combats renversés, fréquence, déclenchements gâchés ;
 * - drapeaux de LECTURE, lus dans la définition : texte long, effet différé, jet caché,
 *   dépendance à l'adversaire, crochet propre à un seul statut.
 * Puis une seconde table, la valeur d'une GRAVURE (phase 5 ter) : chaque compétence gravable gravée sur la face 3 nue
 * de chaque hôte qui peut la recevoir, contre le roster, avant → après ; repère de 8 à 20 points (comme les reliques).
 *   npx vitest run --config vitest.balance.config.ts scripts/skills.report.ts --silent=false
 *   SKILLS_N=400 (combats par duel, défaut 200) · SKILLS_ONLY=naraxes,thaldrin (personnages ; pour les gravures, leurs
 *   compétences) · SKILLS_PART=kit, engrave ou rank (une seule table) · SKILLS_ENGRAVE=cleave,coin-flip (gravures mesurées)
 * Troisième table (0.110.0) : un rang de plus, rang I contre rang II puis II contre III, sur la même face 3 ; repère de
 * +3 à +8 points par rang (docs/SORTS.md § 8 et § 20).
 * Écrit dans logs/skills/. Méthode et lecture : docs/SORTS.md § 8.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import type { Character } from '../src/game/character'
import type { CombatResult, Side } from '../src/game/combat'
import { describeEvent, rollFace, type CharacterEvent } from '../src/game/events'
import { offerTargets, rankText, type ForgeStep } from '../src/game/forge'
import { characterPool } from '../src/game/masteries'
import { CHARACTERS, ENGRAVABLE_SKILLS } from '../src/game/roster'
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
  /** Bande d'une gravure (points de victoire gagnés par l'hôte), comme les reliques : hors bande en dessous ou au-delà */
  engraveMin: 0.08,
  engraveMax: 0.2,
  /** Bande d'un rang de plus (E1, 0.110.0) : « un rang ajoute moins » qu'une gravure */
  rankMin: 0.03,
  rankMax: 0.08,
}

/** La face où se mesure une gravure : nue sur tous les hôtes sauf le druide (sa Foudre). */
const ENGRAVE_FACE = 3

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

/** Victoires de `me` contre chaque adversaire, combat par combat, sur les graines de `npm run balance`. */
function winsOf(me: Character, opponents: readonly Character[], perPair: number, read?: (r: CombatResult, side: Side) => void) {
  const wins: number[] = []
  for (const opp of opponents)
    for (let k = 0; k < perPair; k++) {
      const { result, side } = duelFight(me, opp, k)
      wins.push(Number(result.winner === side))
      read?.(result, side)
    }
  return wins
}

/** Écart apparié (mêmes graines) : moyenne, marge à 95 %, part des combats renversés. */
function paired(after: readonly number[], before: readonly number[]) {
  const diffs = after.map((w, i) => w - before[i])
  const n = diffs.length
  const value = diffs.reduce((a, b) => a + b, 0) / n
  const sd = Math.sqrt(diffs.reduce((a, d) => a + (d - value) ** 2, 0) / Math.max(n - 1, 1))
  return { value, margin: (1.96 * sd) / Math.sqrt(n), swing: diffs.filter((d) => d !== 0).length / n }
}

/** Table 1 : chaque compétence dans son kit, retirée (sa face devient nue). */
function kitTable(roster: readonly Character[], perPair: number): string[] {
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
    // Une compétence imprimée sur plusieurs faces (la Foudre du druide) se mesure une fois, toutes ses faces retirées
    const skills = me.events.filter((e, k, all) => all.findIndex((x) => x.id === e.id) === k)
    const measures = new Map<string, Measure>(skills.map((e) => [e.id, { fired: 0, wasted: 0, lost: 0, seenIn: 0 }]))
    const base = winsOf(me, opponents, perPair, (result, side) => {
      for (const e of skills) readSkill(result, side, e, measures.get(e.id)!)
    })
    const n = base.length
    for (const e of skills) {
      const without = me.adjusted({ events: me.events.filter((x) => x.id !== e.id) })
      const { value, margin, swing } = paired(base, winsOf(without, opponents, perPair))
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

  return [
    `## 1. Chaque compétence dans son kit`,
    ``,
    `${perPair} combats par duel contre les ${CHARACTERS.length - 1} autres personnages, mêmes graines que \`npm run balance\`.`,
    ``,
    `- **Valeur** : points de victoire gagnés grâce à la compétence (on rejoue les mêmes combats sans elle : sa face devient nue, le coup de base part quand même), ± marge à 95 %.`,
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
    `### À retoucher en priorité`,
    ``,
    ...ranked
      .filter((r) => !r.exempt && r.game.length > 0)
      .map((r) => `- **${r.e.name}** (${r.who.name}) : ${[...r.game, ...r.reading].join(', ')}.`),
  ]
}

/**
 * Table 2 : chaque compétence gravable gravée sur la face 3 nue de chaque hôte qui peut la recevoir (la forge refuse une
 * compétence de son kit et une face qui en porte une), contre le roster, avant → après : ce que vaut ce choix de forge.
 */
function engraveTable(skills: readonly CharacterEvent[], perPair: number): string[] {
  const base = new Map(CHARACTERS.map((host) => [host.id, winsOf(host, CHARACTERS.filter((c) => c.id !== host.id), perPair)]))
  const rows = skills.map((skill) => {
    const hosts = CHARACTERS.filter((host) => !host.events.some((x) => x.id === skill.id) && offerTargets(host.definition, [], { op: 'engrave', skill }).includes(ENGRAVE_FACE)).map((host) => {
      const engraved = host.withForge([{ op: 'engrave', face: ENGRAVE_FACE, skill }])
      return { host, ...paired(winsOf(engraved, CHARACTERS.filter((c) => c.id !== host.id), perPair), base.get(host.id)!) }
    })
    const mean = hosts.reduce((t, h) => t + h.value, 0) / hosts.length
    const [low, high] = [...hosts].sort((a, b) => a.value - b.value).filter((_, k, all) => k === 0 || k === all.length - 1)
    const flag = mean < T.engraveMin ? 'hors bande (faible)' : mean > T.engraveMax ? 'hors bande (forte)' : ''
    const owners = CHARACTERS.filter((c) => [...c.events, ...characterPool(c.definition)].some((x) => x.id === skill.id))
      .map((c) => `${c.name}${c.events.some((x) => x.id === skill.id) ? '' : ' (hors kit)'}`)
      .join(', ')
    const extremes = [low, high ?? low].map((h) => `${h.host.name} ${pts(h.value)}`).join(' | ')
    return { skill, hosts, mean, owners, extremes, flag }
  })
  const ranked = [...rows].sort((a, b) => b.mean - a.mean)
  return [
    `## 2. Chaque compétence gravée`,
    ``,
    `Gravée sur la face ${ENGRAVE_FACE} nue de chaque hôte qui peut la recevoir, contre les ${CHARACTERS.length - 1} autres personnages, ${perPair} combats par duel, mêmes graines que \`npm run balance\` : points de victoire gagnés par l'hôte (moyenne des hôtes, puis le plus mauvais et le meilleur). Repère : de ${T.engraveMin * 100} à ${T.engraveMax * 100} points, comme une relique ; hors bande au-dessous ou au-delà.`,
    ``,
    `| Compétence | Porteur | Moyenne (pts) | De … | … à | Hôtes | Drapeau |`,
    `| --- | --- | --- | --- | --- | --- | --- |`,
    ...ranked.map((r) => `| ${r.skill.name} | ${r.owners} | ${pts(r.mean)} | ${r.extremes} | ${r.hosts.length} | ${r.flag || '—'} |`),
    ``,
    `### Hôte par hôte`,
    ``,
    `| Compétence | ${CHARACTERS.map((c) => c.name).join(' | ')} |`,
    `| --- | ${CHARACTERS.map(() => '---').join(' | ')} |`,
    ...ranked.map((r) => `| ${r.skill.name} | ${CHARACTERS.map((c) => r.hosts.find((h) => h.host.id === c.id)).map((h) => (h ? pts(h.value) : '—')).join(' | ')} |`),
  ]
}

/**
 * Table 3 : un rang de plus (E1, 0.110.0). Chaque compétence gravée sur la face 3 nue de chaque hôte qui peut la recevoir,
 * rang I contre rang II (la même gravure, aiguisée une fois), puis rang II contre rang III, mêmes graines : ce que vaut un
 * aiguisage. Et, pour une compétence de kit, un rang de plus dans le kit de son porteur (toutes ses faces). Repère : de +3
 * à +8 points par rang (« un rang ajoute moins », décision de l'utilisateur du 2026-10-24).
 */
function rankTable(skills: readonly CharacterEvent[], perPair: number): string[] {
  /** L'hôte forgé : la gravure (sauf dans le kit), puis `rank` aiguisages de sa face ; undefined si la forge refuse */
  const forged = (host: Character, skill: CharacterEvent, rank: number, face: number, engrave: boolean) => {
    let journal: ForgeStep[] = engrave ? [{ op: 'engrave', face, skill }] : []
    for (let k = 0; k < rank; k++) {
      if (!offerTargets(host.definition, journal, { op: 'sharpen' }).includes(face)) return undefined
      journal = [...journal, { op: 'sharpen', face }]
    }
    return host.withForge(journal)
  }
  /** Les gains d'un rang à l'autre (I → II, II → III), sur les mêmes graines ; undefined : rang refusé */
  const gainsOf = (host: Character, skill: CharacterEvent, face: number, engrave: boolean) => {
    const opponents = CHARACTERS.filter((o) => o.id !== host.id)
    const wins = [0, 1, 2].map((r) => forged(host, skill, r, face, engrave)).map((c) => c && winsOf(c, opponents, perPair))
    return [1, 2].map((r) => (wins[r] && wins[r - 1] ? paired(wins[r]!, wins[r - 1]!).value : undefined))
  }
  /** Moyenne des hôtes ; undefined si un hôte refuse le rang */
  const mean = (xs: (number | undefined)[]) => (xs.length && xs.every((x) => x !== undefined) ? xs.reduce((t, x) => t! + x!, 0)! / xs.length : undefined)
  const rows = skills.map((skill) => {
    const hosts = CHARACTERS.filter((host) => !host.events.some((x) => x.id === skill.id) && offerTargets(host.definition, [], { op: 'engrave', skill }).includes(ENGRAVE_FACE)).map(
      (host) => ({ host, gains: gainsOf(host, skill, ENGRAVE_FACE, true) }),
    )
    const two = mean(hosts.map((h) => h.gains[0]))
    const three = mean(hosts.map((h) => h.gains[1]))
    const owner = CHARACTERS.find((c) => c.events.some((x) => x.id === skill.id))
    const kit = owner && gainsOf(owner, skill, rollFace(owner.events.find((x) => x.id === skill.id)!.trigger)!, false)[0]
    const flag = two === undefined ? 'ne s’aiguise pas' : two < T.rankMin ? 'hors bande (faible)' : two > T.rankMax ? 'hors bande (forte)' : ''
    return { skill, hosts, two, three, owner, kit, flag }
  })
  const cell = (x: number | undefined) => (x === undefined ? '—' : pts(x))
  const ranked = [...rows].sort((a, b) => (b.two ?? -1) - (a.two ?? -1))
  return [
    `## 3. Un rang de plus`,
    ``,
    `Chaque compétence gravée sur la face ${ENGRAVE_FACE} nue de chaque hôte qui peut la recevoir, contre les ${CHARACTERS.length - 1} autres personnages, ${perPair} combats par duel, mêmes graines que \`npm run balance\` : points de victoire gagnés par un aiguisage (moyenne des hôtes), du rang I au rang II, puis du rang II au rang III. Repère : de ${T.rankMin * 100} à ${T.rankMax * 100} points par rang ; hors bande au-dessous ou au-delà (rang II). Dernière colonne : un rang de plus dans le kit de son porteur (toutes ses faces).`,
    ``,
    `| Compétence | Axe (rang II) | I → II (pts) | II → III (pts) | De … | … à | Dans le kit | Drapeau |`,
    `| --- | --- | --- | --- | --- | --- | --- | --- |`,
    ...ranked.map((r) => {
      const sorted = r.hosts.filter((h) => h.gains[0] !== undefined).sort((a, b) => a.gains[0]! - b.gains[0]!)
      const [low, high] = [sorted[0], sorted[sorted.length - 1]].map((h) => (h ? `${h.host.name} ${pts(h.gains[0]!)}` : '—'))
      const sharpened = r.hosts.length ? forged(r.hosts[0].host, r.skill, 1, ENGRAVE_FACE, true) : undefined
      const axis = sharpened ? rankText(sharpened.events.find((x) => x.id === r.skill.id)!) : '—'
      return `| ${r.skill.name} | ${axis} | ${cell(r.two)} | ${cell(r.three)} | ${low} | ${high} | ${r.owner ? `${r.owner.name} ${cell(r.kit)}` : 'hors kit'} | ${r.flag || '—'} |`
    }),
  ]
}

it('audit des compétences', () => {
  const perPair = Number(process.env.SKILLS_N ?? 200)
  const list = (key: string) => process.env[key]?.split(',').map((s) => s.trim()).filter(Boolean)
  const only = list('SKILLS_ONLY')
  const part = process.env.SKILLS_PART
  const roster = only?.length ? CHARACTERS.filter((c) => only.includes(c.id)) : CHARACTERS
  const picked = list('SKILLS_ENGRAVE')
  const engravable = ENGRAVABLE_SKILLS.filter((e) =>
    picked?.length ? picked.includes(e.id) : roster.some((c) => [...c.events, ...characterPool(c.definition)].some((x) => x.id === e.id)),
  )

  const parts = part ? [part] : ['kit', 'engrave', 'rank']
  const text = [
    `# Audit des compétences · règles ${pkg.version}`,
    ``,
    ...(parts.includes('kit') ? [...kitTable(roster, perPair), ``] : []),
    ...(parts.includes('engrave') ? [...engraveTable(engravable, perPair), ``] : []),
    ...(parts.includes('rank') ? rankTable(engravable, perPair) : []),
  ].join('\n')

  mkdirSync('logs/skills', { recursive: true })
  const file = `logs/skills/${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}_v${pkg.version}.md`
  writeFileSync(file, `${text}\n`)
  console.log(`${text}\n\n→ ${file}`)
}, 3_600_000)

