/*
 * Audit de résolution : revérifie la chronologie d'un combat étape par étape, règle par règle
 * (PV expliqués, chaîne de calcul, coup de base, compétences du dé et leur relation au coup, esquive imposée, vol de
 * vie, épines, Furie, auras, durées). Il ne fait pas confiance au moteur : il recompte à partir des
 * états avant / après. Utilisé par `audit.test.ts` (tout le roster) et `npm run logs` (les
 * combats joués par l'utilisateur, rejoués depuis leur graine). Méthode : docs/EQUILIBRAGE.md.
 * Toute nouvelle mécanique ajoute ici son contrôle.
 */
import { REWARD_HP, STAT_KEYS } from './character'
import { DAMAGE_SOURCES, type DamageKind } from './damage'
import { AURA_DUE_TURN, beatEffects, diceOf, effectiveStats, firstSide, healingOf, MAX_DODGE, MAX_EXTRA_JETS, relicIsInert, startAuraOf, type AppliedEffect, type Attack, type Beat, type CombatResult, type Side, type Snapshot } from './combat'
import { DIE_FACES, isRollTrigger, relationOf, rollMatches, type Condition, type Trigger } from './events'
import { forgeState } from './forge'
import { withRelicStats } from './relics'
import {
  BLACK_SAP_POISON,
  BLOOD_DEBT_BLEED,
  BLOOD_FRENZY_STRIKES,
  charges,
  CONFLAGRATION_TIMES,
  FAITH_SHIELD_ARMOR,
  isMechanic,
  OPEN_WOUND_BLEED,
  RAMPART_ARMOR,
  RAMPART_THORNS,
  STATUSES,
  STORM_SKY_LOSS,
  VENDETTA_MOMENTUM,
  type Status,
  type StatusId,
} from './statuses'

const find = (l: readonly Status[], id: string) => l.find((s) => s.id === id)

/** Le coup que porte une étape : une attaque, ou un renvoi (C1 : la Riposte, une jauge de la Rétribution) */
const strikeIn = (b: Beat | undefined): Attack | undefined => (b?.type === 'attack' ? b.attack : b?.type === 'statusReaction' ? b.strike : undefined)

/**
 * Une condition de relique de coup (Fiole de venin, Croc de boucher), relue sur l'état d'avant le coup, vue depuis
 * `side` : recomptée sans le moteur. `hitAtLeast` n'existe pas encore avant le coup (`validateRelics` la refuse là).
 */
function holdsBefore(c: Condition, side: Side, before: Snapshot, r: CombatResult, turn: number): boolean {
  if (c.type === 'fromTurn') return turn >= c.turn
  if (c.type === 'hitAtLeast') return false
  const who = c.who === 'opponent' ? 1 - side : side
  switch (c.type) {
    case 'hpBelow':
      return before.hp[who] < r.fighters[who].maxHp * c.ratio
    case 'hpAtLeast':
      return before.hp[who] >= r.fighters[who].maxHp * c.ratio
    case 'hasStatus':
      return (find(before.statuses[who], c.status)?.stacks ?? 0) >= (c.stacks ?? 1)
    case 'lacksStatus':
      return !find(before.statuses[who], c.status)
  }
}

/** Les trois moments de famille du second lot de la phase 8 (moteur : `combat.ts`). */
type FamilyMoment = 'shieldBroken' | 'reflected' | 'heads'

/**
 * L'étape `j` ouvre-t-elle ce moment pour `side` ? Son armure vidée : un coup qui le touche et vide un de ses boucliers
 * (il absorbe tout ce qui lui restait) ; ses dégâts renvoyés : sa Riposte qui rend une part du coup, sa Rétribution qui
 * relâche ses jauges sur l'adversaire ; sa pile : sa pièce tombée sur pile. Recompté sans le moteur.
 */
function opensMoment(r: CombatResult, j: number, side: Side, on: FamilyMoment): boolean {
  const b = r.beats[j]
  if (on === 'heads') return b.type === 'coin' && b.side === side && b.heads
  if (on === 'shieldBroken') {
    const a = strikeIn(b)
    if (!a || a.attacker === side || a.dodged || a.replaced) return false
    const before = j > 0 ? r.beats[j - 1].state.statuses[side] : []
    return a.shields.some((sh) => find(before, sh.status)?.stacks === sh.absorbed)
  }
  const returned = (e: AppliedEffect | undefined) => e?.type === 'damage' && e.target !== side && e.amount > 0
  if (b.type !== 'statusReaction' || !b.strike || b.side !== side) return false
  // Sa Riposte qui touche ; ses jauges relâchées (C1) : des renvois, coups à part, le moment une fois, après le dernier,
  // si l'un d'eux a touché
  if (STATUSES[b.status].reflectsHit) return b.effects.some(returned)
  const parts = r.beats.filter((x) => x.cause === b.cause && x.type === 'statusReaction' && !!x.strike)
  return parts[parts.length - 1] === b && parts.some((x) => x.type === 'statusReaction' && x.effects.some(returned))
}

/**
 * Les étapes qui découlent de `j`, de proche en proche (ses réactions, ce que celles-ci déclenchent : une relique de seuil
 * après une relique de face, une Sentence après le soin d'un Vol de vie) : toutes les fenêtres ouvertes par cette étape.
 */
function descendantsOf(r: CombatResult, j: number): Beat[] {
  const ids = new Set([j])
  const out: Beat[] = []
  for (const b of r.beats.slice(j + 1))
    if (b.cause !== undefined && ids.has(b.cause)) {
      ids.add(b.id)
      out.push(b)
    }
  return out
}

/** Un audit qui accumule les anomalies (par type, avec un exemple) et les mécaniques rencontrées. */
export function createAudit() {
  const problems = new Map<string, { n: number; example: string }>()
  const flag = (kind: string, r: CombatResult, i: number, detail: string) => {
    const p = problems.get(kind) ?? { n: 0, example: `${r.fighters[0].id}-${r.fighters[1].id} graine ${r.seed} étape ${i} (tour ${r.beats[i]?.turn}) : ${detail}` }
    p.n++
    problems.set(kind, p)
  }

  const seen: Record<string, number> = {}
  const see = (k: string) => (seen[k] = (seen[k] ?? 0) + 1)
  function audit(r: CombatResult) {
    for (const b of r.beats) {
      if (b.type === 'attack') { if (b.attack.replaced) see('jet remplacé'); if (b.attack.dodgeForced) see('esquive imposée'); if (b.attack.shieldAbsorbed) see('bouclier'); if (b.attack.critForced) see('critique assuré') }
      if (b.type === 'roll') see('jet greffé')
      if (b.type === 'statusReaction') see(`réaction ${b.status}`)
      if (b.type === 'flurry') see('furie')
      if (b.type === 'statusTick') see(`tick ${b.status}`)
      if (b.type === 'event') see(`compétence ${b.event.name}`)
    }
    // Familles de dégâts (règles v2, phase 1, damage.ts) : chaque dégât porte une source connue ; un statut qui agit fait
    // des DT ; une pièce et une Riposte, des coups (décisions de l'utilisateur)
    r.beats.forEach((b, i) => {
      for (const e of beatEffects(b)) {
        if (e.type !== 'damage') continue
        const def = DAMAGE_SOURCES[e.source]
        if (!def) {
          flag('dégât sans type', r, i, `source ${e.source}`)
          continue
        }
        see(`dégâts ${def.kind === 'temporal' ? 'temporaires' : "de l'instant"}`)
        // Un statut qui agit sur son porteur ronge (DT) ; un tick qui frappe l'adversaire (Ciel d'orage, lot 3) est un dégât
        // direct, de l'instant, comme la Foudre
        const tick = b.type === 'statusTick' ? (e.target === b.side ? 'temporal' : 'instant') : undefined
        const expected: DamageKind | undefined = tick ?? (b.type === 'coin' || (b.type === 'statusReaction' && b.strike) ? 'instant' : undefined)
        if (expected && def.kind !== expected) flag('type de dégâts incohérent', r, i, `${b.type} : ${def.kind} au lieu de ${expected}`)
      }
    })
    // Mode triche : seuls les dés de `forcedRolls` sont marqués imposés, avec leur valeur (ramenée au dé)
    let rank = 0
    r.beats.forEach((b, i) => {
      diceOf(b).forEach((die) => {
        const asked = r.forcedRolls?.[rank++]
        const marked = b.type === 'attack' ? b.attack.forced : b.type === 'coin' || b.type === 'roll' ? b.forced : undefined
        if (!!marked !== (asked !== undefined)) flag('dé imposé incohérent', r, i, `rang ${rank - 1} : marqué ${!!marked}, demandé ${asked}`)
        if (asked === undefined) return
        see('dé imposé')
        const value = b.type === 'attack' ? b.attack.roll : b.type === 'roll' ? b.roll : b.type === 'coin' ? (b.heads ? 1 : 2) : 0
        if (value !== Math.min(die.faces, Math.max(1, asked))) flag('dé imposé ignoré', r, i, `rang ${rank - 1} : ${value} au lieu de ${asked}`)
      })
    })
    auditCauses(r)
    // Statuts de forme (0.73.0) : un personnage à formes commence avec ceux de sa première forme
    const startStatuses = (side: 0 | 1) => (r.fighters[side].forms?.[0].statuses ?? []).map((id) => ({ id, stacks: 1 }))
    const init: Snapshot = { hp: [r.fighters[0].maxHp, r.fighters[1].maxHp], statuses: [startStatuses(0), startStatuses(1)] }
    const first = firstSide(r)
    const active = (t: number) => (t % 2 === 1 ? first : 1 - first)
    // Forme en cours de chaque camp (druide) : une compétence de forme n'existe que sous sa forme
    const form = [0, 0]
    const inForm = (side: number, e: { form?: string }) => !e.form || e.form === r.fighters[side].forms?.[form[side]].id
    const stateBefore = (i: number) => (i ? r.beats[i - 1].state : init)
    /**
     * Un coup qui touche (attaque, ou pile qui touche) : une seule règle depuis le 2026-10-21. Ce qui réagit à un coup
     * qui touche réagit dans ses fenêtres, avec ce coup pour cause : Vol de vie (une charge, les PV retirés rendus),
     * Riposte (une charge, la part renvoyée), jauges (le coup rangé), Épines, Saignement. Seul un statut déjà là au début
     * du coup y réagit, avec au plus ses charges de ce moment (règle 9) : une plaie ouverte par ce coup attend le suivant.
     */
    const touchControls = (i: number, striker: Side, dealt: number, rebound = false) => {
      const target = (1 - striker) as Side
      const s = r.beats[i].state
      const coin = r.beats[i].type === 'coin'
      const caused = r.beats.filter((x) => x.cause === i)
      // Le combat fini dans les fenêtres du coup, de proche en proche (une Sentence après le soin d'un Vol de vie) : ce
      // qui attendait une fenêtre suivante ne part plus
      const within = descendantsOf(r, i)
      const died = within.some((x) => x.state.hp.some((h) => h === 0))
      const reaction = (id: string) => caused.find((x): x is Extract<Beat, { type: 'statusReaction' }> => x.type === 'statusReaction' && x.status === id)
      const before = (x: Beat) => r.beats[x.id - 1].state
      // Vol de vie
      const drained = reaction('lifesteal')
      if (find(s.statuses[striker], 'lifesteal') && !drained && !died) flag('vol de vie non appliqué', r, i, '')
      if (drained) {
        const was = before(drained)
        const heal = drained.effects[0]
        // Aiguisé (0.110.0) : son intensité s'ajoute aux PV rendus
        const more = find(was.statuses[striker], 'lifesteal')?.power ?? 0
        // Hémorragie (lot 3) : le soin passe par les filtres du soigné (0 chez un porteur)
        const wanted = healingOf(dealt + more, was.statuses[striker])
        if (heal?.type !== 'heal' || heal.amount !== Math.min(wanted, r.fighters[striker].maxHp - was.hp[striker])) flag('vol de vie : montant faux', r, i, `${JSON.stringify(heal)} vs dealt ${dealt}`)
        if ((find(drained.state.statuses[striker], 'lifesteal')?.stacks ?? 0) !== (find(was.statuses[striker], 'lifesteal')?.stacks ?? 0) - 1) flag('vol de vie non consommé', r, i, '')
        see(coin ? 'pile : vol de vie' : 'vol de vie')
      }
      // Riposte (C1) : un renvoi, coup sans dé de la moitié des PV retirés (plus son intensité), résolu comme un coup
      // (`resolution`) ; une charge part, qu'il touche ou soit esquivé. Aucun renvoi ne répond à un renvoi (R1)
      const riposted = reaction('riposte')
      if (rebound) {
        if (riposted) flag('renvoi d’un renvoi', r, i, '')
        else if (find(s.statuses[target], 'riposte')) see('riposte muette sur un renvoi')
      } else {
        if (find(s.statuses[target], 'riposte') && !riposted && !died) flag('riposte non déclenchée', r, i, '')
        if (riposted) {
          const was = before(riposted)
          const more = find(was.statuses[target], 'riposte')?.power ?? 0
          if (riposted.strike?.attacker !== target || riposted.strike.value !== Math.round(dealt * STATUSES.riposte.reflectsHit!) + more)
            flag('riposte : valeur fausse', r, i, `${riposted.strike?.value} vs dealt ${dealt}`)
          if ((find(riposted.state.statuses[target], 'riposte')?.stacks ?? 0) !== (find(was.statuses[target], 'riposte')?.stacks ?? 0) - 1) flag('riposte non consommée', r, i, '')
          see(riposted.strike?.dodged ? 'riposte esquivée' : coin ? 'pile : riposte' : 'riposte')
        }
      }
      // Jauges (Rétribution) : le coup est rangé dans la plus récente
      for (const id of Object.keys(STATUSES) as (keyof typeof STATUSES)[]) {
        if (!STATUSES[id].fillsOnHurt || !r.fighters[target].events.some((e) => e.effects.some((x) => x.type === 'release' && x.status === id))) continue
        const filled = reaction(id)
        if (!filled) {
          if (!died) flag('jauges non remplies', r, i, id)
          continue
        }
        const slots = find(filled.state.statuses[target], id)?.slots ?? []
        if (slots[slots.length - 1] !== dealt || slots.length > STATUSES[id].fillsOnHurt!.slots) flag('jauges : coup mal rangé', r, i, `${slots.join(' · ')} vs ${dealt}`)
        else see(coin ? 'pile : jauges' : 'jauges')
      }
      // Rancune (0.114.0) : chaque coup qui touche son porteur lui donne un Critique assuré, puis une charge part ; seule
      // une Rancune déjà là au début du coup y réagit (règle 9)
      const grudged = reaction('grudge')
      if (find(stateBefore(i).statuses[target], 'grudge') && !grudged && !died) flag('rancune non déclenchée', r, i, '')
      if (grudged) {
        const was = before(grudged)
        const crit = grudged.effects[0]
        if (grudged.effects.length !== 1 || crit?.type !== 'applyStatus' || crit.status !== 'guaranteedCrit' || crit.target !== target || crit.stacks !== 1)
          flag('rancune : effet faux', r, i, JSON.stringify(grudged.effects))
        if ((find(grudged.state.statuses[target], 'grudge')?.stacks ?? 0) !== (find(was.statuses[target], 'grudge')?.stacks ?? 0) - 1) flag('rancune non estompée', r, i, '')
        see(coin ? 'pile : rancune' : 'rancune')
      }
      // Épines
      if (find(s.statuses[target], 'thorns') && !reaction('thorns') && !died) flag('épines non déclenchées', r, i, '')
      // Saignement : la plaie coule de ses charges du début du coup (au plus de celles qui lui restent), puis en perd une
      const flow = reaction('bleed')
      const atStart = find(stateBefore(i).statuses[target], 'bleed')?.stacks ?? 0
      if (flow) {
        const was = find(before(flow).statuses[target], 'bleed')?.stacks ?? 0
        const amount = flow.effects.reduce((t, e) => t + (e.type === 'damage' && e.target === target ? e.amount : 0), 0)
        if (amount !== Math.min(was, atStart)) flag('saignement : montant faux', r, i, `${amount} vs ${Math.min(was, atStart)}`)
        const left = find(flow.state.statuses[target], 'bleed')?.stacks ?? 0
        if (flow.state.hp[target] > 0 && left !== was - 1) flag('saignement non estompé', r, i, `${was} → ${left}`)
        else see('saignement')
        if (was > atStart) see('plaie grossie pendant le coup, qui coule de ses charges du début')
      } else {
        // L'état au bout des fenêtres du coup : une purge entre-temps (Larme de givre, relique de seuil après l'Osselet
        // fendu) retire la plaie avant qu'elle coule
        const end = within.length ? within[within.length - 1].state : s
        const left = find(end.statuses[target], 'bleed')
        if (left && atStart && !died) flag('saignement non déclenché', r, i, '')
        else if (left && !atStart) see('plaie ouverte pendant le coup, qui attend le suivant')
      }
    }
    // L'aura de départ au rendez-vous (2026-10-27, C2) : tours entamés par chacun, et son aura de départ
    const taken = [0, 0]
    const starts = [startAuraOf(r.fighters[0]), startAuraOf(r.fighters[1])]
    r.beats.forEach((b: Beat, i) => {
      if (b.type === 'shift') {
        see('changement de forme')
        if (!r.fighters[b.side].forms) flag('changement de forme sans formes', r, i, '')
        if (b.side !== active(b.turn)) flag('changement de forme hors de son tour', r, i, '')
        if (b.turn === (b.side === first ? 1 : 2)) flag('changement de forme au premier tour', r, i, '')
        if (b.form !== 1 - form[b.side]) flag('changement de forme qui ne bascule pas', r, i, `${form[b.side]} → ${b.form}`)
        const before = i ? r.beats[i - 1] : undefined
        if (before && before.turn === b.turn) flag("changement de forme après le début du tour", r, i, before.type)
        form[b.side] = b.form
      }
      const prev = i ? r.beats[i - 1].state : init
      const s = b.state
      // Statuts de forme (0.73.0) : exactement ceux de la forme du moment, ni purgés ni oubliés au changement
      for (const side of [0, 1] as const) {
        const forms = r.fighters[side].forms
        if (!forms) continue
        const expected = [...(forms[form[side]].statuses ?? [])].sort().join()
        const actual = s.statuses[side].filter((x) => STATUSES[x.id].mechanic === 'form').map((x) => x.id).sort().join()
        if (actual !== expected) flag('statuts de forme incohérents', r, i, `${actual} au lieu de ${expected}`)
        else if (expected) see('statut de forme')
      }
      // PV : chaque variation s'explique par l'étape
      for (const side of [0, 1] as const) {
        let delta = 0
        for (const e of beatEffects(b)) if (e.target === side) delta += e.type === 'heal' ? e.amount : e.type === 'damage' ? -e.amount : 0
        if (b.type === 'attack' && b.attack.attacker !== side) delta -= b.attack.dealt
        // Dégâts comptés en entier (overkill) : les PV, eux, s'arrêtent à 0 ; à 1 si une Médaille de sursis le garde (son
        // étape suit celle-ci, 2026-10-27)
        const next = r.beats[i + 1]
        const spared =
          next?.type === 'relic' && next.cause === i && next.side === side && r.fighters[side].relics.some((x) => x.id === next.relic && x.trigger?.type === 'lethal')
        if (s.hp[side] !== Math.max(spared ? 1 : 0, prev.hp[side] + delta)) flag('PV inexpliqués', r, i, `${b.type} côté ${side} : ${prev.hp[side]} → ${s.hp[side]}, attendu ${delta}`)
        if (s.hp[side] < 0 || s.hp[side] > r.fighters[side].maxHp) flag('PV hors bornes', r, i, `${s.hp[side]}`)
        const ids = s.statuses[side].map((x) => x.id)
        if (new Set(ids).size !== ids.length) flag('statut en double', r, i, ids.join(','))
        for (const st of s.statuses[side]) {
          const cap = STATUSES[st.id].maxStacks
          if (cap !== undefined && st.stacks > cap) flag('plafond dépassé', r, i, `${st.id} ${st.stacks}`)
          if (st.stacks <= 0 || (st.turns !== undefined && st.turns <= 0)) flag('statut vide', r, i, `${st.id}`)
          // Des charges, des tours et une intensité entiers et finis (une croissance sans borne, la Veine avant le plafond
          // du Coup de chance, finissait en Infinity puis en plantage)
          if (![st.stacks, st.turns ?? 0, st.power ?? 0].every(Number.isSafeInteger)) flag('charges non entières ou infinies', r, i, `${st.id} ${st.stacks}/${st.turns}/${st.power}`)
        }
      }
      if (i > 0 && prev.hp.some((h) => h === 0)) flag('étape après K.O.', r, i, b.type)
      if (b.type === 'flurry' && (!Number.isSafeInteger(b.strikes) || b.strikes < 1 || b.faces.length !== b.strikes)) flag('rafale : nombre de coups faux', r, i, `${b.strikes}`)
      if (i === 0 || r.beats[i - 1].turn !== b.turn) if (b.turn > 0) taken[b.owner]++
      if (b.type === 'event' && b.event.trigger === 'auraDue') {
        const start = starts[b.event.side]
        if (!start || start.event.id !== b.event.eventId) flag("pose d'office d'autre chose que l'aura de départ", r, i, b.event.eventId)
        else if (prev.statuses[b.event.side].some((x) => x.id === start.status)) flag("pose d'office d'une aura déjà là", r, i, start.status)
        if (taken[b.event.side] < AURA_DUE_TURN || b.owner !== b.event.side || b.phase !== 'turnStart') flag("pose d'office hors du début de son 3e tour", r, i, `${taken[b.event.side]}`)
        else see("aura de départ posée d'office")
      }
      // Le druide excepté (son 1 ne vaut que sous une forme) : à la première action de son 3e tour, l'aura de départ est là,
      // sauf si sa pose d'office a été volée (Sceau de vol : elle est partie chez l'adversaire)
      const start = starts[b.owner]
      if (start && !r.fighters[b.owner].forms && b.phase === 'action' && taken[b.owner] === AURA_DUE_TURN && r.beats[i - 1]?.phase !== 'action')
        if (!prev.statuses[b.owner].some((x) => x.id === start.status)) {
          const stolen = r.beats.some((x) => x.turn === b.turn && x.type === 'event' && x.event.trigger === 'auraDue' && x.event.effects.some((e) => e.type === 'applyStatus' && e.stolenBy !== undefined))
          if (stolen) see("aura de départ volée à sa pose d'office")
          else flag('aura de départ absente après le début de son 3e tour', r, i, start.status)
        }
      // Purge avec repli (0.42.0, Purification) : le repli ne joue que s'il n'y avait rien à retirer
      if (b.type === 'event') {
        const asked = r.fighters[b.event.side].events.find((e) => e.id === b.event.eventId)?.effects
        asked?.forEach((effect, k) => {
          const applied = b.event.effects[k]
          if (effect.type !== 'cleanse' || !effect.orElse || !applied) return
          const target = effect.target === 'opponent' ? 1 - b.event.side : b.event.side
          const had = prev.statuses[target].some((x) => STATUSES[x.id].polarity === effect.polarity && !isMechanic(x.id))
          if (applied.type === 'cleanse' && applied.removed.length === 0) flag('purge à vide malgré son repli', r, i, b.event.name)
          if (applied.type !== 'cleanse' && had) flag('repli joué alors qu’il y avait à retirer', r, i, b.event.name)
          if (applied.type !== 'cleanse') see('repli de purge')
        })
        // Dégâts en plusieurs coups (0.76.0, Foudre) : autant de coups que `hits`, chacun du montant demandé
        asked?.forEach((effect, k) => {
          const applied = b.event.effects[k]
          if (effect.type !== 'damage' || !effect.hits || applied?.type !== 'damage') return
          if (applied.parts?.length !== effect.hits || applied.parts.some((n) => n !== effect.amount) || applied.amount !== effect.amount * effect.hits)
            flag('coups multiples faux', r, i, `${b.event.name} ${JSON.stringify(applied)}`)
          else see('coups multiples')
        })
        // Charges tirées du coup (0.107.0, Pourfendre) : la part des PV que le coup qui l'a fait partir a retirés, arrondie
        // au-dessus, plus les charges de la définition
        asked?.forEach((effect, k) => {
          const applied = b.event.effects[k]
          const hit = b.cause !== undefined ? r.beats[b.cause] : undefined
          if (effect.type !== 'applyStatus' || effect.fromHit === undefined || applied?.type !== 'applyStatus') return
          if (hit?.type !== 'attack' || applied.stacks !== effect.stacks + Math.ceil(hit.attack.dealt * effect.fromHit))
            flag('charges tirées du coup fausses', r, i, `${b.event.name} ${applied.stacks}`)
          else see('charges tirées du coup')
        })
        // Charges tirées d'un statut (0.114.0, Virulence) : `factor` fois ses charges chez son porteur juste avant l'étape,
        // plus celles de la définition ; le même statut sur la même cible, sans plafond ni opposition, se multiplie
        asked?.forEach((effect, k) => {
          const applied = b.event.effects[k]
          if (effect.type !== 'applyStatus' || effect.fromStatus === undefined || applied?.type !== 'applyStatus') return
          const from = effect.fromStatus
          const holder = from.who === 'opponent' ? 1 - b.event.side : b.event.side
          const read = find(prev.statuses[holder], from.status)?.stacks ?? 0
          const now = find(s.statuses[holder], from.status)?.stacks ?? 0
          const multiplies = from.status === applied.status && holder === applied.target && applied.result.kind === 'applied' && !applied.result.cancelled && STATUSES[from.status].maxStacks === undefined
          // Un statut qui se remplace (Attiser, lot 3 : la Brûlure) ne s'additionne pas : il repart, de ses charges d'avant
          // plus celles de la définition
          const refresh = STATUSES[from.status].stacking === 'refresh'
          if (applied.stacks !== effect.stacks + from.factor * read) flag('charges tirées d’un statut fausses', r, i, `${b.event.name} ${applied.stacks} pour ${read}`)
          else if (multiplies && refresh && now !== applied.stacks) flag('statut qui repart faux', r, i, `${b.event.name} ${read} → ${now}`)
          else if (multiplies && !refresh && now !== read * (from.factor + 1) + effect.stacks) flag('statut multiplié faux', r, i, `${b.event.name} ${read} → ${now}`)
          else see(multiplies && refresh ? 'statut qui repart' : 'charges tirées d’un statut')
        })
        // Relâche en part (0.107.0, Rétribution) : la part des jauges, arrondie au-dessous, au moins le minimum ; ses propres
        // jauges partent en renvois (C1), leur somme la part
        asked?.forEach((effect, k) => {
          const applied = b.event.effects[k]
          if (effect.type !== 'release' || effect.share === undefined || (applied?.type !== 'damage' && applied?.type !== 'rebound')) return
          const stored = find(prev.statuses[b.event.side], effect.status)?.stacks ?? 0
          const amount = applied.type === 'rebound' ? applied.parts.reduce((t, n) => t + n, 0) : applied.amount
          if (amount !== Math.max(effect.min, Math.floor(stored * effect.share))) flag('relâche en part fausse', r, i, `${amount} sur ${stored}`)
          else see('relâche en part')
        })
        // Purge (0.69.0, Purification double) : elle retire exactement les `count` derniers statuts de sa polarité
        asked?.forEach((effect, k) => {
          const applied = b.event.effects[k]
          if (effect.type !== 'cleanse' || applied?.type !== 'cleanse') return
          const target = effect.target === 'opponent' ? 1 - b.event.side : b.event.side
          const matching = prev.statuses[target].filter((x) => STATUSES[x.id].polarity === effect.polarity && !isMechanic(x.id)).map((x) => x.id)
          const expected = effect.count === undefined ? matching : matching.slice(-effect.count)
          if (applied.removed.join() !== expected.join()) flag('purge : mauvais statuts retirés', r, i, `${applied.removed.join()} vs ${expected.join()}`)
          if (target === b.event.side && effect.polarity === 'negative' && applied.removed.length) see('purge de ses malus')
          if (prev.statuses[target].some((x) => isMechanic(x.id) && STATUSES[x.id].polarity === effect.polarity)) see('purge face à un mécanisme')
        })
      }
      // Sentence (0.114.0) : chaque soin de son porteur (une étape qui lui rend des PV) la fait réagir une fois, avec
      // l'étape soignante pour cause, de ses charges du moment (le registre le dit) ; sa perte ne soigne rien : sans chaîne
      if (b.type === 'statusReaction' && b.status === 'sentence') {
        const held = find(prev.statuses[b.side], 'sentence')
        const cause = b.cause !== undefined ? r.beats[b.cause] : undefined
        const healedBy = !!cause && beatEffects(cause).some((e) => e.type === 'heal' && e.target === b.side && e.amount > 0)
        const asked = held ? STATUSES.sentence.reactions?.healed?.(held) : undefined
        const loss = b.effects[0]
        if (b.trigger !== 'healed' || !held || !healedBy) flag('sentence hors d’un soin', r, i, `${b.trigger} ${cause?.type}`)
        else if (b.effects.length !== 1 || loss?.type !== 'damage' || loss.target !== 1 - b.side || asked?.[0]?.type !== 'damage' || loss.amount !== asked[0].amount)
          flag('sentence : perte fausse', r, i, JSON.stringify(b.effects))
        else see('sentence')
      } else
        for (const side of [0, 1] as const) {
          if (!find(prev.statuses[side], 'sentence') || !beatEffects(b).some((e) => e.type === 'heal' && e.target === side && e.amount > 0)) continue
          const caused = r.beats.filter((x) => x.cause === i)
          const reacted = caused.some((x) => x.type === 'statusReaction' && x.status === 'sentence' && x.side === side)
          if (!reacted && !caused.some((x) => x.state.hp.some((h) => h === 0)) && s.hp.every((h) => h > 0)) flag('sentence non déclenchée', r, i, `${b.type} côté ${side}`)
        }
      // Phase 8, second lot. Rempart hérissé : il réagit au coup qui vide une armure temporaire de son porteur (ce coup pour
      // cause), de ses charges du début du coup : 2 Épines acérées et 2 armure temporaire par charge (l'armure depuis la
      // revue des auras, A3). Vindicte : à chaque étape où son porteur renvoie des dégâts (Riposte, Rétribution), cette
      // étape pour cause : 6 Ferveur par charge. Embrasement : au coup qui touche un adversaire qui brûle, il relâche sa
      // Brûlure (3 fois ce qu'elle ferait encore perdre), l'éteint et perd une charge. Revue des compétences (I1, I4) : le
      // Bouclier de foi à chaque soin reçu, 2 armure temporaire par charge ; la Plaie ouverte à chaque critique de son
      // porteur qui touche, de ses charges du début du coup, 3 Saignement par charge à l'adversaire. Chacun part à chaque
      // fois, sauf si le combat finit avant (dans une fenêtre de l'étape, de proche en proche)
      const diedAfter = (j: number) => [r.beats[j], ...descendantsOf(r, j)].some((x) => x.state.hp.includes(0))
      const reactedTo = (j: number, side: Side, id: string) => r.beats.some((x) => x.cause === j && x.type === 'statusReaction' && x.status === id && x.side === side)
      if (b.type === 'statusReaction' && b.status === 'bristlingRampart') {
        const held = b.cause !== undefined ? find(stateBefore(b.cause).statuses[b.side], 'bristlingRampart') : undefined
        const [thorns, armor] = b.effects
        if (b.trigger !== 'shieldBroken' || b.cause === undefined || !held || !opensMoment(r, b.cause, b.side, 'shieldBroken')) flag('rempart hors d’une armure vidée', r, i, `${b.trigger}`)
        else if (
          b.effects.length !== 2 ||
          thorns?.type !== 'applyStatus' ||
          thorns.status !== 'thorns' ||
          thorns.target !== b.side ||
          thorns.stacks !== RAMPART_THORNS * charges(held) ||
          armor?.type !== 'applyStatus' ||
          armor.status !== 'bonusArmor' ||
          armor.target !== b.side ||
          armor.stacks !== RAMPART_ARMOR * charges(held)
        )
          flag('rempart : épines ou armure fausses', r, i, JSON.stringify(b.effects))
        else see('rempart hérissé')
      }
      if (b.type === 'statusReaction' && b.status === 'faithShield') {
        const held = find(prev.statuses[b.side], 'faithShield')
        const cause = b.cause !== undefined ? r.beats[b.cause] : undefined
        const healedBy = !!cause && beatEffects(cause).some((e) => e.type === 'heal' && e.target === b.side && e.amount > 0)
        const armor = b.effects[0]
        if (b.trigger !== 'healed' || !held || !healedBy) flag('bouclier de foi hors d’un soin', r, i, `${b.trigger} ${cause?.type}`)
        else if (b.effects.length !== 1 || armor?.type !== 'applyStatus' || armor.status !== 'bonusArmor' || armor.target !== b.side || armor.stacks !== FAITH_SHIELD_ARMOR * charges(held))
          flag('bouclier de foi : armure fausse', r, i, JSON.stringify(b.effects))
        else see('bouclier de foi')
      }
      if (b.type === 'statusReaction' && b.status === 'openWound') {
        const held = b.cause !== undefined ? find(stateBefore(b.cause).statuses[b.side], 'openWound') : undefined
        const cause = b.cause !== undefined ? r.beats[b.cause] : undefined
        // Refaite avec les Maîtrises (M9) : à chaque coup qui touche (une pile qui touche comprise)
        const touched =
          (!!strikeIn(cause) && strikeIn(cause)!.attacker === b.side && !strikeIn(cause)!.dodged && !strikeIn(cause)!.replaced) || (cause?.type === 'coin' && cause.side === b.side && cause.heads)
        const wound = b.effects[0]
        if (b.trigger !== 'hit' || !touched || !held) flag('plaie ouverte hors d’un coup qui touche', r, i, `${b.trigger} ${cause?.type}`)
        else if (b.effects.length !== 1 || wound?.type !== 'applyStatus' || wound.status !== 'bleed' || wound.target !== 1 - b.side || wound.stacks !== OPEN_WOUND_BLEED * charges(held))
          flag('plaie ouverte : saignement faux', r, i, JSON.stringify(b.effects))
        else see('plaie ouverte')
      }
      if (b.type === 'statusReaction' && b.status === 'vendetta') {
        const held = find(prev.statuses[b.side], 'vendetta')
        const fervor = b.effects[0]
        if (b.trigger !== 'reflected' || b.cause === undefined || !held || !opensMoment(r, b.cause, b.side, 'reflected')) flag('vindicte hors d’un renvoi', r, i, `${b.trigger}`)
        // Un Sceau de vol (Confiscation) détourne la Ferveur vers l'adversaire (`stolenBy`), comme pour la Feinte
        else if (b.effects.length !== 1 || fervor?.type !== 'applyStatus' || fervor.status !== 'momentum' || fervor.target !== (fervor.stolenBy ? 1 - b.side : b.side) || fervor.stacks !== VENDETTA_MOMENTUM * charges(held))
          flag('vindicte : ferveur fausse', r, i, JSON.stringify(b.effects))
        else see('vindicte')
      }
      if (b.type === 'statusReaction' && b.status === 'conflagration') {
        const held = find(prev.statuses[b.side], 'conflagration')
        const burn = find(prev.statuses[1 - b.side], 'burn')
        const cause = b.cause !== undefined ? r.beats[b.cause] : undefined
        const struck = (!!strikeIn(cause) && strikeIn(cause)!.attacker === b.side && !strikeIn(cause)!.dodged && !strikeIn(cause)!.replaced) || (cause?.type === 'coin' && cause.side === b.side && cause.heads)
        const loss = b.effects[0]
        const wanted = held && burn ? Math.floor(STATUSES.burn.releases!(burn) * (CONFLAGRATION_TIMES + (held.power ?? 0))) : 0
        if (b.trigger !== 'hit' || !struck || !held || !burn) flag('embrasement hors d’un coup sur un adversaire qui brûle', r, i, `${b.trigger} ${cause?.type}`)
        else if (b.effects.length !== 1 || loss?.type !== 'damage' || loss.target !== 1 - b.side || loss.amount !== wanted) flag('embrasement : relâche fausse', r, i, `${JSON.stringify(b.effects)} pour ${wanted}`)
        else if (find(s.statuses[1 - b.side], 'burn') || (find(s.statuses[b.side], 'conflagration')?.stacks ?? 0) !== held.stacks - 1) flag('embrasement : brûlure ou charge restée', r, i, '')
        else see('embrasement')
      }
      // Phase 8, lot 3 : la Feinte réagit à chaque esquive de son porteur (un coup adverse esquivé, pas le raté d'un
      // aveuglé), un critique assuré ; la Sève noire à chaque soin reçu, 4 Poison par charge à l'adversaire ; la Dette de
      // sang à chaque renvoi, 3 Saignement par charge ; l'Ivresse du sang à chaque critique qui touche, deux coups bruts.
      // Chacune de ses charges du début de l'étape (du coup pour l'esquive et le critique)
      if (b.type === 'statusReaction' && b.status === 'feint') {
        const held = b.cause !== undefined ? find(stateBefore(b.cause).statuses[b.side], 'feint') : undefined
        const cause = b.cause !== undefined ? r.beats[b.cause] : undefined
        const dodged = !!strikeIn(cause) && strikeIn(cause)!.attacker === 1 - b.side && strikeIn(cause)!.dodged && !strikeIn(cause)!.blindedBy
        const crit = b.effects[0]
        if (b.trigger !== 'dodge' || !dodged || !held) flag('feinte hors d’une esquive', r, i, `${b.trigger} ${cause?.type}`)
        // Un Sceau de vol (Confiscation) détourne le critique vers l'adversaire (`stolenBy`)
        else if (b.effects.length !== 1 || crit?.type !== 'applyStatus' || crit.status !== 'guaranteedCrit' || crit.target !== (crit.stolenBy ? 1 - b.side : b.side) || crit.stacks !== 1)
          flag('feinte : critique faux', r, i, JSON.stringify(b.effects))
        else see('feinte')
      }
      if (b.type === 'statusReaction' && b.status === 'blackSap') {
        const held = find(prev.statuses[b.side], 'blackSap')
        const cause = b.cause !== undefined ? r.beats[b.cause] : undefined
        const healedBy = !!cause && beatEffects(cause).some((e) => e.type === 'heal' && e.target === b.side && e.amount > 0)
        const poison = b.effects[0]
        if (b.trigger !== 'healed' || !held || !healedBy) flag('sève noire hors d’un soin', r, i, `${b.trigger} ${cause?.type}`)
        else if (b.effects.length !== 1 || poison?.type !== 'applyStatus' || poison.status !== 'poison' || poison.target !== 1 - b.side || poison.stacks !== BLACK_SAP_POISON * charges(held))
          flag('sève noire : poison faux', r, i, JSON.stringify(b.effects))
        else see('sève noire')
      }
      if (b.type === 'statusReaction' && b.status === 'bloodDebt') {
        const held = find(prev.statuses[b.side], 'bloodDebt')
        const bleed = b.effects[0]
        if (b.trigger !== 'reflected' || b.cause === undefined || !held || !opensMoment(r, b.cause, b.side, 'reflected')) flag('dette de sang hors d’un renvoi', r, i, `${b.trigger}`)
        else if (b.effects.length !== 1 || bleed?.type !== 'applyStatus' || bleed.status !== 'bleed' || bleed.target !== 1 - b.side || bleed.stacks !== BLOOD_DEBT_BLEED * charges(held))
          flag('dette de sang : saignement faux', r, i, JSON.stringify(b.effects))
        else see('dette de sang')
      }
      if (b.type === 'statusReaction' && b.status === 'bloodFrenzy') {
        const held = b.cause !== undefined ? find(stateBefore(b.cause).statuses[b.side], 'bloodFrenzy') : undefined
        const cause = b.cause !== undefined ? r.beats[b.cause] : undefined
        const crit = !!strikeIn(cause) && strikeIn(cause)!.attacker === b.side && strikeIn(cause)!.crit && !strikeIn(cause)!.dodged && !strikeIn(cause)!.replaced
        const strikes = b.effects[0]
        if (b.trigger !== 'crit' || !crit || !held) flag('ivresse du sang hors d’un critique', r, i, `${b.trigger} ${cause?.type}`)
        else if (b.effects.length !== 1 || strikes?.type !== 'applyStatus' || strikes.status !== 'bloodFrenzyStrike' || strikes.target !== b.side || strikes.stacks !== BLOOD_FRENZY_STRIKES)
          flag('ivresse du sang : coups faux', r, i, JSON.stringify(b.effects))
        else see('ivresse du sang')
      }
      // Ciel d'orage : au début de chaque tour de son porteur, avant son coup, un éclair de 1 PV par charge à l'adversaire
      if (b.type === 'statusTick' && b.status === 'stormSky') {
        const held = find(prev.statuses[b.side], 'stormSky')
        const bolt = b.effects[0]
        if (b.phase !== 'turnStart' || !held) flag('ciel d’orage hors du début de tour', r, i, `${b.phase}`)
        else if (
          b.effects.length !== 1 ||
          bolt?.type !== 'damage' ||
          bolt.target !== 1 - b.side ||
          bolt.amount !== STORM_SKY_LOSS * charges(held) ||
          (bolt.parts?.length ?? 1) !== charges(held)
        )
          flag('ciel d’orage : éclairs faux', r, i, JSON.stringify(b.effects))
        else see('ciel d’orage')
      }
      // Une action perdue (Peur, Étourdi) : le porteur détenait le statut de contrôle, en perd une charge, et ne frappe pas
      if (b.type === 'skip') {
        const held = find(prev.statuses[b.side], b.status)
        const left = find(s.statuses[b.side], b.status)?.stacks ?? 0
        if (!STATUSES[b.status].skipsAction || !held || left !== held.stacks - 1) flag('action perdue sans contrôle', r, i, `${b.status}`)
        else if (r.beats.some((x) => x.turn === b.turn && x.type === 'attack' && x.attack.attacker === b.side)) flag('action perdue : il frappe quand même', r, i, '')
        else see(`action perdue : ${b.status}`)
      }
      for (const side of [0, 1] as const) {
        if (opensMoment(r, i, side, 'shieldBroken') && find(prev.statuses[side], 'bristlingRampart') && !diedAfter(i) && !reactedTo(i, side, 'bristlingRampart')) flag('rempart non déclenché', r, i, `côté ${side}`)
        if (opensMoment(r, i, side, 'reflected') && find(prev.statuses[side], 'vendetta') && !diedAfter(i) && !reactedTo(i, side, 'vendetta')) flag('vindicte non déclenchée', r, i, `côté ${side}`)
        if (find(prev.statuses[side], 'faithShield') && beatEffects(b).some((e) => e.type === 'heal' && e.target === side && e.amount > 0) && !diedAfter(i) && !reactedTo(i, side, 'faithShield'))
          flag('bouclier de foi non déclenché', r, i, `${b.type} côté ${side}`)
        const blow = strikeIn(b)
        const crit = !!blow && blow.attacker === side && blow.crit && !blow.dodged && !blow.replaced
        // Un jet tombé à vide (Malchance) ne porte pas de coup
        const touch = !!blow && blow.attacker === side && !blow.dodged && !blow.replaced && !blow.jinxed
        const hurt = !!blow && blow.attacker === 1 - side && !blow.dodged && !blow.replaced && !blow.jinxed
        // L'état du début du coup (règle 9) : un statut posé par la compétence greffée de ce jet ne réagit qu'au coup suivant
        let rolled = -1
        if (b.type === 'attack' && b.attack.preset) for (let j = i - 1; j >= 0 && rolled < 0; j--) if (r.beats[j].type === 'roll') rolled = j
        const base = rolled >= 0 ? stateBefore(rolled) : prev
        if (touch && find(base.statuses[side], 'openWound') && !diedAfter(i) && !reactedTo(i, side, 'openWound')) flag('plaie ouverte non déclenchée', r, i, `côté ${side}`)
        // Les Maîtrises, vague 2 (2026-10-27) : chaque aura nouvelle réagit à son moment ; le Poing de pierre part avec l'armure
        const reacts: [boolean, StatusId][] = [
          [crit, 'dread'],
          [crit, 'rotAura'],
          [touch, 'ballad'],
          [hurt, 'rancor'],
          [hurt, 'stormField'],
          [b.type === 'attack' && b.attack.attacker === side && b.attack.roll === DIE_FACES && !b.attack.plain && !b.attack.jinxed, 'luckyStreak'],
          [opensMoment(r, i, side, 'shieldBroken'), 'stoneFist'],
        ]
        for (const [when, status] of reacts)
          if (when && find(base.statuses[side], status) && find(prev.statuses[side], status) && !diedAfter(i)) {
            if (!reactedTo(i, side, status)) flag(`${STATUSES[status].name} : réaction manquée`, r, i, `côté ${side}`)
            else see(`maîtrises : ${status}`)
          }
        if (crit && find(prev.statuses[side], 'bloodFrenzy') && !diedAfter(i) && !reactedTo(i, side, 'bloodFrenzy')) flag('ivresse du sang non déclenchée', r, i, `côté ${side}`)
        const dodged = !!blow && blow.attacker === 1 - side && blow.dodged && !blow.blindedBy && !blow.replaced
        if (dodged && find(prev.statuses[side], 'feint') && !diedAfter(i) && !reactedTo(i, side, 'feint')) flag('feinte non déclenchée', r, i, `côté ${side}`)
        if (opensMoment(r, i, side, 'reflected') && find(prev.statuses[side], 'bloodDebt') && !diedAfter(i) && !reactedTo(i, side, 'bloodDebt')) flag('dette de sang non déclenchée', r, i, `côté ${side}`)
        if (find(prev.statuses[side], 'blackSap') && beatEffects(b).some((e) => e.type === 'heal' && e.target === side && e.amount > 0) && !diedAfter(i) && !reactedTo(i, side, 'blackSap'))
          flag('sève noire non déclenchée', r, i, `${b.type} côté ${side}`)
        const touched =
          touch ||
          (b.type === 'coin' && b.side === side && b.heads && !!STATUSES[b.status].coinToss?.headsTouches)
        // Sauf une Brûlure éteinte dans les fenêtres du coup (une purge de seuil, la Larme de givre, avant la fenêtre du coup)
        if (touched && find(prev.statuses[side], 'conflagration') && find(s.statuses[1 - side], 'burn') && !diedAfter(i) && !reactedTo(i, side, 'conflagration'))
          if (!descendantsOf(r, i).some((x) => !find(x.state.statuses[1 - side], 'burn'))) flag('embrasement non déclenché', r, i, `côté ${side}`)
      }
      // Phase 8, lot 3. Hémorragie : un porteur ne regagne aucun PV ; un soin empêché garde son montant voulu
      for (const e of beatEffects(b)) {
        if (e.type !== 'heal' || !find(prev.statuses[e.target], 'hemorrhage')) continue
        if (e.amount > 0) flag('hémorragie : soin reçu', r, i, `${e.amount} côté ${e.target}`)
        else if (e.wanted !== undefined) see('hémorragie')
      }
      // Sceau de vol : chaque bonus que le porteur se pose (hors mécanisme), tant qu'il lui reste une charge, va à
      // l'adversaire ; un vol ne prend qu'un bonus, au porteur d'une charge
      {
        const owner = b.type === 'event' ? b.event.side : 'side' in b ? b.side : undefined
        let left = owner === undefined ? 0 : (find(prev.statuses[owner], 'sealTheft')?.stacks ?? 0)
        for (const e of owner === undefined ? [] : beatEffects(b)) {
          if (e.type !== 'applyStatus') continue
          const stealable = STATUSES[e.status].polarity === 'positive' && !isMechanic(e.status)
          if (e.stolenBy !== undefined) {
            if (e.stolenBy !== 'sealTheft' || left <= 0 || !stealable || e.target === owner) flag('sceau de vol : vol faux', r, i, `${e.status} vers ${e.target}, ${left} charge(s)`)
            else see('sceau de vol')
            left--
          } else if (e.target === owner && stealable && left > 0) flag('sceau de vol : bonus gardé', r, i, `${e.status} côté ${owner}`)
        }
        // Une charge par vol : le porteur en garde autant qu'au début de l'étape, moins ses vols (sauf une purge)
        const held = owner === undefined ? 0 : (find(prev.statuses[owner], 'sealTheft')?.stacks ?? 0)
        const purged = beatEffects(b).some((e) => e.type === 'cleanse' && e.removed.includes('sealTheft'))
        if (owner !== undefined && held > 0 && !purged && (find(s.statuses[owner], 'sealTheft')?.stacks ?? 0) !== Math.max(left, 0))
          flag('sceau de vol : charge non consommée', r, i, `côté ${owner}`)
      }
      // Règle 9 (2026-10-21) : pendant un coup (attaque, pièce ou renvoi, jusqu'au coup, au jet ou à la rafale suivante),
      // seul un statut déjà là au début du coup réagit. Les jauges ne réagissent pas : elles se remplissent.
      if (b.type === 'statusReaction' && !STATUSES[b.status].fillsOnHurt) {
        const opens = (x: Beat) => ['attack', 'coin', 'flurry', 'roll'].includes(x.type) || (x.type === 'statusReaction' && !!x.strike)
        let k = i - 1
        while (k >= 0 && r.beats[k].turn === b.turn && r.beats[k].phase === b.phase && !opens(r.beats[k])) k--
        const opener = k >= 0 && r.beats[k].turn === b.turn && r.beats[k].phase === b.phase ? r.beats[k] : undefined
        if (opener && opener.type !== 'flurry' && opener.type !== 'roll') {
          if (!find(stateBefore(k).statuses[b.side], b.status)) flag('un statut posé pendant un coup réagit à ce coup', r, i, b.status)
          else see('réaction d’un statut déjà là au début du coup')
        }
      }
      // Un statut de durée ne perd un tour que pendant une étape statusAge
      if (b.type !== 'statusAge')
        for (const side of [0, 1] as const)
          for (const st of s.statuses[side]) {
            const was = find(prev.statuses[side], st.id)
            if (was?.turns !== undefined && st.turns !== undefined && st.turns < was.turns && b.type !== 'event' && b.type !== 'statusReaction')
              flag('durée décomptée hors de son étape', r, i, `${st.id} ${was.turns}→${st.turns} (${b.type})`)
          }
      if (b.type === 'statusAge' || b.type === 'statusTick') {
        if (b.side !== active(b.turn)) flag('phase de statut sur le mauvais camp', r, i, `${b.type} côté ${b.side}`)
      }
      // Usure (2026-10-21, une seule étape) : chaque décompte et chaque extinction annoncés se lisent dans l'état
      if (b.type === 'statusAge') {
        if (b.changes.length === 0 && b.expired.length === 0) flag('usure vide', r, i, '')
        for (const c of b.changes)
          if (find(s.statuses[b.side], c.status)?.turns !== c.to || c.to !== c.from - 1) flag('usure : décompte faux', r, i, `${c.status} ${c.from}→${c.to}`)
        for (const id of b.expired) if (find(s.statuses[b.side], id)) flag('usure : statut éteint encore présent', r, i, id)
        if (b.changes.length && b.expired.length) see('usure : décompte et extinction ensemble')
      }
      // Mécanismes (2026-10-21) : jamais bloqués, annulés ni purgés
      for (const e of beatEffects(b)) {
        if (e.type === 'applyStatus' && isMechanic(e.status) && e.result.kind !== 'applied') flag('mécanisme bloqué ou annulé', r, i, `${e.status} ${e.result.kind}`)
        if (e.type === 'cleanse' && e.removed.some(isMechanic)) flag('mécanisme purgé', r, i, e.removed.join())
      }
      // Une seule valeur (Brûlure, 0.69.0) : posé sans durée, il dure autant de tours que de charges
      if (b.type === 'event')
        for (const e of b.event.effects) {
          if (e.type !== 'applyStatus' || e.result.kind !== 'applied' || !STATUSES[e.status].turnsFromStacks) continue
          const st = find(s.statuses[e.target], e.status)
          if (st && st.turns !== st.stacks) flag('durée différente de la valeur', r, i, `${e.status} ${st.stacks} / ${st.turns} tours`)
          else see('brûlure à une valeur')
        }
      /**
       * La résolution d'un coup, coup de base comme renvoi (C1) : esquive (Luciole, esquive imposée), Critique assuré,
       * reliques de coup, valeur, modificateurs, armure, boucliers, dégâts finaux, Garde brisée, Aveuglé, Vol de vie
       * esquivé, puis ce qui réagit à un coup qui touche (`touchControls`).
       */
      const resolution = (a: Attack, att: Side, def: number) => {
        // Luciole : plus d'esquive (sauf esquive imposée) ; chaque coup qui touche retire une charge
        const firefly = find(prev.statuses[def], 'firefly')
        if (firefly) {
          see('luciole')
          if (a.dodged && !a.dodgeForced) flag('esquive malgré Luciole', r, i, '')
          if (!a.dodged && !a.replaced && !a.jinxed) {
            const left = find(r.beats[i + 1]?.state.statuses[def] ?? s.statuses[def], 'firefly')?.stacks ?? 0
            if (s.hp[def] > 0 && left !== firefly.stacks - 1) flag('Luciole non consommée', r, i, `${firefly.stacks} → ${left}`)
          }
        }
        const evasion = !!find(prev.statuses[def], 'evasion')
        if (!a.replaced && !a.jinxed && a.dodgeForced !== evasion) flag('esquive imposée incohérente', r, i, `evasion ${evasion}`)
        // Esquive améliorée non cumulable (2026-10-25, 0.117.1) : une charge au plus, que l'esquive imposée use ; le
        // défenseur n'en garde aucune après le coup (une pose pendant le coup attend sa fenêtre, après cette étape)
        const kept = (find(prev.statuses[def], 'evasion')?.stacks ?? 0) - (find(s.statuses[def], 'evasion')?.stacks ?? 0)
        if (a.dodgeForced && kept !== 1) flag('esquive imposée : une charge par esquive', r, i, `${kept} charge(s) usée(s)`)
        else if (a.dodgeForced && find(s.statuses[def], 'evasion')) flag('esquive imposée cumulée', r, i, '')
        else if (a.dodgeForced) see('esquive imposée, plus aucune charge')
        // Critique assuré (B8, 2026-10-27) : la prochaine frappe le porte et le dépense, qu'elle touche, soit esquivée ou
        // ratée (Aveuglé) ; un coup qui touche est alors critique. Un jet sans coup (remplacé, tombé à vide) le garde
        if (!a.replaced && !a.jinxed) {
          const sure = find(prev.statuses[att], 'guaranteedCrit')
          if (!!sure !== a.critForced) flag('critique assuré incohérent', r, i, '')
          else if (sure && find(s.statuses[att], 'guaranteedCrit')) flag('critique assuré gardé après sa frappe', r, i, '')
          else if (sure && !a.dodged && !a.crit) flag('critique assuré sans critique', r, i, '')
          else if (sure) see(a.blindedBy ? 'critique assuré raté' : a.dodged ? 'critique assuré perdu sur une esquive' : 'critique assuré')
        }
        if (!a.dodged && !a.replaced && !a.jinxed) {
          // Reliques de coup : recomptées depuis les reliques de l'attaquant, avant le critique ; un bonus de face
          // (Fer à quatre clous) ne vaut que si le dé de ce coup fait cette face, coup brut compris (2026-10-23) ; un bonus
          // à conditions (Fiole de venin, Croc de boucher), que si elles tiennent sur l'état d'avant le coup
          const armed = r.fighters[att].relics.filter(
            (x) => x.rollBonus && (x.onFace === undefined || x.onFace === a.roll) && (x.when ?? []).every((c) => holdsBefore(c, att, prev, r, b.turn)),
          )
          const bonus = armed.reduce((t, x) => t + (x.rollBonus ?? 0), 0)
          if (bonus !== (a.relicBonus ?? []).reduce((t, x) => t + x.amount, 0)) flag('bonus de relique incohérent', r, i, `${bonus}`)
          else if (bonus) see('bonus de relique')
          if (armed.some((x) => x.when)) see('bonus de relique à conditions')
          if (a.plain && r.fighters[att].relics.some((x) => x.onFace === a.roll)) see('coup brut avec relique de face')
          // Face dorée (forge du dé) : la dorure de la face de ce dé, coup brut compris
          const gild = r.fighters[att].gilded[a.roll] ?? 0
          if (gild !== (a.gild ?? 0)) flag('face dorée incohérente', r, i, `${a.gild ?? 0} au lieu de ${gild}`)
          else if (gild) see('face dorée')
          const value = a.value * (a.multiplier ?? 1) + bonus + gild
          let raw = a.crit ? Math.round(value * a.critMultiplier) : value
          // Poing de pierre (Maîtrises, P4) : il n'agit que si l'attaquant a une armure temporaire
          const armored = prev.statuses[att].some((st) => STATUSES[st.id].shield)
          for (const st of prev.statuses[att]) if (!STATUSES[st.id].whileShielded || armored) raw = STATUSES[st.id].modifyOutgoing?.(raw, st) ?? raw
          if (find(prev.statuses[att], 'stoneFist')) see(armored ? 'poing de pierre' : 'poing de pierre sans armure')
          for (const st of prev.statuses[def]) raw = STATUSES[st.id].modifyIncoming?.(raw, st) ?? raw
          raw = Math.max(1, Math.round(raw))
          if (raw !== a.raw) flag('dégâts bruts faux', r, i, `${a.raw} vs ${raw}`)
          const afterArmor = Math.max(1, raw - a.armor)
          // Boucliers (armure temporaire, écorce), dans l'ordre de pose : chacun absorbe sans descendre sous 1 ; une garde
          // brisée (lot 3) n'en laisse absorber aucun
          const shattered = prev.statuses[def].some((st) => STATUSES[st.id].shatters)
          if (shattered !== (a.shatteredBy !== undefined)) flag('garde brisée : coup faux', r, i, `${a.shatteredBy}`)
          let expected = afterArmor
          for (const st of prev.statuses[def]) if (STATUSES[st.id].shield && !shattered) expected -= Math.min(st.stacks, expected - 1)
          // Dégâts finaux (Fausse note, 0.41.0) : après les boucliers, au moins 1
          for (const st of prev.statuses[att]) {
            const modify = STATUSES[st.id].modifyFinal
            if (modify) expected = Math.max(1, Math.round(modify(expected, st)))
          }
          if (a.damage !== expected) flag('dégâts finaux faux', r, i, `${a.damage} vs ${expected}`)
          if (a.dealt !== a.damage) flag('dégâts comptés faux', r, i, '')
          // Garde brisée : une charge par coup qui touche, et plus aucune armure temporaire après lui
          const broken = find(prev.statuses[def], 'guardBreak')
          if (broken) {
            if ((find(s.statuses[def], 'guardBreak')?.stacks ?? 0) !== broken.stacks - 1) flag('garde brisée : charge', r, i, `${broken.stacks}`)
            if (s.statuses[def].some((st) => STATUSES[st.id].shield)) flag('garde brisée : armure restante', r, i, '')
            else if (prev.statuses[def].some((st) => STATUSES[st.id].shield)) see('garde brisée : armure brisée')
            see('garde brisée')
          }
          if (a.crit && find(prev.statuses[att], 'blinded')) flag('aveuglé : critique porté', r, i, '')
          if (s.hp[def] > 0) touchControls(i, att, a.dealt, !!a.rebound)
        } else if (a.damage !== 0 || a.dealt !== 0) flag('coup nul avec dégâts', r, i, '')
        // Aveuglé (lot 3) : un coup raté d'aveuglé suit un critique (tiré ou assuré) d'un porteur du statut
        if (a.blindedBy !== undefined) {
          if (a.blindedBy !== 'blinded' || !find(prev.statuses[att], 'blinded') || !a.dodged || a.dodgeForced) flag('aveuglé : raté faux', r, i, `${a.blindedBy}`)
          else see('aveuglé')
        }
        // Vol de vie (0.29.0) : esquivé, la charge est perdue ; jet remplacé, elle reste
        if (find(prev.statuses[att], 'lifesteal')) {
          const was = find(prev.statuses[att], 'lifesteal')!.stacks
          if (a.dodged && (find(s.statuses[att], 'lifesteal')?.stacks ?? 0) !== was - 1) flag('vol de vie gardé après une esquive', r, i, '')
          if ((a.replaced || a.jinxed) && !find(s.statuses[att], 'lifesteal')) flag('vol de vie perdu sur un jet remplacé', r, i, '')
        }
      }
      // Renvois (C1, RESOLUTION § 9) : la Riposte et chaque jauge relâchée d'une Rétribution, des coups sans dé du porteur
      // de la réaction, résolus comme un coup (`resolution`) ; jamais causés par un renvoi (R1)
      if (b.type === 'statusReaction' && b.strike) {
        const a = b.strike
        const origin = b.cause !== undefined ? r.beats[b.cause] : undefined
        const faceRelic = (a.relicBonus ?? []).some((x) => r.fighters[b.side].relics.find((y) => y.id === x.relic)?.onFace !== undefined)
        if (a.attacker !== b.side || !a.rebound || a.roll !== 0 || a.gild || faceRelic) flag('renvoi : coup faux', r, i, JSON.stringify({ roll: a.roll, gild: a.gild }))
        if (origin?.type === 'statusReaction' && origin.strike) flag('renvoi d’un renvoi', r, i, '')
        const hurt = b.effects[0]
        const landed = a.dodged ? b.effects.length === 0 : b.effects.length === 1 && hurt?.type === 'damage' && hurt.target === 1 - b.side && hurt.amount === a.dealt
        if (!landed) flag('renvoi : dégâts faux', r, i, JSON.stringify(b.effects))
        if (STATUSES[b.status].reflectsHit) {
          if (b.trigger !== 'hurt') flag('riposte hors d’un coup reçu', r, i, b.trigger)
        } else {
          // Une jauge relâchée (R3) : la k-ième part de la relâche de son étape, chacune un coup à part
          const released = origin?.type === 'event' ? origin.event.effects.find((e) => e.type === 'rebound' && e.status === b.status) : undefined
          const k = r.beats.filter((x) => x.id < i && x.cause === b.cause && x.type === 'statusReaction' && !!x.strike).length
          if (released?.type !== 'rebound' || released.parts[k] !== a.value) flag('jauge relâchée : coup faux', r, i, `${a.value} (part ${k})`)
          else see(released.parts.length > 1 ? 'jauges relâchées : coups à part' : 'jauge relâchée : un coup')
        }
        if (a.crit) see('renvoi critique')
        if (a.dodged) see(a.dodgeForced ? 'renvoi esquivé à coup sûr' : 'renvoi esquivé')
        if (a.armorAbsorbed > 0) see('renvoi contre l’armure')
        if (a.relicBonus?.length) see('renvoi : relique de coup')
        resolution(a, b.side, 1 - b.side)
      }
      if (b.type === 'attack') {
        const a = b.attack
        const att = a.attacker
        const def = 1 - att
        if (att !== active(b.turn)) flag('attaque hors de son tour', r, i, `côté ${att}`)
        const eff = effectiveStats(r.fighters[att], prev.statuses[att])
        const effDef = effectiveStats(r.fighters[def], prev.statuses[def])
        if (a.faces !== DIE_FACES) flag('dé incohérent', r, i, `${a.faces} vs ${DIE_FACES}`)
        if (a.critMultiplier !== eff.critMultiplier) flag('multiplicateur incohérent', r, i, `${a.critMultiplier} vs ${eff.critMultiplier}`)
        if (a.armor !== effDef.armor) flag('armure incohérente', r, i, `${a.armor} vs ${effDef.armor}`)
        // Plafond d'esquive (C5) : les statuts du défenseur ne portent pas son esquive au-delà de MAX_DODGE (sa fiche, si
        // elle est plus haute, reste la sienne)
        const dodgeCap = Math.max(r.fighters[def].stats.dodgeChance, MAX_DODGE)
        if (effDef.dodgeChance > dodgeCap) flag("esquive au-delà du plafond", r, i, `${effDef.dodgeChance} > ${dodgeCap}`)
        else if (effDef.dodgeChance === MAX_DODGE && r.fighters[def].stats.dodgeChance < MAX_DODGE) see('esquive au plafond')
        // Le coup de base (phase 5 bis) : sa valeur dans l'attaque de l'attaquant (reliques et forge comprises) ; un type
        // d'attaque unique depuis le 2026-10-24
        if (!a.replaced && !a.jinxed) {
          if (a.value < eff.attackMin || a.value > eff.attackMax) flag("coup de base hors de l'attaque", r, i, `${a.value} hors de ${eff.attackMin} à ${eff.attackMax}`)
          else see('coup de base')
          if (a.multiplier) see('coup de base multiplié')
        } else if (a.value !== 0) flag('jet remplacé avec une valeur', r, i, `${a.value}`)
        // Relations au coup (phase 5 bis) : une compétence de la face qui remplace le coup fait un jet remplacé ; une qui se
        // greffe fait un jet en deux temps (étape roll, puis le coup au dé déjà tiré). Un coup brut n'en a pas. Chaque dé de
        // la barde est un jet comme un autre (phase 5 ter)
        const rolled = b.cause !== undefined && r.beats[b.cause].type === 'roll'
        // Déclenchements de chaque compétence avant ce jet (avant son étape roll s'il en a une) : une compétence à `limit`
        // épuisée laisse sa face nue (0.107.0, Soliste, Peur), Crescendo (`buildsUp`) y lit son multiplicateur
        const firedBefore = (id: string) => r.beats.slice(0, rolled ? b.cause! : i).filter((x) => x.type === 'event' && x.event.side === att && x.event.eventId === id).length
        // Une compétence greffée ou qui remplace le coup se décide au jet, sur l'état de ce moment (son étape roll, sinon
        // l'étape d'avant) : une condition fausse laisse sa face nue (0.114.0, la Curée sans Saignement), comme une
        // compétence épuisée. Celle qui modifie le coup lit la sienne dans les fenêtres du coup
        const decided = rolled ? r.beats[b.cause!].state : prev
        const faceReady = a.plain
          ? []
          : r.fighters[att].events.filter(
              (e) =>
                isRollTrigger(e.trigger) &&
                inForm(att, e) &&
                rollMatches(e.trigger, a.roll, DIE_FACES) &&
                (e.limit === undefined || firedBefore(e.id) < e.limit) &&
                (relationOf(e) === 'modify' || !e.when || e.when.every((c) => holdsBefore(c, att, decided, r, b.turn))),
            )
        // Malchance (lot 3) : un jet tombé à vide ne porte aucune compétence de sa face
        const faceSkills = a.jinxed ? [] : faceReady
        const replaces = faceSkills.some((e) => relationOf(e) === 'replace')
        const grafts = !replaces && faceSkills.some((e) => relationOf(e) === 'graft')
        if (a.replaced !== replaces) flag('jet remplacé incohérent', r, i, `roll ${a.roll}`)
        if (!a.jinxed && grafts !== rolled) flag('jet greffé incohérent', r, i, `roll ${a.roll}`)
        // Malchance : le jet tombé à vide suit son étape roll (`jinxedBy`), chez un porteur du statut qui en perd une charge, sur
        // une face qui portait une compétence prête ; un jet non imposé sur une telle face, chez un porteur, tombe à vide
        const atRoll = rolled ? stateBefore(b.cause!) : prev
        const jinx = find(atRoll.statuses[att], 'jinx')
        if (a.jinxed) {
          const roll = rolled ? r.beats[b.cause!] : undefined
          const left = find(prev.statuses[att], 'jinx')?.stacks ?? 0
          if (roll?.type !== 'roll' || roll.jinxedBy !== 'jinx' || !jinx || left !== jinx.stacks - 1 || faceReady.length === 0 || a.value !== 0 || a.damage !== 0)
            flag('malchance : jet faux', r, i, `roll ${a.roll}`)
          else see('malchance')
        } else if (jinx && !a.forced && !a.plain && faceReady.length > 0) flag('malchance non déclenchée', r, i, `roll ${a.roll}`)
        // Ce coup ×N (Crescendo, Soliste, phase 5 ter) : le produit des multiplicateurs des compétences de sa face qui le
        // modifient (lu seulement quand aucune n'a de condition, qui pourrait la retenir) ; Crescendo (`buildsUp`, 0.107.0)
        // gagne ×1 par déclenchement déjà vu dans ce combat
        const boost = faceSkills.reduce(
          (m, e) => (relationOf(e) !== 'modify' || e.hitMultiplier === undefined ? m : m * (e.hitMultiplier + (e.buildsUp ? firedBefore(e.id) : 0))),
          1,
        )
        if (!a.replaced && !a.jinxed && faceSkills.every((e) => !e.when) && (a.multiplier ?? 1) !== boost) flag('coup multiplié faux', r, i, `×${a.multiplier ?? 1} au lieu de ×${boost}`)
        else if (faceSkills.some((e) => e.buildsUp) && (a.multiplier ?? 1) > (faceSkills.find((e) => e.buildsUp)?.hitMultiplier ?? 1)) see('coup qui monte')
        // Un coup brut ne vient que d'une rafale instantanée du même tour
        if (a.plain && !r.beats.slice(0, i).some((x) => x.type === 'flurry' && x.turn === b.turn && STATUSES[x.status].instantStrikes))
          flag('coup brut hors d’une Furie', r, i, '')
        resolution(a, att, def)
        // Compétences du dé : déclenchées exactement quand il faut. Après le coup, dans ses fenêtres : celles qui le
        // modifient (s'il touche) ou le remplacent ; avant lui, après son étape roll : celles qui s'y greffent
        const after: Beat[] = []
        for (const x of r.beats.slice(i + 1)) {
          // Une relique (seuil franchi par le coup, moment du coup) a sa place dans les fenêtres du coup
          if (x.type !== 'event' && x.type !== 'statusReaction' && x.type !== 'relic') break
          after.push(x)
        }
        const grafted = rolled ? r.beats.slice(b.cause! + 1, i) : []
        if (s.hp[def] > 0)
          // Toutes les compétences de la face, épuisées comprises : une compétence épuisée ne doit plus partir
          for (const e of a.plain || a.jinxed ? [] : r.fighters[att].events.filter((x) => isRollTrigger(x.trigger) && inForm(att, x) && rollMatches(x.trigger, a.roll, DIE_FACES))) {
            const relation = relationOf(e)
            const spent = !faceSkills.includes(e)
            const should = !spent && (relation === 'replace' || (relation === 'modify' && !a.dodged && !a.replaced) || (a.replaced && relation !== 'graft'))
            // Une compétence imprimée sur plusieurs faces (la Foudre du druide) se reconnaît à son déclencheur
            const did = after.some((x) => x.type === 'event' && x.event.eventId === e.id && x.event.trigger === e.trigger)
            const someoneDied = after.some((x) => x.state.hp.some((h) => h === 0))
            if (spent) see(e.limit !== undefined && firedBefore(e.id) >= e.limit ? 'compétence épuisée' : 'compétence à condition fausse : face nue')
            if (relation !== 'graft' || a.replaced) {
              if (should !== did && !(should && someoneDied)) flag(`compétence ${e.name} mal déclenchée`, r, i, `roll ${a.roll}`)
              else if (did && relation === 'modify') see('compétence qui modifie son coup')
            } else {
              const before = grafted.some((x) => x.type === 'event' && x.event.eventId === e.id && x.event.trigger === e.trigger)
              if (before === spent || did) flag(`compétence ${e.name} mal greffée`, r, i, `roll ${a.roll}`)
              else see('compétence greffée')
            }
          }
      }
      // Pile ou face (0.30.0) : pile = dégâts directs de la pièce, face = rien ; le statut est consommé.
      // La pièce et ses dégâts sont lus dans le registre (0.42.0). Depuis le 2026-10-21, elle part aussitôt, juste
      // après le coup pendant lequel elle a été posée, dans le même tour.
      if (b.type === 'attack' || (i > 0 && b.turn !== r.beats[i - 1].turn))
        for (const side of [0, 1] as const)
          if (prev.statuses[side].some((x) => STATUSES[x.id].coinToss)) flag('pièce gardée pour plus tard', r, i, `côté ${side}`)
      if (b.type === 'coin') {
        const toss = STATUSES[b.status].coinToss
        if (!toss || !find(prev.statuses[b.side], b.status)) flag('pièce sans Pile ou face', r, i, b.status)
        if (find(s.statuses[b.side], b.status)) flag('Pile ou face non consommé', r, i, '')
        const dmg = b.effects.reduce((t, e) => t + (e.type === 'damage' && e.target !== b.side ? e.amount : 0), 0)
        const strike = r.beats.slice(0, i).reverse().find((x) => x.type === 'attack')
        // Pile : ce coup ×N, la pièce rend encore N − 1 fois les PV qu'il a retirés (phase 5 bis, ×3 depuis la 0.107.0 ; son
        // intensité, Pile ou face aiguisée, monte N en 0.110.0). Dé pipé (une aura depuis les Maîtrises, M9) : il ne change
        // que la chance de pile, contrôlée par la fréquence (audit.test.ts)
        if (prev.statuses[b.side].some((x) => STATUSES[x.id].headsChance)) see('pièce pipée')
        const more = find(prev.statuses[b.side], b.status)?.power ?? 0
        if (toss?.heads) {
          // Pièce d'effet (2026-10-27) : pile, ses statuts tels que déclarés (son rang la fait tomber plus souvent sur pile),
          // sans dégâts ; face, rien
          const wanted = toss.heads.flatMap((e) => (e.type === 'applyStatus' ? [`${e.status}:${e.stacks}`] : []))
          const got = b.effects.flatMap((e) => (e.type === 'applyStatus' ? [`${e.status}:${e.stacks}`] : []))
          if (dmg !== 0 || (b.heads ? JSON.stringify(got) !== JSON.stringify(wanted) : b.effects.length > 0)) flag('pièce d’effet fausse', r, i, `${b.heads} ${got.join(' ')}`)
          else see(b.heads ? 'pièce d’effet sur pile' : 'pièce d’effet sur face')
        } else if (b.heads ? strike?.type !== 'attack' || !toss || dmg !== strike.attack.dealt * (toss.multiplier + more - 1) : dmg !== 0)
          flag('pièce : dégâts faux', r, i, `${b.heads} ${dmg}`)
        if (!strike || strike.turn !== b.turn) flag('pièce sans le coup qui la lance', r, i, '')
        else see('pièce lancée aussitôt')
        // Pile qui touche : un coup qui touche de ses dégâts (mêmes contrôles qu'une attaque qui touche)
        if (b.heads && toss?.headsTouches && s.hp[1 - b.side] > 0) touchControls(i, b.side, dmg)
        // La réaction « quand il touche » d'une Aura de décoction a la pièce pour cause
        if (b.heads && toss?.headsTouches && find(s.statuses[b.side], 'decoctionAura') && s.hp[1 - b.side] > 0) {
          const caused = r.beats.filter((x) => x.cause === i)
          const poisoned = caused.some((x) => x.type === 'statusReaction' && x.status === 'decoctionAura')
          if (!poisoned && !caused.some((x) => x.state.hp.some((h) => h === 0))) flag('pile qui touche sans décoction', r, i, '')
          else if (poisoned) see('pile qui touche')
        }
      }
      if (b.type === 'flurry') {
        // Les coups de la rafale : ceux qu'elle cause, directement ou par l'étape `roll` d'un jet (0.110.0 : une Furie
        // peut partir au milieu d'une rafale de jets, entre deux jets de Coup de chance)
        const strikes = r.beats.filter(
          (x, j) =>
            j > i && x.turn === b.turn && x.type === 'attack' && (x.cause === i || (x.cause !== undefined && r.beats[x.cause].type === 'roll' && r.beats[x.cause].cause === i)),
        )
        const ended = r.turns === b.turn
        if (strikes.length !== b.strikes && !ended) flag('coups multiples : nombre de coups', r, i, `${strikes.length}`)
        if (b.side !== active(b.turn)) flag('Furie hors de son tour', r, i, '')
        const def = STATUSES[b.status]
        // Jets de plus (Coup de chance, Duo) : le jet de l'action, plus un par charge, toutes dépensées à cette action. Le
        // Duo est posé par sa face d'une action passée : sa rafale suit l'action qui l'a posé (2026-10-25)
        if (!def.instantStrikes && def.strikeCharges === 'all') {
          const held = find(prev.statuses[b.side], b.status)?.stacks ?? 0
          // Au plus MAX_EXTRA_JETS jets de plus par action (retour du 2026-10-27) ; toutes les charges partent
          if (!held || b.strikes !== 1 + Math.min(MAX_EXTRA_JETS, def.extraStrikes! * held) || find(s.statuses[b.side], b.status)) flag('jets de plus : charges mal dépensées', r, i, `${held} charges, ${b.strikes} jets`)
          else if (def.extraStrikes! * held > MAX_EXTRA_JETS) see('jets de plus au plafond')
          if (b.status === 'duo') {
            const posed = r.beats
              .slice(0, i)
              .reverse()
              .find((x) => x.type === 'event' && x.event.effects.some((e) => e.type === 'applyStatus' && e.status === 'duo' && e.target === b.side))
            if (!posed || posed.turn >= b.turn) flag('Duo : rafale sans un Duo avant elle', r, i, `${posed?.turn}`)
            else see('duo : la rafale suit l’action du Duo')
          }
        }
        // Furie instantanée (0.50.0) : la rafale suit, dans la même action, le jet qui l'a déclenchée (un jet remplacé) ;
        // ses coups sont bruts (0.69.0), et un 1 à 3 y frappe sans compétence
        if (def.instantStrikes) {
          const before = r.beats.slice(0, i).reverse().find((x) => x.turn === b.turn && x.type === 'attack')
          if (!before) flag('Furie instantanée sans jet déclencheur', r, i, '')
          else see('furie instantanée')
          for (const x of strikes) {
            if (x.type !== 'attack') continue
            if (!x.attack.plain || x.attack.replaced) flag('Furie : coup qui n’est pas brut', r, i, `roll ${x.attack.roll}`)
            else if (x.attack.roll <= 3 && !x.attack.dodged) see('coup brut de 1 à 3')
          }
          // Pas de Furie en chaîne : un coup brut ne déclenche aucune compétence, donc aucune Furie. Une charge posée par une
          // réaction (l'Ivresse du sang, lot 3) au critique d'un coup brut, elle, existe : la rafale en cours ne la relance pas,
          // elle part après le prochain jet de son porteur (RESOLUTION § 2, décision du parent, 2026-10-25)
          const posed = b.cause !== undefined ? r.beats[b.cause] : undefined
          const posedCause = posed?.cause !== undefined ? r.beats[posed.cause] : undefined
          const deferred = posed?.type === 'statusReaction' && posedCause?.type === 'attack' && posedCause.attack.plain
          if (posedCause?.type === 'attack' && posedCause.attack.plain && !deferred) flag('Furie en chaîne', r, i, '')
          // 0.110.0 (RESOLUTION § 2) : la rafale a sa cause dans le même tour et suit le jet qui l'a posée, avant tout
          // autre coup ; toutes ses charges partent à la fois. Posée par une greffe (la Curée, 0.114.0), elle suit le coup
          // de base de son jet : le seul coup permis entre les deux est celui de l'étape roll qui a fait partir la greffe
          // La pose peut venir d'une réaction à ce que la greffe a fait (le critique d'un renvoi de la Rétribution greffée,
          // C1) : on remonte ses causes jusqu'au jet
          let up = posed?.cause
          while (up !== undefined && r.beats[up].type !== 'roll' && r.beats[up].type !== 'attack' && r.beats[up].turn === b.turn) up = r.beats[up].cause
          const graftRoll = up !== undefined && r.beats[up].type === 'roll' ? up : undefined
          // Les coups d'une rafale qui la précède dans la même salve (une charge reportée de l'Ivresse, lot 3) ne comptent pas
          const between = r.beats
            .slice((b.cause ?? i) + 1, i)
            .filter((x) => x.type === 'attack' && !(x.type === 'attack' && x.attack.plain && x.cause !== undefined && r.beats[x.cause].type === 'flurry'))
          if (deferred) {
            // Reportée : un seul jet de son porteur (un coup qui n'est pas brut) entre la pose et la rafale
            const jets = between.filter((x) => x.type === 'attack' && x.attack.attacker === b.side && !x.attack.plain)
            if (jets.length !== 1) flag('Furie : charge réactive mal reportée', r, i, `${jets.length} jets`)
            else see('furie : charge réactive reportée')
          } else if (!posed || posed.turn !== b.turn) flag('Furie : rafale reportée', r, i, `cause tour ${posed?.turn}`)
          else if (between.some((x) => graftRoll === undefined || x.cause !== graftRoll)) flag('Furie : un coup passe avant la rafale', r, i, '')
          else if (between.length) see('rafale après le coup de base de son jet')
          else see('furie juste après son jet')
          const held = find(prev.statuses[b.side], b.status)
          const charges = held?.stacks ?? 0
          const left = find(s.statuses[b.side], b.status)
          // Furie aiguisée (0.110.0) : son intensité ajoute des coups à chaque charge
          if (left || b.strikes !== ((def.extraStrikes ?? 1) + (held?.power ?? 0)) * charges) flag('Furie : charges mal dépensées', r, i, `${charges} charges, ${b.strikes} coups`)
          else if (charges > 1) see('furie à plusieurs charges')
          if (held?.power) see('furie aiguisée')
        }
        // Charges en réserve (0.46.0) : une seule est dépensée par action, les autres restent
        if (def.strikeCharges === 'one') {
          const before = find(prev.statuses[b.side], b.status)?.stacks ?? 0
          const after = find(s.statuses[b.side], b.status)?.stacks ?? 0
          if (after !== before - 1) flag('Furie : charges mal dépensées', r, i, `${before} → ${after}`)
          if (after > 0) see('furie en réserve')
        }
      }
      // Statut qui s'estompe (poison, 0.36.4) : agit pour ses charges, puis en perd une, sans durée en tours
      if (b.type === 'statusTick' && STATUSES[b.status].decays) {
        const was = find(prev.statuses[b.side], b.status)!
        const now = find(b.state.statuses[b.side], b.status)
        const e = b.effects[0]
        const def = STATUSES[b.status]
        const asked = (b.phase === 'turnStart' ? def.onTurnStart : def.onTurnEnd)?.(was)[0]
        // Un soin s'arrête aux PV max : il peut rendre moins que demandé, jamais plus
        const ok =
          e && asked && e.type === asked.type && (e.type === 'damage' && asked.type === 'damage' ? e.amount === asked.amount : e.type === 'heal' && asked.type === 'heal' && e.amount <= asked.amount)
        if (!ok || (b.status === 'poison' && (e.type !== 'damage' || e.amount !== was.stacks))) flag("s'estompe : montant", r, i, JSON.stringify(b.effects))
        if ((now?.stacks ?? 0) !== was.stacks - 1) flag("s'estompe : charge perdue", r, i, `${was.stacks} → ${now?.stacks ?? 0}`)
        if (was.turns !== undefined) flag("s'estompe : durée en tours", r, i, '')
        see('estompe')
      }
      // Un coup au dé déjà tiré vient d'un jet greffé (étape roll)
      if (b.type === 'attack' && b.attack.preset) {
        const from = b.cause === undefined ? undefined : r.beats[b.cause]
        if (from?.type !== 'roll') flag('coup au dé déjà tiré sans son jet', r, i, `${from?.type}`)
      }
      // Un jet greffé (phase 5 bis) : l'étape roll, puis ses compétences greffées, puis son coup de base, au même dé
      if (b.type === 'roll') {
        if (b.side !== active(b.turn)) flag('jet hors de son tour', r, i, '')
        const hit = r.beats.find((x): x is Extract<Beat, { type: 'attack' }> => x.type === 'attack' && x.cause === i)
        const ended = descendantsOf(r, i).some((x) => x.state.hp.some((h) => h === 0))
        if (!hit && !ended) flag('jet greffé sans son coup', r, i, '')
        else if (hit && (hit.attack.roll !== b.roll || !hit.attack.preset)) flag('jet greffé : coup au mauvais dé', r, i, '')
      }
      // Fausse note (0.41.0) : le coup du porteur qui touche la subit, puis elle disparaît ; esquivé, elle reste
      if (b.type === 'attack') {
        const att = b.attack.attacker
        const note = find(stateBefore(i).statuses[att], 'falseNote')
        if (note) {
          see('fausse note')
          const touched = !b.attack.dodged && !b.attack.replaced && !b.attack.jinxed
          const left = find(b.state.statuses[att], 'falseNote')
          // Aiguisée (0.110.0) : un coup qui touche use d'abord son intensité (un coup de plus), puis la note
          if (touched && (note.power ? left?.stacks !== note.stacks || (left.power ?? 0) !== note.power - 1 : left)) flag('Fausse note non consommée', r, i, '')
          else if (touched && note.power) see('fausse note aiguisée')
          if (!touched && left?.stacks !== note.stacks) flag('Fausse note perdue sans toucher', r, i, '')
          const before = b.attack.damage - b.attack.modifiers.reduce((t, m) => t + (m.final ? m.delta : 0), 0)
          if (touched && !b.attack.modifiers.some((m) => m.status === 'falseNote') && before > 1) flag('Fausse note sans effet', r, i, '')
        }
      }
      // Aura glaciale (0.69.0) : au début du tour de son porteur, avant son coup, 1 charge de Poison par
      // charge d'aura sur l'adversaire (que l'immunité peut bloquer et la Régénération annuler), intensité comprise
      if (b.type === 'statusTick' && b.status === 'frostAura') {
        if (b.phase !== 'turnStart') flag('aura glaciale hors début de tour', r, i, '')
        if (r.beats.slice(0, i).some((x) => x.turn === b.turn && x.type === 'attack')) flag('aura glaciale après le coup', r, i, '')
        const st = find(prev.statuses[b.side], 'frostAura')!
        const e = b.effects[0]
        if (b.effects.length !== 1 || e.type !== 'applyStatus' || e.status !== 'poison' || e.target === b.side || e.stacks !== charges(st))
          flag('aura glaciale : poison, montant ou cible', r, i, JSON.stringify(b.effects))
        else if (e.result.kind === 'applied') see('aura glaciale')
      }
    })
    auditRelics(r)
    // Fin : un seul perdant à 0
    const fin = r.beats[r.beats.length - 1].state
    if (fin.hp[1 - r.winner] !== 0 && r.endedBy === 'ko') flag('fin incohérente', r, r.beats.length - 1, '')
  }

  /**
   * Champs communs des étapes (docs/MOTEUR_V2.md § 3) : rang, maître du tour, phase, et causes. Le maître du tour
   * se recompte depuis l'initiative (les tours alternent ; l'ouverture, tour 0, revient à celui qui ne commence pas).
   */
  function auditCauses(r: CombatResult) {
    const first: Side = firstSide(r)
    /** Moments d'un coup : ses réactions et compétences viennent d'un coup (ou d'une pièce qui touche) */
    const strikeMoments: Trigger[] = ['hit', 'crit', 'hurt', 'missed', 'dodge']
    const actionTypes: Beat['type'][] = ['attack', 'flurry', 'skip', 'coin', 'roll']
    r.beats.forEach((b, i) => {
      if (b.id !== i) flag("rang d'étape faux", r, i, `id ${b.id}`)
      const owner: Side = b.turn % 2 === 1 ? first : first === 0 ? 1 : 0
      if (b.owner !== owner) flag('maître du tour faux', r, i, `${b.owner} au lieu de ${owner}`)
      if (i > 0 && b.turn === r.beats[i - 1].turn && b.owner !== r.beats[i - 1].owner) flag('maître du tour qui change dans le tour', r, i, '')
      if ((b.type === 'shift') !== (b.phase === 'shift')) flag('phase de changement de forme fausse', r, i, b.phase)
      if (actionTypes.includes(b.type) && b.phase !== 'action') flag("étape d'action hors de l'action", r, i, `${b.type} en ${b.phase}`)
      const cause = b.cause === undefined ? undefined : r.beats[b.cause]
      if (b.cause !== undefined && !(b.cause >= 0 && b.cause < i)) flag('cause postérieure ou absente', r, i, `cause ${b.cause}`)
      const trigger = b.type === 'statusReaction' ? b.trigger : b.type === 'event' ? b.event.trigger : undefined
      if (trigger && (isRollTrigger(trigger) || strikeMoments.includes(trigger))) {
        // Une compétence greffée a son jet pour cause (étape roll) ; les autres réactions, le coup ou la pièce
        const graft = b.type === 'event' && cause?.type === 'roll' && isRollTrigger(trigger)
        // Un renvoi (C1) est lui-même un coup : la jauge relâchée a pour cause l'étape qui relâche (contrôlée avec les renvois)
        const rebound = b.type === 'statusReaction' && !!b.strike && !STATUSES[b.status].reflectsHit
        if (cause?.type !== 'attack' && cause?.type !== 'coin' && !strikeIn(cause) && !graft && !rebound) flag('réaction au coup sans le coup pour cause', r, i, `${trigger} ← ${cause?.type}`)
        else if (b.type === 'statusReaction') see('cause : réaction au coup')
        else if (graft) see('cause : jet greffé')
      }
      if (b.type === 'attack') {
        if (cause && cause.type !== 'flurry' && cause.type !== 'roll') flag("coup causé par autre chose qu'une rafale ou un jet", r, i, cause.type)
        if (b.attack.preset && cause?.type !== 'roll') flag('coup au dé déjà tiré sans le jet pour cause', r, i, `${cause?.type}`)
        if (cause?.type === 'flurry') see('cause : coup de rafale')
        if (b.attack.dodgeForced !== (b.attack.dodgeBy !== undefined)) flag('esquive imposée sans son statut', r, i, `${b.attack.dodgeBy}`)
        if (b.attack.critForced !== (b.attack.critBy !== undefined)) flag('critique assuré sans son statut', r, i, `${b.attack.critBy}`)
      }
      if (b.type === 'coin') {
        if (!cause) flag('pièce sans cause', r, i, '')
        else see('cause : pièce')
      }
      if (b.type === 'statusAge' && cause) {
        if (cause.type !== 'statusTick' || cause.side !== b.side || cause.phase !== b.phase || cause.turn !== b.turn)
          flag("décompte causé par autre chose que l'effet de son statut", r, i, cause.type)
        else see('cause : décompte après son effet')
      }
    })
  }

  /**
   * Reliques (0.73.0, docs/RELIQUES.md), recomptées depuis la chronologie : stats ajoutées à plat, compte des
   * déclenchements et charges, recharge, reliques de tour (au début de ses tours prévus, aucun de manqué),
   * reliques de seuil (après un passage sous le seuil, aucun de manqué), reliques de coup (sur leur moment).
   */
  function auditRelics(r: CombatResult) {
    const first: Side = firstSide(r)
    const owner = (t: number): Side => (t % 2 === 1 ? first : first === 0 ? 1 : 0)
    // Tours entamés par un camp au tour global `t` : le premier joue les tours impairs, l'autre les pairs
    const ownTurns = (side: Side, t: number) => (side === first ? Math.ceil(t / 2) : Math.floor(t / 2))
    const lastTurn = r.beats[r.beats.length - 1].turn
    for (const side of [0, 1] as const) {
      const f = r.fighters[side]
      // PV de récompense : REWARD_HP par relique et par étape de forge, sur les PV d'origine
      if (f.baseStats.maxHp !== f.definition.stats.maxHp + REWARD_HP * (f.forge.length + f.relics.length)) flag('PV de récompense faux', r, 0, f.id)
      else if (f.rewardHp) see('PV de récompense')
      // Dé forgé (campagne) : les dorures sont celles du journal rejoué, la trempe s'ajoute à l'attaque ; une gravure part
      // sur sa face
      if (f.forge.length) {
        see('dé forgé')
        const forged = forgeState(f.definition, f.forge)
        const { attackMin, attackMax } = f.definition.stats
        if (f.baseStats.attackMin !== attackMin + forged.temper || f.baseStats.attackMax !== attackMax + forged.temper)
          flag('forge : attaque trempée fausse', r, 0, `${f.baseStats.attackMin} à ${f.baseStats.attackMax}`)
        else if (forged.temper) see('attaque trempée')
        if (JSON.stringify(f.gilded) !== JSON.stringify(Object.fromEntries(forged.gilded))) flag('forge : dorures fausses', r, 0, f.id)
        if (r.beats.some((b) => b.type === 'event' && b.event.side === side && b.event.trigger.startsWith('face:'))) see('compétence gravée au-delà du 3')
      }
      if (!f.relics.length) continue
      see('reliques portées')
      const stats = withRelicStats(f.baseStats, f.relics)
      if (STAT_KEYS.some((k) => stats[k] !== f.stats[k])) flag('reliques : stats fausses', r, 0, f.id)
      if (f.relics.some((x) => x.stats)) see('relique de caractéristique')
      for (const relic of f.relics) {
        const fires = r.beats.flatMap((b, i) => (b.type === 'relic' && b.side === side && b.relic === relic.id ? [i] : []))
        fires.forEach((i, n) => {
          const b = r.beats[i]
          if (b.type === 'relic' && b.uses !== n + 1) flag('relique : compte faux', r, i, `${b.uses} au lieu de ${n + 1}`)
          // Le statut posé (reliques de source, 2026-10-25) : sur la cible que la relique déclare, et présent après la pose
          if (b.type !== 'relic') return
          for (const [k, e] of b.effects.entries()) {
            // Dégâts contre l'armure (Clous de pavois, 2026-10-27, M4) : moins l'armure effective de la cible, au moins 1
            const asked = relic.effects?.[k]
            if (e.type === 'damage' && asked?.type === 'damage' && asked.armored) {
              const armor = effectiveStats(r.fighters[e.target], (i ? r.beats[i - 1].state : b.state).statuses[e.target]).armor
              if (!e.armored || e.amount !== Math.max(1, asked.amount - armor) * (asked.hits ?? 1)) flag('relique : dégâts contre l’armure faux', r, i, `${relic.id} : ${e.amount}, armure ${armor}`)
              else see(armor > 0 ? 'dégâts renvoyés contre l’armure' : 'dégâts contre l’armure, sans armure')
            }
            if (e.type !== 'applyStatus') continue
            const declared = relic.effects?.find((x) => x.type === 'applyStatus' && x.status === e.status)
            // Un bonus volé (Sceau de vol, lot 3) va à l'adversaire du porteur
            const own: Side = side === 0 ? 1 : 0
            const target: Side = declared?.target === 'opponent' || e.stolenBy !== undefined ? own : side
            if (e.target !== target) flag('relique : statut sur la mauvaise cible', r, i, `${relic.id} : ${e.status}`)
            else if (e.result.kind === 'applied' && e.result.stacks > 0 && !find(b.state.statuses[target], e.status)) flag('relique : statut posé absent', r, i, `${relic.id} : ${e.status}`)
            else if (target !== side) see('relique : affliction à l’adversaire')
          }
        })
        if (relic.charges !== undefined && fires.length > relic.charges) flag('relique : charges dépassées', r, fires[relic.charges], relic.id)
        if (relic.cooldown)
          for (let n = 1; n < fires.length; n++)
            if (ownTurns(side, r.beats[fires[n]].turn) - ownTurns(side, r.beats[fires[n - 1]].turn) < relic.cooldown) flag('relique : recharge ignorée', r, fires[n], relic.id)
        const t = relic.trigger
        if (!t) {
          if (fires.length) flag('relique passive déclenchée', r, fires[0], relic.id)
          continue
        }
        // Sursis (2026-10-27, R1) : il part juste après l'étape (sa cause) qui aurait fait tomber son porteur, et le laisse à
        // 1 PV ; prêt, il ne laisse jamais tomber son porteur
        if (t.type === 'lethal') {
          for (const i of fires) {
            const cause = r.beats[i].cause
            const by = cause !== undefined ? r.beats[cause] : undefined
            const before = cause ? r.beats[cause - 1].state.hp[side] : f.maxHp
            const loss = !by
              ? 0
              : by.type === 'attack' && by.attack.attacker !== side
                ? by.attack.dealt
                : beatEffects(by).reduce((n, e) => n + (e.type === 'damage' && e.target === side ? e.amount : 0), 0)
            if (!by || cause !== i - 1 || by.state.hp[side] !== 1 || loss < before) flag('sursis hors d’un coup fatal', r, i, `${before} PV, perte ${loss}`)
            else see('sursis')
          }
          const fell = r.beats.findIndex((b) => b.state.hp[side] === 0)
          if (fell >= 0 && fires.filter((i) => i < fell).length < (relic.charges ?? 1)) flag('sursis manqué', r, fell, relic.id)
          continue
        }
        // Initiative (2026-10-27, R3) : seule de son espèce dans le combat, elle part à l'étape n° 0 et son porteur commence ;
        // si l'adversaire en porte une aussi, aucune ne part et le jet a lieu
        if (t.type === 'initiative') {
          const rival = r.fighters[side === 0 ? 1 : 0].relics.some((x) => x.trigger?.type === 'initiative')
          const mine = f.relics.find((x) => x.trigger?.type === 'initiative') === relic
          const wanted = !rival && mine
          if (wanted !== (fires.length === 1 && fires[0] === 0) || fires.length > 1) flag('initiative : relique mal déclenchée', r, fires[0] ?? 0, relic.id)
          else if (wanted && (first !== side || r.initiative.length > 0 || r.initiativeRelic?.relic !== relic.id)) flag('initiative : jet ou premier tour faux', r, 0, relic.id)
          else see(wanted ? 'initiative prise' : 'initiative disputée')
          continue
        }
        if (t.type === 'turn') {
          for (const i of fires)
            if (r.beats[i].turn === 0 || owner(r.beats[i].turn) !== side || ownTurns(side, r.beats[i].turn) < t.turn) flag('relique de tour hors de son tour', r, i, relic.id)
          if (relic.when) continue
          // Tours prévus : le sien, puis tous les `cooldown` tours, tant qu'il reste des charges ; le dernier tour du
          // combat est exclu (un K.O. au début du tour peut précéder la fenêtre). Une relique dont l'effet serait nul
          // (0.110.0) ne part pas et ne s'use pas : elle attend le tour suivant, sa recharge non entamée.
          const got = fires.map((i) => ownTurns(side, r.beats[i].turn))
          let ready = t.turn
          let used = 0
          for (let k = t.turn; (side === first ? 2 * k - 1 : 2 * k) < lastTurn; k++) {
            if (relic.charges !== undefined && used >= relic.charges) break
            if (k < ready) continue
            if (got.includes(k)) {
              used++
              ready = k + (relic.cooldown ?? 1)
              continue
            }
            // L'état au moment de sa fenêtre : la dernière étape du début de ce tour
            const turn = side === first ? 2 * k - 1 : 2 * k
            const at = r.beats.findIndex((b) => b.turn === turn && b.phase !== 'shift' && b.phase !== 'turnStart')
            const view = at > 0 ? r.beats[at - 1].state : undefined
            if (view && relicIsInert(relic, side, view, r.fighters)) {
              see('relique nulle qui attend')
              continue
            }
            flag('relique de tour manquée', r, 0, `${relic.id} : ${got.join(',')}, tour ${k} manqué`)
            break
          }
          if (used > 0) see('relique de tour')
        }
        if (t.type === 'hpBelow') {
          // Le seuil lit les PV du porteur, ou ceux de l'adversaire (Trophée du chasseur)
          const watched = t.who === 'opponent' ? (side === 0 ? 1 : 0) : side
          const threshold = r.fighters[watched].maxHp * t.ratio
          if (t.who === 'opponent' && fires.length) see('relique de seuil adverse')
          // Dent de loup (2026-10-21) : une relique de seuil ne part qu'une fois, ou selon sa recharge. Sans l'une
          // ni l'autre, un soin la réarmait et elle repartait à chaque nouvelle chute sous son seuil.
          if (relic.charges === undefined && !relic.cooldown) flag('relique de seuil sans limite', r, fires[0] ?? 0, relic.id)
          if (relic.charges === 1 && fires.length === 1) see('relique de seuil unique')
          let armed = true
          let pending: number | null = null
          r.beats.forEach((b, i) => {
            if (pending !== null && b.turn > r.beats[pending].turn) {
              flag('relique de seuil manquée', r, pending, relic.id)
              pending = null
            }
            if (b.type === 'relic' && b.side === side && b.relic === relic.id) {
              // Le passage se lit sur l'étape vérifiée (sa cause), pas sur la précédente : une autre relique du même
              // passage a pu soigner entre les deux (Larme de givre puis Trophée adverse, 0.85.0)
              const at = b.cause ?? i - 1
              const before = r.beats[at]?.state.hp[watched] ?? r.fighters[watched].maxHp
              if (before >= threshold || before <= 0) flag('relique de seuil au-dessus de son seuil', r, i, `${before} PV`)
              else see('relique de seuil')
              if (r.beats[i - 1]?.state.hp[watched] >= threshold) see('relique de seuil après un soin du même passage')
              // 0.110.0 : les seuils franchis par une même étape ont tous cette étape pour cause (pas la relique partie
              // avant), et partent l'actif d'abord (§ 5, règle 1)
              const by = r.beats[at]
              const isThreshold = (x: Beat) => x.type === 'relic' && r.fighters[x.side].relics.some((y) => y.id === x.relic && y.trigger?.type === 'hpBelow')
              if (by && isThreshold(by) && by.cause !== undefined && r.beats[by.cause].state.hp[watched] === by.state.hp[watched])
                flag('seuil causé par une autre relique de seuil', r, i, relic.id)
              const peer = r.beats.find((x, j) => j < i && x.cause === b.cause && isThreshold(x) && x.type === 'relic' && x.side !== side)
              if (peer && b.turn > 0 && owner(b.turn) === side) flag('seuil : le défenseur avant l’actif', r, i, relic.id)
              else if (peer) see('seuils d’un même coup, l’actif d’abord')
              pending = null
            }
            const hp = b.state.hp[watched]
            if (hp >= threshold) armed = true
            else if (armed && hp > 0) {
              armed = false
              // Avec une recharge ou des conditions, un passage peut ne rien déclencher : seul le surplus est contrôlé
              const spent = relic.charges !== undefined && fires.filter((x) => x < i).length >= relic.charges
              // Une relique dont l'effet serait nul (0.110.0) attend sans partir : rien n'est manqué
              if (!spent && !relic.cooldown && !relic.when && !relicIsInert(relic, side, b.state, r.fighters)) pending = i
            }
          })
        }
        // Phase 8, second lot : l'armure vidée, les dégâts renvoyés, pile. Sa cause est l'étape qui ouvre le moment (le coup
        // qui vide l'armure, l'étape qui renvoie, la pièce sur pile) ; sans limite ni condition, elle part à chacune, sauf si le
        // combat finit avant ou si son effet serait nul (un soin à PV pleins)
        if (t.type === 'strike' && (t.on === 'shieldBroken' || t.on === 'reflected' || t.on === 'heads')) {
          const on = t.on
          for (const i of fires) {
            const cause = r.beats[i].cause
            if (cause === undefined || !opensMoment(r, cause, side, on)) flag('relique hors de son moment', r, i, `${relic.id} sur ${on}`)
            else see(`relique : ${on}`)
          }
          if (!relic.charges && !relic.cooldown && !relic.when)
            r.beats.forEach((b, j) => {
              if (!opensMoment(r, j, side, on) || fires.some((f) => r.beats[f].cause === j)) return
              const after = [b, ...descendantsOf(r, j)]
              if (after.some((x) => x.state.hp.includes(0) || relicIsInert(relic, side, x.state, r.fighters))) return
              flag('relique de moment manquée', r, j, `${relic.id} sur ${on}`)
            })
          continue
        }
        // Soin reçu (Encens de l'abbaye) : chaque étape qui lui rend des PV ouvre sa fenêtre, une fois, et rien d'autre
        if (t.type === 'strike' && t.on === 'healed') {
          const heals = (b: Beat) => beatEffects(b).some((e) => e.type === 'heal' && e.target === side && e.amount > 0)
          for (const i of fires) {
            const cause = r.beats[i].cause
            if (cause === undefined || !heals(r.beats[cause])) flag('relique de soin sans soin', r, i, relic.id)
            else see('relique de soin reçu')
          }
          // Le combat qui finit dans la fenêtre (une Sentence qui achève l'adversaire, partie avant elle) la ferme aussi
          if (!relic.charges && !relic.cooldown && !relic.when)
            r.beats.forEach((b, i) => {
              if (!heals(b) || fires.some((f) => r.beats[f].cause === i)) return
              if ([b, ...descendantsOf(r, i)].some((x) => x.state.hp.includes(0))) return
              flag('relique de soin manquée', r, i, relic.id)
            })
          continue
        }
        if (t.type === 'strike') {
          for (const i of fires) {
            // Le coup du moment : sa cause, si c'est un coup (un renvoi, C1, se résout dans les fenêtres d'un autre coup) ; sinon
            // le dernier coup du tour, ou une pièce tombée sur pile qui touche (Pile ou face)
            const origin = r.beats[i].cause !== undefined ? r.beats[r.beats[i].cause!] : undefined
            const hit =
              origin && (origin.type === 'coin' || strikeIn(origin))
                ? origin
                : r.beats
                    .slice(0, i)
                    .reverse()
                    .find((x) => x.type === 'attack' || x.type === 'coin' || (x.type === 'statusReaction' && !!x.strike))
            if (!hit || hit.turn !== r.beats[i].turn || (hit.type !== 'coin' && !strikeIn(hit))) {
              flag('relique de coup sans coup', r, i, relic.id)
              continue
            }
            const a =
              hit.type === 'coin'
                ? { attacker: hit.side, dodged: false, replaced: !hit.heads, crit: false, plain: true, roll: 0, faces: 2, dealt: 0 }
                : strikeIn(hit)!
            const mine = a.attacker === side
            const touched = !a.dodged && !a.replaced
            const moments: Partial<Record<string, boolean>> = {
              hit: mine && touched,
              crit: mine && touched && a.crit,
              missed: mine && a.dodged,
              dodge: !mine && a.dodged,
              hurt: !mine && touched,
            }
            // Une face du dé, coup brut de Furie compris (2026-10-23) ; une pièce (jet 0) n'a pas de face
            const ok = moments[t.on] ?? (mine && rollMatches(t.on, a.roll, a.faces))
            if (!ok) flag('relique de coup hors de son moment', r, i, `${relic.id} sur ${t.on}`)
            else see('relique de coup')
            // Un coup de N ou plus (Écu cabossé) : les PV que ce coup a retirés
            for (const c of relic.when ?? [])
              if (c.type === 'hitAtLeast' && hit.type !== 'coin') {
                if (a.dealt < c.amount) flag('relique de coup sous son seuil de dégâts', r, i, `${relic.id} : ${a.dealt} PV`)
                else see('relique sur un gros coup')
              }
          }
          // Sans charge ni recharge, et sa seule condition un seuil de dégâts : chaque coup encaissé assez gros la réveille,
          // sauf si le combat finit dans les fenêtres de ce coup (de proche en proche : une Sentence après un Vol de vie)
          const least = relic.when?.length === 1 ? relic.when[0] : undefined
          if (t.on === 'hurt' && least?.type === 'hitAtLeast' && !relic.charges && !relic.cooldown)
            r.beats.forEach((b, j) => {
              const blow = strikeIn(b)
              if (!blow || blow.attacker === side || blow.dodged || blow.replaced || blow.dealt < least.amount) return
              if ([b, ...descendantsOf(r, j)].some((x) => x.state.hp.includes(0))) return
              if (!fires.some((f) => r.beats[f].cause === j)) flag('relique sur un gros coup manquée', r, j, relic.id)
            })
        }
      }
    }
  }

  return { audit, problems, seen }
}
