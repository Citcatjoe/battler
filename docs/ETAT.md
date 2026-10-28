# État du projet

_Dernière mise à jour : 2026-10-28, version 0.128.0 (branche `regles-v2`). Ce document dit l'état **présent** ; l'histoire des versions est dans le [CHANGELOG](../CHANGELOG.md) (seule chronique) et dans git, les règles en vigueur dans [FEATURES.md](FEATURES.md)._

## En bref

Auto-battler roguelike à regarder et à parier (fiche produit : [INTENTION.md](INTENTION.md#fiche-produit)). Prototype jouable de bout en bout : chargement, accueil (Combat test, Duel, Tournoi, Campagne), affrontement, combat animé ou simulé, écran de fin (combat et paris), compendium, statistiques, tournoi à 16 avec phase de saison, campagne avec forge du dé.

- **Dix personnages**, un par famille (Gorak, Elaria, Brokk, Ervald, Ysolde, Naraxes, Aldric, Morgrut, Thaldrin, Fanchon). Chacun a une **attaque** (petite fourchette) : chaque action porte un coup de base, le d6 désigne une face et déclenche sa compétence.
- **Huit maîtrises** (Fureur, Sang, Rempart, Poison, Chance, Lumière, Ombre, Magie ; **77 briques**, 33 auras et 44 compétences ; auras / compétences : Fureur 4/6, Sang 4/5, Rempart 5/5, Poison 4/5, Chance 4/6, Lumière 4/5, Ombre 4/6, Magie 4/6), deux par personnage ([MAITRISES.md](MAITRISES.md)) : dé de départ avec une aura de ses maîtrises sur le 1 (règle commune « le producteur d'abord » ; au choix en campagne, tirée au hasard en tournoi et en saison ; posée au plus tard au 3e tour de son porteur), sa signature sur le 2, quatre faces nues. **Une aura par personnage** : la forge n'en ajoute jamais (ni gravée, ni copiée, la face 1 ne se copie pas). Morgrut : attaque 6 à 8, 52 PV, quatre faces de compétence au plus. Fanchon : attaque 6 à 7, esquive et critique 15 %, Duo à une charge.
- **Règles communes** : la Riposte et la Rétribution sont des coups ; +2 PV max par récompense ; esquive plafonnée à 75 % ; au plus 3 jets de plus par action, et un dé de plus n'en donne jamais ; un vol (Larcin, Confiscation) prend le bonus entier, seulement dans la zone des statuts ; le Vol de vie rend les PV vraiment retirés ; pile plafonnée à 5 sur 6, écrit dans les textes ([FEATURES.md](FEATURES.md) § 1 et § 3).
- **Reliques** ([RELIQUES.md](RELIQUES.md)) et **forge du dé** ([CAMPAGNE.md](CAMPAGNE.md)) : offre commune (`offers.ts`) à la campagne, à la saison et à l'arbre. Forge : Graver, Aiguiser (rang II au plus), Copier ; le dé finit complet (six faces de compétence).
- **Le jeu des parieurs** : deux joueurs et deux parieurs de l'ordinateur parient sur chaque match ([PARIS.md](PARIS.md)).
- **Équilibre** (`BALANCE_N=800`, `logs/balance/2026-10-28-14-36-44_v0.127.0_r28-tuning.md`) : roster de 46,7 % à 53,9 % (Morgrut), pire duel Morgrut–Brokk 64 % ; construits à 10 récompenses (`logs/ramp/2026-10-28-14-39-33_v0.127.0_r28-tuning.md`) de 43,6 % (Thaldrin) à 55,7 % (Aldric), écart 12,1 ; saison 43-54 %, σ 3,7 ; campagne (`logs/campaign/2026-10-28-15-02_campagne_r28-tuning_12.md`, 744 parties) : boss atteint 19 %, acte 10 %, boss battu une fois atteint 55 % (visé 45). `npm run check` : 535 tests ; `npx vite build` OK.

## État par système

| Système | État | Règles |
| --- | --- | --- |
| Moteur de combat | Un seul moteur (`simulateCombat`), trois phases par tour, fenêtres, contrôle, réactions, garde, immunités ; reproductible par graine ; audit (`audit.test.ts`), empreinte de non-régression (`balance.test.ts`), contrôle des timings (`timing.test.ts`) | [RESOLUTION.md](RESOLUTION.md), [FEATURES.md](FEATURES.md) § 1 |
| Personnages et maîtrises | Dix personnages, huit maîtrises, dé de départ, auras de départ par la règle | [PERSONNAGES.md](PERSONNAGES.md), [MAITRISES.md](MAITRISES.md), [FEATURES.md](FEATURES.md) § 2 |
| Compétences et statuts | Registres `skills.ts`, `statuses.ts`, `events.ts` ; textes générés (`describeSkill`), contrôlés par `wording.test.ts` ; icônes peintes pour tout | [STATUTS.md](STATUTS.md), [AURAS.md](AURAS.md), [FEATURES.md](FEATURES.md) § 3 |
| Mise en scène et écrans | Lecteur à horloge unique sur `staging.ts` ; postures de chaque personnage (garde, coup, esquive, blessure, K.-O., victoire, perte de contrôle, incantation des sorts offensifs) ; UI kit pour tous les contrôles (sauf combat test et magnétoscope) ; scène fixe 1600×900 | [MISE_EN_SCENE.md](MISE_EN_SCENE.md), [POSTURES.md](POSTURES.md), [ui-kit/README.md](ui-kit/README.md), [FEATURES.md](FEATURES.md) § 4 |
| Son | Règles appliquées, son déduit des effets, sons de famille ; musique de combat | [SONS.md](SONS.md), [FEATURES.md](FEATURES.md) § 6 |
| Tournoi et saison | Arbre de 16, phase de saison (construction en dix matchs), reliques et forge, aura tirée | [FEATURES.md](FEATURES.md) § 8 |
| Campagne et forge | Acte de dix combats et boss, cinq forges et cinq reliques en alternance, dé complet en fin d'acte, plancher de PV 65 % aux nœuds 1-2, boss réglé jusqu'à cinq fois sa base, héritage, sauvegarde v5 ; chaque adversaire combattu chez lui (onze arènes de campagne, boss compris), vestiaire au choix du champion, salle du trésor à la victoire | [CAMPAGNE.md](CAMPAGNE.md), [FEATURES.md](FEATURES.md) § 11 |
| Compendium | Combattants, Maîtrises, Compétences, Statuts, Reliques, Règles ; généré depuis les registres | [FEATURES.md](FEATURES.md) § 9 |
| Paris | Guichet, cotes cachées, quatre parieurs ; pas en duel ; pas de guichet de tour (P3) | [PARIS.md](PARIS.md), [FEATURES.md](FEATURES.md) § 10 |
| Statistiques | Historique `battler:history:v1` (rétrocompatible), classement, confrontations, fiches | [FEATURES.md](FEATURES.md) § 7 |

## Limites connues

- **Rang II au-dessus de la bande** : les quatre auras de Poison et d'épines (Peau de crapaud +11,0, Aura de décoction, Aura de poison, Aura d'épines) : 1 charge s'efface quand 2 s'accumulent, aucun pas entier plus petit ; à trancher par l'utilisateur (accepter un rang au-dessus, ou un autre axe de rang).
- **Duo encore au-dessus de sa bande** : une charge est le plus petit pas entier ; gravé chez Ysolde +23,1 ± 4,3 (au ramp à 10, marge jusqu'à 18,8), rang II +19,0 (bande 3-8). Aller plus bas changerait la règle du Duo (proposition dans [REFONTE_AURAS.md](REFONTE_AURAS.md)). Fanchon frappe moins souvent plusieurs fois (deux dés une action sur six après un 2) : à juger en jeu.
- **Boss d'Ervald au plafond** : 350 PV (cinq fois sa base) pour toutes ses auras ; un plafond plus haut allongerait le combat (15,5 tours par combattant). Fanchon Ballade bat le boss à 85-88 % quel que soit son nombre de PV.
- **Réglage du boss** : 0,4 à 2 s de calcul (mesuré sous Node, 40 combats par référence), sur le fil de l'interface (`setTimeout` dans `App.tsx`) ; non mesuré dans le navigateur.
- **Morgrut** : quatre faces de compétence et plus ni Dorer ni Tremper : il ne lui reste qu'Aiguiser pour des « coups plus lourds » (construit 48,1 %, saison 43 %). Dorer ne vit plus qu'au journal, pour le boss.
- **Refonte des auras proposée, non codée** ([REFONTE_AURAS.md](REFONTE_AURAS.md), A1, A10, A12, A14) : 14 questions attendent l'utilisateur ([TODO.md](TODO.md) § 20).
- **Équilibre des départs** : remesuré seulement pour Fanchon (44,4 à 53,0 %) et les départs au Larcin ; les autres départs n'ont pas été remesurés depuis la 0.127.0 (7 sur 63 hors de 42-58 %).
- **Consommatrices hors de leur producteur** : Sangsue, Odeur du sang et Morsure sont sous la bande chez les porteurs qui produisent peu leur ressource. Aura de pourriture sous la bande en moyenne (+7,0).
- **Mise en scène** : `stage()` lève « PV a,b au lieu de… » sur 1 à 2 combats sur 24 000 quand les combats s'allongent (vu dans les études, jamais sur les graines du jeu) ; la zone des bandeaux sous le dé est un chantier à part ([MISE_EN_SCENE.md](MISE_EN_SCENE.md) § 5 bis).
- **Non vu à l'écran** : de la 0.128.0, seules des captures (`logs/captures/r28-ui.png` : sceau de Rétribution, Thaldrin en ours, porteur figé en image fixe) ; non vus : le fondu du porteur figé en combat, « Duo volé » en texte flottant (doublon possible avec le badge « Volé »), la carte de forge sans Dorer ni Tremper, le compendium, les icônes v30 dans un écran de jeu. Plus anciens : les survols réels, les sorts à scène, l'Onde de choc en combat, le vol d'icône du Larcin. **Aucun son n'a été vérifié.**
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
