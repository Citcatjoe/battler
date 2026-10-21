/*
 * Audit de résolution : rejoue tous les duels du roster sur de nombreuses graines et revérifie
 * chaque étape de la chronologie, règle par règle (PV expliqués, chaîne de calcul, compétences du
 * dé, coup sacrifié, esquive imposée, vol de vie, épines, saignement, Furie et ses coups bruts, auras,
 * Brûlure à une valeur, durées « 1 tour », reliques).
 * Né d'un audit demandé après un tournoi complet (0.26.1). Une anomalie donne son duel et sa
 * graine : `simulateCombat(f, { seed })` et `traceText` la rejouent.
 */
import { describe, expect, it } from 'vitest'
import { createAudit } from './audit'
import { simulateCombat } from './combat'
import { RELICS, type Relic } from './relics'
import { CHARACTER_IDS, createCharacter } from './roster'

const { audit, problems, seen } = createAudit()

/** Relique de coup sur un moment (aucune du registre n'en a encore) : quand il encaisse, recharge de 2 tours. */
const RETORT: Relic = { id: 'retort', name: 'Riposte de test', flavor: 'Test.', trigger: { type: 'strike', on: 'hurt' }, cooldown: 2, effects: [{ type: 'damage', amount: 2, target: 'opponent' }] }
/** Des jeux de reliques variés, tirés du registre (une, deux, toutes) ; le combat k en reçoit un par camp. */
const KITS: Relic[][] = [[], ...RELICS.map((r) => [r]), RELICS.slice(0, 2), RELICS.slice(2), [...RELICS, RETORT], [RETORT]]

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
    // L'audit a bien rencontré chaque mécanique
    for (const k of ['coup sacrifié', 'esquive imposée', 'esquive imposée cumulée', 'bouclier', 'critique assuré', 'réaction thorns', 'réaction lifesteal', 'furie', 'tick frostAura', 'aura glaciale', 'dé imposé', 'estompe', 'repli de purge', 'purge de ses malus', 'pile qui touche', 'pièce lancée aussitôt', 'furie instantanée', 'coup brut de 1 à 3', 'statut de forme', 'coups multiples', 'brûlure à une valeur', 'réaction bleed', 'saignement', 'reliques portées', 'relique de caractéristique', 'bonus de relique', 'relique de tour', 'relique de seuil', 'relique de seuil unique', 'relique de coup'])
      expect(seen[k], k).toBeGreaterThan(0)
  })
})
