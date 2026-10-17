# Battler

Prototype de jeu de combat au tour par tour, résolu aux dés : deux personnages s'affrontent, chaque coup dépend d'un jet de dé et des caractéristiques du combattant (esquive, critique, armure, événements). Le jeu propose des duels, des simulations et des tournois à 16 participants, et garde en local l'historique de tous les combats.

React 19 · Vite 8 · Tailwind CSS 4 · TypeScript, sans backend.

## Lancer le jeu

```bash
npm install
npm run dev          # http://localhost:5173
npx vite --host      # pour y accéder depuis le réseau local
npm run build        # vérifie les types et produit dist/
```

La version affichée en bas à droite de l'écran d'accueil correspond à une entrée du [CHANGELOG](CHANGELOG.md).

## Documentation

Ces fichiers servent de mémoire au projet, pour l'humain comme pour l'agent. On les met à jour à chaque évolution.

| Fichier | Contenu |
| --- | --- |
| [docs/INTENTION.md](docs/INTENTION.md) | Pourquoi le projet existe, principes de conception, grandes lignes et pistes |
| [docs/ETAT.md](docs/ETAT.md) | État actuel : ce qui fonctionne, limites connues, points à vérifier |
| [docs/FEATURES.md](docs/FEATURES.md) | Chaque fonctionnalité, ses règles et l'historique de son évolution |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Organisation du code, flux de données, comment ajouter un personnage ou un événement |
| [CHANGELOG.md](CHANGELOG.md) | Liste des changements entre deux versions |
| [CLAUDE.md](CLAUDE.md) | Règles de travail pour l'agent (lecture et mise à jour des docs, versions) |
