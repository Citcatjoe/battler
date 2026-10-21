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
- `form` : règle de forme, dans la barre de compétences, avec sa valeur (Force de l'ours « +3 », Incantation « d3 ») ;
- `skill` : mécanisme interne d'une compétence, sur son sceau (les jauges de Rétribution) ou par le seul éclat du sceau et le label du coup (Pile ou face, Furie des vents, Attente).

**Regroupement.** Les statuts de même effet font un seul médaillon, au total signé : Affaibli, Fausse note et l'Aura d'intimidation adverse font un **Affaibli** ; Régénération et Sifflotement font un **Soin** (PV par tour) ; Peur et Étourdi font un **Tour perdu**. L'infobulle détaille chaque part, son effet et d'où elle vient (« Vient de : Œil de faucon (Elaria) », lu dans les données par `originsOf`). Le regroupement est **une présentation** : le moteur garde ses statuts distincts et leurs règles (avant ou après l'armure, durée, consommation). Unifier les règles elles-mêmes reste le chantier des familles ([FAMILLES.md](FAMILLES.md), TODO § 12-13).

| État | Polarité | Nombre | Statuts qui l'alimentent |
| --- | --- | --- | --- |
| Puissance | bonus | total (+N aux coups) | aucun depuis la 0.79.7 (les auras qui la donnaient se lisent sur leur anneau) ; gardée pour une source à venir |
| Affaibli | malus | total (−N aux coups) | Affaibli, Fausse note, Aura d'intimidation (de l'adversaire) |
| Bouclier | bonus | points | Armure temporaire |
| Critique assuré | bonus | charges | Critique assuré |
| Critique renforcé | bonus | total (+N au multiplicateur) | aucun depuis la 0.79.7 (Aura de précision : sur son anneau) |
| Esquive assurée | bonus | charges | Esquive améliorée |
| Dé en plus | bonus | charges | Coup de chance |
| Soin | bonus | total (PV par tour) | Régénération, Sifflotement |
| Drain | bonus | charges | Vol de vie |
| Renvoi | bonus | charges | Riposte |
| Épines | bonus | charges | Épines acérées |
| Immunité | bonus | aucun | Garde sacrée (sans porteur) ; l'Aura d'immunité se lit sur son anneau |
| Poison, Saignement, Brûlure, Pourriture | malus | charges ou tours | le statut du même nom |
| Tour perdu | malus | aucun | Peur, Étourdi |
| Brèche, Vulnérable, Luciole | malus | charges | le statut du même nom (sans porteur) |

**Lien avec l'aura** : essayé en 0.79.4 (un état donné par une aura portait son anneau tournoyant), restreint aux bonus en 0.79.6, retiré en 0.79.7. En cherchant à fondre ces bonus dans des états existants, on a constaté qu'aucun n'avait de vraie source hors aura sur le même personnage : ils ne doublaient pas un autre état, ils doublaient l'aura elle-même. Une aura sur son porteur se lit donc sur son anneau, et plus rien n'est à relier.

**Le signal d'activation** (`SkillSignal`, `SignalLayer`) : quand une compétence ou une aura pose un état visible, une lueur (verte pour un bonus, rouge pour un malus) part de son sceau dans l'en-tête et file vers la zone d'état de la cible. L'état n'y apparaît qu'à son arrivée (340 ms à ×1). Le vol est calé sur la chronologie : il part à l'étape de la compétence (`event`), ou à celle de l'aura qui agit (`statusTick`, `statusReaction`). Un statut bloqué ou un mécanisme de compétence n'envoie rien.

**Icônes** (0.79.2). Un état n'a pas la grammaire d'une compétence. La compétence garde son icône peinte, à la palette de son personnage, dans un sceau octogonal. L'état est un **emblème** : un symbole gravé sur une pièce, monochrome, commun à tous, posé tel quel sans cadre, le compteur dessus ([STYLE_BIBLE.md](STYLE_BIBLE.md) § 7, planche v12).

### Compétences en jeu (0.26.0)

Chaque race a trois compétences, une sur un **1** au dé, une sur un **2**, une sur un **3**. Ses variantes en héritent.

| Race | Sur un 1 | Sur un 2 | Sur un 3 (aura permanente) | Thème |
| --- | --- | --- | --- | --- |
| Orcs | Pourfendre (0.70.0 : le 1 frappe pour sa valeur et, s'il touche, pose Saignement 2 ; avant : Saignée sans coup, et Rage du sang, +5 PV) | 🌪️ Furie des vents (deux coups bruts tout de suite, sans compétence ni chaîne, 0.69.0) | 💪 Aura de puissance (+2 dégâts par charge, cumulable) | s'emporter, déferler, faire saigner |
| Elfes | 🎯 Œil de faucon (Critique assuré) | 💨 Esquive améliorée (esquive à coup sûr le prochain coup reçu, sans durée ; cumulable depuis le 2026-10-21, une charge par esquive) | 🦅 Aura de précision (+1 au multiplicateur de critique par charge, cumulable) | viser, se dérober |
| Nains | 🛡️ Peau de pierre (Armure temporaire +6) | 🌵 Épines acérées (permanentes, cumulables : chaque coup encaissé pose 1 charge de Saignement par charge sur l'attaquant, 0.68.0 ; avant : 1 dégât renvoyé par charge) | 😠 Aura d'intimidation (l'adversaire frappe 2 de moins par charge, cumulable) | tenir, punir l'attaquant |
| Humains | 😱 Peur (l'adversaire perd sa prochaine action) | Purification (retire le dernier bonus adverse, toutes charges, sinon 5 dégâts directs ; et son propre dernier malus, 0.69.0) | 🕊️ Aura de sainteté (+2 PV par charge en fin de tour, 3 charges au plus) | contrôler, tenir |
| Hommes-lézards | 🍀 Coup de chance (un d6 en plus à l'action suivante) | 🪙 Pile ou face (pièce lancée aussitôt, juste après le 2, depuis le 2026-10-21 : pile 10 dégâts qui touchent, 20 avant ; face rien) | 🧪 Aura de décoction (chaque coup empoisonne, cumulable) | parier, empoisonner |
| Ogre | Attente (sur 1, 2 et 3 : il ne frappe pas) | Attente | Attente | taper fort, sans compétence |
| Druide (homme, Incantation : d3, aucun coup) | Foudre (3 × 2 dégâts directs, événement de scène, 0.73.0 ; 5 avant la 0.76.0) | Feux follets (Brûlure 3, de retour en 0.73.0) | Aura sauvage (+2 par charge aux coups, cumulable, 0.73.0) | lancer des sorts ; avant la 0.73.0 : Fleur de vie, Écorce épaisse, Aura de sève, relais des formes |
| Druide (ours, Force de l'ours : +3 à chaque coup, +4 jusqu'à la 0.75.0) | coup (aucun sort) | coup | coup | frapper fort ; avant la 0.73.0 : Charge, Coup de griffe, Aura de rancune |
| Paladin | ⚖️ Rétribution (relâche ses 3 jauges de dégâts reçus, au moins 1) | ⚔️ Riposte (renvoie la moitié du prochain coup encaissé) | Aura d'immunité (purge ses malus, puis plus aucun malus et +1 d'armure, non cumulable) | rendre les coups |
| Morts-vivants | ☠️ Souffle de la tombe (Poison 3 : 3, 2 puis 1 PV) | 🦇 Vol de vie (deux charges, 0.45.0 : chaque coup qui touche en use une et rend les PV retirés ; une esquive en use une) | Aura glaciale (au début de son tour, 1 Poison par charge sur l'adversaire, cumulable, 0.69.0) | ronger, drainer |

**Auras (0.26.0)** : des bonus **permanents**, posés sur un 3 et sans durée, qui restent jusqu'à la fin du combat. Elles réutilisent les crochets existants, sans règle nouvelle dans le moteur. **Toutes les auras se cumulent** : chaque nouveau 3 ajoute une charge (+2 dégâts, −2 dégâts reçus, +1 au multiplicateur, ou 1 Poison de plus par tour). L'intimidation et la précision étaient plafonnées à une charge en 0.26.0, faute de consigne. Elles sont cumulables depuis la 0.28.0 : c'était le meilleur levier d'équilibrage des nains et des elfes (voir [EQUILIBRAGE.md](EQUILIBRAGE.md)), et la règle devient la même pour toutes les races. L'Aura glaciale agit au **début du tour de son porteur**, avant son coup : elle pose son Poison (0.69.0).

**Depuis la 0.27.0, aucun jet de 1, 2 ou 3 n'inflige de dégâts** : il déclenche seulement sa compétence (`forfeitsHit` sur les douze). Les compétences du 2 ont été données par l'utilisateur. Toutes, sauf Vol de vie, frappent normalement sur le 2 et préparent le tour suivant. **Vol de vie** sacrifie le coup du 2 (aucun dégât) pour gagner sa charge. Si un nouveau 2 tombe alors qu'une charge est déjà là, le coup est de nouveau sacrifié. La charge reste unique, et sa durée repart pour un tour.

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
| **Mécanisme** (`mechanic`, 2026-10-21 ; remplace `innate`) | Statut qui porte la règle d'une compétence (`skill` : jauges de Rétribution, Pile ou face, Furie des vents, Attente) ou d'une forme (`form` : Incantation, Force de l'ours, posés quand le personnage prend la forme, retirés quand il la quitte ; aucune compétence ne peut les poser, `validateRoster`). Ni bonus ni malus pour les règles : aucune purge ne l'enlève, aucune immunité, garde ni opposition ne le bloque, les statistiques ne le comptent pas comme bonus ou malus reçu (`isMechanic`). Le compendium le présente comme une mécanique de sa compétence. |
| **Polarité** | **Bonus** (positif, vert) ou **malus** (négatif, rouge). |
| **Charges** (`stacks`) | Intensité ou réserve : points de bouclier, PV de poison du prochain tour, nombre de critiques assurés… À 0, le statut disparaît. Un statut qui **s'estompe** (`decays`, le poison) perd une charge chaque fois qu'il agit : une seule valeur dit sa force et ce qu'il lui reste. |
| **Durée** (`turns`) | Nombre de tours du **porteur** avant expiration, décomptés au début (défaut) ou à la fin de ses tours (`expiresAt`), mais jamais à la fin du tour où le statut a été posé. Elle est facultative : sans durée, le statut dure jusqu'à épuisement de ses charges. |
| **Cumul** (`stacking`) | Ce qui se passe quand on pose un statut déjà présent. `add` : les charges s'additionnent et la durée garde la plus longue. `refresh` : la nouvelle application remplace l'ancienne. |
| **Plafond** (`maxStacks`) | Nombre maximal de charges. Un cumul au-delà est ramené au plafond. |
| **Compteur** (`counter`) | Le seul nombre affiché sur l'icône de l'état. Par défaut (`auto`), ce sont les tours restants si le statut a une durée, sinon ses charges. On peut imposer `stacks` ou `turns`. Son chiffre défile à chaque changement : c'est la marque visible d'une résolution. Aucune variation ne flotte depuis le compteur (2026-10-21). |
| **Compétence** (ou événement, `CharacterEvent` dans le code) | Capacité d'un personnage qui pose les statuts : *quand* (déclencheur) → *si* (conditions) → *quoi* (effets). |
| **Déclencheur** | Moment du combat : début du combat, début de tour, 1, 2 ou 3 au dé, critique, esquive, coup encaissé… (13 au total, voir [FEATURES.md](FEATURES.md#3-événements-et-statuts)). |
| **Aura** | Bonus permanent, sans durée, posé pour le reste du combat (les auras du 3). À ne pas confondre avec l'aura au sol, qui signale seulement la présence de bonus ou de malus. |
| **Coup sacrifié** (`forfeitsHit`) | Une compétence du dé qui annule le coup qui l'a déclenchée : aucun dégât, ni esquive ni critique (toutes les compétences du 1, du 2 et du 3 depuis la 0.27.0). |
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
| `hasStatus` | il porte un statut (avec au moins N charges) | « si l'adversaire est déjà empoisonné » |
| `lacksStatus` | il ne porte pas ce statut | « s'il n'a pas déjà de bouclier » |
| `fromTurn` | le tour en cours est au moins N | « à partir du tour 5 » |

Une condition fausse ne consomme pas de hasard : la `chance` d'un événement n'est tirée que si toutes ses conditions sont remplies.

---

## Catalogue (0.26.0)

| Statut | Polarité | Effet | Cumul | Plafond | En jeu |
| --- | --- | --- | --- | --- | --- |
| 🎯 Critique assuré | bonus | le prochain coup qui touche est critique (une charge par coup) | add | — | oui · elfes (Œil de faucon), sur soi |
| 🛡️ Armure temporaire | bonus | bouclier qui absorbe après l'armure, s'use d'autant | add | — | oui · nain (Peau de pierre, 6) ; druide (Écorce épaisse, 7) de la 0.50.0 à la 0.72.0 |
| 💚 Régénération | bonus | rend des PV au début de chaque tour du porteur | refresh | — | non · sans porteur depuis la 0.73.0 (Fleur de vie du druide, de la 0.42.0 à la 0.72.0) |
| ☠️ Poison | malus | au début de chaque tour du porteur, lui fait perdre autant de PV que de charges, en ignorant l'armure, puis perd une charge (`decays`, 0.36.4) : poison 3 = 3 + 2 + 1 PV | add | — | oui · morts-vivants (Souffle de la tombe), sur l'adversaire |
| Saignement (0.68.0) | malus | chaque coup qui touche le porteur lui fait perdre autant de PV que de charges, en ignorant l'armure, puis perd une charge (réaction `hurt`, `decays`) : saignement 2 = 2 + 1 PV, sur les deux prochains coups reçus. Le pendant du Poison, qui compte les coups au lieu des tours : une rafale vide la plaie d'un coup, une esquive ou une action perdue la laissent ouverte. **Une plaie ouverte pendant un coup ne coule pas sur ce coup : elle coule dès le coup suivant qui touche le porteur** (règle générale de tous les statuts, RESOLUTION § 5 règle 9, décision de l'utilisateur du 2026-10-21) ; grossie pendant un coup, elle y coule de ses charges du début du coup. On la voit, on l'attend. À l'écran, elle coule à l'impact, avec un badge « Saignement +N » sous le dé. **Malus physique** : un coup doit toucher pour le poser (Pourfendre, `needsTouch`, 0.70.0) | add | — | oui · orc (Pourfendre, sur un 1 qui touche) et nain (Épines acérées), sur l'adversaire |
| 🥀 Affaibli | malus | les coups du porteur infligent moins avant l'armure | refresh | — | à venir |
| 💔 Brèche | malus | armure du porteur réduite | add | 3 | à venir |
| 🔥 Brûlure | malus | perte de PV à la **fin** des tours du porteur ; une seule valeur (0.69.0) : posée sans durée, elle dure autant de tours que sa valeur (`turnsFromStacks` ; une durée en plus est refusée par `validateRoster`) | refresh | — | oui · druide homme (Feux follets, sur un 2, Brûlure 3), sur l'adversaire ; de retour en 0.73.0 (sans porteur de la 0.71.0 à la 0.72.0) |
| 🩸 Vulnérable | malus | +N dégâts reçus avant l'armure | add | 3 | à venir |
| 💫 Étourdi | malus | perd son action (une charge par tour perdu) | add | 1 | à venir |
| 🌵 Épines acérées | bonus | **chaque** coup encaissé pose sur l'attaquant 1 charge de Saignement par charge d'épines (réaction `hurt`, 0.68.0) ; permanentes depuis la 0.45.0. Posées pendant un coup (Collier de ronces, au passage du seuil), elles ne répondent pas à ce coup, mais dès le coup suivant (règle 9) Avant la 0.68.0 : 1 dégât direct renvoyé par charge (et 6 pendant 1 tour avant la 0.45.0) | add | — | oui · nains (sur un 2), sur soi |
| ✨ Garde sacrée | bonus | bloque les prochains malus (une charge par blocage) | add | — | à venir |
| 🦇 Vol de vie | bonus | chaque charge : le prochain coup qui touche (pile comprise) rend les PV qu'il retire, réaction de la fenêtre `hit` (`drainsHit`) ; esquivé, la charge est perdue ; un jet de compétence la laisse. Deux charges par Vol de vie (0.45.0) | add | 2 | oui · morts-vivants (sur un 2), sur soi |
| 🌪️ Furie des vents | mécanisme (`skill`) | instantanée (`instantStrikes`, 0.50.0, demande de l'utilisateur) : deux coups juste après le coup qui l'a posée, dans la même action, chacun résolu à part (`extraStrikes: 2`). Depuis la 0.69.0, coups bruts (`Attack.plain`) : le dé ne donne que leur valeur, sans compétence ni relique de face (2026-10-21), donc sans Furie en chaîne. Sans durée ; jamais purgée ni bloquée | add | — | oui · orcs (sur un 2), sur soi |
| 💨 Esquive améliorée | bonus | le prochain coup reçu est esquivé, sans tirage (`forcesDodge`) ; une charge par esquive. Cumulable depuis le 2026-10-21 (demande de l'utilisateur) : chaque charge esquive un coup de plus ; avant, `refresh` plafonné à 1 | add | — | oui · elfes (Esquive améliorée), sur soi ; relique Dé creux |
| Aura glaciale (`frostAura`, ex-Aura de poison) | bonus | au début de chaque tour du porteur, avant son coup, pose 1 charge de **vrai Poison** par charge sur l'adversaire (`onTurnStart`, 0.69.0) ; permanente. Une charge fige le poison à sa valeur, deux le font grossir ; l'immunité le bloque, la Régénération l'annule, une purge l'enlève. Avant la 0.69.0 : 1 dégât direct par charge au début du tour adverse | add | — | oui · morts-vivants (sur un 3), sur soi |
| 💪 Aura de puissance | bonus | +2 dégâts par charge sur chaque coup, avant l'armure (`modifyOutgoing`) ; permanente | add | — | oui · orcs (sur un 3), sur soi |
| 😠 Aura d'intimidation | bonus | les coups de l'adversaire font 2 de moins par charge, avant l'armure (`modifyIncoming`) ; permanente | add | — | oui · nains (sur un 3), sur soi |
| 🦅 Aura de précision | bonus | +1 au multiplicateur de critique par charge (`modifyStats`) ; permanente | add | — | oui · elfes (sur un 3), sur soi |
| 😱 Peur | malus | perd sa prochaine action (`skipsAction`), puis disparaît ; le porteur tremble (`look.motion`) | add | 1 | oui · humains (sur un 1), sur l'adversaire |
| 🕊️ Aura de sainteté | bonus | +2 PV par charge à la fin de chaque tour du porteur (`onTurnEnd`) ; permanente | add | 3 (0.42.0) | oui · humains (sur un 3), sur soi |
| 🧪 Aura de décoction | bonus | chaque coup qui touche pose 2 charges de poison par charge d'aura (`reactions.hit`, `DECOCTION_POISON`, 0.36.4) ; permanente | add | — | oui · hommes-lézards (sur un 3), sur soi |
| 🪙 Pile ou face | mécanisme (`skill`) | la pièce part aussitôt, juste après le coup pendant lequel le statut est posé (2026-10-21, demande de l'utilisateur ; avant, elle remplaçait le dé de l'action suivante) : pile, 10 dégâts directs (`COIN_HEADS` ; 20 de la 0.42.0 au 2026-10-21, ramenés à 10 en compensation, choix de l'utilisateur) qui comptent comme un coup qui touche (`headsTouches`, 0.42.0 : Vol de vie, Riposte, jauges, Épines, Saignement, décoction réagissent) ; face, rien (`coinToss`) | refresh | 1 | oui · hommes-lézards (sur un 2), sur soi |
| ⚖️ Rétribution | mécanisme (`skill`) | 3 jauges : les PV retirés par les 3 derniers coups qui touchent le porteur, pile qui touche comprise (`fillsOnHurt`, `slots`, réaction de sa fenêtre `hurt`) ; relâchées par l'effet `release` ; affiche leur somme ; jamais purgées | refresh | — | oui · paladin, sur soi |
| Attente | mécanisme (`skill`) | l'ogre a fait 1, 2 ou 3 : il n'a pas frappé ; retombe au début de son tour suivant (`expiresAt: 'turnStart'`) | refresh | 1 | oui · ogre (sur 1, 2, 3), sur soi |
| Luciole | malus | esquive à 0 (`modifyStats`), +2 dégâts reçus par coup (`modifyIncoming`) ; une charge part à chaque coup encaissé (`spentOnHurt`) | add | — | non (remplacée par les Feux follets en 0.50.0) |
| Aura de pourriture | bonus, aura | chaque coup qui touche pose ses charges de Pourriture sur la cible (`reactions.hit`) ; permanente | add | — | non · sans porteur depuis la 0.71.0 (druide ours, sur un 3, avant) |
| Pourriture | malus | 1 dégât direct par charge au début de chaque tour du porteur ; sans durée, seule une purge l'enlève | add | — | non · posée par l'Aura de pourriture, sans porteur depuis la 0.71.0 |
| Rancune (`grudge`, 0.71.0) | bonus | le prochain coup du porteur qui touche faisait +valeur avant l'armure, puis était dépensée | refresh | — | non · retirée en 0.73.0 (relais des formes du druide) |
| Sève (`sap`, 0.71.0) | bonus | soignait sa valeur au début du prochain tour du porteur | refresh | — | non · retirée en 0.73.0 (relais des formes du druide) |
| Aura de sève (`sapAura`, 0.71.0) | bonus, aura | +2 à chaque Sève gagnée, par charge | add | — | non · retirée en 0.73.0 |
| Aura de rancune (`grudgeAura`, 0.71.0) | bonus, aura | +2 à chaque Rancune gagnée, par charge | add | — | non · retirée en 0.73.0 |
| Incantation (`casting`, 0.73.0) | bonus, statut de forme | le dé du porteur devient un d3 (`modifyStats`) : chaque jet lance un sort, jamais de coup ; médaillon « d3 », sans nombre | refresh | 1 | oui · druide, forme humaine (statut de forme) |
| Force de l'ours (`bearMight`, 0.73.0) | bonus, statut de forme | chaque coup fait +3 avant l'armure (`modifyOutgoing`, `BEAR_MIGHT` ; +4 jusqu'à la 0.75.0), un 1, un 2 ou un 3 compris ; sans nombre | refresh | 1 | oui · druide, forme d'ours (statut de forme) |
| Aura sauvage (`wildAura`, 0.73.0) | bonus, aura | +2 par charge à chaque coup du porteur, avant l'armure (`modifyOutgoing`) : posée par l'homme, elle sert l'ours ; permanente | add | — | oui · druide homme (sur un 3), sur soi |
| ⚔️ Riposte | bonus | chaque charge : le prochain coup qui touche le porteur lui renvoie 50 % des PV retirés (`reflectsHit`) ; sans durée. Deux charges par Riposte (0.50.0) | add | 2 | oui · paladin (sur un 2), sur soi |
| Aura d'immunité | bonus | aucun malus ne peut être posé sur le porteur, sans s'user (`immune`), et son armure gagne 1 (`modifyStats`, 0.42.0) ; permanente | refresh | 1 | oui · paladin (sur un 3), sur soi |
| Sifflotement | bonus | +2 PV à chaque fin de tour du porteur, puis une charge de moins (`decays`, `onTurnEnd`) : une charge par tour | add | — | oui · barde (Siffloter, double 1, 3 charges ; le double frappe aussi ses deux coups depuis la 0.46.0), sur soi |
| Fausse note | malus | le prochain coup du porteur qui touche fait 5 dégâts de moins par charge, retirés après l'armure (`modifyFinal`, au moins 1), puis disparaît (`spentOnHit`) ; esquivé ou sacrifié, elle reste. La barde en pose 2 charges (0.45.0) | add | — | oui · barde (Fausse note, double 2 ; il frappe aussi ses deux coups depuis la 0.46.0), sur l'adversaire |
| Aura mélodieuse | bonus, aura | +1 dégât par charge sur chaque coup qui touche, ajouté après l'armure et les boucliers (`modifyFinal`) : rien ne le réduit ; permanente | add | — | oui · barde (Ouverture au début du combat : 1 charge ; double 3 : 2 charges depuis la 0.45.0), sur soi |
| 🍀 Coup de chance | bonus | à la prochaine action, un d6 de plus par charge, chacun joué comme un coup à part (`extraStrikes`, `extraDie: 6`, `strikeCharges: 'all'`) ; cumulable depuis la 0.50.0 (demande de l'utilisateur) | add | — | oui · hommes-lézards (sur un 1), sur soi |

Régénération et Poison s'opposent. Vulnérable, Étourdi et Garde sacrée illustrent chacun une mécanique de résolution (voir [RESOLUTION.md](RESOLUTION.md#8-statuts-qui-illustrent-chaque-mécanique-à-venir)) ; ils n'ont pas encore d'icône peinte, à produire avant attribution. La Brûlure (Feux follets) a la sienne depuis la planche v9, l'Incantation et la Force de l'ours aussi ; le Saignement depuis la v8. Toutes les icônes en attente, tous chantiers confondus : STYLE_BIBLE § 7, « Icônes à générer ».

---

## Règles de design

1. **Un statut est entièrement décrit dans son registre** (`STATUSES`) : règle et présentation. L'interface, le journal, le compendium et les statistiques suivent sans code dédié.
2. **Lisible en un coup d'œil** : chaque statut a une **icône peinte** claire (`STATUS_ICON`) et affiche **un seul nombre** dans la zone d'état. Le nom et le détail sont au survol, et dans le compendium.
3. **Bornes du moteur** : aucun statut ne peut faire descendre un coup sous 1 dégât, l'armure sous 0, ni une chance hors de 0 à 100 %. Les PV max ne changent jamais.
4. **Les dégâts directs sont puissants** : poison et dégâts d'effet ignorent armure, esquive et boucliers. Un réglage de 2 → 3 PV par tour a fait passer Ervald de 50 à 62 % de victoires (voir [PERSONNAGES.md](PERSONNAGES.md#morts-vivants--affliger)). Il faut les doser prudemment.
5. **Cumuls infinis interdits pour les malus de stats** : un malus qui modifie une caractéristique doit avoir un plafond (Brèche : 3), sinon un combat long finit par annuler la stat.
6. **Équilibre** : tout statut attribué à un personnage passe par la mesure (`npm run balance`, entre 42 et 58 %, aucun duel au-delà de 65/35, méthode dans [EQUILIBRAGE.md](EQUILIBRAGE.md)) et la mise à jour de la matrice dans `PERSONNAGES.md`.
7. **Qui subit est toujours dit** (2026-10-21, retour de l'utilisateur sur le Souffle de la tombe). Le texte d'un statut (`describe`) parle de son porteur sans le nommer (« Perd 3 PV au début de son prochain tour ») : juste dans sa propre zone d'état, ambigu dans l'infobulle de la compétence qui le pose. `describeSkill` préfixe donc tout statut posé sur l'adversaire par « Sur l'adversaire : », et tout autre effet sur l'adversaire le nomme (« à l'adversaire »). Un test (`modules.test.ts`) refuse une compétence dont un effet sur l'adversaire ne le nomme pas. Un `describe` commence par un verbe ou un nom, jamais par un participe suivi de deux-points (« Terrifié : … » devenait « Sur l'adversaire : terrifié : … »).

### Ajouter un statut : check-list

- [ ] Rappel visuel sur le porteur (`look`) : liseré (`glow`) pour un effet temporaire, halo qui pulse (`aura`) pour une aura permanente, transparence (`opacity`) pour l'esquive. Au K.O., l'aura du vaincu s'éteint en fondu (halo, cercle, particules et contour de la silhouette ; `Fighter.tsx`, `.char-aura-out`) : rien à faire pour un nouveau statut.
- [ ] Rôle en une phrase (`summary`), polarité, **icône peinte obligatoire** dans `Icon.tsx` → `STATUS_ICON` (voir STYLE_BIBLE § 7 ; jamais d'emoji : la demander à l'utilisateur), compteur affiché (`counter`).
- [ ] Règle de cumul, plafond si c'est un malus de stat.
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
- [ ] **Nouveaux crochets éventuels** : `onExpire` (effet à l'expiration, effet différé), action sur le dé (relance), provocation… Chacun demande une étape du moteur et ses tests (voir RESOLUTION.md). Arrivés en 0.25.0 : vol de vie (`drainsHit`), coups multiples (`extraStrikes`), esquive imposée (`forcesDodge`), réaction unique (`spentOnReaction`), coup sacrifié (`forfeitsHit`, sur la compétence).
- [ ] **Lisibilité** : la zone d'état tient environ 4 médaillons de chaque côté au-dessus d'un combattant. Au-delà, faut-il les regrouper ou réduire leur taille ?
- [ ] **Compteur** : valider, statut par statut, que le nombre affiché est le bon. Par défaut, c'est la durée si elle existe. Le poison n'a plus qu'une valeur depuis la 0.36.4 (demande de l'utilisateur : la valeur des dégâts et le nombre de tours affichés à part étaient confus).
