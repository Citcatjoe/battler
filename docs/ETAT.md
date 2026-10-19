# État du projet

_Dernière mise à jour : 2026-10-19, version 0.38.9._

## En bref

Auto-battler roguelike à regarder et à parier (fiche produit : [INTENTION.md](INTENTION.md#fiche-produit)). Prototype jouable de bout en bout : sélection, affrontement, combat animé ou simulé, écran de fin (combat et paris), fiches de personnages, statistiques globales et tournoi à 16 participants. Dix-huit personnages (9 familles × 2 variantes : orc, elfe, nain, mort-vivant, humain, homme-lézard, paladin, ogre, druide), chacun avec trois compétences sur un 1, un 2 et un 3 au dé (le 3 donnant une aura permanente) ; une variante peut avoir sa propre version d'une compétence (Murzug). Le jeu des parieurs (0.38.0) oppose deux joueurs et deux parieurs de l'ordinateur sur chaque match.

## Ce qui fonctionne

| Domaine | État |
| --- | --- |
| Refonte de l'interface (design system V1.4, `docs/design-system.md`) | 🚧 0.38.9, étape 9 sur 13 : tokens et polices posés ; camps, jauges, fiches de stats, infobulles, pastilles, statistiques, onglets mineurs, boutons tertiaire, secondaires et icône, panneaux de combattant, tuiles de portrait et bouton principal (prestige) migrés |
| Duel joué ou simulé | ✅ stable |
| Esquive, critique, armure | ✅ stable |
| Compétences sur un 1 au dé (les 6 races) | ✅ stable |
| Aldric, le paladin (Rétribution à jauges, Riposte, Aura d'immunité) | ✅ 0.31.0, rendu à valider (jauges dans la zone d'état, sélection à 7 familles) |
| Gauvain, variante d'Aldric | ✅ 0.32.0, teinte non vue à l'écran |
| Lisibilité des textes flottants (placement, police, durée) | ✅ 0.32.1, police validée par l'utilisateur |
| Mode triche (prochain dé imposé) et barre de commandes au style jeu | ✅ 0.33.0 ; barre vue à l'écran (0.34.0) |
| Sons enregistrés (33 sons, 67 fichiers CC0), repli synthétisé, écourtés selon la vitesse | ⚠️ 0.36.0 jugée cacophonique ; refonte selon `docs/SONS.md` en 0.36.2 (20 sons, un fichier chacun) ; 19 fichiers choisis à l'oreille par l'utilisateur (0.36.3), Ronge encore synthétisé. Volumes à régler à l'oreille |
| Ogre (Attente) et druide (deux formes, six compétences) | ✅ 0.35.0, vus à l'écran (métamorphose, lucioles, sélection à 9 familles) ; sons non vérifiables. Icône de la Pourriture subie à fournir (elle reprend celle de l'aura) |
| Écran du champion, compétences en dés, auras, overkill, aucun emoji, ressenti des coups | ✅ 0.34.0, vu à l'écran sauf les sons et la rafale de Rétribution (captures Firefox sans interface) |
| Humains (Ysolde, Bérengère) et Hommes-lézards (Naraxes, Ssythra) | ✅ 0.30.0, rendu à valider à l'écran (pièce, dé vert du Coup de chance, un d6 depuis la 0.36.5, tremblement de la peur, sélection à 6 familles) |
| Compétences sur un 2 au dé (Furie des vents, Esquive améliorée, Épines, Vol de vie) | ✅ 0.25.0, icônes peintes (planche v2) |
| Auras permanentes sur un 3 au dé (puissance, précision, intimidation, poison) | ✅ 0.26.0, icônes peintes (planche v2) |
| Moteur à phases, statuts bonus/malus, 13 déclencheurs | ✅ prêt pour de nouvelles mécaniques (0.13.0, coups multiples et vol de vie en 0.25.0) |
| Tests automatisés (90, dont l'audit de résolution) | ✅ `npm test` |
| Analyse d'équilibre par simulation (`npm run balance`, méthode dans `EQUILIBRAGE.md`) | ✅ 0.28.0 |
| Rapport des combats joués (`npm run logs` : rejeu, audit, bilan de `logs/combats/`) | ✅ 0.29.0 |
| Trace de résolution (console, copie, graine rejouable) | ✅ 0.22.0, écrite sur le disque dans `logs/combats/` depuis la 0.27.0 (serveur de dev) |
| Fiches et design des personnages | ✅ en jeu et dans `docs/PERSONNAGES.md` (0.14.0) |
| Sons de synthèse et bouton muet | ✅ stable |
| Fiche personnage et statistiques globales | ✅ stable |
| Tournoi à 16 (configuration, arbre, suivi) | ✅ stable depuis la correction 0.8.1 |
| Arènes (2), au choix sur l'écran d'affrontement | ✅ 0.16.0 |
| Compendium (Personnages, Compétences, Bonus et malus) | ✅ 0.18.0 (Compétences en 0.21.0), bouton d'accès provisoire |
| Conditions d'événement, plafond de charges | ✅ 0.18.0, prêts, pas encore utilisés par un personnage |
| Version affichée en jeu | ✅ depuis 0.11.0 |
| Paris (deux joueurs et deux parieurs de l'ordinateur, guichet de jeu, cotes cachées, mises fixes, rattrapage, coups de théâtre, écran de fin en deux moitiés, classement) | ✅ 0.38.0, vu à l'écran (captures Firefox : guichet, fin de combat, arbre). Pas encore de guichet de tour : les joueurs ne parient pas sur les matchs simulés depuis l'arbre (Borin et Zlatka, si). Sons non vérifiés |
| Laboratoire des sorts et audit des compétences (`scripts/lab.report.ts`, `scripts/skills.report.ts`) | ✅ 0.36.5, voir `SORTS.md` |

## Vérifications faites

Tout ce qui suit est dans le dépôt et tourne avec `npm run check` :
- **Moteur** : invariants vérifiés sur tous les duels du roster (PV bornés, statuts valides, dégâts cohérents, fin propre), reproductibilité, chaque statut, chaque déclencheur, `chance`, `limit`, K.O. par effet, limite de tours.
- **Refonte 0.13.0** : 2 160 combats à graine fixe rejoués avec l'ancien et le nouveau moteur, sans aucune différence (dés, esquives, critiques, armure, événements, PV, statuts).
- **Équilibre** : chaque personnage gagne entre 42 et 58 %, aucun duel au-delà de 65/35 (test automatique). La méthode, les outils (`npm run balance`) et le journal des équilibrages sont dans `docs/EQUILIBRAGE.md`. Mesure 0.30.0 (12 personnages) : de 46,6 % (Brokk) à 53,1 % (Caldrec) ; contre connu, en attente de décision : Brokk contre les prêtresses (28/72) (voir `docs/EQUILIBRAGE.md`).
- **Audit de résolution** (`audit.test.ts`, 0.26.1) : 2 560 combats de toutes les paires, revérifiés étape par étape (PV expliqués, chaîne de calcul, compétences du dé, coup sacrifié, esquive imposée, vol de vie, épines, Furie, auras, durées). Une version élargie à 16 000 combats n'a trouvé aucune anomalie de règle.
- **Non-régression** : une empreinte de 36 combats à graine fixe signale tout changement de règle non voulu.
- **Stats, tournoi, historique** : les dégâts comptés expliquent exactement les PV perdus ; 100 tournois complets ; refus des matchs invalides ; historique cumulé cohérent et complété depuis les anciennes versions.
- **Écrans** : chacun est rendu avec de vraies données (test de fumée côté serveur).
- **Build** : `tsc` et `vite build` passent.

## Limites connues

- **Pas de test visuel automatisé.** Playwright et Chromium ne s'installent pas sur la machine de dev (téléchargement bloqué). Les rendus sont prévisualisés en Python (PIL) ; la validation finale se fait dans le navigateur, à la main.
- **Animations non testées automatiquement.** Les tests couvrent les règles et le rendu des écrans, pas le déroulé animé du combat dans le navigateur.
- **Tournoi non sauvegardé.** C'est voulu : un rechargement de la page le perd, et les bourses des paris avec lui.
- **Paris : pas de guichet de tour.** Les joueurs ne parient pas sur les matchs simulés depuis l'arbre (« Simuler », « Simuler le tour ») ; il faut ouvrir le match. Borin et Zlatka, eux, parient sur tous les matchs (PARIS.md, étape P3).
- **Personnages en placeholder.** `orc.png` et `dwarf.png` proviennent d'œuvres existantes et sont à remplacer par des créations originales (voir `docs/STYLE_BIBLE.md`).
- **Pas de version mobile.** La scène 16:9 se réduit, mais rien n'est pensé pour le tactile.
- **Historique git récent.** Premier commit et tag à partir de la 0.11.0 ; les versions précédentes ont été reconstituées dans le CHANGELOG.

## Chantiers en cours

La liste des demandes à traiter, point par point, est dans [TODO.md](TODO.md).

| Chantier | Où en est-on | Document |
| --- | --- | --- |
| **Bonus et malus** sur un nombre de tours, sous conditions | Le moteur est prêt : durées, cumul, plafond, conditions (`when`), catalogue. Cadre décidé (0.20.1) : statuts neutres, compétences liées au personnage, palette par race, 1 passif + 2 compétences au plus. Deux compétences par race en jeu depuis la 0.25.0 (sur le 1 et sur le 2). Reste à prolonger les palettes (pistes dans STATUTS.md), avec conditions, durées types et mesure d'équilibre, et à peindre les icônes des quatre nouveaux statuts. | [STATUTS.md](STATUTS.md#chantier--larrivée-des-bonus-et-malus) |
| **Résolution des affrontements** | Couche en place et testée : trois phases par tour, fenêtres, ordre fixe, contrôle, réactions, garde, immunités, opposition. Sept décisions de design à valider. | [RESOLUTION.md](RESOLUTION.md#9-décisions-de-design-à-valider) |
| **Compendium** | En place avec trois verticales : Personnages (fiches), Compétences et Bonus et malus. Reste à définir l'intégration définitive du bouton d'accès sur l'accueil (bouton rond provisoire), et les futures verticales (arènes, règles…). | [FEATURES.md](FEATURES.md#9-compendium) |
| **Sons** | Règles validées et appliquées (0.36.2) : 20 sons, un fichier chacun, un son par instant, le son déduit de la nature de l'effet. Fichiers choisis par l'utilisateur (0.36.3). Reste : un fichier pour Ronge, et le réglage des volumes à l'oreille. | [SONS.md](SONS.md) |
| **Paris** | Refonte jouable (0.38.0) : guichet de jeu, cotes cachées, mises fixes et rattrapage, deux parieurs de l'ordinateur, écran de fin en deux moitiés, classement dans l'arbre et sur l'écran du champion. Reste P3 (guichet de tour), les sons propres et les icônes peintes (bourse, jeton, coup de théâtre, guichet). | [PARIS.md](PARIS.md) |
| **Personnages originaux** | Le mort-vivant, l'elfe (chasseresse de la nuit, 0.30.1), la prêtresse et la voleuse sont originaux. L'orc et le nain restent des placeholders, à régénérer avec la style bible. | [STYLE_BIBLE.md](STYLE_BIBLE.md) |

## Prochaines étapes possibles

- Un commit et un tag par version.
- Peindre les huit icônes des compétences du 2 et des auras du 3 (planche v2, prompt dans STYLE_BIBLE § 7).
- Surveiller Ervald contre Elaria (59/41) et confirmer le cumul de l'intimidation et de la précision.
- Valider à l'écran la rafale de la Furie des vents et les rappels visuels des états (liserés, halos, transparence).
- Attribuer des compétences utilisant les conditions et les statuts à venir (régénération, affaibli, brèche).
- Voir les pistes dans [INTENTION.md](INTENTION.md#grandes-lignes).
