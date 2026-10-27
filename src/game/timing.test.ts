/*
 * Le contrôle des timings (docs/MISE_EN_SCENE.md § 7 bis) : des combats à graine de tout le roster, chaque combattant
 * dans une construction tirée au hasard dans les registres (forge du dé : gravures, dorures, rangs ; reliques), mis en
 * scène par `stage` et rejoués sur une seule horloge. Chaque contrôle cherche une entorse au principe « dé rendu →
 * intervalle → impact → réactions » qu'aucun combat construit ne prévoit : le contenu nouveau (compétences, statuts,
 * reliques) y entre de lui-même, par les registres. Un échec donne le duel, la graine et l'instant pour le rejouer.
 * Les compétences de la réserve de chacun (`characterPool`, ses maîtrises) y entrent aussi gravées chez lui : les moments qu'elles
 * seules font naître (jet à vide, critique raté, soin empêché, bonus volé, armure brisée : le lot 3) y sont assez
 * nombreux pour que chaque contrôle les rencontre.
 */
import { describe, expect, it } from 'vitest'
import { other, simulateCombat, type Beat, type CombatResult, type Side } from './combat'
import type { Character } from './character'
import { isRollTrigger, relationOf, type CharacterEvent } from './events'
import { autoForge, drawForgeOffer, validOnOrigin, withForgeStep, type ForgeStep } from './forge'
import { STOLEN_BADGE } from './narration'
import { RELICS } from './relics'
import { seededRng, shuffle, type Rng } from './rng'
import { CHARACTER_IDS, CHARACTERS, createCharacter, ENGRAVABLE_SKILLS } from './roster'
import { characterPool } from './masteries'
import { childrenOf, stage, type Cue, type Moment } from './staging'
import { signalTargets } from './states'
import { STATUSES, type Status } from './statuses'
import * as T from './timing'
import { applyCue, initialView, type View } from './useCombat'

type Attack = Extract<Beat, { type: 'attack' }>

/**
 * Une construction au hasard : jusqu'à six opérations de forge tirées comme en campagne, jusqu'à trois reliques.
 * `engraved` : une compétence gravée d'abord, sur le 3 ou la première face qui l'accepte.
 */
function randomBuild(id: string, rng: Rng, engraved?: CharacterEvent): { fighter: Character; text: string } {
  const base = createCharacter(id)
  const first = engraved && [3, 1, 2, 4, 5, 6].map((face): ForgeStep => ({ op: 'engrave', face, skill: engraved })).find((s) => validOnOrigin(base.definition, s))
  let steps: ForgeStep[] = first ? [first] : []
  for (let k = Math.floor(rng() * 7); k > 0; k--) {
    const step = autoForge(base.definition, steps, drawForgeOffer(base.definition, steps, rng, ENGRAVABLE_SKILLS), rng)
    if (step) steps = withForgeStep(base.definition, steps, step)
  }
  const relics = shuffle(rng, RELICS).slice(0, Math.floor(rng() * 4))
  const forged = steps.map((s) => (s.op === 'engrave' ? `${s.skill.id}@${s.face}` : 'face' in s ? `${s.op}@${s.face}` : s.op))
  return { fighter: base.withForge(steps).withRelics(relics), text: `${id} [${[...forged, ...relics.map((r) => r.id)].join(', ')}]` }
}

interface Case {
  name: string
  result: CombatResult
  moments: Moment[]
}

const SEEDS = [1, 2, 3, 4, 5, 6]
const corpus: Case[] = []
for (const x of CHARACTER_IDS)
  for (const y of CHARACTER_IDS)
    for (const seed of SEEDS) {
      const rng = seededRng(seed * 7919 + corpus.length)
      const [a, b] = [randomBuild(x, rng), randomBuild(y, rng)]
      const result = simulateCombat([a.fighter, b.fighter], { seed })
      corpus.push({ name: `${a.text} contre ${b.text}, graine ${seed}`, result, moments: stage(result) })
    }
// Chaque compétence de la réserve d'un personnage (ses deux maîtrises) gravée chez lui, contre chacun, une graine par duel
for (const host of CHARACTERS)
  for (const skill of characterPool(host.definition))
    for (const y of CHARACTER_IDS) {
      const seed = corpus.length
      const rng = seededRng(seed * 7919)
      const [a, b] = [randomBuild(host.id, rng, skill), randomBuild(y, rng)]
      const result = simulateCombat([a.fighter, b.fighter], { seed })
      corpus.push({ name: `${a.text} contre ${b.text}, graine ${seed}`, result, moments: stage(result) })
    }
// L'armure brisée, rare : le Brise-garde gravé chez l'ogre, contre la Peau de pierre du nain, de chaque côté
for (const seed of SEEDS) {
  const breaker = createCharacter('morgrut').withForge([{ op: 'engrave', face: 3, skill: ENGRAVABLE_SKILLS.find((e) => e.id === 'guard-break')! }])
  for (const pair of [[breaker, createCharacter('brokk')], [createCharacter('brokk'), breaker]] as const) {
    const result = simulateCombat([...pair], { seed })
    corpus.push({ name: `${pair[0].id} contre ${pair[1].id} (Brise-garde), graine ${seed}`, result, moments: stage(result) })
  }
}

/** Une cue sur l'horloge du combat : l'instant du moment, plus le début de son moment. */
interface Timed {
  cue: Cue
  at: number
  moment: number
}

/** Ce que voit l'écran juste avant chaque cue, cue par cue, sur l'horloge du combat. */
function replay({ result, moments }: Case): { timed: Timed[]; before: View[]; starts: number[] } {
  const timed: Timed[] = []
  const before: View[] = []
  const starts: number[] = []
  let view = initialView(result.fighters)
  let offset = 0
  moments.forEach((m, k) => {
    starts.push(offset)
    for (const cue of m.cues) {
      before.push(view)
      timed.push({ cue, at: offset + cue.at, moment: k })
      view = applyCue(view, cue, offset + cue.at)
    }
    offset += m.duration
  })
  return { timed, before, starts }
}

const stacks = (list: readonly Status[], id: string) => list.find((s) => s.id === id)?.stacks
/** Où un texte flottant s'accroche à son combattant (Fighter.tsx, `at`) et dans quel sens il part. */
function anchorOf(cue: Extract<Cue, { channel: 'float' }>): { pos: number; rises: boolean } {
  const f = cue.float
  if (f.kind === 'title') return { pos: 4, rises: true }
  if (f.kind === 'badge') return { pos: f.lift ? 6 - f.row * 9 : 30 + f.row * 9, rises: f.badge.rises }
  return { pos: 18, rises: f.dodged || f.crit }
}

/** Deux textes du même camp, au même repère, qui partent à moins de cet écart, se recouvrent (M31). */
const FLOAT_GAP = T.FLOAT_ROW
/** Les attentes qui ne passent jamais entre deux coups d'une rafale : une réaction qui s'attarde (M17 bis). */
const LINGER: Record<string, true> = {
  READ_HOLD: true,
  LEAD: true,
  BLOWS_LEAD: true,
  BLOWS_HOLD: true,
  BLOW_LAST_HOLD: true,
  STRIKE_HOLD: true,
  STRIKE_FLOW_HOLD: true,
  STRIKE_REST: true,
  WOUND_HOLD: true,
  COUNT_HOLD: true,
  REACTION_LEAD: true,
}

type Flags = Map<string, { n: number; example: string }>

function control(c: Case, flags: Flags, seen: Record<string, number>) {
  const { result, moments } = c
  const { beats } = result
  const children = childrenOf(beats)
  const { timed, before, starts } = replay(c)
  const flag = (kind: string, at: number, detail = '') => {
    const where = `moment ${starts.filter((s) => s <= at).length - 1}, à ${at} ms${detail ? ` : ${detail}` : ''}`
    const p = flags.get(kind) ?? { n: 0, example: `${c.name}, ${where}` }
    p.n++
    flags.set(kind, p)
  }
  const count = (kind: string) => (seen[kind] = (seen[kind] ?? 0) + 1)

  moments.forEach((m, k) => {
    const start = starts[k]
    const cues = timed.filter((x) => x.moment === k)
    const index = (x: Timed) => timed.indexOf(x)
    // Un jet tombé à vide (Malchance) n'a pas de coup : il a son contrôle (11)
    const strikes = m.beats.map((id) => beats[id]).filter((b): b is Attack => b.type === 'attack' && !b.attack.replaced && !b.attack.jinxed)
    const landed = cues.filter((x) => x.cue.channel === 'strike' && x.cue.strike?.landed)
    expect(landed.length, c.name).toBe(strikes.length)

    // 1. Le dé avant l'impact : au moment de l'impact, le dé du coup montre sa valeur, posé, depuis au moins l'élan
    strikes.forEach((beat, n) => {
      const impact = landed[n]
      const dice = cues.flatMap((x) => (x.at < impact.at && x.cue.channel === 'dice' ? [{ at: x.at, dice: x.cue.dice, x }] : []))
      const last = dice.at(-1)
      const shows = (d: (typeof dice)[number]) => !d.dice.rolling && d.dice.active === last?.dice.active && d.dice.values[d.dice.active ?? 0] === beat.attack.roll
      count('coup')
      if (!last || !shows(last)) return flag('un impact avant que son dé soit montré', impact.at, `étape ${beat.id}`)
      let since = dice.length - 1
      while (since > 0 && shows(dice[since - 1])) since--
      if (impact.at - dice[since].at < T.VOLLEY_WIND) flag('un impact trop tôt après son dé', impact.at, `étape ${beat.id}, ${impact.at - dice[since].at} ms`)

      // 1 bis. À l'impact, tout tombe ensemble (M13) : son du coup, chiffre, PV ; l'élan est muet. Un critique s'annonce
      // sous le dé avant l'élan et marque son arrêt sur image juste avant l'impact (M16)
      const together = cues.filter((x) => x.at === impact.at)
      const sounded = together.some((x) => x.cue.channel === 'sound' && ['hit', 'crit', 'dodge'].includes(x.cue.cue))
      const number = together.some((x) => x.cue.channel === 'float' && x.cue.float.kind === 'hit')
      if (!sounded || !number) flag("un impact sans son son ou son chiffre au même instant", impact.at, `étape ${beat.id}`)
      const wind = cues.filter((x) => x.at < impact.at && x.cue.channel === 'strike' && x.cue.strike && !x.cue.strike.landed).at(-1)
      if (wind && cues.some((x) => x.cue.channel === 'sound' && x.at >= wind.at && x.at < impact.at && ['hit', 'crit', 'dodge'].includes(x.cue.cue)))
        flag("un élan qui sonne avant l'impact", wind.at)
      if (beat.attack.crit && !beat.attack.dodged && wind) {
        count('critique')
        const fast = dice[since].dice.volley
        const freeze = fast ? T.VOLLEY_WIND + T.VOLLEY_CRIT_FREEZE : T.WIND + T.CRIT_FREEZE
        if (impact.at - wind.at !== freeze) flag("un critique sans son arrêt sur image avant l'impact", impact.at, `${impact.at - wind.at} ms`)
        const told = cues.find((x) => x.cue.channel === 'special' && x.cue.special.label.startsWith('Critique') && x.at <= wind.at && x.at >= dice[since].at)
        if (!told) flag("un critique annoncé après l'élan", wind.at)
      }
      // 1 ter. Le critique d'un aveuglé (M47) s'annonce entre le dé et l'élan, comme tout critique, puis rate à l'impact
      // (« RATÉ »), sans arrêt sur image
      if (beat.attack.blindedBy && wind) {
        count('critique raté')
        const told = cues.find((x) => x.cue.channel === 'special' && x.cue.special.label.startsWith('Critique') && x.at <= wind.at && x.at >= dice[since].at)
        if (!told) flag("un critique raté annoncé après l'élan", wind.at)
        const missed = together.some((x) => x.cue.channel === 'float' && x.cue.float.kind === 'hit' && x.cue.float.missed)
        if (!missed || impact.at - wind.at !== (dice[since].dice.volley ? T.VOLLEY_WIND : T.WIND)) flag('un critique raté sans « RATÉ », ou figé avant son impact', impact.at)
      }
      // 1 quater. L'armure temporaire qu'une garde brisée fait voler en éclats (M48) : son texte tombe à l'impact
      const guard = beats[beat.id - 1]?.state.statuses[other(beat.attack.attacker)] ?? []
      if (beat.attack.shatteredBy && !beat.attack.dodged && guard.some((s) => STATUSES[s.id].shield)) {
        count('armure brisée')
        const said = together.some((x) => x.cue.channel === 'float' && x.cue.float.kind === 'badge' && x.cue.float.badge.text.endsWith('brisée'))
        if (!said) flag("une armure brisée sans son texte à l'impact", impact.at)
      }
      // Le bonus d'une relique de coup tombe avec le dé posé (M8)
      const bonus = beat.attack.relicBonus?.[0]
      if (bonus && !beat.attack.dodged) {
        count('bonus de relique')
        const lit = cues.find((x) => x.cue.channel === 'relicPulse' && x.cue.relics.includes(bonus.relic) && x.at >= dice[since].at)
        if (!lit || lit.at >= impact.at) flag("le bonus d'une relique de coup après l'impact", impact.at, bonus.relic)
      }

      // 2. Ce que décide le dé part avec lui, avant l'impact : les reliques du dé (M40), sauf celle qui met K.O.
      for (const relic of children[beat.id]) {
        if (relic.type !== 'relic' || relic.state.hp.some((x) => x === 0)) continue
        const trigger = RELICS.find((r) => r.id === relic.relic)?.trigger
        if (trigger?.type !== 'strike' || !isRollTrigger(trigger.on)) continue
        count('relique du dé')
        const lit = cues.find((x) => x.cue.channel === 'relicPulse' && x.cue.relics.includes(relic.relic))
        if (!lit || lit.at >= impact.at) flag("une relique du dé après l'impact de son coup", impact.at, relic.relic)
      }

      // 3. La charge d'un statut que le coup use (critique assuré, bouclier, modificateur) ne baisse pas entre son dé et
      // son impact
      const was = beats[beat.id - 1]?.state.statuses
      const shown = dice[since].x
      if (!was) return
      for (const side of [0, 1] as Side[])
        for (const s of was[side]) {
          const after = stacks(beat.state.statuses[side], s.id)
          if (after !== undefined && after >= s.stacks) continue
          if (stacks(before[index(shown)].statuses[side], s.id) !== s.stacks) continue
          count('charge usée par un coup')
          const early = cues.find((x) => x.at >= shown.at && x.at < impact.at && x.cue.channel === 'statuses' && stacks(x.cue.statuses[side], s.id) === after)
          if (early) flag("la charge d'un statut baisse avant l'impact", early.at, `${s.id} ${s.stacks} → ${after ?? 0}, impact à ${impact.at}`)
        }
    })

    // 4. Le signal arrive avant le statut : rien n'apparaît dans une zone d'état pendant son vol, et son arrivée montre
    // quelque chose
    for (const s of cues.filter((x) => x.cue.channel === 'signal')) {
      count('signal')
      const arrival = s.at + T.SIGNAL
      const during = cues.find((x) => x.at > s.at && x.at < arrival && x.cue.channel === 'statuses')
      if (during) flag("un statut apparaît avant l'arrivée de son signal", during.at)
      if (!cues.some((x) => x.at === arrival && ['statuses', 'float', 'hp', 'blow', 'aura'].includes(x.cue.channel))) flag("un signal arrive sans rien montrer", arrival)
    }

    // 5. La rafale garde son rythme : entre l'impact d'un coup de rafale et le dé du suivant, aucune attente de réaction
    for (const id of m.beats) {
      const flurry = beats[id]
      if (flurry.type !== 'flurry') continue
      const own = children[id].flatMap((b) => (b.type === 'roll' ? children[b.id] : [b])).filter((b): b is Attack => b.type === 'attack')
      own.slice(0, -1).forEach((b, n) => {
        if (b.attack.replaced || b.attack.jinxed) return
        const impact = landed[strikes.indexOf(b)]
        const next = cues.find((x) => x.at > impact.at && x.cue.channel === 'dice' && x.cue.dice.active === n + 1)
        if (!next) return
        if (m.beats.some((x) => beats[x].type === 'coin' && x > b.id && x < own[n + 1].id)) return
        count('coup de rafale suivi')
        const slow = m.spans.find((sp) => sp.at + start >= impact.at && sp.at + start < next.at && LINGER[sp.name])
        if (slow) flag('une réaction casse le rythme de la rafale', slow.at + start, `${slow.name} après l'étape ${b.id}`)
      })
    }

    // 11. Le jet à vide (M46) : sa face s'allume avec son dé ; ni élan ni coup ; un battement après le dé, le statut qui
    // l'a fait tomber à vide flotte sur son porteur avec Tour perdu, et sa charge part à cet instant, pas avant
    // Les jets à vide d'un moment (deux dans une rafale du Duo) et leurs textes, dans l'ordre
    const jinxed = m.beats.map((id) => beats[id]).filter((b): b is Extract<Beat, { type: 'roll' }> => b.type === 'roll' && !!b.jinxedBy)
    jinxed.forEach((roll, n) => {
      const id = roll.id
      const jinx = roll.jinxedBy!
      count('jet à vide')
      const told = cues.filter((x) => x.cue.channel === 'float' && x.cue.side === roll.side && x.cue.float.kind === 'badge' && x.cue.float.badge.text === STATUSES[jinx].name)[n]
      // Le dé du jet : le premier des dés qui montrent sa valeur sans interruption jusqu'au texte (comme au contrôle 1)
      const dice = told ? cues.filter((x) => x.cue.channel === 'dice' && x.at <= told.at) : []
      const shows = (x: Timed) => x.cue.channel === 'dice' && !x.cue.dice.rolling && x.cue.dice.values[x.cue.dice.active ?? 0] === roll.roll
      let since = dice.length - 1
      while (since > 0 && shows(dice[since - 1])) since--
      const shown = since >= 0 && shows(dice[since]) ? dice[since] : undefined
      if (!shown || !told) {
        flag('un jet à vide sans son dé ou sans son texte', start, `étape ${id}`)
        return
      }
      // Sa face s'allume quand son dé se montre (posé, ou ressorti dans une rafale), et le texte suit sa lecture
      const lit = cues.find((x) => x.at >= shown.at && x.at <= told.at && x.cue.channel === 'skillPulse' && x.cue.side === roll.side && x.cue.face === roll.roll)
      if (!lit) flag("un jet à vide dont la face ne s'allume pas avec le dé", shown.at)
      else if (told.at - lit.at < T.DICE_READ) flag('un jet à vide qui tombe avant la lecture de son dé', told.at)
      if (!cues.some((x) => x.at === told.at && x.cue.channel === 'sound' && x.cue.cue === 'stun')) flag('un jet à vide sans Tour perdu', told.at)
      const was = stacks(beats[id - 1]?.state.statuses[roll.side] ?? [], jinx)
      const early = cues.find((x) => x.at >= shown.at && x.at < told.at && x.cue.channel === 'statuses' && stacks(x.cue.statuses[roll.side], jinx) !== was)
      if (early) flag('la charge de Malchance part avant que le jet tombe à vide', early.at)
    })

    // 12. Le soin empêché (Hémorragie) : son « 0 » barré tombe sans le son du Soin, qui dirait des PV regagnés
    for (const x of cues) {
      if (x.cue.channel !== 'float' || x.cue.float.kind !== 'badge' || !x.cue.float.badge.struck) continue
      count('soin empêché')
      if (cues.some((y) => y.cue.channel === 'sound' && y.cue.cue === 'heal' && y.at >= x.at && y.at <= x.at + T.RIDE_CUE)) flag('un soin empêché qui sonne le Soin', x.at)
    }

    // 13. Le bonus volé (Sceau de vol) : son icône file du volé vers le voleur ; à son arrivée, « Volé » sur le volé
    for (const s of cues) {
      if (s.cue.channel !== 'signal' || !s.cue.signal.icon) continue
      count('bonus volé')
      const victim = s.cue.signal.side
      const arrival = s.at + T.SIGNAL
      if (!cues.some((x) => x.at === arrival && x.cue.channel === 'float' && x.cue.side === victim && x.cue.float.kind === 'badge' && x.cue.float.badge.text === STOLEN_BADGE.text))
        flag('un bonus volé sans « Volé » sur le volé', arrival)
    }

    // 6. Le K.O. après son coup : des PV qui tombent à 0 tombent avec un coup, un coup de compétence ou un chiffre
    for (const x of cues) {
      if (x.cue.channel !== 'hp') continue
      const prev = before[index(x)].hp
      for (const side of [0, 1] as Side[]) {
        if (x.cue.hp[side] > 0 || prev[side] === 0) continue
        count('K.O.')
        const cause = cues.some(
          (y) =>
            y.at === x.at &&
            ((y.cue.channel === 'strike' && y.cue.strike?.landed && other(y.cue.strike.attacker) === side) ||
              (y.cue.channel === 'blow' && y.cue.blow?.landed && y.cue.blow.to === side) ||
              (y.cue.channel === 'float' && y.cue.side === side && (y.cue.float.kind === 'hit' || (y.cue.float.kind === 'badge' && !y.cue.float.badge.rises)))),
        )
        if (!cause) flag('un K.O. montré sans son coup', x.at)
        const after = timed.find((y) => y.at > x.at && ((y.cue.channel === 'strike' && y.cue.strike) || (y.cue.channel === 'blow' && y.cue.blow)))
        if (after) flag('un coup après le K.O.', after.at)
      }
    }

    // 9. Passage de main (M34) : le premier moment d'un tour commence par le plateau vidé et la pause du passage ; la fin
    // (M36) : le K.O., puis la victoire, puis l'écran de fin
    const root = beats[m.beats[0]]
    if (root && root.id > 0 && root.turn !== beats[root.id - 1].turn) {
      count('passage de main')
      const cleared = cues.some((x) => x.at === start && x.cue.channel === 'dice' && x.cue.dice.values.length === 0)
      if (m.spans[0]?.name !== 'HANDOVER' || !cleared) flag('un tour qui commence sans passage de main', start)
    }
    if (k === moments.length - 1 && m.spans.map((sp) => sp.name).join() !== 'KO_HOLD,VICTORY_HOLD') flag('une fin sans K.O. puis victoire', start)

    // 10. Une compétence qui pose un état visible envoie son signal de son sceau (M19) ; sauf celle qui modifie son coup,
    // dont l'effet tombe avec l'impact (M14), et celle à scène (M24)
    for (const id of m.beats) {
      const beat = beats[id]
      if (beat.type !== 'event') continue
      const def = result.fighters[beat.event.side].events.find((e) => e.id === beat.event.eventId)
      if (!def || def.scene || relationOf(def) === 'modify' || !signalTargets(beat.event.effects)) continue
      if (JSON.stringify(beats[id - 1]?.state.statuses) === JSON.stringify(beat.state.statuses)) continue
      count('compétence à signal')
      if (!cues.some((x) => x.cue.channel === 'signal' && x.cue.signal.from === beat.event.eventId)) flag('une compétence qui pose un état sans son signal', start, beat.event.eventId)
    }
  })

  // 7. Un label sous le dé reste lisible : rien ne l'efface avant son temps de lecture, la durée de son apparition (M9)
  timed.forEach((x, n) => {
    if (x.cue.channel !== 'special') return
    count('label')
    const { label } = x.cue.special
    const clear = timed.slice(n + 1).find((y) => y.cue.channel === 'specialsClear' && (!y.cue.labels || y.cue.labels.includes(label)))
    if (clear && clear.at - x.at < T.LABEL_READ) flag('un label effacé avant sa lecture', x.at, `${label}, ${clear.at - x.at} ms`)
  })

  // 8. Deux textes au même repère ne partent pas ensemble : chacun a sa place (M31, M33). Les chiffres d'une série de
  // coups se suivent au même repère, au rythme des coups : c'est leur lecture (la Conque des vents, M24)
  for (const side of [0, 1] as Side[]) {
    const floats = timed.filter((x): x is Timed & { cue: Extract<Cue, { channel: 'float' }> } => x.cue.channel === 'float' && x.cue.side === side)
    floats.forEach((x, n) => {
      const a = anchorOf(x.cue)
      for (const y of floats.slice(n + 1)) {
        if (y.at - x.at >= FLOAT_GAP) break
        if (x.cue.float.kind === 'hit' && y.cue.float.kind === 'hit') continue
        const b = anchorOf(y.cue)
        count('textes voisins')
        if (Math.abs(a.pos - b.pos) < 5 && a.rises === b.rises) flag('deux textes au même repère', y.at, `${JSON.stringify(x.cue.float)} et ${JSON.stringify(y.cue.float)}`)
      }
    })
  }
}

describe('contrôle des timings (constructions au hasard)', () => {
  it('aucune entorse au principe « dé rendu → intervalle → impact → réactions » sur des constructions tirées au hasard', () => {
    const flags: Flags = new Map()
    const seen: Record<string, number> = {}
    for (const c of corpus) control(c, flags, seen)
    const report = [...flags].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)
    expect(report).toEqual([])
    // Chaque contrôle a rencontré ses cas
    const kinds = ['coup', 'critique', 'bonus de relique', 'relique du dé', 'charge usée par un coup', 'signal', 'compétence à signal', 'coup de rafale suivi', 'K.O.', 'passage de main', 'label', 'textes voisins']
    for (const kind of kinds) expect(seen[kind] ?? 0, kind).toBeGreaterThan(20)
    // Les moments du lot 3, plus rares : chacun rencontré (compétences gravées chez leurs porteurs)
    for (const kind of ['jet à vide', 'critique raté', 'armure brisée', 'soin empêché', 'bonus volé']) expect(seen[kind] ?? 0, kind).toBeGreaterThan(3)
  })
})
