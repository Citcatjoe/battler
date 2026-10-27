# La longueur des combats (étude du 2026-10-27, point B16)

La question de l'utilisateur (second retour du 2026-10-27) : « Certains builds crit fort et souvent, écourtant le combat de manière parfois absurde… c'est marrant et rare… mais je me pose à nouveau la question de la pertinence d'avoir des combats plus longs, ou plus de vie, comment intégrer ceci ? à réfléchir. »

Étude seulement : rien n'a changé dans `src/`. Le cadre déjà décidé est [PROGRESSION.md](../PROGRESSION.md) § 12 : la durée vient du contenu, pas d'un calcul qui force une cible ; repli prévu, « chaque récompense obtenue donne aussi quelques PV (un endurcissement) », à n'essayer que si la mesure montre des combats trop courts. Cette étude fait cette mesure.

**Livré (retour du 2026-10-27, C4) : l'endurcissement, +2 PV max par récompense** (`REWARD_HP`, `Character.rewardHp` : une relique ou une étape de forge, chez tout personnage construit, en tournoi, saison et campagne ; règle et cas de la campagne : [CAMPAGNE.md](../CAMPAGNE.md) § 18.2). Mesuré sur l'arbre 0.124.0, sans → avec : `npm run ramp`, combats entre builds à 10 récompenses, **5,8 → 7,3 actions par combattant** en moyenne (7,0 entre personnages nus : le build complet retrouve le rythme du nu, comme l'essai le prévoyait) ; mais l'écart de force relative à 10 récompenses s'élargit, **17,1 → 30,3 points** (Fanchon 57,9 → 63,4 %, Morgrut 40,7 → 33,1 %) : les PV profitent davantage aux builds qui tiennent, à reprendre à l'équilibrage (C5). `npm run campaign` : boss atteint 16 → 17 %, acte gagné 9 → 10 %, tours par combattant au nœud 10 5,3 → 6,6.

## 1. Réponse courte

- **Le constat se vérifie, et il est rare** : construits (10 récompenses), 6 % des combats se finissent en 3 actions ou moins par combattant (0 % entre personnages nus), et 15 % contiennent un coup qui retire 40 % des PV max ou plus (1 % entre nus). La durée moyenne baisse de 7,4 à 6,1 actions par combattant entre le roster nu et les builds complets.
- **Les critiques pèsent bien sur cette baisse, mais par leur fréquence, pas par leur multiplicateur.** Ce qui grossit avec le build, ce sont les **critiques assurés** (de 5 % à 19 % des PV du perdant). Brider le multiplicateur ne change presque rien : plafond à ×3 ou ×2,5, rendement décroissant, plafond du coup entier, tous laissent les builds à 6,1 ou 6,2 actions. Les coups énormes viennent de **multiplicateurs qui se cumulent** (Soliste ×3 puis le critique, la pile ×3), sur peu de builds.
- **Plus de PV, oui : c'est le seul levier qui allonge vraiment.** Deux façons de le faire :
  - **PV ×1,25 pour tout le roster** : le combat nu passe de 7,4 à 9,1 actions, le construit de 6,1 à 7,2. Mais il allonge aussi les combats nus, qui ne sont pas trop courts ; il faut refaire l'équilibre, et le combat dure 15 s de plus à l'écran.
  - **L'endurcissement, +2 PV max par récompense** (relique ou opération de forge), pour tous : le combat nu ne bouge pas (7,4), le construit remonte à 7,8, le même rythme que le nu ; les coups énormes passent de 15 % à 4 %. L'équilibre du roster nu et l'empreinte ne bougent pas, et la campagne tient. C'est la recommandation (§ 5).
- **Non recommandés comme levier de durée** : les plafonds du critique, l'armure pour tous, un soin pour tous, un rejeu plus lent (§ 4).

## 2. Méthode

- **Code** : une copie de la 0.121.0 (dff7f3b), hors du dépôt, avec des interrupteurs ajoutés au moteur pour chaque levier (le script et le diff : `local://r27b-FightLength-script.md`, jetables). Sans interrupteur, la copie redonne exactement les combats de la 0.121.0 (vérifié : mêmes résultats, et 475 tests verts).
- **Corpus, les mêmes graines pour tous les leviers** :
  - **roster nu** : les dix personnages, aura de départ par défaut, 100 combats par duel ordonné (9 000 combats ; taux par personnage à ±2,3 points) ;
  - **builds de saison** : 12 saisons de 24 jouées en entier (reliques et forge, choix par défaut), 288 builds pris après 2, 4, 6, 8 et 10 récompenses ; à chaque étape, 3 000 combats entre deux builds tirés au hasard (une part de 15 % à ±1,3 point ; taux par personnage à ±4 points).
- **Mesures** : actions par combattant (tours ÷ 2) ; **combat court**, 3 actions ou moins par combattant ; **coup énorme**, un coup (pile comprise) qui retire 40 % des PV max de sa cible ou plus ; **secondes à l'écran**, la somme des moments de `stage()` à ×1 (introduction et fin comprises) ; part des PV du perdant retirée par les coups critiques du vainqueur.
- **Campagne** : `npm run campaign` (12 parties par champion, 432 parties) sur la même copie, avec et sans levier.
- **Combats de l'utilisateur** : les traces de `logs/combats/` du 25 au 27 octobre (189 combats construits, règles 0.117 à 0.120).

## 3. L'état (0.121.0)

### 3.1 La durée suit la construction

| Corpus | Actions par combattant (moyenne) | Médiane | 10e centile | 90e centile | Courts (3 ou moins) | 4 ou moins | Coup de 25 % des PV | Coup de 40 % | PV du perdant retirés par critique | Secondes à ×1 (moyenne) | 10e centile | 90e centile |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Roster nu | 7,4 | 7,5 | 5,5 | 9,5 | 0 % | 3 % | 24 % | 1 % | 25 % | 64,5 | 46,1 | 85,0 |
| 2 récompenses | 7,0 | 7 | 5 | 9,5 | 1 % | 5 % | 38 % | 3 % | 27 % | 67,1 | 46,3 | 91,2 |
| 4 récompenses | 6,8 | 6,5 | 4,5 | 9,5 | 2 % | 8 % | 47 % | 5 % | 29 % | 71,3 | 46,2 | 100,7 |
| 6 récompenses | 6,3 | 6 | 4 | 9 | 4 % | 13 % | 56 % | 8 % | 30 % | 72,2 | 46,4 | 101,5 |
| 8 récompenses | 6,4 | 6 | 4 | 9 | 4 % | 13 % | 59 % | 10 % | 33 % | 80,7 | 50,9 | 116,4 |
| 10 récompenses (build complet) | 6,1 | 6 | 3,5 | 8,5 | 6 % | 18 % | 67 % | 15 % | 36 % | 81,6 | 50,7 | 116,6 |

Les autres sources disent la même chose :
- **Saison** (les 6 624 matchs des 12 saisons) : 6,2 actions par combattant, 15 % de combats à 4 actions ou moins.
- **Campagne** : 6,6 actions au premier combat, 5,2 au dixième, 12,0 contre le boss. Les adversaires normaux y ont 75 à 85 % de leurs PV de base, ce qui raccourcit ces combats par construction.
- **Combats de l'utilisateur** (25 au 27 octobre, construits) : médiane de 5,5 à 6,5 actions selon le jour, 2 à 8 % de combats à 3 actions ou moins, 0 à 16 % avec un coup de 40 % des PV ou plus. Le plus gros : un coup de Fanchon, Soliste ×3 puis critique ×2, qui retire 37 PV sur 53 à Elaria (70 %).

### 3.2 À l'écran, un combat construit dure plus longtemps, pas moins

Un combat construit a moins d'échanges, mais chaque échange montre plus de choses (reliques, compétences greffées, réactions). Il passe à l'écran **82 s à ×1, contre 64 s** pour un combat nu : 13,4 s par paire d'actions contre 8,7 s. Ce qui paraît court, c'est donc **le nombre d'échanges et le coup qui renverse tout**, pas le temps passé à regarder.

### 3.3 Ce que font les critiques

| Corpus | PV du perdant retirés par critique | dont critiques assurés | par un coup « ×N » (Soliste, Crescendo, Assaut) | par la pile |
| --- | --- | --- | --- | --- |
| Roster nu | 25 % | 5 % | 0 % | 1 % |
| 4 récompenses | 29 % | 10 % | 1 % | 2 % |
| 10 récompenses | 36 % | 19 % | 2 % | 2 % |

- **Le contrefactuel, sans multiplicateur de critique** (le critique tombe toujours, mais vaut ×1, mêmes graines) : 7,4 → 8,4 actions entre nus, 6,1 → 7,8 entre construits, et les coups énormes passent de 15 % à 3 %. Sans lui, construire ne raccourcit plus que de 0,6 action, au lieu de 1,3 : **la moitié de la baisse due au build vient des critiques**, l'autre moitié du reste (Tremper, dorure, reliques de coup, auras).
- **Les combats courts ne sont pas des combats « tout critique »** : entre construits, les vainqueurs des combats courts retirent 39 % des PV du perdant par critique, contre 35 % dans les autres combats. Sans multiplicateur de critique, la moitié de ces combats courts le restent.
- **Ce qui fait grimper les critiques, c'est leur fréquence** : la chance de critique dépasse rarement 25 % (+5 % par charge d'Aura de précision, d'Ivresse du sang ou d'Effroi), mais les **critiques assurés** se multiplient avec les récompenses : Cloche d'ouverture, Clepsydre du siège, Trophée du chasseur (porté par 19 % des vainqueurs construits), Feinte, Rancune, Pièce porte-bonheur, Œil de faucon.
- **Les briques sur-représentées chez les vainqueurs des combats courts** (builds complets ; « ×2 » : deux fois plus présentes que chez l'ensemble des vainqueurs ; entre parenthèses, leur part chez les vainqueurs) : Pièce trouée ×3,1 (4 %), Soliste gravé ×2,9 (3 %), Fanchon ×2,7 (13 %), Pièce lestée ×2,1 (3 %), Crescendo ×2,1 (2 %), Naraxes et Gorak ×1,7, Coup de chance, Brise-garde, Veine ×1,7. Ce sont des **multiplicateurs qui se cumulent** (« ce coup ×N », puis le critique, puis la pile ×3), sur quelques builds. À l'inverse, Ervald (×0,1), Ysolde (×0,2), Peau de pierre, Pas de côté, Bouclier de foi y sont presque absents.

## 4. Les leviers mesurés

### 4.1 Tableau

Mêmes corpus et mêmes graines que le § 3. « Nu » : le roster nu ; « construits » : les builds complets (10 récompenses). Les taux du roster nu sont à ±2,3 points, ceux des construits à ±4.

| Levier | Actions, nu | Actions, construits | 10e centile, construits | Courts (3 ou moins) | 4 ou moins | Coup de 40 % | Secondes, nu | Secondes, construits | Taux du roster nu, du plus bas au plus haut (écart-type) | Taux des construits (écart-type) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **0.121.0** | 7,4 | 6,1 | 3,5 | 6 % | 18 % | 15 % | 64,5 | 81,6 | 46 à 55 % (2,6) | 38 à 64 % (8,1) |
| PV ×1,15 | 8,4 | 6,8 | 4 | 4 % | 11 % | 9 % | 73,4 | 90,8 | 44 à 54 % (3,0) | 36 à 65 % (8,9) |
| PV ×1,2 | 8,7 | 7,0 | 4 | 3 % | 10 % | 8 % | 76,3 | 93,7 | 44 à 55 % (3,2) | 35 à 65 % (9,3) |
| **PV ×1,25** | 9,1 | 7,2 | 4,5 | 3 % | 9 % | 6 % | 79,6 | 96,8 | 43 à 55 % (3,6) | 35 à 66 % (9,6) |
| PV ×1,5 | 10,8 | 8,4 | 5 | 2 % | 5 % | 3 % | 94,5 | 111,6 | **42 à 59 %** (4,7) | 32 à 69 % (11,0) |
| PV ×2 | 13,8 | 10,5 | 6 | 0 % | 2 % | 1 % | 122,5 | 140,8 | **37 à 63 %** (8,2) | 31 à 73 % (12,7) |
| Endurcissement +1,5 PV par récompense | 7,4 | 7,4 | 4,5 | 3 % | 8 % | 6 % | 64,5 | 98,3 | 46 à 55 % (2,6) | 36 à 68 % (10,0) |
| **Endurcissement +2 PV par récompense** | 7,4 | 7,8 | 4,5 | 2 % | 7 % | 4 % | 64,5 | 103,9 | 46 à 55 % (2,6) | 34 à 71 % (10,9) |
| Endurcissement +3 PV par récompense | 7,4 | 8,7 | 5 | 1 % | 5 % | 3 % | 64,5 | 116,6 | 46 à 55 % (2,6) | 34 à 71 % (11,4) |
| Armure +1 pour tous | 8,5 | 6,7 | 4 | 4 % | 13 % | 14 % | 74,4 | 89,3 | 42 à 56 % (3,8) | 38 à 63 % (7,9) |
| Soin pour tous (Régénération 1 au départ) | 8,3 | 6,5 | 3,5 | 5 % | 15 % | 16 % | 98,3 | 107,2 | 42 à 56 % (4,6) | 37 à 64 % (8,2) |
| Soin pour tous (Régénération 2) | 9,3 | 7,3 | 4 | 5 % | 13 % | 17 % | 110,6 | 119,1 | **38 à 60 %** (6,4) | 36 à 66 % (8,8) |
| Multiplicateur de critique plafonné à ×3 | 7,4 | 6,1 | 3,5 | 6 % | 17 % | 14 % | 64,5 | 81,8 | 46 à 55 % (2,6) | 38 à 64 % (8,1) |
| Multiplicateur de critique plafonné à ×2,5 | 7,4 | 6,2 | 3,5 | 6 % | 16 % | 11 % | 64,5 | 82,7 | 46 à 55 % (2,6) | 39 à 65 % (7,9) |
| Rendement décroissant (au-delà de ×2, chaque point compte moitié) | 7,5 | 6,2 | 3,5 | 5 % | 16 % | 11 % | 64,9 | 82,9 | 42 à 56 % (3,4) | 39 à 65 % (7,6) |
| Coup entier plafonné à ×3 (« ×N » et critique ensemble) | 7,4 | 6,1 | 3,5 | 6 % | 17 % | 13 % | 64,5 | 81,9 | 46 à 55 % (2,6) | 38 à 64 % (7,9) |
| Chance de critique plafonnée à 25 % | 7,4 | 6,1 | 3,5 | 6 % | 18 % | 15 % | 64,5 | 81,6 | 46 à 55 % (2,6) | 38 à 64 % (8,3) |
| Critique assuré à ×1,5 | 7,5 | 6,6 | 4 | 5 % | 14 % | 10 % | 65,4 | 88,5 | **27 à 57 %** (8,0) | 39 à 65 % (7,8) |
| B8, approché (une charge au plus, sans usure, perdue sur une esquive) | 7,4 | 6,1 | 3,5 | 6 % | 17 % | 14 % | 64,5 | 81,9 | 45 à 55 % (2,9) | 38 à 64 % (7,6) |
| B8 approché et PV ×1,25 | 9,1 | 7,3 | 4,5 | 3 % | 9 % | 6 % | 79,7 | 97,0 | 40 à 55 % (4,3) | 35 à 66 % (9,1) |
| B8 approché et endurcissement +2 | 7,4 | 7,8 | 4,5 | 2 % | 7 % | 4 % | 64,5 | 104,1 | 45 à 55 % (2,9) | 35 à 70 % (10,1) |
| Coup entier plafonné à ×3 et PV ×1,25 | 9,1 | 7,3 | 4,5 | 3 % | 9 % | 5 % | 79,6 | 97,3 | 43 à 55 % (3,6) | 35 à 65 % (9,2) |
| *Repère : critique sans multiplicateur (×1)* | 8,4 | 7,8 | 4,5 | 3 % | 9 % | 3 % | 73,3 | 102,4 | 8 à 69 % (16,2) | 24 à 74 % (12,4) |

### 4.2 Lecture, levier par levier, avec son coût

**PV ×k pour tout le roster** (dix valeurs de `roster.ts`)
- **Effet** : le seul levier qui allonge tout. ×1,25 : nu 7,4 → 9,1, construits 6,1 → 7,2, combats à 4 actions ou moins 18 → 9 %, coups énormes 15 → 6 %.
- **Équilibre** : il bouge, parce que les PV ne servent pas tout le monde pareil (un soin, un poison, un bonus à plat pèsent moins). ×1,25 : roster nu de 46-55 à 43-55 % (Elaria 45,9 → 42,7, Fanchon 50,7 → 54,8), dans la tolérance à 100 combats par duel, à revérifier à 800 (`balance.test.ts`). ×1,5 en sort (Fanchon 58,6 %, Elaria 41,7 %).
- **Empreinte** : cassée (le roster nu change), à mettre à jour volontairement.
- **Tests** (essai sur la copie, PV ×1,25) : 3 sur 475 tombent. L'empreinte ; l'audit de tout le roster, qui dépasse ses 5 s parce que les combats sont plus longs ; le contrôle des timings sur des constructions au hasard, qui tombe sur un défaut latent de mise en scène (§ 7).
- **Campagne** : elle tient, son réglage des PV absorbe le changement. Boss atteint 15 → 14 %, acte gagné 9 → 8 %, combats normaux 6,1 → 7,5 actions, boss 12,0 → 14,1.
- **Valeurs à remesurer** : chaque montant à plat en PV perd de son poids : Gambison +15, Larme de givre +5, Récolte +14, Aura de sainteté, Siffloter, Poison, Brûlure. Les personnages de soin et de dégâts sur la durée bougent (RELIQUES § 14 : 1 PV max vaut environ 2,3 points de taux).
- **Docs** : PERSONNAGES (PV de chaque fiche), EQUILIBRAGE (journal), RELIQUES (mesures), FEATURES.
- **Spectateur** : +15 s par combat à ×1, nu (64 → 80 s) comme construit (82 → 97 s).
- **Paris** : la ligne du combat long ou court suit d'elle-même (médiane simulée : 15 → 18 tours entre nus) ; « écrase » 13 → 12 % (nu), 27 → 25 % (construits) ; le calcul des cotes simule environ 23 % de tours en plus.
- **Contre** : il allonge aussi les combats nus, qui ne sont pas trop courts (10e centile : 5,5 actions), et il ne lie pas la durée au build.

**L'endurcissement : +N PV max par récompense** (une règle commune, comme une stat de relique : chaque relique et chaque opération de forge reçue ajoute N PV max)
- **Effet** : il ne touche que ce qui raccourcit, le build. À +2 : nu inchangé (7,4), construits 6,1 → 7,8, 10e centile 3,5 → 4,5, combats courts 6 → 2 %, coups énormes 15 → 4 %. À +1,5, les construits reviennent à 7,4, exactement le rythme du nu ; à +3, ils durent plus que le nu (8,7).
- **Équilibre** : le roster nu ne bouge pas (il n'a aucune récompense), ni `balance.test.ts`, ni l'empreinte. Entre construits, l'écart des personnages s'élargit (écart-type 8,1 → 10,9 : Fanchon 63,9 → 70,8, Ysolde 38,2 → 35,2, Thaldrin 38,5 → 34,0), à ±4 points de bruit : à surveiller avec `npm run season` et `npm run ramp`.
- **Tests** (essai sur la copie, +2) : 19 sur 475 tombent, tous attendus. 10 audits recalculent les stats d'un combattant sans connaître la règle (« stats fausses ») : l'audit doit l'apprendre. 7 tests de `combat.test.ts` attendent les PV exacts d'un personnage qui porte une relique ou une forge (Gambison, seuils, Dent de loup, Récolte, Siffloter, « une relique ne tire aucun dé »). 1 test de campagne attend ses PV réglés. 1 est le défaut latent des timings (§ 7).
- **Campagne** : elle tient. Boss atteint 15 → 18 %, acte gagné 9 → 12 % (12 parties par champion : écart dans le bruit) ; combats normaux 6,1 → 6,7 actions ; au 10e combat, 5,2 → 7,0 : la durée **ne baisse plus** au fil de l'acte ; boss 12,0 → 15,8. Les adversaires normaux reçoivent 85 % de leurs PV de base en moyenne (80 % avant), l'endurcissement en plus.
- **Docs** : RESOLUTION et FEATURES (la règle), RELIQUES et CAMPAGNE (la récompense rapporte aussi des PV), PROGRESSION § 12.3 (le repli devient la règle), le compendium (une règle de plus à dire), la fiche du personnage (ses PV max).
- **Spectateur** : un combat construit passe de 82 à 104 s à ×1. Le nombre d'échanges revient à celui d'un combat nu (§ 3.2).
- **Paris** : la ligne suit (médiane des construits : 12 → 15 tours) ; « écrase » 27 → 25 %.
- **Accord avec les décisions** : c'est le repli déjà écrit au § 12.3 de PROGRESSION, et la décision de l'utilisateur « des PV qui montent en lien avec le nombre de récompenses ». Ce n'est pas une durée pilotée : un montant fixe par récompense, visible, sans cible.

**Plafonds et rendement décroissant du critique** (multiplicateur ×3 ou ×2,5, moitié au-delà de ×2, coup entier ×3 ou ×4, chance de 25 %)
- **Effet sur la durée : aucun** (construits 6,1 → 6,1 ou 6,2). Coups énormes 15 → 11 à 14 %.
- **Pourquoi** : un multiplicateur au-delà de ×2,5 est rare (l'Aura de précision le monte d'un point par charge, chez peu de builds), la chance de critique dépasse rarement 25 %. Les coups énormes cumulent des multiplicateurs différents (×N, critique, pile) ; les plafonner tous ensemble demande une règle de plus pour peu d'effet.
- **Coût** : une règle du moteur (RESOLUTION, `combat.ts`, tests, audit). Le rendement décroissant touche aussi les multiplicateurs de base au-delà de ×2 (Aldric ×2,5 : 54,2 → 50,9 % ; Elaria ×2,2 : 45,9 → 41,7 %), donc l'empreinte et l'équilibre.

**Critique assuré à ×1,5** (les critiques imposés frappent moins fort)
- **Effet** : construits 6,1 → 6,6, coups énormes 15 → 10 %. Il touche la vraie source (§ 3.3).
- **Coût** : Elaria nue tombe de 45,9 à 27,0 % (Œil de faucon, sa signature, est un critique assuré) ; tout son personnage serait à reprendre. Une règle de plus, l'empreinte, l'équilibre. Non recommandé.

**B8** (le critique assuré à une charge, perdu sur une esquive ; en cours chez CombatRules)
- **Effet sur la durée** : aucun mesurable dans l'approximation (6,1 → 6,1 ; coups énormes 15 → 14 %). Il règle l'empilement, pas la durée : ne pas compter sur lui pour allonger.

**Armure +1 pour tous**
- **Effet** : nu 7,4 → 8,5, construits 6,1 → 6,7 ; coups énormes inchangés (14 %). Une armure à plat retire autant à un petit coup qu'à un gros : elle frappe les petites attaques (Gorak 48,8 → 44,8 %, Elaria 45,9 → 42,3 %) et laisse passer le coup qui renverse tout. L'inverse de la cible.

**Un soin pour tous** (Régénération posée au départ, approximation : elle s'oppose au Poison et se purge)
- **Effet** : nu 7,4 → 8,3, construits 6,1 → 6,5 seulement ; coups énormes inchangés (16 %).
- **Coût** : +34 s par combat nu à l'écran (un moment de soin à chaque tour) ; l'équilibre s'écarte (Régénération 1 : 42 à 56 % ; Régénération 2 : 38 à 60 %, hors tolérance). Le pire rapport effet sur coût.

**Un rejeu plus lent**
- **Effet** : des secondes en plus, pas un échange de plus. Le combat construit est déjà le plus long à regarder (§ 3.2), et le coup qui renverse tout resterait. Les vitesses ×2 et ×4 existent. Non recommandé.

**Le contenu** (la voie du § 12.2 de PROGRESSION)
- Les valeurs des briques sur-représentées dans les combats courts (§ 3.3 : Pièce trouée, Soliste, Pièce lestée, Crescendo, Coup de chance, Brise-garde, Veine) se règlent au laboratoire, brique par brique, sans en créer. Chacune n'est prise que par 2 à 4 % des builds : utile contre le coup absurde, sans effet sur la tendance générale.

## 5. Recommandation et plan

1. **Ne rien changer au critique pour la durée.** B8 suit son cours pour sa propre raison (l'empilement) ; les plafonds n'allongent rien.
2. **Livrer l'endurcissement, +2 PV max par récompense, pour tous et partout** (tournoi, saison, campagne). Il ramène le build complet au rythme du combat nu (7,8 contre 7,4 actions) et divise par quatre les coups énormes, sans toucher au roster nu ni à l'empreinte.
   - **Moteur** : une stat ajoutée comme celle d'une relique, comptée sur les reliques et le journal de forge (`Character`), donc lue par tous les modes ; aucune règle dans l'interface.
   - **Écran** : les PV max de la fiche et de l'affrontement l'incluent ; une règle du compendium la dit (« Endurcissement : chaque récompense donne +2 PV max »), sans emoji, et la carte d'une récompense peut le rappeler.
   - **Tests** : un test de la règle dans `combat.test.ts`, l'audit des stats qui l'apprend (`audit.ts`), les 7 tests qui attendent des PV exacts recalculés, le test des PV réglés de la campagne.
   - **Mesures, une fois chacune** : `npm run season` (écart des construits), `npm run campaign` (courbe et boss), `npm run relics` (les reliques de PV, comme le Gambison, perdent un peu de leur singularité) ; `npm run balance` doit rester identique.
   - **Docs** : RESOLUTION, FEATURES, RELIQUES, CAMPAGNE, PROGRESSION § 12.3, EQUILIBRAGE (journal) ; CHANGELOG et version mineure.
3. **Puis, seulement si l'utilisateur trouve encore des coups absurdes** : les valeurs des briques à multiplicateurs cumulés (§ 4.2, « Le contenu »), au laboratoire, sur sa décision.
4. **PV ×1,25 en réserve** : si l'utilisateur veut aussi des combats nus plus longs, c'est le levier, avec un équilibre à refaire (§ 4.2) et 15 s de plus par combat.

## 6. Questions à l'utilisateur

- **Q1.** L'endurcissement, +2 PV max par récompense, pour tous et partout : d'accord ? Ou +1,5 (le build complet dure exactement comme un nu) ou +3 (il dure plus) ?
- **Q2.** Les combats nus (7,4 actions par combattant, environ 65 s à ×1) : la bonne longueur, ou faut-il aussi les allonger (PV ×1,25 : 9,1 actions, 80 s) ?
- **Q3.** Les coups qui renversent tout (Soliste puis critique, la pile ×3) : « marrant et rare », à garder tels quels, ou à adoucir par leurs valeurs ?

## 7. Non vérifié, limites

- **Approximations** : B8 est approché (une charge au plus, sans usure, perdue sur une esquive), pas le code de CombatRules ; le soin pour tous passe par le statut Régénération (opposé au Poison, purgeable) ; l'endurcissement de l'essai ajoute les PV comme une stat de relique.
- **Bruit** : les taux par personnage entre construits (±4 points) ; la campagne à 12 parties par champion. Les taux du roster nu sont à 100 combats par duel, pas les 800 de `balance.test.ts`.
- **Rien n'a été vu à l'écran** ; les secondes sont celles de la mise en scène calculée (`stage()`), à ×1.
- **Deux défauts latents de mise en scène**, que des combats plus longs font apparaître et que la 0.121.0 ne montre pas sur ses propres graines :
  - le contrôle des timings (`timing.test.ts`, constructions au hasard) relève « la charge de Malchance part avant que le jet tombe à vide », avec PV ×1,25 comme avec l'endurcissement (exemple : Fanchon [jinx@3, sharpen@3, feint@5, sharpen@1, holed-coin, forge-bellows] contre Ysolde [copy@2, copy@1, temper, frost-aura@5, copy@5, hollow-die, tinder-box], graine 1584, moment 24) ;
  - `stage()` lève « PV n au lieu de n − 1 » (un PV d'écart entre l'écran et le moteur) sur 1 à 2 combats sur 24 000 avec l'armure +1, PV ×1,5 ou un soin pour tous ; jamais sur les combats de la 0.121.0.
  Ce sont des défauts de la mise en scène (MISE_EN_SCENE.md), à corriger avant ou avec tout levier qui allonge les combats.
