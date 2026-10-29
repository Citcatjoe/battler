# BATTLER : écran titre + entrée en campagne

## Contenu

| Dossier / fichier | Rôle |
|---|---|
| `prompt-titre-et-campagne.md` | Prompt principal pour Claude Code : écran titre, enchaînement des écrans, accueil de la campagne. |
| `prompt-choix-du-champion.md` | Prompt de l'écran de choix du champion. À passer d'abord si cet écran n'est pas encore refait. |
| `assets/` | Les deux panneaux peints de l'écran titre. Les `.png` sont les originaux (1856 × 2304) ; les `.webp` sont des versions allégées (1440 px de large) à utiliser dans le jeu. |
| `ref/` | Captures de référence en 1440 × 810, plus le schéma d'enchaînement. |

## Ordre conseillé

1. Copier `ref/` dans `docs/ref/` du projet et `assets/` dans le dossier des images du jeu (par exemple `public/images/titre/`).
2. Si l'écran de choix du champion n'est pas encore refait, lancer d'abord `prompt-choix-du-champion.md`.
3. Lancer `prompt-titre-et-campagne.md`.

## Références

| Fichier | Écran |
|---|---|
| 01 · 02 · 03 | Écran titre : au repos, survol Campagne, survol Tournoi |
| 04 · 05 | Choix du champion : héritage disponible, indisponible |
| 06 · 07 · 08 | Accueil de la campagne : joueur classé, non classé, fiche d'un champion ouverte |
| 09 | Enchaînement de tous les écrans |
