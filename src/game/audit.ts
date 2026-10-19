/*
 * Audit de résolution : revérifie la chronologie d'un combat étape par étape, règle par règle
 * (PV expliqués, chaîne de calcul, compétences du dé, coup sacrifié, esquive imposée, vol de vie,
 * épines, Furie, auras, durées). Il ne fait pas confiance au moteur : il recompte à partir des
 * états avant / après. Utilisé par `audit.test.ts` (tout le roster) et `npm run logs` (les
 * combats joués par l'utilisateur, rejoués depuis leur graine). Méthode : docs/EQUILIBRAGE.md.
 * Toute nouvelle mécanique ajoute ici son contrôle.
 */
import { diceOf, effectiveStats, type Beat, type CombatResult, type Snapshot } from './combat'
import { DOUBLE_TRIGGERS, rollMatches } from './events'
import { STATUSES, type Status } from './statuses'

const find = (l: readonly Status[], id: string) => l.find((s) => s.id === id)

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
      if (b.type === 'attack') { if (b.attack.forfeited) see('coup sacrifié'); if (b.attack.dodgeForced) see('esquive imposée'); if (b.attack.shieldAbsorbed) see('bouclier'); if (b.attack.critForced) see('critique assuré') }
      if (b.type === 'statusReaction') see(`réaction ${b.status}`)
      if (b.type === 'flurry') see('furie')
      if (b.type === 'statusTick') see(`tick ${b.status}`)
      if (b.type === 'event') see(`compétence ${b.event.name}`)
    }
    // Mode triche : seuls les dés de `forcedRolls` sont marqués imposés, avec leur valeur (ramenée au dé)
    let rank = 0
    r.beats.forEach((b, i) => {
      diceOf(b).forEach((die, k) => {
        const asked = r.forcedRolls?.[rank++]
        const marked = b.type === 'attack' ? b.attack.forced : b.type === 'coin' ? b.forced : b.type === 'pair' ? b.forced?.[k] : undefined
        if (!!marked !== (asked !== undefined)) flag('dé imposé incohérent', r, i, `rang ${rank - 1} : marqué ${!!marked}, demandé ${asked}`)
        if (asked === undefined) return
        see('dé imposé')
        const value = b.type === 'attack' ? b.attack.roll : b.type === 'coin' ? (b.heads ? 1 : 2) : b.type === 'pair' ? b.rolls[k] : 0
        if (value !== Math.min(die.faces, Math.max(1, asked))) flag('dé imposé ignoré', r, i, `rang ${rank - 1} : ${value} au lieu de ${asked}`)
      })
    })
    const init: Snapshot = { hp: [r.fighters[0].maxHp, r.fighters[1].maxHp], statuses: [[], []] }
    const last = r.initiative[r.initiative.length - 1]
    const first = last[0] > last[1] ? 0 : 1
    const active = (t: number) => (t % 2 === 1 ? first : 1 - first)
    // Rafale en cours : dés attendus pour les coups de cette action
    let volley: { turn: number; faces: number[]; next: number } | null = null
    // Forme en cours de chaque camp (druide) : une compétence de forme n'existe que sous sa forme
    const form = [0, 0]
    const inForm = (side: number, e: { form?: string }) => !e.form || e.form === r.fighters[side].forms?.[form[side]].id
    const stateBefore = (i: number) => (i ? r.beats[i - 1].state : init)
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
      if (b.type === 'flurry') volley = { turn: b.turn, faces: b.faces, next: 0 }
      const prev = i ? r.beats[i - 1].state : init
      const s = b.state
      // PV : chaque variation s'explique par l'étape
      for (const side of [0, 1] as const) {
        let delta = 0
        const effects =
        b.type === 'event' ? b.event.effects : b.type === 'statusTick' || b.type === 'statusReaction' || b.type === 'coin' ? b.effects : []
        for (const e of effects) if (e.target === side) delta += e.type === 'heal' ? e.amount : e.type === 'damage' ? -e.amount : 0
        if (b.type === 'attack' && b.attack.attacker !== side) delta -= b.attack.dealt
        // Dégâts comptés en entier (overkill) : les PV, eux, s'arrêtent à 0
        if (s.hp[side] !== Math.max(0, prev.hp[side] + delta)) flag('PV inexpliqués', r, i, `${b.type} côté ${side} : ${prev.hp[side]} → ${s.hp[side]}, attendu ${delta}`)
        if (s.hp[side] < 0 || s.hp[side] > r.fighters[side].maxHp) flag('PV hors bornes', r, i, `${s.hp[side]}`)
        const ids = s.statuses[side].map((x) => x.id)
        if (new Set(ids).size !== ids.length) flag('statut en double', r, i, ids.join(','))
        for (const st of s.statuses[side]) {
          const cap = STATUSES[st.id].maxStacks
          if (cap !== undefined && st.stacks > cap) flag('plafond dépassé', r, i, `${st.id} ${st.stacks}`)
          if (st.stacks <= 0 || (st.turns !== undefined && st.turns <= 0)) flag('statut vide', r, i, `${st.id}`)
        }
      }
      if (i > 0 && prev.hp.some((h) => h === 0)) flag('étape après K.O.', r, i, b.type)
      // Purge avec repli (0.42.0, Purification) : le repli ne joue que s'il n'y avait rien à retirer
      if (b.type === 'event') {
        const def = r.fighters[b.event.side].events.find((e) => e.id === b.event.eventId)
        def?.effects.forEach((effect, k) => {
          const applied = b.event.effects[k]
          if (effect.type !== 'cleanse' || !effect.orElse || !applied) return
          const target = effect.target === 'opponent' ? 1 - b.event.side : b.event.side
          const had = prev.statuses[target].some((x) => STATUSES[x.id].polarity === effect.polarity)
          if (applied.type === 'cleanse' && applied.removed.length === 0) flag('purge à vide malgré son repli', r, i, b.event.name)
          if (applied.type !== 'cleanse' && had) flag('repli joué alors qu’il y avait à retirer', r, i, b.event.name)
          if (applied.type !== 'cleanse') see('repli de purge')
        })
      }
      // Un statut de durée ne perd un tour que pendant une étape statusDuration
      if (b.type !== 'statusDuration')
        for (const side of [0, 1] as const)
          for (const st of s.statuses[side]) {
            const was = find(prev.statuses[side], st.id)
            if (was?.turns !== undefined && st.turns !== undefined && st.turns < was.turns && b.type !== 'event' && b.type !== 'statusReaction')
              flag('durée décomptée hors de son étape', r, i, `${st.id} ${was.turns}→${st.turns} (${b.type})`)
          }
      if (b.type === 'statusDuration' || b.type === 'statusExpire' || b.type === 'statusTick') {
        // Exception (0.45.0) : un statut `onOpponentTurnStart` agit au début du tour de l'adversaire de son porteur
        const opponentTick = b.type === 'statusTick' && STATUSES[b.status].onOpponentTurnStart !== undefined
        if (opponentTick ? b.side === active(b.turn) || b.phase !== 'turnStart' : b.side !== active(b.turn))
          flag('phase de statut sur le mauvais camp', r, i, `${b.type} côté ${b.side}`)
        if (opponentTick) see('aura au tour adverse')
      }
      if (b.type === 'attack') {
        const a = b.attack
        const att = a.attacker
        const def = 1 - att
        if (att !== active(b.turn)) flag('attaque hors de son tour', r, i, `côté ${att}`)
        const eff = effectiveStats(r.fighters[att], prev.statuses[att])
        const effDef = effectiveStats(r.fighters[def], prev.statuses[def])
        const v = volley as { turn: number; faces: number[]; next: number } | null
        const expectedDie = v && v.turn === b.turn && v.next > 0 ? v.faces[v.next] : eff.damageDie
        if (v && v.turn === b.turn) v.next++
        if (a.faces !== expectedDie) flag('dé incohérent', r, i, `${a.faces} vs ${expectedDie}`)
        if (a.critMultiplier !== eff.critMultiplier) flag('multiplicateur incohérent', r, i, `${a.critMultiplier} vs ${eff.critMultiplier}`)
        if (a.armor !== effDef.armor) flag('armure incohérente', r, i, `${a.armor} vs ${effDef.armor}`)
        const sacrifice = r.fighters[att].events.some((e) => e.forfeitsHit && inForm(att, e) && rollMatches(e.trigger, a.roll, a.faces))
        // Coup transformé (Charge, Coup de griffe) : la bonne compétence, la bonne valeur, sans critique si demandé
        const reshaper = r.fighters[att].events.find((e) => e.reshapesHit && inForm(att, e) && rollMatches(e.trigger, a.roll, a.faces))
        // Le gros coup d'un double (`merged`, barde) est vérifié avec sa paire
        if (!!reshaper !== !!a.reshaped && !a.forfeited && !a.preset) flag('coup transformé incohérent', r, i, `roll ${a.roll}`)
        if (reshaper && a.reshaped) {
          see(`coup transformé ${reshaper.name}`)
          const rs = reshaper.reshapesHit!
          const ok = rs.value === 'max' ? a.reshaped.value === a.faces : a.reshaped.value >= 1 + (rs.bonus ?? 0) && a.reshaped.value <= a.faces + (rs.bonus ?? 0)
          if (!ok || a.reshaped.event !== reshaper.id) flag('coup transformé : valeur fausse', r, i, `${a.reshaped.value}`)
          if (rs.noCrit && a.crit) flag('coup transformé : critique interdit', r, i, '')
        }
        // Luciole : plus d'esquive (sauf esquive imposée) ; chaque coup qui touche retire une charge
        const firefly = find(prev.statuses[def], 'firefly')
        if (firefly) {
          see('luciole')
          if (a.dodged && !a.dodgeForced) flag('esquive malgré Luciole', r, i, '')
          if (!a.dodged && !a.forfeited) {
            const left = find(r.beats[i + 1]?.state.statuses[def] ?? s.statuses[def], 'firefly')?.stacks ?? 0
            if (s.hp[def] > 0 && left !== firefly.stacks - 1) flag('Luciole non consommée', r, i, `${firefly.stacks} → ${left}`)
          }
        }
        if (a.forfeited !== sacrifice) flag('coup sacrifié incohérent', r, i, `roll ${a.roll}`)
        const evasion = !!find(prev.statuses[def], 'evasion')
        if (!a.forfeited && a.dodgeForced !== evasion) flag('esquive imposée incohérente', r, i, `evasion ${evasion}`)
        if (a.dodgeForced && find(s.statuses[def], 'evasion')) flag('esquive imposée non consommée', r, i, '')
        if (!a.dodged && !a.forfeited) {
          const value = a.reshaped?.value ?? a.roll
          let raw = a.crit ? Math.round(value * a.critMultiplier) : value
          for (const st of prev.statuses[att]) raw = STATUSES[st.id].modifyOutgoing?.(raw, st) ?? raw
          for (const st of prev.statuses[def]) raw = STATUSES[st.id].modifyIncoming?.(raw, st) ?? raw
          raw = Math.max(1, Math.round(raw))
          if (raw !== a.raw) flag('dégâts bruts faux', r, i, `${a.raw} vs ${raw}`)
          const afterArmor = Math.max(1, raw - a.armor)
          // Boucliers (armure temporaire, écorce), dans l'ordre de pose : chacun absorbe sans descendre sous 1
          let expected = afterArmor
          for (const st of prev.statuses[def]) if (STATUSES[st.id].shield) expected -= Math.min(st.stacks, expected - 1)
          // Dégâts finaux (Aura mélodieuse, Fausse note, 0.41.0) : après les boucliers, au moins 1
          for (const st of prev.statuses[att]) {
            const modify = STATUSES[st.id].modifyFinal
            if (modify) expected = Math.max(1, Math.round(modify(expected, st)))
          }
          if (a.damage !== expected) flag('dégâts finaux faux', r, i, `${a.damage} vs ${expected}`)
          if (a.dealt !== a.damage) flag('dégâts comptés faux', r, i, '')
          const forcing = find(prev.statuses[att], 'guaranteedCrit')
          if (!!forcing !== a.critForced) flag('critique assuré incohérent', r, i, '')
          // Vol de vie
          const drain = find(prev.statuses[att], 'lifesteal')
          const next = r.beats[i + 1]
          const drained = next?.type === 'statusReaction' && next.status === 'lifesteal'
          if (drain && s.hp[def] > 0 && !drained) flag('vol de vie non appliqué', r, i, '')
          if (!drain && drained) flag('vol de vie sans charge', r, i, '')
          // Une charge par coup qui touche (deux charges par Vol de vie depuis la 0.45.0)
          const left = find(r.beats[i + 1]?.state.statuses[att] ?? [], 'lifesteal')?.stacks ?? 0
          if (drain && s.hp[def] > 0 && left !== drain.stacks - 1) flag('vol de vie non consommé', r, i, `${drain.stacks} → ${left}`)
          if (drained && next.effects[0].type === 'heal' && next.effects[0].amount !== Math.min(a.dealt, r.fighters[att].maxHp - s.hp[att]))
            flag('vol de vie : montant faux', r, i, `${next.effects[0].amount} vs dealt ${a.dealt}`)
          // Épines : réaction attendue dans les étapes qui suivent (avant le prochain coup)
          const thorns = find(prev.statuses[def], 'thorns')
          if (thorns && s.hp[def] > 0) {
            const after = r.beats.slice(i + 1)
            const stop = after.findIndex((x) => x.type === 'attack' || x.turn !== b.turn)
            const window = stop < 0 ? after : after.slice(0, stop)
            const reacted = window.some((x) => x.type === 'statusReaction' && x.status === 'thorns')
            const attackerDead = window.some((x) => x.state.hp[att] === 0)
            if (!reacted && !attackerDead && !window.some((x) => x.state.hp[def] === 0)) flag('épines non déclenchées', r, i, '')
          }
        } else if (a.damage !== 0 || a.dealt !== 0) flag('coup nul avec dégâts', r, i, '')
        // Vol de vie (0.29.0) : esquivé, la charge est perdue ; jet de compétence, elle reste (ou est renouvelée)
        if (find(prev.statuses[att], 'lifesteal')) {
          const was = find(prev.statuses[att], 'lifesteal')!.stacks
          if (a.dodged && (find(s.statuses[att], 'lifesteal')?.stacks ?? 0) !== was - 1) flag('vol de vie gardé après une esquive', r, i, '')
          if (a.forfeited && !find(s.statuses[att], 'lifesteal')) flag('vol de vie perdu sur un jet de compétence', r, i, '')
        }
        // Compétences du dé : déclenchées exactement quand il faut
        const after: Beat[] = []
        for (const x of r.beats.slice(i + 1)) {
          if (x.type !== 'event' && x.type !== 'statusReaction') break
          after.push(x)
        }
        if (s.hp[def] > 0)
          for (const e of r.fighters[att].events) {
            if (!['naturalOne', 'naturalTwo', 'naturalThree', 'naturalMax'].includes(e.trigger) || !inForm(att, e)) continue
            const should = rollMatches(e.trigger, a.roll, a.faces)
            const did = after.some((x) => x.type === 'event' && x.event.eventId === e.id)
            const someoneDied = after.some((x) => x.state.hp.some((h) => h === 0))
            if (should !== did && !(should && someoneDied)) flag(`compétence ${e.name} mal déclenchée`, r, i, `roll ${a.roll}`)
          }
      }
        // Pile ou face (0.30.0) : pile = dégâts directs de la pièce, face = rien ; le statut est consommé.
        // La pièce et ses dégâts sont lus dans le registre (0.42.0).
      if (b.type === 'coin') {
        const toss = STATUSES[b.status].coinToss
        if (!toss || !find(prev.statuses[b.side], b.status)) flag('pièce sans Pile ou face', r, i, b.status)
        if (find(s.statuses[b.side], b.status)) flag('Pile ou face non consommé', r, i, '')
        const dmg = b.effects.reduce((t, e) => t + (e.type === 'damage' && e.target !== b.side ? e.amount : 0), 0)
        if (b.heads ? dmg !== toss?.damage : dmg !== 0) flag('pièce : dégâts faux', r, i, `${b.heads} ${dmg}`)
        if (b.side !== active(b.turn)) flag('pièce hors de son tour', r, i, '')
        if (r.beats.some((x) => x.turn === b.turn && x.type === 'attack' && x.attack.attacker === b.side))
          flag('coup porté le tour de la pièce', r, i, '')
        // Pile qui touche : la réaction « quand il touche » d'une Aura de décoction suit la pièce
        if (b.heads && toss?.headsTouches && find(s.statuses[b.side], 'decoctionAura') && s.hp[1 - b.side] > 0) {
          const next = r.beats[i + 1]
          if (!(next?.type === 'statusReaction' && next.status === 'decoctionAura')) flag('pile qui touche sans décoction', r, i, '')
          else see('pile qui touche')
        }
      }
      if (b.type === 'flurry') {
        const strikes = r.beats.slice(i + 1).filter((x) => x.turn === b.turn && x.type === 'attack')
        const ended = r.turns === b.turn
        if (strikes.length !== b.strikes && !ended) flag('coups multiples : nombre de coups', r, i, `${strikes.length}`)
        // Chaque coup avec son dé : le premier avec le dé du porteur, les suivants avec le dé du statut (d6 de Coup de chance)
        strikes.forEach((x, k) => {
          if (x.type === 'attack' && x.attack.faces !== b.faces[k]) flag('coups multiples : mauvais dé', r, i, `${x.attack.faces} au lieu de d${b.faces[k]}`)
        })
        if (b.side !== active(b.turn)) flag('Furie hors de son tour', r, i, '')
        // Charges en réserve (0.46.0) : une seule est dépensée par action, les autres restent
        if (STATUSES[b.status].strikeCharges === 'one') {
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
      // Deux dés (barde, 0.41.0) : une paire, puis deux coups de ses valeurs, ou la compétence du double et ses coups
      if (b.type === 'pair') {
        see('paire de dés')
        const c = r.fighters[b.side]
        if (!c.twinDice) flag('paire sans deux dés', r, i, '')
        if (b.side !== active(b.turn)) flag('paire hors de son tour', r, i, '')
        const isDouble = b.rolls[0] === b.rolls[1]
        const skill = isDouble ? c.events.find((e) => e.trigger === DOUBLE_TRIGGERS[b.rolls[0]] && inForm(b.side, e)) : undefined
        if ((b.double !== undefined) !== !!skill) flag('double incohérent', r, i, `${b.rolls} double ${b.double}`)
        const rest = r.beats.slice(i + 1).filter((x) => x.turn === b.turn)
        const strikes = rest.filter((x) => x.type === 'attack')
        const ended = r.turns === b.turn
        if (strikes.some((x) => x.type === 'attack' && !x.attack.preset)) flag('coup lancé après une paire', r, i, '')
        if (skill) {
          see(`double ${skill.name}`)
          const next = r.beats[i + 1]
          if (next?.type !== 'event' || next.event.eventId !== skill.id) flag('double : compétence absente', r, i, next?.type ?? '')
          // `merged` (Crescendo, Soliste) : un seul coup qui vaut la somme
          const count = skill.merged ? 1 : (skill.volley ?? 0)
          const value = skill.merged ? (skill.volley ?? 0) * b.rolls[0] : b.rolls[0]
          if (!ended && strikes.length !== (skill.volley ? count : 0)) flag('double : nombre de coups', r, i, `${strikes.length}`)
          if (strikes.some((x) => x.type === 'attack' && (x.attack.reshaped?.value ?? x.attack.roll) !== value)) flag('double : valeur des coups', r, i, '')
          if (strikes.some((x) => x.type === 'attack' && x.attack.roll !== b.rolls[0])) flag('double : dé affiché', r, i, '')
        } else {
          if (!ended && strikes.length !== 2) flag('paire : nombre de coups', r, i, `${strikes.length}`)
          strikes.forEach((x, k) => {
            if (x.type === 'attack' && x.attack.roll !== b.rolls[k]) flag('paire : valeur des coups', r, i, `${x.attack.roll} au lieu de ${b.rolls[k]}`)
          })
          if (rest.some((x) => x.type === 'event' && DOUBLE_TRIGGERS[b.rolls[0]] === x.event.trigger)) flag('compétence de double sans double', r, i, '')
        }
      }
      if (b.type === 'attack' && b.attack.preset) {
        const pair = r.beats.slice(0, i).reverse().find((x) => x.type === 'pair' || x.type === 'flurry' || x.turn !== b.turn)
        if (pair?.type !== 'pair' || pair.turn !== b.turn) flag('coup de paire sans paire', r, i, '')
      }
      // Fausse note (0.41.0) : le coup du porteur qui touche la subit, puis elle disparaît ; esquivé ou sacrifié, elle reste
      if (b.type === 'attack') {
        const att = b.attack.attacker
        const note = find(stateBefore(i).statuses[att], 'falseNote')
        if (note) {
          see('fausse note')
          const touched = !b.attack.dodged && !b.attack.forfeited
          const left = find(b.state.statuses[att], 'falseNote')
          if (touched && left) flag('Fausse note non consommée', r, i, '')
          if (!touched && left?.stacks !== note.stacks) flag('Fausse note perdue sans toucher', r, i, '')
          const before = b.attack.damage - b.attack.modifiers.reduce((t, m) => t + (m.final ? m.delta : 0), 0)
          if (touched && !b.attack.modifiers.some((m) => m.status === 'falseNote') && before > 1) flag('Fausse note sans effet', r, i, '')
        }
      }
      // Aura de poison : toujours avant l'action du porteur
      if (b.type === 'statusTick' && b.status === 'poisonAura') {
        if (b.phase !== 'turnStart') flag('aura de poison hors début de tour', r, i, '')
        const before = r.beats.slice(0, i).some((x) => x.turn === b.turn && x.type === 'attack')
        if (before) flag('aura de poison après le coup', r, i, '')
        const st = find(prev.statuses[b.side], 'poisonAura')!
        const e = b.effects[0]
        if (!e || e.type !== 'damage' || e.target === b.side || e.amount !== st.stacks)
          flag('aura de poison : montant ou cible', r, i, JSON.stringify(b.effects))
      }
    })
    // Durées de « 1 tour » : Furie et Vol de vie doivent survivre jusqu'à l'action suivante du porteur
    r.beats.forEach((b, i) => {
      if (b.type !== 'event') return
      for (const e of b.event.effects) {
        if (e.type !== 'applyStatus' || e.result.kind !== 'applied') continue
        if (e.status !== 'windFury' && e.status !== 'lifesteal') continue
        const side = e.target
        const nextTurn = r.beats.find((x) => x.turn === b.turn + 2)
        if (!nextTurn) continue
        const atStart = r.beats.filter((x) => x.turn === b.turn + 2)[0]
        const prevState = r.beats[r.beats.indexOf(atStart) - 1].state
        // Une Purification adverse peut l'avoir retiré entre-temps
        const purged = r.beats
          .slice(i, r.beats.indexOf(atStart))
          .some((x) => (x.type === 'event' ? x.event.effects : []).some((f) => f.type === 'cleanse' && f.removed.includes(e.status)))
        if (!find(prevState.statuses[side], e.status) && !purged) flag(`${e.status} perdu avant l'action suivante`, r, i, '')
      }
    })
    // Fin : un seul perdant à 0
    const fin = r.beats[r.beats.length - 1].state
    if (fin.hp[1 - r.winner] !== 0 && r.endedBy === 'ko') flag('fin incohérente', r, r.beats.length - 1, '')
  }

  return { audit, problems, seen }
}
