import { describe, expect, it } from 'vitest'
import { simulateCombat, type Side } from './combat'
import { createCharacter, ENGRAVABLE_SKILLS, ROSTER } from './roster'
import { auraIdsOf, auraOfSkill, originsOf, signalTargets, STATES, STATUS_PLACE, stateValueText, trayStates } from './states'
import { isAura, STATUS_IDS, STATUSES } from './statuses'

/** Une compétence gravable par son id (les compétences hors kit, depuis le d6, se gravent pour être jouées). */
const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!

describe('états affichés : deux niveaux de lecture (0.79.0)', () => {
  it('chaque statut a sa place, et une aura est dans l’en-tête', () => {
    for (const id of STATUS_IDS) {
      const place = STATUS_PLACE[id]
      expect(place, id).toBeDefined()
      if (isAura(id)) expect(place.place, id).toBe('aura')
      // Un mécanisme se place d'après sa définition (une seule source) ; un bonus ou un malus n'est jamais en en-tête de mécanisme
      expect(['form', 'skill'].includes(place.place), id).toBe(STATUSES[id].mechanic !== undefined)
      if (STATUSES[id].mechanic) expect(place.place, id).toBe(STATUSES[id].mechanic)
      // Un statut de la zone d'état alimente exactement un état, sur son porteur
      if (place.place === 'tray') expect(place.relays.map((r) => r.on), id).toEqual(['self'])
      // Un état à total sait compter chaque part qui l'alimente
      for (const r of place.relays) if (STATES[r.state].counter === 'amount') expect(r.amount, `${id} → ${r.state}`).toBeDefined()
    }
  })

  it('les statuts de même effet se regroupent en un seul état, au total signé', () => {
    // Régénération et Sifflotement : un seul « Soin », en PV par tour
    const [heal] = trayStates([{ id: 'regeneration', stacks: 3 }, { id: 'whistling', stacks: 2 }], [])
    expect(heal).toMatchObject({ id: 'healing', value: 5, unit: 'amount' })
    expect(heal.sources.map((s) => s.status.id)).toEqual(['regeneration', 'whistling'])
    expect(stateValueText(heal)).toBe('+5')
    // Fausse note et Affaibli : deux états, car ils ne frappent pas au même moment (audit du 2026-10-21) : Affaibli
    // retire à chaque coup, avant l'armure ; la Fausse note au seul prochain coup qui touche, après l'armure
    const [note, weak] = trayStates([{ id: 'falseNote', stacks: 1 }, { id: 'weakened', stacks: 2 }], [])
    expect(note).toMatchObject({ id: 'spoiled', value: 5 })
    expect(weak).toMatchObject({ id: 'weakened', value: 2 })
    expect(stateValueText(weak)).toBe('−2')
  })

  it('une aura qui agit sur l’adversaire relaie son effet dans la zone de l’adversaire', () => {
    // L'Aura d'intimidation du nain : c'est son adversaire qui frappe moins fort
    const brokk = [{ id: 'intimidationAura' as const, stacks: 2 }]
    expect(trayStates(brokk, [])).toEqual([])
    const [weak] = trayStates([], brokk)
    expect(weak).toMatchObject({ id: 'weakened', value: 2, sources: [{ from: 'opponent' }] })
    expect(weak.sources[0].text).toBe('Ses coups font −2 dégâts, pour le reste du combat')
  })

  it('une aura sur son porteur se lit sur son anneau, pas dans la zone d’état (0.79.7)', () => {
    // Modification permanente, de l'identité : rien dans la zone d'état
    for (const id of ['powerAura', 'wildAura', 'melodiousAura', 'precisionAura', 'holyAura', 'immunityAura', 'bearMight'] as const)
      expect(trayStates([{ id, stacks: 2 }], []), id).toEqual([])
    // Le Poison qu'une aura pose chez l'adversaire est un malus comme un autre, chez lui
    expect(trayStates([{ id: 'poison', stacks: 2 }], [{ id: 'frostAura', stacks: 1 }]).map((s) => s.id)).toEqual(['poison'])
  })

  it('un mécanisme de compétence et une règle de forme ne vont pas dans la zone d’état', () => {
    for (const id of ['retribution', 'coinFlip', 'windFury', 'casting'] as const)
      expect(trayStates([{ id, stacks: 1 }], []), id).toEqual([])
  })

  it('une compétence qui pose une aura se fond dans son anneau', () => {
    // Hors kit depuis le d6 (0.105.0) : l'Aura de puissance gravée sur le 3 de Gorak
    const gorak = createCharacter('gorak').withForge([{ op: 'engrave', face: 3, skill: skill('power-aura') }])
    expect(auraIdsOf(gorak)).toEqual(['powerAura'])
    expect(gorak.events.filter((e) => auraOfSkill(e)).map((e) => e.id)).toEqual(['power-aura'])
    // L'Ouverture de la barde pose aussi son aura : l'anneau rassemble les deux
    const fanchon = createCharacter('fanchon')
    expect(fanchon.events.filter((e) => auraOfSkill(e) === 'melodiousAura').map((e) => e.id).sort()).toEqual(['melodious-aura', 'overture'])
    // L'Aura d'immunité purge aussi ses malus : elle se fond quand même dans son anneau, sans second sceau
    const aldric = createCharacter('aldric').withForge([{ op: 'engrave', face: 3, skill: skill('immunity-aura') }])
    expect(aldric.events.filter((e) => auraOfSkill(e)).map((e) => e.id)).toEqual(['immunity-aura'])
    // Chaque personnage en jeu a au plus deux auras à montrer
    for (const def of ROSTER) expect(auraIdsOf(createCharacter(def.id)).length, def.id).toBeLessThanOrEqual(2)
  })

  it('l’infobulle dit d’où vient un état', () => {
    const elaria = createCharacter('elaria')
    // Le Souffle de la tombe, hors kit depuis le d6, regravé sur le 3 d'Ervald
    const ervald = createCharacter('ervald').withForge([{ op: 'engrave', face: 3, skill: skill('grave-breath') }])
    expect(originsOf('guaranteedCrit', elaria, ervald)).toEqual(['Œil de faucon (Elaria)'])
    // Le poison d'Elaria peut venir du Souffle de la tombe ou de l'Aura glaciale d'Ervald
    expect(originsOf('poison', elaria, ervald)).toEqual(['Souffle de la tombe (Ervald)', 'Aura glaciale (Ervald)'])
  })

  it('le signal d’activation vise la zone où un état apparaît', () => {
    const applied = { kind: 'applied', stacks: 1 }
    expect(signalTargets([{ type: 'applyStatus', target: 1, status: 'poison', result: applied }])).toEqual({ to: [1], polarity: 'negative' })
    // Une aura posée sur soi ne vise rien (son anneau s'allume) ; l'intimidation vise l'adversaire
    expect(signalTargets([{ type: 'applyStatus', target: 0, status: 'powerAura', result: applied }])).toBeUndefined()
    expect(signalTargets([{ type: 'applyStatus', target: 0, status: 'intimidationAura', result: applied }])).toEqual({ to: [1], polarity: 'negative' })
    // Rien à voir : un mécanisme de compétence, un statut bloqué
    expect(signalTargets([{ type: 'applyStatus', target: 0, status: 'windFury', result: applied }])).toBeUndefined()
    expect(signalTargets([{ type: 'applyStatus', target: 1, status: 'poison', result: { kind: 'blocked' } }])).toBeUndefined()
  })

  it('aucun état en combat sans nom ni place : toute la chronologie se lit', () => {
    const ids = ROSTER.map((d) => d.id)
    for (const [k, a] of ids.entries()) {
      const b = ids[(k + 3) % ids.length]
      const result = simulateCombat([createCharacter(a), createCharacter(b)], { seed: k + 1 })
      for (const beat of result.beats)
        for (const side of [0, 1] as Side[])
          for (const state of trayStates(beat.state.statuses[side], beat.state.statuses[side === 0 ? 1 : 0]))
            expect(STATES[state.id].name, `${a} contre ${b}`).toBeTruthy()
    }
  })
})
