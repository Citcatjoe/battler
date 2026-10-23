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
import { RELICS, type Relic } from './relics'
import { seededRng } from './rng'
import { CHARACTER_IDS, createCharacter, ENGRAVABLE_SKILLS } from './roster'

const { audit, problems, seen } = createAudit()

/** Relique de coup sur un moment (aucune du registre n'en a encore) : quand il encaisse, recharge de 2 tours. */
const RETORT: Relic = { id: 'retort', name: 'Riposte de test', flavor: 'Test.', trigger: { type: 'strike', on: 'hurt' }, cooldown: 2, effects: [{ type: 'damage', amount: 2, target: 'opponent', source: 'strike' }] }
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
    // L'audit a bien rencontré chaque mécanique que le roster peut produire. Pile + Vol de vie n'arrive pas
    // (Naraxes n'a pas de Vol de vie), ni l'esquive imposée cumulée (chaque action adverse porte un coup qui use la
    // charge) : combat.test.ts les prouve par des combats construits.
    for (const k of ['jet remplacé', 'jet greffé', 'compétence greffée', 'compétence qui modifie son coup', 'coup de base DP', 'coup de base DM', 'coup de base multiplié', 'double qui se greffe sur ses coups', 'cause : jet greffé', 'esquive imposée', 'bouclier', 'critique assuré', 'réaction thorns', 'réaction lifesteal', 'furie', 'tick frostAura', 'aura glaciale', 'dé imposé', 'estompe', 'repli de purge', 'purge de ses malus', 'pile qui touche', 'pièce lancée aussitôt', 'furie instantanée', 'coup brut de 1 à 3', 'statut de forme', 'coups multiples', 'brûlure à une valeur', 'réaction bleed', 'saignement', 'reliques portées', 'relique de caractéristique', 'bonus de relique', 'relique de tour', 'relique de seuil', 'relique de seuil unique', 'relique de coup', 'cause : réaction au coup', 'cause : compétence de double', 'cause : coup de rafale', 'cause : coup de paire', 'cause : pièce', 'cause : décompte après son effet', 'vol de vie', 'riposte', 'jauges', 'pile : riposte', 'pile : jauges', 'plaie ouverte pendant le coup, qui attend le suivant', 'réaction d’un statut déjà là au début du coup', 'purge face à un mécanisme', 'coup brut avec relique de face', 'type de dégâts DP', 'type de dégâts DM', 'type de dégâts DT'])
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
    for (const k of ['dé forgé', 'face dorée', 'compétence gravée au-delà du 3', 'paire de dés', 'attaque trempée']) expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})
