# Les règles du son

Ce document fait foi pour tout ce qu'on entend dans le jeu : quels sons existent, ce que chacun veut dire, quand il joue, et comment une nouvelle compétence ou un nouveau statut reçoit le sien. Le code suit ce document (`sound.ts`, `useCombat.ts`) ; s'ils divergent, c'est le code qu'on corrige.

> **Statut : validé par l'utilisateur (0.36.2), appliqué dans le code.** Proposé en 0.36.1 ; l'utilisateur a tranché les questions ouvertes (§ 8) et choisi à l'oreille le fichier de chaque son (0.36.3, § 7). Qui joue quel son : § 9.

## 1. Pourquoi ces règles

Bilan de la 0.36.0, jugé par l'utilisateur comme « une véritable cacophonie ». Les causes, relevées dans le code :

| Cause | Exemple en 0.36.0 |
| --- | --- |
| **Plusieurs fichiers pour un même son**, tirés au hasard | 2 victoires, 3 impacts moyens, 2 transformations dans chaque sens : le même moment ne sonne jamais pareil, et l'oreille ne prend aucun repère. |
| **Plusieurs sons empilés sur un seul instant** | Un coup critique jouait l'annonce du critique, l'élan, l'impact lourd et l'impact critique : quatre sons pour un coup. La Furie des vents jouait sa bourrasque et deux roulements de dé en même temps. |
| **Trop de sons**, hérités des sons synthétisés | 33 sons (élan, annonce du critique, rugissement, griffes, épines, parade, carillon…), là où l'observateur ne distingue qu'une poignée de significations. |
| **Des sons sans rapport avec leur action** | Le soin de l'orc (Rage du sang) sonnait comme un objet qui tombe ; le poison tapait fort au lieu de grésiller. Les fichiers ont été rangés par catégorie sans être écoutés. |

## 2. Les règles

1. **Un son = une signification.** Chaque son dit une seule chose à l'observateur (« une aura arrive », « un coup porte »). Deux moments qui veulent dire la même chose ont le même son, quel que soit le personnage.
2. **Un son = un fichier.** Pas de variante tirée au hasard : un repère sonore doit être identique à chaque fois.
   **Exception déclarée, les dés** (décision de l'utilisateur, 0.36.4) : Dé lancé a 2 fichiers et Dé posé en a 3, tirés au hasard à chaque jet, comme en 0.36.0, qui sonnait « vraiment mieux » pour l'utilisateur. Un vrai dé ne sonne jamais deux fois pareil, et le dé ne porte pas de signification à reconnaître : c'est le résultat qui compte. Toute autre exception s'ajoute ici, avec sa raison (`VARIED_SOUNDS`, `sound.ts`).
3. **Un instant = un son signature.** Chaque résolution (un coup, des dégâts, un état posé) se satisfait d'un seul son. Quand un instant pourrait en appeler plusieurs, la priorité du § 4 en choisit un. Une séquence (le dé roule, puis se pose) n'est pas un empilement : ses sons se suivent.
   **Exception, les cas particuliers déclarés : les sons composés.** Un moment exceptionnel peut, et doit, jouer plusieurs sons ensemble pour appuyer sa dimension sonore. Aujourd'hui, un seul : le **Coup critique**, qui joue le Coup et le Grondement ensemble. Tout autre son composé s'ajoute ici, avec sa raison.
4. **Le son vient de la nature de l'effet, pas de la compétence.** Une compétence ne choisit pas son son : il se déduit de ce qu'elle produit, d'après les registres (aura, bonus, malus, soin, dégâts…). Une nouvelle aura sonne donc automatiquement comme toutes les auras. Aucun son propre à une compétence ou à un personnage sans une décision écrite ici (§ 6).
5. **Le timbre ressemble à la chose.** Le poison est liquide et discret (bulles, grésillement, vapeur), pas un choc. Un soin est doux et clair. Un coup est un choc. Chaque son a sa description au § 3, qui sert aussi de consigne de recherche.
6. **L'intensité suit l'importance.** Quatre niveaux (§ 3) : ce qui décide du combat (coup critique, KO) passe au-dessus de ce qui revient à chaque tour (dés, poison qui ronge). Les effets périodiques et l'interface restent discrets.
7. **Le silence est permis.** Ce qui se voit déjà et revient souvent sans rien changer (un compteur qui baisse, un bonus qui expire) ne sonne pas.
8. **Un son tient dans sa fenêtre.** Il se termine avant l'instant suivant à ×1 (durées du § 3). À ×2 et ×4, il est écourté au prorata, avec un fondu ; seuls le clic, le choc du face-à-face, le KO et la victoire jouent en entier.

## 3. Le vocabulaire : 21 sons

Intensité : **1** fort, **2** appuyé, **3** moyen, **4** discret.

| Famille | Son | Ce qu'il veut dire | Timbre recherché | Intensité | Durée |
| --- | --- | --- | --- | --- | --- |
| **Hasard** | Dé lancé | un dé roule (attaque, initiative, rafale) | dé qui roule sur du bois | 3 | 1 à 2 s, coupé quand le dé se pose |
| | Dé posé | le dé s'arrête, le résultat est là | petit choc net de dé qui s'immobilise | 3 | 0,2 à 0,3 s |
| | Pièce lancée | Pile ou face : la pièce tournoie en l'air | pièce qui tournoie, léger et en retrait : le résultat doit se détacher | 4 | 1 à 1,5 s, coupé quand elle retombe |
| | Pièce retombe | le résultat de la pièce est là, pile comme face | pièce qui claque net sur une table, plus fort que le lancer | 2 | 0,2 à 0,6 s |
| | Pile réussie | la pièce est tombée sur pile : la voleuse a gagné son pari | « ding » clair et net, juste après la pièce qui retombe | 2 | 0,5 à 0,8 s |
| **Coups** | Coup | des dégâts portés par un coup, quelle qu'en soit la source | frappe d'épée, bruit métallique net | 2 | 0,3 à 0,4 s |
| | Coup critique (composé) | un coup critique, le coup de Pile, ou le dernier coup d'une relâche (Rétribution) | **Coup + Grondement**, joués ensemble | 1 | celle du Grondement |
| | *Grondement* | couche du Coup critique, jamais jouée seule | gros choc grave qui résonne | 1 | 0,6 à 0,9 s |
| | Esquive | un coup qui manque sa cible | arme qui fend l'air dans le vide | 3 | 0,2 à 0,3 s |
| **États** | Aura gagnée | un personnage pose son aura | souffle magique qui enfle, accord lumineux | 2 | 0,8 à 1,2 s |
| | Aura perdue | une aura est retirée | le même souffle qui retombe et s'éteint | 3 | 0,6 à 1 s |
| | Bonus gagné | un bonus posé sur soi (hors aura) | synthé magique en majeur, ascendant, lumineux | 3 | 0,4 à 0,7 s |
| | Malus reçu | un malus posé sur un combattant | synthé magique en mineur, sombre | 3 | 0,4 à 0,7 s |
| | Dissipation | un bonus ou un malus retiré par une compétence | synthé magique qui descend dans les notes | 3 | 0,3 à 0,6 s |
| | Tour perdu | le combattant ne peut pas agir (peur, étourdissement) | raclement ou craquement sourd, lugubre | 3 | 0,6 à 0,9 s |
| | Ronge | un statut inflige des dégâts en début ou fin de tour (poison, pourriture, brûlure, aura de poison) | à trouver : liquide qui bouillonne et vapeur toxique (0.36.1), ou gémissement d'âme lugubre (piste de la livraison 0.36.3) ; discret, aucun choc | 4 | 0,3 à 0,5 s |
| | Soin | des PV regagnés, quelle qu'en soit la source | synthé léger, notes ascendantes, bénéfique ; le fichier retenu est un tintement très bref | 3 | 0,05 à 0,7 s |
| **Formes** | Transformation | le druide change de forme, dans un sens comme dans l'autre | aura magique qui éclate, scintillante | 2 | 0,8 à 1,2 s |
| **Fin** | KO | le perdant s'effondre | corps et armure qui tombent lourdement | 1 | 0,3 à 1,5 s |
| | Victoire | le combat est gagné | fanfare glorieuse, cuivres et éclat ; **surtout pas rétro** (ni chiptune, ni 8 bits) | 2 | 1,5 à 5 s |
| **Interface** | Clic | un bouton | clic sec, bois ou métal léger | 4 | 0,05 à 0,1 s |
| | Choc du face-à-face | la présentation du duel | choc glorieux, épique | 1 | 0,6 à 4 s |

Le Grondement n'est pas un son à part entière : c'est une couche. Le vocabulaire compte donc 21 significations. Le Coup critique n'a pas de fichier, le Grondement en a un ; les dés en ont plusieurs (règle 2).

**Retirés par rapport à la 0.36.0** (33 sons) : dé au maximum (décision de l'utilisateur), élan (décision : l'impact suffit à faire sonner un coup), les trois paliers d'impact (fondus dans Coup), annonce du critique, carillon d'événement, peur (devient Malus reçu quand elle est posée, puis Tour perdu), purification (Dissipation), épines et parade (Coup), vol de vie (Soin), attente de l'ogre (Malus reçu), Furie des vents (Bonus gagné), pile et face (Pièce retombe, la même sur les deux faces, puis Coup critique sur pile), druide vers ours et ours vers druide (Transformation), rugissement et griffes (Coup).

## 4. Quel son pour quel moment

### 4.1 Les étapes du combat

| Étape (`beat`) | Ce qu'on entend |
| --- | --- |
| Initiative | Dé lancé, puis Dé posé (une fois, même avec deux dés) |
| `attack` | Dé lancé, Dé posé, puis Coup, Coup critique ou Esquive. L'élan vers l'adversaire est muet : seul l'impact sonne. Un jet de compétence (1, 2 ou 3) s'arrête au Dé posé : le son de la compétence suit. Un coup transformé (Charge, Coup de griffe) sonne comme un coup. |
| `flurry` (Furie des vents) | Un seul Dé lancé pour tous les dés, un seul Dé posé ; puis le son de chaque coup, qui se suivent sans se chevaucher |
| `event` (compétence) | Le son déduit de ses effets (§ 4.2) |
| `statusTick` | Ronge si le statut inflige des dégâts ; Soin s'il soigne |
| `statusReaction` | Coup si le statut renvoie des dégâts (Épines, Riposte), même pour un gros renvoi ; Soin s'il soigne (Vol de vie) ; sinon le son déduit de ses effets (§ 4.2), par exemple Malus reçu quand l'Aura de décoction empoisonne |
| `skip` | Tour perdu |
| `shift` | Transformation |
| `coin` | Pièce lancée, Pièce retombe ; sur pile, Pile réussie juste après (0,14 s), puis Coup critique au coup ; sur face, rien de plus. La pièce seule ne disait pas assez si le pari était gagné (retour de l'utilisateur, 0.36.4). |
| `statusDuration`, `statusExpire` | Rien : le compteur qui baisse et l'icône qui part se voient (règle 7) |
| Fin du combat | KO, puis Victoire |

Un coup de compétence (Rétribution, une jauge par coup) joue un Coup par jauge, l'un après l'autre ; le dernier, mis en scène comme un coup lourd, joue le Coup critique (décision de l'utilisateur). Un coup de compétence unique de 10 dégâts ou plus est aussi un coup lourd.

### 4.2 Le son d'une compétence

Une compétence joue **un seul son**, le premier de cette liste qui correspond à ce qu'elle a réellement produit :

1. une aura posée → **Aura gagnée** ;
2. une aura retirée (purification) → **Aura perdue** ;
3. un malus posé, sur l'adversaire ou sur soi → **Malus reçu** ;
4. un bonus posé sur soi → **Bonus gagné** ;
5. un bonus ou un malus retiré → **Dissipation** ;
6. des PV regagnés → **Soin** ;
7. des dégâts → **Coup** (un par coup joué) ;
8. rien de tout cela (effet refusé par une immunité, par exemple) → aucun son : le texte flottant suffit.

Les sons se déduisent des registres : aura (`isAura`), polarité (`polarity`), type d'effet (`heal`, `damage`, `cleanse`, `applyStatus`). Aucun nom de compétence ni de statut n'apparaît dans la règle.

### 4.3 Vérification : les 28 compétences du roster

| Son | Compétences |
| --- | --- |
| Aura gagnée | Aura de puissance, Aura de précision, Aura d'intimidation, Aura de poison, Aura de sainteté, Aura de décoction, Aura d'immunité (elle purge aussi, mais l'aura passe en premier), Aura de pourriture |
| Bonus gagné | Furie des vents, Œil de faucon, Esquive améliorée, Peau de pierre, Épines, Vol de vie, Coup de chance, Pile ou face, Riposte, Écorce épaisse |
| Malus reçu | Souffle de la tombe, Peur, Luciole, Attente (ogre) |
| Dissipation ou Aura perdue | Purification (Aura perdue si le bonus retiré est une aura) |
| Soin | Rage du sang, Fleur de vie |
| Coup | Rétribution, Charge, Coup de griffe |

## 5. Mixage

- Les fichiers sont égalisés à la même intensité par `scripts/process-sounds.py` ; le niveau de chaque son se règle ensuite dans `MIX` (`sound.ts`), d'après les quatre niveaux du § 3.
- Niveaux (0.36.4) : niveau 1 à 100 %, niveau 2 à 85 %, niveau 3 à 70 %, niveau 4 à 45 %. Les dés restent un peu sous le niveau 3 (47 et 64 %).
- **Volume général** (0.36.4, « on n'entend rien ») : fichiers égalisés à -12 dB RMS au lieu de -16, volume général à 100 % au lieu de 60 %, puis un compresseur (seuil -14 dB, rapport 4) et un gain de 1,4. Les sons sont nettement plus forts, et le compresseur empêche la saturation quand ils se chevauchent.
- Le Coup critique additionne ses deux couches : le Coup à son niveau, le Grondement au niveau 1.

## 6. Étendre le jeu

- **Nouvelle compétence, nouveau statut** : rien à faire. Le son se déduit de ses effets (§ 4.2). Si aucun son ne lui correspond, c'est une nouvelle signification : on l'ajoute d'abord ici, au vocabulaire (§ 3) et à la priorité (§ 4.2).
- **Nouveau type d'étape** : lui donner sa ligne au § 4.1 avant de coder sa mise en scène.
- **Son propre à une compétence** (signature) : interdit par défaut (règle 4). Il faut une décision écrite ici, avec sa raison ; aucune n'existe aujourd'hui.

## 7. Les fichiers

- Un seul fichier par son : `src/assets/sounds/<nom>.mp3`, traité par `scripts/process-sounds.py` (silence de tête coupé, durée ramenée à sa fenêtre, intensité égalisée). La provenance de chaque fichier est notée dans `src/assets/sounds/SOURCES.md`.
- Le choix du fichier se fait **à l'oreille, par l'utilisateur** : l'agent ne peut rien écouter. Parmi les 67 fichiers de la 0.36.0, certains peuvent servir (un impact pour Coup, un roulement pour Dé lancé) ; les autres sons sont à chercher d'après le timbre du § 3.
- Un son sans fichier garde sa version synthétisée en repli.

**Le code** : `sfx.<son>()` dans `sound.ts`, un appel par signification ; la règle du § 4.2 est `cueOf` (`cues.ts`), testée sur tout le roster (`modules.test.ts`).

**Les fichiers en place (0.36.4)** : choisis à l'oreille par l'utilisateur (livraison `sfx_choix_good`, Freesound, CC0), sauf mention. Durées après traitement.

| Son | Nom dans le code | Fichier du jeu | Source | Durée |
| --- | --- | --- | --- | --- |
| Dé lancé | `dice-roll`, `sfx.diceRoll` | `dice-roll-1.mp3`, `dice-roll-2.mp3` (au hasard) | variantes de la 0.36.0 (`de-qui-roule-1`, `-2`) | 1,03 s |
| Dé posé | `dice-land`, `sfx.diceLand` | `dice-land-1.mp3` à `dice-land-3.mp3` (au hasard) | variantes de la 0.36.0 (`de-qui-se-pose-1` à `-3`) | 0,24 à 0,28 s |
| Pièce lancée | `coin-toss`, `sfx.coinToss` | `coin-toss.mp3` | `coin-toss-1` | 1,25 s (source très faible, +38 dB) |
| Pièce retombe | `coin-land`, `sfx.coinLand` | `coin-land.mp3` | `coin-land-4` | 0,22 s |
| Pile réussie | `coin-win`, `sfx.coinWin` | `coin-win.mp3` | **généré par l'agent** (0.36.4) : cloche à quatre partiels (1 318, 2 637, 3 640 et 5 274 Hz), décroissance rapide | 0,80 s |
| Coup | `hit`, `sfx.hit` | `hit.mp3` | `hit.wav`, déposé par l'utilisateur (0.36.4) | 0,70 s |
| Coup critique | `sfx.crit` | Coup + Grondement | | |
| Grondement | `crit-rumble` | `crit-rumble.mp3` | `crit.wav`, déposé par l'utilisateur (0.36.4) | 1,20 s |
| Esquive | `dodge`, `sfx.dodge` | `dodge.mp3` | `dodge-2` | 0,27 s |
| Aura gagnée | `aura-gain`, `sfx.auraGain` | `aura-gain.mp3` | `aura-gain-2` | 0,88 s |
| Aura perdue | `aura-loss`, `sfx.auraLoss` | `aura-loss.mp3` | `aura-loss-1` | 0,80 s |
| Bonus gagné | `buff`, `sfx.buff` | `buff.mp3` | `buff-1` | 0,55 s |
| Malus reçu | `debuff`, `sfx.debuff` | `debuff.mp3` | `debuff-2` | 0,43 s |
| Dissipation | `dispel`, `sfx.dispel` | `dispel.mp3` | `dispel-5` | 0,35 s |
| Tour perdu | `stun`, `sfx.stun` | `stun.mp3` | `stun-1` | 0,61 s |
| Ronge | `rot`, `sfx.rot` | **aucun** : son synthétisé discret | aucune retenue | |
| Soin | `heal`, `sfx.heal` | `heal.mp3` | `heal-1` | 0,09 s (tintement bref) |
| Transformation | `shift`, `sfx.shift` | `shift.mp3` | `shift-3` | 1,19 s |
| KO | `ko`, `sfx.ko` | `ko.mp3` | `ko-1` | 0,38 s |
| Victoire | `victory`, `sfx.victory` | `victory.mp3` | `victory-1` | 3,88 s |
| Clic | `click`, `sfx.click` | `click.mp3` | `click-1` | 0,10 s |
| Choc du face-à-face | `clash`, `sfx.clash` | `clash.mp3` | `clash-2` | 3,47 s |

## 8. Décisions de l'utilisateur

| Question | Décision (2026-10-18) |
| --- | --- |
| Un son pour le jet maximal ? | Non. |
| Un son pour l'élan ? | Non : l'impact suffit à faire sonner un coup normal. |
| Le dernier coup de la Rétribution ? | Il sonne comme un coup lourd : Coup critique. |
| Plusieurs sons à la fois ? | Seulement pour des cas particuliers déclarés, comme le critique ; toute autre résolution a un son signature. |
| Les dés | Les sons de dés de la 0.36.0 conviennent. |
| La victoire | Elle doit être plus glorieuse ; jamais le son rétro. |
| La pièce | Le lancer sonnait plus fort que le résultat : le résultat doit être un tintement caractéristique, au-dessus du lancer. |
| Les fichiers (0.36.3) | Un par son, choisis par l'utilisateur ; aucun pour Ronge. |
| La pièce (0.36.4) | On ne savait pas si le pari était gagné : un « ding » clair après le résultat, sur pile (généré par l'agent). |
| Les dés (0.36.4) | Remettre ceux de la 0.36.0, avec leurs variantes tirées au hasard : exception à la règle 2, comme le critique en est une à la règle 3. |
| Coup et Grondement (0.36.4) | Remplacés par `hit.wav` et `crit.wav`, déposés par l'utilisateur. |
| Le volume (0.36.4) | « On n'entend rien » : plus de gain partout. |

## 9. Index : qui joue quel son

Les deux sens de lecture : ce qui fait jouer chaque son (§ 9.1), et le son de chaque élément du jeu (§ 9.2 à 9.4). Ces tables découlent des règles du § 4 ; un test vérifie celle des compétences (`modules.test.ts`).

### 9.1 Par son

| Son | Ce qui le fait jouer |
| --- | --- |
| Dé lancé | tout jet : attaque, initiative, rafale (Furie des vents, Coup de chance), un seul pour tous les dés |
| Dé posé | la fin de tout jet, quelle que soit la face |
| Pièce lancée | Pile ou face, quand la pièce part |
| Pièce retombe | Pile ou face, quand la pièce retombe, sur pile comme sur face |
| Pile réussie | Pile ou face, juste après la pièce, quand elle tombe sur pile |
| Coup | un coup d'attaque qui touche (y compris Charge et Coup de griffe) ; Épines et Riposte (renvois) ; chaque jauge de la Rétribution sauf la dernière |
| Coup critique | un coup critique (dont ceux d'Œil de faucon) ; le coup de Pile ; le dernier coup de la Rétribution, ou un coup de compétence unique de 10 dégâts et plus |
| Esquive | un coup esquivé (dont ceux d'Esquive améliorée) |
| Aura gagnée | les 8 compétences d'aura (§ 9.2) |
| Aura perdue | une purification qui retire une aura |
| Bonus gagné | les 10 compétences qui posent un bonus sur leur lanceur (§ 9.2) |
| Malus reçu | Souffle de la tombe, Peur, Luciole, Attente ; l'Aura de décoction qui empoisonne et l'Aura de pourriture qui pourrit, quand un coup touche |
| Dissipation | une purification qui retire un bonus ou un malus autre qu'une aura |
| Tour perdu | le tour sauté d'un combattant apeuré (Peur) ou étourdi |
| Ronge | Poison, Pourriture et Brûlure qui agissent sur leur porteur ; l'Aura de poison qui frappe l'adversaire |
| Soin | Rage du sang, Fleur de vie ; le vol de vie (Vol de vie) ; l'Aura de sainteté et la Régénération qui soignent |
| Transformation | le druide qui change de forme, dans les deux sens |
| KO | la fin du combat, par K.O. ou à la limite de tours |
| Victoire | juste après le KO |
| Clic | les boutons de l'interface |
| Choc du face-à-face | l'écran de présentation du duel |

### 9.2 Par personnage

Les deux personnages d'une même race partagent leurs compétences.

| Race (personnages) | Sur un 1 | Sur un 2 | Sur un 3 |
| --- | --- | --- | --- |
| Orc (Gorak, Murzug) | Rage du sang : Soin | Furie des vents : Bonus gagné | Aura de puissance : Aura gagnée |
| Elfe (Elaria, Sylwen) | Œil de faucon : Bonus gagné | Esquive améliorée : Bonus gagné | Aura de précision : Aura gagnée |
| Nain (Brokk, Grimbald) | Peau de pierre : Bonus gagné | Épines : Bonus gagné | Aura d'intimidation : Aura gagnée |
| Mort-vivant (Ervald, Caldrec) | Souffle de la tombe : Malus reçu | Vol de vie : Bonus gagné | Aura de poison : Aura gagnée |
| Humain (Ysolde, Bérengère) | Peur : Malus reçu | Purification : Aura perdue ou Dissipation | Aura de sainteté : Aura gagnée |
| Homme-lézard (Naraxes, Ssythra) | Coup de chance : Bonus gagné | Pile ou face : Bonus gagné | Aura de décoction : Aura gagnée |
| Paladin (Aldric, Gauvain) | Rétribution : Coup par jauge, Coup critique sur la dernière | Riposte : Bonus gagné | Aura d'immunité : Aura gagnée |
| Ogre (Morgrut, Gnashka) | Attente : Malus reçu | Attente : Malus reçu | Attente : Malus reçu |
| Druide, forme humaine (Thaldrin, Brannoc) | Fleur de vie : Soin | Écorce épaisse : Bonus gagné | Luciole : Malus reçu |
| Druide, forme d'ours | Charge : Coup | Coup de griffe : Coup | Aura de pourriture : Aura gagnée |

Une compétence sans effet réel ne sonne pas (règle 8) : un soin à PV pleins, un malus bloqué par une immunité.

### 9.3 Par statut, quand il agit

Le son de la pose d'un statut est celui de la compétence qui le pose (§ 9.2). Ce tableau donne le son du statut lui-même, quand il agit ensuite ; un statut absent du tableau agit sans son propre (il modifie un coup, qui garde le sien).

| Statut | Quand il agit | Son |
| --- | --- | --- |
| Poison, Pourriture | début du tour du porteur | Ronge |
| Brûlure | fin du tour du porteur | Ronge |
| Aura de poison | début du tour du porteur, dégâts à l'adversaire | Ronge |
| Régénération | début du tour du porteur | Soin |
| Aura de sainteté | fin du tour du porteur | Soin |
| Épines | le porteur est touché | Coup (sur l'attaquant) |
| Riposte | le porteur est touché | Coup (contre-coup) |
| Vol de vie | le coup du porteur touche | Soin |
| Aura de décoction, Aura de pourriture | le coup du porteur touche | Malus reçu (poison ou pourriture posés) |
| Peur, Étourdi | tour du porteur | Tour perdu |
| Furie des vents, Coup de chance | action du porteur | Dé lancé, Dé posé, puis le son de chaque coup |
| Pile ou face | action du porteur | Pièce lancée, Pièce retombe ; sur pile, Pile réussie puis Coup critique |
| Rétribution | relâchée par sa compétence | Coup par jauge, Coup critique sur la dernière |
| Critique assuré, Esquive améliorée | le prochain coup | Coup critique, Esquive |
| Expiration ou baisse de durée d'un statut | | aucun son (règle 7) |

### 9.4 Par écran

| Écran | Sons |
| --- | --- |
| Tous les écrans | Clic sur les boutons |
| Présentation du duel | Choc du face-à-face |
| Combat | tous les sons ci-dessus, puis KO et Victoire |

