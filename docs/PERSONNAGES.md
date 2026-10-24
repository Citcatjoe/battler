# Personnages

Ce document garde la trace de la philosophie de chaque personnage et des décisions de game design qui le concernent. La **fiche courte affichée en jeu** (accroche, background, forces, faiblesses) vit dans `src/game/roster.ts` (`lore`) ; elle est présentée dans le compendium, verticale Personnages. Ce document en est la version longue et la justification.

_Chiffres mesurés en 0.17.0 (8 personnages), sur 6 000 combats par paire, côtés alternés._

---

## Un personnage par famille (0.43.0)

**Décision de l'utilisateur** (2026-10-19) : avec vingt personnages, un jumeau de coloris pour chacun n'apportait plus assez. Il compliquait le processus créatif (deux noms, deux fiches, deux équilibrages pour une seule image). Chaque famille garde son **personnage principal** : son nom, son image, ses postures et sa fiche. Elle garde aussi, des deux, **les statistiques les plus pertinentes**. Les jumeaux disparaissent du jeu ; leurs sections ci-dessous restent pour l'historique.

**Méthode** : chaque candidat (le principal avec ses statistiques, A, ou avec celles de son jumeau, B) a affronté les neuf autres principaux, sur 400 combats par duel. On garde celui qui est le plus proche de 50 %, avec les duels les plus resserrés, sans sacrifier ce qui type le personnage. L'ensemble a ensuite été vérifié sur le roster entier.

| Famille | A (principal) | B (jumeau) | Retenu |
| --- | --- | --- | --- |
| Gorak | 46,8 %, de 41 à 51 % | Murzug : 50,4 %, de 46 à 57 % | **B** : 57 PV, 18 % de critique, Rage du sang à 5 PV |
| Elaria | 49,6 %, de 40 à 62 % | Sylwen : 49,4 %, de 42 à 57 % | **B** : 50 PV, 26 % d'esquive, 17 % de critique ×2,4 |
| Brokk | 51,1 %, Ysolde à 26 % | Grimbald : 51,2 %, de 42 à 61 % | **B** : d10, 57 PV, 10 % de critique |
| Ervald | 46,7 %, de 39 à 54 % | Caldrec : 48,8 %, de 46 à 53 % | **B** : d10, sans armure, 56 PV, 16 % de critique |
| Ysolde | 50,7 % | Bérengère : 49,7 % ; 44,6 % sur le roster entier | **A** |
| Naraxes | 53,6 %, de 42 à 63 % | Ssythra : 52,9 %, Ysolde à 68 % | **A** |
| Aldric | 52,7 %, de 39 à 61 % | Gauvain : 50,1 %, de 37 à 58 % | **B** : 54 PV, 7 % d'esquive, 17 % de critique |
| Morgrut | 47,7 %, de 38 à 57 % | Gnashka : 49,0 % | **A** : le d14 sans critique est sa signature |
| Thaldrin | 53,0 %, de 39 à 62 % | Brannoc : 52,3 %, de 37 à 64 % | **A** |
| Fanchon | 50,2 % | Mélisande : 50,9 % | **A** |

**Roster entier** (0.43.0, 400 combats par duel) : de 45,8 % (Ysolde) à 51,4 % (Brokk). Sept contres connus disparaissent. Restent Brokk contre Fanchon (65/35, à la limite) et Naraxes contre Ysolde (62/38).

---

## Le d6 imprimé (0.105.0)

**Règles v2** (2026-10-23) : tout le roster lance un d6. Le kit tient en deux compétences, sur les faces 1 et 2 ; les faces 3 à 6 sont des coups, qui frappent pour leur **valeur imprimée** (`strikes`) et non pour leur numéro. La troisième compétence quitte le kit : elle reste au personnage, « hors kit » (`reserve`), au compendium, à la gravure et en tête de son répertoire de campagne. Les valeurs imprimées des faces de compétence qui sacrifient le coup (3, ou 2 pour Ysolde) ne servent qu'aux coups bruts de la Furie et en campagne, quand la signature seule libère la face.

Mesuré à 800 combats par duel (`BALANCE_N=800 npm run balance`), avant (0.104.1) → après :

| Personnage | Face 1 | Face 2 | Faces 3 à 6 (valeurs imprimées) | Hors kit | Autre changement | Taux avant → après |
| --- | --- | --- | --- | --- | --- | --- |
| Gorak | Pourfendre (frappe pour 4) | Furie des vents | 5, 5, 6, 7 | Aura de puissance | d9 → d6 | 51,0 → 48,7 % |
| Elaria | Œil de faucon | Esquive améliorée | 5, 6, 6, 7 | Aura de précision | d8 → d6 ; **53 PV (50)** | 47,3 → 49,2 % |
| Brokk | Peau de pierre | Épines acérées | 7, 7, 8, 10 | Aura d'intimidation | d10 → d6 | 47,4 → 49,9 % |
| Ervald | Vol de vie | Aura glaciale | 6, 6, 7, 9 | Souffle de la tombe | d10 → d6 | 53,9 → 49,3 % |
| Ysolde | Purification | Aura de sainteté | 6, 7, 7, 8 | Peur | d7 → d6 | 43,9 → 50,9 % |
| Naraxes | Pile ou face | Aura de décoction | 6, 7, 7, 8 | Coup de chance | d10 → d6 | 53,7 → 50,7 % |
| Aldric | Rétribution | Riposte | 4, 5, 6, 7 | Aura d'immunité | d8 → d6 | 53,9 → 50,2 % |
| Morgrut | Attente (une seule face, sur le 1) | coup 7 | 8, 9, 10, 11 | — | d14 et trois Attentes → d6, une Attente | 47,4 → 51,4 % |
| Thaldrin | homme : Foudre sur 1, 2, 3 ; Feux follets sur 4, 5, 6 | — | ours : 3, 4, 5, 6, 7, 8 (+3 Force de l'ours) | Aura sauvage | d10 (d3 en homme) → d6 | 49,4 → 51,6 % |
| Fanchon | deux d6, doubles 1 à 5 inchangés | double 6 : aucune compétence (deux coups de 4) | chaque dé : 1, 2, 3, 4, 5, 4 | — | deux d5 → deux d6 | 52,1 → 48,2 % |

**Les 3 PV d'Elaria, dernier levier.** Son duel contre Aldric penche parce que la Rétribution relâche ses critiques. Les leviers de compétence ont été essayés d'abord. Morgrut garde une seule Attente : deux (PROGRESSION § 6.7) le laissaient trop prévisible contre l'esquive d'Elaria.

**Duels les plus déséquilibrés** (800 combats) : aucun au-delà de 65/35.
- Aldric contre Thaldrin, 35,9 % : la Foudre et les brûlures ne remplissent pas les jauges de Rétribution, qui ne stockent que les coups ; sans Rétribution, Aldric tomberait à 15 %.
- Aldric contre Elaria, 63,4 % : la Rétribution relâche ses critiques.
- Elaria contre Ysolde, 36,8 %.
- Brokk contre Fanchon, 62,9 %.
- Elaria contre Morgrut, 62,0 %.

Les deux contres connus (Brokk–Fanchon, Naraxes–Ysolde) sont revenus sous 63 % et quittent `balance.test.ts`.

**Leviers essayés et écartés** (essai jetable) :
- Rétribution à deux jauges : Aldric contre Elaria de 64,8 à 58,0 %, mais Aldric contre Fanchon tombe à 31,6 % (les petits coups de la barde remplissent mal deux jauges).
- Critique d'Elaria à 12 % : sans effet sur le duel.

---

## L'attaque de base (0.106.0)

**Règles v2, phase 5 bis** (décisions de l'utilisateur du 2026-10-23, [RESOLUTION.md](RESOLUTION.md) § 3 bis) : chaque personnage a une **attaque**, une petite fourchette (`attackMin` à `attackMax` : un écart de 2 au plus pour tous, `validateRoster` en tolère 3 pour une exception d'identité) et un **type** de coup (`attackKind`) : DM (magique) pour Ysolde et la forme humaine du druide, DP (physique) pour tous les autres. Le type ne compte que pour l'étiquette et les bonus par type (aucun aujourd'hui). Chaque jet porte un **coup de base**, tiré dans la fourchette, avec toute la chaîne d'un coup (esquive, critique, modificateurs, armure, boucliers, réactions). Le dé ne fait plus de dégâts : il désigne une face. Une face nue ne porte que le coup ; une face de compétence **greffe** sa compétence (par défaut : ses effets, puis le coup), la **modifie** (Pourfendre, Pile ou face) ou la **remplace** (Furie des vents, Coup de chance, Crescendo, Soliste). Les valeurs imprimées de la 0.105.0 et l'Attente de l'ogre sont retirées.

Mesuré à 800 combats par duel (`BALANCE_N=800 npm run balance`), 0.105.0 → 0.106.0 :

| Personnage | Attaque | Type | PV | Changements | Taux | Tours par combat | Pire et meilleur duel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gorak | 5 à 6 | DP | 57 | Pourfendre modifie, Furie des vents remplace | 48,7 → 50,5 % | 15,8 → 14,9 | Elaria 44 %, Ysolde 56 % |
| Elaria | 4 à 5 | DP | 53 | esquive 26 → 22 %, critique 17 → 15 % | 49,2 → 48,9 % | 20,4 → 18,0 | Ysolde et Aldric 42 %, Morgrut 62 % |
| Brokk | 5 à 6 | DP | 57 | critique ×2,5 → ×2,2 | 49,9 → 51,5 % | 18,1 → 17,0 | Naraxes 46 %, Fanchon 57 % |
| Ervald | 4 à 6 | DP | 56 | aucun | 49,3 → 49,8 % | 18,7 → 17,9 | Naraxes 41 %, Morgrut 57 % |
| Ysolde | 4 à 6 | DM | 52 | aucun | 50,9 → 49,1 % | 20,7 → 18,5 | Gorak et Morgrut 44 %, Elaria 58 % |
| Naraxes | 4 à 5 | DP | 50 | Pile ou face modifie (pile : ce coup ×2), Coup de chance remplace | 50,7 → 52,2 % | 16,1 → 15,1 | Thaldrin 49 %, Ervald 59 % |
| Aldric | 3 à 5 | DP | 54 | aucun | 50,2 → 50,3 % | 15,4 → 14,6 | Thaldrin 43 %, Elaria 58 % |
| Morgrut | 7 à 9 | DP | 63 → 59 | plus d'Attente, six faces nues | 51,4 → 48,8 % | 16,4 → 15,1 | Elaria 38 %, Thaldrin 59 % |
| Thaldrin | 3 à 4 (homme DM ; ours DP, +3 de la Force de l'ours) | DM / DP | 56 | Foudre 3×2 → 3×1 | 51,6 → 49,4 % | 16,1 → 15,4 | Morgrut 41 %, Aldric 57 % |
| Fanchon | 2 à 4, deux coups (deux dés) | DP | 46 | critique 5 → 10 %, Crescendo ×4 et Soliste ×5 (un coup de base à la place des deux) | 48,2 → 49,5 % | 14,0 → 13,1 | Brokk 43 %, Ervald et Ysolde 55 % |

**Ordre des leviers** ([EQUILIBRAGE.md](EQUILIBRAGE.md) § 5). Les compétences deviennent gratuites : un jet de compétence ne sacrifie plus son coup. D'abord les valeurs des compétences (la Foudre, qui gagnait un coup de base en plus de ses trois éclairs, passe à 3×1 ; Crescendo et Soliste réglés sur un coup de base), puis l'attaque et les stats secondaires (Elaria, Brokk, Fanchon), les PV en dernier : Morgrut seul, sans compétence ni critique, n'avait pas d'autre levier que son attaque, déjà la plus forte (7 à 9).

**Durée** : 17,2 → 16,0 tours par combat en moyenne (−7 %), soit environ 8,6 → 8,0 tours par combattant. La baisse est légère : aucune compensation par le contenu n'a été jugée nécessaire.

**Duels les plus déséquilibrés** (800 combats) : aucun au-delà de 65/35.
- Elaria contre Morgrut, 61,9 % : l'ogre n'esquive pas et ne vise pas ; elle esquive un coup sur cinq.
- Ervald contre Naraxes, 40,8 %.
- Morgrut contre Thaldrin, 58,8 %.
- Elaria contre Ysolde, 42,0 %.
- Aldric contre Elaria, 57,8 %.

**Valeurs nettes** : toutes positives (l'Attente valait −3,7 et les Feux follets −3,1 en 0.105.0). Les plus fortes : Aura de décoction +41,8, Rétribution +38,7, Feux follets +36,1, Aura de sainteté +32,6. Les doubles de la barde restent petits (de +2,2 à +5,3), Ouverture +26,1.

---

## Personnalité (2026-10-20)

**Décision de l'utilisateur** : la personnalité d'un personnage passe en premier. Description, style de combat, postures et compétences en découlent. Ce n'est ni un lore profond ni la fiche affichée en jeu (`lore` dans `roster.ts`) : c'est une courte description du personnage et de son archétype, qui relie un background léger à son style de combat et sert de base aux futures compétences, postures et personnages. Elle n'a pas à justifier chaque compétence, ni l'inverse.

Chaque fiche ci-dessous l'ouvre en trois points : **qui il est**, **comment il se bat**, **pistes** (idées non mesurées). Trois motifs reviennent et peuvent servir à de futurs personnages : **la foule** (Gorak et Fanchon jouent pour le public), **le hasard** (Naraxes le cherche, Morgrut le subit) et **le temps** (Brokk, Ervald et Ysolde gagnent quand le combat dure).

---

## Principes du roster

1. **Une race = un archétype de combat lisible.** On doit pouvoir dire en une phrase *comment il gagne* et *comment il perd*.
   - **Orc** : encaisser, avec beaucoup de PV et un gros dé, mais aucune défense active ; et déferler, avec des actions à deux coups.
   - **Elfe** : éviter et punir, avec l'esquive et les critiques, mais peu de PV et un petit dé.
   - **Nain** : user l'adversaire, avec le plus gros réservoir de PV, l'armure temporaire, les épines et des critiques rares mais lourds. Les nains n'ont plus d'armure passive depuis la 0.24.1.
   - **Humain** (0.30.0) : contrôler, avec un petit dé et des compétences sur 3 jets sur 7 (peur, purification, soin).
   - **Homme-lézard** (0.30.0) : tenter sa chance, avec l'esquive, le poison et des coups de dés à double tranchant.
   - **Mort-vivant** : affliger et drainer, c'est-à-dire ronger l'adversaire avec le poison, qui ignore l'armure, et lui voler sa vie.
2. ~~**Une variante = la même race, une autre façon de jouer.**~~ (retiré en 0.43.0 : un personnage par famille, voir plus haut) Elle garde l'image (teintée en CSS) et les **compétences de sa race**, et décale 2 ou 3 stats dans une direction claire (plus offensive, plus régulière…). Les écarts restent petits.
3. **Les compétences prolongent l'identité de la race.** Elles se déclenchent sur les deux pires jets : la malchance devient un petit moment de gloire, propre à chaque race. Sur un **1**, la compétence d'origine (soin, critique, bouclier, poison). Sur un **2** (0.25.0, compétences données par l'utilisateur), une compétence qui prépare le tour suivant : Furie des vents, Esquive améliorée, Épines, Vol de vie. Sur un **3** (0.26.0, données par l'utilisateur), une **aura permanente** pour le reste du combat : puissance, précision, intimidation, poison. Trois compétences par race dépassent le plafond de 2 fixé en 0.20.1 : c'est un choix de l'utilisateur, et le plafond est à reformuler (voir STATUTS.md).

   **Les jets de 1, 2 et 3 n'infligent plus de dégâts (0.27.0, demande de l'utilisateur).** Ils servent seulement à déclencher la compétence du chiffre (`forfeitsHit` sur les douze compétences) : aucun dégât, ni esquive ni critique. Un personnage ne frappe donc jamais pour 1, 2 ou 3. Ce sont 3 jets sur 8 pour un d8, et 3 sur 10 pour un d10 : les petits dés y perdent davantage.

   **Réglage 0.27.0** : sans compensation, Brokk tombait à 37,6 % et Caldrec montait à 59 %. Nouveaux PV : Gorak 61 (Murzug 57), Elaria 50 (Sylwen 52), Brokk 83 (Grimbald 65), Ervald 62 (Caldrec 57). Les taux de victoire vont de 47,8 % à 52,2 %, et le duel le plus déséquilibré est Ervald contre Elaria (59/41). Les combats durent plus longtemps : de 21 à 32 tours en moyenne. Les mesures par personnage ci-dessous datent de la 0.26.0, sauf mention contraire. Brokk à 83 PV a été jugé réducteur : voir le réglage 0.28.0 ci-dessous.

   **Réglage 0.28.0, par les compétences** (méthode : [EQUILIBRAGE.md](EQUILIBRAGE.md)) : les PV reviennent près de l'identité de chaque race (Gorak 61, Murzug 57, Elaria 48, Sylwen 50, Brokk 68, Grimbald 57, Ervald 58, Caldrec 56). Les écarts se règlent par les compétences : Rage du sang 5 → 3 PV, Peau de pierre +4 → +6, auras d'intimidation et de précision cumulables, et 10 % de critique pour Grimbald. Résultat : de 47,4 à 51,8 % de victoires, pire duel 42/58. La matrice en fin de document est celle de la 0.28.0.
   - **Compétences et palette (cadre décidé en 0.20.1).** Les compétences appartiennent aux personnages ; les statuts qu'elles posent sont des règles neutres (voir [STATUTS.md](STATUTS.md#statut-et-compétence--deux-notions-séparées)). Chaque race a une palette de 2 ou 3 statuts. Cible par personnage : **1 passif de race** (identité commune à l'original et à ses variantes) et **2 compétences au plus**, dont une peut être propre à la variante (style de jeu).
4. **Budget d'équilibre** : chaque personnage gagne entre 42 et 58 %, aucun duel au-delà de 65/35 (test automatique), avec une zone de confort de 45 à 55 %. On veut des personnages typés, pas des clones. Les PV sont le dernier levier d'équilibrage : voir [EQUILIBRAGE.md](EQUILIBRAGE.md).
5. **Fiche en jeu courte** : une accroche, 2 ou 3 phrases de background (240 caractères au plus), 1 à 3 forces et 1 à 3 faiblesses. `validateRoster` vérifie ces limites.
6. **Univers** : des noms et des lieux inventés (Kar-Dush, Lithmeren, Durnhold, Ostremort), sans référence à des œuvres existantes.
7. **Sélection** (0.43.0) : un rail de dix cartes au centre de l'accueil, comme le tableau d'un jeu de combat. Le camp actif choisit, puis la main passe en face (`RosterRail`, `StartScreen.tsx`, retirés en 0.100.0 : le duel se choisit sur l'écran d'affrontement, une rangée de portraits sans nom, `FighterPicker`). Avant, il y avait une colonne par famille et deux tuiles par colonne, de chaque côté.
8. **Nature des compétences** (0.39.1, classement de l'utilisateur) : chaque compétence déclare sa `nature`, qui colore seulement sa carte (aucun effet sur le combat). **Martiale** : la force du corps ou de l'arme (orcs, nains, Riposte, la forme d'ours du druide). **Adresse** : l'agilité, la précision, la ruse, la chance (elfes, hommes-lézards ; l'Aura de décoction, poison enduit sur la lame, en fait partie). **Arcane** : la magie, la foi, la nature, la mort (morts-vivants, Ysolde, Rétribution et Aura d'immunité d'Aldric, forme humaine du druide, Aura de pourriture). **Neutre** : ni l'un ni l'autre (l'Attente de l'ogre). Une variante hérite de la nature de la compétence de son original.

---

## Orcs : encaisser

**Compétence du 1 : Pourfendre** (0.70.0, à la place de la Saignée). Le 1 n'est plus sacrifié : c'est un vrai coup, qui frappe pour sa valeur (Aura de puissance et critique compris), et **s'il touche**, il ouvre une plaie : Saignement 2, qui coule à partir du coup suivant (2 puis 1 PV). Esquivé, il ne pose rien : un coup doit toucher pour poser un malus physique. Voir plus bas, « 0.70.0, Pourfendre ».

**Saignée** (0.68.0 à 0.69.0) : sur un 1, sans coup, Saignement 2 sur l'adversaire. Voir plus bas, « 0.68.0, Saignée ».

**Rage du sang** (retirée en 0.68.0) : +3 PV, sans dépasser le maximum (+5 avant la 0.28.0, et +5 pour Gorak depuis la 0.43.0). Le jet le plus faible devenait du soin : l'orc, qui n'esquive pas, compensait par de l'endurance. C'était la compétence la plus modeste du roster (valeur nette d'environ +2 à +3 points, +5,8 en 0.67.3 avec 5 PV).

**0.36.5, une Rage du sang propre à Murzug** (audit des compétences, `docs/SORTS.md` § 8) : elle ne lui valait que +0,6 point, contre +2,0 pour Gorak. Avec moins de PV et des coups plus forts, 3 PV ne comptaient presque pas pour lui. Murzug soigne désormais 5 PV (compétence `blood-rage-murzug`) : valeur nette +4,2 points, Murzug de 49,7 à 51,7 %. Gorak garde 3 PV (+1,0 point mesuré, dans le bruit). C'est la première compétence propre à une variante : Gorak et Murzug commencent à se distinguer par leur kit, pas seulement par leurs stats.

**Compétence du 2 : Furie des vents** (instantanée depuis la 0.50.0, en coups bruts depuis la 0.69.0). Sur un 2, l'orc frappe deux fois tout de suite, dans la même action. Ce sont des **coups bruts** : leur dé ne donne que leur valeur, un 1, un 2 ou un 3 frappe pour sa valeur, sans déclencher de compétence, donc sans Furie en chaîne. Chaque coup est résolu à part : esquive, critique, armure. Environ 0,9 Furie par combat (0.69.0). Voir plus bas, « 0.69.0, Furie en coups bruts ».

**Compétence du 3 : Aura de puissance** (💪 permanente, cumulable). Chaque coup inflige 2 de plus par charge, avant l'armure : un 10 fait 12, puis 14 après un second 3. Le bonus s'ajoute après le critique et vaut pour chacun des coups d'une Furie des vents. Il est réduit par l'Aura d'intimidation d'un nain. Les orcs l'obtiennent dans environ deux combats sur trois, avec 1,5 charge en moyenne une fois obtenue. « Un peu cheaté, mais c'est l'orc » : le cumul est voulu.

### Gorak · Brute

> « Le roc des fosses de Kar-Dush. »

**2026-10-23, le d6 imprimé (0.105.0)** : Pourfendre (frappe pour 4) et Furie des vents, coups de 5, 5, 6, 7 ; Aura de puissance hors kit. 51,0 → 48,7 %. Voir « Le d6 imprimé ».

**2026-10-23, l'attaque de base (0.106.0)** : attaque 5 à 6 (DP), 57 PV ; Pourfendre modifie son coup de base (Saignement 2 s'il touche), la Furie des vents remplace le coup du 2 par deux coups de base, chacun avec son dé. 48,7 → 50,5 %, 15,8 → 14,9 tours par combat. Voir « L'attaque de base ».

**Personnalité : le champion des fosses.**
- **Qui il est** : un vétéran des combats d'arène, fier, qui joue pour le public. Il paraît calme et sûr de lui, mais la colère monte à chaque coup reçu (choix de 2026-10-20 entre le « calme » de son image et le « coup manqué l'énerve » de sa fiche : l'un mène à l'autre).
- **Comment il se bat** : de face, sans rien esquiver, parce qu'esquiver serait honteux devant la foule. Même son coup le plus maladroit pourfend et ouvre une plaie que ses rafales feront couler devant le public (Pourfendre, 0.70.0 ; Saignée en 0.68.0 ; avant, la douleur le soignait : Rage du sang), et quand il s'emballe, les coups partent par deux (Furie des vents).
- **Pistes** : être plus fort à mesure qu'il perd des PV, ou réagir à la foule. Il fait un lien naturel avec le jeu des parieurs.

- **Fantasy** : le champion des fosses, lent et inébranlable. C'est la référence de l'orc, et l'unité de taille du jeu (`scale: 1`).
- **Stats** (0.43.0, celles de Murzug) : PV 57, d9 depuis la 0.69.0 (d8 de la 0.50.0 à la 0.68.3), armure 0, esquive 5 %, critique 19 % ×2 (18 % avant la 0.69.0) ; Pourfendre (coup, puis Saignement 2 s'il touche) depuis la 0.70.0, Saignée en 0.68.0 et 0.69.0, Rage du sang à 5 PV avant. Jusqu'à la 0.42.0 : PV 61, critique 10 %, Rage du sang à 3 PV.
- **Comment il gagne** : ses PV absorbent les pics de dégâts, et son d10 frappe régulièrement fort.
- **Comment il perd** : il prend tous les coups, et n'a aucune réponse face à l'usure du nain.
- **Mesures** : 50,0 % de victoires (0.26.0), environ 19 tours par combat. Duels les plus durs : les elfes (44 % contre Elaria, 45 % contre Sylwen).
- **Décisions** :
  - Il a beaucoup de PV parce qu'il n'a aucune défense active : les PV sont sa défense. Depuis la 0.24.1, Brokk en a davantage, pour compenser son armure perdue.
  - Il ne critique que rarement (10 %) : son danger vient de la régularité du d10, pas des pics.

### Murzug · Berserker (variante de Gorak) · retiré en 0.43.0

> « Il compte les cicatrices, pas les coups reçus. »

- **Fantasy** : l'orc banni, plus fou que solide. Il mise tout sur les pics de dégâts.
- **Écarts avec Gorak** : PV −4 (57), critique +8 points (18 %).
- **Teinte** : peau rougeâtre et saturée (`hue-rotate(-75deg)`), pour évoquer les peintures de guerre.
- **Mesures** : 48,5 % de victoires (0.26.0), environ 18 tours par combat. Il souffre contre les elfes (43 % contre Elaria, **40 % contre Sylwen, à la limite du budget**), dont l'esquive gâche ses coups renforcés, mais il bat Ervald (59 %).
- **Décisions** :
  - On échange de l'endurance contre des pics, en gardant la même lecture de l'orc : pas de défense.
  - Il est légèrement au-dessus de Gorak, ce qui reste dans le budget. À surveiller si un futur événement profite aux critiques.

---

**0.46.0, Furie des vents cumulable** (demande de l'utilisateur) : chaque 2 ajoute une charge, sans durée ; chaque action en dépense une (deux coups), les autres restent en réserve. Valeur nette +6,9 → +7,1 : il faut un 2 pendant la rafale pour en avoir deux. Gorak de 49,8 à 50,4 %.

**0.50.0, Furie des vents instantanée** (demande de l'utilisateur) : le 2 tombe, et Gorak frappe deux fois tout de suite, dans la même action ; un 2 pendant ces coups relance la Furie (3 fois au plus). Sans compensation, Gorak montait à 64 % (deux coups de d4 au lieu de son dé : encore 58 %) : son **dé passe de d10 à d8**, et Gorak revient à 50,9 %. La Furie vaut désormais +27,7 points : elle est le cœur de l'orc. Ses combats se décident plus vite (retours de 64 à 59 %).

**0.68.0, Saignée** (demande de l'utilisateur : introduire le saignement sans nouveau personnage, en favorisant les synergies). Sur un 1, Saignement 2 sur l'adversaire au lieu de +5 PV. Le Saignement compte les coups, et Gorak est celui qui en porte le plus par action : sa Furie des vents vide la plaie dans la même rafale. Mesures (400 combats par duel, même graines avant et après) :
- valeur nette +3,3 points, contre +5,8 pour la Rage du sang à 5 PV ; Gorak 50,9 → **47,9 %**, dans le budget, combats plus courts (19,0 → 17,1 tours) ;
- duels qui bougent : Ysolde 58,8 → 62,3 %, Fanchon 47 → 42 %, Morgrut 54 → 48 %, Aldric 46 → 40 % (l'Aura d'immunité bloque la plaie), Brokk 51 → 47 % (ses Épines acérées le font saigner à son tour) ;
- Saignée 3 mesurée : 54,5 %, mais 71,5 % contre Ysolde, hors budget ; Saignée 4 : 60,1 %.
- La première mesure au laboratoire (−0,6 point) était fausse : l'imitation du statut laissait une charge fantôme qui gonflait chaque plaie posée par-dessus (SORTS.md § 14).

**0.69.0, Furie en coups bruts** (demande de l'utilisateur). Les deux coups de la Furie ne déclenchent plus de compétence : leur dé ne donne que leur valeur. Avant, 36,5 % des coups de Furie tombaient sur un 1, un 2 ou un 3 et étaient sacrifiés, et 22,5 % des Furies en relançaient une autre (jusqu'à trois). Au d8, Gorak tombait à 39,8 % ; compensation : **d9 et 19 % de critique** (variante choisie par l'utilisateur, 18 % recommandés). Mesures (400 combats par duel) : Furie des vents +18,6 points (+27,7 en 0.50.0) ; Gorak 47,9 → **49,4 %** ; duels qui bougent : Ysolde 62 → 59 %, Ervald 45 → 43 %, Fanchon 42 → 47 %.

**0.70.0, Pourfendre** (proposition de l'utilisateur : « l'orc doit donner un coup pour appliquer un saignement »). Le 1 devient un vrai coup qui, s'il touche, pose Saignement 2 (version la plus forte des deux proposées, choisie par l'utilisateur ; règle `needsTouch` : un coup doit toucher pour poser un malus physique). Mesures (400 combats par duel) :
- valeur nette **+5,0** points ; Gorak 49,4 → **51,1 %** ; ses duels de 47 % (Ervald) à 60 % (Ysolde) ;
- Gorak ne sacrifie plus que 18 % de ses jets (37 % avant) : seuls le 2 et le 3 restent des jets de compétence sans dégâts ;
- variantes : Saignement 1, 47,8 % ; Saignement 3, 55,5 % (Ysolde 63 %). Posée même sur une esquive, la version 2 montait à 51,9 % : la règle « s'il touche » coûte 0,8 point.

## Elfes : éviter et punir

**Image** : `elf.png`, une chasseresse de la nuit qui bande son arc en croissant de lune, en bleu nuit et argent (0.30.1). Elle remplace l'ancienne elfe lie-de-vin, une placeholder tirée d'une œuvre existante. Le design prévu pour une « Chasseresse de la nuit » distincte (STYLE_BIBLE) sert maintenant de modèle à Elaria et à Sylwen.

**Compétence du 1 : Œil de faucon** (🎯 le prochain coup qui touche est critique). Un mauvais jet prépare le coup suivant, ce qui colle à l'archère qui ajuste son tir. La charge n'est pas consommée par une esquive adverse. Environ 1,4 critique assuré par combat.

**Compétence du 2 : Esquive améliorée** (💨 sans durée depuis la 0.36.5 : le prochain coup reçu est esquivé à coup sûr). L'esquive vaut pour le prochain coup reçu, sans tirage, et la charge est consommée. **0.36.5** : elle durait un tour, et s'éteignait sans servir une fois sur trois quand l'adversaire sacrifiait son coup (jet de 1 à 3) ou perdait son tour, le même défaut que la Riposte avant la 0.32.0 (audit des compétences, `docs/SORTS.md` § 8). Valeur nette de +6,7 à +10,3 points pour Elaria (49,0 → 52,1 %), de +7,5 à +9,9 pour Sylwen. Contre une Furie des vents, elle n'annule que le premier des deux coups. Un coup sacrifié (Vol de vie) ne la consomme pas. Environ 1,3 esquive imposée par combat.

**2026-10-21, Esquive améliorée cumulable** (demande de l'utilisateur) : les charges s'additionnent (`stacking: 'add'`, sans plafond) ; chaque coup reçu esquivé à coup sûr en use une. Deux 2 avant le prochain coup adverse, ou un 2 et un jet maximal avec le Dé creux, valent donc deux esquives. **Mesure** (`npm run balance`, 0.77.1, même lot que la pièce de Naraxes) : Elaria de 47,6 à **46,6 %** (± 1,6), valeur nette de l'Esquive de +9,6 à **+10,1 points**, apport de 1,1 à 1,2 coup esquivé par combat. Le cumul est rare (le prochain coup adverse use la charge avant qu'un deuxième 2 tombe) ; la baisse d'Elaria vient surtout de Naraxes, plus forte, contre qui elle passe de 49 à 35 %.

**Compétence du 3 : Aura de précision** (🦅 permanente). Le multiplicateur de critique gagne +1 : ×2 devient ×3 pour Elaria, ×2,4 devient ×3,4 pour Sylwen. Le critique assuré d'Œil de faucon en profite aussi. Elle est cumulable depuis la 0.28.0 : +1 par charge, ×4 après deux 3. Les elfes l'obtiennent dans trois combats sur quatre.

**Réglage 0.26.0** : avec les auras, les elfes tombaient à 45-46 % de victoires, et les orcs montaient à 54,7 %. Les elfes gagnent 3 PV (Elaria 51, Sylwen 53), et les orcs en perdent 2 (Gorak 59, Murzug 55).

### Elaria · Rôdeuse

> « Un souffle, une flèche. »

**2026-10-23, le d6 imprimé (0.105.0)** : Œil de faucon et Esquive améliorée, coups de 5, 6, 6, 7 ; Aura de précision hors kit ; 53 PV (50), dernier levier. 47,3 → 49,2 %. Voir « Le d6 imprimé ».

**2026-10-23, l'attaque de base (0.106.0)** : attaque 4 à 5 (DP), 53 PV ; esquive 26 → 22 %, critique 17 → 15 % (×2,4). Œil de faucon greffé rend critique le coup de base de son propre jet. 49,2 → 48,9 %, 20,4 → 18,0 tours par combat. Voir « L'attaque de base ».

**Personnalité : la chasseresse solitaire.**
- **Qui elle est** : patiente, distante, un peu hautaine. Elle trouve la mêlée grossière et ne se bat jamais là où on l'attend.
- **Comment elle se bat** : elle observe, se dérobe, et attend l'ouverture. Un tir manqué lui sert à régler le suivant (Œil de faucon). Elle frappe peu, mais au bon endroit.
- **Pistes** : marquer une cible, punir l'adversaire qui la rate, prendre l'avantage au premier tour.

- **Fantasy** : l'éclaireuse insaisissable, jamais là où l'on frappe.
- **Stats** (0.43.0, celles de Sylwen) : PV 50, d8, armure 0, esquive 26 %, critique 17 % ×2,4. Jusqu'à la 0.42.0 : PV 48, esquive 33 %, critique 22 % ×2.
- **Comment elle gagne** : un tiers des coups adverses passent dans le vide, et ses critiques fréquents rattrapent son petit dé.
- **Comment elle perd** : quand l'esquive ne passe pas, ses PV fondent. Contre Ervald (armure 1, poison), son pire duel (44 %), ses petits coups sont rognés et ses PV bas fondent sous le poison.
- **Mesures** : 51,7 % de victoires (0.26.0). Elle bat les orcs (56 % et 54 %). Duel le plus dur : Brokk (45 %).
- **Décisions** :
  - Elle a les PV les plus bas parce qu'elle a la meilleure défense active. Le hasard de l'esquive crée de la variance : ses combats sont les plus imprévisibles.
  - Son point faible face à l'armure est voulu. Depuis que les nains n'ont plus d'armure passive (0.24.1), il ne joue plus que contre Ervald et les boucliers.

### Sylwen · Sentinelle sylvestre (variante d'Elaria) · retiré en 0.43.0

> « La forêt ne pardonne pas deux fois. »

- **Fantasy** : la gardienne patiente, qui attend l'ouverture parfaite.
- **Écarts avec Elaria** : PV +2 (50), esquive −7 points (26 %), critique −5 points (17 %), multiplicateur +0,4 (×2,4).
- **Teinte** : vert forêt (`hue-rotate(-110deg)` depuis la 0.30.1 ; l'ancien `hue-rotate(120deg)` aurait passé la nouvelle elfe bleu nuit au rouge).
- **Mesures** : 51,2 % de victoires (0.26.0). **À surveiller** : 60 % contre Murzug, à la limite du budget de duel.
- **Décisions** :
  - Elle est moins aléatoire qu'Elaria (moins d'esquive, moins de critiques), mais chaque critique pèse davantage.
  - Son gros multiplicateur valorise particulièrement Œil de faucon, qui force un critique.
  - **Piste** : si elle descend sous 48 %, remonter légèrement ses PV plutôt que son esquive, pour garder son identité « moins insaisissable ».

---

## Nains : user l'adversaire

**Image** : `dwarf-idle.png` et ses cinq postures (0.65.0), un nain torse nu, cheveux et barbe roux cuivré tressés de laiton, pagne rouge brodé, grande hache à un tranchant. C'est une création originale, générée dans l'atelier des postures. Elle remplace `dwarf.png`, un placeholder tiré d'une œuvre existante, le dernier du roster.

**Compétence du 1 : Peau de pierre** (🛡️ +6 d'armure temporaire, +4 avant la 0.28.0). Ce bonus se cumule, absorbe des points (jamais sous 1 dégât) et s'use en encaissant. Il renforce le nain qui tient la ligne. C'est désormais sa seule protection.

**Compétence du 2 : Épines acérées** (0.68.0 ; avant : Épines). Le jet du 2 ne frappe pas, il pose une charge d'épines, permanente et cumulable. **Chaque** coup qui touche le nain lui retire ses PV normalement, puis pose sur l'attaquant 1 charge de Saignement par charge d'épines. La plaie ne coule pas tout de suite : elle attend que le nain touche à son tour. Voir plus bas, « 0.68.0, Épines acérées ».

**Épines, de la 0.29.0 à la 0.44.0** (🌵 6 pendant 1 tour). Jusqu'au début du prochain tour du nain, chaque coup qui le touchait renvoyait 6 dégâts directs à l'attaquant, deux fois contre une Furie des vents (12 dégâts) : le genre d'interaction surprenante que l'utilisateur veut favoriser. Jusqu'en 0.28.0, elles valaient 4 et ne punissaient que le premier coup (valeur nette de +1 à +5 points) ; ensuite, environ +9,5 points pour Brokk et +3,6 pour Grimbald.

**0.45.0, Épines permanentes** (demande de l'utilisateur) : chaque 2 au dé ajoute une charge d'épines, sans durée ; chaque coup encaissé renvoie 1 dégât direct par charge, jusqu'à la fin du combat. Valeur nette : Brokk +9,9 → **+10,9**, Grimbald +5,0 → **+4,3**. Le spectateur les voit agir à presque chaque coup : 6,9 réactions par combat chez Brokk, au lieu de 3,9. À 2 dégâts par charge, Brokk montait à 64 % : trop fort.

**0.68.0, Épines acérées** (demande de l'utilisateur, avec la Saignée de Gorak). Chaque coup encaissé pose sur l'attaquant 1 charge de Saignement par charge d'épines, au lieu de lui renvoyer 1 dégât direct par charge. La punition change de forme : elle s'accumule sur l'attaquant (une Furie des vents contre 3 épines : 6 charges), puis coule à chaque coup du nain. Le gardien qui tient la porte fait payer au retour. Mesures (400 combats par duel) :
- valeur nette +3,7 → **+5,0** points ; Brokk 48,3 → **50,4 %** ; aucune compensation nécessaire (la première mesure, +6,8 au laboratoire, était gonflée par la même charge fantôme que la Saignée) ;
- duels qui bougent : Ysolde 51 → 57 %, Gorak 49 → 53 %, Fanchon 56 → 60 % (ses deux dés lui posent deux plaies par action), Aldric 44 → 40 % (immunisé) ;
- variante « 1 charge par coup, quelle que soit la pile d'épines » : Brokk 47,9 %, et les charges d'épines ne servent plus à rien : écartée.

**Compétence du 3 : Aura d'intimidation** (😠 permanente, portée par le nain). Les coups de son adversaire infligent 2 de moins, avant l'armure : un 10 devient 8. Elle se combine aux autres calculs : une Aura de puissance de l'orc (+2) l'annule, et un coup ne descend jamais sous 1. Elle est cumulable depuis la 0.28.0 : −2 par charge, −4 après deux 3. C'est la compétence qui fait du nain un tank (valeur nette d'environ +20 points pour Brokk), à la place de l'armure passive perdue. Brokk l'obtient dans trois combats sur quatre, Grimbald dans près de deux sur trois.

**Armure passive retirée (0.24.1)** : Brokk avait 2 d'armure et Grimbald 1, retirées de chaque coup avant l'Armure temporaire. Cumulées, les deux protections étaient un trop gros avantage, et deux notions nommées « armure » prêtaient à confusion. Les deux nains n'ont plus d'armure passive. En compensation, mesurée par simulation : sans rien changer d'autre, Brokk tombait à 18 % et Grimbald à 35 %. Leurs PV passent donc à 72 et 59 (74 et 63 depuis la 0.25.0, voir plus bas).

### Brokk · Gardien

> « Ce qui passe la porte passe par moi. »

**2026-10-23, le d6 imprimé (0.105.0)** : Peau de pierre et Épines acérées, coups de 7, 7, 8, 10 ; Aura d'intimidation hors kit. 47,4 → 49,9 %. Voir « Le d6 imprimé ».

**2026-10-23, l'attaque de base (0.106.0)** : attaque 5 à 6 (DP), 57 PV ; critique ×2,5 → ×2,2 (10 %). 49,9 → 51,5 %, 18,1 → 17,0 tours par combat. Voir « L'attaque de base ».

**Personnalité : le roc.**
- **Qui il est** : très costaud, endurant, têtu et peu bavard. Il défend un lieu, pas sa gloire : sa fierté, c'est de ne jamais reculer.
- **Comment il se bat** : il encaisse. Sa carrure et son armure grandissent pendant le combat (Peau de pierre), on se blesse en le frappant et la plaie s'ouvre quand il rend le coup (Épines acérées), et sa seule présence décourage (Intimidation). Il gagne à l'usure, pas à l'éclat.
- **Pistes** : devenir plus fort quand le combat dure, résister à tout ce qui déplace ou fait perdre un tour.

- **Fantasy** : le gardien qui ne recule jamais.
- **Stats** (0.43.0, celles de Grimbald) : PV 57, d10, armure 0, esquive 6 %, critique 10 % ×2,5. Jusqu'à la 0.42.0 : PV 68, d8, critique 8 %. Il est petit à l'écran.
- **Comment il gagne** : il encaisse plus que quiconque, et Peau de pierre allonge encore le combat. Ses combats restent les plus longs.
- **Comment il perd** : son d8 et ses critiques rares le rendent lent à finir l'adversaire. Le poison et le vol de vie d'Ervald (45 %), qui profitent des combats longs, pèsent sur lui.
- **Mesures** : 51,1 % de victoires (0.26.0), les combats les plus longs (environ 25 tours).
- **Décisions** :
  - Son armure passive de 2 a été retirée en 0.24.1 : cumulée à Peau de pierre, elle protégeait trop. Son endurance passe désormais par les PV, compensés par l'offensive la plus faible du roster.
  - **À surveiller** : le duel contre Ervald (45 %), où le poison, qui ignore tout, gagne avec la durée du combat.

### Grimbald · Briseur de fer (variante de Brokk) · retiré en 0.43.0

> « Pourquoi parer quand on peut briser ? »

- **Fantasy** : le forgeron devenu briseur, qui a sacrifié de l'endurance pour frapper plus fort.
- **Écarts avec Brokk** : dé +2 (d10), PV −11 (57), critique +2 points (10 %, depuis la 0.28.0 : un briseur frappe plus souvent fort). Plus d'armure passive depuis la 0.24.1 (il en avait 1).
- **Teinte** : acier brut, presque sans couleur (`saturate(0.15) brightness(1.15)`).
- **Mesures** : 51,5 % de victoires (0.26.0). Il bat Ervald (55 %), dont il raccourcit les combats.
- **Décisions** :
  - C'est le nain offensif : il garde Peau de pierre et ses critiques ×2,5, mais tient moins longtemps.
  - Il montre qu'une variante peut changer le style d'une race (de l'usure à l'échange de coups) sans changer son événement.

---

## Morts-vivants : affliger

**Événement : Souffle de la tombe** (1 au dé → ☠️ l'adversaire est empoisonné : Poison 3, il perd 3, 2 puis 1 PV au début de ses tours suivants, soit 6 PV ; jusqu'en 0.36.3, 2 PV pendant 3 tours). C'est la première race à poser une **aura négative sur l'adversaire**. Ses dégâts ne viennent pas que de ses coups : le poison ignore l'armure, l'esquive et les boucliers. Si un second poison tombe avant la fin du premier, les charges s'additionnent : un poison 1 qui reçoit 3 devient un poison 4 (4, 3, 2, 1). Environ 1,3 événement par combat pour Ervald.

**Réglage** : la première version (54 PV, poison 2 × 3) plafonnait à 46 % de victoires. Avec un poison 3 × 3 (9 PV), Ervald montait à 62 % : un poison qui ignore l'armure est très fort. Version retenue : 56 PV et poison 2 × 3. **0.36.4** : le poison n'a plus qu'une valeur (demande de l'utilisateur) ; Souffle de la tombe passe à Poison 3, les mêmes 6 PV mais plus tôt. Ervald 47,4 → 48,4 %, Caldrec 51,9 → 52,0 % (1 000 combats par duel).

**Compétence du 2 : Vol de vie** (🦇, une charge, sans durée depuis la 0.29.0). Le jet du 2 ne frappe pas : le mort-vivant gagne 1 charge de Vol de vie. Son **prochain coup porté** la consomme. S'il touche, il rend les PV qu'il retire (frapper à 10, c'est infliger 10 et regagner 10). S'il est **esquivé**, la charge est perdue sans rien rendre. Un nouveau jet de 1 à 3 n'est pas un coup porté : **la charge reste** (règle de l'utilisateur : « pas de coup donné, donc charge conservée »). Un nouveau 2 la renouvelle, mais elle reste unique. Jusqu'en 0.28.0, elle expirait à la fin du tour suivant, même sans avoir servi. Valeur nette d'environ +5 points. Environ 4,6 PV volés par combat pour Ervald, 3,9 pour Caldrec.

**0.45.0, deux charges** : le Vol de vie pose deux charges ; ses deux prochains coups qui touchent lui rendent les PV retirés, et une esquive use une charge. Le médaillon compte enfin quelque chose (2, puis 1). Valeur nette +4,0 → **+10,6** (Ervald), +3,3 → **+8,9** (Caldrec). Ervald, le plus faible du roster, passe de 46,4 à **51,2 %** ; Caldrec de 48,9 à **53,3 %**. Prix : un peu moins de retournements dans leurs combats (retours d'Ervald de 65 à 62 %). Un vol immédiat de 3 PV en plus était trop fort (+15 points).

**Réglage 0.25.0** : le coup sacrifié coûte cher. Sans compensation, les morts-vivants tombaient à 43,5 %. Ervald passe de 56 à 60 PV, et Caldrec de 54 à 58.

**Compétence du 3 : Aura glaciale** (permanente, cumulable, portée par le mort-vivant ; règle de la 0.69.0). Au début de chacun de ses tours, avant son coup, elle pose sur l'adversaire **1 charge de Poison par charge d'aura**. C'est du vrai Poison : il agit au début des tours de la victime et perd une charge à chaque fois. Une charge d'aura le fige donc à sa valeur (après un Souffle de la tombe, 3 PV par tour au lieu de 3, 2, 1), deux charges le font grossir d'1 par tour. L'immunité le bloque, la Régénération l'annule, une purge l'enlève. Jusqu'à la 0.68.3, l'aura infligeait 1 dégât direct par charge (voir les paragraphes suivants).

**0.45.0, ce n'est pas un poison, mais elle agit avec lui** (note de l'utilisateur : « se résout quand ? comme le poison normal ? »). Avant, elle frappait au début du tour du **porteur** ; elle frappe désormais **au début du tour de l'adversaire, juste après ses poisons**, dans la même étape (choix de l'utilisateur). Elle reste des dégâts directs, sans décroître : une version qui pose de vrais Poisons a été mesurée, et l'Aura d'immunité du paladin les bloque (Ervald à **31 % contre Gauvain**) ; à deux charges, les poisons s'empilaient (Ervald battait Brokk à 67 %). Valeur nette +11,0 → **+13,8** (Ervald), +4,1 → **+6,2** (Caldrec) : elle frappe dès le tour où elle est posée. Avec le Vol de vie à deux charges, Ervald passe de 47,5 à **54,6 %** (roster de 10 personnages, 0.45.0).

**Réglage 0.26.0** : Caldrec tombait à 45,8 %. Il ne perd plus de PV par rapport à Ervald (60).

### Ervald · Chevalier liche

> « La mort l'a rendu, pas pardonné. »

**2026-10-23, le d6 imprimé (0.105.0)** : Vol de vie et Aura glaciale, coups de 6, 6, 7, 9 ; Souffle de la tombe hors kit. 53,9 → 49,3 %. Voir « Le d6 imprimé ».

**2026-10-23, l'attaque de base (0.106.0)** : attaque 4 à 6 (DP), 56 PV, aucun autre changement ; Vol de vie greffé draine le coup de base de son propre jet. 49,3 → 49,8 %, 18,7 → 17,9 tours par combat. Voir « L'attaque de base ».

**Personnalité : le devoir qui ne meurt pas.**
- **Qui il est** : un soldat mort à son poste et revenu par devoir. Il est froid, sans haine ni colère ; il n'a plus rien à perdre, et il a donc tout son temps.
- **Comment il se bat** : il ne cherche pas le coup décisif. Il ronge l'adversaire (poison, Aura glaciale) et reprend sur les vivants la vie qu'on lui a prise (Vol de vie). Il est inévitable plutôt que puissant.
- **Pistes** : se relever une fois, profiter des statuts qui s'accumulent, gêner les soins adverses.

- **Fantasy** : le capitaine tombé en défendant Ostremort, revenu sous son étendard pourpre. Il ne fatigue jamais.
- **Stats** (0.43.0, celles de Caldrec) : PV 56, d10, armure 0, esquive 8 %, critique 16 % ×2. Jusqu'à la 0.42.0 : PV 58, d8, armure 1, critique 12 %. Il est grand à l'écran.
- **Comment il gagne** : il encaisse, et chaque jet raté ronge l'adversaire au fil des tours. Contre les elfes, peu nombreux en PV et sans armure, le poison pèse lourd (54 % contre Elaria). Le vol de vie le fait durer encore.
- **Comment il perd** : ses propres coups sont faibles (4,4 dégâts par coup, comme Brokk). Et chaque 2 est un coup perdu, rattrapé seulement si le coup suivant touche. Les adversaires au d10 qui raccourcissent le combat (Grimbald, Caldrec) le gênent le plus.
- **Mesures** : 48,8 % de victoires (0.26.0), environ 22 tours par combat. Il bat Sylwen (56 %), mais perd contre les orcs (45 % et 41 %), dont la puissance l'emporte sur son usure.
- **Décisions** :
  - Il réutilise le statut Poison du registre, sans aucune règle nouvelle dans le moteur. Ajouter la race a seulement demandé des données.
  - Il a une armure légère (1). C'est la seule armure passive du roster depuis que les nains l'ont perdue (0.24.1).

### Caldrec · Faucheur d'âmes (variante d'Ervald) · retiré en 0.43.0

> « Il ne garde rien, pas même son bouclier. »

- **Fantasy** : le lieutenant qui a troqué l'armure pour une lame spectrale.
- **Écarts avec Ervald** : dé +2 (d10), armure −1 (0), PV −2 (56), critique +4 points (16 %).
- **Teinte** : spectrale, vert-bleu (`hue-rotate(-110deg)`), contre le pourpre d'Ervald.
- **Mesures** : 48,3 % de victoires (0.26.0), des combats d'environ 19 tours. Son d10 tombe moins souvent sur 2 : il sacrifie moins de coups qu'Ervald.
- **Décisions** :
  - C'est le même renversement que Brokk/Grimbald : la variante échange l'endurance contre l'offensive, et garde l'événement de sa race.
  - Ses combats rapides laissent moins de temps au poison d'agir : son identité passe davantage par les coups que par l'affliction.

---

**0.50.0, l'immunité arrête l'aura** : l'Aura d'immunité du paladin arrête désormais l'Aura de poison (le journal le dit). L'utilisateur, en jeu, pensait l'immunité inefficace. Aura de poison +5,4 → +4,7 ; Ervald 54,4 → 51,8 %.

**0.69.0, l'aura pose du vrai Poison** (sixième passe, SORTS.md § 15, choix de l'utilisateur). L'aura faisait doublon : avec le Poison (même instant, au début du tour adverse) et avec la Pourriture du druide (même profil, des PV perdus chaque tour sans décroître). Elle pose désormais du Poison, qui suit une seule règle d'affliction. La piste avait été écartée en 0.45.0, parce que l'immunité bloquait le poison et pas l'aura ; l'objection est tombée en 0.50.0, quand l'immunité s'est mise à arrêter l'aura aussi. Cumulable, sans compensation (choix de l'utilisateur). Mesures (400 combats par duel) : Aura glaciale **+7,5** points, Souffle de la tombe +11,9 ; Ervald 52,0 → **54,7 %** ; pire duel : Brokk à 39 % contre lui (46 % avant).

## Humains : contrôler

**Image** : `human.png`, une prêtresse solaire à la masse sacrée (0.30.0). L'utilisateur avait demandé « un prêtre » : l'image générée est une prêtresse, la famille est donc au féminin.

**Principe** : elle mise sur ses compétences plutôt que sur ses dégâts. Son petit dé (d7) fait de 3 jets sur 7 (43 %) une compétence, au lieu de 3 sur 8 pour un d8 ou 3 sur 10 pour un d10.

**Compétence du 1 : Peur** (😱 sur l'adversaire). L'adversaire, terrifié, perd sa prochaine action, puis la peur disparaît. Elle est instantanée. La victime tremble de gauche à droite tant qu'elle a peur (`look.motion`). Valeur nette d'environ +16 points.

**Compétence du 2 : Purification**. Effet immédiat : elle retire à l'adversaire **son dernier bonus posé, avec toutes ses charges**, aura comprise (6 charges d'Aura de puissance partent d'un coup). L'utilisateur a demandé « un buff » sans dire lequel : c'est le dernier posé dans l'ordre de la liste, sans tirage au sort. Valeur nette d'environ +10 points.

**0.42.0, Purification de repli** (audit des compétences) : quand l'adversaire n'a aucun bonus à retirer, la lumière lui inflige **5 dégâts directs** au lieu de tomber à vide (54 % des déclenchements avant). Gâchis de 54 % à 0 %, valeur nette de +8,3 à **+12,8 points** (Bérengère de même). Contre Brokk, qui a presque toujours un bonus, rien ne change : un éclat à chaque Purification le faisait tomber à 23,7 % contre Ysolde.

**0.69.0, Purification double** (choix de l'utilisateur). La Purification retire aussi le dernier malus d'Ysolde (poison, plaie, brûlure), en plus du dernier bonus adverse (ou des 5 dégâts de repli). Elle est devenue nécessaire avec l'Aura glaciale cumulable : sans elle, Ysolde tombait à **41,3 %**, sous le plancher. Avec : 43,4 % au laboratoire ; dans le roster, 41,9 → **43,4 %**, Purification **+18,0** points. Elle reste la plus basse du roster ; Naraxes la bat à 60 %.

**Compétence du 3 : Aura de sainteté** (🕊️ permanente, cumulable). Elle regagne 2 PV par charge à la fin de chacun de ses tours. C'est la compétence qui la porte : **+42 à +44 points de victoire**, la plus forte du roster.

**0.42.0, plafond de 3 charges** (6 PV par tour au plus). Valeur nette presque inchangée (+41,2 points, Bérengère +38,1), mais avec la Purification de repli, ses combats deviennent plus disputés : retours de 39,5 à 45,6 %, fins serrées de 16 à 22 %, de 36 à 33 tours. Le plafond à 2 faisait encore mieux à l'écran (fins serrées à 26 %), mais coûtait trop : prêtresses à 43 %, ou Brokk sous 25 % avec un éclat plus fort. Ysolde de 47,1 à **48,6 %**, Bérengère de 46,0 à **48,2 %**.

**Réglage 0.30.0** (méthode : [EQUILIBRAGE.md](EQUILIBRAGE.md)) :
- avec un d6 (l'utilisateur hésitait entre d6 et d7), Ysolde gagnait **63 %** de ses combats, qui duraient **52 tours** : la moitié de ses jets étaient des compétences, et son aura de sainteté se cumulait très vite ;
- avec un d7 : 51 %, combats de 39 tours.

### Ysolde · Prêtresse solaire

> « Le soleil ne frappe pas. Il juge. »

**2026-10-23, le d6 imprimé (0.105.0)** : Purification et Aura de sainteté, coups de 6, 7, 7, 8 ; Peur hors kit. 43,9 → 50,9 %. Voir « Le d6 imprimé ».

**2026-10-23, l'attaque de base (0.106.0)** : attaque 4 à 6, **magique (DM)**, 52 PV, aucun autre changement. 50,9 → 49,1 %, 20,7 → 18,5 tours par combat. Voir « L'attaque de base ».

**Personnalité : la juge.**
- **Qui elle est** : sereine, sûre d'elle, elle ne hausse jamais la voix. Elle ne combat pas, elle rend un verdict.
- **Comment elle se bat** : elle laisse l'adversaire se condamner lui-même. Elle le paralyse de crainte (Peur), efface ce qui le salit (Purification) et tient bon dans sa lumière (sainteté). Ses coups sont faibles, et ce n'est pas eux qui comptent.
- **Pistes** : sanctionner les fautes adverses (un jet raté, un statut posé), un « jugement » qui grossit au fil du combat.

- **Stats** : PV 52, d7, armure 0, esquive 8 %, critique 10 % ×2.
- **Comment elle gagne** : elle tient, se soigne, terrifie et purifie. Les combats s'allongent en sa faveur.
- **Comment elle perd** : ses coups sont les plus faibles du roster (5,2 dégâts par coup). Sans son aura, elle ne peut presque rien.
- **Mesures** : 51,0 % de victoires (0.30.0), environ 39 tours par combat, les plus longs du roster.
- **À surveiller** : elle écrase Brokk (72 %, voir « Questions ouvertes » dans EQUILIBRAGE.md). Sans son aura de sainteté, elle ne gagne que **0,7 %** de ses combats contre lui : l'intimidation ramène ses petits coups à 1 dégât, et seul le soin la fait gagner.

### Bérengère · Inquisitrice (variante d'Ysolde) · retiré en 0.43.0

> « La lumière brûle aussi. »

- **Écarts avec Ysolde** : PV −2 (50), critique +6 points (16 %).
- **Teinte** : désaturée et contrastée (`saturate(0.55) brightness(0.92) contrast(1.1)`), plus austère.
- **Mesures** : 50,8 % de victoires (0.30.0), environ 37 tours par combat.

---

## Hommes-lézards : tenter sa chance

**Image** : `lizardman.png`, une assassine lézarde aux dagues dorées (0.30.0). La famille est au féminin pour la même raison. L'original s'appelle **Naraxes**, à la demande de l'utilisateur.

**Principe** : la chance et le poison. Bonne esquive, critiques, et des compétences à double tranchant.

**Compétence du 1 : Coup de chance** (🍀). À sa prochaine action, elle lance un **d6 vert** en plus de son dé : deux coups, résolus à part. Sur 4 à 6, le d6 frappe ; sur 1 à 3, il déclenche une compétence (Coup de chance, Pile ou face ou l'aura). **0.36.5** : c'était un d3, qui tombait toujours sur 1, 2 ou 3 et ne frappait donc jamais (règle de la 0.27.0) : valeur nette de +0,7 (Ssythra) à +2,7 points (Naraxes). Avec le d6 : +3,6 points pour chacune ; Ssythra de 48,1 à 50,3 %, Naraxes à 49,4 %.

**Compétence du 2 : Pile ou face** (🪙). À sa prochaine action, une **pièce** remplace son dé. Pile, l'adversaire perd 15 PV, en dégâts directs ; face, rien. La pièce rapporte 7,1 dégâts en moyenne, contre 3,5 pour un coup normal. Sa valeur nette est pourtant **négative** (−5 points), parce qu'elle ne frappe pas : elle ne déclenche pas l'Aura de décoction, et elle prive la voleuse d'un jet de dé.

**0.42.0, pile à 20 qui touche** (FAMILLES.md § 6.2 A, choix de l'utilisateur) : pile passe de 15 à 20 dégâts directs et compte comme un coup qui touche (l'Aura de décoction empoisonne). Face reste vide : la dualité nette et sa mise en scène sonore (tintement, son du critique) sont l'intérêt de la compétence. Une face qui frappe normalement avait été proposée (+5 points), puis refusée pour cette raison. Valeur nette de −5,0 à **+0,0** (Naraxes) et de −4,0 à **+0,6** (Ssythra). Naraxes de 49,4 à **52,9 %**, Ssythra de 50,3 à **53,6 %**. Prix accepté par l'utilisateur : Ysolde tombe à 35 % contre l'une et l'autre, deux contres connus de plus (EQUILIBRAGE.md).

**2026-10-21, la pièce part aussitôt** (demande de l'utilisateur) : le 2 qui déclenche Pile ou face lance la pièce juste après, dans la même action, au lieu de remplacer le dé de l'action suivante. Le 2 reste un coup sacrifié ; pile vaut toujours 20 dégâts qui touchent, face rien. La voleuse ne perd donc plus de jet de dé : la pièce devient un pur gain. **Mesure** (`npm run balance`, 0.77.1) : valeur nette de Pile ou face de +0,4 à **+12,4 points**, apport de 7,7 à 8,8 PV par combat ; Naraxes de 49,8 à **61,6 %** (± 1,6), **hors tolérance**. Duels au-delà de 65/35 : Ysolde 60 → **75 %**, Brokk 55 → **66 %**, Elaria 51 → **65 %**. Compensation proposée, non appliquée (laboratoire, série 13, 200 combats par duel, base 62,3 %) : pile à 10 → 54,1 % (pire duel Ysolde 65,5 %), à 12 → 56,3 % (Ysolde 71 %), à 15 → 58,7 % (Ysolde 73 %). Pile à 10 rentre dans la tolérance ; Ysolde reste un contre limite.

**2026-10-21, pile à 10** (choix de l'utilisateur parmi les compensations du laboratoire, série 13 : 10 → 54,1 %, 12 → 56,3 %, 15 → 58,7 %, base 62,3 %) : pile passe de 20 à **10** dégâts directs qui touchent (`COIN_HEADS`, statuses.ts), la pièce restant lancée aussitôt. Les PV, dernier levier, ne bougent pas. **Mesure** (`npm run balance`, 0.77.1) : Naraxes de 61,6 à **53,9 %** (± 1,6) ; valeur nette de Pile ou face de +12,4 à **+4,7 points**, apport de 8,8 à 4,7 PV par combat. Duels : Ysolde 75 → **64,5 %** (contre connu, juste sous 65/35), Brokk 66 → 59 %, Elaria 65 → 59 %. Plus aucun personnage hors tolérance ni duel au-delà de 65/35.

**Compétence du 3 : Aura de décoction** (🧪 permanente, cumulable). Chaque coup qui touche pose sur la cible 2 charges de poison par charge d'aura (0.36.4 ; avant : 1 charge pendant 4 tours) ; le poison se résout comme le poison ordinaire, et s'estompe d'une charge par tour. Valeur nette d'environ +9 à +13 points en 0.30.0. **Mesure 0.36.4** (1 000 combats par duel) : avec 1 charge, Naraxes 38,2 % et Ssythra 39,4 % ; avec **2**, 48,3 % et 47,7 % ; avec 3, 54,6 % et 53,4 %. Ssythra bat Bérengère à 63,7 %, contre connu.

**Réglage 0.30.0** :
- avec un d8, Naraxes gagnait **33,5 %** de ses combats (Ssythra 30,7 %) ;
- le **dé** est le meilleur levier : d10, donc moins de jets sacrifiés et de plus gros coups, tout en gardant ses PV bas de voleuse ;
- s'y ajoutent l'esquive (18 → 20 %) et la durée du poison de la décoction (3 → 4 tours, une valeur que l'utilisateur n'avait pas fixée) ;
- résultat : 50,3 %.

### Naraxes · Voleuse

> « Pile, je gagne. Face, tu perds quand même. »

**2026-10-23, le d6 imprimé (0.105.0)** : Pile ou face et Aura de décoction, coups de 6, 7, 7, 8 ; Coup de chance hors kit. 53,7 → 50,7 %. Voir « Le d6 imprimé ».

**2026-10-23, l'attaque de base (0.106.0)** : attaque 4 à 5 (DP), 50 PV ; Pile ou face modifie son coup (s'il touche, la pièce : pile, ce coup ×2, au lieu de 10 dégâts fixes) ; Coup de chance remplace le coup de son jet (l'action suivante a un jet complet de plus par charge). 50,7 → 52,2 %, 16,1 → 15,1 tours par combat. Voir « L'attaque de base ».

**Personnalité : la joueuse.**
- **Qui elle est** : insolente et opportuniste, elle ne se bat jamais à la loyale. Elle aime le risque plus que la victoire elle-même.
- **Comment elle se bat** : elle esquive, empoisonne ses lames et mise tout sur un coup de chance (Coup de chance, Pile ou face). Quand le hasard ne paie pas, le poison finit le travail.
- **Pistes** : parier sur son propre jet, voler un bonus, tricher avec le dé (relancer, échanger). C'est un écho direct aux parieurs.

- **Stats** : PV 50, d10, armure 0, esquive 20 %, critique 14 % ×2.
- **Comment elle gagne** : elle esquive, empoisonne, et un pile tombe parfois au bon moment.
- **Comment elle perd** : peu de PV, et ses compétences du 1 et du 2 rapportent peu.
- **Mesures** : 50,3 % de victoires (0.30.0), environ 20 tours par combat.

### Ssythra · Assassine (variante de Naraxes) · retiré en 0.43.0

> « Une seule morsure suffit. »

- **Écarts avec Naraxes** : PV −2 (48), esquive −4 points (16 %), critique +6 points (20 %), multiplicateur +0,3 (×2,3).
- **Teinte** : écailles orangées (`hue-rotate(-80deg)`).
- **Mesures** : 48,9 % de victoires (0.30.0), les combats les plus courts du roster (environ 19 tours).

---

**0.50.0, Coup de chance cumulable** (demande de l'utilisateur) : chaque 1 ajoute une charge ; la prochaine action lance un d6 vert de plus par charge, chacun pouvant être critique. Les charges multiples sont rares (il faut un 1 sur le d6 du coup en plus) : +3,3 → +4,0. **Pile ou face** : sur ses traces, 52 piles pour 54 faces ; le libellé « PILE ! » est presque caché par la pièce, d'où l'impression qu'elle ne tombe jamais sur pile.

## Paladin : rendre les coups

**Image** : `paladin.png`, un chevalier en armure à l'épée flamboyante, avec une bannière rouge (0.31.0). C'est un humain, mais il forme sa propre famille ; sa variante est Gauvain (0.32.0). Son nom, Aldric, est un choix par défaut.

**Compétence du 1 : Rétribution** (⚖️, mécanique inédite). Trois jauges stockent les PV retirés par les trois derniers coups qu'il a encaissés : 10, puis 2, puis 1. Une fois pleines, la plus ancienne cède sa place. Sur un 1, il relâche la somme en dégâts directs, au moins 1 même si les jauges sont vides, puis elles se vident. Elle peut donc coûter très cher à l'adversaire, ou presque rien. Les jauges s'affichent dans sa zone d'état, avec leur détail au survol. Valeur nette : **+34 points**, c'est elle qui le porte.

**Compétence du 2 : Riposte** (⚔️, sans durée depuis la 0.32.0). Le prochain coup qui le touche lui renvoie la moitié des PV retirés (arrondie), en dégâts directs, puis la charge est consommée. Jusqu'à la 0.31.0, elle durait un tour et s'éteignait à vide si l'adversaire sacrifiait son coup (jet de 1 à 3) : c'était un bug. Valeur nette : +3,8 points (4,0 PV renvoyés par combat), contre +1,4 point avant.

**Compétence du 3 : Aura d'immunité** (permanente, non cumulable). Elle retire tous ses malus, puis plus aucun malus ne peut lui être posé jusqu'à la fin du combat (Peur, Poison…), sans que l'aura s'use. Une Purification de prêtresse peut la lui retirer, comme tout bonus. Valeur nette : **−1,7 point**. Peu d'adversaires posent des malus, et le 3 sacrifie son coup.

**0.42.0, immunité et armure** (choix de l'utilisateur) : tant que l'aura est là, son armure gagne 1, en plus de l'immunité. C'est une règle d'aura, permanente et lisible, la même pour Gauvain. Un bouclier de 2 posé à chaque 3 avait été proposé, puis jugé peu clair. Valeur nette de −2,7 à **+1,1** (Aldric) et de −3,9 à **−0,6** (Gauvain). Compensation : son **esquive passe de 5 à 2 %** (Gauvain de 10 à 7 %). Sans elle, Aldric battait Thaldrin à 66-68 %, même avec 10 % de critique : l'armure vise les petits coups de l'ours, et l'immunité bloque déjà sa Pourriture et sa Luciole. Après : Aldric 53,8 % (53,3 avant), Gauvain 49,9 % (49,5), Aldric contre Thaldrin 62,5 %. La **Rétribution** (+36 et +31 points) n'est pas touchée (décision de l'utilisateur) : deux jauges au lieu de trois faisaient d'ailleurs passer Aldric sous 35 % contre Brokk.


**Réglage 0.32.0** : la riposte réparée le portait à 57,3 %, avec Sylwen battue à 67/33 et Gauvain contre Naraxes à 66/34. Le critique passe de 15 à 12 % : Aldric revient à 55,0 % et Gauvain à 50,8 %. Les duels sont ramenés sous 65/35, sauf Ssythra contre Aldric, à 33/67 (contre connu).

**Réglage 0.31.0** : avec 10 % de critique ×2, Brokk le battait à 75 % : l'intimidation rognait ses coups moyens, et Brokk frappe trop peu pour remplir les jauges. Avec un d10, il montait à 58,6 % au global. Les critiques lourds (15 % ×2,5) règlent le mieux ce duel (Brokk à environ 38 %), en gardant le d8.

### Aldric · Paladin

> « Chaque coup reçu est une dette. »

**2026-10-23, le d6 imprimé (0.105.0)** : Rétribution et Riposte, coups de 4, 5, 6, 7 ; Aura d'immunité hors kit. 53,9 → 50,2 %. Voir « Le d6 imprimé ».

**2026-10-23, l'attaque de base (0.106.0)** : attaque 3 à 5 (DP), 54 PV, aucun autre changement. 50,2 → 50,3 %, 15,4 → 14,6 tours par combat. Voir « L'attaque de base ».

**Personnalité : le créancier.**
- **Qui il est** : un paladin rigide et discipliné. Sa ferveur est réelle mais contenue : il encaisse en silence, et il compte (choix de 2026-10-20 entre le « fanatique » de son image et le « tient le compte » de sa fiche : le fanatique n'apparaît qu'au moment où il rend les coups, dans sa posture d'attaque par exemple).
- **Comment il se bat** : il laisse venir les coups, les note comme des dettes, puis paie d'un seul revers (Rétribution, Riposte). Rien ne le détourne de sa voie (Aura d'immunité).
- **Pistes** : des serments (une condition à tenir pour gagner un bonus), des dettes qui se transmettent ou qui expirent.

- **Stats** (0.43.0, celles de Gauvain) : PV 54, d8, armure 0, esquive 7 %, critique 17 % ×2,5. Jusqu'à la 0.42.0 : PV 60, esquive 2 %, critique 12 %.
- **Comment il gagne** : il encaisse, remplit ses jauges et relâche une rétribution énorme au bon moment, ou un critique lourd.
- **Comment il perd** : contre un adversaire qui frappe peu fort (Brokk), ses jauges restent maigres.
- **Mesures** : 54,8 % de victoires (0.31.0), environ 21 tours par combat. Il bat Ssythra à 66 % : un contre connu (EQUILIBRAGE.md).

### Gauvain · Croisé · retiré en 0.43.0

> « La foi tranche plus vite que la loi. »

- **Stats** : PV 54 (−6), d8, esquive 10 % (+5), critique 17 % ×2,5 (+5).
- **Différence** : il gagne plus souvent sur un critique et encaisse moins. Il a donc des jauges de rétribution plus maigres : 29 points de valeur nette, contre 34 pour Aldric.
- **Teinte** : dorée (`sepia(0.35) hue-rotate(-25deg) saturate(1.4)`).
- **Mesures** : 50,8 % de victoires (0.32.0, 400 combats par duel), environ 20 tours par combat. Brokk le bat à 64 % : contre connu, comme pour Aldric (63 %).

---

**0.50.0, Riposte à deux charges** : ses deux prochains coups encaissés renvoient chacun la moitié des dégâts. +2,7 → **+7,1** ; Aldric 49,0 → 54,1 %, ses combats se retournent un peu plus (retours de 61 à 62,5 %). À 100 % de renvoi, Thaldrin passait à 65 % contre lui.

## Ogre : taper, taper encore, taper plus fort

**Image** : `ogre-idle.png` et ses cinq postures (0.65.0), un ogre ventru, casque cabossé et massue cloutée, un papillon posé dessus. C'est le modèle de `ogre.png` (0.35.0), qu'elles remplacent. Morgrut n'esquive jamais (0 %) : sa posture d'esquive existe pour la règle commune, mais ne se voit pas en jeu.

**Philosophie** (décision de l'utilisateur) : bête comme ses pieds, il n'a **aucune compétence**. De la 0.35.0 à la 0.105.0, un 1, un 2 ou un 3 lui donnait **Attente** (montre à gousset) : il ne frappait pas ce tour-là. En contrepartie, il tapait très fort, avec un **d14**. **Depuis la 0.106.0** (décision de l'utilisateur), l'Attente est retirée : ses six faces sont nues, chaque jet frappe, et il a la plus forte attaque du roster (7 à 9).

**Réglage 0.35.0** : avec 8 % de critique et 66 PV, Morgrut gagnait 63 % de ses combats, et Gnashka 67 %, avec des duels jusqu'à 74/26. Le dé est le levier le plus fort (passer au d12 lui ôtait 19 points), mais le d14 est la proposition de l'utilisateur. On a donc retiré le critique (il ne vise pas, ce qui va avec son personnage) : 57,3 %. Puis 63 PV au lieu de 66 : 51,7 %. Valeur des trois Attente : de −1,5 à −3,8 points chacune ; c'est le prix de son gros dé.

**Forge du dé (0.88.0, campagne)** : ses trois Attente étaient des **faces d'attente** (`idle`), pas des compétences : la forge pouvait y graver une compétence, qui la remplaçait (décision de l'utilisateur, [CAMPAGNE.md](CAMPAGNE.md) § 4.4). Depuis la 0.106.0, ce sont des faces nues comme les autres : la forge les remplit. Son image sert aussi, assombrie, au boss de la campagne, **Le Colosse** : un autre ogre, plus grand et plus vieux (provisoire, en attendant une image propre).

### Morgrut · Cogneur

> « Taper. Taper encore. Taper plus fort. »

**2026-10-23, le d6 imprimé (0.105.0)** : une seule Attente (sur le 1), coups de 7, 8, 9, 10, 11 ; plus de d14 ni de trois Attentes. 47,4 → 51,4 %. Voir « Le d6 imprimé ».

**2026-10-23, l'attaque de base (0.106.0)** : plus d'Attente (décision de l'utilisateur), six faces nues ; attaque 7 à 9 (DP), la plus forte du roster ; **59 PV (63)**, son seul autre levier. 51,4 → 48,8 %, 16,4 → 15,1 tours par combat. Voir « L'attaque de base ».

**Personnalité : le gros distrait.**
- **Qui il est** : simple, lent d'esprit, et pas méchant du tout : il s'émerveille d'un papillon. Il ne se bat pas par haine, on lui a juste dit de taper.
- **Comment il se bat** : il tape, à chaque jet, plus fort que tout le monde (depuis la 0.106.0 ; avant, il attendait sur un jet qu'il ne comprenait pas, l'Attente). Il ne vise pas (aucun critique) et n'esquive pas : il n'y pense même pas.
- **Pistes** : se laisser distraire, profiter d'un hasard heureux sans le chercher, s'énerver d'un coup si on l'agace trop.

- **Stats** (0.106.0) : PV 59, attaque 7 à 9 (DP), six faces nues, armure 0, esquive 0 %, critique 0 % (×2). En 0.35.0 : PV 63, d14.
- **Comment il gagne** : chaque jet frappe, en moyenne pour 8 dégâts.
- **Comment il perd** : contre l'esquive d'Elaria (38 %) et contre Ervald (43 %).
- **Mesures** : 48,8 % de victoires (0.106.0, 800 combats par duel), 15,1 tours par combat ; il bat Thaldrin à 59 %. En 0.35.0 : 51,7 %, environ 19 tours.

### Gnashka · Ogre des cavernes · retiré en 0.43.0

> « Plus gris, plus dur, toujours aussi perdu. »

- **Stats** : PV 70 (+7), d12 (−2), critique 10 % (+10).
- **Différence** : plus endurante et capable de critiques, mais elle frappe moins fort. Elle attend aussi plus souvent : 3 jets sur 12.
- **Teinte** : peau grise (`hue-rotate(185deg) saturate(0.45)`).
- **Mesures** : 52,5 % (0.35.0).

---

## Druide : deux visages

**Images** : `druid.png` (forme humaine, bois de cerf, bâton et magie verte) et `druid-bear.png` (ours humanoïde aux runes émeraude), en 0.35.0. **Depuis la 0.67.0**, chaque forme a ses cinq postures (`druid-*.png`, `druid-bear-*.png`, [POSTURES.md](POSTURES.md) § 4), et l'ours n'est plus un ours humanoïde dressé : c'est une bête à quatre pattes (règle de l'utilisateur, « sous cette forme il est un animal »). Il charge au galop gueule ouverte, recule en boule sous un coup, s'écarte d'un bond, tombe sur le flanc et rugit campé sur ses pattes. Aussi haut que le druide (96 %, bois compris) et une fois et demie plus long que haut : la métamorphose le fait grossir, plus grandir. Rien ne change au combat.

**Philosophie** (décision de l'utilisateur) : au début de chacun de ses tours, sauf le premier, il **change de forme** (homme d'abord). Depuis la 0.73.0, chaque forme a son **statut de forme** (`innate`), posé quand il la prend et retiré quand il la quitte, jamais purgé ni bloqué.
- **Forme humaine, le mage** : statut **Incantation**. Son dé devient un d3 et chaque jet lance un sort ; l'homme ne frappe jamais.
  - **Foudre** (1) : 3 fois 2 dégâts directs à l'adversaire (0.76.0 ; 5 avant), avec l'événement de scène `lightning` (trois éclairs tombent l'un après l'autre autour de la cible) ;
  - **Feux follets** (2) : Brûlure 3 sur l'adversaire ;
  - **Aura sauvage** (3, cumulable) : +2 par charge à ses coups, donc à ceux de l'ours.
- **Forme d'ours, la bête** : statut **Force de l'ours**. Aucun sort : son 1, son 2 et son 3 frappent aussi, et chaque coup fait +3 avant l'armure (+4 de la 0.73.0 à la 0.75.0).
- Aucun soin ni armure. Fleur de vie, Écorce épaisse, Charge, Coup de griffe et le relais des formes (Rancune, Sève, leurs auras) sont retirés en 0.73.0 (voir l'historique ci-dessous).

**Mesures des compétences** (valeur nette, 0.35.0) :

| Compétence | Thaldrin | Brannoc |
| --- | --- | --- |
| Charge | +7,6 | +6,4 |
| Aura de pourriture | +6,6 | +6,2 |
| Coup de griffe | +5,2 | +6,2 |
| Écorce épaisse | +1,2 | +1,8 |
| Fleur de vie | +0,2 | +0,7 |
| **Luciole** | **−2,4** | **−2,0** |

**0.35.1, Luciole à 3 charges** (décision de l'utilisateur) : sa valeur nette passe de −2,4 à −1,3 chez Thaldrin, de −2,0 à −0,8 chez Brannoc. Thaldrin de 48,0 à 49,1 %, Brannoc de 49,4 à 50,6 %.

**0.35.2, Luciole à +2 dégâts** (décision de l'utilisateur) : sa valeur nette passe à +3,2 (Thaldrin) et +2,8 (Brannoc). Le druide montait à 53 % et battait les prêtresses à 65-68 %, car la Pourriture use leurs soins et Luciole les fait encaisser plus fort. Son critique passe de 10 à 8 % (Brannoc 12 %) : Thaldrin 51,4 %, Brannoc 52,2 %. À 6 %, Aldric, que son immunité protège de Luciole, le battait à 65 %.

Luciole est désormais une vraie compétence, la quatrième du druide après celles de l'ours. Voir EQUILIBRAGE.md.

### Thaldrin · Druide

> « La forêt a deux visages. »

**2026-10-23, le d6 imprimé (0.105.0)** : homme, Foudre sur 1, 2, 3 et Feux follets sur 4, 5, 6 (plus de d3) ; ours, coups de 3 à 8 (+3 Force de l'ours) ; Aura sauvage hors kit. 49,4 → 51,6 %. Voir « Le d6 imprimé ».

**2026-10-23, l'attaque de base (0.106.0)** : une seule attaque, 3 à 4, dont le type suit la forme (`CharacterForm.attackKind`) : l'homme frappe en magique (DM) et chaque sort se greffe sur ce coup ; l'ours frappe en physique (DP), avec sa Force de l'ours (+3), gardée. Foudre 3×2 → 3×1 (elle gagne un coup de base). 51,6 → 49,4 %, 16,1 → 15,4 tours par combat. Voir « L'attaque de base ».

**Personnalité : l'homme et la bête.**
- **Qui il est** : un gardien des chênes anciens, qui appelle la foudre et le feu, et porte en lui un ours qu'il ne maîtrise pas. Les deux ne se ressemblent pas et se relaient sans se demander leur avis.
- **Comment il se bat** : la forme lui est imposée à chaque tour. L'homme lance un sort à chaque tour (Foudre, Feux follets, Aura sauvage) sans jamais frapper ; l'ours frappe toujours, et fort (+3, plus l'Aura sauvage que l'homme a accumulée).
- **Forces** : un sort à chaque tour d'homme (foudre, feu), l'ours frappe toujours et fort (+3), Aura sauvage : un ours de plus en plus dangereux. **Faiblesses** : aucun soin ni armure, l'homme ne frappe jamais, forme imposée à chaque tour.

- **Stats** : PV 56, d10 (d3 sous Incantation), armure 0, esquive 8 %, critique 8 % ×2 (10 % jusqu'à la 0.35.1).
- **Mesures** : 48,0 % de victoires (0.35.0) ; 50,7 % en 0.71.0 ; 54,0 % en 0.73.0 ; **49,8 %** en 0.76.0, 17,4 tours par combat, 10,1 dégâts par coup (le plus haut du roster), ses duels de 38 à 62 %.

### Brannoc · Druide d'automne · retiré en 0.43.0

> « Les feuilles tombent, les griffes aussi. »

- **Stats** : PV 52 (−4), esquive 12 % (+4), critique 12 % (+4).
- **Teinte** : feuillage roux (`hue-rotate(-28deg) saturate(1.25)`).
- **Mesures** : 49,4 % (0.35.0). Il bat les prêtresses à 66 % : contre connu (EQUILIBRAGE.md).

**0.50.0, Écorce à 7, Feux follets** : l'Écorce épaisse absorbe 7 points au lieu de 5 (+0,8 → **+2,4**) et pose désormais la même **Armure temporaire** que la Peau de pierre du nain (une seule règle, deux compétences). La Luciole, jugée ennuyeuse par l'utilisateur, laisse place aux **Feux follets** : une Brûlure de 3 pendant 3 tours sur l'adversaire, même valeur (+4,2), mais des dégâts qui se voient à chaque fin de tour. Écartées : Racines (−1,0, trop proche de la Peur d'Ysolde) et Ronces (−7). Thaldrin 49,1 → 51,4 %.

**0.69.0, Brûlure à une valeur** : la Brûlure dure autant de tours que sa valeur. Les Feux follets posent une **Brûlure 3** (une seule valeur, 3 PV à la fin des 3 prochains tours de l'adversaire), de même force qu'avant ; une nouvelle Brûlure remplace l'ancienne. Valeur nette +3,5 points ; Thaldrin 51,8 → 50,5 %. L'utilisateur veut aller plus loin sur le druide : rework de la dualité, proposition à venir (SORTS.md § 16).

**0.71.0, le relais des formes** (proposition A de SORTS.md § 16, choix de l'utilisateur) : l'alternance forcée reste, mais chaque coup reçu sert l'autre forme. Touché en homme, il gagne une Rancune (+1 au prochain coup qui touche, celui de l'ours) ; touché en ours, une Sève (1 PV au début du tour de l'homme). Le 3 de chaque forme devient une aura qui nourrit le relais : **Aura de sève** (au lieu des Feux follets) et **Aura de rancune** (au lieu de l'Aura de pourriture), +2 par charge (l'utilisateur a gardé +2 ; à +3, 52,1 % au laboratoire). Cumulables comme les autres auras (plafonnées à une charge au laboratoire : 50,1 %). Mesures (400 combats par duel) : Thaldrin 50,5 → **50,7 %**, ses duels de 45 à 58 % (Ysolde contre lui : 35 % en 0.68.0, 45 % maintenant). Valeurs nettes : Rancune **+9,0** (3,8 par combat), Charge +8,9, Sève **+7,7** (3,0 par combat), Coup de griffe +5,5, Écorce +3,5, Fleur de vie +2,6, Aura de rancune +0,4, Aura de sève −1,0 : les auras restent faibles. La Brûlure, la Pourriture et l'Aura de pourriture n'ont plus de porteur.

**0.73.0, le mage et la bête** (SORTS.md § 18, série 12 ; retour de l'utilisateur : « trop mou, lent ») : l'alternance forcée reste, mais les deux formes ne font plus la même chose. L'homme (Incantation, d3) lance un sort à chaque tour : **Foudre** 5 dégâts directs (valeur choisie par l'utilisateur), **Feux follets** (Brûlure 3) de retour, **Aura sauvage** +2 par charge aux coups, pour l'ours seul (choix de l'utilisateur). L'ours (Force de l'ours) frappe à chaque tour. Le Saignement prévu sur l'ours est abandonné : l'utilisateur veut de gros coups ; à +3 sans Saignement, 45,9 % au laboratoire, d'où **+4**. Retirés : Fleur de vie, Écorce épaisse, Charge, Coup de griffe, le relais et ses auras. Mesures (400 combats par duel) : Thaldrin 50,7 → **54,0 %**, ses combats de 20,0 à **17,0 tours**, **11,1 dégâts par coup** ; ses duels de 48 à 65 % (Brokk à 35,3 % contre lui, sous le plafond). Valeurs nettes : Foudre +10,8, Feux follets +10,3, Aura sauvage +4,7 points ; apport des statuts : Force de l'ours 14,0 PV, Brûlure 8,6, Aura sauvage 5,5 par combat. La Foudre inaugure les **événements de scène** (ARCHITECTURE.md).

**0.76.0, la Foudre en trois éclairs** (demande de l'utilisateur : « 3 éclairs qui tombent à la suite à des endroits un peu différents, 2 chacun, impossible de critiquer ») : la Foudre fait 3 fois 2 dégâts directs (6 au lieu de 5), jamais critiques, sans armure ni esquive. À l'écran, trois éclairs tombent l'un après l'autre à gauche, à droite puis au centre de la cible, chacun avec son « 2 ». **Compensation, choix de l'agent** : Force de l'ours +4 → **+3**. Sans elle, Thaldrin montait à 58,0 % et Brokk tombait à 31,5 % contre lui, au-delà de 65/35. Avec : Thaldrin 54,0 → **49,8 %**, 17,4 tours, 10,1 dégâts par coup (toujours le plus haut) ; ses duels de 38 à 62 % (Brokk 38,5 % contre lui). Valeurs nettes : Foudre +15,6, Feux follets +11,6, Aura sauvage +5,5 points (400 combats par duel).

## Barde : deux dés, et la musique sur ses faces (doubles jusqu'à la phase 5 ter)

**Images** : `bard-idle.png` et cinq postures (0.41.0, session images). Saltimbanque de foire, en tenue bigarrée à losanges et chapeau à plume, avec un luth et une rapière. Taille 1,00, celle d'un humain.

**Concept** (d'un ami de l'utilisateur) : un petit d5, mais **deux dés à chaque tour**. Ses compétences se déclenchent sur les **doubles**, pas sur un 1, un 2 ou un 3 :
- **hors double**, deux coups séparés, chacun avec son esquive et son critique (décision de l'utilisateur) ;
- **sur un double** qui a sa compétence, celle-ci remplace les deux coups. Un double sort une fois sur cinq, chaque double une fois sur 25.
  - **Siffloter** (double 1) : Sifflotement, 3 charges, +2 PV à chaque fin de tour ; les charges s'ajoutent.
  - **Fausse note** (double 2) : un malus sur l'adversaire, −5 dégâts finaux sur son prochain coup qui touche, par charge. L'utilisateur avait demandé « −3, mesuré » : à −3, sa valeur nette était de −1,2 point ; à −5, de −0,2.
  - **Aura mélodieuse** (double 3) : +1 dégât final par charge sur chacun de ses coups, permanente.
  - **Crescendo** (double 4) et **Soliste** (double 5) : un seul gros coup de 12 et de 15. Le concept prévoyait trois coups de 4 et de 5 ; c'est l'utilisateur qui a eu l'idée du coup unique.
- **Ouverture** (au début du combat) : elle entre en scène avec 1 charge d'Aura mélodieuse.

**Pourquoi « dégâts finaux » et l'Ouverture** : appliqué à la lettre, le concept gagnait 45 % de ses combats, mais perdait 87/13 contre Brokk, 78/22 contre Grimbald et 71/29 contre Ervald. Tout ce qui retire une valeur fixe à chaque coup rogne ses petits coups (3 en moyenne) : l'intimidation (−2 par coup), les épines (6 renvoyés par coup) et l'armure de 1 d'Ervald. Le texte du concept parle de « dégâts finaux » pour l'aura et la fausse note : ils s'appliquent donc après l'armure. Comme un double 3 n'arrive que 0,4 fois par combat, l'Ouverture pose l'aura dès le début. La compensation est de 46 PV et 5 % de critique. Toutes les pistes mesurées sont dans EQUILIBRAGE.md.

**Mesures** (0.41.0, 400 combats par duel), valeur nette en points :

| Compétence | Fanchon | Mélisande |
| --- | --- | --- |
| Ouverture | +25,4 | +25,2 |
| Soliste | +2,6 | +2,4 |
| Crescendo | +1,8 | +2,4 |
| Siffloter | +1,3 | +0,9 |
| Fausse note | −0,2 | −1,1 |
| Aura mélodieuse (double 3) | −1,1 | −1,1 |

Elle n'a pas de jet raté : 0 % de jets sans dégâts, contre 20 à 43 % pour les autres. Ses compétences, en revanche, sont rares : environ 0,3 déclenchement par compétence et par combat. Une deuxième charge d'aura (double 3) coûte les deux coups du tour pour +1 par coup : elle se rentabilise mal en 17 tours.

### Fanchon · Saltimbanque

> « Deux dés, une chanson, aucune fausse note. Sauf chez vous. »

**2026-10-23, le d6 imprimé (0.105.0)** : deux d6 (deux d5 avant), chaque dé 1, 2, 3, 4, 5, 4 ; doubles 1 à 5 inchangés, double 6 sans compétence (deux coups de 4). 52,1 → 48,2 %. Voir « Le d6 imprimé ».

**2026-10-23, l'attaque de base (0.106.0)** : attaque 2 à 4 (DP), deux coups de base par action (un par dé) ; un double à compétence se greffe sur les deux coups, sauf Crescendo (×4) et Soliste (×5), qui les remplacent par un seul coup de base multiplié ; critique 5 → 10 %. 48,2 → 49,5 %, 14,0 → 13,1 tours par combat. Voir « L'attaque de base ».

**2026-10-24, ses compétences sur les faces (phase 5 ter, décision de l'utilisateur : « avec le nouveau système de coup de base, il faut tout revoir »)**. Plus de doubles : ses deux dés sont une action à deux jets complets ([RESOLUTION.md](RESOLUTION.md) § 2), chaque dé déclenche la compétence de sa face puis porte son coup de base ; une face donnée sort environ deux fois sur six par tour. Crescendo et Soliste **modifient** le coup (« ce coup ×N »). La forge vise ses faces comme pour tous ; une face gravée, dorée ou copiée vaut pour chacun des deux dés.

- **Kit** : Ouverture (gardée, 1 charge d'Aura mélodieuse au début du combat) ; **Aura mélodieuse** sur le 1 (1 charge ; **signature**) ; **Soliste** sur le 2 (ce coup ×3). Hors kit, gravables : Siffloter (Sifflotement 2, au lieu de 3 sur le double 1), Fausse note (1 charge, au lieu de 2 sur le double 2), Crescendo (ce coup ×2, au lieu d'un coup ×4 à la place des deux).
- **Compensation** : attaque 2 à 4 → **1 à 3** (seul levier de stats ; PV, critique et esquive inchangés). « Sa chanson fait ses dégâts » : l'aura s'ajoute après l'armure.
- **Pourquoi ce kit** (laboratoire, série 15, 400 puis 800 combats par duel, mêmes graines que `npm run balance`) : l'esprit, la barde soutient en musique (l'aura) et a ses gros coups de spectacle (Soliste). Le kit transposé tel quel (aura 1 et Soliste ×3, attaque 2 à 4) gagnait **82,3 %** ; la barde nue, 7,6 %. Chaque compétence sur une face pèse lourd : Ouverture et aura font chacune plus de 20 points. Les kits essayés : sans Ouverture, aura 1 / Soliste ×2 : 54,8 % (Ysolde 65,5 %, à la limite) ; avec critique 5 % : 50,8 % ; Siffloter 1 / Soliste ×2 : 61,5 % ; Fausse note 1 / Soliste ×2 : 72,6 % ; Siffloter / Fausse note (tout en soutien) : 75,5 % ; avec l'Ouverture et l'attaque 1 à 3 : aura / Soliste ×2 46,6 %, **aura / Soliste ×3 55,2 %** (retenu : l'Ouverture gardée, un seul levier, le plus gros coup de spectacle), le même à 5 % de critique 52,1 %.
- **Pourquoi l'Aura mélodieuse en signature** : en campagne, la signature est seule et l'Ouverture (pas une face) n'y est pas. Mesurées seules, attaque 1 à 3, contre le roster : aura **16,9 %**, Soliste 6,0 %. L'aura est aussi ce qui fait passer ses petits coups contre l'armure, l'intimidation et les épines (la raison de l'Ouverture en 0.41.0), et le statut que l'Ouverture pose : son identité depuis la 0.41.0.
- **Mesures** (`BALANCE_N=800 npm run balance`) : 49,5 → **55,2 %** (± 1,1), 13,1 → 12,4 tours par combat ; duels de 47 % (Morgrut) à 60 % (Elaria, Ervald) ; valeurs nettes : Ouverture +26,1 → +22,5, Aura mélodieuse +5,3 → **+31,9**, Soliste +3,5 → **+18,2** ; apport de l'Aura mélodieuse 12,4 → 21,3 PV par combat. Les autres personnages ne changent qu'à travers leur duel contre elle (de 47,9 à 51,4 %).

**Personnalité : l'artiste de foire.**
- **Qui elle est** : joyeuse, cabotine, moqueuse sans méchanceté. Pour elle, le combat est un numéro ; ce qui compte, c'est le public.
- **Comment elle se bat** : deux dés, deux mains, un rythme. Elle frappe vite et léger, et quand les dés s'accordent, c'est la musique qui frappe (les doubles). Son aura est là dès son entrée en scène : elle ne rate jamais son arrivée.
- **Pistes** : réagir au public ou aux paris, enchaîner (un double qui en prépare un autre), un rappel en fin de combat.

- **Stats** : PV 46, 2 × d6, attaque 1 à 3 (DP), armure 0, esquive 6 %, critique 10 % ×2 (phase 5 ter).
- **Mesures** : 55,2 % (phase 5 ter, 800 combats par duel). Duels de 47 à 60 %.

### Mélisande · Ménestrelle · retiré en 0.43.0

> « Elle chante juste, et frappe plus juste encore. »

- **Stats** : PV 48 (+2), esquive 8 % (−4).
- **Teinte** : `hue-rotate(150deg) saturate(1.2) brightness(0.95)` (turquoise et vert), vue à l'écran.
- **Mesures** : 51,2 % (0.41.0 ; 54,8 % avec +4 PV). Duels de 38 à 61 %, sauf contre Brokk (35 %, à la limite, contre connu).

---

**0.45.0, aura et Fausse note à 2 charges** (note de l'utilisateur : description de l'aura peu claire). Le double 3 pose 2 charges d'Aura mélodieuse, le double 2 deux charges de Fausse note (le prochain coup adverse qui touche perd 10). À une charge, ces deux doubles coûtaient des victoires (−1,0 à −1,3) : ils remplacent deux coups. Après : Aura mélodieuse **+2,0 et +2,5**, Fausse note **+0,8 et +0,5** (encore « presque inutile »). Fanchon et Mélisande à **54,5 %**. Les textes n'emploient plus « dégâts finaux » : « ajouté après l'armure : rien ne le réduit ». Une Fausse note qui frappe aussi ses deux coups montait à +3,9, mais, avec l'aura, les bardes passaient à 57-58 %.

**0.46.0, Siffloter et Fausse note frappent aussi** (audit) : le double 1 et le double 2 gardent leurs deux coups en plus de leur effet. Siffloter +0,7 → **+3,3**, Fausse note +0,4 → **+4,3**. Compensation : esquive de 12 à **6 %** (sans elle, 60,5 %) ; Fanchon 54,3 → 54,6 %. L'**Ouverture** (+27, « écrasante ») est gardée : c'est son identité (sans elle, 28 % ; avec tous les doubles qui frappent, 38 %). Sur tout double, un « ding » (Pile réussie) joue en même temps que les dés.

## Revue des compétences (0.107.0, 2026-10-24)

Décision et mesures : [SORTS.md](SORTS.md) § 19, « Livraison (0.107.0) ». Par personnage (800 combats par duel, avant → après) :

| Personnage | Compétences touchées | Stats (la compensation) | Victoires |
| --- | --- | --- | --- |
| Gorak | Pourfendre : Saignement de la moitié des PV retirés | critique 19 → 14 % | 50,1 → 52,3 % |
| Elaria | (Aura de précision hors kit : +5 % de critique) | — | 47,9 → 50,5 % |
| Brokk | (Aura d'intimidation hors kit : −1) | — | 50,9 → 52,0 % |
| Ervald | Vol de vie : 1 charge | critique 16 → 24 % | 49,2 → 46,8 % |
| Ysolde | Aura de sainteté : 1 PV par charge, 2 au plus ; (Peur hors kit : une fois par combat) | attaque 4–6 → 5–7 | 48,8 → 48,4 % |
| Naraxes | signature : Aura de décoction (1 Poison) ; Pile ou face ×3 ; (Coup de chance greffé) | attaque 4–5 → 5–6 | 51,4 → 54,3 % |
| Aldric | Rétribution : la moitié des jauges | attaque 3–5 → 4–6 (compensation proposée par le § 19) | 49,9 → 51,1 % |
| Morgrut | — | — | 48,5 → 49,1 % |
| Thaldrin | (Aura sauvage hors kit : +1 à l'attaque) | — | 48,2 → 48,1 % |
| Fanchon | Soliste : une fois par combat ; (Crescendo hors kit : monte) | esquive 6 → 10 % | 55,2 → 47,5 % |

Pire duel : Elaria contre Morgrut, 61,9 %. La matrice ci-dessous date encore de la 0.106.0 ; celle de la 0.107.0 est dans `logs/balance/2026-10-24-01-14-36_v0.106.1.md`.

## Matrice des duels

Taux de victoire de la ligne contre la colonne. Règles 0.106.0 (l'attaque de base), 800 combats par duel (`BALANCE_N=800 npm run balance`, `logs/balance/`).

| | Gorak | Elaria | Brokk | Ervald | Ysolde | Naraxes | Aldric | Morgrut | Thaldrin | Fanchon | **Global** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Gorak** | — | 44 % | 49 % | 50 % | 56 % | 50 % | 48 % | 54 % | 51 % | 53 % | **50,5 %** |
| **Elaria** | 56 % | — | 47 % | 47 % | 42 % | 50 % | 42 % | 62 % | 45 % | 49 % | **48,9 %** |
| **Brokk** | 51 % | 53 % | — | 51 % | 52 % | 46 % | 51 % | 48 % | 55 % | 57 % | **51,5 %** |
| **Ervald** | 50 % | 53 % | 49 % | — | 49 % | 41 % | 55 % | 57 % | 50 % | 45 % | **49,8 %** |
| **Ysolde** | 44 % | 58 % | 48 % | 52 % | — | 50 % | 46 % | 44 % | 56 % | 45 % | **49,1 %** |
| **Naraxes** | 51 % | 50 % | 54 % | 59 % | 51 % | — | 52 % | 54 % | 49 % | 52 % | **52,2 %** |
| **Aldric** | 52 % | 58 % | 49 % | 45 % | 54 % | 48 % | — | 56 % | 43 % | 47 % | **50,3 %** |
| **Morgrut** | 46 % | 38 % | 52 % | 43 % | 56 % | 46 % | 44 % | — | 59 % | 55 % | **48,8 %** |
| **Thaldrin** | 49 % | 55 % | 45 % | 50 % | 44 % | 51 % | 57 % | 41 % | — | 51 % | **49,4 %** |
| **Fanchon** | 47 % | 51 % | 43 % | 55 % | 55 % | 48 % | 53 % | 45 % | 49 % | — | **49,5 %** |

À refaire après tout changement de stats, d'événement ou de règle. Le test `balance.test.ts` vérifie le global ; cette matrice sert à repérer les duels déséquilibrés.

---

## Ajouter un personnage : check-list de design

- [ ] Sa personnalité, en trois points (qui il est, comment il se bat, pistes), écrite avant ses compétences : voir « Personnalité ».
- [ ] En une phrase, comment il gagne et comment il perd. Sa place doit être distincte de celle des personnages existants.
- [ ] Ses stats sont dérivées de l'archétype de sa race, ou une nouvelle race est définie avec son événement.
- [ ] Son événement (ou celui de sa race) prolonge son identité.
- [ ] La fiche courte est écrite dans `roster.ts` (`lore`), et sa section ajoutée ici : fantasy, stats, comment il gagne et perd, mesures, décisions.
- [ ] La matrice des duels est remesurée (`npm run balance`), avec un global entre 42 et 58 %, aucun duel au-delà de 65/35, selon la méthode d'[EQUILIBRAGE.md](EQUILIBRAGE.md).
- [ ] L'image respecte `docs/STYLE_BIBLE.md`. Sur fond uni, elle se détoure avec `scripts/cutout-character.py`.
- [ ] Facultatif : ses cinq postures communes (attaque, esquive, coup encaissé, K.O., victoire), générées en planches avec la garde en première case et découpées par `scripts/slice-poses.py` ([POSTURES.md](POSTURES.md)).
