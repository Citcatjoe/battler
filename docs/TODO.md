# Liste des chantiers

Demandes de l'utilisateur, reformulées et regroupées, du 2026-10-18. On coche une case quand le point est livré (version entre parenthèses). Les chantiers de fond, plus longs, restent suivis dans [ETAT.md](ETAT.md#chantiers-en-cours).

## 1. Interface : débordements

- [x] **Bouton du tournoi** (0.34.0). Sur l'accueil, en mode Tournoi, le bouton « Commencer un tournoi » déborde toujours. Il faut :
  - retirer l'icône ;
  - le renommer « Créer un tournoi » ;
  - régler la taille du texte pour qu'il tienne dans le bouton.
- [x] **Écrans trop hauts** (0.34.0). Certains écrans, comme les statistiques, dépassent la scène de 1600×900. Le tableau reste aligné et à sa place, et c'est à l'intérieur de son cadre qu'on fait défiler ce qui ne tient pas. À appliquer partout où quelque chose déborde.
- [x] **Onglet Confrontations des statistiques** (0.34.0). Il ne doit garder que la matrice. Le second élément, à peine visible en bas de l'écran et illisible, est à retirer.

## 2. Règle : comptabiliser l'overkill

- [x] **Compter les dégâts en excès** (0.34.0). Aujourd'hui, un coup fatal ne compte que les PV qu'il restait à retirer (`Attack.dealt` est plafonné). Cela brouille la réflexion, l'enquête, le débogage et la compréhension du joueur. On inverse la décision : tout l'overkill est comptabilisé.
  - **D'abord** : mesurer l'impact (statistiques, Vol de vie, Riposte, jauges de Rétribution, audit, historique) et dire si c'est faisable simplement sans rien casser.
  - **Ensuite** : appliquer.

## 3. Écran de victoire du tournoi

- [x] **Mettre en avant le champion** (0.34.0). À la fin d'un tournoi, un écran dédié montre :
  - son modèle ;
  - les statistiques de tout son parcours (critiques, soins, dégâts, compétences déclenchées, coup le plus fort, etc.).

  Il respecte le style du jeu et des autres écrans.

## 4. Aucun emoji, nulle part

- [x] **Retirer tous les emojis affichés** (0.34.0) : textes flottants, journal, descriptions, infobulles, fiches, compendium, statistiques. Par exemple, la Peur affiche un emoji sur la cible.
- [x] **Règle pour la suite** (0.34.0) : chaque compétence et chaque état a son icône peinte. S'il en manque une, la demander à l'utilisateur, qui la crée. Ne jamais la remplacer par un emoji.

## 5. Compétences en dés (sélection et combat)

- [x] **Sélection des personnages** (0.34.0). La liste des compétences prend trop de place. Elle est remplacée par **trois cases**, une par face (1, 2 et 3) :
  - chaque case montre un dé avec son chiffre, en attendant l'icône de dé (à demander) ;
  - au survol, une infobulle donne la compétence de ce dé ;
  - l'infobulle a le même style que celle de la zone d'état, en version allégée de la fiche de compétence du compendium.
- [x] **En combat** (0.34.0). Les trois cases et leurs infobulles se placent après le nom de chaque combattant, tout en haut. On se rappelle ainsi ses compétences pendant le combat.

## 6. Textes flottants : un seul par événement

- [x] **Supprimer les doublons** (0.34.0). Quand l'Aura de puissance de Gorak se déclenche, deux textes apparaissent :
  - « Aura de puissance » en violet, le nom de la compétence ;
  - le même nom en jaune, avec un emoji, le badge du statut posé.

  Le cas se présente aussi ailleurs. Il faut trouver tous ces doublons, n'afficher qu'un texte par événement, et fixer un code couleur clair des textes flottants.

## 7. Les auras : une seule, bien visible

- [x] **Halo du modèle** (0.34.0). On ne garde que le halo de **l'aura de personnage**, celle posée sur un 3 (Aura de poison, de puissance, d'intimidation, de précision, de sainteté, de décoction, d'immunité). Plus de cumul de halos. Ce halo doit être bien visible et plus propre qu'aujourd'hui.
- [x] **Zone d'état** (0.34.0). L'aura se distingue des autres bonus, par exemple par un double contour ou un fond animé. Le choix du design est libre, pourvu qu'il reste clair et soigné.
- [ ] **Pour plus tard** : les liserés colorés des autres états sur le modèle sont mis de côté. L'idée plaît, mais il faudra la retravailler.

## 8. Ressenti des combats

- [x] **Rendre chaque événement percutant** (0.34.0). Un coup n'est satisfaisant que si son impact se ressent : animation d'attaque, texte flottant des dégâts et son. Beaucoup de résolutions sont molles aujourd'hui, faute de retour sensoriel. Pistes demandées :
  - **Rétribution** : élan d'attaque, gros chiffre et gros son, comme la Furie des vents (*BOUM BOUM BOUM*). Aujourd'hui, seuls la disparition du statut et le badge chez l'adversaire la signalent.
  - **Aura qui se déclenche** : un son.
  - **Critique** : un son plus fort, et un chiffre plus gros qui tremble.
  - **Le reste** : passer en revue chaque événement du combat et lui donner un retour à sa mesure.

## 9. Catalogue sensoriel et moteur d'animation

- [ ] **Documenter le langage du jeu** : compétences, couleurs, logique des dés, effets, sons et animations possibles. On en fait un **catalogue d'animations et d'événements sensoriels**, pour pouvoir les invoquer sur demande. Inventaire amorcé (0.35.3) dans [SYSTEMES.md](SYSTEMES.md) ; reste à le rendre invocable.
- [ ] **Réfléchir au moteur d'animation**. Faut-il passer à une bibliothèque comme GSAP, pour composer des timelines et y ajouter des animations à la volée ? Comparer avec l'existant (CSS et attentes dans `useCombat`), puis recommander.

## 10. Sons

- [ ] **Refondre les sons** (demande du 2026-10-18, après la 0.36.0 jugée cacophonique). Réduire fortement le nombre de sons, un seul son par type d'événement, des familles homogènes selon la nature du coup ou de l'effet (même son d'aura gagnée et d'aura perdue pour tous les personnages), des timbres fidèles (un poison discret et liquide). Un document fait foi : [SONS.md](SONS.md), proposé en 0.36.1, à valider ; puis intégration, et choix des fichiers à l'oreille par l'utilisateur.

---

# Réflexion auto-battler (2026-10-18)

Grands axes issus de l'étude [ETUDE_AUTOBATTLER.md](ETUDE_AUTOBATTLER.md) et des discussions qui ont suivi : [FAMILLES.md](FAMILLES.md) (vocabulaire), [SORTS.md](SORTS.md) (brainstorm et laboratoire). Décisions déjà prises par l'utilisateur :
- Battler **reste un jeu qu'on regarde**, mais des variables (reliques, pouvoirs) doivent pouvoir changer l'issue, pour voir naître des métas ;
- **un personnage est un personnage précis**, pas une race ;
- la **dépouille** est retenue ; le **choix automatique** est mixte (goûts, synergie, tirage) tant que le joueur n'intervient pas ;
- le **pari** est voulu, mais l'utilisateur a son idée : **ne rien faire sans le consulter**.

## 11. Lisibilité, sans changer aucun résultat de combat

- [ ] **Palette sémantique** (la couleur par famille est refusée pour les médaillons, 0.52.1) : l'ambre réservé au critique (aujourd'hui aussi ton « positive » dans `narration.ts`) ; la polarité montrée par la forme du cadre plutôt que par le vert et le rouge (FAMILLES.md § 3). Maquette d'abord.
- [ ] **Décomposition du coup** sous le chiffre de dégâts, maillon par maillon, à la Balatro (étude QW3).
- [ ] **Charges « armées »** : montrer ce qui attend le prochain coup ou la prochaine action (étude QW4).
- [x] **Deux niveaux de lecture** (0.79.0, demande du 2026-10-21) : compétences et auras dans l'en-tête, états génériques regroupés dans la zone d'état, signal d'activation du sceau vers la cible (STATUTS.md).
- [ ] **Emblèmes d'état** : générer la planche des 16 icônes d'état (STYLE_BIBLE § 7), puis remplacer les icônes provisoires de `STATE_ICON`.
- [ ] **Suites des deux niveaux** : sceaux de compétence sur l'écran de sélection et l'affrontement (aujourd'hui des dés), compendium « Bonus et malus » présenté par états génériques, signal des reliques qui posent un état, regroupement par les règles elles-mêmes (familles, § 12-13).
- [x] ~~**Cadre d'icône par famille**~~ : essayé en 0.51.0, refusé (trop de couleurs) ; on garde vert et rouge, avec un bord en pointillés pour les dégâts périodiques (0.52.1).
- [ ] **Repère de fenêtre** (prochaine action, prochain coup porté, prochain coup reçu, durée, aura).
- [ ] **Fiche sensorielle dans les registres** (`present`) : son et mise en scène déclarés, plus devinés par `cueFor`. À caler sur SONS.md quand la refonte des sons sera validée (§ 10).

## 12. Vocabulaire : les familles

- [ ] **Valider FAMILLES.md** : les sept questions du § 9 (rangement par effet, Fortune, retouches, Luciole, Armure temporaire et Écorce, polarité, sorts).
- [ ] **Familles en métadonnée** (`family` dans `StatusDef` et `CharacterEvent`), affichées dans le compendium, contrôlées par `validateRoster`. Empreinte inchangée.

## 13. Moteur aplati, à résultats identiques

- [ ] **Fenêtres d'usure** (`consumedOn`) à la place des crochets à usage unique : `forcesCrit`, `forcesDodge`, `drainsHit`, `reflectsHit`, `spentOnHurt` ; Peau de pierre et Écorce sur une même brique. Preuve : empreinte de non-régression et audit identiques.
- [ ] **Dégâts typés** (`kind` : coup, affliction, renvoi, sort), d'abord en simple métadonnée.
- [ ] **Petits chantiers de l'étude** : interprète unique de la chronologie, contrôles de `validateRoster`, échelle de z-index (étude § 5.2).

## 14. Compétences faibles et déséquilibres connus

- [x] **Retouches à mesurer** (FAMILLES.md § 6) : Coup de chance (0.36.5), Pile ou face, Fleur de vie et Aura d'immunité (0.42.0, SORTS.md § 10).
- [ ] **Pile ou face** (+0,0 et +0,6) et **l'immunité de Gauvain** (−0,6) encore « presque inutiles » ; l'immunité attend des malus dans le roster (reliques, édits). Ysolde contre les voleuses (35 %) tolérés depuis la 0.42.0.
- [ ] **Aura de sainteté** (+38 à +42 points, plafonnée à 3 charges depuis la 0.42.0) et les duels Brokk contre les prêtresses (27-28 %) : à surveiller, surtout quand les reliques arriveront.
- [ ] **Combats longs** (jusqu'à 39 tours) : une montée de tension qui borne la durée, comme la tempête de The Bazaar (étude R1).

## 15. Sorts et laboratoire

- [x] **Laboratoire des sorts** : `scripts/lab.report.ts`, idées dans `scripts/lab/ideas.ts`, mesures de spectacle (SORTS.md § 4). Première série de 17 idées mesurée (SORTS.md § 5).
- [x] **Deuxième série, à puissance égale** : 10 essais avec leur compensation (SORTS.md § 5 bis). Trois idées prêtes : Bûcher 2 (Bérengère), Colère bridée (Gorak), Élan du croisé (Gauvain).
- [ ] **Proposer les trois idées prêtes** à l'utilisateur, puis les livrer une par une (icône, statut, tests, équilibrage, PERSONNAGES.md).
- [ ] **Main leste sans les auras** : une option de `cleanse` qui épargne les auras (petit ajout au moteur), pour borner le duel Naraxes contre Bérengère.
- [x] **Paliers trop rares** : essayés à 2 charges ; encore peu visibles (41 % et 24 % des combats). À déclencher plutôt sur la pose d'une charge.
- [x] **Affiner la mesure « Meneur »** : seuls comptent les retournements avec 15 points d'avance.
- [ ] **Ajouter les mesures de spectacle au rapport `npm run balance`** (`analysis.ts`).
- [x] **Audit des compétences** (grille de drapeaux rouges) : `scripts/skills.report.ts` (SORTS.md § 8), et une série 3 de petites touches mesurées (SORTS.md § 9).
- [x] **Quatre touches livrées** (0.36.5) : Esquive améliorée sans durée, Coup de chance au d6, Rage du sang à 5 pour Murzug, Écorce épaisse à 5 (à 6, Thaldrin dépassait le budget contre Bérengère).
- [x] **Aura de sainteté** : plafond de 3 charges, compensé par la Purification de repli (0.42.0). Le plafond à 2 faisait plus de spectacle mais coûtait trop (SORTS.md § 10).
- [x] **Audit de résolution** : la pièce est lue dans le registre (0.42.0).
- [x] **Deuxième passe** (0.45.0, SORTS.md § 11) : Aura de poison (texte), Vol de vie, aura de la barde, Épines, Fausse note (l'immunité de Gauvain est sans objet depuis son retrait).
- [x] **Ysolde** : Purification double livrée (0.69.0, SORTS.md § 15) ; elle retire aussi son dernier malus. 41,3 % sans elle avec l'Aura glaciale cumulable, **43,4 %** avec, la plus basse du roster.
- [x] **Saignement sans nouveau personnage** (0.68.0, SORTS.md § 14) : Saignée de Gorak, Épines acérées de Brokk. Pistes mesurées, non livrées : critiques d'Elaria qui font saigner (Saignement 1 : +2,8 points), Coup de griffe du druide qui lacère (+2,9 à +4,6).
- [x] **Pourfendre** (0.70.0, proposition de l'utilisateur) : le 1 de Gorak frappe et, s'il touche, pose Saignement 2 ; `needsTouch`. Gorak 49,4 → 51,1 %.
- [x] **Icônes du Saignement** (0.71.2, planche v8) : Saignement, Pourfendre et Épines acérées retouchées.
- [x] **Libellé du résultat de Pile ou face** (corrigé en 0.49.0 par la session de l'interface).
- [x] **Icônes à peindre** (0.71.2, planche v8, STYLE_BIBLE § 7) : Aura glaciale (encensoir givré, à la place de l'encensoir vert du poison) ; druide : Rancune, Sève, Aura de rancune, Aura de sève. Restent sans icône des statuts sans porteur (Pourriture, Brûlure, Vulnérable, Étourdi, Garde).
- [x] **Siffloter, Fausse note** (0.46.0) : les doubles frappent aussi leurs coups.
- [ ] **Écorce épaisse** (Thaldrin) « presque inutile » à la marge ; **Ouverture** **Ouverture** de la barde « écrasante » ; ses doubles « rares à l'écran » (un sur cinq jets, par construction). **Ysolde** à 44,4 %, la plus basse du roster de 10.
- [ ] **Raccourcis `npm run lab` et `npm run skills`**, une fois la refonte des sons terminée (`package.json`).
- [ ] **Premier ajout au moteur pour les sorts** : un effet à l'expiration d'un statut (compte à rebours, écho, réserve relâchée). Ensuite : agir sur le dé adverse (Sabotage, Prophétie).
- [x] **Sixième passe, préparée le 2026-10-20** ([SORTS.md](SORTS.md) § 15, laboratoire série 9) : livrée en 0.69.0, le druide en 0.71.0.
  - [x] **Aura glaciale et poisons** (0.69.0) : elle pose 1 charge de Poison par charge au début du tour d'Ervald, cumulable sans compensation ; `poisonAura` devient `frostAura`, crochets `onOpponentTurnStart` et `stoppedByImmunity` retirés. Ervald 52,0 → 54,7 %.
  - [x] **Furie des vents en coups bruts** (0.69.0) : deux coups tout de suite, les 1 à 3 frappent pour leur valeur, plus de relance ; Gorak au d9 et 19 % de critique, 47,9 → 49,4 %.
  - [x] **Druide, rework de la dualité** (0.71.0, proposition A de SORTS § 16, auras à +2 au choix de l'utilisateur) : relais des formes (touché en homme : Rancune, +1 au prochain coup qui touche ; touché en ours : Sève, 1 PV au début du tour de l'homme), Aura de sève et Aura de rancune sur les 3. Thaldrin 50,7 %, ses duels de 45 à 58 % ; Rancune +9,0, Sève +7,7. Les auras restent faibles (+0,4 et −1,0 ; à +3, 52,1 %).
  - [x] **Brûlure à une seule valeur** (0.69.0) : durée égale à la valeur ; Feux follets en Brûlure 3, même force (+3,5 points).
- [x] **Druide, deuxième refonte** (0.73.0, SORTS § 18 ; retour de l'utilisateur : « trop mou, lent ») : l'homme ne lance que des sorts (d3 : Foudre 5 avec son éclair sur la scène, Feux follets, Aura sauvage), l'ours frappe à +4 sans sort ni Saignement. Thaldrin 54,0 %, combats de 20,0 à 17,0 tours, 11,1 dégâts par coup ; 0.76.0 : Foudre en trois éclairs de 2, ours +3, 49,8 %.
- [x] **Icônes à générer** (0.77.1, planches v9 à v11 ; STYLE_BIBLE § 7, liste unique « Icônes à générer », en un seul lot le moment venu, une planche par type) : A. druide (Foudre, Incantation, Force de l'ours, Brûlure) ; B. douze reliques ; C. interface (musique allumée et coupée ; bourse, jeton, coup de théâtre, guichet des paris). Chacune avec son besoin, son type, son motif et son icône provisoire.

## 16. Reliques, tournoi et méta

- [ ] **Séparer les suites de hasard** (une pour le dé de chaque combattant, une pour les effets), pour pouvoir rejouer un combat « sans la relique » à l'identique. Change toutes les graines : empreinte à mettre à jour, volontairement.
- [x] **Système de reliques** (0.75.0, demande du 2026-10-20, [RELIQUES.md](RELIQUES.md)) : quatre types (Caractéristique, Coup, Tour, Seuil), charges, recharge, conditions, étape `relic` de la chronologie, audit ; une relique par victoire de tournoi (choix parmi 3, au hasard, modifiable sur l'écran de victoire), visible en combat, à l'affrontement, dans l'arbre, sur l'écran du champion ; `npm run relics` pour les mesurer.
- [x] **Série de test** (0.75.0) : une relique par type, de +11,9 à +16,4 points ; retirée en 0.77.0 au profit de la première série.
- [x] **Première série de contenu** (0.77.0) : les douze reliques de l'exploration de l'autre agent, trois par type, revues par l'utilisateur ([RELIQUES.md](RELIQUES.md) § 7) ; moteur étendu (bonus d'une face, seuil sur l'adversaire, aucun malus sur l'adversaire, deux dés lus un par un). Mesurées de +6,1 à +21,4 points.
- [x] **Icônes des douze reliques** (0.77.1, planche v10, prompt dans [RELIQUES.md](RELIQUES.md) § 10).
- [ ] **Réglages proposés** (à valider, RELIQUES.md § 7) : Dent de loup (+21,4), Cotte du mercenaire (+18,1), Chapelet de l'ermite (+16,3), Dé creux sur Fanchon (+25,9).
- [ ] **Modes par emplacement** : Aléatoire (graine), Imposé (verrou manuel), Aucun (témoin).
- [ ] **Tournoi** : 1 relique au départ, **dépouille** après chaque victoire, **étape** de mi-tableau (choix parmi 3). Fait en 0.75.0 : une relique par victoire, 3 au plus.
- [ ] **Choix automatique** pondéré : note par goût, synergie et contexte, puis tirage pondéré (pas toujours la meilleure), expliqué dans le journal. Aujourd'hui (0.75.0) : tirage à parts égales dans l'offre. En option, plus tard : la mémoire des personnages d'un tournoi à l'autre.
- [ ] **Montrer l'influence** : fait en 0.75.0, le sceau s'illumine quand la relique agit. Reste : le contrefactuel en fin de combat (« sans la Dent de loup, il perdait ») ; un tableau des reliques en fin de tournoi, et d'un tournoi à l'autre.
- [ ] **Édit de tournoi** : une règle changée pour tout un tournoi. Plus tard, des effets d'arène.
- [ ] **Paris entre deux observateurs** (règles validées le 2026-10-18 : [PARIS.md](PARIS.md)). Livraison par étapes :
  - [x] P1 : module de règles `betting.ts` et ses tests (cotes simulées, mises, règlement, coups de théâtre, prime de relance) ; pas encore visible en jeu ;
  - [x] P2 (0.37.0) : guichet sur l'écran d'affrontement, règlement sur l'écran de fin, bourses dans l'arbre, noms à la création du tournoi ;
  - [ ] P3 : guichet de tour dans l'arbre (les matchs simulés depuis l'arbre ne sont pas encore pariés) ;
  - [x] P4 (0.37.0) : coups de théâtre à l'écran ;
  - [x] 0.38.0 : refonte demandée par l'utilisateur : guichet de jeu vidéo, cotes cachées, mises fixes (50, 100, 200) et rattrapage du dernier, deux parieurs de l'ordinateur (Borin, Zlatka), écran de fin en deux moitiés (combat, paris), classement dans l'arbre et sur l'écran du champion ;
  - [ ] P5 : sons propres aux paris, icônes peintes (bourse, jeton, coup de théâtre, guichet : faites en 0.77.1, planche v11). Reste : les sons.

## 17. Plus tard

- [ ] **Construire son dé** : choisir quelle compétence va sur quelle face, faces et reliques de dé (étude § 5.4).
- [ ] **Équipes en file**, à la Super Auto Pets, avec le duel toujours au cœur du moteur.

## 18. Postures des combattants (demande du 2026-10-19)

But : tester si changer l'image du combattant au fil des animations renforce l'immersion. Conception et procédure : [POSTURES.md](POSTURES.md). Cinq postures communes à tous (attaque, esquive, coup encaissé, K.O., victoire) : décisions de l'utilisateur, pour une production légère et sans posture de capacité.
- [x] Moteur d'affichage (0.40.0) : registre `POSES`, posture du moment, retour à la garde, préchargement, K.O. sans bascule, largeur naturelle des images à postures, menus au-dessus des combattants ; tests.
- [x] Outils et prompts (0.40.0) : `scripts/slice-poses.py`, `CUTOUT_KEEP_CANVAS`, gabarit de planche (STYLE_BIBLE § 4, POSTURES.md § 3).
- [x] Essai sur l'orc (0.40.0) : nouvelle image originale (placeholder remplacé) et quatre postures intégrées.
- [ ] Juger l'immersion à l'écran (utilisateur) ; voir l'esquive et le K.O. en combat joué.
- [x] Orc : coup encaissé ajouté (`--reference`). Voleuse : cinq postures en trois planches (0.40.0).
- [x] **Une même règle d'affichage pour tous** (0.40.0) : largeur naturelle et échelle resserrée (nain 0,86 → ogre 1,13), après l'essai « réaliste » rejeté. Un personnage à postures garde sa taille.
- [ ] Puis généraliser au roster (3 générations par famille avec les planches de trois cases), à commencer par le nain, dernier placeholder. Seulement des postures communes à tous, jamais une posture de capacité. Fait pour tous sauf le druide : Ervald (0.54.0), Aldric (0.56.0), Ysolde (0.57.0), Elaria (0.58.0), Brokk avec un nouveau modèle original et Morgrut (0.65.0).

## 19. Combat test : le rendre fiable (signalé le 2026-10-20)

L'utilisateur a constaté plusieurs anomalies dès l'ouverture du combat test (0.60.0 à 0.64.0). Ce mode sert à décortiquer la résolution : tant qu'il n'est pas fiable, il ne sert pas à valider le gameplay, et on ne le corrige que sur demande.

- [ ] Lister les anomalies constatées (description de l'utilisateur, trace `_triche` dans `logs/combats/` quand il y en a une).
- [ ] Pour chacune, trancher : défaut de l'écran du combat test, ou défaut du moteur (rejeu de la trace par `npm run logs`).

## 20. Règles v2 : progression et synergies (branche `regles-v2`, ouverte le 2026-10-23)

Le chantier défini avec l'utilisateur dans [PROGRESSION.md](PROGRESSION.md) (décisions au § 1, plan au § 18, ce qui manque au § 17). Le but : que la progression (dé, compétences, reliques) fasse naître des builds dont les combinaisons ne relèvent pas du hasard, et que ces builds se voient dans le combat. Le socle : un d6 pour tous aux faces imprimées, deux compétences au kit de référence, la signature seule en campagne, un acte de 10 combats.

- [x] **0. Mesure** (0.101.0) : `npm run synergy` (log-cote), la durée dans `npm run campaign` et `npm run season`, « le build se voit-il ? » ; état de référence dans PROGRESSION.md § 3.1. Aucun combat changé.
- [x] **1. Étiquettes** (0.102.0) : accroches de chaque brique (produit, consomme, gêne : `hooks.ts`), type DP, DM ou DT et source de chaque dégât (`damage.ts`), relevé du kit ouvert. Empreinte identique. Résultats dans PROGRESSION.md § 3.2 : les accroches prévoient la mesure, et il manque des consommateurs.
- [ ] **2. Essai des répertoires** (livré en 0.103.0, **à jouer par l'utilisateur**) : répertoire de quatre compétences existantes par personnage, Graver toujours proposée avec une compétence du répertoire, première relique à l'écho du build, en campagne. Mesure dans PROGRESSION.md § 7.4 : gravures 0,36 → 0,65 par acte, cohérence 0,86 → 1,08 paire liée (les compétences existantes produisent sans que rien ne les consomme).
- [ ] **3. Dé en liste de faces**, à résultats identiques (RESOLUTION.md d'abord). Empreinte et audit identiques.
- [ ] **4. Essai du d6** au laboratoire : Gorak, Ysolde, Aldric, Morgrut, depuis les dés de référence (PROGRESSION.md § 6.7) ; valeur imprimée de Pourfendre.
- [ ] **5. Conversion et forge d6** : les dix personnages (Fanchon et le druide compris), Copier une face, Refondre, quatre faces de compétence au plus ; retrait d'Agrandir, de Retailler et du Contrepoids (remplaçant au tournoi). `npm run balance`, empreinte mise à jour volontairement.
- [ ] **6. Campagne longue** : signature seule, 10 combats (4 forges, 6 reliques dans l'ordre retenu), courbe de 98 à 89 %, boss à 45 %. Puis l'utilisateur joue ; décision sur la fusion.
- [ ] **7. Types à l'écran**, reliques qui font durer (« +15 PV »), bonus par type, par impact.
- [ ] **8. Lots de contenu** : environ 35 compétences et leurs icônes, reliques qui lisent la forge, pièces maîtresses, paliers, recettes, plateau ; chaque lot mesuré par `npm run synergy`.
- Plus tard : super coups, sertissage, défenses par type, vies.
