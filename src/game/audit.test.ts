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
import { rollFace } from './events'

const { audit, problems, seen } = createAudit()

/**
 * `host` avec la compétence `id` au rang `rank` (0 : rang I) : gravée sur le 3, après `before` ; ou, si son dé de départ la
 * porte déjà (Maîtrises, 2026-10-27 : la Vindicte d'Aldric, la Feinte d'Elaria, l'Ivresse de Gorak…), aiguisée sur sa face.
 */
function withSkill(host: string, id: string, rank: number, before: ForgeStep[] = []): Character {
  const own = createCharacter(host).events.find((e) => e.id === id)
  const face = own ? rollFace(own.trigger)! : 3
  const engrave: ForgeStep[] = own ? [] : [{ op: 'engrave', face, skill: ENGRAVABLE_SKILLS.find((e) => e.id === id)! }]
  return createCharacter(host).withForge([...before, ...engrave, ...Array.from({ length: rank }, (): ForgeStep => ({ op: 'sharpen', face }))])
}

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
    // Les mécaniques que les dés de départ ne portent plus d'office depuis les Maîtrises (le Soliste, la Riposte, la Foudre,
    // Pourfendre, l'Esquive améliorée) : gravées sur le 3 de leur ancien porteur
    for (const [host, id] of [['fanchon', 'soloist'], ['aldric', 'riposte'], ['thaldrin', 'thunderbolt'], ['gorak', 'cleave'], ['elaria', 'evasion']])
      for (const b of CHARACTER_IDS)
        for (let k = 0; k < (id === 'riposte' ? 24 : 4); k++) {
          const c = withSkill(host, id, 0)
          audit(simulateCombat(k % 2 ? [c, createCharacter(b)] : [createCharacter(b), c], { seed: 7000 + n++ }))
        }
    const report = [...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)
    expect(report).toEqual([])
    // L'audit a bien rencontré chaque mécanique que le roster peut produire. Pile + Vol de vie n'arrive pas
    // (Naraxes n'a pas de Vol de vie) : combat.test.ts le prouve par des combats construits. L'esquive imposée ne laisse
    // plus aucune charge (Esquive améliorée non cumulable, 0.117.1). Plus de purge de ses propres malus dans le roster
    // depuis la 0.113.0 (la Purification ne vise plus que l'adversaire ; l'Aura d'immunité est hors kit)
    for (const k of ['jet remplacé', 'jet greffé', 'compétence greffée', 'compétence qui modifie son coup', 'coup de base', 'coup de base multiplié', 'duo : la rafale suit l’action du Duo', 'cause : jet greffé', 'esquive imposée', 'esquive imposée, plus aucune charge', 'bouclier', 'critique assuré', 'réaction thorns', 'réaction lifesteal', 'furie', 'tick frostAura', 'aura glaciale', 'dé imposé', 'estompe', 'repli de purge', 'pile qui touche', 'pièce lancée aussitôt', 'furie instantanée', 'coup brut de 1 à 3', 'statut de forme', 'coups multiples', 'brûlure à une valeur', 'réaction bleed', 'saignement', 'reliques portées', 'relique de caractéristique', 'bonus de relique', 'relique de tour', 'relique de seuil', 'relique de seuil unique', 'relique de coup', 'cause : réaction au coup', 'cause : coup de rafale', 'cause : pièce', 'cause : décompte après son effet', 'vol de vie', 'riposte', 'jauges', 'pile : riposte', 'pile : jauges', 'plaie ouverte pendant le coup, qui attend le suivant', 'réaction d’un statut déjà là au début du coup', 'purge face à un mécanisme', 'coup brut avec relique de face', "dégâts de l'instant", 'dégâts temporaires', 'charges tirées du coup', 'relâche en part', 'compétence épuisée'])
      expect(seen[k] ?? 0, k).toBeGreaterThan(0)
    // 0.110.0 : la Furie part juste après le jet qui la pose (RESOLUTION § 2)
    expect(seen['furie juste après son jet'] ?? 0).toBeGreaterThan(0)
    // L'aura de départ au rendez-vous (2026-10-27, C2) : posée d'office au début du 3e tour, contrôlée à chaque combat
    expect(seen["aura de départ posée d'office"] ?? 0).toBeGreaterThan(0)
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
    for (const k of ['relique de caractéristique', 'relique de coup', 'relique de tour', 'bouclier', 'PV de récompense']) expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})

describe('audit de résolution : le plafond d’esquive (troisième retour du 2026-10-27, C5)', () => {
  it('aucune anomalie quand le Pas de côté, gravé, copié et aiguisé, porterait l’esquive au-delà de 75 % ; le plafond est vu', () => {
    const { audit, problems, seen } = createAudit()
    const step = ENGRAVABLE_SKILLS.find((e) => e.id === 'sidestep')!
    const elaria = createCharacter('elaria').withForge([
      { op: 'engrave', face: 3, skill: step },
      { op: 'copy', face: 3, to: 4 },
      { op: 'sharpen', face: 3 },
    ])
    let n = 0
    for (const b of CHARACTER_IDS)
      for (let k = 0; k < 4; k++) audit(simulateCombat(k % 2 ? [elaria, createCharacter(b)] : [createCharacter(b), elaria], { seed: 13000 + n++ }))
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    expect(seen['esquive au plafond'] ?? 0).toBeGreaterThan(0)
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

describe('audit de résolution : un combat qui change dans les fenêtres d’un coup, de proche en proche', () => {
  it('une Sentence qui achève l’adversaire dans la fenêtre du soin (celui d’un Vol de vie au coup compris) la ferme : l’Encens, les Épines, l’Écu cabossé qui n’ont pas eu leur tour ne sont pas des anomalies', () => {
    const { audit, problems } = createAudit()
    const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
    const ysolde = createCharacter('ysolde')
      .withForge([
        { op: 'engrave', face: 3, skill: skill('sentence') },
        { op: 'engrave', face: 4, skill: skill('life-steal') },
      ])
      .withRelics([getRelic('abbey-incense')])
    let finishing = 0
    let midStrike = 0
    for (let seed = 0; seed < 300; seed++)
      for (const b of CHARACTER_IDS) {
        const r = simulateCombat([ysolde, createCharacter(b).withRelics([getRelic('dented-shield')])], { seed: 16000 + seed })
        audit(r)
        const last = r.beats.at(-1)!
        if (last.type !== 'statusReaction' || last.status !== 'sentence' || last.trigger !== 'healed') continue
        finishing++
        const heal = last.cause !== undefined ? r.beats[last.cause] : undefined
        if (heal?.type === 'statusReaction' && heal.status === 'lifesteal') midStrike++
      }
    expect(finishing).toBeGreaterThan(0)
    expect(midStrike).toBeGreaterThan(0)
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
  })

  it('une purge de seuil entre le coup et sa fenêtre (la Larme de givre) éteint la Brûlure avant l’Embrasement : rien ne manque', () => {
    const { audit, problems } = createAudit()
    const conflagration = ENGRAVABLE_SKILLS.find((e) => e.id === 'conflagration')!
    const thaldrin = createCharacter('thaldrin').withForge([{ op: 'engrave', face: 3, skill: conflagration }]).withRelics([getRelic('split-knucklebone')])
    let purged = 0
    for (let seed = 0; seed < 300; seed++)
      for (const b of CHARACTER_IDS) {
        const r = simulateCombat([thaldrin, createCharacter(b).withRelics([getRelic('frost-tear')])], { seed: 17000 + seed })
        audit(r)
        // La Larme partie dans les fenêtres d'un coup de Thaldrin qui touche, sur un adversaire qui brûlait
        for (const tear of r.beats)
          if (tear.type === 'relic' && tear.relic === 'frost-tear' && tear.cause !== undefined) {
            let k: number | undefined = tear.cause
            while (k !== undefined && r.beats[k].type !== 'attack') k = r.beats[k].cause
            const hit = k !== undefined ? r.beats[k] : undefined
            if (hit?.type === 'attack' && hit.attack.attacker === 0 && hit.state.statuses[1].some((s) => s.id === 'burn')) purged++
          }
      }
    expect(purged).toBeGreaterThan(0)
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
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
          for (const b of CHARACTER_IDS)
            for (let k = 0; k < 3; k++) audit(simulateCombat([withSkill(host, id, rank, before).withRelics(relics.map(getRelic)), createCharacter(b)], { seed: 15000 + n++ }))
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
        for (const paired of [false, true])
          for (const b of CHARACTER_IDS)
            for (let k = 0; k < 3; k++) audit(simulateCombat([(paired ? withSkill(host, partner, 0) : createCharacter(host)).withRelics([getRelic(id)]), createCharacter(b)], { seed: 15000 + n++ }))
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    for (const k of ['embrasement', 'pièce pipée', 'rempart hérissé', 'vindicte', 'relique : shieldBroken', 'relique : reflected', 'relique : heads', 'bonus de relique à conditions'])
      expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})

describe('audit de résolution : revue des auras et des compétences (docs/REVUE_COMPETENCES.md)', () => {
  it('aucune anomalie pour le Bouclier de foi, la Plaie ouverte, le Pas de côté et les compétences retouchées, gravés chez leurs porteurs, aux rangs I et II', () => {
    const { audit, problems, seen } = createAudit()
    // Chaque nouvelle aura chez son porteur et chez qui la nourrit le mieux : les soins (Ysolde ; Ervald au Vol de vie), les
    // critiques (Ervald, Elaria), l'esquive (Fanchon, Naraxes) ; puis les retouches qui changent une règle : la Virulence
    // sans condition, le Rempart qui redonne de l'armure (Brokk, à la Peau de pierre), la Fausse note sur deux coups
    const hosts: Record<string, readonly [string, ForgeStep[]][]> = {
      'faith-shield': [['ysolde', []], ['ervald', []]],
      'open-wound': [['ervald', []], ['elaria', []]],
      sidestep: [['fanchon', []], ['naraxes', []]],
      virulence: [['ervald', []], ['naraxes', []]],
      'bristling-rampart': [['brokk', []]],
      'false-note': [['fanchon', []]],
      sentence: [['ysolde', []]],
    }
    let n = 0
    for (const [id, list] of Object.entries(hosts))
      for (const [host, before] of list)
        for (const rank of [0, 1]) {
          for (const b of CHARACTER_IDS)
            for (let k = 0; k < 3; k++) audit(simulateCombat([withSkill(host, id, rank, before), createCharacter(b)], { seed: 18000 + n++ }))
        }
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    for (const k of ['bouclier de foi', 'plaie ouverte', 'rempart hérissé', 'sentence', 'fausse note aiguisée', 'charges tirées d’un statut']) expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})

describe('audit de résolution : phase 8, lot 3, les fils minces', () => {
  it('aucune anomalie pour la Feinte, la Sève noire, la Dette de sang, Attiser, le Ciel d’orage, l’Ivresse du sang et le Coup de massue, gravés chez leurs porteurs, aux rangs I et II', () => {
    const { audit, problems, seen } = createAudit()
    // Chaque compétence chez ses porteurs, et chez qui produit sa ressource : l'esquive (Naraxes, Fanchon, Elaria), les soins
    // (Ervald ; Aldric au Vol de vie gravé sur le 4), les renvois (Aldric ; Brokk à la Riposte sur le 4), la Brûlure
    // (Thaldrin ; Ervald aux Feux follets sur le 4), les critiques (Gorak, Elaria, Ervald)
    const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
    const hosts: Record<string, readonly [string, ForgeStep[]][]> = {
      feint: [['naraxes', []], ['fanchon', []], ['elaria', []]],
      'black-sap': [['ervald', []], ['aldric', [{ op: 'engrave', face: 4, skill: skill('life-steal') }]]],
      'blood-debt': [['aldric', []], ['brokk', [{ op: 'engrave', face: 4, skill: skill('riposte') }]]],
      stoke: [['thaldrin', []], ['ervald', [{ op: 'engrave', face: 4, skill: skill('firefly') }]]],
      'storm-sky': [['thaldrin', []], ['ervald', []]],
      'blood-frenzy': [['gorak', []], ['elaria', []], ['ervald', []]],
      'stunning-blow': [['morgrut', []], ['ysolde', []], ['thaldrin', []]],
    }
    let n = 0
    for (const [id, list] of Object.entries(hosts))
      for (const [host, before] of list)
        for (const rank of [0, 1]) {
          for (const b of CHARACTER_IDS)
            for (let k = 0; k < 3; k++) audit(simulateCombat([withSkill(host, id, rank, before), createCharacter(b)], { seed: 19000 + n++ }))
        }
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    for (const k of ['feinte', 'sève noire', 'dette de sang', 'statut qui repart', 'ciel d’orage', 'ivresse du sang', 'action perdue : stunned', 'furie : charge réactive reportée'])
      expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})

describe('audit de résolution : phase 8, lot 3, les malus de famille', () => {
  it('aucune anomalie pour Brise-garde, Malchance, Éclair aveuglant, Hémorragie et Confiscation, gravés chez leurs porteurs, aux rangs I et II', () => {
    const { audit, problems, seen } = createAudit()
    // Chaque malus chez son hôte et chez un autre porteur possible ; Brise-garde aussi contre de l'armure
    // temporaire (Brokk et sa Peau de pierre, adversaire du roster), Confiscation contre des bonus (Ervald, Elaria, Brokk)
    const hosts: Record<string, readonly string[]> = {
      'guard-break': ['morgrut', 'brokk'],
      jinx: ['naraxes', 'fanchon'],
      blinding: ['thaldrin', 'ysolde'],
      hemorrhage: ['gorak', 'aldric'],
      'seal-theft': ['aldric', 'ysolde'],
    }
    let n = 0
    for (const [id, list] of Object.entries(hosts))
      for (const host of list)
        for (const rank of [0, 1]) {
          for (const b of CHARACTER_IDS)
            for (let k = 0; k < 3; k++) audit(simulateCombat([withSkill(host, id, rank), createCharacter(b)], { seed: 20000 + n++ }))
        }
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    for (const k of ['garde brisée', 'garde brisée : armure brisée', 'malchance', 'aveuglé', 'hémorragie', 'sceau de vol'])
      expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})

describe('audit de résolution : les reliques de source (2026-10-25)', () => {
  it('aucune anomalie pour le Dard, le Briquet et le Brassard chez tout le roster, seuls puis avec les reliques qu’ils ouvrent', () => {
    const { audit, problems, seen } = createAudit()
    const opened: Record<string, string> = { 'wasp-sting': 'venom-vial', 'tinder-box': 'forge-bellows', 'spiked-bracer': 'talion-gauntlet' }
    let n = 0
    for (const [source, consumer] of Object.entries(opened))
      for (const relics of [[source], [source, consumer]])
        for (const a of CHARACTER_IDS)
          for (const b of CHARACTER_IDS) audit(simulateCombat([createCharacter(a).withRelics(relics.map(getRelic)), createCharacter(b)], { seed: 16000 + n++ }))
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    for (const k of ['relique : affliction à l’adversaire', 'relique de coup', 'relique de tour', 'relique : reflected', 'bonus de relique à conditions'])
      expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})

describe('audit de résolution : retour du 2026-10-27 (pièces de la Fortune, sursis, initiative, chance de pile)', () => {
  it('aucune anomalie pour les pièces gravées (rangs I et II, avec la Pièce trouée et la Pièce lestée), la Médaille de sursis et le Cor d’avant-garde', () => {
    const { audit, problems, seen } = createAudit()
    let n = 0
    for (const id of ['lucky-coin', 'cursed-coin'])
      for (const host of ['naraxes', 'fanchon', 'gorak'])
        for (const rank of [0, 1]) {
          const steps: ForgeStep[] = [{ op: 'engrave', face: 3, skill: ENGRAVABLE_SKILLS.find((e) => e.id === id)! }, ...(rank ? [{ op: 'sharpen' as const, face: 3 }] : [])]
          for (const b of CHARACTER_IDS)
            for (let k = 0; k < 2; k++)
              audit(simulateCombat([createCharacter(host).withForge(steps).withRelics(['holed-coin', 'weighted-coin'].map(getRelic)), createCharacter(b)], { seed: 27000 + n++ }))
        }
    for (const relics of [['reprieve-medal'], ['vanguard-horn']])
      for (const a of CHARACTER_IDS)
        for (const b of CHARACTER_IDS) {
          audit(simulateCombat([createCharacter(a).withRelics(relics.map(getRelic)), createCharacter(b)], { seed: 27000 + n++ }))
          audit(simulateCombat([createCharacter(b), createCharacter(a).withRelics(relics.map(getRelic))], { seed: 27000 + n++ }))
        }
    // Les deux camps portent le Cor : le jet revient
    for (const a of CHARACTER_IDS) audit(simulateCombat([createCharacter(a).withRelics([getRelic('vanguard-horn')]), createCharacter('gorak').withRelics([getRelic('vanguard-horn')])], { seed: 27000 + n++ }))
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    for (const k of ['pièce d’effet sur pile', 'pièce d’effet sur face', 'relique : heads', 'sursis', 'initiative prise', 'initiative disputée'])
      expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})

describe('audit de résolution : retour du 2026-10-27, règles du moteur (critique assuré à une charge, Riposte esquivée, Clous contre l’armure)', () => {
  it('aucune anomalie quand le Critique assuré sert ou se perd sur une esquive, quand la Riposte manque une esquive assurée, et pour les Clous contre l’armure', () => {
    const { audit, problems, seen } = createAudit()
    const skill = (id: string) => ENGRAVABLE_SKILLS.find((e) => e.id === id)!
    let n = 0
    // Œil de faucon aiguisé (son intensité) et Rancune : des critiques qui attendent leur frappe ; Esquive améliorée contre
    // la Riposte d'Aldric
    const elaria = [withSkill('elaria', 'evasion', 0), withSkill('elaria', 'evasion', 1), withSkill('elaria', 'hawk-eye', 1)]
    const grudge = createCharacter('morgrut').withForge([{ op: 'engrave', face: 3, skill: skill('grudge') }])
    // La Riposte d'Aldric a quitté son dé (Maîtrises) : gravée sur son 3
    const foe = (b: string) => (b === 'aldric' ? withSkill('aldric', 'riposte', 0) : createCharacter(b))
    for (const a of [...elaria, grudge])
      for (const b of CHARACTER_IDS)
        for (let k = 0; k < 6; k++) {
          audit(simulateCombat([a, foe(b)], { seed: 28000 + n++ }))
          audit(simulateCombat([foe(b), a], { seed: 28000 + n++ }))
        }
    // Clous de pavois chez Brokk (Peau de pierre), contre un attaquant armé (Aura d'immunité gravée : +1 armure)
    const nails = createCharacter('brokk').withRelics([getRelic('pavise-nails')])
    const armored = createCharacter('aldric').withForge([{ op: 'engrave', face: 3, skill: skill('immunity-aura') }])
    for (const b of [...CHARACTER_IDS.map((id) => createCharacter(id)), armored])
      for (let k = 0; k < 8; k++) audit(simulateCombat([nails, b], { seed: 28000 + n++ }))
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    for (const k of ['riposte esquivée', 'riposte', 'dégâts renvoyés contre l’armure', 'dégâts contre l’armure, sans armure']) expect(seen[k] ?? 0, k).toBeGreaterThan(0)
    for (const k of ['critique assuré', 'critique assuré perdu sur une esquive']) expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})

describe('audit de résolution : retour du 2026-10-27 (C1), la Riposte et la Rétribution sont des coups', () => {
  it('aucune anomalie pour les renvois : esquivés, critiques, contre l’armure, la Rétribution coup par coup, aucun renvoi de renvoi', () => {
    const { audit, problems, seen } = createAudit()
    // Aldric (Rétribution sur son dé) avec la Riposte gravée, aux rangs I et II, contre tout le roster et contre lui-même ;
    // des reliques de coup (la Fiole de venin, le Croc de boucher), de moment (Écu cabossé, Conque des vents) et d'armure
    // (la Cotte de mercenaire)
    const aldric = [withSkill('aldric', 'riposte', 0), withSkill('aldric', 'riposte', 1)]
    const kits = [[], ['venom-vial', 'butcher-hook'], ['dented-shield', 'wind-conch', 'mercenary-mail']].map((ids) => ids.map(getRelic))
    let n = 0
    for (const a of aldric)
      for (const b of [...CHARACTER_IDS.map((id) => createCharacter(id)), ...aldric])
        for (let k = 0; k < 12; k++) {
          const kit = kits[k % kits.length]
          audit(simulateCombat([a.withRelics(kit), b.withRelics(kits[(k + 1) % kits.length])], { seed: 31000 + n++ }))
          audit(simulateCombat([b, a.withRelics(kit)], { seed: 31000 + n++ }))
        }
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    for (const k of ['riposte', 'riposte esquivée', 'renvoi critique', 'renvoi esquivé', 'renvoi contre l’armure', 'jauges relâchées : coups à part', 'riposte muette sur un renvoi', 'relâche en part'])
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
    for (const k of ['dé forgé', 'face dorée', 'compétence gravée au-delà du 3', 'duo : la rafale suit l’action du Duo', 'attaque trempée', 'coup qui monte', 'furie juste après son jet', 'furie aiguisée']) expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})

describe('audit de résolution : les Maîtrises, vague 2 (2026-10-27)', () => {
  it('aucune anomalie pour chaque aura de départ de chaque personnage, ni pour les briques nouvelles gravées chez leurs porteurs, aux rangs I et II', () => {
    const { audit, problems, seen } = createAudit()
    let n = 0
    // Chaque dé de départ (l'aura choisie sur le 1), contre tout le roster, de chaque côté
    for (const a of CHARACTER_IDS)
      for (const aura of createCharacter(a).definition.startAuras ?? [])
        for (const b of CHARACTER_IDS) {
          audit(simulateCombat([createCharacter(a, { aura }), createCharacter(b)], { seed: 29000 + n++ }))
          audit(simulateCombat([createCharacter(b), createCharacter(a, { aura })], { seed: 29000 + n++ }))
        }
    // Les briques nouvelles chez les porteurs de leur maîtrise (docs/MAITRISES.md § 4)
    const hosts: Record<string, readonly string[]> = {
      'lucky-streak': ['naraxes', 'fanchon'],
      dread: ['ervald', 'aldric'],
      'rot-aura': ['ervald', 'aldric'],
      rancor: ['aldric'],
      'storm-field': ['ysolde', 'thaldrin'],
      ballad: ['fanchon'],
      prayer: ['ysolde'],
      wither: ['ervald', 'aldric'],
      assault: ['gorak', 'morgrut'],
      'loaded-die': ['naraxes', 'fanchon'],
      'open-wound': ['gorak', 'brokk'],
    }
    for (const [id, list] of Object.entries(hosts))
      for (const host of list)
        for (const rank of [0, 1])
          for (const b of CHARACTER_IDS) audit(simulateCombat([withSkill(host, id, rank), createCharacter(b)], { seed: 29000 + n++ }))
    expect([...problems].map(([kind, p]) => `${kind} ×${p.n} — ex. ${p.example}`)).toEqual([])
    for (const k of ['luckyStreak', 'dread', 'rotAura', 'rancor', 'stormField', 'ballad', 'stoneFist'].map((s) => `maîtrises : ${s}`).concat(['poing de pierre', 'pièce pipée', 'plaie ouverte']))
      expect(seen[k] ?? 0, k).toBeGreaterThan(0)
  })
})
