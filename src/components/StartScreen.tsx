import { useState } from 'react'
import menuImg from '../assets/menu-duel.jpg'
import tournamentImg from '../assets/menu-tournament.jpg'
import type { Character } from '../game/character'
import { SIDE_STYLE, type Pair, type Side } from '../game/combat'
import { CHARACTERS } from '../game/roster'
import { sfx } from '../game/sound'
import { Fighter } from './Fighter'
import { Portrait } from './Portrait'
import { StatSheet } from './StatSheet'
import { SkillDice } from './SkillDice'
import { Icon } from './Icon'
import { BackLink, Button, IconButton } from './kit'
import { VsSeal } from './VsSeal'

interface Props {
  initial: Pair<Character>
  onStart: (fighters: Pair<Character>) => void
  /** Ouvre la fiche d'un personnage ; la sélection en cours est conservée */
  onOpenCharacter: (id: string, current: Pair<Character>) => void
  onOpenRecords: (current: Pair<Character>) => void
  /** Compendium (personnages, bonus et malus…) ; la sélection en cours est conservée */
  onOpenCompendium: (current: Pair<Character>) => void
  /** Choisi sur l'écran d'accueil : sélection du duel ou présentation du tournoi */
  mode: GameMode
  /** Retour à l'écran d'accueil */
  onHome: () => void
  /** Tournoi en cours : progression affichée en mode tournoi */
  tournamentProgress: string | null
  onNewTournament: () => void
  onResumeTournament: () => void
}

export type GameMode = 'duel' | 'tournament'

export function StartScreen(props: Props) {
  const { initial, onStart, onOpenCharacter, onOpenRecords, onOpenCompendium, mode, onHome } = props
  const roster = CHARACTERS
  const [picked, setPicked] = useState<Pair<string>>([initial[0].id, initial[1].id])
  const fighters = picked.map((id) => roster.find((c) => c.id === id)!) as Pair<Character>
  /** Camp qui choisit sur le rail (curseur de jeu de combat) : il passe à l'autre après chaque choix */
  const [active, setActive] = useState<Side>(0)

  const pick = (side: Side, id: string) => {
    if (picked[side] === id) return
    sfx.click()
    const next: Pair<string> = [...picked]
    next[side] = id
    setPicked(next)
  }

  /** Choix sur le rail : pour le camp actif, puis le curseur passe en face */
  const pickOnRail = (id: string) => {
    pick(active, id)
    if (picked[active] !== id) setActive(active === 0 ? 1 : 0)
  }

  const pickRandom = (side: Side) => {
    const others = roster.filter((c) => c.id !== picked[side])
    pick(side, others[Math.floor(Math.random() * others.length)].id)
  }

  return (
    <div className="fade-in relative isolate flex h-full flex-col items-center gap-5 px-8 py-8">
      {mode === 'tournament' ? (
        <>
          {/* Porte de l'arène vue du parvis : la porte (30 % de la largeur) éclaire le champion à contre-jour */}
          <img
            src={tournamentImg}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-[50%_50%]"
            style={{ filter: 'brightness(0.8) saturate(0.95)' }}
          />
          {/* Moitié droite assombrie pour le texte, coins en vignettage */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-l from-stone-950/90 via-stone-950/55 via-45% to-transparent to-70%" />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_30%_60%,transparent_35%,rgba(12,10,9,0.75)_100%)]" />
        </>
      ) : (
        <>
          {/* Décor : assombri, avec les bords encore plus sombres pour que les fiches restent lisibles */}
          <img
            src={menuImg}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-[50%_45%]"
            style={{ filter: 'brightness(0.6) saturate(0.9)' }}
          />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_42%,transparent_25%,rgba(12,10,9,0.8)_100%)]" />
        </>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[30%] bg-gradient-to-t from-stone-950/85 to-transparent" />
      <IconButton onClick={() => onOpenRecords(fighters)} icon="statistiques" label="Statistiques" className="absolute left-4 top-4" />
      {/* Accès provisoire au compendium : son intégration définitive sur l'accueil reste à définir */}
      <IconButton onClick={() => onOpenCompendium(fighters)} icon="compendium" label="Compendium" className="absolute left-20 top-4" />
      <BackLink onClick={onHome} className="absolute left-36 top-4 z-20">
        Menu
      </BackLink>
      <header className="relative z-20 text-center">
        <h1 className="font-display text-6xl font-extrabold tracking-widest text-amber-200 drop-shadow-[0_4px_0_#78350f]">
          BATTLER
        </h1>
      </header>

      {mode === 'tournament' ? (
        <TournamentIntro {...props} />
      ) : (
        <>
          <div className="grid min-h-0 w-full flex-1 grid-cols-[1fr_auto_1fr] items-center gap-6">
            <SidePanel
              side={0}
              character={fighters[0]}
              active={active === 0}
              onActivate={() => setActive(0)}
              onRandom={() => pickRandom(0)}
              onOpenSheet={() => onOpenCharacter(fighters[0].id, fighters)}
            />
            {/* Sceau sombre : le « VS » reste lisible devant la lumière du portail */}
            <VsSeal className="relative z-20" />
            <SidePanel
              side={1}
              character={fighters[1]}
              active={active === 1}
              onActivate={() => setActive(1)}
              onRandom={() => pickRandom(1)}
              onOpenSheet={() => onOpenCharacter(fighters[1].id, fighters)}
            />
          </div>

          <RosterRail roster={roster} picked={picked} active={active} onActivate={setActive} onPick={pickOnRail} />

          {/* Lancer le duel : centré sous le « VS », seul en bas de l'écran */}
          <Button variant="primary" size="xl" icon="combattre" onClick={() => onStart(fighters)} className="w-96 shrink-0">
            Combattre
          </Button>
        </>
      )}
      <span className="absolute bottom-2 right-4 font-mono text-xs text-stone-600">v{__APP_VERSION__}</span>
    </div>
  )
}

function TournamentIntro({ tournamentProgress, onNewTournament, onResumeTournament }: Props) {
  return (
    <>
      {/* Moitié droite, sur le mur sombre : présentation et actions */}
      <div className="absolute right-24 top-1/2 flex w-[600px] -translate-y-[40%] flex-col items-center gap-8 text-center">
        <div>
          <Icon name="trophy" className="mx-auto h-20 w-20 drop-shadow-[0_0_24px_rgba(251,191,36,0.35)]" />
          <p className="mt-3 font-display text-4xl font-extrabold tracking-wide text-amber-200 drop-shadow-[0_3px_0_#78350f]">
            Tournoi à élimination directe
          </p>
          <div className="mx-auto mt-4 h-px w-48 bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />
          <p className="mt-4 text-lg leading-relaxed text-stone-300">
            16 participants, des huitièmes de finale jusqu'à la finale. Un même personnage peut être engagé plusieurs
            fois. Chaque match se joue ou se simule, et compte dans les statistiques.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Button variant="primary" size="xl" icon="tournoi" onClick={onNewTournament} className="w-[460px]">
            {tournamentProgress ? 'Nouveau tournoi' : 'Créer un tournoi'}
          </Button>
          {tournamentProgress && (
            <>
              <Button variant="secondary" size="md" icon="combattre" onClick={onResumeTournament} className="w-[460px]">
                Reprendre le tournoi
              </Button>
              <p className="text-sm text-stone-400">{tournamentProgress}</p>
            </>
          )}
        </div>
      </div>
    </>
  )
}

const SIDE_LABEL = { 0: 'Combattant de gauche', 1: 'Combattant de droite' } as const

/**
 * Rail des combattants (0.43.0) : un portrait par personnage, au centre de l'écran, comme le tableau
 * de sélection d'un jeu de combat. Le camp actif choisit (curseur azur ou cramoisi), puis la main passe
 * en face. Le liseré d'une carte dit quel camp l'a choisie ; les deux camps peuvent choisir le même.
 */
function RosterRail({
  roster,
  picked,
  active,
  onActivate,
  onPick,
}: {
  roster: readonly Character[]
  picked: Pair<string>
  active: Side
  onActivate: (side: Side) => void
  onPick: (id: string) => void
}) {
  return (
    <div className="roster-rail relative z-20 flex shrink-0 flex-col items-center gap-2.5">
      {/* Le camp qui choisit : onglets aux couleurs des camps */}
      <div role="tablist" aria-label="Camp qui choisit" className="flex items-center gap-6">
        {([0, 1] as const).map((side) => (
          <button
            key={side}
            role="tab"
            aria-selected={active === side}
            data-side={side === 0 ? 'a' : 'b'}
            onClick={() => onActivate(side)}
            className="rail-camp"
          >
            {/* Flèche en CSS (jamais de caractère pictographique) : vers le camp qui choisit */}
            {side === 0 && <span aria-hidden className="rail-camp-arrow" data-dir="left" />}
            {SIDE_LABEL[side]}
            {side === 1 && <span aria-hidden className="rail-camp-arrow" data-dir="right" />}
          </button>
        ))}
      </div>
      <ul className="flex gap-2" aria-label="Combattants">
        {roster.map((c) => {
          const a = picked[0] === c.id
          const b = picked[1] === c.id
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c.id)}
                data-a={a || undefined}
                data-b={b || undefined}
                data-cursor={active === 0 ? 'a' : 'b'}
                aria-label={`${c.name}, ${c.race} · ${c.archetype}${a ? ', choisi à gauche' : ''}${b ? ', choisi à droite' : ''}`}
                title={`${c.name} — ${c.race}, ${c.archetype}`}
                className="roster-card"
              >
                <Portrait character={c} side={0} className="roster-card-face" />
                <span className="roster-card-name">{c.name}</span>
                {a && <span className="roster-card-tag" data-side="a">A</span>}
                {b && <span className="roster-card-tag" data-side="b">B</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface SidePanelProps {
  side: Side
  character: Character
  /** Ce camp choisit sur le rail */
  active: boolean
  onActivate: () => void
  onRandom: () => void
  onOpenSheet: () => void
}

function SidePanel({ side, character, active, onActivate, onRandom, onOpenSheet }: SidePanelProps) {
  const style = SIDE_STYLE[side]
  const right = side === 1
  return (
    // Le personnage est toujours côté « VS », les infos vers l'extérieur.
    <section className={`flex h-full min-h-0 items-center gap-6 ${right ? 'flex-row-reverse' : ''}`}>
      <div className={`relative z-20 flex w-[340px] shrink-0 flex-col gap-3 ${right ? 'items-end text-right' : ''}`}>
        <div>
          <div className={`flex items-center gap-2.5 ${right ? 'flex-row-reverse' : ''}`}>
            <h2
              className={`on-illus font-display text-[40px] font-semibold leading-none tracking-wide ${style.accent}`}
            >
              {character.name}
            </h2>
            <IconButton onClick={onOpenSheet} icon="chroniques" size="sm" label={`Fiche de ${character.name}`} className="shrink-0" />
          </div>
          <p className="on-illus mt-1 font-body text-[17px] text-ink-2">
            {character.race} · {character.archetype}
          </p>
        </div>

        <div className={`fighter-panel ${right ? 'side-b' : 'side-a'} w-full px-3 pb-2.5 pt-3 text-left`}>
          <StatSheet character={character} barClass={style.bar} trackClass={style.track} />
        </div>
        {/* Compétences : trois dés (1, 2, 3), le détail au survol */}
        <div className={`flex w-full ${right ? 'justify-end' : ''}`}>
          <SkillDice character={character} align={right ? 'right' : 'left'} />
        </div>

        <Button variant="secondary" size="md" icon="hasard" onClick={onRandom} className="w-full">
          Au hasard
        </Button>
      </div>

      {/* Cliquer le personnage donne la main à son camp sur le rail */}
      <button
        type="button"
        onClick={onActivate}
        aria-label={`Choisir le combattant ${right ? 'de droite' : 'de gauche'}`}
        aria-pressed={active}
        className="flex h-full flex-1 cursor-pointer items-end justify-center"
      >
        <Fighter key={character.id} character={character} side={side} className="fade-in" />
      </button>
    </section>
  )
}
