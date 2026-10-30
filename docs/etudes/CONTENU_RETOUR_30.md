# Contenu : reliques, maîtrise Magie, identité des sorts (étude du retour du 2026-10-30)

_Points R50 à R56, R60, R62 du registre [RETOUR_30.md](../RETOUR_30.md) ; parole de l'utilisateur : [Retour du 30 octobre](../../prompts/Retour%20du%2030%20octobre.md). Agent PropContenu, sur la 0.131.2 (branche `regles-v2`)._

**Étude seulement : rien n'a changé dans `src/`.** Tout ce qui suit est une proposition, chiffrée, à valider par l'utilisateur avant d'être codée. Les mesures viennent du laboratoire (`scripts/lab/contenu-30.ts`, séries 140 à 149, 200 combats par duel, mêmes graines avant et après, contre le roster nu) et d'un relevé des offres de reliques (300 parties simulées par personnage et par aura, choix automatique, script temporaire supprimé).

## 0. En bref

| Point | Réponse courte |
| --- | --- |
| R55 Reliques fortes plus tard | **Rien ne l'organise aujourd'hui** : une relique apparaît pour la première fois en moyenne à la 2,8e offre, quelle qu'elle soit ; seules les consommatrices arrivent un peu plus tard (3,1 à 3,5) parce qu'elles attendent leur producteur. Proposition : trois paliers (§ 1.3), lus sur le nombre de reliques déjà portées, donc identiques en campagne, en saison et dans l'arbre. |
| R56 Usage restreint → recharge | Mesuré : une relique à 1 ou 2 déclenchements perd **3 à 6 points** quand le combat s'allonge (Braise captive +15,0 → +10,6, Géode +17,8 → +12,8) ; sa version à recharge garde sa valeur (Géode +3, recharge 4 : +14,8 → +13,8). Proposition pour 4 reliques (§ 1.2), maintien à 1x pour 7 autres, avec la raison. |
| R52 Braise captive | **« 2 braises de 2 PV au 4e tour puis tous les 4 tours, chacune +1 par Brûlure de l'adversaire »** : +13,8 en combat court, +14,8 en long (aujourd'hui +15,0 → +10,6), jusqu'à +21,4 chez un Thaldrin qui brûle. Variante « elle allume » : Brûlure 2 tous les 4 tours, +11,3 / +12,2. |
| R53 « Souvent les mêmes » | **Vrai, et mesurable** : une partie montre 15 cartes de relique, 13 différentes ; **25 reliques sur 37 sont offertes à tout le monde** au même taux (31 à 63 % des parties). Deux parties de suite du même personnage partagent 5,4 reliques sur 13 ; deux personnages différents en partagent 4,8 : l'offre ne dépend presque pas du personnage. |
| R54 Plus de reliques, combler les trous | Trous par maîtrise (§ 2) : Fureur, Sang (aucune source de Saignement), Poison, Ombre (une seule relique), Lumière, Magie. **Sept reliques et quatre compétences mesurées** (§ 5), une ou deux par trou. |
| R60, R62 Magie bridante, 8 maîtrises fixes | La Magie mélange trois thèmes (foudre 3 briques, feu 4, chant 2) et le Duo n'y fait aucun sort. Les 8 maîtrises ne sont pas le problème : ce sont des **réserves d'offre** ; le défaut est qu'elles servent aussi d'**étiquette de thème**. Options (§ 3) ; recommandation : garder 8 réserves, ajouter le mot-clé **« sort »** (les sources magiques existent déjà dans `damage.ts`), renommer et repeindre la Magie. |
| R51 Branding | Six briques gardent l'identité de la barde (icônes vérifiées) : Duo, Soliste, Crescendo, Siffloter, Fausse note, et l'emblème de la Magie (le nuage d'orage de l'ancienne maîtrise Orage). Renommages proposés au § 4. |
| R50 Duo + Éclair + Paratonnerre | À préserver : aucune proposition ne touche à leur mécanique ; la Focale (§ 5) donnerait à ce combo de Fanchon +11,7 (Paratonnerre seul : +3,2). |

**Lecture des mesures.** « Apport » : points de taux de victoire avec la relique moins sans, sur les mêmes graines. Avec ou sans effet, une relique donne l'endurcissement de sa récompense (+2 PV max, `REWARD_HP`) : **une relique qui ne fait rien vaut +3,5 à +4 points** (Thaldrin parti du Brasier avec le Paratonnerre : +3,9). Bandes : relique +5 à +15 (20 au plus), gravure +8 à +20. **Combat long** : tout le roster à 1,6 fois ses PV (le combat nu passe de 12,7 à 18,7 tours, soit d'environ 6 à 9 actions par combattant) : l'image d'un combat de fin de campagne ou du mode sans fin.

## 1. Les reliques dans la partie (R53, R55, R56)

### 1.1 Ce que voit le joueur aujourd'hui (R53)

Relevé : chaque personnage, chacune de ses deux auras, 300 parties simulées avec le calendrier de la campagne (`REWARDS`, 5 reliques), le choix automatique, l'offre réelle (`drawReward`).

| Mesure | Valeur |
| --- | --- |
| Reliques offrables au départ (`offerableRelics`) | 25 à 31 sur 37, selon le personnage |
| Cartes de relique vues dans une partie | 15 (5 offres de 3) |
| Reliques différentes dans une partie | **13,0** (2,0 cartes reviennent d'une offre à l'autre) |
| Reliques offertes à tous les personnages, dans 31 à 63 % des parties | **25** (les stats, coups, tours et seuils sans condition) |
| Reliques liées à un build (consommatrices, porte-bonheur) | 9 à 12, chacune dans 0 à 77 % des parties selon le personnage |
| Reliques communes entre deux parties de suite, même personnage | **5,4 sur 13** (42 %) |
| Reliques communes entre Thaldrin et Fanchon | **4,8 sur 13** |
| La plus fréquente | Coccinelle d'émail chez Naraxes (77 % des parties : l'écho de la première carte) |

**Lecture.** L'offre est variée au sens du hasard (chaque relique générale apparaît dans environ 40 % des parties), mais elle **ne dit rien du personnage** : deux personnages différents se voient offrir presque autant de reliques en commun que deux parties du même. Les reliques qui font un build sont peu nombreuses (une par ressource) et noyées parmi 25 générales. C'est le « souvent les mêmes ».

**Leviers, du moins cher au plus cher :**
1. **Pas de retour immédiat** : une relique refusée ne revient pas à l'offre suivante. Supprime les 2 cartes répétées par partie (13 → 15 reliques différentes), sans rien changer à la force. Même règle en campagne, saison et tournoi (la mémoire est celle du build : les offres passées, à enregistrer dans `BuildState`).
2. **Plus de reliques de build** (§ 5) : sept reliques proposées, qui ne s'offrent qu'à ceux qui ont la ressource (`relicNeeds`). Le pool d'un personnage s'enrichit de ce qui lui ressemble, pas de 7 générales de plus.
3. **L'écho sur deux cartes** au lieu d'une (`ECHO_WEIGHT`, aujourd'hui la première carte seule) : l'offre penche vers le build. Effet de bord : la Coccinelle passerait au-delà de 77 % chez Naraxes ; à n'essayer qu'avec le palier III (§ 1.3), qui l'empêche de sortir tôt.

À écarter : une mémoire d'une partie à l'autre (« ne pas reproposer ce qu'on a vu la dernière fois ») : le tournoi n'en a pas, la règle de parité du retour (R1) l'interdit.

### 1.2 Usage restreint : charges ou recharge (R56, R52)

Les reliques à 1 ou 2 déclenchements, aujourd'hui (v0.128 : `logs/relics/2026-10-28-16-54-38_v0.128.0.md`) : Cloche d'ouverture, Braise captive, Brassard à pointes (1er ou 4e tour, 1x) ; Dent de loup, Collier de ronces, Trophée du chasseur, Larme de givre (seuil, 1x depuis le 2026-10-21) ; Médaille de sursis (1x) ; Conque des vents, Géode fendue, Onguent du rebouteux (2x).

Mesures (séries 140 à 143, 146, 147, 149 ; moyenne des dix personnages, plus faible et plus fort) :

| Relique | Aujourd'hui court → long | Version à recharge | Court | Long | Proposition |
| --- | --- | --- | --- | --- | --- |
| **Braise captive** (3 × 2 au 4e tour, 1x) | +15,0 → **+10,6** | 2 braises de 2, +1 chacune par Brûlure, 4e tour puis tous les 4 | +13,8 (Gorak +10,6 à Brokk +17,1) | +14,8 (jusqu'à Thaldrin +21,4) | **oui** (R52, § 1.2.1) |
| | | Brûlure 2, 4e tour puis tous les 4 | +11,3 | +12,2 | variante « elle allume » |
| | | 2 × 2, 4e tour puis tous les 4 | +13,6 | +14,6 | variante sans lien au feu |
| | | 3 × 2 tous les 4 ; 2 × 2 tous les 3 | +18,0 ; +18,7 | +20,2 ; +19,2 | trop fortes |
| | | Brûlure 3 tous les 3 ; 3 × 2 et Brûlure 2 tous les 4 | +23,9 ; +24,3 | +28,2 ; +27,6 | hors bande |
| **Géode fendue** (+4 armure temporaire au coup reçu, 2x) | +17,8 → **+12,8** | **+3, recharge 4** | +14,8 | +13,8 | **oui** |
| | | +4, recharge 3 ; 4 ; 5 | +21,2 ; +18,1 ; +16,3 | +20,1 ; +17,0 ; +14,4 | trop fortes |
| **Onguent du rebouteux** (+3 PV au coup reçu, 2x) | +14,4 → **+10,3** | **+3 PV, recharge 4** | +14,6 | +13,4 | **oui** |
| | | +3 recharge 2 ; +3 recharge 3 ; +4 recharge 4 | +21,7 ; +17,0 ; +17,9 | +20,8 ; +16,0 ; — | trop fortes |
| **Conque des vents** (3 × 2 à l'esquive, 2x) | +10,5 → +9,4 | 3 × 2, recharge 3 | +10,0 | +9,4 | **oui, pour la cohérence** (les esquives sont rares : même valeur) |
| **Brassard à pointes** (Riposte au 1er tour, 1x) | +17,8 → **+12,2** | puis tous les 4 ; tous les 6 | +29,2 ; +21,1 | +28,8 ; +23,9 | **non** : une Riposte qui revient est une compétence ; garder « le premier qui frappe s'y pique » |
| **Cloche d'ouverture** (critique assuré au 1er tour, 1x) | +13,5 → **+9,5** | puis tous les 5 | +22,4 | +20,4 | **non** : la Clepsydre du siège est déjà la cloche qui revient |

**Gardées à 1x, par règle** : les quatre reliques de seuil (un seuil qui se réarme repart à chaque soin : Dent de loup chez Ysolde valait +23,7 avant le 2026-10-21 ; « qu'un vol de vie proc une fois, ok », dit l'utilisateur) et la Médaille de sursis (un sursis par combat). **Sans objet** : Cor d'avant-garde (une initiative par combat), Ampoule bénite, Chaîne du geôlier, Pointe de paratonnerre (une pose qui dure).

**Ce que montre la mesure**, au-delà des chiffres : la valeur d'une relique à charges baisse de 25 à 30 % quand le combat passe de 6 à 9 actions ; celle d'une relique à recharge est stable (± 1 point). Pour le mode sans fin, où les combats s'allongent encore, une recharge garde la relique utile. Les recharges proposées sont longues (4 tours) : un déclenchement tous les deux échanges, lisible, pas un ruissellement.

#### 1.2.1 La Braise captive refaite (R52)

« Ça ne donne pas envie… mettre un CD et/ou appliquer ou profiter de brûlure… utile sur la longueur. » Proposition : **« 2 braises de 2 PV au 4e tour, puis tous les 4 tours ; chaque braise fait +1 par Brûlure de l'adversaire »** (`trigger: { type: 'turn', turn: 4 }`, `cooldown: 4`, `damage` 2 × 2 `source: 'fire'` avec `fromStatus: { status: 'burn', who: 'opponent', factor: 1 }`, sans moteur nouveau : `fromStatus` s'applique à chaque impact).

- Elle **profite** de la Brûlure : contre un adversaire à Brûlure 3, chaque braise fait 5 ; chez Thaldrin (Feux follets, Brasier), +21,4 en combat long, une pièce de build du feu.
- Elle **dure** : quatre pluies de braises dans un combat de 16 actions au lieu d'une.
- Ailleurs elle vaut la version simple 2 × 2 (+13,6), dans la bande.
- Sa scène (`emberRain`) existe ; son texte se rédige depuis ses données (« 2 × 2 dégâts directs, +1 chacun par Brûlure de l'adversaire, au 4e tour puis tous les 4 tours » : à relire par l'agent des textes).
- Variante si l'utilisateur préfère qu'elle **allume** : « Brûlure 2 au 4e tour, puis tous les 4 tours » (+11,3 / +12,2), la seconde relique de source de Brûlure après le Briquet ; elle ouvrirait le Soufflet de forge et l'Embrasement à tous ceux qui la portent.

### 1.3 Les plus fortes et les plus synergiques plus tard (R55)

**Aujourd'hui** : l'offre ne connaît aucun ordre (`drawOffer` : trois reliques au hasard parmi les offrables, la première au poids de l'écho). Première apparition moyenne, sur 6 000 parties : 2,73 à 2,84 pour les reliques générales ; 3,08 à 3,50 pour les consommatrices (Chaîne du geôlier 3,08, Croc de boucher 3,40, Clous de pavois 3,50), seulement parce qu'elles attendent leur producteur.

**Proposition : trois paliers, lus sur le nombre de reliques déjà portées** (`b.relics.length`). Ce compte est le même partout où `drawReward` est appelé (campagne, champion de référence, adversaires construits, saison, arbre du tournoi) : la règle respecte d'elle-même la parité demandée en R1.

| Palier | Offert à partir de | Reliques (apport moyen contre le roster nu, v0.128) | Nombre |
| --- | --- | --- | --- |
| **I. Babioles** : une stat ou un petit moment, sans condition | la 1re relique | Contrepoids de plomb 6,8 ; Ampoule bénite 6,1 ; Collier de ronces 9,9 ; Bottes de feutre 10,7 ; Conque des vents 10,7 ; Dard de guêpe 10,9 ; Briquet d'amadou 10,9 ; Osselet fendu 11,0 ; Chandelle de veille 11,4 ; Gambison matelassé 11,7 ; Cotte du mercenaire 12,9 ; Trophée du chasseur 13,0 ; Fer à quatre clous 13,5 ; Cor d'avant-garde 13,6 ; Cloche d'ouverture 13,7 | 15 |
| **II. Fortes** : au-delà de +14 pour tous | la 3e relique | Dent de loup 14,2 ; Onguent du rebouteux 14,4 ; Clepsydre du siège 14,8 ; Braise captive 15,4 ; Larme de givre 15,4 ; Écu cabossé 16,1 ; Chapelet de l'ermite 16,6 ; Dé creux 16,8 ; Brassard à pointes 17,7 ; Géode fendue 18,0 ; Médaille de sursis 19,1 | 11 |
| **III. Maîtresses** : faibles seules, +13 à +22 chez leur hôte | la 4e relique, une carte de l'offre leur est réservée (la carte d'écho) | Fiole de venin (Ervald +21,9) ; Croc de boucher (Brokk +21,5) ; Plume d'aigle (Ervald +21,2) ; Pointe de paratonnerre (Thaldrin +17,8) ; Encens de l'abbaye (Fanchon +13,6) ; Chaîne du geôlier (Brokk +13,4) ; Coccinelle d'émail (Naraxes construit +20,8) ; Patte de lièvre ; Soufflet de forge ; Clous de pavois ; Gantelet du talion ; et les nouvelles du § 5 | 11 (+7) |

**Le coût, chiffré** : aux deux premières reliques, le pool tombe de 25-31 à environ 15 : chaque babiole y apparaît dans environ 40 % des parties au lieu de 22 % ; **c'est plus de répétition au début**, l'inverse de R53. Deux façons de l'éviter : (a) des poids au lieu de murs (palier II à demi-poids aux deux premières reliques, palier III à poids nul puis double aux deux dernières) ; (b) ajouter d'abord les reliques du § 5 et le « pas de retour immédiat » (§ 1.1). **Recommandation : (a) + (b)**, puis mesurer par `npm run campaign` (le champion de référence suit le même calendrier, donc la difficulté se recale seule : `tuneHp`).

Non mesuré : l'effet sur la courbe de campagne (il demande le registre). Les apports sont ceux du roster nu de la 0.128 ; ils ne disent pas la valeur d'une relique dans un build complet, sauf pour la Coccinelle (`npm run ramp`, 2026-10-28).

## 2. Les trous, par maîtrise (R54)

Une relique « de maîtrise » ne s'offre qu'à qui produit sa ressource (`relicNeeds`) : c'est elle qui donne à l'offre la couleur du build. Compte du registre (37 reliques, 71 briques) :

| Maîtrise | Briques | Reliques qui la servent en propre | Le trou | Proposition (§ 5) |
| --- | --- | --- | --- | --- |
| Fureur | 8 | aucune (les critiques assurés servent tout le monde) | le gros coup, le critique qui nourrit la suite | Corne de bélier |
| Sang | 9 | Croc de boucher | **aucune source de Saignement** (le Dard pose du Poison, le Briquet de la Brûlure) | Hameçon rouillé |
| Rempart | 8 | Géode, Écu, Chandelle, Clous, Gantelet, Brassard | aucun | — |
| Poison | 8 | Fiole de venin, Dard de guêpe | un amplificateur sur la durée | Mortier d'apothicaire |
| Chance | 12 | Coccinelle, Patte de lièvre, Dé creux, Bottes, Conque, Plume | aucun (le problème des jets en plus est celui de PropDes, R57) | — |
| Lumière | 9, **une seule porteuse** | Encens de l'abbaye | le soin qui frappe ; « le chemin tout tracé » d'Ysolde (R27) | Cierge de l'exorciste ; la compétence Grâce |
| Ombre | 8 | Chaîne du geôlier | le vol de vie, l'Effroi | Calice noir |
| Magie | 9, trois thèmes | Pointe de paratonnerre, Soufflet de forge, Briquet, Braise | le lien feu-foudre ; tout sort qui n'est pas un éclair ; une défense | Pierre de tonnerre, Focale ; Arc électrique, Boule de feu, Égide d'orage |

Côté compétences, la cible du § B6 de [MAITRISES.md](../MAITRISES.md) était 9 à 10 briques par maîtrise : Fureur, Rempart, Poison et Ombre sont à 8. Ce lot ne propose de compétences qu'en Magie et en Lumière (les deux maîtrises nommées par l'utilisateur) ; les autres restent ouvertes.

## 3. La maîtrise Magie (R60, R62)

### 3.1 Le constat

- **Trois thèmes dans une case** : la foudre (Ciel d'orage, Foudre, Éclair aveuglant), le feu (Brasier, Feux follets, Attiser, Embrasement) et le chant (Ballade, Duo). Le **Duo** n'est pas un sort : « un coup de plus », un coup brut, la mécanique de la Fureur et de la Chance.
- **Du magique hors de la Magie** : la Purification (lumière), la Flamme votive (Brûlure), la Rétribution et toute l'Ombre sont de nature arcane ; trois reliques font du feu ou du vent (Braise, Briquet, Conque). Le jeu sait déjà ce qui est un sort : `DAMAGE_SOURCES[source].magical` (`damage.ts` : foudre, feu, lumière, vent, Brûlure, Pourriture). **Aucune règle ne le lit** (décision du 2026-10-24 : « l'attaque, une valeur d'un type unique »).
- **Les auras de Magie sont des « 1 »** : Ciel d'orage (1 puis 2 éclairs par tour), Ballade (1 PV et une note par coup). L'utilisateur propose lui-même : « augmenter les dégâts magiques comme les éclairs de +1, ou donner un éclair en plus ». Mesure de la Focale (§ 5) : +1 à chaque impact de sort vaut **+15,4 chez Thaldrin** (exactement le Paratonnerre), +11,7 chez Fanchon (son refrain est magique), +5,7 chez Ysolde. Sur une aura de départ déjà dans la bande, c'est trop (Thaldrin 56,9 → 72,3) ; à la place de la montée du Ciel d'orage, ce serait à mesurer : **le choix des auras de Thaldrin et de Fanchon est confié à PropPersos**.
- **L'emblème** est le nuage d'orage de l'ancienne maîtrise Orage (`mastery-magic.png`, renommé en B1 « en attendant le sien ») : « ça fait penser à la foudre ». Repeint par Icones après le choix ci-dessous (R61).

### 3.2 Huit maîtrises fixes : un problème pour la flexibilité ? (R62)

Une maîtrise fait aujourd'hui **deux métiers** :
1. **une réserve d'offre** : ce que la forge peut proposer à un personnage (`characterPool` : ses deux maîtrises), avec « le producteur d'abord » ;
2. **une étiquette de thème** : l'emblème sur chaque brique, la phrase du compendium.

Le premier métier demande des cases fixes et peu nombreuses : l'offre doit rester lisible, chaque personnage doit pouvoir être mesuré (2 maîtrises sur 8 : 28 paires possibles), et une brique doit savoir à qui elle s'offre. Huit, c'est bien. C'est le second métier qui bride : un sort de feu doit « aller quelque part », et l'endroit dit son thème. La flexibilité vient d'un **second axe, transversal**, comme les tribus d'Hearthstone à côté des classes : une brique a **une maîtrise** (à qui elle s'offre) et des **mots-clés** (ce avec quoi elle combine).

### 3.3 Les options

| Option | Ce qui change | Pour | Contre | Coût |
| --- | --- | --- | --- | --- |
| **A. Renommer et rebrander** | « Magie » → **« Arcanes »** (ou « Sortilèges »), emblème neuf (un grimoire ouvert, ou une rune, pas un élément) ; le Duo renommé (§ 4) | règle le malentendu de l'icône ; aucune mesure ne bouge | ne règle pas le mélange des thèmes | nom, emblème, textes |
| **B. Le mot-clé « sort »** (recommandée, avec A) | Les sources magiques déjà déclarées deviennent lisibles par des règles : « ses sorts font +1 » (la Focale), « après un sort… » ; le coup blanc reste d'un type unique | du contenu magique dans **toutes** les maîtrises (Purification, Flamme votive, Vol de vie) sans rien déplacer ; la Focale, la Pierre de tonnerre, l'Arc électrique s'appuient dessus | **rouvre en partie la décision du 2026-10-24** (le type unique) : à confirmer par l'utilisateur ; les DoT (Brûlure) ne passent pas par `modifyDirect` (la Focale ne les touche pas : mesuré, Thaldrin parti du Brasier +3,9, le plancher) | petit : `DAMAGE_SOURCES.magical` existe, `modifyDirect` existe |
| **C. Deux maîtrises par brique** | Quelques briques hybrides dans deux réserves (Flamme votive Lumière + Magie, Éclair aveuglant Magie + Lumière, Duo Magie + Chance) | des ponts entre maîtrises, exactement ce que l'utilisateur aime (« des combos ») | casse « chaque compétence dans une seule maîtrise » (`validateMasteries`) ; l'emblème devient double ; offres à dédoublonner | moyen ; à garder pour 2 ou 3 briques, pas en règle générale |
| **D. Scinder la Magie en Orage et Feu** | 9 maîtrises ; le chant part (Ballade, Duo) | des thèmes nets | retour en arrière sur la fusion de 11 en 8 décidée le 2026-10-27 ; Thaldrin aurait Orage + Feu, Fanchon perdrait sa maîtrise ; tout le roster à remesurer | grand ; déconseillé |

**Recommandation : A + B maintenant, C gardée pour plus tard** (ne pas fermer la possibilité). Contenu magique proposé, mesuré au § 5 : trois actions (Arc électrique, Boule de feu, Égide d'orage), trois reliques (Focale, Pierre de tonnerre, la Braise refaite).

**Types de dégâts magiques.** Ils existent : foudre (cyan), feu et Brûlure (mauve aujourd'hui ; l'utilisateur demande le jaune pour la Brûlure, point de Lisibilite), lumière (ivoire cerclé d'or), vent (gris acier). Le mot-clé « sort » les regroupe sans créer de résistance ni de type d'attaque.

**Animations.** Scènes existantes à réutiliser : `lightning` (Foudre, Ciel à deux éclairs), `blindFlash`, `emberRain` (Braise), `gale` (Conque). À créer seulement si une brique est validée : un projectile pour la Boule de feu, un arc entre la marque de Brûlure et la cible pour l'Arc électrique, un crépitement sur l'Égide quand elle foudroie. Le son se déduit de l'effet ([SONS.md](../SONS.md)) : foudre et feu ont déjà le leur. Rien de vu ni d'entendu.

## 4. L'identité des sorts déplacés (R51)

Icônes vérifiées (`src/assets/icons/`) : le Duo montre deux dés et des notes, le Soliste une note, le Crescendo trois notes, Siffloter une flûte et des notes, la Fausse note un diapason brisé, la Ballade un parchemin et des notes. **Principe repris de M9** : on change le nom et l'icône, **jamais l'id** (l'héritage, les forges enregistrées et l'historique gardent leurs gravures).

| Brique (id) | Maîtrise | Ce qu'elle fait | Le décalage | Nom proposé | Icône à peindre (Icones, après feu vert) |
| --- | --- | --- | --- | --- | --- |
| Duo (`duo`) | Magie | un coup de plus | « Duo » et les notes disent Fanchon ; et ce n'est pas un sort | **Écho** (l'écho magique du coup) ; variante : le déplacer en Chance sous le nom **Doublé** (mécaniquement, c'est la Chance : « des jets et des coups de plus ») | une lame et son double spectral |
| Soliste (`soloist`) | Fureur | ce coup ×3, 1x | un gros coup martial au nom de musicien | **Coup de maître** | un coup unique, éclat d'or |
| Crescendo (`crescendo`) | Fureur | ce coup ×2, puis ×1 de plus à chaque fois qu'il touche | idem | **Acharnement** | trois impacts qui grandissent |
| Siffloter (`whistle`) | Lumière | +3 PV à la fin de ses 2 prochains tours | une flûte de barde chez la paladine | **Répit** | (R65 : l'utilisateur suggère l'icône décrite pour le Vol de vie ; à trancher par Icones) |
| Fausse note (`false-note`) | Ombre | −4 aux 2 prochains coups de l'adversaire qui touchent | un diapason dans l'Ombre | **Main tremblante** | une main gantée qui tremble, une lame qui glisse |
| Emblème `mastery-magic` | Magie | — | le nuage d'orage de l'Orage | selon § 3.3 (A) | un grimoire ou une rune (R61, Icones) |

**Gardées** : la Ballade (l'aura de Fanchon, son identité de barde : une aura ne s'acquiert pas par la forge, A2, elle ne se retrouve chez personne d'autre) ; Ivresse du sang, Œil de faucon, Feux follets (leur nom tient dans leur nouvelle maîtrise ; le « druide qui fait du feu » est une question de personnage, PropPersos).

## 5. Les propositions (R54, R60) : 7 reliques, 4 compétences, mesurées

Chaque relique : apport contre le roster nu, chez ses hôtes (ceux que `relicNeeds` laisserait la recevoir), séries 144, 148, 149 ; chaque compétence : gravée sur le 3 nu (bande +8 à +20), série 145. Aucune n'est livrée.

| # | Brique | Règle | Comble | Mesure | Avis |
| --- | --- | --- | --- | --- | --- |
| 1 | **Braise captive** (refaite) | 2 × 2 PV au 4e tour puis tous les 4, +1 par impact et par Brûlure | R52, la durée, le feu | +13,8 court, +14,8 long (§ 1.2) | proposée |
| 2 | **Hameçon rouillé** (relique) | 2 Saignement à l'adversaire sur un 6 | Sang : la source qui manque ; ouvre le Croc, la Curée, l'Odeur du sang, la Sangsue | +10,4 en moyenne (Elaria +8,6 à Brokk +15,1) ; à 3 Saignement, +15,1 (Brokk +19,8) | proposée à 2 ; **demande d'étendre l'exception de la règle 7** (Poison, Brûlure → et Saignement) |
| 3 | **Mortier d'apothicaire** (relique) | au 5e tour puis tous les 5, si l'adversaire est empoisonné : son Poison double, +2 | Poison : un amplificateur, la Virulence en objet | Ervald +19,0, Naraxes +11,5, Thaldrin +3,8 (plancher) ; tous les 3 tours : Ervald +25,6 (hors bande) | palier III |
| 4 | **Corne de bélier** (relique) | +5 Ferveur lors d'un coup critique | Fureur : le critique nourrit le gros coup suivant | +10,4 en moyenne, +11,1 sans Morgrut (Gorak +9,3, Elaria +14,9, Ervald +18,0 ; Morgrut +3,9, le plancher : il ne critique pas, elle ne lui serait pas offerte) | proposée |
| 5 | **Calice noir** (relique) | +1 Vol de vie lors d'un coup critique, recharge 4 | Ombre : le vol de vie ; une seconde relique d'Ombre | +8,9 en moyenne (Ervald +14,7, Elaria +10,4) | proposée ; son texte (« +1 Vol de vie ») est à rédiger comme un effet (« son prochain coup draine »), point de Textes |
| 6 | **Cierge de l'exorciste** (relique) | 3 dégâts sacrés à l'adversaire à chaque soin reçu, recharge 3 | Lumière : le soin qui frappe (R27, Ysolde) | Ysolde +16,9, Fanchon +15,1, Ervald +8,1 ; recharge 2 : Ysolde +22,3 (hors bande) | palier III |
| 7 | **Pierre de tonnerre** (relique) | 2 éclairs de 2 au début de ses tours si l'adversaire brûle, recharge 3 | Magie : le feu appelle la foudre (les deux auras de Thaldrin) | Thaldrin parti du Brasier +17,7 ; parti du Ciel d'orage (recharge 2) +6,8 | palier III |
| 8 | **Focale** (relique, option B du § 3.3) | chaque impact de ses sorts (foudre, feu, lumière, vent) fait +1 | Magie transverse ; l'idée de l'utilisateur (« +1 aux dégâts magiques ») en objet | Thaldrin +15,4 (= Paratonnerre), Fanchon +11,7 (Paratonnerre +3,2), Ysolde +5,7 ; à +2 : Thaldrin +22,9 (hors bande) | si B est retenue ; le Paratonnerre reste tel quel (R50) |
| 9 | **Arc électrique** (Magie) | l'adversaire perd 3 PV, +1 par charge de Brûlure | le lien feu-foudre | gravée : Thaldrin +8,2, Ysolde +8,3, Fanchon +7,9 ; Thaldrin parti du Brasier +10,8 ; à +2 par Brûlure : +12,7 | proposée à +2 par Brûlure (au bord bas à +1) |
| 10 | **Boule de feu** (Magie) | l'adversaire perd 4 PV et brûle (Brûlure 2) | un sort franc, de feu, avec sa scène | gravée : Thaldrin +14,7, Ysolde +18,3, Fanchon +15,6, Thaldrin (Brasier) +15,4 ; à 5 PV : jusqu'à +20,2 | proposée à 4 PV |
| 11 | **Égide d'orage** (Magie) | ses 2 prochains coups reçus foudroient l'attaquant : 2 éclairs de 2 chacun | la Magie n'a aucune défense | gravée : Thaldrin +13,0, Ysolde +16,9, Fanchon +12,9, Thaldrin (Brasier) +13,8 | proposée |
| 12 | **Grâce** (Lumière) | ses 3 prochains soins lui donnent chacun +4 Ferveur | Lumière : le soin qui fait frapper ; une autre route pour Ysolde (R27) | gravée chez Ysolde (Aura de sainteté) +17,8 ; partie du Jugement, sans soin : 0 (ne lui serait pas offerte) | proposée, ou à 3 Ferveur si on la veut au milieu de la bande |

**Écartée** : le **Gant de tire-laine** (Ombre, vole un bonus) : à l'esquive, +4,6 en moyenne, le plancher (rien ne se passe) ; au coup reçu (recharge 3), +8,3 en moyenne mais **tous les duels contre Aldric passent de 50 % à 77-88 %** (sa Vindicte et sa Riposte volées) : duel extrême.

**Ce qu'il faudrait pour les coder** (après feu vert) : aucune mécanique nouvelle pour 1, 3 à 7, 9 à 12 (déclencheurs, `fromStatus`, statuts à charges et `modifyDirect` existent) ; 2 demande d'ajouter le Saignement à `SOURCE_AFFLICTIONS` ; 8 demande l'option B. Chaque relique : icône (planche de reliques, Icones), `relicNeeds` (Saignement, Poison, critique, soin, Brûlure), mesure `npm run relics`, et son palier si le § 1.3 est retenu.

## 6. Ce qui n'est pas vérifié

- Toutes les mesures sont **contre le roster nu** : la valeur d'une relique dans un build complet, la courbe de campagne et l'effet des paliers ne sont pas mesurés (ils demandent le registre : `npm run ramp`, `npm run campaign`).
- Le **combat long** est une image (PV ×1,6 pour tous), pas un combat de fin de campagne réel. Il montre au passage que le Poison grandit avec la durée : Ervald 48,6 → 68,2 %, Naraxes 52,7 → 66,4 %, Morgrut 47,3 → 37,1 % dans ce monde (série 149) ; à garder en tête pour le mode sans fin.
- Le Mortier « sans +2 » (séries 148) ne part jamais : une pose à `stacks: 0` est nulle ; la mesure est celle du plancher, écartée.
- Rien n'a été vu à l'écran ni entendu : scènes, icônes et textes des propositions restent à faire.

## 7. Les fichiers

- `scripts/lab/contenu-30.ts` : séries 140 à 149 (reliques et statuts d'essai, mondes « long » et « Thaldrin parti du Brasier »). Rapports : `logs/lab/2026-10-30-10-50-08` (145), `…10-51-08` (144), `…10-51-55` (140), `…10-53-09` (141), `…10-55-00` (142), `…10-57-47` (143), `…10-59-36` (148), `…11-00-49` (146), `…11-02-34` (147), `…11-04-06` (149), `…11-04-18` (Grâce).
- Le laboratoire ne se chargeait plus (des idées anciennes sur des compétences et un statut sortis à la refonte des auras) : `ideas.ts` écarte désormais d'`IDEAS` les idées dont une compétence a quitté le registre (`RETIRED`), `aura-vision.ts` perd quatre idées sur le Rempart hérissé et la Surtension, `content-a.ts` prend le halo de l'Aura de puissance (le Pas de côté est sorti).
