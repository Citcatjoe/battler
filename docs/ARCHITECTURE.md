# Architecture

## Pile technique

- **Vite 8** et **React 19** (StrictMode), **TypeScript** strict avec `erasableSyntaxOnly`. Le typecheck se fait avec `tsc`, sans émission de fichiers.
- **Tailwind CSS 4** via `@tailwindcss/vite`. Les animations sont des keyframes CSS dans `src/index.css`.
- **Vitest 5** pour les tests (`npm test`).
- **Web Audio API** pour les sons : fichiers enregistrés (`src/assets/sounds/`), avec un son synthétisé en repli.
- **localStorage** pour l'historique et le réglage muet. Aucun backend.

## Arborescence

```
src/
  main.tsx, App.tsx      point d'entrée (App monté derrière l'écran de chargement, LoadingGate) ; App = machine à écrans + état du tournoi
  preload.ts             préchargement avant l'accueil (0.94.0) : postures du roster, arènes, fonds de menu, icônes, sons et musiques
                         (AUDIO_URLS, prefetchAudio de sound.ts), polices ; une image importée ailleurs que dans ces registres s'y ajoute
  index.css              thème (polices), tokens du design system, keyframes d'animation
  env.d.ts               __APP_VERSION__ (injectée par vite.config.ts depuis package.json)
  assets/                images des personnages et de l'arène
  game/                  logique sans interface (sauf useCombat)
    rng.ts               hasard injectable : Rng, seededRng, rollDie, chance, shuffle
    character.ts         CharacterStats, CharacterDef, classe Character (pure donnée), variant()
    poses.ts             postures d'un combattant (POSES, poseOf, poseImage) : l'image change au fil du combat (docs/POSTURES.md)
    statuses.ts          REGISTRE des statuts (auras bonus/malus) : règles + présentation
    states.ts            états affichés (0.79.0) : vocabulaire générique de la zone d'état, place de chaque statut
                         (zone, aura, forme, mécanisme), regroupement, relais des auras, cibles du signal
    relics.ts            REGISTRE des reliques (RELICS) : types, rédaction (describeRelic), validation, offre de tournoi (drawOffer, autoPick) ; docs/RELIQUES.md
    events.ts            déclencheurs (TRIGGERS nommés, faces au-delà du 3 : `face:7`, `double:6` ; faceTrigger, doubleTrigger, rollFace,
                         triggerText), effets (Effect), CharacterEvent
    forge.ts             forge du dé (0.88.0, CAMPAGNE.md § 4) : journal d'opérations (ForgeStep), rejoué sur la définition d'origine
                         (forgeState, forgedEvents, forgedFaces), offre et choix automatique (drawForgeOffer, autoForge), validité
    campaign.ts          campagne (0.88.0) : partie (CampaignRun), boss, réglage des rencontres sur le champion de référence
                         (referenceChampions, tuneHp, encountersFor), récompenses, héritage, sauvegarde
    roster.ts            ROSTER, CHARACTERS, FAMILIES, createCharacter, validateRoster
    arenas.ts            ARENAS : cadres visuels des combats (image, cadrage, traitement)
    catalog.ts           vues de lecture sur les registres : statusCatalog, statusSources, statusLinks (interactions), skillCatalog (compendium)
    rules.ts             RULES : les règles communes, écrites une seule fois (section Règles du compendium)
    combat.ts            MOTEUR : simulateCombat, resolveAttack, effectiveStats, chronologie
    stats.ts             computeStats : bilan d'un combat lu dans la chronologie
    report.ts            combatReport : rapport d'un combat lu dans la chronologie (déclenchements de chaque relique, faces jouées par
                         valeur) ; addReport (cumul), relicsByProcs ; le cumul d'une saison est seasonReport (season.ts)
    narration.ts         textes du journal et badges, générés depuis le registre
    trace.ts             trace de résolution complète d'un combat (traceCombat, traceText), lue dans la chronologie
    debugConsole.ts      trace dans la console du navigateur et sur le disque ; window.battler (trace, traces, dump, replay, play, vcr) ; bascule du magnétoscope (vcrToggle)
    audit.ts             audit de résolution d'un combat, règle par règle (createAudit)
    analysis.ts          analyse d'équilibre : taux, profils, valeur nette des compétences, apport des statuts (npm run balance)
    timing.ts            le rythme du combat à l'écran : une durée nommée par battement (ms à ×1), et TIMING_VARS, les variables CSS qui en dérivent
    staging.ts           MISE EN SCÈNE : stage(result) → moments de cues datées, fonction pure (docs/MOTEUR_V2.md § 4)
    useCombat.ts         LECTEUR : hook qui joue les moments avec une seule horloge (vitesse, pause, arrêt) ; applyCue, mode triche
    scenes.ts            événements de scène (SceneEventId, rythme SCENE_EVENTS : impacts, durée) : présentation seule, le moteur ne les lit pas
    history.ts           historique localStorage, useHistory, normalize
    tournament.ts        arbre à 16 : création, état des matchs, résultats, reliques gagnées (relicsOf, chooseRelic), construction de saison
                         figée des qualifiés (Entrant.build), fighterKey, fillSlots, labelEntrants
    season.ts            phase de saison facultative avant l'arbre (0.86.0) : calendrier aller-retour (seasonSchedule, Berger), graine par match,
                         bilans compacts, simulation sans trace ni historique (simulateSeasonMatches), classement et départage
                         (standings), 16 qualifiés en têtes de série (startBracket, BRACKET_SEEDS) ; construction (0.92.0, 0.92.1) :
                         récompenses de chaque participant (buildRewards), la suivante à chaque victoire, construction d'un participant
                         (buildOf, buildDone), match prêt (seasonStatus), choix de l'observateur (chooseSeasonReward) ; rapport de chaque
                         match dans son bilan (SeasonResult.report, facultatif) et cumul par participant (seasonReport)
    epithets.ts          noms uniques des participants (0.87.0) : EPITHETS, huit épithètes par personnage, et uniqueNames (tirage par Rng)
    betting.ts           paris : quatre parieurs (deux de l'ordinateur), cotes simulées, mises fixes, règlement, coups de théâtre (docs/PARIS.md)
    sound.ts             sfx.*, fichiers son (SOUND_NAMES, MIX), vitesse et réglage muet ; octets de chaque fichier téléchargés une fois
                         (prefetchAudio), décodés au premier geste
    *.test.ts            tests (moteur, modules, équilibre, non-régression)
    test-utils.ts        personnages de test aux jets prévisibles
  components/            écrans (*Screen.tsx), briques d'interface (Tabs, StatusTray, SkillBar, SignalLayer…), screens.test.tsx
    LoadingScreen.tsx    écran de chargement (logo et jauge) et LoadingGate, qui ne monte le jeu qu'une fois preload.ts fini
    Betting.tsx          guichet du match (plateaux, tuiles, pièces), rappel sous le VS, classement, résultat des paris de l'écran de fin (aucune règle : tout vient de betting.ts)
    SceneEvent.tsx       rendu des événements de scène (SCENE_VIEWS : Backdrop sur toute l'arène, OnTarget sur la colonne de la cible), monté par FightScreen
    SkillSeal.tsx        fenêtre octogonale du sceau d'une compétence (asset A-01 à venir, repli sur l'icône peinte)
    RelicSeal.tsx        sceau hexagonal d'une relique, rangée de sceaux avec infobulle (RelicRow), carte de récompense (RelicCard)
    SpecialLabel.tsx     label de la zone de surcharge sous le dé (couleur de sa source, hachures du − ; specials.ts ; docs/design-system.md § 3.1)
    CombatVcr.tsx        magnétoscope de combat (dev seulement, touche V ou battler.vcr()) : pause, pas à pas, retour, ralenti, attentes du moment avec leur constante de timing.ts (docs/MOTEUR_V2.md § 8)
    VsSeal.tsx           sceau « VS » (pièce prestige), accueil et affrontement ; TrophySeal, le même octogone à la coupe gravée, au-dessus de la finale de l'arbre
    kit.tsx              contrôles du UI kit (docs/ui-kit/) : Button, IconButton, ModePair, SegmentedControl, Tool, BackLink, Glyph ; ne posent que les classes du kit
    BattlerIcon.jsx      glyphes de commande, copiés tels quels de docs/ui-kit/ (types : BattlerIcon.d.ts)
    Tabs.tsx             onglets mineurs du kit (.bt-tabs) ; `lead` : repère avant le libellé (pastille d'un camp)
    HomeScreen.tsx       accueil : la porte de l'arène, la haie de combattants, le logo et les modes
    TournamentIntroScreen.tsx  présentation du tournoi (créer, reprendre), entre l'accueil et la configuration
    MatchupScreen.tsx    écran d'affrontement unique (0.100.0), avant chaque combat de duel, d'arbre, de saison ou de campagne :
                         `mode` (MatchupMode, calculé par App.tsx) règle la hauteur des fiches (Layout), les reliques, le retour
                         (BACK_LABEL) ; MatchupCard (fiche à géométrie fixe), ArenaSlider, FighterPicker (sélecteur du duel),
                         Simuler et Parier en SquareButton (DUEL_BETTING : pas de Parier en duel), COMBATTRE en bas
    StatSheet.tsx        stats d'un personnage en barres (STAT_LINES) ; `compare` : meilleur de chaque ligne face à l'adversaire,
                         sur les valeurs affichées (dé en faces, esquive bornée à 0, multiplicateur sans critique perdant)
    homeHedge.ts         configuration de la haie de l'accueil (personnage, côté, plan, taille, position) et assombrissement par plan
    Portrait.tsx         Portrait (vignette cadrée sur le visage) et PortraitTile (tuile cliquable à états)
    SeasonScreen.tsx     phase de saison : classement en une liste (construction de chacun) et ligne de qualification, journée et ses matchs (récompense de la journée), simulation (aucune règle : tout vient de season.ts)
    CampaignScreen.tsx   campagne : choix du champion et de son héritage, carte de l'acte (piste, champion, adversaires et leur bande de
                         danger), récompense (forge puis relique), fin de partie (aucune règle : campaign.ts et forge.ts)
    DieBuild.tsx         section « Dé de dégâts » de la fiche d'affrontement : douze emplacements en deux rangées de six (dieCells :
                         faces de 1 à la taille du dé du moment, compétence de la forme, rang, gravure, dorure ; vides grisés au-delà),
                         « +N faces » au-delà de douze, sélecteur de forme du druide, une infobulle par face
    ForgedDie.tsx        dé forgé face par face (sceau, rune, or, rang, attente ; choix d'une face), carte d'une opération de forge, choix d'une
                         forge partagé (useForgeChoice, ForgeChoice : campagne et écran de victoire), tuile d'une opération faite avec son
                         infobulle (ForgeMark : opération, face ou taille du dé, compétence produite et son rang)
    TipLayer.tsx         calque d'infobulles d'un écran (racine de l'écran) : dedans, RelicRow et ForgeMark ouvrent leur infobulle dans
                         le calque, que le cadre d'une liste qui défile ne coupe pas (classement de saison)
    CombatReport.tsx     rapport de combat (CombatReportPanel, onglet Rapport de l'écran de fin) et de saison (SeasonReport, fin de
                         saison) ; briques partagées : RelicProcs (sceaux et « ×N »), FaceHistogram (faces jouées sur le dé forgé) ;
                         aucune règle : tout vient de report.ts
    compendium/          CompendiumScreen (onglets, filtre par section), registre des sections (sections.tsx),
                         CharactersSection (index et fond : le combattant en grand derrière l'écran) + CharacterSheet
                         (Fiche, Performances), SkillsSection, StatusesSection, RelicsSection, RulesSection,
                         CodexBits (sceaux : octogone d'une compétence, pièce d'un état ; pastilles de statut et de règle, encadrés, résumé d'une compétence)
  dev/                   pages de développement (serveur de dev seulement) : KitReference.tsx (`?kit`), les contrôles du kit
                         disposés comme docs/ui-kit/reference.html, pour comparer leur capture à reference.png ;
                         MatchupReference.tsx (`?matchup=<cas>`), l'écran d'affrontement sur les cas des références
                         docs/ref/affrontement-*.png (duel, duel-droit, tournoi, saison-son, et les cas de la géométrie fixe ;
                         fiches factices construites par les vraies fonctions du jeu, panneau du son ouvert par SoundToggle initialOpen) ;
                         BracketReference.tsx (`?bracket=survol|paris|reel|fini`), l'arbre du tournoi sur un tournoi factice
                         (createTournament, simulateCombat), carte survolée et panneau Paris forcés (docs/ref/tournoi-*.png)
```

## Principe central : un moteur, une chronologie

```
                         rng (injecté)
                              │
Pair<Character> ──▶ simulateCombat ──▶ CombatResult { initiative, beats[], turns, winner, endedBy }
                                              │
              ┌───────────────────────────────┼──────────────────────────────┐
              ▼                               ▼                              ▼
   stage → useCombat (rejoue)     computeStats (bilan)        withResult (arbre) / recordMatch (historique)
```

- **Seul `simulateCombat` applique des règles et tire des dés.** Jouer un combat ne fait que rejouer son résultat. Les écrans ne recalculent rien.
- **Le hasard est injecté** (`{ rng }`). Avec `seededRng(graine)`, un combat est reproductible à l'identique, ce qui le rend testable. Par défaut, `Math.random` est utilisé.
- **La chronologie** (`beats`) est une suite d'étapes, chacune avec l'état complet qui en résulte (`state` : PV et statuts des deux camps). Chaque étape porte aussi ses champs communs (`BeatFields`, [MOTEUR_V2.md](MOTEUR_V2.md) § 3) : son rang `id` (index dans `beats`), sa `phase` (`shift`, `turnStart`, `action`, `turnEnd`), le maître du tour `owner` donné par le moteur, et `cause`, le rang de l'étape qui l'a provoquée (absent pour une étape racine ; règles dans [RESOLUTION.md](RESOLUTION.md) § 2, « Ce que le moteur dit de chaque étape »). Une étape émise n'est plus jamais modifiée après coup.

| Étape | Contenu |
| --- | --- |
| `attack` | dé, faces, coup sacrifié (`forfeited`), esquive (imposée ou non, `dodgeForced`, et son statut `dodgeBy`), critique (forcé ou non, `critForced`, et son statut `critBy`), dégâts bruts, armure, boucliers (`shields`, liste ordonnée `{ status, absorbed }`), force du coup (`damage`) et PV réellement retirés (`dealt`, plafonnés aux PV restants : c'est la valeur comptée dans les stats) |
| `event` | événement déclenché : porteur, déclencheur, effets réellement appliqués |
| `statusTick` | effet de début de tour d'un statut (ex. poison) |
| `statusAge` | usure d'une phase (2026-10-21) : durées décomptées (`changes`, tours avant → après) et statuts éteints (`expired`) en une seule étape ; a pour cause l'effet (`statusTick`) du statut qu'elle use |
| `statusReaction` | réaction d'un statut dans une fenêtre (Épines, Riposte et jauges de Rétribution sur `hurt`, Vol de vie sur `hit`) |
| `skip` | action perdue (Étourdi) |
| `flurry` | un statut donne plusieurs coups à l'action (Furie des vents) |
| `relic` | une relique se déclenche (moment du coup, début de tour, seuil de PV) : porteur, relique, effets, rang du déclenchement (`uses`) ; le bonus de coup d'une relique est noté sur le coup (`Attack.relicBonus`) |

- Lecture d'un résultat : `attacksOf`, `eventsOf`, `finalState`. On ne fouille jamais les `beats` à la main dans les écrans.

## Déroulé d'un combat (combat.ts)

Les règles sont spécifiées dans **[RESOLUTION.md](RESOLUTION.md)**. Côté code :

| Règle | Fonction |
| --- | --- |
| Tour en trois phases (début, action, fin) | boucle de `simulateCombat` |
| Effets périodiques (bonus puis malus) et durées d'une phase | `statusPhase(side, phase)`, `tickDurations(list, phase)` |
| Fenêtre de déclenchement : réactions des statuts, puis événements | `fire(side, trigger)`, `fireAll` |
| Contrôle (action perdue) | étape « Phase 2 » de la boucle (`skipsAction`) |
| Chaîne de calcul d'une attaque | `resolveAttack` (ordre des tirages fixe : dé → esquive → critique) |
| Application d'un statut : immunité → garde → opposition → cumul | `resolveApplication` (`statuses.ts`), appelée par `applyEffect` |
| Vérification d'état (K.O.) après chaque effet, puis seuils de PV (mi-PV, reliques de seuil) | `applyEffects`, `fallen`, `checkThresholds` |
| Reliques : après les compétences dans chaque fenêtre ; charges, recharge, conditions ; bonus de coup | `fire`, `fireRelic`, `checkThresholds`, `resolveAttack` |

Étapes de la chronologie : `attack`, `event`, `statusTick` (avec `phase`), `statusAge` (avec `phase`), `statusReaction` (Vol de vie, Riposte et jauges en sont), `skip`, `flurry` (coups multiples), `pair`, `coin`, `shift`, `relic`. Chacune a sa mise en scène dans `stage` (`staging.ts`) : un `switch` exhaustif (`satisfies never`) refuse un type oublié. Les effets d'une étape, quelle que soit leur source, se lisent avec `beatEffects` (stats, audit).

## Du moteur à l'écran (staging.ts, useCombat.ts, timing.ts)

Le contrat complet : [MOTEUR_V2.md](MOTEUR_V2.md) § 4 et 5.

- **`stage(result, { test })`** (fonction pure, testée sans navigateur dans `staging.test.ts`) découpe la chronologie en **moments** : une étape racine et celles qui en découlent par `cause`, dans le même tour, jamais d'après l'étape voisine. Chaque moment est une liste de **cues** datées (`at`, ms à ×1 depuis son début) sur un canal : `dice`, `strike`, `blow`, `float`, `aura`, `special`, `specialsClear`, `sound`, `hp`, `statuses`, `log`, `skillPulse`, `relicPulse`, `relicUse`, `signal`, `scene`, `form`, `turn`, `winner`. Le premier moment est l'ouverture (initiative), le dernier la fin du combat. `rolls` : les points d'attente du combat test (avant chaque étape qui lance des dés).
- Ce que `stage` décide : ce qui tombe à l'impact d'un coup (la plaie qui coule, le poison posé par le coup, la compétence qui accompagne un coup qui touche), la compétence qui tombe avec son dé (coup sacrifié, double), les décomptes montrés avec l'effet de leur statut, les PV de chaque partie d'une série de coups (de proche en proche, vérifiés contre l'état du moteur en développement), un seul son par nom et par instant.
- **`useCombat`** applique les cues à leur instant avec une seule horloge (`requestAnimationFrame`, vitesse, pause) : l'écran est le résultat de `applyCue(view, cue)` (pure, exportée), les sons sont joués tels quels. Les textes flottants sont une liste par combattant (`View.floats`), chacun retiré après `FLOAT_LIFE` à l'horloge du combat. Mode triche : imposer un dé relance `simulateCombat` puis `stage`, et la lecture reprend au même instant du même moment.
- **`timing.ts`** : toutes les durées. Les animations CSS qui doivent rester d'accord avec elles lisent `--t-lunge`, `--t-lunge-fast`, `--t-signal`, `--t-coin-spin`, `--t-read`, `--t-float`, `--t-title`, posées sur `.arena` par `FightScreen` (`TIMING_VARS`). La secousse de l'arène (`SHAKE`, `SHAKE_HEAVY`) suit la vitesse et se fige en pause. `stage` n'attend que par `hold('NOM')` (une constante de `timing.ts`) ou `wait(ms, 'libellé')` (durée calculée) : chaque moment garde ses attentes nommées (`Moment.spans`).
- **Magnétoscope** (développement, `CombatVcr.tsx`, [MOTEUR_V2.md](MOTEUR_V2.md) § 8) : avec l'option `vcr` (la racine de l'arène), `useCombat` publie sa position (`vcr.snapshot`) et se déplace (`vcr.seek`, `stepCue`, `nextMoment`, `prevMoment`, `restartMoment`) en repliant les cues avec `applyCue` ; il recale les animations CSS de l'arène (`flushSync` instant par instant, `currentTime`). Désactivé en combat test.
- Ajouter un type d'étape : sa mise en scène dans `stageBeat` (`staging.ts`), ses durées dans `timing.ts`, son contrôle dans `staging.test.ts`. Ajouter un canal : son type dans `CueBody`, son effet dans `applyCue`.

Les stats effectives (`effectiveStats`) = stats de base modifiées par les statuts, puis bornées : armure ≥ 0, chances dans [0, 1], dé ≥ 1, multiplicateur ≥ 1. Les PV max ne changent jamais.

## Étendre le jeu

### Ajouter un personnage
1. Mettre l'image dans `src/assets/<race>.png` (voir `docs/STYLE_BIBLE.md`). Une image générée sur fond uni se détoure avec `python scripts/cutout-character.py <source.png> src/assets/<race>.png [aperçu.png]` (numpy, pillow, scipy ; la machine n'en a pas en standard, passer par un environnement `python -m venv`) ; vérifier ensuite l'aperçu, surtout les lames et les reflets gris.
   - **Postures** (facultatives, [POSTURES.md](POSTURES.md)) : la garde générée d'abord, puis une planche par posture avec la garde en première case, puis `python scripts/slice-poses.py <nom> a.png:2x1:idle,attack … --fond`. Dans `look` : `image: <nom>-idle.png`, `poses: { attack, dodge, hurt, ko, victory }` (une posture absente retombe sur la garde), `scale` calculé sur la part de la toile qu'occupe la garde et `headroom` (part vide au-dessus de la tête), portrait recadré. `figureHeight(look)` (`character.ts`) donne la hauteur du personnage dans son conteneur, pour placer la zone d'état et les effets. Si la toile est bien plus large que la garde (fente de l'attaque), `bodyInset: { left, right }` (vide de part et d'autre de la garde, en part de la largeur) cale l'ancrage `inside` sur la silhouette.
2. Dans `roster.ts`, créer un `CharacterDef` : stats, `look` (`image`, `facing`, `scale` selon l'échelle resserrée de `STYLE_BIBLE.md` § 2, cadrage du portrait `{x, y, zoom}`), `lore` (fiche courte) et `events`. Puis ajouter sa section dans `docs/PERSONNAGES.md` (voir la check-list en fin de document).
3. Un seul personnage par famille (0.43.0) : plus de variantes de coloris (`variant()` et `baseId` sont retirés).
   - **Personnage à formes** (druide) : `forms: [{ id, name, statuses? }, { id, name, statuses?, look: { image, portrait } }]`. Chaque compétence de forme porte `form: '<id>'`. Le moteur bascule la forme au début de chacun de ses tours, sauf le premier (étape `shift`) ; `Fighter` fait le fondu, et `Character.lookFor(form)` donne l'apparence.
   - **Statuts de forme** (0.73.0) : `statuses` d'une forme liste des statuts marqués `innate: true` dans `STATUSES` (Incantation, Force de l'ours). Le moteur les pose au début du combat (première forme) et à chaque `shift`, et retire ceux de la forme quittée ; une purge (`cleanse`) les ignore, aucune immunité ne les bloque. `validateRoster` refuse un statut de forme non `innate` et une compétence qui pose un statut `innate` ; l'audit vérifie à chaque étape que le porteur a exactement les statuts de sa forme.
   - **Personnage à deux dés** (barde) : `twinDice: true`. L'action devient une paire (étape `pair`, `twinAction` dans `combat.ts`). Ses compétences sont sur les doubles (`doubleOne` à `doubleFive`, puis `double:6`… pour un dé forgé : `doubleTrigger`), sans `chance` ni `forfeitsHit` (`validateRoster`) ; `volley: n` pour attaquer (n coups de la face), avec `merged` pour un seul coup qui vaut leur somme. Les coups de la paire portent `preset` (aucun dé lancé) ; le combat test compte les dés par étape avec `diceOf` et `rankAt`.
   - **Coup transformé** : `reshapesHit: { value: 'max' | 'reroll', bonus?, noCrit? }` au lieu de `forfeitsHit` (sans porteur depuis la 0.73.0 ; Charge et Coup de griffe avant), avec `effects: []`. L'icône d'une compétence va dans `SKILL_ICON` (`Icon.tsx`), son futur sceau peint (asset A-01) dans `SKILL_SEAL` (`SkillSeal.tsx`). Sa nature (`nature?: 'martial' | 'finesse' | 'arcane'`, arcane par défaut) colore seulement sa carte.
   - **Événement de scène** (0.73.0, Foudre) : `scene: '<id>'` sur la compétence. Voir « Ajouter un événement de scène ».
4. L'ajouter à `ROSTER`. La sélection (rangée par famille via `FAMILIES`), les fiches, les statistiques et le tournoi le prennent en compte automatiquement.
5. `npm run check` : `validateRoster` vérifie les données, le test d'équilibre vérifie la tolérance (entre 42 et 58 %, aucun duel au-delà de 65/35) ; `npm run balance` donne le rapport détaillé (docs/EQUILIBRAGE.md), et l'empreinte de non-régression doit être mise à jour (`npx vitest run -u`), puisque le roster a changé.

### Ajouter une relique
Une entrée dans `RELICS` (`relics.ts`), un seul type (`stats`, `rollBonus`, ou `trigger` + `effects`), son icône `src/assets/icons/<id>.png` ; puis `npm run check` et `npm run relics`. Marche à suivre, règles et mesures : [RELIQUES.md](RELIQUES.md) § 8. Côté moteur : `Character.relics` (stats ajoutées à plat dans `stats`, la base dans `baseStats`, `withRelics`), `fire`, `fireRelic`, `checkThresholds`, `resolveAttack` ; contrôle dans `auditRelics` (`audit.ts`) ; trace : en-tête relu par `parseRelics` (`npm run logs`).

### Donner la forge du dé à un mode (tournoi, duel…)
La forge est une donnée du personnage, comme ses reliques (`forge.ts`, règles : [CAMPAGNE.md](CAMPAGNE.md) § 4). La campagne (`campaign.ts`) et la construction de la saison (`season.ts`, `drawReward`, 0.92.0) la donnent déjà. Pour qu'un autre mode la donne :
1. Garder le journal du participant (`ForgeStep[]`), ou le déduire des résultats, comme `buildOf` dans `season.ts`.
2. À la récompense : `drawForgeOffer(personnage.definition, journal, rng, ENGRAVABLE_SKILLS)`, le choix par défaut `autoForge(…)`, puis `withForgeStep(…)` pour l'ajouter (une opération impossible lève une erreur).
3. Au combat : `createCharacter(id).withForge(journal).withRelics(…)`. Le moteur, la trace (en-tête `Forge (…)`, relu par `npm run logs`), l'audit, la barre des compétences et les cotes suivent sans rien de plus. Pour valider un résultat : `fighterKey` (personnage, reliques, forge).
4. À l'écran : `useForgeChoice` et `ForgeChoice` (cartes de l'offre, puis la face sur `ForgedDie`), comme la récompense de `CampaignScreen` et le menu Récompense d'`EndScreen` ; `ForgeMark` pour une opération déjà faite.

### Ajouter une arène
1. Préparer l'image (16:9, sol dégagé en bas au centre, voir `docs/STYLE_BIBLE.md`), la ranger dans `src/assets/arena-<lieu>.jpg`.
2. Ajouter une entrée dans `ARENAS` (`arenas.ts`) : `id`, `name`, `image`, `focus` (`object-position` qui place le sol sous les pieds) et `filter` (assombrir davantage un décor très lumineux).
3. L'écran d'affrontement la propose automatiquement, ainsi que le tirage « Au hasard ».

### Ajouter un événement à un personnage
Ajouter une entrée `{ id, name, trigger, effects, chance?, limit?, when?, forfeitsHit?, needsTouch? }` dans son `events`. Aucun autre fichier à toucher. `forfeitsHit` (déclencheurs du dé seulement, sans `chance`) sacrifie le coup qui déclenche la compétence : le moteur le sait dès le jet (`forfeits`, `combat.ts`). `needsTouch` (0.70.0, Pourfendre ; déclencheurs du dé, sans `chance`, `forfeitsHit` ni `reshapesHit`) garde le coup et ne déclenche la compétence que s'il touche (`strikeTouched`, `fireStrike`).

`when` est une liste de **conditions**, toutes requises, vérifiées au moment du déclencheur et **avant** le tirage de `chance` (une condition fausse ne consomme pas de hasard) :

| Condition | Vraie quand |
| --- | --- |
| `{ type: 'hpBelow', who, ratio }` | PV de `who` (`self` ou `opponent`) < `ratio` × PV max |
| `{ type: 'hpAtLeast', who, ratio }` | PV de `who` ≥ `ratio` × PV max |
| `{ type: 'hasStatus', who, status, stacks? }` | `who` porte `status` avec au moins `stacks` charges (1 par défaut) |
| `{ type: 'lacksStatus', who, status }` | `who` ne porte pas `status` |
| `{ type: 'fromTurn', turn }` | tour en cours ≥ `turn` |

Ajouter un type de condition : étendre `Condition` (`events.ts`), `conditionMet` (`combat.ts`), `describeCondition`, la validation dans `validateRoster`, et un test dans `combat.test.ts` (section « conditions »).

### Ajouter un statut (aura positive ou négative)
Ajouter une entrée dans `STATUSES` (`statuses.ts`) et son id dans `StatusId`. Chaque entrée porte :
- sa **présentation** : `name`, son icône peinte dans `STATUS_ICON` (`Icon.tsx` ; **jamais d'emoji**, une icône manquante se demande à l'utilisateur), `polarity` (bonus ou malus), `summary` (une phrase pour le compendium), `describe`, `badge` ;
- son **cumul** : `add` (les charges s'additionnent) ou `refresh` (l'application remplace l'existant), et un plafond facultatif `maxStacks` ;
- ses **règles**, toutes facultatives :

| Crochet | Effet |
| --- | --- |
| `modifyStats` | modifie les stats effectives du porteur (armure, esquive, critique…) |
| `modifyOutgoing` | modifie les dégâts du porteur avant l'armure |
| `modifyFinal` | modifie les dégâts finaux du porteur, après l'armure et les boucliers, au moins 1 (Aura mélodieuse, Fausse note) |
| `spentOnHit` | le statut disparaît quand un coup du porteur touche (Fausse note) |
| `forcesCrit` | le prochain coup qui touche est critique, et consomme une charge |
| `forcesDodge` | le prochain coup reçu est esquivé sans tirage, et consomme une charge |
| `drainsHit` | le prochain coup qui touche rend les PV retirés (étape `statusReaction` sur `hit`), et consomme une charge |
| `extraStrikes` | coups supplémentaires à la prochaine action ; le statut est consommé au début de l'action (étape `flurry`) |
| `extraDie` | faces du dé des coups supplémentaires (le d3 de Coup de chance) ; la couleur du dé vient de `look.dieColor` |
| `reflectsHit` | Riposte : part des PV retirés renvoyée à l'attaquant sur le prochain coup qui touche ; consommé |
| `immune` | bloque toute pose d'une polarité, sans s'user (Aura d'immunité) ; vérifié dans `resolveApplication` après les immunités du personnage |
| `fillsOnHurt` | statut à jauges (`Status.slots`) : rempli par les coups qui touchent le porteur, seulement s'il a un effet `release` de ce statut |
| `coinToss` | Pile ou face : une pièce remplace l'action suivante (étape `coin`), pile = `damage` dégâts directs, face = rien |
| `shield` | absorbe jusqu'à `stacks` points après l'armure, et s'use d'autant |
| `onTurnStart` | effets appliqués au porteur au début de chacun de ses tours |
| `onTurnEnd` | effets appliqués au porteur à la fin de chacun de ses tours |
| `expiresAt` | moment où la durée se décompte : `turnStart` (défaut) ou `turnEnd` |
| `modifyIncoming` | modifie les dégâts reçus par le porteur avant l'armure |
| `skipsAction` | le porteur perd son action (une charge par tour perdu) |
| `reactions` | effets déclenchés par un `Trigger`, du point de vue du porteur (sans chaîne) ; pendant un coup, seuls les statuts présents au début du coup réagissent, avec au plus leurs charges de ce moment (`strikeBase`, RESOLUTION règle 9, 2026-10-21) ; hors d'un coup, ceux présents à l'ouverture de la fenêtre |
| `mechanic` | `skill` ou `form` : mécanisme d'une compétence ou d'une forme (`isMechanic`) ; jamais purgé, jamais bloqué (immunité, garde, opposition), hors des comptes de bonus et malus |
| `spentOnReaction` | le statut disparaît après avoir réagi une fois (prêt, posé par personne) |
| `decays` | le statut perd une charge chaque fois qu'il agit : au début ou à la fin du tour (Poison), ou après une réaction (Saignement, 0.68.0), dans la même étape que son effet |
| `look` | présentation seulement : liseré (`glow`), halo d'aura (`aura`), transparence (`opacity`), tremblement (`motion: 'tremble'`), couleur du dé supplémentaire (`dieColor`) |
| `wards` | bloque la pose de statuts (une polarité ou une liste) ; une charge par blocage |
| `opposes` | statut contraire, réciproque (test) : charges annulées une à une |

La durée est portée par l'instance : `turns` (facultatif) correspond au nombre de tours du porteur avant expiration, jamais décomptée à la fin du tour où le statut a été posé (`FighterState.fresh`) ; sans `turns`, le statut dure jusqu'à épuisement de ses charges. La zone d'état (`StatusTray`, avec le nombre choisi par `statusCounter`), les auras au sol, le journal, les badges et le compendium suivent automatiquement : `statusRuleSections` traduit les crochets en phrases (Effet, Consommation) et renvoie le cumul et le plafond aux règles communes (`rules.ts`), `statusCatalog` (`catalog.ts`) indique qui le met en jeu (compétence, relâche, ou autre statut par ses crochets) et `statusLinks` ses interactions. Depuis la 0.79.0, il faut aussi lui donner **sa place** dans `STATUS_PLACE` (`states.ts`, le type l'exige) : `tray` et l'état générique qu'il alimente (un état existant de `STATES` de préférence : c'est le vocabulaire commun ; sa part du total si l'état en compte un), `aura` et ses relais (l'état qu'elle fait apparaître chez son porteur ou chez l'adversaire), `form` ou `skill`. L'en-tête (`SkillBar`), la zone d'état (`StatusTray`) et le signal d'activation (`SignalLayer`) suivent. Un état nouveau s'ajoute à `STATES`, avec son icône dans `STATE_ICON` (`Icon.tsx`). Enfin, on ajoute le statut au catalogue de `docs/STATUTS.md`.

S'il faut un **nouveau type de crochet** (ex. renvoi de dégâts), on l'ajoute à `StatusDef` et on l'appelle à un endroit précis de `simulateCombat` ou de `resolveAttack`, puis on le teste dans `combat.test.ts`.

### Ajouter un déclencheur
1. L'ajouter au type `NamedTrigger` et à `TRIGGERS` (libellé). Une face du dé ou un double au-delà de ceux du roster n'a pas besoin d'un nom : `faceTrigger(n)` donne `face:n` (au-delà du 3), `doubleTrigger(n)` donne `double:n` (au-delà du 5), et `triggerText` les libelle.
2. Appeler `fire(side, 'nouveau')` au bon moment dans `simulateCombat`, et documenter cet ordre ici.
3. Ajouter un test dans `combat.test.ts` (section « événements »).

### Ajouter un événement de scène
Présentation seule (0.73.0) : un sort ou un coup spécial à grand spectacle, joué sur toute l'arène quand la compétence part, avant que ses effets tombent. Le moteur ne le lit pas.
1. Un identifiant dans `SceneEventId` et son rythme dans `SCENE_EVENTS` (`scenes.ts`) : `impacts` (instants des coups, en ms à ×1 ; 0.76.0, remplace `impact`) et `length` (durée totale). Chaque coup tombe sur son impact (`blows(…, schedule)`, `staging.ts`) : un sort en plusieurs coups porte un effet `damage` avec `hits` (`{ type: 'damage', amount: 2, hits: 3 }`, comptés ensemble, détail dans `parts`), et autant d'impacts.
2. Son rendu dans `SCENE_VIEWS` (`SceneEvent.tsx`) : `Backdrop` (toute l'arène, sous les combattants, avec un éclat par-dessus) et, s'il vise quelqu'un, `OnTarget` (dans la colonne de la cible).
3. `scene: '<id>'` sur la compétence (`CharacterEvent.scene`, `roster.ts`). La mise en scène émet la cue `scene` quand la compétence part ; `useCombat` expose l'événement en cours (état `scene`), au rythme de la vitesse et de la pause ; `FightScreen` le monte. Exemple : `lightning` (Foudre du druide : trois éclairs, `impacts: [440, 800, 1160]`, `length: 1750`).

### Ajouter un type d'effet
Étendre `Effect` (`events.ts`) et `AppliedEffect` (`combat.ts`), puis traiter le nouveau cas dans `applyEffect`, `describeEffect`, `effectText` et `effectBadge`. TypeScript signale chaque `switch` oublié. Ajouter aussi un test.

### Ajouter un label de la zone de surcharge
Présentation seule (2026-10-21) ; ce qui entre dans la zone, l'ordre et le point de vue : [RESOLUTION.md](RESOLUTION.md) § 11. Le registre unique `specials.ts` construit chaque label (`attackSpecials` pour ce qui se lit dans un `Attack`, `reactionSpecial` pour une étape de réaction, `relicSpecial` pour une relique qui se déclenche, `statusSpecial` dessous) : sa source donne sa couleur (`SPECIAL_SOURCES`, [design-system.md](design-system.md) § 3.1), son signe, vu de l'attaquant, donne son son (`SPECIAL_SIGNS`, [SONS.md](SONS.md) § 4.4). `staging.ts` ne fait que poser le label avec `addSpecial(spec)` à l'instant où il s'applique (une cue `special`, et la cue `sound` de son signe) : jamais de libellé, de couleur, de signe ni de son au point d'appel. Un statut est une surcharge par sa mécanique (`isSurcharge`) : rien à déclarer pour un nouveau statut de ces familles. Une nouvelle surcharge lisible dans `Attack` s'ajoute à `attackSpecials`, à sa place dans l'ordre du livre de règles ; une nouvelle source s'ajoute à `SPECIAL_SOURCES`, avec sa ligne dans design-system.md.

### Ajouter une section au compendium
Principe : **une donnée, une maison**. Chaque information est décrite dans une seule section ; ailleurs, elle n'apparaît qu'en résumé, avec un lien vers elle. Le texte d'une compétence vient de `describeSkill` (`events.ts`), celui d'un statut de son registre et de `statusRuleSections`, une règle commune de `RULES` (`rules.ts`) : aucun composant ne rédige.
1. Écrire le composant de la section dans `src/components/compendium/` : il reçoit `SectionProps` (`nav`, `focus`, `filter`), occupe toute la hauteur disponible (`h-full min-h-0`) et défile lui-même **dans un cadre visible** (`codex-panel`, avec un peu de marge intérieure pour que les sceaux ne touchent pas le bord) : rien ne déborde. `focus` est l'élément visé par un lien (`useFocusRef` le fait défiler au centre).
2. L'ajouter à `CompendiumSectionId` et à `COMPENDIUM_SECTIONS` (`sections.tsx`) : `id`, `label`, `count` facultatif, `placeholder` du filtre, `render(props)` et, au besoin, `backdrop(props)` : un fond dessiné derrière tout l'écran (en `-z-10`, l'écran isole sa pile), comme le combattant de la section Combattants. Un lien vers un élément se fait par `nav.go({ section, id })`.
3. Les données viennent des registres, ou d'une vue de `catalog.ts`, jamais d'un texte recopié. Une règle commune se cite par son id (pastille vers la section Règles) au lieu d'être répétée.
4. L'ajouter au test de rendu (`screens.test.tsx` parcourt déjà `COMPENDIUM_SECTIONS`) et à `FEATURES.md` § 9.

## Vérifier une résolution, déboguer un combat

Chaque combat de l'application est tiré avec une graine (`simulateCombat(fighters, { seed })`, `randomSeed()`), conservée dans `CombatResult.seed`. `trace.ts` raconte la chronologie ligne par ligne sans rien recalculer, décomptes de durée compris (étape `statusAge`). `debugConsole.ts` l'écrit dans la console à chaque combat et l'envoie au serveur de dev, qui l'écrit dans `logs/combats/` (greffon `combatLogs` de `vite.config.ts`, point d'entrée `POST /__battler/combat-log` ; dossier ignoré par git). Il expose `battler.trace()`, `battler.traces`, `battler.dump()` (toutes les traces gardées, à copier avec `copy(…)`) et `battler.replay(graine, gauche, droite)`. Chaque coup enregistre ses modificateurs de dégâts (`Attack.modifiers`, statut, porteur, variation), pour que la trace et le journal les montrent sans rien recalculer. `audit.test.ts` revérifie la chronologie de milliers de combats, règle par règle : y ajouter un contrôle pour toute nouvelle mécanique. **Dés imposés (combat test)** : `simulateCombat(f, { seed, forcedRolls })` impose des dés par rang (les dés de chaque étape, voir `diceOf`, `rankAt` et `dieAt`), sans changer la suite du hasard. `useCombat` résout à nouveau le combat à chaque dé imposé et poursuit la lecture sur la nouvelle chronologie (la boucle relit `current.beats` à chaque étape ; les rafales et les anticipations sont repérées par index). Avec l'option `test` (écran `TestFightScreen.tsx`, `FightScreen` avec `test` et `arena={null}`), la lecture s'arrête avant chaque dé (`choose`, `CheatState.waiting`) jusqu'au choix du joueur sur le pavé du combattant (`CheatPad.tsx`, un par camp) ; « Hasard » laisse le dé tiré. Les combats normaux n'ont plus de pavé. La trace écrit les dés imposés, que `parseForcedRolls` relit. Pour un rapport de bug, coller la trace copiée (bouton « Copier la trace ») : la graine et les deux identifiants suffisent à rejouer le combat, y compris dans un test.

**Revoir un combat à l'écran** (0.81.1) : `battler.play(graine)` retient une graine pour le prochain combat lancé par `runCombat` (`App.tsx` : Jouer, Simuler, match de tournoi), via `nextSeed()` de `debugConsole.ts`, une seule fois ; `battler.play(null)` l'annule. Les combattants se choisissent à l'écran, dans l'ordre (gauche, droite) de la graine notée. Le combat test garde sa propre graine.

Une nouvelle étape de chronologie doit recevoir sa ligne dans `beatLines` (`trace.ts`) : TypeScript refuse un type d'étape oublié.

## Rendu

- `Stage.tsx` dessine une scène fixe de **1600×900**, mise à l'échelle par `transform`. Dans les écrans, on raisonne en pixels de cette scène : pas de breakpoints `sm:` ni d'unités `vh`.
- Les animations de combat dépendent de la variable CSS `--speed`. Le tremblement de l'arène passe par la Web Animations API sur une ref.
- `Fighter` affiche l'image (orientation, échelle, teinte), les effets du coup, l'aura et le titre de l'événement dont il est la source, les badges des effets qui le visent, et une aura au sol pour ses statuts actifs : verte pour les bonus, rouge pour les malus.
- L'arbre du tournoi (`Bracket.tsx`) est placé en pixels absolus avec des connecteurs SVG. Sa racine est en `pointer-events-none`. En suivi, `next` cadre d'or le prochain match ; les actions d'un match prêt (`SquareButton size="sm"`) n'apparaissent qu'au survol, au focus ou sur écran tactile (`.bracket-actions`, `index.css`).

## Données persistées

- `battler:history:v1` : totaux par personnage, bilans par adversaire, 300 derniers combats. `normalize` complète un historique enregistré par une version antérieure. Un changement incompatible impose de changer la clé (`v2`). Les combats de campagne n'y entrent pas.
- `battler:muted` et `battler:music-muted` : réglages du son et de la musique. Absents, ils valent « coupé » (0.68.2) ; seul `'0'` rallume.
- `battler:campaign:v2` (0.89.0 ; `v1` en 0.88.0, oubliée) : la partie de campagne en cours (`CampaignRun` : graine, champion, journal de forge, reliques, gains, combats, rencontres du nœud, récompense en attente : une relique ou une forge). Illisible avec les règles du moment (forge impossible), elle est oubliée (`loadRun`).
- `battler:campaign-heritage:v1` (0.88.0) : par personnage, les gains héritables de sa dernière partie qui a rapporté quelque chose.
- Le tournoi n'est jamais persisté.

## Tests (`npm test`, ou `npm run check` pour typecheck + tests)

| Fichier | Couvre |
| --- | --- |
| `combat.test.ts` | reproductibilité, invariants sur tous les duels, chaque statut, chaque déclencheur, `chance` et `limit`, K.O. par effet, limite de tours |
| `modules.test.ts` | rng, validation du roster, cohérence des stats, narration, catalogues, trace de résolution et graine, tournoi (100 tournois complets, refus des matchs invalides), historique |
| `balance.test.ts` | équilibre (entre 42 et 58 %, aucun duel au-delà de 65/35, via `analysis.ts`) et empreinte de non-régression (instantané) |
| `audit.test.ts` | audit de résolution (`audit.ts`, `createAudit`) : milliers de combats revérifiés étape par étape |
| `scripts/logs.report.ts` | rapport des combats joués (`npm run logs`) : rejoue `logs/combats/` depuis les graines, compare, audite, résume ; écrit dans `logs/reports/` |
| `scripts/balance.report.ts` | rapport d'équilibre détaillé (`npm run balance`, config `vitest.balance.config.ts`), écrit dans `logs/balance/` |
| `scripts/campaign.report.ts` | mesure de la campagne (`npm run campaign`, `CAMPAIGN_RUNS` parties par champion en pilote automatique) : profondeur, boss atteint, acte gagné ; écrit dans `logs/campaign/` |
| `components/screens.test.tsx` | rendu de chaque écran avec de vraies données |

**Empreinte de non-régression** : si elle casse alors qu'aucune règle ne devait changer, c'est un effet de bord. Si le changement est voulu, on met à jour l'instantané avec `npx vitest run -u` et on le note dans le CHANGELOG.

## Conventions

- Textes de l'interface et commentaires en français ; identifiants de code en anglais.
- Logique de jeu pure et immuable dans `game/`. Aucun `Math.random` dans les règles : tout passe par un `Rng`.
- Aucune règle ni aucun texte propre à un statut, un événement ou un personnage en dehors de son registre (`statuses.ts`, `roster.ts`).
- Formatage : Prettier, sans point-virgule, avec guillemets simples et lignes de 120 caractères (`npx prettier --no-semi --single-quote --print-width 120 --write <fichiers>`).
