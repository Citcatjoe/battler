# Faire vivre les auras, l'Aura du dé pipé, les dés de plus

_Étude du 2026-10-27 (second retour de l'utilisateur, points B11, B12 et B13), sur la branche `regles-v2` en 0.121.0. **Rien n'est livré au jeu** : ce sont des propositions mesurées, à trancher par l'utilisateur. Laboratoire : séries 76 à 78 de `scripts/lab/ideas.ts` (§ 6). Le contexte des auras de départ est dans [MAITRISES.md](MAITRISES.md) § 5 et § 10._

> **Livré le 2026-10-27 (troisième retour, C2 et C3)** : la règle du 3e tour (§ 2.6) avec la Purification à +5 quand elle retire un bonus, et l'Aura du dé pipé « pile, critique et esquive » (§ 3.3). Règle : [RESOLUTION.md](RESOLUTION.md) § 2, phase 1, étape 4 ; mesures de la livraison : § 2.7 et § 3.4. La lisibilité n'a pas pris le statut d'attente du § 2.6 : la pose d'office est une étape à elle au début du tour (élan, « Aura éveillée » sur le porteur, son de l'aura, ligne du journal).

## 0. En bref

- **Le constat** : l'aura de départ, sur le 1, n'est là qu'au tiers de ses actions (38,5 %), et **ne vient jamais dans 27,8 % des combats** (Thaldrin : 50,3 %, son 1 ne compte qu'en forme humaine). Un personnage sur quatre combats joue sans son identité.
- **B11, recommandation** : une règle pour tous, **« son aura de départ se pose d'elle-même au début de son 3e tour si elle n'est pas déjà là »** ; le 1 reste le chemin rapide (et une charge de plus pour les auras cumulables). Présence 38,5 → 72,3 %, jamais 27,8 → 0,1 %, combats 14,8 → 14,3 tours. Seule Ysolde décroche (48,3 → 41,2 %) : sa Purification retire l'aura adverse au lieu de blesser. Avec la Purification qui blesse aussi de 5 quand elle retire un bonus (une valeur de compétence, pas une exception) : **roster 44,4 – 53,4 %** (aujourd'hui 45,2 – 54,7 %), écart-type 2,8 → 3,0 points, pire duel 62,7 %. La relique R5 (l'aura dès le début) tombe alors de +12,8 / +23,5 à **+5,2 / +13,4** : une relique ordinaire, plus une obligation.
- **B12, recommandation** : l'Aura du dé pipé, **« +25 % de chances de faire pile, et +5 % de critique et d'esquive, par charge »**. Sans pièce, celle du registre ne vaut rien (gravée chez Fanchon +0,6, Elaria +0,7) ; celle-ci vaut +7,6 à +11,2 gravée et tient le départ de Naraxes (41,2 → 49,1 %). Variante à un seul second effet, comme le demandait l'utilisateur : +10 % de critique (départ 48,0 %, gravée +5,7 à +9,5).
- **B13** : trois sortes de dés de plus, chacune avec son aspect (le dé complet, le dé brut, le dé d'effet), et une forme par maîtrise (§ 5). Idées seulement.

## 1. La demande

> « La relique qui active les auras : je comprends ton point. Comment proposer des auras. Si la relique est obligatoire, ça devient trop déséquilibrant de ne pas l'avoir ; à l'autre extrême, les auras qui font partie de l'identité d'un personnage peuvent souvent ne pas se déclencher du tout et faire tomber à l'eau la personnalité attendue. Comment fine-tuner ceci ? Aura active pour tous dès le départ ? Fixer des conditions plus accessibles ? Un nombre de tours, une autre condition ? »
>
> « Le dé pipé pourrait avoir double effet ? Augmente les chances de bonne face ET de crit ou esquive ? Ou alors une autre proposition ? »
>
> « Plusieurs dés bonus, oui c'est lisible […] Naraxes en a eu jusqu'à 6 dans une run et c'était lisible. Cette mécanique de plusieurs dés bonus est sympa, à voir comment on peut la décliner dans différentes maîtrises de manière un peu différente. »

Principes du même retour, appliqués ici : une règle vaut pour tous, sans exception par personnage ; aucune compétence nouvelle n'est inventée (on adapte l'existant) ; la progression actuelle (forge, offres, Graver à deux cartes) reste.

## 2. B11 : faire vivre les auras

### 2.1 Le constat (roster de la 0.121.0, aura par défaut sur le 1)

Un combat dure 14,8 tours (les deux camps), soit environ 7 actions chacun : la chance de ne jamais faire 1 est (5/6)^7 ≈ 28 %. Mesuré (série 76, 3 600 combats par personnage) :

| Personnage | Aura sur le 1 | Présence (part de ses actions où il la porte) | Combats sans elle |
| --- | --- | --- | --- |
| Gorak | Aura d'ivresse | 36,8 % | 26,8 % |
| Elaria | Feinte | 42,3 % | 23,6 % |
| Brokk | Aura d'épines | 40,4 % | 22,6 % |
| Ervald | Aura glaciale | 40,9 % | 21,9 % |
| Ysolde | Aura de sainteté | 43,6 % | 28,8 % |
| Naraxes | Aura de décoction | 37,2 % | 28,8 % |
| Aldric | Aura de vindicte | 36,4 % | 29,6 % |
| Morgrut | Aura de puissance | 37,1 % | 26,3 % |
| Thaldrin | Aura d'orage | 24,5 % | 50,3 % |
| Fanchon | Aura de ballade | 45,8 % | 19,2 % |
| **Moyenne** | | **38,5 %** | **27,8 %** |

C'est le « tomber à l'eau » de l'utilisateur, chiffré. La relique R5 qui pose l'aura au début vaut, sur ce roster, **+12,8 (Ysolde) à +23,5 (Brokk)** points (série 77, moyenne +18,9) : bien au-dessus de la bande d'une relique (5 à 15), donc obligatoire ([MAITRISES.md](MAITRISES.md) § 10).

### 2.2 Les options mesurées

**Méthode** (série 76) : chaque option est une **règle pour tous** : le personnage et tous ses adversaires la reçoivent, chacun avec l'aura de son dé vanilla. 400 combats par duel, 3 600 par personnage, mêmes graines avant et après (écart apparié ± 1 à 2 points). Les règles sont émulées avec les déclencheurs existants (`combatStart`, `naturalMax`, `hurt`, `bloodied`, conditions `lacksStatus`) ou une relique d'essai au début d'un tour ; une règle livrée vivrait dans le moteur. Rapport : `logs/lab/2026-10-27-15-41-03_v0.121.0.md`.

| Option | Taux (min – max) | Écart-type | Pire duel | Tours | Présence | Jamais | Retours |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Aujourd'hui | 45,2 – 54,7 % | 2,8 pts | — | 14,8 | 38,5 % | 27,8 % | 60,7 % |
| A. Posée au début, le 1 la repose (R5 pour tous) | 41,6 – 58,1 % | 4,6 | 67,3 % | 13,6 | 95,8 % | 0,0 % | 56,2 % |
| B. Posée au début, le 1 nu | 42,9 – 59,5 % | 5,0 | 69,3 % | 14,1 | 95,0 % | 0,0 % | 60,0 % |
| C. Posée au début, le 1 joue la face 2 | 32,7 – 69,1 % | 10,0 | 82,5 % | 13,0 | 93,0 % | 0,0 % | 55,3 % |
| D. Éveil : posée au début pour 3 tours, un 1 la rend permanente | 41,6 – 55,5 % | 3,9 | 65,5 % | 14,0 | 62,4 % | 0,0 % | 56,9 % |
| E2. Au plus tard à son 2e tour | 40,9 – 56,2 % | 4,5 | 66,0 % | 14,0 | 83,1 % | 0,0 % | 57,9 % |
| **E3. Au plus tard à son 3e tour** | **41,2 – 54,5 %** | **4,2** | **65,0 %** | **14,3** | **72,3 %** | **0,1 %** | **59,2 %** |
| E4. Au plus tard à son 4e tour | 41,9 – 54,6 % | 4,1 | 64,0 % | 14,5 | 63,5 % | 0,6 % | 60,0 % |
| F. Le 1 et le 6 la posent | 42,0 – 54,5 % | 3,9 | 64,0 % | 14,2 | 57,7 % | 7,8 % | 56,9 % |
| G. Le 6 la pose si elle n'est pas là | 42,4 – 53,3 % | 3,4 | 64,8 % | 14,5 | 58,2 % | 7,6 % | 59,3 % |
| H. Le premier coup encaissé la pose si elle n'est pas là | 41,1 – 56,6 % | 4,8 | 67,5 % | 13,9 | 88,4 % | 0,0 % | 58,4 % |
| I. Sous la moitié de ses PV, elle se pose si elle n'est pas là | 42,5 – 55,9 % | 3,9 | 65,3 % | 14,7 | 54,6 % | 1,0 % | 63,3 % |
| **E3, Purification +5 au retrait (le paquet recommandé)** | **44,4 – 53,4 %** | **3,0** | **62,7 %** | **14,2** | **72,4 %** | **0,1 %** | **59,0 %** |

« Au plus tard à son N-ième tour » : au début de ce tour, avant son jet, l'aura se pose si elle n'est pas là (une fois par combat). Retours : part des combats gagnés après être passé sous 30 % de ses PV (moyenne des dix).

Écart de chaque personnage (points, avant → après la règle, ± 1 à 2) :

| Option | Gorak | Elaria | Brokk | Ervald | Ysolde | Naraxes | Aldric | Morgrut | Thaldrin | Fanchon |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. R5 pour tous | +1,4 | −1,5 | +6,3 | +1,1 | −6,7 | +3,4 | −3,0 | +3,9 | −2,4 | −2,4 |
| B. Posée, le 1 nu | +2,0 | +2,6 | +0,7 | −2,3 | −3,2 | −3,1 | −0,2 | +5,6 | +4,9 | −7,1 |
| C. Posée, le 1 joue la face 2 | +0,8 | −5,6 | +4,4 | −0,3 | +2,4 | −5,0 | +7,4 | −16,3 | −7,0 | +19,1 |
| D. Éveil 3 tours | +0,9 | −0,3 | +3,8 | +3,2 | −6,7 | +2,9 | −2,2 | +0,8 | −1,1 | −1,3 |
| E2. Au plus tard au 2e | +1,5 | −0,8 | +4,4 | −0,6 | −7,4 | +2,0 | −1,3 | +4,8 | −2,1 | −0,6 |
| **E3. Au plus tard au 3e** | +1,4 | +0,3 | +2,3 | −1,3 | **−7,1** | +1,5 | −0,8 | +4,1 | −0,1 | −0,3 |
| E4. Au plus tard au 4e | +1,3 | +0,1 | +1,8 | −1,4 | −6,4 | +0,7 | −0,1 | +4,9 | −0,6 | −0,4 |
| F. Le 1 et le 6 | +1,9 | +0,4 | +2,8 | −0,2 | −6,3 | +3,3 | −4,1 | +3,5 | −5,6 | +4,4 |
| G. Le 6 si absente | +2,0 | +1,4 | +1,5 | −0,2 | −5,9 | +0,9 | −1,8 | +4,2 | −2,7 | +0,5 |
| H. Premier coup encaissé | +1,4 | −3,0 | +4,8 | +0,9 | −7,2 | +1,9 | −2,0 | +5,3 | −1,1 | −1,1 |
| I. Mi-PV | +1,4 | +0,3 | −0,1 | −1,1 | −5,8 | 0,0 | −0,2 | +3,1 | +1,2 | +1,2 |
| **E3 et Purification +5** | +0,8 | −0,8 | +1,0 | −2,4 | **+1,6** | +0,6 | −1,6 | +3,1 | −1,2 | −1,2 |

### 2.3 Lecture, option par option

Chaque option est jugée sur quatre axes : l'identité (l'aura se voit-elle ?), l'équilibre, la progression (ce qu'une relique ou une forge peut encore améliorer), la lisibilité.

- **A. Posée au début, le 1 la repose** (la relique R5 pour tous). Identité parfaite (95,8 %). Équilibre : l'écart-type double (2,8 → 4,6), Brokk +6,3 (ses Épines cumulables reçoivent une charge à chaque 1 en plus), pire duel 67,3 % (Brokk–Elaria), au-delà de 65/35 ; les combats raccourcissent de 1,2 tour (−8 %, à l'opposé de l'étude de la longueur des combats, B16) et les retours baissent (60,7 → 56,2 %). Progression : la relique R5 n'a plus d'objet. Lisibilité : l'utilisateur a déjà refusé une aura qui part à l'entrée en scène, sans face (Aura mélodieuse : « elle se déclenche en entrée de combat, il faut cesser ceci », retour du 27 octobre) ; il faudrait une mise en scène d'entrée. **Écartée.**
- **B. Posée au début, le 1 nu.** Identité parfaite, mais l'aura quitte le dé : la règle V4 (« l'aura, toujours sur le 1 ») tombe, et le dé de départ n'a plus qu'une face. Équilibre : écart-type 5,0, Fanchon −7,1, Thaldrin +4,9 (59,5 %, hors tolérance). Progression : la face 1 devient une face libre à graver, soit une gravure gratuite (+8 à +20 points) dès le premier combat de campagne. **Écartée.**
- **C. Posée au début, le 1 joue la face 2.** Une face 2 doublée, c'est doubler la signature : Fanchon +19,1 (deux Duos), Morgrut −16,3 (sans signature, son 1 devient nu), pire duel 82,5 %. **Écartée.**
- **D. Éveil de 3 tours.** Une aura qui part d'elle-même au bout de trois tours se lit mal (« pourquoi a-t-elle disparu ? ») et ne tient que 62 % de présence. **Écartée.**
- **E. Au plus tard à son N-ième tour.** Identité : jamais → 0 ; présence 63 à 83 % selon N. Le 1 garde son rôle (l'aura plus tôt, et une charge de plus pour les cumulables). Équilibre : le roster bouge peu, sauf Ysolde (§ 2.4) et Morgrut (+4,1, son Aura de puissance cumulable à 3 charges). Combats : −0,5 tour au 3e, −0,8 au 2e. Progression : une relique ou une forge peut encore avancer l'aura (§ 2.5). Lisibilité : un rendez-vous fixe, le même pour tous, qui se montre (§ 2.6). **Retenue, au 3e tour** : le 2e tour donne plus d'aura (83 %) mais raccourcit plus et creuse plus l'écart (40,9 – 56,2 %) ; le 4e laisse l'aura absente plus longtemps (63 %).
- **F, G. Le 6 aussi.** Ne règle pas le « jamais » (7,6 à 7,8 % des combats). F double les charges des auras cumulables (Thaldrin −5,6, Aldric −4,1 : leurs adversaires en profitent davantage). **Écartées.**
- **H. Le premier coup encaissé.** Presque une aura d'entrée (88 %, le premier coup tombe au tour 1 ou 2), avec la même baisse des combats (−0,9 tour) ; se lit bien pour une aura qui répond (Aura d'épines, Aura de rancœur), mal pour une aura offensive (Aura d'ivresse). **Écartée.**
- **I. Sous la moitié de ses PV.** La seule qui **allonge le spectacle** : retours 60,7 → 63,3 %, fins serrées 40,4 → 42,4 %, durée inchangée (14,7). Mais l'identité arrive tard (présence 54,6 %), et une aura de comeback n'est pas une aura d'identité. **Gardée en variante** (si l'utilisateur préfère le retournement à la présence), ou comme forme d'une relique de seuil plus tard.

### 2.4 La cause commune : Ysolde

Toutes les règles qui rendent les auras plus présentes coûtent 6 à 7 points à Ysolde. Ce n'est pas son aura : **reçue seule**, la règle du 3e tour lui rapporte **+8,0** (48,3 → 56,3 %, série 77). C'est **l'aura de ses adversaires** : sa Purification (face 2) retire un bonus adverse, et ne blesse (8 dégâts) que s'il n'y en a aucun. Quand les adversaires portent leur aura 72 % du temps au lieu de 38 %, elle blesse beaucoup moins souvent : environ −15 points du fait des adversaires.

Le levier (une valeur de sa compétence, pas une exception) : la Purification blesse aussi quand elle retire un bonus. Avec la règle du 3e tour (série 77, `logs/lab/2026-10-27-15-44-05_v0.121.0.md`) :

| Purification, quand elle retire un bonus | Ysolde | Pire duel |
| --- | --- | --- |
| rien (aujourd'hui) | 41,2 % | Morgrut 35,0 % |
| +3 dégâts | 46,8 % | Elaria 59,0 % |
| **+5 dégâts** | **49,9 %** | Elaria 62,7 % |
| +8 dégâts (retire et blesse toujours) | 54,6 % | Elaria 67,3 % |

Sans bonus en face, elle blesse toujours de 8 (inchangé). **+5** remet Ysolde à son niveau d'aujourd'hui (48,3 %) ; sans la règle, la Purification +3 seule la mettrait à 51,7 %. La Purification à 6 puis 8 est une valeur fixée avec l'utilisateur (0.115.1, puis le réglage de la vague 2) : **à lui de trancher** (question Q-A1, § 7).

### 2.5 La progression avec la règle

La relique R5 (l'aura posée dès le début), mesurée sans la règle puis dans un roster qui la porte (série 77, `logs/lab/2026-10-27-15-43-10_v0.121.0.md`, 3 600 combats par ligne) :

| Personnage | R5 aujourd'hui | R5 avec la règle du 3e tour |
| --- | --- | --- |
| Gorak | +15,8 | +8,5 |
| Brokk | +23,5 | +13,4 |
| Ervald | +19,7 | +12,2 |
| Naraxes | +18,8 | +11,1 |
| Ysolde | +12,8 | +5,2 |
| Morgrut | +22,6 | +11,7 |
| **Moyenne** | **+18,9** | **+10,4** |

La règle divise sa valeur par deux et la ramène dans la bande d'une relique (5 à 15) : elle peut entrer au catalogue comme une relique ordinaire (la piste R5 de [RELIQUES.md](RELIQUES.md) § 17 ; « Clairon du héraut » est son nom d'essai au laboratoire), sans devenir obligatoire. Les autres leviers de progression ne changent pas : aiguiser l'aura (son rang), la graver sur une seconde face (une charge de plus pour les cumulables, une face de plus pour la poser tôt), Copier, Refondre. La règle ne lit que la face 1 : si le joueur grave autre chose sur son 1, il renonce à la garantie (un choix, pas une exception).

### 2.6 La recommandation

**La règle** (pour tous, tournoi, saison, campagne et duel) : _« Son aura de départ arrive au plus tard à son 3e tour. »_ Au début de son 3e tour, avant son jet, si la compétence d'aura de sa face 1 n'a pas encore posé son aura (ou si on la lui a retirée), elle la pose, une fois par combat. Un 1 la pose plus tôt, et pour une aura cumulable chaque 1 ajoute une charge, comme aujourd'hui.

**Avec elle** : la Purification blesse de 5 quand elle retire un bonus (8 sans bonus, inchangé), si l'utilisateur l'accepte (Q-A1).

**Ce qu'elle donne** : présence de l'aura 38,5 → 72,4 %, combats sans aura 27,8 → 0,1 % (Thaldrin 50,3 → 0,0 %) ; roster 44,4 – 53,4 % (écart-type 2,8 → 3,0, pire duel 62,7 %) ; combats 14,8 → 14,2 tours ; retours 60,7 → 59,0 %. Morgrut monte de 3,1 points (52,0 %) : dans la tolérance, à surveiller au `npm run balance`. Le tirage d'aura du tournoi (B7) en profite : l'aura tirée se voit dans quasi tous les combats, et les cotes, simulées par le moteur, en tiennent compte d'elles-mêmes.

**La lisibilité** (à concevoir avec la mise en scène, rien n'est fait) : le rendez-vous se montre avant d'arriver. Une piste qui respecte « aucune règle dans l'écran » : le moteur pose au début du combat, chez chacun, un statut d'attente qui porte l'icône de son aura, éteinte, avec sa durée en tours (« dans 2 tours ») ; à son échéance, la compétence d'aura de la face 1 part comme sur un 1 (même scène, même son, [SONS.md](SONS.md) : le son se déduit de l'effet). Le compendium dit, dans la règle des auras : « Votre aura arrive au plus tard à votre 3e tour ; un 1 la pose plus tôt. » Le journal : « Début du 3e tour d'Ysolde : son aura s'éveille. »

**Pour la livrer** (une fois décidée) : la règle dans [RESOLUTION.md](RESOLUTION.md) (phase de début de tour, son ordre avec les reliques de tour, dont le Chapelet de l'ermite et la Chandelle de veille au tour 3), puis le moteur (`combat.ts`), son test dans `combat.test.ts`, son contrôle dans `audit.test.ts` (« aura de départ absente après le début de son 3e tour »), [STATUTS.md](STATUTS.md) si un statut d'attente est créé, la mise en scène et le compendium ; enfin `npm run balance` (l'empreinte bouge : changement voulu), `npm run ramp`, `npm run campaign`.

### 2.7 La livraison (2026-10-27, C2)

- **Moteur** : `combat.ts`, au début du tour, après les statuts et la fenêtre `turnStart` (reliques de tour comprises), avant l'action : `startAuraOf` (la compétence de la face 1, si elle ne pose qu'une aura sur son lanceur et que le personnage a des auras de départ) part avec le déclencheur `auraDue` si son aura n'est pas là, au 3e tour de son porteur (`AURA_DUE_TURN`), une fois par combat. Le druide : sous sa forme où le 1 ne vaut pas, le rendez-vous attend son tour suivant. Un personnage de test (sans `startAuras`) n'a pas de rendez-vous.
- **Purification** : un effet `andThen` sur la purge (`events.ts`), joué juste après une purge qui a retiré quelque chose : 5 dégâts directs de Lumière (`PURIFICATION_STRIP`) ; 8 sans bonus (`orElse`, inchangé). Son rang n'aiguise que la lumière de repli (+3), comme avant.
- **Écran** : l'étape se montre comme une compétence (élan, sceau qui s'allume, son de l'aura déduit de l'effet), avec « Aura éveillée » sur le porteur ; le journal : « Début du 3e tour d'Ysolde : son aura s'éveille. Compétence · … » ; la trace : « (au début de son 3e tour, son aura de départ absente) ». Rien vu ni entendu (aucun navigateur) : à juger en jeu.
- **Contrôles** : `combat.test.ts` (la pose, une fois, au 3e tour, avant l'action ; l'aura là à la première action du 3e tour ; un 1 plus tôt ; journal et trace ; Purification), `audit.ts` (« aura de départ absente après le début de son 3e tour », pose d'office mal placée), `staging.test.ts` (le moment de la pose).
- **Mesure** (0.122.0 sans le lot C1 ni la récompense de PV, mesurée sur une copie de travail à part, `BALANCE_N=400 npm run balance`, 400 combats par duel, ± 1,6 point ; avant `logs/balance/2026-10-27-16-44-07_v0.122.0.md`, après, avec C2 et C3 : `…16-47-24…`) : roster 45,2 – 54,7 → **44,2 – 53,4 %** ; pire duel 60,8 % (Aldric contre Elaria) → **64,7 %** (Ysolde contre Elaria, sous 65/35) ; combats 0,4 à 1,0 tour plus courts (Gorak 14,1 → 13,1, Ysolde 15,2 → 15,0). **Ysolde 48,3 → 51,1 %** (Purification +22,1 → +28,2 points, Aura de sainteté +12,2 → +17,9) ; Morgrut 48,9 → 51,7 % (Aura de puissance +24,4 → +35,6) ; en bas, Elaria 45,2 → 44,2 % et Ervald 47,4 → 44,9 %, dans la tolérance. Les auras du 1 sortent 1,2 à 1,4 fois par combat → 1,8 à 2,3 (le 1 plus la pose d'office) ; Thaldrin, Aura d'orage 0,63 → 1,44.

## 3. B12 : l'Aura du dé pipé à double effet

### 3.1 Le constat

L'Aura du dé pipé est une aura de Chance depuis la 0.121.0 (« +25 % de chances de faire pile à ses pièces, par charge », M9). **Sans pièce, elle ne fait rien** : gravée sur le 3 nu, Fanchon +0,6, Elaria +0,7 ; Naraxes, qui n'a que Pile ou face, +3,8 (bande d'une gravure : 8 à 20). Au départ de Naraxes elle la laisse à 41,2 % (retirée de ses auras de départ en 0.121.0). Or le point B5 du même retour donne à chacun **toutes les auras de ses deux maîtrises** comme auras de départ, sans exclusion, et la Chance compte désormais Elaria, Naraxes et Fanchon (B1, [MAITRISES.md](MAITRISES.md) « Huit maîtrises ») : l'Aura du dé pipé devient une aura de départ des trois, dont deux sans pièce. C'est l'une des « consommatrices mortes au départ » que l'état des lieux (B6) dit irréparables par une valeur ; le second effet change sa règle, et la répare en partie.

### 3.2 Les variantes mesurées

Série 78, 400 combats par duel, `logs/lab/2026-10-27-15-43-43_v0.121.0.md` (départ d'Elaria : `…15-50-08…`). Chaque variante garde la chance de pile du registre (+25 % par charge, plafond 5 sur 6) et ajoute un second effet par charge. Départ : sur le 1 du dé vanilla, avec sa face 2 (Pile ou face, le Duo, l'Œil de faucon), contre leur dé d'aujourd'hui (Naraxes 49,8 %, Fanchon 50,0 %, Elaria 45,2 %). Gravé : sur le 3 nu de leur dé vanilla.

| Aura du dé pipé | Départ Naraxes | Départ Fanchon | Départ Elaria | Gravé Naraxes | Gravé Fanchon | Gravé Elaria |
| --- | --- | --- | --- | --- | --- | --- |
| registre (pile seule) | 41,2 % | 36,1 % | 29,2 % | +3,8 | +0,6 | +0,7 |
| pile, puis chaque pile : un Critique assuré | 43,4 % | 36,1 % | 29,2 % | +5,7 | +0,6 | +0,7 |
| et +5 % de critique | 44,6 % | 39,6 % | 33,1 % | +6,8 | +3,4 | +3,4 |
| et +5 % d'esquive | 46,0 % | 39,4 % | 35,2 % | +8,8 | +4,8 | +6,7 |
| et +10 % de critique | 48,0 % | 41,9 % | 36,2 % | +9,5 | +5,8 | +5,7 |
| **et +5 % de critique et d'esquive** | **49,1 %** | **43,2 %** | **39,3 %** | **+11,2** | **+7,6** | **+9,1** |

Marges : ± 1,0 à 1,4 point. Pire duel de la recommandée, gravée chez Naraxes : Ysolde 53,5 → 68,0 % (un duel déjà penché). Le départ d'Elaria reste bas quelle que soit la variante : sur le 1, toute aura autre que la Feinte lui retire sa boucle esquive → critique (Aura de veine 38,7 %, Pas de côté 39,0 % au même relevé B5) ; c'est son dé, pas l'Aura du dé pipé.

### 3.3 La recommandation

**« Aura du dé pipé : +25 % de chances de faire pile, +5 % de critique et +5 % d'esquive, par charge. »** La chance penche de son côté partout où le hasard décide : la pièce, le coup, l'esquive. C'est la seule variante qui vaut une gravure chez les trois hôtes (+7,6 à +11,2) et qui tient le départ de Naraxes (49,1 %) ; celui de Fanchon reste au bas de la tolérance (43,2 %, mesuré avec le Duo d'avant B10 : à remesurer), celui d'Elaria en dessous (39,3 %, comme ses autres auras de Chance). Mêmes id et icône (l'héritage et les forges enregistrées gardent leurs gravures).

**Si l'utilisateur veut un seul second effet** (sa formulation) : **+10 % de critique** (départ 48,0 %, gravé +5,7 à +9,5) plutôt que l'esquive (départ 46,0 %). La pièce qui donne un Critique assuré est écartée : sans pièce, rien.

**Risque** : le critique se cumule avec les reliques de critique d'Elaria (Plume d'aigle, déjà au-dessus de la bande chez elle, [MAITRISES.md](MAITRISES.md) § 17), qui joue la Chance depuis B1 : à surveiller au `npm run ramp`.

**Autre proposition, non mesurée** (elle demande un crochet du moteur qui n'existe pas) : un dé pipé l'est sur le dé lui-même, « +1 chance sur 6 que son dé fasse 6 ». Il nourrirait tout ce qui lit le 6 (la Veine, le Dard de guêpe et le Briquet d'amadou, les faces gravées) ; mais il pèse sur le dé entier, donc sur chaque face gravée, et se lit mal à l'écran (un 6 de plus ne se remarque pas). Gardée pour plus tard.

### 3.4 La livraison (2026-10-27, C3)

Livré tel que recommandé : `LOADED_DIE_EDGE = 0.05`, critique et esquive par charge (`modifyStats`), rang compris (une charge de plus). Il attend toujours une pièce pour s'offrir et pour être une aura de départ (`hooks.ts` : il consomme `moment:heads`, produit aussi `moment:crit` et `moment:dodge`) : il reste au départ de Naraxes seul. Mesures après C2 (0.122.0 sans C1, 400 combats par duel) :

| Mesure | Résultat | Bande |
| --- | --- | --- |
| Gravé sur le 3 (`SKILLS_ENGRAVE=loaded-die SKILLS_PART=engrave`, dix hôtes) | **+7,8** en moyenne, de +6,6 (Fanchon, Aldric) à +10,0 (Gorak) ; Naraxes +9,3 | 8 à 20 : au bord bas |
| Départ de Naraxes (Aura du dé pipé sur le 1, contre le roster) | **49,0 %** (dé vanilla 50,7 %) | 42 à 58 : dedans |
| Départ de Fanchon (essai : sans pièce, ce n'est pas une de ses auras de départ) | 41,1 % (dé vanilla 48,5 %) | sans objet |
| Départ d'Elaria (même essai) | 33,7 % | sans objet |

**Gardé à +5 % / +5 %** : la réduction à +3 % / +3 % était prévue pour une Aura du dé pipé trop forte ; elle est au bord bas de la bande des gravures, et la réduire l'en sortirait. Signalé pour le réglage (C5) : au besoin, la relever plutôt que la réduire.

## 4. Ce qui n'est pas mesuré (B11 et B12)

- Les mesures ont tourné sur la 0.121.0 **pendant que d'autres agents modifiaient le moteur et le roster** (Critique assuré à une charge, B8 ; regroupement des maîtrises, B1 et B5 ; Duo, B10). Les écarts appariés (mêmes graines, même code) tiennent ; les taux absolus sont à reprendre après l'intégration.
- Une seule aura par personnage (celle du dé vanilla), pas les autres auras de départ (B5) ni le tirage du tournoi (B7). La règle ne répare pas une aura de départ qui consomme une ressource que son dé ne produit pas (B6, point 5 : Aura de vindicte chez Brokk, Sentence chez Ysolde…) : posée au 3e tour, elle ne fait pas plus que sur un 1. C'est la règle « le producteur d'abord » proposée en B5 qui le peut.
- La montée (`npm run ramp`), la campagne et la saison avec la règle ; la Purification à +5 sans la règle (seul +3 l'a été : 51,7 %).
- Rien n'a été vu à l'écran ni entendu : la lisibilité du rendez-vous du 3e tour est une proposition.

## 5. B13 : plusieurs dés de plus, décliné par maîtrise

Idées seulement : rien n'est ajouté au jeu, aucune brique n'est créée.

### 5.1 Ce qui existe

Deux formes de dés de plus vivent déjà dans le moteur :

| Forme | Ce que fait chaque dé | Sources aujourd'hui | Moteur |
| --- | --- | --- | --- |
| **Le jet complet**, à sa prochaine action | sa face (la compétence de la face), puis son coup, critique et esquive compris | Coup de chance, Veine (chaque 6), Pièce trouée (chaque pile), le Duo jusqu'à B10 | `extraStrikes`, `strikeCharges: 'all'` |
| **Le coup brut**, tout de suite | un coup de base, sans compétence de face | Furie des vents (2), Curée (3 par charge, si l'adversaire saigne), Ivresse du sang (2 par critique) | `extraStrikes`, `instantStrikes` |

Le jet complet est la forme la plus forte : le Duo à trois charges l'a montré (B10, « beaucoup trop fort »). L'utilisateur a trouvé lisibles jusqu'à six dés de plus chez Naraxes.

### 5.2 Une grammaire en trois dés

Pour que plusieurs sortes de dés restent lisibles, **l'aspect d'un dé dit sa règle**, partout :
1. **Le dé complet** (blanc, ses points) : il rejoue une action entière. Réservé à la Chance.
2. **Le dé brut** (rouge) : il frappe, rien d'autre. La rafale.
3. **Le dé d'effet** (à la couleur de sa maîtrise, l'icône peinte de son statut à la place des points) : il ne frappe pas ; sa face devient une quantité de la ressource de sa maîtrise. Pas de critique ni d'esquive : il se lit d'un coup d'œil.

### 5.3 Une forme par maîtrise (les huit de B1)

| Maîtrise | Forme | Ce que fait chaque dé de plus | Ce qui pourrait le donner (l'existant à adapter) |
| --- | --- | --- | --- |
| **Chance** | dé complet | rejoue une action entière, à sa prochaine action | existe : Coup de chance, Veine, Pièce trouée |
| **Fureur** | dé brut, tout de suite | un coup de plus, dans la même action | existe : Furie des vents |
| **Sang** | dé brut, sous condition | un coup de plus seulement si l'adversaire saigne, ou après un critique ; chaque dé qui touche le fait saigner davantage | existe : la Curée (si l'adversaire saigne), l'Ivresse du sang (à chaque critique) |
| **Rempart** | dé d'effet, gardé | posé devant lui, il attend le coup adverse : sa face devient de l'armure temporaire, ou, avec les représailles qui y sont entrées (B1), elle est renvoyée à l'attaquant | la Peau de pierre en dés ; l'Aura de rancœur en dés (mis en réserve à chaque coup encaissé, lancés ensemble à son tour) |
| **Poison** | dé d'effet | sa face, divisée par deux, en Poison sur l'adversaire | le Souffle de la tombe en dés |
| **Lumière** | dé d'effet | sa face en PV ; sans PV à rendre, en dégâts de lumière (la logique de la Purification : ceci, sinon cela) | la Prière en dés |
| **Ombre** | le dé volé (le miroir) | un dé de moins pour l'adversaire : son prochain jet tombe à vide, ou il garde le pire de deux dés | la Malchance, la Peur |
| **Magie** | dé d'effet, en chaîne | sa face en dégâts directs (sans armure) ; un 6 en relance un | la Foudre en dés ; le Duo, qui y est entré (B1), en attend un remplaçant (B10) |

### 5.4 Les règles de lisibilité

1. **Une couleur, une règle** (§ 5.2), la même dans toutes les maîtrises.
2. **La source se voit** : le badge du statut sous le combattant (« +3d6 », comme la Veine aujourd'hui), avec son icône peinte.
3. **Un dé à la fois**, dans un ordre fixe ; au-delà de six, ils se regroupent (« +4 »).
4. **Un seul genre de dés de plus par action** : c'est déjà la règle du moteur (un seul statut de jets de plus part par action, l'autre attend).
5. **La force suit la forme** : complet > brut > effet. Chaque forme se mesure gravée au laboratoire avant d'entrer au jeu (bande 8 à 20), la plus forte avec le moins de dés.

## 6. Les mesures : outil et rapports

- **Outil** : le laboratoire, étendu pour l'occasion ([SORTS.md](SORTS.md) § 4) : `everyone` (la règle va aussi aux adversaires), `world` (une règle posée sur tout le roster, pour mesurer une relique dans ce monde), `presence` (la part de ses actions où il porte un statut). `LAB_SERIES=76`, `77` ou `78`, `LAB_N=400`.
- **Rapports** (`logs/lab/`) : série 76 `2026-10-27-15-41-03_v0.121.0.md` ; série 77 `…15-43-10…` (relique R5, Ysolde seule, Purification +3), `…15-44-05…` (Purification +3, +5, +8 avec la règle), `…15-44-46…` (le paquet recommandé, pour tous) ; série 78 `…15-43-43…` et `…15-50-08…` (départ d'Elaria ; le premier passage, `…15-39-27…`, n'avait ni les départs de Fanchon et d'Elaria ni la variante critique et esquive).

## 7. Questions à l'utilisateur

- **Q-A1** : la règle « au plus tard à son 3e tour » pour tous, et la Purification qui blesse de 5 quand elle retire un bonus (sa compensation) ? Variante : la règle seule (Ysolde à 41,2 %) ; ou « sous la moitié de ses PV » (plus de retours, moins de présence).
- **Q-A2** : le 3e tour, ou le 2e (plus d'aura, combats plus courts, roster plus écarté) ?
- **Q-A3** : l'Aura du dé pipé « pile, critique et esquive » (+5 % chacun), ou un seul second effet (+10 % de critique) ?
- **Q-A4** : la relique R5 (Clairon du héraut) au catalogue, une fois la règle livrée (+5 à +13) ?
- **Q-A5** : parmi les formes de dés de plus (§ 5.3), lesquelles explorer d'abord, et faut-il des dés de plus dans chaque maîtrise ?
