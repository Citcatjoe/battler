/*
 * La montée en puissance et le porteur réel : `npm run ramp` (X3 de docs/REVUE_COMPETENCES.md ; méthode de l'étude de la
 * montée, PROGRESSION.md § 13.4, et de la revue des compétences).
 * - Builds : RAMP_BUILDS actes par personnage (48 par défaut), tirés comme le champion de référence de la campagne (les
 *   graines `builds:<id>:<s>` de `npm run campaign`, 8 variantes par graine ; offre orientée, choix par défaut). L'état
 *   après k récompenses est le début de l'acte (k de 0 à 10).
 * - Force relative au rang k : le build contre le build de même indice et de même rang des neuf autres, RAMP_N combats
 *   par duel (60 par défaut, comme la mesure des porteurs de la revue), graines de `npm run balance` (hasard commun :
 *   les ablations rejouent les mêmes combats).
 *   Force absolue à 10 : contre le roster nu.
 * - Ablations à 10 récompenses : toute la forge, toutes les reliques, chaque pas de forge (le reste rejoué ; un pas qui
 *   ne vaut plus sans lui tombe aussi : les aiguisages et copies d'une gravure retirée), chaque relique, chaque
 *   compétence du kit (sa face nue). La valeur d'une brique est l'écart apparié, chez ses porteurs réels.
 * - Offres : 120 actes par personnage (10 graines × 12 variantes, ceux de `npm run campaign`), sans combat.
 * Les builds se mesurent en parallèle : RAMP_WORKERS processus (le nombre de cœurs moins 2 par défaut ; 1 : dans ce
 * processus), chacun relance ce fichier sur sa part (RAMP_SHARD) et écrit ses mesures dans un dossier temporaire.
 * Écrit dans logs/ramp/. Méthode et lecture : docs/EQUILIBRAGE.md § 3, docs/SORTS.md § 8.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { availableParallelism, tmpdir } from 'node:os'
import { join } from 'node:path'
import { it } from 'vitest'
import { hashSeed } from '../src/game/analysis'
import { Character, type CharacterDef } from '../src/game/character'
import { rollFace } from '../src/game/events'
import { forgeState, withForgeStep, type ForgeBase, type ForgeStep } from '../src/game/forge'
import { drawReward, forgesLeftIn, REWARDS, type PendingReward } from '../src/game/offers'
import { getRelic } from '../src/game/relics'
import { seededRng } from '../src/game/rng'
import { ALL_SKILLS, CHARACTER_IDS, createCharacter } from '../src/game/roster'
import pkg from '../package.json' with { type: 'json' }
import { duelFight } from './lab/duel'

const BUILDS = Number(process.env.RAMP_BUILDS ?? 48)
const N = Number(process.env.RAMP_N ?? 60)
const WORKERS = Number(process.env.RAMP_WORKERS ?? Math.max(1, availableParallelism() - 2))
/** Variantes par graine de build (l'étude de la montée : 6 graines × 8 variantes) */
const VARIANTS = 8
/** Actes pour compter les offres : ceux de `npm run campaign` (10 graines × 12 variantes) */
const OFFER_SEEDS = 10
const OFFER_VARIANTS = 12
const OFFER_ACTS = OFFER_SEEDS * OFFER_VARIANTS
const RANKS = REWARDS.length
/** Bande d'une gravure et d'une relique, puis d'un rang (docs/SORTS.md § 8) */
const BAND = { min: 0.08, max: 0.2 }
const RANK_BAND = { min: 0.03, max: 0.08 }

interface BuildState {
  forge: ForgeStep[]
  relics: string[]
}

/** Une brique et sa valeur dans un build : `engrave:<id>`, `sharpen:<id>`, `copy:<id>`, `gild`, `relic:<id>` */
interface Brick {
  key: string
  value: number
}

/** Les mesures d'un build (un personnage, un indice) */
interface BuildMeasure {
  c: number
  b: number
  /** Force relative après 0 à 10 récompenses */
  relative: number[]
  /** Tours du combat, en moyenne, à 0 et à 10 récompenses (contre les builds de même rang) */
  turns: [number, number]
  /** Force absolue à 10 récompenses, contre le roster nu */
  absolute: number
  forge: number
  relics: number
  bricks: Brick[]
  kit: Brick[]
}

/**
 * Un acte complet tiré comme le champion de référence (`drawBuild` de campaign.ts, mêmes graines que
 * `referenceChampions` et `npm run campaign`) : l'état après chaque récompense, et les offres.
 */
function actOf(id: string, seed: number, v: number): { states: BuildState[]; rewards: PendingReward[] } {
  const rng = seededRng(hashSeed(`campagne:${seed}:reference:${v}`))
  const def = createCharacter(id).definition
  let forge: ForgeStep[] = []
  const relics: string[] = []
  const states: BuildState[] = [{ forge, relics: [] }]
  const rewards: PendingReward[] = []
  for (const [index, kind] of REWARDS.entries()) {
    const reward = drawReward({ championId: id, forge, relics }, kind, rng, forgesLeftIn(REWARDS, index))
    rewards.push(reward)
    if (reward.kind === 'forge' && reward.choice) forge = withForgeStep(def, forge, reward.choice)
    if (reward.kind === 'relic' && reward.choice) relics.push(reward.choice)
    states.push({ forge, relics: [...relics] })
  }
  return { states, rewards }
}

/** Le build `b` d'un personnage : la graine `builds:<id>:<s>`, la variante v (b = 8 s + v) */
const buildOf = (id: string, b: number) => actOf(id, hashSeed(`builds:${id}:${Math.floor(b / VARIANTS)}`), b % VARIANTS).states

/** Rejoue un journal sur une définition : un pas qui ne vaut plus (sa gravure retirée, sa face vidée) tombe. */
function replay(base: ForgeBase, steps: readonly ForgeStep[]): ForgeStep[] {
  let kept: ForgeStep[] = []
  for (const step of steps) {
    try {
      kept = withForgeStep(base, kept, step)
    } catch {
      // l'opération dépendait de la brique retirée
    }
  }
  return kept
}

/** Le personnage d'une définition (vanilla, ou privée d'une compétence du kit), construit comme `s` */
const characterOf = (def: CharacterDef, s: BuildState) => new Character({ ...def, forge: replay(def, s.forge), relics: s.relics.map(getRelic) })

/** Victoires et tours de `me` contre chacun de `opps`, `N` combats par duel (graines de `npm run balance`) */
function duel(me: Character, opps: readonly Character[]): { rate: number; turns: number } {
  let wins = 0
  let turns = 0
  for (const opp of opps) {
    for (let k = 0; k < N; k++) {
      const { result, side } = duelFight(me, opp, k)
      if (result.winner === side) wins++
      turns += result.turns
    }
  }
  return { rate: wins / (opps.length * N), turns: turns / (opps.length * N) }
}

/** La brique d'un pas de forge, lue dans l'état d'avant ce pas */
function brickOf(def: CharacterDef, before: readonly ForgeStep[], step: ForgeStep): string {
  if (step.op === 'gild') return step.op
  if (step.op === 'engrave') return `engrave:${step.skill.id}`
  const state = forgeState(def, before)
  const origin = def.events.filter((e) => rollFace(e.trigger) === step.face)
  const engraved = state.engraved.get(step.face)
  if (step.op === 'copy') return `copy:${(engraved ?? origin[0]).id}`
  const skills = [...origin, ...(engraved ? [engraved] : [])].map((e) => e.id)
  return `sharpen:${[...new Set(skills)].join('+')}`
}

/** Mesure d'un build : sa courbe, sa force absolue, ses ablations à 10 récompenses. `builds[c][b]` : états de 0 à 10. */
function measure(c: number, b: number, builds: readonly BuildState[][][]): BuildMeasure {
  const def = createCharacter(CHARACTER_IDS[c]).definition
  const others = CHARACTER_IDS.flatMap((_, o) => (o === c ? [] : [o]))
  const opponentsAt = (k: number) => others.map((o) => characterOf(createCharacter(CHARACTER_IDS[o]).definition, builds[o][b][k]))
  const mine = builds[c][b]
  const curve = mine.map((s, k) => duel(characterOf(def, s), opponentsAt(k)))
  const last = mine[RANKS]
  const opps = opponentsAt(RANKS)
  const value = (s: BuildState, from: CharacterDef = def) => curve[RANKS].rate - duel(characterOf(from, s), opps).rate
  const bricks: Brick[] = [
    ...last.forge.map((step, i) => ({ key: brickOf(def, last.forge.slice(0, i), step), value: value({ forge: last.forge.filter((_, j) => j !== i), relics: last.relics }) })),
    ...last.relics.map((r, i) => ({ key: `relic:${r}`, value: value({ forge: last.forge, relics: last.relics.filter((_, j) => j !== i) }) })),
  ]
  const kit = [...new Set(def.events.map((e) => e.id))].map((skill) => ({ key: skill, value: value(last, { ...def, events: def.events.filter((e) => e.id !== skill) }) }))
  return {
    c,
    b,
    relative: curve.map((x) => x.rate),
    turns: [curve[0].turns, curve[RANKS].turns],
    absolute: duel(characterOf(def, last), others.map((o) => createCharacter(CHARACTER_IDS[o]))).rate,
    forge: value({ forge: [], relics: last.relics }),
    relics: value({ forge: last.forge, relics: [] }),
    bricks,
    kit,
  }
}

/** Les mesures, réparties sur `WORKERS` processus : chacun relance ce fichier sur sa part (RAMP_SHARD « i/k ») */
async function inShards(units: number): Promise<BuildMeasure[]> {
  const shards = Math.min(WORKERS, units)
  const dir = mkdtempSync(join(tmpdir(), 'battler-ramp-'))
  // Le processus enfant est un vitest neuf : il ne doit pas se croire dans un ouvrier du parent
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('VITEST')))
  const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.balance.config.ts', 'scripts/ramp.report.ts']
  try {
    await Promise.all(
      Array.from(
        { length: shards },
        (_, i) =>
          new Promise<void>((resolve, reject) => {
            const child = spawn(process.execPath, args, { env: { ...env, RAMP_SHARD: `${i}/${shards}`, RAMP_PARTS: dir }, stdio: ['ignore', 'pipe', 'pipe'] })
            let log = ''
            child.stdout.on('data', (d) => (log += d))
            child.stderr.on('data', (d) => (log += d))
            child.on('error', reject)
            child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Part ${i} : code ${code}\n${log.slice(-3000)}`))))
          }),
      ),
    )
    const parts: BuildMeasure[][] = Array.from({ length: shards }, (_, i) => JSON.parse(readFileSync(join(dir, `${i}.json`), 'utf8')))
    return parts.flat()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Offres des 120 actes d'un personnage : actes où chaque gravure et chaque relique est offerte, puis prise */
function offersOf(id: string) {
  const offered = new Map<string, number>()
  const taken = new Map<string, number>()
  for (let s = 0; s < OFFER_SEEDS; s++) {
    for (let v = 0; v < OFFER_VARIANTS; v++) {
      const seen = new Set<string>()
      const got = new Set<string>()
      for (const r of actOf(id, hashSeed(`builds:${id}:${s}`), v).rewards) {
        if (r.kind === 'relic') {
          for (const x of r.offer) seen.add(`relic:${x}`)
          if (r.choice) got.add(`relic:${r.choice}`)
        } else {
          for (const o of r.offer) if (o.op === 'engrave') for (const x of o.skills) seen.add(`engrave:${x.id}`)
          if (r.choice?.op === 'engrave') got.add(`engrave:${r.choice.skill.id}`)
        }
      }
      for (const k of seen) offered.set(k, (offered.get(k) ?? 0) + 1)
      for (const k of got) taken.set(k, (taken.get(k) ?? 0) + 1)
    }
  }
  return { offered, taken }
}

const OP_LABEL: Record<string, string> = { engrave: 'Gravure', sharpen: 'Aiguisage', copy: 'Copie', relic: 'Relique', gild: 'Dorure' }
const skillName = (id: string) => ALL_SKILLS.find((e) => e.id === id)?.name ?? id

/** Le nom d'une brique (`engrave:cleave` : Pourfendre ; `sharpen:a+b` : les deux compétences de la face) */
function brickName(key: string) {
  const [op, rest] = key.split(':')
  if (op === 'gild') return 'Dorer une face'
  if (op === 'relic') return getRelic(rest).name
  return rest.split('+').map(skillName).join(' et ')
}

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN)
/** Une part en points de pourcentage, à une décimale (« 51,3 ») */
const pct = (x: number) => (Number.isNaN(x) ? '—' : (x * 100).toFixed(1).replace('.', ','))
/** Un apport signé, en points (« +7,4 », « −1,2 ») */
const pts = (x: number) => (Number.isNaN(x) ? '—' : `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(1).replace('.', ',')}`)
/** Marge à 95 % d'une moyenne d'écarts appariés, en points */
const margin = (xs: readonly number[]) => {
  if (xs.length < 2) return ''
  const m = mean(xs)
  return ` ± ${((1.96 * Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1) / xs.length)) * 100).toFixed(1).replace('.', ',')}`
}

it('montée en puissance et porteur réel', async () => {
  const builds = CHARACTER_IDS.map((id) => Array.from({ length: BUILDS }, (_, b) => buildOf(id, b)))
  // Un build après l'autre, chaque personnage à la suite : les parts se partagent les personnages lents et rapides
  const units = Array.from({ length: BUILDS }, (_, b) => CHARACTER_IDS.map((_, c) => ({ c, b }))).flat()
  const shard = process.env.RAMP_SHARD
  if (shard) {
    const [i, k] = shard.split('/').map(Number)
    const mine = units.filter((_, u) => u % k === i).map(({ c, b }) => measure(c, b, builds))
    writeFileSync(join(process.env.RAMP_PARTS ?? tmpdir(), `${i}.json`), JSON.stringify(mine))
    return
  }
  const started = Date.now()
  const measures = WORKERS > 1 ? await inShards(units.length) : units.map(({ c, b }) => measure(c, b, builds))
  const fights = measures.reduce((s, m) => s + (RANKS + 4 + m.bricks.length + m.kit.length) * (CHARACTER_IDS.length - 1) * N, 0)
  const minN = Math.max(3, Math.round(BUILDS / 8))
  // Log-cote d'un taux, bornée à une demi-victoire du bord (un build à 0 ou 100 %)
  const floor = 0.5 / ((CHARACTER_IDS.length - 1) * N)
  const logit = (p: number) => {
    const q = Math.min(1 - floor, Math.max(floor, p))
    return Math.log(q / (1 - q))
  }

  const rows = CHARACTER_IDS.map((id, c) => {
    const ms = measures.filter((m) => m.c === c)
    const others = CHARACTER_IDS.filter((o) => o !== id).map((o) => createCharacter(o))
    const vanilla = duel(createCharacter(id), others).rate
    const at10 = ms.map((m) => m.relative[RANKS]).sort((x, y) => x - y)
    const avg = mean(at10)
    // Écart-type vrai : la variance mesurée moins celle du tirage (binomiale, 9 × N combats par build)
    const noise = mean(at10.map((p) => (p * (1 - p)) / ((CHARACTER_IDS.length - 1) * N)))
    const trueSd = Math.sqrt(Math.max(0, mean(at10.map((p) => (p - avg) ** 2)) - noise))
    const bricks = new Map<string, number[]>()
    for (const m of ms) for (const x of m.bricks) bricks.set(x.key, [...(bricks.get(x.key) ?? []), x.value])
    const kit = new Map<string, number[]>()
    for (const m of ms) for (const x of m.kit) kit.set(x.key, [...(kit.get(x.key) ?? []), x.value])
    const ofOp = (op: string) => ms.flatMap((m) => m.bricks.filter((x) => x.key.split(':')[0] === op).map((x) => x.value))
    const curve = Array.from({ length: RANKS + 1 }, (_, k) => mean(ms.map((m) => m.relative[k])))
    return {
      id,
      name: createCharacter(id).name,
      curve,
      slope: curve[RANKS] - curve[0],
      avg,
      at10,
      trueSd,
      forge: mean(ms.map((m) => m.forge)),
      relics: mean(ms.map((m) => m.relics)),
      vanilla,
      absolute: mean(ms.map((m) => m.absolute)),
      rise: mean(ms.map((m) => logit(m.absolute) - logit(vanilla))),
      turns: [mean(ms.map((m) => m.turns[0])) / 2, mean(ms.map((m) => m.turns[1])) / 2],
      ops: Object.keys(OP_LABEL).map((op) => ofOp(op)),
      engraved: ofOp('engrave'),
      relicValues: ofOp('relic'),
      bricks,
      kit,
      offers: offersOf(id),
    }
  })
  const byMean = [...rows].sort((x, y) => y.avg - x.avg)
  const under = (xs: readonly number[]) => (xs.length ? `${Math.round((xs.filter((x) => x < BAND.min).length / xs.length) * 100)} %` : '—')

  // Les briques hors de leur bande, souvent prises (n ≥ minN) : gravures 8 à 20 et aiguisages 3 à 8 dans les deux sens ;
  // une relique au-delà de 20 seulement (chez un porteur construit, elle vaut d'ordinaire moins de 8 : RELIQUES.md)
  const outside = rows.flatMap((r) =>
    [...r.bricks].flatMap(([key, xs]) => {
      const op = key.split(':')[0]
      const band = op === 'engrave' ? BAND : op === 'sharpen' ? RANK_BAND : op === 'relic' ? { min: -Infinity, max: BAND.max } : undefined
      const m = mean(xs)
      if (!band || xs.length < minN || (m >= band.min && m <= band.max)) return []
      return [{ r, key, xs, m, low: m < band.min }]
    }),
  )
  outside.sort((x, y) => Number(y.low) - Number(x.low) || y.xs.length - x.xs.length)
  const offerCell = (offers: Record<'offered' | 'taken', ReadonlyMap<string, number>>, key: string) => {
    const op = key.split(':')[0]
    return op === 'engrave' || op === 'relic' ? `${offers.offered.get(key) ?? 0} / ${offers.taken.get(key) ?? 0}` : '—'
  }

  const out = [
    `# Montée en puissance et porteur réel · règles ${pkg.version} · ${BUILDS} builds par personnage, ${N} combats par duel`,
    '',
    `Builds tirés comme le champion de référence de la campagne (graines \`builds:<id>:<s>\`, ${VARIANTS} variantes par graine ; offre orientée, choix par défaut). Récompenses dans l'ordre : ${REWARDS.map((k) => (k === 'forge' ? 'forge' : 'relique')).join(', ')}. Force relative au rang k : le build contre le build de même indice et de même rang des ${CHARACTER_IDS.length - 1} autres (${(CHARACTER_IDS.length - 1) * N} combats par build, graines de \`npm run balance\`, hasard commun). Les apports sont des écarts appariés à 10 récompenses, en points, chez les porteurs réels.`,
    `Mesuré : ${fights.toLocaleString('fr-FR')} combats en ${Math.round((Date.now() - started) / 1000)} s (${WORKERS} processus).`,
    '',
    '## Les courbes de montée',
    '',
    `Force relative, en %, après 0 à ${RANKS} récompenses. Écart entre le premier et le dernier à ${RANKS} : ${pct(byMean[0].avg - byMean[byMean.length - 1].avg)} points ; pentes négatives : ${rows.filter((r) => r.slope < 0).length}.`,
    '',
    `| Personnage | ${Array.from({ length: RANKS + 1 }, (_, k) => k).join(' | ')} | Pente (${RANKS} − 0) |`,
    `| --- |${' --- |'.repeat(RANKS + 2)}`,
    ...[...rows].sort((x, y) => y.slope - x.slope).map((r) => `| ${r.name} | ${r.curve.map((x) => Math.round(x * 100)).join(' | ')} | ${pts(r.slope)} |`),
    '',
    `## À ${RANKS} récompenses : distribution, apports, montée absolue, durée`,
    '',
    `Écart-type vrai : la variance des builds moins celle du tirage. « Toute la forge », « toutes les reliques » : le build sans elles, mêmes graines. Force absolue : contre le roster nu (vanilla → construit) ; montée absolue en log-cote. Tours par combattant : contre les builds de même rang, à 0 → ${RANKS} récompenses.`,
    '',
    '| Personnage | Moyenne | 10e centile | Pire | Meilleur | > 65 % | < 50 % | Écart-type vrai | Toute la forge | Toutes les reliques | Force absolue | Montée absolue (log-cote) | Tours par combattant |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...byMean.map(
      (r) =>
        `| ${r.name} | ${pct(r.avg)} | ${pct(r.at10[Math.floor((r.at10.length - 1) / 10)])} | ${pct(r.at10[0])} | ${pct(r.at10[r.at10.length - 1])} | ${Math.round((r.at10.filter((p) => p > 0.65).length / r.at10.length) * 100)} % | ${Math.round((r.at10.filter((p) => p < 0.5).length / r.at10.length) * 100)} % | ${pct(r.trueSd)} | ${pts(r.forge)} | ${pts(r.relics)} | ${pct(r.vanilla)} → ${pct(r.absolute)} | ${r.rise < 0 ? '−' : '+'}${Math.abs(r.rise).toFixed(2).replace('.', ',')} | ${r.turns[0].toFixed(1).replace('.', ',')} → ${r.turns[1].toFixed(1).replace('.', ',')} |`,
    ),
    '',
    '## Les opérations',
    '',
    'Apport moyen d’un pas de forge et d’une relique, retiré seul (le reste rejoué), en points, et le nombre de pas mesurés.',
    '',
    `| Personnage | ${Object.values(OP_LABEL).join(' | ')} |`,
    `| --- |${' --- |'.repeat(Object.keys(OP_LABEL).length)}`,
    ...byMean.map((r) => `| ${r.name} | ${r.ops.map((xs) => (xs.length ? `${pts(mean(xs))} (${xs.length})` : '—')).join(' | ')} |`),
    '',
    '## Les briques prises, sous la bande',
    '',
    `Gravures et reliques prises par le choix par défaut, chez leur porteur : valeur moyenne et part sous la bande (${pct(BAND.min)} points). Les plus prises : valeur (n builds sur ${BUILDS}).`,
    '',
    '| Personnage | Gravures par build | Valeur d’une gravure | Gravures sous la bande | Valeur d’une relique | Reliques sous la bande | Gravures les plus prises |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...byMean.map((r) => {
      const top = [...r.bricks].filter(([key]) => key.startsWith('engrave:')).sort((x, y) => y[1].length - x[1].length).slice(0, 3)
      return `| ${r.name} | ${(r.engraved.length / BUILDS).toFixed(2).replace('.', ',')} | ${pts(mean(r.engraved))} | ${under(r.engraved)} | ${pts(mean(r.relicValues))} | ${under(r.relicValues)} | ${top.map(([key, xs]) => `${brickName(key)} ${pts(mean(xs))} (${xs.length})`).join(', ') || '—'} |`
    }),
    '',
    '## Les briques hors de leur bande, souvent prises',
    '',
    `Prises dans ${minN} builds sur ${BUILDS} au moins. Bande d’une gravure : ${pct(BAND.min)} à ${pct(BAND.max)} points ; d’un aiguisage : ${pct(RANK_BAND.min)} à ${pct(RANK_BAND.max)} ; une relique n’y figure qu’au-delà de ${pct(BAND.max)} (chez un porteur construit, la plupart valent moins de ${pct(BAND.min)}). Offerte / prise : actes sur ${OFFER_ACTS}.`,
    '',
    '| Porteur | Brique | Opération | Valeur | n | Offerte / prise | Hors bande |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...outside.map(({ r, key, xs, m, low }) => `| ${r.name} | ${brickName(key)} | ${OP_LABEL[key.split(':')[0]]} | ${pts(m)}${margin(xs)} | ${xs.length} | ${offerCell(r.offers, key)} | ${low ? 'sous' : 'au-dessus'} |`),
    '',
    '## Le kit dans les builds',
    '',
    `Chaque compétence du dé vanilla retirée à ${RANKS} récompenses (sa face nue ; ses aiguisages et copies tombent avec elle).`,
    '',
    '| Personnage | Compétences du kit |',
    '| --- | --- |',
    ...byMean.map((r) => `| ${r.name} | ${[...r.kit].map(([key, xs]) => `${skillName(key)} ${pts(mean(xs))}${margin(xs)}`).join(' ; ') || 'aucune (six faces nues)'} |`),
    '',
    '## Toutes les briques, chez leurs porteurs',
    '',
    `Valeur à ${RANKS} récompenses (marge à 95 %), n : pas mesurés (builds qui la portent ; un aiguisage peut compter deux fois dans un build). Offerte / prise : actes sur ${OFFER_ACTS} où la brique est offerte au moins une fois, puis prise (gravures et reliques).`,
    '',
    '| Porteur | Brique | Opération | Valeur | n | Offerte / prise |',
    '| --- | --- | --- | --- | --- | --- |',
    ...byMean.flatMap((r) =>
      [...r.bricks]
        .sort((x, y) => y[1].length - x[1].length || mean(y[1]) - mean(x[1]))
        .map(([key, xs]) => `| ${r.name} | ${brickName(key)} | ${OP_LABEL[key.split(':')[0]]} | ${pts(mean(xs))}${margin(xs)} | ${xs.length} | ${offerCell(r.offers, key)} |`),
    ),
  ].join('\n')

  mkdirSync('logs/ramp', { recursive: true })
  const file = `logs/ramp/${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}_v${pkg.version}.md`
  writeFileSync(file, `${out}\n`)
  console.log(`${out}\n\n→ ${file}`)
}, 3_600_000)
