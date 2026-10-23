import { useEffect, useRef, type ReactNode } from 'react'
import { statusHome } from '../../game/catalog'
import type { Character } from '../../game/character'
import { DEFAULT_SKILL_NATURE, describeSkill, triggerText, type CharacterEvent, type SkillNature, type Target, type Trigger } from '../../game/events'
import type { Relic } from '../../game/relics'
import { RULES, type RuleId } from '../../game/rules'
import { STATUS_PLACE } from '../../game/states'
import { POLARITY_STYLE, STATUSES, type Polarity, type RuleLine, type StatusId } from '../../game/statuses'
import { Icon, skillIcon, StatusIcon } from '../Icon'
import { RelicSeal } from '../RelicSeal'
import type { CompendiumNav } from './sections'

/*
 * Petites pièces partagées par les sections du compendium : sceaux, pastilles de statut et de règle, et la ligne
 * d'une compétence (fiche d'un combattant, « posé par » d'un statut). Elles ne rédigent rien : le texte d'une
 * compétence vient de `describeSkill`, celui d'un statut de son registre. Une grammaire par objet, comme en
 * combat : un octogone peint pour une compétence, une pièce gravée pour un état, un hexagone pour une relique.
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

/** Ref de l'élément visé par un lien (`focus`) : il défile au centre de sa liste à chaque nouveau lien. */
export function useFocusRef<T extends HTMLElement = HTMLDivElement>(focus?: string) {
  const ref = useRef<T>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center' })
  }, [focus])
  return ref
}

/** Sceau rond d'un statut de la zone d'état : l'emblème de son état, liseré à sa polarité. */
export function StatusMedal({ id, size }: { id: StatusId; size: number }) {
  return (
    <span className="seal" data-tone={STATUSES[id].polarity} style={{ width: size, height: size }}>
      <StatusIcon id={id} className="h-full w-full" />
    </span>
  )
}

/** Sceau d'une compétence : l'octogone de la barre de compétences du combat, liseré à sa nature. */
export function SkillMedal({ event, size }: { event: CharacterEvent; size: number }) {
  return (
    <span className="skill-seal codex-skill-seal" data-nature={natureOf(event)} style={{ width: size, height: size }}>
      <Icon name={skillIcon(event)} className="h-[80%] w-[80%]" />
    </span>
  )
}

/** Déclencheurs d'une ligne : « dé 1 », « dés 1, 2, 3 » quand des faces identiques sont réunies, « hors kit » sans face. */
export function triggerShort(triggers: readonly Trigger[]) {
  if (triggers.length === 0) return 'hors kit'
  if (triggers.length === 1) return triggerText(triggers[0]).short
  return `dés ${triggers.map((t) => triggerText(t).short.replace('dé ', '')).join(', ')}`
}

/** « Compétence d'adresse · sur un 1 au dé » : nature et déclencheur en toutes lettres. */
export function skillLine(event: CharacterEvent) {
  return `Compétence ${NATURE_OF[natureOf(event)]} · ${triggerText(event.trigger).label.toLowerCase()}`
}

const TARGET_WORD: Record<Target, string> = { self: 'sur soi', opponent: 'adversaire' }

/**
 * Pastille d'un statut posé. Un statut de la zone d'état mène à sa fiche dans Statuts (emblème, bonus ou malus,
 * cible). Une aura ou un mécanisme mène à la compétence à qui il appartient, sous son sceau ; rien quand c'est
 * cette compétence même qui le pose (`from`) : sa fiche le dit déjà.
 */
export function StatusChip({ status, target, nav, from }: { status: StatusId; target?: Target; nav: CompendiumNav; from?: CharacterEvent }) {
  const home = statusHome(status)
  if (home?.kind === 'skill') {
    if (from?.name === home.event.name) return null
    return (
      <button type="button" className="codex-chip" onClick={() => nav.go({ section: 'skills', id: home.event.id })}>
        <SkillMedal event={home.event} size={26} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-body text-[15px] font-bold text-ink-1">{home.event.name}</span>
          <span className="block font-body text-[13px] text-ink-3">
            {STATUS_PLACE[status].place === 'aura' ? 'aura' : 'mécanisme'}
            {target && ` · ${TARGET_WORD[target]}`}
          </span>
        </span>
      </button>
    )
  }
  if (home?.kind !== 'sheet') return null
  const { name, polarity } = STATUSES[status]
  return (
    <button type="button" className="codex-chip" data-tone={polarity} onClick={() => nav.go({ section: 'statuses', id: status })}>
      <StatusMedal id={status} size={26} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-body text-[15px] font-bold text-ink-1">{name}</span>
        <span className="block font-body text-[13px] text-ink-3">
          <span className={POLARITY_TEXT[polarity]}>{POLARITY_STYLE[polarity].label.toLowerCase()}</span>
          {target && ` · ${TARGET_WORD[target]}`}
        </span>
      </span>
    </button>
  )
}

/** Pastilles d'une compétence (relation au coup, conditions…) : chacune mène à la règle commune qu'elle cite. */
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
export function SkillSummary({ event, triggers = [event.trigger], form, nav }: { event: CharacterEvent; triggers?: readonly Trigger[]; form?: string; nav: CompendiumNav }) {
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
        {posed.map((p) => (
          <StatusChip key={p.status} status={p.status} target={p.target} nav={nav} from={event} />
        ))}
      </div>
    </div>
  )
}

/** Une relique qui pose un statut : son sceau, son nom (lien vers Reliques), sa cible. */
export function RelicSource({ relic, target, nav }: { relic: Relic; target: Target; nav: CompendiumNav }) {
  return (
    <div className="flex items-center gap-3 border-b border-line-1 py-2.5">
      <RelicSeal relic={relic} size={48} />
      <div className="min-w-0 flex-1">
        <button type="button" className="codex-link font-display text-[17px] font-bold" onClick={() => nav.go({ section: 'relics', id: relic.id })}>
          {relic.name}
        </button>
        <p className="font-body text-[14px] text-ink-3">Relique{target === 'opponent' ? " · sur l'adversaire" : ' · sur soi'}</p>
      </div>
    </div>
  )
}

/** Une phrase de la fiche, suivie du lien vers la règle commune qu'elle applique. */
export function Line({ line, nav }: { line: RuleLine; nav: CompendiumNav }) {
  return (
    <p>
      {line.text}
      {line.rule && (
        <>
          {' '}
          <RuleLink nav={nav} id={line.rule} />
        </>
      )}
    </p>
  )
}

/** Lien vers une règle commune, par son titre (« Cumulable », « Durée »). */
export function RuleLink({ nav, id }: { nav: CompendiumNav; id: RuleId }) {
  return (
    <button type="button" className="codex-link self-start text-left" onClick={() => nav.go({ section: 'rules', id })}>
      {RULES[id].title} →
    </button>
  )
}
