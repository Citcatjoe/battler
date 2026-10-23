# Paris : règles et plan d'intégration

_Document de référence des paris. Première version jouable en 0.37.0 ; **règles et interface refondues en 0.38.0** (cotes cachées, mises fixes, rattrapage du dernier, deux parieurs de l'ordinateur, guichet de jeu, écran de fin en deux moitiés). Restent P3 et une partie de P5 (§ 4)._

---

## 0. En bref

- **Un jeu dans le jeu, pour les observateurs.** Deux joueurs (karma et MiaMiaM par défaut) et **deux parieurs de l'ordinateur** (Borin et Zlatka) parient avec de l'argent fictif, les Deniers, sur les combats. Le but : finir le tournoi avec la plus grosse fortune.
- **Zéro impact sur le combat.** Les paris ne lisent jamais le vrai combat avant qu'il soit joué, et ne le modifient pas. Le moteur ne sait pas qu'ils existent.
- **On parie à l'intuition** (décision de l'utilisateur, 0.38.0) : **aucune cote n'est affichée avant le combat**. Elles existent, calculées par simulation, et se dévoilent au règlement.
- **Le guichet** est un menu de jeu en plein écran : de grandes tuiles pour choisir l'issue, des pièces pour la mise. Le pari se pose dès que les deux sont choisis.
- **Des mises fixes** : 50, 100 ou 200. **Le dernier du classement**, quand il est distancé, peut tenter le **coup de poker** (400) et **double ses gains**. Le meneur ne s'envole pas, le dernier peut revenir.
- **L'écran de fin** montre les deux jeux côte à côte : le combat à gauche, les paris et le classement à droite.

---

## 1. Règles (en vigueur depuis la 0.38.0)

### 1.1 Les parieurs et leur bourse

- **Quatre parieurs**, chacun avec sa couleur, distincte des couleurs des camps (bleu et rose) et de l'ambre du critique :
  - les **deux joueurs**, nommés à la création du tournoi (par défaut **karma**, en vert, et **MiaMiaM**, en magenta) ;
  - **Borin** (gris acier, marqué « IA »), le prudent ;
  - **Zlatka** (orange, marquée « IA »), la flambeuse.
- **Bourse de départ : 1 000 Deniers** chacun.
- **La bourse dure tout le tournoi**, et disparaît avec lui. Comme le tournoi, elle vit en mémoire et se perd au rechargement de la page (décision de l'utilisateur : un pari vit le temps d'un tournoi, sans plus).
- **En duel simple**, une bourse de session pour les quatre parieurs, remise à zéro par le bouton « Bourses à zéro » du guichet.
- **La fortune** d'un parieur, c'est sa bourse plus ses mises en cours. Le classement se fait sur la fortune.

### 1.2 Parier

- **Facultatif** pour les joueurs ; **les parieurs de l'ordinateur parient sur chaque match**, y compris ceux simulés depuis l'arbre. **Pas de pari pendant la phase de saison** d'un tournoi (0.86.0, FEATURES.md § 8) : les bourses attendent l'arbre, où les paris reprennent comme sans saison.
- **Un pari par parieur et par match**, choisi parmi six issues (§ 1.3).
- **Mise** : une pièce parmi **50 (Prudent), 100 (Franc), 200 (Audacieux)**. Le **coup de poker (400)** n'est proposé qu'au **dernier du classement, quand il est distancé** (à égalité générale, personne ne l'est).
- **La mise quitte la bourse dès qu'elle est posée.** Toucher à nouveau l'issue choisie retire le pari ; changer d'issue ou de pièce le remplace.
- **Revenir en arrière** avant de lancer le combat annule les paris du match, et les mises sont rendues.

### 1.3 Les six issues

| Issue | Gagne si |
| --- | --- |
| **A gagne**, **B gagne** | ce combattant gagne |
| **A écrase**, **B écrase** | ce combattant gagne **et** finit au-dessus de la moitié de ses PV |
| **Combat long** | le combat dure plus de N tours |
| **Combat court** | le combat dure N tours ou moins |

N est la **ligne** : la durée médiane du duel, mesurée par la simulation (§ 1.4). C'est la seule donnée chiffrée affichée avant le combat.

### 1.4 Les cotes : cachées, mais justes

1. **La probabilité de chaque issue est simulée** : 400 combats du duel, avec des graines tirées du match (`hashSeed` du match et des deux personnages), jamais celle du vrai combat. Les cotes sont reproductibles, et ne trahissent rien.
2. **La cote juste vaut 1 / probabilité**, ramenée au **palier le plus proche** : ×1,1, ×1,2, ×1,3, ×1,5, ×1,8, ×2, ×2,5, ×3, ×4, ×5, ×7, ×10. Plafond : ×10.
3. **Elles ne sont pas affichées avant le combat**, ni sur le guichet ni sur l'écran d'affrontement. Elles se dévoilent sur l'écran de fin, à côté de chaque pari.

### 1.5 Les coups de théâtre

De la variance dans les gains, sans aucun effet sur le combat : avant chaque match, environ **un match sur trois** reçoit un coup de théâtre, tiré à la graine du match et annoncé en ruban doré sur le guichet et sous le « VS ».

| Coup de théâtre | Fréquence parmi eux | Effet |
| --- | --- | --- |
| **Cote boostée** | 40 % | une issue nommée rapporte une fois et demie plus |
| **Favori taxé** | 25 % | parier sur le favori (sans le nommer) rapporte 20 % de moins |
| **Prime de courage** | 20 % | un pari gagnant sur l'outsider rapporte 100 Deniers de plus |
| **Jackpot** | 10 % | les gains nets du match sont doublés |
| **Mise doublée** | 5 % | toutes les mises du match comptent double (remplace le « Tout ou rien », incompatible avec les mises fixes) |

### 1.6 Le règlement

- **Gagné** : la bourse reçoit **mise × cote**, arrondie au Denier inférieur, puis le coup de théâtre éventuel.
- **Dernier du classement** (distancé, au moment du pari) : son **gain net compte double**. Il se cumule avec le Jackpot.
- **Perdu** : la mise est perdue.
- **Combat triché** (dés imposés par le mode triche) : **pari annulé, mises rendues**.

### 1.7 La prime de relance

Au premier match de chaque nouveau tour du tournoi (et à chaque nouveau duel), un parieur qui ne peut plus miser 50, sans pari en cours, reçoit **100 Deniers**.

### 1.8 Les parieurs de l'ordinateur

Ils « sentent » les probabilités simulées (sans voir le combat), et parient selon leur caractère, à une graine propre au match et au parieur :
- **Borin, le prudent** : le favori (une fois sur cinq, la durée la plus probable), mise de 100 (de 50 quand sa bourse passe sous la moitié de sa mise de départ).
- **Zlatka, la flambeuse** : l'outsider (une fois sur deux), une victoire écrasante (une fois sur quatre) ou un pari de durée ; elle mise toujours le plus gros qu'elle peut (200, ou 400 quand elle est dernière).

Leur pari se voit sous le « VS » (« a misé 200 ») sans l'issue ; l'issue se dévoile au règlement.

### 1.9 Les maths : pourquoi ces règles

Mesuré sur 2 000 tournois simulés (15 matchs, deux joueurs qui parient au hasard 85 % du temps, Borin et Zlatka) :

| Réglage | Dernier à mi-tournoi qui finit 1er | Meneur à mi-tournoi qui finit 1er | Joueur au hasard, fortune finale |
| --- | --- | --- | --- |
| Paliers inférieurs, ×10 (0.37.0, mises libres remplacées par des mises fixes) | 4 % | 67 % | 790 |
| Palier le plus proche, ×10 | 4 % | 65 % | 915 |
| Plafond ×5 | 4 % | 65 % | 780 |
| **Palier le plus proche, ×10, gain du dernier doublé (retenu)** | **8 %** | **62 %** | **1 130** |
| Gain du dernier triplé | 11 % | 61 % | 1 370 (Zlatka première dans 41 % des tournois) |

- **Mises fixes** : le meneur ne peut pas miser plus de 200 par match, il ne s'envole pas hors d'atteinte.
- **Palier le plus proche** : parier au hasard ne fait plus perdre d'argent à la longue (avec le palier inférieur, il en coûtait environ 210 Deniers par tournoi).
- **Gain du dernier doublé** : le retour du dernier passe de 4 à 8 % (dans les deux premiers : de 12 à 20 %), sans déséquilibrer les parieurs. Le gain triplé donnait trop de poids à Zlatka, souvent dernière puis gagnante sur un gros coup.
- Avec les règles retenues : Borin finit premier dans 23 % des tournois, Zlatka dans 36 %, chaque joueur au hasard dans 20 à 21 %. Un joueur qui lit bien les combattants devrait faire mieux.

---

## 2. Interface (0.38.0)

**Exigence de l'utilisateur** : un jeu vidéo, pas une page web. De grandes formes, des menus qui se superposent, lisibles sur une télévision ; simple, fluide, intuitif.

### 2.1 Le guichet du match

- Il s'ouvre par le bouton **Parier** de l'écran d'affrontement, qui indique combien de joueurs ont parié (« Parier 1/2 »). **Échap** ou le gros bouton **Au combat** le referment.
- **Plein écran**, au-dessus de l'affrontement : le titre **PARIS** frappé en or, le ruban du coup de théâtre s'il y en a un, puis **un plateau par joueur**, côte à côte.
- **Le plateau** d'un joueur, du haut vers le bas :
  - son rang, son nom en grand et sa bourse ;
  - **« Sur quoi ? »** : six grandes tuiles en pierre (portrait du combattant et « gagne le combat » ou « écrase », sablier et « Combat long / court » avec la ligne), dorées quand elles sont choisies ;
  - **« Combien ? »** : des pièces de métal (50, 100, 200, et la pièce rouge du coup de poker quand elle est permise), qui se frappent quand on les pose ;
  - dès que l'issue et la pièce sont choisies, le pari se pose (son de pièce) et un tampon **PARI POSÉ** s'abat, avec le rappel du pari.
- En bas à droite, un rappel : Borin et Zlatka ont aussi misé, leurs paris se dévoilent après le combat.
- **Sous le « VS »** de l'écran d'affrontement : le ruban du coup de théâtre et une pastille par parieur (« karma 100 sur Vainqueur : Gorak », « Borin a misé 100 »).

### 2.2 L'écran de fin : deux jeux, deux moitiés

- **À gauche, le combat** : le vainqueur en grand, avec un halo à la couleur de son camp, son nom, comment il a gagné (K.O. en N tours, dernier coup) ; quatre grandes tuiles (PV restants, plus gros coup, critiques, esquives) ; une barre de partage des dégâts ; les boutons (Revanche et Menu, ou Continuer en tournoi) et **Détails**, qui ouvre les statistiques complètes par-dessus l'écran.
- **À droite, les paris** : le ruban du coup de théâtre, puis une carte par parieur (son issue, sa mise, la cote enfin dévoilée, un tampon GAGNÉ ou PERDU, le gain net en grand), et le **classement** des quatre parieurs : rang, progression, fortune qui défile jusqu'à sa nouvelle valeur, trophée au premier.
- Sans paris (tournoi créé sans), la moitié droite garde les statistiques détaillées.

### 2.3 L'arbre et le champion

- **Dans l'arbre** (0.100.0, `docs/ref/tournoi-paris-ouverts.png`) : plus de bandeau permanent. Le bouton carré **Paris**, à gauche du grand bouton, porte une pastille « n/2 » (les joueurs qui ont misé sur un match du tour en cours : pari en attente ou réglé au journal, clés `t-<tour>-`). Il ouvre au-dessus de lui le panneau **Paris** (`BettingPanel`) : classement des quatre parieurs (rang, pastille de couleur, nom, marque IA, fortune), « mises de ce tour n / 2 », et « Les mises se font depuis l'écran d'affrontement. ». Fermeture : son bouton, un clic ailleurs, Échap. La « cagnotte » de la maquette n'existe pas dans les règles : elle n'est pas affichée.
- **Sur l'écran du champion**, le classement final des parieurs, sous le titre.
- **Les matchs simulés depuis l'arbre** : seuls Borin et Zlatka y parient. Le guichet de tour (P3) laissera les joueurs parier sur un tour entier.

### 2.4 Création du tournoi

Une case « Paris entre » et les noms des deux joueurs, sur l'écran de configuration. Sans paris, aucune trace de l'interface des paris dans le tournoi.

---

## 3. Architecture technique

### 3.1 Un module de règles pur : `src/game/betting.ts`

Sans React, testé dans `betting.test.ts`. Le hasard passe par un `Rng` avec graine (`rng.ts`), jamais par `Math.random`.

Ce qu'il expose (0.38.0) :

| Fonction | Rôle |
| --- | --- |
| `createWallets(names)` | les deux joueurs et les deux parieurs de l'ordinateur (`BOTS`), 1 000 Deniers chacun |
| `priceMatch(fighters, key)` | les six issues d'un match, leurs probabilités et cotes, la ligne de durée, le coup de théâtre. Les combattants d'un match de tournoi portent leurs reliques (0.75.0, [RELIQUES.md](RELIQUES.md)) : les cotes en tiennent compte, et les parieurs les voient sur l'écran d'affrontement |
| `stakeChoices`, `placeBet`, `cancelBet`, `cancelMatch` | les mises proposées (`STAKES`, `POKER_STAKE`), poser, remplacer ou retirer un pari |
| `worthOf`, `ranking`, `isLast`, `isTrailing` | fortune et classement ; « distancé » ouvre le coup de poker et le gain doublé |
| `botBet`, `placeBotBets` | le pari de Borin et de Zlatka, à la graine du match |
| `settleMatch`, `payoutOf`, `relief` | règlement, gains (coups de théâtre, rattrapage), prime de relance |

Toutes les fonctions sont immuables, comme `tournament.ts`.

### 3.2 Coût de calcul

Mesuré en 0.37.0 : coter un match (400 combats) prend de 36 à 65 ms pour un duel ordinaire, et jusqu'à 150 ms pour un duel très long (Brokk contre Ysolde, 56 tours). Les cotes sont calculées une fois par match, juste après l'ouverture de l'écran d'affrontement. « Simuler le tour » dans l'arbre cote aussi chaque match, pour les parieurs de l'ordinateur : environ 0,3 à 1 seconde pour un tour de 8 matchs.

### 3.3 Branchements

| Fichier | Rôle |
| --- | --- |
| `App.tsx` | les bourses du tournoi et de la session de duel ; cotes du match ; paris de l'ordinateur ; règlement dans `finish` et dans la simulation depuis l'arbre ; prime de relance au changement de tour |
| `components/Betting.tsx` | `BettingDesk` (guichet et plateaux), `BetSummary` (sous le « VS »), `BettingPanel` (panneau Paris de l'arbre) et `humansWhoBet`, `Standings` (classement en ligne de l'écran du champion), `BetsResult` (moitié droite de l'écran de fin), `TwistBanner` |
| `MatchupScreen.tsx` | le bouton Parier et le guichet |
| `EndScreen.tsx` | les deux moitiés (combat, paris) ; les statistiques détaillées dans une superposition |
| `BracketScreen.tsx` | le bouton et le panneau Paris |
| `ChampionScreen.tsx` | le classement des parieurs |
| `TournamentSetupScreen.tsx` | la case et les deux noms |
| `index.css` | tuiles, pièces, tampon, ruban et entrées animées du guichet |

**Ce qui ne change pas** : `combat.ts`, les registres, l'historique (`battler:history:v1` reste intact : les paris n'y entrent pas) et l'empreinte de non-régression.

### 3.4 Tests

- `betting.test.ts` (20 tests) : les quatre parieurs ; classement et fortune ; paliers et plafond ; cotes reproductibles ; le calcul ne touche pas au vrai combat ; fréquence et variété des coups de théâtre ; mises proposées seulement, coup de poker au seul distancé, Mise doublée ; somme des mises bornée par la bourse ; paris de Borin et Zlatka, reproductibles, sans panne sur 30 matchs ; règlement, combat triché, coups de théâtre et rattrapage dans les gains ; prime de relance ; textes sans emoji.
- `screens.test.tsx` : guichet (avec et sans coup de théâtre, cotes en calcul), rappel sous le « VS », classement, écran de fin avec paris (et combat triché), arbre et champion avec classement ; aucun emoji.
- **Rendu** : captures Firefox sans interface du guichet, de l'écran de fin, de l'arbre. Le son ne peut pas être vérifié : à écouter.

### 3.5 Documentation à la livraison

Selon `CLAUDE.md` : version mineure dans `package.json`, CHANGELOG (Ajouté), nouvelle section de `FEATURES.md`, `ETAT.md`, `ARCHITECTURE.md` (le module `betting.ts`), `INTENTION.md` (le principe du jeu pour observateurs), et ce document, qui deviendra la référence des règles, listé dans `docs/README.md`.

---

## 4. Livraison par étapes

Chaque étape est jouable, testée et documentée.

| Étape | Contenu | Ce qu'on peut faire après | État |
| --- | --- | --- | --- |
| **P1** | `betting.ts` et ses tests : cotes, mises, règlement, relance | rien de visible, mais toutes les règles sont prouvées | fait (0.37.0) |
| **P2** | comptoir sur l'écran d'affrontement, règlement sur l'écran de fin, bourses dans l'arbre, création du tournoi | parier match par match dans un tournoi, et en duel | fait (0.37.0) |
| **P3** | guichet de tour dans l'arbre | parier sur un tour entier avant de le simuler | à faire : en attendant, les matchs simulés depuis l'arbre ne sont pas pariés |
| **P4** | coups de théâtre | les cotes bougent, les jackpots tombent | fait (0.37.0) |
| **P5** | Meilleur parieur, relevé dans l'arbre, sons, finitions | la fin de tournoi raconte aussi la partie de paris | en partie (0.38.0) : classement sur l'écran du champion et dans l'arbre, écran de fin en deux moitiés ; restent les sons propres et les icônes peintes |

---

## 5. Ce qu'il faut te demander

Ce sont des icônes peintes, la règle « aucun emoji » s'applique. Les icônes de pièce existantes (`coin-face`, `coin-pile`) peuvent servir pour la mise en attendant. **Faites en 0.77.1** (planche v11, STYLE_BIBLE § 7) : bourse (`purse`) dans l'en-tête de chaque plateau et le classement de fin ; jeton (`bet-token`) devant « Combien ? », les boutons de mise restant des pièces dessinées avec leur montant ; embrasse de rideau (`twist`) dans le bandeau du coup de théâtre ; ticket (`ticket`) sur le bouton « Parier » de l'affrontement.
- **Bourse** (pour l'en-tête et les tickets) ;
- **Jeton** (pour les boutons de mise) ;
- **Coup de théâtre** (pour le bandeau) ;
- **Ticket** ou **guichet** (pour le bouton du guichet).

---

## 6. Décisions de l'utilisateur (2026-10-18)

- **0.38.0** : interface de jeu vidéo et non de page web ; **cotes cachées** avant le combat ; mises restreintes à des valeurs proposées ; **deux parieurs de l'ordinateur**, présents à chaque tournoi, sans interface pour les gérer ; écran de fin en deux moitiés (combat, paris).

- **Cotes** : simulées, arrondies à des paliers simples, avec de la variance dans les gains (sous-paris et coups de théâtre).
- **Marchés** : Vainqueur, Victoire écrasante, Durée (noms validés).
- **Faillite** : prime de relance.
- **Simulation d'un tour depuis l'arbre** : guichet de tour.
- **Monnaie** : les **Deniers**.
- **Durée de vie** : un pari vit le temps d'un tournoi, en mémoire ; pas de sauvegarde au rechargement.
- **Noms par défaut** : joueur 1 **karma**, joueur 2 **MiaMiaM** (modifiables à la création du tournoi) ; parieurs de l'ordinateur : **Borin** et **Zlatka** (choix de l'agent).
