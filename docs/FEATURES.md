# Fonctionnalités

Chaque section donne les règles actuelles, puis l'historique de la fonctionnalité (version → changement). Le détail de chaque version se trouve dans le [CHANGELOG](../CHANGELOG.md).

---

## 1. Combat

**Règles actuelles**

- **Initiative** : chaque combattant lance 1d10, le plus haut frappe en premier (on relance en cas d'égalité). Ensuite, les deux frappent chacun à leur tour.
- **Un tour = trois phases** pour le joueur actif (l'attaquant) : **début de tour** (ses statuts périodiques agissent, bonus puis malus, et leurs durées diminuent), **action** (l'attaque, deux coups sous Furie des vents, ou un tour perdu s'il est Étourdi), **fin de tour** (effets de fin de tour, comme la Brûlure, et durées « fin »). Les règles complètes de résolution (fenêtres, ordre, application, opposition, interactions) sont dans [RESOLUTION.md](RESOLUTION.md).
- **Attaque**, dans cet ordre (les stats utilisées sont les stats *effectives*, modifiées par les statuts) :
  1. L'attaquant lance son **dé de dégâts** (1d8 à 1d10 selon le personnage). Le dé reste affiché même si le coup est esquivé. Si ce jet déclenche une compétence (**1, 2 ou 3**, depuis la 0.27.0), le coup s'arrête là, sans dégât : ces chiffres servent seulement à déclencher la compétence.
  2. Le défenseur tente d'**esquiver** (sa chance d'esquive), sauf s'il porte une esquive imposée (Esquive améliorée), qui réussit sans tirage. S'il esquive, le coup ne fait aucun dégât.
  3. **Critique** (sa chance de critique, ou forcé par un statut) : le jet est multiplié par son multiplicateur (×2 à ×2,5), arrondi.
  4. Les **modificateurs de dégâts** s'appliquent : sortants, de l'attaquant (ex. Affaibli), puis entrants, du défenseur (ex. Vulnérable). Le coup garde au moins 1.
  5. L'**armure** du défenseur retire des points, mais le coup fait toujours au moins 1.
  6. Les **boucliers** du défenseur (ex. armure temporaire) absorbent ensuite des points, sans faire descendre le coup sous 1, et s'usent d'autant.
  7. **Vol de vie** : si l'attaquant porte Vol de vie, le coup porté consomme la charge. S'il a touché, il regagne les dégâts du coup ; esquivé, il ne regagne rien.
- **Dégâts comptés en entier (overkill, depuis la 0.34.0)** : un coup fatal ou des dégâts directs comptent tout leur montant dans les statistiques, la trace et l'historique, même au-delà des PV restants. Les PV, eux, s'arrêtent à 0.
- **Événements** du coup : voir la section 3.
- **Fin** : le premier à 0 PV perd, que ce soit à cause d'un coup, d'un effet ou d'un statut. Plus rien ne se déclenche après un K.O. Une limite de sécurité arrête le combat à 1 000 tours ; il est alors gagné aux PV.
- **Jouer ou simuler** : les deux options appellent le même moteur. « Jouer » anime le résultat calculé à l'avance, « Simuler » l'affiche directement à l'écran de fin.
- **Reproductible** : avec une même graine de hasard, un combat se rejoue à l'identique (utilisé par les tests).

**Historique**

| Version | Changement |
| --- | --- |
| 0.1.0 | 50 PV pour tous, dégâts de 1 à 10 (1d10), initiative, journal |
| 0.3.0 | Esquive et critique (×2) ; personnages modélisés par une classe `Character` |
| 0.4.0 | Stats propres à chaque race (PV, dé, armure, esquive, critique, multiplicateur) |
| 0.6.0 | Moteur pur `simulateCombat` : le mode joué ne fait plus que rejouer un script |
| 0.9.0 | Événements et armure temporaire intégrés à l'attaque |
| 0.13.0 | Moteur refondu en phases et en chronologie, hasard injectable, stats effectives, K.O. possible hors des coups. Mêmes résultats qu'avant, jet pour jet |
| 0.20.0 | Tour en trois phases (début, action, fin), dégâts entrants dans la chaîne de calcul, règles de résolution formalisées dans `RESOLUTION.md`. Mêmes résultats qu'avant, jet pour jet |
| 0.25.0 | Coup sacrifié, esquive imposée, vol de vie dans la chaîne d'attaque ; action à plusieurs coups (Furie des vents) |
| 0.27.0 | Les jets de 1, 2 et 3 n'infligent plus de dégâts : ils déclenchent seulement la compétence du chiffre |

## 2. Personnages et roster

**Règles actuelles**

Six races, chacune avec un archétype de base et une variante de coloris aux stats légèrement différentes (douze personnages depuis la 0.30.0).

| Personnage | Race · archétype | PV | Dé | Armure | Esquive | Critique | Multiplicateur |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gorak | Orc · Brute | 61 | d10 | 0 | 5 % | 10 % | ×2 |
| Murzug | Orc · Berserker | 57 | d10 | 0 | 5 % | 18 % | ×2 |
| Elaria | Elfe · Rôdeuse | 48 | d8 | 0 | 33 % | 22 % | ×2 |
| Sylwen | Elfe · Sentinelle sylvestre | 50 | d8 | 0 | 26 % | 17 % | ×2,4 |
| Brokk | Nain · Gardien | 68 | d8 | 0 | 6 % | 8 % | ×2,5 |
| Grimbald | Nain · Briseur de fer | 57 | d10 | 0 | 6 % | 10 % | ×2,5 |
| Ervald | Mort-vivant · Chevalier liche | 58 | d8 | 1 | 8 % | 12 % | ×2 |
| Caldrec | Mort-vivant · Faucheur d'âmes | 56 | d10 | 0 | 8 % | 16 % | ×2 |
| Ysolde | Humain · Prêtresse solaire | 52 | d7 | 0 | 8 % | 10 % | ×2 |
| Bérengère | Humain · Inquisitrice | 50 | d7 | 0 | 8 % | 16 % | ×2 |
| Naraxes | Homme-lézard · Voleuse | 50 | d10 | 0 | 20 % | 14 % | ×2 |
| Ssythra | Homme-lézard · Assassine | 48 | d10 | 0 | 16 % | 20 % | ×2,3 |
| Aldric | Humain · Paladin | 60 | d8 | 0 | 5 % | 12 % | ×2,5 |
| Gauvain | Humain · Croisé | 54 | d8 | 0 | 10 % | 17 % | ×2,5 |
| Morgrut | Ogre · Cogneur | 63 | d14 | 0 | 0 % | 0 % | ×2 |
| Gnashka | Ogre · Ogre des cavernes | 70 | d12 | 0 | 0 % | 10 % | ×2 |
| Thaldrin | Sylvain · Druide | 56 | d10 | 0 | 8 % | 10 % | ×2 |
| Brannoc | Sylvain · Druide d'automne | 52 | d10 | 0 | 12 % | 14 % | ×2 |

Une variante est définie à partir de son original (`variant()`), avec des écarts de stats et un filtre de couleur sur la même image.

Chaque personnage a une fiche courte affichée sur son écran : accroche, background, forces et faiblesses. Sa philosophie et les décisions de design qui le concernent sont dans [PERSONNAGES.md](PERSONNAGES.md).

**Historique**

| Version | Changement |
| --- | --- |
| 0.1.0 | Deux combattants à partir de l'image de l'orc, l'un retourné |
| 0.4.0 | Ajout de l'elfe et du nain, archétypes de race, une variante de coloris par personnage, sélection libre |
| 0.13.0 | Personnages instanciés une seule fois (`CHARACTERS`), données vérifiées par `validateRoster` |
| 0.14.0 | Fiche de personnage (accroche, background, forces, faiblesses) et document de design `PERSONNAGES.md` |
| 0.17.0 | Nouvelle race, le mort-vivant : Ervald et sa variante Caldrec ; sélection rangée par famille (une colonne par race) |
| 0.24.1 | Nains sans armure passive (Brokk 2, Grimbald 1), compensée en PV : Brokk 72, Grimbald 59 |
| 0.25.0 | Une seconde compétence par race, sur un 2 au dé ; PV réglés : Brokk 74, Grimbald 63, Ervald 60, Caldrec 58 |
| 0.26.0 | Une aura permanente par race, sur un 3 au dé ; PV réglés : Gorak 59, Murzug 55, Elaria 51, Sylwen 53, Caldrec 60 |
| 0.29.0 | Épines 6, à chaque coup encaissé (deux fois contre une Furie) ; Vol de vie sans durée, perdu sur une esquive, gardé sur un jet de 1 à 3 |
| 0.31.0 | Aldric, le paladin (famille seule) |
| 0.32.0 | Gauvain, le croisé, variante d'Aldric ; critique d'Aldric de 15 à 12 % |
| 0.35.0 | Deux familles : l'ogre (Morgrut, Gnashka), sans compétence ; le druide (Thaldrin, Brannoc), à deux formes |
| 0.30.0 | Deux nouvelles races : Humains (Ysolde, Bérengère) et Hommes-lézards (Naraxes, Ssythra) |
| 0.28.0 | Rééquilibrage par les compétences (méthode `EQUILIBRAGE.md`) : Rage du sang 3 PV, Peau de pierre +6, intimidation et précision cumulables, Grimbald 10 % de critique ; PV ramenés près de l'identité (Brokk 68 au lieu de 83) |
| 0.27.0 | Jets de 1 à 3 sans dégâts ; PV réglés : Gorak 61, Murzug 57, Elaria 50, Sylwen 52, Brokk 83, Grimbald 65, Ervald 62, Caldrec 57 |

## 3. Événements et statuts

**Règles actuelles**

Un **événement** est une capacité propre à un personnage : *quand* (déclencheur) → *quoi* (effets). Il peut avoir une probabilité (`chance`) et un nombre maximal de déclenchements par combat (`limit`).

**Compétences en jeu** : trois par race, héritées par les variantes, sur un 1, un 2 et un 3 au dé de dégâts du porteur. Le 3 donne une **aura permanente**. Depuis la 0.27.0, ces jets n'infligent **aucun dégât** : ils déclenchent seulement la compétence. Elles se déclenchent même si le coup est esquivé, à condition que le défenseur soit encore debout.

| Race | Dé | Compétence | Effet |
| --- | --- | --- | --- |
| Orc | 1 | Rage du sang | +3 PV (sans dépasser le maximum) ; Murzug a la sienne, +5 PV (0.36.5) |
| Orc | 2 | Furie des vents | 🌪️ pendant 1 tour : à sa prochaine action, il frappe deux fois, chaque coup résolu à part (et pouvant relancer une Furie) |
| Elfe | 1 | Œil de faucon | 🎯 Critique assuré : le prochain coup qui touche est critique |
| Elfe | 2 | Esquive améliorée | 💨 sans durée (0.36.5) : le prochain coup reçu est esquivé à coup sûr, même si l'adversaire sacrifie d'abord ses coups |
| Nain | 1 | Peau de pierre | 🛡️ +6 armure temporaire, cumulable, qui s'use en encaissant |
| Nain | 2 | Épines | 🌵 6 pendant 1 tour : chaque coup encaissé renvoie 6 dégâts directs à l'attaquant (deux fois contre une Furie des vents) |
| Mort-vivant | 1 | Souffle de la tombe | ☠️ empoisonne l'adversaire : Poison 3, soit −3, −2 puis −1 PV au début de ses tours suivants (0.36.4) |
| Mort-vivant | 2 | Vol de vie | 🦇 une charge : son prochain coup porté lui rend les PV retirés ; perdue si le coup est esquivé, gardée sur un jet de 1 à 3 |
| Orc | 3 | Aura de puissance | 💪 permanente, cumulable : +2 dégâts par charge sur chaque coup, avant l'armure |
| Elfe | 3 | Aura de précision | 🦅 permanente, cumulable : +1 au multiplicateur de critique par charge (×2 → ×3, ×2,4 → ×3,4) |
| Nain | 3 | Aura d'intimidation | 😠 permanente, cumulable : les coups de l'adversaire font 2 de moins par charge, avant l'armure |
| Humain | 1 | Peur | 😱 l'adversaire perd sa prochaine action (il tremble tant qu'il a peur) |
| Humain | 2 | Purification | retire le dernier bonus posé de l'adversaire, avec toutes ses charges (aura comprise) |
| Humain | 3 | Aura de sainteté | 🕊️ permanente, cumulable : +2 PV par charge à la fin de chacun de ses tours |
| Homme-lézard | 1 | Coup de chance | 🍀 à sa prochaine action, un d6 vert en plus de son dé, joué comme un coup à part : il frappe sur 4 à 6, et déclenche une compétence sur 1 à 3 (d6 depuis la 0.36.5 ; un d3 ne frappait jamais) |
| Homme-lézard | 2 | Pile ou face | 🪙 à sa prochaine action, une pièce remplace son dé : pile, 15 dégâts directs ; face, rien |
| Homme-lézard | 3 | Aura de décoction | 🧪 permanente, cumulable : chaque coup qui touche pose 2 charges de poison par charge d'aura (0.36.4) |
| Paladin | 1 | Rétribution | ⚖️ relâche la somme de ses 3 jauges (les PV des 3 derniers coups reçus) en dégâts directs, au moins 1 |
| Paladin | 2 | Riposte | ⚔️ 1 tour : le prochain coup encaissé renvoie la moitié de ses dégâts |
| Paladin | 3 | Aura d'immunité | purge ses malus ; plus aucun malus ne peut lui être posé (permanente, non cumulable) |
| Mort-vivant | 3 | Aura de poison | ☣️ permanente, cumulable : au début de chacun de ses tours, avant son coup, l'adversaire perd 1 PV par charge (dégâts directs) |

**Déclencheurs disponibles**, du point de vue du porteur :

| Déclencheur | Moment |
| --- | --- |
| `combatStart` | au début du combat |
| `turnStart` | au début de chacun de ses tours |
| `turnEnd` | à la fin de chacun de ses tours |
| `naturalOne` / `naturalTwo` / `naturalThree` / `naturalMax` | il fait 1 / 2 / 3 / le maximum au dé de dégâts |
| `hit` / `crit` | il touche / il porte un critique |
| `missed` | son coup est esquivé |
| `dodge` | il esquive un coup |
| `hurt` | il encaisse un coup |
| `bloodied` | la première fois qu'il passe sous la moitié de ses PV |

**Effets disponibles** : soin, dégâts directs (ignorent armure, esquive et boucliers), pose d'un statut, purge des bonus ou des malus (tous, ou seulement les derniers posés : `count`, ex. Purification). Chaque effet vise le porteur ou son adversaire. Une compétence du dé peut aussi **sacrifier son coup** (`forfeitsHit`) : le coup du déclenchement n'inflige rien, sans esquive ni critique.

**Conditions** (`when`) : un événement peut exiger que les PV du porteur ou de l'adversaire soient sous (ou au-dessus d') une fraction de leur maximum, qu'un statut soit présent (avec un minimum de charges) ou absent, ou qu'un tour minimal soit atteint. Toutes les conditions doivent être vraies, et elles sont vérifiées avant le tirage de `chance`. Le détail est dans [STATUTS.md](STATUTS.md).

**Statuts (auras)** : effets durables, positifs (bonus) ou négatifs (malus). Ils durent jusqu'à épuisement de leurs charges, ou un nombre donné de tours du porteur. Leur cumul est `add` ou `refresh`, avec un plafond de charges facultatif. Le catalogue complet, avec leurs règles et ce qui reste à décider, est dans [STATUTS.md](STATUTS.md), et en jeu dans le compendium.

| Statut | Polarité | Règle | En jeu |
| --- | --- | --- | --- |
| 🎯 Critique assuré | bonus | le prochain coup qui touche est critique (une charge par coup) | oui (elfe) |
| 🛡️ Armure temporaire | bonus | bouclier : absorbe des points après l'armure, s'use d'autant | oui (nain) |
| 💚 Régénération | bonus | soigne au début de chaque tour du porteur | pas encore |
| ☠️ Poison | malus | une seule valeur : autant de dégâts au début du tour du porteur, puis une charge de moins (3, 2, 1) | oui (mort-vivant, sur l'adversaire) |
| 🥀 Affaibli | malus | ses coups infligent moins avant l'armure | pas encore |
| 💔 Brèche | malus | armure réduite (3 charges au plus) | pas encore |
| 🌵 Épines | bonus | chaque coup encaissé renvoie N dégâts directs, tant qu'elles durent | oui (nain) |
| 🦇 Vol de vie | bonus | le prochain coup porté rend les PV qu'il retire ; esquivé, rien | oui (mort-vivant) |
| 🌪️ Furie des vents | bonus | deux coups à la prochaine action, chacun résolu à part | oui (orc) |
| 💨 Esquive améliorée | bonus | le prochain coup reçu est esquivé, sans tirage | oui (elfe) |
| ☣️ Aura de poison | bonus | permanente : l'adversaire perd 1 PV par charge au début de chaque tour du porteur | oui (mort-vivant) |
| 💪 Aura de puissance | bonus | permanente : +2 dégâts par charge | oui (orc) |
| 😠 Aura d'intimidation | bonus | permanente : l'adversaire frappe 2 de moins par charge | oui (nain) |
| 🦅 Aura de précision | bonus | permanente : multiplicateur de critique +1 par charge | oui (elfe) |
| 😱 Peur | malus | perd sa prochaine action ; tremble tant qu'il a peur | oui (humain, sur l'adversaire) |
| 🕊️ Aura de sainteté | bonus | permanente : +2 PV par charge à la fin de ses tours | oui (humain) |
| 🧪 Aura de décoction | bonus | permanente : chaque coup qui touche empoisonne (2 charges par charge d'aura) | oui (homme-lézard) |
| 🪙 Pile ou face | bonus | prochaine action : une pièce au lieu du dé, pile 15 dégâts directs | oui (homme-lézard) |
| 🍀 Coup de chance | bonus | prochaine action : un d6 en plus, coup à part | oui (homme-lézard) |
| ⚖️ Rétribution | bonus | 3 jauges des derniers coups reçus, relâchées sur un 1 | oui (paladin) |
| ⚔️ Riposte | bonus | prochain coup encaissé : la moitié des dégâts renvoyée | oui (paladin) |
| Aura d'immunité | bonus | permanente : aucun malus ne peut être posé | oui (paladin) |

**Durées** : un statut posé pendant un tour n'est pas décompté à la fin de ce tour. « 1 tour » posé pendant l'action vaut donc pour le tour d'après : la prochaine action du porteur (Furie des vents, décomptée en fin de tour) ou le tour de l'adversaire (Épines, décomptées au début du tour du porteur). L'Esquive améliorée n'a plus de durée depuis la 0.36.5 : elle attend le prochain coup reçu. Les auras n'ont pas de durée : leur médaillon affiche leurs charges.

**En combat** : un coup sacrifié n'a pas d'élan, et le journal le note (« Ervald retient son coup (2) : aucun dégât »). Le nom de la compétence flotte ensuite. La Furie des vents s'annonce au-dessus de l'orc. Puis **deux dés** roulent ensemble : le second jaillit en tournoyant dans une bourrasque bleutée, avec un son de rafale. Les deux coups partent coup sur coup, avec un élan court. Le dé du coup en cours ressort pendant que l'autre s'efface.

**Pile ou face** : la pièce remplace le dé au centre de l'arène. Elle tournoie en l'air (son de pièce), puis retombe sur pile (sabres croisés, carillon doré, « PILE ! » et −15 sur l'adversaire) ou sur face (tête de lézard, « FACE… »). **Coup de chance** : le d6 apparaît en vert à côté du dé habituel, et les deux coups partent en rafale comme ceux de la Furie. **Peur** : la victime tremble de gauche à droite tant qu'elle a peur.

**Personnages à formes (druide, 0.35.0)** : il commence sous sa première forme, puis en change **au tout début de chacun de ses tours, sauf le premier** (étape `shift`, avant ses statuts). Ses compétences dépendent de sa forme (`CharacterEvent.form`).
- **À l'écran** : fondu entre les deux silhouettes, avec éclair de sève, feuilles et son. L'en-tête du combat montre les trois dés de la forme en cours ; la sélection montre les deux rangées.
- **Coups transformés** (`reshapesHit`) : au lieu de sacrifier le coup, la compétence le change. **Charge** frappe pour la valeur maximale du dé, sans critique possible ; **Coup de griffe** relance le dé en secret et ajoute 3. C'est ensuite un coup normal : esquive, modificateurs, armure, boucliers.
- **Luciole** : elle pose 3 charges (0.35.1). Chaque coup reçu par le porteur prend +2 avant l'armure, une fois par coup (0.35.2). L'esquive du porteur tombe à 0 (une esquive imposée passe quand même). Chaque coup qui le touche retire une charge (`spentOnHurt`).
- **Pourriture** : 1 dégât par charge au début de chacun des tours du porteur, sans durée. Seule une purge l'enlève.

**L'ogre (0.35.0)** n'a aucune compétence : un 1, un 2 ou un 3 lui pose **Attente**. Il ne frappe pas, et l'état retombe au début de son tour suivant (`expiresAt: 'turnStart'`).

**Rappels visuels des états** (`look` dans le registre des statuts) : **seule l'aura de personnage** (posée sur un 3) illumine le modèle, depuis la 0.34.0. Elle donne un halo qui respire, un cercle lumineux au sol, des particules qui montent et un contour de la silhouette à sa couleur : vert pour le poison, orange pour la puissance, rouge sombre pour l'intimidation, or pour la précision, ivoire pour la sainteté, vert d'eau pour la décoction, or pâle pour l'immunité. Les autres états n'éclairent plus le modèle : leurs liserés sont gardés dans le registre pour plus tard. Sous **Esquive améliorée**, l'elfe devient translucide ; sous la **Peur**, le combattant tremble. Dans la zone d'état, l'aura ouvre la rangée des bonus, avec un **double contour** (doré, puis un anneau tournant à sa couleur), et son infobulle porte la mention « Aura ».

**Textes flottants et code couleur** : un seul texte par événement, placé à l'extérieur des combattants.
- **Violet** : le nom de la compétence ou du statut qui agit, sur son lanceur. Un bonus qu'elle lui pose ne flotte pas une seconde fois : s'il porte un autre nom, il devient le sous-titre de la compétence (« Œil de faucon ! », puis « Critique assuré »).
- **Rouge** : les dégâts ; **or** et plus grands : les critiques et les coups lourds, avec un chiffre qui tremble.
- **Vert** : les soins.
- **Fuchsia** : un malus posé sur la cible (Peur, Poison).
- **Ambre** : un bonus posé sur un autre que le lanceur.
- **Cyan** : ESQUIVE.
- **Gris** : résisté, neutralisé, déjà au maximum.

**Ressenti** (0.34.0) : les dégâts directs d'une compétence sont joués comme des coups, avec élan, impact, gros chiffre et son.
- La **Rétribution** frappe une fois par jauge, en rafale, et le dernier coup est lourd.
- **Pile** fait fondre la voleuse sur sa cible.
- La **Riposte** est un contre-coup ; les **Épines** blessent l'attaquant sur place.
- **Sons** : le son d'un événement se déduit de ce qu'il produit (voir [SONS.md](SONS.md)).
- **Critique** : arrêt sur image, éclair, coup sourd et chiffre qui tremble.

**À l'écran** : les statuts actifs s'affichent dans la **zone d'état**, posée sur l'arène au-dessus de la tête de chaque combattant. Les bonus sont à gauche et les malus à droite, séparés par un trait fin. Chaque état est un médaillon avec son icône peinte, cerclé de vert (bonus) ou de rouge (malus), et **un seul nombre** : les tours restants (avec le sablier) si le statut a une durée, sinon ses charges. Un statut peut imposer l'un ou l'autre (`counter`). **Chaque fois que ce nombre change** (bouclier entamé, tour décompté, cumul, critique assuré consommé…), il rebondit au moment même où la résolution a lieu (zoom, rebond, éclat) et sa variation (−1, +2) s'élève au-dessus du médaillon. Si seule une valeur cachée change (les charges d'un statut qui affiche ses tours), le médaillon sursaute. **L'effet et sa conséquence sont montrés ensemble** : quand le poison agit, le « −2 » flottant et le compteur qui passe de 3 à 2 apparaissent au même instant. **Un état épuisé ou expiré montre d'abord son 0** (rebond et « −1 ») avant de quitter la zone. Au survol, chaque état a une **infobulle** (nom, bonus ou malus, effet actuel, tours restants et charges), centrée au-dessus du médaillon et devant tout le reste (combattants, journal, commandes), utilisable aussi en pause. Le décompte des durées est une étape à part de la résolution, visible à son moment (après l'effet du statut, avant l'action) et notée au journal (« ⏳ Poison sur Brokk : encore 2 tours »). Le survol donne le détail. Une aura discrète au sol signale aussi bonus et malus. Un événement déclenché est mis en scène : aura violette sur son porteur, et son nom en **texte flottant violet**, comme ESQUIVE ou CRITIQUE. Suivent les badges sur la cible de chaque effet, le son, puis une ligne dans le journal. Les statistiques de fin comptent les événements, les PV regagnés, les critiques assurés, les dégâts absorbés par les boucliers, les dégâts subis hors des coups et les malus reçus.

**Historique**

| Version | Changement |
| --- | --- |
| 0.36.5 | Petites touches issues de l'audit des compétences : Esquive améliorée sans durée, Coup de chance au d6, Rage du sang propre à Murzug (+5 PV), Écorce épaisse à 5 ; une variante peut avoir sa propre version d'une compétence |
| 0.9.0 | Système déclencheur → effets (soin, bonus), trois premiers événements, affichage des bonus |
| 0.13.0 | Registre des statuts, positifs ou négatifs, avec durée, cumul et crochets de règles. 10 déclencheurs, 4 types d'effets, `chance` et `limit`, ciblage de l'adversaire. Auras au sol et pastilles colorées. Quatre statuts prêts pour de futurs événements |
| 0.18.0 | Conditions d'événement (`when`), plafond de charges (`maxStacks`), résumé et règles de chaque statut générés depuis le code, catalogue des statuts (en jeu ou à venir) |
| 0.20.0 | Couche de résolution : phase de fin de tour, contrôle (perte d'action), réactions des statuts, dégâts entrants, garde, immunités, opposition ; déclencheur `turnEnd` ; cinq statuts à venir qui illustrent chaque mécanique |
| 0.27.0 | Furie des vents à deux dés et coups en rafale (avec son) ; liserés des effets, halos des auras, elfe translucide sous Esquive améliorée ; traces de combat écrites sur le disque (`logs/combats/`) |
| 0.26.1 | Journal et trace : modificateurs de dégâts (auras) détaillés, « déjà au maximum » quand une aura plafonnée est reposée, élision « d'Ervald ». Infobulle de la zone d'état au-dessus du médaillon et devant tout |
| 0.31.0 | Riposte (`reflectsHit`), Aura d'immunité (`immune`), Rétribution : statut à jauges (`fillsOnHurt`, `Status.slots`) relâché par l'effet `release` |
| 0.30.0 | Peur (perte d'action), Purification (dernier bonus, toutes charges), Aura de sainteté, Aura de décoction, Pile ou face (pièce à la place du dé), Coup de chance (d3 supplémentaire) ; étape `coin`, purge des derniers posés (`count`), dé imposé d'un coup supplémentaire (`extraDie`) |
| 0.26.0 | Aura permanente par race, sur un 3 au dé (puissance, précision, intimidation, poison) ; déclencheur `naturalThree` ; un statut de début de tour qui frappe l'adversaire s'annonce au-dessus de son porteur |
| 0.25.0 | Seconde compétence par race, sur un 2 au dé (Furie des vents, Esquive améliorée, Épines, Vol de vie) ; déclencheur `naturalTwo`, coup sacrifié, coups multiples, esquive imposée, vol de vie, réaction unique ; un statut posé pendant un tour n'est pas décompté à sa fin |
| 0.24.0 | Zone d'état : infobulle au survol ; effet et compteur animés ensemble ; un état épuisé montre son 0 avant de disparaître ; animations de la zone calées sur la vitesse et la pause. Journal utilisable en pause |
| 0.32.1 | Zone d'état devant le cadre du combattant (infobulles du nain accessibles) |
| 0.35.4 | Plus de son de déception sur un 1 au dé (c'est une face de compétence) |
| 0.36.4 | Poison à une seule valeur, qui s'estompe (3, 2, 1) ; Souffle de la tombe Poison 3, Aura de décoction 2 charges par coup |
| 0.35.2 | Luciole : +2 dégâts par coup encaissé ; critique du druide à 8 % |
| 0.35.1 | Luciole pose 3 charges ; bouton de son accessible en combat, contexte audio réveillé à chaque geste |
| 0.35.0 | Formes et métamorphose (druide), coups transformés (Charge, Coup de griffe), Luciole, Écorce épaisse, Aura de pourriture et Pourriture ; Attente (ogre) |
| 0.34.0 | Une seule aura visible (aura de personnage) et médaillon d'aura à double contour ; un texte flottant par événement, code couleur ; coups de compétence, sons par événement, critiques plus lourds ; plus aucun emoji |
| 0.23.0 | Zone d'état : rebond du nombre et variation flottante à chaque changement de valeur ; décompte des durées montré à son moment et noté au journal |
| 0.19.0 | Zone d'état au-dessus des combattants (icône et nombre, bonus à gauche, malus à droite) à la place des pastilles sous la barre de vie ; nom de l'événement en texte flottant violet |

## 4. Écrans et parcours

**Parcours actuel**

```
Accueil (duel | tournoi)
 ├─ Duel : sélection → Affrontement → Jouer → Combat → Fin
 │                                   └─ Simuler ───────→ Fin
 ├─ 📖 Compendium : Personnages (fiches) | Bonus et malus
 ├─ 📊 Statistiques globales ─→ (fiche d'un personnage dans le compendium)
 └─ Tournoi : Configuration → Arbre → (Affrontement | ⚡ Simuler) → Fin → Arbre
```

- **Accueil** : bascule duel/tournoi. Pour chaque combattant : son nom en grand, avec un petit bouton rond pour ouvrir sa fiche, sa race et son archétype, ses stats, son événement, les vignettes de 64 px rangées par famille (une colonne par race, l'original en haut, ses variantes dessous ; celle du personnage choisi en face est estompée, et reste sélectionnable) et un bouton « Au hasard » (icône de dé). Grand modèle de chaque combattant, bouton « Combattre » centré en bas, version du jeu. En haut à gauche : Statistiques et **Compendium**, ce dernier par un bouton rond provisoire (son intégration définitive reste à définir). Le bouton rond près du nom ouvre la fiche du personnage dans le compendium.
- **Affrontement** : en haut, sous « Affrontement » et un peu en retrait, le sélecteur d'arène ‹ nom › (flèches de l'écran ou du clavier), qui change le décor en fond. Puis les deux modèles, leurs stats en **barres** (les mêmes que sur l'écran de sélection, à la couleur du camp), leur événement, et les boutons JOUER, SIMULER et CHANGER.
- **Combat** : dés animés, charge et impact, textes flottants ESQUIVE, CRITIQUE et nom de l'événement (à l'extérieur des combattants, sur le décor, en Alegreya Sans SC ; test de police avec `?police=cinzel|oswald|lilita`), zone d'état au-dessus de chaque combattant, fond d'arène assombri. L'arène occupe tout l'écran sous les barres de vie. Une barre de commandes flottante (pause, vitesse ×1/×2/×4, journal) est placée en bas au centre. Le **journal**, masqué au départ, s'ouvre dans une fenêtre translucide entre les combattants (bouton ou touche J), avec un compteur des lignes non lues. S'il est ouvert, il le reste pour les combats suivants de la session. Les dégâts directs y sont signalés comme tels (« l'armure ne compte pas »).
- **Trace de résolution** (vérification et débogage) : chaque combat est tiré avec une **graine** et sa trace complète est écrite dans la **console du navigateur**, repliée, un groupe par tour. Elle donne, étape par étape et dans l'ordre du moteur : phase (ouverture, début, action, fin), jet de dé, esquive, critique, modificateurs de dégâts avec leur porteur (« 😠 Aura d'intimidation de Brokk −2 », plancher à 1 signalé), dégâts avant armure, armure, boucliers, plancher d'1 dégât, PV avant → après, compétences et effets (posé, annulé, bloqué), effets des statuts, décomptes de durée et expirations, puis l'état des deux combattants. Le bouton « Copier la trace » du journal et de l'écran de fin la copie en texte brut. **Sur le disque** (0.27.0, serveur de dev) : chaque combat écrit sa trace dans `logs/combats/` du projet, un fichier par combat (`<date>_<gauche>-vs-<droite>_graine-<n>.txt`), relisible sans navigateur. En console : `battler.trace()` (dernier combat), `battler.trace(n)`, `copy(battler.dump())` (copie les traces des 40 derniers combats, un tournoi entier), `battler.replay(graine, 'gorak', 'brokk')` (rejoue un combat à l'identique).
- **Mode triche** (outil d'observation, bouton « Cheat » ou touche C pendant un combat) : un pavé numérique impose la valeur du **prochain dé lancé à l'écran**. Les touches vont de 1 à 10, celles qui dépassent le dé sont grisées ; pour la pièce, ce sont Pile et Face, et « Hasard » annule. Au clavier, panneau ouvert : 1 à 9, 0 pour 10, P et F, Retour arrière. Le combat est résolu à nouveau par le moteur (`forcedRolls`), avec la même graine : tout ce qui précède le dé imposé reste identique, et la lecture continue sur la nouvelle chronologie. Le dé imposé porte la mention « Imposé ». Le combat est exclu des statistiques (il compte quand même dans l'arbre d'un tournoi). Sa trace finale est écrite dans `logs/combats/` avec le suffixe `_triche`, et `npm run logs` la rejoue.
- **Fin** : à gauche, le vainqueur, les faits marquants et les boutons ; à droite, les statistiques comparées en quatre onglets (Bilan, Critiques et défense, Événements, Dés). Un badge indique un combat simulé.

**Historique**

| Version | Changement |
| --- | --- |
| 0.1.0 | Écrans d'accueil, de combat et de fin ; animations de charge et d'impact |
| 0.5.0 | Tout le jeu sur une scène fixe en 16:9 (1600×900), tuiles de sélection plus petites |
| 0.6.0 | Écran d'affrontement avec Jouer et Simuler |
| 0.7.0 | Bouton 📜 Fiche sur la sélection, écran de statistiques globales |
| 0.10.0 | Image d'arène en fond du combat |
| 0.11.0 | Numéro de version sur l'accueil |
| 0.15.0 | Journal du combat masqué par défaut, en fenêtre translucide (bouton ou J) ; commandes en barre flottante ; arène sur toute la hauteur |
| 0.15.1 | Combattants remontés et reculés sur le sol de l'arène ; journal centré et au premier plan |
| 0.16.0 | Choix de l'arène sur l'écran d'affrontement ; résumé de combat en onglets ; écran de sélection sans les règles |
| 0.17.0 | Sélection : nom en grand, fiche en bouton rond, vignettes par famille, « Personnage au hasard » ; arène en sélecteur ‹ › sous le titre de l'affrontement ; statistiques globales en onglets |
| 0.22.0 | Trace de résolution complète de chaque combat dans la console, bouton « Copier la trace », graine rejouable ; dégâts directs signalés dans le journal |
| 0.34.0 | Compétences en trois dés avec infobulle (sélection, affrontement, en-tête du combat) ; écrans trop hauts : défilement interne (statistiques) ; bouton « Créer un tournoi » |
| 0.33.0 | Mode triche (prochain dé imposé, bouton Cheat ou C) ; barre de commandes au style jeu (plaque de pierre, gemmes de vitesse) |
| 0.32.1 | Textes flottants à l'extérieur des combattants, plus longs à l'écran, nouvelle police et test de police (`?police=`) |
| 0.19.0 | Affrontement : stats en barres, arène un peu plus bas sous le titre ; combat : zone d'état et événements en texte flottant |
| 0.12.0 | Nouveau fond d'arène original (ruines forestières au crépuscule) |
| 0.38.8 | Refonte au design system (étapes 1 à 8, `docs/design-system.md`) : tokens, camps azur et cramoisi, jauges, statistiques à paliers, onglets mineurs soulignés, boutons sertis, panneaux voilés à liseré de camp ; vignette du personnage choisi en face estompée |

## 5. Arènes

**Règles actuelles**

Une arène est le cadre visuel d'un combat. Elle est purement décorative et ne change aucune règle. On la choisit sur l'écran d'affrontement, avec le sélecteur ‹ › placé sous le titre (le décor du fond change avec lui). « Au hasard » la tire au lancement du combat. Le choix est gardé pour la session. La simulation directe n'affiche pas d'arène.

| Arène | Image | Ambiance |
| --- | --- | --- |
| Ruines forestières | `arena-ruins.jpg` | clairière de ruines au crépuscule, torches et bannière |
| Cour de Durnhold | `arena-dwarf-fortress.jpg` | cour dallée d'une forteresse naine, statues, braseros, montagnes enneigées |

Chaque arène a son cadrage du sol (`focus`), pour que les pieds tombent sur la zone dégagée, et son traitement (assombri, désaturé, légèrement flou).

| Version | Changement |
| --- | --- |
| 0.10.0 | Première image d'arène en fond de combat (placeholder) |
| 0.12.0 | Arène originale : ruines forestières |
| 0.16.0 | Registre des arènes, choix sur l'écran d'affrontement, Cour de Durnhold |

## 6. Son

Les règles du son sont dans [SONS.md](SONS.md) et font foi : vocabulaire de 20 sons, ce que chacun veut dire, son de chaque étape du combat, son d'une nouvelle compétence. Le bouton muet en haut à droite est mémorisé (`battler:muted`).

- **Un son = une signification = un fichier** (`src/assets/sounds/<son>.mp3`), joué avec la Web Audio API. Un son sans fichier joue sa version synthétisée.
- **Un instant = un son.** Seul le Coup critique en joue deux ensemble (Coup et Grondement).
- **Le son d'une compétence se déduit de ses effets** (`cueOf`) : aura posée, aura retirée, malus posé, bonus posé, statut retiré, soin ; les dégâts sonnent avec leurs coups. Une nouvelle compétence n'a donc rien à déclarer.
- **Silences** : l'élan, le jet maximal, les faces de compétence (1, 2 et 3), les durées qui baissent et les statuts qui expirent ne sonnent pas.
- **Vitesse** : à ×2 et ×4, les sons du combat sont écourtés au prorata, avec un fondu. Le clic, le choc du face-à-face, le KO et la victoire jouent en entier.
- **Ajouter ou remplacer un fichier** : traiter la source avec `scripts/process-sounds.py`, copier le fichier retenu sous le nom du son (`SOUND_NAMES`), régler son volume dans `MIX`.

| Version | Changement |
| --- | --- |
| 0.2.0 | Ajout des effets sonores et du bouton muet |
| 0.9.0 | Son d'événement |
| 0.35.4 | Plus de son de déception sur un 1 au dé |
| 0.36.4 | Pile réussie (ding), dés de la 0.36.0 à variantes, nouveaux Coup et Grondement, volume relevé |
| 0.36.3 | Fichiers choisis à l'oreille par l'utilisateur (19 sur 20) ; qui joue quel son documenté (`SONS.md` § 9) |
| 0.36.2 | Sons refondus selon `SONS.md` : 20 sons, un fichier chacun, son déduit des effets |
| 0.36.1 | Règles du son proposées (`SONS.md`) |
| 0.36.0 | Sons enregistrés (CC0) à la place des sons synthétisés, gardés en repli ; impact à trois paliers ; sons écourtés selon la vitesse |

## 7. Statistiques et historique

**Règles actuelles**

- Tous les combats, joués ou simulés, en duel ou en tournoi, sont enregistrés dans le localStorage (`battler:history:v1`).
- Les dégâts comptés sont les PV réellement retirés : le coup fatal ne compte que ce qu'il restait (il reste 5 PV, un coup de 6 compte 5). À l'écran, la frappe affiche sa force réelle.
- Les totaux sont cumulés par personnage : combats, victoires, coups, critiques, esquives, dégâts, armure, meilleur coup, événements, PV regagnés, tournois gagnés. On garde aussi le bilan contre chaque adversaire et les 300 derniers combats.
- La **fiche personnage**, dans le compendium (verticale Personnages, voir § 9), montre le modèle à gauche et deux onglets à droite. L'onglet **Fiche** rassemble ce qui définit le personnage : accroche, background, forces et faiblesses, événement, caractéristiques et comparaison avec sa variante. L'onglet **Statistiques** rassemble ce qu'il a fait : 12 indicateurs, le bilan par adversaire et les derniers combats. L'onglet choisi est conservé quand on passe d'un personnage à l'autre.
- L'écran **Statistiques** montre le classement global et la matrice des confrontations en deux onglets, ainsi que les derniers combats. On peut tout remettre à zéro, après confirmation.
- Les anciens historiques sont complétés au chargement, quand de nouveaux champs apparaissent.

| Version | Changement |
| --- | --- |
| 0.3.0 | Esquives et critiques dans les stats de fin |
| 0.7.0 | Historique local, fiche personnage, statistiques globales |
| 0.8.0 | Combats de tournoi comptés, colonne 🏆 Tournois |
| 0.9.0 | Colonne ✨ Événements, PV regagnés |
| 0.13.0 | Bilan calculé à partir de la chronologie ; nouvelles lignes en fin de combat : dégâts subis hors coups, malus reçus |
| 0.14.0 | Coup fatal plafonné aux PV restants dans tous les décomptes |
| 0.34.0 | Décision inversée : l'excès du coup fatal (overkill) est compté partout |
| 0.14.1 | Fiche personnage en deux onglets (Fiche / Statistiques), pour éviter le débordement |
| 0.18.0 | La fiche personnage est déplacée dans le compendium |

## 8. Tournoi

**Règles actuelles**

- Arbre à élimination directe de 16 participants : huitièmes, quarts, demies, finale. Les deux moitiés de l'arbre convergent vers la finale au centre.
- **Configuration** : on choisit un personnage dans la palette, puis on clique les cases. Le × vide une case. 🎲 **Compléter** remplit seulement les cases vides, en équilibrant le roster et en évitant les duels miroirs au premier tour quand c'est possible.
- Les doublons sont permis ; ils sont nommés avec des chiffres romains (Gorak I, Gorak II…).
- **Suivi** : chaque match prêt propose ⚔ Affronter (passe par l'écran d'affrontement) ou ⚡ Simuler. « ⚡ Simuler le tour » simule tous les matchs prêts du tour en cours. Le champion s'affiche au centre.
- Les matchs alimentent l'historique global. Le tournoi n'est pas sauvegardé, il est perdu au rechargement.
- **Sacre** : après la finale, jouée ou simulée, l'**écran du champion** le montre en grand, avec son parcours (les quatre adversaires battus), le bilan cumulé de son tournoi (dégâts, critiques, plus gros coup, soins, esquives, compétences, précision, dégâts encaissés) et les compétences déclenchées. On y revient depuis l'arbre (« Le champion »).

| Version | Changement |
| --- | --- |
| 0.8.0 | Mode tournoi complet |
| 0.8.1 | Boutons de configuration rendus cliquables ; un seul bouton Compléter, qui respecte les cases placées à la main |
| 0.34.0 | Écran du champion (parcours et bilan cumulé du tournoi) |
| 0.38.0 | Classement des parieurs dans l'arbre et sur l'écran du champion ; écran de fin en deux moitiés (combat, paris) |
| 0.13.0 | Un match ne peut plus être enregistré deux fois, ni avec les mauvais combattants ; l'arbre valide le résultat avant l'historique |

## 9. Compendium

**Règles actuelles**

Le compendium est le recueil du jeu : tout ce qu'on peut y consulter, rangé en **verticales**, une par onglet. Son contenu est généré à partir des registres du code, il est donc toujours à jour.

| Verticale | Contenu |
| --- | --- |
| **Personnages** | La liste par famille (race, puis original et variantes) et la fiche du personnage choisi, avec ses onglets Fiche et Statistiques (voir § 7). Le personnage est peint **en arrière-plan**, en grand, à la place de l'ancien modèle : assombri, fondu au sol et sur les côtés, avec un halo chaud, et passant sous les encadrés translucides de la fiche. La mise en page ne change pas |
| **Compétences** | Les capacités des personnages, **regroupées par race** (un bloc par race, cartes 3 par ligne). Chaque carte donne le nom, le déclencheur, les conditions, la chance et la limite, puis chaque effet : **Immédiat** (soin, dégâts directs, purge) ou **Pose** d'un statut, avec son icône, sa cible et sa règle. En pied de carte, ses possesseurs (l'original et les variantes qui en héritent) : un clic ouvre leur fiche. C'est la carte de compétence qui relie un personnage aux statuts, présentés comme des règles neutres. La fiche du personnage garde aussi sa compétence en résumé |
| **Bonus et malus** | La liste de tous les effets qu'on peut rencontrer en combat. **Seuls les statuts réellement posés par un personnage** y figurent ; les statuts « à venir » ne sont que dans `STATUTS.md`. Deux sous-onglets, Bonus et Malus, avec leur nombre d'entrées. Grille de cartes encadrées, 4 par ligne, à proportions fixes (4:5) : médaillon de l'icône, nom, polarité, résumé, règles déduites du code (crochets, cumul, plafond). Un statut y est présenté comme une règle neutre : la carte ne dit pas qui le pose. La règle de durée commune est rappelée une fois en tête |

- **Accès** : un bouton rond provisoire en haut à gauche de l'accueil, le bouton rond près du nom d'un combattant (qui ouvre directement sa fiche), ou un personnage dans l'écran Statistiques.
- **Retour** : le bouton retour ramène à l'écran d'où l'on vient (sélection ou statistiques). La sélection en cours est conservée.
- **Extensible** : d'autres verticales pourront s'ajouter selon les besoins (événements, arènes, règles, bestiaire…). La marche à suivre est dans `ARCHITECTURE.md`.

| Version | Changement |
| --- | --- |
| 0.18.0 | Création du compendium : verticales Personnages (fiches déplacées depuis l'ancien écran) et Bonus et malus |
| 0.19.1 | Bonus et malus : uniquement les statuts en jeu, sous-onglets Bonus / Malus, grille de cartes encadrées 4 par ligne |
| 0.19.2 | Fiche personnage : le personnage passe en grand en arrière-plan |
| 0.20.1 | Bonus et malus : la provenance (qui pose le statut) n'est plus affichée sur les cartes |
| 0.21.0 | Nouvelle verticale Compétences, entre Personnages et Bonus et malus |
| 0.25.0 | Fiches et cartes de compétence avec deux compétences par race ; puce « coup sacrifié » sur Vol de vie |
| 0.26.0 | Trois compétences par race dans la verticale Compétences (une rangée de trois cartes par race) |

## 10. Paris

Un jeu dans le jeu pour les observateurs, en Deniers fictifs. **Aucun effet sur le combat.** Règles complètes, maths et interface : [PARIS.md](PARIS.md).

**Règles actuelles**

- **Quatre parieurs** : les deux joueurs (karma et MiaMiaM par défaut, noms et activation dans la configuration du tournoi) et deux parieurs de l'ordinateur, **Borin** le prudent et **Zlatka** la flambeuse, marqués « IA ». Ils parient sur **chaque** match, même simulé depuis l'arbre.
- **1 000 Deniers** chacun au départ. En tournoi, la bourse dure tout le tournoi (en mémoire) ; en duel, une bourse de session, remise à zéro dans le guichet. Classement à la **fortune** : bourse et mises en cours.
- **Le guichet**, en plein écran, s'ouvre par **Parier** sur l'écran d'affrontement. Chaque joueur choisit une issue parmi six grandes tuiles (A gagne, B gagne, A écrase, B écrase, combat long, combat court) et une pièce : **50, 100 ou 200**. Le pari se pose dès que les deux sont choisis. Retoucher l'issue le retire. Revenir en arrière rend les mises.
- **Cotes cachées** : calculées par 400 combats simulés (jamais le vrai), ramenées au palier le plus proche (×1,1 à ×10), elles ne s'affichent qu'au règlement.
- **Rattrapage** : le dernier du classement, quand il est distancé, peut miser **400 (coup de poker)** et son gain net compte **double**.
- **Coups de théâtre** (environ un match sur trois) : Cote boostée, Favori taxé, Prime de courage, Jackpot, Mise doublée.
- **Règlement** : un pari gagné rend mise × cote ; un combat triché rend les mises ; un parieur qui ne peut plus miser 50 reçoit 100 Deniers au tour suivant.
- **Écran de fin en deux moitiés** : le combat à gauche (vainqueur, faits marquants, part des dégâts, Détails), les paris à droite (le pari de chacun, la cote dévoilée, gagné ou perdu, le classement qui se met à jour).
- **L'arbre et l'écran du champion** affichent le classement des quatre parieurs.

| Version | Changement |
| --- | --- |
| 0.37.0 | Première version jouable : guichet du match, trois marchés, cotes simulées, coups de théâtre, règlement sur l'écran de fin, bourses dans l'arbre, prime de relance, noms des parieurs dans la configuration du tournoi |
| 0.38.0 | Refonte : guichet de jeu vidéo (tuiles, pièces, tampon), cotes cachées jusqu'au règlement, mises fixes, coup de poker et gain doublé du dernier, Mise doublée au lieu de Tout ou rien, deux parieurs de l'ordinateur (Borin, Zlatka), écran de fin en deux moitiés, classement dans l'arbre et sur l'écran du champion |
