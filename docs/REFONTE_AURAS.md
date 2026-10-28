# Refonte des auras et des boucles de build

_Proposition du 2026-10-28 (retour du jour : A1, A10, A11 pour la forme du Duo, A12, A14, et les ressentis par personnage), agent AuraVision. **Rien n'est livré au jeu** : c'est une vision, à valider par l'utilisateur avant tout code (principe du retour : « les visions se proposent d'abord, chiffrées »). Laboratoire : séries 100 à 110 de `scripts/lab/aura-vision.ts`, rapports `logs/lab/2026-10-28-14-*_v0.127.0.md`. Contexte : [AURAS.md](AURAS.md) (la règle du 3e tour, le Dé pipé, les dés de plus), [MAITRISES.md](MAITRISES.md) (huit maîtrises, réserves, départs)._

**Base des mesures.** Une copie figée de la 0.127.0 (`git archive d68472b`, la version jouée par l'utilisateur) : le moteur changeait le même jour (A6, A7 chez EngineFixes28), et deux passages sur l'arbre de travail ont donné des taux d'avant différents d'une heure à l'autre (Fanchon 51,4 puis 36,8 %). Sur la copie figée, aucun drapeau d'audit. 400 combats par duel contre les neuf autres (3 600 par ligne), mêmes graines que `npm run balance` ; écart apparié, marge à 95 % de ± 0,5 à ± 2,0 points. Taux du roster de la 0.127.0 sur cette base : Gorak 48,8, Elaria 48,1, Brokk 52,2, Ervald 46,1, Ysolde 49,6, Naraxes 49,6, Aldric 51,7, Morgrut 55,3, Thaldrin 51,6, Fanchon 46,9 % (46,1 à 55,3, écart-type 2,6 points, 13,7 tours par combat).

## 0. En bref

- **Le constat** (§ 1) : sur 33 auras, **10 sont des « 1 X par Y »** (une grille de trois gestes, par tour, par coup donné, par coup reçu, sur quatre ressources), **5 des bonus plats**, **7 des consommatrices** que leur porteur ne nourrit pas (jamais auras de départ). Il reste **3 changeurs de règle** (Dé pipé, Veine, Immunité) et **8 convertisseurs** (Feinte, Ivresse du sang, Effroi…), les seules qui « font » un build. 62 départs ouverts aujourd'hui, 7 hors de la bande 42-58.
- **A12 chiffré** (§ 2) : les « 1 » ne sont pas faibles en force, ils sont faibles à lire. Passés à 2, ils valent **+17 à +23 points** au départ (Épines 52,2 → 75,6 %) ; pour tous, le roster éclate (28,6 à 64,2 %). Le budget permet environ moitié plus, pas le double. Proposition : **la montée**, l'aura part à 1 et gagne un cran tous les deux déclenchements (1, 1, 2, 2, puis 3 pour certaines) ; le chiffre grimpe à l'écran, et le 1 du dé la fait avancer (une charge de plus, un demi-cran).
- **Le jeu réduit** (§ 3) : **20 auras** (17 gardées ou refaites, 3 nouvelles : Bastion, Jugement, Brasier), **deux par personnage**, nommées sur sa fiche comme sa signature ; chacune produit ce que sa face 2 et sa réserve lisent. 16 sortent : 4 deviennent des compétences à charges, 3 des reliques, 9 sont retirées (§ 4).
- **Les faces 2** : Aldric passe à la **Riposte**, qui renvoie **tout** le coup (la moitié aujourd'hui) ; Morgrut passe à l'**Assaut** (ce coup ×2) à la place du Crescendo ; le **Duo** de Fanchon devient **trois coups bruts tout de suite** (A11 : plus de boucle, plus de 9 dés), avec l'attaque 5 à 6.
- **Pour tous, la proposition finale** (W5, § 6) : roster **45,7 à 54,6 %** (aujourd'hui 46,1 à 55,3), écart-type 2,6 → 2,7 points, pire duel 61,8 % (Aldric contre Morgrut), combats 13,7 → 13,2 tours. Chaque seconde aura entre 44,4 et 52,9 %, sauf l'Élan de Gorak à 41,9 % (dans la marge de ± 1,5).
- **A14** (§ 5.9) : oui, une **pile critique** : une pièce lancée par un coup critique double son effet de pile (+2,6 points chez Naraxes, un « moment » de plus) ; Pile ou face, qui multiplie déjà un coup critique, n'a pas besoin de règle.
- **A7 et Fanchon** (signalé au parent) : sans boucle, le Duo d'aujourd'hui fait passer Fanchon de 46,9 à **31,0 %** au départ. La correction A7 seule la sort de la bande ; la forme proposée du Duo la remet à 48,1 % (W5).

## 1. L'état des lieux : les 33 auras

**Nature.** _Producteur_ : crée une ressource que d'autres briques lisent. _Changeur de règle_ : change une règle du jeu pour son porteur (le Dé pipé : la pièce). _Convertisseur_ : lit une ressource que son dé produit et en fait une autre. _Bonus plat_ : un chiffre, rien à lire. _Consommatrice_ : lit une ressource que son porteur ne produit pas au départ. **Départ** : son taux de victoire sur le 1 du dé vanilla, la face 2 du roster, contre le roster (série 100 ; « défaut » : l'aura de la 0.127.0).

| # | Aura | Maîtrise | Ce qu'elle fait | Nature | Ce qu'elle nourrit (registre) | Départ (série 100) | Doublon de |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Aura de puissance | Fureur | +2 par coup, +1 par pose (+4) | bonus plat | chaque coup (rafales, dés de plus) | Morgrut 55,3 (défaut), Gorak 59,1 | Aura sauvage |
| 2 | Aura sauvage | Fureur | +1 à l'attaque par pose | bonus plat | chaque coup | Gorak 48,8, Morgrut 47,9 | Aura de puissance |
| 3 | Aura de précision | Fureur | +5 % de critique, +1 au multiplicateur | bonus plat | Ivresse, Effroi, Pourriture, Élan | Gorak 51,3 | Contrepoids de plomb |
| 4 | Élan | Fureur | +10 % de critique ; gros coup : +3 Ferveur | convertisseur | ses coups | Gorak 46,1, Morgrut 47,5 | — |
| 5 | Ivresse du sang | Sang | critique : deux coups bruts | convertisseur | tout ce qui lit un coup qui touche | Gorak 48,8 (défaut), Elaria **63,3**, Brokk 45,1 | — |
| 6 | Aura d'épines | Sang | 1 Saignement par coup reçu | producteur à 1 | Curée, Odeur du sang, Sangsue, Croc de boucher | Brokk 52,2 (défaut), Gorak 48,1, Elaria 45,9 | Peau de crapaud, Champ d'orage |
| 7 | Plaie ouverte | Sang | 1 Saignement par coup qui touche | producteur à 1 | idem | Gorak 46,5, Elaria 46,9, Brokk 46,3 | Décoction, Ballade |
| 8 | Sangsue | Sang | soin par Saignement adverse | consommatrice | — | jamais au départ | — |
| 9 | Aura d'intimidation | Rempart | −1 à chaque coup adverse | bonus plat | — | Brokk 43,6, Aldric 52,6, Morgrut 47,7 | Cotte du mercenaire |
| 10 | Vindicte | Rempart | renvoi : +6 Ferveur | convertisseur | ses coups | Aldric 51,7 (défaut) | Rancœur |
| 11 | Rempart hérissé | Rempart | armure vidée : +2 Épines, +2 armure | convertisseur | Épines | Brokk 53,9 | — |
| 12 | Rancœur | Rempart | coup reçu : +1 Ferveur | producteur à 1 | ses coups | Brokk 43,7, Aldric 52,7, Morgrut 44,3 | Vindicte |
| 13 | Dette de sang | Rempart | renvoi : 3 Saignement | consommatrice | Saignement | Aldric 50,5 | — |
| 14 | Aura de décoction | Poison | 1 Poison par coup qui touche | producteur à 1 | Virulence, Récolte, Morsure, Fiole de venin | Naraxes 49,6 (défaut), Ervald 49,0, Thaldrin 52,4 | Plaie ouverte |
| 15 | Aura de poison | Poison | 1 Poison par tour (le fige à 1) | producteur à 1 | idem | Ervald 46,1 (défaut), Naraxes 44,7, Thaldrin 50,1 | Ciel d'orage |
| 16 | Sève noire | Poison | soin reçu : 4 Poison | consommatrice | — | Ervald 45,7 | — |
| 17 | Peau de crapaud | Poison | 1 Poison par coup reçu | producteur à 1 | Poison | Ervald 53,2, Naraxes 48,8, Thaldrin 55,4 | Aura d'épines |
| 18 | Dé pipé | Chance | pile +25 %, critique +5 %, esquive +5 % | changeur de règle | ses pièces | Naraxes 47,3 | Pièce lestée |
| 19 | Feinte | Chance | +5 % d'esquive ; esquive : critique assuré | convertisseur | Ivresse, Effroi… | Elaria 48,1 (défaut), Naraxes 52,1, Fanchon 40,2 | Larcin |
| 20 | Veine | Chance | chaque 6 : un jet de plus | changeur de règle | un jet complet | Elaria **39,8**, Naraxes 44,2, Fanchon **40,8** | Coup de chance |
| 21 | Pas de côté | Chance | +12 % d'esquive | bonus plat | Feinte, Larcin, Conque des vents | Elaria 45,3, Naraxes 49,6, Fanchon 44,4 | Bottes de feutre |
| 22 | Aura de sainteté | Lumière | +1 PV par tour (deux poses) | producteur à 1 | Sentence, Bouclier de foi, Flamme votive, Encens | Ysolde 49,6 (défaut) | Ballade |
| 23 | Sentence | Lumière | soin reçu : 3 PV à l'adversaire | consommatrice | — | jamais au départ | — |
| 24 | Bouclier de foi | Lumière | soin reçu : +2 armure temporaire | consommatrice | armure | jamais au départ | — |
| 25 | Aura d'immunité | Lumière | aucun malus, +1 armure | changeur de règle | — | Ysolde 45,4 | — |
| 26 | Effroi | Ombre | critique : Peur | convertisseur | — | Ervald 55,7, Aldric 56,0 | Pourriture |
| 27 | Aura de pourriture | Ombre | critique : 2 Pourriture | convertisseur | Emprise | Ervald 55,8, Aldric 54,6 | Effroi |
| 28 | Emprise | Ombre | +1 par malus adverse | consommatrice | — | jamais au départ | Croc de boucher, Fiole de venin |
| 29 | Larcin | Ombre | +5 % d'esquive ; esquive : vol | convertisseur | — | Ervald 48,6, Aldric 53,6 | Feinte |
| 30 | Ciel d'orage | Magie | 1 PV par tour | producteur à 1 | Surtension | Thaldrin 51,6 (défaut), Ysolde 47,7, Fanchon **38,7** | Aura de poison |
| 31 | Champ d'orage | Magie | 1 PV par coup reçu | producteur à 1 | Surtension | Ysolde 48,4, Thaldrin 52,6, Fanchon **38,5** | Aura d'épines |
| 32 | Ballade | Magie | 1 PV par coup qui touche | producteur à 1 | les soins | Fanchon 46,9 (défaut), Ysolde 49,3, Thaldrin 49,1 | Plaie ouverte |
| 33 | Surtension | Magie | +1 par éclair | consommatrice | — | jamais au départ | — |

**Lecture.**
1. **La grille du « 1 »** (A1, A12) : dix auras sont la même phrase, « 1 X par Y ». Par tour : Aura de poison, Ciel d'orage, Aura de sainteté. Par coup qui touche : Plaie ouverte, Décoction, Ballade. Par coup reçu : Épines, Peau de crapaud, Champ d'orage, Rancœur. C'est le « toutes pareilles » d'Ysolde et de Thaldrin : leurs choix de départ étaient trois cases de la grille.
2. **Rien à exploiter** : 5 bonus plats et 7 consommatrices sans producteur. L'Aura de poison est un cas à part : à 1 par tour, elle compense l'usure du Poison, qui reste à 1 tout le combat. Elle change donc une règle (« le Poison ne baisse plus »), mais la case du compendium dit « 1 ».
3. **Ce qui marche** est ce qui convertit : l'Effroi (critique → Peur, l'Ombre que l'utilisateur trouve « géniale »), le Larcin (esquive → vol), la Feinte, l'Ivresse, et le Dé pipé chez Naraxes.
4. **Les départs hors bande** (7 sur 62) : Veine chez Elaria 39,8 ; chez Fanchon, Ciel d'orage 38,7, Champ d'orage 38,5, Feinte 40,2, Veine 40,8 ; au-dessus, Ivresse chez Elaria 63,3 (son Œil de faucon lui donne un critique sur chaque 2), Puissance chez Gorak 59,1.

## 2. A12 : ce que valent les « 1 »

| Aura (porteur), au départ | 1 aujourd'hui | 2, cumulable | 2, sans cumul | 3, sans cumul | Montante (1, 1, 2, 2, 3) |
| --- | --- | --- | --- | --- | --- |
| Aura d'épines (Brokk) | 52,2 | 75,6 (+23,3) | 69,4 (+17,2) | — | 62,0 (+9,8) |
| Aura de poison (Ervald) | 46,1 | 66,8 (+20,7) | 61,6 (+15,5) | 72,5 (+26,4) | 53,1 (+7,0) |
| Aura de décoction (Naraxes) | 49,6 | 69,7 (+20,1) | 63,6 (+14,0) | — | 56,2 (+6,7) |
| Aura de sainteté (Ysolde) | 49,6 | 66,4 (+16,9) | 56,4 (+6,8) | 67,6 (+18,0) | 58,7 (+9,1) |
| Ciel d'orage (Thaldrin) | 51,6 | — | 59,4 (+7,8, 2 éclairs) | — | 57,3 (+5,7, lent à 3) ; 55,4 (+3,8, lent à 2) |

Séries 101, 105, 106. **Pour tous** (série 104, chaque personnage et ses adversaires) : les « 1 » à 2 sans cumul (W2) donnent un roster de **28,6 à 64,2 %**, écart-type 9,3 points, pire duel 85,3 % ; Brokk +12,0, Naraxes +11,2, Ervald +10,6 ; les autres perdent ce que gagnent ces trois-là.

**Lecture.** Un 1 qui revient à chaque coup, cumulable par le 1 du dé, pèse déjà son poids : le doubler double la ressource, pas le plaisir. Le chiffre doit grossir **sans** doubler le total : c'est la **montée**. L'aura commence à 1, gagne un cran tous les deux déclenchements, et plafonne à 2 (Épines, Sainteté, Ciel d'orage) ou 3 (Aura de poison, Décoction). Mécanique mesurée : l'aura compte ses charges (une par déclenchement, une par 1 au dé), et son effet vaut la moitié de ses charges, arrondie au-dessus. L'écran a quelque chose à montrer : le badge de l'aura passe de 1 à 2 puis à 3, et le Poison de l'adversaire monte au lieu de rester à 1. Dans le monde de la proposition (W3, série 107), revenir au registre coûte : Épines −6,0, Aura de poison −6,4, Décoction −6,2, Sainteté −3,7 points.

## 3. Le jeu réduit : 20 auras, deux par personnage

**Règles proposées** (une pour tous) :
1. **Deux auras par personnage**, nommées sur sa fiche, comme sa signature, chacune prise dans l'une de ses deux maîtrises et servie par son dé de départ (le producteur d'abord : `validateRoster` le vérifie). L'aura se choisit au départ (campagne) ou se tire (tournoi, saison, comme aujourd'hui) ; en cours de partie, aucune aura ne s'ajoute (A2, livré par ForgeRework).
2. **Une aura est un moteur** : elle produit une ressource, change une règle ou convertit ; jamais un bonus plat.
3. **Un chiffre qui se voit** : pas de « 1 » fixe ; une aura à ressource **monte** (§ 2), et chaque aura a son moment d'écran (§ 3.2).
4. **La règle du 3e tour reste** ([AURAS.md](AURAS.md) § 2.6) : l'aura arrive au plus tard au début du 3e tour de son porteur ; un 1 la pose plus tôt, puis la fait monter.

### 3.1 Les 20 auras

| Aura | Maîtrise | Texte proposé | Nature | Ce qu'elle nourrit | Porteurs | Départ, pour tous (W5) |
| --- | --- | --- | --- | --- | --- | --- |
| Ivresse du sang | Sang | inchangée : chaque critique, deux coups de plus | convertisseur | Saignement au coup, soins au coup | Gorak (1re) | Gorak 45,7 |
| Élan | Fureur | inchangé | convertisseur | ses gros coups | Gorak (2e) | Gorak 41,9 |
| **Feinte, la Visée** | Chance | +5 % d'esquive ; chaque esquive et chaque coup qui touche : **+0,5 au multiplicateur de son prochain critique** (la Visée s'accumule jusqu'à ce critique) | convertisseur | l'Œil de faucon (le tir), Esquive améliorée | Elaria (1re) | Elaria 49,0 |
| **Plaie ouverte** | Sang | chaque critique : **Saignement 4** | convertisseur | Odeur du sang (critique s'il saigne : la boucle), Curée | Elaria (2e) | Elaria 50,8 |
| **Aura d'épines** | Sang | chaque coup reçu : Saignement, **1 puis 2** (montante) | producteur | Curée, Odeur du sang, Sangsue | Brokk (1re) | Brokk 51,4 |
| **Bastion** (nouvelle) | Rempart | quand son armure temporaire est vidée : l'attaquant perd **3 PV**, et il regagne **+2 armure temporaire** | convertisseur | la Peau de pierre (face 2), Onde de choc, Riposte | Brokk (2e) | Brokk 48,4 |
| **Aura de poison** | Poison | au début de chacun de ses tours : Poison, **1 puis 2 puis 3** (montante) | producteur | Virulence, Morsure, Récolte | Ervald (1re) | Ervald 48,1 |
| Effroi | Ombre | inchangé : chaque critique, l'adversaire perd sa prochaine action | convertisseur | Peur, Confiscation (le tempo) | Ervald (2e) | Ervald 51,4 |
| **Aura de sainteté** | Lumière | à la fin de chacun de ses tours : **+1 puis +2 PV** (montante) | producteur | Sentence et Bouclier de foi (en compétences, § 4), Flamme votive | Ysolde (1re) | Ysolde 47,2 |
| **Jugement** (nouvelle) | Lumière | chaque coup qui la touche met une **faute** à l'attaquant ; à la **3e**, il perd sa prochaine action (Peur), et ses fautes partent | changeur de règle | sa Purification (le bonus retiré), la longueur du combat | Ysolde (2e) | Ysolde 49,2 |
| **Aura de décoction** | Poison | chaque coup qui touche : Poison, **1 puis 2 puis 3** (montante) | producteur | Morsure, Virulence, la Pièce vert-de-gris | Naraxes (1re) | Naraxes 52,6 |
| Dé pipé | Chance | inchangé | changeur de règle | ses pièces (§ 5.9) | Naraxes (2e) | Naraxes 44,7 |
| Vindicte | Rempart | inchangée (+6 Ferveur par renvoi) ; sa face 2 devient la **Riposte entière** | convertisseur | Riposte, Rétribution, Onde de choc | Aldric (1re) | Aldric 54,6 |
| Larcin | Ombre | inchangé | convertisseur | Confiscation, Peur | Aldric (2e) | Aldric 52,9 |
| **Aura de puissance** | Fureur | +2 à chacun de ses coups ; **chaque gros coup : +1, jusqu'à +6** | convertisseur | l'Assaut (face 2), Soliste, Brise-garde | Morgrut (1re) | Morgrut 51,0 |
| **Rancœur** | Rempart | chaque coup reçu : **+3 Ferveur** (sans cumul) | producteur | son prochain coup (« il s'énerve ») | Morgrut (2e) | Morgrut 51,9 |
| **Ciel d'orage** | Magie | au début de chacun de ses tours, des éclairs : **1, 1, 2, 2…** (montant, 2 au plus) | producteur | la Foudre, la Surtension (relique, § 4) | Thaldrin (1re) | Thaldrin 52,4 |
| **Brasier** (nouvelle) | Magie | au début de chacun de ses tours : **+1 à la Brûlure de l'adversaire**, qui repart (Brûlure 1 s'il ne brûle pas) | producteur | les Feux follets (face 2), Attiser, Embrasement, Soufflet de forge | Thaldrin (2e) | Thaldrin 44,5 |
| **Ballade** | Magie | chaque coup qui touche : +1 PV et une **note** ; à la 4e note, **le refrain** : quatre notes de 1 dégât sur l'adversaire | producteur | les coups du Duo | Fanchon (1re) | Fanchon 48,1 |
| **Veine** | Chance | chaque 6 au dé : **deux coups de plus**, tout de suite (coups bruts) | changeur de règle | — | Fanchon (2e) | Fanchon 44,4 |

Maîtrises : Fureur 2, Sang 3, Rempart 3, Poison 2, Chance 3, Lumière 2, Ombre 2, Magie 3 (`validateMasteries` en demande deux). En gras : refaite ou nouvelle.

### 3.2 Le spectacle (A10)

L'écran ne fait que rejouer ; ces moments sont des étapes du moteur qui existent déjà ou demandent un rendu ([MISE_EN_SCENE.md](MISE_EN_SCENE.md), [SONS.md](SONS.md) : le son se déduit de l'effet) :
- **Ciel d'orage** : à deux éclairs, la scène `lightning` (l'arène s'assombrit, comme la Foudre) ; le badge de l'aura dit le cran.
- **Ballade** : quatre notes s'allument sous Fanchon ; le refrain est un enchaînement de quatre impacts (le rythme des quatre éclairs de la Foudre).
- **Brasier** : la Brûlure de l'adversaire grossit d'un cran à chaque tour (`emberRain` à 3 et plus).
- **Visée** : le multiplicateur s'affiche sur Elaria (×2,2, ×2,7, ×3,2…) et part en un seul chiffre d'or sur l'Œil de faucon.
- **Jugement** : trois fautes sur l'attaquant, puis la Peur (son tremblement existe déjà).
- **Bastion** : l'armure qui éclate (la scène `shockwave` ou son équivalent réduit).

Rien de tout ceci n'a été vu ni entendu : ce sont des pistes de mise en scène.

## 4. Les 16 auras qui sortent

Règle de sortie : une consommatrice devient une **compétence à charges** (« ses N prochains X »), comme la Flamme votive, gravable dans sa réserve ; un bonus de règle devient une **relique** ; un doublon ou un bonus plat est retiré.

| Aura | Devient | Pourquoi |
| --- | --- | --- |
| Aura sauvage | retirée | doublon de l'Aura de puissance |
| Aura de précision | retirée | son multiplicateur passe dans la Visée ; le Contrepoids de plomb le garde en relique |
| Sangsue | compétence : « ses 3 prochains coups qui touchent lui rendent 1 PV par Saignement de l'adversaire » | consommatrice du Saignement, dans la réserve du Sang |
| Aura d'intimidation | retirée | bonus plat ; la Cotte du mercenaire fait la même chose |
| Rempart hérissé | remplacée par le Bastion | même déclencheur (l'armure vidée) ; le Bastion frappe au lieu de poser des Épines |
| Dette de sang | retirée | la Riposte entière renforce les renvois à la source (le ressenti d'Aldric : « renvois souvent faibles ») |
| Sève noire | retirée | aucun porteur du Poison ne se soigne (45,7 % chez Ervald) |
| Peau de crapaud | compétence : « ses 3 prochains coups reçus : Poison 2 à l'attaquant » | la réserve du Poison en manque ; doublon des Épines en aura |
| Pas de côté | retirée | bonus plat ; les Bottes de feutre font la même chose |
| Sentence | compétence : « ses 3 prochains soins : l'adversaire perd 4 PV » | consommatrice des soins (Sainteté montante) |
| Bouclier de foi | compétence : « ses 3 prochains soins : +3 armure temporaire » | idem |
| Aura d'immunité | relique, à mesurer (« aucun malus ne peut lui être posé pendant ses 3 premiers tours ») | une règle de défense, pas un moteur de build |
| Aura de pourriture | retirée | doublon de l'Effroi (même déclencheur) |
| Emprise | relique : « +1 dégât par malus de l'adversaire » | de la famille du Croc de boucher et de la Fiole de venin |
| Champ d'orage | retirée | doublon des Épines, en foudre |
| Surtension | relique : « +1 à chacun de ses éclairs » | la direction Foudre de Thaldrin la garde, hors aura |

Les compétences à charges et les reliques sont des formes proposées, **non mesurées gravées** (seule la paire Sentence et Bouclier de foi l'a été, dans la direction d'Ysolde, § 5).

## 5. Par personnage : la boucle de départ et ses deux directions

**Direction** : l'aura, sa face 2 et deux briques de sa réserve gravées sur le 3 et le 4, contre le roster d'aujourd'hui (non construit : d'où des taux de 65 à 83 %) ; l'avant : son dé d'aujourd'hui avec les mêmes gravures (série 110). C'est un indicateur de synergie, pas une campagne : la montée par la forge et les reliques (`npm run ramp`, `npm run campaign`) demande le registre.

| Personnage | Direction (aura + deux gravures) | Avant → après (série 110) |
| --- | --- | --- |
| Gorak | Ivresse du sang + Pourfendre, Curée | 65,9 → 65,9 (aura inchangée) |
| Gorak | Élan + Assaut, Soliste | 72,4 → 77,3 (+4,9 ± 1,2) |
| Elaria | la Visée + Esquive améliorée, Coup de chance | 78,1 → 79,2 (+1,1 ± 1,4) |
| Elaria | Plaie ouverte (critique) + Odeur du sang, Curée | 48,1 → 65,9 (+17,9 ± 1,9 : sans producteur, ces deux briques ne font rien sur son dé d'aujourd'hui) |
| Brokk | Épines montantes + Curée, Odeur du sang | 78,9 → 80,8 (+1,9 ± 0,6) |
| Brokk | Bastion + Onde de choc, Riposte entière | 80,0 → 78,3 (−1,7 ± 1,1) |
| Ervald | Aura de poison montante + Virulence, Morsure | 74,3 → 75,9 (+1,6 ± 0,5) |
| Ervald | Effroi + Peur, Confiscation | 69,4 → 73,0 (+3,6 ± 1,6) |
| Ysolde | Sainteté montante + Sentence et Bouclier de foi à charges | 81,8 → 83,0 (+1,1 ± 0,4) |
| Ysolde | Jugement + Prière, Éclair aveuglant | 76,5 → 79,4 (+2,8 ± 1,3) |
| Naraxes | Décoction montante + Morsure, Virulence | 68,7 → 72,2 (+3,5 ± 0,7) |
| Naraxes | Dé pipé + Pièce porte-bonheur, Pièce maudite | 64,8 → 68,4 (+3,6 ± 1,4) |
| Aldric | Vindicte / Riposte entière + Rétribution, Onde de choc | 77,8 → 80,1 (+2,3 ± 1,2) |
| Aldric | Larcin / Riposte entière + Confiscation, Peur | 70,4 → 75,1 (+4,6 ± 1,5) |
| Morgrut | Puissance qui monte / Assaut + Soliste, Brise-garde | 81,4 → 81,4 (0,0 ± 0,4) |
| Morgrut | Rancœur / Assaut + Soliste, Brise-garde | 81,4 → 82,6 (+1,2 ± 0,7) |
| Thaldrin | Ciel d'orage montant + Foudre, Surtension | 72,1 → 75,2 (+3,1 ± 0,6) |
| Thaldrin | Brasier + Attiser, Embrasement | 72,1 → 73,1 (+0,9 ± 1,0) |
| Fanchon | Ballade / Duo brut, attaque 5 à 6 + Coup de chance, Foudre | 70,0 → 72,7 (+2,7 ± 1,3) |
| Fanchon | Veine / Duo brut + Coup de chance, Foudre | 70,0 → 70,0 (0,0 ± 1,6) |

**Lecture** : aucune direction ne perd plus de 2 points sur celle d'aujourd'hui, et la plupart gagnent 1 à 5 : chaque aura nourrit ses briques. Le saut de la Saignée d'Elaria (+17,9) dit ce que le producteur d'abord protège : sans la Plaie ouverte, l'Odeur du sang et la Curée sont mortes chez elle. Le Duo brut de Fanchon, qui ne relance plus ses faces gravées, garde sa direction (+2,7, avec l'attaque 5 à 6) ; sa copie, non mesurée, ne multiplie plus rien.

### 5.1 Elaria : la Visée, le gros coup préparé

**Ressenti** : 4 défaites précoces ; sa version d'avant (esquive → critique → multiplicateur, un énorme coup préparé) était plus forte mais bien plus drôle, avec de la tension. **Cause** : le Critique assuré à une charge (B8) a éteint l'empilement, l'Aura de précision a quitté son dé, l'Esquive améliorée ne se cumule plus. La tension venait d'un chiffre qui grossit en attendant le coup.

**Proposition** : la **Feinte devient la Visée** (§ 3.1) ; l'Œil de faucon (face 2) est le tir. Chaque esquive et chaque coup qui touche ajoutent +0,5 au multiplicateur de son prochain critique ; un critique (le sien, ou l'Œil de faucon) lâche tout. Variantes (série 101, 105 ; avant : la Feinte, 48,1 %) :

| Visée | Départ |
| --- | --- |
| +1 par esquive seulement | 45,9 (−2,2) |
| **+0,5 par esquive et par coup qui touche** | **52,5 (+4,4)** ; pour tous (W5) 49,0 |
| +1 par esquive, +0,25 par coup | 52,1 (+4,0) |
| +1 par esquive, +0,5 par coup | 56,2 (+8,1) |
| critique assuré (la Feinte d'aujourd'hui) et +1 par esquive | 61,9 (+13,9), trop |

**Seconde direction, la Saignée** : la **Plaie ouverte au critique** (Saignement 4 par critique, 54,2 % au départ ; 3 : 48,1). Avec l'Odeur du sang (critique s'il saigne), le critique fait saigner, et le saignement fait critiquer. L'Ivresse du sang, aujourd'hui l'un de ses départs (63,3 %), sort de sa liste : avec l'Œil de faucon, elle double ses coups à chaque 2 ; à un coup par critique elle tombe à 51,4, mais Gorak, son porteur de défaut, passe alors de 48,8 à 40,2.

### 5.2 Brokk : le mur qui saigne ou le mur qui éclate

**Ressenti** : ennuyeux, faible en début de partie, peu de synergies. Contre le roster, son départ n'est pas faible (52,2 %) : sa faiblesse précoce en campagne relève d'A13 (les premiers adversaires), que mesure Investigate28.

**Proposition** : deux boucles lisibles. **Épines montantes** (Saignement 1 puis 2 par coup reçu) → Curée, Odeur du sang, Sangsue : il encaisse, l'adversaire saigne, Brokk frappe la plaie. **Bastion** (53,6 % au départ, +1,3) avec sa **Peau de pierre** (face 2) : l'armure éclate, l'attaquant perd 3 PV, il regagne 2 d'armure ; puis Onde de choc et Riposte. Le Bastion à 4 dégâts sans réarmure tombe à 36,3 % : c'est la réarmure qui fait tourner la boucle. Le Rempart hérissé du registre (53,9 %) disparaît au profit du Bastion (même déclencheur, un effet qui se voit).

### 5.3 Ervald : garder ce qui marche

**Ressenti** : mou au début, jouissif une fois construit ; l'Ombre (Peur, vol) super marrante. **Proposition** : l'**Aura de poison montante** (1, 2, 3 Poison par tour : 53,1 % au départ, +7,0) lui donne un début moins mou et un Poison qui se lit ; l'**Effroi** reste sa seconde aura (55,7 % au départ ; 51,4 pour tous), avec Peur et Confiscation dans sa réserve. Le Larcin va à Aldric (chez Ervald 48,6 %). Rien d'autre ne change (Vol de vie sur le 2).

### 5.4 Ysolde : la régénération, la Dissipation, la Peur

**Ressenti** : faible aux premiers combats ; ses auras au choix plates, toutes pareilles ; sa version d'avant (régénération dans la durée, Dissipation, Peur) plus intéressante. **Proposition** : deux auras qui ne se ressemblent pas.
- **La Sainteté montante** (+1 puis +2 PV par tour) : la durée. À 2 cumulable, elle valait 66,4 % ; à 3, 78,6 ; montante à 2, elle reste dans la bande (W5 : 47,2 %), montante à 3, 53,6 dans le monde W3. Sa réserve consomme ses soins (Sentence et Bouclier de foi en compétences à charges, § 4).
- **Le Jugement** : la Peur revient, par les fautes de l'adversaire (54,6 % au départ, +5,0 ; à la 4e faute, 45,4). Il punit qui frappe souvent : au départ, son duel le plus déséquilibré est contre Fanchon et son Duo d'aujourd'hui (69,8 % pour Ysolde) ; dans W5, contre Gorak (62,3 % pour Ysolde). La Purification (la Dissipation, son son) reste sa face 2. La Peur sur chaque Purification, essayée d'abord, ne vaut pas l'aura qu'elle remplace (44,6 %).

### 5.5 Thaldrin : une orientation lisible

**Ressenti** : auras nulles, presque toutes pareilles, aucune orientation ; plein de petits dégâts dans tous les sens. **Proposition** : deux auras de Magie, une par élément, chacune avec son tour de force ; le Poison quitte ses auras (il reste dans sa réserve, Q11).
- **Ciel d'orage montant** (1, 1, 2, 2 éclairs) → Foudre, Surtension (relique) : l'orage monte. Montant à 3 : 62,1 % ; à 4 : 64,9 ; lent à 2 : 55,4 ; pour tous 52,4.
- **Brasier** → Feux follets (sa face 2), Attiser, Embrasement : le feu ne s'éteint plus. Le Brasier qui n'attise qu'une Brûlure déjà là ne vit que de ses Feux follets (41,1 %) ; celui qui l'allume aussi tient (47,8 % au départ, 44,5 pour tous).
- Écran : son aura doit rester sur le 1 en forme d'ours (signalé par l'utilisateur : UiFixes28).

### 5.6 Aldric : la Riposte sur le 2, des renvois forts

**Ressenti** : premiers combats difficiles ; la Riposte devrait remplacer la Rétribution sur son 2 ; renvois souvent faibles ; Vindicte et Riposte combottent bien. **Proposition** : **Riposte sur le 2, entière** (elle renvoie tout le coup reçu, la moitié aujourd'hui) ; la Rétribution passe dans sa réserve. Mesures (avant : Vindicte / Rétribution, 51,7 %) :

| Dé d'Aldric | Départ |
| --- | --- |
| Vindicte / Riposte (le registre) | 50,2 (−1,5) |
| Vindicte (renvois entiers, +4 Ferveur) / Riposte entière | 53,7 (+2,0) |
| Vindicte (+3 par renvoi, +4 Ferveur) / Riposte | 49,9 (−1,8) |
| **Vindicte du registre / Riposte entière**, dans le monde W4 | **54,6** (+3,9 sur la ligne d'avant) ; W5 54,6 |
| Larcin / Riposte entière, dans W5 | 52,9 |

La Riposte entière est une valeur de compétence, pour tous : gravée chez Brokk, elle vaut **+6,4** de plus que la Riposte du registre, chez Morgrut **+5,5** (au haut de la bande d'une gravure, à surveiller ; Q6).

### 5.7 Morgrut : un gros tas, de plus gros coups

**Ressenti** : moins évolué, plus gros coups ; le Crescendo ne va pas du tout dans son lore ; il est allé le plus loin. **Proposition** : **l'Assaut sur le 2** (ce coup ×2 : il tape, plus fort) à la place du Crescendo, qui retourne dans la réserve de la Fureur ; l'**Aura de puissance qui monte** (+2, puis +1 par gros coup, jusqu'à +6) : chaque Assaut, Soliste ou Brise-garde le rend plus lourd, sans rien à gérer. Mesures (avant : Puissance / Crescendo, 55,3 %) : Puissance / Assaut 53,0 ; Puissance / Coup de massue (étourdit une fois) 50,2 ; **Puissance qui monte / Assaut 54,8** ; pour tous 51,0. Seconde aura : la **Rancœur à +3** (il s'énerve si on le frappe), 51,9 dans W5 ; à +2, 41,9.

### 5.8 Fanchon : le Duo sans boule de neige (A11)

**Ressenti** : marrante, frappe souvent plusieurs fois ; l'effet boule de neige trop fort (9 dés) ; seule fin de campagne réussie. **Cause** : un dé du Duo qui retombe sur le 2 relance un Duo. La boucle vaut à elle seule ~16 points : sans elle (la règle A7, « un dé de plus ne redonne pas de dé de plus »), son départ passe de 46,9 à **31,0 %**.

| Duo (départ de Fanchon, avant : le Duo d'aujourd'hui, 46,9 %) | Départ |
| --- | --- |
| un dé de plus | 15,0 |
| deux dés de plus | 34,0 |
| trois dés, sans relance (A7) | 31,0 |
| deux coups bruts, tout de suite | 26,1 |
| trois coups bruts, tout de suite | 37,9 |
| deux dés à ses 3 (4) prochaines actions, sans relance | 24,4 (31,1) |
| sans relance, attaque 5 à 6 ; 52 PV | 39,2 ; 41,6 |
| trois coups bruts et la Ballade (1 PV, refrain) | 43,3 |
| **trois coups bruts, Ballade (1 PV, refrain), attaque 5 à 6** | **48,4** (W4) ; **48,1** pour tous (W5) |
| idem, quatre coups bruts (au lieu de l'attaque) | 50,8 (W3) |

**Proposition** : « **Duo : trois coups de plus, tout de suite** ». Des coups bruts (le « dé rouge » d'[AURAS.md](AURAS.md) § 5.2) : leurs faces ne déclenchent aucune compétence. Plus de boucle, ni par le Duo, ni par les faces gravées ou copiées qu'un jet complet relancerait ; elle frappe toujours quatre fois sur un 2. Compensation : l'**attaque 4 à 6 → 5 à 6** (une stat secondaire, les PV intacts). La construite (Duo copié, faces gravées) n'est pas mesurée : elle demande le registre (`npm run ramp`) ; la forme brute retire par nature la multiplication des faces gravées qui la mettait à 62,6 % à dix récompenses. Nom : « Duo » reste (deux voix, quatre coups) ; Q8.

### 5.9 Naraxes : la famille des pièces, et A14

**Ressenti** : pas mal en chance et pièces ; il voulait plusieurs compétences qui lancent une pièce (pile : un coup, un gros malus, de l'armure…), pas des pièces en reliques ; la relique +25 % de pile présentée comme un porte-bonheur. **Proposition** : sept pièces, une nature chacune, dans la réserve de la Chance ; gravées sur le 3 de Naraxes (Dé pipé / Pile ou face ; avant : 47,3 %, série 102) :

| Pièce | Pile | Gravée |
| --- | --- | --- |
| Pile ou face (face 2) | ce coup ×3 | — |
| Pièce porte-bonheur | critique assuré, +4 | +10,9 |
| Pièce maudite | l'adversaire perd sa prochaine action | +11,9 |
| Pièce vert-de-gris | 5 Poison | +13,8 |
| **Pièce de bouclier** (nouvelle) | +8 armure temporaire | +10,4 |
| **Pièce de la rafale** (nouvelle) | deux coups bruts | +15,8 |
| **Pièce ensorcelée** (nouvelle) | −3 à ses coups, 2 tours | +4,9 (sous la bande : −4, 3 tours à essayer) |

Les reliques de pièce changent de nature : la Pièce lestée (+25 % de pile) devient un **porte-bonheur** (un trèfle, un fer à cheval : nom et icône à choisir avec l'utilisateur ; textes chez UiFixes28), la Pièce trouée de même. Le bug signalé (Dé pipé et relique, toujours face) relève d'Investigate28 ; à noter : la chance de pile plafonne à 5 sur 6 (`HEADS_CAP`), jamais 100 %.

**A14 : une pièce critique ?** Deux règles mesurées (série 102) :
- (a) « un coup critique fait pile » : +1,2 (Pièce maudite), +1,5 (vert-de-gris) ;
- (b) « **pile critique** : une pièce lancée par un coup critique double son effet » : **+2,6** (vert-de-gris : 10 Poison).

**Recommandée : (b)**. Elle se lit (« pile critique ! », le chiffre double), relie la Chance au critique (le Dé pipé donne +5 % de critique) et pèse peu. Pile ou face n'en a pas besoin : pile multiplie déjà un coup critique (×2 puis ×3). Une Peur ne se double pas : pour la Pièce maudite, pile critique veut dire deux actions perdues, à décider (Q10).

### 5.10 Gorak

Pas de ressenti dans ce retour : Ivresse du sang et Élan, inchangés. Il perd un peu dans le monde proposé (48,8 → 45,7 %), et son Élan, à 41,9 %, est au bord bas (Q12).

## 6. La refonte pour tous

Chaque monde : chaque personnage et tous ses adversaires passent au dé proposé (règle pour tous, `everyone`). Séries 104, 107, 108, 109.

| Monde | Roster | Écart-type | Pire duel | Tours |
| --- | --- | --- | --- | --- |
| 0.127.0 | 46,1 – 55,3 % | 2,6 pts | — | 13,7 |
| W1 : la structure (une aura, ses faces 2, Duo sans relance), valeurs d'aujourd'hui | 32,8 – 58,9 % | 6,7 | 75,8 % | 13,6 |
| W2 : W1 et les « 1 » à 2, sans cumul | 28,6 – 64,2 % | 9,3 | 85,3 % | 13,1 |
| W3 : les valeurs réglées (montées, Visée, Plaie au critique, Duo brut) | 40,4 – 53,8 % | 3,9 | 71,0 % | 13,3 |
| W4 : W3 et Fanchon à l'attaque 5 à 6 | 45,9 – 53,0 % | 2,2 | 61,0 % | 13,2 |
| **W5 : la proposition finale** (W4, Riposte entière, Rancœur 3, Veine à deux coups) | **45,7 – 54,6 %** | **2,7** | **61,8 %** | **13,2** |

**W5, par personnage** (avant → après, première aura ; seconde aura dans ce monde) : Gorak 48,8 → 45,7 (Élan 41,9) ; Elaria 48,1 → 49,0 (Plaie ouverte 50,8) ; Brokk 52,2 → 51,4 (Bastion 48,4) ; Ervald 46,1 → 48,1 (Effroi 51,4) ; Ysolde 49,6 → 47,2 (Jugement 49,2) ; Naraxes 49,6 → 52,6 (Dé pipé 44,7) ; Aldric 51,7 → 54,6 (Larcin 52,9) ; Morgrut 55,3 → 51,0 (Rancœur 51,9) ; Thaldrin 51,6 → 52,4 (Brasier 44,5) ; Fanchon 46,9 → 48,1 (Veine 44,4). Retours (combats gagnés après être passé sous 30 % de ses PV) : Fanchon 37,5 → 48,9 % (sans boule de neige, on revient contre elle), Aldric 56,5 → 49,5 %, les autres de −3,2 (Elaria) à +0,7 point.

**Le coût** : les combats raccourcissent d'un demi-tour (13,7 → 13,2), à l'opposé de l'étude de la longueur des combats (B16) ; les montées et la Riposte entière frappent plus tôt et plus fort.

## 7. Ce qui n'est pas mesuré

- La montée par la forge et les reliques (`npm run ramp`), la campagne (`npm run campaign`), la saison : les auras d'essai ne sont pas au registre, l'offre ne les connaît pas.
- Les compétences à charges (Sangsue, Peau de crapaud, Sentence, Bouclier de foi) et les reliques (Immunité, Emprise, Surtension) gravées ou portées seules.
- La Pièce ensorcelée à −4 sur 3 tours ; la pile critique sur Pile ou face et la Pièce porte-bonheur.
- La règle A7 exacte : le laboratoire l'émule par un verrou (le Duo ne repart pas avant la fin de sa rafale), un peu plus dur que la règle (qui laisse le dé principal relancer un Duo).
- Les deux auras de chaque personnage ne sont mesurées qu'au départ et dans deux directions : les autres builds de sa réserve, non.
- Rien n'a été vu à l'écran ni entendu (§ 3.2).
- Vu en passant, sur la 0.127.0 figée : l'audit signale « Furie : charge réactive mal reportée » 16 fois sur 7 200 combats, chez Gorak avec Pourfendre et Curée gravés (Furie des vents et Curée dans la même action ; série 110). Hors du sujet de la refonte : à vérifier sur le moteur du jour.

## 8. Questions à l'utilisateur

Chacune a un choix par défaut, celui que suit le plan (§ 9).

1. **Deux auras par personnage, nommées sur sa fiche** (comme sa signature) ? Défaut : **oui**. Variante : la règle d'aujourd'hui (toutes les auras de ses maîtrises servies par son dé), avec le jeu réduit, donne 3 à 5 choix, dont des doublons de rôle.
2. **La montée** (1, 1, 2, 2, puis 3) pour les auras à ressource, à la place des « 1 » ? Défaut : **oui**. Variante : « 2, un déclenchement sur deux » (même force, chiffre fixe, rien qui monte).
3. **Le 1 du dé, une fois l'aura posée** : il lui ajoute une charge (un demi-cran), comme mesuré ? Défaut : **oui**. Variante : un cran entier (non mesuré).
4. **Les 16 sorties** (§ 4), dont 4 compétences à charges et 3 reliques ? Défaut : **oui**.
5. **Elaria : la Visée** (+0,5 par esquive et par coup qui touche, sans critique assuré) ? Défaut : **oui**. Variante : +1 par esquive, +0,25 par coup (52,1 %).
6. **Aldric : la Riposte sur le 2, entière**, pour tous ses porteurs (gravée +6,4 chez Brokk, +5,5 chez Morgrut) ? Défaut : **oui**. Variante : entière seulement avec la Vindicte (« ses renvois sont entiers »), 53,7 %.
7. **Morgrut : l'Assaut sur le 2**, le Crescendo dans la réserve de la Fureur ? Défaut : **oui**. Variante : le Coup de massue (50,2 %, il étourdit une fois).
8. **Fanchon : « Duo : trois coups de plus, tout de suite »**, attaque 5 à 6 ? Défaut : **oui**, le nom Duo gardé. Variantes : quatre coups bruts sans toucher à l'attaque (50,8 % dans W3) ; le Duo à dés complets sans relance (A7) et 52 PV (41,6 %).
9. **Ysolde : le Jugement** (trois fautes, la Peur) ? Défaut : **oui, à la 3e faute**. Variante : à la 4e (45,4 %).
10. **A14 : la pile critique** (une pièce lancée par un critique double son effet) ? Défaut : **oui**, sauf la Pièce maudite (une Peur ne se double pas). Variante : « un critique fait pile ».
11. **Thaldrin : ses deux auras en Magie** (Ciel d'orage, Brasier), le Poison seulement dans sa réserve ? Défaut : **oui**. Faut-il aussi que l'offre suive l'aura choisie (une offre orientée, chantier de ForgeRework) ? Défaut : non, à reprendre après la refonte.
12. **Gorak : l'Élan à 41,9 %** dans le monde proposé (marge ± 1,5) ? Défaut : le laisser et remesurer au `npm run balance` ; levier si besoin : +4 Ferveur par gros coup (au lieu de +3).
13. **Naraxes : trois pièces nouvelles** (bouclier, rafale, ensorcelée) ? Défaut : **oui** ; la Pièce ensorcelée remesurée à −4 sur 3 tours.
14. **Les reliques de pièce en porte-bonheur** (nom et icône) : quel objet ? Défaut : un trèfle à quatre feuilles pour la Pièce lestée, un fer à cheval pour la Pièce trouée (icônes à peindre : à demander).

## 9. Plan d'implémentation, par tranches

Chaque tranche se livre avec ses tests (`combat.test.ts`, son contrôle dans `audit.test.ts` pour une mécanique nouvelle), son entrée de journal et sa mesure ; l'empreinte de `balance.test.ts` bouge (changement voulu, noté au CHANGELOG).

1. **Registre et fiches** : `CharacterDef.auras: [string, string]` à la place de `startAuras` dérivées ; `validateRoster` (deux auras, de ses maîtrises, servies par son dé) ; migrations : une partie, un tournoi ou une saison partis d'une aura sortie repartent de la première aura (comme en B1) ; compendium (la règle courte des auras, la liste par maîtrise). Docs : [MAITRISES.md](MAITRISES.md) § B5, [PERSONNAGES.md](PERSONNAGES.md).
2. **La montée**, un mécanisme commun : un champ de statut (`rises: { every: 2, cap }`, le cran lu par l'effet, le 1 qui ajoute une charge), puis les cinq auras montantes (Épines, Aura de poison, Décoction, Sainteté, Ciel d'orage). Docs : [STATUTS.md](STATUTS.md), [RESOLUTION.md](RESOLUTION.md) (le moment du cran).
3. **Les auras refaites et nouvelles** : la Visée (un statut qui s'accumule et part avec le critique), la Plaie ouverte au critique, le Bastion, le Jugement (la faute, un malus à seuil), le Brasier, la Ballade et son refrain (une note à seuil), la Veine en coups bruts, l'Aura de puissance qui monte au gros coup, la Rancœur à 3.
4. **Les faces 2** : Aldric (Riposte entière, Rétribution en réserve), Morgrut (Assaut, Crescendo en réserve), Fanchon (Duo en trois coups bruts, attaque 5 à 6), en accord avec la règle A7 d'EngineFixes28.
5. **Les sorties** (§ 4) : quatre compétences à charges, trois reliques, neuf retraits ; offres (`offers.ts`) et héritages ; mesures gravées (`scripts/skills.report.ts`) et reliques (`npm run relics`).
6. **Naraxes et A14** : trois pièces, la pile critique (une règle du moteur sur `coinToss`), les reliques de pièce en porte-bonheur (noms, icônes).
7. **La mise en scène et le son** (§ 3.2) : [MISE_EN_SCENE.md](MISE_EN_SCENE.md) et [SONS.md](SONS.md) d'abord ; une capture par écran touché.
8. **La mesure d'ensemble** : `npm run balance`, `npm run ramp`, `npm run campaign`, `npm run season` ; les leviers signalés (Élan de Gorak, Riposte gravée, Pièce ensorcelée).

## 10. Outil et rapports

`scripts/lab/aura-vision.ts` (séries 100 à 110, statuts d'essai `labV…`), branché dans `scripts/lab/ideas.ts`. Pour rejouer sur la même base : `git archive d68472b | tar -x -C <dossier>`, y lier `node_modules`, y copier les deux fichiers, puis `LAB_SERIES=<n> LAB_N=400 npx vitest run --config vitest.balance.config.ts scripts/lab.report.ts --silent=false`. Rapports (`logs/lab/`, horodatés en temps universel) : série 100 `2026-10-28-14-05-30`, 101 `…14-04-21`, 102 `…14-05-36`, 103 `…14-06-37`, 104 `…14-07-37`, 105 `…14-04-16`, 106 `…14-10-57`, 107 `…14-14-38`, 108 `…14-16-36`, 109 `…14-18-12`, 110 `…14-21-50`.
