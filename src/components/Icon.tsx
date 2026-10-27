import { STATES, STATUS_PLACE, type StateId } from '../game/states'
import { STATUSES, type StatusId } from '../game/statuses'
import type { CharacterEvent } from '../game/events'

/** Icônes peintes (`src/assets/icons/`, voir la section 7 de `docs/STYLE_BIBLE.md`). */
const URLS = import.meta.glob<string>('../assets/icons/*.png', { eager: true, import: 'default' })
/** Toutes les icônes peintes, à précharger (preload.ts) */
export const ICON_URLS = Object.values(URLS)

export type IconName =
  | 'swords'
  | 'trophy'
  | 'lightning'
  | 'stats'
  | 'scroll'
  | 'dice'
  | 'event'
  | 'crit'
  | 'shield'
  | 'poison'
  | 'regen'
  | 'weakened'
  | 'breach'
  | 'turns'
  | 'holy-aura'
  | 'purification'
  | 'fear'
  | 'decoction-aura'
  | 'coin-flip'
  | 'lucky-strike'
  | 'coin-face'
  | 'coin-pile'
  | 'retribution'
  | 'riposte'
  | 'immunity-aura'
  | 'thorns'
  | 'lifesteal'
  | 'wind-fury'
  | 'evasion'
  | 'precision-aura'
  | 'frost-aura'
  | 'power-aura'
  | 'intimidation-aura'
  | 'waiting'
  | 'fireflies'
  | 'charge'
  | 'rot-aura'
  | 'whistle'
  | 'false-note'
  | 'crescendo'
  | 'soloist'
  // Planche v8 (2026-10-20) : Saignement et ses sources, Aura glaciale, relais du druide
  | 'bleed'
  | 'cleave'
  | 'grudge'
  | 'grudge-aura'
  // Planche A (2026-10-20) : druide
  | 'thunderbolt'
  | 'casting'
  | 'bear-might'
  | 'burn'
  // Planche C (2026-10-20) : interface, son et paris
  | 'purse'
  | 'bet-token'
  | 'twist'
  // Planche v12 (2026-10-21) : emblèmes d'état, pièces gravées monochromes
  | 'state-power'
  | 'state-weakened'
  | 'state-shield'
  | 'state-sure-crit'
  | 'state-crit-power'
  | 'state-sure-dodge'
  | 'state-extra-die'
  | 'state-healing'
  | 'state-drain'
  | 'state-reflect'
  | 'state-thorns'
  | 'state-immunity'
  | 'state-poison'
  | 'state-bleed'
  | 'state-burn'
  | 'state-lost-turn'
  | 'state-rot'
  | 'state-breach'
  | 'state-firefly'
  | 'state-spoiled'
  | 'state-vulnerable'
  // Planche v17 (2026-10-25) : phase 8, premier lot ; la Rancune reprend `grudge` (planche v8)
  | 'quarry'
  | 'harvest'
  | 'virulence'
  | 'sentence'
  // Phase 8, second lot (2026-10-25) : planche à peindre (briefs : docs/SORTS.md § 23) ; une icône absente laisse un trou
  | 'conflagration'
  | 'loaded-die'
  | 'bristling-rampart'
  | 'vendetta'
  // Planche v20 (2026-10-25) : le Duo de la barde (compétence et statut)
  | 'duo'
  // Planche v22 (2026-10-25) : la revue des compétences (Bouclier de foi, Pas de côté, Plaie ouverte)
  | 'faith-shield'
  | 'sidestep'
  | 'open-wound'
  // Planche v23 (2026-10-25) : phase 8, lot 3, les malus de famille (compétence et statut)
  | 'guard-break'
  | 'jinx'
  | 'blinding'
  | 'hemorrhage'
  | 'seal-theft'
  // Planches v23 et v24 (2026-10-25) : phase 8, lot 3, les fils minces (compétence et statut)
  | 'feint'
  | 'black-sap'
  | 'blood-debt'
  | 'stoke'
  | 'storm-sky'
  | 'blood-frenzy'
  | 'stunning-blow'
  // Retour du 2026-10-27 : les pièces de la Chance, et les briques nouvelles des Maîtrises (vague 2)
  | 'lucky-coin'
  | 'cursed-coin'
  | 'lucky-streak'
  | 'dread'
  | 'rancor'
  | 'storm-field'
  | 'ballad'
  | 'prayer'
  | 'wither'
  | 'assault'
  | 'stone-fist'
  // Les emblèmes des huit maîtrises (docs/MAITRISES.md « Huit maîtrises » ; la Magie reprend l'emblème de l'Orage en attendant le sien)
  | 'mastery-fury'
  | 'mastery-blood'
  | 'mastery-bulwark'
  | 'mastery-poison'
  | 'mastery-chance'
  | 'mastery-light'
  | 'mastery-shadow'
  | 'mastery-magic'

/**
 * Icône peinte propre à chaque statut : celle de la compétence ou de l'aura qui le porte. Une compétence qui pose
 * le statut l'emprunte (`skillIcon`) ; une aura, une forme ou un mécanisme s'affiche avec elle. Un statut de la
 * zone d'état, lui, se montre partout par l'emblème de son état (`statusIcon`). Facultative pour un statut « à
 * venir » (repli sur une marque neutre, l'initiale de son nom) ; un statut en jeu doit avoir une icône : un test le
 * vérifie. Jamais d'emoji : une icône manquante se demande à l'utilisateur (docs/STYLE_BIBLE.md § 7).
 */
export const STATUS_ICON: Partial<Record<StatusId, IconName>> = {
  guaranteedCrit: 'crit',
  bonusArmor: 'shield',
  poison: 'poison',
  regeneration: 'regen',
  weakened: 'weakened',
  exposed: 'breach',
  thorns: 'thorns',
  lifesteal: 'lifesteal',
  windFury: 'wind-fury',
  evasion: 'evasion',
  precisionAura: 'precision-aura',
  frostAura: 'frost-aura',
  powerAura: 'power-aura',
  intimidationAura: 'intimidation-aura',
  fear: 'fear',
  holyAura: 'holy-aura',
  decoctionAura: 'decoction-aura',
  coinFlip: 'coin-flip',
  // Retour du 2026-10-27 (R2) : la compétence et son statut partagent l'icône
  luckyCoin: 'lucky-coin',
  cursedCoin: 'cursed-coin',
  luckyStrike: 'lucky-strike',
  retribution: 'retribution',
  riposte: 'riposte',
  immunityAura: 'immunity-aura',
  firefly: 'fireflies',
  burn: 'burn',
  rotAura: 'rot-aura',
  // La Pourriture subie (hors jeu) reprend l'icône de l'aura
  rot: 'rot-aura',
  // Barde (0.41.0) : une icône pour la compétence et son statut, comme les auras
  whistling: 'whistle',
  falseNote: 'false-note',
  bleed: 'bleed',
  // Druide : l'empreinte d'ours brûlée (planche v8) va à l'Aura sauvage
  casting: 'casting',
  bearMight: 'bear-might',
  wildAura: 'grudge-aura',
  // Phase 8, premier lot (0.114.0) : la compétence et son statut partagent l'icône
  quarry: 'quarry',
  sentence: 'sentence',
  grudge: 'grudge',
  // Phase 8, second lot : de même
  conflagration: 'conflagration',
  loadedDie: 'loaded-die',
  bristlingRampart: 'bristling-rampart',
  vendetta: 'vendetta',
  // Le Duo (2026-10-25) : la compétence et son statut partagent l'icône
  duo: 'duo',
  // Revue des compétences (2026-10-25) : la compétence et son statut partagent l'icône
  faithShield: 'faith-shield',
  sidestep: 'sidestep',
  openWound: 'open-wound',
  // Phase 8, lot 3 : les malus de famille ; dans la zone d'état, leur état emprunte la même icône (`STATE_ICON`)
  guardBreak: 'guard-break',
  jinx: 'jinx',
  blinded: 'blinding',
  hemorrhage: 'hemorrhage',
  sealTheft: 'seal-theft',
  // Phase 8, lot 3 : la compétence et son statut partagent l'icône ; les coups de l'Ivresse, celle de leur aura
  feint: 'feint',
  blackSap: 'black-sap',
  bloodDebt: 'blood-debt',
  stormSky: 'storm-sky',
  bloodFrenzy: 'blood-frenzy',
  bloodFrenzyStrike: 'blood-frenzy',
  // Les Maîtrises, vague 2 (2026-10-27) : la compétence et son statut partagent l'icône ; le Poing de pierre a la sienne
  luckyStreak: 'lucky-streak',
  dread: 'dread',
  rancor: 'rancor',
  stormField: 'storm-field',
  ballad: 'ballad',
  stoneFist: 'stone-fist',
}

/**
 * Emblème de chaque état de la zone d'état (`states.ts`, planche v12, 0.79.2). Un état n'a pas la grammaire d'une
 * compétence : la compétence est l'identité du personnage (objet peint à sa palette, dans un sceau octogonal) ;
 * l'état est un mot du vocabulaire commun, une pièce ronde et monochrome au symbole gravé, posée telle quelle,
 * sans cadre (docs/STYLE_BIBLE.md § 7). Les cinq derniers (planche v15, 0.110.1) complètent la zone d'état.
 */
export const STATE_ICON: Partial<Record<StateId, IconName>> = {
  power: 'state-power',
  weakened: 'state-weakened',
  shield: 'state-shield',
  sureCrit: 'state-sure-crit',
  critPower: 'state-crit-power',
  sureDodge: 'state-sure-dodge',
  extraDie: 'state-extra-die',
  healing: 'state-healing',
  drain: 'state-drain',
  reflect: 'state-reflect',
  thorns: 'state-thorns',
  immunity: 'state-immunity',
  poison: 'state-poison',
  bleed: 'state-bleed',
  burn: 'state-burn',
  lostTurn: 'state-lost-turn',
  rot: 'state-rot',
  breach: 'state-breach',
  firefly: 'state-firefly',
  spoiled: 'state-spoiled',
  vulnerable: 'state-vulnerable',
  // Phase 8, lot 3 : pas encore d'emblème d'état peint (pièce ronde monochrome) ; l'icône de la compétence en tient lieu
  guardBroken: 'guard-break',
  jinxed: 'jinx',
  blinded: 'blinding',
  noHealing: 'hemorrhage',
  bonusStolen: 'seal-theft',
}

/** Icône d'un état : l'icône peinte, sinon une marque neutre (l'initiale de l'état) à la même taille. */
export function StateIcon({ id, className }: { id: StateId; className: string }) {
  const name = STATE_ICON[id]
  if (name) return <Icon name={name} className={className} />
  return (
    <span
      aria-hidden
      className={`flex items-center justify-center rounded-full border border-stone-500/60 bg-stone-800 font-display font-extrabold leading-none text-stone-300 ${className}`}
    >
      {STATES[id].name[0]}
    </span>
  )
}

/**
 * Icône peinte d'une compétence (par id d'événement), quand elle a la sienne ; sinon, le compendium
 * et les infobulles montrent l'icône générique des compétences.
 */
export const SKILL_ICON: Partial<Record<string, IconName>> = {
  // Les lucioles qui lancent la Brûlure, plutôt que la Brûlure elle-même (deux niveaux de lecture, 0.79.0)
  firefly: 'fireflies',
  whistle: 'whistle',
  'false-note': 'false-note',
  crescendo: 'crescendo',
  soloist: 'soloist',
}

/**
 * Icône d'une compétence, pour sa fenêtre (sceau) dans les infobulles et le compendium : son icône propre
 * (`SKILL_ICON`, ou une icône peinte qui porte son id, comme `wind-fury`), sinon celle du statut qu'elle pose
 * ou relâche (Œil de faucon : le critique assuré), sinon l'icône générique des compétences.
 */
export function skillIcon(event: Pick<CharacterEvent, 'id' | 'effects'>): IconName {
  const own = SKILL_ICON[event.id] ?? (URLS[`../assets/icons/${event.id}.png`] ? (event.id as IconName) : undefined)
  if (own) return own
  for (const e of event.effects) {
    const status = e.type === 'applyStatus' || e.type === 'release' ? e.status : undefined
    const icon = status && STATUS_ICON[status]
    if (icon) return icon
  }
  return 'event'
}

/**
 * Icône d'un statut hors de la barre de compétences (compendium, infobulles) : un statut de la zone d'état prend
 * l'emblème de l'état qu'il alimente, comme en combat (Critique assuré : la pièce gravée, pas la cible d'Œil de
 * faucon) ; une aura, une forme ou un mécanisme garde son icône peinte (`STATUS_ICON`).
 */
export function statusIcon(id: StatusId): IconName | undefined {
  const place = STATUS_PLACE[id]
  const state = place.place === 'tray' ? place.relays[0]?.state : undefined
  return (state && STATE_ICON[state]) ?? STATUS_ICON[id]
}

/** Icône d'un statut (`statusIcon`), sinon une marque neutre (l'initiale du statut) à la même taille. */
export function StatusIcon({ id, className }: { id: StatusId; className: string }) {
  const name = statusIcon(id)
  if (name) return <Icon name={name} className={className} />
  return (
    <span
      aria-hidden
      className={`flex items-center justify-center rounded-full border border-stone-500/60 bg-stone-800 font-display font-extrabold leading-none text-stone-300 ${className}`}
    >
      {STATUSES[id].name[0]}
    </span>
  )
}

/** Icône à la taille du texte qui l'entoure ; `className` permet de l'agrandir (`h-24 w-24`…). */
export function Icon({ name, className = 'h-[1.3em] w-[1.3em]' }: { name: IconName; className?: string }) {
  return (
    <img
      src={URLS[`../assets/icons/${name}.png`]}
      alt=""
      aria-hidden
      draggable={false}
      className={`inline-block shrink-0 select-none align-[-0.3em] ${className}`}
    />
  )
}

/**
 * Icône d'une relique : l'icône peinte qui porte son id (`src/assets/icons/<id>.png`), sinon son initiale gravée
 * en or, à la même taille : le sceau qui l'entoure (hexagone, RelicSeal) suffit à dire « relique ».
 */
export function RelicIcon({ id, name, className }: { id: string; name: string; className: string }) {
  if (URLS[`../assets/icons/${id}.png`]) return <Icon name={id as IconName} className={className} />
  return (
    <span aria-hidden className={`relic-initial flex items-center justify-center font-display font-extrabold leading-none ${className}`}>
      {name[0]}
    </span>
  )
}

/**
 * Emblème peint d'une maîtrise (`src/assets/icons/mastery-<id>.png`, docs/MAITRISES.md § 3), sinon son initiale en
 * or dans un rond neutre, à la même taille : un emblème pas encore peint ne laisse ni trou ni plantage.
 */
export function MasteryIcon({ id, name, className }: { id: string; name: string; className: string }) {
  const url = URLS[`../assets/icons/mastery-${id}.png`]
  if (url) return <img src={url} alt="" aria-hidden draggable={false} className={`inline-block shrink-0 select-none object-contain ${className}`} />
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full border border-gold-500/60 bg-surface-2 font-display font-extrabold leading-none text-gold-300 ${className}`}>
      {name[0]}
    </span>
  )
}
