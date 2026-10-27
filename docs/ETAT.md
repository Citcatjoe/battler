# État du projet

_Dernière mise à jour : 2026-10-27, version 0.125.0 (branche `regles-v2`). Ce document dit l'état **présent** ; l'histoire des versions est dans le [CHANGELOG](../CHANGELOG.md) (seule chronique) et dans git, les règles en vigueur dans [FEATURES.md](FEATURES.md)._

## En bref

Auto-battler roguelike à regarder et à parier (fiche produit : [INTENTION.md](INTENTION.md#fiche-produit)). Prototype jouable de bout en bout : chargement, accueil (Combat test, Duel, Tournoi, Campagne), affrontement, combat animé ou simulé, écran de fin (combat et paris), compendium, statistiques, tournoi à 16 avec phase de saison, campagne avec forge du dé.

- **Dix personnages**, un par famille (Gorak, Elaria, Brokk, Ervald, Ysolde, Naraxes, Aldric, Morgrut, Thaldrin, Fanchon). Chacun a une **attaque** (petite fourchette) : chaque action porte un coup de base, le d6 désigne une face et déclenche sa compétence.
- **Huit maîtrises** (Fureur, Sang, Rempart, Poison, Chance, Lumière, Ombre, Magie ; 64 briques), deux par personnage ([MAITRISES.md](MAITRISES.md)) : dé de départ avec une aura de ses maîtrises sur le 1 (règle commune « le producteur d'abord » ; au choix en campagne, tirée au hasard en tournoi et en saison ; posée au plus tard au 3e tour de son porteur), sa signature sur le 2, quatre faces nues.
- **Règles communes** : la Riposte et la Rétribution sont des coups ; +2 PV max par récompense ; esquive plafonnée à 75 % ; au plus 12 jets de plus par action ([FEATURES.md](FEATURES.md) § 1).
- **Reliques** ([RELIQUES.md](RELIQUES.md)) et **forge du dé** ([CAMPAGNE.md](CAMPAGNE.md)) : offre commune (`offers.ts`) à la campagne, à la saison et à l'arbre.
- **Le jeu des parieurs** : deux joueurs et deux parieurs de l'ordinateur parient sur chaque match ([PARIS.md](PARIS.md)).
- **Équilibre** (`BALANCE_N=800`, `logs/balance/2026-10-27-18-26-11_v0.124.0.md`) : roster de 47,0 % (Ervald) à 54,0 % (Morgrut), pire duel Morgrut–Brokk 62,7 % ; construits à 10 récompenses (`npm run ramp`) de 40,5 % (Morgrut) à 62,7 % (Fanchon), écart 22,2 ; 55 départs d'aura, 8 hors de 42-58 %. `npm run check` : 505 tests.

## État par système

| Système | État | Règles |
| --- | --- | --- |
| Moteur de combat | Un seul moteur (`simulateCombat`), trois phases par tour, fenêtres, contrôle, réactions, garde, immunités ; reproductible par graine ; audit (`audit.test.ts`), empreinte de non-régression (`balance.test.ts`), contrôle des timings (`timing.test.ts`) | [RESOLUTION.md](RESOLUTION.md), [FEATURES.md](FEATURES.md) § 1 |
| Personnages et maîtrises | Dix personnages, huit maîtrises, dé de départ, auras de départ par la règle | [PERSONNAGES.md](PERSONNAGES.md), [MAITRISES.md](MAITRISES.md), [FEATURES.md](FEATURES.md) § 2 |
| Compétences et statuts | Registres `skills.ts`, `statuses.ts`, `events.ts` ; textes générés (`describeSkill`), contrôlés par `wording.test.ts` ; icônes peintes pour tout | [STATUTS.md](STATUTS.md), [AURAS.md](AURAS.md), [FEATURES.md](FEATURES.md) § 3 |
| Mise en scène et écrans | Lecteur à horloge unique sur `staging.ts` ; postures de chaque personnage (garde, coup, esquive, blessure, K.-O., victoire, perte de contrôle, incantation des sorts offensifs) ; UI kit pour tous les contrôles (sauf combat test et magnétoscope) ; scène fixe 1600×900 | [MISE_EN_SCENE.md](MISE_EN_SCENE.md), [POSTURES.md](POSTURES.md), [ui-kit/README.md](ui-kit/README.md), [FEATURES.md](FEATURES.md) § 4 |
| Son | Règles appliquées, son déduit des effets, sons de famille ; musique de combat | [SONS.md](SONS.md), [FEATURES.md](FEATURES.md) § 6 |
| Tournoi et saison | Arbre de 16, phase de saison (construction en dix matchs), reliques et forge, aura tirée | [FEATURES.md](FEATURES.md) § 8 |
| Campagne et forge | Acte de dix combats et boss, quatre forges et six reliques, héritage, sauvegarde v5 ; chaque adversaire combattu chez lui (dix arènes de campagne, 0.123.0), vestiaire au choix du champion, salle du trésor à la victoire | [CAMPAGNE.md](CAMPAGNE.md), [FEATURES.md](FEATURES.md) § 11 |
| Compendium | Combattants, Maîtrises, Compétences, Statuts, Reliques, Règles ; généré depuis les registres | [FEATURES.md](FEATURES.md) § 9 |
| Paris | Guichet, cotes cachées, quatre parieurs ; pas en duel ; pas de guichet de tour (P3) | [PARIS.md](PARIS.md), [FEATURES.md](FEATURES.md) § 10 |
| Statistiques | Historique `battler:history:v1` (rétrocompatible), classement, confrontations, fiches | [FEATURES.md](FEATURES.md) § 7 |

## Limites connues

- **Équilibre des départs** (400 combats par duel) : six auras de départ sous 42 % (Fanchon Ciel d'orage 38,7, Champ d'orage 38,4, Feinte 40,3, Veine 41,0 ; Elaria Veine 39,4 ; Morgrut Rancœur 41,9), deux au-dessus de 58 % (**Gorak à l'Aura de puissance 59,2** ; Elaria à l'Ivresse du sang 63,7, pire duel 70,8), que le tirage du tournoi peut donner. Le levier chiffré (Aura de puissance +1/+2/+3) en ferait un doublon de l'Aura sauvage : non livré ([PERSONNAGES.md](PERSONNAGES.md) « Le réglage du troisième retour »).
- **Builds** (`npm run ramp`, `logs/ramp/2026-10-27-18-29-22_v0.124.0.md`) : **Fanchon construite 62,7 %** (Copie du Duo ; Duo laissé en l'état par décision de l'utilisateur, aucun levier hors Duo), **Morgrut construit 40,5 %** et **32,7 % en saison** (`logs/season/2026-10-27-18-40_saison.md`, saison de 32 à 64 %, σ 8,5) ; Crescendo aiguisé +10,6 chez lui. **Plume d'aigle +24,7 chez Elaria** (Contrepoids de plomb +23,7), au-dessus de la bande des reliques ; recharge 3 proposée (−1,4 point), non livrée.
- **Contenu des maîtrises inégal** : besoins par maîtrise chiffrés dans [MAITRISES.md](MAITRISES.md) « Besoins de contenu par maîtrise » (6 auras et 7 compétences) ; l'utilisateur propose le contenu. Aura de pourriture sous la bande en moyenne (+7,0).
- **Mise en scène** : `stage()` lève « PV a,b au lieu de… » sur 1 à 2 combats sur 24 000 quand les combats s'allongent (vu dans les études, jamais sur les graines du jeu) ; la zone des bandeaux sous le dé est un chantier à part ([MISE_EN_SCENE.md](MISE_EN_SCENE.md) § 5 bis).
- **Non vu à l'écran** : les survols réels (infobulles des faces, de l'aura tirée, de la carte Graver, des PV de récompense), les sorts à scène et les rafales du Duo en mouvement, les icônes recolorées (planche v28) dans un écran de jeu, l'incantation dans un vrai combat (les onze images ont été vues posées sur la scène, pas jouées), l'aura éveillée au 3e tour, les renvois esquivés ou critiques, le Crescendo de Morgrut et sa fiche. **Aucun son nouveau n'a été entendu** (sons de famille compris).
- **Combat test peu fiable** : outil de l'utilisateur, il ne sert pas à valider le gameplay ; une anomalie s'y vérifie par sa trace `_triche` ([TODO.md](TODO.md) § 19).
- **Écran de fin** : le druide vainqueur s'y montre toujours en forme humaine.
- **Fonds du 2026-10-27** (0.123.0) : vus en captures Firefox (choix du champion, affrontement et combat chez Ysolde, arbre, fin de campagne gagnée). Non vus : les neuf autres arènes de campagne à l'écran, l'écran de la saison, l'écran du champion du tournoi (même fond, axe du vainqueur à 300 px au lieu de 280). Le Colosse n'a pas d'arène à lui ; les décors de Gorak, Brokk et Aldric ont été écrits avant la méthode des décors (à reprendre si l'utilisateur le demande) ([STYLE_BIBLE.md](STYLE_BIBLE.md) § 5.7).
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
| **Troisième retour du 2026-10-27** | Livré en 0.125.0 : renvois traités comme des coups, aura de départ au plus tard au 3e tour, Purification +5, Dé pipé, +2 PV max par récompense, Crescendo de Morgrut et réglage, docs allégées. Reste à juger en jeu, et les points à décider (Gorak à la Puissance, Plume d'aigle, Morgrut construit) | [PROGRESSION.md](PROGRESSION.md) § 1.23 |
| **Maîtrises** | Huit maîtrises livrées. Reste : le contenu que l'utilisateur proposera (table des besoins), la progression entre les parties par maîtrise (P11), la relique « face 6 joue la 2 » (P10) | [MAITRISES.md](MAITRISES.md), [TODO.md](TODO.md) § 20 |
| **Règles v2 : progression et synergies** | Plan en phases livré jusqu'à la phase 8 (trois lots) ; reste le jugement en jeu et les reliques qui lisent la forge | [PROGRESSION.md](PROGRESSION.md) |
| **Campagne** | Prototype jouable ; reste la mesure de la forge au laboratoire, le bilan des reliques à la victoire, l'image du boss, les icônes de la forge, le jugement en jeu de la courbe | [CAMPAGNE.md](CAMPAGNE.md) |
| **Zone des bandeaux sous le dé** | Étude livrée (« chacun chez soi », quatre phases, trois choix ouverts), pistes de l'utilisateur à réfléchir ; aucun code touché | [MISE_EN_SCENE.md](MISE_EN_SCENE.md) § 5 bis |
| **Sons** | Reste : un fichier pour Ronge, les volumes à l'oreille, l'écoute des sons de famille, la licence ElevenLabs avant publication | [SONS.md](SONS.md) |
| **Compendium** | Reste : l'intégration définitive du bouton d'accès, d'autres sections (arènes…) | [FEATURES.md](FEATURES.md) § 9 |
| **Paris** | Reste P3 (guichet de tour) et les sons propres | [PARIS.md](PARIS.md) |
| **Mise en ligne** | Plan rédigé, rien de codé ; décisions D1 à D6 en attente | [EN_LIGNE.md](EN_LIGNE.md), [TODO.md](TODO.md) § 21 |
| **Combat test** | Anomalies à lister ; on n'y touche que sur demande | [TODO.md](TODO.md) § 19 |

Pistes plus larges : [INTENTION.md](INTENTION.md#grandes-lignes).
