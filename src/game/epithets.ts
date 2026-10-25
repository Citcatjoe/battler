import { shuffle, type Rng } from './rng'

/*
 * Noms uniques des participants d'un tournoi (0.87.0, interrupteur « Noms uniques » de la configuration) :
 * le nom du personnage suivi d'une épithète tirée de son propre registre, fidèle à sa fiche (docs/PERSONNAGES.md).
 * Un personnage est un personnage précis, pas une race : « Gorak le Borgne » reste Gorak.
 *
 * Huit épithètes par personnage : « Compléter » en met au plus 4 du même sur 32 cases avec dix personnages
 * (fillSlots, ⌈32/10⌉), le double de marge. Au-delà (cases posées à la main), les épithètes resservent avec un
 * numéro (« Gorak le Borgne II ») : les noms restent distincts.
 */
export const EPITHETS: Record<string, readonly string[]> = {
  // Orc, la brute des fosses de Kar-Dush
  gorak: ['le Borgne', 'Brise-Crâne', 'des Fosses', 'le Roc', 'Mâchoire-de-Fer', 'le Balafré', 'Fend-Bouclier', 'Poing-de-Pierre'],
  // Elfe, la rôdeuse : un souffle, une flèche
  elaria: ['Flèche-Grise', 'Œil-de-Faucon', 'la Silencieuse', 'des Hautes-Futaies', 'Pas-de-Brume', 'la Vigilante', "Corde-d'Argent", 'la Traqueuse'],
  // Nain, le gardien de la porte
  brokk: ['Garde-Porte', 'Barbe-de-Fer', "l'Inébranlable", 'Peau-de-Pierre', 'le Rempart', 'Marteau-Lent', 'du Seuil', 'Roc-Patient'],
  // Mort-vivant, chevalier liche : la mort l'a rendu, pas pardonné
  ervald: ['le Revenu', 'Souffle-Froid', 'le Sans-Pardon', 'Lame-de-Givre', 'des Tombes', "l'Exhumé", 'le Pâle', 'Cœur-Gelé'],
  // Prêtresse solaire : le soleil ne frappe pas, il juge
  ysolde: ["l'Aurore", 'la Juge', 'Main-de-Lumière', 'du Zénith', 'la Flamboyante', 'Voix-du-Soleil', 'la Purifiée', "Œil-d'Or"],
  // Femme-lézard, voleuse : pile ou face
  naraxes: ['Double-Face', 'la Chanceuse', 'Pièce-Truquée', 'Langue-Fourchue', 'des Marais', 'Doigts-Agiles', 'la Tricheuse', "Écaille-d'Or"],
  // Paladin : chaque coup reçu est une dette
  aldric: ['le Juste', 'Porte-Dette', 'Bouclier-Fidèle', 'le Patient', 'Main-de-Fer', 'le Créancier', 'Cœur-Loyal', "l'Inflexible"],
  // Ogre, cogneur : taper, attendre, taper plus fort
  morgrut: ['Grosse-Bedaine', 'le Lent', 'Tape-Dur', 'Mange-Tout', 'le Ventru', 'Casse-Pierre', 'le Placide', 'Bas-du-Front'],
  // Sylvain, druide aux deux visages
  thaldrin: ['Mousse-Ancienne', 'le Grand Chêne', "Croc-d'Ours", 'Deux-Visages', 'Écorce-Vive', "Appel-d'Orage", 'le Sauvage', 'Racine-Profonde'],
  // Saltimbanque : une chanson, et deux dés quand la foule reprend le refrain (le Duo)
  fanchon: ['la Chanteuse', 'Fausse-Note', 'Deux-Dés', 'la Rieuse', 'Doigts-de-Fée', 'des Tavernes', 'la Vagabonde', 'Belle-Voix'],
}

/** Chiffres romains des tours de registre (II, III…) quand un personnage dépasse ses épithètes */
const CYCLE = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X']

/**
 * Noms uniques de participants, dans l'ordre de `ids` : chaque personnage reçoit ses épithètes dans un ordre tiré
 * au hasard (`rng`), sans doublon tant que son registre suffit. Même tirage, mêmes noms.
 */
export function uniqueNames(ids: readonly string[], nameOf: (id: string) => string, rng: Rng): string[] {
  const order = new Map<string, readonly string[]>()
  for (const id of Object.keys(EPITHETS)) order.set(id, shuffle(rng, EPITHETS[id]))
  const used = new Map<string, number>()
  return ids.map((id) => {
    const pool = order.get(id)
    if (!pool) throw new Error(`Pas d'épithètes pour ${id}`)
    const n = used.get(id) ?? 0
    used.set(id, n + 1)
    return `${nameOf(id)} ${pool[n % pool.length]}${CYCLE[Math.floor(n / pool.length)] ?? ` ${Math.floor(n / pool.length) + 1}`}`
  })
}
