# Structurer un retour de jeu (étude du 2026-10-27, point B18)

La question de l'utilisateur (second retour du 2026-10-27) : « Comment structurer mes retours du mieux possible pour que leur mise en œuvre soit la plus efficace, la plus rapide, avec le moins d'effets de bord possible ? Par rubrique ? Par système ? Ou tout d'un coup et tu fais le tri ? Ceci a-t-il seulement une incidence sur ton travail ? »

Sources : `prompts/Retour du 27 octobre.md` (premier retour, 165 lignes), `prompts/Retour du 27 novembre B.md` (second retour, daté du 27 octobre), leur reformulation par l'agent (57 points V, P, M, S, C, U, R, puis 19 points B1 à B19), les 13 rapports des agents de la 0.121.0 et [PROGRESSION.md](../PROGRESSION.md) § 1.21. Le gabarit prêt à copier : [`prompts/GABARIT_RETOUR.md`](../../prompts/GABARIT_RETOUR.md).

## 1. Réponse courte

- **L'ordre d'écriture compte peu.** Par partie, par rubrique ou en vrac : l'agent relit tout et retrie par système dans tous les cas (le premier retour, écrit par partie puis par rubrique, a été réécrit en sept rubriques avant tout travail). Le récit par partie a même une valeur : il dit avec quel build et contre qui une impression est née.
- **Ce qui compte, ce sont trois informations par point, que l'agent devine aujourd'hui** : la **nature** du point (bug, réglage, idée, question, ressenti), la **marge** laissée à l'agent (la solution est gelée, ouverte, ou seulement à proposer) et **ce qui ne doit pas bouger**. Sur les 19 points du second retour, **7 reprennent ou rouvrent du travail livré en 0.121.0** (B1, B3, B4, B5, B8, B9, B10) ; chacun remonte à l'une de ces trois devinettes (§ 2.2).
- **Tout d'un coup, oui**, en un seul envoi par séance de jeu. Une seule condition : une **vision** (un changement de structure, comme les Maîtrises) est marquée « propose » ; l'agent la conçoit, l'utilisateur la valide, puis seulement on code. Le 27, la vision a été conçue et codée le même jour, sans validation entre les deux : c'est elle qui a produit les plus grosses reprises.
- **Répondre aux questions de l'agent par leur numéro** (« Q3 : oui »). Le 27, 17 questions ont été posées dans 8 rapports différents ; 6 ont reçu une réponse dans le second retour.

## 2. Ce qui s'est passé le 27

### 2.1 En chiffres

| | Premier retour (0.120.0 → 0.121.0) | Second retour (après la 0.121.0) |
| --- | --- | --- |
| Forme | 165 lignes : vision, journal par personnage, puis rubriques (UI, compendium, mécaniques, animation, bugs, envies, son, reliques) | 16 puces, 3 problèmes de fond, des principes |
| Reformulé par l'agent en | 57 points dans 7 rubriques, un propriétaire chacun | 19 points, un propriétaire chacun |
| Agents | 8 (conception et corrections), puis 5 (implémentation de la vision) | 7 |
| Questions renvoyées à l'utilisateur | 17, dans 8 rapports ; 6 tranchées par le second retour | à venir |

### 2.2 Les reprises, et leur cause

| Livré en 0.121.0 | Repris dans le second retour | Ce que le retour disait | Cause | Ce qui l'aurait évité |
| --- | --- | --- | --- | --- |
| Critique assuré qui perd une charge par tour (M1 : usure, étape de trace, audit, mise en scène, textes, docs) | B8 : une seule charge, sur la prochaine frappe, perdue si elle rate | « doit destack à chaque tour, sinon c'est trop fort » | Une **solution** donnée comme consigne ; l'agent a appliqué la lettre. Le besoin était « trop fort » | Le problème d'abord, la piste ensuite, et la marge : gelé ou ouvert |
| Vol de vie : « vérifié sans défaut, la Riposte et la Rétribution sont des renvois » (M6) | B9 : l'utilisateur veut qu'elles drainent | rangé sous « BUG constatés » : « check stp » | Une **envie** rangée en bug : l'agent a cherché un défaut, n'en a pas trouvé, et la décision a pris un tour de plus | Étiquette `question` (« est-ce voulu ? ») ou `idée` (« je le voudrais ») |
| Onglet Auras créé (C1), puis l'onglet Maîtrises les contient aussi (vague 2) | B4 : supprimer l'onglet Auras | l. 9 et 104 : un onglet Auras ; l. 108 : un onglet Maîtrises | La vision a mûri **pendant l'écriture** ; les deux demandes sont restées | Une section « Vision » qui prime sur le reste, relue en fin d'écriture |
| Onze maîtrises, deux par personnage | B1 : huit | « plusieurs combinaisons possibles » | Aucun cadre ; l'agent a couvert chaque identité sans fusion | Marge « propose » sur la vision (et un ordre de grandeur s'il est déjà en tête) |
| Neuf compétences nouvelles (Veine, Effroi, Rancœur, Champ d'orage, Ballade, Prière, Flétrissure, Assaut, Poing de pierre) | Principe : « mes inputs avant tes inventions » | En tête : « correction, adaptation, brainstorming » | Marge implicite : le mot « brainstorming » a été lu comme un feu vert | La liste « Gelé » (« aucune compétence nouvelle sans ma validation ») |
| Morgrut à une seule aura de départ (deux retirées hors tolérance) | B5 : toutes ses auras, même règle pour tous | rien | L'agent a fait de la tolérance d'équilibre un filtre par personnage | Un principe écrit une fois (« pas d'exception par personnage ») ; c'est fait, il est désormais dans les consignes |
| Duo à 3 charges (4 dés) pour compenser l'Aura mélodieuse | B10 : retirer « des dés de plus à sa prochaine action » | « retirer l'effet de l'Aura mélodieuse et lui donner l'effet du Duo » | Une **compensation** choisie par l'agent pour tenir la tolérance (Fanchon nue à 18,5 %), sans la soumettre | Marge « gelé » sur le retrait, et la compensation en `question` |
| Porteurs sur les tuiles de maîtrise | B3 : les retirer | rien | Ajout d'interface de l'agent | Marge « gelé » sur la demande d'écran |

Et ce qui a bien marché sans format : la Pièce trouée nommée à la place de la Pièce de foire (l'agent a trouvé la bonne relique, B15 a confirmé), « extrémités puis centre » (interprété, la question reste), les bugs d'écran et de mise en scène (S1 à S9, U1 à U4) traités en parallèle sans reprise.

### 2.3 Ce qui ne vient pas du format

Une part des effets de bord du 27 vient de l'organisation de l'agent, pas de l'écriture du retour :
- **Mesures sur une base qui bouge** : Fanchon mesurée à 18,6 % pendant qu'un autre agent changeait son dé, rapports du laboratoire de 10 h 39 et 10 h 44 périmés, « taux absolus à reprendre après intégration ».
- **Tests rouges d'un autre agent** : 5 échecs constatés par EngineFixes, qui appartenaient à StagingFixes et Compendium.
- **Docs remises à plus tard** (« faute de budget ») et un ménage de fin (10 icônes mortes, mentions périmées de l'Ouverture, de la Pièce de foire, de l'Aura mélodieuse).

Cause : la vision et les corrections de règles sont parties dans la même vague, sur les mêmes fichiers (`combat.ts`, `statuses.ts`, `roster.ts`). Le format aide l'agent à les séparer (§ 4), mais c'est à l'agent de le faire.

## 3. Le gabarit

Chaque point tient sur une ligne, précédée de trois mots entre crochets :

`- [étiquette · priorité · marge] Système — constat. Ce que je veux. (piste éventuelle)`

| Champ | Valeurs | Ce que l'agent en fait |
| --- | --- | --- |
| **Étiquette** | `bug` : le jeu ne fait pas ce qu'il dit | reproduire (trace, graine), corriger, test dans `combat.test.ts` ou `staging.test.ts` |
| | `réglage` : ça marche, mais trop, pas assez, pas comme ça | changer une valeur ou une règle existante, mesurer avant → après |
| | `idée` : quelque chose de nouveau | selon la marge : le faire, ou le proposer chiffré |
| | `question` : je ne sais pas si c'est voulu | répondre d'après les règles et le code, sans campagne de tests ; rien ne change |
| | `ressenti` : une impression de jeu (« Brokk ennuyeux », « Ysolde redoutable ») | mesurer, expliquer la cause, proposer ; rien ne change sans décision |
| **Priorité** | `vite` : gâche une partie | d'abord, seul si besoin |
| | `ce lot` | dans la livraison |
| | `plus tard` | noté dans `TODO.md`, aucun travail |
| **Marge** | `gelé` : faire exactement ça | la lettre ; si elle semble poser un problème, le dire avant de livrer |
| | `ouvert` : le besoin compte, la solution est à l'agent | choisir, mesurer, livrer, expliquer le choix |
| | `propose` : ne rien livrer | une proposition chiffrée dans la doc, aucune ligne de `src/` |
| **Système** | Combat, Compétences, Reliques, Personnages, Maîtrises, Campagne, Tournoi, Paris, Compendium, Écrans, Mise en scène, Son, Images | le propriétaire et le document de référence (le plan de [docs/README.md](../README.md)) |

Autour des points, cinq sections, toutes facultatives :
1. **Gelé** : ce qui ne bouge pas (« la progression était bien », « Pièce maudite en l'état », « aucune compétence nouvelle sans ma validation »). L'agent ne le repropose pas et ne le remesure pas.
2. **Réponses** aux questions numérotées de la livraison précédente.
3. **Vision** : le changement de structure, s'il y en a un. Elle prime sur les points qui la contredisent. Par défaut, marge `propose`.
4. **Points**, dans n'importe quel ordre.
5. **Journal de partie** : le récit brut, tel quel. L'agent y lit le contexte des ressentis ; on n'a pas à le reformuler.

Pour un bug de combat, ajouter **le combat** (champion, adversaire, heure ou tour) suffit : chaque combat joué sur le serveur de dev a sa trace dans `logs/combats/`, et `npm run logs` les rejoue.

## 4. Ce qui change vraiment pour l'agent

- **Découpage.** Le système désigne le propriétaire sans relecture du code ; deux points du même système vont au même agent, ce qui évite les éditions croisées sur un fichier. La reformulation par l'agent (57 points le 27) reste nécessaire pour attacher les fichiers, mais elle ne devine plus la nature ni la marge.
- **Ordre.** Trois tas : les `bug` et `réglage` gelés partent tout de suite, en parallèle par système ; les `propose` et les `ressenti` vont à des agents d'étude qui ne touchent pas `src/` ; les changements de règles et de valeurs (tout ce qui bouge l'équilibre) sont groupés chez un seul propriétaire et **mesurés une seule fois, à la fin**. C'est la réponse aux mesures périmées du § 2.3.
- **Parallélisme.** Sûr entre systèmes sans règle commune (écrans, mise en scène, compendium, son, images) ; risqué dès que deux points touchent le moteur, les statuts ou le roster. Le champ Système rend la frontière visible avant de lancer les agents.
- **Moins de ré-audit.** `question` se répond en lisant les règles et le code (le 27, M5 a été vérifiée sur 73 coups et un test dédié) ; `gelé` dispense de chercher une alternative ; `plus tard` dispense d'étudier ; la liste « Gelé » dispense de remesurer ce qui est acquis.
- **Moins de questions, et des questions qui reviennent.** `ouvert` autorise l'agent à trancher seul ; `gelé` et `propose` ferment les cas où il demandait. Les questions restantes sont numérotées et reviennent avec leur réponse.
- **Le gain principal est dans les reprises, pas dans la vitesse.** [INFERENCE] Le temps d'une livraison dépend surtout du rayon d'impact des systèmes touchés (étude B17), que le format ne réduit pas. Ce que le format évite, c'est un tour de plus : 7 des 19 points du second retour.

## 5. Ce qui ne change rien

- L'ordre d'écriture (par partie, par rubrique, par système) : l'agent retrie.
- L'orthographe, le style, la longueur, les abréviations.
- Un gros retour ou plusieurs petits, tant qu'ils arrivent **avant** le travail. Un ajout pendant qu'une vague tourne force à recoordonner des agents en cours : mieux vaut l'envoyer avec la livraison suivante, sauf bug `vite`.
- Les règles déjà écrites dans `CLAUDE.md` (mesurer avant de proposer, pas d'emoji, cotes cachées, PV en dernier levier) : inutile de les répéter. Un principe nouveau se dit une fois, dans « Gelé » ; l'agent l'inscrit dans les consignes.
- Le temps de lecture du code et des docs par l'agent (étude B17).

## 6. Ce que l'agent fait en retour

1. Chaque point garde un identifiant (B1, B2…) du retour à la livraison, repris dans la doc et le CHANGELOG.
2. Une seule liste **Questions** numérotées par livraison, chacune avec le défaut appliqué en attendant, dans le message final et dans `ETAT.md`. Pas de question cachée dans un rapport d'agent.
3. La marge est respectée : `gelé` est fait à la lettre (un doute se dit avant de livrer, il ne se règle pas en douce), `propose` ne touche pas `src/`.
4. Sans marge, une vision ou un contenu nouveau (compétence, aura, relique, maîtrise) vaut `propose` ; une correction ou un réglage vaut `ouvert`.
5. Une compensation d'équilibre que l'utilisateur n'a pas demandée est livrée comme question (« Duo à 3 charges pour tenir 49 % : oui ou non ? »), pas comme un fait.

## 7. Exemple : une partie du premier retour, réécrite

Avant (premier retour, verbatim) :

> - Les auras, doivent etre mentionné comme telles dans le compendium avec leur onglet dedié. (l. 9)
> - il faut un onglet qui parle des famille/répertoire que désormais nous appelerons MAITRISE (l. 108)
> - retirer l'effet de aura mélidieuse et lui donner leffet de duo (l. 83)
> - Le status critique assuré doit destack à chaque tour, sinon c'est trop fort. (l. 115)
> - la riposte doit manquer un adversaire sous esquive (l. 120)
> - NAraxes contre aldric : Aldric, sous vol de vie, ne récupère pas de vie sur une rétribution ou une ripose ? check stp. (l. 136)
> - de manière general un peu chiant. on sent qu'il manqu un peu qq chose... retourner l'armure sou forme de degats ? associer une autre famille à brokke ? (l. 57)

Après, avec ce que le second retour a révélé des intentions (la Riposte qui consomme l'esquive, l'envie de drainer, « 8 » maîtrises, aucune invention) : c'est de la reconstitution, pour montrer l'effet. Dans un vrai retour, on écrit ce qu'on sait ; ce qu'on ne sait pas encore reste `ouvert` ou `propose`.

```markdown
## Gelé
- La progression (forge, offres, Graver) : ne pas la refaire.
- Aucune compétence nouvelle sans ma validation : déplacer, renommer, adapter l'existant.

## Vision (propose)
Les familles deviennent des Maîtrises : deux par personnage, une réserve commune par maîtrise,
une aura de départ au choix sur le 1. Plutôt peu de maîtrises (8 ?), aucune pauvre en contenu.
Compendium : un onglet Maîtrises qui contient les auras de chacune, pas d'onglet Auras à part.
Je valide avant tout code.

## Points
- [réglage · ce lot · ouvert] Combat — Critique assuré : trop fort, il se garde plusieurs tours.
  Je veux qu'il serve tout de suite ou se perde. (piste : une charge, sur la prochaine frappe, perdue si elle rate)
- [réglage · ce lot · gelé] Combat — Riposte contre un adversaire sous esquive : elle manque, et consomme l'esquive.
- [question · ce lot] Combat — Aldric sous Vol de vie ne draine pas sur Riposte et Rétribution (contre Naraxes) : voulu ?
  Si non, je voudrais qu'elles drainent.
- [réglage · vite · gelé] Personnages — Fanchon : retirer l'Aura mélodieuse, lui donner l'effet du Duo.
  Une compensation : me la proposer.

## Journal de partie
Brokk : de manière générale un peu chiant, il manque quelque chose... retourner l'armure
sous forme de dégâts ? associer une autre famille à Brokk ? (ressenti, pistes à étudier)
```

Ce que chaque ligne aurait changé le 27 :

| Ligne | Ce qui s'est passé | Avec le gabarit |
| --- | --- | --- |
| Vision `propose`, « 8 ? », onglet Maîtrises seul | 11 maîtrises et 9 compétences conçues puis codées le même jour ; onglet Auras créé puis supprimé | une proposition validée avant le code : B1, B3, B4 et l'arrêt des inventions évités |
| Gelé « aucune compétence nouvelle » | 9 compétences inventées, principe posé après coup | aucune invention ; l'état des lieux par maîtrise (B6) vient d'abord |
| Critique assuré `ouvert`, besoin + piste | usure par tour codée (M1), puis refaite (B8) | une seule implémentation, la bonne au premier tour ou proposée |
| Riposte `gelé` « consomme l'esquive » | question renvoyée à l'utilisateur (M3), tranchée en B9 | aucune question |
| Vol de vie `question`, avec l'envie | rangé sous « bugs » : réponse « sans défaut, ce sont des renvois », l'envie n'est apparue qu'au retour suivant (B9) | réponse et avis sur l'envie dans la même livraison |
| Fanchon `gelé` + compensation proposée | Duo à 4 dés livré pour tenir 49 %, retiré en B10 | la compensation arrive comme question, chiffrée |
| Brokk en journal | lu comme ressenti ; réponse par une brique nouvelle (Poing de pierre : « armure → dégâts ») | le journal reste brut ; avec « Gelé », la piste arrive en proposition, pas en brique livrée |
