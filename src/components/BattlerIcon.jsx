// BATTLER — icônes de commande (glyphes). Généré depuis le kit : ne pas modifier à la main.
// Glyphes monochromes au trait, currentColor. Jamais d'image peinte dans un bouton de commande.
// Certains dessins reprennent Lucide (ISC) : épées, trophée, haut-parleur, flèche, rafraîchir, musique.
import React from 'react';

export const GLYPHS = {
  // Combattre, Jouer, Duel, onglet Affrontement
  'combattre': <><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/></>,
  // Tournoi, pastille Vainqueur
  'tournoi': <><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a3 3 0 0 0 3 4"/><path d="M17 6h3a3 3 0 0 1-3 4"/></>,
  // Au hasard, Combat test
  'hasard': <><path d="M12 2.5l8.5 4.75v9.5L12 21.5l-8.5-4.75v-9.5z"/><path d="M12 7l5 8.5H7z"/><path d="M12 7V2.5M7 15.5l-3.5 1.25M17 15.5l3.5 1.25M7 15.5l5 6M17 15.5l-5 6M12 7L3.5 7.25M12 7l8.5.25"/></>,
  // Changer de combattants
  'changer': <><path d="M4 7h16"/><path d="M16 3l4 4-4 4"/><path d="M20 17H4"/><path d="M8 13l-4 4 4 4"/></>,
  // Parier
  'parier': <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></>,
  // Simuler, pastille Simulé
  'simuler': <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></>,
  // Statistiques
  'statistiques': <><path d="M4 20h16"/><path d="M6.5 20v-6"/><path d="M11 20v-10"/><path d="M15.5 20v-14"/></>,
  // Compendium
  'compendium': <><path d="M12 6c-2-1.5-5.5-2-9-1.5v14c3.5-.5 7 0 9 1.5 2-1.5 5.5-2 9-1.5v-14c-3.5-.5-7 0-9 1.5z"/><path d="M12 6v14"/></>,
  // Histoire d'un combattant
  'chroniques': <><path d="M7 4h11a2 2 0 0 1 2 2v2h-4"/><path d="M16 8v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h10"/><path d="M7 4a2 2 0 0 0-2 2v11"/><path d="M9 9h4"/><path d="M9 13h4"/></>,
  // Lien de retour
  'retour': <><path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/></>,
  // Effets sonores actifs
  'son': <><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></>,
  // Effets sonores coupés
  'son-coupe': <><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M16 9l5 6"/><path d="M21 9l-5 6"/></>,
  // Musique active
  'musique': <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
  // Musique coupée
  'musique-coupee': <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M3 3l18 18"/></>,
  // Reprendre
  'lecture': <><path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor"/></>,
  // Pause
  'pause': <><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></>,
  // Journal
  'journal': <><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h7"/><path d="M4.5 6h.01"/><path d="M4.5 12h.01"/><path d="M4.5 18h.01"/></>,
  // Magnétoscope
  'magnetoscope': <><rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><circle cx="16" cy="11" r="2"/><path d="M10 11h4"/><path d="M7 19l1.5-3h7l1.5 3"/></>,
  // Moment précédent
  'moment-precedent': <><path d="M18 6l-8 6 8 6z"/><path d="M6 6v12"/></>,
  // Moment suivant
  'moment-suivant': <><path d="M6 6l8 6-8 6z"/><path d="M18 6v12"/></>,
  // Phase suivante
  'phase-suivante': <><path d="M9 6l6 6-6 6"/></>,
  // Rejouer le moment
  'rejouer': <><path d="M4 11a8 8 0 1 1 2.3 5.7"/><path d="M4 4v7h7"/></>,
  // Réinitialiser
  'reinitialiser': <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></>,
  // Copier la trace
  'copier': <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
  // Fermer
  'fermer': <><path d="M6 6l12 12"/><path d="M18 6L6 18"/></>,
  // Champ de filtre
  'filtrer': <><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></>,
  // Aide, règle liée
  'info': <><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></>,
};

/** <BattlerIcon name="hasard" size={18} /> — size: 14 | 16 | 18 | 20 | 22 | 24 */
export function BattlerIcon({ name, size = 20, className = '', title }) {
  const body = GLYPHS[name];
  if (!body) { if (process.env.NODE_ENV !== 'production') console.warn(`BattlerIcon: glyphe inconnu « ${name} »`); return null; }
  return (
    <svg className={`bt-glyph ${className}`} width={size} height={size} viewBox="0 0 24 24"
      strokeWidth={size <= 14 ? 2 : 1.75} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {body}
    </svg>
  );
}

