import { useState, type ReactNode } from 'react'
import tournamentImg from '../assets/menu-tournament.jpg'
import { multiplier, percent } from '../game/combat'
import { GILD_BONUS } from '../game/forge'
import { RELICS } from '../game/relics'
import { CHARACTER_IDS, CHARACTERS } from '../game/roster'
import { BRACKET_SEEDS, BUILD_REWARDS, SEASON_SIZES, type SeasonSize } from '../game/season'
import { sfx } from '../game/sound'
import { fillSlots, SLOTS } from '../game/tournament'
import { Bracket } from './Bracket'
import { Portrait } from './Portrait'
import { Icon } from './Icon'
import { BackLink, Button, Glyph, SegmentedControl } from './kit'
import { RelicSeal } from './RelicSeal'
import { SkillDice } from './SkillDice'

interface Props {
  /** Les 16 cases de l'arbre (tournoi sans saison) */
  slots: (string | null)[]
  onChange: (slots: (string | null)[]) => void
  /** Lancer le tournoi : sans saison, l'arbre complet ; avec la saison, ses participants se tirent au lancement */
  onValidate: () => void
  onBack: () => void
  /** Paris entre deux joueurs (docs/PARIS.md) : activés, et les noms des deux parieurs */
  betting: { enabled: boolean; names: [string, string] }
  onBettingChange: (betting: { enabled: boolean; names: [string, string] }) => void
  /** Système de reliques pour ce tournoi (docs/RELIQUES.md) ; le choix reste pour le tournoi suivant */
  relics: boolean
  onRelicsChange: (relics: boolean) => void
  /** Forge du dé pendant la construction de la saison (season.ts) ; sans saison, l'interrupteur est éteint */
  forge: boolean
  onForgeChange: (forge: boolean) => void
  /** Noms uniques : une épithète du personnage par participant, au lieu des chiffres romains (epithets.ts) */
  uniqueNames: boolean
  onUniqueNamesChange: (uniqueNames: boolean) => void
  /** Phase de saison avant l'arbre (season.ts) et nombre de participants ; le choix reste pour le tournoi suivant */
  season: { enabled: boolean; size: SeasonSize }
  onSeasonChange: (season: { enabled: boolean; size: SeasonSize }) => void
}

/** Le sceau qui illustre l'interrupteur des reliques : la forme hexagonale suffit à dire « relique ». */
const SWITCH_RELIC = RELICS[0]

/** Avec la saison, l'arbre de la configuration reste vide : les 16 premiers de la saison le rempliront. */
const EMPTY_BRACKET: null[] = Array(SLOTS).fill(null)

/**
 * Une règle du panneau « Règles » : un interrupteur, ou un choix parmi quelques valeurs. Le panneau n'est qu'une liste
 * de règles : un réglage de plus est une entrée de plus. `wide` : la tuile prend deux colonnes ; `unavailable` : la
 * raison pour laquelle la règle ne se règle pas, écrite à la place de son état.
 */
type Rule = { id: string; label: string; title: string; wide?: boolean; unavailable?: string } & (
  | { kind: 'switch'; on: boolean; onToggle: () => void; states: [string, string]; visual?: ReactNode }
  | {
      kind: 'choice'
      value: number
      options: readonly { value: number; label: string; title: string }[]
      onChange: (value: number) => void
      /** L'état écrit sous le nom quand la règle se règle */
      state: string
      /** La valeur montrée à la place du choix quand la règle ne se règle pas */
      fixed: string
    }
)

/** Cadre commun des tuiles de règle : le liseré d'or dit « actif ». */
const TILE =
  'flex h-11 w-full items-center gap-2 rounded-(--r-sm) border-2 bg-surface-1/90 pl-2 pr-3 text-left shadow-(--shadow-2) transition-colors'

/** Nom et état d'une règle, sur deux lignes. */
function RuleText({ label, state, on }: { label: string; state: string; on: boolean }) {
  return (
    <span className="flex flex-col whitespace-nowrap leading-none">
      <span className={`font-display text-[17px] font-semibold ${on ? 'text-gold-200' : 'text-ink-2'}`}>{label}</span>
      <span className={`mt-0.5 font-body text-[11px] font-bold uppercase tracking-wider ${on ? 'text-good' : 'text-ink-3'}`}>{state}</span>
    </span>
  )
}

/**
 * Tuile d'une règle. Interrupteur : l'illustration s'éteint quand il est coupé, le curseur passe à droite et en or quand
 * il est actif. Choix : le sélecteur segmenté du kit, ou la valeur fixe quand la règle ne se règle pas.
 */
function RuleTile({ rule }: { rule: Rule }) {
  const span = rule.wide ? 'col-span-2' : ''
  if (rule.kind === 'choice') {
    const active = !rule.unavailable
    return (
      <div title={rule.title} className={`${TILE} ${span} ${active ? 'border-gold-500/80' : 'border-line-2 opacity-50'}`}>
        <RuleText label={rule.label} state={rule.unavailable ?? rule.state} on={active} />
        <span className="ml-auto">
          {active ? (
            <SegmentedControl
              label={rule.label}
              options={rule.options}
              value={rule.value}
              onChange={(value) => {
                sfx.click()
                rule.onChange(value)
              }}
            />
          ) : (
            <span className="font-data text-[20px] font-semibold tabular-nums text-ink-3">{rule.fixed}</span>
          )}
        </span>
      </div>
    )
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={rule.on}
      disabled={!!rule.unavailable}
      onClick={() => {
        sfx.click()
        rule.onToggle()
      }}
      title={rule.title}
      className={`${TILE} ${span} disabled:cursor-not-allowed disabled:opacity-50 ${
        rule.on ? 'border-gold-500/80' : 'border-line-2 enabled:hover:border-gold-500/50'
      }`}
    >
      {rule.visual}
      <RuleText label={rule.label} state={rule.unavailable ?? (rule.on ? rule.states[0] : rule.states[1])} on={rule.on} />
      <span
        aria-hidden
        className={`relative ml-auto h-6 w-11 shrink-0 rounded-full border-2 transition-colors ${rule.on ? 'border-gold-400 bg-gold-500/40' : 'border-line-2 bg-surface-0'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full shadow-(--shadow-2) transition-all duration-150 ${rule.on ? 'left-[22px] bg-gold-300' : 'left-0.5 bg-ink-3'}`}
        />
      </span>
    </button>
  )
}

/**
 * Configuration du tournoi (refonte 0.47.0) : la grande palette centrale (le « pinceau »), puis le panneau « Règles ».
 * Sans saison, on choisit un combattant et on clique les cases du premier tour, aux deux extrémités de l'arbre, dont
 * les lignes convergent vers la palette. Avec la saison, l'arbre reste vide (les 16 premiers de la saison le
 * rempliront) et la palette ne sert qu'à consulter : les participants se tirent au lancement. La palette porte aussi
 * le compte et les actions (Compléter, Vider, Valider).
 */
export function TournamentSetupScreen({
  slots,
  onChange,
  onValidate,
  onBack,
  betting,
  onBettingChange,
  relics,
  onRelicsChange,
  forge,
  onForgeChange,
  uniqueNames,
  onUniqueNamesChange,
  season,
  onSeasonChange,
}: Props) {
  const roster = CHARACTERS
  const ids = CHARACTER_IDS
  const [brushId, setBrushId] = useState(ids[0])
  const brush = roster.find((c) => c.id === brushId)!
  const filled = slots.filter(Boolean).length
  const complete = filled === slots.length
  const seasonMatches = season.size * (season.size - 1)

  const set = (slot: number, id: string | null) => {
    if (slots[slot] === id) return
    sfx.click()
    const next = [...slots]
    next[slot] = id
    onChange(next)
  }
  const count = (id: string) => slots.filter((s) => s === id).length

  // Le panneau « Règles », dans l'ordre d'affichage : la saison et ce qui en dépend, puis le reste
  const rules: Rule[] = [
    {
      kind: 'switch',
      id: 'season',
      label: 'Phase de saison',
      states: ['Activée', 'Désactivée'],
      on: season.enabled,
      onToggle: () => onSeasonChange({ ...season, enabled: !season.enabled }),
      title: season.enabled
        ? `Championnat aller-retour à ${season.size} avant l'arbre : les ${SLOTS} premiers s'y qualifient. Pas de pari pendant la saison.`
        : "Pas de saison : l'arbre seul",
      visual: (
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center ${season.enabled ? 'text-gold-300' : 'text-ink-3'}`}>
          <Glyph name="tournoi" size={20} />
        </span>
      ),
    },
    {
      kind: 'choice',
      id: 'size',
      wide: true,
      label: 'Nombre de combattants',
      value: season.size,
      options: SEASON_SIZES.map((n) => ({ value: n, label: String(n), title: `${n} participants, ${n * (n - 1)} matchs de saison` })),
      onChange: (size) => onSeasonChange({ ...season, size: size as SeasonSize }),
      state: `Aller-retour, ${seasonMatches} matchs`,
      fixed: String(SLOTS),
      unavailable: season.enabled ? undefined : 'Avec la saison',
      title: season.enabled
        ? `Les ${season.size} combattants de la saison sont tirés au sort au lancement, en équilibrant le roster`
        : `Sans saison, l'arbre compte ${SLOTS} cases, placées à la main`,
    },
    {
      kind: 'switch',
      id: 'forge',
      label: 'Forge du dé',
      states: ['Activée', 'Désactivée'],
      on: forge && season.enabled,
      onToggle: () => onForgeChange(!forge),
      unavailable: season.enabled ? undefined : 'Avec la saison',
      title: !season.enabled
        ? 'La forge du dé se gagne pendant la phase de saison : activez-la d’abord'
        : forge
          ? `Chaque victoire de saison rapporte une forge du dé, en alternance avec les reliques si elles sont activées, jusqu'à ${BUILD_REWARDS} ; gardées jusqu'au bout`
          : 'Saison sans forge du dé : chacun garde son dé d’origine',
      // Une face dorée, éteinte quand la forge est coupée
      visual: (
        <span
          className="forge-face shrink-0"
          data-size="sm"
          data-gild={forge && season.enabled ? '' : undefined}
          style={{ width: 30, height: 30, opacity: forge && season.enabled ? 1 : 0.45 }}
        >
          +{GILD_BONUS}
        </span>
      ),
    },
    {
      kind: 'switch',
      id: 'relics',
      label: 'Reliques',
      states: ['Activées', 'Désactivées'],
      on: relics,
      onToggle: () => onRelicsChange(!relics),
      title: !relics
        ? 'Tournoi sans reliques : personne n’en gagne ni n’en porte'
        : season.enabled
          ? `Chaque victoire de saison rapporte une relique, en alternance avec la forge si elle est activée, jusqu'à ${BUILD_REWARDS} ; gardées jusqu'au bout, l'arbre n'en donne plus`
          : 'Chaque victoire offre une relique au vainqueur (hors finale)',
      // Le sceau s'éteint quand le système est désactivé
      visual: <RelicSeal relic={SWITCH_RELIC} size={36} spent={!relics} />,
    },
    {
      kind: 'switch',
      id: 'uniqueNames',
      label: 'Noms uniques',
      states: ['Activés', 'Désactivés'],
      on: uniqueNames,
      onToggle: () => onUniqueNamesChange(!uniqueNames),
      title: uniqueNames
        ? 'Chaque participant reçoit une épithète de son personnage (Gorak le Borgne, Elaria Flèche-Grise)'
        : 'Les doublons sont numérotés (Gorak I, Gorak II)',
    },
  ]

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
        <div className="flex items-center gap-2 pt-2 font-body text-[15px]">
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
      </header>

      {/* Avec la saison, l'arbre est montré vide, chaque case avec le rang de saison qui la remplira */}
      <Bracket
        slots={season.enabled ? EMPTY_BRACKET : slots}
        seeds={season.enabled ? BRACKET_SEEDS : undefined}
        slotHint={{ id: brush.id, name: brush.name }}
        onSlotClick={(slot) => set(slot, brushId)}
        onSlotClear={(slot) => set(slot, null)}
        center={
          <div className="bracket-panel flex h-full w-full flex-col px-6 pb-4 pt-4">
            <div className="flex items-baseline gap-4">
              <h2 className="font-display text-[22px] font-semibold tracking-wide text-ink-1">Les combattants</h2>
              <p className="ml-auto text-right font-body text-[14px] leading-snug text-ink-3">
                {season.enabled
                  ? `Les ${season.size} de la saison sont tirés au sort au lancement, à découvrir sur l'écran de saison.`
                  : "Choisissez-en un, puis cliquez les cases de l'arbre. Les doublons sont permis."}
              </p>
            </div>

            {/* La palette : dix grandes cartes, le pinceau en or ; sans saison, le nombre de cases déjà prises */}
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
                      aria-label={`${c.name}, ${c.race} · ${c.archetype}${season.enabled ? '' : `, ${n} case${n > 1 ? 's' : ''}`}`}
                      title={`${c.name} — ${c.race}, ${c.archetype}`}
                      className="roster-card roster-card-lg"
                    >
                      <Portrait character={c} side={0} className="roster-card-face" />
                      <span className="roster-card-name">{c.name}</span>
                      {!season.enabled && (
                        <span className="roster-card-count" data-used={n > 0 || undefined}>
                          ×{n}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Le pinceau : qui sera placé au clic (avec la saison, la fiche consultée) */}
            <div className="mt-3 flex items-center gap-4 rounded-(--r-xs) border border-line-1 bg-surface-1/80 p-3">
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

            {/* Les règles du tournoi : une tuile par réglage, trois par ligne */}
            <section className="mt-3" aria-label="Règles">
              <h2 className="font-display text-[22px] font-semibold tracking-wide text-ink-1">Règles</h2>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {rules.map((rule) => (
                  <RuleTile key={rule.id} rule={rule} />
                ))}
              </div>
            </section>

            {/* Compte et actions : Valider est le seul bouton primaire de l'écran */}
            <div className="mt-auto flex items-center gap-3 pt-3">
              {season.enabled ? (
                <p className="min-w-0 flex-1 font-body text-[14px] leading-snug text-ink-2">
                  {season.size} combattants, aller-retour ({seasonMatches} matchs).{' '}
                  {(relics || forge) &&
                    `Chaque victoire rapporte ${relics && forge ? 'une relique puis une forge du dé, tour à tour' : relics ? 'une relique' : 'une forge du dé'}, jusqu'à ${BUILD_REWARDS}${relics && forge ? ' de chaque' : ''}. `}
                  Les {SLOTS} premiers entrent dans l'arbre en têtes de série.
                </p>
              ) : (
                <>
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
                </>
              )}
              <div className="ml-auto">
                <Button
                  variant="primary"
                  size="xl"
                  icon="tournoi"
                  onClick={() => (season.enabled || complete) && onValidate()}
                  disabled={!season.enabled && !complete}
                >
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
