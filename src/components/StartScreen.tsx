import { useState } from 'react'
import menuImg from '../assets/menu-portal.jpg'
import tournamentImg from '../assets/menu-tournament.jpg'
import type { Character } from '../game/character'
import { SIDE_STYLE, type Pair, type Side } from '../game/combat'
import { CHARACTERS, FAMILIES } from '../game/roster'
import { sfx } from '../game/sound'
import { Fighter } from './Fighter'
import { Portrait } from './Portrait'
import { StatSheet } from './StatSheet'
import { EventInfo } from './EventInfo'
import { Icon, type IconName } from './Icon'

interface Props {
  initial: Pair<Character>
  onStart: (fighters: Pair<Character>) => void
  /** Ouvre la fiche d'un personnage ; la sélection en cours est conservée */
  onOpenCharacter: (id: string, current: Pair<Character>) => void
  onOpenRecords: (current: Pair<Character>) => void
  /** Compendium (personnages, bonus et malus…) ; la sélection en cours est conservée */
  onOpenCompendium: (current: Pair<Character>) => void
  mode: GameMode
  onModeChange: (mode: GameMode) => void
  /** Tournoi en cours : progression affichée en mode tournoi */
  tournamentProgress: string | null
  onNewTournament: () => void
  onResumeTournament: () => void
}

export type GameMode = 'duel' | 'tournament'

const MODES: { id: GameMode; icon: IconName; label: string }[] = [
  { id: 'duel', icon: 'swords', label: 'Affrontement' },
  { id: 'tournament', icon: 'trophy', label: 'Tournoi' },
]

export function StartScreen(props: Props) {
  const { initial, onStart, onOpenCharacter, onOpenRecords, onOpenCompendium, mode, onModeChange } = props
  const roster = CHARACTERS
  const [picked, setPicked] = useState<Pair<string>>([initial[0].id, initial[1].id])
  const fighters = picked.map((id) => roster.find((c) => c.id === id)!) as Pair<Character>

  const pick = (side: Side, id: string) => {
    if (picked[side] === id) return
    sfx.click()
    const next: Pair<string> = [...picked]
    next[side] = id
    setPicked(next)
  }

  const pickRandom = (side: Side) => {
    const others = roster.filter((c) => c.id !== picked[side])
    pick(side, others[Math.floor(Math.random() * others.length)].id)
  }

  return (
    <div className="fade-in relative isolate flex h-full flex-col items-center gap-5 px-12 py-8">
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
      <button
        onClick={() => onOpenRecords(fighters)}
        title="Statistiques"
        aria-label="Statistiques"
        className="btn btn-round absolute left-4 top-4"
      >
        <Icon name="stats" className="btn-icon" />
      </button>
      {/* Accès provisoire au compendium : son intégration définitive sur l'accueil reste à définir */}
      <button
        onClick={() => onOpenCompendium(fighters)}
        title="Compendium"
        aria-label="Compendium"
        className="btn btn-round absolute left-20 top-4"
      >
        <Icon name="scroll" className="btn-icon" />
      </button>
      <header className="text-center">
        <h1 className="font-display text-6xl font-extrabold tracking-widest text-amber-200 drop-shadow-[0_4px_0_#78350f]">
          BATTLER
        </h1>
        <div className="tabs mt-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                if (m.id === mode) return
                sfx.click()
                onModeChange(m.id)
              }}
              aria-pressed={m.id === mode}
              className="tab"
            >
              <Icon name={m.icon} className="btn-icon" />
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </header>

      {mode === 'tournament' ? (
        <TournamentIntro {...props} />
      ) : (
        <>
          <div className="grid min-h-0 w-full flex-1 grid-cols-[1fr_auto_1fr] items-center gap-6">
            <SidePanel
              side={0}
              character={fighters[0]}
              roster={roster}
              onPick={(id) => pick(0, id)}
              onRandom={() => pickRandom(0)}
              onOpenSheet={() => onOpenCharacter(fighters[0].id, fighters)}
            />
            {/* Médaillon sombre : le « VS » reste lisible devant la lumière du portail */}
            <span className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-amber-500/60 bg-stone-950/80 font-display text-5xl font-extrabold leading-none text-amber-200 shadow-[0_0_40px_rgba(0,0,0,0.8)] drop-shadow-[0_3px_0_#78350f]">
              {/* Cinzel réserve la place des jambages : sans correction, les capitales sont 0,05 em trop haut */}
              <span className="translate-y-[0.05em]">VS</span>
            </span>
            <SidePanel
              side={1}
              character={fighters[1]}
              roster={roster}
              onPick={(id) => pick(1, id)}
              onRandom={() => pickRandom(1)}
              onOpenSheet={() => onOpenCharacter(fighters[1].id, fighters)}
            />
          </div>

          {/* Lancer le duel : centré sous le « VS », seul en bas de l'écran */}
          <button onClick={() => onStart(fighters)} className="btn btn-primary btn-lg w-96 shrink-0">
            <Icon name="swords" className="btn-icon" />
            <span>Combattre</span>
          </button>
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
          <button onClick={onNewTournament} className="btn btn-primary btn-lg w-[460px]">
            <span>{tournamentProgress ? 'Nouveau tournoi' : 'Commencer un tournoi'}</span>
          </button>
          {tournamentProgress && (
            <>
              <button onClick={onResumeTournament} className="btn btn-md w-[460px]">
                <Icon name="swords" className="btn-icon" />
                <span>Reprendre le tournoi</span>
              </button>
              <p className="text-sm text-stone-400">{tournamentProgress}</p>
            </>
          )}
        </div>
      </div>
    </>
  )
}

interface SidePanelProps {
  side: Side
  character: Character
  roster: readonly Character[]
  onPick: (id: string) => void
  onRandom: () => void
  onOpenSheet: () => void
}

function SidePanel({ side, character, roster, onPick, onRandom, onOpenSheet }: SidePanelProps) {
  const style = SIDE_STYLE[side]
  const right = side === 1
  return (
    // Le personnage est toujours côté « VS », les infos vers l'extérieur.
    <section className={`flex h-full min-h-0 items-center gap-6 ${right ? 'flex-row-reverse' : ''}`}>
      <div className={`flex w-72 shrink-0 flex-col gap-3 ${right ? 'items-end text-right' : ''}`}>
        <div>
          <div className={`flex items-center gap-2.5 ${right ? 'flex-row-reverse' : ''}`}>
            <h2
              className={`font-display text-[40px] font-extrabold leading-none tracking-wide drop-shadow-[0_3px_0_rgba(0,0,0,0.6)] ${style.accent}`}
            >
              {character.name}
            </h2>
            <button
              onClick={onOpenSheet}
              title={`Fiche de ${character.name}`}
              aria-label={`Fiche de ${character.name}`}
              className="btn btn-round h-9 w-9 shrink-0 [--icon:20px]"
            >
              <Icon name="scroll" className="btn-icon" />
            </button>
          </div>
          <p className="mt-1 text-sm text-stone-400">
            {character.race} · {character.archetype}
          </p>
        </div>

        <div className="w-full rounded-lg border border-stone-800 bg-stone-900/50 px-3 py-2.5 text-left">
          <StatSheet character={character} barClass={style.bar} />
        </div>
        <div className="w-full text-left">
          <EventInfo character={character} compact />
        </div>

        {/* Une colonne par famille : l'original en haut, ses variantes dessous */}
        <div className={`flex gap-1.5 ${right ? 'flex-row-reverse' : ''}`}>
          {FAMILIES.map((family) => (
            <div key={family[0].id} className="flex flex-col gap-1.5">
              {family.map((c) => {
                const selected = c.id === character.id
                return (
                  <button
                    key={c.id}
                    onClick={() => onPick(c.id)}
                    title={`${c.name} — ${c.race}, ${c.archetype}`}
                    aria-pressed={selected}
                    className={`group relative h-16 w-16 overflow-hidden rounded-md border bg-stone-900 transition ${
                      selected ? `border-transparent ring-2 ${style.ring}` : 'border-stone-800 hover:border-stone-500'
                    }`}
                  >
                    <Portrait
                      character={c}
                      side={side}
                      className={`h-full w-full transition ${selected ? '' : 'opacity-50 group-hover:opacity-100'}`}
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-0.5 pt-3 text-center text-[10px] font-bold leading-tight">
                      {c.name}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <button onClick={onRandom} className="btn btn-md w-full" disabled={roster.length < 2}>
          <Icon name="dice" className="btn-icon" />
          <span>Au hasard</span>
        </button>
      </div>

      <div className="flex h-[580px] flex-1 items-end justify-center">
        <Fighter key={character.id} character={character} side={side} className="fade-in" />
      </div>
    </section>
  )
}
