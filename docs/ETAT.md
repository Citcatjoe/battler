# État du projet

_Dernière mise à jour : 2026-10-20, version 0.52.0._

## En bref

Auto-battler roguelike à regarder et à parier (fiche produit : [INTENTION.md](INTENTION.md#fiche-produit)). Prototype jouable de bout en bout : sélection, affrontement, combat animé ou simulé, écran de fin (combat et paris), fiches de personnages, statistiques globales et tournoi à 16 participants. Dix personnages, un par famille depuis la 0.43.0 (Gorak l'orc, Elaria l'elfe, Brokk le nain, Ervald le mort-vivant, Ysolde la prêtresse, Naraxes la voleuse, Aldric le paladin, Morgrut l'ogre, Thaldrin le druide, Fanchon la barde), chacun avec trois compétences sur un 1, un 2 et un 3 au dé (le 3 donnant une aura permanente), sauf la barde, qui lance deux dés et joue ses compétences sur les doubles ; une variante peut avoir sa propre version d'une compétence (Murzug). Le jeu des parieurs (0.38.0) oppose deux joueurs et deux parieurs de l'ordinateur sur chaque match.

## Ce qui fonctionne

| Domaine | État |
| --- | --- |
| Refonte de l'interface (design system V1.4, `docs/design-system.md`) | ✅ 0.39.0, 13 étapes vues à l'écran (captures Firefox sans interface). Natures des compétences classées (0.39.1). À faire : barre de commandes du combat, boutons Compléter et Valider l'arbre du tournoi, titres de page et textes de moins de 13 px non migrés |
| Médaillons des états par famille (0.51.0, FAMILLES.md § 3) | ✅ couleur de famille et anneau plein ou cranté, en CSS, vus à l'écran (compendium, zone d'état) ; icônes inchangées. Repère de fenêtre (prochaine action, prochain coup…) et familles des compétences : à faire |
| Quatrième passe sur les compétences (0.50.0, `docs/SORTS.md` § 13) | ✅ Furie des vents instantanée (Gorak au d8), Coup de chance cumulable, immunité qui arrête l'Aura de poison, Écorce à 7, Riposte à deux charges, Luciole à 4. Ysolde à 43,1 %, la plus basse. Libellé « PILE ! » caché par la pièce : signalé. Rendu non vu |
| Troisième passe sur les compétences (0.46.0, `docs/SORTS.md` § 12) | ✅ Furie des vents cumulable en réserve ; barde : « ding » sur tout double, Siffloter et Fausse note qui frappent (esquive de Fanchon 6 %). Ouverture « écrasante » gardée (identité). Son non vérifiable à l'oreille ; rendu non vu |
| Deuxième passe sur les compétences (0.45.0, `docs/SORTS.md` § 11) | ✅ Épines permanentes, Vol de vie à deux charges, Aura de poison au début du tour adverse (avec le Poison), barde (aura et Fausse note à 2 charges) ; textes clarifiés. Roster de 10 : de 44,4 (Ysolde) à 54,6 % (Ervald). Reste signalée : Fausse note « presque inutile » (+0,4). Rendu non vu à l'écran (textes, compteurs) |
| Audit des compétences (0.42.0, `docs/SORTS.md` § 10) | ✅ Pile ou face et Aura d'immunité ne coûtent plus de victoires, Purification n'est plus gâchée, Fleur de vie compte. Restent signalées : Aura de sainteté et Rétribution « écrasantes » (signatures), Pile ou face et l'immunité de Gauvain « presque inutiles » (de −0,6 à +0,6). Deux contres tolérés de plus : Ysolde contre les voleuses (35 %). Rendu vu : pièce ; la décoction qui suit pile n'est pas capturée |
| Compétence groupée avec son jet, badges de coups spéciaux empilés et colorés par famille | ✅ 0.49.0, vu à l'écran (Esquive améliorée groupée avec le 2 ; Critique assuré + Critique + Riposte, et + Épines ; Coup de chance ; libellé « Face… » lisible). Furie des vents et sa relance (« ×2 ») vues en 0.52.0. Pas vu : Vol de vie, Rétribution, gros coups de la barde. Halo du camp actif vu (Elaria) |
| Lisibilité du tour : passage de main (pause de 400 ms, camp actif, ligne au sol) et dé de compétence qui s'allume | ✅ 0.44.0, retouché en 0.45.1 (ligne au lieu de l'anneau, dés éteints au repos, éclat bref), vu à l'écran (Ervald, Fanchon contre Elaria : ligne, barre active, éclat du 3). Pas vu : la pulsation d'un double de la barde et d'un coup transformé (couverts par les tests pour le second) |
| Duel joué ou simulé | ✅ stable |
| Esquive, critique, armure | ✅ stable |
| Compétences sur un 1 au dé (les 6 races) | ✅ stable |
| Aldric, le paladin (Rétribution à jauges, Riposte, Aura d'immunité) | ✅ 0.31.0, rendu à valider (jauges dans la zone d'état, sélection à 7 familles) |
| Un personnage par famille (dix personnages, sans jumeaux), rail de sélection central sur l'accueil | ✅ 0.43.0, vu à l'écran (accueil, passage de la main en face, préparation du tournoi, compendium). Le format de l'historique ne change pas : les statistiques des jumeaux restent stockées, mais ne s'affichent plus |
| Lisibilité des textes flottants (placement, police, durée) | ✅ 0.32.1, police validée par l'utilisateur |
| Mode triche (prochain dé imposé) et barre de commandes au style jeu | ✅ 0.33.0 ; barre vue à l'écran (0.34.0) |
| Sons enregistrés (33 sons, 67 fichiers CC0), repli synthétisé, écourtés selon la vitesse | ⚠️ 0.36.0 jugée cacophonique ; refonte selon `docs/SONS.md` en 0.36.2 (20 sons, un fichier chacun) ; 19 fichiers choisis à l'oreille par l'utilisateur (0.36.3), Ronge encore synthétisé. Volumes à régler à l'oreille |
| Musique de fond des combats (trois boucles au hasard, égalisées, bus à part) | ✅ 0.48.0, chargement vérifié en combat ; niveau et jonctions de boucle à juger à l'oreille (`SONS.md` § 10) |
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
| Tournoi à 16 (configuration, arbre, suivi) | ✅ stable depuis la correction 0.8.1 ; arbre refait au design system en 0.47.0, vu à l'écran (configuration vide et complète, suivi, tournoi terminé) |
| Arènes (2), au choix sur l'écran d'affrontement | ✅ 0.16.0 |
| Compendium (Personnages, Compétences, Bonus et malus) | ✅ 0.18.0 (Compétences en 0.21.0), bouton d'accès provisoire |
| Conditions d'événement, plafond de charges | ✅ 0.18.0, prêts, pas encore utilisés par un personnage |
| Version affichée en jeu | ✅ depuis 0.11.0 |
| Taille des combattants (échelle resserrée, nain 0,86 → ogre 1,13, largeur naturelle pour tous) | ✅ 0.40.0, vue à l'écran (accueil, affrontement, combat) |
| Postures des combattants (attaque, esquive, coup encaissé, K.O., victoire ; retour à la garde) | ✅ 0.40.0, l'orc (nouvelle image originale) et la voleuse ; attaque, coup encaissé et victoire vus à l'écran, esquive et K.O. non vus (`POSTURES.md`) |
| La barde (Fanchon, Mélisande) : deux dés, compétences sur les doubles, dégâts finaux | ✅ 0.41.0. Vus à l'écran (captures Firefox) : sélection à 10 familles, dés des doubles, affrontement face au nain (tailles), paire de dés en combat, aura, posture d'attaque. Mélisande et sa teinte vues sur l'affrontement (postures redécoupées, ancrage sur la silhouette, `bodyInset`). Non vus : un double en combat (annonce « DOUBLE », gros coup), les sons. Brokk contre la barde : contre connu |
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
- **Personnage en placeholder.** `dwarf.png` provient d'une œuvre existante et est à remplacer par une création originale (voir `docs/STYLE_BIBLE.md`). L'orc a été remplacé en 0.40.0.
- **Postures** : seuls l'orc, la voleuse et la barde en ont (`POSTURES.md`).
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
