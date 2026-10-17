# Intention du projet

## Pourquoi

Battler est un prototype de jeu de combat où **tout se joue aux dés et aux caractéristiques**. Le joueur ne contrôle pas les coups : il choisit ses combattants, regarde le combat se dérouler, puis analyse ce qui s'est passé. Le plaisir vient de la mise en scène des jets, de la tension des points de vie et de la lecture des statistiques.

Le projet sert aussi de terrain d'essai : on ajoute des mécaniques une par une (esquive, critique, armure, événements, tournoi) en vérifiant à chaque fois qu'elles restent lisibles à l'écran et équilibrées.

## Principes de conception

1. **Un seul moteur de règles.** Le combat est calculé en entier par une fonction pure (`simulateCombat`). L'écran de combat ne fait que rejouer ce résultat avec des animations. Jouer et simuler donnent donc exactement les mêmes probabilités.
2. **Les personnages sont des données.** Un personnage est une définition dans le roster : stats, apparence, événements. On en ajoute sans toucher au moteur.
3. **Des mécaniques extensibles.** Les événements reposent sur des déclencheurs et des effets génériques, pour pouvoir ajouter d'autres moments de déclenchement plus tard.
4. **L'équilibre se mesure.** Chaque changement de stats se vérifie par simulation (environ 20 000 combats par paire). La cible : chaque personnage gagne entre 45 et 55 % de ses combats.
5. **Tout se voit.** Une règle qui joue sur le combat doit apparaître à l'écran : dé, badge, journal, bonus sous la barre de vie, statistiques de fin.
6. **Local et sans friction.** Pas de serveur ni de compte. L'historique est enregistré dans le navigateur, le tournoi en cours vit en mémoire.
7. **Format fixe en 16:9.** Le jeu est conçu sur une scène de 1600×900 qui s'adapte à la fenêtre.

## Grandes lignes

Déjà en place : le duel, la simulation, les statistiques globales, le tournoi et les événements. Voir [FEATURES.md](FEATURES.md).

Pistes envisagées, sans engagement ni ordre :

- **Plus de contenu** : nouvelles races ou classes, d'autres variantes, plusieurs arènes tirées au sort.
- **Plus d'événements** : nouveaux déclencheurs (critique reçu, esquive, PV sous un seuil, début de combat) et nouveaux effets (poison, étourdissement, vol de vie).
- **Tournoi** : tailles d'arbre variables (8 ou 32), tête de série, sauvegarde facultative.
- **Statistiques** : export ou import de l'historique, courbes d'évolution.
- **Confort** : réglage de vitesse par défaut, raccourcis clavier, version mobile.

Quand une piste démarre, elle passe dans [ETAT.md](ETAT.md) puis dans [FEATURES.md](FEATURES.md) et le [CHANGELOG](../CHANGELOG.md).
