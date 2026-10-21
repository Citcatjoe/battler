# Audit du compendium (2026-10-20, avant la refonte 0.72.0)

Audit en lecture seule des données des compétences et des statuts, demandé par l'utilisateur avant la réorganisation du compendium : les incohérences sont **signalées ici, pas corrigées en silence**. Ce que la refonte a corrigé, et ce qui reste ouvert, est résumé en tête ; le rapport complet suit.

## Suite donnée (0.72.0)

**Corrigé par la refonte** (structure du compendium, sans toucher aux règles du combat) :
- **Trois rédactions d'une compétence → une** (`describeSkill`, `events.ts`). Elle dit désormais « s'il touche » (Pourfendre), les coups d'un double (Crescendo, Soliste n'avait plus de texte), le renfort par charge (Rancune, Sève) et la durée tirée des charges ; « de Aura » devient « d'Aura ».
- **Rétribution** listée dans les statuts : la source d'un statut compte aussi la relâche (`release`) et la pose par un autre statut (Aura glaciale et Aura de décoction → Poison ; Épines acérées → Saignement).
- **« Plafonné à 1 charges »** disparaît : le cumul et le plafond renvoient aux règles communes, le plafond est un nombre.
- **Phrases de règle répétées** (coup sacrifié, durée, cumul, conditions, chance et limite) : écrites une seule fois dans `rules.ts` (section Règles), citées par des pastilles.
- **Nature** : la fiche et l'infobulle des dés lisent la même valeur par défaut (`DEFAULT_SKILL_NATURE`). Le champ reste facultatif dans le type (les compétences des tests n'en ont pas), mais un test exige qu'il soit déclaré sur chaque compétence du roster : les 36 l'ont.

**Laissé tel quel, à décider** (signalé, rien n'a été réécrit) :
- Textes générés faux ou ambigus : Aura de précision « ×2 devient ×3 » (Elaria est à ×2,4), Coup de chance « frappe 2 fois » alors que toutes ses charges partent, Peur « cumulable » avec un plafond de 1, règle « Cumulable » (« la durée garde la plus longue ») qui ne dit rien pour un statut sans durée. Proposition : laisser `describe` calculer le multiplicateur à partir du porteur, et ne pas afficher « Cumulable » sous un plafond de 1.
- Règle « Un tour, trois phases » (reprise de `FEATURES.md` § 1) : elle cite Étourdi, hors jeu (la Peur fait perdre l'action en jeu). La fourchette « 1d8 à 1d10 » du dé de dégâts, fausse, n'a pas été reprise.
- Écarts entre documents et code de la section 6 (Gorak, Fanchon, Ervald, Écorce, Fausse note, Vol de vie, Coup de chance…).
- **Interactions d'ordre de résolution** : `statusLinks` déduit l'opposition, l'immunité, la garde, le statut posé, le renfort et la purge. L'ordre (Vol de vie, puis Riposte, puis Épines ; la plaie qui ne coule pas sur le coup qui l'ouvre ; Fausse note contre Furie ; sainteté contre Poison) ne se déduit pas : proposition, une courte liste explicite d'interactions dans `catalog.ts`, une phrase et deux ids chacune, testée contre `RESOLUTION.md`.

## Suite donnée (0.84.0, audit de fidélité du 2026-10-21)

Trois audits en lecture seule ont confronté le compendium au moteur (règles, statuts et reliques, compétences et fiches). Décisions de l'utilisateur appliquées : « un coup qui touche » est une seule règle, pile comprise (Vol de vie, Riposte et jauges de Rétribution réagissent dans les fenêtres du coup) ; la plaie différée (`strikeBase`) est retirée : un statut posé ou grossi pendant un coup réagit à ce coup si sa fenêtre vient après ; les coups bruts n'éveillent aucune relique de face ; les mécanismes (`mechanic`) ne sont ni bonus ni malus, jamais purgés ni bloqués. Les textes décrivent ce comportement.

**Points de cet audit-ci (0.72.0)** :

| Point | État en 0.84.0 |
|---|---|
| Aura de précision « ×2 devient ×3 » (I-8) | Corrigé : « Son multiplicateur de critique gagne +1 » (`statuses.ts`) |
| Coup de chance « frappe 2 fois » (I-4) | Corrigé : un d6 par charge, chacun un jet complet, compétence au lieu d'un coup sur 1 à 3 (`statuses.ts`, `states.ts`) |
| Peur cumulable plafonnée à 1 (I-3) | Corrigé : non cumulable (`stacking: 'refresh'`, même comportement) |
| Règle « Cumulable » et la durée | Corrigé (`rules.ts`, `stacking-add`) |
| « Un tour, trois phases » cite Étourdi | Corrigé : la Peur, l'ordre réel des étapes (`rules.ts`, `phases`) |
| I-1, I-2 | Corrigés (0.72.0) |
| I-5 Furie des vents « durée » | Corrigé : `expiresAt` retiré, la Furie est un mécanisme sans durée ni cumul |
| I-6 crochets sans phrase | Corrigé pour `spentOnHurt`, `strikeCharges`, l'expiration de l'Attente et `modifyStats` (une phrase par stat touchée, avec sa règle). `counter` reste sans phrase : c'est de l'affichage |
| I-7 Luciole contre l'esquive imposée | Corrigé dans le texte (« une esquive imposée passe quand même ») ; statut hors jeu |
| I-9, I-10 commentaires périmés | Corrigés |
| I-11 icônes | Corrigé pour les statuts en jeu ; Vulnérable, Étourdi, Garde sacrée hors jeu |
| I-12 cumul écrit dans le résumé et la pastille | Ouvert, voulu : le résumé sert aussi en combat, où il n'y a pas de pastille |
| I-13 même phrase pour l'Esquive améliorée et la Riposte | Gardé : la même règle vaut pour les deux |
| § 3, liste explicite des interactions d'ordre | En partie sans objet : les règles « S'il touche », « Coup sacrifié », « Dégâts directs » et la réaction « dès le coup » disent désormais l'ordre. La liste explicite (`catalog.ts`) reste ouverte |
| § 6, écarts de `FEATURES.md` (Gorak, Fanchon, étape 1, intro § 3, déclencheurs, Furie, Pile ou face, Durées, Aura glaciale, overkill) et de `roster.ts` (commentaires, lore d'Elaria) | Corrigés |
| § 6, écarts de `STATUTS.md`, `RESOLUTION.md`, `PERSONNAGES.md` | Lot moteur (livre de règles) : voir ces documents |

**Règles (`rules.ts`)** : `dice-faces`, `forfeit`, `reshape`, `volley` (FAUX) ; `phases`, `crit`, `final-damage`, `direct-damage`, `duration`, `auras`, `application` (INCOMPLET) ; `modifiers`, `conditions`, `stacking-add` (AMBIGU) : tous corrigés. `damage-die` réécrite sans phrase d'écran ; `cast-turn` fondue dans `duration` et retirée ; `reshape` (aucun porteur) tue par la section Règles (`hiddenRules`, `catalog.ts`). `initiative`, `ko`, `twin-dice`, `dodge`, `polarity`, `stacking-refresh` précisées.

**Citations** : C-1 (la fiche cite Faces de compétence, Deux dés ou Formes selon le personnage, `CharacterSheet.tsx`), C-2 (chaque phrase d'effet d'un statut cite sa règle : esquive, critique, boucliers, modificateurs, dégâts finaux, dégâts directs, armure, dé de dégâts, pose, phases), C-3 (« Durée » seulement pour un statut qui peut en avoir une, « Auras » pour une aura, y compris en pied de fiche), C-4 (pastilles « remplace les deux coups », « dégâts directs », « aura permanente », plafond), C-5 : corrigés. Règles désormais citées : `initiative` (« avant le premier tour », Ouverture), `phases`, `damage-die`, `twin-dice`, `dodge`, `crit`, `modifiers`, `armor`, `shields`, `final-damage`, `direct-damage`, `polarity`, `auras`, `application`. Jamais citée : `ko` (aucune compétence ni statut n'en dépend). `conditions` et `skill` (chance, limite) restent sans pastille faute de compétence qui en ait.

**Statuts et reliques** : S1, S2, S8 (FAUX), S3, S10, S13 (INCOMPLET), S4 à S7, S9, S11, S12, S14, S15 (AMBIGU) : corrigés (`statuses.ts`, `states.ts` avec l'état « Coup gâché » de la Fausse note, `catalog.ts` avec les reliques dans « Posé par » et les purges du Chapelet). R1 (esquive négative bornée à 0 % à la fiche, `StatSheet.tsx`, et « jamais sous 0 % » sur la Cotte), R2 à R8 : corrigés (`relics.ts`). D1 (`RESOLUTION.md`, règle 9) : la règle a changé (plaie différée retirée), lot moteur. V1 à V8 : traités par le moteur (V1 et V2 retirés, V3 réactions génériques, V5 étape `statusAge`, V7 et V8 corrigés) ; V6 dit par la règle « Dégâts directs ».

**Compétences et fiches** : F1, F2 (FAUX), I1 à I7 (INCOMPLET), A1 à A9 (AMBIGU) : corrigés (`events.ts`, `statuses.ts`, `SkillDice.tsx` avec l'Ouverture et les règles de forme au survol, `SkillBar.tsx` avec les charges et pastilles d'une aura, `StatSheet.tsx`, `CharacterSheet.tsx`, `roster.ts`). Forme : « 2 charges de Poison », « pour le reste du combat », et le journal neutre (« 5 dégâts infligés à Brokk » au lieu de « Il inflige »). Résidu R1 (statuts-véhicules) : ce sont des mécanismes, présentés comme tels ; R2 (plaie différée) : retiré.

## 1. Textes des compétences

**Il n'y a aucun champ de description libre.** `CharacterEvent` (`src/game/events.ts:109-152`) n'a que `id, name, trigger, effects, chance, limit, when, forfeitsHit, reshapesHit, needsTouch, volley, merged, form, nature`. Tout le texte est généré, mais par **trois constructeurs différents** :

| Où | Constructeur | Ce qu'il montre |
|---|---|---|
| Compendium › Compétences (carte) | `SkillsSection.tsx:61-127` : pastilles `terms` (64-73) + `EffectLine` (166-216) + `immediateLook` (133-161) | `NATURE_LABEL · TRIGGERS.label`, pastilles (forme, coup sacrifié, transformation, conditions, chance, limite), puis une ligne par effet : `def.describe(status)` pour un statut posé, texte maison pour un effet immédiat. `def.summary` n'apparaît qu'en infobulle (`title`, 175 et 185). |
| Fiche du personnage › Fiche › Compétences | `EventInfo.tsx:2-22` → `describeEvent` (`events.ts:235-247`) → `describeEffect` (188-212) | Une phrase par compétence. |
| Dés de l'en-tête en combat (infobulle) | `SkillDice.tsx:131-176` : `terms` maison + `EffectLine` | Proche de la carte. Le volley n'apparaît que si `effects` est vide. |

**Divergences entre ces constructeurs :**

| Cas | `describeEvent` (fiche) | Carte du compendium | Infobulle des dés |
|---|---|---|---|
| `needsTouch` (Pourfendre) | « frappe pour la valeur du dé ; s'il touche : » | **absent** | **absent** |
| `volley` / `merged` (Siffloter, Fausse note, Crescendo, Soliste) | « 2 coups de 1 », « un seul coup de 12 » | **absent** : les cartes Crescendo et Soliste ont un corps vide | seulement si `effects` est vide ; sinon « À la place des deux coups du tour », trompeur pour Siffloter et Fausse note qui frappent leurs deux coups |
| `bonusPer` (Rancune, Sève) | « (+2 par charge de Aura de rancune) » (« de Aura » non élidé) | **absent** (`EffectLine` l'ignore) | absent |
| `turnsFromStacks` (Brûlure) | durée calculée | `EffectLine:172` ne la calcule pas | idem |
| `cleanse` avec `count` | « le dernier / les N derniers » | `immediateLook:153-154` : toujours « le dernier … (aura comprise) », même pour un malus et même si `count` > 1 | idem |
| Coup sacrifié | « pas de dégâts, mais » | « le jet qui la déclenche n'inflige aucun dégât » | « Le jet n'inflige aucun dégât » |
| `reshapesHit: reroll` | « relance son dé et frappe pour 3 de plus » | « relance le dé, en secret, et ajoute 3 » | « Relance son dé et ajoute 3 » |

**Autres constats :**
- Le texte d'intro de la carte (`SkillsSection.tsx:33-35`) dit « Les variantes héritent des compétences de leur race ». C'est périmé : un seul personnage par famille depuis la 0.43.0. `catalog.ts:65-79` regroupe par **race** : « Humains » mélange Ysolde, Aldric et Fanchon (12 compétences).
- Les trois `Attente` de l'ogre (`waiting-1/2/3`) donnent 3 cartes identiques.
- L'icône d'une compétence passe par `skillIcon` (`Icon.tsx:135-144`) : toutes en ont une. Les entrées de `SKILL_ICON` dont le PNG porte déjà l'id de la compétence sont redondantes (`life-bloom`, `bark-skin`, `charge`, `claw`, `whistle`, `false-note`, `melodious-aura`, `crescendo`, `soloist`).
- **`nature` :** les 36 compétences la déclarent (`roster.ts`), et un test l'exige (`modules.test.ts:66-69`). **Aucune ne tombe sur `DEFAULT_SKILL_NATURE`** (`events.ts:107`). Le repli diffère : `arcane` dans `SkillsSection.tsx:63`, `'neutral'` dans `SkillDice.tsx:73`. Le champ peut devenir obligatoire et la constante disparaître.

### Liste des compétences (texte de `describeEvent`, celui de la fiche)

Légende des natures : M = martial, F = finesse (Adresse), A = arcane, N = neutral. « PD » = préfixe « pas de dégâts, mais ».

| id | Nom | Porteur (forme) | Déclencheur | nature | Texte affiché |
|---|---|---|---|---|---|
| cleave | Pourfendre | Gorak | naturalOne, needsTouch | M | « frappe pour la valeur du dé ; s'il touche : Saignement à l'adversaire : le prochain coup qui le touche lui fait perdre 2 PV de plus, puis 1 de moins à chaque coup (3 PV en tout) » |
| wind-fury | Furie des vents | Gorak | naturalTwo | M | PD « Furie des vents : frappe deux fois tout de suite ; un 1, un 2 ou un 3 frappe pour sa valeur » |
| power-aura | Aura de puissance | Gorak | naturalThree | M | PD « … : ses coups infligent 2 de plus avant l'armure, pour le reste du combat » |
| hawk-eye | Œil de faucon | Elaria | naturalOne | F | PD « Critique assuré : le prochain coup qui touche est critique » |
| evasion | Esquive améliorée | Elaria | naturalTwo | F | PD « … : esquive à coup sûr le prochain coup reçu » |
| precision-aura | Aura de précision | Elaria | naturalThree | F | PD « … : ses critiques gagnent +1 au multiplicateur (×2 devient ×3), pour le reste du combat ». **Faux pour Elaria** (×2,4 → ×3,4) |
| stoneskin | Peau de pierre | Brokk | naturalOne | M | PD « Armure temporaire : absorbe encore 6 points de dégâts, puis disparaît » |
| thorns | Épines acérées | Brokk | naturalTwo | M | PD « … : chaque coup encaissé pose 1 charge de Saignement sur l'attaquant, pour le reste du combat » |
| intimidation-aura | Aura d'intimidation | Brokk | naturalThree | M | PD « … : les coups de l'adversaire lui infligent 2 de moins avant l'armure, pour le reste du combat » |
| grave-breath | Souffle de la tombe | Ervald | naturalOne | A | PD « Poison à l'adversaire : perd 3 PV au début de son prochain tour, puis 1 de moins à chaque tour (6 PV en tout) » |
| life-steal | Vol de vie | Ervald | naturalTwo | A | PD « … : ses 2 prochains coups lui rendent les PV qu'ils retirent (un coup esquivé use une charge) » |
| frost-aura | Aura glaciale | Ervald | naturalThree | A | PD « … : au début de chacun de ses tours, 1 charge de Poison sur l'adversaire » |
| fear | Peur | Ysolde | naturalOne | A | PD « Peur à l'adversaire : terrifié : perd sa prochaine action » |
| purification | Purification | Ysolde | naturalTwo | A | PD « retire le dernier bonus posé à l'adversaire, avec toutes ses charges ; sinon, 5 dégâts directs à l'adversaire, retire le dernier malus posé, avec toutes ses charges » (`PURIFICATION_LIGHT = 5`, `roster.ts:327`) |
| holy-aura | Aura de sainteté | Ysolde | naturalThree | A | PD « … : regagne 2 PV à la fin de chacun de ses tours, pour le reste du combat » |
| lucky-strike | Coup de chance | Naraxes | naturalOne | F | PD « … : à sa prochaine action, lance un d6 en plus de son dé : deux coups, résolus à part » |
| coin-flip | Pile ou face | Naraxes | naturalTwo | F | PD « … : à sa prochaine action, une pièce au lieu du dé : pile, 20 dégâts qui touchent ; face, rien » |
| decoction-aura | Aura de décoction | Naraxes | naturalThree | F | PD « … : chaque coup qui touche pose 2 charges de poison ; l'aura dure tout le combat » |
| retribution | Rétribution | Aldric | naturalOne | A | PD « relâche Rétribution : la somme de ses jauges en dégâts directs (au moins 1) » |
| riposte | Riposte | Aldric | naturalTwo | M | PD « … : ses 2 prochains coups encaissés renvoient chacun la moitié de leurs dégâts à l'attaquant » |
| immunity-aura | Aura d'immunité | Aldric | naturalThree | A | PD « retire les malus, Aura d'immunité : aucun malus ne l'atteint plus, et son armure gagne 1, pour le reste du combat » |
| waiting-1, -2, -3 | Attente (×3) | Morgrut | naturalOne / Two / Three | N | PD « Attente : n'a pas frappé ce tour-ci : il attend son prochain jet » |
| life-bloom | Fleur de vie | Thaldrin (homme) | naturalOne | A | PD « Régénération : regagne 2 PV au début de chacun de ses tours, encore 3 tours » |
| bark-skin | Écorce épaisse | Thaldrin (homme) | naturalTwo | A | PD « Armure temporaire : absorbe encore 7 points de dégâts, puis disparaît » |
| sap-aura | Aura de sève | Thaldrin (homme) | naturalThree | A | PD « … : ses Sèves valent +2 PV, pour le reste du combat » |
| charge | Charge | Thaldrin (ours) | naturalOne, reshape max, noCrit | M | « frappe pour la valeur maximale de son dé, jamais critique » (effets vides) |
| claw | Coup de griffe | Thaldrin (ours) | naturalTwo, reshape reroll +3 | M | « relance son dé et frappe pour 3 de plus » |
| grudge-aura | Aura de rancune | Thaldrin (ours) | naturalThree | M | PD « … : ses Rancunes valent +2, pour le reste du combat » |
| grudge | Rancune | Thaldrin (homme) | hurt | M | « Rancune : son prochain coup qui touche fait +1, puis la rancune retombe (+2 par charge de Aura de rancune) » |
| sap | Sève | Thaldrin (ours) | hurt | A | « Sève : regagne 1 PV au début de son prochain tour (+2 par charge de Aura de sève) » |
| overture | Ouverture | Fanchon | combatStart | A | « Aura mélodieuse : chacun de ses coups qui touche fait +1, ajouté après l'armure : rien ne le réduit (se cumule) » |
| whistle | Siffloter | Fanchon | doubleOne, volley 2 | A | « 2 coups de 1, Sifflotement : regagne 2 PV à la fin de chacun de ses tours, encore 3 tours (6 PV en tout) » |
| false-note | Fausse note | Fanchon | doubleTwo, volley 2 | A | « 2 coups de 2, Fausse note à l'adversaire : son prochain coup qui touche fait 10 dégâts de moins (au moins 1), puis la note s'oublie » |
| melodious-aura | Aura mélodieuse | Fanchon | doubleThree | A | « Aura mélodieuse : chacun de ses coups qui touche fait +2, … (se cumule) » |
| crescendo | Crescendo | Fanchon | doubleFour, volley 3, merged | M | « un seul coup de 12 » (corps de carte vide) |
| soloist | Soliste | Fanchon | doubleFive, volley 3, merged | M | « un seul coup de 15 » (corps de carte vide) |

## 2. Textes des statuts

La source est `src/game/statuses.ts` (`STATUSES`, lignes 177-748). Les règles de chaque carte sont générées par `statusRules` (760-819) dans cet ordre fixe :

| Code | Crochet | Phrase générée |
|---|---|---|
| R1 | forcesDodge | « Le prochain coup reçu est esquivé à coup sûr… une charge par esquive. » |
| R2 | drainsHit | « Le prochain coup porté rend au porteur les PV réellement retirés… » |
| R3a | extraStrikes + instantStrikes | « Tout de suite… frappe 2 fois… Coups bruts… » |
| R3b | extraStrikes seul | « À sa prochaine action, le porteur frappe ${extra+1} fois (le coup en plus avec un d6)… consommé au début de l'action. » |
| R4 | coinToss | « …pile, 20 dégâts directs… qui comptent comme un coup qui touche… » |
| R5 | forcesCrit | « Force le critique du prochain coup qui touche… » |
| R6 | shield | « Absorbe autant de points que de charges, après l'armure… » |
| R7 | onTurnStart | « Agit au début de chaque tour du porteur, avant son attaque. » |
| R8 | modifyOutgoing | « Modifie les dégâts du porteur avant l'armure ; un coup garde au moins 1 dégât. » |
| R9 | modifyFinal | « Modifie les dégâts finaux… après l'armure et les boucliers… » |
| R10 | modifyStats | « Modifie les caractéristiques du porteur, bornées par le moteur… » |
| R11 | onTurnEnd | « Agit à la fin de chaque tour du porteur, après son action. » |
| R12 | decays | « S'estompe : perd une charge chaque fois qu'il agit… » |
| R13 | modifyIncoming | « Modifie les dégâts reçus par le porteur avant l'armure… » |
| R14 | skipsAction | « Le porteur perd son action ; une charge par tour perdu. » |
| R15 | reactions | « Réagit quand il touche / quand il encaisse un coup, sans déclencher d'autre réaction en chaîne. » |
| R16 | spentOnHit | « Disparaît… dès que le prochain coup du porteur touche… » |
| R17 | immune | « Aucun malus ne peut être posé sur le porteur ; l'immunité ne s'use pas. » |
| R18 | reflectsHit | « …renvoie 50 % des PV retirés… » |
| R19 | fillsOnHurt | « …une des 3 jauges… » |
| R20 | wards | « Bloque la pose des malus… » |
| R21 | opposes | « S'oppose à X : leurs charges s'annulent une à une. » |
| R22 | expiresAt turnEnd | « Sa durée se décompte à la fin des tours du porteur. » |
| R23 | turnsFromStacks | « Une seule valeur : il dure autant de tours que de charges. » |
| Ra / Rr | stacking | Ra = « Cumulable : … la durée garde la plus longue. » ; Rr = « Non cumulable : … remplace… » |
| Rmax(N) | maxStacks | « Plafonné à N charges. » |

**En jeu** suit la logique de `catalog.ts:30-50` : vrai seulement si une compétence du roster a un effet `applyStatus` direct sur ce statut.

| id | Nom | Pol. | En jeu (catalogue) | `summary` (abrégé) | Règles | Icône |
|---|---|---|---|---|---|---|
| guaranteedCrit | Critique assuré | + | oui | Le prochain coup qui touche est critique. | R5, Ra | crit |
| bonusArmor | Armure temporaire | + | oui | bouclier après l'armure | R6, Ra | shield |
| poison | Poison | − | oui | début de tour, PV = charges, −1 charge, « Se cumule » | R7, R12, R21 (Régénération), Ra | poison |
| bleed | Saignement | − | oui | chaque coup qui touche, 2, 1 ; le coup qui ouvre ne fait pas couler | R12, R15 (hurt), Ra | bleed |
| regeneration | Régénération | + | oui | rend des PV au début de chaque tour | R7, R21, Rr | regen |
| weakened | Affaibli | − | non | | R8, Rr | weakened |
| exposed | Brèche | − | non | | R10, Ra, Rmax3 | breach |
| burn | Brûlure | − | non | | R11, R22, R23, Rr | fireflies (provisoire) |
| vulnerable | Vulnérable | − | non | | R13, Ra, Rmax3 | **aucune** |
| stunned | Étourdi | − | non | | R14, Ra, Rmax1 | **aucune** |
| thorns | Épines acérées | + | oui | 1 Saignement par charge, permanentes | R15 (hurt), Ra | thorns |
| ward | Garde sacrée | + | non | | R20, Ra | **aucune** |
| lifesteal | Vol de vie | + | oui | | R2, Ra, Rmax2 | lifesteal |
| windFury | Furie des vents | + | oui | deux coups bruts tout de suite | R3a, **R22**, Ra | wind-fury |
| evasion | Esquive améliorée | + | oui | « Sans durée… » | R1, Rr, Rmax1 | evasion |
| fear | Peur | − | oui | perd sa prochaine action | R14, **Ra + Rmax1** | fear |
| coinFlip | Pile ou face | + | oui | pile 20 qui touchent | R4, Rr, Rmax1 | coin-flip |
| luckyStrike | Coup de chance | + | oui | un d6 de plus **par charge** | **R3b « frappe 2 fois »**, Ra | lucky-strike |
| riposte | Riposte | + | oui | moitié des dégâts, sans durée | R18, Ra, Rmax2 | riposte |
| retribution | Rétribution | + | **non (faux, cf. I-1)** | 3 jauges | R19, Rr | retribution |
| frostAura | Aura glaciale | + | oui | 1 Poison par charge, début de tour | R7, Ra | frost-aura |
| powerAura | Aura de puissance | + | oui | +2 par charge | R8, Ra | power-aura |
| intimidationAura | Aura d'intimidation | + | oui | −2 par charge | R13, Ra | intimidation-aura |
| precisionAura | Aura de précision | + | oui | +1 au multiplicateur | R10, Ra | precision-aura |
| immunityAura | Aura d'immunité | + | oui | aucun malus, +1 armure, non cumulable | R10, R17, Rr, Rmax1 | immunity-aura |
| holyAura | Aura de sainteté | + | oui | +2 PV par charge en fin de tour (3 au plus) | R11, Ra, Rmax3 | holy-aura |
| decoctionAura | Aura de décoction | + | oui | 2 poisons par charge par coup | R15 (hit), Ra | decoction-aura |
| waiting | Attente | − | oui | il ne frappe pas | Rr, Rmax1 (aucune règle de mécanique) | waiting |
| firefly | Luciole | − | non | « il ne peut plus esquiver » | R10, R13, Ra (**spentOnHurt sans phrase**) | fireflies |
| rotAura | Aura de pourriture | + | non | | R15 (hit), Ra | rot-aura |
| rot | Pourriture | − | non | | R7, Ra | rot-aura (provisoire) |
| grudge | Rancune | + | oui | +valeur, puis retombe | R8, R16, Rr | grudge |
| sap | Sève | + | oui | soigne au prochain tour | R7, Rr | sap |
| grudgeAura | Aura de rancune | + | oui | +2 à chaque Rancune | **Ra seul** | grudge-aura |
| sapAura | Aura de sève | + | oui | +2 à chaque Sève | **Ra seul** | sap-aura |
| whistling | Sifflotement | + | oui | +2 PV par tour, une charge par tour | R11, R12, Ra | whistle |
| falseNote | Fausse note | − | oui | −5 par charge, après l'armure | R9, R16, Ra | false-note |
| melodiousAura | Aura mélodieuse | + | oui | +1 par charge, après l'armure | R9, Ra | melodious-aura |

### Incohérences des statuts

- **I-1. Rétribution est cachée.** Elle n'est jamais posée par `applyStatus` (Aldric utilise `release`, et les jauges se remplissent par `fillsOnHurt`). `inGame` vaut donc false et la carte manque dans « Bonus et malus » (`StatusesSection.tsx:15`, `catalog.ts:30-38`). Plus largement, `statusSources` ignore les statuts posés indirectement : par une réaction ou un effet de tour (Aura glaciale ou décoction → Poison, Épines → Saignement), ou par `onTurnStart`. Aujourd'hui ce n'est masqué que parce que Souffle de la tombe et Pourfendre posent aussi ces statuts.
- **I-2. « Plafonné à 1 charges. »** Faute de pluriel dans `statuses.ts:817` ; elle touche fear, evasion, coinFlip, immunityAura, waiting (en jeu) et stunned.
- **I-3. Peur affiche « Cumulable… la durée garde la plus longue » puis « Plafonné à 1 ».** C'est contradictoire à l'œil (stacking `add` + maxStacks 1, `statuses.ts:441-442`).
- **I-4. Coup de chance.** R3b dit « frappe 2 fois » alors que le résumé dit « un d6 de plus par charge » (`strikeCharges: 'all'`, cumulable). `statusRules` ignore `strikeCharges` (`statuses.ts:783-786`).
- **I-5. Furie des vents.** R22 (« durée décomptée en fin de tour ») et la mention « la durée garde la plus longue » ne veulent rien dire pour un statut instantané sans `turns`.
- **I-6. Crochets sans phrase générée :** `spentOnHurt` (Luciole), `strikeCharges`, `bonusPer` (côté aura), l'expiration par défaut (`expiresAt: turnStart`, Sève et Attente), `spentOnReaction` sans réaction, `counter`. Conséquence : Aura de rancune et Aura de sève n'ont **aucune règle de mécanique**, leur effet vit dans la compétence (`roster.ts:614`, `:622`).
- **I-7. Luciole :** le résumé dit « il ne peut plus esquiver », mais `forcesDodge` passe outre `dodgeChance: 0` (`combat.ts:322-323`). Une Esquive améliorée esquive quand même. Statut hors jeu.
- **I-8. Aura de précision :** `describe` code « ×2 devient ×3 » en dur (`statuses.ts:528`), alors que son seul porteur est à ×2,4.
- **I-9. Aura de sainteté :** le commentaire `statuses.ts:551` dit « plafond de 2 charges (4 PV par tour) » alors que `HOLY_CAP = 3` (`:240`). Résumé, règles et docs disent 3.
- **I-10. Commentaires périmés ou en double :**
  - JSDoc orpheline « Une aura de personnage… » collée au-dessus de `hurtsEachTurn` (`statuses.ts:752-753`) ;
  - double JSDoc sur `cleanse`, dont la première est périmée (`events.ts:66-73`) ;
  - commentaire « Statuts disponibles pour de futures compétences » au-dessus de la Régénération, qui est en jeu (`statuses.ts:296`) ;
  - commentaire « à venir » au-dessus de Brûlure, Vulnérable, Étourdi… (`:330`).
- **I-11. Icônes :** aucune icône manquante pour un statut en jeu. Vulnérable, Étourdi et Garde sacrée n'en ont pas (hors jeu). Brûlure et Pourriture utilisent une icône provisoire (`Icon.tsx:96-99`).
- **I-12. Le cumul est écrit deux fois :** dans `summary` (« Se cumule », « Permanente, non cumulable », « Une nouvelle X remplace l'ancienne ») et dans Ra/Rr. Même chose pour « Permanente » (11 auras) et « pour le reste du combat » dans `describe`.
- **I-13. Phrase identique dans deux résumés :** Esquive améliorée et Riposte ont toutes deux « Sans durée : elle attend ce coup, même si l'adversaire sacrifie les siens (jet de 1 à 3). » (`:418`, `:487`).

## 3. Interactions entre statuts

Il n'existe **aucun champ « interactions »**. Une partie est déjà lisible dans les données ; le reste n'est écrit qu'en prose.

**A. Déjà dans les données (dérivable automatiquement) :**

| Mécanisme | Où | Cas en jeu |
|---|---|---|
| Opposition `opposes` | `statuses.ts:212`, `:305` ; `resolveApplication` `:887-895` | Poison ↔ Régénération |
| Immunité de statut `immune` | `:536` ; `:880-882` | Aura d'immunité bloque tous les malus : Peur, Poison (Souffle, glaciale, décoction), Saignement (Pourfendre, Épines), Fausse note |
| Immunité de personnage `immunities` | `character.ts:107-108`, `:149` ; `statuses.ts:879` | **Aucun personnage** n'en a (seulement dans un test, `combat.test.ts:751`) |
| Garde `wards` | `:401` ; `:883-886` | Garde sacrée, hors jeu |
| Purge `cleanse` (polarité, `count`, `orElse`) | `events.ts:74` ; `combat.ts:532-541` | Purification (dernier bonus adverse, sinon 5 dégâts ; plus son dernier malus) ; Aura d'immunité (ses malus). [INFERENCE d'après `combat.ts:533`] La purge des bonus peut aussi retirer Rétribution, Rancune, Sève ou une Furie en attente. |
| Statut qui pose un statut | `frostAura.onTurnStart` → Poison (`:507`), `decoctionAura.reactions.hit` → Poison (`:567`), `thorns.reactions.hurt` → Saignement (`:398`), `rotAura.reactions.hit` → Pourriture (`:629`) | Liens dérivables en lisant les effets avec une sonde, comme le fait `hurtsEachTurn` |
| Aura qui renforce un relais (`bonusPer`) | `events.ts:63` ; `roster.ts:614`, `:622` | Aura de rancune → Rancune, Aura de sève → Sève. Le lien est dans la **compétence**, pas dans le statut. |
| Modificateurs additifs | `modifyOutgoing`, `modifyIncoming`, `modifyFinal`, `modifyStats` | Puissance contre Intimidation ; Aura mélodieuse et Fausse note (dégâts finaux, ordre de pose) contre armure, boucliers et Intimidation |
| Consommation au coup | `spentOnHit`, `spentOnHurt`, `drainsHit`, `forcesDodge`, `reflectsHit` ; `combat.ts:743-777` | Coup sacrifié ou esquivé contre Vol de vie, Fausse note, Esquive, Riposte, Saignement |
| Esquive forcée contre esquive nulle | `combat.ts:322` | Esquive améliorée l'emporte sur Luciole (I-7) |
| Jauges conditionnelles | `fillsOnHurt` remplies seulement si le porteur a `release` | Rétribution |
| Ordre de pose | `resolveApplication` `statuses.ts:866-901` (immunité, puis garde, puis opposition, puis cumul) | — |

**B. Seulement en prose :**
- `docs/RESOLUTION.md` § 6 (184-198) et § 7, tableau d'une quarantaine de situations (202-245) ;
- `docs/STATUTS.md:73-74` (vocabulaire) et `:116` (Aura glaciale : « l'immunité le bloque, la Régénération l'annule, une purge l'enlève ») ;
- `docs/FEATURES.md` § 3, ligne de l'Aura glaciale ;
- `docs/PERSONNAGES.md:241` ;
- commentaires de `statuses.ts:504-506`.
- Le crochet `stoppedByImmunity` / `onOpponentTurnStart` a été retiré en 0.69.0 (FEATURES, historique). Il n'en reste aucune trace dans le code.

**Proposition, la plus simple :**
1. **Dériver automatiquement** une fonction `statusLinks(id)` (dans `catalog.ts`, à côté de `statusSources`), qui renvoie :
   - `opposes` : « s'annule avec X » ;
   - `immune` / `wards` : « bloque les malus » ;
   - les effets `applyStatus` trouvés en sondant `onTurnStart`, `onTurnEnd` et `reactions` : « pose X » ;
   - les `bonusPer` du roster qui lisent ce statut : « renforce X » ;
   - les `cleanse` du roster qui visent sa polarité : « retiré par Purification ».
   
   Ces liens sont toujours fidèles au code, sans texte écrit à la main. La même passe corrige I-1 (un statut posé indirectement compte comme « en jeu »).
2. Ajouter une **petite liste explicite** `INTERACTIONS: { a: StatusId|skillId, b: …, text }[]`, seulement pour les cas d'**ordre** qu'on ne peut pas déduire : Vol de vie, puis Riposte, puis Épines ; la plaie qui ne coule pas sur le coup qui l'ouvre ; Fausse note contre Furie ; Aura de sainteté contre Poison (début ou fin de tour) ; Esquive forcée contre Luciole. La source peut être le tableau RESOLUTION § 7, nettoyé (cf. § 6 ci-dessous), à reprendre sans réécrire le texte.

## 4. Phrases de règle répétées

| Règle | Occurrences (fichier:ligne) |
|---|---|
| Le jet déclencheur n'inflige aucun dégât | `SkillsSection.tsx:66` ; `SkillDice.tsx:135` ; `events.ts:239` (« pas de dégâts, mais ») ; `events.ts:120-125` (doc) ; `roster.ts:82-83` ; `STATUTS.md:39`, `:68` ; `FEATURES.md` § 1 étape 1 et § 3 (§ 3 : « ces jets n'infligent aucun dégât » ; effets : « sacrifier son coup ») ; `combat.ts:86` |
| Coup sacrifié et charges conservées | `statusRules` drainsHit (`statuses.ts:774`) et spentOnHit (`:805`) ; résumés Esquive et Riposte (`:418`, `:487`) ; résumé Vol de vie (`:405`) ; `FEATURES.md` § 1 étape 7 ; `RESOLUTION.md` § 3 étape 10 et § 7 |
| `reshapesHit` | `SkillsSection.tsx:67-69` ; `SkillDice.tsx:136-138` ; `events.ts:240-243` ; `FEATURES.md` § 3 druide ; `STATUTS.md:33` |
| `volley` | `events.ts:244-245` ; `SkillDice.tsx:134`, `:153-158` |
| chance / limite / conditions | `SkillsSection.tsx:70-72` ; `SkillDice.tsx:139-141` ; `events.ts:236-238` |
| Effets immédiats (soin, dégâts, relâche, purge) | `events.ts:188-212` contre `SkillsSection.tsx:133-161` (copie, avec divergence pour la purge) |
| Durée des statuts | `STATUS_DURATION_RULE` (`statuses.ts:761-762`), affiché par `StatusesSection.tsx:28` ; en-tête de `statuses.ts:8-15` ; `STATUTS.md:62` ; `FEATURES.md` § 3 « Statuts (auras) » et « Durées » |
| Cumul et plafond | `statusRules:813-817` ; doc `StatusDef:88-95` ; `STATUTS.md:63-64` ; résumés (I-12) |
| Dégâts directs qui ignorent l'armure | doc `events.ts:60` ; résumés Poison, Saignement, Pourriture ; `FEATURES.md` § 3 effets ; `STATUTS.md:149` |
| Libellé Bonus / Malus | `POLARITY_STYLE.label` (`statuses.ts:745-756`) ; `StatusesSection.tsx:7` (`LABEL`) ; `SkillsSection.tsx:177` en dur |
| Cible | `SkillsSection.tsx:163` (« sur soi / sur l'adversaire ») contre `events.ts:186` (« à l'adversaire ») |

**Où sont écrites aujourd'hui les règles communes** (pour une section « Règles ») :
- **Tour et phases :** en-tête de `combat.ts:22-41` ; `RESOLUTION.md` § 2 (26-80) ; `FEATURES.md` § 1 « Un tour = trois phases » ; `STATUTS.md:79`.
- **Dés :** `FEATURES.md` § 1 étape 1 et « Deux dés » ; `TRIGGERS` (`events.ts:34-53`) ; `rollMatches` (`:178-184`) ; `INITIATIVE_DIE` (`combat.ts:53`).
- **Critique, esquive, armure, boucliers, dégâts finaux :** `FEATURES.md` § 1 étapes 2 à 7 ; `RESOLUTION.md` § 3 (125-146) ; `statusRules` R1, R5, R6, R8, R9, R13.
- **Déclenchement des compétences :** `TRIGGERS` ; `FEATURES.md` § 3 (déclencheurs, effets, conditions) ; `RESOLUTION.md` § 5 (170-182) ; `STATUTS.md:69` ; `SkillsSection.tsx:33-35`.
- **Durée, charges, cumul :** `STATUS_DURATION_RULE` ; `statusRules` ; `STATUTS.md` Vocabulaire (56-76) ; `RESOLUTION.md` § 4 (150-168) et § 6.

## 5. Données de statistiques

- **Accumulation :** `recordMatch` (`history.ts:150-202`) additionne `computeStats` (`stats.ts:38-91`) dans `CharacterRecord` (`history.ts:35-56`). Le bilan par adversaire va dans `opponents`.
- **Ratios :** `ratios(rec)` (`history.ts:216-226`) calcule winRate, hitRate, critRate, dodgeRate, damagePerFight et turnsPerFight.
- **Onglet « Statistiques » de la fiche :** il est **en ligne** dans `CharacterSheet.tsx:110-186`. Il n'y a pas de composant dédié. Il affiche 12 `Kpi` (`RecordBits.tsx:40`), un `WinBar` par adversaire et 5 `MatchRow`.
- **RecordsScreen** (`RecordsScreen.tsx:28-306`) : onglet Classement (`ratios` + `WinBar`, mêmes colonnes que la fiche, mais « Évts » au lieu de « Compétences »), onglet Confrontations (matrice) et derniers combats.
- **Calculs en double :**
  - `vs.wins / vs.fights` est recalculé à la main dans `CharacterSheet.tsx:161` et dans la matrice de `RecordsScreen` (~l. 220), au lieu d'une fonction dans `history.ts` ;
  - les KPI de la fiche et les colonnes du classement listent les mêmes indicateurs à la main : un tableau de définitions commun serait à extraire pour l'onglet « Performances » ;
  - `pct` est redéfini dans `ChampionScreen.tsx:20`, `events.ts:215` et `analysis.ts:212`, en plus de `fmtPct` ;
  - `tournament.ts:180-205` refait sa propre somme de `computeStats`.
- **Définitions divergentes ou inutilisées :**
  - `damageTaken` : l'historique n'y met que les coups adverses (`history.ts:169`), le tournoi y ajoute `effectDamageTaken` (`tournament.ts:203`) ;
  - `turnsPerFight`, `critDamage`, `damageTaken` et `turns` sont stockés mais jamais affichés dans la fiche ni dans le classement ;
  - le KPI « Armure absorbée » compte aussi les boucliers (`stats.ts:63`) ;
  - « Dégâts / combat » exclut les dégâts directs (poison, saignement, pièce, Rétribution), car `totalDamage` ne compte que les coups ;
  - « Compétences » compte aussi l'Attente de l'ogre et les relais Rancune et Sève.
- `STAT_LINES` est importé mais inutilisé dans `CharacterSheet.tsx:6`.

## 6. Écarts entre la documentation et le code (à corriger plus tard, rien n'a été modifié)

| Doc | Écrit | Code |
|---|---|---|
| FEATURES § 2, tableau | Gorak d10, 18 % | d9, 19 % (`roster.ts:106`) |
| FEATURES § 2 ; PERSONNAGES:546 (Fanchon, Stats) | Fanchon : esquive 12 % | 6 % (`roster.ts:643`) |
| FEATURES § 1 étape 1 | « 1d8 à 1d10 » ; tout jet de 1 à 3 sans dégât | 2×d5 à d14 ; exceptions Pourfendre, Charge, Griffe, barde |
| FEATURES § 3, intro | « se déclenchent même si le coup est esquivé » | Pourfendre (`needsTouch`) non |
| FEATURES § 3, déclencheurs | 13 déclencheurs, sans les doubles | 18 (`events.ts:13-31`) ; STATUTS:65 dit aussi « 13 » |
| FEATURES § 3, statuts | Furie des vents « charges cumulables en réserve (0.46.0) » ; Armure temporaire « oui (nain) » ; Sifflotement, Fausse note, Aura mélodieuse et Attente absents | instantanée depuis la 0.50.0, coups bruts depuis la 0.69.0 ; druide aussi |
| FEATURES § 3, Pile ou face | « −15 sur l'adversaire » | 20 |
| FEATURES § 3, Durées | Furie et Épines décomptées | aucune des deux n'a de durée |
| FEATURES § 3, rappels visuels | Aura glaciale « vert pour le poison » | bleu (`statuses.ts:497`) |
| FEATURES § 7 | « le coup fatal ne compte que ce qu'il restait » ; « comparaison avec sa variante » | overkill compté depuis la 0.34.0 (`stats.ts:55`) ; plus de variantes |
| FEATURES § 9 ; `SkillsSection.tsx:35` | « l'original et les variantes qui en héritent » | un personnage par famille |
| STATUTS:15-16, 22 | « 2 compétences au plus », « Ses variantes en héritent » | 3 (et 6 à 7 pour druide et barde) |
| STATUTS:39 | « forfeitsHit sur les douze… sauf Vol de vie… charge unique, durée repart pour un tour » | contradictoire et périmé |
| STATUTS:68 | coup sacrifié = « toutes les compétences du 1, 2, 3 » | pas Pourfendre, Charge ni Griffe |
| STATUTS:81 | Furie « sans durée, en réserve » | instantanée |
| STATUTS:115 | Esquive améliorée « 1 tour » | sans durée |
| STATUTS:125 | Luciole « remplacée par les Feux follets » | les Feux follets sont retirés aussi (0.71.0) |
| STATUTS:140 | Saignement sans icône, emprunte la Brèche ; Brûlure sans icône | `bleed.png` existe ; Brûlure utilise `fireflies` |
| STATUTS:188 | « la purge doit-elle exister ? des immunités ? » | les deux existent |
| RESOLUTION:164 | Action multiple « au début de l'action » | Furie instantanée |
| RESOLUTION:223 | Vol de vie « non cumulable, 1 charge au plus » | `add`, plafond 2 |
| RESOLUTION:236 | « Elaria ×3, Sylwen ×3,4 » | Elaria ×3,4 ; Sylwen retirée |
| RESOLUTION:232 | Coup de chance « le d3 » | d6 depuis la 0.36.5 |
| RESOLUTION:233 | la pièce « ne frappe pas : pas de poison de la décoction » | `headsTouches` depuis la 0.42.0 |
| RESOLUTION:244 | Fausse note (2 charges) « perd 6 » | 2 × `FALSE_NOTE` (5) = 10 |
| RESOLUTION:251, 259 | statuts « à venir » ; Régénération ↔ Poison à venir | la Régénération est en jeu |
| PERSONNAGES (Gorak, ~93-96) | « son d10 », « critique rarement (10 %) » | d9, 19 % |
| PERSONNAGES:259-260 (Ervald) | « armure légère (1), seule armure passive » | armure 0 |
| PERSONNAGES:459 (druide) | Écorce « bouclier de 5 » ; « trois compétences » par forme | 7 ; 4 par forme avec le relais |
| `roster.ts:79`, `:89` (commentaire d'en-tête) | Humain « compétences sur la moitié de ses jets » ; Souffle « 2 PV par tour pendant 3 tours » | d7 = 3 sur 7 ; Poison 3 qui s'estompe |
| `roster.ts:182` (lore d'Elaria) | « Peine face à l'armure » | aucun personnage n'a d'armure de base (seulement boucliers et aura) |

**Contrôles à lancer après la refonte :** `npm run check` (le test `screens.test.tsx:276-284` fige aujourd'hui l'absence de Rétribution dans le compendium, et `modules.test.ts:66-90` porte sur le catalogue) et `npx vite build`.