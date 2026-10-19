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
  main.tsx, App.tsx      point d'entrée ; App = machine à écrans + état du tournoi
  index.css              thème (polices), tokens du design system, keyframes d'animation
  env.d.ts               __APP_VERSION__ (injectée par vite.config.ts depuis package.json)
  assets/                images des personnages et de l'arène
  game/                  logique sans interface (sauf useCombat)
    rng.ts               hasard injectable : Rng, seededRng, rollDie, chance, shuffle
    character.ts         CharacterStats, CharacterDef, classe Character (pure donnée), variant()
    statuses.ts          REGISTRE des statuts (auras bonus/malus) : règles + présentation
    events.ts            déclencheurs (TRIGGERS), effets (Effect), CharacterEvent
    roster.ts            ROSTER, CHARACTERS, FAMILIES, createCharacter, validateRoster
    arenas.ts            ARENAS : cadres visuels des combats (image, cadrage, traitement)
    catalog.ts           vues de lecture sur les registres : statusCatalog, statusSources, skillCatalog (compendium)
    combat.ts            MOTEUR : simulateCombat, resolveAttack, effectiveStats, chronologie
    stats.ts             computeStats : bilan d'un combat lu dans la chronologie
    narration.ts         textes du journal et badges, générés depuis le registre
    trace.ts             trace de résolution complète d'un combat (traceCombat, traceText), lue dans la chronologie
    debugConsole.ts      trace dans la console du navigateur et sur le disque ; window.battler (trace, traces, dump, replay)
    audit.ts             audit de résolution d'un combat, règle par règle (createAudit)
    analysis.ts          analyse d'équilibre : taux, profils, valeur nette des compétences, apport des statuts (npm run balance)
    useCombat.ts         hook qui rejoue la chronologie avec timing, pause et vitesse
    history.ts           historique localStorage, useHistory, normalize
    tournament.ts        arbre à 16 : création, état des matchs, résultats, fillSlots
    betting.ts           paris : quatre parieurs (deux de l'ordinateur), cotes simulées, mises fixes, règlement, coups de théâtre (docs/PARIS.md)
    sound.ts             sfx.*, fichiers son (SOUND_NAMES, MIX), vitesse et réglage muet
    *.test.ts            tests (moteur, modules, équilibre, non-régression)
    test-utils.ts        personnages de test aux jets prévisibles
  components/            écrans (*Screen.tsx), briques d'interface (Tabs, StatusTray…), screens.test.tsx
    Betting.tsx          guichet du match (plateaux, tuiles, pièces), rappel sous le VS, classement, résultat des paris de l'écran de fin (aucune règle : tout vient de betting.ts)
    compendium/          CompendiumScreen, registre des verticales (sections.tsx), CharactersSection,
                         CharacterSheet (fiche personnage), SkillsSection, StatusesSection
```

## Principe central : un moteur, une chronologie

```
                         rng (injecté)
                              │
Pair<Character> ──▶ simulateCombat ──▶ CombatResult { initiative, beats[], turns, winner, endedBy }
                                              │
              ┌───────────────────────────────┼──────────────────────────────┐
              ▼                               ▼                              ▼
   useCombat (rejoue les beats)     computeStats (bilan)        withResult (arbre) / recordMatch (historique)
```

- **Seul `simulateCombat` applique des règles et tire des dés.** Jouer un combat ne fait que rejouer son résultat. Les écrans ne recalculent rien.
- **Le hasard est injecté** (`{ rng }`). Avec `seededRng(graine)`, un combat est reproductible à l'identique, ce qui le rend testable. Par défaut, `Math.random` est utilisé.
- **La chronologie** (`beats`) est une suite d'étapes, chacune avec l'état complet qui en résulte (`state` : PV et statuts des deux camps) :

| Étape | Contenu |
| --- | --- |
| `attack` | dé, faces, coup sacrifié (`forfeited`), esquive (imposée ou non, `dodgeForced`), critique (forcé ou non), dégâts bruts, armure, boucliers, force du coup (`damage`) et PV réellement retirés (`dealt`, plafonnés aux PV restants : c'est la valeur comptée dans les stats) |
| `event` | événement déclenché : porteur, déclencheur, effets réellement appliqués |
| `statusTick` | effet de début de tour d'un statut (ex. poison) |
| `statusDuration` | durées décomptées (tours restants avant → après), sans expiration |
| `statusExpire` | statuts arrivés au bout de leur durée |
| `statusReaction` | réaction d'un statut (Épines sur `hurt`, Vol de vie sur `hit`) |
| `skip` | action perdue (Étourdi) |
| `flurry` | un statut donne plusieurs coups à l'action (Furie des vents) |

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
| Vérification d'état (K.O.) après chaque effet | `applyEffects`, `fallen`, `checkBloodied` |

Étapes de la chronologie : `attack`, `event`, `statusTick` (avec `phase`), `statusDuration` et `statusExpire` (avec `phase`), `statusReaction` (le vol de vie en est une, sur `hit`), `skip`, `flurry` (coups multiples). Chacune a sa mise en scène dans `useCombat` : un `switch` exhaustif (`satisfies never`) refuse un type oublié.

Les stats effectives (`effectiveStats`) = stats de base modifiées par les statuts, puis bornées : armure ≥ 0, chances dans [0, 1], dé ≥ 1, multiplicateur ≥ 1. Les PV max ne changent jamais.

## Étendre le jeu

### Ajouter un personnage
1. Mettre l'image dans `src/assets/<race>.png` (voir `docs/STYLE_BIBLE.md`). Une image générée sur fond uni se détoure avec `python scripts/cutout-character.py <source.png> src/assets/<race>.png [aperçu.png]` (numpy, pillow, scipy) ; vérifier ensuite l'aperçu, surtout les lames et les reflets gris.
2. Dans `roster.ts`, créer un `CharacterDef` : stats, `look` (`image`, `facing`, `scale`, cadrage du portrait `{x, y, zoom}`), `lore` (fiche courte) et `events`. Puis ajouter sa section dans `docs/PERSONNAGES.md` (voir la check-list en fin de document).
3. Pour une variante : `variant(base, { id, name, archetype, lore, tint, stats: { …écarts } })`. Elle hérite des événements (et des formes).
   - **Personnage à formes** (druide) : `forms: [{ id, name }, { id, name, look: { image, portrait } }]`. Chaque compétence de forme porte `form: '<id>'`. Le moteur bascule la forme au début de chacun de ses tours, sauf le premier (étape `shift`) ; `Fighter` fait le fondu, et `Character.lookFor(form)` donne l'apparence.
   - **Coup transformé** : `reshapesHit: { value: 'max' | 'reroll', bonus?, noCrit? }` au lieu de `forfeitsHit` (Charge, Coup de griffe), avec `effects: []`. L'icône d'une compétence va dans `SKILL_ICON` (`Icon.tsx`).
4. L'ajouter à `ROSTER`. La sélection (rangée par famille via `FAMILIES`), les fiches, les statistiques et le tournoi le prennent en compte automatiquement.
5. `npm run check` : `validateRoster` vérifie les données, le test d'équilibre vérifie la tolérance (entre 42 et 58 %, aucun duel au-delà de 65/35) ; `npm run balance` donne le rapport détaillé (docs/EQUILIBRAGE.md), et l'empreinte de non-régression doit être mise à jour (`npx vitest run -u`), puisque le roster a changé.

### Ajouter une arène
1. Préparer l'image (16:9, sol dégagé en bas au centre, voir `docs/STYLE_BIBLE.md`), la ranger dans `src/assets/arena-<lieu>.jpg`.
2. Ajouter une entrée dans `ARENAS` (`arenas.ts`) : `id`, `name`, `image`, `focus` (`object-position` qui place le sol sous les pieds) et `filter` (assombrir davantage un décor très lumineux).
3. L'écran d'affrontement la propose automatiquement, ainsi que le tirage « Au hasard ».

### Ajouter un événement à un personnage
Ajouter une entrée `{ id, name, trigger, effects, chance?, limit?, when?, forfeitsHit? }` dans son `events`. Aucun autre fichier à toucher. `forfeitsHit` (déclencheurs du dé seulement, sans `chance`) sacrifie le coup qui déclenche la compétence : le moteur le sait dès le jet (`forfeits`, `combat.ts`).

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
| `reactions` | effets déclenchés par un `Trigger`, du point de vue du porteur (sans chaîne) |
| `spentOnReaction` | le statut disparaît après avoir réagi une fois (Épines) |
| `look` | présentation seulement : liseré (`glow`), halo d'aura (`aura`), transparence (`opacity`), tremblement (`motion: 'tremble'`), couleur du dé supplémentaire (`dieColor`) |
| `wards` | bloque la pose de statuts (une polarité ou une liste) ; une charge par blocage |
| `opposes` | statut contraire, réciproque (test) : charges annulées une à une |

La durée est portée par l'instance : `turns` (facultatif) correspond au nombre de tours du porteur avant expiration, jamais décomptée à la fin du tour où le statut a été posé (`FighterState.fresh`) ; sans `turns`, le statut dure jusqu'à épuisement de ses charges. La zone d'état (`StatusTray`, avec le nombre choisi par `statusCounter`), les auras au sol, le journal, les badges et le compendium suivent automatiquement : `statusRules` traduit les crochets, le cumul et le plafond en phrases, et `statusCatalog` (`catalog.ts`) indique qui pose chaque statut. Enfin, on ajoute le statut au catalogue de `docs/STATUTS.md`.

S'il faut un **nouveau type de crochet** (ex. renvoi de dégâts), on l'ajoute à `StatusDef` et on l'appelle à un endroit précis de `simulateCombat` ou de `resolveAttack`, puis on le teste dans `combat.test.ts`.

### Ajouter un déclencheur
1. L'ajouter au type `Trigger` et à `TRIGGERS` (libellé).
2. Appeler `fire(side, 'nouveau')` au bon moment dans `simulateCombat`, et documenter cet ordre ici.
3. Ajouter un test dans `combat.test.ts` (section « événements »).

### Ajouter un type d'effet
Étendre `Effect` (`events.ts`) et `AppliedEffect` (`combat.ts`), puis traiter le nouveau cas dans `applyEffect`, `describeEffect`, `effectText` et `effectBadge`. TypeScript signale chaque `switch` oublié. Ajouter aussi un test.

### Ajouter une verticale au compendium
1. Écrire le composant de la section dans `src/components/compendium/` : il occupe toute la hauteur disponible (`h-full min-h-0`) et défile lui-même si besoin.
2. L'ajouter à `CompendiumSectionId` et à `COMPENDIUM_SECTIONS` (`sections.tsx`) : `id`, `label`, `icon`, et `render(nav)`. `nav` donne le personnage courant et `onSelectCharacter`, pour renvoyer vers une fiche.
3. Les données viennent des registres, ou d'une vue de `catalog.ts`, jamais d'un texte recopié.
4. L'ajouter au test de rendu (`screens.test.tsx` parcourt déjà `COMPENDIUM_SECTIONS`) et à `FEATURES.md` § 9.

## Vérifier une résolution, déboguer un combat

Chaque combat de l'application est tiré avec une graine (`simulateCombat(fighters, { seed })`, `randomSeed()`), conservée dans `CombatResult.seed`. `trace.ts` raconte la chronologie ligne par ligne sans rien recalculer, décomptes de durée compris (étape `statusDuration`). `debugConsole.ts` l'écrit dans la console à chaque combat et l'envoie au serveur de dev, qui l'écrit dans `logs/combats/` (greffon `combatLogs` de `vite.config.ts`, point d'entrée `POST /__battler/combat-log` ; dossier ignoré par git). Il expose `battler.trace()`, `battler.traces`, `battler.dump()` (toutes les traces gardées, à copier avec `copy(…)`) et `battler.replay(graine, gauche, droite)`. Chaque coup enregistre ses modificateurs de dégâts (`Attack.modifiers`, statut, porteur, variation), pour que la trace et le journal les montrent sans rien recalculer. `audit.test.ts` revérifie la chronologie de milliers de combats, règle par règle : y ajouter un contrôle pour toute nouvelle mécanique. **Mode triche** : `simulateCombat(f, { seed, forcedRolls })` impose des dés par rang (un rang par étape `attack` ou `coin`, voir `rollsDie` et `dieAt`), sans changer la suite du hasard. `useCombat` résout à nouveau le combat à chaque dé imposé et poursuit la lecture sur la nouvelle chronologie (la boucle relit `current.beats` à chaque étape ; les rafales et les anticipations sont repérées par index). Le pavé est `CheatPad.tsx`. La trace écrit les dés imposés, que `parseForcedRolls` relit. Pour un rapport de bug, coller la trace copiée (bouton « Copier la trace ») : la graine et les deux identifiants suffisent à rejouer le combat, y compris dans un test.

Une nouvelle étape de chronologie doit recevoir sa ligne dans `beatLines` (`trace.ts`) : TypeScript refuse un type d'étape oublié.

## Rendu

- `Stage.tsx` dessine une scène fixe de **1600×900**, mise à l'échelle par `transform`. Dans les écrans, on raisonne en pixels de cette scène : pas de breakpoints `sm:` ni d'unités `vh`.
- Les animations de combat dépendent de la variable CSS `--speed`. Le tremblement de l'arène passe par la Web Animations API sur une ref.
- `Fighter` affiche l'image (orientation, échelle, teinte), les effets du coup, l'aura et le titre de l'événement dont il est la source, les badges des effets qui le visent, et une aura au sol pour ses statuts actifs : verte pour les bonus, rouge pour les malus.
- L'arbre du tournoi (`Bracket.tsx`) est placé en pixels absolus avec des connecteurs SVG. Sa racine est en `pointer-events-none`.

## Données persistées

- `battler:history:v1` : totaux par personnage, bilans par adversaire, 300 derniers combats. `normalize` complète un historique enregistré par une version antérieure. Un changement incompatible impose de changer la clé (`v2`).
- `battler:muted` : réglage du son.
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
| `components/screens.test.tsx` | rendu de chaque écran avec de vraies données |

**Empreinte de non-régression** : si elle casse alors qu'aucune règle ne devait changer, c'est un effet de bord. Si le changement est voulu, on met à jour l'instantané avec `npx vitest run -u` et on le note dans le CHANGELOG.

## Conventions

- Textes de l'interface et commentaires en français ; identifiants de code en anglais.
- Logique de jeu pure et immuable dans `game/`. Aucun `Math.random` dans les règles : tout passe par un `Rng`.
- Aucune règle ni aucun texte propre à un statut, un événement ou un personnage en dehors de son registre (`statuses.ts`, `roster.ts`).
- Formatage : Prettier, sans point-virgule, avec guillemets simples et lignes de 120 caractères (`npx prettier --no-semi --single-quote --print-width 120 --write <fichiers>`).
