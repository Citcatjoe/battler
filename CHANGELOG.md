# Changelog

Ce fichier liste les changements entre deux versions du jeu. Il suit le format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le versionnage sémantique, adapté à un prototype :

- **mineure** (0.x.0) : nouvelle fonctionnalité ou nouveau contenu ;
- **correctif** (0.x.y) : correction ou réglage, sans nouvelle fonctionnalité.

La version en cours est celle de `package.json`. Elle s'affiche en bas à droite de l'écran d'accueil.

> Les versions 0.1.0 à 0.10.0 ont été reconstituées à partir des itérations successives du prototype, faites avant la mise en place de cette documentation. Elles n'ont ni date précise ni commit associé.

## [Non publié]

### Ajouté
- **Icônes peintes** à la place des emojis dans les boutons, fiches, statistiques, arbre de tournoi et statuts (`src/assets/icons/`, composant `Icon`). Le journal de combat garde ses emojis pour l'instant.
- `scripts/slice-icons.py` : découpe d'une planche d'icônes générée par ChatGPT Image, y compris quand le damier de transparence est peint dans l'image.
- Écran de sélection : fond illustré (`src/assets/menu-portal.jpg`, portail d'arène au crépuscule), assombri avec un vignettage pour garder les fiches lisibles.
- Onglet Tournoi de l'accueil : fond dédié (`src/assets/menu-tournament.jpg`, porte fortifiée de l'arène vue du parvis), qui remplace la rangée de tout le roster. La présentation et les boutons (« Commencer un tournoi », « Reprendre le tournoi ») sont sur la moitié droite, au style `.btn`.

### Modifié
- `docs/STYLE_BIBLE.md`, section arènes : un bloc fixe générique (rendu et composition) plus une fiche de lieu à remplir, six axes de variation (lieu, intérieur ou extérieur, heure, météo, lumière, palette), un catalogue de 13 lieux prêts à l'emploi (égouts, grande place, cimetière, port, désert, caverne de cristaux, marais, cathédrale, toundra, forge volcanique, bibliothèque…), des garde-fous pour les lieux sombres et un historique des arènes.
- **Boutons au style jeu vidéo** (`.btn`, `.btn-primary`, `.btn-round`, `.tabs` dans `index.css`) : plaques d'or ou de pierre au liseré de bronze, en relief, qui s'enfoncent au clic, avec du texte en Cinzel capitales et des icônes de taille fixe. Appliqués à l'écran de sélection (Statistiques et Son en médaillons, onglets Affrontement / Tournoi, Fiche, Au hasard, Combattre) et à l'écran d'affrontement (Changer, Jouer, Simuler).
- `docs/STYLE_BIBLE.md` : ajout du gabarit de fond de menu (prompt validé du portail) et d'une section sur les icônes d'interface (inventaire des 16 emojis à remplacer, prompt de la planche, conventions de découpe et d'intégration, procédure pour en ajouter, historique des versions).
- `docs/STYLE_BIBLE.md` : direction artistique précisée. Le style reste high fantasy stylisé et peint à la main, avec des couleurs franches par faction et des proportions héroïques exagérées. Les visages sont fins et charismatiques, et le look jeu mobile casual ou gacha (visages ronds ou grossiers, gros yeux, couleurs bonbon, rendu plastique) est explicitement exclu.

## [0.20.1] — 2026-10-17

### Modifié
- Compendium, verticale Bonus et malus : les cartes n'indiquent plus la provenance du statut (personnage, événement, cible, charges). Un statut se lit comme une règle neutre du jeu.
- Interface : « Événement » devient **« Compétence »** (fiche du compendium, onglet et statistiques de l'écran de fin, journal de combat). Le code garde son nom interne (`CharacterEvent`).
- Docs : décision de cadre sur les statuts et les compétences (`STATUTS.md`, `PERSONNAGES.md`) : statuts neutres, compétences liées au personnage, palette par race, 1 passif de race et 2 compétences au plus. `RESOLUTION.md` explique qui fixe le moment d'une résolution (compétence, statut, moteur) et liste les crochets manquants (`onExpire`, effet différé, action sur le dé).

## [0.20.0] — 2026-10-17

Couche de **résolution des affrontements**. Les combats actuels ne changent pas : les 2 160 combats de référence et l'empreinte de non-régression sont identiques.

### Ajouté
- `docs/RESOLUTION.md`, le livre de règles de la résolution :
  - les inspirations (Magic, Slay the Spire, Darkest Dungeon, Pokémon, D&D, Hearthstone) ;
  - la structure d'un affrontement, et la chaîne de calcul d'une attaque en 9 étapes ;
  - six familles d'effets (instantané, continu, périodique, déclenché, remplacement, contrôle) ;
  - les règles d'ordre, l'application et l'opposition ;
  - des exemples d'interactions et les décisions à valider.
- **Tour en trois phases** : début, action, **fin de tour** (nouveau). Nouveau crochet `onTurnEnd`, durée décomptée au début ou à la fin (`expiresAt`), déclencheur d'événement `turnEnd`.
- **Contrôle** : `skipsAction`, le porteur perd son action (étape `skip`).
- **Réactions** des statuts à un déclencheur (`reactions`, étape `statusReaction`), sans réaction en chaîne.
- **Dégâts entrants** (`modifyIncoming`), placés dans la chaîne de calcul entre les dégâts sortants et l'armure.
- **Application d'un statut** (`resolveApplication`), dans l'ordre : immunité du personnage (`immunities`), garde (`wards`, une charge par blocage), opposition (`opposes`, charges annulées une à une), puis cumul et plafond. Le résultat (`result` : posé, neutralisé ou bloqué) apparaît dans le journal (« insensible », « protège », « s'annulent »), dans les badges (« Résisté », « Neutralisé ») et dans les statistiques : un malus bloqué n'est pas compté.
- **Ordre fixe** : l'actif d'abord ; dans une fenêtre, les réactions des statuts puis les événements ; les effets périodiques, bonus puis malus.
- Cinq statuts à venir qui illustrent chaque mécanique : 🔥 Brûlure, 🩸 Vulnérable, 💫 Étourdi, 🌵 Épines et ✨ Garde sacrée. Régénération et Poison deviennent opposés.
- `StatusIcon` : l'icône peinte d'un statut, ou son emoji tant qu'elle n'existe pas. Un test exige une icône peinte pour tout statut en jeu.
- 12 tests de résolution (74 au total).

### Modifié
- `StatusDef.reactions` et les nouveaux crochets sont traduits en phrases par `statusRules`, pour le compendium.
- La mise en scène du combat gère les réactions (nom flottant au-dessus du porteur) et les tours perdus. Son `switch` est exhaustif.

## [0.19.2] — 2026-10-17

### Modifié
- **Compendium, fiche personnage** : le personnage choisi est désormais peint en grand en arrière-plan, centré sur l'emplacement de l'ancien modèle, les pieds en bas de l'écran. Il est assombri et fondu au sol et sur les côtés (masque), avec un halo chaud derrière lui, et il passe sous les encadrés translucides de la fiche. Il apparaît en fondu à chaque changement de personnage. La mise en page ne bouge pas, et les tailles relatives des races sont conservées.

### Corrigé
- Écran de sélection : le libellé du bouton de tirage débordait. Il devient « Au hasard », avec l'icône de dé.

## [0.19.1] — 2026-10-17

### Modifié
- **Compendium, Bonus et malus** :
  - seuls les statuts réellement posés par un personnage sont listés, puisque c'est la liste des effets qu'on peut rencontrer en combat. Les statuts « à venir » ne figurent que dans `docs/STATUTS.md` ;
  - un second niveau de tri, en sous-onglets Bonus et Malus, chacun avec son nombre d'entrées ;
  - une grille de cartes encadrées dans le style du jeu, 4 par ligne, à proportions fixes (4:5). Chaque carte a un médaillon d'icône, un titre, la polarité, l'effet, un filet doré, les règles et un pied « Provenance » (personnage, événement, cible, charges × tours).

## [0.19.0] — 2026-10-17

### Ajouté
- **Zone d'état** en combat, posée sur l'arène au-dessus de la tête de chaque combattant (sa hauteur suit la taille du personnage). Les bonus sont à gauche et les malus à droite, séparés par un trait fin. Chaque état est un médaillon avec son icône peinte, cerclé de vert ou de rouge, et un seul nombre. Les médaillons apparaissent avec une petite animation, et le nombre pulse quand il change. Le survol donne le détail.
- Règle du nombre affiché (`statusCounter`, et `counter` sur chaque statut) : par défaut, les tours restants si le statut a une durée, sinon ses charges.

### Modifié
- Le nom d'un événement de classe (ex. « Souffle de la tombe ») s'affiche en **texte flottant violet**, avec la même animation qu'ESQUIVE ou CRITIQUE, à la place de l'ancien badge arrondi.
- Les pastilles de statut sous la barre de vie sont retirées (`StatusChips` est remplacé par `StatusTray`). Le bandeau des PV est plus fin.
- **Écran d'affrontement** : les stats de chaque combattant s'affichent en **barres**, comme sur l'écran de sélection, à la couleur du camp. Le sélecteur d'arène est un peu plus bas sous le titre.

## [0.18.0] — 2026-10-17

Préparation de deux chantiers : l'arrivée des bonus et malus, et le compendium. Aucune règle en jeu ne change : l'empreinte de non-régression est identique.

### Ajouté
- **Conditions d'événement** (`when`). Un événement peut exiger :
  - des PV (du porteur ou de l'adversaire) sous, ou au-dessus d', une fraction de leur maximum ;
  - la présence d'un statut, avec un minimum de charges, ou son absence ;
  - un tour minimal.
  Toutes les conditions sont requises, et elles sont vérifiées avant le tirage de `chance`. Elles sont décrites en clair (« si l'adversaire est sous 30 % de ses PV ») et vérifiées par `validateRoster`.
- **Plafond de charges** (`maxStacks`) pour les statuts. Brèche, pas encore attribuée, est plafonnée à 3.
- Pour chaque statut, un **résumé** (`summary`) et des **règles générées depuis le code** (`statusRules`) : crochets, cumul, plafond. La règle de durée commune est définie une fois (`STATUS_DURATION_RULE`).
- **Catalogue des statuts** (`src/game/catalog.ts`) : la liste de tous les statuts, en jeu ou à venir, avec qui les pose (personnage, événement, cible, charges, durée).
- **Compendium**, le recueil du jeu en verticales :
  - **Personnages** : la liste par famille et la fiche complète ;
  - **Bonus et malus** : tous les statuts, avec leurs règles et leurs sources.
  On y accède par un bouton rond provisoire sur l'accueil, par le bouton près du nom d'un combattant, ou depuis les statistiques. Le registre des verticales (`compendium/sections.tsx`) permet d'en ajouter de nouvelles.
- Documentation :
  - `docs/README.md` : plan de la documentation et « où documenter quoi » ;
  - `docs/STATUTS.md` : vocabulaire, conditions, catalogue, règles de design et chantier des bonus et malus ;
  - section « Chantiers en cours » dans `ETAT.md`, et section Compendium dans `FEATURES.md`.

### Modifié
- La **fiche personnage** quitte son écran dédié pour la verticale Personnages du compendium (`CharacterScreen` devient `compendium/CharacterSheet`). Les flèches ‹ › sont remplacées par la liste des personnages.
- Le retour du compendium ramène à l'écran d'origine (sélection ou statistiques).

## [0.17.0] — 2026-10-17

### Ajouté
- **Nouvelle race, le mort-vivant**, dont l'archétype est l'affliction. **Ervald** (Chevalier liche) et sa variante **Caldrec** (Faucheur d'âmes) partagent l'événement **Souffle de la tombe** : sur un 1 au dé, l'adversaire est empoisonné (−2 PV au début de chacun de ses 3 tours suivants). C'est la première race qui pose une aura négative sur l'adversaire. Les deux personnages ont leur fiche, leur section dans `docs/PERSONNAGES.md`, et sont équilibrés par simulation (50,3 % et 50,2 %).
- `scripts/cutout-character.py` : détourage d'un personnage généré sur fond uni (alpha adouci, sans liseré, recadrage).
- `FAMILIES` (`roster.ts`) : les personnages regroupés par famille, l'original suivi de ses variantes.
- Sélecteur d'arène ‹ › sur l'écran d'affrontement, utilisable aussi avec les flèches du clavier.

### Modifié
- **Écran de sélection** :
  - « Combattant de gauche » et « Combattant de droite » sont retirés, et le nom est plus grand.
  - La fiche s'ouvre avec un petit bouton rond placé à côté du nom.
  - Les vignettes sont rangées en colonnes par famille, l'original en haut et ses variantes dessous.
  - Un grand bouton « Personnage au hasard » est placé sous les vignettes.
- **Écran d'affrontement** : l'arène se choisit en haut, sous « Affrontement », avec un sélecteur ‹ nom › qui change le décor en fond. Le décor est un peu plus visible qu'avant.
- Palette du tournoi rangée par famille, avec des vignettes un peu plus petites.
- Écran des statistiques globales en deux onglets (Classement, Confrontations), pour tenir avec 8 personnages.
- Empreinte de non-régression : la graine de chaque duel est tirée du nom de la paire. Ajouter un personnage n'ajoute que des lignes, sans changer celles des duels existants. L'instantané a été régénéré pour cette raison et pour les nouveaux duels. Les 2 160 combats de référence des six personnages d'origine ont été rejoués sans aucune différence : aucune règle n'a changé.

### Corrigé
- Descriptions des statuts insérées dans une phrase : seule la première lettre passe en minuscule (« perd 2 PV » au lieu de « perd 2 pv »).

## [0.16.0] — 2026-10-17

### Ajouté
- **Choix de l'arène** sur l'écran d'affrontement. Sous le « VS », une vignette par arène et un choix « Au hasard », tiré au lancement du combat. L'arène choisie apparaît, très assombrie, en fond de l'écran d'affrontement, et le choix est gardé pour les combats suivants de la session. Purement décorative, elle ne change aucune règle.
- Nouvelle arène : **Cour de Durnhold**, cour de forteresse naine face aux montagnes enneigées (`arena-dwarf-fortress.jpg`).
- Registre des arènes (`src/game/arenas.ts`) : image, nom, cadrage du sol et traitement du décor pour chaque arène.
- Composant d'onglets commun (`Tabs.tsx`), au style du jeu, utilisé par la fiche personnage et le résumé de combat.

### Modifié
- **Résumé de combat** : les statistiques sont réparties en quatre onglets (Bilan, Critiques et défense, Événements, Dés), dans une zone de hauteur fixe. Le contenu ne déborde plus en bas de l'écran.
- **Écran de sélection** : les règles du jeu sont retirées. Le bouton « Combattre » est centré seul en bas, et les combattants sont plus grands (580 px au lieu de 480).

## [0.15.1] — 2026-10-17

### Corrigé
- Journal du combat décalé vers la gauche. L'animation d'ouverture ajoutait un second décalage à celui du centrage de Tailwind (propriété `translate`).
- Journal affiché derrière les combattants : il est maintenant au premier plan.

### Modifié
- Composition du combat : les combattants sont remontés (pieds à 88 px du bas, sur la terre battue) et un peu plus petits (470 px au lieu de 540), pour qu'ils paraissent debout dans l'arène plutôt que collés au bord de l'écran.

## [0.15.0] — 2026-10-17

### Modifié
- **Écran de combat** : la bande noire du bas (journal et commandes) est supprimée et l'arène occupe toute la hauteur sous les barres de vie. Les combattants sont un peu plus grands.
- **Journal** masqué par défaut. Il s'ouvre dans une petite fenêtre translucide et floutée, placée entre les combattants, via le bouton « Journal » ou la touche **J**. Un compteur signale les lignes arrivées pendant qu'il est fermé. S'il est ouvert, il le reste pour les combats suivants de la session ; un rechargement de la page le masque à nouveau.
- Pause, vitesse et journal sont regroupés dans une barre flottante en bas au centre. Elle ne tremble plus avec l'arène sur les gros coups.

## [0.14.1] — 2026-10-17

### Corrigé
- Fiche personnage : le contenu débordait de l'écran.

### Modifié
- La fiche personnage est répartie en deux onglets. **Fiche** contient l'accroche, le background, les forces et faiblesses, l'événement, les caractéristiques et la comparaison avec la variante. **Statistiques** contient le palmarès, le bilan par adversaire et les derniers combats. L'onglet choisi est conservé en passant d'un personnage à l'autre.

## [0.14.0] — 2026-10-17

### Ajouté
- **Fiche de chaque personnage** : accroche, background court, forces et faiblesses (`lore` dans `roster.ts`), affichés sur l'écran du personnage. `validateRoster` vérifie que la fiche est complète et courte.
- `docs/PERSONNAGES.md` : la philosophie de chaque personnage, comment il gagne et comment il perd, la justification de ses stats et de son événement, les chiffres mesurés, la matrice des duels et une check-list de design.

### Modifié
- **Coup fatal plafonné** : un coup ne compte plus que les PV qu'il restait (il reste 5 PV, un coup de 6 compte 5). Cela s'applique aux dégâts infligés, aux dégâts des critiques, au meilleur coup, au dernier coup et à l'historique. À l'écran, la frappe affiche toujours sa force réelle (−6). Nouveau champ `dealt` sur chaque attaque. Les combats déjà enregistrés dans l'historique gardent l'ancien décompte.

## [0.13.0] — 2026-10-17

Consolidation des mécaniques avant l'ajout de nouveaux personnages et de nouvelles mécaniques. **Les règles en jeu ne changent pas** : 2 160 combats à graine fixe donnent exactement le même résultat avant et après.

### Ajouté
- **Statuts (auras)** positifs ou négatifs, dans un registre unique (`statuses.ts`). Chaque statut porte sa présentation, sa règle de cumul (`add`/`refresh`), une durée facultative en tours, et des crochets de règles : `modifyStats`, `modifyOutgoing`, `forcesCrit`, `shield`, `onTurnStart`.
- Quatre statuts prêts, pas encore attribués : ☠️ Poison, 💚 Régénération, 🥀 Affaibli, 💔 Brèche.
- **Déclencheurs** : `combatStart`, `turnStart`, `naturalMax`, `hit`, `crit`, `missed`, `dodge`, `hurt`, `bloodied`, en plus de `naturalOne`.
- **Effets** : dégâts directs et purge des bonus ou des malus, en plus du soin et de la pose de statut. Chaque effet peut viser l'adversaire. Les événements acceptent `chance` et `limit`.
- Pastilles de statut colorées selon la polarité, avec la durée restante, et aura au sol sous les combattants qui portent des bonus ou des malus.
- Écran de fin : dégâts subis hors des coups, malus reçus. Une fin aux PV est gérée, en cas de limite de tours.
- **Tests automatisés** (Vitest, 49 tests) : moteur, chaque mécanique, stats, narration, tournoi, historique, équilibre, empreinte de non-régression, rendu de chaque écran. Scripts `npm test` et `npm run check`.
- `validateRoster` : vérification des données des personnages, dans les tests et au démarrage en développement.

### Modifié
- **Moteur** (`combat.ts`) découpé en phases fixes, qui produisent une chronologie (`beats`) avec l'état complet après chaque étape. L'écran de combat, les stats, le tournoi et l'historique ne lisent plus que cette chronologie.
- **Hasard injectable** (`rng.ts`) : plus aucun `Math.random` dans les règles ; combats et remplissage du tournoi reproductibles avec une graine.
- `Character` devient une pure donnée (les jets sont dans le moteur). `renamed` est remplacé par `withName`, et les personnages ne sont instanciés qu'une fois (`CHARACTERS`).
- Textes du journal et badges générés depuis le registre (`narration.ts`) : plus aucun statut nommé en dur dans l'interface.
- Statistiques déplacées dans `stats.ts`.

### Corrigé
- Un match de tournoi pouvait être compté dans l'historique sans être accepté par l'arbre (match déjà joué). L'arbre valide désormais d'abord le résultat (match prêt, bons combattants).
- L'écran de fin supposait que le combat finissait toujours par un coup du vainqueur.

### Retiré
- `BuffChips` (remplacé par `StatusChips`), `TRIGGER_LABEL` et `BUFF_INFO` (remplacés par `TRIGGERS` et `STATUSES`).

## [0.12.0] — 2026-10-17

### Ajouté
- `docs/STYLE_BIBLE.md` : direction artistique, contraintes techniques des images et prompts pour ChatGPT Image.

### Modifié
- Nouveau fond de combat, original et généré : `arena-ruins.jpg` (arène forestière en ruines au crépuscule). Il remplace le placeholder `arena1.jpg`, qui est supprimé.
- Traitement du fond un peu moins sombre et moins désaturé (`brightness 0.5`, `saturate 0.85`), pour garder la lumière du crépuscule.

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
