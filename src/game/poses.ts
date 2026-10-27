import type { CharacterLook } from './character'

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
export type PoseId = 'idle' | 'attack' | 'dodge' | 'hurt' | 'ko' | 'victory' | 'dazed'

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
}

/** La posture du moment, par ordre de priorité : fin du combat, élan, esquive, coup encaissé, perte de contrôle, garde. */
export function poseOf(m: PoseMoment): PoseId {
  if (m.state === 'ko') return 'ko'
  if (m.state === 'victory') return 'victory'
  if (m.lunging) return 'attack'
  if (m.received?.dodged) return 'dodge'
  if (m.received?.landed) return 'hurt'
  if (m.dazed) return 'dazed'
  return 'idle'
}

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
