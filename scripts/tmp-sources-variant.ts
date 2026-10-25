// Jetable (agent SourcesStudy) : les variantes de l'étude des sources, appliquées en mémoire avant une mesure
// (SOURCES_VARIANT=base|A|B|C1|C2|C3). Rien du jeu n'est modifié sur disque. Supprimé après l'étude.
import type { CharacterEvent } from '../src/game/events'
import { eventHooks, skillNeeds, STATUS_HOOKS, type Hook } from '../src/game/hooks'
import { REPERTOIRES } from '../src/game/offers'
import { RELIC_IDS, RELICS, type Relic } from '../src/game/relics'
import { ALL_SKILLS, CHARACTER_IDS, createCharacter } from '../src/game/roster'
import { charges, STATUSES, type StatusId } from '../src/game/statuses'

const skill = (id: string) => ALL_SKILLS.find((e) => e.id === id)!
const BARBED = 'labBarbed' as StatusId
const BARBED_BLEED = Number(process.env.SOURCES_BARBED ?? 2)
const FIRE_BURN = Number(process.env.SOURCES_FIRE ?? 2)

/** Les statuts d'essai (registre et accroches), ajoutés le temps de la mesure */
Object.assign(STATUSES, {
  [BARBED]: {
    ...STATUSES.sentence,
    name: 'Flèche barbelée',
    summary: `Chacun de ses critiques fait saigner : +${BARBED_BLEED} Saignement par charge.`,
    describe: (s: { stacks: number; power?: number }) => `+${BARBED_BLEED * (s.stacks + (s.power ?? 0))} Saignement à chaque critique`,
    badge: (s: { stacks: number; power?: number }) => `+${BARBED_BLEED * (s.stacks + (s.power ?? 0))}`,
    maxStacks: 3,
    reactions: { crit: (s: Parameters<typeof charges>[0]) => [{ type: 'applyStatus', status: 'bleed', stacks: BARBED_BLEED * charges(s), target: 'opponent' }] },
    power: undefined,
  },
})
Object.assign(STATUS_HOOKS, { [BARBED]: { side: 'self', consumes: ['moment:crit'], produces: ['status:bleed', 'damage:temporal'] } })

/** B : deux producteurs nouveaux, dans la logique de famille de leur porteur */
export const BARBED_ARROW: CharacterEvent = {
  id: 'barbed-arrow',
  name: 'Flèche barbelée',
  nature: 'finesse',
  trigger: 'naturalThree',
  effects: [{ type: 'applyStatus', status: BARBED, stacks: 1 }],
  rankAxis: { kind: 'stacks', per: 1 },
}
export const FIRE_BREATH: CharacterEvent = {
  id: 'fire-breath',
  name: 'Cracheuse de feu',
  nature: 'arcane',
  trigger: 'naturalThree',
  effects: [{ type: 'applyStatus', status: 'burn', stacks: FIRE_BURN, target: 'opponent' }],
  rankAxis: { kind: 'stacks', per: 1 },
}

/** C1 : une relique productrice par ressource sans producteur parmi les reliques (Poison, Brûlure, pièce, renvoi) */
export const SOURCE_RELICS: Relic[] = [
  { id: 'wasp-sting', name: 'Dard de guêpe', flavor: '', trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'poison', stacks: 2, target: 'opponent' }] },
  { id: 'tinder-box', name: 'Briquet d’amadou', flavor: '', trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'burn', stacks: 2, target: 'opponent' }] },
  { id: 'fair-coin', name: 'Pièce de foire', flavor: '', trigger: { type: 'strike', on: 'naturalMax' }, effects: [{ type: 'applyStatus', status: 'coinFlip', stacks: 1 }] },
  { id: 'spiked-bracer', name: 'Brassard à pointes', flavor: '', trigger: { type: 'turn', turn: 1 }, charges: 1, effects: [{ type: 'applyStatus', status: 'riposte', stacks: 1 }] },
]

/** C2 : le fonds commun, un producteur existant par ressource, gravable par tous */
const COMMON_POOL = ['cleave', 'grave-breath', 'firefly', 'coin-flip', 'stoneskin', 'riposte', 'life-steal']

/** Les ressources des briques des lots (besoins des consommatrices) */
const LOT_NEEDS: readonly Hook[] = ['status:bleed', 'status:poison', 'status:burn', 'moment:heal', 'status:coinFlip', 'moment:heads', 'moment:shieldBreak', 'moment:reflect']

const extend = (id: string, extra: readonly CharacterEvent[]) => {
  const own = new Set([...createCharacter(id).events, ...REPERTOIRES[id]].map((e) => e.id))
  REPERTOIRES[id] = [...REPERTOIRES[id], ...extra.filter((e) => !own.has(e.id))]
}

export const VARIANT = process.env.SOURCES_VARIANT ?? 'base'
switch (VARIANT) {
  case 'base':
    break
  case 'A':
    // Le contenu existant : Elaria, la Rancune (Précision) et la Vindicte (ouverte par sa Riposte) ; Fanchon, la Sentence
    // (ouverte par Siffloter ou une relique de soin)
    extend('elaria', [skill('grudge'), skill('vendetta')])
    extend('fanchon', [skill('sentence')])
    break
  case 'A2':
    // La Rancune seule (aucun besoin : ouverte dès le départ) chez les deux
    extend('elaria', [skill('grudge')])
    extend('fanchon', [skill('grudge')])
    break
  case 'AC1':
    extend('elaria', [skill('grudge'), skill('vendetta')])
    extend('fanchon', [skill('sentence')])
    ;(RELICS as Relic[]).push(...SOURCE_RELICS)
    ;(RELIC_IDS as string[]).push(...SOURCE_RELICS.map((r) => r.id))
    break
  case 'B':
    extend('elaria', [BARBED_ARROW])
    extend('fanchon', [FIRE_BREATH, skill('conflagration')])
    break
  case 'C1':
    ;(RELICS as Relic[]).push(...SOURCE_RELICS)
    ;(RELIC_IDS as string[]).push(...SOURCE_RELICS.map((r) => r.id))
    break
  case 'C2':
    for (const id of CHARACTER_IDS) extend(id, COMMON_POOL.map(skill))
    break
  case 'C3':
    // Le producteur appelé (règle d'offre) : un producteur du répertoire pèse 2 de plus par consommatrice du répertoire
    // qu'il ouvrirait (émulé par des doublons dans le tirage pondéré de Graver)
    for (const id of CHARACTER_IDS) {
      const rep = REPERTOIRES[id]
      const start = new Set(createCharacter(id).events.flatMap((e) => eventHooks(e).produces))
      const extra = rep.flatMap((p) => {
        const opens = rep.filter((c) => c !== p && skillNeeds(c).some((h) => LOT_NEEDS.includes(h) && !start.has(h) && eventHooks(p).produces.includes(h))).length
        return Array.from({ length: 2 * opens }, () => p)
      })
      REPERTOIRES[id] = [...rep, ...extra]
    }
    break
  default:
    throw new Error(`variante inconnue : ${VARIANT}`)
}
