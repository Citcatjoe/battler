import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ARENAS, getArena, RANDOM_ARENA, resolveArena, type Arena, type ArenaChoice } from '../game/arenas'
import type { Character } from '../game/character'
import { SIDE_STYLE, type Pair, type Side } from '../game/combat'
import { MASTERIES } from '../game/masteries'
import type { Relic } from '../game/relics'
import { CHARACTERS } from '../game/roster'
import { sfx } from '../game/sound'
import { Fighter } from './Fighter'
import { MasteryIcon } from './Icon'
import { PortraitTile } from './Portrait'
import { RelicSeal, RelicTooltip } from './RelicSeal'
import { DieBuild } from './DieBuild'
import { StatSheet } from './StatSheet'
import { Tabs } from './Tabs'
import { BackLink, Button, SquareButton } from './kit'
import { humansOf, type Bettor, type MatchOdds, type Pick, type Wallets } from '../game/betting'
import { BetSummary, BettingDesk } from './Betting'
import { VsSeal } from './VsSeal'

/*
 * L'écran d'affrontement, unique (0.100.0, docs/ref/prompt-affrontement-et-tournoi.md) : le duel, le tournoi, la saison et
 * la campagne y passent avant chaque combat. Deux fiches de même largeur, en miroir exact autour du sceau VS, dont
 * aucune hauteur ne dépend du contenu (nom, dé, reliques) ; seul le contexte (`mode`) change leur hauteur et le bas de
 * l'écran : en duel, fiches sans reliques et sélecteur de combattants dessous ; ailleurs, tête de série, forge, reliques.
 * Les cotes des références (1440 × 810) sont portées à la scène (1600 × 900) par 10/9 : une capture en 1440 × 810
 * retombe sur les références (affrontement-duel.png, affrontement-tournoi.png).
 */

/** Contexte de l'affrontement, calculé par App.tsx (campagne, saison, arbre, sinon duel) */
export type MatchupMode = 'duel' | 'tournament' | 'season' | 'campaign'

/** Lien de retour, en haut à gauche : vers le contexte d'origine (l'arbre pour le tournoi, la carte pour la campagne) */
const BACK_LABEL: Record<MatchupMode, string> = { duel: 'Menu', tournament: 'Tournoi', season: 'Saison', campaign: 'Carte' }

/**
 * Parier en duel : retiré (décision de l'utilisateur, 0.100.0) ; on parie là où une bourse de tournoi existe. Le code du
 * guichet de duel reste (App.tsx garde la bourse de duel) : passer à `true` le rouvre.
 */
export const DUEL_BETTING = false

/** Largeur d'une fiche, écart entre son bord intérieur et l'axe du sceau VS (px de scène) */
const CARD_WIDTH = 378
const CARD_GAP = 89
/** Bord extérieur d'une fiche (côté écran), compté depuis le bord de l'écran (px de scène) */
const CARD_OUTER = 800 - CARD_GAP - CARD_WIDTH

/**
 * Hauteurs d'une fiche selon le contexte (px de scène) : haut de la fiche, zone du nom (deux lignes, puis ses deux maîtrises),
 * panneau (stats, dé, et reliques hors duel), centre du sceau VS. Le duel (96 px de nom, sans reliques) remonte et
 * raccourcit ses fiches pour laisser la place au sélecteur de combattants.
 */
interface Layout {
  cardTop: number
  nameZone: number
  panelHeight: number
  vsCenter: number
}
const DUEL_LAYOUT: Layout = { cardTop: 131, nameZone: 107, panelHeight: 339, vsCenter: 408 }
const RUN_LAYOUT: Layout = { cardTop: 159, nameZone: 124, panelHeight: 442, vsCenter: 497 }
/** Centre des boutons carrés (Parier, Simuler) sous le centre du sceau VS */
const ACTIONS_BELOW_VS = 102
/** Places de la rangée de reliques, et côté d'une relique */
const RELIC_SLOTS = 6
const RELIC_SIZE = 49
/** Rappel des paris au centre : masqué (le centre ne garde que le sceau VS), le compteur reste sur le bouton Parier */
const SHOW_BET_SUMMARY = false
/** Sélecteur de combattants du duel : cadre (px de scène), au-dessus du bouton Combattre */
const PICKER = { left: 368, top: 608, width: 864 }
/**
 * Axe des illustrations : le milieu de l'espace entre le bord de l'écran et la fiche (px de scène). Le combattant y est
 * centré sur son corps (`anchor="body"`) : il ne recule plus hors de l'écran, et une toile large passe derrière le voile
 * du panneau. `FIGHTER_BIAS` le décale un peu vers le bord.
 */
const FIGHTER_AXIS = CARD_OUTER / 2
const FIGHTER_BIAS = 12
/** Fondu du masque des illustrations (px de scène), pris hors de la zone protégée */
const MASK_FADE = 16
/**
 * Masque du calque d'une illustration, en coordonnées de scène (règle n° 7 du brief : jamais sous le nom) : union de deux
 * couches, opaque sous le haut du panneau (derrière son voile) et opaque côté écran jusqu'au bord extérieur de la fiche.
 * L'illustration disparaît donc dans le seul rectangle « au-delà du bord de la fiche et au-dessus du panneau » : la
 * zone du nom, l'écusson, ses maîtrises et ce qui est au-dessus. Miroir pour le camp droit. Générique : aucune toile
 * large (l'ogre) ne demande de réglage propre.
 */
const fighterMask = (side: Side, panelTop: number) =>
  `linear-gradient(to bottom, transparent ${panelTop}px, #000 ${panelTop + MASK_FADE}px), linear-gradient(to ${side === 0 ? 'right' : 'left'}, #000 ${CARD_OUTER - MASK_FADE}px, transparent ${CARD_OUTER}px)`

/** Rang d'un opposant à côté de son nom (lu dans le jeu, App.tsx, jamais recalculé ici) ; null : sans rang */
type Rank = number | null

interface Props {
  /** Contexte : duel (sélecteur, kit de base), tournoi, saison ou campagne (progression) */
  mode: MatchupMode
  fighters: Pair<Character>
  /** Lance le combat animé dans l'arène montrée en fond (celle tirée pour « au hasard ») */
  onPlay: (arena: Arena) => void
  onSimulate: () => void
  /** Retour au contexte d'origine (lien en haut à gauche) */
  onBack: () => void
  /** Duel : un portrait choisi dans le sélecteur, pour un camp */
  onPick?: (side: Side, character: Character) => void
  /** Intitulé au-dessus de l'arène, ex. « Quarts de finale · Match 2 » ; « Duel » par défaut en duel */
  title?: string
  /** Rang de chaque opposant (classement de saison en cours, tête de série dans l'arbre) ; jamais en duel */
  ranks?: Pair<Rank>
  /** Cadre du combat : une arène précise ou « au hasard » */
  arena: ArenaChoice
  onArenaChange: (arena: ArenaChoice) => void
  /** Campagne : l'arène de l'adversaire, chez lui (`homeArena`) ; elle remplace le choix et son sélecteur */
  home?: Arena
  /** Paris entre deux observateurs (docs/PARIS.md) ; absent : pas de guichet */
  betting?: {
    wallets: Wallets
    /** Cotes du match ; null tant qu'elles sont en calcul */
    odds: MatchOdds | null
    /** Renvoie la raison d'un refus, ou null si le pari est posé */
    onBet: (bettor: Bettor, pick: Pick, choice: number) => string | null
    onCancel: (bettor: Bettor) => void
    /** Duel simple : remettre les bourses à zéro */
    onReset?: () => void
  }
}

/** Écran d'affrontement : présente le combat et laisse choisir entre le jouer ou le simuler. */
export function MatchupScreen({
  mode,
  fighters,
  onPlay,
  onSimulate,
  onBack,
  onPick,
  title = mode === 'duel' ? 'Duel' : 'Affrontement',
  arena,
  onArenaChange,
  home,
  betting,
  ranks,
}: Props) {
  const [desk, setDesk] = useState(false)
  const duel = mode === 'duel'
  const layout = duel ? DUEL_LAYOUT : RUN_LAYOUT
  const panelTop = layout.cardTop + layout.nameZone
  // Le guichet : seulement là où une bourse existe, jamais en duel (`DUEL_BETTING`)
  const bets = betting && (!duel || DUEL_BETTING) ? betting : undefined
  // « Au hasard » : l'arène est tirée à l'ouverture de l'écran, montrée en fond, et c'est elle que le combat prend.
  // Décor seulement, aucune règle : le hasard de l'interface suffit (`resolveArena`).
  const [drawn] = useState(() => resolveArena(RANDOM_ARENA))
  const shown = home ?? (arena === RANDOM_ARENA ? drawn : getArena(arena))
  const names: Pair<string> = [fighters[0].name, fighters[1].name]
  // Fracas quand le « VS » s'abat ; le délai est annulé si l'écran est démonté entre-temps.
  useEffect(() => {
    const id = setTimeout(() => sfx.clash(), 550)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="relative h-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_110%,#57534e_0%,#1c1917_45%,#0c0a09_80%)]" data-mode={mode}>
      {/* L'arène du combat en fond, en direct : son illustration à 45 % sous un voile sombre ; « Au hasard » montre celle
          qui a été tirée */}
      <img
        key={shown.id}
        src={shown.image}
        alt=""
        draggable={false}
        className="fade-in pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-45"
        style={{ objectPosition: shown.focus }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(12,10,9,0.5)_0%,rgba(12,10,9,0.7)_55%,rgba(12,10,9,0.9)_100%)]" />
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-side-a/10 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-side-b/10 to-transparent" />

      <header className="absolute inset-x-0 top-[26px] flex flex-col items-center gap-[14px]">
        <p className="text-sm font-bold uppercase leading-5 tracking-[0.5em] text-stone-500">{title}</p>
        {home ? <HomeArenaLabel arena={home} /> : <ArenaSlider value={arena} onChange={onArenaChange} />}
      </header>
      {/* Retour au contexte d'origine, en haut à gauche (le son est en haut à droite) */}
      <BackLink onClick={onBack} className="absolute left-10 top-[36px] z-30">
        {BACK_LABEL[mode]}
      </BackLink>

      {/* Les illustrations, centrées sur leur corps dans l'espace entre le bord de l'écran et la fiche, chacune dans un
          calque de toute la scène masqué au-dessus du panneau, au-delà du bord de la fiche (`fighterMask`) : elles passent
          derrière le voile du panneau, jamais sous le nom */}
      {([0, 1] as Side[]).map((side) => (
        <div
          key={`fighter-${side}`}
          className="pointer-events-none absolute inset-0"
          style={{ maskImage: fighterMask(side, panelTop), maskComposite: 'add', WebkitMaskImage: fighterMask(side, panelTop) }}
        >
          <div
            className={`absolute bottom-[117px] h-[667px] ${side === 0 ? 'slide-in-left' : 'slide-in-right'}`}
            style={{ [side === 0 ? 'left' : 'right']: FIGHTER_AXIS - FIGHTER_BIAS }}
          >
            <div className={`h-full ${side === 0 ? '-translate-x-1/2' : 'translate-x-1/2'}`}>
              <Fighter character={fighters[side]} side={side} anchor="body" />
            </div>
          </div>
        </div>
      ))}

      {([0, 1] as Side[]).map((side) => (
        <MatchupCard
          key={side}
          character={fighters[side]}
          rival={fighters[side === 0 ? 1 : 0]}
          side={side}
          rank={duel ? null : (ranks?.[side] ?? null)}
          layout={layout}
          relics={!duel}
        />
      ))}

      {/* Le centre : le sceau VS seul, sur l'axe. L'animation d'entrée est sur l'enveloppe : le sceau garde sa forme. */}
      <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: layout.vsCenter }}>
        <span className="vs-slam flex justify-center">
          {/* Le sceau des références (96 px en 1440 × 810), porté à la scène */}
          <span className="flex scale-[1.111]">
            <VsSeal />
          </span>
        </span>
        {SHOW_BET_SUMMARY && bets && (
          <div className="absolute left-1/2 top-full mt-6 -translate-x-1/2">
            <BetSummary wallets={bets.wallets} odds={bets.odds} fighterNames={names} />
          </div>
        )}
      </div>

      {/* Actions secondaires sous le VS, en boutons carrés sans texte (infobulle) : Parier (avec ses mises), Simuler */}
      <div
        className="matchup-actions absolute left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-[17px]"
        style={{ top: layout.vsCenter + ACTIONS_BELOW_VS }}
      >
        {bets && (
          <SquareButton
            icon="parier"
            label="Parier"
            badge={`${bets.odds ? humansOf(bets.wallets).filter((b) => bets.wallets.bets[bets.odds!.key]?.[b]).length : 0}/${humansOf(bets.wallets).length}`}
            onClick={() => {
              sfx.click()
              setDesk(true)
            }}
          />
        )}
        <SquareButton icon="simuler" label="Simuler le combat" onClick={onSimulate} />
      </div>

      {duel && <FighterPicker fighters={fighters} onPick={onPick} />}

      {/* Le combat : le bouton primaire, centré en bas, à la même place dans tous les contextes */}
      <div className="absolute inset-x-0 top-[833px] flex -translate-y-1/2 justify-center">
        <Button variant="primary" size="xl" icon="combattre" onClick={() => onPlay(shown)} className="w-[398px]">
          Combattre
        </Button>
      </div>

      {bets && desk && (
        <BettingDesk
          wallets={bets.wallets}
          odds={bets.odds}
          fighters={fighters}
          onBet={bets.onBet}
          onCancel={bets.onCancel}
          onReset={bets.onReset}
          onClose={() => {
            sfx.click()
            setDesk(false)
          }}
        />
      )}
    </div>
  )
}

/** Onglets du sélecteur : le camp qui choisit, avec la pastille de sa couleur */
const PICKER_TABS = [
  { id: 'a', label: 'Gauche', lead: <span aria-hidden className="matchup-picker-dot" data-side="a" /> },
  { id: 'b', label: 'Droite', lead: <span aria-hidden className="matchup-picker-dot" data-side="b" /> },
] as const
const SIDE_OF = { a: 0, b: 1 } as const

/**
 * Le sélecteur de combattants du duel, sous les fiches : onglets Gauche / Droite (le camp qui choisit), « Au hasard »
 * pour ce camp, puis un portrait par personnage, sans nom (en infobulle). Choisir un portrait le donne au camp actif,
 * puis la main passe en face. Le portrait choisi par un camp porte un cadre à sa couleur et un repère dans son coin ;
 * les deux camps peuvent choisir le même. Au-delà de dix, la rangée défile à l'horizontale.
 */
function FighterPicker({ fighters, onPick }: { fighters: Pair<Character>; onPick?: (side: Side, character: Character) => void }) {
  const [active, setActive] = useState<Side>(0)
  const give = (side: Side, character: Character) => {
    if (fighters[side].id === character.id) return false
    sfx.click()
    onPick?.(side, character)
    return true
  }
  const pick = (character: Character) => {
    if (give(active, character)) setActive(active === 0 ? 1 : 0)
  }
  const pickRandom = () => {
    const others = CHARACTERS.filter((c) => c.id !== fighters[active].id)
    give(active, others[Math.floor(Math.random() * others.length)])
  }
  return (
    <div className="matchup-picker absolute z-20" style={PICKER}>
      <div className="flex items-center justify-between">
        <Tabs tabs={PICKER_TABS} value={active === 0 ? 'a' : 'b'} onChange={(id) => setActive(SIDE_OF[id])} className="matchup-picker-tabs" />
        <Button variant="secondary" size="sm" icon="hasard" onClick={pickRandom} title={`Un combattant au hasard pour le camp ${active === 0 ? 'de gauche' : 'de droite'}`}>
          Au hasard
        </Button>
      </div>
      <ul className="matchup-picker-row" aria-label="Combattants">
        {CHARACTERS.map((c) => {
          const a = fighters[0].id === c.id
          const b = fighters[1].id === c.id
          return (
            <li key={c.id} className="shrink-0">
              <PortraitTile
                character={c}
                side={0}
                state={a || b ? 'selected' : 'idle'}
                selection={a ? 'a' : b ? 'b' : 'gold'}
                data-both={(a && b) || undefined}
                onClick={() => pick(c)}
                title={c.name}
                aria-label={`${c.name}${a ? ', à gauche' : ''}${b ? ', à droite' : ''}`}
                className="matchup-picker-tile"
              >
                {a && <span aria-hidden className="matchup-picker-mark" data-side="a" />}
                {b && <span aria-hidden className="matchup-picker-mark" data-side="b" />}
              </PortraitTile>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Arènes proposées, dans l'ordre du sélecteur : chacune, puis « au hasard ». */
const ARENA_CHOICES: readonly ArenaChoice[] = [...ARENAS.map((a) => a.id), RANDOM_ARENA]

/** Sélecteur d'arène ‹ ARÈNE nom 3 / 9 › : change le décor en fond de l'écran. Flèches du clavier acceptées. */
function ArenaSlider({ value, onChange }: { value: ArenaChoice; onChange: (arena: ArenaChoice) => void }) {
  const index = Math.max(0, ARENA_CHOICES.indexOf(value))
  const step = (delta: number) => {
    sfx.click()
    onChange(ARENA_CHOICES[(index + delta + ARENA_CHOICES.length) % ARENA_CHOICES.length])
  }
  // Les flèches gauche/droite parcourent les arènes.
  const stepRef = useRef(step)
  stepRef.current = step
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') stepRef.current(-1)
      if (e.key === 'ArrowRight') stepRef.current(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex items-center gap-[14px]" role="group" aria-label="Arène">
      <button type="button" onClick={() => step(-1)} aria-label="Arène précédente" title="Arène précédente" className="bt-iconbtn bt-iconbtn--sm text-lg">
        ‹
      </button>
      {/* Largeur fixe, celle de la plus longue arène : les flèches ne bougent pas d'une arène à l'autre */}
      <p className="flex w-[440px] items-baseline justify-center gap-4">
        <span className="matchup-arena-label">Arène</span>
        <span key={value} className="matchup-arena-name fade-in">
          {value === RANDOM_ARENA ? 'Au hasard' : getArena(value).name}
        </span>
        <span className="matchup-arena-index">
          {index + 1} / {ARENA_CHOICES.length}
        </span>
      </p>
      <button type="button" onClick={() => step(1)} aria-label="Arène suivante" title="Arène suivante" className="bt-iconbtn bt-iconbtn--sm text-lg">
        ›
      </button>
    </div>
  )
}

/** L'arène imposée d'une rencontre de campagne, à la place du sélecteur : son lieu-dit et sa région, sans flèches. */
function HomeArenaLabel({ arena }: { arena: Arena }) {
  return (
    <p className="flex h-[36px] items-baseline justify-center gap-4" aria-label="Arène">
      <span className="matchup-arena-label">Arène</span>
      <span className="matchup-arena-name">{arena.name}</span>
      <span className="matchup-arena-index">{arena.region}</span>
    </p>
  )
}

/**
 * La fiche d'un combattant, à géométrie fixe : zone du nom (alignée en bas), panneau (stats comparées à l'adversaire, dé
 * de douze emplacements, et hors duel la rangée de six reliques), chaque bloc à sa hauteur imposée (`Layout`). Les deux
 * fiches ont le même cadre, en miroir autour de l'axe ; seuls le nom et l'écusson passent du côté extérieur.
 */
function MatchupCard({
  character,
  rival,
  side,
  rank,
  layout,
  relics,
}: {
  character: Character
  rival: Character
  side: Side
  rank: Rank
  layout: Layout
  /** Section Reliques (tournoi, saison, campagne) ; absente en duel, pas même « Aucune relique » */
  relics: boolean
}) {
  const style = SIDE_STYLE[side]
  const outer = side === 0 ? 'left' : 'right'
  return (
    <div
      className={`matchup-card absolute z-20 ${side === 0 ? 'slide-in-left' : 'slide-in-right'}`}
      data-side={side}
      style={{ top: layout.cardTop, width: CARD_WIDTH, left: side === 0 ? CARD_OUTER : 800 + CARD_GAP }}
    >
      {/* Le nom : deux lignes au plus, collé au panneau ; l'écusson au bord extérieur, sur sa ligne de base. Aucune
          illustration ne passe dessous (`fighterMask`) : il se lit sur le fond, sans voile */}
      <div className={`relative flex items-end gap-[13px] pb-[12px] ${side === 1 ? 'flex-row-reverse text-right' : ''}`} style={{ height: layout.nameZone }}>
        {rank !== null && <RankBadge rank={rank} />}
        <div className="relative min-w-0 flex-1">
          <FighterName name={character.name} className={style.accent} align={outer} />
          {/* Ses deux maîtrises avec leurs emblèmes (U5, docs/MAITRISES.md § 12) ; race et archétype restent au compendium */}
          <p className={`matchup-race flex items-center gap-2 font-body text-[15px] font-bold leading-5 text-ink-1 ${side === 1 ? 'justify-end' : ''}`} aria-label="Maîtrises">
            {character.definition.masteries.map((id, k) => (
              <span key={id} className="flex items-center gap-1.5">
                {k > 0 && <span className="mr-0.5 font-normal text-ink-3">·</span>}
                <MasteryIcon id={id} name={MASTERIES[id].name} className="h-6 w-6 text-[13px]" />
                {MASTERIES[id].name}
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className={`matchup-panel fighter-panel ${side === 1 ? 'side-b' : 'side-a'} flex flex-col px-[18px]`} style={{ height: layout.panelHeight }}>
        {/* Barres à la couleur du camp, lignes réparties sur une hauteur fixe ; le meilleur des deux surligné par ligne */}
        <StatSheet
          character={character}
          barClass={style.bar}
          trackClass={style.track}
          compare={{ rival, side }}
          className="mt-[13px] h-[160px] shrink-0 justify-around"
        />
        <div className="matchup-rule mt-[12px]" />
        <div className="mt-[10px]">
          <DieBuild character={character} />
        </div>
        {relics && (
          <>
            <div className="matchup-rule mt-[16px]" />
            {/* Reliques portées : elles comptent dans les cotes, on les montre aux parieurs */}
            <header className="matchup-section-head mt-[11px]">
              <span>Reliques</span>
              <span className="matchup-section-count">{character.relics.length}</span>
            </header>
            <RelicShelf relics={character.relics} />
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Le nom d'un combattant : deux lignes au plus, alignées en bas ; au-delà, coupé au dernier mot qui tient, suivi de « … »,
 * et le nom complet en infobulle peinte. La coupe se fait mot à mot sur un double invisible du titre (même police, même
 * largeur), une fois la police chargée : elle est la même à gauche et à droite (le `line-clamp` de Firefox coupait un nom
 * aligné à droite au milieu d'un mot, « Reven… »). Le `line-clamp` reste en garde-fou pour un mot seul trop long.
 */
function FighterName({ name, className, align }: { name: string; className: string; align: 'left' | 'right' }) {
  const probe = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(name)
  useLayoutEffect(() => {
    let live = true
    const measure = () => {
      const el = probe.current
      if (!live || !el) return
      const lines = (text: string) => {
        el.textContent = text
        return Math.round(el.offsetHeight / parseFloat(getComputedStyle(el).lineHeight))
      }
      const words = name.split(' ')
      let fit = name
      for (let n = words.length - 1; n > 0 && lines(fit) > 2; n--) fit = `${words.slice(0, n).join(' ')}…`
      el.textContent = ''
      setShown(fit)
    }
    measure()
    void document.fonts?.ready.then(measure)
    return () => {
      live = false
    }
  }, [name])
  const clipped = shown !== name
  return (
    <div className={`group relative ${clipped ? 'cursor-help' : ''}`}>
      <span ref={probe} aria-hidden className="matchup-name pointer-events-none invisible absolute inset-x-0 top-0 block" />
      <h2 className={`matchup-name on-illus line-clamp-2 ${className}`}>
        {shown}
      </h2>
      {clipped && (
        <div
          role="tooltip"
          className={`pointer-events-none invisible absolute top-full z-[70] mt-2 w-80 rounded-(--r-sm) border border-line-2 bg-surface-1/95 px-4 py-3 text-left font-display text-lg font-extrabold leading-tight text-ink-1 opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover:visible group-hover:opacity-100 ${align === 'left' ? 'left-0' : 'right-0'}`}
        >
          {name}
        </div>
      )}
    </div>
  )
}

/**
 * La rangée de reliques : six places de 49 px, les objets peints posés sur leur ombre, sans cadre. Au-delà de six,
 * cinq reliques puis « +N » en or, les reliques cachées en infobulle. Sans relique : « Aucune relique », à la même hauteur.
 */
function RelicShelf({ relics }: { relics: readonly Relic[] }) {
  if (relics.length === 0) return <p className="matchup-relics-none mt-[4px]">Aucune relique</p>
  const overflow = relics.length > RELIC_SLOTS
  const shown = overflow ? relics.slice(0, RELIC_SLOTS - 1) : relics
  const hidden = overflow ? relics.slice(RELIC_SLOTS - 1) : []
  return (
    <ul className="matchup-relics mt-[4px]" aria-label="Reliques">
      {shown.map((r, k) => (
        <li key={r.id} className="group/relic relative cursor-help hover:z-[70]" aria-label={r.name}>
          <RelicSeal relic={r} size={RELIC_SIZE} />
          <RelicTooltip relic={r} placement="above" align={k < RELIC_SLOTS / 2 ? 'left' : 'right'} />
        </li>
      ))}
      {overflow && (
        <li className="group/relic relative flex cursor-help items-center justify-center hover:z-[70]" aria-label={`${hidden.length} autres reliques`}>
          <span className="matchup-relics-more">+{hidden.length}</span>
          <div
            role="tooltip"
            className="pointer-events-none invisible absolute bottom-full right-0 z-[70] mb-3 w-80 rounded-(--r-sm) border border-gold-500/60 bg-surface-1/95 px-4 py-3 text-left opacity-0 shadow-(--shadow-2) transition-opacity duration-150 group-hover/relic:visible group-hover/relic:opacity-100"
          >
            <span className="block font-display text-lg font-extrabold leading-tight text-ink-1">Autres reliques</span>
            <ul className="mt-2 flex flex-col gap-1.5">
              {hidden.map((r) => (
                <li key={r.id} className="flex items-center gap-2 font-body text-[15px] font-bold leading-tight text-ink-1">
                  <RelicSeal relic={r} size={32} />
                  {r.name}
                </li>
              ))}
            </ul>
          </div>
        </li>
      )}
    </ul>
  )
}

/** Le rang à côté du nom : son chiffre dans un écusson d'or, seul, lisible de loin. */
function RankBadge({ rank }: { rank: number }) {
  return (
    <span className="matchup-rank">
      <span className="matchup-rank-num">{rank}</span>
    </span>
  )
}
