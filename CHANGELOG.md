# Changelog

Ce fichier liste les changements entre deux versions du jeu. Il suit le format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le versionnage sémantique, adapté à un prototype :

- **mineure** (0.x.0) : nouvelle fonctionnalité ou nouveau contenu ;
- **correctif** (0.x.y) : correction ou réglage, sans nouvelle fonctionnalité.

La version en cours est celle de `package.json`. Elle s'affiche en bas à droite de l'écran d'accueil.

> Les versions 0.1.0 à 0.10.0 ont été reconstituées à partir des itérations successives du prototype, faites avant la mise en place de cette documentation. Elles n'ont ni date précise ni commit associé.

## [Non publié]

### Ajouté
- **Icônes peintes** à la place des emojis dans les boutons, fiches, statistiques, arbre de tournoi et statuts (`src/assets/icons/`, composant `Icon`). Le journal de combat garde ses emojis pour l'instant.
- `scripts/slice-icons.py` : découpe d'une planche d'icônes générée par ChatGPT Image, y compris quand le damier de transparence est peint dans l'image.
- Écran de sélection : fond illustré (`src/assets/menu-portal.jpg`, portail d'arène au crépuscule), assombri avec un vignettage pour garder les fiches lisibles.
- **Icônes des huit compétences** (planche v2) : Aura de précision, Esquive améliorée, Vol de vie, Aura de poison, Furie des vents, Aura de puissance, Aura d'intimidation et Épines remplacent leurs emojis dans la zone d'état, les fiches et le compendium. Les quatre auras, permanentes, se reconnaissent à leur halo de couleur.
- Onglet Tournoi de l'accueil : fond dédié (`src/assets/menu-tournament.jpg`, porte fortifiée de l'arène vue du parvis), qui remplace la rangée de tout le roster. La présentation et les boutons (« Commencer un tournoi », « Reprendre le tournoi ») sont sur la moitié droite, au style `.btn`.

### Modifié
- **Fiche produit** (2026-10-19, vision donnée par l'utilisateur) : Battler est un auto-battler roguelike à regarder et à parier, avec deux terrains de jeu en parallèle (les combattants, les parieurs) et un double but (un jeu ludique, une expérience de développement). Écrite en tête de `docs/INTENTION.md`, résumée dans `CLAUDE.md` avec les repères de l'utilisateur, les nouveaux documents (PARIS, SORTS, FAMILLES, ETUDE_AUTOBATTLER, TODO), les outils de mesure et la conduite à tenir quand un autre agent travaille en même temps. Principes 8 à 10 ajoutés à `INTENTION.md` (personnage précis, paris sans effet sur le combat, jeu vidéo et non page web).
- `docs/STYLE_BIBLE.md` réorganisée pour être reprise d'une session à l'autre (2026-10-19) :
  - une section « Par où commencer » (qui fait quoi, où regarder, points en suspens) ;
  - un gabarit de personnage à jour, avec BUILD, POSE, fond gris, exception au bloc STYLE et personnage à plusieurs formes ;
  - prompts de l'ogre et du druide (deux formes, rappels communs), et gabarit « titanesque » ;
  - icônes 36 à 42 sous leurs vrais noms de fichiers, avec des règles de design et un gabarit de planche unique ; les planches v1 à v5 sont réduites à leurs motifs ;
  - transparence dans ChatGPT : vérifiée et documentée. Seules 2 planches sur 6 avaient un vrai canal alpha. On vérifie donc toujours le fichier.
- `docs/STYLE_BIBLE.md`, section arènes : un bloc fixe générique (rendu et composition) plus une fiche de lieu à remplir, six axes de variation (lieu, intérieur ou extérieur, heure, météo, lumière, palette), un catalogue de 13 lieux prêts à l'emploi (égouts, grande place, cimetière, port, désert, caverne de cristaux, marais, cathédrale, toundra, forge volcanique, bibliothèque…), des garde-fous pour les lieux sombres et un historique des arènes.
- **Boutons au style jeu vidéo** (`.btn`, `.btn-primary`, `.btn-round`, `.tabs` dans `index.css`) : plaques d'or ou de pierre au liseré de bronze, en relief, qui s'enfoncent au clic, avec du texte en Cinzel capitales et des icônes de taille fixe. Appliqués à l'écran de sélection (Statistiques et Son en médaillons, onglets Affrontement / Tournoi, Fiche, Au hasard, Combattre) et à l'écran d'affrontement (Changer, Jouer, Simuler).
- `docs/STYLE_BIBLE.md` : ajout du gabarit de fond de menu (prompt validé du portail) et d'une section sur les icônes d'interface (inventaire des 16 emojis à remplacer, prompt de la planche, conventions de découpe et d'intégration, procédure pour en ajouter, historique des versions).
- `docs/STYLE_BIBLE.md` : direction artistique précisée. Le style reste high fantasy stylisé et peint à la main, avec des couleurs franches par faction et des proportions héroïques exagérées. Les visages sont fins et charismatiques, et le look jeu mobile casual ou gacha (visages ronds ou grossiers, gros yeux, couleurs bonbon, rendu plastique) est explicitement exclu.

## [0.55.0] — 2026-10-20

Retours de l'utilisateur sur la lecture des combats.

### Ajouté
- **Cerclage du compteur qui décroît** : quand un état perd une charge ou un tour, un cerclage autour de son nombre se vide de la part perdue (de 3 à 2, un tiers), pendant le rebond, puis s'efface.
- `look.footroom` (vide de la toile sous les pieds) : l'image est redescendue d'autant, partout où elle s'affiche (combat, accueil, affrontement, fin, fiche du compendium).

### Modifié
- **Furie des vents instantanée** : son badge tombe avec le 2 qui la déclenche, avec son nom ; puis, après une demi-seconde, les dés des deux coups apparaissent **à plat**, sans nouveau lancer, et les frappes partent. Règle générale : une compétence qui agit tout de suite pose son badge au résultat du dé. Une relance dans la même action affiche « ×2 » dès le dé.
- **Pile ou face** : la pièce tournoie, puis le résultat, son « ding » (pile), son badge et son texte tombent d'un bloc ; un temps pour le lire (0,65 s), puis la frappe (`SONS.md` mis à jour).
- **Textes flottants devant le combattant**, du côté de l'adversaire, au lieu de derrière lui (essai demandé par l'utilisateur : l'œil reste près du centre, où tombent les dés).
- **Badge du Vol de vie** en violet profond (la cape du mort-vivant) au lieu du rouge-rose, qui se confondait avec les dégâts.
- **Naraxes redescendue** (`footroom` 0,04) : sa toile avait 6 % de vide sous les pieds (sa queue au K.O. descend plus bas), elle paraissait flotter ; elle touche le sol comme l'orc et la barde.

### Corrigé
- **Tremblement de la Peur** : il animait la propriété `translate` de l'image, qui la centre sur ses pieds ; le combattant sautait d'une demi-largeur de côté, surtout visible sur les toiles larges des personnages à postures. Le tremblement passe sur un conteneur. Test.
- **Liseré coloré des sceaux** dans les infobulles des dés (accueil, en-tête du combat) : la couleur de l'éclat des dés (`--nature`) était lue par le sceau ; l'éclat a sa propre variable (`--pulse`).

### Documentation
- `STYLE_BIBLE.md` : icônes à refaire ou à créer, **Fleur de vie** (le cœur vert générique de la Régénération) et **Rage du sang** (aucune icône).

## [0.54.0] — 2026-10-20

### Ajouté
- **Postures d'Ervald** : garde, attaque, esquive, coup encaissé, K.O. et victoire, générés par l'utilisateur avec l'atelier des postures. C'est le quatrième personnage à postures, après Gorak, Naraxes et Fanchon. La nouvelle garde remplace `undead.png` (à la corbeille).
  - **Plus d'amplitude** (demande de l'utilisateur) : le personnage se tourne presque de profil dans la case d'action, et l'action reste parallèle à l'image, sans rien qui vise le spectateur. L'attaque est une fente en extension vers l'adversaire ; le coup encaissé repousse tout le corps vers l'arrière.
  - **Taille inchangée à l'écran** : `scale` 0,98 → 1,16 (la garde occupe 83 % de sa nouvelle toile), `headroom` 0,15, portrait recadré (`zoom` 5). Vu par capture : accueil, affrontement face à Aldric, attaque, coup encaissé, esquive et victoire en combat. Le K.O. n'a pas été vu.
- **Atelier des postures** (page de prompts hors du jeu, sources dans `logs/atelier/`) : des prompts complets à copier d'un clic, une conversation ChatGPT par personnage, la garde jointe une seule fois. Il fait quatre planches par personnage : A attaque, B coup encaissé, C esquive (deux cases de 768 px chacune, la garde du côté opposé au mouvement), D K.O. et victoire (trois cases). Aldric et Morgrut reçoivent un nouveau modèle sans arme au-dessus de la tête, et Brokk une garde originale.
- `scripts/slice-poses.py --contours` : sépare les figures d'une planche par leurs silhouettes, et non plus par la grille. Une ligne de coupe passe par le vide entre deux figures, ou par leur contact le plus mince ; chaque lambeau isolé rejoint la figure la plus proche. Une cape ou une arme qui déborde sur la case voisine reste ainsi à sa figure : c'était le défaut de la fente de la barde. Les cases servent toujours à l'ordre des postures et au calage sur les pieds.

## [0.53.1] — 2026-10-20

### Corrigé
- **Infobulles des dés de compétence (écran principal) et cartes du compendium** (signalé par l'utilisateur : « un premier étage avec une étoile violette, présentée sur tous les sorts, et dessous la vraie icône ») : le sceau en tête montre maintenant **l'icône de la compétence** (la sienne, ou celle du statut qu'elle pose : Œil de faucon, le critique assuré ; Peau de pierre, l'écu), au lieu de l'étoile générique (`skillIcon`, `Icon.tsx`). Seule la Rage du sang de Gorak, un soin immédiat sans icône peinte, garde l'étoile en attendant la sienne (demandée). Test : chaque compétence du roster a son icône.
- **L'information n'est plus répétée** : quand une compétence pose un statut du même nom (Furie des vents pose Furie des vents), la ligne d'effet ne redit ni l'icône ni le nom, et ne garde que ce que fait le statut (« Bonus, sur soi : frappe deux fois tout de suite… »).
- **Console** : avertissement React de clés en double pendant les combats joués (l'onde et le dé allumé d'une même face de compétence avaient la même clé, `SkillDice`).

## [0.53.0] — 2026-10-20

### Ajouté
- **Couper la musique seule** (demande de l'utilisateur) : un second bouton rond, sous celui du son et plus petit, coupe ou remet la musique de fond sans toucher aux effets.
  - **Mémoire** : le choix est gardé d'une partie à l'autre (`battler:music-muted`). Couper le son coupe toujours tout, et la musique reprend son état quand le son revient.
  - **Placement** : à côté du bouton du son, il recouvrait le nom du combattant de droite en combat et « Simuler le tour » dans l'arbre ; dessous, il ne gêne aucun écran (vérifié à la capture).
  - **Icône provisoire** : une note dessinée en vecteur, jamais un emoji, barrée quand la musique est coupée. Les icônes peintes `music-on` et `music-off` sont à produire.

## [0.52.1] — 2026-10-20

### Retiré
- **Médaillons des états par famille** (0.51.0), à la demande de l'utilisateur : dix couleurs, « c'est carnaval, ça complique énormément la compréhension ». Retour à la **distinction simple** : anneau vert pour un bonus, rouge pour un malus. `STATUS_FAMILY`, les tokens `--fam-*` et la famille affichée dans le compendium sont retirés.

### Ajouté
- **Bord en pointillés pour les dégâts périodiques** (l'idée retenue de la 0.51.0) : un état qui fait perdre des PV à son porteur à chaque tour (Poison, Brûlure, Pourriture) a un anneau en pointillés, dans la zone d'état et le compendium. Lu dans les règles du statut (`hurtsEachTurn`, `statuses.ts`), sans liste écrite à la main.

## [0.52.0] — 2026-10-20

### Modifié
- **Furie des vents relancée, mise en scène** (suite de la Furie instantanée de la 0.50.0, qui se relance sur un 2 pendant ses coups, 3 fois au plus par action) :
  - le badge monte à chaque relance dans la même action : « Furie des vents », puis « Furie des vents ×2 », puis « ×3 » ;
  - le 2 de la rafale qui relance la Furie (comme le 1 qui donne la Rage du sang) tombe avec sa compétence : le dé de l'en-tête s'allume et le nom jaillit sans attente ;
  - la Furie instantanée n'affiche plus son nom deux fois (une fois pour la compétence, une fois pour la rafale).

## [0.51.0] — 2026-10-20

### Ajouté
- **Médaillons des états par famille** (demande de l'utilisateur : des icônes plus en lien avec ce qu'elles font, en CSS d'abord, sans nouvelle icône). Chaque état appartient à l'une des dix familles de `docs/FAMILLES.md` (`STATUS_FAMILY`, `statuses.ts`, présentation seulement). Dans la zone d'état, les lignes d'effet et le compendium :
  - **la couleur dit la famille** : fond teinté et anneau (Puissance orange, Garde acier, Précision ambre, Esquive cyan, Tempo bleu, Fortune violet, Affliction vert, Soin corail, Représailles rouge brique, Sceaux ivoire ; tokens `--fam-*`) ;
  - **la forme dit la polarité** : anneau plein pour un bonus, **cranté** pour un malus (au lieu du vert et du rouge, qui se confondaient avec le poison et les dégâts) ;
  - les auras gardent leur double cadre doré tournant ; plus aucune lueur colorée autour des médaillons (design system).
- Compendium : chaque carte de statut affiche sa famille.

### Modifié
- Le compteur du médaillon prend la couleur de la famille. Les pastilles « Bonus » et « Malus » restent en vert et rouge (texte).

### Non vu
- La couleur de l'Aura glaciale est celle de l'Affliction (vert) : son icône, un encensoir aux vapeurs vertes, reste à repeindre en givre (voir la TODO).

## [0.50.0] — 2026-10-20

Quatrième passe sur les compétences : les doutes de l'utilisateur après ses combats (immunité du paladin et poisons, Pile ou face « qui ne tombe jamais sur pile »), deux demandes (Furie des vents instantanée, Coup de chance cumulable) et trois compétences faibles, en favorisant le spectacle (Écorce épaisse, Riposte, Luciole). Laboratoire (série 7, 400 combats par duel), roster de 10. Méthode et chiffres : `docs/SORTS.md` § 13.

### Examiné, sans bug
- **Immunité du paladin contre les poisons** : dans le combat signalé (Ervald contre Aldric), l'immunité bloquait bien le Poison ; c'est l'**Aura de poison**, qui n'est pas un Poison, qui continuait d'agir. Désormais, l'immunité l'arrête aussi (ci-dessous).
- **Pile ou face** : sur toutes les traces de l'utilisateur, 52 piles pour 54 faces (aujourd'hui 1 sur 6, un hasard qui arrive une fois sur neuf environ) ; la pièce s'affiche du bon côté. Mais le libellé « PILE ! » est presque caché par la pièce : signalé à la session qui modifie `FightScreen.tsx`.

### Modifié
- **Furie des vents instantanée** (demande de l'utilisateur) : le 2 tombe, et l'orc frappe deux fois **tout de suite**, dans la même action ; un 2 pendant ces coups relance la Furie (3 fois au plus par action). Nouveau crochet `instantStrikes`. Compensation : **dé de Gorak de d10 à d8** (sans elle, Gorak montait à 64 %). Valeur nette +7,1 → **+27,7** : la Furie devient le cœur de l'orc (« écrasante »). Gorak 50,4 → 50,9 %.
- **Coup de chance cumulable** (demande de l'utilisateur) : chaque 1 ajoute une charge ; la prochaine action lance un d6 vert de plus par charge, chacun joué comme un coup à part, chacun pouvant être critique. Les charges multiples restent rares (il faut un 1 sur le d6 du coup en plus) : +3,3 → +4,0.
- **L'Aura d'immunité arrête l'Aura de poison** (nouveau crochet `stoppedByImmunity`) : ce que l'utilisateur attendait en jeu. Le journal le dit. Aura de poison +5,4 → +4,7 ; Ervald 54,4 → 51,8 %.
- **Écorce épaisse à 7** (au lieu de 5) : +0,8 → **+2,4**, elle n'est plus « presque inutile ».
- **Riposte à deux charges** : ses deux prochains coups encaissés renvoient chacun la moitié des dégâts. +2,7 → **+7,1** ; Aldric 49,0 → 54,1 %, plus de retournements dans ses combats (retours de 61 à 62,5 %).
- **Luciole à 4 charges** (au lieu de 3), texte raccourci : +2,5 → **+4,2** ; on la voit agir plus longtemps.
- Audit : contrôles de la Furie instantanée et de l'aura arrêtée par l'immunité. **Empreinte de non-régression mise à jour** (changement de règles voulu).

### Retours de l'utilisateur sur cette passe
- **Aura de poison renommée « Aura glaciale »** : le nom laissait croire à un Poison, dont elle n'a pas la règle. C'est le froid du chevalier liche ; halo bleu glacé. Règle inchangée. L'icône peinte reste celle de l'ancienne aura, en attendant la sienne.
- **Écorce épaisse et Peau de pierre : une seule règle**. Le statut « Écorce épaisse » disparaît : les deux compétences posent la même **Armure temporaire** (7 pour le druide, 6 pour le nain). Équilibre inchangé (c'était déjà la même règle sous deux noms).
- **Feux follets** au lieu de la Luciole (jugée ennuyeuse) : une **Brûlure de 3 pendant 3 tours** sur l'adversaire, à la fin de chacun de ses tours ; mêmes valeurs que la Luciole à 4 charges (+4,2). La Luciole reste au registre, inutilisée. L'icône de la Brûlure est celle des lucioles, en attendant la sienne. Écartées : Racines (perd sa prochaine action, −1,0, trop proche de la Peur) et Ronces (−7).

### Mesures
- Roster de 10, 400 combats par duel : de **43,1 %** (Ysolde) à **54,1 %** (Aldric), aucun duel hors limites (avant : 44,0 à 54,6 %). Ysolde, la plus basse, perd encore 0,9 point : à traiter.
- Spectacle : stable, sauf chez Gorak, dont les combats se décident plus vite (retours de 64 à 59 %, fins serrées de 41 à 38 %).
## [0.49.0] — 2026-10-20

Lecture du combat (demande de l'utilisateur) : ce qui se passe ensemble tombe ensemble, et une frappe spéciale empile ses badges. Présentation pure : le moteur et l'empreinte de non-régression sont inchangés.

### Ajouté
- **Badges de coups spéciaux, empilés sous le dé** : le badge ambre du critique devient un système. Chaque effet qui arme ou produit un coup spécial pose son badge au moment où il a lieu, dans l'ordre : Critique assuré (or pâle, puis le badge « Critique ×2 » ambre), Furie des vents (bleu ciel, Tempo), Coup de chance et Pile ou face (violet, Fortune), Charge et Coup de griffe (violet), Riposte, Épines et Rétribution (cramoisi, Représailles), Vol de vie (corail, Soin), Crescendo et Soliste (magenta, la couleur de la barde). La famille est **déduite de la mécanique** (`src/game/specials.ts`) : une compétence future qui force un critique, ajoute des coups, renvoie des dégâts ou draine reçoit son badge sans rien déclarer ; `TONE_OVERRIDE` donne sa couleur propre à un personnage. Test : chaque mécanique de coup spécial a sa famille, et seulement elles.

### Modifié
- **Une compétence tombe avec le dé qui la déclenche** : sur un 1, 2 ou 3 (ou un double de la barde), le dé qui s'arrête, le dé de l'en-tête qui s'allume, le nom de la compétence en texte flottant, le statut gagné et son son arrivent au même instant. Avant, environ 1,35 s séparait le dé de l'effet (pauses de 350, 300, 450 puis 250 ms). Le nom d'un coup transformé (Charge, Coup de griffe) jaillit aussi avec le dé, avant l'élan. Test : sur les 100 duels du roster, chaque coup sacrifié par une compétence du dé est directement suivi d'elle.
- **Halo du camp actif à la place de la ligne au sol** (retour de l'utilisateur : la ligne était trop visible, trop proche des pieds, et ses extrémités dégradées peu nettes) : une lueur diffuse de la couleur du camp monte du bas de l'écran, sous sa moitié de l'arène, et s'efface bien avant le centre. Elle accompagne la barre de vie allumée, qui reste le signal principal.
- **Libellé de la zone des dés** (« Pile ! », « Face… », « Au tour de … ») plus grand et devant la pièce : il était caché derrière elle, et l'utilisateur croyait que la pièce ne tombait jamais sur pile (signalé par l'agent des compétences).

## [0.48.0] — 2026-10-20

### Ajouté
- **Musique de fond des combats** (demande de l'utilisateur : un « tapis sonore », une des trois boucles au hasard, quelle que soit l'arène, en boucle, pas trop fort ; `docs/SONS.md` § 10).
  - **Fichiers** : les trois MP3 déposés à la racine sont rangés dans `src/assets/music/` sous des noms de rôle (`battle-boss`, `battle-orchestral`, `battle-drums`), sans réencodage, pour garder les jonctions de boucle propres. Provenance notée dans `src/assets/music/SOURCES.md`.
  - **Lecture** (`music` dans `sound.ts`) : une piste tirée au hasard à chaque combat joué, en boucle. Fondu d'entrée de 2,5 s et fondu de sortie de 1,2 s à l'écran de fin ; au KO, elle s'efface à 25 %, pour que le KO et la fanfare ressortent. La vitesse du combat ne l'écourte pas, et le bouton du son la coupe aussi.
  - **Niveau** : les sources vont de −18,4 à −8,7 LUFS (mesures ffmpeg ebur128). Chacune est ramenée à −29 LUFS (`MUSIC_TARGET`), environ 15 dB sous les effets.
  - **Mixage** : un bus à part du compresseur des effets, que la musique ferait pomper à chaque coup.
  - **Vérifié** : la piste se charge en combat (navigateur sans interface, aucune erreur), et un test contrôle les trois pistes et leur sonie. **Le rendu à l'oreille n'est pas vérifiable par l'agent**, ni le niveau réel ni les jonctions de boucle : à régler dans `MUSIC_TARGET` si besoin.

## [0.47.0] — 2026-10-20

### Modifié
- **Arbre du tournoi refait** (demande de l'utilisateur : mêmes fonctions, extrémités plus lisibles, roster central plus grand et mieux intégré, au style du design system). Rien ne change dans les règles du tournoi.
  - **Configuration** :
    - Seul le premier tour se remplit : ses cases, aux deux extrémités, sont grandes (252 px, deux lignes de 42 px), avec le numéro de la case (1 à 16), le portrait et le nom en 16 px.
    - Au survol d'une case vide, le combattant qui y sera placé s'affiche avec son portrait.
    - Les tours suivants ne sont plus que des jonctions : les lignes convergent vers le panneau central et s'éclairent quand un match est rempli.
  - **La palette devient le panneau central de l'arbre**, d'environ 870 px de large au lieu de 264 :
    - dix grandes cartes (portrait de 148 × 170), avec le nombre de cases prises et le pinceau en or ;
    - la fiche du pinceau : stats en une ligne et dés de compétences ;
    - le compte « n / 16 », Compléter, Vider et **Valider l'arbre**, seule pièce prestige de l'écran.
  - **Suivi** :
    - Les cases du premier tour sont plus larges (208 px, avec le numéro de la case) que celles des tours suivants.
    - Un match prêt a son liseré d'or, et ses actions sont de petites plaques sous la case : Affronter en or, Simuler.
    - Le chemin des vainqueurs est tracé en or, et le perdant éteint (portrait grisé, nom barré).
    - « Simuler le tour » passe en bouton du design system, « Nouveau tournoi » en pièce prestige.
  - **Décor** : les deux écrans prennent la porte de l'arène de l'onglet Tournoi, très assombrie, avec des titres en Cinzel.
  - Captures vérifiées : configuration vide, en cours et complète, suivi en cours et tournoi terminé.

## [0.46.1] — 2026-10-20

### Modifié
- **Zone d'état plus grande** au-dessus des combattants (demande de l'utilisateur) : médaillons de 64 px au lieu de 48 (+33 %), compteur, sablier et variation (−1, +2) agrandis d'autant, écarts élargis. Le nombre d'états affichés en même temps le permet.

## [0.46.0] — 2026-10-20

Troisième passe sur les compétences : deux demandes de l'utilisateur (le « ding » des doubles de la barde, la Furie des vents cumulable) et trois compétences signalées par l'audit 0.45.1 (Siffloter, Fausse note, Ouverture). Laboratoire (série 6, 400 combats par duel), roster de 10 personnages. Méthode et chiffres : `docs/SORTS.md` § 12.

### Ajouté
- **Barde : « ding » sur tout double** (demande de l'utilisateur) : dès que les deux dés retombent sur la même valeur, quel que soit le double, le son Pile réussie (`sfx.coinWin`, son existant) joue en même temps que les dés (`docs/SONS.md`, étape `pair`). Non vérifié à l'oreille.
- Option de moteur `strikeCharges` pour les statuts à coups supplémentaires : `all` (toutes les charges à la prochaine action) ou `one` (une par action, les autres en réserve). Contrôle d'audit des charges dépensées.

### Modifié
- **Furie des vents cumulable** (demande de l'utilisateur) : chaque 2 au dé ajoute une charge, sans durée ; chaque action en dépense une (deux coups), les autres restent en réserve jusqu'aux actions suivantes. Le médaillon compte les charges. Valeur nette +6,9 → +7,1 : deux charges à la fois restent rares (il faut un 2 pendant la rafale). Les deux lectures (tout d'un coup, ou une par action) ont été mesurées à égalité (+0,3 point).
- **Siffloter et Fausse note** (barde, doubles 1 et 2) : le double **frappe aussi ses deux coups**, en plus de son effet. Valeur nette +0,7 → **+3,3** (Siffloter) et +0,4 → **+4,3** (Fausse note) : ni l'un ni l'autre n'est plus « presque inutile ». Compensation : **esquive de Fanchon de 12 à 6 %** (sans elle, Fanchon montait à 60,5 %).
- **Empreinte de non-régression mise à jour** (changement de règles voulu).

### Non changé
- **Ouverture** (+27 points, « écrasante ») : c'est l'identité de la barde ; sans elle, Fanchon tombe à 28 %, et des doubles qui frappent tous ne la remontent qu'à 38 %.

### Mesures
- Roster de 10 personnages, 400 combats par duel : de 44,0 % (Ysolde) à 54,6 % (Fanchon), presque inchangé (44,4 à 54,6 % avant). Gorak 49,8 → 50,4 %, Fanchon 54,3 → 54,6 %.
- Nouveau drapeau : **Écorce épaisse** (Thaldrin) « presque inutile » (+1,1 → sous le seuil, dans la marge).

## [0.45.1] — 2026-10-20

### Modifié
- **Ligne au sol à la place de l'anneau** (retour de l'utilisateur : l'anneau sous le combattant actif se confondait avec celui de l'aura) : une ligne lumineuse de la couleur du camp court sous toute sa moitié de l'arène, pleine au pied du combattant, effacée vers le centre.
- **Barre de vie** : l'éclat du camp actif est renforcé (liseré, lueur large, nom lumineux) ; l'autre camp n'est plus tamisé.
- **Dés de compétence de l'en-tête** : un peu plus grands (36 px au lieu de 32), **éteints au repos** (grisés et assombris), ils ne s'allument qu'au déclenchement. L'éclat est plus ample et plus bref, comme un tintement de clochette (sans son) : le dé grossit de 45 % en lumière vive, une onde s'élargit et s'efface, puis il s'éteint (520 ms à ×1, au lieu de deux pulsations de 1,1 s). Au survol, un dé s'allume pour qu'on lise son infobulle.

## [0.45.0] — 2026-10-19

Deuxième passe sur les compétences : quatre notes de l'utilisateur (Aura de poison, Vol de vie, aura de la barde, Épines) et deux compétences signalées par l'audit 0.42.0 (Fausse note, immunité de Gauvain, sans objet depuis son retrait en 0.44.0). Laboratoire (série 5, 30 essais à 300 combats par duel), puis équilibrage du roster entier à 400 combats par duel. Méthode et chiffres : `docs/SORTS.md` § 11.

### Modifié
- **Épines** (nains, demande de l'utilisateur) : **permanentes et cumulables**. Chaque 2 au dé ajoute une charge ; chaque coup encaissé renvoie 1 dégât direct par charge. Avant : 6 dégâts renvoyés pendant un seul tour. Valeur nette : Brokk +9,9 → +10,9, Grimbald +5,0 → +4,3. Elles se voient bien plus souvent : 6,9 réactions par combat chez Brokk, au lieu de 3,9.
- **Vol de vie** (morts-vivants) : **deux charges** au lieu d'une ; chaque coup qui touche en use une, une esquive aussi. Le compteur dit enfin quelque chose (2, puis 1). Valeur nette +4,0 → **+10,6** (Ervald) et +3,3 → **+8,9** (Caldrec). (Chiffres de cette ligne et des suivantes : mesurés sur 20 personnages, avant la fusion ; mesures finales plus bas.)
- **Aura mélodieuse** (barde, double 3) : **2 charges** au lieu d'une. Elle coûtait des victoires (−1,0 et −1,3), parce que le double remplace deux coups : **+2,0 et +2,5**.
- **Fausse note** (barde, double 2) : **2 charges** (le prochain coup adverse qui touche perd 10). −0,3 et −1,0 → **+0,8 et +0,5**.
- **Textes clarifiés** (note de l'utilisateur) : l'**Aura mélodieuse** et la **Fausse note** n'emploient plus « dégâts finaux » (« ajouté après l'armure : rien ne le réduit ») ; l'**Aura de poison** dit qu'elle n'est pas un Poison (rien ne l'arrête) et quand elle agit. Coquille « finals » corrigée.
- **Empreinte de non-régression mise à jour** (changement de règles voulu).

- **Aura de poison** (note et choix de l'utilisateur) : elle agit désormais **au début du tour de l'adversaire, dans la même étape que le Poison qu'il subit** (juste après lui), au lieu du début du tour du porteur. Toujours des dégâts directs : un vrai Poison serait bloqué par l'Aura d'immunité (Ervald tombait à 31 % contre Gauvain). Nouveau crochet de statut `onOpponentTurnStart`. Valeur nette +11,0 → **+13,8** (Ervald) et +4,1 → **+6,2** (Caldrec) : l'aura frappe dès le tour où elle est posée. Le texte dit qu'elle n'est pas un Poison.

### Mesures finales
- Roster de 10 personnages (un par famille, 0.44.0), 400 combats par duel : de **44,4 %** (Ysolde) à **54,6 %** (Ervald), aucun duel hors limites. Avant la passe : de 45,8 à 51,4 %. Ervald 47,5 → 54,6 %, Fanchon 50,5 → 54,3 % ; les autres perdent 1 à 1,5 point. Valeurs nettes : Vol de vie +4,3 → +9,6, Aura de poison +4,4 → +5,9, Aura mélodieuse −0,9 → +2,3, Fausse note −1,0 → +0,4, Épines +2,6 → +2,4.
- Fusion avec la 0.44.0 (un personnage par famille) : l'Aura d'immunité propre à Gauvain, mesurée dans cette passe (+2 d'armure), disparaît avec lui.
## [0.44.0] — 2026-10-19

Lisibilité du combat (demande de l'utilisateur) : qui joue, et quel dé de compétence vient de sortir. Présentation pure : le moteur et l'empreinte de non-régression sont inchangés.

### Ajouté
- **Passage de main** : entre la fin du tour d'un combattant et le début du tour de l'autre, une pause de 400 ms (raccourcie en ×2 et ×4, comme le reste ; environ +8 s sur un combat moyen de 21 tours en ×1, soit +15 %). Elle montre trois signaux : le plateau de dés se vide et annonce « Au tour de … » (« d'Elaria » devant une voyelle) dans la couleur du camp ; dans l'en-tête, le camp actif s'allume (lueur sur le nom et la barre de vie), l'autre se tamise ; un anneau au sol, azur ou cramoisi, marque le combattant actif. Aucun son ajouté (`SONS.md`).
- **Le dé de compétence qui sort pulse** : quand le dé du combat tombe sur une face qui déclenche une compétence (1, 2, 3, un coup transformé comme la Charge, ou un double de la barde), le dé de cette face, dans l'en-tête, fait deux pulsations lumineuses au même instant, dans la couleur de la nature de la compétence (or martial, acier d'adresse, violet arcane). La face est lue dans la chronologie (`skillFaceAt`), jamais recalculée. Tests : la face qui pulse est celle du jet, sur les 100 duels du roster et 3 graines.

### Modifié
- **Attaque de la barde refaite, plus ample** (demande de l'utilisateur : des postures plus expressives, surtout le coup) : une fente complète, rapière entière, à la place de l'attaque tassée dont la lame était coupée. Toutes ses postures sont redécoupées sur une toile de 992×1005 (avant 703×1005), sans changement de `scale`, `headroom` ni portrait. `scripts/slice-poses.py` centre désormais la toile commune sur les pieds de la garde, pour qu'une attaque ample ne la décale pas.

## [0.43.0] — 2026-10-19

### Modifié
- **Un personnage par famille** (décision de l'utilisateur : un jumeau par personnage n'apportait plus assez, et doublait le travail de création). Les dix jumeaux de coloris sont retirés : Murzug, Sylwen, Grimbald, Caldrec, Bérengère, Ssythra, Gauvain, Gnashka, Brannoc et Mélisande. Chaque famille garde son personnage principal (nom, image, postures, fiche) et les statistiques les plus pertinentes des deux, mesurées contre les neuf autres principaux (400 combats par duel, détail dans `docs/PERSONNAGES.md`) :
  - **Gorak** prend celles de Murzug : 57 PV, 18 % de critique, Rage du sang à 5 PV (46,8 → 50,4 %) ;
  - **Elaria** prend celles de Sylwen : 50 PV, 26 % d'esquive, 17 % de critique ×2,4 (même taux, duels plus resserrés) ;
  - **Brokk** prend celles de Grimbald : d10, 57 PV, 10 % de critique ; Ysolde ne tombe plus à 26 % contre lui ;
  - **Ervald** prend celles de Caldrec : d10, sans armure, 56 PV, 16 % de critique (46,7 → 48,8 %) ;
  - **Aldric** prend celles de Gauvain : 54 PV, 7 % d'esquive, 17 % de critique (52,7 → 50,1 %) ;
  - Ysolde, Naraxes, Morgrut (son d14 sans critique), Thaldrin et Fanchon gardent les leurs.
  - Roster entier : de 45,8 % (Ysolde) à 51,4 % (Brokk), aucun duel hors limites. Les fiches (forces, faiblesses) suivent les nouvelles statistiques.
- **Accueil : rail des combattants**, au style du design system, à la place des deux grilles de vignettes. C'est un panneau au centre, sous les modèles, avec une carte par personnage (portrait et nom), comme le tableau de sélection d'un jeu de combat.
  - Deux onglets aux couleurs des camps disent qui choisit. Un clic donne la carte à ce camp, puis la main passe en face ; cliquer un modèle donne aussi la main à son camp.
  - Une carte choisie porte le liseré de son camp et une pastille A ou B.
- Préparation du tournoi, compendium et statistiques : une liste simple, sans familles ni mention de variante. La comparaison avec la variante disparaît de la fiche.
- **Contres connus** : 2 au lieu de 11. Restent Brokk contre Fanchon (65,3 %) et Naraxes contre Ysolde (62,0 %).
- **Empreinte de non-régression régénérée** (changement voulu) : 100 duels au lieu de 400, et des statistiques changées pour cinq personnages.
- Laboratoire des sorts : les idées propres aux jumeaux restent dans `scripts/lab/ideas.ts` pour l'historique, mais ne sont plus rejouées (message « Idées ignorées »).

### Retiré
- `variant()`, `CharacterDef.baseId` et `FAMILIES` : plus de variantes de coloris dans le modèle.

### Non changé
- Le format de l'historique (`battler:history:v1`) : les statistiques des jumeaux restent stockées, mais ne s'affichent plus.

## [0.42.0] — 2026-10-19

Audit des compétences : les six compétences signalées par la grille des drapeaux rouges (règles 0.39.1). Laboratoire (série 4, plus de 50 essais à 300 combats par duel), choix de l'utilisateur, puis équilibrage du roster entier à 400 combats par duel. Méthode et chiffres : `docs/SORTS.md` § 10. Les versions 0.40.0 et 0.41.0 sont celles du chantier des postures et de la barde, menés en parallèle ; les mesures ont été refaites avec la barde.

### Modifié
- **Pile ou face** : pile passe de 15 à **20 dégâts directs** et compte comme un **coup qui touche** (l'Aura de décoction empoisonne). Face reste vide : la dualité et sa mise en scène sonore (tintement, puis son du critique) sont gardées. Valeur nette de −5,0 et −4,0 à **+0,0** (Naraxes) et **+0,6** (Ssythra) : elle ne coûte plus de victoires. Nouveau crochet `coinToss.headsTouches`. Naraxes de 49,4 à 52,9 %, Ssythra de 50,3 à 53,6 %.
- **Contres connus** (décision de l'utilisateur, pour garder le pile à 20) : **Ysolde contre Naraxes** et **Ysolde contre Ssythra**, à 35,0 % pile dans le test d'équilibre, sont tolérés jusqu'à 25/75 (`balance.test.ts`, EQUILIBRAGE.md).
- **Aura de sainteté** plafonnée à **3 charges** (6 PV par tour au plus).
- **Purification** : quand l'adversaire n'a aucun bonus à retirer, la lumière lui inflige **5 dégâts directs** au lieu de tomber à vide. Gâchis de 54-55 % à **0 %**, valeur nette de +8 à **+13 points**. Contre un adversaire à bonus (Brokk), rien ne change. Nouvelle option de moteur : `cleanse.orElse`. Avec le plafond de sainteté, les combats des prêtresses gagnent en spectacle : retours de 39,5 à 45,6 %, fins serrées de 16 à 22 %, de 36 à 33 tours. Ysolde de 47,1 à 48,6 %, Bérengère de 46,0 à 48,2 %.
- **Aura d'immunité** : tant qu'elle est là, **l'armure du porteur gagne 1** (`modifyStats`). Valeur nette de −2,7 à **+1,1** (Aldric) et de −3,9 à **−0,6** (Gauvain). Compensation : **esquive d'Aldric de 5 à 2 %** (Gauvain de 10 à 7 %) ; sans elle, Aldric battait Thaldrin à 66-68 %.
- **Fleur de vie** : **Régénération 2 pendant 3 tours** au lieu de 3 PV d'un coup ; le soin continue sous la forme d'ours. Valeur nette de +0,3 et +1,1 à **+2,2** (Thaldrin) et **+3,4** (Brannoc). La Régénération entre en jeu ; Fleur de vie prend le son du bonus gagné (règle des sons, déduite de ses effets).
- **Audit de résolution** : la pièce est lue dans le registre (statut et dégâts) ; contrôles de la pile qui touche et de la purge avec repli.
- **Empreinte de non-régression mise à jour** (changement de règles voulu).

### Non changé
- **Rétribution** (+36 et +31 points, « écrasante ») : décision de l'utilisateur, c'est la signature du paladin.

### Mesures après fusion avec la barde (0.41.0)
- Roster de 20 personnages, 400 combats par duel : de 46,4 % (Ervald) à 53,1 % (Naraxes, Ssythra), aucun duel hors limites. Valeurs nettes : Pile ou face +0,1 et +0,6, Aura d'immunité +1,0 (Aldric) et −1,0 (Gauvain), Purification +14,2 et +13,6 (gâchis 0 %), Fleur de vie +2,3 et +3,3, Aura de sainteté +41,1 et +38,1.
## [0.41.0] — 2026-10-19

### Ajouté
- **La barde, dixième famille : Fanchon (Saltimbanque) et Mélisande (Ménestrelle)**, d'après le concept d'un ami de l'utilisateur. Le twist : un petit d5, mais **deux dés à chaque tour**, et des compétences sur les **doubles** au lieu des faces 1, 2 et 3.
  - Hors double : deux coups séparés, un par dé, chacun avec son esquive et son critique.
  - Sur un double qui a sa compétence, celle-ci remplace les deux coups :
    - double 1, **Siffloter** : Sifflotement, 3 charges, +2 PV à chaque fin de tour, puis −1 charge ; cumulable ;
    - double 2, **Fausse note** : le prochain coup adverse qui touche perd 5 dégâts finaux par charge, puis la note s'oublie ;
    - double 3, **Aura mélodieuse** : +1 dégât final par charge sur chacun de ses coups, permanente ;
    - double 4, **Crescendo** : un coup de 12 (3 × 4) ;
    - double 5, **Soliste** : un coup de 15 (3 × 5).
  - **Ouverture** : elle entre en scène avec 1 charge d'Aura mélodieuse.
  - Choix de l'utilisateur, après mesure : un coup unique pour Crescendo et Soliste, et l'Ouverture. Voir `docs/EQUILIBRAGE.md` et `docs/PERSONNAGES.md`.
- **Images de la barde** : garde et cinq postures (`src/assets/bard-*.png`, toile 703×1005, `scale` 0,97 pour la taille 1,00), et cinq icônes de compétences qui servent aussi à ses trois statuts (`whistle`, `false-note`, `melodious-aura`, `crescendo`, `soloist`, planche v6). Elles ont été générées et découpées par la session images, avec leurs prompts dans la `STYLE_BIBLE` § 4 et § 7. Défaut connu : la rapière de l'attaque est coupée.
- **Moteur : personnage à deux dés** (`CharacterDef.twinDice`, `docs/RESOLUTION.md` § 2) :
  - nouvelle étape de chronologie `pair`, qui lance deux dés et compte deux rangs en mode triche (`diceOf`, `rankAt`) ;
  - déclencheurs `doubleOne` à `doubleFive` ;
  - champs de compétence `volley` (coups de la face du double) et `merged` (un seul coup qui vaut leur somme, joué comme un coup transformé) ;
  - coups au dé déjà tiré (`Attack.preset`).
  - À l'écran, les deux dés roulent ensemble, « DOUBLE 4 ! » est annoncé, puis les coups partent en rafale. Les dés de compétences de la barde montrent ses cinq doubles.
- **Statuts** :
  - crochet `modifyFinal` : dégâts finaux, après l'armure et les boucliers, au moins 1 ;
  - crochet `spentOnHit` : disparaît quand un coup du porteur touche ;
  - trois statuts : Sifflotement, Fausse note, Aura mélodieuse.
- `look.bodyInset` : vide de la toile de part et d'autre de la garde. L'ancrage `inside` (écran d'affrontement, champion) se cale sur la silhouette, plus sur le bord de la toile. Une toile à postures large, comme la fente de la barde (992 px de large, la garde n'en occupe que la moitié), ne pousse plus le personnage sous son nom.
- Audit (`audit.ts`) : contrôles de la paire, des doubles, des gros coups, de la Fausse note, des dés imposés par paire, et des statuts qui s'estompent en soignant.

### Modifié
- Équilibre : Brokk contre Fanchon (71/29) et contre Mélisande (65/35) rejoignent les **contres connus** (`balance.test.ts`, question ouverte dans `EQUILIBRAGE.md`).
- Empreinte de non-régression : 76 lignes ajoutées, une par nouveau duel. Aucun combat existant ne change.

### Corrigé
- Test « compétences du dé » : un attaquant tué par une Riposte avant sa compétence ne la déclenche pas. C'était un cas réel que le test ignorait, révélé par les nouvelles graines.

## [0.40.0] — 2026-10-19

### Ajouté
- **Postures des combattants** (demande de l'utilisateur : tester si changer d'image au fil des animations renforce l'immersion ; `docs/POSTURES.md`). En plus de sa garde, un personnage peut avoir **cinq postures communes à tous** : attaque (pendant l'élan), esquive, coup encaissé, K.O. et victoire. Ce sont des décisions de l'utilisateur : pas plus, pour garder la production d'images légère, et jamais une posture propre à une capacité. Le registre `POSES` et le choix de la posture du moment (`poseOf`) sont dans `src/game/poses.ts`, avec `CharacterLook.poses`. `Fighter` change l'image instantanément, sous les animations existantes, et précharge les postures. Une posture absente retombe sur la garde. Avec une posture de K.O., l'animation ne garde que le grisé (`.ko-posed`). Présentation pure : le moteur de règles et l'empreinte de non-régression sont inchangés.
- **L'orc, premier personnage à postures**. Gorak (et Murzug, sa variante) a une **nouvelle image originale**, générée avec son prompt de la `STYLE_BIBLE`, qui remplace le placeholder `orc.png` issu d'une œuvre existante (mis à la corbeille). Ses cinq postures sont générées en planches et alignées sur la garde (toile 778×993) ; le coup encaissé est ajouté ensuite avec `--reference`. Son `scale` passe à 1,19 pour garder sa taille, et son portrait est recadré.
- **La voleuse (Naraxes, Ssythra), deuxième personnage à postures** : une nouvelle garde et cinq postures, en trois planches (deux de trois cases, une de deux), soit 3 générations. `scale` 1,10, `headroom` 0,14, portrait recadré ; l'ancienne `lizardman.png` est à la corbeille.
- `scripts/slice-poses.py` : découpe des planches de postures (1536×1024, deux ou trois cases, la garde en première case comme règle), mise à l'échelle de la garde, calage sur ses pieds, recadrage commun de toutes les postures, planche de contrôle `logs/poses-<nom>.png`, retrait des fragments isolés, et `--reference=<garde.png>` pour ajouter une posture à un personnage déjà découpé, sur sa toile. `cutout-character.py` accepte `CUTOUT_KEEP_CANVAS=1` (détourer sans recadrer).
- **Prompts** : gabarit de planche de postures et lignes de chaque posture dans la `STYLE_BIBLE` (§ 4) et `POSTURES.md` (§ 3), avec les versions de l'orc ; check-lists d'intégration à jour.

### Modifié
- **Taille des combattants : une échelle resserrée, et la largeur naturelle pour tous** (demande de l'utilisateur : un nain ne doit pas avoir la taille de l'ogre, mais une taille « réaliste » dessert le rendu). Hauteur par rapport à un humain : nain 0,86, homme-lézard 0,97, humains et druide 1,00, elfes 1,03, paladin 1,04, mort-vivant 1,05, orc 1,08, ours 1,10, ogre 1,13 (`scale` recalculé, formule dans la `STYLE_BIBLE` § 2). Toutes les images sont affichées à leur largeur naturelle, centrées sur les pieds. Avant, une boîte au rapport fixe rétrécissait les images larges : l'ogre s'affichait plus petit que l'orc et le mort-vivant (500 px contre 563 et 564 sur l'affrontement), et l'orc à postures, seul à sa vraie largeur, paraissait bien plus massif que lui. Sur l'affrontement et l'écran de fin, une image large déborde vers le centre (`anchor="inside"`), plutôt que hors de l'écran. `headroom` (part vide au-dessus de la tête d'une toile à postures) et `figureHeight` placent la zone d'état et les effets sur la tête. Un test vérifie l'ordre et les écarts.
- **Les menus, les panneaux et le sceau « VS » passent au-dessus des combattants** (accueil, affrontement, fin de combat) : une arme levée passe derrière, jamais devant.

### Non vérifié
- L'esquive et le K.O. n'ont pas été vus dans un combat joué (couverts par les tests). Vus par capture : l'attaque des deux personnages pendant l'élan, le coup encaissé de la voleuse, l'accueil, l'affrontement, la victoire de l'orc sur l'écran de fin.

## [0.39.1] — 2026-10-19

### Modifié
- **Nature des compétences classée** (choix de l'utilisateur) : sur les 31 compétences, 10 martiales (orcs, dont la Rage du sang de Murzug, nains, Riposte, Charge, Coup de griffe), 6 d'adresse (elfes, hommes-lézards), 12 arcanes (morts-vivants, Ysolde, Rétribution, Aura d'immunité, forme humaine du druide, Aura de pourriture) et une **nouvelle nature neutre** (`--text-3`) pour les trois Attente de l'ogre. Les cartes du compendium prennent leur couleur. Test : chaque compétence déclare sa nature (`modules.test.ts`).

## [0.39.0] — 2026-10-19

**Refonte de l'interface au design system V1.4** (`docs/design-system.md`), menée en 13 étapes de la 0.38.1 à la 0.39.0 sur la branche `design-system-v1` : tokens, camps azur et cramoisi, jauges, infobulles, statistiques à paliers, onglets mineurs soulignés, boutons sertis, panneaux voilés, tuiles de portrait, pièces prestige (bouton principal, onglets majeurs, sceau VS) et cartes de compétence en lame.

### Modifié
- **Textes posés sur une illustration** (étape 13) : noms, races et archétypes de l'accueil et de l'affrontement portent l'ombre du design system (`.on-illus`) ; noms de héros en Cinzel 600. Le reste de la section 5 (ancrage au sol, mise à l'échelle par la hauteur, ombre de contact en ellipse, combattant et portrait tournés vers le centre) était déjà en place : pas de drapeau de comparaison.

## [0.38.12] — 2026-10-19

### Ajouté
- **Cartes de compétence en lame** (design system, étape 12) : deux coins opposés coupés de 12 px, contour et trait de tête de 2 px à la couleur de la **nature** de la compétence (martiale `--gold-500`, adresse `--armor`, arcane `--arcane`), ombre sur l'enveloppe. Fenêtre octogonale du sceau (`SkillSeal`, 56 px sur la carte, 32 px dans l'infobulle des dés), prête pour les sceaux peints (asset A-01, `SKILL_SEAL`) avec repli sur l'icône peinte actuelle, à la même taille.
- Champ optionnel `nature` des compétences (`SkillNature`, `events.ts`), présentation seulement, sans effet sur le combat. **Aucune compétence n'est encore classée** : toutes prennent l'arcane par défaut, le violet des cartes d'avant.

### Modifié
- Lignes d'effet (cartes et infobulles) aux tokens : Alegreya Sans 15, mentions en 13, soin `--good`, dégâts directs `--bad`, relâche `--crit`, purge `--dodge`. Le filet orné d'un losange laisse place à un filet simple dans les cartes de compétence.

## [0.38.11] — 2026-10-19

### Modifié
- **Sceau VS** (design system, étape 11) : composant `VsSeal`, octogone de 96 px (coupe de 28 px), cadre `--gold-500`, jour sombre, plaque `--bg-1`, gravure d'or à 40 %, sans lignes de liaison. Il remplace le médaillon rond de l'accueil et le « VS » en texte de 140 px de l'affrontement. L'animation d'entrée (`.vs-slam`) reste sur l'enveloppe ; elle finit inclinée de 4°, comme avant.

### Corrigé
- Affrontement : le rappel des paris (et son bandeau de coup de théâtre) ne recouvre plus le VS ; les deux s'empilent dans la colonne centrale.

## [0.38.10] — 2026-10-19

### Modifié
- **Onglets majeurs** (design system, étape 10) : le choix du mode de jeu de l'accueil (Affrontement, Tournoi) passe par `Tabs variant="major"`, en pièce prestige : rail octogonal (coupe de 10 px) au cadre bronze sur un jour sombre ; onglet actif en plaque `--gold-400` chanfreinée de 6 px, avec tranche de 3 px et une encoche d'or (14 × 8 px) sous lui. Focus : anneau `--gold-200` à l'intérieur de l'onglet. Plus de lueur dorée. Les onglets portent désormais `role="tab"` et `aria-selected`.

## [0.38.9] — 2026-10-19

### Ajouté
- **Bouton principal en pièce prestige** (design system, étape 9) : composant `PrestigeButton`, qui remplace `.btn-primary` (Combattre, Jouer, Revanche, Continuer, Au combat, Créer un tournoi, Nouveau tournoi, Fermer). Octogone (coupe de 14 px, 10 px en taille moyenne), cadre bronze, jour sombre, plaque `--gold-400`, tranche de 4 px et gravure à 10 px du bord, toutes les couches en `clip-path`. Ombre portée sur l'enveloppe (`drop-shadow`), zone cliquable égale à la forme. Survol : plaque `--gold-300` ; pressé : descend de 1 px, tranche de 2 px ; focus : cadre `--gold-200` ; désactivé : plaque sombre. Plus de lueur dorée autour du bouton.

### Retiré
- Classe `.btn-primary` (plus aucun usage).

## [0.38.8] — 2026-10-19

### Ajouté
- **Tuile de portrait** `PortraitTile` (design system, étape 8) : composant réutilisable, sans taille ni grille imposées, avec ses états en `data-state` : repos, survol, choisi (2 px à la couleur du camp, ou or hors camp), pris en face (45 %), focus et indisponible. Utilisée par les grilles de l'accueil et par la palette de la préparation du tournoi.
- Accueil : **le personnage choisi par l'autre camp** est estompé dans la grille (il reste sélectionnable, pour les duels miroirs). Les autres tuiles ne sont plus estompées au repos.

### Modifié
- **Panneau de combattant** `.fighter-panel` : voile `--scrim` flouté de 6 px, rayon 2, filet clair, liseré de 2 px en tête à la couleur du camp, sans équerres (fiches de l'accueil et de l'écran d'affrontement).

## [0.38.7] — 2026-10-19

### Modifié
- **Boutons secondaires et boutons icône** (design system, étape 7) : `.btn` passe au serti, variante A : plaque plate `--bg-2`, filet bronze `--frame`, jour du fond, filet gravé, tranche sombre de 2 px, rayon 2 px, texte `--gold-300` en Cinzel 700. Survol : filet `--gold-500` et texte `--gold-200` ; pressé : descend de 1 px ; désactivé : texte `--text-off`. Focus : anneau `--gold-200`. Les boutons ronds (`.btn-round`) passent à 48 px. Le bouton principal (`.btn-primary`) garde provisoirement son rayon, sa graisse et son survol, jusqu'à sa version prestige (étape 9). La barre de commandes du combat (`.hud`) n'est pas touchée.

## [0.38.6] — 2026-10-19

### Ajouté
- **Onglets mineurs** (design system, étape 6) : le composant `Tabs` prend une option `variant` (`minor` par défaut, `major`). Les sous-vues (compendium, fiche, statuts, statistiques, écran de fin) passent en onglets soulignés : actif souligné de 2 px `--gold-400`, texte `--gold-300`, jamais en or plein ; Cinzel 15/700 en capitales. Seul le choix du mode de jeu de l'accueil garde la plaque d'or (onglet majeur, étape 10). `data-state` posé sur chaque onglet.
- **Bouton tertiaire** `.btn-tertiary` : transparent, contour `--line-2`, Alegreya Sans 15/500 (Réinitialiser, Annuler, Vider). Bouton Effacer de l'historique en rouge `--bad`.

### Modifié
- Cinzel est chargée aussi en graisse 700 : les textes Cinzel en gras (`font-bold`) sont un peu moins épais qu'avant (ils prenaient la 800).

## [0.38.5] — 2026-10-19

### Modifié
- **Statistiques** (design system, étape 5) : classement, matrice des confrontations, derniers combats, chiffres clés et adversaires de la fiche aux tokens (surfaces, filets `--line-1`, rayons 2 à 4 px). Texte en Alegreya Sans, chiffres en IBM Plex Mono alignés à droite, mentions en 13 px au minimum. **Taux de victoire en trois paliers** au lieu d'un dégradé : rouille sous 40 %, laiton de 40 à 59 %, vert à partir de 60 %, le chiffre toujours affiché (`winColor`, `WIN_TEXT`). Critiques en ambre `--crit`, esquives en `--dodge`, compétences en `--arcane` ; les tournois remportés gardent l'or (ce qui se gagne).

## [0.38.4] — 2026-10-19

### Modifié
- **Infobulles et pastilles** (design system, étape 4) : infobulles des dés de compétence et de la zone d'état sur `--bg-1`, filet `--line-2`, rayon 4 px, ombre `--shadow-2` ; titre en `--text-1` (l'or est réservé à l'action) ; texte en Alegreya Sans 15, mentions en 13. Pastilles Bonus, Malus, Aura et « Dé n » en 13 px (au lieu de 10), rayon 2 px, aux couleurs `--good`, `--bad`, `--arcane` ; la pastille Aura devient neutre. Les lignes d'effet des infobulles gardent leur style, elles suivront les cartes de compétence (étape 12).

## [0.38.3] — 2026-10-19

### Modifié
- **Jauges et fiches de stats** (design system, étape 3) : barres au rayon de 2 px sur une piste à la couleur du camp (`--side-x-track`, nouveau champ `track` de `SIDE_STYLE`), libellés en Alegreya Sans 15/500, valeurs en IBM Plex Mono 14/500 alignées à droite. Barre de PV : mêmes tokens, rouge `--bad` sous 25 %. Compendium : les jauges passent de l'or à un beige neutre (`--text-2`), l'or étant réservé à l'action. La fiche de l'accueil gagne environ 30 px de haut.

## [0.38.2] — 2026-10-19

### Modifié
- **Couleurs des camps** (design system, étape 2) : azur `--side-a` et cramoisi `--side-b` remplacent le bleu ciel et le rose de Tailwind (`SIDE_STYLE`, fond de l'écran d'affrontement, halo et part des dégâts de l'écran de fin, dés du combat). Teintes un peu moins saturées ; noms en `--side-x-hi`.

## [0.38.1] — 2026-10-19

Début de la refonte de l'interface selon le design system V1.4 (branche `design-system-v1`, plan en 13 étapes).

### Ajouté
- **Design system** : `docs/design-system.md` (source de vérité visuelle) et `docs/prompts-claude-code-BATTLER.md` (phases d'intégration).
- **Tokens** du design system sur `:root` dans `src/index.css` (surfaces, texte, lignes, or, camps, données de jeu, formes, géométrie prestige), exposés en classes Tailwind (`bg-surface-1`, `text-ink-2`, `text-gold-300`, `bg-side-a`, `font-body`, `font-data`…). Polices Alegreya Sans et IBM Plex Mono chargées. Aucun composant ne les utilise encore : rendu identique (six écrans comparés au pixel près).

## [0.38.0] — 2026-10-18

### Ajouté
- **Deux parieurs de l'ordinateur**, Borin le prudent et Zlatka la flambeuse (marqués « IA »), présents dans chaque tournoi et chaque session de duel. Ils parient sur chaque match, même simulé depuis l'arbre, selon leur caractère (`botBet`), et figurent dans le classement. Pas d'interface pour les gérer (demande de l'utilisateur).
- **Écran de fin en deux moitiés** : le combat à gauche (vainqueur, comment il a gagné, PV restants, plus gros coup, critiques, esquives, part des dégâts, bouton Détails pour les statistiques complètes), les paris à droite (pari de chacun, cote dévoilée, tampon gagné ou perdu, gain net, classement animé des quatre parieurs). Sans paris, la moitié droite garde les statistiques.
- **Classement des parieurs** dans l'en-tête de l'arbre et sur l'écran du champion.

### Modifié
- **Guichet des paris refait comme un menu de jeu** (l'ancien ressemblait à un formulaire web) : plein écran, titre frappé, un plateau par joueur, six grandes tuiles avec portraits pour l'issue, des pièces de métal pour la mise, tampon « Pari posé », gros bouton « Au combat », Échap pour fermer. Le pari se pose dès que l'issue et la pièce sont choisies.
- **Cotes cachées avant le combat** (décision de l'utilisateur : on parie à l'intuition) : plus de cote sous les noms ni sur le guichet. Elles se dévoilent sur l'écran de fin.
- **Mises fixes** : 50, 100 ou 200, au lieu de 10 au tapis par pas de 10. **Coup de poker (400)** et **gain net doublé** pour le dernier du classement quand il est distancé. **Cotes au palier le plus proche** (et non inférieur), plafond ×10 au lieu de ×20. **Mise doublée** remplace « Tout ou rien ». Mesure sur 2 000 tournois simulés (`PARIS.md` § 1.9) : un joueur au hasard finit à environ 1 130 Deniers au lieu de 790, et le dernier à mi-tournoi finit premier dans 8 % des cas au lieu de 4 %.
- `betting.ts` passe à un nombre quelconque de parieurs (`Wallets.bettors`), 20 tests.

### Non vérifié
- Sons du guichet (pièce posée) et du règlement non écoutés. Le coup de poker et le gain doublé n'ont pas été vus à l'écran (couverts par les tests).

## [0.37.0] — 2026-10-18

### Ajouté
- **Paris entre deux observateurs**, première version jouable (règles : `docs/PARIS.md`, `FEATURES.md` § 10). Un jeu dans le jeu, en Deniers fictifs, sans aucun effet sur le combat.
  - Bouton **Parier** sur l'écran d'affrontement : le **guichet du match** et ses deux tickets (karma et MiaMiaM par défaut), trois marchés (Vainqueur, Victoire écrasante, Durée), mise de 10 au tapis, gain possible affiché. Rappel des paris sous le « VS », cote du Vainqueur sous chaque nom.
  - **Cotes simulées** : 400 combats sur des graines propres au pari (jamais celle du vrai combat ; un test le vérifie), ramenées à des paliers simples de ×1,1 à ×20.
  - **Coups de théâtre** (environ un match sur trois) : Cote boostée, Favori taxé, Prime de courage, Jackpot, Tout ou rien.
  - **Règlement** sur l'écran de fin (gain ou perte, nouvelle bourse) ; combat triché, mises rendues ; **prime de relance** de 100 Deniers pour un joueur ruiné, au tour suivant.
  - **Tournoi** : paris activés et noms des parieurs dans la configuration, les deux bourses dans l'arbre. **Duel** : bourse de session, remise à zéro dans le guichet.
  - Module de règles `src/game/betting.ts` (15 tests) et composants `src/components/Betting.tsx` (rendus dans `screens.test.tsx`).

### Corrigé
- Deux paris posés dans la même image ne s'écrasent plus (lecture de la dernière bourse connue).

### Non vérifié
- Le « ding » de pile réutilisé pour un pari gagnant n'a pas été écouté. La Prime de relance et le Tout ou rien n'ont pas été vus à l'écran (couverts par les tests).

### Limites
- Les matchs simulés depuis l'arbre ne sont pas pariés : le guichet de tour (étape P3) reste à faire, comme l'encart Meilleur parieur (P5).

## [0.36.5] — 2026-10-18

### Modifié
- **Petites touches issues de l'audit des compétences** (`scripts/skills.report.ts`, `docs/SORTS.md` § 8 et 9 ; décision de l'utilisateur). Valeurs nettes mesurées sur 400 combats par duel :
  - **Esquive améliorée** n'a plus de durée : elle attend le prochain coup reçu. Elle s'éteignait sans servir une fois sur trois (coup adverse sacrifié ou tour perdu), comme la Riposte avant la 0.32.0. Elaria +6,7 → +10,3 points, Sylwen +7,5 → +9,9.
  - **Coup de chance** lance un d6 au lieu d'un d3 : le dé en plus frappe sur 4 à 6, alors qu'un d3 ne frappait jamais. Naraxes +2,7 → +3,6, Ssythra +0,7 → +3,6.
  - **Murzug a sa propre Rage du sang** (`blood-rage-murzug`) : 5 PV au lieu de 3, +0,6 → +4,2 points. Gorak garde 3 PV. Une variante peut désormais remplacer une compétence de son original par sa propre version, avec son propre id (test du roster adapté, catalogue : deux entrées).
  - **Écorce épaisse** absorbe 5 points au lieu de 4 : +0,4 → +2,3 (Thaldrin), +1,9 → +2,4 (Brannoc). À 6, Thaldrin battait Bérengère à 65/35.
- Équilibre après les touches : tous les personnages entre 46,0 % (Bérengère) et 53,3 % (Aldric). Aucun nouveau contre ; Bérengère contre Thaldrin est à 34 % sur 400 combats, juste sous la limite (35,0 % dans le test à 300) : à surveiller. Empreinte de non-régression mise à jour (changement voulu).

### Non vérifié
- Le d6 vert du Coup de chance n'a pas été vu à l'écran.

## [0.36.4] — 2026-10-18

### Modifié
- **Poison à une seule valeur** (demande de l'utilisateur : dégâts et tours affichés à part, c'était confus). Ses charges sont à la fois les dégâts du prochain tour et ce qu'il lui reste : au début de chaque tour du porteur, il inflige ses charges puis en perd une (3, 2, 1). Il se cumule en additionnant ses charges. Nouvelle règle générique `decays` (« s'estompe »), contrôlée par l'audit ; un statut qui s'estompe refuse une durée en tours (`validateRoster`).
- **Souffle de la tombe** : Poison 3 au lieu de 2 pendant 3 tours, les mêmes 6 PV, plus tôt. **Aura de décoction** : 2 charges de poison par coup et par charge d'aura (`DECOCTION_POISON`), au lieu d'1 charge pendant 4 tours ; avec 1 charge, les hommes-lézards tombaient à 38-39 %. Mesure (1 000 combats par duel) : Ervald 48,4 %, Caldrec 52,0 %, Naraxes 48,3 %, Ssythra 47,7 %.
- Équilibre : **Ssythra contre Bérengère ajouté aux contres connus** (décision de l'utilisateur) : 63,7 % sur 1 000 combats (61 à 64 % avant), 65,0 % pile dans le test à 300. Empreinte de non-régression mise à jour (changement voulu).
- **Sons** : Coup et Grondement (couche du coup critique) remplacés par `hit.wav` et `crit.wav` de l'utilisateur. Les **dés** retrouvent les sons de la 0.36.0, avec leurs variantes tirées au hasard (2 roulements, 3 chocs) : exception déclarée à « un son = un fichier » (`VARIED_SOUNDS`), décision de l'utilisateur.
- **Volume** (« on n'entend rien ») : fichiers égalisés à -12 dB RMS au lieu de -16, volume général de 60 à 100 %, niveaux relevés (100, 85, 70 et 45 %), et un compresseur suivi d'un gain de 1,4 pour monter sans saturer.

### Ajouté
- **Pile réussie** : un « ding » clair et net juste après la pièce qui retombe sur pile, pour qu'on entende que le pari est gagné (`coin-win`, son généré par l'agent).

### Corrigé
- « PV » ne prend plus de « s » au pluriel dans les textes (« 3 PV », et non « 3 PVs »).

### Non vérifié
- Rien n'a été écouté par l'agent : volume réel, ding de la pièce et nouveaux coups sont à valider à l'oreille. Le nouveau poison n'a pas été vu à l'écran (compteur de la zone d'état).

## [0.36.3] — 2026-10-18

### Modifié
- **Sons choisis à l'oreille par l'utilisateur** : 19 fichiers (livraison `sfx_choix_good`, Freesound, CC0), un par son, remplacent les 16 fichiers choisis sans écoute. Aura perdue, Soin et Transformation ont enfin leur fichier ; Ronge (poison, pourriture) n'en a pas, et garde son son synthétisé discret.
- `scripts/process-sounds.py` prend un dossier par son, nommé comme dans le code (`hit/hit-1.mp3`), refuse deux fichiers pour un même son et écrit directement `<son>.mp3`. La victoire peut durer jusqu'à 5 s, le choc du face-à-face jusqu'à 4 s.

### Ajouté
- `docs/SONS.md` § 9, **qui joue quel son** dans les deux sens : ce qui fait jouer chaque son ; le son de chaque compétence, personnage par personnage ; le son de chaque statut quand il agit ; les sons de chaque écran. Les timbres du § 3 suivent ceux de la livraison.

### Non vérifié
- Rien n'a été écouté par l'agent : volumes relatifs (`MIX`) à régler à l'oreille. La pièce lancée vient d'une source très faible, amplifiée de 34 dB.

## [0.36.2] — 2026-10-18

### Modifié
- **Sons refondus selon `docs/SONS.md`**, validé par l'utilisateur : 20 sons au lieu de 33, **un fichier par son** (plus aucune variante tirée au hasard), un son par instant. Le jeu passe de 67 fichiers à 16 ; les 4 sons sans fichier convenable (aura perdue, ronge, soin, transformation) jouent leur version synthétisée, en attendant leur fichier.
- Le son d'une compétence se déduit de ses effets, jamais de son nom (`cueOf`, `src/game/cues.ts`) : toutes les auras sonnent Aura gagnée, tous les bonus Bonus gagné, tous les malus Malus reçu (Peur, Luciole, Souffle de la tombe, Attente), tous les soins Soin. Une aura retirée sonne Aura perdue.
- **Coup** : un seul son, quels que soient les dégâts ; plus d'élan sonore, l'impact suffit (décision de l'utilisateur). **Coup critique** : le seul son composé, Coup et Grondement ensemble ; il sert aussi au coup de Pile et au dernier coup de la Rétribution. Épines et Riposte sonnent comme un coup ; le vol de vie, comme un soin ; Charge et Coup de griffe, comme un coup (plus de rugissement ni de griffure).
- **Dés** : un seul roulement et un seul dé posé, même pour la rafale de la Furie des vents (plus de bourrasque) ; plus de jingle sur le jet maximal (décision de l'utilisateur).
- **Pièce** : le lancer passe en retrait (niveau discret), le résultat sonne un tintement net, le même sur pile et sur face.
- **Poison, pourriture, aura de poison** : un son discret et liquide (Ronge) au lieu d'un choc. **Peur, étourdissement** : Tour perdu au tour sauté. **Druide** : une seule transformation, dans les deux sens.
- Volumes par niveaux d'intensité (fort, appuyé, moyen, discret), dans `MIX` (`sound.ts`). La victoire synthétisée n'utilise plus d'ondes carrées (trop « 8 bits »).

### Ajouté
- Test : chaque compétence du roster joue le son de sa famille (§ 4.3 de `SONS.md`), sur 4 combats de chaque duel.

### Retiré
- `sfx_karma.zip` mis à la corbeille, à la demande de l'utilisateur.

### Non vérifié
- Rien n'a été écouté par l'agent. Les 16 fichiers en place sont choisis sans écoute, en attendant le choix de l'utilisateur sur une page d'écoute ; la victoire est provisoire.

## [0.36.1] — 2026-10-18

### Ajouté
- **`docs/SONS.md`, les règles du son** (proposition, à valider) : la 0.36.0 a donné une cacophonie, d'après l'utilisateur. Causes relevées : plusieurs fichiers par son tirés au hasard, jusqu'à quatre sons sur un même coup critique, 33 sons hérités des sons synthétisés, fichiers rangés sans être écoutés. Le document pose les règles (un son par signification, un fichier par son, un son par instant, le son déduit de la nature de l'effet et jamais de la compétence, timbre fidèle, quatre niveaux d'intensité, silence permis). Il propose un vocabulaire de 19 sons, le son de chaque étape du combat, la priorité qui choisit le son d'une compétence, et la vérification sur les 28 compétences du roster. Aucun son du jeu ne change dans cette version.

## [0.36.0] — 2026-10-18

### Ajouté
- **Sons enregistrés** à la place des sons synthétisés : 67 fichiers (33 sons, 1 à 3 variantes chacun, tirées au hasard) livrés par l'utilisateur, tous en CC0 (Freesound). Rangés dans `src/assets/sounds/`, provenance dans `src/assets/sounds/SOURCES.md`. Chaque son garde sa version synthétisée en repli, tant que son fichier n'est pas chargé ou s'il manque.
- L'impact suit trois paliers : léger (1 à 4 dégâts), moyen (5 à 7), lourd (8 et plus, ou critique). Le face-à-face a son propre choc (`clash`), au lieu de l'impact critique.
- **Vitesse** : à ×2 et ×4, les sons du combat sont écourtés au prorata, avec un fondu (`setSoundSpeed`). Le clic, le choc du face-à-face, le KO et la victoire jouent toujours en entier. Le dé qui roule et la pièce qui tournoie s'arrêtent quand ils retombent.
- `scripts/process-sounds.py` : traitement d'une livraison de sons (silence de tête coupé, durée ramenée à la fenêtre du son à ×1, intensité égalisée à -16 dB RMS, MP3 mono 96 kb/s). Le volume relatif de chaque son se règle dans `MIX` (`sound.ts`).
- Test : chaque fichier porte un nom de son connu, et chaque son a au moins un fichier.

### Non vérifié
- Rien n'a été écouté par l'agent : synchronisation des impacts, volumes relatifs (`MIX`) et choix des variantes sont à valider à l'oreille. Les 67 fichiers se décodent dans Firefox.

## [0.35.4] — 2026-10-18

### Corrigé
- **Son du dé sur un 1** : le petit son de déception est retiré (`diceLand`). Il datait d'avant la 0.27.0 : un 1 déclenche une compétence, ce n'est pas un échec. On entendait « bof », puis le son de la compétence. Les faces 1, 2 et 3 n'ont plus de son propre ; le jingle du jet maximal reste. Son non vérifiable par l'agent.

## [0.35.3] — 2026-10-18

### Ajouté
- **`docs/SYSTEMES.md`, le grand livre des systèmes** : l'inventaire de toutes les briques du jeu, couche par couche. On y trouve les dés, les sortes de coups, les déclencheurs, les effets et les crochets de statut, les 10 types d'étapes, et la mise en scène de chaque étape (animation, texte, son, journal). Il couvre aussi les couleurs, les 27 sons, les animations et l'interface. Chaque famille y est décrite comme un assemblage de briques, avec la liste des briques en sommeil. Il mesure la surface de chaque mécanique (nombre de fichiers qui la connaissent) et localise les sources d'effets de bord, avec une base des cas déjà rencontrés et des pistes pour penser en systèmes.
- `docs/EQUILIBRAGE.md` : une piste d'équilibrage se mesure avant d'être proposée, et arrive avec sa compensation ; on juge le personnage, pas la compétence seule (leçon de la 0.35.2).

### Corrigé
- `docs/RESOLUTION.md`, § 3 : la ligne du coup transformé est rangée avec l'étape 1 bis.

## [0.35.2] — 2026-10-18

### Modifié
- **Luciole** : en plus de l'esquive à 0, chaque coup encaissé par le porteur lui inflige **+2 dégâts** avant l'armure (`modifyIncoming`), une fois par coup quel que soit le nombre de charges. Valeur nette de −1,3 à +3,2 points chez Thaldrin, de −0,8 à +2,8 chez Brannoc.
- **Critique du druide de 10 à 8 %** (Brannoc de 14 à 12 %). Sans ce réglage, Thaldrin gagnait 53,1 % et battait les prêtresses à 65-68 %. À −4 points, il tombait à 35/65 contre Aldric, dont l'immunité bloque Luciole. Résultat : Thaldrin 51,4 %, Brannoc 52,2 %. Empreinte de non-régression mise à jour.

## [0.35.1] — 2026-10-18

### Modifié
- **Luciole** (druide, forme humaine, sur un 3) pose **3 charges** au lieu d'une : l'adversaire ne peut plus esquiver pendant ses trois prochains coups encaissés. Les charges se cumulent toujours, et trois lucioles tournent autour de lui. Valeur nette de −2,4 à −1,3 points chez Thaldrin, de −2,0 à −0,8 chez Brannoc ; Thaldrin de 48,0 à 49,1 %, Brannoc de 49,4 à 50,6 %. Empreinte de non-régression mise à jour.

### Corrigé
- **Son en combat** : le bouton de son était recouvert par l'en-tête du combat, et ne répondait plus. Il repasse au-dessus.
- **Contexte audio réveillé à chaque geste** : un clic ou une touche le relance s'il a été suspendu (onglet en arrière-plan), au lieu des seuls boutons qui jouent un son.

## [0.35.0] — 2026-10-18

### Ajouté
- **Deux nouvelles familles**, soit 18 personnages et 9 familles.
- **L'ogre** : Morgrut, avec sa variante Gnashka. Image `ogre.png`.
  - **Aucune compétence** : un 1, un 2 ou un 3 lui pose **Attente** (icône de montre à gousset). Il ne frappe pas et attend son tour suivant, avec un tic-tac et un soupir.
  - **Morgrut** : d14, 63 PV, sans esquive ni critique.
  - **Gnashka**, ogre des cavernes à la peau grise : d12, 70 PV, 10 % de critique.
- **Le druide** : Thaldrin, avec sa variante Brannoc, druide d'automne. Images `druid.png` et `druid-bear.png`.
  - **Deux formes** : il commence sous sa forme humaine, puis en change au début de chacun de ses tours, sauf le premier.
  - **Forme humaine** :
    - **Fleur de vie** (1) : +3 PV ;
    - **Écorce épaisse** (2) : un bouclier de 4 qui se cumule ;
    - **Luciole** (3) : l'adversaire ne peut plus esquiver jusqu'à son prochain coup encaissé ; une charge par coup, et les charges se cumulent.
  - **Forme d'ours** :
    - **Charge** (1) : un coup à la valeur maximale du dé, jamais critique ;
    - **Coup de griffe** (2) : le dé est relancé en secret, et le coup vaut ce jet plus 3 ;
    - **Aura de pourriture** (3) : une aura cumulable. Chaque coup qui touche pose sur la cible une charge de **Pourriture** par charge d'aura, soit 1 dégât par charge au début de chacun de ses tours, qui ne s'estompe pas.
- **Moteur** :
  - **Formes** : `CharacterDef.forms`, l'étape `shift`, et `CharacterEvent.form` pour une compétence propre à une forme.
  - **Coups transformés** (`reshapesHit` : `max` ou `reroll` + bonus, `noCrit`), et `Attack.reshaped`.
  - **Usure au coup encaissé** (`spentOnHurt`).
  - **Statuts** : `waiting`, `barkSkin`, `firefly`, `rotAura`, `rot`.
- **Mise en scène** :
  - **Métamorphose** : fondu entre les deux silhouettes, éclair de sève, couronne de feuilles et son de feuillage, grave vers l'ours et clair vers l'homme.
  - **Charge et Coup de griffe** : leur nom jaillit avant l'élan, avec un rugissement ou trois déchirures.
  - **Luciole** : des lucioles tournent autour de la victime, une par charge.
- **Icônes** (planche v5) : `waiting`, `life-bloom`, `bark-skin`, `fireflies`, `charge`, `claw`, `rot-aura`. Elles apparaissent aussi dans les cartes du compendium et l'infobulle des dés de compétence (`SKILL_ICON`).
- **Tests** : six tests (Attente, formes, compétences de forme, Charge et Griffe, Luciole, Pourriture, Écorce) et les contrôles de l'audit (formes, coups transformés, Luciole, boucliers multiples).

### Modifié
- **Sélection** : panneau de 340 px, vignettes de 34 px et personnages un peu plus petits, pour tenir neuf familles. Les dés de compétence d'un druide montrent ses deux formes.
- **Fiche du compendium** : la liste des compétences défile dans son cadre, et chacune indique sa forme.
- **Contres connus** : Brannoc contre les prêtresses (65,5/34,5 et 66/34). La Pourriture, qui ne s'estompe pas, use leurs soins. Le test d'équilibre a désormais un délai de 60 s, pour 153 duels.

## [0.34.0] — 2026-10-18

### Ajouté
- **Écran du champion** à la fin d'un tournoi, après la finale (jouée ou simulée), et depuis l'arbre (bouton « Le champion »).
  - **Le champion** : son modèle en grand, dans un rai de lumière dorée, et son nom en lettres d'or.
  - **Le bilan du tournoi** : dégâts infligés, critiques et dégâts critiques, plus gros coup, PV regagnés, esquives, compétences déclenchées, précision, dégâts encaissés.
  - **Le parcours** : ses quatre adversaires battus, avec les tours et les PV restants.
  - **Les compétences** : celles déclenchées, avec leur nombre.
  - **Code** : `championRun` (tournament.ts) ; chaque résultat de match garde désormais le bilan des deux côtés.
- **Compétences en trois dés**, sur la sélection, l'affrontement et l'en-tête du combat (après le nom). Chaque dé (faces 1, 2 et 3) ouvre une infobulle avec la compétence qu'il déclenche : nom, conditions, effets avec leur icône. Composant `SkillDice`. Elle remplace la liste des compétences, qui prenait trop de place.
- **Ressenti des combats** :
  - **Les coups de compétence** : les dégâts directs d'une compétence se jouent comme de vrais coups, avec élan, impact, gros chiffre et son.
    - La **Rétribution** frappe une fois par jauge, en rafale (*boum, boum, boum*), et les PV tombent coup par coup. Le dernier coup est lourd : arrêt sur image, éclair, secousse.
    - **Pile** : la voleuse fond sur sa cible.
    - **Riposte** : un contre-coup, avec élan.
    - **Épines** : l'attaquant se blesse sur place.
  - **Les sons selon l'événement** : accord d'aura quand une aura de personnage est posée, malédiction quand un malus est posé, grondement de la Peur, soin, purification, bouillonnement du poison, épines, parade métallique, aspiration du vol de vie.
  - **Critiques** : arrêt sur image avant l'impact, gros coup sourd en plus du fracas, éclair qui blanchit la scène, chiffre encore plus gros qui tremble.
- **Moteur** : une relâche de jauges (`release`) donne le détail de ses jauges (`parts`) avec ses dégâts.

### Modifié
- **Les dégâts en excès sont comptés (overkill)**, ce qui inverse la décision de la 0.14.0. Un coup fatal compte tous ses dégâts (`Attack.dealt` = `damage`), comme les dégâts directs (poison, pièce, Rétribution, épines). Les PV, eux, s'arrêtent à 0.
  - **Effets** : les statistiques (dégâts infligés, meilleur coup), l'historique, la trace (« retirés 5, dont 4 d'excès ») et le dernier coup de l'écran de fin.
  - **Équilibre** : les taux de victoire ne bougent pas (400 combats par duel), seuls les dégâts par coup augmentent.
- **Un seul texte flottant par événement** : le nom d'une compétence (violet) sur son lanceur suffit pour le bonus qu'elle lui pose. Aura de puissance n'apparaît plus deux fois. Un bonus d'un autre nom devient le sous-titre de la compétence (Œil de faucon, puis « Critique assuré »).
- **Les auras** :
  - **Sur le modèle** : seule l'aura de personnage (posée sur un 3) l'illumine, avec un halo qui respire, un cercle lumineux au sol, des particules qui montent et le contour de la silhouette à sa couleur.
  - **Ce qui disparaît** : les liserés des autres états et les auras au sol bonus et malus. Les liserés restent dans le registre, pour un usage futur.
  - **Dans la zone d'état** : l'aura ouvre la rangée des bonus, avec un double contour (doré, puis un anneau tournant à sa couleur). Son infobulle porte la mention « Aura ».
- **Statistiques** : le classement défile dans son cadre, avec l'en-tête figé. L'onglet Confrontations ne garde que la matrice, sur toute la largeur. La colonne V / D ne passe plus à la ligne.
- **Accueil, mode Tournoi** : le bouton s'appelle « Créer un tournoi », sans icône, avec un texte plus petit qui tient dans le bouton.

### Retiré
- **Tous les emojis affichés** : journal, badges flottants (Peur, auras…), descriptions, infobulles, trace, rapports d'équilibre.
  - **Le registre** : le champ `icon` (emoji) des statuts est supprimé.
  - **Icône manquante** : un statut sans icône peinte affiche une marque neutre, son initiale. Quatre statuts « à venir » sont dans ce cas : Brûlure, Vulnérable, Étourdi, Garde.
  - **Garde-fou** : des tests vérifient qu'aucun écran, journal, trace ou fiche ne contient d'emoji.

## [0.33.0] — 2026-10-18

### Ajouté
- **Mode triche (bouton « Cheat » ou touche C pendant un combat)** : un outil d'observation pour imposer la valeur du prochain dé lancé à l'écran.
  - **Le panneau** : il s'ouvre au-dessus de la barre de commandes, en verre fumé comme le journal, avec un liseré violet. Il indique le lanceur et le dé à venir (d8, d3 de Coup de chance, pièce de Pile ou face).
  - **Le pavé** : touches de 1 à 10 (celles qui dépassent le dé sont grisées), Pile et Face pour la pièce, et un bouton « Hasard » pour annuler.
  - **Au clavier, panneau ouvert** : 1 à 9, 0 pour 10, P et F pour la pièce, Retour arrière pour revenir au hasard.
  - **À l'écran** : un dé imposé porte la mention « Imposé » sous la zone des dés. Le bouton Cheat compte les dés imposés pendant le combat.
- **Moteur** : `simulateCombat(f, { seed, forcedRolls })` impose des valeurs par rang de dé. Chaque coup et chaque pièce consomme un rang ; pour la pièce, 1 = pile et 2 = face. Une valeur hors du dé est ramenée à ses bornes.
  - Le tirage a lieu quand même : la suite du hasard reste celle du combat d'origine.
  - Imposer un dé résout à nouveau le combat avec la même graine. Tout ce qui précède ce dé est identique, si bien que la lecture continue à la même étape, sur la nouvelle chronologie.
  - `Attack.forced` et la pièce marquent les dés imposés ; `CombatResult.forcedRolls` les liste.
- **Trace** : une ligne « Dés imposés (mode triche…) : #5=6 » et la mention `[imposé]` sur les dés concernés. Le fichier de log s'écrit à la fin du combat, avec le suffixe `_triche`, et `npm run logs` le rejoue en tenant compte des dés imposés.
- **Audit** : un nouveau contrôle vérifie que seuls les dés demandés sont imposés, avec la bonne valeur. Trois tests dans `combat.test.ts` et un rendu du panneau.

### Modifié
- **Barre de commandes du combat** : une plaque de pierre sombre au liseré de bronze, aux coins coupés, dans l'esprit des boutons du jeu, au lieu de la pilule de lecteur vidéo.
  - Les libellés sont en Cinzel.
  - La vitesse se choisit parmi trois gemmes taillées, dont l'active est en or.
  - Les compteurs (lignes non lues du journal, dés imposés) s'affichent en pastilles.
- **Historique** : un combat avec des dés imposés n'entre pas dans les statistiques, pour ne pas les fausser. En tournoi, il compte quand même pour l'arbre.

## [0.32.1] — 2026-10-18

### Modifié
- **Textes flottants plus lisibles** : dégâts, ESQUIVE, CRITIQUE, noms de compétence et badges d'effet.
  - **Placement** : ils quittent la silhouette pour le décor, à gauche du combattant de gauche et à droite de celui de droite. Ils passent à la ligne s'ils sont longs. Les combattants sont un peu plus éloignés des bords (marge de 13 % au lieu de 10 %). L'étoile d'impact et l'aura de compétence restent sur le personnage.
  - **Police** : nouvelle police, Alegreya Sans SC. Le contour est peint sous les lettres (`paint-order`), et une ombre portée détache le texte du décor.
  - **Test de police** : `?police=alegreya` (par défaut), `cinzel`, `oswald` ou `lilita` dans l'URL. Le choix est retenu pour les visites suivantes.
  - **Durée d'affichage** : 1,7 s pour les dégâts (1,1 s avant) et 1,5 s pour les textes (1 s avant). Ils restaient parfois moins longtemps que leur animation, car le texte disparaissait 550 ms après l'impact. Ils vont désormais au bout de leur animation, sans ralentir le combat.

### Corrigé
- **Infobulles de la zone d'état du nain** : on ne pouvait pas les survoler, car le cadre du combattant, plus haut que sa silhouette, recouvrait la zone. Le cadre ne capte plus la souris, et la zone d'état passe devant lui.

## [0.32.0] — 2026-10-18

### Ajouté
- **Gauvain, le croisé** : variante d'Aldric (teinte dorée). Il a 54 PV, 10 % d'esquive et 17 % de critique ×2,5. Il gagne 50,8 % de ses combats (400 combats par duel).

### Modifié
- **Critique d'Aldric de 15 à 12 %**, pour compenser la riposte réparée. Sans ce réglage, il montait à 57,3 %, et Sylwen ne gagnait que 33 % contre lui. Avec : 55,0 %.
- **Contre connu** : Brokk contre Gauvain, 64/36, ajouté à `balance.test.ts`. Mis à jour volontairement : l'empreinte de non-régression, à cause du nouveau personnage.

### Corrigé
- Aldric regardait du mauvais côté (`facing: 'right'`).
- **La Riposte s'éteignait sans servir** : elle durait un tour et disparaissait quand l'adversaire sacrifiait son coup (jet de 1 à 3). Elle n'a plus de durée et attend le premier coup qui touche. Elle rapporte désormais 4,0 PV par combat (2,8 avant), pour une valeur nette de +3,8 points (+1,4 avant). Un test est ajouté.

## [0.31.0] — 2026-10-18

### Ajouté
- **Aldric, le paladin** (humain, sa propre famille), `paladin.png` et trois icônes (planche v4) :
  - 1 : **Rétribution**, une mécanique inédite. Trois jauges stockent les PV retirés par les trois derniers coups encaissés ; sur un 1, il relâche leur somme en dégâts directs, au moins 1. Les jauges s'affichent dans la zone d'état, avec leur détail au survol.
  - 2 : **Riposte** (1 tour) : le prochain coup encaissé renvoie la moitié de ses PV retirés, puis la charge disparaît.
  - 3 : **Aura d'immunité** : elle purge ses malus, puis bloque toute pose de malus jusqu'à la fin du combat. Elle n'est pas cumulable.
- Moteur : crochets `reflectsHit`, `immune` et `fillsOnHurt` (statut à jauges, `Status.slots`) ; effet `release`. Tests de chaque mécanique.

### Modifié
- Sélection : 7 familles, vignettes de 42 px.
- Équilibre (EQUILIBRAGE.md) : Aldric à 15 % de critique ×2,5. Avec 10 % ×2, Brokk le battait à 75 %. Résultat : 54,8 % au global. Ssythra contre Aldric (34/66) rejoint les contres connus.
- Riposte placée après le vol de vie de l'attaquant (étape 10), avant la fenêtre `hurt`.
- Empreinte de non-régression mise à jour : le roster a changé.

### Connu
- Riposte (+1,4 point) et Aura d'immunité (−1,7) ne pèsent presque rien. Des pistes sont proposées dans EQUILIBRAGE.md.
- Rendu non vu dans un navigateur : jauges de rétribution, sélection à 7 familles.

## [0.30.1] — 2026-10-18

### Modifié
- **Nouveau modèle de l'elfe** (`elf.png`) : une chasseresse de la nuit, bleu nuit et argent, qui bande son arc en croissant de lune. Elle remplace l'ancienne placeholder lie-de-vin. L'image est détourée, ramenée à 1 100 px de haut et optimisée, et sa source est mise à la corbeille.
- Portrait d'Elaria recadré sur le nouveau visage.
- Teinte de Sylwen : `hue-rotate(-110deg)` pour garder le vert forêt (l'ancienne teinte aurait viré au rouge).
- Fiche d'Elaria : elle chasse « à la lueur de la lune ».
- Documentation : PERSONNAGES (image des elfes), STYLE_BIBLE (référence de ton, palette, chasseresse générée), ETAT (l'elfe n'est plus une placeholder).

## [0.30.0] — 2026-10-18

### Ajouté
- **Deux nouvelles races**, chacune avec un original et sa variante (douze personnages) :
  - **Humains**, prêtresses du soleil : **Ysolde** (Prêtresse solaire) et **Bérengère** (Inquisitrice). Petit dé (d7), le jeu passe par les compétences :
    - 1 : **Peur**, l'adversaire perd sa prochaine action et tremble de gauche à droite ;
    - 2 : **Purification**, elle retire le dernier bonus posé de l'adversaire, avec toutes ses charges, aura comprise ;
    - 3 : **Aura de sainteté**, permanente et cumulable, +2 PV par charge à la fin de chacun de ses tours.
  - **Hommes-lézards**, voleuses : **Naraxes** (Voleuse) et **Ssythra** (Assassine) :
    - 1 : **Coup de chance**, un d3 vert en plus du dé à l'action suivante, joué comme un coup à part ;
    - 2 : **Pile ou face**, une pièce remplace le dé à l'action suivante : pile, 15 dégâts directs ; face, rien ;
    - 3 : **Aura de décoction**, permanente et cumulable : chaque coup qui touche pose 1 charge de poison par charge, pendant 4 tours.
- Images `human.png` et `lizardman.png` (détourées, 1 100 px de haut). Les deux images générées sont féminines, donc les deux familles aussi.
- Planche d'icônes v3 : sainteté, purification, peur, décoction, pile ou face, coup de chance, et les deux faces de la pièce. `slice-icons.py` gère maintenant une grille incomplète et garde opaques les zones pâles enfermées dans une icône.
- **Pièce de Pile ou face** (`Coin.tsx`) : elle remplace le dé, tournoie en l'air, puis retombe sur pile (sabres croisés) ou sur face (tête de lézard), avec ses sons (`sfx.coinToss`, `sfx.coinLand`).
- Moteur :
  - étape `coin` ;
  - statut `coinToss` ;
  - dé imposé des coups supplémentaires (`extraDie`, le d3) ;
  - purge des derniers bonus posés (`cleanse.count`) ;
  - apparences `look.motion` (tremblement) et `look.dieColor` ;
  - l'étape `flurry` donne le dé de chaque coup.
- Tests : une mécanique par compétence (Peur, Purification, sainteté, décoction, pièce, d3). L'audit contrôle la pièce et le dé de chaque coup d'une rafale.

### Modifié
- Sélection : six familles, avec des vignettes de 48 px et un panneau de 320 px. Au tournoi, les familles passent à la ligne au centre de l'arbre.
- Journal : une purification de bonus dit « perd … , toutes charges comprises », avec le badge « Dissipé ».
- **Équilibre**, mesuré par simulation (EQUILIBRAGE.md) :
  - la prêtresse passe du d6 au d7 : avec un d6, elle gagnait 63 % de ses combats, qui duraient 52 tours ;
  - la voleuse passe au d10 avec 20 % d'esquive : avec un d8, elle gagnait 33,5 % ;
  - le poison de la décoction dure 4 tours au lieu de 3.
  Résultat sur les 12 personnages : de 46,6 à 53,1 %.
- Le test d'équilibre accepte des contres connus, documentés et en attente de décision, jusqu'à 75/25 : Brokk contre les prêtresses (28/72).
- Empreinte de non-régression mise à jour : roster et règles changés.

### Connu
- **Brokk contre les prêtresses (28/72)** : contre trop dur, à trancher par l'utilisateur. Des pistes chiffrées sont dans EQUILIBRAGE.md.
- **Pile ou face** (−5 points) et **Coup de chance** (+1 à +3 points) rapportent peu : la pièce ne déclenche pas la décoction, et le d3 ne frappe jamais. Des pistes sont dans EQUILIBRAGE.md.
- L'icône `purification` a un éclair terne : elle est à régénérer sans damier peint.
- Les animations (pièce, d3, tremblement) et la sélection à six familles n'ont pas été vues dans un navigateur.

## [0.29.0] — 2026-10-18

### Modifié
- **Épines** (décision de l'utilisateur) : 6 dégâts au lieu de 4, renvoyés à **chaque** coup encaissé tant que les épines durent, jusqu'au début du prochain tour du nain. Contre une Furie des vents, les deux coups sont punis, soit 12 dégâts : une interaction surprenante, voulue.
- **Vol de vie** (décision de l'utilisateur) : la charge n'a plus de durée. Le prochain coup porté la consomme : soin s'il touche, rien s'il est esquivé. Un jet de 1 à 3 ne porte pas de coup : la charge reste.
- Équilibre mesuré (`npm run balance`) : de 48,0 à 53,0 %. Brokk bat les orcs à 57-58 %, grâce aux épines contre la Furie. Aucun réglage : on reste dans la zone de confort, et l'écart vient d'une interaction voulue (EQUILIBRAGE.md). Valeur nette des Épines : +9,5 points pour Brokk (+4,9 avant) ; Vol de vie : +5.
- Audit de résolution : contrôles ajoutés pour le Vol de vie (consommé au coup porté, perdu sur une esquive, gardé sur un jet de compétence). L'audit devient un module (`audit.ts`), partagé par le test et le rapport des combats joués.
- Empreinte de non-régression mise à jour : changement de règles voulu.

### Ajouté
- **Rapport des combats joués** (`npm run logs`, `LOGS_SINCE` pour une session) : chaque trace de `logs/combats/` est rejouée depuis sa graine, comparée au fichier pour vérifier que les règles sont les mêmes, auditée, puis résumée (victoires, durées, compétences, moments marquants). Écrit dans `logs/reports/`.
- EQUILIBRAGE.md : marche à suivre après un tournoi de test, et règle « argumenter avec des chiffres ».

### Corrigé
- Un vol de vie esquivé est retiré au moment même du coup, et non une étape plus tard.

## [0.28.0] — 2026-10-18

### Ajouté
- **Méthode d'équilibrage par simulation** ([docs/EQUILIBRAGE.md](docs/EQUILIBRAGE.md)) : objectifs, moment où l'appliquer (après chaque grosse mise à jour du gameplay), outils, méthode en sept étapes, leviers par ordre de préférence (les PV en dernier), pièges, journal des équilibrages depuis la 0.24.1.
- **Analyse d'équilibre** (`src/game/analysis.ts`, `npm run balance`). Le rapport donne :
  - taux de victoire avec marge d'erreur, durée des combats, dégâts par coup, part des jets sans dégâts ;
  - **valeur nette de chaque compétence**, par contrefactuel : les mêmes combats rejoués sans elle ;
  - apport de chaque statut et matrice des duels.
  Une graine par combat assure un hasard commun d'un essai à l'autre, et les deux points de vue d'un duel lisent les mêmes combats. Le rapport s'écrit dans `logs/balance/`.
- `Character.adjusted({ stats, events })` : un personnage modifié pour un essai, sans toucher au roster.

### Modifié
- **Rééquilibrage par les compétences plutôt que par les PV** (demande de l'utilisateur) :
  - Aura d'intimidation et Aura de précision **cumulables** (−2 dégâts reçus et +1 au multiplicateur par charge), comme la puissance et le poison ;
  - Peau de pierre +4 → **+6** ;
  - Rage du sang 5 → **3 PV** ;
  - Grimbald 8 → **10 %** de critique.
  Les PV reviennent près de l'identité de chaque race : Brokk 68 (83 avant), Grimbald 57 (65), Elaria 48 (50), Sylwen 50 (52), Ervald 58 (62), Caldrec 56 (57). Gorak (61) et Murzug (57) ne changent pas. Résultat sur 1 000 combats par duel : de 47,4 % à 51,8 %, pire duel Ervald contre Murzug (42/58). Brokk combat en 30 tours en moyenne (32 avant).
- **Tolérance d'équilibre élargie** : de 42 à 58 % de victoires par personnage, aucun duel au-delà de 65/35. Avant : de 45 à 55 %. On veut des personnages typés, pas des clones à 50 %. Le test d'équilibre utilise maintenant l'outil d'analyse.
- Empreinte de non-régression mise à jour : changement de règles voulu.

### Connu
- Épines et Vol de vie, deux compétences définies par l'utilisateur, ne valent presque rien (de +2 à +4 points de victoire). Des pistes lui sont proposées dans EQUILIBRAGE.md.

## [0.27.0] — 2026-10-18

### Ajouté
- **Traces de combat sur le disque** : sur le serveur de dev, chaque combat résolu écrit sa trace complète dans `logs/combats/` du projet (`<date>_<gauche>-vs-<droite>_graine-<n>.txt`). Un greffon Vite (`combatLogs`) la reçoit et l'écrit, avec un nom de fichier assaini. Le dossier est ignoré par git. Dépendance de développement : `@types/node`.
- **Furie des vents à deux dés** : au début de l'action de l'orc, deux dés roulent ensemble. Le second jaillit en tournoyant dans une bourrasque bleutée, avec un son de rafale (`sfx.fury`). Les deux coups partent en rafale, avec un élan court, et le dé du coup en cours ressort.
- **Rappels visuels des états** (`look` dans le registre des statuts) :
  - liseré lumineux autour du porteur de chaque effet temporaire (Critique assuré, Armure temporaire, Poison, Épines, Vol de vie, Furie des vents, Esquive améliorée) ;
  - halo qui pulse autour du porteur d'une aura permanente, et qui le suit dans son élan ;
  - elfe translucide sous Esquive améliorée.

### Modifié
- **Les jets de 1, 2 et 3 n'infligent plus de dégâts** : ils déclenchent seulement la compétence du chiffre (`forfeitsHit` sur les douze compétences), sans esquive ni critique. Le journal dit « Gorak fait 2 : pas de dégâts, sa compétence se déclenche ».
- **Équilibre**, mesuré par simulation : sans compensation, Brokk tombait à 37,6 % et Caldrec montait à 59 %. Nouveaux PV : Gorak 61, Murzug 57, Elaria 50, Sylwen 52, Brokk 83, Grimbald 65, Ervald 62, Caldrec 57. Les taux de victoire vont de 47,8 % à 52,2 %. Les combats sont plus longs, de 21 à 32 tours.
- Chaque coup a sa propre clé d'animation, ce qui permet d'enchaîner deux coups dans le même tour.
- Empreinte de non-régression mise à jour : changement de règles voulu.

## [0.26.1] — 2026-10-18

### Corrigé
- **Infobulle de la zone d'état** : elle s'ouvrait sous le médaillon, derrière les combattants. Elle est maintenant centrée au-dessus du médaillon et passe devant tout au survol.
- **Lisibilité de la résolution**, relevée en relisant des traces complètes après un tournoi :
  - les auras qui changent la force d'un coup (puissance, intimidation) apparaissent dans la trace (« 😠 Aura d'intimidation de Brokk −2 ») et dans le journal. Le plancher d'un coup ramené à 1 avant l'armure est signalé ;
  - une aura déjà au maximum reposée par un 3 n'affiche plus « posé, 0 charge » : la trace dit « déjà au plafond, rien ne change », le journal « a déjà … au maximum » et le badge « Déjà au maximum » ;
  - élision : « d'Ervald », et non « de Ervald ».

### Ajouté
- **Audit de résolution** (`audit.test.ts`) : toutes les paires du roster rejouées sur 40 graines, chaque étape revérifiée règle par règle. Le test échoue à la moindre anomalie, avec le duel et la graine. Lancé sur 16 000 combats, il n'a trouvé aucune erreur de règle.
- `Attack.modifiers` : modificateurs de dégâts de chaque coup (statut, porteur, variation). Aucune règle ne change.
- Console : `copy(battler.dump())` copie les traces des 40 derniers combats, soit un tournoi entier.

## [0.26.0] — 2026-10-18

### Ajouté
- **Une aura permanente par race, sur un 3 au dé** (nouveau déclencheur `naturalThree`). Le coup du 3 frappe normalement. L'aura est héritée par les variantes et reste jusqu'à la fin du combat :
  - **Orcs, Aura de puissance** 💪 : +2 dégâts par charge sur chaque coup, avant l'armure. Elle est cumulable : +4 après un second 3. Elle s'ajoute après le critique, et à chacun des coups d'une Furie des vents.
  - **Elfes, Aura de précision** 🦅 : +1 au multiplicateur de critique (×2 → ×3, ×2,4 → ×3,4), y compris sur un critique assuré.
  - **Nains, Aura d'intimidation** 😠 : les coups de l'adversaire font 2 de moins, avant l'armure, avec un plancher à 1. Elle se combine à l'Aura de puissance.
  - **Morts-vivants, Aura de poison** ☣️ : au début de chacun de ses tours, avant son coup, l'adversaire perd 1 PV par charge (dégâts directs). Elle est cumulable.
- Mise en scène : un statut de début de tour qui frappe l'adversaire s'annonce au-dessus de son porteur, avant l'élan du coup. Le journal et la trace disent à qui il appartient (« ☣️ Aura de poison d'Ervald »).
- Tests : chaque aura, son cumul ou son plafond, son ordre avant le coup et sa permanence (89 tests). L'invariant des dégâts bruts tient maintenant compte des modificateurs sortants et entrants.

### Modifié
- **Équilibre**, mesuré par simulation : les orcs montaient à 54,7 %, les elfes et Caldrec tombaient à 45-46 %. Nouveaux PV : Gorak 59 (61 avant), Murzug 55, Elaria 51 (48 avant), Sylwen 53, Caldrec 60 (58 avant). Les taux de victoire vont de 48,3 % à 51,7 %. Sylwen contre Murzug atteint 60/40, la limite du budget de duel.
- Fiches : Gorak a « Beaucoup de PV (59) », et Caldrec « Sacrifie son coup sur un 2 » à la place de « Moins de PV qu'Ervald ».
- Trace : accord de « dégât direct » au singulier.
- Empreinte de non-régression mise à jour : changement de règles voulu.

### Connu
- L'intimidation et la précision ne se cumulent pas : c'est un choix par défaut, à confirmer. Avec trois compétences par race, le plafond de deux compétences fixé en 0.20.1 est dépassé, à la demande de l'utilisateur.
- Les quatre auras s'affichent avec leur emoji en attendant leurs icônes peintes (planche v2, STYLE_BIBLE § 7).

## [0.25.0] — 2026-10-18

### Ajouté
- **Une seconde compétence par race, sur un 2 au dé** (nouveau déclencheur `naturalTwo`), héritée par les variantes :
  - **Orcs, Furie des vents** 🌪️ : pendant 1 tour, la prochaine action compte deux coups. Chacun est résolu à part (dé, esquive, critique, compétences) et peut relancer une Furie pour l'action suivante.
  - **Elfes, Esquive améliorée** 💨 : pendant 1 tour, le prochain coup reçu est esquivé à coup sûr, sans tirage.
  - **Nains, Épines** 🌵 : 4 pendant 1 tour. Le prochain coup encaissé renvoie 4 dégâts directs à l'attaquant, puis les Épines disparaissent.
  - **Morts-vivants, Vol de vie** 🦇 : le coup du 2 est sacrifié (aucun dégât, ni esquive ni critique). Pendant 1 tour, le prochain coup qui touche rend les PV qu'il retire. Un nouveau 2 alors que la charge est là sacrifie encore le coup, et la charge, unique, repart pour un tour.
- **Moteur** : coup sacrifié (`forfeitsHit`, sur la compétence), esquive imposée (`forcesDodge`), vol de vie (`drainsHit`, étape `statusReaction` sur `hit`), coups multiples (`extraStrikes`, nouvelle étape `flurry`), réaction unique (`spentOnReaction`). Champs `Attack.forfeited` et `Attack.dodgeForced`.
- **Règle de durée** : un statut posé pendant un tour n'est plus décompté à la fin de ce même tour. « 1 tour » posé pendant l'action vaut donc pour le tour d'après.
- Mise en scène : coup sacrifié sans élan, annonce de la Furie avant ses deux coups, vol de vie et épines en texte flottant, lignes de journal et de trace dédiées. Les infobulles et le compendium (Compétences, Bonus et malus) suivent automatiquement. La carte de Vol de vie porte une puce « coup sacrifié ».
- Tests : une mécanique par compétence, la règle de durée et la validation du coup sacrifié (84 tests).
- STYLE_BIBLE : prompt de la planche v2 (icônes des quatre nouveaux statuts).

### Modifié
- **Épines** (statut neutre) : ne punit plus que le prochain coup encaissé, puis disparaît. Son médaillon affiche la valeur d'épines.
- **Équilibre**, mesuré par simulation : sans réglage, les morts-vivants tombaient à 43,5 %. Ervald passe de 56 à 60 PV, Caldrec de 54 à 58, Brokk de 72 à 74 et Grimbald de 59 à 63. Les taux de victoire vont de 49,5 % à 51,6 %, et aucun duel ne dépasse 56/44.
- Statistiques de fin : un coup sacrifié ne compte ni comme coup porté ni comme esquive (son dé compte toujours).
- Fiche de personnage : titre « Compétences ».
- Empreinte de non-régression mise à jour : changement de règles voulu.

### Connu
- Les quatre nouveaux statuts s'affichent avec leur emoji, en attendant leurs icônes peintes. Ils sont listés comme exception dans `screens.test.tsx`.

## [0.24.1] — 2026-10-17

### Modifié
- **Nains sans armure passive.** Brokk avait 2 d'armure et Grimbald 1 ; elles s'appliquaient à chaque coup avant l'Armure temporaire de Peau de pierre. Cumulées, ces deux protections étaient un trop gros avantage. L'armure passive est retirée aux deux nains : seule Peau de pierre les protège encore.
- **Compensation en PV**, mesurée par simulation : sans elle, Brokk tombait à 18 % de victoires et Grimbald à 35 %. Brokk passe de 52 à 72 PV (le maximum du roster) et Grimbald de 50 à 59. Les taux de victoire vont de 48,3 % (Brokk) à 53,0 % (Ervald).
- Fiches mises à jour : Brokk « le plus de PV du roster » remplace son armure, Gorak a « beaucoup de PV (61) » et Grimbald perd « armure réduite ».
- Empreinte de non-régression mise à jour : changement voulu des stats des nains.

## [0.24.0] — 2026-10-17

### Ajouté
- Zone d'état : **infobulle** au survol de chaque état (nom, bonus ou malus, effet actuel, tours restants et charges). Elle fonctionne aussi en pause.
- **Effet et compteur ensemble** : quand un statut agit, le décompte de sa durée ou son expiration, qui suivent dans la même phase, sont montrés au même instant que son effet. Le « −2 » du poison et son compteur qui passe de 3 à 2 tombent ensemble.
- **Un état épuisé montre son 0** avant de disparaître : le nombre rebondit sur 0 avec sa variation, puis l'état s'efface. Ça vaut pour toute disparition (durée écoulée, bouclier épuisé, critique assuré consommé, purge).
- `RESOLUTION.md` : règles de mise en scène d'une résolution.

### Corrigé
- Le journal ne pouvait pas s'ouvrir en pause : la pause figeait aussi son animation d'ouverture.
- Les animations de la zone d'état suivent maintenant la vitesse (×1, ×2, ×4) et la pause du combat.

## [0.23.0] — 2026-10-17

### Ajouté
- **Zone d'état : mise en évidence de chaque résolution.** Quand le nombre d'un état change (charges usées ou ajoutées, tour décompté), il rebondit au moment exact du changement (zoom, rebond, éclat) et sa variation (−1, +2) s'élève au-dessus du médaillon. Si seule une valeur cachée change, le médaillon entier sursaute.
- Étape de chronologie **`statusDuration`** : le décompte des durées (tours avant → après) est désormais une étape à part, montrée à son moment (après l'effet du statut, avant l'action), notée au journal (« ⏳ Poison sur Brokk : encore 2 tours ») et dans la trace.

### Modifié
- Le décompte des durées n'apparaissait qu'avec l'étape suivante (souvent l'attaque) : il est maintenant visible au bon moment du cycle. Aucune règle ne change ; l'empreinte de non-régression ignore cette étape de présentation et reste identique.
- Trace : les durées sont lues dans la chronologie au lieu d'être déduites de deux états successifs.

## [0.22.0] — 2026-10-17

### Ajouté
- **Trace de résolution** de chaque combat (`trace.ts`) : chaque étape dans l'ordre du moteur, avec sa phase, la chaîne de calcul d'une attaque (dé, esquive, critique, avant armure, armure, boucliers, plancher d'1 dégât, PV avant → après), les compétences et effets avec leur résultat réel (posé, annulé, bloqué), les effets de statuts, les **décomptes de durée** et les expirations, et l'état des deux combattants après chaque étape.
- La trace est écrite dans la **console du navigateur** à chaque combat (groupe replié, un sous-groupe par tour). En console : `battler.trace()`, `battler.trace(n)`, `battler.traces`, `battler.replay(graine, 'gorak', 'brokk')`.
- Bouton **« Copier la trace »** dans la fenêtre du journal et sur l'écran de fin.
- **Graine** : `simulateCombat(fighters, { seed })` et `randomSeed()`. Chaque combat de l'application est tiré avec une graine, gardée dans `CombatResult.seed`, et peut être rejoué à l'identique.
- `Attack.armor` (armure du défenseur au moment du coup) et `Attack.floored` (le plancher d'1 dégât a joué). Les règles ne changent pas : l'empreinte de non-régression est inchangée.

### Modifié
- Journal du combat : une perte de PV par dégâts directs (poison, effets) précise « dégâts directs, l'armure ne compte pas ».

## [0.21.0] — 2026-10-17

### Ajouté
- Compendium : verticale **Compétences**, entre Personnages et Bonus et malus. Les compétences y sont regroupées par race, avec leur déclencheur, leurs conditions, leurs effets (immédiats ou statuts posés, avec l'icône du statut) et leurs possesseurs, qui ouvrent leur fiche au clic. La Rage du sang des orcs, un soin immédiat sans statut, y apparaît enfin.
- `skillCatalog()` (`catalog.ts`) : les compétences par race, chacune une seule fois avec tous ses possesseurs. Testée dans `modules.test.ts`.

## [0.20.1] — 2026-10-17

### Modifié
- Compendium, verticale Bonus et malus : les cartes n'indiquent plus la provenance du statut (personnage, événement, cible, charges). Un statut se lit comme une règle neutre du jeu.
- Interface : « Événement » devient **« Compétence »** (fiche du compendium, onglet et statistiques de l'écran de fin, journal de combat). Le code garde son nom interne (`CharacterEvent`).
- Docs : décision de cadre sur les statuts et les compétences (`STATUTS.md`, `PERSONNAGES.md`) : statuts neutres, compétences liées au personnage, palette par race, 1 passif de race et 2 compétences au plus. `RESOLUTION.md` explique qui fixe le moment d'une résolution (compétence, statut, moteur) et liste les crochets manquants (`onExpire`, effet différé, action sur le dé).

## [0.20.0] — 2026-10-17

Couche de **résolution des affrontements**. Les combats actuels ne changent pas : les 2 160 combats de référence et l'empreinte de non-régression sont identiques.

### Ajouté
- `docs/RESOLUTION.md`, le livre de règles de la résolution :
  - les inspirations (Magic, Slay the Spire, Darkest Dungeon, Pokémon, D&D, Hearthstone) ;
  - la structure d'un affrontement, et la chaîne de calcul d'une attaque en 9 étapes ;
  - six familles d'effets (instantané, continu, périodique, déclenché, remplacement, contrôle) ;
  - les règles d'ordre, l'application et l'opposition ;
  - des exemples d'interactions et les décisions à valider.
- **Tour en trois phases** : début, action, **fin de tour** (nouveau). Nouveau crochet `onTurnEnd`, durée décomptée au début ou à la fin (`expiresAt`), déclencheur d'événement `turnEnd`.
- **Contrôle** : `skipsAction`, le porteur perd son action (étape `skip`).
- **Réactions** des statuts à un déclencheur (`reactions`, étape `statusReaction`), sans réaction en chaîne.
- **Dégâts entrants** (`modifyIncoming`), placés dans la chaîne de calcul entre les dégâts sortants et l'armure.
- **Application d'un statut** (`resolveApplication`), dans l'ordre : immunité du personnage (`immunities`), garde (`wards`, une charge par blocage), opposition (`opposes`, charges annulées une à une), puis cumul et plafond. Le résultat (`result` : posé, neutralisé ou bloqué) apparaît dans le journal (« insensible », « protège », « s'annulent »), dans les badges (« Résisté », « Neutralisé ») et dans les statistiques : un malus bloqué n'est pas compté.
- **Ordre fixe** : l'actif d'abord ; dans une fenêtre, les réactions des statuts puis les événements ; les effets périodiques, bonus puis malus.
- Cinq statuts à venir qui illustrent chaque mécanique : 🔥 Brûlure, 🩸 Vulnérable, 💫 Étourdi, 🌵 Épines et ✨ Garde sacrée. Régénération et Poison deviennent opposés.
- `StatusIcon` : l'icône peinte d'un statut, ou son emoji tant qu'elle n'existe pas. Un test exige une icône peinte pour tout statut en jeu.
- 12 tests de résolution (74 au total).

### Modifié
- `StatusDef.reactions` et les nouveaux crochets sont traduits en phrases par `statusRules`, pour le compendium.
- La mise en scène du combat gère les réactions (nom flottant au-dessus du porteur) et les tours perdus. Son `switch` est exhaustif.

## [0.19.2] — 2026-10-17

### Modifié
- **Compendium, fiche personnage** : le personnage choisi est désormais peint en grand en arrière-plan, centré sur l'emplacement de l'ancien modèle, les pieds en bas de l'écran. Il est assombri et fondu au sol et sur les côtés (masque), avec un halo chaud derrière lui, et il passe sous les encadrés translucides de la fiche. Il apparaît en fondu à chaque changement de personnage. La mise en page ne bouge pas, et les tailles relatives des races sont conservées.

### Corrigé
- Écran de sélection : le libellé du bouton de tirage débordait. Il devient « Au hasard », avec l'icône de dé.

## [0.19.1] — 2026-10-17

### Modifié
- **Compendium, Bonus et malus** :
  - seuls les statuts réellement posés par un personnage sont listés, puisque c'est la liste des effets qu'on peut rencontrer en combat. Les statuts « à venir » ne figurent que dans `docs/STATUTS.md` ;
  - un second niveau de tri, en sous-onglets Bonus et Malus, chacun avec son nombre d'entrées ;
  - une grille de cartes encadrées dans le style du jeu, 4 par ligne, à proportions fixes (4:5). Chaque carte a un médaillon d'icône, un titre, la polarité, l'effet, un filet doré, les règles et un pied « Provenance » (personnage, événement, cible, charges × tours).

## [0.19.0] — 2026-10-17

### Ajouté
- **Zone d'état** en combat, posée sur l'arène au-dessus de la tête de chaque combattant (sa hauteur suit la taille du personnage). Les bonus sont à gauche et les malus à droite, séparés par un trait fin. Chaque état est un médaillon avec son icône peinte, cerclé de vert ou de rouge, et un seul nombre. Les médaillons apparaissent avec une petite animation, et le nombre pulse quand il change. Le survol donne le détail.
- Règle du nombre affiché (`statusCounter`, et `counter` sur chaque statut) : par défaut, les tours restants si le statut a une durée, sinon ses charges.

### Modifié
- Le nom d'un événement de classe (ex. « Souffle de la tombe ») s'affiche en **texte flottant violet**, avec la même animation qu'ESQUIVE ou CRITIQUE, à la place de l'ancien badge arrondi.
- Les pastilles de statut sous la barre de vie sont retirées (`StatusChips` est remplacé par `StatusTray`). Le bandeau des PV est plus fin.
- **Écran d'affrontement** : les stats de chaque combattant s'affichent en **barres**, comme sur l'écran de sélection, à la couleur du camp. Le sélecteur d'arène est un peu plus bas sous le titre.

## [0.18.0] — 2026-10-17

Préparation de deux chantiers : l'arrivée des bonus et malus, et le compendium. Aucune règle en jeu ne change : l'empreinte de non-régression est identique.

### Ajouté
- **Conditions d'événement** (`when`). Un événement peut exiger :
  - des PV (du porteur ou de l'adversaire) sous, ou au-dessus d', une fraction de leur maximum ;
  - la présence d'un statut, avec un minimum de charges, ou son absence ;
  - un tour minimal.
  Toutes les conditions sont requises, et elles sont vérifiées avant le tirage de `chance`. Elles sont décrites en clair (« si l'adversaire est sous 30 % de ses PV ») et vérifiées par `validateRoster`.
- **Plafond de charges** (`maxStacks`) pour les statuts. Brèche, pas encore attribuée, est plafonnée à 3.
- Pour chaque statut, un **résumé** (`summary`) et des **règles générées depuis le code** (`statusRules`) : crochets, cumul, plafond. La règle de durée commune est définie une fois (`STATUS_DURATION_RULE`).
- **Catalogue des statuts** (`src/game/catalog.ts`) : la liste de tous les statuts, en jeu ou à venir, avec qui les pose (personnage, événement, cible, charges, durée).
- **Compendium**, le recueil du jeu en verticales :
  - **Personnages** : la liste par famille et la fiche complète ;
  - **Bonus et malus** : tous les statuts, avec leurs règles et leurs sources.
  On y accède par un bouton rond provisoire sur l'accueil, par le bouton près du nom d'un combattant, ou depuis les statistiques. Le registre des verticales (`compendium/sections.tsx`) permet d'en ajouter de nouvelles.
- Documentation :
  - `docs/README.md` : plan de la documentation et « où documenter quoi » ;
  - `docs/STATUTS.md` : vocabulaire, conditions, catalogue, règles de design et chantier des bonus et malus ;
  - section « Chantiers en cours » dans `ETAT.md`, et section Compendium dans `FEATURES.md`.

### Modifié
- La **fiche personnage** quitte son écran dédié pour la verticale Personnages du compendium (`CharacterScreen` devient `compendium/CharacterSheet`). Les flèches ‹ › sont remplacées par la liste des personnages.
- Le retour du compendium ramène à l'écran d'origine (sélection ou statistiques).

## [0.17.0] — 2026-10-17

### Ajouté
- **Nouvelle race, le mort-vivant**, dont l'archétype est l'affliction. **Ervald** (Chevalier liche) et sa variante **Caldrec** (Faucheur d'âmes) partagent l'événement **Souffle de la tombe** : sur un 1 au dé, l'adversaire est empoisonné (−2 PV au début de chacun de ses 3 tours suivants). C'est la première race qui pose une aura négative sur l'adversaire. Les deux personnages ont leur fiche, leur section dans `docs/PERSONNAGES.md`, et sont équilibrés par simulation (50,3 % et 50,2 %).
- `scripts/cutout-character.py` : détourage d'un personnage généré sur fond uni (alpha adouci, sans liseré, recadrage).
- `FAMILIES` (`roster.ts`) : les personnages regroupés par famille, l'original suivi de ses variantes.
- Sélecteur d'arène ‹ › sur l'écran d'affrontement, utilisable aussi avec les flèches du clavier.

### Modifié
- **Écran de sélection** :
  - « Combattant de gauche » et « Combattant de droite » sont retirés, et le nom est plus grand.
  - La fiche s'ouvre avec un petit bouton rond placé à côté du nom.
  - Les vignettes sont rangées en colonnes par famille, l'original en haut et ses variantes dessous.
  - Un grand bouton « Personnage au hasard » est placé sous les vignettes.
- **Écran d'affrontement** : l'arène se choisit en haut, sous « Affrontement », avec un sélecteur ‹ nom › qui change le décor en fond. Le décor est un peu plus visible qu'avant.
- Palette du tournoi rangée par famille, avec des vignettes un peu plus petites.
- Écran des statistiques globales en deux onglets (Classement, Confrontations), pour tenir avec 8 personnages.
- Empreinte de non-régression : la graine de chaque duel est tirée du nom de la paire. Ajouter un personnage n'ajoute que des lignes, sans changer celles des duels existants. L'instantané a été régénéré pour cette raison et pour les nouveaux duels. Les 2 160 combats de référence des six personnages d'origine ont été rejoués sans aucune différence : aucune règle n'a changé.

### Corrigé
- Descriptions des statuts insérées dans une phrase : seule la première lettre passe en minuscule (« perd 2 PV » au lieu de « perd 2 pv »).

## [0.16.0] — 2026-10-17

### Ajouté
- **Choix de l'arène** sur l'écran d'affrontement. Sous le « VS », une vignette par arène et un choix « Au hasard », tiré au lancement du combat. L'arène choisie apparaît, très assombrie, en fond de l'écran d'affrontement, et le choix est gardé pour les combats suivants de la session. Purement décorative, elle ne change aucune règle.
- Nouvelle arène : **Cour de Durnhold**, cour de forteresse naine face aux montagnes enneigées (`arena-dwarf-fortress.jpg`).
- Registre des arènes (`src/game/arenas.ts`) : image, nom, cadrage du sol et traitement du décor pour chaque arène.
- Composant d'onglets commun (`Tabs.tsx`), au style du jeu, utilisé par la fiche personnage et le résumé de combat.

### Modifié
- **Résumé de combat** : les statistiques sont réparties en quatre onglets (Bilan, Critiques et défense, Événements, Dés), dans une zone de hauteur fixe. Le contenu ne déborde plus en bas de l'écran.
- **Écran de sélection** : les règles du jeu sont retirées. Le bouton « Combattre » est centré seul en bas, et les combattants sont plus grands (580 px au lieu de 480).

## [0.15.1] — 2026-10-17

### Corrigé
- Journal du combat décalé vers la gauche. L'animation d'ouverture ajoutait un second décalage à celui du centrage de Tailwind (propriété `translate`).
- Journal affiché derrière les combattants : il est maintenant au premier plan.

### Modifié
- Composition du combat : les combattants sont remontés (pieds à 88 px du bas, sur la terre battue) et un peu plus petits (470 px au lieu de 540), pour qu'ils paraissent debout dans l'arène plutôt que collés au bord de l'écran.

## [0.15.0] — 2026-10-17

### Modifié
- **Écran de combat** : la bande noire du bas (journal et commandes) est supprimée et l'arène occupe toute la hauteur sous les barres de vie. Les combattants sont un peu plus grands.
- **Journal** masqué par défaut. Il s'ouvre dans une petite fenêtre translucide et floutée, placée entre les combattants, via le bouton « Journal » ou la touche **J**. Un compteur signale les lignes arrivées pendant qu'il est fermé. S'il est ouvert, il le reste pour les combats suivants de la session ; un rechargement de la page le masque à nouveau.
- Pause, vitesse et journal sont regroupés dans une barre flottante en bas au centre. Elle ne tremble plus avec l'arène sur les gros coups.

## [0.14.1] — 2026-10-17

### Corrigé
- Fiche personnage : le contenu débordait de l'écran.

### Modifié
- La fiche personnage est répartie en deux onglets. **Fiche** contient l'accroche, le background, les forces et faiblesses, l'événement, les caractéristiques et la comparaison avec la variante. **Statistiques** contient le palmarès, le bilan par adversaire et les derniers combats. L'onglet choisi est conservé en passant d'un personnage à l'autre.

## [0.14.0] — 2026-10-17

### Ajouté
- **Fiche de chaque personnage** : accroche, background court, forces et faiblesses (`lore` dans `roster.ts`), affichés sur l'écran du personnage. `validateRoster` vérifie que la fiche est complète et courte.
- `docs/PERSONNAGES.md` : la philosophie de chaque personnage, comment il gagne et comment il perd, la justification de ses stats et de son événement, les chiffres mesurés, la matrice des duels et une check-list de design.

### Modifié
- **Coup fatal plafonné** : un coup ne compte plus que les PV qu'il restait (il reste 5 PV, un coup de 6 compte 5). Cela s'applique aux dégâts infligés, aux dégâts des critiques, au meilleur coup, au dernier coup et à l'historique. À l'écran, la frappe affiche toujours sa force réelle (−6). Nouveau champ `dealt` sur chaque attaque. Les combats déjà enregistrés dans l'historique gardent l'ancien décompte.

## [0.13.0] — 2026-10-17

Consolidation des mécaniques avant l'ajout de nouveaux personnages et de nouvelles mécaniques. **Les règles en jeu ne changent pas** : 2 160 combats à graine fixe donnent exactement le même résultat avant et après.

### Ajouté
- **Statuts (auras)** positifs ou négatifs, dans un registre unique (`statuses.ts`). Chaque statut porte sa présentation, sa règle de cumul (`add`/`refresh`), une durée facultative en tours, et des crochets de règles : `modifyStats`, `modifyOutgoing`, `forcesCrit`, `shield`, `onTurnStart`.
- Quatre statuts prêts, pas encore attribués : ☠️ Poison, 💚 Régénération, 🥀 Affaibli, 💔 Brèche.
- **Déclencheurs** : `combatStart`, `turnStart`, `naturalMax`, `hit`, `crit`, `missed`, `dodge`, `hurt`, `bloodied`, en plus de `naturalOne`.
- **Effets** : dégâts directs et purge des bonus ou des malus, en plus du soin et de la pose de statut. Chaque effet peut viser l'adversaire. Les événements acceptent `chance` et `limit`.
- Pastilles de statut colorées selon la polarité, avec la durée restante, et aura au sol sous les combattants qui portent des bonus ou des malus.
- Écran de fin : dégâts subis hors des coups, malus reçus. Une fin aux PV est gérée, en cas de limite de tours.
- **Tests automatisés** (Vitest, 49 tests) : moteur, chaque mécanique, stats, narration, tournoi, historique, équilibre, empreinte de non-régression, rendu de chaque écran. Scripts `npm test` et `npm run check`.
- `validateRoster` : vérification des données des personnages, dans les tests et au démarrage en développement.

### Modifié
- **Moteur** (`combat.ts`) découpé en phases fixes, qui produisent une chronologie (`beats`) avec l'état complet après chaque étape. L'écran de combat, les stats, le tournoi et l'historique ne lisent plus que cette chronologie.
- **Hasard injectable** (`rng.ts`) : plus aucun `Math.random` dans les règles ; combats et remplissage du tournoi reproductibles avec une graine.
- `Character` devient une pure donnée (les jets sont dans le moteur). `renamed` est remplacé par `withName`, et les personnages ne sont instanciés qu'une fois (`CHARACTERS`).
- Textes du journal et badges générés depuis le registre (`narration.ts`) : plus aucun statut nommé en dur dans l'interface.
- Statistiques déplacées dans `stats.ts`.

### Corrigé
- Un match de tournoi pouvait être compté dans l'historique sans être accepté par l'arbre (match déjà joué). L'arbre valide désormais d'abord le résultat (match prêt, bons combattants).
- L'écran de fin supposait que le combat finissait toujours par un coup du vainqueur.

### Retiré
- `BuffChips` (remplacé par `StatusChips`), `TRIGGER_LABEL` et `BUFF_INFO` (remplacés par `TRIGGERS` et `STATUSES`).

## [0.12.0] — 2026-10-17

### Ajouté
- `docs/STYLE_BIBLE.md` : direction artistique, contraintes techniques des images et prompts pour ChatGPT Image.

### Modifié
- Nouveau fond de combat, original et généré : `arena-ruins.jpg` (arène forestière en ruines au crépuscule). Il remplace le placeholder `arena1.jpg`, qui est supprimé.
- Traitement du fond un peu moins sombre et moins désaturé (`brightness 0.5`, `saturate 0.85`), pour garder la lumière du crépuscule.

## [0.11.0] — 2026-10-17

### Ajouté
- Documentation du projet : `README.md`, `docs/INTENTION.md`, `docs/ETAT.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md`, ce changelog et `CLAUDE.md`.
- Numéro de version affiché sur l'écran d'accueil, injecté au build depuis `package.json` (`__APP_VERSION__`).

## [0.10.0]

### Ajouté
- Image d'arène (`arena1.jpg`) en fond de l'écran de combat. Elle est assombrie, désaturée et légèrement floutée, avec une vignette, un sol sombre et un halo au pied des combattants pour qu'ils restent au premier plan.

## [0.9.0]

### Ajouté
- **Événements** : capacités qui se déclenchent sur un 1 naturel au dé de dégâts.
  - Orc, Rage du sang : +5 PV.
  - Elfe, Œil de faucon : prochain coup critique assuré.
  - Nain, Peau de pierre : +4 armure temporaire, cumulable, qui s'use en encaissant.
- Système générique déclencheur → effets (soin, bonus), prévu pour d'autres déclencheurs.
- Bonus actifs affichés en icônes sous la barre de vie ; aura, titre et son au déclenchement ; lignes ✨ dans le journal.
- Section Événements dans les stats de fin, sur la fiche personnage et dans les statistiques globales (événements, PV regagnés, critiques forcés, armure temporaire absorbée).

### Modifié
- `Attack` enregistre des instantanés `afterHit` et `after` (PV et bonus) à la place des seuls PV.

## [0.8.1]

### Corrigé
- Les boutons de la configuration du tournoi ne répondaient pas : l'arbre, qui couvre toute la scène, interceptait les clics.

### Modifié
- Un seul bouton 🎲 **Compléter**, qui remplit uniquement les cases vides. « Tout tirer au sort » a été retiré.

## [0.8.0]

### Ajouté
- **Mode tournoi** : bascule sur l'accueil, configuration d'un arbre de 16 participants (à la main ou automatique), suivi des matchs.
- Chaque match prêt peut passer par l'écran d'affrontement (jouer ou simuler) ou être simulé directement depuis l'arbre. On peut aussi simuler tout le tour.
- Doublons permis, nommés avec des chiffres romains.
- Les matchs de tournoi alimentent l'historique ; compteur de tournois gagnés.
- Le tournoi n'est pas sauvegardé au rechargement (choix délibéré).

## [0.7.0]

### Ajouté
- Bouton 📜 **Fiche** sur la sélection : modèle, stats, comparaison avec la variante, palmarès.
- **Historique local** de tous les combats (`battler:history:v1`) et écran 📊 **Statistiques** : tableau global, matrice des confrontations, derniers combats, remise à zéro.

## [0.6.0]

### Ajouté
- **Écran d'affrontement** entre la sélection et le combat, avec les boutons JOUER, SIMULER et CHANGER.
- Simulation réelle basée sur les stats, qui mène directement à l'écran des scores.

### Modifié
- Moteur unique et pur (`simulateCombat`) ; le mode joué rejoue le résultat calculé.

## [0.5.0]

### Modifié
- Tout le jeu sur une scène fixe en 16:9 (1600×900), mise à l'échelle de la fenêtre.
- Tuiles de sélection des personnages plus petites.

## [0.4.0]

### Ajouté
- Elfe et nain, en plus de l'orc.
- Archétypes de stats par race, et une variante de coloris par personnage, avec des stats légèrement différentes : Gorak/Murzug, Elaria/Sylwen, Brokk/Grimbald.
- Sélection libre des deux combattants.

## [0.3.0]

### Ajouté
- Esquive et coup critique (×2), visibles en combat et dans les stats de fin.
- Personnages modélisés par une classe `Character` avec des stats, pour pouvoir en ajouter.

## [0.2.0]

### Ajouté
- Effets sonores synthétisés (dés, coups, critiques, KO, victoire) et bouton muet.

## [0.1.0]

### Ajouté
- Prototype de base : deux combattants à 50 PV, dégâts de 1 à 10 au dé.
- Écran de début, écran de combat avec dés animés et journal, écran de fin avec statistiques.
- Animation de charge et effet d'impact ; l'image est retournée pour que les combattants se fassent face.
