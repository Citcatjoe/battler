# Les dés de plus, l'aura purifiée, la Pièce de la rafale, et les idées sur le dé (étude du 2026-10-30)

Retour de jeu du 2026-10-30 (`prompts/Retour du 30 octobre.md`), points du registre [RETOUR_30.md](../RETOUR_30.md) : **R13, R14, R16, R29** (les dés de plus qui relancent des compétences), **R12** (l'aura purifiée par Ysolde), **R8** (la Pièce de la rafale), **R57, R58, R59** (agir sur le dé, l'aura d'entrée de jeu, l'enrage).

**Étude seulement : rien n'a changé dans `src/`.** Chaque section mesure l'état, propose 2 à 4 solutions chiffrées (avant → après) et en recommande une. Rien ne se code sans le feu vert de l'utilisateur (questions au § 7).

## 0. En bref

- **Le constat se vérifie, et il est concentré.** Les dés de plus qui lancent des compétences (les « jets complets » de Coup de chance) n'existent que chez trois personnages construits : **Naraxes 1,15 par combat** (dans 53 % de ses combats), Fanchon 0,67, Elaria 0,66 ; ailleurs, presque rien. Chez Naraxes, ils font partir **0,85 compétence et 0,48 pièce par combat** et retirent **12,5 % des PV adverses**. Leurs sources : **la Coccinelle d'émail (0,79 charge par combat chez Naraxes)** puis Coup de chance (0,42, et 0,28 au rang II).
- **Ils valent cher** : chez leurs porteurs réels, Coup de chance gravé **+19,0 points** (121 builds), la Coccinelle **+17,3** (78 builds, **+20,5 chez Naraxes**, au-dessus de la bande d'une relique, 5 à 15). La Coccinelle porte Naraxes construite à 64,6 % (sans elle 44,1 %).
- **Recommandation (S2, « le Doublé ») : un dé de plus est un dé de frappe** (un coup de base, sa face ne lance pas de compétence), **sauf s'il fait la même face que le dé de compétence de l'action : « Doublé ! », sa compétence repart.** Une seule règle pour tous ; le casino reste (un doublé sur six dés de plus), la boule de neige tombe : compétences sur un dé de plus 0,20 → **0,03** par combat, Coup de chance +19,0 → **+14,2**, Coccinelle +17,3 → **+12,1**, Naraxes construite 54,6 → **50,6 %**. À l'écran : **le dé de compétence** (le d6 gravé, à la couleur du camp) et **les dés de frappe** (blancs), qui deviennent dorés sur un doublé.
- **L'aura purifiée ne revient pas, en effet** : dans 63 % des purges (nu ; 54 % construit), l'aura de départ ne revient plus avant la fin, parce que son rendez-vous du 3e tour ne sert qu'une fois. **Recommandation (A2·7) : le rendez-vous se réarme** (purgée, l'aura se rallume au début du 2e tour suivant de son porteur), compensé par **la Purification à 7 au lieu de 5 quand elle retire un bonus** : Ysolde 47,2 → 48,2 % nue, 49,4 → 50,3 % construite.
- **La Pièce de la rafale vaut +17,9** chez ses porteurs (44 builds) : dans la bande (8 à 20), en haut. Une pile = 2,4 coups bruts, 12,6 PV, et **achève l'adversaire une fois sur dix**. Recommandation : **garder la valeur**, régler le rythme (R9, chez Rythme) ; si elle reste trop forte au ressenti, pile = 1 coup (+10,5 à +13,5).
- **Les idées de l'utilisateur, en reliques d'essai, apport chez un build complet** : **l'aura d'entrée (Clairon du héraut) +9,7, oui** ; **sceller la face du dernier jet adverse +4,5 à +6,9, oui en version longue** ; « perdre une face » toute la partie +11,9, non (frustrant à subir) ; **relancer ses faces nues +5,0, oui (il s'éteint quand le dé se remplit)** ; **l'enrage au critique reçu +8,7 (+5 Ferveur) à +11,3 (montante), oui** ; l'enrage sous la moitié des PV +12,7 à +16,8, en variante seulement (+22,7 à +29,1 chez un personnage nu).

## 1. Méthode

- **Code** : une copie de travail du dépôt (0.131.2), hors du dépôt, avec des interrupteurs de laboratoire dans `combat.ts` (`LAB` : type des dés de plus, doublé, réarmement de l'aura, auras imperméables, face scellée, relance des faces nues, fenêtre « critique reçu »). **Sans interrupteur, la copie redonne exactement les combats du dépôt** (vérifié : l'empreinte `balance.test.ts` passe sur la copie). Le script, le diff du moteur et les rapports : `local://r30-PropDes.md` § Outils (jetables).
- **Builds** : `drawBuild` de la campagne à 10 récompenses (le champion de référence : offre, choix par défaut), **ses deux auras de départ en alternance**.
- **Force construite** : 48 builds par personnage, chacun contre le build de même rang des 9 autres, 20 combats par duel, graines de `npm run balance` (hasard commun entre variantes) : **8 640 combats par personnage, ± 1,1 point** (intervalle à 95 %).
- **Valeur nette chez les porteurs réels** : parmi 96 builds par personnage, ceux qui portent la brique ; chacun avec puis sans elle (une gravure retirée emporte ses aiguisages et copies), contre le build de même rang des autres, 30 combats par duel, mêmes graines avec et sans (270 combats appariés par build).
- **Reliques d'essai** (§ 6) : nu, contre le roster nu, 200 combats par duel (1 800 par personnage, avec et sans) ; construit, ajoutée au build (48 par personnage), 8 640 combats appariés par personnage.

## 2. L'état : qui lance des dés de plus, et ce qu'ils font

### 2.1 Deux sortes de dés de plus, déjà

| Sorte | Ce que fait chaque dé | Sources | Moteur |
| --- | --- | --- | --- |
| **Le jet complet**, à sa prochaine action | sa face (la compétence de la face), puis son coup | **Coup de chance** (gravé, Chance) ; **Coccinelle d'émail** (relique : pile, +2 Coup de chance, recharge 3) | `luckyStrike`, `extraStrikes` sans `instantStrikes` ; au plus 3 par action (`MAX_EXTRA_JETS`) ; un dé de plus ne donne jamais de dé de plus (A7) |
| **Le coup brut**, tout de suite | un coup de base ; sa face ne lance aucune compétence (les reliques de face et la dorure la lisent) | Furie des vents, Duo, Veine, Rafale de pile (Pièce de la rafale), Curée, Ivresse du sang | `instantStrikes` |

C'est déjà la distinction que l'utilisateur demande : le coup brut **est** le « dé de coup blanc ». Le problème vient seulement du jet complet.

### 2.2 Le recensement (builds à 10 récompenses, 86 400 combats)

| Personnage | Victoires | Jets complets par combat | Combats avec au moins un | Victoires quand il y en a | Compétences sur un dé de plus | Pièces sur un dé de plus | PV adverses retirés par les jets complets | Sources (charges par combat) | Coups bruts par combat | PV retirés par les coups bruts |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Naraxes | 54,6 % | **1,15** | 52,7 % | 68,1 % | **0,85** | **0,48** | **12,5 %** | **Coccinelle 0,79**, Coup de chance 0,42, rang II 0,28 | Rafale de pile 0,41 | 3,1 % |
| Fanchon | 53,8 % | 0,67 | 34,9 % | 63,7 % | 0,48 | 0,08 | 9,0 % | Coup de chance 0,50, rang II 0,23, Coccinelle 0,19 | Duo 2,85, Veine 1,08, Rafale de pile 0,39 | 31,9 % |
| Elaria | 52,3 % | 0,66 | 33,8 % | 64,5 % | 0,48 | 0,07 | 8,5 % | Coup de chance 0,48, Coccinelle 0,21, rang II 0,19 | Curée 0,21, Rafale de pile 0,17 | 3,7 % |
| Ervald | 51,4 % | 0,08 | 3,8 % | 74,9 % | 0,07 | 0,02 | 0,7 % | Coccinelle 0,09 | — | 0 % |
| Gorak | 44,7 % | 0 | 0 % | — | 0 | 0 | 0 % | — | **Furie 4,31**, Ivresse 0,82 | **42,8 %** |
| Autres (Brokk, Ysolde, Aldric, Morgrut, Thaldrin) | | ≤ 0,04 | ≤ 2,4 % | | | | ≤ 0,5 % | | Curée, Duo, Furie | ≤ 4,4 % |
| **Tous** | 50 % | 0,26 | 13,0 % | **66,3 %** | 0,20 | 0,07 | 3,2 % | Coup de chance 0,21, Coccinelle 0,13 | 1,17 | 9,4 % |

Lecture :
- **Un combat avec un jet complet se gagne deux fois sur trois** (66,3 %). C'est la boule de neige : le dé de plus relance une compétence, chez Naraxes souvent une pièce (Pile ou face : pile, ce coup ×3). La règle A7 empêche déjà la chaîne (une pile sur un dé de plus ne réveille pas la Coccinelle) : c'est la compétence lancée, pas le nombre de dés, qui fait la force.
- **Les coups bruts ne posent pas ce problème** : beaucoup plus nombreux (1,17 par combat, 4,31 chez Gorak), ils ne lancent rien, et leur valeur se règle comme un nombre de coups.
- **Actions à un, deux, trois dés de plus** : 9 863, 6 437, 1. Le plafond de 3 ne sert presque jamais ; c'est la fréquence (Coccinelle) et la compétence lancée par le dé, pas le nombre de dés, qui font la force.

### 2.3 La valeur nette chez les porteurs réels

| Brique | Porteurs | Avec → sans | Apport | Bande |
| --- | --- | --- | --- | --- |
| Coup de chance (gravure) | 121 builds (Elaria 36, Naraxes 38, Fanchon 47) | 55,8 → 36,9 % | **+19,0** (+18,6 à +19,2) | 8 à 20 : au bord |
| Coccinelle d'émail (relique) | 78 builds (Naraxes 39, Fanchon 15, Elaria 11, Thaldrin 7, Ervald 6) | 59,2 → 42,0 % | **+17,3** ; **Naraxes +20,5** | 5 à 15 (20 au plus) : au-dessus |
| Pièce de la rafale (gravure) | 44 builds (Naraxes 21, Fanchon 16, Elaria 7) | 56,5 → 38,6 % | +17,9 | 8 à 20 |

Le ressenti de l'utilisateur (« la Coccinelle a transformé un build qui tournait à peine en machine de guerre ») se lit : **Naraxes construite avec la Coccinelle gagne 64,6 %, sans elle 44,1 %**.

## 3. Les dés de plus : quatre solutions (R13, R14, R16, R29)

### 3.1 Les règles mesurées

| | Règle | Ce qui change dans le jeu |
| --- | --- | --- |
| **S1 · Le dé de frappe** | **Un dé de plus est toujours un dé de frappe** : un coup de base ; sa face ne lance pas de compétence (les reliques de face et la dorure la lisent, comme pour un coup brut). | Coup de chance : « +1 dé de frappe à sa prochaine action ». Plus aucun jet complet. |
| **S2 · Le Doublé** (recommandée) | S1, **sauf doublé** : un dé de frappe qui fait **la même face que le dé de compétence de l'action** devient un dé de compétence (« Doublé ! ») : sa compétence part, puis son coup. | Le jackpot reste, une fois sur six. La règle A7 (un dé de plus ne donne pas de dé de plus) tient toujours. |
| **S3 · Le type par la source** | Chaque source dit le dé qu'elle donne. Mesuré : la compétence (Coup de chance, une face du dé) donne un dé de compétence, la relique (Coccinelle) des dés de frappe. | Deux sortes de dés de plus à l'action suivante, deux règles à apprendre. |
| **S4 · Le réglage seul** | Rien ne change dans la règle ; la Coccinelle passe de 2 à 1 charge. | Moins de dés, même nature. |

### 3.2 Avant → après

Recensement (86 400 combats par variante) :

| | Compétences sur un dé de plus, par combat (Naraxes) | Pièces sur un dé de plus (Naraxes) | PV retirés par les dés de plus (Naraxes) | Victoires quand il y a un dé de plus (tous) | Doublés |
| --- | --- | --- | --- | --- | --- |
| Actuel | 0,20 (0,85) | 0,07 (0,48) | 3,2 % (12,5 %) | 66,3 % | — |
| S1 | 0 (0) | 0 (0) | 2,3 % (9,4 %) | 56,6 % | — |
| **S2** | **0,03 (0,15)** | **0,01 (0,08)** | **2,4 % (9,9 %)** | **57,9 %** | 7 952 sur 48 072 dés de plus (16,5 %, un sur six attendu) |
| S3 | 0,11 (0,34) | 0,03 (0,18) | 2,8 % (10,7 %) | 62,3 % | — |
| S4 | 0,16 (0,63) | 0,05 (0,35) | 2,6 % (9,5 %) | 62,4 % | — |

Valeur nette chez les porteurs réels (mêmes builds, mêmes graines) :

| Brique | Actuel | S1 | **S2** | S3 | S4 |
| --- | --- | --- | --- | --- | --- |
| Coup de chance (121 builds) | +19,0 | +13,2 | **+14,2** | +19,3 | +19,5 |
| Coccinelle (78 builds) | +17,3 | +11,2 | **+12,1** | +11,0 | +11,1 |
| Coccinelle chez Naraxes (39) | +20,5 | +12,7 | **+14,1** | +12,4 | +13,2 |
| Pièce de la rafale (44 builds) | +17,9 | +17,1 | +17,2 | +17,3 | +17,1 |

Force construite par personnage (8 640 combats chacun, ± 1,1) :

| Personnage | Actuel | S1 | **S2** | S3 | S4 |
| --- | --- | --- | --- | --- | --- |
| Naraxes | 54,6 % | 49,6 % | **50,6 %** | 51,3 % | 51,4 % |
| Fanchon | 53,8 % | 51,1 % | **51,1 %** | 53,6 % | 53,4 % |
| Elaria | 52,3 % | 49,9 % | **50,2 %** | 52,1 % | 52,0 % |
| Brokk | 51,9 % | 53,9 % | 53,4 % | 52,8 % | 52,6 % |
| Aldric | 52,0 % | 53,4 % | 53,3 % | 52,7 % | 52,4 % |
| Ervald | 51,4 % | 52,7 % | 52,5 % | 51,7 % | 52,0 % |
| Ysolde | 49,4 % | 50,9 % | 50,8 % | 50,0 % | 50,1 % |
| Morgrut | 45,8 % | 47,5 % | 47,3 % | 46,5 % | 46,4 % |
| Gorak | 44,7 % | 45,9 % | 45,8 % | 45,2 % | 45,3 % |
| Thaldrin | 44,1 % | 45,1 % | 44,9 % | 44,3 % | 44,4 % |
| Écart (plus fort − plus faible) | 10,5 points | 8,8 | **8,5** | 9,3 | 9,0 |

Aucun personnage nu ne porte de jet complet (Coup de chance est hors kit, la Coccinelle est une relique) : **le roster nu et l'empreinte de `balance.test.ts` ne bougent sous aucune variante** (par construction : les interrupteurs ne touchent que les rafales de Coup de chance ; l'empreinte vérifiée sur la copie, interrupteurs éteints).

### 3.3 Lecture

- **S1** répond mot pour mot à l'utilisateur (« Coup de chance devrait relancer des dés de frappe et pas pouvoir faire boule de neige ») et donne le meilleur écart du roster après S2. Les deux briques rentrent dans leur bande sans compensation (Coup de chance +13,2, Coccinelle +11,2). Mais le casino disparaît : un dé de plus n'a plus de surprise.
- **S2** garde **le jackpot** sans la boule de neige : le doublé arrive sur un dé de plus sur six, se voit (deux dés identiques côte à côte) et se lit sans texte. Il coûte **un point** de plus que S1 aux porteurs (Coup de chance +14,2, Coccinelle +12,1), tout dans les bandes. Les compétences lancées par un dé de plus tombent de 85 % (0,20 → 0,03 par combat). Une seule règle, pour toutes les sources, présentes et futures.
- **S3** règle la Coccinelle (+11,0) mais **laisse Coup de chance à +19,3**, ce que l'utilisateur trouve « mal tuné » ; et il faut deux couleurs de dés de plus à l'action suivante, deux règles. Sa vraie force : il ouvre un levier de contenu (une future brique rare qui donne explicitement un dé de compétence). **S2 garde cette porte ouverte** : une brique pourra donner « un dé de compétence » écrit en toutes lettres, qui sera alors l'exception visible de sa carte, pas de la règle.
- **S4** ne règle que la fréquence (Coccinelle +11,1) : la nature du dé de plus reste, Coup de chance aussi (+19,5), et la question de l'utilisateur (« la pertinence de générer de nouveaux jets sur les compétences ») reste entière.
- **Le Duo, la Veine, la Furie, la Rafale de pile** sont déjà des dés de frappe : rien ne change pour eux sous aucune variante (Pièce de la rafale +17,1 à +17,9).

### 3.4 L'interface : un dé de compétence, des dés de frappe (R14)

Le moteur sépare déjà les deux : **le d6 choisit la face (la compétence), il ne fait aucun dégât** ; la valeur du coup est tirée à part dans l'attaque du personnage (`resolveAttack`, `combat.ts`). Ce qui manque, c'est que l'écran le dise. Proposition, avec S2 :

1. **Le dé de compétence** : le d6 de l'action, à la couleur du camp, comme aujourd'hui ; c'est lui dont la face allume le sceau de la compétence dans la barre.
2. **Les dés de frappe** : des d6 **blancs** (ivoire, points sombres), un peu plus petits, rangés à droite du dé de compétence, dans l'ordre où ils frappent. Un dé de frappe = un coup ; sa face ne compte que pour les reliques de face (un 6 : Dard de guêpe, Briquet) et la dorure. **Tous les dés de plus** (Coup de chance, Coccinelle, Furie, Duo, Veine, Rafale de pile, Curée, Ivresse) prennent cet aspect : aujourd'hui le dé de plus de Coup de chance est vert (`dieColor`), et rien ne dit à l'œil qu'il relance une compétence.
3. **Le Doublé** : le dé de frappe qui fait la même face que le dé de compétence **se retourne en dé de compétence** (il prend la couleur du camp, cerclé d'or), le texte « Doublé ! » sort une fois au-dessus des dés, le sceau de la face s'allume une seconde fois. Un son propre (à définir selon `SONS.md`, non vérifiable ici).
4. **Le badge du statut** : Coup de chance « +2d6 » devient « +2 » sur l'icône d'un dé blanc ; la description dit « 2 dés de frappe à sa prochaine action ; un doublé relance sa compétence ».
5. **Pas de second dé à chaque action** : afficher un « dé de dégâts » demanderait un dé dont les faces ne sont pas 1 à 6 (l'attaque de Gorak est de 5 à 6) ; le nombre flottant le dit déjà. Le « dé des coups blancs » de l'utilisateur et de son collègue, ce sont les dés de frappe.

À faire si S2 est retenue (ordre de grandeur) : `combat.ts` (`action` : un dé de plus est un coup brut, sauf doublé ; ~20 lignes), `statuses.ts` (texte de Coup de chance), `staging.ts` (couleur des dés de plus, le retournement du doublé), `FightScreen.tsx` (taille et ordre des dés), `audit.ts` (le contrôle A7 se simplifie, un contrôle « doublé »), tests de `combat.test.ts` (dont « Coup de chance … chaque jet complet » et A7), `RESOLUTION.md` § 2, `STATUTS.md`, `SONS.md`.

## 4. L'aura purifiée par Ysolde (R12)

### 4.1 La règle, et la mesure

- La Purification (face 2 d'Ysolde) retire **le dernier bonus posé** de l'adversaire, toutes charges, et le blesse de 5 (8 s'il n'a aucun bonus). Une aura est un bonus : elle part quand elle est la dernière posée.
- L'aura de départ se pose d'office au début du 3e tour de son porteur, **une fois par combat** (`auraDue`) ; ensuite, seul un 1 au dé la repose. **Purgée après le 3e tour, elle ne revient que sur un 1** (un jet sur six, une action sur six au mieux).

| Ysolde contre | Purges par combat | Purges d'une aura de départ | Combats où l'adversaire la perd | Tours de l'adversaire sans elle | **Jamais revenue avant la fin** | Victoires de l'adversaire quand il la perd |
| --- | --- | --- | --- | --- | --- | --- |
| le roster nu (1 800 combats) | 1,20 | 0,60 | 52,8 % | 1,9 | **63,1 %** | 36,3 % |
| des builds complets (8 640 combats) | 2,21 | 0,70 | 54,3 % | 2,5 | **54,3 %** | 37,0 % |

L'utilisateur n'a pas rêvé : **dans plus d'un combat sur deux contre Ysolde, l'adversaire perd son aura, et la plupart du temps pour de bon.**

### 4.2 Les solutions

| | Règle | Ysolde nue | Ysolde construite | Aura jamais revenue | Pire duel d'Ysolde nue |
| --- | --- | --- | --- | --- | --- |
| A0 · actuel | une fois par combat | 47,2 % | 49,4 % | 63,1 % | Naraxes 43,5 % |
| A1 | **le rendez-vous se réarme** : purgée, elle revient au début du tour suivant de son porteur | 42,2 % | 43,1 % | 18,1 % | — |
| A2 | le rendez-vous se réarme : elle revient au début de son **2e tour suivant** | 44,7 % | 45,7 % | 32,9 % | Naraxes 39,5 % |
| A3 | les auras ne se purgent pas (la Purification vise les autres bonus, sinon blesse de 8) | 44,6 % | 45,0 % | — | Brokk 38,0 % |
| A1·8 | A1, Purification « blesse toujours de 8 » | 48,1 % | 50,4 % | 23,3 % | — |
| A2·6 | A2, Purification 5 → 6 quand elle retire un bonus | 46,4 % | 48,3 % | 35,1 % | Naraxes 41,5 % |
| **A2·7** | **A2, Purification 5 → 7 quand elle retire un bonus** | **48,2 %** | **50,3 %** | 37,0 % | **Naraxes 43,5 %** |
| A2·8 | A2, Purification « blesse toujours de 8 » | 49,7 % | 52,5 % | 38,8 % | Naraxes 45,5 % |
| A3·8 | A3, Purification « blesse toujours de 8 » | 45,6 % | 49,3 % | — | Brokk 40,0 % |

« Jamais revenue » sous A1 et A2 : les combats qui finissent avant le retour. Les autres personnages bougent de moins d'un point sous toutes les variantes (8 640 combats construits chacun). Duels d'Ysolde nue : 200 combats chacun (± 7 points).

**Recommandation : A2·7.** La purge garde un sens (l'aura s'éteint un tour entier, son porteur joue un tour sans elle, Ysolde en profite à son tour suivant) sans priver l'adversaire de son identité pour le reste du combat. C'est la règle du rendez-vous qu'on connaît déjà, étendue, pour tous : « purgée, l'aura de départ se repose d'office au début du 2e tour suivant de son porteur » (aujourd'hui le rendez-vous ne sert qu'une fois). La Purification passe de 5 à 7 dégâts quand elle retire un bonus, pour qu'Ysolde garde sa force (+1,0 nue, +0,9 construite, dans la marge). **Variante plus simple à lire : A2·8**, « la Purification retire son dernier bonus et le blesse de 8 » (un seul nombre au lieu de 5 et 8), Ysolde +2,5 / +3,1, dans la bande. A1 rend la purge d'une aura presque nulle (0,2 tour sans elle) ; A3 retire à Ysolde son geste de signature contre les auras.

Les valeurs 5 et 8 de la Purification ont été fixées avec l'utilisateur (vague 2 des Maîtrises, puis la règle du 3e tour) : c'est à lui de trancher (Q4).

## 5. La Pièce de la rafale (R8)

La pièce part après son coup qui touche ; pile, 2 coups bruts tout de suite (4 si le coup était critique, la « pile critique » A14) ; son rang, +1 chance sur 6 de pile.

| Porteurs (builds) | Pièces par combat | Piles | Coups bruts par pile | PV retirés par pile | dont Saignement | **Piles qui achèvent l'adversaire** | Avec → sans |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Naraxes (21) | 1,23 | 62,6 % | 2,48 | 12,3 | 0 | 9,1 % | 57,7 → 41,2 % (+16,5) |
| Fanchon (16) | 1,24 | 62,1 % | 2,35 | 12,9 | 0 | 12,0 % | 57,2 → 37,7 % (+19,4) |
| Elaria (7) | 1,23 | 59,9 % | 2,39 | 12,9 | 2,3 | 11,6 % | 51,4 → 32,9 % (+18,5) |
| **Tous (44)** | | | | | | | **+17,9** |

- **« Pile, combat terminé »** : une pile sur dix achève l'adversaire ; une pile pèse 12 à 13 PV (un quart des PV d'un personnage nu). Chez Elaria, chaque coup brut rouvre la plaie du Saignement (2,3 PV de plus par pile), d'où la sensation.
- **+17,9 est dans la bande d'une gravure (8 à 20), en haut.** Elle n'est pas touchée par les solutions du § 3 (ses coups sont déjà des dés de frappe).

| Réglage | Elaria | Naraxes | Fanchon | Piles qui achèvent |
| --- | --- | --- | --- | --- |
| **W0 · actuel** (2 coups, 4 sur un critique) | +18,5 | +16,5 | +19,4 | 9 à 12 % |
| W1 · pile, 1 coup (2 sur un critique) | +13,5 | +10,5 | +13,2 | 5 à 6 % |
| W2 · 2 coups, jamais doublés par le critique | +17,6 | +14,5 | +17,3 | 7 à 9 % |

**Recommandation : garder W0** et traiter la plainte de rythme (« trop de texte flottant, d'intervalle… boom les coups partent », R9, chez Rythme) ; avec S2, Naraxes perd 4 points ailleurs et la Pièce de la rafale reste son gros coup lisible. **Si elle reste trop forte au ressenti : W1** (une seule règle à changer, +10,5 à +13,5). W2 ferait d'elle une exception à la pile critique : non.

## 6. Les idées de l'utilisateur (R57, R58, R59)

Toutes mesurées en **reliques d'essai** (laboratoire seulement). Apport : nu (contre le roster nu, 1 800 combats appariés par personnage) et **construit** (la relique en plus d'un build complet, 8 640 combats appariés par personnage, la mesure qui compte pour la campagne). Bande d'une relique : 5 à 15, 20 au plus.

| Idée | Règle essayée | Nu : moyenne (plus faible, plus fort) | **Construit : moyenne (plus faible, plus fort)** | Avis |
| --- | --- | --- | --- | --- |
| **R58 · l'aura d'entrée** (« Clairon du héraut ») | à son premier tour, son aura de départ (sa face 1) se pose | +13,6 (Aldric +6,2, Brokk +21,6) | **+9,7** (Thaldrin +7,5, Brokk +12,1) | **Oui.** Dans la bande chez tous les builds ; elle ne devient pas obligatoire grâce au rendez-vous du 3e tour (sans lui, mesurée +15 à +26, `AURAS.md` § 2.5). À offrir après les premiers nœuds (nue, Brokk +21,6). |
| **R57 · sceller une face adverse** (« Sceau ») | tous les 3 tours, la face du **dernier jet adverse** est scellée 2 tours : un jet sur elle ne fait que son coup de base | +4,8 | +4,5 (Morgrut +3,6, Ysolde +5,9) | Sous la bande. |
| **R57 · Sceau long** | même chose, scellée **3 tours** (toujours une face scellée) | +5,6 | **+6,9** (Morgrut +5,3, Ysolde +8,9) | **Oui, cette version** : on voit l'adversaire tomber sur la face qu'il vient de jouer, sans compétence. Lisible (un cadenas sur le sceau de la face dans la barre adverse). Aussi possible en compétence d'Ombre (la maîtrise de « l'adversaire perd son dé », `AURAS.md` § 5.3). |
| R57 · « perdre une face » (le plafond) | la face 2 adverse (sa signature) scellée tout le combat | +20,7 (Ervald +26,7) | +11,9 (Elaria +10,4, Ysolde +13,9) | **Non** en relique : dans la bande construit, mais subir la perte de sa signature tout un combat est la frustration qu'on évite ; et nu, +20,7. |
| **R57 · son propre dé** (« Dé de joueur ») | une fois par tour, un jet sur une **face nue** se relance | +17,1 (Thaldrin +9,9, Brokk +22,2) | **+5,0** (Ysolde +2,4, **Morgrut +14,1**) | **Oui, comme relique du début de partie** : elle vaut beaucoup sur un dé vide et s'éteint à mesure que le dé se remplit (Morgrut, 4 faces de compétence, garde 2 faces nues : +14,1). Une relique qui récompense de la garder longtemps vide, à l'opposé des autres : un choix. |
| **R59 · l'enrage au critique reçu** (« Rage ») | chaque critique reçu, +5 Ferveur (son prochain coup qui touche) | +12,6 | **+8,7** (Elaria +5,7, Aldric +10,4) | **Oui.** Lisible (« il prend un critique, il rend coup pour coup »), dans la bande ; demande une fenêtre « critique reçu » au moteur (le défenseur n'en a pas aujourd'hui). |
| **R59 · Rage montante** | chaque critique reçu, +2 à tous ses coups jusqu'à la fin, 3 fois au plus (+6) | +15,2 | **+11,3** (Elaria +7,3, Aldric +14,9) | **Oui, en aura** plutôt qu'en relique : c'est un moteur (il monte), la place d'une aura de Fureur ; la Rancœur de Morgrut (+3 Ferveur à chaque coup reçu) en est la cousine à surveiller. |
| R59 · Rage du désespoir | sous la moitié de ses PV, +6 à tous ses coups jusqu'à la fin, une fois | +29,1 | +16,8 (Elaria +12,3, Aldric +20,3) | Non : trop forte. |
| R59 · Rage du désespoir (+4) | sous la moitié, +4 à tous ses coups | +22,7 | +12,7 (Elaria +9,1, Gorak +15,6) | En variante seulement : dans la bande construite, au-delà de 20 nue ; la relique de seuil donne aussi des retours (`AURAS.md` § 2.3, variante I). |

L'existant à garder en tête : la **Malchance** (Ombre) fait déjà tomber à vide le prochain jet adverse sur une compétence ; le **Dé pipé** et la **Patte de lièvre** agissent déjà sur la chance du porteur (sa pièce). Les idées ci-dessus sont des règles nouvelles (face scellée, relance, fenêtre « critique reçu ») : chacune demande son étape au moteur, ses tests et son contrôle d'audit, puis son icône peinte et ses textes.

## 7. Questions à l'utilisateur

- **Q1 (R13, R14, R16, R29)** : **S2, le Doublé** (un dé de plus est un dé de frappe ; même face que le dé de compétence : sa compétence repart) ? Ou S1 (jamais de compétence sur un dé de plus), ou S3 (chaque source choisit son dé) ?
- **Q2 (R14)** : à l'écran, le dé de compétence à la couleur du camp et **tous** les dés de plus en blanc (dés de frappe), le doublé qui se retourne en doré ?
- **Q3 (R8)** : Pièce de la rafale inchangée (+17,9) et son rythme raccourci, ou pile = 1 coup (+10,5 à +13,5) ?
- **Q4 (R12)** : **A2·7** (l'aura purgée se rallume au début du 2e tour suivant de son porteur ; Purification 5 → 7 quand elle retire un bonus) ? Ou A2·8 (« blesse toujours de 8 », plus simple, Ysolde +3) ?
- **Q5 (R57, R58, R59)** : lesquelles entrent au catalogue (nouvelles reliques, nouvelles règles du moteur) : le **Clairon du héraut** (+9,7), le **Sceau long** (+6,9), le **Dé de joueur** (+5,0, fort en début de partie), la **Rage** au critique reçu (+8,7) ; et la **Rage montante** en aura de Fureur (+11,3) ?
