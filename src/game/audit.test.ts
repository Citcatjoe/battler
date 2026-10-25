/*
 * Audit de résolution : rejoue tous les duels du roster sur de nombreuses graines et revérifie
 * chaque étape de la chronologie, règle par règle (PV expliqués, chaîne de calcul, coup de base, compétences du
 * dé et leur relation au coup, esquive imposée, « un coup qui touche » : vol de vie, riposte, jauges, épines,
 * saignement, pile comprise ; Furie et ses coups bruts, auras, Brûlure à une valeur, usure, mécanismes, reliques).
 * Né d'un audit demandé après un tournoi complet (0.26.1). Une anomalie donne son duel et sa
 * graine : `simulateCombat(f, { seed })` et `traceText` la rejouent.
 */
import { describe, expect, it } from 'vitest'
import { createAudit } from './audit'
import { BOSS } from './campaign'
import { Character } from './character'
import { simulateCombat } from './combat'
import { autoForge, drawForgeOffer, withForgeStep, type ForgeStep } from './forge'
import { getRelic, RELICS, type Relic } from './relics'
import { seededRng } from './rng'
import { CHARACTER_IDS, createCharacter, ENGRAVABLE_SKILLS } from './roster'

const { audit, problems, seen } = createAudit()

/** Relique de coup sur un moment (aucune du registre n'en a encore) : quand il encaisse, recharge de 2 tours. */
const RETORT: Relic = { id: 'retort', name: 'Riposte de test', flavor: 'Test.', trigger: { type: 'strike', on: 'hurt' }, cooldown: 2, effects: [{ type: 'damage', amount: 2, target: 'opponent', source: 'strike' }] }
/**
 * Des jeux de reliques variés, tirés du registre (aucune, une partie, toutes, une seule) ; le combat k en reçoit un par
 * camp, par rang (n modulo leur nombre). Les jeux larges d'abord (2026-10-24, lot des consommateurs) : dans l'ordre
 * d'avant, les vingt et une reliques ne mettaient plus de Fer à quatre clous sous un coup brut de Gorak.
 */
const KITS: Relic[][] = [[], RELICS.slice(0, 2), RELICS.slice(2), [...RELICS, RETORT], [RETORT], ...RELICS.map((r) => [r])]

describe('audit de résolution', () => {
  it('aucune anomalie sur tous les duels du roster', () => {
    let n = 0
    for (const a of CHARACTER_IDS)
      for (const b of CHARACTER_IDS)
        for (let k = 0; k < 40; k++) {
          const fighters = [createCharacter(a), createCharacter(b)] as const
          audit(simulateCombat([...fighters], { seed: 7000 + n }))
          // Mode triche : quelques dés imposés (dont des valeurs hors du dé, ramenées à ses bornes)
          if (k % 8 === 0) audit(simulateCombat([...fighters], { seed: 7000 + n, forcedRolls: { 2: 1, 3: 3, 5: 12, 6: 0 } }))
          // Reliques (tournoi) : un jeu par camp
          if (k % 4 === 1)
            audit(simulateCombat([fighters[0].withRelics(KITS[n % KITS.length]), fighters[1].withRelics(KITS[(n >> 2) % KITS.length])], { seed: 7000 + n }))
          n++
        }
    const report = [...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)
    expect(report).toEqual([])
    // L'audit a bien rencontré chaque mécanique que le roster peut produire. Pile + Vol de vie n'arrive pas
    // (Naraxes n'a pas de Vol de vie), ni l'esquive imposée cumulée (chaque action adverse porte un coup qui use la
    // charge) : combat.test.ts les prouve par des combats construits. Plus de purge de ses propres malus dans le roster
    // depuis la 0.113.0 (la Purification ne vise plus que l'adversaire ; l'Aura d'immunité est hors kit)
    for (const k of ['jet remplacé', 'jet greffé', 'compétence greffée', 'compétence qui modifie son coup', 'coup de base', 'coup de base multiplié', 'deux dés', 'jet de la barde', 'cause : jet greffé', 'esquive imposée', 'bouclier', 'critique assuré', 'réaction thorns', 'réaction lifesteal', 'furie', 'tick frostAura', 'aura glaciale', 'dé imposé', 'estompe', 'repli de purge', 'pile qui touche', 'pièce lancée aussitôt', 'furie instantanée', 'coup brut de 1 à 3', 'statut de forme', 'coups multiples', 'brûlure à une valeur', 'réaction bleed', 'saignement', 'reliques portées', 'relique de caractéristique', 'bonus de relique', 'relique de tour', 'relique de seuil', 'relique de seuil unique', 'relique de coup', 'cause : réaction au coup', 'cause : coup de rafale', 'cause : pièce', 'cause : décompte après son effet', 'vol de vie', 'riposte', 'jauges', 'pile : riposte', 'pile : jauges', 'plaie ouverte pendant le coup, qui attend le suivant', 'réaction d’un statut déjà là au début du coup', 'purge face à un mécanisme', 'coup brut avec relique de face', "dégâts de l'instant", 'dégâts temporaires', 'charges tirées du coup', 'relâche en part', 'compétence épuisée'])
      expect(seen[k] ?? 0, k).toBeGreaterThan(0)
    // 0.110.0 : la Furie part juste après le jet qui la pose (RESOLUTION § 2)
    expect(seen['furie juste après son jet'] ?? 0).toBeGreaterThan(0)
  })
})

describe('audit de résolution : le lot des consommateurs (PROGRESSION.md § 13.3)', () => {
  it('aucune anomalie quand chaque relique porte sur ce qu’elle consomme : Poison, Saignement, soins, gros coups, critiques', () => {
    const { audit, problems, seen } = createAudit()
    // Chaque relique chez les personnages qui produisent sa ressource (et contre tout le roster)
    const hosts: Record<string, readonly string[]> = {
      'venom-vial': ['ervald', 'naraxes'],
      'butcher-hook': ['brokk', 'gorak'],
      'abbey-incense': ['ysolde', 'gorak', 'fanchon'],
      'dented-shield': ['aldric', 'morgrut'],
      'eagle-feather': ['elaria', 'fanchon'],
    }
    let n = 0
    for (const [relic, ids] of Object.entries(hosts))
      for (const id of ids)
        for (const b of CHARACTER_IDS)
          for (let k = 0; k < 3; k++) audit(simulateCombat([createCharacter(id).withRelics([getRelic(relic)]), createCharacter(b)], { seed: 11000 + n++ }))
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    for (const k of ['bonus de relique à conditions', 'relique de soin reçu', 'relique sur un gros coup', 'relique de coup']) expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})

describe('audit de résolution : les reliques de durée (phase 7)', () => {
  it('aucune anomalie pour les PV max à plat, le soin sur un coup encaissé et le bouclier qui revient, chez tout le roster', () => {
    const { audit, problems, seen } = createAudit()
    let n = 0
    for (const relic of ['quilted-gambison', 'bonesetter-salve', 'vigil-candle'])
      for (const a of CHARACTER_IDS)
        for (const b of CHARACTER_IDS) audit(simulateCombat([createCharacter(a).withRelics([getRelic(relic)]), createCharacter(b)], { seed: 12000 + n++ }))
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    for (const k of ['relique de caractéristique', 'relique de coup', 'relique de tour', 'bouclier']) expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})

describe('audit de résolution : phase 8, premier lot (0.114.0)', () => {
  it('aucune anomalie pour la Curée, la Récolte, la Virulence, la Sentence et la Rancune, gravées chez leurs producteurs, aux rangs I et II', () => {
    const { audit, problems, seen } = createAudit()
    const hosts: Record<string, readonly string[]> = {
      quarry: ['brokk', 'gorak'],
      harvest: ['ervald'],
      virulence: ['ervald', 'naraxes'],
      sentence: ['ysolde', 'ervald'],
      grudge: ['morgrut', 'aldric', 'elaria'],
    }
    let n = 0
    for (const [id, ids] of Object.entries(hosts)) {
      const skill = ENGRAVABLE_SKILLS.find((e) => e.id === id)!
      for (const host of ids)
        for (const rank of [0, 1]) {
          const steps: ForgeStep[] = [{ op: 'engrave', face: 3, skill }, ...(rank ? [{ op: 'sharpen' as const, face: 3 }] : [])]
          for (const b of CHARACTER_IDS)
            for (let k = 0; k < 2; k++) audit(simulateCombat([createCharacter(host).withForge(steps), createCharacter(b)], { seed: 13000 + n++ }))
        }
    }
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    for (const k of ['rafale après le coup de base de son jet', 'compétence à condition fausse : face nue', 'charges tirées d’un statut', 'sentence', 'rancune', 'compétence greffée'])
      expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})

describe('audit de résolution : phase 8, second lot', () => {
  it('aucune anomalie pour l’Embrasement, le Dé pipé, le Rempart hérissé et la Vindicte gravés chez leurs producteurs, aux rangs I et II, ni pour leurs quatre reliques', () => {
    const { audit, problems, seen } = createAudit()
    // Chaque consommatrice chez ses producteurs : la Brûlure (Thaldrin, Ervald aux Feux follets gravés sur le 4), la pièce
    // (Naraxes), l'armure temporaire (Brokk ; Morgrut à la Chandelle de veille), les renvois (Aldric ; Brokk à la Riposte
    // gravée sur le 4)
    const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
    const hosts: Record<string, readonly [string, ForgeStep[], string[]][]> = {
      conflagration: [['thaldrin', [], []], ['ervald', [{ op: 'engrave', face: 4, skill: skill('firefly') }], []]],
      'loaded-die': [['naraxes', [], []]],
      'bristling-rampart': [['brokk', [], []], ['morgrut', [], ['vigil-candle']]],
      vendetta: [['aldric', [], []], ['brokk', [{ op: 'engrave', face: 4, skill: skill('riposte') }], []]],
    }
    let n = 0
    for (const [id, list] of Object.entries(hosts))
      for (const [host, before, relics] of list)
        for (const rank of [0, 1]) {
          const steps: ForgeStep[] = [...before, { op: 'engrave', face: 3, skill: skill(id) }, ...(rank ? [{ op: 'sharpen' as const, face: 3 }] : [])]
          for (const b of CHARACTER_IDS)
            for (let k = 0; k < 3; k++) audit(simulateCombat([createCharacter(host).withForge(steps).withRelics(relics.map(getRelic)), createCharacter(b)], { seed: 15000 + n++ }))
        }
    // Les quatre reliques chez leurs producteurs, seules puis avec la consommatrice de la même ressource
    const relicHosts: Record<string, readonly [string, string][]> = {
      'forge-bellows': [['thaldrin', 'conflagration']],
      'pavise-nails': [['brokk', 'bristling-rampart']],
      'talion-gauntlet': [['aldric', 'vendetta']],
      'holed-coin': [['naraxes', 'loaded-die']],
    }
    for (const [id, list] of Object.entries(relicHosts))
      for (const [host, partner] of list)
        for (const steps of [[], [{ op: 'engrave' as const, face: 3, skill: skill(partner) }]])
          for (const b of CHARACTER_IDS)
            for (let k = 0; k < 3; k++) audit(simulateCombat([createCharacter(host).withForge(steps).withRelics([getRelic(id)]), createCharacter(b)], { seed: 15000 + n++ }))
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    for (const k of ['embrasement', 'pièce pipée', 'rempart hérissé', 'vindicte', 'relique : shieldBroken', 'relique : reflected', 'relique : heads', 'bonus de relique à conditions'])
      expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})

describe('audit de résolution : dés forgés (campagne, 0.88.0)', () => {
  it('aucune anomalie pour des personnages forgés au hasard, ni pour le boss', () => {
    const { audit, problems, seen } = createAudit()
    /** Six forges choisies au hasard dans les offres, comme le champion de référence. */
    const forged = (id: string, seed: number) => {
      const c = createCharacter(id)
      const rng = seededRng(seed)
      let steps: ForgeStep[] = []
      for (let k = 0; k < 6; k++) {
        const step = autoForge(c.definition, steps, drawForgeOffer(c.definition, steps, rng, ENGRAVABLE_SKILLS), rng)
        if (step) steps = withForgeStep(c.definition, steps, step)
      }
      return c.withForge(steps)
    }
    let n = 0
    for (const a of CHARACTER_IDS)
      for (const b of [...CHARACTER_IDS, BOSS.id])
        for (let k = 0; k < 6; k++) {
          const right = b === BOSS.id ? new Character(BOSS) : forged(b, 300 + n)
          audit(simulateCombat([forged(a, 100 + n), right], { seed: 9000 + n }))
          n++
        }
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    // Crescendo (hors kit, 0.107.0) : seule une gravure le joue, son coup qui monte. Une Furie aiguisée (0.110.0) ajoute
    // un coup à sa rafale ; elle ne pose plus deux charges (la Furie à plusieurs charges ne vient plus d'un dé forgé)
    for (const k of ['dé forgé', 'face dorée', 'compétence gravée au-delà du 3', 'deux dés', 'attaque trempée', 'coup qui monte', 'furie juste après son jet', 'furie aiguisée']) expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})
