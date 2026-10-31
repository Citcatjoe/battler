import { encountersFor, tuningKeyOf, type CampaignRun, type Encounter, type TuningKey } from './campaign'
import type { EncounterAsk, EncounterReply, EncounterRequest } from './encounters.worker'

/*
 * Les rencontres de campagne sans geler l'interface (retour du 2026-10-30, D3) : le réglage (quelques milliers de
 * combats, 0,3 à 2 s) se fait dans un Web Worker (`encounters.worker.ts`), et commence dès le combat du nœud précédent
 * (`prepareEncounters`). Sans worker (tests, navigateur qui refuse un worker de module), le calcul se fait d'un bloc,
 * comme avant : même résultat, mêmes graines.
 */

/** Le worker : absent tant qu'on ne l'a pas demandé, null s'il n'est pas disponible */
let worker: Worker | null | undefined
let nextId = 1
const waiting = new Map<number, (reply: EncounterReply) => void>()

/** Le worker ne répond plus (module refusé, erreur) : on s'en passe, et les demandes en cours se calculent ici */
function dropWorker() {
  worker?.terminate()
  worker = null
  for (const [id, done] of waiting) done({ id, error: 'worker indisponible' })
  waiting.clear()
}

function encounterWorker(): Worker | null {
  if (worker !== undefined) return worker
  if (typeof Worker === 'undefined') return (worker = null)
  try {
    worker = new Worker(new URL('./encounters.worker.ts', import.meta.url), { type: 'module' })
  } catch {
    return (worker = null)
  }
  worker.onmessage = (event: MessageEvent<EncounterReply>) => {
    const done = waiting.get(event.data.id)
    waiting.delete(event.data.id)
    done?.(event.data)
  }
  worker.onerror = (event) => {
    event.preventDefault()
    dropWorker()
  }
  return worker
}

function ask(request: EncounterAsk): Promise<EncounterReply> {
  const w = encounterWorker()
  const id = nextId++
  if (!w) return Promise.resolve({ id, error: 'pas de worker' })
  return new Promise((resolve) => {
    waiting.set(id, resolve)
    try {
      w.postMessage({ ...request, id } satisfies EncounterRequest)
    } catch (error) {
      waiting.delete(id)
      resolve({ id, error: String(error) })
    }
  })
}

/** Règle à l'avance les rencontres du nœud `key` (le combat du nœud précédent commence) ; rien sans worker. */
export function prepareEncounters(key: TuningKey | undefined) {
  if (key && encounterWorker()) void ask({ kind: 'prepare', key })
}

/** Les rencontres du nœud en cours de la partie : réglées hors du fil de l'interface quand c'est possible. */
export async function computeEncounters(run: CampaignRun): Promise<Encounter[]> {
  const reply = await ask({ kind: 'encounters', key: tuningKeyOf(run), run })
  if (reply.encounters) return reply.encounters
  // Sans worker : d'un bloc, après l'affichage de la carte et de son attente
  await new Promise((resolve) => setTimeout(resolve, 60))
  return encountersFor(run)
}
