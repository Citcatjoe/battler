# État du projet

_Dernière mise à jour : 2026-10-17, version 0.11.0._

## En bref

Prototype jouable de bout en bout : sélection, affrontement, combat animé ou simulé, résultats, fiches de personnages, statistiques globales et tournoi à 16 participants. Six personnages (3 races × 2 variantes de coloris), chacun avec un événement propre.

## Ce qui fonctionne

| Domaine | État |
| --- | --- |
| Duel joué ou simulé | ✅ stable |
| Esquive, critique, armure | ✅ stable |
| Événements sur un 1 naturel (orc, elfe, nain) | ✅ récent (0.9.0) |
| Sons de synthèse et bouton muet | ✅ stable |
| Fiche personnage et statistiques globales | ✅ stable |
| Tournoi à 16 (configuration, arbre, suivi) | ✅ stable depuis la correction 0.8.1 |
| Fond d'arène pendant le combat | ✅ récent (0.10.0) |
| Version affichée en jeu | ✅ 0.11.0 |

## Vérifications faites

- **Moteur** : 60 000 combats simulés sans incohérence (PV, bonus, journal).
- **Équilibre** : 20 000 combats par paire ; après l'ajout des événements, chaque personnage gagne entre 48,8 et 52,5 % de ses combats.
- **Historique** : 2 000 combats enregistrés, environ 54 Ko dans le localStorage.
- **Tournoi** : 500 tournois complets sans incohérence ; le remplissage automatique (5 000 essais) garde les cases placées à la main et équilibre le roster.
- **Build** : `tsc` et `vite build` passent.

## Limites connues

- **Pas de test visuel automatisé.** Playwright et Chromium ne s'installent pas sur la machine de dev (téléchargement bloqué). Les rendus sont prévisualisés en Python (PIL) ; la validation finale se fait dans le navigateur, à la main.
- **Pas de tests unitaires dans le repo.** Les vérifications ci-dessus ont été faites avec des scripts ponctuels hors du dépôt.
- **Tournoi non sauvegardé.** C'est voulu : un rechargement de la page le perd.
- **Pas de version mobile.** La scène 16:9 se réduit, mais rien n'est pensé pour le tactile.
- **Pas d'historique git.** Aucun commit sur la branche `news` à ce jour, les versions avant 0.11.0 ont été reconstituées dans le CHANGELOG.

## Prochaines étapes possibles

- Faire un premier commit, puis un commit (ou un tag) par version.
- Mettre les scripts de vérification (équilibre, invariants) dans le dépôt, par exemple avec Vitest.
- Voir les pistes dans [INTENTION.md](INTENTION.md#grandes-lignes).
