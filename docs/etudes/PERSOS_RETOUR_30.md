# Les personnages du retour du 30 octobre : diagnostics et propositions

_Étude de l'agent PropPersos, 2026-10-30, sur la 0.131.2 ([retour du 30 octobre](../../prompts/Retour%20du%2030%20octobre.md), points R10, R15, R17, R18, R21, R23, R24, R26 à R28, R31, R34 à R39, R41, R45 à R49, R81 du registre [RETOUR_30.md](../RETOUR_30.md)). **Rien n'est livré au jeu** : ce sont des visions, chiffrées, à valider par l'utilisateur avant tout code. Laboratoire : `scripts/lab/persos-30.ts`, séries 120 à 129._

## 0. En bref

| Personnage | Ressenti | Ce que montrent les chiffres | Proposition | Avant → après |
| --- | --- | --- | --- | --- |
| Brokk | Épines « 1 saignement, nul » | le 1 tombe aussitôt (Saignement 1 = 1 PV) ; l'aura vaut pourtant +32,6 points | **Épines plantées** : chaque coup reçu lui plante une épine ; son prochain coup qui touche les enfonce toutes, Saignement 2 par épine | départ 49,3 → 49,8 % (même force) |
| Brokk | Onde de choc faible | 2 PV par coup encaissé, 6 au plus | **3 PV par coup encaissé** (9 au plus) | gravée +4,1 à +4,5 de plus chez ses trois porteurs (≈ +13 → +17, dans la bande) |
| Brokk | toujours Rétribution et Serment | 10 compétences offrables, l'offre ne se répète pas plus qu'ailleurs (4 à 7 %) | du contenu au Rempart (R22, Parite) | — |
| Ervald | Aura de poison « 1 au début » | 1, 1, 2, 2, 3 par tour, qui s'empilent sans fin | **Tous les deux tours, Poison 4** | départ 48,2 → 53,7 % ; direction Poison +0,1 |
| Ervald | full Ombre écrase le boss | l'Ombre garde 57,3 % contre des adversaires à 2 fois leurs PV (le Poison : 16,9) ; dans son combat contre le Colosse, 21 actions sur 41 du boss perdues, Effroi à 8 charges (+35 % de critique) | **Effroi plafonné à 3 charges** (+10 % au plus) ; et au boss, une règle à lui : **Inébranlable** (après une action perdue, la suivante est garantie) | roster −0,1 ; 2× PV −2,4 ; boss approché (répit) −20,7 |
| Ysolde | Jugement « un Effroi en moins bien, trop de si » | il produit la même Peur que l'Effroi et la Peur d'Ysolde, par un autre chemin | **Le verdict** : au 3e coup reçu de l'attaquant, il perd 8 PV de Lumière (plus de Peur) | départ 49,6 → 49,0 % |
| Ysolde | chemin tout tracé | l'offre est la plus étalée du roster (les 2 plus offertes : 23-24 %) ; ce sont ses briques qui se ressemblent (soins, contres) | du contenu de la Lumière (PropContenu) ; le verdict ouvre la « punition » | — |
| Morgrut | ses deux auras disent la même chose | Puissance et Rancœur : deux façons de frapper plus fort | seconde aura du Rempart qui **tient** : **Cuir épais**, chaque coup reçu, +3 armure temporaire | départ (seconde aura) 49,3 → 46,6 % |
| Morgrut | trop fort parce que simple ? | non : le plus faible construit (43,7 %, pente −5,8) | — | — |
| Thaldrin | Ciel d'orage « fait pas rêver » | 1 puis 2 éclairs de 1 | **Tous les trois tours, 3 éclairs de 2** (la scène de la Foudre) | départ 56,9 → 56,8 % |
| Thaldrin | pot-pourri, ours mal exploité | l'offre lui donne autant de Poison (vert-de-gris, Souffle, Crapaud : 22 à 26 %) que de Magie ; la Foudre n'est offerte que 11 à 14 % ; le Brasier tire le feu | maîtrises **Magie + Fureur** (au lieu du Poison) ; seconde aura **Élan** (au lieu du Brasier) | Élan au départ 52,1 → 56,1 % ; gravures de Fureur +4,7 à +5,5 sur celles du Poison |
| Fanchon | Ballade nulle | +1 PV par coup, refrain 4 × 1 | **Ballade sans « +1 »** : une note par coup qui touche, au 4e, le refrain : 4 éclats de 2 et +4 PV | départ 50,5 → 52,4 % |
| Fanchon | un seul axe | son axe magie (Éclair aveuglant, Foudre) vaut autant que l'axe des coups (+22,6 contre +22,9) ; c'est son kit (Duo, Veine) qui ne parle que de coups | la Ballade refaite porte l'axe magie ; Duo rebaptisé (PropContenu : « Écho ») | — |
| Elaria | un peu trop forte | vanilla 55,1 % (au haut de la bande), pire duel Gorak 62,3 % ; dans la Saignée de l'utilisateur, Coup de chance +10,1, Sangsue +8,4 | **critique 17 → 15 %** (ou esquive 24 → 22 %) ; Sangsue inchangée | 55,1 → 52,8 % |
| Aldric | mort très vite contre Naraxes | sa défaite : un critique de 12, puis pile ×3 sur le coup critique, +24 : 36 PV en une action (58 % de ses PV) | question à l'utilisateur : pile ×3 sur un critique (un « moment » voulu) ou pile ×2 (Naraxes 52,3 → 47,6 %) | — |
| Récolte (R31) | « draine autant de PV que de Poison » | ×1 (livrée par Rythme) : Ervald +6,8, Naraxes +5,3 au labo ; +10,9 et +9,3 au rapport des compétences | ×1 tient selon le rapport des compétences (l'outil de référence des gravures) ; ×2 possible | voir § 9.2 |

## 1. Méthode

- **Départs** : le personnage vanilla (son aura sur le 1, sa compétence sur le 2) contre les neuf autres, 400 combats par duel, mêmes graines que `npm run balance` (écart apparié, marge à 95 % de ± 0,5 à ± 1,7 point). « Avant » : la 0.131.2 telle quelle, sauf mention.
- **Gravures** : la brique sur le 3 nu ; « avant » : la brique du registre au même endroit, ou la face nue.
- **Directions** : l'aura et deux gravures (sur le 3 et le 4) contre le roster nu : un indicateur de synergie (les taux de 65 à 85 % sont normaux : un dé gravé contre des dés nus).
- **Combat long** (le boss approché) : ses adversaires à 2 fois leurs PV (4 fois laissait tous les départs à 0 %). Le Colosse règle ses PV jusqu'à 5 fois sa base ; un build qui gagne encore à 2 fois est un build qui écrase le boss.
- **Offres** : 120 actes par aura (10 graines × 12 variantes, comme `npm run campaign`), offre et choix par défaut, sans combat (script jetable, supprimé).
- **Traces de l'utilisateur** : `LOGS_SINCE=2026-10-28_21-00 npm run logs` (185 combats, aucune anomalie d'audit, `logs/reports/2026-10-30-10-40-06_combats.md`).
- Rapports du laboratoire (`logs/lab/`, v0.131.2) : série 120 `2026-10-30-10-50-45` et `…10-56-04` ; 121 `…10-54-15` ; 122 `…10-54-26` ; 123 `…10-54-47` ; 124 `…10-55-22` ; 125 `…10-55-33` ; 126 `…10-55-54` ; 127 `…10-52-29` ; 128 `…10-59-00` ; 129 `…10-59-28`. D'autres agents modifiaient le registre en même temps (Récolte, textes) : les « avant » des séries sont restés identiques d'un rapport à l'autre.

## 2. La règle « pas de +1 / −1 » (R18)

**Proposition de règle, pour tous** : un chiffre qui s'affiche vaut **2 ou plus**. Une ressource qui arrive au compte-gouttes se **regroupe** : un compteur visible sur le porteur (1/3, 2/3) puis un gros effet, ou un effet plus gros un tour sur deux. Les deux formes ont été mesurées à force égale (épines plantées, Poison 4 un tour sur deux, Ciel tous les trois tours, Ballade et son refrain, Jugement et son verdict) : on peut regrouper sans changer l'équilibre.

Ce qui reste à « 1 » aujourd'hui (registre de la 0.131.2) :

| Brique | Le « 1 » | Proposé ici | Sinon |
| --- | --- | --- | --- |
| Aura d'épines | Saignement 1 puis 2 | épines plantées, Saignement 2 par épine (§ 3) | — |
| Aura de poison | Poison 1, 2, 3 | Poison 4 tous les deux tours (§ 4) | — |
| Aura de décoction (Naraxes) | Poison 1, 2, 3 par coup | — | même règle possible : « tous les deux coups qui touchent, Poison 4 » (non mesurée) |
| Aura de sainteté | +1 puis +2 PV | — | « tous les deux tours, +4 PV » (non mesurée) |
| Ciel d'orage | 1 puis 2 éclairs de 1 | 3 éclairs de 2 tous les trois tours (§ 7) | — |
| Ballade | +1 PV par coup, refrain 4 × 1 | refrain 4 × 2 et +4 PV (§ 8) | — |
| Brasier | +1 Brûlure par tour | sort de la fiche de Thaldrin (§ 7) | — |
| Jugement | 1 faute par coup | le verdict à 8 (§ 5) ; la faute reste un compteur 1/3 | — |
| Visée, Aura de puissance | +1 par esquive, +1 par gros coup | — | ce sont des compteurs qui montent (×+3, +6) : ils se lisent |
| Foudre | 4 éclairs de 1 | — | « 2 éclairs de 2 » (même total), à mesurer avec PropContenu |
| Duo | un coup brut | — | son rang ajoute un coup : à voir avec le rebrand (PropContenu) |
| Coup de chance | un jet de plus | — | R16 (PropDes) |

## 3. Brokk

### 3.1 L'Aura d'épines (R17)

**Ce qui se passe** : chaque coup reçu pose Saignement 1 (2 après deux montées) ; le Saignement coule au coup suivant de Brokk et perd une charge : 1 PV, puis il n'y a plus rien. Le chiffre ne grossit jamais à l'écran. L'aura n'est pas faible : +32,6 points de valeur nette (`npm run balance`, 0.128), +36,6 dans les builds (`npm run ramp`). C'est sa forme qui ennuie.

| Aura d'épines (départ de Brokk, avant : le registre, 49,3 %) | Départ | Avec Curée et Odeur du sang (avant : 76,3 %) |
| --- | --- | --- |
| Saignement de la moitié du coup reçu | 81,0 (+31,7) | — |
| Saignement du tiers du coup reçu | 70,6 (+21,3) | — |
| Au 3e coup reçu, Saignement 5 | 48,6 (−0,7) | 67,0 (−9,3) |
| Au 3e coup reçu, Saignement 6 | 54,4 (+5,2) | — |
| **Épines plantées, son coup les enfonce : Saignement 2 par épine** | **49,8 (+0,5)** | **72,0 (−4,3)** |
| Épines plantées, Saignement 3 par épine | 63,2 (+13,9) | — |

**Proposition** : les **épines plantées** : « Chaque coup reçu lui plante une épine. Son prochain coup qui touche les enfonce toutes : Saignement 2 par épine. » Le compteur grandit sur Brokk pendant qu'il encaisse (2, 3, 4 épines), puis la plaie s'ouvre d'un coup quand il rend le coup : sa personnalité (« on se blesse en le frappant et la plaie s'ouvre quand il rend le coup »). Même force au départ. **Prix** : ses consommatrices du Saignement (Curée, Odeur du sang) le voient saigner moins souvent (−4,3 dans cette direction, encore à 72 %). Le 1 du dé, une fois l'aura posée, ajoute une épine (règle de la montée). Variante à force égale : « au 3e coup reçu, Saignement 5 », plus lisible encore, mais −9,3 avec la Curée.

### 3.2 L'Onde de choc (R21)

2 PV par coup encaissé, des trois derniers : 6 au plus, ce que l'utilisateur voit « faible ».

| Onde de choc gravée sur le 3 (avant : celle du registre) | Brokk | Aldric | Morgrut |
| --- | --- | --- | --- |
| **3 PV par coup encaissé** | **+4,5** | **+4,1** | **+4,3** |
| 4 PV par coup encaissé | +8,7 | +7,9 | +8,1 |
| l'onde de son armure temporaire (×1 ou ×2) | −10,1 | −8,2 | −9,5 |

Gravée, celle du registre vaut +13,0 en moyenne (MAITRISES § B8) : à 3, environ **+17** (dans la bande de 8 à 20) ; à 4, environ +21 (au-dessus). L'onde de l'armure ne part presque jamais (la Peau de pierre est vidée avant le 3) : écartée. **Proposition : 3 PV par coup encaissé, 9 au plus.** Le texte (R20, Textes) devrait dire le nombre : « L'adversaire perd 3 PV par coup qu'il a encaissé, des trois derniers (9 au plus). »

### 3.3 La profondeur de maîtrise (R22, avec Parite)

| Offre de forge (120 actes) | Brokk Épines | Brokk Bastion |
| --- | --- | --- |
| Compétences offrables | 10 | 10 |
| Offre identique à la précédente | 4 % | 7 % |
| Présence dans les offres Graver | Curée 29, Riposte 27, Onde de choc 26, Rancune 24, Rétribution 23, Sangsue 23, Odeur du sang 19, Serment 13, Pourfendre 11, Hémorragie 6 % | Serment 27, Pourfendre 27, Riposte 27, Onde 26, Rancune 25, Rétribution 23, Hémorragie 21, Curée 12, Sangsue 7, Odeur 6 % |

Le tirage n'est pas biaisé ; la réserve est petite : 10 compétences, comme Aldric et Morgrut, contre 14 chez Elaria, Naraxes et Fanchon. Le Rempart n'en offre que 4 à Brokk (sa Peau de pierre est sur son dé). Revoir trois fois la même paire en campagne est plausible avec 4 et 6 cartes. Le remède est du contenu au Rempart (cible du § B6 de MAITRISES : 9 à 10 briques, il en a 8).

## 4. Ervald

### 4.1 L'Aura de poison (R24)

1, 1, 2, 2 puis 3 Poison par tour, qui s'ajoutent au Poison déjà là. L'utilisateur voit « 1 » au début. À l'inverse, sans plafond, le Poison grossit de 2 par tour en fin de combat : dans un combat long (le boss), il ne s'arrête plus.

| Aura de poison (départ d'Ervald, avant : 48,2 %) | Départ | + Virulence, Morsure (avant 73,7 %) | + Virulence, Morsure, adversaires à 2 fois leurs PV (avant 29,4 %) |
| --- | --- | --- | --- |
| Tous les deux tours, Poison 3 | 45,5 (−2,7) | 69,1 (−4,6) | — |
| **Tous les deux tours, Poison 4** | **53,7 (+5,6)** ; pire duel Ysolde 63,2 | **73,8 (+0,1)** | **30,3 (+0,8)** |
| Poison 3, puis le Poison ne baisse plus | 31,4 (−16,8) | 66,1 (−7,6) | — |

**Proposition** : « **Tous les deux tours, au début de son tour, Poison 4 à l'adversaire.** » Le premier chiffre est 4. En moyenne, 2 Poison par tour au lieu de 1 à 3 : la fin de combat grossit moins vite. **Compensation** : aucune nécessaire ; +5,6 au départ le laisse dans la bande (53,7), sa direction Poison ne bouge pas. Si l'utilisateur la juge trop forte au départ : Poison 3 tous les deux tours (45,5 %).

### 4.2 L'Ombre et le boss (R23, R26)

**À préserver** (R23) : l'utilisateur trouve l'Ombre « jouissive » ; rien ici ne touche à la Peur, à la Confiscation, à la Malchance.

**Ce qui écrase le boss** : son combat contre le Colosse (`logs/combats/2026-10-28_23-00-45_ervald-vs-colossus…`, 358 PV, 83 tours) : Effroi, Vol de vie II copié, Malchance, Peur, Flétrissure. Le Colosse perd **21 de ses 41 actions** ; l'Effroi monte à **8 charges** (chaque 1 du dé ajoute +5 % de critique : 28 → 63 %), et chaque critique fait perdre une action. Ervald finit à 76/76 PV. Le contrôle ne dépend pas des PV de l'adversaire : plus le boss en a, plus il dure, plus il perd d'actions.

| L'Ombre de l'utilisateur (Effroi + Malchance, Peur, Flétrissure, Vol de vie) | Contre le roster | Adversaires à 2 fois leurs PV |
| --- | --- | --- |
| Registre | 88,5 % | **57,3 %** (la direction Poison au même endroit : **16,9 %**) |
| Effroi plafonné à 3 charges (+10 % de critique au plus) | 88,4 (−0,1) | 54,9 (−2,4) |
| Le répit chez ses adversaires (après une action perdue, la Peur suivante est parée) | 83,6 (−4,9) | 36,6 (−20,7) |

Le répit pour tous coûterait ailleurs : Ysolde au Jugement 49,6 → 43,3 %, Ervald à l'Effroi au départ 51,0 → 41,7 %. **Proposition** :
1. **L'Effroi plafonné à 3 charges** (une valeur de sa compétence) : il ne change rien aux combats courts et retire l'emballement des longs ;
2. **Le Colosse Inébranlable** : une règle du boss (son contenu, pas une exception de personnage) : après une action perdue, sa suivante est garantie. Mesuré en approché (le répit chez des adversaires à 2 fois leurs PV) : −20,7 points pour l'Ombre. Le réglage du boss relève de la difficulté de campagne : à décider avec qui la tient.

## 5. Ysolde

### 5.1 Le Jugement (R28)

Aujourd'hui : chaque coup qui la touche met une faute à l'attaquant ; à la 3e, il perd sa prochaine action (la Peur). Le texte est clarifié par Textes (il compte les coups reçus, jamais les tours). Le fond reste : il donne la même chose que l'Effroi et que sa propre compétence Peur, « en moins bien ».

| Jugement (départ d'Ysolde, avant : le registre, 49,6 %) | Départ | Pire duel |
| --- | --- | --- |
| à la 3e faute, l'attaquant perd 6 PV | 43,3 (−6,4) | Thaldrin 35,3 |
| **à la 3e faute, l'attaquant perd 8 PV** | **49,0 (−0,6)** | Gorak 58,8 (62,7 avant) |
| à la 3e faute, l'attaquant perd 10 PV | 53,9 (+4,3) | Gorak 64,0 |

**Proposition** : **le verdict** : « Chaque coup qui la touche met une faute à l'attaquant. À la 3e, le verdict tombe : il perd 8 PV (Lumière), et ses fautes partent. » Un seul « si » (la 3e faute), un chiffre qui se voit (1/3, 2/3, puis −8 en ivoire et or), et un verbe qui n'est plus la Peur : la juge punit, l'Ombre terrifie. Même force ; son pire duel s'adoucit.

### 5.2 Le chemin tout tracé (R27)

L'offre d'Ysolde est la plus étalée du roster : 12 compétences, les deux plus offertes à 23-24 % (Sainteté : Duo, Bouclier de foi, Foudre, Sentence ; Jugement : Prière, Éclair aveuglant, Duo, Dîme). Ce n'est pas le tirage. Ses briques de Lumière disent toutes « soigne-toi » ou « rends le coup », et la Lumière n'a qu'elle pour porteuse. Le verdict ajoute un axe « punir » ; le reste est du contenu de la Lumière (PropContenu) : une brique qui lit les fautes (une Sentence qui frappe plus fort l'adversaire en faute, par exemple), à mesurer avec le verdict.

## 6. Morgrut

### 6.1 Deux auras, une seule direction (R36, R38)

L'Aura de puissance (+2, puis +1 par gros coup, jusqu'à +6) et la Rancœur (+3 Ferveur par coup reçu) disent toutes deux « il frappe plus fort ». La seconde aura doit venir du Rempart (une aura par maîtrise) : elle peut être celle qui tient.

| Seconde aura de Morgrut (avant : la Rancœur, 49,3 %) | Départ | Pire duel |
| --- | --- | --- |
| **Cuir épais : chaque coup reçu, +3 armure temporaire** | **46,6 (−2,6)** | Gorak 65,8 (59,0 avant) |
| Cuir épais à +4 | 57,5 (+8,3) | Gorak 78,3 |
| Rancœur : Ferveur égale à la moitié du coup reçu | 55,3 (+6,1) | Gorak 61,8 |

**Proposition** : la seconde aura de Morgrut devient le **Cuir épais** (+3 armure temporaire par coup reçu ; Rempart) : la Puissance pour le cogneur, le Cuir pour le gros tas qui encaisse (le sustain que l'utilisateur cherchait contre le Colosse) ; elle nourrit le Bastion, la Riposte et l'Onde de choc de la réserve du Rempart. Son pire duel (Gorak 65,8 %) touche la limite de 65/35 : à surveiller. **À noter** : le contre-test du combat long (2 fois les PV) laisse Morgrut nu à 0 % avec toutes ses auras : il ne dit rien du sustain ; seule la campagne le dira (`npm run campaign`, une fois l'aura au registre).

### 6.2 Trop fort parce que simple ? (R37)

Non. Nu, 48,6 % (Puissance) ; construit, le **dernier** du roster à 10 récompenses (43,7 %, `npm run ramp` 0.128), pente −5,8, 75 % de ses builds sous 50 %. Sa simplicité vient de sa règle (quatre faces de compétence, choix de l'utilisateur) : il grave 1,23 compétence par acte, et ses forges vont à l'aiguisage (Assaut aiguisé +14,8, au-dessus de la bande d'un rang). Son offre de gravure est la plus concentrée : Peau de pierre 39-40 %, Brise-garde 25-35 %.

## 7. Thaldrin

### 7.1 Le Ciel d'orage (R39)

1 puis 2 éclairs de 1 par tour. Thaldrin est déjà le plus fort nu (56,9 %) : le Ciel peut devenir plus beau, pas plus fort.

| Ciel d'orage (départ, avant : 56,9 %) | Départ |
| --- | --- |
| un éclair de 3 à chacun de ses tours | 68,8 (+11,9) |
| un éclair par tour, et ses éclairs +2 (l'idée de l'utilisateur, la Surtension dedans) | 68,8 (+11,9) ; avec le critique 15 → 8 % : 64,0 |
| un tour sur deux, 3 éclairs de 2 | 66,0 (+9,1) |
| un tour sur deux, 2 éclairs de 2 | 58,4 (+1,6) |
| un tour sur deux, un éclair de 3 | 54,2 (−2,6) |
| **un tour sur trois, 3 éclairs de 2** | **56,8 (−0,1)** |

**Proposition** : « **Tous les trois tours, l'orage éclate : 3 éclairs de 2 sur l'adversaire.** » Même force ; un vrai moment (la scène de la Foudre joue à partir de 2 éclairs, M60), un compteur 1/3, 2/3 sur l'aura. Avec la Foudre et l'Éclair aveuglant, la variante « un tour sur deux, 2 éclairs de 2 » ne gagne que +1,2 : les deux restent sages en build. L'idée « ses éclairs +2 » vaut +11,9 : trop, même en retirant la moitié de son critique.

### 7.2 Le druide, l'ours et le feu (R41, R46)

**Ce que montre l'offre** (120 actes par aura) : avec le Ciel d'orage, Attiser 28 %, Embrasement 27 %, **Pièce vert-de-gris 26 %, Souffle de la tombe 25 %, Peau de crapaud 25 %**, Duo 19 %, **Foudre 14 %**, Éclair aveuglant 13 %. Sa signature (les Feux follets) produit la Brûlure, donc l'écho de l'offre pousse le feu ; sa seconde maîtrise, le Poison, n'a aucune aura sur sa fiche et remplit l'autre moitié des offres. La Foudre, le cœur de l'orage, est la moins offerte. C'est le pot-pourri. Construit, il descend de 60 % (nu) à 44,5 % à 10 récompenses : la pente la plus négative du roster (−15,5) ; son Ciel ne vaut que +12,8 dans ses builds (la plus basse des auras de départ).

**Ce que gagnerait l'ours** : ses gravures servent les deux formes (M8) ; l'ours frappe à +3. Des compétences de corps à corps lui vont mieux que le Poison :

| Thaldrin, deux gravures sur le 3 et le 4 | Avant (Poison) | Après (Fureur) |
| --- | --- | --- |
| Ciel + Furie des vents, Assaut (avant : Pièce vert-de-gris, Souffle de la tombe) | 73,8 | **79,2 (+5,5)** |
| Ciel + Brise-garde, Soliste (avant : Pièce vert-de-gris, Peau de crapaud) | 76,0 | **80,7 (+4,7)** |
| Élan sur le 1 (avant : le Brasier) | 52,1 | **56,1 (+4,0)** |
| Élan + Assaut, Brise-garde (avant : Brasier + Attiser, Embrasement) | 76,1 | **79,6 (+3,5)** |

**Proposition** (une vision, la plus large de cette étude) :
- ses maîtrises : **Magie et Fureur** (le Poison sort ; la Fureur passe à 3 porteurs, le Poison à 2) : l'homme appelle l'orage, l'ours frappe ;
- ses auras : **Ciel d'orage** (Magie, § 7.1) et **Élan** (Fureur, celle de Gorak : +10 % de critique ; chaque gros coup, +4 Ferveur) au lieu du Brasier. Le feu reste sa signature (les Feux follets) et dans sa réserve (Attiser, Embrasement), sans aura qui le pousse ;
- **compensation** : son Élan part à 56,1 % (dans la bande) ; à la Fureur, ses builds montent (+3,5 à +5,5 en direction) ; sa pente négative devrait se redresser, mais seul `npm run ramp` le dira, avec la réserve au registre. Si sa force nue (56,9 %) reste la plus haute, son critique 15 → 12 % est le levier (non mesuré).

**R41** (morts aux combats 1, 2, 5) : en campagne (0.129), ses départs atteignent le boss à 23 % (Ciel et Brasier), la chance aux nœuds 1-2 est de 82 % ; trois défaites d'affilée sont du tirage, mais ses builds partent dans tous les sens (ci-dessus).

**R45** (le combat contre Elaria « interminable ») : `2026-10-29_22-25-02_thaldrin-vs-elaria` : 19 tours (sa moyenne : 12), **14 esquives** d'Elaria (30 % d'esquive affichés, son Esquive améliorée gravée en plus), et l'Éclair aveuglant de Thaldrin annule ses critiques : sa Visée monte sans jamais partir. Deux défenses face à face, puis la Brûlure finit le travail. Rien d'anormal ; c'est la seule partie longue des cinq (9 à 15 tours pour les autres).

## 8. Fanchon

### 8.1 La Ballade (R47)

+1 PV par coup qui touche, une note ; à la 4e, quatre notes de 1 dégât. Deux « 1 ».

| Ballade (départ de Fanchon, avant : 50,5 %) | Départ |
| --- | --- |
| **une note par coup qui touche ; au 4e, le refrain : 4 éclats de 2, +4 PV (plus de +1 PV par coup)** | **52,4 (+1,9)** |
| refrain au 4e : 4 éclats de 2, +8 PV | 57,4 (+6,9) |
| refrain au 3e : 3 éclats de 2, +3 PV | 54,7 (+4,2) |

**Proposition** : le refrain porte tout (4 éclats de 2 et +4 PV toutes les quatre touches). Le chiffre est un vrai coup (8 dégâts et 4 PV d'un seul geste) ; Fanchon touche souvent (Duo, Veine), le refrain revient vite. Si les éclats deviennent des dégâts de sort (une source magique, avec PropContenu), le « +1 par impact de sort » que mesure PropContenu les lira : la Ballade deviendrait le pont entre ses coups et la magie.

### 8.2 Un seul axe (R49)

Ses deux axes valent autant : **Veine + Coup de chance, Pièce de la rafale : +22,9** ; **Ballade + Éclair aveuglant, Foudre : +22,6** (contre son dé nu). L'offre les mêle déjà (Coup de chance 32 %, Feux follets 31 %, Foudre 27 %, Éclair aveuglant 27 %). Ce qui ne parle que de coups, c'est son kit : le Duo (un coup brut) et la Veine (deux coups bruts sur un 6). La Ballade refaite (8.1) et le Duo rebaptisé (PropContenu propose « Écho », un sort de Magie : l'action suivante résonne) rendent l'axe magie visible dès le départ. Avec la Ballade refaite, l'axe magie garde sa force (72,5 contre 73,1 %).

### 8.3 Aldric (R48)

Nu, Fanchon bat Aldric (54 %, `npm run balance` 0.128). Dans les traces de l'utilisateur, Fanchon perd 2 de ses 4 combats contre lui, chaque fois avec plusieurs Coups de chance ou la Pièce de la rafale : beaucoup de coups, et la Riposte entière renvoie chacun d'eux en entier (Vindicte : +6 Ferveur par renvoi). C'est le contre voulu des renvois ; il s'adoucira avec R16 (Coup de chance qui relance des coups blancs, PropDes).

## 9. Elaria, la Sangsue et la Récolte

### 9.1 Elaria (R15) et la Sangsue (R10)

Vanilla, 55,1 % (au haut de la bande ; pire duel contre Gorak, 62,3 %). Sa Saignée (l'utilisateur : Plaie ouverte, Pourfendre, Sangsue, Coup de chance), chaque brique retirée :

| Saignée d'Elaria | Valeur |
| --- | --- |
| Coup de chance | +10,1 |
| Sangsue | +8,4 (Brokk aux Épines : +12,3) |
| Sangsue à 2 charges (au lieu de 3) | −0,8 (Brokk −1,8) |

La Sangsue est dans la bande d'une gravure (8 à 20) : sa puissance ressentie vient de la taille du soin (1 PV par Saignement : 5 à 9 PV par coup après une Plaie ouverte et un Pourfendre), qui se lira mieux au moment de l'impact (R11, Rythme). **Rien à changer.** Ce qui la porte haut, c'est le Coup de chance (R16, PropDes) et sa force nue.

**Proposition** : **critique 17 → 15 %** (une stat secondaire, les PV intacts) : vanilla 55,1 → 52,8 % ; pire duel Gorak 61,3. Son critique nourrit à la fois la Plaie ouverte (Saignement 4 par critique), la Visée et l'Œil de faucon : c'est la source commune de « saignement, régén, critique ». Variante : esquive 24 → 22 % (52,4 % ; dans la Saignée, −1,6).

### 9.2 La Récolte (R31)

Rythme la recode en statut (soin au prochain coup qui touche = Poison de l'adversaire × facteur ; ×1 livré, la phrase de l'utilisateur). Mesure au laboratoire (gravée sur le 3 nu, contre la face nue) :

| Récolte | Ervald | Naraxes | Thaldrin |
| --- | --- | --- | --- |
| ×1 (registre, version de Rythme) | +6,8 | +5,3 | +0,3 |
| ×2 | +10,6 | +7,9 | +0,3 |
| ×3 | +13,7 | +10,4 | +0,3 |
| « draine » 1 (dégâts et soin) | +9,6 | +7,4 | +0,3 |

Rythme a mesuré au rapport des compétences (`scripts/skills.report.ts`, 200 combats par duel). À ×1, il trouve Ervald +10,9 et Naraxes +9,3, déjà dans la bande ; à ×2, +15,6 et +13,1. Mon laboratoire trouve 4 points de moins, et cet écart vient de la méthode. Le rapport des compétences est l'outil de référence des gravures : **×1 tient** et ×2 reste possible. Je ne maintiens pas ×3, que seul le laboratoire plaçait dans la bande. Chez Thaldrin, la Récolte ne part jamais : il n'a pas de Poison au départ.

## 10. Aldric (R34, R35)

**À préserver** (R34) : la course à l'esquive, des offres différentes, la Rétribution et le Trophée du chasseur qui retournent un combat ; l'offre d'Aldric au Larcin mêle bien ses deux maîtrises (Peau de pierre, Rancune, Onde, Rétribution 24 à 26 %, Malchance 20 %).

**R35, la « méga beigne »** : `2026-10-29_00-20-24_aldric-vs-naraxes` : Naraxes nue (40 PV) bat Aldric (62 PV) en 11 tours. L'action qui décide : un coup critique de 12, puis **pile ×3 sur le coup critique : +24**, 36 PV en une action, 58 % de ses PV. Pile multiplie le coup déjà critique (×2 × 3). Nu, Aldric contre Naraxes : 48 %, rien d'anormal ; c'est un pic de variance, le « casino » de Naraxes. Pile ×2 au lieu de ×3 la ramènerait de 52,3 à 47,6 % (−4,7). **Question à l'utilisateur** : ce coup est-il un moment voulu (pile sur un critique) ? Sinon, la règle propre serait « pile et critique ne se multiplient pas : le plus fort des deux » (non mesurée, une règle du moteur).

## 11. Les personnages encore mous (R81)

Construits à 10 récompenses (`npm run ramp`, 0.128) : Morgrut 43,7, Gorak 44,0, Thaldrin 44,5 % sont les derniers ; Fanchon 57,9 et Naraxes 56,9 les premiers. Les propositions de cette étude visent Morgrut (une seconde aura qui l'oriente) et Thaldrin (une réserve qui sert l'ours) ; Gorak n'était pas dans ce retour (son Élan reste au bord bas, Q12 de la refonte).

## 12. Questions à l'utilisateur

Chacune a un choix par défaut.
1. **La règle « 2 ou plus »** (§ 2) pour toutes les auras et compétences à ressource ? Défaut : oui, briques une à une, à force égale.
2. **Brokk, les épines plantées** (Saignement 2 par épine) ? Défaut : oui. Variante : au 3e coup reçu, Saignement 5.
3. **L'Onde de choc à 3 PV par coup encaissé** ? Défaut : oui (une valeur).
4. **Ervald, Poison 4 tous les deux tours** ? Défaut : oui. Variante : Poison 3 (45,5 %).
5. **L'Effroi plafonné à 3 charges** et **le Colosse Inébranlable** ? Défaut : l'Effroi oui ; le boss, avec la difficulté de campagne.
6. **Ysolde, le verdict à 8 PV** au lieu de la Peur ? Défaut : oui.
7. **Morgrut, le Cuir épais** (+3 armure temporaire par coup reçu) au lieu de la Rancœur ? Défaut : oui, sous surveillance (Gorak 65,8 %).
8. **Thaldrin, le Ciel tous les trois tours** (3 éclairs de 2) ? Défaut : oui.
9. **Thaldrin, Magie + Fureur et l'Élan** au lieu du Poison et du Brasier ? Défaut : oui, avec une mesure de montée (`npm run ramp`) avant livraison.
10. **Fanchon, la Ballade et son refrain** (4 éclats de 2, +4 PV) ? Défaut : oui.
11. **Elaria, critique 17 → 15 %** ? Défaut : oui ; Sangsue inchangée.
12. **Pile sur un critique** : un moment voulu ? Défaut : le garder.

## 13. Non vérifié

- Aucune de ces briques n'est au registre : ni `npm run ramp`, ni `npm run campaign`, ni la saison ne les mesurent ; le « combat long » n'est qu'une approche du boss (aucun combat contre le Colosse).
- Les directions sont mesurées contre le roster nu ; les taux absolus ne sont pas des taux de campagne.
- Le Cuir épais, le répit, les épines plantées et le verdict sont émulés par des statuts d'essai (`labP…`) ; le « 1 du dé qui ajoute une épine » et les textes ne sont pas mesurés.
- Le répit chez ses adversaires est l'approche du « Colosse Inébranlable » : la règle du boss elle-même n'est pas mesurée.
- Rien n'a été vu à l'écran ni entendu.
