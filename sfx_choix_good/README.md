# SFX — Propositions à trier (3 ou 5 par son)

**Consigne** : pour chaque dossier, **garde 1 fichier** (ton choix) et **supprime les autres**.
L'agent de code n'utilise que le fichier restant.

- **Source** : Freesound API v2 — filtrage `duration:[min TO max] license:"Creative Commons 0"`
- **Total** : 82 fichiers mp3, **100 % licence CC0**
- **Structure** : `sfx_choix/<slug>/<slug>-{1..n}.mp3`

## Combien de propositions par son ?

- **5 propositions** (sons signalés, refaits selon tes indications) :
  `stun`, `shift`, `rot`, `hit`, `heal`, `dispel`, `debuff`, `coin-land`, `clash`, `buff`, `victory`
- **3 propositions** (inchangés) :
  `dice-roll`, `dice-land`, `coin-toss`, `dodge`, `crit-rumble`, `aura-gain`, `aura-loss`, `ko`, `click`

## Timbre visé (synthèse des consignes)

| Slug | Timbre |
|---|---|
| stun | raclement / craquement sourd, lugubre |
| shift | aura magique qui pop, scintillant |
| rot | gémissement d'âme lugubre, creepy |
| hit | frappe d'épée, bruit métallique net |
| heal | synthé léger, notes ascendantes, bénéfique |
| dispel | synthé magique qui descend dans les notes |
| debuff | synthé magique en mineur, sombre |
| coin-land | pièce qui claque net sur une table |
| clash | choc glorieux, épique (fin de combat, jusqu'à 5 s) |
| buff | synthé magique majeur, ascendant, lumineux |
| victory | fanfare grandiose, orchestrale (jusqu'à 5 s) |
| dice-roll | dé qui roule sur table en bois |
| dice-land | petit choc net de dé |
| coin-toss | pièce qui tournoie en l'air |
| crit-rumble | gros choc grave, basses |
| dodge | arme qui fend l'air dans le vide |
| aura-gain | souffle magique qui enfle, lumineux |
| aura-loss | souffle magique qui retombe et s'éteint |
| ko | corps en armure qui tombe lourdement |
| click | clic sec, bois ou métal léger |

## Correspondance détaillée

Le mapping exact de chaque proposition (nom Freesound, durée réelle, auteur, licence, URL)
est dans `../sfx_choix_report.json` (champ `files[]`).

Les propositions d'un même son sont **issues d'auteurs différents** quand c'est possible,
pour couvrir des timbres variés et laisser un vrai choix.
