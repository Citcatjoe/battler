# Prompt Claude Code : choix du champion (campagne)

Avant de lancer : copie le dossier `ref/` dans `docs/ref/` du projet.

```
On refait l'écran de choix du champion au début d'une campagne. Références : docs/ref/04-choix-champion.png et docs/ref/05-choix-champion-heritage-indisponible.png. Boutons et glyphes : uniquement les composants du kit (docs/ui-kit/).

PROBLÈMES À RÉGLER
1. On ne peut choisir qu'entre 3 personnages : il faut pouvoir choisir parmi tous (10 aujourd'hui).
2. L'héritage est forcé : il devient optionnel.
3. Le dé du champion n'est pas visible sous sa forme habituelle.

COMPOSITION (voir références)
- Haut : « ← Menu » à gauche, bouton son unique à droite (même composant que les autres écrans), au centre « Campagne », le titre « Choisissez votre champion » et la règle en une ligne (« Il mène seul les 11 combats de l'acte, jusqu'au boss. Une défaite met fin à la partie. »).
- Sous le titre : une rangée avec les portraits de TOUS les combattants, sans nom (même composant que la sélection du duel sur l'écran d'affrontement). Le portrait choisi a un cadre à la couleur du camp. Un bouton carré « Au hasard » (glyphe hasard, infobulle) termine la rangée. Au-delà de 10 : défilement horizontal.
- Scène, de gauche à droite :
  a. la grande illustration du champion choisi (même traitement que sur l'écran d'affrontement : au sol, ombre portée, regard vers le centre) ;
  b. la fiche du champion, même composant que la fiche de l'écran d'affrontement en mode duel : nom, race · classe, stats, puis le dé de combat ;
  c. la ligne de lore du champion, mise en scène comme une citation : grand guillemet « en bronze, texte en italique (~20 px), court filet or en dessous. C'est une donnée du personnage (ex. Gorak : « Sept saisons invaincu dans les fosses de combat de Kar-Dush. Gorak frappe sans finesse mais encaisse tout, et l'on dit qu'un coup manqué ne fait que l'énerver davantage. »). Si la donnée n'existe pas encore, prévois le champ et signale-le-moi ;
  d. sous la citation, le bloc héritage (voir plus bas).
- Bas, centré : bouton primaire XL « CHOISIR CE CHAMPION » (il mène à l’accueil de la campagne, voir prompt-titre-et-campagne.md), à la place habituelle du bouton primaire.
- Il n'y a PAS de bloc « Compétences de départ » : le dé montre déjà les compétences.

NOTES IMPORTANTES (priment sur la maquette)
1. Interrupteurs : utilise le visuel des interrupteurs déjà implémentés dans le jeu. Celui de la maquette n'est qu'indicatif.
2. Dé de combat : il n'a plus que 6 faces. Respecte la grammaire visuelle de cet élément central telle qu'elle est déjà implémentée en jeu (réutilise le composant existant, ne le redessine pas).
3. Couleur de mise en évidence de la fiche : pas de jaune. Elle suit la couleur de camp en vigueur (bleu pour le joueur, comme sur la maquette) : nom, liseré du panneau, jauges, cadre du portrait choisi. L'or reste réservé aux commandes (bouton primaire, interrupteur, Au hasard).

HÉRITAGE
- Un interrupteur « Activer l'héritage », avec une seule ligne d'explication : « Récupère un objet de la dernière partie perdue de ce champion. »
- Supprime la note actuelle « Héritage : N améliorations de sa dernière partie » : la présence d'héritage est définie uniquement par l'interrupteur.
- Si le champion n'a pas de partie précédente : interrupteur désactivé (grisé) et texte « Aucune partie précédente pour ce champion. »
- L'état de l'interrupteur est transmis au lancement de la campagne. Le choix est mémorisé par champion.

MÉTHODE
1. Audit, sans rien modifier : fichiers de l'écran actuel ; d'où viennent la liste des champions (pourquoi 3 seulement), le dé, les stats, le lore ; comment l'héritage est appliqué aujourd'hui ; où sont l'interrupteur, la fiche et le dé existants. Montre-moi l'audit et ton plan, attends ma validation.
2. Implémente sans toucher aux règles de la campagne ni au calcul de l'héritage : seulement la présentation, le choix parmi tous les champions et le câblage de l'interrupteur.
3. Vérification visuelle : captures Playwright 1440×810 des deux états (héritage disponible, indisponible) avec Gorak, et un troisième avec un autre champion. Compare avec docs/ref/, liste les écarts (en tenant compte des notes 1 à 3), corrige, montre-moi les captures.
```
