import { describe, expect, it } from 'vitest'
import { statusCatalog } from './catalog'
import { simulateCombat, type Side } from './combat'
import { createCharacter, ENGRAVABLE_SKILLS, ROSTER } from './roster'
import { auraIdsOf, auraOfSkill, originsOf, signalTargets, STATES, STATUS_PLACE, stateValueText, trayStates } from './states'
import { isAura, JUDGEMENT_FAULTS, STATUS_IDS, STATUSES } from './statuses'

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
      if (place.place === 'tray') expect(place.relays, id).toHaveLength(1)
      // Un état à total sait compter chaque part qui l'alimente ; seule la Surtension n'en chiffre aucune (ses éclairs ne
      // sont pas des coups, EMBLEMES règle 6)
      for (const r of place.relays) if (STATES[r.state].counter === 'amount' && id !== 'overcharge') expect(r.amount, `${id} → ${r.state}`).toBeDefined()
    }
  })

  it('les statuts de même effet se regroupent en un seul état, au total signé', () => {
    // Régénération et Sifflotement : un seul « Soin », en PV par tour (le Sifflotement rend 3 PV depuis la revue P5)
    const [heal] = trayStates([{ id: 'regeneration', stacks: 3 }, { id: 'whistling', stacks: 2 }])
    expect(heal).toMatchObject({ id: 'healing', value: 6, unit: 'amount' })
    expect(heal.sources.map((s) => s.status.id)).toEqual(['regeneration', 'whistling'])
    expect(stateValueText(heal)).toBe('+6')
    // Fausse note et Affaibli : le même emblème, deux médaillons, car ils ne frappent pas au même moment (EMBLEMES règle 6) :
    // Affaibli retire à chaque coup, avant l'armure ; la Fausse note au seul prochain coup qui touche, après l'armure
    const [note, weak] = trayStates([{ id: 'falseNote', stacks: 1 }, { id: 'weakened', stacks: 2 }])
    expect(note).toMatchObject({ id: 'weakened', moment: 'strike', value: 4 })
    expect(weak).toMatchObject({ id: 'weakened', value: 2 })
    expect(weak.moment).toBeUndefined()
    expect(stateValueText(weak)).toBe('−2')
  })

  it('un médaillon par état et par moment : la pastille dit le moment, le nombre répond à une seule question (EMBLEMES)', () => {
    // Riposte et Peau de crapaud : deux Représailles au coup reçu, un médaillon ; ils partent ensemble sur le même coup,
    // le nombre est donc le plus grand nombre de charges (les prochains coups reçus qui paient), pas leur somme
    const [paid] = trayStates([{ id: 'riposte', stacks: 2 }, { id: 'toadSkin', stacks: 3 }])
    expect(paid).toMatchObject({ id: 'reprisal', value: 3, unit: 'stacks' })
    expect(paid.moment).toBeUndefined()
    // La Sentence et la Flamme votive agissent au soin : même emblème, un autre médaillon, sa pastille
    const split = trayStates([{ id: 'riposte', stacks: 2 }, { id: 'sentence', stacks: 3 }, { id: 'votiveFlame', stacks: 1 }])
    expect(split.map((s) => [s.id, s.moment, s.value])).toEqual([
      ['reprisal', undefined, 2],
      ['reprisal', 'heal', 3],
    ])
    expect(new Set(split.map((s) => s.key)).size).toBe(2)
    // Rancune : un critique assuré à chaque coup reçu (le résultat profite au porteur, règle 2), à côté du Critique assuré
    const crits = trayStates([{ id: 'guaranteedCrit', stacks: 1 }, { id: 'grudge', stacks: 2 }])
    expect(crits.map((s) => [s.id, s.moment, s.value])).toEqual([
      ['sureCrit', undefined, undefined],
      ['sureCrit', 'hurt', 2],
    ])
    // Un nombre qui ne peut valoir que 1 ne s'affiche pas : l'Esquive améliorée, une charge au plus
    expect(trayStates([{ id: 'evasion', stacks: 1 }])[0].value).toBeUndefined()
    // Un seuil se lit « 2/3 » : la Faute mène au Tour perdu
    const [fault] = trayStates([{ id: 'fault', stacks: 2 }])
    expect(fault).toMatchObject({ id: 'lostTurn', moment: 'strike', value: 2, of: JUDGEMENT_FAULTS })
    expect(stateValueText(fault)).toBe(`2/${JUDGEMENT_FAULTS}`)
    // Un statut de relique entre sous son concept (règle 9) : l'Emprise compte les malus de l'adversaire, et s'ajoute au
    // Poing de pierre, qui agit sur les mêmes coups ; la Surtension (ses éclairs) n'y ajoute aucun chiffre
    const foe = [{ id: 'poison' as const, stacks: 3 }, { id: 'bleed' as const, stacks: 1 }]
    const [power] = trayStates([{ id: 'stoneFist', stacks: 1 }, { id: 'grip', stacks: 1 }, { id: 'overcharge', stacks: 1 }], foe)
    expect(power).toMatchObject({ id: 'power', value: 1 + 2, unit: 'amount' })
    expect(power.sources.map((s) => s.status.id)).toEqual(['stoneFist', 'grip', 'overcharge'])
    expect(trayStates([{ id: 'overcharge', stacks: 1 }])[0].value).toBeUndefined()
  })

  it('une ressource lue par une synergie garde son état, sans autre statut en jeu (EMBLEMES règle 5)', () => {
    // Le Poison, le Saignement et la Brûlure sont lus par des compétences et des reliques (Curée, Attiser, Fiole de venin…)
    const inGame = statusCatalog().filter((e) => e.inGame && STATUS_PLACE[e.id].place === 'tray')
    for (const state of ['poison', 'bleed', 'burn'] as const)
      expect(inGame.filter((e) => STATUS_PLACE[e.id].relays[0].state === state).map((e) => e.id), state).toEqual([state])
  })

  it('une aura sur son porteur se lit sur son anneau, pas dans la zone d’état (0.79.7)', () => {
    // Modification permanente, de l'identité : rien dans la zone d'état
    for (const id of ['powerAura', 'holyAura', 'bearMight'] as const)
      expect(trayStates([{ id, stacks: 2 }]), id).toEqual([])
    // Le Poison qu'une aura pose chez l'adversaire est un malus comme un autre, dans sa zone
    expect(trayStates([{ id: 'poison', stacks: 2 }]).map((s) => s.id)).toEqual(['poison'])
  })

  it('un mécanisme de compétence et une règle de forme ne vont pas dans la zone d’état', () => {
    for (const id of ['retribution', 'coinFlip', 'windFury', 'casting'] as const)
      expect(trayStates([{ id, stacks: 1 }]), id).toEqual([])
  })

  it('une compétence qui pose une aura se fond dans son anneau', () => {
    // Gorak, l'Ivresse du sang sur le 1 (Maîtrises) et l'Aura de puissance gravée sur le 3 : deux anneaux
    const gorak = createCharacter('gorak').withForge([{ op: 'engrave', face: 3, skill: skill('power-aura') }])
    expect(auraIdsOf(gorak)).toEqual(['bloodFrenzy', 'powerAura'])
    expect(gorak.events.filter((e) => auraOfSkill(e)).map((e) => e.id)).toEqual(['blood-frenzy', 'power-aura'])
    // La barde : la Ballade sur le 1 (Maîtrises) ; son Duo garde son sceau
    const fanchon = createCharacter('fanchon')
    expect(auraIdsOf(fanchon)).toEqual(['ballad'])
    expect(auraOfSkill(fanchon.events.find((e) => e.id === 'duo')!)).toBeUndefined()
    // Les statuts des reliques sorties des auras et les compétences à charges (refonte des auras, 2026-10-28) se comptent
    // dans la zone d'état, pas dans un anneau
    for (const id of ['immunity', 'grip', 'overcharge', 'leech', 'toadSkin', 'sentence', 'faithShield'] as const)
      expect(trayStates([{ id, stacks: 2 }]).map((s) => s.sources[0].status.id), id).toEqual([id])
    // Chaque personnage en jeu a au plus deux auras à montrer
    for (const def of ROSTER) expect(auraIdsOf(createCharacter(def.id)).length, def.id).toBeLessThanOrEqual(2)
  })

  it('l’infobulle dit d’où vient un état', () => {
    const elaria = createCharacter('elaria')
    // Le Souffle de la tombe, hors kit depuis le d6, regravé sur le 3 d'Ervald
    const ervald = createCharacter('ervald').withForge([{ op: 'engrave', face: 3, skill: skill('grave-breath') }])
    // L'Œil de faucon (la Visée de son 1 ne donne plus de critique assuré depuis la refonte des auras : sa Mire, si)
    expect(originsOf('guaranteedCrit', elaria, ervald)).toEqual(['Œil de faucon (Elaria)'])
    expect(originsOf('aim', elaria, ervald)).toEqual(['Visée (Elaria)'])
    // Le poison d'Elaria peut venir du Souffle de la tombe ou de l'Aura de poison d'Ervald
    expect(originsOf('poison', elaria, ervald)).toEqual(['Souffle de la tombe (Ervald)', 'Aura de poison (Ervald)'])
  })

  it('le signal d’activation vise la zone où un état apparaît', () => {
    const applied = { kind: 'applied', stacks: 1 }
    expect(signalTargets([{ type: 'applyStatus', target: 1, status: 'poison', result: applied }])).toEqual({ to: [1], polarity: 'negative' })
    // Une aura posée sur soi ne vise rien (son anneau s'allume)
    expect(signalTargets([{ type: 'applyStatus', target: 0, status: 'powerAura', result: applied }])).toBeUndefined()
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
          for (const state of trayStates(beat.state.statuses[side]))
            expect(STATES[state.id].name, `${a} contre ${b}`).toBeTruthy()
    }
  })
})
