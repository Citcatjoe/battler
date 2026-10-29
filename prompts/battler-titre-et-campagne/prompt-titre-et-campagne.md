# Prompt Claude Code : écran titre, enchaînement des écrans, accueil de la campagne

Avant de lancer : `ref/` copié dans `docs/ref/`, `assets/*.webp` copiés dans le dossier des images du jeu. Le UI kit est déjà dans `docs/ui-kit/`.

```
On refait l'écran titre et l'entrée en campagne. Références dans docs/ref/ (1440×810) :
- 01-titre-repos.png, 02-titre-survol-campagne.png, 03-titre-survol-tournoi.png
- 04/05 : choix du champion (déjà décrit dans un prompt séparé)
- 06-accueil-campagne.png, 07-accueil-campagne-non-classe.png, 08-accueil-campagne-fiche-ouverte.png
- 09-enchainement-ecrans.png : le flow complet
Boutons, plaques et glyphes : uniquement les composants du kit (docs/ui-kit/). Les deux images peintes sont fournies : titre-campagne.webp et titre-tournoi.webp.

═══ A. ENCHAÎNEMENT DES ÉCRANS (voir 09) ═══
Le jeu a désormais deux modes principaux, Campagne et Tournoi/saison. Duel et Combat test deviennent secondaires.
- Titre → Campagne → Choix du champion → Accueil de la campagne → Affrontement ⇄ Combat (×11) → Fin d'acte.
  · Fin d'acte : « Continuer sans fin » (série d'affrontements jusqu'à la défaite) ou « Terminer l'aventure » (retour au choix du champion).
  · Défaite en campagne : retour au choix du champion.
- Titre → Tournoi/saison → Configuration → Arbre ⇄ Affrontement ⇄ Combat → Victoire → Titre (ne pas modifier ces écrans dans ce lot, seulement le branchement depuis le titre).
- Duel libre et Combat test : accessibles depuis le coin « Autres modes » du titre, ils gardent leur chemin actuel.
- Statistiques et Compendium : depuis les deux icônes en haut à gauche du titre.
- Le lien « ← » en haut à gauche de chaque écran ramène à l'écran précédent du mode en cours (ex. Accueil de la campagne → « ← Choix du champion » ; Choix du champion → « ← Menu »).
Les écrans Configuration du tournoi, Défaite et Fin de série ne sont pas encore dessinés : garde l'existant ou un écran minimal, et liste-les dans ton compte rendu.

═══ B. ÉCRAN TITRE (01, 02, 03) ═══
Un diptyque : deux volets de 720 px, chacun cliquable en entier (un seul élément interactif par volet, accessible au clavier, aria-label « Campagne » et « Tournoi ou saison »).
- Fond de chaque volet : son image peinte.
  · Campagne : titre-campagne.webp, 620 px de large, centrée (marge 50 px de chaque côté), remontée de 40 px. Le champion et le chemin de pierres doivent rester entièrement visibles AU-DESSUS de la plaque.
  · Tournoi : titre-tournoi.webp, 720 px de large, remontée de 40 px.
  · Par-dessus, un fondu : sombre en haut (sous le logo), transparent au milieu, puis vers #0E0B09 à partir de 52 % de la hauteur, opaque vers 86 %. Plus un léger assombrissement du bord extérieur et du bord central.
- Au centre, entre les volets : un filet vertical or (dégradé transparent → #8A6424 → transparent) et un petit sceau octogonal « ou ».
- En haut au centre : le logo BATTLER (Cinzel 72, dégradé or), et un filet sous le logo.
- Sur chaque volet, en bas et centré (à partir de y ≈ 560) :
  · la plaque gravée « CAMPAGNE » / « TOURNOI » (340 × 80, coupe octogonale : cadre or, jour sombre, plaque, filet gravé intérieur) ;
  · l'accroche (Alegreya Sans 17) : « Un champion, onze combats, un boss. Puis l'arène sans fin : jusqu'où ira-t-il ? » / « Seize combattants, élimination directe, des paris entre amis. Ou une saison entière. » ;
  · une ligne d'état en IBM Plex Mono 12 dans un cartouche : partie en cours (« En cours · Gorak, combat 4 sur 11 », « Saison 1 · combat 4 sur 15 ») ; n'affiche rien s'il n'y a pas de partie en cours.
- Survol (et focus clavier) d'un volet : son image s'éclaire légèrement et grossit de 3 %, sa plaque devient pleine or (texte #24170A), l'autre volet s'assombrit (brightness 0.5) et son texte passe à 55 % d'opacité. Transition sobre (~200 ms), désactivée si prefers-reduced-motion.
- Coins : en haut à gauche, boutons ronds Statistiques et Compendium ; en haut à droite, le bouton son unique (même composant que les autres écrans) ; en bas à gauche, « AUTRES MODES » suivi des liens Duel libre et Combat test ; en bas à droite, la version.
- Les modèles de personnages ne sont plus utilisés sur cet écran.

═══ C. ACCUEIL DE LA CAMPAGNE (06, 07, 08) ═══
Écran qui vient APRÈS le choix du champion. Il explique le concept (campagne puis mode sans fin) et montre le classement avant d'entrer dans l'acte I.
- Haut : « ← Choix du champion », surtitre « MODE SANS FIN », titre « Jusqu'où ira votre champion ? », bouton son.
- Colonne gauche (470 px) :
  · « LE PARCOURS » : 11 losanges (les combats), un sceau octogonal tête de mort (le boss), un sceau or ∞ (sans fin) ; ligne grise jusqu'au boss puis or ; libellés centrés sous leur repère, « au choix » au milieu du segment boss → ∞ ;
  · trois étapes numérotées (texte exact sur 06).
- Colonne droite (832 px) : le classement.
  · En-tête « CLASSEMENT » + onglets Semaine / Saison / Depuis toujours.
  · Colonnes : rang, tête du champion, joueur (nom en gras, champion · race · classe en petit), SÉRIE (mesure principale, en or), POINTS, DÉ, RELIQUES. Tri : série, puis points.
  · Podium : rang 1/2/3 dans un octogone or / argent / bronze ; la ligne 1 a un léger fond doré.
  · La ligne du joueur est épinglée en bas, en bleu (couleur du joueur), avec son rang même hors top 10 ; non classé : « Battez le boss d'une campagne pour entrer au classement. » (07).
  · Clic (ou Entrée) sur une ligne : la fiche du champion s'ouvre dans la colonne gauche, à la place des explications (08) : portrait, nom, « champion de <joueur> », trois chiffres (Série, Points, Rang), stats, dé complet (faces forgées et rangs), reliques ; bouton × pour fermer ; la ligne consultée reste surlignée. Couleurs neutres (pas de bleu ni de rose : ce n'est pas un camp).
- Bas centré : bouton primaire XL « ENTRER DANS L'ACTE I », qui lance le premier combat avec le champion choisi.
- Données : le classement viendra du backend plus tard. Pour l'instant, crée une interface de données (type + source) et une source factice locale ; signale-moi ce qu'il faudra brancher.

═══ MÉTHODE ═══
1. Audit sans rien modifier : le routeur / la machine d'états des écrans, l'écran titre actuel, l'enchaînement actuel de la campagne, ce qui sert au duel et au combat test, où est stocké l'état « partie en cours ». Montre-moi l'audit, le plan et les fichiers touchés, puis attends ma validation.
2. Après validation, un commit par étape : (a) enchaînement et liens retour, (b) écran titre, (c) accueil de la campagne. Ne touche ni au moteur de combat, ni aux règles, ni aux écrans du tournoi.
3. Vérification visuelle : captures Playwright 1440×810 de chaque état des références (titre repos / survol campagne / survol tournoi ; accueil classé / non classé / fiche ouverte), comparaison avec docs/ref/, liste des écarts, corrections, puis montre-moi les captures côte à côte. Vérifie aussi la navigation complète au clavier sur le titre.
```
