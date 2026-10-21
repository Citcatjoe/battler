import { useEffect, useRef, type ReactNode } from 'react'
import type { Character } from '../../game/character'
import { DEFAULT_SKILL_NATURE, describeSkill, TRIGGERS, type CharacterEvent, type SkillNature, type Target, type Trigger } from '../../game/events'
import { RULES } from '../../game/rules'
import { POLARITY_STYLE, STATUSES, type Polarity, type StatusId } from '../../game/statuses'
import { Icon, skillIcon, StatusIcon } from '../Icon'
import type { CompendiumNav } from './sections'

/*
 * Petites pièces partagées par les sections du compendium : sceaux ronds, pastilles de statut et de règle, et la
 * ligne d'une compétence (fiche d'un combattant, « posé par » d'un statut). Elles ne rédigent rien : le texte
 * d'une compétence vient de `describeSkill`, celui d'un statut de son registre.
 */

export const NATURE_LABEL: Record<SkillNature, string> = {
  martial: 'Martiale',
  finesse: 'Adresse',
  arcane: 'Arcane',
  neutral: 'Neutre',
}

/** « de » suivi de la nature : « Compétence d'adresse » */
const NATURE_OF: Record<SkillNature, string> = {
  martial: 'martiale',
  finesse: "d'adresse",
  arcane: 'arcane',
  neutral: 'neutre',
}

const POLARITY_TEXT: Record<Polarity, string> = { positive: 'text-good', negative: 'text-bad' }

/** Nom de la forme qu'exige une compétence (personnage à formes), pour sa pastille. */
export const formName = (character: Character, event: CharacterEvent) =>
  event.form ? character.forms?.find((f) => f.id === event.form)?.name : undefined

export const natureOf = (e: CharacterEvent) => e.nature ?? DEFAULT_SKILL_NATURE

/** « Orc » → « Orcs », « Mort-vivant » → « Morts-vivants ». */
export const racePlural = (race: string) =>
  race
    .split('-')
    .map((w) => `${w}s`)
    .join('-')

/** Ref de l'élément visé par un lien (`focus`) : il défile au centre de sa liste à chaque nouveau lien. */
export function useFocusRef<T extends HTMLElement = HTMLDivElement>(focus?: string) {
  const ref = useRef<T>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center' })
  }, [focus])
  return ref
}

/** Sceau rond d'un statut, liseré à sa polarité. */
export function StatusMedal({ id, size }: { id: StatusId; size: number }) {
  return (
    <span className="seal" data-tone={STATUSES[id].polarity} style={{ width: size, height: size }}>
      <StatusIcon id={id} className="h-full w-full" />
    </span>
  )
}

/** Sceau rond d'une compétence, liseré à sa nature. */
export function SkillMedal({ event, size }: { event: CharacterEvent; size: number }) {
  return (
    <span className="seal" data-tone={natureOf(event)} style={{ width: size, height: size }}>
      <Icon name={skillIcon(event)} className="h-full w-full" />
    </span>
  )
}

/** Déclencheurs d'une ligne : « dé 1 », ou « dés 1, 2, 3 » quand des faces identiques sont réunies. */
export function triggerShort(triggers: readonly Trigger[]) {
  if (triggers.length === 1) return TRIGGERS[triggers[0]].short
  return `dés ${triggers.map((t) => TRIGGERS[t].short.replace('dé ', '')).join(', ')}`
}

/** « Compétence d'adresse · sur un 1 au dé de dégâts » : nature et déclencheur en toutes lettres. */
export function skillLine(event: CharacterEvent) {
  return `Compétence ${NATURE_OF[natureOf(event)]} · ${TRIGGERS[event.trigger].label.toLowerCase()}`
}

const TARGET_WORD: Record<Target, string> = { self: 'sur soi', opponent: 'adversaire' }

/** Pastille d'un statut posé (nom, polarité, cible) : un lien vers sa fiche dans Statuts. */
export function StatusChip({ status, target, nav }: { status: StatusId; target?: Target; nav: CompendiumNav }) {
  const def = STATUSES[status]
  return (
    <button type="button" className="codex-chip" data-tone={def.polarity} onClick={() => nav.go({ section: 'statuses', id: status })}>
      <StatusMedal id={status} size={26} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-body text-[15px] font-bold text-ink-1">{def.name}</span>
        <span className="block font-body text-[13px] text-ink-3">
          <span className={POLARITY_TEXT[def.polarity]}>{POLARITY_STYLE[def.polarity].label.toLowerCase()}</span>
          {target && ` · ${TARGET_WORD[target]}`}
        </span>
      </span>
    </button>
  )
}

/** Pastilles d'une compétence (coup sacrifié, conditions…) : chacune mène à la règle commune qu'elle cite. */
export function SkillTags({ event, nav, form }: { event: CharacterEvent; nav: CompendiumNav; form?: string }) {
  const { tags } = describeSkill(event, form)
  if (tags.length === 0) return null
  return (
    <span className="mt-1 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <button key={t.label} type="button" className="codex-tag" title={RULES[t.rule].title} onClick={() => nav.go({ section: 'rules', id: t.rule })}>
          {t.label}
        </button>
      ))}
    </span>
  )
}

/** Encadré titré d'une fiche détaillée (Effet, Consommation, Cumul ; Quand, Effet d'une relique). */
export function CodexBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="codex-box flex flex-col gap-1.5 font-body text-[15px] leading-snug text-ink-2">
      <h3 className="codex-label">{title}</h3>
      {children}
    </section>
  )
}

/** Le nom d'un personnage, en lien vers sa fiche. */
export function CharacterLink({ character, nav, children }: { character: Character; nav: CompendiumNav; children?: ReactNode }) {
  return (
    <button type="button" className="codex-link font-body" onClick={() => nav.go({ section: 'characters', id: character.id })}>
      {children ?? character.name}
    </button>
  )
}

/**
 * Une compétence en résumé : sceau, nom (lien vers l'index des compétences), déclencheur, texte, pastilles et
 * statuts posés. Même texte que l'index et l'infobulle des dés (`describeSkill`).
 */
export function SkillSummary({
  event,
  triggers = [event.trigger],
  form,
  nav,
  aside,
}: {
  event: CharacterEvent
  triggers?: readonly Trigger[]
  form?: string
  nav: CompendiumNav
  /** Ce qui s'affiche à droite à la place des statuts posés (porteurs, dans « posé par ») */
  aside?: ReactNode
}) {
  const { text, posed } = describeSkill(event)
  return (
    <div className="flex items-start gap-3 border-b border-line-1 py-2.5 last:border-b-0">
      <SkillMedal event={event} size={42} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <button type="button" className="codex-link font-display text-[17px] font-bold" onClick={() => nav.go({ section: 'skills', id: event.id })}>
            {event.name}
          </button>
          <span className="font-data text-[13px] text-ink-3">{triggerShort(triggers)}</span>
        </div>
        <p className="font-body text-[15px] leading-snug text-ink-2">{text}</p>
        <SkillTags event={event} nav={nav} form={form} />
      </div>
      <div className="flex w-[210px] shrink-0 flex-col gap-1.5">
        {aside ?? posed.map((p) => <StatusChip key={p.status} status={p.status} target={p.target} nav={nav} />)}
      </div>
    </div>
  )
}
