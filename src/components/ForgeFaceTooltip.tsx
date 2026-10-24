import { Fragment, type ReactNode } from 'react'
import { describeSkill } from '../game/events'
import { GILD_RULE, type ForgedFace } from '../game/forge'
import { SkillSeal } from './SkillSeal'

/*
 * Infobulle d'une face du dé forgé (docs/CAMPAGNE.md § 4) : ce que fait la face, en une ou deux lignes. Pendant un choix
 * de forge, `next` est la même face une fois l'opération faite : ce qui change s'écrit « avant → après », l'après en
 * vert, et le reste du texte ne bouge pas (« +2 → +4 dégâts à la frappe », 2026-10-23, demande de l'utilisateur).
 * Aucune règle ici : les deux faces viennent de forge.ts (`forgedFaces`).
 */

const ALIGN = { left: 'left-0', center: 'left-1/2 -translate-x-1/2', right: 'right-0' }

const New = ({ children }: { children: string }) => <span className="font-bold text-good">{children}</span>

/**
 * Un texte et sa version après la forge, mot à mot (plus longue sous-suite commune ; espaces et ponctuation sont des
 * mots à part) : un nombre qui change devient « avant → après » (« 6 → 7 points »), un mot qui arrive s'écrit en vert
 * (« Pourfendre II »), un mot qui part disparaît.
 */
function Diff({ before, after }: { before: string; after: string }) {
  if (before === after) return <>{after}</>
  const [a, b] = [before, after].map((s) => s.split(/([\s(),.;:]+)/))
  const common = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) common[i][j] = a[i] === b[j] ? common[i + 1][j + 1] + 1 : Math.max(common[i + 1][j], common[i][j + 1])
  const words: ReactNode[] = []
  // Le dernier nombre qui part, en attente du nombre qui le remplace
  let gone: string | undefined
  for (let i = 0, j = 0; j < b.length; ) {
    if (i < a.length && a[i] === b[j]) {
      words.push(b[j])
      gone = undefined
      i++
      j++
    } else if (i < a.length && common[i + 1][j] >= common[i][j + 1]) {
      if (/\d/.test(a[i])) gone = a[i]
      i++
    } else {
      words.push(gone && /\d/.test(b[j]) ? <>{gone} → <New>{b[j]}</New></> : <New>{b[j]}</New>)
      gone = undefined
      j++
    }
  }
  return (
    <>
      {words.map((w, k) => (
        <Fragment key={k}>{w}</Fragment>
      ))}
    </>
  )
}

/** « +2 dégâts à la frappe », ou « +2 → +4 » pendant l'aperçu d'une dorure. */
function Gild({ from, to }: { from: number; to: number }) {
  return (
    <p className="mt-1 font-body text-[15px] font-bold leading-snug text-gold-300">
      {from === to ? `+${to}` : from === 0 ? <New>{`+${to}`}</New> : <Diff before={`+${from}`} after={`+${to}`} />} {GILD_RULE}
    </p>
  )
}

export function ForgeFaceTooltip({
  face,
  next,
  placement,
  align,
}: {
  face: ForgedFace
  /** La face après l'opération choisie (aperçu d'une forge) */
  next?: ForgedFace
  placement: 'above' | 'below'
  align: keyof typeof ALIGN
}) {
  const skill = face.engraved ?? face.origin[0]
  const after = next ?? face
  const shown = after.engraved ?? after.origin[0]
  // Une gravure nouvelle : toute la compétence est neuve
  const engraved = !!shown && shown.id !== skill?.id
  const [now, then] = [skill && describeSkill(skill), shown && describeSkill(shown)]
  return (
    <div
      role="tooltip"
      className={`pointer-events-none invisible absolute z-[70] w-80 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-4 py-3 text-left opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover:visible group-hover:opacity-100 ${
        placement === 'above' ? 'bottom-full mb-3' : 'top-full mt-3'
      } ${ALIGN[align]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-display text-lg font-extrabold leading-tight text-ink-1">
          {shown && <SkillSeal id={shown.id} size={32} />}
          {shown ? engraved ? <New>{shown.name}</New> : <Diff before={skill!.name} after={shown.name} /> : `Face ${face.face}`}
        </span>
        <span className="shrink-0 rounded-(--r-xs) border border-arcane/60 bg-arcane/15 px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider text-arcane">
          {`Dé ${face.face}`}
        </span>
      </div>
      {then && then.tags.length > 0 && <p className="mt-0.5 font-body text-[13px] font-medium text-arcane">{then.tags.map((t) => t.label).join(' · ')}</p>}
      <div className="codex-divider my-2.5" />
      {then ? (
        <p className="font-body text-[15px] leading-snug text-ink-1">{engraved || !now ? <New>{then.text}</New> : <Diff before={now.text} after={then.text} />}</p>
      ) : (
        <p className="font-body text-[15px] leading-snug text-ink-1">
          Le coup de base, sans compétence
        </p>
      )}
      {(face.gild > 0 || after.gild > 0) && <Gild from={face.gild} to={after.gild} />}
    </div>
  )
}
