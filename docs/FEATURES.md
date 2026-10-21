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
  6 bis. Les **dégâts finaux** de l'attaquant (Aura mélodieuse, Fausse note, 0.41.0) s'ajoutent ou se retirent en dernier, sans que l'armure ni l'intimidation ne les touchent ; au moins 1 dégât. À l'écran, on dit « ajouté après l'armure : rien ne le réduit » (0.45.0).
  7. **Vol de vie** : si l'attaquant porte Vol de vie, le coup porté consomme une charge (deux par Vol de vie depuis la 0.45.0). S'il a touché, il regagne les dégâts du coup ; esquivé, la charge est perdue sans soin ; un jet de compétence (1 à 3) ne la consomme pas.
- **Deux dés (la barde, 0.41.0)** : un personnage `twinDice` lance deux dés à chaque action. Hors double, deux coups séparés, un par dé (esquive et critique chacun) ; sur un double qui a sa compétence, celle-ci remplace les deux coups (voir la section 2 et `RESOLUTION.md` § 2). En combat test, la paire compte pour deux dés, choisis un par un.
- **Dégâts comptés en entier (overkill, depuis la 0.34.0)** : un coup fatal ou des dégâts directs comptent tout leur montant dans les statistiques, la trace et l'historique, même au-delà des PV restants. Les PV, eux, s'arrêtent à 0.
- **Événements** du coup : voir la section 3.
- **Fin** : le premier à 0 PV perd, que ce soit à cause d'un coup, d'un effet ou d'un statut. Plus rien ne se déclenche après un K.O. Une limite de sécurité arrête le combat à 1 000 tours ; il est alors gagné aux PV.
- **Lisibilité du tour (0.44.0, présentation pure)** : au passage de main, une pause de 400 ms (`HANDOVER`, `timing.ts`, divisée par la vitesse) vide le plateau de dés, qui annonce « Au tour de … » ; le camp actif s'allume nettement dans l'en-tête (nom et barre de vie), et un halo diffus de la couleur du camp monte du bas de l'écran sous sa moitié de l'arène (0.49.0 ; avant, un anneau qui se confondait avec l'aura, puis une ligne au sol jugée trop visible). Les dés de compétence de l'en-tête sont éteints au repos ; quand le dé tombe sur une face de compétence (1, 2, 3, coup transformé, double de la barde), le dé de cette face s'allume un instant, comme un tintement, dans la couleur de la nature de la compétence.
- **Synchronisation et zone de surcharge (0.49.0, présentation pure)** : une compétence déclenchée par le dé tombe avec lui (dé qui s'arrête, dé de l'en-tête, texte flottant, statut et son au même instant). La **zone de surcharge** (2026-10-21, définition de l'utilisateur, référence : [RESOLUTION.md](RESOLUTION.md) § 11) empile sous le dé, en colonne, droits et de même largeur (`SpecialLabel.tsx`), ce qui change le coup en cours au-delà de sa règle de base, chaque label à l'instant où il s'applique, dans l'ordre du livre de règles : Esquive assurée, « Fer à quatre clous +4 », Critique assuré, « Critique ×2 », « Luciole +2 », « Armure temporaire −6 », « Fausse note −10 », puis les réactions (« Vol de vie +5 », « Riposte −3 », « Saignement +2 », Épines acérées) et les reliques qui se déclenchent. N'y entrent ni ce qui se déclenche (Pile ou face, Furie des vents, Coup de chance, Rétribution, doubles de la barde : leur sceau le dit) ni ce qui agit à chaque coup (auras, états durables). **Signe vu de l'attaquant** : + s'il amplifie son action, − s'il la réduit ou la contre (plaque hachurée). **Couleur selon la source** (registre unique `specials.ts`, déduite de la mécanique) : Coup (ambre : critiques), Compétence ou statut (ivoire), Relique (plaque sombre au liseré d'or). **Son selon le signe** (`SONS.md` § 4.4) : ding de la pièce pour +, Malus reçu pour −, un seul par signe quand des labels tombent ensemble, rien en plus quand l'effet joue déjà ce son. Avant le 2026-10-21 : une couleur par type (Coup, Bonus, Malus, Relique, 0.78.0), Furie, Pile ou face, Rétribution et doubles compris.
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
| 0.41.0 | Personnage à deux dés (paire, doubles, gros coup d'un double) et dégâts finaux (`modifyFinal`), pour la barde |
| 0.44.0 | Passage de main (pause, camp actif, anneau au sol) et dé de compétence qui pulse dans l'en-tête |
| 0.45.1 | Ligne au sol sur la moitié de l'arène, barre de vie active renforcée sans tamiser l'autre, dés éteints au repos et éclat bref au déclenchement |
| 0.52.0 | Furie relancée : badge qui monte (×2, ×3), dé de la rafale groupé avec sa compétence, nom de la Furie affiché une seule fois |
| 0.58.1 | Compteur d'état : la baisse a sa propre animation (lueur et cerclage qui s'efface à rebours), distincte du rebond de la hausse |
| 0.55.0 | Furie instantanée : badge au dé, frappes à plat ; Pile ou face d'un bloc ; textes flottants devant le combattant ; cerclage du compteur qui décroît ; tremblement de la Peur corrigé ; voleuse redescendue |
| 0.53.1 | Infobulles des dés et cartes du compendium : la vraie icône de la compétence dans le sceau (au lieu de l'étoile), sans répéter le statut du même nom |
| 0.49.0 | Halo diffus du camp actif en bas de l'écran (au lieu de la ligne) ; compétence du dé groupée avec son jet ; badges de coups spéciaux empilés, colorés par famille (`specials.ts`) ; libellé de la pièce lisible |

## 2. Personnages et roster

**Règles actuelles**

**Un personnage par famille** depuis la 0.43.0 (décision de l'utilisateur) : les jumeaux de coloris sont retirés. Chaque famille garde son personnage principal (nom, image, postures, fiche) et les statistiques les plus pertinentes des deux, mesurées (voir [PERSONNAGES.md](PERSONNAGES.md#un-personnage-par-famille-0430)).

| Personnage | Race · archétype | PV | Dé | Armure | Esquive | Critique | Multiplicateur |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gorak | Orc · Brute | 57 | d10 | 0 | 5 % | 18 % | ×2 |
| Elaria | Elfe · Rôdeuse | 50 | d8 | 0 | 26 % | 17 % | ×2,4 |
| Brokk | Nain · Gardien | 57 | d10 | 0 | 6 % | 10 % | ×2,5 |
| Ervald | Mort-vivant · Chevalier liche | 56 | d10 | 0 | 8 % | 16 % | ×2 |
| Ysolde | Humain · Prêtresse solaire | 52 | d7 | 0 | 8 % | 10 % | ×2 |
| Naraxes | Homme-lézard · Voleuse | 50 | d10 | 0 | 20 % | 14 % | ×2 |
| Aldric | Humain · Paladin | 54 | d8 | 0 | 7 % | 17 % | ×2,5 |
| Morgrut | Ogre · Cogneur | 63 | d14 | 0 | 0 % | 0 % | ×2 |
| Thaldrin | Sylvain · Druide | 56 | d10 | 0 | 8 % | 8 % | ×2 |
| Fanchon | Humain · Saltimbanque | 46 | 2 × d5 | 0 | 12 % | 5 % | ×2 |

**La barde (0.41.0)** lance deux d5 à chaque tour, et ses compétences se déclenchent sur les doubles, à la place des deux coups :
- **Ouverture** (au début du combat) : 1 charge d'Aura mélodieuse ;
- **Siffloter** (double 1) : Sifflotement, 3 charges, +2 PV à chaque fin de tour ; le double frappe aussi ses deux coups (0.46.0) ;
- **Fausse note** (double 2) : 2 charges (0.45.0) : le prochain coup adverse qui touche fait 10 dégâts de moins (au moins 1) ; le double frappe aussi ses deux coups (0.46.0) ;
- **Aura mélodieuse** (double 3) : 2 charges (0.45.0) ; chaque charge, +1 dégât sur chacun de ses coups qui touche, ajouté après l'armure ;
- **Crescendo** (double 4) : un seul coup de 12 ;
- **Soliste** (double 5) : un seul coup de 15.


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
| 0.41.0 | La barde, dixième famille (Fanchon, Mélisande) : deux dés, compétences sur les doubles, concept d'un ami de l'utilisateur ; postures et icônes de la session images |
| 0.43.0 | Un personnage par famille : les dix jumeaux retirés ; Gorak, Elaria, Brokk, Ervald et Aldric prennent les statistiques de leur ancien jumeau (Murzug, Sylwen, Grimbald, Caldrec, Gauvain), les cinq autres gardent les leurs |
| 0.68.0 | Gorak : Saignée (Saignement 2) à la place de la Rage du sang ; Brokk : Épines acérées, qui font saigner l'attaquant |
| 0.70.0 | Gorak : Pourfendre à la place de la Saignée (le 1 frappe et, s'il touche, pose Saignement 2) |
| 0.27.0 | Jets de 1 à 3 sans dégâts ; PV réglés : Gorak 61, Murzug 57, Elaria 50, Sylwen 52, Brokk 83, Grimbald 65, Ervald 62, Caldrec 57 |

## 3. Événements et statuts

**Règles actuelles**

Un **événement** est une capacité propre à un personnage : *quand* (déclencheur) → *quoi* (effets). Il peut avoir une probabilité (`chance`) et un nombre maximal de déclenchements par combat (`limit`).

**Compétences en jeu** : trois par personnage, sur un 1, un 2 et un 3 au dé de dégâts du porteur. Le 3 donne une **aura permanente**. Depuis la 0.27.0, ces jets n'infligent **aucun dégât** : ils déclenchent seulement la compétence. Elles se déclenchent même si le coup est esquivé, à condition que le défenseur soit encore debout.

| Race | Dé | Compétence | Effet |
| --- | --- | --- | --- |
| Orc | 1 | Pourfendre | 0.70.0 : le 1 n'est plus sacrifié, c'est un vrai coup qui frappe pour sa valeur (Aura de puissance et critique compris) ; **s'il touche**, il pose Saignement 2, qui coule à partir du coup suivant (2 puis 1 PV). Esquivé, il ne pose rien. Remplace la Saignée (Saignement 2 sans coup, 0.68.0), qui remplaçait la Rage du sang (+5 PV) |
| Orc | 2 | Furie des vents | instantanée (0.50.0) : le 2 tombe, et l'orc frappe deux fois tout de suite, dans la même action. Depuis la 0.69.0, ce sont des **coups bruts** : leur dé ne donne que leur valeur (un 1, un 2 ou un 3 frappe pour sa valeur), sans compétence, donc sans Furie en chaîne |
| Elfe | 1 | Œil de faucon | 🎯 Critique assuré : le prochain coup qui touche est critique |
| Elfe | 2 | Esquive améliorée | 💨 sans durée (0.36.5), cumulable (0.78.0) : chaque charge esquive à coup sûr un coup reçu, même si l'adversaire sacrifie d'abord ses coups |
| Nain | 1 | Peau de pierre | 🛡️ +6 armure temporaire, cumulable, qui s'use en encaissant |
| Nain | 2 | Épines acérées | 🌵 permanentes et cumulables (0.45.0) : une charge par 2 au dé ; chaque coup encaissé pose sur l'attaquant 1 charge de Saignement par charge (0.68.0 ; avant, 1 dégât direct renvoyé par charge) |
| Mort-vivant | 1 | Souffle de la tombe | ☠️ empoisonne l'adversaire : Poison 3, soit −3, −2 puis −1 PV au début de ses tours suivants (0.36.4) |
| Mort-vivant | 2 | Vol de vie | 🦇 deux charges (0.45.0) : ses deux prochains coups qui touchent lui rendent les PV retirés ; un coup esquivé use une charge, un jet de 1 à 3 la garde |
| Orc | 3 | Aura de puissance | 💪 permanente, cumulable : +2 dégâts par charge sur chaque coup, avant l'armure |
| Elfe | 3 | Aura de précision | 🦅 permanente, cumulable : +1 au multiplicateur de critique par charge (×2 → ×3, ×2,4 → ×3,4) |
| Nain | 3 | Aura d'intimidation | 😠 permanente, cumulable : les coups de l'adversaire font 2 de moins par charge, avant l'armure |
| Humain | 1 | Peur | 😱 l'adversaire perd sa prochaine action (il tremble tant qu'il a peur) |
| Humain | 2 | Purification | retire le dernier bonus posé de l'adversaire, avec toutes ses charges (aura comprise) ; s'il n'en a aucun, 5 dégâts directs (0.42.0). Depuis la 0.69.0 (Purification double), elle retire aussi son propre dernier malus (poison, plaie, brûlure) |
| Humain | 3 | Aura de sainteté | 🕊️ permanente, cumulable jusqu'à 3 charges (0.42.0) : +2 PV par charge à la fin de chacun de ses tours |
| Homme-lézard | 1 | Coup de chance | 🍀 à sa prochaine action, un d6 vert par charge en plus de son dé, chacun joué comme un coup à part et pouvant être critique ; cumulable (0.50.0) |
| Homme-lézard | 2 | Pile ou face | 🪙 aussitôt après le 2 (0.78.0) : une pièce, pile 10 dégâts directs qui comptent comme un coup qui touche (0.78.0 ; 20 en 0.42.0) ; face, rien |
| Homme-lézard | 3 | Aura de décoction | 🧪 permanente, cumulable : chaque coup qui touche pose 2 charges de poison par charge d'aura (0.36.4) |
| Paladin | 1 | Rétribution | ⚖️ relâche la somme de ses 3 jauges (les PV des 3 derniers coups reçus) en dégâts directs, au moins 1 |
| Paladin | 2 | Riposte | ⚔️ deux charges (0.50.0) : ses deux prochains coups encaissés renvoient chacun la moitié de leurs dégâts |
| Paladin | 3 | Aura d'immunité | purge ses malus ; plus aucun malus ne peut lui être posé, et son armure gagne 1 (0.42.0) (permanente, non cumulable) |
| Mort-vivant | 3 | Aura glaciale | permanente, cumulable : au début de chacun de ses tours, 1 charge de Poison par charge d'aura sur l'adversaire (0.69.0). Une charge fige le poison à sa valeur, deux le font grossir ; l'immunité la bloque, la Régénération l'annule, une purge l'enlève |

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

**Effets disponibles** : soin, dégâts directs (ignorent armure, esquive et boucliers), pose d'un statut, purge des bonus ou des malus (tous, ou seulement les derniers posés : `count`, ex. Purification ; avec un effet de repli quand il n'y a rien à retirer : `orElse`, 0.42.0). Chaque effet vise le porteur ou son adversaire. Une compétence du dé peut aussi **sacrifier son coup** (`forfeitsHit`) : le coup du déclenchement n'inflige rien, sans esquive ni critique.

**Conditions** (`when`) : un événement peut exiger que les PV du porteur ou de l'adversaire soient sous (ou au-dessus d') une fraction de leur maximum, qu'un statut soit présent (avec un minimum de charges) ou absent, ou qu'un tour minimal soit atteint. Toutes les conditions doivent être vraies, et elles sont vérifiées avant le tirage de `chance`. Le détail est dans [STATUTS.md](STATUTS.md).

**Statuts (auras)** : effets durables, positifs (bonus) ou négatifs (malus). Ils durent jusqu'à épuisement de leurs charges, ou un nombre donné de tours du porteur. Leur cumul est `add` ou `refresh`, avec un plafond de charges facultatif. Le catalogue complet, avec leurs règles et ce qui reste à décider, est dans [STATUTS.md](STATUTS.md), et en jeu dans le compendium.

| Statut | Polarité | Règle | En jeu |
| --- | --- | --- | --- |
| 🎯 Critique assuré | bonus | le prochain coup qui touche est critique (une charge par coup) | oui (elfe) |
| 🛡️ Armure temporaire | bonus | bouclier : absorbe des points après l'armure, s'use d'autant | oui (nain) |
| 💚 Régénération | bonus | soigne au début de chaque tour du porteur | plus de porteur depuis la 0.73.0 (Fleur de vie retirée) |
| ☠️ Poison | malus | une seule valeur : autant de dégâts au début du tour du porteur, puis une charge de moins (3, 2, 1) | oui (mort-vivant, sur l'adversaire) |
| Saignement | malus | une seule valeur : chaque coup qui touche le porteur lui fait perdre autant de PV, en ignorant l'armure, puis une charge de moins (2, 1) ; une esquive ou une action perdue laissent la plaie ouverte (0.68.0) ; le coup qui ouvre ou grossit la plaie ne la fait pas couler, elle attend le suivant (0.68.1) | oui (orc et nain, sur l'adversaire) |
| 🥀 Affaibli | malus | ses coups infligent moins avant l'armure | pas encore |
| 💔 Brèche | malus | armure réduite (3 charges au plus) | pas encore |
| 🌵 Épines acérées | bonus | permanentes : chaque coup encaissé pose 1 charge de Saignement par charge sur l'attaquant (0.68.0) | oui (nain) |
| 🦇 Vol de vie | bonus | une charge par coup : le coup qui touche rend les PV qu'il retire ; esquivé, rien (2 charges) | oui (mort-vivant) |
| 🌪️ Furie des vents | bonus | une action à deux coups par charge ; charges cumulables en réserve (0.46.0) | oui (orc) |
| 💨 Esquive améliorée | bonus | chaque charge esquive un coup reçu, sans tirage (cumulable, 0.78.0) | oui (elfe) |
| Aura glaciale | bonus | permanente : au début de chacun des tours du porteur, 1 charge de Poison par charge sur l'adversaire (0.69.0) | oui (mort-vivant) |
| 💪 Aura de puissance | bonus | permanente : +2 dégâts par charge | oui (orc) |
| 😠 Aura d'intimidation | bonus | permanente : l'adversaire frappe 2 de moins par charge | oui (nain) |
| 🦅 Aura de précision | bonus | permanente : multiplicateur de critique +1 par charge | oui (elfe) |
| 😱 Peur | malus | perd sa prochaine action ; tremble tant qu'il a peur | oui (humain, sur l'adversaire) |
| 🕊️ Aura de sainteté | bonus | permanente : +2 PV par charge à la fin de ses tours, 3 charges au plus | oui (humain) |
| 🧪 Aura de décoction | bonus | permanente : chaque coup qui touche empoisonne (2 charges par charge d'aura) | oui (homme-lézard) |
| 🪙 Pile ou face | bonus | aussitôt après le 2 : une pièce, pile 10 dégâts directs qui touchent, face rien | oui (homme-lézard) |
| 🍀 Coup de chance | bonus | prochaine action : un d6 en plus, coup à part | oui (homme-lézard) |
| ⚖️ Rétribution | bonus | 3 jauges des derniers coups reçus, relâchées sur un 1 | oui (paladin) |
| ⚔️ Riposte | bonus | prochain coup encaissé : la moitié des dégâts renvoyée | oui (paladin) |
| Aura d'immunité | bonus | permanente : aucun malus ne peut être posé, armure +1 | oui (paladin) |
| Brûlure | malus | une seule valeur : dégâts à la fin des tours du porteur, autant de tours que sa valeur (0.69.0) | oui (druide, Feux follets, de retour en 0.73.0) |
| Incantation | bonus, statut de forme | dé du porteur au d3, chaque jet lance un sort, jamais de coup (0.73.0) | oui (druide, forme humaine) |
| Force de l'ours | bonus, statut de forme | chaque coup fait +3 avant l'armure (+4 jusqu'à la 0.75.0) ; le 1, le 2 et le 3 frappent aussi (0.73.0) | oui (druide, forme d'ours) |
| Aura sauvage | bonus | permanente : +2 par charge aux coups du porteur, donc à ceux de l'ours (0.73.0) | oui (druide, homme) |

**Statuts de forme** (0.73.0, `innate`, `CharacterForm.statuses`) : posés quand le personnage prend la forme (début du combat pour la première, puis à chaque métamorphose), retirés quand il la quitte. Aucune purge ne les enlève, aucune immunité ne les bloque, aucune compétence ne peut les poser (`validateRoster`). Ils s'affichent dans l'en-tête, après les compétences et les auras (0.79.0 ; avant, dans la zone d'état), avec leur valeur (Force de l'ours « +3 », Incantation « d3 », 0.79.7). Rancune, Sève, Aura de rancune et Aura de sève (0.71.0) sont retirées en 0.73.0.

**Durées** : un statut posé pendant un tour n'est pas décompté à la fin de ce tour. « 1 tour » posé pendant l'action vaut donc pour le tour d'après : la prochaine action du porteur (Furie des vents, décomptée en fin de tour) ou le tour de l'adversaire (Épines, décomptées au début du tour du porteur). L'Esquive améliorée n'a plus de durée depuis la 0.36.5 : elle attend le prochain coup reçu. Les auras n'ont pas de durée : leur médaillon affiche leurs charges.

**En combat** : un coup sacrifié n'a pas d'élan, et le journal le note (« Ervald retient son coup (2) : aucun dégât »). Le nom de la compétence flotte ensuite. La Furie des vents s'annonce au-dessus de l'orc. Puis **deux dés** roulent ensemble : le second jaillit en tournoyant dans une bourrasque bleutée, avec un son de rafale. Les deux coups partent coup sur coup, avec un élan court. Le dé du coup en cours ressort pendant que l'autre s'efface.

**Pile ou face** : la pièce part aussitôt, juste après le 2 qui la déclenche (0.78.0 ; avant, elle remplaçait l'action suivante). Elle tournoie en l'air (son de pièce), puis retombe sur pile (sabres croisés, carillon doré, « PILE ! ») ou sur face (tête de lézard, « FACE… »). Pile vaut **10 dégâts directs** (0.78.0, `COIN_HEADS` ; 20 depuis la 0.42.0) et compte comme un coup qui touche : l'Aura de décoction empoisonne avec lui. **Aura de décoction** : le poison tombe à l'impact du coup qui le pose (0.78.0), pas dans une étape à part. **Coup de chance** : le d6 apparaît en vert à côté du dé habituel, et les deux coups partent en rafale comme ceux de la Furie. **Peur** : la victime tremble de gauche à droite tant qu'elle a peur.

**Personnages à formes (druide, 0.35.0)** : il commence sous sa première forme, puis en change **au tout début de chacun de ses tours, sauf le premier** (étape `shift`, avant ses statuts). Ses compétences dépendent de sa forme (`CharacterEvent.form`), et chaque forme peut porter des statuts de forme (0.73.0).
- **À l'écran** : fondu entre les deux silhouettes, avec éclair de sève, feuilles et son. L'en-tête du combat montre les trois dés de la forme en cours ; la sélection montre les deux rangées.
- **Forme humaine** (0.73.0, Incantation) : un d3, un sort par jet, jamais de coup. **Foudre** (1) : 3 fois 2 dégâts directs (0.76.0 ; 5 avant), jamais critiques, avec l'événement de scène `lightning`. **Feux follets** (2) : Brûlure 3. **Aura sauvage** (3, cumulable) : +2 par charge aux coups.
- **Forme d'ours** (0.73.0, Force de l'ours) : aucun sort ; chaque jet frappe, +3 avant l'armure (+4 jusqu'à la 0.75.0).
- **Dégâts directs en plusieurs coups** (0.76.0, `hits` d'un effet `damage`) : `hits` coups de `amount` chacun, comptés ensemble (détail dans `parts`, comme une relâche de Rétribution). Dégâts directs : jamais critiques, sans armure, esquive ni bouclier. `validateRoster` exige un entier d'au moins 2.
- **Coups transformés** (`reshapesHit`) : la mécanique reste au moteur, sans porteur depuis le retrait de Charge et de Coup de griffe (0.73.0).

**Événements de scène** (0.73.0, `scenes.ts`, `SceneEvent.tsx`) : présentation seule, pour les sorts et coups spéciaux à grand spectacle. Une compétence porte `scene: '<id>'` ; le rejeu joue alors une vue sur toute l'arène (sous les combattants, plus un éclair au-dessus) et une sur la colonne de la cible, au rythme du combat (vitesse, pause). Depuis la 0.76.0, un événement a plusieurs impacts (`SceneTiming.impacts`, en ms à ×1) : chaque coup tombe sur le sien. Le premier, `lightning` (Foudre, impacts à 440, 800 et 1 160 ms, durée 1 750) : l'arène s'assombrit, trois éclairs à branches tombent l'un après l'autre autour de la cible (à gauche, à droite, au centre), chacun avec son éclat de lumière, son tonnerre et son « 2 ». Les trois chiffres sont égaux, aucun n'est doré ni lourd : rien ne ressemble à un critique.

**L'ogre (0.35.0)** n'a aucune compétence : un 1, un 2 ou un 3 lui pose **Attente**. Il ne frappe pas, et l'état retombe au début de son tour suivant (`expiresAt: 'turnStart'`).

**Rappels visuels des états** (`look` dans le registre des statuts) : **seule l'aura de personnage** (posée sur un 3) illumine le modèle, depuis la 0.34.0. Elle donne un halo qui respire, un cercle lumineux au sol, des particules qui montent et un contour de la silhouette à sa couleur : vert pour le poison, orange pour la puissance, rouge sombre pour l'intimidation, or pour la précision, ivoire pour la sainteté, vert d'eau pour la décoction, or pâle pour l'immunité. Les autres états n'éclairent plus le modèle : leurs liserés sont gardés dans le registre pour plus tard. Sous **Esquive améliorée**, l'elfe devient translucide ; sous la **Peur**, le combattant tremble. Depuis la 0.79.0, l'aura n'est plus dans la zone d'état : elle est dans l'**en-tête**, à la suite des sceaux des compétences, avec le même **double contour** (doré, puis un anneau tournant à sa couleur) tant qu'elle est active, éteinte sinon ; son effet est relayé dans la zone d'état sous un état générique (voir « À l'écran »).

**Textes flottants et code couleur** : un seul texte par événement, placé à l'extérieur des combattants.
- **Violet** : le nom d'un statut qui agit sans autre signe, sur son porteur. Depuis la 0.79.5, le nom d'une compétence ne flotte plus au-dessus de son lanceur : son sceau s'allume dans la barre de compétences, et un coup spécial a son label sous le dé ; une aura qui agit allume son anneau ; un statut qui réagit avec un label (Riposte, Épines, Vol de vie) n'écrit plus son nom.
- **Rouge** : les dégâts ; **or** et plus grands : les critiques et les coups lourds, avec un chiffre qui tremble.
- **Vert** : les soins.
- **Fuchsia** : un malus posé sur la cible (Peur, Poison), ou ce qu'il lui coûte : « Tour perdu » quand la Peur lui fait perdre son action (2026-10-21 ; avant, le nom « Peur » flottait à nouveau en titre violet et se lisait comme une nouvelle Peur). Ce texte vient du nom de l'état générique (`STATES.lostTurn`).
- **Ambre** : un bonus posé sur un autre que le lanceur.
- **Cyan** : ESQUIVE.
- **Gris** : résisté, neutralisé, déjà au maximum, rien à purifier. Une compétence cumulable reposée à son plafond n'affiche que ce texte neutre (« … au maximum »), sans titre, aura, label ni son (0.78.0). Une purge à vide dit « Rien à purifier », une seule fois et seulement si la compétence n'a rien fait d'autre (0.79.5 : Purification sans rien à retirer, puis la lumière frappe). Un combattant vaincu perd son aura (halo, cercle, particules, contour) en fondu au K.O. (0.78.0).

**Sens du mouvement** (2026-10-21, demande de l'utilisateur ; remplace la règle de la 0.68.3) : le sens dit **gain ou perte de la chose nommée**, pas bon ou mauvais. Un statut **gagné**, bonus ou malus, **monte** (Peur posée sur Naraxes, Poison de l'Aura de décoction) ; un statut **perdu** (bonus dissipé, malus purifiés) **tombe**. Les PV perdus tombent, les PV regagnés montent ; « Tour perdu » tombe ; un fait neutre (résisté, neutralisé, au maximum, rien à purifier) et ESQUIVE montent. Un **critique monte toujours**, même si ce sont des PV perdus. La couleur, elle, dit la polarité (fuchsia pour un malus). Le sens est décidé avec le texte (`Badge.rises`, `effectBadge`, `narration.ts`). Un texte qui monte avec l'impact d'un coup (le Poison de la décoction et son « −7 ») part au-dessus du chiffre des dégâts, pour que les deux ne se croisent pas. En 0.68.3, toute perte tombait, dont un malus posé : le mot « Peur » descendait comme s'il était perdu.

**Coup encaissé** (0.68.3, demande de l'utilisateur) : un coup ordinaire ne montre que la posture « coup encaissé », sans recul ni éclair. Seul un critique repousse en plus le combattant, à l'opposé de son adversaire, puis le ramène.

**Ressenti** (0.34.0) : les dégâts directs d'une compétence sont joués comme des coups, avec élan, impact, gros chiffre et son.
- La **Rétribution** frappe une fois par jauge, en rafale, et le dernier coup est lourd.
- **Pile** fait fondre la voleuse sur sa cible.
- La **Riposte** est un contre-coup ; les **Épines acérées** posent la plaie sur l'attaquant. Le **Saignement** coule à l'impact (0.68.1) : un badge de modificateur « Saignement +2 » tombe sous le dé avec la frappe, comme « Critique ×2 », en rouge sang sombre ; ses PV perdus (chiffre rouge sombre sous les dégâts du coup) et son compteur suivent d'un battement, avec le son Ronge.
- **Sons** : le son d'un événement se déduit de ce qu'il produit (voir [SONS.md](SONS.md)).
- **Critique** : arrêt sur image, éclair, coup sourd et chiffre qui tremble.

**Deux niveaux de lecture** (0.79.0, [STATUTS.md](STATUTS.md#deux-niveaux-de-lecture-en-combat-0790), `src/game/states.ts`) : l'en-tête dit ce que le personnage **sait faire**, la zone d'état ce qu'il **subit ou porte**.
- **Barre de compétences** (`SkillBar`, 0.79.1 : sous l'en-tête, au bord de l'arène, au-dessus du camp de chacun, sur un voile sombre ; en 0.79.0, dans l'en-tête après le nom) : un **sceau** octogonal de 56 px par compétence, son nom écrit dessous, avec la face du dé (ou le double) en pastille. Très effacé au repos (0.80.1), il s'allume quand sa face sort, avec un tintement visuel : un éclat de lumière qui part de lui et s'étend vite sur une grande partie de l'arène, un anneau fin qui file plus loin, et son nom qui s'éclaire un instant. Puis il retombe en douceur, sur environ 2,6 s à ×1 (0.80.2) : on voit ce qui vient de se déclencher. Puis ses **auras**, en médaillon rond : l'anneau tourne et les charges s'affichent (« ×2 ») tant qu'elle est active, et le médaillon est éteint sinon. Une compétence qui ne fait que poser une aura se fond dans ce médaillon (Aura de puissance ; l'Ouverture et l'Aura mélodieuse de la barde). Ensuite viennent ses règles de forme (druide). Les jauges de Rétribution se comptent sur le sceau de Rétribution. Chaque sceau a l'infobulle de sa compétence, qui liste les **états** qu'elle fait apparaître et chez qui.
- **Zone d'état** : des **états génériques** au vocabulaire commun (Puissance, Affaibli, Bouclier, Critique assuré, Critique renforcé, Esquive assurée, Dé en plus, Soin, Drain, Renvoi, Épines, Immunité, Poison, Saignement, Brûlure, Tour perdu…). Les statuts de même effet y font **un seul médaillon au total signé** (Fausse note et Affaibli : « Affaibli −7 »). Une aura qui agit sur l'adversaire y relaie son effet comme un malus ordinaire : l'Aura d'intimidation de Brokk met « Affaibli −2 » chez lui. Une aura sur son porteur ne s'y relaie pas (0.79.7) : elle se lit sur son anneau, dans la barre, avec sa valeur (« +4 »). L'infobulle détaille chaque part, son effet, ses tours restants et d'où elle vient (« Vient de : Œil de faucon (Elaria) »). Les mécanismes internes (Pile ou face, Furie des vents, Attente) n'y entrent plus.
- **Signal d'activation** (`SignalLayer`) : quand une compétence ou une aura pose un état visible, une lueur (verte pour un bonus, rouge pour un malus) part de son sceau et file vers la zone d'état de la cible ; l'état apparaît à son arrivée, 340 ms plus tard à ×1. Le vol suit la vitesse et la pause.
- **Emblèmes d'état** (0.79.2) : chaque état est une pièce gravée monochrome de 48 px (0.79.3), posée telle quelle sans cadre, toutes rondes et de même taille, le compteur dessus ; la polarité se lit à une teinte légère de la pièce (vert ou rouge, 0.79.3), au compteur et à la rangée. Une compétence garde son icône peinte dans son sceau : les deux ne montrent plus la même image.

**À l'écran** : les états actifs s'affichent dans la **zone d'état**, posée sur l'arène au-dessus de la tête de chaque combattant. Les bonus sont à gauche et les malus à droite, séparés par un trait fin. Chaque état est un médaillon de 64 px avec son icône peinte, cerclé de vert (bonus) ou de rouge (malus) ; l'anneau est en **pointillés** quand l'état fait perdre des PV à chaque tour (Poison, Brûlure, Pourriture, 0.52.1), et **un seul nombre** : les tours restants (avec le sablier) si le statut a une durée, sinon ses charges. Un statut peut imposer l'un ou l'autre (`counter`). **Chaque fois que ce nombre change** (bouclier entamé, tour décompté, cumul, critique assuré consommé…), au moment même où la résolution a lieu, **un seul geste, sur le compteur** (0.71.1) : le chiffre défile dans sa fenêtre, vers le haut pour une hausse, vers le bas pour une baisse ; le compteur s'élargit et s'éclaire (hausse) ou se tasse et s'assombrit (baisse). **Rien ne flotte depuis le compteur** (2026-10-21, demande de l'utilisateur) : la variation « +2 » qui montait ou « −1 » qui tombait à côté de lui (0.23.0 à 0.79.x) est retirée, les textes flottants du combat disent déjà ce qui change. Une valeur cachée qui change (les charges d'un statut qui affiche ses tours) n'anime rien. **L'effet et sa conséquence sont montrés ensemble** : quand le poison agit, le « −2 » flottant et le compteur qui passe de 3 à 2 apparaissent au même instant ; le Poison de l'Aura de décoction, son médaillon et les dégâts du coup apparaissent à l'impact, sans signal d'activation (`landRide`). **Un état épuisé ou expiré descend à 0 dans son propre médaillon** (défilement), puis s'efface ; reposé pendant sa sortie, il reprend vie dans ce médaillon. Au survol, chaque état a une **infobulle** (nom, bonus ou malus, effet actuel, tours restants et charges), centrée au-dessus du médaillon et devant tout le reste (combattants, journal, commandes), utilisable aussi en pause. Le décompte des durées est une étape à part de la résolution, visible à son moment (après l'effet du statut, avant l'action) et notée au journal (« ⏳ Poison sur Brokk : encore 2 tours »). Le survol donne le détail. Une aura discrète au sol signale aussi bonus et malus. Un événement déclenché est mis en scène : aura violette sur son porteur, et son nom en **texte flottant violet**, comme ESQUIVE ou CRITIQUE. Suivent les badges sur la cible de chaque effet, le son, puis une ligne dans le journal. Les statistiques de fin comptent les événements, les PV regagnés, les critiques assurés, les dégâts absorbés par les boucliers, les dégâts subis hors des coups et les malus reçus.

**Historique**

| Version | Changement |
| --- | --- |
| 0.81.0 | Moteur v2 (branche `moteur-v2`, `docs/MOTEUR_V2.md`) : étapes du moteur avec leur cause, mise en scène regroupée par cause (moments de cues), table des durées, lecteur à horloge unique ; textes flottants qui ne s'écrasent plus, pause qui fige aussi la secousse, plaie et statuts posés toujours à l'impact de leur coup |
| 0.80.2 | Sceau déclenché : pic vif puis retombée en douceur (≈ 2,6 s à ×1), nom compris ; un sceau n'est plus coupé net par le déclenchement d'un autre |
| 0.80.1 | Barre de compétences : sceaux au repos plus discrets ; au déclenchement, éclat de lumière qui part du sceau et s'étend sur une grande partie de l'arène, avec un anneau fin et le nom qui s'éclaire |
| 0.80.0 | Zone de surcharge (RESOLUTION.md § 11) : ce qui change le coup en cours, couleur selon la source, signe vu de l'attaquant (− hachuré), sans Pile ou face, Furie, Coup de chance, Rétribution ni doubles, ni auras ; nouvelles surcharges (Esquive assurée, Armure temporaire, Fausse note, Luciole). Textes flottants : un statut gagné monte, un statut perdu tombe ; « Tour perdu » au lieu de « Peur » ; plus de variation flottante sur les compteurs d'état |
| 0.79.7 | Une aura sur son porteur se lit sur son anneau (sa valeur, « +4 »), plus dans la zone d'état ; règles de forme avec leur valeur ; anneau des états liés retiré |
| 0.79.6 | L'anneau de l'aura ne marque plus que les bonus qu'elle donne à son porteur, jamais un malus chez l'adversaire |
| 0.79.5 | Plus de nom de compétence flottant au-dessus du lanceur (sceau allumé, label) ; « Rien à purifier » seul pour une purge à vide ; Saignement de Pourfendre à l'impact ; infobulles : « Sur l'adversaire : … » pour un statut posé sur l'adversaire |
| 0.79.4 | Un état donné par une aura active porte l'anneau tournoyant de cette aura, à sa couleur |
| 0.79.3 | Emblèmes d'état à 48 px, teinte légère verte ou rouge selon la polarité |
| 0.79.2 | Emblèmes d'état (pièces gravées monochromes, planche v12) posés sans cadre dans la zone d'état ; l'Aura d'immunité ne se montre plus deux fois |
| 0.79.1 | Barre de compétences sortie de l'en-tête, posée dessous sur l'arène : sceaux et auras de 56 px, nom sous chaque sceau, pastilles et compteurs agrandis, sceaux moins éteints au repos |
| 0.79.0 | Deux niveaux de lecture : en-tête de sceaux de compétence (face du dé en pastille, éteints au repos) et d'auras (anneau qui tourne quand elle est active) ; zone d'état réservée aux états génériques, regroupés au total signé, avec les effets relayés des auras ; infobulles qui disent d'où vient un état et quels états pose une compétence ; signal d'activation du sceau vers la zone d'état de la cible |
| 0.78.0 | Pile ou face aussitôt après le 2, pile à 10 ; Esquive améliorée cumulable ; Dent de loup une fois par combat ; labels : une couleur par type (`SPECIAL_KINDS`), en colonne, labels des reliques, un son par label ; poison de l'Aura de décoction à l'impact du coup ; charges au maximum en texte neutre seul ; aura éteinte au K.O. ; Foudre : les trois « -2 » visibles |
| 0.76.0 | Foudre en trois éclairs : 3 × 2 dégâts directs (`hits` d'un effet `damage`), un impact par éclair (`SceneTiming.impacts`) ; Force de l'ours +4 → +3 |
| 0.73.0 | Druide refondu : Incantation (homme, d3, Foudre, Feux follets, Aura sauvage) et Force de l'ours (+4 à chaque coup) ; statuts de forme (`innate`) ; événements de scène (Foudre) ; retirés : Fleur de vie, Écorce épaisse, Charge, Coup de griffe, relais des formes et ses auras, `bonusPer` |
| 0.71.1 | Zone d'état : un seul geste sur le compteur (chiffre qui défile, variation qui monte ou tombe), sans anneau ni filtre ; un état épuisé descend à 0 dans son propre médaillon (il renaissait à 0) et un état reposé pendant sa sortie ne se double plus ; une valeur cachée n'anime plus le médaillon |
| 0.71.0 | Druide : relais des formes (Rancune touché en homme, Sève touché en ours), Aura de sève et Aura de rancune sur les 3 ; `bonusPer` sur `applyStatus` ; Brûlure, Pourriture et Aura de pourriture sans porteur |
| 0.70.0 | Pourfendre (Gorak) ; compétence de jet qui ne part que si son coup touche (`needsTouch`) : un coup doit toucher pour poser un malus physique ; son dé de compétence s'allume à l'impact |
| 0.69.0 | Aura glaciale qui pose du vrai Poison au début des tours d'Ervald (crochets `onOpponentTurnStart` et `stoppedByImmunity` retirés) ; Furie des vents en coups bruts, sans chaîne (Gorak au d9, 19 % de critique) ; Brûlure à une seule valeur (`turnsFromStacks`) ; Purification double d'Ysolde |
| 0.68.1 | Saignement : le coup qui ouvre la plaie ne la fait plus couler (règle générale : un coup ne réagit qu'aux statuts d'avant ses fenêtres) ; badge « Saignement +2 » sous le dé à l'impact, PV de la plaie joués sur la même frappe |
| 0.68.0 | Saignement, nouveau malus qui coule à chaque coup reçu (`decays` sur une réaction) ; Saignée de Gorak à la place de la Rage du sang ; Épines acérées de Brokk, qui font saigner au lieu de renvoyer des dégâts |
| 0.52.1 | Médaillons : retour au vert et au rouge (les couleurs de famille de la 0.51.0 sont retirées) ; anneau en pointillés pour les dégâts périodiques |
| 0.51.0 | Médaillons des états à la couleur de leur famille (retiré en 0.52.1) |
| 0.50.0 | Aura de poison renommée Aura glaciale ; Écorce épaisse et Peau de pierre posent la même Armure temporaire ; Feux follets au lieu de la Luciole ; Furie des vents instantanée (dé de Gorak de d10 à d8) ; Coup de chance cumulable ; l'Aura d'immunité arrête l'Aura de poison ; Écorce épaisse à 7, Riposte à deux charges, Luciole à 4 charges |
| 0.46.0 | Furie des vents cumulable en réserve ; barde : « ding » sur tout double, Siffloter et Fausse note frappent aussi leurs deux coups, esquive de 12 à 6 % |
| 0.45.0 | Notes de l'utilisateur et audit : Épines permanentes (1 par charge), Vol de vie à deux charges, barde à 2 charges sur ses doubles 2 et 3 ; Aura de poison au début du tour adverse, avec le Poison ; textes clarifiés (Aura de poison, Aura mélodieuse, Fausse note) |
| 0.42.0 | Audit des six compétences signalées : Pile ou face (pile à 20 qui touche, face vide), Aura de sainteté plafonnée à 3, Purification avec 5 dégâts de repli (`cleanse.orElse`), Aura d'immunité avec +1 d'armure (esquive d'Aldric de 5 à 2 %), Fleur de vie en Régénération 2 × 3 tours ; Rétribution inchangée |
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
| 0.46.1 | Zone d'état plus grande : médaillons de 64 px au lieu de 48, compteurs agrandis |
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
Accueil (menu)
 ├─ Combat test : combat direct, chaque dé choisi par le joueur (décor de la forêt d'entraînement par défaut, ou toute arène ; hors statistiques)
 ├─ Duel : sélection → Affrontement → Jouer → Combat → Fin
 │                                   └─ Simuler ───────→ Fin
 ├─ Tournoi : présentation → Configuration → Arbre → (Affrontement | Simuler) → Fin → Arbre → Champion
 ├─ Compendium : Combattants (fiche | performances) | Compétences | Statuts | Reliques | Règles
 └─ Statistiques globales ─→ (fiche d'un personnage dans le compendium)
```

- **Accueil** (0.59.0, seuil de l'arène en 0.66.0, retouché en 0.66.1, 0.66.2 et 0.67.1) : premier écran du jeu. Le joueur est sur le seuil de l'arène : au fond, la porte et la lumière de l'arène (`menu-duel.jpg`, le même décor que la sélection) ; de chaque côté de l'allée, une **haie de six combattants** en garde, sur trois plans (avant ≈ 52 % de la hauteur de l'écran, milieu ≈ 46 %, arrière ≈ 41 %), chaque plan plus petit et plus sombre que le précédent, ses pieds plus haut vers la porte. De chaque côté, le milieu est au bord, l'avant devant lui, et l'arrière dépasse entre l'avant et l'allée. À gauche, Ysolde devant, Aldric au milieu et Gorak derrière (ordre choisi par l'utilisateur) ; à droite, Ervald devant, Elaria au milieu et Naraxes derrière. Les avants sont des silhouettes compactes, sans profusion de motifs, qui ne concurrencent pas le logo (Fanchon, trop détaillée, a été retirée du premier plan). Tous regardent vers le centre (miroir à droite), sont mis à l'échelle par la hauteur, ancrés sur leurs pieds, avec une ombre de contact ; aucun ne sort de l'écran ni n'entre dans l'allée. Les emplacements sont une liste (`homeHedge.ts`) : on les change sans toucher à l'écran. Au premier plan, dans l'allée, le logo « BATTLER » puis le choix du mode, sur un voile sombre localisé : **Duel et Tournoi**, deux choix de même rang, réunis dans **une seule pièce prestige** (un cadre octogonal, deux plaques d'or identiques), chacun avec sa ligne d'explication (celle du tournoi affiche la progression d'un tournoi en cours). **Combat test** n'est plus qu'un lien discret, en bas au centre. Un clic ouvre le mode ; au clavier, Tab, les flèches entre Duel et Tournoi, et Entrée (au focus, le cadre passe en or clair et la plaque s'éclaire). Statistiques et Compendium en boutons ronds en haut à gauche, son et musique en haut à droite, version du jeu en bas à droite.
- **Sélection du duel** : bouton « ← Menu » en haut à gauche, à côté de Statistiques et Compendium. Pour chaque combattant : son nom en grand, avec un petit bouton rond pour ouvrir sa fiche, sa race et son archétype, ses stats, ses compétences en dés et un bouton « Au hasard » (icône de dé), avec son grand modèle. **Rail des combattants** (0.43.0) : au centre, sous les modèles, une carte par personnage (portrait et nom), comme le tableau de sélection d'un jeu de combat. Deux onglets aux couleurs des camps disent qui choisit (« Combattant de gauche », « de droite ») : un clic sur une carte la donne à ce camp, puis la main passe en face. Cliquer un modèle donne aussi la main à son camp. Une carte choisie porte le liseré de son camp et une pastille A ou B ; les deux camps peuvent prendre le même personnage. Bouton « Combattre » centré en bas, version du jeu. En haut à gauche : Statistiques et **Compendium** (bouton rond provisoire). Le bouton rond près du nom ouvre la fiche du personnage dans le compendium.
- **Affrontement** : en haut, sous « Affrontement » et un peu en retrait, le sélecteur d'arène ‹ nom › (flèches de l'écran ou du clavier), qui change le décor en fond. Puis les deux modèles, leurs stats en **barres** (les mêmes que sur l'écran de sélection, à la couleur du camp), leur événement, et les boutons JOUER, SIMULER et CHANGER.
- **Combat** : dés animés, charge et impact, textes flottants ESQUIVE, CRITIQUE et nom de l'événement (à l'extérieur des combattants, sur le décor, en Alegreya Sans SC ; test de police avec `?police=cinzel|oswald|lilita`), zone d'état au-dessus de chaque combattant, fond d'arène assombri. L'arène occupe tout l'écran sous les barres de vie. Une barre de commandes flottante (pause, vitesse ×1/×2/×4, journal) est placée en bas au centre. Le **journal**, masqué au départ, s'ouvre dans une fenêtre translucide entre les combattants (bouton ou touche J), avec un compteur des lignes non lues. S'il est ouvert, il le reste pour les combats suivants de la session. Les dégâts directs y sont signalés comme tels (« l'armure ne compte pas »).
- **Taille des combattants** (0.40.0, `STYLE_BIBLE.md` § 2) : une échelle resserrée, ni uniforme ni réaliste. Le nain (0,86 d'un humain) reste le plus petit, l'ogre (1,13) le plus grand, avec des étapes entre les deux : lézard 0,97, humains et druide 1,00, elfes 1,03, paladin 1,04, mort-vivant 1,05, orc 1,08. L'ours du druide, à quatre pattes depuis la 0.67.0, est aussi haut que le druide (0,96) et une fois et demie plus long que haut : il grossit, il ne grandit pas. Toutes les images sont affichées à leur largeur naturelle : la carrure vient du dessin, l'ogre retrouve la sienne.
- **Postures** (0.40.0, [POSTURES.md](POSTURES.md)) : un combattant peut changer d'image au fil du combat, sur cinq moments communs à tous : l'attaque (pendant l'élan), l'esquive, le coup encaissé, le K.O. et la victoire. La compétence garde l'image de garde et son animation. Une posture absente retombe sur la garde : un personnage sans postures s'affiche comme avant. Les images sont préchargées et changent instantanément, sous les animations existantes (élan, saut). Avec une posture de K.O., la chute est dans l'image, et l'animation ne garde que le grisé. Les menus et panneaux passent au-dessus des combattants. **Tout le roster a ses postures** depuis la 0.67.0 : l'orc (Gorak), avec sa nouvelle image originale, la voleuse (Naraxes), la barde (Fanchon), le mort-vivant (Ervald, 0.54.0, postures plus amples) le paladin (Aldric, 0.56.0, nouveau modèle) la prêtresse (Ysolde, 0.57.0), l'elfe (Elaria, 0.58.0), le nain (Brokk, 0.65.0, nouveau modèle original), l'ogre (Morgrut, 0.65.0) et le druide (Thaldrin, 0.67.0), sous ses deux formes : chaque forme a ses propres postures, et l'ours bouge en animal, à quatre pattes.
- **Trace de résolution** (vérification et débogage) : chaque combat est tiré avec une **graine** et sa trace complète est écrite dans la **console du navigateur**, repliée, un groupe par tour. Elle donne, étape par étape et dans l'ordre du moteur : phase (ouverture, début, action, fin), jet de dé, esquive, critique, modificateurs de dégâts avec leur porteur (« 😠 Aura d'intimidation de Brokk −2 », plancher à 1 signalé), dégâts avant armure, armure, boucliers, plancher d'1 dégât, PV avant → après, compétences et effets (posé, annulé, bloqué), effets des statuts, décomptes de durée et expirations, puis l'état des deux combattants. Le bouton « Copier la trace » du journal et de l'écran de fin la copie en texte brut. **Sur le disque** (0.27.0, serveur de dev) : chaque combat écrit sa trace dans `logs/combats/` du projet, un fichier par combat (`<date>_<gauche>-vs-<droite>_graine-<n>.txt`), relisible sans navigateur. En console : `battler.trace()` (dernier combat), `battler.trace(n)`, `copy(battler.dump())` (copie les traces des 40 derniers combats, un tournoi entier), `battler.replay(graine, 'gorak', 'brokk')` (rejoue un combat à l'identique).
- **Combat test** (0.60.0, outil de mise au point des compétences ; il remplace le mode triche des combats normaux) : entrée « Combat test » de l'accueil. Pas de sélection ni d'affrontement : le combat commence aussitôt (initiative tirée sans animation, notée au journal), par défaut dans son décor réservé, la forêt d'entraînement du Pré-aux-Guetteurs, sans ambiance. **Chaque dé attend le joueur** : sous chaque combattant, un pavé propose les faces de son dé (Pile et Face pour la pièce) et « Hasard ». Seul le pavé de celui qui a la main s'allume, à la couleur de son camp, une fois le coup précédent mis en scène ; l'autre montre son dé, éteint. Le reste (compétences, statuts, fin de tour, passage de main) se résout seul jusqu'au dé suivant ; les deux dés de la barde et les dés d'une rafale se choisissent un par un. Clavier : 1 à 9, 0 pour 10, P et F, H ou Retour arrière pour le hasard. Chaque choix fait résoudre le combat à nouveau par le moteur (`forcedRolls`), avec la même graine : ce qui précède reste identique ; « Hasard » garde le dé tiré. Esquive, critique et chances des compétences restent au hasard. Le dé choisi porte la mention « Imposé ». En haut de l'arène : un sélecteur par camp (Gauche, Droite) qui relance le combat avec un autre personnage, et au centre un menu déroulant d'arène (0.64.0 : la forêt d'entraînement, puis les huit arènes des duels) suivi des boutons Recommencer (nouvelle initiative) et Menu. Changer d'arène ne change que le décor : le combat en cours continue, et l'arène choisie reste pour les combats suivants du mode (Recommencer, changement de personnage). Rien n'est compté dans les statistiques ; la trace finale est écrite dans `logs/combats/` (suffixe `_triche` dès qu'un dé est choisi), et `npm run logs` la rejoue.
- **Fin** : à gauche, le vainqueur, les faits marquants et les boutons ; à droite, les statistiques comparées en quatre onglets (Bilan, Critiques et défense, Événements, Dés). Un badge indique un combat simulé.

**Historique**

| Version | Changement |
| --- | --- |
| 0.1.0 | Écrans d'accueil, de combat et de fin ; animations de charge et d'impact |
| 0.68.3 | Écran de fin et affrontement : les toiles larges (Morgrut, Ysolde, Aldric, Ervald, Elaria, Brokk) calées sur leur silhouette (`bodyInset`), l'ogre n'est plus décalé sur son nom ; scène mise à l'échelle par `zoom` (plus de croix claire dans les disques arrondis) ; ours du druide entier à droite ; pertes qui tombent, critiques qui montent ; seul un critique fait reculer |
| 0.67.3 | Accueil : Gorak plus grand (47 %) et monté (pieds à 80 %), sa tête dépasse nettement d'Ysolde |
| 0.67.2 | Accueil : Gorak un peu plus grand à l'arrière gauche (44 % de la hauteur), sa tête dépasse d'Ysolde |
| 0.67.1 | Accueil, gauche de la haie : Ysolde devant, Aldric au milieu, Gorak derrière |
| 0.67.0 | Postures du druide sous ses deux formes ; l'ours devient un animal à quatre pattes (charge, recul, bond, couché au K.O., rugissement) ; tout le roster a ses postures |
| 0.66.2 | Accueil : Aldric au premier plan gauche à la place de Fanchon (trop riche en détails), Ysolde derrière lui |
| 0.66.1 | Accueil : Duel et Tournoi de même rang, deux plaques d'or dans une seule pièce prestige ; haie aux plans resserrés (52, 46 et 41 %), avants étroits, arc d'Elaria qui ne sort plus de l'écran |
| 0.66.0 | Accueil : le seuil de l'arène (porte au fond, haie de six combattants sur trois plans, logo et modes dans l'allée) remplace le triptyque ; Duel en pièce prestige, Tournoi en serti, Combat test en lien discret |
| 0.65.0 | Postures de Brokk (nouveau modèle original, fin du dernier placeholder) et de Morgrut ; titre de l'écran de fin devant le vainqueur |
| 0.64.0 | Combat test : menu déroulant d'arène (forêt d'entraînement ou l'une des huit arènes), sans relancer le combat |
| 0.63.0 | Combat test dans la forêt d'entraînement ; sélection : nouveau fond en gouache (`menu-duel.jpg`) |
| 0.62.0 | Accueil : fond et illustrations des arches en gouache graphique ; combat test dans le marais des Pilotis ; nouveau fond du tournoi |
| 0.61.1 | Accueil : aucune arche mise en avant, l'or seulement au survol ; survol plus doux (élévation, zoom de l'illustration) ; bouton principal et médaillons retirés, un clic ouvre le mode |
| 0.61.0 | Accueil en triptyque : trois arches de fer forgé (illustration, médaillon, socle titré), volets tournés vers le centre ; choix au clic ou aux flèches, ouverture par le bouton principal |
| 0.60.0 | Combat test : chaque dé choisi sur un pavé sous chaque combattant, sélecteurs de personnages, fond noir ; le bouton Cheat quitte les combats normaux |
| 0.59.0 | Écran d'accueil avec menu (Combat test à venir, Duel, Tournoi) ; la sélection perd ses onglets de mode au profit d'un retour au menu |
| 0.58.0 | Postures d'Elaria |
| 0.57.0 | Postures d'Ysolde (taille réglée sur le corps) |
| 0.56.0 | Nouveau modèle d'Aldric (épée basse, taille réglée sur le corps) et ses postures |
| 0.54.0 | Postures d'Ervald, plus amples (presque de profil, action parallèle à l'image) ; atelier des postures ; découpe des planches par silhouettes (`slice-poses.py --contours`) |
| 0.43.0 | Accueil : un rail central de dix cartes (portrait et nom) remplace les deux grilles de vignettes ; le camp actif choisit, puis la main passe en face |
| 0.40.0 | Postures des combattants (attaque, esquive, coup encaissé, K.O., victoire ; retour à la garde, préchargement, K.O. sans bascule, menus au-dessus des combattants) ; tous les combattants à leur largeur naturelle, avec une échelle de tailles resserrée (nain 0,86 → ogre 1,13 d'un humain) ; découpe et alignement des planches (`slice-poses.py`) ; l'orc, premier personnage à postures, avec une nouvelle image originale |
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
| 0.39.0 | Fin de la refonte au design system : bouton principal, onglets de mode et sceau VS en pièces prestige, cartes de compétence en lame (couleur selon la nature), textes sur illustration ombrés |
| 0.38.8 | Refonte au design system (étapes 1 à 8, `docs/design-system.md`) : tokens, camps azur et cramoisi, jauges, statistiques à paliers, onglets mineurs soulignés, boutons sertis, panneaux voilés à liseré de camp ; vignette du personnage choisi en face estompée |

## 5. Arènes

**Règles actuelles**

Une arène est le cadre visuel d'un combat. Elle est purement décorative et ne change aucune règle. On la choisit sur l'écran d'affrontement, avec le sélecteur ‹ › placé sous le titre (le décor du fond change avec lui). Par défaut, le choix est « Au hasard » : l'arène est tirée au lancement de chaque combat. Le choix est gardé pour la session. La simulation directe n'affiche pas d'arène.

Chaque arène porte le nom d'un **lieu-dit** et, dessous, du lieu qui l'entoure, comme sur une carte. Les décors sont peints en gouache graphique (voir `docs/STYLE_BIBLE.md`, section 5).

| Arène | Image | Ambiance |
| --- | --- | --- |
| Les Pierres-Couchées, bois de Vaumorin | `arena-glade.jpg` | clairière de ruines, chouette, renard, vallée et château au loin |
| La Cour-des-Enclumes, Durnhold | `arena-dwarf-city.jpg` | cour d'une cité naine, forge, statues, porte sur la vallée enneigée |
| Les Mille-Feux, lac Sorelle | `arena-lantern-lake.jpg` | ponton de fête sur un lac, la nuit, lanternes |
| Les Chapeaux-Fols, val Brunelle | `arena-mushroom-vale.jpg` | vallée de champignons lumineux dans la pénombre |
| Les Cloches-Noyées, anse de Morvoux | `arena-tide-temple.jpg` | temple marin à marée basse, soir d'orage |
| La Paume-du-Vieux, pic Solange | `arena-sky-hand.jpg` | paume d'une statue géante au-dessus des nuages, à l'aube |
| Les Pilotis, marais de Gâtebois | `arena-swamp.jpg` | marais sur pilotis, nuit de pleine lune |
| Le Pas-des-Comètes, col d'Aubrelle | `arena-terrace.jpg` | terrasse en altitude, pluie d'étoiles filantes, vallée et arène au loin |

**Arène d'entraînement** : Le Pré-aux-Guetteurs, forêt de Brandeval (`arena-training.jpg`, `TRAINING_ARENA`) : une clairière d'entraînement à l'aube, des yeux dans les fourrés. C'est le décor par défaut du combat test, et il n'apparaît nulle part ailleurs : ni au choix, ni au hasard. Depuis la 0.64.0, le combat test peut aussi prendre n'importe quelle arène des duels (menu déroulant), pour voir un décor en combat.

Chaque arène a son cadrage du sol (`focus`), pour que les pieds tombent sur la zone dégagée, et son traitement (assombri, désaturé, sans flou depuis la 0.64.2). En combat, le décor passe aussi sous l'en-tête des noms et des PV, une bande vitrée (voile et flou d'arrière-plan) : il est dessiné en taille naturelle, ancré à la hauteur de `focus`, et déborde au-dessus de l'arène sans changer le cadrage du sol.

| Version | Changement |
| --- | --- |
| 0.10.0 | Première image d'arène en fond de combat (placeholder) |
| 0.12.0 | Arène originale : ruines forestières |
| 0.16.0 | Registre des arènes, choix sur l'écran d'affrontement, Cour de Durnhold |
| 0.62.0 | Six arènes en gouache graphique, nommées par lieux-dits ; « Au hasard » par défaut ; le marais réservé au combat test ; anciennes arènes retirées |
| 0.63.0 | Le Pas-des-Comètes ; le marais rejoint les arènes ; le combat test passe dans la forêt d'entraînement (Le Pré-aux-Guetteurs) |
| 0.64.0 | Combat test : toutes les arènes au choix dans un menu déroulant (la forêt d'entraînement reste le décor par défaut) |
| 0.64.2 | Fonds sans flou ; en-tête du combat vitré, le décor passe dessous |
| 0.64.3 | En-tête du combat plus sombre (voile renforcé, décor assombri sous la vitre) |

## 6. Son

Les règles du son sont dans [SONS.md](SONS.md) et font foi : vocabulaire de 20 sons, ce que chacun veut dire, son de chaque étape du combat, son d'une nouvelle compétence. Le bouton muet en haut à droite est mémorisé (`battler:muted`). **Son et musique sont coupés par défaut** (0.68.2) : on les rallume avec leurs boutons, et ce choix est gardé.

- **Un son = une signification = un fichier** (`src/assets/sounds/<son>.mp3`), joué avec la Web Audio API. Un son sans fichier joue sa version synthétisée.
- **Un instant = un son.** Seul le Coup critique en joue deux ensemble (Coup et Grondement).
- **Le son d'une compétence se déduit de ses effets** (`cueOf`) : aura posée, aura retirée, malus posé, bonus posé, statut retiré, soin ; les dégâts sonnent avec leurs coups. Une nouvelle compétence n'a donc rien à déclarer.
- **Silences** : l'élan, le jet maximal, les faces de compétence (1, 2 et 3), les durées qui baissent et les statuts qui expirent ne sonnent pas.
- **Vitesse** : à ×2 et ×4, les sons du combat sont écourtés au prorata, avec un fondu. Le clic, le choc du face-à-face, le KO et la victoire jouent en entier.
- **Ajouter ou remplacer un fichier** : traiter la source avec `scripts/process-sounds.py`, copier le fichier retenu sous le nom du son (`SOUND_NAMES`), régler son volume dans `MIX`.
- **Musique de fond** (0.48.0, [SONS.md](SONS.md) § 10) : pendant chaque combat joué, une boucle tirée au hasard parmi trois (`src/assets/music/`), quelle que soit l'arène, en boucle sous les effets. Elle entre en fondu, s'efface au KO pour laisser ressortir le KO et la victoire, puis s'arrête en fondu à l'écran de fin. Chaque piste est égalisée à −29 LUFS, environ 15 dB sous les effets. Elle a son propre bus, hors du compresseur des effets, et le bouton du son la coupe aussi. Un second bouton, sous celui du son, coupe la musique seule (0.53.0), et ce choix est gardé d'une partie à l'autre.

| Version | Changement |
| --- | --- |
| 0.2.0 | Ajout des effets sonores et du bouton muet |
| 0.53.0 | Second bouton, sous celui du son : couper la musique seule (choix gardé) |
| 0.68.2 | Son et musique coupés par défaut, rallumés à la main (choix gardé) |
| 0.77.1 | Bouton de la musique : icône peinte (tambour et baguettes, barré de rouge quand la musique est coupée) à la place de la note dessinée |
| 0.48.0 | Musique de fond des combats : trois boucles déposées par l'utilisateur, une au hasard par combat, égalisées et discrètes |
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
- La **fiche personnage**, dans le compendium (section Combattants, voir § 9), montre la grande illustration au centre et deux onglets à droite. L'onglet **Fiche** rassemble ce qui définit le personnage : devise, histoire, forces et faiblesses, caractéristiques et compétences en résumé. L'onglet **Performances** rassemble ce qu'il a fait, lu dans le même historique que l'écran Statistiques : 12 indicateurs, le bilan par adversaire et les derniers combats, avec un lien « Voir dans Statistiques ». L'onglet choisi est conservé quand on passe d'un personnage à l'autre.
- L'écran **Statistiques** montre le classement global et la matrice des confrontations en deux onglets, ainsi que les derniers combats. Chaque nom de personnage (classement, lignes et colonnes des confrontations, derniers combats) mène à sa fiche. On peut tout remettre à zéro, après confirmation.
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
| 0.72.0 | L'onglet Statistiques de la fiche devient **Performances**, avec un lien vers l'écran Statistiques ; les noms des confrontations et des derniers combats mènent à la fiche |

## 8. Tournoi

**Règles actuelles**

- On y entre par l'entrée **Tournoi** de l'accueil (0.59.0) : présentation, puis « Créer un tournoi » ou « Reprendre le tournoi ». « ← Menu » ramène à l'accueil.
- Arbre à élimination directe de 16 participants : huitièmes, quarts, demies, finale. Les deux moitiés de l'arbre convergent vers la finale au centre.
- **Configuration** (refonte 0.47.0) : la palette des combattants est le grand panneau central de l'arbre. Ce sont dix cartes avec le nombre de cases prises. On choisit le combattant (le pinceau, en or), puis on clique les cases du premier tour, aux deux extrémités : elles sont grandes et numérotées de 1 à 16. Au survol d'une case vide, le pinceau s'y montre. Le × vide une case. Les tours suivants ne sont que des jonctions : les lignes convergent vers le panneau et s'éclairent quand un match est rempli. **Compléter** remplit seulement les cases vides, en équilibrant le roster et en évitant les duels miroirs au premier tour quand c'est possible. **Valider l'arbre** est la pièce prestige de l'écran.
- Les doublons sont permis ; ils sont nommés avec des chiffres romains (Gorak I, Gorak II…).
- **Suivi** : les cases du premier tour, aux extrémités, sont plus larges et numérotées. Chaque match prêt a un liseré d'or et propose Affronter (passe par l'écran d'affrontement) ou Simuler. « Simuler le tour » simule tous les matchs prêts du tour en cours. Le chemin des vainqueurs est tracé en or, le perdant est éteint, et le champion s'affiche au centre. Le décor est la porte de l'arène, très assombrie, comme pour la configuration.
- Les matchs alimentent l'historique global. Le tournoi n'est pas sauvegardé, il est perdu au rechargement.
- **Sacre** : après la finale, jouée ou simulée, l'**écran du champion** le montre en grand, avec son parcours (les quatre adversaires battus), le bilan cumulé de son tournoi (dégâts, critiques, plus gros coup, soins, esquives, compétences, précision, dégâts encaissés), les compétences déclenchées et ses reliques. « Dégâts infligés » compte aussi les dégâts hors coups (Foudre, poison, saignement, brûlure, riposte, reliques), comme « Dégâts encaissés », et la case donne la part hors coups (0.78.0).
- **Reliques** (0.75.0, règles complètes : [RELIQUES.md](RELIQUES.md)) : chaque victoire, sauf la finale, rapporte une relique. Le vainqueur en choisit une parmi trois qu'il n'a pas encore, au hasard ; il en porte donc trois au plus. Elles changent ses stats (Caractéristique), ses coups (Coup), le début de certains de ses tours (Tour) ou réagissent aux PV (Seuil), avec charges et recharge. Une relique agit sur son porteur : jamais de malus sur l'adversaire, seulement des dégâts directs. **Douze reliques** (0.77.0), trois par type : Contrepoids de plomb, Bottes de feutre, Cotte du mercenaire ; Osselet fendu, Dé creux, Fer à quatre clous ; Cloche d'ouverture, Chapelet de l'ermite, Clepsydre du siège ; Dent de loup, Collier de ronces, Trophée du chasseur.
  - **Récompense** : sur l'écran de victoire d'un match de tournoi (joué, ou simulé depuis l'écran d'affrontement), le bouton principal devient **Récompense**. Il ouvre un menu superposé de trois grandes cartes, la carte du vainqueur marquée « Choix de… » ; l'observateur peut en choisir une autre (**Imposer ce choix**). Un match simulé depuis l'arbre garde le choix du vainqueur.
  - **Où on les voit** : sceaux hexagonaux à côté du nom en combat (infobulle, charges restantes, sceau éteint une fois dépensé ; quand la relique agit, son sceau s'illumine et son label (type Relique) se pose sous le dé à l'instant où son bonus s'applique (0.78.0), sans aura sur le porteur ; ligne dorée au journal), sous la fiche à l'écran d'affrontement (la stat changée passe en or), à côté du nom dans l'arbre (les reliques portées pour ce match ; seule l'infobulle du sceau survolé s'ouvre, 0.78.0), sur l'écran du champion, dans le compendium. Les cotes des paris en tiennent compte. **Dent de loup** ne se déclenche qu'une fois par combat (0.78.0, `charges: 1`).
  - **Interrupteur Reliques** (0.78.0) : sur l'écran de configuration du tournoi ; désactivé, personne ne gagne ni ne porte de relique, et l'arbre, l'écran de victoire et le sacre n'en montrent aucune. Le choix est gardé pour le tournoi suivant de la session.

| Version | Changement |
| --- | --- |
| 0.8.0 | Mode tournoi complet |
| 0.8.1 | Boutons de configuration rendus cliquables ; un seul bouton Compléter, qui respecte les cases placées à la main |
| 0.34.0 | Écran du champion (parcours et bilan cumulé du tournoi) |
| 0.38.0 | Classement des parieurs dans l'arbre et sur l'écran du champion ; écran de fin en deux moitiés (combat, paris) |
| 0.13.0 | Un match ne peut plus être enregistré deux fois, ni avec les mauvais combattants ; l'arbre valide le résultat avant l'historique |
| 0.47.0 | Arbre refait au design system : extrémités grandes et numérotées, palette en grand panneau central (dix cartes, pinceau, actions), jonctions en configuration, chemin des vainqueurs en or, décor de la porte de l'arène |
| 0.59.0 | Accès par l'entrée Tournoi du nouvel écran d'accueil |
| 0.75.0 | Reliques : une par victoire (choix parmi trois, au hasard, modifiable sur l'écran de victoire), portées aux matchs suivants, visibles en combat, à l'affrontement, dans l'arbre (colonnes des tours 2 et 3 élargies à 184 px) et sur l'écran du champion |
| 0.77.0 | Douze reliques, trois par type (proposition de l'autre agent, revue par l'utilisateur), à la place de la série de test ; une relique s'annonce sur son sceau, plus sur le personnage |
| 0.77.1 | Icônes peintes des douze reliques dans leur sceau, à la place de l'initiale gravée |
| 0.78.0 | Interrupteur Reliques à la configuration ; labels des reliques sous le dé ; Dent de loup une fois par combat ; infobulles des reliques de l'arbre une à une ; écran du champion : dégâts infligés hors coups comptés |

## 9. Compendium

**Règles actuelles**

Le compendium est le **savoir** du jeu : ce qui ne change pas d'un combat à l'autre. Les résultats (classement, confrontations, historique, tournois) sont dans l'écran Statistiques. Principe : **une donnée, une maison**. Chaque information est décrite dans une seule section ; ailleurs, elle n'apparaît qu'en résumé, avec un lien vers elle. Tout est généré à partir des registres du code, donc toujours à jour.

En tête : le retour, le titre, quatre onglets soulignés (avec le nombre d'entrées des Combattants et des Statuts) et, en haut à droite, le **filtre de la section** (texte libre, sans accents ni casse ; chaque section garde le sien). Pas de recherche globale.

| Section | Contenu |
| --- | --- |
| **Combattants** | Index compact à gauche (portrait, nom, race · archétype, lignes de 60 px), fiche à droite, chacun dans son cadre. Entre les deux, le combattant choisi **se tient en fond** de tout l'écran, en grand : l'index et la fiche passent devant lui, il s'efface sur les côtés, dans le sol et derrière le titre et les onglets, sans être coupé ; les tailles relatives des combattants sont gardées. La fiche défile dans son cadre, dont le bas reste visible. Onglet **Fiche** : race et archétype, nom, devise, histoire, forces et faiblesses, caractéristiques, puis les **compétences en résumé** (sceau, nom, dé, texte, pastilles, statut posé) : le nom mène à l'index des compétences, le statut à sa fiche. Onglet **Performances** (ex-onglet Statistiques de la fiche) : le résumé lu dans le même historique que l'écran Statistiques (indicateurs, contre chaque adversaire, derniers combats ; noms en liens) et un lien « Voir dans Statistiques » |
| **Compétences** | Index dense de toutes les compétences, **groupées par race** (une race par bandeau, avec son nombre). Colonnes : Compétence (sceau, nom, nature · dé), Effet (texte et pastilles), Statut posé (lien vers sa fiche, polarité et cible), Porteurs (liens vers leur fiche). Filtre par nature : Toutes, Martiale, Adresse, Arcane, Neutre. Les faces identiques d'un même porteur n'ont qu'une ligne (Attente, dés 1, 2, 3) |
| **Statuts** | Bonus et malus **réunis dans un seul index** (filtre Tous / Bonus / Malus, avec leur nombre), groupés par polarité : la couleur et le mot (BONUS, MALUS) la disent. À droite, le détail du statut choisi : sceau, nom, polarité, résumé ; encadrés **Effet**, **Consommation** et **Cumul** (liens vers les règles communes) ; **Posé par** (compétence, nature, déclencheur, cible, race et porteurs ; et les statuts qui le posent par leurs crochets) ; **Interactions** (opposition, immunité, statut qu'il pose, renfort, purge). Seuls les statuts mis en jeu y figurent ; les statuts « à venir » ne sont que dans `STATUTS.md` |
| **Reliques** | Les objets gagnés en tournoi (`relics.ts`), même disposition que les Statuts : index groupé par type (Caractéristique, Coup, Tour, Seuil), filtre par type avec leur nombre, et le détail de la relique choisie : sceau hexagonal biseauté (0.75.0, la forme des reliques partout), nom, type, phrase d'ambiance ; encadrés **Quand** (moment, charges, recharge, conditions) et **Effet** (statut posé en lien), le type expliqué, et comment on l'obtient. Le texte vient de `describeRelic`. Chaque relique a son icône peinte (0.77.1) ; une relique sans icône montrerait son initiale, gravée en or |
| **Règles** | Les règles communes, écrites une seule fois (`rules.ts`) et regroupées : tour, dés, esquive, critique, armure et dégâts, déclenchement des compétences, statuts (durée, charges, cumul). Les textes sont repris tels quels de leurs sources ; les cartes ne les répètent plus. Une pastille de compétence (« coup sacrifié », « s'il touche », condition, chance…) ou un lien de statut (« Cumulable », « Durée ») y mène et met la règle en évidence |

- **Texte d'une compétence** : une seule rédaction (`describeSkill`), affichée par la fiche, l'index et l'infobulle des dés. Ce qui relève d'une règle commune y est une pastille, pas une phrase.
- **Sceaux** : l'icône peinte dans un cercle serti, liseré à la polarité (vert bonus, rouge malus) ou à la nature de la compétence (or martiale, acier adresse, violet arcane, gris neutre).
- **Accès** : un bouton rond en haut à gauche de l'accueil, le bouton rond près du nom d'un combattant (qui ouvre directement sa fiche), ou un nom dans l'écran Statistiques (classement, confrontations, derniers combats).
- **Retour** : le bouton retour ramène à l'écran d'où l'on vient (accueil, sélection ou statistiques). La sélection en cours est conservée.
- **Extensible** : une section de plus = un composant et une entrée dans `sections.tsx` (marche à suivre dans `ARCHITECTURE.md`).

| Version | Changement |
| --- | --- |
| 0.18.0 | Création du compendium : verticales Personnages (fiches déplacées depuis l'ancien écran) et Bonus et malus |
| 0.19.1 | Bonus et malus : uniquement les statuts en jeu, sous-onglets Bonus / Malus, grille de cartes encadrées 4 par ligne |
| 0.19.2 | Fiche personnage : le personnage passe en grand en arrière-plan |
| 0.20.1 | Bonus et malus : la provenance (qui pose le statut) n'est plus affichée sur les cartes |
| 0.21.0 | Nouvelle verticale Compétences, entre Personnages et Bonus et malus |
| 0.25.0 | Fiches et cartes de compétence avec deux compétences par race ; puce « coup sacrifié » sur Vol de vie |
| 0.26.0 | Trois compétences par race dans la verticale Compétences (une rangée de trois cartes par race) |
| 0.72.0 | Réorganisation « une donnée, une maison » : sections Combattants (Fiche, Performances), Compétences (index dense, filtre par nature), Statuts (bonus et malus réunis, détail, posé par, interactions) et nouvelle section Règles ; filtre par section ; texte unique d'une compétence, partagé avec l'infobulle des dés ; liens croisés dans les deux sens ; Rétribution enfin listée |
| 0.74.0 | Combattants : le personnage passe en fond de l'écran (plus coupé par sa colonne), fiche encadrée qui défile dans son cadre ; nouvelle section Reliques |

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
| 0.77.1 | Icônes peintes : bourse (en-tête des plateaux, classement), jeton (« Combien ? »), embrasse de rideau (coup de théâtre), ticket (bouton « Parier ») |
