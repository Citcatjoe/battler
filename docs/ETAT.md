# État du projet

_Dernière mise à jour : 2026-10-27, version 0.127.0 (branche `regles-v2`). Ce document dit l'état **présent** ; l'histoire des versions est dans le [CHANGELOG](../CHANGELOG.md) (seule chronique) et dans git, les règles en vigueur dans [FEATURES.md](FEATURES.md)._

## En bref

Auto-battler roguelike à regarder et à parier (fiche produit : [INTENTION.md](INTENTION.md#fiche-produit)). Prototype jouable de bout en bout : chargement, accueil (Combat test, Duel, Tournoi, Campagne), affrontement, combat animé ou simulé, écran de fin (combat et paris), compendium, statistiques, tournoi à 16 avec phase de saison, campagne avec forge du dé.

- **Dix personnages**, un par famille (Gorak, Elaria, Brokk, Ervald, Ysolde, Naraxes, Aldric, Morgrut, Thaldrin, Fanchon). Chacun a une **attaque** (petite fourchette) : chaque action porte un coup de base, le d6 désigne une face et déclenche sa compétence.
- **Huit maîtrises** (Fureur, Sang, Rempart, Poison, Chance, Lumière, Ombre, Magie ; **77 briques**, 33 auras et 44 compétences ; auras / compétences : Fureur 4/6, Sang 4/5, Rempart 5/5, Poison 4/5, Chance 4/6, Lumière 4/5, Ombre 4/6, Magie 4/6), deux par personnage ([MAITRISES.md](MAITRISES.md)) : dé de départ avec une aura de ses maîtrises sur le 1 (règle commune « le producteur d'abord » ; au choix en campagne, tirée au hasard en tournoi et en saison ; posée au plus tard au 3e tour de son porteur), sa signature sur le 2, quatre faces nues. Morgrut : attaque 6 à 8, 52 PV, quatre faces de compétence au plus.
- **Règles communes** : la Riposte et la Rétribution sont des coups ; +2 PV max par récompense ; esquive plafonnée à 75 % ; au plus 12 jets de plus par action ; un vol (Larcin, Confiscation) prend une charge ([FEATURES.md](FEATURES.md) § 1 et § 3).
- **Reliques** ([RELIQUES.md](RELIQUES.md)) et **forge du dé** ([CAMPAGNE.md](CAMPAGNE.md)) : offre commune (`offers.ts`) à la campagne, à la saison et à l'arbre.
- **Le jeu des parieurs** : deux joueurs et deux parieurs de l'ordinateur parient sur chaque match ([PARIS.md](PARIS.md)).
- **Équilibre** (`BALANCE_N=800`, `logs/balance/2026-10-27-21-00-16_v0.126.0.md`) : roster de 46,8 % (Ervald) à 54,9 % (Morgrut), pire duel Morgrut–Brokk 64 % ; construits à 10 récompenses (`npm run ramp`, `logs/ramp/2026-10-27-21-03-06_v0.126.0.md`) de 43,4 % (Thaldrin) à 62,6 % (Fanchon), écart 19,2 ; 63 départs d'aura, 7 hors de 42-58 % ; saison 38-63 %, σ 8,2 ; campagne : boss 18 %, acte 10 %. `npm run check` : 528 tests.

## État par système

| Système | État | Règles |
| --- | --- | --- |
| Moteur de combat | Un seul moteur (`simulateCombat`), trois phases par tour, fenêtres, contrôle, réactions, garde, immunités ; reproductible par graine ; audit (`audit.test.ts`), empreinte de non-régression (`balance.test.ts`), contrôle des timings (`timing.test.ts`) | [RESOLUTION.md](RESOLUTION.md), [FEATURES.md](FEATURES.md) § 1 |
| Personnages et maîtrises | Dix personnages, huit maîtrises, dé de départ, auras de départ par la règle | [PERSONNAGES.md](PERSONNAGES.md), [MAITRISES.md](MAITRISES.md), [FEATURES.md](FEATURES.md) § 2 |
| Compétences et statuts | Registres `skills.ts`, `statuses.ts`, `events.ts` ; textes générés (`describeSkill`), contrôlés par `wording.test.ts` ; icônes peintes pour tout | [STATUTS.md](STATUTS.md), [AURAS.md](AURAS.md), [FEATURES.md](FEATURES.md) § 3 |
| Mise en scène et écrans | Lecteur à horloge unique sur `staging.ts` ; postures de chaque personnage (garde, coup, esquive, blessure, K.-O., victoire, perte de contrôle, incantation des sorts offensifs) ; UI kit pour tous les contrôles (sauf combat test et magnétoscope) ; scène fixe 1600×900 | [MISE_EN_SCENE.md](MISE_EN_SCENE.md), [POSTURES.md](POSTURES.md), [ui-kit/README.md](ui-kit/README.md), [FEATURES.md](FEATURES.md) § 4 |
| Son | Règles appliquées, son déduit des effets, sons de famille ; musique de combat | [SONS.md](SONS.md), [FEATURES.md](FEATURES.md) § 6 |
| Tournoi et saison | Arbre de 16, phase de saison (construction en dix matchs), reliques et forge, aura tirée | [FEATURES.md](FEATURES.md) § 8 |
| Campagne et forge | Acte de dix combats et boss, quatre forges et six reliques, héritage, sauvegarde v5 ; chaque adversaire combattu chez lui (onze arènes de campagne, boss compris, 0.123.0 et 0.126.0), vestiaire au choix du champion, salle du trésor à la victoire | [CAMPAGNE.md](CAMPAGNE.md), [FEATURES.md](FEATURES.md) § 11 |
| Compendium | Combattants, Maîtrises, Compétences, Statuts, Reliques, Règles ; généré depuis les registres | [FEATURES.md](FEATURES.md) § 9 |
| Paris | Guichet, cotes cachées, quatre parieurs ; pas en duel ; pas de guichet de tour (P3) | [PARIS.md](PARIS.md), [FEATURES.md](FEATURES.md) § 10 |
| Statistiques | Historique `battler:history:v1` (rétrocompatible), classement, confrontations, fiches | [FEATURES.md](FEATURES.md) § 7 |

## Limites connues

- **Rang II au-dessus de la bande** : les quatre auras de Poison et d'épines (Peau de crapaud +11,0, Aura de décoction, Aura glaciale, Aura d'épines) : 1 charge s'efface quand 2 s'accumulent, aucun pas entier plus petit ; à trancher par l'utilisateur (accepter un rang au-dessus, ou un autre axe de rang).
- **Équilibre des départs** (400 combats par duel) : 7 départs sur 63 hors de 42-58 % (5 sous, dont quatre de Fanchon de 38,5 à 40,8 et Elaria Veine 39,8 ; 2 au-dessus : **Gorak à l'Aura de puissance 59,1**, Elaria à l'Ivresse du sang 63,3) et 20 duels de départ au-delà de 65/35, tous venus d'auras antérieures à la 0.127.0.
- **Builds** (`npm run ramp`) : **Fanchon construite 62,6 %** (Copie du Duo, Duo laissé en l'état par décision de l'utilisateur) ; **Aldric construit 45,2 %** (41 % de ses gravures sous la bande, dont l'Emprise sans malus +4,3) ; **Surtension chez Thaldrin construit +7,6** (sous la bande) ; **Morgrut dernier en saison** (38 %, ± 6 ; construit 44,7 %). Plume d'aigle chez Elaria construite +17,9.
- **Consommatrices hors de leur producteur** : Sangsue, Odeur du sang et Morsure sont sous la bande chez les porteurs qui produisent peu leur ressource (l'offre ne les y présente que dans 18 à 19 actes sur 120). Aura de pourriture sous la bande en moyenne (+7,0).
- **Mise en scène** : `stage()` lève « PV a,b au lieu de… » sur 1 à 2 combats sur 24 000 quand les combats s'allongent (vu dans les études, jamais sur les graines du jeu) ; la zone des bandeaux sous le dé est un chantier à part ([MISE_EN_SCENE.md](MISE_EN_SCENE.md) § 5 bis).
- **Non vu à l'écran** : les survols réels (infobulles des faces, de l'aura tirée, de la carte Graver, des PV de récompense), les sorts à scène et les rafales du Duo en mouvement, l'incantation dans un vrai combat, l'aura éveillée au 3e tour, les renvois esquivés ou critiques ; de la 0.127.0 : la scène de l'Onde de choc en combat (seule une capture figée à l'impact), le vol d'icône du Larcin et « −1 Duo », les icônes v29 dans un écran de jeu, la fiche de Morgrut et la forge à sa limite de faces. **Aucun son nouveau n'a été entendu.**
- **Combat test peu fiable** : outil de l'utilisateur, il ne sert pas à valider le gameplay ; une anomalie s'y vérifie par sa trace `_triche` ([TODO.md](TODO.md) § 19).
- **Écran de fin** : le druide vainqueur s'y montre toujours en forme humaine.
- **Fonds du 2026-10-27** (0.123.0) : vus en captures Firefox (choix du champion, affrontement et combat chez Ysolde, arbre, fin de campagne gagnée). Non vus : les neuf autres arènes de campagne à l'écran, l'écran de la saison, l'écran du champion du tournoi (même fond, axe du vainqueur à 300 px au lieu de 280). L'arène du Colosse (0.126.0) n'a pas été vue à l'écran ; les décors de Gorak, Brokk et Aldric ont été écrits avant la méthode des décors (à reprendre si l'utilisateur le demande) ([STYLE_BIBLE.md](STYLE_BIBLE.md) § 5.7).
- **Tournoi non sauvegardé** (voulu) : un rechargement le perd, bourses comprises. La graine d'un match de saison n'est affichée nulle part.
- **Traces anciennes** : celles d'avant la 0.116.0 (deux dés) et les traces de campagne d'avant la 0.111.0 ne se rejouent plus à l'identique.
- **Chargement** : environ 109 Mo (`dist/assets`), surtout les PNG des postures (piste : WebP) ; la jauge avance par fichier, sans délai maximal.
- **Hors du UI kit** : le combat test, le magnétoscope, les interrupteurs, les pastilles de filtre du compendium et quelques petites actions de l'arbre.
- **Pas de test visuel automatisé** ni de version mobile ; les animations ne sont pas testées dans le navigateur.
- **Audit du compendium** : quelques textes générés et documents en retard restent listés dans [AUDIT_COMPENDIUM.md](AUDIT_COMPENDIUM.md).

## Chantiers en cours

La liste des demandes à traiter est dans [TODO.md](TODO.md).

| Chantier | Où en est-on | Document |
| --- | --- | --- |
| **Quatrième demande du 2026-10-27** | Livrée en 0.127.0 : treize briques des maîtrises, un vol prend une charge, Morgrut, Plume d'aigle, icônes v29. Reste à juger en jeu, et à décider le rang des auras de Poison et d'épines | [PROGRESSION.md](PROGRESSION.md) § 1.24 |
| **Maîtrises** | Huit maîtrises, 77 briques, la table des besoins remplie. Reste : la progression entre les parties par maîtrise (P11), la relique « face 6 joue la 2 » (P10) | [MAITRISES.md](MAITRISES.md), [TODO.md](TODO.md) § 20 |
| **Règles v2 : progression et synergies** | Plan en phases livré jusqu'à la phase 8 (trois lots) ; reste le jugement en jeu et les reliques qui lisent la forge | [PROGRESSION.md](PROGRESSION.md) |
| **Campagne** | Prototype jouable ; reste la mesure de la forge au laboratoire, le bilan des reliques à la victoire, l'image du boss, les icônes de la forge, le jugement en jeu de la courbe | [CAMPAGNE.md](CAMPAGNE.md) |
| **Zone des bandeaux sous le dé** | Étude livrée (« chacun chez soi », quatre phases, trois choix ouverts), pistes de l'utilisateur à réfléchir ; aucun code touché | [MISE_EN_SCENE.md](MISE_EN_SCENE.md) § 5 bis |
| **Sons** | Reste : un fichier pour Ronge, les volumes à l'oreille, l'écoute des sons de famille, la licence ElevenLabs avant publication | [SONS.md](SONS.md) |
| **Compendium** | Reste : l'intégration définitive du bouton d'accès, d'autres sections (arènes…) | [FEATURES.md](FEATURES.md) § 9 |
| **Paris** | Reste P3 (guichet de tour) et les sons propres | [PARIS.md](PARIS.md) |
| **Mise en ligne** | Plan rédigé, rien de codé ; décisions D1 à D6 en attente | [EN_LIGNE.md](EN_LIGNE.md), [TODO.md](TODO.md) § 21 |
| **Combat test** | Anomalies à lister ; on n'y touche que sur demande | [TODO.md](TODO.md) § 19 |

Pistes plus larges : [INTENTION.md](INTENTION.md#grandes-lignes).
