# Sources des sons

Un fichier par son (`docs/SONS.md`), sauf les dés (plusieurs variantes). Depuis la 0.36.3, la plupart viennent de la livraison `sfx_choix_good` de l'utilisateur : 3 à 5 propositions par son, tirées de **Freesound et toutes en licence CC0**, parmi lesquelles l'utilisateur a choisi à l'oreille. La correspondance entre fichier du jeu et proposition retenue est dans `docs/SONS.md` § 7.

Traitement : `scripts/process-sounds.py` (silence de tête coupé, durée ramenée à la fenêtre du son, intensité égalisée, MP3 mono 96 kb/s).

Le rapport de la livraison (`sfx_choix_report.json` : nom Freesound, auteur, URL de chaque proposition) n'était pas dans le dossier. À ajouter ici s'il est retrouvé, pour pouvoir créditer les auteurs (non requis en CC0).

Exceptions (0.36.4) :
- `hit.mp3` et `crit-rumble.mp3` : `hit.wav` et `crit.wav`, déposés par l'utilisateur à la racine (provenance non précisée).
- `dice-roll-*.mp3` et `dice-land-*.mp3` : les variantes de la livraison 0.36.0 (`sfx_karma.zip`, Freesound, CC0), remises à la demande de l'utilisateur.
- `coin-win.mp3` : généré par l'agent avec ffmpeg (`aevalsrc`, cloche à quatre partiels de 1 318 à 5 274 Hz, attaque de 2 ms, 0,9 s), puis traité comme les autres.
