# Bonus et malus (statuts)

Ce document décrit le système des **statuts**, c'est-à-dire les bonus et les malus durables posés pendant un combat. Il donne leur vocabulaire, leur catalogue, les règles de design à suivre et l'état du chantier en cours.

- **En jeu**, le compendium (verticale « Bonus et malus ») liste les statuts **réellement posés par un personnage**, à partir du code (`statusCatalog()`) : c'est la liste de tout ce qu'on peut rencontrer en combat, et elle est toujours à jour. Un statut « à venir » n'y apparaît qu'une fois attribué.
- **Ce document** en garde la philosophie et les décisions. On le met à jour à chaque statut ajouté ou modifié.
- **La technique** (crochets du moteur, marche à suivre) est dans [ARCHITECTURE.md](ARCHITECTURE.md#ajouter-un-statut-aura-positive-ou-négative).

## Statut et compétence : deux notions séparées

Décision prise en 0.20.1.

- Un **statut** est une **règle neutre** du jeu, partagée par tous : un Poison est un Poison, quel que soit celui qui le pose. Le compendium les présente ainsi, sans dire qui les pose.
- Une **compétence** appartient à un **personnage** (dans le code : `CharacterEvent`, dans `roster.ts`). Elle décide **quand** et **à quelles conditions** elle pose un ou plusieurs statuts (ou soigne, inflige, purge).
- Chaque **race** a une petite **palette de compétences**, qui s'appuient sur 2 ou 3 statuts liés à son thème. Ses variantes y puisent chacune à leur manière.
- **Plafonds** par personnage, pour la lisibilité et l'équilibre : 1 passif de race, 2 compétences au plus ; 3 statuts au plus par palette de race.
- Le compendium suit cette séparation (0.21.0) : la verticale **Compétences** présente chaque compétence, son auteur et ses effets ; la verticale **Bonus et malus** présente les statuts seuls. Une compétence sans statut (Foudre, Rétribution) n'apparaît donc que dans Compétences.
- Le **moment** où un statut est résolu est fixé par le statut lui-même, jamais par la compétence : voir [RESOLUTION.md](RESOLUTION.md#qui-fixe-le-moment-dune-résolution).

### Deux niveaux de lecture en combat (0.79.0)

Demande de l'utilisateur (2026-10-21) : la séparation ci-dessus existait dans les règles, pas à l'écran. Sur 26 statuts posés par une compétence, 25 venaient d'une seule compétence ; 27 compétences sur 28 montraient l'icône de leur statut (Œil de faucon et Critique assuré, la même cible). La zone d'état mêlait des états, des auras (de l'identité) et des mécanismes de compétence (jauges de Rétribution, Attente). L'écran sépare désormais deux concepts :

| Niveau | Où | Ce qu'il dit | Contenu |
| --- | --- | --- | --- |
| **Ce qu'il sait faire** (identité) | Barre de compétences, sous l'en-tête, au bord de l'arène au-dessus de son camp (`SkillBar`, 0.79.1 ; dans l'en-tête en 0.79.0) | ses compétences, ses auras, sa forme | un **sceau** octogonal par compétence, la face du dé en pastille, éteint au repos, allumé quand sa face sort ; puis ses **auras**, en médaillon rond dont l'anneau **tourne quand elle est active** (charges en pastille), éteint sinon ; puis ses règles de forme (druide) |
| **Ce qu'il subit ou porte** (conséquences) | Zone d'état, au-dessus de lui (`StatusTray`) | des **états génériques**, au vocabulaire partagé | un médaillon par état, regroupant les statuts de même effet, avec un seul nombre |

**Les états** (`src/game/states.ts`, `STATES`) sont le vocabulaire commun : un nom générique, une polarité, un sens. Chaque statut a une **place** (`STATUS_PLACE`) :
- `tray` : il alimente un état de la zone (Critique assuré, Poison, Drain…) ;
- `aura` : il s'affiche dans la barre de compétences, son anneau portant la valeur de son effet (« +4 »). **Une aura sur son porteur ne se relaie pas dans la zone d'état** (0.79.7) : c'est une modification permanente, de l'identité, qui doublait son propre anneau. Seule une aura qui agit **sur l'adversaire** y relaie son effet, comme un malus ordinaire (Aura d'intimidation : Affaibli chez lui). Une aura qui pose de vrais statuts (Aura glaciale, Aura de décoction) n'a rien à relayer : son Poison s'affiche de lui-même ;
- `form` : règle de forme, dans la barre de compétences, avec sa valeur (Force de l'ours « +3 » ; Incantation « Sort » : depuis la 0.106.0, chaque sort se greffe sur le coup de base magique de l'homme) ;
- `skill` : mécanisme interne d'une compétence, sur son sceau (les jauges de Rétribution) ou par le seul éclat du sceau et le label du coup (Pile ou face, Furie des vents ; l'Attente de l'ogre, retirée en 0.106.0).

**Regroupement.** Les statuts de même effet font un seul médaillon, au total signé : Affaibli et l'Aura d'intimidation adverse font un **Affaibli** (la Fausse note, qui agit après l'armure, a son état à part : **Coup gâché**) ; Régénération et Sifflotement font un **Soin** (PV par tour) ; Peur et Étourdi font un **Tour perdu**. L'infobulle détaille chaque part, son effet et d'où elle vient (« Vient de : Œil de faucon (Elaria) », lu dans les données par `originsOf`). Le regroupement est **une présentation** : le moteur garde ses statuts distincts et leurs règles (avant ou après l'armure, durée, consommation). Unifier les règles elles-mêmes reste le chantier des familles ([FAMILLES.md](FAMILLES.md), TODO § 12-13).

| État | Polarité | Nombre | Statuts qui l'alimentent |
| --- | --- | --- | --- |
| Puissance | bonus | total (+N aux coups) | Ferveur (2026-10-24, Encens de l'abbaye : +N au prochain coup qui touche) ; de la 0.79.7 au 2026-10-24, aucun (les auras qui la donnaient se lisent sur leur anneau) |
| Affaibli | malus | total (−N aux coups) | Affaibli, Aura d'intimidation (de l'adversaire) |
| Coup gâché | malus | total (−N au prochain coup qui touche, après l'armure) | Fausse note (son propre état depuis qu'elle agit après l'armure : un total commun avec Affaibli ne correspondait à aucun coup) ; emblème à générer (`state-spoiled`, icône peinte de la compétence en attendant) |
| Bouclier | bonus | points | Armure temporaire |
| Critique assuré | bonus | charges | Critique assuré |
| Critique renforcé | bonus | total (+N au multiplicateur) | aucun depuis la 0.79.7 (Aura de précision : sur son anneau) |
| Esquive assurée | bonus | charges | Esquive améliorée |
| Dé en plus | bonus | charges | Coup de chance |
| Soin | bonus | total (PV par tour) | Régénération, Sifflotement |
| Drain | bonus | charges | Vol de vie |
| Renvoi | bonus | charges | Riposte ; Rancune (0.114.0 : le coup encaissé lui revient en critique ; le résumé de l'état dit les deux) |
| Épines | bonus | charges | Épines acérées |
| Immunité | bonus | aucun | Garde sacrée (sans porteur) ; l'Aura d'immunité se lit sur son anneau |
| Poison, Saignement, Brûlure, Pourriture | malus | charges ou tours | le statut du même nom |
| Tour perdu | malus | aucun | Peur, Étourdi |
| Brèche, Vulnérable, Luciole | malus | charges | le statut du même nom (sans porteur) |

**Lien avec l'aura** : essayé en 0.79.4 (un état donné par une aura portait son anneau tournoyant), restreint aux bonus en 0.79.6, retiré en 0.79.7. En cherchant à fondre ces bonus dans des états existants, on a constaté qu'aucun n'avait de vraie source hors aura sur le même personnage : ils ne doublaient pas un autre état, ils doublaient l'aura elle-même. Une aura sur son porteur se lit donc sur son anneau, et plus rien n'est à relier.

**Le signal d'activation** (`SkillSignal`, `SignalLayer`) : quand une compétence ou une aura pose un état visible, une lueur (verte pour un bonus, rouge pour un malus) part de son sceau dans l'en-tête et file vers la zone d'état de la cible. L'état n'y apparaît qu'à son arrivée (340 ms à ×1). Le vol est calé sur la chronologie : il part à l'étape de la compétence (`event`), ou à celle de l'aura qui agit (`statusTick`, `statusReaction`). Un statut bloqué ou un mécanisme de compétence n'envoie rien.

**Icônes** (0.79.2). Un état n'a pas la grammaire d'une compétence. La compétence garde son icône peinte, à la palette de son personnage, dans un sceau octogonal. L'état est un **emblème** : un symbole gravé sur une pièce, monochrome, commun à tous, posé tel quel sans cadre, le compteur dessus ([STYLE_BIBLE.md](STYLE_BIBLE.md) § 7, planche v12).

**Une grammaire, une place** (0.97.1, revu en 0.98.0, demande de l'utilisateur). Un emblème gris est une règle commune à tous ; une icône peinte appartient à une compétence ou à une forme précise. Le compendium suit la même séparation que l'écran. Sa section **Statuts** ne contient que le vocabulaire commun, les bonus et malus de la zone d'état (`tray`, `sheetStatuses`), sous leur emblème. Une aura ou un mécanisme (`aura`, `skill`) n'a pas de fiche à lui : il est décrit dans la fiche de la compétence qui le pose ou le relâche (`statusHome`), section Compétences, sous son sceau octogonal ; une règle de forme (`form`) l'est dans la fiche de son personnage. Tout lien vers une aura (pastille d'une relique ou d'une autre compétence, « aussi posé par », interactions) mène à cette compétence. Une aura reste un bonus par la règle (une purification la retire) : sa fiche le dit. Essai intermédiaire (0.97.1) : un groupe « Propres aux compétences » dans Statuts, retiré parce qu'il listait des compétences.

### Compétences en jeu (0.26.0)

Chaque race a trois compétences, une sur un **1** au dé, une sur un **2**, une sur un **3**. Ses variantes en héritent.

| Race | Sur un 1 | Sur un 2 | Sur un 3 (aura permanente) | Thème |
| --- | --- | --- | --- | --- |
| Orcs | Pourfendre (0.70.0 : le 1 frappe et, s'il touche, pose Saignement 2 ; depuis la 0.106.0, elle modifie le coup de base de son jet ; depuis la 0.107.0, Saignement de la moitié des PV que ce coup a retirés, arrondie au-dessus ; avant la 0.70.0 : Saignée sans coup, et Rage du sang, +5 PV) | 🌪️ Furie des vents (deux coups bruts tout de suite, sans compétence ni chaîne, 0.69.0 ; depuis la 0.106.0, elle remplace le coup du 2 par deux coups de base, chacun avec son dé) | 💪 Aura de puissance (+2 dégâts aux coups ; non cumulable depuis la 0.107.0) | s'emporter, déferler, faire saigner |
| Elfes | 🎯 Œil de faucon (Critique assuré) | 💨 Esquive améliorée (esquive à coup sûr le prochain coup reçu, sans durée ; cumulable depuis le 2026-10-21, une charge par esquive) | 🦅 Aura de précision (+1 au multiplicateur de critique et +5 % de critique par charge, cumulable ; le critique en plus depuis la 0.107.0) | viser, se dérober |
| Nains | 🛡️ Peau de pierre (Armure temporaire +6) | 🌵 Épines acérées (permanentes, cumulables : chaque coup encaissé pose 1 charge de Saignement par charge sur l'attaquant, 0.68.0 ; avant : 1 dégât renvoyé par charge) | 😠 Aura d'intimidation (l'adversaire frappe 1 de moins par charge, cumulable ; 2 avant la 0.107.0) | tenir, punir l'attaquant |
| Humains | 😱 Peur (l'adversaire perd sa prochaine action ; une fois par combat depuis la 0.107.0) | Purification (retire le dernier bonus adverse, toutes charges, sinon 6 dégâts directs, 5 avant la 0.115.1 ; de la 0.69.0 à la 0.112.0, elle retirait aussi son propre dernier malus, retiré en 0.113.0 par décision de l'utilisateur) | 🕊️ Aura de sainteté (+1 PV par charge en fin de tour, 2 charges au plus, depuis la 0.107.0 ; +2 PV et 3 charges avant) | contrôler, tenir |
| Hommes-lézards | 🍀 Coup de chance (un d6 en plus à l'action suivante, un jet complet ; il remplaçait le coup du jet qui le pose de la 0.106.0 à la 0.106.1, il se greffe depuis la 0.107.0) | 🪙 Pile ou face (pièce lancée aussitôt, juste après le coup, depuis le 2026-10-21 ; depuis la 0.106.0, elle modifie ce coup : pile, ce coup ×2, puis ×3 depuis la 0.107.0, s'il touche ; face rien ; avant : pile 10 dégâts qui touchent, 20 avant le 2026-10-21) | 🧪 Aura de décoction (chaque coup empoisonne, cumulable ; 1 Poison par charge depuis la 0.107.0, 2 avant ; signature de Naraxes depuis la 0.107.0) | parier, empoisonner |
| Ogre | Attente (sur 1, 2 et 3 : il ne frappait pas), retirée en 0.106.0 : six faces nues, l'attaque la plus forte | — | — | taper fort, sans compétence |
| Druide (homme, Incantation ; de la 0.105.0 à la 0.112.0, un d6 dont chaque face portait son sort : Foudre sur 1, 2, 3, Feux follets sur 4, 5, 6 ; depuis la 0.113.0, son dé vanilla : Feux follets sur le 1, Foudre sur le 2, quatre faces nues, attaque 5 à 6 ; depuis la 0.106.0, chaque sort se greffe sur un coup de base, magique (DM) jusqu'à la 0.110.1, d'un type unique depuis) | Foudre (3 × 1 dégâts directs depuis la 0.106.0, 3 × 2 avant ; événement de scène, 0.73.0 ; 5 avant la 0.76.0) | Feux follets (Brûlure 3, de retour en 0.73.0) | Aura sauvage (+1 à l'attaque par charge, cumulable, depuis la 0.107.0 ; +2 par charge aux coups après le critique de la 0.73.0 à la 0.106.1 ; hors kit depuis la 0.105.0) | lancer des sorts ; avant la 0.73.0 : Fleur de vie, Écorce épaisse, Aura de sève, relais des formes |
| Druide (ours, Force de l'ours : +3 à chaque coup, +4 jusqu'à la 0.75.0 ; coup de base 3 à 4 de la 0.106.0 à la 0.112.0, 5 à 6 depuis la 0.113.0, physique (DP) jusqu'à la 0.110.1) | coup (aucun sort) | coup | coup | frapper fort ; avant la 0.73.0 : Charge, Coup de griffe, Aura de rancune |
| Paladin | ⚖️ Rétribution (relâche la moitié de ses 3 jauges de dégâts reçus, arrondie au-dessous, au moins 1 ; toute la somme avant la 0.107.0) | ⚔️ Riposte (renvoie la moitié du prochain coup encaissé) | Aura d'immunité (purge ses malus, puis plus aucun malus et +1 d'armure, non cumulable) | rendre les coups |
| Morts-vivants | ☠️ Souffle de la tombe (Poison 3 : 3, 2 puis 1 PV) | 🦇 Vol de vie (une charge depuis la 0.107.0, deux de la 0.45.0 à la 0.106.1, 2 au plus : chaque coup qui touche en use une et rend les PV retirés ; une esquive en use une) | Aura glaciale (au début de son tour, 1 Poison par charge sur l'adversaire, cumulable, 0.69.0) | ronger, drainer |

**Auras (0.26.0)** : des bonus **permanents**, posés sur un 3 et sans durée, qui restent jusqu'à la fin du combat. Elles réutilisent les crochets existants, sans règle nouvelle dans le moteur. **Les auras se cumulent** : chaque nouveau 3 ajoute une charge (−1 dégât reçu, +1 au multiplicateur et 5 % de critique, +1 à l'attaque, ou 1 Poison de plus par tour). Deux exceptions : l'Aura d'immunité (0.42.0) et l'Aura de puissance (0.107.0 : +2 cumulable valait +21 points gravée) ne se cumulent pas. L'intimidation et la précision étaient plafonnées à une charge en 0.26.0, faute de consigne. Elles sont cumulables depuis la 0.28.0 : c'était le meilleur levier d'équilibrage des nains et des elfes (voir [EQUILIBRAGE.md](EQUILIBRAGE.md)), et la règle devient la même pour toutes les races. L'Aura glaciale agit au **début du tour de son porteur**, avant son coup : elle pose son Poison (0.69.0).

**De la 0.27.0 à la 0.105.0, un jet de compétence n'infligeait pas de dégâts** : il déclenchait seulement sa compétence (`forfeitsHit`, le « coup sacrifié »). **Depuis la 0.106.0 (l'attaque de base, [RESOLUTION.md](RESOLUTION.md) § 3 bis), chaque jet porte un coup de base**, tiré dans l'attaque du personnage. Une compétence se **greffe** par défaut : ses effets au jet, puis le coup de base ; un statut posé ainsi est présent au début du coup (Œil de faucon : ce coup même est critique ; Vol de vie : ce coup même draine). Coup de chance se greffe depuis la 0.107.0. Pourfendre, Pile ou face, Crescendo et Soliste (ce coup ×N, phase 5 ter) **modifient** leur coup ; la Furie des vents le **remplace**. Un jet remplacé ne porte pas de coup : il ne consomme ni Vol de vie, ni Fausse note, ni l'Esquive améliorée adverse.

### Palettes de race (pistes pour la suite)

| Race | Statuts déjà en jeu | Pistes |
| --- | --- | --- |
| Orcs | Furie des vents, Aura de puissance, Saignement | Brèche, Étourdi |
| Elfes | Critique assuré, Esquive améliorée, Aura de précision | Vulnérable, Saignement (critiques qui font saigner, mesurés en 0.68.0 : SORTS.md § 14) |
| Nains | Armure temporaire, Épines acérées, Aura d'intimidation | — |
| Morts-vivants | Poison, Vol de vie, Aura glaciale | Affaibli |

Un statut peut ponctuellement être emprunté par une autre race, mais il garde une race « maison ». Garde sacrée attend une future race. La Régénération est entrée en jeu en 0.42.0, posée par la Fleur de vie du druide ; elle n'a plus de porteur depuis la 0.73.0. La Brûlure revient en 0.73.0 (Feux follets du druide).

---

## Vocabulaire

| Terme | Sens |
| --- | --- |
| **Statut** | Effet durable porté par un combattant. Il s'affiche dans la zone d'état, au-dessus de lui (icône et nombre), et en aura au sol. |
| **Mécanisme** (`mechanic`, 2026-10-21 ; remplace `innate`) | Statut qui porte la règle d'une compétence (`skill` : jauges de Rétribution, Pile ou face, Furie des vents) ou d'une forme (`form` : Incantation, Force de l'ours, posés quand le personnage prend la forme, retirés quand il la quitte ; aucune compétence ne peut les poser, `validateRoster`). Ni bonus ni malus pour les règles : aucune purge ne l'enlève, aucune immunité, garde ni opposition ne le bloque, les statistiques ne le comptent pas comme bonus ou malus reçu (`isMechanic`). Le compendium le présente comme une mécanique de sa compétence. |
| **Polarité** | **Bonus** (positif, vert) ou **malus** (négatif, rouge). |
| **Charges** (`stacks`) | Intensité ou réserve : points de bouclier, PV de poison du prochain tour, nombre de critiques assurés… À 0, le statut disparaît. Un statut qui **s'estompe** (`decays`, le poison) perd une charge chaque fois qu'il agit : une seule valeur dit sa force et ce qu'il lui reste. |
| **Durée** (`turns`) | Nombre de tours du **porteur** avant expiration, décomptés au début (défaut) ou à la fin de ses tours (`expiresAt`), mais jamais à la fin du tour où le statut a été posé. Elle est facultative : sans durée, le statut dure jusqu'à épuisement de ses charges. |
| **Cumul** (`stacking`) | Ce qui se passe quand on pose un statut déjà présent. `add` : les charges s'additionnent et la durée garde la plus longue. `refresh` : la nouvelle application remplace l'ancienne. |
| **Plafond** (`maxStacks`) | Nombre maximal de charges. Un cumul au-delà est ramené au plafond. |
| **Intensité** (`power`, 0.110.0) | Ce que les rangs d'aiguisage de la compétence qui l'a posé ajoutent au statut, quand des charges en plus ne conviennent pas (statut plafonné, non cumulable, ou qu'une charge doublerait). Le statut la lit lui-même et dit ce qu'elle vaut (`StatusDef.power`) : Furie des vents, un coup de plus par rafale ; Aura de puissance, +1 à chaque coup ; Aura d'immunité, +1 d'armure ; Vol de vie et Riposte, des PV de plus par coup ; Pile ou face, pile ×1 de plus ; Fausse note, un coup qui touche de plus ; Aura glaciale, de décoction, de sainteté et Épines, une charge de plus qui agit sans se poser. Elle ne se cumule pas (la plus forte reste). Toujours entière, elle agit à chaque fois (0.111.0 : le demi-rang de la 0.110.0, payé une fois sur deux, et `powerPaidOnAction` sont retirés). |
| **Compteur** (`counter`) | Le seul nombre affiché sur l'icône de l'état. Par défaut (`auto`), ce sont les tours restants si le statut a une durée, sinon ses charges. On peut imposer `stacks` ou `turns`. Son chiffre défile à chaque changement : c'est la marque visible d'une résolution. Aucune variation ne flotte depuis le compteur (2026-10-21). |
| **Compétence** (ou événement, `CharacterEvent` dans le code) | Capacité d'un personnage qui pose les statuts : *quand* (déclencheur) → *si* (conditions) → *quoi* (effets). |
| **Déclencheur** | Moment du combat : début du combat, début de tour, 1, 2 ou 3 au dé, critique, esquive, coup encaissé, soin reçu (2026-10-24, `healed` : après l'étape qui lui rend des PV)… (14 au total, voir [FEATURES.md](FEATURES.md#3-événements-et-statuts)). |
| **Aura** | Bonus permanent, sans durée, posé pour le reste du combat (les auras du 3). À ne pas confondre avec l'aura au sol, qui signale seulement la présence de bonus ou de malus. |
| **Relation au coup** (`relation`, 0.106.0 ; remplace le coup sacrifié `forfeitsHit`) | Ce qu'une compétence du dé fait du coup de base de son jet : **greffe** (défaut : ses effets au jet, puis le coup), **modifie** (`modify` : ses effets s'appliquent à ce coup s'il touche, ou changent sa valeur), **remplace** (`replace` : pas de coup de base, la compétence fournit ses coups). Règles : [RESOLUTION.md](RESOLUTION.md) § 3 bis. |
| **Condition** (`when`) | Exigence supplémentaire, vérifiée au moment du déclencheur. Toutes les conditions d'un événement doivent être vraies. |
| **Cible** | Un effet vise le porteur (`self`, par défaut) ou son adversaire (`opponent`). |
| **Réaction** (`reactions`) | Effet d'un statut déclenché à un moment du combat (ex. Épines quand le porteur encaisse). |
| **Garde** (`wards`) | Statut qui bloque la pose de certains statuts sur son porteur ; une charge par blocage. |
| **Opposition** (`opposes`) | Paire de statuts contraires dont les charges s'annulent une à une (Régénération ↔ Poison). |
| **Immunité** (`immunities`) | Statuts qui ne peuvent jamais être posés sur un personnage. |
| **Contrôle** (`skipsAction`) | Le porteur perd son action. |

### Déroulé dans un tour

Le tour du porteur a trois phases : **début de tour** (effets périodiques de début, durées « début »), **action** (attaque, ou action perdue s'il est Étourdi) et **fin de tour** (effets périodiques de fin, durées « fin »). Les fenêtres, l'ordre de résolution, l'application (immunité → garde → opposition → cumul) et des exemples d'interactions sont dans **[RESOLUTION.md](RESOLUTION.md)**, le livre de règles de la résolution.

Exemple : un Étourdi de durée 1 tient jusqu'au prochain tour du porteur. La Furie des vents n'a plus de durée ni de moment d'expiration (2026-10-21) : instantanée, elle frappe dans l'action où elle est posée. Le poison n'a pas de durée depuis la 0.36.4 : il s'estompe (3, 2, 1, puis il disparaît).

### Conditions disponibles

| Condition | Vraie quand | Exemple |
| --- | --- | --- |
| `hpBelow` | les PV (du porteur ou de l'adversaire) sont sous une fraction des PV max | « si l'adversaire est sous 30 % de ses PV » |
| `hpAtLeast` | les PV sont au moins à une fraction des PV max | « tant qu'il a au moins 75 % de ses PV » |
| `hasStatus` | il porte un statut (avec au moins N charges) ; se lit aussi sur un bonus de relique (2026-10-24, au coup qui touche) | « si l'adversaire porte Poison » (Fiole de venin : au moins 1 ; 3 dans la proposition, mesurée trop rare) |
| `lacksStatus` | il ne porte pas ce statut | « s'il n'a pas déjà de bouclier » |
| `fromTurn` | le tour en cours est au moins N | « à partir du tour 5 » |
| `hitAtLeast` (2026-10-24) | le coup en cours a retiré au moins N PV ; seulement dans les fenêtres d'un coup qui touche (`hit`, `crit`, `hurt`) | « si ce coup retire 6 PV ou plus » (Écu cabossé) |

Une condition fausse ne consomme pas de hasard : la `chance` d'un événement n'est tirée que si toutes ses conditions sont remplies.

---

## Catalogue (0.26.0)

| Statut | Polarité | Effet | Cumul | Plafond | En jeu |
| --- | --- | --- | --- | --- | --- |
| 🎯 Critique assuré | bonus | le prochain coup qui touche est critique (une charge par coup) ; posé par une compétence greffée, c'est le coup de base de ce jet même (0.106.0) | add | — | oui · elfes (Œil de faucon), sur soi ; relique Clepsydre du siège (au 6e tour, puis tous les 4 tours, 0.105.0) |
| 🛡️ Armure temporaire | bonus | bouclier qui absorbe après l'armure, s'use d'autant | add | — | oui · nain (Peau de pierre, 6) ; druide (Écorce épaisse, 7) de la 0.50.0 à la 0.72.0 ; reliques Géode fendue (4) et Écu cabossé (2, sur un coup encaissé de 6 ou plus, 2026-10-24) |
| 💚 Régénération | bonus | rend des PV au début de chaque tour du porteur | refresh | — | non · sans porteur depuis la 0.73.0 (Fleur de vie du druide, de la 0.42.0 à la 0.72.0) |
| ☠️ Poison | malus | au début de chaque tour du porteur, lui fait perdre autant de PV que de charges, en ignorant l'armure, puis perd une charge (`decays`, 0.36.4) : poison 3 = 3 + 2 + 1 PV | add | — | oui · morts-vivants (Souffle de la tombe), sur l'adversaire |
| Saignement (0.68.0) | malus | chaque coup qui touche le porteur lui fait perdre autant de PV que de charges, en ignorant l'armure, puis perd une charge (réaction `hurt`, `decays`) : saignement 2 = 2 + 1 PV, sur les deux prochains coups reçus. Le pendant du Poison, qui compte les coups au lieu des tours : une rafale vide la plaie d'un coup, une esquive ou une action perdue la laissent ouverte. **Une plaie ouverte pendant un coup ne coule pas sur ce coup : elle coule dès le coup suivant qui touche le porteur** (règle générale de tous les statuts, RESOLUTION § 5 règle 9, décision de l'utilisateur du 2026-10-21) ; grossie pendant un coup, elle y coule de ses charges du début du coup. On la voit, on l'attend. À l'écran, elle coule à l'impact, avec un badge « Saignement +N » sous le dé. **Malus physique** : un coup doit toucher pour le poser (Pourfendre, `needsTouch`, 0.70.0). Pourfendre pose depuis la 0.107.0 la moitié des PV que son coup a retirés, arrondie au-dessus (`applyStatus.fromHit`) : la plaie lit le coup | add | — | oui · orc (Pourfendre, sur un 1 qui touche) et nain (Épines acérées), sur l'adversaire |
| 🥀 Affaibli | malus | les coups du porteur infligent moins avant l'armure | refresh | — | à venir |
| 💔 Brèche | malus | armure du porteur réduite | add | 3 | à venir |
| 🔥 Brûlure | malus | perte de PV à la **fin** des tours du porteur ; une seule valeur (0.69.0) : posée sans durée, elle dure autant de tours que sa valeur (`turnsFromStacks` ; une durée en plus est refusée par `validateRoster`) | refresh | — | oui · druide homme (Feux follets, sur un 2, Brûlure 3), sur l'adversaire ; de retour en 0.73.0 (sans porteur de la 0.71.0 à la 0.72.0) |
| 🩸 Vulnérable | malus | +N dégâts reçus avant l'armure | add | 3 | à venir |
| 💫 Étourdi | malus | perd son action (une charge par tour perdu) | add | 1 | à venir |
| 🌵 Épines acérées | bonus | **chaque** coup encaissé pose sur l'attaquant 1 charge de Saignement par charge d'épines (réaction `hurt`, 0.68.0) ; permanentes depuis la 0.45.0. Posées pendant un coup (Collier de ronces, au passage du seuil), elles ne répondent pas à ce coup, mais dès le coup suivant (règle 9) Avant la 0.68.0 : 1 dégât direct renvoyé par charge (et 6 pendant 1 tour avant la 0.45.0) | add | — | oui · nains (sur un 2), sur soi |
| ✨ Garde sacrée | bonus | bloque les prochains malus (une charge par blocage) | add | — | à venir |
| 🦇 Vol de vie | bonus | chaque charge : le prochain coup qui touche (pile comprise) rend les PV qu'il retire, réaction de la fenêtre `hit` (`drainsHit`) ; esquivé, la charge est perdue ; un jet remplacé (sans coup) la laisse. Greffé, il draine le coup de base de son propre jet (0.106.0). Une charge par Vol de vie depuis la 0.107.0 (deux de la 0.45.0 à la 0.106.1) | add | 2 | oui · morts-vivants (sur un 1), sur soi |
| 🌪️ Furie des vents | mécanisme (`skill`) | instantanée (`instantStrikes`, 0.50.0, demande de l'utilisateur) : le jet qui la pose ne porte pas de coup (relation « remplace », 0.106.0) ; à la place, deux coups de base par charge (`extraStrikes: 2`), chacun avec son dé, résolus à part. Depuis la 0.110.0, la rafale part juste après le jet qui la pose, avant le jet suivant de la même action (la barde, Coup de chance), et **toutes** ses charges partent ensemble ; avant, elle attendait la fin de l'action et ne dépensait qu'une charge. Aiguisée, son intensité ajoute un coup par rafale (`power`). Depuis la 0.69.0, coups bruts (`Attack.plain`) : leur face ne déclenche aucune compétence, donc aucune Furie en chaîne ; les reliques de face et la dorure lisent leur dé (0.95.0 ; du 2026-10-21 au 2026-10-22, aucune relique de face). Sans durée ; jamais purgée ni bloquée | add | — | oui · orcs (sur un 2), sur soi |
| 💨 Esquive améliorée | bonus | le prochain coup reçu est esquivé, sans tirage (`forcesDodge`) ; une charge par esquive. Cumulable depuis le 2026-10-21 (demande de l'utilisateur) : chaque charge esquive un coup de plus ; avant, `refresh` plafonné à 1 | add | — | oui · elfes (Esquive améliorée), sur soi ; reliques Dé creux et Plume d'aigle (après un critique, recharge 2 tours, 2026-10-24) |
| Ferveur (`momentum`, 2026-10-24 ; « Élan » jusqu'au même jour, renommée parce que l'élan nomme déjà le mouvement d'attaque, T12 ; l'identifiant est gardé) | bonus | son prochain coup qui touche fait +1 par charge, avant l'armure (`modifyOutgoing`), puis disparaît avec toutes ses charges (`spentOnHit`) ; esquivé ou remplacé, elle reste. Cumulable. Le pendant positif de la Fausse note ; aucun statut ne disait « +N au prochain coup » (la Rancune de la 0.71.0 était retirée). Dans la zone d'état, elle alimente la **Puissance** et en prend l'emblème ; pas d'icône peinte propre (`STATUS_ICON`) | add | — | oui · relique Encens de l'abbaye (+1 chaque fois que son porteur regagne des PV), sur soi |
| Aura glaciale (`frostAura`, ex-Aura de poison) | bonus | au début de chaque tour du porteur, avant son coup, pose 1 charge de **vrai Poison** par charge sur l'adversaire (`onTurnStart`, 0.69.0) ; permanente. Une charge fige le poison à sa valeur, deux le font grossir ; l'immunité le bloque, la Régénération l'annule, une purge l'enlève. Avant la 0.69.0 : 1 dégât direct par charge au début du tour adverse | add | — | oui · morts-vivants (sur un 3), sur soi |
| 💪 Aura de puissance | bonus | +2 dégâts sur chaque coup, après le critique et avant l'armure (`modifyOutgoing`) ; permanente, non cumulable depuis la 0.107.0 (+2 par charge avant). Plus posée par une relique depuis la 0.105.0 (la Clepsydre du siège pose Critique assuré) | refresh | 1 | oui · orcs (sur un 3), sur soi ; hors kit de Gorak depuis la 0.105.0 (gravable) |
| 😠 Aura d'intimidation | bonus | les coups de l'adversaire font 1 de moins par charge (`INTIMIDATION`, 2 avant la 0.107.0), avant l'armure (`modifyIncoming`) ; permanente | add | — | oui · nains (sur un 3), sur soi |
| 🦅 Aura de précision | bonus | par charge, +1 au multiplicateur de critique et +5 % de critique (`modifyStats`, `PRECISION_CRIT`, 0.107.0 : sans la chance, un porteur sans critique n'en tirait rien) ; permanente | add | — | oui · elfes (sur un 3), sur soi |
| 😱 Peur | malus | perd sa prochaine action (`skipsAction`), puis disparaît ; le porteur tremble (`look.motion`). Non cumulable (2026-10-21, audit S9) : une Peur reposée remplace la première, une seule action perdue. La compétence Peur ne part qu'une fois par combat depuis la 0.107.0 (`limit`) ; **bloquée par une immunité (relique ou compétence), elle a quand même usé sa fois** (décision de l'utilisateur du 2026-10-24, E4 ; RESOLUTION.md § 3 bis) | refresh | 1 | oui · humains (sur un 1), sur l'adversaire |
| 🕊️ Aura de sainteté | bonus | +1 PV par charge à la fin de chaque tour du porteur (`onTurnEnd`, `HOLY_HEAL`) ; permanente. 0.107.0 : 1 PV et 2 charges au plus (décision de l'utilisateur pour le plafond), au lieu de 2 PV et 3 charges | add | 2 (0.107.0 ; 3 depuis la 0.42.0) | oui · humains (sur un 3), sur soi |
| 🧪 Aura de décoction | bonus | chaque coup qui touche pose 1 charge de poison par charge d'aura (`reactions.hit`, `DECOCTION_POISON` ; 2 de la 0.36.4 à la 0.106.1) ; permanente | add | — | oui · hommes-lézards (sur un 2, la signature de Naraxes depuis la 0.107.0), sur soi |
| 🪙 Pile ou face | mécanisme (`skill`) | relation « modifie » (0.106.0, décision de l'utilisateur) : si le coup du jet qui la pose touche, la pièce part aussitôt, juste après lui ; pile, ce coup ×3 (`coinToss.multiplier`, `COIN_HEADS`, 0.107.0 ; ×2 avant) : l'adversaire perd encore deux fois les PV que le coup lui a retirés, en une perte, en dégâts directs qui comptent comme un coup qui touche de ce montant (`headsTouches`, 0.42.0 : Vol de vie, Riposte, jauges, Épines, Saignement, décoction réagissent) ; face, rien (`coinToss`). Coup esquivé : pas de pièce. Avant la 0.106.0 : pile, 10 dégâts directs fixes (20 de la 0.42.0 au 2026-10-21) ; avant le 2026-10-21, la pièce remplaçait le dé de l'action suivante | refresh | 1 | oui · hommes-lézards (sur un 1), sur soi |
| ⚖️ Rétribution | mécanisme (`skill`) | 3 jauges : les PV retirés par les 3 derniers coups qui touchent le porteur, pile qui touche comprise (`fillsOnHurt`, `slots`, réaction de sa fenêtre `hurt`) ; relâchées par l'effet `release`, la moitié de leur somme depuis la 0.107.0 (`share`, arrondie au-dessous ; toute la somme avant) ; affiche leur somme ; jamais purgées | refresh | — | oui · paladin, sur soi |
| Attente | mécanisme (`skill`) | l'ogre avait fait 1, 2 ou 3 : il ne frappait pas ; retombait au début de son tour suivant (`expiresAt: 'turnStart'`) | refresh | 1 | non · retirée en 0.106.0 (décision de l'utilisateur) : l'ogre a six faces nues et l'attaque la plus forte |
| Luciole | malus | esquive à 0 (`modifyStats`), +2 dégâts reçus par coup (`modifyIncoming`) ; une charge part à chaque coup encaissé (`spentOnHurt`) | add | — | non (remplacée par les Feux follets en 0.50.0) |
| Aura de pourriture | bonus, aura | chaque coup qui touche pose ses charges de Pourriture sur la cible (`reactions.hit`) ; permanente | add | — | non · sans porteur depuis la 0.71.0 (druide ours, sur un 3, avant) |
| Pourriture | malus | 1 dégât direct par charge au début de chaque tour du porteur ; sans durée, seule une purge l'enlève | add | — | non · posée par l'Aura de pourriture, sans porteur depuis la 0.71.0 |
| Rancune (`grudge`, 0.71.0) | bonus | le prochain coup du porteur qui touche faisait +valeur avant l'armure, puis était dépensée | refresh | — | non · retirée en 0.73.0 (relais des formes du druide) ; l'identifiant et l'icône sont repris par la Rancune de la 0.114.0 (plus bas) |
| Sève (`sap`, 0.71.0) | bonus | soignait sa valeur au début du prochain tour du porteur | refresh | — | non · retirée en 0.73.0 (relais des formes du druide) |
| Aura de sève (`sapAura`, 0.71.0) | bonus, aura | +2 à chaque Sève gagnée, par charge | add | — | non · retirée en 0.73.0 |
| Aura de rancune (`grudgeAura`, 0.71.0) | bonus, aura | +2 à chaque Rancune gagnée, par charge | add | — | non · retirée en 0.73.0 |
| Incantation (`casting`, 0.73.0) | bonus, statut de forme | 0.113.0 : les sorts de l'homme (Feux follets sur le 1, Foudre sur le 2) partent sur leurs faces, greffés sur son coup de base ; ses autres faces frappent. 0.106.0 : chaque face du dé de l'homme lance un sort, qui se greffe sur son coup de base (magique, DM, jusqu'à la 0.110.1 ; d'un type unique depuis). 0.105.0 : un d6 dont chaque face porte son sort, sans coup. De la 0.73.0 à la 0.104.x : le dé du porteur devenait un d3 (`modifyStats`), chaque jet lançait un sort, jamais de coup, médaillon « d3 » | refresh | 1 | oui · druide, forme humaine (statut de forme) |
| Force de l'ours (`bearMight`, 0.73.0) | bonus, statut de forme | chaque coup fait +3 avant l'armure (`modifyOutgoing`, `BEAR_MIGHT` ; +4 jusqu'à la 0.75.0) ; gardée en 0.106.0 sur le coup de base de l'ours (physique, DP, jusqu'à la 0.110.1), qui a la même attaque que l'homme (3 à 4 ; 5 à 6 depuis la 0.113.0) ; sans nombre | refresh | 1 | oui · druide, forme d'ours (statut de forme) |
| Aura sauvage (`wildAura`, 0.73.0) | bonus, aura | l'attaque du porteur, minimum et maximum, gagne +1 par charge (`modifyStats`, `WILD_AURA_ATTACK`, 0.107.0, décision de l'utilisateur) : elle écrit la feuille et compte avant le critique ; posée par l'homme, elle sert l'homme et l'ours ; permanente. De la 0.73.0 à la 0.106.1 : +2 par charge à chaque coup, après le critique (`modifyOutgoing`), un doublon de l'Aura de puissance | add | — | oui · druide homme (hors kit, gravable), sur soi |
| ⚔️ Riposte | bonus | chaque charge : le prochain coup qui touche le porteur lui renvoie 50 % des PV retirés (`reflectsHit`) ; sans durée. Deux charges par Riposte (0.50.0) | add | 2 | oui · paladin (sur un 2), sur soi |
| Aura d'immunité | bonus | aucun malus ne peut être posé sur le porteur, sans s'user (`immune`), et son armure gagne 1 (`modifyStats`, 0.42.0) ; permanente | refresh | 1 | oui · paladin (sur un 3), sur soi |
| Sifflotement | bonus | +2 PV à chaque fin de tour du porteur, puis une charge de moins (`decays`, `onTurnEnd`) : une charge par tour | add | — | oui · barde, hors kit depuis la phase 5 ter (Siffloter, gravable sur une face : 2 charges ; 3 sur le double 1 avant), sur soi |
| Fausse note | malus | le prochain coup du porteur qui touche fait 5 dégâts de moins par charge, retirés après l'armure (`modifyFinal`, au moins 1), puis disparaît (`spentOnHit`) ; esquivé ou remplacé (jet sans coup), elle reste | add | — | oui · barde, hors kit depuis la phase 5 ter (Fausse note, gravable sur une face : 1 charge ; 2 sur le double 2 avant), sur l'adversaire |
| Aura mélodieuse | bonus, aura | +1 dégât par charge sur chaque coup qui touche, ajouté après l'armure et les boucliers (`modifyFinal`) : ni l'armure, ni l'intimidation, ni les boucliers ne le réduisent ; une Fausse note, elle, s'y additionne (les dégâts finaux s'additionnent, puis un seul plancher de 1, 0.110.0) ; permanente | add | — | oui · barde (Ouverture au début du combat : 1 charge ; le Duo sur le 1, sa signature depuis le 2026-10-25 : 1 charge, avant son dé de plus ; l'Aura mélodieuse sur le 1 de la phase 5 ter à la 0.115.1, chacun de ses deux dés pouvait la déclencher ; 2 charges sur le double 3 avant), sur soi |
| 🍀 Coup de chance | bonus | relation « greffe » depuis la 0.107.0 (« remplace » en 0.106.0 et 0.106.1 : le jet qui le posait ne frappait pas) : le coup du jet qui le pose part ; à la prochaine action, un d6 de plus par charge, chacun un jet complet résolu à part : sa compétence (greffée, modifiée ou remplacée), puis son coup de base (`extraStrikes`, `strikeCharges: 'all'` ; `extraDie`, retiré en 0.106.0 : le d6 est le seul dé) ; cumulable depuis la 0.50.0 (demande de l'utilisateur). Un seul statut de jets de plus part par action : avec le Duo, l'autre attend l'action suivante. Hors du répertoire de la barde depuis le Duo (2026-10-25), qui a sa mécanique ; la Pièce trouée peut encore le lui donner | add | — | oui · hommes-lézards (hors kit de Naraxes, gravable), sur soi |
| Duo (`duo`, 2026-10-25) | bonus | la mécanique de Coup de chance, sous son nom : à la prochaine action, un d6 de plus par charge, chacun un jet complet (sa face, sa compétence, son coup) ; toutes les charges partent à cette action (`extraStrikes: 1`, `strikeCharges: 'all'`). Posé par la signature de la barde sur le 1, après +1 Aura mélodieuse ; un 1 dans sa rafale en pose un nouveau, pour l'action d'après. Zone d'état : le **Dé de plus** (`extraDie`), comme Coup de chance ; son icône, celle de la compétence (planche v20) ; ses dés de plus sont mauves (`look.dieColor`). Le sceau du Duo reste à sa face : il pose aussi un autre statut que l'aura (`auraOfSkill`) | add | — | oui · barde (le Duo, sa signature sur le 1), sur soi |
| Curée (`quarry`, 0.114.0, phase 8) | mécanisme (`skill`) | la rafale de la Furie, posée par une greffe : deux coups de base bruts par charge (`extraStrikes: 2`, `instantStrikes`), toutes les charges ensemble ; comme la compétence se greffe, sa charge est posée avant le coup de base de son jet et la rafale part **après** lui, avant tout autre coup (RESOLUTION § 2). Coups bruts : aucune compétence sur leur face. Aiguisée : une charge de plus (quatre coups au rang II) | add | — | oui · la Curée (hors kit de Gorak, gravable ; répertoires d'Elaria, Brokk, Morgrut), sur soi, si l'adversaire saigne |
| Sentence (`sentence`, 0.114.0, phase 8) | bonus, aura | chaque fois que le porteur regagne des PV (fenêtre `healed`, une fois par étape soignante), l'adversaire perd 1 PV par charge en dégâts directs de Lumière (`reactions.healed`, `SENTENCE_LOSS`) ; sa perte ne soigne rien, sans chaîne ; permanente. Aiguisée : +1 PV par soin (intensité, le plafond ne bouge pas). Essayée à 2 PV par charge : Ysolde +13,5 gravée, à 58,8 % contre le roster | add | 2 | oui · la Sentence (hors kit d'Ysolde, gravable), sur soi |
| Rancune (`grudge`, 0.114.0, phase 8) | bonus | chaque coup qui touche le porteur (pile comprise) lui donne un Critique assuré (`reactions.hurt`), puis perd une charge (`decays`) : une charge par coup encaissé. Seule une Rancune déjà là au début du coup y réagit (règle 9). Dans la zone d'état, elle alimente le **Renvoi** ; son icône est celle de la Rancune de la 0.71.0 (planche v8). Sa première version, « +2 au prochain coup quand il encaisse un coup, 2x » (une Ferveur), n'avait aucun partenaire ([SORTS.md](SORTS.md) § 22) | add | — | oui · la Rancune (hors kit de Morgrut, gravable ; répertoires de Brokk et d'Aldric), sur soi |
| Embrasement (`conflagration`, phase 8, second lot) | mécanisme (`skill`) | une charge qui attend son prochain coup qui touche un adversaire qui brûle (`reactions.hit`) : il relâche alors d'un coup sa Brûlure, 3 fois ce qu'elle lui ferait encore perdre (ses PV par tour × ses tours restants, `StatusDef.releases`, effet `release` avec `from: 'opponent'`), et la Brûlure s'éteint ; une charge part (`decays`). Sans Brûlure, la réaction ne part pas : la charge attend, et les charges se cumulent. Mécanisme : aucune purge ne la retire (au jet, sans attente, elle ne partait que 0,15 fois par combat). Aiguisée : ×1 de plus | add | — | oui · l'Embrasement (hors kit de Thaldrin, gravable ; répertoire d'Ervald), sur soi |
| Dé pipé (`loadedDie`, phase 8, second lot) | mécanisme (`skill`) | une charge qui attend sa prochaine pièce (Pile ou face) : la pièce se tire quand même, puis tombe sur pile, et pile vaut ×2 de plus (`loadsCoin`, ce coup ×5) ; une charge par pièce. Une pièce imposée en mode triche garde sa valeur et laisse la charge. Aiguisé : pile ×1 de plus | add | — | oui · le Dé pipé (hors kit de Naraxes, gravable ; répertoire de Fanchon), sur soi |
| Rempart hérissé (`bristlingRampart`, phase 8, second lot) | bonus, aura | chaque fois qu'un coup qui le touche vide son armure temporaire (fenêtre `shieldBroken`), +2 Épines acérées par charge (`reactions.shieldBroken`, `RAMPART_THORNS`) ; permanente. Le pont du Rempart vers les Épines (FAMILLES § 7). Aiguisé : +2 Épines par armure vidée | add | — | oui · le Rempart hérissé (hors kit de Brokk, gravable ; répertoire de Morgrut), sur soi |
| Vindicte (`vendetta`, phase 8, second lot) | bonus, aura | chaque fois qu'il renvoie des dégâts (fenêtre `reflected` : sa Riposte, sa Rétribution relâchée), +3 Ferveur par charge (`reactions.reflected`, `VENDETTA_MOMENTUM`) ; permanente. Aiguisée : +3 Ferveur par renvoi | add | — | oui · la Vindicte (hors kit d'Aldric, gravable ; répertoire de Brokk), sur soi |

Régénération et Poison s'opposent. Vulnérable, Étourdi et Garde sacrée illustrent chacun une mécanique de résolution (voir [RESOLUTION.md](RESOLUTION.md#8-statuts-qui-illustrent-chaque-mécanique-à-venir)) ; ils n'ont pas encore d'icône peinte, à produire avant attribution. La Brûlure (Feux follets) a la sienne depuis la planche v9, l'Incantation et la Force de l'ours aussi ; le Saignement depuis la v8. Toutes les icônes en attente, tous chantiers confondus : STYLE_BIBLE § 7, « Icônes à générer ».

---

## Règles de design

1. **Un statut est entièrement décrit dans son registre** (`STATUSES`) : règle et présentation. L'interface, le journal, le compendium et les statistiques suivent sans code dédié.
2. **Lisible en un coup d'œil** : chaque statut a une **icône peinte** claire (`STATUS_ICON`) et affiche **un seul nombre** dans la zone d'état. Le nom et le détail sont au survol, et dans le compendium.
3. **Bornes du moteur** : aucun statut ne peut faire descendre un coup sous 1 dégât, l'armure sous 0, ni une chance hors de 0 à 100 %. Les PV max ne changent jamais.
4. **Les dégâts directs sont puissants** : poison et dégâts d'effet ignorent armure, esquive et boucliers. Un réglage de 2 → 3 PV par tour a fait passer Ervald de 50 à 62 % de victoires (voir [PERSONNAGES.md](PERSONNAGES.md#morts-vivants--affliger)). Il faut les doser prudemment.
5. **Cumuls infinis interdits pour les malus de stats** : un malus qui modifie une caractéristique doit avoir un plafond (Brèche : 3), sinon un combat long finit par annuler la stat.
6. **Équilibre** : tout statut attribué à un personnage passe par la mesure (`npm run balance`, entre 42 et 58 %, aucun duel au-delà de 65/35, méthode dans [EQUILIBRAGE.md](EQUILIBRAGE.md)) et la mise à jour de la matrice dans `PERSONNAGES.md`.
7. **Qui subit est toujours dit** (2026-10-21, retour de l'utilisateur sur le Souffle de la tombe). Le texte d'un statut (`describe`) parle de son porteur sans le nommer (« Perd 3 PV au début de son prochain tour ») : juste dans sa propre zone d'état, ambigu dans l'infobulle de la compétence qui le pose. Posé sur l'adversaire, l'adversaire devient le sujet (passe compendium, 2026-10-25 ; « Sur l'adversaire : … » jusque-là) : sa phrase `onFoe` (« Le prochain coup de l'adversaire qui touche fait −5 dégâts »), sinon « L'adversaire » suivi de `describe`, qui commence alors par un verbe (« L'adversaire perd 3, 2 puis 1 PV au début de ses tours »). Tout autre effet sur l'adversaire le nomme (« à l'adversaire »). Un test (`modules.test.ts`) refuse une compétence dont un effet sur l'adversaire ne le nomme pas.
8. **Le style de rédaction** (règle de l'utilisateur, passe compendium du 2026-10-25, [SORTS.md](SORTS.md) § 24). `summary` et `describe` sont courts : l'effet d'abord, sans « après l'armure » ni arrondi ; ce qu'ils taisent va dans `detail`, la ligne « Détail » du compendium sous une compétence qui le pose. Un statut que lit une condition déclare son verbe d'état (`bears` : « saigne », « est empoisonné », « brûle ») ; un statut qui se compte, son pluriel (`plural` : « Coups de chance »). Les textes s'écrivent avec des espaces simples : le registre passe une fois par `typeset` (espace insécable devant « : ; ! ? % »). `wording.test.ts` contrôle chaque texte, à plusieurs charges.

### Ajouter un statut : check-list

- [ ] Rappel visuel sur le porteur (`look`) : liseré (`glow`) pour un effet temporaire, halo qui pulse (`aura`) pour une aura permanente, transparence (`opacity`) pour l'esquive. Au K.O., l'aura du vaincu s'éteint en fondu (halo, cercle, particules et contour de la silhouette ; `Fighter.tsx`, `.char-aura-out`) : rien à faire pour un nouveau statut.
- [ ] Rôle en une phrase (`summary`), polarité, **icône peinte obligatoire** dans `Icon.tsx` → `STATUS_ICON` (voir STYLE_BIBLE § 7 ; jamais d'emoji : la demander à l'utilisateur), compteur affiché (`counter`).
- [ ] Règle de cumul, plafond si c'est un malus de stat.
- [ ] S'il fait des dégâts quand il agit : leur **source** (`source` de son effet `damage`, registre `DAMAGE_SOURCES` de `damage.ts`, règles v2) : elle donne leur type (DT) et la couleur de son « −N » ([MISE_EN_SCENE.md](MISE_EN_SCENE.md), M37). Aujourd'hui : Poison (vert), Brûlure et Pourriture (mauve), Saignement (rouge).
- [ ] Ses **accroches** (règles v2, [PROGRESSION.md](PROGRESSION.md) § 8) : une ligne dans `STATUS_HOOKS` (`hooks.ts`) : le côté où on le pose, ce qu'il produit et consomme au-delà de lui-même.
- [ ] Sa mise en scène : à quel repère il tombe, et, s'il réagit à un coup, dans quelle famille ([MISE_EN_SCENE.md](MISE_EN_SCENE.md) § 6).
- [ ] Crochets utilisés (voir ARCHITECTURE). S'il en faut un nouveau, le tester dans `combat.test.ts`.
- [ ] Une ligne ajoutée au catalogue ci-dessus, avec « à venir » tant qu'aucun personnage ne le pose.
- [ ] Une fois attribué : l'événement dans `roster.ts`, la mesure d'équilibre et `PERSONNAGES.md`.

---

## Chantier : l'arrivée des bonus et malus

**Objectif** : multiplier les bonus et malus appliqués pour un nombre de tours, selon des conditions, tout en gardant les combats lisibles et équilibrés.

**Prêt (0.18.0 à 0.20.0)**

- Durées en tours, cumul `add`/`refresh`, plafond de charges.
- Conditions de déclenchement (`when`) : PV du porteur ou de l'adversaire, présence ou absence d'un statut, tour minimal.
- `chance` et `limit` (nombre de fois par combat), ciblage du porteur ou de l'adversaire.
- Purge (`cleanse`) des bonus ou des malus.
- Couche de résolution (0.20.0) : fin de tour, contrôle, réactions, dégâts entrants, garde, immunités, opposition, ordre de résolution fixe. Voir [RESOLUTION.md](RESOLUTION.md), avec ses décisions à valider (§ 9).
- Catalogue généré depuis le code (`statusCatalog`), affiché dans le compendium, avec « en jeu » ou « à venir ». La provenance (`statusSources`) sert au filtre « en jeu » mais n'est plus affichée sur les cartes (0.20.1).

**À définir (décisions de game design)**

- [x] **Cadre** (0.20.1) : statuts neutres, compétences liées au personnage, palette par race, 1 passif de race + 2 compétences au plus (voir plus haut).
- [x] **Deux compétences par race** (0.25.0) : une sur le 1, une sur le 2 (voir « Compétences en jeu »).
- [x] **Une aura permanente par race** (0.26.0), sur le 3.
- [ ] **Plafond de 2 compétences** : avec trois compétences par race, le plafond décidé en 0.20.1 est dépassé, à la demande de l'utilisateur. À reformuler, par exemple : « une compétence par face basse du dé ».
- [x] **Cumul de l'intimidation et de la précision** (0.28.0) : cumulables, comme les autres auras.
- [x] **Épines et Vol de vie** (0.29.0, décision de l'utilisateur) : Épines à 6, à chaque coup encaissé (deux fois contre une Furie) ; Vol de vie sans durée, perdu sur une esquive, gardé sur un jet de 1 à 3.
- [ ] **Quels statuts pour qui, ensuite** : les pistes de palette ci-dessus, avec une mesure d'équilibre à chaque fois.
- [ ] **Conditions** : quelles conditions par personnage. Par exemple, un orc qui enrage sous 30 % de ses PV, ou un elfe qui achève une cible empoisonnée.
- [ ] **Durées types** : fixer une grille, par exemple 2 tours pour un effet court, 3 pour un effet standard, et « jusqu'à épuisement » pour les boucliers et les charges.
- [ ] **Interactions** : la purge doit-elle exister sur un personnage ? Faut-il des immunités (un mort-vivant immunisé au poison) ?
- [ ] **Nouveaux crochets éventuels** : `onExpire` (effet à l'expiration, effet différé), action sur le dé (relance), provocation… Chacun demande une étape du moteur et ses tests (voir RESOLUTION.md). Arrivés en 0.25.0 : vol de vie (`drainsHit`), coups multiples (`extraStrikes`), esquive imposée (`forcesDodge`), réaction unique (`spentOnReaction`), coup sacrifié (`forfeitsHit`, sur la compétence ; remplacé en 0.106.0 par la relation au coup, `relation`).
- [ ] **Lisibilité** : la zone d'état tient environ 4 médaillons de chaque côté au-dessus d'un combattant. Au-delà, faut-il les regrouper ou réduire leur taille ?
- [ ] **Compteur** : valider, statut par statut, que le nombre affiché est le bon. Par défaut, c'est la durée si elle existe. Le poison n'a plus qu'une valeur depuis la 0.36.4 (demande de l'utilisateur : la valeur des dégâts et le nombre de tours affichés à part étaient confus).
