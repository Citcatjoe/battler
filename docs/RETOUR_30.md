# Retour du 30 octobre : registre de traitement

Source : `prompts/Retour du 30 octobre.md` (retour de jeu sur la 0.129, traité depuis la 0.131.2). Ce registre garantit que chaque point est **livré**, **proposé**, **répondu** ou **reporté avec raison**. Tenu par l'agent Suivi.

Catégories : correction claire, vision à proposer, question, icône, UX combat, compendium, interface, contenu, retour positif (rien à changer, à préserver).

Statuts : livré (codé, preuve dans le code), proposé = à valider par l'utilisateur (rien codé), répondu (question ou constat, sans changement), reporté (raison dans la preuve). Une ligne « livré + proposé » ou « répondu + proposé » a une part faite et une part en attente.

Contrôle final (Suivi, 2026-10-30) : chaque symbole cité comme livré a été retrouvé dans le code (`fromHit`, `shockwave`, `riseTail`, `emberRain`, `describeRelic`, noms `Aura …`, `.aura-seal`, `compendiumSkills`, onglet « Compétences et auras », `onNewRun`, `statusTone`, `laneOf`/`LANE_SHIFT`, `ridesOf`, `countersBlow`, `harvest`/`HARVEST_DRAIN`, `heritageSlot`, `tunedOpponent`, `tuneHp`, `withEncounters`), les six icônes `state-*.png` de la planche v33, les trois études `docs/etudes/` et les captures `logs/captures/floats-*.png`. Les mesures sont celles des rapports `local://r30-*.md`, non rejouées.

## Décisions attendues de l'utilisateur

1. **D1** Tournoi sans saison construit d'un acte complet (P2) : recommandé oui. R1, `local://r30-Parite.md`.
2. **D2** « Pas de redite » dans les offres (O1, redites 4 → 0 %) : recommandé oui. R22.
3. **D3** Freeze avant les cartes d'adversaire : calcul dans un Web Worker ou pendant le combat. R4.
4. **D4** Difficulté du boss : PV fixes (200 PV mesurés) puis échelle de Colosses, après resserrement des builds ; règle « Inébranlable » (−20,7). R3, R26.
5. **D5** Dés de plus : S2 « le Doublé » (dé de frappe sauf même face que le dé de compétence) : recommandé S2. R13, R16, R29 ; `DES_SUPPLEMENTAIRES.md` § 7 Q1.
6. **D6** Interface des dés : dé de compétence couleur du camp, dés de frappe blancs, doublé doré : recommandé. R14 ; Q2.
7. **D7** Pièce de la rafale : inchangée (recommandé) ou pile = 1 coup. R8 ; Q3.
8. **D8** Aura purgée qui revient au 2e tour + Purification 7 sur bonus retiré (A2·7, recommandé) ou A2·8. R12 ; Q4.
9. **D9** Reliques d'essai au catalogue : Clairon du héraut, Sceau long, Dé de joueur, Rage au critique reçu ; Rage montante en aura de Fureur. R57-R59 ; Q5.
10. **D10** Récolte ×1 livrée (dans la bande) ; ×2 possible. R31.
11. **D11** Règle « chiffre affiché ≥ 2 » (fin des +1/-1) : recommandé. R18, `PERSOS_RETOUR_30.md` § 2.
12. **D12** Elaria critique 17 → 15 % (55,1 → 52,8 %). R15.
13. **D13** Brokk, Épines plantées, Saignement 2 par épine. R17.
14. **D14** Onde de choc 3 PV par coup encaissé. R21.
15. **D15** Ervald, Poison 4 tous les deux tours (48,2 → 53,7 %). R24.
16. **D16** Effroi plafonné à 3 charges (−0,1). R26.
17. **D17** Ysolde, Jugement en verdict de 8 PV. R28.
18. **D18** Pile ×3 sur un critique (36 PV en une action) : moment voulu ? défaut : garder ; sinon ×2. R35.
19. **D19** Morgrut, seconde aura Cuir épais (+3 armure par coup reçu). R36, R38.
20. **D20** Thaldrin, aura de Magie en Ciel (3 éclairs de 2 tous les 3 tours). R39.
21. **D21** Thaldrin Magie + Fureur, Élan au lieu du Brasier (côté ours). R46.
22. **D22** Fanchon, Ballade refrain 4×2 et +4 PV. R47.
23. **D23** Renommages : Duo → Écho, Soliste → Coup de maître, Crescendo → Acharnement, Siffloter → Répit, Fausse note → Main tremblante ; écarter l'alternative « Doublé », déjà prise par la règle de D5. R51.
24. **D24** Braise captive tous les 4 tours, profite de la Brûlure. R52.
25. **D25** Offre de reliques : pas de retour immédiat, reliques de build. R53.
26. **D26** Nouvelles reliques et compétences mesurées (`CONTENU_RETOUR_30.md` § 5, dont Cierge et Grâce pour Ysolde). R54, R27.
27. **D27** Reliques en 3 paliers selon le nombre de reliques possédées. R55.
28. **D28** Recharge pour Géode, Onguent, Conque. R56.
29. **D29** Maîtrise Magie renommée Arcanes + emblème neuf + mot-clé « sort » ; débloque l'icône R61. R60, R62.

## Points à moitié traités

- R19 (Bastion/Riposte) : médiane 645 ms, mais il reste des cas au-delà d'1 s (9 → 7) quand un soin ou la Dent de loup précède la Riposte (`local://r30-Rythme.md`).
- R73 (« Aura » dans le nom) : fait dans le jeu ; les docs (`PERSONNAGES.md`, `AURAS.md`, `REFONTE_AURAS.md`, `FEATURES.md`) et des commentaires citent encore les anciens noms (`local://r30-Textes.md`).
- R80 : défaite réelle non vue au navigateur (même chemin que l'abandon, vu).
- R79 et R69 : à repasser après les décisions D9, D23, D26, D29 (descriptions et icônes du contenu nouveau ou renommé).
- R61 : reporté en attendant D29.

## Registre

| N° | Point (citation courte) | Catégorie | Responsable | Statut | Preuve |
|---|---|---|---|---|---|
| R1 | « A la fin de la campagne, mon personnage a-t-il bien un dé full et 5 reliques ? systématiquement ? » : même construction en tournoi et en campagne (propositions, nombre, ordre, puissance, tirage) ; premier chantier si ce n'est pas le cas | question | Parite | livré + proposé | `drawReward` partagé ; 100 % dé complet + 5 reliques sur 12 000 actes de campagne (3 politiques de choix) et 120 participants de saison. Livré : P1, l'héritage remplace la 1re récompense de sa sorte (`campaign.ts` `heritageSlot`, fin d'acte toujours 5 forges + 5 reliques) ; P3, les adversaires de campagne tirent leur aura parmi les deux (`Encounter.aura`, `tunedOpponent`) ; tests `modules.test.ts`, `CAMPAGNE.md` § 18.9. Reste proposé : P2, le tournoi sans saison (l'arbre seul : participants nus, une relique par tour gagné, trois au plus, pas de forge) ; proposition : que chacun y arrive construit d'un acte complet. `local://r30-Parite.md` |
| R2 | « comment est actuellement calculé le nombre de PV du boss ? » (Colosse : 315, 358, 148, 229, 122, 128, 177, 184 PV selon le personnage) | question | Parite | répondu | `tuneHp` contre 12 références du même personnage et de la même aura (cible 45 %, 18 à 350 PV, +8 affichés pour ses 4 récompenses) ; ne dépend pas du build du joueur ; 5 départs au plafond (Ervald 358 = 350 + 8) |
| R3 | « plus tard il faudrait fixer la difficulté en vue d'un mode sans fin » | vision à proposer | Parite | proposé | boss à PV fixes mesuré (200 PV : 45 % en moyenne, 5 à 92 % selon le départ) ; échelle de Colosses après avoir resserré l'écart des builds complets |
| R4 | « une sorte de petit freeze avant l'apparition des cartes d'adversaire » | question | Parite | répondu | `withEncounters` synchrone sur le fil de l'interface (`App.tsx` l. 209) : 0,14 à 0,53 s par nœud normal, 0,3 à 2,3 s au boss (Node) ; piste : Web Worker ou calcul pendant le combat |
| R5 | « un agent dédié qui valide le traitement de chaque point » | interface | Suivi | livré | ce registre |
| R6 | Elaria, Pourfendre (maîtrise Sang) : « la description n'est pas alignée avec l'effet constaté » | correction claire | Textes | livré | `events.ts` `describeEffect` (fromHit) : « S'il touche, l'adversaire prend un Saignement égal à la moitié des PV que ce coup lui retire » |
| R7 | « les charges de saignement devraient augmenter au moment de l'impact » | UX combat | Rythme | livré | `staging.ts` `ridesOf` (contact Épines/Peau de crapaud, pose au critique de Plaie ouverte) ; M14 bis `landPoses`/withheld (Serment de sang à l'impact) ; 679 montées mesurées, 0 → 679 à l'impact ; `local://r30-Rythme.md` |
| R8 | Pièce de la rafale : « aussitôt déclenché, pile, combat terminé » (trop forte ?) | vision à proposer | PropDes | proposé | +17,9, dans la bande : la garder ; repli : pile = 1 coup (question Q3) ; le rythme relève de R9, livré par Rythme (pile → 1er coup 3 918 → 1 068 ms) ; `docs/etudes/DES_SUPPLEMENTAIRES.md` § 5, `local://r30-PropDes.md` |
| R9 | Pièce de la rafale : « trop de texte flottant, d'intervalle… boom les coups partent please » | UX combat | Rythme | livré | coin `burst` + flurry chaînée (M26 bis) : pile → 1er coup 3 918 → 1 068 ms, plus de titre « Rafale de pile » |
| R10 | Sangsue : « drain puissant… trop ? » | vision à proposer | PropPersos | répondu | Sangsue dans la bande (Saignée d'Elaria +8,4, Brokk +12,3) : rien à changer ; `docs/etudes/PERSOS_RETOUR_30.md` § 9.1 |
| R11 | « le gain de vie (texte flottant + "+x") doit se produire au moment de l'impact » | UX combat | Rythme | livré | drain d'un renvoi à l'impact (`ridesOf`) : Vol de vie d'une Riposte 275 → 0 ms ; Sangsue/Vol de vie déjà à l'impact (104/104) |
| R12 | « aura dispell par Ysolde, ne revient jamais ? ultra handicapant » | question | PropDes | répondu + proposé | aura purgée jamais revenue dans 63 % des cas ; recommandé A2·7 : l'aura se repose d'office au début du 2e tour suivant de son porteur (le rendez-vous du 3e tour se réarme) ; Purification 5 → 7 seulement quand elle retire un bonus (8 sinon, inchangé) ; Ysolde nue 47,2 → 48,2 %, construite 49,4 → 50,3 % ; question Q4 (A2·7 ou A2·8) (§ 4) |
| R13 | Dés supplémentaires : « pouvoir décider le type de dé supplémentaire (compétence possible ou coup seulement) » | vision à proposer | PropDes | proposé | recommandé S2 « le Doublé » : un dé de plus est un dé de frappe, sauf s'il fait la même face que le dé de compétence de l'action (le d6 de l'action) ; question Q1 (S1, S2 ou S3) (§ 2-3) |
| R14 | « un dé pour les compétences, un dé pour les coups blancs… un travail sur l'interface et les dés » | vision à proposer | PropDes | proposé | dé de compétence couleur du camp, dés de frappe blancs, doublé doré ; question Q2 (§ 2-3) |
| R15 | Elaria « vraiment super forte, saignement, regen, critique… un peu trop fort » | vision à proposer | PropPersos | proposé | critique 17 → 15 % : 55,1 → 52,8 % ; labo `scripts/lab/persos-30.ts` (séries 120-129) |
| R16 | Coup de chance « mal tuné… devrait relancer des dés de frappe (coup blanc) et pas snowball » | vision à proposer | PropDes | proposé | avec S2 : Coup de chance +19,0 → +14,2 ; question Q1 |
| R17 | Brokk, première aura « 1 saignement à qui lui tape dessus… c'est nul » (stack ?) | vision à proposer | PropPersos | proposé | Épines plantées, Saignement 2 par épine : 49,3 → 49,8 % |
| R18 | Principe : « éviter les auras ou les coups qui font +1 à ceci ou -1 à cela » | vision à proposer | PropPersos | proposé | règle « chiffre affiché ≥ 2 », inventaire `PERSOS_RETOUR_30.md` § 2 ; à appliquer aussi par PropContenu et PropDes |
| R19 | Aura Bastion : « armure brisée, un élan et une frappe… même timing que riposte » | UX combat | Rythme | livré | élan + frappe comme la Riposte, sans signal (`countersBlow`, M17 ter) : impact → dégâts 875 → 645 ms (médiane) |
| R20 | Onde de choc : « je ne comprends rien à la tooltip… tape selon quoi ? » | correction claire | Textes | livré | `events.ts` release.per + `statuses.ts` shockwave |
| R21 | Onde de choc « semble vraiment faible mais il y a de l'idée » | vision à proposer | PropPersos | proposé | 3 PV par coup encaissé : +4,1 à +4,5 chez ses 3 porteurs |
| R22 | « Rétribution et Serment de sang proposés pour la 3e fois d'affilée… profondeur de maîtrise restreinte » | question | Parite | répondu + proposé | profondeur réelle : 5 compétences sur 15 pour Brokk Bastion à la forge 3 (auras exclues, Sang verrouillé par le producteur) ; option O1 « pas de redite » : redites 4 → 0 %, +0,7 compétence et +0,7 relique vues par acte |
| R23 | Ervald : « la maîtrise Ombre est vraiment jouissive » | retour positif | PropPersos | répondu | Ombre préservée |
| R24 | Ervald, aura de poison « ne met que 1 au début, faible » | vision à proposer | PropPersos | proposé | Poison 4 tous les deux tours : 48,2 → 53,7 % |
| R25 | « tous ces trucs qui font 1 et qui stackent devraient le mentionner dans leur description » | correction claire | Textes | livré | `statuses.ts` riseTail : épines, poison, sainteté, décoction, orage disent « elle monte de 1 tous les deux …, jusqu'à N » |
| R26 | Ervald « full ombre, explosé le boss… peut-on le battre à ce stade ? » | vision à proposer | PropPersos | proposé | Effroi plafonné à 3 charges : −0,1 contre le roster, −2,4 contre des adversaires à 2× PV ; à part, Colosse « Inébranlable » (approché −20,7), règle de boss qui relève de la difficulté de campagne (R3) |
| R27 | Ysolde : « le chemin est tout tracé… étroitesse des possibilités » | vision à proposer | PropPersos | répondu | son offre est la plus étalée ; le manque est le contenu Lumière → PropContenu (R54) |
| R28 | Ysolde, aura des Fautes : « conditions de stack pas claires… un fear en moins bien » | vision à proposer | PropPersos | proposé | texte livré par Textes (Jugement : « coups reçus, jamais des tours ») ; refonte proposée : Jugement en verdict 8 PV, 49,6 → 49,0 % (série 122) |
| R29 | Coccinelle : « dés qui relancent des compétences… proposer des solutions UI et règles pour que ce ne soit pas trop fort mais reste marrant » | vision à proposer | PropDes | proposé | avec S2 : Coccinelle +17,3 → +12,1, Naraxes construite 54,6 → 50,6 % ; question Q1 (§ 7) |
| R30 | Récolte, timing : « dé + apparition du statut + "récolte" → frappe + disparition du statut + "+x" » | UX combat | Rythme | livré | dé → statut + « Récolte » → frappe → statut part + « +N PV » ; test `staging.test.ts` « retour du 2026-10-30 : le rythme du combat » |
| R31 | Récolte, description proposée : « Votre prochain coup draine un montant de PV égal au nombre de charges de poison » | correction claire | Textes, Rythme | livré | statut drain `harvest` (`statuses.ts`, `skills.ts`) ; test `combat.test.ts` « Récolte (retour du 2026-10-30) », `audit.ts` « récolte » ; ×1 livré, dans la bande selon skills.report (outil de référence des gravures) : Ervald +10,9, Naraxes +9,3 ; ×2 possible (+15,6 / +13,1) ; l'écart avec le labo de PropPersos (×1 : +6,8 / +5,3) tient à la méthode |
| R32 | Aldric, Rétribution « rame… intervalles super longs… je regrette les trois coups rythmés » | UX combat | Rythme | livré | cause : attentes (1,64 s/jauge + 1,3 s de lecture), pas le calcul (0,55 ms moteur) ; Rétribution en série (M53 bis) : dé → dernière jauge 5 550 → 1 580 ms |
| R33 | « enchaînements de riposte et coups blancs un peu chaotiques… on ne sait plus où on en est » | UX combat | Rythme | livré | coup rendu d'abord parmi les réactions (M17 ter) ; `MISE_EN_SCENE.md` journal |
| R34 | Aldric esquive : « les propositions ne sont pas les mêmes, c'est la sensation que je veux ressentir plus souvent » ; Rétribution + Trophée du chasseur retournent un combat | retour positif | PropPersos | répondu | à préserver |
| R35 | Aldric « mort contre Naraxes… c'est allé trop vite, une méga beigne » | vision à proposer | PropPersos | répondu + question | question à l'utilisateur : pile ×3 sur un critique (36 PV en une action) est-il un moment voulu ? défaut : le garder ; alternative mesurée pile ×2 : Naraxes 52,3 → 47,6 % |
| R36 | Morgrut : « ses auras ne donnent pas une impression d'orientation très différente » | vision à proposer | PropPersos | proposé | seconde aura Cuir épais, +3 armure par coup reçu : 49,3 → 46,6 % |
| R37 | Morgrut « tout est aiguisé… sa simplicité, est-ce parce qu'il est trop fort ? » | question | PropPersos | répondu | non : dernier construit, 43,7 % |
| R38 | Morgrut « perdu contre le Colosse, pas assez de sustain malgré l'investissement défensif » | vision à proposer | PropPersos | proposé | même proposition que R36 (Cuir épais) |
| R39 | Thaldrin, aura de Magie : « devrait augmenter les dégâts magiques de +1 ou donner un éclair en plus » | vision à proposer | PropPersos | proposé | Ciel tous les 3 tours, 3 éclairs de 2 : 56,9 → 56,8 % |
| R40 | Peau de crapaud « ressemble à une aura… probablement un statut défensif » | correction claire | Textes | livré | détail de Peau de crapaud : « bonus à charges, pas une aura » |
| R41 | Thaldrin morts aux combats 1, 2 et 5 : « pas inintéressant mais pas incroyable » | vision à proposer | PropPersos | répondu | dernier construit avec Morgrut et Gorak ; propositions R39, R46 |
| R42 | « l'aura du druide envoie des boules de feu qui mettent brûlure ? la tooltip est vraiment pas claire… pas dans la description » | correction claire | Textes | livré | Aura du brasier : « des braises tombent… » (scène emberRain) |
| R43 | « les dégâts de brûlure devraient être jaunes, poison vert… "+2 brûlures" violet, "-13" de brûlure en violet » | UX combat | Lisibilite | livré | Feu et Brûlure jaunes cerclés de rouge (`DamageTone` `fire`, `damage.ts`) ; Poison vert acide partout (`text-lime-300` cerclé de `#1a2e05`, teinte `poison`, distinct de l'émeraude du soin ; nom et charges auparavant fuchsia) ; Poison, Saignement, Brûlure : une seule couleur pour le nom, les charges et les « −N » (`DAMAGE_SOURCES.status` + `statusTone`, `narration.ts`) ; test `staging.test.ts` « …teinte de leur source… » ; captures `logs/captures/floats-brulure.png`, `floats-nuage.png` |
| R44 | « c'est quoi le concept de brûlure "qui repart"… son statut n'est pas clair » | correction claire | Textes | livré | Brûlure + Attiser : « repart pour autant de tours que sa nouvelle valeur » |
| R45 | Combat Thaldrin contre Elaria « interminable étrangement » | question | PropPersos | répondu | 19 tours, 14 esquives ; Éclair aveuglant bloque la Visée |
| R46 | Thaldrin « pot-pourri… un druide qui fait du feu ?… magie louche… côté ours mal exploité, compétences corps à corps » | vision à proposer | PropPersos | proposé | Thaldrin Magie + Fureur, Élan au lieu du Brasier : départ +4,0, gravures Fureur +4,7 à +5,5 |
| R47 | Fanchon, aura de Magie « nulle… aussi nulle que sur le druide » | vision à proposer | PropPersos | proposé | Ballade, refrain 4×2 +4 PV, sans +1 PV : 50,5 → 52,4 % |
| R48 | Fanchon « massacrée par Aldric à nouveau » | vision à proposer | PropPersos | répondu | nue, Fanchon fait 54 % contre Aldric ; la Riposte punit les multi-coups |
| R49 | Fanchon « toutes ses compétences font des coups ou dés en plus… axe unique » | vision à proposer | PropPersos | répondu | axes coups +22,9 et magie +22,6 : c'est le kit qui ne parle que de coups |
| R50 | Duo + Éclair + Paratonnerre : « des sorts que je trouvais chiants deviennent intéressants », « fait plaisir de voir un peu de magie combotter » | retour positif | PropContenu | répondu | à préserver, aucune mécanique touchée ; Focale (§ 5 n° 8) donnerait au combo de Fanchon +11,7 (Paratonnerre +3,2) ; `docs/etudes/CONTENU_RETOUR_30.md`, labo `scripts/lab/contenu-30.ts` (séries 140-149) |
| R51 | Duo « son icône et nom évoquent encore Fanchon… rebrander » ; catégories dont le branding ne colle pas | vision à proposer | PropContenu | proposé | § 4 : Duo → Écho (ou Doublé en Chance), Soliste → Coup de maître, Crescendo → Acharnement, Siffloter → Répit, Fausse note → Main tremblante ; ids gardés ; icônes vérifiées |
| R52 | Braise captive « ça ne donne pas envie… un CD et/ou appliquer ou profiter de brûlure… utile sur la longueur » | vision à proposer | PropContenu | proposé | § 1.2.1 : Braise 2×2 tous les 4 tours dès le 4e, +1 par impact par Brûlure : +13,8 court / +14,8 long (aujourd'hui +15,0 court → +10,6 long) |
| R53 | « les reliques sont souvent les mêmes » | question | PropContenu | répondu + proposé | § 1.1 : 13/15 reliques distinctes par partie, 25/37 offertes à tous, 2 persos différents en partagent 4,8 sur 13 ; leviers : pas de retour immédiat, reliques de build |
| R54 | « un peu plus de reliques… combler certains manques de mécanique ou de build » ; manque de contenu selon la maîtrise | contenu | PropContenu | proposé | § 2 trous par maîtrise ; § 5 : 7 reliques + 4 compétences mesurées, dont pour Ysolde (R27) Cierge +16,9, Grâce +17,8 |
| R55 | « les reliques les plus puissantes, les plus synergisantes proposées plus tard dans la run » | vision à proposer | PropContenu | proposé | § 1.3 : aucun ordre aujourd'hui (1re offre en moyenne 2,8) ; 3 paliers lus sur `relics.length`, en poids (parité R1 automatique, tournoi et campagne) |
| R56 | « les reliques à usage très restreint pourraient proc sur un CD » | vision à proposer | PropContenu | proposé | § 1.2 : charges −25 à −30 % en combat long ; Géode +3 recharge 4, Onguent +3 recharge 4, Conque recharge 3 ; 7 gardées à usage unique, avec raison |
| R57 | « reliques ou sorts qui agissent sur le dé : faire perdre ou verrouiller une face ; ou sur le dé du porteur » | vision à proposer | PropDes | proposé | § 6 : Sceau long +6,9, Dé de joueur +5,0 ; « perdre une face » écarté ; question Q5 (entrée au catalogue) |
| R58 | « une relique qui active l'aura d'entrée de jeu » | vision à proposer | PropDes | proposé | § 6 : Clairon du héraut +9,7 ; question Q5 |
| R59 | « une mécanique d'enrage ? s'active quand on prend un crit ? compétence ? relique ? » | vision à proposer | PropDes | proposé | § 6 : Rage au critique reçu +8,7, Rage montante +11,3 (en aura de Fureur) ; Rage du désespoir écartée ; question Q5 |
| R60 | « plus de contenu (action, relique, animation) lié à la magie… la maîtrise Magie est peut-être bridante » | contenu | PropContenu | proposé | § 3 : options A à D ; recommandé A (renommer en Arcanes + emblème) + B (mot-clé « sort ») ; 3 sorts + 3 reliques mesurés |
| R61 | « l'icône de la maîtrise Magie est à refaire… fait penser à de la foudre » | icône | Icones | reporté | consigne de Main : identité de la maîtrise Magie en discussion (R60, R62), icône pas refaite |
| R62 | « classer les sorts selon 8 maîtrises fixes est-il un problème pour la flexibilité ? » | question | PropContenu | répondu | § 3.2 : les 8 maîtrises sont des réserves d'offre, à garder ; la rigidité vient de l'étiquette de thème → mot-clé transversal (R60) |
| R63 | Armure temporaire : « un bouclier en pointe en bas » plutôt que circulaire | icône | Icones | livré | `src/assets/icons/state-shield.png` (état `shield`, écu à pointe), planche v33 ; `local://r30-Icones.md` |
| R64 | Esquive : « une botte, un pied agile » | icône | Icones | livré | `state-sure-dodge.png` (`sureDodge`, botte ailée) |
| R65 | Sifflotement : « utiliser l'icône décrite dans vol de vie ? problème de double présence ? » | icône | Icones | répondu | garde l'emblème Soin (cœur + chevron) : double présence réelle avec Vol de vie (Siffloter, Vol de vie, Sangsue, Dîme gravables ; Dent de loup donne le Vol de vie) → deux médaillons identiques à compteurs différents (règle 6 des emblèmes) |
| R66 | Aveuglé, peur, perte de contrôle, charges de l'aura d'Ysolde : « étoiles et traits, comme en BD » au lieu des menottes | icône | Icones | livré | `state-lost-turn.png` (`lostTurn`, tête sonnée aux étoiles : Peur, Étourdi, Faute) ; `state-blinded.png` (`blinded`, même tête à spirale) |
| R67 | Garde brisée : même forme que le nouveau bouclier, « brisé, fendu », pas barré | icône | Icones | livré | `state-guard-broken.png` (`guardBroken`, même écu fendu) |
| R68 | Sceau de vol : « une main s'approchant de quelque chose qu'elle convoite, avec début du poignet » | icône | Icones | livré | `state-bonus-stolen.png` (`bonusStolen`, main qui s'avance vers une gemme) ; docs EMBLEMES § 3, 4, 7, 8 et STYLE_BIBLE § 7 |
| R69 | « assure-toi que tout a son icône générée… génère selon la grammaire adaptée avec Artlist » | icône | Icones | répondu | script d'audit : 71 compétences, 71 statuts en jeu, 37 reliques, 8 maîtrises → aucun manque, hors 2 états de réserve sans porteur |
| R70 | Textes flottants qui se chevauchent : « une zone… les textes en nuage… à voir s'il y en a trop » | UX combat | Lisibilite | livré | nuage : textes sur une ligne + couloirs latéraux (`laneOf`/`emitFloats`, `LANE_SHIFT` de Fighter), plus de « +0 PV », doublons du même instant fusionnés ; recouvrements 1 611 → 320 sur 777 combats construits ; test « le nuage… » ; captures `floats-avant.png` / `floats-nuage.png` ; `local://r30-Lisibilite.md` |
| R71 | Compendium : « la représentation des statuts est bien » ; reliques bien représentées | retour positif | Interface | répondu | statuts et reliques du compendium inchangés, préservés |
| R72 | Reliques : « trop d'entre elles ont une description difficilement compréhensible » | compendium | Textes | livré | `relics.ts` `describeRelic` : PV perdus, bonus expliqués entre parenthèses, recharge en clair |
| R73 | « les auras doivent comporter la mention "aura" dans leur nom, partout » (Bastion devient Aura de Bastion) | compendium | Textes | livré | 20 auras renommées « Aura … » : `skills.ts`, `statuses.ts`, `rules.ts`, textes du roster |
| R74 | Auras : icône dans un conteneur circulaire (hexagone réservé aux compétences) | compendium | Interface | livré | `SkillFrame` (`SkillSeal.tsx`) + `.aura-seal` (`index.css`), partout : compendium, choix d'aura, dé forgé, infobulles, barre du combat ; captures `local://r30-interface-*.png` |
| R75 | « toutes les compétences de base doivent avoir un tour comme Confiscation » (fin de martial, arcane, neutre) | compendium | Interface | livré | tour violet de Confiscation pour toutes, `data-nature` retiré de l'écran |
| R76 | Auras : contour doré, essayer un second contour | compendium | Interface | livré | `.aura-seal` : contour doré + second filet d'or |
| R77 | Liste de gauche : une première section Auras avant les compétences | compendium | Interface | livré | `SkillsSection` : « Auras · 20 » puis « Compétences · 51 » ; `compendiumSkills` trie les auras d'abord ; `screens.test.tsx` « compendium (retour du 2026-10-30) » |
| R78 | Renommer l'onglet « Compétences et auras » | compendium | Interface | livré | `sections.tsx` |
| R79 | « un agent qui repasse sur les descriptions pour que la mécanique soit intelligible » | compendium | Textes | livré | passe générale, `local://r30-Textes.md` ; vitest 532/532, tsc OK |
| R80 | Nouvelle campagne après une défaite : « le sélecteur doit être sur le perso qui a perdu » | interface | Interface | livré | `CampaignScreen` : « Nouvelle campagne » ouvre le choix sur le champion de la partie finie ; abandon et défaite posent tous deux `outcome: 'lost'` puis `RunEnd` → même `onNewRun` ; vu au navigateur par abandon seulement (une défaite jouée aurait écrit dans `logs/combats/`) ; `local://r30-Interface.md` |
| R81 | « D'autres personnages sont encore trop mous » ; « compléter les persos, builds, orientations un peu creuses » | vision à proposer | PropPersos | répondu | derniers construits : Morgrut, Thaldrin, Gorak ; propositions R36, R39, R46 ; `docs/etudes/PERSOS_RETOUR_30.md`, `logs/lab/2026-10-30-10-5x` |
