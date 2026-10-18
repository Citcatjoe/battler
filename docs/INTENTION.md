# Intention du projet

## Fiche produit

_Vision donnée par l'utilisateur le 2026-10-19. C'est le cadre de toute décision : en cas de doute sur une priorité, on revient ici._

**Battler est un auto-battler roguelike à regarder et à parier.** Les combats se résolvent seuls, aux dés et aux caractéristiques ; les joueurs ne contrôlent pas les coups. Le plaisir vient de deux choses à la fois :
- **assister à des combats intéressants**, avec de la tension et des **retournements de situation** ;
- **s'opposer entre joueurs** sur un **système de paris**.

**Deux terrains de jeu se déroulent en parallèle**, au cours d'un même tournoi (ou d'une session de duels) :

| Terrain | Ce qu'on y fait | Où c'est décrit |
| --- | --- | --- |
| **Le jeu des combattants** | des personnages précis, chacun avec ses stats, ses compétences sur les faces du dé (les « sorts ») et ses statuts ; des duels et un tournoi à 16 ; un équilibre mesuré par simulation | [FEATURES.md](FEATURES.md), [PERSONNAGES.md](PERSONNAGES.md), [STATUTS.md](STATUTS.md), [RESOLUTION.md](RESOLUTION.md), [EQUILIBRAGE.md](EQUILIBRAGE.md) |
| **Le jeu des parieurs** | deux joueurs (et deux parieurs de l'ordinateur) parient des Deniers fictifs sur chaque match, et cherchent à finir le tournoi avec la plus grosse fortune ; ce jeu ne touche jamais au combat | [PARIS.md](PARIS.md), [FEATURES.md](FEATURES.md) § 10 |

Les deux terrains se rejoignent à l'écran : l'écran de fin d'un match montre le combat d'un côté et les paris de l'autre, l'arbre du tournoi montre les combattants et le classement des parieurs.

**Le genre visé, et ce qu'il implique** :
- **auto-battler** : le joueur décide avant (qui parier, plus tard quelles reliques ou quelles variables), le moteur résout, l'écran raconte. Le combat doit donc être **lisible** et **spectaculaire** ;
- **roguelike** : chaque tournoi est une partie, avec du hasard, de la variété et des choix qui comptent ; les pistes (reliques tirées au sort ou imposées, dépouille du vaincu, étape de mi-tableau, édits de tournoi, métas qui émergent) sont dans [ETUDE_AUTOBATTLER.md](ETUDE_AUTOBATTLER.md) et [FAMILLES.md](FAMILLES.md) ;
- **jeu vidéo, pas application web** : de grandes formes, des menus qui se superposent, simples et compréhensibles, jouables sur une télévision (décision de l'utilisateur, 0.38.0).

**Le projet a deux buts, d'égale importance** :
1. **produire un jeu ludique**, agréable à regarder et à jouer à plusieurs ;
2. **servir d'expérience de développement** : se familiariser avec des concepts et des mécaniques de jeu (auto-battler, roguelike, gacha, paris), avec le calcul, les maths et les statistiques (simulation, valeur nette, cotes, équilibre d'une économie), avec l'ergonomie et la mise en scène. D'où les outils de mesure (`npm run balance`, laboratoire des sorts, audit des compétences, simulations de l'économie des paris) et une documentation qui garde le **pourquoi** de chaque choix.

**Où en est-on** : [ETAT.md](ETAT.md). **Ce qui reste à faire** : [TODO.md](TODO.md).

## Pourquoi

Battler est né comme un prototype de jeu de combat où **tout se joue aux dés et aux caractéristiques**. Le joueur ne contrôle pas les coups : il choisit ses combattants, regarde le combat se dérouler, puis analyse ce qui s'est passé. Le plaisir vient de la mise en scène des jets, de la tension des points de vie et de la lecture des statistiques.

Le projet sert aussi de terrain d'essai : on ajoute des mécaniques une par une (esquive, critique, armure, événements, tournoi, paris) en vérifiant à chaque fois qu'elles restent lisibles à l'écran et équilibrées.

## Principes de conception

1. **Un seul moteur de règles.** Le combat est calculé en entier par une fonction pure (`simulateCombat`). L'écran de combat ne fait que rejouer ce résultat avec des animations. Jouer et simuler donnent donc exactement les mêmes probabilités. Le hasard est injecté : avec une même graine, un combat se rejoue à l'identique, ce qui le rend testable.
2. **Les personnages sont des données.** Un personnage est une définition dans le roster : stats, apparence, événements. On en ajoute sans toucher au moteur.
3. **Des mécaniques extensibles.** Les événements reposent sur des déclencheurs et des effets génériques, les auras sur un registre de statuts. Chaque mécanique est définie à un seul endroit, règles et présentation comprises, et arrive avec ses tests.
4. **L'équilibre se mesure, et il reste typé.** Chaque grosse mise à jour du gameplay se vérifie par simulation (`npm run balance`, méthode dans [EQUILIBRAGE.md](EQUILIBRAGE.md)). La tolérance : entre 42 et 58 %, aucun duel au-delà de 65/35. On équilibre d'abord par les compétences et les mécaniques, les PV en dernier : des personnages tous à 50 % seraient des clones.
5. **Tout se voit.** Une règle qui joue sur le combat doit apparaître à l'écran : dé, badge, journal, bonus sous la barre de vie, statistiques de fin.
6. **Local et sans friction.** Pas de serveur ni de compte. L'historique est enregistré dans le navigateur, le tournoi en cours vit en mémoire.
7. **Format fixe en 16:9.** Le jeu est conçu sur une scène de 1600×900 qui s'adapte à la fenêtre.
8. **Un personnage est un personnage précis, pas une race** (décision de l'utilisateur, 2026-10-18). Les variantes héritent encore du kit de leur original, mais chacune peut avoir sa propre version d'une compétence (Murzug, 0.36.5). Idées, mesures et retouches se font personnage par personnage.
9. **Le jeu des parieurs ne touche jamais au combat.** Ses cotes viennent de combats simulés sur d'autres graines que le vrai combat, et elles restent cachées jusqu'au règlement : on parie à l'intuition.
10. **Un jeu vidéo, pas une page web.** Grandes formes, tuiles, pièces, menus superposés, lisibles de loin ; pas de formulaire ni de tableau de réglages.
11. **Un jeu qu'on regarde, et qu'on peut animer** (décision de l'utilisateur, 2026-10-18). Battler reste un spectacle à résolution automatique. Les observateurs peuvent y ajouter des jeux à eux, comme les paris (0.37.0), qui ne touchent jamais au combat, puis des variables qui pèsent sur l'issue (reliques, édits de tournoi), tirées au sort ou imposées, pour voir naître des métas. Pistes : [ETUDE_AUTOBATTLER.md](ETUDE_AUTOBATTLER.md), [FAMILLES.md](FAMILLES.md), [SORTS.md](SORTS.md).

## Grandes lignes

Déjà en place : le duel, la simulation, les statistiques globales, le tournoi et les événements. Voir [FEATURES.md](FEATURES.md).

Pistes envisagées, sans engagement ni ordre :

- **Plus de contenu** : nouvelles races ou classes, d'autres variantes, plusieurs arènes tirées au sort.
- **Plus d'événements** : nouveaux déclencheurs (critique reçu, esquive, PV sous un seuil, début de combat) et nouveaux effets (poison, étourdissement, vol de vie).
- **Tournoi** : tailles d'arbre variables (8 ou 32), tête de série, sauvegarde facultative.
- **Statistiques** : export ou import de l'historique, courbes d'évolution.
- **Confort** : réglage de vitesse par défaut, raccourcis clavier, version mobile.

Quand une piste démarre, elle passe dans [ETAT.md](ETAT.md) puis dans [FEATURES.md](FEATURES.md) et le [CHANGELOG](../CHANGELOG.md).
