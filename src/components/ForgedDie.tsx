import type { Character } from '../game/character'
import { DEFAULT_SKILL_NATURE, describeSkill } from '../game/events'
import { FORGE_OPS, forgedFaces, GILD_BONUS, rankLabel, ENLARGE_FACES, type ForgeOffer, type ForgeStep } from '../game/forge'
import { SkillSeal } from './SkillSeal'
import { SkillTooltip } from './SkillDice'

/*
 * Le dé forgé (campagne, docs/CAMPAGNE.md § 4) : toutes ses faces, lisibles de loin, sans texte. Une face qui porte une
 * compétence montre son sceau (liseré de sa nature), une gravure a le liseré violet des runes, une dorure la plaque
 * d'or, un rang son chiffre romain ; une face d'attente (l'ogre) est éteinte. Aucune règle ici : tout vient de forge.ts.
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
}: {
  character: Character
  size?: keyof typeof TILE
  tooltip?: 'above' | 'below'
  align?: 'left' | 'center' | 'right'
  /** Choix d'une face (forge) : les faces visables s'allument, les autres s'éteignent */
  targets?: readonly number[]
  selected?: number
  onPick?: (face: number) => void
}) {
  const faces = forgedFaces(character.definition, character.forge)
  const twin = character.twinDice
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={`Dé de ${character.name} : d${faces.length}${twin ? ', deux dés' : ''}`}>
      {faces.map((f) => {
        const skill = f.engraved ?? f.origin[0]
        const target = targets?.includes(f.face)
        const plain = skill
          ? undefined
          : f.idle
            ? `${f.face} : attente, il ne frappe pas`
            : `${f.face} : frappe pour ${f.face}${f.gild ? ` + ${f.gild} (face dorée)` : ''}`
        return (
          <li key={f.face} className="group relative hover:z-[70]">
            <button
              type="button"
              disabled={!target}
              aria-pressed={target ? selected === f.face : undefined}
              aria-label={`${twin && skill ? 'Double' : 'Face'} ${f.face}`}
              title={plain}
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
            {skill && <SkillTooltip event={skill} face={f.face} placement={tooltip} align={align} />}
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
