# Documentation de Battler

Ces documents sont la mémoire du projet, pour l'humain comme pour l'agent. Ils suivent la logique du jeu : **pourquoi** on le fait, **où on en est**, **ce que contient le jeu** (dans l'ordre où on le découvre), **comment c'est construit**, et **à quoi ça ressemble**.

## Plan

| | Document | Contenu |
| --- | --- | --- |
| **Vision et suivi** | [INTENTION.md](INTENTION.md) | **Fiche produit** (un auto-battler roguelike à regarder et à parier : deux terrains de jeu, deux buts), principes de conception, grandes lignes. À lire en premier |
| | [ETAT.md](ETAT.md) | Où on en est : ce qui fonctionne, vérifications, limites, **chantiers en cours** |
| | [TODO.md](TODO.md) | Liste des chantiers demandés, à cocher au fil des livraisons |
| | [../CHANGELOG.md](../CHANGELOG.md) | Ce qui a changé, version par version |
| **Le jeu** | [FEATURES.md](FEATURES.md) | Les règles et les écrans : combat, roster, événements et statuts, écrans, arènes, son, statistiques, tournoi, compendium |
| | [PERSONNAGES.md](PERSONNAGES.md) | Le roster : philosophie de chaque race et de chaque personnage, décisions, mesures, matrice des duels |
| | [STATUTS.md](STATUTS.md) | Les bonus et malus : vocabulaire, conditions, catalogue, règles de design, chantier |
| | [EQUILIBRAGE.md](EQUILIBRAGE.md) | L'équilibrage par simulation : objectifs, outils (`npm run balance`), méthode, leviers par ordre de préférence, pièges, journal des équilibrages |
| | [SYSTEMES.md](SYSTEMES.md) | Le grand livre des systèmes : inventaire de toutes les briques (résolution, chronologie, animations, sons, interface), contenu vu comme assemblages, surface de chaque mécanique, sources d'effets de bord, pistes |
| | [RESOLUTION.md](RESOLUTION.md) | Le livre de règles de la résolution : phases du tour, chaîne de calcul, types d'effets, ordre, application et opposition, interactions, inspirations |
| | [SONS.md](SONS.md) | Les règles du son : vocabulaire de sons, ce que chacun veut dire, son de chaque moment du combat, son d'une nouvelle compétence, mixage |
| | [MISE_EN_SCENE.md](MISE_EN_SCENE.md) | Les règles de la mise en scène : synchronisation du combat à l'écran (ce qui tombe en même temps que quoi, à quel repère), contrôle de chaque règle, questions ouvertes |
| | [POSTURES.md](POSTURES.md) | Les postures des combattants : cinq postures communes (attaque, esquive, coup encaissé, K.O., victoire) en plus de la garde, choix de la posture, planches de génération et découpe (`scripts/slice-poses.py`) |
| | [PARIS.md](PARIS.md) | Les paris entre deux observateurs : règles (bourses, marchés, cotes, coups de théâtre, relance), interface, architecture, livraison par étapes |
| | [RELIQUES.md](RELIQUES.md) | Les reliques : décisions, ce qui les sépare des compétences, règles des quatre types, récompense de tournoi, interface, identité visuelle (l'hexagone, la grammaire d'illustration), les douze reliques et leurs mesures (`npm run relics`), prompt de la planche d'icônes |
| | [CAMPAGNE.md](CAMPAGNE.md) | La campagne et la forge du dé : décisions de l'utilisateur, grammaire de la forge, réglage des rencontres sur une courbe nominale, héritage, prototype livré (0.88.0), choix de l'agent et mesures (`npm run campaign`) |
| **Réflexion** | [ETUDE_AUTOBATTLER.md](ETUDE_AUTOBATTLER.md) | Étude : Battler face aux règles des auto-battlers, limites, jeux de référence, propositions |
| | [FAMILLES.md](FAMILLES.md) | Proposition : dix familles d'effets, signature de chaque personnage, retouches, accroches pour les reliques |
| | [PROGRESSION.md](PROGRESSION.md) | Réflexion et décisions : la progression d'un personnage, profondeur et synergies (constat mesuré, direction, d6 aux faces imprimées, répertoires par personnage, types de dégâts DP, DM, DT, feuille de personnage, campagne plus longue, durée des combats, pistes gardées pour plus tard), chaque piste estimée |
| | [SORTS.md](SORTS.md) | Brainstorm des sorts, laboratoire (`scripts/lab.report.ts`) et audit des compétences (`scripts/skills.report.ts`), résultats des essais |
| | [AUDIT_COMPENDIUM.md](AUDIT_COMPENDIUM.md) | Audit des textes des compétences et des statuts (0.72.0) : incohérences entre code, textes générés et documents, propositions de reformulation et d'interactions |
| **Technique** | [ARCHITECTURE.md](ARCHITECTURE.md) | Organisation du code, moteur, registres, tests, marches à suivre pour étendre le jeu |
| **Direction artistique** | [STYLE_BIBLE.md](STYLE_BIBLE.md) | Style visuel, contraintes des images, prompts de génération |
| | [design-system.md](design-system.md) | Tokens (couleurs, formes, polices) et composants de l'interface |
| | [ui-kit/README.md](ui-kit/README.md) | **Source de vérité des contrôles** : boutons, onglets, barre de lecture, glyphes de commande (`battler-ui-kit.css`, `BattlerIcon.jsx`, page et capture de référence). On copie, on ne réinterprète pas |

## Où documenter quoi

| Quand on… | On met à jour |
| --- | --- |
| livre n'importe quelle évolution | `package.json` (version), `CHANGELOG.md`, `ETAT.md` |
| change la vision, le genre ou les buts du projet | `INTENTION.md` § Fiche produit, puis le résumé de `CLAUDE.md` |
| change une règle ou un écran | la section concernée de `FEATURES.md` (règle et ligne d'historique) |
| ajoute ou modifie un personnage, ses stats ou son événement | `PERSONNAGES.md` (fiche, décisions, mesures, matrice) |
| fait une grosse mise à jour du gameplay | `npm run balance`, puis `EQUILIBRAGE.md` (journal) et `PERSONNAGES.md` (mesures) |
| ajoute ou modifie un statut, une condition ou un déclencheur | `STATUTS.md` (catalogue, vocabulaire, chantier) et `FEATURES.md` § 3 |
| change l'ordre ou le moment d'une résolution, ou ajoute un crochet ou une règle d'application | `RESOLUTION.md`, d'abord : le code suit la règle écrite |
| ajoute une verticale au compendium, un registre ou un module | `ARCHITECTURE.md` |
| ajoute une image | `STYLE_BIBLE.md` (références) et, pour une arène, `FEATURES.md` § 5 |
| change une règle de la campagne ou de la forge du dé | `CAMPAGNE.md` d'abord (décisions, § 18), puis `FEATURES.md` § 11 ; `npm run campaign` pour remesurer |
| ajoute ou change un bouton, un onglet ou une icône de commande | `ui-kit/README.md` : composants de `src/components/kit.tsx` seulement, glyphe de `BattlerIcon` ; jamais d'image peinte dans une commande |
| ajoute ou change un son, ou une compétence qui produirait un effet sans son | `SONS.md` d'abord : le son se déduit de l'effet, le code suit la règle écrite |
| ajoute ou change une mise en scène (ce qui tombe ensemble, ce qui attend quoi), ou signale un défaut de synchronisation | `MISE_EN_SCENE.md` d'abord : une règle générale par constat, avec son contrôle dans `staging.test.ts` |
| change une règle des paris | `PARIS.md` d'abord, puis `FEATURES.md` § 10 |
| essaie une idée de compétence, ou audite les compétences | `SORTS.md` (laboratoire, audit, résultats) |
| ajoute ou modifie une relique, ou une règle des reliques | `RELIQUES.md` (catalogue, mesures, `npm run relics`) et `FEATURES.md` § 8 |
| ajoute une brique (crochet, déclencheur, effet, type d'étape, son, animation, rappel visuel) | `SYSTEMES.md` (inventaire et surface) |
| ouvre ou fait avancer un chantier | `ETAT.md` (chantiers) et le document thématique |

## Le jeu et sa documentation

Les textes affichés en jeu (fiches, descriptions des statuts, règles du compendium) sont générés à partir des registres du code. Les documents ci-dessus en gardent la **justification** : pourquoi ces valeurs, ce qui a été essayé, ce qui reste à décider. Si les deux divergent, c'est le code qui fait foi, et le document doit être corrigé.
