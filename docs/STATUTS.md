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
- Le compendium suit cette séparation (0.21.0) : la verticale **Compétences** présente chaque compétence, son auteur et ses effets ; la verticale **Bonus et malus** présente les statuts seuls. Une compétence sans statut (la Rage du sang, un soin immédiat) n'apparaît donc que dans Compétences.
- Le **moment** où un statut est résolu est fixé par le statut lui-même, jamais par la compétence : voir [RESOLUTION.md](RESOLUTION.md#qui-fixe-le-moment-dune-résolution).

### Compétences en jeu (0.26.0)

Chaque race a trois compétences, une sur un **1** au dé, une sur un **2**, une sur un **3**. Ses variantes en héritent.

| Race | Sur un 1 | Sur un 2 | Sur un 3 (aura permanente) | Thème |
| --- | --- | --- | --- | --- |
| Orcs | Rage du sang (+3 PV, immédiat) | 🌪️ Furie des vents (deux coups à l'action suivante) | 💪 Aura de puissance (+2 dégâts par charge, cumulable) | s'emporter, déferler |
| Elfes | 🎯 Œil de faucon (Critique assuré) | 💨 Esquive améliorée (esquive à coup sûr le prochain coup reçu, sans durée) | 🦅 Aura de précision (+1 au multiplicateur de critique par charge, cumulable) | viser, se dérober |
| Nains | 🛡️ Peau de pierre (Armure temporaire +6) | 🌵 Épines (6 dégâts renvoyés à chaque coup encaissé pendant le tour adverse, deux fois contre une Furie) | 😠 Aura d'intimidation (l'adversaire frappe 2 de moins par charge, cumulable) | tenir, punir l'attaquant |
| Humains | 😱 Peur (l'adversaire perd sa prochaine action) | Purification (retire le dernier bonus adverse, toutes charges ; sinon 5 dégâts directs) | 🕊️ Aura de sainteté (+2 PV par charge en fin de tour, 3 charges au plus) | contrôler, tenir |
| Hommes-lézards | 🍀 Coup de chance (un d6 en plus à l'action suivante) | 🪙 Pile ou face (pièce : pile 20 dégâts qui touchent, face rien) | 🧪 Aura de décoction (chaque coup empoisonne, cumulable) | parier, empoisonner |
| Ogre | Attente (sur 1, 2 et 3 : il ne frappe pas) | Attente | Attente | taper fort, sans compétence |
| Druide (homme) | Fleur de vie (Régénération 2 pendant 3 tours) | Écorce épaisse (bouclier de 5, cumulable) | Luciole (malus : plus d'esquive, +2 dégâts reçus) | soigner, protéger |
| Druide (ours) | Charge (coup au maximum du dé, sans critique) | Coup de griffe (relance + 3) | Aura de pourriture (Pourriture permanente) | charger, pourrir |
| Paladin | ⚖️ Rétribution (relâche ses 3 jauges de dégâts reçus, au moins 1) | ⚔️ Riposte (renvoie la moitié du prochain coup encaissé) | Aura d'immunité (purge ses malus, puis plus aucun malus et +1 d'armure, non cumulable) | rendre les coups |
| Morts-vivants | ☠️ Souffle de la tombe (Poison 3 : 3, 2 puis 1 PV) | 🦇 Vol de vie (le prochain coup porté rend les PV retirés ; perdu s'il est esquivé, gardé sur un jet de 1 à 3) | ☣️ Aura de poison (1 dégât direct par charge à l'adversaire au début de son tour, cumulable) | ronger, drainer |

**Auras (0.26.0)** : des bonus **permanents**, posés sur un 3 et sans durée, qui restent jusqu'à la fin du combat. Elles réutilisent les crochets existants, sans règle nouvelle dans le moteur. **Toutes les auras se cumulent** : chaque nouveau 3 ajoute une charge (+2 dégâts, −2 dégâts reçus, +1 au multiplicateur, ou 1 PV de plus par tour). L'intimidation et la précision étaient plafonnées à une charge en 0.26.0, faute de consigne. Elles sont cumulables depuis la 0.28.0 : c'était le meilleur levier d'équilibrage des nains et des elfes (voir [EQUILIBRAGE.md](EQUILIBRAGE.md)), et la règle devient la même pour toutes les races. L'Aura de poison frappe au **début du tour de son porteur**, avant son coup.

**Depuis la 0.27.0, aucun jet de 1, 2 ou 3 n'inflige de dégâts** : il déclenche seulement sa compétence (`forfeitsHit` sur les douze). Les compétences du 2 ont été données par l'utilisateur. Toutes, sauf Vol de vie, frappent normalement sur le 2 et préparent le tour suivant. **Vol de vie** sacrifie le coup du 2 (aucun dégât) pour gagner sa charge. Si un nouveau 2 tombe alors qu'une charge est déjà là, le coup est de nouveau sacrifié. La charge reste unique, et sa durée repart pour un tour.

### Palettes de race (pistes pour la suite)

| Race | Statuts déjà en jeu | Pistes |
| --- | --- | --- |
| Orcs | Furie des vents, Aura de puissance | Brèche, Étourdi |
| Elfes | Critique assuré, Esquive améliorée, Aura de précision | Vulnérable |
| Nains | Armure temporaire, Épines, Aura d'intimidation | — |
| Morts-vivants | Poison, Vol de vie, Aura de poison | Affaibli |

Un statut peut ponctuellement être emprunté par une autre race, mais il garde une race « maison ». Brûlure et Garde sacrée attendent une future race. La Régénération est entrée en jeu en 0.41.0, posée par la Fleur de vie du druide.

---

## Vocabulaire

| Terme | Sens |
| --- | --- |
| **Statut** | Effet durable porté par un combattant. Il s'affiche dans la zone d'état, au-dessus de lui (icône et nombre), et en aura au sol. |
| **Polarité** | **Bonus** (positif, vert) ou **malus** (négatif, rouge). |
| **Charges** (`stacks`) | Intensité ou réserve : points de bouclier, PV de poison du prochain tour, nombre de critiques assurés… À 0, le statut disparaît. Un statut qui **s'estompe** (`decays`, le poison) perd une charge chaque fois qu'il agit : une seule valeur dit sa force et ce qu'il lui reste. |
| **Durée** (`turns`) | Nombre de tours du **porteur** avant expiration, décomptés au début (défaut) ou à la fin de ses tours (`expiresAt`), mais jamais à la fin du tour où le statut a été posé. Elle est facultative : sans durée, le statut dure jusqu'à épuisement de ses charges. |
| **Cumul** (`stacking`) | Ce qui se passe quand on pose un statut déjà présent. `add` : les charges s'additionnent et la durée garde la plus longue. `refresh` : la nouvelle application remplace l'ancienne. |
| **Plafond** (`maxStacks`) | Nombre maximal de charges. Un cumul au-delà est ramené au plafond. |
| **Compteur** (`counter`) | Le seul nombre affiché sur l'icône de l'état. Par défaut (`auto`), ce sont les tours restants si le statut a une durée, sinon ses charges. On peut imposer `stacks` ou `turns`. Il rebondit, avec sa variation, à chaque changement : c'est la marque visible d'une résolution. |
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

Exemple : une Furie des vents de durée 1 tient jusqu'à l'action suivante du porteur, puis expire. Le poison n'a pas de durée depuis la 0.36.4 : il s'estompe (3, 2, 1, puis il disparaît).

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
| 🛡️ Armure temporaire | bonus | bouclier qui absorbe après l'armure, s'use d'autant | add | — | oui · nains (Peau de pierre), sur soi |
| 💚 Régénération | bonus | rend des PV au début de chaque tour du porteur | refresh | — | oui · druide (Fleur de vie, sur un 1, forme humaine), sur soi |
| ☠️ Poison | malus | au début de chaque tour du porteur, lui fait perdre autant de PV que de charges, en ignorant l'armure, puis perd une charge (`decays`, 0.36.4) : poison 3 = 3 + 2 + 1 PV | add | — | oui · morts-vivants (Souffle de la tombe), sur l'adversaire |
| 🥀 Affaibli | malus | les coups du porteur infligent moins avant l'armure | refresh | — | à venir |
| 💔 Brèche | malus | armure du porteur réduite | add | 3 | à venir |
| 🔥 Brûlure | malus | perte de PV à la **fin** des tours du porteur ; durée décomptée en fin de tour | refresh | — | à venir |
| 🩸 Vulnérable | malus | +N dégâts reçus avant l'armure | add | 3 | à venir |
| 💫 Étourdi | malus | perd son action (une charge par tour perdu) | add | 1 | à venir |
| 🌵 Épines | bonus | **chaque** coup encaissé renvoie N dégâts directs à l'attaquant, tant que le statut dure (une seule fois de la 0.25.0 à la 0.28.0) ; affiche N | refresh | — | oui · nains (Épines, 6 pendant 1 tour), sur soi |
| ✨ Garde sacrée | bonus | bloque les prochains malus (une charge par blocage) | add | — | à venir |
| 🦇 Vol de vie | bonus | le prochain coup porté rend les PV qu'il retire (`drainsHit`) ; esquivé, la charge est perdue ; un jet de compétence la laisse ; sans durée | refresh | 1 | oui · morts-vivants (Vol de vie), sur soi |
| 🌪️ Furie des vents | bonus | deux coups à la prochaine action, chacun résolu à part (`extraStrikes`) ; décomptée en fin de tour | refresh | 1 | oui · orcs (Furie des vents, 1 tour), sur soi |
| 💨 Esquive améliorée | bonus | le prochain coup reçu est esquivé, sans tirage (`forcesDodge`) | refresh | 1 | oui · elfes (Esquive améliorée, 1 tour), sur soi |
| ☣️ Aura de poison | bonus | au début de chaque tour du porteur, l'adversaire perd 1 PV par charge (dégâts directs) ; permanente | add | — | oui · morts-vivants (sur un 3), sur soi |
| 💪 Aura de puissance | bonus | +2 dégâts par charge sur chaque coup, avant l'armure (`modifyOutgoing`) ; permanente | add | — | oui · orcs (sur un 3), sur soi |
| 😠 Aura d'intimidation | bonus | les coups de l'adversaire font 2 de moins par charge, avant l'armure (`modifyIncoming`) ; permanente | add | — | oui · nains (sur un 3), sur soi |
| 🦅 Aura de précision | bonus | +1 au multiplicateur de critique par charge (`modifyStats`) ; permanente | add | — | oui · elfes (sur un 3), sur soi |
| 😱 Peur | malus | perd sa prochaine action (`skipsAction`), puis disparaît ; le porteur tremble (`look.motion`) | add | 1 | oui · humains (sur un 1), sur l'adversaire |
| 🕊️ Aura de sainteté | bonus | +2 PV par charge à la fin de chaque tour du porteur (`onTurnEnd`) ; permanente | add | 3 (0.41.0) | oui · humains (sur un 3), sur soi |
| 🧪 Aura de décoction | bonus | chaque coup qui touche pose 2 charges de poison par charge d'aura (`reactions.hit`, `DECOCTION_POISON`, 0.36.4) ; permanente | add | — | oui · hommes-lézards (sur un 3), sur soi |
| 🪙 Pile ou face | bonus | à la prochaine action, une pièce remplace le dé : pile, 20 dégâts directs qui comptent comme un coup qui touche (`headsTouches`, 0.41.0) ; face, rien (`coinToss`) | refresh | 1 | oui · hommes-lézards (sur un 2), sur soi |
| ⚖️ Rétribution | bonus | 3 jauges : les PV retirés par les 3 derniers coups reçus (`fillsOnHurt`, `slots`) ; relâchées par l'effet `release` ; affiche leur somme | refresh | — | oui · paladin, sur soi |
| Attente | malus | l'ogre a fait 1, 2 ou 3 : il n'a pas frappé ; retombe au début de son tour suivant (`expiresAt: 'turnStart'`) | refresh | 1 | oui · ogre (sur 1, 2, 3), sur soi |
| Écorce épaisse | bonus | bouclier (`shield`) : absorbe des dégâts après l'armure | add | — | oui · druide humain (sur un 2), sur soi |
| Luciole | malus | esquive à 0 (`modifyStats`), +2 dégâts reçus par coup (`modifyIncoming`) ; une charge part à chaque coup encaissé (`spentOnHurt`) | add | — | oui · druide humain (sur un 3), 3 charges sur l'adversaire |
| Aura de pourriture | bonus, aura | chaque coup qui touche pose ses charges de Pourriture sur la cible (`reactions.hit`) ; permanente | add | — | oui · druide ours (sur un 3), sur soi |
| Pourriture | malus | 1 dégât direct par charge au début de chaque tour du porteur ; sans durée, seule une purge l'enlève | add | — | oui · posée par l'Aura de pourriture |
| ⚔️ Riposte | bonus | le prochain coup qui touche le porteur lui renvoie 50 % des PV retirés (`reflectsHit`) ; sans durée, gardée sur un jet adverse de 1 à 3 (0.32.0) | refresh | 1 | oui · paladin (sur un 2), sur soi |
| Aura d'immunité | bonus | aucun malus ne peut être posé sur le porteur, sans s'user (`immune`), et son armure gagne 1 (`modifyStats`, 0.41.0) ; permanente | refresh | 1 | oui · paladin (sur un 3), sur soi |
| 🍀 Coup de chance | bonus | à la prochaine action, un d6 en plus, coup à part (`extraStrikes` + `extraDie`) | refresh | 1 | oui · hommes-lézards (sur un 1), sur soi |

Régénération et Poison s'opposent. Brûlure, Vulnérable, Étourdi et Garde sacrée illustrent chacun une mécanique de résolution (voir [RESOLUTION.md](RESOLUTION.md#8-statuts-qui-illustrent-chaque-mécanique-à-venir)). Ils n'ont pas encore d'icône peinte : à produire avant attribution. Épines, Vol de vie, Furie des vents, Esquive améliorée et les quatre auras ont leur icône peinte (planche v2, STYLE_BIBLE § 7).

---

## Règles de design

1. **Un statut est entièrement décrit dans son registre** (`STATUSES`) : règle et présentation. L'interface, le journal, le compendium et les statistiques suivent sans code dédié.
2. **Lisible en un coup d'œil** : chaque statut a une **icône peinte** claire (`STATUS_ICON`) et affiche **un seul nombre** dans la zone d'état. Le nom et le détail sont au survol, et dans le compendium.
3. **Bornes du moteur** : aucun statut ne peut faire descendre un coup sous 1 dégât, l'armure sous 0, ni une chance hors de 0 à 100 %. Les PV max ne changent jamais.
4. **Les dégâts directs sont puissants** : poison et dégâts d'effet ignorent armure, esquive et boucliers. Un réglage de 2 → 3 PV par tour a fait passer Ervald de 50 à 62 % de victoires (voir [PERSONNAGES.md](PERSONNAGES.md#morts-vivants--affliger)). Il faut les doser prudemment.
5. **Cumuls infinis interdits pour les malus de stats** : un malus qui modifie une caractéristique doit avoir un plafond (Brèche : 3), sinon un combat long finit par annuler la stat.
6. **Équilibre** : tout statut attribué à un personnage passe par la mesure (`npm run balance`, entre 42 et 58 %, aucun duel au-delà de 65/35, méthode dans [EQUILIBRAGE.md](EQUILIBRAGE.md)) et la mise à jour de la matrice dans `PERSONNAGES.md`.

### Ajouter un statut : check-list

- [ ] Rappel visuel sur le porteur (`look`) : liseré (`glow`) pour un effet temporaire, halo qui pulse (`aura`) pour une aura permanente, transparence (`opacity`) pour l'esquive.
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
