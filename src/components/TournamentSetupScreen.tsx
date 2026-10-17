import { useMemo, useState } from 'react'
import { Character } from '../game/character'
import { ROSTER } from '../game/roster'
import { sfx } from '../game/sound'
import { fillSlots, SLOTS } from '../game/tournament'
import { Bracket } from './Bracket'
import { Portrait } from './Portrait'

interface Props {
  slots: (string | null)[]
  onChange: (slots: (string | null)[]) => void
  onValidate: (slots: string[]) => void
  onBack: () => void
}

/** Configuration de l'arbre : on choisit un personnage dans la palette puis on clique les cases. */
export function TournamentSetupScreen({ slots, onChange, onValidate, onBack }: Props) {
  const roster = useMemo(() => ROSTER.map((def) => new Character(def)), [])
  const ids = roster.map((c) => c.id)
  const [brushId, setBrushId] = useState(ids[0])
  const brush = roster.find((c) => c.id === brushId)!
  const filled = slots.filter(Boolean).length
  const complete = filled === SLOTS

  const set = (slot: number, id: string | null) => {
    if (slots[slot] === id) return
    sfx.click()
    const next = [...slots]
    next[slot] = id
    onChange(next)
  }
  const count = (id: string) => slots.filter((s) => s === id).length

  return (
    <div className="fade-in relative h-full">
      {/* Au-dessus de l'arbre, qui occupe toute la scène */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-start justify-between px-8 pr-20 pt-6">
        <div>
          <button onClick={onBack} className="text-sm font-bold text-stone-400 hover:text-stone-100">
            ← Retour
          </button>
          <h1 className="font-display text-4xl font-extrabold text-amber-200">Configuration du tournoi</h1>
          <p className="text-sm text-stone-400">
            Placez les 16 participants à la main, ou complétez automatiquement les cases restantes. Les doublons sont
            permis.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <span className={`font-mono text-lg font-bold ${complete ? 'text-emerald-400' : 'text-stone-300'}`}>
            {filled} / {SLOTS}
          </span>
          <button
            onClick={() => {
              sfx.click()
              onChange(fillSlots(slots, ids))
            }}
            disabled={complete}
            className="rounded-md border border-amber-500/70 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/10 disabled:opacity-40"
            title="Remplit les cases vides en équilibrant le roster ; les cases placées à la main sont conservées"
          >
            🎲 Compléter
          </button>
          <button
            onClick={() => onChange(Array(SLOTS).fill(null))}
            disabled={filled === 0}
            className="rounded-md border border-stone-700 px-3 py-2 text-sm text-stone-400 hover:bg-stone-800 disabled:opacity-40"
          >
            Vider
          </button>
          <button
            onClick={() => complete && onValidate(slots as string[])}
            disabled={!complete}
            className="ml-2 rounded-xl bg-amber-500 px-6 py-2.5 font-display text-lg font-extrabold tracking-wider text-stone-950 shadow-[0_4px_0_#92400e] hover:bg-amber-400 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400 disabled:shadow-none"
          >
            VALIDER L'ARBRE
          </button>
        </div>
      </header>

      <Bracket
        slots={slots}
        slotHint={brush.name}
        onSlotClick={(slot) => set(slot, brushId)}
        onSlotClear={(slot) => set(slot, null)}
        center={
          <div className="flex w-full flex-col items-center gap-2 rounded-xl border border-amber-500/30 bg-stone-900/70 px-3 py-4">
            <p className="text-center text-sm font-bold text-amber-200">① Choisissez un personnage</p>
            <div className="grid grid-cols-3 gap-1.5">
              {roster.map((c) => {
                const active = c.id === brushId
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      sfx.click()
                      setBrushId(c.id)
                    }}
                    title={`${c.name} — ${c.race}, ${c.archetype}`}
                    className={`relative h-[72px] w-[72px] overflow-hidden rounded-lg border bg-stone-900 transition ${
                      active
                        ? 'border-amber-400 ring-2 ring-amber-400'
                        : 'border-stone-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Portrait character={c} side={0} className="h-full w-full" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent pt-3 text-[11px] font-bold">
                      {c.name}
                    </span>
                    <span className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1 font-mono text-[10px]">
                      ×{count(c.id)}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-1 flex w-full items-center gap-3 rounded-lg bg-stone-950/60 p-2">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-amber-400">
                <Portrait character={brush} side={0} className="h-full w-full" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-lg font-extrabold leading-tight text-amber-200">{brush.name}</p>
                <p className="truncate text-xs text-stone-400">
                  {brush.race} · {brush.archetype}
                </p>
              </div>
            </div>

            <p className="mt-1 text-center text-sm font-bold text-amber-200">② Cliquez les cases de l'arbre</p>
            <p className="text-center text-xs text-stone-500">
              à gauche et à droite pour y placer {brush.name}. Le × au survol vide une case.
            </p>
          </div>
        }
      />
    </div>
  )
}
