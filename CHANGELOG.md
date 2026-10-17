# Changelog

Ce fichier liste les changements entre deux versions du jeu. Il suit le format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le versionnage sémantique, adapté à un prototype :

- **mineure** (0.x.0) : nouvelle fonctionnalité ou nouveau contenu ;
- **correctif** (0.x.y) : correction ou réglage, sans nouvelle fonctionnalité.

La version en cours est celle de `package.json`. Elle s'affiche en bas à droite de l'écran d'accueil.

> Les versions 0.1.0 à 0.10.0 ont été reconstituées à partir des itérations successives du prototype, faites avant la mise en place de cette documentation. Elles n'ont ni date précise ni commit associé.

## [Non publié]

_Rien pour l'instant._

## [0.11.0] — 2026-10-17

### Ajouté
- Documentation du projet : `README.md`, `docs/INTENTION.md`, `docs/ETAT.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md`, ce changelog et `CLAUDE.md`.
- Numéro de version affiché sur l'écran d'accueil, injecté au build depuis `package.json` (`__APP_VERSION__`).

## [0.10.0]

### Ajouté
- Image d'arène (`arena1.jpg`) en fond de l'écran de combat. Elle est assombrie, désaturée et légèrement floutée, avec une vignette, un sol sombre et un halo au pied des combattants pour qu'ils restent au premier plan.

## [0.9.0]

### Ajouté
- **Événements** : capacités qui se déclenchent sur un 1 naturel au dé de dégâts.
  - Orc, Rage du sang : +5 PV.
  - Elfe, Œil de faucon : prochain coup critique assuré.
  - Nain, Peau de pierre : +4 armure temporaire, cumulable, qui s'use en encaissant.
- Système générique déclencheur → effets (soin, bonus), prévu pour d'autres déclencheurs.
- Bonus actifs affichés en icônes sous la barre de vie ; aura, titre et son au déclenchement ; lignes ✨ dans le journal.
- Section Événements dans les stats de fin, sur la fiche personnage et dans les statistiques globales (événements, PV regagnés, critiques forcés, armure temporaire absorbée).

### Modifié
- `Attack` enregistre des instantanés `afterHit` et `after` (PV et bonus) à la place des seuls PV.

## [0.8.1]

### Corrigé
- Les boutons de la configuration du tournoi ne répondaient pas : l'arbre, qui couvre toute la scène, interceptait les clics.

### Modifié
- Un seul bouton 🎲 **Compléter**, qui remplit uniquement les cases vides. « Tout tirer au sort » a été retiré.

## [0.8.0]

### Ajouté
- **Mode tournoi** : bascule sur l'accueil, configuration d'un arbre de 16 participants (à la main ou automatique), suivi des matchs.
- Chaque match prêt peut passer par l'écran d'affrontement (jouer ou simuler) ou être simulé directement depuis l'arbre. On peut aussi simuler tout le tour.
- Doublons permis, nommés avec des chiffres romains.
- Les matchs de tournoi alimentent l'historique ; compteur de tournois gagnés.
- Le tournoi n'est pas sauvegardé au rechargement (choix délibéré).

## [0.7.0]

### Ajouté
- Bouton 📜 **Fiche** sur la sélection : modèle, stats, comparaison avec la variante, palmarès.
- **Historique local** de tous les combats (`battler:history:v1`) et écran 📊 **Statistiques** : tableau global, matrice des confrontations, derniers combats, remise à zéro.

## [0.6.0]

### Ajouté
- **Écran d'affrontement** entre la sélection et le combat, avec les boutons JOUER, SIMULER et CHANGER.
- Simulation réelle basée sur les stats, qui mène directement à l'écran des scores.

### Modifié
- Moteur unique et pur (`simulateCombat`) ; le mode joué rejoue le résultat calculé.

## [0.5.0]

### Modifié
- Tout le jeu sur une scène fixe en 16:9 (1600×900), mise à l'échelle de la fenêtre.
- Tuiles de sélection des personnages plus petites.

## [0.4.0]

### Ajouté
- Elfe et nain, en plus de l'orc.
- Archétypes de stats par race, et une variante de coloris par personnage, avec des stats légèrement différentes : Gorak/Murzug, Elaria/Sylwen, Brokk/Grimbald.
- Sélection libre des deux combattants.

## [0.3.0]

### Ajouté
- Esquive et coup critique (×2), visibles en combat et dans les stats de fin.
- Personnages modélisés par une classe `Character` avec des stats, pour pouvoir en ajouter.

## [0.2.0]

### Ajouté
- Effets sonores synthétisés (dés, coups, critiques, KO, victoire) et bouton muet.

## [0.1.0]

### Ajouté
- Prototype de base : deux combattants à 50 PV, dégâts de 1 à 10 au dé.
- Écran de début, écran de combat avec dés animés et journal, écran de fin avec statistiques.
- Animation de charge et effet d'impact ; l'image est retournée pour que les combattants se fassent face.
