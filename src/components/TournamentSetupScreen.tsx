import { useState, type ReactNode } from 'react'
import tournamentImg from '../assets/menu-tournament.jpg'
import { multiplier, percent } from '../game/combat'
import { RELICS } from '../game/relics'
import { CHARACTER_IDS, CHARACTERS } from '../game/roster'
import { SEASON_SIZES, type SeasonSize } from '../game/season'
import { sfx } from '../game/sound'
import { fillSlots, SLOTS } from '../game/tournament'
import { Bracket } from './Bracket'
import { SeasonSlots } from './SeasonSlots'
import { Portrait } from './Portrait'
import { Icon } from './Icon'
import { BackLink, Button, Glyph, SegmentedControl } from './kit'
import { RelicSeal } from './RelicSeal'
import { SkillDice } from './SkillDice'

interface Props {
  /** Les 16 cases de l'arbre (tournoi sans saison) */
  slots: (string | null)[]
  onChange: (slots: (string | null)[]) => void
  /** Les cases des participants de la saison (au moins la plus grande taille ; seules les `season.size` premières servent) */
  seasonSlots: (string | null)[]
  onSeasonSlotsChange: (slots: (string | null)[]) => void
  /** Les cases remplies du mode choisi : l'arbre, ou les participants de la saison */
  onValidate: (slots: string[]) => void
  onBack: () => void
  /** Paris entre deux joueurs (docs/PARIS.md) : activés, et les noms des deux parieurs */
  betting: { enabled: boolean; names: [string, string] }
  onBettingChange: (betting: { enabled: boolean; names: [string, string] }) => void
  /** Système de reliques pour ce tournoi (docs/RELIQUES.md) ; le choix reste pour le tournoi suivant */
  relics: boolean
  onRelicsChange: (relics: boolean) => void
  /** Noms uniques : une épithète du personnage par participant, au lieu des chiffres romains (epithets.ts) */
  uniqueNames: boolean
  onUniqueNamesChange: (uniqueNames: boolean) => void
  /** Phase de saison avant l'arbre (season.ts) et nombre de participants ; le choix reste pour le tournoi suivant */
  season: { enabled: boolean; size: SeasonSize }
  onSeasonChange: (season: { enabled: boolean; size: SeasonSize }) => void
}

/** Le sceau qui illustre l'interrupteur des reliques : la forme hexagonale suffit à dire « relique ». */
const SWITCH_RELIC = RELICS[0]

/**
 * Interrupteur compact de la configuration (Reliques, Phase de saison) : l'illustration s'éteint quand il est
 * coupé. `states` : l'état écrit sous le nom, actif puis coupé (« Activées », « Désactivées »).
 */
function SetupSwitch({
  on,
  onToggle,
  label,
  states,
  visual,
  title,
}: {
  on: boolean
  onToggle: () => void
  label: string
  states: [string, string]
  visual?: ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => {
        sfx.click()
        onToggle()
      }}
      title={title}
      className={`flex h-11 items-center gap-2 rounded-(--r-sm) border-2 bg-surface-1/90 pl-2 pr-3 text-left shadow-(--shadow-2) transition-colors ${
        on ? 'border-gold-500/80' : 'border-line-2 hover:border-gold-500/50'
      }`}
    >
      {visual}
      <span className="flex flex-col whitespace-nowrap leading-none">
        <span className={`font-display text-[17px] font-semibold ${on ? 'text-gold-200' : 'text-ink-2'}`}>{label}</span>
        <span className={`mt-0.5 font-body text-[11px] font-bold uppercase tracking-wider ${on ? 'text-good' : 'text-ink-3'}`}>
          {on ? states[0] : states[1]}
        </span>
      </span>
      {/* Le curseur : à droite et en or quand il est actif */}
      <span
        aria-hidden
        className={`relative ml-1 h-6 w-11 shrink-0 rounded-full border-2 transition-colors ${on ? 'border-gold-400 bg-gold-500/40' : 'border-line-2 bg-surface-0'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full shadow-(--shadow-2) transition-all duration-150 ${on ? 'left-[22px] bg-gold-300' : 'left-0.5 bg-ink-3'}`}
        />
      </span>
    </button>
  )
}

/**
 * Configuration du tournoi (refonte 0.47.0) : on choisit un combattant dans la grande palette centrale
 * (le « pinceau »), puis on clique les cases. Sans saison, ce sont les cases du premier tour, aux deux extrémités
 * de l'arbre, dont les lignes convergent vers la palette. Avec la saison (0.86.1), ce sont les participants de la
 * saison, sur deux colonnes : l'arbre reste vide jusqu'à la fin de la saison. La palette porte aussi le compte et
 * les actions (Compléter, Vider, Valider).
 */
export function TournamentSetupScreen({
  slots: bracketSlots,
  onChange: onBracketChange,
  seasonSlots,
  onSeasonSlotsChange,
  onValidate,
  onBack,
  betting,
  onBettingChange,
  relics,
  onRelicsChange,
  uniqueNames,
  onUniqueNamesChange,
  season,
  onSeasonChange,
}: Props) {
  const roster = CHARACTERS
  const ids = CHARACTER_IDS
  const [brushId, setBrushId] = useState(ids[0])
  const brush = roster.find((c) => c.id === brushId)!
  // Les cases du mode choisi : les participants de la saison, ou les 16 cases de l'arbre
  const slots = season.enabled ? seasonSlots.slice(0, season.size) : bracketSlots
  const onChange = (next: (string | null)[]) =>
    season.enabled ? onSeasonSlotsChange([...next, ...seasonSlots.slice(season.size)]) : onBracketChange(next)
  const filled = slots.filter(Boolean).length
  const complete = filled === slots.length
  const Board = season.enabled ? SeasonSlots : Bracket

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
          <BackLink onClick={onBack}>Retour</BackLink>
          <h1 className="on-illus mt-1 font-display text-[44px] font-bold leading-none tracking-wide text-gold-200">
            Configuration du tournoi
          </h1>
        </div>
        <div className="flex flex-col items-end gap-3 pt-2">
          <div className="flex items-center gap-4">
            {/* Phase de saison : un championnat aller-retour avant l'arbre (sa taille se choisit dans le panneau) */}
            <SetupSwitch
              on={season.enabled}
              onToggle={() => onSeasonChange({ ...season, enabled: !season.enabled })}
              label="Phase de saison"
              states={['Activée', 'Désactivée']}
              title={
                season.enabled
                  ? `Championnat aller-retour à ${season.size} avant l'arbre : les ${SLOTS} premiers s'y qualifient. Ni relique ni pari pendant la saison.`
                  : "Pas de saison : l'arbre seul"
              }
              visual={
                <span className={`flex h-7 w-7 items-center justify-center ${season.enabled ? 'text-gold-300' : 'text-ink-3'}`}>
                  <Glyph name="tournoi" size={20} />
                </span>
              }
            />
            {/* Interrupteur des reliques : le sceau s'éteint quand le système est désactivé */}
            <SetupSwitch
              on={relics}
              onToggle={() => onRelicsChange(!relics)}
              label="Reliques"
              states={['Activées', 'Désactivées']}
              title={relics ? 'Chaque victoire offre une relique au vainqueur (hors finale)' : 'Tournoi sans reliques : personne n’en gagne ni n’en porte'}
              visual={<RelicSeal relic={SWITCH_RELIC} size={28} spent={!relics} />}
            />
          </div>
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

      {/* Avec la saison, les cases de ses participants ; l'arbre ne se peuple qu'à la fin de la saison */}
      <Board
        slots={slots}
        slotHint={{ id: brush.id, name: brush.name }}
        onSlotClick={(slot) => set(slot, brushId)}
        onSlotClear={(slot) => set(slot, null)}
        center={
          <div className="bracket-panel flex h-full w-full flex-col px-6 pb-5 pt-4">
            <div className="flex items-center gap-4">
              <h2 className="font-display text-[22px] font-semibold tracking-wide text-ink-1">Les combattants</h2>
              <SetupSwitch
                on={uniqueNames}
                onToggle={() => onUniqueNamesChange(!uniqueNames)}
                label="Noms uniques"
                states={['Activés', 'Désactivés']}
                title={
                  uniqueNames
                    ? 'Chaque participant reçoit une épithète de son personnage (Gorak le Borgne, Elaria Flèche-Grise)'
                    : 'Les doublons sont numérotés (Gorak I, Gorak II)'
                }
              />
              <p className="ml-auto text-right font-body text-[14px] leading-snug text-ink-3">
                Choisissez-en un, puis cliquez les cases {season.enabled ? 'de la saison' : "de l'arbre"}.
                <br />
                Les doublons sont permis.
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

            {/* Phase de saison : sa taille, qui la joue, et ce qui en sort */}
            {season.enabled && (
              <div className="mt-3 flex items-center gap-3">
                <span className="shrink-0 font-display text-[18px] font-semibold text-gold-300">Saison à</span>
                <SegmentedControl
                  label="Participants de la saison"
                  options={SEASON_SIZES.map((n) => ({ value: n, label: String(n), title: `${n} participants, ${n * (n - 1)} matchs de saison` }))}
                  value={season.size}
                  onChange={(size) => {
                    sfx.click()
                    onSeasonChange({ ...season, size })
                  }}
                />
                <p className="min-w-0 flex-1 font-body text-[14px] leading-snug text-ink-2">
                  {season.size} participants, aller-retour ({season.size * (season.size - 1)} matchs). L'arbre attend la fin de la saison : les {SLOTS}{' '}
                  premiers y entrent en têtes de série.
                </p>
              </div>
            )}

            {/* Compte et actions : Valider est le seul bouton primaire de l'écran */}
            <div className="mt-auto flex items-center gap-3 pt-4">
              <span className={`font-data text-[22px] font-semibold tabular-nums ${complete ? 'text-good' : 'text-ink-2'}`}>
                {filled} / {slots.length}
              </span>
              <Button
                variant="secondary"
                size="sm"
                icon="hasard"
                onClick={() => {
                  sfx.click()
                  onChange(fillSlots(slots, ids))
                }}
                disabled={complete}
                title="Remplit les cases vides en équilibrant le roster ; les cases placées à la main sont conservées"
              >
                Compléter
              </Button>
              <Button variant="tertiary" size="sm" onClick={() => onChange(Array(slots.length).fill(null))} disabled={filled === 0}>
                Vider
              </Button>
              <div className="ml-auto">
                <Button variant="primary" size="xl" icon="tournoi" onClick={() => complete && onValidate(slots as string[])} disabled={!complete}>
                  {season.enabled ? 'Lancer la saison' : "Valider l'arbre"}
                </Button>
              </div>
            </div>
          </div>
        }
      />
    </div>
  )
}
