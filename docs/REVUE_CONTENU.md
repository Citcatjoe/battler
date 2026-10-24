# Revue des compétences, des statuts et des reliques (2026-10-24, version 0.109.0)

_Demandée par l'utilisateur avant d'ajouter du contenu : « on va faire une passe sur les reliques, compétences, statuts : l'occasion de vérifier au cas par cas le fonctionnement, comment se passe la résolution avec des effets concurrents et, au niveau de l'animation, quelle animation va avec quoi. » Règle d'écriture qu'il a fixée (2026-10-24) : une description est courte, simple, et porte le fonctionnement, au niveau du code comme de la mécanique._

Méthode : trois revues menées en parallèle, en lecture seule (code, tests, documents), chaque cas douteux observé par un script jetable (combats construits, dés imposés, moments de mise en scène lus avec `stage()`), puis supprimé. Rien n'a été vu dans un navigateur ni entendu. Chaque entrée dit ce que fait l'élément, son texte actuel et un texte proposé, ses effets concurrents, ce qu'on voit et entend, ses problèmes avec leur preuve, et une proposition. **Rien n'est corrigé ici** : les corrections attendent la lecture de l'utilisateur.

## Synthèse : ce qu'il faut corriger, par gravité

### Moteur (des règles écrites que le code ne suit pas)

| # | Élément | Problème | Preuve | Proposition |
| --- | --- | --- | --- | --- |
| M1 | Furie des vents | Ses deux coups partent à la fin de toute l'action, et une seule charge part par action : sur deux jets (la barde, Coup de chance), le second dé frappe avant la Furie ; une Furie II ou deux 2 laissent une rafale pour l'action suivante (repoussée encore si la Peur fait sauter le tour). RESOLUTION § 2 veut qu'elle frappe aussitôt après son jet. | `combat.ts` (dépense de la charge, rafale en fin d'action) ; 3 306 rafales sur 6 946 retardées chez Fanchon avec la Furie gravée, 2 607 sur 6 560 chez Gorak avec la Furie II | la Furie part après chaque jet qui la déclenche, toutes ses charges d'un coup ; test et contrôle d'audit |
| M2 | Reliques de seuil (Dent de loup, Collier, Trophée, Larme) | Les seuils se lisent toujours camp 0 puis camp 1 : le défenseur passe avant l'attaquant (règle 1 de RESOLUTION § 5 : le camp actif d'abord). Plusieurs seuils passés sur un même coup partent en chaîne, chacun causé par le précédent : trace fausse, et à l'écran jusqu'à 6,6 s après le coup | `checkThresholds` (`combat.ts`) ; Collier du défenseur avant Trophée de l'attaquant, observé | le camp actif d'abord ; tous les seuils franchis marqués avant d'en jouer un, tous causés par le coup ; contrôle d'audit |
| M3 | Fausse note et Aura mélodieuse sur le même attaquant | Le plancher de 1 s'applique après chaque modificateur final : le résultat dépend de l'ordre de pose (un coup de 3 fait 1 ou 2) | `combat.ts` (dégâts finaux) | additionner les dégâts finaux, puis un seul plancher |
| M4 | Dent de loup | Vol de vie déjà à son plafond : la relique part, use sa seule charge, n'ajoute rien | théorique, 0 cas sur 384 déclenchements d'Ervald | ne partir que si elle ajoute quelque chose, ou ignorer (rare) |
| M5 | Effets de début et de fin de tour | Chaque statut agit avec ses charges du début de la phase : un futur statut qui changerait les charges d'un autre en cours de phase lirait une valeur périmée | `combat.ts` | à corriger quand un tel statut arrivera ; noté |

### Équilibre (à trancher)

| # | Élément | Constat | Proposition |
| --- | --- | --- | --- |
| E1 | Aiguiser la Furie des vents | Furie II : Gorak 51,5 → 71,6 % (+20,1 points) ; Furie III : 77,7 % (Pourfendre II : +6,0) | plafonner la Furie à 1 charge (elle ne s'aiguise plus), ou un rang n'ajoute qu'un coup tous les deux rangs |
| E2 | Aiguiser la Foudre | +2 à chacun des trois éclairs : 3 dégâts deviennent 9 (gravée puis aiguisée chez Gorak : +15,2 points, contre +6,3 pour le Souffle) | +1 par éclair et par rang, ou +2 au total |
| E3 | Feux follets | Signature de Thaldrin, ni aiguisable ni copiable | à rendre aiguisable (+1 Brûlure par rang) |
| E4 | Peur contre une Aura d'immunité | Bloquée, elle use quand même sa seule fois par combat | décider : la limite ne compte qu'un effet posé |
| E5 | Statuts sans porteur (pour plus tard) | Régénération ↔ Poison s'annulent charge pour charge (unités différentes) ; la Garde sacrée s'use avant l'opposition ; la Pourriture se cumule sans plafond ni usure | à revoir avant de leur donner un porteur |

### Textes (la description doit dire vrai, court et simple)

| # | Élément | Ce qui est faux ou trop long | Proposition |
| --- | --- | --- | --- |
| T1 | Soliste, Crescendo | « Ce coup ×3 » ne multiplie que le coup de base, alors que Pile ou face, avec les mêmes mots, triple les dégâts infligés (un 4 avec le Fer : 13 pour Soliste, 21 pour Pile ou face) | « Coup de base ×3 » |
| T2 | Rétribution | La relâche vaut la moitié depuis la 0.107.0 ; le texte ne dit pas que toutes les jauges se vident ; l'infobulle montre la somme gardée, pas ce qui partira | « Relâche la moitié de ses jauges, puis les vide » ; l'infobulle dit ce qui partira |
| T3 | Peau de pierre | « puis disparaît » : le bouclier s'use de ce qu'il absorbe | « absorbe 6, s'use d'autant » |
| T4 | Œil de faucon, Vol de vie | « le prochain coup » : ils agissent sur ce coup-ci | « ce coup » |
| T5 | Pourfendre | ne dit pas que le Saignement coule dès le coup suivant | l'ajouter |
| T6 | Aura mélodieuse | « rien ne le réduit » est faux contre une Fausse note | retirer |
| T7 | Auras de puissance et d'immunité | « non cumulable » n'est dit nulle part | l'ajouter |
| T8 | Purification | « le dernier bonus » retire le dernier statut arrivé ; un statut renforcé garde sa place | « le dernier bonus posé » et la règle dans « Bonus et malus » |
| T9 | Fiole de venin, Croc de boucher | « à la frappe » quand le Fer dit « à ce coup » pour la même mécanique | « +2 dégâts à ce coup » |
| T10 | Dé creux | « jet maximal » : le dé est un d6 | « Sur un 6 » |
| T11 | Écu cabossé | trop long | « Quand il encaisse un coup de 6 PV ou plus : +2 Armure temporaire » |
| T12 | Élan | rangé dans l'état Puissance (« Ses coups font plus de dégâts ») alors qu'il ne vaut qu'un coup ; le mot « élan » nomme déjà le mouvement d'attaque (MISE_EN_SCENE, RESOLUTION) | un nom propre (ex. « Ferveur ») et l'état Coup gâché/Puissance à revoir |
| T13 | Druide | « ne lance aucun sort » en ours, alors qu'une compétence gravée part aussi en ours | « ne lance que ses gravures » |
| T14 | Fiches de Gorak et d'Ervald | critique 19 % et 16 % au lieu de 14 % et 24 % | corriger le texte de leurs forces |
| T15 | Résumés longs et accords | Épines, Décoction, Coup de chance, « 1 dégâts » (Foudre), Feux follets, Souffle, Ouverture, Sifflotement (+2 par charge contre +2 par tour) | textes courts proposés dans les entrées |

### Écran et son (ce qu'on voit ne dit pas ce qui se passe)

| # | Élément | Problème | Proposition |
| --- | --- | --- | --- |
| A1 | Encens de l'abbaye | L'Élan apparaît 2,4 s après un soin de Vol de vie, après la Riposte, au lieu du milieu du coup : sa cause (le soin) n'est pas lue comme une réaction au coup | compter l'étape de soin du coup parmi ses réactions |
| A2 | Larme de givre, Purification | « Rien à purifier » flotte à côté du soin ou sous la lumière | le taire, comme `quietPurges` pour les compétences |
| A3 | Reliques du défenseur (Dent, Collier, Larme, Géode, Écu) | leur label est « − » et joue « Malus reçu » en même temps que « Bonus gagné » ou le soin | **à trancher** : « + » pour un bonus gardé pour plus tard |
| A4 | Aura de puissance ou d'immunité reposée | rejoue « Aura gagnée » et le signal sans rien changer | rien quand rien ne change |
| A5 | Pile ou face, Furie des vents | leur statut de mécanisme joue « Bonus gagné » et fait flotter le nom ; 2,3 s entre le coup et la pièce | taire le statut de mécanisme ; resserrer la pièce |
| A6 | Foudre | le son lourd du critique, trois fois, pour 1 dégât chacun | le son d'un éclair (SONS) |
| A7 | Épines bloquées par une immunité | label « Épines acérées − » et son quand même (SONS : un effet refusé ne sonne pas) | taire |
| A8 | Emblèmes d'état | Coup gâché, Brèche, Pourriture et Luciole montrent une icône peinte au lieu d'un emblème gravé ; Vulnérable n'en a pas | une planche d'emblèmes (grammaire v12) |

### Documents en retard

SONS (« 28 compétences », la barde, Foudre à 2, Rétribution, Sainteté plafonnée à 3, la Clepsydre), STATUTS (Fausse note dans Affaibli, empilement de la Peur), RESOLUTION (Fiole à « 3 Poison »), RELIQUES § 11 et § 13 (icônes, lecture de la Fiole chez Naraxes à remesurer), le Colosse dit « peu d'esquive » (il n'esquive jamais avec sa Cotte), `validateRoster` ne contrôle pas les compétences hors kit.

### Vérifié conforme

Poison et Aura glaciale en début de tour ; Brûlure en fin de tour après les soins (bonus avant malus) ; bouclier, intimidation et armure dans l'ordre ; Vol de vie avant Riposte ; la Peur fait perdre l'action, Coup de chance attend l'action suivante ; aucune purge ne touche un mécanisme ; un statut gagné pendant un coup sert le coup suivant (règle 9) ; la pièce sur pile passe une Esquive améliorée ; Fer, Fiole, Croc, dorure, critique et Élan s'empilent dans l'ordre (13 × 2 = 26, puis +1) ; Écu, Géode et Cotte ; la Plume part sur un critique assuré de la Cloche ; le Chapelet agit avant la perte d'action de la Peur ; chaque dé lu seul (barde, Furie).

---

## Revue des compétences (0.109.0, branche `regles-v2`)

Périmètre : les 30 compétences de `ALL_SKILLS` (kits et hors kit, Ouverture comprise) et les trois relations au coup de base. Méthode : lecture de `combat.ts`, `statuses.ts`, `events.ts`, `forge.ts`, `staging.ts`, `specials.ts`, `cues.ts`, `narration.ts`, `rules.ts`, et combats construits par un script jetable (`testCharacter`, dés imposés, `stage()` pour les cues), supprimé ensuite. Les textes cités sont ceux que produit `describeSkill` (compendium, infobulle du dé, aperçu de forge). Les mesures sont faites sur les combats de `duelFight` (mêmes graines que `npm run balance`), 400 par adversaire, soit 3 600 combats.

Aucun fichier du jeu n'a été modifié.

---

### A. Les trois relations

#### Greffe (défaut, `relation` absente)
- **Fait** : `jet()` tire le dé ; s'il existe une compétence greffée prête (`ready(…, 'graft')` : forme, `limit`, `when`), il émet une étape `roll`, puis `fireGrafts` (compétences seules, ordre de définition), puis `strikeOnce` au dé déjà tiré (`preset`). L'état de référence du coup (`strikeBase`) est pris **après** la greffe (`combat.ts:1074`) : ce qu'elle pose réagit au coup du même jet.
- **Effets concurrents** :
  - Œil de faucon : le Critique assuré posé rend critique le coup de ce jet (observé : « CRITIQUE ASSURÉ ! hk frappe 5 ×2 »). Si ce coup est esquivé, la charge reste, parce que `resolveAttack` sort avant de lire `forcesCrit`. C'est conforme à la règle.
  - Vol de vie : le coup du même jet draine (observé : soin de 5 PV à l'impact). Esquivé, la charge est perdue (`combat.ts:1084`).
  - Purification : la purge passe **avant** le coup, donc elle retire l'Esquive améliorée adverse avant le coup qui suit. Observé : l'esquive est retirée, puis le coup de 5 touche. Elle retire aussi la Fausse note que porte Ysolde avant son propre coup. Cette synergie de la greffe est cohérente avec la règle, mais aucun texte ne la signale.
  - Aura de puissance, de précision, de décoction, mélodieuse : l'aura posée agit déjà sur le coup du jet. Observé : « powerAura +2 » dès le jet qui la pose.
  - Rétribution : la relâche passe d'abord, puis le coup de base part. Le coup du paladin ne remplit pas ses propres jauges.
  - La règle 9 est respectée : ce qui est posé pendant les fenêtres du coup attend le coup suivant.
- **À l'écran** : M10. Le dé se pose, le dé de la compétence pulse, un battement, le signal, l'effet, puis le coup sans nouveau roulement (observé pour Œil de faucon et Vol de vie). Conforme.
- **Problèmes** : aucun dans la mécanique. Côté texte, le mot « prochain » trompe sur les greffes qui servent le coup du jet même (Œil de faucon, Vol de vie : voir ces fiches).
- **Proposition** : dans les textes des greffes qui servent le coup du jet, dire « ce coup », pas « le prochain coup ».

#### Modifie (`relation: 'modify'`)
- **Fait** : le coup de base part. `baseHit` applique `hitMultiplier` dès le jet (Soliste ×3 ; Crescendo ×(2 + déclenchements), en lisant `fired`). Si le coup touche, la compétence part dans la fenêtre de sa face (`fire`, `combat.ts:805`), avant `hit`, `crit` et `hurt`. `fired` ne monte que si elle part, donc un coup esquivé ne compte pas pour `limit` ni pour la montée de Crescendo.
- **Effets concurrents** :
  - Valeur multipliée : `drawn × N + reliques + dorure`, puis le critique (`combat.ts:428-433`). Observé : Soliste gravé sur le 4 avec le Fer à quatre clous et un critique, sur un coup de base de 3, donne (3×3 + 4) × 2 = 26.
  - Pourfendre lit `strike.dealt`, c'est-à-dire les PV après l'armure, les boucliers et les dégâts finaux, relique comprise. Observé : un coup de 3 + 4 (Fer) = 7 pose un Saignement de 4.
  - Pile ou face multiplie les **PV retirés** (`tossCoin`, `extra = dealt × 2`), donc tout ce qui précède : critique, auras, armure, boucliers, Aura mélodieuse.
  - Esquive améliorée du défenseur : le coup est esquivé, la compétence ne part pas et `limit` n'est pas entamée (observé pour Soliste, conforme à RESOLUTION § 3 bis).
- **À l'écran** : M11. Le dé de la compétence pulse à l'impact. Soliste et Crescendo sont muets (observé : seul le Coup sonne, et le journal ajoute « Coup ×3 ! »).
- **Problèmes** : **le même texte, « ce coup ×3 », recouvre deux règles différentes** (voir Soliste et Pile ou face). Exemple chiffré sur le 4 avec le Fer et un coup de base de 3 : Soliste donne 9 + 4 = 13, Pile ou face donne (3 + 4) × 3 = 21.
- **Proposition** : écrire « coup de base ×3 » pour Soliste et Crescendo, et garder « ce coup ×3 » pour Pile ou face, qui triple bien les PV retirés.

#### Remplace (`relation: 'replace'`)
- **Fait** : `jet()` voit une compétence qui remplace prête, puis appelle `strikeOnce(…, replaced)` : pas de valeur, ni esquive, ni critique. Seules les fenêtres du dé s'ouvrent, et **toutes** les compétences de la face y partent (`strike.replaced`). La Furie pose `windFury`. Ses coups ne partent pas dans le jet : ils partent dans `burst()`, appelé **une fois, à la fin de l'action** (`combat.ts:1229` : `action(attacker) ?? burst(attacker)`). `burst` ne consomme qu'**une** charge (`combat.ts:1154`).
- **Effets concurrents** :
  - Un jet remplacé ne consomme ni l'Esquive améliorée, ni la Riposte, ni les Épines, ni le Saignement ; les coups bruts, eux, les consomment. Observé : premier coup brut esquivé à coup sûr, second coup touché.
  - Les reliques de face et la dorure lisent les dés bruts. Observé : le Fer donne +4 sur un 4 de Furie.
- **À l'écran** : M10 et M27. Les dés de la Furie apparaissent à plat, en `FLURRY_CHAIN_HOLD`.
- **Problèmes** : **bug**. Le principe « tout de suite, juste après le jet en cours » (RESOLUTION § 2, lignes 79-82 ; `StatusDef.instantStrikes`) n'est vrai que pour une action à un seul jet et à une seule charge. Voir la fiche de la Furie des vents.
- **Proposition** : voir la Furie des vents.

---

### B. Les compétences

#### Pourfendre (cleave)
- **Fait** : face 1 de Gorak, relation « modifie ». Si le coup touche, l'adversaire reçoit un Saignement égal à `ceil(PV retirés × 0,5)`, plus 1 par rang d'aiguisage.
- **Texte actuel** : « S'il touche, Saignement à l'adversaire : la moitié des PV que ce coup retire, arrondie au-dessus. » · modifie son coup
- **Texte proposé** : « S'il touche : Saignement sur l'adversaire, la moitié des PV retirés (arrondie au-dessus). Il coule dès le coup suivant. »
- **Effets concurrents** :
  - La plaie est posée dans la fenêtre `naturalOne`, avant `hit` et `hurt` : elle ne coule pas sur ce coup (règle 9, M15). C'est voulu.
  - Une Peau de pierre, une intimidation ou une Fausse note portée par Gorak réduisent les PV retirés, donc la plaie.
  - Le Fer et la dorure, s'il est gravé sur une face qui en porte, la grossissent (observé : 7 PV retirés donnent un Saignement de 4).
  - La Riposte et les Épines du défenseur partent ensuite, dans `hurt`.
- **À l'écran** : le Coup sonne à l'impact, le dé de la compétence pulse à l'impact, le texte « Saignement » apparaît sur la cible à l'impact, puis Malus reçu 120 ms plus tard (`RIDE_CUE`, M14). Observé, et conforme.
- **Problèmes** : texte. Le chemin `fromHit` de `describeEffect` (`events.ts:225-226`) sort avant l'ajout de « , dès le coup suivant » (`events.ts:308`). La règle de la plaie, que porte le code et que cite `rules.ts` (« hit-relations »), manque donc au texte de la compétence.
- **Proposition** : ajouter « dès le coup suivant » sur le chemin `fromHit`.

#### Furie des vents (wind-fury)
- **Fait** : face 2 de Gorak, relation « remplace ». Elle pose `windFury` (cumul `add`, sans plafond, `instantStrikes`, 2 coups bruts par charge). `burst()` ne part qu'à la fin de l'action et ne dépense qu'une charge.
- **Texte actuel** : « Deux coups de base tout de suite, sans compétence. » · remplace le coup. Résumé du statut : « … tout de suite, dans la même action, le porteur frappe deux fois… ».
- **Texte proposé** : après correction, « Pas de coup : deux coups de base tout de suite, chacun son dé, sans compétence. » Si le cumul reste permis, le texte doit lire les charges : « N coups de base ».
- **Effets concurrents** (combats construits) :
  - **La barde avec la Furie gravée**, dés 2 puis 5 : la Furie pose sa charge au premier dé, le **second dé frappe d'abord**, puis la Furie frappe (#1 remplacé, #3 coup du 5, #4 rafale de Furie).
  - **La barde, dés 2 et 2** : deux charges. Une rafale part à la fin de l'action, l'autre **à la fin de l'action suivante**, un tour plus tard (#12, de cause #4).
  - **Furie II** (aiguisée : `sharpenEffect` donne 2 charges, `forge.ts:203-204`) : deux coups maintenant, deux coups à la fin de l'action suivante.
  - **Furie II puis Peur** : la seconde rafale saute le tour perdu (la branche « contrôle » saute aussi `burst`) et part deux tours plus tard.
  - **Elaria avec Coup de chance et la Furie gravés** : la Furie du premier jet de la rafale frappe après le second jet.
  - Mesures, 3 600 combats chacune :

    | Personnage | Rafales de Furie | Dont différées |
    | --- | --- | --- |
    | Gorak, Furie d'origine | 4 390 | 0 |
    | Gorak, Furie II | 6 560 | 2 607 |
    | Fanchon, Furie gravée | 6 946 | 3 306 |
    | Elaria, Coup de chance et Furie gravés | 5 068 | 651 |
- **À l'écran** : le dé pulse, le texte « Furie des vents » apparaît sur Gorak avec Bonus gagné, puis les dés à plat et un Coup par coup (observé). Une rafale différée a pour cause une étape `event` d'un tour précédent : `stage` la range dans un **moment à part**, et `chained` (`staging.ts:1100`) la montre à plat, sans nom, sans « Dé lancé » ni « Dé posé ». Observé : moment 4, « Furie des vents · Gorak frappe 2 fois ! », puis deux Coups. Deux coups surgissent à la fin d'un tour sans cause visible.
- **Problèmes** :
  1. **Bug**, en contradiction avec RESOLUTION § 2 (« frappe juste après le jet en cours, dans la même action ») : la rafale attend la fin de l'action, et une seconde charge attend l'action suivante, tour perdu compris.
  2. **Texte ≠ code** : `windFury.describe` (`statuses.ts:446`) et son badge « ×2 » ignorent les charges. L'aperçu de forge (`ForgeFaceTooltip`) montre « Furie des vents → Furie des vents II » avec un texte inchangé.
  3. **Équilibre** : un rang d'aiguisage double la Furie. Gorak passe de 51,5 % à 71,6 % (+20,1 points) avec Furie II, et à 77,7 % avec Furie III. Pourfendre II ne donne que +6,0 points (57,5 %). Sans rang maximal (décision du 2026-10-23), la Furie s'aiguise sans fin, parce que son statut cumule sans plafond.
- **Proposition** :
  - Lancer `burst` après **chaque jet**, et non une fois par action : `jet(…) ?? burst(…)` dans la boucle de `action` et pour le jet simple.
  - Dépenser toutes les charges à la fois (`extraStrikes × stacks`), ou plafonner `windFury` à 1 (`maxStacks: 1`). Avec une rafale par jet, un plafond de 1 ne perd plus aucune Furie, même sur deux 2 de la barde, et la face ne peut plus être aiguisée (`targetsIn('sharpen')`).
  - Le plafond à 1 est le levier le plus simple contre les +20 points. Il retire l'aiguisage de la signature de Gorak : c'est une décision à faire valider par l'utilisateur.
  - Ajouter le test « Furie gravée sur la barde : la rafale suit le jet qui la pose » dans `combat.test.ts`, et le contrôle « une rafale de Furie a sa cause dans le même tour » dans `audit.ts`.

#### Aura de puissance (power-aura)
- **Fait** : hors kit de Gorak, face 3, greffe. Elle pose `powerAura` (`refresh`, plafond 1) : +2 sortants après le critique, avant l'intimidation et l'armure.
- **Texte actuel** : « Ses coups infligent 2 de plus, après le critique et avant l'armure, pour le reste du combat. » · aura permanente
- **Texte proposé** : « Ses coups font +2, après le critique et avant l'armure. Non cumulable. » · aura permanente
- **Effets concurrents** : ordre vérifié avec l'Aura sauvage, la puissance, le critique, l'intimidation, l'armure, la Peau de pierre et l'Aura mélodieuse. Coup de base de 3, critique ×2 : 6, puis +2 (8), −2 d'intimidation (6), −1 d'armure (5), le bouclier en prend 4 (1), +1 mélodieuse : **2** (observé, #16). Conforme à RESOLUTION § 3. Elle s'applique à chaque coup brut de la Furie.
- **À l'écran** : Aura gagnée et texte flottant. **Reposée alors qu'elle est déjà là**, elle rejoue Aura gagnée, le texte et le journal « reçoit Aura de puissance » (observé, moment 3), parce que `resolveApplication` compte `gained = 1` pour un statut `refresh` (`statuses.ts:1032`). `atCap` ne la voit donc pas au plafond, et M25 ne couvre que les auras cumulables.
- **Problèmes** :
  - Écran : un effet nul est joué comme un gain.
  - Texte : « non cumulable » manque. `describeSkill` n'ajoute une pastille de plafond que si `maxStacks > 1` (`events.ts:318`), et la règle « Auras » (`rules.ts:177`) dit « Chaque charge renforce l'effet ».
- **Proposition** :
  - Traiter comme « au maximum » un statut `refresh` déjà présent dont ni les charges ni la durée ne changent (`resolveApplication` : `gained: 0`, ou un drapeau). Étendre M25 aux auras non cumulables.
  - Ajouter la pastille « non cumulable » quand `maxStacks === 1`.
  - Corriger la règle « Auras » : « Une aura cumulable gagne en force à chaque charge ».

#### Œil de faucon (hawk-eye)
- **Fait** : face 1 d'Elaria, greffe. Elle pose 1 Critique assuré (`add`, sans plafond), qui se consomme sur un coup qui touche.
- **Texte actuel** : « Le prochain coup qui touche est critique. »
- **Texte proposé** : « Ce coup est critique ; s'il est esquivé, le prochain qui touche. »
- **Effets concurrents** :
  - Il rend critique le coup du même jet (greffe).
  - Contre une Esquive améliorée, le coup est esquivé et la charge attend. Le multiplicateur est celui du moment : ×3,4 avec l'Aura de précision.
  - La valeur multipliée comprend le Fer et la dorure.
  - Deux charges sont possibles (deux 1 de la barde gravée).
- **À l'écran** : signal, Bonus gagné, texte « Critique assuré » sur Elaria, puis à l'élan les labels « Critique assuré » et « Critique ×2 » avec le ding, puis Coup critique à l'impact (observé). Conforme à M8, M16 et SONS § 4.4.
- **Problèmes** : texte. « Le prochain coup » laisse croire au coup suivant, alors que c'est celui de ce jet.
- **Proposition** : le texte proposé.

#### Esquive améliorée (evasion)
- **Fait** : face 2 d'Elaria, greffe. Elle pose 1 `evasion` (`add`), qui esquive à coup sûr le prochain coup reçu, une charge par esquive, sans tirage.
- **Texte actuel** : « Esquive à coup sûr le prochain coup reçu. »
- **Texte proposé** : garder.
- **Effets concurrents** :
  - Elle ne consomme rien sur un jet remplacé, sur une pièce tombée sur pile ni sur des dégâts directs (Foudre, Rétribution, Riposte).
  - Sur une Furie, elle prend le premier coup brut (observé).
  - Elle passe avant le critique : un Critique assuré adverse reste en attente.
  - Le Vol de vie adverse perd sa charge sur l'esquive.
  - La Purification greffée l'enlève avant le coup adverse (observé).
- **À l'écran** : Bonus gagné à la pose. Sur le coup adverse, le label « Esquive assurée » (signe −, Malus reçu) tombe avec le dé posé, puis le son Esquive. Conforme à M8.
- **Problèmes** : aucun.
- **Proposition** : aucune.

#### Aura de précision (precision-aura)
- **Fait** : hors kit d'Elaria, face 3, greffe. Par charge : +5 % de critique et +1 au multiplicateur (`modifyStats`, cumul `add`).
- **Texte actuel** : « +5 % de critique et +1 au multiplicateur de critique, pour le reste du combat. » · aura permanente
- **Texte proposé** : garder.
- **Effets concurrents** : elle s'applique au coup du jet (greffe). Un critique assuré prend le multiplicateur effectif. Pile ou face triple ensuite les PV retirés, critique compris.
- **À l'écran** : Aura gagnée. Le label « Critique ×3,4 » montre le multiplicateur effectif.
- **Problèmes** : aucun.
- **Proposition** : aucune.

#### Peau de pierre (stoneskin)
- **Fait** : face 1 de Brokk, greffe. Elle pose un bouclier de 6 (`add`). Il absorbe après l'armure sans descendre sous 1 dégât, et **s'use d'autant** (`consumeStatus(…, absorbed)`).
- **Texte actuel** : « Un bouclier de 6 points : absorbe les dégâts après l'armure (le coup garde au moins 1), puis disparaît. »
- **Texte proposé** : « Bouclier de 6 : absorbe les dégâts après l'armure (le coup garde au moins 1), et s'use d'autant. Se cumule. »
- **Effets concurrents** :
  - Coups de 4 : le bouclier passe de 6 à 3 puis à 0 (observé, #3 et #5). Il dure donc plusieurs coups.
  - Il ne retient rien d'une pièce tombée sur pile, de la Rétribution, de la Riposte ou du Saignement.
  - Il réduit les PV retirés, donc ce que lisent le Vol de vie, la Riposte, les jauges et Pourfendre de l'adversaire.
  - L'Aura mélodieuse s'ajoute après lui.
- **À l'écran** : Bonus gagné. Sur le coup adverse, le label « Armure temporaire −N » (signe −) tombe à l'impact. Conforme.
- **Problèmes** : texte ≠ code. « puis disparaît » (`bonusArmor.describe`, `statuses.ts:288`) est faux : il disparaît seulement épuisé. Le résumé du statut, lui, est juste (« puis s'épuise »).
- **Proposition** : le texte proposé.

#### Épines acérées (thorns)
- **Fait** : face 2 de Brokk, greffe. Elle pose 1 `thorns` (`add`, permanent). Chaque coup qui touche le porteur, pièce sur pile comprise, pose sur l'attaquant 1 Saignement par charge d'épines.
- **Texte actuel** : « Chaque coup encaissé pose 1 charge de Saignement sur l'attaquant, pour le reste du combat. »
- **Texte proposé** : « Épines permanentes : chaque coup qui le touche pose 1 Saignement sur l'attaquant. Se cumulent. »
- **Effets concurrents** :
  - Chaque coup brut de Furie la déclenche, une pièce sur pile aussi (observé, #31).
  - L'Aura d'immunité adverse la bloque. Elle ne réagit ni à une esquive ni à un jet remplacé.
  - Dans `hurt`, elle part après la Riposte si celle-ci a été posée avant (ordre de pose).
- **À l'écran** : Bonus gagné. Réaction : label « Épines acérées » (signe −), texte « Saignement » sur l'attaquant, Malus reçu (observé). Le son du label se tait, parce que l'effet joue déjà Malus reçu (SONS § 4.4, règle 5).
- **Problèmes** : texte. « pour le reste du combat » semble porter sur le Saignement, qui s'estompe, alors qu'il porte sur les épines.
- **Proposition** : le texte proposé.

#### Aura d'intimidation (intimidation-aura)
- **Fait** : hors kit de Brokk, face 3, greffe. −1 par charge sur les coups adverses (`modifyIncoming`, `add`), après le critique et avant l'armure.
- **Texte actuel** : « Les coups de l'adversaire lui infligent 1 de moins, après le critique et avant l'armure, pour le reste du combat. » · aura permanente
- **Texte proposé** : « Les coups adverses lui font −1, après le critique et avant l'armure. Se cumule. »
- **Effets concurrents** :
  - Elle compte après la puissance, l'Élan et la Force de l'ours, et avant l'armure, avec un plancher à 1 (observé).
  - Elle ne réduit ni une pièce sur pile, ni les dégâts directs, ni l'Aura mélodieuse.
  - Elle rogne chaque coup brut de Furie et chacun des deux dés de la barde.
- **À l'écran** : Aura gagnée. Rien par coup, ce qui est conforme à RESOLUTION § 11, règle 5 (une aura n'est pas une surcharge).
- **Problèmes** : aucun.
- **Proposition** : raccourcir.

#### Vol de vie (life-steal)
- **Fait** : face 1 d'Ervald, greffe. Elle pose 1 `lifesteal` (`add`, plafond 2). Sur un coup qui touche, pièce sur pile comprise, le porteur regagne les PV retirés et use une charge. Esquivé, la charge est perdue.
- **Texte actuel** : « Son prochain coup lui rend les PV qu'il retire (perdu si le coup est esquivé). » · Vol de vie : 2 charges au plus
- **Texte proposé** : « Ce coup lui rend les PV qu'il retire (esquivé, rien). » · Vol de vie : 2 charges au plus
- **Effets concurrents** :
  - Il draine le coup du jet (greffe).
  - À PV pleins, la charge part pour un soin de 0 (observé, #3).
  - Avec deux charges, le coup et la pièce sur pile drainent chacun.
  - Il passe dans `hit`, avant la Riposte et les Épines du défenseur (`hurt`). Un coup brut de Furie l'use. Un jet remplacé ne l'use pas.
- **À l'écran** : à l'impact, « +N PV », le label « Vol de vie +N » avec le ding, puis Soin 120 ms plus tard (observé, M14). Conforme.
- **Problèmes** : texte. « Son prochain coup » désigne en fait le coup de ce jet.
- **Proposition** : le texte proposé.

#### Aura glaciale (frost-aura)
- **Fait** : face 2 d'Ervald, greffe. Elle pose `frostAura` (`add`). Au début de chaque tour du porteur, elle pose 1 Poison par charge sur l'adversaire.
- **Texte actuel** : « Au début de chacun de ses tours, 1 charge de Poison sur l'adversaire. » · aura permanente
- **Texte proposé** : garder.
- **Effets concurrents** : l'immunité la bloque, la Régénération s'y oppose et une purge retire le Poison. La Purification d'Ysolde peut retirer l'aura entière, toutes charges comprises.
- **À l'écran** : Aura gagnée, puis Malus reçu à chaque début de tour, et le Grésillement quand le Poison agit chez la victime.
- **Problèmes** : aucun.
- **Proposition** : aucune.

#### Souffle de la tombe (grave-breath)
- **Fait** : hors kit d'Ervald, face 1, greffe. Il pose Poison 3 sur l'adversaire (`add`).
- **Texte actuel** : « Sur l'adversaire : perd 3 PV au début de son prochain tour, puis 1 de moins à chaque tour (6 PV en tout). »
- **Texte proposé** : « Poison 3 sur l'adversaire : 3, 2, puis 1 PV au début de ses tours. Se cumule. »
- **Effets concurrents** : il se cumule avec le Poison de l'Aura glaciale et de l'Aura de décoction. Avec un poison déjà posé, « 6 PV en tout » devient faux.
- **À l'écran** : Malus reçu.
- **Problèmes** : texte, mineur. Le total suppose une cible sans poison.
- **Proposition** : le texte proposé, sans total.

#### Purification (purification)
- **Fait** : face 1 d'Ysolde, greffe. Elle retire le dernier bonus adverse, toutes charges, sauf les mécanismes ; s'il n'y en a aucun, 5 dégâts directs (Lumière). Puis elle retire le dernier malus d'Ysolde.
- **Texte actuel** : « Retire à l'adversaire son dernier bonus ; sinon, 5 dégâts directs à l'adversaire. Retire son propre dernier malus. » · dégâts directs
- **Texte proposé** : garder.
- **Effets concurrents** :
  - Greffée, elle passe **avant** le coup : elle enlève l'Esquive améliorée, la Peau de pierre ou la Riposte adverse avant que le coup d'Ysolde ne parte (observé : l'esquive est retirée, puis le coup touche). Elle enlève aussi sa Fausse note avant son propre coup.
  - Elle ne retire ni une Furie en réserve, ni les jauges, ni les statuts de forme (des mécanismes).
- **À l'écran** : à vide, le texte « Rien à purifier » apparaît sur Ysolde, puis la Lumière frappe (5, Coup), puis son coup (observé). Ce texte vient de la purge de son propre malus, mais au moment où la Lumière frappe, il se lit comme « rien à purifier chez l'adversaire ».
- **Problèmes** : écran, mineur. `quietPurges` (`staging.ts:286-291`) ne tient pas compte d'un repli `orElse` joué.
- **Proposition** : taire « Rien à purifier » quand l'étape a infligé des dégâts (repli joué).

#### Aura de sainteté (holy-aura)
- **Fait** : face 2 d'Ysolde, greffe. `holyAura` (`add`, plafond 2) rend +1 PV par charge à la fin du tour du porteur.
- **Texte actuel** : « Regagne 1 PV à la fin de chacun de ses tours, pour le reste du combat. » · aura permanente · Aura de sainteté : 2 charges au plus
- **Texte proposé** : garder.
- **Effets concurrents** : le Poison agit au début du tour et la sainteté à sa fin. Reposée au plafond, elle ne fait rien.
- **À l'écran** : Aura gagnée, puis Soin en fin de tour. Au plafond, le texte neutre (M25). La note de SONS § 4.2, règle 8, et l'exemple « Aura de sainteté à 3 » sont périmés : le plafond est de 2 depuis la 0.107.0.
- **Problèmes** : documentation (SONS § 4.2).
- **Proposition** : écrire « à 2 ».

#### Peur (fear)
- **Fait** : hors kit d'Ysolde, face 1, greffe, `limit: 1`. Elle pose `fear` sur l'adversaire (`refresh`, plafond 1, `skipsAction`).
- **Texte actuel** : « Sur l'adversaire : perd sa prochaine action, terrifié. » · 1 fois max. par combat
- **Texte proposé** : « L'adversaire perd sa prochaine action. » · une fois par combat (même bloquée)
- **Effets concurrents** :
  - **Bloquée** par une Aura d'immunité, elle **use quand même sa seule fois** : `fireEvent` compte `fired` avant de lire le résultat (`combat.ts:850`). Observé : Peur « bloquée » au tour 2, puis au tour 4 le 1 est une face nue.
  - Elle fait perdre l'action entière : les deux dés de la barde, les jets de Coup de chance (le statut est gardé) et une rafale de Furie en attente (voir la Furie).
  - Mesure : gravée sur Ervald, 3 080 Peurs sur 3 600 combats, aucune bloquée. Le cas demande une Aura d'immunité gravée ou en réserve.
- **À l'écran** : Malus reçu, puis « Tour perdu » sur la victime (M29).
- **Problèmes** :
  - Règle ambiguë. Pour Soliste, « un solo esquivé reste à jouer » (§ 3 bis) ; pour la Peur bloquée, la seule fois est perdue. Le texte ne le dit pas.
  - Documentation : STATUTS.md (ligne 166) donne la Peur en cumul `add`, le code en `refresh`.
- **Proposition** : décider, avec l'utilisateur, si une Peur bloquée compte. Soit le moteur ne compte `fired` que si `result.kind === 'applied'`, soit la pastille dit « même bloquée ». Corriger STATUTS.

#### Pile ou face (coin-flip)
- **Fait** : face 1 de Naraxes, relation « modifie ». Si le coup touche, elle pose `coinFlip` (mécanisme, `refresh`) ; la pièce part juste après les fenêtres du coup. Pile : la cible perd encore 2 × les PV retirés, en dégâts directs (DP) qui comptent comme un coup qui touche (`hit` et `hurt`). Face : rien.
- **Texte actuel** : « S'il touche, une pièce : pile, ce coup ×3 ; face, rien. » · modifie son coup
- **Texte proposé** : garder. Ici, « ce coup » est bien le coup entier, en PV retirés.
- **Effets concurrents** (observé, #25-31) :
  - Coup de 4 : la décoction empoisonne, les Épines font saigner. La pièce tombe sur pile : **8** PV de plus, la décoction empoisonne de nouveau, les Épines font de nouveau saigner.
  - La pièce prend son propre état de référence au moment où elle part (règle 9) : un Vol de vie à deux charges draine le coup puis la pièce ; une Riposte renvoie la moitié de la pièce.
  - Les jauges de Rétribution rangent la pièce (2 × les PV retirés).
  - Ni l'Esquive améliorée, ni l'armure, ni les boucliers, ni l'intimidation ne la touchent.
- **À l'écran** (observé) : impact à 1 850 ms, avec le pulse et les réactions. Puis, à **4 125 ms**, le texte « Pile ou face » apparaît sur Naraxes avec **Bonus gagné**. Puis Pièce lancée (5 425 ms), Pièce retombe, ding et « Pile ! » (6 625 ms), et enfin un coup lourd de 8 avec Coup critique (7 535 ms). Journal : « Pile ! Ce coup ×3 : X perd 8 PV ».
- **Problèmes** : écran.
  - (a) Le statut posé est un **mécanisme** (ni bonus ni malus, RESOLUTION § 4), mais `cueOf` le traite comme un bonus : Bonus gagné, et un texte qui répète le nom de la compétence au-dessus de son lanceur, contre M32. Même chose pour la Furie des vents.
  - (b) Il s'écoule 2,3 s entre l'impact et le départ de la pièce.
  - (c) « ×3 : perd 8 » : le 8 est le supplément (2×) ; le total de 12 n'apparaît nulle part.
- **Proposition** :
  - `cueOf` et `fxFloats` : ne pas jouer Bonus gagné ni répéter le nom pour un statut `mechanic: 'skill'` (le sceau le dit déjà).
  - Journal : « Pile ! Ce coup ×3 : encore 8 PV (12 en tout) ».

#### Aura de décoction (decoction-aura)
- **Fait** : face 2 de Naraxes (sa signature), greffe. `decoctionAura` (`add`) pose 1 Poison par charge sur la cible à chaque coup qui touche (fenêtre `hit`), pièce sur pile comprise.
- **Texte actuel** : « Chaque coup qui touche pose 1 charge de Poison, pour le reste du combat. » · aura permanente
- **Texte proposé** : « Chacun de ses coups qui touche (pile comprise) pose 1 Poison sur l'adversaire. »
- **Effets concurrents** :
  - Greffée, elle empoisonne déjà le coup qui la pose.
  - Chaque coup brut de Furie empoisonne.
  - Le Poison posé pendant un coup agit au début du tour de la victime.
  - L'immunité la bloque et la Régénération s'y oppose.
- **À l'écran** : à l'impact, le texte « Poison » sur la cible, puis Malus reçu un battement après (observé, M14). Conforme.
- **Problèmes** : texte. La cible manque : le texte vient de `describe` du statut, qui parle du porteur.
- **Proposition** : le texte proposé.

#### Coup de chance (lucky-strike)
- **Fait** : hors kit de Naraxes, face 1, greffe. Il pose `luckyStrike` (`add`, `strikeCharges: 'all'`). À la prochaine action, un jet complet de plus par charge, dans la même rafale.
- **Texte actuel** : « À sa prochaine action, lance un d6 en plus de son dé : un jet complet de plus, avec sa compétence et son coup de base. »
- **Texte proposé** : « À sa prochaine action, un jet de plus (son dé, sa compétence, son coup). Se cumule. »
- **Effets concurrents** :
  - Sur la barde, il donne 3 jets (observé, « flurry luckyStrike strikes=3 »).
  - Un Coup de chance relancé pendant la rafale vaut pour l'action suivante.
  - Une Peur fait perdre l'action, et le statut reste.
  - **Avec une Furie gravée**, la Furie d'un jet de la rafale attend la fin de la rafale (voir la Furie).
- **À l'écran** : Bonus gagné. À l'action suivante, les dés de plus apparaissent dans la couleur du statut (`dieColor`, M27).
- **Problèmes** : texte. « en plus de son dé » est faux pour la barde, qui en a deux.
- **Proposition** : le texte proposé.

#### Rétribution (retribution)
- **Fait** : face 1 d'Aldric, greffe, effet `release`. Elle inflige `max(1, floor(somme des jauges × 0,5))` en dégâts directs (DP), puis **vide toutes les jauges**. Les jauges (3 au plus) rangent les PV de chaque coup qui touche le porteur, pièce sur pile comprise, à condition qu'il ait l'effet `release`. Gravée sur un autre personnage, elle marche aussi.
- **Texte actuel** : « Relâche Rétribution : la moitié de ses jauges, arrondie au-dessous, en dégâts directs à l'adversaire (au moins 1). » · dégâts directs. Résumé du statut : « … les trois derniers coups qui touchent **le paladin** … ; sur un 1, il les relâche **d'un coup**. »
- **Texte proposé** : compétence : « Vide ses jauges : la moitié de leur somme (arrondie au-dessous, au moins 1) en dégâts directs à l'adversaire. » Statut : « Trois jauges gardent les PV des trois derniers coups qui touchent le porteur (pile comprise) ; sa compétence les vide. »
- **Effets concurrents** :
  - La relâche passe avant le coup du jet.
  - Ni l'esquive, ni l'armure, ni les boucliers ne la touchent.
  - Les dégâts de Riposte ne remplissent pas les jauges, la pièce sur pile oui.
  - Jauges 9 + 9 + 9 = 27 donnent 13 (observé).
- **À l'écran** : **un seul coup**, lourd s'il fait 10 ou plus (observé : 13, Coup critique). Les `parts` ne s'affichent que si toute la somme part (`combat.ts:710`), ce qui n'arrive plus avec `share`.
- **Problèmes** :
  - Texte. « la moitié de ses jauges » peut se lire « la moitié est gardée », alors que tout est vidé. Le résumé du statut est périmé (« d'un coup », « le paladin », « sur un 1 » : faux une fois gravée ailleurs).
  - Documentation. SONS § 4.1 (ligne 84), § 9.1 et § 9.2 décrivent encore « un Coup par jauge, Coup critique sur la dernière ».
- **Proposition** : les textes proposés. Mettre SONS à jour : un coup, lourd à 10 ou plus.

#### Riposte (riposte)
- **Fait** : face 2 d'Aldric, greffe. Elle pose 2 `riposte` (plafond 2). Dans `hurt`, sur chaque coup qui touche le porteur, pièce sur pile comprise, elle renvoie `round(PV retirés × 0,5)` en dégâts directs et use une charge.
- **Texte actuel** : « Ses 2 prochains coups encaissés renvoient chacun la moitié de leurs dégâts (arrondie au-dessus) à l'attaquant. » · Riposte : 2 charges au plus
- **Texte proposé** : garder. Variante plus courte : « Les 2 prochains coups qui le touchent : il renvoie la moitié des PV retirés (arrondie au-dessus). »
- **Effets concurrents** :
  - Elle renvoie la moitié des PV **retirés**, donc après l'armure, les boucliers et les auras.
  - Elle passe après le Vol de vie de l'attaquant (`hit`).
  - Elle prend les deux coups bruts d'une Furie. Elle ne réagit ni à une esquive ni à un jet remplacé.
  - Elle se refait à 2 sans gain : l'aiguisage n'est pas proposé, ce qui est cohérent.
- **À l'écran** : Bonus gagné. Réaction : label « Riposte −N » et coup en retour (Coup), au milieu de la lecture du coup (M17).
- **Problèmes** : aucun.
- **Proposition** : aucune.

#### Aura d'immunité (immunity-aura)
- **Fait** : hors kit d'Aldric, face 3, greffe. Elle purge tous ses malus, puis pose `immunityAura` (`refresh`, plafond 1) : aucun malus ne peut plus être posé sur lui, et il gagne +1 d'armure.
- **Texte actuel** : « Retire tous ses malus. Aucun malus ne peut plus être posé sur lui (les auras de l'adversaire agissent toujours), et son armure gagne 1, pour le reste du combat. » · aura permanente
- **Texte proposé** : « Retire ses malus ; plus aucun malus ne peut lui être posé ; armure +1. Non cumulable. »
- **Effets concurrents** :
  - Elle bloque la Peur, et la Peur bloquée a quand même servi (voir la Peur).
  - Elle bloque le Poison de l'Aura glaciale et de la décoction, le Saignement de Pourfendre et des Épines, la Fausse note et la Brûlure.
  - L'intimidation et la puissance adverses, qui ne sont pas des poses, agissent toujours.
- **À l'écran** : Aura gagnée. **Reposée**, elle rejoue Aura gagnée comme si elle était neuve (même cause que pour l'Aura de puissance).
- **Problèmes** : écran (reposée) ; texte (« non cumulable » absent).
- **Proposition** : comme pour l'Aura de puissance.

#### Foudre (thunderbolt)
- **Fait** : faces 1 à 3 de Thaldrin sous forme humaine, greffe. 3 éclairs de 1 dégât direct (Foudre), puis le coup de base magique.
- **Texte actuel** : « 1 dégâts directs à l'adversaire, 3 fois (3 en tout). » · dégâts directs
- **Texte proposé** : « Trois éclairs de 1 dégât direct (3 en tout). »
- **Effets concurrents** : ni esquive, ni armure, ni bouclier, ni critique, ni Riposte, ni Épines. Ce ne sont pas des coups.
- **À l'écran** : la scène `lightning`, 3 impacts, chacun avec **Coup critique** pour 1 dégât, puis le coup magique de 3 avec Coup (observé). C'est la décision « un tonnerre par éclair » (SONS § 4.3), prise quand un éclair valait 2 puis 5. Le son du coup lourd est réservé aux critiques, à la pièce sur pile et aux coups de compétence de 10 ou plus.
- **Problèmes** :
  - Texte. « 1 dégâts » : le pluriel est faux (`describeEffect`, `events.ts:221`).
  - Écran. Trois sons de coup lourd pour 3 dégâts. SONS § 4.3 dit encore « trois coups de 2 dégâts ».
  - **Équilibre**. L'aiguisage ajoute +2 **par éclair** (`sharpenEffect`, `amount + 2 × rang`) : 3 → 9 dégâts au rang II, 15 au rang III. Un seul aiguisage monte les trois faces (rang par id). Gravée sur le 3 de Gorak, elle mesure 61,5 %, puis **76,7 %** aiguisée (+15,2 points), contre +6,3 pour le Souffle de la tombe II (70,3 → 76,6 %).
- **Proposition** :
  - Corriger l'accord.
  - Faire valider par l'utilisateur un tonnerre de scène sans le son du coup lourd.
  - Pour un effet `damage` à `hits`, faire porter l'aiguisage sur le total : +2 au total, par exemple un éclair de plus. À mesurer par `npm run skills` (`SKILLS_ENGRAVE=thunderbolt`).

#### Feux follets (firefly)
- **Fait** : faces 4 à 6 de Thaldrin sous forme humaine (sa signature), greffe. Il pose Brûlure 3 (`refresh`, `turnsFromStacks`) : 3 PV à la fin de chacun des 3 prochains tours de la cible.
- **Texte actuel** : « Sur l'adversaire : perd 3 PV à la fin de chacun de ses tours, encore 3 tours. »
- **Texte proposé** : « Brûlure 3 sur l'adversaire : 3 PV à la fin de ses 3 prochains tours. Remplace la précédente. »
- **Effets concurrents** : une nouvelle Brûlure remplace l'ancienne (`refresh`) : relancée, elle ne fait que repartir à 3 tours. L'immunité la bloque.
- **À l'écran** : Malus reçu. Le médaillon compte les tours.
- **Problèmes** :
  - Texte. « remplace » n'est pas dit.
  - Équilibre et design. La signature de Thaldrin **ne peut ni s'aiguiser** (`refresh` : `targetsIn('sharpen')` ne la propose jamais) **ni se copier** (déjà sur 3 faces, plus que `MAX_COPIES`).
  - Code. L'id `firefly` sert à la fois à la compétence Feux follets et au statut Luciole, qui n'est pas en jeu : source de confusion.
- **Proposition** : le texte proposé. Signaler à l'utilisateur que la signature du druide est figée en campagne.

#### Aura sauvage (wild-aura)
- **Fait** : hors kit de Thaldrin, face 3, forme humaine, greffe. Attaque +1 par charge, au minimum et au maximum (`modifyStats`), donc avant le critique.
- **Texte actuel** : « Son attaque gagne +1 (minimum et maximum), pour le reste du combat. » · aura permanente
- **Texte proposé** : garder.
- **Effets concurrents** :
  - Elle compte avant le multiplicateur ×N de Soliste et Crescendo et avant le critique : contrairement à la puissance, elle est multipliée.
  - Gravée ailleurs, elle perd `form` (`forgedEvents`, `forge.ts:232`) et vaut sous toutes les formes.
- **À l'écran** : Aura gagnée.
- **Problèmes** : aucun.
- **Proposition** : aucune.

#### Ouverture (overture)
- **Fait** : barde, `combatStart`. Elle pose 1 Aura mélodieuse avant le premier tour. Absente en campagne (ce n'est pas une face).
- **Texte actuel** : « Chacun de ses coups qui touche fait +1, ajouté après l'armure : rien ne le réduit (se cumule). » · avant le premier tour · aura permanente
- **Texte proposé** : « Aura mélodieuse dès le début : ses coups qui touchent font +1, après l'armure. »
- **Effets concurrents** : comme l'Aura mélodieuse.
- **À l'écran** : Aura gagnée à l'ouverture, avec le journal « Compétence · Ouverture ! » (observé).
- **Problèmes** : texte. Il est identique à celui de l'Aura mélodieuse, et le fait de s'appliquer dès le début n'est porté que par la pastille.
- **Proposition** : le texte proposé.

#### Aura mélodieuse (melodious-aura)
- **Fait** : face 1 de la barde, greffe. +1 par charge en dégâts finaux (`modifyFinal`, `add`), après l'armure et les boucliers.
- **Texte actuel** : « Chacun de ses coups qui touche fait +1, ajouté après l'armure : rien ne le réduit (se cumule). » · aura permanente
- **Texte proposé** : « Ses coups qui touchent font +1, après l'armure et les boucliers. Se cumule. »
- **Effets concurrents** :
  - Elle passe après l'intimidation, l'armure et les boucliers (observé, voir l'Aura de puissance).
  - **Contre une Fausse note portée par la barde** (barde contre barde, ou Fausse note gravée), les `modifyFinal` passent dans l'ordre de pose, chacun avec un plancher à 1. L'Ouverture est posée en premier, donc la Fausse note mange son bonus : 3 + 1 = 4, puis 4 − 5, plancher **1** ; dans l'autre ordre, on aurait 2 (observé, #6).
  - Pile ou face triple les PV retirés, bonus mélodieux compris.
- **À l'écran** : Aura gagnée ; le journal du coup dit « aura mélodieuse +1 ». Pas de label sous le dé (aura).
- **Problèmes** : texte. « rien ne le réduit » est faux contre une Fausse note.
- **Proposition** : le texte proposé. Il dit où l'aura s'ajoute, sans promettre ce qui ne la réduit pas.

#### Soliste (soloist)
- **Fait** : face 2 de la barde, « modifie », `hitMultiplier: 3`, `limit: 1`. Sur ce jet, la valeur **du coup de base** est ×3, avant les reliques, la dorure et le critique. La limite ne compte que s'il touche.
- **Texte actuel** : « Ce coup ×3. » · modifie son coup · 1 fois max. par combat
- **Texte proposé** : « Coup de base ×3 (s'il touche, le solo est joué). » · une fois par combat
- **Effets concurrents** :
  - Avec le Fer et un critique : (3×3 + 4) × 2 = 26 (observé).
  - Un solo esquivé reste à jouer, et le second 2 de la même action est encore un solo.
  - Copié, il ne gagne qu'une chance de sortir plus tôt, puisque la limite est commune à l'id (`fired`). La forge le propose pourtant à la copie (`gainsNothingTwice` ignore `limit`).
  - Gravé sur une face **dorée**, la dorure (+2) n'est pas triplée. Graver sur une face dorée est permis (`isBare` ignore la dorure), dorer une face de compétence ne l'est pas : le résultat dépend de l'ordre des opérations.
- **À l'écran** : muet, comme le veut M11. Le pulse et le Coup tombent à l'impact, le journal dit « Coup ×3 ! ». Le ×3 n'apparaît jamais sur le plateau.
- **Problèmes** :
  - Texte. « Ce coup ×3 » (voir la relation « modifie ») : 13 contre 21 sur le 4 avec le Fer.
  - Forge, mineur. La copie d'une compétence limitée est proposée.
- **Proposition** :
  - Le texte proposé.
  - `gainsNothingTwice` : exclure une compétence `limit` de la copie.
  - Décider avec l'utilisateur si la dorure se pose sur une face de compétence, ou si une compétence se grave sur une face dorée, pour que les deux ordres donnent le même dé.

#### Siffloter (whistle)
- **Fait** : hors kit de la barde, face 3, greffe. Sifflotement 2 (`add`, s'estompe) : +2 PV à la fin de chacun de ses tours, une charge par tour.
- **Texte actuel** : « Regagne 2 PV à la fin de chacun de ses tours, encore 2 tours (4 PV en tout). »
- **Texte proposé** : garder.
- **Effets concurrents** : le premier soin tombe à la fin du tour même où il est posé, parce que s'estomper n'est pas soumis à « pas de décompte au tour de la pose ». À PV pleins, la charge part pour +0 (observé). La Purification adverse peut le retirer.
- **À l'écran** : Bonus gagné, puis Soin ; à PV pleins, « +0 PV » (observé).
- **Problèmes** : aucun. Le soin à PV pleins est gâché, ce qui est permis par la règle.
- **Proposition** : aucune.

#### Fausse note (false-note)
- **Fait** : hors kit de la barde, face 3, greffe. Elle pose 1 Fausse note sur l'adversaire (`add`) : −5 par charge en dégâts finaux sur son prochain coup qui touche (plancher 1), puis elle disparaît en entier (`spentOnHit`).
- **Texte actuel** : « Sur l'adversaire : son prochain coup qui touche fait 5 dégâts de moins (au moins 1), puis la note s'oublie. »
- **Texte proposé** : « Le prochain coup adverse qui touche fait −5, après l'armure (au moins 1). Se cumule. »
- **Effets concurrents** :
  - Un coup esquivé ne la consomme pas. Une pièce adverse sur pile n'est pas un `strikeOnce`, donc ne la consomme pas, mais elle triple un coup déjà réduit.
  - Elle prend le premier coup brut d'une Furie.
  - L'ordre avec l'Aura mélodieuse compte (voir cette aura). La Purification d'Ysolde la retire avant son propre coup.
- **À l'écran** : signal, Malus reçu, texte sur la cible (observé). Sur le coup adverse, le label « Fausse note −N » (signe −).
- **Problèmes** : aucun.
- **Proposition** : raccourcir.

#### Crescendo (crescendo)
- **Fait** : hors kit de la barde, face 3, « modifie », `hitMultiplier: 2`, `buildsUp`. Le coup de base est ×(2 + nombre de fois qu'il a touché).
- **Texte actuel** : « Ce coup ×2, puis ×1 de plus à chaque fois qu'il touche. » · modifie son coup
- **Texte proposé** : « Coup de base ×2, puis ×1 de plus à chaque fois qu'il touche. »
- **Effets concurrents** :
  - Sur deux dés, il monte dans la même action (×2 puis ×3, observé).
  - **Copié**, les deux faces partagent un seul compteur : ×2, ×3, ×4, ×5 en deux actions (observé). La montée est deux fois plus rapide, et le texte ne le dit pas.
  - Aiguisé, il commence à ×3.
- **À l'écran** : muet, comme Soliste.
- **Problèmes** : texte (« ce coup », comme pour Soliste).
- **Proposition** : le texte proposé.

---

### C. Constats transverses

1. **Une compétence gravée sur le druide part sous forme d'ours.** `forgedEvents` retire `form` (`forge.ts:232`). Les textes de forme sont donc faux pour un druide forgé : « Sous forme d'ours, le druide ne lance aucun sort » (`bearMight`, `statuses.ts:719`) et « chaque face … lance un sort » (`casting`). Il faut corriger ces textes, ou garder `form` sur une gravure faite chez le druide.
2. **`validateRoster` ne vérifie que `d.events`** (`roster.ts:858`), jamais `reserve`. Crescendo (`hitMultiplier`, `buildsUp`), la Peur (`limit`) et l'Aura sauvage (`form`) échappent aux contrôles. C'est mineur, mais 14 des 30 compétences sont hors kit.
3. **Documentation périmée** :
   - SONS § 4.3 : le titre annonce « 28 compétences » ; on y trouve « Attente (ogre) », la Foudre « à 2 dégâts », et aucune ligne pour la barde (Ouverture, Aura mélodieuse, Soliste, Crescendo, Siffloter, Fausse note), ni dans § 9.2.
   - La Rétribution est encore décrite « par jauge ».
   - SONS § 4.2, règle 8 : « Aura de sainteté à 3 ».
   - RESOLUTION § 2 (lignes 79-82) et `rules.ts` (« hit-relations ») disent que la Furie frappe « tout de suite ».
4. **Fiches de personnage (hors périmètre, signalé)** : Gorak, « Critiques fréquents pour un orc (19 %) », alors que `critChance` vaut 0,14 (`roster.ts:106` et 122) ; Ervald, « Critiques fréquents (16 %) », alors qu'il vaut 0,24 (`roster.ts:301` et 318).

---

### D. Tableau récapitulatif (par gravité)

| Élément | Problème | Gravité | Proposition |
| --- | --- | --- | --- |
| Furie des vents | Une rafale ne part qu'à la fin de l'action, avec une charge par action. Dans une action à deux jets (barde, Coup de chance), elle suit le dernier jet ; une seconde charge (deux 2, Furie II) attend l'action suivante, tour perdu compris. Différées : 3 306 rafales sur 6 946 (Fanchon, Furie gravée), 2 607 sur 6 560 (Gorak, Furie II). | bug | `burst` après chaque jet ; dépenser toutes les charges, ou `maxStacks: 1` ; test dans `combat.test.ts` et contrôle dans `audit.ts` |
| Furie des vents II+ | Un rang d'aiguisage double la Furie : 51,5 → 71,6 % (+20,1 points), 77,7 % au rang III. Pourfendre II : +6,0. Aucun plafond. | équilibre | `maxStacks: 1` (plus d'aiguisage), à faire valider par l'utilisateur |
| Foudre (aiguisée) | +2 par éclair × 3 : 3 → 9 dégâts. Gravée sur Gorak : 61,5 → 76,7 % (+15,2 points), contre +6,3 pour le Souffle II. Un aiguisage monte les trois faces du druide. | équilibre | Aiguisage d'un effet à `hits` sur le total (+2, un éclair de plus), à mesurer |
| Feux follets | La signature de Thaldrin ne peut être ni aiguisée (`refresh`) ni copiée. | équilibre | À faire trancher par l'utilisateur |
| Peur | Bloquée par l'immunité, elle use sa seule fois (`combat.ts:850`) ; le cas est rare (0 sur 3 080 mesurées). | équilibre / texte | Ne compter `fired` que si elle est posée, ou le dire dans la pastille |
| Furie des vents | Texte et badge ignorent les charges ; l'aperçu de forge de Furie II ne montre aucun changement. | texte | Texte qui lit les charges, ou plafond 1 |
| Soliste, Crescendo | « Ce coup ×N » ne multiplie que le coup de base, pas les reliques ni la dorure. Pile ou face, avec les mêmes mots, triple les PV retirés : 13 contre 21 sur le 4 avec le Fer. | texte | « Coup de base ×N » |
| Peau de pierre | « puis disparaît » : le bouclier s'use d'autant, 6 → 3 → 0. | texte | « et s'use d'autant » |
| Rétribution | « la moitié de ses jauges » alors que tout est vidé ; le résumé du statut est périmé (« d'un coup », « le paladin », « sur un 1 »). | texte | Textes proposés |
| Œil de faucon, Vol de vie | « Le prochain coup » alors que la greffe sert le coup de ce jet. | texte | « Ce coup … » |
| Pourfendre | « dès le coup suivant » manque (chemin `fromHit`). | texte | L'ajouter dans `describeEffect` |
| Aura mélodieuse | « rien ne le réduit » est faux contre une Fausse note portée (4 → 1). | texte | « après l'armure et les boucliers » |
| Aura de puissance, Aura d'immunité | « non cumulable » est absent ; la règle « Auras » dit que chaque charge renforce. | texte | Pastille si `maxStacks === 1` ; corriger `rules.ts` |
| Épines acérées | « pour le reste du combat » semble porter sur le Saignement. | texte | « Épines permanentes : … » |
| Aura de décoction | La cible (« sur l'adversaire ») et « pile comprise » manquent. | texte | Texte proposé |
| Coup de chance | « en plus de son dé » est faux pour la barde. | texte | « un jet de plus » |
| Foudre | « 1 dégâts » | texte | Accord au singulier |
| Feux follets | « remplace la précédente » n'est pas dit. | texte | Texte proposé |
| Souffle de la tombe | « 6 PV en tout » est faux sur une cible déjà empoisonnée. | texte | Sans total |
| Ouverture | Texte identique à celui de l'Aura mélodieuse. | texte | « Aura mélodieuse dès le début » |
| Druide forgé | « ne lance aucun sort » est faux : une gravure perd `form`. | texte | Corriger les textes de forme, ou garder `form` |
| Furie des vents (différée) | La rafale différée surgit dans un moment à part, à plat, sans nom ni dé lancé (`chained`, `staging.ts:1100`). | écran | Disparaît avec la correction du moteur |
| Aura de puissance, Aura d'immunité (reposées) | Aura gagnée, signal et texte rejoués sans aucun effet (`gained = 1` en `refresh`). | écran | Traiter comme « au maximum » ; étendre M25 |
| Pile ou face, Furie des vents | Le mécanisme posé joue Bonus gagné et fait flotter le nom de la compétence (contre M32) ; 2,3 s entre l'impact et la pièce ; « ×3 : perd 8 » sans le total. | écran | Taire les mécanismes dans `cueOf` et `fxFloats` ; journal « encore 8 PV (12 en tout) » |
| Foudre | Trois sons de coup lourd pour 3 dégâts. | écran | Tonnerre de scène sans coup lourd, à faire valider |
| Purification à vide | « Rien à purifier » apparaît pendant que la Lumière frappe. | écran | Le taire quand le repli a joué |
| Soliste (copie), Peur (copie) | La forge propose de copier une compétence limitée à une fois. | écran (forge) | `gainsNothingTwice` : exclure `limit` |
| Soliste et dorure | Graver sur une face dorée est permis, dorer une face de compétence ne l'est pas : le dé dépend de l'ordre. | écran (forge) | Règle à faire trancher par l'utilisateur |
| `validateRoster` | Les compétences hors kit (`reserve`) ne sont pas vérifiées. | texte (robustesse) | Boucler aussi sur `reserve` |
| SONS, STATUTS, RESOLUTION | Documentation périmée : SONS § 4.3 (28 compétences, barde absente, Foudre à 2, Attente), Rétribution par jauge, Aura de sainteté à 3, Peur en `add`, Furie « tout de suite ». | texte (doc) | Mettre à jour |
| Fiches de Gorak et d'Ervald | Pourcentages de critique faux (19 % pour 14 %, 16 % pour 24 %). | texte (hors périmètre) | Corriger `lore.strengths` |


---

## Revue des statuts (0.109.0, branche `regles-v2`)

Revue en lecture seule des 38 statuts de `STATUSES` (`src/game/statuses.ts`), avec leurs cas concurrents et leur mise en scène. Preuves : lecture du code (fichier:ligne) et un script jetable (`scripts/tmp-review-statuses.report.ts`, supprimé à la fin) qui a construit des combats sur mesure (`testCharacter`, `simulateCombat`, `stage`, `trayStates`). Les traces citées en sortent ; « [graine N] » renvoie à ce script. Aucun fichier du jeu n'a été modifié.

Repères du moteur utilisés partout :
- chaîne du coup : `resolveAttack` (`combat.ts:380-497`) ; usure au coup (`combat.ts:1077-1087`) ; fenêtres du coup et état de référence (`strikeBase`, `combat.ts:1097-1108`, `fire` `combat.ts:768-819`) ;
- phases de tour : `statusPhase` (`combat.ts:959-1001`), bonus puis malus, dans l'ordre de pose ;
- pose : `resolveApplication` (`statuses.ts:1000-1034`) : immunité → garde → opposition → cumul ; un mécanisme passe directement au cumul ;
- purge : `combat.ts:712-722`, jamais un mécanisme ;
- écran : `states.ts` (zone d'état), `specials.ts` (zone de surcharge), `staging.ts:1015-1096` (statusTick, statusReaction, skip).

---

### Bonus de la zone d'état

#### Critique assuré (guaranteedCrit)
- **Fait** : `forcesCrit` ; le coup qui touche est critique sans tirage, une charge par coup touché (`combat.ts:430-432`, `1077`). Esquivé ou jet remplacé : la charge reste. Cumul `add`, sans plafond.
- **Texte actuel** : « Le prochain coup qui touche est un coup critique. »
- **Texte proposé** : garder.
- **Effets concurrents** : posé par une greffe (Œil de faucon), il est présent au début du coup et le rend critique (règle 9, § 3 bis). Le multiplicateur est celui du moment (Aura de précision comprise, § 7). Une pièce sur pile n'est jamais critique (dégâts directs) : la charge n'est pas consommée par la pile. Coup brut de Furie : il en profite (même `resolveAttack`). Conforme.
- **À l'écran** : état « Critique assuré » (charges) ; label « Critique assuré » source Coup avec l'icône du critique, avant l'élan, puis « Critique ×N » (`specials.ts:111`, `137-138`) ; un seul ding par signe (SONS § 4.4 règle 4). Cohérent.
- **Problèmes** : aucun.
- **Proposition** : aucune.

#### Armure temporaire (bonusArmor)
- **Fait** : `shield` ; après l'armure, absorbe au plus `dégâts − 1` et s'use d'autant (`combat.ts:452-462`, `1079`). Cumul `add`, sans plafond (Peau de pierre 6 + 6 = 12).
- **Texte actuel** : « Un bouclier qui absorbe des dégâts après l'armure, puis s'épuise. » ; `describe` : « Un bouclier de N points : absorbe les dégâts après l'armure (le coup garde au moins 1), puis disparaît ».
- **Texte proposé** : résumé, garder ; `describe` : « Un bouclier de N points : absorbe après l'armure (le coup garde au moins 1) et s'use d'autant ».
- **Effets concurrents** : chaîne vérifiée [graine 7] : coup de 8, Aura d'intimidation 2, armure 1, bouclier 6 → 8 − 2 = 6, armure → 5, bouclier −4 → 1 PV ; bouclier restant 2 ; coup suivant : 5 − 2 → 3 PV, bouclier épuisé. Ordre § 3 (intimidation avant l'armure, bouclier après) respecté. Ni les dégâts directs (poison, saignement, Riposte, pile), ni les dégâts finaux (Aura mélodieuse) ne sont absorbés. Conforme.
- **À l'écran** : état « Bouclier » (points) ; label « Armure temporaire −4 » à l'impact, source Compétence, −, son Malus reçu (trace). Conforme à § 11.
- **Problèmes** : `describe` dit « puis disparaît » alors qu'il s'use partiellement (`statuses.ts:288`) : texte.
- **Proposition** : le texte proposé.

#### Esquive améliorée (evasion)
- **Fait** : `forcesDodge` ; le prochain coup reçu est esquivé sans tirage, une charge par esquive (`combat.ts:412-415`, `1078`). Cumul `add`.
- **Texte actuel** : « Le prochain coup reçu est esquivé à coup sûr, une charge par esquive. Se cumule : chaque charge esquive un coup de plus. Sans durée : elle attend ce coup, même si l'adversaire n'en porte pas (jet remplacé, tour perdu). »
- **Texte proposé** : « Esquive à coup sûr le prochain coup reçu, une charge par esquive. Se cumule. »
- **Effets concurrents** : Furie : une charge par coup brut (§ 7). Jet remplacé : rien n'est consommé. Pièce sur pile : jamais esquivée, même si une Esquive est présente au moment où la pièce part [graine 1 : Esquive posée par le coup, pile de 8 passe, les deux charges servent aux coups suivants] : la pile est « ce coup ×3 » d'un coup qui a déjà touché. Luciole (sans porteur) n'empêche pas l'esquive imposée. Conforme.
- **À l'écran** : état « Esquive assurée » ; porteur translucide (`look.opacity`) ; label « Esquive assurée » au dé posé, −, Malus reçu ; puis son Esquive. Conforme.
- **Problèmes** : résumé long (trois phrases pour une règle simple).
- **Proposition** : le texte proposé ; la phrase « sans durée » relève de la règle commune « Durée ».

#### Élan (momentum)
- **Fait** : `modifyOutgoing` +1 par charge (après le critique, avant l'armure) ; `spentOnHit` : disparaît avec toutes ses charges dès qu'un coup du porteur touche (`combat.ts:1081`). Esquivé ou remplacé : il reste. Cumul `add`. Seul porteur : l'Encens de l'abbaye (fenêtre `healed`).
- **Texte actuel** : « Son prochain coup qui touche fait autant de dégâts de plus que de charges, avant l'armure. Se cumule ; disparaît, toutes charges comprises, dès que ce coup touche. »
- **Texte proposé** : « Son prochain coup qui touche fait +1 par charge, avant l'armure ; toutes les charges partent avec ce coup. Se cumule. »
- **Effets concurrents** :
  - gagné pendant un coup (Vol de vie qui soigne → `healed` → Encens), il sert le coup suivant [graine 5 : coup #2 soigne 3, Élan posé #4, servi au coup #6 « momentum+1 »] : l'usure `spentOnHit` a lieu avant les fenêtres, donc l'Élan neuf n'est jamais mangé par le coup qui l'a fait naître. Conforme à la règle 9 ;
  - pile : multiplie les PV retirés, Élan compris (×3 de l'Élan) ; la pile ne consomme pas d'Élan. Cohérent avec « ce coup ×3 » ;
  - coup brut de Furie : il s'applique au premier coup brut qui touche ;
  - Fausse note sur le même coup : Élan avant l'armure, Fausse note après ; indépendants.
- **À l'écran** : relayé dans l'état **Puissance** (`states.ts:135`), emblème `state-power`, nombre « +N » ; label « Élan +1 » à l'impact, +, ding (trace) ; à la pose, texte « Élan » et Bonus gagné, avec le label de relique « Encens de l'abbaye ».
- **Problèmes** :
  1. L'état Puissance dit « Ses coups font plus de dégâts. » (`states.ts:66`) : faux pour un statut d'un seul coup. C'est exactement la raison qui a sorti la Fausse note d'Affaibli vers « Coup gâché » (`states.ts:86-88`). Écran/texte.
  2. Vocabulaire : « élan » désigne déjà le mouvement d'attaque à l'écran (MISE_EN_SCENE M13 « L'élan est muet », M16 « avant l'élan », RESOLUTION § 11 « avant l'élan », `timing.ts:56`, `staging.ts:837`). « Le label Élan tombe à l'impact, le critique avant l'élan » devient ambigu. Texte.
  3. SONS § 9.3 ne le liste pas. Doc.
- **Proposition** : au plus simple, résumé de Puissance « Son prochain coup qui touche fait plus de dégâts. » tant que l'Élan est sa seule source ; mieux, un état à part « Coup renforcé », symétrique de « Coup gâché » (emblème à demander à l'utilisateur). Dans les docs, renommer le mouvement « la course » ou « le geste » (ou le statut « Ferveur ») pour lever l'homonymie. Ajouter la ligne à SONS § 9.3.

#### Vol de vie (lifesteal)
- **Fait** : `drainsHit` ; réaction de la fenêtre `hit` du porteur : soigne les PV retirés, une charge (`combat.ts:745`, `795`) ; esquivé : la charge part sans soin (`1084-1085`) ; jet remplacé : rien. `add`, plafond 2.
- **Texte actuel** : « Chaque charge : le prochain coup du porteur qui touche (pile comprise) lui rend autant de PV qu'il en retire. Un coup esquivé consomme la charge sans rien rendre. »
- **Texte proposé** : garder.
- **Effets concurrents** : contre Riposte [graine 9] : coup de 5, `hit` d'abord (+5 PV), puis `hurt` du défenseur (Riposte −3 = arrondi de 2,5) ; règle 1 (actif d'abord) respectée. Contre Épines : soin puis Saignement posé (§ 7). PV pleins : la charge part, soin 0, pas de fenêtre `healed` (donc pas d'Élan). Sur pile : il draine la pile (montant de la pile). Posé pendant un coup : attend le suivant (règle 9).
- **À l'écran** : état « Drain » (charges) ; soin à l'impact (M14), label « Vol de vie +N », ding puis Soin (trace). Conforme.
- **Problèmes** : aucun.
- **Proposition** : aucune.

#### Riposte (riposte)
- **Fait** : `reflectsHit` 0,5 ; réaction `hurt` du porteur : `Math.round(PV retirés × 0,5)` en dégâts directs source `strike`, une charge (`combat.ts:746`, `795`). `add`, plafond 2 (posée par 2).
- **Texte actuel** : « Chaque charge : le prochain coup qui touche le porteur (pile comprise) renvoie à l'attaquant la moitié des PV retirés, arrondie au-dessus, en dégâts directs. Sans durée : elle attend ce coup, même si l'adversaire n'en porte pas (jet remplacé, tour perdu). »
- **Texte proposé** : « Chaque charge : le prochain coup qui le touche (pile comprise) renvoie la moitié des PV retirés (arrondie au-dessus), en dégâts directs. »
- **Effets concurrents** : `Math.round` arrondit bien 0,5 au-dessus (texte juste). Dans `hurt`, elle réagit à son rang parmi les statuts du porteur (ordre de pose) : pile contre Riposte 1 et Saignement 2 [graine 1] → Riposte −2, Saignement −2, puis la pile : Saignement −1, Riposte déjà usée. Les dégâts de Riposte ne remplissent pas les jauges, ne déclenchent rien (règle 6). Conforme.
- **À l'écran** : état « Renvoi » ; réaction au milieu de la lecture (M17), en vrai coup (élan, chiffre rouge M37), label « Riposte −N », Malus reçu. Conforme.
- **Problèmes** : résumé long (phrase « sans durée » redite).
- **Proposition** : le texte proposé.

#### Épines acérées (thorns)
- **Fait** : réaction `hurt` : pose sur l'attaquant 1 Saignement par charge ; permanentes, `add`.
- **Texte actuel** : « Chaque coup encaissé fait saigner l'attaquant : 1 charge de Saignement par charge d'épines. Permanentes, elles se cumulent. »
- **Texte proposé** : garder.
- **Effets concurrents** : chaque coup de Furie déclenche (§ 7) ; posées pendant un coup (Collier de ronces), elles attendent le suivant (règle 9). Attaquant sous Aura d'immunité [graine 13] : le Saignement est « résisté » à chaque coup.
- **À l'écran** : état « Épines » ; réaction au milieu de la lecture ; label « Épines acérées » −, Malus reçu (doublon évité, SONS § 4.4 règle 5).
- **Problèmes** : quand le Saignement est bloqué, la réaction n'a rien fait mais joue quand même son label « Épines acérées » (−) et le Malus reçu [graine 13 : `special:Épines acérées(minus)`, `sound:debuff`, texte « Saignement résisté »]. `idle` ne couvre que le plafond (`staging.ts:1051`, `capped` `staging.ts:280`, `atCap` `narration.ts:73-74`), pas le blocage. SONS § 4.2 règle 8 : un effet refusé par une immunité ne sonne pas. Écran.
- **Proposition** : traiter « bloqué » et « neutralisé » comme `capped` pour une réaction (pas de label, pas de son, seul le texte neutre).

#### Coup de chance (luckyStrike)
- **Fait** : `extraStrikes` 1, `strikeCharges: 'all'` ; consommé au début de l'action suivante, un jet complet de plus par charge (`combat.ts:1173-1189`). `add`.
- **Texte actuel** : « À sa prochaine action, le porteur lance un d6 de plus par charge, en plus de son dé : chacun est un jet complet, résolu à part (sa compétence, puis son coup de base). Se cumule. »
- **Texte proposé** : « À sa prochaine action, un d6 de plus par charge : chacun est un jet complet (sa compétence, puis son coup de base). Se cumule. »
- **Effets concurrents** : Peur [graine 7] : l'action est perdue, Coup de chance n'est pas consommé et sert l'action suivante (deux jets) ; conforme à § 7. Un Coup de chance gagné pendant ces jets vaut pour l'action d'après. Barde : ses jets s'ajoutent à ses deux dés. Voir Furie des vents pour deux 2 dans la même rafale.
- **À l'écran** : état « Dé en plus » ; dés colorés (`look.dieColor`) dans la rafale (M27). Conforme.
- **Problèmes** : « en plus de son dé » est faux pour la barde (deux dés). Texte, mineur.
- **Proposition** : le texte proposé (sans « de son dé »).

#### Sifflotement (whistling)
- **Fait** : `onTurnEnd` +2 PV, `decays` (une charge par tour) ; `add`.
- **Texte actuel** : « Le porteur regagne 2 PV à la fin de chacun de ses tours, puis perd une charge : une charge par tour. Se cumule (les tours s'ajoutent). »
- **Texte proposé** : « +2 PV à la fin de chacun de ses tours, pendant autant de tours que de charges. Se cumule. »
- **Effets concurrents** : fin de tour, bonus avant malus [graine 11] : Aura de sainteté +1, Sifflotement +2, puis Brûlure −3 ; règle 3. Chaque soin non nul ouvre `healed` (Encens). Conforme.
- **À l'écran** : relayé dans « Soin » pour 2 PV par tour (`states.ts:142`) ; son Soin, « +2 PV » [graine 11].
- **Problèmes** : `badge` = « +2 × charges » (« +6 » à 3 charges, `statuses.ts:747`), alors que l'état Soin montre « +2 » par tour et que l'Aura de sainteté a un badge par tour : deux sens pour le même mot. Les tours restants (ses charges) n'apparaissent plus nulle part hors infobulle, le médaillon Soin portant un total. SONS § 9.3 ne le liste pas. Écran/texte.
- **Proposition** : `badge` « +2 » (par tour, comme la sainteté) ; dans l'infobulle de l'état Soin, garder « encore N tours ».

#### Régénération (regeneration) — sans porteur
- **Fait** : `onTurnStart` soin = charges ; `refresh` ; `opposes: poison`. Sans durée posée, elle est permanente.
- **Texte actuel** : « Rend des PV au début de chaque tour du porteur. »
- **Texte proposé** : garder.
- **Effets concurrents** : opposition avec le Poison, charge pour charge : Poison 1 sur Régénération 3 → Régénération 2 [`resolveApplication`] : **une** charge de Poison (1 PV une fois) efface **1 PV par tour pour toujours**, alors que Régénération 3 contre Poison 3 efface 6 PV de poison. Les deux charges n'ont pas la même unité (Poison : s'estompe ; Régénération : rente). Garde sacrée passe avant l'opposition : elle s'use sur un Poison que la Régénération aurait neutralisé [`resolveApplication`, ordre § 6].
- **À l'écran** : état « Soin » (+charges) ; son Soin.
- **Problèmes** : opposition déséquilibrée par construction (latent). Équilibre.
- **Proposition** : avant de lui donner un porteur, la faire s'estomper (`decays`, comme le Sifflotement), ou annuler en PV restants plutôt qu'en charges.

#### Garde sacrée (ward) — sans porteur
- **Fait** : `wards: negative` ; bloque la pose d'un malus et perd une charge (`statuses.ts:1011-1017`). Après l'immunité, avant l'opposition.
- **Texte actuel** : « Bloque les prochains malus posés sur le porteur. »
- **Texte proposé** : garder.
- **Effets concurrents** : voir Régénération (garde usée avant l'opposition).
- **À l'écran** : relayée dans l'état **Immunité** (`states.ts:131`), dont le résumé est « Aucun malus ne peut plus lui être posé. » et le compteur `none` (`states.ts:77`) [trayStates : « Immunité (aucun nombre) »].
- **Problèmes** : à l'écran, une garde à charges devient une immunité permanente sans nombre. Écran (latent).
- **Proposition** : avant attribution, un état « Garde » à charges (ou compteur `status` sur Immunité et un résumé « bloque les prochains malus »).

---

### Malus de la zone d'état

#### Poison (poison)
- **Fait** : `onTurnStart` dégâts = charges (source `poison`), puis `decays` ; `add` ; `opposes: regeneration`.
- **Texte actuel** : « Au début de chaque tour du porteur, lui fait perdre autant de PV que de charges, en ignorant l'armure, puis perd une charge. Une seule valeur : les dégâts du prochain tour, qui baissent de 1 à chaque tour (3, 2, 1). Se cumule. »
- **Texte proposé** : « Au début de son tour, perd autant de PV que de charges (sans armure), puis perd une charge : Poison 3 = 3 + 2 + 1 PV. Se cumule. »
- **Effets concurrents** :
  - Aura glaciale : posée au début du tour du **porteur de l'aura**, le Poison agit au début du tour de la **victime** ; une charge d'aura compense l'usure [graine 11 : glaciale pose 1 → victime −1 → s'éteint → reposé]. Dans un même début de tour, bonus avant malus : la glaciale du mort-vivant pose avant que son propre Poison n'agisse ;
  - Aura de décoction : chaque coup qui touche (pile comprise) ;
  - Aura d'immunité : bloqué (« Poison résisté ») ; purge (Larme de givre, Purification sur soi, Aura d'immunité) : retiré ;
  - Fiole de venin lit « porte Poison » au début du coup.
- **À l'écran** : état « Poison » (charges), bord en pointillés (`hurtsEachTurn`) ; « −N » vert acide (M37, `damage.ts:59`), son Grésillement (`tickSound`), décompte avec l'effet (M22) [graine 11 : `sound:fizz`, tone `poison`]. Conforme.
- **Problèmes** : résumé long (« Une seule valeur… » explique l'interface).
- **Proposition** : le texte proposé.

#### Saignement (bleed)
- **Fait** : réaction `hurt` : dégâts = charges (source `bleed`), puis `decays` ; `add`. Règle 9 : une plaie ouverte pendant un coup coule au suivant ; grossie, elle coule de ses charges du début du coup (`combat.ts:787-789`).
- **Texte actuel** : « Chaque coup qui touche le porteur lui fait perdre autant de PV que de charges, en ignorant l'armure, puis perd une charge. Une seule valeur : les PV perdus au prochain coup qui le touche, qui baissent de 1 à chaque coup (2, 1). Une plaie ouverte pendant un coup ne coule pas sur ce coup : elle coule dès le coup suivant qui touche le porteur. Se cumule. »
- **Texte proposé** : « Chaque coup qui le touche lui fait perdre autant de PV que de charges (sans armure), puis une charge part : Saignement 2 = 2 + 1 PV. Ouverte pendant un coup, la plaie coule dès le suivant. Se cumule. »
- **Effets concurrents** : coule aussi sur une pile [graine 1 : −2 au coup, −1 à la pile] ; Furie la vide en une action ; esquive, Peur, jet remplacé la laissent ouverte ; dans `hurt`, à son rang parmi les statuts (ordre de pose : après une Riposte posée avant elle). Croc de boucher la lit. Peut achever son porteur (K.O. dans la fenêtre du coup). Conforme.
- **À l'écran** : état « Saignement » ; coule à l'impact (M15, `bleedOut`), label « Saignement +N » (+, ding) puis Ronge un battement après ; chiffre rouge (le sang reste rouge, M37). Conforme.
- **Problèmes** : résumé de quatre phrases.
- **Proposition** : le texte proposé.

#### Brûlure (burn)
- **Fait** : `onTurnEnd` dégâts = charges (source `burn`) ; `turnsFromStacks` : dure autant de tours que sa valeur, décomptée en fin de tour ; `refresh`.
- **Texte actuel** : « Fait perdre autant de PV que sa valeur à la fin de chaque tour du porteur, pendant autant de tours (Brûlure 3 : 3 PV à la fin de ses 3 prochains tours). Son médaillon compte les tours qui restent. Une nouvelle Brûlure remplace l'ancienne. »
- **Texte proposé** : « À la fin de ses N prochains tours, perd N PV (Brûlure 3 : 3 × 3 PV). Une nouvelle Brûlure remplace l'ancienne. »
- **Effets concurrents** : fin de tour, bonus avant malus : sainteté et Sifflotement soignent avant qu'elle brûle [graine 11] ; le K.O. de la brûlure arrive donc après le soin. Étourdi/Peur : la fin de tour a lieu quand même. Feux follets la reposent souvent : `refresh` remet 3 tours. Une Brûlure posée pendant le tour du porteur n'est pas décomptée à sa fin (`fresh`, `combat.ts:982`) : aucun cas aujourd'hui (posée par l'adversaire). Conforme.
- **À l'écran** : état « Brûlure » qui compte les **tours** (`counter: 'turns'`) ; « −3 » mauve (M37), Ronge ; décompte 3 → 2 avec l'effet (M22). Conforme.
- **Problèmes** : « Son médaillon compte les tours » est de l'interface dans une règle. Avec `refresh`, une Brûlure plus faible remplacerait une plus forte : aucun porteur ne pose une autre valeur aujourd'hui.
- **Proposition** : le texte proposé ; si une autre valeur arrive, `refresh` qui garde la plus forte.

#### Peur (fear)
- **Fait** : `skipsAction` ; consommée à l'action perdue (`combat.ts:1224-1228`) ; `refresh`, plafond 1. La compétence ne part qu'une fois par combat (`limit: 1`, `roster.ts:398`).
- **Texte actuel** : « Le porteur, terrifié, perd sa prochaine action. »
- **Texte proposé** : garder.
- **Effets concurrents** : jets en plus : toute l'action est perdue (les deux dés de la barde aussi), mais Coup de chance attend [graine 7] ; la Furie et la pièce, instantanées, ne peuvent pas être volées (§ 7). Début et fin de tour ont lieu (poison, brûlure, sainteté). Aura d'immunité : bloquée. Avec Étourdi (sans porteur), le premier trouvé est consommé, l'autre fait perdre l'action suivante.
- **À l'écran** : porteur qui tremble (`look.motion`) jusqu'au tour perdu ; état « Tour perdu » sans nombre ; au tour, « Tour perdu » sur le porteur, son Tour perdu (M29, `staging.ts:1083-1096`). Conforme.
- **Problèmes** : aucun.
- **Proposition** : aucune.

#### Fausse note (falseNote)
- **Fait** : `modifyFinal` −5 par charge, après l'armure et les boucliers, plancher 1 ; `spentOnHit` ; `add`.
- **Texte actuel** : « Le prochain coup du porteur qui touche fait 5 dégâts de moins par charge, retirés en dernier, après l'armure (au moins 1 dégât). Puis la Fausse note s'oublie. Se cumule. »
- **Texte proposé** : « Son prochain coup qui touche fait 5 de moins par charge, après l'armure (au moins 1) ; puis elle part. Se cumule. »
- **Effets concurrents** :
  - **contre l'Aura mélodieuse sur le même attaquant** (barde contre barde, Fausse note gravée) : le plancher s'applique après **chaque** `modifyFinal`, dans l'ordre de pose (`combat.ts:471-479`) ; le résultat dépend de l'ordre [script : coup de 3, armure 0 ; Aura puis Fausse note → 4, puis −5 → **1** ; Fausse note puis Aura → 1 (plancher), puis +1 → **2**]. Le texte « retirés en dernier » et celui de l'Aura mélodieuse (« ajouté en dernier, rien ne le réduit ») ne peuvent être vrais ensemble ;
  - Furie : le premier coup qui touche la consomme ; pile : ×3 des PV déjà réduits ;
  - Affaibli et intimidation adverse sur le même coup [graine 13] : 4 − 1 − 1 = 2, puis −5 → 1 ; label « Fausse note −1 » (la part réellement retirée).
- **À l'écran** : état « Coup gâché » (−5 × charges), séparé d'Affaibli [trayStates : « Coup gâché −5 », « Affaibli −2 »] ; label à l'impact, −, Malus reçu. Emblème : l'icône peinte de la compétence (`Icon.tsx:168`), pas un emblème gris (grammaire STATUTS « Une grammaire, une place »).
- **Problèmes** :
  1. Ordre de pose qui change le résultat avec l'Aura mélodieuse. Bug (rare).
  2. `docs/STATUTS.md` (§ « Deux niveaux de lecture », regroupement et table, lignes 35 et 40) dit encore que la Fausse note alimente Affaibli ; la table ne connaît pas « Coup gâché ». Doc.
  3. SONS § 9.3 ne la liste pas. Doc.
- **Proposition** : dégâts finaux additionnés puis un seul plancher (`max(1, dégâts + Σ deltas)`) : indépendant de l'ordre, et « au moins 1 » reste vrai ; ajouter le cas à RESOLUTION § 7. Corriger STATUTS.md (ligne « Coup gâché », Affaibli sans Fausse note). Emblème « Coup gâché » à demander à l'utilisateur.

#### Affaibli (weakened) — sans porteur
- **Fait** : `modifyOutgoing` −charges ; `refresh`.
- **Texte actuel** : « Les coups du porteur infligent moins de dégâts. »
- **Texte proposé** : « Ses coups font N de moins, avant l'armure. »
- **Effets concurrents** : additionné à l'Aura d'intimidation adverse dans l'état Affaibli (même fenêtre, avant l'armure, chaque coup) : regroupement juste.
- **À l'écran** : état « Affaibli » (total signé). Conforme.
- **Problèmes** : résumé sans le moment (« avant l'armure »), alors que l'état le dit.
- **Proposition** : le texte proposé.

#### Brèche (exposed) — sans porteur
- **Fait** : `modifyStats` armure −charges (bornée à 0) ; `add`, plafond 3.
- **Texte actuel** : « L'armure du porteur est réduite. »
- **Texte proposé** : « Son armure perd 1 par charge (3 au plus). »
- **Effets concurrents** : contre l'Aura d'immunité (+1 armure) : s'additionnent (§ 6, pas d'opposition).
- **À l'écran** : état « Brèche » ; icône `breach` peinte, pas un emblème.
- **Problèmes** : emblème manquant (avant attribution).
- **Proposition** : le texte proposé ; emblème à demander.

#### Vulnérable (vulnerable) — sans porteur
- **Fait** : `modifyIncoming` +charges ; `add`, plafond 3.
- **Texte actuel** : « Le porteur subit plus de dégâts à chaque coup, avant l'armure. »
- **Texte proposé** : « Chaque coup reçu fait +1 par charge, avant l'armure (3 au plus). »
- **Effets concurrents** : § 7 (Affaibli 3 + Vulnérable 2 sur un coup de 2 → plancher 1). Conforme.
- **À l'écran** : état « Vulnérable » sans icône : initiale « V » (`STATE_ICON` sans `vulnerable`, `Icon.tsx:147-169`). N'est pas une surcharge (durable). 
- **Problèmes** : emblème manquant (avant attribution).
- **Proposition** : emblème à demander.

#### Étourdi (stunned) — sans porteur
- **Fait** : `skipsAction` ; `add`, plafond 1.
- **Texte actuel** : « Le porteur perd sa prochaine action. »
- **Texte proposé** : garder.
- **Effets concurrents** : avec la Peur, voir Peur.
- **À l'écran** : état « Tour perdu » sans nombre (avec la Peur, deux tours perdus restent un médaillon sans nombre [trayStates]) ; pas d'animation propre (la Peur tremble).
- **Problèmes** : `describe` a une branche « Perd ses N prochaines actions » inatteignable (plafond 1, `statuses.ts:396`) ; badge « ×N ». Texte, mineur.
- **Proposition** : `refresh` et `describe` unique, comme la Peur ; compteur de charges sur « Tour perdu » s'il peut en compter deux.

#### Luciole (firefly) — sans porteur
- **Fait** : esquive à 0 (`modifyStats`), +2 par coup reçu (`modifyIncoming`), une charge par coup encaissé (`spentOnHurt`).
- **Texte actuel** : « Des lucioles trahissent le porteur : il ne peut plus esquiver (une esquive imposée passe quand même), et chaque coup reçu lui inflige 2 dégâts de plus, avant l'armure. Chaque coup qui le touche en chasse une (une charge). »
- **Texte proposé** : « Il ne peut plus esquiver (sauf esquive assurée) et chaque coup reçu fait +2, avant l'armure ; chaque coup qui le touche ôte une charge. »
- **Effets concurrents** : Esquive améliorée passe ; une pile ne retire pas de charge (pas de `resolveAttack`).
- **À l'écran** : lucioles autour du porteur ; label « Luciole +2 » ; icône peinte dans la zone.
- **Problèmes** : résumé narratif.
- **Proposition** : le texte proposé.

#### Pourriture (rot) — sans porteur
- **Fait** : `onTurnStart` 1 dégât par charge, sans usure ; `add`.
- **Texte actuel** : « Fait perdre 1 PV par charge au début de chaque tour du porteur, en ignorant l'armure. Ne s'estompe pas : seule une purge l'enlève. »
- **Texte proposé** : garder.
- **À l'écran** : état « Pourriture » avec l'icône peinte de l'aura (`Icon.tsx:164`) ; mauve, Ronge.
- **Problèmes** : malus de dégâts cumulable sans plafond ni usure : règle de design 5 (STATUTS) vise les stats, mais la même logique vaut ; à mesurer avant tout porteur.
- **Proposition** : plafond ou usure avant attribution.

---

### Auras (sur leur anneau, pas dans la zone du porteur)

Règles communes vérifiées : `look.aura` → `isAura` ; place `aura` (`states.ts:147-163`) : l'anneau dans la barre de compétences, qui tourne quand l'aura agit ; jamais une surcharge (`specials.ts:94`) ; pose : Aura gagnée, au plafond : « … au maximum » sans son (M25, SONS § 4.2) ; une purge (Purification) retire l'aura avec toutes ses charges.

#### Aura glaciale (frostAura)
- **Fait** : `onTurnStart` du porteur : pose 1 Poison par charge sur l'adversaire ; `add`.
- **Texte actuel** : « Au début de chacun de ses tours, le froid de la tombe pose 1 charge de Poison par charge d'aura sur l'adversaire. Le Poison perd une charge à chaque tour : une charge d'aura le fige à sa valeur. Permanente. »
- **Texte proposé** : « Au début de chacun de ses tours, 1 Poison par charge sur l'adversaire (une charge compense l'usure du Poison). Permanente. »
- **Effets concurrents** : voir Poison (bonus avant malus dans le même début de tour ; Poison de la victime au tour de la victime). Immunité : bloqué à chaque tour ; purge : le Poison part, l'aura le repose au tour suivant.
- **À l'écran** : le signal part de l'anneau ; texte « Poison » chez la cible, Malus reçu [graine 11 : `sound:debuff`] ; le « −N » vient ensuite au tour de la victime, Grésillement. Conforme à SONS § 9.3.
- **Problèmes** : « le froid de la tombe » : de la couleur dans une règle.
- **Proposition** : le texte proposé.

#### Aura de puissance (powerAura)
- **Fait** : `modifyOutgoing` +2 ; `refresh`, plafond 1.
- **Texte actuel** : « Chaque coup du porteur inflige 2 dégâts de plus, après le critique et avant l'armure. Permanente, non cumulable. »
- **Texte proposé** : garder.
- **Effets concurrents** : avec l'intimidation adverse, sortant puis entrant (§ 7) ; Force de l'ours et Élan s'ajoutent ; la pile triple les PV retirés, donc l'aura aussi.
- **À l'écran** : anneau « +2 » ; aucun label (agit à chaque coup, § 11 règle 5). Conforme.
- **Problèmes** : aucun.
- **Proposition** : aucune.

#### Aura d'intimidation (intimidationAura)
- **Fait** : `modifyIncoming` −1 par charge ; `add`.
- **Texte actuel** : « Les coups de l'adversaire du porteur infligent 1 dégât de moins par charge, après le critique et avant l'armure. Permanente. »
- **Texte proposé** : « Les coups de l'adversaire font 1 de moins par charge, avant l'armure. Permanente. »
- **Effets concurrents** : bouclier : l'intimidation passe avant, le bouclier s'use moins [graine 7] ; Aura mélodieuse et Fausse note (dégâts finaux) ne sont pas rognées ; dégâts directs et pile non plus. L'Aura d'immunité ne la bloque pas (une aura adverse agit toujours, texte de l'immunité juste).
- **À l'écran** : anneau chez le nain ; relayée en « Affaibli −N » chez l'adversaire (`states.ts:154-159`), additionnée à l'Affaibli. Aucun label. Conforme.
- **Problèmes** : « de l'adversaire du porteur » lourd.
- **Proposition** : le texte proposé.

#### Aura de précision (precisionAura)
- **Fait** : `modifyStats` +5 % de critique et +1 au multiplicateur par charge ; `add`.
- **Texte actuel** : « Par charge, le porteur gagne 5 % de chance de critique et +1 à son multiplicateur de critique. Permanente. »
- **Texte proposé** : garder.
- **Effets concurrents** : avec Critique assuré, le multiplicateur effectif (§ 7). Conforme.
- **À l'écran** : anneau ; le multiplicateur se lit dans « Critique ×N ». Conforme.
- **Problèmes** : aucun.
- **Proposition** : aucune.

#### Aura d'immunité (immunityAura)
- **Fait** : `immune: negative` (bloque sans s'user) et armure +1 ; `refresh`, plafond 1. La compétence purge d'abord les malus.
- **Texte actuel** : « Plus aucun malus ne peut être posé sur le porteur (ceux déjà là et les auras de l'adversaire agissent toujours), et son armure gagne 1, jusqu'à la fin du combat. Permanente, non cumulable. »
- **Texte proposé** : « Aucun malus ne peut plus lui être posé (les auras adverses agissent toujours) ; armure +1. Permanente, non cumulable. »
- **Effets concurrents** : bloque Poison de la glaciale/décoction, Saignement des Épines [graine 13], Fausse note, Peur, Brûlure ; ne bloque ni l'intimidation (aura), ni les dégâts directs, ni une purge de ses bonus (Purification retire l'aura elle-même). « Ceux déjà là » : la compétence les a purgés juste avant, la mention ne sert qu'à une aura posée autrement.
- **À l'écran** : anneau « ∞ » ; chaque blocage : texte « X résisté », sans son (sauf la réaction des Épines, voir Épines).
- **Problèmes** : résumé long.
- **Proposition** : le texte proposé.

#### Aura de sainteté (holyAura)
- **Fait** : `onTurnEnd` +1 PV par charge ; `add`, plafond 2.
- **Texte actuel** : « Le porteur regagne 1 PV par charge à la fin de chacun de ses tours (2 charges au plus). Permanente. »
- **Texte proposé** : garder.
- **Effets concurrents** : avant la Brûlure en fin de tour ; après le Poison du début de tour (§ 7). Soin non nul → `healed` (Encens : Élan).
- **À l'écran** : anneau « +N » ; soin sans titre, son Soin [graine 11]. Conforme.
- **Problèmes** : aucun.
- **Proposition** : aucune.

#### Aura de décoction (decoctionAura)
- **Fait** : réaction `hit` : 1 Poison par charge sur la cible ; `add`.
- **Texte actuel** : « Chaque coup qui touche (pile comprise) empoisonne la cible : 1 charge de Poison par charge d'aura. Permanente. »
- **Texte proposé** : garder.
- **Effets concurrents** : posée par une greffe (sur un 2), présente au début du coup : elle empoisonne ce coup même (§ 3 bis) ; pile : empoisonne encore (§ 7). Immunité : résisté.
- **À l'écran** : le poison tombe à l'impact (M14), signal de l'anneau, Malus reçu un battement après le Coup. Conforme.
- **Problèmes** : aucun.
- **Proposition** : aucune.

#### Aura mélodieuse (melodiousAura)
- **Fait** : `modifyFinal` +1 par charge, après armure et boucliers ; `add`.
- **Texte actuel** : « Chaque coup du porteur qui touche fait 1 dégât de plus par charge. Le bonus s'ajoute en dernier, après l'armure et les boucliers : rien ne le réduit. Permanente, se cumule. »
- **Texte proposé** : « Chacun de ses coups qui touche fait +1 par charge, ajouté après l'armure et les boucliers. Permanente, se cumule. »
- **Effets concurrents** : intimidation, armure, bouclier ne la rognent pas (§ 7) ; **Fausse note sur la même barde : voir Fausse note** (le plancher entre les deux dépend de l'ordre de pose).
- **À l'écran** : anneau « +N » ; aucun label. Conforme.
- **Problèmes** : « rien ne le réduit » faux face à une Fausse note posée après elle (rare). Texte.
- **Proposition** : le texte proposé, et le plancher unique des dégâts finaux (Fausse note).

#### Aura sauvage (wildAura)
- **Fait** : `modifyStats` attaque min et max +1 par charge ; `add` ; sert les deux formes.
- **Texte actuel** : « L'attaque du porteur gagne 1 par charge, minimum et maximum : chaque coup vaut plus, avant le critique. Permanente. »
- **Texte proposé** : « Son attaque gagne +1 par charge (minimum et maximum). Permanente. »
- **Effets concurrents** : avant le critique (multipliée), contrairement à l'Aura de puissance (§ 7). Conforme.
- **À l'écran** : anneau ; icône `grudge-aura` (l'empreinte d'ours, choix noté `Icon.tsx:135`).
- **Problèmes** : aucun ; la fin de phrase redit la règle « Attaque ».
- **Proposition** : le texte proposé.

#### Aura de pourriture (rotAura) — sans porteur
- **Fait** : réaction `hit` : Pourriture = charges sur la cible.
- **Texte actuel** : « Chaque coup qui touche infecte la cible : 1 charge de pourriture par charge d'aura, qui ne s'en va plus. Permanente. »
- **Texte proposé** : garder (« Pourriture » avec majuscule, nom de statut).
- **Problèmes** : voir Pourriture (sans plafond).
- **Proposition** : avant attribution, mesurer.

---

### Mécanismes (règles de compétence ou de forme)

Règles communes vérifiées : jamais purgés (`combat.ts:714`, `removeStatuses`), jamais bloqués (`statuses.ts:1006`), sans ligne de cumul au compendium (`statuses.ts:950`). Purification sans autre bonus que des mécanismes : repli de 5 dégâts directs (Aldric et ses jauges).

#### Furie des vents (windFury)
- **Fait** : `instantStrikes`, `extraStrikes` 2 ; après l'action, `burst` consomme **une** charge et frappe deux coups bruts (`combat.ts:1149-1165`, `1154`) ; cumul `add`, sans plafond.
- **Texte actuel** : « Le jet qui la déclenche ne porte pas de coup : tout de suite, dans la même action, le porteur frappe deux fois, deux coups de base résolus à part, chacun avec son dé. Ce sont des coups bruts : leur face ne déclenche aucune compétence. »
- **Texte proposé** : « Ce jet ne frappe pas : tout de suite, deux coups de base bruts, chacun avec son dé (leur face ne déclenche aucune compétence). »
- **Effets concurrents** : deux Furies dans une même action (deux jets : Coup de chance, ou deux dés ; ou une Furie aiguisée qui pose 2 charges) : 2 charges, `burst` n'en dépense qu'une ; **la seconde reste et frappe à l'action suivante, après les jets de cette action, sans qu'aucun 2 ne soit sorti** [script, combat construit : deux 2 dans la rafale de Coup de chance, tour 1 → `windFury:1` reste ; tour 3 : coup normal, puis `flurry windFury` (#11) dont la cause est la Furie du tour 1 (#5)]. Une Peur entre-temps la repousse encore (pas de `burst` sur une action perdue). Cas réel : Elaria peut graver Furie des vents et Coup de chance (répertoire, `roster.ts:198`) ; la Furie aiguisée (charges 2) est le même chemin.
- **À l'écran** : mécanisme `skill` : seulement le sceau et la rafale (M27) ; la charge restante n'apparaît nulle part (ni zone d'état ni sceau compté).
- **Problèmes** : contredit « instantanée : elle frappe dans l'action où elle est posée » (STATUTS catalogue, RESOLUTION § 2 et § 7 « Peur contre Furie »). Bug.
- **Proposition** : `burst` dépense toutes les charges (`extraStrikes × charges` coups bruts dans une même rafale), ou `stacking: 'refresh'` avec plafond 1 si une seule Furie par action est voulue (et la Furie aiguisée devient « trois coups »). À trancher avec la revue des compétences ; test dans `combat.test.ts` et contrôle d'audit « aucune charge `instantStrikes` ne survit à son action ».

#### Pile ou face (coinFlip)
- **Fait** : posé par la compétence qui modifie, si le coup touche ; la pièce part juste après les fenêtres de ce coup (`combat.ts:1111`, `1122-1142`) ; pile : PV retirés × 2 de plus, en dégâts directs qui « touchent » (`hit` du lanceur, `hurt` de la cible), état de référence au départ de la pièce. `refresh`, plafond 1.
- **Texte actuel** : « Le porteur lance aussitôt une pièce, juste après le coup qui l'a posée : pile, ce coup ×3, l'adversaire perd encore 2 fois les PV qu'il lui a retirés, en dégâts directs qui comptent comme un coup qui touche (tout ce qui réagit à un coup qui touche part : Aura de décoction, Épines, Saignement, Riposte, Vol de vie, jauges de Rétribution) ; face, rien. »
- **Texte proposé** : « Si ce coup touche, une pièce part aussitôt : pile, ce coup ×3 (encore deux fois ses PV retirés, comme un coup qui touche) ; face, rien. »
- **Effets concurrents** : Riposte, Saignement [graine 1], Vol de vie, Épines, jauges, décoction réagissent ; ni esquive (Esquive améliorée présente : la pile passe [graine 1]), ni armure, ni bouclier, ni critique ; ne consomme ni Élan ni Fausse note (déjà usés par le coup). Conforme à M26 et § 7.
- **À l'écran** : pièce, ding sur pile, puis coup lourd doré (M26, M37 « l'or reste au coup lourd »). Conforme.
- **Problèmes** : la parenthèse énumère six statuts : liste à tenir à jour à chaque nouveau statut, et longue.
- **Proposition** : le texte proposé ; la liste reste dans la règle « Dégâts directs »/« un coup qui touche ».

#### Rétribution (retribution)
- **Fait** : `fillsOnHurt` 3 jauges : PV retirés par les trois derniers coups qui touchent (pile comprise) ; relâchée par la compétence en **moitié arrondie au-dessous, au moins 1** (`roster.ts:553`, `combat.ts:706`).
- **Texte actuel** : « Mécanisme de la compétence Rétribution : trois jauges stockent les dégâts des trois derniers coups qui touchent le paladin (pile comprise ; les dégâts directs ne comptent pas) ; sur un 1, il les relâche d'un coup. Ni bonus ni malus : aucune purge ne les vide. » ; `describe` : « Jauges : 5 · 4 · 3 (12 dégâts à relâcher sur un 1) ».
- **Texte proposé** : « Trois jauges gardent les PV retirés par les trois derniers coups qui le touchent (pile comprise). Sur un 1, il en relâche la moitié, arrondie au-dessous. » ; `describe` : « Jauges : 5 · 4 · 3 (12 PV gardés) ».
- **Effets concurrents** : une jauge ne réagit pas, elle se remplit à chaque coup qui touche ; encore vide, elle passe après les autres réactions (`combat.ts:773-783`). Riposte, Saignement, poison ne la remplissent pas. Conforme.
- **À l'écran** : compte sur le sceau (`SkillBar.tsx:80-88`) : **la somme** (12) ; la relâche fera 6 ; coups par jauge seulement quand la relâche est entière (`combat.ts:709-710`).
- **Problèmes** : `describe` (« 12 dégâts à relâcher », `statuses.ts:560`) et résumé (« il les relâche d'un coup ») datent d'avant la 0.107.0 : la relâche est la moitié. Le sceau affiche la somme, pas ce qui partira. Texte/écran.
- **Proposition** : les textes proposés ; le `describe` ne doit pas connaître la part (elle est sur l'effet `release.share`) : il dit les PV gardés, la compétence dit « la moitié ». Sur le sceau, au choix de l'utilisateur : la somme gardée (lecture des coups reçus) ou la relâche à venir (lecture de la menace).

#### Incantation (casting)
- **Fait** : statut de forme sans crochet ; présent sous forme humaine (`roster.ts:634`), ses sorts sont des compétences `form: 'human'`.
- **Texte actuel** : « Sous forme humaine, chaque face du dé du druide lance un sort, qui se greffe sur son coup de base magique (DM). »
- **Texte proposé** : garder.
- **Effets concurrents** : aucun (ni purge ni blocage) ; retiré au changement de forme, en début de tour, avant les effets de début de tour.
- **À l'écran** : règle de forme, médaillon « Sort » sans nombre (`counter: 'turns'` sans durée). Conforme.
- **Problèmes** : `counter: 'turns'` utilisé pour cacher le nombre : astuce, pas un sens.
- **Proposition** : un compteur `none` explicite (`StatusDef.counter`).

#### Force de l'ours (bearMight)
- **Fait** : statut de forme ; `modifyOutgoing` +3.
- **Texte actuel** : « Sous forme d'ours, le druide ne lance aucun sort : son coup de base est physique (DP) et fait 3 de plus, après le critique et avant l'armure. »
- **Texte proposé** : garder.
- **Effets concurrents** : s'additionne à l'Aura de puissance gravée et à l'Élan ; l'Aura sauvage de l'homme compte avant le critique.
- **À l'écran** : règle de forme « +3 » ; pas de label (durable). Conforme.
- **Problèmes** : même astuce `counter: 'turns'`.
- **Proposition** : idem Incantation.

---

### Points transversaux

- **Purification et « dernier bonus »** : la purge `count: 1` retire le dernier de la **liste** (`combat.ts:716`) ; un statut renforcé garde sa place d'origine (`applyStatus`, `statuses.ts:979`). Après Aura glaciale, Vol de vie, Aura glaciale, la liste est `[frostAura:2, lifesteal:1]` : la Purification retire le Vol de vie, alors que la dernière pose est l'aura [script]. C'est cohérent avec « ordre de pose » au sens de la règle 2 (ordre d'arrivée), mais RESOLUTION § 7 (« Le dernier bonus posé part… ») le lit comme la pose la plus récente. Texte : dire « le dernier arrivé » (ou « le plus récent nouveau statut »), ou déplacer en fin de liste un statut renforcé, au choix de l'utilisateur.
- **Instantané périmé dans `statusPhase`** : la liste `ticking` est prise au début de la phase (`combat.ts:961`) et chaque statut agit avec les charges de ce moment ; seul le retrait est revérifié (`969`). Aucun cas en jeu (aucun effet de phase ne modifie les charges d'un autre statut du même camp avant qu'il agisse), mais un futur statut qui le ferait (une aura qui retire du Poison, une relique de seuil qui purge partiellement) lirait des charges fausses. Relire `states[side].statuses.find(...)` au moment d'agir.
- **Champ `look.glow`** : écrit sur 16 statuts, non dessiné depuis la 0.34.0 (`statuses.ts:97-100`). Donnée morte, à retirer ou à réutiliser.
- **SONS § 9.3** : manquent Sifflotement (Soin), Élan (label +, ding), Fausse note (label −, Malus reçu), Armure temporaire (label −, Malus reçu), Luciole (label +).

---

### Tableau récapitulatif (par gravité)

| Élément | Problème | Gravité | Proposition |
| --- | --- | --- | --- |
| Furie des vents | Deux charges dans une action (deux 2 dans une rafale, Furie aiguisée) : `burst` n'en dépense qu'une, l'autre frappe à l'action suivante sans 2, invisible à l'écran | bug | Toutes les charges dans la même rafale, ou plafond 1 ; test + contrôle d'audit |
| Fausse note × Aura mélodieuse | Plancher après chaque dégât final : le résultat dépend de l'ordre de pose (1 ou 2 sur un coup de 3) | bug | Somme des dégâts finaux, un seul plancher ; cas dans RESOLUTION § 7 |
| `statusPhase` | Charges lues dans un instantané du début de phase | bug (latent) | Relire le statut au moment d'agir |
| Rétribution | `describe` « 12 dégâts à relâcher » et résumé « d'un coup » : la relâche est la moitié ; le sceau montre la somme | texte | « 12 PV gardés », « la moitié » dans la compétence ; choix du nombre du sceau |
| Puissance / Élan | « Ses coups font plus de dégâts » pour un bonus d'un seul coup | texte | Résumé « Son prochain coup… » ou état « Coup renforcé » |
| Élan (vocabulaire) | Homonyme du mouvement d'attaque (M13, M16, § 11) | texte | Renommer l'un des deux dans les docs |
| Purification | « Dernier bonus » = ordre d'arrivée, pas la pose la plus récente | texte | Le dire, ou déplacer un statut renforcé en fin de liste |
| STATUTS.md | Fausse note dans Affaibli ; « Coup gâché » absent de la table | texte | Corriger le regroupement et la table |
| Aura mélodieuse | « rien ne le réduit » faux face à une Fausse note | texte | Texte proposé |
| Armure temporaire | « puis disparaît » au lieu de « s'use d'autant » | texte | Texte proposé |
| Coup de chance | « en plus de son dé » faux pour la barde | texte | Texte proposé |
| Étourdi | Branche plurielle inatteignable (plafond 1) | texte | `refresh`, phrase unique |
| Résumés longs | Poison, Saignement, Brûlure, Esquive améliorée, Riposte, Pile ou face, Aura glaciale, Aura d'immunité, Luciole | texte | Textes proposés (une règle, un exemple chiffré) |
| SONS § 9.3 | Cinq statuts absents | texte | Ajouter les lignes |
| Épines acérées | Saignement bloqué : label « Épines acérées » − et Malus reçu quand même (SONS § 4.2 règle 8) | écran | Bloqué ou neutralisé = `idle` pour une réaction |
| Sifflotement | Badge « +2 × charges » contre « +2 » par tour dans Soin ; tours restants invisibles | écran | Badge par tour ; tours dans l'infobulle |
| Garde sacrée | Relayée en « Immunité » sans nombre, résumé faux (latent) | écran | État « Garde » à charges avant attribution |
| Coup gâché, Brèche, Pourriture, Luciole | Icône peinte dans la zone d'état au lieu d'un emblème gris | écran | Emblèmes à demander |
| Vulnérable | Aucun emblème : initiale « V » (latent) | écran | Emblème à demander |
| Incantation, Force de l'ours | `counter: 'turns'` détourné pour cacher le nombre | écran | Compteur `none` explicite |
| Régénération ↔ Poison | Opposition charge pour charge entre une rente (PV par tour) et une réserve qui s'estompe (latent) | équilibre | Régénération qui s'estompe, ou annulation en PV |
| Régénération / Garde | La garde s'use avant l'opposition (latent) | équilibre | À trancher avec RESOLUTION § 9 si la garde arrive |
| Pourriture, Aura de pourriture | Malus de dégâts cumulable sans plafond ni usure (latent) | équilibre | Plafond ou usure avant attribution |

Vérifications faites : lecture du code et des docs cités ; un script vitest jetable (combats construits, `stage`, `trayStates`) pour les traces citées, supprimé ensuite. Rien n'a été vérifié dans un navigateur ; les sons ne sont lus que dans les cues de `stage`, pas entendus.


---

## Revue des reliques (0.109.0, branche `regles-v2`, 2026-10-24)

Les 21 reliques de `RELICS` (`src/game/relics.ts`) : les douze, les quatre élémentaires, les cinq consommatrices. Règle de référence : `docs/RELIQUES.md`. Preuves : lecture du code, et un script jetable (`scripts/tmp-review-ReviewRelics*.report.ts`, supprimé) qui a simulé des combats construits (`testCharacter`, `forcedRolls`) et lu les cues de `stage()`. `validateRelics()` ne rend aucune erreur.

### Constats transversaux (valent pour plusieurs reliques)

- **T1. Seuils : ordre des camps et cause (bug).** `checkThresholds` (`combat.ts:921`) parcourt les camps dans l'ordre `[0, 1]`, pas « actif d'abord » (RESOLUTION § 5, règle 1). Observé : camp 1 attaque, son coup fait passer le camp 0 sous 50 % et sous 30 % → `#2 Collier de ronces (camp 0)` puis `#3 Trophée du chasseur (camp 1)`. Le défenseur résout donc avant l'actif. Autre point : la première relique de seuil qui part rappelle `checkThresholds(id)` avec **sa propre étape pour cause** (`fireRelic`, `combat.ts:892`), et ce second appel fait partir les autres seuils franchis par le même coup. Observé, un coup de 15 sur 20 PV : coup #0 → Trophée (cause 0) → Collier (**cause 1**, le Trophée) → Dent de loup (cause 2) → Larme de givre (cause 3). Or le coup est la vraie cause (RESOLUTION § 2 et règle 6 : « cette étape en est la cause »). L'issue ne change pas (`crossed` protège les passages), mais la trace est fausse. À l'écran, seule la première relique est une réaction du coup (M17). Les autres passent après la fin du coup, chacune avec son `LEAD` : Trophée à 1 725 ms, Collier à 3 725, Dent à 5 275, scène de la Larme à 6 575. L'audit ne le voit pas (`audit.ts:691` lit les PV à la cause, qui sont encore sous le seuil). **Proposition :** dans `checkThresholds`, commencer par le camp actif (`owner`). Avant de déclencher quoi que ce soit, ajouter à `relicBelow` toutes les reliques de `crossed`, puis les déclencher avec la cause externe. Le second appel ne verra alors que les passages produits par l'effet de la relique (le soin de la Larme, les dégâts de la Braise). Ajouter un contrôle d'audit : la cause d'une relique de seuil a changé les PV qu'elle surveille.
- **T2. Relique déclenchée par une étape « portée » par le coup (écran).** `consequencesOf` (`staging.ts:748`) ne range dans `reactions` que les enfants directs du coup. Une relique dont la cause est un `ride` (l'Encens après le soin du Vol de vie) ou une autre relique (T1) n'est donc pas jouée au milieu de la lecture du coup (M17) : elle passe après le repos du coup. Observé : soin du Vol de vie à 1 850 ms, Riposte à 2 125, Encens à **4 215** (2,4 s après le soin qui le cause). **Proposition :** ajouter aux `reactions` du coup les étapes `relic` causées par ses `rides`. Avec T1, celles causées par une relique de seuil du même coup.
- **T3. Signe et son du label d'une relique du défenseur (écran, à trancher).** `relicSpecial` (`specials.ts:78`) donne « − » à toute relique qui ne part pas dans le tour de son porteur. Sur un corpus roster × reliques (S11), ce cas représente 53/56 déclenchements de la Dent de loup, 55/57 du Collier, 52/56 de la Larme, 37/37 de la Conque, 119/119 de la Géode et 176/176 de l'Écu. Le même instant joue donc **Bonus gagné** (ou Soin) pour l'effet, et **Malus reçu** pour le label. C'est conforme à la règle écrite (RESOLUTION § 11 règle 1 ; SONS § 4.4), mais les deux sons se contredisent quand la relique ne contre pas le coup en cours : Dent de loup (Vol de vie pour plus tard), Collier (Épines pour le coup suivant), Larme (soin), Trophée qui part au début du tour adverse (1 cas). **Proposition (à soumettre) :** garder « − » pour ce qui contre le coup en cours (boucliers de l'Écu et de la Géode, dégâts de la Conque). Pour le reste, laisser le seul son de l'effet (label sans son), comme la règle 5 de SONS § 4.4 le fait déjà pour les Épines.
- **T4. Documentation en retard.** `SONS.md:101` : « la Clepsydre, Aura gagnée ». Elle pose un Critique assuré depuis la 0.105.0, donc Bonus gagné. `SONS.md` § 4.1 n'a pas de ligne pour l'étape `relic`, alors que le § 6 l'exige pour toute étape. `RESOLUTION.md:169` (2 bis) cite encore « si l'adversaire porte 3 Poison ou plus » au lieu de 1. `Icon.tsx:255-256` : « le sceau qui l'entoure (hexagone, RelicSeal) suffit » ; l'hexagone est retiré depuis la 0.91.1.
- **T5. Les cinq icônes existent maintenant.** `src/assets/icons/{venom-vial,butcher-hook,abbey-incense,dented-shield,eagle-feather}.png` sont dans l'arbre de travail : non suivies par git, datées du 2026-10-24 à 15:25. `RelicIcon` les prend par le glob : le repli de l'initiale ne s'affiche donc plus. Ce repli aurait d'ailleurs été ambigu (Encens « E » et Écu « É » côte à côte). `RELIQUES.md:447` et `:540` disent encore « aucune des cinq n'a son image ». Écarts entre les images et le § 13 : voir Encens et Écu.

---

#### Contrepoids de plomb (`lead-pommel`)
- **Fait** : +1 au multiplicateur de critique, −4 % de chance de critique, à plat (`withRelicStats`).
- **Texte actuel** : « +1 au multiplicateur de critique, −4 % de critique »
- **Texte proposé** : garder.
- **Effets concurrents** : il multiplie tout ce qui passe avant le critique (Fer, Fiole, Croc, dorure : étape 3), pas l'Élan (étape 4). Il gêne la Plume d'aigle (moins de critiques) et valorise la Cloche, la Clepsydre et le Trophée (critique assuré à ×3). Observé, Cloche + Plume + Contrepoids : « Critique assuré », puis « Critique ×3 », 3 → 9.
- **À l'écran** : permanent, pas de déclenchement. Le multiplicateur se lit dans le label « Critique ×3 ». Fiche : valeur en or.
- **Problèmes** : aucun.
- **Proposition** : —

#### Bottes de feutre (`felt-boots`)
- **Fait** : +6 % d'esquive à plat.
- **Texte actuel** : « +6 % d'esquive »
- **Texte proposé** : garder.
- **Effets concurrents** : elles se cumulent à la Cotte (−5 %), avec un net de +1 %. Elles nourrissent la Conque des vents.
- **À l'écran** : permanent. L'esquive tirée joue le son Esquive, sans label (seule l'esquive imposée a le sien).
- **Problèmes** : aucun.
- **Proposition** : —

#### Cotte du mercenaire (`mercenary-mail`)
- **Fait** : +1 armure, −5 % d'esquive. Une esquive négative n'esquive jamais.
- **Texte actuel** : « +1 armure, −5 % d'esquive »
- **Texte proposé** : garder.
- **Effets concurrents** : l'armure passe avant les boucliers (étape 7). Elle rogne les coups lus par l'Écu cabossé : un coup de 7 retire 6 PV et l'Écu part, un coup de 6 n'en retire que 5 et il ne part plus (observé, 14 coups de 6 sans déclenchement). D'où la paire Cotte + Écu à −0,19 (RELIQUES § 13).
- **À l'écran** : permanent.
- **Problèmes** : sur le boss (`campaign.ts:97`), l'esquive passe de 4 % à **−1 %** (observé : `dodgeChance: -0.01`). Le Colosse n'esquive donc jamais, alors que sa fiche dit « Peu d'esquive » (`campaign.ts:90`). Écart de texte mineur.
- **Proposition** : dire « Aucune esquive » dans les faiblesses du boss, ou garder ses 4 % en lui donnant une autre relique de caractéristique.

#### Osselet fendu (`split-knucklebone`)
- **Fait** : à chaque dé qui fait 1 (coup touché, esquivé, remplacé ou brut de Furie), 3 dégâts directs à l'adversaire, sans limite.
- **Texte actuel** : « Sur un 1 : 3 dégâts directs »
- **Texte proposé** : garder. « Sur un 1 » et « dégâts directs » portent la règle (RESOLUTION § 3, vocabulaire).
- **Effets concurrents** : la fenêtre du dé passe après la compétence de la face (§ 5, règle 2). Observé : un 1 esquivé fait partir l'Osselet. Chez la barde (1 puis 6), l'Osselet part sur le jet 1, puis le Dé creux sur le jet 2, chacun causé par son coup. Sur un 1 de Furie (Gorak), il part aussi. Deux 1 dans une action le font partir deux fois (S11 : 4 moments à deux labels).
- **À l'écran** : une réaction au milieu de la lecture du coup (M17). Label « Osselet fendu + » avec son ding ; les 3 dégâts arrivent comme un coup sans élan, avec le son Coup. Conforme à SONS § 4.2.
- **Problèmes** : aucun.
- **Proposition** : —

#### Dé creux (`hollow-die`)
- **Fait** : sur un 6 au dé (même esquivé), +1 Esquive améliorée (cumulable), puis 3 tours de recharge du porteur.
- **Texte actuel** : « Sur un jet maximal : +1 Esquive améliorée · recharge 3 tours »
- **Texte proposé** : « Sur un 6 : +1 Esquive améliorée · recharge 3 tours ». Le d6 est fixe depuis la 0.105.0 (`naturalMax` = `DIE_FACES` = 6) : « jet maximal » est un mot des dés variables, et « Sur un 6 » s'aligne sur l'Osselet et le Fer.
- **Effets concurrents** : sur un 6 critique avec la Plume d'aigle, les deux partent (`naturalMax` avant `crit`) : 2 charges, deux coups esquivés (observé). Avec la barde, deux 6 dans la même action ne le font partir qu'une fois (recharge).
- **À l'écran** : réaction au coup, label +, Bonus gagné. Conforme.
- **Problèmes** : texte seulement.
- **Proposition** : dans `momentOf` (`relics.ts:387`), écrire `Sur un ${DIE_FACES}` pour `naturalMax`.

#### Fer à quatre clous (`four-nail-shoe`)
- **Fait** : sur un coup qui touche dont le dé fait 4, +4 à la valeur du coup, après ×N et avant le critique.
- **Texte actuel** : « Sur un 4 : +4 dégâts à ce coup »
- **Texte proposé** : garder.
- **Effets concurrents** : observé sur un 4 (attaque 3, critique ×2, dorure sur le 4, adversaire empoisonné et en sang, 1 Élan) : 3 + Fer 4 + Fiole 2 + Croc 2 + dorure 2 = 13, ×2 = 26, +1 Élan = 27, −1 armure = 26. L'ordre suit RESOLUTION § 3 (2 bis, 2 ter, 3, 4). Les labels tombent dans cet ordre : Fer, Fiole, Croc (ordre d'obtention), Face dorée, puis Critique ×2, puis Élan +1 et Saignement +5 à l'impact ; un seul ding (M6). Chez la barde, chaque 4 a son bonus (4 + 4 : deux coups de 6). Sur un 4 de Furie aussi. Le bonus n'est **pas** multiplié par « ce coup ×N » (Soliste, Crescendo : `drawn * multiplier + bonus`, `combat.ts:428`), mais il l'est par le critique et par Pile. Dans le roster, aucun ×N n'est sur la face 4, donc le cas ne se présente pas.
- **À l'écran** : label « Fer à quatre clous +4 » au dé posé, avec le sceau qui s'illumine (M8). Conforme.
- **Problèmes** : aucun.
- **Proposition** : —

#### Cloche d'ouverture (`opening-bell`)
- **Fait** : au début de son 1er tour (après ses statuts et ses compétences de début de tour), +1 Critique assuré, une fois.
- **Texte actuel** : « Au 1er tour : +1 Critique assuré »
- **Texte proposé** : garder.
- **Effets concurrents** : le critique attend le premier coup qui touche (pas de consommation sur une esquive ni sur un jet remplacé, `combat.ts:1077`). Avec la Plume d'aigle : critique assuré, puis la Plume (observé). Le Critique assuré se cumule (`add`) avec le Trophée et la Clepsydre. Une Peur au premier tour ne le gaspille pas.
- **À l'écran** : au début du tour, label « + » sous le plateau vide, Bonus gagné. Le sceau s'éteint ensuite (charge épuisée). Conforme.
- **Problèmes** : aucun.
- **Proposition** : —

#### Chapelet de l'ermite (`hermit-beads`)
- **Fait** : au début de ses tours 3, 6, 9…, après les statuts de début de tour, il retire son dernier malus posé (mécanismes exclus) ; s'il n'en a aucun, il rend 3 PV.
- **Texte actuel** : « Tous les 3 tours : retire son dernier malus, sinon +3 PV »
- **Texte proposé** : garder.
- **Effets concurrents** : il passe **après** le tic du Poison (statuts, puis compétences, puis reliques : RESOLUTION § 5, règle 2). Le Poison a donc déjà frappé ce tour-là. Il passe **avant** le contrôle de l'action : observé, une Peur posée à la fin du tour adverse est retirée au début du 3e tour du porteur (`#10 Chapelet removed ["fear"]`), et le porteur agit (`#11 ATK`). Son soin de repli ouvre la fenêtre `healed` : avec l'Encens, l'Élan arrive au même début de tour et sert le coup de ce tour (observé : 3 → 4).
- **À l'écran** : label +, son Dissipation (purge) ou Soin (repli). Conforme à SONS § 4.2.
- **Problèmes** : aucun.
- **Proposition** : —

#### Clepsydre du siège (`siege-clepsydra`)
- **Fait** : au début de ses tours 6, 10, 14…, +1 Critique assuré.
- **Texte actuel** : « Au 6e tour, puis tous les 4 tours : +1 Critique assuré »
- **Texte proposé** : garder.
- **Effets concurrents** : même chose que la Cloche. Elle se cumule avec la Plume (+0,43 dans `npm run synergy`).
- **À l'écran** : label +, Bonus gagné.
- **Problèmes** : `SONS.md:101` lui donne encore « Aura gagnée » (T4).
- **Proposition** : corriger SONS.md.

#### Dent de loup (`wolf-fang`)
- **Fait** : la première fois que ses PV passent sous 40 % (sauf sur un K.O.), +1 Vol de vie (plafond 2), une fois par combat.
- **Texte actuel** : « Sous 40 % PV : +1 Vol de vie · 1 fois par combat »
- **Texte proposé** : garder.
- **Effets concurrents** : posé pendant le coup adverse, le Vol de vie attend son prochain coup (règle 9) ; un coup esquivé le consomme sans soin. Avec la compétence Vol de vie (Ervald) : si le statut est déjà à 2, la relique part, **dépense sa charge** et ne pose rien (observé sur un combat construit : `stacks: 0`, texte « Vol de vie au maximum », sans label ni son). Dans le roster : **0 cas sur 384 déclenchements** (Ervald, 400 combats), car la charge d'Ervald s'use sur son propre coup. Son soin ouvre `healed` (Encens). Quand plusieurs seuils passent sur le même coup, voir T1.
- **À l'écran** : réaction au coup adverse. Label « − » avec Malus reçu, en même temps que le Bonus gagné de l'effet (T3).
- **Problèmes** : T1, T3. Une charge peut être perdue au plafond (théorique).
- **Proposition** : T1, T3. Pour le plafond, au choix : ne pas dépenser la charge quand tous les effets sont au plafond (`atCap`), ou le laisser tel quel (cas nul dans le roster).

#### Collier de ronces (`bramble-collar`)
- **Fait** : la première fois sous 50 % de ses PV, +2 Épines acérées, permanentes et cumulables.
- **Texte actuel** : « Sous 50 % PV : +2 Épines acérées · 1 fois par combat »
- **Texte proposé** : garder.
- **Effets concurrents** : les Épines ne répondent pas au coup qui fait passer le seuil (règle 9, `strikeBase`). Les charges s'ajoutent à celles de Brokk. Le Saignement qu'elles posent nourrit le Croc de boucher (+0,39).
- **À l'écran** : label « − » et Malus reçu, alors qu'il s'agit d'un bonus pour plus tard (T3).
- **Problèmes** : T1, T3.
- **Proposition** : T1, T3.

#### Trophée du chasseur (`hunter-trophy`)
- **Fait** : la première fois que les PV de **l'adversaire** passent sous 30 % (sauf sur un K.O.), +1 Critique assuré au porteur, une fois.
- **Texte actuel** : « Adversaire sous 30 % PV : +1 Critique assuré · 1 fois par combat »
- **Texte proposé** : garder.
- **Effets concurrents** : quand la Larme de l'adversaire le soigne au-dessus de 30 % dans la même vérification, le Trophée part quand même (`crossed`, comme documenté). Sur le coup du porteur qui fait passer le seuil, il part en réaction (label +). Sur le Poison adverse au début du tour adverse, il part avec « − » (1 cas, T3). Ordre des camps : voir T1 (observé : il part après le Collier du défenseur).
- **À l'écran** : Bonus gagné. Le critique se voit au coup suivant (« Critique assuré »).
- **Problèmes** : T1.
- **Proposition** : T1.

#### Braise captive (`caged-ember`, Feu)
- **Fait** : au début de son 4e tour, 3 × 2 dégâts directs à l'adversaire, une fois.
- **Texte actuel** : « Au 4e tour : 3 × 2 dégâts directs »
- **Texte proposé** : garder.
- **Effets concurrents** : elle passe après les statuts de début de tour du porteur. Les 6 dégâts sont appliqués d'un bloc (`applyEffect`, `parts` [2,2,2]) : si le premier météore met K.O., les trois sont quand même joués. Comportement partagé avec la Foudre.
- **À l'écran** : scène `emberRain` à 400 ms, en même temps que le sceau et le label « Braise captive + » avec son ding ; les impacts suivent à 960, 1 300 et 1 640 ms, chacun avec le son Coup critique (SONS, comme la Foudre). Le sceau s'éteint au dernier impact. Conforme à M24.
- **Problèmes** : aucun propre.
- **Proposition** : —

#### Larme de givre (`frost-tear`, Givre)
- **Fait** : la première fois sous 35 % de ses PV, retire tous ses malus, puis +5 PV, une fois.
- **Texte actuel** : « Sous 35 % PV : retire tous ses malus, +5 PV · 1 fois par combat »
- **Texte proposé** : garder.
- **Effets concurrents** : son soin réarme les seuils et ouvre `healed` (Encens). Le Trophée adverse du même passage part quand même (documenté, vérifié par le code). Avec d'autres seuils sur le même coup : T1.
- **À l'écran** : scène `hoarfrost`, sceau au début, effets au premier impact (760 ms), puis la fin de la scène (M24). **Sans malus à retirer, le texte « Rien à purifier » s'affiche** à côté de « +5 PV » (observé). Les compétences le taisent (`quietPurges`, `staging.ts:286`) ; l'étape `relic` (`staging.ts:1208-1211`) ne le fait pas. Son : Soin, puis Malus reçu pour le label « − » (T3).
- **Problèmes** : bruit « Rien à purifier » (écran). T3. La phrase d'ambiance dit « fêlée près de la pointe » (`relics.ts:230`), alors que l'icône est fêlée au tiers depuis le bas (RELIQUES:481 : « à accorder », pas fait).
- **Proposition** : passer `quietPurges(beat.effects)` dans le cas `relic` de `stage`. Écrire « fêlée au tiers » dans la phrase d'ambiance.

#### Conque des vents (`wind-conch`, Vent)
- **Fait** : quand le porteur esquive un coup (esquive tirée ou imposée), 3 × 2 dégâts directs à l'attaquant, deux fois par combat.
- **Texte actuel** : « Quand il esquive : 3 × 2 dégâts directs · 2 fois par combat »
- **Texte proposé** : garder.
- **Effets concurrents** : elle part aussi sur l'Esquive améliorée (observé : la Plume d'aigle ou le Dé creux la nourrissent). Ses dégâts directs n'ouvrent pas `hurt` (règle 6) : ni Riposte ni Écu en face.
- **À l'écran** : scène `gale`, trois lames, son Coup par lame ; label « − » (une contre-attaque : le signe est juste).
- **Problèmes** : aucun.
- **Proposition** : —

#### Géode fendue (`split-geode`, Terre)
- **Fait** : quand un coup le touche (pile comprise), +4 Armure temporaire. Deux fois par combat, puis 3 tours de recharge du porteur.
- **Texte actuel** : « Quand il encaisse un coup : +4 Armure temporaire · 2 fois par combat · recharge 3 tours »
- **Texte proposé** : garder.
- **Effets concurrents** : avec l'Écu cabossé, sur un coup de 7, les deux partent (ordre d'obtention) et les boucliers s'additionnent (2 + 4 = 6) ; le coup suivant de 7 tombe à 1 (observé). La recharge compte les tours du porteur : déclenchée pendant le tour adverse après son 1er tour, elle est prête à son 4e.
- **À l'écran** : l'Écu tombe au milieu de la lecture (2 125 ms). La scène `stoneWall` de la Géode commence 1,3 s plus tard (3 425), et son effet arrive à l'impact (3 805). Deux textes « Armure temporaire », deux labels « − ». Conforme à M24.
- **Problèmes** : T3 (signe juste ici ; les deux sons Bonus gagné et Malus reçu tombent quand même ensemble).
- **Proposition** : —

#### Fiole de venin (`venom-vial`)
- **Fait** : si l'adversaire porte au moins 1 Poison au début du coup, +2 à la valeur d'un coup qui touche, avant le critique.
- **Texte actuel** : « Si l'adversaire porte Poison : +2 dégâts à la frappe »
- **Texte proposé** : « Si l'adversaire porte Poison : +2 dégâts à ce coup ». Même mécanique que le Fer, donc les mêmes mots ; « à la frappe » et « à ce coup » sont synonymes dans RESOLUTION § 3 (vocabulaire).
- **Effets concurrents** : voir le Fer (cumul avant le critique). Chez la barde, un Poison posé par le jet 1 compte au jet 2 (état du début du coup).
- **À l'écran** : label « Fiole de venin +2 » au dé posé, sceau qui s'illumine. Conforme (M8).
- **Problèmes** : texte. **Lecture du § 13 périmée** (`RELIQUES.md:515`) : elle dit que Naraxes ne la nourrit pas, sauf par Coup de chance. Or Naraxes n'a plus Coup de chance (ses compétences : `coin-flip`, `decoction-aura`), et son Aura de décoction pose 2 Poison par coup : il en reste 1 au coup suivant. Mesuré : **292 bonus sur 400 combats** (0,73 par combat), dont 0 en rafale. Le +2,0 de Naraxes (mesure de la 0.108.0) est sans doute périmé.
- **Proposition** : dans `describeRelic` (`relics.ts:413`), écrire « à ce coup » pour tout bonus de coup. Remesurer la Fiole sur Naraxes (`npm run relics`) et corriger la lecture du § 13.

#### Croc de boucher (`butcher-hook`)
- **Fait** : si l'adversaire porte au moins 1 Saignement au début du coup, +2 à la valeur d'un coup qui touche, avant le critique.
- **Texte actuel** : « Si l'adversaire porte Saignement : +2 dégâts à la frappe »
- **Texte proposé** : « Si l'adversaire porte Saignement : +2 dégâts à ce coup ».
- **Effets concurrents** : il lit l'état avant que la plaie coule. Une plaie de 1 qui se referme sur ce coup donne quand même le bonus (observé : bonus, puis « Saignement +5 » à l'impact). Le Collier de ronces le nourrit.
- **À l'écran** : comme la Fiole.
- **Problèmes** : texte.
- **Proposition** : la même que la Fiole.

#### Encens de l'abbaye (`abbey-incense`)
- **Fait** : chaque étape qui lui rend au moins 1 PV (Vol de vie, aura, repli du Chapelet, Larme) lui donne +1 Élan (+1 au prochain coup qui touche, **après le critique**, avant l'armure, cumulable).
- **Texte actuel** : « Quand il regagne des PV : +1 Élan »
- **Texte proposé** : garder.
- **Effets concurrents** : le soin du Vol de vie part dans `hit`, puis l'Encens, puis la Riposte adverse dans `hurt` (observé #3, #4, #5). L'Élan gagné pendant un coup sert le coup suivant (règle 9) : observé, le coup suivant passe de 4 à 5. Avec le Chapelet : soin au début du tour, Élan, coup du même tour. Aucun déclenchement sur un soin nul. Classé « Coup », il part pourtant surtout hors des coups : sur le corpus S11, 24 fois sur 31 à la fin du tour (Aura de sainteté).
- **À l'écran** : quand le soin vient du Vol de vie, l'Encens passe **2,4 s après le soin**, après la Riposte (T2). Label +, Bonus gagné. Le texte « Élan » tombe sur le porteur (icône de la Puissance, RELIQUES:540).
- **Problèmes** : T2 (écran). Le type « Coup » (`RELIC_KINDS.strike` : « sur ses coups… ou un soin reçu ») est discutable pour une relique qui part surtout à la fin du tour. **Icône** : un sac de toile noué d'un cordon rouge, une braise et de la fumée. Le § 13, le nom et la phrase d'ambiance demandent un encensoir de cuivre cabossé, à la chaîne nouée.
- **Proposition** : T2. Repeindre l'icône (encensoir à chaîne) ou accorder la phrase d'ambiance à la bourse.

#### Écu cabossé (`dented-shield`)
- **Fait** : quand un coup le touche et lui retire au moins 6 PV (après l'armure et les boucliers ; pile comprise, avec le montant de la pile), +2 Armure temporaire, sans limite.
- **Texte actuel** : « Quand il encaisse un coup, si ce coup retire 6 PV ou plus : +2 Armure temporaire »
- **Texte proposé** : « Quand il encaisse un coup de 6 PV ou plus : +2 Armure temporaire ». Plus court, même règle.
- **Effets concurrents** : la Cotte (observé : 7 → 6, il part ; 6 → 5, il ne part pas). La Géode (deux boucliers sur le même coup, voir Géode). Son propre bouclier le limite : observé, un coup de 7 dont 2 sont absorbés retire 5 PV, et l'Écu ne repart pas. La Riposte, l'Osselet et la Conque ne sont pas des coups encaissés (règle 6).
- **À l'écran** : réaction au milieu de la lecture, label « − » (contre : juste), Bonus gagné + Malus reçu (T3). Deux labels « Écu cabossé » dans un même moment sur une rafale (S11 : 4 cas), effacés coup par coup (M9).
- **Problèmes** : texte long. **Icône** : quatre creux sur le dôme, pas les **six** que demande le § 13 (« le chiffre de la règle se lit dans l'objet », § 6.3). Quatre, c'est le chiffre du Fer.
- **Proposition** : dans `momentOf`, rédiger « Quand il encaisse un coup de N PV ou plus » quand `hitAtLeast` est la seule condition d'un moment `hurt`. Repeindre avec six creux.

#### Plume d'aigle (`eagle-feather`)
- **Fait** : quand son coup est critique (tiré ou assuré), +1 Esquive améliorée, puis 2 tours de recharge du porteur.
- **Texte actuel** : « Quand il porte un critique : +1 Esquive améliorée · recharge 2 tours »
- **Texte proposé** : garder.
- **Effets concurrents** : la Cloche et la Clepsydre la nourrissent (observé : critique assuré au tour 1, puis la Plume). Le Contrepoids la gêne (−4 %). Sur un 6 critique avec le Dé creux : 2 Esquives (observé). Pile n'ouvre pas `crit`. Chez la barde, deux critiques dans la même action ne la font partir qu'une fois.
- **À l'écran** : réaction, label +, Bonus gagné. Conforme.
- **Problèmes** : icône sans les « deux barbes arrachées » du § 13 (recharge de 2), peu lisible ; le reste correspond (fil rouge, anneau de cuivre).
- **Proposition** : —

### Autres cas demandés

- **Les deux jets de la barde, la Furie, Coup de chance** : chaque jet est un jet complet (`jet`, `combat.ts:1053`). Les reliques de face lisent chaque dé (règle 8). Observé, Fanchon : 1 puis 6 donne l'Osselet puis le Dé creux ; 4 puis 4 donne deux fois le Fer. Gorak, Furie puis 4 et 1 : le Fer sur le 4 de Furie et l'Osselet sur le 1 (coups bruts : reliques seules, `relicsOnly`). Coup de chance : même chemin `action → jet` (`combat.ts:1173-1189`) ; aucun personnage du roster ne l'a plus en signature, il n'a donc pas été simulé.
- **Reliques de tour et statuts au début du tour** : statuts (bonus puis malus), compétences `turnStart`, reliques, puis le contrôle de l'action (`combat.ts:1218-1224`). Conforme à RESOLUTION § 5, règle 2. Conséquence : le Chapelet peut retirer une Peur avant qu'elle coûte l'action (observé).
- **Le boss** (Colosse : Cotte + Dent de loup) : stats observées : armure 0 → 1, esquive 4 % → −1 %. La Dent de loup part dans 49 combats sur 200 (roster × 20 graines, 70 PV non réglés). Sceaux et labels identiques à ceux d'un combattant normal. Seul écart : « Peu d'esquive » (voir Cotte).
- **Sceau** : il s'illumine au label (M23), deux fois pour une scène sur le porteur (M24). Il s'éteint à la dernière charge. Une relique à recharge sans charge (Dé creux, Plume, Clepsydre) ne montre pas sa recharge en combat : rien de faux, mais rien n'indique non plus qu'elle est prête.

### Synthèse

| Élément | Problème | Gravité | Proposition |
| --- | --- | --- | --- |
| Reliques de seuil (Dent, Collier, Trophée, Larme) | Le défenseur résout avant l'actif (`checkThresholds` parcourt `[0, 1]`) ; les seuils d'un même coup partent en chaîne, chacun avec la relique précédente pour cause | bug | Commencer par l'actif ; marquer tous les passages avant de déclencher, avec le coup pour cause ; contrôle d'audit (T1) |
| Dent de loup | Une charge dépensée sans effet si le Vol de vie est au plafond (0 cas sur 384 dans le roster) | bug (théorique) | Ne pas dépenser une relique dont tous les effets sont au plafond, ou accepter |
| Encens de l'abbaye (et seuils en chaîne) | Joué 2,4 s après le soin qui le cause, après la Riposte, hors du milieu de la lecture (M17) | écran | Ajouter aux réactions du coup les reliques causées par ses `rides` (T2) |
| Larme de givre | « Rien à purifier » affiché à côté de « +5 PV » | écran | `quietPurges` dans le cas `relic` de `stage` |
| Reliques du défenseur (Dent, Collier, Larme, Géode, Écu) | Label « − » : Malus reçu et Bonus gagné (ou Soin) au même instant ; « − » faux pour un bonus pour plus tard | écran (à trancher) | « − » seulement pour ce qui contre le coup en cours, sinon label muet (T3) |
| Encens de l'abbaye | Icône (bourse de toile) différente de l'objet nommé (encensoir de cuivre à chaîne) | écran | Repeindre, ou accorder la phrase d'ambiance |
| Écu cabossé | Icône à 4 creux au lieu de 6 (§ 6.3) | écran | Repeindre avec six creux |
| SONS.md | Clepsydre « Aura gagnée » (Bonus gagné en réalité) ; pas de ligne `relic` au § 4.1 | texte | Corriger ; ajouter la ligne `relic` |
| Fiole de venin, Croc de boucher | « à la frappe » contre « à ce coup » pour la même mécanique | texte | « +2 dégâts à ce coup » |
| Dé creux | « Sur un jet maximal » sur un d6 fixe | texte | « Sur un 6 » |
| Écu cabossé | Ligne longue | texte | « Quand il encaisse un coup de 6 PV ou plus : +2 Armure temporaire » |
| Fiole de venin (RELIQUES § 13) | Lecture Naraxes périmée (plus de Coup de chance ; 0,73 bonus par combat) | texte | Remesurer (`npm run relics`), réécrire la lecture |
| RESOLUTION.md 2 bis | Exemple « 3 Poison ou plus » périmé | texte | « au moins 1 Poison » |
| RELIQUES § 11 et § 13, Icon.tsx | « aucune des cinq n'a son image » (les PNG sont là, non suivis) ; commentaire sur l'hexagone | texte | Mettre à jour une fois les icônes validées |
| Larme de givre | Phrase d'ambiance « près de la pointe » contre une fêlure au tiers sur l'icône | texte | « fêlée au tiers » |
| Boss (Cotte) | « Peu d'esquive » alors que l'esquive est à −1 % (aucune esquive) | texte | Corriger la faiblesse, ou changer la relique |
| Encens de l'abbaye | Type « Coup » pour une relique qui part surtout à la fin du tour | texte | Revoir le résumé du type, ou accepter |

Rien n'a été vérifié dans un navigateur ni à l'oreille : instants et sons sont lus dans les cues de `stage()`, pas vus ni entendus. Les jugements sur les icônes viennent des PNG à 128 px.

