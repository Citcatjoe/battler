# Fonctionnalités

Chaque section donne les règles actuelles, puis l'historique de la fonctionnalité (version → changement). Le détail de chaque version se trouve dans le [CHANGELOG](../CHANGELOG.md).

---

## 1. Combat

**Règles actuelles**

- **Initiative** : chaque combattant lance 1d10, le plus haut frappe en premier (on relance en cas d'égalité). Ensuite, les deux frappent chacun à leur tour.
- **Un tour = trois phases** pour le joueur actif (l'attaquant) : **début de tour** (ses statuts périodiques agissent, bonus puis malus, et leurs durées diminuent), **action** (l'attaque, ou un tour perdu s'il est Étourdi), **fin de tour** (effets de fin de tour, comme la Brûlure, et durées « fin »). Les règles complètes de résolution (fenêtres, ordre, application, opposition, interactions) sont dans [RESOLUTION.md](RESOLUTION.md).
- **Attaque**, dans cet ordre (les stats utilisées sont les stats *effectives*, modifiées par les statuts) :
  1. L'attaquant lance son **dé de dégâts** (1d8 à 1d10 selon le personnage). Le dé reste affiché même si le coup est esquivé.
  2. Le défenseur tente d'**esquiver** (sa chance d'esquive). S'il réussit, le coup ne fait aucun dégât.
  3. **Critique** (sa chance de critique, ou forcé par un statut) : le jet est multiplié par son multiplicateur (×2 à ×2,5), arrondi.
  4. Les **modificateurs de dégâts** s'appliquent : sortants, de l'attaquant (ex. Affaibli), puis entrants, du défenseur (ex. Vulnérable). Le coup garde au moins 1.
  5. L'**armure** du défenseur retire des points, mais le coup fait toujours au moins 1.
  6. Les **boucliers** du défenseur (ex. armure temporaire) absorbent ensuite des points, sans faire descendre le coup sous 1, et s'usent d'autant.
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

## 2. Personnages et roster

**Règles actuelles**

Quatre races, chacune avec un archétype de base et une variante de coloris aux stats légèrement différentes.

| Personnage | Race · archétype | PV | Dé | Armure | Esquive | Critique | Multiplicateur |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gorak | Orc · Brute | 61 | d10 | 0 | 5 % | 10 % | ×2 |
| Murzug | Orc · Berserker | 57 | d10 | 0 | 5 % | 18 % | ×2 |
| Elaria | Elfe · Rôdeuse | 48 | d8 | 0 | 33 % | 22 % | ×2 |
| Sylwen | Elfe · Sentinelle sylvestre | 50 | d8 | 0 | 26 % | 17 % | ×2,4 |
| Brokk | Nain · Gardien | 52 | d8 | 2 | 6 % | 8 % | ×2,5 |
| Grimbald | Nain · Briseur de fer | 50 | d10 | 1 | 6 % | 8 % | ×2,5 |
| Ervald | Mort-vivant · Chevalier liche | 56 | d8 | 1 | 8 % | 12 % | ×2 |
| Caldrec | Mort-vivant · Faucheur d'âmes | 54 | d10 | 0 | 8 % | 16 % | ×2 |

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

## 3. Événements et statuts

**Règles actuelles**

Un **événement** est une capacité propre à un personnage : *quand* (déclencheur) → *quoi* (effets). Il peut avoir une probabilité (`chance`) et un nombre maximal de déclenchements par combat (`limit`).

**Événements en jeu** (tous sur un 1 naturel au dé de dégâts du porteur, même si le coup est esquivé, à condition que le défenseur soit encore debout) :

| Race | Événement | Effet |
| --- | --- | --- |
| Orc | Rage du sang | +5 PV (sans dépasser le maximum) |
| Elfe | Œil de faucon | 🎯 Critique assuré : le prochain coup qui touche est critique |
| Nain | Peau de pierre | 🛡️ +4 armure temporaire, cumulable, qui s'use en encaissant |
| Mort-vivant | Souffle de la tombe | ☠️ empoisonne l'adversaire : −2 PV au début de chacun de ses 3 tours suivants |

**Déclencheurs disponibles**, du point de vue du porteur :

| Déclencheur | Moment |
| --- | --- |
| `combatStart` | au début du combat |
| `turnStart` | au début de chacun de ses tours |
| `turnEnd` | à la fin de chacun de ses tours |
| `naturalOne` / `naturalMax` | il fait 1 / le maximum au dé de dégâts |
| `hit` / `crit` | il touche / il porte un critique |
| `missed` | son coup est esquivé |
| `dodge` | il esquive un coup |
| `hurt` | il encaisse un coup |
| `bloodied` | la première fois qu'il passe sous la moitié de ses PV |

**Effets disponibles** : soin, dégâts directs (ignorent armure, esquive et boucliers), pose d'un statut, purge des bonus ou des malus. Chaque effet vise le porteur ou son adversaire.

**Conditions** (`when`) : un événement peut exiger que les PV du porteur ou de l'adversaire soient sous (ou au-dessus d') une fraction de leur maximum, qu'un statut soit présent (avec un minimum de charges) ou absent, ou qu'un tour minimal soit atteint. Toutes les conditions doivent être vraies, et elles sont vérifiées avant le tirage de `chance`. Le détail est dans [STATUTS.md](STATUTS.md).

**Statuts (auras)** : effets durables, positifs (bonus) ou négatifs (malus). Ils durent jusqu'à épuisement de leurs charges, ou un nombre donné de tours du porteur. Leur cumul est `add` ou `refresh`, avec un plafond de charges facultatif. Le catalogue complet, avec leurs règles et ce qui reste à décider, est dans [STATUTS.md](STATUTS.md), et en jeu dans le compendium.

| Statut | Polarité | Règle | En jeu |
| --- | --- | --- | --- |
| 🎯 Critique assuré | bonus | le prochain coup qui touche est critique (une charge par coup) | oui (elfe) |
| 🛡️ Armure temporaire | bonus | bouclier : absorbe des points après l'armure, s'use d'autant | oui (nain) |
| 💚 Régénération | bonus | soigne au début de chaque tour du porteur | pas encore |
| ☠️ Poison | malus | dégâts au début de chaque tour du porteur | oui (mort-vivant, sur l'adversaire) |
| 🥀 Affaibli | malus | ses coups infligent moins avant l'armure | pas encore |
| 💔 Brèche | malus | armure réduite (3 charges au plus) | pas encore |

**À l'écran** : les statuts actifs s'affichent dans la **zone d'état**, posée sur l'arène au-dessus de la tête de chaque combattant. Les bonus sont à gauche et les malus à droite, séparés par un trait fin. Chaque état est un médaillon avec son icône peinte, cerclé de vert (bonus) ou de rouge (malus), et **un seul nombre** : les tours restants (avec le sablier) si le statut a une durée, sinon ses charges. Un statut peut imposer l'un ou l'autre (`counter`). Le survol donne le détail. Une aura discrète au sol signale aussi bonus et malus. Un événement déclenché est mis en scène : aura violette sur son porteur, et son nom en **texte flottant violet**, comme ESQUIVE ou CRITIQUE. Suivent les badges sur la cible de chaque effet, le son, puis une ligne dans le journal. Les statistiques de fin comptent les événements, les PV regagnés, les critiques assurés, les dégâts absorbés par les boucliers, les dégâts subis hors des coups et les malus reçus.

**Historique**

| Version | Changement |
| --- | --- |
| 0.9.0 | Système déclencheur → effets (soin, bonus), trois premiers événements, affichage des bonus |
| 0.13.0 | Registre des statuts, positifs ou négatifs, avec durée, cumul et crochets de règles. 10 déclencheurs, 4 types d'effets, `chance` et `limit`, ciblage de l'adversaire. Auras au sol et pastilles colorées. Quatre statuts prêts pour de futurs événements |
| 0.18.0 | Conditions d'événement (`when`), plafond de charges (`maxStacks`), résumé et règles de chaque statut générés depuis le code, catalogue des statuts (en jeu ou à venir) |
| 0.20.0 | Couche de résolution : phase de fin de tour, contrôle (perte d'action), réactions des statuts, dégâts entrants, garde, immunités, opposition ; déclencheur `turnEnd` ; cinq statuts à venir qui illustrent chaque mécanique |
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

- **Accueil** : bascule duel/tournoi. Pour chaque combattant : son nom en grand, avec un petit bouton rond pour ouvrir sa fiche, sa race et son archétype, ses stats, son événement, les vignettes de 64 px rangées par famille (une colonne par race, l'original en haut, ses variantes dessous) et un bouton « Au hasard » (icône de dé). Grand modèle de chaque combattant, bouton « Combattre » centré en bas, version du jeu. En haut à gauche : Statistiques et **Compendium**, ce dernier par un bouton rond provisoire (son intégration définitive reste à définir). Le bouton rond près du nom ouvre la fiche du personnage dans le compendium.
- **Affrontement** : en haut, sous « Affrontement » et un peu en retrait, le sélecteur d'arène ‹ nom › (flèches de l'écran ou du clavier), qui change le décor en fond. Puis les deux modèles, leurs stats en **barres** (les mêmes que sur l'écran de sélection, à la couleur du camp), leur événement, et les boutons JOUER, SIMULER et CHANGER.
- **Combat** : dés animés, charge et impact, textes flottants ESQUIVE, CRITIQUE et nom de l'événement, zone d'état au-dessus de chaque combattant, fond d'arène assombri. L'arène occupe tout l'écran sous les barres de vie. Une barre de commandes flottante (pause, vitesse ×1/×2/×4, journal) est placée en bas au centre. Le **journal**, masqué au départ, s'ouvre dans une fenêtre translucide entre les combattants (bouton ou touche J), avec un compteur des lignes non lues. S'il est ouvert, il le reste pour les combats suivants de la session.
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
| 0.19.0 | Affrontement : stats en barres, arène un peu plus bas sous le titre ; combat : zone d'état et événements en texte flottant |
| 0.12.0 | Nouveau fond d'arène original (ruines forestières au crépuscule) |

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

Sons synthétisés avec la Web Audio API, sans fichier audio : clic, roulement et arrêt du dé, élan, impact (selon les dégâts), critique, esquive, événement, KO, victoire. Le bouton muet en haut à droite est mémorisé (`battler:muted`).

| Version | Changement |
| --- | --- |
| 0.2.0 | Ajout des effets sonores et du bouton muet |
| 0.9.0 | Son d'événement |

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
| 0.14.1 | Fiche personnage en deux onglets (Fiche / Statistiques), pour éviter le débordement |
| 0.18.0 | La fiche personnage est déplacée dans le compendium |

## 8. Tournoi

**Règles actuelles**

- Arbre à élimination directe de 16 participants : huitièmes, quarts, demies, finale. Les deux moitiés de l'arbre convergent vers la finale au centre.
- **Configuration** : on choisit un personnage dans la palette, puis on clique les cases. Le × vide une case. 🎲 **Compléter** remplit seulement les cases vides, en équilibrant le roster et en évitant les duels miroirs au premier tour quand c'est possible.
- Les doublons sont permis ; ils sont nommés avec des chiffres romains (Gorak I, Gorak II…).
- **Suivi** : chaque match prêt propose ⚔ Affronter (passe par l'écran d'affrontement) ou ⚡ Simuler. « ⚡ Simuler le tour » simule tous les matchs prêts du tour en cours. Le champion s'affiche au centre.
- Les matchs alimentent l'historique global. Le tournoi n'est pas sauvegardé, il est perdu au rechargement.

| Version | Changement |
| --- | --- |
| 0.8.0 | Mode tournoi complet |
| 0.8.1 | Boutons de configuration rendus cliquables ; un seul bouton Compléter, qui respecte les cases placées à la main |
| 0.13.0 | Un match ne peut plus être enregistré deux fois, ni avec les mauvais combattants ; l'arbre valide le résultat avant l'historique |

## 9. Compendium

**Règles actuelles**

Le compendium est le recueil du jeu : tout ce qu'on peut y consulter, rangé en **verticales**, une par onglet. Son contenu est généré à partir des registres du code, il est donc toujours à jour.

| Verticale | Contenu |
| --- | --- |
| **Personnages** | La liste par famille (race, puis original et variantes) et la fiche du personnage choisi, avec ses onglets Fiche et Statistiques (voir § 7). Le personnage est peint **en arrière-plan**, en grand, à la place de l'ancien modèle : assombri, fondu au sol et sur les côtés, avec un halo chaud, et passant sous les encadrés translucides de la fiche. La mise en page ne change pas |
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

