# Fonctionnalités

Chaque section donne les règles actuelles, puis l'historique de la fonctionnalité (version → changement). Le détail de chaque version se trouve dans le [CHANGELOG](../CHANGELOG.md).

---

## 1. Combat

**Règles actuelles**

- **Initiative** : chaque combattant lance 1d10, le plus haut frappe en premier (on relance en cas d'égalité). Ensuite, les deux frappent chacun à leur tour.
- **Attaque**, dans cet ordre :
  1. Le défenseur tente d'**esquiver** (sa chance d'esquive). S'il réussit, le coup ne fait aucun dégât.
  2. L'attaquant lance son **dé de dégâts** (1d8 à 1d10 selon le personnage).
  3. **Critique** (sa chance de critique, ou forcé par un bonus) : le jet est multiplié par son multiplicateur (×2 à ×2,5), arrondi.
  4. L'**armure** de base du défenseur retire des points, mais le coup fait toujours au moins 1.
  5. L'**armure temporaire** (bonus) absorbe ensuite des points, sans faire descendre le coup sous 1, et s'use d'autant.
- **Fin** : le premier à 0 PV perd. Une limite de sécurité arrête le combat à 1 000 tours.
- **Jouer ou simuler** : les deux options appellent le même moteur. « Jouer » anime le résultat calculé à l'avance, « Simuler » l'affiche directement à l'écran de fin.

**Historique**

| Version | Changement |
| --- | --- |
| 0.1.0 | 50 PV pour tous, dégâts de 1 à 10 (1d10), initiative, journal |
| 0.3.0 | Esquive et critique (×2) ; personnages modélisés par une classe `Character` |
| 0.4.0 | Stats propres à chaque race (PV, dé, armure, esquive, critique, multiplicateur) |
| 0.6.0 | Moteur pur `simulateCombat` : le mode joué ne fait plus que rejouer un script |
| 0.9.0 | Événements et armure temporaire intégrés à l'attaque |

## 2. Personnages et roster

**Règles actuelles**

Trois races, chacune avec un archétype de base et une variante de coloris aux stats légèrement différentes.

| Personnage | Race · archétype | PV | Dé | Armure | Esquive | Critique | Multiplicateur |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gorak | Orc · Brute | 61 | d10 | 0 | 5 % | 10 % | ×2 |
| Murzug | Orc · Berserker | 57 | d10 | 0 | 5 % | 18 % | ×2 |
| Elaria | Elfe · Rôdeuse | 48 | d8 | 0 | 33 % | 22 % | ×2 |
| Sylwen | Elfe · Sentinelle sylvestre | 50 | d8 | 0 | 26 % | 17 % | ×2,4 |
| Brokk | Nain · Gardien | 52 | d8 | 2 | 6 % | 8 % | ×2,5 |
| Grimbald | Nain · Briseur de fer | 50 | d10 | 1 | 6 % | 8 % | ×2,5 |

Une variante est définie à partir de son original (`variant()`), avec des écarts de stats et un filtre de couleur sur la même image.

**Historique**

| Version | Changement |
| --- | --- |
| 0.1.0 | Deux combattants à partir de l'image de l'orc, l'un retourné |
| 0.4.0 | Ajout de l'elfe et du nain, archétypes de race, une variante de coloris par personnage, sélection libre |

## 3. Événements

**Règles actuelles**

Un **événement** est une capacité propre à une race, qui se déclenche à un moment précis du combat. Aujourd'hui, le seul déclencheur est un **1 naturel au dé de dégâts** de l'attaquant, si le défenseur est encore debout.

| Race | Événement | Effet |
| --- | --- | --- |
| Orc | Rage du sang | +5 PV (sans dépasser le maximum) |
| Elfe | Œil de faucon | Le prochain coup qui touche est un critique assuré (🎯) |
| Nain | Peau de pierre | +4 armure temporaire (🛡️), cumulable, qui s'use en encaissant |

Les bonus actifs s'affichent en icônes sous la barre de vie. Le déclenchement est mis en scène (aura, titre, badge d'effet, son) et noté dans le journal. Les statistiques de fin et l'historique comptent les événements, les PV regagnés, les critiques forcés et l'armure temporaire absorbée.

**Historique**

| Version | Changement |
| --- | --- |
| 0.9.0 | Système déclencheur → effets (soin, bonus), trois premiers événements, affichage des bonus |

## 4. Écrans et parcours

**Parcours actuel**

```
Accueil (duel | tournoi)
 ├─ Duel : sélection → Affrontement → Jouer → Combat → Fin
 │                                   └─ Simuler ───────→ Fin
 ├─ 📜 Fiche personnage
 ├─ 📊 Statistiques globales
 └─ Tournoi : Configuration → Arbre → (Affrontement | ⚡ Simuler) → Fin → Arbre
```

- **Accueil** : bascule duel/tournoi, tuiles de sélection de 64 px, bouton 🎲 Au hasard, résumé de l'événement de chaque personnage, version du jeu.
- **Affrontement** : rappel des deux modèles et de leurs stats, boutons JOUER, SIMULER et CHANGER.
- **Combat** : dés animés, charge et impact, badges ESQUIVE et CRITIQUE, journal, pause, vitesse ×1, ×2 ou ×4, fond d'arène assombri.
- **Fin** : vainqueur, et bilan par sections (attaque, critiques, défense, événements, dés). Un badge indique un combat simulé.

**Historique**

| Version | Changement |
| --- | --- |
| 0.1.0 | Écrans d'accueil, de combat et de fin ; animations de charge et d'impact |
| 0.5.0 | Tout le jeu sur une scène fixe en 16:9 (1600×900), tuiles de sélection plus petites |
| 0.6.0 | Écran d'affrontement avec Jouer et Simuler |
| 0.7.0 | Bouton 📜 Fiche sur la sélection, écran de statistiques globales |
| 0.10.0 | Image d'arène en fond du combat |
| 0.11.0 | Numéro de version sur l'accueil |

## 5. Son

Sons synthétisés avec la Web Audio API, sans fichier audio : clic, roulement et arrêt du dé, élan, impact (selon les dégâts), critique, esquive, événement, KO, victoire. Le bouton muet en haut à droite est mémorisé (`battler:muted`).

| Version | Changement |
| --- | --- |
| 0.2.0 | Ajout des effets sonores et du bouton muet |
| 0.9.0 | Son d'événement |

## 6. Statistiques et historique

**Règles actuelles**

- Tous les combats, joués ou simulés, en duel ou en tournoi, sont enregistrés dans le localStorage (`battler:history:v1`).
- Les totaux sont cumulés par personnage : combats, victoires, coups, critiques, esquives, dégâts, armure, meilleur coup, événements, PV regagnés, tournois gagnés. On garde aussi le bilan contre chaque adversaire et les 300 derniers combats.
- La **fiche personnage** montre le modèle, les stats, la comparaison avec sa variante, l'événement, 12 indicateurs, le bilan par adversaire et les derniers combats.
- L'écran **Statistiques** montre le tableau global, la matrice des confrontations et les derniers combats. On peut tout remettre à zéro, après confirmation.
- Les anciens historiques sont complétés au chargement, quand de nouveaux champs apparaissent.

| Version | Changement |
| --- | --- |
| 0.3.0 | Esquives et critiques dans les stats de fin |
| 0.7.0 | Historique local, fiche personnage, statistiques globales |
| 0.8.0 | Combats de tournoi comptés, colonne 🏆 Tournois |
| 0.9.0 | Colonne ✨ Événements, PV regagnés |

## 7. Tournoi

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
