/*
 * Audit de résolution : rejoue tous les duels du roster sur de nombreuses graines et revérifie
 * chaque étape de la chronologie, règle par règle (PV expliqués, chaîne de calcul, compétences du
 * dé, coup sacrifié, esquive imposée, vol de vie, épines, Furie, auras, durées « 1 tour »).
 * Né d'un audit demandé après un tournoi complet (0.26.1). Une anomalie donne son duel et sa
 * graine : `simulateCombat(f, { seed })` et `traceText` la rejouent.
 */
import { describe, expect, it } from 'vitest'
import { createAudit } from './audit'
import { simulateCombat } from './combat'
import { CHARACTER_IDS, createCharacter } from './roster'

const { audit, problems, seen } = createAudit()

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
          n++
        }
    const report = [...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)
    expect(report).toEqual([])
    // L'audit a bien rencontré chaque mécanique
    for (const k of ['coup sacrifié', 'esquive imposée', 'bouclier', 'critique assuré', 'réaction thorns', 'réaction lifesteal', 'furie', 'tick poisonAura', 'dé imposé', 'estompe'])
      expect(seen[k], k).toBeGreaterThan(0)
  })
})
