# Battler : consignes pour l'agent

Prototype de combat aux dés en React, Vite, Tailwind et TypeScript. L'utilisateur parle français : interface, commentaires et docs en français, identifiants de code en anglais.

## Le projet en bref

**Un auto-battler roguelike à regarder et à parier.** Deux terrains de jeu en parallèle : **le jeu des combattants** (personnages, compétences sur les faces du dé, statuts, tournoi, équilibre mesuré) et **le jeu des parieurs** (deux joueurs et deux parieurs de l'ordinateur parient des Deniers sur chaque match, sans jamais toucher au combat). Le projet sert aussi d'**expérience de développement** : mécaniques de jeu (auto-battler, roguelike, gacha, paris), maths et statistiques, ergonomie. Fiche produit complète : `docs/INTENTION.md` § Fiche produit. **La lire en premier.**

Repères de l'utilisateur, à respecter partout :
- **un jeu vidéo, pas une page web** : grandes formes, tuiles, menus superposés, lisible sur une télévision ;
- **un personnage est un personnage précis**, pas une race ;
- **mesurer avant de proposer** (simulation, valeur nette, avant → après), et proposer avec la compensation ;
- **les cotes des paris restent cachées** jusqu'au règlement ;
- **synergies d'abord** : donner toujours de l'effort à la création de synergies (ressource produite, puis consommée, collaboration entre maîtrises) ; voir `docs/INTENTION.md`.

## Avant de travailler

Le plan de la documentation, et où documenter quoi, est dans `docs/README.md`. Lire, selon la tâche :
- `docs/ETAT.md` : état actuel et limites connues ;
- `docs/FEATURES.md` : règles en vigueur de chaque fonctionnalité ;
- `docs/ARCHITECTURE.md` : où se trouve le code, comment ajouter un personnage ou un événement ;
- `docs/INTENTION.md` : principes à respecter et pistes ;
- `docs/RESOLUTION.md` : le livre de règles de la résolution (phases, ordre, application, opposition). Toute modification du déroulé d'un combat commence par ce document ;
- `docs/STATUTS.md` : bonus et malus (vocabulaire, conditions, catalogue, chantier). À mettre à jour dès qu'on touche un statut, une condition ou un déclencheur ;
- `docs/SONS.md` : les règles du son. Une compétence ne choisit pas son son, il se déduit de la nature de ses effets ; tout son nouveau ou modifié commence par ce document ;
- `docs/MISE_EN_SCENE.md` : les règles de la mise en scène (synchronisation du combat à l'écran : ce qui tombe en même temps que quoi). Un constat de l'utilisateur devient une règle générale, avec son contrôle dans `staging.test.ts` ; toute mise en scène nouvelle ou modifiée commence par ce document ;
- `docs/PERSONNAGES.md` : philosophie et décisions de design de chaque personnage. À mettre à jour (mesures comprises) dès qu'on touche un personnage, ses stats ou son événement.
- `docs/PARIS.md` : le jeu des parieurs (règles, maths, interface, étapes). Toute modification des paris commence par ce document.
- `docs/RELIQUES.md` : les reliques (ce qui les sépare des compétences, règles des quatre types, récompense de tournoi, interface, identité hexagonale et grammaire d'illustration, les douze reliques mesurées par `npm run relics`, prompt de leur planche). Toute relique ou règle de relique commence par ce document.
- `docs/CAMPAGNE.md` : la campagne et la forge du dé (décisions de l'utilisateur, prototype livré en 0.88.0, choix de l'agent, mesures par `npm run campaign`). Toute règle de campagne ou de forge commence par ce document.
- `docs/PROGRESSION.md` : la réflexion sur la progression d'un personnage (profondeur, synergies, écoles, super coups, dés différents, feuille de personnage), avec la mesure des synergies des reliques et une estimation de chaque piste. Toute piste de synergie ou de progression commence par ce document.
- `docs/EN_LIGNE.md` : le plan de mise en ligne (compte Google, historique lié au compte, VPS). Toute question de serveur, de compte ou de sauvegarde en ligne commence par ce document.
- `docs/TODO.md` : la liste des chantiers, dont la réflexion auto-battler (§ 11 à 17).
- `docs/SORTS.md` : idées de sorts, laboratoire et audit des compétences, avec leurs résultats ; `docs/FAMILLES.md` : proposition de familles d'effets ; `docs/ETUDE_AUTOBATTLER.md` : l'étude de fond (limites, jeux de référence, pistes reliques et métas).

## À chaque évolution livrée

1. Monter la version dans `package.json` : mineure pour une fonctionnalité, correctif pour une correction ou un réglage.
2. Ajouter une entrée datée dans `CHANGELOG.md` (Ajouté / Modifié / Corrigé / Retiré) : c'est la **seule chronique** du projet.
3. Mettre à jour la règle en vigueur dans la section concernée de `docs/FEATURES.md` (pas de ligne d'historique).
4. Mettre à jour `docs/ETAT.md` : l'état présent seulement (date, version, en bref, état par système, limites, chantiers).
5. Toucher `docs/INTENTION.md` ou `docs/ARCHITECTURE.md` seulement si les principes ou la structure changent.

Un retour de l'utilisateur se rédige et se livre avec le gabarit : `docs/etudes/RETOURS.md` § 6 et `prompts/GABARIT_RETOUR.md`.

## Règles du projet

- Un seul moteur : `simulateCombat` applique toutes les règles et produit une chronologie (`beats`) ; l'écran ne fait que la rejouer. Ne jamais tirer de dés ni recalculer une règle dans l'interface.
- Aucun `Math.random` dans les règles : tout passe par un `Rng` injecté (`rng.ts`).
- **Jamais d'emoji** dans un texte affiché (textes flottants, journal, descriptions, infobulles, écrans) : chaque compétence et chaque état a son icône peinte. S'il en manque une, la demander à l'utilisateur. Des tests le vérifient (`EMOJI`).
- **Contrôles : le UI kit seulement** (`docs/ui-kit/README.md`, règle permanente de l'utilisateur, 0.83.0). Boutons, onglets, liens de retour, barre de lecture : composants de `src/components/kit.tsx`, glyphes de `BattlerIcon` ; on copie le kit, on ne le réinterprète pas. Les images peintes sont réservées au contenu (compétences, statuts, reliques, objets, portraits) : **jamais dans un bouton de commande**.
- Statuts, déclencheurs et effets se définissent dans leur registre (`statuses.ts`, `events.ts`) ; aucun nom de statut en dur dans les composants. Marche à suivre : `docs/ARCHITECTURE.md`, section « Étendre le jeu ».
- Toute nouvelle mécanique arrive avec ses tests dans `combat.test.ts`.
- Scène fixe de 1600×900 (`Stage.tsx`) : pas de breakpoints `sm:` ni d'unités `vh` dans les écrans.
- Après toute grosse mise à jour du gameplay (compétence, statut, règle, stats), équilibrer par simulation selon `docs/EQUILIBRAGE.md` : `npm run balance`, comprendre la cause, puis choisir le levier. **Les PV sont le dernier levier** : d'abord les valeurs et les règles des compétences et des statuts, puis les stats secondaires. Tolérance : entre 42 et 58 %, aucun duel au-delà de 65/35 ; des personnages typés valent mieux que des clones à 50 %. Ne pas changer sans demander une valeur fixée par l'utilisateur : la signaler, avec une proposition chiffrée. Quand on parle de compétences, de statuts ou d'équilibre, appuyer chaque argument sur les statistiques constatées (taux et marge, valeur nette, apport, avant → après, taille d'échantillon) : voir « Argumenter avec des chiffres » dans `docs/EQUILIBRAGE.md`.
- Après un tournoi ou une série de combats de test de l'utilisateur : `npm run logs` (avec `LOGS_SINCE`) rejoue ses combats depuis `logs/combats/`, les audite et les résume ; puis relire les traces marquantes.
- Le format de l'historique (`battler:history:v1`) doit rester rétrocompatible.
- Pour vérifier ou déboguer une résolution : la trace d'un combat (`traceText`, `trace.ts`) se lit sans navigateur, et une graine (`simulateCombat(f, { seed })`) rejoue un combat signalé par l'utilisateur à l'identique. Chaque combat joué sur le serveur de dev écrit sa trace dans `logs/combats/` (un fichier par combat) : c'est là qu'on lit les combats de l'utilisateur. En console, `copy(battler.dump())` copie aussi les derniers. Un combat où l'utilisateur a imposé des dés (combat test, pavé sous chaque combattant) a une trace `_triche` qui liste ces dés : `npm run logs` le rejoue tel quel. Toute nouvelle mécanique ajoute son contrôle à `audit.test.ts`.
- **Essayer une idée de compétence sans la livrer** : `npx vitest run --config vitest.balance.config.ts scripts/lab.report.ts --silent=false` (idées dans `scripts/lab/ideas.ts`, `LAB_ONLY`, `LAB_SERIES`). **Auditer les compétences** (grille de drapeaux rouges) : même commande avec `scripts/skills.report.ts`. Méthode et lecture : `docs/SORTS.md`. Les rapports vont dans `logs/lab/` et `logs/skills/`.
- **Un autre agent peut travailler en même temps** sur le dépôt (il l'a fait pour les sons). Avant de toucher un fichier partagé (`App.tsx`, écrans, `package.json`, `CHANGELOG.md`), regarder ce qui a bougé récemment (`ls -lt`), relire la version en cours, et ne pas écraser son travail. Le serveur de dev ne recharge jamais la page tout seul (`server.hmr` et `server.ws` à `false` dans `vite.config.ts`) : une partie en cours survit aux modifications, et l'utilisateur rafraîchit (F5) pour voir une nouvelle version. Le lui dire à chaque livraison ; ne pas réactiver le rechargement à chaud.
- Vérifier avec `npm run check` (typecheck + tests) et `npx vite build`. Pour voir un rendu : Firefox sans interface, piloté par `puppeteer-core` (`browser: 'firefox'`, `/usr/bin/firefox`), capture la scène en 1600×900 depuis le serveur de dev (Chromium et Playwright ne fonctionnent pas). `puppeteer-core` n'est pas une dépendance du projet : l'installer dans le dossier temporaire de la session (ou réutiliser une installation existante dans `~/.npm/_npx`), et lancer son propre serveur de dev sur un autre port (`npx vite --port 5181 --strictPort`) pour ne pas gêner celui de l'utilisateur. Il ne gère pas `(hover: hover)` : forcer une infobulle à la main pour la voir. Le son n'est jamais vérifiable : le dire, comme tout rendu non vu.
- **Vérification proportionnée** (règle de l'utilisateur, 2026-10-20) : la moindre demande ne doit pas devenir une campagne de tests.
  - **Changement de gameplay** (compétence, statut, règle, stats, personnage) : `npm run check`, le test ciblé de la mécanique dans `combat.test.ts` (et son contrôle dans `audit.test.ts` si elle est nouvelle), puis **un seul** `npm run balance` si l'équilibre peut bouger. Pour comprendre un cas, lire une trace (`traceText`, graine), sans navigateur.
  - **Jamais de combat joué dans le navigateur** (normal ou combat test) pour valider du gameplay : le moteur se vérifie sans écran, et l'écran ne fait que rejouer les `beats`.
  - **Navigateur seulement pour un changement de rendu** (écran, animation, image, mise en page) : une ou deux captures de l'écran touché, pas une tournée des écrans.
  - **Simulations** : pas de relance en boucle pour chaque micro-réglage. Le laboratoire et les séries larges, seulement quand on propose ou mesure un changement d'équilibre.
  - Dire ce qui n'a pas été vérifié, et laisser l'utilisateur juger en jeu plutôt que d'y jouer à sa place.
- **Combat test : un outil de l'utilisateur**, pas un outil de vérification de l'agent. Tant qu'il n'est pas fiable (voir `docs/ETAT.md`, Limites connues, et `docs/TODO.md` § 19), ne pas s'en servir pour valider, et ne pas corriger ses défauts en passant : on n'y touche que sur demande. Une anomalie vue dans le combat test ne prouve pas un défaut du moteur : la rejouer d'abord avec sa trace `_triche` (`npm run logs`).
- Si l'empreinte de non-régression (`balance.test.ts`) casse sans changement de règle voulu, c'est un effet de bord à corriger. Ne la mettre à jour (`npx vitest run -u`) que pour un changement voulu, noté dans le CHANGELOG.
- Images déposées à la racine du projet par l'utilisateur : ce sont des sources brutes. Les compresser (JPG qualité ~82 pour les fonds, PNG optimisé pour les personnages détourés), les renommer en kebab-case anglais selon leur rôle (`arena-<lieu>.jpg`, `menu-<thème>.jpg`, `<race>.png`), les ranger dans `src/assets/`, puis mettre la source à la corbeille (`gio trash`). Aucune image ne doit rester à la racine.
