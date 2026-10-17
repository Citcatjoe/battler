# Battler : consignes pour l'agent

Prototype de combat aux dés en React, Vite, Tailwind et TypeScript. L'utilisateur parle français : interface, commentaires et docs en français, identifiants de code en anglais.

## Avant de travailler

Le plan de la documentation, et où documenter quoi, est dans `docs/README.md`. Lire, selon la tâche :
- `docs/ETAT.md` : état actuel et limites connues ;
- `docs/FEATURES.md` : règles en vigueur de chaque fonctionnalité ;
- `docs/ARCHITECTURE.md` : où se trouve le code, comment ajouter un personnage ou un événement ;
- `docs/INTENTION.md` : principes à respecter et pistes ;
- `docs/RESOLUTION.md` : le livre de règles de la résolution (phases, ordre, application, opposition). Toute modification du déroulé d'un combat commence par ce document ;
- `docs/STATUTS.md` : bonus et malus (vocabulaire, conditions, catalogue, chantier). À mettre à jour dès qu'on touche un statut, une condition ou un déclencheur ;
- `docs/PERSONNAGES.md` : philosophie et décisions de design de chaque personnage. À mettre à jour (mesures comprises) dès qu'on touche un personnage, ses stats ou son événement.

## À chaque évolution livrée

1. Monter la version dans `package.json` : mineure pour une fonctionnalité, correctif pour une correction ou un réglage.
2. Ajouter une entrée datée dans `CHANGELOG.md` (Ajouté / Modifié / Corrigé / Retiré).
3. Mettre à jour la section concernée de `docs/FEATURES.md` (règles et ligne d'historique).
4. Mettre à jour `docs/ETAT.md` (date, version, tableau, limites).
5. Toucher `docs/INTENTION.md` ou `docs/ARCHITECTURE.md` seulement si les principes ou la structure changent.

## Règles du projet

- Un seul moteur : `simulateCombat` applique toutes les règles et produit une chronologie (`beats`) ; l'écran ne fait que la rejouer. Ne jamais tirer de dés ni recalculer une règle dans l'interface.
- Aucun `Math.random` dans les règles : tout passe par un `Rng` injecté (`rng.ts`).
- Statuts, déclencheurs et effets se définissent dans leur registre (`statuses.ts`, `events.ts`) ; aucun nom de statut en dur dans les composants. Marche à suivre : `docs/ARCHITECTURE.md`, section « Étendre le jeu ».
- Toute nouvelle mécanique arrive avec ses tests dans `combat.test.ts`.
- Scène fixe de 1600×900 (`Stage.tsx`) : pas de breakpoints `sm:` ni d'unités `vh` dans les écrans.
- Après un changement de stats ou de règles, vérifier l'équilibre par simulation (cible de 45 à 55 % de victoires par personnage).
- Le format de l'historique (`battler:history:v1`) doit rester rétrocompatible.
- Vérifier avec `npm run check` (typecheck + tests) et `npx vite build`. Aucun navigateur automatisé ne fonctionne sur cette machine : le dire quand un rendu n'a pas été vu.
- Si l'empreinte de non-régression (`balance.test.ts`) casse sans changement de règle voulu, c'est un effet de bord à corriger. Ne la mettre à jour (`npx vitest run -u`) que pour un changement voulu, noté dans le CHANGELOG.
- Images déposées à la racine du projet par l'utilisateur : ce sont des sources brutes. Les compresser (JPG qualité ~82 pour les fonds, PNG optimisé pour les personnages détourés), les renommer en kebab-case anglais selon leur rôle (`arena-<lieu>.jpg`, `menu-<thème>.jpg`, `<race>.png`), les ranger dans `src/assets/`, puis mettre la source à la corbeille (`gio trash`). Aucune image ne doit rester à la racine.
