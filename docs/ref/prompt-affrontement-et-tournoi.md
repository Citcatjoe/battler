# Prompt Claude Code : affrontement unique + arbre du tournoi

Avant de lancer : copie les 7 images de ce dossier dans `docs/ref/` du projet. Le UI kit (`docs/ui-kit/`) est déjà intégré.

```
On refait deux écrans : l'écran d'affrontement (qui absorbe l'actuel écran de duel) et l'arbre du tournoi. Références dans docs/ref/ :
- affrontement-duel.png, affrontement-duel-camp-droit.png, affrontement-tournoi.png, affrontement-saison-son-ouvert.png
- affrontement-regles.png (planche : ce qui change selon le contexte, ce qui ne bouge pas)
- tournoi-arbre-survol.png, tournoi-paris-ouverts.png
Boutons et glyphes : uniquement les composants du kit (docs/ui-kit/).

═══ A. RÈGLES GÉNÉRALES (tous écrans) ═══
1. Son : un seul bouton rond en haut à droite (glyphe haut-parleur). Il ouvre un petit panneau avec deux interrupteurs : Musique et Effets sonores. IMPORTANT : utilise les interrupteurs (switch) qui existent déjà dans le jeu, pas ceux dessinés sur les maquettes (ils n'y sont qu'à titre indicatif). Remplace les deux boutons son/musique séparés partout où ils existent.
2. Retour : un lien « ← … » en haut à gauche, qui ramène toujours au contexte d'origine : « Menu » (duel simple), « Tournoi » (vers l'arbre), « Saison » (campagne).
3. Paris : les parieurs ne sont plus affichés en permanence à l'écran. On y accède par un bouton carré (glyphe « parier ») avec un compteur en pastille (0/2).

═══ B. ÉCRAN D'AFFRONTEMENT UNIQUE ═══
L'écran de duel actuel et l'écran d'avant-match font doublon : on n'en garde qu'un. Choisir « Duel » sur l'écran titre y mène directement ; le tournoi et la saison y arrivent avant chaque combat.

Commun à tous les contextes (ne bouge pas) :
- deux fiches à géométrie fixe (340 px, miroir exact autour du sceau VS), personnages au bord de l'écran, bleu à gauche, rose à droite ;
- sélecteur d'arène en haut (nom + index « 3 / 9 », change le fond en direct) ;
- bouton primaire COMBATTRE, centré en bas, même place partout ;
- actions secondaires en boutons carrés 44 px sans texte (infobulle), sous le VS : Simuler partout ; Parier (avec compteur) en tournoi et en saison seulement.
- Comparaison des stats : sur chaque ligne, le meilleur des deux combattants est surligné à la couleur de son camp (fond teinté, libellé en gras, valeur éclaircie). Égalité : rien. Toujours calculé sur les stats effectives (le build en cours de run les modifie).

Duel (combat « vanilla », aucune progression) :
- intitulé « Duel », retour « ← Menu » ;
- pas de tête de série ; zone du nom de 96 px ;
- dé de combat : kit de base uniquement. Les 12 emplacements restent visibles, grisés au-delà du dé ;
- jamais de face forgée ni de rang ; la section Reliques n'existe pas (pas de « Aucune relique ») ;
- sous les fiches, le sélecteur de combattants : onglets Gauche / Droite (pastille de la couleur du camp), « Au hasard » pour le camp actif, puis les portraits sur une rangée, SANS nom. Le portrait choisi pour chaque camp a un cadre à sa couleur et un repère en coin. Au-delà de 10 combattants : défilement horizontal de la rangée.

Tournoi / saison (progression) :
- intitulé du tour (« Huitièmes de finale · Match 1 ») ou de la saison (« Saison 1 · Combat 4 ») ; retour « ← Tournoi » ou « ← Saison » ;
- tête de série accrochée au bord extérieur du nom ; zone du nom 112 px ;
- faces forgées (fond et cadre dorés), rangs II / III en pastille or, reliques (6 places, « +N » au-delà) ;
- plus de bouton « Arbre » : le retour en haut à gauche le remplace.

═══ C. ARBRE DU TOURNOI ═══
- En haut : « ← Menu », intitulé centré (« Tournoi », nom du tour, « 0 / 15 combats joués »), bouton son.
- En bas, centré : bouton primaire XL « PROCHAIN COMBAT » (remplace le « Combattre » en haut à droite). À gauche : bouton carré Paris (pastille 0/2) qui ouvre un panneau « Paris » au-dessus (classement des parieurs, IA, cagnotte, mises du tour). À droite : bouton carré « Simuler le tour » (pastille ×8, infobulle « Simuler le tour (8 combats) »). Supprime le bandeau de parieurs permanent.
- La carte du prochain combat est cadrée en or avec une étiquette « PROCHAIN ».
- Finale : sceau octogonal avec le glyphe trophée (même famille que le sceau VS) au-dessus de la carte de finale.
- Cartes de combat : elles n'affichent plus ni reliques ni améliorations, seulement le portrait et le nom complet de chaque combattant (avec le numéro de tête de série).
- Les deux actions d'un combat (Affronter, Simuler) sont deux petits boutons carrés (glyphes « combattre » et « simuler ») qui n'apparaissent qu'au survol de la carte, côté intérieur, dans l'espace libéré. Ils apparaissent aussi au focus clavier et au toucher sur écran tactile. La carte survolée prend un liseré or.

═══ MÉTHODE ═══
1. Audit, sans rien modifier :
   - les fichiers des écrans duel, avant-match et arbre ; ce qui peut être fusionné ;
   - comment on sait si un combat est en duel, tournoi ou saison ; d'où viennent le kit de base, les faces forgées, rangs et reliques ;
   - où sont les interrupteurs existants ; où les boutons son/musique sont utilisés ;
   - comment les parieurs sont affichés aujourd'hui (et ce qui doit continuer de marcher).
   Montre-moi l'audit et ton plan, puis attends ma validation.
2. Implémente écran par écran, un commit par étape : (a) règles générales son + retour, (b) affrontement unique, (c) arbre. Aucune modification du moteur, des règles du jeu ni des paris : seulement la présentation, la navigation et le câblage.
3. Vérification visuelle : page de dev avec des données factices pour chaque cas des références (duel camp gauche/droit, tournoi, saison avec le panneau son ouvert, arbre au survol, arbre avec le panneau paris ouvert). Captures Playwright 1440×810, comparaison avec docs/ref/, liste des écarts, corrections, puis montre-moi les captures côte à côte.
```
