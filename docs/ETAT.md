# État du projet

_Dernière mise à jour : 2026-10-17, version 0.20.1._

## En bref

Prototype jouable de bout en bout : sélection, affrontement, combat animé ou simulé, résultats, fiches de personnages, statistiques globales et tournoi à 16 participants. Huit personnages (4 races × 2 variantes de coloris), chacun avec un événement propre.

## Ce qui fonctionne

| Domaine | État |
| --- | --- |
| Duel joué ou simulé | ✅ stable |
| Esquive, critique, armure | ✅ stable |
| Événements sur un 1 naturel (orc, elfe, nain) | ✅ stable |
| Moteur à phases, statuts bonus/malus, 10 déclencheurs | ✅ prêt pour de nouvelles mécaniques (0.13.0) |
| Tests automatisés (74) | ✅ `npm test` |
| Fiches et design des personnages | ✅ en jeu et dans `docs/PERSONNAGES.md` (0.14.0) |
| Sons de synthèse et bouton muet | ✅ stable |
| Fiche personnage et statistiques globales | ✅ stable |
| Tournoi à 16 (configuration, arbre, suivi) | ✅ stable depuis la correction 0.8.1 |
| Arènes (2), au choix sur l'écran d'affrontement | ✅ 0.16.0 |
| Compendium (Personnages, Bonus et malus) | ✅ 0.18.0, bouton d'accès provisoire |
| Conditions d'événement, plafond de charges | ✅ 0.18.0, prêts, pas encore utilisés par un personnage |
| Version affichée en jeu | ✅ depuis 0.11.0 |

## Vérifications faites

Tout ce qui suit est dans le dépôt et tourne avec `npm run check` :
- **Moteur** : invariants vérifiés sur tous les duels du roster (PV bornés, statuts valides, dégâts cohérents, fin propre), reproductibilité, chaque statut, chaque déclencheur, `chance`, `limit`, K.O. par effet, limite de tours.
- **Refonte 0.13.0** : 2 160 combats à graine fixe rejoués avec l'ancien et le nouveau moteur, sans aucune différence (dés, esquives, critiques, armure, événements, PV, statuts).
- **Équilibre** : chaque personnage gagne entre 45 et 55 % de ses combats (test automatique). Mesure 0.17.0 (8 personnages) : de 48,3 % (Grimbald) à 52,5 % (Brokk) ; duels les plus déséquilibrés : Brokk contre Elaria et Ervald contre Elaria, 56/44 (voir `docs/PERSONNAGES.md`).
- **Non-régression** : une empreinte de 36 combats à graine fixe signale tout changement de règle non voulu.
- **Stats, tournoi, historique** : les dégâts comptés expliquent exactement les PV perdus ; 100 tournois complets ; refus des matchs invalides ; historique cumulé cohérent et complété depuis les anciennes versions.
- **Écrans** : chacun est rendu avec de vraies données (test de fumée côté serveur).
- **Build** : `tsc` et `vite build` passent.

## Limites connues

- **Pas de test visuel automatisé.** Playwright et Chromium ne s'installent pas sur la machine de dev (téléchargement bloqué). Les rendus sont prévisualisés en Python (PIL) ; la validation finale se fait dans le navigateur, à la main.
- **Animations non testées automatiquement.** Les tests couvrent les règles et le rendu des écrans, pas le déroulé animé du combat dans le navigateur.
- **Tournoi non sauvegardé.** C'est voulu : un rechargement de la page le perd.
- **Personnages en placeholder.** `orc.png`, `elf.png` et `dwarf.png` proviennent d'œuvres existantes et sont à remplacer par des créations originales (voir `docs/STYLE_BIBLE.md`).
- **Pas de version mobile.** La scène 16:9 se réduit, mais rien n'est pensé pour le tactile.
- **Historique git récent.** Premier commit et tag à partir de la 0.11.0 ; les versions précédentes ont été reconstituées dans le CHANGELOG.

## Chantiers en cours

| Chantier | Où en est-on | Document |
| --- | --- | --- |
| **Bonus et malus** sur un nombre de tours, sous conditions | Le moteur est prêt : durées, cumul, plafond, conditions (`when`), catalogue. Cadre décidé (0.20.1) : statuts neutres, compétences liées au personnage, palette par race, 1 passif + 2 compétences au plus. Reste à attribuer les palettes, compétence par compétence, avec conditions, durées types et mesure d'équilibre. | [STATUTS.md](STATUTS.md#chantier--larrivée-des-bonus-et-malus) |
| **Résolution des affrontements** | Couche en place et testée : trois phases par tour, fenêtres, ordre fixe, contrôle, réactions, garde, immunités, opposition. Sept décisions de design à valider. | [RESOLUTION.md](RESOLUTION.md#9-décisions-de-design-à-valider) |
| **Compendium** | En place avec deux verticales : Personnages (fiches) et Bonus et malus. Reste à définir l'intégration définitive du bouton d'accès sur l'accueil (bouton rond provisoire), et les futures verticales (événements, arènes, règles…). | [FEATURES.md](FEATURES.md#9-compendium) |
| **Personnages originaux** | Le mort-vivant est original. L'orc, l'elfe et le nain restent des placeholders, à régénérer avec la style bible. | [STYLE_BIBLE.md](STYLE_BIBLE.md) |

## Prochaines étapes possibles

- Un commit et un tag par version.
- Attribuer des événements utilisant les nouveaux déclencheurs, les conditions et les statuts à venir (régénération, affaibli, brèche).
- Voir les pistes dans [INTENTION.md](INTENTION.md#grandes-lignes).
