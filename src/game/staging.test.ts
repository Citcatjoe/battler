/*
 * La mise en scène (docs/MOTEUR_V2.md § 4), sans navigateur : des combats à graine de tout le roster, mis en scène par
 * `stage`, puis rejoués par le réducteur du lecteur (`applyCue`). Les invariants valent pour tous ; les cas précis
 * (poison et Riposte, plaie qui coule, Peur, rafales, double de la barde, pièce, relique, druide, Foudre) sont
 * cherchés dans ce corpus, et chacun doit y apparaître.
 */
import { describe, expect, it } from 'vitest'
import { simulateCombat, type Beat, type CombatResult, type Pair } from './combat'
import type { Character } from './character'
import { RELICS } from './relics'
import { CHARACTER_IDS, createCharacter } from './roster'
import { SCENE_EVENTS } from './scenes'
import { childrenOf, skillFaceAt, skillFaceOf, stage, type Cue, type Moment } from './staging'
import type { Status } from './statuses'
import { testCharacter } from './test-utils'
import { effectBadge } from './narration'
import { STATES } from './states'
import { STATUSES } from './statuses'
import * as T from './timing'
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

/** Le moment qui couvre l'étape `id`. */
const momentOf = (moments: Moment[], id: number) => moments.find((m) => m.beats.includes(id))!
/** L'instant de l'impact de chaque coup (non sacrifié) d'un moment, par étape, dans l'ordre. */
function impacts(moment: Moment, beats: Beat[]): Map<number, number> {
  const landed = moment.cues.filter((c) => c.channel === 'strike' && c.strike?.landed).map((c) => c.at)
  const strikes = moment.beats.filter((id) => beats[id].type === 'attack' && !(beats[id] as Extract<Beat, { type: 'attack' }>).attack.forfeited)
  return new Map(strikes.map((id, k) => [id, landed[k]]))
}
const at = (moment: Moment, channel: Cue['channel'], when: number) => moment.cues.filter((c) => c.channel === channel && c.at === when)

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

  it('le Saignement de Pourfendre tombe à l’impact du coup qui touche', () => {
    let rides = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'event' || beat.event.eventId !== 'cleave' || beat.cause === undefined) continue
        const m = momentOf(moments, beat.id)
        const impact = impacts(m, result.beats).get(beat.cause)!
        const floats = at(m, 'float', impact).flatMap((c) => (c.channel === 'float' && c.float.kind === 'badge' ? [c.float.badge.text] : []))
        for (const e of beat.event.effects) expect(floats).toContain(effectBadge(e).text)
        rides++
      }
    expect(rides).toBeGreaterThan(20)
  })

  it("la plaie qui coule tombe sur l'impact du coup qui la fait couler : son label à l'impact, ses PV un battement après", () => {
    let flows = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'statusReaction' || beat.status !== 'bleed' || beat.cause === undefined) continue
        const hit = result.beats[beat.cause]
        if (hit.type !== 'attack') continue
        const m = momentOf(moments, beat.id)
        const impact = impacts(m, result.beats).get(hit.id)!
        const labels = at(m, 'special', impact).flatMap((c) => (c.channel === 'special' ? [c.special.label] : []))
        expect(labels.some((l) => l.startsWith(STATUSES.bleed.name))).toBe(true)
        expect(at(m, 'hp', impact + T.BLEED_DELAY).length).toBe(1)
        flows++
      }
    expect(flows).toBeGreaterThan(20)
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

  it('le poison qui agit grésille ; les autres statuts qui rongent gardent Ronge (SONS.md § 9.3)', () => {
    const heard = { poison: 0, other: 0 }
    for (const { result, moments } of corpus)
      for (const tick of result.beats) {
        if (tick.type !== 'statusTick' || !tick.effects.some((e) => e.type === 'damage')) continue
        const poison = tick.status === 'poison'
        const sounds = momentOf(moments, tick.id).cues.flatMap((c) => (c.channel === 'sound' ? [c.cue] : []))
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

  it('rafales : les dés roulent ensemble (à plat pour la Furie instantanée), un coup rapide par dé', () => {
    let instant = 0
    let rolled = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'flurry') continue
        const m = momentOf(moments, beat.id)
        const strikes = childrenOf(result.beats)[beat.id].filter((b) => b.type === 'attack')
        const volley = m.cues.find((c) => c.channel === 'dice' && c.dice.volley && c.dice.values.length === strikes.length)
        expect(volley, `rafale ${beat.id}`).toBeDefined()
        const fast = m.cues.filter((c) => c.channel === 'strike' && c.strike?.fast && !c.strike.landed).length
        expect(fast).toBe(strikes.filter((b) => b.type === 'attack' && !b.attack.forfeited).length)
        if (STATUSES[beat.status].instantStrikes) {
          expect(m.cues.some((c) => c.channel === 'dice' && c.dice.volley && c.dice.rolling)).toBe(false)
          instant++
        } else rolled++
      }
    expect(instant).toBeGreaterThan(5)
    expect(rolled).toBeGreaterThan(5)
  })

  it('double de la barde : la paire retombe avec le ding, le dé de la face pulse, la compétence suit un battement après (M12)', () => {
    let doubles = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'pair' || beat.double === undefined) continue
        const m = momentOf(moments, beat.id)
        const land = m.cues.find((c) => c.channel === 'dice' && !c.dice.rolling && c.dice.values.length === 2 && c.dice.values[0] > 0)!
        expect(land).toBeDefined()
        expect(at(m, 'sound', land.at).some((c) => c.channel === 'sound' && c.cue === 'coinWin')).toBe(true)
        expect(at(m, 'skillPulse', land.at)).toEqual([{ at: land.at, channel: 'skillPulse', side: beat.side, face: beat.double }])
        expect(m.cues.some((c) => c.at === land.at + T.DICE_READ && (c.channel === 'signal' || c.channel === 'aura' || c.channel === 'float'))).toBe(true)
        doubles++
      }
    expect(doubles).toBeGreaterThan(5)
  })

  it('pile ou face : pile tombe d’un bloc avec son ding, puis un seul coup lourd', () => {
    let heads = 0
    for (const { result, moments } of corpus)
      for (const beat of result.beats) {
        if (beat.type !== 'coin' || !beat.heads) continue
        const m = momentOf(moments, beat.id)
        const land = m.cues.find((c) => c.channel === 'dice' && c.dice.coin?.heads === true)!
        expect(at(m, 'sound', land.at).some((c) => c.channel === 'sound' && c.cue === 'coinWin')).toBe(true)
        expect(at(m, 'float', land.at).some((c) => c.channel === 'float' && c.float.kind === 'title' && c.float.text === 'Pile !')).toBe(true)
        const blow = m.cues.find((c) => c.channel === 'blow' && c.blow?.landed && c.at > land.at)
        expect(blow?.channel === 'blow' && blow.blow?.heavy).toBe(true)
        heads++
      }
    expect(heads).toBeGreaterThan(10)
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
        const capped = beat.effects.length > 0 && beat.effects.every((e) => e.type === 'applyStatus' && e.result.kind === 'applied' && e.result.stacks === 0)
        if (!capped) expect(label).toBeDefined()
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
        const landed = m.cues.filter((c) => c.channel === 'blow' && c.blow?.landed).map((c) => c.at - scene.at)
        expect(landed).toEqual(SCENE_EVENTS.lightning.impacts.slice(0, landed.length))
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
              // Sur le porteur : l'effet tombe au premier impact, et le moment laisse la scène aller au bout
              const use = m.cues.find((c) => c.channel === 'relicUse')!
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
      const { beats, fighters } = result
      const children = childrenOf(beats)
      for (const beat of beats) {
        if (beat.type === 'attack') {
          const face = skillFaceAt(beats, fighters, beat.id, children)
          // Un coup ordinaire (ni compétence, ni coup transformé) ne fait rien pulser ; sinon, c'est la face du dé
          if (face !== undefined && !beat.attack.reshaped) expect(beat.attack.roll).toBe(face)
        }
        // Toute compétence sur un 1, 2 ou 3 a pour cause son coup, dont le dé pulse sur cette face
        if (beat.type === 'event' && ['naturalOne', 'naturalTwo', 'naturalThree'].includes(beat.event.trigger)) {
          expect(beats[beat.cause!]?.type, `${beat.event.name} sans coup`).toBe('attack')
          expect(skillFaceAt(beats, fighters, beat.cause!, children)).toBe(skillFaceOf(beat.event.trigger))
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
        if (beat.type !== 'attack' || !beat.attack.forfeited || beat.attack.preset) continue
        const face = skillFaceAt(result.beats, result.fighters, beat.id, children)
        if (face === undefined) continue
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
        if (hit.type !== 'attack' || hit.attack.forfeited) continue
        const striker = hit.attack.attacker
        const first = children[hit.id].find((b) => b.type === 'relic' || (b.type === 'statusReaction' && b.effects.length > 0 && b.side !== striker && b.status !== 'bleed'))
        if (!first) continue
        const m = momentOf(moments, hit.id)
        const impact = impacts(m, result.beats).get(hit.id)!
        const fast = m.cues.some((c) => c.channel === 'strike' && c.at === impact && c.strike?.fast)
        const flow = children[hit.id].some((b) => b.type === 'statusReaction' && b.status === 'bleed' && b.side !== striker)
        const start = impact + (flow ? T.BLEED_DELAY : 0) + (fast ? T.VOLLEY_REACTION_LEAD : T.REACTION_LEAD)
        const starts = ['signal', 'aura', 'special', 'relicPulse']
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

  it('les dégâts d’un statut qui agit ont la couleur de leur famille : Poison en vert, Brûlure en mauve, la plaie en rouge (M37)', () => {
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

  it('combat test : un point d’attente avant chaque étape qui lance des dés, sans initiative animée', () => {
    const { result } = corpus[7]
    const moments = stage(result, { test: true })
    expect(moments[0].duration).toBe(0)
    const marks = moments.flatMap((m) => m.rolls)
    expect(Math.max(...marks.map((r) => r.upTo))).toBe(result.beats.reduce((n, b) => n + (b.type === 'pair' ? 2 : b.type === 'coin' || (b.type === 'attack' && !b.attack.preset) ? 1 : 0), 0))
    for (const m of moments) expect(m.rolls.map((r) => r.at)).toEqual(m.rolls.map((r) => r.at).sort((p, q) => p - q))
  })
})
