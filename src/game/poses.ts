import type { CharacterLook } from './character'
import type { AppliedEffect } from './combat'
import { DAMAGE_SOURCES } from './damage'
import { isSpell, type CharacterEvent, type Effect } from './events'
import { STATUSES } from './statuses'

/*
 * Postures d'un combattant (docs/POSTURES.md) : une image par moment du combat, pour l'immersion.
 * Pure présentation : le moteur (combat.ts) ne les connaît pas, l'écran choisit la posture d'après
 * ce qu'il rejoue déjà (élan, esquive, coup encaissé, K.O., victoire).
 * Une posture absente retombe sur l'image de garde (`look.image`) : un personnage sans postures
 * s'affiche exactement comme avant.
 */

/**
 * Peu de postures, et seulement des postures communes à tous les personnages (décisions de l'utilisateur,
 * 2026-10-19) : les moments que tout combattant vit. Jamais une posture propre à une capacité : la
 * compétence garde son animation (nom de la compétence) sur l'image de garde.
 */
export type PoseId = 'idle' | 'attack' | 'dodge' | 'hurt' | 'ko' | 'victory' | 'dazed' | 'cast'

export const POSES: Record<PoseId, { name: string; when: string; prompt: string }> = {
  idle: {
    name: 'Garde',
    when: 'au repos, entre deux actions (image de base, `look.image`)',
    prompt: 'combat-ready guard stance, weight balanced, both feet planted, weapon held ready',
  },
  attack: {
    name: 'Attaque',
    when: "pendant l'élan d'une attaque",
    prompt: 'mid-attack, lunging forward toward the right, weapon swinging at full extension, front foot planted',
  },
  dodge: {
    name: 'Esquive',
    when: "quand il esquive (synchronisée avec l'élan adverse)",
    prompt: 'evading sideways, body twisting and leaning away to the left, light on the feet',
  },
  hurt: {
    name: 'Coup encaissé',
    when: 'quand un coup le touche ; un critique le fait en plus reculer',
    prompt: 'recoiling from a heavy blow, torso twisted back, one arm raised to shield the face, grimacing, both feet still on the ground',
  },
  ko: {
    name: 'K.O.',
    when: 'quand il est mis hors de combat',
    prompt: 'defeated, collapsed on one knee or lying on the ground, weapon dropped beside',
  },
  victory: {
    name: 'Victoire',
    when: "quand il gagne le combat (et sur l'écran du champion)",
    prompt: 'triumphant victory pose, weapon raised high, chest out, both feet planted',
  },
  // 0.120.0 (demande de l'utilisateur) : deux images qui alternent vite, le corps penché en avant puis en arrière,
  // les pieds plantés ; chaque personnage vacille à sa façon (docs/POSTURES.md § 6)
  dazed: {
    name: 'Perte de contrôle',
    when: "tant qu'il porte un statut qui lui fait perdre son action (Peur, Étourdi), jusqu'à la fin du tour perdu",
    prompt: 'dazed and wobbling, two frames leaning far forward then far backward, feet planted, head lolling, weapon hanging loose',
  },
  // 2026-10-27 (demande de l'utilisateur) : un sort offensif, lancé par le personnage (docs/POSTURES.md § 7)
  cast: {
    name: 'Incantation',
    when: "quand il lance un sort offensif (`castsSpell`) : de son départ à la fin de sa lecture, et pendant l'élan de ses coups",
    prompt: 'casting an offensive spell: one arm raised to the sky to call a higher power, the other reaching toward the enemy, a small glow on the hand or weapon that channels it',
  },
}

export const POSE_IDS = Object.keys(POSES) as PoseId[]

/** Ce que l'écran sait du moment : de quoi choisir la posture. */
export interface PoseMoment {
  state?: 'idle' | 'ko' | 'victory'
  lunging?: boolean
  /** Coup en cours contre ce combattant : arrivé (`landed`, faux pendant l'élan adverse) et esquivé ou non */
  received?: { landed: boolean; dodged: boolean }
  /** Il a perdu le contrôle (cue `daze` de la mise en scène) */
  dazed?: boolean
  /** Il lance un sort offensif (cue `cast` de la mise en scène) : ses coups partent aussi en incantation */
  casting?: boolean
}

/**
 * La posture du moment, par ordre de priorité : fin du combat, élan (en incantation s'il lance un sort), esquive, coup
 * encaissé, incantation, perte de contrôle, garde.
 */
export function poseOf(m: PoseMoment): PoseId {
  if (m.state === 'ko') return 'ko'
  if (m.state === 'victory') return 'victory'
  if (m.lunging) return m.casting ? 'cast' : 'attack'
  if (m.received?.dodged) return 'dodge'
  if (m.received?.landed) return 'hurt'
  if (m.casting) return 'cast'
  if (m.dazed) return 'dazed'
  return 'idle'
}

/**
 * Le mal qu'un effet fait à l'adversaire du lanceur : aucun, des dégâts magiques ou physiques (selon leur source), ou une
 * entrave sans dégâts (un malus, une purge de ses bonus).
 */
function harmOf(e: Effect): 'none' | 'magical' | 'physical' | 'hex' {
  if (e.target !== 'opponent') return 'none'
  switch (e.type) {
    case 'damage':
    case 'release':
      return DAMAGE_SOURCES[e.source].magical ? 'magical' : 'physical'
    case 'applyStatus':
      return STATUSES[e.status].polarity === 'negative' ? 'hex' : 'none'
    case 'cleanse': {
      // La Purification : elle retire son bonus, puis sa lumière blesse (`andThen`, `orElse`)
      const after = [e.andThen, e.orElse].flatMap((x) => (x ? [harmOf({ ...x, target: x.target ?? 'opponent' })] : []))
      return after.find((h) => h === 'magical' || h === 'physical') ?? (e.polarity === 'positive' ? 'hex' : 'none')
    }
    case 'heal':
      return 'none'
  }
}

/**
 * Un sort offensif (2026-10-27, docs/POSTURES.md § 7) : une compétence qui blesse l'adversaire par la magie (une source
 * magique : Lumière, Foudre, Feu, Brûlure…, `DAMAGE_SOURCES.magical`), ou, sans dégâts physiques, un sort (`isSpell` :
 * une compétence arcane) qui l'entrave (un malus, une purge de ses bonus : la Peur, le Souffle de la tombe). Son lanceur
 * prend sa posture d'incantation. Des dégâts physiques restent des coups ; une compétence martiale ou d'adresse qui
 * entrave reste un coup (le Coup de massue) ; un sort qui ne vise que soi (une aura, un soin) n'est pas offensif.
 * Présentation seule : aucune règle ne le lit.
 */
export function castsSpell(event: Pick<CharacterEvent, 'nature' | 'effects'>): boolean {
  const harms = event.effects.map(harmOf)
  if (harms.includes('magical')) return true
  return !harms.includes('physical') && isSpell(event) && harms.includes('hex')
}

/**
 * Ce que le statut d'un combattant fait de lui-même (une aura qui agit au début de son tour, qui réagit) : des dégâts
 * magiques sur son adversaire (le Ciel d'orage, la Sentence). Il incante alors, comme pour un sort qu'il lance.
 */
export const castsMagicAt = (side: number, effects: readonly AppliedEffect[]) =>
  effects.some((e) => e.type === 'damage' && e.target !== side && e.amount > 0 && DAMAGE_SOURCES[e.source].magical)

/** Les postures à une image (la perte de contrôle en a deux, qui alternent : `poses.dazed`). */
export type SinglePoseId = Exclude<PoseId, 'idle' | 'dazed'>

/**
 * L'image d'une posture, ou l'image de garde si le personnage n'a pas cette posture. Pour la perte de contrôle, sa
 * première image (la seconde passe par-dessus en alternance, `Fighter`).
 */
export const poseImage = (look: Pick<CharacterLook, 'image' | 'poses'>, pose: PoseId) =>
  (pose === 'dazed' ? look.poses?.dazed?.[0] : pose !== 'idle' && look.poses?.[pose]) || look.image

/** Toutes les images d'une apparence (garde et postures), pour les précharger. */
export const poseImages = (look: Pick<CharacterLook, 'image' | 'poses'>) => [look.image, ...Object.values(look.poses ?? {}).flat()]
