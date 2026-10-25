# Revue des auras et des compétences (2026-10-25, règles 0.117.1)

_Demandée par l'utilisateur : « Je veux qu'on fasse la revue des auras et compétences » ([PROGRESSION.md](PROGRESSION.md) § 1.10 : les auras s'insèrent-elles naturellement dans le nouveau jeu, et comment les rendre plus naturelles, utiles et synergiques ; valider, tester et auditer les compétences, en ajouter en pensant familles, avec des descriptions courtes et simples qui portent le fonctionnement). S'y ajoute la piste de la montée (§ 13.4). Même forme que [REVUE_CONTENU.md](REVUE_CONTENU.md) (0.109.1) : les décisions d'abord, le détail ensuite._

**Rien n'est changé dans le jeu.** Toutes les mesures viennent de scripts jetables (supprimés) et de séries de laboratoire étiquetées (retirées) ; chaque proposition est mesurée seule, avant → après, aux mêmes graines. L'utilisateur tranche.

## En bref

1. **Ce qui tient** : contre le roster nu, presque toutes les briques sont dans la bande (8 à 20 points gravées). Les auras de face généralistes et productrices valent toutes de +12,2 à +16,2 gravées : depuis que le coup de base part à chaque jet, une aura ne coûte plus son coup, c'est un bonus pur.
2. **Ce qui ne tient pas** : les **consommatrices**, à 0 hors de leur producteur, et sous 8 points chez lui pour la plupart (Sentence +5,8, Vindicte +5,5, Rempart hérissé +5,0, Virulence +5,2, Récolte +5,3, Curée chez Gorak +5,8, Dé pipé +7,5 ; l'Embrasement tient, +8,9), et quelques rangs II sous la bande chez leurs porteurs (Pourfendre, Vol de vie, Purification, Pile ou face, Feux follets). Le Duo sort par le haut (+30,6 dans le kit, drapeau « écrasante ») ; il n'est dans aucun répertoire, le drapeau ne vaut que pour Fanchon vanilla, qui reste dans la tolérance.
3. **Deux échelles de valeur** : chez les porteurs réels construits (48 builds par personnage), une brique vaut **40 à 60 % de sa valeur gravée**. Sept auras sur treize y sont sous les 8 points de la piste § 13.4 ; neuf compétences souvent prises aussi. Juger une brique sur sa gravure seule la surestime : la valeur chez le porteur réel devrait devenir un outil permanent (§ 13.4, étape 1).
4. **Le tempo des auras** : une aura de face est posée dans **69 à 78 % des combats**, au **3e ou 4e tour**, et **44 à 53 % des coups** partent sous elle. Gravée, elle vaut **56 à 84 %** de la même aura posée d'office. Le tempo reste lisible pour une aura cumulable (chaque pose monte d'une charge), pas pour une non cumulable : **36 à 46 % des poses de Puissance et d'Immunité ne font rien**.
5. **Les consommatrices meurent sur leur condition, pas sur leur montant** : Curée 0,23 fois par combat chez Gorak, Virulence 0,41 chez Ervald (0,20 chez Naraxes), Récolte 0,54 ; l'Embrasement, qui attend sa ressource, 0,95. Virulence, condition gardée et +2 : +7,1 ; sans condition et +2 : **+11,6**.
6. **Les producteurs d'une même ressource se gênent** sous les règles d'unicité (Esquive « une charge au plus », « la nouvelle Brûlure remplace l'ancienne », une pièce au plus) : Dé creux × Esquive améliorée **−0,61** (Fanchon), Briquet d'amadou × Feux follets **−0,64** (Ervald), Pièce de foire × Pile ou face **−0,45** (Fanchon). L'offre orientée les présente pourtant comme des paires liées.
7. **Aucune boucle Œil de faucon × Aura de précision mesurable** : **−0,09** en log-cote chez Elaria (± 0,07 de bruit), mesuré par les deux relecteurs. Cela contredit l'hypothèse de l'étude de la montée ([PROGRESSION.md](PROGRESSION.md) § 13.4, point 3 : « la seule vraie boucle multiplicative du jeu »). L'aura vaut chez Elaria par la valeur chez la porteuse construite (+15,2), pas par un écart à l'additivité : pour l'étape 3 de la piste, la bonne mesure est la valeur chez le porteur construit, pas la synergie P8.
8. **Sur cinq liens que les accroches promettent aux auras, deux se mesurent** (Sainteté → Sentence +0,32, Peau de pierre → Rempart +0,28). Le Gambison matelassé est le meilleur partenaire de 16 couples aura × porteur sur 24 : une aura rapporte par tour, ce qui allonge le combat la grossit.
9. **Les propositions** : cinq retouches d'aura (A1 à A5), cinq retouches de compétence (P1 à P5), trois axes de rang (R1 à R3), trois options (O1 à O3), quatre idées de famille (I1 à I4), dont deux à retenir (Bouclier de foi, Brèche), et sept textes. Deux seulement touchent un kit vanilla (P3, O3) et demandent un `npm run balance`.

## Décisions à prendre

Valeurs en points de victoire ; « gravée » : sur la face 3 nue des hôtes, contre le roster nu, 400 combats par duel ; « porteur » : chez le porteur réel, sur les 48 builds de référence (n = builds qui la portent) ; « builds » : taux des builds qui portent la brique contre les builds de même rang. Bande d'une gravure : 8 à 20 ; d'un rang : +3 à +8. Les textes marqués ° sont une rédaction de cette synthèse (la revue donne la règle, pas la ligne).

| # | Id | Proposition (texte) | Gravée, avant → après | Chez le porteur | Rang II | Builds, vanilla | Touche | Avis |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **A1** Sentence | **3 PV par soin** (rang +3) : « Chaque soin qu'il reçoit fait perdre 3 PV à l'adversaire. » | Ysolde +7,9 → **+15,9** ; moyenne des hôtes +1,6 → +2,7 | Ysolde +5,8 (n 29) ; construite, Ysolde 40,4 → 46,1 %, pente −6,0 → −0,2 (étude de la montée) | Ysolde +4,3 → +4,3 | Sainteté × Sentence +0,32 → **+0,65** | réserve d'Ysolde, hors vanilla | **recommandé** |
| 2 | **A2** Vindicte | **+6 Ferveur par renvoi** (rang +6) : « +6 Ferveur quand il renvoie des dégâts. »° | Aldric +9,0 → **+12,9** | Aldric +5,5 (n 20) | Aldric +3,7 → +4,0 | +9 Ferveur : Aldric +15,4, rang +3,2, Aldric construit 56,1 → 58,5 % (plus risqué, Aldric est 2e construit) | réserve d'Aldric, hors vanilla | **recommandé** (+6) |
| 3 | **P1** Virulence | **sans condition, +2 Poison, puis triple** ; rang +1 Poison (au lieu de +3) : « Triple le Poison de l'adversaire, puis +2. » | Ervald +8,3 → **+18,8**, Naraxes +0,7 → +12,9 | Ervald +5,2 → **+11,6** (n 15), Naraxes +0,9 → +7,9 (n 5) | Ervald +3,3 → **+6,2**, Naraxes +5,8 | Ervald 45,1 → 51,6 ; Naraxes 57,9 → 66,7 (n 5, au-delà de 65 : à surveiller) ; 0,51 → 1,23 fois par combat | réserve d'Ervald, répertoire de Naraxes, hors vanilla | **recommandé** (la plus efficace de la revue) |
| 4 | **A3** Rempart hérissé | **+2 Épines et +2 armure temporaire à chaque armure vidée** (rang +2 et +2) : « +2 Épines acérées et +2 armure temporaire quand son armure temporaire est vidée. »° | Brokk +7,8 → **+11,7** ; moyenne des hôtes +1,4 → +1,8 | Brokk +5,0 (n 13), Morgrut +5,8 (n 5) | Brokk +3,4 → **+1,4** (le rang reste faible) | Peau de pierre × Rempart +0,28 → **+0,45** | réserve de Brokk, répertoire de Morgrut, hors vanilla | **recommandé** |
| 5 | **P3** Vol de vie | **+2 PV par coup drainé dès le rang I**, rang +4 : « Ce coup lui rend les PV qu'il retire, +2. » | Gorak +12,8 → +16,2, Ysolde +16,1 → +19,8, Aldric +12,5 → +15,9 ; kit d'Ervald +14,8 → +19,4 | kit d'Ervald +5,9 → +7,8, Gorak +5,3 → +6,9, Ysolde +7,9 → **+9,9**, Aldric +6,1 → **+8,2** | Ervald +1,9 → **+3,6** ; gravée +3,3 → +4,2 à +4,9 | Ervald 42,7 → 45,1, Ysolde 42,8 → 44,5 ; **Ervald vanilla 46,6 → 51,2 %** | **kit d'Ervald : vanilla, `npm run balance`** | **recommandé** |
| 6 | **P2** Récolte | **+14 PV** (au lieu de 7), rang +6 : « +14 PV si l'adversaire est empoisonné. »° | Ervald +8,6 → +12,7 | Ervald +5,3 → **+9,0** (n 14) | +2,8 → +1,8 (reste sous la bande) | Ervald 46,0 → 49,7 | réserve d'Ervald, hors vanilla | **recommandé** |
| 7 | **P4** Fausse note | **les 2 prochains coups adverses à −4** (au lieu d'un à −5) ; rang : un coup de plus : « Les 2 prochains coups de l'adversaire qui touchent font −4 dégâts. »° | Fanchon +13,6 → **+20,1** (bord haut) | +5,7 → **+8,3** (n 16) | +8,5 → **+5,6** (rentre dans la bande) | Fanchon 50,5 → 52,8 | réserve de Fanchon, hors vanilla | **recommandé** |
| 8 | **P5** Siffloter | **+3 PV par tour** pendant 2 tours : « +3 PV à la fin de ses 2 prochains tours (6 en tout). »° ; ajouter un test (il n'en a aucun) | Fanchon +10,3 → +15,3 | +5,9 → **+8,2** (n 6) | +2,4 → **+4,2** | Fanchon 53,1 → 55,7 | réserve de Fanchon, hors vanilla | **recommandé** |
| 9 | **R1** Pourfendre | rang : **+2 Saignement par rang** (au lieu de +1) | rang II gravé : Elaria +5,4 → +9,7, Brokk +4,7 → +7,6, Ervald +4,4 → +8,4, Morgrut +3,1 → +4,8 | Gorak +2,4 → **+5,0** (n 15) | kit vanilla +5,5 → +10,6 (au-dessus, même écart que toutes les briques) | Gorak 50,7 → 51,5 | rang seulement, vanilla inchangé | **recommandé** |
| 10 | **R2** Pile ou face | rang : **pile ×2 de plus par rang** (au lieu de ×1) | rang II gravé : Fanchon +2,9 → +5,0 | Naraxes +2,3 → **+3,9** (n 15) | kit vanilla +4,3 → +7,3 | — | rang seulement, vanilla inchangé | **recommandé** |
| 11 | **R3** Feux follets | rang : **+2 Brûlure par rang** (au lieu de +1) | rang II gravé : Ervald +6,4 → +10,6 | Thaldrin +3,4 → **+5,5** (n 18) | kit vanilla +5,5 → +7,9 | Thaldrin 45,3 → 46,1 | rang seulement, vanilla inchangé | **recommandé** |
| 12 | **I1** Bouclier de foi | nouvelle aura, Garde, consommatrice de soins : « Chaque soin qu'il reçoit lui donne +2 armure temporaire. » | Ysolde **+16,1** ± 1,2, Ervald +4,1, Fanchon +0,6, autres +0,5 à +1,0 | à la place de la Sentence dans les 29 builds d'Ysolde : +5,8 → **+11,5**, aiguisée +5,0 → +9,5 | Ysolde +5,2 | builds d'Ysolde **37,0 → 43,9 %** ; partenaires : Aura de sainteté **+0,65**, Onguent +0,28 ; anti-synergie Purification −0,23 (kit d'Ysolde) | nouvelle compétence (icône, son, scène), hors vanilla | **recommandé** (concurrente de A1 : l'une, l'autre ou les deux, à trancher) |
| 13 | **I2** Brèche | nouvelle compétence, Garde côté malus (statut Vulnérable du registre, sans règle nouvelle) : « L'adversaire reçoit +1 dégât à chaque coup, 3 au plus. » | **+11,8** (Naraxes +9,7 à Elaria +14,1) | non mesurée (aucun porteur) | **+6,0** (+4,7 à +6,8) | partenaire : Gambison +0,31 (Gorak) ; raccourcit les combats de Gorak (14,3 → 13,6 tours) | nouvelle compétence (icône, son), répertoires à choisir, hors vanilla | **recommandé** |
| 14 | **A5** Aura d'immunité | corriger le détail : « Les auras de l'adversaire agissent toujours, sans pouvoir lui poser de malus. » (le Poison des auras glaciale et de décoction est bloqué) | — | — | — | — | texte seulement | **recommandé** |
| 15 | **T1 à T7** Textes | Pourfendre « L'adversaire saigne de la moitié des dégâts de ce coup, s'il touche. » ; Esquive améliorée, détail « Une seule à la fois : une nouvelle pose ne s'ajoute pas. » ; Épines acérées, « jusqu'à la fin du combat » (ou le passage en aura, X1) ; Dé pipé « Sa prochaine pièce tombe sur pile : ce coup ×5. » ; Foudre « L'adversaire perd 3 PV, en trois éclairs. » ; Embrasement « Si l'adversaire brûle, son prochain coup qui touche lui fait perdre trois fois sa Brûlure. » ; Crescendo, apostrophe droite | — | — | — | — | générateurs (`describeSkill`, registres) | **recommandé** |
| 16 | **A4** Aura de puissance | **cumulable, 3 charges (+2, +3, +4)** : la face sert à chaque pose (texte à écrire) | +16,2 → **+18,0** ; Gorak +16,8 → +18,5, Thaldrin +14,7 → +16,0, Fanchon +13,7 → +15,1 | Gorak +7,7 (n 12), Morgrut +7,0 (13), Thaldrin +7,1 (13), Fanchon +6,5 (7) (non remesuré) | Gorak +4,4 → +4,1 | Furie × Puissance −0,10 → −0,13 (aucune synergie gagnée) | réserve de Gorak, répertoires, hors vanilla | option (retouche de naturel, pas de valeur) |
| 17 | **O1** Curée | **trois coups de plus** (au lieu de deux) | Gorak +6,6 → +8,3, Brokk +10,4 → +12,6 | Gorak +5,8 → **+7,4**, Brokk +9,8 → +12,7, Morgrut +8,0 → +10,4 | Brokk +3,5 → +2,1 | toujours « rare à l'écran » au laboratoire | réserve de Gorak, répertoires, hors vanilla | option (ne règle pas la fréquence, 0,23 par combat chez Gorak) |
| 18 | **O2** Dé pipé | **pile ×6** (au lieu de ×5) | Naraxes +9,7 → +11,0 | Naraxes +7,5 → +8,4 | +1,2 → +0,6 | — | réserve de Naraxes, hors vanilla | option (petit ; le rang reste le vrai défaut) |
| 19 | **O3** Foudre | **4 × 1** (un éclair de plus) | kit vanilla +6,2 → +7,7 ; laboratoire +1,5 ± 0,4 | kit dans les builds de Thaldrin +2,4 → +3,2 | — | Thaldrin builds 45,3 → 46,7 ; **Thaldrin vanilla 54,9 → 56,4 %** | **kit de Thaldrin : vanilla, `npm run balance`** ; une scène à quatre éclairs | option (monte un Thaldrin déjà premier en vanilla) |
| 20 | **I3** Pas de côté | nouvelle aura cumulable, Esquive : « +8 % d'esquive. » | +8,2 (Fanchon +6,4 à Ervald +10,0) | — | +7,0 (+5,6 à +8,7) | aucun partenaire (Conque +0,12 chez Brokk) ; prudence chez Elaria | nouvelle compétence, hors vanilla | option (au bas de la bande ; nourrirait de futures consommatrices d'esquive) |
| 21 | **I4** Plaie ouverte | nouvelle aura, consommatrice de critiques (Précision → Saignement) : « Ses critiques font saigner l'adversaire de 3. » | +5,5 ; **Elaria +12,5, Ervald +10,3**, autres +0,9 à +6,3 | — | Ervald +5,5 | aucun partenaire ; anti-synergie Aura glaciale −0,21 (Ervald) | nouvelle compétence, hors vanilla | option (à réserver aux critiques fréquents : Ervald, Elaria) |
| 22 | **R4** Purification | rang : +6 au repli (au lieu de +3), ou « retire 2 bonus » | rang II gravé, Aldric : +6 : +4,0 → +7,1 ; 2 bonus : +4,0 → +4,0 | +6 : Ysolde +1,9 → +3,5 ; 2 bonus : +2,3 de plus au rang I | +6 : kit vanilla +6,9 → +11,8 (au-dessus) | — | rang | écarté (aucun axe clairement meilleur ; à remesurer si les reliques à malus se multiplient) |

**À trancher, sans mesure de valeur** :
- **X1. Les Épines acérées sont une aura sans le nom** (relevé par les deux relecteurs, vérifié dans `statuses.ts`) : ni usure, ni durée, ni `spentOnReaction`, donc permanentes, cumulables, purgeables, sans `look.aura` (pas d'anneau, pas rangées parmi les auras au compendium). En faire une aura, ou dire pourquoi elle n'en est pas une (T3 en dépend).
- **X2. Une accroche « gêne » (`hinders`)** pour les producteurs d'une même ressource que l'offre orientée (`echoOf`) présente comme liés (Dé creux et Esquive, Briquet et Feux follets, Pièce de foire et Pile ou face), comme l'Embrasement et le Soufflet.
- **X3. Le rapport du porteur réel** en outil permanent (le script de cette revue, ou la piste 1 de § 13.4).

**Variantes mesurées et écartées** (mêmes mesures) :
- Aura d'immunité cumulable (+1 armure par charge, 2 au plus) : +15,0 → +18,2, **Brokk +21,5, hors bande**, rang +7,3 → +6,8.
- Rempart hérissé : +4 Épines (Brokk +9,9, rang +2,4) ; +6 Épines, rang +6 (Brokk +10,7, rang +1,2, Peau × Rempart +0,40).
- Sentence à 2 PV : Ysolde +13,1.
- Virulence : ×4 (porteur +6,7) ; condition gardée et +2 (+7,1, rang II +0,8) ; sans condition et +3 (+15,3, mais rang II +10,1, hors bande).
- Récolte +11 : porteur +7,6.
- Vol de vie : deux charges dès le rang I (kit vanilla +25,1, Ervald vanilla 57,0 %, un saut de 10 points) ; +2 PV et rang +2 (rang II +1,5 à +2,9).
- Fausse note : deux coups à −5 (gravée +22,4, au-dessus ; porteur +9,6) ; −7 (porteur +6,7).
- Siffloter : trois tours à 2 PV (+7,2, rang II +0,5).
- Foudre 3 × 2 : Thaldrin vanilla 59,4 % (hors tolérance).
- Bouclier de foi à 3 armures : Ysolde +19,4 (trop près du haut).

**Avant livraison** : l'effet des retouches ensemble n'est pas mesuré. Un `npm run balance` (P3 et O3 changent un kit vanilla), puis la courbe de montée de l'étude (§ 13.4 : Ervald, Ysolde, Fanchon, Thaldrin, Aldric et Brokk visés) et `npm run campaign`. Pour mémoire, l'étude de la montée avait relevé ensemble Sentence, Vindicte, Virulence et Récolte à d'autres valeurs (×3, ×3, ×2, ×2) : l'écart entre le plus fort et le plus faible construit passait de 25,8 à 21,5 points, Elaria de 66,2 à 64,6 % sans être touchée.

## 1. Les auras

Treize statuts sont des auras (`isAura`, `look.aura`). Douze compétences les posent : onze gravables (Puissance, Précision, Intimidation, Rempart hérissé, Glaciale, Sentence, Sainteté, Décoction, Immunité, Vindicte, Sauvage), l'Ouverture (début de combat) et le Duo (Aura mélodieuse). L'Aura de pourriture n'a aucun porteur.

### 1.1 Synthèse

« Gravée » : moyenne des hôtes, contre le roster nu ; « porteurs » : construits (n builds ; « kit » : la retirer du kit) ; rang II : gravée ; partenaires ≥ +0,25 en log-cote.

| Aura | Gravée | Chez ses porteurs (construits) | Rang II | Partenaires | Verdict | Proposition |
| --- | --- | --- | --- | --- | --- | --- |
| Aura de puissance | +16,2 | Gorak +7,7 (12), Morgrut +7,0 (13), Thaldrin +7,1 (13), Fanchon +6,5 (7) | +4,9 | Gambison +0,25 à +0,31 | retoucher (naturel) | A4 |
| Aura de précision | +12,2 | Elaria +15,2 (16), Gorak +9,4 (12), Fanchon +7,0 (3) | +7,5 | Gambison +0,35 (Elaria) ; Œil de faucon −0,09 | garder | — |
| Aura d'intimidation | +13,9 | Brokk +5,4 (4), Morgrut +6,0 (10) | **+9,1** | aucun | garder | rang à surveiller |
| Rempart hérissé | +1,4 (Brokk +7,8) | Brokk +5,0 (13), Morgrut +5,8 (5) | +0,3 (Brokk +3,4) | Peau de pierre +0,28 ; Écu, Chandelle, Géode +0,34 à +0,55 | retoucher | A3 |
| Aura glaciale | +12,6 (kit +18,6) | Ervald kit +11,0 (48), Naraxes +6,3 (4) | **+9,6** (kit +14,6) | Fiole +0,51, Gambison +0,44, Récolte +0,32, Virulence +0,29 ; **26 anti-synergies** chez Ervald | garder | anti-synergie de durée à surveiller |
| Sentence | +1,6 (Ysolde +7,9) | **Ysolde +5,8 (29)** | +0,5 (Ysolde +4,3) | Sainteté +0,32 | **retoucher** | A1 |
| Aura de sainteté | +13,1 (kit +13,6) | Ysolde kit +8,5 (48) | +7,7 (kit +10,7) | Sentence +0,29, Encens +0,28 | garder | — |
| Aura de décoction | +15,0 (kit +16,3) | Naraxes kit +8,1 (48), Ervald +8,7 (6), Thaldrin +5,8 (9) | **+10,3** (kit +12,8) | Gambison +0,29, +0,38 | garder | — |
| Aura d'immunité | +15,0 | Aldric +11,6 (8), Ysolde +14,2 (5), Brokk +8,7 (3) | +8,0 | aucun | garder (détail faux) | A5 |
| Vindicte | +1,5 (Aldric +9,0) | **Aldric +5,5 (20)**, Brokk +2,1 (2) | +0,4 (Aldric +3,7) | aucun (Riposte +0,24 chez Brokk) | **retoucher** | A2 |
| Aura sauvage | +13,2 | Thaldrin +6,6 (7) | +7,5 | aucun | garder | — |
| Ouverture (Aura mélodieuse) | kit +14,8 | Fanchon kit +7,4 (48) | — | non mesuré | garder | — |
| Aura de pourriture | (essai) +23,0 | sans porteur | (essai) +4,6 à +6,3 | — | garder sans porteur | — |

### 1.2 Les fiches

**Aura de puissance** (`powerAura`). Puissance, généraliste, face 3 ; réserve de Gorak, répertoires de Thaldrin, Fanchon, Morgrut. Non cumulable, +2 à chaque coup, après le critique, avant l'armure.
- Valeur : gravée +16,2 (Naraxes +13,6 à Elaria +18,3) ; porteurs ci-dessus (offerte / gravée sur 120 actes : Gorak 75 / 26, Morgrut 71 / 29, Thaldrin 52 / 26, Fanchon 57 / 18) ; rang II +4,9, rang III +3,6.
- Synergie : aucun partenaire de compétence ; Furie × Puissance −0,10 (pas de boucle) ; anti-synergies chez Morgrut : Clepsydre −0,27, Trophée −0,24, Collier −0,23, Œil de faucon −0,22 ; Collier de ronces −0,18 (Thaldrin).
- Jeu : posée dans 70 à 73 % des combats, au 3e tour ; 44 à 46 % des coups sous l'aura, +5,4 à +6,0 dégâts par combat ; **36 % des poses ne font rien**. D'office : +27,8 ; d'office et gravée : +28,6 (la face ne rapporte plus que +0,8 une fois l'aura là).
- Texte et code : vrais, courts ; `modifyOutgoing`, audit générique, 8 mentions en test.
- Verdict : **retoucher au choix de l'utilisateur** (A4), retouche de naturel.

**Aura de précision** (`precisionAura`). Précision, consommatrice de critiques ; réserve d'Elaria, répertoires de Gorak et Fanchon. Cumulable, +5 % de critique et +1 au multiplicateur par charge.
- Valeur : gravée +12,2 (Fanchon +7,9 à Elaria +17,7) ; Elaria 79 / 31 offerte / gravée, +15,2 (copiée 3 fois +10,4) ; Gorak 43 / 21, +9,4 ; Fanchon 37 / 12, +7,0 ; rang II +7,5, rang III +4,8.
- Synergie : **Œil de faucon × Précision −0,09** chez Elaria (l'aura vaut +0,83 en log-cote sans Œil de faucon, +0,74 avec) ; Gambison +0,35 ; reliques de critique sous le seuil (Trophée +0,17 à +0,19, Clepsydre +0,18 à +0,19) ; Contrepoids −0,16 et Conque −0,18 (Elaria).
- Jeu : posée dans 70 à 77 % des combats ; 44 à 49 % des coups sous l'aura ; d'office +16,2. La chance de critique ne se voit pas, le multiplicateur oui.
- Verdict : **garder**.

**Aura d'intimidation** (`intimidationAura`). Garde, généraliste ; réserve de Brokk, répertoire de Morgrut. Cumulable, −1 par charge sur chaque coup adverse.
- Valeur : gravée +13,9 ; Brokk 37 / 11, +5,4 ; Morgrut 62 / 20, +6,0 ; rang II **+9,1** (hors bande), rang III +4,6.
- Synergie : aucun partenaire ; Rétribution −0,17 chez Brokk (moins de dégâts reçus, jauges plus maigres).
- Jeu : 47 % des coups reçus sous l'aura, 5,9 dégâts évités par combat ; d'office +18,3.
- Verdict : **garder** ; rang II à surveiller.

**Rempart hérissé** (`bristlingRampart`). Garde → Affliction, consommatrice de l'armure vidée ; réserve de Brokk, répertoire de Morgrut. +2 Épines par charge à chaque armure temporaire vidée.
- Valeur : gravée +1,4 (Brokk +7,8, ailleurs 0 à +1,0) ; Brokk 81 / 29, +5,0 ; Morgrut 35 / 10, +5,8 ; rang II +0,3 (Brokk +3,4).
- Synergie : Peau de pierre +0,28 ; Écu cabossé +0,48 / +0,55, Chandelle +0,39 / +0,43, Géode +0,34 / +0,46 (Brokk / Morgrut) ; la plus synergique des auras, mais faible.
- Jeu : **0,39 armure vidée par combat**, 1,1 Épine posée : la fréquence de sa ressource fait sa faiblesse.
- Verdict : **retoucher** (A3). Variantes au § Décisions. Piste non mesurée (moteur) : un moment « son armure temporaire encaisse un coup » au lieu de « vidée ».

**Aura glaciale** (`frostAura`). Affliction, productrice de Poison ; signature d'Ervald, répertoire de Naraxes. 1 Poison par charge au début de ses tours.
- Valeur : kit +18,6 ± 1,3 ; gravée +12,6 ; Ervald construit +11,0, aiguisée (11 builds) +6,0, copiée (12 builds) +11,7 ; Naraxes 51 / 13, +6,3 ; rang II +9,6 gravée (hors bande), +14,6 au kit ; rang III +3,7.
- Synergie : Fiole +0,51, Gambison +0,44, Récolte +0,32, Virulence +0,29. **26 briques sous −0,15 chez Ervald**, de −0,16 à −0,29 (Collier de ronces), dont Puissance −0,20, Précision −0,27, Duo −0,27, Crescendo −0,27, Rétribution −0,26 : ce qui raccourcit le combat la réduit [INFERENCE appuyée par le signe des deux groupes] ; cause plausible de la pente d'Ervald (−3,9).
- Jeu : posée dans 78 % des combats, 4,4 Poison posés par combat ; purgée dans 5 %.
- Verdict : **garder** ; l'anti-synergie de durée est à surveiller, pas à corriger par l'aura.

**Sentence** (`sentence`). Affliction, consommatrice de soins ; réserve d'Ysolde. 1 PV par charge en dégâts directs à chaque soin reçu, 2 charges au plus.
- Valeur : gravée +1,6 (Ysolde +7,9) ; Ysolde **offerte dans 113 actes sur 120, gravée dans 60**, +5,8 (n 29), aiguisée +5,0 ; rang II Ysolde +4,3. **La plus prise des auras, sous la bande.**
- Synergie : Aura de sainteté +0,32, Onguent +0,24.
- Jeu : 2,3 PV infligés par combat ; 12 % des poses sans effet (plafond).
- Verdict : **retoucher** (A1).

**Aura de sainteté** (`holyAura`). Soin, productrice ; signature d'Ysolde. +1 PV par charge à la fin de ses tours, 2 charges au plus.
- Valeur : kit +13,6 ± 1,1 ; gravée +13,1 ; Ysolde construite +8,5 ; aiguisée +5,1, copiée +6,3 ; rang II +7,7 (kit +10,7), rang III +5,4.
- Synergie : Sentence +0,29, Encens +0,28 (ses deux consommatrices).
- Jeu : 4,7 PV rendus par combat ; 15 % des poses sans effet.
- Verdict : **garder** ; productrice de la seule boucle aura → aura qui marche (+0,65 avec A1).

**Aura de décoction** (`decoctionAura`). Affliction, coup qui touche → Poison ; signature de Naraxes, répertoires d'Ervald et Thaldrin.
- Valeur : kit +16,3 ± 1,2 ; gravée +15,0 ; Naraxes construite +8,1 (aiguisée +7,5, copiée +9,4) ; Ervald 49 / 17, +8,7 ; Thaldrin 54 / 19, +5,8 ; rang II +10,3 gravée (hors bande), +12,8 au kit.
- Synergie : Gambison seul ; Fiole +0,05 chez Naraxes, −0,16 chez Ervald (déjà empoisonné par sa glaciale) ; anti-synergies chez Ervald : Puissance −0,15, Précision −0,16, Contrepoids −0,17, Duo −0,15.
- Verdict : **garder** (rang II dans la bande chez Naraxes construite).

**Aura d'immunité** (`immunityAura`). Sceaux, généraliste ; réserve d'Aldric, répertoires de Brokk et Ysolde. Purge ses malus, puis immunité aux malus et +1 armure ; non cumulable.
- Valeur : gravée +15,0 (sans l'immunité, l'armure seule : +10,9) ; Aldric 42 / 17, +11,6 ; Ysolde 42 / 15, +14,2 ; Brokk 34 / 13, +8,7 ; rang II +8,0, rang III +5,8.
- Jeu : **40 à 46 % des poses sans effet** ; d'office +26,5.
- Texte : **le détail induit en erreur** : le Poison des auras glaciale et de décoction est un malus que l'immunité bloque (`audit.ts:719-720`).
- Verdict : **garder** ; corriger le détail (A5).

**Vindicte** (`vendetta`). Puissance, consommatrice des renvois, productrice de Ferveur ; réserve d'Aldric, répertoire de Brokk. +3 Ferveur par charge à chaque renvoi.
- Valeur : gravée +1,5 (Aldric +9,0) ; Aldric 97 / 43, +5,5 (n 20) ; Brokk 18 / 6, +2,1 ; rang II Aldric +3,7.
- Synergie : Rétribution × Vindicte +0,04, Riposte × Vindicte +0,09 chez Aldric (deux producteurs, l'un suffit) ; chez Brokk, Riposte +0,24.
- Jeu : 0,88 renvoi par combat chez Aldric ; aucun chez Brokk.
- Verdict : **retoucher** (A2) ; ni +6 ni +9 ne crée de synergie avec ses producteurs (+0,01 à +0,13).

**Aura sauvage** (`wildAura`). Puissance, généraliste ; réserve de Thaldrin. +1 à l'attaque par charge, avant le critique.
- Valeur : gravée +13,2 ; Thaldrin 63 / 22, +6,6 ; rang II +7,5, rang III +4,2.
- Jeu : 47 % des coups sous l'aura ; la ligne d'attaque qui monte n'a jamais été vue en mouvement (§ 0 bis).
- Verdict : **garder**.

**Ouverture et Aura mélodieuse** (`melodiousAura`). Puissance après l'armure ; kit de Fanchon. +1 par charge à chaque coup qui touche.
- Valeur : Ouverture au kit +14,8 ± 1,2 ; Fanchon construite +7,4.
- Jeu : **la seule aura à l'heure** : posée dans 100 % des combats, 98 % des coups sous l'aura, +10,6 dégâts par combat. Le modèle « posée tôt, qui tient tout le combat ».
- Verdict : **garder**.

**Aura de pourriture** (`rotAura`, sans porteur depuis la 0.73.0).
- Mesurée comme gravure d'essai : +23,0 (au-dessus de la bande) ; au début de ses tours +19,7 (doublon de la Glaciale) ; quand il encaisse un coup +19,4 (doublon des Épines) ; à chaque critique +5,0 (Elaria +11,1, Ervald +9,6).
- Verdict : **garder le statut sans porteur** ; aucune version à la fois dans la bande et sans doublon. La version « à chaque critique » serait à relever si l'utilisateur veut une consommatrice de critiques en Affliction (non mesurée au-delà de ×1 ; voir aussi I4).

### 1.3 Constats transverses

1. **Le tempo** : posée dans 69 à 78 % des combats, au 3e ou 4e tour (3,1 à 3,7 sur 6,0 à 8,7 tours), 44 à 53 % des coups sous l'aura. Gravée, puis d'office (une charge dès le début) :

   | Aura | Gravée sur le 3 | D'office | D'office + gravée |
   | --- | --- | --- | --- |
   | Puissance | +16,2 | +27,8 | +28,6 |
   | Immunité | +14,9 | +26,5 | +27,1 |
   | Intimidation | +13,8 | +18,3 | +30,0 |
   | Glaciale | +12,7 | +19,0 | +30,8 |
   | Sainteté | +12,9 | +16,5 | +25,0 |
   | Décoction | +15,2 | +18,1 | +32,1 |
   | Précision | +12,2 | +16,2 | +24,9 |

   Aucune retouche de tempo générale : toutes sont dans la bande contre le roster nu, et l'aura d'office double presque la valeur (Puissance +27,8, hors bande). Seul le cas non cumulable est traité (A4).
2. **Le coup de base à chaque jet a rendu l'aura gratuite** : l'Aura d'immunité valait −1,7 à −2,1 quand le 3 sacrifiait le coup (FAMILLES § 6.4), elle vaut +15,0.
3. **Construites, elles valent la moitié** : Puissance, Intimidation, Sauvage, Rempart, Sentence, Vindicte et l'Ouverture valent de +5,0 à +7,7 chez tous leurs porteurs : **sept des treize sous 8 points**, sous la gravure moyenne construite (+9,4 ; Elaria +13,4, d'après l'étude de la montée). Tiennent : Précision chez Elaria et Gorak, Immunité, Glaciale, Sainteté et Décoction dans leur kit. Cause probable : des combats construits plus courts (4,8 à 6,3 tours par combattant, contre 6,0 à 8,7 en vanilla) [INFERENCE].
4. **Le Gambison matelassé, partenaire de presque toutes les auras** : meilleur partenaire de 16 couples sur 24 (+0,07 à +0,38, +0,44 avec la Glaciale), au-delà de +0,25 sept fois. Des récompenses « qui font durer » sont aussi des récompenses pour les auras (PROGRESSION § 12).
5. **Synergie : des impasses, sauf quatre** : productrices consommées (Glaciale, Sainteté ; la Décoction sans partenaire au-delà de +0,05) ; consommatrices (Sentence, Rempart, Vindicte, Précision) ; généralistes sans partenaire (Puissance, Intimidation, Immunité, Sauvage, Mélodieuse). Deux liens promis sur cinq se mesurent ; A1 et A3 les renforcent.
6. **Toute aura est un leurre contre la Purification** : une aura inutile (la Vindicte hors de chez Aldric) lui fait perdre ses 6 dégâts : **+4,7 à +9,0 points contre Ysolde** (Gorak 55,3 → 61,8 %, Morgrut 52,0 → 60,5 %, Thaldrin 58,5 → 67,5 %). Cohérent avec la règle du « dernier bonus », invisible pour le joueur.
7. **Rangs** : quatre au-dessus de la bande contre le roster nu (Décoction +10,3, Glaciale +9,6, Intimidation +9,1, Immunité +8,0), aucune chez les porteurs construits (Glaciale +6,0, Sainteté +5,1, Décoction +7,5). Les consommatrices s'aiguisent mal (Sentence +4,3, Vindicte +3,7, Rempart +3,4 chez leur producteur).
8. **Lisibilité** (lu dans le code, rien vu) : les auras de tour ou de réaction allument leur anneau et envoient un signal ; celles de coup (Puissance, Intimidation, Mélodieuse) ont un label sous le dé ; celles de feuille (Précision, Sauvage, armure de l'Immunité) ne se voient que par un chiffre. Une pose vide ne joue rien (M25).

## 2. Les compétences

Les 27 compétences dont le statut n'est pas une aura : kits, réserves, répertoires, lots 1 et 2, le Duo.

### 2.1 Synthèse

« Gravée / porteur » : moyenne des hôtes contre le roster nu / valeur chez le porteur réel (n). « Offerte / gravée » : actes sur 120 chez le porteur principal. « Rang II » : gravé / chez le porteur.

| Compétence | Famille | Gravée / porteur | Offerte / gravée | Rang II | Partenaires (> +0,25) | Verdict | Proposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Furie des vents | Tempo | +17,0 / kit de Gorak +12,3 ; Elaria +10,0 (10) | Elaria 56 / 18 ; Gorak copie 45 | +9,6 / **+11,0** (au-dessus) | — | garder | rang signalé |
| Pourfendre | Affliction | +14,5 / kit +7,7 ; Elaria +5,6 (7), Morgrut +11,8 (9) | Elaria 62 / 25, Morgrut 67 / 23 | +4,1 / **+2,4** | Croc +0,44, Curée +0,27 | retoucher (rang) | R1, T1 |
| Curée | Tempo | +1,7 / **Gorak +5,8 (12)**, Brokk +9,8 (11) | **Gorak 99 / 41**, Brokk 72 / 33 | +0,6 / Brokk +6,5 | Épines +0,47, Pourfendre +0,30 | garder (option) | O1 |
| Œil de faucon | Précision | +15,6 / kit +12,0 ; Gorak +13,9 (7) | Naraxes 37 / 18 | +7,7 / +6,9 | Contrepoids +0,46, Plume +0,42 | garder | — |
| Esquive améliorée | Esquive | +18,8 / kit +10,8 ; Naraxes +13,5 (6) | Fanchon 46 / 17 | +3,4 / +3,6 | Conque +0,31 | garder (texte) | T2 |
| Épines acérées | Affliction | +12,1 / kit +11,1 ; **Thaldrin +4,5 (8)** | Thaldrin 53 / 24 | +8,7 / +8,4 | Croc +0,47, Gambison +0,43, Curée +0,39 | garder (texte, aura) | T3, X1 |
| Peau de pierre | Garde | +17,1 / kit +8,6 ; Ysolde +9,1, Morgrut +9,0 | Morgrut 75 / 24 | +3,8 / +4,0 | Clous +0,29, Rempart +0,27 | garder | — |
| Vol de vie | Soin | +14,1 / **kit +5,9 ; Gorak +5,3 (11), Ysolde +7,9 (14), Aldric +6,1 (8)** | **Ysolde 75 / 33**, Gorak 70 / 29 | +3,3 / **+1,9** | — | retoucher | P3 |
| Souffle de la tombe | Affliction | +18,1 / Ervald +12,9 (11), Thaldrin +8,0 (13) | Thaldrin 55 / 19 | +5,8 / — | Fiole +0,36 | garder | — |
| Récolte | Soin | Ervald +8,6 / **+5,3 (14)** | **78 / 34** | +2,8 / +1,9 | Aura glaciale +0,31 | retoucher | P2 |
| Virulence | Affliction | Ervald +8,3 / **+5,2 (15)** ; Naraxes +0,9 (5) | **Ervald 83 / 35**, Naraxes 68 / 21 | +3,3 / +1,5 | Aura glaciale +0,30 | **retoucher** | P1 |
| Purification | Sceaux | +16,9 / kit +9,0 ; Aldric +9,7 (6) | Aldric 47 / 8 | +4,2 / **+1,9** | — | garder | R4 écarté |
| Peur | Tempo (malus) | +13,5 / +9,3 à +10,0 | Ysolde 52 / 17 | +6,2 / — | — | garder | — |
| Pile ou face | Fortune | +13,9 / kit +13,2 ; Fanchon +9,7 (12) | Fanchon 78 / 28 | +3,5 / **+2,3** | Dé pipé +0,42, Pièce trouée +0,32 | retoucher (rang) | R2 |
| Coup de chance | Fortune | +19,1 / Elaria +13,1 (29), Naraxes +13,1 (27) | **Elaria 108 / 67**, Naraxes 101 / 62 | +8,9 / — | — | garder | rang au bord haut |
| Dé pipé | Fortune | Naraxes +9,7 / +7,5 (12) | Naraxes 73 / 31 | +0,1 / — | Pièce de foire +0,88, Pile ou face +0,44 | garder (texte) | O2, T4 |
| Rétribution | Représailles | +19,6 / kit +13,7 ; Ysolde +13,9 (8) | Ysolde 55 / 16 | +6,0 / +7,8 | Gambison +0,31 | garder | — |
| Riposte | Représailles | +16,3 / kit +10,9 ; Brokk +9,9 (4) | Elaria 45 / 8 | +6,1 / +4,4 | Gambison +0,29 | garder | — |
| Rancune | Précision | +14,4 / Morgrut +13,7 (11), Aldric +11,1 (11) | Morgrut 62 / 26 | +6,0 / — | Contrepoids +0,41, Plume +0,28 | garder | — |
| Feux follets | Affliction | +17,3 / kit +8,4 ; Ervald +7,1 (7) | Ervald 36 / 18 | +5,7 / **+3,4** | Embrasement +0,69, Soufflet +0,55 | retoucher (rang) | R3 |
| Foudre | Affliction | — / **kit +2,4** (vanilla +6,2) | — | +8,2 / +4,4 | — | signaler | O3, T5 |
| Embrasement | Affliction | Thaldrin +8,0 / +8,9 (23) | **Thaldrin 104 / 51** | +0,1 / — | Briquet +0,84, Feux follets +0,63 | garder (texte) | T6 |
| Duo | Fortune, Puissance | — / kit +16,9 ; copie +17,9 | copie 32 | +3,3 / +5,2 | Gambison +0,36 | garder (signalé) | « écrasante » au kit, +30,6 |
| Soliste | Puissance | — / kit +9,2 | copie 39 | +6,1 / +6,1 | — | garder | — |
| Siffloter | Soin | Fanchon +10,3 / **+5,9 (6)** | 57 / 27 | +3,3 / — | — | retoucher | P5 |
| Fausse note | Puissance (malus) | Fanchon +13,6 / **+5,7 (16)** | 50 / 27 | +8,5 / +3,5 | — | retoucher | P4 |
| Crescendo | Puissance | +18,2 / +9,6 (11) | 59 / 24 | +6,7 / — | — | garder (typographie) | T7 |

### 2.2 Les fiches

Seuls les chiffres qui n'entrent pas dans la synthèse sont repris ici.

- **Furie des vents** (signature de Gorak, remplace le coup) : kit +18,9 ± 1,7, 1,20 fois par combat, renverse 30 % des combats ; aiguisée chez Gorak (21 actes) +11,0, copiée (45) +12,2. Anti-synergies : Pourfendre −0,39 (kit de Gorak), Pièce de foire −0,48 et Œil de faucon −0,17 (Elaria). Seule boucle de coups par action de Gorak (1,16 → 1,26). **Garder** : rang II au-dessus, connu (SORTS § 20 : « +1 coup » est le plus petit pas entier).
- **Pourfendre** (face 2 de Gorak, modifie) : kit +16,7 ± 1,2 ; Ervald +7,8 (5), Brokk +10,1 (3). Anti-synergies : Furie −0,39, Aura glaciale −0,19 ; chez Morgrut Trophée −0,33, Clepsydre −0,31, Pièce de foire −0,29. Texte : la condition vient en tête, contre la règle du style (T1). **Retoucher le rang** (R1).
- **Curée** (réserve de Gorak, conditionnelle) : chez Gorak **149 offres sur 480 forges**, 0,23 fois par combat, vue dans 25 % des combats ; chez Brokk 0,47 fois, aiguisée +6,5 (n 4) ; Morgrut 30 / 14, +8,0. Anti-synergies chez Brokk : Dé creux −0,23, **Croc de boucher −0,21** (deux consommateurs du même Saignement). Chez Gorak elle double la Furie et ne trouve le Saignement qu'après un Pourfendre qui a touché. **Garder chez Brokk**, son vrai porteur ; O1 pour Gorak.
- **Œil de faucon** (signature d'Elaria) : kit **+19,8** ± 1,7, 1,43 fois par combat ; Naraxes +9,8 (9) ; aiguisée chez Elaria (43 actes) +6,9, copiée (28) +11,8. Anti-synergies : Osselet −0,19, Clepsydre −0,17. **La boucle avec l'Aura de précision ne se lit pas en P8 (−0,09)**. **Garder**.
- **Esquive améliorée** (face 2 d'Elaria) : kit +16,3 ; Fanchon +10,9 (7). **Dé creux −0,49 (Naraxes), −0,61 (Fanchon)**, Pièce de foire −0,21, Plume d'aigle −0,16 : depuis qu'elle ne se cumule plus, une seconde source d'esquive sûre est une pose nulle. Le détail « elle garde la plus forte intensité » parle le langage du moteur (T2). **Garder**.
- **Épines acérées** (signature de Brokk) : kit +19,7, 1,40 fois par combat ; Gorak +8,2 (5). Anti-synergies : Collier de ronces −0,24, Clepsydre −0,22, Peau de pierre −0,21 (kit), Rancune −0,21. Une aura de fait (X1) ; le texte ne dit pas que l'effet tient tout le combat (T3). **Garder** ; rang II au bord haut.
- **Peau de pierre** (face 2 de Brokk) : kit +19,4 ; copiée +10,2. Anti-synergies : Épines −0,21, Curée −0,15 ; Dé creux −0,24 à −0,28 et Pièce de foire −0,26 (Morgrut). **Garder**.
- **Vol de vie** (face 2 d'Ervald) : kit +14,8, 1,32 fois par combat ; **dans les builds d'Ervald +5,9, la plus faible compétence de kit après la Foudre**. Anti-synergies : Plume d'aigle −0,21, Aura glaciale −0,20, Pièce de foire −0,18. La pastille « 2 charges au plus » est sans effet au rang I. **Retoucher** (P3).
- **Souffle de la tombe** (réserve d'Ervald) : Aldric +11,6 (7), Naraxes +9,9 (4) ; Gambison +0,31 (Ervald) ; anti-synergies Plume d'aigle −0,19 (Aldric), Dé creux et Pièce de foire (−0,15 à −0,20). C'est **le producteur qui fait vivre la Virulence et la Récolte**, mieux que la Glaciale. **Garder**.
- **Récolte** (réserve d'Ervald, conditionnelle) : 109 offres, 0,54 fois par combat, vue dans 39 % des combats ; morte au début du combat. Texte modèle du style. **Retoucher** (P2) ; le rang reste faible.
- **Virulence** (réserve d'Ervald, conditionnelle) : 113 offres ; 0,41 fois par combat chez Ervald, 0,20 chez Naraxes (le Poison de la décoction s'estompe avant son jet, SORTS § 22) ; vue dans 39 % des combats d'Ervald. **Retoucher** (P1).
- **Purification** (face 2 d'Ysolde) : kit +19,9 ; aiguisée chez Ysolde (31 actes) +1,9, copiée +10,2 ; contre des construits il y a presque toujours un bonus à retirer, le repli sert rarement. Anti-synergies chez Ysolde : Aura d'immunité −0,19, Rétribution −0,17, Collier −0,17, Aura de sainteté −0,16, Conque −0,16. **Garder** (R4 écarté).
- **Peur** (réserve d'Ysolde, 1x) : 0,6 à 0,8 fois par combat ; sans contrôle d'audit propre ; 13 tests. **Garder**.
- **Pile ou face** (face 2 de Naraxes, modifie) : kit +16,1, renverse 27 % des combats ; aiguisée chez Naraxes (32 actes) +2,3. Anti-synergies : **Aura de décoction −0,36** (kit), **Pièce de foire −0,45** (Fanchon), **Duo −0,31**, Conque −0,19, Plume −0,18. **Retoucher le rang** (R2).
- **Coup de chance** (réserve de Naraxes) : Elaria 170 offres ; **la brique la plus prise du jeu** ; aiguisée chez Elaria +12,3 (n 3). Anti-synergies chez Naraxes : Pièce de foire −0,28, Dard −0,19, Conque −0,17. **Garder** (« ne rien fermer ») ; rang II au bord haut.
- **Dé pipé** (réserve de Naraxes) : Fanchon 22 / 11, +9,6 (5) ; **Pièce de foire +0,46 (Naraxes), +0,88 (Fanchon)** ; rang II sous la bande, connu (SORTS § 23). Texte ambigu (×2 ou ×5 ?) (T4). **Garder** ; O2.
- **Rétribution** (signature d'Aldric) : kit **+21,3** (gâchée 9 % du temps, jauges vides) ; Brokk +13,4 (6) ; aiguisée chez Aldric +7,8. Anti-synergies : Riposte −0,19, Épines −0,24, Purification −0,16, Dé creux −0,20 à −0,30. **Garder**.
- **Riposte** (face 2 d'Aldric) : kit +17,5 ; Elaria +8,6 (4) ; Vindicte +0,25 (Brokk) ; anti-synergie Rétribution −0,19. Ligne de 85 caractères, la deuxième plus longue. **Garder**.
- **Rancune** (réserve de Morgrut) : Brokk +14,9 (4) ; anti-synergies chez Morgrut : Clepsydre −0,32, Dé creux −0,30, Trophée −0,29, Pièce de foire −0,27. **La seule consommatrice du lot 1 dans la bande chez tous ses porteurs.** **Garder**.
- **Feux follets** (signature de Thaldrin, forme humaine) : kit +13,6, vue dans 51 % des combats ; aiguisée chez Thaldrin (44 actes) +3,4, copiée +11,4. **Briquet d'amadou −0,64** (Ervald : une nouvelle Brûlure remplace l'ancienne), Aura glaciale −0,24. **Retoucher le rang** (R3).
- **Foudre** (face 2 humaine de Thaldrin, aucun répertoire) : kit **+6,2**, la plus faible du roster, 0,64 fois par combat ; **dans ses builds +2,4, la plus faible brique de kit du jeu** ; aiguisée +4,4, copiée +6,6. Texte « 3 × 1 dégât direct » : une écriture de calcul (T5) ; sans contrôle d'audit propre. **Signaler** : toute hausse monte un Thaldrin premier en vanilla (54,9 %) ; O3.
- **Embrasement** (réserve de Thaldrin) : 145 offres, 0,95 fois par combat ; Ervald 11 / 1 ; rang II faible, connu (SORTS § 23, série 28). Ligne de 100 caractères (T6). **Garder**.
- **Duo** (signature de Fanchon) : kit **+30,6 ± 1,7, « écrasante »**, renverse 35 % des combats ; aiguisé dans 27 actes +5,2. Anti-synergies : **Soliste −0,78**, **Ouverture −0,49**, Conque −0,34, Cloche −0,33, Crescendo −0,31 [INFERENCE : Soliste limité à 1x ne grandit pas avec les jets du Duo]. **Garder** (choix de l'utilisateur, SORTS § 25) ; « écrasante » et la copie à +17,9 signalées.
- **Soliste** (face 2 de Fanchon, 1x) : kit +15,6, 0,63 fois par combat ; aiguisé +6,1, copié +7,3 (la limite reste 1x) ; rang II au kit +8,3 (bord). **Garder**.
- **Siffloter** (réserve de Fanchon) : une Aura de sainteté de deux tours ; **aucun test**. **Retoucher** (P5) et ajouter un test.
- **Fausse note** (réserve de Fanchon) : aiguisée +3,5 (n 4) ; un seul test. **Retoucher** (P4).
- **Crescendo** (réserve de Fanchon) : seule ligne avec l'apostrophe courbe (T7). **Garder**.

### 2.3 Constats transverses

1. **Deux échelles** : chez le porteur construit, une brique vaut 40 à 60 % de sa gravure. Moyenne des gravures par personnage de +7,3 (Thaldrin) à +12,0 (Elaria) ; part sous 8 points de 24 % (Elaria) à 71 % (Thaldrin) : Ervald 65 %, Fanchon 55 %, Gorak 54 %, Ysolde 51 %, Brokk 50 %. Même écart pour les rangs (Pourfendre II +4,1 gravé, +2,4 chez Gorak).
2. **L'écho pousse les consommatrices au sommet de l'offre** : Curée dans 99 actes de Gorak sur 120, Embrasement 104 (Thaldrin), Virulence 83 et Récolte 78 (Ervald), Dé pipé 73 (Naraxes). Une consommatrice faible coûte deux fois : souvent prise, elle prend la place d'une généraliste.
3. **Les consommatrices conditionnelles meurent sur leur condition** (voir En bref, point 5). Une compétence de face part de 0,6 à 1,4 fois par combat, dans des combats construits de 4,8 (Fanchon) à 6,3 tours par combattant (Brokk, Ysolde) : c'est tout le budget d'une consommatrice conditionnelle. Le levier mesuré est la condition (P1).
4. **Les producteurs d'une même ressource se gênent** : Dé creux × Esquive −0,49 (Naraxes), −0,61 (Fanchon) ; Briquet × Feux follets −0,64 (Ervald) ; Pièce de foire × Pile ou face −0,45 (Fanchon), et contre la Furie chez Elaria (−0,48), le Coup de chance (−0,28) ; Croc de boucher × Curée −0,21 (Brokk, deux consommateurs). Voir X2.
5. **Anti-synergies internes aux kits**, cause non établie : Furie × Pourfendre −0,39, Duo × Soliste −0,78, Duo × Ouverture −0,49, Pile ou face × Aura de décoction −0,36, Aura glaciale × Vol de vie −0,20. [INFERENCE] Retirer deux compétences d'un kit fait tomber le personnage très bas, où la log-cote amplifie l'écart : à vérifier avant d'en tirer une règle.
6. **Onze généralistes sans partenaire au-delà de +0,25** : Furie, Vol de vie, Peur, Coup de chance, Purification, Foudre, Soliste, Siffloter, Fausse note, Crescendo, Riposte (+0,29 chez Elaria seulement). Le Gambison est le meilleur partenaire de beaucoup (+0,26 à +0,43).
7. **Les opérations de forge** (ablation, moyenne par personnage) : copier +7,2 à +12,4, tremper +8,7 à +12,2, aiguiser +3,7 à +6,7, **dorer +2,7 à +4,6**, toujours l'opération faible.
8. **Textes** : sept retouches (T1 à T7), à faire dans les générateurs ; une seule incohérence typographique.
9. **Code** : Siffloter sans test, Fausse note avec un seul ; Peur et Foudre sans contrôle d'audit propre ; sept compétences reposent sur un crochet que leur seul statut utilise (`forcesCrit`, `forcesDodge`, `drainsHit`, `coinToss`, `reflectsHit`, `fillsOnHurt`, `shield`).
10. **Le seul « multiplicateur nourri » mesuré ne se lit pas en P8** : Œil de faucon × Aura de précision −0,09. En log-cote, une brique qui grossit un multiplicateur déjà haut s'additionne ; la « boucle » se voit dans la valeur chez la porteuse (Aura de précision +15,2 chez Elaria, +9,4 chez Gorak). Conséquence pour § 13.4, étape 3 : mesurer une boucle par la valeur chez le porteur construit.

## 3. Les familles

### 3.1 Les trous

| Famille | Côté bonus | Côté malus | Ressource sans consommateur en compétence | Trou |
| --- | --- | --- | --- | --- |
| Puissance | Aura de puissance, sauvage, mélodieuse, Vindicte, Soliste, Crescendo | Fausse note (une charge) ; Affaibli inutilisé | — | pas de malus durable (couvert de fait par l'Aura d'intimidation, rangée en Garde) |
| Garde | Peau de pierre, Aura d'intimidation | **aucun** (Vulnérable, Brèche inutilisés) | — | **le côté malus** (I2) |
| Précision | Œil de faucon, Aura de précision, Rancune | aucun (Aveuglé non écrit) | les critiques : une seule consommatrice | une seconde consommatrice de critiques (I4) |
| Esquive | Esquive améliorée seule | Luciole sans porteur | **les esquives** : aucune consommatrice en compétence (la Conque, relique) | une esquive permanente (I3), une consommatrice d'esquive |
| Tempo | Furie, Curée, Coup de chance, Duo | Peur ; Étourdi inutilisé | — | — |
| Fortune | Coup de chance, Pile ou face, Dé pipé, Duo | aucun (Malchance : moteur) | — | malus (moteur) |
| Affliction | riche (Poison, Saignement, Brûlure, dégâts directs) | — | — | la Brûlure n'a qu'un producteur (Feux follets) |
| Soin | Vol de vie, Sainteté, Récolte, Siffloter | aucun (Hémorragie : moteur) | **les soins** : une consommatrice (Sentence) | une consommatrice de soins qui tienne la bande (I1, ou A1) |
| Représailles | Riposte, Rétribution | — | — | — |
| Sceaux | Purification, Aura d'immunité | **aucun** | — | le côté malus (Sceau, écarté) |

### 3.2 Les idées mesurées

Gravées sur la face 3 nue des dix hôtes, 400 combats par duel ; partenaires chez les hôtes visés, 200 par duel ; série 41 du laboratoire, audit propre. Chiffres et avis : I1 à I4 au § Décisions.

- **I1 Bouclier de foi** (Garde, consommatrice de soins ; nourrit aussi l'armure vidée) : la boucle d'Ysolde, soins → armure. Partenaires aussi chez Fanchon (Onguent +0,40, Siffloter +0,28) et Ervald (Chapelet +0,32, Onguent +0,31).
- **I2 Brèche** : le premier producteur du malus de Garde, une généraliste, sans règle nouvelle ; aucun lien mesuré avec les coups par action.
- **I3 Pas de côté** : au bas de la bande, sans partenaire aujourd'hui.
- **I4 Plaie ouverte** : faible hors des critiques fréquents (Ervald 24 %).

### 3.3 Essayées et écartées

- **Sceau** (malus de Sceaux, `wards` posé sur l'adversaire) : bloque 2 bonus +7,4, 3 bonus +7,8 (rang +0,3) ; en tours, 2 tours +5,0, 3 tours +6,2 (rang nul) ; aucun partenaire. Il ne vaut que contre des builds chargés de bonus : à remesurer contre des construits.
- **Contre-pied** (consommatrice d'esquive) : 3 PV à l'attaquant +4,0, 6 PV +6,1, +3 Ferveur +3,8, un critique assuré +4,9 ; Elaria seule de +11 à +18. L'esquive est trop rare hors d'Elaria.
- **Frénésie** (+3 % de critique par coup qui touche, 10 au plus) : +5,4, aucun partenaire.
- **Éblouir** (Étourdi si l'adversaire brûle, 1x ou 2x) : +0,3 ; part 0,15 fois par combat.

### 3.4 Trous qui demandent le moteur (non mesurés)

**Hémorragie** (soins réduits, malus de Soin), **Malchance** (un jet adverse imposé, malus de Fortune), **Aveuglé** (malus de Précision). Pour le Rempart : un moment « son armure temporaire encaisse un coup ».

## 4. Méthode et limites

**Mesures** (400 combats par duel pour une valeur finale, mêmes graines que `npm run balance`) :
- **Gravée, rang, kit** : `scripts/skills.report.ts` (`SKILLS_PART=engrave|rank|kit`). Auras : `logs/skills/2026-10-25-12-35-54_v0.117.1.md` (gravures), `…12-38-17…` (rangs), `…12-36-12…` (kits). Compétences : `…12-41-11…` (kit), `…12-43-17…` (gravures), `…12-47-14…` (rangs). Marge à 95 % d'une valeur par hôte : environ ± 1,2 point (± 1,1 à ± 1,7 au kit).
- **Porteurs réels** : script jetable partagé, données brutes `logs/lab/review2-carriers.json`. Offre : 120 actes par personnage (graines `builds:<id>:<s>` de `npm run campaign`), sans combat. Valeur : les 48 builds de l'étude de la montée à 10 récompenses, contre le build de même indice des neuf autres, 60 combats par duel (540 par build) ; ablation de chaque gravure, aiguisage, copie et compétence de kit. Marge d'une moyenne ± 1 à ± 3 points selon n.
- **Partenaires (P8)** : L(AB) − L(A) − L(B) + L(∅) en log-cote, contre le roster nu, 200 combats par duel (± 0,07 de bruit) ; partenaire au-delà de +0,25, anti-synergie sous −0,15.
- **Vie en combat des auras, tempo, variantes, Pourriture, leurre** : `logs/lab/ReviewAuras-*.md` (200 combats par duel pour la vie en combat et le tempo, 400 pour les variantes).
- **Laboratoire** : séries 40 (retouches) et 41 (idées), `logs/lab/2026-10-25-12-54-03_v0.117.1.md` et `logs/lab/2026-10-25-12-53-33_v0.117.1.md` ; **aucun problème d'audit** ; le drapeau « hors budget » est attendu (une gravure de plus sort un vanilla de 42 à 58 %).
- **Nettoyage** : scripts jetables supprimés (`scripts/tmp-reviewauras.report.ts`, `scripts/tmp-review2-*`), séries 40 et 41 retirées de `scripts/lab/ideas.ts`. Restent les rapports dans `logs/` (ignoré par git).

**Limites** :
- Chaque proposition est mesurée seule ; leur somme, le `npm run balance` du roster vanilla (P3, O3) et la campagne ne le sont pas.
- Les valeurs chez les porteurs reposent sur 2 à 48 builds : sous 6 à 10 builds, un ordre de grandeur (n indiqué partout).
- Les partenaires sont mesurés contre le roster nu, pas contre des construits ; les paires internes à un kit retirent une compétence du vanilla.
- Les variantes d'aura sont patchées en mémoire et ne sont pas passées à l'audit de résolution (les retouches de compétences et les idées, si : séries 40 et 41).
- Deux écarts entre les fiches et les tableaux de mesure de la revue des compétences, gardés tels quels : rang II de Siffloter (+3,3 à la fiche, +2,4 au départ de P5) et du Dé pipé (+0,1 à la fiche, +1,2 au départ de O2) ; chaque proposition se lit contre son propre « avant », mêmes graines.
- Les idées sont des statuts d'essai : ni icône, ni son, ni mise en scène. Rien n'a été vu à l'écran ; la lisibilité vient de la lecture du code.
