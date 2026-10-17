import type { Character } from '../game/character'
import { describeEvent, TRIGGER_LABEL } from '../game/events'

/** Description des événements d'un personnage (« Sur un 1 au dé : +5 PV »). */
export function EventInfo({ character, compact = false }: { character: Character; compact?: boolean }) {
  return (
    <ul className="flex flex-col gap-1">
      {character.events.map((e) => (
        <li
          key={e.id}
          className={`rounded-md border border-violet-400/40 bg-violet-950/40 text-violet-100 ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}
        >
          <b>✨ {e.name}</b>
          <span className="text-violet-300/80"> · {TRIGGER_LABEL[e.trigger]} : </span>
          {describeEvent(e)}
        </li>
      ))}
    </ul>
  )
}
