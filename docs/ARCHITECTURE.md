# Architecture

## Pile technique

- **Vite 8** et **React 19** (StrictMode), **TypeScript** en mode strict. Le typecheck se fait avec `tsc`, sans émission de fichiers.
- **Tailwind CSS 4**, via `@tailwindcss/vite`. Les animations sont des keyframes CSS dans `src/index.css`.
- **Web Audio API** pour les sons, entièrement synthétisés.
- **localStorage** pour l'historique et le réglage muet. Aucun backend.

## Arborescence

```
src/
  main.tsx, App.tsx      point d'entrée ; App = machine à écrans + état du tournoi
  index.css              thème (polices), keyframes d'animation
  env.d.ts               __APP_VERSION__ (injectée par vite.config.ts depuis package.json)
  assets/                orc.png, elf.png, dwarf.png, arena1.jpg
  game/                  logique sans interface (sauf useCombat)
    character.ts         CharacterStats, CharacterDef, classe Character, variant()
    roster.ts            ROSTER : les 6 personnages et leurs événements ; createCharacter(id)
    events.ts            Trigger, Effect, Buff, BUFF_INFO, helpers immuables sur les bonus
    combat.ts            moteur pur : resolveAttack, simulateCombat, computeStats
    useCombat.ts         hook qui rejoue un CombatResult avec timing, pause et vitesse
    history.ts           historique localStorage + useHistory (useSyncExternalStore)
    tournament.ts        arbre à 16 : création, état des matchs, résultats, fillSlots
    sound.ts             sfx.* et réglage muet
  components/            écrans (*Screen.tsx) et briques d'interface
```

## Flux de données

```
StartScreen ──fighters──▶ MatchupScreen
                            │ Jouer : simulateCombat(fighters) ─▶ FightScreen ─(useCombat rejoue)─▶ onEnd
                            │ Simuler : simulateCombat(fighters) ──────────────────────────────────▶ finish
                            ▼
App.finish(result) ─▶ recordMatch (historique)  [+ withResult sur l'arbre si match de tournoi]
                    ─▶ EndScreen (computeStats(result))
```

- `simulateCombat` renvoie un `CombatResult` complet : l'initiative, et pour chaque attaque le jet, le critique, l'esquive, les dégâts, l'armure absorbée, les événements déclenchés, et deux instantanés `afterHit` et `after` (PV et bonus).
- `useCombat` ne tire aucun dé. Il anime le script étape par étape (jet, impact, PV, événements), puis rend le même résultat avec `mode: 'played'`.
- L'historique est un store externe : les écrans s'abonnent via `useHistory()`, et les autres onglets se mettent à jour grâce à l'événement `storage`.
- Le tournoi vit dans le state d'`App`, il n'est pas persisté. `activeMatch` dit si le combat en cours appartient à l'arbre.

## Rendu

- `Stage.tsx` dessine une scène fixe de **1600×900**, mise à l'échelle par `transform`. Dans les écrans, on raisonne en pixels de cette scène : pas de breakpoints `sm:` ni d'unités `vh`.
- Les animations de combat dépendent de la variable CSS `--speed`. Le tremblement de l'arène utilise la Web Animations API sur une ref, pour ne pas remonter les combattants.
- `Fighter` gère l'orientation (`look.facing`, avec un retournement si besoin), l'échelle, la teinte des variantes et les effets visuels.
- L'arbre du tournoi (`Bracket.tsx`) est placé en pixels absolus, avec des connecteurs SVG. Sa racine est en `pointer-events-none` pour ne pas bloquer l'en-tête.

## Ajouter un personnage

1. Mettre l'image dans `src/assets/`.
2. Dans `roster.ts`, créer un `CharacterDef` : stats, et `look` avec `image`, `facing` (sens du regard dans l'image), `scale` et le cadrage du portrait `{x, y, zoom}`.
3. Pour une variante : `variant(base, { id, name, archetype, tint, stats: { …écarts } })`.
4. Ajouter le personnage à `ROSTER`. La sélection, les fiches, les statistiques et le tournoi le prennent en compte automatiquement.
5. Vérifier l'équilibre par simulation (environ 20 000 combats par paire, cible de 45 à 55 % de victoires).

## Ajouter un événement

- **Avec un déclencheur et des effets existants** : ajouter une entrée `events: [{ id, name, trigger, effects }]` au personnage.
- **Nouveau type de bonus** : l'ajouter à `BuffKind` et `BUFF_INFO` (icône, libellé, description, couleur), puis le consommer dans `resolveAttack` ou `simulateCombat`.
- **Nouveau déclencheur** : l'ajouter à `Trigger` et `TRIGGER_LABEL`, puis appeler `triggerEvents` au bon moment dans `simulateCombat`.
- **Nouveau type d'effet** : étendre `Effect`, `describeEffect` et `triggerEvents`.
- Penser aux statistiques (`computeStats`, `history.ts`) si l'effet doit être compté.

## Conventions

- Textes de l'interface et commentaires en français ; identifiants de code en anglais.
- Logique de jeu pure et immuable dans `game/`. L'aléatoire passe par `Character.roll*` et `rollDie`.
- Une évolution du format de l'historique doit rester rétrocompatible : on complète les champs au chargement. Pour un changement incompatible, on change la clé (`v2`).
