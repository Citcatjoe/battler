import { useMemo, useState } from 'react'
import { Character } from '../game/character'
import { SIDE_STYLE, type Pair, type Side } from '../game/combat'
import { ROSTER } from '../game/roster'
import { sfx } from '../game/sound'
import { Fighter } from './Fighter'
import { Portrait } from './Portrait'
import { StatSheet } from './StatSheet'
import { EventInfo } from './EventInfo'

interface Props {
  initial: Pair<Character>
  onStart: (fighters: Pair<Character>) => void
  /** Ouvre la fiche d'un personnage ; la sélection en cours est conservée */
  onOpenCharacter: (id: string, current: Pair<Character>) => void
  onOpenRecords: (current: Pair<Character>) => void
  mode: GameMode
  onModeChange: (mode: GameMode) => void
  /** Tournoi en cours : progression affichée en mode tournoi */
  tournamentProgress: string | null
  onNewTournament: () => void
  onResumeTournament: () => void
}

export type GameMode = 'duel' | 'tournament'

const MODES: { id: GameMode; label: string }[] = [
  { id: 'duel', label: '⚔ Affrontement' },
  { id: 'tournament', label: '🏆 Tournoi' },
]

export function StartScreen(props: Props) {
  const { initial, onStart, onOpenCharacter, onOpenRecords, mode, onModeChange } = props
  const roster = useMemo(() => ROSTER.map((def) => new Character(def)), [])
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
    <div className="fade-in relative flex h-full flex-col items-center gap-5 px-12 py-8">
      <button
        onClick={() => onOpenRecords(fighters)}
        className="absolute left-4 top-4 rounded-full border border-stone-700 bg-stone-900/80 px-4 py-2 text-sm font-bold hover:bg-stone-800"
      >
        📊 Statistiques
      </button>
      <header className="text-center">
        <h1 className="font-display text-6xl font-extrabold tracking-widest text-amber-200 drop-shadow-[0_4px_0_#78350f]">
          BATTLER
        </h1>
        <div className="mt-3 inline-flex rounded-full border border-stone-700 bg-stone-900 p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                if (m.id === mode) return
                sfx.click()
                onModeChange(m.id)
              }}
              className={`rounded-full px-5 py-1.5 text-sm font-bold transition ${
                m.id === mode ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-stone-100'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      {mode === 'tournament' ? (
        <TournamentIntro roster={roster} {...props} />
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
            <span className="font-display text-5xl font-extrabold text-stone-500">VS</span>
            <SidePanel
              side={1}
              character={fighters[1]}
              roster={roster}
              onPick={(id) => pick(1, id)}
              onRandom={() => pickRandom(1)}
              onOpenSheet={() => onOpenCharacter(fighters[1].id, fighters)}
            />
          </div>

          <div className="flex w-full items-stretch gap-6">
            <ul className="grid flex-1 grid-cols-2 gap-x-8 gap-y-0.5 rounded-lg border border-stone-800 bg-stone-900/60 px-5 py-3 text-sm text-stone-300">
              <li>• Un jet d'initiative désigne qui frappe en premier.</li>
              <li>• Le dé de l'attaquant fixe les dégâts.</li>
              <li>
                • Le défenseur peut <b className="text-cyan-200">esquiver</b> : aucun dégât.
              </li>
              <li>
                • Un <b className="text-amber-300">coup critique</b> multiplie les dégâts du dé.
              </li>
              <li>
                • L'<b className="text-stone-100">armure</b> retire des points à chaque coup (min. 1).
              </li>
              <li>• Le premier à 0 PV perd.</li>
            </ul>
            <button
              onClick={() => onStart(fighters)}
              className="w-96 rounded-xl bg-amber-500 font-display text-3xl font-extrabold tracking-widest text-stone-950 shadow-[0_5px_0_#92400e] transition hover:bg-amber-400 active:translate-y-1 active:shadow-[0_1px_0_#92400e]"
            >
              COMBATTRE !
            </button>
          </div>
        </>
      )}
      <span className="absolute bottom-2 right-4 font-mono text-xs text-stone-600">v{__APP_VERSION__}</span>
    </div>
  )
}

function TournamentIntro({
  roster,
  tournamentProgress,
  onNewTournament,
  onResumeTournament,
}: Props & { roster: Character[] }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="flex items-end gap-2">
        {roster.map((c, i) => (
          <div key={c.id} className="fade-in h-[300px]" style={{ animationDelay: `${i * 70}ms` }}>
            <Fighter character={c} side={i < roster.length / 2 ? 0 : 1} />
          </div>
        ))}
      </div>
      <div className="max-w-2xl text-center text-stone-300">
        <p className="font-display text-3xl font-extrabold text-amber-200">Tournoi à élimination directe</p>
        <p className="mt-2">
          16 participants, des huitièmes de finale jusqu'à la finale. Un même personnage peut être engagé plusieurs
          fois. Chaque match se joue ou se simule, et compte dans les statistiques.
        </p>
      </div>
      <div className="flex gap-4">
        {tournamentProgress && (
          <button
            onClick={onResumeTournament}
            className="rounded-xl border-2 border-amber-500/70 px-8 py-4 font-display text-xl font-extrabold tracking-wider text-amber-200 hover:bg-amber-500/10"
          >
            REPRENDRE
            <span className="block font-sans text-xs font-normal tracking-normal text-stone-400">
              {tournamentProgress}
            </span>
          </button>
        )}
        <button
          onClick={onNewTournament}
          className="rounded-xl bg-amber-500 px-10 py-4 font-display text-2xl font-extrabold tracking-widest text-stone-950 shadow-[0_5px_0_#92400e] hover:bg-amber-400 active:translate-y-1 active:shadow-[0_1px_0_#92400e]"
        >
          {tournamentProgress ? 'NOUVEAU TOURNOI' : 'CONFIGURER LE TOURNOI'}
        </button>
      </div>
    </div>
  )
}

interface SidePanelProps {
  side: Side
  character: Character
  roster: Character[]
  onPick: (id: string) => void
  onRandom: () => void
  onOpenSheet: () => void
}

function SidePanel({ side, character, roster, onPick, onRandom, onOpenSheet }: SidePanelProps) {
  const style = SIDE_STYLE[side]
  return (
    // Le personnage est toujours côté « VS », les infos vers l'extérieur.
    <section className={`flex h-full min-h-0 items-center gap-6 ${side === 1 ? 'flex-row-reverse' : ''}`}>
      <div className={`flex w-72 shrink-0 flex-col gap-3 ${side === 1 ? 'items-end text-right' : ''}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
            {side === 0 ? 'Combattant de gauche' : 'Combattant de droite'}
          </p>
          <h2 className={`font-display text-3xl font-extrabold ${style.accent}`}>{character.name}</h2>
          <p className="text-sm text-stone-400">
            {character.race} · {character.archetype}
          </p>
        </div>

        <div className="w-full rounded-lg border border-stone-800 bg-stone-900/50 px-3 py-2.5 text-left">
          <StatSheet character={character} barClass={style.bar} />
        </div>
        <div className="w-full text-left">
          <EventInfo character={character} compact />
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {roster.map((c) => {
            const selected = c.id === character.id
            return (
              <button
                key={c.id}
                onClick={() => onPick(c.id)}
                title={`${c.name} — ${c.race}, ${c.archetype}`}
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
        <div className="flex gap-2">
          <button
            onClick={onOpenSheet}
            className="rounded-md border border-stone-700 px-3 py-1 text-xs font-bold text-stone-300 hover:bg-stone-800"
          >
            📜 Fiche
          </button>
          <button
            onClick={onRandom}
            className="rounded-md border border-stone-700 px-3 py-1 text-xs font-bold text-stone-300 hover:bg-stone-800"
          >
            🎲 Au hasard
          </button>
        </div>
      </div>

      <div className="flex h-[480px] flex-1 items-end justify-center">
        <Fighter key={character.id} character={character} side={side} className="fade-in" />
      </div>
    </section>
  )
}
