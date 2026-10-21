# Familles d'effets : proposition

_Document de travail, octobre 2026. Suite de [ETUDE_AUTOBATTLER.md](ETUDE_AUTOBATTLER.md) (§ 4.2) et de la discussion sur les reliques. Rien n'est encore appliqué au code : ce sont des propositions à valider. Toute retouche de compétence citée ici est à mesurer avant d'être livrée ([EQUILIBRAGE.md](EQUILIBRAGE.md))._

Chiffres cités : valeurs nettes et taux de victoire tirés de [PERSONNAGES.md](PERSONNAGES.md) (mesures 0.26.0 à 0.35.2). Je n'ai lancé aucune nouvelle simulation.

---

## 0. En bref

- **Dix familles, rangées par effet** : Puissance, Garde, Précision, Esquive, Tempo, Fortune, Affliction, Soin, Représailles, Sceaux. Chacune répond à une question simple du spectateur, par exemple « il frappe plus fort ? » ou « il perd son tour ? ».
- **Une famille est un axe, avec un côté bonus et un côté malus.** L'Aura de puissance et Affaibli sont les deux côtés du même axe, comme le Poison et la Régénération, ou la Furie des vents et la Peur.
- **Le « quand » est séparé du « quoi ».** La famille dit ce que fait l'effet ; la fenêtre d'usure (`consumedOn`, étude § 4.1) dit quand il se consomme. Une compétence s'écrit alors comme un assemblage : *face, famille, montant, fenêtre, cible*.
- **Aucun personnage ne perd sa signature.** Sur 30 compétences, 21 restent identiques ; 5 changent seulement de mécanique interne, sans changer d'effet visible ; 4, les plus faibles, ont une retouche proposée, à mesurer.
- **Chaque famille expose un compteur et des moments.** C'est ce que liront les reliques (« +1 dégât par charge de Garde », « quand un effet de Tempo est consommé… »). Les synergies naissent de ce vocabulaire partagé.

**Ce qui change par rapport à l'étude (§ 4.2)** : l'étude rangeait les statuts surtout par fenêtre d'usure (Préparation, Visée, Parade). À l'usage, un spectateur lit d'abord *ce que fait* un effet, et seulement ensuite *quand*. La Riposte, par exemple, est d'abord un Renvoi qui attend le prochain coup reçu, pas une « Parade ». Les familles sont donc rangées par effet, et la fenêtre devient un second attribut, montré par un repère sur l'icône.

---

## 1. Le principe : une compétence est un assemblage

Aujourd'hui, une compétence pose un statut, et ce statut porte un ou plusieurs crochets propres au moteur. Demain, la même compétence se lit comme une phrase faite de briques :

| Brique | Question | Valeurs |
| --- | --- | --- |
| **Face** | sur quel jet ? | 1, 2, 3 (plus tard : faces personnalisées, reliques) |
| **Famille** | que fait-elle ? | l'une des dix familles, côté bonus ou malus |
| **Montant** | combien ? | charges, points, PV, coups |
| **Fenêtre** | jusqu'à quand ? | `nextAction`, `nextStrikeDealt`, `nextStrikeTaken`, `points`, `turns`, `permanent` |
| **Cible** | sur qui ? | soi, l'adversaire |
| **Chance** (facultatif) | à coup sûr ? | une probabilité, par exemple 50 % pour pile ou face |

Exemples, avec les compétences actuelles :
- **Furie des vents** : 2, Tempo +1 action, prochaine action, soi ;
- **Œil de faucon** : 1, Précision (critique forcé), prochain coup porté, soi ;
- **Épines** : 2, Représailles 6, 1 tour, soi ;
- **Aura de décoction** : 3, convertisseur « coup qui touche → Affliction 1 », permanent, soi.

Un spectateur qui connaît les dix familles et les six fenêtres comprend n'importe quelle compétence nouvelle, et la description en jeu peut se générer à partir de ces briques. `describeEvent` et `statusRules` le font déjà en partie.

---

## 2. Les dix familles

| # | Famille | Question du spectateur | Côté bonus (aujourd'hui) | Côté malus (aujourd'hui) | Compteur lu par les reliques |
| --- | --- | --- | --- | --- | --- |
| 1 | **Puissance** | ses coups font-ils plus mal ? | Aura de puissance, Force de l'ours et Aura sauvage (druide, 0.73.0) | Affaibli _(inutilisé)_ | bonus de dégâts actuel |
| 2 | **Garde** | encaisse-t-il moins ? | Armure temporaire, Aura d'intimidation (Écorce épaisse retirée en 0.73.0) | Vulnérable, Brèche _(inutilisés)_, Luciole (+2 reçus) | points de bouclier |
| 3 | **Précision** | va-t-il critiquer ? | Critique assuré, Aura de précision | _(aucun ; piste : Aveuglé)_ | critiques forcés en attente |
| 4 | **Esquive** | va-t-il éviter le coup ? | Esquive améliorée | Luciole (ne peut plus esquiver) | esquives forcées en attente |
| 5 | **Tempo** | combien d'actions ? | Furie des vents | Peur, Étourdi _(inutilisé)_, Attente | actions gagnées ou perdues |
| 6 | **Fortune** | que va donner le dé ? | Coup de chance, Pile ou face, Incantation (d3 du druide, 0.73.0) ; Charge et Coup de griffe retirés en 0.73.0 | _(aucun ; piste : Malchance)_ | jets modifiés |
| 7 | **Affliction** | perd-il des PV à chaque tour ? | _(sur l'adversaire)_ Aura glaciale (pose du Poison, 0.69.0), Aura de décoction, Pourfendre, Épines acérées, Feux follets (de retour en 0.73.0), Foudre (dégâts directs, 0.73.0) ; Aura de pourriture sans porteur depuis la 0.71.0 | Poison, Saignement (0.68.0 : à chaque coup reçu), Brûlure (de retour en 0.73.0) ; Pourriture sans porteur depuis la 0.71.0 | charges d'affliction portées |
| 8 | **Soin** | regagne-t-il des PV ? | Aura de sainteté, Vol de vie ; Régénération sans porteur depuis la 0.73.0 (Fleur de vie retirée ; Rage du sang jusqu'à la 0.67.3) | _(piste : Hémorragie, soins réduits)_ | PV rendus |
| 9 | **Représailles** | le frapper se paie-t-il ? | Épines acérées (en plaie, 0.68.0), Riposte, Rétribution | _(aucun)_ | dégâts renvoyés ou stockés |
| 10 | **Sceaux** | ses statuts tiennent-ils ? | Aura d'immunité, Garde sacrée _(inutilisée)_, Purification | _(piste : Sceau brisé, ne peut plus recevoir de bonus)_ | statuts bloqués ou retirés |

Les 31 statuts actuels trouvent tous une place, sans créer de famille pour un seul statut.

### 2.1 Règles de rangement

1. **Un statut appartient à une seule famille**, celle de son effet principal. Il prend sa couleur, son cadre et son son par défaut.
   - Seul cas mixte aujourd'hui : **Luciole**. Elle empêche d'esquiver (Esquive, côté malus) et fait subir +2 dégâts (Garde, côté malus). Je propose de la ranger en **Esquive**, ce que dit son nom et son histoire (« les lucioles trahissent le porteur »), et de traiter le +2 comme un effet secondaire, affiché dans sa décomposition. Voir la question Q4.
2. **« Aura » n'est pas une famille, mais une durée** (`permanent`). Le double cadre doré qui existe déjà la signale. L'Aura de puissance est de la Puissance permanente ; l'Aura glaciale, de l'Affliction permanente infligée à l'adversaire.
3. **Les convertisseurs** (« quand il touche, pose X ») appartiennent à la famille de ce qu'ils produisent. L'Aura de décoction et l'Aura de pourriture sont de l'Affliction.
4. **Les compétences sans statut** (soin immédiat, Purification, Rétribution relâchée, Foudre) ont aussi une famille. C'est ce qui permet à une relique de dire « vos compétences de Soin… ».
5. **Avant de créer une 11e famille, il faut vérifier qu'aucune des dix ne convient.** Si une nouvelle famille est vraiment nécessaire, c'est une décision explicite, notée dans `SYSTEMES.md` (étude § 4.2).

### 2.2 Les axes qui se répondent

Le rangement par axe fait apparaître des paires bonus/malus. Elles existent déjà en partie dans le moteur, avec l'opposition Poison/Régénération (`opposes`) :

- **Puissance** : Aura de puissance / Affaibli ; l'Aura d'intimidation du nain joue le même rôle, mais vue du défenseur (Garde).
- **Tempo** : Furie des vents (une action de plus) / Peur, Attente (une action de moins). L'orc et la prêtresse se répondent directement.
- **Affliction / Soin** : deux familles en miroir. La règle d'opposition pourrait s'étendre à tout l'axe, ce qui est à décider et à mesurer.

C'est une réserve de contres lisibles pour plus tard : un malus déjà défini, mais inutilisé (Affaibli, Vulnérable, Brèche, Brûlure, Étourdi), devient l'outil naturel d'une relique ou d'un édit de tournoi, sans écrire de nouvelle règle.

---

## 3. Présentation : une famille, un langage visuel

**Essayé en 0.51.0, refusé par l'utilisateur** pour les médaillons des états : dix couleurs, « c'est carnaval, ça complique énormément la compréhension ». La distinction simple bonus vert / malus rouge est meilleure. Retenu : le **bord en pointillés pour les dégâts périodiques** (0.52.1). Les couleurs ci-dessous ne sont donc plus une piste pour les médaillons ; elles peuvent encore servir ailleurs (sons par famille, reliques), à rediscuter. L'idée d'origine :

- **La couleur dit la famille.** Une teinte par famille, utilisée pour le cadre d'icône, le texte flottant et la lueur.
- **La forme du cadre dit la polarité.** Par exemple un cadre plein et arrondi pour un bonus, un cadre ébréché ou à pointes pour un malus. Aujourd'hui, la polarité utilise vert et rouge (`POLARITY_STYLE`), ce qui entre en conflit avec le vert du poison et le rouge des dégâts.
- **Un petit repère dit la fenêtre.** Par exemple une flèche pour « prochaine action », une lame pour « prochain coup porté », un écu pour « prochain coup reçu », un sablier pour une durée, le double cadre doré pour une aura. C'est ce qui permet de montrer une charge « armée » (étude QW4).

Pistes de teintes, pour éviter les conflits relevés dans l'étude (L7) :

| Famille | Piste | Pourquoi |
| --- | --- | --- |
| Puissance | orange | déjà celle de l'Aura de puissance |
| Garde | acier, bleu-gris | pierre, armure, écorce |
| Précision | **ambre** | l'ambre devient la couleur du **critique, et de lui seul** ; le ton « positive » de `narration.ts` doit en sortir |
| Esquive | cyan pâle | déjà celle de l'Esquive améliorée |
| Tempo | bleu ciel, plus sombre pour le malus | le vent de la Furie ; la Peur dans la même teinte, éteinte |
| Fortune | violet | le dé, la pièce ; à distinguer du vert du poison |
| Affliction | vert toxique | poison, pourriture |
| Soin | rose ou corail | ne doit pas entrer en conflit avec l'Affliction verte ni avec l'ambre |
| Représailles | cramoisi | épines, riposte ; les dégâts de coup restent blancs ou rouges, à trancher |
| Sceaux | or pâle, blanc | lumière, sanctuaire |

**Sons** : chaque famille aurait un son par défaut, et un statut ne déclarerait un son propre que pour une exception (étude § 4.4, `present.sfx`). Un agent est en train de remplacer les sons : le choix des sons par famille se fera sur la nouvelle banque, une fois ce travail terminé, sans toucher à `sound.ts` d'ici là.

---

## 4. Les personnages : signature et familles

La règle de travail : pour chaque personnage, sa **signature**, ce dont on se souvient après l'avoir vu jouer, est intouchable. Seule la mécanique interne change.

| Famille (race) | Signature, à garder | Familles principales | Compétences : 1 / 2 / 3 |
| --- | --- | --- | --- |
| Orcs | frapper fort, et deux fois | Puissance, Tempo, Affliction | Pourfendre (Affliction, 0.70.0 ; Saignée en 0.68.0, Rage du sang, Soin, avant) / Furie des vents (Tempo) / Aura de puissance (Puissance) |
| Elfes | ne pas être touchée, punir par le critique | Précision, Esquive | Œil de faucon (Précision) / Esquive améliorée (Esquive) / Aura de précision (Précision) |
| Nains | tenir la ligne, faire payer chaque coup | Garde, Représailles | Peau de pierre (Garde) / Épines acérées (Représailles, en Saignement depuis la 0.68.0) / Aura d'intimidation (Garde) |
| Morts-vivants | ronger et drainer | Affliction, Soin | Souffle de la tombe (Affliction) / Vol de vie (Soin) / Aura glaciale (Affliction) |
| Prêtresses | contrôler et durer | Tempo (malus), Sceaux, Soin | Peur (Tempo) / Purification (Sceaux) / Aura de sainteté (Soin) |
| Voleuses | le hasard et le poison | Fortune, Affliction | Coup de chance (Fortune) / Pile ou face (Fortune) / Aura de décoction (Affliction) |
| Paladins | rendre les coups | Représailles, Sceaux | Rétribution (Représailles) / Riposte (Représailles) / Aura d'immunité (Sceaux) |
| Ogres | taper fort, attendre | Tempo (malus sur soi) | Attente / Attente / Attente |
| Druide, forme humaine | lancer des sorts (0.73.0, Incantation : d3, aucun coup) | Affliction, Puissance | Foudre (Affliction, dégâts directs) / Feux follets (Affliction) / Aura sauvage (Puissance, pour l'ours) ; avant la 0.73.0 : Fleur de vie, Écorce épaisse, Aura de sève, relais |
| Druide, forme d'ours | frapper fort (0.73.0, Force de l'ours : +4) | Puissance | aucun sort : le 1, le 2 et le 3 frappent ; avant la 0.73.0 : Charge, Coup de griffe, Aura de rancune, relais |

Constats :
- **Chaque race garde un couple de familles qui lui est propre**, ce qui préserve l'identité. Les recoupements (Soin chez quatre races, Affliction chez trois, Représailles chez deux) sont voulus : c'est là que les reliques créeront des synergies croisées. Une relique de Représailles intéresse à la fois le nain et le paladin, mais pas de la même façon.
- **La famille Fortune unifie trois mécaniques à part** : les dés de la voleuse (`extraDie`, `coinToss`) et les coups transformés de l'ours (`reshapesHit`). Toutes agissent sur le jet. C'est aussi le point d'entrée naturel des futures reliques de dé.
- **Le druide gagne le plus en lisibilité** (4 drapeaux rouges dans l'étude, L9). Ses deux formes deviennent « Soin et Garde » contre « Fortune et Affliction », deux palettes de couleurs bien distinctes, au lieu de six cas à part.
- **L'ogre reste l'étalon** : aucune famille offensive, seulement un malus de Tempo sur lui-même. C'est le combattant nu, utile comme groupe témoin pour mesurer l'effet des reliques.

---

## 5. Les 30 compétences, une par une

Légende du verdict :
- **identique** : rien ne change, ni la règle ni le rendu, sauf la famille affichée ;
- **mécanique** : la mécanique interne passe par une brique commune (fenêtre, réaction), avec un effet visible identique ; l'empreinte de non-régression doit rester inchangée ;
- **retouche** : la règle change ; c'est une proposition à mesurer, à valider avec toi.

| Personnage | Face | Compétence | Famille | Valeur nette | Verdict |
| --- | --- | --- | --- | --- | --- |
| Orc | 1 | Rage du sang | Soin | +2 à +3 | identique : modeste, mais l'orc a déjà ses deux autres compétences |
| Orc | 2 | Furie des vents | Tempo | — | identique (fenêtre `nextAction`) |
| Orc | 3 | Aura de puissance | Puissance | — | identique |
| Elfe | 1 | Œil de faucon | Précision | — | **mécanique** : `forcesCrit` passe sur la fenêtre `nextStrikeDealt` |
| Elfe | 2 | Esquive améliorée | Esquive | — | **mécanique** : `forcesDodge` passe sur la fenêtre `nextStrikeTaken` |
| Elfe | 3 | Aura de précision | Précision | — | identique |
| Nain | 1 | Peau de pierre | Garde | — | identique (fenêtre `points`) |
| Nain | 2 | Épines | Représailles | +9,5 (Brokk), +3,6 (Grimbald) | identique (réaction `hurt`) |
| Nain | 3 | Aura d'intimidation | Garde | environ +20 (Brokk) | identique |
| Mort-vivant | 1 | Souffle de la tombe | Affliction | — | identique |
| Mort-vivant | 2 | Vol de vie | Soin | environ +5 | **mécanique** : `drainsHit` devient « fenêtre `nextStrikeDealt` et réaction `hit` → soin du montant retiré » |
| Mort-vivant | 3 | Aura glaciale | Affliction | — | identique (pose du Poison depuis la 0.69.0) |
| Prêtresse | 1 | Peur | Tempo (malus) | environ +16 | identique |
| Prêtresse | 2 | Purification | Sceaux | environ +10 | identique |
| Prêtresse | 3 | Aura de sainteté | Soin | +42 à +44 | identique ; voir § 6.4 sur sa domination |
| Voleuse | 1 | Coup de chance | Fortune | +1 à +3 | **retouche** (§ 6.1) |
| Voleuse | 2 | Pile ou face | Fortune | environ −5 | **retouche** (§ 6.2) |
| Voleuse | 3 | Aura de décoction | Affliction | +9 à +13 | identique |
| Paladin | 1 | Rétribution | Représailles | +34 (Aldric), +29 (Gauvain) | identique : c'est sa signature (jauges visibles) |
| Paladin | 2 | Riposte | Représailles | +3,8 | **mécanique** : `reflectsHit` devient « fenêtre `nextStrikeTaken` et réaction `hurt` → renvoi de la moitié » |
| Paladin | 3 | Aura d'immunité | Sceaux | −1,7 à −2,1 | **retouche** (§ 6.4) |
| Ogre | 1, 2, 3 | Attente | Tempo (malus, sur soi) | −1,5 à −3,8 chacune | identique : le prix de son d14, voulu |
| Druide (humain) | 1 | Fleur de vie | Soin | +0,2 à +0,7 | **retouche** (§ 6.3) |
| Druide (humain) | 2 | Écorce épaisse | Garde | +1,2 à +1,8 | identique ; règle commune avec Peau de pierre (§ 6.5) |
| Druide (humain) | 3 | Luciole | Esquive (malus) | +3,2 / +2,8 | **mécanique** : `spentOnHurt` devient la fenêtre `nextStrikeTaken`, une charge par coup |
| Druide (ours) | 1 | Charge | Fortune | +7,6 / +6,4 | identique (`reshapesHit` rangé en Fortune) |
| Druide (ours) | 2 | Coup de griffe | Fortune | +5,2 / +6,2 | identique |
| Druide (ours) | 3 | Aura de pourriture | Affliction | +6,6 / +6,2 | identique |

Bilan : 21 compétences identiques, en comptant les trois Attente ; 5 changements purement mécaniques ; 4 retouches. Les quatre retouches visent les compétences dont la valeur nette est nulle ou négative, ce qui rejoint la grille des drapeaux rouges de l'étude.

---

## 6. Les retouches proposées (à mesurer)

Pour chacune, plusieurs options classées par ma préférence, toutes **dans la famille et la signature du personnage**. Je n'ai rien simulé : avant de livrer quoi que ce soit, chaque option passera par `npm run balance`, avec sa valeur nette avant et après, et sa compensation éventuelle.

### 6.1 Coup de chance (voleuse, 1) : le d3 ne frappe jamais

**Problème** : le d3 en plus tombe toujours sur 1, 2 ou 3, et ces jets ne frappent pas depuis la 0.27.0. Le « coup en plus » n'est en fait qu'une compétence de plus, jamais un coup. Valeur nette de +1 à +3.

- **A. L'avantage** (ma préférence) : à sa prochaine action, elle lance deux fois son dé et garde le meilleur jet. C'est une mécanique éprouvée, immédiatement lisible (deux dés à l'écran, l'un s'efface), et fidèle à « tenter sa chance ». Elle reste en Fortune, avec la fenêtre `nextAction`, et une relique de Fortune pourrait plus tard faire « garder les deux ».
- **B. Le d3 s'ajoute** : le d3 ne lance plus un coup séparé, il s'ajoute au dé du coup (d10 + d3). Plus simple, mais moins spectaculaire, et on passerait plutôt en Puissance.
- **C. Le d3 frappe quand même** : on fait une exception à la règle des faces 1 à 3 pour ce dé-là. C'est la solution la moins coûteuse, mais elle crée un cas particulier, ce qu'on veut éviter.

### 6.2 Pile ou face (voleuse, 2) : un gros chiffre qui fait perdre

**Problème** : la pièce rapporte 7,1 dégâts en moyenne, contre 3,5 pour un coup, et pourtant sa valeur nette est d'environ −5. Comme ce ne sont pas des dégâts de coup, elle ne déclenche pas l'Aura de décoction, et elle prend la place d'un jet de dé.

- **A. Pile est un coup** (ma préférence) : pile, elle porte un coup de 15, qui peut être esquivé et réduit par l'armure, mais qui « touche », et donc empoisonne grâce à la décoction. Face, rien. La signature (« pile, je gagne ») et le drame restent, et la synergie avec sa propre aura apparaît. Le montant (15) serait sans doute à revoir, puisque le coup devient esquivable.
- **B. Face n'est plus vide** : face, elle frappe normalement avec son dé. On garde 15 dégâts directs sur pile. Moins de tension, mais plus de régularité.
- **C. Statu quo, en attendant les reliques** : une relique de Fortune (« vos pièces tombent deux fois ») la rendrait intéressante. Mais une compétence de base à −5 reste un défaut.

### 6.3 Fleur de vie (druide humain, 1) : un soin noyé

**Problème** : +3 PV immédiats, valeur nette de +0,2 à +0,7. Le soin arrive un tour sur deux au mieux, puisque le druide change de forme, et il est vite effacé.

- **A. Une fleur qui s'ouvre** (ma préférence) : au lieu de 3 PV immédiats, Régénération 2 pendant 3 tours (le statut existe, inutilisé). Le soin dure dans le temps : il continue pendant que le druide est en forme d'ours, ce qui relie les deux formes. Et comme la Régénération s'oppose au Poison et à la Pourriture, elle devient un contre lisible contre les morts-vivants. La signature « soutien » est renforcée, avec zéro règle nouvelle.
- **B. Soin plus fort** : +5 PV. Simple, mais toujours plat.

### 6.4 Aura d'immunité (paladin, 3) : un bouclier contre presque rien

**Problème** : peu d'adversaires posent des malus (Peur, Poison, Pourriture, Luciole). Valeur nette de −1,7 à −2,1, parce que le 3 sacrifie le coup pour un effet qui sert rarement.

- **A. Attendre les reliques et les édits, puis remesurer** (ma préférence, à court terme) : la valeur de l'immunité dépend de l'environnement. Dès que des reliques et des édits poseront des malus (Affaibli, Vulnérable, Brûlure, qui existent déjà), elle prendra de la valeur sans qu'on y touche. C'est même un bon test du système : une méta à malus devrait faire monter le paladin.
- **B. L'immunité renvoie** : chaque malus bloqué déclenche une petite Rétribution (une jauge remplie de 2, par exemple). Le paladin reste dans Représailles et Sceaux, et chaque blocage devient visible au lieu d'être un non-événement.
- **C. Le 3 du paladin ne sacrifie pas son coup** : il pose l'aura et frappe. Mais cela casse la grammaire commune du dé (faces 1 à 3 = compétence sans coup), une règle que tu as fixée en 0.27.0. Je le cite pour être complet ; je ne le recommande pas.

Remarque liée : l'**Aura de sainteté** vaut +42 à +44 points, ce qui en fait la compétence la plus forte du roster. Elle est aussi à l'origine des deux duels les plus déséquilibrés (Brokk à 28-29 % contre les prêtresses). Je ne propose pas d'y toucher ici. Mais une relique ou un édit de la famille Soin (ou anti-Soin) devra être mesuré en priorité contre elle.

### 6.5 Armure temporaire et Écorce épaisse : deux noms, une règle

Les deux statuts ont exactement la même définition (`shield`, `stacking: 'add'`). Je propose de les garder comme deux **habillages** d'une même brique de Garde : même règle, même couleur de famille, mais un nom et une icône propres (pierre pour le nain, écorce pour le druide). Une relique « +1 par point de bouclier » touche alors les deux, sans cas particulier. Aucun effet sur l'équilibre.

---

## 7. Ce que chaque famille offre aux reliques

Pour que les reliques créent des synergies plutôt que des chiffres isolés, chacune se branche sur une famille : sur son **compteur**, ou sur un de ses **moments** (gagné, consommé, déclenché). Quelques exemples pour vérifier que le vocabulaire est assez riche. Ce ne sont pas encore des propositions de contenu.

| Famille | Amplificateur (fréquent) | Convertisseur (peu fréquent) | Qui en profite |
| --- | --- | --- | --- |
| Puissance | +1 dégât par charge de Puissance | quand il critique, +1 charge de Puissance pour 2 tours | orcs ; elfes par le convertisseur |
| Garde | +1 point à chaque bouclier posé | quand un bouclier est entièrement consommé, +2 charges d'Épines | nains, druide ; pont vers Représailles |
| Précision | +0,5 au multiplicateur des critiques forcés | quand il esquive, +1 critique forcé | elfes |
| Esquive | +3 % d'esquive par charge d'Esquive en attente | quand il esquive, l'attaquant perd 1 PV | elfes, voleuses |
| Tempo | la Peur dure jusqu'à la prochaine action et un tour de plus | quand il perd une action, +2 PV | prêtresses ; ogre par le convertisseur |
| Fortune | relancer une fois par combat un jet de 1 | quand un jet est modifié, +1 dégât | voleuses, ours |
| Affliction | +1 dégât par tour pour chaque Affliction posée | quand l'adversaire porte 5 charges d'Affliction ou plus, ses soins sont réduits de moitié | morts-vivants, voleuses, ours |
| Soin | +1 à chaque soin | quand un soin dépasse les PV max, le surplus devient un bouclier | prêtresses, orcs, morts-vivants |
| Représailles | +1 à chaque renvoi | quand un renvoi tue, il rend 5 PV | nains, paladins |
| Sceaux | une Garde sacrée en début de combat | quand un malus est bloqué, +1 charge de Puissance | paladins ; prêtresses par la Purification |

Remarques :
- **La plupart s'écrivent avec des déclencheurs qui existent déjà** (`crit`, `dodge`, `hurt`, `hit`, `turnStart`, `combatStart`) et avec les champs `chance`, `limit` et `when`, aujourd'hui inutilisés (`events.ts`).
- Certains exemples demandent des **moments nouveaux** : « bouclier consommé », « jet modifié », « malus bloqué », « soin en surplus ». Ce sont des événements de famille, à ajouter une fois chacun, et non une fois par statut. C'est là que l'aplatissement du moteur (étude § 4.1) devient nécessaire.
- **Les ponts entre familles** (Garde vers Représailles, Esquive vers Précision, Sceaux vers Puissance) sont les meilleurs générateurs de méta : ils donnent à une race la possibilité de jouer en partie comme une autre.

---

## 8. Mise en œuvre, par étapes

| Étape | Contenu | Empreinte de non-régression |
| --- | --- | --- |
| **F0. Valider ce document** | tes réponses aux questions du § 9 | — |
| **F1. Familles en métadonnée** | un champ `family` dans `StatusDef` et `CharacterEvent` ; affichage dans le compendium et les infobulles ; un contrôle dans `validateRoster` (chaque statut et chaque compétence a une famille) | inchangée |
| **F2. Langage visuel** | couleurs et cadres par famille, repère de fenêtre, ambre réservé au critique ; à maquetter d'abord ; les sons par famille, une fois le remplacement des sons terminé | inchangée |
| **F3. Fenêtres d'usure** | les 5 changements « mécanique » du § 5 (`forcesCrit`, `forcesDodge`, `drainsHit`, `reflectsHit`, `spentOnHurt`), plus Peau de pierre et Écorce sur une même brique | **doit rester identique** : c'est la preuve |
| **F4. Retouches** | les 4 compétences du § 6, une par une, chacune mesurée, avec sa compensation | modifiée, volontairement, notée dans le CHANGELOG |
| **F5. Reliques** | sur les familles (§ 7), après la séparation des suites de hasard | modifiée seulement quand une relique est présente |

Les étapes F1 et F2 peuvent commencer tout de suite, en parallèle du remplacement des sons, sans toucher à `sound.ts`. F3 et F4 sont indépendantes l'une de l'autre, mais F3 d'abord simplifie F4. Chaque étape livrée suit la procédure de `CLAUDE.md` : version, CHANGELOG, FEATURES, ETAT, et pour F4, PERSONNAGES et STATUTS.

---

## 9. Questions pour toi

1. **Le rangement par effet** (dix familles, avec la fenêtre comme second attribut) te convient-il mieux que le rangement par fenêtre de l'étude ? Faut-il fusionner ou séparer des familles ?
2. **Fortune** : es-tu d'accord pour y ranger à la fois les dés de la voleuse et les coups transformés de l'ours ? C'est la seule famille qui rapproche deux races très différentes.
3. **Les retouches** : pour Coup de chance, Pile ou face, Fleur de vie et l'Aura d'immunité, quelle option veux-tu que je mesure en premier ? Mes préférences : 6.1 A, 6.2 A, 6.3 A, 6.4 A.
4. **Luciole** : la ranger en Esquive, avec le +2 dégâts reçus comme effet secondaire ? Ou la simplifier en un seul effet, et compenser le reste ailleurs ?
5. **Armure temporaire et Écorce** : d'accord pour une même règle sous deux habillages ?
6. **Polarité** : es-tu d'accord pour la montrer par la forme du cadre plutôt que par le vert et le rouge, afin de libérer ces deux couleurs pour l'Affliction et les dégâts ?
7. **Les « sorts »** : par là, entendais-tu les compétences du dé, comme ici ? Ou une nouvelle catégorie (des effets lancés, des reliques actives, des dégâts magiques, le type « Sort » de l'étude § 4.3) ? La réponse change la suite.
