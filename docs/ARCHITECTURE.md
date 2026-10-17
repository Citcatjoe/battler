# Architecture

## Pile technique

- **Vite 8** et **React 19** (StrictMode), **TypeScript** strict avec `erasableSyntaxOnly`. Le typecheck se fait avec `tsc`, sans émission de fichiers.
- **Tailwind CSS 4** via `@tailwindcss/vite`. Les animations sont des keyframes CSS dans `src/index.css`.
- **Vitest 5** pour les tests (`npm test`).
- **Web Audio API** pour les sons, tous synthétisés.
- **localStorage** pour l'historique et le réglage muet. Aucun backend.

## Arborescence

```
src/
  main.tsx, App.tsx      point d'entrée ; App = machine à écrans + état du tournoi
  index.css              thème (polices), keyframes d'animation
  env.d.ts               __APP_VERSION__ (injectée par vite.config.ts depuis package.json)
  assets/                images des personnages et de l'arène
  game/                  logique sans interface (sauf useCombat)
    rng.ts               hasard injectable : Rng, seededRng, rollDie, chance, shuffle
    character.ts         CharacterStats, CharacterDef, classe Character (pure donnée), variant()
    statuses.ts          REGISTRE des statuts (auras bonus/malus) : règles + présentation
    events.ts            déclencheurs (TRIGGERS), effets (Effect), CharacterEvent
    roster.ts            ROSTER, CHARACTERS, FAMILIES, createCharacter, validateRoster
    arenas.ts            ARENAS : cadres visuels des combats (image, cadrage, traitement)
    catalog.ts           vues de lecture sur les registres : statusCatalog, statusSources (compendium)
    combat.ts            MOTEUR : simulateCombat, resolveAttack, effectiveStats, chronologie
    stats.ts             computeStats : bilan d'un combat lu dans la chronologie
    narration.ts         textes du journal et badges, générés depuis le registre
    useCombat.ts         hook qui rejoue la chronologie avec timing, pause et vitesse
    history.ts           historique localStorage, useHistory, normalize
    tournament.ts        arbre à 16 : création, état des matchs, résultats, fillSlots
    sound.ts             sfx.* et réglage muet
    *.test.ts            tests (moteur, modules, équilibre, non-régression)
    test-utils.ts        personnages de test aux jets prévisibles
  components/            écrans (*Screen.tsx), briques d'interface (Tabs, StatusTray…), screens.test.tsx
    compendium/          CompendiumScreen, registre des verticales (sections.tsx), CharactersSection,
                         CharacterSheet (fiche personnage), StatusesSection
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
| `attack` | dé, faces, esquive, critique (forcé ou non), dégâts bruts, armure, boucliers, force du coup (`damage`) et PV réellement retirés (`dealt`, plafonnés aux PV restants : c'est la valeur comptée dans les stats) |
| `event` | événement déclenché : porteur, déclencheur, effets réellement appliqués |
| `statusTick` | effet de début de tour d'un statut (ex. poison) |
| `statusExpire` | statuts arrivés au bout de leur durée |

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

Étapes de la chronologie : `attack`, `event`, `statusTick` (avec `phase`), `statusExpire` (avec `phase`), `statusReaction`, `skip`. Chacune a sa mise en scène dans `useCombat` : un `switch` exhaustif (`satisfies never`) refuse un type oublié.

Les stats effectives (`effectiveStats`) = stats de base modifiées par les statuts, puis bornées : armure ≥ 0, chances dans [0, 1], dé ≥ 1, multiplicateur ≥ 1. Les PV max ne changent jamais.

## Étendre le jeu

### Ajouter un personnage
1. Mettre l'image dans `src/assets/<race>.png` (voir `docs/STYLE_BIBLE.md`). Une image générée sur fond uni se détoure avec `python scripts/cutout-character.py <source.png> src/assets/<race>.png [aperçu.png]` (numpy, pillow, scipy) ; vérifier ensuite l'aperçu, surtout les lames et les reflets gris.
2. Dans `roster.ts`, créer un `CharacterDef` : stats, `look` (`image`, `facing`, `scale`, cadrage du portrait `{x, y, zoom}`), `lore` (fiche courte) et `events`. Puis ajouter sa section dans `docs/PERSONNAGES.md` (voir la check-list en fin de document).
3. Pour une variante : `variant(base, { id, name, archetype, lore, tint, stats: { …écarts } })`. Elle hérite des événements.
4. L'ajouter à `ROSTER`. La sélection (rangée par famille via `FAMILIES`), les fiches, les statistiques et le tournoi le prennent en compte automatiquement.
5. `npm run check` : `validateRoster` vérifie les données, le test d'équilibre vérifie les 45 à 55 % de victoires, et l'empreinte de non-régression doit être mise à jour (`npx vitest run -u`), puisque le roster a changé.

### Ajouter une arène
1. Préparer l'image (16:9, sol dégagé en bas au centre, voir `docs/STYLE_BIBLE.md`), la ranger dans `src/assets/arena-<lieu>.jpg`.
2. Ajouter une entrée dans `ARENAS` (`arenas.ts`) : `id`, `name`, `image`, `focus` (`object-position` qui place le sol sous les pieds) et `filter` (assombrir davantage un décor très lumineux).
3. L'écran d'affrontement la propose automatiquement, ainsi que le tirage « Au hasard ».

### Ajouter un événement à un personnage
Ajouter une entrée `{ id, name, trigger, effects, chance?, limit?, when? }` dans son `events`. Aucun autre fichier à toucher.

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
- sa **présentation** : `name`, `icon` (emoji du journal ; l'icône peinte va dans `STATUS_ICON`, `Icon.tsx`), `polarity` (bonus ou malus), `summary` (une phrase pour le compendium), `describe`, `badge` ;
- son **cumul** : `add` (les charges s'additionnent) ou `refresh` (l'application remplace l'existant), et un plafond facultatif `maxStacks` ;
- ses **règles**, toutes facultatives :

| Crochet | Effet |
| --- | --- |
| `modifyStats` | modifie les stats effectives du porteur (armure, esquive, critique…) |
| `modifyOutgoing` | modifie les dégâts du porteur avant l'armure |
| `forcesCrit` | le prochain coup qui touche est critique, et consomme une charge |
| `shield` | absorbe jusqu'à `stacks` points après l'armure, et s'use d'autant |
| `onTurnStart` | effets appliqués au porteur au début de chacun de ses tours |
| `onTurnEnd` | effets appliqués au porteur à la fin de chacun de ses tours |
| `expiresAt` | moment où la durée se décompte : `turnStart` (défaut) ou `turnEnd` |
| `modifyIncoming` | modifie les dégâts reçus par le porteur avant l'armure |
| `skipsAction` | le porteur perd son action (une charge par tour perdu) |
| `reactions` | effets déclenchés par un `Trigger`, du point de vue du porteur (sans chaîne) |
| `wards` | bloque la pose de statuts (une polarité ou une liste) ; une charge par blocage |
| `opposes` | statut contraire, réciproque (test) : charges annulées une à une |

La durée est portée par l'instance : `turns` (facultatif) correspond au nombre de débuts de tour du porteur avant expiration ; sans `turns`, le statut dure jusqu'à épuisement de ses charges. La zone d'état (`StatusTray`, avec le nombre choisi par `statusCounter`), les auras au sol, le journal, les badges et le compendium suivent automatiquement : `statusRules` traduit les crochets, le cumul et le plafond en phrases, et `statusCatalog` (`catalog.ts`) indique qui pose chaque statut. Enfin, on ajoute le statut au catalogue de `docs/STATUTS.md`.

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
| `modules.test.ts` | rng, validation du roster, cohérence des stats, narration, tournoi (100 tournois complets, refus des matchs invalides), historique |
| `balance.test.ts` | équilibre (45 à 55 % de victoires) et empreinte de non-régression (instantané) |
| `components/screens.test.tsx` | rendu de chaque écran avec de vraies données |

**Empreinte de non-régression** : si elle casse alors qu'aucune règle ne devait changer, c'est un effet de bord. Si le changement est voulu, on met à jour l'instantané avec `npx vitest run -u` et on le note dans le CHANGELOG.

## Conventions

- Textes de l'interface et commentaires en français ; identifiants de code en anglais.
- Logique de jeu pure et immuable dans `game/`. Aucun `Math.random` dans les règles : tout passe par un `Rng`.
- Aucune règle ni aucun texte propre à un statut, un événement ou un personnage en dehors de son registre (`statuses.ts`, `roster.ts`).
- Formatage : Prettier, sans point-virgule, avec guillemets simples et lignes de 120 caractères (`npx prettier --no-semi --single-quote --print-width 120 --write <fichiers>`).
