# La profondeur de l'offre au cours d'une partie (étude du 2026-10-30)

_Décisions D2 et D25 du registre [RETOUR_30.md](../RETOUR_30.md) (R22, R53), avec D27 (R55). Agent Offre, sur la 0.132.0 (branche `regles-v2`). Sources : [CONTENU_RETOUR_30.md](CONTENU_RETOUR_30.md) § 1.1 et § 1.3, le rapport Parite (`local://r30-Parite.md` § 3, option O1), `src/game/offers.ts`, [CAMPAGNE.md](../CAMPAGNE.md)._

**Étude seulement : rien n'a changé dans `src/`.** Les options sont réécrites dans un script jetable (supprimé), qui reprend le tirage de `drawReward` ; sans option, il redonne les mêmes mesures que `drawReward` (ligne « contrôle » du § 2).

## 0. En bref

- **La demande.** L'utilisateur ne veut pas de « redite interdite » stricte : une carte refusée peut revenir, on peut hésiter puis la vouloir plus tard. Il veut **voir plus de profondeur dans l'offre au cours de la partie**.
- **Aujourd'hui** (300 parties par départ, 20 départs) :
  - une partie montre **13,0 reliques différentes** sur les 28 à 33 qu'elle pourrait offrir (42 %) ; **17,8 ne sont jamais montrées** ;
  - elle montre **6,6 compétences à graver** sur 9 à 14 (61 %) ; **4,4 ne sont jamais montrées** ;
  - 0,9 carte de relique par partie revient d'une offre à la suivante, et 3,9 % des Graver reproposent la même paire.
- **Recommandation : la fraîcheur, les paliers en poids et deux offres élargies (option ACsD).** Trois règles, une pour tous :
  1. **la fraîcheur** : une carte jamais montrée dans la partie pèse ×3. Une carte déjà vue ou refusée garde son poids normal : elle revient, mais plus rarement ;
  2. **les paliers D27 en poids**, pas en murs ;
  3. **une carte de plus** à la 2e et à la 4e offre de chaque sorte : 4 reliques au lieu de 3, et 3 compétences au lieu de 2 dans Graver.
- **Ce que donne la recommandation (ACsD) :**
  - reliques vues : 13,0 → **15,8** (42 → 51 % de la réserve) ;
  - compétences vues : 6,6 → **8,5** (61 → 78 %) ;
  - compétences jamais vues : 4,4 → **2,5** ;
  - paire de Graver redite : 3,9 → **0 %** ;
  - reliques revues d'une offre à la suivante : 0,90 → 0,55 ;
  - première relique maîtresse : 2,6e → **3,3e** relique (D27).
- **Les combos ne bougent pas.** Les offres qui ont au moins une carte en écho passent de 68 à 67 %. Les liens d'un build construit en suivant l'écho passent de 12,4 à 12,7.
- **La force des builds bouge peu.** Elle passe de 50,3 à 48,9 % (−1,4 ± 1,1). L'écart vient presque tout de Naraxes (−3,7) et de Fanchon (−4,9) : leur relique maîtresse arrive moins souvent tôt (Coccinelle d'émail chez Naraxes Décoction : prise dans 37 → 23 % des parties). La référence de la campagne suit la même offre, donc la difficulté se recale d'elle-même.
- **Sans toucher à l'écran : la fraîcheur et les paliers en poids (option ACs).** Reliques vues 13,0 → 14,2, compétences vues 6,6 → 7,6, paire redite 3,9 → 1,0 %, force 49,2 % (dans le bruit).
- **Ce qui relève du contenu, et qu'aucun poids ne règle** (§ 6) :
  - **le Rempart** : 4 compétences à graver chez Brokk et Aldric. Même avec l'offre recommandée, sa carte de Graver est une carte déjà vue 34 % du temps (35 % aujourd'hui) ;
  - **la Lumière** chez Ysolde Jugement : 3 cartes au départ ;
  - **les consommatrices verrouillées** du Sang, du Poison et de la Magie : 3 cartes sur 6 au départ chez la moitié des départs ;
  - **quatre reliques maîtresses** offertes dans moins de 10 % des parties partout : Soufflet de forge, Gantelet du talion, Croc de boucher, Fiole de venin ;
  - **les reliques communes à deux parties** (5,4 → 7,9) : elles montent avec ce qu'on voit, parce que la réserve ne fait qu'une trentaine de reliques. Seules des reliques de plus les font baisser (D26).

## 1. Méthode

### 1.1 Les échantillons

- **Script** : `scripts/offre.report.ts`, jetable et supprimé. Configuration `vitest.balance.config.ts`.
- **Départs** : les 10 personnages × leurs 2 auras.
- **Parties** : **300 parties par départ et par option**, le calendrier `REWARDS` complet, soit 5 forges et 5 reliques. Les graines (`offre:<id>:<aura>:<n>`) sont les mêmes pour toutes les options.
- **Deux choix automatiques** :
  - **au hasard** : celui du champion de référence et des participants de saison (`autoPick`, `autoForge`) ;
  - **en suivant l'écho** : la relique au plus grand écho, Graver vers la compétence au plus grand écho dès qu'elle en a un. C'est un joueur qui cherche les combos.

### 1.2 Les mesures de profondeur

Toutes se lisent par partie, puis en moyenne par départ.

| Mesure | Définition |
| --- | --- |
| Reliques vues | Reliques différentes montrées par les 5 offres de relique. |
| Part de la réserve | Reliques vues ÷ reliques offrables au cours de la partie : l'union de `offerableRelics` sur les 5 offres, moins celles déjà portées. |
| Jamais vues | Offrables au cours de la partie, jamais montrées. |
| Rares | Reliques offrables d'un départ montrées dans moins de 10 % de ses parties. |
| Redites | Cartes d'une offre de relique déjà montrées à l'offre précédente. |
| Communes | Reliques vues à la fois dans deux parties successives du même départ. |
| Jaccard des builds | Briques communes (reliques prises, compétences gravées) ÷ briques réunies, entre deux parties successives du même départ. |
| Compétences vues, jamais vues | Les mêmes mesures pour les compétences montrées par Graver. La réserve est la part offrable de `characterPool`, sans les auras. |
| Paire de Graver redite | Graver qui repropose exactement les compétences du Graver précédent. |
| Carte déjà vue, par maîtrise | Part des cartes de Graver d'une maîtrise déjà montrées plus tôt dans la partie. C'est l'impression de « toujours les mêmes ». |
| 1re forte, 1re maîtresse | Rang de la première offre de relique (1 à 5, 6 si jamais) qui montre une relique du palier II, puis du palier III (paliers de [CONTENU_RETOUR_30.md](CONTENU_RETOUR_30.md) § 1.3). La 1re maîtresse ne compte que les parties où une maîtresse est offrable. |

### 1.3 Les mesures des combos

| Mesure | Définition |
| --- | --- |
| Cartes en écho | Part des cartes montrées (reliques, compétences de Graver) dont l'écho avec le build est d'au moins 1 (`echoOf`). |
| Offres avec écho | Part des offres qui montrent au moins une carte en écho. |
| Liens du build | Paires de briques qui se nourrissent dans le build final (`buildLinks`). |

### 1.4 La force des builds

- **Les builds** : 40 builds finaux par départ et par option, de graines à part.
- **Les adversaires** : chaque build affronte un **panneau de 36 builds d'aujourd'hui**, 4 builds complets de chacun des 9 autres personnages, tirés par l'offre actuelle avec leurs auras en alternance.
- **Les combats** : 8 combats par adversaire, aux graines de `npm run balance`, soit **11 520 combats par départ**.
- **Les marges** :
  - moyenne d'une option : **± 0,8 point** ;
  - écart entre deux options : **± 1,1 point** (les builds ne sont pas appariés) ;
  - un personnage, ses deux auras réunies : **± 2,3 points**, et ± 3,3 pour un écart.
- **Pourquoi pas contre le roster nu** : un build complet y gagne 99,7 % de ses combats, et la mesure ne distingue plus rien.

## 2. Les options mesurées

| Clé | Option | Règle (une pour tous ; même voie en campagne, en saison et dans l'arbre) |
| --- | --- | --- |
| O0 | Actuel | `drawReward` : la première carte au poids de son écho (1 + 2 × écho), les autres à parts égales. Graver : une compétence par maîtrise, au poids de l'écho. |
| R0 | Contrôle | O0 réécrit dans le script. Il redonne O0 à l'aléa près : 13,0 reliques et 6,6 compétences vues. |
| O1 | Pas de redite stricte (D2, la proposition écartée) | Une carte montrée et non prise ne revient pas à l'offre suivante de même sorte, sauf s'il ne reste rien d'autre. |
| A | **Fraîcheur ×3** | Une carte jamais montrée dans la partie pèse ×3, sur toutes les cartes et sur l'écho. Une carte déjà vue garde son poids, jamais 0. |
| A5 | Fraîcheur ×5 | La même, plus forte. |
| B | Refusée ×½ | Chaque refus divise son poids par 2, avec un plancher à ¼. Jamais 0. |
| AB | Fraîcheur ×2 et refusée ×½ | Les deux. |
| C | Paliers D27 en murs | Palier II ×½ tant qu'il a moins de 2 reliques ; palier III **×0** tant qu'il en a moins de 3, puis ×2 ([CONTENU_RETOUR_30.md](CONTENU_RETOUR_30.md) § 1.3, variante a). |
| Cs | **Paliers D27 en poids** | La même, mais le palier III à **×¼** au lieu de 0 : une maîtresse peut sortir tôt, rarement. |
| D | **Offre élargie** | À la 2e et à la 4e offre de chaque sorte (victoires 3, 4, 7, 8), une carte de plus : 4 reliques, ou une 3e compétence dans Graver (prise dans ses deux maîtrises). |
| E | Pont vers une maîtrise voisine | Graver montre une 3e compétence, prise hors de ses deux maîtrises, parmi celles qui ont un écho avec son build. |
| ACs, AD, ACsD | Combinaisons | A avec Cs ; A avec D ; A avec Cs et D. |

## 3. L'actuel, par départ (O0, choix au hasard)

| Départ | Compétences à graver (par maîtrise) | Compétences vues / offrables | Jamais vues | Paire redite | Carte déjà vue, par maîtrise | Reliques vues | Jamais vues | 1re maîtresse | Reliques rares (% des parties) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gorak Ivresse | 11 (Fureur 5, Sang 6) | 6,5 / 10,1 | 3,6 | 5,0 % | Fureur 30 %, Sang 35 % | 12,9 | 17,0 | 3,0 | Gantelet 3, Soufflet 6, Fiole 4 |
| Gorak Élan | 11 | 6,6 / 10,0 | 3,3 | 4,5 % | Fureur 29 %, Sang 34 % | 13,0 | 17,0 | 3,0 | Soufflet 5, Gantelet 3, Fiole 4 |
| Elaria Feinte | 14 (Chance 8, Sang 6) | 6,9 / 12,7 | 5,8 | 4,5 % | Chance 23 %, Sang 35 % | 12,9 | 18,2 | 2,8 | Fiole 3, Soufflet 2, Gantelet 3 |
| Elaria Plaie ouverte | 14 | 7,2 / 14,0 | **6,8** | 2,3 % | Chance 25 %, Sang 26 % | 13,1 | 18,7 | 2,2 | Fiole 5, Soufflet 5, Gantelet 4 |
| Brokk Épines | 10 (**Rempart 4**, Sang 6) | 6,6 / 10,0 | 3,4 | 4,7 % | **Rempart 35 %**, Sang 28 % | 13,1 | 18,4 | 1,9 | Soufflet 5, Fiole 2 |
| Brokk Bastion | 10 | 6,4 / **8,8** | 2,4 | 4,8 % | **Rempart 35 %**, Sang 33 % | 13,1 | 17,9 | 2,9 | Soufflet 4, Fiole 4 |
| Ervald Givre | 11 (Poison 6, Ombre 5) | 7,0 / 11,0 | 4,0 | 3,7 % | Poison 28 %, Ombre 27 % | 12,9 | 18,1 | 2,1 | Croc 4, Coccinelle 4, Patte 3, Gantelet 3, Soufflet 2 |
| Ervald Effroi | 11 | 6,9 / 10,1 | 3,2 | 3,8 % | Poison 32 %, Ombre 27 % | 13,1 | 18,0 | 2,2 | Clous 9, Gantelet 2, Croc 3, Patte 10, Soufflet 3 |
| Ysolde Sainteté | 12 (Lumière 6, Magie 6) | 7,1 / 10,8 | 3,8 | 2,5 % | Lumière 25 %, Magie 30 % | 12,9 | 17,5 | 2,7 | Gantelet 3, Fiole 3, Croc 3 |
| Ysolde Jugement | 12 | 6,8 / 10,1 | 3,3 | 4,6 % | Lumière 29 %, Magie 32 % | 13,1 | 17,4 | 2,7 | Croc 3, Gantelet 5, Paratonnerre 9, Fiole 4 |
| Naraxes Décoction | 14 (Chance 8, Poison 6) | 7,1 / 14,0 | **6,9** | 2,4 % | Chance 25 %, Poison 27 % | 12,9 | 19,4 | 1,7 | Croc 4, Gantelet 3, Soufflet 4 |
| Naraxes Dé pipé | 14 | 7,1 / 13,2 | 6,1 | 2,4 % | Chance 20 %, Poison 33 % | 13,2 | 19,0 | 1,9 | Soufflet 4, Croc 1, Gantelet 3 |
| Aldric Vindicte | 10 (**Rempart 4**, Ombre 6) | 6,8 / 10,0 | 3,2 | 4,6 % | **Rempart 37 %**, Ombre 23 % | 13,0 | 17,4 | 2,6 | Fiole 7, Soufflet 3, Croc 7 |
| Aldric Larcin | 10 | 6,9 / 10,0 | 3,1 | 3,4 % | **Rempart 34 %**, Ombre 24 % | 13,1 | 17,3 | 2,6 | Soufflet 3, Fiole 2, Croc 5 |
| Morgrut Puissance | 10 (Fureur 5, Rempart 5) | **4,6** / 10,0 | 5,4 | 3,2 % | Fureur 18 %, Rempart 21 % | 12,8 | 15,4 | 4,0 | Soufflet 5, Croc 3, Fiole 4 |
| Morgrut Rancœur | 10 | **4,5** / 10,0 | 5,5 | 6,3 % | Fureur 20 %, Rempart 23 % | 12,8 | 15,2 | 3,9 | Croc 5, Fiole 4, Soufflet 3 |
| Thaldrin Ciel d'orage | 11 (Magie 5, Poison 6) | 6,8 / 10,3 | 3,5 | 3,1 % | Magie 29 %, Poison 31 % | 13,1 | 19,5 | 1,9 | Gantelet 3, Croc 4 |
| Thaldrin Brasier | 11 | 6,6 / 10,2 | 3,5 | 4,8 % | Magie 31 %, Poison 31 % | 13,1 | 18,7 | 2,3 | Croc 3, Gantelet 5, Paratonnerre 4 |
| Fanchon Ballade | 14 (Magie 5, Chance 9) | 6,7 / 12,7 | 6,0 | 4,3 % | **Magie 39 %**, Chance 24 % | 13,0 | 18,5 | 2,3 | Paratonnerre 6, Croc 5, Fiole 5, Gantelet 4 |
| Fanchon Veine | 14 | 6,8 / 12,7 | 5,9 | 3,9 % | **Magie 38 %**, Chance 22 % | 13,0 | 17,8 | 3,2 | Croc 5, Fiole 4, Gantelet 5 |

**Lecture.**

1. **Deux défauts différents, selon la taille de la réserve.**
   - **Petites réserves** (Brokk, Aldric : 10 compétences, dont un Rempart à 4) : on voit 6,4 à 6,9 compétences, presque toute la réserve offrable. Mais une carte de Rempart sur trois est déjà vue. Le joueur revoit les mêmes : c'est le « Rétribution trois fois » de la partie de Brokk (Parite § 3).
   - **Grandes réserves** (Elaria, Naraxes, Fanchon : 14) : la moitié de la réserve ne passe jamais (5,8 à 6,9 compétences non vues). Le joueur ne voit pas ce qui existe : c'est le « pas de profondeur ».
2. **Morgrut** n'a que 4 faces de compétence (son identité). Il ne remplit que 2 faces, voit 2 à 3 Graver et 4,5 compétences. C'est voulu ; l'offre de reliques porte sa profondeur.
3. **Les reliques.** 13 vues sur une trentaine offrables, quel que soit le personnage (12,8 à 13,2). Les reliques rares sont presque toujours les mêmes maîtresses consommatrices, dont le producteur manque (§ 6).
4. **Deux parties du même départ** ne gardent que 11 % de leurs briques en commun (Jaccard des builds 0,10 à 0,13) : les builds varient déjà beaucoup d'une partie à l'autre.

## 4. Les options comparées (moyenne des 20 départs)

Choix au hasard, sauf la colonne « en suivant l'écho ». En gras, la recommandation et ce qui la distingue.

| Option | Reliques vues (part) | Jamais vues | Redites | Communes | Compétences vues (part) | Jamais vues | Paire redite | 1re forte | 1re maîtresse | Cartes en écho | Offres avec écho | Liens (au hasard / en suivant l'écho) | Force (au hasard / en suivant l'écho) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| O0 actuel | 13,0 (42 %) | 17,8 | 0,90 | 5,4 | 6,6 (61 %) | 4,4 | 3,9 % | 1,29 | 2,59 | 37 % | 68 % | 6,2 / 12,4 | 50,3 / 48,3 |
| O1 pas de redite | 13,7 (44 %) | 17,1 | 0,00 | 6,0 | 7,3 (67 %) | 3,8 | 0,0 % | 1,30 | 2,50 | 36 % | 67 % | 6,0 / 12,5 | 49,9 / 48,5 |
| A fraîcheur ×3 | 14,1 (46 %) | 16,7 | 0,35 | 6,4 | 7,6 (69 %) | 3,5 | 1,0 % | 1,29 | 2,50 | 36 % | 67 % | 6,0 / 12,6 | 49,5 / 48,6 |
| A5 fraîcheur ×5 | 14,4 (47 %) | 16,4 | 0,23 | 6,7 | 7,9 (72 %) | 3,2 | 0,5 % | 1,29 | 2,48 | 36 % | 67 % | 5,8 / 12,7 | 49,3 / 48,6 |
| B refusée ×½ | 13,8 (45 %) | 17,0 | 0,49 | 6,1 | 7,3 (67 %) | 3,8 | 1,5 % | 1,29 | 2,53 | 37 % | 68 % | 6,0 / 12,6 | 49,5 / 48,7 |
| AB | 14,3 (47 %) | 16,5 | 0,27 | 6,6 | 7,8 (71 %) | 3,3 | 0,6 % | 1,29 | 2,49 | 36 % | 67 % | 5,9 / 12,6 | 49,3 / 48,6 |
| C paliers en murs | 13,1 (43 %) | 17,7 | 0,95 | 5,5 | 6,6 (60 %) | 4,5 | 4,0 % | 1,51 | **4,36** | 34 % | **62 %** | 5,8 / **11,4** | 49,2 / 47,8 |
| Cs paliers en poids | 13,1 (43 %) | 17,7 | 0,93 | 5,5 | 6,6 (60 %) | 4,5 | 4,0 % | 1,55 | 3,47 | 36 % | 66 % | 6,1 / 12,0 | 49,2 / 47,7 |
| D élargie | 14,3 (47 %) | 16,4 | 1,26 | 6,6 | 7,4 (68 %) | 3,6 | 0,0 % | 1,27 | 2,48 | 37 % | 71 % | 6,1 / 12,8 | 50,0 / 48,9 |
| E pont | 13,0 (42 %) | 17,8 | 0,90 | 5,4 | 9,9 (dont hors maîtrise) | 4,4 | 1,1 % | 1,29 | 2,57 | **49 %** | **82 %** | 7,2 / **14,1** | 49,8 / **45,3** |
| ACs | 14,2 (46 %) | 16,6 | 0,39 | 6,4 | 7,6 (69 %) | 3,5 | 1,0 % | 1,53 | 3,40 | 35 % | 65 % | 5,9 / 12,3 | 49,2 / 47,7 |
| AD | 15,8 (51 %) | 15,1 | 0,51 | 7,9 | 8,5 (78 %) | 2,5 | 0,0 % | 1,27 | 2,39 | 36 % | 70 % | 5,9 / 13,2 | 49,9 / 48,1 |
| **ACsD** | **15,8 (51 %)** | **15,0** | **0,55** | 7,9 | **8,5 (78 %)** | **2,5** | **0,0 %** | **1,48** | **3,25** | 36 % | 67 % | 5,9 / 12,7 | 48,9 / 47,8 |

Marges de la force : ± 0,8 point par option, ± 1,1 pour un écart.

### 4.1 Lecture, option par option

- **O1, pas de redite stricte.** Elle supprime toutes les redites immédiates, mais n'ajoute que +0,7 relique et +0,7 compétence vues. C'est la règle que l'utilisateur écarte : une carte refusée devient introuvable à l'offre suivante.
- **A, la fraîcheur ×3.** Elle fait mieux que O1 sur la profondeur : +1,1 relique et +1,0 compétence vues. Elle ne ferme rien : une carte refusée revient, environ trois fois moins souvent qu'une carte neuve (redites 0,90 → 0,35, jamais 0).
  - C'est la réponse directe à « on peut refuser puis la vouloir plus tard ».
  - Elle agit surtout là où l'on revoyait les mêmes : la carte déjà vue tombe de 35 à 23 % au Rempart de Brokk Bastion, de 37 à 27 % chez Aldric, de 39 à 31 % en Magie chez Fanchon.
  - ×5 n'apporte que +0,3 de plus, et ×3 suffit.
- **B, refusée ×½.** Moins efficace que A (+0,8 relique, +0,7 compétence vues) : elle ne pousse pas les cartes neuves, elle freine seulement celles qu'on a refusées. A et B ensemble (AB) ≈ A5. Garder une seule notion, la plus simple à dire : **une carte jamais vue pèse plus**.
- **C contre Cs, les paliers de D27.**
  - Ils font ce qu'on leur demande : la première maîtresse passe de la 2,6e à la 4,4e relique en murs, à la 3,5e en poids. Ils ne changent pas la profondeur.
  - **En murs, ils coûtent des combos.** Les offres avec écho passent de 68 à 62 %, et les liens d'un build qui suit l'écho de 12,4 à 11,4 : les maîtresses sont justement les cartes d'écho (Coccinelle, Croc de boucher, Encens).
  - **En poids (×¼ avant 3 reliques, ×2 ensuite), le coût tombe** : offres avec écho 66 %, liens 12,0.
  - **D27 se code en poids**, pas en murs.
- **D, l'offre élargie.** +1,3 relique et +0,8 compétence vues. Elle offre plus de combos (offres avec écho 68 → 71 %) : on choisit parmi plus de cartes. Les redites montent (0,90 → 1,26), parce qu'il y a plus de cartes à revoir : seule, elle ne règle pas le « toujours les mêmes ».
  - **Avec A, l'effet s'additionne (AD)** : 15,8 reliques et 8,5 compétences vues, compétences jamais vues 4,4 → 2,5. C'est le plus grand gain de profondeur mesuré.
- **E, le pont vers une maîtrise voisine.** C'est le meilleur levier des combos : cartes en écho 37 → 49 %, offres avec écho 68 → 82 %, liens 12,4 → 14,1. Mais :
  1. il **affaiblit** le joueur qui suit l'écho : 48,3 → **45,3 %** (−3,0 ± 1,1 ; Ysolde −8,3, Fanchon −8,3, Aldric −7,0). Les compétences d'autres maîtrises « en écho » sont moins bonnes que celles de sa réserve ;
  2. il fait entrer **0,8 compétence hors maîtrise par partie** (1,6 pour le joueur qui suit l'écho). Cela entame « un personnage est un personnage précis » et la lisibilité des maîtrises ;
  3. il n'ajoute rien à la profondeur dans ses propres maîtrises : 4,4 compétences y restent jamais vues.
  
  **À écarter** comme règle générale. Il rejoint l'option C de [CONTENU_RETOUR_30.md](CONTENU_RETOUR_30.md) § 3.3 (2 ou 3 briques hybrides, posées une à une).

### 4.2 La force des builds

Aucune option ne change la force moyenne au-delà de la marge (± 1,1), sauf E chez le joueur qui suit l'écho.

ACsD fait −1,4 (50,3 → 48,9 %). L'écart se concentre, avec le même signe dans les options A, Cs, D et ACsD, sur deux personnages dont le build vit d'une maîtresse que l'écho poussait tôt :

| Personnage | Relique prise, part des parties (O0 → A → Cs → D → ACsD) | Force du personnage, ses deux auras, écart à O0 (A ; Cs ; D ; ACsD), ± 3,3 |
| --- | --- | --- |
| Naraxes | Coccinelle d'émail : Décoction 37 → 33 → 33 → 31 → **23 %** ; Dé pipé 32 → 31 → 27 → 32 → 25 % | −2,2 ; −2,4 ; −3,4 ; **−3,7** |
| Fanchon | Encens de l'abbaye (Ballade) 28 → 22 → 22 → 23 → 22 % | −2,9 ; −4,5 ; −3,5 ; **−4,9** |

Reliques prises : 600 parties par départ (sondage à part). Avec ACsD, les huit autres personnages restent dans ± 2 points.

Pour Naraxes, la perte vient de la Coccinelle d'émail. Elle vaut +20,5 points chez lui, au-delà de la bande d'une relique, et D5 (le Doublé) la ramène déjà de +17,3 à +12,1 en moyenne chez ses porteurs ; Naraxes construit est haut (54,6 % dans [DES_SUPPLEMENTAIRES.md](DES_SUPPLEMENTAIRES.md)). Pour Fanchon, −4,9 ± 3,3 est à surveiller. **Aucune compensation proposée** : à remesurer après D5 et D26 (`npm run ramp`).

**La difficulté de la campagne** se recale seule : le champion de référence (`drawBuild`) suit la même offre, donc les PV des rencontres (`tuneHp`) suivent la force moyenne des builds. Un `npm run campaign` le confirmera.

### 4.3 Deux parties du même départ

Les reliques **communes** entre deux parties successives montent avec la profondeur : 5,4 (O0) → 6,4 (A) → 7,9 (AD, ACsD).

Ce n'est pas un retour des mêmes reliques, c'est l'arithmétique : une partie qui voit la moitié d'une réserve de 31 reliques en recoupe une autre sur environ 31 × 0,51² ≈ 8 (aujourd'hui 31 × 0,42² ≈ 5,5, comme mesuré).

Les **builds**, eux, ne se recoupent pas plus (Jaccard 0,11 → 0,11). Le « souvent les mêmes » **d'une partie à l'autre** (R53) ne se règle donc que par une réserve plus grande (D26), pas par l'offre. Une mémoire d'une partie à l'autre reste écartée (parité R1, CONTENU § 1.1).

## 5. La recommandation : ACsD

### 5.1 La règle

Elle tient en trois phrases, une pour tous :

1. **Fraîcheur.** Une carte (relique ou compétence de Graver) qu'on n'a pas encore vue dans cette partie a trois fois plus de chances de sortir. Une carte déjà vue ou refusée peut toujours revenir.
2. **Paliers en poids (D27).** Une relique du palier II sort à demi-poids avant la 3e relique. Une relique du palier III sort à quart de poids avant la 4e, puis à double poids.
3. **Deux offres riches.** La 2e et la 4e forge (victoires 3 et 7) montrent une 3e compétence dans Graver. La 2e et la 4e relique (victoires 4 et 8) montrent 4 reliques.

Elle respecte la parité (R1, D1) : la mémoire est celle du build (ce qu'il a vu dans cette partie), et les paliers lisent `b.relics.length`. La règle est donc la même en campagne, en saison, dans l'arbre construit (D1) et pour le champion de référence.

### 5.2 Ce qu'il faudrait coder (après feu vert)

- **`BuildState`**, `offers.ts` : un champ facultatif `seen?: string[]`, les cartes déjà montrées dans la partie (`relic:<id>`, `skill:<id>`). Il est rempli à chaque `drawReward` et enregistré :
  - dans la partie de campagne (`battler:campaign:v5`, champ facultatif : absent, rien de vu, compatible) ;
  - chez chaque participant de saison.
- **Constantes** : `FRESH_WEIGHT = 3` ; `RICH_OFFERS = [2, 4]` (rangs de l'offre de chaque sorte).
- **Reliques** :
  - `drawOffer` (`relics.ts`) tire **toutes** les cartes au poids. La première pèse (1 + `ECHO_WEIGHT` × écho) × fraîcheur × palier, les autres fraîcheur × palier, sans remise. Avec des poids à 1, c'est le tirage d'aujourd'hui (contrôle R0 du § 2) ;
  - le palier est une donnée de chaque relique (`tier: 1 | 2 | 3`, listes de CONTENU § 1.3), et les poids sont ceux de Cs.
- **Graver** : `focus` est multiplié par la fraîcheur. Aux offres riches, `drawForgeOffer` ajoute une 3e compétence, tirée au poids parmi les gravables restantes de ses deux maîtrises.
- **Écran** (à confier à l'agent des écrans ; non vu) :
  - le menu de récompense à 4 reliques ;
  - le panneau Graver à 3 compétences ;
  - sur la piste de l'acte (`ActTrack`), un losange « offre riche » aux victoires 3, 4, 7 et 8. Le joueur sait d'avance où il verra plus.
- **Tests** (`modules.test.ts`) :
  - une carte jamais vue sort plus souvent qu'une carte vue, sur graine fixe ;
  - une carte refusée peut revenir ;
  - 4 reliques et 3 compétences aux offres riches ;
  - les paliers : palier III à ¼ puis ×2 ;
  - une partie enregistrée sans `seen` se relit.
- **Mesures** : l'empreinte `balance.test.ts` bouge si elle passe par les builds de référence (à mettre à jour, noté au CHANGELOG). Puis un `npm run campaign` (difficulté) et un `npm run ramp` (bandes).

### 5.3 Si l'écran doit attendre

**ACs** (fraîcheur et paliers en poids) ne touche ni aux menus ni au stockage, sauf `seen` :

| Mesure | O0 | ACs |
| --- | --- | --- |
| Reliques vues | 13,0 | 14,2 |
| Compétences vues | 6,6 | 7,6 |
| Paire de Graver redite | 3,9 % | 1,0 % |
| Redites de relique | 0,90 | 0,39 |
| 1re maîtresse | 2,6 | 3,4 |
| Force | 50,3 % | 49,2 % (dans la marge) |

L'offre riche (D) s'ajoute ensuite, avec l'écran.

## 6. Ce qui relève du contenu

Aucun poids ne crée une carte qui n'existe pas. Comptes du registre (`MASTERY_SKILLS`, compétences sans les auras) et cartes offrables au départ (`offerableSkills`, le producteur d'abord) :

| Maîtrise | Compétences | Offrables au départ (par départ) | Le manque |
| --- | --- | --- | --- |
| **Rempart** | 5 (Peau de pierre, Rancune, Rétribution, Riposte, Onde de choc) | **4** chez Brokk et Aldric (l'une est sur leur dé), 5 chez Morgrut | La plus courte. Avec ACsD, Brokk Bastion voit 7,9 de ses 8,8 compétences (jamais vues : 0,8), et **sa carte de Rempart est encore une carte déjà vue 34 % du temps** (35 % aujourd'hui). Chez Aldric : 37 → 34 %. Il faut **2 à 3 compétences de Rempart** pour atteindre les 9 à 10 briques visées ([MAITRISES.md](../MAITRISES.md), C8). |
| **Lumière** | 7, dont 3 consommatrices du soin (Sentence, Bouclier de foi, Flamme votive) | Ysolde Sainteté 6/6, **Ysolde Jugement 3/6** | Ysolde Jugement commence avec 3 cartes de Lumière, et la maîtrise n'a que 4 compétences qui ne demandent rien (l'une est sur son dé). La Grâce (D26) serait une 4e consommatrice du soin : il faut aussi **une ou deux compétences de Lumière sans condition**. Carte déjà vue en Lumière : 29 % (ACsD : 25 %). |
| Sang | 6, dont 3 consommatrices du Saignement (Sangsue, Curée, Odeur du sang) | **3/6** chez Gorak (les deux auras), Elaria Feinte, Brokk Bastion | Aucune relique ne pose de Saignement : l'**Hameçon rouillé** (D26) ouvrirait la moitié de la maîtrise. |
| Poison | 6, dont 3 consommatrices (Virulence, Récolte, Morsure) | **3/6** chez Ervald Effroi, Naraxes Dé pipé, Thaldrin (les deux auras) | Les trois consommatrices attendent une première source de Poison dans le build (une gravure ou le Dard de guêpe). |
| Magie | 6, dont 2 consommatrices de la Brûlure (Embrasement, Attiser) | **3/5** chez Fanchon, **4/6** chez Ysolde | Fanchon revoit sa carte de Magie 38 à 39 % du temps aujourd'hui, et encore 33 à 34 % avec ACsD. La Boule de feu (D26) poserait la Brûlure. |
| Fureur, Ombre, Chance | 6, 6, 9 | Toutes offrables | Pas de manque d'offre. Chance (8 à 9) est la plus profonde. |

**Les autres signaux de contenu :**

- **Les reliques maîtresses rares.**
  - Le Soufflet de forge, le Gantelet du talion, le Croc de boucher et la Fiole de venin sont offerts dans **moins de 10 % des parties** de presque tous les départs, avec toutes les options (2 à 4 reliques rares par départ avec ACsD, 2 à 5 aujourd'hui).
  - Leur condition demande un producteur qui manque au build : Brûlure, renvoi, Saignement, Poison.
  - C'est le contenu de D25 et D26 (reliques de build, sources) qui les fera circuler, pas un poids.
- **Morgrut** voit 4,5 compétences (6,2 avec ACsD) parce que son dé n'a que 4 faces de compétence. C'est son identité, pas un manque.
- **Les grandes réserves** (Elaria, Naraxes, Fanchon : 14 compétences) ne manquent pas de contenu : elles manquent de cartes montrées. C'est là qu'ACsD rend le plus : compétences jamais vues 5,8 à 6,9 → 3,7 à 4,7.

## 7. Un constat en passant : l'écho n'est pas la force

Le joueur automatique qui suit toujours l'écho construit des builds **plus faibles** que celui qui choisit au hasard : 48,3 contre 50,3 % (−2,0 ± 1,1) aujourd'hui, et le même écart dans toutes les options. Ses builds ont deux fois plus de liens (12,4 contre 6,2).

L'écho relie des briques qui se nourrissent, mais une paire liée ne vaut pas toujours plus qu'une bonne brique seule. Chez Gorak, Ervald, Naraxes et Fanchon, l'écart va de −4 à −6 points.

Pour l'offre, cela veut dire qu'un poids d'écho plus fort ne rendrait pas les builds plus forts. Pour le joueur, que « suivre les combos » n'est pas un pilote automatique gagnant. C'est sain pour la décision, mais à garder en tête si l'interface met l'écho en avant. Non creusé ici.

## 8. Ce qui n'est pas vérifié

- **Aucun code de jeu**, aucun écran, aucun test. Les options ne vivent que dans le script.
- **La force** est mesurée contre un panneau de builds d'aujourd'hui, avec un choix au hasard ou en suivant l'écho. Ce n'est pas le choix d'un joueur réel. La difficulté de la campagne (`npm run campaign`) et les bandes (`npm run ramp`) ne sont pas remesurées.
- **Le moteur** était en cours de modification par d'autres agents (dés de frappe, D5) pendant la mesure. Chaque option a tourné sur le même instantané (lancées ensemble), mais les valeurs absolues de force bougeront avec D5.
- **Les paliers** sont ceux de CONTENU § 1.3. Les reliques nouvelles de D26 n'y sont pas, et n'existent pas encore.
- **Les menus à 4 reliques et à 3 compétences** n'ont pas été vus.

## 9. Les fichiers

- **Script jetable** `scripts/offre.report.ts`, supprimé : offres réécrites, mesures, force, sondage des reliques prises. Le comptage des maîtrises (`scripts/offre-maitrises.report.ts`) est supprimé aussi.
- **Sortie brute** : `logs/offre/offre.md` (tableaux complets, par départ et par option) et `logs/offre/parts/*.json`. `logs/` n'est pas suivi par git.
