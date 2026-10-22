# Sources des sons

Un fichier par son (`docs/SONS.md`), sauf les dés (plusieurs variantes). Depuis la 0.36.3, la plupart viennent de la livraison `sfx_choix_good` de l'utilisateur : 3 à 5 propositions par son, tirées de **Freesound et toutes en licence CC0**, parmi lesquelles l'utilisateur a choisi à l'oreille. La correspondance entre fichier du jeu et proposition retenue est dans `docs/SONS.md` § 7.

Traitement : `scripts/process-sounds.py` (silence de tête coupé, durée ramenée à la fenêtre du son, intensité égalisée, MP3 mono 96 kb/s).

Le rapport de la livraison (`sfx_choix_report.json` : nom Freesound, auteur, URL de chaque proposition) n'était pas dans le dossier. À ajouter ici s'il est retrouvé, pour pouvoir créditer les auteurs (non requis en CC0).

Exceptions (0.36.4) :
- `hit.mp3` et `crit-rumble.mp3` : `hit.wav` et `crit.wav`, déposés par l'utilisateur à la racine (provenance non précisée).
- `dice-roll-*.mp3` et `dice-land-*.mp3` : les variantes de la livraison 0.36.0 (`sfx_karma.zip`, Freesound, CC0), remises à la demande de l'utilisateur.
- `coin-win.mp3` : généré par l'agent avec ffmpeg (`aevalsrc`, cloche à quatre partiels de 1 318 à 5 274 Hz, attaque de 2 ms, 0,9 s), puis traité comme les autres.
- `fizz.mp3` (Grésillement, 0.90.0) : **généré avec Artlist** (forfait AI Suite de l'utilisateur), faute de générateur de bruitages et de droit de téléchargement des bruitages du catalogue sur ce forfait. Piste son d'une vidéo Veo 3.1 Lite de 4 s (prompt : gros plan fixe d'une plaque d'armure éraflée ; une bouffée de fumée toxique verte gicle de l'éraflure, un seul sifflement bref « pchhhit », puis silence ; ni musique, ni voix, ni ambiance). Gardé à partir de son attaque (0,68 s), décroissance linéaire ajoutée sur 0,55 s, puis traité par `process-sounds.py` (0,60 s, +16 dB). Un second essai (goutte de poison sur une pierre) a été écarté : clic parasite et choc sourd.
- `war-cry.mp3` (Cri de guerre, 0.91.0) : **généré avec ElevenLabs** (API de bruitages, modèle `eleven_text_to_sound_v2`, clé de l'utilisateur posée par `npx @elevenlabs/cli onboard`), par `npm run sfx` (`scripts/gen-sfx.mjs`) : 2 s, `prompt_influence` 0,6, texte « A single fierce male warrior battle cry: one powerful, raspy shout charging into combat, rising and ending sharply, medieval fantasy war cry, close and dry, no words, no music, no crowd, no reverb tail ». Proposition 1 sur 3, retenue à la mesure (attaque la plus franche, fin la plus nette) ; les trois sont dans `logs/sons/war-cry/`. Traité par `process-sounds.py` (1,74 s, −3,4 dB).
