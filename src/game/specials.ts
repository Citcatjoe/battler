/*
 * La zone de surcharge : la colonne de labels sous le dé (docs/RESOLUTION.md, « Zone de surcharge », la référence).
 * Elle montre ce qui modifie l'étape de résolution en cours au-delà de sa règle de base, au moment où ça
 * s'applique (critique, esquive assurée, bouclier qui absorbe, Saignement qui coule, Riposte…). Présentation
 * pure : rien n'est recalculé, le rejoueur lit la chronologie (champs d'`Attack`, étapes de réaction).
 *
 * N'y entrent pas (définition de l'utilisateur, 2026-10-21) : ce qui se déclenche (compétence, Pile ou face,
 * Furie des vents, Rétribution, Crescendo et Soliste : leur sceau le dit, barre de compétences) et ce qui agit à chaque coup
 * (auras et états durables : barre de compétences et zone d'état). Exception déclarée : la relique qui se
 * déclenche garde son label (`relicSpecial`), faute de sceau dans la barre de compétences.
 *
 * Registre unique : un label a une source (sa couleur) et un signe (son son, docs/SONS.md § 4.4), tous deux
 * déduits ici de la mécanique ; un point d'appel ne donne jamais ni couleur, ni signe, ni son. Le signe se lit
 * toujours du point de vue de l'attaquant (le combattant dont c'est l'action offensive en cours) : + si la
 * surcharge amplifie son action, − si elle la réduit ou la contre. Couleurs : docs/design-system.md § 3.1.
 */
import { multiplier, type AppliedEffect, type Attack } from './combat'
import { isAura, STATUSES, type Polarity, type StatusId } from './statuses'

/** D'où vient la surcharge : le coup lui-même (le dé, le critique), un statut ou une compétence, une relique. */
export type SpecialSource = 'strike' | 'skill' | 'relic'

/** Le sens de la surcharge pour l'attaquant : `plus` amplifie son action, `minus` la réduit ou la contre. */
export type SpecialSign = 'plus' | 'minus'

/** Un label posé sous le dé ; `key` relance son apparition. `icon` : icône peinte (relique, critique assuré). */
export interface SpecialBadge {
  key: number
  label: string
  source: SpecialSource
  sign: SpecialSign
  icon?: SpecialIcon
}

/** Icône d'un label : une icône de l'interface, ou le sceau d'une relique (son id). */
export type SpecialIcon = { icon: 'crit' } | { relic: string; name: string }

/** Ce qu'un constructeur du registre rend pour poser un label (la clé est ajoutée à la pose). */
export type SpecialSpec = Omit<SpecialBadge, 'key'>

/**
 * Les sources : nom et couleurs (fond, texte, tranche portée sous le label, hachures du −, liseré facultatif).
 * - `strike` (Coup) : le dé et le critique (critique, critique assuré) ; l'ambre du critique, qui lui est réservé
 *   (FAMILLES.md § 3).
 * - `skill` (Compétence ou statut) : un statut ou une compétence qui change ce coup-ci (esquive assurée, bouclier,
 *   Fausse note, Saignement, Riposte…) ; un ivoire neutre, qui ne dit ni bonus ni malus : le signe s'en charge.
 * - `relic` (Relique) : une relique qui renforce le coup (« Fer à quatre clous +4 ») ou qui se déclenche ; plaque
 *   sombre gravée d'or, comme son sceau.
 */
export const SPECIAL_SOURCES: Record<SpecialSource, { name: string; bg: string; fg: string; edge: string; hatch: string; ring?: string }> = {
  strike: { name: 'Coup', bg: '#fbbf24', fg: '#1c1917', edge: '#92400e', hatch: 'rgb(28 25 23 / 0.16)' },
  skill: { name: 'Compétence ou statut', bg: '#e9dfc8', fg: '#1f1a14', edge: '#7a6a4f', hatch: 'rgb(31 26 20 / 0.16)' },
  relic: { name: 'Relique', bg: '#24170a', fg: '#f6dc9a', edge: '#6e4d1d', hatch: 'rgb(246 220 154 / 0.16)', ring: '#dda94a' },
}

/**
 * Les signes : le symbole écrit devant un chiffre, la polarité et le son du label (SONS.md § 4.4 : Pile réussie
 * pour +, Malus reçu pour −). Le − porte en plus des hachures sur sa plaque (`.special-badge[data-sign='minus']`).
 */
export const SPECIAL_SIGNS: Record<SpecialSign, { name: string; symbol: '+' | '−'; polarity: Polarity; cue: 'coinWin' | 'debuff' }> = {
  plus: { name: 'Amplifie', symbol: '+', polarity: 'positive', cue: 'coinWin' },
  minus: { name: 'Réduit ou contre', symbol: '−', polarity: 'negative', cue: 'debuff' },
}

/** Qui porte la cause de la surcharge : l'attaquant ou le défenseur du coup en cours. */
export type SpecialBearer = 'attacker' | 'defender'

/** « Nom +4 », « Nom −6 », ou le nom seul sans chiffre. */
const withAmount = (name: string, sign: SpecialSign, amount?: number) =>
  amount === undefined ? name : `${name} ${SPECIAL_SIGNS[sign].symbol}${Math.abs(amount)}`

/**
 * Une relique qui se déclenche (étape `relic`) : exception déclarée à la règle « ce qui se déclenche n'entre pas »
 * (demande de l'utilisateur, 2026-10-21 : « quand une relique se déclenche, il faudrait un label au centre ») ;
 * une relique n'a pas de sceau dans la barre de compétences. Son nom seul. Son signe, autre exception (décision de
 * l'utilisateur, 0.110.0) : une relique ne pose jamais de malus (`validateRelics`), et un bonus gardé pour plus tard
 * est un bonus pour son porteur, donc + chez l'attaquant comme chez le défenseur ; − seulement chez le défenseur,
 * quand elle contre le coup en cours en frappant l'attaquant (la Conque des vents).
 */
export function relicSpecial(relic: string, name: string, bearer: SpecialBearer, effects: readonly AppliedEffect[]): SpecialSpec {
  const counters = bearer === 'defender' && effects.some((e) => e.type === 'damage' && e.amount > 0)
  return { label: name, source: 'relic', sign: counters ? 'minus' : 'plus', icon: { relic, name } }
}

/**
 * Un statut est-il une surcharge, d'après sa mécanique ? Oui s'il change ce coup-ci et n'agit pas à chaque coup :
 * il impose le critique ou l'esquive, absorbe (bouclier), modifie le coup puis s'use sur lui (`spentOnHit`,
 * `spentOnHurt` : Fausse note, Luciole), ou réagit à ce coup (vol de vie, renvoi, réaction au coup encaissé :
 * Saignement, Épines). Non : une aura (elle agit à chaque coup), un modificateur durable (Affaibli, Force de
 * l'ours), un statut qui donne une action (Furie des vents, Coup de chance, Pile ou face : il se déclenche).
 */
export function isSurcharge(id: StatusId): boolean {
  const def = STATUSES[id]
  if (isAura(id)) return false
  const spentModifier = (def.spentOnHit || def.spentOnHurt) && !!(def.modifyOutgoing || def.modifyIncoming || def.modifyFinal)
  return !!(def.forcesCrit || def.forcesDodge || def.shield || spentModifier || def.drainsHit || def.reflectsHit || def.reactions?.hurt)
}

/**
 * Le label d'un statut qui surcharge ce coup, ou undefined s'il n'en est pas une (`isSurcharge`). Le signe vient
 * de sa polarité et de son porteur : un bonus de l'attaquant ou un malus du défenseur amplifie l'action (Vol de
 * vie, Saignement, Luciole) ; un bonus du défenseur ou un malus de l'attaquant la réduit ou la contre (Esquive
 * assurée, bouclier, Riposte, Épines, Fausse note). `amount` : son effet chiffré sur ce coup (points ajoutés,
 * retirés, rendus, renvoyés), écrit avec le signe ; absent, le label n'a pas de chiffre.
 */
export function statusSpecial(id: StatusId, bearer: SpecialBearer, amount?: number): SpecialSpec | undefined {
  if (!isSurcharge(id)) return undefined
  const def = STATUSES[id]
  const sign: SpecialSign = (def.polarity === 'positive') === (bearer === 'attacker') ? 'plus' : 'minus'
  // Un critique imposé est le critique lui-même : la source Coup, avec l'icône du critique
  if (def.forcesCrit) return { label: def.name, source: 'strike', sign, icon: { icon: 'crit' } }
  // L'esquive imposée dit son effet plutôt que son statut (« Esquive améliorée ») : rien à chiffrer. Chez l'attaquant, son
  // intensité (Esquive améliorée aiguisée, 0.117.1) est un modificateur comme un autre, chiffré
  if (def.forcesDodge && bearer === 'defender') return { label: 'Esquive assurée', source: 'skill', sign }
  return { label: withAmount(def.name, sign, amount), source: 'skill', sign }
}

/**
 * Les surcharges d'un coup lisibles dans son `Attack`, dans l'ordre du livre de règles (RESOLUTION.md § 3), rangées
 * par instant de la mise en scène :
 * - `roll`, au résultat du dé : l'esquive imposée (étape 2 : elle annule le reste), le bonus de relique (2 bis), la face
 *   dorée de la forge (2 bis, couleur du coup : c'est le dé lui-même) ;
 * - `crit`, juste avant l'élan : le critique assuré, puis le critique (3) ;
 * - `impact`, à l'impact : les modificateurs qui s'usent sur ce coup (4-5 : Luciole), les boucliers (8), les dégâts
 *   finaux qui s'usent sur ce coup (8 bis : Fausse note). Un modificateur d'aura ou d'état durable n'y est pas.
 * Un jet remplacé n'en a aucune. Les réactions au coup (Vol de vie, Riposte, Saignement) ont leur propre étape.
 * Le statut d'un critique ou d'une esquive imposés est celui que le moteur nomme (`critBy`, `dodgeBy`).
 */
export function attackSpecials(attack: Attack): { roll: SpecialSpec[]; crit: SpecialSpec[]; impact: SpecialSpec[] } {
  const roll: (SpecialSpec | undefined)[] = []
  const crit: (SpecialSpec | undefined)[] = []
  const impact: (SpecialSpec | undefined)[] = []
  if (!attack.replaced) {
    if (attack.dodged && attack.dodgeBy) roll.push(statusSpecial(attack.dodgeBy, 'defender'))
    for (const b of attack.relicBonus ?? [])
      roll.push({ label: withAmount(b.name, 'plus', b.amount), source: 'relic', sign: 'plus', icon: { relic: b.relic, name: b.name } })
    if (attack.gild) roll.push({ label: withAmount('Face dorée', 'plus', attack.gild), source: 'strike', sign: 'plus' })
    if (attack.crit && attack.critBy) crit.push(statusSpecial(attack.critBy, 'attacker'))
    if (attack.crit) crit.push({ label: `Critique ${multiplier(attack.critMultiplier)}`, source: 'strike', sign: 'plus' })
    const [before, final] = [attack.modifiers.filter((m) => !m.final), attack.modifiers.filter((m) => m.final)]
    impact.push(...before.map((m) => statusSpecial(m.status, m.by, m.delta)))
    impact.push(...attack.shields.map((s) => statusSpecial(s.status, 'defender', -s.absorbed)))
    impact.push(...final.map((m) => statusSpecial(m.status, m.by, m.delta)))
  }
  const kept = (list: (SpecialSpec | undefined)[]) => list.filter((s): s is SpecialSpec => s !== undefined)
  return { roll: kept(roll), crit: kept(crit), impact: kept(impact) }
}

/**
 * Le label d'une réaction au coup (étape `statusReaction` : Vol de vie, Riposte, Saignement, Épines, Rancune), ou
 * undefined si son statut n'est pas une surcharge. Son chiffre : les PV qu'elle fait perdre ou rendre (« Vol de vie +5 »,
 * « Riposte −3 », « Saignement +2 ») ; sans PV (les Épines posent un Saignement), pas de chiffre. Son signe, la règle de
 * la relique du défenseur (décision de l'utilisateur, 0.110.0) étendue aux statuts (0.114.1) : une réaction du défenseur
 * qui ne fait que lui donner un bonus pour plus tard (la Rancune : un Critique assuré) est un bonus pour son porteur, +.
 */
export function reactionSpecial(id: StatusId, bearer: SpecialBearer, effects: readonly AppliedEffect[]): SpecialSpec | undefined {
  const amount = effects.reduce((t, e) => t + (e.type === 'damage' || e.type === 'heal' ? e.amount : 0), 0)
  const spec = statusSpecial(id, bearer, amount > 0 ? amount : undefined)
  const keeps = effects.length > 0 && effects.every((e) => e.type === 'applyStatus' && STATUSES[e.status].polarity === 'positive')
  return spec && bearer === 'defender' && keeps ? { ...spec, sign: 'plus' } : spec
}
