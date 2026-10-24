# Les règles de la mise en scène

Ce document fait foi pour la **synchronisation du combat à l'écran** : ce qui tombe en même temps que quoi, ce qui attend quoi, et à quel repère chaque chose s'accroche. Il est **le reflet des règles codées** (`src/game/staging.ts`, qui date chaque cue d'un moment ; `useCombat.ts` ne fait que les appliquer) et **le point de départ de toute mécanique qui s'anime** : une compétence, un statut, une relique ou une règle nouvelle se pense d'abord ici (§ 6). S'ils divergent, c'est le code qu'on corrige.

Ce qu'il ne couvre pas : les **durées** elles-mêmes (`src/game/timing.ts`, réglées au magnétoscope, [MOTEUR_V2.md](MOTEUR_V2.md) § 8), le **choix des sons** ([SONS.md](SONS.md)), l'**ordre de résolution** ([RESOLUTION.md](RESOLUTION.md)) et l'inventaire des animations ([SYSTEMES.md](SYSTEMES.md) § 4).

> **Statut : en vigueur (0.97.0).** Amorcé en 0.96.3 par extraction des règles du code, relu par l'utilisateur le 2026-10-23 : ses retours et ses décisions sont appliqués dans le code (journal au § 8).

## 1. Pourquoi ce document

Chaque nouvel événement (compétence, statut, relique, scène) ajoute des cas où deux choses doivent se voir ensemble ou l'une après l'autre. Corrigés un par un, ces cas finissent en exceptions que personne ne retrouve. La méthode retenue (2026-10-23, avec l'utilisateur) :

1. une **règle générale** par constat, écrite ici, plutôt qu'une retouche du seul cas observé (« un statut posé par un coup tombe à son impact », pas « le poison de Gorak tombe à l'impact ») ;
2. un **contrôle automatique** par règle, sur tout le corpus de combats de `staging.test.ts` : un nouvel événement qui casse une règle est signalé sans que personne ait à regarder un combat.

## 2. Vocabulaire

| Mot | Sens |
| --- | --- |
| **Moment** | Une étape racine du moteur et toutes celles qui en découlent (par `cause`), dans le même tour. Un coup, le poison qu'il pose, la plaie qui coule et la Riposte forment un seul moment. |
| **Instant** | Une date dans le moment. La mise en scène avance un seul curseur : tout ce qu'elle émet entre deux attentes tombe au **même instant**. « Ensemble », dans ce document, veut dire « au même instant ». |
| **Attente** | Ce qui fait avancer le curseur : une constante nommée de `timing.ts` (`WIND`, `READ_HOLD`…), ou une durée calculée nommée (« rythme de la scène », « fin de la scène »). Le magnétoscope les montre sur sa frise. |
| **Battement** | Une attente courte qui sépare deux choses liées, pour que l'œil les lise dans l'ordre : `DICE_READ` (350 ms, entre le dé posé et l'action), `BLEED_DELAY` (140 ms), `RIDE_CUE` (120 ms). |
| **Lecture du coup** | Le temps entre l'impact d'un coup et son repos (`STRIKE_HOLD`, 550 ms ; en rafale `VOLLEY_STRIKE_HOLD`, 260 ms). Ses réactions partent en son milieu (M17). |
| **Repère** | Un instant auquel d'autres choses s'accrochent. Il y en a six : le **dé posé**, l'**impact** (d'un coup ou d'un coup de compétence), le **milieu de la lecture du coup**, l'**apparition** d'un effet, l'**arrivée du signal**, l'**impact de scène**. |

Ce qu'un coup entraîne se range en trois familles, chacune à son repère (`consequencesOf`, `staging.ts`) :

| Famille | Exemples | Repère |
| --- | --- | --- |
| **Ce que le coup produit sans nouveau coup** (`rides`) | poison de l'Aura de décoction, Saignement de Pourfendre, Vol de vie | l'impact (M14) |
| **La plaie qui coule** (`flow`) et **les jauges qui rangent le coup** (`quiet`) | Saignement du défenseur ; jauges de Rétribution | l'impact (M15, M16 bis) |
| **Les réactions** (`reactions`) | Riposte, Épines acérées, relique déclenchée par le coup, compétence déclenchée par le coup (déclencheur autre qu'une face du dé) | le milieu de la lecture du coup (M17) |

## 3. Les règles

Colonne « Contrôle » : le test qui vérifie la règle sur tout le corpus (`staging.test.ts`, sauf mention), ou **aucun** (à écrire, § 7).

### 3.1 Structure

| N° | Règle | Code | Contrôle |
| --- | --- | --- | --- |
| M1 | Un moment regroupe une étape racine et ce qui en découle **par cause**, jamais par voisinage, et s'arrête au changement de tour. | `stage`, boucle des groupes | « un moment, une étape racine et ce qui en découle » |
| M2 | Une étape déjà jouée avec le coup qui l'a provoquée (statut posé, PV rendus, plaie, jauge, réaction) ne rejoue rien à sa place : seuls ses statuts sont mis à jour. | `absorbed` | indirect (M14, M15, M17) |
| M3 | **Rien ne revient en arrière, rien n'arrive en avance** : la zone d'état montre l'état de l'étape la plus récente déjà montrée, mais les changements d'une étape antérieure pas encore jouée y sont retenus jusqu'à son instant. Exemple : la jauge de Rétribution, comptée à l'impact, vient après la Riposte dans la chronologie ; la charge de Riposte reste pourtant à l'écran jusqu'au coup de la Riposte. | `display`, `showStatuses` | « une étape montre ses changements de statuts à son instant… » |
| M4 | Les PV à l'écran retombent toujours sur l'état du moteur à la fin de ce qui a été appliqué (erreur en développement sinon). | `settle` | « les PV de chaque moment retombent… » |
| M5 | Le rythme ne vient que des constantes de `timing.ts` ; une durée calculée porte un nom (seuls cas : « rythme de la scène », « fin de la scène »). | `hold`, `wait` | « les attentes de chaque moment se suivent sans trou… » |
| M6 | Jamais deux fois le même son au même instant (SONS.md § 4.4). | `sound` | « jamais deux fois le même son au même instant » |

### 3.2 Le dé

| N° | Règle | Code | Contrôle |
| --- | --- | --- | --- |
| M7 | Le son « Dé posé » et la valeur du dé tombent ensemble. Plusieurs dés lancés ensemble (initiative, rafale, les deux dés de la barde) : un seul roulement, un seul « Dé posé ». Un jet greffé (étape `roll`, 0.106.0) roule son dé une seule fois, à cette étape : le coup de base qui suit part de ce dé, sans nouveau roulement ; dans une rafale (deux dés, Coup de chance), son dé est déjà sur le plateau et ne roule pas de nouveau : il ressort (mis en avant). | `stageAttack`, `roll`, `rollVolley` | « rafales : les dés roulent ensemble » ; « deux dés de la barde : ils roulent ensemble, une fois » ; « combat test : un point d'attente avant chaque étape qui lance des dés » (le jet greffé compte un dé) |
| M8 | Les labels du jet tombent **avec le dé posé** (esquive assurée ; bonus d'une relique de coup, avec son sceau qui s'illumine). Ceux du critique tombent **avec l'annonce du critique**, ceux de l'impact **à l'impact**. | `rollSpecials`, `stageAttack` | aucun |
| M9 | Un nouveau dé efface les labels du précédent ; en rafale, chaque coup efface ceux du coup d'avant. | `setDice`, `stageVolleyStrike` | aucun |
| M10 | **Dé posé et labels, puis un battement, puis l'action.** L'action part `DICE_READ` après le dé posé, quelle qu'elle soit : l'élan d'un coup ; une compétence **greffée** (étape `roll`, 0.106.0 : le dé tombe, le dé de la compétence s'allume dans l'en-tête avec lui, la compétence suit un battement après, puis le coup de base part de ce dé, sans second battement) ; une compétence qui **remplace le coup** (jet sans coup de base). En rafale, la compétence suit d'un battement plus court (`VOLLEY_FORFEIT_SNAP`). | `roll`, `stageAttack` (`rolled`, jet remplacé), `snapped` | « une compétence sur le dé tombe un battement après son jet… » (jet remplacé) ; « le dé qui pulse est celui du jet… » (la face d'un jet greffé) |
| M11 | Une compétence qui **modifie son coup** (relation `modify` : Pourfendre ; Pile ou face, M26 ; Crescendo et Soliste, ce coup ×N) ne part que s'il touche : son dé de l'en-tête s'allume **à l'impact**, pas au dé posé, en rafale comme hors rafale (phase 5 ter). Crescendo et Soliste n'ont rien d'autre à montrer : ils tombent avec l'impact (M14), muets. | `onHit`, `pulse`, `stageVolleyStrike` | « le dé qui pulse est celui du jet… » (la face, pas l'instant) |
| ~~M12~~ | ~~Double de la barde : les deux dés, le « ding » et le dé de la face tombent ensemble ; la compétence du double suit un battement après (`DICE_READ`), comme M10.~~ Retirée en phase 5 ter avec les doubles : les deux dés de la barde sont une rafale (M27), chaque jet suit M10 ou M11, et plus aucun « ding » ne salue deux faces égales. | — | — |

### 3.3 Le coup et ce qu'il entraîne

| N° | Règle | Code | Contrôle |
| --- | --- | --- | --- |
| M13 | **À l'impact, tout tombe ensemble** : le son du coup (Coup, Coup critique ou Esquive), les PV, le gros chiffre, l'usure des statuts du coup, les labels d'impact et la ligne du journal. L'élan est muet. | `stageAttack`, `stageVolleyStrike` | aucun |
| M14 | **Ce que le coup produit sans nouveau coup tombe à son impact**, sur sa cible ou pour le frappeur : les statuts posés sur la cible (poison de l'Aura de décoction, Saignement de Pourfendre, poison d'un coup de pile), même quand une Riposte suit, et les PV rendus au frappeur (Vol de vie), avec son label. Son son suit le Coup d'un battement (`RIDE_CUE`). | `ridesOf`, `landRide` | « le poison de l'Aura de décoction tombe à l'impact… », « le Saignement de Pourfendre… », « le Vol de vie rend ses PV à l'impact… » |
| M15 | **La plaie qui coule** (Saignement du défenseur touché) tombe sur l'impact du coup : son label à l'impact, ses PV perdus un battement après (`BLEED_DELAY`), avec Ronge. Une plaie **ouverte** par un coup ne coule pas sur ce coup (règle 9 du moteur) : elle apparaît à l'impact avec son texte (M14) et coule dès le coup suivant qui touche son porteur. | `flowOf`, `bleedOut` ; moteur | « la plaie qui coule tombe sur l'impact… » ; `combat.test.ts` : « Saignement (2026-10-21, règle 9)… », « Pourfendre (Gorak, 0.70.0)… » |
| M16 | Critique : il s'annonce sous le dé **avant l'élan** (`CRIT_ANNOUNCE`), puis un arrêt sur image juste **avant l'impact** (`CRIT_FREEZE`), pas après. | `stageAttack` | aucun |
| M16 bis | Les jauges qui rangent le coup (Rétribution) n'ont rien à jouer : elles comptent le coup **à l'impact**. | `consequencesOf` (`quiet`), `land` | indirect (M3) |
| M17 | **Les réactions au coup partent au milieu de sa lecture** (`REACTION_LEAD`, la moitié de `STRIKE_HOLD` : 275 ms après l'impact ; en rafale `VOLLEY_REACTION_LEAD`, 130 ms ; après le battement de la plaie si elle coule ; sur pile, à la place de la lecture du coup lourd). Ce sont la Riposte, les Épines acérées, une relique ou une compétence déclenchée par le coup. Chacune joue tout ce qu'elle a (label, aura, signal, textes, coup en retour) sans attente de plus (`LEAD`), l'une après l'autre. Le coup s'efface au terme de sa lecture même si ses réactions durent plus longtemps (posture d'attaque et étoile d'impact gardent leur durée) ; une Riposte l'efface plus tôt, à son élan, pendant que l'attaquant revient en place. | `consequencesOf`, `react`, `afterImpact`, `blows` | « les réactions au coup partent au milieu de sa lecture… » |

### 3.4 Les effets (compétence, statut, relique)

| N° | Règle | Code | Contrôle |
| --- | --- | --- | --- |
| M18 | Un effet **apparaît** après une courte attente (`LEAD`), sauf s'il suit son dé (M10), s'il est une réaction au coup (M17), s'il a une scène (M24) ou si c'est une plaie (`WOUND_HOLD`, sans attente). | `showEffects` | aucun |
| M19 | Un effet qui pose un **état visible** envoie d'abord son **signal**, du sceau de la compétence (ou de l'anneau de l'aura) vers la zone d'état de sa cible ; l'effet n'apparaît **qu'à l'arrivée du signal** (`SIGNAL`). | `showEffects`, `signalTargets` | aucun |
| M20 | **À l'apparition, tout tombe ensemble** : le son déduit de l'effet, l'aura sur la source, les textes flottants, le label sous le dé, et l'état (PV, zone d'état, journal). | `showEffects` | aucun |
| M21 | Exception à M20 : les **dégâts directs** d'une compétence sur l'adversaire sont joués comme des coups (élan, impact, gros chiffre), un par montant ou par jauge, après `BLOWS_LEAD`. Les PV tombent coup par coup. Comme pour un coup (M14), **ce que l'effet pose sur la cible des coups tombe avec leur dernier impact** : ses textes et la zone d'état ensemble, avec le journal. Le reste (titre, aura, effets sur la source) tombe à l'apparition. Le dernier coup d'une série est lourd. | `showEffects`, `blows` | « ce qu'une compétence à dégâts directs pose sur sa cible tombe avec son dernier coup… » (combat construit : aucune compétence du roster ne le fait aujourd'hui) |
| M22 | Un statut qui agit s'accompagne de **son décompte ou de son expiration** : le « −2 » et le compteur qui passe de 3 à 2 (ou s'éteint) tombent ensemble. Un décompte qui n'a pas été montré ainsi a sa propre attente (`COUNT_HOLD`). | `previewCounts`, `statusAge` | « le décompte et l'expiration d'un statut tombent avec son effet » |
| M23 | Une **relique** s'annonce sur son sceau, qui s'illumine **avec son label**, au même instant ; elle n'a ni aura ni titre. | `relic`, `onShow` | « relique : son sceau s'illumine avec son label » |
| M24 | **Scène** (Foudre, reliques élémentaires) : la scène part d'abord, sans `LEAD`. Vers l'adversaire, chaque coup tombe **sur un impact de la scène** (sans élan), et le chiffre du coup précédent reste jusqu'à l'élan du suivant. Sur le porteur, le sceau se brise dès le début, les effets tombent **au premier impact**, puis on attend la fin de la scène. | `SCENE_EVENTS`, `schedule` | « Foudre : chaque coup tombe sur un impact », « reliques élémentaires… » |
| M25 | Une aura cumulable **déjà à son maximum** n'active rien (ni aura, ni signal) : seul le texte neutre « … au maximum » s'affiche. | `capped` | aucun |

### 3.5 Cas particuliers

| N° | Règle | Code | Contrôle |
| --- | --- | --- | --- |
| M26 | **Pile ou face** : le statut qui la permet est consommé quand la pièce part, juste après le coup qu'elle modifie, s'il a touché. Le résultat tombe d'un bloc (la pièce, « Pièce retombe », le « ding » sur pile, « Pile ! » ou « Face… ») ; puis, sur pile, un seul coup lourd (ce coup, à nouveau : lourd quelle que soit sa force, chiffre doré et son du critique, 0.106.0), qui se comporte comme un coup : ce qu'il produit tombe à son impact (M14), ses réactions au milieu de sa lecture (M17). | `coin`, `blows` (`heavy`) | « pile ou face : pile tombe d'un bloc… » (le bloc et le coup lourd) |
| M27 | **Rafale** : tous les dés roulent ensemble ; puis un coup rapide par dé, sans nouveau jet, le dé du coup en cours mis en avant. Les coups d'une rafale sont aussi ceux de ses jets greffés (deux dés, Coup de chance, sous leur étape `roll`) : leur dé ressort, leur compétence suit son dé (M10), sans nouveau roulement. Les deux dés de la barde (rafale sans statut, phase 5 ter) n'ont pas de nom à annoncer ; avec Coup de chance, ses dés de plus suivent les deux siens, dans la couleur du statut. Un K.O. au premier jet arrête la rafale : seuls les dés tirés s'affichent. Une Furie instantanée (posée par le dé qui vient de tomber) fait apparaître ses dés à plat, sans répéter le nom, et la compétence qui la pose raccourcit sa lecture (`FLURRY_CHAIN_HOLD`). | `flurry`, `rollVolley`, `roll` | « rafales : les dés roulent ensemble… » ; « deux dés de la barde… » |
| ~~M28~~ | ~~**Coup transformé** (Charge, Coup de griffe) : la compétence est jouée avec le coup ; à sa place, elle n'est que notée (état et journal).~~ Retirée en 0.106.0 avec `reshapesHit` : plus aucun coup transformé (une compétence greffe, modifie ou remplace son coup). | — | — |
| M29 | **Tour perdu** : « Tour perdu » tombe sur celui qui perd son action (la conséquence, pas la cause), sans titre ni aura. | `skip` | « la Peur : « Tour perdu » tombe sur celui qui perd son action » |
| M30 | **Changement de forme** : le nom de la forme et le fondu des silhouettes tombent ensemble, à l'apparition. | `shift` | « le druide change de forme » (la forme, pas l'instant) |

### 3.6 Textes flottants

| N° | Règle | Code | Contrôle |
| --- | --- | --- | --- |
| M31 | Aucun texte n'en écrase un autre : chacun vit `FLOAT_LIFE` (un titre, `TITLE_LIFE`), à l'horloge du combat. | `Float`, lecteur | aucun |
| M32 | Le nom d'une compétence ne flotte pas au-dessus de son lanceur : son sceau dans la barre de compétences s'allume déjà. Un statut qui agit sur l'adversaire s'annonce au-dessus de son porteur, sauf une aura (son anneau envoie le signal). Une réaction ne montre son nom que si aucun label ne le dit déjà sous le dé. | `event`, `statusTick`, `statusReaction` | aucun |
| M33 | Les textes qui tombent avec l'impact d'un coup sur le même combattant se rangent autour du chiffre des dégâts : ce qui monte part au-dessus, ce qui tombe en dessous. | `fxFloats` (`struck`) | aucun |
| M37 | **Les dégâts d'un statut qui agit ont la couleur de leur famille** (la source de ses dégâts, `DAMAGE_SOURCES` de `damage.ts` depuis la 0.102.0 ; avant, `harm` dans `statuses.ts`) : **physique** en rouge, par défaut (coups, Saignement, Riposte) ; **poison** en vert acide (Poison) ; **arcane** en mauve (Brûlure des Feux follets, compétence `arcane` ; Pourriture, de la couleur de son aura). Le vert reste loin de l'émeraude du soin, le mauve loin du fuchsia d'un malus posé ou du « Tour perdu ». | `DAMAGE_SOURCES`, `fxFloats`, `TONE_CLASS` | « les dégâts d'un statut qui agit ont la couleur de leur famille… » |

### 3.7 Tour, ouverture et fin

| N° | Règle | Code | Contrôle |
| --- | --- | --- | --- |
| M34 | **Passage de main** : au premier moment d'un nouveau tour, le plateau de dés se vide et annonce le suivant, son camp s'allume, puis une pause (`HANDOVER`). | boucle des groupes | aucun |
| M35 | **Ouverture** : silence, initiative (les deux dés ensemble, relancés sur égalité), « … frappe en premier ». En combat test, l'initiative n'est que notée. | ouverture de `stage` | « combat test : … sans initiative animée » |
| M36 | **Fin** : K.O., puis la victoire après `KO_HOLD`, puis l'écran de fin après `VICTORY_HOLD`. | fin de `stage` | aucun |

## 4. Couplages avec le CSS et durées déduites

Certaines animations CSS doivent tomber d'accord avec une attente de `timing.ts`. Elles lisent leur durée dans les variables `--t-*` (`TIMING_VARS`, posées sur `.arena`), jamais une valeur recopiée. Les attentes qui dépendent d'une autre en sont **déduites** dans `timing.ts` : on ne règle que la première.

| Attente | Animation ou source | Accord |
| --- | --- | --- |
| `WIND` | `.lunge` (`LUNGE`, 750 ms) | **déduite** : 40 % de `LUNGE` (300 ms) ; l'animation touche à 42 % |
| `VOLLEY_WIND` | `.lunge-fast` (`LUNGE_FAST`, 420 ms) | **déduite** : 40 % de `LUNGE_FAST` (168 ms) |
| `REACTION_LEAD` | `STRIKE_HOLD` (550 ms) | **déduite** : la moitié (275 ms) |
| `VOLLEY_REACTION_LEAD` | `VOLLEY_STRIKE_HOLD` (260 ms) | **déduite** : la moitié (130 ms) |
| `SIGNAL` | `.signal-orb` | le vol dure exactement l'attente |
| `COIN_SPIN` | `.coin-flipping` | un tour d'animation |
| `READ_HOLD` | `.event-aura` | l'aura dure le temps de lecture |
| `FLOAT_LIFE`, `TITLE_LIFE` | `.damage-float`, `.dodge-text` | le texte est retiré à la fin de sa vie |

Les scènes (`scenes.ts`) portent leur propre rythme (`impacts`, `length`), que leur rendu (`SceneEvent.tsx`) doit suivre.

## 5. Questions

### 5.1 Tranchées (2026-10-23)

- **Q1. Le Vol de vie à l'impact** (acceptée par l'utilisateur). Avant : son soin attendait le repos du coup puis sa propre apparition, 1,25 s après l'impact (mesuré : 1 250 ms pour les 69 soins d'un corpus de 300 combats). Maintenant : M14 couvre « ce que le coup produit sans nouveau coup », sur sa cible ou pour le frappeur.
- **Q2. Statut posé par une compétence à dégâts directs** (l'utilisateur : textes et zone d'état synchronisés). Choix de l'agent : les deux tombent avec le dernier coup de la série, comme un statut posé par un coup (M21). L'autre choix, les deux à l'apparition, aurait montré avant les coups les changements de statuts que les coups eux-mêmes produisent. Aucune compétence du roster n'est concernée aujourd'hui (0 cas dans le corpus) : la règle est vérifiée sur un combat construit.
- **Q3. La charge de Riposte** (décision laissée à l'agent). La prémisse de la 0.96.3 était fausse : depuis le 2026-10-21, la fenêtre `hit` du frappeur passe avant la fenêtre `hurt` du défenseur, et le poison posé par le coup précède toujours la Riposte (8 cas sur 8 dans le corpus). Le vrai cas est apparu avec M16 bis : la jauge de Rétribution, comptée à l'impact, vient après la Riposte dans la chronologie, et la montrer faisait partir la charge de Riposte trop tôt. Décision : M3, chaque étape montre ses changements à son instant, retenus jusque-là.
- **Q4. L'accord élan / impact** (décision laissée à l'agent) : `WIND` et `VOLLEY_WIND` sont déduits de `LUNGE` et `LUNGE_FAST` (§ 4). `VOLLEY_WIND` passe de 170 à 168 ms.

### 5.2 Ouvertes

- **Q5. Classer tous les dégâts en familles ?** M37 ne colore que les dégâts d'un statut qui agit (un texte « −N »). Les dégâts directs d'une compétence (la Foudre, compétence `arcane`) et les coups s'affichent en gros chiffre (`hit`), toujours en rouge ou en or pour un critique. **En partie tranchée (2026-10-23, [PROGRESSION.md](PROGRESSION.md) § 9)** : les dégâts ont un type (DP, DM, DT) et une source, déclarés sur chaque effet depuis la 0.102.0 (`damage.ts`), pas déduits de la `nature` ; leur couleur à l'écran, par type et par source, viendra avec la phase 7 des règles v2.

## 6. Introduire une mécanique qui s'anime

Toute compétence, tout statut, toute relique ou toute règle nouvelle qui produit quelque chose à l'écran répond d'abord à ces questions, ici :

1. **À quel repère s'accroche-t-elle ?** Dé posé, impact, milieu de la lecture du coup, apparition, arrivée du signal, impact de scène (§ 2). Si aucun ne convient, c'est un nouveau repère : il s'écrit au § 2 avant de se coder.
2. **Si elle découle d'un coup, dans quelle famille tombe-t-elle ?** Ce que le coup produit sans nouveau coup (impact), la plaie ou la jauge (impact), ou une réaction (milieu de la lecture). `consequencesOf` la range d'après la chronologie : une nouvelle sorte d'étape doit y trouver sa place.
3. **Pose-t-elle un état visible ?** Alors son signal part avant elle (M19).
4. **Fait-elle des dégâts ?** Leur famille (M37) et leur forme : un texte « −N », ou un vrai coup avec élan (M21).
5. **Son son** : il se déduit de l'effet ([SONS.md](SONS.md)) ; un son nouveau commence par ce document-là.
6. **Son contrôle** : la règle qu'elle suit a-t-elle un test qui la rencontrera dans le corpus ? Sinon, un combat construit (`testCharacter`), comme pour M21.

Ajouter ou changer une règle :

1. **Le constat** : l'utilisateur décrit ce qu'il voit ; le magnétoscope (touche **V**) situe le moment et l'attente, et une graine (`battler.play(graine)`) le rejoue.
2. **La règle**, écrite ici, en général : à quel repère la chose s'accroche, et pour quelle famille de cas (pas pour une compétence nommée). Une règle nouvelle prend le numéro suivant ; une règle retirée est barrée, pas renumérotée.
3. **Le code** : `staging.ts` (et `timing.ts` pour une attente), sans recalculer aucune règle du moteur.
4. **Le contrôle** : un test de `staging.test.ts` qui parcourt le corpus, compte les cas rencontrés (pour prouver que la règle a été exercée) et vérifie l'instant.
5. **CHANGELOG.md**, la colonne « Contrôle » ici, et une ligne au journal (§ 8).

## 7. Contrôles à écrire

Règles sans contrôle automatique, par ordre d'utilité (celles qui casseraient le plus facilement avec un nouvel événement) :

1. M20 et M13 : tout ce qui doit tomber ensemble à l'apparition et à l'impact ;
2. M19 : aucun effet n'apparaît sur une cible avant l'arrivée de son signal ;
3. M8 et M9 : les labels sous le dé, à leur repère, effacés par le dé suivant ;
4. M26 : les réactions à un coup de pile, au milieu de sa lecture (la règle est la même que M17, le chemin de code est à part) ;
5. M16 : l'annonce du critique avant l'élan, l'arrêt sur image avant l'impact ;
6. M34 et M36 : passage de main, fin du combat ;
7. M11, M30 : contrôler aussi l'instant, pas seulement la face ou la forme ;
8. M18, M25, M31 à M33.

## 8. Journal

| Date (version) | Changement |
| --- | --- |
| 2026-10-23 (0.96.3) | Document amorcé : 36 règles extraites des commentaires de `staging.ts`, quatre questions ouvertes. |
| 2026-10-23 (0.97.0) | Retours de l'utilisateur appliqués dans le code. **M10** : un battement (`DICE_READ`) entre le dé posé et la compétence qui sacrifie le coup, comme avant l'élan d'un coup ; **M12** : de même pour la compétence d'un double. **M15** précisée : une plaie ouverte par un coup ne coule qu'au coup suivant. **M17** : les réactions au coup partent au milieu de sa lecture, plus après son repos (la Riposte touche environ 1 s plus tôt) ; le coup s'efface à son heure, ou à l'élan de la Riposte. **M37**, nouvelle : couleur des dégâts d'un statut par famille. Questions tranchées : Q1 (Vol de vie à l'impact, M14), Q2 (M21), Q3 (M3, avec M16 bis : jauges comptées à l'impact), Q4 (§ 4 : élans et départ des réactions déduits). Q5 ouverte. |
| 2026-10-23 (0.106.0) | **L'attaque de base** (RESOLUTION § 3 bis) : une nouvelle étape `roll` pour un jet dont la face greffe sa compétence. **M7** : son dé roule une seule fois, à cette étape. **M10** : dé posé, dé de la compétence qui s'allume, battement, compétence greffée, puis le coup de base sans nouveau jet ; plus de coup sacrifié, seulement des jets remplacés. **M11** : la compétence qui modifie son coup (relation `modify`) remplace `needsTouch`. **M26** : le coup de pile répète le coup qu'il modifie ; il reste lourd même petit. **M27** : la rafale compte aussi les coups des jets greffés de Coup de chance. **M28** barrée (`reshapesHit` retiré). Une compétence greffée à scène (la Foudre) joue sa scène, puis le coup de base suit dans le même moment. |
| 2026-10-24 (phase 5 ter) | **La barde sur ses faces** (RESOLUTION § 2) : plus de doubles, ni étape `pair`. Ses deux dés sont une rafale sans statut (**M27**) : un roulement, puis chaque jet ressort son dé, sa compétence greffée suit son dé (M10), une compétence qui modifie s'allume à l'impact (**M11**, désormais aussi en rafale). **M12** barrée, avec le « ding » de tout double (SONS.md). **M7** : les deux dés de la barde sont des dés lancés ensemble. Crescendo et Soliste (ce coup ×N) tombent avec l'impact, muets (M14). |
