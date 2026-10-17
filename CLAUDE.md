# Battler : consignes pour l'agent

Prototype de combat aux dés en React, Vite, Tailwind et TypeScript. L'utilisateur parle français : interface, commentaires et docs en français, identifiants de code en anglais.

## Avant de travailler

Lire, selon la tâche :
- `docs/ETAT.md` : état actuel et limites connues ;
- `docs/FEATURES.md` : règles en vigueur de chaque fonctionnalité ;
- `docs/ARCHITECTURE.md` : où se trouve le code, comment ajouter un personnage ou un événement ;
- `docs/INTENTION.md` : principes à respecter et pistes.

## À chaque évolution livrée

1. Monter la version dans `package.json` : mineure pour une fonctionnalité, correctif pour une correction ou un réglage.
2. Ajouter une entrée datée dans `CHANGELOG.md` (Ajouté / Modifié / Corrigé / Retiré).
3. Mettre à jour la section concernée de `docs/FEATURES.md` (règles et ligne d'historique).
4. Mettre à jour `docs/ETAT.md` (date, version, tableau, limites).
5. Toucher `docs/INTENTION.md` ou `docs/ARCHITECTURE.md` seulement si les principes ou la structure changent.

## Règles du projet

- Un seul moteur : `simulateCombat` est pur, l'écran de combat ne fait que rejouer son résultat. Ne jamais tirer de dés dans l'interface.
- Scène fixe de 1600×900 (`Stage.tsx`) : pas de breakpoints `sm:` ni d'unités `vh` dans les écrans.
- Après un changement de stats ou de règles, vérifier l'équilibre par simulation (cible de 45 à 55 % de victoires par personnage).
- Le format de l'historique (`battler:history:v1`) doit rester rétrocompatible.
- Vérifier avec `npx tsc -p .` et `npx vite build`. Aucun navigateur automatisé ne fonctionne sur cette machine : le dire quand un rendu n'a pas été vu.
