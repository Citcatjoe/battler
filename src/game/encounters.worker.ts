import { tunedEncounters, withDanger, type CampaignRun, type Encounter, type TuningKey } from './campaign'

/*
 * Le réglage des rencontres de campagne hors du fil de l'interface (retour du 2026-10-30, D3 : le petit gel avant les
 * cartes d'adversaires). Mêmes fonctions, mêmes graines que `encountersFor` : le résultat est identique. Les demandes
 * se traitent dans l'ordre d'arrivée ; un réglage préparé à l'avance (`prepare`, pendant le combat du nœud précédent)
 * reste en mémoire, et la demande des rencontres n'a plus que le danger à estimer.
 */

/** Une demande : régler à l'avance un nœud, ou les rencontres du nœud en cours de la partie, danger compris */
export type EncounterAsk = { kind: 'prepare'; key: TuningKey } | { kind: 'encounters'; key: TuningKey; run: CampaignRun }
export type EncounterRequest = EncounterAsk & { id: number }
export type EncounterReply = { id: number; encounters?: Encounter[]; error?: string }

/** Réglages gardés : le nœud préparé et celui en cours suffisent */
const KEPT = 4
const tuned = new Map<string, Encounter[]>()

function tunedFor(key: TuningKey): Encounter[] {
  const k = JSON.stringify([key.seed, key.championId, key.aura, key.node, key.last ?? null])
  let encounters = tuned.get(k)
  if (!encounters) {
    encounters = tunedEncounters(key)
    tuned.set(k, encounters)
    if (tuned.size > KEPT) tuned.delete(tuned.keys().next().value!)
  }
  return encounters
}

self.onmessage = (event: MessageEvent<EncounterRequest>) => {
  const request = event.data
  let reply: EncounterReply
  try {
    const encounters = tunedFor(request.key)
    reply = request.kind === 'encounters' ? { id: request.id, encounters: withDanger(request.run, encounters) } : { id: request.id }
  } catch (error) {
    reply = { id: request.id, error: String(error) }
  }
  self.postMessage(reply)
}
