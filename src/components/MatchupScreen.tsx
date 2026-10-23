import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ARENAS, getArena, RANDOM_ARENA, resolveArena, type Arena, type ArenaChoice } from '../game/arenas'
import type { Character } from '../game/character'
import { SIDE_STYLE, type Pair, type Side } from '../game/combat'
import { RELIC_KINDS, relicKind, type Relic } from '../game/relics'
import { sfx } from '../game/sound'
import { Fighter } from './Fighter'
import { RelicSeal, RelicTooltip } from './RelicSeal'
import { DieBuild } from './DieBuild'
import { StatSheet } from './StatSheet'
import { Button, type GlyphName } from './kit'
import { humansOf, type Bettor, type MatchOdds, type Pick, type Wallets } from '../game/betting'
import { BetSummary, BettingDesk } from './Betting'
import { VsSeal } from './VsSeal'

/*
 * Écran d'affrontement à géométrie fixe (0.99.0, docs/ref/prompt-ecran-affrontement.md) : deux fiches de mêmes
 * dimensions, en miroir exact autour du sceau VS, dont aucune hauteur ne dépend du contenu (nom, dé, reliques). Les
 * cotes des références (1440 × 810) sont portées à la scène (1600 × 900) par 10/9 : une capture en 1440 × 810 retombe
 * sur les références.
 */

/** Largeur d'une fiche, écart entre son bord intérieur et l'axe du sceau VS (px de scène) */
const CARD_WIDTH = 378
const CARD_GAP = 89
/** Haut des fiches ; zone du nom (deux lignes, race · archétype) ; panneau (stats, dé, reliques) */
const CARD_TOP = 159
const NAME_ZONE = 124
const PANEL_HEIGHT = 442
/** Places de la rangée de reliques, et côté d'une relique */
const RELIC_SLOTS = 6
const RELIC_SIZE = 49
/** Rappel des paris au centre : masqué (le centre ne garde que le sceau VS), le compteur reste sur le bouton Parier */
const SHOW_BET_SUMMARY = false
/** Bord extérieur d'une fiche (côté écran), compté depuis le bord de l'écran ; haut de son panneau (px de scène) */
const CARD_OUTER = 800 - CARD_GAP - CARD_WIDTH
const PANEL_TOP = CARD_TOP + NAME_ZONE
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
 * zone du nom, l'écusson, race · archétype et ce qui est au-dessus. Miroir pour le camp droit. Générique : aucune toile
 * large (l'ogre) ne demande de réglage propre.
 */
const FIGHTER_MASK: Record<Side, string> = {
  0: `linear-gradient(to bottom, transparent ${PANEL_TOP}px, #000 ${PANEL_TOP + MASK_FADE}px), linear-gradient(to right, #000 ${CARD_OUTER - MASK_FADE}px, transparent ${CARD_OUTER}px)`,
  1: `linear-gradient(to bottom, transparent ${PANEL_TOP}px, #000 ${PANEL_TOP + MASK_FADE}px), linear-gradient(to left, #000 ${CARD_OUTER - MASK_FADE}px, transparent ${CARD_OUTER}px)`,
}

/** Rang d'un opposant à côté de son nom (lu dans le jeu, App.tsx, jamais recalculé ici) ; null : sans rang */
type Rank = number | null

interface Props {
  fighters: Pair<Character>
  /** Lance le combat animé dans l'arène montrée en fond (celle tirée pour « au hasard ») */
  onPlay: (arena: Arena) => void
  onSimulate: () => void
  onBack: () => void
  /** Bandeau au-dessus du duel, ex. « Quarts de finale · Match 2 » */
  title?: string
  /** Rang de chaque opposant (classement de saison en cours, tête de série dans l'arbre) ; absent en duel libre */
  ranks?: Pair<Rank>
  /** Bouton de retour (secondaire) : « Changer » en duel, « Arbre » en tournoi */
  back?: { label: string; icon: GlyphName }
  /** Cadre du combat : une arène précise ou « au hasard » */
  arena: ArenaChoice
  onArenaChange: (arena: ArenaChoice) => void
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

/** Écran d'affrontement : présente le duel et laisse choisir entre le jouer ou le simuler. */
export function MatchupScreen({
  fighters,
  onPlay,
  onSimulate,
  onBack,
  title = 'Affrontement',
  back = { label: 'Changer', icon: 'changer' },
  arena,
  onArenaChange,
  betting,
  ranks,
}: Props) {
  const [desk, setDesk] = useState(false)
  // « Au hasard » : l'arène est tirée à l'ouverture de l'écran, montrée en fond, et c'est elle que le combat prend.
  // Décor seulement, aucune règle : le hasard de l'interface suffit (`resolveArena`).
  const [drawn] = useState(() => resolveArena(RANDOM_ARENA))
  const shown = arena === RANDOM_ARENA ? drawn : getArena(arena)
  const names: Pair<string> = [fighters[0].name, fighters[1].name]
  // Fracas quand le « VS » s'abat ; le délai est annulé si l'écran est démonté entre-temps.
  useEffect(() => {
    const id = setTimeout(() => sfx.clash(), 550)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="relative h-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_110%,#57534e_0%,#1c1917_45%,#0c0a09_80%)]">
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
        <ArenaSlider value={arena} onChange={onArenaChange} />
      </header>

      {/* Les illustrations, centrées sur leur corps dans l'espace entre le bord de l'écran et la fiche, chacune dans un
          calque de toute la scène masqué au-dessus du panneau, au-delà du bord de la fiche (`FIGHTER_MASK`) : elles passent
          derrière le voile du panneau, jamais sous le nom */}
      {([0, 1] as Side[]).map((side) => (
        <div
          key={`fighter-${side}`}
          className="pointer-events-none absolute inset-0"
          style={{ maskImage: FIGHTER_MASK[side], maskComposite: 'add', WebkitMaskImage: FIGHTER_MASK[side] }}
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
        <MatchupCard key={side} character={fighters[side]} side={side} rank={ranks?.[side] ?? null} />
      ))}

      {/* Le centre : le sceau VS seul, sur l'axe. L'animation d'entrée est sur l'enveloppe : le sceau garde sa forme. */}
      <div className="absolute left-1/2 top-[497px] -translate-x-1/2 -translate-y-1/2">
        <span className="vs-slam flex justify-center">
          {/* Le sceau des références (96 px en 1440 × 810), porté à la scène */}
          <span className="flex scale-[1.111]">
            <VsSeal />
          </span>
        </span>
        {SHOW_BET_SUMMARY && betting && (
          <div className="absolute left-1/2 top-full mt-6 -translate-x-1/2">
            <BetSummary wallets={betting.wallets} odds={betting.odds} fighterNames={names} />
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 top-[833px] flex -translate-y-1/2 items-center justify-center gap-6">
        <Button variant="secondary" size="md" icon={back.icon} onClick={onBack} className="w-56">
          {back.label}
        </Button>
        <Button variant="primary" size="xl" icon="combattre" onClick={() => onPlay(shown)} className="w-[352px]">
          Jouer
        </Button>
        {betting && (
          <Button
            variant="secondary"
            size="md"
            icon="parier"
            onClick={() => {
              sfx.click()
              setDesk(true)
            }}
            title="Ouvre le guichet du match : chaque joueur peut parier avant le combat"
            className="w-56"
          >
            Parier
            {betting.odds &&
              ` ${humansOf(betting.wallets).filter((b) => betting.wallets.bets[betting.odds!.key]?.[b]).length}/${humansOf(betting.wallets).length}`}
          </Button>
        )}
        <Button
          variant="secondary"
          size="md"
          icon="simuler"
          onClick={onSimulate}
          title="Résout le combat instantanément, avec les mêmes règles, et affiche les scores"
          className="w-56"
        >
          Simuler
        </Button>
      </div>

      {betting && desk && (
        <BettingDesk
          wallets={betting.wallets}
          odds={betting.odds}
          fighters={fighters}
          onBet={betting.onBet}
          onCancel={betting.onCancel}
          onReset={betting.onReset}
          onClose={() => {
            sfx.click()
            setDesk(false)
          }}
        />
      )}
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

/**
 * La fiche d'un combattant, à géométrie fixe : zone du nom (124 px, alignée en bas), panneau de 442 px (stats, dé de
 * douze emplacements, rangée de six reliques), chaque bloc à sa hauteur imposée. Les deux fiches ont le même cadre, en
 * miroir autour de l'axe ; seuls le nom et l'écusson passent du côté extérieur.
 */
function MatchupCard({ character, side, rank }: { character: Character; side: Side; rank: Rank }) {
  const style = SIDE_STYLE[side]
  const outer = side === 0 ? 'left' : 'right'
  return (
    <div
      className={`matchup-card absolute z-20 ${side === 0 ? 'slide-in-left' : 'slide-in-right'}`}
      data-side={side}
      style={{ top: CARD_TOP, width: CARD_WIDTH, left: side === 0 ? 800 - CARD_GAP - CARD_WIDTH : 800 + CARD_GAP }}
    >
      {/* Le nom : deux lignes au plus, collé au panneau ; l'écusson au bord extérieur, sur sa ligne de base. Aucune
          illustration ne passe dessous (`FIGHTER_MASK`) : il se lit sur le fond, sans voile */}
      <div className={`relative flex items-end gap-[13px] pb-[12px] ${side === 1 ? 'flex-row-reverse text-right' : ''}`} style={{ height: NAME_ZONE }}>
        {rank !== null && <RankBadge rank={rank} />}
        <div className="relative min-w-0 flex-1">
          <FighterName name={character.name} className={style.accent} align={outer} />
          <p className="matchup-race truncate font-body text-[15px] leading-5 text-ink-2">
            {character.race} · {character.archetype}
          </p>
        </div>
      </div>
      <div className={`matchup-panel fighter-panel ${side === 1 ? 'side-b' : 'side-a'} flex flex-col px-[18px]`} style={{ height: PANEL_HEIGHT }}>
        {/* Mêmes barres que sur l'écran de sélection, à la couleur du camp, lignes réparties sur une hauteur fixe */}
        <StatSheet character={character} barClass={style.bar} trackClass={style.track} className="mt-[13px] h-[160px] shrink-0 justify-around" />
        <div className="matchup-rule mt-[12px]" />
        <div className="mt-[10px]">
          <DieBuild character={character} />
        </div>
        <div className="matchup-rule mt-[16px]" />
        {/* Reliques portées (tournoi, saison, campagne) : elles comptent dans les cotes, on les montre aux parieurs */}
        <header className="matchup-section-head mt-[11px]">
          <span>Reliques</span>
          <span className="matchup-section-count">{character.relics.length}</span>
        </header>
        <RelicShelf relics={character.relics} />
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
                  <span className="ml-auto font-body text-[12px] font-bold uppercase tracking-wider text-gold-300">{RELIC_KINDS[relicKind(r)].label}</span>
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
