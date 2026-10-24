/*
 * Rapport sur les combats joués par l'utilisateur : `npm run logs`. Pour ne garder qu'une session,
 * par exemple un tournoi : LOGS_SINCE=2026-10-18_14-00 npm run logs.
 * Chaque trace de logs/combats/ est rejouée depuis sa graine (nom du fichier), comparée au fichier
 * (même version des règles ?), passée à l'audit de résolution, puis résumée : victoires, durées,
 * compétences, moments marquants. Écrit dans logs/reports/. Méthode : docs/EQUILIBRAGE.md.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { createAudit } from '../src/game/audit'
import { simulateCombat, type CombatResult, type Pair } from '../src/game/combat'
import { BOSS, campaignCharacter } from '../src/game/campaign'
import { CHARACTER_IDS, ENGRAVABLE_SKILLS } from '../src/game/roster'
import { parseForcedRolls, parseForge, parseRelics, traceText } from '../src/game/trace'
import { getRelic, RELIC_IDS } from '../src/game/relics'
import type { ForgeStep } from '../src/game/forge'
import type { Character } from '../src/game/character'
import pkg from '../package.json' with { type: 'json' }

const DIR = 'logs/combats'
const NAME = /^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_([a-z0-9]+)-vs-([a-z0-9]+)_graine-(\d+)(?:_triche)?\.txt$/

const pct = (x: number) => `${(x * 100).toFixed(0)} %`

it('rapport des combats joués', () => {
  const since = process.env.LOGS_SINCE ?? ''
  let files: string[] = []
  try {
    files = readdirSync(DIR).filter((f) => NAME.test(f) && f >= since).sort()
  } catch {
    /* pas encore de dossier : aucun combat joué */
  }
  const out: string[] = [`# Combats joués · règles ${pkg.version}`, '']
  if (files.length === 0) {
    out.push(`Aucune trace dans ${DIR}${since ? ` depuis ${since}` : ''}.`)
    console.log(out.join('\n'))
    return
  }

  const { audit, problems } = createAudit()
  const results: { file: string; r: CombatResult; same: boolean }[] = []
  const skipped: string[] = []
  for (const file of files) {
    const [, , a, b, seed] = NAME.exec(file)!
    // Campagne (0.88.0) : le boss est un combattant connu, hors du roster
    const known = [...CHARACTER_IDS, BOSS.id]
    if (!known.includes(a) || !known.includes(b)) {
      skipped.push(`${file} (personnage inconnu)`)
      continue
    }
    // Les noms viennent de l'en-tête (« Gorak II » en tournoi), les règles de l'identifiant, les reliques de leur ligne,
    // la forge du dé de la sienne, et les PV (réglés en campagne) de la ligne de chaque combattant
    const text = readFileSync(`${DIR}/${file}`, 'utf8')
    const names = /^=== Battler · (.+) contre (.+) · graine/.exec(text)
    const relics = parseRelics(text)
    if (relics.flat().some((id) => !RELIC_IDS.includes(id))) {
      skipped.push(`${file} (relique inconnue)`)
      continue
    }
    let forge: Pair<ForgeStep[]>
    try {
      forge = parseForge(text, ENGRAVABLE_SKILLS)
    } catch {
      skipped.push(`${file} (forge illisible)`)
      continue
    }
    const hp = text.split('\n').slice(1, 3).map((line) => Number(/\) : (\d+) PV/.exec(line)?.[1]))
    const fighter = (id: string, side: 0 | 1, name?: string) => {
      // Un seul modèle (0.113.0) : tout combattant part du personnage vanilla (le boss, de sa fiche), puis sa forge (écrite
      // pour un champion de campagne) et ses reliques. Sans forge, sa ligne nomme ses compétences dans l'ordre de son dé ;
      // une autre liste vient d'un kit de tournoi d'avant la 0.113.0 (Pourfendre sur le 1 de Gorak, la Foudre sur trois
      // faces de Thaldrin…), qui ne se reconstruit plus
      const listed = /compétences : (.+)$/.exec(text.split('\n')[side + 1])?.[1]
      const base = campaignCharacter(id)
      const vanilla = base.events.map((e) => e.name).join(', ') || 'aucune'
      if (forge[side].length === 0 && listed !== vanilla) throw new Error(`${base.name} : kit d'avant la 0.113.0 (${listed})`)
      const built = (name ? base.withName(name) : base).withForge(forge[side]).withRelics(relics[side].map(getRelic))
      const delta = hp[side] - built.maxHp
      return delta && Number.isFinite(delta) ? built.adjusted({ stats: { maxHp: built.baseStats.maxHp + delta } }) : built
    }
    let fighters: Pair<Character>
    try {
      fighters = [fighter(a, 0, names?.[1]), fighter(b, 1, names?.[2])]
    } catch (error) {
      // Un combattant d'une autre version des règles : une gravure devenue interdite, ou un kit d'avant le modèle unique
      skipped.push(`${file} (non reconstruit : ${error instanceof Error ? error.message : error})`)
      continue
    }
    const r = simulateCombat(fighters, { seed: Number(seed), forcedRolls: parseForcedRolls(text) })
    // La trace écrite et la trace rejouée doivent être identiques ; sinon, les règles ont changé depuis
    const same = traceText(r) === text
    results.push({ file, r, same })
    audit(r)
  }

  const drift = results.filter((x) => !x.same)
  out.push(
    `${results.length} combats (${files[0].slice(0, 16)} → ${files[files.length - 1].slice(0, 16)}).`,
    drift.length
      ? `⚠️ ${drift.length} combats ne se rejouent pas à l'identique : ils ont été joués avec d'autres règles. L'audit porte sur la version actuelle. Exemple : ${drift[0].file}`
      : 'Tous les combats se rejouent à l’identique avec les règles actuelles.',
    '',
    '## Audit de résolution',
    '',
    problems.size ? [...problems].map(([k, p]) => `- ❌ ${k} ×${p.n} — ex. ${p.example}`).join('\n') : '✅ Aucune anomalie.',
    '',
  )

  // Bilan par personnage
  const by = new Map<string, { name: string; fights: number; wins: number; turns: number; skills: Map<string, number> }>()
  for (const { r } of results)
    for (const side of [0, 1] as const) {
      const c = r.fighters[side]
      const s = by.get(c.id) ?? { name: c.name.replace(/ [IVX]+$/, ''), fights: 0, wins: 0, turns: 0, skills: new Map() }
      s.fights++
      s.turns += r.turns
      if (r.winner === side) s.wins++
      for (const b of r.beats)
        if (b.type === 'event' && b.event.side === side) s.skills.set(b.event.name, (s.skills.get(b.event.name) ?? 0) + 1)
      by.set(c.id, s)
    }
  out.push(
    '## Bilan par personnage',
    '',
    '| Personnage | Combats | Victoires | Tours moyens | Compétences par combat |',
    '| --- | --- | --- | --- | --- |',
    ...[...by.values()]
      .sort((x, y) => y.wins / y.fights - x.wins / x.fights)
      .map(
        (s) =>
          `| ${s.name} | ${s.fights} | ${s.wins} (${pct(s.wins / s.fights)}) | ${(s.turns / s.fights).toFixed(1)} | ${[...s.skills]
            .map(([n, k]) => `${n} ${(k / s.fights).toFixed(1)}`)
            .join(', ')} |`,
      ),
    '',
  )

  // Moments marquants : ce qui mérite d'être relu dans la trace
  const notable: string[] = []
  for (const { file, r } of results) {
    const who = `${r.fighters[0].name} contre ${r.fighters[1].name}`
    const attacks = r.beats.flatMap((b) => (b.type === 'attack' ? [b.attack] : []))
    const best = attacks.reduce((m, a) => (a.dealt > m ? a.dealt : m), 0)
    if (best >= 20) notable.push(`- Coup de ${best} dégâts — ${who} (${file})`)
    const thornsByTurn = new Map<number, number>()
    for (const b of r.beats) if (b.type === 'statusReaction' && b.status === 'thorns') thornsByTurn.set(b.turn, (thornsByTurn.get(b.turn) ?? 0) + 1)
    if ([...thornsByTurn.values()].some((n) => n >= 2)) notable.push(`- Épines contre Furie des vents (double renvoi) — ${who} (${file})`)
    const last = r.beats[r.beats.length - 1]
    if (last.type !== 'attack') notable.push(`- K.O. hors d'un coup (${last.type === 'statusTick' ? last.status : last.type}) — ${who} (${file})`)
    if (r.turns >= 45) notable.push(`- Combat très long (${r.turns} tours) — ${who} (${file})`)
    const auras = r.beats.flatMap((b) => (b.type === 'event' && b.event.trigger === 'naturalThree' ? [b.event] : []))
    for (const side of [0, 1] as const) {
      const n = auras.filter((e) => e.side === side).length
      if (n >= 3) notable.push(`- ${r.fighters[side].name} pose ${n} fois son aura — ${who} (${file})`)
    }
  }
  out.push('## Moments marquants', '', ...(notable.length ? notable : ['Rien de particulier.']), '')
  if (skipped.length) out.push('## Ignorés', '', ...skipped.map((s) => `- ${s}`), '')

  const text = out.join('\n')
  mkdirSync('logs/reports', { recursive: true })
  const file = `logs/reports/${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}_combats.md`
  writeFileSync(file, text)
  console.log(`${text}\n→ ${file}`)
}, 600_000)
