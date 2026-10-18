# Étude : Battler face aux règles des auto-battlers

_Étude du 2026-10-18, faite sur la version 0.35.3. Elle ne modifie rien : c'est une base de réflexion pour choisir les prochains chantiers._

**Ce que contient ce document**

1. Un état des lieux du jeu et du code, avec les limites que les choix actuels entraînent.
2. Ce que font les jeux de référence du genre (auto-battlers, deckbuilders, tactiques), et les principes qu'on peut en tirer.
3. Une confrontation : Battler, principe par principe.
4. Un modèle de briques « aplati », pour que les mécaniques s'empilent sans effets de bord.
5. Des quick wins, des chantiers moyens et des mécaniques éprouvées, classés par coût et par risque.
6. Une feuille de route et les questions qui reviennent à l'utilisateur.

Les chiffres cités viennent de `EQUILIBRAGE.md` et `PERSONNAGES.md` (version et échantillon indiqués là-bas). Les constats sur le code renvoient aux fichiers.

---

## 0. En une page

**Ce qui est déjà solide, et rare dans un prototype** : un moteur unique et pur (`simulateCombat`), une chronologie qui sert de contrat, des graines rejouables, un audit indépendant, une empreinte de non-régression, et une vraie méthode d'équilibrage par contrefactuel (valeur nette). C'est exactement l'architecture que recommandent les auto-battlers déterministes : on simule, puis on rejoue. Il ne faut pas y toucher.

**Les trois limites de fond**

1. **Le joueur ne décide presque rien.** Il choisit deux combattants, puis il regarde. Or, dans un auto-battler, le plaisir vient d'une décision prise **avant** le combat, dont le combat est le verdict. Sans couche de décision, une « synergie » est toujours subie (un matchup), jamais construite.
2. **Les mécaniques sont des cas particuliers.** Les 31 statuts reposent sur une vingtaine de crochets, dont beaucoup ne servent qu'à un seul statut (`coinToss`, `fillsOnHurt`, `reflectsHit`, `drainsHit`…). Chaque personnage invente sa mécanique, au lieu de réutiliser un petit vocabulaire partagé. C'est la source des effets de bord relevés dans `SYSTEMES.md` (§ 7 et § 8), et c'est ce qui empêche les effets de se combiner.
3. **La lisibilité dépend du personnage.** L'orc, le nain et l'ogre se lisent tout seuls. Le paladin (jauges en mémoire), la voleuse (un d3 qui ne frappe jamais) et le druide (deux formes, six compétences, une relance secrète, un statut composite) demandent de connaître des règles invisibles à l'écran.

**Ce que l'étude recommande**, dans cet ordre :

1. **Présentation d'abord, à résultats identiques** : une fiche sensorielle déclarée dans le registre, une palette sémantique unique, la décomposition visible du coup, l'annonce des charges « armées » (les intentions de Slay the Spire), une table du tempo. Rien ne change dans les règles, et l'empreinte ne bouge pas.
2. **Aplatir le moteur, toujours à résultats identiques** : remplacer les crochets à usage unique par **trois fenêtres d'usure** (prochaine action, prochain coup porté, prochain coup reçu) et des réactions dont le montant lit le contexte du coup. L'empreinte de 36 combats sert de preuve, comme lors de la refonte 0.13.0.
3. **Un vocabulaire d'une dizaine de familles de mots-clés**, chacune avec sa règle, son moment, sa couleur, son cadre d'icône et sa famille de sons.
4. **Ensuite seulement, une couche de décision** : la plus naturelle pour Battler est de **construire son dé** (choisir quelle compétence va sur quelle face), à la manière de Slice & Dice ou Dice Forge. Les équipes viendraient après, sur le modèle de file de Super Auto Pets, qui garde un duel au cœur du moteur.

---

## 1. État des lieux

### 1.1 Ce qu'est Battler aujourd'hui

- **Un duel automatique** au tour par tour, entre deux personnages choisis parmi 18 (9 familles × 2 variantes). Un tournoi à 16 enchaîne des duels.
- **La grammaire du dé** est le cœur du jeu. Chaque personnage a un dé de dégâts (d7 à d14). Un 1, un 2 ou un 3 déclenche la compétence de cette face, et le coup est sacrifié (`forfeitsHit`, 28 compétences sur 30). Le reste du dé frappe.
- **Trois compétences par famille**, une par face basse. Le 3 pose une aura permanente et cumulable.
- **Les variantes ne changent que les stats** : elles partagent les compétences de leur famille.

### 1.2 Ce qui tient bien (à garder tel quel)

| Acquis | Pourquoi c'est précieux pour un auto-battler |
| --- | --- |
| Moteur pur, chronologie (`beats`) rejouée par l'écran | Le combat est un **verdict calculé** : on peut l'expliquer, le rejouer, le tester. C'est le modèle des auto-battlers déterministes (voir § 2). |
| Graine, triche passant par le moteur, traces sur disque | Chaque combat signalé se rejoue à l'identique. |
| Audit indépendant, empreinte de non-régression | On peut refondre le moteur et **prouver** que rien n'a changé (déjà fait en 0.13.0 sur 2 160 combats). |
| Valeur nette par contrefactuel | C'est la bonne mesure : elle isole l'effet d'une compétence (Slay the Spire a construit son équilibre sur les métriques, voir § 2). |
| Ordre de résolution écrit (`RESOLUTION.md`) | Actif d'abord, fenêtres fixes, pas de chaîne, K.O. après chaque effet : c'est déjà un livre de règles à la Magic. |
| Statuts neutres, compétences liées au personnage | La bonne séparation : un Poison est un Poison chez tout le monde. |

### 1.3 Les limites induites, une par une

#### L1. Pas de couche de décision

Le joueur choisit les deux combattants et l'arène. Il ne construit rien, ne parie sur rien, ne fait aucun choix entre deux rounds du tournoi. Toute synergie est donc une rencontre entre deux kits fixés à l'avance. On peut l'observer (« Furie contre Épines »), mais pas la provoquer.

#### L2. Une seule famille de déclencheurs

D'après `SYSTEMES.md` (§ 2.3), les compétences n'utilisent que `naturalOne`, `naturalTwo` et `naturalThree`. Dix déclencheurs sont prêts et testés : `naturalMax`, `hit`, `crit`, `missed`, `dodge`, `hurt`, `bloodied`, `combatStart`, `turnStart`, `turnEnd`. Seuls `hit` et `hurt` servent, et uniquement à des réactions de statuts. Les conditions `when`, `chance` et `limit` ne sont utilisées par personne.

Conséquences :
- toutes les compétences ont la même fréquence implicite, fixée par la taille du dé (3 jets sur 7 pour un d7, 3 sur 14 pour un d14) ;
- **aucune compétence ne répond à ce que fait l'adversaire** (esquiver, encaisser un critique, passer sous la moitié des PV). Or les auto-battlers tirent l'essentiel de leurs combos de ces réactions : « quand un allié est blessé », « quand il meurt », « au début du combat » chez Super Auto Pets.

#### L3. Des kits fermés, sans mot-clé partagé

Les trois compétences d'une famille agissent chacune de leur côté. Les exceptions confirment la règle : Œil de faucon et Aura de précision se répondent (le critique assuré profite du multiplicateur), comme les coups et l'Aura de décoction. Ailleurs, aucun effet ne lit l'état produit par un autre. Les conditions qui le permettraient (`hasStatus` : « si l'adversaire est empoisonné ») existent, mais ne servent pas.

#### L4. Un vocabulaire trop large et trop spécifique

| Mesure | Valeur | Lecture |
| --- | --- | --- |
| Statuts | 31, dont 7 « à venir » | Beaucoup de noms à apprendre pour 18 personnages |
| Crochets de statut | une vingtaine | Dont plus de la moitié pour un seul statut |
| Types d'étapes de la chronologie | 10 | `statusReaction` en regroupe trois sortes, que l'écran doit distinguer en relisant le registre |
| Fichiers qui connaissent le coup sacrifié | 12 | La mécanique la plus couplée du jeu |
| Fichiers qui connaissent les formes | 12 | Idem |

Un jeu de cartes auto-battler bien construit vise plutôt **huit mots-clés** et tire sa profondeur de leurs **paires** (voir § 2). Battler fait l'inverse : chaque famille arrive avec sa mécanique propre (jauges, pièce, formes, coup transformé), donc les paires possibles restent rares, et chaque ajout touche tout le code.

#### L5. Une temporalité implicite, codée à la main

« Au prochain coup porté », « au prochain coup reçu », « à la prochaine action » : ces trois moments reviennent dans la moitié des statuts (Vol de vie, Critique assuré, Riposte, Esquive améliorée, Furie, Coup de chance, Pile ou face, Peur). Mais aucun n'est une notion du moteur. Chacun est réglé dans `strikeOnce` (`src/game/combat.ts:628`), dans un ordre décidé au cas par cas : critique forcé, esquive forcée, boucliers, vol de vie esquivé, jauges, Luciole, vol de vie, riposte, puis les fenêtres.

C'est pour cela que la question « que fait ce statut d'un coup sacrifié ? » doit être reposée à chaque nouveau statut. La Riposte l'a oubliée (bug corrigé en 0.32.0).

#### L6. Des dégâts directs non typés

Poison, épines, riposte, pièce, rétribution et pourriture sont tous des « dégâts directs » : ils ignorent armure, esquive et boucliers. Ils sont donc puissants (passer le poison de 2 à 3 PV par tour portait Ervald de 50 à 62 %) et sans contre. La question est ouverte dans `RESOLUTION.md` (§ 9). Sans type de dégâts, il ne peut exister ni résistance ciblée, ni interaction défense contre attaque comme celles de The Bazaar (le poison y traverse le bouclier, la brûlure y est réduite de moitié).

#### L7. Une présentation hors du registre

D'après `SYSTEMES.md` (§ 4 et § 7.2) :
- **le son est deviné**, pas déclaré : `cueFor` (`src/game/useCombat.ts:223`) le déduit des effets par une cascade de sept priorités. Un futur Étourdi sonnera comme la Peur, et un malus posé sur soi fera tic-tac comme l'Attente ;
- **les couleurs se contredisent** : l'ambre veut dire « critique » (texte du coup, `Fighter.tsx`) et « bonus posé » (`TONE_CLASS`, `src/game/narration.ts:29`). Le violet signale toute compétence, sans distinguer attaque, défense ou contrôle ;
- **la couleur des textes du coup est écrite en dur** dans `Fighter.tsx`, hors de `TONE_CLASS` ;
- **le rythme** tient en 34 attentes écrites en dur dans `useCombat`, qui doivent rester d'accord avec les durées du CSS.

#### L8. Ce que le joueur ne voit pas

| Information | Aujourd'hui |
| --- | --- |
| Pourquoi ce coup fait 9 (puissance +2, intimidation −2, armure, bouclier) | dans le journal seulement |
| Une charge qui attend (Vol de vie, Riposte, Œil de faucon) | une icône dans la zone d'état, rien ne dit « prête » |
| Le multiplicateur de critique gagné (Aura de précision) | invisible sur le chiffre |
| Le bonus que retirera la Purification | implicite : « le dernier posé » |
| La relance du Coup de griffe | jamais montrée (voulu) |

Slay the Spire et Into the Breach ont montré qu'**annoncer ce qui va arriver** fait la satisfaction de ce genre de jeu (§ 2). Battler annonce peu.

#### L9. Une lisibilité inégale selon les personnages

Grille proposée, inspirée des « drapeaux rouges » de Magic (§ 2.3) : on compte, par famille, ce qui demande au spectateur un effort que l'écran ne fait pas pour lui.

| Drapeau rouge | Exemple dans Battler |
| --- | --- |
| **Mémoire requise** : il faut se souvenir de ce qui s'est passé | jauges de la Rétribution (les 3 derniers coups reçus) |
| **Promesse non tenue** : l'effet ressemble à autre chose que ce qu'il fait | le d3 vert de Coup de chance ressemble à un coup en plus, mais ne frappe jamais |
| **Information cachée** | relance secrète du Coup de griffe |
| **Cible implicite** | Purification : « le dernier bonus posé » |
| **Statut composite** (plusieurs règles sous un nom) | Luciole : esquive à 0, +2 dégâts reçus, usure par coup |
| **Identité qui change** | les formes du druide |
| **Effet souvent sans effet** | Aura d'immunité contre un adversaire qui ne pose aucun malus |
| **Remplacement d'action** | Pile ou face remplace tout le tour |

| Famille | Drapeaux | Lecture |
| --- | --- | --- |
| Orc, Nain, Ogre, Elfe | 0 | se lit seul (l'Aura de précision est juste peu visible) |
| Mort-vivant | 0 à 1 | Vol de vie qui attend |
| Prêtresse | 1 | Purification à cible implicite |
| Voleuse | 2 | d3 trompeur, remplacement d'action |
| Paladin | 2 | jauges en mémoire, immunité souvent vide |
| Druide | 4 | formes, relance cachée, composite, six compétences |

Ces difficultés recoupent les compétences à valeur nette nulle ou négative : Pile ou face (environ −5 points), Coup de chance (+1 à +3), Fleur de vie (+0,2 à +0,7), Aura d'immunité (−1,7 à −2,1). **Une compétence qui pèse peu et se lit mal coûte deux fois** : elle n'apporte ni victoire, ni moment de jeu.

#### L10. Le duel est écrit en dur

`Side = 0 | 1` et `Pair<T>` apparaissent dans 19 fichiers (65 occurrences de `Pair<`). Passer à des équipes de plusieurs unités demanderait de toucher le moteur, la chronologie, l'écran, les statistiques, l'historique et le tournoi. Ce n'est pas un défaut aujourd'hui, mais c'est une refonte, pas un quick win (piste moins coûteuse au § 5.4).

#### L11. Des combats longs, et des boucles sans issue

Les combats durent de 19 à 39 tours en moyenne (prêtresses). Soins cumulés contre dégâts rognés : Brokk perd 28/72 contre les prêtresses, parce qu'il inflige environ 3,3 dégâts par tour, moins que le soin cumulé. Les auto-battlers bornent presque tous la durée par une montée de tension (§ 2) ; Battler n'a qu'une limite de sécurité à 1 000 tours.

---

## 2. Ce que font les jeux de référence

### 2.1 Tableau de synthèse

| Jeu | Ce qu'il fait | Ce que ça induit | Pour Battler |
| --- | --- | --- | --- |
| **Super Auto Pets** | Équipe en ligne ; seules les deux unités de tête se battent ; capacités sur un petit nombre de déclencheurs (début du combat, avant d'attaquer, blessé, mort, ami invoqué) ; ordre de résolution par attaque, la plus forte d'abord. | Des combos par **réactions en chaîne entre unités**. Un ordre public et simple permet de prévoir. | Le modèle de file garde un duel au centre : c'est la voie la moins coûteuse vers des « unités » (§ 5.4). Réveiller `hurt`, `bloodied`, `combatStart`. |
| **The Bazaar** | Objets qui se déclenchent à leur temps de recharge ; un petit lexique de mots-clés (Brûlure, Poison, Bouclier, Hâte, Ralentissement, Gel, Soin, Vol de vie, Critique) ; chaque mot-clé a une règle et une **interaction de type** (le poison traverse le bouclier, la brûlure y perd la moitié). Une tempête de sable finit les combats qui traînent. | Les synergies naissent de **mots-clés partagés** que d'autres objets amplifient. Les types de dégâts créent des contres lisibles. | Typer les dégâts (§ 4.3), regrouper les statuts en familles (§ 4.2), borner la durée (§ 5.3). |
| **Slay the Spire** | Statuts à **un seul nombre** (Force, Vulnérable, Faiblesse, Artefact) ; **intentions** de l'ennemi affichées au-dessus de sa tête ; équilibre conduit par les métriques des joueurs. | Le joueur sait ce qui va arriver : il juge ses choix, pas le hasard. | Annoncer les charges armées comme des intentions (QW4). Battler applique déjà le « un seul nombre » et les métriques. |
| **Into the Breach** | Toutes les attaques ennemies sont annoncées, presque sans hasard. Les développeurs disent que le jeu devient un puzzle, que même un joueur expert aime résoudre. | La transparence ne tue pas le plaisir : elle le déplace vers la compréhension. | Montrer le calcul et l'ordre, même si l'issue reste aux dés. |
| **Teamfight Tactics** | Traits à paliers (2, 4, 6 unités) ; combat automatique ; leçon de Riot : ne jamais réduire le nombre de compositions possibles ; ses concepteurs veulent « des choix difficiles, pas une exécution difficile ». | La synergie se **construit** en assemblant des étiquettes. | Une couche de décision (§ 5.4). Race et classe comme deux étiquettes, plus tard. |
| **Balatro** | Chaque joker s'évalue l'un après l'autre, dans l'ordre de la rangée, avec un bruit, un chiffre qui saute et un compteur qui monte : jetons × multiplicateur. | Le calcul **devient le spectacle**. On comprend pourquoi le score est gros en le regardant se construire. | Décomposer le coup à l'écran (QW3) : les données existent (`attack.modifiers`). |
| **Magic: The Gathering** | Livre de règles avec ordre et pile ; complexité **budgétée** par rareté (« New World Order ») : des drapeaux rouges par défaut, qu'environ 20 % des cartes courantes peuvent enfreindre pour une bonne raison ; une carte courante n'agit pas sur plus d'une autre carte. | La complexité est une ressource qu'on dépense exprès. | La grille de drapeaux rouges (L9) et un budget par personnage (§ 3, P12). |
| **Hearthstone (et Battlegrounds)** | Mots-clés courts et réutilisés (Bouclier divin, Provocation, Râle d'agonie) ; tribus qui se renforcent entre elles ; fatigue qui finit les parties longues. | Un mot-clé appris une fois sert partout. | Même leçon que The Bazaar. |
| **Slice & Dice, Dicey Dungeons, Dice Forge** (de mémoire, sans source vérifiée ici) | Le dé **est** la fiche du personnage : chaque face porte une capacité, et la progression remplace ou améliore des faces. | Construire son dé, c'est construire son personnage. | La couche de décision la plus naturelle pour Battler (§ 5.4). |
| **Darkest Dungeon** (de mémoire) | Dégâts sur la durée en début de tour ; étourdissement, puis résistance accrue à l'étourdissement juste après. | Le contrôle a une contrepartie lisible. | Réponse possible à la question ouverte sur la Peur contre Brokk et sur l'Étourdi (RESOLUTION § 9). |

### 2.2 Ce que disent les auto-battlers déterministes

Un retour d'expérience sur un auto-battler de cartes (Orchard Deck) résume bien le cadre dans lequel Battler s'inscrit déjà :

- le combat est simulé à graine, puis rejoué ; le joueur ne contrôle rien pendant le combat, car **« le combat est le verdict d'une décision déjà prise »**. L'auteur a essayé un contrôle en direct et l'a abandonné : il déplaçait l'intérêt de la planification vers les réflexes ;
- **huit mots-clés** suffisent, parce que **« le vrai nombre de coups possibles, c'est le nombre de paires, pas le nombre de mots-clés »** ;
- **« la lisibilité, c'est ce qui permet d'apprendre d'une défaite »**. Un combat qu'on ne sait pas expliquer y est traité comme un bug de clarté ;
- cinq unités au plus, pour qu'on garde tout le plateau en tête ;
- un second axe (les tribus) entre volontairement en conflit avec la meilleure combinaison de mots-clés, pour forcer des compromis.

### 2.3 Les principes qu'on en tire

| # | Principe | Source |
| --- | --- | --- |
| P1 | **La décision avant, le verdict après.** Sans choix préalable, on regarde un film. | Orchard Deck, TFT |
| P2 | **Peu de mots-clés, beaucoup de paires.** Chaque mot-clé doit pouvoir rencontrer la plupart des autres. | Orchard Deck, The Bazaar, Hearthstone |
| P3 | **Un mot-clé = une règle, un moment, une icône, une couleur, un son.** | Slay the Spire, The Bazaar |
| P4 | **Annoncer ce qui va arriver.** Ce qui est armé se voit avant de servir. | Slay the Spire, Into the Breach |
| P5 | **Montrer le calcul dans l'ordre.** Un événement, un battement, une cause visible. | Balatro |
| P6 | **Un ordre de résolution simple et public.** | Super Auto Pets, Magic |
| P7 | **Des synergies par axes partagés** : étiquettes, paliers, effets « par charge de X ». | TFT, The Bazaar |
| P8 | **Ne jamais réduire la diversité des assemblages.** | leçon de Riot sur TFT |
| P9 | **Borner la durée par une montée de tension.** | tempête de The Bazaar, fatigue de Hearthstone |
| P10 | **Mesurer**, et se méfier des mesures qui trompent. | Slay the Spire |
| P11 | **Un retour sensoriel à la mesure de l'événement** (« juice »). | Balatro ; conférence « Juice it or lose it », GDC 2012, de mémoire |
| P12 | **Budgéter la complexité** : la plupart des personnages simples, quelques complexes, choisis exprès. | Magic, New World Order |

---

## 3. Confrontation : Battler, principe par principe

| Principe | Battler aujourd'hui | Verdict | Levier |
| --- | --- | --- | --- |
| P1 Décision avant | choix des deux combattants seulement | **manque** | couche de décision (§ 5.4) |
| P2 Peu de mots-clés | 31 statuts, une vingtaine de crochets, peu de paires | **à revoir** | familles (§ 4.2), aplatissement (§ 4.1) |
| P3 Un mot-clé, une identité | règle et nom dans le registre ; son, ton et mise en scène ailleurs | **partiel** | fiche sensorielle (QW1), palette (QW2) |
| P4 Annoncer | charges en attente muettes | **manque** | intentions (QW4) |
| P5 Montrer le calcul | total seul à l'écran, détail au journal | **partiel** | décomposition (QW3) |
| P6 Ordre public | écrit et testé (`RESOLUTION.md`) | **acquis** | rendre l'ordre de `strikeOnce` déclaratif (§ 4.1) |
| P7 Axes partagés | presque aucun effet ne lit un autre | **manque** | conditions et payoffs (§ 5.3) |
| P8 Diversité | 18 personnages, mais chacun figé | **partiel** | faces du dé (§ 5.4) |
| P9 Durée bornée | 19 à 39 tours, aucune montée de tension | **manque** | tempête (§ 5.3) |
| P10 Mesurer | valeur nette, échantillons, marges | **acquis, exemplaire** | — |
| P11 Retour sensoriel | gros travail en 0.34.0, mais sons devinés | **partiel** | fiche sensorielle (QW1), tempo (QW5) |
| P12 Budget de complexité | non suivi | **manque** | grille de drapeaux (L9), contrôle par personnage (QW10) |

---

## 4. Le modèle de briques « aplati »

Objectif : qu'un nouveau statut ou une nouvelle compétence soit **un assemblage de briques existantes**, et que ses interactions avec tout le reste soient connues d'avance. La règle de `RESOLUTION.md` « un statut = un comportement temporel » devient : **un statut = une fenêtre d'usure + des effets à des moments connus**.

### 4.1 Trois fenêtres d'usure au lieu de crochets à usage unique

Aujourd'hui, l'usure d'un statut est codée crochet par crochet. On propose qu'elle devienne **une donnée du statut**, choisie dans une liste fermée :

| Fenêtre d'usure (`consumedOn`) | Règle commune, écrite une fois | Statuts concernés aujourd'hui |
| --- | --- | --- |
| `nextAction` | consommé au début de la prochaine action du porteur ; perdu si l'action est perdue (contrôle) | Furie des vents, Coup de chance, Pile ou face ; Peur et Étourdi (côté victime) |
| `nextStrikeDealt` | consommé par le prochain **coup porté** ; un coup sacrifié n'en est pas un (la charge reste) ; un coup esquivé le consomme | Critique assuré, Vol de vie |
| `nextStrikeTaken` | consommé par le prochain **coup reçu** ; un coup sacrifié adverse ne le consomme pas | Esquive améliorée, Riposte ; Luciole (une charge par coup) |
| `points` | s'use d'autant qu'il absorbe | Armure temporaire, Écorce épaisse |
| `turns` | durée décomptée (début ou fin), comme aujourd'hui | Poison, Épines, Attente… |
| `permanent` | jusqu'à la fin du combat ou une purge | les auras |

Les effets « sur le coup » deviennent des **réactions** (le mécanisme générique des fenêtres) dont le **montant lit le contexte du coup** :

| Aujourd'hui (crochet spécial) | Demain (assemblage) |
| --- | --- |
| `drainsHit` | `consumedOn: nextStrikeDealt` + réaction `hit` → soin de `dealt` |
| `reflectsHit: 0.5` | `consumedOn: nextStrikeTaken` + réaction `hurt` → dégâts `dealt × 0,5` à l'adversaire |
| `fillsOnHurt` | réaction `hurt` → ranger `dealt` dans une jauge (et plus de lecture du roster par le moteur) |
| `spentOnHurt` | `consumedOn: nextStrikeTaken` |
| `forcesCrit`, `forcesDodge` | des **remplacements** dans la chaîne (inchangés), avec l'usure commune ci-dessus |

Ce qu'on y gagne :
- la question « et sur un coup sacrifié ? » est réglée **une fois par fenêtre**, plus jamais par statut (fin des bugs du type Riposte 0.32.0) ;
- la règle « pas de chaîne » s'applique enfin **par construction** à la Riposte et au Vol de vie, qui y échappent aujourd'hui par des chemins à part (`SYSTEMES.md` § 7.3) ;
- l'ordre « après le coup » devient une donnée lisible, et non une suite de blocs dans `strikeOnce` ;
- l'écran sait ce qu'il montre sans relire le registre : la fenêtre d'usure dit « armé au prochain coup », la réaction dit « renvoi » ou « soin ».

**Coût et preuve** : c'est un changement interne du moteur, sans changement de règle voulu. L'empreinte de `balance.test.ts` et l'audit doivent rester identiques. La méthode de la refonte 0.13.0 (rejouer des milliers de combats à graine fixe avec l'ancien et le nouveau moteur) s'applique telle quelle.

### 4.2 Une dizaine de familles de mots-clés

Les 31 statuts se rangent naturellement dans une dizaine de familles. Chaque famille a **une couleur, une forme de cadre d'icône, une famille de sons et une fenêtre d'usure par défaut**. Un spectateur qui connaît la famille sait déjà à quoi s'attendre, même devant un statut nouveau.

| Famille | Sens pour le joueur | Statuts actuels | Fenêtre type |
| --- | --- | --- | --- |
| **Préparation** | « sa prochaine action sera spéciale » | Furie des vents, Coup de chance, Pile ou face | `nextAction` |
| **Visée** | « son prochain coup sera spécial » | Critique assuré, Vol de vie | `nextStrikeDealt` |
| **Parade** | « le prochain coup reçu sera spécial » | Esquive améliorée, Riposte | `nextStrikeTaken` |
| **Bouclier** | « absorbe des points » | Armure temporaire, Écorce épaisse | `points` |
| **Renvoi** | « frapper ce porteur se paie » | Épines, Riposte (aussi Parade) | `turns` |
| **Affliction** | « perd des PV à chaque tour » | Poison, Pourriture, Brûlure | `turns` ou sans fin |
| **Régénération** | « regagne des PV à chaque tour » | Régénération, Aura de sainteté | `turns` ou `permanent` |
| **Altération** | « frappe ou encaisse différemment » | Affaibli, Vulnérable, Brèche, Luciole ; auras de puissance, d'intimidation, de précision | `turns` ou `permanent` |
| **Contrôle** | « perd son action » | Peur, Étourdi, Attente | `nextAction` |
| **Protection** | « certains statuts ne prennent pas » | Garde sacrée, Aura d'immunité | charges ou `permanent` |

« Aura » n'est pas une famille mais une **durée** (`permanent`), signalée par le double cadre doré qui existe déjà. Une Aura de puissance est une Altération permanente ; une Aura de poison, une Affliction permanente qui vise l'adversaire.

**Règle de design qui en découle** : un nouveau personnage puise d'abord dans les familles existantes. Une nouvelle famille, ou un nouveau crochet, est une décision explicite, notée dans `SYSTEMES.md`, avec son coût de surface.

### 4.3 Des dégâts typés

Ajouter un champ `kind` aux dégâts appliqués, d'abord **sans changer aucune règle** (simple métadonnée), puis s'en servir :

| Type | Origine | Armure | Esquive | Bouclier | Couleur |
| --- | --- | --- | --- | --- | --- |
| **Coup** | le dé | oui | oui | oui | rouge |
| **Affliction** | poison, pourriture, brûlure | non | non | à décider (dans The Bazaar, le poison traverse le bouclier) | vert |
| **Renvoi** | épines, riposte, rétribution | non | non | à décider | orange |
| **Sort** | pièce, effets `damage` d'une compétence | non | non | à décider | violet |

Premier bénéfice, immédiat : les statistiques, le journal et les couleurs savent d'où viennent les dégâts sans heuristique. Second bénéfice, plus tard : des résistances et des contres ciblés (« les nains réduisent les renvois », « le bouclier absorbe la moitié d'une affliction »), qui répondent à la question ouverte de `RESOLUTION.md` § 9 sans toucher à l'équilibre actuel tant qu'on ne les active pas.

### 4.4 Une fiche sensorielle par brique

Chaque statut et chaque compétence déclare, dans son registre, ce qu'il montre et fait entendre, au lieu que `useCombat` le devine :

```ts
// Esquisse, pas un code à appliquer tel quel
present?: {
  family: 'preparation' | 'aim' | 'parry' | 'shield' | 'reflect' | 'affliction' | 'regen' | 'alteration' | 'control' | 'protection'
  sfx?: SoundId          // sinon : le son par défaut de la famille
  stage?: 'blow' | 'reaction' | 'aura' | 'badge'  // coup avec élan, réaction sans élan, aura, simple badge
}
```

La famille donne les valeurs par défaut (couleur, cadre, son) ; le champ ne sert qu'à faire une exception. `cueFor` et les branches par type d'étape disparaissent, et un oubli devient une erreur de TypeScript plutôt qu'un son au hasard.

---

## 5. Ce qu'on peut faire, du plus léger au plus lourd

Chaque proposition indique son coût, les fichiers touchés et son effet sur l'**empreinte de non-régression** : « inchangée » veut dire aucune règle modifiée, donc aucun rééquilibrage.

### 5.1 Quick wins de présentation (empreinte inchangée)

| # | Quick win | Ce que ça règle | Coût | Fichiers |
| --- | --- | --- | --- | --- |
| **QW1** | **Fiche sensorielle déclarée** (§ 4.4) : famille, son et mise en scène dans le registre | sons devinés, futurs statuts mal sonorisés (L7) | moyen-faible | `statuses.ts`, `roster.ts`, `useCombat.ts` |
| **QW2** | **Palette sémantique unique** : une seule table famille → couleur de texte, contour, couleur de badge, utilisée par `TONE_CLASS` et par les textes du coup de `Fighter.tsx`. Lever le conflit de l'ambre : le garder pour le critique, donner aux bonus posés la couleur de leur famille. | couleurs contradictoires, couleurs en dur (L7) | faible | `narration.ts`, `Fighter.tsx`, `index.css` |
| **QW3** | **Décomposition du coup à la Balatro** : sous le chiffre de dégâts, la chaîne qui l'a produit (« 8 · ×2 · +2 puissance · −2 intimidation · −4 écorce »), chaque maillon apparaissant dans l'ordre, avec un petit bruit. Seulement quand il y a au moins un modificateur, pour ne pas surcharger. | « pourquoi ce coup fait 9 ? » (L8) ; c'est aussi du spectacle | faible : les données sont dans `Attack` (`modifiers`, `critMultiplier`, `armorAbsorbed`, `shields`) | `Fighter.tsx`, `useCombat.ts` |
| **QW4** | **Intentions** : un statut de Préparation, de Visée ou de Parade s'affiche « armé » (cadre pointillé qui pulse, ou petite icône au-dessus de la tête), et sa consommation est un moment visible. | charges qui attendent sans le dire (L8), lecture du mort-vivant, du paladin, de l'elfe | faible si on se contente d'une liste des crochets « au prochain » ; trivial après § 4.1 | `StatusTray.tsx`, `Fighter.tsx` |
| **QW5** | **Table du tempo** : les 34 attentes deviennent des durées nommées (élan, impact, titre, pause de phase), partagées avec le CSS en variables. | rythme dispersé ; base d'une future timeline (TODO § 9) | faible | `useCombat.ts`, `index.css` |
| **QW6** | **Cadre d'icône par famille** : la forme du médaillon (rond, losange, bouclier, pointillé pour « armé », double pour aura) dit la famille avant même l'icône. Homogénéise des icônes peintes de styles variés, sans en repeindre une seule. | hétérogénéité des icônes | faible | `StatusTray.tsx`, `Icon.tsx`, `index.css` |
| **QW7** | **Un texte, une famille, une couleur** dans le journal aussi : préfixer chaque ligne de l'icône de sa famille. | journal dense | faible | `CombatLog`, `narration.ts` |
| **QW8** | **Dégâts typés en métadonnée** (§ 4.3, première moitié) : le champ `kind` sur `AppliedEffect`, renseigné par le moteur, lu par la couleur des chiffres et les statistiques. | statistiques et couleurs qui devinent l'origine | faible | `combat.ts` (sans changer de règle), `narration.ts`, `stats.ts` |

### 5.2 Chantiers moteur à résultats identiques (empreinte inchangée, prouvée)

| # | Chantier | Ce que ça règle | Coût | Preuve |
| --- | --- | --- | --- | --- |
| **M1** | **Fenêtres d'usure** et réactions à montant contextuel (§ 4.1) | L4, L5 ; surface des mécaniques ; bugs « coup sacrifié » | moyen | empreinte, audit, rejeu de milliers de combats à graine fixe |
| **M2** | **Un interprète unique de la chronologie** : une fonction qui dit, pour chaque étape, « qui a fait quoi à qui, par quelle brique, de quelle famille, pour combien ». Le journal, la trace, les statistiques, l'analyse et l'écran la lisent au lieu de réinterpréter chacun les mécaniques. | `SYSTEMES.md` § 7.4 : une mécanique ne s'enseigne plus qu'une fois | moyen | tests existants des statistiques et de l'analyse |
| **M3** | **Contrôle par brique dans `validateRoster`** : tout statut déclare sa fenêtre d'usure ; tout personnage affiche son nombre de drapeaux rouges (L9) et ses familles utilisées. | budget de complexité (P12) | faible | un test |
| **M4** | **Une échelle de couches d'écran** (arène, combattants, textes, en-tête, infobulles, fenêtres) au lieu de z-index locaux | défaut 0.35.1 | faible | rendu |

### 5.3 Mécaniques éprouvées à intégrer (règles modifiées, à mesurer)

Toutes changent l'équilibre : chacune passe par `npm run balance`, la valeur nette, et l'accord de l'utilisateur quand elle touche une valeur qu'il a fixée.

| # | Mécanique | Inspiration | Pourquoi ici | Coût | Remarque |
| --- | --- | --- | --- | --- | --- |
| **R1** | **Tempête** : à partir du tour N, chaque combattant perd des PV croissants au début de son tour | The Bazaar, Hearthstone | borne les combats de 39 tours ; casse la boucle « soins cumulés contre dégâts rognés » (Brokk 28/72 contre les prêtresses) sans toucher aux personnages | faible : la condition `fromTurn` et `statusTick` existent | à mesurer : elle avantage les gros dés |
| **R2** | **Réveiller les déclencheurs dormants par les variantes** : chaque variante gagne un petit passif sur `bloodied`, `dodge`, `crit` ou `hurt`, au lieu de ne changer que ses stats | Super Auto Pets | différencie les variantes (P8), crée des réactions à ce que fait l'adversaire (L2) ; zéro code moteur | faible par personnage | une variante à la fois, mesurée |
| **R3** | **Effets qui lisent un mot-clé** (payoffs) : « +1 dégât par charge d'Affliction sur la cible », « soin doublé si l'adversaire est Contrôlé ». Les conditions `hasStatus` existent ; il manque un montant « par charge de X ». | The Bazaar, TFT | premières synergies réelles entre familles (P7) | faible à moyen (un montant contextuel, comme en § 4.1) | vaut aussi entre personnages si l'on ajoute une couche de décision |
| **R4** | **Réparer les compétences mortes** avant d'en créer : Pile ou face qui déclenche `hit` sur pile ; Coup de chance sur un d4 dont le 4 frappe ; Aura d'immunité qui soigne des malus purgés. Les pistes sont déjà dans `EQUILIBRAGE.md`. | — | une face de dé qui ne rapporte rien est un moment de jeu perdu | faible | décisions de l'utilisateur |
| **R5** | **Résistance après contrôle** : après une Peur ou un Étourdi, le porteur résiste au contrôle suivant pendant un tour | Darkest Dungeon | répond à la question ouverte sur l'enchaînement des peurs, et plus tard de l'Étourdi | faible (un statut de Protection) | à mesurer contre Brokk |
| **R6** | **Dégâts typés actifs** (§ 4.3, seconde moitié) : résistances, interaction bouclier-affliction | The Bazaar | contres lisibles, fin du « dégât direct qui ignore tout » | moyen | grosse mise à jour d'équilibrage |
| **R7** | **Paliers de cumul** : une aura change de nature à 3 charges (par exemple, la puissance donne aussi +5 % de critique) | TFT | rend les cumuls visibles comme des moments | faible | attention à la lisibilité |

### 5.4 Les deux grands chantiers de jeu (décisions de l'utilisateur)

#### Construire son dé (couche de décision)

C'est la piste la plus fidèle à l'identité de Battler : **le dé est déjà la fiche du personnage**. Aujourd'hui, les faces 1, 2 et 3 portent les compétences de la famille, et les autres frappent. Une couche de décision pourrait laisser le joueur :

- **placer** les compétences sur les faces (mettre l'aura sur le 1 plutôt que sur le 3 ne change rien aux chances, mais change les combos de faces avec d'autres effets) ;
- **remplacer** une face qui frappe par une compétence achetée ou gagnée (entre deux rounds d'un tournoi, par exemple), au prix d'un coup de moins ;
- **améliorer** une face (« Épines 6 » → « Épines 8 ») ;
- **choisir une relique** parmi trois avant le combat (un passif sur `combatStart` ou `turnStart`, déclencheurs déjà prêts), comme dans Slay the Spire.

Côté moteur, c'est peu de chose : les déclencheurs `naturalOne`, `naturalTwo` et `naturalThree` se généralisent en « sur la face n », et un personnage reçoit son dé construit comme une donnée. `adjusted()` montre déjà qu'un personnage modifié se simule sans toucher au roster. Côté jeu, c'est un changement de nature : le joueur devient l'auteur de la synergie, et le combat devient le verdict de son choix (P1).

#### Des unités, en file (plus tard)

Si l'on veut des équipes, le modèle de Super Auto Pets est le moins coûteux : les équipes forment deux files, **seules les deux unités de tête se battent**, et la suivante entre quand l'une tombe. Le moteur garde donc un duel en son centre. Il faut seulement :
- une file par camp et un déclencheur « entrée en jeu » et « mort d'un allié » ;
- une cible `ally` en plus de `self` et `opponent` ;
- des statistiques et un historique qui comptent par unité.

Avec 19 fichiers qui supposent `Pair` et `Side = 0 | 1`, c'est une refonte réelle. Elle n'a de sens qu'après une couche de décision : sans choix de composition, des équipes ne seraient que des duels plus longs.

---

## 6. Feuille de route proposée

| Étape | Contenu | Risque | Rééquilibrage |
| --- | --- | --- | --- |
| **0. Décider du vocabulaire** | adopter les familles (§ 4.2), la grille des drapeaux rouges (L9), le principe « puiser dans les familles avant d'en créer » | aucun (documents) | non |
| **1. Lisibilité** | QW2 palette, QW3 décomposition, QW4 intentions, QW6 cadres, QW5 tempo, QW1 fiche sensorielle, QW8 dégâts typés en métadonnée | faible ; seul le rendu change (à valider dans Firefox ; le son reste non vérifiable) | non, empreinte inchangée |
| **2. Aplatissement** | M1 fenêtres d'usure, M2 interprète unique, M3 contrôles | moyen ; la preuve est l'empreinte et l'audit | non, empreinte inchangée |
| **3. Règles** | R4 compétences mortes, R1 tempête, R2 passifs de variantes, R3 payoffs, R5 résistance au contrôle | moyen | oui, une mécanique à la fois |
| **4. Décision du joueur** | construire son dé, reliques entre les rounds du tournoi | élevé (nouveaux écrans) | oui |
| **5. Unités** | files à la Super Auto Pets | élevé (refonte du duel) | oui |

Les étapes 1 et 2 sont indépendantes et peuvent avancer en parallèle. L'étape 2 rend l'étape 3 bien moins risquée : une nouvelle compétence n'y serait plus qu'un assemblage.

---

## 7. Questions pour l'utilisateur

1. **Spectateur ou décideur ?** Battler doit-il rester un jeu qu'on regarde (choisir deux combattants, analyser), ou devenir un jeu où l'on construit quelque chose avant le combat ? C'est la question qui décide de tout le reste.
2. **Si décideur, quelle forme ?** Construire son dé (faces), choisir des reliques, ou les deux ? Pendant un tournoi seulement, ou dès le duel ?
3. **Les familles de mots-clés** (§ 4.2) te parlent-elles ? Faut-il en fusionner ou en séparer ?
4. **Les dégâts directs** : faut-il les typer (affliction, renvoi, sort) et leur donner des contres ?
5. **La tempête** : acceptes-tu une règle globale qui borne la durée des combats ?
6. **Les variantes** : peuvent-elles gagner un petit passif propre, en plus de leurs stats ?
7. **Les compétences mortes** (Pile ou face, Coup de chance, Fleur de vie, Aura d'immunité) : les réparer avant d'ajouter du contenu ?
8. **Le budget de complexité** : combien de personnages « complexes » (deux drapeaux rouges ou plus) veux-tu dans le roster ? Aujourd'hui : la voleuse, le paladin et le druide.

---

## Sources

- [Designing A Three-Act Auto-Battler With Eight Keywords (Orchard Deck)](https://solodevstack.com/blog/orchard-deck-deterministic-card-battler-keywords) : huit mots-clés, combat déterministe rejoué, lisibilité, position.
- [Super Auto Pets, glossaire (wiki communautaire)](https://superautopets.wiki.gg/wiki/Glossary) et [The Basics](https://superautopets.wiki.gg/wiki/The_Basics) : ordre des capacités selon l'attaque, déclencheurs ; [discussion Steam avec réponse d'un développeur](https://steamcommunity.com/app/1714040/discussions/0/3086646248547568129).
- [The Bazaar, mots-clés (Mobalytics)](https://mobalytics.gg/the-bazaar/guides/keywords-and-terms) : Brûlure, Poison, Bouclier, Hâte, Ralentissement, Gel et leurs interactions ; [BazaarDB](https://www.bazaardb.gg/card/1sk99jmuf77zkyxy9rt7trq8u/Hourglass) pour les étiquettes d'objets.
- [Slay the Spire, équilibrage par les métriques (GDC 2019)](https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019) ; [PC Gamer, Best Design 2019](https://www.pcgamer.com/uk/best-design-2019-slay-the-spire) sur la transparence des intentions.
- [Road to the IGF : Into the Breach (Game Developer)](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-) : attaques annoncées, le jeu comme puzzle ; [Prototypr, l'UX d'Into the Breach](https://blog.prototypr.io/into-the-breachs-ux-makes-you-feel-smart-a9cb03210757).
- [GDC 2020 : la conception de Teamfight Tactics](https://gdconf.com/news/get-key-game-design-insights-riots-teamfight-tactics-gdc-2020) ; [Pocket Tactics](https://www.pockettactics.com/teamfight-tactics-design) ; [Riot, leçons de Monsters Attack!](https://teamfighttactics.leagueoflegends.com/en-au/news/dev/dev-teamfight-tactics-monsters-attack-learnings/) (ne pas réduire la diversité des compositions) ; [Riot, leçons du Set 1](https://nexus.leagueoflegends.com/en-us/2019/10/dev-tft-set-1-learnings/).
- [Balatro, un retour sensoriel jubilatoire (analyse de Blake Crosley)](https://blakecrosley.com/fr/guides/design/balatro) ; [GMTK, le problème de design de Balatro](https://gameindustrylibrary.com/documents/gmtk-balatros-cursed-design-problem/insights).
- [Magic, New World Order](https://mtg.wiki/page/New_World_Order) et [New New World Order (Mark Rosewater)](https://magic.wizards.com/en/news/making-magic/new-new-world-order-2013-03-29) : budget de complexité, drapeaux rouges ; [Complexity creep](https://mtg.wiki/page/Complexity_creep).
- [Designing for difficulty: readability in ARPGs (Game Developer)](https://www.gamedeveloper.com/game-platforms/designing-for-difficulty-readability-in-arpgs) : annonce et attentes comme piliers de la lisibilité.

Cités de mémoire, sans source vérifiée pendant cette étude : Slice & Dice, Dicey Dungeons et Dice Forge (le dé comme fiche du personnage), Darkest Dungeon (résistance après étourdissement), Hearthstone (fatigue, mots-clés), la conférence « Juice it or lose it » (GDC 2012), et l'ordre gauche-droite des jokers de Balatro.
