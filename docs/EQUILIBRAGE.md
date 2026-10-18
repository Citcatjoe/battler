# Équilibrage par simulation

Ce document décrit **comment on équilibre Battler** : simuler des milliers de combats, en tirer des constats, choisir un levier, vérifier. C'est une étape **obligatoire après chaque grosse mise à jour du gameplay** : nouvelle compétence, nouveau statut, nouvelle règle de résolution, changement de stats ou de personnage.

Les mesures par personnage et la matrice des duels sont dans [PERSONNAGES.md](PERSONNAGES.md). Les règles des statuts sont dans [STATUTS.md](STATUTS.md).

---

## 1. Ce qu'on cherche

**Un roster équilibré mais typé.** Des personnages qui ont tous strictement 50 % de victoires seraient des clones. On veut que chacun ait ses forces, ses faiblesses et ses duels difficiles, sans qu'aucun ne domine.

| Critère | Seuil | Vérifié par |
| --- | --- | --- |
| Taux de victoire de chaque personnage contre le reste du roster | entre **42 et 58 %** | `balance.test.ts` (bloquant) |
| Duel le plus déséquilibré | pas au-delà de **65/35** | `balance.test.ts` (bloquant) |
| Cible de confort | entre 45 et 55 %, duels sous 60/40 | ce document (indicatif) |

Une sortie de la zone de confort n'est pas une erreur. Elle se justifie dans `PERSONNAGES.md` (par exemple : l'elfe souffre contre le nain, c'est voulu).

**Le personnage passe avant le chiffre.** Un réglage qui équilibre le taux de victoire mais efface l'identité d'un personnage est un mauvais réglage. C'était le cas de Brokk à 83 PV (0.27.0) : équilibré, mais réduit à un sac de PV aux combats de 32 tours.

---

## 2. Quand le faire

- Après **chaque** ajout ou modification de compétence, de statut, de règle de résolution ou de stats.
- Avant de livrer une version qui touche le gameplay : le rapport d'équilibre accompagne l'entrée du CHANGELOG.
- Quand l'utilisateur signale un combat qui « ne semble pas juste » : on lit d'abord sa trace (`logs/combats/`), puis on mesure.

---

## 3. Les outils

| Outil | Commande | Ce qu'il donne |
| --- | --- | --- |
| **Rapport d'équilibre** | `npm run balance` (`BALANCE_N=1500 npm run balance` pour plus de combats) | Taux de victoire avec marge d'erreur, durée des combats, dégâts par coup, part des jets sans dégâts, **valeur nette de chaque compétence**, apport de chaque statut, matrice des duels. Écrit dans `logs/balance/<date>_v<version>.md`. |
| **Analyse dans le code** | `analyzeBalance(personnages, combatsParDuel)`, `winRate(perso, roster)` (`src/game/analysis.ts`) | Les mêmes mesures sur un roster **modifié pour un essai**, sans toucher au vrai roster. |
| **Personnage d'essai** | `perso.adjusted({ stats, events })` (`character.ts`) | Le même personnage avec d'autres stats ou d'autres compétences. |
| **Test d'équilibre** | `npm run check` | Échoue si un personnage sort de 42 à 58 % ou si un duel dépasse 65/35. |
| **Audit de résolution** | `npm run check` (`audit.test.ts`) | Vérifie que les règles sont justes avant de mesurer quoi que ce soit. |
| **Traces de combat** | `logs/combats/` (serveur de dev) | Le récit exact d'un combat, pour comprendre un cas que les chiffres signalent. |
| **Rapport des combats joués** | `npm run logs` (`LOGS_SINCE=2026-10-18_14-00 npm run logs` pour une seule session) | Chaque combat de l'utilisateur est rejoué depuis sa graine, comparé à sa trace (mêmes règles ?), audité, puis résumé : victoires, durées, compétences, moments marquants (gros coups, épines contre Furie, K.O. hors d'un coup, auras multiples, combats très longs). Écrit dans `logs/reports/`. |

### Lire la valeur nette d'une compétence

C'est la mesure la plus utile. On rejoue **les mêmes combats** (mêmes graines) sans la compétence : son jet redevient alors un coup normal. L'écart de taux de victoire est sa valeur nette.

- **+15 points ou plus** : la compétence porte le personnage. On la touche avec prudence.
- **De +5 à +15 points** : elle compte, sans écraser le reste.
- **Moins de +3 points** : elle ne pèse presque rien. Elle ne coûte pas grand-chose à garder, mais elle n'apporte pas l'identité qu'on lui prête.
- **Négative** : elle coûte plus qu'elle ne rapporte. C'est possible, puisqu'un jet de 1 à 3 sacrifie le coup.

---

## 4. La méthode

1. **Vérifier les règles d'abord.** `npm run check` : l'audit et les tests doivent passer. On n'équilibre pas des règles fausses.
2. **Mesurer l'état de départ.** `npm run balance`, puis garder le rapport.
3. **Comprendre avant d'agir.** Pour chaque personnage hors de la zone de confort, chercher la cause dans le rapport : compétence trop forte ou trop faible (valeur nette), dé pénalisé (jets sans dégâts), combats trop longs, duel précis.
4. **Choisir un levier** dans l'ordre du § 5, et écrire en une phrase pourquoi celui-là.
5. **Essayer** sur un roster d'essai (`adjusted`), avec 400 à 600 combats par duel. Comparer plusieurs pistes.
6. **Confirmer** le réglage retenu sur un échantillon trois fois plus gros (1 500 combats par duel). Si le résultat bouge de plus d'un point, c'était du bruit : revoir l'essai.
7. **Appliquer**, mettre à jour l'empreinte de non-régression (`npx vitest run -u`), et documenter : `PERSONNAGES.md` (mesures, matrice, décision), le CHANGELOG (avant → après) et la ligne du journal (§ 7).

### Après un tournoi de test

Quand l'utilisateur a joué une série de combats (un tournoi, des duels) :

1. `npm run logs` avec `LOGS_SINCE` réglé sur le début de la session : on vérifie que tout se rejoue à l'identique et que l'audit est vide.
2. On lit le bilan. Un tournoi compte 15 combats, ce qui est **beaucoup trop peu pour juger l'équilibre** (un seul combat pèse 7 %). Il sert à repérer des situations, pas à mesurer des taux.
3. On relit en entier les traces signalées comme marquantes, et celles des combats que l'utilisateur a trouvés étranges.
4. Si une situation intrigue, on la mesure en grand avec `npm run balance` ou un essai ciblé, avant de conclure.

### Argumenter avec des chiffres

Quand on discute d'une compétence, d'un statut ou d'un équilibrage, on appuie **chaque affirmation sur une statistique constatée**, avec sa source et sa taille d'échantillon :

- **le taux de victoire et sa marge**, plutôt que « il est fort » : « Brokk gagne 53,0 % ± 1,9 de ses combats (400 par duel) » ;
- **la valeur nette** d'une compétence, plutôt que « elle sert peu » : « les Épines valaient +1,7 point chez Grimbald » ;
- **l'apport mesuré** d'un statut : « 6,4 dégâts renvoyés par combat » ;
- **la cause** d'un écart : « un d8 perd 3 jets sur 8 depuis que 1 à 3 ne frappent plus, contre 3 sur 10 pour un d10 » ;
- **l'avant et l'après** de chaque réglage, avec le levier utilisé ;
- **ce que les chiffres ne disent pas**, honnêtement : bruit, petit échantillon, plaisir de jeu non mesuré.

Une proposition d'équilibrage arrive avec ses essais : les pistes comparées, leurs résultats et la raison du choix. L'utilisateur trouve ces chiffres utiles : on les donne systématiquement, sans attendre qu'il les demande.

**Une piste se mesure avant d'être proposée** (leçon de la 0.35.2). Luciole valait −2,4 points, et « +2 dégâts » a été suggéré sans mesure. Une fois appliqué, ce réglage a poussé le druide à 53 %, et il a fallu reprendre 2 points de critique. Or le druide était déjà à 48-49 % : renforcer une de ses compétences le déséquilibrait forcément. Deux règles en découlent :
- **Juger le personnage, pas la compétence seule.** Une valeur nette négative n'est pas un défaut si le personnage est dans la tolérance. C'est un choix de design (une compétence de saveur, un coût), pas un bug d'équilibre.
- **Proposer le couple complet.** Chaque piste arrive mesurée, avec sa compensation : « Luciole à +2 donne +3 points au druide ; pour rester à 50 %, son critique passe de 10 à 8 %. » On ne suggère jamais un renforcement seul pour un personnage déjà équilibré.

---

## 5. Les leviers, par ordre de préférence

| Ordre | Levier | Exemples | Pourquoi à ce rang |
| --- | --- | --- | --- |
| 1 | **Valeur d'une compétence ou d'un statut** | soin de Rage du sang, points de Peau de pierre, charges du poison | Agit sur ce qui fait le personnage, sans changer qui il est. |
| 2 | **Règle d'un statut non fixée par l'utilisateur** | cumul d'une aura, plafond de charges, durée, consommation | Change la dynamique du combat, souvent avec élégance (une aura cumulable récompense la durée). |
| 3 | **Stats secondaires** | chance de critique, multiplicateur, esquive | Affine sans toucher à l'endurance. |
| 4 | **Dé de dégâts** | d8 → d10 | Change beaucoup de choses à la fois, y compris la part des jets de compétence. |
| 5 | **PV** | ±2 à 4 | En dernier, et par petites touches. Les PV lissent tout, mais ils effacent les différences. |

**Ce qu'on ne touche pas sans demander** : les mécaniques et les valeurs que l'utilisateur a fixées lui-même, par exemple « 4 d'épines », « +2 dégâts par charge » ou « 1 PV par charge de poison ». Si l'une d'elles pose problème (valeur nette presque nulle, ou écrasante), on le **signale** avec une proposition chiffrée, et on attend sa décision.

---

## 6. Les pièges

- **Le bruit.** Sur 400 combats, un duel a une marge d'erreur d'environ ±5 points, et un taux global d'environ ±2 (le rapport l'affiche). Un écart plus petit que la marge ne prouve rien. On confirme sur un gros échantillon avant de conclure.
- **Le hasard partagé.** Chaque combat a sa propre graine, tirée du duel et de son numéro (`hashSeed`). Deux essais qui ne changent qu'un personnage rejouent donc le même hasard : leurs écarts viennent du réglage, pas des dés. Avant la 0.28.0, toutes les simulations tiraient dans une seule suite. Un PV de plus déplaçait alors tous les tirages suivants, ce qui produisait des écarts trompeurs (Gorak passait de 50 à 46,5 % pour un seul PV).
- **Les deux points de vue d'un duel.** Le combat k d'un duel doit être le même, qu'on le lise du côté de l'un ou de l'autre (`duelFight`). Sinon, la matrice n'est pas symétrique : Gorak battait Murzug à 49 %, et Murzug battait Gorak à 46 %. Ce défaut de la première version de l'outil, corrigé en 0.28.0, a montré que Grimbald était en réalité plus bas que mesuré.
- **Le surapprentissage.** Régler pour passer le test sur une seule graine peut coller à l'échantillon plus qu'au jeu. D'où l'étape de confirmation.
- **Les mesures biaisées.** « Taux de victoire quand la compétence s'est déclenchée » est trompeur : une compétence ne se déclenche que sur un coup perdu (1 à 3), et les combats où elle ne se déclenche pas sont les plus courts. Seul le contrefactuel (valeur nette) isole son effet.
- **Le levier unique.** Tout rattraper par les PV équilibre le chiffre et abîme le jeu. Voir § 5.
- **Le chiffre seul.** Une simulation ne mesure ni le plaisir, ni la lisibilité, ni la durée ressentie. On regarde aussi la durée des combats et on lit quelques traces.

---

## 7. Journal des équilibrages

| Version | Changement de gameplay | Constat de la simulation | Décision |
| --- | --- | --- | --- |
| 0.24.1 | Armure passive des nains retirée | Brokk à 18 %, Grimbald à 35 % : l'armure plate portait les nains. | PV seulement : Brokk 72, Grimbald 59. |
| 0.25.0 | Compétences du 2 | Vol de vie sacrifie son coup : morts-vivants à 43,5 %. | PV : Ervald 60, Caldrec 58 ; nains 74 et 63. |
| 0.26.0 | Auras du 3 | L'Aura de puissance cumulable porte les orcs à 54,7 %. La précision non cumulable laisse les elfes à 45 %. | PV : orcs −2, elfes +3, Caldrec 60. |
| 0.27.0 | Jets de 1 à 3 sans dégâts | Un d8 perd 3 coups sur 8, un d10 3 sur 10 : Brokk à 37,6 %, Caldrec à 59 %. | PV : Brokk **83**. Équilibré, mais Brokk n'est plus qu'un sac de PV aux combats de 32 tours. Jugé réducteur par l'utilisateur. |
| **0.28.0** | **Méthode refondue** (ce document, `analysis.ts`) | Avec des PV d'identité, Brokk tombe à 27 %. Valeurs nettes : Épines +1 à +5 points, Vol de vie +3 à +5 (presque nulles) ; Poison +18 ; Œil de faucon de Sylwen +19. | Leviers de compétence : **Aura d'intimidation et Aura de précision cumulables** (−2 dégâts et +1 au multiplicateur par charge, comme la puissance et le poison) ; **Peau de pierre +4 → +6** ; **Rage du sang 5 → 3 PV**. PV ramenés près de l'identité : Brokk 68 (au lieu de 83), Grimbald 57, Elaria 48, Sylwen 50, Ervald 58, Caldrec 56. Grimbald, à 45,9 % une fois la mesure corrigée, gagne des critiques plutôt que des PV (8 → 10 %, son identité de briseur) : à 12 %, il montait à 53 %, ce levier est très sensible avec un ×2,5. Résultat sur 1 000 combats par duel : de **47,4 à 51,8 %**, pire duel Ervald contre Murzug (42/58). |

| 0.29.0 | Épines à 6 et à chaque coup encaissé ; Vol de vie sans durée (décisions de l'utilisateur) | Épines : +9,5 points pour Brokk (+3,6 auparavant). Vol de vie : +5. Brokk monte à 53 % et bat les orcs à 57-58 %, parce que ses épines punissent les deux coups de la Furie. De 48,0 à 53,0 %, pire duel 58/42. | **Aucun réglage** : on reste dans la zone de confort, et l'écart vient d'une interaction voulue (rafale contre épines). C'est le genre de déséquilibre typé qu'on garde. |

| 0.30.0 | Deux races : Humains (prêtresse) et Hommes-lézards (voleuse) | Avec un d6, Ysolde gagne 63 % de ses combats, qui durent 52 tours : l'Aura de sainteté vaut +57 points. Avec un d8, Naraxes gagne 33,5 %. Pile ou face a une valeur négative (−6 points), et Coup de chance presque nulle (+2, un d3 ne frappe jamais). | Ysolde passe au **d7** (le dé était à mon choix) avec 52 PV ; Bérengère garde un d7, se distingue par 16 % de critique et 50 PV. Naraxes passe au **d10** (+14 points) avec 20 % d'esquive, et le poison de la décoction dure **4 tours** au lieu de 3. Résultat : de 46,6 à 53,1 % sur les 12 personnages. **Contre connu** : Brokk contre les prêtresses, 28/72 (question ouverte ci-dessous). |

| 0.31.0 | Aldric, le paladin | Avec 10 % de critique ×2, Brokk le battait à 75 % (intimidation contre coups moyens, jauges peu remplies). Avec un d10 : 58,6 % au global. Valeurs nettes : Rétribution +34 points, Riposte +1,4, Aura d'immunité −1,7. | Critiques lourds (15 % ×2,5) avec 60 PV : 54,8 %. Ssythra contre Aldric (34/66, de justesse) rejoint les contres connus. |
| 0.32.0 | Gauvain, variante d'Aldric | Essais : 54 PV, 22 % de critique et 5 % d'esquive donnent 50,6 % ; 54 PV, 20 % de critique et 10 % d'esquive donnent 52,1 %. Aldric à 55,2 %. Brokk contre Gauvain : 64-67 % selon l'échantillon. | Retenu : 54 PV, 10 % d'esquive, 20 % de critique, soit 51,0 %. Brokk contre Gauvain rejoint les contres connus. |
| 0.32.0 | Riposte réparée : sans durée, elle n'est plus perdue sur un jet de 1 à 3 adverse | Riposte de +1,2 à +3,3 points. Aldric à 57,3 %, contre Sylwen 66,8 %. Gauvain contre Naraxes 66,3 %. Avec un critique à 13 %, Sylwen gagne 35,0 % : encore à la limite. | Critique d'Aldric de **15 à 12 %** (Gauvain à 17 %) : 55,0 % et 50,8 %, pires duels 64,8 % (hors contre connu Aldric contre Ssythra à 67,3 %). |

| 0.35.0 | Deux familles : ogre (aucune compétence, d14) et druide (deux formes) | Avec 8 % de critique et 66 PV, Morgrut gagnait 63,2 % et Gnashka 66,6 %, avec des duels jusqu'à 74/26. Essais sur Morgrut (200 combats par duel) : d12, 45,9 % ; sans critique, 57,3 % ; sans critique avec 64 PV, 54,0 % ; avec 62 PV, 51,0 %. Le druide était déjà à 46-48 %. | Morgrut **sans critique, 63 PV** : 51,7 %. Le d14 de l'utilisateur est gardé. Gnashka : d12, 70 PV, 10 % de critique, soit 52,5 %. Thaldrin 48,0 %, Brannoc 49,4 %. **Contre connu** : Brannoc contre les prêtresses (65,5 % et 66 %), car la Pourriture, sans durée, use leurs soins. |
| 0.36.4 | **Poison à une seule valeur** (demande de l'utilisateur) : dégâts et durée à la fois, une charge perdue par tour (3, 2, 1) | Avant (200 combats par duel) : Ervald 47,4 %, Caldrec 51,9 %, Naraxes 47,4 %, Ssythra 46,2 %. Souffle de la tombe 2 × 3 tours → **3** (mêmes 6 PV, plus tôt). Aura de décoction, mesuré sur 1 000 combats par duel : 1 charge par coup → Naraxes 38,2 %, Ssythra 39,4 % (hors tolérance) ; **2** → Ervald 48,4 %, Caldrec 52,0 %, Naraxes 48,3 %, Ssythra 47,7 % ; 3 → Naraxes 54,6 %, Ssythra 53,4 %, Bérengère contre Ssythra 30,6 %. | Décoction à **2 charges** de poison par coup et par charge d'aura (`DECOCTION_POISON`). Ssythra contre Bérengère à 63,7 % sur 1 000 combats (61 à 64 % avant), mais 65,0 % pile dans le test à 300 : ajouté aux **contres connus** (décision de l'utilisateur). |
| 0.35.2 | Luciole : +2 dégâts par coup encaissé (décision de l'utilisateur) | Luciole de −1,3 à +2,9 points. Thaldrin 53,1 %, Brannoc 53,6 % ; contre les prêtresses : Thaldrin 65,3 et 68,0 %, Brannoc 68,5 et 70,5 %. Essais (400 combats par duel) : +1 → Thaldrin 66,0 % contre Bérengère ; 2 charges → 66,8 % ; critique −4 points → 64,0 %, mais Aldric bat Thaldrin à 65,0 % (son immunité bloque Luciole). | Critique du druide **de 10 à 8 %** (Brannoc 12 %) : Thaldrin 51,4 %, Brannoc 52,2 %. Thaldrin contre Bérengère reste à la limite (64-66 % selon l'échantillon). |
| 0.35.1 | Luciole pose 3 charges au lieu d'une (décision de l'utilisateur) | Valeur nette de −2,4 à −1,3 (Thaldrin), de −2,0 à −0,8 (Brannoc). Thaldrin 49,1 %, Brannoc 50,6 %. Pires duels inchangés : Brannoc contre Ysolde 65,3 % et contre Bérengère 66,5 %, déjà contres connus. | Aucun autre réglage. |

### Questions ouvertes (à trancher par l'utilisateur)

- **Voleuse contre l'inquisitrice** (0.36.4) : Ssythra bat Bérengère à 63,7 % (1 000 combats par duel), 65 % dans le test à 300 ; ajouté aux contres connus. Même famille que les autres contres des prêtresses : leurs soins lents ne suivent pas les dégâts sur la durée.
- **Druide contre les prêtresses** (0.35.2) : Thaldrin bat Bérengère à 64-66 %, à la limite, comme Brannoc (contre connu). Même cause : la Pourriture, sans durée, use leurs soins. Pistes : ajouter Thaldrin aux contres connus ; ou une Pourriture plafonnée (par exemple 4 charges).
- **Fleur de vie** (+0,2 à +0,7) : 3 PV pour un coup sacrifié. Piste : 5 PV, ou 3 PV et 1 charge d'Écorce.

- **Brokk contre les prêtresses (28/72 et 29/71, toléré à titre provisoire dans `balance.test.ts`)**. Sans Aura de sainteté, Ysolde ne gagne que 0,7 % de ses combats contre Brokk : l'intimidation ramène ses coups à 1 dégât. Avec l'aura, elle en gagne 73 %, parce que Brokk inflige environ 3,3 dégâts par tour, moins que le soin cumulé. Plafonner l'aura à 3 charges ne change rien (27 %). Le soin à 1 PV par charge s'effondre (prêtresses à 26 %). Pistes : un soin qui ne se cumule plus au-delà de 2 charges mais vaut 3 PV par charge ; ou une Peur qui ne touche pas un adversaire qui a déjà perdu son tour précédent. À mesurer avant de décider.
- **Riposte** (+3,8 points depuis la correction 0.32.0) et **Aura d'immunité** (−2,1) chez Aldric : la riposte renvoie 4,0 PV par combat, et peu d'adversaires posent des malus, alors que le 3 sacrifie son coup. Pistes : une riposte à 100 %, ou une riposte qui remplit aussi une jauge de rétribution ; une immunité qui soigne des malus purgés.
- **Ssythra contre Aldric (34/66)** : toléré comme contre connu, cause non isolée (critiques lourds et riposte contre ses 48 PV). À mesurer.
- **Pile ou face** (valeur nette d'environ −5 points) : la pièce rapporte 7,1 dégâts en moyenne, plus qu'un coup (3,5), mais elle ne déclenche pas l'Aura de décoction et coûte un jet de dé. Piste : la pièce déclenche aussi `hit` sur pile, donc le poison de la décoction.
- **Coup de chance** (de +1 à +3 points) : le d3 ne frappe jamais. Pistes : un d4, dont le 4 frappe ; ou un d3 qui frappe pour sa valeur sans déclencher de compétence.

**Principe retenu (0.29.0)** : on favorise les **interactions surprenantes** entre compétences, comme les épines contre une rafale. Un duel qui penche à cause d'une telle interaction est une qualité du roster, pas un défaut, tant qu'il reste dans la tolérance.
