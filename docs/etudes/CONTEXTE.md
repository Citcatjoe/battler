# Le coût du contexte : documentation, rayon d'impact, temps d'une demande (B17)

Étude du 2026-10-27 (version 0.121.0, branche `regles-v2`), demandée dans le second retour du jour (point B17) : « le temps de génération s'allonge (briques entremêlées, rayon d'impact) ; optimiser la doc / le contexte pour réduire le temps ? faisable ? coût ? ».

Aucun document existant ni aucun fichier de code n'a été modifié : ce document mesure et propose. Les mesures viennent de `wc`, `git log --numstat`, `git show` et d'un script de comparaison de textes, sur le dépôt à la 0.121.0.

## 0. En bref

- **Oui, c'est faisable, et peu coûteux.** Le temps perdu ne vient pas surtout de la taille des documents (l'agent les lit par morceaux, avec `grep` et des plages de lignes), mais de **ce qu'il faut réécrire à chaque livraison**.
- **Mesure clé** : la livraison 0.121.0 a écrit **105 Ko de documentation pour 1,1 Ko de code** ; sur les huit derniers commits, **478 Ko de docs pour 513 Ko de code**. `ETAT.md` (135 Ko) a reçu **714 Ko d'écriture en 94 commits**, parce que sa ligne 3 (« Dernière mise à jour », **25,6 Ko sur une seule ligne**) est réécrite à chaque version.
- **Même événement, six récits** : une livraison se raconte dans le CHANGELOG, la ligne d'historique de `FEATURES.md`, la ligne 3 et le tableau de `ETAT.md`, `PROGRESSION.md` § 1 et `TODO.md` § 20. La copie mot pour mot est faible (2 à 9 % des passages de dix mots) : c'est de la paraphrase, qu'il faut donc rédiger à chaque fois.
- **Trois leviers rapportent l'essentiel** (§ 4, O1, O2, O3) : ETAT réduit à l'état présent, FEATURES sans historique, une seule chronique (le CHANGELOG). Estimation : **de 105 Ko à 30 à 40 Ko de docs écrits par livraison**, soit environ 20 000 jetons de sortie en moins, de l'ordre de **3 à 7 minutes de génération pure par livraison** [estimation, débit de sortie non mesuré ici]. Coût : une passe de ménage de 2 à 3 heures d'agent. Risque faible : rien n'est perdu (git et un dossier `docs/archive/`).
- **Le rayon d'impact du code** (une brique touche moteur, mise en scène, son, textes, icônes, audit) est en partie voulu par l'architecture à registres ; il se réduit surtout en découpant les très gros fichiers partagés (`combat.test.ts` 279 Ko) et en regroupant les tests de texte (O8, O9), à faire sur un lot calme, sans agents en parallèle.

## 1. Ce qui fait le temps d'une demande

Une demande traverse quatre postes ; seul le premier dépend directement de la taille des docs.

| Poste | Ce qui le grossit | Ordre de grandeur |
| --- | --- | --- |
| **Lire** (entrée) | `CLAUDE.md` chargé par chaque agent, briefs, docs à consulter, code à comprendre | Rapide par jeton ; une lecture inutile coûte surtout un aller-retour d'outil |
| **Écrire** (sortie) | Code, tests, **docs**, rapports | Le poste le plus lent par jeton [estimation : la génération est plusieurs fois plus lente que la lecture] |
| **Vérifier** | `npm run check`, `npm run balance`, laboratoire, captures | Non mesuré ici (le lancer pendant le travail des autres agents fausserait la mesure) |
| **Coordonner** | Agents en parallèle sur des fichiers partagés, relectures après un tag périmé | Croît avec la taille des fichiers partagés |

Conversion utilisée : environ **3,3 octets par jeton** pour du Markdown français [estimation : aucun compteur de jetons disponible dans le dépôt]. 100 Ko ≈ 30 000 jetons.

## 2. Mesures

### 2.1 Le volume

- `docs/` : **2,29 Mo** dans 34 fichiers Markdown (≈ 690 000 jetons), plus `CHANGELOG.md` **363 Ko** (205 versions) et `CLAUDE.md` **11,9 Ko**.
- Les documents que `CLAUDE.md` cite à lire « selon la tâche » pèsent ensemble **1,38 Mo** (≈ 420 000 jetons) : impossible à lire en entier, l'agent cherche par `grep`. La taille totale n'est donc pas le coût direct ; le coût est dans le **bruit des recherches** et dans **l'écriture**.

| Document | Octets | Lignes | Octets par ligne | Nature |
| --- | ---: | ---: | ---: | --- |
| FEATURES.md | 240 065 | 870 | 276 | règles + 307 lignes d'historique (68,7 Ko) |
| PROGRESSION.md | 206 766 | 1 645 | 126 | réflexion + décisions (§ 1 : 51,5 Ko) |
| SORTS.md | 182 653 | 1 550 | 118 | laboratoire, 32 sections datées |
| STYLE_BIBLE.md | 155 056 | 1 373 | 113 | § 7 Icônes : 65,6 Ko de prompts |
| PERSONNAGES.md | 146 528 | 1 077 | 136 | fiches, décisions, mesures |
| REVUE_CONTENU.md | 141 630 | 1 222 | 116 | revue figée (0.109.1) |
| **ETAT.md** | **135 279** | **195** | **694** | 96 % des octets sur des lignes qui citent une version |
| RELIQUES.md | 107 200 | 717 | 150 | |
| CAMPAGNE.md | 103 333 | 785 | 132 | |
| MISE_EN_SCENE.md | 81 070 | 322 | 252 | |
| RESOLUTION.md | 73 498 | 483 | 152 | |
| STATUTS.md | 69 496 | 297 | 234 | |
| MAITRISES.md | 68 939 | 500 | 138 | écrit en un jour (69 Ko) |

### 2.2 Ce que `CLAUDE.md` impose

- **Lire** : 17 documents nommés, chacun « selon la tâche » ; pour cinq d'entre eux (RESOLUTION, SONS, PARIS, RELIQUES, CAMPAGNE), « toute modification commence par ce document » ; STATUTS et PERSONNAGES sont « à mettre à jour dès qu'on touche » leur sujet.
- **Mettre à jour à chaque livraison** : `package.json`, `CHANGELOG.md`, `FEATURES.md` (règle **et ligne d'historique**), `ETAT.md` (date, version, tableau, limites). Le plan `docs/README.md` ajoute 26 cas « Où documenter quoi », dont plusieurs à deux ou trois documents (« `CAMPAGNE.md` d'abord, puis `FEATURES.md` § 11 »).
- **Constat** : sur les 30 derniers commits, **9,4 documents touchés par commit** en moyenne (maximum 16), pour 20 fichiers de code.
- `CLAUDE.md` (11,9 Ko, ≈ 3 600 jetons) est chargé par **chaque** agent : un lot à six agents le lit sept fois.

### 2.3 Ce qui s'écrit : le vrai poste

Octets ajoutés (lignes `+` des diffs ; une ligne modifiée compte en entier, comme elle se réécrit en entier) :

| Commit | Docs écrits | Code écrit |
| --- | ---: | ---: |
| 0.121.0, clôture (dff7f3b) | **104 985** | 1 110 |
| Vague 2 du 27 (0796efc) | 97 676 | 184 710 |
| Vague 1 du 27 (6fe5c14) | 35 970 | 169 012 |
| 0.120.0 (d2a6ade) | 47 176 | 17 107 |
| 0.119.0 (d6d2e27) | 132 738 | 138 069 |
| 0.118.1 (bafb988) | 41 922 | 3 483 |

Détail de la clôture 0.121.0 : ETAT **34,0 Ko écrits pour 26,6 Ko retirés** (la ligne 3 réécrite), FEATURES 15,2 Ko, PROGRESSION 11,5 Ko, CHANGELOG 9,0 Ko, STYLE_BIBLE 8,3 Ko, ARCHITECTURE 5,0 Ko, puis MISE_EN_SCENE, SONS, RELIQUES, STATUTS (3 à 4 Ko chacun).

Sur toute l'histoire : **ETAT 714 Ko écrits en 94 commits** (5,3 fois sa taille), **FEATURES 497 Ko en 75 commits**. Lignes de diff cumulées : docs 25 003, tests 18 320, code 75 439.

### 2.4 Les lignes géantes

- `ETAT.md` : 10 lignes de plus de 1 500 caractères (45,8 Ko), dont la ligne 3 à **25 631 caractères** et une ligne de tableau à 5 650.
- `FEATURES.md` : 15 lignes de plus de 1 500 caractères (28,9 Ko) ; `MISE_EN_SCENE.md` 5 ; `ARCHITECTURE.md` 3.
- Conséquences : une édition par ligne réécrit la ligne entière (25 Ko ≈ 7 800 jetons de sortie pour changer une phrase) ; et les outils de recherche tronquent l'affichage d'une ligne (constaté pendant cette étude : `grep` coupe à 512 octets), donc une ligne géante est en partie invisible sans relecture dédiée.

### 2.5 L'historique en double

- `FEATURES.md` : **307 lignes d'historique** (tableaux « version → changement »), **68,7 Ko**, soit 29 % du fichier ; le CHANGELOG dit la même chose, plus en détail.
- `ETAT.md` : la ligne 3 est une chronique des dernières versions ; le tableau « Ce qui fonctionne » (100 lignes, 61,3 Ko) date chaque ligne de sa version ; « Limites connues » (40 entrées, 28,9 Ko) mélange limites présentes et récits de livraisons (« 0.113.0 : décisions ouvertes… »).
- Mentions de « 0.121.0 » : FEATURES 24, STYLE_BIBLE 15, ARCHITECTURE 11, ETAT 8, PROGRESSION 8, TODO 4, CHANGELOG 1.
- Recouvrement mot pour mot (passages de dix mots communs à deux fichiers) : TODO 9,0 %, ETAT 6,8 %, FEATURES 6,8 %, CHANGELOG 5,9 %, PROGRESSION 5,3 % ; paires les plus liées : CHANGELOG et FEATURES (1 413 passages), CHANGELOG et PROGRESSION (562), ETAT et FEATURES (522). La redite est surtout **paraphrasée** : elle coûte de la rédaction à chaque livraison, et elle peut diverger.
- Exemple de divergence : `ETAT.md` « Vérifications faites » cite encore la mesure d'équilibre de la 0.30.0 « (12 personnages) ».

### 2.6 Les documents figés

Revues et études terminées, encore au plan et dans le chemin de chaque `grep docs/` :

| Document | Octets | Dernière modification | Renvois vers lui |
| --- | ---: | --- | ---: |
| REVUE_CONTENU.md | 141 630 | 2026-10-24 | 16 |
| REVUE_COMPETENCES.md | 56 628 | 2026-10-25 | 33 |
| ETUDE_AUTOBATTLER.md | 43 271 | 2026-10-19 | 6 |
| AUDIT_COMPENDIUM.md | 41 461 | 2026-10-21 | 7 |
| FAMILLES.md | 34 273 | 2026-10-25 | 38 |
| MOTEUR_V2.md | 23 406 | 2026-10-23 | 29 |
| **Total** | **340 669** | | 129 |

### 2.7 Le code : gros fichiers, fichiers chauds, rayon d'impact

| Fichier | Octets | Lignes | Commits qui l'ont touché (sur 128) |
| --- | ---: | ---: | ---: |
| src/game/combat.test.ts | 278 793 | 4 438 | 44 |
| src/game/statuses.ts | 99 525 | 1 933 | 40 |
| src/game/audit.ts | 96 478 | 1 288 | 34 |
| src/game/staging.ts | 96 107 | 1 910 | 20 |
| src/game/staging.test.ts | 95 982 | 1 550 | 23 |
| src/game/combat.ts | 82 724 | 1 545 | 34 |
| src/game/modules.test.ts | 82 255 | 1 397 | 45 |
| src/components/screens.test.tsx | 58 104 | 875 | 36 |
| src/game/roster.ts | 44 636 | 717 | 45 |

- Fichiers les plus touchés : ETAT 91 commits, CHANGELOG 87, `package.json` 86, FEATURES 72, puis `roster.ts`, `modules.test.ts` (45), `combat.test.ts` (44), `index.css` (43), TODO (44), ARCHITECTURE (41), `statuses.ts` (40).
- **Rayon d'impact d'un statut** : sur les 30 derniers commits, les 16 qui touchent `statuses.ts` touchent aussi `combat.test.ts` et `STATUTS.md` (16), `roster.ts` et `PERSONNAGES.md` (15), `screens.test.tsx` (14), `modules.test.ts` et `audit.test.ts` (13), `SORTS.md` (13), puis `states.ts`, `audit.ts`, `RESOLUTION.md`, `PROGRESSION.md`, `FEATURES.md`, `ETAT.md`, `TODO.md`, `CHANGELOG.md` (12), `hooks.ts`, `events.ts` (11). Côté code, c'est la surface décrite par `SYSTEMES.md` ; côté docs, **huit documents** suivent chaque statut.
- **Tests de texte** : 105 assertions comparent une phrase française (73 dans `combat.test.ts`, 32 dans `screens.test.tsx`, quelques-unes ailleurs). Une reformulation de description casse des tests dispersés, qu'il faut retrouver un par un.
- **Renvois** : 246 renvois vers `docs/*.md` depuis 76 fichiers de code, et 715 renvois « FICHIER.md § n » dans le dépôt. Renuméroter une section casse des renvois en silence ; tout ménage doit garder les numéros ou poser des renvois stables.

## 3. Diagnostic

1. **L'écriture de la doc pèse autant que le code.** Sur les huit derniers commits, 48 % des octets écrits sont de la doc. Une clôture de version est presque entièrement de la doc (105 Ko contre 1 Ko).
2. **Le gros de cette écriture est de la chronique**, déjà portée par le CHANGELOG et git : la ligne 3 d'ETAT, la ligne d'historique de FEATURES, les récits de version dans les limites d'ETAT, le tableau point par point de PROGRESSION § 1, l'état de TODO § 20.
3. **Les lignes géantes multiplient le coût** de la moindre correction et se lisent mal.
4. **La taille brute compte moins** : un agent ne lit pas 2,3 Mo. Elle coûte par le bruit (un `grep` sur `docs/` remonte des revues figées et des historiques) et par le risque de lire un fait périmé.
5. **Le rayon d'impact du code est réel mais structurel** : la règle « un registre, des générateurs » l'a déjà concentré. Ce qui reste coûteux, ce sont les très gros fichiers partagés (relus et réédités par plusieurs agents à la fois) et les tests qui figent des phrases.

## 4. Propositions chiffrées

Gains en octets mesurés ou estimés à partir des mesures ci-dessus ; « jetons » à 3,3 octets par jeton.

| # | Proposition | Gain estimé | Coût | Risque |
| --- | --- | --- | --- | --- |
| **O1** | ETAT réduit à l'état présent | lecture 135 → ≤ 20 Ko ; écriture 34 → 2 à 4 Ko par livraison | 1 h | faible |
| **O2** | FEATURES sans historique | 240 → ≈ 170 Ko ; écriture 15 → 3 à 5 Ko par livraison | 1 h | faible |
| **O3** | Une seule chronique : le CHANGELOG | avec O1 et O2 : 105 → 30 à 40 Ko écrits par livraison | une règle | faible |
| **O4** | Archiver les documents figés | 341 Ko hors du chemin des recherches | 30 min | faible |
| **O5** | Lignes courtes (≤ 400 caractères) | une correction coûte une ligne, pas 25 Ko | 1 h | nul |
| **O6** | Checklist de `CLAUDE.md` allégée | 9,4 → 4 à 5 docs par commit ; −1 800 jetons par agent | 30 min | moyen |
| **O7** | Une page d'entrée par système (dans un doc existant) | moins d'exploration [non mesuré] | 1 h | faible |
| **O8** | Découper les gros fichiers partagés | lectures ciblées, moins de collisions entre agents | 2 à 4 h | moyen |
| **O9** | Tests de texte regroupés en un instantané | une reformulation = un diff relu | 2 h | moyen |
| **O10** | Renvois stables (pas de renumérotation) | 715 renvois préservés | nul | nul |

### O1. ETAT réduit à l'état présent

- **Quoi** : la ligne 3 devient « version, date, lien vers le CHANGELOG » ; « Ce qui fonctionne » prend une ligne courte par système, sans historique de versions ; « Limites connues » ne garde que les limites vraies aujourd'hui, sans récit de livraison ; « Chantiers » renvoie à TODO et aux docs thématiques. L'ancien texte va dans `docs/archive/ETAT-0.121.0.md`. Cible : ≤ 20 Ko.
- **Gain** : lecture complète 135 → ≤ 20 Ko (≈ −35 000 jetons) ; écriture par livraison 34 Ko → 2 à 4 Ko (≈ −9 000 jetons de sortie).
- **Coût** : 1 heure d'agent. **Risque** faible (archive et git) : vérifier qu'aucune limite encore vraie ne disparaît.

### O2. FEATURES sans historique

- **Quoi** : les 307 lignes « version → changement » (68,7 Ko) partent dans `docs/archive/FEATURES-historique.md` ; FEATURES ne dit que les règles en vigueur ; la checklist perd « et ligne d'historique ».
- **Gain** : 240 → ≈ 170 Ko ; écriture par livraison 15 Ko → 3 à 5 Ko, et seulement si une règle change.
- **Coût** : 1 heure. **Risque** faible ; perte : la vue « historique d'une fonctionnalité », qu'on retrouve par `grep` dans le CHANGELOG ou l'archive.

### O3. Une seule chronique, le CHANGELOG

- **Quoi** : une livraison se raconte une fois. ETAT, FEATURES, TODO et les docs thématiques renvoient à la version au lieu de la raconter. PROGRESSION § 1 garde les **décisions de l'utilisateur** (valeur propre), pas le récit de livraison.
- **Gain** : avec O1 et O2, docs écrits par livraison **105 → 30 à 40 Ko** (≈ −20 000 jetons de sortie).
- **Coût** : une règle (O6), puis de la discipline. **Risque** inverse : un CHANGELOG qui enfle ; viser une entrée ≤ 4 Ko avec renvoi au doc thématique.

### O4. Archiver les documents figés

- **Quoi** : les six documents du § 2.6 (341 Ko) dans `docs/archive/`, hors du plan principal et des lectures de `CLAUDE.md` (qui cite FAMILLES et ETUDE_AUTOBATTLER).
- **Gain** : −15 % du volume de `docs/` dans le chemin des recherches ; moins de faits périmés remontés.
- **Coût** : 30 minutes, dont la correction de 129 renvois. **Risque** faible ; FAMILLES (38 renvois) et REVUE_COMPETENCES (33) sont encore cités : les garder en place est aussi une option.

### O5. Lignes courtes

- **Quoi** : règle d'écriture « une ligne de doc ≤ 400 caractères ; une case de tableau porte un mot-clé et un renvoi ; le détail va en liste ». Réécrire les 44 lignes de plus de 1 500 caractères (ETAT 10, FEATURES 15, MISE_EN_SCENE 5, ARCHITECTURE 3, autres 11).
- **Gain** : une correction coûte une ligne, pas 25 Ko ; plus de texte tronqué dans les recherches.
- **Coût** : 1 heure, nul ensuite. **Risque** nul.

### O6. Checklist de `CLAUDE.md` allégée

- **Quoi** : à chaque livraison, `package.json`, `CHANGELOG.md` et **le seul document thématique concerné** ; ETAT seulement si une limite ou un chantier change ; FEATURES seulement si une règle change. Ramener `CLAUDE.md` à ≈ 6 Ko en renvoyant le détail des outils (laboratoire, logs, captures) vers `ARCHITECTURE.md`.
- **Gain** : 9,4 → 4 à 5 docs touchés par commit [estimation] ; `CLAUDE.md` −1 800 jetons par agent, ≈ −12 000 par lot de six agents.
- **Coût** : 30 minutes. **Risque** moyen : une règle oubliée en sortant du fichier toujours lu. Garder dans `CLAUDE.md` les règles dures (moteur unique, `Rng`, pas d'emoji, UI kit, équilibre, vérification proportionnée) ; ne déplacer que les procédures.

### O7. Une page d'entrée par système

- **Quoi** : sans nouveau document, dans `ARCHITECTURE.md` (ou en tête de `SYSTEMES.md`), un tableau « système → doc de règles → fichiers de code → tests → commande de mesure », une ligne par système (combat, statuts, mise en scène, son, reliques, maîtrises, forge, campagne, tournoi et saison, paris, compendium).
- **Gain** : moins d'exploration en début de tâche [estimation non mesurée : quelques allers-retours d'outil, 5 000 à 15 000 jetons de lecture par tâche].
- **Coût** : 1 heure. **Risque** faible : à tenir à jour quand un fichier naît ou change de rôle. Un document de plus serait contre-productif.

### O8. Découper les gros fichiers partagés

- **Quoi** : `combat.test.ts` (279 Ko, 4 438 lignes) par mécanique (`combat.<mécanique>.test.ts`) ; `statuses.ts` (100 Ko) par famille de statuts ; `audit.ts` (96 Ko) par contrôle.
- **Gain** : lectures ciblées ; surtout, moins de collisions entre agents en parallèle (tag périmé, relecture) sur les fichiers les plus partagés.
- **Coût** : 2 à 4 heures, **sur un lot calme, sans agents en parallèle**. **Risque** moyen : imports, ordre d'enregistrement des registres ; couvert par `npm run check` et l'empreinte `balance.test.ts`, qui ne doit pas bouger.

### O9. Tests de texte regroupés

- **Quoi** : les 105 assertions de phrases deviennent un instantané unique des textes générés (`describeSkill`, `describeRelic`, statuts) dans `wording.test.ts` ; les autres tests vérifient la règle, pas la phrase.
- **Gain** : une reformulation = un instantané relu et mis à jour, au lieu de tests dispersés à retrouver.
- **Coût** : 2 heures. **Risque** moyen : un instantané se met à jour sans être lu. Règle : son diff se relit et se cite dans le CHANGELOG, comme l'empreinte d'équilibre.

### O10. Renvois stables

- **Quoi** : ne plus renuméroter une section citée ; une section nouvelle prend un numéro libre ou un « bis » ; tout ménage (O1 à O4) garde les numéros existants.
- **Gain** : évite la casse silencieuse de 715 renvois. **Coût** et **risque** nuls.

### Ce qui ne vaut pas la peine

- **Fusionner les documents thématiques** (RESOLUTION, STATUTS, SONS, MISE_EN_SCENE…) : ils sont lus par section et ne se recouvrent qu'à 1 à 4 % ; les fusionner ferait des fichiers plus gros sans rien retirer.
- **Raccourcir le CHANGELOG ancien** : il n'est lu que par le haut ; le gain est nul pour l'agent.
- **Réduire la doc de conception** (PROGRESSION, MAITRISES, CAMPAGNE, PERSONNAGES) : c'est la justification des choix et les décisions de l'utilisateur, ce qui évite de rediscuter ; elle se lit par section.

## 5. Ordre recommandé et coût total

1. **O6 puis O3** (une règle) : 30 minutes, effet immédiat sur chaque livraison suivante.
2. **O1, O2, O5, O10** (ménage d'ETAT et de FEATURES, lignes courtes) : 2 à 3 heures, un seul agent, sans autre agent sur les docs.
3. **O4** (archive) et **O7** (page d'entrée par système) : 1 h 30.
4. **O8, O9** (code et tests) : 4 à 6 heures, plus tard, sur un lot sans agents en parallèle, avec `npm run check` et l'empreinte inchangée comme preuve.

Gain attendu des étapes 1 et 2, sur une livraison du type de la 0.121.0 : **de 105 Ko à 30 à 40 Ko de docs écrits**, de 9 à 4 ou 5 documents touchés, ETAT lisible en entier (≤ 20 Ko au lieu de 135 Ko). Le temps gagné en minutes n'est pas mesuré ici : il dépend du débit de génération et du nombre d'agents ; l'ordre de grandeur est de quelques minutes de génération pure par livraison, plus les relectures évitées.

## 6. Ce qui n'a pas été mesuré

- La durée réelle d'une demande (aucune horloge par tâche dans le dépôt), le débit de génération, le nombre exact de jetons (pas de compteur ; conversion estimée).
- La durée de `npm run check` et de `npm run balance` (non lancés : d'autres agents modifiaient le dépôt).
- Ce que les agents lisent vraiment (les transcriptions ne sont pas dans le dépôt) ; le gain de O7 est une estimation.

## 7. Questions pour l'utilisateur

1. Accepter que **FEATURES ne garde plus d'historique** (O2), le CHANGELOG devenant la seule chronique ?
2. Accepter un **ETAT réduit à l'état présent** (O1), l'ancien texte archivé ?
3. Alléger la checklist de livraison de `CLAUDE.md` (O6) : une règle de l'utilisateur y figure (« à chaque évolution livrée ») ; la changer est sa décision.
