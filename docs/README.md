# Documentation de Battler

Ces documents sont la mémoire du projet, pour l'humain comme pour l'agent. Ils suivent la logique du jeu : **pourquoi** on le fait, **où on en est**, **ce que contient le jeu** (dans l'ordre où on le découvre), **comment c'est construit**, et **à quoi ça ressemble**.

## Plan

| | Document | Contenu |
| --- | --- | --- |
| **Vision et suivi** | [INTENTION.md](INTENTION.md) | Pourquoi le projet existe, principes de conception, grandes lignes |
| | [ETAT.md](ETAT.md) | Où on en est : ce qui fonctionne, vérifications, limites, **chantiers en cours** |
| | [../CHANGELOG.md](../CHANGELOG.md) | Ce qui a changé, version par version |
| **Le jeu** | [FEATURES.md](FEATURES.md) | Les règles et les écrans : combat, roster, événements et statuts, écrans, arènes, son, statistiques, tournoi, compendium |
| | [PERSONNAGES.md](PERSONNAGES.md) | Le roster : philosophie de chaque race et de chaque personnage, décisions, mesures, matrice des duels |
| | [STATUTS.md](STATUTS.md) | Les bonus et malus : vocabulaire, conditions, catalogue, règles de design, chantier |
| | [RESOLUTION.md](RESOLUTION.md) | Le livre de règles de la résolution : phases du tour, chaîne de calcul, types d'effets, ordre, application et opposition, interactions, inspirations |
| **Technique** | [ARCHITECTURE.md](ARCHITECTURE.md) | Organisation du code, moteur, registres, tests, marches à suivre pour étendre le jeu |
| **Direction artistique** | [STYLE_BIBLE.md](STYLE_BIBLE.md) | Style visuel, contraintes des images, prompts de génération |

## Où documenter quoi

| Quand on… | On met à jour |
| --- | --- |
| livre n'importe quelle évolution | `package.json` (version), `CHANGELOG.md`, `ETAT.md` |
| change une règle ou un écran | la section concernée de `FEATURES.md` (règle et ligne d'historique) |
| ajoute ou modifie un personnage, ses stats ou son événement | `PERSONNAGES.md` (fiche, décisions, mesures, matrice) |
| ajoute ou modifie un statut, une condition ou un déclencheur | `STATUTS.md` (catalogue, vocabulaire, chantier) et `FEATURES.md` § 3 |
| change l'ordre ou le moment d'une résolution, ou ajoute un crochet ou une règle d'application | `RESOLUTION.md`, d'abord : le code suit la règle écrite |
| ajoute une verticale au compendium, un registre ou un module | `ARCHITECTURE.md` |
| ajoute une image | `STYLE_BIBLE.md` (références) et, pour une arène, `FEATURES.md` § 5 |
| ouvre ou fait avancer un chantier | `ETAT.md` (chantiers) et le document thématique |

## Le jeu et sa documentation

Les textes affichés en jeu (fiches, descriptions des statuts, règles du compendium) sont générés à partir des registres du code. Les documents ci-dessus en gardent la **justification** : pourquoi ces valeurs, ce qui a été essayé, ce qui reste à décider. Si les deux divergent, c'est le code qui fait foi, et le document doit être corrigé.
