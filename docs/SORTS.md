# Sorts : brainstorm et laboratoire

_Document de travail, octobre 2026. Suite de [FAMILLES.md](FAMILLES.md). Rien de ce qui est ici n'est livré au jeu : ce sont des idées, et un outil pour les essayer._

**Principe de départ (décision de l'utilisateur) : un personnage est un personnage précis, pas une race.** Gorak et Murzug ne sont pas « deux orcs », mais deux combattants qui peuvent avoir chacun leur sort. Une idée s'essaie donc sur un seul personnage : une idée pour Thaldrin ne touche pas Brannoc.

---

## 1. Ce qui rend un sort agréable à regarder

1. **On le voit venir** : une charge prête à servir, une jauge, un compte à rebours. Le spectateur attend le moment ; la Rétribution marche pour cette raison.
2. **Il croise le sort d'un autre** : Épines contre Furie des vents. Les meilleurs sorts réagissent à ce que fait l'adversaire.
3. **Il retourne la situation** : un combattant sous la moitié de ses PV qui reprend le dessus.
4. **Il fait monter la tension**, puis termine le combat.
5. **On voit ses chances** : un pari est passionnant quand on en connaît les chances et l'enjeu.

## 2. Les schémas de sorts

| Schéma | Principe | Testable aujourd'hui ? |
| --- | --- | --- |
| **Accumuler** | une réserve qui grossit, puis paie | oui (statut d'essai cumulable) ; la phase « relâcher » existe pour la Rétribution seulement |
| **Paliers** | à N charges, l'effet change | en partie (`when: hasStatus` avec `stacks`) ; une vraie transformation demande le moteur |
| **Pont entre familles** | un effet d'une famille en nourrit une autre | oui (déclencheurs `hit`, `crit`, `dodge`, `missed`, `hurt`) |
| **Retournement** | sous la moitié de ses PV, quelque chose arrive | oui (`bloodied`, `hpBelow`) |
| **Contre ciblé** | une réponse précise à une famille | oui, avec les malus inutilisés (Vulnérable, Affaibli, Brûlure, Garde sacrée) |
| **Vol** | prendre le bonus de l'adversaire | à moitié : on peut le lui retirer (`cleanse`), pas encore le garder |
| **Miroir** | rejouer la dernière compétence adverse | non : moteur |
| **Agir sur le dé adverse** | Sabotage, Malédiction, faces modifiées | non : moteur. C'est la piste propre à Battler |
| **Prophétie** | annoncer un chiffre ; si l'adversaire le fait, il paie | non : moteur |
| **Compte à rebours** | dans 3 tours, 12 dégâts, sauf purification | non : il manque un effet « à l'expiration » |
| **Escalade** | chaque utilisation est plus forte | en partie (statut cumulable) |
| **Payer de sa vie** | sacrifier des PV contre de la puissance | oui (`damage` sur soi, puis un statut) |
| **Écho** | l'effet revient, affaibli | non : moteur |

## 3. La grille de tri

On garde une idée si elle obtient au moins cinq oui :
1. Elle se dit en une phrase.
2. On la voit avant, pendant ou après qu'elle agit.
3. Elle interagit avec au moins deux autres familles.
4. Elle crée un moment, au moins une fois par combat en moyenne.
5. Elle n'utilise que des briques existantes, ou un seul ajout partagé.
6. Elle colle à la signature du personnage.
7. Sa valeur est bornée : elle influence le combat sans le décider.

Le laboratoire mesure les points 4 et 7. Les autres relèvent du jugement.

---

## 4. Le laboratoire

### Lancer

```
npx vitest run --config vitest.balance.config.ts scripts/lab.report.ts --silent=false
LAB_N=400 LAB_ONLY=sylwen-second-tir,naraxes-main-leste npx vitest run --config vitest.balance.config.ts scripts/lab.report.ts --silent=false
```

`LAB_N` fixe le nombre de combats par duel (200 par défaut ; 300 prennent une quinzaine de secondes pour les 17 idées). `LAB_ONLY` limite le rapport à certaines idées, `LAB_SERIES=2` à une série. Le rapport s'affiche et s'écrit dans `logs/lab/`. Je n'ai pas ajouté de raccourci `npm run lab`, pour ne pas toucher à `package.json` pendant que l'agent des sons y travaille ; on pourra l'ajouter ensuite.

### Fichiers

- `scripts/lab/ideas.ts` : les idées, une fiche chacune. Une idée a un id, le personnage visé, un nom, un schéma, une famille, la phrase en jeu, la modification à appliquer (`add` ajoute des compétences, `replace` en remplace une), et ce qu'il faut compter (`watch`). Elle peut aussi déclarer des **statuts d'essai**, construits avec les crochets existants. Ils ne sont ajoutés au registre que le temps du laboratoire, sans modifier `statuses.ts`.
- `scripts/lab/spectacle.ts` : les mesures de spectacle.
- `scripts/lab.report.ts` : le banc d'essai.

### Ce que mesure le rapport

Le personnage modifié affronte les 17 autres, **sur les mêmes graines que `npm run balance`**, avant et après. Seule l'idée change, donc l'écart est mesuré avec peu de bruit.

| Colonne | Sens |
| --- | --- |
| Victoires, Δ | taux de victoire avant → après ; écart apparié combat par combat, avec sa marge à 95 % |
| Pire duel après | le duel le plus déséquilibré une fois l'idée appliquée, avec sa valeur avant |
| Tours | durée moyenne |
| Meneur | combien de fois la tête change de camp par combat (selon la part de PV restants) |
| Retours | part des combats où le vainqueur est passé sous 30 % de ses PV |
| Fins serrées | part des combats où le vainqueur finit sous 20 % de ses PV |
| Moments | déclenchements de l'idée par combat, et part des combats où on la voit au moins une fois |
| Verdict | hors budget (hors de 42-58 %), duel extrême (au-delà de 65/35, marge déduite), effet non significatif, rare à l'écran (moins d'un combat sur trois), AUDIT |

Chaque combat passe aussi par **l'audit de résolution** (`audit.ts`). Une idée qui produit une chronologie incohérente est signalée.

### Limites de l'outil

- **Une idée ajoutée est un bonus pur.** Le Δ mesure donc d'abord sa puissance. Pour juger une idée à puissance égale, il faut l'essayer avec sa compensation : retirer une autre compétence, ou réduire une valeur. La fiche le permet déjà (la fonction `apply` peut tout changer), mais aucune idée ne le fait encore.
- **Seules les briques existantes sont testables.** Les schémas marqués « moteur » au § 2 demandent d'abord du code dans `combat.ts`.
- **La mesure « Meneur » ne compte que les vrais retournements** : il faut prendre 15 points de part de PV d'avance pour devenir meneur. Avant ce réglage, elle comptait les petits écarts du début de combat et ne bougeait presque pas. Elle reste peu sensible : elle suit surtout la durée des combats (environ 0,4 retournement par combat, 0,6 pour les prêtresses, dont les combats sont longs).
- **Le son et le rendu ne sont pas mesurés** : un moment fréquent n'est pas forcément un moment lisible.

---

## 5. Premiers essais (17 idées, 300 combats par duel, règles 0.36.2)

Chaque idée a été **ajoutée** au kit actuel, sans compensation. Les chiffres disent donc combien elle apporte, et ce qu'elle fait au spectacle.

| Idée | Personnage | Schéma | Victoires | Δ | Pire duel après | Retours | Fins serrées | Moments |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Colère : chaque coup encaissé, +1 dégât (5 au plus) | Gorak | Accumuler | 49,3 → 79,0 % | +29,8 ± 1,3 | Brokk 38 → 89 % | 62 → 50 % | 42 → 31 % | 5,0 (100 %) |
| Contre-tir : il esquive, son prochain coup critique | Elaria | Pont | 49,3 → 69,1 % | +19,8 ± 1,4 | Brokk 49 → 77 % | 51 → 43 % | 32 → 26 % | 2,6 (93 %) |
| Ivresse du sang : chaque critique donne une Furie | Murzug | Pont | 50,0 → 60,5 % | +10,4 ± 1,2 | Bérengère 58 → 71 % | 60 → 54 % | 39 → 35 % | 1,0 (67 %) |
| Tenir la porte : sous la moitié, +1 intimidation | Brokk | Retournement | 51,7 → 61,7 % | +10,0 ± 0,8 | Morgrut 62 → 80 % | 60 → 59 % | 39 → 37 % | 0,9 (94 %) |
| Moisson : chaque critique empoisonne (2 × 3) | Caldrec | Pont | 51,6 → 61,1 % | +9,5 ± 0,8 | Ysolde 57 → 68 % | 59 → 53 % | 40 → 35 % | 0,8 (61 %) |
| Jugement : encaissé, 1 chance sur 7 de Peur | Ysolde | Contre | 48,2 → 56,2 % | +8,0 ± 1,6 | Brokk 73 → 84 % | 39 → 40 % | 16 → 16 % | 1,3 (70 %) |
| Second tir : esquivée, le prochain coup critique | Sylwen | Retournement | 49,0 → 56,4 % | +7,4 ± 0,9 | Elaria 51 → 73 % | 51 → 52 % | 33 → 33 % | 0,6 (40 %) |
| Bûcher : chaque critique, Brûlure 3 × 2 | Bérengère | Pont | 46,6 → 53,0 % | +6,5 ± 0,7 | Brokk 70 → 75 % | 38 → 41 % | 17 → 19 % | 1,1 (71 %) |
| Peau de roche : encaissé, 1 sur 5, +3 d'armure temporaire | Gnashka | Accumuler | 52,6 → 58,4 % | +5,7 ± 1,7 | Ssythra 61 → 64 % | 57 → 55 % | 38 → 37 % | 1,3 (74 %) |
| Main leste : elle esquive, l'adversaire perd son dernier bonus | Naraxes | Vol | 47,3 → 52,5 % | +5,2 ± 0,6 | **Bérengère 56 → 78 %** | 52 → 51 % | 33 → 33 % | 1,3 (70 %) |
| Élan du croisé : chaque critique arme une Riposte | Gauvain | Pont | 50,1 → 54,1 % | +4,0 ± 0,5 | Naraxes 62 → 65 % | 60 → 59 % | 39 → 38 % | 0,7 (56 %) |
| Étreinte glacée : touche un empoisonné, +2 PV | Ervald | Pont | 47,6 → 51,3 % | +3,7 ± 0,5 | Ysolde 40 → 40 % | 62 → 60 % | 40 → 38 % | 1,2 (60 %) |
| Morsure : touche à 2 poisons ou plus, +3 dégâts | Ssythra | Paliers | 46,1 → 50,5 % | +4,4 ± 0,6 | Ysolde 61 → 68 % | 52 → 51 % | 32 → 32 % | 0,9 (41 %) |
| Brise-fer : touche, 1 sur 4, Vulnérable 2 tours | Grimbald | Contre | 51,3 → 54,2 % | +2,8 ± 1,8 | Morgrut 59 → 61 % | 59 → 59 % | 39 → 39 % | 1,6 (80 %) |
| Fleur qui s'ouvre : Fleur de vie devient Régénération 2 × 3 | Thaldrin | Retouche | 50,6 → 52,9 % | +2,4 ± 0,4 | Bérengère 64 → 65 % | 60 → 60 % | 41 → 41 % | 1,6 (39 %) |
| Serment : début du combat, 2 Gardes sacrées | Aldric | Contre | 54,6 → 56,6 % | +2,1 ± 0,5 | Ssythra 67 → 70 % | 59 → 58 % | 39 → 38 % | 1,0 (100 %) |
| Feuilles mortes : touche à 2 Pourritures ou plus, Affaibli | Brannoc | Paliers | 52,2 → 53,1 % | +0,9 ± 0,3 | Bérengère 68 → 68 % | 59 → 58 % | 40 → 39 % | 0,6 (24 %) |

L'audit n'a relevé aucune anomalie. Morsure et Feuilles mortes ont été remesurées avec un seuil de 2 charges au lieu de 3 : à 3 charges, elles n'agissaient que dans 30 % et 19 % des combats.

### Ce qu'on en apprend

1. **La puissance tue le spectacle.** Les idées les plus fortes font baisser les retours et les fins serrées : Colère passe de 62 à 50 % de retours, Contre-tir de 51 à 43 %. Un combattant trop fort gagne sans suspense. C'est le premier usage des mesures de spectacle : elles montrent qu'un sort « fort » n'est pas forcément un bon sort pour l'observateur.
2. **Les afflictions différées créent de la tension.** Bûcher est la seule idée qui fait **monter** à la fois les retours (+2,4 points) et les fins serrées (+2,6). Les dégâts qui arrivent en fin de tour laissent le combat se retourner jusqu'au bout. C'est une piste à creuser pour tout le roster.
3. **Les contres émergents apparaissent.** Main leste fait passer Naraxes de 56 à 78 % contre Bérengère : en esquivant, la voleuse retire l'Aura de sainteté, qui porte la prêtresse. Personne n'a écrit ce duel, c'est la rencontre de deux kits. C'est exactement le genre d'histoire qu'on veut voir en tournoi. Mais il faudra le borner, par exemple en interdisant de retirer une aura, ou en limitant Main leste à une fois par combat (`limit: 1`).
4. **Les déclencheurs « coup qui touche » et « critique » sont puissants.** Contre-tir, Ivresse et Moisson dépassent toutes +9 points. Les 22 % de critique d'Elaria et ses 33 % d'esquive en font une machine : un pont entre ses deux forces double son efficacité. Pour qu'elles tiennent dans le budget, ces idées devront remplacer une compétence existante plutôt que s'y ajouter.
5. **Les paliers sont trop rares, même abaissés.** À 2 charges au lieu de 3, Morsure passe de 30 à 41 % des combats, Feuilles mortes de 19 à 24 %. C'est mieux, mais encore peu visible. Il faudrait les déclencher sur la pose d'une charge plutôt qu'au toucher, ou les réserver à des personnages qui posent beaucoup de charges.
6. **La retouche de Fleur de vie marche, mais reste modeste** : +2,4 points par rapport à la Fleur de vie actuelle, sans effet sur le spectacle. Sa valeur nette passerait d'environ +0,2 à environ +2,6 points (mesure 0.35.0 plus l'écart mesuré ici, à confirmer par `npm run balance`). C'est mieux, mais elle reste la plus faible du druide.

### Les idées qui méritent une deuxième série

- **Second tir** (Sylwen) : +7,4 points, et le spectacle reste intact. C'est un vrai sort de personnage, fidèle à « la forêt ne pardonne pas deux fois ». À essayer en remplacement d'une partie de ses stats, par exemple moins de critique de base.
- **Bûcher** (Bérengère) : le meilleur effet sur le spectacle, dans le budget (53 %).
- **Main leste** (Naraxes) : le meilleur générateur d'histoires, à borner.
- **Étreinte glacée** (Ervald) et **Élan du croisé** (Gauvain) : petits, sûrs, et ils différencient chacun le personnage de sa variante (Caldrec, Aldric).
- **Colère** (Gorak), mais bridée : l'idée est bonne pour la lecture (une jauge qui monte), mais beaucoup trop forte. À essayer à 3 charges au plus, avec une perte de Colère quand il frappe.

---

## 5 bis. Deuxième série : à puissance égale (10 essais, 300 combats par duel)

Cette fois, chaque idée vient avec sa **compensation** : une compétence retirée, une valeur baissée, ou une limite d'usage. Une compétence retirée laisse son jet redevenir un coup normal. Mêmes graines que la première série, donc les colonnes « avant » sont identiques.

| Idée | Compensation | Victoires | Δ | Pire duel après | Retours | Fins serrées | Moments |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Colère bridée** (Gorak) | 1 coup sur 2, 3 charges au plus, retombe après 2 tours | 49,3 → 55,3 % | +6,0 ± 1,8 | Ssythra 57 → 62 % | 62 → 61 % | 42 → 41 % | 2,0 (88 %) |
| **Colère, sans Rage du sang** (Gorak) | la même, et Rage du sang retirée | 49,3 → 54,4 % | +5,1 ± 1,8 | Ysolde 47 → 61 % | 62 → 62 % | 42 → 42 % | 2,2 (91 %) |
| **Ivresse, sans Furie** (Murzug) | Furie des vents retirée de son 2 | 50,0 → 56,7 % | +6,6 ± 1,5 | Bérengère 58 → 69 % | 60 → 55 % | 39 → 34 % | 1,1 (70 %) |
| **Contre-tir, sans Œil de faucon** (Elaria) | 1 esquive sur 2, Œil de faucon retiré | 49,3 → 52,8 % | +3,5 ± 1,7 | Morgrut 55 → 64 % | 51 → 47 % | 32 → 29 % | 1,5 (77 %) |
| **Second tir, critique 13 %** (Sylwen) | critique de base 17 → 13 % | 49,0 → 53,4 % | +4,4 ± 1,0 | **Elaria 51 → 72 %** | 51 → 53 % | 33 → 34 % | 0,6 (41 %) |
| **Tenir la porte, Peau de pierre 4** (Brokk) | Peau de pierre +6 → +4 | 51,7 → 58,3 % | +6,6 ± 0,7 | **Morgrut 62 → 75 %** | 60 → 61 % | 39 → 38 % | 1,0 (95 %) |
| **Moisson, sans Souffle de la tombe** (Caldrec) | Souffle de la tombe retiré de son 1 | 51,6 → 53,5 % | +1,9 ± 1,3 | Ysolde 57 → 62 % | 59 → 53 % | 40 → 35 % | 0,9 (67 %) |
| **Bûcher 2** (Bérengère) | Brûlure 3 → 2 | 46,6 → 50,8 % | +4,2 ± 0,6 | Brokk 70 → 72 % | 38 → 40 % | 17 → 19 % | 1,2 (71 %) |
| **Main leste, une fois** (Naraxes) | une fois par combat | 47,3 → 51,0 % | +3,7 ± 0,5 | **Bérengère 56 → 73 %** | 52 → 52 % | 33 → 33 % | 0,7 (70 %) |
| **Élan du croisé, deux fois** (Gauvain) | deux fois par combat au plus | 50,1 → 53,9 % | +3,8 ± 0,5 | Naraxes 62 → 65 % | 60 → 59 % | 39 → 38 % | 0,7 (56 %) |

L'audit n'a relevé aucune anomalie.

### Ce qu'on en apprend

1. **Trois idées sont prêtes à être proposées comme compétences.**
   - **Bûcher 2** (Bérengère) : 50,8 %, et c'est la seule idée qui améliore le spectacle (+1,9 point de retours, +2,3 de fins serrées). Elle distingue enfin Bérengère d'Ysolde : « la lumière brûle ». Le duel contre Brokk (72 %) existait déjà avant (70 %).
   - **Colère bridée** (Gorak) : 55,3 %, le spectacle reste intact, et on la voit dans 88 % des combats. C'est la jauge qui monte quand on le frappe, sa signature (« un coup manqué ne fait que l'énerver »). Elle est encore un peu forte : on peut baisser la chance de 50 à 35 %.
   - **Élan du croisé** (Gauvain) : 53,9 %, sans effet sur le spectacle. Le limiter à deux fois ne change presque rien, parce qu'il critique rarement plus de deux fois par combat.
2. **Remplacer une compétence change l'identité, et pas seulement le chiffre.** Avec Ivresse à la place de la Furie, Murzug devient l'orc des critiques, et Gorak celui de la Furie. Avec Moisson à la place du Souffle, Caldrec empoisonne sur ses critiques, et Ervald sur ses jets ratés. Les variantes deviennent des personnages précis. Mais ces deux idées font baisser les retours de 5 à 7 points : elles raccourcissent les combats au profit du plus fort.
3. **Trois contres restent extrêmes malgré la compensation, et ce sont des histoires, pas des chiffres :**
   - **Sylwen contre Elaria (72 %)** : Elaria esquive un coup sur trois, et chaque esquive arme le Second tir de Sylwen. C'est un contre logique, mais trop fort.
   - **Brokk contre Morgrut (75 %)** : l'intimidation gagnée sous la moitié de ses PV rogne les gros coups de l'ogre. Baisser la Peau de pierre ne suffit pas, parce que ce n'est pas elle qui joue dans ce duel.
   - **Naraxes contre Bérengère (73 %)** : même une seule fois, retirer l'Aura de sainteté décide du combat. Le problème n'est pas la fréquence, mais la cible. Il faudrait que Main leste ne puisse pas retirer une aura, ce que la règle actuelle de `cleanse` ne permet pas : c'est un petit ajout au moteur (une option « sauf les auras »).
4. **L'Aura de sainteté reste le point sensible du roster.** Elle apparaît dans la moitié des pires duels des deux séries. Toute idée qui la retire ou la contourne fait basculer le duel. C'est un signal pour les reliques : celles qui touchent au Soin seront à mesurer d'abord contre les prêtresses.

---

## 6. Fiches par personnage

Une ou deux idées par personnage, choisies pour accentuer ce qui le distingue de son original ou de sa variante. **Essayée** : mesurée au § 5. **Testable** : faisable avec les briques actuelles, pas encore écrite dans `ideas.ts`. **Moteur** : il faut d'abord du code.

| Personnage | Signature | Idée | Schéma | État |
| --- | --- | --- | --- | --- |
| Gorak | le roc qu'un coup manqué énerve | Colère (bridée) : une jauge qui monte quand on le frappe | Accumuler | bridée : 55 %, spectacle intact, **à proposer** (chance à baisser) |
| Murzug | l'orc imprévisible | Ivresse du sang : un critique, une Furie | Pont | à la place de la Furie : 57 %, mais moins de retours |
| Murzug | | Saignée : sur un 1, il perd 4 PV au lieu d'en regagner 3, et gagne une Aura de puissance | Payer de sa vie | testable |
| Elaria | jamais là où l'on frappe | Contre-tir : une esquive, un critique | Pont | à la place d'Œil de faucon : 53 %, un peu moins de retours |
| Sylwen | patiente, qui ne pardonne pas | Second tir : esquivée, elle critique ensuite | Retournement | 53 % avec 13 % de critique, mais 72 % contre Elaria |
| Brokk | ne recule jamais | Tenir la porte : sous la moitié, il s'endurcit | Retournement | trop forte, même avec Peau de pierre 4 (58 %, 75 % contre Morgrut) |
| Grimbald | briser plutôt que parer | Brise-fer : ses coups rendent Vulnérable | Contre | essayée, faible et peu visible |
| Grimbald | | Brise-garde : son prochain coup après un critique ignore les boucliers | Contre | moteur |
| Ervald | ronger et durer | Étreinte glacée : il se nourrit du poison | Pont | essayée, sûre |
| Caldrec | lame spectrale | Moisson : un critique empoisonne | Pont | à la place du Souffle : 54 %, mais moins de retours |
| Ysolde | le soleil juge | Jugement : frappée, elle peut terrifier | Contre | essayée, aggrave le duel contre Brokk |
| Ysolde | | Prophétie : elle annonce un chiffre ; si l'adversaire le fait, il perd son tour | Prophétie | moteur |
| Bérengère | la lumière brûle | Bûcher : ses critiques enflamment | Pont | Brûlure 2 : 51 %, meilleur spectacle, **à proposer** |
| Bérengère | | Sentence : une condamnation qui tombe dans 3 tours, sauf purification | Compte à rebours | moteur |
| Naraxes | pile, je gagne | Main leste : en esquivant, elle subtilise un bonus | Vol | une fois : 51 %, mais 73 % contre Bérengère ; il faut épargner les auras (moteur) |
| Naraxes | | Coup de chance : deux dés, elle garde le meilleur (FAMILLES.md § 6.1 A) | Fortune | moteur |
| Ssythra | une seule morsure | Morsure : bonus contre un empoisonné, seuil à 2 charges | Paliers | à 2 charges : 51 %, encore peu visible (41 %) |
| Aldric | chaque coup reçu est une dette | Serment : deux Gardes sacrées en début de combat | Contre | essayée, faible |
| Aldric | | L'immunité renvoie : chaque malus bloqué remplit une jauge de Rétribution (FAMILLES.md § 6.4 B) | Pont | moteur |
| Gauvain | la foi tranche plus vite | Élan du croisé : un critique arme une Riposte | Pont | 54 %, sûre, **à proposer** |
| Morgrut | taper, attendre | aucune : il reste nu, c'est le **témoin** des essais | — | — |
| Gnashka | plus grise, plus dure | Peau de roche : encaisser la durcit | Accumuler | essayée, un peu forte |
| Thaldrin | soigner, puis déchirer | Fleur qui s'ouvre : un soin qui dure d'une forme à l'autre | Retouche | essayée, modeste |
| Thaldrin | | Écho : sa compétence se rejoue à moitié dans l'autre forme | Écho | moteur |
| Brannoc | les feuilles tombent | Feuilles mortes : la Pourriture affaiblit, seuil à 2 charges | Paliers | à 2 charges : encore trop rare (24 %) |

---

## 7. Suite proposée

1. **Proposer les trois idées prêtes** (§ 5 bis) : Bûcher 2 pour Bérengère, Colère bridée pour Gorak, Élan du croisé pour Gauvain. Chacune demande ton accord, puis une livraison complète : icône peinte (à te demander), statut au registre pour la Colère, tests, rééquilibrage par `npm run balance`, mise à jour de PERSONNAGES.md.
2. **Ajouter les mesures de spectacle au rapport d'équilibre habituel** (`analysis.ts`), sans effet sur les règles.
3. **Le raccourci `npm run lab`**, une fois l'agent des sons terminé avec `package.json`.
4. **Un premier ajout au moteur, choisi pour ouvrir le plus de schémas** : je recommande **l'effet à l'expiration d'un statut**. Il ouvre le compte à rebours (Sentence), l'écho, et le relâchement d'une réserve en fin de durée, avec une seule règle nouvelle. Juste après viendrait **agir sur le dé adverse** (Sabotage, Prophétie), la piste la plus originale.
5. Rien de tout cela ne sera livré au jeu sans ton accord, compétence par compétence. Pour chaque compétence livrée : sa mesure, sa mise à jour de `PERSONNAGES.md`, et la procédure habituelle de version et de CHANGELOG.

---

## 8. L'audit des compétences : la grille des drapeaux rouges

Inspiré de la grille de Magic: The Gathering (New World Order) : une carte qui cumule trop de « drapeaux rouges » est revue avant d'être imprimée. Ici, l'outil passe **chaque compétence de chaque personnage** au crible, et classe celles qui méritent une retouche.

### Lancer

```
npx vitest run --config vitest.balance.config.ts scripts/skills.report.ts --silent=false
SKILLS_N=400 SKILLS_ONLY=naraxes,thaldrin npx vitest run --config vitest.balance.config.ts scripts/skills.report.ts --silent=false
SKILLS_PART=engrave SKILLS_ENGRAVE=cleave,coin-flip npx vitest run --config vitest.balance.config.ts scripts/skills.report.ts --silent=false
```

Une minute à 200 combats par duel, les deux tables (`SKILLS_PART=kit` ou `engrave` : une seule ; `SKILLS_ONLY` : ces personnages, et pour la seconde table leurs compétences ; `SKILLS_ENGRAVE` : ces gravures seulement). Le rapport s'écrit dans `logs/skills/`.

### La grille

**Drapeaux de jeu**, mesurés sur les mêmes graines que `npm run balance`. Chaque compétence est rejouée retirée : son jet redevient un coup normal.

| Drapeau | Seuil | Ce qu'il signale |
| --- | --- | --- |
| coûte des victoires | valeur nette négative, au-delà de la marge | la compétence fait perdre : son coup sacrifié vaut plus qu'elle |
| presque inutile | moins de +1 point | elle ne pèse rien |
| écrasante | plus de +20 points | elle décide trop souvent du combat |
| rare à l'écran | vue dans moins de 40 % des combats (20 % pour une compétence de forme du druide) | le spectateur ne la voit presque jamais |
| gâchée | plus de 25 % de déclenchements sans effet | soin à PV pleins, statut bloqué, purification à vide, charge perdue sans servir |
| sans enjeu | renverse moins de 3 % des combats | elle ne change presque jamais le vainqueur |

La colonne **Renversés** distingue deux cas de valeur nulle : une compétence qui renverse beaucoup de combats dans les deux sens est un pile ou face ; une compétence qui n'en renverse aucun ne pèse rien.

**Drapeaux de lecture**, tirés de la définition, sans simulation :

| Drapeau | Ce qu'il signale |
| --- | --- |
| texte long | description en jeu de plus de 140 caractères |
| effet différé | une charge à retenir, qui agit plus tard (prochain coup, prochaine action) |
| jet caché | un jet que le spectateur ne voit pas (Coup de griffe) |
| dépend de l'adversaire | son effet dépend de ce que porte l'autre (Purification) |
| crochet unique | une règle du moteur écrite pour ce seul statut : candidate à l'aplatissement (FAMILLES.md) |

Un drapeau de jeu compte double dans le classement. Les trois Attente de l'ogre sont exemptées : c'est un choix de design.

### La seconde table : la valeur d'une gravure (phase 5 ter, 0.107.0)

Ce que vaut un choix de forge : chaque compétence gravable est gravée sur la **face 3 nue de chaque hôte qui peut la recevoir** (la forge refuse une compétence de son kit et une face qui en porte une : le druide, dont le 3 porte la Foudre, n'en reçoit aucune ; la barde la porte sur ses deux dés). L'hôte gravé affronte les 9 autres personnages, sur les mêmes graines que `npm run balance`, avant → après : la valeur est l'écart apparié de son taux de victoire. La table donne la moyenne des hôtes, le plus mauvais et le meilleur, puis le détail hôte par hôte.

| Drapeau | Seuil | Ce qu'il signale |
| --- | --- | --- |
| hors bande (faible) | moyenne sous +8 points | une gravure qui ne pèse rien : on ne la choisit pas |
| hors bande (forte) | moyenne au-delà de +20 points | une gravure qui décide de la campagne : on ne choisit plus qu'elle |

Le repère de 8 à 20 points est celui des reliques (décision de l'utilisateur du 2026-10-24) : toute compétence gravable doit y entrer. La mesure jetable du § 19 (mesure 2) est devenue cette table.

### La troisième table : un rang de plus (0.110.0)

`SKILLS_PART=rank` (ou les trois tables par défaut). Chaque compétence gravée sur la face 3 nue de chaque hôte qui peut la recevoir, mêmes graines : rang I contre rang II (la gravure aiguisée une fois), puis rang II contre rang III, moyenne des hôtes, le plus mauvais et le meilleur ; dernière colonne, un rang de plus dans le kit de son porteur (toutes ses faces : la Foudre et les Feux follets du druide en ont trois). La colonne « Axe » est la ligne du rang (`rankText`).

| Drapeau | Seuil | Ce qu'il signale |
| --- | --- | --- |
| hors bande (faible) | rang II sous +3 points | un aiguisage qui ne pèse rien |
| hors bande (forte) | rang II au-delà de +8 points | un aiguisage qui vaut presque une gravure (« un rang ajoute moins », décision de l'utilisateur du 2026-10-24) |
| ne s'aiguise pas | aucun axe de rang | n'arrive plus : toute compétence du dé en déclare un (`validateRoster`) |

Trois minutes à 200 combats par duel. Mesures et réglage des axes : § 20.

### Premier audit (200 combats par duel, règles 0.36.4)

| Compétence | Personnage | Valeur nette | Renversés | Gâchis | Drapeaux de jeu |
| --- | --- | --- | --- | --- | --- |
| Pile ou face | Ssythra / Naraxes | −6,7 / −5,6 | 21-22 % | 0 % | coûte des victoires |
| Aura d'immunité | Gauvain / Aldric | −3,1 / −2,5 | 21-22 % | 0 % | coûte des victoires |
| Coup de chance | Ssythra | +0,7 | 19 % | 0 % | presque inutile |
| Écorce épaisse | Thaldrin | +0,4 | 11 % | 0 % | presque inutile |
| Fleur de vie | Thaldrin / Brannoc | +0,5 / +0,9 | 10-12 % | 16 % | presque inutile |
| Rage du sang | Murzug | +0,6 | 18 % | 9 % | presque inutile (Gorak : +2,0) |
| Esquive améliorée | Elaria / Sylwen | +6,7 / +7,5 | 22-23 % | **29-31 %** | gâchée |
| Purification | Bérengère / Ysolde | +8,0 / +8,4 | 23 % | **53-54 %** | gâchée |
| Rétribution | Gauvain / Aldric | +30,5 / +35,7 | 35-39 % | 17-19 % | écrasante |
| Aura de sainteté | Bérengère / Ysolde | +38,3 / +41,9 | 41-45 % | 0 % | écrasante |

Ce que l'audit révèle, au-delà des chiffres déjà connus :
- **L'Esquive améliorée se perd une fois sur trois.** Elle dure un tour : si l'adversaire sacrifie son coup (jet de 1 à 3) ou perd son tour, elle s'éteint sans servir. C'est le même défaut que la Riposte avant la 0.32.0.
- **La Purification tombe à vide une fois sur deux** : l'adversaire n'a souvent aucun bonus à retirer.
- **Murzug ne profite pas de Rage du sang** (+0,6 point, contre +2,0 pour Gorak) : il a moins de PV et frappe plus fort, donc 3 PV comptent moins pour lui.
- Aucune compétence n'est « sans enjeu » : toutes renversent au moins 10 % des combats.

## 9. Série 3 : une petite touche par compétence signalée (300 combats par duel)

Chaque touche **remplace** la compétence actuelle (et ne s'ajoute pas au kit). Le Δ se lit donc directement comme le gain apporté par la touche.

| Touche | Personnage | Victoires | Δ | Pire duel après | Retours | Fins serrées | Lecture |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Esquive améliorée sans durée** : elle attend le prochain coup reçu | Elaria | 49,0 → 52,6 % | +3,5 ± 0,8 | Gnashka 56 → 59 % | 51 → 51 % | 32 → 32 % | **une réparation**, comme la Riposte en 0.32.0 |
| **Coup de chance au d6** : le dé en plus frappe une fois sur deux, au lieu de jamais | Ssythra | 48,1 → 51,5 % | +3,5 ± 1,1 | Bérengère 65 → 68 % | 52 → 53 % | 32 → 34 % | **à retenir**, et le spectacle y gagne |
| **Pile ou face à 20** | Naraxes | 48,6 → 53,0 % | +4,4 ± 0,6 | Brokk 64 → 68 % | 52 → 52 % | 33 → 33 % | sa valeur nette remonte vers 0 (environ −1), mais le défaut de fond reste : la pièce ne « touche » pas |
| **Rage du sang à 5**, pour Murzug seul | Murzug | 49,7 → 52,9 % | +3,2 ± 0,5 | Ervald 56 → 61 % | 60 → 60 % | 40 → 39 % | **à retenir** : Murzug et Gorak se distinguent |
| **Écorce épaisse à 6** | Thaldrin | 50,2 → 52,1 % | +1,9 ± 0,4 | Bérengère 64 → 65 % | 61 → 60 % | 41 → 41 % | correct, mais reste modeste |
| **Purification double** : elle retire aussi son dernier malus | Ysolde | 47,9 → 48,9 % | +1,0 ± 0,3 | Brokk 73 → 73 % | 40 → 40 % | 16 → 16 % | trop faible : elle a rarement des malus |
| **Aura d'immunité et soin** (+4 PV) | Aldric | 54,3 → 62,8 % | +8,5 ± 0,8 | Thaldrin 64 → 74 % | 59 → 59 % | 39 → 37 % | trop forte : Aldric est déjà le premier du roster |
| **Rétribution à 2 jauges** | Aldric | 54,3 → 46,4 % | −7,9 ± 0,7 | Brokk 36 → 26 % | 59 → 61 % | 39 → 41 % | trop sévère, et c'est sa signature : à laisser |
| **Aura de sainteté plafonnée à 2 charges** | Ysolde | 47,9 → 38,5 % | −9,4 ± 0,8 | Brannoc 34 → 23 % | 40 → **44 %** | 16 → **22 %** | trop sévère en l'état, mais c'est **le plus gros gain de spectacle mesuré** |

### Ce qu'on en apprend

1. **Quatre touches sont prêtes à être proposées** (livrées en 0.36.5, l'Écorce à 5 au lieu de 6 pour rester dans le budget contre Bérengère) : l'Esquive améliorée sans durée (une réparation), le Coup de chance au d6, Rage du sang à 5 pour Murzug, et l'Écorce épaisse à 6. Chacune rapporte de 2 à 3,5 points, sans rien abîmer.
2. **L'Aura de sainteté écrase aussi le spectacle.** Avec un plafond de 2 charges, les retours passent de 40 à 44 % et les fins serrées de 16 à 22 %. Ses soins qui s'empilent rendent les combats des prêtresses longs et joués d'avance. Le plafond seul coûte trop cher à Ysolde (−9,4 points). Il faudra l'essayer avec une compensation : un plafond à 3, ou un plafond avec plus de soin par charge.
3. **Pour l'Aura d'immunité, aucune petite touche ne suffit.** Ajouter du soin la rend trop forte, parce qu'Aldric est déjà en tête. Le vrai problème reste qu'il y a peu de malus dans le roster (FAMILLES.md § 6.4).
4. **Pile ou face demande une vraie règle**, pas un chiffre : tant que la pièce ne « touche » pas, elle ne déclenche pas l'Aura de décoction. C'est l'option A de FAMILLES.md § 6.2, qui demande un ajout au moteur.

### Limites

- ~~L'audit de résolution connaît le Pile ou face par son nom~~ : il lit la pièce dans le registre depuis la 0.42.0.
- **La perte des charges n'est mesurée que pour les statuts à durée.** Un Vol de vie perdu sur une esquive n'est pas compté.
- **Les seuils de la grille se discutent** : ce sont des signaux, pas des verdicts.

## 10. Série 4 : les six compétences signalées, d'un coup (0.42.0)

L'audit relancé sur les règles 0.39.1 (300 combats par duel) signalait six compétences : Pile ou face (coûte des victoires), Aura d'immunité (coûte des victoires), Purification (gâchée), Aura de sainteté et Rétribution (écrasantes), Fleur de vie (presque inutile). Les quatre touches de la 0.36.5 avaient fait leur travail (Esquive améliorée sans gâchis, Coup de chance à +3,9, Rage du sang de Murzug à +3,9).

### Méthode

1. **Laboratoire, série 4** (`LAB_SERIES=4`, 300 combats par duel) : plus de 50 essais, chaque idée déclinée pour les deux personnages qui partagent la compétence. Touches seules, puis kits compensés, puis réglages.
2 bis. **Premier retour de l'utilisateur** : la face qui frappe est refusée (elle efface la dualité nette du pile ou face et sa mise en scène sonore), le bouclier de l'immunité jugé peu clair, la Rétribution à laisser. Second tour sur ces deux compétences.
2. **Intégration, puis équilibre du roster entier** : le laboratoire ne change qu'un personnage à la fois ; une fois tout intégré, les adversaires ont bougé aussi. Les prêtresses, à +0,5 et +1,6 au laboratoire, retombaient à 46 % une fois les voleuses, Gauvain et les druides renforcés. Mesure finale : `npm run balance` à 400 combats par duel, avant et après sur les mêmes graines.
3. **Audit relancé** sur les règles retenues.

### Ce que le laboratoire a montré

| Piste | Personnages | Δ | Lecture |
| --- | --- | --- | --- |
| Pile qui touche (décoction) | Naraxes / Ssythra | +0,8 / +0,9 | ne suffit pas seule |
| Face qui frappe | Naraxes / Ssythra | +4,7 / +4,2 | la vraie réparation |
| Les deux, pile à 15 | Naraxes / Ssythra | +5,5 / +5,1 | refusée : face ne doit rien faire |
| Pile à 20 (face vide) | Naraxes / Ssythra | +4,3 / +3,9 | valeur nette d'environ −0,3 |
| Pile qui touche à 18 / 20 / 22 (face vide) | Naraxes | +3,3 / +4,8 / +6,1 | **20 retenue** (choix de l'utilisateur) |
| Les deux, pile à 18 ou 20 | Naraxes / Ssythra | +7,0 à +9,6 | hors budget |
| Sainteté plafonnée à 3 | Ysolde / Bérengère | −1,8 / −1,5 | presque gratuit |
| Sainteté à 2 charges de 3 PV | Ysolde / Bérengère | +11,6 / +11,8 | trop fort, et moins de spectacle |
| Purification et éclat de 3 | Ysolde / Bérengère | +4,6 / +5,4 | retours de 40 à 45 % |
| Kit : sainteté à 2, éclat de 4 | Ysolde / Bérengère | +0,5 / +1,6 | **le plus spectaculaire** : retours 40 → 51 %, fins serrées 16 → 27 % |
| Immunité qui riposte | Aldric / Gauvain | +6,5 / +6,2 | Aldric hors budget |
| Immunité et Armure temporaire 2 / 3 | Aldric | +2,6 / +4,2 | à 3, Thaldrin le bat à 69 % ; jugée peu claire |
| Immunité et armure +1 / +2 (règle d'aura) | Aldric | +1,4 / +5,5 (par rapport au bouclier de 2) | **+1 choisie par l'utilisateur** |
| Kits Rétribution à 2 jauges | Aldric | −0,6 à +8,8 | Brokk le bat à 69 % : la Rétribution reste |
| Fleur qui s'ouvre (Régénération 2 × 3) | Thaldrin / Brannoc | +1,9 / +2,2 | **retenue** |
| Fleur de vie à 5 | Thaldrin / Brannoc | +1,4 / +1,5 | plus plate |

### Ce que l'intégration a changé

- **Brokk contre les prêtresses** borne tout : un éclat à chaque Purification ignore son armure et le fait tomber à 23,7 % contre Ysolde (contre connu toléré jusqu'à 25 %). D'où la **Purification de repli** (nouvelle option `cleanse.orElse`) : l'éclat ne frappe que s'il n'y a rien à retirer. Contre Brokk, qui a toujours un bonus, rien ne change.
- Avec la lumière de repli seule, les prêtresses tombaient à 43 % : le plafond de sainteté passe de 2 à **3 charges** (il ne coûte qu'environ 2 points), et la lumière à **5**.
- **Pile ou face** : la face qui frappe faisait tomber Brokk de 40,8 à 33 % contre Ssythra ; refusée. Avec la pile à 20 qui touche, Ysolde tombe à 35,0 % pile contre Naraxes et contre Ssythra dans le test, qui exige plus de 35 % : l'utilisateur garde 20, et ces deux duels rejoignent les contres connus.
- **Aura d'immunité à +1 d'armure** : Aldric bat alors Thaldrin à 66-68 % (l'armure vise les petits coups de l'ours). Ni 10 % de critique, ni ×2,25 ne suffisent ; **l'esquive d'Aldric de 5 à 2 %** ramène le duel à 62,5 % et les autres duels d'Aldric au centre.

### Avant → après (règles 0.39.1 → 0.42.0)

| Compétence | Valeur nette | Gâchis | Drapeau |
| --- | --- | --- | --- |
| Pile ou face (Naraxes / Ssythra) | −5,0 / −4,0 → **+0,0 / +0,6** | 0 % | coûte des victoires → presque inutile |
| Aura d'immunité (Aldric / Gauvain) | −2,7 / −3,9 → **+1,1 / −0,6** | 0 % | coûte des victoires → aucun (Aldric), presque inutile (Gauvain) |
| Purification (Ysolde / Bérengère) | +8,3 / +7,8 → **+12,8 / +12,8** | 54-55 % → **0 %** | gâchée → aucun |
| Fleur de vie (Thaldrin / Brannoc) | +0,3 / +1,1 → **+2,2 / +3,4** | 16 % → 2 % | presque inutile → aucun |
| Aura de sainteté (Ysolde / Bérengère) | +41,9 / +38,5 → +41,2 / +38,1 | 0 → 22-24 % | écrasante (signature) |
| Rétribution (Aldric / Gauvain) | +35,1 / +30,0 → +35,6 / +30,5 | 16-18 % | écrasante (signature, non touchée) |

Le gâchis de la sainteté vient du plafond : une charge posée au plafond ne change rien.

**Taux de victoire** (400 combats par duel) : de 46,0 à 53,3 % avant, de 45,5 à 53,8 % après. Ysolde 47,1 → 48,6, Bérengère 46,0 → 48,2, Naraxes 49,4 → 52,9, Ssythra 50,3 → 53,6, Aldric 53,3 → 53,8, Gauvain 49,5 → 49,9, Thaldrin 51,1 → 51,5, Brannoc 51,8 → 52,6. Ervald (47,0 → 45,5) et Gorak (48,1 → 46,9) perdent un peu : leurs adversaires sont plus forts.

**Spectacle** (200 combats par duel, combats où le personnage figure) : chez les prêtresses, retours de 39,5 à 45,6 %, fins serrées de 16-18 à 22 %, de 36 à 33 tours. Partout ailleurs, retours et fins serrées gagnent de 0,5 à 2,5 points.

### Limites

- **Deux « écrasantes » restent** : l'Aura de sainteté et la Rétribution portent leurs personnages. Les ramener sous +20 points demanderait de refaire ces personnages, pas une retouche.
- **L'Aura d'immunité reste mince** : sa valeur dépend des malus du roster, rares. Elle prendra de la valeur avec des reliques ou des édits à malus (FAMILLES.md § 6.4 A).
- **Pile ou face** reste « presque inutile » (+0,0 et +0,6) : la pièce prend toujours la place d'un jet de dé, par choix (face vide).

### Après fusion avec la barde (0.41.0 du chantier parallèle)

Mesures refaites sur le roster de 20 personnages (400 combats par duel pour l'équilibre, 300 pour l'audit) : de 46,4 à 53,1 %, aucun duel hors limites ; Pile ou face +0,1 / +0,6, Aura d'immunité +1,0 / −1,0, Purification +14,2 / +13,6 (gâchis 0 %), Fleur de vie +2,3 / +3,3, Aura de sainteté +41,1 / +38,1. Les compétences de la barde ont leurs propres drapeaux (rares à l'écran, Ouverture écrasante) : à traiter dans son chantier.

## 11. Deuxième passe : notes de l'utilisateur et audit 0.42.0 (0.45.0)

**Demande** : quatre notes de l'utilisateur (« aura de poison de Caldrec et jumeau, se résout quand ? comme le poison normal ? » ; « vérifier le fonctionnement de vol de vie, compteur, mécanique, utilité » ; « aura du barde : description pas claire » ; « épines du nain, revoir fonctionnement, résolution, pertinence de la rendre permanente »), et deux compétences au choix, prises dans l'audit 0.42.0 : **Fausse note** (coûte des victoires) et **l'immunité de Gauvain** (presque inutile, −1,0).

**Méthode** : laboratoire, série 5 (`LAB_SERIES=5`, 300 combats par duel, 30 essais), puis intégration et équilibre du roster entier (20 personnages, 400 combats par duel), puis audit relancé.

### Ce que l'examen a montré

- **Aura de poison** : elle fait perdre des PV au début du tour du **porteur**, avant son action, en dégâts directs, sans décroître. Le Poison, lui, agit au début du tour de la **victime**, décroît de 1 par tour, et c'est un malus (immunité, régénération). Deux règles différentes sous le même mot.
- **Vol de vie** : une charge, sans durée, consommée par le prochain coup porté (rendue en soin s'il touche, perdue s'il est esquivé, gardée sur un jet de 1 à 3). Le médaillon affichait toujours « 1 », ce qui n'apprenait rien. Valeur +3 à +4.
- **Épines** : 6 dégâts renvoyés à chaque coup qui touche (fenêtre `hurt`, même si un bouclier absorbe tout), pendant le seul tour adverse. Peu visibles.
- **Aura mélodieuse et Fausse note** : un double remplace les deux coups ; à une charge, l'échange coûte des victoires. Les textes parlaient de « dégâts finaux » (jargon du moteur) et avaient une coquille.

### Laboratoire

| Piste | Personnages | Δ | Lecture |
| --- | --- | --- | --- |
| Aura au début du tour adverse, avec le Poison (dégâts directs) | Ervald / Caldrec | +2,8 / +2,1 | **retenue** (choix de l'utilisateur, second retour) |
| Aura à la fin de son tour | Ervald / Caldrec | +2,8 / +2,1 | mêmes chiffres, mais décalée du Poison |
| Aura qui pose de vrais Poisons (1 par charge) | Ervald / Caldrec | +8,7 / +4,9 | les poisons s'empilent ; Ervald bat Brokk à 67 % |
| Même chose, aura plafonnée à 1 charge | Ervald / Caldrec | +1,3 / +0,9 | **Ervald tombe à 31 % contre Gauvain** : l'immunité bloque le poison |
| Vol de vie sur deux coups | Ervald / Caldrec | +6,5 / +5,4 | **retenu** |
| Vol de vie et 3 PV volés tout de suite | Ervald / Caldrec | +15,0 / +10,5 | hors budget |
| Épines permanentes, 1 par charge | Brokk / Grimbald | +0,7 / −0,6 | **retenu** : neutre, et bien plus visible |
| Épines permanentes, 2 par charge | Brokk / Grimbald | +12,4 / +7,3 | hors budget |
| Épines 4 pendant 2 tours | Brokk / Grimbald | +2,3 / +1,8 | correct, moins lisible |
| Aura mélodieuse à 2 charges | Fanchon / Mélisande | +2,8 / +4,1 | **retenu** |
| Aura mélodieuse sans sacrifier les coups | Fanchon / Mélisande | +5,8 / +6,3 | trop fort avec le reste |
| Fausse note à 2 charges | Fanchon / Mélisande | +1,1 / +1,4 | **retenu** |
| Fausse note qui frappe aussi | Fanchon / Mélisande | +3,9 / +3,9 | avec l'aura à 2, bardes à 57-58 % |
| Immunité de Gauvain, armure +2 / +3 | Gauvain | +4,3 / +9,1 | **+2 retenu** |

### Avant → après (règles 0.42.0 → 0.43.0 de la branche, roster de 20 personnages)

| Compétence | Valeur nette | Drapeau |
| --- | --- | --- |
| Épines (Brokk / Grimbald) | +9,9 / +5,0 → +10,9 / +4,3 | aucun ; 6,9 réactions par combat chez Brokk |
| Vol de vie (Ervald / Caldrec) | +4,0 / +3,3 → **+10,6 / +8,9** | aucun (gâchis 11-15 % : charges perdues sur esquive) |
| Aura mélodieuse (Fanchon / Mélisande) | −1,0 / −1,3 → **+2,0 / +2,5** | coûte des victoires → rare à l'écran |
| Fausse note (Fanchon / Mélisande) | −0,3 / −1,0 → +0,8 / +0,5 | coûte des victoires → presque inutile |
| Aura d'immunité (Gauvain) | −1,0 → **+3,1** | presque inutile → aucun |
| Aura de poison (Ervald / Caldrec) | +11,0 / +4,1 → **+13,8 / +6,2** | aucun (agit avec le Poison, texte clarifié) |

**Taux de victoire** (400 combats par duel) : de 46,4 à 53,1 % avant, de 44,9 % (Gorak) à 55,1 % (Caldrec) après. Ervald 46,4 → 54,0, Caldrec 48,9 → 55,1, Gauvain 48,8 → 51,9. Ceux qui n'ont pas changé perdent un peu : Gorak 46,9 → 44,9, Morgrut 48,6 → 46,5. Brokk contre Ysolde remonte de 27,0 à 30,5 %.

**Spectacle** (200 combats par duel) : stable partout, sauf chez les morts-vivants, qui mènent plus nettement (retours d'Ervald de 65 à 62 %, fins serrées de 42 à 39 %).

### Limites

- **La Fausse note reste mince** : 10 dégâts retirés à un seul coup, sur un double qui en sacrifie deux.
- **Les doubles de la barde sont rares par construction** (un sur cinq jets) : « rare à l'écran » restera.
- **Les textes et les compteurs n'ont pas été vus à l'écran.**

### Après fusion avec la 0.44.0 (un personnage par famille)

La passe a été mesurée sur 20 personnages, puis fusionnée après le retrait des jumeaux (0.44.0) ; elle devient la 0.45.0. L'immunité propre à Gauvain disparaît avec lui. Mesures refaites sur le roster de 10 (400 combats par duel pour l'équilibre, 300 pour l'audit) : de 45,8–51,4 % avant à **44,4 % (Ysolde) – 54,6 % (Ervald)** après, aucun duel hors limites ; Fanchon 50,5 → 54,3 %. Valeurs nettes : Vol de vie +4,3 → **+9,6**, Aura de poison +4,4 → **+5,9**, Aura mélodieuse −0,9 → **+2,3**, Fausse note −1,0 → **+0,4** (presque inutile), Épines +2,6 → +2,4, Aura d'immunité d'Aldric +1,2 → +1,4.

## 12. Troisième passe : Furie des vents, son des doubles, kit de la barde (0.46.0)

**Demande** : un « ding » instantané sur tout double de la barde, avec un son existant ; une Furie des vents cumulable, dont les déclenchements restent en réserve ; trois compétences proposées par l'audit 0.45.1. Écartées : la Rétribution (décision de l'utilisateur), la Pile ou face (règle fixée par l'utilisateur), les doubles « rares à l'écran » (par construction). Retenues : **Siffloter** et **Fausse note** (« presque inutiles »), **Ouverture** (« écrasante »).

### Laboratoire (série 6, 400 combats par duel)

| Piste | Personnage | Δ | Lecture |
| --- | --- | --- | --- |
| Furie cumulable, tout d'un coup | Gorak | +0,3 ± 0,2 | les charges multiples sont rares |
| Furie cumulable, une par action (en réserve) | Gorak | +0,3 ± 0,2 | **retenue** : fidèle à « en réserve jusqu'à ses prochains coups » |
| Siffloter à 5 charges | Fanchon | +1,5 | plus plat |
| Siffloter qui frappe aussi | Fanchon | +2,8 | retenu, en kit |
| Fausse note qui frappe aussi | Fanchon | +3,5 | retenue, en kit |
| Sans Ouverture | Fanchon | −26,2 | l'Ouverture porte la barde |
| Kit : tous les doubles frappent, sans Ouverture | Fanchon | −16,1 | trop faible |
| Kit : Siffloter et Fausse note qui frappent | Fanchon | +6,1 | 60,5 % : hors budget |
| Même kit, esquive 8 / 6 / 4 % | Fanchon | +3,0 / **+0,3** / −1,8 | **6 % retenu** |

### Avant → après (0.45.1 → 0.46.0, roster de 10)

| Compétence | Valeur nette | Drapeau |
| --- | --- | --- |
| Siffloter | +0,7 → **+3,3** | presque inutile → rare à l'écran |
| Fausse note | +0,4 → **+4,3** | presque inutile → rare à l'écran |
| Ouverture | +25,7 → +27,1 | écrasante (gardée) |
| Furie des vents | +6,9 → +7,1 | aucun |

Taux de victoire : de 44,4–54,6 % à 44,0 % (Ysolde) – 54,6 % (Fanchon). Spectacle de la barde : fins serrées de 41 à 43 % au laboratoire.

### Limites

- **Le « ding » n'est pas vérifiable à l'oreille** par l'agent.
- **Écorce épaisse** passe sous le seuil de « presque inutile » (+1,1, dans la marge).

## 13. Quatrième passe : doutes de jeu, Furie instantanée, Coup de chance cumulable (0.50.0)

**Demande** : « son immunité ne l'a pas protégé des poisons » ; « Pile ou face ne tombe jamais sur pile (bug ?) » ; Coup de chance cumulable, un dé de plus par charge ; Furie des vents instantanée ; et trois compétences cassées à réparer en favorisant le spectacle, avec le tour des taux de victoire avant et après.

### Les doutes, vérifiés sur les traces de l'utilisateur (`logs/combats/`)

- **Immunité** (Ervald contre Aldric, 0 h 29) : l'Aura d'immunité bloquait le Poison ; l'Aura de poison, des dégâts directs, continuait. Pas un bug, mais une règle qui trompe : désormais, l'immunité arrête aussi l'aura.
- **Pile ou face** : 52 piles pour 54 faces sur toutes les traces ; 1 sur 6 le dernier jour (environ une chance sur neuf). L'affichage de la pièce est juste (capture), mais le libellé « PILE ! » est presque caché par la pièce.

### Laboratoire (série 7, 400 combats par duel)

| Piste | Personnage | Δ | Lecture |
| --- | --- | --- | --- |
| Furie instantanée (un coup) | Gorak | +1,5 | essai faux : la Furie, ce sont deux coups |
| Furie instantanée (deux coups), intégrée | Gorak | Gorak à 64 % | hors budget ; d6 : 60 % ; d4 : 58 % ; critique 8 % : 55 % |
| Même chose, **dé de d10 à d8** | Gorak | 50,9 % | **retenu** |
| Coup de chance cumulable | Naraxes | +0,2 | **retenu** (demande) ; charges multiples rares |
| Aura de poison arrêtée par l'immunité | Ervald | −0,8 | **retenue** |
| Écorce 7 / 9 | Thaldrin | +2,1 / +3,6 | **7 retenue** |
| Écorce épineuse / de sève | Thaldrin | +1,0 / +0,8 | plus visibles, mais faibles |
| Riposte 75 % / 100 % | Aldric | +2,9 / +6,1 | à 100 %, Thaldrin 65 % |
| Riposte à deux charges | Aldric | +4,5 | **retenue** : retours 61 → 63 % |
| Luciole 4 charges / +3 dégâts | Thaldrin | +1,0 / +2,4 | **4 charges retenue** ; +3 met Ysolde contre Thaldrin à la limite |

### Avant → après (0.47.0 → 0.50.0, roster de 10)

| Personnage | Victoires | Retours | Fins serrées |
| --- | --- | --- | --- |
| Gorak | 50,4 → 50,9 % | 63,9 → 59,3 % | 41,4 → 37,9 % |
| Elaria | 49,6 → 48,3 % | 52,9 → 52,6 % | 33,7 → 33,4 % |
| Brokk | 49,7 → 48,4 % | 61,2 → 60,6 % | 40,3 → 39,4 % |
| Ervald | 54,4 → 51,8 % | 62,2 → 60,8 % | 41,8 → 41,1 % |
| Ysolde | 44,0 → **43,1 %** | 46,3 → 45,4 % | 24,2 → 22,4 % |
| Naraxes | 50,2 → 49,9 % | 55,2 → 55,4 % | 34,3 → 34,6 % |
| Aldric | 49,0 → **54,1 %** | 61,0 → 62,5 % | 41,2 → 41,6 % |
| Morgrut | 48,9 → 48,0 % | 59,4 → 59,1 % | 41,5 → 41,1 % |
| Thaldrin | 49,1 → 51,5 % | 65,2 → 63,7 % | 43,6 → 43,1 % |
| Fanchon | 54,6 → 53,9 % | 62,3 → 62,4 % | 41,8 → 42,3 % |

| Compétence | Valeur nette | Drapeau |
| --- | --- | --- |
| Furie des vents | +7,1 → **+27,7** | aucun → écrasante (le cœur de l'orc) |
| Coup de chance | +3,3 → +4,0 | aucun |
| Aura de poison | +5,4 → +4,7 | aucun |
| Écorce épaisse | +0,8 → **+2,4** | presque inutile → aucun |
| Riposte | +2,7 → **+7,1** | aucun |
| Luciole | +2,5 → **+4,2** | aucun |
| Pile ou face | −0,8 → +0,4 | presque inutile |

### Limites

- **Ysolde (43,1 %)** est à un point du plancher : la prochaine passe doit la remonter.
- **Gorak change d'identité** : un dé de d8 et une Furie qui frappe tout de suite ; ses combats se décident plus vite.
- **Le libellé de la pièce** reste à corriger dans `FightScreen.tsx`.

### Retours de l'utilisateur sur la passe (0.50.0)

- **Aura de poison → Aura glaciale** : le nom trompait (ce n'est pas un Poison). Le froid du chevalier liche ; même règle.
- **Écorce épaisse = Armure temporaire** : « c'est de l'armure, non ? » Oui : les deux statuts avaient exactement la même règle. Le statut Écorce disparaît, les deux compétences (Peau de pierre 6, Écorce épaisse 7) posent l'Armure temporaire. Simplification sans effet sur l'équilibre.
- **Feux follets au lieu de la Luciole** (« ennuyante ») : trois pistes mesurées (400 combats par duel) : Feux follets, Brûlure 3 pendant 3 tours, **0,0** ; Racines, l'adversaire perd sa prochaine action, −1,0 ; Ronces, ses 3 prochains coups lui coûtent 2 PV, −7,1. Feux follets retenus : même force, des dégâts visibles à chaque fin de tour adverse, la lignée des lucioles.
- Mesures finales : de 43,0 % (Ysolde) à 54,0 % (Aldric) ; Feux follets +4,2, Écorce +2,4, Aura glaciale +4,6.

## 14. Cinquième passe : le Saignement, sans nouveau personnage (0.68.0)

Demande de l'utilisateur : introduire le saignement dans le jeu sans créer un personnage pour un nouveau concept, en favorisant l'apparition de synergies. Il a retenu les deux idées de Gorak et de Brokk.

### La règle

**Saignement N** : chaque coup qui touche le porteur lui fait perdre N PV en dégâts directs, puis la plaie perd une charge (2, puis 1). Le jeu avait déjà quatre afflictions qui comptent les tours (Poison, Pourriture, Brûlure, Aura glaciale) ; celle-ci compte les **coups**. Les synergies en découlent sans cas particulier :

| Rôle | Qui | Pourquoi |
| --- | --- | --- |
| Vide la plaie | Gorak (Furie des vents), Fanchon (deux dés), Naraxes (d6 de Coup de chance) | plusieurs coups dans une action font couler toute la plaie dans la même action |
| La laisse ouverte | Elaria (esquive), Ysolde (Peur), Morgrut (Attente) | sans coup qui touche, la plaie ne coule pas, mais ne se referme pas non plus |
| Y trouve une utilité | Aldric (Aura d'immunité) | elle bloque un malus de plus dans le roster |

Moteur : un statut qui s'estompe (`decays`) perd sa charge quand il réagit (`reactions.hurt`), juste après son effet (RESOLUTION § 4).

### Laboratoire : deux passes, la première fausse

La première passe (série 8, 300 combats par duel, règles 0.67.3) imitait la plaie avec les crochets existants : `spentOnHurt`, qui retire une charge **avant** la réaction, et une charge de plus pour compenser. Il restait alors une charge fantôme après le dernier écoulement, et chaque plaie posée par-dessus coulait d'un PV de trop par coup. Elle annonçait Saignée 2 à −0,6 point et Épines acérées à +6,8 à +8,4 ; le vrai statut donne −3,0 et +2,1. Leçon : une imitation de statut qui détourne un crochet doit être vérifiée sur une trace **avec cumul**, pas seulement sur une plaie neuve.

Deuxième passe, sur le vrai statut et le kit livré (400 combats par duel, mêmes graines avant et après) :

| Idée | Victoires | Δ | Pire duel après | Spectacle |
| --- | --- | --- | --- | --- |
| Gorak, Saignée 3 (au lieu de 2) | 47,9 → 54,5 % | +6,6 ± 0,8 | Ysolde 62,3 → **71,5 %** | neutre |
| Gorak, Saignée 4 | 47,9 → 60,1 % | +12,2 ± 1,1 | Ysolde 79,3 % | retours −2,4 |
| Thaldrin, Coup de griffe qui laisse Saignement 3 | 51,8 → 55,7 % | +3,9 ± 0,6 | Ysolde 67,5 % | retours −1,6 |
| Thaldrin, même chose avec relance + 1 au lieu de + 3 | 51,8 → 53,9 % | +2,2 ± 0,6 | Ysolde 66,3 % | neutre |
| Elaria, chaque critique laisse Saignement 1 | 48,8 → 50,8 % | +2,1 ± 0,5 | Morgrut 57,5 % | neutre |
| Elaria, chaque critique laisse Saignement 2 | 48,8 → 55,9 % | +7,1 ± 0,8 | Morgrut 62,5 % | retours −2,7 |
| Elaria, Œil de faucon qui laisse aussi Saignement 2 | 48,8 → 54,5 % | +5,8 ± 0,8 | Morgrut 60,0 % | neutre |
| Brokk, Épines acérées à 1 charge par coup, quelle que soit la pile | 50,4 → 47,9 % | −2,5 ± 0,5 | Aldric 39,8 % | neutre |

Règles 0.68.1 pour ces quatre lignes : la plaie posée par le coup qui touche (critique, griffe) ne coule plus sur ce même coup, elle attend le suivant (RESOLUTION § 5, règle 9). En 0.68.0, elle coulait aussitôt, et ces idées valaient un peu plus (Griffe qui lacère +4,6, Flèche barbelée 2 +9,0). Les autres lignes ne bougent pas : leur plaie est posée hors d'un coup qui touche. L'audit de résolution vérifie la règle.

**Mise en scène (0.68.1, demande de l'utilisateur)** : « un sort qui doit provoquer ». La plaie s'ouvre et se voit (médaillon, compteur), on attend le coup qui la fera couler ; à l'impact de ce coup, un badge de modificateur « Saignement +2 » tombe sous le dé, comme « Critique ×2 », et les PV de la plaie suivent la frappe d'un battement.

### Avant → après (0.67.3 → 0.68.0, roster de 10, 400 combats par duel)

| Compétence | Valeur nette | Duels qui bougent |
| --- | --- | --- |
| Rage du sang (+5 PV) → Saignée (Saignement 2) | +5,8 → **+3,3** | Gorak contre Ysolde 58,8 → 62,3 %, Fanchon 47 → 42, Morgrut 54 → 48, Aldric 46 → 40 |
| Épines → Épines acérées | +3,7 → **+5,0** | Brokk contre Ysolde 51 → 57 %, Gorak 49 → 53, Fanchon 56 → 60, Aldric 44 → 40 |

**Taux de victoire** : de 43,0 (Ysolde) à 54,0 % (Aldric) avant, de **41,9** (Ysolde) à **55,1 %** (Aldric) après. Gorak 50,9 → 47,9, Brokk 48,3 → 50,4 ; les autres bougent de moins d'un point. Pire duel inchangé : Thaldrin contre Ysolde, 64,8 %. Apport du Saignement : 3,6 PV par combat pour Gorak, 4,1 pour Brokk.

### Limites et proposition

- **Ysolde à 41,9 %**, 0,1 point sous le budget (marge ±1,6). Elle perd surtout contre les deux porteurs de plaie. Hypothèse non vérifiée : une plaie n'expire jamais, elle finit donc toujours par couler dans ses combats longs (29 tours). **Proposition, non appliquée** : la *Purification double* (série 3 : elle retire aussi le dernier malus d'Ysolde, donc une plaie ou un poison), mesurée sur les règles 0.68.0 : 41,9 → **43,8 %** (+1,9 ± 0,4), pire duel Naraxes 38 → 40 %. Elle était « trop faible » en 0.36 (+1,0) faute de malus dans le roster ; le Saignement lui en donne.
- **Gorak à 47,9 %** : dans le budget, mais 3 points sous la Rage du sang. Saignée 3 le remettrait à 54,5 %, au prix de 71,5 % contre Ysolde. Remplacée en 0.70.0 par Pourfendre (plus bas).
- **Icônes** : le Saignement reprend le cœur fendu de la Brèche ; planche v7 (Saignement, Pourfendre, Épines acérées) prête dans STYLE_BIBLE § 7.
- Rendu et son non vus : la plaie qui coule se montre comme le poison subi (sans titre, son Ronge).

### 0.70.0 : Pourfendre, l'orc doit toucher pour faire saigner

Proposition de l'utilisateur : « l'orc doit donner un coup pour appliquer un saignement ». Son 1 devient **Pourfendre** : il n'est plus sacrifié, c'est un vrai coup (valeur du dé, Aura de puissance, critique, esquive), et **s'il touche**, il pose Saignement 2. Deux décisions de l'utilisateur : un coup doit toucher pour poser un malus physique (crochet `needsTouch`, vérifié avant tout tirage) ; le 1 est un vrai coup, avec tout ce qui réagit aux coups (Épines acérées, Riposte, jauges de Rétribution, intimidation). La plaie posée par ce coup coule au suivant (règle 9).

Mesures (règles 0.69.0, 400 combats par duel, mêmes graines avant et après) :

| Version du 1 | Gorak | Δ | Pire duel | Spectacle |
| --- | --- | --- | --- | --- |
| Saignée 2 (sans coup, avant) | 49,4 % | — | Ysolde 58,5 % | — |
| Pourfendre, Saignement 1, posé même sur une esquive (première mesure) | 48,1 % | −1,3 ± 1,4 | Ervald 41 % | neutre |
| Pourfendre, Saignement 2, posé même sur une esquive (première mesure) | 51,9 % | +2,6 ± 1,4 | Ysolde 60 % | retours +1,2, fins serrées +1,7 |
| **Pourfendre, Saignement 2, s'il touche (livré)** | **51,1 %** | +1,7 | Ysolde 60 % | — |
| Pourfendre, Saignement 1, s'il touche | 47,8 % | −3,3 ± 0,6 | Ervald 40,8 % | neutre |
| Pourfendre, Saignement 3, s'il touche | 55,5 % | +4,4 ± 0,7 | Ysolde 63 % | neutre |

Valeur nette de Pourfendre : **+5,0** points ; Gorak ne sacrifie plus que 18 % de ses jets (37 % avant). Roster après : de 43,3 % (Ysolde) à 54,3 % (Ervald), pire duel inchangé (Brokk contre Ervald, 39 %).

## 15. Sixième passe : Aura glaciale et poisons, Furie des vents, druide (livrée en 0.69.0, sauf le druide)

**Demande** (2026-10-20) : l'Aura glaciale d'Ervald, autrefois de poison : comment marche-t-elle, est-elle redondante ? Repasser sur les poisons et harmoniser leur fonctionnement. La Furie des vents : frapper deux fois dès qu'elle se déclenche, sans repasser par le jet de compétence, les 1, 2 et 3 comptant comme valeur de frappe, au lieu de relancer sans fin. Le druide : rework de la dualité, ou retouche de sorts précis, en pensant aux synergies futures et au personnage.

**Méthode** : audit des compétences (300 combats par duel, `logs/skills/2026-10-20-16-15-52_v0.68.0.md`), laboratoire série 9 (400 combats par duel, mêmes graines avant et après, règles 0.68.0, `LAB_SERIES=9`). La Furie en coups bruts demande un crochet du moteur : elle a été mesurée sur une copie du dépôt hors de l'arbre de travail, avec un paramètre `plain` dans `strikeOnce` (ni coup sacrifié, ni coup transformé, ni fenêtre de jet). Ce crochet n'existe pas dans le dépôt : ses idées ne figurent donc pas dans `ideas.ts`.

### Aura glaciale : comment elle marche, et ce qui cloche

**Règle actuelle** : bonus permanent posé sur Ervald par un 3, cumulable. Au début de chaque tour de l'adversaire, juste après ses propres statuts (donc après son Poison), il perd 1 PV par charge en dégâts directs. L'Aura d'immunité l'arrête, la Régénération non. Valeur nette **+4,8** (vue dans 61 % des combats, 0,92 fois par combat).

**Redondante ? Oui, deux fois.**
- **Avec le Poison du Souffle de la tombe** : même instant, même nature (des PV perdus au début du tour adverse, sans armure), deux médaillons et deux chiffres qui tombent ensemble. Le spectateur voit deux poisons sous deux noms.
- **Avec la Pourriture du druide** : même profil (1 PV par charge au début de chaque tour de la victime, sans décroître). Seule différence : l'aura est sur Ervald, la Pourriture sur sa victime.

**Elle coûte deux crochets propres** : `onOpponentTurnStart` et `stoppedByImmunity` n'existent que pour elle (moteur, audit, narration, test). Ils sont nés de deux corrections : « se résout quand ? » (0.45.0), puis « l'immunité ne l'arrête pas » (0.50.0). Un vrai Poison aurait réglé les deux d'office.

**Restes du nom** : l'id est encore `poisonAura` (`poison-aura` pour la compétence et l'icône), plusieurs commentaires disent « Aura de poison », l'icône est verte, et PERSONNAGES.md § Morts-vivants décrit encore la règle d'avant la 0.45.0.

### Les afflictions du jeu, côte à côte

| Affliction | Qui la pose | Quand elle coule | Évolution | Valeurs | Immunité | Régénération |
| --- | --- | --- | --- | --- | --- | --- |
| Poison | Ervald (Souffle de la tombe, 3), Naraxes (Aura de décoction, 2 par coup) | début du tour de la victime | −1 par tour | une | bloque | s'annulent |
| Pourriture | Thaldrin (Aura de pourriture, 1 par coup) | début du tour de la victime | jamais | une | bloque | non |
| Brûlure | Thaldrin (Feux follets) | fin du tour de la victime | 3 tours, puis s'éteint | **deux** (3 PV, 3 tours), une nouvelle remplace l'ancienne | bloque | non |
| Saignement | Gorak (Pourfendre, 0.70.0 ; Saignée avant), Brokk (Épines acérées) | à chaque coup reçu | −1 par coup | une | bloque | non |
| Aura glaciale | Ervald (3) | début du tour de la victime | jamais | une | **crochet propre** | non |

Trois axes suffisent à distinguer les afflictions : **le temps qui ronge et s'estompe** (Poison), **le temps qui brûle pour une durée** (Brûlure, en fin de tour), **les coups** (Saignement). La Pourriture et l'Aura glaciale ne font que doubler le Poison sans s'estomper.

### Proposition 1 : l'Aura glaciale pose du Poison

Au début de chacun de ses tours, l'aura pose **1 charge de Poison par charge d'aura** sur l'adversaire. Un seul statut, une seule règle : l'immunité le bloque, la Régénération l'annule, une purge l'enlève, sans crochet propre. La dynamique naît des règles existantes : le Poison perd une charge à chaque tour de la victime, l'aura lui en rend une à chaque tour d'Ervald. **Une charge d'aura fige le poison à sa valeur** : seule, elle fait 1 PV par tour, comme aujourd'hui ; après un Souffle de la tombe, elle garde le poison à 3 par tour au lieu de 3, 2, 1. *Le froid de la tombe conserve le poison* : c'est le chevalier liche « inévitable », qui « a tout son temps ». Deux charges le font grossir d'une charge par tour.

En 0.45.0, cette piste avait été écartée : l'Aura d'immunité bloquait le poison et pas l'aura (Ervald à 31 % contre Gauvain). Depuis la 0.50.0, l'immunité arrête aussi l'aura : l'objection est tombée.

| Variante | Ervald | Δ | Pire duel après | Lecture |
| --- | --- | --- | --- | --- |
| Cumulable, sans compensation | 52,0 → 55,4 % | +3,4 ± 0,7 | Ysolde 56,0 → 63,5 % | dans le budget, mais pèse sur Ysolde, déjà la plus basse |
| Plafonnée à 2 charges | 52,0 → 55,2 % | +3,2 ± 0,7 | Ysolde 62,7 % | comme cumulable : 3 charges sont rares |
| Plafonnée à 1 charge | 52,0 → 52,2 % | +0,2 ± 0,7 | Ysolde 58,3 % | neutre, mais environ un 3 sur trois tomberait à vide (1,5 aura posée par combat où on la voit) |
| **Cumulable, Souffle de la tombe à Poison 2** | 52,0 → **49,2 %** | −2,8 ± 0,9 | Fanchon 45,8 → 41,5 % | **recommandée** : aucun 3 perdu, Ervald revient au milieu du roster, Ysolde épargnée |
| Plafonnée à 1, Souffle à 2 | 52,0 → 45,5 % | −6,5 ± 0,9 | Fanchon 39,0 % | trop faible |

Spectacle (cumulable, Souffle 2) : combats de 19,0 → 19,3 tours, meneur 0,53 → 0,56, retours 60,8 → 59,0 %.

**Ce que la livraison toucherait** : `poisonAura` devient `frostAura` (id, compétence `frost-aura`, clé d'icône) ; `onOpponentTurnStart` et `stoppedByImmunity` disparaissent du moteur, de l'audit (`aura au tour adverse`, `aura arrêtée par l’immunité`), de la narration et des tests ; un test de la dynamique « fige » dans `combat.test.ts` ; `poison` cité dans `modules.test.ts` ; STATUTS, RESOLUTION, PERSONNAGES (§ Morts-vivants, réécrit), FEATURES. À vérifier à l'écran : l'aura n'a plus de chiffre propre, elle ajoute une charge au médaillon de Poison au début du tour d'Ervald (une capture). L'icône de l'aura est déjà à peindre (TODO § 15).

**Synergies ouvertes** : un seul Poison nourri par trois sources (Souffle, Aura glaciale, Aura de décoction) ; toute relique ou tout édit « poison » touche Ervald et Naraxes à la fois ; la Purification double proposée pour Ysolde (§ 14) devient son contre ; la Fleur de vie du druide l'annule charge par charge.

### Proposition 2 : la Furie des vents en coups bruts

**Règle actuelle** (0.50.0) : sur un 2, Gorak frappe deux fois tout de suite, chaque coup avec son propre jet complet. Un 1, un 2 ou un 3 pendant ces coups déclenche la compétence et ne frappe pas ; un 2 relance une Furie, trois fois au plus par action. Mesures (Gorak contre le roster, 400 combats par duel) :

| Mesure | Valeur |
| --- | --- |
| Furies par combat | 1,32 (1,02 sur le jet de l'action, 0,30 relancées pendant une Furie) |
| Furies qui en relancent au moins une | 22,5 % ; 6,5 % vont jusqu'au plafond de trois |
| Coups de Furie sacrifiés par un 1, un 2 ou un 3 | **36,5 %** (un tiers chacun) |
| Valeur nette | **+26,9 points**, drapeau « écrasante » : la Furie est le cœur de l'orc |

L'impression d'interminable est fondée, et un coup de Furie sur trois ne frappe pas. **Proposition de l'utilisateur** : les deux coups partent tout de suite, sans jet de compétence : leurs 1, 2 et 3 frappent pour leur valeur. Esquive et critique restent tirés à chaque coup. Plus de relance : la Furie dure deux coups, toujours.

Ce que coûte la règle : les compétences gagnées pendant la rafale (Saignée, nouvelle Furie, charge d'Aura de puissance) valaient plus que les dégâts des coups sacrifiés. À dé égal, Gorak s'effondre :

| Variante | Gorak | Δ | Pire duel après | Lecture |
| --- | --- | --- | --- | --- |
| Coups bruts, d8 (dé actuel) | 47,9 → 39,8 % | −8,1 ± 1,3 | Aldric 35,0 % | hors budget |
| Coups bruts, d10 | 47,9 → 57,9 % | +10,0 ± 1,8 | Ysolde 72,3 % | duel extrême |
| Coups bruts, d10, critique 14 % | 54,3 % | +6,4 ± 1,8 | Ysolde 69,0 % | duel extrême |
| Coups bruts, d10, critique 12 % | 52,4 % | +4,5 ± 1,8 | Ysolde 65,8 % | à la limite |
| Coups bruts, d10, critique 10 % | 50,5 % | +2,6 ± 1,8 | Ysolde 63,7 % | possible, mais Gorak perd ses critiques fréquents (sa fiche) |
| **Coups bruts, d9, critique 18 %** | 47,9 → **49,2 %** | +1,3 ± 1,7 (non significatif) | Ysolde 62,3 → **60,0 %** | **recommandée** : neutre, garde les 18 % de critique, adoucit le pire duel |
| Coups bruts, d9, critique 14 % | 45,6 % | −2,3 ± 1,7 | Aldric 39,3 % | inutile |

Spectacle (d9) : combats de 17,1 tours inchangés, retours 60,6 → 61,9 %, fins serrées 39,3 → 40,6 %. Furies à l'écran : 0,90 par combat (61 % des combats), contre 1,32 aujourd'hui : moins de Furies, mais chacune frappe deux fois, à coup sûr. Le d9 rend à Gorak une partie du d10 qu'il avait perdu en 0.50.0 pour compenser la Furie instantanée.

**Ce que la livraison toucherait** : les coups instantanés (`instantStrikes`, la Furie seulement) deviennent bruts dans `combat.ts` (ni `forfeits`, ni `reshapes`, ni fenêtres de jet), et `INSTANT_CHAIN` disparaît ; un drapeau sur `Attack` (coup brut) pour que l'audit accepte un 1 à 3 qui frappe (la copie mesurée levait « coup sacrifié incohérent » et « compétence mal déclenchée », attendus) et que l'écran ne l'annonce pas comme une compétence ; texte du statut ; Gorak au d9 ; RESOLUTION § 2, PERSONNAGES § Orcs, FEATURES ; test dans `combat.test.ts` et contrôle dans `audit.test.ts` ; empreinte de non-régression mise à jour.

**Synergies ouvertes** : deux coups qui touchent presque toujours font de Gorak le meilleur porteur des effets « par coup qui touche » : sa Saignée coule deux fois par Furie, les Épines acérées de Brokk le punissent deux fois, une future relique « à chaque coup » se lit d'avance.

### Proposition 3 : le druide, la dualité portée par ses deux auras

**État** : Thaldrin 51,8 %, pire duel Ysolde 35/65, à la limite du budget. Ses six compétences, valeur nette (audit 0.68.0) et part des combats où on les voit : Charge +8,6 (38 %), Aura de pourriture +6,0 (36 %), Coup de griffe +4,5 (34 %), Feux follets +4,1 (39 %), Fleur de vie +3,1 (37 %), Écorce épaisse +2,4 (39 %). Aucune n'est cassée ; la dualité, elle, se réduit à l'alternance : les deux formes ne se parlent pas. Deux remarques de structure :
- **Les Feux follets sont le seul 3 du roster qui ne pose pas d'aura** (règle des races : le 3 donne une aura permanente) ;
- **l'Aura de pourriture double le Poison** (voir le tableau des afflictions), et c'est elle qui fait le duel contre Ysolde : la Pourriture use ses soins sans fin.

La fiche du personnage donne la piste : *« l'ours qui garde rancune de ce que l'homme a subi, l'homme qui panse ce que l'ours a pris »*. Deux statuts d'essai la traduisent, sans crochet nouveau :
- **Rancune** : son prochain coup qui touche fait +N, puis la rancune retombe (même crochet que la Fausse note, `spentOnHit`) ;
- **Sève** : au début de son prochain tour, il regagne N PV (soin et durée d'un tour, existants).

**Offerts en passif, ces liens écrasent tout** : un effet qui agit à chaque coup encaissé vaut cher.

| Passif (sans compétence en échange) | Thaldrin | Δ | Pire duel après |
| --- | --- | --- | --- |
| Rancune +1 (coups encaissés sous forme humaine) | 58,8 % | +7,0 ± 0,9 | Ysolde 70,0 % |
| Rancune +2 / +3 | 66,4 / 72,1 % | +14,6 / +20,3 | Fanchon 78,5 / 87,8 % |
| Sève 1 / 2 (coups encaissés sous forme d'ours) | 56,9 / 62,8 % | +5,2 / +11,0 | Ysolde 67,8 / 71,5 % |
| Rancune +1 et Sève 1 | 64,1 % | +12,3 ± 1,1 | Fanchon 75,5 % |
| La Charge fait éclater l'Écorce restante (dégâts directs) | 52,0 % | +0,2 ± 0,2 | vue dans 4 % des combats : écartée |

**Gagnés au dé, à la place des deux 3, ils tiennent le budget.** Chaque lien devient l'aura de sa forme, permanente et cumulable comme toutes les auras, et agit sur **chaque coup encaissé**, quelle que soit la forme du moment :

| Variante | Thaldrin | Δ | Pire duel après |
| --- | --- | --- | --- |
| Aura de rancune +1 / +2 au lieu de la Pourriture | 45,7 / 48,5 % | −6,1 / −3,3 | Aldric 39,5 / 42,0 % |
| **Aura de rancune +3 au lieu de la Pourriture** | **51,3 %** | −0,4 ± 0,6 (non significatif) | Ysolde 64,8 → **59,5 %** |
| Aura de sève 1 / 3 au lieu des Feux follets | 48,4 / 55,6 % | −3,4 / +3,9 | Ysolde 61,5 / 65,0 % |
| **Aura de sève 2 au lieu des Feux follets** | **52,2 %** | +0,4 ± 0,8 (non significatif) | Ysolde 63,5 % |
| Kit : sève 2 et rancune +2 / sève 3 et rancune +3 | 48,1 / 53,9 % | −3,7 / +2,2 | Brokk 40,5 / Morgrut 60,8 % |
| **Kit : Aura de sève 2 (homme) et Aura de rancune +3 (ours)** | **50,8 %** | −0,9 ± 1,0 (non significatif) | **Fanchon 57,3 %** : tous ses duels entre 43 et 57 % |

Spectacle du kit : combats de 18,6 → 20,0 tours, meneur 0,43 → 0,49 changements par combat, retours 63,8 → 62,9 %, fins serrées 42,6 → 40,3 %.

Deux chemins, au choix de l'utilisateur :
- **A. Retouche d'un seul sort** : l'Aura de pourriture devient l'**Aura de rancune** (+3 sur le prochain coup qui touche, par coup encaissé et par charge). Neutre, et le pire duel du druide passe de 65 à 59,5 % contre Ysolde. L'ours se venge de tout ce que le druide encaisse ; les Feux follets, choisis par l'utilisateur en 0.50.0, restent.
- **B. La dualité** : en plus, les Feux follets deviennent l'**Aura de sève** (2 PV au début de son prochain tour, par coup encaissé et par charge). L'homme soigne, protège et panse (Fleur de vie, Écorce, Sève) ; l'ours charge, déchire et rend les coups (Charge, Griffe, Rancune). Neutre, et le roster le plus resserré des mesures de la série : aucun duel du druide au-delà de 57/43. Prix : la Brûlure n'a plus de porteur, et le spectacle des dégâts en fin de tour adverse disparaît.

Dans les deux cas, la Pourriture et l'Aura de pourriture quittent le jeu : l'harmonisation des poisons s'en trouve finie (il ne reste que Poison, Brûlure et Saignement, un axe chacun). **Non mesuré** : une version fidèle à la lettre de la fiche (la rancune ne s'arme que sous forme humaine, la sève que sous forme d'ours) ; une aura ne sait pas lire la forme, il faudrait un petit ajout au moteur, et des valeurs plus hautes pour la même force.

**Synergies ouvertes** : le coup encaissé devient la ressource du druide. Il répond aux adversaires qui frappent souvent (Fanchon et ses deux dés, la Furie de Gorak, le Coup de chance de Naraxes) : des duels typés, sans contre écrit à la main. Une relique « quand il encaisse » ou une Armure temporaire qui absorbe sans empêcher le coup de compter (l'Écorce) deviennent des choix de construction.

### Questions à trancher avant la passe

1. **Aura glaciale** : cumulable avec Souffle à 2 (recommandée), plafonnée à 1 charge (neutre, des 3 perdus), ou cumulable sans compensation (55,4 %) ?
2. **Furie des vents** : d9 et 18 % de critique (recommandée), ou d10 et 10 % ?
3. **Druide** : chemin A (Aura de rancune seule), chemin B (les deux auras), ou rien ?
4. **Brûlure** : c'est la dernière affliction à deux valeurs (3 PV, 3 tours, une nouvelle remplace l'ancienne). La passer à une seule valeur, sa durée égale à ses dégâts (Brûlure 3 : 3 PV à la fin de ses 3 prochains tours) ? Sans effet sur l'équilibre ; sans objet si le chemin B retire les Feux follets.

### Limites

- Le laboratoire ne modifie qu'un personnage à la fois : l'effet sur le taux global des adversaires (Ysolde surtout) se mesurera au `npm run balance` de la livraison.
- La Furie en coups bruts est mesurée sur une copie patchée, pas sur le dépôt ; le crochet reste à écrire, avec son audit.
- Rien n'a été vu à l'écran ni entendu : le médaillon de Poison qui grossit au tour d'Ervald, les badges des coups bruts (un 2 qui frappe ne doit pas s'annoncer comme une compétence), les nouvelles auras du druide (icônes à peindre : Aura de rancune, Aura de sève).

### Décisions et livraison (0.69.0)

Choix de l'utilisateur, puis livraison mesurée (`npm run balance`, 400 combats par duel, règles 0.69.0) :

| Point | Décision | Après |
| --- | --- | --- |
| Aura glaciale | cumulable, **sans compensation** (livrée) : 1 Poison par charge au début du tour d'Ervald ; crochets `onOpponentTurnStart` et `stoppedByImmunity` retirés | Aura glaciale +7,5 points, Souffle de la tombe +11,9 ; Ervald 52,0 → **54,7 %** ; Brokk contre Ervald 39 % |
| Furie des vents | coups bruts, **d9 et 19 % de critique** (variante de l'utilisateur, 19 % au lieu des 18 % recommandés) | Furie +18,6 points ; Gorak 47,9 → **49,4 %** |
| Brûlure | une seule valeur, durée égale à la valeur (livrée, `turnsFromStacks`) ; Feux follets en Brûlure 3, même force | Feux follets +3,5 points ; Thaldrin 51,8 → 50,5 % |
| Purification double d'Ysolde | livrée, devenue nécessaire : avec l'aura cumulable, Ysolde tombait à **41,3 %** sans elle | Purification +18,0 points ; Ysolde 41,9 → **43,4 %** (43,4 % au laboratoire) |
| Druide | l'utilisateur veut aller plus loin que les chemins A et B : rework de la dualité, proposition à venir (§ 16) | non livré |

Roster : de 43,4 % (Ysolde) à 54,8 % (Aldric), aucun duel hors limites. Duels les plus déséquilibrés : Brokk contre Ervald 39 %, Brokk contre Fanchon 60 %, Naraxes contre Ysolde 60 %.

## 16. Le druide : une aura sur chaque 3, et le relais des formes (livré en 0.71.0)

**Demande** (2026-10-20) : aller plus loin que les chemins A et B du § 15. Donner une aura au 3 de l'homme, puis articuler une mécanique de jeu identitaire autour de la dualité.

**Méthode** : laboratoire, série 10 (400 combats par duel, mêmes graines avant et après, règles 0.69.0, Thaldrin à 50,5 %). La métamorphose provoquée change une règle du moteur : elle a été mesurée sur une copie du dépôt, supprimée depuis, comme la Furie en coups bruts au § 15.

### Ce qui manque au druide

- **Les deux formes ne se parlent pas.** L'alternance est subie (décision de l'utilisateur, 0.35.0 : il change de forme à chacun de ses tours). Rien de ce que fait l'homme ne compte pour l'ours, ni l'inverse : seuls ses statuts passent d'une forme à l'autre (Régénération, Armure temporaire, Aura de pourriture), sans lien de l'une à l'autre.
- **Le 3 de l'homme n'est pas une aura** : c'est le seul 3 du roster dans ce cas (Feux follets, une Brûlure).
- **Ses deux 3 sont des afflictions**, et l'Aura de pourriture double le Poison (§ 15). C'est elle qui fait son pire duel : la Pourriture use les soins d'Ysolde sans fin.
- **Chaque compétence de forme se voit peu** : dans 34 à 39 % des combats (audit 0.68.0), puisqu'il faut le bon chiffre dans la bonne forme.

Ce que doit faire la mécanique : se voir dans **chaque** combat, se dire en une phrase, aller **dans les deux sens**, et suivre la fiche du personnage : *« l'ours qui garde rancune de ce que l'homme a subi, l'homme qui panse ce que l'ours a pris »*.

### Piste écartée : un relais compté coup par coup

Chaque coup encaissé sous forme humaine arme +1 sur le prochain coup qui touche (Rancune) ; chaque coup encaissé sous forme d'ours rend 1 PV au tour suivant (Sève).

| Variante | Thaldrin | Pire duel après |
| --- | --- | --- |
| Relais 1/1, sans rien d'autre | 62,9 % (+12,4) | Fanchon 45,5 → **75,5 %** |
| Relais 1/1, auras +2/+1 au lieu de la Pourriture et des Feux follets | 56,9 % | Fanchon 76,5 % |
| Même chose, griffe +0 et écorce 4 | 51,7 % | Fanchon 72,0 % |
| Même chose, griffe +0 et critique 4 % | 51,1 % | Fanchon 71,5 % |

Compté par coup, le relais écrase les adversaires qui frappent deux fois par action (Fanchon et ses deux dés) : aucune compensation de stats ne le ramène sous 65/35. **Écarté.**

### Proposition A, recommandée : le relais par tour

Le relais devient binaire : **touché au moins une fois** pendant le tour adverse, la forme du moment transmet quelque chose à l'autre.

| | Relais (chaque combat) | 1 | 2 | 3 : l'aura de la forme |
| --- | --- | --- | --- | --- |
| **Homme** (soigner, protéger) | **Rancune** : s'il est touché, le prochain coup de l'ours qui touche fait **+1** | Fleur de vie (Régénération 2, 3 tours) | Écorce épaisse (Armure temporaire 7) | **Aura de sève** (au lieu des Feux follets) : la Sève vaut **4** |
| **Ours** (charger, déchirer) | **Sève** : s'il est touché, l'homme regagne **1 PV** au début de son tour | Charge (valeur maximale du dé) | Coup de griffe (relance + 3) | **Aura de rancune** (au lieu de l'Aura de pourriture) : la Rancune vaut **+4** |

Une nouvelle Rancune ou une nouvelle Sève remplace l'ancienne (une seule à la fois). La Rancune part sur le premier coup qui touche, la Sève au début du tour suivant.

| Variante | Thaldrin | Δ | Pire duel après |
| --- | --- | --- | --- |
| Relais 1/1, en gardant la Pourriture et les Feux follets | 60,6 % | +10,2 ± 1,0 | Ysolde 59,3 → 68,5 % |
| Relais 1/1, auras +2/+2 | 50,1 % | −0,4 ± 1,3 | Morgrut 53,5 → 57,3 % |
| Relais 1/1, auras +3/+2 | 51,2 % | +0,7 ± 1,2 | Morgrut 58,8 % |
| **Relais 1/1, auras +3/+3** | **52,1 %** | +1,7 ± 1,2 | **Morgrut 59,5 %** |
| Relais 1/1, auras +4/+4 | 55,0 % | +4,6 ± 1,2 | Morgrut 64,3 % |
| Relais 2/2 ou 3/3, auras +3/+3 | 65,0 / 74,7 % | +14,5 / +24,2 | Morgrut 75,5 / 85,0 % |

Spectacle (relais 1/1, auras +3/+3) : 7,7 moments par combat, dans **100 %** des combats (contre 34 à 39 % pour chaque compétence de forme) ; combats de 18,7 → 20,0 tours, meneur 0,44 → 0,48, retours 63,8 → 62,4 %, fins serrées 42,1 → 40,9 %.

**Pourquoi A** :
- l'alternance, décidée par l'utilisateur, reste ; elle devient un **échange** : chaque tour dit ce que la forme précédente laisse à la suivante, et le médaillon le montre ;
- les deux 3 deviennent des auras, chacune attachée à sa forme et à son lien ;
- la Pourriture et la Brûlure quittent le jeu (la Brûlure reste au registre, sans porteur) : il ne reste que le Poison et le Saignement comme afflictions du roster ;
- les compétences du 1 et du 2 s'y emboîtent sans retouche : l'Écorce absorbe le coup, mais l'homme est touché, la Rancune s'arme ; la Charge (valeur maximale) porte la Rancune, c'est le coup que l'on attend ; la Fleur de vie et la Sève s'additionnent.

**Synergies ouvertes** : le coup encaissé devient la ressource du druide. Contre un adversaire qui frappe à chaque tour, le relais tourne à plein ; contre une esquiveuse ou la Peur d'Ysolde, il cale. La Purification d'Ysolde peut lui voler une Rancune armée ; une relique « quand il encaisse » ou « au changement de forme » parlerait directement à son identité.

**Ce que la livraison toucherait** : deux statuts (Rancune : +N sur le prochain coup qui touche, `spentOnHit` ; Sève : N PV au début du tour suivant), deux auras, des compétences de forme sur le coup encaissé (`hurt` + `form`, existant). Mesurées, les auras ne comptent qu'une charge (le relais vaut +3 avec l'aura, quelle que soit la pile). Les rendre cumulables comme les autres demande un petit ajout au moteur (une valeur d'effet qui grandit avec les charges d'un statut), et une nouvelle mesure. Il faudrait quatre icônes à peindre : Rancune, Sève, Aura de rancune, Aura de sève.

### Proposition B : la métamorphose provoquée

L'alternance cesse : **l'ours sort quand on frappe l'homme**. Au début de son tour, le druide est ours s'il a été touché depuis son dernier tour, homme sinon. *Il porte en lui un ours qu'il ne maîtrise pas* (sa fiche) : c'est l'adversaire qui le réveille.

| Variante | Thaldrin | Δ | Pire duel après |
| --- | --- | --- | --- |
| Métamorphose provoquée seule | 52,5 % | +2,0 ± 1,4 | Gorak 54,0 → 58,5 % |
| Variante : il change de peau à chaque tour où il est touché | 49,6 % | −0,9 ± 1,4 | Aldric 40,5 % |
| Provoquée, et les auras du relais sans relais de base | 43,6 % | −6,8 ± 1,6 | Brokk 33,8 % |
| Provoquée, et le relais 1/1 avec auras +3/+3 | 55,1 % | +4,6 ± 1,7 | Gorak 62,3 % |

Il est ours dans 58 % de ses actions (47 % aujourd'hui) : 80 % contre Fanchon, 64 % contre Gorak et Morgrut, 50 % contre Elaria. Il change de forme deux fois moins souvent (0,44 changement par action contre 0,92). Le combat choisit sa forme : des duels typés, mais **c'est revenir sur la décision « il change de forme à chaque tour »**, et la règle demande un ajout au moteur. Les auras sur les 3 y trouvent mal leur place (−6,8 seules).

### Questions à trancher

1. **A (relais par tour) ou B (métamorphose provoquée)** ? A est recommandée.
2. **Valeurs de A** : auras +3/+3 (52,1 %, recommandée), ou +2/+2 (50,1 %, plus prudente) ?
3. **Auras du druide** : plafonnées à une charge, comme mesuré et comme l'Aura d'immunité, ou cumulables comme les autres (petit ajout au moteur, puis nouvelle mesure) ?
4. **Noms** : Rancune, Sève, Aura de rancune, Aura de sève, ou d'autres ?

### Limites

- Le laboratoire ne change que Thaldrin : l'effet sur les autres se mesurera au `npm run balance` de la livraison.
- La proposition B a été mesurée sur une copie patchée du moteur, pas sur le dépôt.
- Rien n'a été vu à l'écran : les médaillons de Rancune et de Sève à chaque tour, et le coup de l'ours qui porte la Rancune.

### Décision et livraison (0.71.0)

- **Proposition A** retenue par l'utilisateur : alternance forcée gardée, relais des formes (touché en homme : Rancune 1, dépensée par le prochain coup qui touche ; touché en ours : Sève 1, soignée au début du tour de l'homme), Aura de sève (3 de l'homme) et Aura de rancune (3 de l'ours).
- **Auras à +2 par charge** (choix de l'utilisateur), **cumulables** comme les autres auras (règle commune) ; plafonnées à une charge au laboratoire : 50,1 %.
- **Mesures** (`npm run balance`, 400 combats par duel) : Thaldrin **50,7 %**, ses duels de 45 à 58 % ; roster de 43,8 % (Ysolde) à 54,2 % (Ervald), pire duel inchangé (Brokk contre Ervald, 39 %). Valeurs nettes : Rancune +9,0 (3,8 par combat), Charge +8,9, Sève +7,7 (3,0 par combat), Coup de griffe +5,5, Écorce +3,5, Fleur de vie +2,6, Aura de rancune +0,4, Aura de sève −1,0.
- **Les auras restent faibles** : à +3 par charge, Thaldrin mesuré à 52,1 % au laboratoire ; l'utilisateur garde +2. Levier disponible si le druide fléchit.
- Moteur : `bonusPer` sur `applyStatus`. La Brûlure, la Pourriture et l'Aura de pourriture n'ont plus de porteur.

## 17. Le druide, deuxième refonte : l'homme lance, l'ours frappe, le Bosquet pousse (refusée : trop complexe, voir § 18)

**Demande** (2026-10-20) : le druide de la 0.71.0 reste « trop mou, il ne se passe rien, c'est lent ». Cadre donné par l'utilisateur : sous forme humaine, il ne fait que lancer des sorts (1 et 2), et son 3 est une aura ; sous forme d'ours, il ne lance plus rien et frappe avec +3 ; l'aura, commune ou par forme, est à définir ; introduire le Saignement chez l'ours ; pour la magie, sortir du cadre, par exemple un nouvel élément qui fait un événement sur la scène.

**Méthode** : laboratoire, série 11 (400 combats par duel, sauf les deux premières grilles à 300, règles 0.71.2). Tout s'exprime avec les briques existantes : sous forme humaine, une compétence de début de tour pose un statut qui ramène son dé à un d3 (chaque jet est un sort) ; sous forme d'ours, un statut +3 ; le Bosquet, un statut d'aura lu par des compétences de début de tour selon la forme.

### Le constat

| Mesure (Thaldrin 0.71.2) | Valeur |
| --- | --- |
| Tours par combat | 20,0 (le roster : de 15,2 à 29,6) |
| Jets sans dégâts | 20,8 % |
| Relais | 3,8 Rancunes de +1 et 3,0 Sèves de 1 PV par combat : des chiffres trop petits pour se voir |

### Le cadre seul ne suffit pas

| Kit (homme d3, ours +3 sans compétence) | Thaldrin | Tours |
| --- | --- | --- |
| Fleur de vie / Écorce épaisse, sans Bosquet | 18,5 % | 27,9 |
| Fleur de vie / Feux follets, sans Bosquet | 24,1 % | 21,4 |
| Fleur de vie / Feux follets, Bosquet 3 PV / racines 3 | 70,3 % | 20,6 |
| Fleur de vie / Racines (perte d'action), Bosquet 3 / 3, griffes | 79,4 % | 23,6 |

Un homme qui ne frappe plus doit **faire mal avec ses sorts**, sinon le druide s'effondre ; les sorts défensifs et le contrôle (Racines) allongent les combats au lieu de les accélérer. Le Bosquet est le levier le plus fort : chaque point par palier vaut une dizaine de points de victoire.

### Proposition : l'homme lance, l'ours frappe, le Bosquet pousse

| | 1 | 2 | 3 | Toujours |
| --- | --- | --- | --- | --- |
| **Homme** (son dé devient un d3 : chaque jet est un sort) | **Feux follets** : Brûlure 3 sur l'adversaire | **Lance d'épines** : 5 dégâts directs | **Bosquet** (aura, cumulable) | ne frappe jamais |
| **Ours** (aucun sort) | — | — | — | chaque coup fait **+3** (ses 1 à 3 frappent aussi) ; **Griffes** : chaque coup qui touche laisse **Saignement 1** |
| **Bosquet** (une aura pour les deux formes) | | | | au début du tour de l'homme, il le soigne de 1 PV par palier ; au début du tour de l'ours, ses racines frappent l'adversaire, 1 dégât par palier (2 paliers au plus mesurés) |

**Le Bosquet, l'élément hors cadre** : une aura qui ne vit pas en halo autour du druide, mais **sur la scène**. Un arbre pousse dans l'arène, du côté du druide, et grandit à chaque 3 de l'homme (pousse, arbuste, arbre). Il a deux visages, comme le druide : quand l'homme agit, la sève coule de l'arbre vers lui ; quand l'ours agit, les racines jaillissent du sol sous l'adversaire. C'est le premier élément de décor qui agit pendant un combat. Il ouvre une piste (TODO § 16) : des effets d'arène, des objets posés sur la scène par d'autres personnages.

| Variante | Thaldrin | Δ | Pire duel | Tours | Fins serrées |
| --- | --- | --- | --- | --- | --- |
| Aujourd'hui (0.71.2) | 50,7 % | | Ysolde 55 % | 20,0 | 40,9 % |
| Lance d'épines 6, griffes Saignement 1 | 56,5 % | +5,8 ± 2,1 | Ysolde 66,5 % | 18,0 | 43,1 % |
| **Lance d'épines 5, griffes Saignement 1** | **52,9 %** | +2,1 ± 2,1 | Ysolde 63,7 % | **18,3** | **43,7 %** |
| Lance d'épines 4, griffes Saignement 1 | 48,7 % | −2,0 ± 2,1 | Ysolde 59,8 % | 18,6 | 43,4 % |
| Lance d'épines 6, griffes sur les critiques seulement (Saignement 3) | 52,5 % | +1,8 ± 2,1 | Ysolde 62,3 % | 18,4 | 42,3 % |
| Lance d'épines 6, sans griffes | 50,7 % | 0,0 ± 2,1 | Ysolde 60,0 % | 18,6 | 43,1 % |
| Bosquet qui soigne 2 sans racines | 53,8 % | +3,1 ± 2,1 | Brokk 65,8 % | 20,4 | 40,9 % |
| Fleur de vie / Lance d'épines 6 (un homme soigneur) | 46,6 % | −3,5 ± 2,4 | Ervald 36,3 % | 21,9 | 36,7 % |

**Pourquoi** : le combat du druide passe de 20,0 à 18,3 tours et devient plus serré (fins serrées 40,9 → 43,7 %). À chaque tour il se passe quelque chose de visible : un sort (pas un jet sacrifié), ou un coup d'ours qui touche presque toujours et laisse une plaie, plus le Bosquet au début du tour. Le Saignement trouve un porteur naturel : chaque coup de griffes ouvre une plaie, et le coup suivant de l'ours la fait couler. L'homme ne soigne plus que par son Bosquet : il devient le mage, l'ours la bête.

**Risque** : Ysolde à 63,7 % contre lui, sous le plafond de 65 % mais c'est la plus basse du roster ; la Lance à 4 la ramène à 59,8 %.

### Ce que la livraison demanderait

- **Moteur** : des stats par forme (`forms[].stats` : le d3 de l'homme), et un bonus de dégâts de forme (+3 de l'ours) ; le Bosquet comme statut qui agit selon la forme du porteur (ou des compétences de début de tour, comme au laboratoire) ; un effet de soin ou de dégâts qui grandit avec les charges d'un statut (`bonusPer`, aujourd'hui sur `applyStatus` seulement).
- **Écran** : un composant nouveau, le Bosquet sur la scène (trois tailles, un jaillissement de racines, un filet de sève), et un dé d3 pour l'homme.
- **Images** : l'arbre en trois tailles et les racines (prompts à écrire, STYLE_BIBLE), les icônes Lance d'épines, Griffes, Bosquet.
- Retirés : Fleur de vie, Écorce épaisse, Charge, Coup de griffe, le relais (Rancune, Sève) et ses deux auras.

### Questions à trancher

1. **Lance d'épines à 5** (52,9 %) ou **à 4** (48,7 %, plus douce pour Ysolde) ?
2. **Griffes** : Saignement 1 à chaque coup qui touche (recommandé), ou Saignement 3 sur les critiques seulement ?
3. **Le Bosquet sur la scène** : d'accord pour un élément de décor qui pousse et agit ? Il demande des images.
4. **L'homme n'est plus soigneur** (seul le Bosquet soigne) : acceptable pour sa fiche, « il soigne sous sa forme d'homme » ?

## 18. Le druide simple : un mage, une bête, une aura (livré en 0.73.0)

**Retour de l'utilisateur sur le § 17** : non. « On n'arrive déjà pas à définir le druide dans sa forme actuelle ; un Bosquet ajouterait une couche de complexité. » Le cadre reste le sien : l'homme ne fait que lancer des sorts (1 et 2) et pose une aura sur un 3 ; l'ours ne lance rien, frappe à +3 et fait saigner.

### D'abord, le définir en une phrase

> **Un tour sur deux, l'homme lance la foudre ou le feu ; l'autre tour, la bête frappe et déchire.**

Chaque forme a un seul verbe, et aucune règle ne relie les deux formes en dehors de l'aura. Ce qui disparaît : les six compétences de forme, le relais (Rancune, Sève) et ses deux auras. Ce qui reste à retenir : 2 sorts, 1 aura, 2 règles de forme (le d3 de l'homme, le +3 de l'ours) et les griffes.

### Le sort qui fait un événement sur la scène, sans règle en plus

Le « hors cadre » demandé passe par l'écran, pas par une mécanique. **La Foudre** assombrit l'arène un instant et un éclair tombe sur l'adversaire ; **les Feux follets** tournent autour de lui tant qu'il brûle, avec l'orbite de lucioles qui existe déjà (`Fighter.tsx`, `firefly-orbit`). Le joueur voit un sort à chaque tour de l'homme, mais il n'y a rien de plus à comprendre.

### Une erreur de mesure corrigée

Au laboratoire, le d3 de l'homme et le +3 de l'ours sont imités par deux statuts posés au début de chaque tour. Comme ce sont des bonus, la Purification d'Ysolde les retirait à la place d'un vrai bonus : elle perdait son coup, et le druide écrasait Ysolde (de 93 à 99 % dans les essais). Ces statuts sont maintenant rangés à part, hors de portée des purges, comme le seraient de vraies stats de forme. **Les pires duels contre Ysolde du § 17 étaient faussés par cette imitation.**

### Mesures (série 12, 400 combats par duel, Thaldrin 0.71.2 à 50,7 %, 20,0 tours)

| Homme (1 / 2) | Aura | Griffes | Thaldrin | Pire duel | Tours | Fins serrées |
| --- | --- | --- | --- | --- | --- | --- |
| **Foudre 5 / Feux follets (Brûlure 3)** | **sauvage, +2 par charge aux coups de l'ours** | **Saignement 1** | **51,5 %** | **Brokk 63,7 %** | **17,2** | **45,2 %** |
| Foudre 4 / Feux follets | sauvage | Saignement 1 | 47,7 % | Brokk 60,5 % | 17,5 | 44,4 % |
| Foudre 6 / Feux follets | sauvage | aucune | 49,8 % | Brokk 61,5 % | 17,4 | 45,7 % |
| Foudre 6 / Soin 6 (un homme qui soigne) | sauvage | Saignement 1 | 49,6 % | Brokk 61,8 % | 20,0 | 41,2 % |
| Foudre 5 / Feux follets | nature, +2 aux coups de l'ours et à la Foudre | Saignement 1 | 55,2 % | Brokk 67,0 % | 17,0 | 44,6 % |
| Foudre 4 / Feux follets | nature | Saignement 1 | 51,9 % | Brokk 65,0 % | 17,2 | 44,2 % |
| Foudre 6 / Racines (l'adversaire perd son action) | nature | Saignement 1 | 63,0 % | Brokk 74,3 % | 19,4 | 42,9 % |
| Foudre 6 / Soin 6 | soin de 2 par charge à chaque tour | Saignement 1 | 66,7 % | Brokk 80,8 % | 28,3 | 27,1 % |

Ce que montrent les mesures :
- **Le kit recommandé accélère et resserre** : 20,0 → 17,2 tours (le druide passe parmi les combats rapides du roster, de 15,2 à 29,6 tours), fins serrées 40,9 → 45,2 %, retours 62,2 → 64,9 %. Il se voit à chaque tour : un sort, ou un coup d'ours qui touche presque toujours.
- **Une aura de soin ou d'armure tue le rythme** : le combat traîne (28 à 82 tours) et le druide écrase tout. L'aura doit faire mal, pas durer.
- **Le contrôle (Racines) allonge et écrase** : écarté.
- **Un homme soigneur ne rend pas le combat plus rapide** (20,0 tours) : la Foudre et le feu, si.

### La proposition

| | 1 | 2 | 3 | À chaque tour |
| --- | --- | --- | --- | --- |
| **Homme** (son dé est un d3 : chaque jet est un sort) | **Foudre** : 5 dégâts directs | **Feux follets** : Brûlure 3 | **Aura sauvage** : +2 par charge aux coups de l'ours, cumulable | ne frappe jamais |
| **Ours** (aucun sort) | | | | chaque coup fait **+3**, un 1, un 2 ou un 3 compris ; **Griffes** : chaque coup qui touche laisse **Saignement 1** |

**L'aura** répond à « la même pour les deux formes, ou une pour les deux ? » : une seule, posée par l'homme, qui sert la bête. L'homme prépare, l'ours frappe. C'est la règle de l'Aura de puissance de Gorak, sous un autre nom ; la variante « nature » (elle renforce aussi la Foudre) coûte une règle de plus et sort du budget à Foudre 5.

**Fiche** : il n'est plus soigneur. Forces : un sort à chaque tour d'homme ; un ours qui frappe toujours à +3 et fait saigner ; une aura qui rend l'ours de plus en plus dangereux. Faiblesses : aucun soin ni armure ; l'homme ne frappe jamais ; forme imposée.

**Ce que la livraison demanderait** : des stats par forme (le dé de l'homme, un bonus de coup pour l'ours), plutôt que les statuts du laboratoire ; trois compétences sur l'homme (Foudre, Feux follets, Aura sauvage) et les griffes de l'ours ; la Foudre à l'écran (assombrissement, éclair) ; les icônes Foudre, Aura sauvage, Griffes ; le dé d3 de l'homme dans la zone des dés. Retirés : Fleur de vie, Écorce épaisse, Charge, Coup de griffe, Rancune, Sève, Aura de sève, Aura de rancune.

### Questions à trancher

1. **Le kit** : Foudre 5 / Feux follets (recommandé, 51,5 %, 17,2 tours), ou un homme qui soigne (Foudre 6 / Soin 6, 49,6 %, 20,0 tours) ?
2. **L'aura** : sauvage, pour l'ours seul (recommandée), ou nature, pour l'ours et la Foudre (une règle de plus, Foudre à 4 pour rester dans le budget) ?
3. **La Foudre à l'écran** : un éclair et un assombrissement de l'arène, sans rien d'autre dans les règles : d'accord ?

### Décision et livraison (0.73.0)

- **Foudre 5 / Feux follets** (choix de l'utilisateur) : sur le 1 de l'homme, 5 dégâts directs ; sur le 2, Brûlure 3. L'homme (statut de forme **Incantation**) lance un d3 et ne frappe jamais.
- **Aura sauvage, pour l'ours seul** (choix de l'utilisateur) : +2 par charge aux coups, cumulable ; seul l'ours frappe.
- **Pas de Saignement, une Force de l'ours à +4 au lieu de +3** : l'utilisateur veut de gros coups plutôt que des griffes qui font saigner. Sans Saignement, +3 donnait 45,9 % au laboratoire ; +4 donne 54,0 %, et 54,0 % sur le roster livré.
- **Statuts de forme** (`innate`) : le d3 et le +4 sont de vrais statuts, posés et retirés avec la forme, hors de portée des purges et des immunités (la leçon de « Une erreur de mesure corrigée »).
- **La Foudre à l'écran** : le premier **événement de scène** (`lightning` : l'arène s'assombrit, un éclair tombe sur la cible, l'arène blanchit, les dégâts à l'impact), présentation seule, gabarit pour les coups spéciaux d'autres personnages.

Mesures (`npm run balance`, 400 combats par duel, règles 0.73.0) : Thaldrin 50,7 → **54,0 %**, ses combats de 20,0 à **17,0 tours**, **11,1 dégâts par coup** (le plus haut du roster) ; ses duels de 48 à 65 %, Brokk à 35,3 % contre lui (sous le plafond). Valeurs nettes : Foudre **+10,8**, Feux follets **+10,3**, Aura sauvage **+4,7** points. Apport des statuts : Force de l'ours 14,0 PV, Brûlure 8,6, Aura sauvage 5,5 par combat.

**0.76.0, la Foudre en trois éclairs** (demande de l'utilisateur : « 3 éclairs qui tombent à la suite à des endroits un peu différents, 2 chacun, impossible de critiquer ») : 3 × 2 dégâts directs (6 au lieu de 5, `hits`), jamais critiques, un éclair par coup à l'écran. Compensation, choix de l'agent : Force de l'ours +4 → **+3** (sans elle, Thaldrin 58,0 % et Brokk 31,5 % contre lui). Avec : Thaldrin 54,0 → **49,8 %**, 17,4 tours, 10,1 dégâts par coup ; ses duels de 38 à 62 % (Brokk 38,5 %). Valeurs nettes : Foudre **+15,6**, Feux follets **+11,6**, Aura sauvage **+5,5** points.

## 19. Revue des compétences sur l'attaque de base (phase 5 ter, audit du 2026-10-24, règles 0.106.1)

_Demande de l'utilisateur : « on sait qu'on doit repasser sur les compétences : le d6, et maintenant la mécanique d'attaque et de dé ». Audit lancé à sa demande ; rien n'est encore changé dans le roster._

### Ce qui a changé pour les compétences

Jusqu'à la 0.105.0, une compétence **coûtait son coup** : sa valeur nette était un échange. Depuis la 0.106.0, elle se **greffe** sur un coup qui part de toute façon : elle est un gain pur, et sa valeur se lit seule. Deux conséquences : la grille de l'audit signale « écrasante » bien plus souvent (un gain pur dépasse vite 20 points), et les compétences qui agissent **à chaque coup** (auras de coup) ont doublé de poids, puisqu'il y a désormais un coup à chaque jet.

### Mesure 1 : chaque compétence dans son kit (`scripts/skills.report.ts`, 200 combats par duel)

Valeur : points de victoire perdus si on la retire (sa face devient nue, le coup part quand même). Rapport complet : `logs/skills/2026-10-23-23-52-53_v0.106.1.md`.

| Personnage | Face 1 | Valeur | Face 2 | Valeur | Écart dans le kit |
| --- | --- | --- | --- | --- | --- |
| Gorak | Pourfendre | +8,0 | **Furie des vents** | +19,5 | la signature porte le kit |
| Elaria | **Œil de faucon** | +20,6 | Esquive améliorée | +16,7 | équilibré |
| Brokk | Peau de pierre | +19,3 | **Épines acérées** | +20,2 | équilibré |
| Ervald | Vol de vie | +23,4 | **Aura glaciale** | +17,9 | équilibré |
| Ysolde | Purification | +18,4 | **Aura de sainteté** | +31,7 | la signature écrase |
| Naraxes | **Pile ou face** | **+4,5** | Aura de décoction | **+41,9** | la signature ne pèse rien |
| Aldric | **Rétribution** | **+38,0** | Riposte | +12,6 | la signature écrase |
| Thaldrin (homme) | Foudre, faces 1 à 3 | +18,5 | Feux follets, faces 4 à 6 | +35,8 | — |
| Fanchon | Ouverture (début du combat) | +25,2 | cinq doubles à compétence | +1,5 à +5,0 chacun, +15,0 ensemble | les doubles sont « rares à l'écran » (vus dans 17 % des combats chacun) |

En gras : la signature. Drapeaux de lecture : Purification (texte de 265 caractères), Pourfendre (173), Pile ou face (147).

### Mesure 2 : chaque compétence gravée (mesure jetable, 200 combats par duel)

Ce que vaut une gravure en campagne : la compétence gravée sur la face 3 (nue) de huit hôtes (tous sauf le druide et la barde), contre le roster, avant → après. C'est la valeur d'un choix de forge.

| Compétence | Moyenne | De … à … |
| --- | --- | --- |
| Rétribution | **+27,8** | Naraxes +23,7 à Ysolde +30,6 |
| Aura de décoction | **+27,3** | Aldric +24,1 à Ysolde +30,6 |
| Aura de sainteté | **+22,9** | Morgrut +21,3 à Ervald +24,6 |
| Aura d'intimidation | **+21,9** | Aldric +15,8 à Ysolde +29,0 |
| Peur | +20,4 | Naraxes +18,0 à Ysolde +25,2 |
| Vol de vie | +19,9 | Aldric +15,5 à Ysolde +23,9 |
| Aura de puissance | +19,6 | Naraxes +16,5 à Elaria +21,8 |
| Aura sauvage | +19,6 | **identique à l'Aura de puissance, hôte par hôte** |
| Purification | +17,6 | Naraxes +13,5 à Elaria +20,6 |
| Souffle de la tombe | +17,4 | Naraxes +13,8 à Ervald +20,4 |
| Aura d'immunité | +17,3 | Naraxes +14,0 à Ysolde +21,1 |
| Feux follets | +16,3 | Naraxes +11,8 à Ysolde +18,1 |
| Esquive améliorée | +15,9 | Naraxes +12,3 à Ysolde +21,0 |
| Peau de pierre | +14,8 | Aldric +8,3 à Ysolde +19,3 |
| Furie des vents | +14,7 | Naraxes +10,4 à Morgrut +20,9 |
| Riposte | +14,4 | Naraxes +9,6 à Gorak +16,1 |
| Œil de faucon | +14,3 | Naraxes +9,7 à Morgrut +21,4 |
| Épines acérées | +13,1 | Naraxes +8,9 à Gorak +15,6 |
| Aura glaciale | +12,8 | Aldric +10,3 à Ysolde +14,4 |
| Foudre (une face) | +9,0 | Naraxes +5,4 à Gorak +10,6 |
| Pile ou face | +8,3 | Aldric +5,3 à Morgrut +10,9 |
| Pourfendre | +7,2 | Naraxes +5,0 à Brokk +9,2 |
| Aura de précision | +7,2 | Morgrut +0,4 à Elaria +12,8 |
| Coup de chance | **+3,3** | **Morgrut −3,7** à Ysolde +8,3 |

**Lecture** :
- **L'écart est de 1 à 8** entre la meilleure et la pire gravure (+27,8 contre +3,3) : un choix de forge n'en est pas un quand deux compétences valent huit fois les autres. Repère proposé, comme pour les reliques : une gravure entre **8 et 20 points**.
- **Les auras qui agissent à chaque coup ont doublé** (Décoction, Intimidation : un coup à chaque jet depuis la 0.106.0) ; la Rétribution remplit ses trois jauges à chaque tour adverse.
- **Un doublon** : l'Aura sauvage et l'Aura de puissance ont la même règle (+2 par charge aux coups, après le critique) et la même valeur sur chaque hôte. Le texte de l'Aura sauvage est faux depuis la 0.106.0 (« elle sert l'ours, le seul qui frappe » : l'homme frappe aussi).
- **Naraxes** est la plus déséquilibrée dans son kit : sa signature (Pile ou face, +4,5) ne pèse rien, son Aura de décoction (+41,9) fait tout. En campagne, partie de sa signature seule, elle joue sans ce qui la fait gagner en duel.
- **Naraxes est le plus mauvais hôte** de presque toutes les gravures, **Ysolde le meilleur**. Hypothèse, non mesurée : Naraxes gagne déjà ses combats par l'Aura de décoction, une face de plus y change moins ; les soins d'Ysolde font durer ses combats, et une compétence a plus de tours pour agir.
- **La barde** : un double donné tombe 1 fois sur 36 ; ses cinq doubles à compétence ensemble (+15,0) pèsent moins que son Ouverture (+25,2). Ce n'est pas une compétence à retoucher, c'est la question de son identité.

### Proposition (à valider, rien n'est codé ; chaque changement passera au laboratoire avant livraison)

| Compétence | Verdict | Proposition | Compensation, si le personnage sort de la tolérance |
| --- | --- | --- | --- |
| Furie, Œil de faucon, Esquive améliorée, Peau de pierre, Épines acérées, Aura glaciale, Souffle de la tombe, Purification, Riposte, Aura d'immunité, Vol de vie, Aura de puissance, Feux follets, Peur | **garder** | valeurs inchangées (gravure de +12,8 à +20,4) ; Purification : texte à raccourcir | — |
| Rétribution | **baisser** | relâche **la moitié** des jauges (arrondi au-dessus), ou deux jauges au lieu de trois ; à choisir au laboratoire | Riposte de 2 à 3 charges, ou +1 attaque |
| Aura de décoction | **baisser** | **1 Poison** par charge et par coup (au lieu de 2) | Pile ou face renforcée (ligne suivante) |
| Pile ou face (signature) | **renforcer, lire l'attaque** | pile : **ce coup ×3** (au lieu de ×2) ; face : le coup normal. Un gros coup sur deux, le joueur de hasard | — |
| Aura de sainteté (signature) | **baisser** | 2 charges au plus (au lieu de 3) | Purification ou +1 attaque |
| Aura d'intimidation (hors kit) | **baisser** | −1 par charge (au lieu de −2) : sur une attaque de 5, −2 retirait 40 % de chaque coup | — |
| Aura sauvage (hors kit) | **différencier** | **+1 à l'attaque par charge** : elle écrit la feuille (la ligne « Attaque » monte), compte avant le critique, sert l'homme et l'ours ; l'Aura de puissance garde +2 après le critique | — |
| Coup de chance (hors kit) | **réécrire** | se **greffe** au lieu de remplacer : le coup part, et l'action suivante a un jet de plus (la règle actuelle fait perdre un coup pour en gagner un plus tard : Morgrut y perd) | — |
| Pourfendre | **renforcer, lire l'attaque** | s'il touche : **Saignement égal à la moitié du coup** (au lieu de 2) ; texte raccourci | — |
| Aura de précision (hors kit) | **renforcer** | +1 au multiplicateur **et +5 % de critique** par charge (sans critique, Morgrut n'en tire rien : +0,4) | — |
| Foudre | garder | 3 × 1 sur trois faces ; seule elle vaut +9,0 gravée, à la limite basse | — |
| La barde | **question d'identité** | voir ci-dessous | — |

### Questions à trancher

1. **Le repère de 8 à 20 points par gravure** : d'accord pour régler les compétences sur cette bande, comme les reliques ?
2. **Les signatures** : Pile ou face doit-elle porter Naraxes (pile ×3, et la Décoction baissée), ou la signature de Naraxes devient-elle l'Aura de décoction ?
3. **L'Aura sauvage** : +1 à l'attaque par charge (une aura qui écrit la feuille), ou on la retire comme doublon ?
4. **La barde** : ses doubles restent un spectacle rare (chacun 1 fois sur 36) et l'Ouverture porte son kit ; ou on rend les doubles plus fréquents (un double sur deux dés de trois faces, par exemple) ; ou ses compétences passent sur les faces, comme les autres, et ses deux dés ne servent plus qu'à frapper deux fois ?

### Décisions de l'utilisateur (2026-10-24)

1. Repère d'une gravure : **8 à 20 points**, toute compétence gravable doit y entrer.
2. La signature de Naraxes devient l'**Aura de décoction** ; Pile ou face reste dans son kit, renforcée (pile ×3).
3. **Aura sauvage : +1 à l'attaque par charge** (elle écrit la feuille, avant le critique).
4. **La barde** : ses compétences passent sur les faces, ses deux dés frappent deux fois (partie A, voir PERSONNAGES.md).

### Livraison (0.107.0)

Mesures : `scripts/skills.report.ts` (table 2, 200 combats par duel, `logs/skills/2026-10-24-00-45-58_v0.106.1.md` avant, `logs/skills/2026-10-24-01-15-40_v0.106.1.md` après) ; Rétribution choisie au laboratoire (série 16, 400 combats par duel) ; équilibre au laboratoire (série 17) puis `BALANCE_N=800 npm run balance` (`logs/balance/2026-10-24-00-45-02` avant, `2026-10-24-01-14-36` après).

| Compétence | Changement | Kit (avant → après) | Gravure (avant → après) |
| --- | --- | --- | --- |
| Rétribution | la moitié des jauges, **arrondie au-dessous** (au-dessus : +20,8 gravée) ; « deux jauges » mesurée : Aldric 40,9 %, gravure +25,3 | +38,3 → +21,6 | +28,5 → +19,6 |
| Aura de décoction | 1 Poison par charge (2) ; signature de Naraxes | +41,0 → +16,0 | +28,1 → +17,5 |
| Pile ou face | pile : ce coup ×3 (×2) ; texte de 147 à ~75 caractères | +4,8 → +16,2 | +8,3 → +14,6 |
| Aura de sainteté | 2 charges au plus (3) **et 1 PV par charge** (2) : le plafond seul la laissait à +23,1 | +32,1 → +13,9 | +23,5 → +13,8 |
| Aura d'intimidation | −1 par charge (−2) | hors kit | +21,9 → +14,7 |
| Aura sauvage | +1 à l'attaque par charge (+2 après le critique) | hors kit | +20,7 → +15,2 |
| Coup de chance | se greffe (remplaçait) | hors kit | +3,2 → +19,6 |
| Pourfendre | Saignement = moitié des PV retirés, arrondie au-dessus (2) ; texte de 173 à ~115 caractères | +8,2 → +16,6 | +7,8 → +14,0 |
| Aura de précision | +1 au multiplicateur et +5 % de critique par charge | hors kit | +7,3 → +13,5 |
| Purification | texte de 265 à ~110 caractères, règle inchangée | +19,2 → +21,7 | +18,7 → +18,6 |
| Soliste | **une fois par combat** (`limit: 1`) : à chaque 2, +23,0 gravé | +18,2 → +7,9 | +22,9 → +19,5 |
| Crescendo | **monte** : ×2, puis ×1 de plus à chaque fois qu'il touche (`buildsUp`) : il n'est plus un Soliste plus faible | hors kit | +13,8 → +18,6 |
| Peur | **une fois par combat** (+20,4 à deux fois) | hors kit | +21,7 → +14,0 |
| Vol de vie | 1 charge par 1 (2), plafond 2 | +23,1 → +14,6 | +20,6 → +14,4 |
| Aura de puissance | **non cumulable** (+2 par charge cumulable ; plafond 2 : +21,8) | hors kit | +20,7 → +17,9 |

Les 29 compétences gravables sont dans la bande : de +10,4 (Foudre) à +19,7 (Esquive améliorée), au lieu de +3,2 à +28,5. Personnages compensés (stats, après les compétences, jamais les PV) : Aldric attaque 4 à 6 (3 à 5), Ysolde 5 à 7 (4 à 6), Naraxes 5 à 6 (4 à 5), Ervald 24 % de critique (16), Gorak 14 % (19), Fanchon 10 % d'esquive (6). Roster de 46,8 % (Ervald) à 54,3 % (Naraxes), pire duel 61,9 % (Elaria contre Morgrut) ; tours par combat, moyenne des personnages, 15,8 → 15,2.

## 20. L'axe de rang de chaque compétence (E1 à E3, 0.110.0)

**Décision de l'utilisateur** (2026-10-24, revue `REVUE_CONTENU.md`, E1 à E3) : toutes les compétences s'aiguisent ; l'évolution d'une compétence se fait sur un axe qui dépend d'elle ; « un rang ajoute moins » : de +3 à +8 points de victoire par rang (Pourfendre II valait +6,0 et le Souffle aiguisé +6,3 dans la revue ; la Furie II +20,1 dans le kit de Gorak et la Foudre aiguisée +15,2 gravée chez Gorak, chiffres d'avant la correction de la Furie du lot A).

**Ce qui change** : chaque compétence déclare `rankAxis` (`events.ts`), lu par `forge.ts` à la place de la règle commune (une charge par statut cumulable sous son plafond, +2 aux dégâts, soins et relâches). Six genres d'axe : charges, montant, intensité du statut posé (`Status.power`, que le statut lit lui-même), coup ×N, une fois de plus par combat, part relâchée. Quand le plus petit pas entier dépasse +8, l'axe est un **demi-rang** (`per: 0.5`) : +1 une fois sur deux, dès la première (sans tirage, [RESOLUTION.md](RESOLUTION.md) § 6) ; l'intensité d'une aura se paie alors à chacune de ses actions, et non à la pose (`powerPaidOnAction`) : payée à la pose, elle valait déjà tout (Aura glaciale +10,2), payée à partir de la deuxième pose, presque rien (+1,8).

Mesure : table 3 de `scripts/skills.report.ts`, 200 combats par duel, face 3 de chaque hôte. Avant (règle commune, moteur du lot A) : `logs/skills/2026-10-24-16-25-47_v0.109.1.md` ; après : `logs/skills/2026-10-24-16-59-15_v0.109.1.md`.

| Compétence | Axe (rang II) | I → II avant | I → II après | II → III après | Dans le kit (après) |
| --- | --- | --- | --- | --- | --- |
| Foudre | +1 par éclair une fois sur deux | +15,1 | +6,5 | +2,3 | Thaldrin +11,8 (trois faces) |
| Furie des vents | intensité : +1 coup par rafale une fois sur deux | +15,0 | +7,9 | +1,9 | Gorak +12,3 |
| Aura glaciale | intensité à demi : +1 Poison un tour sur deux | +10,9 | +7,5 | +2,7 | Ervald +10,8 |
| Aura de décoction | intensité à demi : +1 Poison un coup qui touche sur deux | +10,6 | +7,4 | +2,5 | Naraxes +9,7 |
| Esquive améliorée | +1 charge une fois sur deux | +9,6 | +7,3 | +2,3 | Elaria +9,2 |
| Épines acérées | intensité à demi : +1 Saignement un coup encaissé sur deux | +9,6 | +6,1 | +2,7 | Brokk +8,8 |
| Aura d'intimidation | +1 charge une pose sur deux | +9,3 | +8,0 | +1,3 | hors kit |
| Coup de chance | +1 charge une fois sur deux | +9,1 | +7,7 | +1,5 | hors kit |
| Vol de vie | intensité : +2 PV par coup drainé | +8,2 (puis plus rien : plafond) | +3,7 | +2,7 | Ervald +4,6 |
| Aura de précision | +1 charge une pose sur deux | +8,0 | +6,6 | +1,4 | hors kit |
| Œil de faucon | +1 charge | +7,7 | +7,7 | +3,1 | Elaria +12,2 |
| Aura sauvage | +1 charge une pose sur deux | +7,6 | +6,5 | +1,1 | hors kit |
| Aura mélodieuse | +1 charge une pose sur deux | +7,5 | +6,3 | +1,2 | Fanchon +16,0 (deux dés) |
| Crescendo | coup ×1 de plus | +6,5 | +6,5 | +4,0 | hors kit |
| Soliste | coup ×1 de plus | +6,1 | +6,1 | +4,3 | Fanchon +4,3 |
| Souffle de la tombe | +1 Poison | +6,1 | +6,1 | +3,9 | hors kit |
| Aura de sainteté | intensité à demi : +1 PV un tour sur deux | +5,3 (puis plus rien : plafond) | +4,7 | +3,5 | Ysolde +5,5 |
| Pourfendre | +1 Saignement | +4,7 | +4,7 | +3,4 | Gorak +5,9 |
| Siffloter | +1 Sifflotement | +3,6 | +3,6 | +1,9 | hors kit |
| Purification | +3 à sa lumière de repli | +3,0 (+2) | +4,3 | +3,1 | Ysolde +6,6 |
| Fausse note | intensité : +1 coup qui touche une fois sur deux | +2,6 (charges) | +6,4 | +2,3 | hors kit |
| Peau de pierre | +2 Armure temporaire | +2,1 (+1) | +3,9 | +2,9 | Brokk +5,7 |
| Rétribution | +25 % des jauges relâchées | +0,9 (minimum +2) | +6,4 | +4,5 | Aldric +9,9 |
| Riposte | intensité : +2 PV à chaque coup renvoyé | ne s'aiguisait pas | +7,0 | +4,7 | Aldric +9,1 |
| Peur | une fois de plus par combat | ne s'aiguisait pas | +6,5 | +2,2 | hors kit |
| Feux follets | +1 Brûlure (4 PV pendant 4 tours) | ne s'aiguisaient pas | +5,9 | +3,5 | Thaldrin +16,3 (trois faces) |
| Aura de puissance | intensité : +1 à chaque coup | ne s'aiguisait pas | +5,3 | +3,5 | hors kit |
| Aura d'immunité | intensité : +1 d'armure | ne s'aiguisait pas | +8,0 | +5,1 | hors kit |
| Pile ou face | intensité : pile ×1 de plus | ne s'aiguisait pas | +3,7 | +2,1 | Naraxes +5,2 |

**Pas entiers écartés** (même mesure) : Furie, un coup de plus à chaque rafale +9,8 ; Foudre, +1 par éclair à chaque fois +8,7 ; Fausse note, un coup de plus à chaque fois +8,6 ; Aura glaciale, de décoction, Épines, une charge de plus (intensité entière) +10,2, +9,9, +8,8 ; Aura de sainteté, +1 PV à chaque tour +8,1. Demi-rang payé à partir de la deuxième fois (⌊ ⌋ au lieu de ⌈ ⌉) : trop faible, de +1,7 (Épines) à +3,3.

**Les 29 rangs II sont dans la bande**, de +3,6 (Siffloter) à +8,0 (Aura d'intimidation et d'immunité, au bord). Le rang III ajoute moins (de +1,1 à +5,1) : un demi-rang paie dès la première fois au rang II, et seulement une fois sur deux de plus au rang III. **Feux follets** : ils s'aiguisent ; ils ne se copient pas, par la règle « une compétence sur deux faces au plus » (`MAX_COPIES`) : ils en occupent déjà trois. **Équilibre** : aucun kit de base ne change (le rang I est identique, l'empreinte de `balance.test.ts` n'a pas bougé) ; `npm run balance` n'a pas été relancé.

**Contrôle des bords** (800 combats par duel, `logs/skills/2026-10-24-17-01-22_v0.109.1.md`) : Furie des vents +8,0, Coup de chance +7,8, Aura d'intimidation +7,8, Aura d'immunité +7,7, Œil de faucon +7,6 ; aucun drapeau.

### Plus de demi-rang (0.111.0)

**Retour de l'utilisateur** (partie du 2026-10-24) : « l'Aura de sainteté rend un chiffre à virgule ». Il ne veut pas de décimale. **Règle** : chaque `rankAxis.per` est un entier ≥ 1, et `validateRoster` refuse un axe à virgule ; la part de la Rétribution se compte en points de pourcentage (`per: 25`, la relâche passe de 50 à 75 % puis 100 %, comme avant). Le code du demi-rang est retiré : `paidOnFire`, `effectsOnFire`, la note « une fois sur deux, dès la première » du texte et de `rankText`, `powerPaidOnAction`, les textes « 2 puis 1 » et les badges « 1,5 » des auras, le compte d'actions par statut du moteur, le contrôle « demi-rang payé » de l'audit.

**Choix de l'axe** : pour les treize compétences à `per: 0.5`, l'axe reste le même, à 1 (un autre axe entier ne fait pas mieux, voir plus bas) ; la Rétribution garde sa part, +25 points de pourcentage. Mesure : table 3, 200 combats par duel, face 3 de chaque hôte ; avant : `logs/skills/2026-10-24-20-52-35_v0.110.1.md` (identique à la table ci-dessus) ; après : `logs/skills/2026-10-24-20-59-58_v0.110.1.md` ; contrôle des bords à 800 combats par duel : `logs/skills/2026-10-24-21-03-10_v0.110.1.md`.

| Compétence | Axe (rang II) | I → II demi-rang (0.110.1) | I → II entier (0.111.0) | à 800 combats | II → III | Dans le kit (après) | Bande |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Aura glaciale | +1 Poison par tour | +7,5 | **+10,2** | | +3,8 | Ervald +14,7 | au-dessus |
| Aura de décoction | +1 Poison par coup qui touche | +7,4 | **+9,9** | | +3,8 | Naraxes +13,7 | au-dessus |
| Furie des vents | +1 coup par rafale | +7,9 | **+9,8** | | +5,3 | Gorak +15,6 | au-dessus |
| Esquive améliorée | +1 charge | +7,3 | **+9,6** | | +3,8 | Elaria +11,8 | au-dessus |
| Aura d'intimidation | +1 charge | +8,0 | **+9,3** | | +4,0 | hors kit | au-dessus |
| Coup de chance | +1 charge | +7,7 | **+9,1** | | +3,8 | hors kit | au-dessus |
| Épines acérées | +1 Saignement par coup encaissé | +6,1 | **+8,8** | +9,1 | +4,2 | Brokk +12,3 | au-dessus |
| Foudre | +1 à chacun de ses 3 éclairs | +6,5 | **+8,7** | +8,9 | +6,3 | Thaldrin +18,7 | au-dessus |
| Fausse note | +1 coup qui touche | +6,4 | **+8,6** | +8,5 | +4,4 | hors kit | au-dessus |
| Aura de sainteté | +1 PV par tour | +4,7 | **+8,1** | +8,1 | +5,4 | Ysolde +9,8 | au bord, au-dessus |
| Aura de précision | +1 charge | +6,6 | +8,0 | +8,2 | +5,0 | hors kit | au bord, au-dessus à 800 |
| Aura sauvage | +1 charge | +6,5 | +7,6 | | +4,2 | hors kit | dans la bande |
| Aura mélodieuse | +1 charge | +6,3 | +7,5 | | +4,5 | Fanchon +19,4 | dans la bande |
| Rétribution | +25 % des jauges relâchées | +6,4 | +6,4 | | +4,5 | Aldric +9,9 | dans la bande (inchangée) |

Les quinze autres compétences ne changent pas (de +3,6, Siffloter, à +8,0, Aura d'immunité ; +7,7 à 800 combats). **Onze rangs II sortent de la bande par le haut, de +8,1 à +10,2** ; le rang III ajoute toujours moins que le rang II (de +3,8 à +6,3 pour elles).

**Pourquoi pas un autre axe entier** : Esquive, Coup de chance, Aura d'intimidation et de précision n'ont qu'un axe (des charges ; leur statut n'a pas d'intensité). Aura glaciale, de décoction et Épines : une charge de plus à la pose vaut au moins l'intensité (même valeur à la première pose, davantage à chaque pose de plus). Furie : une charge de plus double la rafale (+15,0). Aura de sainteté : plafonnée à 2 charges, une charge de plus ne vaut plus rien au plafond. Fausse note : une charge de plus vaut +2,6 (au-dessous de la bande, mesure de la 0.110.0). Foudre : seul le montant a prise.

**Propositions, à trancher par l'utilisateur** (rien n'est fait au-delà des rangs entiers) :
1. **Garder les rangs entiers tels quels** (choix livré) : le rang I ne change pas, donc l'équilibre du roster non plus (empreinte de `balance.test.ts` inchangée) ; seule la force d'un aiguisage en campagne monte, de +1,3 (Aura d'intimidation) à +3,4 points (Aura de sainteté) pour ces onze compétences par rapport au demi-rang. La bande d'un rang deviendrait « de +3 à +10 points » pour les compétences dont l'unité est déjà la plus petite.
2. **Foudre : un éclair de plus** au lieu de +1 à chacun (4 × 1 au lieu de 3 × 2 au rang II) : un tiers du gain actuel, estimé vers +3 points, non mesuré ; il faut un axe « coups » et que la scène de l'éclair sache tomber quatre fois (mise en scène).
3. **Les plus fortes (Aura glaciale +10,2, de décoction +9,9, Furie +9,8, Esquive +9,6)** : ne les aiguiser qu'au prix de deux forges, ou leur donner un axe nouveau (une durée, un seuil) ; chacun demande une règle de forge ou de statut, à mesurer avant.

## 21. La Purification sans effet sur soi, et le personnage vanilla (0.113.0)

**Décision de l'utilisateur** (2026-10-25) : « soit retirer un bonus en face, soit lui infliger 5 dégâts s'il n'a pas de bonus. L'effet sur soi doit être retiré. » La purge de son propre dernier malus (la *Purification double* de la 0.69.0, § 14 et § 15) est retirée : un seul effet, `cleanse` positif sur l'adversaire avec son repli de 5 dégâts (`orElse`). Son axe de rang ne change pas (`amount`, +3 par rang sur le repli) : il avait déjà prise sur les dégâts seuls, l'effet sur soi n'avait pas de rang.

Mesuré en même temps que le passage au personnage vanilla (Ysolde : Aura de sainteté sur le 1, Purification sur le 2 ; `BALANCE_N=800 npm run balance`) : Ysolde 48,4 → **45,9 %**, Purification +21,7 → +19,3 dans son kit (la plus forte de ses deux compétences). Repli plus fort, mesuré au laboratoire (800 combats par duel), non appliqué : la valeur de 5 est celle de l'utilisateur.

| Idée | Ysolde | Δ |
| --- | --- | --- |
| Lumière 6 | 45,9 → **48,3 %** | +2,5 ± 0,4 |
| Lumière 7 | 45,9 → 50,6 % | +4,8 ± 0,5 |

Le personnage vanilla laisse la Foudre du druide sur une seule face : +6,0 points dans son kit (+18,4 sur trois faces), la plus faible compétence du dé du roster ([PERSONNAGES.md](PERSONNAGES.md), « Un seul modèle de personnage »).

## 22. Phase 8, premier lot : cinq consommatrices (0.114.0)

**Le constat** ([PROGRESSION.md](PROGRESSION.md) § 0 bis, § 13.3) : quatre ressources du jeu n'avaient pas de consommateur (le Poison, le Saignement, les soins, les coups encaissés). La proposition de l'agent Lot8Design (2026-10-25, six compétences, séries 18 à 23 du laboratoire, 400 combats par duel, 3 600 par hôte) a été livrée à cinq : **Curée, Récolte, Virulence, Sentence, Rancune**. Le Rempart hérissé (« +8 armure temporaire si l'adversaire saigne ») est écarté : son rang II restait hors bande (+1,3 à +2,0 quel que soit le pas d'armure essayé). Décisions prises par l'agent principal, à confirmer en jeu par l'utilisateur.

Textes de la passe compendium du 2026-10-25 (§ 24) ; ceux de la livraison 0.114.0 sont au CHANGELOG.

| Compétence | Famille | Texte en jeu | Rang (axe) | Porteur (hors kit) | Répertoires |
| --- | --- | --- | --- | --- | --- |
| **Curée** (`quarry`) | Tempo (Saignement → coups) | « Deux coups de plus si l'adversaire saigne. » · détail : coups de base bruts, juste après celui du jet, chacun son dé | une charge, deux coups (`stacks` +1) | Gorak | Elaria, Brokk, Morgrut |
| **Récolte** (`harvest`) | Soin (Poison → soin) | « +7 PV si l'adversaire est empoisonné. » | +4 PV (`amount`) | Ervald | — |
| **Virulence** (`virulence`) | Affliction (l'amplificateur du Poison) | « Triple le Poison de l'adversaire. » (sa condition va de soi) | +3 Poison à plat (`stacks`) | Ervald | Naraxes |
| **Sentence** (`sentence`) | Affliction (soins → dégâts directs), une aura | « Chaque soin qu'il reçoit fait perdre 1 PV à l'adversaire. » · aura permanente, 2 charges au plus | +1 PV par soin (`power`) | Ysolde | — |
| **Rancune** (`grudge`) | Précision (coups encaissés → critiques) | « Son prochain coup reçu lui donne un critique assuré. » | une fois de plus (`stacks` +1) | Morgrut | Brokk, Aldric |

**Ce que le moteur a reçu** : un seul champ, `applyStatus.fromStatus` (`{ status, who, factor }` : `factor` fois les charges du statut que porte `who`, lues quand l'effet part, plus `stacks`) pour la Virulence ×3, qu'une émulation par seuils remplaçait au laboratoire ; trois statuts au registre (`quarry`, `sentence`, `grudge`) avec les crochets existants (`instantStrikes`, `reactions.healed`, `reactions.hurt`, `decays`). L'audit (`audit.ts`) lit désormais les conditions d'une compétence greffée ou qui remplace (une condition fausse laisse la face nue, comme le moteur), et admet qu'une rafale posée par une greffe suive le coup de base de son jet : les deux faux positifs signalés par le laboratoire (2 800 à 3 800 fois par idée).

**L'offre pertinente, étendue aux compétences** (règle des reliques de la 0.111.0) : en campagne, Graver ne tire que les compétences du répertoire dont le besoin est à la portée du champion (`skillNeeds`, `offerableSkills`) : un statut lu chez l'adversaire (Saignement, Poison), un soin, une esquive ou un critique consommés par le statut posé. **Depuis la nuit du 2026-10-25, le producteur d'abord** : la portée est le build d'aujourd'hui seul (dé vanilla, faces gravées, reliques, formes) ; ce que son répertoire pourrait produire ne compte plus. La Curée n'arrive chez Elaria et Morgrut qu'une fois Pourfendre gravé ([CAMPAGNE.md](CAMPAGNE.md) § 18.3).

**Pas de fonds commun** : la proposition mettait aussi la Rancune dans le « fonds commun » de PROGRESSION § 7 ; il n'existe pas dans le code (la campagne tire dans `reserve` + `repertoire`, le tournoi et la saison dans toutes les compétences gravables). Rien n'a été inventé : la Rancune est chez Morgrut (hors kit), Brokk et Aldric.

### Mesures une fois au registre (`scripts/skills.report.ts`, 400 combats par duel, mêmes graines)

Tables 2 et 3 (`SKILLS_ENGRAVE=quarry,harvest,virulence,sentence,grudge`, `SKILLS_PART=engrave` puis `rank`) : `logs/skills/2026-10-24-23-12-34_v0.113.0.md` et `logs/skills/2026-10-24-23-13-14_v0.113.0.md`. Elles retrouvent le laboratoire au dixième près (rapports `logs/lab/2026-10-24-22-52-18`, `22-53-41`, `22-46-55`, `22-49-46`) : la Virulence, émulée par des seuils, et les trois statuts d'essai étaient fidèles.

| Compétence | Gravée, rang I : registre (laboratoire) | Rang II : registre (laboratoire) |
| --- | --- | --- |
| Curée | Brokk **+10,4** (+10,4), Gorak +7,0 (+7,0) ; les huit autres +0,0 | Brokk +3,3 (+3,2) ; Gorak non isolé (moyenne des dix hôtes +0,6) |
| Récolte | Ervald **+8,7** (+8,7), Naraxes +1,1 (+1,1) | Ervald +3,0 (+3,0) |
| Virulence | Ervald **+8,4** (+8,4), Naraxes +0,7 (+0,7) | Ervald +3,3 (+3,2) |
| Sentence | Ysolde **+8,1** (+8,1), Ervald +2,4 (+2,4), autres +0,4 à +1,3 | Ysolde +4,6 (+4,6) |
| Rancune | moyenne **+14,2** (+14,2) : Fanchon +8,6 → Morgrut +19,8 | moyenne +5,9 (+5,9) : Naraxes +4,4 → Ervald +7,4 |

Le drapeau « hors bande (faible) » des moyennes sur dix hôtes est attendu : une consommatrice ne vaut que chez ses producteurs (comme la Fiole, le Croc et l'Encens, [RELIQUES.md](RELIQUES.md) § 13). Chez eux, les cinq sont dans la bande d'une gravure (8 à 20 points). Les rangs II de la Curée, de la Récolte et de la Virulence (+3,0 à +3,3 chez leur producteur) sont au bas de la bande d'un rang (3 à 8) ; Gorak (+2,4 au laboratoire) est en dessous.

**Synergies** (laboratoire, série 21 et 22, log-cote ; non remesurées) : Curée × Épines acérées +0,42, × Collier de ronces +0,41 ; Récolte × Aura glaciale +0,35 ; Virulence × Aura glaciale +0,34, **× Fiole de venin −0,17** (anti-synergie non prévue par les accroches, sous le seuil de −0,15 ; hypothèse : la Fiole abrège le combat, et un Poison triplé tard a moins de tours pour couler) ; Sentence × Aura de sainteté +0,32 ; Rancune × Contrepoids de plomb +0,39, × Plume d'aigle +0,30, × Œil de faucon −0,14.

**En campagne** (`CAMPAIGN_RUNS=30 npm run campaign`, [CAMPAGNE.md](CAMPAGNE.md) § 18.3) : paires liées par build d'un acte 3,27 → **3,70** (Brokk 1,38 → 2,30, Ervald 2,02 → 3,40, Ysolde 1,67 → 2,67, Morgrut 0,78 → 1,63) ; boss atteint 24 → 21 %, acte gagné 14 → 10 %, dans le bruit de 300 parties.

**Naraxes** : la Virulence entre dans son répertoire, mais sa décoction pose son Poison au coup, et il s'estompe avant son jet suivant (Virulence +0,7 chez elle) : elle ne sert qu'avec le Souffle de la tombe ou l'Aura glaciale de son répertoire. À trancher plus tard (audit du lot, point 2) : une décoction plus forte, ou des consommatrices qui lisent le Poison au coup.

**Le laboratoire** : les séries 18 à 23 sont retirées de `scripts/lab/ideas.ts` (elles portaient des statuts d'essai aux ids du registre, dont une Rancune en Ferveur qui aurait remplacé la livrée) ; leurs rapports restent dans `logs/lab/`.

## 23. Phase 8, second lot : quatre consommatrices et trois moments de famille (2026-10-25)

**Le constat** (audit du premier lot, [PROGRESSION.md](PROGRESSION.md) § 13.3 ; § 22 ci-dessus, « Audit ») : quatre ressources restaient sans consommateur après le premier lot. La **Brûlure** (les Feux follets de Thaldrin), la **pièce** (Pile ou face de Naraxes : le « jet modifié » de la Fortune), l'**armure temporaire vidée** (la Garde : Peau de pierre, Chandelle de veille, Géode fendue, Écu cabossé) et les **dégâts renvoyés** (ce que produisent les Représailles : Riposte, Rétribution). Le lot livre une compétence et une relique par ressource (reliques : [RELIQUES.md](RELIQUES.md) § 15). Décisions de l'agent (l'utilisateur dormait), à juger en jeu.

| Compétence | Famille | Texte en jeu | Rang (axe) | Porteur (hors kit) | Répertoires |
| --- | --- | --- | --- | --- | --- |
| **Embrasement** (`conflagration`) | Affliction (Brûlure → dégâts d'un coup) | « Son prochain coup qui touche un adversaire qui brûle lui fait perdre trois fois sa Brûlure restante. » (§ 24 ; « d'un coup 3 fois…, 1x » à la livraison) | +1 fois la Brûlure (`power`) | Thaldrin | Ervald |
| **Dé pipé** (`loaded-die`) | Fortune (la pièce → pile) | « Sa prochaine pièce tombe sur pile, et pile vaut ×2 de plus. » (pile, ce coup ×5 ; § 24) | pile ×1 de plus (`power`) | Naraxes | Fanchon |
| **Rempart hérissé** (`bristling-rampart`) | Affliction (armure vidée → Épines, le pont du Rempart, FAMILLES § 7) | « +2 Épines acérées quand son armure temporaire est vidée. » · aura permanente, se cumule | +6 Épines (`power`, 3 par rang, depuis la nuit du 2026-10-25 ; +2 avant, série 28 ci-dessous) | Brokk | Morgrut |
| **Vindicte** (`vendetta`) | Puissance (dégâts renvoyés → Ferveur) | « +3 Ferveur quand il renvoie des dégâts. » · aura permanente, se cumule | +3 Ferveur (`power`) | Aldric | Brokk |

**Ce que le moteur a reçu** (une fois, pour toutes les briques à venir ; [RESOLUTION.md](RESOLUTION.md) § 2, § 3, § 5 règle 6) :
- trois **moments de famille**, des déclencheurs nommés (`events.ts`, relics `STRIKE_TRIGGERS`, accroches `moment:shieldBreak`, `moment:reflect`, `moment:heads`) : `shieldBroken` (défenseur, après `hurt`, quand le coup qui le touche a vidé un de ses boucliers), `reflected` (ouvert par la vérification d'état, comme le soin reçu, après l'étape qui renvoie : une Riposte qui rend une part du coup, une Rétribution qui relâche ses jauges sur l'adversaire) et `heads` (le lanceur, quand sa pièce tombe sur pile, avant les fenêtres de pile qui touche). Sans brique qui les écoute, ils ne produisent aucune étape : l'empreinte de `balance.test.ts` est inchangée ;
- une **relâche du statut de l'adversaire** (`release` avec `from: 'opponent'`, `StatusDef.releases` : la Brûlure rend ses PV par tour × ses tours restants) ; une réaction qui ne relâcherait rien (pas de Brûlure) ne part pas, la charge attend ;
- le **Dé pipé** (`StatusDef.loadsCoin`) : la pièce se tire quand même (même suite du hasard), puis tombe sur pile, et pile vaut ×N de plus ; l'étape `coin` le dit (`loadedBy`). Une pièce imposée en mode triche garde sa valeur.

L'Embrasement et le Dé pipé sont des **mécanismes** (`mechanic: 'skill'`, comme Pile ou face et la Curée) : des charges qui attendent leur moment, qu'aucune purge ne retire. Le Rempart hérissé et la Vindicte sont des **auras** (bonus permanents, cumulables). **Offre pertinente** (`skillNeeds`, `relicNeeds`) : l'Embrasement et le Soufflet attendent la Brûlure (`status:burn`), le Dé pipé une pièce (`status:coinFlip`), le Rempart et les Clous une armure vidée (`moment:shieldBreak`), la Vindicte et le Gantelet un renvoi (`moment:reflect`), la Pièce trouée une pile (`moment:heads`) : la campagne et la saison ne les offrent qu'à qui produit déjà leur ressource (depuis la nuit du 2026-10-25, son build seul : l'Embrasement chez Ervald attend ses Feux follets gravés, le Dé pipé et la Pièce trouée chez Fanchon son Pile ou face, le Rempart chez Morgrut une armure temporaire, la Vindicte chez Brokk sa Riposte ou sa Rétribution ; test de `modules.test.ts`).

### Le laboratoire (séries 24 à 27, 400 combats par duel, gravée sur le 3 de son producteur)

Rapports : `logs/lab/2026-10-24-23-56-16_v0.114.0.md` (série 24), `2026-10-24-23-59-27` (25), `2026-10-25-00-01-08` (26), `2026-10-25-00-02-29` (27). Points de victoire de l'hôte contre le roster, mêmes graines.

| Piste | Mesure | Lecture |
| --- | --- | --- |
| Embrasement **au jet** (greffé, si l'adversaire brûle : la Brûlure relâchée ×1, ×2, ×3 ; ×1 + 3 dégâts) | Thaldrin +0,3 ; +2,2 ; +3,3 ; +1,4 | **0,15 fois par combat** : sa Brûlure n'est là à son jet que si les Feux follets sont partis au tour d'avant. Écarté |
| Embrasement **en attente** du coup qui touche un adversaire qui brûle (×1, ×2, ×3, ×4) | +2,8 ; +7,1 ; **+8,6** ; +9,3 | retenu à ×3 ; deux charges au lieu d'une : +8,7 (rien de plus) |
| Embrasement en aura (chaque coup qui touche un adversaire qui brûle, ×1) | +3,2 | la Brûlure est la limite, pas la charge |
| Feux follets gravés chez Ervald (face 4), puis l'Embrasement ×2 | +18,0, puis +27,6 (**+9,6**) | un producteur gravé le nourrit |
| Dé pipé : pile seule (1 et 2 charges), pile ×4, **×5**, ×6 ; ×5 à deux charges | +5,1 et +5,6 ; +7,9 ; **+9,8** ; +10,9 ; +10,1 | sa pièce est rare (le 2 de Naraxes) : le gain est dans le multiplicateur |
| Rempart hérissé : +2 Épines 1x, +3 1x, +4 1x ; +2 2x, +3 2x ; aura +1, **aura +2**, aura +2 au rang II | +7,3, +8,8, +9,5 ; +7,4, +8,8 ; +5,3, **+8,1**, +9,8 | retenu en aura (son rang ajoute plus qu'une charge de plus) |
| Vindicte : aura +2 Ferveur, **+3 Ferveur** et son rang II ; +2 PV, +3 PV et leurs rangs II | +7,0, **+9,4**, +13,3 ; +7,6, +10,7, +11,9 et +14,7 | retenue en Ferveur (la Puissance, un coup plus fort après un renvoi) |
| Sans producteur (Embrasement, Dé pipé chez Gorak) | 0,0 | une consommatrice vaut 0 sans sa ressource |
| Sans producteur, une aura (Rempart, Vindicte chez Gorak) | +0,7 | un bonus de plus détourne la Purification d'Ysolde (Gorak 58,0 → 64,5 % contre elle) : l'effet de leurre de tout bonus, déjà vu au premier lot |

**Mesures une fois au registre** (`scripts/skills.report.ts`, 400 combats par duel, `SKILLS_ENGRAVE=conflagration,loaded-die,bristling-rampart,vendetta` : `logs/skills/2026-10-25-00-14-51_v0.114.0.md`, gravure, et `2026-10-25-00-15-46`, rang) :

| Compétence | Gravée chez son producteur (rang I) | Ailleurs | Rang II chez son producteur | En log-cote chez lui (P8) |
| --- | --- | --- | --- | --- |
| Embrasement | Thaldrin **+8,0** (laboratoire +8,6 en bonus purgeable ; le mécanisme ne leurre plus la Purification) | 0 | +0,6 | **+0,33** |
| Dé pipé | Naraxes **+9,7** | 0 | +1,1 | **+0,40** |
| Rempart hérissé | Brokk **+8,1** | +0,0 (Ysolde) à +1,3 (Fanchon) : le leurre | +1,7 ; **+3,2** depuis la nuit du 2026-10-25 (+6 Épines par rang, ci-dessous) | **+0,33** |
| Vindicte | Aldric **+9,4** | +0,0 à +1,3 : le leurre | **+4,0** | **+0,38** |

La log-cote de la dernière colonne est la synergie P8 avec le producteur du kit (l(AB) − l(A) − l(B) + l(∅), où ∅ est l'hôte sans son producteur) : une consommatrice ne fait rien sans sa ressource, donc l(B) ≈ l(∅) et la synergie vaut son gain en log-cote chez son producteur. Toutes les quatre dépassent +0,25.

**À décider par l'utilisateur : trois rangs II sous la bande** (+3 à +8). Embrasement +0,6, Dé pipé +1,1, Rempart hérissé +1,7 : trois consommatrices **rares** (l'Embrasement relâche 0,26 fois par combat au laboratoire ; la pièce ne tombe que sur le 2 de Naraxes, s'il touche ; une armure vidée demande que la Peau de pierre soit partie), dont un rang ne change que l'effet, pas la fréquence. Essayés sans mieux : deux charges au lieu d'une (Embrasement +0,1, Dé pipé +0,3, Rempart +0,0), le rang par la part (Embrasement ×4 : +0,7). Propositions, à mesurer : un rang qui ajoute aussi de la ressource (l'Embrasement qui pose 1 Brûlure, le Dé pipé qui donne une pièce), ou accepter ces trois rangs faibles comme les onze rangs II au-dessus de la bande. La Vindicte, plus fréquente (0,9 moment par combat au laboratoire), a un rang dans la bande.

**Série 28 : un rang qui ajoute de la ressource ou de la fréquence** (calage de campagne, nuit du 2026-10-25 ; laboratoire, 400 combats par duel, gravée sur le 3 du producteur ; le gain d'un rang est l'idée moins le rang I, mêmes graines ; rapports `logs/lab/2026-10-25-00-39-04_v0.114.0.md` et `2026-10-25-00-39-53_v0.114.0.md`) :

| Compétence (rang I) | Rang livré (axe `power`, 1 par rang) | Le même axe, 2 et 3 par rang | La ressource posée par le rang | Retenu |
| --- | --- | --- | --- | --- |
| Embrasement (+8,0) | ×4 : +0,6 | ×5 : +0,9 ; ×6 : +1,0 | 1 Brûlure : +1,0 ; **2 Brûlure : +16,4** ; 3 : +23,4 | gardé (×1 de plus) |
| Dé pipé (+9,7) | pile ×6 : +1,1 | ×7 : +1,6 ; ×8 : +2,0 | une pièce (Pile ou face) : **+19,5** | gardé (×1 de plus) |
| Rempart hérissé (+8,1) | +2 Épines par rang (4 au rang II) : +1,7 | +4 par rang : +2,5 ; **+6 par rang (8 au rang II) : +3,1** | 1 armure temporaire : **+17,2** ; 2 à 4 : +18,4 à +20,7 | **+6 Épines par rang** (`power`, `per: 3`) |

**Lecture** : la ressource est le bon levier, mais son plus petit pas entier est déjà trop gros. Une Brûlure de 1 remplace celle des Feux follets (« une nouvelle Brûlure remplace l'ancienne ») et ne relâche presque rien ; une Brûlure de 2 fait partir la charge dès le coup du même jet (4 × 3 = 12 PV d'un coup). Une pièce, c'est un pile garanti ×5 au coup du jet ; une armure temporaire de 1 se vide au premier coup reçu, donc chaque 3 donne ses Épines. Aucun pas entier ne tombe dans la bande. **Décision (conservatrice, l'utilisateur dormait)** : le Rempart hérissé passe à +6 Épines acérées par rang (rang II : +8 Épines par armure vidée) : **+3,2** chez Brokk au rapport des compétences (`logs/skills/2026-10-25-00-52-09_v0.114.0.md`), dans la bande de justesse. L'Embrasement (+0,6) et le Dé pipé (+1,1) gardent leur rang : aucun axe entier ne les met dans la bande, ils rejoignent les rangs acceptés hors bande. Un Rempart hérissé aiguisé est rare : rien ne bouge en campagne (mêmes résultats sur 300 parties, CAMPAGNE.md § 18.3) ni en saison (8 saisons de 24 : même écart, 38 à 66 %, écart-type 10,1 points).

**Synergies** (laboratoire, log-cote, l'hôte de son producteur) : Soufflet de forge +3 × Embrasement ×3 **−0,14** (deux consommateurs de la même Brûlure : l'Embrasement l'éteint, le Soufflet en voit moins ; prévu par les accroches, `hinders: status:burn`, au bord du seuil de −0,15) ; Clous de pavois × Rempart hérissé (+2, 1x) −0,08 ; Gantelet (Ferveur) × Vindicte −0,05 ; Pièce trouée × Dé pipé −0,04 (le Dé pipé fait tomber pile, mais la pièce reste rare). Aucune anti-synergie non voulue sous −0,15. Paires de reliques : [RELIQUES.md](RELIQUES.md) § 15.

**Naraxes** (audit du premier lot, point 2 : son Poison s'estompe avant son jet) : **rien n'est changé** (décision conservatrice). La décoction à 2 Poison dès le rang I (série 27) la porte à 66,8 % contre le roster (+13,1, hors de la tolérance de 42 à 58 %), et la Virulence n'y ajoute que +2,4 (+0,7 à la décoction d'aujourd'hui) : même à 2, le Poison posé au coup s'estompe au début du tour adverse. Aucune option propre n'existe sans changer l'ordre du Poison ou sa décoction vanilla ; sa consommatrice de ce lot est le Dé pipé, qui lit sa pièce (+9,7).

**Le laboratoire** : les séries 24 à 27 sont retirées de `scripts/lab/ideas.ts` (statuts d'essai `lab…`, et un Dé pipé d'essai à l'ancienne forme de `loadsCoin`) ; leurs rapports restent dans `logs/lab/`. La série 28 l'est aussi, une fois l'axe du Rempart passé au registre.

**Icônes** (huit à peindre, ids stables : `src/assets/icons/<id>.png`). Compétences (l'objet en action, la magie peinte, la palette du porteur) : `conflagration`, une poignée de brindilles de chêne liées d'écorce qui s'embrase en une seule colonne de flamme ambre, les petits feux follets aspirés dedans ; `loaded-die`, un dé d'os fendu sur une arête, une goutte de plomb dans la fente, une traînée violette qui le tire vers sa face pile (un point doré) ; `bristling-rampart`, un pavois de chêne cerclé de fer qui éclate, ses éclats changés en épines de fer à la pointe rougie ; `vendetta`, un gantelet d'acier levé qui serre la lame brisée d'une épée ennemie, une onde dorée qui repart vers l'avant. Les statuts montrent l'icône de leur compétence. Reliques : § 15 de [RELIQUES.md](RELIQUES.md).

**Non vu, non entendu** : aucun rendu (la relâche de la Brûlure, la pièce pipée, l'anneau du Rempart et de la Vindicte, les reliques sur leur moment ; mise en scène par l'agent de mise en scène), aucun son. Rien n'est mesuré en campagne ni en saison (lot suivant de la nuit).

## 24. Le style de rédaction du compendium (passe du 2026-10-25)

**La règle de l'utilisateur** (0.111.0, reprise la nuit du 2026-10-25) : une description **courte, simple, qui porte le fonctionnement** ; l'effet d'abord, la condition en clair, la limite en « 2x » ; ni type de dégâts, ni élément, ni type de relique ; jamais de décimale ; jamais d'emoji ; le bon pluriel ; la typographie française. Exemples validés : « Deux coups de plus si l'adversaire saigne. », « +2 dégâts aux adversaires empoisonnés », « +4 armure temporaire lors d'un coup reçu, 2x ».

**Les générateurs, pas des textes à la main** : chaque compétence (rangs II et III compris, et toute compétence à venir) se rédige par `describeSkill` (`events.ts`) à partir des textes de ses statuts (`statuses.ts`). Ce qui fait la ligne :
- **la condition dans la ligne**, après une phrase seule (« +7 PV si l'adversaire est empoisonné. »), en tête de plusieurs ; `conditionClause` écrit « si », « s'il », « à partir du tour N » ; un statut se lit par son verbe d'état (`StatusDef.bears` : « saigne », « est empoisonné », « brûle ») ; la condition sur le statut que la compétence multiplie ne se répète pas (Virulence). Plus de pastille de condition ;
- **la chance et la limite au bout** : « Ce coup ×3, 1x. », « L'adversaire perd sa prochaine action, 1x. » ; une charge posée à chaque jet n'est pas une limite (plus de « 1x » à l'Embrasement, au Dé pipé, à la Rancune) ;
- **l'adversaire pour sujet** de ce qu'il subit (`StatusDef.onFoe`, sinon « L'adversaire » et la phrase du statut) : « L'adversaire perd 3, 2 puis 1 PV au début de ses tours (6 en tout). » remplace « Sur l'adversaire : perd… » ;
- **le détail à part** : ce que la ligne tait (arrondis, moment exact, coups bruts, « après l'armure ») vient de `StatusDef.detail` et des effets (`effectDetail`), et s'affiche dans le compendium sous la ligne, en « Détail : » (`SkillDescription.detail`). Les infobulles de combat et la forge montrent la ligne seule ;
- **les nombres** : « +2 dégâts », « −1 dégât » (accordés), « Deux coups au lieu d'un » (Furie des vents), « Ce coup et le suivant sont critiques » ; un statut qui se compte a son pluriel (`StatusDef.plural` : « +2 coups de chance ») ; aucune décimale, ni dans les règles (« ×2 ou plus selon le personnage »), ni dans l'infobulle de l'attaque (plus de moyenne) ;
- **la typographie** : les registres s'écrivent avec des espaces simples, `typeset` (`typography.ts`) met l'espace insécable devant « : ; ! ? % » et dans les guillemets, une fois, dans les générateurs et les registres (statuts, états, règles, liens du catalogue).

**Le contrôle** : `wording.test.ts` lit tout ce que les générateurs produisent (chaque compétence aux rangs I à III, ligne, détail, pastilles et rang ; chaque statut à plusieurs charges, son badge, son intensité, sa fiche et ses liens ; chaque état, relique, déclencheur, opération de forge et règle) et refuse une décimale, un type de dégâts (DP, DM, « lumière », « magie »), un type de relique, un élément, une double espace, une espace simple ou absente devant « : ; ! ? % », un pluriel manqué (« 2 coup »), une limite à l'ancienne (« fois max. ») et un emoji.

**Avant → après** (rangs I, sauf mention) :

| Compétence | Avant | Après |
| --- | --- | --- |
| Curée | « Deux coups de base bruts de plus, tout de suite, chacun son dé (aucune compétence). » · si l'adversaire porte Saignement | « Deux coups de plus si l'adversaire saigne. » · Détail : coups de base bruts, juste après celui du jet, chacun son dé |
| Furie des vents | « Deux coups de base bruts tout de suite, chacun son dé (aucune compétence). » | « Deux coups au lieu d'un. » |
| Pourfendre | « S'il touche, Saignement sur l'adversaire : la moitié des PV retirés (arrondie au-dessus) ; il coule dès le coup suivant. » | « S'il touche, l'adversaire saigne de la moitié des dégâts du coup. » |
| Récolte | « +7 PV. » · si l'adversaire porte Poison | « +7 PV si l'adversaire est empoisonné. » |
| Souffle de la tombe | « Sur l'adversaire : perd 3, 2 puis 1 PV au début de ses tours (6 en tout). » | « L'adversaire perd 3, 2 puis 1 PV au début de ses tours (6 en tout). » |
| Peau de pierre | « Bouclier de 6 : absorbe les dégâts après l'armure (le coup garde au moins 1), et s'use d'autant. » | « +6 armure temporaire. » |
| Aura de puissance | « Ses coups font +2, après le critique et avant l'armure. » | « +2 dégâts à chacun de ses coups. » |
| Œil de faucon III | « Ce coup et les 2 suivants qui touchent sont critiques. » (rang II : « les 1 suivants ») | « Ce coup et les 2 suivants sont critiques. » (rang II : « Ce coup et le suivant ») |
| Peur | « Sur l'adversaire : perd sa prochaine action, terrifié. » · 1 fois max. par combat | « L'adversaire perd sa prochaine action, 1x. » |
| Soliste | « Coup de base ×3. » · 1 fois max. par combat | « Ce coup ×3, 1x. » |
| Purification | « Retire à l'adversaire son dernier bonus posé ; sinon, 5 dégâts directs à l'adversaire. » | « Retire son dernier bonus à l'adversaire, sinon 5 dégâts directs. » |
| Rétribution | « Relâche la moitié de ses jauges (arrondie au-dessous, au moins 1) en dégâts directs à l'adversaire, puis les vide. » | « L'adversaire perd la moitié des dégâts des trois derniers coups reçus. » |
| Sentence | « L'adversaire perd 1 PV chaque fois qu'il regagne des PV. » | « Chaque soin qu'il reçoit fait perdre 1 PV à l'adversaire. » |
| Rancune | « Son prochain coup est critique quand il encaisse un coup, 1x. » | « Son prochain coup reçu lui donne un critique assuré. » |
| Embrasement | « … lui fait perdre d'un coup 3 fois sa Brûlure restante, 1x. » | « … lui fait perdre trois fois sa Brûlure restante. » |
| Dé pipé | « Sa prochaine pièce tombe sur pile, ×2 de plus, 1x. » | « Sa prochaine pièce tombe sur pile, et pile vaut ×2 de plus. » |
| Fausse note | « Sur l'adversaire : son prochain coup qui touche fait −5, après l'armure (au moins 1). » | « Le prochain coup de l'adversaire qui touche fait −5 dégâts. » |
| Aura sauvage | « Son attaque gagne +1 (minimum et maximum). » | « +1 à l'attaque. » |
| Foudre | « 3 × 1 dégât direct à l'adversaire (3 en tout). » | « 3 × 1 dégât direct à l'adversaire. » |
| Pièce trouée (relique) | « +2 coup de chance sur pile » | « +2 coups de chance sur pile » |
| Rangs | « +1 coup par rafale », « +25 % des jauges relâchées », « +1 Curée » | « +1 coup », « +25 % des dégâts renvoyés », « +2 coups » |
