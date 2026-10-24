# Les règles du son

Ce document fait foi pour tout ce qu'on entend dans le jeu : quels sons existent, ce que chacun veut dire, quand il joue, et comment une nouvelle compétence ou un nouveau statut reçoit le sien. Le code suit ce document (`sound.ts`, `staging.ts`, qui date chaque son du combat ; `useCombat.ts` ne fait que les jouer) ; s'ils divergent, c'est le code qu'on corrige.

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
   **Exception, les cas particuliers déclarés : les sons composés.** Un moment exceptionnel peut, et doit, jouer plusieurs sons ensemble pour appuyer sa dimension sonore. Aujourd'hui, deux : le **Coup critique**, qui joue le Coup et le Grondement ensemble ; le **label de la zone de surcharge** (2026-10-21, § 4.4), dont le son s'ajoute à celui de l'instant où il tombe. Tout autre son composé s'ajoute ici, avec sa raison.
4. **Le son vient de la nature de l'effet, pas de la compétence.** Une compétence ne choisit pas son son : il se déduit de ce qu'elle produit, d'après les registres (aura, bonus, malus, soin, dégâts…). Une nouvelle aura sonne donc automatiquement comme toutes les auras. Aucun son propre à une compétence ou à un personnage sans une décision écrite ici (§ 6).
5. **Le timbre ressemble à la chose.** Le poison est liquide et discret (bulles, grésillement, vapeur), pas un choc. Un soin est doux et clair. Un coup est un choc. Chaque son a sa description au § 3, qui sert aussi de consigne de recherche.
6. **L'intensité suit l'importance.** Quatre niveaux (§ 3) : ce qui décide du combat (coup critique, KO) passe au-dessus de ce qui revient à chaque tour (dés, poison qui ronge). Les effets périodiques et l'interface restent discrets.
7. **Le silence est permis.** Ce qui se voit déjà et revient souvent sans rien changer (un compteur qui baisse, un bonus qui expire) ne sonne pas.
8. **Un son tient dans sa fenêtre.** Il se termine avant l'instant suivant à ×1 (durées du § 3). À ×2 et ×4, il est écourté au prorata, avec un fondu ; seuls le clic, le choc du face-à-face, le KO et la victoire jouent en entier.

## 3. Le vocabulaire : 23 sons

Intensité : **1** fort, **2** appuyé, **3** moyen, **4** discret.

| Famille | Son | Ce qu'il veut dire | Timbre recherché | Intensité | Durée |
| --- | --- | --- | --- | --- | --- |
| **Hasard** | Dé lancé | un dé roule (attaque, initiative, rafale) | dé qui roule sur du bois | 3 | 1 à 2 s, coupé quand le dé se pose |
| | Dé posé | le dé s'arrête, le résultat est là | petit choc net de dé qui s'immobilise | 3 | 0,2 à 0,3 s |
| | Pièce lancée | Pile ou face : la pièce tournoie en l'air | pièce qui tournoie, léger et en retrait : le résultat doit se détacher | 4 | 1 à 1,5 s, coupé quand elle retombe |
| | Pièce retombe | le résultat de la pièce est là, pile comme face | pièce qui claque net sur une table, plus fort que le lancer | 2 | 0,2 à 0,6 s |
| | Pile réussie (Ding) | une bonne nouvelle : la pièce est tombée sur pile, ou un label + (qui amplifie l'action de l'attaquant) tombe sous le dé (2026-10-21, § 4.4) | « ding » clair et net : juste après la pièce qui retombe, ou avec le label | 2 | 0,5 à 0,8 s |
| **Coups** | Coup | des dégâts portés par un coup, quelle qu'en soit la source | frappe d'épée, bruit métallique net | 2 | 0,3 à 0,4 s |
| | Coup critique (composé) | un coup critique, le coup de Pile, le dernier coup d'une relâche en entier, ou un coup de compétence unique de 10 dégâts ou plus (la Rétribution, qui relâche la moitié de ses jauges en un coup) | **Coup + Grondement**, joués ensemble | 1 | celle du Grondement |
| | *Grondement* | couche du Coup critique, jamais jouée seule | gros choc grave qui résonne | 1 | 0,6 à 0,9 s |
| | Esquive | un coup qui manque sa cible | arme qui fend l'air dans le vide | 3 | 0,2 à 0,3 s |
| **États** | Aura gagnée | un personnage pose son aura | souffle magique qui enfle, accord lumineux | 2 | 0,8 à 1,2 s |
| | Aura perdue | une aura est retirée | le même souffle qui retombe et s'éteint | 3 | 0,6 à 1 s |
| | Bonus gagné | un bonus posé sur soi (hors aura) | synthé magique en majeur, ascendant, lumineux | 3 | 0,4 à 0,7 s |
| | Malus reçu | un malus posé sur un combattant, ou un label − (qui réduit ou contre l'action de l'attaquant) qui tombe sous le dé (2026-10-21, § 4.4) | synthé magique en mineur, sombre | 3 | 0,4 à 0,7 s |
| | Dissipation | un bonus ou un malus retiré par une compétence | synthé magique qui descend dans les notes | 3 | 0,3 à 0,6 s |
| | Tour perdu | le combattant ne peut pas agir (peur, étourdissement) | raclement ou craquement sourd, lugubre | 3 | 0,6 à 0,9 s |
| | Ronge | un statut fait perdre des PV à son porteur (pourriture, brûlure, saignement quand un coup le touche) ; le poison a le sien, Grésillement | à trouver : liquide qui bouillonne et vapeur toxique (0.36.1), ou gémissement d'âme lugubre (piste de la livraison 0.36.3) ; discret, aucun choc | 4 | 0,3 à 0,5 s |
| | Grésillement | le poison agit sur son porteur (0.90.0, décision de l'utilisateur, § 8). Pensé pour servir plus tard à d'autres maux laissés par un coup (magie…), sur décision écrite | « pchhhit » : bouffée de vapeur toxique, attaque sèche puis chute ; pas un son d'impact principal | 4 | 0,5 à 0,6 s |
| | Soin | des PV regagnés, quelle qu'en soit la source | synthé léger, notes ascendantes, bénéfique ; le fichier retenu est un tintement très bref | 3 | 0,05 à 0,7 s |
| **Formes** | Transformation | le druide change de forme, dans un sens comme dans l'autre | aura magique qui éclate, scintillante | 2 | 0,8 à 1,2 s |
| **Fin** | KO | le perdant s'effondre | corps et armure qui tombent lourdement | 1 | 0,3 à 1,5 s |
| | Victoire | le combat est gagné | fanfare glorieuse, cuivres et éclat ; **surtout pas rétro** (ni chiptune, ni 8 bits) | 2 | 1,5 à 5 s |
| **Interface** | Clic | un bouton | clic sec, bois ou métal léger | 4 | 0,05 à 0,1 s |
| | Choc du face-à-face | la présentation du duel | choc glorieux, épique | 1 | 0,6 à 4 s |

Le Grondement n'est pas un son à part entière : c'est une couche. Le vocabulaire compte donc 22 significations. Le Coup critique n'a pas de fichier, le Grondement en a un ; les dés en ont plusieurs (règle 2).

**Retirés par rapport à la 0.36.0** (33 sons) : dé au maximum (décision de l'utilisateur), élan (décision : l'impact suffit à faire sonner un coup), les trois paliers d'impact (fondus dans Coup), annonce du critique, carillon d'événement, peur (devient Malus reçu quand elle est posée, puis Tour perdu), purification (Dissipation), épines et parade (Coup), vol de vie (Soin), attente de l'ogre (Malus reçu), Furie des vents (Bonus gagné), pile et face (Pièce retombe, la même sur les deux faces, puis Coup critique sur pile), druide vers ours et ours vers druide (Transformation), rugissement et griffes (Coup).

## 4. Quel son pour quel moment

### 4.1 Les étapes du combat

| Étape (`beat`) | Ce qu'on entend |
| --- | --- |
| Initiative | Dé lancé, puis Dé posé (une fois, même avec deux dés) |
| `attack` | Dé lancé, Dé posé, puis Coup, Coup critique ou Esquive. L'élan vers l'adversaire est muet : seul l'impact sonne. Un jet de compétence (1, 2 ou 3) s'arrête au Dé posé : le son de la compétence suit. Un coup transformé (Charge, Coup de griffe) sonne comme un coup. |
| `flurry` (Furie des vents, Coup de chance, les deux dés de la barde) | Un seul Dé lancé pour tous les dés, un seul Dé posé ; puis le son de chaque coup, qui se suivent sans se chevaucher. Les deux dés de la barde (phase 5 ter) : aucun son de plus, même sur deux faces égales ; chaque jet sonne comme un jet (le son de sa compétence, puis son coup) |
| `event` (compétence) | Le son déduit de ses effets (§ 4.2) |
| `statusTick` | Ronge si le statut inflige des dégâts, ou le son propre que son registre déclare (`tickSound` : Grésillement pour le Poison, 0.90.0) ; Soin s'il soigne |
| `statusReaction` | Coup si le statut renvoie des dégâts (Riposte), même pour un gros renvoi ; Soin s'il soigne (Vol de vie) ; Ronge s'il fait perdre des PV à son propre porteur (Saignement, 0.68.0 ; depuis la 0.68.1, joué un battement après l'impact du coup qui fait couler la plaie, sur la même frappe) ; sinon le son déduit de ses effets (§ 4.2), par exemple Malus reçu quand l'Aura de décoction empoisonne ou quand les Épines acérées font saigner. Un statut posé par le coup qui vient de toucher (l'Aura de décoction, 2026-10-21) tombe avec l'impact de ce coup : son Malus reçu suit le Coup d'un battement (0,12 s), sur la même frappe, comme le Ronge du Saignement |
| `skip` | Tour perdu |
| `shift` | Transformation |
| `coin` | Pièce lancée, Pièce retombe ; sur pile, Pile réussie **en même temps** (0.55.0, demande de l'utilisateur : le résultat, son son, son badge et son texte tombent d'un bloc ; avant, 0,14 s après), puis, après un temps de lecture, Coup critique au coup ; sur face, rien de plus. La pièce seule ne disait pas assez si le pari était gagné (retour de l'utilisateur, 0.36.4). |
| `relic` | Le son du signe de son label (§ 4.4) avec son sceau ; le son déduit de ses effets (§ 4.2) quand ils tombent : au même instant, sauf si elle pose un statut, qui part de son sceau en signal (0.111.0, `MISE_EN_SCENE.md` M19 et M23) : le label sonne au départ, l'effet à l'arrivée. Une relique du dé (Osselet fendu, Dé creux) sonne avec le Dé posé, avant le coup (M40). Vers l'adversaire, ses coups de scène sonnent le son que leur scène déclare (Coup pour la Conque des vents, Coup critique pour la Braise captive). Rien si aucun effet n'a de résultat (`MISE_EN_SCENE.md` M25) |
| ~~`pair`~~ | Retirée en phase 5 ter avec les doubles de la barde, et avec elle le « ding » de tout double (Pile réussie en même temps que les dés, 0.46.0) : ses deux dés sont une rafale (`flurry`). |
| `statusAge` | Rien : le compteur qui baisse et l'icône qui part se voient (règle 7) |
| Fin du combat | KO, puis Victoire |

Un coup de compétence qui relâche des jauges en entier joue un Coup par jauge, l'un après l'autre ; le dernier, mis en scène comme un coup lourd, joue le Coup critique (décision de l'utilisateur). Depuis la 0.107.0, la Rétribution ne relâche que la moitié de ses jauges : un seul coup, Coup, ou Coup critique à 10 dégâts ou plus (un coup de compétence unique de 10 dégâts ou plus est un coup lourd).

### 4.2 Le son d'une compétence

Une compétence joue **un seul son**, le premier de cette liste qui correspond à ce qu'elle a réellement produit :

1. une aura posée → **Aura gagnée** ;
2. une aura retirée (purification) → **Aura perdue** ;
3. un malus posé, sur l'adversaire ou sur soi → **Malus reçu** ;
4. un bonus posé sur soi → **Bonus gagné** ;
5. un bonus ou un malus retiré → **Dissipation** ;
6. des PV regagnés → **Soin** ;
7. des dégâts → **Coup** (un par coup joué) ;
8. rien de tout cela → aucun son : le texte flottant suffit. C'est le cas d'un effet sans résultat (refusé par une immunité, neutralisé par son opposé, statut déjà à son plafond, purge à vide) et d'un **mécanisme de compétence posé** (Pile ou face, Furie des vents : son sceau le montre, et ce qu'il déclenche a ses sons, 0.110.0 ; avant, Bonus gagné). Une aura cumulable reposée à son maximum (Aura de sainteté à 2) ne joue donc plus Aura gagnée (2026-10-21) : rien n'est arrivé, seul le texte neutre « … au maximum » s'affiche. Une **aura non cumulable reposée telle quelle** (Aura de puissance, Aura d'immunité) non plus (0.110.0) : le moteur la compte posée, mais rien n'a changé (`MISE_EN_SCENE.md` M25).

Les sons se déduisent des registres : aura (`isAura`), polarité (`polarity`), type d'effet (`heal`, `damage`, `cleanse`, `applyStatus`). Aucun nom de compétence ni de statut n'apparaît dans la règle.

**Les reliques** (0.75.0, [RELIQUES.md](RELIQUES.md)) suivent la même règle : une relique qui se déclenche joue le son de ce qu'elle produit (le Chapelet, Dissipation ou Soin ; la Dent de loup et la Clepsydre, Bonus gagné), sans son propre. Un coup renforcé par une relique (Fer à quatre clous) sonne comme un coup ; les dégâts directs de l'Osselet, comme une réaction (Coup). Depuis le 2026-10-21, une relique qui agit pose aussi son label sous le dé : le son de son signe (§ 4.4 : le ding pour un bonus de son porteur, chez l'attaquant comme chez le défenseur ; Malus reçu pour une relique du défenseur qui contre le coup, la Conque des vents) s'ajoute au son de son effet. C'est la réponse retenue à la piste « on entend relique » (RELIQUES.md § 3) : le label dit « surcharge », le son de l'effet dit laquelle. Une relique dont le label se tait (M25 : rien n'a changé) ne sonne pas.

### 4.3 Vérification : les 30 compétences du roster

| Son | Compétences |
| --- | --- |
| Aura gagnée | Aura de puissance, Aura de précision, Aura d'intimidation, Aura glaciale, Aura de sainteté, Aura de décoction, Aura d'immunité (elle purge aussi, mais l'aura passe en premier), Aura sauvage (0.73.0), Aura mélodieuse et Ouverture (la barde) |
| Bonus gagné | Œil de faucon, Esquive améliorée, Peau de pierre, Épines acérées, Vol de vie, Coup de chance, Riposte, Siffloter |
| Aucun son propre (mécanisme posé, § 4.2 règle 8) | Furie des vents (sa rafale sonne), Pile ou face (sa pièce sonne) : Bonus gagné jusqu'à la 0.109.1 ; Soliste et Crescendo (coup de base ×N, sans effet : leur coup sonne) |
| Malus reçu | Souffle de la tombe, Peur, Feux follets (0.73.0, Brûlure posée), Fausse note, Pourfendre (0.70.0 : son coup sonne d'abord comme un coup, puis la plaie posée joue Malus reçu ; avant, la Saignée, et la Rage du sang, qui jouait Soin) |
| Dissipation ou Aura perdue | Purification (Aura perdue si le bonus retiré est une aura ; sans bonus à retirer, ses dégâts directs sonnent comme un coup reçu) |
| Coup | Rétribution (la moitié de ses jauges en un coup ; Coup critique à 10 dégâts ou plus) |
| Coup critique | Foudre (0.76.0 : un par éclair, à l'impact de chacun, trois coups de 1 dégât ; l'Éclair synthétisé de la 0.110.0 retiré le 2026-10-24 : l'utilisateur garde ce son) |

### 4.4 Les labels de la zone de surcharge (2026-10-21)

Un label (badge sous le dé : « Critique ×2 », « Armure temporaire −6 », « Saignement +2 », le nom d'une relique) marque ce qui change le coup en cours (la zone de surcharge, [RESOLUTION.md](RESOLUTION.md) § 11). Demande de l'utilisateur : « chaque label positif doit faire un ding positif au moment de son affichage ; les labels négatifs un son négatif. On devient capable de juger la valeur d'une action à l'oreille aussi. »

1. **Le son suit le signe du label**, toujours du point de vue de l'attaquant (décision de l'utilisateur, 2026-10-21) : + si la surcharge amplifie son action (critique, relique, Vol de vie, Saignement qui coule sur le défenseur), − si elle la réduit ou la contre (Esquive assurée, bouclier qui absorbe, Fausse note, Riposte et Épines du défenseur). Le signe est déduit de la mécanique dans son registre (`SPECIAL_SIGNS`, `specials.ts`), jamais choisi au point d'appel ; la couleur (la source) ne compte pas pour le son. **Exception, la relique du défenseur** (décision de l'utilisateur, 2026-10-24, 0.110.0) : elle ne pose jamais de malus, et un bonus gardé pour plus tard est un bonus pour son porteur. Son label est donc + (le ding), sauf si elle contre le coup en cours (la Conque des vents, qui frappe l'attaquant : −). Avant, toute relique du défenseur était −, et le même instant jouait Malus reçu avec le Bonus gagné ou le Soin de son effet.
2. **Label + → Pile réussie** (le « ding » de la chance, choisi par l'utilisateur : « le ding de la pièce ? ») ; **label − → Malus reçu**. Pas de son nouveau : on pioche dans ce qui existe.
3. **Son composé déclaré** (règle 3) : le son du label s'ajoute à celui de l'instant où il tombe (Dé posé, Soin, Coup…). Un critique s'annonce donc par le ding de son label, puis frappe avec son Coup critique à l'impact ; « Saignement +2 » sonne son ding à l'impact, puis la plaie son Ronge un battement après.
4. **Jamais deux fois le même son au même instant** : plusieurs labels qui tombent ensemble (Critique assuré et Critique ; Armure temporaire et Fausse note) jouent un seul son par signe.
5. **Pas de doublon de signification** : un label dont l'effet joue déjà le son de son signe dans la même frappe se tait (déduit : le son des effets, `cueOf`, est celui du signe). Aujourd'hui, les Épines acérées (−) et le Malus reçu du Saignement qu'elles posent.
6. **Pas de label pour une réaction refusée** (0.110.0) : une réaction dont aucun effet n'a de résultat (les Épines acérées contre une Aura d'immunité : « Saignement résisté ») n'a ni label ni son ; seul son texte neutre s'affiche (règle 8 du § 4.2, `MISE_EN_SCENE.md` M25).

Hors de la colonne, donc sans son de label : Pile ou face, la Furie des vents, Coup de chance, Rétribution, Crescendo et Soliste (ce coup ×N : leur coup sonne, la compétence est muette), les auras. La pièce sur pile garde son propre ding (§ 4.1).

Le code : `addSpecial` (`staging.ts`) pose le label et émet le son de son signe ; `sound` n'émet qu'un son par nom et par instant, ce qui règle à la fois la règle 4 (deux labels du même signe) et la règle 5 (un effet qui joue déjà ce son dans la même frappe).

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
- **Générer un bruitage** (0.91.0) : `npm run sfx -- --out logs/sons/<son> --text "<description en anglais>" --duration <s> --count 3` écrit des propositions avec ElevenLabs (modèle de bruitages, clé dans `.env.local`, lue par Node seul et jamais par le navigateur). On les écoute, puis le fichier retenu passe par `process-sounds.py`.

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
| Grésillement | `fizz`, `sfx.fizz` | `fizz.mp3` | **généré par l'agent avec Artlist** (0.90.0) : son d'une vidéo Veo 3.1 Lite (une bouffée de fumée toxique qui gicle d'une éraflure d'armure), coupé à son attaque, décroissance linéaire ajoutée ; voir `SOURCES.md` | 0,60 s |
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
| Le double de la barde (0.46.0) | « Quand il fait un double dé, peu importe lequel, ça doit faire ding instantanément, utilise un son existant » : le « ding » de Pile réussie, joué en même temps que les dés qui se posent. **Retiré en phase 5 ter** (2026-10-24) avec les doubles (décision de l'utilisateur : les compétences de la barde passent sur les faces) : plus de double, plus de ding. |
| Les labels (2026-10-21) | « Chaque label positif doit faire un ding positif au moment de son affichage ; les labels négatifs un son négatif ; pioche dans ce qui existe (ding de la pièce ?) » : Pile réussie et Malus reçu. Puis (zone de surcharge) : le son suit le signe du label, vu de l'attaquant, et non plus son type (§ 4.4). |
| Les dés (0.36.4) | Remettre ceux de la 0.36.0, avec leurs variantes tirées au hasard : exception à la règle 2, comme le critique en est une à la règle 3. |
| Coup et Grondement (0.36.4) | Remplacés par `hit.wav` et `crit.wav`, déposés par l'utilisateur. |
| Le volume (0.36.4) | « On n'entend rien » : plus de gain partout. |
| La musique de fond (0.48.0) | Trois boucles déposées par l'utilisateur, « tapis sonore » des combats : une au hasard, quelle que soit l'arène, en boucle, « pas trop fort, bonne intégration ». Voir § 10. |
| Le poison (2026-10-22, 0.90.0) | « Un son spécial pour le poison quand il tick », qui ne partage plus Ronge : « pas un son d'impact principal, plutôt un "pchhhhit" qui évoque un mal laissé par un coup ». Il pourra servir à des effets semblables (magie…), mais pour l'instant au poison seul : Grésillement, généré avec Artlist. |
| Le lancement du combat (2026-10-22, 0.91.0) | « Un son de cri de guerre, pas trop long, 2 secondes peut-être, qui signe le clic » sur le bouton qui lance le combat animé : « Jouer » de l'écran d'affrontement, dans tous les modes (choix de l'utilisateur, plutôt que « Combattre » de la sélection, que suit le Choc du face-à-face). Généré avec ElevenLabs. L'ouverture du combat passe de 500 à 1 400 ms pour que le cri retombe avant les dés de l'initiative (règle 8). |
| Le cri de guerre retiré (2026-10-23, 0.96.0) | « Retirer le hurlement ajouté en début de combat » : le cri de guerre de la 0.91.0 est retiré ; « Jouer » refait un clic, et l'ouverture du combat revient à 500 ms. |
| Les reliques du défenseur (2026-10-24, 0.110.0) | « Un bonus gardé pour plus tard est un bonus pour son porteur » : leur label passe de − à + (le ding), avec le son qui va avec, et leur description dit le bonus du porteur. Une relique qui contre le coup (la Conque des vents) garde son −. |
| La Foudre (2026-10-24, 0.110.0, puis le même jour) | La 0.110.0 lui avait donné un son nouveau, l'Éclair, synthétisé (claquement filtré, roulement bref). L'utilisateur l'a écarté : « le son de l'éclair jusqu'ici était plutôt bien, gardons celui-là ». Chaque éclair rejoue le Coup critique (Coup + Grondement), comme depuis la 0.76.0. |

## 9. Index : qui joue quel son

Les deux sens de lecture : ce qui fait jouer chaque son (§ 9.1), et le son de chaque élément du jeu (§ 9.2 à 9.4). Ces tables découlent des règles du § 4 ; un test vérifie celle des compétences (`modules.test.ts`).

### 9.1 Par son

| Son | Ce qui le fait jouer |
| --- | --- |
| Dé lancé | tout jet : attaque, initiative, rafale (Furie des vents, Coup de chance), un seul pour tous les dés |
| Dé posé | la fin de tout jet, quelle que soit la face |
| Pièce lancée | Pile ou face, quand la pièce part |
| Pièce retombe | Pile ou face, quand la pièce retombe, sur pile comme sur face |
| Pile réussie | Pile ou face, juste après la pièce, quand elle tombe sur pile ; tout label + sous le dé : critique, bonus de relique, relique qui se déclenche pour un bonus de son porteur (chez l'attaquant comme chez le défenseur, 0.110.0), Luciole, Vol de vie, Saignement (2026-10-21, § 4.4). La barde sur un double jusqu'à la phase 5 ter |
| Coup | un coup d'attaque qui touche (y compris ceux de l'ours et le coup de Pourfendre) ; la Riposte (renvoi) ; la relâche de la Rétribution (un coup, la moitié de ses jauges, sous 10 dégâts) ; chaque jauge d'une relâche en entier sauf la dernière ; les lames d'air de la Conque des vents |
| Coup critique | un coup critique (dont ceux d'Œil de faucon) ; le coup de Pile ; le dernier coup d'une relâche en entier, ou un coup de compétence unique de 10 dégâts et plus (la Rétribution à 10 et plus) ; les météores de la Braise captive ; la Foudre, un par éclair, à l'impact de chacun (0.76.0, gardé le 2026-10-24) |
| Esquive | un coup esquivé (dont ceux d'Esquive améliorée) |
| Aura gagnée | les 10 compétences d'aura (§ 4.3, Aura mélodieuse et Ouverture comprises) |
| Aura perdue | une purification qui retire une aura |
| Bonus gagné | les 8 compétences qui posent un bonus sur leur lanceur (§ 4.3) ; plus la Furie des vents ni Pile ou face, qui posent un mécanisme (0.110.0) |
| Malus reçu | Souffle de la tombe, Peur, Feux follets (0.73.0), Fausse note, Pourfendre (après son coup, s'il touche) ; l'Aura de décoction qui empoisonne, à l'impact du coup qui touche ; les Épines acérées qui font saigner l'attaquant (0.68.0) ; l'Aura glaciale qui pose son Poison au début de chaque tour de son porteur (0.69.0) ; un label − sous le dé : Esquive assurée, bouclier qui absorbe, Fausse note, Riposte, relique du défenseur qui contre le coup (la Conque des vents) ; les Épines, dont le Malus reçu de leur effet parle déjà (2026-10-21, § 4.4) |
| Dissipation | une purification qui retire un bonus ou un malus autre qu'une aura |
| Tour perdu | le tour sauté d'un combattant apeuré (Peur) ou étourdi |
| Ronge | Pourriture et Brûlure qui agissent sur leur porteur ; le Saignement qui coule quand un coup touche son porteur (0.68.0) |
| Grésillement | le Poison qui agit sur son porteur, au début de son tour (dont le Poison posé par l'Aura glaciale ou l'Aura de décoction) (0.90.0) |
| Soin | le vol de vie (Vol de vie) ; l'Aura de sainteté et la Régénération qui soignent (la Régénération est sans porteur depuis la 0.73.0) |
| Transformation | le druide qui change de forme, dans les deux sens |
| KO | la fin du combat, par K.O. ou à la limite de tours |
| Victoire | juste après le KO |
| Clic | les boutons de l'interface |
| Choc du face-à-face | l'écran de présentation du duel |

### 9.2 Par personnage

Les deux personnages d'une même race partagent leurs compétences.

| Race (personnages) | Sur un 1 | Sur un 2 | Sur un 3 |
| --- | --- | --- | --- |
| Orc (Gorak, Murzug) | Pourfendre : Coup, puis Malus reçu s'il touche (0.70.0 ; la Saignée jouait Malus reçu, la Rage du sang Soin) | Furie des vents : aucun son propre, sa rafale sonne (Bonus gagné jusqu'à la 0.109.1) | Aura de puissance : Aura gagnée |
| Elfe (Elaria, Sylwen) | Œil de faucon : Bonus gagné | Esquive améliorée : Bonus gagné | Aura de précision : Aura gagnée |
| Nain (Brokk, Grimbald) | Peau de pierre : Bonus gagné | Épines acérées : Bonus gagné | Aura d'intimidation : Aura gagnée |
| Mort-vivant (Ervald, Caldrec) | Souffle de la tombe : Malus reçu | Vol de vie : Bonus gagné | Aura glaciale : Aura gagnée |
| Humain (Ysolde, Bérengère) | Peur : Malus reçu | Purification : Aura perdue ou Dissipation | Aura de sainteté : Aura gagnée |
| Homme-lézard (Naraxes, Ssythra) | Coup de chance : Bonus gagné | Pile ou face : aucun son propre, sa pièce sonne (Bonus gagné jusqu'à la 0.109.1) | Aura de décoction : Aura gagnée |
| Paladin (Aldric, Gauvain) | Rétribution : Coup, Coup critique à 10 dégâts et plus (la moitié de ses jauges en un coup, 0.107.0 ; Coup par jauge et Coup critique sur la dernière avant) | Riposte : Bonus gagné | Aura d'immunité : Aura gagnée |
| Ogre (Morgrut, Gnashka) | Attente : Malus reçu | Attente : Malus reçu | Attente : Malus reçu |
| Druide, forme humaine (Thaldrin, Brannoc) | Foudre : Coup critique à l'impact de chacun des trois éclairs (0.76.0 ; Éclair synthétisé en 0.110.0, retiré le 2026-10-24 ; un seul éclair en 0.73.0, Fleur de vie avant) | Feux follets : Malus reçu (0.73.0 ; Écorce épaisse avant) | Aura sauvage : Aura gagnée (0.73.0 ; Aura de sève avant) |
| Druide, forme d'ours | coup : Coup | coup : Coup | coup : Coup (0.73.0 ; Charge, Coup de griffe et Aura de rancune avant, et le relais Rancune et Sève, Bonus gagné, jusqu'à la 0.72.0) |

Une compétence sans effet réel ne sonne pas (règle 8) : un soin à PV pleins, un malus bloqué par une immunité.

### 9.3 Par statut, quand il agit

Le son de la pose d'un statut est celui de la compétence qui le pose (§ 9.2). Ce tableau donne le son du statut lui-même, quand il agit ensuite ; un statut absent du tableau agit sans son propre (il modifie un coup, qui garde le sien).

| Statut | Quand il agit | Son |
| --- | --- | --- |
| Poison | début du tour du porteur | Grésillement (0.90.0 ; Ronge avant) |
| Pourriture | début du tour du porteur | Ronge |
| Brûlure | fin du tour du porteur | Ronge |
| Aura glaciale | début du tour du porteur, Poison posé sur l'adversaire | Malus reçu (0.69.0 ; Ronge avant, quand elle infligeait des dégâts directs). Le Poison qu'elle nourrit joue Grésillement au début du tour de la victime |
| Régénération | début du tour du porteur | Soin |
| Aura de sainteté | fin du tour du porteur | Soin |
| Épines acérées | le porteur est touché | Malus reçu (Saignement posé sur l'attaquant ; Coup jusqu'à la 0.67.3, quand elles renvoyaient des dégâts) |
| Saignement | un coup touche le porteur | Ronge |
| Riposte | le porteur est touché | Coup (contre-coup) |
| Vol de vie | le coup du porteur touche | Soin, un battement après le Coup de ce coup (0.97.0 : le soin tombe à l'impact, `MISE_EN_SCENE.md` M14) |
| Aura de décoction | le coup du porteur touche | Malus reçu (poison posé), un battement après le Coup de ce coup (2026-10-21) |
| Peur, Étourdi | tour du porteur | Tour perdu |
| Furie des vents, Coup de chance | action du porteur | Dé lancé, Dé posé, puis le son de chaque coup |
| Pile ou face | action du porteur | Pièce lancée, Pièce retombe ; sur pile, Pile réussie puis Coup critique |
| Rétribution | relâchée par sa compétence | Coup, Coup critique à 10 dégâts et plus (la moitié de ses jauges en un coup, 0.107.0) |
| Critique assuré, Esquive améliorée | le prochain coup | Coup critique, Esquive |
| Expiration ou baisse de durée d'un statut | | aucun son (règle 7) |

### 9.4 Par écran

| Écran | Sons |
| --- | --- |
| Tous les écrans | Clic sur les boutons |
| Présentation du duel | Choc du face-à-face |
| Combat | tous les sons ci-dessus, puis KO et Victoire |

## 10. Musique de fond des combats (0.48.0)

Ce n'est pas un son au sens du § 2 : la musique ne signifie rien, elle installe l'ambiance. Les règles 1 à 3 et 8 ne s'y appliquent donc pas : elle se tire au hasard et dure tout le combat. Les règles 6 et 7 la gardent à sa place : sous les effets, sans jamais les couvrir.

- **Quand** : pendant chaque combat joué (écran de combat), du premier instant jusqu'à l'écran de fin. Une boucle est tirée au hasard parmi les trois, **quelle que soit l'arène**, à chaque combat. Un combat simulé n'a pas de musique : il n'a pas d'écran de combat.
- **Comment** :
  - en boucle, avec un fondu d'entrée de 2,5 s et un fondu de sortie de 1,2 s quand on quitte l'écran ;
  - au KO, elle s'efface à 25 % de son niveau en 0,3 s, pour que le KO et la fanfare de victoire ressortent ;
  - elle ne suit pas la vitesse du combat (×2, ×4) ;
  - **un seul bouton du son**, rond, en haut à droite de toutes les scènes, ouvre un petit panneau dessous avec **deux interrupteurs indépendants** (décision de l'utilisateur, 2026-10-23) : « Musique » et « Effets sonores ». Couper les effets laisse la musique, couper la musique laisse les effets ; le glyphe du bouton n'est barré que si les deux sont coupés. Le panneau se ferme par le bouton, un clic ailleurs ou Échap. Avant, couper le son coupait aussi la musique, et un second bouton (0.53.0) coupait la musique seule ;
  - chaque choix est gardé d'une partie à l'autre, sous sa clé : `battler:muted` pour les effets (nom historique), `battler:music-muted` pour la musique ;
  - **effets et musique sont coupés par défaut** (0.68.2, demande de l'utilisateur) : les deux interrupteurs commencent désactivés, pour que les tests automatiques restent muets. On les rallume à la main, et le choix est gardé. Le contexte audio se crée et se réveille au premier geste, quel que soit l'interrupteur actif : la musique seule s'entend donc aussi.
- **Niveau** : les trois boucles n'ont pas la même sonie à la source (−18,4, −9,7 et −8,7 LUFS intégrés, mesurés avec `ffmpeg -af ebur128`). Le jeu ramène chacune à **−29 LUFS** (`MUSIC_TARGET`), soit environ 15 dB sous les effets, égalisés vers −12 dB RMS. C'est le réglage « pas trop fort ». Il se règle à l'oreille dans `sound.ts`, à un seul endroit.
- **Mixage** : la musique a son propre bus, à part du compresseur des effets. Sinon, chaque coup ferait « pomper » le compresseur et la musique avec lui.
- **Fichiers** : `src/assets/music/battle-boss.mp3` (77,6 s, 155 bpm), `battle-orchestral.mp3` (40,3 s), `battle-drums.mp3` (22,3 s, 172 bpm). Ils sont gardés tels que livrés, sans réencodage, pour ne pas abîmer la jonction des boucles. Provenance : `src/assets/music/SOURCES.md`. Une nouvelle boucle se dépose dans ce dossier, avec sa sonie mesurée dans `MUSIC_LOUDNESS`. Un test vérifie qu'aucune piste n'en manque.
- **Non vérifiable par l'agent** : le niveau réel, la propreté des jonctions de boucle et l'accord avec les effets sont à juger à l'oreille.

