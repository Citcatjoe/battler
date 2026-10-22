/*
 * Audit de résolution : revérifie la chronologie d'un combat étape par étape, règle par règle
 * (PV expliqués, chaîne de calcul, compétences du dé, coup sacrifié, esquive imposée, vol de vie,
 * épines, Furie, auras, durées). Il ne fait pas confiance au moteur : il recompte à partir des
 * états avant / après. Utilisé par `audit.test.ts` (tout le roster) et `npm run logs` (les
 * combats joués par l'utilisateur, rejoués depuis leur graine). Méthode : docs/EQUILIBRAGE.md.
 * Toute nouvelle mécanique ajoute ici son contrôle.
 */
import { STAT_KEYS } from './character'
import { beatEffects, diceOf, effectiveStats, type Beat, type CombatResult, type Side, type Snapshot } from './combat'
import { doubleTrigger, isDoubleTrigger, isRollTrigger, rollMatches, type Trigger } from './events'
import { forgeState } from './forge'
import { withRelicStats } from './relics'
import { isMechanic, STATUSES, type Status } from './statuses'

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
    auditCauses(r)
    // Statuts de forme (0.73.0) : un personnage à formes commence avec ceux de sa première forme
    const startStatuses = (side: 0 | 1) => (r.fighters[side].forms?.[0].statuses ?? []).map((id) => ({ id, stacks: 1 }))
    const init: Snapshot = { hp: [r.fighters[0].maxHp, r.fighters[1].maxHp], statuses: [startStatuses(0), startStatuses(1)] }
    const last = r.initiative[r.initiative.length - 1]
    const first = last[0] > last[1] ? 0 : 1
    const active = (t: number) => (t % 2 === 1 ? first : 1 - first)
    // Rafale en cours : dés attendus pour les coups de cette action
    let volley: { turn: number; faces: number[]; next: number } | null = null
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
    const touchControls = (i: number, striker: Side, dealt: number) => {
      const target = (1 - striker) as Side
      const s = r.beats[i].state
      const coin = r.beats[i].type === 'coin'
      const caused = r.beats.filter((x) => x.cause === i)
      const died = caused.some((x) => x.state.hp.some((h) => h === 0))
      const reaction = (id: string) => caused.find((x): x is Extract<Beat, { type: 'statusReaction' }> => x.type === 'statusReaction' && x.status === id)
      const before = (x: Beat) => r.beats[x.id - 1].state
      // Vol de vie
      const drained = reaction('lifesteal')
      if (find(s.statuses[striker], 'lifesteal') && !drained && !died) flag('vol de vie non appliqué', r, i, '')
      if (drained) {
        const was = before(drained)
        const heal = drained.effects[0]
        if (heal?.type !== 'heal' || heal.amount !== Math.min(dealt, r.fighters[striker].maxHp - was.hp[striker])) flag('vol de vie : montant faux', r, i, `${JSON.stringify(heal)} vs dealt ${dealt}`)
        if ((find(drained.state.statuses[striker], 'lifesteal')?.stacks ?? 0) !== (find(was.statuses[striker], 'lifesteal')?.stacks ?? 0) - 1) flag('vol de vie non consommé', r, i, '')
        see(coin ? 'pile : vol de vie' : 'vol de vie')
      }
      // Riposte
      const riposted = reaction('riposte')
      if (find(s.statuses[target], 'riposte') && !riposted && !died) flag('riposte non déclenchée', r, i, '')
      if (riposted) {
        const was = before(riposted)
        const back = riposted.effects[0]
        if (back?.type !== 'damage' || back.target !== striker || back.amount !== Math.round(dealt * STATUSES.riposte.reflectsHit!)) flag('riposte : montant faux', r, i, `${JSON.stringify(back)} vs dealt ${dealt}`)
        if ((find(riposted.state.statuses[target], 'riposte')?.stacks ?? 0) !== (find(was.statuses[target], 'riposte')?.stacks ?? 0) - 1) flag('riposte non consommée', r, i, '')
        see(coin ? 'pile : riposte' : 'riposte')
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
        const end = caused.length ? caused[caused.length - 1].state : s
        const left = find(end.statuses[target], 'bleed')
        if (left && atStart && !died) flag('saignement non déclenché', r, i, '')
        else if (left && !atStart) see('plaie ouverte pendant le coup, qui attend le suivant')
      }
    }
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
          const had = prev.statuses[target].some((x) => STATUSES[x.id].polarity === effect.polarity && !isMechanic(x.id))
          if (applied.type === 'cleanse' && applied.removed.length === 0) flag('purge à vide malgré son repli', r, i, b.event.name)
          if (applied.type !== 'cleanse' && had) flag('repli joué alors qu’il y avait à retirer', r, i, b.event.name)
          if (applied.type !== 'cleanse') see('repli de purge')
        })
        // Dégâts en plusieurs coups (0.76.0, Foudre) : autant de coups que `hits`, chacun du montant demandé
        def?.effects.forEach((effect, k) => {
          const applied = b.event.effects[k]
          if (effect.type !== 'damage' || !effect.hits || applied?.type !== 'damage') return
          if (applied.parts?.length !== effect.hits || applied.parts.some((n) => n !== effect.amount) || applied.amount !== effect.amount * effect.hits)
            flag('coups multiples faux', r, i, `${b.event.name} ${JSON.stringify(applied)}`)
          else see('coups multiples')
        })
        // Purge (0.69.0, Purification double) : elle retire exactement les `count` derniers statuts de sa polarité
        def?.effects.forEach((effect, k) => {
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
      // Règle 9 (2026-10-21) : pendant un coup (attaque ou pièce, jusqu'au coup, à la rafale ou à la paire suivante),
      // seul un statut déjà là au début du coup réagit. Les jauges ne réagissent pas : elles se remplissent.
      if (b.type === 'statusReaction' && !STATUSES[b.status].fillsOnHurt) {
        let k = i - 1
        while (k >= 0 && r.beats[k].turn === b.turn && r.beats[k].phase === b.phase && !['attack', 'coin', 'flurry', 'pair'].includes(r.beats[k].type)) k--
        const opener = k >= 0 && r.beats[k].turn === b.turn && r.beats[k].phase === b.phase ? r.beats[k] : undefined
        if (opener && (opener.type === 'attack' || opener.type === 'coin')) {
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
        // Coup brut (Furie des vents, 0.69.0) : son jet ne sacrifie ni ne transforme rien
        const sacrifice = !a.plain && r.fighters[att].events.some((e) => e.forfeitsHit && inForm(att, e) && rollMatches(e.trigger, a.roll, a.faces))
        // Coup transformé (Charge, Coup de griffe) : la bonne compétence, la bonne valeur, sans critique si demandé
        const reshaper = a.plain ? undefined : r.fighters[att].events.find((e) => e.reshapesHit && inForm(att, e) && rollMatches(e.trigger, a.roll, a.faces))
        // Un coup brut ne vient que d'une rafale instantanée du même tour
        if (a.plain && !r.beats.slice(0, i).some((x) => x.turn === b.turn && x.type === 'flurry' && STATUSES[x.status].instantStrikes))
          flag('coup brut hors d’une Furie', r, i, '')
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
        // Esquive améliorée cumulable (2026-10-21) : une esquive imposée use exactement une charge
        const kept = (find(prev.statuses[def], 'evasion')?.stacks ?? 0) - (find(s.statuses[def], 'evasion')?.stacks ?? 0)
        if (a.dodgeForced && kept !== 1) flag('esquive imposée : une charge par esquive', r, i, `${kept} charge(s) usée(s)`)
        else if (a.dodgeForced && find(s.statuses[def], 'evasion')) see('esquive imposée cumulée')
        if (!a.dodged && !a.forfeited) {
          // Reliques de coup : recomptées depuis les reliques de l'attaquant, avant le critique ; un bonus de face
          // (Fer à quatre clous) ne vaut que si le dé de ce coup fait cette face, et jamais sur un coup brut (2026-10-21)
          const bonus = r.fighters[att].relics.reduce((t, x) => t + (x.rollBonus && (x.onFace === undefined || (!a.plain && x.onFace === a.roll)) ? x.rollBonus : 0), 0)
          if (bonus !== (a.relicBonus ?? []).reduce((t, x) => t + x.amount, 0)) flag('bonus de relique incohérent', r, i, `${bonus}`)
          else if (bonus) see('bonus de relique')
          if (a.plain && r.fighters[att].relics.some((x) => x.onFace === a.roll)) see('coup brut sans relique de face')
          // Face dorée (forge du dé) : la dorure de la face de ce dé, jamais sur un coup brut
          const gild = a.plain ? 0 : (r.fighters[att].gilded[a.roll] ?? 0)
          if (gild !== (a.gild ?? 0)) flag('face dorée incohérente', r, i, `${a.gild ?? 0} au lieu de ${gild}`)
          else if (gild) see('face dorée')
          const value = (a.reshaped?.value ?? a.roll) + bonus + gild
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
          if (s.hp[def] > 0) touchControls(i, att as Side, a.dealt)
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
          // Une relique (seuil franchi par le coup, moment du coup) a sa place dans les fenêtres du coup
          if (x.type !== 'event' && x.type !== 'statusReaction' && x.type !== 'relic') break
          after.push(x)
        }
        if (s.hp[def] > 0)
          for (const e of r.fighters[att].events) {
            if (!isRollTrigger(e.trigger) || !inForm(att, e)) continue
            // Pourfendre (0.70.0) : une compétence `needsTouch` attend que son coup touche
            const should = !a.plain && rollMatches(e.trigger, a.roll, a.faces) && !(e.needsTouch && a.dodged)
            const did = after.some((x) => x.type === 'event' && x.event.eventId === e.id)
            const someoneDied = after.some((x) => x.state.hp.some((h) => h === 0))
            if (should !== did && !(should && someoneDied)) flag(`compétence ${e.name} mal déclenchée`, r, i, `roll ${a.roll}`)
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
        if (b.heads ? dmg !== toss?.damage : dmg !== 0) flag('pièce : dégâts faux', r, i, `${b.heads} ${dmg}`)
        const strike = r.beats.slice(0, i).reverse().find((x) => x.type === 'attack')
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
        // Les coups de la rafale : jusqu'à la rafale suivante du même tour
        const rest = r.beats.slice(i + 1)
        const nextBurst = rest.findIndex((x) => x.type === 'flurry')
        const strikes = (nextBurst < 0 ? rest : rest.slice(0, nextBurst)).filter((x) => x.turn === b.turn && x.type === 'attack')
        const ended = r.turns === b.turn
        if (strikes.length !== b.strikes && !ended) flag('coups multiples : nombre de coups', r, i, `${strikes.length}`)
        // Chaque coup avec son dé : le premier avec le dé du porteur, les suivants avec le dé du statut (d6 de Coup de chance)
        strikes.forEach((x, k) => {
          if (x.type === 'attack' && x.attack.faces !== b.faces[k]) flag('coups multiples : mauvais dé', r, i, `${x.attack.faces} au lieu de d${b.faces[k]}`)
        })
        if (b.side !== active(b.turn)) flag('Furie hors de son tour', r, i, '')
        // Furie instantanée (0.50.0) : la rafale suit, dans la même action, le coup qui l'a déclenchée ; ses
        // coups sont bruts (0.69.0), et un 1 à 3 y frappe pour sa valeur
        if (STATUSES[b.status].instantStrikes) {
          const before = r.beats.slice(0, i).reverse().find((x) => x.turn === b.turn && x.type === 'attack')
          if (!before) flag('Furie instantanée sans coup déclencheur', r, i, '')
          else see('furie instantanée')
          for (const x of strikes) {
            if (x.type !== 'attack') continue
            if (!x.attack.plain || x.attack.forfeited) flag('Furie : coup qui n’est pas brut', r, i, `roll ${x.attack.roll}`)
            else if (x.attack.roll <= 3 && !x.attack.dodged) see('coup brut de 1 à 3')
          }
          if (r.beats.slice(i + 1).some((x) => x.turn === b.turn && x.type === 'flurry' && STATUSES[x.status].instantStrikes)) flag('Furie en chaîne', r, i, '')
        }
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
        const skill = isDouble ? c.events.find((e) => e.trigger === doubleTrigger(b.rolls[0]) && inForm(b.side, e)) : undefined
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
          if (rest.some((x) => x.type === 'event' && doubleTrigger(b.rolls[0]) === x.event.trigger)) flag('compétence de double sans double', r, i, '')
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
      // Aura glaciale (0.69.0) : au début du tour de son porteur, avant son coup, 1 charge de Poison par
      // charge d'aura sur l'adversaire (que l'immunité peut bloquer et la Régénération annuler)
      if (b.type === 'statusTick' && b.status === 'frostAura') {
        if (b.phase !== 'turnStart') flag('aura glaciale hors début de tour', r, i, '')
        if (r.beats.slice(0, i).some((x) => x.turn === b.turn && x.type === 'attack')) flag('aura glaciale après le coup', r, i, '')
        const st = find(prev.statuses[b.side], 'frostAura')!
        const e = b.effects[0]
        if (b.effects.length !== 1 || e.type !== 'applyStatus' || e.status !== 'poison' || e.target === b.side || e.stacks !== st.stacks)
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
    const last = r.initiative[r.initiative.length - 1]
    const first: Side = last[0] > last[1] ? 0 : 1
    /** Moments d'un coup : ses réactions et compétences viennent d'un coup (ou d'une pièce qui touche) */
    const strikeMoments: Trigger[] = ['hit', 'crit', 'hurt', 'missed', 'dodge']
    const actionTypes: Beat['type'][] = ['attack', 'flurry', 'pair', 'skip', 'coin']
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
        if (cause?.type !== 'attack' && cause?.type !== 'coin') flag('réaction au coup sans le coup pour cause', r, i, `${trigger} ← ${cause?.type}`)
        else if (b.type === 'statusReaction') see('cause : réaction au coup')
      }
      if (trigger && isDoubleTrigger(trigger)) {
        if (cause?.type !== 'pair') flag('compétence de double sans la paire pour cause', r, i, `${cause?.type}`)
        else see('cause : compétence de double')
      }
      if (b.type === 'attack') {
        if (cause && cause.type !== 'flurry' && cause.type !== 'pair') flag("coup causé par autre chose qu'une rafale ou une paire", r, i, cause.type)
        if (b.attack.preset && cause?.type !== 'pair') flag('coup de paire sans la paire pour cause', r, i, `${cause?.type}`)
        if (cause?.type === 'flurry') see('cause : coup de rafale')
        if (cause?.type === 'pair') see('cause : coup de paire')
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
    const last = r.initiative[r.initiative.length - 1]
    const first: Side = last[0] > last[1] ? 0 : 1
    const owner = (t: number): Side => (t % 2 === 1 ? first : first === 0 ? 1 : 0)
    // Tours entamés par un camp au tour global `t` : le premier joue les tours impairs, l'autre les pairs
    const ownTurns = (side: Side, t: number) => (side === first ? Math.ceil(t / 2) : Math.floor(t / 2))
    const lastTurn = r.beats[r.beats.length - 1].turn
    for (const side of [0, 1] as const) {
      const f = r.fighters[side]
      // Dé forgé (campagne) : la taille et les dorures sont celles du journal rejoué ; une gravure part sur sa face
      if (f.forge.length) {
        see('dé forgé')
        const forged = forgeState(f.definition, f.forge)
        if (f.baseStats.damageDie !== forged.size) flag('forge : taille du dé fausse', r, 0, `${f.baseStats.damageDie} au lieu de ${forged.size}`)
        if (JSON.stringify(f.gilded) !== JSON.stringify(Object.fromEntries(forged.gilded))) flag('forge : dorures fausses', r, 0, f.id)
        if (r.beats.some((b) => b.type === 'event' && b.event.side === side && /^(face|double):/.test(b.event.trigger))) see('compétence gravée au-delà du 3')
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
        if (t.type === 'turn') {
          for (const i of fires)
            if (r.beats[i].turn === 0 || owner(r.beats[i].turn) !== side || ownTurns(side, r.beats[i].turn) < t.turn) flag('relique de tour hors de son tour', r, i, relic.id)
          if (relic.when) continue
          // Tours prévus : le sien, puis tous les `cooldown` tours, tant qu'il reste des charges ; le dernier tour du
          // combat est exclu (un K.O. au début du tour peut précéder la fenêtre)
          const want: number[] = []
          for (let k = t.turn; (side === first ? 2 * k - 1 : 2 * k) < lastTurn; k += relic.cooldown ?? 1) {
            if (relic.charges !== undefined && want.length >= relic.charges) break
            want.push(k)
          }
          const got = fires.map((i) => ownTurns(side, r.beats[i].turn))
          if (want.some((k) => !got.includes(k))) flag('relique de tour manquée', r, 0, `${relic.id} : ${got.join(',')} au lieu de ${want.join(',')}`)
          else if (got.length) see('relique de tour')
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
              pending = null
            }
            const hp = b.state.hp[watched]
            if (hp >= threshold) armed = true
            else if (armed && hp > 0) {
              armed = false
              // Avec une recharge ou des conditions, un passage peut ne rien déclencher : seul le surplus est contrôlé
              const spent = relic.charges !== undefined && fires.filter((x) => x < i).length >= relic.charges
              if (!spent && !relic.cooldown && !relic.when) pending = i
            }
          })
        }
        if (t.type === 'strike') {
          for (const i of fires) {
            // Le coup du moment : le dernier coup du tour, ou une pièce tombée sur pile qui touche (Pile ou face)
            const hit = r.beats
              .slice(0, i)
              .reverse()
              .find((x) => x.type === 'attack' || x.type === 'coin')
            if (!hit || hit.turn !== r.beats[i].turn || (hit.type !== 'attack' && hit.type !== 'coin')) {
              flag('relique de coup sans coup', r, i, relic.id)
              continue
            }
            const a =
              hit.type === 'attack'
                ? hit.attack
                : { attacker: hit.side, dodged: false, forfeited: !hit.heads, crit: false, plain: true, roll: 0, faces: 2 }
            const mine = a.attacker === side
            const touched = !a.dodged && !a.forfeited
            const moments: Partial<Record<string, boolean>> = {
              hit: mine && touched,
              crit: mine && touched && a.crit,
              missed: mine && a.dodged,
              dodge: !mine && a.dodged,
              hurt: !mine && touched,
            }
            const ok = moments[t.on] ?? (mine && !a.plain && rollMatches(t.on, a.roll, a.faces))
            if (!ok) flag('relique de coup hors de son moment', r, i, `${relic.id} sur ${t.on}`)
            else see('relique de coup')
          }
        }
      }
    }
  }

  return { audit, problems, seen }
}
