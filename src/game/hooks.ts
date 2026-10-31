import type { Character, CharacterStats } from './character'
import { damageKind, type DamageKind } from './damage'
import { rollFace, type CharacterEvent, type Effect, type Target, type Trigger } from './events'
import type { Relic } from './relics'
import { STATUSES, type StatusId } from './statuses'

/*
 * Accroches (règles v2, phase 1, docs/PROGRESSION.md § 8 et P1) : ce que chaque brique PRODUIT et CONSOMME, dans un
 * vocabulaire fermé de choses concrètes du combat. Une synergie naît quand une brique produit ce qu'une autre consomme
 * (le Dé creux produit une esquive, la Conque des vents la consomme) ; un conflit, quand une brique GÊNE ce qu'une autre
 * consomme (la Cotte retire de l'esquive, la Conque en vit). Aucune règle de combat ne lit ces accroches : elles servent
 * à la validation (aucune brique isolée), au rapport des synergies, et plus tard à l'offre orientée.
 *
 * Point de vue : toujours celui de la brique qui pose ou porte l'effet. « moment:hit » produit, c'est « je touche plus
 * souvent » ; un statut posé sur l'adversaire (Saignement) s'écrit du point de vue de celui qui le pose (il saigne
 * quand JE touche : il consomme « moment:hit »). D'où une règle vérifiée par `validateHooks` : un statut est toujours
 * posé du même côté (sur soi, ou sur l'adversaire).
 *
 * Les compétences et les reliques ne déclarent rien : leurs accroches se déduisent de leurs données (déclencheur,
 * conditions, effets, stats). Seuls les statuts déclarent les leurs (`STATUS_HOOKS`), parce que leur comportement
 * est écrit en code (crochets du moteur). Les opérations de forge viendront avec la forge du d6 (phase 5).
 */

/**
 * Les moments d'un combat, du point de vue de la brique : il touche, il encaisse, il critique, il esquive, il est esquivé, il
 * se soigne ; depuis le second lot de la phase 8 : son armure temporaire est vidée, il renvoie des dégâts, sa pièce tombe
 * sur pile ; depuis le quatrième retour du 2026-10-27 : il porte un gros coup (un critique, ou un coup ×2 et plus).
 */
export type Moment = 'hit' | 'hurt' | 'crit' | 'heavy' | 'dodge' | 'missed' | 'heal' | 'shieldBreak' | 'reflect' | 'heads'

export type Hook =
  /** Un statut et ses charges (Poison sur l'adversaire, Esquive améliorée sur soi) */
  | `status:${StatusId}`
  | `moment:${Moment}`
  /** Des dégâts infligés de cette famille (de l'instant : coup, dégâts directs ; temporaires : DT) */
  | `damage:${DamageKind}`
  /** Des éclairs : des dégâts directs de foudre sur l'adversaire (Foudre, Ciel d'orage, Champ d'orage), ce que lit la Surtension */
  | 'damage:lightning'
  /** Un malus posé sur l'adversaire, quel qu'il soit : ce que lit l'Emprise (quatrième retour du 2026-10-27) */
  | 'malus'
  /** Une face du dé qui tombe (« face:4 »), la face maximale */
  | `face:${number}`
  | 'face:max'
  /** Une stat de base */
  | `stat:${keyof CharacterStats}`
  /**
   * La place unique d'un statut qui ne s'ajoute pas (revue des compétences, X2) : une Esquive améliorée au plus, une
   * Brûlure qui remplace l'ancienne, une pièce au plus. Chaque brique qui le pose la gêne (`hinders`) : deux producteurs
   * du même statut se gênent (`linkBetween`), la seconde pose ne fait rien ou écrase la première.
   */
  | `slot:${StatusId}`

export interface Hooks {
  produces: Hook[]
  consumes: Hook[]
  /** Ce qu'elle retire ou raréfie : une brique qui le consomme entre en conflit avec elle */
  hinders: Hook[]
}

type StatusHooks = { produces?: readonly Hook[]; consumes?: readonly Hook[]; hinders?: readonly Hook[]; side: Target }

/**
 * Ce que fait chaque statut, au-delà de lui-même (« status:X » est toujours produit par qui le pose), et de quel côté on
 * le pose. Un statut nouveau doit y être déclaré (le registre est complet : le typage le refuse sinon).
 */
export const STATUS_HOOKS: Record<StatusId, StatusHooks> = {
  guaranteedCrit: { side: 'self', produces: ['moment:crit'] },
  // Un bouclier qui s'use : un coup qui le vide ouvre le moment « armure vidée » (phase 8, second lot)
  bonusArmor: { side: 'self', produces: ['moment:shieldBreak'] },
  poison: { side: 'opponent', produces: ['damage:temporal'] },
  bleed: { side: 'opponent', consumes: ['moment:hit'], produces: ['damage:temporal'] },
  regeneration: { side: 'self', produces: ['moment:heal'] },
  weakened: { side: 'opponent' },
  exposed: { side: 'opponent' },
  // Une nouvelle Brûlure remplace l'ancienne : deux producteurs se gênent (X2 ; Briquet d'amadou × Feux follets −0,64)
  burn: { side: 'opponent', produces: ['damage:temporal'], hinders: ['slot:burn'] },
  vulnerable: { side: 'opponent', produces: ['damage:instant'] },
  stunned: { side: 'opponent' },
  // Les épines plantées (D13 du 2026-10-30) : les coups reçus les plantent, son coup qui touche les enfonce (le Saignement)
  thorns: { side: 'self', consumes: ['moment:hurt'], produces: ['status:thornSpike', 'status:bleed', 'damage:temporal'] },
  thornSpike: { side: 'self', consumes: ['moment:hit'], produces: ['status:bleed', 'damage:temporal'] },
  ward: { side: 'self' },
  lifesteal: { side: 'self', consumes: ['moment:hit'], produces: ['moment:heal'] },
  windFury: { side: 'self', produces: ['moment:hit', 'damage:instant'] },
  // Une charge au plus depuis la 0.117.1 : deux producteurs se gênent (X2 ; Dé creux × Esquive améliorée −0,61)
  evasion: { side: 'self', produces: ['moment:dodge'], hinders: ['slot:evasion'] },
  // Ferveur (Encens de l'abbaye) : le prochain coup qui touche fait plus
  momentum: { side: 'self', consumes: ['moment:hit'], produces: ['damage:instant'] },
  frostAura: { side: 'self', produces: ['status:poison', 'damage:temporal'] },
  // Une aura de coup (puissance, force de l'ours) vaut autant de fois qu'il y a de coups : elle consomme les coups de plus
  // (Furie, Coup de chance, Duo), revue des signatures du 2026-10-24
  powerAura: { side: 'self', consumes: ['moment:hit'], produces: ['damage:instant'] },
  fear: { side: 'opponent' },
  holyAura: { side: 'self', produces: ['moment:heal'] },
  decoctionAura: { side: 'self', consumes: ['moment:hit'], produces: ['status:poison', 'damage:temporal'] },
  // Une pièce au plus : deux producteurs se gênent (X2 ; mesuré avec la Pièce de foire, retirée le 2026-10-27, × Pile ou face −0,45)
  coinFlip: { side: 'self', produces: ['moment:hit', 'damage:instant', 'moment:heads'], hinders: ['slot:coinFlip'] },
  // Les pièces d'effet (retour du 2026-10-27, R2) : pile, un bonus au lanceur ou un malus à l'adversaire ; pas de coup
  luckyCoin: { side: 'self', produces: ['moment:heads', 'status:guaranteedCrit', 'moment:crit'] },
  cursedCoin: { side: 'self', produces: ['moment:heads', 'status:stunned'] },
  // Le dé de plus (Coup de chance) : ses faces réveillent compétences et reliques de face. Depuis le Doublé (D5 du retour
  // du 30 octobre), un dé de frappe ne lance de compétence que sur un Doublé ; la signature est gardée telle quelle : sans
  // ses faces, l'offre tirait deux fois moins Coup de chance (122 → 59 porteurs sur 960 builds) et Naraxes construit
  // tombait de 50,4 à 47,5 % (docs/etudes/DES_SUPPLEMENTAIRES.md, mesure du 2026-10-30)
  luckyStrike: { side: 'self', produces: ['face:1', 'face:2', 'face:3', 'moment:hit'] },
  immunity: { side: 'self' },
  riposte: { side: 'self', consumes: ['moment:hurt'], produces: ['damage:instant', 'moment:reflect'] },
  retribution: { side: 'self', consumes: ['moment:hurt'] },
  // Luciole : l'adversaire ne peut plus esquiver, et prend 2 de plus
  firefly: { side: 'opponent', produces: ['moment:hit', 'damage:instant'] },
  whistling: { side: 'self', produces: ['moment:heal'] },
  falseNote: { side: 'opponent' },
  casting: { side: 'self' },
  bearMight: { side: 'self', consumes: ['moment:hit'], produces: ['damage:instant'] },
  // Phase 8, premier lot (0.114.0) : la Curée, une rafale comme la Furie ; la Sentence vit des soins du porteur, la
  // Rancune des coups qu'il encaisse
  quarry: { side: 'self', produces: ['moment:hit', 'damage:instant'] },
  sentence: { side: 'self', consumes: ['moment:heal'], produces: ['damage:instant'] },
  grudge: { side: 'self', consumes: ['moment:hurt'], produces: ['moment:crit'] },
  // Phase 8, second lot : l'Embrasement lit la Brûlure au coup qui touche et la retire (une brique qui la lit aussi en voit
  // moins) ; la Vindicte vit des renvois. Le Dé pipé, une aura depuis les Maîtrises (M9) : comme la Pièce lestée, il vit
  // des pièces et en fait tomber plus sur pile
  conflagration: { side: 'self', consumes: ['moment:hit', 'status:burn'], hinders: ['status:burn'], produces: ['damage:temporal'] },
  // Depuis le 2026-10-27 (AURAS.md § 3), il fait aussi critiquer et esquiver ; il attend toujours une pièce pour s'offrir
  loadedDie: { side: 'self', consumes: ['moment:heads'], produces: ['moment:heads', 'moment:crit', 'moment:dodge'] },
  vendetta: { side: 'self', consumes: ['moment:reflect'], produces: ['status:momentum', 'damage:instant'] },
  // Le Duo (barde, refonte des auras du 2026-10-28) : trois coups bruts, une rafale comme la Curée
  duo: { side: 'self', produces: ['moment:hit', 'damage:instant'] },
  // Revue des compétences (I1, I3) : le Bouclier de foi vit des soins et donne de l'armure temporaire (qui se vide) ; la
  // Plaie ouverte, refaite avec les Maîtrises (M9), fait saigner à chaque coup qui touche
  faithShield: { side: 'self', consumes: ['moment:heal'], produces: ['status:bonusArmor', 'moment:shieldBreak'] },
  // Refonte des auras (2026-10-28) : la Plaie ouverte de nouveau au critique (la Saignée d'Elaria)
  openWound: { side: 'self', consumes: ['moment:crit'], produces: ['status:bleed', 'damage:temporal'] },
  // Phase 8, lot 3 : les malus de famille ; Garde brisée part sur un coup qui touche (relation « modifie ») et le double
  guardBreak: { side: 'opponent', consumes: ['moment:hit'], produces: ['damage:instant'] },
  jinx: { side: 'opponent' },
  blinded: { side: 'opponent' },
  hemorrhage: { side: 'opponent' },
  sealTheft: { side: 'opponent' },
  // Phase 8, lot 3 : la Feinte vit des esquives et en donne (son esquive), puis des critiques ; le Ciel d'orage frappe en
  // dégâts directs ; l'Ivresse du sang vit des critiques, en donne (chaque pose de plus) et frappe ; le Coup de massue fait
  // perdre une action (`stunned`, déjà au registre)
  // Refonte des auras (2026-10-28) : la Visée vit des esquives (et en donne) et met en joue (la Mire, que le critique lâche)
  feint: { side: 'self', consumes: ['moment:dodge'], produces: ['moment:dodge', 'status:aim'] },
  stormSky: { side: 'self', produces: ['damage:instant', 'damage:lightning'] },
  bloodFrenzy: { side: 'self', consumes: ['moment:crit'], produces: ['moment:crit', 'status:bloodFrenzyStrike', 'moment:hit', 'damage:instant'] },
  bloodFrenzyStrike: { side: 'self', produces: ['moment:hit', 'damage:instant'] },
  // Les Maîtrises, vague 2 (2026-10-27) : la Veine vit des 6 et donne un jet complet ; l'Effroi vit des critiques et fait
  // perdre une action (et fait critiquer, chaque pose de plus) ; la Rancœur vit des coups reçus ; la Ballade des coups qui
  // touchent ; le Poing de pierre, posé avec l'armure temporaire, frappe plus fort tant qu'elle tient
  // Refonte des auras (2026-10-28) : la Veine donne des coups bruts, une rafale comme l'Ivresse du sang
  luckyStreak: { side: 'self', consumes: ['face:max'], produces: ['status:veinStrike', 'moment:hit', 'damage:instant'] },
  dread: { side: 'self', consumes: ['moment:crit'], produces: ['status:fear', 'moment:crit'] },
  rancor: { side: 'self', consumes: ['moment:hurt'], produces: ['status:momentum', 'damage:instant'] },
  ballad: { side: 'self', consumes: ['moment:hit'], produces: ['moment:heal', 'status:balladNote', 'damage:instant'] },
  stoneFist: { side: 'self', consumes: ['moment:hit'], produces: ['damage:instant'] },
  // Quatrième demande du 2026-10-27 (le contenu des maîtrises) : l'Élan vit des gros coups, fait critiquer (donc des gros
  // coups) et donne de la Ferveur ; la Surtension vit des éclairs ; l'Emprise des malus de l'adversaire ; le Larcin
  // des esquives (et en donne) ; l'Onde de choc, des jauges, des coups encaissés
  onrush: { side: 'self', consumes: ['moment:heavy'], produces: ['moment:crit', 'status:momentum', 'damage:instant'] },
  overcharge: { side: 'self', consumes: ['damage:lightning'], produces: ['damage:instant', 'damage:lightning'] },
  grip: { side: 'self', consumes: ['malus'], produces: ['damage:instant'] },
  // Retour du 30 octobre (reliques) : la Focale renforce ses éclairs, flammes, rayons et lames d'air ; la face scellée, posée sur l'adversaire
  spellFocus: { side: 'self', produces: ['damage:instant'] },
  sealedFace: { side: 'opponent' },
  pilfer: { side: 'self', consumes: ['moment:dodge'], produces: ['moment:dodge'] },
  shockwave: { side: 'self', consumes: ['moment:hurt'] },
  // Quatrième demande du 2026-10-27 (le contenu du soin) : la Dîme, posée sur l'adversaire, part quand il frappe le lanceur
  // (ses coups reçus) et le soigne ; la Flamme votive vit de ses soins et pose une Brûlure (qui remplace l'ancienne) ; la
  // Sangsue lit le Saignement de l'adversaire à chaque coup qui touche et soigne ; la Peau de crapaud vit des coups reçus ;
  // la Pièce vert-de-gris, une pièce d'effet du Poison
  tithe: { side: 'self', consumes: ['moment:hurt'], produces: ['moment:heal', 'damage:instant'] },
  votiveFlame: { side: 'self', consumes: ['moment:heal'], produces: ['status:burn', 'damage:temporal'], hinders: ['slot:burn'] },
  leech: { side: 'self', consumes: ['moment:hit', 'status:bleed'], produces: ['moment:heal'] },
  harvest: { side: 'self', consumes: ['moment:hit', 'status:poison'], produces: ['moment:heal'] },
  toadSkin: { side: 'self', consumes: ['moment:hurt'], produces: ['status:poison', 'damage:temporal'] },
  verdigrisCoin: { side: 'self', produces: ['moment:heads', 'status:poison', 'damage:temporal'] },
  // Décisions du 2026-10-30 (D26, profondeur, D9) : l'Égide vit des coups reçus, la Grâce des soins, la Lame enduite des
  // coups qui touchent ; la Rage montante, des critiques reçus
  stormAegis: { side: 'self', consumes: ['moment:hurt'], produces: ['damage:instant'] },
  grace: { side: 'self', consumes: ['moment:heal'], produces: ['status:momentum'] },
  coatedBlade: { side: 'self', consumes: ['moment:hit'], produces: ['status:poison', 'damage:temporal'] },
  risingRage: { side: 'self', consumes: ['moment:hurt'] },
  // Refonte des auras (tranche 6) : les trois pièces nouvelles ; la Rafale de pile, des coups bruts comme l'Ivresse
  shieldCoin: { side: 'self', produces: ['moment:heads', 'status:bonusArmor', 'moment:shieldBreak'] },
  volleyCoin: { side: 'self', produces: ['moment:heads', 'status:volleyStrike', 'moment:hit', 'damage:instant'] },
  volleyStrike: { side: 'self', produces: ['moment:hit', 'damage:instant'] },
  hexCoin: { side: 'self', produces: ['moment:heads', 'status:weakened'] },
  // Refonte des auras (tranches 2 et 3) : la Mire part au critique ; les coups de la Veine ; les notes de la Ballade et
  // leur refrain ; le Bastion vit des armures vidées et en redonne ; le Jugement vit des coups reçus et met des fautes, à
  // seuil (la Peur) ; le Brasier attise ou allume la Brûlure
  aim: { side: 'self', consumes: ['moment:crit'], produces: ['damage:instant'] },
  veinStrike: { side: 'self', produces: ['moment:hit', 'damage:instant'] },
  balladNote: { side: 'self', produces: ['damage:instant'] },
  bastion: { side: 'self', consumes: ['moment:shieldBreak'], produces: ['damage:instant', 'status:bonusArmor', 'moment:shieldBreak'] },
  // Le verdict (D17 du 2026-10-30) : à la 3e faute, des PV perdus (plus la Peur)
  judgement: { side: 'self', consumes: ['moment:hurt'], produces: ['status:fault', 'damage:instant'] },
  fault: { side: 'opponent', produces: ['damage:instant'] },
  brasier: { side: 'self', produces: ['status:burn', 'damage:temporal'] },
  // Décisions D11, D19, D20 du 2026-10-30 : les compteurs des auras regroupées lâchent leur gros effet à leur seuil ; le
  // Cuir épais vit des coups reçus et donne de l'armure temporaire (qui se vide)
  stormCloud: { side: 'self', produces: ['damage:instant', 'damage:lightning'] },
  holyVigil: { side: 'self', produces: ['moment:heal'] },
  decoctionDose: { side: 'self', produces: ['status:poison', 'damage:temporal'] },
  emberHeap: { side: 'self', produces: ['status:burn', 'damage:temporal'] },
  thickHide: { side: 'self', consumes: ['moment:hurt'], produces: ['status:bonusArmor', 'moment:shieldBreak'] },
}

/** Le moment d'un déclencheur, ou sa face ; rien pour un déclencheur de temps (début de combat, de tour…). */
function triggerHook(t: Trigger): Hook | undefined {
  if (t === 'naturalMax') return 'face:max'
  if (t === 'healed') return 'moment:heal'
  if (t === 'shieldBroken') return 'moment:shieldBreak'
  if (t === 'reflected') return 'moment:reflect'
  if (t === 'heads') return 'moment:heads'
  const face = rollFace(t)
  if (face !== undefined) return `face:${face}`
  return t === 'hit' || t === 'hurt' || t === 'crit' || t === 'heavy' || t === 'dodge' || t === 'missed' ? `moment:${t}` : undefined
}

function addEffect(into: Hooks, e: Effect) {
  switch (e.type) {
    case 'applyStatus': {
      const s = STATUS_HOOKS[e.status]
      into.produces.push(`status:${e.status}`, ...(s.produces ?? []))
      into.consumes.push(...(s.consumes ?? []))
      into.hinders.push(...(s.hinders ?? []))
      break
    }
    case 'damage':
      into.produces.push(`damage:${damageKind(e.source)}`, ...(e.target === 'opponent' && e.source === 'lightning' ? (['damage:lightning'] as const) : []))
      break
    case 'release':
      into.produces.push(`damage:${damageKind(e.source)}`)
      // Ses jauges relâchées : des dégâts renvoyés. Le statut de l'adversaire relâché (Embrasement) : elle le lit, et le
      // retire (une brique qui le lit aussi en voit moins). Ses jauges comptées (Onde de choc, `per`) : les coups reçus
      if (e.from === 'opponent') {
        into.consumes.push(`status:${e.status}`)
        into.hinders.push(`status:${e.status}`)
      } else if (e.per !== undefined) into.consumes.push(...(STATUS_HOOKS[e.status].consumes ?? []))
      else into.produces.push('moment:reflect')
      break
    case 'heal':
      into.produces.push('moment:heal')
      break
    case 'cleanse':
      if (e.orElse) addEffect(into, e.orElse)
      if (e.andThen) addEffect(into, e.andThen)
      break
  }
}

/**
 * Ce qu'une production entraîne d'elle-même : un critique est un gros coup (le déclencheur `heavy` part avec chaque
 * critique) ; un statut négatif posé est un malus (l'Emprise les compte tous). Lu par `unique` et par `reachOf`.
 */
function derived(produces: Iterable<Hook>): Hook[] {
  const out: Hook[] = []
  for (const h of produces) {
    if (h === 'moment:crit') out.push('moment:heavy')
    if (h.startsWith('status:') && STATUSES[h.slice('status:'.length) as StatusId]?.polarity === 'negative') out.push('malus')
  }
  return out
}

const unique = (h: Hooks): Hooks => ({ produces: [...new Set([...h.produces, ...derived(h.produces)])], consumes: [...new Set(h.consumes)], hinders: [...new Set(h.hinders)] })

/** Les accroches d'une compétence, déduites de son déclencheur, de ses conditions et de ses effets. */
export function eventHooks(e: CharacterEvent): Hooks {
  const h: Hooks = { produces: [], consumes: [], hinders: [] }
  const on = triggerHook(e.trigger)
  if (on) h.consumes.push(on)
  for (const c of e.when ?? []) if (c.type === 'hasStatus') h.consumes.push(`status:${c.status}`)
  // Virulence, Agonie : elle lit les charges d'un statut
  for (const x of e.effects) if ((x.type === 'applyStatus' || x.type === 'heal' || x.type === 'damage') && x.fromStatus) h.consumes.push(`status:${x.fromStatus.status}`)
  // Crescendo, Soliste : ce coup ×N, un gros coup qui touche
  if (e.hitMultiplier) h.produces.push('moment:hit', 'damage:instant', ...(e.hitMultiplier >= 2 ? (['moment:heavy'] as const) : []))
  for (const effect of e.effects) addEffect(h, effect)
  // Attiser (lot 3, X2) : une pose qui lit le même statut chez sa cible et s'y ajoute ne l'écrase jamais d'une plus faible ;
  // elle ne gêne pas sa place unique
  const adds = e.effects.flatMap((x) =>
    x.type === 'applyStatus' && x.fromStatus?.status === x.status && x.fromStatus.who === (x.target ?? 'self') && x.fromStatus.factor >= 1 ? [`slot:${x.status}`] : [],
  )
  h.hinders = h.hinders.filter((x) => !adds.includes(x))
  return unique(h)
}

/** Une stat de relique : ce qu'elle produit si elle monte, ce qu'elle gêne si elle baisse. */
const STAT_HOOK: Record<keyof CharacterStats, Hook> = {
  maxHp: 'stat:maxHp',
  attackMin: 'stat:attackMin',
  attackMax: 'stat:attackMax',
  armor: 'stat:armor',
  dodgeChance: 'moment:dodge',
  critChance: 'moment:crit',
  critMultiplier: 'stat:critMultiplier',
}

/** Les accroches d'une relique, déduites de son type : stats, bonus de coup, ou déclencheur et effets. */
export function relicHooks(r: Relic): Hooks {
  const h: Hooks = { produces: [], consumes: [], hinders: [] }
  for (const [k, v] of Object.entries(r.stats ?? {}) as [keyof CharacterStats, number][]) (v > 0 ? h.produces : h.hinders).push(STAT_HOOK[k])
  if (r.rollBonus) {
    h.produces.push('damage:instant')
    if (r.onFace !== undefined) h.consumes.push(`face:${r.onFace}`)
  }
  if (r.trigger?.type === 'strike') {
    const on = triggerHook(r.trigger.on)
    if (on) h.consumes.push(on)
  }
  // Pièce lestée (2026-10-27) : elle vit des pièces du porteur, et en fait tomber plus sur pile (la Pièce trouée y gagne)
  if (r.headsChance) h.consumes.push('moment:heads')
  if (r.headsChance) h.produces.push('moment:heads')
  // Médaille de sursis : de la durée, comme des PV de plus ; Cor d'avant-garde : le premier coup du combat
  if (r.trigger?.type === 'lethal') h.produces.push('stat:maxHp')
  if (r.trigger?.type === 'initiative') h.produces.push('moment:hit')
  // Clairon du héraut : son aura de départ, plus tôt (ce qu'elle fait dépend du porteur) ; Dé de joueur : un jet de plus
  // sur ses compétences, un coup
  if (r.trigger?.type === 'startAura' || r.trigger?.type === 'bareFace') h.produces.push('damage:instant')
  for (const c of r.when ?? []) if (c.type === 'hasStatus') h.consumes.push(`status:${c.status}`)
  for (const effect of r.effects ?? []) addEffect(h, effect)
  return unique(h)
}

/**
 * Ce qu'une relique attend pour pouvoir partir, et que le combat seul ne donne pas (2026-10-24, offre de campagne) : les
 * statuts que ses conditions lisent chez l'adversaire (la Fiole de venin, le Poison), un soin reçu, une esquive, un
 * critique (un personnage sans chance d'esquive ni de critique n'en fait jamais sans une brique qui les donne) ; depuis
 * le second lot de la phase 8, une armure temporaire vidée, des dégâts renvoyés, une pièce sur pile. Une face, un coup
 * qui touche ou un coup reçu arrivent toujours.
 */
export function relicNeeds(r: Relic): Hook[] {
  const needs: Hook[] = []
  for (const c of r.when ?? []) if (c.type === 'hasStatus' && c.who === 'opponent') needs.push(`status:${c.status}`)
  const on = r.trigger?.type === 'strike' ? triggerHook(r.trigger.on) : undefined
  if (on && RARE_MOMENTS.includes(on)) needs.push(on)
  if (r.headsChance) needs.push('moment:heads')
  // Refonte des auras (2026-10-28) : une relique qui pose un statut attend ce qu'il attend (la Pointe de paratonnerre, des
  // éclairs ; la Chaîne du geôlier, des malus chez l'adversaire), la règle des compétences (`skillNeeds`)
  for (const x of r.effects ?? []) if (x.type === 'applyStatus') for (const h of STATUS_HOOKS[x.status].consumes ?? []) if (RARE_MOMENTS.includes(h)) needs.push(h)
  return needs
}

/**
 * Les moments qu'un combat ne donne pas à coup sûr : un soin, une esquive, un critique, une armure vidée, un renvoi, une pile ;
 * et deux ressources qu'un dé ne donne pas d'office : des éclairs, un malus posé (quatrième retour du 2026-10-27).
 */
const RARE_MOMENTS: readonly Hook[] = ['moment:heal', 'moment:dodge', 'moment:crit', 'moment:heavy', 'moment:shieldBreak', 'moment:reflect', 'moment:heads', 'damage:lightning', 'malus']

/**
 * Ce qu'une compétence attend pour servir (0.114.0, la règle de l'offre pertinente des reliques étendue aux compétences) :
 * les statuts que ses conditions ou ses charges lisent chez l'adversaire (la Curée, le Saignement ; la Virulence, le
 * Poison), les moments rares que consomment les statuts qu'elle pose (la Sentence, un soin du porteur ; le Rempart
 * hérissé, une armure vidée), et les statuts du porteur qu'ils lisent (le Dé pipé, une pièce). Une compétence dont un
 * besoin n'est pas à la portée du champion est une gravure qui vaut 0 : la campagne ne l'offre pas.
 */
export function skillNeeds(e: CharacterEvent): Hook[] {
  const needs: Hook[] = []
  for (const c of e.when ?? []) if (c.type === 'hasStatus' && c.who === 'opponent') needs.push(`status:${c.status}`)
  for (const x of e.effects) {
    if ((x.type === 'applyStatus' || x.type === 'heal' || x.type === 'damage') && x.fromStatus?.who === 'opponent') needs.push(`status:${x.fromStatus.status}`)
    if (x.type !== 'applyStatus') continue
    for (const h of STATUS_HOOKS[x.status].consumes ?? []) if (RARE_MOMENTS.includes(h) || h.startsWith('status:')) needs.push(h)
  }
  return [...new Set(needs)]
}

/**
 * Ce qui est à la portée d'un combattant, la règle « le producteur d'abord » (décision du parent, 2026-10-25) : ce que
 * produisent ses compétences (son dé), ses reliques et ses formes, et l'esquive ou le critique s'il en a la chance. Une
 * seule fonction pour l'offre (`offerableSkills`, `offerableRelics`) et pour les auras de chaque fiche (`auraServed`).
 */
export function reachOf(c: {
  events: readonly CharacterEvent[]
  relics?: readonly Relic[]
  forms?: readonly { statuses?: readonly StatusId[] }[]
  stats: Pick<CharacterStats, 'dodgeChance' | 'critChance'>
}): Set<Hook> {
  const reach = new Set<Hook>()
  for (const e of c.events) for (const h of eventHooks(e).produces) reach.add(h)
  for (const r of c.relics ?? []) for (const h of relicHooks(r).produces) reach.add(h)
  for (const s of (c.forms ?? []).flatMap((f) => f.statuses ?? [])) {
    reach.add(`status:${s}`)
    for (const h of STATUS_HOOKS[s].produces ?? []) reach.add(h)
  }
  if (c.stats.dodgeChance > 0) reach.add('moment:dodge')
  if (c.stats.critChance > 0) reach.add('moment:crit')
  for (const h of derived(reach)) reach.add(h)
  return reach
}

/**
 * Le lien entre deux briques : ce que l'une produit et que l'autre consomme, dans les deux sens, et les conflits : ce que
 * l'une gêne et que l'autre consomme, ou la place unique d'un statut que les deux posent (`slot:`, X2).
 */
export function linkBetween(a: Hooks, b: Hooks): { feeds: Hook[]; conflicts: Hook[] } {
  const meet = (given: readonly Hook[], wanted: readonly Hook[]) => wanted.filter((w) => given.includes(w))
  const shared = a.hinders.filter((h) => h.startsWith('slot:') && b.hinders.includes(h))
  return {
    feeds: [...new Set([...meet(a.produces, b.consumes), ...meet(b.produces, a.consumes)])],
    conflicts: [...new Set([...meet(a.hinders, b.consumes), ...meet(b.hinders, a.consumes), ...shared])],
  }
}

/** Les briques d'un combattant construit : ses compétences (forge comprise) et ses reliques. */
export function buildBricks(c: Pick<Character, 'events' | 'relics'>): Hooks[] {
  return [...c.events.map(eventHooks), ...c.relics.map(relicHooks)]
}

/** Ses accroches réunies : ce que l'ensemble de son build produit, consomme et gêne. */
export function buildHooks(c: Pick<Character, 'events' | 'relics'>): Hooks {
  const all = buildBricks(c)
  return unique({ produces: all.flatMap((h) => h.produces), consumes: all.flatMap((h) => h.consumes), hinders: all.flatMap((h) => h.hinders) })
}

/**
 * L'écho d'une brique dans un build (l'offre orientée, docs/PROGRESSION.md § 13.2) : combien d'accroches la relient à ce
 * qu'il porte déjà, dans un sens ou dans l'autre, moins celles où elle le gêne (revue des compétences, X2 : un second
 * producteur d'un statut unique, ou ce qui retire ce qu'il consomme), jamais sous 0. 0 : elle n'y touche rien, ou elle
 * gêne autant qu'elle nourrit.
 */
export function echoOf(brick: Hooks, build: Hooks): number {
  const { feeds, conflicts } = linkBetween(brick, build)
  return Math.max(0, feeds.length - conflicts.length)
}

/** La cohérence d'un build : ses paires de briques qui se nourrissent, sur toutes ses paires. */
export function buildLinks(c: Pick<Character, 'events' | 'relics'>): { linked: number; pairs: number } {
  const bricks = buildBricks(c)
  let linked = 0
  for (let i = 0; i < bricks.length; i++) for (let j = i + 1; j < bricks.length; j++) if (linkBetween(bricks[i], bricks[j]).feeds.length) linked++
  return { linked, pairs: (bricks.length * (bricks.length - 1)) / 2 }
}

/** Tous les statuts posés par un effet, avec le côté où il les pose (y compris ce que posent les statuts eux-mêmes). */
function posed(effects: readonly Effect[]): { status: StatusId; side: Target }[] {
  return effects.flatMap((e) =>
    e.type === 'applyStatus' ? [{ status: e.status, side: e.target ?? 'self' }] : e.type === 'cleanse' && e.orElse ? posed([e.orElse]) : [],
  )
}

/**
 * Erreurs d'accroches (vide si tout va bien) : une compétence ou une relique qui ne produit rien vit seule ; un statut
 * posé des deux côtés rendrait ses accroches fausses (elles s'écrivent du point de vue de qui le pose).
 */
export function validateHooks(events: readonly CharacterEvent[], relics: readonly Relic[]): string[] {
  const errors: string[] = []
  for (const e of events) if (eventHooks(e).produces.length === 0) errors.push(`${e.id} : la compétence ne produit aucune accroche`)
  for (const r of relics) if (relicHooks(r).produces.length === 0) errors.push(`${r.id} : la relique ne produit aucune accroche`)
  const all = [...events.flatMap((e) => posed(e.effects)), ...relics.flatMap((r) => posed(r.effects ?? []))]
  for (const { status, side } of all)
    if (side !== STATUS_HOOKS[status].side) errors.push(`${status} : posé sur ${side === 'self' ? 'soi' : 'l’adversaire'}, déclaré ${STATUS_HOOKS[status].side === 'self' ? 'sur soi' : 'sur l’adversaire'}`)
  return [...new Set(errors)]
}

export interface KitSeed {
  skill: CharacterEvent
  /** Les autres briques qui consomment ce qu'elle produit (compétences d'autres personnages, reliques) */
  consumers: string[]
}

/**
 * Le kit ouvert (docs/PROGRESSION.md § 6.2) : pour chaque compétence d'un kit, les briques hors du kit qui consomment ce
 * qu'elle produit. Une compétence est une graine si deux briques au moins la prolongent. Un relevé, pas une règle :
 * il deviendra un contrôle quand les répertoires existeront (phase 2 et 5).
 */
export function kitSeeds(kit: readonly CharacterEvent[], pool: readonly CharacterEvent[], relics: readonly Relic[]): KitSeed[] {
  const own = new Set(kit.map((e) => e.id))
  const others = [
    ...pool.filter((e) => !own.has(e.id)).map((e) => ({ name: e.name, hooks: eventHooks(e) })),
    ...relics.map((r) => ({ name: r.name, hooks: relicHooks(r) })),
  ]
  return kit.map((skill) => {
    const made = eventHooks(skill).produces
    return { skill, consumers: others.filter((o) => o.hooks.consumes.some((w) => made.includes(w))).map((o) => o.name) }
  })
}
