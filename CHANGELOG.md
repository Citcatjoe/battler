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
- **Vérification proportionnée** (2026-10-20, règle de l'utilisateur, dans `CLAUDE.md`) : un changement de gameplay se vérifie sans écran (`npm run check`, test ciblé, un seul `npm run balance` si l'équilibre peut bouger, traces). Aucun combat n'est joué dans le navigateur pour valider du gameplay, et le navigateur ne sert qu'aux changements de rendu. Le combat test, jugé peu fiable par l'utilisateur, est son outil et ne sert pas à valider : limite ajoutée à `docs/ETAT.md` et chantier § 19 dans `docs/TODO.md`.
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

## [0.91.2] — 2026-10-22

### Ajouté
- **Icônes des quatre reliques élémentaires** (planche v13, `docs/STYLE_BIBLE.md` § 7) : Braise captive (`caged-ember`, une braise vivante dans une cage ronde à quatre barreaux, pendue à sa chaîne), Larme de givre (`frost-tear`, une larme de glace sertie d'argent terni, fêlée au tiers de sa hauteur), Conque des vents (`wind-conch`, un coquillage spiralé où tourne un vent enfermé, sur sa lanière), Géode fendue (`split-geode`, une géode ouverte en deux, deux gros cristaux ambrés, cerclée de cuir). La magie de l'élément se voit dans l'objet, encore enfermée : c'est elle qui sort en combat. Plus aucune relique n'affiche son initiale. Aucune ligne de code : `RelicIcon` prend le fichier qui porte l'id.
- **Première planche générée par l'agent, avec Artlist** (GPT Image 2.5, fond transparent, les douze reliques de la v10 jointes comme référence de style) : deux planches, la meilleure version de chaque relique retenue (trois de la seconde, la géode de la première). Méthode notée dans `docs/STYLE_BIBLE.md` § 8.

## [0.91.0] — 2026-10-22

### Ajouté
- **Cri de guerre au lancement du combat** (demande de l'utilisateur) : le bouton « Jouer » de l'écran d'affrontement, qui lance le combat animé (duel, tournoi, saison, campagne), joue un cri de guerre de 1,74 s (`war-cry.mp3`, niveau 2, jamais écourté par la vitesse) à la place du clic. Généré avec ElevenLabs (API de bruitages), proposition 1 sur 3 retenue à la mesure ; les trois sont dans `logs/sons/war-cry/`. Vocabulaire de `docs/SONS.md` porté à 23 sons.
- **ElevenLabs dans le projet** : clé posée dans `.env.local` (ignoré par git) par `npx @elevenlabs/cli onboard`, SDK `@elevenlabs/elevenlabs-js` en dépendance de développement, et `npm run sfx` (`scripts/gen-sfx.mjs`) pour générer des propositions de bruitage. La clé n'est lue que par Node, jamais par le code du navigateur.

### Modifié
- **Ouverture du combat** : 1 400 ms de silence avant les dés de l'initiative au lieu de 500 (`INTRO`, `timing.ts`), pour que le cri de guerre retombe avant que les dés roulent (`SONS.md`, règle 8). Le combat test, qui saute l'ouverture, ne change pas.

## [0.90.0] — 2026-10-22

### Ajouté
- **Grésillement, le son du poison** (demande de l'utilisateur) : quand le poison agit, au début du tour de son porteur, il joue un « pchhhit » bref et discret de vapeur toxique (`fizz.mp3`, 0,6 s, niveau 4). Il ne partage plus Ronge, que gardent Pourriture, Brûlure et Saignement. Le son se déclare dans le registre du statut (`tickSound`, `statuses.ts`) ; il pourra servir plus tard à d'autres maux laissés par un coup (magie…). Test dans `staging.test.ts` : chaque poison qui agit grésille, chaque autre statut qui ronge garde Ronge. Vocabulaire de `docs/SONS.md` porté à 22 sons.
- Le fichier est **généré avec Artlist** : faute de générateur de bruitages, et le forfait AI Suite ne téléchargeant pas les bruitages du catalogue, c'est la piste son d'une vidéo Veo 3.1 Lite (une bouffée de fumée toxique qui gicle d'une éraflure d'armure), coupée à son attaque puis traitée par `scripts/process-sounds.py` (fenêtre `fizz` : 0,6 s). Provenance dans `src/assets/sounds/SOURCES.md`.

## [0.89.0] — 2026-10-22

### Modifié
- **Campagne : un acte plus court, une récompense par victoire** (demande de l'utilisateur) : cinq combats normaux puis le boss (six nœuds au lieu de huit). Chaque combat normal gagné rapporte **une** récompense, tour à tour une relique et une forge du dé : relique, forge, relique, forge, relique, soit trois reliques et deux forges dans l'acte. L'écran de victoire mène directement à la récompense (bouton « Relique » ou « Forge du dé »). Sur la piste de l'acte, un losange entre chaque combat, quelle que soit la récompense (son infobulle dit laquelle).
- **Courbe nominale montante** (recommandation de l'agent, retenue par l'utilisateur) : le champion de référence gagne 95, 90, 87, 84 puis 81 % de ses combats normaux, et 45 % contre le boss, au lieu de 70 % partout. Attendu : 51 % des parties atteignent le boss, 23 % gagnent l'acte (mesure dans `docs/CAMPAGNE.md` § 18.3). Le champion de référence reçoit ses récompenses au même rythme que le joueur.
- Sauvegarde de la partie en cours : `battler:campaign:v2` (une partie de la 0.88.0 est oubliée) ; les héritages sont gardés.

### Corrigé
- Choix du champion et adversaires de la carte : les combattants sont centrés dans leur carte, sur leur silhouette et non sur leur toile (ancrage `body` de `Fighter`).

## [0.88.0] — 2026-10-22

### Ajouté
- **Campagne** (prototype de `docs/CAMPAGNE.md`, règles tranchées avec l'utilisateur) : troisième mode de l'accueil. Un champion tiré parmi trois mène seul un acte de huit nœuds, sept combats normaux puis le boss ; deux adversaires proposés à chaque nœud, avec leur bande de danger (Sûr, Risqué, Mortel, sans chiffre) ; une défaite met fin à la partie. Après les victoires 2, 4 et 6 : une forge du dé puis une relique, le champion ayant déjà choisi (choix modifiable). Fin de partie : parcours, dé forgé, héritage.
  - **Réglage par simulation** (`campaign.ts`) : chaque adversaire est un personnage du roster dont seuls les PV se règlent, pour que le champion de référence (le même personnage, forgé et équipé au hasard au même rythme, douze versions) gagne environ 70 % du temps, 45 % contre le boss ; la bande de danger se calcule contre le champion réel.
  - **Le boss**, commun : **Le Colosse** (image de Morgrut assombrie), trois techniques du roster sur ses faces 1 à 3, deux reliques, un d12 doré sur le 11 et le 12.
  - **Héritage** : une partie terminée lègue au même personnage ses reliques et ses opérations de forge valables sur son dé d'origine ; il en reprend une, parmi trois au plus, à sa partie suivante. Une partie sans gain n'efface rien.
  - **Sauvegarde** : partie en cours (`battler:campaign:v1`) et héritages (`battler:campaign-heritage:v1`) dans le navigateur. Les combats de campagne n'entrent pas dans l'historique.
  - `npm run campaign` (`scripts/campaign.report.ts`) : parties en pilote automatique par champion, profondeur, boss atteint, acte gagné (`logs/campaign/`).
- **Forge du dé** (`forge.ts`), utilisable par tout mode (`Character.withForge`) : Graver (une compétence du dé d'un autre combattant sur une face libre, ou à la place d'une Attente de l'ogre), Dorer (+2 au coup de cette face, avant le critique, jamais sur un coup brut), Agrandir (+2 faces), Retailler (la plus haute face, jamais une compétence d'origine), Aiguiser (un rang de plus : charges, dégâts, soins, coups d'un double). La barde grave et aiguise ses doubles. Composants `ForgedDie` (le dé face par face) et `ForgeCard`.
- **Faces au-delà du 3** dans le moteur : déclencheurs `face:N` et `double:N` (`faceTrigger`, `doubleTrigger`, `triggerText`), sceaux et faces chiffrées dans l'en-tête du combat et à l'affrontement ; label « Face dorée +2 » sous le dé ; `Attack.gild`.
- Trace : en-tête `Forge (…)`, relu par `npm run logs` (avec les PV réglés et le boss) ; audit : taille du dé et dorures recomptées.

### Modifié
- `DOUBLE_TRIGGERS` remplacé par `doubleTrigger`, `ROLL_TRIGGERS.includes` par `isRollTrigger` ; l'Attente de l'ogre porte `idle` (face libre pour la forge, sans effet en combat). Empreinte de non-régression inchangée.
- Accueil : la paire de modes porte trois plaques (Duel, Tournoi, Campagne).

## [0.87.0] — 2026-10-22

### Ajouté
- **Noms uniques** (demande de l'utilisateur) : petit interrupteur « Noms uniques » à côté de « Les combattants », sur la configuration du tournoi (arbre seul ou cases de saison), désactivé par défaut et gardé pour le tournoi suivant de la session. Activé, chaque participant reçoit au lancement le nom de son personnage suivi d'une épithète tirée de son propre registre (« Gorak le Borgne », « Elaria Flèche-Grise », « Thaldrin Racine-Profonde »), à la place des chiffres romains (Gorak II). Un personnage reste un personnage précis : seul le surnom change.
  - `src/game/epithets.ts` : huit épithètes par personnage, fidèles à sa fiche. « Compléter » en met au plus 4 du même sur 32 cases avec dix personnages : le double de marge. Au-delà (cases posées à la main), une épithète resservie prend un numéro (« Gorak le Borgne II ») : les noms restent distincts.
  - Tirage déterministe : à la graine de la saison (sur un hasard à part de celui des matchs), ou à une graine tirée au lancement pour l'arbre seul. Même graine, mêmes noms.
  - Noms longs : plus petits sur l'affrontement, l'écran de fin et l'écran du champion ; tronqués proprement dans l'arbre et le classement. L'historique (`battler:history:v1`) garde, comme avant, le nom affiché de chaque combat : son format ne change pas.
  - Tests : registre suffisant pour le maximum de « Compléter », épithètes distinctes et sans emoji, 32 noms distincts et reproductibles, noms distincts même au-delà du registre.

### Modifié
- **Classement de saison en une seule liste** (demande de l'utilisateur : la colonne « hors qualification » était trompeuse) : du 1er au dernier, dans un panneau qui défile ; juste après le 16e, une **ligne de qualification** en or, libellée (« au-dessus, qualifiés pour l'arbre · en dessous, non qualifiés », puis « éliminés » quand la saison est finie) ; les suivants sont atténués. Colonnes plus larges, texte plus grand. Le reste de l'écran de saison ne change pas.

## [0.86.1] — 2026-10-22

### Corrigé
- **Phase de saison : l'arbre est vide au départ** (correction de l'utilisateur : une saison de football, puis des playoffs). Saison activée, la configuration ne fait plus remplir les 16 cases de l'arbre : elle montre les **cases des participants de la saison** (20, 24 ou 32, sur deux colonnes aux places des extrémités de l'arbre), à remplir avec le même pinceau ou par « Compléter » ; « Lancer la saison » n'est actif que quand toutes sont pleines. Plus aucun participant n'est tiré à la validation, et aucune case de l'arbre de la configuration n'entre dans le tournoi. L'arbre ne se peuple qu'à la fin de la saison, avec les 16 premiers du classement en têtes de série ; les autres sont éliminés. L'écran de l'arbre ne s'ouvre pas pendant la saison. Saison désactivée : rien ne change. Les cases de saison sont gardées à part pour la session ; changer la taille ne perd pas celles au-delà.
- **Interrupteurs de la configuration plus compacts** (Phase de saison, Reliques) : 44 px de haut au lieu de 64, visuel de 28 px, nom en 17 px, curseur réduit.
- Test : pendant la saison l'arbre est vide, et à la fin ses entrants sont exactement les 16 premiers du classement d'une saison simulée, dans l'ordre des têtes de série.

## [0.86.0] — 2026-10-22

### Ajouté
- **Phase de saison du tournoi** (demande de l'utilisateur), facultative, avant l'arbre à 16 : interrupteur « Phase de saison » sur l'écran de configuration (désactivé par défaut), taille au choix dans le panneau (20, 24 ou 32 participants, 24 par défaut). Les 16 cases de l'arbre en font partie ; les autres participants sont tirés à la validation en équilibrant le roster (`fillSlots`, généralisé à tout nombre pair de cases). Sans la saison, le tournoi est inchangé.
  - **Championnat aller-retour** en journées (tableau circulaire de Berger) : chacun rencontre chacun deux fois, camps inversés au retour, un match par participant et par journée ; 2(n−1) journées, 992 matchs à 32.
  - **Points** : victoire 3, défaite 0 (le moteur ne produit jamais de nul : la limite de tours désigne aussi un vainqueur). **Départage** : points, différence de PV (dégâts infligés − dégâts subis, comptés comme le bilan du champion), confrontations directes entre les ex aequo, ordre de tirage.
  - **Qualification** : les 16 premiers entrent dans l'arbre en têtes de série (1–16, 8–9, 5–12, 4–13, 3–14, 6–11, 7–10, 2–15 ; le 1er et le 2e ne peuvent se croiser qu'en finale), sous leur nom de saison. Dans l'arbre, le numéro d'une case est le rang de saison ; l'écran du champion rappelle son rang.
  - **Pendant la saison** : ni relique gagnée ni portée, ni pari, ni récompense. Les paris et les reliques reprennent dans l'arbre.
  - **Écran de saison** : classement en deux colonnes (les 16 premiers, sous la ligne de qualification, et les autres : rang, portrait, nom, joués, victoires, défaites, différence, points), la journée en cours et ses matchs (Affronter, ou le résultat), journées précédentes et suivantes, Simuler la journée, Simuler la saison (journée par journée, Interrompre), puis Passer à l'arbre.
  - **Hasard reproductible** : chaque match a une graine dérivée de la graine de la saison et de son numéro ; une saison se rejoue à l'identique. Seul un bilan compact de chaque match est gardé (vainqueur, tours, PV restants, dégâts, graine).
  - **Traces et historique** : un match de saison regardé (Affronter) écrit sa trace et entre dans l'historique, comme un match de l'arbre ; les matchs simulés en masse, non (des centaines de combats par tournoi fausseraient les statistiques). Le format de l'historique ne change pas.
- Module `season.ts` (calendrier, résultats, classement, qualification), écran `SeasonScreen.tsx`, tests `season.test.ts` (calendrier pour 20, 24 et 32, points et départage, têtes de série, aucune relique en saison, reproductibilité, tournoi sans saison inchangé).

### Mesuré
- Saison de 32 (992 combats) : 160 à 190 ms sous Node, environ 0,5 s dans Firefox, une journée par tâche (4 à 11 ms par journée sous Node). Un tournoi de 32 en mémoire pèse environ 100 Ko.

## [0.85.0] — 2026-10-21

Quatre **reliques élémentaires** (proposition validée par l'utilisateur) : quatre fragments d'un même vieux sort, scellés chacun dans un objet. Une relique ordinaire garde sa magie contenue ; une relique élémentaire brise son sceau quand elle agit, et sa magie envahit l'arène (un événement de scène, comme les éclairs du druide). `docs/RELIQUES.md` § 12.

### Ajouté
- **Braise captive** (Feu, Tour) : au début de son 4e tour, une fois, *Pluie de braises* : 3 impacts de 2 dégâts directs. Scène : le ciel rougit, des cendres montent, trois météores traversent l'arène en diagonale et explosent sur l'adversaire ; l'arène tremble à chaque impact.
- **Larme de givre** (Givre, Seuil) : quand ses PV passent sous 35 %, une fois, elle retire tous ses malus et rend 5 PV. Scène : le givre gagne l'écran depuis les quatre coins, une gangue de cristaux se referme sur le porteur puis vole en éclats ; la purge et le soin tombent à l'éclatement.
- **Conque des vents** (Vent, Coup) : quand il esquive, deux fois par combat, *Bourrasque* : 3 coups de 2 dégâts directs. Scène : traits de vent et feuilles qui traversent l'arène du porteur vers l'adversaire, trois lames d'air qui le frappent.
- **Géode fendue** (Terre, Coup) : quand il encaisse un coup, deux fois par combat, recharge de 3 tours, *Rempart* : Armure temporaire 4. Scène : le sol se fend sous le porteur, des colonnes de roche veinées d'ambre jaillissent sur ses flancs, des éclats retombent ; l'arène tremble.
- Moteur et mise en scène : `Relic.element` et `Relic.scene` (`validateRelics` : élément et scène ensemble, un impact par coup de dégâts directs, un seul impact sur le porteur) ; visée d'un événement de scène (`SceneTiming.aim` : l'adversaire, ou le lanceur) et secousse (`quake`) ; l'étape `relic` lance la scène et cale ses coups sur ses impacts, comme la Foudre. Infobulle, carte de récompense, compendium et trace disent « Élémentaire · Feu ».
- Tests : registre et validation, scène sans effet sur le combat, coups sur les impacts, effets sur le porteur au premier impact.

### Corrigé
- **Deux seuils passés sur le même coup** : le soin d'une relique de seuil n'efface plus le passage d'une autre relique sous son seuil sur ce même coup. Cas trouvé par l'audit : un critique fait tomber Gorak de 40 à 16 PV, sous sa Larme de givre (35 %) et sous le Trophée du chasseur d'Elaria (30 %) ; la Larme le remontait à 21 PV avant que le Trophée ne lise ses PV, et le Trophée ne partait pas. Les passages se lisent maintenant sur les PV du changement vérifié (`checkThresholds`). Test construit dans `combat.test.ts`, audit qui lit le seuil sur l'étape cause. Aucun combat sans relique ne change (empreinte identique).

### Mesuré
- `npm run relics` (400 combats par duel) : Braise captive +11,8 (Ysolde +7,2 à Gorak +14,1), Larme de givre +10,6 (Morgrut +8,2 à Fanchon +13,2), Conque des vents +6,4 (Morgrut 0, qui n'esquive jamais, à Elaria +17,1), Géode fendue +13,7 (Aldric +9,3 à Thaldrin +16,2). Les quatre dans la cible de 5 à 15 points.

## [0.84.1] — 2026-10-21

### Modifié
- **Un statut posé pendant un coup agit dès le coup suivant** (décision de l'utilisateur, qui annule la « plaie immédiate » de la 0.84.0). C'est une règle de jeu, `docs/RESOLUTION.md` règle 9. Chaque coup a un état de référence, pris à son début : un statut absent à ce moment ne réagit pas à ce coup, et un statut renforcé pendant le coup y réagit avec ses charges du début.
  - Le Saignement de Pourfendre ne coule pas sur le coup qui l'ouvre, mais dès le coup suivant qui touche le porteur.
  - Les Épines du Collier de ronces ne répondent pas au coup qui fait passer sous 50 %, mais au suivant.
  - Le coup suivant peut être dans la même action (rafale de Furie des vents, deux dés de la barde, d6 de Coup de chance), et la pièce de Pile ou face compte comme un coup à part.
  - Le reste de la 0.84.0 ne change pas : Vol de vie, Riposte et jauges de Rétribution réagissent dans les fenêtres du coup, pile comprise. Les jauges se remplissent à chaque coup qui touche : ce n'est pas une réaction.
- Textes : Saignement, Pourfendre, Collier de ronces, règle « S'il touche » ; contrôle d'audit « un statut posé pendant un coup réagit à ce coup ». L'empreinte de non-régression change.
- Équilibre (`npm run balance`) : Gorak 52,2 → 51,0 %, Ysolde 43,7 → 43,9 %, les autres à ±0,1 point, soit les valeurs d'avant la 0.84.0.

## [0.84.0] — 2026-10-21

Audit de fidélité entre les règles affichées, les données et le moteur, après le moteur v2 (trois rapports : règles du compendium, compétences, statuts et reliques). Les règles qui n'existaient que pour l'ancien affichage sont corrigées (décisions de l'utilisateur). L'empreinte de non-régression change.

### Modifié
- **Une seule règle pour « un coup qui touche »** : le Vol de vie, la Riposte et le remplissage des jauges de Rétribution sont des réactions ordinaires des fenêtres du coup (« quand il touche », « quand il encaisse »), dans l'ordre de pose. Ils partent donc aussi sur pile (Pile ou face), comme les Épines, le Saignement et l'Aura de décoction. Avant, ils étaient codés à part et la pièce les ignorait (0 Riposte sur 385 piles).
- **Plus de plaie différée** : un statut posé ou renforcé pendant un coup réagit à ce coup quand sa fenêtre vient ensuite. Le Saignement de Pourfendre coule dès le coup qui l'ouvre, et les Épines du Collier de ronces réagissent au coup qui fait passer le porteur sous 50 %. Cette règle (`strikeBase`) existait pour que l'écran montre la plaie avant qu'elle coule ; la mise en scène v2 n'en a plus besoin.
- **Coups bruts** (Furie des vents) : aucune relique de face ne s'y déclenche. Le Fer à quatre clous suit maintenant l'Osselet fendu et le Dé creux.
- **Mécanismes de compétence et de forme** (`mechanic` : jauges de Rétribution, Pile ou face, Furie des vents, Attente, formes du druide) : ni bonus ni malus. Aucune purge ne les retire (la Purification n'efface plus les jauges d'Aldric), aucune immunité ni garde ne les bloque, et ils ne comptent pas dans les statistiques de malus. Le compendium les présente avec leur compétence.
- **Usure d'une phase** : décompte et expiration en une seule étape (`statusAge`, cause : l'effet du statut) au lieu de deux. La Furie des vents n'a plus de durée.
- **Textes** : les 28 règles du compendium sont revues. Coup sacrifié, Double qui frappe (Crescendo : un coup de 12), Faces de compétence (exceptions de l'ogre, du druide et de la barde), Un tour (Étourdi retiré, compétences et reliques de début et de fin), Critique (multiplicateurs réels), Pose d'un statut (immunité), Dégâts directs (ce ne sont pas des coups) et Durée sont réécrites. Coup transformé est masquée, faute de compétence qui l'utilise, et Tour de la pose est fondue dans Durée. Pastilles : plus de « Durée » sur les auras, et des règles citées là où elles s'appliquent.
- Statuts, compétences et reliques corrigés : Aura de précision (« +1 au multiplicateur », et non « ×2 devient ×3 »), Coup de chance (un second jet, qui peut déclencher une compétence), Pile ou face, Purification, Rétribution, Riposte, Foudre, Pourfendre, Peau de pierre, Chapelet de l'ermite, Collier de ronces, types de reliques. Formes du druide et Ouverture de la barde visibles sur les fiches ; esquive de la Cotte du mercenaire affichée bornée à 0 %.
- Équilibre (`npm run balance`, 0.77.1 → 0.84.0) : Gorak 51,0 → 52,2 %, les autres à ±0,3 point. Roster de 43,7 % (Ysolde) à 53,8 % (Ervald, Aldric) ; duel le plus net, Naraxes contre Ysolde, 64,5 %.

## [0.83.0] — 2026-10-21

### Ajouté
- **UI kit** (`docs/ui-kit/`, source de vérité des contrôles) : `battler-ui-kit.css` importé tel quel (`main.tsx`), `BattlerIcon.jsx` copié dans les composants (types dans `BattlerIcon.d.ts`), et des composants fins qui ne posent que ses classes (`src/components/kit.tsx` : `Button`, `IconButton`, `ModePair`, `SegmentedControl`, `Tool`, `BackLink`, `Glyph`).
- Page de développement `?kit` (serveur de dev seulement, `src/dev/KitReference.tsx`) : les composants disposés comme `reference.html`. Capturée à 1440 px dans Firefox, elle est identique à `reference.html` rendue par Firefox (aucun pixel ne diffère de plus de 1 %).

### Modifié
- **Tous les contrôles passent au kit**, écran par écran : accueil (paire de modes Duel | Tournoi, boutons ronds), sélection, présentation et configuration du tournoi, arbre, affrontement, guichet des paris, combat (barre de lecture), fin de combat, récompense, champion, statistiques, compendium, boutons du son. Un seul primaire XL (72 px) par écran, secondaires de 52 px, petits de 40 px, boutons icône de 48 et 44 px.
- **Glyphes de commande au lieu des icônes peintes** dans les commandes (épées, trophée, dé, éclair, ticket, parchemin, barres, son, musique) : les images peintes restent au contenu et aucun fichier n'est supprimé. Les pastilles « Simulé », « Vainqueur » et joué ou simulé de l'arbre et du champion prennent aussi leur glyphe.
- Son et musique coupés : glyphe barré et couleur atténuée (`aria-pressed="false"`), au lieu d'une barre rouge peinte ; le bouton de la musique passe à 48 px.
- Un seul style de retour (`.bt-back`) : « ← Menu », « ← Retour », « ← Retour à la sélection », « ← Combat », et « Menu » des écrans de fin et du champion. L'affrontement garde un secondaire : « Changer » (duel) ou « Arbre » (tournoi).
- Barre de lecture du combat : Pause (ou Reprendre, en or), vitesses ×1 ×2 ×4 en sélecteur segmenté, outil Journal avec un **point or** quand des lignes arrivent, au lieu du compteur chiffré. En-tête du journal : « Copier la trace » et Fermer en boutons icône.
- Onglets mineurs (`.bt-tabs`) sans icône, compteur en `.bt-count` (compendium, fiche, statistiques, écran de fin).

### Retiré
- `PrestigeButton` et les styles devenus inutiles : `.prestige*`, `.btn-md`, `.btn-lg`, `.btn-round`, `.btn-icon`, `.btn-tertiary`, onglets `.tabs`, `.tab`, `.tabs-minor`, `.tab-minor`, `.mode-rail` et ses plaques, `.hud` et `.hud-count`. Restent `.btn .btn-sm` (combat test, hors kit) et les `.hud-btn` du magnétoscope, en attendant sa refonte.

## [0.82.0] — 2026-10-21

### Ajouté
- **Magnétoscope de combat** (serveur de dev seulement, `docs/MOTEUR_V2.md` § 8), pour régler le rythme des combats. On l'ouvre avec la touche V en combat ou `battler.vcr()` en console, et il reste ouvert d'un combat à l'autre.
  - Commandes : pause, pas à pas d'un instant à l'autre (→), moment suivant (Maj+→), moment précédent (←), retour au début du moment, ralenti ×0,25 et ×0,5, et un curseur pour glisser dans le moment.
  - La barre du moment montre ses temps à l'échelle, chacun avec le nom de sa constante de `timing.ts` et sa durée (« WIND 300 ms »), le temps en cours en or, et les sons et changements d'écran à leur instant.
  - En reculant, l'écran est recalculé à partir de la mise en scène et les animations se placent à leur vrai instant, sans aucun son. Aucune dépendance nouvelle.
- Mise en scène : chaque moment liste ses temps (`Moment.spans`), chacun avec le nom de sa constante (`hold('WIND')`). Un test vérifie qu'ils couvrent exactement la durée de chaque moment.

### Corrigé
- Un signal d'activation pouvait laisser une clé React en double après un retour en arrière (`SignalLayer`).

## [0.81.1] — 2026-10-21 (branche `moteur-v2`)

### Ajouté
- **Revoir un combat à l'écran** : en console, `battler.play(graine)` fait jouer le prochain combat (Jouer, Simuler ou match de tournoi) avec cette graine, une seule fois ; `battler.play(null)` l'annule. On choisit les combattants à l'écran, dans l'ordre (gauche, droite) de la graine notée. Cela permet de regarder une situation repérée en simulation, par exemple `battler.play(5)` avec Naraxes à gauche et Aldric à droite : au tour 8, une Riposte s'intercale entre le coup et le poison de la décoction.

## [0.81.0] — 2026-10-21 (branche `moteur-v2`)

Refonte du passage du moteur à l'écran, d'après l'audit du 2026-10-21 (`docs/MOTEUR_V2.md`). Les règles sont inchangées et l'empreinte de non-régression est identique. L'état d'avant est le tag `avant-moteur-v2`.

### Ajouté
- **Étapes du moteur avec leur cause** : chaque étape (`Beat`) porte `id`, `cause` (l'étape qui l'a provoquée), `phase` et `owner` (à qui est le tour). Un coup dit quel statut a imposé l'esquive ou le critique (`dodgeBy`, `critBy`), et ses boucliers sont listés dans l'ordre. Contrôles `cause : …` dans l'audit.
- **Mise en scène pure** (`src/game/staging.ts`) : `stage()` transforme un combat en moments, chacun une liste de cues datées (dés, coup, textes flottants, labels, sons, PV, zone d'état, journal…), regroupées par cause et non plus par voisinage. 18 tests sans navigateur (`staging.test.ts`).
- **Table des durées** (`src/game/timing.ts`) : chaque temps du rythme a un nom. Les durées CSS liées au rythme en dérivent (`--t-*`).

### Modifié
- **`useCombat` devient un lecteur** : une horloge unique (vitesse, pause, arrêt) applique les cues. Il remplace environ 950 lignes de script impératif et supprime `flowAt`, `rideAt`, `anticipate`, `grouped`, `ownerOf` et les fonctions `play*`.
- **Rendu** (détail dans `docs/MOTEUR_V2.md` § 7) :
  - les textes flottants ne s'écrasent plus ;
  - la plaie qui coule et les statuts posés par un coup tombent toujours à son impact, même quand une Riposte s'intercale ;
  - un seul son par nom et par instant ;
  - la pause fige aussi la secousse et les textes ;
  - le rythme est exact et ne dépend plus de la cadence d'affichage.

## [0.80.2] — 2026-10-21

### Modifié
- **Retombée en douceur d'un sceau déclenché** (demande de l'utilisateur) : le pic reste aussi vif, puis le sceau reste allumé un temps et s'éteint lentement, sur environ 2,6 s à ×1 ; son nom suit. Le spectateur voit ce qui vient de se déclencher (« je viens de me déclencher, je retombe jusqu'au prochain »). L'animation rejoint l'état de repos du sceau : éteint pour une compétence, allumé pour une aura active.

### Corrigé
- Un sceau en plein éclat était coupé net quand une autre compétence du même camp se déclenchait juste après (la barre ne retenait que la dernière face sortie) : chaque sceau garde son dernier déclenchement et va au bout de son animation.

## [0.80.1] — 2026-10-21

### Modifié
- **Barre de compétences en combat** (demande de l'utilisateur) : au repos, les sceaux, les auras inactives et leurs noms sont bien plus discrets (presque gris, sombres, à demi effacés), pour qu'une compétence activée ou une aura active se distingue nettement.
- **Tintement visuel au déclenchement** : quand une face sort, un éclat de lumière part du sceau de la compétence (ou de l'anneau de l'aura) et s'étend vite sur une grande partie de l'arène (≈ 0,5 s à ×1, en mode « screen »), suivi d'un anneau fin qui file plus loin encore ; le nom de la compétence s'éclaire un instant. Dans la couleur de la nature de la compétence ou de l'aura. Suit la vitesse et la pause.

## [0.80.0] — 2026-10-21

La zone de surcharge, et le sens des textes flottants (décisions de l'utilisateur).

### Modifié
- **Zone de surcharge** (la colonne de labels sous le dé, `docs/RESOLUTION.md` § 11) : elle montre ce qui change le coup en cours au-delà de sa règle de base, au moment où ça s'applique, dans l'ordre du livre de règles, et se vide à l'étape suivante. **Point de vue de l'attaquant** : + quand ça amplifie son action (critique, bonus de relique, Saignement qui coule, Vol de vie), − quand ça la réduit ou la contre (esquive assurée, bouclier, Fausse note, Riposte, Épines). **Couleur selon la source** (Coup, Compétence ou statut, Relique), le − hachuré ; le + sonne le ding, le − Malus reçu. Registre `specials.ts` refait (`SPECIAL_SOURCES`, `SPECIAL_SIGNS`, `isSurcharge`, `attackSpecials`) ; `SPECIAL_KINDS` retiré.
- Sortent de la colonne, parce que leur sceau dit déjà qu'elles se déclenchent : Pile ou face, Furie des vents (et son « ×2 »), Coup de chance, Rétribution, doubles de la barde. Les auras permanentes n'y entrent jamais. Les reliques qui se déclenchent gardent leur label (elles n'ont pas de sceau dans la barre). Entrent : Esquive assurée, Armure temporaire (Peau de pierre) qui absorbe, Fausse note, Luciole.
- **Sens des textes flottants** : il dit le gain ou la perte de la chose nommée, plus le bon ou le mauvais. Un statut gagné monte, même un malus (« Peur » posée sur Naraxes) ; un statut perdu (dissipé, purifié) tombe ; les PV perdus tombent, les PV regagnés montent ; le critique monte toujours. Avec l'impact d'un coup, un texte qui monte (Poison de l'Aura de décoction) part au-dessus du chiffre des dégâts au lieu de le croiser.
- **Tour perdu** : « Tour perdu » (fuchsia, qui tombe) remplace le nom « Peur », qui réapparaissait et se lisait comme une nouvelle Peur.

### Retiré
- La variation flottante (« +2 », « −1 ») qui partait du compteur des médaillons de la zone d'état ; le chiffre défile toujours.

## [0.79.7] — 2026-10-21

### Modifié
- **Une aura sur son porteur se lit sur son anneau, plus dans la zone d'état** (proposition validée par l'utilisateur) : une aura qui agit sur son porteur est une modification permanente, de l'identité, et elle doublait son propre anneau. Aura de puissance, Aura sauvage, Aura mélodieuse, Aura de précision, Aura de sainteté et Aura d'immunité ne mettent plus de Puissance, de Critique renforcé, de Soin ni d'Immunité dans la zone d'état. Leur anneau, dans la barre de compétences, affiche la valeur de leur effet (« +4 ») au lieu de leurs charges. La règle de forme du druide affiche la sienne (Force de l'ours « +3 », Incantation « d3 »). La zone d'état ne garde que ce qui arrive au personnage ; les seuls effets d'aura qui y restent sont les malus mis chez l'adversaire (Affaibli de l'intimidation, Poison de l'Aura glaciale ou de l'Aura de décoction).
- Une aura posée sur soi n'envoie plus de signal : son anneau s'allume, là où le spectateur la voit s'activer.

### Retiré
- L'anneau tournoyant sur un état donné par une aura (0.79.4) : il n'y a plus rien à relier.

## [0.79.6] — 2026-10-21

### Modifié
- **Anneau de l'aura : pour les bonus seulement** (décision de l'utilisateur) : un malus mis par une aura chez l'adversaire (l'Affaibli de l'Aura d'intimidation, le Poison de l'Aura glaciale ou de l'Aura de décoction) ne porte plus l'anneau tournoyant ; il est suivi comme tout autre malus. Seuls les bonus qu'une aura donne à son porteur le gardent (Puissance, Critique renforcé, Soin, Immunité).

## [0.79.5] — 2026-10-21

Retours de l'utilisateur sur les textes flottants, la synchronisation et les infobulles.

### Modifié
- **Plus de nom de compétence flottant au-dessus du lanceur** : son sceau, dans la barre de compétences, s'allume déjà quand elle part ; un coup spécial a en plus son label sous le dé. De même, une aura qui agit (Aura glaciale) n'écrit plus son nom (son anneau s'allume et envoie le signal), et un statut qui réagit avec un label (Riposte, Épines, Vol de vie) ne l'écrit plus au-dessus de son porteur. Un coup transformé ne garde que son label.
- **Purge à vide** : « Rien à purifier » au lieu de « Purifié », qui laissait croire qu'un malus était parti. Ce texte ne s'affiche que si la compétence n'a rien fait d'autre, une seule fois : la Purification d'Ysolde sans bonus adverse ni malus à soi montre « Rien à purifier », puis la lumière frappe ; l'Aura d'immunité sans malus à retirer n'affiche plus rien de plus (`quietPurges`).
- **Pourfendre** (Gorak) : le Saignement tombe à l'impact du coup qui touche, au lieu d'une étape à part après lui (comme le poison de l'Aura de décoction en 0.78.0) ; sauf si une Riposte s'intercale.
- **Infobulles des compétences** : un statut posé sur l'adversaire est annoncé « Sur l'adversaire : … » (« Perd 3 PV au début de son prochain tour » se lisait comme une perte du lanceur : Souffle de la tombe, Feux follets, Pourfendre, Peur, Fausse note). La relâche de Rétribution dit aussi qu'elle frappe l'adversaire. Peur : « Perd sa prochaine action, terrifié ». Règle tenue par un test : tout effet subi par l'adversaire le nomme dans le texte de la compétence.

## [0.79.4] — 2026-10-21

### Ajouté
- **Lien entre une aura et l'état qu'elle donne** (demande de l'utilisateur) : un état de la zone d'état donné par une aura active porte le même anneau tournoyant que l'aura, à sa couleur (`.state-aura`, `TrayState.aura`). Bonus ou malus : la Puissance de l'Aura de puissance, le Critique renforcé de l'Aura de précision, l'Affaibli que l'Aura d'intimidation met chez l'adversaire, le Poison de l'Aura glaciale ou de l'Aura de décoction chez l'adversaire. Pour un statut posé par une aura, le lien est possible plutôt que prouvé : le Poison d'Elaria tourne à la couleur de l'Aura glaciale d'Ervald même s'il vient en partie du Souffle de la tombe. Test dans `states.test.ts`.

## [0.79.3] — 2026-10-21

### Modifié
- **Emblèmes d'état plus petits** (demande de l'utilisateur) : 48 px au lieu de 64, compteur et variation flottante réduits d'autant.
- **Teinte légère selon la polarité** : la pièce monochrome prend un reflet vert pour un bonus, rouge pour un malus (`.state-tint`, mode de fusion « couleur » à 30 %, sans filtre). Un état sans nombre (Immunité, Tour perdu) dit de nouveau sa polarité.

## [0.79.2] — 2026-10-21

### Ajouté
- **Emblèmes d'état** (planche v12, 16 icônes `state-*.png`) : chaque état de la zone d'état a sa pièce gravée, monochrome, au symbole commun à tous (Puissance, Affaibli, Bouclier, Critique assuré, Critique renforcé, Esquive assurée, Dé en plus, Soin, Drain, Renvoi, Épines, Immunité, Poison, Saignement, Brûlure, Tour perdu). Une compétence et l'état qu'elle pose ne montrent plus la même image (Œil de faucon et Critique assuré).
- `scripts/slice-coins.py` : découpe d'une planche de pièces sur fond noir uni ou transparent, chaque pièce trouvée comme un disque, découpée en rond et mise à la même taille.

### Modifié
- **Zone d'état sans cadre** : l'emblème est posé tel quel, sans cerclage vert ou rouge ni fond ; le compteur se pose dessus. La polarité se lit au compteur (vert ou rouge) et à la rangée (bonus à gauche, malus à droite). Le bord en pointillés des dégâts périodiques (0.52.1) disparaît avec le cerclage.
- Une compétence qui pose une aura en faisant autre chose au passage se fond aussi dans l'anneau de l'aura : l'Aura d'immunité d'Aldric (qui purge d'abord ses malus) apparaissait deux fois dans sa barre. L'infobulle de l'anneau dit ce qu'elle fait d'autre.
- `docs/STYLE_BIBLE.md` § 7 : la grammaire des emblèmes d'état (« monochrome », « carved on a coin », pas de cadre, même taille) et son prompt.

## [0.79.1] — 2026-10-21

### Modifié
- **Barre de compétences sortie de l'en-tête** (demande de l'utilisateur) : elle est posée juste dessous, au bord de l'arène, au-dessus du camp de chacun, sur un voile sombre qui la détache du décor. Plus grande : sceaux et auras de 56 px au lieu de 40, pastille du dé de 28 px, compteurs agrandis. **Le nom de chaque compétence et de chaque aura** est écrit sous son sceau (doré quand l'aura est active). Les sceaux sont moins éteints au repos, pour rester lisibles ; ils s'allument toujours quand leur face sort. Hors de l'arène qui tremble, la barre reste immobile pendant les gros coups.

## [0.79.0] — 2026-10-21

Deux niveaux de lecture en combat (demande de l'utilisateur) : ce que le personnage **sait faire** dans l'en-tête, ce qu'il **subit ou porte** dans la zone d'état. Constat de départ : 25 des 26 statuts posés par une compétence venaient d'une seule compétence, et 27 compétences sur 28 montraient l'icône de leur statut (Œil de faucon et Critique assuré). Aucune règle de combat ne change.

### Ajouté
- **États affichés** (`src/game/states.ts`) : un vocabulaire d'états génériques (Puissance, Affaibli, Bouclier, Critique assuré, Critique renforcé, Esquive assurée, Dé en plus, Soin, Drain, Renvoi, Épines, Immunité, Poison, Saignement, Brûlure, Tour perdu…) et la place de chaque statut (`STATUS_PLACE` : zone d'état, aura, forme ou mécanisme de compétence). Les statuts de même effet se **regroupent** en un médaillon au total signé (Aura sauvage et Force de l'ours : « Puissance +7 ») ; une aura qui agit sur l'adversaire y **relaie** son effet (Aura d'intimidation : « Affaibli −2 » chez lui). Infobulle : chaque part, son effet, et d'où elle vient (`originsOf`).
- **Barre de compétences de l'en-tête** (`SkillBar.tsx`, à la place des dés de compétence) : un sceau octogonal par compétence, face du dé en pastille, éteint au repos et allumé quand sa face sort ; les auras à la suite, au médaillon rond dont l'anneau tourne quand elle est active (charges en pastille) ; les règles de forme du druide ; les jauges de Rétribution sur son sceau.
- **Signal d'activation** (`SignalLayer.tsx`, `SkillSignal`) : une lueur file du sceau de la compétence ou de l'anneau de l'aura vers la zone d'état de la cible, et l'état y apparaît à son arrivée (340 ms à ×1, `SIGNAL_MS`), calée sur l'étape de la chronologie qui le pose.
- Tests : `states.test.ts` (places, regroupement, relais, origines, cibles du signal, chronologie entière lisible) et rendus de la zone et de l'en-tête dans `screens.test.tsx`.

### Modifié
- **Zone d'état** : réservée aux états génériques. Les auras, les règles de forme et les mécanismes de compétence (Pile ou face, Furie des vents, Attente, jauges de Rétribution) n'y sont plus.
- Infobulle d'une compétence : elle liste les **états** qu'elle fait apparaître et chez qui (l'Aura glaciale : Poison, adversaire), au lieu de ses statuts internes.
- Feux follets montre ses lucioles (`fireflies`) et non plus l'icône de la Brûlure qu'il pose.
- Icônes des états **provisoires** (`STATE_ICON`) : celles des statuts qui les alimentent, en attendant la planche des emblèmes d'état (16 icônes, prompt dans `docs/STYLE_BIBLE.md` § 7).

## [0.78.0] — 2026-10-21

Lot de retours de l'utilisateur sur les compétences, les labels, les sons et les écrans du tournoi.

### Ajouté
- **Labels des reliques** : une relique qui agit pose son label sous le dé, avec son icône, à l'instant où son bonus s'applique (« Fer à quatre clous +4 » quand le dé montre le 4) ; son sceau s'illumine au même instant (option `onShow` de `showEffects`).
- **Un son par label** (`docs/SONS.md` § 4.4) : un label positif joue le ding de la pièce, un label négatif Malus reçu ; un seul son par polarité quand des labels tombent ensemble, et rien en plus quand le label a déjà son propre son.
- **Tournoi sans reliques** : interrupteur **Reliques** sur l'écran de configuration du tournoi ; désactivé, personne ne gagne ni ne porte de relique, et l'arbre, l'écran de victoire et le sacre n'en montrent aucune. Le choix est gardé pour le tournoi suivant de la session ; l'historique (`battler:history:v1`) ne change pas.
- Contrôles d'audit : pièce lancée aussitôt ou gardée, une charge par esquive imposée, relique de seuil sans limite. Série 13 du laboratoire (valeur de pile).

### Modifié
- **Pile ou face** (Naraxes) : la pièce part aussitôt, juste après le 2 qui la déclenche, au lieu de remplacer l'action suivante. **Pile vaut 10 dégâts au lieu de 20** (choix de l'utilisateur, `COIN_HEADS`) : sans compensation, Naraxes montait à 61,6 % et Ysolde tombait à 25 % contre lui. Naraxes **53,9 %**, son duel le plus net 64,5 % contre Ysolde.
- **Esquive améliorée** (Elaria, relique Dé creux) se cumule : chaque charge esquive à coup sûr un coup reçu. Elaria 47,3 %.
- **Labels : une couleur par type** (registre unique `SPECIAL_KINDS`, `src/game/specials.ts`) : Coup (ambre : critiques, coups transformés), Bonus (vert : Furie des vents, Pile ou face, Riposte, Vol de vie, Épines, Rétribution), Malus (rouge sang : Saignement), Relique (plaque sombre au liseré d'or). Le type se déduit de la mécanique ; `SpecialTone` devient `SpecialKind`. Le rose propre à la barde et le violet du Vol de vie disparaissent. Les labels s'empilent en colonne, droits et de même largeur (`SpecialLabel.tsx`).
- **Coup + poison ensemble** : le poison de l'Aura de décoction tombe à l'impact du coup qui le pose (frappe + poison, frappe + poison), au lieu d'une étape à part après chaque coup.
- Écran du champion : « Dégâts infligés » compte aussi les dégâts hors coups (Foudre, poison, saignement, brûlure, riposte, reliques), comme « Dégâts encaissés » ; la case donne la part hors coups.
- **Empreinte de non-régression** (`balance.test.ts`) mise à jour : changements voulus (pièce, pile, esquive, Dent de loup).

### Corrigé
- **Charges au maximum** : une compétence cumulable reposée à son plafond (Aura de sainteté à 3…) n'affiche plus que le texte neutre « … au maximum », sans titre de compétence, aura, label ni son.
- **Dent de loup** ne se déclenche qu'une fois par combat (`charges: 1`) : un soin la réarmait à chaque remontée au-dessus de son seuil (vu dans un combat de l'utilisateur, Aldric contre Morgrut).
- **Foudre** : les trois « -2 » s'affichent ; chaque chiffre était remplacé aussitôt par l'élan de l'éclair suivant.
- **L'ours du druide à droite** n'est plus coupé à l'avant : Firefox coupait, du mauvais côté du bord de l'écran, une image retournée portant un filtre. Le filtre passe sur une enveloppe à la taille de l'image, le retournement sur l'image (`docs/POSTURES.md`).
- **Un combattant vaincu perd son aura** : halo, cercle, particules et contour s'éteignent en fondu au K.O.
- **Infobulles des reliques** dans l'arbre du tournoi : survoler un combattant ouvrait toutes ses infobulles l'une sur l'autre (`group-hover` sans nom) ; seule celle du sceau survolé s'ouvre, et elle change de côté près du bord de la scène.
- **Écran du champion** : « Dégâts infligés » et « Dégâts encaissés » affichaient la même valeur (167) par coïncidence : les infligés oubliaient les dégâts hors coups (237 en vrai).

## [0.77.1] — 2026-10-20

Les 22 icônes en attente, générées par l'utilisateur en trois planches (une par type) et intégrées.

### Ajouté
- **Planche v9, druide** : `thunderbolt` (Foudre), `casting` (Incantation), `bear-might` (Force de l'ours), `burn` (Brûlure ; Feux follets la montre aussi). Fin des icônes provisoires `lightning`, `life-bloom`, `claw` et `fireflies` pour ces quatre-là ; `SKILL_ICON.thunderbolt` retiré, la Foudre trouve son icône par son id.
- **Planche v10, reliques** : les douze icônes (`lead-pommel` … `hunter-trophy`), dans le sceau hexagonal à la place de l'initiale gravée. Aucune ligne de code : `RelicIcon` prend le fichier qui porte l'id.
- **Planche v11, interface** : `music-on` et `music-off` (tambour et baguettes, barré de rouge) remplacent la note vectorielle du bouton de la musique (`MusicGlyph` retiré) ; paris : `purse` (en-tête des plateaux, classement de fin), `bet-token` (devant « Combien ? »), `twist` (bandeau du coup de théâtre, à la place de `coin-flip`), `ticket` (bouton « Parier » de l'affrontement, à la place de `coin-pile`).

### Modifié
- `docs/STYLE_BIBLE.md` § 7 : « Icônes à générer » devient la **liste unique de toutes les icônes en attente**, tous chantiers confondus, une planche par type (chaque type a sa grammaire) ; vide après cette livraison. Restent connus, pas encore à générer : les statuts hors jeu, les sceaux peints A-01, les icônes de commande N-01. Inventaire porté à 75 icônes, historique v9 à v11. Mentions périmées corrigées (Aura glaciale et Saignement ont leur icône depuis la v8) dans `ETAT.md`, `STATUTS.md`, `SYSTEMES.md` ; `TODO.md`, `PARIS.md`, `SONS.md`, `RELIQUES.md` à jour.

## [0.77.0] — 2026-10-20

Les douze premières reliques, trois par type : celles de l'exploration de l'autre agent, revues par l'utilisateur, dont le concept visuel est retenu (demande de l'utilisateur : « se fier au travail d'exploration de l'autre agent, quant à leur nombre et description »).

### Ajouté
- **Douze reliques** (`relics.ts`) : Contrepoids de plomb, Bottes de feutre, Cotte du mercenaire (Caractéristique) ; Osselet fendu, Dé creux, Fer à quatre clous (Coup) ; Cloche d'ouverture, Chapelet de l'ermite, Clepsydre du siège (Tour) ; Dent de loup, Collier de ronces, Trophée du chasseur (Seuil). Mesurées (`npm run relics`, 400 combats par duel) de +6,1 à +21,4 points ; Fanchon la plus avantagée par les reliques de coup (jusqu'à +25,9). Réglages proposés, non appliqués : `docs/RELIQUES.md` § 7.
- **Moteur** : bonus de coup limité à une face (`onFace`, Fer à quatre clous : sur un 4, le coup de ce dé) ; seuil sur les PV de l'adversaire (`hpBelow` avec `who: 'opponent'`, Trophée du chasseur), l'effet restant sur le porteur ; tout soin réarme aussitôt les reliques de seuil qui lisent ces PV (`rearmThresholds` : un vol de vie suivi d'une Riposte sur le même coup ne fait plus manquer un passage sous le seuil). Contrôles d'audit (bonus de face, seuil adverse) et tests (face, seuil adverse, deux dés lus un par un, stat négative).
- **Règle 7 vérifiée** : `validateRelics` refuse une relique qui pose un malus, ou qui vise l'adversaire avec autre chose que des dégâts directs (décision de l'utilisateur).
- **Planche des douze icônes** : prompt complet (grille 4 × 4, grammaire d'illustration des reliques) et commande de découpe, `docs/RELIQUES.md` § 10.

### Modifié
- **Une relique s'annonce sur son sceau** (concept de l'autre agent) : quand elle agit, son sceau s'illumine dans l'en-tête et l'effet arrive sur sa cible, sans nom flottant ni aura sur le porteur ; ses dégâts directs partent sans élan.
- Une relique de tour à une seule charge se décrit sans « puis à chacun de ses tours » (Cloche d'ouverture).
- **`docs/RELIQUES.md` réunit tout** : la proposition `docs/RELIQUES_IDEES.md` (douze reliques, ce qui sépare une relique d'une compétence, grammaire d'illustration, chiffre de la règle lisible dans l'objet) y est fusionnée, puis retirée ; liens mis à jour (README, CLAUDE.md, STYLE_BIBLE, SONS, TODO).

### Retiré
- **Série de test de la 0.75.0** (Brassard de fer, Pierre à aiguiser, Chandelle des heures, Fiole du dernier souffle), remplacée par les douze.

## [0.76.0] — 2026-10-20

La Foudre du druide tombe en trois éclairs (demande de l'utilisateur : « 3 éclairs qui tombent à la suite à des endroits un peu différents, 2 chacun, impossible de critiquer »).

### Ajouté
- **Dégâts directs en plusieurs coups** (moteur, `hits` d'un effet `damage`) : `hits` coups de `amount` chacun, comptés ensemble (le détail dans `parts`, comme une relâche). Dégâts directs, donc jamais critiques, sans armure ni esquive. Validation (`hits` entier ≥ 2), contrôle d'audit « coups multiples », test dans `combat.test.ts`.
- **Événement de scène à plusieurs impacts** (`SceneTiming.impacts` remplace `impact`) : chaque coup tombe sur son impact. La Foudre : l'arène s'assombrit, trois éclairs tombent l'un après l'autre (à 440, 800 et 1 160 ms) à trois endroits autour de la cible, chacun avec son éclat de lumière, son tonnerre et son « 2 ». Les trois chiffres sont égaux, aucun n'est doré : rien ne ressemble à un critique. Vu en trois captures (une par éclair).

### Modifié
- **Foudre** : 5 dégâts → **3 × 2** (6). **Compensation : Force de l'ours +4 → +3.** Sans elle, Thaldrin montait à 58,0 % et Brokk tombait à 31,5 % contre lui (au-delà de 65/35). Avec : Thaldrin 54,0 → **49,8 %**, 17,4 tours, 10,1 dégâts par coup (toujours le plus haut du roster) ; ses duels de 38 à 62 % (Brokk à 38,5 %). Valeurs nettes : Foudre +15,6, Feux follets +11,6, Aura sauvage +5,5 points (400 combats par duel).
- **Empreinte de non-régression** (`balance.test.ts`) mise à jour : changement voulu.
- `docs/STYLE_BIBLE.md` § 7 : les icônes à peindre sont consignées dans une liste « Icônes à générer » (besoin, type, motif, icône provisoire), pour une génération d'un seul coup ; la planche v9 préparée à part est abandonnée.

## [0.75.0] — 2026-10-20

Les reliques : des objets gagnés en tournoi, un par victoire, qui changent le profil d'un combattant (demande de l'utilisateur, `docs/RELIQUES.md`).

### Ajouté
- **Moteur des reliques** (`relics.ts`, `combat.ts`) : quatre types déduits de la définition. **Caractéristique** (stats ajoutées à plat ; `Character.stats` les inclut, `baseStats` garde la base), **Coup** (bonus à la valeur de chaque coup qui touche, avant le critique, sans changer le jet ; ou effet sur un moment du coup), **Tour** (au début de son n-ième tour, puis tous les `cooldown` tours), **Seuil** (quand ses PV passent sous une part de ses PV max ; se réarme au-dessus). Charges, recharge et conditions ; aucun tirage. Nouvelle étape de chronologie `relic`, bonus noté sur le coup (`Attack.relicBonus`). Dans une fenêtre, les reliques agissent après les compétences ; les seuils après la mi-PV (`checkThresholds`). Règles écrites dans `RESOLUTION.md` (§ 3, étape 2 bis ; § 5).
- **Série de test, une relique par type** : Brassard de fer (+1 armure), Pierre à aiguiser (+1 à chaque coup), Chandelle des heures (3e tour puis tous les 3 tours : Armure temporaire 3), Fiole du dernier souffle (sous 30 % : +10 PV, une fois). Mesurées de +11,9 à +16,4 points (400 combats par duel).
- **Tournoi** : chaque victoire hors finale rapporte une relique, choisie parmi trois que le vainqueur n'a pas, au hasard (`withResult`, `MatchResult.relic`) ; il la porte aux matchs suivants (`matchFighters`, `relicsOf`), trois au plus. Les cotes des paris en tiennent compte.
- **Écran de victoire : Récompense.** En tournoi, le bouton principal ouvre un menu superposé de trois grandes cartes ; la carte du vainqueur porte « Choix de… », l'observateur peut en imposer une autre (`chooseRelic`), puis retour à l'arbre. Un match simulé depuis l'arbre garde le choix du vainqueur.
- **Reliques à l'écran** : sceaux hexagonaux à côté du nom en combat (infobulle, charges restantes, sceau éteint une fois dépensé, éclat quand la relique agit, nom flottant et effets comme une compétence, ligne dorée au journal) ; sous les dés à l'écran d'affrontement (la stat changée par une relique passe en or) ; dans l'arbre, à côté du nom, celles portées pour chaque match ; sous le nom du champion.
- **Identité visuelle** : le sceau hexagonal biseauté (`RelicSeal`, `.relic-seal`), cadre d'or, jour sombre, plaque de cuir, biseau ; l'initiale gravée en or tant que l'icône peinte manque. L'hexagone n'appartient qu'aux reliques (l'octogone est aux compétences, le rond aux statuts). Le compendium passe du sceau rond à l'hexagone.
- **Mesure** : `npm run relics` (`scripts/relics.report.ts`), apport de chaque relique pour chaque personnage, sur les mêmes graines avec et sans ; rapport dans `logs/relics/`.
- **Trace** : en-tête des reliques de chaque camp, relu par `npm run logs` (`parseRelics`) pour rejouer les combats de tournoi ; chaque déclenchement et chaque bonus de coup. `battler.replay(graine, a, b, reliquesA, reliquesB)`.
- **Audit** : `auditRelics` recompte stats, charges, recharge, tours prévus, passages sous le seuil et moments du coup ; l'audit du roster joue aussi des combats avec reliques.
- `docs/RELIQUES.md` : décisions, règles, tournoi, interface, identité visuelle, catalogue et mesures, marche à suivre, prompt de la planche d'icônes des quatre reliques.

### Modifié
- **Arbre du tournoi** : colonnes des tours 2 et 3 élargies de 168 à 184 px, pour les reliques à côté du nom.
- `checkBloodied` devient `checkThresholds` (mi-PV, puis seuils des reliques) ; `beatEffects` lit les effets de toute étape (statistiques, audit). Aucun changement pour un combat sans relique : l'empreinte de non-régression est inchangée.

## [0.74.0] — 2026-10-20

### Ajouté
- **Compendium : section Reliques**, entre Statuts et Règles, pour les reliques en cours d'implémentation (`relics.ts`). Même disposition que les Statuts : index groupé par type (Caractéristique, Coup, Tour, Seuil) avec un filtre par type, détail à droite (quand, effet, statut posé en lien, type, obtention). Le texte vient de `describeRelic`. Sceau liseré d'or ; sans icône peinte, l'initiale de la relique (`RelicIcon` prendra l'icône `src/assets/icons/<id>.png` dès qu'elle existe).

### Modifié
- **Combattants : le personnage passe en fond** de tout l'écran du compendium, en grand, au lieu d'être coupé par sa colonne (l'orc, l'ogre). L'index et la fiche, encadrés, passent devant lui ; il s'efface sur les côtés, dans le sol et derrière le titre et les onglets. Les tailles relatives des combattants sont gardées.
- **La fiche est dans un cadre** comme l'index : elle défile à l'intérieur, et le bas du cadre reste visible (Elaria, Thaldrin). Les sceaux des compétences et les pastilles de statut ne touchent plus le bord du cadre.

## [0.73.0] — 2026-10-20

Le druide refondu : un tour sur deux, l'homme lance la foudre ou le feu ; l'autre tour, la bête frappe (proposition de `docs/SORTS.md` § 18, choix de l'utilisateur : Foudre 5, aura sauvage pour l'ours seul, pas de Saignement, de gros coups).

### Ajouté
- **Statuts de forme** (moteur, `innate`, `CharacterForm.statuses`) : posés quand le personnage prend une forme, retirés quand il la quitte ; aucune purge ne les enlève, aucune immunité ne les bloque. Visibles dans la zone d'état, sans nombre. Contrôle dans l'audit (statuts de forme exacts à chaque étape, purges qui les ignorent), validation dans `validateRoster`, tests dans `combat.test.ts`.
- **Incantation** (statut de forme de l'homme) : son dé devient un d3, chaque jet lance un sort. **Force de l'ours** (statut de forme de l'ours) : chaque coup fait +4, un 1, un 2 ou un 3 compris (l'ours n'a plus aucun sort).
- **Foudre** (homme, sur un 1) : 5 dégâts directs. **Aura sauvage** (homme, sur un 3, cumulable) : +2 par charge aux coups, donc à ceux de l'ours.
- **Événements de scène** (`scenes.ts`, `SceneEvent.tsx`, `CharacterEvent.scene`) : un gabarit pour les sorts et coups spéciaux à grand spectacle, présentation seulement. Le premier : la Foudre assombrit l'arène, un éclair (tracé SVG, branches, halo) tombe sur l'adversaire, l'arène blanchit un instant, et les dégâts s'affichent à l'impact. Il suit la vitesse et la pause du combat.

### Modifié
- **Thaldrin** : Feux follets (Brûlure 3) passe sur le 2 de l'homme ; fiche réécrite (plus soigneur : aucun soin ni armure ; l'homme ne frappe jamais).
- **Équilibre** (400 combats par duel) : Thaldrin 50,7 → **54,0 %**, ses combats de 20,0 à **17,0 tours**, **11,1 dégâts par coup** (le plus haut du roster). Ses duels de 48 à 65 % (Brokk à 35,3 %, sous le plafond). Valeurs nettes : Foudre +10,8, Feux follets +10,3, Aura sauvage +4,7 points. La Force de l'ours à +3 donnait 45,9 % sans Saignement : passée à +4 (« de gros coups »).
- **Empreinte de non-régression** (`balance.test.ts`) mise à jour : changement voulu.
- Icônes provisoires : Foudre (l'éclair `lightning`), Incantation (`life-bloom`), Force de l'ours (`claw`), Aura sauvage (`grudge-aura`, l'empreinte d'ours de la planche v8).
- Son (déduit des effets, non vérifiable à l'oreille) : la Foudre tombe avec le son du critique ; l'Aura sauvage joue Aura gagnée, les Feux follets Malus reçu.

### Retiré
- Fleur de vie, Écorce épaisse, Charge, Coup de griffe, le relais des formes (Rancune, Sève) et ses deux auras (statuts `grudge`, `sap`, `grudgeAura`, `sapAura`), et `bonusPer` (moteur, audit, catalogue), qui ne servait qu'au relais. Les icônes `grudge`, `sap` et `sap-aura` restent dans `src/assets/icons`, sans usage.

## [0.72.0] — 2026-10-20

### Ajouté
- **Compendium réorganisé : une donnée, une maison.** Quatre sections, chacune avec son propre filtre en haut à droite : **Combattants** (index compact et fiche), **Compétences** (index dense par race, filtre par nature), **Statuts** (bonus et malus réunis, filtre Tous / Bonus / Malus, détail à droite) et **Règles** (nouvelle). Les liens vont dans les deux sens : compétence → statut posé → compétences qui le posent → porteurs → fiche ; une pastille de compétence (« coup sacrifié », « s'il touche », condition…) mène à sa règle.
- **Section Règles** (`src/game/rules.ts`) : les règles communes (tour, dés, esquive, critique, armure et dégâts, déclenchement des compétences, durée, charges et cumul des statuts) écrites une seule fois, regroupées depuis `FEATURES.md`, `statuses.ts` et `events.ts` sans être réécrites. Les cartes ne les répètent plus.
- **Statuts** : fiche détaillée avec Effet, Consommation, Cumul (lien vers la règle), « Posé par » (compétences, porteurs, et statuts qui le posent eux-mêmes : Aura glaciale et Aura de décoction pour le Poison, Épines acérées pour le Saignement) et **Interactions** déduites du code (`statusLinks` : opposition, immunité, statut posé, renfort, purge).
- **Fiche › Performances** (ex-onglet Statistiques de la fiche) : même historique que l'écran Statistiques, avec un lien « Voir dans Statistiques ».
- **Écran Statistiques** : les noms des confrontations et des derniers combats mènent à la fiche du personnage, comme ceux du classement.
- `docs/AUDIT_COMPENDIUM.md` : l'audit des compétences et des statuts fait avant la refonte (incohérences signalées, non corrigées).

### Modifié
- **Texte unique d'une compétence** (`describeSkill`, `events.ts`) : la fiche, l'index des compétences et l'infobulle des dés affichent la même rédaction. Elle dit enfin « s'il touche » (Pourfendre), les coups d'un double (Crescendo, Soliste), le renfort par charge (Rancune, Sève) ; `describeEvent` (rapports, tests) en dérive.
- **Sceau rond** des index : l'icône peinte dans un cercle serti, liseré à la polarité (statut) ou à la nature (compétence), sans l'anneau vert.
- Les faces identiques d'un même porteur n'ont qu'une ligne (Attente de l'ogre, dés 1, 2, 3).
- Règles d'un statut rangées en Effet / Consommation / Cumul (`statusRuleSections` remplace `statusRules`) ; « Plafonné à 1 charges » disparaît (le plafond est un nombre, lié à sa règle).
- La fiche d'un combattant garde sa grande illustration, désormais contenue dans sa colonne.

### Corrigé
- **Rétribution** (Aldric) est enfin listée dans les statuts : elle n'est pas posée mais relâchée, et le compendium ne comptait que les poses directes.
- « par charge de Aura de rancune » → « par charge d'Aura de rancune ».

### Retiré
- `EventInfo.tsx`, `EffectLine` et les cartes de compétence et de statut (trois rédactions d'une compétence remplacées par une) ; `STATUS_DURATION_RULE` (la règle est dans `rules.ts`).

## [0.71.2] — 2026-10-20

### Ajouté
- **Planche d'icônes v8** (`docs/STYLE_BIBLE.md` § 7, prompt et motifs) : Saignement (`bleed`), Pourfendre (`cleave`), Aura glaciale (`frost-aura`, encensoir givré), et le relais du druide : Rancune (`grudge`, croc d'ours à la braise ambre), Sève (`sap`, goutte de sève sur une écorce entaillée), Aura de rancune (`grudge-aura`, empreinte d'ours brûlée dans le chêne), Aura de sève (`sap-aura`, bois de cerf qui bourgeonne). Elles remplacent les icônes provisoires. Les compétences trouvent la leur par leur id.

### Modifié
- **Épines acérées** : icône `thorns` refaite, la même ronce aux épines ensanglantées.
- `scripts/slice-icons.py` : quand les lueurs de deux icônes voisines se touchent, le morceau commun est réparti selon le cœur opaque le plus proche, au lieu de tout donner à une seule case (l'Aura glaciale avalait l'Aura de rancune).

### Retiré
- `poison-aura.png`, l'encensoir vert de l'ancienne Aura de poison, remplacé par `frost-aura`.

## [0.71.1] — 2026-10-20

### Modifié
- **Compteur des médaillons d'état** (retour de l'utilisateur : « pas clair, et bugué ») : un seul geste, au même endroit, sur le compteur. Le chiffre défile dans sa fenêtre (vers le haut pour une hausse, vers le bas pour une baisse) ; le compteur s'élargit et s'éclaire, ou se tasse et s'assombrit ; la variation part du compteur, « +2 » monte et « −1 » tombe, comme les textes flottants du combat. Deux changements rapprochés s'enchaînent et leur variation se cumule. Retirés : le rebond à ×2,1, le cerclage qui se vidait à rebours (`CountDrain`), la variation en haut à droite du médaillon et le sursaut du médaillon quand une valeur cachée changeait. Plus aucun filtre animé sur le compteur.

### Corrigé
- **Un état épuisé ne descendait pas à 0** : son médaillon était recréé sous une autre clé, et renaissait directement à 0. C'est désormais le même médaillon qui descend à 0, puis s'efface.
- **Un état reposé pendant sa sortie apparaissait en double** (le sortant et le nouveau côte à côte) : il reprend vie dans son médaillon (`trayAfter`, test dans `screens.test.tsx`).

## [0.71.0] — 2026-10-20

Rework du druide : une aura sur chaque 3, et le relais des formes (proposition A de `docs/SORTS.md` § 16, auras à +2, choix de l'utilisateur).

### Ajouté
- **Relais des formes** (Thaldrin) : touché sous forme humaine, il gagne une **Rancune** (`grudge`) : le prochain coup qui touche, celui de l'ours, fait +1 avant l'armure. Touché sous forme d'ours, il gagne une **Sève** (`sap`) : l'homme regagne 1 PV au début de son tour. Une seule à la fois, la nouvelle remplace l'ancienne. Compétences sur le coup encaissé (`hurt`) et la forme, vues dans tous les combats (3,8 Rancunes et 3,0 Sèves par combat).
- **Aura de sève** (3 de l'homme, au lieu des Feux follets) et **Aura de rancune** (3 de l'ours, au lieu de l'Aura de pourriture) : chaque charge ajoute 2 à la Sève ou à la Rancune. Cumulables comme les autres auras (mesurées plafonnées à une charge au laboratoire : 50,1 %).
- **Moteur** : `bonusPer` sur un effet `applyStatus` (`events.ts`) : la valeur posée grandit de `amount` par charge d'un statut du porteur. Contrôles dans l'audit de résolution (valeur du relais, Rancune dépensée au premier coup qui touche) et tests dans `combat.test.ts`.
- Icônes provisoires (Rancune : Charge ; Sève : Régénération ; Aura de rancune : ancienne Aura de pourriture ; Aura de sève : Fleur de vie), les vraies à peindre (STYLE_BIBLE § 7, TODO § 15).
- Fiche de Thaldrin : background, forces et faiblesses réécrites autour du relais.

### Modifié
- **Équilibre** (400 combats par duel) : Thaldrin 50,7 %, ses duels de 45 à 58 % (Ysolde contre lui : 35 % en 0.68.0, 45 % maintenant). Roster de 43,8 % (Ysolde) à 54,2 % (Ervald), pire duel inchangé (Brokk contre Ervald, 39 %). Valeurs nettes : Rancune +9,0, Sève +7,7, Charge +8,9, Coup de griffe +5,5, Écorce +3,5, Fleur de vie +2,6 ; les deux auras sont faibles (Aura de rancune +0,4, Aura de sève −1,0) : à +3, mesurées à 52,1 %.
- **Empreinte de non-régression** (`balance.test.ts`) mise à jour : changement voulu.
- Son (déduit des effets, non vérifiable à l'oreille) : la Rancune et la Sève jouent Bonus gagné quand le druide est touché, les deux auras Aura gagnée.

### Retiré
- Les Feux follets et l'Aura de pourriture du druide. La Brûlure, la Pourriture et l'Aura de pourriture restent au registre, sans porteur.

## [0.70.0] — 2026-10-20

### Ajouté
- **Pourfendre**, compétence du 1 de Gorak (proposition de l'utilisateur, version la plus forte retenue) : le 1 n'est plus sacrifié, c'est un vrai coup qui frappe pour sa valeur (Aura de puissance et critique compris, esquivable) et, **s'il touche**, pose Saignement 2. La plaie coule au coup suivant (RESOLUTION § 5, règle 9). Remplace la Saignée (sur un 1, sans coup : Saignement 2).
- **Moteur** : `needsTouch` sur une compétence de jet (`events.ts`) : elle ne part que si son coup touche (règle de l'utilisateur : un coup doit toucher pour poser un malus physique), vérifié avant tout tirage ; contrôle dans `validateRoster`, dans l'audit de résolution et dans `combat.test.ts`.
- À l'écran, le dé de compétence de Gorak s'allume à l'impact de Pourfendre (s'il touche), pas quand le dé tombe : l'esquive n'est pas annoncée d'avance. Rendu non vu à l'écran.

### Modifié
- **Équilibre** (400 combats par duel) : Gorak 49,4 → **51,1 %**, Pourfendre +5,0 points ; ses duels de 47 à 60 % (Ysolde). Roster de 43,3 % (Ysolde) à 54,3 % (Ervald), pire duel inchangé (Brokk contre Ervald, 39 %). Gorak ne sacrifie plus que 18 % de ses jets au lieu de 37 %. Variantes mesurées : Saignement 1, 47,8 % ; Saignement 3, 55,5 % (Ysolde 63 %).
- **Empreinte de non-régression** (`balance.test.ts`) mise à jour : changement voulu.
- Icône à produire : la Saignée devient Pourfendre (`cleave`, même motif de couperet ensanglanté, STYLE_BIBLE § 7).

### Retiré
- La Saignée (sur un 1, coup sacrifié, Saignement 2).

## [0.69.0] — 2026-10-20

Sixième passe sur les compétences (préparée et mesurée dans `docs/SORTS.md` § 15, choix de l'utilisateur).

### Modifié
- **Aura glaciale d'Ervald : elle pose du vrai Poison** (statut `frostAura`, ex-`poisonAura`). Au début de chacun de ses tours, 1 charge de Poison par charge d'aura sur l'adversaire, au lieu de 1 dégât direct par charge au début du tour adverse. Le Poison perd une charge à chaque tour : une charge d'aura le fige à sa valeur (après un Souffle de la tombe, 3 PV par tour au lieu de 3, 2, 1), deux charges le font grossir. Une seule règle d'affliction : l'immunité bloque, la Régénération annule, une purge enlève. Cumulable, sans compensation. Avant, l'aura doublait le Poison (même instant) et la Pourriture (même profil).
- **Furie des vents en coups bruts** (demande de l'utilisateur) : sur un 2, Gorak frappe deux fois tout de suite, et le dé de ces coups ne donne que leur valeur : un 1, un 2 ou un 3 frappe pour sa valeur, sans compétence, donc sans Furie en chaîne. Avant, 36,5 % des coups de Furie tombaient sur une compétence et 22,5 % des Furies en relançaient une autre (jusqu'à trois). En compensation, **Gorak passe au d9 et à 19 % de critique** (d8 et 18 % avant ; au d8, il tombait à 39,8 %).
- **Brûlure à une seule valeur** (accord de l'utilisateur) : posée sans durée, elle dure autant de tours que sa valeur (Brûlure 3 : 3 PV à la fin de ses 3 prochains tours). Les Feux follets ne changent pas de force. `validateRoster` refuse une durée en plus (`turnsFromStacks`).
- **Purification double d'Ysolde** (choix de l'utilisateur) : elle retire aussi son propre dernier malus (poison, plaie, brûlure). Sans elle, l'Aura glaciale cumulable faisait tomber Ysolde à 41,3 %, sous le plancher.
- **Équilibre** (400 combats par duel) : de 41,9 % (Ysolde) – 55,1 % (Aldric) à **43,4 % (Ysolde) – 54,8 % (Aldric)**. Gorak 47,9 → 49,4 %, Ervald 52,0 → 54,7 %, Ysolde 41,9 → 43,4 %, Thaldrin 51,8 → 50,5 %. Pire duel : Thaldrin contre Ysolde 64,8 % → Ervald contre Brokk 61,0 %. Valeurs nettes : Furie des vents +18,6, Aura glaciale +7,5, Souffle de la tombe +11,9, Purification +18,0 points.
- **Empreinte de non-régression** (`balance.test.ts`) mise à jour : changement voulu.
- Trace d'un combat : un coup brut s'y signale (« coup brut de Furie, sans compétence »).
- Son (déduit des effets, non vérifiable à l'oreille) : l'Aura glaciale joue Malus reçu à chaque tour d'Ervald, quand elle pose son poison, au lieu de Ronge.

### Retiré
- Les crochets propres à l'ancienne aura, `onOpponentTurnStart` et `stoppedByImmunity` (moteur, audit, narration), et `INSTANT_CHAIN`.

## [0.68.3] — 2026-10-20

### Modifié
- **Coup encaissé** (demande de l'utilisateur) : un coup ordinaire ne montre plus que la posture « coup encaissé », sans recul ni éclair rouge. Seul un critique repousse en plus le combattant, à l'opposé de son adversaire, puis le ramène (`.knockback`, qui remplace `.hit`).
- **Textes flottants** (demande de l'utilisateur) : une perte tombe (PV perdus, malus posé, bonus dissipé, `.damage-sink`) ; un gain ou un fait neutre monte. Un critique monte toujours, même si ce sont des PV perdus.

### Corrigé
- **Ogre décalé à droite sur l'écran de fin**, son corps sur son nom : sa toile est large (massue levée), et l'ancrage `inside` la calait par son bord, pas par sa silhouette. Morgrut, Ysolde, Aldric, Ervald, Elaria et Brokk reçoivent leur `bodyInset` (vide de la toile de chaque côté de la garde, mesuré sur le canal alpha), comme le druide et la barde. Effet aussi sur l'affrontement : ils touchent le bord de l'écran par leur silhouette.
- **Croix claire dans les disques arrondis** (médaillons d'état, infobulles, pastilles des parieurs ; capture de l'utilisateur) : la scène était peinte en 1600×900 puis agrandie (`transform: scale`) ; sous une échelle fractionnaire, Firefox dessinait un disque à fond translucide en quatre quartiers, dont les jointures laissaient passer le décor. La scène est désormais mise à l'échelle par `zoom` (`Stage.tsx`) : elle est mise en page à la taille de l'écran. Non reproduit dans Firefox sans interface : à confirmer chez l'utilisateur.
- **Ours du druide coupé à droite de l'écran** : l'éclair du coup reçu et le grisé du K.O. étaient des filtres sur un parent de l'image, et Firefox coupait l'image qui déborde de la colonne du combattant (vu : le haut de l'ours coupé net sous l'éclair). Plus aucun filtre sur un parent : le grisé du K.O. passe par le filtre de l'image elle-même, en fondu.

## [0.68.2] — 2026-10-20

### Modifié
- **Son et musique coupés par défaut** (demande de l'utilisateur) : les deux boutons, celui du son et celui de la musique, commencent désactivés, et on les rallume à la main. Les navigateurs pilotés par les tests automatiques, qui partent d'un stockage vide, restent ainsi muets. Le choix reste mémorisé (`battler:muted`, `battler:music-muted`) : seul un son rallumé est enregistré comme tel. Un navigateur où le son avait déjà été rallumé garde ce choix. Test : `modules.test.ts`.

## [0.68.1] — 2026-10-20

### Ajouté
- **Badge de modificateur du Saignement** (demande de l'utilisateur) : au centre, sous le dé, comme « Critique ×2 », un badge « Saignement +2 » tombe à l'impact du coup qui fait couler la plaie, dans une nouvelle couleur de famille, rouge sang sombre (`affliction`, `specials.ts`). Les PV de la plaie suivent l'impact d'un battement, sur la même frappe (son Ronge), au lieu d'une étape à part, plus d'une seconde après (`flowAt`, `bleedOut`, `useCombat.ts`). Une plaie séparée de son coup par une autre étape garde la sienne, avec le même badge.

### Modifié
- **Le coup qui ouvre une plaie ne la fait plus couler** (demande de l'utilisateur : l'observateur doit la voir, l'attendre, en profiter). Règle générale du moteur : pendant un coup, seuls les statuts présents à l'ouverture de ses fenêtres réagissent, avec les charges qu'ils avaient alors (`strikeBase`, `fireStrike`, `combat.ts`). Une plaie posée par ce coup attend le suivant ; des charges ajoutées à une plaie ouverte coulent à partir du coup suivant. Test dans `combat.test.ts`, contrôle mis à jour dans `audit.ts`.
- Équilibre inchangé : dans le roster, aucun coup ne pose de plaie (la Saignée sacrifie son coup, les Épines acérées font saigner l'attaquant) ; l'empreinte de non-régression passe sans mise à jour. Les idées du laboratoire qui font saigner au coup baissent un peu (Flèche barbelée 2 : +9,0 → +7,1 points ; Griffe qui lacère : +4,6 → +3,9).

## [0.68.0] — 2026-10-20

### Ajouté
- **Saignement**, nouveau malus (`bleed`, famille Affliction) : chaque coup qui touche le porteur lui fait perdre autant de PV que de charges, en ignorant l'armure, puis la plaie perd une charge (Saignement 2 : 2 puis 1 PV, sur les deux prochains coups reçus). Le Poison compte les tours, le Saignement compte les coups : plusieurs coups dans une action (Furie des vents, deux dés) vident la plaie d'un coup, une esquive ou une action perdue la laissent ouverte. Il se cumule, l'Aura d'immunité le bloque. Aucun nouveau personnage : il entre par Gorak et Brokk.
- **Moteur** : un statut qui s'estompe (`decays`) perd aussi sa charge quand il réagit (`reactions`), juste après son effet et dans la même étape. Contrôle « saignement » dans l'audit de résolution (`audit.ts`), tests dans `combat.test.ts`.
- Icônes à produire (`docs/STYLE_BIBLE.md` § 7) : le Saignement et la Saignée, avec leurs motifs. En attendant, le Saignement reprend le cœur fendu de la Brèche (statut à venir).

### Modifié
- **Gorak : Saignée remplace la Rage du sang** (sur un 1 : Saignement 2 sur l'adversaire, au lieu de +5 PV). Valeur nette +3,3 points (la Rage du sang valait +5,8) ; Gorak 50,9 → 47,9 %, dans le budget. Saignée 3 a été mesurée : 54,5 %, mais 71,5 % contre Ysolde.
- **Brokk : Épines acérées** (statut `thorns`, même règle de pose) : chaque coup encaissé pose sur l'attaquant une charge de Saignement par charge d'épines, au lieu de lui renvoyer 1 dégât direct par charge. La punition attend que le nain touche à son tour. Valeur nette +3,7 → +5,0 points ; Brokk 48,3 → 50,4 %.
- **Équilibre** (400 combats par duel) : de 41,9 % (Ysolde, 43,0 avant) à 55,1 % (Aldric, 54,0 avant) ; pire duel inchangé, Thaldrin contre Ysolde à 64,8 %. Gorak contre Ysolde 58,8 → 62,3 %, Brokk contre Ysolde 51 → 57 %. Ysolde passe 0,1 point sous les 42 %, dans la marge (±1,6) : une compensation est proposée dans `docs/SORTS.md` § 14, pas appliquée.
- **Empreinte de non-régression** (`balance.test.ts`) mise à jour : changement voulu.
- Son : la plaie qui coule joue Ronge, comme le poison ; la Saignée joue Malus reçu ; les Épines acérées, qui posent un malus, jouent Malus reçu au lieu de Coup (`docs/SONS.md`). Non vérifiable à l'oreille par l'agent.
- Laboratoire : la série 8 (`scripts/lab/ideas.ts`) utilise le vrai statut. La première passe l'imitait avec une charge de trop, qui gonflait chaque plaie posée par-dessus une autre : elle surestimait le Saignement (Saignée 2 annoncée à −0,6 point, −3,0 en vrai).

### Retiré
- La Rage du sang (+5 PV sur un 1), seule compétence de soin immédiat du roster.

## [0.67.3] — 2026-10-20

### Modifié
- **Accueil, Gorak plus grand et monté** (retour de l'utilisateur : la hausse de la 0.67.2 ne se voyait pas). Derrière Ysolde, seule sa partie haute se voit : une hausse de taille ancrée sur les pieds montait à peine sa tête. Il passe à 47 % de la hauteur de l'écran (hausse doublée : 41 → 47 %) et ses pieds remontent de 83 à 80 % ; le sommet de sa tête passe de 377 à 295 px, au-dessus de l'auréole d'Ysolde (337 px). Il paraît désormais plus grand qu'Aldric, au milieu : c'est l'assombrissement qui le place au fond. Rentré à 22,5 % de la largeur, sa hache reste hors de l'allée (bord à 545 px).

## [0.67.2] — 2026-10-20

### Modifié
- **Accueil, Gorak un peu plus grand** (demande de l'utilisateur) : à l'arrière gauche, 41 → 44 % de la hauteur de l'écran, pieds inchangés. Sa tête et ses épaulières dépassent maintenant franchement d'Ysolde. Il est rentré de 24 à 23,2 % de la largeur pour que sa hache reste hors de l'allée (bord à 545 px).

## [0.67.1] — 2026-10-20

### Modifié
- **Accueil, côté gauche de la haie** (demande de l'utilisateur) : Ysolde devant, Aldric au milieu (au bord), Gorak derrière. Gorak est rentré de 25,5 à 24 % de la largeur pour que sa hache n'entre pas dans l'allée (son bord le plus proche s'arrête à 545 px, le logo commence vers 555). Tailles et plans inchangés. Gorak, derrière Ysolde, ne montre que sa tête et le fer de sa hache.

## [0.67.0] — 2026-10-20

### Ajouté
- **Postures du druide (Thaldrin), sous ses deux formes**. Le roster entier a désormais ses cinq postures (attaque, esquive, coup encaissé, K.O., victoire).
  - **Forme humaine** : une nouvelle garde tirée de ses planches (`druid-idle.png`), qui remplace `druid.png`. Même taille à l'écran qu'avant (scale 0,93 → 1,10, `headroom` 0,155), ancrage sur la silhouette dans l'affrontement (`bodyInset`), portrait recadré.
  - **Forme d'ours, en vrai animal** (règle de l'utilisateur : sous cette forme, il est une bête) : à quatre pattes, il charge au galop gueule ouverte, recule en boule sous le coup, s'écarte d'un bond, s'effondre sur le flanc au K.O. et rugit campé sur ses pattes à la victoire. Il remplace l'ours debout (`druid-bear.png`). Aussi haut que le druide à 4 % près (bois compris) et une fois et demie plus long que haut : la métamorphose le fait grossir, plus grandir.
- `slice-poses.py --sol` : pose chaque posture sur la ligne de sol de la garde. Les planches de l'ours faisaient flotter ses postures jusqu'à 121 px au-dessus du sol (le K.O. couché), celles du druide de 5 à 30 px.
- `slice-poses.py --avant=<px>` : allonge la toile à l'arrière, pour avancer à l'écran un personnage très large. L'ours, trop long pour sa colonne, sortait de l'écran par l'arrière ; il est avancé de 130 px de toile.
- Atelier des postures : une forme animale a ses propres blocs de prompt (style, langage du corps, mouvement), sans un mot d'anatomie humaine, et des planches de deux cases en paysage empilées (`POSTURES.md` § 0).
- `docs/STYLE_BIBLE.md` : le prompt complet de la garde de l'ours à quatre pattes ; l'ours quitte le gabarit « titanesque » des silhouettes debout.

### Modifié
- Test de taille : l'ours à quatre pattes ne dépasse plus le druide ; il reste sous l'ogre et à sa hauteur, à 5 % près. Le test des postures couvre tout le roster et les deux formes du druide.

### Retiré
- `druid.png` et `druid-bear.png` (corbeille), remplacés par les gardes des postures. Planches sources dans `logs/atelier/sources/thaldrin/` et `thaldrin-ours/`.

## [0.66.2] — 2026-10-20

### Modifié
- **Accueil, premier plan gauche** (retour de l'utilisateur) : Fanchon, trop riche en motifs et en détails, et trop mince, brouillait la lecture de la composition. Aldric la remplace : une silhouette compacte, deux grandes masses (acier, tabard rouge), en écho à la bannière rouge du décor, et deux chevaliers (Aldric, Ervald) qui encadrent l'allée. Ysolde passe à l'arrière, derrière lui : son auréole et sa masse dépassent de son épaule. Tailles et plans inchangés.

## [0.66.1] — 2026-10-20

### Modifié
- **Accueil, choix du mode** (correction de l'utilisateur) : Duel et Tournoi sont deux choix de même rang, réunis dans **une seule pièce prestige** : un cadre octogonal de bronze et deux plaques d'or identiques (240 × 66 px, icône, filet clair, tranche, gravure), au lieu d'un bouton prestige pour Duel et d'un bouton serti pour Tournoi. Au focus clavier, le cadre passe en or clair et la plaque visée s'éclaire. Les lignes d'explication sont centrées sous chaque plaque (« Deux combattants, un vainqueur », raccourcie pour tenir sous la plaque ; celle du tournoi garde sa progression). Logo de 104 à 96 px, pour une allée plus étroite.
- **Accueil, haie** : écart entre les plans resserré. Avant 51 à 52 % de la hauteur de l'écran (Fanchon, Ervald), milieu 46 % (Gorak, Elaria), arrière 41 % (Aldric, Naraxes), contre 58 % et 29 % avant : un avant énorme devant un arrière minuscule. Les avants sont des silhouettes étroites, pour laisser voir l'arrière qui dépasse derrière eux, entre l'avant et l'allée. Gorak passe au milieu, au bord gauche. Brokk et l'ogre essayés à l'arrière, puis retirés : Brokk restait minuscule, l'ogre cachait tout le plan.

### Corrigé
- **Arc d'Elaria coupé** par le bord droit de l'écran : elle est rentrée de 7 à 11 % de la largeur, et aucun combattant ne sort plus de l'écran (emprises mesurées sur le canal alpha des images).

## [0.66.0] — 2026-10-20

### Modifié
- **Accueil : le seuil de l'arène** (maquette de l'utilisateur, `home-ref.png`). Le triptyque de trois arches laisse la place à une allée qui mène à la porte de l'arène, sous sa lumière.
  - **Décor** : la porte de l'arène de la sélection (`menu-duel.jpg`) plutôt que le haut plateau (`menu-home.jpg`), sans porte, qui ne tenait pas l'idée du seuil. Bords assombris, voile sombre localisé sous le logo et les boutons.
  - **Haie de six combattants** en garde, sur trois plans : avant (Gorak, Ervald, 57 à 58 % de la hauteur de l'écran, pieds près du bas), milieu (Aldric, Elaria, 47 à 48 %), arrière (Brokk, Naraxes, 29 à 32 %, près de la porte). Chaque plan est plus petit et plus sombre que le précédent. Tous regardent vers le centre (miroir à droite), à l'échelle par la hauteur, ancrés sur leurs pieds (`headroom` et `footroom` comptés), avec une ombre de contact en CSS. Les emplacements sont une liste (`src/components/homeHedge.ts` : personnage, côté, plan, taille, position), pour les changer ou les tirer au hasard plus tard. Aucun ne passe sous le logo ni sous les boutons.
  - **Hiérarchie des modes** : Duel, l'action principale, en pièce prestige ; Tournoi, la secondaire, en bouton serti ; Combat test en lien discret, en bas au centre. Les lignes d'explication restent sous Duel et Tournoi (avec la progression d'un tournoi en cours) ; la phrase d'accroche sous le logo de la maquette n'est pas reprise, elle répétait celle du Duel.
  - Rien ne disparaît : Statistiques, Compendium, son, musique, version, flèches entre les modes et Entrée.

### Retiré
- Le triptyque de l'accueil (arches SVG, styles `.triptych` et `.arch-*`). Ses illustrations (`arch-duel.jpg`, `arch-tournament.jpg`) et l'ancien fond (`menu-home.jpg`) restent dans `src/assets/`, inutilisés, pour pouvoir revenir en arrière.

## [0.65.0] — 2026-10-20

### Ajouté
- **Postures de Brokk et de Morgrut** (atelier des postures) : garde, attaque, esquive, coup encaissé, K.O. et victoire, en quatre planches chacun, générées par l'utilisateur (sources dans `logs/atelier/sources/brokk/` et `morgrut/`).
  - **Brokk, nouveau modèle** : un nain torse nu à la grande hache, création originale. Il remplace `dwarf.png`, le dernier placeholder tiré d'une œuvre existante (à la corbeille). Il regarde désormais vers la droite, comme le reste du roster. La hache dépasse de la tête, donc la taille est réglée sur le corps, comme pour Aldric : de la tête aux pieds, il occupe 71,6 % de la toile de 902×1098. `scale` 0,80 → 1,14, `headroom` 0,23, `footroom` 0,035 (la hache du K.O. descend sous les pieds), portrait recadré (`zoom` 4,6).
  - **Morgrut** garde son modèle : la nouvelle garde remplace `ogre.png` (à la corbeille). La massue levée de la victoire rend la toile haute (1042×1232), et la garde n'en occupe que 70,3 %. `scale` 1,05 → 1,48 pour garder la même taille à l'écran (1,13 d'un humain), `headroom` 0,22, `footroom` 0,06 (la massue du coup encaissé et du K.O. descend sous les pieds), portrait recadré (`zoom` 4,6).
  - Vu par capture : sélection, affrontement Brokk contre Morgrut, attaque et coup encaissé des deux en combat, victoire des deux sur l'écran de fin. Non vus : les K.O. et l'esquive de Brokk. L'esquive de Morgrut ne se verra pas en jeu, puisqu'il n'esquive jamais (0 %).

### Corrigé
- **Écran de fin** : le titre « COMBAT » passe devant le vainqueur. La massue levée de Morgrut le cachait.

## [0.64.3] — 2026-10-20

### Modifié
- **En-tête du combat plus sombre** (demande de l'utilisateur), toujours vitré : voile de 70 à 50 % (au lieu de 60 à 38 %), et la vitre assombrit aussi le décor qu'elle floute (`brightness(0.7)`). Le décor se devine encore dessous.

## [0.64.2] — 2026-10-20

### Modifié
- **En-tête du combat vitré** (demande de l'utilisateur) : la bande des noms, dés et PV n'est plus un aplat presque noir. C'est une vitre (voile sombre dégradé de 60 à 38 %, flou d'arrière-plan de 10 px, liseré de bronze, classe `.fight-header`), et le décor de l'arène passe dessous. `FightScreen` dessine le décor en taille naturelle, ancré à la hauteur de `focus` exactement comme l'ancien `object-cover`, pour qu'il déborde au-dessus de l'arène sans décaler le cadrage du sol ; la racine de l'écran coupe ce qui dépasse.

### Retiré
- **Flou des fonds** (demande de l'utilisateur) : plus de `blur(1px)` sur les neuf arènes (`arenas.ts`), ni de `blur(2px)` sur le fond de l'écran d'affrontement. Les panneaux posés sur les fonds (combattants, tableau du tournoi, barre de commandes, journal du combat, pavé du combat test) perdent leur flou d'arrière-plan et gardent leur voile. Seul l'en-tête du combat floute ce qu'il recouvre, pour l'effet de vitre.

## [0.64.1] — 2026-10-20

### Modifié
- **Serveur de dev sans rechargement automatique** (demande de l'utilisateur) : modifier un fichier ne recharge plus la page, et une partie ou un tournoi en cours survit au travail sur le code. `vite.config.ts` coupe le remplacement à chaud (`server.hmr: false`) et la connexion WebSocket (`server.ws: false`), qui rechargeait la page au redémarrage du serveur (modification de `vite.config.ts` ou de `package.json`, donc à chaque montée de version). Le serveur invalide toujours les fichiers modifiés : **un rafraîchissement (F5) charge la nouvelle version**. Contrepartie : plus de calque d'erreur de Vite dans la page (les erreurs restent dans la console et le terminal), et la console signale au chargement que le client de Vite n'a pas pu se connecter.

## [0.64.0] — 2026-10-20

### Ajouté
- **Combat test : menu déroulant d'arène** (demande de l'utilisateur), au centre du bandeau du haut, devant Recommencer et Menu, au même style que les sélecteurs de personnages. Il propose la forêt d'entraînement (Le Pré-aux-Guetteurs, toujours le décor de départ), puis les huit arènes des duels. Changer d'arène ne change que le décor : le combat en cours continue, et l'arène choisie reste pour les combats suivants du mode. La forêt d'entraînement reste absente des autres écrans.

## [0.63.0] — 2026-10-20

### Modifié
- **Fusion de deux branches divergentes** : le travail du 2026-10-20 fait sur une autre machine (accueil en triptyque, combat test, arènes en gouache), parti de la 0.44.0 et poussé sous les numéros 0.45.0 à 0.49.0, est réuni avec la branche locale (0.45.0 à 0.58.1, jamais poussée). Ses entrées sont renumérotées 0.59.0 à 0.63.0 ci-dessous. Le combat test garde la mise en scène locale (halo du camp actif, compétences groupées avec leur dé, badges de coups spéciaux) ; l'anneau au sol, remplacé localement par le halo, ne revient pas.

### Ajouté
- Arène **Le Pas-des-Comètes, col d'Aubrelle** (`arena-terrace.jpg`) : une terrasse en altitude sous une pluie d'étoiles filantes.
- Décor d'entraînement **Le Pré-aux-Guetteurs, forêt de Brandeval** (`arena-training.jpg`) : toujours celui du combat test, et jamais ailleurs.

### Modifié
- Le marais des Pilotis devient une arène ordinaire, au choix ou au hasard.
- Écran de sélection : nouveau fond en gouache (`menu-duel.jpg`).

### Retiré
- Le portail de l'ancien style (`menu-portal.jpg`).

## [0.62.0] — 2026-10-20

> Faite sur une autre machine sous le numéro 0.48.0, à partir de la 0.44.0 ; renumérotée à la fusion du 2026-10-20 avec la branche locale (0.45.0 à 0.58.1).

### Ajouté
- **Six arènes en gouache graphique**, tirées au hasard ou choisies sur l'écran d'affrontement : Les Pierres-Couchées (bois de Vaumorin), La Cour-des-Enclumes (Durnhold), Les Mille-Feux (lac Sorelle), Les Chapeaux-Fols (val Brunelle), Les Cloches-Noyées (anse de Morvoux), La Paume-du-Vieux (pic Solange). Chaque arène porte un lieu-dit et sa région, affichée sous le nom dans le sélecteur.
- **Arène d'entraînement** : Les Pilotis, marais de Gâtebois (`TRAINING_ARENA`). C'est toujours le décor du combat test, et il n'apparaît sur aucun autre écran (test dédié dans `modules.test.ts`).
- Accueil : fond dédié (`menu-home.jpg`, haut plateau au crépuscule, croix de bois) et illustrations des arches Duel (`arch-duel.jpg`) et Tournoi (`arch-tournament.jpg`).

### Modifié
- Le choix d'arène est « Au hasard » par défaut.
- Fond du tournoi refait en gouache (`menu-tournament.jpg`) : porte à gauche, rempart sombre à droite, coffre d'or et restes d'un combattant au premier plan.
- Toutes les images de décor sont agrandies ×4 par IA (Real-ESRGAN), puis livrées en 2400×1600 (arches : 1800×1200).
- `docs/STYLE_BIBLE.md` (2026-10-20) : nouveau style pour tous les décors, arènes et fonds d'écran : la **gouache graphique** (aplats mats, formes géométriques, palette courte, sans lueurs ni particules), qui remplace la peinture numérique surchargée. Personnages et icônes gardent leur direction. Nouvelles règles de composition : côtés vivants (objets, traces de vie, petit animal caché), lointain habité, centre calme, et **rien au premier plan** sous les pieds des combattants. Un prompt de référence complet remplace le bloc fixe et sa fiche : les prompts donnés sont toujours entiers.
- `docs/STYLE_BIBLE.md` : un tableau « En bref » réunit les règles des décors (format paysage annoncé en tête du prompt, style, clair-obscur, dépôt, agrandissement, nommage, lieux-dits). Historique des arènes et prompt validé du tournoi à jour.

### Retiré
- Les deux arènes de l'ancien style (`arena-ruins.jpg`, `arena-dwarf-fortress.jpg`).

## [0.61.1] — 2026-10-20

> Faite sur une autre machine sous le numéro 0.47.1, à partir de la 0.44.0 ; renumérotée à la fusion du 2026-10-20 avec la branche locale (0.45.0 à 0.58.1).

### Modifié
- Accueil : **aucune arche n'est mise en avant**. Au repos, les trois sont égales (fer et bronze, illustration dans la pénombre) ; l'or ne vient qu'au survol ou au focus clavier.
- Survol plus doux : l'arche s'élève et grossit légèrement (ombre plus profonde), son illustration s'éclaire et avance dans le cadre, le socle passe à l'or en fondu (environ une demi-seconde, courbe amortie). Les volets se redressent un peu vers le spectateur.
- Un clic sur une arche ouvre directement le mode.

### Retiré
- Accueil : le bouton principal sous le triptyque (« Choisir les combattants »…) et l'état « arche choisie » ; les médaillons d'icône des arches. Au clavier, Tab puis les flèches passent d'une arche à l'autre, Entrée l'ouvre.

## [0.61.0] — 2026-10-20

> Faite sur une autre machine sous le numéro 0.47.0, à partir de la 0.44.0 ; renumérotée à la fusion du 2026-10-20 avec la branche locale (0.45.0 à 0.58.1).

Accueil en triptyque (demande de l'utilisateur). Présentation pure : le moteur et l'empreinte de non-régression sont inchangés.

### Modifié
- **Écran d'accueil** : la colonne de trois boutons devient un **triptyque** de trois arches brisées en fer forgé, une par mode (Combat test, Duel au centre, Tournoi). Chaque arche a un filet de bronze, un bandeau de fer riveté, une clef de voûte, une illustration, un médaillon du mode, et un socle chanfreiné qui porte son titre ; une ligne d'explication est écrite dessous. Le panneau central est le plus grand ; les deux volets, plus bas, pivotent vers lui comme ceux d'un retable.
- Choix d'un mode : un clic choisit une arche, qui passe à l'or, s'avance et s'éclaire. Un second clic, ou le bouton principal sous le triptyque (« Lancer le combat test », « Choisir les combattants », « Entrer dans le tournoi »), l'ouvre. Au clavier : flèches gauche et droite, puis Entrée.
- Illustrations provisoires, reprises des décors existants (forteresse naine, portail, porte du tournoi) ; fond de l'accueil provisoire : les ruines, floutées et assombries.

## [0.60.0] — 2026-10-20

> Faite sur une autre machine sous le numéro 0.46.0, à partir de la 0.44.0 ; renumérotée à la fusion du 2026-10-20 avec la branche locale (0.45.0 à 0.58.1).

Combat test (demande de l'utilisateur) : le choix des dés quitte les combats normaux pour un mode dédié. Le moteur et l'empreinte de non-régression sont inchangés.

### Ajouté
- **Combat test** (`TestFightScreen.tsx`), entrée « Combat test » de l'accueil, désormais active. Pas de sélection ni d'écran d'affrontement : le combat commence aussitôt (initiative tirée sans animation, notée au journal), sur fond noir en attendant son décor, sans ambiance. **Chaque dé attend le joueur** : sous chaque combattant, un pavé (l'ancien pavé du mode triche) propose les faces de son dé, ou Pile et Face pour la pièce, et « Hasard ». Seul le pavé du combattant qui a la main s'allume, à la couleur de son camp, une fois le coup précédent mis en scène ; le reste du tour (compétences, statuts, fin de tour, passage de main) se résout seul jusqu'au dé suivant. Les deux dés de la barde et les dés d'une rafale se choisissent un par un. Clavier : 1 à 9, 0 pour 10, P et F, H ou Retour arrière pour le hasard.
- En haut de l'arène : un sélecteur par camp (Gauche, Droite) pour changer de personnage sans recharger, et les boutons Recommencer (nouvelle initiative) et Menu.
- Les combats test ne comptent pas dans les statistiques ; leur trace finale part dans `logs/combats/` (suffixe `_triche` dès qu'un dé est choisi), et `npm run logs` la rejoue.
- Test : un combat dont chaque dé est choisi un par un, du premier au K.O. (deux dés et pièce compris), sans changer ce qui précède.

### Modifié
- `useCombat` : option `test`, qui arrête la lecture avant chaque dé (`CheatState.waiting`) jusqu'au choix du joueur, et saute l'animation de l'initiative.
- `FightScreen` : fond d'arène facultatif (fond noir), pavés et commandes du combat test.
- `CheatPad` : un pavé par combattant, posé sous lui, au lieu d'une fenêtre unique.

### Retiré
- Bouton **Cheat** et touche C des combats normaux (duel et tournoi) : imposer un dé n'est plus possible que dans le combat test.

## [0.59.0] — 2026-10-20

> Faite sur une autre machine sous le numéro 0.45.0, à partir de la 0.44.0 ; renumérotée à la fusion du 2026-10-20 avec la branche locale (0.45.0 à 0.58.1).

Écran d'accueil (demande de l'utilisateur). Présentation pure : le moteur et l'empreinte de non-régression sont inchangés.

### Ajouté
- **Écran d'accueil** (`HomeScreen.tsx`), premier écran du jeu : titre « BATTLER » et menu de trois entrées, dans cet ordre :
  - **Combat test** : mode à venir, entrée grisée « Bientôt disponible » ;
  - **Duel** : l'ancienne sélection de personnages, action principale (pièce prestige) ;
  - **Tournoi** : la présentation du tournoi ; sa progression s'affiche sous l'entrée s'il est en cours.
- Statistiques et Compendium sont aussi accessibles depuis l'accueil. Fond provisoire (`menu-portal.jpg`, plus assombri), en attendant le fond dédié en cours de génération.

### Modifié
- Sélection du duel et présentation du tournoi : les onglets majeurs Affrontement / Tournoi disparaissent, remplacés par un bouton tertiaire « ← Menu » qui ramène à l'accueil.
- « Menu » de l'arbre de tournoi et de l'écran du champion ramène à l'accueil ; celui de l'écran de fin d'un duel ramène toujours à la sélection. Le compendium et les statistiques reviennent à l'écran d'où on les a ouverts (accueil ou sélection).
- Bouton `.btn` désactivé : son icône s'éteint aussi, comme sur la pièce prestige.

## [0.58.1] — 2026-10-20

### Modifié
- **Compteur d'état : une hausse et une baisse se distinguent** (retour de l'utilisateur : la même animation servait aux deux). La hausse garde son grand rebond lumineux. La baisse n'a plus de bond : le nombre s'allume d'une lueur et se tasse, et un cerclage lumineux plein autour de lui **s'efface à rebours, trait par trait**, jusqu'à la part gardée (de 3 à 2, un tiers du contour disparaît), puis s'éteint.

### Corrigé
- Le cerclage de la 0.55.0 ne se vidait pas dans Firefox (variable CSS dans les images clés ignorée) et sa lueur dessinait un carré grisâtre : le trait est animé par le composant (Web Animations API), la lueur est un second trait flou.

## [0.58.0] — 2026-10-20

### Ajouté
- **Postures d'Elaria** (atelier des postures) : garde, attaque (une flèche lâchée en pleine fente), esquive, coup encaissé, K.O. et victoire, à partir de sa garde actuelle. La nouvelle garde remplace `elf.png`, qui est à la corbeille.
  - **Taille réglée sur le corps**, comme Aldric et Ysolde, puisque l'arc dépasse de la tête : de la capuche aux pieds, elle occupe 77 % de la toile. `scale` 0,96 → 1,25, `headroom` 0,22 : un peu plus grande qu'Ysolde (1,03 d'un humain).
  - Portrait recadré (`zoom` 4,8).
  - Vu par capture : accueil, affrontement face à Ysolde, attaque, esquive et coup encaissé en combat. Non vus : le K.O. et la victoire.

## [0.57.0] — 2026-10-20

### Ajouté
- **Postures d'Ysolde** (atelier des postures) : garde, attaque, esquive, coup encaissé, K.O. et victoire, générés par l'utilisateur à partir de sa garde actuelle. La nouvelle garde remplace `human.png`, qui est à la corbeille.
  - **Taille réglée sur le corps**, comme Aldric : la masse levée et le halo dépassent de la tête. Le corps (tête-pieds) occupe 74 % de la toile : `scale` 0,93 → 1,25, `headroom` 0,245. Son corps paraît donc plus grand qu'avant, à sa taille prévue (1,00 d'un humain, un peu moins qu'Aldric).
  - Portrait recadré (`zoom` 5).
  - Vu par capture : accueil, affrontement face à Aldric, attaque, coup encaissé et K.O. Non vus : l'esquive et la victoire.

## [0.56.0] — 2026-10-20

### Ajouté
- **Nouveau modèle d'Aldric et ses cinq postures** (atelier des postures). Il y avait deux défauts : l'épée levée et la bannière haute rapetissaient son corps à l'écran (signalé par l'utilisateur), et sa garde montrait une arme au-dessus de la tête. La nouvelle garde tient l'épée basse, prête à charger, et la bannière est raccourcie. Mêmes couleurs et même identité : rouge sang, acier sombre, feu sacré.
  - **Taille réglée sur le corps** (tête-pieds, 77 % de la toile), et non plus sur la hampe de la bannière, qui dépasse encore un peu : `scale` 0,97 → 1,24, `headroom` 0,21 (le vide et la bannière au-dessus de la tête). Son corps paraît donc plus grand qu'avant, à la taille prévue (1,04 d'un humain), à côté d'Ervald (1,05).
  - Portrait recadré (`zoom` 5,2). `paladin.png` est à la corbeille.
  - Vu par capture : l'accueil, l'affrontement face à Ervald, puis en combat l'attaque, le coup encaissé et le K.O. L'esquive et la victoire n'ont pas été vues.
- Test : Ervald et Aldric ont les cinq postures communes.

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
