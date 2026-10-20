import { STATUSES, type StatusId } from '../game/statuses'
import type { CharacterEvent } from '../game/events'

/** Icônes peintes (`src/assets/icons/`, voir la section 7 de `docs/STYLE_BIBLE.md`). */
const URLS = import.meta.glob<string>('../assets/icons/*.png', { eager: true, import: 'default' })

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
  | 'sound-on'
  | 'sound-off'
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
  | 'poison-aura'
  | 'power-aura'
  | 'intimidation-aura'
  | 'waiting'
  | 'life-bloom'
  | 'bark-skin'
  | 'fireflies'
  | 'charge'
  | 'claw'
  | 'rot-aura'
  | 'whistle'
  | 'false-note'
  | 'melodious-aura'
  | 'crescendo'
  | 'soloist'

/**
 * Icône peinte de chaque statut. Facultative pour un statut « à venir » (repli sur une marque neutre,
 * l'initiale de son nom), obligatoire avant qu'un personnage le pose : un test le vérifie.
 * Jamais d'emoji : une icône manquante se demande à l'utilisateur (docs/STYLE_BIBLE.md § 7).
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
  poisonAura: 'poison-aura',
  powerAura: 'power-aura',
  intimidationAura: 'intimidation-aura',
  fear: 'fear',
  holyAura: 'holy-aura',
  decoctionAura: 'decoction-aura',
  coinFlip: 'coin-flip',
  luckyStrike: 'lucky-strike',
  retribution: 'retribution',
  riposte: 'riposte',
  immunityAura: 'immunity-aura',
  waiting: 'waiting',
  firefly: 'fireflies',
  // Brûlure des Feux follets (0.50.0) : l'icône des lucioles, en attendant la sienne
  burn: 'fireflies',
  rotAura: 'rot-aura',
  // Provisoire : la Pourriture subie reprend l'icône de l'aura, en attendant la sienne (demandée)
  rot: 'rot-aura',
  // Barde (0.41.0) : une icône pour la compétence et son statut, comme les auras
  whistling: 'whistle',
  falseNote: 'false-note',
  melodiousAura: 'melodious-aura',
}

/**
 * Icône peinte d'une compétence (par id d'événement), quand elle a la sienne ; sinon, le compendium
 * et les infobulles montrent l'icône générique des compétences.
 */
export const SKILL_ICON: Partial<Record<string, IconName>> = {
  'life-bloom': 'life-bloom',
  'bark-skin': 'bark-skin',
  firefly: 'fireflies',
  charge: 'charge',
  claw: 'claw',
  'rot-aura': 'rot-aura',
  'waiting-1': 'waiting',
  'waiting-2': 'waiting',
  'waiting-3': 'waiting',
  whistle: 'whistle',
  'false-note': 'false-note',
  'melodious-aura': 'melodious-aura',
  overture: 'melodious-aura',
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

/** Icône d'un statut : l'icône peinte, sinon une marque neutre (l'initiale du statut) à la même taille. */
export function StatusIcon({ id, className }: { id: StatusId; className: string }) {
  const name = STATUS_ICON[id]
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
