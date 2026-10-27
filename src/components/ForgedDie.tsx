import { useState } from 'react'
import type { Character } from '../game/character'
import { DEFAULT_SKILL_NATURE, describeSkill, DIE_FACES, type CharacterEvent } from '../game/events'
import {
  FORGE_OPS,
  TEMPER_BONUS,
  copyDestinations,
  forgedFaces,
  forgeState,
  GILD_BONUS,
  offerTargets,
  rankLabel,
  stepLabel,
  stepOf,
  type ForgeBase,
  type ForgeOffer,
  type ForgeStep,
  withForgeStep,
  writtenFace,
} from '../game/forge'
import { MASTERIES, masteryOfSkill } from '../game/masteries'
import { of } from '../game/narration'
import { ForgeFaceTooltip } from './ForgeFaceTooltip'
import { MasteryIcon } from './Icon'
import { SkillSeal } from './SkillSeal'
import { SkillTooltip } from './SkillDice'
import { useTipLayer } from './TipLayer'

/*
 * Le dé forgé (campagne, saison forgée ; docs/CAMPAGNE.md § 4) : toutes ses faces, lisibles de loin, sans texte. Une face
 * qui porte une compétence montre son sceau (liseré de sa nature), une gravure a le liseré violet des runes, une dorure
 * la plaque d'or, un rang son chiffre romain ; une face d'attente (l'ogre) est éteinte. Aucune règle ici : tout vient de
 * forge.ts.
 */

/** Côté d'une tuile et de son sceau ; `xs` : l'aperçu de l'arbre du tournoi, sans cartouche (la place dit la face) */
const TILE = { xs: 20, sm: 40, md: 52 } as const
const SEAL = { xs: 16, sm: 32, md: 40 } as const

export function ForgedDie({
  character,
  size = 'md',
  tooltip = 'above',
  align = 'left',
  targets,
  selected,
  onPick,
  preview,
  counts,
}: {
  character: Character
  size?: keyof typeof TILE
  tooltip?: 'above' | 'below'
  align?: 'left' | 'center' | 'right'
  /** Choix d'une face (forge) : les faces visables s'allument, les autres s'éteignent */
  targets?: readonly number[]
  /** Les faces retenues (la face choisie ; pour une copie, son origine et sa destination) */
  selected?: readonly number[]
  onPick?: (face: number) => void
  /** L'opération en cours de choix, sur une face visée : son infobulle montre ce que la face deviendrait (avant → après) */
  preview?: (face: number) => ForgeStep | undefined
  /** Écrans de fin : combien de fois chaque face est tombée (`counts[0]` : la face 1), sous sa tuile */
  counts?: readonly number[]
}) {
  const faces = forgedFaces(character.definition, character.forge)
  return (
    <ul className={`flex flex-wrap ${size === 'xs' ? 'gap-0.5' : 'gap-1.5'}`} aria-label={`Dé de ${character.name} : d${faces.length}`}>
      {faces.map((f) => {
        const skill = f.engraved ?? f.origin[0]
        const target = targets?.includes(f.face)
        const step = target ? preview?.(f.face) : undefined
        const next = step ? forgedFaces(character.definition, withForgeStep(character.definition, character.forge, step))[f.face - 1] : undefined
        return (
          <li key={f.face} className="group relative hover:z-[70]">
            <button
              type="button"
              disabled={!target}
              aria-pressed={target ? !!selected?.includes(f.face) : undefined}
              aria-label={`Face ${f.face}`}
              onClick={() => target && onPick?.(f.face)}
              className="forge-face"
              data-size={size}
              data-nature={skill ? (skill.nature ?? DEFAULT_SKILL_NATURE) : undefined}
              data-engraved={f.engraved ? '' : undefined}
              data-gild={f.gild ? '' : undefined}
              data-target={target ? '' : undefined}
              data-off={targets && !target ? '' : undefined}
              style={{ width: TILE[size], height: TILE[size] }}
            >
              {skill ? <SkillSeal id={skill.id} size={SEAL[size]} /> : f.face}
              {skill && size !== 'xs' && <span className="forge-face-num">{f.face}</span>}
              {f.rank > 0 && <span className="forge-face-rank">{rankLabel(f.rank)}</span>}
            </button>
            {/* Une face sans compétence, dorée, ou en aperçu de forge : son infobulle de face ; sinon celle de sa compétence */}
            {skill && !f.gild && !next ? (
              <SkillTooltip event={skill} face={f.face} placement={tooltip} align={align} />
            ) : (
              <ForgeFaceTooltip face={f} next={next} placement={tooltip} align={align} />
            )}
            {counts && <span className="mt-1 block text-center font-mono text-[15px] font-bold tabular-nums text-ink-1">×{counts[f.face - 1] ?? 0}</span>}
          </li>
        )
      })}
    </ul>
  )
}

/** L'image d'une opération de forge, en grand sur sa carte : le sceau gravé, l'or, le chiffre romain, la copie, la refonte. */
function OpPlate({ op, skill, size = 96 }: { op: ForgeStep['op']; skill?: CharacterEvent; size?: number }) {
  return (
    <span
      className="forge-face shrink-0"
      data-size="lg"
      data-engraved={op === 'engrave' ? '' : undefined}
      data-gild={op === 'gild' ? '' : undefined}
      style={{ width: size, height: size }}
    >
      {op === 'engrave' ? skill && <SkillSeal id={skill.id} size={56} /> : OP_TEXT[op]}
    </span>
  )
}

/** La maîtrise d'une compétence à graver, son emblème et son nom (rien hors maîtrise : une compétence du boss). */
function SkillMastery({ skill }: { skill: CharacterEvent }) {
  const id = masteryOfSkill(skill.id)
  if (!id) return null
  const { name } = MASTERIES[id]
  return (
    <span className="flex items-center gap-1.5 font-body text-[14px] font-bold uppercase tracking-[0.12em] text-gold-300">
      <MasteryIcon id={id} name={name} className="h-6 w-6 text-[13px]" />
      {name}
    </span>
  )
}

/**
 * Carte d'une opération de forge à choisir (récompense de campagne, héritage) : son image, son nom, sa règle, et pour
 * Graver ce que fait la compétence et sa maîtrise. Graver à deux compétences (une par maîtrise, docs/MAITRISES.md
 * § 6.2) : la carte s'élargit et montre les deux côte à côte ; choisir l'une choisit la carte (`onSelect(skill)`).
 * `mark` : bandeau au-dessus de la carte (« Choix de Gorak »), comme RelicCard.
 */
export function ForgeCard({
  offer,
  character,
  selected,
  skill,
  mark,
  onSelect,
}: {
  offer: ForgeOffer | ForgeStep
  character: Character
  selected: boolean
  /** Graver à deux compétences : celle retenue */
  skill?: string
  mark?: string
  onSelect: (skill?: string) => void
}) {
  const op = FORGE_OPS[offer.op]
  const skills = offer.op !== 'engrave' ? [] : 'skill' in offer ? [offer.skill] : offer.skills
  // Une copie : sa face d'origine, puis sa destination (une copie d'avant la 0.111.0 n'a que son origine)
  const where = !('face' in offer) ? '' : offer.op === 'copy' && offer.to !== undefined ? `Face ${offer.face} → ${offer.to}` : `Face ${offer.face}`
  if (skills.length > 1)
    return (
      <div className="relic-card relic-card-split" data-selected={selected ? '' : undefined} role="group" aria-label={op.name}>
        {mark && <span className="relic-card-mark">{mark}</span>}
        <span className="rounded-(--r-xs) border border-gold-500/60 bg-gold-500/15 px-2 py-px font-body text-[13px] font-bold uppercase tracking-[0.2em] text-gold-300">{op.name}</span>
        <div className="flex w-full flex-1 items-stretch gap-3">
          {skills.map((s) => (
            <button key={s.id} type="button" className="forge-card-half" aria-pressed={selected && skill === s.id} onClick={() => onSelect(s.id)}>
              <OpPlate op="engrave" skill={s} size={84} />
              <span className="font-display text-[22px] font-extrabold leading-tight text-ink-1">{s.name}</span>
              <SkillMastery skill={s} />
              <span className="font-body text-[16px] leading-snug text-ink-1">{describeSkill(s).text}</span>
            </button>
          ))}
        </div>
        <span className="font-body text-[14px] italic leading-snug text-ink-3">{op.summary}</span>
      </div>
    )
  const engraved = skills[0]
  return (
    <button type="button" className="relic-card" aria-pressed={selected} onClick={() => onSelect(engraved?.id)}>
      {mark && <span className="relic-card-mark">{mark}</span>}
      <OpPlate op={offer.op} skill={engraved} />
      <span className="font-display text-[26px] font-extrabold leading-tight text-ink-1">{engraved ? engraved.name : op.name}</span>
      <span className="rounded-(--r-xs) border border-gold-500/60 bg-gold-500/15 px-2 py-px font-body text-[13px] font-bold uppercase tracking-[0.2em] text-gold-300">
        {engraved ? op.name : 'Forge du dé'}
      </span>
      {engraved && <SkillMastery skill={engraved} />}
      {where && <span className="font-body text-[15px] font-bold text-gold-300">{where}</span>}
      <span className="font-body text-[18px] leading-snug text-ink-1">{engraved ? describeSkill(engraved).text : op.summary}</span>
      {engraved && <span className="mt-auto font-body text-[14px] italic leading-snug text-ink-3">{op.summary}</span>}
    </button>
  )
}

/** Un choix de forge en cours : l'offre, le choix du combattant, l'opération et la face retenues, et ce qui en découle. */
export interface ForgeChoiceState {
  offer: readonly ForgeOffer[]
  /** Index de l'opération choisie par le combattant (−1 sans offre) */
  autoIndex: number
  /** La compétence que le combattant a choisi de graver (Graver à deux compétences, une par maîtrise) */
  autoSkill: string | undefined
  index: number
  /** La compétence retenue sur la carte Graver (la première, tant qu'on n'en a pas choisi une autre) */
  skill: string | undefined
  /** Retient une opération ; pour Graver, la compétence choisie parmi les siennes */
  select: (index: number, skill?: string) => void
  picked: ForgeOffer | undefined
  /** Faces cliquables sur le dé : celles que l'opération retenue peut viser ; pour une copie, ses origines et, une fois
   * l'origine choisie, ses destinations (vide pour Tremper l'arme) */
  targets: number[]
  /** Faces retenues : la face visée ; pour une copie, son origine et sa destination */
  selected: number[]
  pick: (face: number) => void
  /** Ce que deviendrait une face visée (aperçu), quand l'opération y est complète */
  preview: (face: number) => ForgeStep | undefined
  /** Ce que le dé demande : la face, l'origine ou la destination d'une copie, puis l'opération en clair */
  prompt: string
  ready: boolean
  /** L'opération prête, ou undefined tant qu'il manque sa face (ou sans offre) */
  step: ForgeStep | undefined
}

/**
 * Le choix d'une forge en cours (récompense) : l'opération retenue parmi l'offre (pour Graver, l'une de ses
 * compétences), puis sa face ; pour Copier une face, la face à copier, puis la face libre où la poser (0.111.0). Le
 * combattant a déjà choisi (`auto`).
 */
export function useForgeChoice(character: Character, offer: readonly ForgeOffer[], auto?: ForgeStep): ForgeChoiceState {
  const { definition: base, forge } = character
  const autoIndex = auto ? offer.findIndex((o) => o.op === auto.op) : -1
  const autoSkill = auto?.op === 'engrave' ? auto.skill.id : undefined
  const autoFace = auto && 'face' in auto ? auto.face : undefined
  // Une copie enregistrée avant la 0.111.0 (sans destination) : la destination que la règle d'alors prenait
  const autoTo = auto?.op === 'copy' ? writtenFace(base, forge, auto) : undefined
  const [index, setIndex] = useState(autoIndex)
  const [skillId, setSkillId] = useState(autoSkill)
  const [face, setFace] = useState(autoFace)
  const [to, setTo] = useState(autoTo)
  const picked = offer[index]
  const skill = picked?.op === 'engrave' ? (picked.skills.find((s) => s.id === skillId) ?? picked.skills[0]) : undefined
  const aimed = picked ? offerTargets(base, forge, picked) : []
  const copying = picked?.op === 'copy'
  const destinations = copying && face !== undefined && aimed.includes(face) ? copyDestinations(base, forge, face) : []
  const ready = !picked || !FORGE_OPS[picked.op].targeted || (face !== undefined && aimed.includes(face) && (!copying || (to !== undefined && destinations.includes(to))))
  const step = picked && ready ? stepOf(picked, face, to, skill) : undefined
  const prompt =
    !picked || aimed.length === 0
      ? `Son dé · d${DIE_FACES}`
      : step
        ? stepLabel(step)
        : !copying
          ? 'Choisissez la face'
          : face === undefined
            ? 'Choisissez la face à copier'
            : 'Choisissez où la copier'
  return {
    offer,
    autoIndex,
    autoSkill,
    index,
    skill: skill?.id,
    select: (i: number, s?: string) => {
      // Une autre compétence de la même carte Graver garde la face visée
      if (i !== index) {
        setFace(i === autoIndex ? autoFace : undefined)
        setTo(i === autoIndex ? autoTo : undefined)
      }
      setIndex(i)
      setSkillId(s)
    },
    picked,
    targets: [...aimed, ...destinations],
    selected: [face, copying ? to : undefined].filter((f): f is number => f !== undefined),
    pick: (f: number) => {
      // Les origines d'une copie portent une compétence, ses destinations n'en portent pas : les deux ne se confondent pas
      if (destinations.includes(f)) return setTo(f)
      setFace(f)
      setTo(undefined)
    },
    preview: (f: number) => {
      if (!picked) return undefined
      if (!copying) return stepOf(picked, f, undefined, skill)
      return destinations.includes(f) ? stepOf(picked, face, f) : undefined
    },
    prompt,
    ready,
    step,
  }
}

/** Le corps d'une récompense de forge : les opérations proposées en cartes, puis la face visée sur le dé. */
export function ForgeChoice({ character, choice }: { character: Character; choice: ForgeChoiceState }) {
  const { targets } = choice
  return (
    <>
      <div className="flex items-stretch gap-8 pt-3">
        {choice.offer.map((o, i) => {
          // Le choix du combattant : sa carte, et sur une carte Graver à deux compétences, la sienne
          const own = i === choice.autoIndex && (choice.index !== i || o.op !== 'engrave' || choice.skill === choice.autoSkill)
          return (
            <ForgeCard
              key={o.op}
              offer={o}
              character={character}
              selected={choice.index === i}
              skill={choice.index === i ? choice.skill : undefined}
              mark={own ? `Choix ${of(character.name)}` : choice.index === i ? 'Votre choix' : undefined}
              onSelect={(skill) => choice.select(i, skill)}
            />
          )
        })}
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-ink-3">{choice.prompt}</span>
        <ForgedDie
          character={character}
          tooltip="above"
          align="center"
          targets={targets.length ? targets : undefined}
          preview={choice.preview}
          selected={choice.selected}
          onPick={choice.pick}
        />
      </div>
    </>
  )
}

/** Le signe d'une opération sans sceau, sur sa tuile : l'or de la dorure, le rang, la copie, la trempe. */
const OP_TEXT: Record<Exclude<ForgeStep['op'], 'engrave'>, string> = { gild: `+${GILD_BONUS}`, sharpen: 'II', copy: '×2', temper: `+${TEMPER_BONUS}` }

/** La tuile d'une opération déjà faite : le sceau gravé, l'or de la dorure, le rang, la copie, la trempe. */
function StepTile({ step, size }: { step: ForgeStep; size: number }) {
  const text = step.op === 'engrave' ? undefined : OP_TEXT[step.op]
  return (
    <span
      className="forge-face shrink-0"
      data-size="xs"
      data-engraved={step.op === 'engrave' ? '' : undefined}
      data-gild={step.op === 'gild' ? '' : undefined}
      style={{ width: size, height: size }}
    >
      {/* Le sceau tient dans la tuile, liseré des runes compris : 22 px dans la tuile de 26 du classement de saison */}
      {step.op === 'engrave' ? <SkillSeal id={step.skill.id} size={size < 32 ? 22 : 32} /> : text}
    </span>
  )
}

/**
 * Infobulle d'une opération de forge déjà faite, au modèle de SkillTooltip et RelicTooltip : la tuile et le nom de
 * l'opération, la face (ou la taille du dé avant → après), la règle de l'opération (FORGE_OPS), puis la compétence
 * gravée ou aiguisée telle qu'elle est sortie de la forge, rang compris (forgedFaces, describeSkill).
 */
function ForgeTooltip({ base, steps, index, placement }: { base: ForgeBase; steps: readonly ForgeStep[]; index: number; placement: 'below' | 'floating' }) {
  const step = steps[index]
  const after = steps.slice(0, index + 1)
  // La face que l'opération a changée : pour une copie, sa destination
  const written = writtenFace(base, steps.slice(0, index), step)
  const face = written === undefined ? undefined : forgedFaces(base, after).find((f) => f.face === written)
  const skills = !face ? [] : step.op === 'engrave' ? (face.engraved ? [face.engraved] : []) : [...(face.engraved ? [face.engraved] : []), ...face.origin]
  const badge = written !== undefined ? `Dé ${written}` : `Attaque +${forgeState(base, after).temper - forgeState(base, steps.slice(0, index)).temper}`
  const position = placement === 'floating' ? '' : 'pointer-events-none invisible absolute left-0 top-full z-[70] mt-3 opacity-0 transition-opacity duration-150 group-hover/forge:visible group-hover/forge:opacity-100'
  return (
    <div role="tooltip" className={`w-80 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-4 py-3 text-left shadow-(--shadow-2) ${position}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-display text-lg font-extrabold leading-tight text-ink-1">
          <StepTile step={step} size={40} />
          {FORGE_OPS[step.op].name}
        </span>
        <span className="shrink-0 rounded-(--r-xs) border border-arcane/60 bg-arcane/15 px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider text-arcane">
          {badge}
        </span>
      </div>
      <p className="mt-0.5 font-body text-[13px] font-medium text-arcane">Forge du dé · {stepLabel(step)}</p>
      <div className="codex-divider my-2.5" />
      <p className="font-body text-[15px] leading-snug text-ink-1">{FORGE_OPS[step.op].summary}</p>
      {skills.map((skill) => {
        const { text, tags } = describeSkill(skill)
        return (
          <div key={skill.id} className="mt-2.5">
            <p className="flex items-center gap-2 font-display text-[16px] font-bold leading-tight text-ink-1">
              <SkillSeal id={skill.id} size={32} />
              {skill.name}
            </p>
            {tags.length > 0 && <p className="mt-0.5 font-body text-[13px] font-medium text-arcane">{tags.map((t) => t.label).join(' · ')}</p>}
            {text && <p className="mt-1 font-body text-[14px] leading-snug text-ink-2">{text}</p>}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Une opération de forge déjà faite, en petite tuile (classement de saison) : `steps[index]` dans le journal de forge
 * du combattant (`base` : sa définition), pour que l'infobulle dise ce qu'elle a produit à ce moment-là. Dans un
 * TipLayer, l'infobulle s'ouvre dans le calque (rien ne la coupe), sinon en place, comme RelicRow.
 */
export function ForgeMark({ base, steps, index, size = 34 }: { base: ForgeBase; steps: readonly ForgeStep[]; index: number; size?: number }) {
  const tip = useTipLayer()
  return (
    <span
      className="group/forge relative shrink-0 cursor-help hover:z-[70]"
      aria-label={stepLabel(steps[index])}
      onMouseEnter={tip ? (e) => tip(<ForgeTooltip base={base} steps={steps} index={index} placement="floating" />, e.currentTarget) : undefined}
      onMouseLeave={tip ? () => tip(null) : undefined}
    >
      <StepTile step={steps[index]} size={size} />
      {!tip && <ForgeTooltip base={base} steps={steps} index={index} placement="below" />}
    </span>
  )
}
