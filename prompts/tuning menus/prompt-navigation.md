# Prompt Claude Code : navigation, menu et éléments de menu

Avant de lancer : copie le dossier `ref/` dans `docs/ref/navigation/`. Le UI kit est dans `docs/ui-kit/`.

```
On harmonise la navigation de tout le jeu. Références dans docs/ref/navigation/ (1440×810) :
00 planche des règles · 01/02 écran titre (repos, menu ouvert + survol « Duel libre ») · 03 choix du champion · 04 accueil de la campagne · 05/06 affrontement (duel, tournoi menu ouvert) · 07 arbre du tournoi · 08/09 combat (normal, menu ouvert) · 10 fin d'acte.
Boutons et glyphes : uniquement les composants du kit (docs/ui-kit/). Ne change ni le moteur de combat, ni les règles, ni la mise en page des écrans au-delà de ce qui est décrit ici.

PRINCIPE : deux coins, toujours les mêmes. En haut à gauche on revient en arrière, en haut à droite on ouvre le menu.

═══ 1. BOUTON RETOUR ═══
- Un seul composant <BackButton>, en haut à gauche (28 px du bord, 28 px du haut), sur tous les écrans SAUF : écran titre, combat, fin d'acte.
- Toujours le même libellé : flèche + « RETOUR » (Cinzel 12, capitales, plaque sombre avec cadre or, 40 px de haut, voir 03 à 07). Supprime tous les liens « ← Menu », « ← Retour à l'arbre », « ← Tournoi », etc.
- Il ramène à l'écran précédent du mode en cours :
  · Choix du champion → Écran titre
  · Accueil de la campagne → Choix du champion
  · Affrontement (campagne) → Accueil de la campagne
  · Configuration du tournoi → Écran titre
  · Arbre du tournoi → Configuration (ou Écran titre si le tournoi a commencé)
  · Affrontement (tournoi/saison) → Arbre
  · Duel libre / Combat test → Écran titre
  · Historique, Compendium → l'écran d'où on les a ouverts
- Centralise cette logique (une table ou une fonction « écran précédent ») au lieu de la coder dans chaque écran. Le retour arrière du navigateur / de la souris déclenche la même action.

═══ 2. MENU ≡ (HORS COMBAT) ═══
- Un seul composant <GameMenu> : bouton rond 48 px avec glyphe ≡ en haut à droite (32 px du bord, 24 px du haut), sur TOUS les écrans hors combat, écran titre compris. Il remplace le bouton son partout : supprime les anciens boutons son / musique.
- Clic : ouvre un panneau ancré sous le bouton (300 px, voir 02 et 06), fermé par un second clic, un clic à l'extérieur ou Échap :
  · SON : Musique et Effets sonores, chacun avec son interrupteur. IMPORTANT : réutilise les interrupteurs déjà implémentés dans le jeu, pas ceux de la maquette (indicatifs). Les réglages sont mémorisés.
  · Compendium (ouvre le Compendium ; Retour y ramène à l'écran courant).
  · Écran titre (absent sur l'écran titre). Si une partie est en cours, elle reste reprenable depuis le titre.
- Accessibilité : aria-haspopup, aria-expanded, focus piégé dans le panneau tant qu'il est ouvert, retour du focus au bouton à la fermeture.

═══ 3. COMBAT ═══
- Aucun bouton en haut de l'écran de combat : les deux barres de vie occupent toute la largeur, symétriques autour du numéro de tour (voir 08).
- Le menu devient le dernier outil de la barre de lecture : séparateur, puis bouton ≡ du même style que Journal et Magnétoscope.
- L'ouvrir met le combat en pause (et le bouton Pause passe à « Reprendre », comme aujourd'hui). Le panneau s'ouvre au-dessus de la barre, aligné à droite (voir 09) :
  · SON : Musique, Effets sonores (mêmes interrupteurs) ;
  · Compendium (le combat reste en pause, on y revient avec Retour) ;
  · « Quitter le combat » (en rouge doux, sous-titre « Retour à l'écran précédent · le combat reprendra au début ») : ramène à l'écran d'avant le combat (affrontement ou arbre) sans enregistrer de résultat.
- Fermer le panneau ne relance pas le combat : on reprend avec « Reprendre » ou Espace.

═══ 4. ÉCRAN TITRE : PIED DE PAGE ═══
- Supprime les deux boutons ronds Statistiques et Compendium en haut à gauche.
- En bas à gauche : lien « Historique » avec glyphe horloge (Alegreya Sans 15, glyphe or). C'est l'historique des campagnes (le tournoi reste à part). S'il n'existe pas encore, crée l'entrée et un écran minimal, et signale-le-moi.
- Au centre, en bas : « Duel libre » puis « Combat test », l'un sous l'autre, en petit (13 px), ÉTEINTS (#5C5249, pas de soulignement). Au survol ou au focus seulement : #D8CCBB et filet or dessous (voir 02). Ce sont des modes secondaires.
- En bas à droite : le numéro de version, en très petit (IBM Plex Mono 10, #3E352C).

═══ 5. ÉCHAP ═══
Ordre : ferme d'abord ce qui est ouvert (panneau du menu, fiche, tiroir Journal/Magnétoscope, sélecteur). S'il n'y a rien d'ouvert : ouvre le menu (hors combat comme en combat).

═══ 6. SUPPRIMER LES STATISTIQUES ═══
L'écran Statistiques date de la première version du jeu et n'a plus d'usage. On le retire complètement, avec le poids qu'il fait peser sur le projet :
- l'écran, son lien et sa route ;
- ses composants et styles ;
- le code qui collecte ou met à jour ces statistiques pendant et après les combats, ainsi que leur stockage et leur schéma de données (et une éventuelle migration pour nettoyer les données déjà enregistrées) ;
- les tests et la documentation qui s'y rapportent, y compris les mentions dans CLAUDE.md, pour que ce code ne soit plus chargé dans ton contexte à l'avenir.
Si un élément sert aussi au Compendium, à l'historique des campagnes, au classement ou au journal de combat, ne le supprime pas : signale-le-moi.

═══ MÉTHODE ═══
1. Audit sans rien modifier :
   - tous les boutons et liens de retour existants (fichier, libellé, destination) ;
   - tous les boutons son / musique et leurs interrupteurs ;
   - comment l'écran courant et l'historique de navigation sont gérés ;
   - comment on quitte (ou pas) un combat aujourd'hui ;
   - l'inventaire complet de ce qui touche aux Statistiques (écran, collecte, stockage, tests, docs) et ce qui serait partagé avec d'autres fonctions.
   Montre-moi l'audit et le plan, puis attends ma validation.
2. Après validation, un commit par étape :
   a. suppression des Statistiques (puis vérifier que plus rien n'y fait référence : recherche du nom, imports, tests, et qu'un combat se déroule à l'identique) ;
   b. <BackButton> + table « écran précédent », posé sur tous les écrans ;
   c. <GameMenu> hors combat, suppression des boutons son ;
   d. menu dans la barre de lecture du combat + « Quitter le combat » ;
   e. pied de page de l'écran titre ;
   f. Échap.
3. Vérification :
   - captures Playwright 1440×810 de chaque écran de docs/ref/navigation/ (menus fermés et ouverts), comparées aux références, écarts listés et corrigés, captures montrées côte à côte ;
   - parcours complet au clavier : titre → campagne → choix → accueil → affrontement → combat → menu → quitter → retour jusqu'au titre ; même chose côté tournoi ;
   - vérifier sur chaque écran que RETOUR mène bien à l'écran prévu dans la table.
```
