# Les emblèmes d'état : un concept, une icône

Ce document fait foi pour la **zone d'état** (les médaillons au-dessus d'un combattant, `StatusTray`) et pour la section Statuts du compendium : quels états existent, quel emblème les montre, et comment un statut nouveau reçoit le sien. Il répond à la question qu'on se pose à chaque sort nouveau : **faut-il un nouveau statut ? un nouvel état ? une nouvelle icône ?** (§ 6). Le code suit ce document (`STATES` et `DISPLAYED` dans `states.ts`, `STATE_ICON` dans `Icon.tsx`) ; s'ils divergent, c'est le code qu'on corrige.

Il ne règle pas les icônes peintes des compétences, des auras et des mécanismes (l'identité d'un personnage, [STYLE_BIBLE.md](STYLE_BIBLE.md) § 7), ni les règles des statuts eux-mêmes ([STATUTS.md](STATUTS.md)). Décidé avec l'utilisateur le 2026-10-28 ; le chantier qui l'applique est au § 8.

## 1. Pourquoi ces règles

Constat de l'utilisateur (2026-10-28) : « une icône de statut doit traduire un concept, pouvant être partagé par plusieurs compétences ou personnages ; certains statuts affichent la même icône et c'est bien, mais des concepts proches proposent des visuels très différents ». Relevé dans le code (0.129.0) :

- **34 états**, dont 30 en jeu ; **14 n'ont pas d'emblème** et montrent l'icône peinte de leur compétence (Garde brisée, Malchance, Aveuglé, Hémorragie, Sceau de vol, Dîme, Flamme votive, Sangsue, Peau de crapaud, Sentence, Bouclier de foi, Emprise, Surtension, Faute). Chaque compétence nouvelle a reçu son état au lieu de rejoindre un mot existant.
- **Des concepts proches, des images sans lien** : Drain (pièce grise) et Sangsue (sangsue peinte) disent tous deux « ses coups le soignent » ; Renvoi et Peau de crapaud, « le frapper se paie » ; Sentence et Flamme votive, « quand il se soigne, l'adversaire a mal ».
- **Des opposés sans lien** : la planche v12 avait une grammaire (Puissance, une épée et un chevron montant ; Affaibli, une épée et un chevron descendant ; Soin, un cœur et un chevron montant), que les malus venus ensuite n'ont pas suivie : Hémorragie est un couteau peint, pas le cœur du Soin ; Aveuglé un œil, pas l'étoile du Critique ; Malchance un dé peint, pas le dé du Dé en plus.

## 2. Les règles

1. **Un emblème = une question du spectateur**, pas une cause. Test : on cache le nom de la compétence ; si le spectateur ne réagit pas autrement, c'est le même emblème. Ce qui distingue les causes (qui l'a posé, de combien, sur quel coup) va dans l'infobulle, qui le dit déjà (« Vient de : … », `originsOf`).
2. **L'emblème dit le résultat, pour celui qui le porte.** Un effet qui profite au porteur prend l'état de ce résultat (Rancune : un coup reçu lui donne un critique, donc **Critique assuré**). Un effet qui frappe l'adversaire quand quelque chose arrive au porteur est une **Représaille**, quel que soit le mal fait (Riposte, Peau de crapaud, Sentence, Flamme votive) : jamais l'emblème du malus qu'il fera subir (une Brûlure verte chez le porteur se lirait « il brûle »). Le malus posé s'affiche ensuite de lui-même chez l'adversaire.
3. **Le moment va dans la pastille.** Chaque état a un moment par défaut (§ 3). Un statut qui agit à un autre moment porte une **pastille de déclencheur** (§ 5), petite pièce sur le bord haut gauche du médaillon (le compteur tient le bas droit). La liste des pastilles est fermée ; on n'en ajoute une que si deux statuts au moins en ont besoin.
4. **Un axe, un glyphe ; trois relations** (§ 4). Les états d'une même famille ([FAMILLES.md](FAMILLES.md) § 2) partagent un glyphe de base, et trois marques communes disent la relation :
   - **même concept** : même emblème ;
   - **même axe, en plus ou en moins** : le glyphe et un chevron montant ou descendant (Puissance, Affaibli) ;
   - **négation** (le malus empêche ce que donne le bonus) : le glyphe barré (Hémorragie : le cœur du Soin barré).
5. **Une ressource de synergie garde son emblème.** Un statut qu'une compétence ou une relique lit (condition `hasStatus`, multiplicateur `fromStatus`, relâche) doit se repérer seul : il a son état, son glyphe, et ne partage son médaillon avec aucun autre statut. Aujourd'hui : **Poison, Saignement, Brûlure** (lus par Virulence, Récolte, Morsure, Curée, Odeur du sang, Attiser, Sangsue, Embrasement, Fiole de venin, Croc de boucher, Soufflet de forge). C'est aussi pourquoi « perte de PV » n'est pas un Soin inversé : chacun a son moment (fin de tour, coup reçu, tours comptés) et ses consommatrices.
6. **Un nombre répond à une seule question.**
   - État à total (Puissance, Affaibli, Soin, Critique renforcé) : la somme signée des parts qui agissent **au même moment** (même pastille) ; deux moments font deux médaillons.
   - État à charges : un seul statut, son compteur (charges ou tours) ; plusieurs, **le plus grand nombre de charges**, soit le nombre de prochains déclenchements qui paient encore (deux statuts « au coup reçu » partent ensemble sur le même coup : additionner leurs charges mentirait).
   - Statut à seuil (Faute) : sa progression, « 2/3 ».
   - Un nombre qui ne peut valoir que 1 ne s'affiche pas.
7. **Aucun état n'emprunte une icône de compétence.** Tout état en jeu a son emblème gris `state-*`, dans la grammaire du § 7. Un statut nouveau sans emblème est un défaut, contrôlé par un test, pas une icône provisoire.
8. **Règle d'entrée : un nouvel état est l'exception.** On ne crée un état que si la réaction du spectateur est vraiment nouvelle et qu'au moins deux sources le posent (ou qu'une seconde est prévue et notée). Sinon, le statut se range sous l'état le plus proche et l'infobulle dit sa différence.
9. **La zone montre ce qu'il porte ou subit ; l'en-tête, ce qu'il est.** Une aura sur son porteur se lit sur son anneau, un mécanisme sur son sceau, une forme dans la barre (règle 0.79.7, [STATUTS.md](STATUTS.md) « Deux niveaux de lecture ») : ni emblème ni état. Un statut de relique, lui, n'a pas d'anneau : il entre dans la zone sous le concept qu'il sert (Emprise et Surtension : **Puissance**).

## 3. Le vocabulaire

Vingt états en jeu (2026-10-28, 0.129.0), au lieu de trente. « Moment » : le moment par défaut ; un statut qui agit à un autre porte sa pastille.

| État | Question du spectateur | Pol. | Emblème | Moment | Nombre | Statuts (pastille) |
| --- | --- | --- | --- | --- | --- | --- |
| **Puissance** | frappe-t-il plus fort ? | + | épée, chevron montant | chacun de ses coups | total | Poing de pierre, Emprise, Surtension ; Ferveur (coup porté) |
| **Affaibli** | frappe-t-il moins fort ? | − | épée, chevron descendant | chacun de ses coups | total | Affaibli ; Fausse note (coup porté) |
| **Bouclier** | encaisse-t-il moins ? | + | bouclier rond | aussitôt | charges | Armure temporaire ; Bouclier de foi (soin) |
| **Garde brisée** | son prochain coup reçu fera-t-il mal ? | − | bouclier barré | prochain coup reçu | charges | Garde brisée |
| **Critique assuré** | va-t-il critiquer ? | + | étoile à quatre branches | prochain coup | charges | Critique assuré ; Rancune (coup reçu) |
| **Critique renforcé** | son critique frappera-t-il plus fort ? | + | étoile, chevron montant | prochain critique | total | Mire |
| **Aveuglé** | ses critiques ratent-ils ? | − | étoile barrée | chacun de ses critiques | aucun | Aveuglé |
| **Esquive assurée** | va-t-il éviter le coup ? | + | flèche qui contourne un poteau | prochain coup reçu | charges | Esquive améliorée |
| **Dé en plus** | aura-t-il plus de jets ? | + | dé, chevron montant | prochaine action | charges | Coup de chance |
| **Malchance** | son prochain jet tombera-t-il à vide ? | − | dé barré | prochain jet sur une compétence | charges | Malchance |
| **Tour perdu** | perd-il son tour ? | − | entraves | prochaine action | aucun | Peur, Étourdi ; Faute (coup porté, « 2/3 ») |
| **Soin** | regagne-t-il des PV ? | + | cœur, chevron montant | ses tours | total | Sifflotement |
| **Hémorragie** | ne peut-il plus se soigner ? | − | cœur barré | tout le combat | aucun | Hémorragie |
| **Drain** | ses coups le soignent-ils ? | + | cœur, flèche qui en sort et y revient | coup porté | charges | Vol de vie, Sangsue ; Dîme (coup reçu) |
| **Représailles** | le toucher se paie-t-il ? | + | flèche en demi-tour | coup reçu | charges | Riposte, Peau de crapaud ; Sentence, Flamme votive (soin) |
| **Immunité** | ses malus tiennent-ils ? | + | cadenas fermé | tout le temps | tours | Immunité (Ampoule bénite) |
| **Sceau de vol** | son prochain bonus lui échappera-t-il ? | − | cadenas barré | prochain bonus | charges | Sceau de vol |
| **Poison** | perd-il des PV à chaque tour ? | − | goutte à bulles | fin de ses tours | charges | Poison (ressource, règle 5) |
| **Saignement** | perd-il des PV à chaque coup reçu ? | − | goutte sous une entaille | coup reçu | charges | Saignement (ressource) |
| **Brûlure** | brûle-t-il ? | − | flamme | fin de ses tours | charges | Brûlure (ressource) |

**Réserve** (statuts sans porteur ; état et emblème le jour où un statut en jeu l'alimente, pas avant) : **Vulnérable** (bouclier, chevron descendant : Vulnérable, Brèche), **Esquive empêchée** (flèche et poteau barrés : Luciole). La Régénération (sans porteur) va au Soin, la Garde sacrée à l'Immunité. Les états **Épines, Luciole, Brèche, Coup gâché, Sentence, Flamme votive, Sangsue, Peau de crapaud, Dîme, Bouclier de foi, Emprise, Surtension, Faute** disparaissent.

## 4. Les axes et leurs marques

Un glyphe de base par axe ; les marques sont les mêmes partout (même forme, même taille, une seule par emblème).

| Axe (famille) | Glyphe de base | Le glyphe seul | Chevron montant | Chevron descendant | Barre (négation) |
| --- | --- | --- | --- | --- | --- |
| Puissance | épée droite | — | Puissance | Affaibli | — |
| Garde | bouclier rond | Bouclier | — | Vulnérable (réserve) | Garde brisée |
| Précision | étoile à quatre branches | Critique assuré | Critique renforcé | — | Aveuglé |
| Esquive | flèche qui contourne un poteau | Esquive assurée | — | — | Esquive empêchée (réserve) |
| Fortune | un dé | — | Dé en plus | — | Malchance |
| Tempo | entraves | Tour perdu | — | — | — |
| Soin | cœur | — | Soin | — | Hémorragie |
| Soin (drain) | cœur et flèche en boucle | Drain | — | — | — |
| Représailles | flèche en demi-tour | Représailles | — | — | — |
| Sceaux | cadenas fermé | Immunité | — | — | Sceau de vol |
| Affliction | goutte à bulles, goutte sous entaille, flamme | Poison, Saignement, Brûlure (un glyphe chacun, règle 5) | — | — | — |

Lecture : **le glyphe seul**, il a la chose ; **le chevron**, la chose augmente ou diminue ; **la barre**, la chose lui est refusée. Les états d'un même axe sonnent aussi pareil à la pose ([SONS.md](SONS.md) § 2, règle 1 : famille et polarité) : l'œil et l'oreille rangent de la même façon.

## 5. Les pastilles de déclencheur

Une petite pièce de la même grammaire (§ 7), sur le bord haut gauche du médaillon, environ 45 % de son diamètre. Elle dit **quand** l'état agit, seulement si ce n'est pas le moment par défaut de son état (§ 3). Deux statuts du même état à des moments différents font deux médaillons (même emblème, pastilles différentes).

| Pastille | Glyphe | Sens | En jeu |
| --- | --- | --- | --- |
| **Coup porté** | une flèche qui part du centre vers l'extérieur | à son prochain coup qui touche | Ferveur, Fausse note, Faute |
| **Coup reçu** | une flèche qui frappe un point au centre | au prochain coup qui le touche | Rancune, Dîme |
| **Soin** | un petit cœur plein | chaque fois qu'il regagne des PV | Bouclier de foi, Sentence, Flamme votive |

Réserve, pour le jour où deux statuts en auront besoin : **Critique** (étoile), **Esquive**, **Armure vidée**.

## 6. Un sort nouveau : faut-il un statut, un état, une icône ?

Les questions dans l'ordre ; la première réponse qui tranche arrête la descente.

1. **L'effet dure-t-il au-delà de l'étape qui le produit** (il attend un moment, compte des tours ou des charges) ? Non : **pas de statut**. Dégâts, soin, purge immédiats se lisent sur le sceau de la compétence et les textes flottants.
2. **Est-ce l'identité du porteur** (aura posée pour le combat), **une règle de forme ou un mécanisme de compétence** ? Oui : il se montre dans l'en-tête, sous l'icône peinte de sa compétence ; **ni état ni emblème** (règle 9).
3. **Un statut existant applique-t-il déjà exactement cette règle** ? Oui : la compétence pose ce statut (une brique, pas un statut neuf, [FAMILLES.md](FAMILLES.md) § 1). Sinon : un nouveau statut ([STATUTS.md](STATUTS.md), [ARCHITECTURE.md](ARCHITECTURE.md) « Étendre le jeu »), puis la suite.
4. **Une compétence ou une relique lira-t-elle ce statut** (condition, multiplicateur, relâche) ? Oui : c'est une ressource, **son propre état et son propre glyphe** (règle 5) ; aller à 7.
5. **Quelle question du spectateur** (règles 1 et 2) ? Si un état du § 3 y répond : le statut le **relaie**, avec une pastille si son moment n'est pas celui de l'état. **Rien à peindre.**
6. **Est-ce l'opposé ou la négation d'un état existant** ? Oui : nouvel état, son emblème est **le glyphe de l'axe et sa marque** (§ 4) ; une seule icône à générer, sans motif à inventer.
7. **Sinon, un concept nouveau** : la règle d'entrée (règle 8) d'abord. Passée, un **glyphe de base nouveau**, distinct en silhouette de tous les autres, ajouté au § 4 ; ratée, le statut rejoint l'état le plus proche (étape 5) et l'infobulle dit sa différence.
8. **Le moment** : s'il manque une pastille au § 5, elle n'entre que si deux statuts au moins en ont besoin ; sinon, l'infobulle dit le moment.

Puis : la ligne du § 3 (et du § 4 ou § 5 si besoin), l'emblème généré selon le § 7, le relais dans `DISPLAYED`, l'emblème dans `STATE_ICON`.

**Exemples, sur le contenu de la 0.129.0 :**
- Flamme votive (« chacun de ses prochains soins brûle l'adversaire ») : statut (1), pas une aura (2), règle propre (3), personne ne la lit (4), « le toucher, ou le soigner, se paie ? » : **Représailles**, pastille **Soin** (5). Rien à peindre.
- Hémorragie (« ne regagne plus de PV ») : question nouvelle, mais négation du Soin (6) : **cœur barré**.
- Curée (« si l'adversaire saigne, des coups de plus ») : elle lit le Saignement, qui garde son état et son glyphe (4).
- Rancune (« chaque coup reçu lui donne un critique assuré ») : le résultat profite au porteur (règle 2), **Critique assuré**, pastille **Coup reçu**.
- Emprise, une relique (« ses coups font +1 par malus de l'adversaire ») : pas d'anneau (règle 9), **Puissance** ; son total compte les malus de l'adversaire.

## 7. Grammaire visuelle et génération

Les emblèmes v12 (2026-10-21) étaient des pièces d'argent et de fer martelées, au bord épais, au symbole en relief. Demande de l'utilisateur (2026-10-28) : **même concept, traitement plus simple** ; tous les emblèmes sont refaits.

| | Avant (v12, v15) | Désormais |
| --- | --- | --- |
| Pièce | argent et fer vieillis, surface martelée, usure | fer sombre lisse, bord fin et uni, aucune texture |
| Symbole | gravé en relief, ombres profondes | **un seul** symbole argent clair, à peine bombé, une seule arête douce |
| Lecture | un objet sur une pièce | un panneau : silhouette épaisse, fort contraste clair sur sombre |
| Marques | chevrons libres (un ou deux), lame brisée en plus | chevron montant, chevron descendant, barre : identiques partout, une au plus |

Ce qui ne change pas : rondes et toutes du même diamètre, monochromes (la teinte de polarité est posée en CSS, `.state-tint`), sans cadre, le compteur sur le bord bas droit ; une planche par type d'icône ([STYLE_BIBLE.md](STYLE_BIBLE.md) § 7).

**Génération** (Artlist, [STYLE_BIBLE.md](STYLE_BIBLE.md) § 8, point 6) : GPT Image 2.5, carré `1:1`, qualité haute, fond transparent, deux versions par appel (200 crédits la paire, devis du 2026-10-28) ; la planche pilote validée sert ensuite de référence (image à image). Découpe par `scripts/slice-coins.py` (disques, 128 px, sans marge), environnement Python avec numpy, pillow et scipy (`python -m venv`, `pip install numpy pillow scipy`) ; planche de contrôle à 48 et 24 px, compteur et pastille posés dessus, regardée avant l'intégration.

**Prompt d'une planche d'emblèmes** (complet, à coller tel quel ; on remplace `<N>`, `<G>`, la ligne des cases vides et la liste) :

```text
Create a single square image, 1024x1024, containing a sprite sheet of <N> game status emblems
arranged in a strict <G>x<G> grid (<G> columns, <G> rows). Each emblem is centered in its own
invisible cell (1/<G> of the width and height), occupies about 82% of the cell, and never touches
or overlaps the cell borders. All coins have exactly the same diameter. <The last K cells stay
completely EMPTY.>

BACKGROUND: fully transparent, real alpha channel. Do NOT paint a checkerboard pattern.
If transparency is not possible, use a perfectly flat, uniform pure black background (#000000)
with no gradient, no texture, no vignette, no shadow under the coins.
NO grid lines, NO labels, NO numbers, NO letters, NO text anywhere.

PURPOSE: these are STATUS EMBLEMS for a fantasy auto-battler watched on a television. Each one is
shown at 48 pixels and down to 24 pixels, with a small counter over its lower right edge and
sometimes a tiny badge over its upper left edge. Each must read in a split second as ONE SYMBOL,
like a road sign, never as an illustration. The game's skill icons are rich painted objects;
these emblems must look clearly simpler and different from them.

STYLE: MONOCHROME AND SIMPLE. Each emblem is a flat round coin seen perfectly head-on: a smooth
dark iron face with no texture, no hammering, no scratches, no wear, no rivets, no ornament, and a
plain thin raised rim. In the center, ONE bold symbol in light polished silver, barely raised, with
a single soft bevel. Strong contrast: light symbol on a dark face. Grey metal only, no other color
at all (the game tints them). Thick shapes, rounded joints, no thin lines, no small details, nothing
else on the coin. The symbol fills about 60% of the coin. Soft light from the top-left.

SHARED MARKS, drawn with exactly the same shape, thickness and size on every emblem that has one,
never more than one mark per emblem:
- UP CHEVRON: one thick upward chevron just above the symbol (more, gained).
- DOWN CHEVRON: one thick downward chevron just below the symbol (less, lost).
- BAR: one thick straight diagonal bar from the upper left to the lower right of the coin face,
  crossing the whole symbol (denied, prevented).
Two emblems built on the same symbol must show the very same symbol, in the same orientation, only
the mark changes: never flip, rotate or mirror the symbol.

AVOID: any color, gold, rich illustration, texture noise, engraved patterns, emoji look, flat vector
clip-art, cute or cartoon style, glossy plastic, 3D perspective, photorealism, text, real-world
religious symbols (no crosses), hands, faces, skulls.

EMBLEMS, in reading order (left to right, top to bottom), each one coin:
Row 1:
 1. <symbole, marque> (<sens en deux mots>)
 ...
```

**Les symboles** (liste du prompt, dans l'ordre du § 3) :

| Fichier | État | Symbole (prompt) |
| --- | --- | --- |
| `state-power.png` | Puissance | a broad short sword, wide blade, point up, with the UP CHEVRON (more damage) |
| `state-weakened.png` | Affaibli | the same broad short sword, point up, with the DOWN CHEVRON (less damage) |
| `state-shield.png` | Bouclier | a round buckler shield seen head-on, a thick rim and a central boss (damage shield) |
| `state-guard-broken.png` | Garde brisée | the same round buckler with the BAR (shield denied) |
| `state-sure-crit.png` | Critique assuré | a sharp four-pointed star (sure critical) |
| `state-crit-power.png` | Critique renforcé | the same four-pointed star with the UP CHEVRON (stronger critical) |
| `state-blinded.png` | Aveuglé | the same four-pointed star with the BAR (criticals fail) |
| `state-sure-dodge.png` | Esquive assurée | a thick curved arrow swerving around a short upright post (sure dodge) |
| `state-extra-die.png` | Dé en plus | one six-sided die seen at a slight angle, pips as simple dots, with the UP CHEVRON (extra roll) |
| `state-jinxed.png` | Malchance | the same die with the BAR (wasted roll) |
| `state-lost-turn.png` | Tour perdu | a pair of iron shackles, two cuffs joined by a short chain (loses its turn) |
| `state-healing.png` | Soin | a heart with the UP CHEVRON (healing) |
| `state-no-healing.png` | Hémorragie | the same heart with the BAR (no healing) |
| `state-drain.png` | Drain | the same heart with a thick curved arrow leaving it and looping back into it (life drain) |
| `state-reprisal.png` | Représailles | a thick arrow making a U-turn, coming back the way it came (paid back) |
| `state-immunity.png` | Immunité | a closed padlock (protected) |
| `state-bonus-stolen.png` | Sceau de vol | the same closed padlock with the BAR (protection denied) |
| `state-poison.png` | Poison | a single teardrop with three small bubbles rising inside (poison) |
| `state-bleed.png` | Saignement | a single heavy drop below a short diagonal slash mark (bleeding) |
| `state-burn.png` | Brûlure | a single bold flame tongue (burn) |

**Planche des pastilles** (§ 5) : le même prompt, `<N>` = 3 sur une grille 2×2 (la dernière case vide), et ce paragraphe ajouté après PURPOSE : _« These three are TRIGGER BADGES: tiny coins shown at 20 pixels over the corner of an emblem. Same coin as the emblems, but the symbol is even simpler, one single shape filling 70% of the coin. »_ Symboles : 1. `badge-strike` : a thick arrow leaving the center toward the upper right (when he strikes) · 2. `badge-hurt` : a thick arrow striking down into a small dot at the center (when he is hit) · 3. `badge-heal` : a small solid heart (when he heals).

## 8. Le chantier (2026-10-28)

**Responsable** : l'agent (demande de l'utilisateur). **Prérequis** : la fin du chantier en cours de l'autre agent (règles et équilibre : `statuses.ts`, `states.ts`, `StatusTray.tsx` bougent encore). Rien n'est appliqué au code avant.

| Étape | Contenu | État |
| --- | --- | --- |
| 0. Règles | ce document ; renvois dans `CLAUDE.md` et `docs/README.md` | fait |
| 1. Pilote | quatre emblèmes (Soin, Hémorragie, Puissance, Affaibli) pour valider le traitement simplifié et les marques ; il devient la référence de style | fait : voir ci-dessous |
| 2. Reprise | relire statuts, compétences, auras et reliques tels que l'autre agent les laisse ; relancer l'inventaire (chaque statut de la zone : état, icône, déclencheurs, sources, lecteurs ; `VITE_CONFIG_NATIVE_IGNORE_WARNING=true npx vitest run --config ~/.cache/battler-emblems/vitest.config.ts --root . --silent=false`) ; passer chaque statut nouveau par le § 6 ; mettre à jour les § 3 à 5 | à faire |
| 3. Génération | les vingt emblèmes, sur la référence du pilote (image à image) : une planche 4×4 et une 2×2, puis la planche des pastilles ; deux versions par planche, la meilleure de chaque emblème ; découpe, planche de contrôle | à faire |
| 4. Code | voir ci-dessous | à faire |
| 5. Tests | voir ci-dessous | à faire |
| 6. Rendu | une capture de la zone d'état (statuts imposés, avec pastilles et compteurs) et une de la section Statuts du compendium, Firefox sans interface, port à part | à faire |
| 7. Documents | ce document (état présent), [STATUTS.md](STATUTS.md) (table des états : renvoi ici), [STYLE_BIBLE.md](STYLE_BIBLE.md) § 7 (le prompt v12 remplacé par un renvoi ici, historique des planches), [FEATURES.md](FEATURES.md) § 3, [SYSTEMES.md](SYSTEMES.md) (la pastille, un rappel visuel), [ARCHITECTURE.md](ARCHITECTURE.md) si `trayStates` change de signature, `ETAT.md`, `CHANGELOG.md`, version mineure | à faire |
| 8. Compte rendu | ce qui a changé, ce qui a été vu, ce qui ne l'a pas été | à faire |

**Le pilote (2026-10-28)** : GPT Image 2.5, texte seul, 200 crédits, deux versions ; vrai canal alpha, découpe par `slice-coins.py` sans retouche (rayons 196 à 202 px). Les deux se lisent à 24 px, teintées et sous un compteur : le cœur et l'épée restent reconnaissables, le chevron et la barre se voient. **Version B retenue** : elle garde le même symbole d'un emblème à son opposé ; la version A retournait l'épée d'Affaibli (pointe en bas), d'où la phrase « never flip, rotate or mirror » ajoutée au prompt. L'épée, fine à 24 px, est demandée « broad short sword » pour la suite. Planches et inventaire gardés hors du dépôt, dans `~/.cache/battler-emblems/` (pilote A et B, comparaison avec les emblèmes actuels, script d'inventaire) ; le pilote n'est pas intégré : ses quatre emblèmes seront refaits avec les seize autres (étape 3), sur sa référence, pour une planche homogène.

**Le code (étape 4)** :
- `states.ts` : `StateId` réduit aux vingt états du § 3 et aux deux de réserve ; les relais de `DISPLAYED` suivent la colonne « Statuts » ; un `Relay` déclare sa pastille (`trigger`) ; `trayStates` regroupe par (état, pastille) et applique la règle 6 (total par moment, le plus grand nombre de charges, seuil « n/N », pas de « 1 » seul) ; il reçoit les statuts de l'adversaire pour le total de l'Emprise.
- Les résumés des états suivent leur question (Puissance : « Il fait plus de dégâts. », la Surtension y entre ; Représailles : « Quand on le touche, ou quand il se soigne, l'adversaire en paie le prix. ») ; le résumé du Poison dit « à la fin de ses tours » (il dit encore « au début », faux depuis M2).
- `Icon.tsx` : `STATE_ICON` ne pointe que vers des `state-*` ; les noms des pastilles ; `StateIcon` sans repli peint.
- `StatusTray.tsx` : la pastille sur le bord haut gauche ; l'infobulle dit le moment de chaque part.
- Les fichiers d'emblèmes sans usage sont supprimés (`state-rot`, `state-thorns`, `state-firefly`, `state-breach`, `state-spoiled`, `state-vulnerable`, `state-reflect`) ; avant, chercher leurs usages hors de la zone (compendium, pastilles de règles, puces des reliques).
- Présentation seulement : le moteur, l'équilibre et l'empreinte de non-régression ne bougent pas. À vérifier : aucun `StateId` dans l'historique `battler:history:v1`.

**Les tests (étape 5)** : chaque état alimenté par un statut en jeu a un emblème `state-*`, et aucun état n'emprunte une icône de compétence (règle 7) ; deux statuts du même état et du même moment font un médaillon, deux moments en font deux ; le nombre regroupé (total, plus grand nombre de charges, seuil) ; une ressource lue (règle 5) ne partage son médaillon avec aucun statut. `npm run check`, `npx vite build`.

**Budget** : 2 923 crédits Artlist le 2026-10-28 avant le pilote, 2 723 après. Reste à dépenser : planches 4×4 et 2×2, 400 ; pastilles, 200 ; retouches, 200 à 400 : environ 1 000.
