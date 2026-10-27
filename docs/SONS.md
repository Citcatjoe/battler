# Les règles du son

Ce document fait foi pour tout ce qu'on entend dans le jeu : quels sons existent, ce que chacun veut dire, quand il joue, et comment une nouvelle compétence ou un nouveau statut reçoit le sien. Le code suit ce document (`sound.ts`, `staging.ts`, qui date chaque son du combat ; `useCombat.ts` ne fait que les jouer) ; s'ils divergent, c'est le code qu'on corrige.

> **Statut : validé par l'utilisateur (0.36.2), appliqué dans le code.** Proposé en 0.36.1 ; l'utilisateur a tranché les questions ouvertes (§ 8) et choisi à l'oreille le fichier de chaque son (0.36.3, § 7). Qui joue quel son : § 9. **Sons de famille** (2026-10-25, décision de l'utilisateur : « génère les familles de son avec ElevenLabs ; essaie de faire des familles de son qui ne soient pas toutes les mêmes ») : la pose d'un bonus ou d'un malus sonne sa famille (règle 4) ; les 16 fichiers sont générés par l'agent et choisis sur mesures, sans écoute : à juger à l'oreille par l'utilisateur (§ 7).

## 1. Pourquoi ces règles

Bilan de la 0.36.0, jugé par l'utilisateur comme « une véritable cacophonie ». Les causes, relevées dans le code :

| Cause | Exemple en 0.36.0 |
| --- | --- |
| **Plusieurs fichiers pour un même son**, tirés au hasard | 2 victoires, 3 impacts moyens, 2 transformations dans chaque sens : le même moment ne sonne jamais pareil, et l'oreille ne prend aucun repère. |
| **Plusieurs sons empilés sur un seul instant** | Un coup critique jouait l'annonce du critique, l'élan, l'impact lourd et l'impact critique : quatre sons pour un coup. La Furie des vents jouait sa bourrasque et deux roulements de dé en même temps. |
| **Trop de sons**, hérités des sons synthétisés | 33 sons (élan, annonce du critique, rugissement, griffes, épines, parade, carillon…), là où l'observateur ne distingue qu'une poignée de significations. |
| **Des sons sans rapport avec leur action** | Le soin de l'orc (Rage du sang) sonnait comme un objet qui tombe ; le poison tapait fort au lieu de grésiller. Les fichiers ont été rangés par catégorie sans être écoutés. |

## 2. Les règles

1. **Un son = une signification.** Chaque son dit une seule chose à l'observateur (« une aura arrive », « un coup porte »). Deux moments qui veulent dire la même chose ont le même son, quel que soit le personnage. Pour la pose d'un statut, la signification est **sa famille et sa polarité** (« sa défense se fend », « il va critiquer ») depuis le 2026-10-25 : deux statuts de la même famille et du même côté sonnent pareil, deux familles ne partagent jamais un son.
2. **Un son = un fichier.** Pas de variante tirée au hasard : un repère sonore doit être identique à chaque fois.
   **Exception déclarée, les dés** (décision de l'utilisateur, 0.36.4) : Dé lancé a 2 fichiers et Dé posé en a 3, tirés au hasard à chaque jet, comme en 0.36.0, qui sonnait « vraiment mieux » pour l'utilisateur. Un vrai dé ne sonne jamais deux fois pareil, et le dé ne porte pas de signification à reconnaître : c'est le résultat qui compte. Toute autre exception s'ajoute ici, avec sa raison (`VARIED_SOUNDS`, `sound.ts`).
3. **Un instant = un son signature.** Chaque résolution (un coup, des dégâts, un état posé) se satisfait d'un seul son. Quand un instant pourrait en appeler plusieurs, la priorité du § 4 en choisit un. Une séquence (le dé roule, puis se pose) n'est pas un empilement : ses sons se suivent.
   **Exception, les cas particuliers déclarés : les sons composés.** Un moment exceptionnel peut, et doit, jouer plusieurs sons ensemble pour appuyer sa dimension sonore. Aujourd'hui, deux : le **Coup critique**, qui joue le Coup et le Grondement ensemble ; le **label de la zone de surcharge** (2026-10-21, § 4.4), dont le son s'ajoute à celui de l'instant où il tombe. Tout autre son composé s'ajoute ici, avec sa raison.
4. **Le son vient de la nature de l'effet, pas de la compétence.** Une compétence ne choisit pas son son : il se déduit de ce qu'elle produit, d'après les registres (aura, bonus, malus, famille, soin, dégâts…). Une nouvelle aura sonne donc automatiquement comme toutes les auras. Aucun son propre à une compétence ou à un personnage sans une décision écrite ici (§ 6).
   **Étendue le 2026-10-25 (décision de l'utilisateur) : les familles.** La nature d'un bonus ou d'un malus, c'est sa **famille** ([FAMILLES.md](FAMILLES.md) § 2 : Puissance, Garde, Précision, Esquive, Tempo, Fortune, Affliction, Soin, Représailles, Sceaux), déclarée dans son registre (`StatusDef.family`), avec sa **polarité**. Un bonus ou un malus posé (hors aura) joue le son de sa famille, de son côté : une famille, un matériau (règle 5), le bonus qui monte et tient, le malus qui casse, se détend ou s'éteint. Un côté sans son à lui garde le son générique de sa polarité (Bonus gagné, Malus reçu). Restent génériques : l'aura (une durée, pas une famille : FAMILLES § 2.1, règle 2), le soin, ce qu'un statut fait quand il agit (Ronge, Grésillement, Tour perdu) et les labels du dé (§ 4.4).
5. **Le timbre ressemble à la chose.** Le poison est liquide et discret (bulles, grésillement, vapeur), pas un choc. Un soin est doux et clair. Un coup est un choc. Chaque son a sa description au § 3, qui sert aussi de consigne de recherche.
6. **L'intensité suit l'importance.** Quatre niveaux (§ 3) : ce qui décide du combat (coup critique, KO) passe au-dessus de ce qui revient à chaque tour (dés, poison qui ronge). Les effets périodiques et l'interface restent discrets.
7. **Le silence est permis.** Ce qui se voit déjà et revient souvent sans rien changer (un compteur qui baisse, un bonus qui expire) ne sonne pas.
8. **Un son tient dans sa fenêtre.** Il se termine avant l'instant suivant à ×1 (durées du § 3). À ×2 et ×4, il est écourté au prorata, avec un fondu ; seuls le clic, le choc du face-à-face, le KO et la victoire jouent en entier.

## 3. Le vocabulaire : 39 sons

Intensité : **1** fort, **2** appuyé, **3** moyen, **4** discret. Les 16 sons de famille (2026-10-25) ont leur tableau à part, sous celui-ci.

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
| | Bonus gagné | un bonus posé sur soi (hors aura) d'une famille sans son de bonus à elle : Tempo (ses bonus sont des mécanismes, muets, ou posés avec une aura), Affliction (auras et mécanismes seulement), Sceaux (la Garde sacrée, inutilisée). Pour toute pose jusqu'au 2026-10-25 | synthé magique en majeur, ascendant, lumineux | 3 | 0,4 à 0,7 s |
| | Malus reçu | un label − (qui réduit ou contre l'action de l'attaquant) qui tombe sous le dé (2026-10-21, § 4.4) ; un malus d'une famille sans son de malus à elle (Représailles, aucun aujourd'hui). Pour toute pose de malus jusqu'au 2026-10-25 | synthé magique en mineur, sombre | 3 | 0,4 à 0,7 s |
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

Le Grondement n'est pas un son à part entière : c'est une couche. Le vocabulaire compte donc 38 significations. Le Coup critique n'a pas de fichier, le Grondement en a un ; les dés en ont plusieurs (règle 2).

**Les sons de famille** (2026-10-25) : la pose d'un bonus sur soi ou d'un malus, hors aura (règle 4). Chaque famille a son matériau, qui ne ressemble à aucun son existant : ni le Coup (épée), ni l'Esquive (lame dans l'air), ni le dé (bois), ni la pièce seule, ni le Grésillement (vapeur), ni les synthés génériques. Tous au niveau 3, comme le Bonus gagné et le Malus reçu qu'ils relaient.

| Famille | Côté | Son (code) | Ce qu'il veut dire | Timbre recherché | Intensité | Durée |
| --- | --- | --- | --- | --- | --- | --- |
| **Puissance** | + | `power-up`, `sfx.powerUp` | ses coups vont faire plus mal (Ferveur) | un coup de grand tambour de guerre, grave, qui enfle | 3 | 0,5 à 0,8 s |
| | − | `power-down`, `sfx.powerDown` | ses coups vont faire moins mal (Fausse note, Affaibli) | le même tambour, peau détendue, qui s'affaisse | 3 | 0,4 à 0,7 s |
| **Garde** | + | `guard-up`, `sfx.guardUp` | il encaissera moins (Armure temporaire) | dalles de pierre qui se referment et s'assoient | 3 | 0,4 à 0,7 s |
| | − | `guard-down`, `sfx.guardDown` | sa défense se fend (Brise-garde, lot 3 ; Brèche, Vulnérable) | pierre qui se fend, gravillons qui s'émiettent | 3 | 0,4 à 0,7 s |
| **Précision** | + | `precision-up`, `sfx.precisionUp` | il va critiquer (Critique assuré, Rancune) | corde d'arc qui se tend, petit éclat de verre au bout | 3 | 0,5 à 0,8 s |
| | − | `precision-down`, `sfx.precisionDown` | il ne voit plus juste (Aveuglé, lot 3) | poignée de sable jetée, souffle granuleux étouffé | 3 | 0,4 à 0,7 s |
| **Esquive** | + | `evasion-up`, `sfx.evasionUp` | il va éviter le coup (Esquive améliorée) | battement d'ailes vif, plumes | 3 | 0,4 à 0,6 s |
| | − | `evasion-down`, `sfx.evasionDown` | il ne peut plus esquiver (Luciole) | collet de corde qui se serre | 3 | 0,4 à 0,6 s |
| **Tempo** | − | `tempo-down`, `sfx.tempoDown` | il va perdre une action (Peur, Étourdi) ; le tour perdu lui-même garde Tour perdu | vieille horloge, tocs lourds qui ralentissent | 3 | 0,4 à 0,8 s |
| **Fortune** | + | `fortune-up`, `sfx.fortuneUp` | le dé va lui sourire (Coup de chance) | pièces secouées dans une bourse de cuir | 3 | 0,4 à 0,7 s |
| | − | `fortune-down`, `sfx.fortuneDown` | le dé va le trahir (Malchance, lot 3) | cloche de bronze fêlée, un coup sourd et faux | 3 | 0,5 à 0,8 s |
| **Affliction** | − | `affliction-down`, `sfx.afflictionDown` | un mal qui dure est posé (Poison, Saignement, Brûlure, Pourriture) ; quand il agit : Grésillement ou Ronge | goutte de venin épais qui s'écrase, visqueuse | 3 | 0,3 à 0,6 s |
| **Soin** | + | `healing-up`, `sfx.healingUp` | il va se soigner (Vol de vie, Sifflotement, Régénération) ; les PV regagnés gardent Soin | glissando de harpe doux qui monte | 3 | 0,5 à 0,8 s |
| | − | `healing-down`, `sfx.healingDown` | ses soins vont faiblir (Hémorragie, lot 3) | deux battements de cœur étouffés, le second qui flanche | 3 | 0,5 à 0,8 s |
| **Représailles** | + | `retaliation-up`, `sfx.retaliationUp` | le frapper va se payer (Riposte) | lame tirée du fourreau, glissement métallique | 3 | 0,4 à 0,7 s |
| **Sceaux** | − | `seal-down`, `sfx.sealDown` | ses protections ne tiennent plus : son bonus lui est confisqué (Sceau de vol, lot 3) | chaîne de fer qui casse, sceau de cire qui craque | 3 | 0,5 à 0,8 s |

Sans son propre : Tempo +, Affliction +, Sceaux + (Bonus gagné), Représailles − (Malus reçu). Le tableau qui le dit au code : `FAMILY_CUES` (`cues.ts`).

**Retirés par rapport à la 0.36.0** (33 sons) : dé au maximum (décision de l'utilisateur), élan (décision : l'impact suffit à faire sonner un coup), les trois paliers d'impact (fondus dans Coup), annonce du critique, carillon d'événement, peur (devient Malus reçu quand elle est posée, puis Tour perdu), purification (Dissipation), épines et parade (Coup), vol de vie (Soin), attente de l'ogre (Malus reçu), Furie des vents (Bonus gagné), pile et face (Pièce retombe, la même sur les deux faces, puis Coup critique sur pile), druide vers ours et ours vers druide (Transformation), rugissement et griffes (Coup).

## 4. Quel son pour quel moment

### 4.1 Les étapes du combat

| Étape (`beat`) | Ce qu'on entend |
| --- | --- |
| Initiative | Dé lancé, puis Dé posé (une fois, même avec deux dés) |
| `attack` | Dé lancé, Dé posé, puis Coup, Coup critique ou Esquive. L'élan vers l'adversaire est muet : seul l'impact sonne. Un jet de compétence (1, 2 ou 3) s'arrête au Dé posé : le son de la compétence suit. Un coup transformé (Charge, Coup de griffe) sonne comme un coup. |
| `flurry` (Furie des vents, Coup de chance, Duo) | Un seul Dé lancé pour tous les dés, un seul Dé posé ; puis le son de chaque coup, qui se suivent sans se chevaucher. Une rafale de jets (Coup de chance, Duo) : chaque jet sonne comme un jet (le son de sa compétence, puis son coup), aucun son de plus sur deux faces égales. Les deux dés de la barde (rafale sans statut, phase 5 ter) sont retirés avec le Duo (2026-10-25) |
| `event` (compétence) | Le son déduit de ses effets (§ 4.2) |
| `statusTick` | Ronge si le statut inflige des dégâts, ou le son propre que son registre déclare (`tickSound` : Grésillement pour le Poison, 0.90.0) ; Soin s'il soigne |
| `statusReaction` | Coup si le statut renvoie des dégâts (Riposte), même pour un gros renvoi, ou s'il frappe en dégâts directs (la Sentence, l'Embrasement : leur coup sonne, sans son propre) ; Soin s'il soigne (Vol de vie) ; Ronge s'il fait perdre des PV à son propre porteur (Saignement, 0.68.0 ; depuis la 0.68.1, joué un battement après l'impact du coup qui fait couler la plaie, sur la même frappe) ; sinon le son déduit de ses effets (§ 4.2), donc le son de famille de ce qu'il pose (2026-10-25) : Affliction − quand l'Aura de décoction empoisonne ou quand l'Aura d'épines fait saigner, Précision + quand la Rancune donne son Critique assuré, Puissance + quand la Vindicte donne sa Ferveur, Garde + quand le Bouclier de foi donne son armure ; Aura gagnée quand le Rempart hérissé pose son Aura d'épines (Malus reçu et Bonus gagné avant le 2026-10-25). Un statut posé par le coup qui vient de toucher (l'Aura de décoction, 2026-10-21) tombe avec l'impact de ce coup : son son suit le Coup d'un battement (0,12 s), sur la même frappe, comme le Ronge du Saignement |
| `skip` | Tour perdu |
| `shift` | Transformation |
| `coin` | Pièce lancée, Pièce retombe ; sur pile, Pile réussie **en même temps** (0.55.0, demande de l'utilisateur : le résultat, son son, son badge et son texte tombent d'un bloc ; avant, 0,14 s après), puis, après un temps de lecture, Coup critique au coup ; sur face, rien de plus. La pièce seule ne disait pas assez si le pari était gagné (retour de l'utilisateur, 0.36.4). Le label « Dé pipé » (+), quand le Dé pipé a fait tomber pile, tombe avec ce ding : un seul son (§ 4.4, règle 4). Une relique de pile (la Pièce trouée) sonne avec le résultat (2026-10-25, `MISE_EN_SCENE.md` M40). |
| `relic` | Le son du signe de son label (§ 4.4) avec son sceau ; le son déduit de ses effets (§ 4.2) quand ils tombent : au même instant, sauf si elle pose un statut, qui part de son sceau en signal (0.111.0, `MISE_EN_SCENE.md` M19 et M23) : le label sonne au départ, l'effet à l'arrivée. Une relique du dé (Osselet fendu, Dé creux) sonne avec le Dé posé, avant le coup (M40). Vers l'adversaire, ses coups de scène sonnent le son que leur scène déclare (Coup pour la Conque des vents, Coup critique pour la Braise captive). Rien si aucun effet n'a de résultat (`MISE_EN_SCENE.md` M25) |
| ~~`pair`~~ | Retirée en phase 5 ter avec les doubles de la barde, et avec elle le « ding » de tout double (Pile réussie en même temps que les dés, 0.46.0) : ses deux dés sont une rafale (`flurry`). |
| `statusAge` | Rien : le compteur qui baisse et l'icône qui part se voient (règle 7) |
| Fin du combat | KO, puis Victoire |

Un coup de compétence qui relâche des jauges en entier joue un Coup par jauge, l'un après l'autre ; le dernier, mis en scène comme un coup lourd, joue le Coup critique (décision de l'utilisateur). Depuis la 0.107.0, la Rétribution ne relâche que la moitié de ses jauges : un seul coup, Coup, ou Coup critique à 10 dégâts ou plus (un coup de compétence unique de 10 dégâts ou plus est un coup lourd).

### 4.2 Le son d'une compétence

Une compétence joue **un seul son**, le premier de cette liste qui correspond à ce qu'elle a réellement produit :

0. un bonus volé (le Sceau de vol, lot 3 : le bonus que le lanceur se posait part chez l'adversaire, `stolenBy` ; le Larcin, quatrième demande du 2026-10-27 : le bonus de l'attaquant passe au voleur) → **le son de perte de la famille du voleur** (Sceaux −), même quand c'est une aura, et même quand le voleur est un bonus (le Larcin) : ce qu'on entend, c'est la confiscation (2026-10-25) ;
1. une aura posée → **Aura gagnée** ;
2. une aura retirée (purification) → **Aura perdue** ;
3. un malus posé, sur l'adversaire ou sur soi → **le son de malus de sa famille** (§ 3 ; Malus reçu pour une famille qui n'en a pas) ;
4. un bonus posé sur soi → **le son de bonus de sa famille** (§ 3 ; Bonus gagné pour une famille qui n'en a pas) ;
5. un bonus ou un malus retiré → **Dissipation** ;
6. des PV regagnés → **Soin** ; un soin **empêché** (l'Hémorragie, lot 3 : aucun PV regagné, `wanted`) → **Soin −**, le soin qui flanche, jamais le Soin (2026-10-25, `MISE_EN_SCENE.md` M49) ;
7. des dégâts → **Coup** (un par coup joué) ;
8. rien de tout cela → aucun son : le texte flottant suffit. C'est le cas d'un effet sans résultat (refusé par une immunité, neutralisé par son opposé, statut déjà à son plafond, purge à vide) et d'un **mécanisme de compétence posé** (Pile ou face, Furie des vents : son sceau le montre, et ce qu'il déclenche a ses sons, 0.110.0 ; avant, Bonus gagné). Une aura cumulable reposée à son maximum (Aura de sainteté à 2) ne joue donc plus Aura gagnée (2026-10-21) : rien n'est arrivé, seul le texte neutre « … au maximum » s'affiche. Une **aura non cumulable reposée telle quelle** (Aura de puissance, Aura d'immunité) non plus (0.110.0) : le moteur la compte posée, mais rien n'a changé (`MISE_EN_SCENE.md` M25).

Les sons se déduisent des registres : aura (`isAura`), polarité (`polarity`), famille (`family`, 2026-10-25), type d'effet (`heal`, `damage`, `cleanse`, `applyStatus`). Aucun nom de compétence ni de statut n'apparaît dans la règle. Quand une même étape pose plusieurs statuts de familles différentes, le premier posé choisit (un malus passe toujours avant un bonus) : un seul son (règle 3).

**Les reliques** (0.75.0, [RELIQUES.md](RELIQUES.md)) suivent la même règle : une relique qui se déclenche joue le son de ce qu'elle produit (le Chapelet, Dissipation ou Soin ; la Dent de loup, Soin + par son Vol de vie, et la Clepsydre, Précision + par son Critique assuré, depuis le 2026-10-25 ; Bonus gagné avant), sans son propre. Un coup renforcé par une relique (Fer à quatre clous) sonne comme un coup ; les dégâts directs de l'Osselet, comme une réaction (Coup). Depuis le 2026-10-21, une relique qui agit pose aussi son label sous le dé : le son de son signe (§ 4.4 : le ding pour un bonus de son porteur, chez l'attaquant comme chez le défenseur ; Malus reçu pour une relique du défenseur qui contre le coup, la Conque des vents) s'ajoute au son de son effet. C'est la réponse retenue à la piste « on entend relique » (RELIQUES.md § 3) : le label dit « surcharge », le son de l'effet dit laquelle. Une relique dont le label se tait (M25 : rien n'a changé) ne sonne pas.

**Les reliques de source** (2026-10-25, [RELIQUES.md](RELIQUES.md) § 16) n'ajoutent aucun son : leurs effets tombent dans les règles existantes. Le Dard de guêpe et le Briquet d'amadou posent un malus sur l'adversaire (règle 3 : Affliction −, à l'arrivée de leur signal ; Malus reçu avant les sons de famille), avec le ding de leur label au dé posé ; puis le Poison grésille et la Brûlure ronge, comme ceux des compétences (§ 9.3). La Pièce de foire (retirée le 2026-10-27) posait un mécanisme (règle 8 : aucun son propre) : sa pièce sonnait comme celle de Pile ou face (Pièce lancée, Pièce retombe, sur pile Pile réussie puis Coup critique). Le Brassard à pointes pose un bonus sur son porteur (Représailles +, Bonus gagné avant) ; sa Riposte sonne Coup quand elle renvoie. Non vérifiable par l'agent : l'écoute.

### 4.3 Vérification : les compétences du roster

| Son | Compétences |
| --- | --- |
| Aura gagnée | Aura de puissance, Aura de précision, Aura d'intimidation, Aura glaciale, Aura de sainteté, Aura de décoction, Aura d'immunité (elle purge aussi, mais l'aura passe en premier), Aura sauvage (0.73.0) ; Sentence (0.114.0), Rempart hérissé et Vindicte (second lot) ; le Duo du 2026-10-25 au 2026-10-27, tant qu'il posait l'Aura mélodieuse (retirée du jeu le 2026-10-27, avec l'Ouverture : le Duo sonne depuis Bonus gagné) ; Bouclier de foi, Pas de côté et Plaie ouverte (revue des compétences, 2026-10-25 : trois auras, aucun son nouveau) ; Aura d'épines (0.118.1, revue X1 : Bonus gagné quand elle s'appelait Épines acérées ; déduit de sa nature, aucun son nouveau) |
| Sons de famille, bonus (2026-10-25 ; Bonus gagné avant) | Précision + : Œil de faucon, Rancune (0.114.0) ; Esquive + : Esquive améliorée ; Garde + : Peau de pierre ; Soin + : Vol de vie, Siffloter ; Fortune + : Coup de chance ; Représailles + : Riposte |
| Aucun son propre (mécanisme posé, § 4.2 règle 8) | Furie des vents (sa rafale sonne), Pile ou face (sa pièce sonne) : Bonus gagné jusqu'à la 0.109.1 ; Soliste et Crescendo (coup de base ×N, sans effet : leur coup sonne) ; Curée (0.114.0 : sa rafale sonne) ; Embrasement (son coup sonne) et Dé pipé (sa pièce sonne), second lot |
| Sons de famille, malus (2026-10-25 ; Malus reçu avant) | Affliction − : Souffle de la tombe, Feux follets (0.73.0, Brûlure posée), Pourfendre (0.70.0 : son coup sonne d'abord comme un coup, puis la plaie posée ; avant, la Saignée, et la Rage du sang, qui jouait Soin), Virulence (0.114.0, le Poison multiplié) ; Tempo − : Peur ; Puissance − : Fausse note |
| Soin | Récolte (0.114.0) |
| Dissipation ou Aura perdue | Purification (Aura perdue si le bonus retiré est une aura ; sans bonus à retirer, ses dégâts directs sonnent comme un coup reçu) |
| Coup | Rétribution (la moitié de ses jauges en un coup ; Coup critique à 10 dégâts ou plus) |
| Coup critique | Foudre (0.76.0 : un par éclair, à l'impact de chacun ; quatre coups de 1 dégât depuis la revue des compétences, trois avant ; l'Éclair synthétisé de la 0.110.0 retiré le 2026-10-24 : l'utilisateur garde ce son) |

### 4.4 Les labels de la zone de surcharge (2026-10-21)

Un label (badge sous le dé : « Critique ×2 », « Armure temporaire −6 », « Saignement +2 », le nom d'une relique) marque ce qui change le coup en cours (la zone de surcharge, [RESOLUTION.md](RESOLUTION.md) § 11). Demande de l'utilisateur : « chaque label positif doit faire un ding positif au moment de son affichage ; les labels négatifs un son négatif. On devient capable de juger la valeur d'une action à l'oreille aussi. »

1. **Le son suit le signe du label**, toujours du point de vue de l'attaquant (décision de l'utilisateur, 2026-10-21) : + si la surcharge amplifie son action (critique, relique, Vol de vie, Saignement qui coule sur le défenseur), − si elle la réduit ou la contre (Esquive assurée, bouclier qui absorbe, Fausse note, Riposte du défenseur ; ses Épines jusqu'à la 0.118.1, une aura depuis, sans label). Le signe est déduit de la mécanique dans son registre (`SPECIAL_SIGNS`, `specials.ts`), jamais choisi au point d'appel ; la couleur (la source) ne compte pas pour le son. **Exception, la relique du défenseur** (décision de l'utilisateur, 2026-10-24, 0.110.0) : elle ne pose jamais de malus, et un bonus gardé pour plus tard est un bonus pour son porteur. Son label est donc + (le ding), sauf si elle contre le coup en cours (la Conque des vents, qui frappe l'attaquant : −). Avant, toute relique du défenseur était −, et le même instant jouait Malus reçu avec le Bonus gagné ou le Soin de son effet. **La même exception pour un statut du défenseur** (2026-10-25, décision de l'agent à confirmer, `MISE_EN_SCENE.md` M45) : une réaction qui ne fait que donner un bonus à son porteur (la Rancune, son Critique assuré) est + ; avant, son Malus reçu sonnait avec le Bonus gagné de son effet, deux significations opposées au même instant.
2. **Label + → Pile réussie** (le « ding » de la chance, choisi par l'utilisateur : « le ding de la pièce ? ») ; **label − → Malus reçu**. Pas de son nouveau : on pioche dans ce qui existe. Les sons de famille (2026-10-25) ne touchent pas aux labels : le label dit le signe de la surcharge, pas sa famille ; Malus reçu est désormais d'abord le son du label −.
3. **Son composé déclaré** (règle 3) : le son du label s'ajoute à celui de l'instant où il tombe (Dé posé, Soin, Coup…). Un critique s'annonce donc par le ding de son label, puis frappe avec son Coup critique à l'impact ; « Saignement +2 » sonne son ding à l'impact, puis la plaie son Ronge un battement après.
4. **Jamais deux fois le même son au même instant** : plusieurs labels qui tombent ensemble (Critique assuré et Critique ; Armure temporaire et Fausse note) jouent un seul son par signe.
5. **Pas de doublon de signification** : un label dont l'effet joue déjà le son de son signe dans la même frappe se tait (déduit : le son des effets, `cueOf`, est celui du signe). Ce fut le cas des Épines acérées (−) et du Malus reçu du Saignement qu'elles posent, jusqu'à la 0.118.1 : en aura, elles n'ont plus de label du tout. Depuis les sons de famille (2026-10-25), un malus posé ne joue plus Malus reçu : s'il tombait avec un label −, les deux sonneraient (le signe, puis la famille). Aucun cas aujourd'hui : aucun label − ne pose de malus.
6. **Pas de label pour une réaction refusée** (0.110.0) : une réaction dont aucun effet n'a de résultat (les Épines acérées contre une Aura d'immunité : « Saignement résisté ») n'a ni label ni son ; seul son texte neutre s'affiche (règle 8 du § 4.2, `MISE_EN_SCENE.md` M25).

Hors de la colonne, donc sans son de label : Pile ou face, la Furie des vents, Coup de chance, Rétribution, Crescendo et Soliste (ce coup ×N : leur coup sonne, la compétence est muette), les auras. La pièce sur pile garde son propre ding (§ 4.1).

Le code : `addSpecial` (`staging.ts`) pose le label et émet le son de son signe ; `sound` n'émet qu'un son par nom et par instant, ce qui règle à la fois la règle 4 (deux labels du même signe) et la règle 5 (un effet qui joue déjà ce son dans la même frappe).

## 5. Mixage

- Les fichiers sont égalisés à la même intensité par `scripts/process-sounds.py` ; le niveau de chaque son se règle ensuite dans `MIX` (`sound.ts`), d'après les quatre niveaux du § 3.
- Niveaux (0.36.4) : niveau 1 à 100 %, niveau 2 à 85 %, niveau 3 à 70 %, niveau 4 à 45 %. Les dés restent un peu sous le niveau 3 (47 et 64 %).
- **Volume général** (0.36.4, « on n'entend rien ») : fichiers égalisés à -12 dB RMS au lieu de -16, volume général à 100 % au lieu de 60 %, puis un compresseur (seuil -14 dB, rapport 4) et un gain de 1,4. Les sons sont nettement plus forts, et le compresseur empêche la saturation quand ils se chevauchent.
- Le Coup critique additionne ses deux couches : le Coup à son niveau, le Grondement au niveau 1.
- **Les sons de famille** (2026-10-25) : au niveau 3, comme le Bonus gagné et le Malus reçu qu'ils relaient ; égalisés par `process-sounds.py` à −12 dB RMS comme les autres (§ 7). Un son de famille trop fort ou trop faible à l'oreille se règle dans `MIX`, un par un.

## 6. Étendre le jeu

- **Nouvelle compétence, nouveau statut** : rien à faire. Le son se déduit de ses effets (§ 4.2). Un statut nouveau déclare sa famille (`StatusDef.family`, obligatoire : le typage le refuse sinon) : sa pose sonne celle-ci (§ 3). Si aucun son ne lui correspond, c'est une nouvelle signification : on l'ajoute d'abord ici, au vocabulaire (§ 3) et à la priorité (§ 4.2).
- **Nouveau type d'étape** : lui donner sa ligne au § 4.1 avant de coder sa mise en scène.
- **Son propre à une compétence** (signature) : interdit par défaut (règle 4). Il faut une décision écrite ici, avec sa raison ; aucune n'existe aujourd'hui.

## 7. Les fichiers

- Un seul fichier par son : `src/assets/sounds/<nom>.mp3`, traité par `scripts/process-sounds.py` (silence de tête coupé, durée ramenée à sa fenêtre, intensité égalisée). La provenance de chaque fichier est notée dans `src/assets/sounds/SOURCES.md`.
- Le choix du fichier se fait **à l'oreille, par l'utilisateur** : l'agent ne peut rien écouter. Parmi les 67 fichiers de la 0.36.0, certains peuvent servir (un impact pour Coup, un roulement pour Dé lancé) ; les autres sons sont à chercher d'après le timbre du § 3. **Exception, les sons de famille** (2026-10-25) : générés et choisis par l'agent sur mesures, sans écoute (tableau ci-dessous) ; l'utilisateur garde le dernier mot, à l'oreille, en jeu.
- Un son sans fichier garde sa version synthétisée en repli ; un son de famille sans fichier joue le Bonus gagné ou le Malus reçu générique de sa polarité.
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

**Les sons de famille (2026-10-25)** : générés par l'agent avec ElevenLabs (modèle de bruitages, offre gratuite ; prompts dans `SOURCES.md`), deux prises par son. Sans écoute possible, la prise retenue est choisie **sur mesures** (`ffmpeg`) : écartées les prises quasi muettes (crête sous −30 dBFS), à crête écrêtée à plat (plus de 10 échantillons de suite à pleine échelle), dont la queue ne retombe pas (plancher au-dessus de −40 dB sous la crête), ou trop longues pour la fenêtre ; puis préférées celles dont le nombre d'attaques suit le prompt (deux tocs, quatre battements d'ailes) et dont l'énergie tombe dans la bonne bande (grave pour le tambour et le cœur, aigu pour les pièces, le sable et les plumes). Traitement : `process-sounds.py` (silence de tête coupé, fenêtre, fondu de sortie, limiteur, MP3 mono 96 kb/s), le gain ramené vers −14 LUFS intégrés, la sonie moyenne des sons en place (Aura gagnée, Bonus gagné, Malus reçu, Grésillement, Tour perdu, Pile réussie, Coup : −12,1 à −15,9 LUFS), sans écraser une crête de plus de 4 dB. Les sons à attaque sèche n'y arrivent pas sans écrêter : leur crête touche le limiteur, leur sonie intégrée reste plus basse (colonne LUFS).

| Son | Fichier du jeu | Prise retenue (écartée : raison) | Durée | LUFS |
| --- | --- | --- | --- | --- |
| Puissance + | `power-up.mp3` | 2 (1 : bruit de fond à −48 dB sous la crête, trop longue) | 0,68 s | −16,1 |
| Puissance − | `power-down.mp3` | 1 (2 : plancher à −53 dB, queue qui traîne) | 0,57 s | −16,7 |
| Garde + | `guard-up.mp3` | 2 (1 : plancher à −52 dB, queue à −35 dB) | 0,67 s | −13,9 |
| Garde − | `guard-down.mp3` | 1 (2 : crêtes plates, onze) | 0,44 s | −18,7 |
| Précision + | `precision-up.mp3` | 1 (2 : crête à −20 dBFS, plancher à −38 dB) | 0,79 s | −13,8 |
| Précision − | `precision-down.mp3` | 1 (2 : plus longue que la fenêtre) | 0,70 s | −14,0 |
| Esquive + | `evasion-up.mp3` | 1 (2 : 0,35 s, sous la fenêtre) | 0,55 s | −16,0 |
| Esquive − | `evasion-down.mp3` | 1 (2 : quasi muette, crête à −42 dBFS) ; **la prise 1 est écrêtée à la source** (crêtes plates de 39 échantillons) : à régénérer si la Luciole revient en jeu | 0,45 s | −23,6 |
| Tempo − | `tempo-down.mp3` | 2, deux tocs (1 : un seul) | 0,41 s | −16,0 |
| Fortune + | `fortune-up.mp3` | 1 (2 : plancher à −37 dB, crête tardive à 0,6 s) | 0,70 s | −13,8 |
| Fortune − | `fortune-down.mp3` | 1 (2 : bourdon qui ne retombe pas, queue à −12 dB) | 0,80 s | −13,8 |
| Affliction − | `affliction-down.mp3` | 1, plus de corps grave (2 : 74 % d'aigu, du sifflement contre le prompt) | 0,45 s | −17,4 |
| Soin + | `healing-up.mp3` | 2 (1 : écrêtée, 27 crêtes plates) | 0,80 s | −15,2 |
| Soin − | `healing-down.mp3` | 1 (2 : écrêtée, une crête plate de 5 ms) | 0,80 s | −16,6 |
| Représailles + | `retaliation-up.mp3` | 2 (1 : 154 échantillons à pleine échelle) | 0,57 s | −14,1 |
| Sceaux − | `seal-down.mp3` | 2 (1 : queue qui ne retombe pas, à −24 dB) | 0,67 s | −15,1 |

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
| Les familles de son (2026-10-25) | « Génère les familles de son avec ElevenLabs ; essaie de faire des familles de son qui ne soient pas toutes les mêmes » : la pose d'un bonus ou d'un malus sonne sa famille et sa polarité (règle 4 étendue), une famille par matériau (§ 3). Choix de l'agent, à confirmer : les auras gardent Aura gagnée (une durée, pas une famille), les labels gardent leur signe (§ 4.4), 16 sons plutôt que 20 (Tempo +, Affliction +, Sceaux + et Représailles − n'ont aucun statut qui sonne aujourd'hui). |
| Le retour du 2026-10-27 | « Si pile, le son du coup doit devenir le coup normal et pas le son critique » : le coup de pile sonne **Coup** (le ding de la pièce a déjà dit la réussite). « Un son de pièce pour toutes les compétences de type pièce » : toute pièce passe par l'étape `coin` et sonne Pièce lancée, Pièce retombe, Pile réussie sur pile, quel que soit son visuel ; une pièce qui pose un statut sur pile sonne ensuite le son de ce statut, à l'arrivée de son signal. « Duo : synchroniser le ding avec la consommation » : une rafale posée plus tôt (Duo, Coup de chance) s'annonce avec **Pile réussie**, à l'instant où sa charge quitte la zone d'état (choix de l'agent : la consommation était muette ; à confirmer à l'oreille). La Riposte esquivée sonne Esquive. Rétribution : un Coup par jauge, Coup critique sur la dernière (règle des séries). **Rien entendu par l'agent.** |

## 9. Index : qui joue quel son

Les deux sens de lecture : ce qui fait jouer chaque son (§ 9.1), et le son de chaque élément du jeu (§ 9.2 à 9.4). Ces tables découlent des règles du § 4 ; un test vérifie celle des compétences (`modules.test.ts`).

### 9.1 Par son

| Son | Ce qui le fait jouer |
| --- | --- |
| Dé lancé | tout jet : attaque, initiative, rafale (Furie des vents, Coup de chance, Duo), un seul pour tous les dés |
| Dé posé | la fin de tout jet, quelle que soit la face |
| Pièce lancée | Pile ou face, quand la pièce part |
| Pièce retombe | Pile ou face, quand la pièce retombe, sur pile comme sur face |
| Pile réussie | Pile ou face, juste après la pièce, quand elle tombe sur pile ; tout label + sous le dé : critique, bonus de relique, relique qui se déclenche pour un bonus de son porteur (chez l'attaquant comme chez le défenseur, 0.110.0), Luciole, Vol de vie, Saignement (2026-10-21, § 4.4), Rancune et Dé pipé (2026-10-25). La barde sur un double jusqu'à la phase 5 ter |
| Coup | un coup d'attaque qui touche (y compris ceux de l'ours, le coup de Pourfendre et les coups de la Curée) ; la Riposte (renvoi) ; la perte de PV de la Sentence et la frappe de l'Embrasement (2026-10-25) ; la relâche de la Rétribution (un coup, la moitié de ses jauges, sous 10 dégâts) ; chaque jauge d'une relâche en entier sauf la dernière ; les lames d'air de la Conque des vents |
| Coup critique | un coup critique (dont ceux d'Œil de faucon) ; le coup de Pile ; le dernier coup d'une relâche en entier, ou un coup de compétence unique de 10 dégâts et plus (la Rétribution à 10 et plus) ; les météores de la Braise captive ; la Foudre, un par éclair, à l'impact de chacun (0.76.0, gardé le 2026-10-24) |
| Esquive | un coup esquivé (dont ceux d'Esquive améliorée) ; le critique raté d'un aveuglé (lot 3, `MISE_EN_SCENE.md` M47 : le coup passe à côté, le même son) |
| Aura gagnée | les compétences d'aura (§ 4.3 ; Sentence, Rempart hérissé et Vindicte depuis la 0.114.0 et le second lot ; Bouclier de foi, Pas de côté et Plaie ouverte depuis la revue des compétences ; le Duo et l'Ouverture jusqu'au 2026-10-27) |
| Aura perdue | une purification qui retire une aura |
| Bonus gagné | un bonus posé sur soi, hors aura, d'une famille sans son de bonus à elle (Tempo, Affliction, Sceaux) : le Duo (son dé de plus, depuis le 2026-10-27). Jusqu'au 2026-10-25, toute pose de bonus : les 9 compétences qui posent un bonus sur leur lanceur, la Rancune, la Vindicte et le Bouclier de foi quand ils agissent |
| Malus reçu | un label − sous le dé : Esquive assurée, bouclier qui absorbe, Fausse note, Riposte, relique du défenseur qui contre le coup (la Conque des vents, les Clous de pavois) (2026-10-21, § 4.4) ; un malus d'une famille sans son de malus à elle (Représailles : aucun). Jusqu'au 2026-10-25, toute pose de malus (Souffle de la tombe, Peur, Feux follets, Fausse note, Pourfendre, Virulence, l'Aura de décoction, l'Aura d'épines, l'Aura glaciale qui posent leur mal) |
| Puissance + | la Vindicte qui donne sa Ferveur ; l'Encens de l'abbaye (Ferveur) |
| Puissance − | Fausse note |
| Garde + | Peau de pierre ; le Bouclier de foi qui donne son armure |
| Garde − | Brise-garde (lot 3) ; Brèche, Vulnérable (sans porteur aujourd'hui) |
| Précision + | Œil de faucon, Rancune, Odeur du sang (2026-10-27) ; la Rancune qui donne son Critique assuré ; les reliques qui posent un Critique assuré (Clepsydre du siège, Trophée du chasseur, Cloche d'ouverture) |
| Précision − | Aveuglé (Éclair aveuglant, lot 3) |
| Esquive + | Esquive améliorée ; une relique qui la pose (Dé creux) |
| Esquive − | Luciole (sans porteur aujourd'hui) |
| Tempo − | Peur ; Étourdi (sans porteur aujourd'hui) |
| Fortune + | Coup de chance |
| Fortune − | Malchance (lot 3) |
| Affliction − | Souffle de la tombe, Feux follets, Pourfendre (après son coup, s'il touche), Virulence, Serment de sang (2026-10-27) ; l'Aura de décoction qui empoisonne, un battement après le coup qui touche ; l'Aura d'épines qui fait saigner l'attaquant ; l'Aura glaciale qui pose son Poison au début de chaque tour de son porteur ; la Plaie ouverte qui fait saigner ; la Peau de crapaud qui empoisonne l'attaquant ; la Flamme votive qui allume sa Brûlure ; le Dard de guêpe et le Briquet d'amadou |
| Soin + | Vol de vie, Siffloter, Dîme (2026-10-27) ; la Dent de loup (Vol de vie) |
| Soin − | Hémorragie (lot 3), à sa pose ; puis chaque soin qu'elle empêche, avec son « 0 » barré |
| Représailles + | Riposte ; le Brassard à pointes |
| Sceaux − | Sceau de vol (Confiscation, lot 3 : le bonus confisqué, posé chez le voleur) ; Larcin (quatrième demande du 2026-10-27 : le bonus pris à l'attaquant) |
| Dissipation | une purification qui retire un bonus ou un malus autre qu'une aura |
| Tour perdu | le tour sauté d'un combattant apeuré (Peur) ou étourdi (Coup de massue, lot 3) ; le jet tombé à vide d'un combattant malchanceux (Malchance, lot 3 : il ne peut pas agir, `MISE_EN_SCENE.md` M46) |
| Ronge | Pourriture et Brûlure qui agissent sur leur porteur ; le Saignement qui coule quand un coup touche son porteur (0.68.0) |
| Grésillement | le Poison qui agit sur son porteur, à la fin de son tour (au début jusqu'au 2026-10-27 ; dont le Poison posé par l'Aura glaciale ou l'Aura de décoction) (0.90.0) |
| Soin | le vol de vie (Vol de vie) ; la Récolte (0.114.0) ; l'Aura de sainteté et la Régénération qui soignent (la Régénération est sans porteur depuis la 0.73.0) |
| Transformation | le druide qui change de forme, dans les deux sens |
| KO | la fin du combat, par K.O. ou à la limite de tours |
| Victoire | juste après le KO |
| Clic | les boutons de l'interface |
| Choc du face-à-face | l'écran de présentation du duel |

### 9.2 Par personnage

Dé vanilla depuis les maîtrises (2026-10-27, `modules.test.ts`, « le dé vanilla ») : l'aura de départ sur le 1, la compétence du personnage sur le 2, quatre faces nues. Les sons, déduits (§ 4.2), sont ceux que fige `modules.test.ts` ; avant les maîtrises, chaque race avait trois compétences sur ses faces 1 à 3 (voir l'historique de PERSONNAGES.md).

| Personnage | Sur un 1 (aura de départ) | Sur un 2 | Faces 3 à 6 |
| --- | --- | --- | --- |
| Gorak (orc) | Ivresse du sang : Aura gagnée | Furie des vents : aucun son propre, sa rafale sonne (Bonus gagné jusqu'à la 0.109.1) | faces nues |
| Elaria (elfe) | Feinte : Aura gagnée | Œil de faucon : Précision + | faces nues |
| Brokk (nain) | Aura d'épines : Aura gagnée (Bonus gagné avant la 0.118.1) | Peau de pierre : Garde + | faces nues |
| Ervald (mort-vivant) | Aura glaciale : Aura gagnée | Vol de vie : Soin + | faces nues |
| Ysolde (humaine) | Aura de sainteté : Aura gagnée | Purification : Aura perdue ou Dissipation | faces nues |
| Naraxes (homme-lézard) | Aura de décoction : Aura gagnée | Pile ou face : aucun son propre, sa pièce sonne (Bonus gagné jusqu'à la 0.109.1) | faces nues |
| Aldric (paladin) | Vindicte : Aura gagnée | Rétribution : Coup, Coup critique à 10 dégâts et plus (la moitié de ses jauges en un coup, 0.107.0 ; Coup par jauge et Coup critique sur la dernière avant) | faces nues |
| Morgrut (ogre) | Aura de puissance : Aura gagnée | face nue | faces nues |
| Thaldrin, forme humaine (druide) | Ciel d'orage : Aura gagnée | Feux follets : Affliction − (0.73.0 ; Écorce épaisse avant) | faces nues |
| Thaldrin, forme d'ours | coup : Coup (ses faces de compétence sont à la forme humaine) | coup : Coup | coup : Coup |
| Fanchon (barde) | Ballade : Aura gagnée | Duo : Bonus gagné (ses dés de plus seuls depuis le 2026-10-27 ; Aura gagnée du 2026-10-25 au 2026-10-27, avec l'Aura mélodieuse, quand il était sur le 1 ; sa rafale, à l'action suivante, s'annonce avec Pile réussie puis sonne comme toute rafale) | faces nues (l'Ouverture et son Aura gagnée, retirées le 2026-10-27) |

Une compétence sans effet réel ne sonne pas (règle 8) : un soin à PV pleins, un malus bloqué par une immunité.

### 9.3 Par statut, quand il agit

Le son de la pose d'un statut est celui de la compétence qui le pose (§ 9.2), le son de sa famille depuis le 2026-10-25 (§ 9.1). Ce tableau donne le son du statut lui-même, quand il agit ensuite ; un statut absent du tableau agit sans son propre (il modifie un coup, qui garde le sien).

| Statut | Quand il agit | Son |
| --- | --- | --- |
| Poison | fin du tour du porteur (début jusqu'au 2026-10-27) | Grésillement (0.90.0 ; Ronge avant) |
| Pourriture | début du tour du porteur | Ronge |
| Brûlure | fin du tour du porteur | Ronge |
| Aura glaciale | début du tour du porteur, Poison posé sur l'adversaire | Affliction − (2026-10-25 ; Malus reçu depuis la 0.69.0 ; Ronge avant, quand elle infligeait des dégâts directs). Le Poison qu'elle nourrit joue Grésillement à la fin du tour de la victime (au début jusqu'au 2026-10-27) |
| Régénération | début du tour du porteur | Soin |
| Aura de sainteté | fin du tour du porteur | Soin |
| Aura d'épines (Épines acérées avant la 0.118.1) | le porteur est touché | Affliction − (Saignement posé sur l'attaquant ; Malus reçu jusqu'au 2026-10-25 ; Coup jusqu'à la 0.67.3, quand elles renvoyaient des dégâts) ; purgée, Aura perdue (0.118.1) |
| Saignement | un coup touche le porteur | Ronge |
| Riposte | le porteur est touché | Coup (contre-coup) |
| Vol de vie | le coup du porteur touche | Soin, un battement après le Coup de ce coup (0.97.0 : le soin tombe à l'impact, `MISE_EN_SCENE.md` M14) |
| Aura de décoction | le coup du porteur touche | Affliction − (poison posé ; Malus reçu jusqu'au 2026-10-25), un battement après le Coup de ce coup (2026-10-21) |
| Peur, Étourdi | tour du porteur | Tour perdu |
| Furie des vents, Coup de chance, Duo | action du porteur | Dé lancé, Dé posé, puis le son de chaque coup |
| Pile ou face (et toute pièce) | action du porteur | Pièce lancée, Pièce retombe ; sur pile, Pile réussie puis Coup (Coup critique jusqu'au 2026-10-27), ou le son du statut que la pièce pose |
| Rétribution | relâchée par sa compétence | un Coup par jauge, Coup critique sur la dernière (2026-10-27 ; un seul coup, la moitié de ses jauges, de la 0.107.0 au 2026-10-27) |
| Duo, Coup de chance (consommés) | l'action qui les consomme | Pile réussie, avec leur nom et la charge qui part (2026-10-27) |
| Critique assuré, Esquive améliorée | le prochain coup | Coup critique, Esquive |
| Sentence | le porteur regagne des PV | Coup (sa perte de PV, en coup sans élan, à l'arrivée du signal de son anneau, au milieu de la lecture du soin : `MISE_EN_SCENE.md` M19 bis, M41) |
| Rancune | le porteur encaisse un coup | Précision + (Critique assuré posé ; Bonus gagné jusqu'au 2026-10-25) et Pile réussie (son label +), au milieu de la lecture du coup |
| Curée | juste après le coup de base de son jet | aucun son propre : ses dés apparaissent à plat, sans Dé lancé (`MISE_EN_SCENE.md` M27), puis le son de chaque coup |
| Rempart hérissé | un coup vide l'armure temporaire du porteur | Aura gagnée depuis la 0.118.1 (l'Aura d'épines qu'il pose est une aura ; Bonus gagné avant) : Aura d'épines et armure temporaire posées ensemble, un seul son ; l'armure depuis la revue des auras |
| Vindicte | le porteur renvoie des dégâts (Riposte, Rétribution) | Puissance + (Ferveur posée ; Bonus gagné jusqu'au 2026-10-25), au milieu de la lecture du dernier coup du renvoi |
| Embrasement | le coup du porteur touche un adversaire qui brûle | Coup, même gros, comme un renvoi (§ 4.1 : la frappe d'un statut n'est qu'un coup) ; son chiffre, lui, est doré à 10 dégâts et plus |
| Dé pipé | la pièce suivante | Pile réussie (son label, avec le ding de pile) |
| Bouclier de foi | le porteur regagne des PV | Garde + (armure temporaire posée ; Bonus gagné jusqu'au 2026-10-25), au milieu de la lecture du soin (`MISE_EN_SCENE.md` M41) |
| Plaie ouverte | le coup critique du porteur touche | Affliction − (le Saignement posé sur l'adversaire, comme l'Aura de décoction qui empoisonne ; Malus reçu jusqu'au 2026-10-25), au milieu de la lecture du coup |
| Malchance (lot 3) | le jet du porteur qui porterait une compétence | Tour perdu, un battement après le dé, avec « Malchance » (le jet tombe à vide : il ne peut pas agir, comme la Peur ; Fortune − à la pose) |
| Aveuglé (lot 3) | le critique du porteur | Esquive à l'impact du coup raté (aucun son propre ; le ding du label du critique, à son annonce) |
| Hémorragie (lot 3) | le porteur reçoit un soin | Soin − (le soin empêché), à l'instant du soin ; jamais le Soin |
| Garde brisée (lot 3) | le porteur est touché | aucun son propre : le Coup, et le ding du label « Garde brisée » ; l'armure qui vole en éclats est muette |
| Sceau de vol (lot 3) | le porteur se pose un bonus | Sceaux − (règle 0 du § 4.2), à l'arrivée de l'icône chez le voleur |
| Larcin (quatrième demande du 2026-10-27) | son porteur esquive un attaquant qui porte un bonus | Sceaux − (règle 0 du § 4.2), à l'arrivée de l'icône chez le voleur |
| Élan, Surtension, Emprise, Larcin (posés) | une aura | Aura gagnée ; la Ferveur de l'Élan, Puissance + |
| Onde de choc (quatrième demande du 2026-10-27) | son 3, des coups encaissés | aucun son de compétence : son coup sonne le Coup à l'impact de sa scène, l'arène tremble |
| Feinte (lot 3) | le porteur esquive | Précision + (Critique assuré posé), à l'arrivée du signal de son anneau |
| Sève noire, Dette de sang (lot 3) | le porteur regagne des PV ; l'adversaire renvoie des dégâts | Affliction − (Poison, Saignement posés), à l'arrivée du signal de son anneau (`MISE_EN_SCENE.md` M41) |
| Ciel d'orage (lot 3) | début du tour du porteur | Coup, un par éclair (sa perte de PV, en coup sans élan, comme la Sentence) ; aucun Ronge |
| Ivresse du sang (lot 3) | le coup critique du porteur | aucun son propre : ses deux coups de plus apparaissent à plat, sans Dé lancé, puis le son de chaque coup |
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

