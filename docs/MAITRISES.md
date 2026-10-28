# Les Maîtrises

_Conception (vague 1) demandée par l'utilisateur le 2026-10-27 ([retour du 27 octobre](../prompts/Retour%20du%2027%20octobre.md), points V1 à V5, P1 à P11, M9 et R5). Les mesures de conception sont celles des séries 70 à 75 du laboratoire (`scripts/lab/ideas.ts`), sur la branche `regles-v2` en 0.120.0 (§ 15). **Vague 2 : les tranches A (registre), B (briques) et C (dés de départ) sont codées** ; leurs mesures au registre remplacent les estimations (§ 4 bis, § 5.2, § 14)._

**Principe de l'utilisateur, « synergies d'abord »** (troisième retour du 2026-10-27) : « Le dernier build était vraiment réussi : la sensation de progression, celle de choix même avec un contenu réduit, des synergies maîtrise / compétence / relique sympa. C'était la bonne piste : poursuis-la, et donne toujours de l'effort à la création de synergies, ressource produite, puis consommation, collaboration entre maîtrises. » Toute maîtrise, réserve ou brique se juge d'abord à ce qu'elle produit et consomme, et aux liens qu'elle ouvre avec les autres maîtrises.

## Huit maîtrises (second retour du 2026-10-27, B1 à B6)

_Ce qui suit fait foi ; les § 0 à 17 décrivent la conception et la vague 2 à onze maîtrises (l'historique, les mesures d'avant). Aucune compétence nouvelle dans ce lot (principe de l'utilisateur) : on déplace l'existant, on mesure, on fait l'état des lieux._

### B1. Onze → huit maîtrises

Disparaissent la **Chasse**, les **Représailles** et le **Chant** ; l'**Orage devient la Magie** (id de code `storm` → `magic`, emblème `mastery-storm` renommé `mastery-magic` en attendant le sien ; `mastery-hunt`, `mastery-retaliation`, `mastery-song` mis à la corbeille). Chaque brique garde son id, son nom, son icône, son texte et sa mécanique : aucune identité n'était incompatible avec sa nouvelle maîtrise. Seuls changent la question et la phrase de quatre maîtrises (`masteries.ts`).

| Brique | Avant | Après | Pourquoi |
| --- | --- | --- | --- |
| Feinte, Pas de côté, Œil de faucon, Esquive améliorée | Chasse | **Chance** | critiques et esquives sont des tirages : « le hasard joue pour lui » (la suggestion de l'utilisateur) ; même nature (adresse) |
| Aura de précision | Chasse | **Fureur** | « frappe-t-il plus fort ? » : le critique est un gros coup ; la Chance avait déjà dix briques |
| Vindicte, Rancœur, Riposte, Rétribution, Dette de sang | Représailles | **Rempart** | la question du Rempart le disait déjà : « Encaisse-t-il, **puis le rend-il** ? ». L'utilisateur suggérait la Fureur ; elle aurait eu quatorze briques et mêlé deux boucles sans lien (frapper, encaisser). Dette de sang reste avec les renvois qu'elle consomme (§ 2, règle 2) |
| Ballade, Duo | Chant | **Magie** | les sorts du barde (nature arcane) |
| Soliste, Crescendo | Chant | **Fureur** | des gros coups martiaux (« ce coup ×3 », « ×2 qui monte ») |
| Siffloter | Chant | **Lumière** | un soin |
| Fausse note | Chant | **Ombre** | un malus (ses coups font moins) |
| Ivresse du sang | Fureur | **Sang** | son nom ; la Fureur passait à dix briques |
| Aura d'immunité | Rempart | **Lumière** | se garder des malus, l'esprit de la Purification ; le Rempart passait à dix |
| Malchance | Chance | **Ombre** | le mauvais œil, une malédiction (« l'adversaire est-il maudit ? ») |

Les nouvelles phrases : **Fureur** « Des rafales, des critiques et de gros coups » ; **Rempart** « … qu'il rend ensuite : ripostes et représailles » ; **Chance** « Le hasard joue-t-il pour lui ? — Des pièces, des jets de plus, des critiques et des esquives » ; **Lumière** « Il se soigne et se garde des malus… » ; **Ombre** « … ses coups, ses bonus et sa chance » ; **Magie** « Ses sorts tombent-ils ? — Des sorts : la foudre et le feu frappent sans coup, ses chants portent ses coups. » Le registre exige désormais six briques et deux auras par maîtrise (`validateMasteries`), sans exception.

### B2. Deux des huit par personnage

| Personnage | Maîtrises (avant → après) | Dé vanilla (1 / 2) | La signature est dans |
| --- | --- | --- | --- |
| Gorak | Fureur, Sang | Ivresse du sang / Furie des vents | Fureur |
| Elaria | Chasse, Sang → **Chance, Sang** | Feinte / Œil de faucon | Chance |
| Brokk | Rempart, Sang | Aura d'épines / Peau de pierre | Rempart |
| Ervald | Poison, Ombre | Aura glaciale / Vol de vie | Ombre |
| Ysolde | Lumière, Orage → **Lumière, Magie** | Aura de sainteté / Purification | Lumière |
| Naraxes | Chance, Poison | Aura de décoction / Pile ou face | Chance |
| Aldric | Représailles, Ombre → **Rempart, Ombre** | Vindicte / Rétribution | Rempart |
| Morgrut | Fureur, Rempart | Aura de puissance / **Crescendo** (troisième retour du 2026-10-27, C5 ; nue avant) | Fureur |
| Thaldrin | Orage, Poison → **Magie, Poison** | Ciel d'orage / Feux follets | Magie |
| Fanchon | Chant, Chance → **Magie, Chance** | Ballade / Duo | Magie |

Aucun dé vanilla ne change : les signatures et les auras du 1 restent ; le balance ne bouge que par les chantiers parallèles. Porteurs : Fureur 2, Sang 3, Rempart 3, Poison 3, Chance 3, Lumière **1**, Ombre 2, Magie 3. Réserves qui changent : Brokk et Morgrut perdent l'Aura d'immunité et gagnent les Représailles ; Gorak gagne Aura de précision, Soliste, Crescendo ; Naraxes perd la Malchance et gagne la Chasse ; Fanchon perd Soliste, Crescendo, Siffloter, Fausse note et gagne l'Orage ; Ysolde, Thaldrin gagnent Ballade et Duo.

**Migrations** : aucun id de maîtrise n'est enregistré ; une partie v5 dont l'aura n'est plus une aura de départ repart de l'aura par défaut (Brokk parti de l'Aura d'immunité : Aura d'épines ; test `modules.test.ts`), le choix d'aura mémorisé retombe de même sur la première (CampaignScreen). Une gravure faite avant la fusion, hors des nouvelles réserves (le Soliste de Fanchon), reste sur son dé : la forge ne vérifie pas la réserve, seule l'offre la lit.

### B3, B4. Compendium

- **B3** : plus de porteurs dans l'onglet Maîtrises (ni portraits sur les tuiles, ni « La jouent » dans le panneau, ni recherche par nom de porteur). Les maîtrises restent sur la fiche du personnage et sur l'écran d'affrontement.
- **B4** : l'onglet **Auras** est supprimé. L'onglet Compétences liste **toutes** les briques, auras comprises (64, par ordre alphabétique, chacune avec l'emblème de sa maîtrise) : chaque lien vers une compétence ou une aura (`skillLink`) mène à sa fiche. La règle courte des auras (« Une aura dure jusqu'à la fin du combat… l'une des auras de ses deux maîtrises ; les autres s'obtiennent en gravant », lien vers la règle « Auras ») passe en tête de l'encadré Auras de chaque maîtrise. Depuis le retour du 2026-10-28 (A2) : « …l'une des auras de ses deux maîtrises, choisie au départ. La forge n'en ajoute jamais. »

### B5. Les auras de départ : toutes celles de ses deux maîtrises

**Règle** (remplacée en 0.129.0 par la refonte des auras, § 18 : deux auras nommées, `CharacterDef.auras`, vérifiées par `auraServed`) : de la 0.122.0 à la 0.128.0, les auras de départ d'un personnage étaient dérivées (`startAurasFor`, retiré) : **les auras de ses deux maîtrises dont le besoin est servi par son dé de départ** (sans le 1, où elle se pose) : « le producteur d'abord », la règle de l'offre, par la même fonction (`reachOf`, `skillNeeds`, `hooks.ts`). La première était celle du 1 de son dé vanilla. Le « servi par son dé de départ » reste la règle de `auraServed`.

Première mesure, sans le producteur d'abord (toutes les auras, 68 départs) : 17 hors bande, dont 9 consommatrices sans producteur au taux d'un 1 nu (Dé pipé chez Elaria 29,2 et Fanchon 36,1 ; Vindicte et Dette de sang chez Brokk 34,8 et Morgrut 25,6 ; Rempart hérissé chez Morgrut 25,6 ; Sentence et Bouclier de foi chez Ysolde 36,1). La règle retire 13 départs : ces neuf, plus Sève noire chez Naraxes (38,3) et Thaldrin (49,1), Rempart hérissé chez Aldric (47,0), Aura de précision chez Morgrut (36,9 : sans critique, elle n'a rien à amplifier).

Mesure avec la règle (2026-10-27, moteur du jour avec les chantiers parallèles en cours ; 400 combats par duel, mêmes graines que `npm run balance` : la ligne « défaut » est le taux du balance ; marge ± 1,6 point) :

| Personnage | Aura de départ | Taux % | Pire duel | Meilleur duel | Bande 42-58 |
| --- | --- | --- | --- | --- | --- |
| Gorak | Ivresse du sang (défaut) | 49,4 | Thaldrin 42,5 | Ervald 58,5 |  |
| Gorak | Aura de puissance | 55,3 | Thaldrin 50,2 | Ervald 61,0 |  |
| Gorak | Aura sauvage | 49,5 | Thaldrin 43,5 | Ervald 56,0 |  |
| Gorak | Aura de précision | 50,5 | Thaldrin 44,3 | Ervald 57,3 |  |
| Gorak | Aura d'épines | 47,5 | Thaldrin 37,3 | Fanchon 53,5 |  |
| Gorak | Plaie ouverte | 47,1 | Thaldrin 37,8 | Ervald 52,0 |  |
| Elaria | Feinte (défaut) | 45,2 | Aldric 39,3 | Gorak 50,7 |  |
| Elaria | Veine | 38,7 | Thaldrin 33,8 | Naraxes 42,5 | hors bande |
| Elaria | Pas de côté | 39,0 | Thaldrin 33,3 | Naraxes 44,3 | hors bande |
| Elaria | Ivresse du sang | 54,4 | Thaldrin 50,7 | Ervald 60,8 |  |
| Elaria | Aura d'épines | 43,0 | Thaldrin 34,8 | Gorak 49,5 |  |
| Elaria | Plaie ouverte | 43,3 | Thaldrin 37,0 | Gorak 46,5 |  |
| Brokk | Aura d'épines (défaut) | 51,8 | Morgrut 47,0 | Elaria 58,5 |  |
| Brokk | Aura d'intimidation | 49,7 | Fanchon 42,3 | Elaria 60,5 |  |
| Brokk | Rempart hérissé | 49,5 | Aldric 41,8 | Elaria 58,0 |  |
| Brokk | Rancœur | 48,3 | Thaldrin 43,0 | Elaria 55,3 |  |
| Brokk | Ivresse du sang | 47,9 | Fanchon 41,8 | Ysolde 54,3 |  |
| Brokk | Plaie ouverte | 49,1 | Fanchon 43,0 | Ysolde 58,0 |  |
| Ervald | Aura glaciale (défaut) | 47,4 | Gorak 41,5 | Ysolde 54,8 |  |
| Ervald | Aura de décoction | 49,2 | Gorak 43,5 | Ysolde 57,8 |  |
| Ervald | Sève noire | 45,1 | Fanchon 41,0 | Ysolde 51,2 |  |
| Ervald | Effroi | 51,6 | Fanchon 46,3 | Morgrut 58,8 |  |
| Ervald | Aura de pourriture | 51,0 | Gorak 45,0 | Elaria 56,0 |  |
| Ysolde | Aura de sainteté (défaut) | 48,3 | Aldric 42,0 | Elaria 59,0 |  |
| Ysolde | Aura d'immunité | 48,6 | Aldric 39,8 | Fanchon 57,3 |  |
| Ysolde | Ciel d'orage | 47,0 | Thaldrin 40,3 | Fanchon 57,3 |  |
| Ysolde | Champ d'orage | 46,8 | Thaldrin 39,3 | Fanchon 59,3 |  |
| Ysolde | Ballade | 47,8 | Aldric 41,8 | Fanchon 56,5 |  |
| Naraxes | Aura de décoction (défaut) | 49,8 | Aldric 43,8 | Gorak 55,3 |  |
| Naraxes | Dé pipé | 41,2 | Brokk 31,8 | Fanchon 48,5 | hors bande |
| Naraxes | Feinte | 51,5 | Aldric 44,5 | Gorak 58,5 |  |
| Naraxes | Veine | 45,9 | Brokk 40,8 | Gorak 53,3 |  |
| Naraxes | Pas de côté | 46,1 | Brokk 38,8 | Gorak 53,0 |  |
| Naraxes | Aura glaciale | 47,2 | Thaldrin 40,5 | Gorak 52,8 |  |
| Aldric | Vindicte (défaut) | 54,7 | Gorak 47,3 | Elaria 60,8 |  |
| Aldric | Aura d'intimidation | 57,6 | Fanchon 52,5 | Elaria 66,0 |  |
| Aldric | Rancœur | 56,3 | Gorak 51,2 | Elaria 61,3 |  |
| Aldric | Dette de sang | 53,9 | Gorak 46,3 | Elaria 59,3 |  |
| Aldric | Effroi | 56,0 | Gorak 52,3 | Morgrut 61,8 |  |
| Aldric | Aura de pourriture | 54,3 | Gorak 48,5 | Elaria 59,3 |  |
| Morgrut | Aura de puissance (défaut) | 48,9 | Aldric 40,3 | Brokk 53,0 |  |
| Morgrut | Aura sauvage | 40,5 | Thaldrin 33,8 | Gorak 44,5 | hors bande |
| Morgrut | Aura d'intimidation | 40,6 | Thaldrin 32,0 | Gorak 46,8 | hors bande |
| Morgrut | Rancœur | 39,0 | Thaldrin 29,8 | Gorak 44,5 | hors bande |
| Thaldrin | Ciel d'orage (défaut) | 54,6 | Aldric 48,0 | Elaria 59,0 |  |
| Thaldrin | Champ d'orage | 54,7 | Aldric 47,5 | Elaria 58,8 |  |
| Thaldrin | Ballade | 54,4 | Aldric 47,3 | Elaria 58,0 |  |
| Thaldrin | Aura de décoction | 54,5 | Aldric 47,8 | Elaria 58,5 |  |
| Thaldrin | Aura glaciale | 53,7 | Aldric 46,0 | Elaria 58,8 |  |
| Fanchon | Ballade (défaut) | 50,0 | Ysolde 42,8 | Ervald 56,5 |  |
| Fanchon | Ciel d'orage | 43,3 | Thaldrin 37,8 | Elaria 47,8 |  |
| Fanchon | Champ d'orage | 42,5 | Thaldrin 37,0 | Gorak 45,8 |  |
| Fanchon | Feinte | 44,4 | Ysolde 35,8 | Ervald 50,0 |  |
| Fanchon | Veine | 43,8 | Thaldrin 37,0 | Elaria 48,8 |  |
| Fanchon | Pas de côté | 42,2 | Ysolde 35,5 | Gorak 47,0 |  |

**Lecture.** **55 départs, 6 sous 42 %**, aucun au-dessus ; un pire duel dépasse 65/35 (Aldric à l'Aura d'intimidation contre Elaria, 66,0 %).
- **Morgrut** (4 départs) : Aura sauvage 40,5, Aura d'intimidation 40,6, Rancœur 39,0 ; seule la Puissance le tient (48,9). Son dé n'a que son aura (face 2 nue) : sa face 2 ou les valeurs de ces auras, pour tous, sont les leviers.
- **Elaria** : Veine 38,7 et Pas de côté 39,0 (elle perd la Feinte, sa boucle esquive → critique) ; Ivresse du sang 54,4, au-dessus de son défaut 45,2.
- **Naraxes** : Dé pipé 41,2 (vivant : sa Pile ou face le nourrit ; proposition d'AuraDesign : +5 % de critique et d'esquive par charge, 49,1).
- **Bord bas** : Fanchon Pas de côté 42,2, Champ d'orage 42,5. **Haut** : Aldric Aura d'intimidation 57,6 (pire duel 66,0), Rancœur 56,3, Effroi 56,0 ; Gorak Aura de puissance 55,3.

#### Les départs après le Tuning (troisième retour du 2026-10-27, C5)

Mesure avec tout le lot posé (C1 à C4, puis C5 : Crescendo sur le 2 de Morgrut et son attaque 5 à 7, plafond d'esquive à 75 %, Pas de côté à 12 %, Elaria 24 % d'esquive, Ervald 28 % de critique) ; 400 combats par duel contre le roster nu, mêmes graines que `npm run balance` (script jetable, supprimé). « Avant » : le même arbre sans C5. La règle des départs (le producteur d'abord) ne change pas la liste de Morgrut : le Crescendo ne produit rien qu'une aura de ses maîtrises attende, ses quatre départs restent.

| Personnage | Aura de départ | Avant | Après | Pire duel | Meilleur duel |
| --- | --- | --- | --- | --- | --- |
| Gorak | Ivresse du sang (défaut) | 49,9 | 49,1 | Naraxes 44,3 | Ervald 56,8 |
| Gorak | Aura de puissance | **60,3** | **59,2** | Aldric 55,5 | Ervald 66,0 |
| Gorak | Aura sauvage ; de précision ; d'épines ; Plaie ouverte | 50,1 ; 52,5 ; 48,9 ; 47,7 | 49,1 ; 51,5 ; 48,1 ; 46,6 | | |
| Elaria | Feinte (défaut) | 44,9 | 47,9 | Ysolde 38,5 | Gorak 55,3 |
| Elaria | Veine | **37,0** | **39,4** | Brokk 32,8 | Fanchon 45,0 |
| Elaria | Pas de côté | **34,0** | 45,2 | Ysolde 32,5 | Gorak 56,0 |
| Elaria | Ivresse du sang | **62,0** | **63,7** | Brokk 60,0 | Morgrut 70,8 |
| Elaria | Aura d'épines ; Plaie ouverte | 43,7 ; 44,1 | 45,8 ; 47,1 | | |
| Brokk | Épines (défaut) ; Intimidation ; Rempart hérissé ; Rancœur ; Ivresse ; Plaie ouverte | 53,1 ; 44,4 ; 55,1 ; 44,0 ; 45,9 ; 47,3 | 52,6 ; 43,8 ; 54,7 (Elaria 67,0) ; 43,9 ; 45,2 ; 46,7 | | |
| Ervald | Glaciale (défaut) ; Décoction ; Sève noire ; Effroi ; Pourriture | 44,9 ; 48,5 ; 44,6 ; 50,9 ; 52,3 | 46,2 ; 49,2 ; 45,7 ; 55,8 ; 56,1 | | |
| Ysolde | Sainteté (défaut) ; Immunité ; Ciel d'orage ; Champ d'orage ; Ballade | 51,0 ; 46,5 ; 48,7 ; 49,3 ; 50,8 | 49,6 ; 45,4 ; 47,8 ; 48,4 ; 49,3 | | |
| Naraxes | Décoction (défaut) ; Dé pipé ; Feinte ; Veine ; Glaciale | 50,6 ; 48,4 ; 52,8 ; 45,0 ; 45,5 | 49,6 ; 47,4 ; 52,2 ; 44,1 ; 44,7 | | |
| Naraxes | Pas de côté | 42,9 | 49,9 | Brokk 38,0 | Gorak 61,0 |
| Aldric | Vindicte (défaut) ; Intimidation ; Rancœur ; Dette de sang ; Effroi ; Pourriture | 52,2 ; 53,4 ; 53,3 ; 51,0 ; 57,1 ; 55,6 | 51,4 ; 52,3 ; 52,6 ; 50,2 ; 56,1 ; 54,5 | | |
| Morgrut | Aura de puissance (défaut) | 51,8 | 54,8 | Aldric 47,3 | Ervald 64,5 |
| Morgrut | Aura sauvage | **39,3** | 46,3 | Elaria 40,0 | Ervald 55,0 |
| Morgrut | Aura d'intimidation | **37,3** | 43,1 | Thaldrin 38,0 | Gorak 47,0 |
| Morgrut | Rancœur | **37,1** | **41,9** | Thaldrin 36,3 | Fanchon 47,8 |
| Thaldrin | Ciel d'orage (défaut) ; Champ d'orage ; Ballade ; Décoction ; Glaciale | 52,9 ; 53,9 ; 50,4 ; 53,7 ; 51,1 | 51,4 ; 52,4 ; 49,1 ; 52,4 ; 49,7 | | |
| Fanchon | Ballade (défaut) | 48,7 | 47,4 | Ysolde 40,5 | Ervald 56,3 |
| Fanchon | Ciel d'orage ; Champ d'orage ; Feinte ; Veine | **39,8 ; 39,4 ; 41,1 ; 41,9** | **38,7 ; 38,4 ; 40,3 ; 41,0** | Ysolde 33,5 à 34,8 | Ervald, Gorak 44 à 50 |
| Fanchon | Pas de côté | **39,2** | 44,4 | Ysolde 35,8 | Gorak 53,0 |

**Lecture.** 55 départs ; hors bande : **12 → 8** (sous 42 : 10 → 6 ; au-dessus de 58 : 2 → 2).
- **Relevés** : les trois départs de Morgrut (sa face 2), le Pas de côté (Elaria 34,0 → 45,2, Naraxes 42,9 → 49,9, Fanchon 39,2 → 44,4 : sa valeur, 8 → 12 %, sous le plafond d'esquive), la Feinte et les autres départs d'Elaria (son esquive, 22 → 24 %), ceux d'Ervald (son critique, 24 → 28 %).
- **Restent sous 42** : Morgrut Rancœur 41,9 (dans la marge de ± 1,6) ; Elaria Veine 39,4 ; Fanchon Ciel d'orage 38,7, Champ d'orage 38,4, Feinte 40,3, Veine 41,0. **Aucun levier simple** pour Fanchon : sa Ballade porte ses coups (chaque coup la soigne, et le Duo multiplie les coups), les autres auras la laissent à 38-41 % ; ses stats relèvent ces départs (esquive 10 → 14 % : 42,6 à 45,7) mais montent aussi sa force construite, déjà la plus haute (63,4 → 66,1 %), et l'attaque n'y fait rien (4 à 5 : 63,6 construite, ses départs à 35-39). La Veine (Elaria 39,4, Naraxes 44,1, Fanchon 41,0) : relever sa valeur (un jet par 6 et par charge) toucherait la boucle des jets de plus que borne `MAX_EXTRA_JETS` ; à proposer à l'utilisateur, pas à régler ici.
- **Au-dessus de 58** : Elaria **Ivresse du sang 63,7** (pire duel 70,8 contre Morgrut) : l'Ivresse vit des critiques, et Œil de faucon lui en assure un sur chaque 2 ; Gorak **Aura de puissance 59,2** (66,0 contre Ervald), déjà 60,3 avant. Les deux sont des auras de défaut ailleurs (Gorak, Morgrut) : les régler toucherait leurs dés vanilla. L'Aura de puissance à +1, +2, +3 (au lieu de +2, +3, +4) ramenait Gorak à 47,1 %, mais elle devenait l'égale de l'Aura sauvage (+1 à l'attaque par charge, avant le critique, sans plafond), un doublon que l'utilisateur a refusé en 0.107.0 ; à +2 sans cumul, ses nouvelles poses ne font rien (A4). Non livré : à décider avec l'utilisateur.

### B6. État des compétences par maîtrise

_Après la fusion en huit maîtrises (B1). Aucune compétence nouvelle : un état des lieux, pour que l'utilisateur propose le contenu qui manque. Gravée : points de victoire gagnés quand la brique est gravée sur le 3 nu (bande 8 à 20) ; « moy. » = moyenne des dix hôtes du roster (rapports `logs/skills/` du 2026-10-25 et du 2026-10-27), sinon la mesure connue chez un hôte, avec sa source dans `skills.ts`. Porteurs : ceux qui jouent la maîtrise ; « dé » : la brique est sur leur dé de départ. **Historique** : depuis la refonte des auras (2026-10-28), le compte qui fait foi est au § 18, « État des lieux après la refonte »._

#### Fureur — Gorak, Morgrut (2 porteurs) · 4 auras, 6 compétences

| Brique | Genre | Effet | Produit | Consomme | Gravée connue | Sur un dé |
| --- | --- | --- | --- | --- | --- | --- |
| Aura de puissance | aura | +2 dégâts à chacun de ses coups | dégâts par coup | — | moy. +17,9 | Morgrut (1) |
| Aura sauvage | aura | +1 à l'attaque | dégâts par coup | — | Gorak +13,0 | — |
| Aura de précision | aura | +5 % de critique, +1 au multiplicateur | critiques | — | Elaria construite +18,8 (gravée : non mesurée) | — |
| Furie des vents | compétence | deux coups au lieu d'un | coups | — | signature | Gorak (2) |
| Coup de massue | compétence | s'il touche, l'adversaire perd sa prochaine action, 1x | tours perdus | — | moy. +12,7 | — |
| Brise-garde | compétence | s'il touche, le prochain coup reçu ×2 et brise l'armure temporaire | — | l'armure temporaire adverse | moy. +14,5 | — |
| Assaut | compétence | ce coup ×2 | gros coup | — | moy. +14,1 | — |
| Soliste | compétence | ce coup ×3, 1x | gros coup | — | moy. +17,2 | — |
| Crescendo | compétence | ce coup ×2, puis ×1 de plus à chaque fois qu'il touche | gros coup | ses propres touches | moy. +17,1 | Morgrut (2, C5) |
| **Élan** (B8) | aura | +10 % de critique ; chaque gros coup (critique, ou coup ×2 et plus) : +3 Ferveur | critiques, Ferveur | gros coups | moy. +13,0 (Gorak +17,9, Morgrut +11,3) ; rang +7,0 | — |

#### Sang — Gorak, Elaria, Brokk (3) · 4 auras, 5 compétences

| Brique | Genre | Effet | Produit | Consomme | Gravée connue | Sur un dé |
| --- | --- | --- | --- | --- | --- | --- |
| Ivresse du sang | aura | chacun de ses critiques lui donne deux coups de plus | coups | critiques | moy. +10,8 (Morgrut +3,1 ; Elaria +18,8) | Gorak (1) |
| Aura d'épines | aura | 1 Saignement à l'attaquant à chaque coup reçu | Saignement | coups reçus | rang +8,8 ; signature | Brokk (1) |
| Plaie ouverte | aura | 1 Saignement à chaque coup qui touche | Saignement | — | moy. +10,6 | — |
| Pourfendre | compétence | saignement de la moitié des dégâts du coup | Saignement | — | — (rang II : +2 Saignement) | — |
| Curée | compétence | trois coups de plus si l'adversaire saigne | coups | Saignement (condition) | Brokk +10,4, Gorak +7,0 | — |
| Hémorragie | compétence | 4 dégâts directs ; l'adversaire ne regagne plus de PV | malus de soin | — | moy. +14,1 | — |
| **Sangsue** (B7) | aura | chaque coup qui touche lui rend 1 PV par charge de Saignement de l'adversaire | soins | Saignement (lit ses charges) | Brokk +17,9 ; Gorak +6,6 et Elaria +7,1 avec la Plaie ouverte (série 82) | — |
| **Serment de sang** (B7) | compétence | il perd 3 PV ; l'adversaire prend 4 Saignement | Saignement | ses PV | moy. +16,1 (Brokk +18,9, Gorak +16,3, Elaria +17,6) ; rang +7,6 | — |
| **Odeur du sang** (B7) | compétence | si l'adversaire saigne, ce coup est critique, +4 | critique, gros coup | Saignement (condition) | Brokk +16,4 ; Gorak +7,9 et Elaria +5,0 avec la Plaie ouverte (série 83) | — |

#### Rempart — Brokk, Aldric, Morgrut (3) · 5 auras, 5 compétences

| Brique | Genre | Effet | Produit | Consomme | Gravée connue | Sur un dé |
| --- | --- | --- | --- | --- | --- | --- |
| Aura d'intimidation | aura | −1 dégât à chaque coup de l'adversaire | réduction | — | — (départ de Brokk 49,7 %) | — |
| Vindicte | aura | +6 Ferveur à chaque renvoi | Ferveur | renvois | Aldric +12,9 | Aldric (1) |
| Rempart hérissé | aura | +2 Épines et +2 armure temporaire quand son armure temporaire est vidée | Saignement, armure | armure vidée | Brokk +11,7 | — |
| Rancœur | aura | chaque coup reçu : +1 Ferveur | Ferveur | coups reçus | moy. +9,3 | — |
| Dette de sang | aura | l'adversaire saigne de 3 à chaque renvoi | Saignement | renvois | moy. +1,8 (Aldric +12,1) — hors bande | — |
| Peau de pierre | compétence | +6 armure temporaire ; tant qu'elle tient, +1 à ses coups | armure temporaire | — | moy. +17,9 | Brokk (2) |
| Rancune | compétence | son prochain coup reçu lui donne un critique assuré | critique assuré | coups reçus | Morgrut construit +20,5 | — |
| Riposte | compétence | ses 2 prochains coups reçus renvoient la moitié de leurs dégâts | renvois | coups reçus | — | — |
| Rétribution | compétence | la moitié des dégâts des trois derniers coups reçus | renvois | coups reçus (jauges) | signature | Aldric (2) |
| **Onde de choc** (B8) | compétence | 2 PV de dégâts directs par coup reçu, des trois derniers (scène) | dégâts directs | coups reçus (jauges) | moy. +13,0 (Brokk +14,0, Aldric +12,3, Morgrut +13,1) ; rang +7,9 | — |

#### Poison — Ervald, Naraxes, Thaldrin (3) · 4 auras, 5 compétences

| Brique | Genre | Effet | Produit | Consomme | Gravée connue | Sur un dé |
| --- | --- | --- | --- | --- | --- | --- |
| Aura de décoction | aura | 1 Poison à chaque coup qui touche | Poison | — | rang +9,9 ; signature | Naraxes (1) |
| Aura glaciale | aura | 1 Poison au début de chacun de ses tours | Poison | — | rang +10,2 ; signature | Ervald (1) |
| Sève noire | aura | chaque soin reçu : 4 Poison à l'adversaire | Poison | soins | moy. +3,6 (Ervald +8,9) — hors bande | — |
| Souffle de la tombe | compétence | 3, 2 puis 1 PV à la fin de ses tours | Poison | — | Ervald construit +14,5 | — |
| Virulence | compétence | triple le Poison de l'adversaire, puis +2 | Poison | Poison (amplifie) | Ervald +17,5 | — |
| Récolte | compétence | +14 PV si l'adversaire est empoisonné | soins | Poison (condition) | Ervald +11,9 | — |
| **Peau de crapaud** (B7) | aura | 1 Poison à l'attaquant à chaque coup reçu | Poison | coups reçus | moy. +13,9 (Ervald +19,0, Naraxes +16,0, Thaldrin +13,6) ; rang +11,0 (au-dessus) | — |
| **Pièce vert-de-gris** (B7) | compétence | s'il touche, une pièce : pile, 5 Poison | Poison, pièce | — | moy. +13,3 (Ervald +16,4, Naraxes +14,6, Thaldrin +13,3) ; rang +6,1 | — |
| **Morsure** (B7) | compétence | ce coup ×3 si l'adversaire est empoisonné | gros coup | Poison (condition) | Ervald +19,0, Naraxes +7,9, Thaldrin +3,9 (+6,4 avec l'Aura glaciale, série 83) | — |

#### Chance — Elaria, Naraxes, Fanchon (3) · 4 auras, 6 compétences

| Brique | Genre | Effet | Produit | Consomme | Gravée connue | Sur un dé |
| --- | --- | --- | --- | --- | --- | --- |
| Dé pipé | aura | +25 % de chances de faire pile à ses pièces | pile | pièces | moy. +0,8 (Naraxes +3,4) — hors bande | — |
| Feinte | aura | +5 % d'esquive ; chaque esquive, un critique assuré | esquives, critiques | esquives | moy. +10,6 (Gorak +8,2 ; Elaria +18,3) | Elaria (1) |
| Veine | aura | chaque 6 au dé : un jet de plus à sa prochaine action | jets | les 6 au dé | moy. +8,6 | — |
| Pas de côté | aura | +12 % d'esquive (+8 jusqu'au C5), sous le plafond d'esquive de 75 % | esquives | — | moy. +8,2 (à 8 %) | — |
| Pile ou face | compétence | s'il touche, une pièce : pile, ce coup ×3 | pièce, gros coup | — | signature | Naraxes (2) |
| Pièce porte-bonheur | compétence | s'il touche, une pièce : pile, critique assuré +4 | pièce, critique | — | non mesurée au registre | — |
| Pièce maudite | compétence | s'il touche, une pièce : pile, l'adversaire perd sa prochaine action | pièce, tour perdu | — | non mesurée au registre | — |
| Pièce de bouclier | compétence | s'il touche, une pièce : pile, +8 armure temporaire (refonte des auras) | pièce, armure | — | moy. +11,0 (Naraxes +11,1), rang II +5,2 | — |
| Pièce de la rafale | compétence | s'il touche, une pièce : pile, deux coups bruts tout de suite | pièce, coups | — | moy. +15,0 (Naraxes +15,3), rang II +6,0 | — |
| Pièce ensorcelée | compétence | s'il touche, une pièce : pile, −4 aux coups de l'adversaire, 3 tours | pièce, malus | — | moy. +10,5 (Naraxes +9,7), rang II +5,2 | — |
| Coup de chance | compétence | un jet de plus à sa prochaine action | jets | — | Naraxes construite +13,6 | — |
| Œil de faucon | compétence | ce coup est critique | critique | — | signature | Elaria (2) |
| Esquive améliorée | compétence | esquive à coup sûr le prochain coup reçu | esquive | — | rang +3,3 | — |

#### Lumière — Ysolde (1) · 4 auras, 5 compétences

| Brique | Genre | Effet | Produit | Consomme | Gravée connue | Sur un dé |
| --- | --- | --- | --- | --- | --- | --- |
| Aura de sainteté | aura | +1 PV à la fin de chacun de ses tours | soins | — | rang +8,1 ; signature | Ysolde (1) |
| Sentence | aura | chaque soin reçu : l'adversaire perd 3 PV | dégâts directs | soins | Ysolde construite +15,9 | — |
| Bouclier de foi | aura | chaque soin reçu : +2 armure temporaire | armure temporaire | soins | Ysolde +16,1 (ailleurs +0,5 à +4,1) | — |
| Aura d'immunité | aura | retire ses malus ; plus aucun malus ; +1 armure | — | malus adverses (les bloque) | — | — |
| Purification | compétence | retire son dernier bonus à l'adversaire, sinon 8 dégâts directs | dégâts directs | bonus adverses | signature | Ysolde (2) |
| Prière | compétence | +6 PV | soins | — | moy. +13,6 | — |
| Siffloter | compétence | +3 PV à la fin de ses 2 prochains tours | soins | — | moy. +13,5 | — |
| **Dîme** (B7) | compétence | ses 2 prochains coups reçus lui rendent chacun 2 PV, pris à l'attaquant | soins, dégâts directs | coups reçus | moy. +16,8 (Ysolde +19,5) ; rang +6,3 | — |
| **Flamme votive** (B7) | compétence | ses 2 prochains soins posent chacun Brûlure 3 | Brûlure | soins | Ysolde +18,6, Fanchon +12,9 (ailleurs +3 à +8,5, sans soin) ; rang +4,5 | — |

#### Ombre — Ervald, Aldric (2) · 4 auras, 6 compétences

| Brique | Genre | Effet | Produit | Consomme | Gravée connue | Sur un dé |
| --- | --- | --- | --- | --- | --- | --- |
| Effroi | aura | chacun de ses critiques : l'adversaire perd sa prochaine action | tours perdus | critiques | moy. +8,8 (Morgrut +2,9 ; Elaria +16,4) | — |
| Aura de pourriture | aura | chacun de ses critiques : 2 Pourriture | Pourriture | critiques | moy. +7,0 (Morgrut +0,7 ; Elaria +14,7) — sous la bande | — |
| **Emprise** (B8) | aura | ses coups font +1 par malus que porte l'adversaire | dégâts par coup | malus posés (tous) | Ervald +12,4 (Aldric +3,6 sans malus, Brokk +12,2) ; rang +4,7 | — |
| **Larcin** (B8) | aura | +5 % d'esquive ; chaque esquive : il prend une charge du dernier bonus de l'attaquant | esquives, bonus | esquives, bonus adverses | moy. +12,7 (Ervald +14,2, Aldric +10,4) ; rang +6,5 (une charge par vol ; avant : +14,1, Ervald +16,3, Aldric +10,9, à 200 par duel) | — |
| Vol de vie | compétence | ce coup lui rend les PV qu'il retire, +4 | soins | — | signature | Ervald (2) |
| Peur | compétence | l'adversaire perd sa prochaine action, 1x | tour perdu | — | — | — |
| Confiscation | compétence | vole le prochain bonus de l'adversaire (une charge ; il garde les autres) | — | bonus adverses | moy. +14,3 (Aldric +12,8) ; rang +6,3 (une charge par vol ; avant +16,0, rang +6,2) | — |
| Malchance | compétence | le prochain jet de l'adversaire sur une compétence tombe à vide | malus | — | moy. +18,2 | — |
| Flétrissure | compétence | −2 dégâts à chacun de ses coups, 3 tours | malus | — | moy. +9,1 | — |
| Fausse note | compétence | ses 2 prochains coups qui touchent font −4 | malus | — | moy. +17,5 | — |

#### Magie — Ysolde, Thaldrin, Fanchon (3) · 4 auras, 6 compétences

| Brique | Genre | Effet | Produit | Consomme | Gravée connue | Sur un dé |
| --- | --- | --- | --- | --- | --- | --- |
| Ciel d'orage | aura | au début de chacun de ses tours, l'adversaire perd 1 PV | dégâts directs | — | moy. +11,0 | Thaldrin (1) |
| Champ d'orage | aura | chaque coup reçu foudroie l'attaquant : 1 PV | dégâts directs | coups reçus | moy. +9,8 | — |
| Ballade | aura | chaque coup qui touche lui rend 1 PV | soins | — | moy. +11,3 | Fanchon (1) |
| **Surtension** (B8) | aura | chacun de ses éclairs fait +1 | dégâts directs | éclairs (Foudre, Ciel d'orage, Champ d'orage) | Thaldrin +12,8 (sans éclair : +2,6 à +4,9) ; rang +4,0 | — |
| Feux follets | compétence | 3 Brûlure | Brûlure | — | signature | Thaldrin (2) |
| Foudre | compétence | 4 PV en quatre éclairs | dégâts directs | — | rang +8,7 | — |
| Embrasement | compétence | si l'adversaire brûle, son prochain coup qui touche : trois fois sa Brûlure | dégâts | Brûlure | Thaldrin +10,6 (moy. +8,6) | — |
| Attiser | compétence | +2 à la Brûlure, qui repart | Brûlure | Brûlure (amplifie) | moy. +11,8 | — |
| Éclair aveuglant | compétence | les critiques de l'adversaire ratent | malus | critiques adverses | moy. +13,6 | — |
| Duo | compétence | des dés de plus à sa prochaine action (B10 : laissé en l'état, décision de l'utilisateur) | jets | — | signature | Fanchon (2) |

#### Synthèse

| Maîtrise | Auras | Compétences | Total | Porteurs | Ressource propre (produite → consommée dans la maîtrise) |
| --- | --- | --- | --- | --- | --- |
| Chance | 4 | 6 | **10** | 3 | pièces → Dé pipé ; esquives → Feinte ; les 6 → Veine |
| Rempart | 5 | **5** | **10** | 3 | renvois → Vindicte, Dette de sang ; armure vidée → Rempart hérissé ; coups reçus → Rancœur, Rancune, **Onde de choc** |
| Fureur | **4** | 6 | **10** | 2 | gros coups, critiques → **Élan** (qui fait critiquer : sa propre boucle) |
| Magie | **4** | 6 | **10** | 3 | Brûlure → Embrasement, Attiser ; éclairs → **Surtension** |
| Ombre | **4** | 6 | **10** | 2 | malus posés → **Emprise** ; esquives, bonus adverses → **Larcin** (hors critique) |
| Lumière | 4 | **5** | 9 | **1** | soins → Sentence, Bouclier de foi, **Flamme votive** ; coups reçus → **Dîme** (qui soigne : elle nourrit les consommatrices de soins) |
| Sang | **4** | **5** | 9 | 3 | Saignement → Curée, **Sangsue**, **Odeur du sang** ; producteurs sur jet : Pourfendre, **Serment de sang** |
| Poison | **4** | **5** | 9 | 3 | Poison → Virulence, Récolte, **Morsure** ; soins → Sève noire ; producteurs : **Peau de crapaud** (coups reçus), **Pièce vert-de-gris** (sur jet) |

64 briques (27 auras, 37 compétences), 8 en moyenne. Écart : de 6 (Sang, Poison) à 10 (Chance). _Depuis B7 et B8 (quatrième demande du 2026-10-27 : +6 auras, +7 compétences) : 77 briques, 9 au Sang, au Poison et à la Lumière, 10 aux cinq autres._

**Déséquilibres constatés (chiffres ci-dessus et § B5) :**
1. **Taille** : Sang et Poison (6) contre Chance (10). Pour « globalement égales en contenu », il manque environ deux briques au Sang et au Poison, une à la Lumière ; la Chance en a deux de trop (ou une sous-famille à part : esquive et critique, une 3e maîtrise plus tard).
2. **Ombre : deux auras seulement, toutes deux au critique**, qu'elle ne produit pas : faibles chez qui critique peu (Morgrut +2,9 et +0,7). Il manque une aura qui vit de ses propres malus.
3. **Fureur et Ombre n'ont pas de boucle** (règle 2 : producteur et consommateurs) : la Fureur produit gros coups et critiques que consomment le Sang (Ivresse) et l'Ombre (Effroi, Pourriture) ; l'Ombre pose des malus que rien ne lit.
4. **Lumière : un seul porteur** (Ysolde) et aucune brique qui gêne l'adversaire hors de la Purification (« le fait-il payer ? » ne tient qu'à la Sentence).
5. **Consommatrices sans producteur au départ** : réglé par la règle (§ B5, le producteur d'abord) : elles ne sont plus proposées au départ, et restent à graver une fois leur producteur dans le build.
6. **Hors bande gravées** (déjà connus) : Dé pipé +0,8, Dette de sang +1,8, Sève noire +3,6, Aura de pourriture +7,0 (toutes des consommatrices).
7. **Duo** : l'utilisateur le juge trop fort (B10) mais le laisse en l'état pour le moment ; son avenir reste à décider.

**Trous de contenu à combler par l'utilisateur (sans invention ici) :**
- Sang : une seconde consommatrice du Saignement, une compétence de plus (aujourd'hui Pourfendre seule pose sur jet).
- Poison : une ou deux compétences (généraliste ou consommatrice).
- Lumière : une brique qui fait payer l'adversaire ; un second porteur (personnage futur).
- Ombre : une aura qui lit ses malus (ressource propre), pour tenir deux auras hors critique.
- Fureur : un consommateur de ses gros coups ou de ses critiques, dans la maîtrise.
- Chance : rien à ajouter ; une pièce de plus donnerait de la valeur au Dé pipé.

#### Besoins de contenu par maîtrise (troisième retour du 2026-10-27, C8)

_Réponse à l'utilisateur : combien d'auras et de compétences par maîtrise pour l'équilibre. Comptes de la synthèse ci-dessus (vérifiés : inchangés par le troisième retour, le Crescendo était déjà une brique de Fureur). L'utilisateur propose le contenu ; l'agent juge chaque proposition (tel quel, modifié, ou base d'une version qui respecte les règles, le moteur, le spectacle, l'équilibre et le plaisir), selon le principe « synergies d'abord » : ressource produite, puis consommée, et collaboration entre maîtrises._

**Cible** : environ 4 auras et 5 compétences par maîtrise, soit 9 à 10 briques ; chacune avec une **boucle interne** (un producteur et un consommateur de sa ressource dans la maîtrise) et **un lien vers une autre maîtrise** (une ressource qu'elle produit pour une autre, ou qu'elle lit chez une autre).

| Maîtrise | Aujourd'hui (auras / compétences) | À ajouter | Ce qu'il faut surtout | Après la quatrième demande (B7, B8) |
| --- | --- | --- | --- | --- |
| Chance | 4 / 6 | 0 | rien ; une pièce de plus nourrirait le Dé pipé | 4 / 6 (la Pièce vert-de-gris, du Poison, est une pièce de plus pour le Dé pipé) |
| Rempart | 5 / 4 | +1 compétence | une consommatrice de l'armure temporaire ou des coups encaissés, qui frappe | 5 / 5 : Onde de choc |
| Fureur | 3 / 6 | +1 aura | une aura qui consomme ses gros coups ou ses critiques (sa boucle) | 4 / 6 : Élan |
| Magie | 3 / 6 | +1 aura | une aura de feu ou de foudre qui lit la Brûlure ou les dégâts directs | 4 / 6 : Surtension |
| Ombre | 2 / 6 | +2 auras | une aura qui lit ses malus posés (hors critique) ; une seconde qui gêne sans critique | 4 / 6 : Emprise, Larcin |
| Lumière | 4 / 3 | +2 compétences | une qui fait payer l'adversaire ; une qui consomme les soins | 4 / 5 : Dîme, Flamme votive |
| Sang | 3 / 3 | +1 aura, +2 compétences | une seconde consommatrice du Saignement ; un producteur sur jet | 4 / 5 : Sangsue ; Serment de sang, Odeur du sang |
| Poison | 3 / 3 | +1 aura, +2 compétences | un producteur sur jet ; une consommatrice du Poison qui frappe | 4 / 5 : Peau de crapaud ; Pièce vert-de-gris, Morsure |

**Total : 6 auras et 7 compétences** (13 briques), ce qui porte chaque maîtrise à 9 (Lumière, Sang, Poison) ou 10 briques (les cinq autres), 77 en tout. Les maîtrises à 6 compétences (Chance, Fureur, Magie, Ombre) n'en reçoivent pas : elles dépassent déjà la cible.

**État des lieux après le lot** (registre `MASTERY_SKILLS`, compté le 2026-10-27 après le réglage) : **33 auras et 44 compétences, 77 briques**, toutes gravables ; Fureur 4 / 6, Sang 4 / 5, Rempart 5 / 5, Poison 4 / 5, Chance 4 / 6, Lumière 4 / 5, Ombre 4 / 6, Magie 4 / 6. Chaque ligne du tableau des besoins est servie ; plus aucune maîtrise sous 9 briques ni sous 4 auras.

**Les départs après le lot** (script jetable, 400 combats par duel, graines du balance, `createCharacter(id, { aura })` contre le roster vanilla) : **63 départs, 7 hors de 42 à 58** (5 sous, 2 au-dessus ; 8 sur 55 après le Tuning C5) : Gorak Aura de puissance 59,1 (meilleur duel Ervald 66,0), Elaria Ivresse du sang 63,3 (Gorak 68,0) au-dessus ; Elaria Veine 39,8, Fanchon Ciel d'orage 38,7, Champ d'orage 38,5, Feinte 40,2, Veine 40,8 au-dessous. Les nouvelles auras de départ : Élan (Gorak 46,1, Morgrut 47,5), Peau de crapaud (Ervald 53,2, Naraxes 48,7, Thaldrin 55,4), Larcin (Ervald 48,6, Aldric 53,6) ; Morgrut Rancœur 44,3 (41,9 avant l'agent Specials) rentre dans la bande. **Duels au-delà de 65/35 au départ : 20** (22 avant le réglage : les deux du Larcin contre Fanchon sont réglés), tous chez des départs d'avant le lot : 5 au-dessus, Gorak Puissance–Ervald 66,0, Elaria Ivresse du sang contre Gorak, Ervald, Morgrut (67,0 à 68,0), Brokk Rempart hérissé–Elaria 67,0 ; 15 au-dessous (31,8 à 34,8), Ysolde Aura d'immunité, Brokk Rancœur et Aura d'intimidation contre Morgrut, Brokk Intimidation contre Fanchon, Elaria Veine (Brokk, Thaldrin) et Pas de côté (Ysolde), et huit de Fanchon (Ciel d'orage, Champ d'orage, Feinte, Veine) contre Brokk, Ysolde, Thaldrin.

### B7. Le contenu du soin : Sang, Poison, Lumière (quatrième demande du 2026-10-27)

_Proposition 3 de l'utilisateur, « des choses qui tournent autour du soin », servie surtout en Lumière (une compétence qui fait payer l'adversaire, une qui consomme les soins) et en lien entre maîtrises. Chaque brique : un effet, deux au plus liés, mesurée au laboratoire (séries 80 à 84, `scripts/lab/content-a.ts`) avant d'être codée, puis gravée sur le 3 nu (`scripts/skills.report.ts`, 400 combats par duel) et aiguisée (rang II). « Construit » : la consommatrice mesurée avec son producteur sur le 4 nu (la Plaie ouverte de Gorak et d'Elaria, l'Aura glaciale de Thaldrin), la règle « le producteur d'abord » ne l'offrant pas sans lui._

| Brique | Maîtrise | Le besoin | Sa boucle (produit → consomme) | Le lien | L'idée |
| --- | --- | --- | --- | --- | --- |
| **Dîme** | Lumière | qui fait payer l'adversaire | coups reçus → soins (et dégâts directs) | elle soigne : elle nourrit la Sentence, le Bouclier de foi, la Flamme votive, et la Sève noire (Poison) | l'impôt de la sainte : chaque coup qui la frappe lui rend 2 PV, pris à l'attaquant |
| **Flamme votive** | Lumière | qui consomme les soins | soins → Brûlure | Lumière → Magie : sa Brûlure nourrit l'Embrasement et Attiser | le cierge : ses deux prochains soins allument chacun une Brûlure 3 |
| **Sangsue** (aura) | Sang | une seconde consommatrice du Saignement | Saignement → soins | Sang → soins (Sentence, Bouclier de foi, Sève noire, Flamme votive) | elle boit la plaie : chaque coup qui touche lui rend 1 PV par charge de Saignement |
| **Serment de sang** | Sang | un producteur sur jet | ses PV → Saignement | il perd des PV : il passe plus vite sous la moitié (reliques de seuil) | le pacte : il paie 3 PV, l'adversaire saigne de 4, sans coup à toucher |
| **Odeur du sang** | Sang | une consommatrice de plus, qui frappe | Saignement → critique | Sang → critiques (Ivresse du sang, Effroi, Aura de pourriture) | le prédateur flaire la plaie : si l'adversaire saigne, ce coup est critique, +4 |
| **Peau de crapaud** (aura) | Poison | l'aura | coups reçus → Poison | le Poison défensif, l'Aura d'épines du Poison | qui la touche s'empoisonne : 1 Poison à l'attaquant par coup reçu |
| **Pièce vert-de-gris** | Poison | un producteur sur jet | → Poison, pile | Poison → Chance : une pièce, que lit le Dé pipé | la pièce du Poison : s'il touche, une pièce ; pile, 5 Poison |
| **Morsure** | Poison | une consommatrice du Poison qui frappe | Poison → gros coup | Poison → Fureur (un gros coup, ×3) | le croc : ce coup ×3 si l'adversaire est empoisonné |

**Moteur** : une seule brique nouvelle, `StatusRead` (`fromStatus` sur un soin ou des dégâts, comme sur une pose : la Sangsue lit le Saignement ; [RESOLUTION.md](RESOLUTION.md) § 4). Une réaction qui ne vaudrait que ce qu'elle lit ne part pas sans lui (la Sangsue sans Saignement, comme l'Embrasement sans Brûlure). Tout le reste vient des briques existantes (réactions `hurt`, `hit`, `healed`, pièce d'effet, `hitMultiplier` à condition, Critique assuré aiguisé). L'audit relit le multiplicateur d'une compétence qui modifie son coup sous condition (la Morsure), sur l'état du jet.

**Essayés et écartés** (laboratoire) : Dîme 3 × 2 (+19,1, puis 3 × 3 : +25,0) ; Flamme votive « +1 à sa Brûlure » (+5,3) puis « +2 » (+19,4) ; Sangsue ×2 (Brokk +21,8) ; Saigner à blanc (relâcher tout le Saignement, ×1 à ×3 : +0 à +13, rare à l'écran, une perte avancée plutôt qu'ajoutée), Rouvrir (2 PV par charge : Brokk +6,4) ; Agonie (dégâts par charge de Poison ×1 à ×4, relâche ×1 à ×3 : Naraxes +0,8 à +2,8) ; Serment −2 / 5 et −3 / 6 (+20 à +22), 4 Saignement sans prix (+18,8 à +21,6). Premier essai de la Dîme : un malus posé sur l'adversaire (« ses 2 prochains coups qui touchent lui coûtent 2 PV ») ; la perte de l'attaquant et le soin du lanceur, dans la fenêtre de son coup, ne se mettaient pas en scène dans l'ordre : la même règle, vue du lanceur, en fait un bonus (+16,8, comme avant).

**Gravées** (400 combats par duel, `logs/skills/`) et **rang II** :

| Brique | Gravée, moyenne des 10 hôtes | Chez ses porteurs | Rang II | Bande |
| --- | --- | --- | --- | --- |
| Dîme | +16,8 | Ysolde +19,5 | +6,3 | oui |
| Serment de sang | +16,1 | Gorak +16,3, Elaria +17,6, Brokk +18,9 | +7,6 | oui |
| Peau de crapaud | +13,9 | Ervald +19,0, Naraxes +16,0, Thaldrin +13,6 | **+11,0** | gravée oui ; rang au-dessus (comme Épines +8,8, Décoction +9,9, Glaciale +10,2 : un Poison de plus par coup reçu double l'aura) |
| Pièce vert-de-gris | +13,3 | Ervald +16,4, Naraxes +14,6, Thaldrin +13,3 | +6,1 | oui |
| Flamme votive | +6,8 | Ysolde +18,6 (Fanchon +12,9, sa Ballade) | +4,5 | oui chez son porteur ; sans soin, rien (le producteur d'abord ne l'offre qu'avec un soin) |
| Sangsue | +5,2 | Brokk +17,9 ; construits Gorak +6,6, Elaria +7,1 | +4,1 | Brokk oui ; Gorak, Elaria sous la bande, comme la Curée (Gorak +7,0) : la Plaie ouverte ne laisse qu'une charge de Saignement |
| Odeur du sang | +4,9 | Brokk +16,4 ; construits Gorak +7,9, Elaria +5,0 | +3,8 | Brokk oui ; Gorak au bord, Elaria sous la bande (ses critiques sont déjà nombreux) |
| Morsure | +5,5 | Ervald +19,0, Naraxes +7,9 ; Thaldrin +6,4 avec l'Aura glaciale | +4,0 | Ervald oui ; Naraxes au bord ; Thaldrin sous la bande |

**Aura de départ** (jusqu'à la 0.128.0 ; la Peau de crapaud et la Sangsue sont des compétences à charges depuis la 0.129.0) : la Peau de crapaud (aucun besoin) s'ajoutait aux départs des trois porteurs du Poison (règle dérivée de l'époque) ; la Sangsue attendait le Saignement. Départs (série 84, 400 par duel, ± 0,9) : Ervald 53,2 %, Naraxes 48,8 %, Thaldrin 59,1 % (pire duel Fanchon 64,3 %). **Relu au réglage** (`createCharacter(id, { aura })`, 400 par duel, graines du balance) : **Ervald 53,2 %, Naraxes 48,7 %, Thaldrin 55,4 %**.

**Le réglage** (quatrième demande, [STATUTS.md](STATUTS.md) « le réglage ») : le **rang de la Peau de crapaud (+11,0) reste à décider** : un Poison par coup reçu s'efface au tour de l'attaquant, deux s'accumulent ; aucun pas entier plus petit sur sa valeur ni sur son axe, et « 1x par tour » (crochet temporaire, retiré) ne touche pas le rang (+10,9 ; gravée +13,9 → +12,8 ; départs −2,3 à −3,2). Comme l'Aura de décoction, l'Aura glaciale et l'Aura d'épines. **Sangsue, Odeur du sang, Morsure : pas de réglage** (le producteur d'abord), confirmé par les porteurs construits de `npm run ramp` (10 récompenses, 48 builds, `logs/ramp/2026-10-27-21-03-06_v0.126.0.md`) : Sangsue Brokk +18,9 ± 6,2 (n 5), Gorak +5,7 (n 1) ; Odeur du sang Brokk +8,3 ± 3,8 (n 3), Gorak +9,3 (n 1), Elaria +3,3 (n 1) ; Morsure Ervald +11,9 ± 3,4 (n 9), Naraxes +8,1 ± 1,6 (n 9), Thaldrin +10,0 (n 1). Dans la bande là où leur producteur est dans le build ; chez les porteurs qui produisent peu, l'offre les tend rarement (18 ou 19 actes sur 120, 2 à 6 prises ; 50 à 84 actes chez Brokk, Ervald, Naraxes).

**Besoins après B7** : Lumière 4 / 5, Sang 4 / 5, Poison 4 / 5 (9 briques chacune) : les trois lignes du tableau ci-dessus sont servies.

### B8. Le contenu des maîtrises : Fureur, Magie, Ombre, Rempart (quatrième demande du 2026-10-27)

_Les propositions 1 (« une magie ou un coup lié à une onde de choc, avec un effet visuel ») et 2 (« du vol de statut positif, avec le transfert visuel ») de l'utilisateur, placées là où elles servent un besoin. Chaque brique : un effet, deux au plus liés ; mesurée au laboratoire (séries 85 à 92, `scripts/lab/content-b.ts`, 200 combats par duel) avant d'être codée, puis gravée sur le 3 nu (`scripts/skills.report.ts`, 200 par duel, rapports `logs/skills/2026-10-27-20-32-31`, `…20-33-15`, `…20-34-51`, `…20-35-00`) et au départ (script jetable, 400 par duel, mêmes graines que `npm run balance`)._

| Brique | Maîtrise | Le besoin | Sa boucle (produit → consomme) | Le lien | L'idée |
| --- | --- | --- | --- | --- | --- |
| **Élan** (aura) | Fureur | une aura qui consomme ses gros coups ou ses critiques | elle fait critiquer (+10 %) → chaque gros coup lui donne +3 Ferveur | ses gros coups (Assaut, Soliste, Crescendo) et ses critiques nourrissent aussi l'Ivresse du sang (Sang), l'Effroi et l'Aura de pourriture (Ombre) | l'élan du guerrier : le gros coup en appelle un autre |
| **Surtension** (aura) | Magie | une aura de foudre qui lit les dégâts directs | éclairs → éclairs plus forts | elle renforce le Ciel d'orage, le Champ d'orage, la Foudre (tous de la Magie) ; la relique de foudre d'un build aussi | le paratonnerre : chacun de ses éclairs fait +1 |
| **Emprise** (aura) | Ombre | une aura qui lit ses malus posés (hors critique) | malus posés → coups plus forts | elle lit **tous** les malus : Poison, Saignement, Brûlure, Peur, Flétrissure ; chaque maîtrise qui afflige la nourrit | la main d'ombre qui serre : +1 à ses coups par malus que porte l'adversaire |
| **Larcin** (aura) | Ombre | une seconde aura qui gêne sans critique ; la proposition 2 | esquive → bonus pris | elle prend ce que les autres maîtrises posent (auras, Ferveur, armure temporaire, Duo, Vol de vie) | le pickpocket : à chaque esquive, il prend une charge du dernier bonus de l'attaquant, qui vole d'un camp à l'autre |
| **Onde de choc** | Rempart | une consommatrice des coups encaissés qui frappe ; la proposition 1 | coups reçus (trois jauges) → dégâts directs | elle vit des coups qu'il encaisse, comme la Rancœur et la Rétribution : la Peau de pierre et l'Aura d'intimidation le font tenir pour frapper ; ce n'est pas un renvoi (ni Vindicte, ni Dette de sang), ni de la foudre (pas de Surtension) | le bouclier frappe le sol : 2 PV par coup encaissé, des trois derniers, en une onde qui roule jusqu'à l'adversaire |

**Larcin, Confiscation et Purification** : la Confiscation (Sceau de vol) attend le **prochain** bonus que l'adversaire se pose et le détourne ; la Purification **détruit** son dernier bonus (et blesse) ; le Larcin **prend** un bonus déjà porté, à chaque esquive, et le garde. **Un vol prend une charge** (règle commune des vols, réglage de la quatrième demande) : la Confiscation détourne une charge de la pose, le Larcin une charge du bonus porté ; le volé garde les autres, la dernière emporte le bonus entier (intensité comprise). Même transfert visuel (M50) : l'icône vole, mais du bonus de l'adversaire vers le voleur (de la zone d'état du volé, M50 étendue).

**Moteur** (quatrième demande, [RESOLUTION.md](RESOLUTION.md)) : le déclencheur `heavy` (« gros coup » : un critique, ou un coup ×2 et plus, après la fenêtre du critique) ; `cleanse.steal` (une charge de ce que la purge vise passe au porteur, marquée volée ; `cleanse.stolen`) ; `AppliedEffect.kept` (les charges d'une pose confisquée que le lanceur garde) ; `modifyOutgoing` lit les statuts du défenseur (l'Emprise compte ses malus) ; `modifyDirect` (les dégâts directs du porteur, par impact et selon leur source : la Surtension ne lit que la foudre) ; `release.per` (des jauges comptées, `per` PV par jauge). Accroches : `moment:heavy` (un critique en est un), `damage:lightning`, `malus` (tout statut négatif posé).

**Mesures** (gravée : moyenne des dix hôtes ; « chez ses porteurs » : ceux de la maîtrise ; rang : I → II) :

| Brique | Laboratoire (gravée) | Gravée, moyenne | Chez ses porteurs | Rang II | Bande |
| --- | --- | --- | --- | --- | --- |
| Élan | +3 Ferveur seule : Gorak +2,6, Morgrut +1,6 ; +10 % de critique et +3 Ferveur : +15,7, +7,7 | +13,0 | Gorak +17,9, Morgrut +11,3 | +7,0 | oui |
| Surtension | +1 par impact, tous dégâts directs : Thaldrin +9,3, Ysolde +1,1 ; +2 : +14,1 ; ×2 : +7,4 | +4,6 | Thaldrin +12,8 ; sans éclair (Ysolde, Fanchon) +3,0 à +4,9 | +4,0 | oui chez qui fait des éclairs (le producteur d'abord ne l'offre qu'à lui) |
| Emprise | +1 par malus : Ervald +9,1 ; +2 : +15,1 | +5,6 | Ervald +12,4 ; Aldric +3,6 (sans malus) | +4,7 | oui chez qui pose des malus |
| Larcin | +10 % : Ervald +18,1 ; +5 % : +12,6, Aldric +7,6 ; esquive seule : +6,0, +3,4 ; au coup reçu : +21,7 | +14,1 → **+12,7** (une charge par vol, 400 par duel) | Ervald +16,3 → +14,2, Aldric +10,9 → +10,4 ; construits (ramp, 10 récompenses) Ervald +13,1 ± 2,0, Aldric +13,5 ± 3,6 | +6,5 → +6,5 | oui |
| Onde de choc | 2 par coup reçu : Brokk +10,6, Morgrut +9,2 ; 3 : +15,4, +13,6 | +13,0 | Brokk +14,0, Aldric +12,3, Morgrut +13,1 | +7,9 | oui |

**Départs** (mesurés en 0.127.0, quand les auras de départ se déduisaient ; depuis la 0.129.0, la Surtension et l'Emprise sont des reliques, l'Élan et le Larcin des auras nommées de Gorak et d'Aldric) : l'Élan chez Gorak 46,1 % (pire Thaldrin 41,5) et Morgrut 47,5 % (pire Aldric 38,3) ; le Larcin chez Ervald 53,4 % (meilleur Fanchon 66,5) et Aldric 56,4 % (meilleur **Fanchon 69,0**) ; la Surtension et l'Emprise n'étaient l'aura de départ de personne. **Écarté** : la Surtension sur tous les dégâts directs faisait d'elle une aura de départ d'Ysolde (sa Purification), à **35,6 %**.

> **Remplacé le 2026-10-28 (A6, 0.128.0)** : un vol prend désormais le bonus **entier** (le volé le perd), seulement dans la zone des statuts, jamais une aura ; Larcin à +10 % d'esquive (RESOLUTION, FEATURES). Le paragraphe suivant décrit la 0.127.0.

**Réglé** (le levier recommandé, une règle pour tous les vols) : **un vol prend une charge**. Le Larcin au départ : Ervald 53,4 → **48,6 %** (contre Fanchon 66,5 → 52,3 ; meilleur duel Gorak 57,8), Aldric 56,4 → **53,6 %** (contre Fanchon 69,0 → **60,0**). Le Duo n'est pas touché (B10). La Confiscation suit la même règle : gravée +16,0 → +14,3 en moyenne (Aldric +13,9 → +12,8), rang II +6,2 → +6,3. **Morgrut à l'Élan** : 47,5 %, pire duel Aldric 38,3 %, inchangé (le dé vanilla d'Aldric ne vole rien) ; dans la tolérance (aucun duel au-delà de 65/35), noté.

**Essayés et écartés** (laboratoire) : la Rage (+1 durable à ses coups par gros coup : Gorak +3,1) ; l'Élan à un coup brut par gros coup (+4,7, puis +10 % de critique : +17,0, deux coups : +7,5) ; la Fournaise (+2 ou +3 contre un adversaire qui brûle, +1 par Brûlure : Thaldrin +2,1 à +2,6) ; l'Emprise à +2 (+15,1, trop fort chez Brokk) ; le Larcin au coup reçu ou au coup qui touche (+21,7, +21,8) ; l'Onde de choc à cinq jauges (sans effet : un statut d'essai n'est pas rempli par le moteur), à 3 et 4 PV par jauge (au-dessus de la bande).

**Besoins après B8** : Fureur 4 / 6, Magie 4 / 6, Ombre 4 / 6, Rempart 5 / 5 : les quatre lignes du tableau des besoins sont servies.


## 0. En bref

- **Une maîtrise est une grande famille de sorts, par thème, lisible par le joueur** : Fureur, Sang, Rempart, Poison, Chance, Lumière, Ombre, Magie (**huit** depuis le second retour du 2026-10-27, section « Huit maîtrises » ci-dessus ; onze dans la conception : Chasse, Représailles, Orage et Chant en plus). Elle remplace, côté joueur, les mots « famille » et « répertoire ». Les dix familles de statuts de [FAMILLES.md](FAMILLES.md) restent une donnée technique (le son d'une pose, `family`), jamais affichée comme maîtrise.
- **Chaque personnage joue sur deux maîtrises** (V1) ; une maîtrise est partagée par un à trois personnages, qui tirent ses auras et ses compétences dans **la même réserve** (V5 : Naraxes, Ervald et Thaldrin pour le Poison).
- **Chaque compétence et chaque aura appartient à une seule maîtrise** (V2) ; une aura s'offrait en cours de partie comme toute compétence, par Graver, jusqu'au retour du 2026-10-28 (A2 : **une aura par personnage**, choisie au départ ; la forge n'en grave ni n'en copie plus, et la face 1 ne se copie pas : [CAMPAGNE.md](CAMPAGNE.md) § 18.5).
- **Le dé de départ** (V4) : **une aura sur le 1, choisie** au début de la campagne parmi celles de ses deux maîtrises (V3), et **sur le 2 sa compétence de personnage, fixe** (Furie des vents pour Gorak, Pile ou face pour Naraxes). Quatre faces nues. Le duel joue l'aura par défaut ; le tournoi et la saison en tirent une au hasard (§ 5.3). Ses auras de départ : toutes celles de ses deux maîtrises que son dé de départ sert (B5, le producteur d'abord), mesurées sans exclusion par taux.
- **L'offre ne verrouille rien** (V3) : Graver propose **deux compétences, une de chaque maîtrise**, au lieu d'une ; la règle « le producteur d'abord » reste.
- **Cinq dés vanilla changent** (Gorak, Elaria, Aldric, Thaldrin, Fanchon), deux se retouchent (Brokk : Poing de pierre ; Morgrut : une aura, question Q2), trois ne bougent pas (Ervald, Ysolde, Naraxes).
- **M9** : Dé pipé devient une aura (Chance) ; Plaie ouverte est refaite (« 1 Saignement à chaque coup qui touche », +13 à +14 gravée au lieu de +6 à +13) ; Ivresse du sang et Sève noire sont déjà des auras, gardées, rangées en Fureur et en Poison.
- **R5** (poser les auras d'entrée) : mesurée **+15 à +26 points**, elle deviendrait obligatoire ; ne pas la livrer telle quelle (§ 10).

## 1. La demande et ce qui est tranché

| Point | La demande (résumé de la parole de l'utilisateur) | Ce qui est tranché ici |
| --- | --- | --- |
| V1 | Le mot Maîtrise : de grandes familles de sorts par thème ; deux par personnage ; plusieurs combinaisons, autant de personnages possibles | Onze maîtrises (§ 3), deux par personnage ; 55 paires possibles, dix prises |
| V2 | Les auras appartiennent à une maîtrise et s'offrent à ceux qui la jouent | Chaque aura est rangée dans une maîtrise (§ 4) et s'offrait par Graver (§ 6) ; depuis le 2026-10-28 (A2), elle s'offre au **choix du départ** seulement |
| V3 | Au début de la campagne, choisir une aura parmi celles de ses deux maîtrises, sans orientation drastique des offres | Le choix au départ (§ 5), Graver à deux cartes, une par maîtrise (§ 6.2) |
| V4 | Une aura par personnage dans les faces de base, toujours sur le 1, associée à une face 2 (fixe ou au choix) | Face 2 **fixe** : la compétence du personnage (§ 5.1, justification) |
| V5 | Deux personnages qui partagent une maîtrise tirent de la même réserve | La réserve appartient à la maîtrise, pas au personnage (§ 6.1) |

## 2. Vocabulaire et règles de rangement

1. **Maîtrise** : un thème que le joueur reconnaît en une phrase (« il fait saigner », « il joue aux pièces »), avec son emblème peint. C'est le seul mot montré au joueur pour ce niveau ; « famille » et « répertoire » disparaissent de l'écran.
2. **Une maîtrise tient une boucle** : au moins un producteur de sa ressource, ses consommateurs, et des généralistes. Une consommatrice appartient à la maîtrise qui produit sa ressource (Dette de sang vit des renvois : Représailles, pas Sang), sinon elle serait offerte à des personnages qui n'ont jamais sa ressource.
3. **Une brique, une maîtrise.** Pas de double appartenance : la réserve d'une maîtrise est une liste, la même pour tous ses porteurs.
4. **Taille** : au moins deux auras (le choix du départ) et cinq briques par maîtrise ; au moins huit briques gravables par personnage (ses deux réserves moins son dé), pour que quatre forges ne l'épuisent pas (règle actuelle de `offers.ts`). Exception assumée : le Chant n'a qu'une aura (§ 4, à écrire). _Depuis B1 : six briques et deux auras, sans exception (`validateMasteries`)._
5. **La famille de statut reste** (`StatusDef.family`) : elle choisit le son ([SONS.md](SONS.md) § 4.2) et sert aux règles de rangement de [FAMILLES.md](FAMILLES.md). Elle n'est plus affichée comme une maîtrise. Dans le compendium (vague 1, agent Compendium), le libellé d'une aura passe par un seul point, `familyLabel` (`statuses.ts`) : en vague 2, il devient le nom de sa maîtrise.

## 3. Les onze maîtrises (conception, avant B1)

| Id (code) | Maîtrise | La question du joueur | Familles de statuts couvertes | Ressource (la boucle) | Personnages | Emblème à peindre (à demander) |
| --- | --- | --- | --- | --- | --- | --- |
| `fury` | **Fureur** | Frappe-t-il plus fort, plus souvent ? | Puissance, Tempo, Garde (malus) | les coups (rafales, gros coups) | Gorak, Morgrut | un poing serré sur un manche de hache |
| `blood` | **Sang** | L'adversaire saigne-t-il ? | Affliction (Saignement), Tempo, Soin (malus) | le Saignement | Gorak, Elaria, Brokk | une goutte de sang sur une lame |
| `hunt` | **Chasse** | Va-t-il viser juste, ou esquiver ? | Précision, Esquive | les critiques et les esquives | Elaria | un œil de rapace traversé d'une flèche |
| `bulwark` | **Rempart** | Encaisse-t-il, puis le rend-il ? | Garde, Sceaux, Précision | l'armure temporaire, les coups encaissés | Brokk, Morgrut | un écu clouté |
| `retaliation` | **Représailles** | Le frapper se paie-t-il ? | Représailles, Puissance, Affliction | les dégâts renvoyés | Aldric | deux lames croisées, pointes retournées |
| `poison` | **Poison** | Perd-il des PV à chaque tour ? | Affliction (Poison), Soin | le Poison | Naraxes, Ervald, Thaldrin | une fiole verte fumante |
| `chance` | **Chance** | Que vont donner le dé et la pièce ? | Fortune, Précision, Tempo (malus) | les pièces et les jets | Naraxes, Fanchon | une pièce dressée contre un dé |
| `light` | **Lumière** | Se soigne-t-il, et le fait-il payer ? | Soin, Garde, Sceaux, Affliction | les soins | Ysolde | un soleil rayonnant |
| `shadow` | **Ombre** | L'adversaire est-il maudit ? | Tempo (malus), Soin, Sceaux (malus), Puissance (malus) | les malus posés | Aldric, Ervald | un crâne sous un croissant noir |
| `storm` | **Orage** | La foudre et le feu tombent-ils ? | Affliction (Brûlure, dégâts directs), Précision (malus) | la Brûlure, les éclairs | Thaldrin, Ysolde | un éclair qui fend un nuage |
| `song` | **Chant** | La chanson porte-t-elle ses coups ? | Tempo, Puissance, Soin | les dés de plus, les gros coups | Fanchon | un luth à la corde vibrante |

**Les paires** : Gorak Fureur et Sang ; Elaria Chasse et Sang ; Brokk Rempart et Sang ; Morgrut Fureur et Rempart ; Aldric Représailles et Ombre ; Ervald Poison et Ombre ; Naraxes Chance et Poison ; Thaldrin Orage et Poison ; Ysolde Lumière et Orage ; Fanchon Chant et Chance. Aucune paire ne se répète. Huit maîtrises sur onze sont partagées ; Chasse, Représailles, Lumière et Chant attendent leur second porteur (un personnage futur).

## 4. Les réserves

Valeurs de conception : points de victoire gravée sur le 3 nu de l'hôte (kit vanilla d'aujourd'hui, contre le roster nu, 400 combats par duel, marge ± 1 à 1,3 point ; bande d'une gravure : 8 à 20). « Registre » : la compétence existe ; « refaite » : même id, même nom, même icône, règle nouvelle ; « nouvelle » : à coder (vague 2). Les chiffres sans source sont ceux de [REVUE_COMPETENCES.md](REVUE_COMPETENCES.md) et du rapport `npm run ramp` du 2026-10-25. **Toutes les briques « nouvelles » et « refaites » sont livrées (tranche B)** ; leur mesure au registre est au § 4 bis, elle fait foi.

### Fureur (Gorak, Morgrut)

| Brique | Genre | Texte (effet d'abord) | État | Mesure |
| --- | --- | --- | --- | --- |
| Ivresse du sang | aura | Chacun de ses critiques lui donne deux coups de plus. | registre (réserve de Gorak) | dé de départ de Gorak 50,8 % |
| Aura de puissance | aura | +2 dégâts à chacun de ses coups. | registre | gravée +17,9 ; départ de Gorak 57,6 % |
| Aura sauvage | aura | +1 à l'attaque. | registre (Thaldrin, sous forme humaine) ; la forme quitte la compétence | gravée chez Gorak +13,0 ; départ 50,9 % |
| Furie des vents | compétence | Deux coups au lieu d'un. | registre (signature de Gorak) | face 2 de Gorak |
| Coup de massue | compétence | S'il touche, l'adversaire perd sa prochaine action, 1x. | registre | — |
| Brise-garde | compétence | S'il touche, le prochain coup que reçoit l'adversaire ×2. | registre | — |
| Assaut | compétence | Ce coup ×2. | **nouvelle** | gravée Gorak +14,8, Morgrut +20,6 (au bord haut : à surveiller chez Morgrut) |

### Sang (Gorak, Elaria, Brokk)

| Brique | Genre | Texte | État | Mesure |
| --- | --- | --- | --- | --- |
| Aura d'épines | aura | 1 Saignement à l'attaquant à chaque coup reçu. | registre (signature de Brokk) | départ de Brokk 49,8 % (aujourd'hui), Elaria 48,1 % |
| Plaie ouverte | aura | 1 Saignement à l'adversaire à chaque coup qui touche. | **refaite** (M9, § 9) | gravée Gorak +13,0, Elaria +14,3 (registre : +6,4 et +12,6) |
| Pourfendre | compétence | L'adversaire saigne de la moitié des dégâts de ce coup, s'il touche. | registre | — |
| Curée | compétence | Trois coups de plus si l'adversaire saigne. | registre | Brokk construit +16,5 |
| Hémorragie | compétence | 4 dégâts directs ; l'adversaire ne regagne plus de PV. | registre (réserve de Gorak) | — |

La Plaie ouverte refaite est **le producteur constant** qui manquait au Sang : la Curée ne partait que 0,23 fois par combat chez Gorak, faute de Saignement.

### Chasse (Elaria)

| Brique | Genre | Texte | État | Mesure |
| --- | --- | --- | --- | --- |
| Feinte | aura | +5 % d'esquive. Chaque esquive lui donne un critique assuré. | registre | départ d'Elaria 52,2 % |
| Aura de précision | aura | +5 % de critique et +1 au multiplicateur de critique. | registre | départ 55,2 % ; Elaria construite +18,8 |
| Pas de côté | aura | +8 % d'esquive. | registre | départ 46,0 % |
| Œil de faucon | compétence | Ce coup est critique. | registre (signature d'Elaria) | face 2 d'Elaria |
| Esquive améliorée | compétence | Esquive à coup sûr le prochain coup reçu. | registre (quitte son dé) | — |

La Chasse est la plus mince en compétences (deux) : une ou deux à écrire, sans boucle multiplicative de plus (Elaria construite est déjà la plus forte, § 8).

### Rempart (Brokk, Morgrut)

| Brique | Genre | Texte | État | Mesure |
| --- | --- | --- | --- | --- |
| Aura d'intimidation | aura | −1 dégât à chaque coup de l'adversaire. | registre | départ de Brokk 54,4 % (avec le Poing) |
| Rempart hérissé | aura | +2 Aura d'épines et +2 armure temporaire quand son armure temporaire est vidée. | registre | départ 51,7 % (avec le Poing) |
| Aura d'immunité | aura | Aucun malus ne peut plus lui être posé, et +1 armure. | registre (quitte Ysolde et Aldric) | départ 52,8 % (avec le Poing) ; elle bloque le Poison des auras : le contre du Poison |
| Peau de pierre | compétence | +6 armure temporaire ; tant qu'elle tient, ses coups font +1. | **retouchée** (le Poing de pierre, P4) | départ de Brokk 49,8 → 54,9 % |
| Rancune | compétence | Son prochain coup reçu lui donne un critique assuré. | registre | Morgrut construit +20,5 |

Essayés et écartés : **Coup de bouclier** (l'armure temporaire relâchée en dégâts : +0,6, elle n'est presque jamais là quand le 3 tombe, et la relâcher retire la défense) ; **Écu vengeur** (aura, 4 PV à l'adversaire quand l'armure temporaire est vidée : gravée +7,3, au départ 38,8 %, elle remplace mal les Épines) ; Poing de pierre à +2 (départs 58,4 et 59,1 % : trop).

### Représailles (Aldric)

| Brique | Genre | Texte | État | Mesure |
| --- | --- | --- | --- | --- |
| Vindicte | aura | +6 Ferveur quand il renvoie des dégâts. | registre | départ d'Aldric 53,8 % (attaque 5 à 6) |
| Dette de sang | aura | L'adversaire saigne de 3 quand il renvoie des dégâts. | registre | départ 52,9 % |
| Rancœur | aura | Chaque coup reçu lui donne +1 Ferveur. | **nouvelle** | gravée Aldric +9,5 ; départ 56,0 % |
| Rétribution | compétence | L'adversaire perd la moitié des dégâts des trois derniers coups reçus. | registre (signature d'Aldric) | face 2 d'Aldric |
| Riposte | compétence | Ses 2 prochains coups reçus renvoient chacun la moitié de leurs dégâts. | registre (quitte son dé) | — |

### Poison (Naraxes, Ervald, Thaldrin)

| Brique | Genre | Texte | État | Mesure |
| --- | --- | --- | --- | --- |
| Aura de décoction | aura | 1 Poison à l'adversaire à chaque coup qui touche. | registre (signature de Naraxes) | départs Naraxes 49,8 %, Ervald 49,5 %, Thaldrin 55,5 % |
| Aura glaciale | aura | 1 Poison à l'adversaire au début de chacun de ses tours. | registre (signature d'Ervald) | départs Ervald 47,7 %, Naraxes 47,1 %, Thaldrin 54,7 % |
| Sève noire | aura | Chaque soin que son porteur reçoit inflige 4 Poison à l'adversaire. | registre (M9 : déjà une aura) | départ d'Ervald 44,7 % |
| Souffle de la tombe | compétence | L'adversaire perd 3, 2 puis 1 PV au début de ses tours. | registre | Ervald construit +14,5 |
| Virulence | compétence | Triple le Poison de l'adversaire, puis +2. | registre | Ervald +17,5 |
| Récolte | compétence | +14 PV si l'adversaire est empoisonné. | registre | Ervald +11,9 |

### Chance (Naraxes, Fanchon)

| Brique | Genre | Texte | État | Mesure |
| --- | --- | --- | --- | --- |
| Dé pipé | aura | +25 % de chances de faire pile à ses pièces. | **refaite** (M9) | borne haute, portée d'office : gravée +5,9 (5 sur 6 : +7,9) ; départ de Naraxes 43,7 % (5 sur 6 : 45,8 %) |
| Veine | aura | Chaque 6 au dé lui donne un jet de plus à sa prochaine action. | **nouvelle** | gravée Naraxes +8,5 ; départs Naraxes 46,5 %, Fanchon 44,4 % |
| Pile ou face | compétence | S'il touche, une pièce : pile, ce coup ×3 ; face, rien. | registre (signature de Naraxes) | face 2 de Naraxes |
| Pièce porte-bonheur, Pièce maudite | compétences | pièces d'effet (pile : critiques assurés ; pile : l'adversaire perd sa prochaine action) | **en cours** (agent CoinsRelics, M10 et R2) | `local://r27-CoinsRelics.md` |
| Coup de chance | compétence | Un jet de plus à sa prochaine action. | registre (quitte le répertoire d'Elaria) | Naraxes construite +13,6 |
| Malchance | compétence | Le prochain jet de l'adversaire sur une compétence tombe à vide. | registre | — |

Écartée : **Bonne étoile** (aura, chaque pile +1 dégât à ses coups jusqu'à la fin du combat) : gravée +1,5, départ 38,9 %. Les pièces sont rares au départ (une face sur six) : toute aura qui les consomme est faible tant que la maîtrise n'a qu'une pièce ; elle grandit avec les pièces de CoinsRelics. D'où une aura qui lit le dé (Veine) à côté du Dé pipé.

### Lumière (Ysolde)

| Brique | Genre | Texte | État | Mesure |
| --- | --- | --- | --- | --- |
| Aura de sainteté | aura | +1 PV à la fin de chacun de ses tours. | registre (signature d'Ysolde) | départ 46,4 % (aujourd'hui) |
| Sentence | aura | Chaque soin qu'il reçoit fait perdre 3 PV à l'adversaire. | registre | Ysolde construite +18,0 |
| Bouclier de foi | aura | Chaque soin qu'il reçoit lui donne +2 armure temporaire. | registre | Ysolde +16,2 |
| Purification | compétence | Retire son dernier bonus à l'adversaire, sinon 6 dégâts directs. | registre (face 2 d'Ysolde) | — |
| Prière | compétence | +6 PV. | **nouvelle** (P9) | gravée Ysolde +17,7, Gorak +14,2 |

### Ombre (Aldric, Ervald)

| Brique | Genre | Texte | État | Mesure |
| --- | --- | --- | --- | --- |
| Effroi | aura | Chacun de ses critiques fait perdre sa prochaine action à l'adversaire. | **nouvelle** | gravée Ervald +12,1, Aldric +6,7 ; départs Ervald 48,2 %, Aldric 53,1 % |
| Aura de pourriture | aura | Ses critiques posent 2 Pourriture par charge à l'adversaire. | **refaite**, livrée (1 → 2 par charge, § 4 bis) | départs livrés : Ervald 48,3 %, Aldric 54,6 % |
| Vol de vie | compétence | Ce coup lui rend les PV qu'il retire, +2. | registre (face 2 d'Ervald) | — |
| Peur | compétence | L'adversaire perd sa prochaine action, 1x. | registre | — |
| Confiscation | compétence | Vole le prochain bonus de l'adversaire. | registre | — |
| Flétrissure | compétence | L'adversaire fait −2 dégâts à chacun de ses coups pendant 3 tours. | **nouvelle** (statut Affaibli, déjà au registre) | gravée Ervald +11,5, Aldric +8,2 |

La Pourriture « à chaque coup qui touche » (le statut du registre, sans porteur) : départ d'Ervald 64,5 % (pire duel 70,8 % contre Brokk), trop forte ; la version « critique » est retenue.

### Orage (Thaldrin, Ysolde)

| Brique | Genre | Texte | État | Mesure |
| --- | --- | --- | --- | --- |
| Ciel d'orage | aura | Au début de chacun de ses tours, l'adversaire perd 1 PV. | registre | départs Thaldrin 55,6 %, Ysolde 45,0 % |
| Champ d'orage | aura | Chaque coup reçu foudroie l'attaquant : 1 PV. | **nouvelle** | gravée Ysolde +11,8, Thaldrin +10,7 ; départs 55,8 % et 44,7 % |
| Feux follets | compétence | L'adversaire perd 3 PV à la fin de ses 3 prochains tours. | registre (signature de Thaldrin) | face 2 de Thaldrin |
| Foudre | compétence | L'adversaire perd 4 PV, en quatre éclairs. | registre (quitte son dé) | — |
| Embrasement, Attiser | compétences | consommatrices de la Brûlure | registre | Thaldrin +10,6 et +8,2 |
| Éclair aveuglant | compétence | Les critiques de l'adversaire ratent. | registre | Ysolde +15,9 |

### Chant (Fanchon)

| Brique | Genre | Texte | État | Mesure |
| --- | --- | --- | --- | --- |
| Ballade | aura | Chaque coup qui touche lui rend 1 PV. | **nouvelle** (P9) | gravée Fanchon +12,4 ; départ 50,4 % (à 2 PV : 62,4 %, trop) |
| Duo | compétence | des dés de plus à sa prochaine action (trois depuis le 2026-10-27, agent EngineFixes ; **un** depuis le 2026-10-28, A11, agent TuningE : [PERSONNAGES.md](PERSONNAGES.md), Fanchon) | registre (signature de Fanchon) | face 2 de Fanchon |
| Soliste | compétence | Ce coup ×3, 1x. | registre (quitte son dé) | — |
| Crescendo, Siffloter, Fausse note | compétences | ses chansons | registre | — |

Une seconde aura du Chant reste à écrire : aucune n'a tenu la bande (Ballade à 2 PV : 62,4 %).

## 4 bis. Les briques livrées, mesurées au registre (2026-10-27)

`scripts/skills.report.ts` (`SKILLS_PART=engrave` puis `rank`, `SKILLS_ENGRAVE=` les douze briques), 200 combats par duel, sur les dix hôtes du roster livré (dés de départ de la tranche C). Gravée : la brique sur le 3 nu, moyenne des dix hôtes (bande 8 à 20). Rang II : rang I → II sur la même face (bande +3 à +8). Rapports : `logs/skills/2026-10-27-11-34-28_v0.120.0.md` (gravées), `…11-35-34…` (rangs), `…11-36-20…` (Aura de pourriture réglée).

| Brique | Gravée (moyenne ; de … à …) | Rang II (I → II ; II → III) | Lecture |
| --- | --- | --- | --- |
| Peau de pierre (Poing de pierre) | +17,9 (Aldric +14,8 ; Ysolde +22,4) | +3,5 ; +2,7 | dans les bandes |
| Assaut | +14,1 (Fanchon +9,7 ; Ysolde +18,0) | +8,6 ; +4,8 | rang au bord haut, dans la marge (± 1) : laissé |
| Prière | +13,6 (Aldric +12,4 ; Ysolde +16,7) | +4,6 ; +3,2 | dans les bandes |
| Ballade | +11,3 (Aldric +9,9 ; Ysolde +13,4) | +6,0 ; +4,6 | dans les bandes |
| Plaie ouverte (refaite) | +10,6 (Aldric +8,1 ; Ysolde +12,3) | +8,8 ; +3,8 | rang au bord haut, dans la marge : laissé |
| Champ d'orage | +9,8 (Fanchon +6,8 ; Ysolde +12,4) | +5,3 ; +4,4 | dans les bandes |
| Rancœur | +9,3 (Fanchon +6,4 ; Ysolde +12,0) | +5,0 ; +4,2 | dans les bandes |
| Flétrissure | +9,1 (Gorak +7,3 ; Ysolde +11,6) | +4,3 ; +3,3 | dans les bandes |
| Effroi | +8,8 (Morgrut +2,9 ; Elaria +16,4) | +4,0 ; +3,6 | dans les bandes ; vit du critique (Morgrut n'en fait presque pas) |
| Veine | +8,6 (Aldric +6,9 ; Ysolde +10,6) | +3,5 ; +1,8 | dans les bandes |
| Aura de pourriture (au critique) | **1 → 2 Pourriture par charge** : +4,5 → +7,0 (Morgrut +0,7 ; Elaria +14,7) | +2,0 → +2,3 ; +1,3 | réglée ; reste sous la bande en moyenne, car elle vit du critique : Ervald +13,2 et Elaria +14,7 la tiennent, Morgrut et Fanchon non |
| Dé pipé (aura) | +0,8 (Naraxes +3,4 ; les autres +0,0 à +0,8) | +0,0 ; +0,0 | **hors bande, non réglé** : un amplificateur de pièces ne vaut rien sans pièces, et la seule Pile ou face de Naraxes (une face sur six) ne lui donne que +3,4. Aucune valeur ne l'y mettrait (le plafond de 5 sur 6 bornait déjà la conception à +7,9) ; il grandit avec les pièces gravées. Retiré des auras de départ de Naraxes (§ 5.2) |

Réglage livré : `ROT_AURA_ROT = 2` (`statuses.ts`), le texte suit (« 2 Pourriture par charge »). Le Dé pipé reste à 25 % par charge : à reprendre quand la maîtrise aura plusieurs pièces (CoinsRelics), ou avec une règle qui ne dépende pas d'elles.

## 5. Le dé de départ (V4)

### 5.1 La règle : l'aura sur le 1, au choix ; la face 2, fixe

- **Face 1 : une aura**, choisie en début de campagne parmi les **deux auras** du personnage (§ 18) ; en duel, la première (le dé vanilla) ; en tournoi et en saison, tirée au hasard (§ 5.3).
- **Face 2 : sa compétence de personnage**, fixe (`signature`). **Pourquoi fixe** : (1) un personnage est un personnage précis (principe 8 de [INTENTION.md](INTENTION.md)) : Gorak sans Furie des vents, Naraxes sans Pile ou face ne sont plus eux ; (2) l'aura porte déjà la personnalisation : un second choix multiplierait les départs à mesurer (auras × faces 2) et à équilibrer, pour une liberté que la forge donne déjà ensuite (Graver, Copier, Refondre) ; (3) la face 2 travaille avec les auras des deux maîtrises (Pile ou face touche, donc nourrit aussi la Décoction).
- **Les auras de départ** d'un personnage (règle de la vague 1, remplacée par B5 en 0.122.0, puis par la refonte des auras en 0.129.0, § 18 : **deux auras nommées sur sa fiche**, `CharacterDef.auras`, servies par son dé de départ, `auraServed`) : celles de ses deux maîtrises dont la ressource était déjà dans son dé de départ **et** dont le départ mesuré tenait la tolérance.

### 5.2 Les départs mesurés

Dé de départ contre le roster nu d'aujourd'hui, 400 combats par duel (3 600 par départ ; marge d'un taux ± 1,6 point, d'un écart apparié ± 1 à 2). En gras, l'aura par défaut (le dé vanilla). **Historique** (0.121.0 à 0.128.0) : depuis la refonte des auras (0.129.0), chaque personnage a deux auras nommées et la moitié des auras ci-dessous sont sorties ; les départs en vigueur sont au § 18 et dans [REFONTE_AURAS.md](REFONTE_AURAS.md) § 13.

| Personnage | Maîtrises | Face 2 | Dé vanilla aujourd'hui | Auras de départ proposées (taux) | Écartées au départ |
| --- | --- | --- | --- | --- | --- |
| Gorak | Fureur, Sang | Furie des vents | Furie / Pourfendre 52,8 % | **Ivresse du sang 50,8** ; Aura sauvage 50,9 ; Plaie ouverte 49,1 | Plaie ouverte du registre 42,9 ; Aura de puissance 57,6 (son duel contre Ysolde à 66,0 % : à revoir après le `npm run balance` de la tranche C) |
| Elaria | Chasse, Sang | Œil de faucon | Œil / Esquive améliorée 49,9 % | **Feinte 52,2** ; Aura de précision 55,2 ; Plaie ouverte 49,2 ; Aura d'épines 48,1 ; Pas de côté 46,0 | (Ivresse du sang 58,8 : en Fureur, hors de ses maîtrises) |
| Brokk | Rempart, Sang | Peau de pierre (et Poing +1) | Épines / Peau 49,8 % | **Aura d'épines 54,9** ; Intimidation 54,4 ; Immunité 52,8 ; Rempart hérissé 51,7 ; Plaie ouverte 51,5 | Écu vengeur 38,8 |
| Morgrut | Fureur, Rempart | aucune | nu 46,7 % | (Q2) attaque 7 à 9 → 6 à 8 : **Aura de puissance 49,5** ; Immunité 43,6 ; Intimidation 42,5 | Aura sauvage 40,8 ; à 7 à 9 : Puissance 65,1, Intimidation 61,6 |
| Aldric | Représailles, Ombre | Rétribution | Rétribution / Riposte 51,4 % | attaque 4 à 6 → 5 à 6 : **Vindicte 53,8** ; Rancœur 56,0 ; Effroi 53,1 ; Dette de sang 52,9 ; Pourriture 51,0 | à 4 à 6 : de 41,1 à 45,0 |
| Ervald | Poison, Ombre | Vol de vie | Glaciale / Vol de vie 47,7 % | **Aura glaciale 47,7** ; Décoction 49,5 ; Effroi 48,2 ; Pourriture 45,4 ; Sève noire 44,7 | — |
| Ysolde | Lumière, Orage | Purification | Sainteté / Purification 46,4 % | **Aura de sainteté 46,4** ; Ciel d'orage 45,0 ; Champ d'orage 44,7 | Sentence, Bouclier de foi (aucun soin sans Sainteté) |
| Naraxes | Chance, Poison | Pile ou face | Décoction / Pile 49,8 % | **Aura de décoction 49,8** ; Aura glaciale 47,1 ; Veine 46,5 ; Dé pipé 43,7 (borne haute) | Bonne étoile 38,9 ; Sève noire (aucun soin) |
| Thaldrin | Orage, Poison | Feux follets | Feux follets / Foudre 56,3 % | **Ciel d'orage 55,6** ; Champ d'orage 55,8 ; Décoction 55,5 ; Glaciale 54,7 | Sève noire (aucun soin) |
| Fanchon | Chant, Chance | Duo (3 charges ; **1** depuis le 2026-10-28) | Duo / Soliste 49,3 % | **Ballade 50,4** ; Veine 44,4 (2026-10-28, Duo à une charge, attaque 6 à 7, esquive et critique 15 % : **Ballade 50,7** ; Ciel d'orage 47,3 ; Champ d'orage 46,2 ; Feinte 51,1 ; Veine 44,4 ; Pas de côté 53,0) | Dé pipé (aucune pièce) ; Ballade à 2 PV 62,4 |

Lecture :
- **Le choix pèse sans casser** : l'écart entre la meilleure et la moins bonne aura de départ d'un personnage va de 1,7 point (Ysolde) à 8,9 (Elaria). La moins bonne reste dans la tolérance. En campagne, l'écart compte moins : les rencontres se règlent sur un champion de référence **parti de la même aura** (§ 11.3).
- **Thaldrin** reste en haut (55,6 %), comme aujourd'hui (56,3 %) : sa montée est la plus faible du roster (−12,3 points à 10 récompenses) ; on ne le baisse pas avant la mesure de la montée (vague 2). Variante gardée : Ciel d'orage et Foudre sur le 2 (51,0 %), si l'on préfère ses éclairs à sa signature (décision de l'utilisateur du 2026-10-24 : les Feux follets).
- **Aldric** perd la Riposte de son dé : sans compensation, chaque aura le laisse de 41 à 45 %. L'attaque 4 à 6 → 5 à 6 (un point de plus au minimum) le remet de 51 à 56 %, PV intacts.
- **Brokk** gagne 5 points au départ par le Poing de pierre (P4 : « début très mou »).

**Livré (tranche C, 2026-10-27) : les départs mesurés sur le registre.** Chaque aura de départ sur le 1 du dé livré, contre le roster livré (dés vanilla de la tranche C), 400 combats par duel (3 600 par départ ; ± 1,6 point). Script jetable sur `winRate` (`analysis.ts`), retiré après la mesure. En gras, l'aura par défaut. Tolérance 42 à 58 %.

| Personnage | Auras de départ livrées (taux) | Retirées de `startAuras` (taux) |
| --- | --- | --- |
| Gorak | **Ivresse du sang 49,5** ; Aura sauvage 49,7 ; Plaie ouverte 47,4 | — |
| Elaria | **Feinte 51,9** ; Aura de précision 54,7 ; Plaie ouverte 48,0 ; Aura d'épines 47,7 ; Pas de côté 44,4 | — |
| Brokk | **Aura d'épines 52,0** ; Intimidation 49,6 ; Immunité 48,0 ; Rempart hérissé 49,5 ; Plaie ouverte 49,3 | — |
| Morgrut | **Aura de puissance 49,2** | Aura d'immunité 39,4 ; Aura d'intimidation 40,3 |
| Aldric | **Vindicte 54,8** ; Rancœur 56,8 ; Effroi 56,0 ; Dette de sang 54,0 ; Aura de pourriture 54,6 (51,9 à 1 Pourriture) | — |
| Ervald | **Aura glaciale 44,5** ; Décoction 46,6 ; Effroi 48,9 ; Aura de pourriture 48,3 (42,7 à 1 Pourriture) ; Sève noire 42,4 | — |
| Ysolde | **Aura de sainteté 43,8** ; Ciel d'orage 42,7 ; Champ d'orage 42,6 | — |
| Naraxes | **Aura de décoction 50,1** ; Aura glaciale 47,6 ; Veine 46,4 | Dé pipé 41,4 |
| Thaldrin | **Ciel d'orage 54,7** ; Champ d'orage 54,8 ; Décoction 54,7 ; Glaciale 53,7 | — |
| Fanchon | **Ballade 49,6** ; Veine 43,7 | — |

- **Morgrut** n'a plus qu'une aura de départ : l'Immunité et l'Intimidation le laissent à 39-40 % (à l'attaque 6 à 8, la conception les donnait à 42-44 %, contre le roster d'avant). Elles restent dans sa réserve (gravure). Pour lui rendre un choix : une aura de la Fureur ou du Rempart à mesurer, sans toucher ses PV.
- **Naraxes** perd le Dé pipé au départ (41,4 %, § 4 bis).
- **Ysolde** (42,6 à 43,8 %) et **Ervald** (42,4 à 48,9 %) tiennent la tolérance au ras du bas : leurs dés vanilla sont les plus faibles du `npm run balance` (44,2 et 44,4 %). À relever par leurs compétences avant d'ajouter une aura de départ.

### 5.3 Le tournoi, la saison et le duel

**Tournoi et saison : l'aura de départ tirée** (retour du 2026-10-27, B7, « comme si chaque participant choisissait son build ») : au lancement, avant le premier combat, chaque participant reçoit une aura **au hasard parmi les deux auras de sa fiche** (`CharacterDef.auras` depuis la 0.129.0, chacune avec la même chance ; `drawStartAuras`, `tournament.ts`), tirée à la graine du tournoi ou de la saison sur un hasard à part (`seed ^ 'aura'`) : même graine, même tirage. Elle est sur le 1 de son dé **pour tout le tournoi**, et pour une saison **pour toute la saison puis l'arbre** (choix de l'agent : sa forge de saison se construit et se valide sur ce dé, les offres le lisent ; une aura qui changerait à chaque match invaliderait un Aiguiser de l'aura ou une gravure qui dépend d'elle, et brouillerait l'identité du participant). Elle se voit avant le premier combat : sceau de l'aura à côté du nom au classement de saison (infobulle au survol), 1 du dé en miniature de chaque carte de l'arbre, dé de l'écran d'affrontement et du champion. Les cotes cachées et les parieurs de l'ordinateur se calculent sur ces combattants mêmes (`priceMatch`) : ils suivent le dé réel. Un participant sans aura (tournoi d'avant le tirage) ou dont l'aura n'est plus l'une des siennes part de la première (`entrantAura`). Le duel joue toujours le dé vanilla (la première aura) ; un choix d'aura en duel est possible plus tard, comme le pavé de triche ; il n'est pas prévu.

Mesure (`npm run season`, section « Aura de départ tirée », taux de saison par aura ; et douze saisons de 24, même arbre de travail, sans puis avec tirage) : taux de saison par personnage de 42-56 % (écart-type 4,7 points) à 41-54 % (4,1 points), 6 624 matchs chacun ; durée 5,98 → 6,11 tours par combattant.

## 6. L'offre en cours de partie (V3, V5)

### 6.1 La réserve d'un personnage

Sa réserve est **la réunion des réserves de ses deux maîtrises**, moins les briques déjà sur son dé de départ. Deux personnages qui partagent une maîtrise ont la même liste pour elle (V5). La règle « le producteur d'abord » (`offerableSkills`, `skillNeeds`) ne change pas : une consommatrice n'arrive qu'une fois sa ressource dans le build. Une aura de la maîtrise s'offrait comme toute compétence jusqu'au retour du 2026-10-28 (A2, 0.128.0) : depuis, la réserve gravable ne contient **aucune aura** (`playable`, `isAuraSkill`), Copier ne vise ni la face 1 ni une aura.

| Personnage | Réserve (gravables) | Ce qui part de son répertoire d'aujourd'hui | Ce qui arrive |
| --- | --- | --- | --- |
| Gorak | 10 | Œil de faucon, Aura de précision, Vol de vie | Aura sauvage, Coup de massue, Brise-garde, Assaut ; Pourfendre quitte son dé pour sa réserve |
| Elaria | 8 | Furie des vents, Coup de chance, Riposte, Coup de massue | Feinte, Pas de côté, Aura d'épines, Plaie ouverte, Hémorragie ; Esquive améliorée quitte son dé pour sa réserve |
| Brokk | 8 | Rétribution, Riposte, Vindicte, Dette de sang, Coup de massue, Brise-garde | Plaie ouverte, Hémorragie |
| Morgrut | 11 | Pourfendre, Curée | Ivresse (jamais offerte : il ne critique pas), Furie des vents, Coup de massue, Aura sauvage, Immunité, Assaut |
| Aldric | 9 | Purification, Souffle de la tombe, Rancune, Sève noire, Hémorragie, Immunité | Riposte (de son dé), Dette de sang, Rancœur, Effroi, Pourriture, Flétrissure |
| Ervald | 10 | Feux follets, Embrasement, Attiser, Pourfendre, Plaie ouverte | Effroi, Pourriture, Flétrissure, Confiscation, Sève noire (déjà) |
| Naraxes | 11 | Œil de faucon, Esquive améliorée, Pas de côté, Feinte | Sève noire, Récolte, Veine, les pièces |
| Thaldrin | 11 | Aura de puissance, Aura d'épines, Coup de massue, Aura sauvage | Aura glaciale, Virulence, Récolte, Sève noire, Champ d'orage, Foudre (de son dé) |
| Ysolde | 10 | Aura d'immunité, Rétribution, Peau de pierre, Vol de vie, Coup de massue, Confiscation, Peur | Feux follets, Foudre, Ciel et Champ d'orage, Embrasement, Attiser, Prière |
| Fanchon | 11 | Aura de puissance, Esquive améliorée, Aura de précision, Feinte, Pas de côté | Soliste (de son dé), Veine, Coup de chance, les pièces |

### 6.2 Graver à deux cartes, une par maîtrise

Aujourd'hui, une forge propose trois opérations différentes, dont au plus un Graver, avec **une** compétence tirée au poids de son écho avec le build (`drawForgeOffer`, `ECHO_WEIGHT`). L'écho penche vers la maîtrise de l'aura de départ (une aura de Chance fait écho aux pièces) : laissé seul, il orienterait la partie (V3 : « sans orientation drastique »).

**Décision proposée** : la carte Graver propose **deux compétences, une de chaque maîtrise** (quand les deux en ont une offrable), chacune tirée au poids de son écho **dans sa maîtrise** ; s'il n'y en a qu'une offrable, une seule. Le joueur voit à chaque forge les deux directions et choisit : « aura de Chance puis tout Chance », ou « contrebalancer par du Poison ». Le choix par défaut (pilote automatique, champion de référence) reste au hasard entre les deux : la distribution des builds de référence ne change presque pas (une maîtrise sur deux, à parts égales). Aucune pondération de plus : la carte double suffit à ne pas verrouiller, et l'écho garde « le producteur d'abord ».

Repli plus simple (si l'utilisateur ne veut pas toucher l'écran de forge) : une seule compétence, la maîtrise tirée à pile ou face, puis la compétence à l'écho dans cette maîtrise.

Les reliques ne changent pas (offre par besoins, `offerableRelics`).

## 7. Ce que deviennent les signatures, les kits et les réserves d'aujourd'hui

| Personnage | Dé d'aujourd'hui (1 / 2) | Dé vanilla proposé (1 / 2) | Ce qui quitte le dé |
| --- | --- | --- | --- |
| Gorak | Furie des vents / Pourfendre | Ivresse du sang / Furie des vents | Pourfendre (Sang) |
| Elaria | Œil de faucon / Esquive améliorée | Feinte / Œil de faucon | Esquive améliorée (Chasse) |
| Brokk | Aura d'épines / Peau de pierre | Aura d'épines / Peau de pierre (+ Poing de pierre) | — |
| Morgrut | nu | Aura de puissance / nu (Q2) | — |
| Aldric | Rétribution / Riposte | Vindicte / Rétribution, attaque 5 à 6 | Riposte (Représailles) |
| Ervald | Aura glaciale / Vol de vie | inchangé | — |
| Ysolde | Aura de sainteté / Purification | inchangé | — |
| Naraxes | Aura de décoction / Pile ou face | inchangé | — |
| Thaldrin | Feux follets / Foudre | Ciel d'orage / Feux follets | Foudre (Orage) |
| Fanchon | Duo / Soliste | Ballade / Duo | Soliste (Chant) |

- **`signature`** change de sens : c'était la compétence du 1, c'est la compétence du personnage sur le 2. Celles d'aujourd'hui qui sont des auras (Épines, Glaciale, Sainteté, Décoction) deviennent l'aura par défaut sur le 1 ; leur face 2 devient la signature.
- **`repertoire` disparaît** : la réserve vient des maîtrises. **`reserve`** n'a plus de sens de jeu (« ses compétences hors du dé ») : les définitions des compétences partent dans un catalogue commun (§ 11.1).
- **Le compendium** (C6) ne liste plus que le dé de départ ; la fiche d'un personnage nomme ses deux maîtrises (§ 12).

## 8. Les personnages (P1 à P11)

**P1. Gorak : de la profondeur.** Deux plans lisibles, un par maîtrise. *Rafale* (Fureur) : Ivresse du sang sur le 1 (chaque critique, deux coups), Furie des vents sur le 2, puis Assaut (+14,8 gravé), Aura de puissance (+17,9), Brise-garde. *Saignement* (Sang) : Plaie ouverte refaite (+13,0 chez lui, le Saignement à chaque coup), qui nourrit la Curée (aujourd'hui 0,23 fois par combat, faute de Saignement) et Pourfendre. Sa réserve passe de 5 à 10 briques. Départ : 52,8 → 50,8 %.

**P2. Aldric : l'Ombre assez profonde ?** Aujourd'hui, son « Ombre du serment brisé » tenait en trois briques (Peur, Souffle de la tombe, Rancune), dont deux d'autres thèmes. L'Ombre proposée en a six : Effroi et Aura de pourriture (auras, ses départs 53,1 et 51,0 %), Flétrissure (+8,2 gravée chez lui), Peur, Confiscation, Vol de vie. Représailles lui garde la Riposte, la Vindicte, la Dette de sang et la Rancœur (+9,5). Sa ressemblance avec Gorak (« multi-frappe ») venait de la Rétribution relâchée en plusieurs coups (S1, agent StagingFixes) ; ses deux maîtrises n'ont aucune rafale. La compensation (attaque 5 à 6) est au § 5.2.

**P3. Naraxes : une seconde maîtrise aussi sympa.** Le Poison : trois auras (Décoction, Glaciale, Sève noire) et trois compétences (Souffle, Virulence +13,0 chez elle, Récolte), partagés avec Ervald et Thaldrin. Sa Chance garde ce qui a plu (pièces, Pile ou face, Coup de chance, reliques de pièce) et y ajoute Veine et le Dé pipé en aura. Elle perd l'Œil de faucon et ses esquives (Chasse).

**P4. Brokk : un début mou, une armure contrée par le Poison, un jeu ennuyeux.**
- *Le début* : la Peau de pierre gagne « tant qu'elle tient, ses coups font +1 » (le Poing de pierre) : son départ passe de 49,8 à 54,9 % (à +2 : 58,4 %, trop). L'armure se voit enfin en dégâts, à chaque coup qu'elle protège : c'est « retourner l'armure sous forme de dégâts », la piste de l'utilisateur.
- *Une autre maîtrise* : Sang au lieu de Représailles. Ses Épines y vivent déjà ; la Curée (+16,5 chez lui construit, sa meilleure gravure), Pourfendre, la Plaie ouverte et l'Hémorragie lui donnent de quoi frapper, et le Rempart hérissé relie ses deux maîtrises (armure vidée → Épines → Saignement → Curée). Question Q1.
- *Le Poison* : l'Aura d'immunité passe en Rempart ; elle bloque le Poison des auras adverses (règle A5) : le contre lisible du build armure.
- *« Pas de chance abusé »* : la courbe de la campagne vise 78 % puis 86 % puis 90 % aux trois premiers combats, pour tous les champions (le réglage se fait sur le champion de référence du même personnage) : **40 % des parties s'arrêtent avant le 4e combat** (1 − 0,78 × 0,86 × 0,90). Trois départs perdus tôt sur trois parties, c'est 6 % de malchance, pas un défaut propre à Brokk. Si l'on veut moins de défaites précoces, c'est la courbe (`NORMAL_TARGETS`) : question Q8.

**P5. Thaldrin : aussi bien en tout Poison ?** Ses deux maîtrises sont l'Orage et le Poison : un départ Décoction (55,5 %) ou Glaciale (54,7 %) est aussi fort que l'Orage (55,6 %), et la réserve Poison (Virulence, Récolte, Souffle, Sève noire) est celle d'Ervald et de Naraxes. La Bête n'est pas une maîtrise : c'est sa forme (Force de l'ours). Ses gravures en forme d'ours (M8) relèvent de l'agent EngineFixes ; sa montée (la plus faible du roster) en dépend.

**P6. Elaria : des maîtrises claires, trop forte construite (62,4 %).** Chasse et Sang : « elle vise, elle esquive, et sa proie saigne ». Ce qui la rend trop forte : ses stats (22 % d'esquive, 15 % de critique ×2,4) multiplient tout ce qui touche au critique, et sa réserve d'aujourd'hui lui offrait le Coup de chance (pris dans 27 builds sur 48, +14,9) et la Furie des vents. Les deux quittent sa réserve ; elle garde l'Aura de précision (+18,8, 16 builds). Son départ par défaut (Feinte) passe de 49,9 à 52,2 %. La montée n'est pas mesurable sans le code (les réserves vivent dans `src/`) : **mesure de la vague 2** (`npm run ramp`), cible 58 % au plus construite. Levier suivant si elle reste au-dessus : son multiplicateur de critique 2,4 → 2,2 (une stat secondaire, avant les PV), à mesurer au laboratoire puis à la montée. L'Ivresse du sang est rangée en Fureur, hors de ses maîtrises : chez elle, au départ, 58,8 % (+8,9) et des fins serrées qui tombent de 43 à 35 %.

**P6, réglé (vague 2, 2026-10-27)** : critique **17 % ×2,2** (le levier ci-dessus, avec +2 points de chance de critique, qui favorisent son vanilla : ses builds vivent de critiques assurés). Construite 60,7 → **57,4 %**, vanilla 51,6 → 46,0 % (§ 17).

**P7. Fanchon : le rework sur un d6.** Ce qui a rendu Fanchon « le bordel » : son second dé vivait dans une compétence du 1 qui posait aussi une aura cachée (Aura mélodieuse, retirée par EngineFixes, qui a donné au Duo trois charges : 49,3 % vanilla). Le rework, dans le cadre des maîtrises :
- **Chant et Chance** : la saltimbanque chante et joue aux dés (Veine, pièces, Coup de chance).
- **Le dé** : une aura sur le 1 (Ballade, « chaque coup qui touche lui rend 1 PV », par défaut, 50,4 % ; ou Veine, 44,4 %), le **Duo sur le 2** (sa compétence de personnage, son identité : les dés de plus). Le Duo s'enchaîne mieux sur le 2 qu'il ne s'enchaînait sur le 1 avec l'aura.
- **Le Soliste** quitte le dé pour la réserve du Chant (« un peu fort » : il ne part plus qu'une fois gravé, à mesurer gravé en vague 2).
- **Ses stats ne bougent pas** (46 PV, attaque 4 à 6) : avec le Duo à trois charges, la Ballade suffit. (Avec des stats « au niveau du roster », 50 PV et attaque 5 à 6, elle passait à 64,8 % : trop.)
- **Le texte du Duo** : la lecture « deux dés à sa prochaine action » est jugée longue ; proposition pour l'agent Compendium : « Trois dés de plus au tour suivant. » (au nombre de charges).

**P8. Ervald : un peu faible.** Vanilla 47,7 %, construit 45,8 % (le plus de gravures sous la bande : 51 %, Plaie ouverte +5,4 prise dans 10 builds). Ses maîtrises, Poison et Ombre, lui retirent ses briques faibles hors thème (Plaie ouverte, Feux follets, Embrasement, Attiser, Pourfendre) et lui donnent l'Effroi (+12,1 gravé chez lui, la meilleure brique nouvelle à son hôte) et la Flétrissure (+11,5). Son départ peut passer par la Décoction (49,5 %). À mesurer construit en vague 2.

**P9. Plus de soin.** Cinq maîtrises soignent : Lumière (Sainteté, Prière +17,7 gravée chez Ysolde, Sentence et Bouclier de foi qui vivent des soins), Chant (Ballade, Siffloter), Ombre (Vol de vie), Poison (Récolte), et la Sève noire qui fait payer les soins. Pistes de reliques (agent CoinsRelics, vague 2 ; l'Onguent du rebouteux est repris en M11) : une **gourde** (« +2 PV à la fin de chacun de ses tours sous la moitié de ses PV », Seuil) ; un **baume** (« chaque soin reçu +1 », qui lit les soins de toutes les maîtrises). À mesurer (`npm run relics`).

**P10. Une face qui en déclenche une autre.** L'idée « votre face 6 déclenche votre face 2 » fait partir deux compétences si la 6 en porte déjà une. Trois réponses, par ordre de préférence :
1. **Elle existe en forge** : Copier une face (une copie vaut +9,0 à +11,4 chez les porteurs construits, `npm run ramp`). Rien à ajouter.
2. **Veine** (aura de Chance) : chaque 6 au dé donne un jet de plus, sans dédoubler une compétence (§ 4).
3. **En relique, sur une face nue seulement** : « Sa face 6, si elle est nue, joue sa face 2. » Jamais deux compétences d'un jet ; une face gravée ensuite éteint la relique (à dire au survol). Valeur attendue : celle d'une copie (+9 à +11), dans la bande des reliques. À mesurer avant de la proposer.

**P11. La progression entre les parties.** Piste reliée aux maîtrises (TODO § 20, « débloquer des briques qui font boule de neige ; au début presque impossible de finir ») :
- **Des rangs de maîtrise** (Apprenti, Compagnon, Maître), gagnés par les victoires de campagne de tout champion qui la joue ; comme les réserves sont partagées, gagner avec Naraxes en Poison fait progresser le Poison d'Ervald et de Thaldrin : une raison d'essayer les autres.
- **Ce qu'un rang débloque** : au rang Apprenti, les producteurs et les généralistes de la maîtrise et une aura de départ ; chaque rang ajoute une ou deux consommatrices ou amplificatrices (Virulence, Curée, Sentence…) et une aura de départ.
- **La difficulté** : le champion de référence de la campagne (celui qui règle les PV des rencontres) garde la réserve Apprenti ; les déblocages rendent donc le joueur réellement plus fort que la courbe, ce que demande la piste (si la référence suivait les déblocages, la courbe les annulerait, [CAMPAGNE.md](CAMPAGNE.md) § 6.3).
- **Stockage** : `battler:masteries:v1` (par maîtrise, ses victoires). Rien de mesuré : à mesurer (`npm run campaign` avec la réserve Apprenti seule, puis entière) après la vague 2. Proposition par défaut : **plus tard**, après la vague 2.

## 9. M9 : Dé pipé, Plaie ouverte, Ivresse du sang, Sève noire

Esprit : ne pas fermer de possibilité, on remplace plutôt qu'on ampute. Les ids, noms et icônes restent (l'héritage et les forges enregistrées gardent leurs gravures).

| Brique | Décision | Pourquoi | Mesure |
| --- | --- | --- | --- |
| **Dé pipé** | **Devient une aura de Chance** : « +25 % de chances de faire pile à ses pièces » (par charge, plafond des pièces 5 sur 6). La même brique moteur que la Pièce lestée (`headsChance`, agent CoinsRelics), lue aussi sur les statuts | Un dé pipé l'est en permanence : c'est la lecture de l'utilisateur ; il grandit avec chaque pièce de la maîtrise | Avec une seule pièce, plus faible que la compétence d'aujourd'hui : borne haute +5,9 (5 sur 6 : +7,9) contre +11,9 ; départ 43,7 %. Question Q4 |
| **Plaie ouverte** | **Refaite** : « 1 Saignement à l'adversaire à chaque coup qui touche » (Sang) | La version critique ne se voyait pas (un Saignement posé sur un critique, qui coule au coup suivant) et dépendait du critique : « ni envie ni confiance ». La nouvelle agit à chaque coup, se lit, et nourrit la Curée | Gravée Gorak +6,4 → +13,0, Elaria +12,6 → +14,3 ; départs 49,1 % (Gorak), 49,2 % (Elaria), 51,5 % (Brokk) |
| **Ivresse du sang** | **Gardée, aura de Fureur** (règle inchangée) | C'est déjà une aura (`look.aura`) ; la confusion venait de son rangement avec les compétences : l'onglet Auras (C1, agent Compendium) et le nom de sa maîtrise la règlent | Aura par défaut de Gorak : 50,8 % ; chez Elaria 58,8 % (d'où la Fureur, hors de ses maîtrises) |
| **Sève noire** | **Gardée, aura de Poison** | C'est déjà une aura ; son texte est repris (C4 : « Chaque soin que son porteur reçoit inflige 4 Poison à l'adversaire. », fait par l'agent Compendium) | Départ d'Ervald 44,7 % (le Vol de vie la nourrit) |

## 10. R5 : une relique qui pose les auras d'entrée

**Mesure** (série 75, 400 combats par duel) : une relique qui pose l'aura de sa face 1 au premier tour vaut **+14,9 à +25,5 points** sur le kit d'aujourd'hui (Brokk +25,5, Naraxes +18,6, Ervald +18,3, Ysolde +14,9) et +12 à +15 sur les dés de départ proposés (Aldric, Gorak). L'aura posée d'office, puis reposée par la face 1 (une charge de plus pour les auras cumulables), vaut plus qu'une gravure : avec une aura sur le 1 de chaque personnage, **elle deviendrait obligatoire**.

**Variante avec un prix** (pièce maîtresse, [PROGRESSION.md](PROGRESSION.md) P5) : l'aura part au premier tour, et la face 1 devient nue : **+2,5 à +7,0** (Ervald +2,5, Ysolde +4,3, Naraxes +4,5, Brokk +7,0), et une face libre à graver.

**Recommandation** : ne pas la livrer telle quelle ; si on la veut, sous sa forme avec prix. L'agent CoinsRelics l'a notée en idée ([RELIQUES.md](RELIQUES.md) § 17).

**Suite (second retour du 2026-10-27, B11)** : faire vivre les auras sans relique obligatoire, dans [AURAS.md](AURAS.md). Recommandation mesurée : « son aura de départ arrive au plus tard à son 3e tour » (présence 38,5 → 72 %, combats sans aura 28 → 0 %) ; la relique R5 y retombe à +5 / +13, une relique ordinaire. Le Dé pipé à double effet (B12) et les dés de plus par maîtrise (B13) y sont aussi.

## 11. Le modèle de données (vague 2)

### 11.1 Les fichiers

- **`src/game/masteries.ts`** (nouveau) :
  ```ts
  export type MasteryId = 'fury' | 'blood' | 'bulwark' | 'poison' | 'chance' | 'light' | 'shadow' | 'magic' // huit depuis B1 (onze à la conception)
  export interface Mastery {
    id: MasteryId
    name: string            // « Fureur »
    question: string        // « Frappe-t-il plus fort, plus souvent ? »
    summary: string         // une phrase, pour le compendium
    icon: string            // emblème peint, src/assets/icons/mastery-<id>.png (§ 12)
    skills: readonly string[] // ids : ses auras et ses compétences, dans l'ordre du compendium
  }
  export const MASTERIES: Record<MasteryId, Mastery>
  export const MASTERY_IDS: readonly MasteryId[]
  export function masteryOfSkill(skillId: string): MasteryId | undefined
  export function poolOf(id: MasteryId): CharacterEvent[]     // ses compétences gravables
  export function validateMasteries(): string[]
  ```
- **`src/game/skills.ts`** (nouveau) : le catalogue des définitions de compétences, sorties des `events` et `reserve` de `roster.ts` (un déplacement, à résultats identiques) ; `ALL_SKILLS` et `ENGRAVABLE_SKILLS` en dérivent. Le roster pose ses deux faces par id (`onFace(SKILLS['wind-fury'], 2)`).
- **`roster.ts`**, `CharacterDef` :
  - `masteries: readonly [MasteryId, MasteryId]` (remplace `repertoire`) ;
  - `auras: readonly [string, string]` (`startAuras` jusqu'à la 0.128.0) : ses deux auras nommées, la première sur le 1 du dé vanilla (§ 18) ;
  - `signature?: string` : la compétence du 2 (aucune pour Morgrut) ;
  - `reserve` disparaît (catalogue).
  - `validateRoster` : deux maîtrises distinctes ; le 1 du dé vanilla est `auras[0]` ; deux auras distinctes, chacune d'une de ses maîtrises, une aura (`auraOfSkill`) et servie par son dé de départ (`auraServed`) ; la signature est sur le 2 et appartient à une de ses maîtrises.
- **`character.ts`** : `Character.withStartAura(skillId)` (le dé vanilla, l'aura choisie sur le 1 ; refusée hors de `auras`) ; `createCharacter(id, { aura })`.
- **`offers.ts`** : `REPERTOIRES` → `poolOf(championId)` (ses deux réserves moins son dé) ; `drawReward` : Graver à deux compétences (§ 6.2).
- **`forge.ts`** : `ForgeOffer` de Graver porte `skills: CharacterEvent[]` (une ou deux) ; le pas choisi reste `{ op: 'engrave', face, skill }` : **le journal de forge, l'héritage et les parties enregistrées ne changent pas de forme**.
- **`statuses.ts`** : `familyLabel` → le nom de la maîtrise de la compétence qui pose l'aura ; `StatusDef.family` reste (son). Nouveaux statuts : Veine, Effroi, Rancœur, Champ d'orage, Ballade, Poing de pierre ; `headsChance` sur un statut (Dé pipé), additionné à celui des reliques dans `tossCoin`.

### 11.2 Les migrations

| Donnée | Clé | Ce qui change | Migration |
| --- | --- | --- | --- |
| Historique des combats | `battler:history:v1` | rien (il ne garde ni dé ni kit) | aucune ; rétrocompatible |
| Partie en cours | `battler:campaign:v4` | `aura: string` (l'aura de départ) | **v5** ; une partie v4 se lit : `aura` = l'aura par défaut, et les pas de forge qui ne valent plus sur le nouveau dé (un aiguisage du 1 ou du 2 d'un dé qui a changé : Gorak, Elaria, Aldric, Thaldrin, Fanchon) sont retirés (`validOnOrigin`), le reste est gardé |
| Héritage | `battler:campaign-heritage:v1` | rien de nouveau | `loadHeritage` écarte déjà les pas de forge qui ne valent plus (`validOnOrigin`) ; il vérifie sur le dé **de l'aura choisie** ; une gravure d'une compétence d'une autre maîtrise reste héritable (elle a été gagnée). Depuis 0.128.0 (A2, A8) : une aura gravée, une copie du 1, une dorure ou une trempe héritées sont écartées (`heritageFor`) |
| Choix de l'écran de campagne | `battler:campaign-choices:v1` = `{ [championId]: { heritage: boolean; aura?: string } }` (livrée par l'agent Screens avec U3 : `CampaignChoice`, `loadCampaignChoices`, `saveCampaignChoice`, qui fusionne) | `aura` s'ajoute, mémorisée par champion | aucune (champ facultatif) ; une aura mémorisée qui n'est plus dans `startAuras` retombe sur la première |
| Combats signalés, traces | `logs/combats/` | le dé vanilla de cinq personnages change | `npm run logs` rejoue chaque trace avec le roster d'aujourd'hui : les traces d'avant la vague 2 de ces cinq personnages sont écartées avec leur raison (comme la barde à deux dés, 0.116.0) |

### 11.3 La campagne

- `startRun(championId, seed, heritage?, aura?)` ; `championOf(run)` pose l'aura du run.
- Le **champion de référence** (`drawBuild`, `referenceChampions`, `tuneHp`) part **de la même aura** que le joueur : la courbe nominale reste celle du personnage avec ce départ, et un départ plus faible ne rend pas la partie plus dure (la clé de graine des rencontres inclut l'aura).
- La saison du tournoi (`season.ts`) part du dé vanilla.

## 12. L'interface (vague 2)

- **Compendium, onglet Maîtrises** : une tuile par maîtrise (emblème, nom, question, les portraits de ceux qui la jouent), ouverte sur ses auras puis ses compétences (icône, nom, une ligne d'effet ; détail au survol). Dans l'onglet Auras et l'onglet Compétences (C1, C2), chaque brique nomme sa maîtrise (son emblème en petit) au lieu de sa famille de statut. La règle « Auras » disait : une par personnage sur le 1 de son dé, choisie au début d'une campagne ; les autres s'obtiennent en gravant (fausse depuis A2, 0.128.0 : la forge n'en ajoute jamais). La fiche d'un personnage (C6) nomme ses deux maîtrises sous son nom. _Depuis B3 et B4 : plus de porteurs dans l'onglet Maîtrises, plus d'onglet Auras (toutes les fiches dans Compétences ; la règle courte des auras en tête de l'encadré Auras de chaque maîtrise)._
- **Écran d'affrontement** (U5, agent Screens) : sous le nom, « Chasse · Sang » avec les deux emblèmes, à la place de « Elfe · Rôdeuse » (race et classe restent dans la fiche du compendium).
- **Livré (tranches F et G, agent MasteriesUI)** :
  - compendium : onglet **Maîtrises** entre Combattants et Compétences (`MasteriesSection.tsx`) : onze tuiles à gauche (emblème, nom, question, portraits des porteurs), la maîtrise ouverte à droite (emblème, question, phrase, « La jouent » en liens vers les fiches, puis les encadrés « Auras » et « Compétences » : sceau, nom en lien vers sa fiche, une ligne d'effet, l'infobulle de la compétence au survol, pastille « Aura » ou « Compétence » au lieu d'une face) ;
  - onglets Compétences et Auras : chaque brique nomme sa maîtrise avec son petit emblème (`MasteryName`) ; les auras sont rangées par maîtrise, dans l'ordre du registre ; la fiche porte « Aura · Lumière » ou « Compétence · Sang », en lien vers l'onglet Maîtrises. Le filtre cherche aussi la maîtrise. `familyLabel` et ses libellés de famille sont retirés de `statuses.ts` : la famille d'un statut ne s'affiche plus nulle part ;
  - texte de l'onglet Auras (tel que livré alors) : « Chaque combattant en porte une sur le 1 de son dé, choisie parmi celles de ses deux maîtrises au début d'une campagne ; les autres s'obtiennent en gravant. » Depuis A2 (0.128.0), la règle courte dit « choisie au départ. La forge n'en ajoute jamais. » ;
  - fiche d'un combattant : ses deux maîtrises sous son nom (liens), race et archétype gardés au-dessus ; le filtre des combattants cherche aussi les maîtrises ;
  - écran d'affrontement : la ligne « race · archétype » devient ses deux maîtrises, emblème (24 px) et nom ;
  - emblème : `MasteryIcon` (`Icon.tsx`) lit `mastery-<id>.png`, sinon l'initiale dorée dans un rond (aucun trou si un emblème manque) ; `SkillTooltip` reçoit `badge` (la pastille à la place de la face).
- **Écran de choix du champion de campagne** (U3, place prévue par Screens) : sous le dé de la fiche, une rangée « Aura de départ » : une tuile par aura de départ (icône peinte de l'aura, son nom, l'emblème de sa maîtrise en coin ; survol : son texte). La tuile choisie a le cadre à la couleur du camp ; le 1 du dé montre l'aura choisie. Choix mémorisé par champion (§ 11.2). Tuiles de contenu (comme les cartes de relique), pas des boutons de commande : le « Commencer » reste le bouton primaire du kit.
- **Écran de forge** : la carte Graver montre deux compétences côte à côte (chacune avec l'emblème de sa maîtrise) ; choisir l'une choisit la carte.
- **Images** (planches peintes et livrées le 2026-10-27 dans `src/assets/icons/`, consignes en anglais pour le gabarit de [STYLE_BIBLE.md](STYLE_BIBLE.md) § 7) : les onze emblèmes de maîtrise, un type d'icône à part (un emblème héraldique simple, plat, de face, sans cadre, silhouette épaisse, une couleur maîtresse par maîtrise, toutes différentes), fichiers `mastery-fury`, `mastery-blood`, `mastery-hunt`, `mastery-bulwark`, `mastery-retaliation`, `mastery-poison`, `mastery-chance`, `mastery-light`, `mastery-shadow`, `mastery-storm`, `mastery-song` ; les icônes des briques nouvelles, grammaire des compétences, **ids fixés** (ce sont aussi les ids des compétences à coder) : `lucky-streak` (Veine), `dread` (Effroi), `rancor` (Rancœur), `storm-field` (Champ d'orage), `ballad` (Ballade), `prayer` (Prière), `wither` (Flétrissure), `assault` (Assaut), `stone-fist` (Poing de pierre, statut `stoneFist` posé par la Peau de pierre), avec les deux pièces de CoinsRelics `lucky-coin` et `cursed-coin`. Le glob d'`Icon.tsx` les prend ; le nom entre dans `IconName` avec la brique qui le porte (tranches B, F, G). Jamais d'emoji : la brique n'entre au jeu qu'avec son icône.
- **Son** : rien de nouveau à décider, le son se déduit de l'effet ([SONS.md](SONS.md)) ; non vérifiable par l'agent.

## 13. Questions à l'utilisateur

Chacune a un choix par défaut, qui permet d'avancer. **Le parent a retenu tous les défauts le 2026-10-27** (Q1 à Q10), dont Brokk en Rempart et Sang, Morgrut avec l'Aura de puissance et l'attaque 6 à 8, le Dé pipé en aura et les noms du § 3.

| # | Question | Par défaut |
| --- | --- | --- |
| **Q1** (à toi) | Brokk : sa seconde maîtrise devient le **Sang** (Épines, Curée, Pourfendre, Plaie ouverte), au lieu des Représailles (Riposte, Rétribution) ? | Sang |
| **Q2** (à toi) | Morgrut : une aura sur le 1 comme tout le monde (Aura de puissance, attaque 7 à 9 → 6 à 8 : 49,5 %), sans compétence de personnage sur le 2 ; ou il reste le combattant nu ? | une aura sur le 1, face 2 nue |
| Q3 | La face 2 fixe (la compétence du personnage), et non au choix ? | fixe |
| **Q4** (à toi) | Dé pipé en aura (« +25 % de chances de faire pile ») : plus faible que la compétence d'aujourd'hui tant qu'on n'a qu'une pièce (borne +5,9 contre +11,9), il grandit avec chaque pièce. On le passe en aura ? | oui, en aura |
| Q5 | Graver à deux cartes (une par maîtrise), plutôt qu'une carte à la maîtrise tirée à pile ou face ? | deux cartes |
| Q6 | L'aura par défaut de Gorak : Ivresse du sang (50,8 %), plutôt que l'Aura de puissance (57,6 %, un duel à 66 % contre Ysolde) ? | Ivresse du sang |
| **Q7** (à toi) | Les onze noms et emblèmes du § 3, et les icônes des briques nouvelles du § 12 : les peins-tu ? | à peindre ; noms du § 3 |
| Q8 | La courbe des premiers combats (78, 86, 90 %) fait perdre 40 % des parties avant le 4e combat : on la garde ? | gardée |
| Q9 | La progression entre les parties par rangs de maîtrise (§ 8, P11) : après la vague 2 ? | après |
| Q10 | R5 : pas de relique d'entrée, sauf en pièce maîtresse avec prix ? | pas de relique |

## 14. Le plan de la vague 2

Tranches à confier chacune à un agent ; « dépend de » donne le seul ordre imposé. Chaque tranche : ses tests ciblés et `npx tsc --noEmit -p .` ; l'empreinte `balance.test.ts` n'est mise à jour qu'une fois, à l'intégration (tranche H).

| Tranche | Fichiers | Contrat (ce qu'elle expose) | Tests | Mesures | Dépend de |
| --- | --- | --- | --- | --- | --- |
| **État au 2026-10-27** | A, B et C **livrées** (agent MasteriesCore, mesures MasteriesMeasure) | — | verts : combat, audit, staging, states, wording, timing | A : empreinte identique ; B : § 4 bis (Aura de pourriture réglée, Dé pipé hors bande) ; C : `BALANCE_N=800` (`logs/balance/2026-10-27-11-32-35_v0.120.0.md`) : de 44,2 (Ysolde) à 55,2 % (Thaldrin), pire duel Aldric–Ysolde 62,6 % ; départs au § 5.2 | — |
| **A. Registre et catalogue** | `masteries.ts` (nouveau), `skills.ts` (nouveau), `roster.ts` (définitions déplacées, `masteries` sur chaque fiche ; `repertoire` et `reserve` gardés le temps de la tranche C) | `MASTERIES`, `MasteryId`, `masteryOfSkill`, `poolOf`, `SKILLS` ; `ALL_SKILLS`, `ENGRAVABLE_SKILLS` inchangés | `validateMasteries` : chaque gravable dans une maîtrise et une seule ; deux maîtrises distinctes par personnage ; V5 (Naraxes et Ervald, même réserve Poison) | empreinte **identique** (aucune règle ne change) | — |
| **B. Briques nouvelles et refaites** | `statuses.ts`, `skills.ts`, `combat.ts` (Dé pipé : `headsChance` d'un statut dans `tossCoin`), `hooks.ts` (accroches), `rules.ts` si une règle du compendium change | Veine, Effroi, Rancœur, Champ d'orage, Ballade, Prière, Flétrissure, Assaut, Poing de pierre (sur Peau de pierre), Plaie ouverte refaite, Dé pipé aura, Aura de pourriture au critique, Aura sauvage sans forme | une mécanique, un test dans `combat.test.ts` ; contrôle dans `audit.test.ts` pour `headsChance` d'un statut et le Poing qui part à l'armure vidée ; `wording.test.ts` | `scripts/skills.report.ts` (gravées, rangs) pour chaque brique : bande 8 à 20, rang 3 à 8 | A (catalogue) ; icônes (Q7) avant d'entrer au jeu |
| **C. Dés de départ** | `roster.ts` (`startAuras`, `signature` sur le 2, les dés du § 7, Aldric 5 à 6, Morgrut selon Q2), `character.ts` (`withStartAura`), `validateRoster`, `modules.test.ts` (dé vanilla figé) | `CharacterDef.masteries`, `startAuras`, `signature` ; `createCharacter(id, { aura })` ; `repertoire` et `reserve` retirés | dé vanilla de chacun ; chaque aura de départ est une aura de ses maîtrises | `BALANCE_N=800 npm run balance` (roster 42 à 58 %, aucun duel au-delà de 65/35) ; chaque aura de départ au laboratoire (série 70 à rejouer sur le registre) | A, B |
| **D. Offres** | `offers.ts`, `forge.ts`, l'écran de forge (agent des écrans) | `poolOf(championId)` ; `ForgeOffer` Graver `skills` (une ou deux) ; `autoForge` au hasard entre elles | Graver : une compétence par maîtrise quand les deux en ont ; le producteur d'abord ; une forge enregistrée se relit | `npm run ramp` (Elaria ≤ 58 % construite, écart premier − dernier, pentes), `npm run season` | A, C |
| **E. Campagne** | `campaign.ts` (run v5, `aura`, migration v4, référence partie de la même aura, héritage vérifié sur ce dé), `CampaignScreen.tsx` (rangée Aura de départ, mémorisée par champion) | `startRun(…, aura)`, `CampaignRun.aura`, clé des choix par champion | lecture d'une partie v4 ; héritage valide sur l'aura choisie ; le champion de référence porte l'aura | `npm run campaign` (boss atteint, acte gagné, chance avant combat, par aura de départ) | C ; U3 livré (agent Screens) |
| **F. Compendium** | `src/components/compendium/*`, `familyLabel` | onglet Maîtrises ; libellé de maîtrise sur chaque brique ; fiche : ses deux maîtrises | `screens.test.tsx` (onglet présent, aucune interaction ni purification citée) | une ou deux captures (Firefox sans interface) | A ; emblèmes (Q7) |
| **G. Affrontement** | l'écran d'affrontement (U5) | les deux maîtrises sous le nom, avec leurs emblèmes | test d'écran | une capture | A ; emblèmes |
| **H. Intégration et documents** | `package.json`, `CHANGELOG.md`, `docs/FEATURES.md`, `docs/ETAT.md`, `docs/PERSONNAGES.md`, ce document, `docs/README.md` | — | `npm run check`, `npx vite build`, empreinte `balance.test.ts` mise à jour une fois (`npx vitest run -u`), notée au CHANGELOG | balance, ramp, campaign, season, une fois chacun, avant → après | toutes |

## 15. Les mesures : méthode, rapports, limites

- **Outil** : le laboratoire (`npx vitest run --config vitest.balance.config.ts scripts/lab.report.ts --silent=false`, `LAB_SERIES`, `LAB_N=400`) ; idées dans `scripts/lab/ideas.ts`, séries 70 à 75 (statuts d'essai construits avec les crochets existants ; rien n'est livré au jeu).
- **Rapports** (`logs/lab/`) : série 70 `2026-10-27-10-48-35_v0.120.0.md` (sa ligne « Pourriture (coup) » est fausse, une aura d'essai manquante : reprise dans `…11-02-00…`) ; 71 `…10-48-02…` ; 72 `…10-47-57…` ; 73 `…10-47-17…` ; 74 `…10-50-25…` ; 75 `…10-52-02…` et 75 bis `…10-52-34…`. Les rapports de 10 h 39 et 10 h 44 sont **périmés** : ils ont tourné pendant que Fanchon était à 18,7 % (avant le Duo à trois charges), ce qui gonflait chaque taux d'environ 3 points.
- **Ce que mesure un départ** : un personnage modifié contre le roster nu d'aujourd'hui (ses adversaires gardent leur dé actuel). Quand cinq dés changent ensemble, le roster entier bouge : la vérité est le `npm run balance` de la tranche C.
- **Le code bougeait** : les mesures ont tourné pendant les retouches des agents EngineFixes (Poison en fin de tour, Critique assuré qui s'use, Riposte qui manque l'esquive, Clous de pavois, Duo à trois charges) et CoinsRelics (pièces, Pièce lestée, Sursis, initiative). Les écarts appariés (même graine, même code) tiennent ; les taux absolus sont à reprendre après l'intégration.
- **Pas mesuré** : la montée construite (Elaria, Ervald, Brokk, Thaldrin) avec les nouvelles réserves, Graver à deux cartes, la progression entre les parties, la relique « face 6 joue la 2 » ; tout ce qui est rendu (rien n'a été vu à l'écran) et le son.

## 16. Livré : offres et campagne (tranches D et E, 2026-10-27)

**D. Offres** (`offers.ts`, `forge.ts`, `ForgedDie.tsx`, la même voie en campagne et en saison) :
- la réserve d'un personnage est `characterPool` (ses deux maîtrises moins son dé, masteries.ts) ; `REPERTOIRES` est retiré ;
- `ForgeOffer` de Graver porte `skills` (une ou deux) ; `drawForgeOffer(base, steps, rng, pool, { focus, noNewSkill, groupOf })` tire une compétence par groupe (la maîtrise, `masteryOfSkill`), à l'écho dans son groupe, parmi les offrables (le producteur d'abord, inchangé) ; `stepOf(offer, face, to, skill)` ; `autoForge` tire l'opération, puis l'une des compétences au hasard (aucun tirage de plus quand Graver n'en a qu'une) ; `isOffered` vérifie un choix (saison, partie relue). Le pas choisi garde une compétence : journal, héritage et traces ne changent pas de forme ;
- l'écran de forge : la carte Graver à deux compétences s'élargit (520 px) et les montre côte à côte, chacune avec son sceau, son nom, l'emblème et le nom de sa maîtrise (`MasteryIcon`) et sa ligne ; choisir l'une choisit la carte (« Votre choix » si l'on prend l'autre que celle du combattant). Une carte Graver à une compétence nomme aussi sa maîtrise. Capture vue (Firefox, Gorak, Aura sauvage / Pourfendre) ;
- tests : `modules.test.ts` (une compétence par maîtrise offrable, dans l'ordre de ses maîtrises ; le producteur d'abord ; le pilote automatique grave dans les deux), `season.test.ts` (chaque compétence de la carte se choisit en saison).

**E. Campagne** (`campaign.ts`, `CampaignScreen.tsx`, `App.tsx`) : partie v5 (`aura`), lecture d'une partie v4, champion de référence parti de la même aura, héritage gardé s'il vaut sur le dé d'une de ses auras et trié au départ sur celui de l'aura choisie (`heritageFor`), rangée « Aura de départ » sur l'écran de choix du champion, mémorisée par champion ; sur la carte de l'acte, le départ se lit « Aura de départ » puis « Compétence ». Détail : [CAMPAGNE.md](CAMPAGNE.md) § 18.2. Capture vue (Elaria, Aura de précision mémorisée). `secondSkillOf` est retiré (la face 2 est la `signature`).

**Mesures** (une fois chacune, roster de la tranche C) :
- `npm run ramp` (`logs/ramp/2026-10-27-11-37-35_v0.120.0.md`, 48 builds, 60 combats par duel), à 10 récompenses, 0.118.1 → maintenant : **Elaria 62,4 → 60,7 %, au-dessus de la cible de 58** ; Fanchon 52,0 → 62,3 (pente +8,2), Gorak 50,8 → 57,4, Brokk 46,0 → 53,1, Aldric 55,6 → 52,1, Naraxes 56,8 → 49,7, Morgrut 45,0 → 44,2, Thaldrin 44,0 → 43,6, Ervald 45,8 → 40,3, Ysolde 41,7 → 36,6 ; écart premier − dernier 20,7 → 25,7 points ; pentes négatives 6 → 5 (Thaldrin −10,3, Ervald −5,8, Ysolde −4,6, Morgrut −4,5, Aldric −4,2). Le levier du § 8 (critique d'Elaria ×2,4 → ×2,2) n'est **pas appliqué** : il touche `roster.ts` et demande une balance et une montée de plus ; Fanchon (62,3 %) est désormais au-dessus d'Elaria ;
- `npm run season` (`logs/season/2026-10-27-11-38_saison.md`) : taux de saison 34–65 %, écart-type 8,6 → **41–58 %, écart-type 6,3** ; paires liées par build 4,82 → 3,85, gravures par build 1,27 → 1,28 ;
- `npm run campaign` : [CAMPAGNE.md](CAMPAGNE.md) § 18.3, « Les maîtrises » (boss atteint 13 → 16 %, acte gagné 7 → 9 % ; tous les départs de Thaldrin à 0 %).

## 17. Le réglage de la vague 2 (2026-10-27, agent Tuning)

Causes, essais et décisions : [PERSONNAGES.md](PERSONNAGES.md), « Le réglage de la vague 2 ». En bref :
- **Elaria** : son excès construit vient de ses reliques de critique (Contrepoids de plomb +16,1, Plume d'aigle +18,2 chez elle), que ses critiques assurés (Œil de faucon, Feinte) rendent gratuites ; **critique 15 % ×2,4 → 17 % ×2,2**.
- **Ervald** : **Vol de vie +2 → +4 PV** par coup drainé. **Ysolde** : **Purification 6 → 8 dégâts** sans bonus à retirer.
- **Fanchon : rien.** La Copie du Duo (+27,1, 15 builds sur 48) porte son excès ; elle est structurelle (copier double la fréquence du Duo). Duo plafonné à 3 : 58,9 % construite, mais le Duo aiguisé n'y vaut plus rien ; plafond relevé par le rang (équivalent : Duo non cumulable) : 60,8 %, Duo aiguisé +7,3 ; Soliste ×2 : 61,3 %. Aucune option ne tient ~59 % en gardant le rang du Duo sensible ; la Copie n'est pas touchée. Le Soliste reste ×3 (+7,6 dans ses builds, +10,6 gravé nu).
- **Thaldrin en campagne** : aucun défaut ; ses quatre départs partagent les graines de partie et de combat, et ce jeu de douze graines lui est défavorable (sur trois autres : 83-86 % estimés, 79-89 % gagnés ; [CAMPAGNE.md](CAMPAGNE.md) § 18.3).

**Mesures finales** (une fois chacune), avant → après :
- `BALANCE_N=800 npm run balance` (`logs/balance/2026-10-27-12-11-48_v0.120.0.md`) : 44,2–55,2 % → **46,0 % (Elaria) – 54,9 % (Thaldrin)** ; Ervald 44,4 → 47,5, Ysolde 44,2 → 48,1, Elaria 51,6 → 46,0, Fanchon 49,7 → 49,9 ; pire duel 62,6 → 59 % ;
- `npm run ramp` (`logs/ramp/2026-10-27-12-11-12_v0.120.0.md`), à 10 récompenses : Elaria 60,7 → **57,4**, Fanchon 62,3 → 62,2, Gorak 57,4 → 57,3, Ervald 40,3 → 43,3, Ysolde 36,6 → 37,7, Thaldrin 43,6 → 43,3 ; écart premier − dernier 25,7 → **24,5 points** ; Plume d'aigle chez Elaria +18,2 → +20,5 (au-dessus de la bande des reliques) ;
- `npm run season` (`logs/season/2026-10-27-12-11_saison.md`) : 41–58 %, écart-type 6,3 → **42–59 %, 5,7** ; Elaria 58 → 53 % ;
- `npm run campaign` (`logs/campaign/2026-10-27-12-17_campagne_12.md`) : boss atteint 16 → 15 %, acte gagné 9 → 9 %.

## 18. Les deux auras de la fiche (refonte des auras, 2026-10-28)

**Remplace la règle B5** (les auras de départ dérivées, `startAurasFor`) : chaque personnage a **deux auras nommées sur sa fiche** (`CharacterDef.auras`), la première sur le 1 de son dé vanilla, chacune d'une de ses maîtrises et **servie par son dé de départ** (`auraServed` : le producteur d'abord, la même règle que l'offre). `validateRoster` vérifie les deux. La campagne laisse choisir, le tournoi et la saison tirent une des deux ; une partie, un tournoi ou une saison partis d'une aura qui n'est plus sur la fiche repartent de la première. Paires : Gorak Ivresse du sang / Élan ; Elaria Visée / Plaie ouverte ; Brokk Aura d'épines / Bastion ; Ervald Aura de poison / Effroi ; Ysolde Aura de sainteté / Jugement ; Naraxes Aura de décoction / Dé pipé ; Aldric Vindicte / Larcin ; Morgrut Aura de puissance / Rancœur ; Thaldrin Ciel d'orage / Brasier ; Fanchon Ballade / Veine. Détail : [REFONTE_AURAS.md](REFONTE_AURAS.md) § 11.

### État des lieux après la refonte (registre `MASTERY_SKILLS`, recompté le 2026-10-28, tranche 8)

Une **aura** pose sur son porteur un statut permanent (`isAura`) ; tout le reste est une **compétence**, les compétences à charges sorties des auras comprises. **20 auras et 51 compétences, 71 briques** (avant la refonte : 33 auras et 44 compétences, 77). Des 33 auras, 16 sortent (4 deviennent des compétences à charges : Sangsue, Peau de crapaud, Sentence, Bouclier de foi ; 3 des reliques : Immunité, Emprise, Surtension ; 9 sont retirées) et 3 entrent (Bastion, Jugement, Brasier) ; les compétences gagnent ces 4 et les 3 pièces de la Chance.

| Maîtrise | Porteurs | Auras | Compétences | Total | Les auras |
| --- | --- | --- | --- | --- | --- |
| Fureur | Gorak, Morgrut | 2 | 6 | 8 | Aura de puissance, Élan |
| Sang | Gorak, Elaria, Brokk | 3 | 6 | 9 | Ivresse du sang, Aura d'épines, Plaie ouverte |
| Rempart | Brokk, Aldric, Morgrut | 3 | 5 | 8 | Vindicte, Rancœur, Bastion |
| Poison | Ervald, Naraxes, Thaldrin | 2 | 6 | 8 | Aura de décoction, Aura de poison |
| Chance | Elaria, Naraxes, Fanchon | 3 | 9 | 12 | Dé pipé, Visée, Veine |
| Lumière | Ysolde | 2 | 7 | 9 | Aura de sainteté, Jugement |
| Ombre | Ervald, Aldric | 2 | 6 | 8 | Effroi, Larcin |
| Magie | Ysolde, Thaldrin, Fanchon | 3 | 6 | 9 | Ciel d'orage, Ballade, Brasier |

Les compétences, par maîtrise : **Fureur** Furie des vents, Coup de massue, Brise-garde, Assaut, Soliste, Crescendo ; **Sang** Sangsue, Pourfendre, Curée, Hémorragie, Serment de sang, Odeur du sang ; **Rempart** Peau de pierre, Rancune, Rétribution, Riposte, Onde de choc ; **Poison** Peau de crapaud, Souffle de la tombe, Virulence, Récolte, Pièce vert-de-gris, Morsure ; **Chance** Pile ou face, Pièce porte-bonheur, Pièce maudite, Pièce de bouclier, Pièce de la rafale, Pièce ensorcelée, Coup de chance, Œil de faucon, Esquive améliorée ; **Lumière** Sentence, Bouclier de foi, Purification, Prière, Siffloter, Dîme, Flamme votive ; **Ombre** Vol de vie, Peur, Confiscation, Malchance, Flétrissure, Fausse note ; **Magie** Feux follets, Foudre, Embrasement, Attiser, Éclair aveuglant, Duo.

**Ce que le compte montre** : chaque maîtrise garde 2 ou 3 auras (deux par fiche, une de chacune de ses maîtrises : 20 pour 10 personnages) ; l'écart des tailles s'ouvre (8 à 12 briques, 9 en moyenne) : la Chance reçoit les trois pièces de Naraxes (A14), la Fureur, le Rempart, le Poison et l'Ombre retombent à 8, sous la cible de 9 à 10 du § B6. Aucune aura ne s'ajoute en partie (A2) : les auras d'une maîtrise sont celles des fiches, et une maîtrise ne s'enrichit plus que par ses compétences.
