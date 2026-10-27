/*
 * La mise en scène (docs/MOTEUR_V2.md § 4), sans navigateur : des combats à graine de tout le roster, mis en scène par
 * `stage`, puis rejoués par le réducteur du lecteur (`applyCue`). Les invariants valent pour tous ; les cas précis
 * (poison et Riposte, plaie qui coule, Peur, rafales, Duo de la barde, pièce, relique, druide, Foudre) sont
 * cherchés dans ce corpus, et chacun doit y apparaître.
 */
import { describe, expect, it } from 'vitest'
import { beatEffects, simulateCombat, splitAmong, type AppliedEffect, type Beat, type CombatResult, type Pair } from './combat'
import type { Character } from './character'
import { DAMAGE_SOURCES, type DamageSource } from './damage'
import { isRollTrigger, rollFace, type CharacterEvent } from './events'
import { RELICS } from './relics'
import { CHARACTER_IDS, createCharacter, ENGRAVABLE_SKILLS } from './roster'
import { SCENE_EVENTS } from './scenes'
import { childrenOf, relicSignal, skillFaceAt, stage, type Cue, type Moment } from './staging'
import { isAura, type Status } from './statuses'
import { onOldDie, testCharacter } from './test-utils'
import { effectBadge, STOLEN_BADGE } from './narration'
import { signalTargets, STATES } from './states'
import { STATUSES } from './statuses'
import * as T from './timing'
import { castsMagicAt, castsSpell } from './poses'
import { applyCue, initialView } from './useCombat'

interface Case {
  result: CombatResult
  moments: Moment[]
}

const corpus: Case[] = []
for (const x of CHARACTER_IDS)
  for (const y of CHARACTER_IDS)
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      // Une relique par camp une fois sur deux, tirée du registre
      const relics = (k: number) => (seed % 2 === 0 ? [RELICS[(seed * 3 + k) % RELICS.length]] : [])
      const fighters: Pair<Character> = [createCharacter(x).withRelics(relics(0)), createCharacter(y).withRelics(relics(5))]
      const result = simulateCombat(fighters, { seed })
      corpus.push({ result, moments: stage(result) })
    }
// Le même roster sur ses dés de la 0.120.0 (`onOldDie`) : les mécaniques que les dés de départ ne portent plus d'office depuis
// les Maîtrises (Pourfendre, la Riposte, la Foudre, le Soliste, l'Esquive améliorée) restent mises en scène
for (const x of CHARACTER_IDS)
  for (const y of CHARACTER_IDS)
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const relics = (k: number) => (seed % 2 === 0 ? [RELICS[(seed * 3 + k) % RELICS.length]] : [])
      const result = simulateCombat([onOldDie(x).withRelics(relics(0)), onOldDie(y).withRelics(relics(5))], { seed })
      corpus.push({ result, moments: stage(result) })
    }
// Les compétences des réserves (Maîtrises : la Peur, Coup de chance…) se jouent gravées sur le 3 d'un porteur : Gorak, ou
// Ervald pour l'Aura de puissance, Coup de chance (la rafale de Gorak tomberait dans le même moment que sa Furie) et ce que
// porte déjà le dé de Gorak
for (const skill of ENGRAVABLE_SKILLS)
  for (const y of CHARACTER_IDS)
    for (const seed of [1, 2]) {
      const onGorak = createCharacter('gorak').events.some((e) => e.id === skill.id)
      const carrier = createCharacter(onGorak || ['power-aura', 'lucky-strike'].includes(skill.id) ? 'ervald' : 'gorak').withForge([{ op: 'engrave', face: 3, skill }])
      const result = simulateCombat([carrier, createCharacter(y)], { seed })
      corpus.push({ result, moments: stage(result) })
    }

// Chaque relique portée par chaque personnage, contre chacun (l'Encens et le Vol de vie d'Ervald, les reliques du
// défenseur, la Larme de givre à vide partent assez souvent)
const relicCorpus: Case[] = []
for (const relic of RELICS)
  for (const x of CHARACTER_IDS)
    for (const y of CHARACTER_IDS)
      for (const seed of [1, 2]) {
        const result = simulateCombat([createCharacter(x).withRelics([relic]), createCharacter(y)], { seed })
        relicCorpus.push({ result, moments: stage(result) })
      }

/**
 * Une étape dont aucun effet ne change rien (M25), lue dans la chronologie : pose refusée ou au plafond, statut reposé
 * tel quel (le même avant et après l'étape), purge à vide.
 */
function changesNothing(beats: readonly Beat[], beat: Beat, effects: readonly AppliedEffect[]): boolean {
  const before = beats[beat.id - 1]?.state.statuses
  return (
    effects.length > 0 &&
    effects.every((e) => {
      if (e.type === 'cleanse') return e.removed.length === 0
      if (e.type !== 'applyStatus') return false
      if (e.result.kind !== 'applied' || e.result.stacks === 0) return true
      const was = before?.[e.target].find((s) => s.id === e.status)
      return !e.result.cancelled && was !== undefined && JSON.stringify(was) === JSON.stringify(beat.state.statuses[e.target].find((s) => s.id === e.status))
    })
  )
}

/** Le moment qui couvre l'étape `id`. */
const momentOf = (moments: Moment[], id: number) => moments.find((m) => m.beats.includes(id))!
/** L'instant de l'impact de chaque coup (non remplacé, non tombé à vide) d'un moment, par étape, dans l'ordre. */
function impacts(moment: Moment, beats: Beat[]): Map<number, number> {
  const landed = moment.cues.filter((c) => c.channel === 'strike' && c.strike?.landed).map((c) => c.at)
  const strikes = moment.beats.filter((id) => {
    const b = beats[id]
    return b.type === 'attack' && !b.attack.replaced && !b.attack.jinxed
  })
  return new Map(strikes.map((id, k) => [id, landed[k]]))
}
const at = (moment: Moment, channel: Cue['channel'], when: number) => moment.cues.filter((c) => c.channel === channel && c.at === when)

/**
 * Une relique du dé (M40) : déclenchée par une face ou par le jet maximal, elle part avec le dé posé, avant son coup ;
 * sauf si elle met fin au combat (elle reste alors une réaction, après le coup).
 */
function playedWithDie(beat: Beat): boolean {
  if (beat.type !== 'relic' || beat.state.hp.some((x) => x === 0)) return false
  const trigger = RELICS.find((r) => r.id === beat.relic)?.trigger
  return trigger?.type === 'strike' && isRollTrigger(trigger.on)
}

/**
 * La plaie qui coule et met K.O. son porteur après qu'il a réagi au coup (sa Riposte) : elle garde son rang parmi les
 * réactions (M43). Ses sœurs plus anciennes qui comptent : ni jauge, ni relique du dé, ni ce que le coup produit (M14).
 */
function fatalAfterReaction(beats: readonly Beat[], wound: Beat): boolean {
  if (wound.type !== 'statusReaction' || wound.state.hp[wound.side] > 0 || wound.cause === undefined) return false
  const hit = beats[wound.cause]
  if (hit.type !== 'attack') return false
  const striker = hit.attack.attacker
  return childrenOf(beats)[hit.id].some((b) => {
    if (b.id >= wound.id || playedWithDie(b)) return false
    if (b.type === 'statusReaction')
      return b.effects.length > 0 && !(b.side === striker && b.trigger === 'hit' && b.effects.every((e) => (e.type === 'applyStatus' && e.target !== striker) || (e.type === 'heal' && e.target === striker)))
    return b.type === 'relic' || (b.type === 'event' && rollFace(b.event.trigger) === undefined)
  })
}

/** Mode triche : chaque dé du combat tombe sur `face`. */
const everyDie = (face: number): Record<number, number> => Object.fromEntries(Array.from({ length: 120 }, (_, k) => [k, face]))

describe('mise en scène', () => {
  it('chaque étape est couverte par exactement un moment, dans l’ordre ; les cues sont triées', () => {
    for (const { result, moments } of corpus) {
      expect(moments.flatMap((m) => m.beats)).toEqual(result.beats.map((b) => b.id))
      for (const m of moments) {
        expect(m.cues.map((c) => c.at)).toEqual(m.cues.map((c) => c.at).sort((p, q) => p - q))
        expect(m.cues.every((c) => c.at >= 0 && c.at <= m.duration)).toBe(true)
      }
    }
  })

  it('les attentes de chaque moment se suivent sans trou, font sa durée et nomment leur constante', () => {
    for (const { moments } of corpus)
      for (const m of moments) {
        let end = 0
        for (const span of m.spans) {
          expect(span.at).toBe(end)
          expect(span.ms).toBeGreaterThan(0)
          // Une constante de timing.ts, ou le libellé en français d'une durée calculée
          if (/^[A-Z_]+$/.test(span.name)) expect(T[span.name as keyof typeof T]).toBe(span.ms)
          end += span.ms
        }
        expect(end).toBe(m.duration)
      }
  })

  it('un moment, une étape racine et ce qui en découle, dans le même tour', () => {
    for (const { result, moments } of corpus)
      for (const m of moments)
        m.beats.forEach((id, k) => {
          const beat = result.beats[id]
          expect(beat.turn).toBe(m.turn)
          if (k > 0) expect(m.beats).toContain(beat.cause)
        })
  })

  it('jamais deux fois le même son au même instant (un seul par signe de label)', () => {
    for (const { moments } of corpus)
      for (const m of moments) {
        const sounds = m.cues.flatMap((c) => (c.channel === 'sound' ? [`${c.at}:${c.cue}`] : []))
        expect(new Set(sounds).size).toBe(sounds.length)
      }
  })

  it('les PV de chaque moment retombent sur l’état de sa dernière étape', () => {
    let blows = 0
    for (const { result, moments } of corpus) {
      let view = initialView(result.fighters)
      for (const m of moments) {
        for (const cue of m.cues) view = applyCue(view, cue, 0)
        blows += m.cues.filter((c) => c.channel === 'blow' && c.blow?.landed).length
        if (m.beats.length > 0) expect(view.hp).toEqual(result.beats[m.beats[m.beats.length - 1]].state.hp)
      }
      expect(view.winner).toBe(result.winner)
    }
    expect(blows).toBeGreaterThan(100)
  })

  it("le poison de l'Aura de décoction tombe à l'impact du coup qui le pose, même avec une Riposte sur ce coup", () => {
    let rides = 0
    let riposted = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'statusReaction' || beat.status !== 'decoctionAura' || beat.cause === undefined) continue
        const hit = result.beats[beat.cause]
        if (hit.type !== 'attack') continue
        const m = momentOf(moments, beat.id)
        const impact = impacts(m, result.beats).get(hit.id)!
        const posed = beat.effects.flatMap((e) => (e.type === 'applyStatus' ? [effectBadge(e).text] : []))
        if (posed.length === 0) continue
        const floats = at(m, 'float', impact).flatMap((c) => (c.channel === 'float' && c.float.kind === 'badge' ? [c.float.badge.text] : []))
        for (const text of posed) expect(floats).toContain(text)
        rides++
        if (childrenOf(result.beats)[hit.id].some((b) => b.type === 'statusReaction' && STATUSES[b.status].reflectsHit)) riposted++
      }
    expect(rides).toBeGreaterThan(50)
    expect(riposted).toBeGreaterThan(0)
  })

  it('le Saignement de Pourfendre tombe à l’impact du coup qui touche, avec son gain (« +3 Saignement », M42)', () => {
    let rides = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'event' || beat.event.eventId !== 'cleave' || beat.cause === undefined) continue
        const m = momentOf(moments, beat.id)
        const impact = impacts(m, result.beats).get(beat.cause)!
        const floats = at(m, 'float', impact).flatMap((c) => (c.channel === 'float' && c.float.kind === 'badge' ? [c.float.badge.text] : []))
        for (const e of beat.event.effects)
          expect(floats).toContain(e.type === 'applyStatus' && e.result.kind === 'applied' ? `+${e.result.stacks} ${STATUSES[e.status].name}` : effectBadge(e).text)
        rides++
      }
    expect(rides).toBeGreaterThan(20)
  })

  it("la plaie qui coule tombe sur l'impact du coup qui la fait couler : son label à l'impact, ses PV un battement après ; fatale après une réaction de son porteur, à son rang (M43)", () => {
    let flows = 0
    let late = 0
    // Le cas rare (une plaie fatale après une réaction du blessé, sa Riposte ou ses Épines) : Pourfendre contre Aldric et
    // Brokk, sur leurs dés de la 0.120.0
    const duels = Array.from({ length: 40 }, (_, k) => k + 1).flatMap((seed) =>
      ['aldric', 'brokk'].flatMap((foe) => [simulateCombat([onOldDie('gorak'), onOldDie(foe)], { seed }), simulateCombat([onOldDie(foe), onOldDie('gorak')], { seed })]).map((result) => ({ result, moments: stage(result) })),
    )
    for (const { result, moments } of [...corpus, ...duels])
      for (const beat of result.beats) {
        if (beat.type !== 'statusReaction' || beat.status !== 'bleed' || beat.cause === undefined) continue
        const hit = result.beats[beat.cause]
        if (hit.type !== 'attack') continue
        const m = momentOf(moments, beat.id)
        const impact = impacts(m, result.beats).get(hit.id)!
        if (fatalAfterReaction(result.beats, beat)) {
          // Le K.O. tombe après la réaction du blessé (sa Riposte), jamais avant
          const down = m.cues.find((c) => c.channel === 'hp' && c.hp[beat.side] === 0)!
          expect(m.cues.some((c) => c.channel === 'blow' && c.blow?.from === beat.side && c.at > down.at)).toBe(false)
          late++
          continue
        }
        const labels = at(m, 'special', impact).flatMap((c) => (c.channel === 'special' ? [c.special.label] : []))
        expect(labels.some((l) => l.startsWith(STATUSES.bleed.name))).toBe(true)
        expect(at(m, 'hp', impact + T.BLEED_DELAY).length).toBe(1)
        flows++
      }
    expect(flows).toBeGreaterThan(20)
    expect(late).toBeGreaterThan(0)
  })

  it('le décompte et l’expiration d’un statut tombent avec son effet (« −2 » et compteur ensemble)', () => {
    let counted = 0
    let expired = 0
    for (const { result, moments } of corpus)
      for (const tick of result.beats) {
        if (tick.type !== 'statusTick' || !tick.effects.some((e) => e.type === 'damage')) continue
        const later = result.beats.filter((b) => b.id > tick.id && b.turn === tick.turn && 'phase' in b && b.phase === tick.phase && 'side' in b && b.side === tick.side)
        const change = later.flatMap((b) => (b.type === 'statusAge' ? b.changes.filter((c) => c.status === tick.status) : []))[0]
        const gone = later.some((b) => b.type === 'statusAge' && b.expired.includes(tick.status))
        if (!change && !gone) continue
        const m = momentOf(moments, tick.id)
        // Le « −N » du statut, et les statuts montrés au même instant
        const badge = m.cues.find((c) => c.channel === 'float' && c.float.kind === 'badge' && c.float.badge.text.startsWith('-'))!
        const shown = at(m, 'statuses', badge.at).at(-1)
        expect(shown?.channel).toBe('statuses')
        if (shown?.channel !== 'statuses') continue
        const status = shown.statuses[tick.side].find((s) => s.id === tick.status)
        if (gone) {
          expect(status).toBeUndefined()
          expired++
        } else {
          expect(status?.turns).toBe(change.to)
          counted++
        }
      }
    expect(counted + expired).toBeGreaterThan(20)
  })

  it('le poison qui agit grésille ; les autres statuts qui rongent gardent Ronge (SONS.md § 9.3) ; un tick qui frappe l’adversaire est un coup', () => {
    const heard = { poison: 0, other: 0 }
    for (const { result, moments } of corpus)
      for (const tick of result.beats) {
        if (tick.type !== 'statusTick' || !tick.effects.some((e) => e.type === 'damage')) continue
        const sounds = momentOf(moments, tick.id).cues.flatMap((c) => (c.channel === 'sound' ? [c.cue] : []))
        // Ciel d'orage (lot 3) : il frappe l'adversaire, en dégâts directs ; aucun Ronge
        if (!tick.effects.some((e) => e.type === 'damage' && e.target === tick.side)) {
          expect(sounds, tick.status).not.toContain('rot')
          continue
        }
        const poison = tick.status === 'poison'
        expect(sounds, tick.status).toContain(poison ? 'fizz' : 'rot')
        heard[poison ? 'poison' : 'other']++
      }
    expect(heard.poison).toBeGreaterThan(10)
    expect(heard.other).toBeGreaterThan(10)
  })

  it('la Peur : « Tour perdu » tombe sur celui qui perd son action, avec son son', () => {
    let skips = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'skip') continue
        const m = momentOf(moments, beat.id)
        const note = m.cues.find((c) => c.channel === 'float' && c.side === beat.side && c.float.kind === 'badge' && c.float.badge.text === STATES.lostTurn.name)!
        expect(note).toBeDefined()
        expect(at(m, 'sound', note.at).some((c) => c.channel === 'sound' && c.cue === 'stun')).toBe(true)
        skips++
      }
    expect(skips).toBeGreaterThan(10)
  })

  it('perte de contrôle : il vacille tant qu’un statut lui fait perdre son action, puis pendant son tour perdu, jusqu’au passage de main (M51)', () => {
    const control = (list: readonly Status[]) => list.some((s) => STATUSES[s.id].skipsAction)
    let lost = 0
    let recovered = 0
    for (const { result, moments } of corpus) {
      let view = initialView(result.fighters)
      // Le tour dont « Tour perdu » est tombé, par camp
      const told: (number | null)[] = [null, null]
      for (const m of moments) {
        const skips = m.beats.map((id) => result.beats[id]).filter((b) => b.type === 'skip')
        for (const at of [...new Set(m.cues.map((c) => c.at))]) {
          const cues = m.cues.filter((c) => c.at === at)
          const was = view.dazed
          for (const c of cues) view = applyCue(view, c, at)
          for (const side of [0, 1] as const) {
            if (skips.some((b) => b.side === side) && cues.some((c) => c.channel === 'float' && c.side === side && c.float.kind === 'badge' && c.float.badge.text === STATES.lostTurn.name)) {
              told[side] = m.turn
              expect(view.dazed[side], 'il vacille quand son tour tombe').toBe(true)
              lost++
            }
            if (control(view.statuses[side])) expect(view.dazed[side], 'un statut de contrôle à l’écran').toBe(true)
            else if (view.dazed[side]) expect(told[side], 'il vacille sans contrôle, hors de son tour perdu').toBe(m.turn)
            else if (was[side] && told[side] !== null && told[side] !== m.turn) recovered++
          }
        }
      }
    }
    expect(lost).toBeGreaterThan(10)
    expect(recovered).toBeGreaterThan(10)
  })

  it('incantation : un sort offensif fait incanter son lanceur de son départ à la fin de sa lecture, rien d’autre (M55)', () => {
    let cast = 0
    let magic = 0
    for (const { result, moments } of corpus) {
      let view = initialView(result.fighters)
      for (const m of moments) {
        const beats = m.beats.map((id) => result.beats[id])
        // Qui peut incanter dans ce moment : le lanceur d'un sort offensif, le porteur d'une aura qui blesse par la magie
        const casters = new Set(
          beats.flatMap((b) => {
            if (b.type === 'event') {
              const def = result.fighters[b.event.side].events.find((e) => e.id === b.event.eventId)
              return def && castsSpell(def) ? [b.event.side] : []
            }
            return (b.type === 'statusTick' || b.type === 'statusReaction') && castsMagicAt(b.side, b.effects) ? [b.side] : []
          }),
        )
        for (const c of m.cues) {
          view = applyCue(view, c, c.at)
          if (c.channel !== 'cast' || !c.on) continue
          expect(casters.has(c.side), 'une incantation sans sort offensif').toBe(true)
          cast++
        }
        // L'incantation ne survit pas à son moment
        expect(view.casting, 'incantation encore en cours à la fin du moment').toEqual([false, false])
        // Un sort qui blesse par la magie (la Foudre, la Purification qui blesse) incante toujours
        for (const b of beats)
          if (b.type === 'event' && b.event.effects.some((e) => e.type === 'damage' && e.target !== b.event.side && e.amount > 0 && DAMAGE_SOURCES[e.source].magical)) {
            expect(m.cues.some((c) => c.channel === 'cast' && c.side === b.event.side && c.on)).toBe(true)
            magic++
          }
      }
    }
    expect(cast).toBeGreaterThan(20)
    expect(magic).toBeGreaterThan(10)
  })

  it('rafales : les dés roulent ensemble (à plat pour la Furie instantanée), un coup rapide par dé', () => {
    let instant = 0
    let rolled = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'flurry') continue
        const m = momentOf(moments, beat.id)
        // Ses coups, et ceux de ses jets greffés (Coup de chance), sous leur étape `roll`
        const children = childrenOf(result.beats)
        const strikes = children[beat.id].flatMap((b) => (b.type === 'roll' ? children[b.id] : [b])).filter((b) => b.type === 'attack')
        const volley = m.cues.find((c) => c.channel === 'dice' && c.dice.volley && c.dice.values.length === strikes.length)
        expect(volley, `rafale ${beat.id}`).toBeDefined()
        // Une rafale qui en pose une autre dans le même moment (le Duo qui retombe sur un 1, 2026-10-27) compte aussi ses coups
        const nested = m.beats.some((id) => id !== beat.id && result.beats[id].type === 'flurry')
        const fast = m.cues.filter((c) => c.channel === 'strike' && c.strike?.fast && !c.strike.landed).length
        if (!nested) expect(fast).toBe(strikes.filter((b) => b.type === 'attack' && !b.attack.replaced).length)
        if (beat.status && STATUSES[beat.status].instantStrikes) {
          if (!nested) expect(m.cues.some((c) => c.channel === 'dice' && c.dice.volley && c.dice.rolling)).toBe(false)
          instant++
        } else rolled++
      }
    expect(instant).toBeGreaterThan(5)
    expect(rolled).toBeGreaterThan(5)
  })

  it('Duo de la barde : annoncé sur son 1, sa rafale à l’action suivante s’annonce avec le ding, sa charge part avec lui, roule une fois, le dé de plus en mauve ; chaque jet ressort son dé', () => {
    let announced = 0
    let actions = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type === 'event' && beat.event.eventId === 'duo') {
          const m = momentOf(moments, beat.id)
          // Son bonus volé (Sceau de vol, lot 3) sonne le vol, la famille du voleur (SONS § 4.2, 2026-10-25) ; posé, le son
          // déduit de ce qu'il pose (Aura gagnée tant qu'il posait l'Aura mélodieuse)
          const stolen = beat.event.effects.some((e) => e.type === 'applyStatus' && e.stolenBy !== undefined)
          const aura = beat.event.effects.some((e) => e.type === 'applyStatus' && isAura(e.status))
          expect(m.cues.some((c) => c.channel === 'sound' && c.cue === (stolen ? 'sealDown' : aura ? 'auraGain' : 'buff'))).toBe(true)
          announced++
        }
        // Une action coupée par un K.O. n'a tiré que les dés de ses jets joués
        if (beat.type !== 'flurry' || beat.status !== 'duo' || beat.turn === result.turns) continue
        const m = momentOf(moments, beat.id)
        // La consommation (S9, retour du 2026-10-27) : « Duo », le ding et la charge qui quitte la zone d'état, ensemble
        const title = m.cues.find((c) => c.channel === 'float' && c.float.kind === 'title' && c.float.text === STATUSES.duo.name)!
        expect(at(m, 'sound', title.at).some((c) => c.channel === 'sound' && c.cue === 'coinWin')).toBe(true)
        const before = result.beats[beat.id - 1]?.state.statuses[beat.side].find((s) => s.id === 'duo')?.stacks ?? 0
        expect(at(m, 'statuses', title.at).some((c) => c.channel === 'statuses' && (c.statuses[beat.side].find((s) => s.id === 'duo')?.stacks ?? 0) < before)).toBe(true)
        expect(m.cues.filter((c) => c.channel === 'dice' && c.dice.rolling && c.dice.values.length === beat.strikes)).toHaveLength(1)
        const land = m.cues.find((c) => c.channel === 'dice' && !c.dice.rolling && c.dice.values.length === beat.strikes && c.dice.values[0] > 0)!
        expect(land).toBeDefined()
        if (land.channel === 'dice') expect(land.dice.dieColors).toEqual([undefined, ...Array(beat.strikes - 1).fill(STATUSES.duo.look!.dieColor)])
        expect(at(m, 'sound', land.at).some((c) => c.channel === 'sound' && c.cue === 'coinWin')).toBe(false)
        // Chaque jet joué désigne son dé : le premier, puis le suivant
        const children = childrenOf(result.beats)
        const strikes = children[beat.id].flatMap((b) => (b.type === 'roll' ? children[b.id] : [b])).filter((b) => b.type === 'attack')
        for (let k = 0; k < strikes.length; k++) expect(m.cues.some((c) => c.channel === 'dice' && c.dice.active === k)).toBe(true)
        actions++
      }
    expect(announced).toBeGreaterThan(50)
    expect(actions).toBeGreaterThan(30)
  })

  it('pile ou face : pile tombe d’un bloc avec son ding, puis un seul coup lourd qui sonne le Coup ; une pièce qui pose un statut le pose comme une compétence', () => {
    let heads = 0
    let posed = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'coin' || !beat.heads) continue
        const m = momentOf(moments, beat.id)
        const land = m.cues.find((c) => c.channel === 'dice' && c.dice.coin?.heads === true)!
        expect(at(m, 'sound', land.at).some((c) => c.channel === 'sound' && c.cue === 'coinWin')).toBe(true)
        expect(at(m, 'float', land.at).some((c) => c.channel === 'float' && c.float.kind === 'title' && c.float.text === 'Pile !')).toBe(true)
        if (beat.effects.some((e) => e.type === 'damage')) {
          const blow = m.cues.find((c) => c.channel === 'blow' && c.blow?.landed && c.at > land.at)
          expect(blow?.channel === 'blow' && blow.blow?.heavy).toBe(true)
          // Le coup de pile sonne le Coup, pas le critique (retour du 2026-10-27, S2)
          expect(at(m, 'sound', blow!.at).some((c) => c.channel === 'sound' && c.cue === 'hit')).toBe(true)
          expect(at(m, 'sound', blow!.at).some((c) => c.channel === 'sound' && c.cue === 'crit')).toBe(false)
          heads++
          continue
        }
        // Une pièce qui pose un statut sur pile (bonus, malus) : son signal après le résultat, le statut à son arrivée,
        // jamais avant
        const signal = m.cues.find((c) => c.channel === 'signal' && c.at >= land.at)
        expect(signal).toBeDefined()
        for (const e of beat.effects)
          if (e.type === 'applyStatus' && e.result.kind === 'applied') {
            const was = result.beats[beat.id - 1]?.state.statuses[e.target].find((s) => s.id === e.status)?.stacks ?? 0
            const first = m.cues.find((c) => c.channel === 'statuses' && (c.statuses[e.target].find((s) => s.id === e.status)?.stacks ?? 0) > was)
            expect(first?.at).toBe(signal!.at + T.SIGNAL)
          }
        posed++
      }
    expect(heads).toBeGreaterThan(10)
    expect(posed).toBeGreaterThan(0)
  })

  it("relique : son sceau s'illumine avec son label, au même instant", () => {
    let relics = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'relic') continue
        const m = momentOf(moments, beat.id)
        const pulse = m.cues.find((c) => c.channel === 'relicPulse' && c.relics.includes(beat.relic))!
        expect(pulse).toBeDefined()
        const label = at(m, 'special', pulse.at).find((c) => c.channel === 'special' && c.special.source === 'relic')
        if (!changesNothing(result.beats, beat, beat.effects)) expect(label).toBeDefined()
        relics++
      }
    expect(relics).toBeGreaterThan(20)
  })

  it('le druide change de forme', () => {
    let shifts = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'shift') continue
        expect(momentOf(moments, beat.id).cues).toContainEqual(expect.objectContaining({ channel: 'form', side: beat.side, form: beat.form }))
        shifts++
      }
    expect(shifts).toBeGreaterThan(20)
  })

  it('Foudre : chaque coup tombe sur un impact de son événement de scène', () => {
    let bolts = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'event' || beat.event.eventId !== 'thunderbolt') continue
        const m = momentOf(moments, beat.id)
        const scene = m.cues.find((c) => c.channel === 'scene')!
        // Le coup de base greffé (et ce qu'il entraîne) suit la scène, dans le même moment
        const { impacts, length } = SCENE_EVENTS.lightning
        const landed = m.cues.filter((c) => c.channel === 'blow' && c.blow?.landed && c.at < scene.at + length).map((c) => c.at - scene.at)
        expect(landed).toEqual(impacts.slice(0, landed.length))
        expect(landed.length).toBeGreaterThan(0)
        bolts++
      }
    expect(bolts).toBeGreaterThan(5)
  })

  it('reliques élémentaires : la scène part avec la relique, sur sa cible, et ses effets tombent sur ses impacts', () => {
    for (const relic of RELICS.filter((r) => r.scene)) {
      const timing = SCENE_EVENTS[relic.scene!]
      let fires = 0
      for (const foe of CHARACTER_IDS)
        for (const seed of [1, 2, 3, 4]) {
          // Elaria esquive (Conque), Gorak encaisse et frappe fort (Géode, Larme) ; la Braise part à son 4e tour
          const result = simulateCombat([createCharacter('elaria').withRelics([relic]), createCharacter(foe)], { seed })
          const moments = stage(result)
          for (const beat of result.beats) {
            if (beat.type !== 'relic' || beat.side !== 0) continue
            const m = momentOf(moments, beat.id)
            // La relique peut partir dans le moment d'une autre scène (Larme de givre sous la Foudre du druide)
            // Deux déclenchements dans un moment (deux esquives) : chacun sa scène, dans l'ordre
            const own = m.beats.filter((id) => result.beats[id].type === 'relic' && result.beats[id].side === 0)
            const scene = m.cues.filter((c) => c.channel === 'scene' && c.scene.id === relic.scene)[own.indexOf(beat.id)]!
            expect(scene, relic.id).toMatchObject({ scene: { id: relic.scene, source: 0, target: timing.aim === 'self' ? 0 : 1 } })
            if (timing.aim === 'self') {
              // Sur le porteur : l'effet tombe au premier impact, et le moment laisse la scène aller au bout. Chaque
              // déclenchement a sa marque d'usage, dans l'ordre (deux coups encaissés dans un moment : la Géode, 2x)
              const use = m.cues.filter((c) => c.channel === 'relicUse' && c.relic === beat.relic)[own.indexOf(beat.id)]!
              expect(use.at - scene.at).toBe(timing.impacts[0])
              expect(m.duration - scene.at).toBeGreaterThanOrEqual(timing.length)
            } else {
              const landed = m.cues
                .filter((c) => c.channel === 'blow' && c.blow?.landed && c.at >= scene.at && c.at < scene.at + timing.length)
                .map((c) => c.at - scene.at)
              expect(landed, relic.id).toEqual(timing.impacts.slice(0, landed.length))
              expect(landed.length).toBeGreaterThan(0)
            }
            fires++
          }
        }
      expect(fires, relic.id).toBeGreaterThan(3)
    }
  })

  it('le dé qui pulse est celui du jet qui déclenche la compétence', () => {
    let pulses = 0
    for (const { result } of corpus) {
      const { beats } = result
      const children = childrenOf(beats)
      for (const beat of beats) {
        if (beat.type === 'attack') {
          const face = skillFaceAt(beats, beat.id, children)
          // Un coup ordinaire (sans compétence) ne fait rien pulser ; sinon, c'est la face du dé
          if (face !== undefined) expect(beat.attack.roll).toBe(face)
        }
        // Toute compétence sur un 1, 2 ou 3 a pour cause son jet : l'étape `roll` quand elle se greffe (puis le coup, au dé
        // déjà tiré), sinon le coup qu'elle modifie ou remplace ; le dé pulse sur sa face
        if (beat.type === 'event' && ['naturalOne', 'naturalTwo', 'naturalThree'].includes(beat.event.trigger)) {
          const cause = beats[beat.cause!]
          expect(cause?.type, `${beat.event.name} sans jet`).toMatch(/^(attack|roll)$/)
          const face = rollFace(beat.event.trigger)
          if (cause.type === 'roll') {
            expect(cause.roll).toBe(face)
            const strike = children[cause.id].find((b) => b.type === 'attack')
            if (strike) expect(skillFaceAt(beats, strike.id, children)).toBe(face)
          } else expect(skillFaceAt(beats, cause.id, children)).toBe(face)
          pulses++
        }
      }
    }
    expect(pulses).toBeGreaterThan(50)
  })

  it('une compétence sur le dé tombe un battement après son jet, comme l’élan d’un coup (M10 ; en rafale, VOLLEY_FORFEIT_SNAP)', () => {
    let grouped = 0
    for (const { result, moments } of corpus) {
      const children = childrenOf(result.beats)
      for (const beat of result.beats) {
        if (beat.type !== 'attack' || !beat.attack.replaced || beat.attack.preset) continue
        const face = skillFaceAt(result.beats, beat.id, children)
        // Avec une relique du dé, la compétence suit la lecture de la relique, sans battement de plus (M40)
        if (face === undefined || children[beat.id].some(playedWithDie)) continue
        const m = momentOf(moments, beat.id)
        const pulse = m.cues.find((c) => c.channel === 'skillPulse' && c.face === face)!
        const when = pulse.at + (beat.cause !== undefined && result.beats[beat.cause].type === 'flurry' ? T.VOLLEY_FORFEIT_SNAP : T.DICE_READ)
        expect(m.cues.some((c) => c.at === when && (c.channel === 'signal' || c.channel === 'aura' || c.channel === 'float'))).toBe(true)
        grouped++
      }
    }
    expect(grouped).toBeGreaterThan(50)
  })

  it('les réactions au coup partent au milieu de sa lecture ; le coup s’efface avant l’élan de la Riposte (M17)', () => {
    let reactions = 0
    let riposted = 0
    for (const { result, moments } of corpus) {
      const children = childrenOf(result.beats)
      for (const hit of result.beats) {
        if (hit.type !== 'attack' || hit.attack.replaced) continue
        const striker = hit.attack.attacker
        // Une relique du dé est déjà partie avec le dé posé (M40)
        const first = children[hit.id].find((b) => (b.type === 'relic' && !playedWithDie(b)) || (b.type === 'statusReaction' && b.effects.length > 0 && b.side !== striker && b.status !== 'bleed'))
        if (!first) continue
        const m = momentOf(moments, hit.id)
        const impact = impacts(m, result.beats).get(hit.id)!
        const fast = m.cues.some((c) => c.channel === 'strike' && c.at === impact && c.strike?.fast)
        const flow = children[hit.id].some((b) => b.type === 'statusReaction' && b.status === 'bleed' && b.side !== striker && !fatalAfterReaction(result.beats, b))
        const start = impact + (flow ? T.BLEED_DELAY : 0) + (fast ? T.VOLLEY_REACTION_LEAD : T.REACTION_LEAD)
        // Une réaction refusée (Épines contre une immunité) n'a que son texte neutre (M25)
        const starts = ['signal', 'aura', 'special', 'relicPulse', 'float']
        expect(m.cues.some((c) => c.at === start && starts.includes(c.channel)), `réaction ${first.id}`).toBe(true)
        if (first.type === 'statusReaction' && STATUSES[first.status].reflectsHit) {
          const k = m.cues.findIndex((c) => c.channel === 'blow' && c.blow && !c.blow.landed && c.at >= start)
          const before = m.cues.slice(0, k).filter((c) => c.channel === 'strike').at(-1)
          expect(before?.channel === 'strike' && before.strike).toBeNull()
          riposted++
        }
        reactions++
      }
    }
    expect(reactions).toBeGreaterThan(100)
    expect(riposted).toBeGreaterThan(20)
  })

  it('le Vol de vie rend ses PV à l’impact du coup, avec son label (M14)', () => {
    let drains = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'statusReaction' || !STATUSES[beat.status].drainsHit || beat.cause === undefined) continue
        const m = momentOf(moments, beat.id)
        const impact = impacts(m, result.beats).get(beat.cause)!
        const texts = at(m, 'float', impact).flatMap((c) => (c.channel === 'float' && c.float.kind === 'badge' ? [c.float.badge.text] : []))
        for (const e of beat.effects) expect(texts).toContain(effectBadge(e).text)
        expect(at(m, 'special', impact).some((c) => c.channel === 'special' && c.special.label.startsWith(STATUSES[beat.status].name))).toBe(true)
        drains++
      }
    expect(drains).toBeGreaterThan(20)
  })

  it('une étape montre ses changements de statuts à son instant : la charge de Riposte part avec la Riposte, même quand la jauge du coup s’affiche avant (M3)', () => {
    let held = 0
    for (const { result, moments } of corpus) {
      const children = childrenOf(result.beats)
      for (const hit of result.beats) {
        if (hit.type !== 'attack') continue
        const riposte = children[hit.id].find((b) => b.type === 'statusReaction' && STATUSES[b.status].reflectsHit)
        if (riposte?.type !== 'statusReaction') continue
        const m = momentOf(moments, hit.id)
        const find = (statuses: Status[]) => statuses.find((s) => s.id === riposte.status)
        const impact = impacts(m, result.beats).get(hit.id)!
        // À l'impact, la jauge de Rétribution (une étape après la Riposte) est déjà montrée, la charge pas encore partie
        const atImpact = at(m, 'statuses', impact).at(-1)
        if (atImpact?.channel === 'statuses') {
          expect(find(atImpact.statuses[riposte.side])).toEqual(find(result.beats[riposte.id - 1].state.statuses[riposte.side]))
          held++
        }
        // Au retour du coup de la Riposte, la charge est consommée
        const back = m.cues.find((c) => c.channel === 'blow' && c.blow?.landed && c.blow.to === hit.attack.attacker && c.at > impact)!
        const atBack = at(m, 'statuses', back.at).at(-1)
        expect(atBack?.channel === 'statuses' && find(atBack.statuses[riposte.side])).toEqual(find(riposte.state.statuses[riposte.side]) ?? undefined)
      }
    }
    expect(held).toBeGreaterThan(20)
  })

  it('ce qu’une compétence à dégâts directs pose sur sa cible tombe avec son dernier coup, textes et zone d’état ensemble (M21)', () => {
    const venom = { id: 'venom', name: 'Venin', trigger: 'naturalOne' as const, forfeitsHit: true, effects: [
      { type: 'damage' as const, amount: 3, target: 'opponent' as const, source: 'strike' as const },
      { type: 'applyStatus' as const, status: 'poison' as const, stacks: 2, target: 'opponent' as const },
    ] }
    const result = simulateCombat([testCharacter('a', { maxHp: 60 }, [venom]), testCharacter('b', { maxHp: 60 })], { seed: 1 })
    const moments = stage(result)
    let cast = 0
    for (const beat of result.beats) {
      if (beat.type !== 'event' || beat.event.eventId !== 'venom') continue
      const m = momentOf(moments, beat.id)
      const landed = m.cues.filter((c) => c.channel === 'blow' && c.blow?.landed).at(-1)!
      const poison = m.cues.filter((c) => c.channel === 'float' && c.float.kind === 'badge' && c.float.badge.text === STATUSES.poison.name)
      expect(poison.map((c) => c.at)).toEqual([landed.at])
      const shown = at(m, 'statuses', landed.at).at(-1)
      expect(shown?.channel === 'statuses' && shown.statuses[1].some((s) => s.id === 'poison')).toBe(true)
      cast++
    }
    expect(cast).toBeGreaterThan(3)
  })

  it('les dégâts d’un statut qui agit ont la teinte de leur source : Poison en vert, Brûlure en mauve, la plaie en rouge (M37)', () => {
    const tones = new Map<string, Set<string>>()
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'statusTick' && beat.type !== 'statusReaction') continue
        const status = beat.status
        if (!beat.effects.some((e) => e.type === 'damage' && e.target === beat.side)) continue
        const m = momentOf(moments, beat.id)
        const hurt = m.cues.filter((c) => c.channel === 'float' && c.side === beat.side && c.float.kind === 'badge' && c.float.badge.text.startsWith('-'))
        for (const c of hurt) if (c.channel === 'float' && c.float.kind === 'badge') tones.set(status, (tones.get(status) ?? new Set()).add(c.float.badge.tone))
      }
    expect(tones.get('poison')).toEqual(new Set(['poison']))
    expect(tones.get('burn')).toEqual(new Set(['arcane']))
    expect(tones.get('bleed')).toEqual(new Set(['damage']))
  })

  it('le coup de base de tous est un coup blanc ; un coup de compétence ou de relique a la teinte de sa source, la Foudre en cyan (M37, 2026-10-24)', () => {
    const tones = new Map<DamageSource | 'base', Set<string>>()
    for (const { moments } of corpus)
      for (const m of moments)
        m.cues.forEach((c, i) => {
          const hit = c.channel === 'strike' ? c.strike : c.channel === 'blow' ? c.blow : null
          if (!hit?.landed) return
          // Le chiffre part avec l'impact, juste après lui
          const float = m.cues[i + 1]
          expect(float.channel === 'float' && float.float.kind === 'hit').toBe(true)
          const key = 'source' in hit ? hit.source : 'base'
          if (float.channel === 'float' && float.float.kind === 'hit' && !float.float.dodged) tones.set(key, (tones.get(key) ?? new Set()).add(float.float.tone))
        })
    for (const [source, seen] of tones) expect(seen, source).toEqual(new Set([source === 'base' ? 'hit' : DAMAGE_SOURCES[source].tone]))
    expect(tones.get('base')).toEqual(new Set(['hit']))
    expect(tones.get('lightning')).toEqual(new Set(['storm']))
  })

  it('combat test : un point d’attente avant chaque étape qui lance des dés, sans initiative animée', () => {
    const { result } = corpus[7]
    const moments = stage(result, { test: true })
    expect(moments[0].duration).toBe(0)
    const marks = moments.flatMap((m) => m.rolls)
    // Chaque dé lancé a son point : la pièce, le jet greffé (étape `roll`), le coup qui lance son dé. Une rafale (les deux
    // dés de la barde comprise) annonce tous ses dés d'un coup, même si le K.O. arrête ses coups avant la fin
    const dice = result.beats.reduce((n, b) => n + (b.type === 'coin' || b.type === 'roll' || (b.type === 'attack' && !b.attack.preset) ? 1 : 0), 0)
    const flurries = result.beats.reduce((n, b) => n + (b.type === 'flurry' ? b.strikes : 0), 0)
    expect(Math.max(...marks.map((r) => r.upTo))).toBeGreaterThanOrEqual(dice)
    expect(Math.max(...marks.map((r) => r.upTo))).toBeLessThanOrEqual(dice + flurries)
    for (const m of moments) expect(m.rolls.map((r) => r.at)).toEqual(m.rolls.map((r) => r.at).sort((p, q) => p - q))
  })

  it('une relique causée par ce que le coup produit est une réaction au coup : l’Encens tombe au milieu de sa lecture (M17)', () => {
    let carried = 0
    for (const { result, moments } of relicCorpus) {
      const children = childrenOf(result.beats)
      for (const beat of result.beats) {
        if (beat.type !== 'relic' || beat.cause === undefined) continue
        const ride = result.beats[beat.cause]
        const hit = ride.cause === undefined ? undefined : result.beats[ride.cause]
        if (ride.type !== 'statusReaction' || hit?.type !== 'attack' || hit.attack.replaced) continue
        const striker = hit.attack.attacker
        // Première réaction du coup dans l'ordre du moteur (aucune réaction directe avant elle)
        const earlier = children[hit.id].some(
          (b) => b.id < beat.id && (b.type === 'relic' || (b.type === 'statusReaction' && b.side !== striker && b.effects.length > 0) || (b.type === 'event' && rollFace(b.event.trigger) === undefined)),
        )
        if (earlier) continue
        const m = momentOf(moments, beat.id)
        const impact = impacts(m, result.beats).get(hit.id)!
        const fast = m.cues.some((c) => c.channel === 'strike' && c.at === impact && c.strike?.fast)
        const flow = children[hit.id].some((b) => b.type === 'statusReaction' && b.status === 'bleed' && b.side !== striker && b.effects.some((e) => e.type === 'damage'))
        const start = impact + (flow ? T.BLEED_DELAY : 0) + (fast ? T.VOLLEY_REACTION_LEAD : T.REACTION_LEAD)
        const pulse = m.cues.find((c) => c.channel === 'relicPulse' && c.relics.includes(beat.relic) && c.at >= impact)
        expect(pulse?.at, `${beat.relic} ${beat.id}`).toBe(start)
        carried++
      }
    }
    expect(carried).toBeGreaterThan(5)
  })

  it('« Rien à purifier » ne s’affiche que si la purge est le seul effet de son étape (M38)', () => {
    let quieted = 0
    for (const { result, moments } of [...corpus, ...relicCorpus])
      for (const m of moments) {
        const effects = m.beats.map((id) => result.beats[id]).map((b) => (b.type === 'event' ? b.event.effects : b.type === 'relic' ? b.effects : []))
        const empty = (e: AppliedEffect) => e.type === 'cleanse' && e.removed.length === 0
        const alone = effects.filter((list) => list.length > 0 && list.every(empty)).length
        quieted += effects.filter((list) => list.some(empty) && !list.every(empty)).length
        const shown = m.cues.filter((c) => c.channel === 'float' && c.float.kind === 'badge' && c.float.badge.text === 'Rien à purifier').length
        expect(shown).toBeLessThanOrEqual(alone)
      }
    expect(quieted).toBeGreaterThan(10)
  })

  it('une étape qui ne change rien n’active rien : ni aura, ni signal, ni label, ni son, seulement son texte neutre (M25)', () => {
    const seen = { reposed: 0, refused: 0 }
    for (const { result, moments } of [...corpus, ...relicCorpus])
      for (const beat of result.beats) {
        const effects = beat.type === 'event' ? beat.event.effects : beat.type === 'statusReaction' || beat.type === 'relic' ? beat.effects : []
        if (!changesNothing(result.beats, beat, effects)) continue
        // Un statut reposé tel quel se lit comme une pose au plafond : « … au maximum »
        const shown = effects
          .filter((e) => e.type !== 'cleanse')
          .map((e) => effectBadge(e.type === 'applyStatus' && e.result.kind === 'applied' ? { ...e, result: { kind: 'applied', stacks: 0 } } : e).text)
        if (shown.length === 0) continue
        const m = momentOf(moments, beat.id)
        const instants = new Set(m.cues.flatMap((c) => (c.channel === 'float' && c.float.kind === 'badge' && shown.includes(c.float.badge.text) ? [c.at] : [])))
        expect(instants.size, `${beat.type} ${beat.id}`).toBeGreaterThan(0)
        for (const when of instants) {
          // Une étape portée par le coup (poison résisté) tombe à son impact, avec le son et les labels du coup : seul
          // son propre label y est interdit
          const atImpact = m.cues.some((c) => c.at === when && (c.channel === 'strike' || c.channel === 'blow'))
          // Deux reliques d'une rafale (le Duo de la barde) atterrissent au même instant : le son de la première n'est pas le
          // sien
          if (beat.type === 'relic' && m.cues.some((c) => c.at === when && c.channel === 'relicUse' && c.uses !== beat.uses)) continue
          const name = beat.type === 'statusReaction' ? STATUSES[beat.status].name : beat.type === 'relic' ? beat.name : undefined
          const busy = m.cues.filter((c) =>
            c.at !== when
              ? false
              : atImpact
                ? c.channel === 'special' && name !== undefined && c.special.label.startsWith(name)
                : c.channel === 'sound' || c.channel === 'special' || c.channel === 'signal' || (c.channel === 'aura' && !!c.fx),
          )
          expect(busy, `${beat.type} ${beat.id}`).toEqual([])
        }
        if (effects.some((e) => e.type === 'applyStatus' && e.result.kind === 'applied' && e.result.stacks > 0)) seen.reposed++
        if (beat.type === 'statusReaction' && effects.some((e) => e.type === 'applyStatus' && e.result.kind === 'blocked')) seen.refused++
      }
    // L'Aura de puissance reposée (Ervald, gravée) ; les Épines contre l'Aura d'immunité gravée sur Gorak
    expect(seen.reposed).toBeGreaterThan(5)
    expect(seen.refused).toBeGreaterThan(0)
  })

  it('relique du défenseur : + et le ding pour un bonus de son porteur, − et Malus reçu pour un contre (M23, SONS § 4.4)', () => {
    const signs = { plus: 0, minus: 0 }
    for (const { result, moments } of relicCorpus)
      for (const beat of result.beats) {
        if (beat.type !== 'relic' || beat.side === beat.owner) continue
        const m = momentOf(moments, beat.id)
        const label = m.cues.find((c) => c.channel === 'special' && c.special.source === 'relic' && c.special.label === beat.name)
        if (label?.channel !== 'special') continue
        const counters = beat.effects.some((e) => e.type === 'damage' && e.amount > 0)
        expect(label.special.sign, beat.relic).toBe(counters ? 'minus' : 'plus')
        const cue = counters ? 'debuff' : 'coinWin'
        expect(at(m, 'sound', label.at).some((c) => c.channel === 'sound' && c.cue === cue), beat.relic).toBe(true)
        signs[label.special.sign]++
      }
    expect(signs.plus).toBeGreaterThan(20)
    expect(signs.minus).toBeGreaterThan(3)
  })

  it('pile ou face : la compétence tombe muette avec l’impact, la pièce part au repos du coup (M26)', () => {
    let tossed = 0
    for (const { result, moments } of corpus) {
      const children = childrenOf(result.beats)
      for (const coin of result.beats) {
        if (coin.type !== 'coin' || coin.cause === undefined) continue
        const skill = result.beats[coin.cause]
        const hit = skill.cause === undefined ? undefined : result.beats[skill.cause]
        if (skill.type !== 'event' || hit?.type !== 'attack') continue
        const m = momentOf(moments, coin.id)
        const impact = impacts(m, result.beats).get(hit.id)!
        // Son journal tombe à l'impact ; ni son nom ni Bonus gagné (M39)
        expect(at(m, 'log', impact).some((c) => c.channel === 'log' && c.entry.text.startsWith(`Compétence · ${skill.event.name}`))).toBe(true)
        expect(m.cues.some((c) => c.channel === 'float' && ((c.float.kind === 'badge' && c.float.badge.text === skill.event.name) || (c.float.kind === 'title' && c.float.text === skill.event.name)))).toBe(false)
        // Un coup sans réaction : la pièce part au terme de sa lecture et de son repos (un renvoi esquivé, C1, est une réaction)
        const reacted = children[hit.id].some((b) => b.type === 'relic' || (b.type === 'statusReaction' && b.side !== hit.attack.attacker && (b.effects.length > 0 || !!b.strike)))
        if (reacted) continue
        const toss = m.cues.find((c) => c.channel === 'dice' && c.dice.coin && c.dice.coin.heads === undefined)!
        expect(toss.at - impact).toBe(T.STRIKE_HOLD + T.STRIKE_REST)
        tossed++
      }
    }
    expect(tossed).toBeGreaterThan(10)
  })

  it('un mécanisme de compétence posé ne sonne pas et ne flotte pas (M39)', () => {
    let posed = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'event' || beat.event.effects.length === 0) continue
        if (!beat.event.effects.every((e) => e.type === 'applyStatus' && STATUSES[e.status].mechanic)) continue
        const m = momentOf(moments, beat.id)
        const names = beat.event.effects.flatMap((e) => (e.type === 'applyStatus' ? [STATUSES[e.status].name] : []))
        expect(m.cues.some((c) => c.channel === 'float' && c.float.kind !== 'hit' && names.includes(c.float.kind === 'badge' ? c.float.badge.text : c.float.text))).toBe(false)
        const logged = m.cues.find((c) => c.channel === 'log' && c.entry.text.startsWith(`Compétence · ${beat.event.name}`))!
        expect(at(m, 'sound', logged.at).some((c) => c.channel === 'sound' && c.cue === 'buff')).toBe(false)
        posed++
      }
    expect(posed).toBeGreaterThan(20)
  })

  it('Foudre : chaque éclair sonne le Coup critique, le son de l’éclair gardé par l’utilisateur (M24, SONS § 3)', () => {
    let bolts = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'event' || beat.event.eventId !== 'thunderbolt') continue
        const m = momentOf(moments, beat.id)
        const scene = m.cues.find((c) => c.channel === 'scene')!
        for (const blow of m.cues.filter((c) => c.channel === 'blow' && c.blow?.landed && c.at < scene.at + SCENE_EVENTS.lightning.length)) {
          const sounds = at(m, 'sound', blow.at).flatMap((c) => (c.channel === 'sound' ? [c.cue] : []))
          expect(sounds).toContain('crit')
          bolts++
        }
      }
    expect(bolts).toBeGreaterThan(15)
  })

  it('Furie sur le premier jet d’une rafale (Coup de chance) : ses coups, puis le jet suivant, sans nouveau roulement (M27)', () => {
    const lucky = ENGRAVABLE_SKILLS.find((e) => e.id === 'lucky-strike')!
    let nested = 0
    for (const y of CHARACTER_IDS)
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        // Gorak : la Furie sur son 1, Coup de chance gravé sur son 3
        const result = simulateCombat([createCharacter('gorak').withForge([{ op: 'engrave', face: 3, skill: lucky }]), createCharacter(y)], { seed })
        const moments = stage(result)
        const children = childrenOf(result.beats)
        for (const outer of result.beats) {
          if (outer.type !== 'flurry' || outer.status !== 'luckyStrike') continue
          const strikes = children[outer.id].flatMap((b) => (b.type === 'roll' ? children[b.id] : [b])).filter((b) => b.type === 'attack')
          const inner = result.beats.find((b) => b.type === 'flurry' && b.status === 'windFury' && b.cause !== undefined && result.beats[b.cause].cause === strikes[0]?.id)
          if (!inner || strikes.length < 2) continue
          const m = momentOf(moments, outer.id)
          // Un seul roulement pour toute l'action
          expect(m.cues.filter((c) => c.channel === 'dice' && c.dice.rolling)).toHaveLength(1)
          // Après le dernier coup de la Furie, les dés de la rafale reviennent tels quels
          const furyStrikes = children[inner.id].filter((b) => b.type === 'attack')
          const lastFury = impacts(m, result.beats).get(furyStrikes[furyStrikes.length - 1].id)!
          const values = strikes.map((b) => (b.type === 'attack' ? b.attack.roll : 0))
          expect(m.cues.some((c) => c.channel === 'dice' && c.at > lastFury && !c.dice.rolling && c.dice.values.join() === values.join())).toBe(true)
          nested++
        }
      }
    expect(nested).toBeGreaterThan(3)
  })

  it('une relique du dé part avec le dé posé : sceau et label avec lui, ses effets avant l’élan du coup (M40, retour du 2026-10-24)', () => {
    const fired = new Map<string, number>()
    for (const { result, moments } of [...corpus, ...relicCorpus]) {
      const children = childrenOf(result.beats)
      for (const relic of result.beats) {
        if (relic.type !== 'relic' || !playedWithDie(relic)) continue
        const hit = result.beats[relic.cause!]
        if (hit.type !== 'attack' || children[hit.id].find(playedWithDie) !== relic) continue
        const m = momentOf(moments, relic.id)
        // Le sceau et le label tombent à l'instant où le dé montre sa valeur : posé, ou ressorti dans une rafale
        const pulse = m.cues.find((c) => c.channel === 'relicPulse' && c.relics.includes(relic.relic))!
        expect(m.cues.some((c) => c.channel === 'dice' && c.at === pulse.at && !c.dice.rolling && c.dice.values.includes(hit.attack.roll))).toBe(true)
        const still = changesNothing(result.beats, relic, relic.effects)
        if (!still) expect(at(m, 'special', pulse.at).some((c) => c.channel === 'special' && c.special.source === 'relic')).toBe(true)
        // Ses effets (ses dégâts, le statut qu'elle pose) tombent avant l'élan : à l'impact, ils sont déjà là
        const use = m.cues.find((c) => c.channel === 'relicUse' && c.relic === relic.relic && c.uses === relic.uses)!
        if (!hit.attack.replaced) {
          const impact = impacts(m, result.beats).get(hit.id)!
          const wind = m.cues.filter((c) => c.channel === 'strike' && c.strike && !c.strike.landed && c.at < impact).at(-1)!
          expect(use.at, relic.relic).toBeLessThanOrEqual(wind.at)
          const shown = m.cues.filter((c) => c.channel === 'statuses' && c.at < impact).at(-1)
          for (const e of still ? [] : relic.effects)
            if (e.type === 'applyStatus' && e.result.kind === 'applied') expect(shown?.channel === 'statuses' && shown.statuses[e.target].some((s) => s.id === e.status)).toBe(true)
        }
        fired.set(relic.relic, (fired.get(relic.relic) ?? 0) + 1)
      }
    }
    expect(fired.get('split-knucklebone')).toBeGreaterThan(5)
    expect(fired.get('hollow-die')).toBeGreaterThan(5)
  })

  it('une relique qui pose un statut envoie son signal de son sceau : sceau et label au départ, le statut à l’arrivée (M19, M23)', () => {
    let signals = 0
    for (const { result, moments } of relicCorpus)
      for (const relic of result.beats) {
        if (relic.type !== 'relic' || RELICS.find((r) => r.id === relic.relic)?.scene) continue
        if (changesNothing(result.beats, relic, relic.effects) || !signalTargets(relic.effects)) continue
        const m = momentOf(moments, relic.id)
        const use = m.cues.find((c) => c.channel === 'relicUse' && c.relic === relic.relic && c.uses === relic.uses)!
        const depart = use.at - T.SIGNAL
        expect(at(m, 'signal', depart).some((c) => c.channel === 'signal' && c.signal.side === relic.side && c.signal.from === relicSignal(relic.relic))).toBe(true)
        expect(at(m, 'relicPulse', depart).some((c) => c.channel === 'relicPulse' && c.relics.includes(relic.relic))).toBe(true)
        // Le même label encore à l'écran (deux Dards de guêpe sur les dés d'une rafale, joués à leur atterrissage) reste,
        // sans nouvelle apparition (M9) : posé avant le départ, et aucun effacement ne l'a retiré depuis (une rafale de la
        // barde, ses réactions comprises, peut le garder plus longtemps que `LABEL_READ`)
        const label = m.cues.filter((c) => c.channel === 'special' && c.special.source === 'relic' && c.at <= depart).at(-1)
        const cleared = label && m.cues.some((c) => c.channel === 'specialsClear' && c.at > label.at && c.at <= depart && (!c.labels || (label.channel === 'special' && c.labels.includes(label.special.label))))
        expect(!!label && !cleared, `${relic.relic}, étape ${relic.id}`).toBe(true)
        // Le statut n'apparaît qu'à l'arrivée du signal
        const shown = at(m, 'statuses', use.at).at(-1)
        for (const e of relic.effects)
          if (e.type === 'applyStatus' && e.result.kind === 'applied') expect(shown?.channel === 'statuses' && shown.statuses[e.target].some((s) => s.id === e.status)).toBe(true)
        signals++
      }
    expect(signals).toBeGreaterThan(50)
  })

  it('Critique assuré, puis le coup critique, puis le Trophée du chasseur : 1 → 0 à l’impact, un nouveau à l’arrivée de son signal (retour du 2026-10-24, Elaria contre Ervald ; une charge, B8)', () => {
    const eye = { id: 'eye', name: 'Œil', nature: 'finesse' as const, trigger: 'naturalThree' as const, effects: [{ type: 'applyStatus' as const, status: 'guaranteedCrit' as const, stacks: 1 }] }
    const trophy = RELICS.find((r) => r.id === 'hunter-trophy')!
    const crit = (c: Cue) => (c.channel === 'statuses' ? (c.statuses[0].find((s) => s.id === 'guaranteedCrit')?.stacks ?? 0) : undefined)
    let seen = 0
    for (const seed of [1, 2, 3, 4]) {
      const fighters: Pair<Character> = [testCharacter('a', { attackMin: 4, attackMax: 4 }, [eye]).withRelics([trophy]), testCharacter('b', { maxHp: 10 })]
      const result = simulateCombat(fighters, { seed, forcedRolls: everyDie(3) })
      const moments = stage(result)
      for (const relic of result.beats) {
        if (relic.type !== 'relic' || relic.relic !== trophy.id) continue
        const hit = result.beats[relic.cause!]
        if (hit.type !== 'attack' || !hit.attack.crit) continue
        const m = momentOf(moments, hit.id)
        const impact = impacts(m, result.beats).get(hit.id)!
        const shown = m.cues.filter((c) => c.channel === 'statuses')
        // Le statut gagné arrive (son signal), puis le coup qui en profite
        const wind = m.cues.find((c) => c.channel === 'strike' && c.strike && !c.strike.landed)!
        const gained = shown.find((c) => crit(c) === 1)!
        expect(m.cues.some((c) => c.channel === 'signal' && c.signal.from === 'eye' && c.at === gained.at - T.SIGNAL)).toBe(true)
        expect(gained.at).toBeLessThan(wind.at)
        // Sa charge part à l'impact du coup critique
        expect(crit(at(m, 'statuses', impact).at(-1)!)).toBe(0)
        // Le Trophée part au milieu de la lecture du coup, son signal rend la charge à son arrivée
        const depart = impact + T.REACTION_LEAD
        expect(at(m, 'signal', depart).some((c) => c.channel === 'signal' && c.signal.from === relicSignal(trophy.id))).toBe(true)
        expect(at(m, 'relicPulse', depart)).toHaveLength(1)
        const arrival = depart + T.SIGNAL
        expect(crit(at(m, 'statuses', arrival).at(-1)!)).toBe(1)
        // Entre les deux, rien ne bouge : la perte se voit avant le gain
        expect(shown.filter((c) => c.at > impact && c.at < arrival).map(crit)).toEqual([])
        seen++
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('Furie des vents contre Épines : les Épines tombent à chaque impact, la rafale garde son rythme (M17 bis, retour du 2026-10-24)', () => {
    const fury = { id: 'fury', name: 'Furie', nature: 'martial' as const, trigger: 'naturalTwo' as const, relation: 'replace' as const, effects: [{ type: 'applyStatus' as const, status: 'windFury' as const, stacks: 1 }] }
    const spikes = { id: 'spikes', name: 'Épines', nature: 'martial' as const, trigger: 'combatStart' as const, effects: [{ type: 'applyStatus' as const, status: 'thorns' as const, stacks: 1 }] }
    let volleys = 0
    for (const seed of [1, 2]) {
      const result = simulateCombat([testCharacter('a', { maxHp: 60 }, [fury]), testCharacter('b', { maxHp: 60 }, [spikes])], { seed, forcedRolls: everyDie(2) })
      const moments = stage(result)
      const children = childrenOf(result.beats)
      for (const flurry of result.beats) {
        if (flurry.type !== 'flurry') continue
        const strikes = children[flurry.id].filter((b) => b.type === 'attack')
        if (strikes.length < 2) continue
        const m = momentOf(moments, flurry.id)
        const hits = impacts(m, result.beats)
        strikes.forEach((strike, k) => {
          const impact = hits.get(strike.id)!
          const thorns = children[strike.id].find((b) => b.type === 'statusReaction' && b.status === 'thorns')
          expect(thorns, `Épines au coup ${k + 1}`).toBeDefined()
          // Le Saignement posé tombe au milieu de la lecture du coup, sans s'attarder ; l'Aura d'épines (une aura depuis la
          // revue X1, 0.118.1) n'a pas de label sous le dé, ni de vol de signal en rafale (M17 bis)
          const react = impact + T.VOLLEY_REACTION_LEAD
          expect(at(m, 'special', react).some((c) => c.channel === 'special' && c.special.label.startsWith(STATUSES.thorns.name))).toBe(false)
          expect(at(m, 'signal', react).some((c) => c.channel === 'signal')).toBe(false)
          const shown = at(m, 'statuses', react).at(-1)
          expect(shown?.channel === 'statuses' && shown.statuses[0].some((s) => s.id === 'bleed')).toBe(true)
          // Le coup suivant part au rythme de la rafale, comme sans Épines
          const next = strikes[k + 1]
          if (!next) return
          const wind = m.cues.find((c) => c.channel === 'strike' && c.strike && !c.strike.landed && c.at > impact)!
          expect(wind.at - impact).toBe(T.VOLLEY_STRIKE_HOLD + T.VOLLEY_GAP)
        })
        volleys++
      }
    }
    expect(volleys).toBeGreaterThan(3)
  })

  it('une compétence qui modifie son coup s’allume avec le dé posé, pas à l’impact (M11, retour du 2026-10-24)', () => {
    let lit = 0
    for (const { result, moments } of corpus) {
      const children = childrenOf(result.beats)
      for (const beat of result.beats) {
        if (beat.type !== 'attack' || beat.attack.replaced || beat.attack.preset) continue
        const face = skillFaceAt(result.beats, beat.id, children)
        if (face === undefined) continue
        const m = momentOf(moments, beat.id)
        const impact = impacts(m, result.beats).get(beat.id)!
        const pulse = m.cues.filter((c) => c.channel === 'skillPulse' && c.face === face && c.at <= impact).at(-1)!
        expect(pulse.at).toBeLessThan(impact)
        expect(m.cues.some((c) => c.channel === 'dice' && c.at === pulse.at && !c.dice.rolling && c.dice.values.includes(beat.attack.roll))).toBe(true)
        lit++
      }
    }
    expect(lit).toBeGreaterThan(50)
  })
})

describe('mise en scène : phase 8, premier lot (0.114.0)', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  /** La compétence gravée sur le 3 d'un personnage de test, chaque dé sur le 3 */
  const engraved = (c: Character, id: string) => c.withForge([{ op: 'engrave', face: 3, skill: skill(id) }])
  const play = (fighters: Pair<Character>, seed = 1) => {
    const result = simulateCombat(fighters, { seed, forcedRolls: everyDie(3) })
    return { result, moments: stage(result) }
  }
  const onTurn = (status: 'bleed' | 'poison' | 'holyAura', target: 'self' | 'opponent' = 'opponent') => ({
    id: status,
    name: status,
    trigger: (status === 'holyAura' ? 'combatStart' : 'turnStart') as 'combatStart' | 'turnStart',
    effects: [{ type: 'applyStatus' as const, status, stacks: 1, ...(status === 'holyAura' ? {} : { target }) }],
  })

  it('Curée : le coup de base de son jet, puis sa rafale au rythme d’une rafale, sans repos entre les deux (M27)', () => {
    const { result, moments } = play([engraved(testCharacter('a', { maxHp: 400 }, [onTurn('bleed')]), 'quarry'), testCharacter('b', { maxHp: 400 })])
    let bursts = 0
    for (const burst of result.beats) {
      if (burst.type !== 'flurry' || burst.status !== 'quarry') continue
      const m = momentOf(moments, burst.id)
      const base = result.beats.find((b) => b.type === 'attack' && b.cause === result.beats[burst.cause!].cause)!
      const impact = impacts(m, result.beats).get(base.id)!
      // Après la lecture du coup de base (la plaie qui coule comprise) : l'écart d'une rafale, ses dés à plat, puis ses coups
      const after = m.spans.filter((s) => s.at >= impact).map((s) => s.name)
      const gap = after.indexOf('VOLLEY_GAP')
      expect(after.slice(gap - 1, gap + 3)).toEqual([after.includes('STRIKE_FLOW_HOLD') ? 'STRIKE_FLOW_HOLD' : 'STRIKE_HOLD', 'VOLLEY_GAP', 'VOLLEY_FLAT', 'VOLLEY_WIND'])
      expect(after).not.toContain('READ_HOLD')
      expect(after.slice(0, -1)).not.toContain('STRIKE_REST')
      // La charge de Curée part avec ses dés
      const flat = m.spans.find((s) => s.name === 'VOLLEY_FLAT')!.at
      const quarry = (c: Cue) => (c.channel === 'statuses' ? c.statuses[0].some((s) => s.id === 'quarry') : undefined)
      expect(m.cues.filter((c) => c.channel === 'statuses' && c.at === flat).map(quarry)).toEqual([false])
      bursts++
    }
    expect(bursts).toBeGreaterThan(3)
  })

  it('Sentence : chaque soin de son porteur la fait réagir au milieu de sa lecture ; son anneau envoie le signal, la perte de PV tombe à son arrivée (M19 bis, M41)', () => {
    const { result, moments } = play([engraved(testCharacter('a', { maxHp: 400 }, [onTurn('holyAura')]), 'sentence'), testCharacter('b', { maxHp: 400, attackMin: 4, attackMax: 4 })])
    let reactions = 0
    for (const beat of result.beats) {
      if (beat.type !== 'statusReaction' || beat.status !== 'sentence') continue
      const m = momentOf(moments, beat.id)
      const healed = m.cues.find((c) => c.channel === 'float' && c.side === 0 && c.float.kind === 'badge' && c.float.badge.tone === 'heal')!
      const signal = m.cues.find((c) => c.channel === 'signal' && c.signal.from === 'sentence')!
      expect(signal.at).toBe(healed.at + T.EFFECT_REACTION_LEAD)
      expect(signal.channel === 'signal' && signal.signal.to).toEqual([1])
      const landed = m.cues.find((c) => c.channel === 'blow' && c.blow?.landed)!
      expect(landed.at).toBe(signal.at + T.SIGNAL + T.BLOW_WIND_REACTION)
      expect(landed.channel === 'blow' && landed.blow).toMatchObject({ from: 0, to: 1, source: 'holy', lunge: false })
      // Une aura ne flotte pas son nom : son anneau s'allume (M32)
      expect(m.cues.some((c) => c.channel === 'float' && c.float.kind === 'title')).toBe(false)
      reactions++
    }
    expect(reactions).toBeGreaterThan(5)
  })

  it('Rancune : au coup encaissé, son label + et le Critique assuré au milieu de la lecture ; la charge part à l’impact du coup critique (SONS § 4.4)', () => {
    const { result, moments } = play([engraved(testCharacter('a', { maxHp: 400 }), 'grudge'), testCharacter('b', { maxHp: 400 })])
    let grudges = 0
    for (const beat of result.beats) {
      if (beat.type !== 'statusReaction' || beat.status !== 'grudge') continue
      const m = momentOf(moments, beat.id)
      const impact = impacts(m, result.beats).get(beat.cause!)!
      const label = m.cues.find((c) => c.channel === 'special' && c.special.label === 'Rancune')!
      expect(label.at).toBe(impact + T.REACTION_LEAD)
      expect(label.channel === 'special' && label.special.sign).toBe('plus')
      // Le Critique assuré posé sonne sa famille, la Précision (SONS règle 4, 2026-10-25 ; Bonus gagné avant)
      expect(at(m, 'sound', label.at).map((c) => c.channel === 'sound' && c.cue)).toEqual(expect.arrayContaining(['coinWin', 'precisionUp']))
      expect(at(m, 'sound', label.at).map((c) => c.channel === 'sound' && c.cue)).not.toContain('debuff')
      // Son prochain coup critique use le Critique assuré à son impact, pas avant
      const crit = result.beats.find((b): b is Extract<Beat, { type: 'attack' }> => b.type === 'attack' && b.id > beat.id && b.attack.attacker === 0 && b.attack.critForced)
      if (!crit) continue
      const next = momentOf(moments, crit.id)
      const hit = impacts(next, result.beats).get(crit.id)!
      const held = (c: Cue) => c.channel === 'statuses' && !c.statuses[0].some((s) => s.id === 'guaranteedCrit')
      expect(next.cues.find(held)!.at).toBe(hit)
      grudges++
    }
    expect(grudges).toBeGreaterThan(3)
  })

  it('Virulence : le Poison monte au compteur à l’arrivée du signal, avec son gain en clair (« +10 Poison », M42)', () => {
    const { result, moments } = play([engraved(testCharacter('a', { maxHp: 2000 }, [onTurn('poison')]), 'virulence'), testCharacter('b', { maxHp: 2000 })])
    let fired = 0
    for (const beat of result.beats) {
      if (beat.type !== 'event' || beat.event.eventId !== 'virulence') continue
      const m = momentOf(moments, beat.id)
      const signal = m.cues.find((c) => c.channel === 'signal' && c.signal.from === 'virulence')!
      const arrival = signal.at + T.SIGNAL
      const posed = beat.event.effects[0]
      if (posed.type !== 'applyStatus' || posed.result.kind !== 'applied') continue
      const gain = `+${posed.result.stacks} Poison`
      expect(at(m, 'float', arrival).some((c) => c.channel === 'float' && c.side === 1 && c.float.kind === 'badge' && c.float.badge.text === gain)).toBe(true)
      const count = at(m, 'statuses', arrival).map((c) => (c.channel === 'statuses' ? c.statuses[1].find((s) => s.id === 'poison')?.stacks : undefined))
      expect(count).toEqual([beat.state.statuses[1].find((s) => s.id === 'poison')!.stacks])
      fired++
    }
    expect(fired).toBeGreaterThan(3)
  })
})

describe('mise en scène : phase 8, second lot', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  /** Un personnage du roster (sur son dé de la 0.120.0, `onOldDie`), la compétence gravée sur son 3 ; des combats à graine contre chacun */
  const fights = (id: string, engrave: string | null, relics: string[] = []) =>
    CHARACTER_IDS.flatMap((y) =>
      [1, 2, 3].map((seed) => {
        const c = onOldDie(id).withForge(engrave ? [{ op: 'engrave', face: 3, skill: skill(engrave) }] : []).withRelics(relics.map((r) => RELICS.find((x) => x.id === r)!))
        const result = simulateCombat([c, onOldDie(y)], { seed })
        return { result, moments: stage(result) }
      }),
    )
  const relicOn = (b: Beat, on: string) => {
    const trigger = b.type === 'relic' ? RELICS.find((r) => r.id === b.relic)?.trigger : undefined
    return trigger?.type === 'strike' && trigger.on === on
  }

  it('ce que décide la pièce part avec elle : une relique de pile tombe avec le résultat, avant le coup de pile (M40, M26)', () => {
    let fired = 0
    for (const { result, moments } of fights('naraxes', null, ['holed-coin']))
      for (const relic of result.beats) {
        if (!relicOn(relic, 'heads') || relic.type !== 'relic') continue
        const m = momentOf(moments, relic.id)
        const landed = m.cues.find((c) => c.channel === 'sound' && c.cue === 'coinLand')!
        const lit = m.cues.find((c) => c.channel === 'relicPulse' && c.relics.includes(relic.relic))!
        const blow = m.cues.find((c) => c.channel === 'blow' && c.blow && !c.blow.landed)
        expect(lit.at).toBe(landed.at)
        if (blow) expect(blow.at).toBeGreaterThan(lit.at)
        fired++
      }
    expect(fired).toBeGreaterThan(3)
  })

  it('Vindicte : son anneau répond au renvoi au milieu de la lecture de son dernier coup (M41)', () => {
    let answered = 0
    for (const { result, moments } of fights('aldric', 'vendetta'))
      for (const beat of result.beats) {
        if (beat.type !== 'statusReaction' || beat.status !== 'vendetta') continue
        const m = momentOf(moments, beat.id)
        const signal = m.cues.find((c) => c.channel === 'signal' && c.signal.from === 'vendetta')!
        const last = m.cues.filter((c) => c.channel === 'blow' && c.blow?.landed && c.blow.from === beat.side && c.at < signal.at).at(-1)!
        // Au milieu de la lecture de son dernier coup ; en rafale, après sa lecture de coup de rafale (M17 bis)
        expect([T.REACTION_LEAD, T.VOLLEY_STRIKE_HOLD]).toContain(signal.at - last.at)
        answered++
      }
    expect(answered).toBeGreaterThan(3)
  })

  it('Embrasement : le sceau de sa compétence s’allume, la Brûlure part avec son coup, d’un seul tenant (M39)', () => {
    let fired = 0
    for (const { result, moments } of fights('thaldrin', 'conflagration'))
      for (const beat of result.beats) {
        if (beat.type !== 'statusReaction' || beat.status !== 'conflagration') continue
        const m = momentOf(moments, beat.id)
        const blow = m.cues.find((c) => c.channel === 'blow' && c.blow?.landed && c.blow.source === 'burn')!
        const lit = m.cues.filter((c) => c.channel === 'skillPulse' && c.side === beat.side && c.face === 3 && c.at < blow.at)
        expect(lit.length).toBeGreaterThan(0)
        const burning = (c: Cue) => c.channel === 'statuses' && c.statuses[1 - beat.side].some((s) => s.id === 'burn')
        expect(at(m, 'statuses', blow.at).some((c) => !burning(c))).toBe(true)
        expect(m.cues.some((c) => c.channel === 'float' && c.float.kind === 'title')).toBe(false)
        fired++
      }
    expect(fired).toBeGreaterThan(3)
  })
})

describe('mise en scène : phase 8, lot 3 (malus de famille et fils minces)', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  /** Un personnage du roster (sur son dé de la 0.120.0, `onOldDie`), la compétence gravée sur son 3 ; des combats à graine contre chacun */
  const fights = (id: string, engrave: string, seeds = [1, 2, 3]) =>
    CHARACTER_IDS.flatMap((y) =>
      seeds.map((seed) => {
        const result = simulateCombat([onOldDie(id).withForge([{ op: 'engrave', face: 3, skill: skill(engrave) }]), onOldDie(y)], { seed })
        return { result, moments: stage(result) }
      }),
    )
  const sounds = (m: Moment, when: number) => at(m, 'sound', when).map((c) => c.channel === 'sound' && c.cue)
  const badge = (c: Cue, side: number, text: string) => c.channel === 'float' && c.side === side && c.float.kind === 'badge' && c.float.badge.text === text
  const charges = (c: Cue, side: number, id: string) => (c.channel === 'statuses' ? (c.statuses[side].find((s) => s.id === id)?.stacks ?? 0) : undefined)

  it('Malchance : la face s’allume avec le dé, puis le jet tombe à vide un battement après, Tour perdu, sans élan ni chiffre ; la charge part à cet instant (M46)', () => {
    let fizzled = 0
    for (const { result, moments } of fights('naraxes', 'jinx'))
      for (const roll of result.beats) {
        if (roll.type !== 'roll' || !roll.jinxedBy) continue
        const m = momentOf(moments, roll.id)
        const lit = m.cues.find((c) => c.channel === 'skillPulse' && c.side === roll.side && c.face === roll.roll)!
        const told = m.cues.find((c) => badge(c, roll.side, STATUSES.jinx.name) && c.at >= lit.at)!
        expect(told.at).toBe(lit.at + T.DICE_READ)
        expect(sounds(m, told.at)).toContain('stun')
        // Aucun coup : ni élan, ni chiffre, jusqu'à l'étape suivante
        const attack = result.beats.find((b) => b.type === 'attack' && b.cause === roll.id)!
        expect(m.cues.some((c) => c.at >= lit.at && c.at <= told.at + T.READ_HOLD && ((c.channel === 'strike' && c.strike) || (c.channel === 'float' && c.float.kind === 'hit')))).toBe(false)
        // La charge reste jusqu'au jet à vide, part avec lui
        const was = result.beats[roll.id - 1].state.statuses[roll.side].find((s) => s.id === 'jinx')!.stacks
        const shown = m.cues.filter((c) => c.channel === 'statuses' && c.at >= lit.at && c.at <= told.at).map((c) => charges(c, roll.side, 'jinx'))
        expect(shown.at(-1)).toBe(attack.state.statuses[roll.side].find((s) => s.id === 'jinx')?.stacks ?? 0)
        expect(shown.slice(0, -1).every((n) => n === was)).toBe(true)
        expect(m.cues.some((c) => c.channel === 'log' && c.entry.text.includes('tombe à vide'))).toBe(true)
        fizzled++
      }
    expect(fizzled).toBeGreaterThan(3)
  })

  it('Malchance et relique du dé : le dé, puis « Malchance » (sa charge part), puis l’Osselet fendu ; jamais l’état d’après avant le texte (M46)', () => {
    const curse: CharacterEvent = { id: 'curse', name: 'curse', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'jinx', stacks: 3, target: 'opponent' }] }
    const ready: CharacterEvent = { id: 'one', name: 'one', trigger: 'naturalOne', effects: [{ type: 'heal', amount: 1 }] }
    const bone = RELICS.find((r) => r.id === 'split-knucklebone')!
    let seen = 0
    for (const seed of [1, 2, 3]) {
      const result = simulateCombat([testCharacter('a', { maxHp: 400 }, [curse]), testCharacter('b', { maxHp: 400 }, [ready]).withRelics([bone])], { seed, forcedRolls: everyDie(1) })
      const moments = stage(result)
      for (const roll of result.beats) {
        if (roll.type !== 'roll' || !roll.jinxedBy) continue
        const attack = result.beats.find((b) => b.type === 'attack' && b.cause === roll.id)!
        const relic = result.beats.find((b) => b.type === 'relic' && b.relic === bone.id && b.cause === attack.id)
        if (!relic) continue
        const m = momentOf(moments, roll.id)
        const told = m.cues.find((c) => badge(c, roll.side, STATUSES.jinx.name))!
        // L'Osselet part après le texte, d'un temps de lecture
        const pulse = m.cues.find((c) => c.channel === 'relicPulse' && c.relics.includes(bone.id))!
        expect(pulse.at).toBeGreaterThanOrEqual(told.at + T.READ_HOLD)
        // Avant le texte, la zone d'état garde la charge de Malchance
        const was = result.beats[roll.id - 1].state.statuses[roll.side].find((s) => s.id === 'jinx')!.stacks
        const early = m.cues.filter((c) => c.channel === 'statuses' && c.at < told.at).map((c) => charges(c, roll.side, 'jinx'))
        expect(early.every((n) => n === was)).toBe(true)
        seen++
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('Éclair aveuglant : le critique s’annonce, puis rate à l’impact (Esquive, « RATÉ », « Aveuglé »), sans arrêt sur image (M47)', () => {
    let missed = 0
    for (const { result, moments } of fights('thaldrin', 'blinding', [1, 2, 3, 4, 5, 6]))
      for (const hit of result.beats) {
        if (hit.type !== 'attack' || !hit.attack.blindedBy) continue
        const m = momentOf(moments, hit.id)
        const impact = impacts(m, result.beats).get(hit.id)!
        const wind = m.cues.filter((c) => c.channel === 'strike' && c.strike && !c.strike.landed && c.at < impact).at(-1)!
        const told = m.cues.find((c) => c.channel === 'special' && c.special.label.startsWith('Critique') && c.at <= wind.at)
        expect(told).toBeDefined()
        expect(impact - wind.at).toBe(wind.channel === 'strike' && wind.strike?.fast ? T.VOLLEY_WIND : T.WIND)
        expect(sounds(m, impact)).toContain('dodge')
        expect(sounds(m, impact)).not.toContain('crit')
        const attacker = hit.attack.attacker
        expect(at(m, 'float', impact).some((c) => c.channel === 'float' && c.side === 1 - attacker && c.float.kind === 'hit' && c.float.missed)).toBe(true)
        expect(at(m, 'float', impact).some((c) => badge(c, attacker, STATUSES.blinded.name))).toBe(true)
        missed++
      }
    expect(missed).toBeGreaterThan(3)
  })

  it('Hémorragie : le soin empêché montre un « 0 » barré et sonne le malus de Soin, jamais le Soin (SONS § 9.3)', () => {
    let blocked = 0
    for (const { result, moments } of [...fights('gorak', 'hemorrhage', [1, 2, 3, 4, 5, 6]), ...fights('aldric', 'hemorrhage', [1, 2, 3, 4, 5, 6])])
      for (const beat of result.beats) {
        const healed = beatEffects(beat).find((e) => e.type === 'heal' && e.wanted !== undefined && e.amount === 0)
        if (!healed) continue
        const m = momentOf(moments, beat.id)
        const zero = m.cues.find((c) => c.channel === 'float' && c.side === healed.target && c.float.kind === 'badge' && c.float.badge.struck)!
        expect(zero.channel === 'float' && zero.float.kind === 'badge' && zero.float.badge.text).toBe('0')
        const heard = [...sounds(m, zero.at), ...sounds(m, zero.at + T.RIDE_CUE)]
        expect(heard).toContain('healingDown')
        expect(heard).not.toContain('heal')
        blocked++
      }
    expect(blocked).toBeGreaterThan(3)
  })

  it('Confiscation : l’icône du bonus volé file du lanceur vers le voleur ; à son arrivée, « Volé », le bonus chez le voleur et le son du vol (Sceaux −)', () => {
    let stolen = 0
    let late = 0
    for (const { result, moments } of [...fights('aldric', 'seal-theft'), ...fights('ysolde', 'seal-theft')])
      for (const beat of result.beats) {
        if (beat.type !== 'event') continue
        // Un bonus volé que le voleur avait déjà à son plafond ne change rien : rien ne part (M25)
        const taken = beat.event.effects.find((e) => e.type === 'applyStatus' && e.stolenBy !== undefined && e.result.kind === 'applied' && e.result.stacks > 0)
        if (taken?.type !== 'applyStatus') continue
        const m = momentOf(moments, beat.id)
        const signal = m.cues.find((c) => c.channel === 'signal' && c.signal.side === beat.event.side && c.signal.from === beat.event.eventId)!
        // Une aura volée aussi : l'icône file vers le voleur, même sans état à viser
        expect(signal.channel === 'signal' && signal.signal).toMatchObject({ side: beat.event.side, to: expect.arrayContaining([taken.target]), icon: taken.status, polarity: 'negative' })
        const arrival = signal.at + T.SIGNAL
        expect(at(m, 'float', arrival).some((c) => badge(c, beat.event.side, STOLEN_BADGE.text))).toBe(true)
        expect(sounds(m, arrival)).toContain('sealDown')
        expect(at(m, 'statuses', arrival).some((c) => (charges(c, taken.target, taken.status) ?? 0) > 0)).toBe(true)
        // Son coup de base esquivé par le bonus volé : « Esquive assurée » tombe au départ du coup, pas avec le dé
        const base = result.beats.find((b) => b.type === 'attack' && b.cause === beat.cause && b.attack.dodgeBy === taken.status)
        if (base) {
          const dodge = m.cues.find((c) => c.channel === 'special' && c.special.label === 'Esquive assurée')!
          expect(dodge.at).toBeGreaterThanOrEqual(arrival)
          late++
        }
        stolen++
      }
    expect(stolen).toBeGreaterThan(3)
    expect(late).toBeGreaterThan(0)
  })

  it('Brise-garde : le coup ×2 a son label à l’impact, et l’armure temporaire vole en éclats au même instant, pas avant (M48)', () => {
    let shattered = 0
    // Contre une armure temporaire reposée à chaque tour (combat construit, chaque dé sur le 3), et chez ses porteurs
    const armor = { id: 'armor', name: 'armor', trigger: 'turnStart' as const, effects: [{ type: 'applyStatus' as const, status: 'bonusArmor' as const, stacks: 3 }] }
    const built = [1, 2, 3].map((seed) => {
      const a = testCharacter('a', { maxHp: 400, attackMin: 6, attackMax: 6 }).withForge([{ op: 'engrave', face: 3, skill: skill('guard-break') }])
      const result = simulateCombat([a, testCharacter('b', { maxHp: 400 }, [armor])], { seed, forcedRolls: everyDie(3) })
      return { result, moments: stage(result) }
    })
    for (const { result, moments } of [...built, ...fights('morgrut', 'guard-break'), ...fights('brokk', 'guard-break')])
      for (const hit of result.beats) {
        if (hit.type !== 'attack' || !hit.attack.shatteredBy || hit.attack.dodged) continue
        const defender = 1 - hit.attack.attacker
        const armor = result.beats[hit.id - 1].state.statuses[defender].find((s) => STATUSES[s.id].shield)
        if (!armor) continue
        const m = momentOf(moments, hit.id)
        const impact = impacts(m, result.beats).get(hit.id)!
        expect(at(m, 'special', impact).some((c) => c.channel === 'special' && c.special.label.startsWith(STATUSES.guardBreak.name))).toBe(true)
        expect(at(m, 'float', impact).some((c) => badge(c, defender, `${STATUSES[armor.id].name} brisée`))).toBe(true)
        const shown = m.cues.filter((c) => c.channel === 'statuses' && c.at <= impact).map((c) => charges(c, defender, armor.id))
        expect(shown.at(-1)).toBe(0)
        expect(m.cues.filter((c) => c.channel === 'statuses' && c.at < impact).every((c) => charges(c, defender, armor.id) === armor.stacks)).toBe(true)
        shattered++
      }
    expect(shattered).toBeGreaterThan(3)
  })

  it('Feinte : l’esquive fait réagir son anneau au milieu de la lecture du coup ; le Critique assuré arrive avec le signal (Précision +)', () => {
    let dodges = 0
    for (const { result, moments } of fights('naraxes', 'feint'))
      for (const beat of result.beats) {
        if (beat.type !== 'statusReaction' || beat.status !== 'feint') continue
        const m = momentOf(moments, beat.id)
        const signal = m.cues.find((c) => c.channel === 'signal' && c.signal.from === 'feint')!
        // Un renvoi esquivé (C1) : son impact, l'instant où son coup tombe à côté
        const impact =
          impacts(m, result.beats).get(beat.cause!) ?? m.cues.filter((c) => c.channel === 'blow' && c.blow?.landed && c.blow.dodged && c.blow.from === 1 - beat.side && c.at < signal.at).at(-1)!.at
        expect([T.REACTION_LEAD, T.VOLLEY_REACTION_LEAD]).toContain(signal.at - impact)
        const arrival = signal.at + T.SIGNAL
        expect(at(m, 'float', arrival).some((c) => badge(c, beat.side, STATUSES.guaranteedCrit.name))).toBe(true)
        expect(sounds(m, arrival)).toContain('precisionUp')
        dodges++
      }
    expect(dodges).toBeGreaterThan(3)
  })

  it('Sève noire : ce qu’un soin déclenche part au milieu de sa lecture ; le Poison arrive avec le signal de son anneau (M41)', () => {
    let sapped = 0
    for (const { result, moments } of [...fights('ervald', 'black-sap'), ...fights('aldric', 'black-sap')])
      for (const beat of result.beats) {
        if (beat.type !== 'statusReaction' || beat.status !== 'blackSap') continue
        const m = momentOf(moments, beat.id)
        const signal = m.cues.find((c) => c.channel === 'signal' && c.signal.from === 'blackSap')!
        const healed = m.cues.filter((c) => c.channel === 'float' && c.side === beat.side && c.float.kind === 'badge' && c.float.badge.tone === 'heal' && c.at < signal.at).at(-1)!
        expect([T.REACTION_LEAD, T.VOLLEY_REACTION_LEAD, T.EFFECT_REACTION_LEAD]).toContain(signal.at - healed.at)
        const arrival = signal.at + T.SIGNAL
        expect(at(m, 'float', arrival).some((c) => badge(c, 1 - beat.side, STATUSES.poison.name))).toBe(true)
        expect(sounds(m, arrival)).toContain('afflictionDown')
        sapped++
      }
    expect(sapped).toBeGreaterThan(3)
  })

  it('Dette de sang : son anneau répond au renvoi au milieu de la lecture de son dernier coup ; le Saignement arrive avec le signal (M41)', () => {
    let owed = 0
    for (const { result, moments } of [...fights('aldric', 'blood-debt'), ...fights('brokk', 'blood-debt')])
      for (const beat of result.beats) {
        if (beat.type !== 'statusReaction' || beat.status !== 'bloodDebt') continue
        const m = momentOf(moments, beat.id)
        const signal = m.cues.find((c) => c.channel === 'signal' && c.signal.from === 'bloodDebt')
        // En rafale, le renvoi garde le rythme de la volée (M17 bis)
        if (!signal) continue
        const last = m.cues.filter((c) => c.channel === 'blow' && c.blow?.landed && c.blow.from === beat.side && c.at < signal.at).at(-1)!
        expect([T.REACTION_LEAD, T.VOLLEY_STRIKE_HOLD]).toContain(signal.at - last.at)
        const arrival = signal.at + T.SIGNAL
        expect(at(m, 'float', arrival).some((c) => badge(c, 1 - beat.side, STATUSES.bleed.name))).toBe(true)
        expect(sounds(m, arrival)).toContain('afflictionDown')
        owed++
      }
    expect(owed).toBeGreaterThan(3)
  })

  it('Attiser : la Brûlure repart plus haut ; son texte dit le gain, pas sa nouvelle valeur, avec le compteur à l’arrivée du signal (M42)', () => {
    let stoked = 0
    let restarted = 0
    for (const { result, moments } of [...fights('thaldrin', 'stoke'), ...fights('ervald', 'stoke')])
      for (const beat of result.beats) {
        if (beat.type !== 'event' || beat.event.eventId !== 'stoke') continue
        const target = 1 - beat.event.side
        const burn = (statuses: readonly Status[]) => statuses.find((s) => s.id === 'burn')?.stacks ?? 0
        const [before, after] = [burn(result.beats[beat.id - 1].state.statuses[target]), burn(beat.state.statuses[target])]
        if (after <= before) continue
        const m = momentOf(moments, beat.id)
        const signal = m.cues.find((c) => c.channel === 'signal' && c.signal.from === 'stoke')!
        const arrival = signal.at + T.SIGNAL
        expect(at(m, 'float', arrival).some((c) => badge(c, target, `+${after - before} ${STATUSES.burn.name}`))).toBe(true)
        expect(at(m, 'statuses', arrival).map((c) => charges(c, target, 'burn'))).toEqual([after])
        if (before > 0) restarted++
        stoked++
      }
    expect(stoked).toBeGreaterThan(3)
    expect(restarted).toBeGreaterThan(0)
  })

  it('Ciel d’orage : au début du tour de son porteur, son anneau envoie le signal ; l’éclair tombe à son arrivée en coup sans élan, teinte de la Foudre, sans Ronge (M19 bis)', () => {
    let struck = 0
    for (const { result, moments } of fights('thaldrin', 'storm-sky'))
      for (const tick of result.beats) {
        if (tick.type !== 'statusTick' || tick.status !== 'stormSky') continue
        const m = momentOf(moments, tick.id)
        expect(m.owner).toBe(tick.side)
        const signal = m.cues.find((c) => c.channel === 'signal' && c.signal.from === 'stormSky')!
        expect(signal.channel === 'signal' && signal.signal.to).toEqual([1 - tick.side])
        const landed = m.cues.find((c) => c.channel === 'blow' && c.blow?.landed)!
        expect(landed.at).toBe(signal.at + T.SIGNAL + T.BLOW_WIND_REACTION)
        expect(landed.channel === 'blow' && landed.blow).toMatchObject({ from: tick.side, to: 1 - tick.side, source: 'lightning', lunge: false })
        expect(sounds(m, landed.at)).toContain('hit')
        expect(m.cues.some((c) => c.channel === 'sound' && c.cue === 'rot')).toBe(false)
        expect(m.cues.some((c) => c.channel === 'float' && c.float.kind === 'title')).toBe(false)
        struck++
      }
    expect(struck).toBeGreaterThan(3)
  })

  it('Ivresse du sang : au critique, son sceau et son anneau s’allument à l’impact, muets ; après la lecture du coup, ses deux coups à plat, au rythme d’une rafale (M27, M39)', () => {
    let frenzies = 0
    for (const { result, moments } of fights('gorak', 'blood-frenzy', [1, 2, 3, 4, 5, 6, 7, 8]))
      for (const burst of result.beats) {
        if (burst.type !== 'flurry' || burst.status !== 'bloodFrenzyStrike') continue
        const posed = result.beats[burst.cause!]
        const crit = posed.cause !== undefined ? result.beats[posed.cause] : undefined
        // Une charge posée en rafale attend le prochain jet (RESOLUTION § 2) : ici, le critique d'un coup seul, sans réaction du
        // défenseur entre le coup et la rafale (Épines : sa réaction a sa propre lecture)
        if (crit?.type !== 'attack' || !momentOf(moments, crit.id).beats.includes(burst.id) || moments.some((m) => m.beats.includes(crit.id) && m.beats.some((id) => result.beats[id].type === 'flurry' && id < crit.id))) continue
        if (result.beats.some((b) => b.cause === crit.id && b.type === 'statusReaction' && b.side !== burst.side && b.effects.length > 0)) continue
        const m = momentOf(moments, burst.id)
        const impact = impacts(m, result.beats).get(crit.id)!
        expect(at(m, 'skillPulse', impact).some((c) => c.channel === 'skillPulse' && c.side === burst.side && c.face === 3)).toBe(true)
        expect(at(m, 'statuses', impact).some((c) => (charges(c, burst.side, 'bloodFrenzyStrike') ?? 0) > 0)).toBe(true)
        const after = m.spans.filter((s) => s.at >= impact).map((s) => s.name)
        const gap = after.indexOf('VOLLEY_GAP')
        expect(after.slice(gap - 1, gap + 3)).toEqual([after.includes('STRIKE_FLOW_HOLD') ? 'STRIKE_FLOW_HOLD' : 'STRIKE_HOLD', 'VOLLEY_GAP', 'VOLLEY_FLAT', 'VOLLEY_WIND'])
        expect(after).not.toContain('READ_HOLD')
        expect(m.cues.some((c) => c.channel === 'float' && c.float.kind === 'title')).toBe(false)
        // La charge part avec ses dés
        const flat = m.spans.find((s) => s.name === 'VOLLEY_FLAT')!.at
        expect(m.cues.filter((c) => c.channel === 'statuses' && c.at === flat).map((c) => charges(c, burst.side, 'bloodFrenzyStrike'))).toEqual([0])
        frenzies++
      }
    expect(frenzies).toBeGreaterThan(3)
  })

  it('Coup de massue : Étourdi tombe à l’impact du coup qui touche (Tempo −), puis « Tour perdu » sur celui qui perd son action (M14, M29)', () => {
    let stunned = 0
    for (const { result, moments } of fights('morgrut', 'stunning-blow'))
      for (const beat of result.beats) {
        if (beat.type !== 'event' || beat.event.eventId !== 'stunning-blow' || beat.cause === undefined) continue
        const posed = beat.event.effects.find((e) => e.type === 'applyStatus' && e.status === 'stunned' && e.result.kind === 'applied')
        if (!posed) continue
        const m = momentOf(moments, beat.id)
        const impact = impacts(m, result.beats).get(beat.cause)!
        expect(at(m, 'float', impact).some((c) => badge(c, posed.target, STATUSES.stunned.name))).toBe(true)
        expect(sounds(m, impact + T.RIDE_CUE)).toContain('tempoDown')
        const skip = result.beats.find((b) => b.type === 'skip' && b.id > beat.id && b.side === posed.target)
        if (!skip) continue
        const lost = momentOf(moments, skip.id)
        const note = lost.cues.find((c) => badge(c, posed.target, STATES.lostTurn.name))!
        expect(sounds(lost, note.at)).toContain('stun')
        stunned++
      }
    expect(stunned).toBeGreaterThan(3)
  })
})

describe('retour du 2026-10-27', () => {
  it('Rétribution : la relâche se répartit en un coup par jauge, sa somme intacte (S1) ; le coup fatal d’une série emporte le reste (S7, M52)', () => {
    expect(splitAmong(6, [7, 6])).toEqual([3, 3])
    expect(splitAmong(13, [7, 4, 2])).toEqual([7, 4, 2])
    expect(splitAmong(5, [1, 1, 10])).toEqual([1, 1, 3])
    expect(splitAmong(2, [1, 1, 10])).toEqual([1, 1])
    for (let n = 1; n < 30; n++) expect(splitAmong(n, [9, 3, 5]).reduce((a, b) => a + b, 0)).toBe(n)
    let releases = 0
    let fatal = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats)
        for (const e of beatEffects(beat)) {
          if (e.type !== 'damage' || !e.parts || e.parts.length < 2) continue
          const m = momentOf(moments, beat.id)
          const shown = m.cues.flatMap((c) => (c.channel === 'float' && c.side === e.target && c.float.kind === 'hit' && !c.float.dodged ? [c.float.damage] : []))
          // Les chiffres d'une série montrent toute sa valeur, même quand un coup met K.O. avant la fin
          expect(shown.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(e.amount)
          if (beat.state.hp[e.target] === 0) fatal++
          releases++
        }
    expect(releases).toBeGreaterThan(5)
    expect(fatal).toBeGreaterThanOrEqual(0)
  })
})

describe('sorts à scène (retour du 2026-10-27, S10, M54)', () => {
  it('Éclair aveuglant et Peur : la scène part, le malus tombe sur la cible à son impact, sans signal ni coup', () => {
    let seen = 0
    for (const skill of ['blinding', 'fear'])
      for (const y of CHARACTER_IDS)
        for (const seed of [1, 2, 3]) {
          const def = ENGRAVABLE_SKILLS.find((s) => s.id === skill)!
          const carrier = createCharacter('gorak').withForge([{ op: 'engrave', face: 3, skill: def }])
          const result = simulateCombat([carrier, createCharacter(y)], { seed })
          const moments = stage(result)
          for (const beat of result.beats) {
            if (beat.type !== 'event' || beat.event.eventId !== skill) continue
            const applied = beat.event.effects.find((e) => e.type === 'applyStatus' && e.result.kind === 'applied' && e.result.stacks > 0)
            if (!applied || applied.type !== 'applyStatus') continue
            // Une pose qui ne change rien (plafond, aveuglé déjà) n'active rien, scène comprise (M25)
            const before = result.beats[beat.id - 1]?.state.statuses[applied.target].find((s) => s.id === applied.status)?.stacks ?? 0
            if ((beat.state.statuses[applied.target].find((s) => s.id === applied.status)?.stacks ?? 0) <= before) continue
            const m = momentOf(moments, beat.id)
            const scene = m.cues.find((c) => c.channel === 'scene' && c.scene.id === def.scene)!
            expect(scene, `${skill} contre ${y}, graine ${seed}`).toBeDefined()
            const was = result.beats[beat.id - 1]?.state.statuses[applied.target].find((s) => s.id === applied.status)?.stacks ?? 0
            const shown = m.cues.find((c) => c.channel === 'statuses' && (c.statuses[applied.target].find((s) => s.id === applied.status)?.stacks ?? 0) > was)!
            expect(shown.at - scene.at).toBe(SCENE_EVENTS[def.scene!].impacts[0])
            expect(m.cues.some((c) => c.channel === 'signal' && c.signal.from === skill)).toBe(false)
            // Son texte et son son tombent avec lui (M20)
            expect(at(m, 'float', shown.at).some((c) => c.channel === 'float' && c.float.kind === 'badge' && c.float.badge.text === STATUSES[applied.status].name)).toBe(true)
            seen++
          }
        }
    expect(seen).toBeGreaterThan(5)
  })
})

describe('l’aura de départ au 3e tour (retour du 2026-10-27, C2)', () => {
  it('sa pose d’office est un moment à elle, au début du tour : élan, « Aura éveillée » sur le porteur avec le son de l’aura, son sceau, puis la ligne du journal', () => {
    let seen = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        // Une aura volée (Sceau de vol) se lit par son « Volé », comme sur un 1
        if (beat.type !== 'event' || beat.event.trigger !== 'auraDue' || beat.event.effects.some((e) => e.type === 'applyStatus' && e.stolenBy !== undefined)) continue
        const m = momentOf(moments, beat.id)
        // Rien de l'action du tour dans ce moment : le rendez-vous se lit seul, avant le jet
        expect(m.beats.every((id) => result.beats[id].phase !== 'action')).toBe(true)
        const note = m.cues.find((c) => c.channel === 'float' && c.side === beat.event.side && c.float.kind === 'badge' && c.float.badge.text === 'Aura éveillée')!
        expect(note).toBeDefined()
        // Après l'élan habituel d'une compétence (LEAD) : on la voit arriver
        expect(note.at).toBeGreaterThanOrEqual(T.LEAD)
        expect(at(m, 'sound', note.at).some((c) => c.channel === 'sound' && c.cue === 'auraGain')).toBe(true)
        expect(at(m, 'skillPulse', note.at).some((c) => c.channel === 'skillPulse' && c.side === beat.event.side && c.face === 1)).toBe(true)
        expect(m.cues.some((c) => c.channel === 'log' && c.entry.text.includes("son aura s'éveille"))).toBe(true)
        seen++
      }
    expect(seen).toBeGreaterThan(30)
  })
})

describe('mise en scène : le contenu des maîtrises (quatrième demande du 2026-10-27)', () => {
  const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
  const badge = (c: Cue, side: number, text: string) => c.channel === 'float' && c.side === side && c.float.kind === 'badge' && c.float.badge.text === text

  it('Onde de choc : la scène part, son coup de dégâts directs tombe sur son impact, sur l’adversaire (M56)', () => {
    let waves = 0
    for (const seed of [1, 2, 3]) {
      const a = testCharacter('a', { maxHp: 400 }).withForge([{ op: 'engrave', face: 3, skill: skill('shockwave') }])
      const result = simulateCombat([a, testCharacter('b', { maxHp: 400, dodgeChance: 0 })], { seed, forcedRolls: everyDie(3) })
      const moments = stage(result)
      for (const beat of result.beats) {
        if (beat.type !== 'event' || beat.event.eventId !== 'shockwave') continue
        const m = momentOf(moments, beat.id)
        const scene = m.cues.find((c) => c.channel === 'scene')!
        expect(scene.channel === 'scene' && scene.scene).toMatchObject({ id: 'shockwave', source: beat.event.side, target: 1 - beat.event.side })
        const landed = m.cues.find((c) => c.channel === 'blow' && c.blow?.landed && c.blow.to === 1 - beat.event.side && c.at > scene.at)!
        expect(landed.at - scene.at).toBe(SCENE_EVENTS.shockwave.impacts[0])
        waves++
      }
    }
    expect(waves).toBeGreaterThan(3)
  })

  it('Larcin : à une esquive, l’icône du bonus pris part de la zone d’état du volé vers le voleur ; à son arrivée, « Volé » sur le volé, le bonus chez le voleur, Sceaux − (M50)', () => {
    let taken = 0
    const power: CharacterEvent = { id: 'power', name: 'power', trigger: 'turnStart', effects: [{ type: 'applyStatus', status: 'powerAura', stacks: 1 }] }
    const pilfer: CharacterEvent = { id: 'with-pilfer', name: 'with-pilfer', trigger: 'combatStart', effects: [{ type: 'applyStatus', status: 'pilfer', stacks: 1 }] }
    for (const seed of [1, 2, 3, 4]) {
      const result = simulateCombat([testCharacter('a', { maxHp: 400, dodgeChance: 0.5 }, [pilfer]), testCharacter('b', { maxHp: 400 }, [power])], { seed })
      const moments = stage(result)
      for (const beat of result.beats) {
        if (beat.type !== 'statusReaction' || beat.status !== 'pilfer') continue
        const got = beat.effects.find((e) => e.type === 'applyStatus' && e.stolenBy === 'pilfer' && e.result.kind === 'applied' && e.result.stacks > 0)
        if (got?.type !== 'applyStatus') continue
        const m = momentOf(moments, beat.id)
        const signal = m.cues.find((c) => c.channel === 'signal' && c.signal.icon !== undefined)!
        expect(signal.channel === 'signal' && signal.signal).toMatchObject({ side: beat.side, to: [beat.side], fromTray: 1 - beat.side, icon: got.status, polarity: 'negative' })
        const arrival = signal.at + T.SIGNAL
        expect(at(m, 'float', arrival).some((c) => badge(c, 1 - beat.side, STOLEN_BADGE.text))).toBe(true)
        expect(at(m, 'sound', arrival).some((c) => c.channel === 'sound' && c.cue === 'sealDown')).toBe(true)
        taken++
      }
    }
    expect(taken).toBeGreaterThan(3)
  })
})
