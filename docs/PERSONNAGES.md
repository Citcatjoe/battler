# Personnages

Ce document garde la trace de la philosophie de chaque personnage et des décisions de game design qui le concernent. La **fiche courte affichée en jeu** (accroche, background, forces, faiblesses) vit dans `src/game/roster.ts` (`lore`) ; elle est présentée dans le compendium, verticale Personnages. Ce document en est la version longue et la justification.

_Chiffres mesurés en 0.17.0 (8 personnages), sur 6 000 combats par paire, côtés alternés._

---

## Principes du roster

1. **Une race = un archétype de combat lisible.** On doit pouvoir dire en une phrase *comment il gagne* et *comment il perd*.
   - **Orc** : encaisser, avec beaucoup de PV et un gros dé, mais aucune défense active ; et déferler, avec des actions à deux coups.
   - **Elfe** : éviter et punir, avec l'esquive et les critiques, mais peu de PV et un petit dé.
   - **Nain** : user l'adversaire, avec le plus gros réservoir de PV, l'armure temporaire, les épines et des critiques rares mais lourds. Les nains n'ont plus d'armure passive depuis la 0.24.1.
   - **Humain** (0.30.0) : contrôler, avec un petit dé et des compétences sur 3 jets sur 7 (peur, purification, soin).
   - **Homme-lézard** (0.30.0) : tenter sa chance, avec l'esquive, le poison et des coups de dés à double tranchant.
   - **Mort-vivant** : affliger et drainer, c'est-à-dire ronger l'adversaire avec le poison, qui ignore l'armure, et lui voler sa vie.
2. **Une variante = la même race, une autre façon de jouer.** Elle garde l'image (teintée en CSS) et les **compétences de sa race**, et décale 2 ou 3 stats dans une direction claire (plus offensive, plus régulière…). Les écarts restent petits.
3. **Les compétences prolongent l'identité de la race.** Elles se déclenchent sur les deux pires jets : la malchance devient un petit moment de gloire, propre à chaque race. Sur un **1**, la compétence d'origine (soin, critique, bouclier, poison). Sur un **2** (0.25.0, compétences données par l'utilisateur), une compétence qui prépare le tour suivant : Furie des vents, Esquive améliorée, Épines, Vol de vie. Sur un **3** (0.26.0, données par l'utilisateur), une **aura permanente** pour le reste du combat : puissance, précision, intimidation, poison. Trois compétences par race dépassent le plafond de 2 fixé en 0.20.1 : c'est un choix de l'utilisateur, et le plafond est à reformuler (voir STATUTS.md).

   **Les jets de 1, 2 et 3 n'infligent plus de dégâts (0.27.0, demande de l'utilisateur).** Ils servent seulement à déclencher la compétence du chiffre (`forfeitsHit` sur les douze compétences) : aucun dégât, ni esquive ni critique. Un personnage ne frappe donc jamais pour 1, 2 ou 3. Ce sont 3 jets sur 8 pour un d8, et 3 sur 10 pour un d10 : les petits dés y perdent davantage.

   **Réglage 0.27.0** : sans compensation, Brokk tombait à 37,6 % et Caldrec montait à 59 %. Nouveaux PV : Gorak 61 (Murzug 57), Elaria 50 (Sylwen 52), Brokk 83 (Grimbald 65), Ervald 62 (Caldrec 57). Les taux de victoire vont de 47,8 % à 52,2 %, et le duel le plus déséquilibré est Ervald contre Elaria (59/41). Les combats durent plus longtemps : de 21 à 32 tours en moyenne. Les mesures par personnage ci-dessous datent de la 0.26.0, sauf mention contraire. Brokk à 83 PV a été jugé réducteur : voir le réglage 0.28.0 ci-dessous.

   **Réglage 0.28.0, par les compétences** (méthode : [EQUILIBRAGE.md](EQUILIBRAGE.md)) : les PV reviennent près de l'identité de chaque race (Gorak 61, Murzug 57, Elaria 48, Sylwen 50, Brokk 68, Grimbald 57, Ervald 58, Caldrec 56). Les écarts se règlent par les compétences : Rage du sang 5 → 3 PV, Peau de pierre +4 → +6, auras d'intimidation et de précision cumulables, et 10 % de critique pour Grimbald. Résultat : de 47,4 à 51,8 % de victoires, pire duel 42/58. La matrice en fin de document est celle de la 0.28.0.
   - **Compétences et palette (cadre décidé en 0.20.1).** Les compétences appartiennent aux personnages ; les statuts qu'elles posent sont des règles neutres (voir [STATUTS.md](STATUTS.md#statut-et-compétence--deux-notions-séparées)). Chaque race a une palette de 2 ou 3 statuts. Cible par personnage : **1 passif de race** (identité commune à l'original et à ses variantes) et **2 compétences au plus**, dont une peut être propre à la variante (style de jeu).
4. **Budget d'équilibre** : chaque personnage gagne entre 42 et 58 %, aucun duel au-delà de 65/35 (test automatique), avec une zone de confort de 45 à 55 %. On veut des personnages typés, pas des clones. Les PV sont le dernier levier d'équilibrage : voir [EQUILIBRAGE.md](EQUILIBRAGE.md).
5. **Fiche en jeu courte** : une accroche, 2 ou 3 phrases de background (240 caractères au plus), 1 à 3 forces et 1 à 3 faiblesses. `validateRoster` vérifie ces limites.
6. **Univers** : des noms et des lieux inventés (Kar-Dush, Lithmeren, Durnhold, Ostremort), sans référence à des œuvres existantes.
7. **Sélection** : les personnages sont rangés par famille, une colonne par race, avec l'original en haut et ses variantes en dessous (`FAMILIES` dans `roster.ts`).
8. **Nature des compétences** (0.39.1, classement de l'utilisateur) : chaque compétence déclare sa `nature`, qui colore seulement sa carte (aucun effet sur le combat). **Martiale** : la force du corps ou de l'arme (orcs, nains, Riposte, la forme d'ours du druide). **Adresse** : l'agilité, la précision, la ruse, la chance (elfes, hommes-lézards ; l'Aura de décoction, poison enduit sur la lame, en fait partie). **Arcane** : la magie, la foi, la nature, la mort (morts-vivants, Ysolde, Rétribution et Aura d'immunité d'Aldric, forme humaine du druide, Aura de pourriture). **Neutre** : ni l'un ni l'autre (l'Attente de l'ogre). Une variante hérite de la nature de la compétence de son original.

---

## Orcs : encaisser

**Compétence du 1 : Rage du sang** (+3 PV, sans dépasser le maximum ; +5 avant la 0.28.0). Le jet le plus faible devient du soin : l'orc, qui n'esquive pas, compense par de l'endurance. C'est la compétence la plus modeste du roster (valeur nette d'environ +2 à +3 points) : les orcs ont déjà la Furie et la puissance.

**0.36.5, une Rage du sang propre à Murzug** (audit des compétences, `docs/SORTS.md` § 8) : elle ne lui valait que +0,6 point, contre +2,0 pour Gorak. Avec moins de PV et des coups plus forts, 3 PV ne comptaient presque pas pour lui. Murzug soigne désormais 5 PV (compétence `blood-rage-murzug`) : valeur nette +4,2 points, Murzug de 49,7 à 51,7 %. Gorak garde 3 PV (+1,0 point mesuré, dans le bruit). C'est la première compétence propre à une variante : Gorak et Murzug commencent à se distinguer par leur kit, pas seulement par leurs stats.

**Compétence du 2 : Furie des vents** (🌪️ pendant 1 tour : à sa prochaine action, l'orc frappe deux fois). Le coup du 2 frappe normalement. Les deux coups suivants sont résolus chacun à part : dé, esquive, critique, et leurs propres compétences. Un 1 soigne, et un 2 relance une Furie pour l'action d'après. La Furie est consommée au début de l'action, et deux 2 de suite n'en donnent qu'une. Environ 1,1 Furie par combat. Elle est perdue si l'orc est étourdi.

**Compétence du 3 : Aura de puissance** (💪 permanente, cumulable). Chaque coup inflige 2 de plus par charge, avant l'armure : un 10 fait 12, puis 14 après un second 3. Le bonus s'ajoute après le critique et vaut pour chacun des coups d'une Furie des vents. Il est réduit par l'Aura d'intimidation d'un nain. Les orcs l'obtiennent dans environ deux combats sur trois, avec 1,5 charge en moyenne une fois obtenue. « Un peu cheaté, mais c'est l'orc » : le cumul est voulu.

### Gorak · Brute

> « Le roc des fosses de Kar-Dush. »

- **Fantasy** : le champion des fosses, lent et inébranlable. C'est la référence de l'orc, et l'unité de taille du jeu (`scale: 1`).
- **Stats** : PV 61, d10, armure 0, esquive 5 %, critique 10 % ×2.
- **Comment il gagne** : ses PV absorbent les pics de dégâts, et son d10 frappe régulièrement fort.
- **Comment il perd** : il prend tous les coups, et n'a aucune réponse face à l'usure du nain.
- **Mesures** : 50,0 % de victoires (0.26.0), environ 19 tours par combat. Duels les plus durs : les elfes (44 % contre Elaria, 45 % contre Sylwen).
- **Décisions** :
  - Il a beaucoup de PV parce qu'il n'a aucune défense active : les PV sont sa défense. Depuis la 0.24.1, Brokk en a davantage, pour compenser son armure perdue.
  - Il ne critique que rarement (10 %) : son danger vient de la régularité du d10, pas des pics.

### Murzug · Berserker (variante de Gorak)

> « Il compte les cicatrices, pas les coups reçus. »

- **Fantasy** : l'orc banni, plus fou que solide. Il mise tout sur les pics de dégâts.
- **Écarts avec Gorak** : PV −4 (57), critique +8 points (18 %).
- **Teinte** : peau rougeâtre et saturée (`hue-rotate(-75deg)`), pour évoquer les peintures de guerre.
- **Mesures** : 48,5 % de victoires (0.26.0), environ 18 tours par combat. Il souffre contre les elfes (43 % contre Elaria, **40 % contre Sylwen, à la limite du budget**), dont l'esquive gâche ses coups renforcés, mais il bat Ervald (59 %).
- **Décisions** :
  - On échange de l'endurance contre des pics, en gardant la même lecture de l'orc : pas de défense.
  - Il est légèrement au-dessus de Gorak, ce qui reste dans le budget. À surveiller si un futur événement profite aux critiques.

---

## Elfes : éviter et punir

**Image** : `elf.png`, une chasseresse de la nuit qui bande son arc en croissant de lune, en bleu nuit et argent (0.30.1). Elle remplace l'ancienne elfe lie-de-vin, une placeholder tirée d'une œuvre existante. Le design prévu pour une « Chasseresse de la nuit » distincte (STYLE_BIBLE) sert maintenant de modèle à Elaria et à Sylwen.

**Compétence du 1 : Œil de faucon** (🎯 le prochain coup qui touche est critique). Un mauvais jet prépare le coup suivant, ce qui colle à l'archère qui ajuste son tir. La charge n'est pas consommée par une esquive adverse. Environ 1,4 critique assuré par combat.

**Compétence du 2 : Esquive améliorée** (💨 sans durée depuis la 0.36.5 : le prochain coup reçu est esquivé à coup sûr). L'esquive vaut pour le prochain coup reçu, sans tirage, et la charge est consommée. **0.36.5** : elle durait un tour, et s'éteignait sans servir une fois sur trois quand l'adversaire sacrifiait son coup (jet de 1 à 3) ou perdait son tour, le même défaut que la Riposte avant la 0.32.0 (audit des compétences, `docs/SORTS.md` § 8). Valeur nette de +6,7 à +10,3 points pour Elaria (49,0 → 52,1 %), de +7,5 à +9,9 pour Sylwen. Contre une Furie des vents, elle n'annule que le premier des deux coups. Un coup sacrifié (Vol de vie) ne la consomme pas. Environ 1,3 esquive imposée par combat.

**Compétence du 3 : Aura de précision** (🦅 permanente). Le multiplicateur de critique gagne +1 : ×2 devient ×3 pour Elaria, ×2,4 devient ×3,4 pour Sylwen. Le critique assuré d'Œil de faucon en profite aussi. Elle est cumulable depuis la 0.28.0 : +1 par charge, ×4 après deux 3. Les elfes l'obtiennent dans trois combats sur quatre.

**Réglage 0.26.0** : avec les auras, les elfes tombaient à 45-46 % de victoires, et les orcs montaient à 54,7 %. Les elfes gagnent 3 PV (Elaria 51, Sylwen 53), et les orcs en perdent 2 (Gorak 59, Murzug 55).

### Elaria · Rôdeuse

> « Un souffle, une flèche. »

- **Fantasy** : l'éclaireuse insaisissable, jamais là où l'on frappe.
- **Stats** : PV 48 (le minimum du roster), d8, armure 0, esquive 33 % (le maximum), critique 22 % (le maximum) ×2.
- **Comment elle gagne** : un tiers des coups adverses passent dans le vide, et ses critiques fréquents rattrapent son petit dé.
- **Comment elle perd** : quand l'esquive ne passe pas, ses PV fondent. Contre Ervald (armure 1, poison), son pire duel (44 %), ses petits coups sont rognés et ses PV bas fondent sous le poison.
- **Mesures** : 51,7 % de victoires (0.26.0). Elle bat les orcs (56 % et 54 %). Duel le plus dur : Brokk (45 %).
- **Décisions** :
  - Elle a les PV les plus bas parce qu'elle a la meilleure défense active. Le hasard de l'esquive crée de la variance : ses combats sont les plus imprévisibles.
  - Son point faible face à l'armure est voulu. Depuis que les nains n'ont plus d'armure passive (0.24.1), il ne joue plus que contre Ervald et les boucliers.

### Sylwen · Sentinelle sylvestre (variante d'Elaria)

> « La forêt ne pardonne pas deux fois. »

- **Fantasy** : la gardienne patiente, qui attend l'ouverture parfaite.
- **Écarts avec Elaria** : PV +2 (50), esquive −7 points (26 %), critique −5 points (17 %), multiplicateur +0,4 (×2,4).
- **Teinte** : vert forêt (`hue-rotate(-110deg)` depuis la 0.30.1 ; l'ancien `hue-rotate(120deg)` aurait passé la nouvelle elfe bleu nuit au rouge).
- **Mesures** : 51,2 % de victoires (0.26.0). **À surveiller** : 60 % contre Murzug, à la limite du budget de duel.
- **Décisions** :
  - Elle est moins aléatoire qu'Elaria (moins d'esquive, moins de critiques), mais chaque critique pèse davantage.
  - Son gros multiplicateur valorise particulièrement Œil de faucon, qui force un critique.
  - **Piste** : si elle descend sous 48 %, remonter légèrement ses PV plutôt que son esquive, pour garder son identité « moins insaisissable ».

---

## Nains : user l'adversaire

**Compétence du 1 : Peau de pierre** (🛡️ +6 d'armure temporaire, +4 avant la 0.28.0). Ce bonus se cumule, absorbe des points (jamais sous 1 dégât) et s'use en encaissant. Il renforce le nain qui tient la ligne. C'est désormais sa seule protection.

**Compétence du 2 : Épines** (🌵 6 pendant 1 tour, depuis la 0.29.0). Le jet du 2 ne frappe pas, il pose les Épines. Jusqu'au début du prochain tour du nain, **chaque** coup qui le touche lui retire ses PV normalement, puis renvoie 6 dégâts directs à l'attaquant. Ces dégâts ignorent armure, esquive et boucliers. **Contre une Furie des vents, les deux coups sont punis, soit 12 dégâts** : c'est le genre d'interaction surprenante que l'utilisateur veut favoriser. Jusqu'en 0.28.0, les épines valaient 4 et ne punissaient que le premier coup : leur valeur nette était presque nulle (+1 à +5 points de victoire). Elle est maintenant d'environ +9,5 points pour Brokk et +3,6 pour Grimbald. Environ 6,4 dégâts renvoyés par combat pour Brokk.

**Compétence du 3 : Aura d'intimidation** (😠 permanente, portée par le nain). Les coups de son adversaire infligent 2 de moins, avant l'armure : un 10 devient 8. Elle se combine aux autres calculs : une Aura de puissance de l'orc (+2) l'annule, et un coup ne descend jamais sous 1. Elle est cumulable depuis la 0.28.0 : −2 par charge, −4 après deux 3. C'est la compétence qui fait du nain un tank (valeur nette d'environ +20 points pour Brokk), à la place de l'armure passive perdue. Brokk l'obtient dans trois combats sur quatre, Grimbald dans près de deux sur trois.

**Armure passive retirée (0.24.1)** : Brokk avait 2 d'armure et Grimbald 1, retirées de chaque coup avant l'Armure temporaire. Cumulées, les deux protections étaient un trop gros avantage, et deux notions nommées « armure » prêtaient à confusion. Les deux nains n'ont plus d'armure passive. En compensation, mesurée par simulation : sans rien changer d'autre, Brokk tombait à 18 % et Grimbald à 35 %. Leurs PV passent donc à 72 et 59 (74 et 63 depuis la 0.25.0, voir plus bas).

### Brokk · Gardien

> « Ce qui passe la porte passe par moi. »

- **Fantasy** : le gardien qui ne recule jamais.
- **Stats** : PV 68 (le maximum du roster), d8, armure 0, esquive 6 %, critique 8 % ×2,5. Il est petit à l'écran (`scale: 0.78`).
- **Comment il gagne** : il encaisse plus que quiconque, et Peau de pierre allonge encore le combat. Ses combats restent les plus longs.
- **Comment il perd** : son d8 et ses critiques rares le rendent lent à finir l'adversaire. Le poison et le vol de vie d'Ervald (45 %), qui profitent des combats longs, pèsent sur lui.
- **Mesures** : 51,1 % de victoires (0.26.0), les combats les plus longs (environ 25 tours).
- **Décisions** :
  - Son armure passive de 2 a été retirée en 0.24.1 : cumulée à Peau de pierre, elle protégeait trop. Son endurance passe désormais par les PV, compensés par l'offensive la plus faible du roster.
  - **À surveiller** : le duel contre Ervald (45 %), où le poison, qui ignore tout, gagne avec la durée du combat.

### Grimbald · Briseur de fer (variante de Brokk)

> « Pourquoi parer quand on peut briser ? »

- **Fantasy** : le forgeron devenu briseur, qui a sacrifié de l'endurance pour frapper plus fort.
- **Écarts avec Brokk** : dé +2 (d10), PV −11 (57), critique +2 points (10 %, depuis la 0.28.0 : un briseur frappe plus souvent fort). Plus d'armure passive depuis la 0.24.1 (il en avait 1).
- **Teinte** : acier brut, presque sans couleur (`saturate(0.15) brightness(1.15)`).
- **Mesures** : 51,5 % de victoires (0.26.0). Il bat Ervald (55 %), dont il raccourcit les combats.
- **Décisions** :
  - C'est le nain offensif : il garde Peau de pierre et ses critiques ×2,5, mais tient moins longtemps.
  - Il montre qu'une variante peut changer le style d'une race (de l'usure à l'échange de coups) sans changer son événement.

---

## Morts-vivants : affliger

**Événement : Souffle de la tombe** (1 au dé → ☠️ l'adversaire est empoisonné : Poison 3, il perd 3, 2 puis 1 PV au début de ses tours suivants, soit 6 PV ; jusqu'en 0.36.3, 2 PV pendant 3 tours). C'est la première race à poser une **aura négative sur l'adversaire**. Ses dégâts ne viennent pas que de ses coups : le poison ignore l'armure, l'esquive et les boucliers. Si un second poison tombe avant la fin du premier, les charges s'additionnent : un poison 1 qui reçoit 3 devient un poison 4 (4, 3, 2, 1). Environ 1,3 événement par combat pour Ervald.

**Réglage** : la première version (54 PV, poison 2 × 3) plafonnait à 46 % de victoires. Avec un poison 3 × 3 (9 PV), Ervald montait à 62 % : un poison qui ignore l'armure est très fort. Version retenue : 56 PV et poison 2 × 3. **0.36.4** : le poison n'a plus qu'une valeur (demande de l'utilisateur) ; Souffle de la tombe passe à Poison 3, les mêmes 6 PV mais plus tôt. Ervald 47,4 → 48,4 %, Caldrec 51,9 → 52,0 % (1 000 combats par duel).

**Compétence du 2 : Vol de vie** (🦇, une charge, sans durée depuis la 0.29.0). Le jet du 2 ne frappe pas : le mort-vivant gagne 1 charge de Vol de vie. Son **prochain coup porté** la consomme. S'il touche, il rend les PV qu'il retire (frapper à 10, c'est infliger 10 et regagner 10). S'il est **esquivé**, la charge est perdue sans rien rendre. Un nouveau jet de 1 à 3 n'est pas un coup porté : **la charge reste** (règle de l'utilisateur : « pas de coup donné, donc charge conservée »). Un nouveau 2 la renouvelle, mais elle reste unique. Jusqu'en 0.28.0, elle expirait à la fin du tour suivant, même sans avoir servi. Valeur nette d'environ +5 points. Environ 4,6 PV volés par combat pour Ervald, 3,9 pour Caldrec.

**Réglage 0.25.0** : le coup sacrifié coûte cher. Sans compensation, les morts-vivants tombaient à 43,5 %. Ervald passe de 56 à 60 PV, et Caldrec de 54 à 58.

**Compétence du 3 : Aura de poison** (☣️ permanente, cumulable, portée par le mort-vivant). Au début de chacun de ses tours, **avant son coup**, son adversaire perd 1 PV par charge. Ce sont des dégâts directs, sans armure, esquive ni bouclier. Chaque nouveau 3 ajoute une charge : 2 PV par tour, puis 3… À l'écran, le nom de l'aura flotte au-dessus du mort-vivant, et le « −1 » tombe sur l'adversaire avant l'élan du coup. Environ 7 PV par combat pour Ervald (aura obtenue dans trois combats sur quatre, 1,8 charge en moyenne), 4,5 pour Caldrec.

**Réglage 0.26.0** : Caldrec tombait à 45,8 %. Il ne perd plus de PV par rapport à Ervald (60).

### Ervald · Chevalier liche

> « La mort l'a rendu, pas pardonné. »

- **Fantasy** : le capitaine tombé en défendant Ostremort, revenu sous son étendard pourpre. Il ne fatigue jamais.
- **Stats** : PV 58, d8, armure 1, esquive 8 %, critique 12 % ×2. Il est grand à l'écran (`scale: 1.02`).
- **Comment il gagne** : il encaisse, et chaque jet raté ronge l'adversaire au fil des tours. Contre les elfes, peu nombreux en PV et sans armure, le poison pèse lourd (54 % contre Elaria). Le vol de vie le fait durer encore.
- **Comment il perd** : ses propres coups sont faibles (4,4 dégâts par coup, comme Brokk). Et chaque 2 est un coup perdu, rattrapé seulement si le coup suivant touche. Les adversaires au d10 qui raccourcissent le combat (Grimbald, Caldrec) le gênent le plus.
- **Mesures** : 48,8 % de victoires (0.26.0), environ 22 tours par combat. Il bat Sylwen (56 %), mais perd contre les orcs (45 % et 41 %), dont la puissance l'emporte sur son usure.
- **Décisions** :
  - Il réutilise le statut Poison du registre, sans aucune règle nouvelle dans le moteur. Ajouter la race a seulement demandé des données.
  - Il a une armure légère (1). C'est la seule armure passive du roster depuis que les nains l'ont perdue (0.24.1).

### Caldrec · Faucheur d'âmes (variante d'Ervald)

> « Il ne garde rien, pas même son bouclier. »

- **Fantasy** : le lieutenant qui a troqué l'armure pour une lame spectrale.
- **Écarts avec Ervald** : dé +2 (d10), armure −1 (0), PV −2 (56), critique +4 points (16 %).
- **Teinte** : spectrale, vert-bleu (`hue-rotate(-110deg)`), contre le pourpre d'Ervald.
- **Mesures** : 48,3 % de victoires (0.26.0), des combats d'environ 19 tours. Son d10 tombe moins souvent sur 2 : il sacrifie moins de coups qu'Ervald.
- **Décisions** :
  - C'est le même renversement que Brokk/Grimbald : la variante échange l'endurance contre l'offensive, et garde l'événement de sa race.
  - Ses combats rapides laissent moins de temps au poison d'agir : son identité passe davantage par les coups que par l'affliction.

---

## Humains : contrôler

**Image** : `human.png`, une prêtresse solaire à la masse sacrée (0.30.0). L'utilisateur avait demandé « un prêtre » : l'image générée est une prêtresse, la famille est donc au féminin.

**Principe** : elle mise sur ses compétences plutôt que sur ses dégâts. Son petit dé (d7) fait de 3 jets sur 7 (43 %) une compétence, au lieu de 3 sur 8 pour un d8 ou 3 sur 10 pour un d10.

**Compétence du 1 : Peur** (😱 sur l'adversaire). L'adversaire, terrifié, perd sa prochaine action, puis la peur disparaît. Elle est instantanée. La victime tremble de gauche à droite tant qu'elle a peur (`look.motion`). Valeur nette d'environ +16 points.

**Compétence du 2 : Purification**. Effet immédiat : elle retire à l'adversaire **son dernier bonus posé, avec toutes ses charges**, aura comprise (6 charges d'Aura de puissance partent d'un coup). L'utilisateur a demandé « un buff » sans dire lequel : c'est le dernier posé dans l'ordre de la liste, sans tirage au sort. Valeur nette d'environ +10 points.

**0.42.0, Purification de repli** (audit des compétences) : quand l'adversaire n'a aucun bonus à retirer, la lumière lui inflige **5 dégâts directs** au lieu de tomber à vide (54 % des déclenchements avant). Gâchis de 54 % à 0 %, valeur nette de +8,3 à **+12,8 points** (Bérengère de même). Contre Brokk, qui a presque toujours un bonus, rien ne change : un éclat à chaque Purification le faisait tomber à 23,7 % contre Ysolde.

**Compétence du 3 : Aura de sainteté** (🕊️ permanente, cumulable). Elle regagne 2 PV par charge à la fin de chacun de ses tours. C'est la compétence qui la porte : **+42 à +44 points de victoire**, la plus forte du roster.

**0.42.0, plafond de 3 charges** (6 PV par tour au plus). Valeur nette presque inchangée (+41,2 points, Bérengère +38,1), mais avec la Purification de repli, ses combats deviennent plus disputés : retours de 39,5 à 45,6 %, fins serrées de 16 à 22 %, de 36 à 33 tours. Le plafond à 2 faisait encore mieux à l'écran (fins serrées à 26 %), mais coûtait trop : prêtresses à 43 %, ou Brokk sous 25 % avec un éclat plus fort. Ysolde de 47,1 à **48,6 %**, Bérengère de 46,0 à **48,2 %**.

**Réglage 0.30.0** (méthode : [EQUILIBRAGE.md](EQUILIBRAGE.md)) :
- avec un d6 (l'utilisateur hésitait entre d6 et d7), Ysolde gagnait **63 %** de ses combats, qui duraient **52 tours** : la moitié de ses jets étaient des compétences, et son aura de sainteté se cumulait très vite ;
- avec un d7 : 51 %, combats de 39 tours.

### Ysolde · Prêtresse solaire

> « Le soleil ne frappe pas. Il juge. »

- **Stats** : PV 52, d7, armure 0, esquive 8 %, critique 10 % ×2.
- **Comment elle gagne** : elle tient, se soigne, terrifie et purifie. Les combats s'allongent en sa faveur.
- **Comment elle perd** : ses coups sont les plus faibles du roster (5,2 dégâts par coup). Sans son aura, elle ne peut presque rien.
- **Mesures** : 51,0 % de victoires (0.30.0), environ 39 tours par combat, les plus longs du roster.
- **À surveiller** : elle écrase Brokk (72 %, voir « Questions ouvertes » dans EQUILIBRAGE.md). Sans son aura de sainteté, elle ne gagne que **0,7 %** de ses combats contre lui : l'intimidation ramène ses petits coups à 1 dégât, et seul le soin la fait gagner.

### Bérengère · Inquisitrice (variante d'Ysolde)

> « La lumière brûle aussi. »

- **Écarts avec Ysolde** : PV −2 (50), critique +6 points (16 %).
- **Teinte** : désaturée et contrastée (`saturate(0.55) brightness(0.92) contrast(1.1)`), plus austère.
- **Mesures** : 50,8 % de victoires (0.30.0), environ 37 tours par combat.

---

## Hommes-lézards : tenter sa chance

**Image** : `lizardman.png`, une assassine lézarde aux dagues dorées (0.30.0). La famille est au féminin pour la même raison. L'original s'appelle **Naraxes**, à la demande de l'utilisateur.

**Principe** : la chance et le poison. Bonne esquive, critiques, et des compétences à double tranchant.

**Compétence du 1 : Coup de chance** (🍀). À sa prochaine action, elle lance un **d6 vert** en plus de son dé : deux coups, résolus à part. Sur 4 à 6, le d6 frappe ; sur 1 à 3, il déclenche une compétence (Coup de chance, Pile ou face ou l'aura). **0.36.5** : c'était un d3, qui tombait toujours sur 1, 2 ou 3 et ne frappait donc jamais (règle de la 0.27.0) : valeur nette de +0,7 (Ssythra) à +2,7 points (Naraxes). Avec le d6 : +3,6 points pour chacune ; Ssythra de 48,1 à 50,3 %, Naraxes à 49,4 %.

**Compétence du 2 : Pile ou face** (🪙). À sa prochaine action, une **pièce** remplace son dé. Pile, l'adversaire perd 15 PV, en dégâts directs ; face, rien. La pièce rapporte 7,1 dégâts en moyenne, contre 3,5 pour un coup normal. Sa valeur nette est pourtant **négative** (−5 points), parce qu'elle ne frappe pas : elle ne déclenche pas l'Aura de décoction, et elle prive la voleuse d'un jet de dé.

**0.42.0, pile à 20 qui touche** (FAMILLES.md § 6.2 A, choix de l'utilisateur) : pile passe de 15 à 20 dégâts directs et compte comme un coup qui touche (l'Aura de décoction empoisonne). Face reste vide : la dualité nette et sa mise en scène sonore (tintement, son du critique) sont l'intérêt de la compétence. Une face qui frappe normalement avait été proposée (+5 points), puis refusée pour cette raison. Valeur nette de −5,0 à **+0,0** (Naraxes) et de −4,0 à **+0,6** (Ssythra). Naraxes de 49,4 à **52,9 %**, Ssythra de 50,3 à **53,6 %**. Prix accepté par l'utilisateur : Ysolde tombe à 35 % contre l'une et l'autre, deux contres connus de plus (EQUILIBRAGE.md).

**Compétence du 3 : Aura de décoction** (🧪 permanente, cumulable). Chaque coup qui touche pose sur la cible 2 charges de poison par charge d'aura (0.36.4 ; avant : 1 charge pendant 4 tours) ; le poison se résout comme le poison ordinaire, et s'estompe d'une charge par tour. Valeur nette d'environ +9 à +13 points en 0.30.0. **Mesure 0.36.4** (1 000 combats par duel) : avec 1 charge, Naraxes 38,2 % et Ssythra 39,4 % ; avec **2**, 48,3 % et 47,7 % ; avec 3, 54,6 % et 53,4 %. Ssythra bat Bérengère à 63,7 %, contre connu.

**Réglage 0.30.0** :
- avec un d8, Naraxes gagnait **33,5 %** de ses combats (Ssythra 30,7 %) ;
- le **dé** est le meilleur levier : d10, donc moins de jets sacrifiés et de plus gros coups, tout en gardant ses PV bas de voleuse ;
- s'y ajoutent l'esquive (18 → 20 %) et la durée du poison de la décoction (3 → 4 tours, une valeur que l'utilisateur n'avait pas fixée) ;
- résultat : 50,3 %.

### Naraxes · Voleuse

> « Pile, je gagne. Face, tu perds quand même. »

- **Stats** : PV 50, d10, armure 0, esquive 20 %, critique 14 % ×2.
- **Comment elle gagne** : elle esquive, empoisonne, et un pile tombe parfois au bon moment.
- **Comment elle perd** : peu de PV, et ses compétences du 1 et du 2 rapportent peu.
- **Mesures** : 50,3 % de victoires (0.30.0), environ 20 tours par combat.

### Ssythra · Assassine (variante de Naraxes)

> « Une seule morsure suffit. »

- **Écarts avec Naraxes** : PV −2 (48), esquive −4 points (16 %), critique +6 points (20 %), multiplicateur +0,3 (×2,3).
- **Teinte** : écailles orangées (`hue-rotate(-80deg)`).
- **Mesures** : 48,9 % de victoires (0.30.0), les combats les plus courts du roster (environ 19 tours).

---

## Paladin : rendre les coups

**Image** : `paladin.png`, un chevalier en armure à l'épée flamboyante, avec une bannière rouge (0.31.0). C'est un humain, mais il forme sa propre famille ; sa variante est Gauvain (0.32.0). Son nom, Aldric, est un choix par défaut.

**Compétence du 1 : Rétribution** (⚖️, mécanique inédite). Trois jauges stockent les PV retirés par les trois derniers coups qu'il a encaissés : 10, puis 2, puis 1. Une fois pleines, la plus ancienne cède sa place. Sur un 1, il relâche la somme en dégâts directs, au moins 1 même si les jauges sont vides, puis elles se vident. Elle peut donc coûter très cher à l'adversaire, ou presque rien. Les jauges s'affichent dans sa zone d'état, avec leur détail au survol. Valeur nette : **+34 points**, c'est elle qui le porte.

**Compétence du 2 : Riposte** (⚔️, sans durée depuis la 0.32.0). Le prochain coup qui le touche lui renvoie la moitié des PV retirés (arrondie), en dégâts directs, puis la charge est consommée. Jusqu'à la 0.31.0, elle durait un tour et s'éteignait à vide si l'adversaire sacrifiait son coup (jet de 1 à 3) : c'était un bug. Valeur nette : +3,8 points (4,0 PV renvoyés par combat), contre +1,4 point avant.

**Compétence du 3 : Aura d'immunité** (permanente, non cumulable). Elle retire tous ses malus, puis plus aucun malus ne peut lui être posé jusqu'à la fin du combat (Peur, Poison…), sans que l'aura s'use. Une Purification de prêtresse peut la lui retirer, comme tout bonus. Valeur nette : **−1,7 point**. Peu d'adversaires posent des malus, et le 3 sacrifie son coup.

**0.42.0, immunité et armure** (choix de l'utilisateur) : tant que l'aura est là, son armure gagne 1, en plus de l'immunité. C'est une règle d'aura, permanente et lisible, la même pour Gauvain. Un bouclier de 2 posé à chaque 3 avait été proposé, puis jugé peu clair. Valeur nette de −2,7 à **+1,1** (Aldric) et de −3,9 à **−0,6** (Gauvain). Compensation : son **esquive passe de 5 à 2 %** (Gauvain de 10 à 7 %). Sans elle, Aldric battait Thaldrin à 66-68 %, même avec 10 % de critique : l'armure vise les petits coups de l'ours, et l'immunité bloque déjà sa Pourriture et sa Luciole. Après : Aldric 53,8 % (53,3 avant), Gauvain 49,9 % (49,5), Aldric contre Thaldrin 62,5 %. La **Rétribution** (+36 et +31 points) n'est pas touchée (décision de l'utilisateur) : deux jauges au lieu de trois faisaient d'ailleurs passer Aldric sous 35 % contre Brokk.

**Réglage 0.32.0** : la riposte réparée le portait à 57,3 %, avec Sylwen battue à 67/33 et Gauvain contre Naraxes à 66/34. Le critique passe de 15 à 12 % : Aldric revient à 55,0 % et Gauvain à 50,8 %. Les duels sont ramenés sous 65/35, sauf Ssythra contre Aldric, à 33/67 (contre connu).

**Réglage 0.31.0** : avec 10 % de critique ×2, Brokk le battait à 75 % : l'intimidation rognait ses coups moyens, et Brokk frappe trop peu pour remplir les jauges. Avec un d10, il montait à 58,6 % au global. Les critiques lourds (15 % ×2,5) règlent le mieux ce duel (Brokk à environ 38 %), en gardant le d8.

### Aldric · Paladin

> « Chaque coup reçu est une dette. »

- **Stats** : PV 60, d8, armure 0, esquive 5 %, critique 12 % ×2,5 (15 % jusqu'à la 0.31.0).
- **Comment il gagne** : il encaisse, remplit ses jauges et relâche une rétribution énorme au bon moment, ou un critique lourd.
- **Comment il perd** : contre un adversaire qui frappe peu fort (Brokk), ses jauges restent maigres.
- **Mesures** : 54,8 % de victoires (0.31.0), environ 21 tours par combat. Il bat Ssythra à 66 % : un contre connu (EQUILIBRAGE.md).

### Gauvain · Croisé

> « La foi tranche plus vite que la loi. »

- **Stats** : PV 54 (−6), d8, esquive 10 % (+5), critique 17 % ×2,5 (+5).
- **Différence** : il gagne plus souvent sur un critique et encaisse moins. Il a donc des jauges de rétribution plus maigres : 29 points de valeur nette, contre 34 pour Aldric.
- **Teinte** : dorée (`sepia(0.35) hue-rotate(-25deg) saturate(1.4)`).
- **Mesures** : 50,8 % de victoires (0.32.0, 400 combats par duel), environ 20 tours par combat. Brokk le bat à 64 % : contre connu, comme pour Aldric (63 %).

---

## Ogre : taper, attendre, taper plus fort

**Image** : `ogre.png`, un ogre ventru, casque cabossé et massue cloutée, un papillon posé dessus (0.35.0).

**Philosophie** (décision de l'utilisateur) : bête comme ses pieds, il n'a **aucune compétence**. Sur un 1, un 2 ou un 3, il gagne **Attente** (montre à gousset) : il ne frappe pas ce tour-là et attend son prochain jet. En contrepartie, il tape très fort, avec un **d14**.

**Réglage 0.35.0** : avec 8 % de critique et 66 PV, Morgrut gagnait 63 % de ses combats, et Gnashka 67 %, avec des duels jusqu'à 74/26. Le dé est le levier le plus fort (passer au d12 lui ôtait 19 points), mais le d14 est la proposition de l'utilisateur. On a donc retiré le critique (il ne vise pas, ce qui va avec son personnage) : 57,3 %. Puis 63 PV au lieu de 66 : 51,7 %. Valeur des trois Attente : de −1,5 à −3,8 points chacune ; c'est le prix de son gros dé.

### Morgrut · Cogneur

> « Taper. Attendre. Taper plus fort. »

- **Stats** : PV 63, d14, armure 0, esquive 0 %, critique 0 % (×2).
- **Comment il gagne** : 11 jets sur 14 frappent, en moyenne pour 9 dégâts.
- **Comment il perd** : contre Brokk (36 %), dont l'intimidation rogne ses gros coups, et contre l'esquive des elfes (44 à 49 %).
- **Mesures** : 51,7 % de victoires (0.35.0, 400 combats par duel), environ 19 tours par combat. Il bat les prêtresses à 61-62 %.

### Gnashka · Ogre des cavernes

> « Plus gris, plus dur, toujours aussi perdu. »

- **Stats** : PV 70 (+7), d12 (−2), critique 10 % (+10).
- **Différence** : plus endurante et capable de critiques, mais elle frappe moins fort. Elle attend aussi plus souvent : 3 jets sur 12.
- **Teinte** : peau grise (`hue-rotate(185deg) saturate(0.45)`).
- **Mesures** : 52,5 % (0.35.0).

---

## Druide : deux visages

**Images** : `druid.png` (forme humaine, bois de cerf, bâton et magie verte) et `druid-bear.png` (ours humanoïde aux runes émeraude), en 0.35.0.

**Philosophie** (décision de l'utilisateur) : au début de chacun de ses tours, sauf le premier, il **change de forme**. Ses trois compétences dépendent de sa forme.
- **Forme humaine** (soutien) :
  - **Fleur de vie** (1) : Régénération 2 pendant 3 tours (0.42.0 ; +3 PV d'un coup avant). Le soin continue sous la forme d'ours. Valeur nette de +0,3 à **+2,2** (Thaldrin) et de +1,1 à **+3,4** (Brannoc) ;
  - **Écorce épaisse** (2) : un bouclier de 5 (4 avant la 0.36.5), qui se cumule. À 4, sa valeur nette était de +0,4 point (Thaldrin) et +1,9 (Brannoc) ; à 5, +2,3 et +2,4. À 6, Thaldrin battait Bérengère à 65/35, au-delà du budget ;
  - **Luciole** (3) : un malus de **3 charges** sur l'adversaire (0.35.1, une seule auparavant), qui ne peut plus esquiver et subit **+2 dégâts** à chaque coup encaissé (0.35.2) ; une charge part à chaque coup encaissé, et les charges se cumulent.
- **Forme d'ours** (attaque) :
  - **Charge** (1) : un coup à la valeur maximale du dé, jamais critique ;
  - **Coup de griffe** (2) : le dé est relancé en secret, le coup vaut ce jet plus 3 ;
  - **Aura de pourriture** (3) : une aura cumulable. Chaque coup qui touche pose, par charge d'aura, une charge de Pourriture (1 dégât au début de chaque tour de la cible) qui ne s'estompe pas.

Le 1 et le 2 de l'ours ne sacrifient pas le coup, ils le transforment. Le jet affiché reste le 1 ou le 2.

**Mesures des compétences** (valeur nette, 0.35.0) :

| Compétence | Thaldrin | Brannoc |
| --- | --- | --- |
| Charge | +7,6 | +6,4 |
| Aura de pourriture | +6,6 | +6,2 |
| Coup de griffe | +5,2 | +6,2 |
| Écorce épaisse | +1,2 | +1,8 |
| Fleur de vie | +0,2 | +0,7 |
| **Luciole** | **−2,4** | **−2,0** |

**0.35.1, Luciole à 3 charges** (décision de l'utilisateur) : sa valeur nette passe de −2,4 à −1,3 chez Thaldrin, de −2,0 à −0,8 chez Brannoc. Thaldrin de 48,0 à 49,1 %, Brannoc de 49,4 à 50,6 %.

**0.35.2, Luciole à +2 dégâts** (décision de l'utilisateur) : sa valeur nette passe à +3,2 (Thaldrin) et +2,8 (Brannoc). Le druide montait à 53 % et battait les prêtresses à 65-68 %, car la Pourriture use leurs soins et Luciole les fait encaisser plus fort. Son critique passe de 10 à 8 % (Brannoc 12 %) : Thaldrin 51,4 %, Brannoc 52,2 %. À 6 %, Aldric, que son immunité protège de Luciole, le battait à 65 %.

Luciole est désormais une vraie compétence, la quatrième du druide après celles de l'ours. Voir EQUILIBRAGE.md.

### Thaldrin · Druide

> « La forêt a deux visages. »

- **Stats** : PV 56, d10, armure 0, esquive 8 %, critique 8 % ×2 (10 % jusqu'à la 0.35.1).
- **Mesures** : 48,0 % de victoires (0.35.0). Il bat les prêtresses à 60-62 % (la Pourriture use leurs soins), mais perd contre Aldric (38 %) et les ogres (44 %).

### Brannoc · Druide d'automne

> « Les feuilles tombent, les griffes aussi. »

- **Stats** : PV 52 (−4), esquive 12 % (+4), critique 12 % (+4).
- **Teinte** : feuillage roux (`hue-rotate(-28deg) saturate(1.25)`).
- **Mesures** : 49,4 % (0.35.0). Il bat les prêtresses à 66 % : contre connu (EQUILIBRAGE.md).

## Barde : deux dés, et la musique sur les doubles

**Images** : `bard-idle.png` et cinq postures (0.41.0, session images). Saltimbanque de foire, en tenue bigarrée à losanges et chapeau à plume, avec un luth et une rapière. Taille 1,00, celle d'un humain.

**Concept** (d'un ami de l'utilisateur) : un petit d5, mais **deux dés à chaque tour**. Ses compétences se déclenchent sur les **doubles**, pas sur un 1, un 2 ou un 3 :
- **hors double**, deux coups séparés, chacun avec son esquive et son critique (décision de l'utilisateur) ;
- **sur un double** qui a sa compétence, celle-ci remplace les deux coups. Un double sort une fois sur cinq, chaque double une fois sur 25.
  - **Siffloter** (double 1) : Sifflotement, 3 charges, +2 PV à chaque fin de tour ; les charges s'ajoutent.
  - **Fausse note** (double 2) : un malus sur l'adversaire, −5 dégâts finaux sur son prochain coup qui touche, par charge. L'utilisateur avait demandé « −3, mesuré » : à −3, sa valeur nette était de −1,2 point ; à −5, de −0,2.
  - **Aura mélodieuse** (double 3) : +1 dégât final par charge sur chacun de ses coups, permanente.
  - **Crescendo** (double 4) et **Soliste** (double 5) : un seul gros coup de 12 et de 15. Le concept prévoyait trois coups de 4 et de 5 ; c'est l'utilisateur qui a eu l'idée du coup unique.
- **Ouverture** (au début du combat) : elle entre en scène avec 1 charge d'Aura mélodieuse.

**Pourquoi « dégâts finaux » et l'Ouverture** : appliqué à la lettre, le concept gagnait 45 % de ses combats, mais perdait 87/13 contre Brokk, 78/22 contre Grimbald et 71/29 contre Ervald. Tout ce qui retire une valeur fixe à chaque coup rogne ses petits coups (3 en moyenne) : l'intimidation (−2 par coup), les épines (6 renvoyés par coup) et l'armure de 1 d'Ervald. Le texte du concept parle de « dégâts finaux » pour l'aura et la fausse note : ils s'appliquent donc après l'armure. Comme un double 3 n'arrive que 0,4 fois par combat, l'Ouverture pose l'aura dès le début. La compensation est de 46 PV et 5 % de critique. Toutes les pistes mesurées sont dans EQUILIBRAGE.md.

**Mesures** (0.41.0, 400 combats par duel), valeur nette en points :

| Compétence | Fanchon | Mélisande |
| --- | --- | --- |
| Ouverture | +25,4 | +25,2 |
| Soliste | +2,6 | +2,4 |
| Crescendo | +1,8 | +2,4 |
| Siffloter | +1,3 | +0,9 |
| Fausse note | −0,2 | −1,1 |
| Aura mélodieuse (double 3) | −1,1 | −1,1 |

Elle n'a pas de jet raté : 0 % de jets sans dégâts, contre 20 à 43 % pour les autres. Ses compétences, en revanche, sont rares : environ 0,3 déclenchement par compétence et par combat. Une deuxième charge d'aura (double 3) coûte les deux coups du tour pour +1 par coup : elle se rentabilise mal en 17 tours.

### Fanchon · Saltimbanque

> « Deux dés, une chanson, aucune fausse note. Sauf chez vous. »

- **Stats** : PV 46, 2 × d5, armure 0, esquive 12 %, critique 5 % ×2.
- **Mesures** : 52,3 % (0.41.0). Duels de 45 à 62 %, sauf contre Brokk (29 %, contre connu).

### Mélisande · Ménestrelle

> « Elle chante juste, et frappe plus juste encore. »

- **Stats** : PV 48 (+2), esquive 8 % (−4).
- **Teinte** : `hue-rotate(150deg) saturate(1.2) brightness(0.95)` (turquoise et vert), vue à l'écran.
- **Mesures** : 51,2 % (0.41.0 ; 54,8 % avec +4 PV). Duels de 38 à 61 %, sauf contre Brokk (35 %, à la limite, contre connu).

---

## Matrice des duels

Taux de victoire de la ligne contre la colonne.

| | Gorak | Murzug | Elaria | Sylwen | Brokk | Grimbald | Ervald | Caldrec | Ysolde | Bérengère | Naraxes | Ssythra | **Global** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Gorak** | — | 49 % | 44 % | 48 % | 42 % | 49 % | 55 % | 50 % | 47 % | 50 % | 55 % | 56 % | **49,4 %** |
| **Murzug** | 51 % | — | 47 % | 47 % | 43 % | 48 % | 56 % | 50 % | 55 % | 57 % | 53 % | 56 % | **51,1 %** |
| **Elaria** | 56 % | 54 % | — | 49 % | 49 % | 52 % | 46 % | 48 % | 47 % | 49 % | 53 % | 56 % | **50,6 %** |
| **Sylwen** | 53 % | 53 % | 51 % | — | 51 % | 50 % | 46 % | 43 % | 46 % | 46 % | 55 % | 58 % | **50,0 %** |
| **Brokk** | 58 % | 57 % | 51 % | 50 % | — | 50 % | 49 % | 56 % | 28 % | 29 % | 41 % | 44 % | **46,6 %** |
| **Grimbald** | 51 % | 52 % | 48 % | 50 % | 50 % | — | 53 % | 50 % | 47 % | 51 % | 50 % | 54 % | **50,5 %** |
| **Ervald** | 46 % | 45 % | 55 % | 55 % | 51 % | 47 % | — | 44 % | 40 % | 40 % | 50 % | 54 % | **47,7 %** |
| **Caldrec** | 50 % | 50 % | 53 % | 57 % | 44 % | 50 % | 56 % | — | 57 % | 55 % | 56 % | 57 % | **53,1 %** |
| **Ysolde** | 53 % | 45 % | 54 % | 54 % | 72 % | 53 % | 60 % | 43 % | — | 45 % | 43 % | 40 % | **51,0 %** |
| **Bérengère** | 50 % | 43 % | 52 % | 54 % | 71 % | 50 % | 61 % | 45 % | 56 % | — | 42 % | 36 % | **50,8 %** |
| **Naraxes** | 45 % | 47 % | 47 % | 46 % | 59 % | 50 % | 50 % | 44 % | 57 % | 58 % | — | 52 % | **50,3 %** |
| **Ssythra** | 45 % | 44 % | 44 % | 42 % | 56 % | 46 % | 46 % | 43 % | 60 % | 64 % | 48 % | — | **48,9 %** |

À refaire après tout changement de stats, d'événement ou de règle. Le test `balance.test.ts` vérifie le global ; cette matrice sert à repérer les duels déséquilibrés.

---

## Ajouter un personnage : check-list de design

- [ ] En une phrase, comment il gagne et comment il perd. Sa place doit être distincte de celle des personnages existants.
- [ ] Ses stats sont dérivées de l'archétype de sa race, ou une nouvelle race est définie avec son événement.
- [ ] Son événement (ou celui de sa race) prolonge son identité.
- [ ] La fiche courte est écrite dans `roster.ts` (`lore`), et sa section ajoutée ici : fantasy, stats, comment il gagne et perd, mesures, décisions.
- [ ] La matrice des duels est remesurée (`npm run balance`), avec un global entre 42 et 58 %, aucun duel au-delà de 65/35, selon la méthode d'[EQUILIBRAGE.md](EQUILIBRAGE.md).
- [ ] L'image respecte `docs/STYLE_BIBLE.md`. Sur fond uni, elle se détoure avec `scripts/cutout-character.py`.
- [ ] Facultatif : ses cinq postures communes (attaque, esquive, coup encaissé, K.O., victoire), générées en planches avec la garde en première case et découpées par `scripts/slice-poses.py` ([POSTURES.md](POSTURES.md)).
