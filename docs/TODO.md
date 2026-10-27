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
- [ ] **Réglages proposés** (à valider, RELIQUES.md § 7) : Dent de loup (+21,4), Cotte du mercenaire (+18,1), Chapelet de l'ermite (+16,3), Dé creux sur Fanchon (+25,9). Depuis : Cotte réglée en 0.106.1 (+13,7), Dent de loup en 0.107.0 (+1 Vol de vie, +12,4).
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
- [ ] **6a. Campagne longue sur les dés actuels** (livré en 0.104.0, avancée à la demande de l'utilisateur, **à jouer**) : signature seule pour sept personnages (Morgrut, Thaldrin et Fanchon entiers jusqu'au d6), compétences quittées rendues au répertoire, 10 combats (4 forges, 6 reliques), courbe 98 → 89 %, boss 45 %, quatre faces de compétence au plus. Mesure dans PROGRESSION.md § 11.4 : boss atteint 47 %, apport du build +50 points au dixième combat, premiers combats sans enjeu, boss à 20 tours par combattant.
- [x] **3. Dé en liste de faces** (0.105.0) : `strikes`, `strikeValue`, `faceValue`, `Attack.printed` ; RESOLUTION.md § 3 d'abord. Empreinte et audit identiques au commit intermédiaire.
- [x] **4. Essai du d6** (0.105.0, essais jetables pendant la conversion) : les dés de référence retouchés ; Pourfendre frappe pour 4 ; Morgrut une seule Attente.
- [x] **5. Conversion et forge d6** (0.105.0, **à jouer**) : les dix personnages en d6 (Fanchon deux d6, le druide un sort par face), compétences quittées hors kit ; Copier une face, Refondre ; Agrandir et Retailler retirés ; Contrepoids en relique de critique. `npm run balance` à 800 combats par duel : 48,2 à 51,6 %, aucun duel au-delà de 65/35 ; empreinte mise à jour volontairement. Mesures dans PROGRESSION.md § 6.8.
- [x] **5 bis. L'attaque de base** (0.106.0, **à jouer**) : une attaque par personnage (petite fourchette, DP ou DM), un coup de base à chaque jet ; le dé ne fait plus que déclencher des compétences qui se greffent, modifient ou remplacent le coup ; valeurs imprimées, Refondre et Attente retirées ; Tremper l'arme ; courbe de campagne abaissée (90 → 88 %, boss 45 %). 312 tests ; `BALANCE_N=800 npm run balance` : 48,8 à 52,2 %, pire duel Elaria contre Morgrut 61,9 %, durée 17,2 → 16,0 tours ; reliques : Cotte +28,2 (au-delà de 20) ; campagne : boss atteint 27 %, acte gagné 13 %. Mesures dans PROGRESSION.md § 6 bis.7 et § 11.6.
- [x] **5 ter. Revue des compétences** (0.107.0, **à jouer**) : décisions de l'utilisateur du 2026-10-24 (PROGRESSION.md § 1.9) : une gravure vaut de 8 à 20 points ; la signature de Naraxes devient l'Aura de décoction ; l'Aura sauvage donne +1 à l'attaque par charge ; la barde passe sur ses faces (deux jets complets, Aura mélodieuse signature, Soliste ×3 une fois par combat, Ouverture gardée ; plus de doubles). Quinze compétences réglées (SORTS.md § 19), table des gravures dans `scripts/skills.report.ts` : les 29 gravables de +10,4 à +19,7 (avant +3,2 à +28,5). Stats compensées sans toucher aux PV. 317 tests ; `BALANCE_N=800 npm run balance` : 46,8 à 54,3 %, pire duel Elaria contre Morgrut 61,9 %, durée 15,8 → 15,2 tours ; `npm run relics` : Dent de loup 22,0 → 12,4 (+1 Vol de vie) ; `npm run campaign` : boss atteint 28 %, acte gagné 13 % ; empreinte mise à jour volontairement.
- [x] **6. Campagne longue en d6** (0.105.0 à 0.112.0, **à jouer**) : faces quittées en coups imprimés, Copier une face sous la limite, adversaires construits comme un champion (demande de l'utilisateur), signature affichée, boss en d6 ; mesure dans PROGRESSION.md § 11.5 (boss atteint 48 %, adversaires à 46-50 % de leurs PV) ; Fanchon à la signature seule (0.107.0, § 11.7). Thaldrin à sa signature, les Feux follets (0.109.0). **0.112.0** : deux compétences au départ (la signature sur le 1, la seconde du kit sur le 2), cinq faces de compétence au plus, levier des PV moins fort (plancher de 75 %, adversaires trois récompenses en retard), Thaldrin à l'attaque 5 à 6 en campagne ; boss atteint 26 %, acte gagné 12 % (30 parties par champion, § 11). Puis l'utilisateur joue ; décision sur la fusion.
  - [ ] Une relecture légère des répertoires pour le d6.
  - [x] **La courbe** : option B choisie par l'utilisateur le 2026-10-25, livrée en 0.113.0 : 78 et 86 % aux deux premiers combats, le reste inchangé (boss atteint 25 → 24 %, acte gagné 15 → 14 %, 30 parties par champion ; PROGRESSION.md § 1.13).
  - [x] **Thaldrin à l'attaque 5 à 6** : tranché par le modèle unique (0.113.0) : 5 à 6 dans tous les modes ; en tournoi 48,1 → 55,6 %.
  - [x] **Un seul modèle de personnage** (règle de l'utilisateur du 2026-10-25, livrée en 0.113.0) : le registre du roster est le personnage vanilla, le même en tournoi et en campagne ; `CAMPAIGN_CHAMPIONS` et `CAMPAIGN_STATS` retirés ; roster de 45,8 à 55,6 %, pire duel Naraxes–Ysolde 62,3 %.
  - [ ] **À trancher : Thaldrin à 55,6 %** (haut du roster) : garder, ou 53 PV (47,6 %) ; **Ervald à 45,8 %** : critique 26 % (47,8 %) si on veut le remonter.
  - [ ] **Signature ou seconde** : Brokk (Peau de pierre) et Ysolde (Purification) ont une seconde compétence qui vaut autant ou plus que leur signature ; aucune signature sous la bande de 8 à 20 points.
- [x] **Évaluation des signatures et des auras** (0.108.0, PROGRESSION.md § 13.3 ; tranchée par l'utilisateur le 2026-10-24, § 1.10 ; **livrée en 0.109.0**) : le lot de cinq reliques consommatrices (Fiole de venin, Croc de boucher, Encens de l'abbaye, Écu cabossé, Plume d'aigle ; Fiole au palier de 1 Poison) et le statut Élan ; la signature de Thaldrin (les Feux follets) ; mesuré : 11 reliques sur 21 ont un partenaire, Écu +15,5. État des lieux écrit (§ 0 bis).
  - [x] Icônes des cinq reliques (0.109.1, planche v14, générée avec Artlist ; STYLE_BIBLE § 7) ; l'Élan garde l'emblème de la Puissance (un statut montre l'emblème de son état, 0.96.2), sans icône propre.
- [x] **Revue des compétences, statuts et reliques** (écrite en 0.109.1, [REVUE_CONTENU.md](REVUE_CONTENU.md) ; corrigée en 0.110.0, restes en 0.110.1) : moteur M1 à M4, écran et son A1 à A7, axe de rang de chaque compétence (E1 : un rang II de +3,6 à +8,0 points, demi-rangs, Feux follets aiguisables), textes T1 à T15 sauf T12, documents en retard ; équilibre du roster identique.
  - [x] Tranchés par l'utilisateur le 2026-10-24 (0.110.1) : T12, l'Élan s'appelle Ferveur ; E4, une Peur bloquée par une immunité use quand même sa fois par combat (testé).
  - [x] A8 : cinq emblèmes d'état (Pourriture, Brèche, Luciole, Coup gâché, Vulnérable ; 0.110.1, planche v15, générée avec Artlist ; STYLE_BIBLE § 7). Pas encore vus dans un écran de jeu.
  - [x] Son de la Foudre : l'ancien gardé (décision de l'utilisateur), chaque éclair rejoue le Coup critique ; l'Éclair synthétisé de la 0.110.0 retiré (0.110.1), plus de fichier à faire.
  - [ ] Le résumé de l'état Puissance, que la Ferveur alimente pour un seul coup (second volet de T12).
- [x] **Retours de partie du 2026-10-24** (0.111.0, PROGRESSION.md § 1.11) : axes de rang entiers (plus de demi-rang) ; signature sur la face 1 seulement (Thaldrin : Feux follets sur le 1) ; Dorer et graver seulement une face libre, plus de « +2 » sur une face dorée ; Copier vers une face choisie ; les six faces dans la zone de compétences du combat ; plus d'icône de dé au choix du champion ; reliques en texte court, sans type ni élément, une limite ou une recharge (Géode sans recharge) ; offre de reliques pertinente en campagne ; attaque d'un type unique, coup blanc ; mise en scène dé rendu → intervalle → impact (M40, M17 bis, M19, M23, M11). Campagne : boss atteint 23 → 27 %, acte gagné 10 → 10 %.
  - [x] **Tranché le 2026-10-24 : les onze rangs II au-dessus de +8 points** (Aura glaciale +10,2 … Aura de précision +8,0) sont gardés pour le moment (PROGRESSION.md § 1.12).
  - [x] **PV des adversaires** : levier moins fort, livré en 0.112.0 (plancher de 75 % des PV de base, adversaires trois récompenses en retard ; PV au plus bas 25 → 75 %, en moyenne 62 → 83 %).
  - [x] **Deux compétences au départ** : livré en 0.112.0 ; aucune signature sous la bande de 8 à 20 points.
  - [x] **La Purification** : décision de l'utilisateur du 2026-10-25, livrée en 0.113.0 : l'effet sur soi (0.69.0) est retiré ; elle retire le dernier bonus de la cible, sinon lui inflige 5 dégâts directs. Valeur nette +21,7 → +19,3 ; Ysolde 48,4 → 45,9 %. Elaria « critique beaucoup » : rien à faire.
  - [x] **Purification 5 → 6 dégâts** : décision de l'utilisateur du 2026-10-25, livrée en 0.115.1 ; Ysolde 45,9 → 48,3 % (800 combats par duel), valeur nette +19,3 → +21,8.
  - [ ] À juger en jeu : la forge en deux temps (copie, non vue), les cases vides de la zone de compétences, les textes de reliques, le coup blanc, le signal des reliques et le rythme de la rafale.
- [ ] **Auras** (§ 1.10) : évaluer si elles s'insèrent naturellement dans le nouveau jeu, et les retoucher si besoin pour les rendre plus naturelles, utiles et synergiques.
- [ ] **Compétences** (§ 1.10) : valider, tester et auditer les compétences existantes ; en ajouter d'autres en pensant par familles (FAMILLES.md) ; des descriptions courtes et simples, qui portent le fonctionnement.
- [x] **Revue des auras et des compétences (2026-10-25)** ([REVUE_COMPETENCES.md](REVUE_COMPETENCES.md), [PROGRESSION.md](PROGRESSION.md) § 1.19). Validée par l'utilisateur (« ce qui n'est pas l'objet d'une remarque est validé ») et **appliquée en 0.118.0** : A1 à A5, P1 à P5, R1 à R3, I1 (Bouclier de foi), I3 (Pas de côté), I4 (Plaie ouverte), O1 à O3, T1 à T7, X2 (accroche « gêne ») ; X3 livré à part (`npm run ramp`). Écartée : R4.
  - [x] **Tranchées le 2026-10-25** (décisions de l'utilisateur) : X1 appliquée en 0.118.1 (les Épines acérées deviennent l'Aura d'épines, classée aura ; règles inchangées) ; I2 (Brèche) abandonnée.
  - [ ] À juger en jeu : Fausse note au bord haut (+20,0), rangs II gravés des Feux follets (+9,2) et de la Foudre (+9,6) au-dessus de la bande.
- [x] **7. Types à l'écran, reliques qui font durer.** Fait en 0.108.0 : les types à l'écran (retirés en 0.111.0, attaque d'un type unique, choix de l'utilisateur). Fait en 0.112.0 : trois reliques de durée, offertes à tous (Gambison matelassé « +15 PV max et −1 à l'attaque » +8,7 ; Onguent du rebouteux « +1 PV lors d'un coup reçu, 5x » +12,0 ; Chandelle de veille « +2 armure temporaire tous les 3 tours » +11,5 ; RELIQUES.md § 14), icônes peintes (planche v16). Les **bonus par type** (« +N aux DM ») sont **abandonnés**.
  - [x] Tranchés par l'utilisateur le 2026-10-25 : le troc du Gambison est gardé (−1 à l'attaque) ; les noms des trois reliques sont gardés pour l'instant.
  - [x] L'Onguent plus fort : livré en 0.121.0 sous une autre forme (« +3 PV lors d'un coup reçu, 2x », +11,1 → +13,3 ; retour M11).
- [ ] **8. Lots de contenu** : environ 35 compétences et leurs icônes, reliques qui lisent la forge, pièces maîtresses, paliers, recettes, plateau ; chaque lot mesuré par `npm run synergy`.
  - [x] **Premier lot** (0.114.0, [SORTS.md](SORTS.md) § 22) : cinq compétences consommatrices, Curée (Saignement), Récolte et Virulence (Poison), Sentence (soins), Rancune (coups encaissés) ; `applyStatus.fromStatus` ; une compétence à condition fausse laisse sa face nue ; offre de compétences pertinente en campagne ; icônes peintes (planche v17, Artlist ; la Rancune reprend `grudge.png`). Campagne : paires liées par build 3,27 → 3,70.
  - [ ] **À confirmer par l'utilisateur** (choix de l'agent après « enchaîne ») : cinq sans le Rempart hérissé (rang II hors bande) ; Virulence « Triple » (`fromStatus`) plutôt que « +3 Poison » ; Rancune critique plutôt que Ferveur ; Naraxes inchangée (Virulence +0,7 chez elle : son Poison s'estompe avant son jet ; décoction plus forte ou consommatrices qui lisent le Poison au coup, à trancher) ; la Rancune sous l'état Renvoi.
  - [ ] À voir en jeu : la rafale de la Curée après un coup de base, l'aura Sentence, la Rancune sous Renvoi, les quatre icônes ; Virulence × Fiole de venin −0,17 (anti-synergie, non traitée). Le texte du rapport de `npm run campaign` est corrigé (0.115.0).
  - [x] **Second lot** (0.115.0, passe de nuit, [SORTS.md](SORTS.md) § 23, [RELIQUES.md](RELIQUES.md) § 15) : Embrasement (Brûlure), Dé pipé (pile), Rempart hérissé (moment « bouclier vidé », `shieldBroken`), Vindicte (« quand il renvoie des dégâts », `reflected`) ; quatre reliques (Soufflet de forge, Clous de pavois, Gantelet du talion, Pièce trouée ; 28 en tout) ; déclencheur `heads`, relâche sur l'adversaire, pièce chargée, `hinders` ; icônes peintes (planches v18 et v19, Artlist) ; Rempart hérissé +6 Épines par rang (+3,2) ; offre pertinente « le producteur d'abord » dans tous les modes.
  - [ ] **À trancher par l'utilisateur** (passe de nuit, [ETAT.md](ETAT.md) limites connues) : Ervald 10 % au boss sur 90 parties (à remesurer) ; présence des lots chez Elaria et Fanchon (39 et 45 % des actes) ; écart des builds en saison (37 à 68 %, écart-type 10,7, mesuré avant le Duo ; la forge) ; défauts du tournoi (saison, forge, reliques activées) et glyphe `reglages` ; multiplicateurs de critique ×2,2 à ×2,5 gardés ; label de la Rancune en « + » et son Coup de l'Embrasement. Tranchés le 2026-10-25 (0.115.1) : Purification à 6 ; les trois rangs II du lot (Rempart hérissé +3,2, Embrasement +0,6, Dé pipé +1,1) acceptés pour le moment. Livrés en 0.116.0 : Fanchon (ci-dessous) et les builds sur les cartes de l'arbre (dé forgé en miniature et reliques, demande de l'utilisateur).
  - [x] **Fanchon à un seul d6, le Duo** (décision de l'utilisateur du 2026-10-25 : lancer le Duo ; livré en 0.116.0, [PROGRESSION.md](PROGRESSION.md) § 1.16) : Duo sur le 1 (+1 Aura mélodieuse, puis deux dés à l'action suivante, mécanique de Coup de chance), Soliste sur le 2, Ouverture gardée ; attaque 4 à 6, critique 5 % ; Aura de puissance à la place de Coup de chance au répertoire ; les deux dés retirés. Fanchon 46,7 → 47,4 % ; saison 69 → 57 % ; icône peinte (planche v20). Restent : le rang II du Soliste à +8,3 (limite haute, signalé) ; la campagne de Fanchon à remesurer (12 parties, bruit large) ; Elaria seule en tête de saison (72 %).
  - [ ] **Zone des bandeaux sous le dé : un chantier à part entière** (décision de l'utilisateur du 2026-10-25 : « c'est un peu le bordel cette zone… la revoir fait l'office d'un chantier à part entière »). Étude faite, rien de codé. Mesuré (1 200 combats construits, 1 200 nus) : 10,5 labels par combat (5,0 nus), pile de 3 ou plus dans 37,8 % des combats (5,0 % nus), 47,5 % des labels causés par le défenseur, 12,4 % à convention de signe inverse, 43 % sans « + » ni « − » écrit, 58 labels de la Cloche d'ouverture qui sonnent sans s'afficher, 829 sous un plateau vide. Recommandation : **chacun chez soi** (le critique seul sous le dé, Face dorée et relique de coup en pastilles accrochées au dé, chaque statut à la zone d'état de son porteur, chaque relique à son sceau ; plus de hachures). Pile de 3 ou plus au centre : 37,8 → 1,3 %.
    - [ ] **Pistes de l'utilisateur du 2026-10-25, à réfléchir** (« noter ta piste ; noter d'autres pistes aussi […] Aujourd'hui c'est fouillis et on ne sait plus trop à quel saint se vouer ») : uniquement les bandeaux de l'attaquant ? les bandeaux du côté de qui ils appartiennent ? remettre à plat l'utilité et le but d'un bandeau ? Notées en questions ouvertes, avec la piste « chacun chez soi », dans [MISE_EN_SCENE.md](MISE_EN_SCENE.md) § 5 bis ; aucune retenue.
    - [ ] **Trois choix de l'utilisateur avant de coder** : (1) **le signe** : remplacer hachures et « + / − » par l'emplacement et un texte en PV (« Bloque 2 », « Renvoie 7 », « +14 PV »), avec ou sans liseré à la couleur du camp ; (2) **le son des labels** : garder le point de vue de l'attaquant (recommandé, sans les exceptions de la relique et de la Rancune du défenseur) ou passer à celui du propriétaire ; (3) **le critique sans décimale** : « Critique 2x » si entier ; pour ×2,4, « Critique +7 » (dégâts ajoutés) ou le multiplicateur arrondi.
    - [ ] Phase 0, corrections sans refonte : la Cloche d'ouverture visible ou tue, Critique assuré fondu dans Critique, critique sans décimale, contrôles « aucun label invisible » et « aucun label sous un plateau vide ».
    - [ ] Phase 1, les reliques à leur sceau (bulle sous le sceau avec `relicPulse` ; relique de coup en pastille du dé).
    - [ ] Phase 2, les statuts à leur zone d'état (Face dorée en pastille du dé ; sous le dé, le critique seul).
    - [ ] Phase 3, le signe et les mots (plus de hachures, textes en effet d'abord, son selon le choix 2 ; RESOLUTION § 11, design-system § 3.1, SONS § 4.4 réécrits).
  - [x] **Sources des familles** (validées par l'utilisateur le 2026-10-25, « je te laisse intégrer » ; livrées en 0.117.0, [RELIQUES.md](RELIQUES.md) § 16, [PROGRESSION.md](PROGRESSION.md) § 1.17) : quatre reliques de source offertes à tous, Dard de guêpe (+10,7), Briquet d'amadou (+9,6), Pièce de foire (+11,8, recharge 3 tours), Brassard à pointes (+8,8) ; icônes peintes (planche v21). Règle 7 resserrée en exception pour le Poison et la Brûlure (règle de l'utilisateur pliée, signalée).
    - [ ] À voir : le Dard, le Briquet et la Pièce de foire partagent le 6 avec le Dé creux (−0,12 avec la Pièce de foire, −0,24 chez Morgrut) ; le Brassard n'a pas de partenaire (meilleur +0,12) ; label du Dard et du Briquet et icônes non vus à l'écran.
  - [x] **Elaria systématiquement la plus forte une fois construite** (l'utilisateur, 2026-10-25 : « qu'elle puisse devenir cheatée n'est pas un problème, mais si elle l'est systématiquement ») : mesuré, elle l'est (moyenne 67,8 %, 57 % de builds au-dessus de 65 %, pire 49,2 ; la forge vaut +45,9 chez elle). **Tranché** ([PROGRESSION.md](PROGRESSION.md) § 1.18) : A, Coup de chance hors de son répertoire, **refusé** (« il ne faut pas fermer de possibilité, c'est bridant, frustrant ») ; B, **Esquive améliorée non cumulable, livrée en 0.117.1** (une charge au plus ; son rang devient +2 dégâts en attendant l'esquive, rang II +3,3) : moyenne 67,8 → 65,0 %, au-dessus de 65 % 57 → 48 %, pire 44,4, meilleur 90,0 ; roster nu et empreinte inchangés ; saison 70 → 68 %.
    - [ ] Elle reste première construite (65,0 % ; Naraxes 56,8). **Question ouverte de l'utilisateur** (2026-10-25, « ne change rien mais réfléchis à la question ») : « le fonctionnement et la montée en puissance d'Elaria, que nous estimons "cassée" actuellement par rapport aux autres, pourrait-il devenir la base de tous les persos ? Son état actuel n'est-il pas la cible que les autres doivent atteindre, plutôt que de la faire rentrer dans le rang ? » Étude de l'agent (rien de changé) : sa pente vient d'abord de la **qualité des briques de son offre** (gravures +13,4 en moyenne, aucune consommatrice faible) et d'**une boucle multiplicative** (Œil de faucon et Aura de précision), pas de ses stats (retirer son esquive et son ×2,4 à vanilla égal ne change rien) ; piste : relever le plancher des briques des autres et donner une boucle à chacun, plutôt que de la brider (proposition à valider).
    - [ ] **La piste de la montée** (consignée le 2026-10-25, [PROGRESSION.md](PROGRESSION.md) § 13.4 ; chaque étape à valider) :
      - [x] 1. Un rapport permanent de la pente des dix (force de 0 à 10 récompenses, apport de chaque gravure chez son porteur réel, part des briques sous la bande) : **fait en 0.118.0** (X3, `npm run ramp`).
      - [ ] 2. Relever les briques souvent prises sous la bande vers +10 à +16 (Sentence, Vindicte, Virulence, Récolte, Rempart hérissé, Fausse note, Curée chez Gorak, rangs II de kit sous +4) : **en grande partie fait par la revue (0.118.0)** : Sentence +7,1 → +16,1, Vindicte +6,3 → +9,6, Rempart hérissé +6,0 → +10,2, Virulence (Ervald) +4,9 → +12,0, Récolte +5,8 → +8,3, les quatre rangs II de kit dans la bande ; briques souvent prises hors de leur bande 22 + 3 → 10 + 2, écart des construits 26,1 → 20,9 points. Restent sous la bande : Curée chez Gorak (+7,3), Vol de vie chez Gorak (+6,9), Fausse note (+7,8), et des briques d'ailleurs chez Thaldrin.
      - [ ] 3. Une boucle multiplicative par personnage, au laboratoire d'abord.
      - [ ] 4. Remesurer Elaria sans la toucher (0.118.0 : 66,0 → 63,0 %, la mesure est à somme nulle) ; Thaldrin (pente −11,1 → −12,9 après la revue) reste à part.
  - [x] **Lot 3** (0.119.0, livré en l'absence de l'utilisateur, [PROGRESSION.md](PROGRESSION.md) § 1.20, [SORTS.md](SORTS.md) § 28 et § 29) : « les points avant » de [REVUE_COMPETENCES.md](REVUE_COMPETENCES.md) § 5, sans le dernier (les reliques, plus tard dans le plan). Cinq malus de famille (Brise-garde, Malchance, Éclair aveuglant, Hémorragie, Confiscation) avec cinq briques de moteur ; sept fils minces (Feinte, Sève noire, Dette de sang, Attiser, Ciel d'orage, Ivresse du sang, Coup de massue) ; tous hors kit, dans `offers.ts` (la même évolution en campagne et en saison) ; rafale qui dépense tous les coups instantanés ; mise en scène M46 à M50 ; 16 sons de famille (ElevenLabs) ; icônes peintes (planches v23 et v24, Artlist). Roster nu et empreinte inchangés ; campagne boss atteint 21 → 17 %, saison 32-69 % → 34-65 %.
    - [ ] **À juger par l'utilisateur** : les choix du parent (Hémorragie à 4 PV fixes ; Aveuglé n'ouvre que la fenêtre « raté » de l'attaquant ; Feinte chez Naraxes et Fanchon, pas chez Elaria, qui reçoit le Coup de massue ; Sève noire gardée avec son rang II à +2,6 ; délai de l'Ivresse du sang accepté par l'audit) ; Confiscation au rang II sous la bande (+2,5) ; Ciel d'orage faible chez Thaldrin construit (+2,8, 3 builds, à remesurer au laboratoire) ; Dette de sang chez Aldric +6,8 ; boss de campagne 21 → 17 % (30 parties, sans doute du bruit).
    - [ ] **À écouter et voir** : les 16 sons de famille (choisis sur mesures, sans écoute ; Esquive − écrêtée à la source, à régénérer si la Luciole revient), la licence ElevenLabs (offre gratuite, sans licence commerciale) avant toute publication ; le jet à vide, « RATÉ ! », le « 0 » barré, l'icône volée et les douze icônes dans un écran de jeu.
  - [ ] **Ensuite** : le jugement en jeu des lots et de la revue (campagne et saison) ; le lot suivant (reliques qui lisent la forge, pièces maîtresses, paliers) après ce retour.
  - [ ] **Effets de scène pour les compétences** (l'utilisateur, 2026-10-25 ; redemandé le 2026-10-27, S10) : règle M54 et deux scènes livrées en 0.121.0 (Éclair aveuglant, Peur) ; restent proposées l'onde du Coup de massue, la pluie de pièces de Malchance et de Coup de chance, la giclée de l'Hémorragie, la colonne de la Purification.
  - [ ] **Progression entre les parties, à réfléchir** (l'utilisateur, 2026-10-25 ; P11 du 2026-10-27) : aujourd'hui tout le contenu est disponible d'emblée. Piste de l'utilisateur : débloquer au fil des parties des briques qui font boule de neige. Proposition de 0.121.0 ([MAITRISES.md](MAITRISES.md) § 8) : des rangs de maîtrise partagés entre personnages ; non mesurée, rien de décidé.
- [x] **Retour du 2026-10-27 : les Maîtrises** (livré en 0.121.0, [PROGRESSION.md](PROGRESSION.md) § 1.21, [MAITRISES.md](MAITRISES.md)) : chaque point du retour (V1 à V5, P1 à P11, M1 à M12, S1 à S11, C1 à C7, U1 à U6, R1 à R5) corrigé, vérifié ou réfléchi ; onze maîtrises (huit depuis la 0.122.0), deux par personnage, dé de départ (aura au choix sur le 1, signature sur le 2), Graver par maîtrise, choix d'aura en campagne, onglet Maîtrises ; Critique assuré qui s'use (remplacé en 0.122.0 par une charge), Poison en fin de tour, Riposte manquée contre l'esquive imposée ; Aura mélodieuse et Pièce de foire retirées ; Médaille de sursis, Cor d'avant-garde, Pièce lestée ; réglage (Elaria, Purification, Vol de vie) ; icônes v25 à v27.
  - [ ] **À trancher par l'utilisateur** : Fanchon construite 62,2 % (Copie du Duo, options mesurées dans PERSONNAGES « Le réglage de la vague 2 ») ; Ysolde construite 37,7 % ; noms des maîtrises et des briques (Q7) ; quatre dés au Duo ; ordre de l'arbre ; ding du Duo ; nature des compétences ou couleur de maîtrise. Repris au second retour (0.122.0) : les auras de départ de Morgrut et le Dé pipé passent par la règle commune des départs (B5), le Dé pipé à double effet est étudié (B12), la Riposte entre dans B9, Pièce maudite gardée en l'état, Pièce de foire retirée (confirmé).
  - [ ] **À juger en jeu** : tout ce qui n'a été vu qu'en captures (survol, sorts à scène en mouvement, Rétribution coup par coup, rafales du Duo) ; aucun son entendu ; Aura de pourriture (+7,0) sous la bande ; Plume d'aigle chez Elaria +20,5.
  - [ ] Relique « face 6 nue joue la 2 » (P10, proposée, non mesurée) ; relique qui active les auras d'entrée (R5) non livrée (elle deviendrait obligatoire).
- [x] **Second retour du 2026-10-27** (livré en 0.122.0, [PROGRESSION.md](PROGRESSION.md) § 1.22) : huit maîtrises (Chant, Chasse, Représailles fondus, Orage devenu Magie), deux par personnage, auras de départ par la règle du producteur d'abord, aura tirée en tournoi et en saison, Critique assuré à une charge, compendium sans onglet Auras ni porteurs, 29 icônes de reliques recolorées (planche v28).
  - [ ] **Ce qui attend l'utilisateur** :
    - **Contenu des maîtrises** (B6) : ses propositions pour égaliser les huit en contenu, sans invention de l'agent ; trous listés dans [MAITRISES.md](MAITRISES.md) « Huit maîtrises » § B6 (Sang et Poison à 6 briques, Chance à 10 ; l'Ombre n'a que deux auras, toutes deux au critique ; Fureur et Ombre sans boucle interne ; Lumière à un seul porteur). Représailles au Rempart plutôt qu'à la Fureur : à confirmer. Morgrut : une face 2 pour que ses autres auras de départ vivent ?
    - **B9, Riposte et Rétribution comme coups** ([RESOLUTION.md](RESOLUTION.md) § 9, option A recommandée, non implémentée) : (1) un renvoi ne déclenche pas de renvoi ? (2) un renvoi dépense-t-il le Critique assuré ? (3) une frappe par jauge de Rétribution ? (4) les reliques « aux adversaires empoisonnés… » sur un renvoi ?
    - **B11 à B13, les auras** ([AURAS.md](AURAS.md) § 7, Q-A1 à Q-A5) : aura de départ au plus tard au 3e tour avec Purification +5 ; 3e ou 2e tour ; Dé pipé « +5 % crit et +5 % esquive par charge » ou « +10 % crit » ; relique R5 ensuite ; formes de dés de plus à explorer.
    - **B16, longueur des combats** ([etudes/LONGUEUR_COMBATS.md](etudes/LONGUEUR_COMBATS.md) § 6) : endurcissement à +2 PV max par récompense (ou +1,5, +3) ; PV ×1,25 pour les combats nus ; adoucir les multiplicateurs cumulés.
    - **B17, coût du contexte** ([etudes/CONTEXTE.md](etudes/CONTEXTE.md)) : ETAT réduit à l'état présent (O1), FEATURES sans historique (O2), checklist de `CLAUDE.md` réduite (O6).
    - **B18, format des retours** ([etudes/RETOURS.md](etudes/RETOURS.md)) : adopter le gabarit `prompts/GABARIT_RETOUR.md` ; un renvoi dans `CLAUDE.md` vers RETOURS § 6.
    - **Duo** : « pour le moment, laisse en l'état » ; ce qui remplacera ses dés de plus reste à décider.
    - **Équilibre des départs** : six auras de départ sous 42 %, Aldric en Intimidation contre Elaria à 66,0 %.
- Plus tard : super coups, sertissage, défenses par type, vies.

## 21. Mise en ligne (demande du 2026-10-26)

Plan : [EN_LIGNE.md](EN_LIGNE.md). Premier objectif de l'utilisateur : partager le jeu avec des amis, se connecter avec Google et retrouver son historique lié à son compte, sans gérer de communauté. Montage retenu : option A (Firebase Auth seul ; Caddy, API Node et SQLite sur le VPS Infomaniak). Aucun code avant le feu vert de l'utilisateur.

- [x] Étude (Firebase, problèmes, possibilités) et plan rédigé (2026-10-26).
- [ ] **Décisions de l'utilisateur** (EN_LIGNE.md § 9) : D1 sur invitation ou ouvert ; D2 l'adresse ; D3 jeu public ; D4 réécrire le principe 6 d'`INTENTION.md` ; D5 campagne synchronisée ; D6 droits des images (ChatGPT) et des sons (ElevenLabs, offre gratuite sans licence commerciale, voir § 20).
- [ ] **Vérifier le VPS** : système, Node, mémoire et disque libres avec le cache et le poller météo, serveur web déjà en place, trafic inclus dans la formule.
- [ ] Étape 1 : mise en ligne statique (Caddy, HTTPS, script de déploiement).
- [ ] Étape 2 : couche de stockage dans le jeu (`history.ts`, `campaign.ts`), sans changement visible.
- [ ] Étape 3 : connexion Google (Firebase Auth), bouton et écran du compte.
- [ ] Étape 4 : API Node et SQLite, vérification du jeton, liste d'invités.
- [ ] Étape 5 : synchronisation (import à la première connexion, écran de choix, envois groupés, hors ligne).
- [ ] Étape 6 : solidité (sauvegarde quotidienne de la base, surveillance, suppression des données, page « Ce qu'on garde »).
- Plus tard : remontée des combats, salons de paris sur téléphone (graine et cotes tenues par le serveur), classements et PvP asynchrone.
