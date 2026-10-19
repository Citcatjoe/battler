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
```

Une vingtaine de secondes à 200 combats par duel. Le rapport s'écrit dans `logs/skills/`.

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

## 11. Deuxième passe : notes de l'utilisateur et audit 0.42.0 (0.43.0)

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

### Avant → après (règles 0.42.0 → 0.43.0, roster de 20 personnages)

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

