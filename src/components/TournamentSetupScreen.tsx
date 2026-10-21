import { useState } from 'react'
import tournamentImg from '../assets/menu-tournament.jpg'
import { multiplier, percent } from '../game/combat'
import { RELICS } from '../game/relics'
import { CHARACTER_IDS, CHARACTERS } from '../game/roster'
import { sfx } from '../game/sound'
import { fillSlots, SLOTS } from '../game/tournament'
import { Bracket } from './Bracket'
import { Portrait } from './Portrait'
import { Icon } from './Icon'
import { PrestigeButton } from './PrestigeButton'
import { RelicSeal } from './RelicSeal'
import { SkillDice } from './SkillDice'

interface Props {
  slots: (string | null)[]
  onChange: (slots: (string | null)[]) => void
  onValidate: (slots: string[]) => void
  onBack: () => void
  /** Paris entre deux joueurs (docs/PARIS.md) : activés, et les noms des deux parieurs */
  betting: { enabled: boolean; names: [string, string] }
  onBettingChange: (betting: { enabled: boolean; names: [string, string] }) => void
  /** Système de reliques pour ce tournoi (docs/RELIQUES.md) ; le choix reste pour le tournoi suivant */
  relics: boolean
  onRelicsChange: (relics: boolean) => void
}

/** Le sceau qui illustre l'interrupteur des reliques : la forme hexagonale suffit à dire « relique ». */
const SWITCH_RELIC = RELICS[0]

/**
 * Configuration de l'arbre (refonte 0.47.0) : on choisit un combattant dans la grande palette centrale
 * (le « pinceau »), puis on clique les cases du premier tour, aux deux extrémités de l'arbre. Les lignes
 * de l'arbre convergent vers la palette, qui porte aussi le compte et les actions (Compléter, Vider, Valider).
 */
export function TournamentSetupScreen({ slots, onChange, onValidate, onBack, betting, onBettingChange, relics, onRelicsChange }: Props) {
  const roster = CHARACTERS
  const ids = CHARACTER_IDS
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
    <div className="fade-in relative isolate h-full">
      {/* La porte de l'arène, très assombrie : le décor de l'onglet Tournoi, sous l'arbre */}
      <img
        src={tournamentImg}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover"
        style={{ filter: 'brightness(0.2) saturate(0.7)' }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_55%,transparent_20%,rgba(14,11,9,0.85)_100%)]" />

      {/* Titre, paris : au-dessus de l'arbre, qui occupe toute la scène */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-start justify-between px-8 pr-20 pt-5">
        <div>
          <button onClick={onBack} className="btn-tertiary h-8 px-3 text-[13px]">
            ← Retour
          </button>
          <h1 className="on-illus mt-2 font-display text-[44px] font-bold leading-none tracking-wide text-gold-200">
            Configuration du tournoi
          </h1>
        </div>
        <div className="flex items-center gap-8 pt-8">
          {/* Interrupteur des reliques : grand format, le sceau s'éteint quand le système est désactivé */}
          <button
            type="button"
            role="switch"
            aria-checked={relics}
            onClick={() => {
              sfx.click()
              onRelicsChange(!relics)
            }}
            title={relics ? 'Chaque victoire offre une relique au vainqueur (hors finale)' : 'Tournoi sans reliques : personne n’en gagne ni n’en porte'}
            className={`flex h-16 items-center gap-3 rounded-(--r-sm) border-2 bg-surface-1/90 pl-3 pr-4 text-left shadow-(--shadow-2) transition-colors ${
              relics ? 'border-gold-500/80' : 'border-line-2 hover:border-gold-500/50'
            }`}
          >
            <RelicSeal relic={SWITCH_RELIC} size={44} spent={!relics} />
            <span className="flex w-40 flex-col leading-tight">
              <span className={`font-display text-[22px] font-semibold ${relics ? 'text-gold-200' : 'text-ink-2'}`}>Reliques</span>
              <span className={`font-body text-[14px] font-bold uppercase tracking-wider ${relics ? 'text-good' : 'text-ink-3'}`}>
                {relics ? 'Activées' : 'Désactivées'}
              </span>
            </span>
            {/* Le curseur : à droite et en or quand elles sont actives */}
            <span
              aria-hidden
              className={`relative h-8 w-16 shrink-0 rounded-full border-2 transition-colors ${relics ? 'border-gold-400 bg-gold-500/40' : 'border-line-2 bg-surface-0'}`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full shadow-(--shadow-2) transition-all duration-150 ${relics ? 'left-[34px] bg-gold-300' : 'left-0.5 bg-ink-3'}`}
              />
            </span>
          </button>
          <div className="flex items-center gap-2 font-body text-[15px]">
            <label className="flex cursor-pointer items-center gap-2 text-ink-2">
              <input
                type="checkbox"
                checked={betting.enabled}
                onChange={(e) => onBettingChange({ ...betting, enabled: e.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
              <Icon name="coin-pile" className="h-5 w-5" /> Paris entre
            </label>
            {([0, 1] as const).map((i) => [
              i === 1 && (
                <span key="et" className="text-ink-3">
                  et
                </span>
              ),
              <input
                key={i}
                value={betting.names[i]}
                disabled={!betting.enabled}
                maxLength={16}
                aria-label={`Parieur ${i + 1}`}
                onChange={(e) => {
                  const names: [string, string] = [...betting.names]
                  names[i] = e.target.value
                  onBettingChange({ ...betting, names })
                }}
                className={`h-9 w-36 rounded-(--r-xs) border bg-surface-1 px-2 font-bold disabled:opacity-40 ${i === 0 ? 'border-emerald-400/60 text-emerald-300' : 'border-fuchsia-400/60 text-fuchsia-300'}`}
              />,
            ])}
          </div>
        </div>
      </header>

      <Bracket
        slots={slots}
        slotHint={{ id: brush.id, name: brush.name }}
        onSlotClick={(slot) => set(slot, brushId)}
        onSlotClear={(slot) => set(slot, null)}
        center={
          <div className="bracket-panel flex h-full w-full flex-col px-6 pb-5 pt-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[22px] font-semibold tracking-wide text-ink-1">Les combattants</h2>
              <p className="font-body text-[15px] text-ink-3">
                Choisissez-en un, puis cliquez les cases de l'arbre. Les doublons sont permis.
              </p>
            </div>

            {/* La palette : dix grandes cartes, le pinceau en or, le nombre de cases déjà prises */}
            <ul className="mt-3 grid grid-cols-5 justify-items-center gap-x-3 gap-y-3" aria-label="Combattants">
              {roster.map((c) => {
                const n = count(c.id)
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        sfx.click()
                        setBrushId(c.id)
                      }}
                      data-brush={c.id === brushId || undefined}
                      aria-pressed={c.id === brushId}
                      aria-label={`${c.name}, ${c.race} · ${c.archetype}, ${n} case${n > 1 ? 's' : ''}`}
                      title={`${c.name} — ${c.race}, ${c.archetype}`}
                      className="roster-card roster-card-lg"
                    >
                      <Portrait character={c} side={0} className="roster-card-face" />
                      <span className="roster-card-name">{c.name}</span>
                      <span className="roster-card-count" data-used={n > 0 || undefined}>
                        ×{n}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Le pinceau : qui sera placé au clic */}
            <div className="mt-4 flex items-center gap-4 rounded-(--r-xs) border border-line-1 bg-surface-1/80 p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-(--r-xs) shadow-[0_0_0_2px_var(--gold-400)]">
                <Portrait character={brush} side={0} className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[26px] font-semibold leading-none text-gold-200">{brush.name}</p>
                <p className="mt-1 truncate font-body text-[15px] text-ink-2">
                  {brush.race} · {brush.archetype}
                </p>
                <p className="mt-1 font-data text-[13px] text-ink-3">
                  {brush.maxHp} PV · {brush.twinDice ? '2 × ' : ''}d{brush.stats.damageDie} · esquive {percent(brush.stats.dodgeChance)} · critique{' '}
                  {percent(brush.stats.critChance)} {multiplier(brush.stats.critMultiplier)}
                </p>
              </div>
              <SkillDice character={brush} size="sm" tooltip="above" align="right" />
            </div>

            {/* Compte et actions : Valider est la seule pièce prestige de l'écran */}
            <div className="mt-auto flex items-center gap-3 pt-4">
              <span className={`font-data text-[22px] font-semibold tabular-nums ${complete ? 'text-good' : 'text-ink-2'}`}>
                {filled} / {SLOTS}
              </span>
              <button
                onClick={() => {
                  sfx.click()
                  onChange(fillSlots(slots, ids))
                }}
                disabled={complete}
                className="btn btn-sm"
                title="Remplit les cases vides en équilibrant le roster ; les cases placées à la main sont conservées"
              >
                <Icon name="dice" className="btn-icon" />
                <span>Compléter</span>
              </button>
              <button onClick={() => onChange(Array(SLOTS).fill(null))} disabled={filled === 0} className="btn-tertiary h-9 px-3">
                Vider
              </button>
              <PrestigeButton
                size="md"
                className="ml-auto w-[280px]"
                onClick={() => complete && onValidate(slots as string[])}
                disabled={!complete}
              >
                <Icon name="trophy" className="btn-icon" />
                <span>Valider l'arbre</span>
              </PrestigeButton>
            </div>
          </div>
        }
      />
    </div>
  )
}
