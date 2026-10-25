import { useEffect, useState, type ReactNode } from 'react'
import tournamentImg from '../assets/menu-tournament.jpg'
import { multiplier, percent } from '../game/combat'
import { DIE_FACES } from '../game/events'
import { CHARACTER_IDS, CHARACTERS } from '../game/roster'
import { BRACKET_SEEDS, buildRewards, SEASON_SIZES, type SeasonSize } from '../game/season'
import { sfx } from '../game/sound'
import { fillSlots, SLOTS } from '../game/tournament'
import { Bracket } from './Bracket'
import { Portrait } from './Portrait'
import { BackLink, Button, Glyph, IconButton, SegmentedControl } from './kit'
import type { GlyphName } from './BattlerIcon'
import { TipLayer, useTipLayer, type ShowTip } from './TipLayer'
import { Switch } from './Switch'
import type { Character } from '../game/character'

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

/** Avec la saison, l'arbre de la configuration reste vide : les 16 premiers de la saison le rempliront. */
const EMPTY_BRACKET: null[] = Array(SLOTS).fill(null)

/**
 * Une option de la boîte « Options » : un interrupteur, ou un choix parmi quelques valeurs. La boîte n'est qu'une liste
 * d'options : un réglage de plus est une entrée de plus. `unavailable` : la raison pour laquelle l'option ne se règle
 * pas, écrite à la place de son état.
 */
type Rule = { id: string; label: string; title: string; unavailable?: string; visual?: ReactNode } & (
  | { kind: 'switch'; on: boolean; onToggle: () => void; states: [string, string] }
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

/** Cadre commun des tuiles d'option : le liseré d'or dit « actif ». Grandes tuiles, lisibles sur une télévision. */
const TILE =
  'flex h-16 w-full items-center gap-3 rounded-(--r-sm) border-2 bg-surface-1/90 pl-3 pr-4 text-left shadow-(--shadow-2) transition-colors'

/** Nom et état d'une option, sur deux lignes. */
function RuleText({ label, state, on }: { label: string; state: string; on: boolean }) {
  return (
    <span className="flex min-w-0 flex-col whitespace-nowrap leading-none">
      <span className={`font-display text-[20px] font-semibold ${on ? 'text-gold-200' : 'text-ink-2'}`}>{label}</span>
      <span className={`mt-1 font-body text-[13px] font-bold uppercase tracking-wider ${on ? 'text-good' : 'text-ink-3'}`}>{state}</span>
    </span>
  )
}

/** Glyphe du kit en tête d'une tuile d'option, à la place d'une illustration : or quand l'option est active. */
function TileGlyph({ name, on }: { name: GlyphName; on: boolean }) {
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center ${on ? 'text-gold-300' : 'text-ink-3'}`}>
      <Glyph name={name} size={24} />
    </span>
  )
}

/**
 * Tuile d'une option. Interrupteur : l'illustration s'éteint quand il est coupé, le curseur passe à droite et en or quand
 * il est actif. Choix : le sélecteur segmenté du kit, ou la valeur fixe quand l'option ne se règle pas.
 */
function RuleTile({ rule }: { rule: Rule }) {
  if (rule.kind === 'choice') {
    const active = !rule.unavailable
    return (
      <div title={rule.title} className={`${TILE} ${active ? 'border-gold-500/80' : 'border-line-2 opacity-50'}`}>
        {rule.visual}
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
      className={`${TILE} disabled:cursor-not-allowed disabled:opacity-50 ${
        rule.on ? 'border-gold-500/80' : 'border-line-2 enabled:hover:border-gold-500/50'
      }`}
    >
      {rule.visual}
      <RuleText label={rule.label} state={rule.unavailable ?? (rule.on ? rule.states[0] : rule.states[1])} on={rule.on} />
      <Switch on={rule.on} />
    </button>
  )
}

/**
 * Configuration du tournoi (refonte 0.47.0 ; options dans une boîte en 0.115.0, demande de l'utilisateur) : la grande
 * palette centrale (le « pinceau »), le résumé des options et le lancement. Les options (saison et nombre de
 * combattants, forge du dé, reliques, noms uniques, paris) sont rangées dans une boîte qui s'ouvre par le bouton
 * « Options » de l'en-tête. Sans saison, on choisit un combattant et on clique les cases du premier tour, aux deux
 * extrémités de l'arbre, dont les lignes convergent vers la palette. Avec la saison, l'arbre reste vide (les 16 premiers
 * de la saison le rempliront) et la palette ne sert qu'à consulter : les participants se tirent au lancement. La palette
 * porte aussi le compte et les actions (Compléter, Vider, Valider).
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
  const [optionsOpen, setOptionsOpen] = useState(false)
  const build = buildText(season.enabled, relics, forge)

  // La boîte se ferme aussi par Échap
  useEffect(() => {
    if (!optionsOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOptionsOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [optionsOpen])

  const set = (slot: number, id: string | null) => {
    if (slots[slot] === id) return
    sfx.click()
    const next = [...slots]
    next[slot] = id
    onChange(next)
  }
  const count = (id: string) => slots.filter((s) => s === id).length

  // Le résumé des options, sous la palette : ce qui est actif, en clair
  const summary = [
    season.enabled ? `Saison de ${season.size}, aller-retour (${seasonMatches} matchs)` : `Arbre de ${SLOTS}, sans saison`,
    relics && 'reliques',
    forge && season.enabled && 'forge du dé',
    uniqueNames && 'noms uniques',
    betting.enabled && `paris entre ${betting.names[0]} et ${betting.names[1]}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <TipLayer className="fade-in relative isolate h-full">
      {/* La porte de l'arène, très assombrie : le décor de l'onglet Tournoi, sous l'arbre */}
      <img
        src={tournamentImg}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover"
        style={{ filter: 'brightness(0.2) saturate(0.7)' }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_55%,transparent_20%,rgba(14,11,9,0.85)_100%)]" />

      {/* Titre : au-dessus de l'arbre, qui occupe toute la scène */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-start justify-between px-8 pr-20 pt-5">
        <div>
          <BackLink onClick={onBack}>Retour</BackLink>
          <h1 className="on-illus mt-1 font-display text-[44px] font-bold leading-none tracking-wide text-gold-200">
            Configuration du tournoi
          </h1>
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
            <RosterPalette>
              {(tip) => roster.map((c) => {
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
                      onMouseEnter={(e) => tip?.(<CharacterTooltip character={c} />, e.currentTarget)}
                      onMouseLeave={() => tip?.(null)}
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
            </RosterPalette>

            {/* Les règles en clair, et le bouton qui ouvre la boîte des options */}
            <section className="mt-4 flex items-center gap-5 rounded-(--r-sm) border-2 border-line-2 bg-surface-1/70 py-3 pl-5 pr-3" aria-label="Options">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[22px] font-semibold tracking-wide text-ink-1">Règles du tournoi</h2>
                <p className="mt-1 font-body text-[18px] font-semibold leading-snug text-gold-200">{summary}</p>
                <p className="mt-1 font-body text-[15px] leading-snug text-ink-2">
                  {season.enabled
                    ? `${build ? `${build}. ` : ''}Les ${SLOTS} premiers entrent dans l'arbre en têtes de série.`
                    : relics
                      ? 'Chaque victoire de l’arbre offre au vainqueur une relique à sa portée (hors finale).'
                      : 'Personne ne gagne ni ne porte de relique.'}
                </p>
              </div>
              <Button
                variant="secondary"
                size="md"
                icon="reglages"
                onClick={() => {
                  sfx.click()
                  setOptionsOpen(true)
                }}
                aria-haspopup="dialog"
                title="Saison, nombre de combattants, forge du dé, reliques, noms uniques, paris"
              >
                Options
              </Button>
            </section>

            {/* Compte et actions : Valider est le seul bouton primaire de l'écran */}
            <div className="mt-auto flex items-center gap-3 pt-3">
              {season.enabled ? (
                <span className="flex-1" />
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

      {/* La boîte des options : un menu superposé, fermé par sa croix, par Échap ou par un clic à côté */}
      {optionsOpen && (
        // Le fond assombri et flouté : la boîte se lit comme un menu de jeu posé sur la scène
        <div className="desk-in absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md" onClick={() => setOptionsOpen(false)}>
          <TournamentOptions {...{ betting, onBettingChange, relics, onRelicsChange, forge, onForgeChange, uniqueNames, onUniqueNamesChange, season, onSeasonChange }} onClose={() => setOptionsOpen(false)} />
        </div>
      )}
    </TipLayer>
  )
}

/** Les options du tournoi, celles de la boîte « Options » (`Props`, sans l'arbre ni la navigation). */
type OptionProps = Pick<
  Props,
  'betting' | 'onBettingChange' | 'relics' | 'onRelicsChange' | 'forge' | 'onForgeChange' | 'uniqueNames' | 'onUniqueNamesChange' | 'season' | 'onSeasonChange'
>

/**
 * La construction de la saison, en une phrase (season.ts : une récompense par match, aux premiers matchs de chacun,
 * l'ordre d'un acte de campagne) ; vide sans saison, ou sans reliques ni forge.
 */
function buildText(seasonOn: boolean, relics: boolean, forge: boolean): string {
  const rewards = seasonOn ? buildRewards({ relics, forge }) : []
  if (rewards.length === 0) return ''
  const forges = rewards.filter((k) => k === 'forge').length
  const relicCount = rewards.length - forges
  const list = [forges && `${forges} forges du dé`, relicCount && `${relicCount} reliques`].filter(Boolean).join(' et ')
  return `Une récompense à chacun des ${rewards.length} premiers matchs de chaque combattant, gagné ou perdu (${list}), puis son build est figé`
}

/**
 * La boîte « Options » (0.115.0, demande de l'utilisateur : « une petite box qui s'ouvre avec l'activation des options
 * dedans ») : une tuile par option, deux par ligne, les noms des parieurs quand les paris sont activés, et la règle de
 * la saison en clair. Elle se ferme par sa croix (l'écran la ferme aussi par Échap et par un clic à côté).
 */
export function TournamentOptions({
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
  onClose,
}: OptionProps & { onClose: () => void }) {
  const seasonMatches = season.size * (season.size - 1)
  const build = buildText(season.enabled, relics, forge)
  // La boîte « Options », dans l'ordre d'affichage : la saison et ce qui en dépend, puis le reste
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
      visual: <TileGlyph name="tournoi" on={season.enabled} />,
    },
    {
      kind: 'choice',
      id: 'size',
      label: 'Combattants',
      value: season.size,
      options: SEASON_SIZES.map((n) => ({ value: n, label: String(n), title: `${n} participants, ${n * (n - 1)} matchs de saison` })),
      onChange: (size) => onSeasonChange({ ...season, size: size as SeasonSize }),
      state: `Aller-retour, ${seasonMatches} matchs`,
      fixed: String(SLOTS),
      unavailable: season.enabled ? undefined : 'Avec la saison',
      title: season.enabled
        ? `Les ${season.size} combattants de la saison sont tirés au sort au lancement, en équilibrant le roster`
        : `Sans saison, l'arbre compte ${SLOTS} cases, placées à la main`,
      visual: <TileGlyph name="combattre" on={season.enabled} />,
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
          ? build
          : 'Saison sans forge du dé : chacun garde son dé d’origine',
      // Une face gravée du dé (le cadre arcane de la forge), éteinte quand la forge est coupée
      visual: (
        <span
          className="forge-face shrink-0"
          data-size="sm"
          data-engraved={forge && season.enabled ? '' : undefined}
          style={{ width: 36, height: 36, opacity: forge && season.enabled ? 1 : 0.45 }}
        >
          {DIE_FACES}
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
          ? `${build} ; l'arbre n'en donne plus`
          : 'Chaque victoire de l’arbre offre au vainqueur une relique à sa portée (hors finale)',
      visual: <TileGlyph name="relique" on={relics} />,
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
      visual: <TileGlyph name="chroniques" on={uniqueNames} />,
    },
    {
      kind: 'switch',
      id: 'betting',
      label: 'Paris',
      states: ['Activés', 'Désactivés'],
      on: betting.enabled,
      onToggle: () => onBettingChange({ ...betting, enabled: !betting.enabled }),
      title: betting.enabled
        ? `${betting.names[0]} et ${betting.names[1]} parient des Deniers sur chaque match de l’arbre, cotes cachées jusqu’au règlement`
        : 'Tournoi sans paris',
      visual: <TileGlyph name="parier" on={betting.enabled} />,
    },
  ]
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="Options du tournoi"
      onClick={(e) => e.stopPropagation()}
      className="bracket-panel w-[900px] border-2 border-gold-500/60 bg-surface-1 px-8 pb-8 pt-6 shadow-(--shadow-2)"
    >
      <header className="flex items-center gap-4">
        <h2 className="flex-1 font-display text-[36px] font-bold leading-none tracking-wide text-gold-200">Options du tournoi</h2>
        <IconButton icon="fermer" label="Fermer les options" onClick={onClose} />
      </header>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {rules.map((rule) => (
          <RuleTile key={rule.id} rule={rule} />
        ))}
      </div>
      {/* Les noms des deux parieurs, quand les paris sont activés */}
      {betting.enabled && (
        <div className="mt-4 flex items-center gap-3 font-body text-[18px] text-ink-2">
          <span>Parieurs :</span>
          {([0, 1] as const).map((i) => [
            i === 1 && (
              <span key="et" className="text-ink-3">
                et
              </span>
            ),
            <input
              key={i}
              value={betting.names[i]}
              maxLength={16}
              aria-label={`Parieur ${i + 1}`}
              onChange={(e) => {
                const names: [string, string] = [...betting.names]
                names[i] = e.target.value
                onBettingChange({ ...betting, names })
              }}
              className={`h-12 w-52 rounded-(--r-xs) border-2 bg-surface-1 px-3 font-bold ${i === 0 ? 'border-emerald-400/60 text-emerald-300' : 'border-fuchsia-400/60 text-fuchsia-300'}`}
            />,
          ])}
        </div>
      )}
      <p className="mt-5 font-body text-[16px] leading-snug text-ink-2">
        {season.enabled
          ? `${season.size} combattants tirés au sort, aller-retour (${seasonMatches} matchs). ${build ? `${build}. ` : ''}Les ${SLOTS} premiers entrent dans l'arbre en têtes de série.`
          : `L'arbre seul : ${SLOTS} cases, placées à la main. Pas de forge du dé sans saison.`}
      </p>
    </section>
  )
}

/** La palette, dans le calque d'infobulles de l'écran : chaque carte y ouvre sa fiche au survol. */
function RosterPalette({ children }: { children: (tip: ShowTip | null) => ReactNode }) {
  const tip = useTipLayer()
  return (
    <ul className="mt-3 grid grid-cols-5 justify-items-center gap-x-3 gap-y-3" aria-label="Combattants">
      {children(tip)}
    </ul>
  )
}

/** La fiche d'un combattant au survol de sa carte : identité et caractéristiques, sans ses compétences. */
function CharacterTooltip({ character: c }: { character: Character }) {
  return (
    <div role="tooltip" className="w-80 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-4 py-3 text-left shadow-(--shadow-2)">
      <p className="font-display text-lg font-extrabold leading-tight text-gold-200">{c.name}</p>
      <p className="mt-0.5 font-body text-[14px] text-ink-2">
        {c.race} · {c.archetype}
      </p>
      <div className="codex-divider my-2.5" />
      <p className="font-data text-[14px] leading-snug text-ink-1">
        {c.maxHp} PV · attaque {c.stats.attackMin} à {c.stats.attackMax} · {c.dice > 1 ? `${c.dice} × ` : ''}d{DIE_FACES} · esquive {percent(c.stats.dodgeChance)} · critique{' '}
        {percent(c.stats.critChance)} {multiplier(c.stats.critMultiplier)}
      </p>
    </div>
  )
}
