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

- [ ] **Palette sémantique** : une couleur par famille ; l'ambre réservé au critique (aujourd'hui aussi ton « positive » dans `narration.ts`) ; la polarité montrée par la forme du cadre plutôt que par le vert et le rouge (FAMILLES.md § 3). Maquette d'abord.
- [ ] **Décomposition du coup** sous le chiffre de dégâts, maillon par maillon, à la Balatro (étude QW3).
- [ ] **Charges « armées »** : montrer ce qui attend le prochain coup ou la prochaine action (étude QW4).
- [ ] **Cadre d'icône par famille**, et repère de fenêtre (prochaine action, prochain coup porté, prochain coup reçu, durée, aura).
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
- [ ] **Ysolde** à 43,1 % (0.50.0), la plus basse du roster, à un point du plancher de 42 %.
- [ ] **Libellé du résultat de Pile ou face** caché par la pièce (`FightScreen.tsx`, signalé à la session de l'interface).
- [x] **Siffloter, Fausse note** (0.46.0) : les doubles frappent aussi leurs coups.
- [ ] **Écorce épaisse** (Thaldrin) « presque inutile » à la marge ; **Ouverture** **Ouverture** de la barde « écrasante » ; ses doubles « rares à l'écran » (un sur cinq jets, par construction). **Ysolde** à 44,4 %, la plus basse du roster de 10.
- [ ] **Raccourcis `npm run lab` et `npm run skills`**, une fois la refonte des sons terminée (`package.json`).
- [ ] **Premier ajout au moteur pour les sorts** : un effet à l'expiration d'un statut (compte à rebours, écho, réserve relâchée). Ensuite : agir sur le dé adverse (Sabotage, Prophétie).

## 16. Reliques, tournoi et méta

- [ ] **Séparer les suites de hasard** (une pour le dé de chaque combattant, une pour les effets), pour pouvoir rejouer un combat « sans la relique » à l'identique. Change toutes les graines : empreinte à mettre à jour, volontairement.
- [ ] **Première série de reliques** (environ six), construites sur les familles (FAMILLES.md § 7), avec les déclencheurs déjà disponibles. Impact visé : 5 à 15 points chacune, 20 au plus.
- [ ] **Modes par emplacement** : Aléatoire (graine), Imposé (verrou manuel), Aucun (témoin).
- [ ] **Tournoi** : 1 relique au départ, **dépouille** après chaque victoire, **étape** de mi-tableau (choix parmi 3), 3 emplacements au plus.
- [ ] **Choix automatique** : offre de 3 reliques tirées, note par goût, synergie et contexte, puis tirage pondéré (pas toujours la meilleure), expliqué dans le journal. En option, plus tard : la mémoire des personnages d'un tournoi à l'autre.
- [ ] **Montrer l'influence** : l'icône de la relique s'illumine quand elle agit ; le contrefactuel en fin de combat (« sans la Dent de loup, il perdait ») ; un tableau des reliques en fin de tournoi, et d'un tournoi à l'autre.
- [ ] **Édit de tournoi** : une règle changée pour tout un tournoi. Plus tard, des effets d'arène.
- [ ] **Paris entre deux observateurs** (règles validées le 2026-10-18 : [PARIS.md](PARIS.md)). Livraison par étapes :
  - [x] P1 : module de règles `betting.ts` et ses tests (cotes simulées, mises, règlement, coups de théâtre, prime de relance) ; pas encore visible en jeu ;
  - [x] P2 (0.37.0) : guichet sur l'écran d'affrontement, règlement sur l'écran de fin, bourses dans l'arbre, noms à la création du tournoi ;
  - [ ] P3 : guichet de tour dans l'arbre (les matchs simulés depuis l'arbre ne sont pas encore pariés) ;
  - [x] P4 (0.37.0) : coups de théâtre à l'écran ;
  - [x] 0.38.0 : refonte demandée par l'utilisateur : guichet de jeu vidéo, cotes cachées, mises fixes (50, 100, 200) et rattrapage du dernier, deux parieurs de l'ordinateur (Borin, Zlatka), écran de fin en deux moitiés (combat, paris), classement dans l'arbre et sur l'écran du champion ;
  - [ ] P5 : sons propres aux paris, icônes peintes (bourse, jeton, coup de théâtre, guichet, à demander).

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
- [ ] Puis généraliser au roster (3 générations par famille avec les planches de trois cases), à commencer par le nain, dernier placeholder. Seulement des postures communes à tous, jamais une posture de capacité.

