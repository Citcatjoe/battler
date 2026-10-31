import { useState, type CSSProperties } from 'react'
import { releaseParts } from '../game/combat'
import type { Character } from '../game/character'
import { describeSkill, DIE_FACES, faceTrigger, rollFace, triggerText, type CharacterEvent } from '../game/events'
import { auraIdsOf, auraOfSkill, STATUS_PLACE } from '../game/states'
import { STATUSES, type Status, type StatusId } from '../game/statuses'
import type { SkillPulse, SkillSignal } from '../game/staging'
import { NBSP } from '../game/typography'
import { ForgeFaceTooltip } from './ForgeFaceTooltip'
import { Icon, skillIcon, STATUS_ICON, StatusIcon } from './Icon'
import { SkillSeal } from './SkillSeal'
import { ALIGN, DieFace, SkillTooltip } from './SkillDice'

interface Props {
  character: Character
  side: number
  /** Forme en cours (druide) : ses sceaux sont ceux de cette forme */
  form?: number
  /** Ses statuts : l'anneau de chaque aura tourne quand elle est active, les jauges d'une compétence s'y comptent */
  statuses: readonly Status[]
  /** Le dé de la face qui vient de sortir : le sceau de sa compétence s'allume */
  pulse?: SkillPulse
  /** Une aura de ce camp qui agit (Aura de poison, Aura de décoction) : son anneau s'allume */
  signal?: SkillSignal
  /** Les faces que montre le dé de ce camp pendant qu'il roule : le sceau de la face montrée s'allume brièvement */
  rolling?: readonly number[]
  /** Les faces où le dé de ce camp est tombé, tant qu'il reste posé : une face nue s'y allume */
  landed?: readonly number[]
  align?: 'left' | 'right'
}

/**
 * Ce que le personnage SAIT FAIRE, dans l'en-tête du combat (0.79.0, docs/STATUTS.md « Deux niveaux de lecture ») :
 * - les six faces de son dé, dans l'ordre (0.111.0, demande de l'utilisateur : tous ont un d6, toutes les faces sont
 *   là) : un sceau octogonal par compétence, avec la face du dé qui la déclenche en pastille ; éteint au repos, il
 *   s'allume quand sa face sort, et c'est de lui que part le signal vers la zone d'état de la cible. Une face nue est
 *   une case vide, éteinte, qui s'allume quand le dé tombe dessus ; une face dorée (forge), la même case sur fond d'or ;
 * - une face dont la compétence ne fait que poser une aura : le sceau rond d'une aura, au double contour d'or (.aura-seal,
 *   comme partout), à sa place, dont l'anneau
 *   tourne tant qu'elle est active (avec ses charges), éteint tant qu'elle ne l'est pas ; puis les compétences hors dé
 *   et les auras portées sans face (une relique, l'autre forme) ;
 * - ses règles de forme (druide), en médaillon fixe.
 * Ce qu'il SUBIT ou PORTE en ce moment est dans la zone d'état, au-dessus de lui (StatusTray).
 * `data-signal` : les points de départ des signaux d'activation (SignalLayer).
 */
export function SkillBar({ character, side, form = 0, statuses, pulse, signal, rolling, landed, align = 'left' }: Props) {
  const formId = character.forms?.[form].id
  const events = character.events.filter((e) => !e.form || e.form === formId)
  // Une face que la forme en cours laisse nue garde l'aura qu'y pose l'autre forme (retour du 2026-10-28 : l'aura de
  // Thaldrin reste sur le 1 en ours)
  const faces = Array.from({ length: DIE_FACES }, (_, k) => {
    const event = events.find((e) => e.trigger === faceTrigger(k + 1))
    const auraId = event ? auraOfSkill(event) : character.events.map((e) => (e.trigger === faceTrigger(k + 1) ? auraOfSkill(e) : undefined)).find(Boolean)
    return { face: k + 1, event, auraId }
  })
  // Les compétences hors dé (au début du combat ; aucune depuis le départ de l'Ouverture, 2026-10-27) qui ne posent pas
  // d'aura ont aussi leur sceau
  const offDice = events.filter((e) => rollFace(e.trigger) === undefined && !auraOfSkill(e))
  // Ses auras : celles qu'il peut poser, et toute aura qu'il porte (posée par une relique, ou par l'autre forme) ; celle
  // que pose une face prend la place de sa première face, les autres suivent
  const auras = [...new Set([...auraIdsOf(character), ...statuses.filter((s) => STATUS_PLACE[s.id].place === 'aura').map((s) => s.id)])]
  const onFace = new Map<StatusId, number>()
  for (const { face, auraId } of faces) if (auraId && !onFace.has(auraId)) onFace.set(auraId, face)
  const formRules = statuses.filter((s) => STATUS_PLACE[s.id].place === 'form')
  const tip = align === 'right' ? 'right' : 'left'
  const aura = (id: StatusId) => {
    const tally = STATUSES[id].tally
    return (
      <AuraToken
        key={id}
        side={side}
        id={id}
        character={character}
        status={statuses.find((s) => s.id === id)}
        tally={tally && statuses.find((s) => s.id === tally)}
        lit={auraLit(id, events, pulse, signal)}
        align={tip}
      />
    )
  }
  return (
    <ul className={`skill-bar flex items-start gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`} aria-label={`Compétences de ${character.name}`}>
      {faces.map(({ face, event, auraId }) => {
        if (auraId && onFace.get(auraId) === face) return aura(auraId)
        return (
          <Seal
            key={face}
            side={side}
            event={event}
            face={face}
            gild={character.gilded[face] ?? 0}
            statuses={statuses}
            lit={pulse?.face === face ? pulse.key : undefined}
            rolled={rolling?.includes(face)}
            landed={!event && landed?.includes(face)}
            align={tip}
          />
        )
      })}
      {offDice.map((e) => (
        <Seal key={e.id} side={side} event={e} statuses={statuses} align={tip} />
      ))}
      {auras.filter((id) => !onFace.has(id)).map(aura)}
      {formRules.map((s) => (
        <FormToken key={s.id} status={s} align={tip} />
      ))}
    </ul>
  )
}

/** Clé d'éclat d'une aura : sa face vient de sortir (la compétence qui la pose), ou elle agit d'elle-même. */
function auraLit(id: StatusId, events: readonly CharacterEvent[], pulse?: SkillPulse, signal?: SkillSignal): number | undefined {
  if (signal && signal.from === id) return signal.key + 100000
  if (!pulse) return undefined
  // Les compétences de la forme en cours seulement : l'ours qui sort un 3 ne pose pas l'Aura sauvage
  const posing = events.filter((e) => auraOfSkill(e) === id)
  return posing.some((e) => rollFace(e.trigger) === pulse.face) ? pulse.key : undefined
}

/**
 * Compte d'une compétence à jauges, sur son sceau : **le nombre de coups** que sa relâche produira (Rétribution ; retour
 * du 2026-10-28, A4, jamais les dégâts gardés, qui se lisent dans l'infobulle de la compétence). Lu dans le moteur
 * (`releaseParts`) ; une relâche en une seule perte (`per`, Onde de choc) montre ses PV (D11 du 2026-10-30 : jamais un
 * « 1 ») ; une compétence qui pose le statut sans le relâcher montre son `badge`.
 */
function sealCount(event: CharacterEvent, statuses: readonly Status[]): number | undefined {
  for (const effect of event.effects) {
    const id = effect.type === 'release' || effect.type === 'applyStatus' ? effect.status : undefined
    if (!id || !STATUS_PLACE[id].onSeal) continue
    const s = statuses.find((x) => x.id === id)
    if (effect.type === 'release') return effect.per !== undefined ? effect.per * (s?.slots?.filter((n) => n > 0).length ?? 0) : releaseParts(effect, s).length
    return s ? Number(STATUSES[id].badge(s)) || 0 : 0
  }
  return undefined
}

/**
 * Un sceau de la barre : une compétence (d'une face, ou hors dé), ou une face nue (`event` absent) : une case vide,
 * plus étroite, sans nom, éteinte, qui s'allume tant que le dé est posé dessus (`landed`) ; dorée, sur fond d'or.
 */
function Seal({
  side,
  event,
  face,
  gild = 0,
  statuses,
  lit: litNow,
  rolled,
  landed,
  align,
}: {
  side: number
  event?: CharacterEvent
  face?: number
  gild?: number
  statuses: readonly Status[]
  lit?: number
  rolled?: boolean
  landed?: boolean
  align: 'left' | 'right'
}) {
  const lit = useLastLit(litNow)
  const count = event && sealCount(event, statuses)
  const shown = rolled || landed ? 'is-rolled' : ''
  return (
    <li
      className={`skill-bar-slot group relative flex ${event ? 'w-[92px]' : 'w-[64px]'} flex-col items-center gap-3 hover:z-[70]`}
      data-gild={gild ? '' : undefined}
    >
      <div className="relative" data-signal={event ? `${side}:${event.id}` : undefined}>
        {lit !== undefined && <Ding lit={lit} />}
        <div key={lit !== undefined ? `flash-${lit}` : 'idle'} className={`skill-bar-face cursor-help ${lit !== undefined ? 'is-lit' : ''} ${shown}`}>
          {event ? <SkillSeal id={event.id} size={56} /> : <span aria-label={`Face ${face}`} className="skill-seal skill-bar-bare" style={{ width: 56, height: 56 }} />}
        </div>
        {face !== undefined && (
          <span className="absolute -bottom-2 -right-2.5 z-[1]">
            <DieFace face={face} empty={!event && !shown} />
          </span>
        )}
        {count !== undefined && <Count text={String(count)} />}
      </div>
      {event && <span key={lit !== undefined ? `name-${lit}` : 'name'} className={`skill-bar-name ${lit !== undefined ? 'is-lit' : ''}`}>{event.name}</span>}
      {event ? (
        <SkillTooltip event={event} face={face} placement="below" align={align} />
      ) : (
        face !== undefined && <ForgeFaceTooltip face={{ face, origin: [], gild, rank: 0 }} placement="below" align={align} />
      )}
    </li>
  )
}

function AuraToken({
  side,
  id,
  character,
  status,
  tally,
  lit: litNow,
  align,
}: {
  side: number
  id: StatusId
  character: Character
  status?: Status
  /** Son compteur (`StatusDef.tally`), s'il en porte un : l'anneau le montre au lieu de son chiffre */
  tally?: Status
  lit?: number
  align: 'left' | 'right'
}) {
  const lit = useLastLit(litNow)
  const def = STATUSES[id]
  const posing = character.events.filter((e) => auraOfSkill(e) === id)
  const onFace = posing.map((e) => rollFace(e.trigger)).find((f) => f !== undefined)
  const icon = posing.length > 0 ? skillIcon(posing.find((e) => rollFace(e.trigger) !== undefined) ?? posing[0]) : STATUS_ICON[id]
  const active = status !== undefined
  // Le signal part de l'aura elle-même, et de chacune des compétences qui la posent
  const anchors = [id, ...posing.map((e) => e.id)].map((x) => `${side}:${x}`).join(' ')
  return (
    <li className="group relative flex w-[92px] flex-col items-center gap-3 hover:z-[70]" data-active={active} style={{ '--pulse': def.look?.aura } as CSSProperties}>
      <div className="relative" data-signal={anchors}>
        {lit !== undefined && <Ding lit={lit} round />}
        <div
          key={lit !== undefined ? `flash-${lit}` : 'idle'}
          className={`skill-bar-aura aura-seal h-14 w-14 cursor-help ${active ? 'aura-token' : 'is-idle'} ${lit !== undefined ? 'is-lit' : ''}`}
          style={{ '--aura': def.look?.aura, '--s': 56 } as CSSProperties}
        >
          {icon ? <Icon name={icon} className="h-[80%] w-[80%]" /> : <StatusIcon id={id} className="h-[80%] w-[80%]" />}
        </div>
        {onFace !== undefined && (
          <span className="absolute -bottom-2 -right-2.5 z-[1]">
            <DieFace face={onFace} empty={false} />
          </span>
        )}
        {/* Son effet du moment (« +4 ») : l'aura se lit ici, elle ne se relaie pas dans la zone d'état (0.79.7) ; une
            aura regroupée (D11) montre son compteur */}
        {status && auraCount(status, tally) && <Count text={auraCount(status, tally)!} aura />}
      </div>
      <span key={lit !== undefined ? `name-${lit}` : 'name'} className={`skill-bar-name ${active ? 'is-active' : ''} ${lit !== undefined ? 'is-lit' : ''}`}>{def.name}</span>
      <div
        role="tooltip"
        className={`pointer-events-none invisible absolute top-full z-[70] mt-3 w-80 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-4 py-3 text-left opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover:visible group-hover:opacity-100 ${ALIGN[align]}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-lg font-extrabold leading-tight text-ink-1">{def.name}</span>
          <span className="shrink-0 rounded-(--r-xs) border border-line-2 bg-ink-1/10 px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider text-ink-1">
            {active ? 'Aura active' : 'Aura'}
          </span>
        </div>
        <p className="mt-1.5 font-body text-[15px] leading-snug text-ink-1">{active ? def.describe(status) : def.summary}</p>
        {/* Les compétences qui la posent : leur face, les charges posées, leurs pastilles (relation au coup), et ce
            qu'elles font d'autre au passage (l'Aura d'immunité purge ses malus) */}
        {posing.map((e) => {
          const f = rollFace(e.trigger)
          const extra = e.effects.filter((x) => x.type !== 'applyStatus' || x.status !== id)
          const posed = e.effects.find((x) => x.type === 'applyStatus' && x.status === id)
          const stacks = posed?.type === 'applyStatus' ? posed.stacks : 0
          const notes = [
            f !== undefined ? `dé ${f}` : triggerText(e.trigger).short,
            stacks > 0 ? `+${stacks} charge${stacks > 1 ? 's' : ''}` : '',
            ...describeSkill(e).tags.filter((t) => t.rule !== 'auras' && t.rule !== 'max-stacks').map((t) => t.label),
          ].filter(Boolean)
          return (
            <p key={e.id} className="mt-1.5 font-body text-[13px] font-medium text-ink-3">
              Posée par {e.name} ({notes.join(', ')})
              {extra.length > 0 && `${NBSP}: ${describeSkill({ ...e, effects: extra }).text}`}
            </p>
          )
        })}
      </div>
    </li>
  )
}

/**
 * Le dernier déclenchement d'un sceau, retenu (0.80.2) : la barre ne reçoit que la dernière face sortie, et un sceau
 * qui la perdait (une autre compétence se déclenche) était coupé net, au milieu de son éclat. Il garde la clé de son
 * dernier éclat : son animation va au bout, jusqu'à retomber éteint, et repart seulement à son prochain déclenchement.
 */
function useLastLit(lit: number | undefined) {
  const [last, setLast] = useState(lit)
  if (lit !== undefined && lit !== last) setLast(lit)
  return lit ?? last
}

/**
 * Le tintement visuel d'une compétence qui se déclenche (0.79.8) : l'onde serrée autour du sceau, puis un éclat de
 * lumière bref qui part de lui et s'étend sur une grande partie de l'arène, avec un anneau fin qui file plus loin.
 * Au violet des compétences (ou à la couleur de l'aura) ; la clé relance l'éclat quand la même face ressort.
 */
function Ding({ lit, round }: { lit: number; round?: boolean }) {
  return (
    <>
      <span key={`wave-${lit}`} aria-hidden className={`skill-bar-wave ${round ? 'rounded-full' : ''}`} />
      <span key={`burst-${lit}`} aria-hidden className="skill-bar-burst" />
      <span key={`ring-${lit}`} aria-hidden className="skill-bar-ring" />
    </>
  )
}

/**
 * Valeur d'une aura active sur son anneau : son `badge` (« +4 ») ; rien pour une aura sans nombre (immunité : ∞). Une
 * aura regroupée (`StatusDef.tally`, D11 du 2026-10-30) montre son compteur : sa progression vers son seuil (« 2/3 »),
 * ou, sans seuil, le badge du compteur tant qu'il est là (les épines plantées).
 */
function auraCount(s: Status, tally?: Status): string | undefined {
  const counter = STATUSES[s.id].tally
  const at = counter && STATUSES[counter].threshold?.at
  const badge = at ? `${tally?.stacks ?? 0}/${at}` : tally ? STATUSES[tally.id].badge(tally) : STATUSES[s.id].badge(s)
  return /\d/.test(badge) ? badge : undefined
}

/** Pastille de compte, en haut à gauche d'un sceau : jauges d'une compétence, charges d'une aura (dorée). */
function Count({ text, aura }: { text: string; aura?: boolean }) {
  return (
    <span
      className={`absolute -left-2 -top-2 z-[1] flex h-7 min-w-7 items-center justify-center rounded-full border bg-stone-950 px-1.5 font-data text-[15px] font-bold leading-none tabular-nums ${
        aura ? 'border-amber-300/80 text-amber-100' : 'border-line-2 text-ink-1'
      }`}
    >
      {text}
    </span>
  )
}

/** Règle de forme (druide : Incantation, Force de l'ours) : ce que la forme fait de lui, sans durée ni charge. */
function FormToken({ status, align }: { status: Status; align: 'left' | 'right' }) {
  const def = STATUSES[status.id]
  return (
    <li className="group relative flex w-[92px] flex-col items-center gap-3 hover:z-[70]">
      <div className="relative h-14 w-14 cursor-help rounded-full border-2 border-line-2 bg-stone-950/80">
        <StatusIcon id={status.id} className="absolute inset-0.5 h-[calc(100%-4px)] w-[calc(100%-4px)]" />
        {/* Ce que la forme fait de lui (« +3 », « d3 ») */}
        <Count text={def.badge(status)} />
      </div>
      <span className="skill-bar-name">{def.name}</span>
      <div
        role="tooltip"
        className={`pointer-events-none invisible absolute top-full z-[70] mt-3 w-72 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-4 py-3 text-left opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover:visible group-hover:opacity-100 ${ALIGN[align]}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-lg font-extrabold leading-tight text-ink-1">{def.name}</span>
          <span className="shrink-0 rounded-(--r-xs) border border-line-2 bg-ink-1/10 px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider text-ink-1">
            Forme
          </span>
        </div>
        <p className="mt-1.5 font-body text-[15px] leading-snug text-ink-1">{def.summary}</p>
      </div>
    </li>
  )
}
