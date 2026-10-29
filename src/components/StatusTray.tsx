import { useState } from 'react'
import type { Character } from '../game/character'
import { originsOf, STATES, stateValueText, TRAY_MOMENTS, type TrayState } from '../game/states'
import { POLARITY_STYLE, STATUSES, type Polarity } from '../game/statuses'
import { Icon, MOMENT_ICON, StateIcon } from './Icon'

const COUNT: Record<Polarity, string> = {
  positive: 'border-emerald-400 text-emerald-100',
  negative: 'border-red-500 text-red-100',
}

/** Un état affiché : présent, ou « sortant » (il montre son 0 puis quitte la zone). Un seul médaillon par état et par moment. */
export interface TrayItem {
  state: TrayState
  leaving: boolean
}

/**
 * Les médaillons après un changement d'états. Garde l'ordre et retient ceux qui viennent de disparaître :
 * un état épuisé ou expiré reste, sortant, le temps que son nombre descende à 0, puis s'efface (fin de son
 * animation). C'est le même médaillon (même clé : son état et son moment) : son compteur s'anime vers 0 au lieu de
 * renaître à 0. Un état reposé pendant sa sortie reprend vie dans ce médaillon, au lieu d'en ouvrir un second.
 */
export function trayAfter(items: readonly TrayItem[], states: readonly TrayState[]): TrayItem[] {
  const byKey = new Map<string, TrayState>(states.map((s) => [s.key, s]))
  const next = items.map((item) => {
    const live = byKey.get(item.state.key)
    return live ? { state: live, leaving: false } : { ...item, leaving: true }
  })
  for (const s of states) if (!next.some((i) => i.state.key === s.key)) next.push({ state: s, leaving: false })
  return next
}

function useTrayItems(states: readonly TrayState[]) {
  const [items, setItems] = useState<TrayItem[]>(() => states.map((s) => ({ state: s, leaving: false })))
  const [prev, setPrev] = useState(states)
  if (states !== prev) {
    setPrev(states)
    setItems(trayAfter(items, states))
  }
  const remove = (key: string) => setItems((list) => list.filter((i) => !(i.leaving && i.state.key === key)))
  return { items, remove }
}

/** Les deux combattants, pour dire d'où vient chaque état dans son infobulle (facultatif). */
export interface TrayCast {
  bearer: Character
  opponent: Character
}

/**
 * Zone d'état d'un combattant, posée sur l'arène au-dessus de lui : ce qu'il subit ou porte en ce moment,
 * en états génériques (`states.ts`), bonus à gauche, malus à droite. Ses compétences et ses auras, elles,
 * sont dans l'en-tête (SkillBar). Chaque état = une icône et un seul nombre, et une infobulle au survol qui
 * dit ce qui le compose et d'où il vient. Les animations suivent la vitesse et la pause du combat
 * (--speed, .is-paused). `data-tray` : la cible des signaux d'activation (SignalLayer).
 */
export function StatusTray({ states, cast, side }: { states: readonly TrayState[]; cast?: TrayCast; side?: number }) {
  const { items, remove } = useTrayItems(states)
  const of = (p: Polarity) => items.filter((i) => STATES[i.state.id].polarity === p)
  const bonus = of('positive')
  const malus = of('negative')
  return (
    <div className="flex min-h-px min-w-px items-center gap-3" aria-label="États actifs" data-tray={side}>
      {bonus.length > 0 && (
        <div className="flex gap-2">
          {bonus.map((i) => (
            <StatusToken key={i.state.key} state={i.state} leaving={i.leaving} cast={cast} onLeft={() => remove(i.state.key)} />
          ))}
        </div>
      )}
      {bonus.length > 0 && malus.length > 0 && <span className="h-9 w-px bg-stone-400/40" />}
      {malus.length > 0 && (
        <div className="flex gap-2">
          {malus.map((i) => (
            <StatusToken key={i.state.key} state={i.state} leaving={i.leaving} cast={cast} onLeft={() => remove(i.state.key)} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Le nombre d'un médaillon et son dernier changement, retenus pendant le rendu (« état dérivé » de React)
 * pour que l'animation parte au même rendu que la nouvelle valeur : `from` et `dir`, le nombre d'avant et le
 * sens du changement, pour le défilement du chiffre. Seul le nombre affiché compte : une valeur cachée qui
 * change (les charges d'un état qui montre ses tours) n'anime rien.
 */
function useCount(value: number | undefined) {
  const [count, setCount] = useState({ value, key: 0, from: value, dir: 0 })
  if (count.value !== value) {
    const step = value !== undefined && count.value !== undefined ? value - count.value : 0
    setCount({ value, key: count.key + 1, from: count.value, dir: Math.sign(step) })
  }
  return count
}

/**
 * Un médaillon d'état. Quand son nombre change, un seul geste, au même endroit, sur le compteur :
 * - le chiffre défile : une hausse monte (l'ancien sort par le haut), une baisse descend ;
 * - le compteur s'élargit et s'éclaire pour une hausse, se tasse et s'assombrit pour une baisse.
 * Aucune variation ne flotte depuis le compteur (2026-10-21) : les textes flottants du combat suffisent.
 * Seulement des transformations et de l'opacité : aucun filtre, que Firefox dessine mal sur ces petits éléments.
 */
function StatusToken({ state, leaving, cast, onLeft }: { state: TrayState; leaving: boolean; cast?: TrayCast; onLeft: () => void }) {
  const def = STATES[state.id]
  // Un état sortant affiche 0 : ses charges, ses tours ou son total sont épuisés. Le compteur y descend.
  const value = state.value !== undefined && leaving ? 0 : state.value
  const count = useCount(value)
  const text = (v: number | undefined) => (v === undefined ? undefined : stateValueText({ ...state, value: v }))
  const pulse = count.dir > 0 ? 'count-gain' : count.dir < 0 ? 'count-loss' : ''
  return (
    <div
      onAnimationEnd={(e) => {
        if (e.animationName === 'status-leave') onLeft()
      }}
      // L'emblème est posé tel quel, sans cadre (0.79.2) : une pièce ronde, toutes à la même taille. La polarité
      // se lit au compteur (vert ou rouge) et à la rangée (bonus à gauche, malus à droite)
      className={`group relative h-12 w-12 rounded-full hover:z-10 ${leaving ? 'status-leave' : 'status-pop'}`}
      data-state={state.id}
      data-polarity={def.polarity}
    >
      <StateIcon id={state.id} className="absolute inset-0 h-full w-full" />
      {/* Teinte légère de la pièce monochrome : un reflet vert pour un bonus, rouge pour un malus (.state-tint) */}
      <span aria-hidden className="state-tint" />
      {/* Sa pastille de déclencheur (EMBLEMES § 5), sur le bord haut gauche : le compteur tient le bas droit */}
      {state.moment && <Icon name={MOMENT_ICON[state.moment]} className="absolute -left-1.5 -top-1.5 z-[1] h-[22px] w-[22px]" />}
      {value !== undefined && (
        <span
          // La clé relance le geste au moment exact où le nombre change. Chiffres de la police des données, comme les
          // charges des reliques : en Cinzel, « 11 » se lisait « II », le rang d'une compétence aiguisée
          key={`count-${count.key}`}
          className={`absolute -bottom-1.5 -right-2 z-[1] flex h-6 min-w-6 items-center justify-center rounded-full border bg-stone-950 px-1 font-data text-sm font-bold leading-none tabular-nums ${COUNT[def.polarity]} ${pulse}`}
        >
          {state.unit === 'turns' && <Icon name="turns" className="-ml-0.5 h-3.5 w-3.5" />}
          {/* Fenêtre du chiffre : l'ancien en sort, le nouveau y entre */}
          <span className="relative block h-[1em] overflow-hidden whitespace-nowrap">
            {count.dir !== 0 && count.from !== undefined && (
              <span aria-hidden className={`absolute inset-x-0 top-0 text-center ${count.dir > 0 ? 'count-out-up' : 'count-out-down'}`}>
                {text(count.from)}
              </span>
            )}
            <span className={`block ${count.dir > 0 ? 'count-in-up' : count.dir < 0 ? 'count-in-down' : ''}`}>{text(value)}</span>
          </span>
        </span>
      )}
      {!leaving && <StatusTooltip state={state} cast={cast} />}
    </div>
  )
}

/**
 * Infobulle au survol, centrée au-dessus du médaillon : le nom générique, sa polarité, ce qu'il veut dire, puis
 * chaque statut qui le compose, avec son effet actuel, ce qu'il en reste et d'où il vient (« Œil de faucon
 * (Elaria) »). Fonctionne aussi en pause.
 */
function StatusTooltip({ state, cast }: { state: TrayState; cast?: TrayCast }) {
  const def = STATES[state.id]
  return (
    <div
      role="tooltip"
      className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-3 w-72 -translate-x-1/2 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-3 py-2.5 text-left opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-base font-extrabold leading-tight text-ink-1">
          {state.unit === 'amount' ? `${def.name} ${stateValueText(state)}` : def.name}
        </span>
        <span className={`shrink-0 rounded-(--r-xs) border px-1.5 py-px font-body text-[13px] font-bold uppercase leading-tight tracking-wider ${POLARITY_STYLE[def.polarity].chip}`}>
          {POLARITY_STYLE[def.polarity].label}
        </span>
      </div>
      {state.moment && (
        <p className="mt-1 flex items-center gap-1.5 font-body text-[13px] font-bold text-ink-2">
          <Icon name={MOMENT_ICON[state.moment]} className="h-4 w-4" /> {TRAY_MOMENTS[state.moment].label}
        </p>
      )}
      <p className="mt-0.5 font-body text-[13px] font-medium text-ink-3">{def.summary}</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {state.sources.map((source) => {
          const s = source.status
          const turns = s.turns !== undefined ? `${s.turns} tour${s.turns > 1 ? 's' : ''} restant${s.turns > 1 ? 's' : ''}` : null
          const origins = cast ? originsOf(s.id, cast.bearer, cast.opponent) : []
          return (
            <li key={s.id} className="font-body text-[15px] leading-snug text-ink-1">
              {/* Le statut qui compose l'état, quand son nom dit plus que l'état (Aura de puissance, Force de l'ours) */}
              {STATUSES[s.id].name !== def.name && <span className="font-bold">{STATUSES[s.id].name}{'\u00a0'}: </span>}
              {STATUSES[s.id].describe(s)}
              {(turns || origins.length > 0) && (
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-ink-3">
                  {turns && (
                    <>
                      <Icon name="turns" className="h-3 w-3" /> {turns}
                    </>
                  )}
                  {turns && origins.length > 0 && ' · '}
                  {origins.length > 0 && `Vient de : ${origins.join(', ')}`}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
