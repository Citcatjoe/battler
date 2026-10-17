# Personnages

Ce document garde la trace de la philosophie de chaque personnage et des décisions de game design qui le concernent. La **fiche courte affichée en jeu** (accroche, background, forces, faiblesses) vit dans `src/game/roster.ts` (`lore`) ; elle est présentée dans le compendium, verticale Personnages. Ce document en est la version longue et la justification.

_Chiffres mesurés en 0.17.0 (8 personnages), sur 6 000 combats par paire, côtés alternés._

---

## Principes du roster

1. **Une race = un archétype de combat lisible.** On doit pouvoir dire en une phrase *comment il gagne* et *comment il perd*.
   - **Orc** : encaisser, avec beaucoup de PV et un gros dé, mais aucune défense active.
   - **Elfe** : éviter et punir, avec l'esquive et les critiques, mais peu de PV et un petit dé.
   - **Nain** : user l'adversaire, avec l'armure, le bouclier et des critiques rares mais lourds.
   - **Mort-vivant** : affliger, c'est-à-dire ronger l'adversaire avec le poison, une aura négative qui ignore l'armure.
2. **Une variante = la même race, une autre façon de jouer.** Elle garde l'image (teintée en CSS) et l'**événement de sa race**, et décale 2 ou 3 stats dans une direction claire (plus offensive, plus régulière…). Les écarts restent petits.
3. **L'événement prolonge l'identité de la race.** Il se déclenche sur un 1 au dé, le pire jet possible : la malchance devient un petit moment de gloire, propre à chaque race.
   - **Compétences et palette (cadre décidé en 0.20.1).** Les compétences appartiennent aux personnages ; les statuts qu'elles posent sont des règles neutres (voir [STATUTS.md](STATUTS.md#statut-et-compétence--deux-notions-séparées)). Chaque race a une palette de 2 ou 3 statuts. Cible par personnage : **1 passif de race** (identité commune à l'original et à ses variantes) et **2 compétences au plus**, dont une peut être propre à la variante (style de jeu).
4. **Budget d'équilibre** : chaque personnage doit gagner entre 45 et 55 % de ses combats contre le reste du roster (test automatique). Aucun duel ne devrait dépasser 60/40.
5. **Fiche en jeu courte** : une accroche, 2 ou 3 phrases de background (240 caractères au plus), 1 à 3 forces et 1 à 3 faiblesses. `validateRoster` vérifie ces limites.
6. **Univers** : des noms et des lieux inventés (Kar-Dush, Lithmeren, Durnhold, Ostremort), sans référence à des œuvres existantes.
7. **Sélection** : les personnages sont rangés par famille, une colonne par race, avec l'original en haut et ses variantes en dessous (`FAMILIES` dans `roster.ts`).

---

## Orcs : encaisser

**Événement : Rage du sang** (1 au dé → +5 PV, sans dépasser le maximum). Le jet le plus faible devient du soin : l'orc, qui n'esquive pas, compense par de l'endurance. En moyenne, l'événement soigne 4,5 à 5 PV par combat.

### Gorak · Brute

> « Le roc des fosses de Kar-Dush. »

- **Fantasy** : le champion des fosses, lent et inébranlable. C'est la référence de l'orc, et l'unité de taille du jeu (`scale: 1`).
- **Stats** : PV 61 (le maximum du roster), d10, armure 0, esquive 5 %, critique 10 % ×2.
- **Comment il gagne** : ses PV absorbent les pics de dégâts, et son d10 frappe régulièrement fort.
- **Comment il perd** : il prend tous les coups, et n'a aucune réponse face à l'usure du nain.
- **Mesures** : 49,2 % de victoires, environ 21 tours par combat. Duel le plus dur : Brokk (45,8 %).
- **Décisions** :
  - Il a le plus de PV du roster parce qu'il n'a aucune défense active. Les PV sont sa défense.
  - Il ne critique que rarement (10 %) : son danger vient de la régularité du d10, pas des pics.

### Murzug · Berserker (variante de Gorak)

> « Il compte les cicatrices, pas les coups reçus. »

- **Fantasy** : l'orc banni, plus fou que solide. Il mise tout sur les pics de dégâts.
- **Écarts avec Gorak** : PV −4 (57), critique +8 points (18 %).
- **Teinte** : peau rougeâtre et saturée (`hue-rotate(-75deg)`), pour évoquer les peintures de guerre.
- **Mesures** : 51,2 % de victoires, des combats plus courts (environ 20 tours) et les meilleurs dégâts par coup du roster (5,9).
- **Décisions** :
  - On échange de l'endurance contre des pics, en gardant la même lecture de l'orc : pas de défense.
  - Il est légèrement au-dessus de Gorak, ce qui reste dans le budget. À surveiller si un futur événement profite aux critiques.

---

## Elfes : éviter et punir

**Événement : Œil de faucon** (1 au dé → 🎯 le prochain coup qui touche est critique). Un mauvais jet prépare le coup suivant, ce qui colle à l'archère qui ajuste son tir. La charge n'est pas consommée par une esquive adverse. Environ 1,2 critique assuré par combat.

### Elaria · Rôdeuse

> « Un souffle, une flèche. »

- **Fantasy** : l'éclaireuse insaisissable, jamais là où l'on frappe.
- **Stats** : PV 48 (le minimum du roster), d8, armure 0, esquive 33 % (le maximum), critique 22 % (le maximum) ×2.
- **Comment elle gagne** : un tiers des coups adverses passent dans le vide, et ses critiques fréquents rattrapent son petit dé.
- **Comment elle perd** : quand l'esquive ne passe pas, ses PV fondent. L'armure du nain rogne aussi chacun de ses coups, souvent petits.
- **Mesures** : 49,4 % de victoires. Duel le plus dur : Brokk (45,8 %, son pire duel).
- **Décisions** :
  - Elle a les PV les plus bas parce qu'elle a la meilleure défense active. Le hasard de l'esquive crée de la variance : ses combats sont les plus imprévisibles.
  - Son point faible face à l'armure est voulu : il donne un sens au duel elfe contre nain.

### Sylwen · Sentinelle sylvestre (variante d'Elaria)

> « La forêt ne pardonne pas deux fois. »

- **Fantasy** : la gardienne patiente, qui attend l'ouverture parfaite.
- **Écarts avec Elaria** : PV +2 (50), esquive −7 points (26 %), critique −5 points (17 %), multiplicateur +0,4 (×2,4).
- **Teinte** : armure verte (`hue-rotate(120deg)`), aux couleurs de la forêt.
- **Mesures** : 48,9 % de victoires (le plus bas, mais dans le budget).
- **Décisions** :
  - Elle est moins aléatoire qu'Elaria (moins d'esquive, moins de critiques), mais chaque critique pèse davantage.
  - Son gros multiplicateur valorise particulièrement Œil de faucon, qui force un critique.
  - **Piste** : si elle descend sous 48 %, remonter légèrement ses PV plutôt que son esquive, pour garder son identité « moins insaisissable ».

---

## Nains : user l'adversaire

**Événement : Peau de pierre** (1 au dé → 🛡️ +4 d'armure temporaire). Ce bonus se cumule, absorbe des points après l'armure (jamais sous 1 dégât) et s'use en encaissant. Il renforce le nain qui tient la ligne. Il absorbe environ 6,3 dégâts par combat pour Brokk, et 4 pour Grimbald.

### Brokk · Gardien

> « Ce qui passe la porte passe par moi. »

- **Fantasy** : le gardien qui ne recule jamais.
- **Stats** : PV 52, d8, armure 2, esquive 6 %, critique 8 % ×2,5. Il est petit à l'écran (`scale: 0.78`).
- **Comment il gagne** : chaque coup adverse perd 2 points, et les petits coups (elfes) sont neutralisés. Ses combats sont les plus longs (environ 27 tours).
- **Comment il perd** : son d8 et ses critiques rares le rendent lent à finir l'adversaire. Les gros dés (d10) pèsent sur lui.
- **Mesures** : 52,5 % de victoires (le plus haut du roster). Il bat les elfes (56 % contre Elaria, 54 % contre Sylwen) et Ervald (53 %), et reste à l'équilibre contre Murzug et Grimbald.
- **Décisions** :
  - L'armure plate est la mécanique la plus forte contre les petits dés. Elle est compensée par l'offensive la plus faible du roster (4,5 dégâts par coup).
  - **À surveiller** : il est le plus fort du roster et au-dessus de 55 % contre Elaria. Si un nouveau personnage à petit dé arrive, ou si l'écart grandit, la première chose à revoir est Peau de pierre (+4 → +3), avant de toucher à l'armure de base.

### Grimbald · Briseur de fer (variante de Brokk)

> « Pourquoi parer quand on peut briser ? »

- **Fantasy** : le forgeron devenu briseur, qui a sacrifié de l'armure pour frapper plus fort.
- **Écarts avec Brokk** : dé +2 (d10), armure −1 (1), PV −2 (50).
- **Teinte** : acier brut, presque sans couleur (`saturate(0.15) brightness(1.15)`).
- **Mesures** : 49,1 % de victoires, des combats d'environ 21 tours, comme les orcs.
- **Décisions** :
  - C'est le nain offensif : il garde Peau de pierre et ses critiques ×2,5, mais tient moins longtemps.
  - Il montre qu'une variante peut changer le style d'une race (de l'usure à l'échange de coups) sans changer son événement.

---

## Morts-vivants : affliger

**Événement : Souffle de la tombe** (1 au dé → ☠️ l'adversaire est empoisonné : il perd 2 PV au début de chacun de ses 3 tours suivants, soit 6 PV). C'est la première race à poser une **aura négative sur l'adversaire**. Ses dégâts ne viennent pas que de ses coups : le poison ignore l'armure, l'esquive et les boucliers. Si un second poison tombe avant la fin du premier, les charges s'additionnent (4 PV par tour) et la durée garde la plus longue. Environ 1,3 événement par combat pour Ervald.

**Réglage** : la première version (54 PV, poison 2 × 3) plafonnait à 46 % de victoires. Avec un poison 3 × 3 (9 PV), Ervald montait à 62 % : un poison qui ignore l'armure est très fort. Version retenue : 56 PV et poison 2 × 3.

### Ervald · Chevalier liche

> « La mort l'a rendu, pas pardonné. »

- **Fantasy** : le capitaine tombé en défendant Ostremort, revenu sous son étendard pourpre. Il ne fatigue jamais.
- **Stats** : PV 56, d8, armure 1, esquive 8 %, critique 12 % ×2. Il est grand à l'écran (`scale: 1.02`).
- **Comment il gagne** : il encaisse, et chaque jet raté ronge l'adversaire au fil des tours. Contre les elfes, peu nombreux en PV et sans armure, le poison pèse lourd (56 % contre Elaria, 55 % contre Sylwen).
- **Comment il perd** : ses propres coups sont faibles (4,4 dégâts par coup, comme Brokk). Contre une armure, il ne fait mal que par le poison : il perd contre Brokk (47 %).
- **Mesures** : 50,3 % de victoires, environ 22 tours par combat.
- **Décisions** :
  - Il réutilise le statut Poison du registre, sans aucune règle nouvelle dans le moteur. Ajouter la race a seulement demandé des données.
  - Il a une armure légère (1), pour se distinguer du nain (2) tout en restant un « tank » lent.

### Caldrec · Faucheur d'âmes (variante d'Ervald)

> « Il ne garde rien, pas même son bouclier. »

- **Fantasy** : le lieutenant qui a troqué l'armure pour une lame spectrale.
- **Écarts avec Ervald** : dé +2 (d10), armure −1 (0), PV −2 (54), critique +4 points (16 %).
- **Teinte** : spectrale, vert-bleu (`hue-rotate(-110deg)`), contre le pourpre d'Ervald.
- **Mesures** : 50,2 % de victoires. Ses combats sont les plus courts du roster (environ 18 tours).
- **Décisions** :
  - C'est le même renversement que Brokk/Grimbald : la variante échange l'endurance contre l'offensive, et garde l'événement de sa race.
  - Ses combats rapides laissent moins de temps au poison d'agir : son identité passe davantage par les coups que par l'affliction.

---

## Matrice des duels (0.17.0)

Taux de victoire de la ligne contre la colonne.

| | Gorak | Murzug | Elaria | Sylwen | Brokk | Grimbald | Ervald | Caldrec | **Global** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Gorak** | — | 49 % | 50 % | 51 % | 46 % | 50 % | 53 % | 54 % | **50,3 %** |
| **Murzug** | 50 % | — | 49 % | 51 % | 51 % | 53 % | 54 % | 53 % | **51,4 %** |
| **Elaria** | 50 % | 52 % | — | 50 % | 45 % | 51 % | 45 % | 50 % | **49,1 %** |
| **Sylwen** | 50 % | 50 % | 49 % | — | 45 % | 51 % | 47 % | 50 % | **48,9 %** |
| **Brokk** | 55 % | 49 % | 56 % | 54 % | — | 50 % | 53 % | 51 % | **52,5 %** |
| **Grimbald** | 48 % | 46 % | 48 % | 48 % | 50 % | — | 50 % | 48 % | **48,3 %** |
| **Ervald** | 49 % | 48 % | 56 % | 55 % | 47 % | 49 % | — | 49 % | **50,3 %** |
| **Caldrec** | 48 % | 48 % | 51 % | 51 % | 51 % | 53 % | 49 % | — | **50,2 %** |

À refaire après tout changement de stats, d'événement ou de règle. Le test `balance.test.ts` vérifie le global ; cette matrice sert à repérer les duels déséquilibrés.

---

## Ajouter un personnage : check-list de design

- [ ] En une phrase, comment il gagne et comment il perd. Sa place doit être distincte de celle des personnages existants.
- [ ] Ses stats sont dérivées de l'archétype de sa race, ou une nouvelle race est définie avec son événement.
- [ ] Son événement (ou celui de sa race) prolonge son identité.
- [ ] La fiche courte est écrite dans `roster.ts` (`lore`), et sa section ajoutée ici : fantasy, stats, comment il gagne et perd, mesures, décisions.
- [ ] La matrice des duels est remesurée, avec un global entre 45 et 55 % et aucun duel au-delà de 60/40.
- [ ] L'image respecte `docs/STYLE_BIBLE.md`. Sur fond uni, elle se détoure avec `scripts/cutout-character.py`.
