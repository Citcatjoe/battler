import { useState } from 'react'
import type { Character } from '../game/character'
import { DEFAULT_SKILL_NATURE, describeSkill } from '../game/events'
import {
  ENLARGE_FACES,
  FORGE_OPS,
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
} from '../game/forge'
import { of } from '../game/narration'
import { ForgeFaceTooltip } from './ForgeFaceTooltip'
import { SkillSeal } from './SkillSeal'
import { SkillTooltip } from './SkillDice'
import { useTipLayer } from './TipLayer'

/*
 * Le dé forgé (campagne, saison forgée ; docs/CAMPAGNE.md § 4) : toutes ses faces, lisibles de loin, sans texte. Une face
 * qui porte une compétence montre son sceau (liseré de sa nature), une gravure a le liseré violet des runes, une dorure
 * la plaque d'or, un rang son chiffre romain ; une face d'attente (l'ogre) est éteinte. Aucune règle ici : tout vient de
 * forge.ts.
 */

const TILE = { sm: 40, md: 52 } as const

export function ForgedDie({
  character,
  size = 'md',
  tooltip = 'above',
  align = 'left',
  targets,
  selected,
  onPick,
  preview,
}: {
  character: Character
  size?: keyof typeof TILE
  tooltip?: 'above' | 'below'
  align?: 'left' | 'center' | 'right'
  /** Choix d'une face (forge) : les faces visables s'allument, les autres s'éteignent */
  targets?: readonly number[]
  selected?: number
  onPick?: (face: number) => void
  /** L'opération en cours de choix : l'infobulle d'une face visée montre ce qu'elle deviendrait (avant → après) */
  preview?: ForgeOffer
}) {
  const faces = forgedFaces(character.definition, character.forge)
  const twin = character.twinDice
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={`Dé de ${character.name} : d${faces.length}${twin ? ', deux dés' : ''}`}>
      {faces.map((f) => {
        const skill = f.engraved ?? f.origin[0]
        const target = targets?.includes(f.face)
        const next = preview && target ? forgedFaces(character.definition, withForgeStep(character.definition, character.forge, stepOf(preview, f.face)))[f.face - 1] : undefined
        return (
          <li key={f.face} className="group relative hover:z-[70]">
            <button
              type="button"
              disabled={!target}
              aria-pressed={target ? selected === f.face : undefined}
              aria-label={`${twin && skill ? 'Double' : 'Face'} ${f.face}`}
              onClick={() => target && onPick?.(f.face)}
              className="forge-face"
              data-size={size}
              data-nature={skill ? (skill.nature ?? DEFAULT_SKILL_NATURE) : undefined}
              data-engraved={f.engraved ? '' : undefined}
              data-gild={f.gild ? '' : undefined}
              data-idle={f.idle ? '' : undefined}
              data-target={target ? '' : undefined}
              data-off={targets && !target ? '' : undefined}
              style={{ width: TILE[size], height: TILE[size] }}
            >
              {skill ? <SkillSeal id={skill.id} size={size === 'md' ? 40 : 32} /> : f.face}
              {skill && <span className="forge-face-num">{f.face}</span>}
              {f.rank > 0 && <span className="forge-face-rank">{rankLabel(f.rank)}</span>}
            </button>
            {/* Une face sans compétence, dorée, ou en aperçu de forge : son infobulle de face ; sinon celle de sa compétence */}
            {skill && !f.gild && !next ? (
              <SkillTooltip event={skill} face={f.face} placement={tooltip} align={align} />
            ) : (
              <ForgeFaceTooltip face={f} next={next} twin={twin} placement={tooltip} align={align} />
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** L'image d'une opération de forge, en grand sur sa carte : le sceau gravé, l'or, le chiffre romain, la taille du dé. */
function OpPlate({ offer, character }: { offer: ForgeOffer | ForgeStep; character: Character }) {
  const faces = character.stats.damageDie
  const engraved = offer.op === 'engrave'
  const text = engraved ? undefined : { gild: `+${GILD_BONUS}`, sharpen: 'II', enlarge: `d${faces + ENLARGE_FACES}`, trim: `d${faces - 1}` }[offer.op]
  return (
    <span
      className="forge-face"
      data-size="lg"
      data-engraved={engraved ? '' : undefined}
      data-gild={offer.op === 'gild' ? '' : undefined}
      style={{ width: 96, height: 96 }}
    >
      {engraved ? <SkillSeal id={offer.skill.id} size={56} /> : text}
    </span>
  )
}

/**
 * Carte d'une opération de forge à choisir (récompense de campagne, héritage) : son image, son nom, sa règle, et pour
 * Graver ce que fait la compétence. `mark` : bandeau au-dessus de la carte (« Choix de Gorak »), comme RelicCard.
 */
export function ForgeCard({
  offer,
  character,
  selected,
  mark,
  onSelect,
}: {
  offer: ForgeOffer | ForgeStep
  character: Character
  selected: boolean
  mark?: string
  onSelect: () => void
}) {
  const op = FORGE_OPS[offer.op]
  const face = 'face' in offer ? offer.face : undefined
  const where = face === undefined ? '' : `${character.twinDice && offer.op !== 'gild' ? 'Double' : 'Face'} ${face}`
  return (
    <button type="button" className="relic-card" aria-pressed={selected} onClick={onSelect}>
      {mark && <span className="relic-card-mark">{mark}</span>}
      <OpPlate offer={offer} character={character} />
      <span className="font-display text-[26px] font-extrabold leading-tight text-ink-1">{offer.op === 'engrave' ? offer.skill.name : op.name}</span>
      <span className="rounded-(--r-xs) border border-gold-500/60 bg-gold-500/15 px-2 py-px font-body text-[13px] font-bold uppercase tracking-[0.2em] text-gold-300">
        {offer.op === 'engrave' ? op.name : 'Forge du dé'}
      </span>
      {where && <span className="font-body text-[15px] font-bold text-gold-300">{where}</span>}
      <span className="font-body text-[18px] leading-snug text-ink-1">{offer.op === 'engrave' ? describeSkill(offer.skill).text : op.summary}</span>
      {offer.op === 'engrave' && <span className="mt-auto font-body text-[14px] italic leading-snug text-ink-3">{op.summary}</span>}
    </button>
  )
}

/** Un choix de forge en cours : l'offre, le choix du combattant, l'opération et la face retenues, et ce qui en découle. */
export interface ForgeChoiceState {
  offer: readonly ForgeOffer[]
  /** Index de l'opération choisie par le combattant (−1 sans offre) */
  autoIndex: number
  index: number
  face: number | undefined
  setFace: (face: number) => void
  select: (index: number) => void
  picked: ForgeOffer | undefined
  /** Faces que l'opération retenue peut viser (vide pour Agrandir et Retailler) */
  targets: number[]
  ready: boolean
  /** L'opération prête, ou undefined tant qu'il manque sa face (ou sans offre) */
  step: ForgeStep | undefined
}

/** Le choix d'une forge en cours (récompense) : l'opération retenue parmi l'offre, puis sa face. Le combattant a déjà choisi (`auto`). */
export function useForgeChoice(character: Character, offer: readonly ForgeOffer[], auto?: ForgeStep): ForgeChoiceState {
  const autoIndex = auto ? offer.findIndex((o) => o.op === auto.op) : -1
  const autoFace = auto && 'face' in auto ? auto.face : undefined
  const [index, setIndex] = useState(autoIndex)
  const [face, setFace] = useState(autoFace)
  const picked = offer[index]
  const targets = picked ? offerTargets(character.definition, character.forge, picked) : []
  const ready = !picked || picked.op === 'enlarge' || picked.op === 'trim' || (face !== undefined && targets.includes(face))
  return {
    offer,
    autoIndex,
    index,
    face,
    setFace,
    select: (i: number) => {
      setIndex(i)
      setFace(i === autoIndex ? autoFace : undefined)
    },
    picked,
    targets,
    ready,
    step: picked && ready ? stepOf(picked, face) : undefined,
  }
}

/** Le corps d'une récompense de forge : les opérations proposées en cartes, puis la face visée sur le dé. */
export function ForgeChoice({ character, choice }: { character: Character; choice: ForgeChoiceState }) {
  const { picked, targets, face } = choice
  return (
    <>
      <div className="flex items-stretch gap-8 pt-3">
        {choice.offer.map((o, i) => (
          <ForgeCard
            key={o.op}
            offer={o}
            character={character}
            selected={choice.index === i}
            mark={i === choice.autoIndex ? `Choix ${of(character.name)}` : choice.index === i ? 'Votre choix' : undefined}
            onSelect={() => choice.select(i)}
          />
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-ink-3">
          {picked && targets.length ? (face === undefined ? 'Choisissez la face' : stepLabel(stepOf(picked, face), character.twinDice)) : `Son dé · d${character.stats.damageDie}`}
        </span>
        <ForgedDie
          character={character}
          tooltip="above"
          align="center"
          targets={picked && targets.length ? targets : undefined}
          preview={picked && targets.length ? picked : undefined}
          selected={face}
          onPick={choice.setFace}
        />
      </div>
    </>
  )
}

/** La tuile d'une opération déjà faite : le sceau gravé, l'or de la dorure, le rang, la taille du dé. */
function StepTile({ step, size }: { step: ForgeStep; size: number }) {
  const text = step.op === 'engrave' ? undefined : { gild: `+${GILD_BONUS}`, sharpen: 'II', enlarge: `d+${ENLARGE_FACES}`, trim: 'd−1' }[step.op]
  return (
    <span
      className="forge-face shrink-0"
      data-size="xs"
      data-engraved={step.op === 'engrave' ? '' : undefined}
      data-gild={step.op === 'gild' ? '' : undefined}
      style={{ width: size, height: size }}
    >
      {step.op === 'engrave' ? <SkillSeal id={step.skill.id} size={32} /> : text}
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
  const twin = !!base.twinDice
  const after = steps.slice(0, index + 1)
  const face = 'face' in step ? forgedFaces(base, after).find((f) => f.face === step.face) : undefined
  const skills = !face ? [] : step.op === 'engrave' ? (face.engraved ? [face.engraved] : []) : [...(face.engraved ? [face.engraved] : []), ...face.origin]
  const badge =
    'face' in step
      ? `${twin && step.op !== 'gild' ? 'Double' : 'Dé'} ${step.face}`
      : `d${forgeState(base, steps.slice(0, index)).size} → d${forgeState(base, after).size}`
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
      <p className="mt-0.5 font-body text-[13px] font-medium text-arcane">Forge du dé · {stepLabel(step, twin)}</p>
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
      aria-label={stepLabel(steps[index], !!base.twinDice)}
      onMouseEnter={tip ? (e) => tip(<ForgeTooltip base={base} steps={steps} index={index} placement="floating" />, e.currentTarget) : undefined}
      onMouseLeave={tip ? () => tip(null) : undefined}
    >
      <StepTile step={steps[index]} size={size} />
      {!tip && <ForgeTooltip base={base} steps={steps} index={index} placement="below" />}
    </span>
  )
}
